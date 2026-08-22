// buildProductValuationDetail unit tests — Business Worth Evolution,
// Finding 3 correction (Product Architect Decision: Option A, accepted).
//
// SCOPE: proves BusinessWorthSnapshotProductValuationLine.totalValue is
// built on the SAME selling-basis (quantity * sellingPrice) that
// productValuationTotal itself is built from (normalizeStockCountItems'
// own totalSellingValue, stockCount.ts) — not the item's cost-basis
// totalValue (quantity * costPrice), which is what this line's totalValue
// was a pass-through of before this correction. Pure function, no
// Firestore/AppContext dependency.
//
// HOW TO RUN:
//   npm run test:business-worth-snapshot-product-valuation-line

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { buildProductValuationDetail } from '../apps/tenant/src/utils/calculations';
import { normalizeStockCountItems } from '../apps/tenant/src/utils/stockCount';

describe('buildProductValuationDetail — Finding 3 correction (selling-basis totalValue)', () => {
  it('A: totalValue === quantity * sellingPrice for every line', () => {
    const lines = buildProductValuationDetail([
      { productId: 'p1', productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 100, sellingPrice: 150 },
      { productId: 'p2', productName: 'Feijão', quantity: 3, unit: 'kg', costPrice: 40, sellingPrice: 40 },
      { productId: 'p3', productName: 'Óleo', quantity: 2.5, unit: 'l', costPrice: 90, sellingPrice: 120 },
    ]);

    for (const line of lines) {
      assert.equal(line.totalValue, Number((line.quantity * line.sellingPrice).toFixed(2)));
    }
  });

  it('B: sum of productValuationDetail[].totalValue reconciles exactly to productValuationTotal for the same snapshot', () => {
    const rawItems = [
      { productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 100, sellingPrice: 150 },
      { productName: 'Feijão', quantity: 3, unit: 'kg', costPrice: 40, sellingPrice: 40 },
      { productName: 'Óleo', quantity: 2.5, unit: 'l', costPrice: 90, sellingPrice: 120 },
    ];

    // Mirrors AppContext.tsx's own recordStockCount data flow exactly:
    // normalizeStockCountItems() produces both the normalized items AND
    // totalSellingValue (productValuationTotal's real source); this test
    // never recomputes that total independently.
    const { items: normalizedItems, totalSellingValue } = normalizeStockCountItems(rawItems);
    const productValuationTotal = Number(totalSellingValue.toFixed(2));

    const countItems = normalizedItems.map((item, i) => ({
      productId: 'p' + i,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
    }));

    const lines = buildProductValuationDetail(countItems);
    const summedLineTotals = Number(lines.reduce((sum, l) => sum + l.totalValue, 0).toFixed(2));

    assert.equal(summedLineTotals, productValuationTotal);
  });

  it('C: totalValue follows sellingPrice, not costPrice, when they differ', () => {
    // Example from Finding 3: quantity=10, costPrice=100, sellingPrice=150
    // => expected line totalValue = 1500, NOT 1000.
    const [line] = buildProductValuationDetail([
      { productId: 'p1', productName: 'Arroz', quantity: 10, costPrice: 100, sellingPrice: 150 },
    ]);

    assert.equal(line.totalValue, 1500);
    assert.notEqual(line.totalValue, 1000);
    // costPrice is still carried on the line, unchanged, for consumers
    // that need it independently — only totalValue's meaning changed.
    assert.equal(line.costPrice, 100);
    assert.equal(line.sellingPrice, 150);
  });

  it('preserves productId/productName/unit/valuationMode pass-through unchanged', () => {
    const [line] = buildProductValuationDetail([
      {
        productId: 'p1',
        productName: 'Arroz',
        quantity: 10,
        unit: 'kg',
        costPrice: 100,
        sellingPrice: 150,
        valuationMode: 'B',
      },
    ]);

    assert.equal(line.productId, 'p1');
    assert.equal(line.productName, 'Arroz');
    assert.equal(line.unit, 'kg');
    assert.equal(line.valuationMode, 'B');
  });

  it('omits unit/valuationMode entirely when absent (never a literal undefined field)', () => {
    const [line] = buildProductValuationDetail([
      { productId: 'p1', productName: 'Arroz', quantity: 10, costPrice: 100, sellingPrice: 150 },
    ]);

    assert.equal('unit' in line, false);
    assert.equal('valuationMode' in line, false);
  });
});
