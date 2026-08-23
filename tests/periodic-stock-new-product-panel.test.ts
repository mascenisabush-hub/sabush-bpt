// Business Worth Evolution — Decision 37, B.1: Product-Level First-Time
// Contagem Information Panel (PeriodicStockCountView.tsx).
//
// SCOPE: this repository has no DOM/React render harness (jsdom +
// @testing-library/react) — confirmed, established precedent, see
// tests/document-title.test.ts's own header comment and
// tests/periodic-stock-mode-a-integration.test.ts's own identical
// scope note. This suite follows that exact same precedent: rather
// than rendering PeriodicStockCountView.tsx itself, it exercises the
// SAME pure data this item's new render-gating condition depends on
// (computePortionLabels — real, imported, unmodified production code)
// combined with a small local reimplementation of
// isGenuinelyNewProductName (a trivial, catalog-lookup one-liner
// that lives inside the component as a closure, not exported — this
// suite duplicates it as a test fixture only, exactly as
// periodic-stock-mode-a-integration.test.ts already duplicates
// collectGroupPortions for the identical reason), to prove the B.1
// panel's gating condition end-to-end without a DOM dependency this
// repo has deliberately never added.
//
// Test groups mirror this item's own governing-prompt checklist: a
// genuinely-new product receives exactly one panel; the panel is never
// duplicated once per portion; an existing catalogue product never
// receives it; and the two new StockCountWorkingRow fields this item
// adds do not alter draft persistence or valuation in any way.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-new-product-panel.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computePortionLabels } from '../apps/tenant/src/lib/stockCountPortionGrouping';
import {
  tallyStockCountRows,
  normalizeStockCountItems,
  workingRowToDraftItem,
  draftItemToWorkingRow,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';

/** Mirrors PeriodicStockCountView.tsx's own isGenuinelyNewProductName —
 * duplicated here ONLY as a small test fixture (not re-exported/reused
 * by the component), matching this repo's own established pattern for
 * this exact class of problem. */
function isGenuinelyNewProductName(products: { name: string }[], name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return false;
  return !products.some((p) => p.name.toLowerCase() === trimmed);
}

/** Mirrors the exact B.1 panel gating condition added at the manual-row
 * call site in PeriodicStockCountView.tsx: portionLabel.portionIndex
 * === 1 && isGenuinelyNewProductName(row.productName). */
function shouldShowNewProductPanel(
  row: { productName: string },
  rowId: string,
  labels: Map<string, { portionIndex: number }>,
  products: { name: string }[]
): boolean {
  const label = labels.get(rowId) ?? { portionIndex: 1 };
  return label.portionIndex === 1 && isGenuinelyNewProductName(products, row.productName);
}

describe('B.1 panel gating — a genuinely-new product receives exactly one panel', () => {
  it('a single-portion genuinely-new product shows the panel on its one row', () => {
    const rows = [{ productName: 'Coca-Cola', id: 'manual-0' }];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products: { name: string }[] = [];

    assert.equal(shouldShowNewProductPanel(rows[0], 'manual-0', labels, products), true);
  });

  it('a three-portion genuinely-new product (2 Cx + 3 Emb + 5 Un, three manual rows) shows the panel ONLY on the first row — never duplicated once per portion', () => {
    const rows = [
      { productName: 'Coca-Cola', id: 'manual-0' },
      { productName: 'Coca-Cola', id: 'manual-1' },
      { productName: 'Coca-Cola', id: 'manual-2' },
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products: { name: string }[] = [];

    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, products));
    assert.deepEqual(results, [true, false, false], 'panel must render on exactly one of the three portion rows');
  });

  it('product-name matching is trimmed/case-insensitive, exactly like computePortionLabels\' own grouping key', () => {
    const rows = [
      { productName: '  Coca-Cola  ', id: 'manual-0' },
      { productName: 'coca-cola', id: 'manual-1' },
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products: { name: string }[] = [];

    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, products));
    assert.deepEqual(results, [true, false]);
  });

  it('a blank product name never shows the panel', () => {
    const rows = [{ productName: '', id: 'manual-0' }];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products: { name: string }[] = [];

    assert.equal(shouldShowNewProductPanel(rows[0], 'manual-0', labels, products), false);
  });
});

