// [Stock Count Simplification Amendment v1.0 —
// docs/specs/10-stock-counts-simplification-amendment.md,
// BDR-0009-stock-count-physical-observation.md]
//
// SCOPE: PeriodicStockCountView.tsx itself is a React component with no
// jsdom/testing-library harness in this repo (same constraint documented
// throughout tests/ — see restock-observation.test.ts, delete-product-plan
// .test.ts). What IS directly testable, and what this suite proves: the
// entire Counted-vs-Not-Counted / blank-vs-zero decision lives in one pure
// function, tallyStockCountRows() (src/utils/stockCount.ts) — the view just
// renders whatever it returns and passes its countedItems straight to
// recordStockCount. Proving this function correct proves the feature's
// central business rule (BDR-0009 Part 4) correct, independent of React.
//
// HOW TO RUN:
//   npx tsx --test tests/stock-count-simplification.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { tallyStockCountRows, StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

const row = (overrides: Partial<StockCountWorkingRow>): StockCountWorkingRow => ({
  productId: 'p1',
  productName: 'Arroz',
  quantity: '',
  unit: 'kg',
  costPrice: '50',
  sellingPrice: '80',
  ...overrides,
});

describe('tallyStockCountRows — blank vs. zero (BDR-0009 Part 4)', () => {
  it('a blank quantity is Not Counted, never coerced to 0', () => {
    const result = tallyStockCountRows([row({ quantity: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Arroz']);
  });

  it('a quantity of "0" is Counted — physically confirmed absent, not the same as blank', () => {
    const result = tallyStockCountRows([row({ quantity: '0' })]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].quantity, 0);
    assert.equal(result.notCountedProductNames.length, 0);
  });

  it('a zero-quantity row contributes 0 to totals but is still counted as a counted product', () => {
    const result = tallyStockCountRows([row({ quantity: '0', costPrice: '50', sellingPrice: '80' })]);
    assert.equal(result.totalPhysicalUnits, 0);
    assert.equal(result.totalPurchaseValue, 0);
    assert.equal(result.totalSellingValue, 0);
    assert.equal(result.countedItems.length, 1);
  });

  it('a positive quantity is Counted and contributes to totals', () => {
    const result = tallyStockCountRows([row({ quantity: '20', costPrice: '50', sellingPrice: '80' })]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.totalPhysicalUnits, 20);
    assert.equal(result.totalPurchaseValue, 1000);
    assert.equal(result.totalSellingValue, 1600);
  });

  it('an unparseable quantity string is treated as blank (Not Counted), never as 0', () => {
    const result = tallyStockCountRows([row({ quantity: 'abc' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Arroz']);
  });

  it('a row with no product name at all is dropped entirely — not Counted, not Not Counted', () => {
    const result = tallyStockCountRows([row({ productName: '  ', quantity: '5' })]);
    assert.equal(result.countedItems.length, 0);
    assert.equal(result.notCountedProductNames.length, 0);
  });
});

describe('tallyStockCountRows — removed rows (Amendment Part 10)', () => {
  it('a removed row is Not Counted, regardless of any quantity it may still hold', () => {
    const result = tallyStockCountRows([row({ quantity: '15', removed: true })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Arroz']);
  });

  it('a removed row never contributes to totals', () => {
    const result = tallyStockCountRows([
      row({ productName: 'Arroz', quantity: '15', removed: true }),
      row({ productName: 'Feijão', quantity: '5', costPrice: '30', sellingPrice: '50' }),
    ]);
    assert.equal(result.totalPhysicalUnits, 5);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].productName, 'Feijão');
  });
});

describe('tallyStockCountRows — partial counts and Counted/Not Counted breakdown', () => {
  it('correctly splits a mixed working list', () => {
    const result = tallyStockCountRows([
      row({ productName: 'Coca-Cola', quantity: '20', costPrice: '50', sellingPrice: '80' }),
      row({ productName: 'Fanta', quantity: '0', costPrice: '45', sellingPrice: '70' }),
      row({ productName: 'Arroz', quantity: '' }),
      row({ productName: 'Açúcar', quantity: '10', removed: true }),
    ]);
    assert.equal(result.countedItems.length, 2);
    assert.deepEqual(
      result.countedItems.map((i) => i.productName).sort(),
      ['Coca-Cola', 'Fanta']
    );
    assert.deepEqual(result.notCountedProductNames.sort(), ['Arroz', 'Açúcar']);
  });

  it('a fully-blank working list produces zero counted items, safe for the caller to reject', () => {
    const result = tallyStockCountRows([row({ quantity: '' }), row({ productName: 'Feijão', quantity: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.equal(result.notCountedProductNames.length, 2);
  });
});

describe('tallyStockCountRows — no item-level expected quantity or forbidden fields (BDR-0009 Part 2)', () => {
  it('a Not Counted product carries only its name — no quantity, price, or value fields', () => {
    const result = tallyStockCountRows([row({ productName: 'Cerveja', quantity: '' })]);
    assert.equal(typeof result.notCountedProductNames[0], 'string');
    // notCountedProductNames is string[] by type — this assertion guards
    // against a future refactor accidentally attaching an object with
    // quantity/expected fields to a Not Counted entry.
    assert.equal(result.notCountedProductNames.length, 1);
  });

  it('countedItems never contains an "expected" field of any kind', () => {
    const result = tallyStockCountRows([row({ quantity: '5' })]);
    const keys = Object.keys(result.countedItems[0]);
    assert.ok(!keys.some((k) => k.toLowerCase().includes('expected')));
  });
});

describe('tallyStockCountRows — unit and price handling', () => {
  it('falls back to "un" when unit is blank', () => {
    const result = tallyStockCountRows([row({ quantity: '3', unit: '' })]);
    assert.equal(result.countedItems[0].unit, 'un');
  });

  it('missing/invalid cost or selling price coerces to 0, never throws', () => {
    const result = tallyStockCountRows([row({ quantity: '3', costPrice: '', sellingPrice: 'n/a' })]);
    assert.equal(result.countedItems[0].costPrice, 0);
    assert.equal(result.countedItems[0].sellingPrice, 0);
  });
});

// ------------------------------------------------------------------
// Source-level regression guards — confirm PeriodicStockCountView.tsx
// actually wires this pure logic in (auto-population from the catalog,
// the mandatory confirmation step, and the productsError banner), and
// hasn't silently reverted to the old fully-manual free-text form.
// ------------------------------------------------------------------
describe('PeriodicStockCountView.tsx — source-level wiring guards', () => {
  const source = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

  it('auto-populates working rows from the products catalog', () => {
    assert.match(source, /useEffect/);
    assert.match(source, /buildCatalogRow\(product\)/);
  });

  it('uses tallyStockCountRows as the single source of truth for Counted/Not Counted', () => {
    assert.match(source, /tallyStockCountRows\(allWorkingRows\)/);
  });

  it('shows a mandatory confirmation step before saving (Amendment Part 9)', () => {
    assert.match(source, /pendingTally/);
    assert.match(source, /Produtos Não Contados/);
  });

  it('never silently converts blank to 0 in quantity input handling', () => {
    assert.doesNotMatch(source, /quantity:\s*parseFloat\([^)]*\)\s*\|\|\s*0/);
  });

  it('shows an explicit error state when the product catalog fails to load, distinct from an empty catalog', () => {
    assert.match(source, /productsError/);
    assert.match(source, /Tentar novamente/);
  });

  it('does not introduce a new item-level "expected" quantity anywhere in the view', () => {
    assert.doesNotMatch(source, /expectedQuantity/i);
    assert.doesNotMatch(source, /item\.expected/i);
  });
});

describe('AppContext.tsx — productsError wiring guard', () => {
  const source = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

  it('sets productsError on the products listener error callback and clears it on success', () => {
    assert.match(source, /setProductsError\(true\)/);
    assert.match(source, /setProductsError\(false\)/);
  });

  it('exposes productsError on the context value', () => {
    assert.match(source, /\n\s*productsError,\n/);
  });
});
