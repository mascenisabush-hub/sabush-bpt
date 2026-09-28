import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  buildPendingRowsByKey,
  collectPendingRowKeys,
  findDuplicateProductNames,
  findManualRowIndexByKey,
  isDuplicatePortion,
  manualRowKey,
  planManualRowsFromDraft,
  portionSignature,
  selectLegacyKeysToMigrate,
} from '../apps/tenant/src/utils/periodicRowIdentity';

const view = readFileSync('apps/tenant/src/components/PeriodicStockCountView.tsx', 'utf8');
const ctx = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
const between = (src: string, from: string, to: string): string => {
  const i = src.indexOf(from);
  assert.notEqual(i, -1, `anchor not found: ${from}`);
  const j = src.indexOf(to, i + from.length);
  assert.notEqual(j, -1, `end anchor not found: ${to}`);
  return src.slice(i, j);
};

const portion = (name: string, quantity: string, unit: string, sellingPrice: string, extra: Record<string, unknown> = {}) => ({
  productName: name, quantity, unit, sellingPrice, ...extra,
});
const total = (rows: { quantity: string; sellingPrice: string }[]) =>
  rows.reduce((s, r) => s + parseFloat(r.quantity) * parseFloat(r.sellingPrice), 0);

describe('exact row-key resolution (was: parseInt of the text after "manual:")', () => {
  it('resolves every UUID-keyed row to itself, for every possible UUID', () => {
    const rows = Array.from({ length: 6 }, () => ({ sourceRowKey: `manual:${randomUUID()}` }));
    for (let n = 0; n < 3000; n++) {
      const i = n % rows.length;
      assert.equal(findManualRowIndexByKey(rows, rows[i].sourceRowKey), i);
    }
  });
  it('never resolves a UUID key to a DIFFERENT row (the old lookup did this for keys starting with a digit)', () => {
    const rows = [{ sourceRowKey: 'manual:1f00aaaa-0000-4000-8000-000000000001' }, { sourceRowKey: 'manual:2e00bbbb-0000-4000-8000-000000000002' }];
    assert.equal(findManualRowIndexByKey(rows, 'manual:1f00aaaa-0000-4000-8000-000000000001'), 0);
    assert.equal(findManualRowIndexByKey(rows, 'manual:1zzz'), -1);
  });
  it('a positional key still resolves for a row that has no stable key', () => {
    const rows = [{}, { sourceRowKey: 'manual:abc' }, {}];
    assert.equal(findManualRowIndexByKey(rows, 'manual:0'), 0);
    assert.equal(findManualRowIndexByKey(rows, 'manual:2'), 2);
    assert.equal(manualRowKey(rows[1], 1), 'manual:abc');
  });
});

describe('automatic flushes write ONLY rows the owner has an edit pending on', () => {
  const stable = (n: string) => ({ sourceRowKey: `manual:${n}`, productName: n, quantity: '1', unit: 'un', sellingPrice: '1' });
  const manualRows = [stable('a1'), stable('b2'), stable('c3')];
  const catalogRows = { p1: { productName: 'P1', quantity: '3', unit: 'kg', sellingPrice: '5' }, p2: { productName: 'P2', quantity: '', unit: '', sellingPrice: '' } };
  it('pending-key collection ignores meta keys and non-row keys', () => {
    const keys = collectPendingRowKeys({ timerKeys: ['__meta__', 'manual:b2'], retryKeys: ['caixerDraft', 'catalog:p1'], dirtySaveTargets: ['manual:b2', undefined, 'newProductInfo:x'] });
    assert.deepEqual([...keys].sort(), ['catalog:p1', 'manual:b2']);
  });
  it('builds exactly the pending rows, under their real keys, and nothing else', () => {
    const out = buildPendingRowsByKey(new Set(['manual:b2', 'catalog:p1']), catalogRows, manualRows as never, (r) => ({ n: r.productName }));
    assert.deepEqual(Object.keys(out).sort(), ['catalog:p1', 'manual:b2']);
  });
  it('an untouched row (and an untouched catalog row) is never included', () => {
    const out = buildPendingRowsByKey(new Set(), catalogRows, manualRows as never, (r) => r);
    assert.deepEqual(out, {});
  });
  it('never produces a positional key for a row that has a stable key', () => {
    const out = buildPendingRowsByKey(new Set(['manual:a1', 'manual:b2', 'manual:c3']), {}, manualRows as never, (r) => r);
    assert.ok(Object.keys(out).every((k) => !/^manual:\d+$/.test(k)));
  });
  it('a pending key whose row no longer exists writes nothing', () => {
    assert.deepEqual(buildPendingRowsByKey(new Set(['manual:gone']), {}, manualRows as never, (r) => r), {});
  });
});

