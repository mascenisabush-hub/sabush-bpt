// Bug fix — Owner-reported, urgent, live with a client: "Pipoca Chipa,
// cost 200 MZN/Emb, 1 Emb = 50 Un, sells 5 MZN/Un" — an EXISTING
// product selected manually (not via the smart-scan/OCR path).
// Expected the selling row to show 250 (the correct per-Emb rate);
// instead saw 5 (the raw, unconverted per-Un price).
//
// ROOT CAUSE, one layer deeper than the two prior unit-conversion
// fixes (7afbecb, 5af6004): the row's own STARTING unit was never the
// product's own confirmed default purchase unit
// (unitRelationship.units[0], e.g. "Emb") — both createEmptyRow (a
// genuinely new row, typed/selected exact product name) and
// buildProductMemoryAutofill (the dropdown-select existing-product
// flow) fell straight to a GENERIC, product-agnostic category
// suggestion (getSuggestedUnitsForCategory, e.g. "un") whenever the
// row had no unit yet. Because the confirmed selling unit here also
// happens to be "Un", the generic default and the selling unit
// silently coincided, so resolveUnitAwarePrice's own "already same
// unit" fast path fired and the remembered per-Un price was never
// converted into per-Emb terms — worse than a display bug alone, this
// also meant the actual purchase quantity would have been recorded in
// the WRONG unit unless the Owner noticed and corrected it manually.
//
// FIX: both functions now prefer getDefaultUnit(product)
// (unitRelationship.units[0], the standing, Owner-confirmed purchase
// unit — BDR-0012 §5.A Item 4) before ever falling back to the generic
// category suggestion — but only when the row has no unit already
// (an OCR-detected or Owner-typed unit always still wins, unchanged).
//
// SCOPE NOTE: this repository has no DOM/React render harness (see
// tests/new-product-venda-auto-calculation.test.ts's own header). This
// suite follows the same two established techniques: (1) a direct
// fixture test against the real, imported getDefaultUnit/
// resolveUnitAwarePrice reproducing the Owner's own exact scenario,
// and (2) structural source-text assertions confirming both
// AddStockView.tsx call sites are wired correctly.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-existing-product-default-unit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { getDefaultUnit, isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import { resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('getDefaultUnit / resolveUnitAwarePrice — the Owner\'s own exact scenario (Pipoca Chipa)', () => {
  const relationship: UnitRelationship = {
    units: [
      { unit: 'Emb', factorFromPrevious: 1 },
      { unit: 'Un', factorFromPrevious: 50 },
    ],
    sellingUnit: 'Un',
    confirmedAt: '2026-09-14T10:00:00.000Z',
  };
  const product = { unitRelationship: relationship, sellingPrice: 5 };

  it('the product\'s own confirmed default purchase unit is "Emb", not a generic category suggestion', () => {
    assert.equal(getDefaultUnit(product), 'Emb');
  });

  it('once the row\'s unit correctly defaults to "Emb", the remembered per-Un price (5) converts to 250 (per-Emb)', () => {
    assert.ok(isValidUnitRelationship(relationship));
    const resolved = resolveUnitAwarePrice(5, 'Un', 'Emb', relationship);
    assert.equal(resolved, '250.00');
  });

  it('the OLD bug, reproduced: if the row\'s unit had incorrectly defaulted to "Un" (same as the selling unit), no conversion ever fires — the raw 5 stays unconverted', () => {
    const resolved = resolveUnitAwarePrice(5, 'Un', 'Un', relationship);
    assert.equal(resolved, '5'); // the exact wrong value the Owner reported seeing
  });
});

describe('AddStockView.tsx — wiring: both unit-default sites prefer the product\'s own confirmed default unit', () => {
  it('getDefaultUnit is imported from lib/unitRelationship', () => {
    const importLine = addStockSrc.split('\n').find((l) => l.includes("from '../lib/unitRelationship'"));
    assert.ok(importLine, 'Expected a unitRelationship.ts import line.');
    assert.match(importLine!, /getDefaultUnit/);
  });

  it('createEmptyRow prefers the matched product\'s confirmed default unit over the generic category suggestion', () => {
    const start = addStockSrc.indexOf('const createEmptyRow = (productName');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('return {', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /if \(isValidUnitRelationship\(match\.unitRelationship\)\) \{\s*initialUnit = getDefaultUnit\(match\) \|\| initialUnit;\s*\}/);
  });

  it('buildProductMemoryAutofill prefers getDefaultUnit(product) before the generic category suggestion, after the row\'s own existing unit', () => {
    const start = addStockSrc.indexOf('const buildProductMemoryAutofill = (product:');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /let newUnit = \(existingUnit && existingUnit\.trim\(\)\) \|\| getDefaultUnit\(product\) \|\| suggestedUnits\[0\] \|\| 'un';/);
  });
});
