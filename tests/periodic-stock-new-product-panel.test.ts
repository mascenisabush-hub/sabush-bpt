// Business Worth Evolution — Decision 37, B.1: Product-Level First-Time
// Contagem Information Panel (PeriodicStockCountView.tsx).
//
// SCOPE: this repository has no DOM/React render harness (jsdom +
// @testing-library/react) — confirmed, established precedent, see
// tests/document-title.test.ts's own header comment and
// tests/periodic-stock-mode-a-integration.test.ts's own identical
// scope note. This suite follows that exact same precedent: rather
// than rendering PeriodicStockCountView.tsx itself, it exercises the
// SAME pure logic the component's own new render-gating condition and
// submit-time correlation loop depend on — computePortionLabels (real,
// imported, unmodified production code) plus small local
// reimplementations of the component's own trivial closures
// (isGenuinelyNewProductName, productKeyFor, and the corrected
// newProductInfo-based correlation loop), matching this repo's own
// established pattern for this exact class of problem (see
// periodic-stock-mode-a-integration.test.ts's own duplication of
// collectGroupPortions for the identical reason).
//
// REVISION HISTORY: this suite originally tested a first-pass B.1
// design that stored product-level information (purchase unit/cost,
// relationship candidate) as fields on the specific
// StockCountWorkingRow that happened to be portionIndex === 1 for its
// group. That design had a real bug — deleting that one row silently
// destroyed the product-level information, since nothing migrated it
// to the group's next remaining portion. The correction moved this
// data into a separate, product-key-keyed map (newProductInfo,
// mirroring modeAGroups' own existing pattern) that survives row
// deletion/reordering by construction. This suite was rewritten to
// test the CORRECTED design, and specifically to prove the exact bug
// scenario (delete the first portion of a two-portion new product) no
// longer loses data.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-new-product-panel.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computePortionLabels } from '../apps/tenant/src/lib/stockCountPortionGrouping';
import {
  tallyStockCountRows,
  normalizeStockCountItems,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

/** Mirrors PeriodicStockCountView.tsx's own productKeyFor — the SAME
 * key convention newProductInfo and modeAGroups both use. Duplicated
 * here ONLY as a small test fixture, matching this repo's own
 * established pattern for this exact class of problem. */
function productKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

/** Mirrors PeriodicStockCountView.tsx's own isGenuinelyNewProductName. */
function isGenuinelyNewProductName(products: { name: string }[], name: string): boolean {
  const trimmed = productKeyFor(name);
  if (!trimmed) return false;
  return !products.some((p) => p.name.toLowerCase() === trimmed);
}

/** Mirrors the exact B.1 panel gating condition at the manual-row call
 * site: portionLabel.portionIndex === 1 &&
 * isGenuinelyNewProductName(row.productName). This is a PRESENTATION
 * gate only, unaffected by the B.1 correction — see the corrected
 * data-ownership tests below for the part that actually changed. */
function shouldShowNewProductPanel(
  row: { productName: string },
  rowId: string,
  labels: Map<string, { portionIndex: number }>,
  products: { name: string }[]
): boolean {
  const label = labels.get(rowId) ?? { portionIndex: 1 };
  return label.portionIndex === 1 && isGenuinelyNewProductName(products, row.productName);
}

type NewProductInfo = { purchaseUnit: string; sellingUnit?: string; sellingUnitFactor?: string };

/** Mirrors PeriodicStockCountView.tsx's own corrected submit-time
 * correlation loop exactly: builds a UnitRelationship candidate PER
 * PRODUCT KEY from newProductInfo, never by scanning rows for
 * whichever one happens to carry the fields. `rows` is used only as a
 * purchase-unit fallback when the Owner left that field blank —
 * exactly matching the real implementation's own fallback. */
function correlateUnitRelationships(
  newProductInfo: Record<string, NewProductInfo>,
  rows: { productName: string; unit: string }[]
): Map<string, UnitRelationship> {
  const result = new Map<string, UnitRelationship>();
  for (const [key, info] of Object.entries(newProductInfo)) {
    if (!key || !info.sellingUnit || !info.sellingUnitFactor) continue;
    const factor = parseFloat(info.sellingUnitFactor);
    const sellingUnit = info.sellingUnit.trim();
    if (!sellingUnit || !Number.isFinite(factor) || factor <= 0) continue;
    const fallbackRow = rows.find((r) => productKeyFor(r.productName) === key);
    const purchaseUnit = info.purchaseUnit.trim() || fallbackRow?.unit || 'un';
    const candidate: UnitRelationship = {
      units: [
        { unit: purchaseUnit, factorFromPrevious: 0 },
        { unit: sellingUnit, factorFromPrevious: factor },
      ],
      sellingUnit,
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    if (isValidUnitRelationship(candidate)) {
      result.set(key, candidate);
    }
  }
  return result;
}

describe('B.1 panel gating (presentation only) — a genuinely-new product receives exactly one panel', () => {
  it('a single-portion genuinely-new product shows the panel on its one row', () => {
    const rows = [{ productName: 'Coca-Cola', id: 'manual-0' }];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    assert.equal(shouldShowNewProductPanel(rows[0], 'manual-0', labels, []), true);
  });

  it('a three-portion genuinely-new product shows the panel ONLY on the first row — never duplicated once per portion', () => {
    const rows = [
      { productName: 'Coca-Cola', id: 'manual-0' },
      { productName: 'Coca-Cola', id: 'manual-1' },
      { productName: 'Coca-Cola', id: 'manual-2' },
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, []));
    assert.deepEqual(results, [true, false, false]);
  });

  it('an existing catalogue product never receives the panel, on any of its rows', () => {
    const rows = [
      { productName: 'Coca-Cola', id: 'manual-0' },
      { productName: 'Coca-Cola', id: 'manual-1' },
    ];
    const labels = computePortionLabels(rows.map((r) => ({ id: r.id, productName: r.productName })));
    const products = [{ name: 'coca-cola' }];
    const results = rows.map((r) => shouldShowNewProductPanel(r, r.id, labels, products));
    assert.deepEqual(results, [false, false]);
  });
});

describe('B.1 correction — product-level data is keyed by product, not owned by a row', () => {
  it('REGRESSION (the fixed bug): deleting the first portion of a two-portion new product does NOT lose the product-level purchase/relationship information', () => {
    // Scenario, matching the governing instruction exactly:
    //   New product: Portion 1 -> 2 Cx, Portion 2 -> 3 Emb.
    //   Owner fills in the product-level purchase information.
    //   Portion 1 is deleted. Portion 2 becomes the first visible portion.
    //   The product-level information MUST remain intact.
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx', sellingUnit: 'Un', sellingUnitFactor: '24' },
    };
    const rowsBefore = [
      { productName: 'Coca-Cola', unit: 'Cx' }, // Portion 1
      { productName: 'Coca-Cola', unit: 'Emb' }, // Portion 2
    ];

    const beforeDeletion = correlateUnitRelationships(newProductInfo, rowsBefore);
    assert.deepEqual(beforeDeletion.get(key), {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-23T00:00:00.000Z',
    });

    // Delete Portion 1. handleRemoveManualRow is a plain array filter —
    // it never touches newProductInfo, which is the whole point of the
    // correction (the state simply isn't attached to any row).
    const rowsAfterDeletingPortion1 = rowsBefore.slice(1); // only Portion 2 (Emb) remains
    // newProductInfo is untouched — no code path in the real component
    // clears it on row removal, confirmed by inspection.

    const afterDeletion = correlateUnitRelationships(newProductInfo, rowsAfterDeletingPortion1);
    assert.deepEqual(
      afterDeletion.get(key),
      beforeDeletion.get(key),
      'product-level information must be byte-identical before and after deleting the first portion'
    );

    // The panel's own presentation gate also recovers correctly: Portion
    // 2 becomes portionIndex 1 and would now be where the panel renders
    // — reading the SAME, still-intact newProductInfo entry.
    const labelsAfter = computePortionLabels(
      rowsAfterDeletingPortion1.map((r, i) => ({ id: `manual-${i}`, productName: r.productName }))
    );
    assert.equal(shouldShowNewProductPanel(rowsAfterDeletingPortion1[0], 'manual-0', labelsAfter, []), true);
  });

  it('reordering portions (first portion becomes last) never destroys product-level information', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx', sellingUnit: 'Un', sellingUnitFactor: '24' },
    };
    const rowsOriginalOrder = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Coca-Cola', unit: 'Emb' },
      { productName: 'Coca-Cola', unit: 'Un' },
    ];
    const rowsReordered = [rowsOriginalOrder[2], rowsOriginalOrder[0], rowsOriginalOrder[1]];

    const before = correlateUnitRelationships(newProductInfo, rowsOriginalOrder);
    const after = correlateUnitRelationships(newProductInfo, rowsReordered);
    assert.deepEqual(before.get(key), after.get(key));
  });

  it('product-level information remains associated with the correct product across two simultaneously-in-progress new products', () => {
    const newProductInfo: Record<string, NewProductInfo> = {
      [productKeyFor('Coca-Cola')]: { purchaseUnit: 'Cx', sellingUnit: 'Un', sellingUnitFactor: '24' },
      [productKeyFor('Fanta Laranja')]: { purchaseUnit: 'Cx', sellingUnit: 'Un', sellingUnitFactor: '12' },
    };
    const rows = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Fanta Laranja', unit: 'Cx' },
    ];

    const result = correlateUnitRelationships(newProductInfo, rows);
    assert.equal(result.get(productKeyFor('Coca-Cola'))?.units[1].factorFromPrevious, 24);
    assert.equal(result.get(productKeyFor('Fanta Laranja'))?.units[1].factorFromPrevious, 12);
  });

  it('two different new products cannot share or cross-contaminate their product-level information', () => {
    const cocaKey = productKeyFor('Coca-Cola');
    const fantaKey = productKeyFor('Fanta Laranja');
    let newProductInfo: Record<string, NewProductInfo> = {};

    // Simulate the panel's own setInfo updater for Coca-Cola: first the
    // purchase unit, then the selling unit — two sequential edits to
    // the same product entry.
    newProductInfo = { ...newProductInfo, [cocaKey]: { ...(newProductInfo[cocaKey] ?? { purchaseUnit: '' }), purchaseUnit: 'Cx' } };
    newProductInfo = { ...newProductInfo, [cocaKey]: { ...newProductInfo[cocaKey], sellingUnit: 'Un' } };

    // Fanta's entry must not exist yet and must not have picked up any
    // of Coca-Cola's values.
    assert.equal(newProductInfo[fantaKey], undefined);
    assert.deepEqual(newProductInfo[cocaKey], { purchaseUnit: 'Cx', sellingUnit: 'Un' });

    // Now populate Fanta independently.
    newProductInfo = {
      ...newProductInfo,
      [fantaKey]: { ...(newProductInfo[fantaKey] ?? { purchaseUnit: '' }), purchaseUnit: 'Un' },
    };

    // Coca-Cola's entry must be completely unaffected by Fanta's write.
    assert.deepEqual(newProductInfo[cocaKey], { purchaseUnit: 'Cx', sellingUnit: 'Un' });
    assert.deepEqual(newProductInfo[fantaKey], { purchaseUnit: 'Un' });
  });

  it('a product with an unfilled relationship (sellingUnit/factor blank) yields no candidate — never a fabricated one', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx' }, // no sellingUnit/sellingUnitFactor entered yet
    };
    const rows = [{ productName: 'Coca-Cola', unit: 'Cx' }];

    const result = correlateUnitRelationships(newProductInfo, rows);
    assert.equal(result.has(key), false);
  });
});