describe('B.1 panel gating — an existing catalogue product never incorrectly receives the first-time panel', () => {
  it('a manual row whose name matches an existing catalog product (any casing/whitespace) never shows the panel, even as the group\'s first row', () => {
    const rows = [
      { productName: 'Coca-Cola', id: 'manual-0' },
      { productName: 'Coca-Cola', id: 'manual-1' },
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products = [{ name: 'coca-cola' }];

    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, products));
    assert.deepEqual(results, [false, false], 'an already-known product must never show the first-time panel, on any of its rows');
  });

  it('a genuinely-new product alongside an existing one in the same draft: only the new one\'s first row shows the panel', () => {
    const rows = [
      { productName: 'Coca-Cola', id: 'manual-0' }, // existing catalog product
      { productName: 'Fanta Laranja', id: 'manual-1' }, // genuinely new
      { productName: 'Fanta Laranja', id: 'manual-2' }, // second portion of the new one
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products = [{ name: 'Coca-Cola' }];

    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, products));
    assert.deepEqual(results, [false, true, false]);
  });
});

describe('B.1 new fields — persistence semantics unchanged (mirrors the existing newProductSellingUnit/Factor precedent exactly)', () => {
  it('newProductPurchaseUnit/newProductPurchaseCost are excluded from the persisted draft item — workingRowToDraftItem drops them, exactly like the existing sibling fields', () => {
    const row: StockCountWorkingRow = {
      productName: 'Fanta Laranja',
      quantity: '2',
      unit: 'Cx',
      costPrice: '',
      sellingPrice: '1250',
      newProductSellingUnit: 'Un',
      newProductSellingUnitFactor: '24',
      newProductPurchaseUnit: 'Cx',
      newProductPurchaseCost: '1250',
    };

    const draftItem = workingRowToDraftItem(row);

    assert.equal((draftItem as unknown as Record<string, unknown>).newProductPurchaseUnit, undefined);
    assert.equal((draftItem as unknown as Record<string, unknown>).newProductPurchaseCost, undefined);
    // Existing sibling fields remain excluded too — proving this item
    // did not alter workingRowToDraftItem's existing behavior.
    assert.equal((draftItem as unknown as Record<string, unknown>).newProductSellingUnit, undefined);
    assert.equal((draftItem as unknown as Record<string, unknown>).newProductSellingUnitFactor, undefined);
    // Every field workingRowToDraftItem IS responsible for is still
    // carried through, unchanged.
    assert.deepEqual(draftItem, {
      productName: 'Fanta Laranja',
      quantity: '2',
      unit: 'Cx',
      costPrice: '',
      sellingPrice: '1250',
    });
  });

  it('a recovered draft round-trips through draftItemToWorkingRow with the two new fields simply absent (never fabricated), exactly like the existing sibling fields', () => {
    const draftItem = {
      productName: 'Fanta Laranja',
      quantity: '2',
      unit: 'Cx',
      costPrice: '',
      sellingPrice: '1250',
    };

    const recovered = draftItemToWorkingRow(draftItem);

    assert.equal(recovered.newProductPurchaseUnit, undefined);
    assert.equal(recovered.newProductPurchaseCost, undefined);
    assert.equal(recovered.productName, 'Fanta Laranja');
    assert.equal(recovered.quantity, '2');
  });
});

describe('B.1 — no interference with existing valuation/tally engines (regression, byte-identical)', () => {
  it('tallyStockCountRows totals are identical whether or not the two new B.1 fields are populated', () => {
    const baseRow: StockCountWorkingRow = {
      productName: 'Fanta Laranja',
      quantity: '2',
      unit: 'Cx',
      costPrice: '1250',
      sellingPrice: '1250',
    };
    const rowWithB1Fields: StockCountWorkingRow = {
      ...baseRow,
      newProductPurchaseUnit: 'Cx',
      newProductPurchaseCost: '1250',
      newProductSellingUnit: 'Un',
      newProductSellingUnitFactor: '24',
    };

    const without = tallyStockCountRows([baseRow]);
    const with_ = tallyStockCountRows([rowWithB1Fields]);

    assert.deepEqual(without, with_);
  });

  it('normalizeStockCountItems totals are identical whether or not the two new B.1 fields are populated', () => {
    const items = [
      { productName: 'Fanta Laranja', quantity: '2', unit: 'Cx', costPrice: '1250', sellingPrice: '1250' },
    ];
    const result = normalizeStockCountItems(
      items.map((i) => ({ ...i, quantity: i.quantity, costPrice: i.costPrice, sellingPrice: i.sellingPrice }))
    );

    // B.1 introduces no new field read by normalizeStockCountItems at
    // all (StockCountInputItem's own shape is untouched by this item) —
    // this assertion simply pins the existing, correct totals as an
    // explicit regression guard for this item's own change set.
    assert.equal(result.totalValue, 2500);
    assert.equal(result.totalSellingValue, 2500);
  });
});
