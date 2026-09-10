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
  it('[Superseded by the Desktop Parity Correction follow-up, below] UnitRelationshipRow no longer sits between Purchase Unit and Cost/Selling Price on mobile — it now renders once, in the shared section, after both — see the dedicated "Desktop Add Stock Unit-Relationship Parity Correction" suite below for the current, correct invariant and the disclosed trade-off this represents', () => {
    const unitFieldIdx = addStockSrc.indexOf("value={row.unit}", addStockSrc.indexOf('md:hidden space-y-2'));
    const relationshipIdx = addStockSrc.indexOf('<UnitRelationshipRow');
    const costPriceIdx = addStockSrc.indexOf("t('addStock.fields.costPrice'");
    const sellingPriceIdx = addStockSrc.indexOf('value={row.sellingPrice}', addStockSrc.indexOf('md:hidden space-y-2'));
    assert.notEqual(unitFieldIdx, -1);
    assert.notEqual(relationshipIdx, -1);
    assert.notEqual(costPriceIdx, -1);
    assert.notEqual(sellingPriceIdx, -1);
    assert.ok(unitFieldIdx < costPriceIdx, 'Expected Purchase Unit before Cost Price.');
    assert.ok(costPriceIdx < sellingPriceIdx, 'Expected Cost Price before Selling Price (unchanged existing adjacency).');
    assert.ok(sellingPriceIdx < relationshipIdx, 'Expected UnitRelationshipRow now to render after Selling Price, in the shared section — the Desktop Parity Correction\'s own disclosed trade-off.');
  });

  it('no unrelated conditional panel sits between Purchase Unit and Cost/Selling Price — that part of Investigation #2\'s original finding still holds, independent of where the relationship control itself now renders', () => {
    const unitFieldIdx = addStockSrc.indexOf("value={row.unit}", addStockSrc.indexOf('md:hidden space-y-2'));
    const sellingPriceIdx = addStockSrc.indexOf('value={row.sellingPrice}', addStockSrc.indexOf('md:hidden space-y-2'));
    const between = addStockSrc.slice(unitFieldIdx, sellingPriceIdx);
    assert.doesNotMatch(between, /Supplier-Wording Recognition — Checkpoint 3/);
    assert.doesNotMatch(between, /Product Recognition Intelligence/);
    assert.doesNotMatch(between, /did you mean an existing product/);
    assert.doesNotMatch(between, /Produto ainda não confirmado|identityResolutionSearchText/);
    assert.doesNotMatch(between, /black list|blacklisted/i);
  });

  it('the moved UnitRelationshipRow block retains its core props/logic from before — same gate, same purchaseUnit/sellingUnit/factor wiring into the same updateRow-driving fields, only its position changed, plus (Track B §47, and this bugfix) the independent sellingUnitPrice pairing and the applyNewProductRelationshipChange wrapper that keeps VENDA in sync — checked structurally rather than as one brittle byte-exact block, since this component legitimately keeps growing new, independently-scoped props', () => {
    const relIdx = addStockSrc.indexOf('<UnitRelationshipRow');
    const gateIdx = addStockSrc.lastIndexOf('{row.productName.trim() && !exactMatchExists && (', relIdx);
    assert.notEqual(gateIdx, -1);
    assert.notEqual(relIdx, -1);
    assert.ok(relIdx > gateIdx && relIdx - gateIdx < 200, 'Expected <UnitRelationshipRow> to render immediately inside the same identity/exact-match gate as before.');

    const closeIdx = addStockSrc.indexOf('/>', relIdx);
    const block = addStockSrc.slice(relIdx, closeIdx);
    assert.match(block, /purchaseUnit=\{row\.unit \|\| 'un'\}/);
    assert.match(block, /sellingUnit=\{row\.newProductSellingUnit \|\| ''\}/);
    assert.match(block, /factor=\{row\.newProductSellingUnitFactor \|\| ''\}/);
    assert.match(block, /newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor \}/);
    assert.match(block, /sellingUnitPrice=\{row\.newProductSellingUnitPrice \|\| ''\}/);
    assert.match(block, /newProductSellingUnitPrice: price \}/);
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

