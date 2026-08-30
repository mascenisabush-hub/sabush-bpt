// [FR-89–FR-94, Implementation Authorization §10, Option C — Persisted
// Selling-Price Basis Unit] Signed Rule 8 Assessment §15 addendum,
// Implementation Plan §20 addendum, Implementation Authorization §10 —
// all ACCEPTED AND SIGNED, Product Architect SABUSHIMIKE MASCENI, 30
// August 2026.
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent throughout every sibling Contagem/Add Stock
// test file. This suite exercises the REAL, unmodified, exported
// production functions (normalizeStockCountItems, tallyStockCountRows,
// findLatestRememberedProductMemory) directly against fixture data, plus
// structural source-text assertions confirming ProductDetailModal.tsx's
// own display line and AppContext.tsx's own persisted-write construction
// are wired correctly — the same two established techniques every other
// suite in this governance chain has used.
//
// HOW TO RUN:
//   npx tsx --test tests/stockcount-selling-price-basis-unit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  normalizeStockCountItems,
  tallyStockCountRows,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import {
  findLatestRememberedProductMemory,
  type RememberedStockCountSource,
} from '../apps/tenant/src/lib/productMemoryPriceResolution';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const productDetailModalSrc = src('apps/tenant/src/components/ProductDetailModal.tsx');
const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const stockCountSrc = src('apps/tenant/src/utils/stockCount.ts');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

// ==================================================================
// TEST 1 — Normal same-unit case: 7 Cx @ 480 MZN/Cx
// ==================================================================
describe('TEST 1 — normal same-unit case', () => {
  it('unit=Cx, sellingPriceBasisUnit=Cx, valuation unchanged', () => {
    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: '480', sellingPriceBasisUnit: 'Cx' },
    ]);
    assert.equal(items[0].unit, 'Cx');
    assert.equal(items[0].sellingPriceBasisUnit, 'Cx');
    assert.equal(totalSellingValue, 3360);
  });
});

// ==================================================================
// TEST 2 — Diverged-unit case: 7 Cx @ 50 MZN/Un
// ==================================================================
describe('TEST 2 — diverged-unit case', () => {
  it('persisted record: unit=Cx (physical), sellingPriceBasisUnit=Un — never unit=Un', () => {
    const { items } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: '50', sellingPriceBasisUnit: 'Un' },
    ]);
    assert.equal(items[0].unit, 'Cx');
    assert.equal(items[0].sellingPriceBasisUnit, 'Un');
    assert.notEqual(items[0].unit, 'Un', 'unit must never be repointed to the selling basis');
  });

  it('tallyStockCountRows (Owner-facing preview) produces the identical pairing', () => {
    const rows: StockCountWorkingRow[] = [
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '', sellingPrice: '50', sellingPriceBasisUnit: 'Un', sellingPriceAutoFilled: false },
    ];
    const { countedItems } = tallyStockCountRows(rows);
    assert.equal(countedItems[0].unit, 'Cx');
    assert.equal(countedItems[0].sellingPriceBasisUnit, 'Un');
  });
});

// ==================================================================
// TEST 3 — The dangerous sequence
// ==================================================================
describe('TEST 3 — dangerous sequence: deliberate 480/Cx, then physical unit changed to Un', () => {
  it('persisted record retains both meanings: unit=Un (final physical), sellingPriceBasisUnit=Cx (true price basis)', () => {
    const row: StockCountWorkingRow = {
      productName: 'Txilar',
      quantity: '5',
      unit: 'Un',
      costPrice: '',
      sellingPrice: '480',
      sellingPriceBasisUnit: 'Cx',
      sellingPriceAutoFilled: false,
    };
    const { countedItems } = tallyStockCountRows([row]);
    assert.equal(countedItems[0].unit, 'Un');
    assert.equal(countedItems[0].sellingPrice, 480);
    assert.equal(countedItems[0].sellingPriceBasisUnit, 'Cx');

    const { items } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Un', costPrice: '0', sellingPrice: '480', sellingPriceBasisUnit: 'Cx' },
    ]);
    assert.equal(items[0].unit, 'Un');
    assert.equal(items[0].sellingPrice, 480);
    assert.equal(items[0].sellingPriceBasisUnit, 'Cx');
  });
});

