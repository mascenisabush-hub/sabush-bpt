// Initial Stock Dual-Valuation-Basis — Implementation Authorization,
// §2 items 1, 6, 7. Tests for:
//   1. normalizeStockCountItems's new totalSellingValue accumulation
//      (stockCount.ts) — proving totalValue's own computation remains
//      byte-identical while a new, parallel selling total is added.
//   2. resolveInitialCapitalValue (calculations.ts) — the single, pure
//      function every consumer of initialCapitalValue reads through.
//
// SCOPE: both functions under test are pure — no Firestore, no UI.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-dual-valuation-basis.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeStockCountItems } from '../apps/tenant/src/utils/stockCount';
import { resolveInitialCapitalValue } from '../apps/tenant/src/utils/calculations';
import type { StockCount, StockCountItem } from '../apps/tenant/src/types';

describe('normalizeStockCountItems — totalSellingValue (requirement 1: both totals preserved)', () => {
  it('computes totalSellingValue in parallel to totalValue, for a single item', () => {
    const result = normalizeStockCountItems([{ productName: 'Arroz', quantity: 10, unit: 'Saco', costPrice: 500, sellingPrice: 650 }]);
    assert.equal(result.totalValue, 5000); // 10 * 500 — unchanged behavior
    assert.equal(result.totalSellingValue, 6500); // 10 * 650 — new
  });

  it('totalValue remains byte-identical to its pre-existing, cost-only computation', () => {
    const result = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250, sellingPrice: 1600 },
    ]);
    assert.equal(result.totalValue, 3750); // 3 * 1250, sellingPrice never enters this
  });

  it('sums totalSellingValue correctly across multiple portions of one product (mirrors B5\'s existing cost-total behavior)', () => {
    const result = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250, sellingPrice: 1600 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60, sellingPrice: 80 },
    ]);
    assert.equal(result.items.length, 2);
    assert.equal(result.totalValue, 3750 + 1440); // 5190, unchanged pattern
    assert.equal(result.totalSellingValue, 4800 + 1920); // 3*1600 + 24*80 = 6720
  });

  it('missing/invalid sellingPrice coerces to 0 for totalSellingValue, matching costPrice\'s own rule', () => {
    const result = normalizeStockCountItems([{ productName: 'Arroz', quantity: 10, unit: 'Saco', costPrice: 500 }]);
    assert.equal(result.totalSellingValue, 0);
  });

  it('two different products each contribute independently to totalSellingValue', () => {
    const result = normalizeStockCountItems([
      { productName: 'Arroz', quantity: 10, unit: 'Saco', costPrice: 500, sellingPrice: 650 },
      { productName: 'Feijão', quantity: 3, unit: 'Saco', costPrice: 300, sellingPrice: 400 },
    ]);
    assert.equal(result.totalSellingValue, 6500 + 1200);
  });

  it('zero rows produces totalSellingValue 0, matching totalValue\'s own zero-row behavior', () => {
    const result = normalizeStockCountItems([]);
    assert.equal(result.totalValue, 0);
    assert.equal(result.totalSellingValue, 0);
  });

  it('rounds totalSellingValue to two decimal places, matching totalValue\'s own POL-0002 convention', () => {
    const result = normalizeStockCountItems([{ productName: 'Arroz', quantity: 3, unit: 'un', costPrice: 10, sellingPrice: 10.333 }]);
    assert.equal(result.totalSellingValue, 31);
  });

  // [Initial Stock Valuation Basis — Bernine-style purchase-unit ≠
  // selling-unit correction] The unit conversion itself (perUnitPrice
  // × factor) happens at UI input time, in InitialStockCountView.tsx's
  // onSellingPriceChange handler — see
  // initial-stock-live-total-valuation-basis.test.ts for that. By the
  // time an item reaches normalizeStockCountItems, sellingPrice is
  // already the fully-converted per-purchase-unit value; these prove
  // this function correctly turns that ALREADY-converted value into
  // the right total, with quantity/unit/costPrice completely
  // unaffected by whatever unit the selling price conversion involved.
  it('Bernine example: 1 cx purchased at 2050 MZN/cx, sold at 100 MZN/un with 1cx=24un — cost total 2050, selling total 2400 (the pre-converted 2400/cx value)', () => {
    const result = normalizeStockCountItems([
      { productName: 'Bernine', quantity: 1, unit: 'cx', costPrice: 2050, sellingPrice: 2400 },
    ]);
    assert.equal(result.totalValue, 2050); // 1 * 2050 — untouched by the conversion entirely
    assert.equal(result.totalSellingValue, 2400); // 1 * 2400 (2400 = 100 * 24, already converted)
    // The persisted item itself still shows the ORIGINAL purchase unit
    // and quantity — never rewritten into "24 un".
    assert.equal(result.items[0].quantity, 1);
    assert.equal(result.items[0].unit, 'cx');
    assert.equal(result.items[0].costPrice, 2050);
  });

  it('a larger purchase quantity of the same Bernine-style product scales both totals correctly (2 cx, not 1)', () => {
    const result = normalizeStockCountItems([
      { productName: 'Bernine', quantity: 2, unit: 'cx', costPrice: 2050, sellingPrice: 2400 },
    ]);
    assert.equal(result.totalValue, 4100); // 2 * 2050
    assert.equal(result.totalSellingValue, 4800); // 2 * 2400 = 2 * 24 * 100
  });
});