describe('Desktop Add Stock Unit-Relationship Parity Correction (follow-up to dcd84be)', () => {
  it('[Requirement A] UnitRelationshipRow is invoked exactly once in the whole file — no duplicate control', () => {
    const callCount = (addStockSrc.match(/<UnitRelationshipRow\b/g) || []).length;
    assert.equal(callCount, 1, `Expected exactly one <UnitRelationshipRow> invocation, found ${callCount}.`);
  });

  it('[Requirement B] the single invocation is NOT inside the md:hidden mobile-only block', () => {
    const mobileStart = addStockSrc.indexOf('md:hidden space-y-2 text-xs');
    const mobileEnd = addStockSrc.indexOf('UX — Desktop Add Stock Unit-Relationship');
    assert.notEqual(mobileStart, -1);
    assert.notEqual(mobileEnd, -1);
    assert.ok(mobileStart < mobileEnd, 'Expected the mobile block to end before the new shared-section comment begins.');
    const mobileBlockSrc = addStockSrc.slice(mobileStart, mobileEnd);
    assert.doesNotMatch(mobileBlockSrc, /<UnitRelationshipRow\b/);
  });

  it('[Requirement C] the single invocation IS inside the shared section — positioned before Supplier-Wording Recognition, the section\'s own first existing sibling panel, confirming it renders from the same location already proven to appear on both desktop and mobile', () => {
    const relationshipIdx = addStockSrc.indexOf('<UnitRelationshipRow');
    // The literal text "Supplier-Wording Recognition — Checkpoint 3"
    // also appears earlier in the file, in unrelated handler-level
    // comments (confirmed: lines ~1513, ~2307) — searching from AFTER
    // the relationship control's own position finds the actual JSX
    // sibling panel in the shared section, not an unrelated earlier
    // mention.
    const supplierWordingIdx = addStockSrc.indexOf('Supplier-Wording Recognition — Checkpoint 3', relationshipIdx);
    assert.notEqual(relationshipIdx, -1);
    assert.notEqual(supplierWordingIdx, -1);
    assert.ok(relationshipIdx < supplierWordingIdx, 'Expected UnitRelationshipRow to render before Supplier-Wording Recognition, both within the shared section.');
  });

  it('[Requirement C, continued] the desktop grid row itself was not modified to add a new cell for this control — the shared section, not the grid, is what now provides desktop access', () => {
    const desktopGridStart = addStockSrc.indexOf('hidden md:grid grid-cols-12');
    const desktopGridSrc = addStockSrc.slice(desktopGridStart, desktopGridStart + 3000);
    assert.doesNotMatch(desktopGridSrc, /UnitRelationshipRow/);
  });

  it('[Requirement D] mobile behavior remains intact: Purchase Unit, Cost Price, and Selling Price fields are all still present, unmodified, in the mobile-only block, in their own existing relative order', () => {
    const mobileStart = addStockSrc.indexOf('md:hidden space-y-2 text-xs');
    const mobileEnd = addStockSrc.indexOf('UX — Desktop Add Stock Unit-Relationship');
    const mobileBlockSrc = addStockSrc.slice(mobileStart, mobileEnd);
    const unitIdx = mobileBlockSrc.indexOf('value={row.unit}');
    const costIdx = mobileBlockSrc.indexOf("t('addStock.fields.costPrice'");
    const sellIdx = mobileBlockSrc.indexOf('value={row.sellingPrice}');
    assert.notEqual(unitIdx, -1);
    assert.notEqual(costIdx, -1);
    assert.notEqual(sellIdx, -1);
    assert.ok(unitIdx < costIdx && costIdx < sellIdx, 'Expected Purchase Unit -> Cost Price -> Selling Price to remain in this order on mobile.');
  });

  it('[Requirement E] no desktop-specific duplicate UnitRelationship implementation was introduced — no new component, no new state field, no new handler; the same purchaseUnit/sellingUnit/factor props flow into the same row fields as before, plus (Track B §47, and this bugfix) the independent sellingUnitPrice pairing and the applyNewProductRelationshipChange wrapper — checked structurally, not as one brittle byte-exact block', () => {
    assert.doesNotMatch(addStockSrc, /UnitRelationshipRowDesktop|DesktopUnitRelationship|UnitRelationshipCell/);
    const relIdx = addStockSrc.indexOf('<UnitRelationshipRow');
    const closeIdx = addStockSrc.indexOf('/>', relIdx);
    const block = addStockSrc.slice(relIdx, closeIdx);
    assert.match(block, /purchaseUnit=\{row\.unit \|\| 'un'\}/);
    assert.match(block, /sellingUnit=\{row\.newProductSellingUnit \|\| ''\}/);
    assert.match(block, /factor=\{row\.newProductSellingUnitFactor \|\| ''\}/);
    assert.match(block, /newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor \}/);
  });

  it('the UnitRelationshipRow component definition itself is unmodified — same free-text selling-unit input, not converted to a select, not touched by this correction', () => {
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

  it('PeriodicStockCountView.tsx (Contagem) is untouched by this correction', () => {
    assert.doesNotMatch(periodicSrc, /Desktop Add Stock Unit-Relationship Parity Correction/);
  });
});