describe('duplicates: same product + quantity + Unit + Selling Price', () => {
  it('identical portions are duplicates (name is case/space-insensitive)', () => {
    assert.equal(isDuplicatePortion(portion('Patas', '2', 'kg', '160'), [portion(' patas ', '2', 'KG', '160')]), true);
  });
  it('a different quantity, Unit or price is NOT a duplicate', () => {
    const other = [portion('Patas', '2', 'kg', '160')];
    assert.equal(isDuplicatePortion(portion('Patas', '3', 'kg', '160'), other), false);
    assert.equal(isDuplicatePortion(portion('Patas', '2', 'cx', '160'), other), false);
    assert.equal(isDuplicatePortion(portion('Patas', '2', 'kg', '161'), other), false);
    assert.equal(isDuplicatePortion(portion('Frango', '2', 'kg', '160'), other), false);
  });
  it('incomplete or zero-quantity portions are never "duplicates"', () => {
    assert.equal(portionSignature(portion('Patas', '', 'kg', '160')), null);
    assert.equal(portionSignature(portion('Patas', '0', 'kg', '160')), null);
    assert.equal(portionSignature(portion('Patas', '2', '', '160')), null);
  });
  it('the Review gate names the product', () => {
    const names = findDuplicateProductNames([portion('Patas', '2', 'kg', '160'), portion('Patas', '2', 'kg', '160'), portion('Patas', '2', 'cx', '2560')]);
    assert.deepEqual(names, ['Patas']);
    assert.deepEqual(findDuplicateProductNames([portion('Patas', '2', 'kg', '160'), portion('Patas', '2', 'cx', '2560')]), []);
  });
});

describe('resume: the owner\'s exact scenario (2 cx + 2 kg, with stale position-named copies)', () => {
  const cx = portion('Patas', '2', 'cx', '2560', { orderIndex: 0 });
  const kg = portion('Patas', '2', 'kg', '160', { orderIndex: 1 });
  const staleKgCopyOfRow0 = portion('Patas', '2', 'kg', '160');   // written before row 0 was edited kg -> cx
  const kgCopyOfRow1 = portion('Patas', '2', 'kg', '160');
  it('the total is 5,440, not 5,760', () => {
    const { keep, suppressedDuplicateKeys } = planManualRowsFromDraft([
      { rowKey: 'manual:0', item: staleKgCopyOfRow0 },
      { rowKey: 'manual:1', item: kgCopyOfRow1 },
      { rowKey: 'manual:8f31c2aa-1111-4111-8111-000000000001', item: cx },
      { rowKey: 'manual:a7c0d5bb-2222-4222-8222-000000000002', item: kg },
    ]);
    assert.equal(total(keep.map((e) => e.item)), 5440);
    assert.equal(keep.length, 2);
    assert.deepEqual([...suppressedDuplicateKeys].sort(), ['manual:0', 'manual:1']);
  });
  it('letter-leading UUID keys are no longer silently dropped', () => {
    const keys = ['manual:a1b2c3d4-0000-4000-8000-000000000001', 'manual:f9e8d7c6-0000-4000-8000-000000000002', 'manual:0c0c0c0c-0000-4000-8000-000000000003'];
    const { keep } = planManualRowsFromDraft(keys.map((rowKey, i) => ({ rowKey, item: portion(`P${i}`, '1', 'un', String(i + 1), { orderIndex: i }) })));
    assert.deepEqual(keep.map((e) => e.rowKey), keys);
  });
  it('rows that are genuinely different are all kept, in their real order', () => {
    const entries = [
      { rowKey: 'manual:z', item: portion('B', '1', 'un', '5', { orderIndex: 2 }) },
      { rowKey: 'manual:y', item: portion('A', '1', 'un', '5', { orderIndex: 0 }) },
      { rowKey: 'manual:x', item: portion('C', '2', 'un', '5', { orderIndex: 1 }) },
    ];
    assert.deepEqual(planManualRowsFromDraft(entries).keep.map((e) => e.rowKey), ['manual:y', 'manual:x', 'manual:z']);
  });
  it('nothing is deleted or modified: the input is untouched', () => {
    const entries = [{ rowKey: 'manual:0', item: staleKgCopyOfRow0 }, { rowKey: 'manual:k', item: kg }];
    const snapshot = JSON.stringify(entries);
    planManualRowsFromDraft(entries);
    assert.equal(JSON.stringify(entries), snapshot);
  });
});