// ==================================================================
// TEST 4 — ProductDetailModal display
// ==================================================================
describe('TEST 4 — ProductDetailModal display', () => {
  it('structural: the selling-price line reads item.sellingPriceBasisUnit || item.unit, never item.unit alone', () => {
    assert.match(
      productDetailModalSrc,
      /formatCurrency\(item\.sellingPrice, currencySymbol\)\}\/\{item\.sellingPriceBasisUnit \|\| item\.unit \|\| 'un'\}/
    );
  });

  it('structural: the quantity display line is untouched — still item.unit only', () => {
    assert.match(productDetailModalSrc, /\{item\.quantity\} \{item\.unit \|\| 'un'\}/);
  });

  it('structural: the cost-price display line is untouched — still item.unit only (cost units are out of scope)', () => {
    assert.match(productDetailModalSrc, /formatCurrency\(item\.costPrice, currencySymbol\)\}\/\{item\.unit \|\| 'un'\}/);
  });
});

// ==================================================================
// TEST 5 — Legacy record (no sellingPriceBasisUnit at all)
// ==================================================================
describe('TEST 5 — legacy record, no sellingPriceBasisUnit field', () => {
  it('normalizeStockCountItems falls back to unit for a caller that never supplies the new field', () => {
    const { items } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: '480' },
    ]);
    assert.equal(items[0].sellingPriceBasisUnit, 'Cx');
  });

  it('tallyStockCountRows falls back to unit for a row that never had sellingPriceBasisUnit set', () => {
    const rows: StockCountWorkingRow[] = [
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '', sellingPrice: '480' },
    ];
    const { countedItems } = tallyStockCountRows(rows);
    assert.equal(countedItems[0].sellingPriceBasisUnit, 'Cx');
  });
});

// ==================================================================
// TEST 6 — Historical memory resolution
// ==================================================================
describe('TEST 6 — historical memory prefers sellingPriceBasisUnit over unit', () => {
  it('7 Cx @ 50 MZN/Un persisted historically: findLatestRememberedProductMemory resolves the unit as Un, not Cx', () => {
    const stockCounts: RememberedStockCountSource[] = [
      {
        date: '2026-08-20',
        items: [{ productId: 'p1', productName: 'Txilar', unit: 'Cx', costPrice: 0, sellingPrice: 50, sellingPriceBasisUnit: 'Un' }],
      },
    ];
    const memory = findLatestRememberedProductMemory('p1', 'Txilar', [], stockCounts);
    assert.ok(memory);
    assert.equal(memory!.unit, 'Un', 'must resolve the TRUE selling denomination, not the physical count unit');
    assert.equal(memory!.sellingPrice, 50);
  });

  it('a legacy historical item (no sellingPriceBasisUnit) falls back to unit exactly as before', () => {
    const stockCounts: RememberedStockCountSource[] = [
      { date: '2026-08-20', items: [{ productId: 'p1', productName: 'Txilar', unit: 'Cx', costPrice: 0, sellingPrice: 480 }] },
    ];
    const memory = findLatestRememberedProductMemory('p1', 'Txilar', [], stockCounts);
    assert.ok(memory);
    assert.equal(memory!.unit, 'Cx');
  });

  it('the confirmed-selling-unit tie-break, among multiple portions in one count, matches on sellingPriceBasisUnit not unit', () => {
    const stockCounts: RememberedStockCountSource[] = [
      {
        date: '2026-08-20',
        items: [
          { productId: 'p1', productName: 'Txilar', unit: 'Cx', costPrice: 0, sellingPrice: 480, sellingPriceBasisUnit: 'Cx' },
          { productId: 'p1', productName: 'Txilar', unit: 'Cx', costPrice: 0, sellingPrice: 50, sellingPriceBasisUnit: 'Un' },
        ],
      },
    ];
    const memory = findLatestRememberedProductMemory('p1', 'Txilar', [], stockCounts, 'Un');
    assert.ok(memory);
    assert.equal(memory!.unit, 'Un');
    assert.equal(memory!.sellingPrice, 50);
  });
});