describe('resolveInitialCapitalValue — the single resolution point (requirements 5-8)', () => {
  const baseCount: StockCount = {
    id: 'initial',
    type: 'initial',
    date: '2026-08-01',
    items: [] as StockCountItem[],
    totalValue: 50000,
    totalSellingValue: 65000,
    createdAt: '2026-08-01T00:00:00.000Z',
  };

  it('returns 0 when there is no confirmed Initial Stock count at all', () => {
    assert.equal(resolveInitialCapitalValue(null), 0);
    assert.equal(resolveInitialCapitalValue(undefined), 0);
  });

  it('resolves to the cost total when initialCapitalBasis is absent — EVERY historical count before this feature existed', () => {
    const historical: StockCount = { ...baseCount, totalSellingValue: undefined, initialCapitalBasis: undefined };
    assert.equal(resolveInitialCapitalValue(historical), 50000);
  });

  it('is byte-identical to the OLD initialStockCount?.totalValue || 0 expression for a historical count', () => {
    const historical: StockCount = { ...baseCount, totalSellingValue: undefined };
    const oldExpression = historical?.totalValue || 0;
    assert.equal(resolveInitialCapitalValue(historical), oldExpression);
  });

  it('resolves to the cost total when initialCapitalBasis is explicitly "cost"', () => {
    const count: StockCount = { ...baseCount, initialCapitalBasis: 'cost' };
    assert.equal(resolveInitialCapitalValue(count), 50000);
  });

  it('resolves to the selling total when initialCapitalBasis is "selling"', () => {
    const count: StockCount = { ...baseCount, initialCapitalBasis: 'selling' };
    assert.equal(resolveInitialCapitalValue(count), 65000);
  });

  it('defensively falls back to the cost total if "selling" is selected but totalSellingValue is missing (should not occur under normal write path)', () => {
    const count: StockCount = { ...baseCount, initialCapitalBasis: 'selling', totalSellingValue: undefined };
    assert.equal(resolveInitialCapitalValue(count), 50000);
  });

  it('defensively falls back to the cost total if totalSellingValue is not a finite number', () => {
    const count: StockCount = { ...baseCount, initialCapitalBasis: 'selling', totalSellingValue: NaN };
    assert.equal(resolveInitialCapitalValue(count), 50000);
  });
});

describe('resolveInitialCapitalValue — businessWorth/capitalGrowth formula shape untouched (requirement 10)', () => {
  it('capitalGrowth = businessWorth - resolveInitialCapitalValue(...) reproduces the unchanged formula shape for a cost-basis business', () => {
    const count: StockCount = {
      id: 'initial', type: 'initial', date: '2026-08-01', items: [], totalValue: 50000, createdAt: '2026-08-01T00:00:00.000Z',
    };
    const businessWorth = 70000;
    const capitalGrowth = businessWorth - resolveInitialCapitalValue(count);
    assert.equal(capitalGrowth, 20000);
  });

  it('capitalGrowth reflects the selling basis when explicitly selected, formula shape identical', () => {
    const count: StockCount = {
      id: 'initial', type: 'initial', date: '2026-08-01', items: [], totalValue: 50000, totalSellingValue: 65000,
      initialCapitalBasis: 'selling', createdAt: '2026-08-01T00:00:00.000Z',
    };
    const businessWorth = 70000;
    const capitalGrowth = businessWorth - resolveInitialCapitalValue(count);
    assert.equal(capitalGrowth, 5000); // 70000 - 65000, not 70000 - 50000
  });
});
