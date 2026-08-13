// Multi-Supplier Purchase Event — Investment Ledger grouping —
// 04-multi-supplier-purchase-event-amendment.md, Part 10.
//
// SCOPE: groupSummariesByPurchaseEvent (src/utils/purchaseBatchCalculations.ts)
// is a pure function with no Firestore/AppContext dependency — fully
// testable directly, unlike StocksView.tsx itself (a React component
// this repo's established test conventions don't render-test). Per
// the Rule 8 Assessment's own Section 12 requirement: "a focused unit
// test for the new grouping useMemo's logic... covering: ungrouped
// fallback, two-batch group, three-supplier group matching the
// amendment's own worked example."
//
// Fixtures are built via the real, unmodified calculatePurchaseBatchSummary
// — not hand-rolled fake PurchaseBatchSummary objects — so these tests
// exercise the real aggregation pipeline (calculatePurchaseBatchSummary
// -> groupSummariesByPurchaseEvent) exactly as StocksView.tsx's own
// groupedView useMemo does, not a simplified stand-in for it.
//
// HOW TO RUN:
//   npx tsx --test tests/purchase-event-grouping.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculatePurchaseBatchSummary, groupSummariesByPurchaseEvent } from '../apps/tenant/src/utils/purchaseBatchCalculations';
import { PurchaseBatch, StockBatch } from '../apps/tenant/src/types';

function makePurchaseBatch(overrides: Partial<PurchaseBatch> = {}): PurchaseBatch {
  return {
    id: 'pbatch-1',
    batchNumber: 'BAT-000001',
    batchSeq: 1,
    date: '2026-06-23',
    supplier: { name: 'Supplier A' },
    createdAt: '2026-06-23T00:00:00.000Z',
    ...overrides,
  };
}

function makeStockBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'product-1',
    dateEntered: '2026-06-23',
    quantity: 10,
    costPrice: 100,
    sellingPrice: 130,
    status: 'open',
    createdAt: '2026-06-23T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupSummariesByPurchaseEvent — ungrouped fallback', () => {
  it('a PurchaseBatch with no purchaseEventId lands entirely in `ungrouped`, never in `grouped`', () => {
    const pb = makePurchaseBatch(); // no purchaseEventId — the overwhelming majority case, by design (amendment Part 7)
    const summary = calculatePurchaseBatchSummary(pb, [makeStockBatch()], [], []);
    const result = groupSummariesByPurchaseEvent([summary]);
    assert.equal(result.grouped.length, 0);
    assert.equal(result.ungrouped.length, 1);
    assert.equal(result.ungrouped[0], summary);
  });

  it('a mix of correlated and uncorrelated PurchaseBatches separates correctly — every historical PurchaseBatch (no purchaseEventId at all) falls back exactly as today', () => {
    const uncorrelated1 = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-old-1', supplier: { name: 'Old Supplier' } }),
      [makeStockBatch({ id: 'batch-old-1' })],
      [],
      []
    );
    const uncorrelated2 = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-old-2', supplier: { name: 'Another Old Supplier' } }),
      [makeStockBatch({ id: 'batch-old-2' })],
      [],
      []
    );
    const correlated = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-new', purchaseEventId: 'pevent-1', supplier: { name: 'New Supplier' } }),
      [makeStockBatch({ id: 'batch-new' })],
      [],
      []
    );
    const result = groupSummariesByPurchaseEvent([uncorrelated1, uncorrelated2, correlated]);
    assert.equal(result.ungrouped.length, 2);
    assert.equal(result.grouped.length, 1);
    assert.equal(result.grouped[0].summaries.length, 1);
  });
});

describe('groupSummariesByPurchaseEvent — two-batch group', () => {
  it('two PurchaseBatches sharing a purchaseEventId are combined into one group with summed totals', () => {
    const batchA = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-a', purchaseEventId: 'pevent-1', supplier: { name: 'Supplier A' } }),
      [makeStockBatch({ id: 'batch-a', quantity: 10, costPrice: 100, sellingPrice: 130 })], // investment 1000, market 1300
      [],
      []
    );
    const batchB = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-b', purchaseEventId: 'pevent-1', supplier: { name: 'Supplier B' } }),
      [makeStockBatch({ id: 'batch-b', quantity: 5, costPrice: 200, sellingPrice: 260 })], // investment 1000, market 1300
      [],
      []
    );

    const result = groupSummariesByPurchaseEvent([batchA, batchB]);
    assert.equal(result.ungrouped.length, 0);
    assert.equal(result.grouped.length, 1);

    const group = result.grouped[0];
    assert.equal(group.purchaseEventId, 'pevent-1');
    assert.equal(group.summaries.length, 2);
    assert.deepEqual(group.supplierNames, ['Supplier A', 'Supplier B']); // first-seen order
    assert.equal(group.totalInvestmentValue, 2000); // 1000 + 1000
    assert.equal(group.totalMarketValue, 2600); // 1300 + 1300
    assert.equal(group.totalEmbeddedProfit, 600); // 2600 - 2000
  });

  it('group totals are pure addition over calculatePurchaseBatchSummary output — no independent recalculation', () => {
    // Structural confirmation, not just a numeric coincidence: the sum
    // of the group's own totalInvestmentValue must equal the sum of
    // its member summaries' individually-computed totalInvestmentValue
    // fields, verifying groupSummariesByPurchaseEvent never derives
    // its own investment/market/profit figures independently.
    const batchA = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-a', purchaseEventId: 'pevent-2', supplier: { name: 'Supplier A' } }),
      [makeStockBatch({ id: 'batch-a', quantity: 7, costPrice: 50, sellingPrice: 80 })],
      [],
      []
    );
    const batchB = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-b', purchaseEventId: 'pevent-2', supplier: { name: 'Supplier B' } }),
      [makeStockBatch({ id: 'batch-b', quantity: 3, costPrice: 40, sellingPrice: 60 })],
      [],
      []
    );
    const result = groupSummariesByPurchaseEvent([batchA, batchB]);
    const group = result.grouped[0];
    const expectedInvestment = batchA.totalInvestmentValue + batchB.totalInvestmentValue;
    const expectedMarket = batchA.totalMarketValue + batchB.totalMarketValue;
    assert.equal(group.totalInvestmentValue, expectedInvestment);
    assert.equal(group.totalMarketValue, expectedMarket);
  });
});

