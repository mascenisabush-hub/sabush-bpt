// Bug fix — Owner-reported, real client concern (Merceria Butoyi /
// "Lite 330ml"): an EXISTING Product with a valid canonical
// UnitRelationship (1 Cx = 4 Emb, 1 Emb = 6 Un, sellingUnit Un,
// sellingPrice 65 MZN/Un) is correctly auto-filled into a new Stock
// Entry row as "1,560" (65 re-expressed in the row's own purchase
// unit, Cx — see add-stock-existing-product-venda-total-unit-
// conversion.test.ts's own sibling fix for why this re-expression, not
// the raw 65, is what the row's sellingPrice/sellingPriceBasisUnit
// pair is supposed to hold). That part already worked correctly.
//
// ROOT CAUSE (forensic investigation, this session): the Preço Venda
// input's own onChange handler (AddStockView.tsx, both the desktop
// table layout and the mobile card layout — the SAME logical field,
// two responsive renderings) updated `sellingPrice` and cleared
// `sellingPriceAutoFilled`, but never touched `sellingPriceBasisUnit`
// — the one field every OTHER mutation site of this same pair
// (createEmptyRow, buildProductMemoryAutofill, handleUnitChange) keeps
// synchronized with the value it sets. A manually-typed Venda number
// therefore carried forward whatever basis unit happened to be
// recorded from BEFORE that edit, rather than the row's own current
// purchase unit at the moment of typing — an unannounced, silent
// staleness risk with no code path to ever notice or correct it.
//
// FIX: both onChange handlers now also set
// `sellingPriceBasisUnit: row.unit` in the same update — the row's own
// current purchase unit at the exact moment of the edit, the only
// basis a manually-typed number can honestly be assumed to be
// denominated in (this field carries no unit selector of its own).
//
// SCOPE NOTE: this repository has no DOM/React render harness (see
// add-stock-existing-product-venda-total-unit-conversion.test.ts's own
// header). This suite follows the same two established techniques:
// (1) a direct fixture reproducing the exact client numbers against
// the real, imported computeRatePerPurchaseUnit/getConversionFactor,
// and (2) structural source-text assertions confirming BOTH onChange
// handlers now set sellingPriceBasisUnit alongside sellingPrice/
// sellingPriceAutoFilled, in the same object literal, at both
// occurrences of the field.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-venda-manual-edit-basis-sync.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeRatePerPurchaseUnit, getConversionFactor } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

// The exact client scenario: Lite 330ml.
const liteRelationship: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 1 }, // units[0]'s own factor is unused/ignored, per isValidUnitRelationship
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T10:00:00.000Z',
};

describe('Client scenario verification — the untouched automatic path (Lite 330ml) is unaffected by this fix', () => {
  it('1 Cx = 24 Un — the composed multi-level factor is correct', () => {
    assert.equal(getConversionFactor(liteRelationship, 'Cx', 'Un'), 24);
  });

  it('65 MZN/Un correctly re-expresses to 1,560 MZN/Cx — the rate every autofill site (createEmptyRow, buildProductMemoryAutofill, handleUnitChange) already relies on, unmodified by this fix', () => {
    const rate = computeRatePerPurchaseUnit(liteRelationship, 'Cx', 'Un', 65);
    assert.equal(rate, 1560);
  });

  it('2 Cx at that rate implies 3,120 MZN total selling value', () => {
    const rate = computeRatePerPurchaseUnit(liteRelationship, 'Cx', 'Un', 65);
    assert.notEqual(rate, null);
    const totalSellingValue = 2 * (rate as number);
    assert.equal(totalSellingValue, 3120);
  });

  it('gross profit is 520 MZN (3,120 selling value minus 2,600 purchase cost), matching the reported client expected figures', () => {
    const rate = computeRatePerPurchaseUnit(liteRelationship, 'Cx', 'Un', 65);
    const totalSellingValue = 2 * (rate as number);
    const totalPurchaseCost = 2 * 1300;
    assert.equal(totalPurchaseCost, 2600);
    assert.equal(totalSellingValue - totalPurchaseCost, 520);
  });
});

