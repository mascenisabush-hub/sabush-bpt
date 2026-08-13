// Initial Stock Valuation History — calculateInitialStockCurrentValuation
// tests.
//
// SCOPE: the pure calculation function (src/utils/calculations.ts) is
// the entire testable surface here — it takes an 'initial' StockCount
// and an InitialStockPriceChangeEvent[] and returns nothing else,
// no Firestore/AppContext dependency, matching this repo's existing
// pattern for calculations.test.ts / expected-stock-value.test.ts.
// recordInitialStockPriceChangeEvent() (AppContext.tsx) itself is tightly
// coupled to the live Firebase client SDK, same reason
// initial-stock-confirmation.test.ts doesn't test recordStockCount()
// end-to-end — not retested here for the same documented reason.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-price-change.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateInitialStockCurrentValuation, calculateInitialStockValuationChange } from '../apps/tenant/src/utils/calculations';
import { StockCount, InitialStockPriceChangeEvent } from '../apps/tenant/src/types';

function makeInitialStockCount(overrides: Partial<StockCount> = {}): StockCount {
  return {
    id: 'stockcount-initial-1',
    type: 'initial',
    date: '2026-01-01',
    items: [
      {
        productId: 'prod-coca-cola',
        productName: 'Coca-Cola',
        quantity: 100,
        costPrice: 550,
        sellingPrice: 560,
        totalValue: 55000,
      },
    ],
    totalValue: 55000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<InitialStockPriceChangeEvent> = {}): InitialStockPriceChangeEvent {
  return {
    id: 'evt-1',
    businessId: 'biz-1',
    productId: 'prod-coca-cola',
    productName: 'Coca-Cola',
    effectiveDate: '2026-03-01',
    quantityRemaining: 35,
    previousCostPrice: 550,
    previousSellingPrice: 560,
    newCostPrice: 580,
    newSellingPrice: 600,
    createdAt: '2026-03-01T10:00:00.000Z',
    createdBy: 'owner-1',
    ...overrides,
  };
}

describe('basic event — 100 initial, 35 remaining, 560 -> 600 selling price', () => {
  it('values the remaining quantity at the new prices, not the original ones', () => {
    const count = makeInitialStockCount();
    const result = calculateInitialStockCurrentValuation(count, [makeEvent()]);

    assert.equal(result.perProduct.length, 1);
    const p = result.perProduct[0];
    assert.equal(p.quantity, 35);
    assert.equal(p.costPrice, 580);
    assert.equal(p.sellingPrice, 600);
    assert.equal(p.investmentValue, 35 * 580);
    assert.equal(p.marketValue, 35 * 600);
    assert.equal(p.hasPriceChange, true);
    assert.equal(result.totalInvestmentValue, 35 * 580);
    assert.equal(result.totalMarketValue, 35 * 600);
  });
});

describe('no event', () => {
  it('original valuation remains unchanged when no price-change event exists for a product', () => {
    const count = makeInitialStockCount();
    const result = calculateInitialStockCurrentValuation(count, []);

    const p = result.perProduct[0];
    assert.equal(p.quantity, 100);
    assert.equal(p.costPrice, 550);
    assert.equal(p.sellingPrice, 560);
    assert.equal(p.investmentValue, 100 * 550);
    assert.equal(p.marketValue, 100 * 560);
    assert.equal(p.hasPriceChange, false);
    assert.equal(p.latestEvent, null);
  });

  it('returns an all-zero result for a business with no confirmed Initial Stock at all', () => {
    const result = calculateInitialStockCurrentValuation(null, []);
    assert.equal(result.totalInvestmentValue, 0);
    assert.equal(result.totalMarketValue, 0);
    assert.deepEqual(result.perProduct, []);
  });
});

describe('multiple events', () => {
  it('uses only the most recent event (by effectiveDate) for a product — earlier events are history, not summed', () => {
    const count = makeInitialStockCount();
    const events = [
      makeEvent({ id: 'evt-1', effectiveDate: '2026-03-01', quantityRemaining: 35, newCostPrice: 580, newSellingPrice: 600 }),
      makeEvent({ id: 'evt-2', effectiveDate: '2026-05-01', quantityRemaining: 20, newCostPrice: 610, newSellingPrice: 650 }),
    ];
    const result = calculateInitialStockCurrentValuation(count, events);

    const p = result.perProduct[0];
    assert.equal(p.quantity, 20);
    assert.equal(p.costPrice, 610);
    assert.equal(p.sellingPrice, 650);
    assert.equal(p.investmentValue, 20 * 610);
    assert.equal(p.latestEvent?.id, 'evt-2');
  });

  it('tie-breaks on createdAt when two events share the same effectiveDate', () => {
    const count = makeInitialStockCount();
    const events = [
      makeEvent({ id: 'evt-early-write', effectiveDate: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z', quantityRemaining: 40, newCostPrice: 590, newSellingPrice: 610 }),
      makeEvent({ id: 'evt-later-write', effectiveDate: '2026-03-01', createdAt: '2026-03-01T09:00:00.000Z', quantityRemaining: 35, newCostPrice: 580, newSellingPrice: 600 }),
    ];
    const result = calculateInitialStockCurrentValuation(count, events);
    assert.equal(result.perProduct[0].latestEvent?.id, 'evt-later-write');
    assert.equal(result.perProduct[0].quantity, 35);
  });

  it('handles independent price-change histories for multiple products correctly', () => {
    const count = makeInitialStockCount({
      items: [
        { productId: 'prod-a', productName: 'Produto A', quantity: 100, costPrice: 100, sellingPrice: 120, totalValue: 10000 },
        { productId: 'prod-b', productName: 'Produto B', quantity: 50, costPrice: 200, sellingPrice: 240, totalValue: 10000 },
      ],
      totalValue: 20000,
    });
    const events = [
      makeEvent({ id: 'evt-a', productId: 'prod-a', quantityRemaining: 30, newCostPrice: 110, newSellingPrice: 130 }),
      // prod-b has no event — should fall back to original values.
    ];
    const result = calculateInitialStockCurrentValuation(count, events);

    const a = result.perProduct.find((p) => p.productId === 'prod-a')!;
    const b = result.perProduct.find((p) => p.productId === 'prod-b')!;
    assert.equal(a.quantity, 30);
    assert.equal(a.costPrice, 110);
    assert.equal(b.quantity, 50);
    assert.equal(b.costPrice, 200);
    assert.equal(result.totalInvestmentValue, 30 * 110 + 50 * 200);
  });
});

describe('historical immutability', () => {
  it('never reads or mutates the original StockCount item values, regardless of events passed', () => {
    const count = makeInitialStockCount();
    const originalItemsSnapshot = JSON.parse(JSON.stringify(count.items));
    calculateInitialStockCurrentValuation(count, [makeEvent()]);
    assert.deepEqual(count.items, originalItemsSnapshot);
    // totalValue (== initialCapitalValue's source) also untouched.
    assert.equal(count.totalValue, 55000);
  });
});

describe('backward compatibility', () => {
  it('a StockCount item with no sellingPrice (pre-existing historical data) defaults to 0, never throws', () => {
    const count = makeInitialStockCount({
      items: [
        { productId: 'prod-legacy', productName: 'Produto Antigo', quantity: 10, costPrice: 50, totalValue: 500 },
      ],
    });
    const result = calculateInitialStockCurrentValuation(count, []);
    assert.equal(result.perProduct[0].sellingPrice, 0);
    assert.equal(result.perProduct[0].marketValue, 0);
  });
});

// [Initial Stock Valuation History — Refinement] calculateInitialStockValuationChange
// tests. Scope: the pure valuation-change function itself, and its wiring
// into calculateInitialStockCurrentValuation's perProduct output. These are
// explicitly VALUATION CHANGES, never Embedded Profit / Business Worth /
// Initial Capital — several tests below assert that boundary directly.
describe('calculateInitialStockValuationChange — cost valuation', () => {
  it('computes cost valuation before/after/change from a single event, using that event\'s own quantityRemaining', () => {
    // Scenario from the business spec: 35 units remaining, cost 550 -> 580.
    const change = calculateInitialStockValuationChange({
      quantityRemaining: 35,
      previousCostPrice: 550,
      newCostPrice: 580,
      previousSellingPrice: 560,
      newSellingPrice: 600,
    });
    assert.equal(change.costValuationBefore, 35 * 550); // 19,250
    assert.equal(change.costValuationAfter, 35 * 580); // 20,300
    assert.equal(change.costValuationChange, 35 * (580 - 550)); // +1,050
  });
});

describe('calculateInitialStockValuationChange — selling valuation', () => {
  it('computes selling valuation before/after/change from a single event', () => {
    const change = calculateInitialStockValuationChange({
      quantityRemaining: 35,
      previousCostPrice: 550,
      newCostPrice: 580,
      previousSellingPrice: 560,
      newSellingPrice: 600,
    });
    assert.equal(change.sellingValuationBefore, 35 * 560); // 19,600
    assert.equal(change.sellingValuationAfter, 35 * 600); // 21,000
    assert.equal(change.sellingValuationChange, 35 * (600 - 560)); // +1,400
  });

  it('produces a negative change when the new price is lower than the previous one — a price decrease, not floored or treated as an error', () => {
    const change = calculateInitialStockValuationChange({
      quantityRemaining: 10,
      previousCostPrice: 100,
      newCostPrice: 80,
      previousSellingPrice: 150,
      newSellingPrice: 130,
    });
    assert.equal(change.costValuationChange, 10 * (80 - 100)); // -200
    assert.equal(change.sellingValuationChange, 10 * (130 - 150)); // -200
  });

  it('handles a zero price (existing validation policy allows 0, rejects only negative) without throwing', () => {
    const change = calculateInitialStockValuationChange({
      quantityRemaining: 5,
      previousCostPrice: 50,
      newCostPrice: 0,
      previousSellingPrice: 60,
      newSellingPrice: 0,
    });
    assert.equal(change.costValuationAfter, 0);
    assert.equal(change.costValuationChange, -250);
    assert.equal(change.sellingValuationAfter, 0);
    assert.equal(change.sellingValuationChange, -300);
  });
});

describe('valuationChange is not Embedded Profit', () => {
  it('the returned shape has no field named profit/embeddedProfit, and the four raw currency figures it does expose are independently addressable (not pre-summed into one "profit" number)', () => {
    const change = calculateInitialStockValuationChange({
      quantityRemaining: 35,
      previousCostPrice: 550,
      newCostPrice: 580,
      previousSellingPrice: 560,
      newSellingPrice: 600,
    });
    const keys = Object.keys(change).sort();
    assert.deepEqual(keys, [
      'costValuationAfter',
      'costValuationBefore',
      'costValuationChange',
      'sellingValuationAfter',
      'sellingValuationBefore',
      'sellingValuationChange',
    ]);
    assert.equal('profit' in change, false);
    assert.equal('embeddedProfit' in change, false);
  });
});

describe('valuationChange wired into calculateInitialStockCurrentValuation', () => {
  it('is null for a product with no price-change event — nothing to explain', () => {
    const count = makeInitialStockCount();
    const result = calculateInitialStockCurrentValuation(count, []);
    assert.equal(result.perProduct[0].valuationChange, null);
  });

  it('reflects the single event when exactly one exists', () => {
    const count = makeInitialStockCount();
    const result = calculateInitialStockCurrentValuation(count, [makeEvent()]);
    const change = result.perProduct[0].valuationChange;
    assert.ok(change);
    assert.equal(change!.costValuationChange, 35 * (580 - 550));
    assert.equal(change!.sellingValuationChange, 35 * (600 - 560));
  });

  it('with multiple events, reflects ONLY the latest event — not a sum across the product\'s full history', () => {
    const count = makeInitialStockCount();
    const events = [
      makeEvent({ id: 'evt-1', effectiveDate: '2026-03-01', quantityRemaining: 35, previousCostPrice: 550, newCostPrice: 580, previousSellingPrice: 560, newSellingPrice: 600 }),
      makeEvent({ id: 'evt-2', effectiveDate: '2026-05-01', quantityRemaining: 20, previousCostPrice: 580, newCostPrice: 590, previousSellingPrice: 600, newSellingPrice: 610 }),
    ];
    const result = calculateInitialStockCurrentValuation(count, events);
    const change = result.perProduct[0].valuationChange;
    assert.ok(change);
    // Latest event only: 20 * (590 - 580) = 200, NOT any sum involving evt-1.
    assert.equal(change!.costValuationChange, 20 * (590 - 580));
    assert.equal(change!.sellingValuationChange, 20 * (610 - 600));
  });

  it('both historical events remain independently queryable/recomputable from the raw event list, even though only the latest feeds the current-state valuationChange', () => {
    const events = [
      makeEvent({ id: 'evt-1', effectiveDate: '2026-03-01', quantityRemaining: 35, previousCostPrice: 550, newCostPrice: 580, previousSellingPrice: 560, newSellingPrice: 600 }),
      makeEvent({ id: 'evt-2', effectiveDate: '2026-05-01', quantityRemaining: 20, previousCostPrice: 580, newCostPrice: 590, previousSellingPrice: 600, newSellingPrice: 610 }),
    ];
    // Each event's own valuation-change explanation is independently
    // derivable — this is what lets the UI show a per-event history list,
    // not just the current/latest figure.
    const evt1Change = calculateInitialStockValuationChange(events[0]);
    const evt2Change = calculateInitialStockValuationChange(events[1]);
    assert.equal(evt1Change.costValuationChange, 35 * (580 - 550)); // +1,050
    assert.equal(evt2Change.costValuationChange, 20 * (590 - 580)); // +200
  });
});

describe('Initial Capital and StockCount remain unaffected by valuation-change computation', () => {
  it('original Initial Capital (StockCount.totalValue) is untouched by computing valuationChange', () => {
    const count = makeInitialStockCount();
    calculateInitialStockCurrentValuation(count, [makeEvent()]);
    assert.equal(count.totalValue, 55000); // unchanged — Initial Capital
  });

  it('original StockCount items are untouched by computing valuationChange', () => {
    const count = makeInitialStockCount();
    const originalItemsSnapshot = JSON.parse(JSON.stringify(count.items));
    calculateInitialStockCurrentValuation(count, [makeEvent()]);
    assert.deepEqual(count.items, originalItemsSnapshot);
  });
});