describe('migration never moves or deletes a COPY', () => {
  it('a legacy document identical to a stable row is skipped; a unique legacy row still migrates', () => {
    const { migrate, skippedDuplicates } = selectLegacyKeysToMigrate([
      { id: 'manual:0', data: portion('Patas', '2', 'kg', '160') },
      { id: 'manual:1', data: portion('Frango', '5', 'kg', '90') },
      { id: 'manual:2', data: portion('Frango', '5', 'kg', '90') },
      { id: 'manual:ab12-cd', data: portion('Patas', '2', 'kg', '160') },
    ]);
    assert.deepEqual(migrate, ['manual:1']);
    assert.deepEqual(skippedDuplicates.sort(), ['manual:0', 'manual:2']);
  });
});

describe('wiring: the component and context use these rules', () => {
  it('no positional parse of the key remains in the save / retry / flush paths', () => {
    assert.equal(view.includes("parseInt(rowKey.slice('manual:'.length), 10)"), false);
  });
  it('the save path resolves the row by its exact key', () => {
    const save = between(view, 'const performRowSaveAttempt = async', 'const savePromise = rawSavePromise');
    assert.ok(save.includes('findManualRowIndexByKey(mr, rowKey)'));
  });
  it('Review-entry and business-switch flushes persist only pending rows, never every row by position', () => {
    assert.equal(view.includes('rowsByKey[`manual:${index}`]'), false);
    assert.equal((view.match(/buildPendingRowsByKey\(/g) ?? []).length, 2);
    const review = between(view, 'const handleRequestConfirmation = async', 'setPendingTally(tally)');
    assert.ok(review.indexOf('collectPendingRowKeysNow()') < review.indexOf('rowDebounceTimersRef.current.forEach'), 'pending keys must be captured before the timers are cleared');
  });
  it('the flush reads each row inside the transaction before any write and never overwrites a conflict', () => {
    const flush = between(ctx, 'const flushPeriodicStockDraftRows = async (', 'const clearPeriodicStockDraft = async');
    assert.ok(flush.indexOf('tx.get(') < flush.indexOf('tx.set(metaRef'));
    assert.ok(flush.includes("serverItem?.state === 'CONFLICT'"));
    // a row another writer changed since this device last saw it is left untouched (Decision 55), not overwritten
    assert.ok(flush.includes('(serverItem?.rev ?? 0) !== locallyKnownRev'));
  });
  it('resume reads every manual document through planManualRowsFromDraft', () => {
    const resume = between(view, 'const handleResumeDraft = async', 'setCatalogRows(nextCatalogRows)');
    assert.ok(resume.includes('planManualRowsFromDraft('));
    assert.equal(resume.includes('Number.isFinite(index)'), false);
  });
  it('migration skips duplicate copies', () => {
    const fn = between(ctx, 'const migrateAllLegacyPeriodicRows', 'const savePeriodicStockDraftItem');
    assert.ok(fn.includes('selectLegacyKeysToMigrate('));
  });
  it('Review: an ERROR in the identity check is retried, not reported as "0 linha(s)"', () => {
    const review = between(view, 'const handleRequestConfirmation = async', 'setPendingTally(tally)');
    assert.ok(review.includes('await migrateAllLegacyPeriodicRows()'));
    assert.ok(review.includes('Não foi possível verificar as linhas desta Contagem'));
  });
  it('Validar refuses an identical portion (catalog and manual), and Review refuses any that exist', () => {
    assert.ok(between(view, 'const handleSaveCatalogRow', 'parseFloat(row.quantity) === 0').includes('duplicatePortionMessageFor('));
    assert.ok(between(view, 'const handleSaveManualRow', 'parseFloat(row.quantity) === 0').includes('duplicatePortionMessageFor('));
    assert.ok(between(view, 'const handleRequestConfirmation = async', 'setPendingTally(tally)').includes('findDuplicateProductNames('));
  });
});
