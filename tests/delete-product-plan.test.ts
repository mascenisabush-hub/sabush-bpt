// [Fix #7 — Destructive Operations Safety] deleteProduct atomicity.
//
// SCOPE: deleteProduct() itself (AppContext.tsx) is tightly coupled to the
// live Firebase client SDK (writeBatch/doc against a real `db` singleton),
// same constraint documented in tests/initial-stock-confirmation.test.ts —
// this repo has no jsdom/testing-library harness to exercise it end-to-end.
//
// What IS directly testable, and what this suite actually proves:
// planDeleteProduct() (src/utils/deleteProductPlan.ts) is the ONLY thing
// that decides which deletes land in which Firestore commit and in what
// order — deleteProduct() just executes the chunks it returns, in order.
// The tests below prove the all-or-nothing / no-misleading-partial-state
// contract directly against the pure planner, plus a source-level
// regression guard confirming deleteProduct() actually uses it (and
// hasn't quietly reverted to the old sequential deleteDoc cascade this
// fix replaced).
//
// HOW TO RUN:
//   npx tsx --test tests/delete-product-plan.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { planDeleteProduct, FIRESTORE_BATCH_OP_LIMIT } from '../src/utils/deleteProductPlan';

describe('planDeleteProduct — small/typical product (fits in one Firestore writeBatch)', () => {
  it('puts the product + all batches + all quebras into a single chunk', () => {
    const chunks = planDeleteProduct('prod-1', ['b1', 'b2', 'b3'], ['q1', 'q2']);
    assert.equal(chunks.length, 1, 'A product with 6 total ops (well under 500) must commit as one atomic writeBatch.');
    const ops = chunks[0];
    assert.equal(ops.length, 6);
    assert.ok(ops.some((op) => op.kind === 'product' && op.id === 'prod-1'));
    assert.deepEqual(
      ops.filter((op) => op.kind === 'batch').map((op) => op.id).sort(),
      ['b1', 'b2', 'b3']
    );
    assert.deepEqual(
      ops.filter((op) => op.kind === 'quebra').map((op) => op.id).sort(),
      ['q1', 'q2']
    );
  });

  it('handles a product with no batches/quebras yet as a single one-op chunk', () => {
    const chunks = planDeleteProduct('prod-empty', [], []);
    assert.deepEqual(chunks, [[{ kind: 'product', id: 'prod-empty' }]]);
  });

  it('does not touch purchaseBatches at all — only product/batch/quebra op kinds ever appear', () => {
    const chunks = planDeleteProduct('prod-1', ['b1'], ['q1']);
    const kinds = new Set(chunks.flat().map((op) => op.kind));
    assert.deepEqual([...kinds].sort(), ['batch', 'product', 'quebra']);
  });
});

describe('planDeleteProduct — exactly at the Firestore 500-op boundary', () => {
  it('499 history ops + 1 product op (=500 total) still fits in a single chunk', () => {
    const batchIds = Array.from({ length: 300 }, (_, i) => `b${i}`);
    const quebraIds = Array.from({ length: 199 }, (_, i) => `q${i}`);
    const chunks = planDeleteProduct('prod-1', batchIds, quebraIds);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 500);
  });

  it('500 history ops + 1 product op (=501 total) must split into more than one chunk', () => {
    const batchIds = Array.from({ length: 500 }, (_, i) => `b${i}`);
    const chunks = planDeleteProduct('prod-1', batchIds, []);
    assert.ok(chunks.length > 1, 'Exceeding the 500-op ceiling must never be silently packed into one oversized writeBatch.');
  });
});