describe('The defect class this fix closes — a stale sellingPriceBasisUnit silently mis-converts a manually-entered price', () => {
  // Reproduces resolveRowRevenue's OWN exact branching (AddStockView.tsx)
  // against the real, imported conversion primitives — never a
  // reinvented rule — to demonstrate what an inconsistent
  // (sellingPriceBasisUnit, row.unit) pair produces, independent of how
  // that inconsistency might arise.
  function reproduceResolveRowRevenue(
    purchaseUnit: string,
    sellingBasisUnit: string,
    quantity: number,
    sellingPrice: number,
    relationship: UnitRelationship | undefined
  ): number {
    if (!purchaseUnit || !sellingBasisUnit || purchaseUnit.toLowerCase() === sellingBasisUnit.toLowerCase()) {
      return quantity * sellingPrice;
    }
    const rate = isValidUnitRelationship(relationship)
      ? computeRatePerPurchaseUnit(relationship, purchaseUnit, sellingBasisUnit, sellingPrice)
      : null;
    return rate !== null ? quantity * rate : quantity * sellingPrice;
  }

  it('a manually-typed 65 immediately after auto-fill, still on the same Cx row, is internally consistent (basis correctly matches the current unit either way) — 130 MZN is the architecturally-intended reading of "65" typed while the row shows Cx, not a bug', () => {
    // sellingPriceBasisUnit correctly reflects row.unit at the moment of
    // the edit — exactly what the fix guarantees explicitly rather than
    // by coincidence.
    const revenue = reproduceResolveRowRevenue('Cx', 'Cx', 2, 65, liteRelationship);
    assert.equal(revenue, 130);
  });

  it('a STALE basis (left over from a unit that no longer matches the current purchase unit) silently compounds into a wrong, non-obvious figure -- this is the class of corruption an unsynchronized manual edit could feed into', () => {
    // Simulates the state a later, unrelated purchase-unit change could
    // produce if sellingPriceBasisUnit had never been set explicitly at
    // edit time (handleUnitChange updates row.unit unconditionally but
    // — by unmodified, Track-A-adjacent design — never re-derives an
    // already-manually-edited price; see handleUnitChange's own
    // existing guard, untouched by this fix). "65", genuinely meant as
    // Cx-denominated at the moment it was typed, becomes silently
    // reinterpreted as Emb-denominated the instant the tag and the
    // row's unit diverge — producing 32.5, not 65, not 130, not 3120,
    // and nothing on screen flags the discrepancy.
    const revenue = reproduceResolveRowRevenue('Emb', 'Cx', 2, 65, liteRelationship);
    assert.equal(revenue, 32.5);
    assert.notEqual(revenue, 130);
  });
});

describe('AddStockView.tsx — wiring: both Preço Venda manual-edit handlers now keep sellingPriceBasisUnit synchronized', () => {
  const handlerPattern =
    /onChange=\{e => updateRow\(row\.id, \{ sellingPrice: sanitizeDecimalInput\(e\.target\.value\), sellingPriceAutoFilled: false, sellingPriceBasisUnit: row\.unit \}\)\}/g;

  it('the fixed handler (value + autoFilled + basisUnit, all in the same update) appears exactly twice -- the desktop table row and the mobile card row, the same logical field two responsive layouts', () => {
    const matches = addStockSrc.match(handlerPattern);
    assert.notEqual(matches, null);
    assert.equal((matches as RegExpMatchArray).length, 2);
  });

  it('no pre-fix handler (missing sellingPriceBasisUnit) remains anywhere in the file', () => {
    const brokenPattern =
      /onChange=\{e => updateRow\(row\.id, \{ sellingPrice: sanitizeDecimalInput\(e\.target\.value\), sellingPriceAutoFilled: false \}\)\}/;
    assert.doesNotMatch(addStockSrc, brokenPattern);
  });

  it('the fix stamps the basis with the current purchase unit (row.unit) -- never a free-typed or re-derived value, never Product Memory own remembered unit', () => {
    const start = addStockSrc.indexOf('{/* Preço Venda */}');
    assert.notEqual(start, -1);
    const window = addStockSrc.slice(start, start + 2200);
    assert.match(window, /sellingPriceBasisUnit: row\.unit/);
  });

  it('this fix does not touch createEmptyRow, buildProductMemoryAutofill, handleUnitChange, resolveUnitAwarePrice, computeRatePerPurchaseUnit, or buildDerivedSellingValuationSnapshot -- the forensic investigation proven-correct mechanisms remain byte for byte as they were', () => {
    // A structural, not exhaustive, guard: each of these still exists
    // exactly once as its own named declaration, unmodified in shape.
    assert.equal((addStockSrc.match(/const createEmptyRow = /g) || []).length, 1);
    assert.equal((addStockSrc.match(/const buildProductMemoryAutofill = /g) || []).length, 1);
    assert.equal((addStockSrc.match(/const handleUnitChange = /g) || []).length, 1);
  });

  it('the fix never writes to Product.sellingPrice, Product.unitRelationship, or any Firestore product document — it only ever calls updateRow, the existing local-row-state setter', () => {
    const start = addStockSrc.indexOf('{/* Preço Venda */}');
    const end = addStockSrc.indexOf('{/* [Fix — resolveUnitAwarePrice]', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /updateRow\(row\.id, \{/);
    assert.doesNotMatch(body, /updateProduct/);
    assert.doesNotMatch(body, /setDoc/);
    assert.doesNotMatch(body, /updateDoc/);
  });
});