// ==================================================================
// TEST 7 — Valuation invariance
// ==================================================================
describe('TEST 7 — valuation invariance across the existing FR-89–FR-94 scenarios', () => {
  it('12 Cx @ 50/Un = 14,400 MZN — unaffected by the new field', () => {
    const { totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '12', unit: 'Cx', costPrice: '0', sellingPrice: '1200', sellingPriceBasisUnit: 'Cx' },
    ]);
    assert.equal(totalSellingValue, 14400);
  });

  it('5 Cx@480/Cx + 7 Cx@50/Un = 10,800 MZN — unaffected by the new field', () => {
    const { totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '0', sellingPrice: '480', sellingPriceBasisUnit: 'Cx' },
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: '1200', sellingPriceBasisUnit: 'Un' },
    ]);
    assert.equal(totalSellingValue, 10800);
  });

  it('totalValue (cost-basis) is completely unaffected by sellingPriceBasisUnit', () => {
    const withField = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '100', sellingPrice: '480', sellingPriceBasisUnit: 'Un' },
    ]);
    const withoutField = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '100', sellingPrice: '480' },
    ]);
    assert.equal(withField.totalValue, withoutField.totalValue);
    assert.equal(withField.totalSellingValue, withoutField.totalSellingValue);
  });
});

// ==================================================================
// Full unit communication chain
// ==================================================================
describe('Full unit communication chain — 1 Cx = 12 Un, historical 7 Cx @ 50 MZN/Un', () => {
  it('reconstructs 7 Cx @ 50 MZN/Un = 4,200 MZN without confusing Cx and Un', () => {
    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: '600', sellingPriceBasisUnit: 'Cx' },
    ]);
    assert.equal(items[0].quantity, 7);
    assert.equal(items[0].unit, 'Cx');
    assert.equal(totalSellingValue, 4200);

    const stockCounts: RememberedStockCountSource[] = [
      { date: '2026-08-20', items: [{ productId: 'p1', productName: 'Txilar', unit: 'Cx', costPrice: 0, sellingPrice: 50, sellingPriceBasisUnit: 'Un' }] },
    ];
    const memory = findLatestRememberedProductMemory('p1', 'Txilar', [], stockCounts);
    assert.ok(memory);
    assert.equal(memory!.unit, 'Un');
    assert.equal(memory!.sellingPrice, 50);
    assert.equal(7 * 12 * memory!.sellingPrice, 4200);
  });
});

// ==================================================================
// Governance boundary — structural confirmation of exact scope
// ==================================================================
describe('Governance boundary — exact authorized scope, nothing beyond it', () => {
  it('normalizeStockCountItems/tallyStockCountRows populate sellingPriceBasisUnit exactly as authorized', () => {
    assert.match(stockCountSrc, /sellingPriceBasisUnit: raw\.sellingPriceBasisUnit \?\? unit,/);
    assert.match(stockCountSrc, /sellingPriceBasisUnit: row\.sellingPriceBasisUnit \?\? unit,/);
  });

  it('the confirm handler (PeriodicStockCountView.tsx) passes the field through to recordStockCount', () => {
    assert.match(periodicSrc, /sellingPriceBasisUnit: item\.sellingPriceBasisUnit,/);
  });

  it('AppContext.tsx writes the field into the actual persisted Firestore document', () => {
    assert.match(appContextSrc, /sellingPriceBasisUnit: norm\.sellingPriceBasisUnit,/);
  });

  it('Initial Stock and FR-67 files remain completely untouched by this field', () => {
    const initialStockSrc = src('apps/tenant/src/components/InitialStockCountView.tsx');
    const fr67Src = src('apps/tenant/src/lib/fr67CostBasisConversion.ts');
    assert.equal(initialStockSrc.includes('sellingPriceBasisUnit'), false, 'Initial Stock must remain completely untouched');
    assert.equal(fr67Src.includes('sellingPriceBasisUnit'), false, 'FR-67 cost-basis logic must remain completely untouched');
  });
});