describe('planDeleteProduct — large history (exceeds 500 total ops)', () => {
  it('splits batch/quebra deletes into <=500-op chunks and isolates the product delete into its own final chunk', () => {
    const batchIds = Array.from({ length: 700 }, (_, i) => `b${i}`);
    const quebraIds = Array.from({ length: 300 }, (_, i) => `q${i}`);
    const chunks = planDeleteProduct('prod-big', batchIds, quebraIds);

    // Every chunk stays within Firestore's own hard ceiling.
    for (const chunk of chunks) {
      assert.ok(chunk.length <= FIRESTORE_BATCH_OP_LIMIT, `Chunk of ${chunk.length} ops exceeds the Firestore writeBatch limit.`);
    }

    // The product op appears exactly once, and ONLY in the last chunk,
    // alone — this is the invariant that keeps a mid-cascade failure from
    // ever orphaning a batch/quebra under an already-deleted product.
    const productChunkIndices = chunks
      .map((chunk, i) => (chunk.some((op) => op.kind === 'product') ? i : -1))
      .filter((i) => i !== -1);
    assert.deepEqual(productChunkIndices, [chunks.length - 1], 'The product delete must be isolated to the last chunk only.');
    assert.deepEqual(chunks[chunks.length - 1], [{ kind: 'product', id: 'prod-big' }], 'The final chunk must contain the product delete and nothing else.');

    // Every batch/quebra id from the input is scheduled for deletion
    // exactly once, across the non-final chunks.
    const historyChunks = chunks.slice(0, -1);
    const scheduledBatchIds = historyChunks.flat().filter((op) => op.kind === 'batch').map((op) => op.id).sort();
    const scheduledQuebraIds = historyChunks.flat().filter((op) => op.kind === 'quebra').map((op) => op.id).sort();
    assert.deepEqual(scheduledBatchIds, [...batchIds].sort());
    assert.deepEqual(scheduledQuebraIds, [...quebraIds].sort());
  });

  it('never mixes the product op into a non-final chunk, even when the last history chunk has room to spare', () => {
    // 501 history ops -> chunk1: 500 history ops, chunk2: 1 history op.
    // The product op must NOT be appended into chunk2 just because it has
    // 499 free slots — it always gets its own final chunk.
    const batchIds = Array.from({ length: 501 }, (_, i) => `b${i}`);
    const chunks = planDeleteProduct('prod-1', batchIds, []);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 500);
    assert.equal(chunks[1].length, 1);
    assert.deepEqual(chunks[2], [{ kind: 'product', id: 'prod-1' }]);
  });

  it('respects a caller-supplied limit (for testing chunking behavior without allocating 500+ real ids)', () => {
    const chunks = planDeleteProduct('prod-1', ['b1', 'b2', 'b3'], ['q1'], 2);
    // 4 history ops + 1 product op = 5 total, over a limit of 2.
    assert.ok(chunks.length > 1);
    for (const chunk of chunks.slice(0, -1)) {
      assert.ok(chunk.length <= 2);
      assert.ok(chunk.every((op) => op.kind !== 'product'));
    }
    assert.deepEqual(chunks[chunks.length - 1], [{ kind: 'product', id: 'prod-1' }]);
  });
});

// Source-level regression guard: deleteProduct() in AppContext.tsx must
// actually use planDeleteProduct() and commit per-chunk via writeBatch,
// not the old sequential deleteDoc-per-document cascade this fix replaced
// (the exact pattern that let a partial failure orphan batches/quebras
// under a deleted product and silently inflate Business Worth — see the
// Fix #7 investigation report).
describe('deleteProduct() source guard', () => {
  const appContextSrc = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf-8');

  it('deleteProduct calls planDeleteProduct and commits via writeBatch, not a sequential deleteDoc loop', () => {
    const fnMarker = 'const deleteProduct = async (id: string) => {';
    const fnStart = appContextSrc.indexOf(fnMarker);
    assert.notEqual(fnStart, -1, 'Could not locate deleteProduct — has it been renamed/restructured?');

    // Grab the function body up to the next top-level `const <name> = async`
    // definition, which is a reasonable proxy for "end of this function" in
    // this file's consistent style.
    const nextFnIndex = appContextSrc.indexOf('\n  const ', fnStart + fnMarker.length);
    const fnBody = appContextSrc.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);

    assert.ok(fnBody.includes('planDeleteProduct('), 'deleteProduct must build its delete plan via planDeleteProduct().');
    assert.ok(fnBody.includes('createFirestoreBatch(db)'), 'deleteProduct must commit each chunk via a Firestore writeBatch, not individual deleteDoc calls.');
    assert.ok(fnBody.includes('.commit()'), 'deleteProduct must actually commit the writeBatch(es) it builds.');

    // The specific bug this fix closes: a bare "await deleteDoc(doc(db, ...,
    // 'products', id))" as the function's very first statement, before any
    // batch/quebra handling — that was the non-atomic, product-deleted-first
    // pattern.
    assert.ok(
      !/deleteDoc\(doc\(db, 'businesses', businessId, 'products', id\)\)/.test(fnBody),
      'deleteProduct must not directly deleteDoc the product document outside of a planned/batched commit.'
    );
  });
});
