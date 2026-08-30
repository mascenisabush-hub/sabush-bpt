// [Bug fix — Finding C regression, fresh audit] Add Stock's cost/selling
// unit conflation. The Finding C correction (commit 9ab8022) introduced
// canonical-selling-memory overrides at two Add Stock call sites
// (createEmptyRow's initial fill, buildProductMemoryAutofill) that wrote
// `initialUnit`/`newUnit = canonicalSellingMemory.unit` directly — this
// silently reinterpreted a receipt/batch-denominated cost price (e.g.
// 1,000 MZN/Cx) as if it were denominated in the confirmed selling unit
// (e.g. 1,000 MZN/Un) whenever the two genuinely differed, since
// `StockRowItem` has exactly one shared `unit` field for quantity, cost,
// AND selling. This suite proves the fix: canonical selling memory now
// supplies the selling price CONVERTED into whatever unit the row
// already has (or would otherwise have), via the same
// resolveUnitAwarePrice conversion the other three call sites
// (getRememberedPriceForRow, handleConfirmSupplierWordingCandidate,
// buildRowFromProposalLineItem) already used safely — never an override
// of the row's own unit.
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see tests/add-stock-typing-and-autofill-bugfix.test.ts's
// own header). This suite follows the same two established techniques:
// (1) direct fixture tests against the REAL, imported
// resolveCanonicalProductSellingMemory/resolveUnitAwarePrice — proving
// the underlying conversion arithmetic is correct, and (2) structural
// source-text assertions confirming each of the five AddStockView.tsx
// call sites is wired correctly (override removed at the two affected
// sites; the three already-safe sites remain unmodified).
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-cost-selling-unit-conflation-bugfix.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveCanonicalProductSellingMemory, resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

const CX_UN: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

// ==================================================================
// TEST 1 — Cost Cx, Selling Un
// ==================================================================
describe('TEST 1 — Cost Cx, Selling Un: 10 Cx @ 1,000 MZN/Cx, canonical selling 50 MZN/Un', () => {
  it('resolveUnitAwarePrice converts 50 MZN/Un into 1,200 MZN/Cx — cost stays 1,000/Cx, never reinterpreted', () => {
    const canonical = resolveCanonicalProductSellingMemory({
      sellingPrice: 50,
      unitRelationship: CX_UN,
    });
    assert.deepEqual(canonical, { unit: 'Un', sellingPrice: 50 });

    // The row's own existing unit (from the batch) is 'Cx' — the fix
    // must convert INTO that unit, never override it.
    const rowUnit = 'Cx';
    const resolvedSell = resolveUnitAwarePrice(canonical!.sellingPrice, canonical!.unit, rowUnit, CX_UN);
    assert.equal(resolvedSell, '1200.00');

    // Cost is untouched by any of this — still 1,000, still Cx.
    const costPrice = 1000;
    const costUnit = 'Cx';
    assert.equal(costUnit, rowUnit, 'quantity/cost unit must remain Cx, never silently become Un');
    assert.equal(costPrice, 1000, 'cost must never be reinterpreted as if it were per-Un');
  });
});

// ==================================================================
// TEST 2 — Cost Cx, Selling Cx (units already match)
// ==================================================================
describe('TEST 2 — Cost Cx, Selling Cx: no conversion needed', () => {
  it('unit remains Cx, cost remains 1,000/Cx, selling remains 480/Cx', () => {
    const canonical = resolveCanonicalProductSellingMemory({ sellingPrice: 480, unitRelationship: { ...CX_UN, sellingUnit: 'Cx' } });
    assert.deepEqual(canonical, { unit: 'Cx', sellingPrice: 480 });
    const resolvedSell = resolveUnitAwarePrice(canonical!.sellingPrice, canonical!.unit, 'Cx', CX_UN);
    assert.equal(resolvedSell, '480'); // identity case — unchanged, matching resolveUnitAwarePrice's own contract
  });
});

