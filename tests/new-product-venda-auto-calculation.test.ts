// Bug fix — Owner-reported: "having cost price autofilled by OCR, and
// quantity autofilled, unit and selling price/selected unit, the total
// can be auto-calculated". A genuinely new product previously required
// the Owner to fill in TWO separate, unreconciled selling-price concepts:
// the row's own transaction VENDA field (denominated in the purchase
// unit) and the new product's canonical "Preço de venda (por un)"
// (denominated in the selling unit, inside the relationship panel) — with
// VENDA staying blank and Lucro Estimado showing a confusing, fully
// negative figure even once a complete, valid relationship and price had
// been entered (reported live on production: "refresco 2l", 10 emb @ 550,
// 1 emb = 6 un @ 110/un, VENDA blank, Lucro Est. -5.500,00 MT).
//
// FIX: VENDA now auto-computes from the relationship panel's own
// factor/selling-unit/price the moment that configuration becomes
// complete and valid, reusing the existing, unmodified Concept C rate
// arithmetic (computeRatePerPurchaseUnit) — the exact formula the §47/
// FR-99 worked example itself uses. Never overwrites a manually-typed
// VENDA (same sellingPriceAutoFilled discipline every other auto-fill in
// this file already follows).
//
// SCOPE NOTE: this repository has no DOM/React render harness. This
// suite follows the two established techniques: (1) direct fixture tests
// against the real, imported computeRatePerPurchaseUnit/
// isValidUnitRelationship proving the arithmetic reproduces the exact
// screenshot scenario, and (2) structural source-text assertions
// confirming AddStockView.tsx's wiring (the render call site and
// handleUnitChange) actually calls the new auto-fill path.
//
// HOW TO RUN:
//   npx tsx --test tests/new-product-venda-auto-calculation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeRatePerPurchaseUnit } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

function sliceBetween(source: string, startAnchor: string, endAnchor: string): string {
  const start = source.indexOf(startAnchor);
  assert.notEqual(start, -1, `expected to find start anchor: ${startAnchor}`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  assert.notEqual(end, -1, `expected to find end anchor: ${endAnchor}`);
  return source.slice(start, end);
}

// ==================================================================
// A — Reproduces the exact reported production scenario
// ==================================================================
describe('A — reproduces the exact reported scenario: "refresco 2l", 10 emb @ 550, 1 emb = 6 un @ 110/un', () => {
  it('the relationship (purchase unit "emb", 1 emb = 6 un, selling unit "un") is valid', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'emb', factorFromPrevious: 0 },
        { unit: 'un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'un',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), true);
  });

  it('VENDA (rate per purchase unit "emb") computes to 660 MZN/emb — the exact figure that turns Lucro Estimado from -5.500,00 MT into +1.100,00 MT for 10 emb @ 550', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'emb', factorFromPrevious: 0 },
        { unit: 'un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'un',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    const rate = computeRatePerPurchaseUnit(candidate, 'emb', 'un', 110);
    assert.equal(rate, 660);

    const quantity = 10;
    const costPerEmb = 550;
    const totalCost = quantity * costPerEmb;
    const totalSell = quantity * (rate as number);
    assert.equal(totalCost, 5500);
    assert.equal(totalSell, 6600);
    assert.equal(totalSell - totalCost, 1100);
  });
});

