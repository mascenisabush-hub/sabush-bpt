// [Periodic Contagem — Implementation Authorization §1c, signed
// 27 September 2026, commit 6310429] Stage 3 of 6: tallyStockCountRows
// excludes an incomplete row (missing Unit or invalid/missing/zero
// Selling Price) from summed totals, the same way blank quantity
// already is. Direct execution against the real, imported function.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tallyStockCountRows, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

function row(overrides: Partial<StockCountWorkingRow> = {}): StockCountWorkingRow {
  return {
    productName: 'Cerveja Lite 330ml',
    quantity: '10',
    unit: 'cx',
    costPrice: '100',
    sellingPrice: '150',
    validated: false,
    ...overrides,
  } as StockCountWorkingRow;
}

describe('tallyStockCountRows — live-total honesty (§48 E)', () => {
  it('a fully valid row contributes to the summed totals, unchanged behavior', () => {
    const result = tallyStockCountRows([row()]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.notCountedProductNames.length, 0);
    assert.equal(result.totalSellingValue, 1500);
  });

  it('blank quantity is excluded exactly as before (unchanged, pre-existing behavior)', () => {
    const result = tallyStockCountRows([row({ quantity: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Cerveja Lite 330ml']);
  });

  it('missing Unit -> excluded from summed totals, added to notCountedProductNames (the newly closed gap)', () => {
    const result = tallyStockCountRows([row({ unit: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Cerveja Lite 330ml']);
    assert.equal(result.totalSellingValue, 0);
  });

  it('blank Selling Price -> excluded, no longer silently contributing zero (the most consequential closed gap)', () => {
    const result = tallyStockCountRows([row({ sellingPrice: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Cerveja Lite 330ml']);
  });

  it('Selling Price exactly 0 -> excluded, not treated as a legitimate zero selling value', () => {
    const result = tallyStockCountRows([row({ sellingPrice: '0' })]);
    assert.equal(result.countedItems.length, 0);
  });

  it('negative Selling Price -> excluded', () => {
    const result = tallyStockCountRows([row({ sellingPrice: '-5' })]);
    assert.equal(result.countedItems.length, 0);
  });

  it('non-numeric Selling Price -> excluded', () => {
    const result = tallyStockCountRows([row({ sellingPrice: 'abc' })]);
    assert.equal(result.countedItems.length, 0);
  });

  it('missing/invalid cost price does NOT exclude the row -- cost price remains optional, per §44, completely unaffected by this stage', () => {
    const resultBlank = tallyStockCountRows([row({ costPrice: '' })]);
    assert.equal(resultBlank.countedItems.length, 1);
  });

  it('multiple products, one incomplete -- the incomplete one is excluded, the valid ones are entirely unaffected (Decision A/B granularity)', () => {
    const result = tallyStockCountRows([
      row({ productName: 'Product A' }),
      row({ productName: 'Product B', sellingPrice: '' }),
      row({ productName: 'Product C', unit: '150' }),
    ]);
    assert.equal(result.countedItems.length, 2);
    assert.equal(result.countedItems.find((i) => i.productName === 'Product A')?.sellingPrice, 150);
    assert.equal(result.countedItems.find((i) => i.productName === 'Product C')?.sellingPrice, 150);
    assert.deepEqual(result.notCountedProductNames, ['Product B']);
  });

  it('quantity exactly 0 with valid unit/selling price still contributes -- a legitimate "genuinely out of stock" result, completely unaffected by this stage', () => {
    const result = tallyStockCountRows([row({ quantity: '0' })]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].quantity, 0);
  });
});
