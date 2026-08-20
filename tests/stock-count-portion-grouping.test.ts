// Increment B, Checkpoint B5 — tests for computePortionLabels
// (apps/tenant/src/lib/stockCountPortionGrouping.ts), the presentation-
// layer grouping requirement Rule 8 Finding 4 identifies for §16
// (Initial Stock mixed-unit/mixed-price-basis valuation).
//
// SCOPE: proves the pure grouping/labeling function against plain
// in-memory row values only — no Firestore, no React harness. Does NOT
// re-test normalizeStockCountItems's own summation behavior (already
// covered by tests/initial-stock-confirmation.test.ts) — this file
// tests only the NEW presentation-layer labeling logic.
//
// HOW TO RUN:
//   npx tsx --test tests/stock-count-portion-grouping.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computePortionLabels, type PortionGroupableRow } from '../apps/tenant/src/lib/stockCountPortionGrouping';

const row = (id: string, productName: string): PortionGroupableRow => ({ id, productName });

describe('computePortionLabels — single-row / no-grouping cases', () => {
  it('a single row for a product gets portionCount 1, isMultiPortion false', () => {
    const labels = computePortionLabels([row('r1', 'Arroz')]);
    assert.deepEqual(labels.get('r1'), { isMultiPortion: false, portionIndex: 1, portionCount: 1 });
  });

  it('multiple rows for DIFFERENT products are never grouped with each other', () => {
    const labels = computePortionLabels([row('r1', 'Arroz'), row('r2', 'Feijão'), row('r3', 'Açúcar')]);
    for (const id of ['r1', 'r2', 'r3']) {
      assert.equal(labels.get(id)!.isMultiPortion, false);
      assert.equal(labels.get(id)!.portionCount, 1);
    }
  });

  it('blank-name rows are never grouped with each other', () => {
    const labels = computePortionLabels([row('r1', ''), row('r2', '   '), row('r3', 'Arroz')]);
    assert.deepEqual(labels.get('r1'), { isMultiPortion: false, portionIndex: 1, portionCount: 1 });
    assert.deepEqual(labels.get('r2'), { isMultiPortion: false, portionIndex: 1, portionCount: 1 });
    assert.equal(labels.get('r3')!.isMultiPortion, false);
  });
});

describe('computePortionLabels — the canonical Pretinha worked example', () => {
  it('two rows for the same product (different unit/price basis) are grouped as portions 1 and 2 of 2', () => {
    const rows = [
      row('r1', 'Pretinha'), // 6 Cx @ 820 MZN/Cx
      row('r2', 'Pretinha'), // 4 Cx valued at 50 MZN/Un instead
    ];
    const labels = computePortionLabels(rows);
    assert.deepEqual(labels.get('r1'), { isMultiPortion: true, portionIndex: 1, portionCount: 2 });
    assert.deepEqual(labels.get('r2'), { isMultiPortion: true, portionIndex: 2, portionCount: 2 });
  });

  it('is case-insensitive and trims whitespace when matching product names', () => {
    const rows = [row('r1', '  Pretinha  '), row('r2', 'PRETINHA'), row('r3', 'pretinha')];
    const labels = computePortionLabels(rows);
    for (const id of ['r1', 'r2', 'r3']) {
      assert.equal(labels.get(id)!.isMultiPortion, true);
      assert.equal(labels.get(id)!.portionCount, 3);
    }
    assert.equal(labels.get('r1')!.portionIndex, 1);
    assert.equal(labels.get('r2')!.portionIndex, 2);
    assert.equal(labels.get('r3')!.portionIndex, 3);
  });

  it('portion indices follow the rows\' original relative order, even when a different product is interleaved between them', () => {
    const rows = [
      row('r1', 'Pretinha'),
      row('r2', 'Savanna'),
      row('r3', 'Pretinha'),
      row('r4', 'Savanna'),
      row('r5', 'Pretinha'),
    ];
    const labels = computePortionLabels(rows);
    assert.equal(labels.get('r1')!.portionIndex, 1);
    assert.equal(labels.get('r3')!.portionIndex, 2);
    assert.equal(labels.get('r5')!.portionIndex, 3);
    assert.equal(labels.get('r1')!.portionCount, 3);
    assert.equal(labels.get('r2')!.portionIndex, 1);
    assert.equal(labels.get('r4')!.portionIndex, 2);
    assert.equal(labels.get('r2')!.portionCount, 2);
  });

  it('handles three or more portions of the same product correctly', () => {
    const rows = [row('r1', 'Pretinha'), row('r2', 'Pretinha'), row('r3', 'Pretinha')];
    const labels = computePortionLabels(rows);
    assert.equal(labels.get('r1')!.portionCount, 3);
    assert.equal(labels.get('r2')!.portionCount, 3);
    assert.equal(labels.get('r3')!.portionCount, 3);
  });
});

describe('computePortionLabels — does not mutate or reorder input', () => {
  it('returns a Map covering every row id, without altering the input array', () => {
    const rows = [row('r1', 'Pretinha'), row('r2', 'Pretinha')];
    const snapshot = JSON.stringify(rows);
    const labels = computePortionLabels(rows);
    assert.equal(JSON.stringify(rows), snapshot);
    assert.equal(labels.size, 2);
  });

  it('handles an empty rows array', () => {
    const labels = computePortionLabels([]);
    assert.equal(labels.size, 0);
  });
});