// ==================================================================
// B — AddStockView.tsx wiring: the relationship panel's own inputs and
// handleUnitChange both route through the new auto-fill path
// ==================================================================
describe('B — AddStockView.tsx wiring', () => {
  it('computeNewProductRowSellingPrice is a pure, module-level function that never fabricates a value for an incomplete configuration', () => {
    assert.match(addStockSrc, /function computeNewProductRowSellingPrice\(/);
    assert.match(addStockSrc, /if \(!trimmedSellingUnit \|\| !Number\.isFinite\(numFactor\) \|\| numFactor <= 0\) return undefined;/);
    assert.match(addStockSrc, /if \(sellingUnitPrice\.trim\(\) === '' \|\| !Number\.isFinite\(numPrice\) \|\| numPrice < 0\) return undefined;/);
    assert.match(addStockSrc, /if \(!isValidUnitRelationship\(candidate\)\) return undefined;/);
  });

  it('applyNewProductRelationshipChange never overwrites a manually-typed VENDA (sellingPriceAutoFilled === false)', () => {
    const body = sliceBetween(
      addStockSrc,
      'const applyNewProductRelationshipChange = (',
      'updateRow(rowId, updates);\n  };'
    );
    assert.match(body, /if \(row && row\.sellingPriceAutoFilled !== false\) \{/);
  });

  it('applyNewProductRelationshipChange marks a freshly-computed VENDA as sellingPriceAutoFilled: true, with its basis unit set to the purchase unit', () => {
    const body = sliceBetween(
      addStockSrc,
      'const applyNewProductRelationshipChange = (',
      'updateRow(rowId, updates);\n  };'
    );
    assert.match(body, /updates\.sellingPriceAutoFilled = true;/);
    assert.match(body, /updates\.sellingPriceBasisUnit = \(purchaseUnit \|\| 'un'\)\.trim\(\);/);
  });

  it('the relationship panel\'s onChange (factor/selling unit) routes through applyNewProductRelationshipChange, not a bare updateRow', () => {
    const renderSite = sliceBetween(addStockSrc, '<UnitRelationshipRow', '/>');
    assert.match(renderSite, /onChange=\{\(sellingUnit, factor\) =>\s*\n\s*applyNewProductRelationshipChange\(/);
    assert.match(renderSite, /newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor \}/);
  });

  it('the relationship panel\'s onSellingUnitPriceChange also routes through applyNewProductRelationshipChange', () => {
    const renderSite = sliceBetween(addStockSrc, '<UnitRelationshipRow', '/>');
    assert.match(renderSite, /onSellingUnitPriceChange=\{\(price\) =>\s*\n\s*applyNewProductRelationshipChange\(/);
    assert.match(renderSite, /newProductSellingUnitPrice: price \}/);
  });

  it('handleUnitChange recomputes VENDA for a genuinely new product (!matched) only, never touching the existing-product branch above it', () => {
    const body = sliceBetween(addStockSrc, 'const handleUnitChange = (rowId: string, newUnit: string) => {', 'updateRow(rowId, updates);\n  };');
    assert.match(body, /if \(!matched && row\.sellingPriceAutoFilled !== false\) \{/);
    // The existing-product branch (Track A) remains completely unmodified
    // — same guard, same call, same comment anchor, still present and
    // still BEFORE the new branch.
    const existingBranchIdx = body.indexOf('if (row.sellingPriceAutoFilled && row.sellingPrice !== \'\') {');
    const newBranchIdx = body.indexOf('if (!matched && row.sellingPriceAutoFilled !== false) {');
    assert.notEqual(existingBranchIdx, -1);
    assert.notEqual(newBranchIdx, -1);
    assert.ok(existingBranchIdx < newBranchIdx);
  });

  it('handleUnitChange\'s new-product branch calls computeNewProductRowSellingPrice with the NEW unit as the purchase unit — VENDA stays in sync if the Owner corrects the purchase unit after already configuring the relationship', () => {
    const body = sliceBetween(addStockSrc, 'const handleUnitChange = (rowId: string, newUnit: string) => {', 'updateRow(rowId, updates);\n  };');
    assert.match(
      body,
      /computeNewProductRowSellingPrice\(\s*\n\s*newUnit,\s*\n\s*row\.newProductSellingUnit \|\| '',\s*\n\s*row\.newProductSellingUnitFactor \|\| '',\s*\n\s*row\.newProductSellingUnitPrice \|\| ''\s*\n\s*\)/
    );
  });
});