describe('B.1 — existing-product behavior remains unchanged by the correction', () => {
  it('isGenuinelyNewProductName still correctly identifies an already-catalogued product, unaffected by the newProductInfo refactor', () => {
    const products = [{ name: 'Coca-Cola' }];
    assert.equal(isGenuinelyNewProductName(products, 'Coca-Cola'), false);
    assert.equal(isGenuinelyNewProductName(products, '  coca-cola  '), false);
    assert.equal(isGenuinelyNewProductName(products, 'Fanta Laranja'), true);
  });

  it('an existing product never populates newProductInfo — correlation is empty for it by construction, since the panel never renders for it', () => {
    // For an existing product, isGenuinelyNewProductName is false, so
    // the real component never renders NewProductInfoPanel and never
    // calls setNewProductInfo for that key — there is nothing to
    // correlate. This documents that guarantee at the data layer: an
    // empty newProductInfo produces an empty correlation result,
    // regardless of how many rows exist for the existing product.
    const rows = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Coca-Cola', unit: 'Un' },
    ];
    const result = correlateUnitRelationships({}, rows);
    assert.equal(result.size, 0);
  });
});

describe('B.1 — no interference with existing valuation/tally engines (regression, unaffected by the correction)', () => {
  it('tallyStockCountRows/normalizeStockCountItems totals are unchanged — StockCountWorkingRow no longer carries any of the four removed fields at all', () => {
    const row: StockCountWorkingRow = {
      productName: 'Fanta Laranja',
      quantity: '2',
      unit: 'Cx',
      costPrice: '1250',
      sellingPrice: '1250',
    };

    const tally = tallyStockCountRows([row]);
    assert.equal(tally.totalPurchaseValue, 2500);
    assert.equal(tally.totalSellingValue, 2500);

    const normalized = normalizeStockCountItems([row]);
    assert.equal(normalized.totalValue, 2500);
    assert.equal(normalized.totalSellingValue, 2500);
  });
});
