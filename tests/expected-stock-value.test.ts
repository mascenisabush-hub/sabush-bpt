// Expected Current Stock Value — [Amendment v1.0]
// 10-expected-stock-value-amendment.md, Part 2.
//
// SCOPE: expectedCurrentStockValue itself (initialCapitalValue +
// totalInvestmentValueAllTime) is a two-line composition living in
// AppContext.tsx, not a separately exported pure function — it isn't
// unit-testable in isolation without a Firebase/React harness. What
// this suite verifies instead, directly against the real
// calculateInventoryTotals export (no reimplementation, no duplicate
// math), are the two claims the amendment's Part 2 rests on:
//
//   1. totalInvestmentValue already nets out Quebra via each batch's
//      remainingQuantity — so "− recognized Quebra" in the business
//      rule requires no separate subtraction at the call site.
//   2. StockBatch inventory is included in that figure unconditionally,
//      regardless of a batch's creation timestamp relative to any
//      Initial Stock confirmation — because calculateInventoryTotals
//      has no awareness of stockCounts/Initial Stock at all, which is
//      exactly the "separate, non-overlapping pools by construction"
//      finding the amendment documents.
//
// HOW TO RUN:
//   npx tsx --test tests/expected-stock-value.test.ts
// Pure function, no Firestore/emulator dependency.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateInventoryTotals } from '../apps/tenant/src/utils/calculations';
import { StockBatch, Quebra } from '../apps/tenant/src/types';

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'product-1',
    dateEntered: '2026-01-01',
    quantity: 100,
    costPrice: 10,
    sellingPrice: 15,
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeQuebra(overrides: Partial<Quebra> = {}): Quebra {
  return {
    id: 'quebra-1',
    batchId: 'batch-1',
    productId: 'product-1',
    quantityLost: 10,
    reason: 'damaged',
    date: '2026-01-05',
    createdAt: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

// The exact composition AppContext.tsx uses for expectedCurrentStockValue —
// duplicated here only as the assertion target, never as the thing under
// test (the thing under test is calculateInventoryTotals's own output).
function expectedCurrentStockValue(initialCapitalValue: number, batches: StockBatch[], quebras: Quebra[]): number {
  return initialCapitalValue + calculateInventoryTotals(batches, quebras).totalInvestmentValue;
}

describe('Expected Current Stock Value composition [Amendment v1.0]', () => {
  it('is exactly Initial Capital when no StockBatch inventory exists', () => {
    assert.equal(expectedCurrentStockValue(5000, [], []), 5000);
  });

  it('is exactly StockBatch investment value when Initial Stock has never been confirmed (initialCapitalValue = 0)', () => {
    const batches = [makeBatch({ quantity: 50, costPrice: 20 })]; // 50 * 20 = 1000
    assert.equal(expectedCurrentStockValue(0, batches, []), 1000);
  });

  it('sums Confirmed Initial Capital and StockBatch investment value unconditionally — the "separate pools" rule', () => {
    const batches = [makeBatch({ quantity: 50, costPrice: 20 })]; // 1000 at cost
    assert.equal(expectedCurrentStockValue(5000, batches, []), 6000);
  });

  it('a batch created before Initial Stock confirmation is still fully included — no timestamp filter exists to exclude it', () => {
    const preExistingBatch = makeBatch({
      id: 'batch-before-confirmation',
      dateEntered: '2025-01-01', // long before any Initial Stock confirmation date
      quantity: 30,
      costPrice: 15, // 450 at cost
    });
    // calculateInventoryTotals never receives, and never needs, any
    // Initial Stock confirmation timestamp — this is the data-model
    // proof the amendment's ambiguity resolution rests on.
    assert.equal(expectedCurrentStockValue(2000, [preExistingBatch], []), 2450);
  });

  it('already reflects Quebra via remainingQuantity — no separate subtraction is needed at the call site', () => {
    const batch = makeBatch({ id: 'batch-2', quantity: 100, costPrice: 10 }); // 1000 at full quantity
    const quebra = makeQuebra({ batchId: 'batch-2', quantityLost: 20 }); // 20 units lost
    const totals = calculateInventoryTotals([batch], [quebra]);
    // remainingQuantity = 100 - 20 = 80; investment value = 80 * 10 = 800
    assert.equal(totals.totalInvestmentValue, 800);
    assert.equal(expectedCurrentStockValue(1000, [batch], [quebra]), 1800);
  });

  it('never produces NaN or a negative baseline in the degenerate zero-everything case', () => {
    const value = expectedCurrentStockValue(0, [], []);
    assert.equal(value, 0);
    assert.equal(Number.isNaN(value), false);
  });
});
