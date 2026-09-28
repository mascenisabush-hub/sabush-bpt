// Regression: recordStockCount put every write into ONE Firestore batch (max 500 ops). A first contagem
// of ~245 products (new Product + draft-item delete each) overflowed it and could never be confirmed.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFinalizationBatch, FIRESTORE_BATCH_LIMIT } from '../apps/tenant/src/lib/finalizationBatch.ts';

type Committed = { ops: string[]; failed?: boolean };

const harness = (failOnCommitNumber?: number) => {
  const commits: Committed[] = [];
  const makeBatch = () => {
    const ops: string[] = [];
    return {
      set: (ref: string) => void ops.push(`set:${ref}`),
      update: (ref: string) => void ops.push(`update:${ref}`),
      delete: (ref: string) => void ops.push(`delete:${ref}`),
      commit: async () => {
        if (failOnCommitNumber !== undefined && commits.length + 1 === failOnCommitNumber) {
          commits.push({ ops, failed: true });
          throw new Error('boom');
        }
        commits.push({ ops });
      },
    };
  };
  return { commits, makeBatch };
};

const fill = (b: ReturnType<typeof createFinalizationBatch>, products: number, draftItems: number) => {
  for (let i = 0; i < products; i++) b.set(`product${i}`, {});
  b.beginTail();
  b.set('stockCount', {});
  b.set('snapshot', {});
  for (let i = 0; i < draftItems; i++) b.deleteCleanup(`item${i}`);
  b.deleteCleanup('meta');
};

describe('normal size: exactly one atomic batch (behavior unchanged)', () => {
  it('commits everything in a single batch', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 10, 10);
    const r = await b.commit();
    assert.equal(commits.length, 1);
    assert.equal(commits[0].ops.length, 10 + 2 + 10 + 1);
    assert.deepEqual(r, { batchesCommitted: 1, cleanupIncomplete: false });
  });

  it('exactly at the limit still uses one batch', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 100, FIRESTORE_BATCH_LIMIT - 100 - 3);
    assert.equal(b.operationCount, FIRESTORE_BATCH_LIMIT);
    await b.commit();
    assert.equal(commits.length, 1);
  });
});

describe('overflow (the old hard failure): 300 new products + 300 draft rows', () => {
  it('every op is committed, no batch exceeds the limit', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 300, 300);
    const r = await b.commit();
    const all = commits.flatMap((c) => c.ops);
    assert.equal(all.length, 300 + 2 + 300 + 1);
    assert.equal(new Set(all).size, all.length, 'no op duplicated or lost');
    assert.ok(commits.every((c) => c.ops.length <= FIRESTORE_BATCH_LIMIT));
    assert.equal(r.cleanupIncomplete, false);
  });

  it('count and snapshot are always in the SAME batch, after all product writes', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 300, 300);
    await b.commit();
    const countBatchIdx = commits.findIndex((c) => c.ops.includes('set:stockCount'));
    assert.ok(commits[countBatchIdx].ops.includes('set:snapshot'));
    for (let i = 0; i < 300; i++) {
      const at = commits.findIndex((c) => c.ops.includes(`set:product${i}`));
      assert.ok(at <= countBatchIdx, `product${i} must not be committed after the count`);
    }
  });

  it('the draft meta is deleted last', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 300, 300);
    await b.commit();
    const flat = commits.flatMap((c) => c.ops);
    assert.equal(flat[flat.length - 1], 'delete:meta');
  });

  it('a draft-cleanup failure AFTER the count is saved does not throw and is reported', async () => {
    // 100 products + 600 draft rows: commit #1 = products, #2 = count+snapshot+498 deletes, #3 = the rest
    const { commits, makeBatch } = harness(3);
    const b = createFinalizationBatch(makeBatch);
    fill(b, 100, 600);
    const r = await b.commit();
    assert.equal(r.cleanupIncomplete, true);
    assert.ok(commits.some((c) => c.ops.includes('set:stockCount') && !c.failed), 'the count was saved');
  });

  it('a failure while writing products throws and the count is NOT written', async () => {
    const { commits, makeBatch } = harness(1);
    const b = createFinalizationBatch(makeBatch);
    fill(b, 300, 300);
    await assert.rejects(() => b.commit());
    assert.ok(!commits.some((c) => c.ops.includes('set:stockCount')));
  });

  it('a failure of the atomic count batch throws (nothing reports success)', async () => {
    const { commits, makeBatch } = harness(2);
    const b = createFinalizationBatch(makeBatch);
    fill(b, 300, 300);
    await assert.rejects(() => b.commit());
    assert.ok(commits.filter((c) => !c.failed).every((c) => !c.ops.includes('set:stockCount')));
  });

  it('more than one head chunk when there are >500 new products', async () => {
    const { commits, makeBatch } = harness();
    const b = createFinalizationBatch(makeBatch);
    fill(b, 1200, 1200);
    await b.commit();
    assert.ok(commits.every((c) => c.ops.length <= FIRESTORE_BATCH_LIMIT));
    assert.equal(commits.flatMap((c) => c.ops).length, 1200 + 2 + 1200 + 1);
  });
});

describe('recordStockCount is wired to the chunked batch', () => {
  const src = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
  const fn = src.slice(src.indexOf('const recordStockCount = async'), src.indexOf('const voidInitialStockConfirmation'));
  it('uses createFinalizationBatch, marks the tail, and routes draft deletes through deleteCleanup', () => {
    assert.match(fn, /const fsBatch = createFinalizationBatch\(\(\) => createFirestoreBatch\(db\)\);/);
    assert.match(fn, /fsBatch\.beginTail\(\);\s*\n\s*fsBatch\.set\(doc\(db, 'businesses', businessId, 'stockCounts'/);
    assert.match(fn, /periodicDraftItemsSnap\.forEach\(\(itemDoc\) => fsBatch\.deleteCleanup\(itemDoc\.ref\)\)/);
    assert.match(fn, /periodicTombstonesSnap\.forEach\(\(tombstoneDoc\) => fsBatch\.deleteCleanup\(tombstoneDoc\.ref\)\)/);
    assert.match(fn, /fsBatch\.deleteCleanup\(doc\(db, 'businesses', businessId, 'stockCountDrafts', 'periodic'\)\)/);
  });
});
