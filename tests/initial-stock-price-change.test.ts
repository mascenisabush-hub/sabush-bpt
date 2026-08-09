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
import { calculateInitialStockCurrentValuation } from '../src/utils/calculations';
import { StockCount, InitialStockPriceChangeEvent } from '../src/types';

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
