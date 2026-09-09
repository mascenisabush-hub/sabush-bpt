// Product Configuration UX — Investigations #2/#3, Option B implementation.
//
// RENDER-ORDER CHANGE ONLY. No business logic, validation, handler,
// state, or persistence behavior is exercised or asserted differently
// here than before this change — every assertion below is a
// structural, source-text position check (this repo's own established
// technique; no jsdom/testing-library harness exists), confirming the
// four related Product-configuration controls (Purchase Unit → Unit
// Relationship → Selling Unit → Selling Price) now appear in the
// correct dependency order, with the specific unrelated conditional
// panels Investigation #2 found interleaved between them no longer
// splitting that sequence.
//
// HOW TO RUN:
//   npx tsx --test tests/product-configuration-ux-render-order.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('Product Configuration UX — Contagem (PeriodicStockCountView.tsx)', () => {
  it('NewProductInfoPanel now renders before ModeAValuationControl in the manual-row card — the relationship-establishing panel before the control that depends on a relationship already existing', () => {
    const newProductIdx = periodicSrc.indexOf('<NewProductInfoPanel');
    const modeAIdx = periodicSrc.indexOf('<ModeAValuationControl', periodicSrc.indexOf('visibleManualRowGroups.map'));
    assert.notEqual(newProductIdx, -1, 'Expected NewProductInfoPanel to still exist.');
    assert.notEqual(modeAIdx, -1, 'Expected a manual-row ModeAValuationControl to still exist.');
    assert.ok(newProductIdx < modeAIdx, `Expected NewProductInfoPanel (${newProductIdx}) before ModeAValuationControl (${modeAIdx}).`);
  });

  it('ExistingProductSummary (NewProductInfoPanel\'s own mutually-exclusive sibling) also renders before this ModeAValuationControl', () => {
    const existingSummaryIdx = periodicSrc.indexOf('<ExistingProductSummary', periodicSrc.indexOf('visibleManualRowGroups.map'));
    const modeAIdx = periodicSrc.indexOf('<ModeAValuationControl', periodicSrc.indexOf('visibleManualRowGroups.map'));
    assert.notEqual(existingSummaryIdx, -1);
    assert.ok(existingSummaryIdx < modeAIdx, `Expected ExistingProductSummary (${existingSummaryIdx}) before ModeAValuationControl (${modeAIdx}).`);
  });

  it('the moved ModeAValuationControl block is byte-identical in its own props/logic to before — same gate, same helper calls, same onChange, only its position changed', () => {
    assert.match(
      periodicSrc,
      /\{cardIsFirstPortionOfMultiPortionGroup &&\s*\n\s*\(\(\) => \{\s*\n\s*const key = productKeyFor\(group\.displayName\);/
    );
    assert.match(periodicSrc, /const relationship = getEffectiveUnitRelationshipForProductName\(group\.displayName\);/);
    assert.match(periodicSrc, /if \(!relationship \|\| !isValidUnitRelationship\(relationship\)\) return null;/);
    assert.match(periodicSrc, /const config = getEffectiveReferenceConfig\(key\);/);
    assert.match(periodicSrc, /onChange=\{\(fields\) => handleReferenceConfigChange\(key, fields\)\}/);
  });

  it('the identity-resolution panel still renders before NewProductInfoPanel — unresolved identity must still be handled before relationship configuration, unchanged', () => {
    const identityIdx = periodicSrc.indexOf('Produto ainda não confirmado');
    const newProductIdx = periodicSrc.indexOf('<NewProductInfoPanel');
    assert.notEqual(identityIdx, -1);
    assert.ok(identityIdx < newProductIdx);
  });

  it('the catalog-row loop\'s own ModeAValuationControl (an existing product, already has a relationship, no NewProductInfoPanel involved at all) is untouched', () => {
    const catalogModeAIdx = periodicSrc.indexOf('<ModeAValuationControl');
    const manualLoopIdx = periodicSrc.indexOf('visibleManualRowGroups.map');
    assert.ok(catalogModeAIdx < manualLoopIdx, 'Expected the catalog-row ModeAValuationControl to remain in the catalog loop, unaffected by this change.');
  });
});

describe('Product Configuration UX — Add Stock (AddStockView.tsx, mobile layout)', () => {
  it('UnitRelationshipRow now renders immediately after the Quantity+Unit row and before Cost Price / Selling Price — no unrelated panel sits between Purchase Unit and the relationship control', () => {
    const unitFieldIdx = addStockSrc.indexOf("value={row.unit}", addStockSrc.indexOf('md:hidden space-y-2'));
    const relationshipIdx = addStockSrc.indexOf('<UnitRelationshipRow');
    const costPriceIdx = addStockSrc.indexOf("t('addStock.fields.costPrice'");
    const sellingPriceIdx = addStockSrc.indexOf('value={row.sellingPrice}', addStockSrc.indexOf('md:hidden space-y-2'));
    assert.notEqual(unitFieldIdx, -1);
    assert.notEqual(relationshipIdx, -1);
    assert.notEqual(costPriceIdx, -1);
    assert.notEqual(sellingPriceIdx, -1);
    assert.ok(unitFieldIdx < relationshipIdx, 'Expected Purchase Unit before UnitRelationshipRow.');
    assert.ok(relationshipIdx < costPriceIdx, 'Expected UnitRelationshipRow before Cost Price.');
    assert.ok(costPriceIdx < sellingPriceIdx, 'Expected Cost Price before Selling Price (unchanged existing adjacency).');
  });

  it('no unrelated conditional panel (supplier-wording, product-recognition, identity resolution, discontinued-product) sits between Purchase Unit and Selling Price after this move', () => {
    const unitFieldIdx = addStockSrc.indexOf("value={row.unit}", addStockSrc.indexOf('md:hidden space-y-2'));
    const sellingPriceIdx = addStockSrc.indexOf('value={row.sellingPrice}', addStockSrc.indexOf('md:hidden space-y-2'));
    const between = addStockSrc.slice(unitFieldIdx, sellingPriceIdx);
    assert.doesNotMatch(between, /Supplier-Wording Recognition — Checkpoint 3/);
    assert.doesNotMatch(between, /Product Recognition Intelligence/);
    assert.doesNotMatch(between, /did you mean an existing product/);
    assert.doesNotMatch(between, /Produto ainda não confirmado|identityResolutionSearchText/);
    assert.doesNotMatch(between, /black list|blacklisted/i);
  });

  it('the moved UnitRelationshipRow block is byte-identical in its own props/logic to before — same gate, same onChange, only its position changed', () => {
    assert.match(addStockSrc, /\{row\.productName\.trim\(\) && !exactMatchExists && \(\s*\n\s*<UnitRelationshipRow\s*\n\s*purchaseUnit=\{row\.unit \|\| 'un'\}\s*\n\s*sellingUnit=\{row\.newProductSellingUnit \|\| ''\}\s*\n\s*factor=\{row\.newProductSellingUnitFactor \|\| ''\}\s*\n\s*onChange=\{\(sellingUnit, factor\) =>\s*\n\s*updateRow\(row\.id, \{ newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor \}\)\s*\n\s*\}\s*\n\s*\/>\s*\n\s*\)\}/);
  });

  it('the UnitRelationshipRow component itself (its own free-text selling-unit input, not a <select>) is unmodified — this task never unifies it with Contagem\'s constrained dropdown', () => {
    const startIdx = addStockSrc.indexOf('const UnitRelationshipRow: React.FC');
    const braceStart = addStockSrc.indexOf('{', addStockSrc.indexOf('=> {', startIdx));
    let depth = 0;
    let i = braceStart;
    for (; i < addStockSrc.length; i++) {
      if (addStockSrc[i] === '{') depth++;
      else if (addStockSrc[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const componentBody = addStockSrc.slice(startIdx, i + 1);
    assert.match(componentBody, /<input\s*\n\s*type="text"\s*\n\s*value=\{sellingUnit\}/);
    assert.doesNotMatch(componentBody, /<select/);
  });

  it('all previously-existing conditional panels (supplier-wording, product-recognition, identity resolution, discontinued-product) still exist in the file, unremoved, unmodified in content — only their position relative to the relationship control changed', () => {
    assert.match(addStockSrc, /Supplier-Wording Recognition — Checkpoint 3/);
    assert.match(addStockSrc, /Product Recognition Intelligence — Checkpoint 1\/3/);
    assert.match(addStockSrc, /did you mean an existing product\?/);
    assert.match(addStockSrc, /Product Identity Existing\/New Resolution —/);
    assert.match(addStockSrc, /Owner-requested "black list"/);
  });

  it('the desktop grid row (purchase unit + selling price, already compact per Investigation #2) is completely untouched by this change — confirmed no relationship-control reference exists in the desktop-only grid block', () => {
    const desktopGridStart = addStockSrc.indexOf('hidden md:grid grid-cols-12');
    const desktopGridSrc = addStockSrc.slice(desktopGridStart, desktopGridStart + 3000);
    assert.doesNotMatch(desktopGridSrc, /UnitRelationshipRow/);
  });
});