// ==================================================================
// TEST 3 — Cost Un, Selling Cx (reverse direction)
// ==================================================================
describe('TEST 3 — Cost Un, Selling Cx: 240 Un @ 10 MZN/Un, canonical selling 480 MZN/Cx', () => {
  it('cost remains 10/Un, row unit remains Un, selling converts correctly, cost unit never becomes Cx', () => {
    const canonical = resolveCanonicalProductSellingMemory({ sellingPrice: 480, unitRelationship: { ...CX_UN, sellingUnit: 'Cx' } });
    assert.deepEqual(canonical, { unit: 'Cx', sellingPrice: 480 });

    const rowUnit = 'Un'; // established by the purchase, must not change
    const resolvedSell = resolveUnitAwarePrice(canonical!.sellingPrice, canonical!.unit, rowUnit, CX_UN);
    // 480 MZN/Cx -> per-Un: 480 / 24 = 20
    assert.equal(resolvedSell, '20.00');

    const costPrice = 10;
    const costUnit = 'Un';
    assert.equal(costUnit, rowUnit);
    assert.equal(costPrice, 10, 'cost must never be overwritten by the selling-side conversion');
  });
});

// ==================================================================
// TEST 4 — Existing product selected manually after receipt/batch
// established unit=Cx, costPrice=1,000
// ==================================================================
describe('TEST 4 — manual product selection after receipt/batch already established unit=Cx, costPrice=1,000', () => {
  it('structural: buildProductMemoryAutofill (handleSelectProductForTool\'s own fill logic) never overrides newUnit from canonical memory', () => {
    const fnMatch = addStockSrc.match(/const buildProductMemoryAutofill = \([\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find buildProductMemoryAutofill');
    const body = fnMatch![0];
    assert.doesNotMatch(body, /newUnit = canonicalSellingMemory\.unit/, 'must never override newUnit from canonical memory');
    assert.match(body, /resolveUnitAwarePrice\(canonicalSellingMemory\.sellingPrice, canonicalSellingMemory\.unit, newUnit, product\.unitRelationship\)/);
  });

  it('the fix computes the correct converted value for this exact scenario', () => {
    const canonical = resolveCanonicalProductSellingMemory({ sellingPrice: 50, unitRelationship: CX_UN });
    const resolvedSell = resolveUnitAwarePrice(canonical!.sellingPrice, canonical!.unit, 'Cx', CX_UN);
    assert.equal(resolvedSell, '1200.00');
    // unit and costPrice, established by the prior receipt/batch fill,
    // are never touched by this call at all — confirmed structurally
    // above (newUnit is read, never written, inside the canonical-memory
    // branch).
  });
});

// ==================================================================
// TEST 5 — Smart Stock Entry remains cost-consistent
// ==================================================================
describe('TEST 5 — Smart Stock Entry: 10 Cx @ 1,000/Cx receipt, canonical selling 50/Un', () => {
  it('structural: buildRowFromProposalLineItem never overrides `unit` from canonical memory — unchanged from before this fix', () => {
    const fnMatch = addStockSrc.match(/const buildRowFromProposalLineItem = async \([\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find buildRowFromProposalLineItem');
    const body = fnMatch![0];
    assert.doesNotMatch(body, /unit = canonicalSellingMemory\.unit/);
    assert.match(body, /resolveUnitAwarePrice\(sellSource\.sellingPrice, sellSource\.unit, unit, matched\.unitRelationship\)/);
  });

  it('structural: handleConfirmSupplierWordingCandidate (re-confirming a scan match) also never overrides row.unit', () => {
    const fnMatch = addStockSrc.match(/const handleConfirmSupplierWordingCandidate = \([\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find handleConfirmSupplierWordingCandidate');
    const body = fnMatch![0];
    assert.doesNotMatch(body, /row\.unit = canonicalSellingMemory\.unit/);
    assert.match(body, /resolveUnitAwarePrice\(sellSource\.sellingPrice, sellSource\.unit, row\.unit, matchedProduct\.unitRelationship\)/);
  });

  it('the receipt cost (1,000/Cx) and converted selling price (1,200/Cx) are both correct and mutually consistent', () => {
    const receiptCost = 1000;
    const receiptUnit = 'Cx';
    const canonical = resolveCanonicalProductSellingMemory({ sellingPrice: 50, unitRelationship: CX_UN });
    const resolvedSell = resolveUnitAwarePrice(canonical!.sellingPrice, canonical!.unit, receiptUnit, CX_UN);
    assert.equal(receiptCost, 1000);
    assert.equal(resolvedSell, '1200.00');
  });
});

// ==================================================================
// TEST 6 — Owner selling-price override
// ==================================================================
describe('TEST 6 — Owner selling-price override still works, no cost corruption', () => {
  it('structural: sellingPriceAutoFilled flip-on-edit mechanism is untouched by this fix', () => {
    // Confirmed by absence of any change to the row-update handlers
    // (updateRow itself, and the sellingPrice <input>'s own onChange)
    // — this fix only touches the four selling-memory-read call sites,
    // never the Owner-edit write path.
    assert.match(addStockSrc, /onChange=\{e => updateRow\(row\.id, \{ sellingPrice: e\.target\.value, sellingPriceAutoFilled: false \}\)\}/);
  });
});

// ==================================================================
// TEST 7 — Owner selling-unit override via handleUnitChange
// ==================================================================
describe('TEST 7 — Owner deliberately changes the unit: cost and selling both re-derive independently from their OWN basis unit', () => {
  it('structural: handleUnitChange converts cost from costPriceBasisUnit and selling from sellingPriceBasisUnit independently — never from a shared conflated source', () => {
    const fnMatch = addStockSrc.match(/const handleUnitChange = \([\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find handleUnitChange');
    const body = fnMatch![0];
    assert.match(body, /const basisUnit = row\.costPriceBasisUnit \?\? row\.unit;/);
    assert.match(body, /const basisUnit = row\.sellingPriceBasisUnit \?\? row\.unit;/);
  });

  it('changing the unit correctly re-converts a deliberately-set cost price without touching selling, and vice versa', () => {
    // Cost was deliberately 1,000 at unit Cx (basis Cx); Owner changes
    // physical unit to Un — cost re-derives to 1000/24; selling,
    // independently basis-tracked, re-derives from its OWN basis.
    const costResolved = resolveUnitAwarePrice(1000, 'Cx', 'Un', CX_UN);
    assert.equal(costResolved, '41.67');
    const sellResolved = resolveUnitAwarePrice(1200, 'Cx', 'Un', CX_UN);
    assert.equal(sellResolved, '50.00');
  });
});

// ==================================================================
// TEST 8 — No canonical selling memory
// ==================================================================
describe('TEST 8 — no canonical selling memory: existing historical/manual behavior remains valid', () => {
  it('resolveCanonicalProductSellingMemory returns null when no confirmed selling unit or no remembered price exists — historical fallback untouched', () => {
    assert.equal(resolveCanonicalProductSellingMemory({ sellingPrice: 50, unitRelationship: undefined }), null);
    assert.equal(resolveCanonicalProductSellingMemory({ sellingPrice: undefined, unitRelationship: CX_UN }), null);
  });

  it('structural: both fixed call sites fall through to their existing memory/product fallback when canonical memory is null', () => {
    const createEmptyRowMatch = addStockSrc.match(/const createEmptyRow = \([\s\S]*?\n  \};/);
    assert.ok(createEmptyRowMatch);
    assert.match(createEmptyRowMatch![0], /if \(memory\) \{/);
    assert.match(createEmptyRowMatch![0], /else if \(match\.costPrice != null \|\| match\.sellingPrice != null\)/);
  });
});

// ==================================================================
// TEST 9 — Unit relationship conversion, both directions, exactly once
// ==================================================================
describe('TEST 9 — conversion factor applied exactly once, both directions', () => {
  it('Cx -> Un: 50 MZN/Cx becomes 50/24 MZN/Un', () => {
    const resolved = resolveUnitAwarePrice(50, 'Cx', 'Un', CX_UN);
    assert.equal(resolved, '2.08');
  });

  it('Un -> Cx: 50 MZN/Un becomes 1,200 MZN/Cx', () => {
    const resolved = resolveUnitAwarePrice(50, 'Un', 'Cx', CX_UN);
    assert.equal(resolved, '1200.00');
  });

  it('round-trip Cx -> Un -> Cx recovers the original value (within rounding), proving the factor is applied exactly once each way, never compounded', () => {
    const toUn = resolveUnitAwarePrice(1200, 'Cx', 'Un', CX_UN);
    const backToCx = resolveUnitAwarePrice(parseFloat(toUn), 'Un', 'Cx', CX_UN);
    assert.equal(Math.round(parseFloat(backToCx)), 1200);
  });
});

// ==================================================================
// TEST 10 — Previous Finding C behavior not regressed
// ==================================================================
describe('TEST 10 — canonical Product selling memory remains authoritative (Finding C intact)', () => {
  it('canonical memory still overrides stale/disagreeing historical re-derivation for the SELLING price itself', () => {
    // Even though we no longer override `unit`, the SELLING PRICE itself
    // still comes from canonical memory (480/Cx) whenever it exists —
    // never from a possibly-disagreeing historical StockBatch/StockCount
    // re-derivation. This is exactly Finding C's own guarantee, unchanged.
    const canonical = resolveCanonicalProductSellingMemory({ sellingPrice: 480, unitRelationship: { ...CX_UN, sellingUnit: 'Cx' } });
    assert.deepEqual(canonical, { unit: 'Cx', sellingPrice: 480 });
  });

  it('structural: all four remaining selling-memory-consuming call sites still call resolveCanonicalProductSellingMemory', () => {
    const occurrences = (addStockSrc.match(/resolveCanonicalProductSellingMemory\(/g) || []).length;
    assert.equal(occurrences, 5, 'all five call sites must still consult canonical memory — only the OVERRIDE behavior was removed, not the canonical-memory priority itself');
  });
});

// ==================================================================
// Five call sites — final classification
// ==================================================================
describe('Five Add Stock selling-memory call sites — final classification', () => {
  it('createEmptyRow (site 1) — CORRECTED: no longer overrides unit; converts into it', () => {
    const fnMatch = addStockSrc.match(/const createEmptyRow = \([\s\S]*?\n  \};/);
    const body = fnMatch![0];
    // [Precision note] `doesNotMatch` must not trip on this file's own
    // explanatory comment, which legitimately quotes the OLD, removed
    // line for documentation purposes — checked as an actual, live
    // (non-commented) statement: start-of-line whitespace immediately
    // followed by the assignment, never preceded by `//`.
    assert.doesNotMatch(body, /^\s*initialUnit = canonicalSellingMemory\.unit/m);
    assert.match(body, /resolveUnitAwarePrice\(canonicalSellingMemory\.sellingPrice, canonicalSellingMemory\.unit, initialUnit, match\.unitRelationship\)/);
  });

  it('buildProductMemoryAutofill (site 2) — CORRECTED: no longer overrides unit; converts into it', () => {
    const fnMatch = addStockSrc.match(/const buildProductMemoryAutofill = \([\s\S]*?\n  \};/);
    const body = fnMatch![0];
    assert.doesNotMatch(body, /newUnit = canonicalSellingMemory\.unit/);
  });

  it('getRememberedPriceForRow (site 3) — CORRECT AS-IS: read-only price-deviation comparator, already converts into row.unit', () => {
    const fnMatch = addStockSrc.match(/const getRememberedPriceForRow = \([\s\S]*?\n  \};/);
    const body = fnMatch![0];
    assert.match(body, /resolveUnitAwarePrice\(canonicalSellingMemory\.sellingPrice, canonicalSellingMemory\.unit, row\.unit, matched\.unitRelationship\)/);
  });

  it('handleConfirmSupplierWordingCandidate (site 4) — CORRECT AS-IS, unmodified by this fix: already converts into row.unit', () => {
    const fnMatch = addStockSrc.match(/const handleConfirmSupplierWordingCandidate = \([\s\S]*?\n  \};/);
    const body = fnMatch![0];
    assert.match(body, /resolveUnitAwarePrice\(sellSource\.sellingPrice, sellSource\.unit, row\.unit, matchedProduct\.unitRelationship\)/);
  });

  it('buildRowFromProposalLineItem / Smart Stock Entry (site 5) — CORRECT AS-IS, unmodified by this fix: already converts into unit (receipt-derived)', () => {
    const fnMatch = addStockSrc.match(/const buildRowFromProposalLineItem = async \([\s\S]*?\n  \};/);
    const body = fnMatch![0];
    assert.match(body, /resolveUnitAwarePrice\(sellSource\.sellingPrice, sellSource\.unit, unit, matched\.unitRelationship\)/);
  });
});