describe('groupSummariesByPurchaseEvent — three-supplier group (amendment worked example)', () => {
  it('matches the amendment\u2019s own 23 June / three-supplier / 45,000 investment example', () => {
    // Amendment investigation's worked example: Supplier A 20,000,
    // Supplier B 15,000, Supplier C 10,000 -> total investment 45,000
    // on one restocking trip. Constructed here as three separate
    // PurchaseBatches sharing one purchaseEventId, exactly the shape
    // Phase 3's "Add Another Supplier" flow produces.
    const supplierA = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-a', date: '2026-06-23', purchaseEventId: 'pevent-23june', supplier: { name: 'Supplier A' } }),
      [makeStockBatch({ id: 'batch-a', quantity: 20, costPrice: 1000, sellingPrice: 1250 })], // 20,000 investment
      [],
      []
    );
    const supplierB = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-b', date: '2026-06-23', purchaseEventId: 'pevent-23june', supplier: { name: 'Supplier B' } }),
      [makeStockBatch({ id: 'batch-b', quantity: 15, costPrice: 1000, sellingPrice: 1250 })], // 15,000 investment
      [],
      []
    );
    const supplierC = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-c', date: '2026-06-23', purchaseEventId: 'pevent-23june', supplier: { name: 'Supplier C' } }),
      [makeStockBatch({ id: 'batch-c', quantity: 10, costPrice: 1000, sellingPrice: 1250 })], // 10,000 investment
      [],
      []
    );

    const result = groupSummariesByPurchaseEvent([supplierA, supplierB, supplierC]);
    assert.equal(result.grouped.length, 1);
    assert.equal(result.ungrouped.length, 0);

    const group = result.grouped[0];
    assert.equal(group.summaries.length, 3);
    assert.deepEqual(group.supplierNames, ['Supplier A', 'Supplier B', 'Supplier C']);
    assert.equal(group.totalInvestmentValue, 45000); // 20,000 + 15,000 + 10,000 — the amendment's own headline figure
    assert.equal(group.date, '2026-06-23');
  });

  it('uses the earliest date among the group\u2019s PurchaseBatches as the representative date', () => {
    const first = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-1', date: '2026-06-23', purchaseEventId: 'pevent-1', supplier: { name: 'Supplier A' } }),
      [makeStockBatch({ id: 'batch-1' })],
      [],
      []
    );
    // "Add Another Supplier" clicked the next day — still correlated,
    // even though the individual PurchaseBatch dates differ slightly.
    const second = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-2', date: '2026-06-24', purchaseEventId: 'pevent-1', supplier: { name: 'Supplier B' } }),
      [makeStockBatch({ id: 'batch-2' })],
      [],
      []
    );
    const result = groupSummariesByPurchaseEvent([second, first]); // order-independent
    assert.equal(result.grouped[0].date, '2026-06-23');
  });

  it('multiple distinct Purchase Events never merge with each other', () => {
    const eventOneBatch = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-e1', purchaseEventId: 'pevent-1', supplier: { name: 'Supplier A' } }),
      [makeStockBatch({ id: 'batch-e1' })],
      [],
      []
    );
    const eventTwoBatch = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-e2', purchaseEventId: 'pevent-2', supplier: { name: 'Supplier B' } }),
      [makeStockBatch({ id: 'batch-e2' })],
      [],
      []
    );
    const result = groupSummariesByPurchaseEvent([eventOneBatch, eventTwoBatch]);
    assert.equal(result.grouped.length, 2);
    assert.equal(result.grouped.every((g) => g.summaries.length === 1), true);
  });
});

describe('groupSummariesByPurchaseEvent — valuation boundary (amendment Part 12)', () => {
  it('purchaseEventId itself is never read by calculatePurchaseBatchSummary — grouping is a pure post-processing step', () => {
    // Confirmed structurally: the same PurchaseBatch produces
    // identical totalInvestmentValue/totalMarketValue/totalEmbeddedProfit
    // whether or not it carries a purchaseEventId — the field is
    // purely a grouping key, read only by groupSummariesByPurchaseEvent
    // itself, never by the calculation engine.
    const withoutEvent = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-1' }), // no purchaseEventId
      [makeStockBatch({ quantity: 10, costPrice: 100, sellingPrice: 130 })],
      [],
      []
    );
    const withEvent = calculatePurchaseBatchSummary(
      makePurchaseBatch({ id: 'pbatch-2', purchaseEventId: 'pevent-1' }),
      [makeStockBatch({ quantity: 10, costPrice: 100, sellingPrice: 130 })],
      [],
      []
    );
    assert.equal(withoutEvent.totalInvestmentValue, withEvent.totalInvestmentValue);
    assert.equal(withoutEvent.totalMarketValue, withEvent.totalMarketValue);
    assert.equal(withoutEvent.totalEmbeddedProfit, withEvent.totalEmbeddedProfit);
  });
});
