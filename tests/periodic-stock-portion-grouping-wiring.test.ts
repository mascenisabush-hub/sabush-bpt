// Increment B, Checkpoint B6 — source-level regression guards for
// PeriodicStockCountView.tsx (Consolidated Specification §17).
//
// SCOPE: this repository has no React/DOM test harness (see
// tests/initial-stock-portion-grouping-wiring.test.ts's own precedent,
// which this suite mirrors, adapted for Periodic Contagem's two-row-
// loop [catalogRows/manualRows] model instead of Initial Stock's flat
// array). These tests inspect the component's SOURCE TEXT to prove
// structural guarantees the pure-function tests
// (periodic-stock-multi-portion-valuation.test.ts,
// stock-count-portion-grouping.test.ts) cannot: that the shared B5
// grouping helper is wired into BOTH row loops, that no duplicate-
// detection machinery exists or was added, that the draft/finalization
// pipeline this checkpoint was explicitly forbidden from touching is
// in fact untouched, and that nothing couples this surface to Add
// Stock/Smart Stock Entry/derivedSellingValuation/Business Worth.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-portion-grouping-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('PeriodicStockCountView.tsx — B6 portion-grouping wiring (reuses B5\'s shared helper)', () => {
  it('imports computePortionLabels from the SAME shared helper Checkpoint B5 introduced — no duplicate module', () => {
    // [Business Worth Evolution — Decision 37, B.3] The import line now
    // also brings in groupRowsByProductName (B.3's own reuse of the
    // SAME shared module — see the updated describe block below) —
    // this assertion is relaxed to confirm computePortionLabels is
    // still imported from the correct shared file, regardless of what
    // else shares that import line, rather than requiring an exact,
    // single-symbol import statement that predates B.3.
    assert.match(source, /import\s*\{[^}]*\bcomputePortionLabels\b[^}]*\}\s*from\s*'\.\.\/lib\/stockCountPortionGrouping'/);
  });

  it('computes portionLabels once, combining visible catalog rows and manual rows (both halves of this surface\'s working-row model)', () => {
    assert.match(source, /computePortionLabels\(rowsForGrouping\)/);
    assert.match(source, /visibleCatalogEntries\.map\(\(\[productId, row\]\)/);
    assert.match(source, /manualRows\.map\(\(row, idx\) => \(\{ id: `manual-\$\{idx\}`/);
  });

  it('renders the multi-portion label conditioned on isMultiPortion in BOTH the catalog-row loop and the manual-row loop, not unconditionally', () => {
    const occurrences = source.match(/portionLabel\.isMultiPortion\s*&&/g) ?? [];
    assert.equal(occurrences.length, 2, 'expected exactly one conditional label in the catalog loop and one in the manual loop');
  });
});

describe('PeriodicStockCountView.tsx — requirement 5/no duplicate-product detection', () => {
  it('does not import or reference any supplier-wording candidate-detection machinery', () => {
    assert.doesNotMatch(source, /supplierWordingCandidates/);
    assert.doesNotMatch(source, /detectSupplierWordingCandidates/);
    assert.doesNotMatch(source, /resolveSupplierWordingRecognition/);
    assert.doesNotMatch(source, /POL-0003/);
  });

  it('isGenuinelyNewProductName only checks against the live product catalog, never against catalogRows/manualRows siblings', () => {
    const fnMatch = source.match(/const isGenuinelyNewProductName[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find isGenuinelyNewProductName function body');
    const fnBody = fnMatch![0];
    assert.match(fnBody, /products\.some/);
    assert.doesNotMatch(fnBody, /catalogRows/);
    assert.doesNotMatch(fnBody, /manualRows/);
  });

  it('a manually-added row is never assigned a productId merely because its typed name matches an existing catalog product', () => {
    // createManualRow always starts productId undefined; updateManualRow
    // must never set it as a side effect of a productName edit — that
    // would silently collapse this into duplicate-detection/auto-
    // resolution behavior this checkpoint must not introduce.
    //
    // [FR-89–FR-94, Implementation Authorization §2 items 3–4] Narrowed
    // from a bare `/productId/` substring ban to an assignment-specific
    // pattern: updateManualRow now legitimately READS currentRow.productId
    // (to resolve the row's own associated product for the deliberate-
    // vs-default selling-configuration rules, §6.1) without ever WRITING
    // it onto the row — this assertion's own original comment already
    // states the actual property being protected is "never set," not
    // "never read," so the check is corrected to test that directly.
    const updateManualRowMatch = source.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    assert.ok(updateManualRowMatch, 'expected to find updateManualRow');
    assert.doesNotMatch(updateManualRowMatch![0], /productId:\s|\.productId\s*=/, 'updateManualRow must never assign/write productId, though reading it to resolve the row\'s own product is permitted');
  });
});

describe('PeriodicStockCountView.tsx — requirement: draft/finalization pipeline untouched', () => {
  it('handleResumeDraft still branches on item.productId to route each portion to the correct array — the exact mechanism that lets multiple portions of one product resurrect without colliding', () => {
    assert.match(source, /if \(item\.productId\)\s*\{\s*\n\s*nextCatalogRows\[item\.productId\] = row;\s*\n\s*\}\s*else\s*\{\s*\n\s*nextManualRows\.push\(row\);/);
  });

  it('allWorkingRows still combines catalogRows and manualRows with no product-level grouping/merging step', () => {
    const match = source.match(/const allWorkingRows: StockCountWorkingRow\[\] = useMemo\(\s*\n\s*\(\) => \[([\s\S]*?)\],/);
    assert.ok(match, 'expected to find allWorkingRows computation');
    assert.match(match![1], /Object\.values\(catalogRows\)/);
    assert.match(match![1], /\.\.\.manualRows/);
    // Must NOT reference the grouping helper — presentation must never
    // feed back into what gets tallied.
    assert.doesNotMatch(match![1], /computePortionLabels/);
    assert.doesNotMatch(match![1], /portionLabel/);
  });

  it('workingRowToDraftItem/draftItemToWorkingRow are still imported unchanged from stockCount.ts — no local override or wrapper introduced', () => {
    assert.match(source, /import\s*\{[^}]*workingRowToDraftItem[^}]*draftItemToWorkingRow[^}]*\}\s*from\s*'\.\.\/utils\/stockCount'/);
  });

  it('liveTally still uses the existing, unmodified tallyStockCountRows as its single source of truth', () => {
    // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67]
    // tallyStockCountRows now also accepts the optional
    // costBasisByProductName parameter (utils/stockCount.ts) — the
    // SAME shared resolver AppContext.tsx's own persistence path uses
    // (buildProductCostBasisMap), so the Owner-facing preview and the
    // persisted Contagem can never disagree. This regex is updated to
    // match that authorized second argument; the invariant this test
    // protects — that `allWorkingRows` (unfiltered, ungrouped) remains
    // the sole FIRST argument / source of truth — is unchanged.
    //
    // [Bug fix — cost total stayed 0,00 for a genuinely new multi-unit
    // product's non-purchase-unit portions] The second argument is now
    // `effectiveCostBasisByProductName` (a merge of the catalog-only
    // costBasisByProductName above PLUS a synthesized basis for any
    // genuinely-new product with a complete newProductInfo relationship
    // + purchase cost) rather than the catalog-only map directly — see
    // that variable's own declaration comment for the full explanation.
    // tallyStockCountRows itself is still the SAME unmodified function,
    // called with the SAME allWorkingRows as its first argument; only
    // the label of the second argument changed to reflect that it is
    // now a merged, not catalog-only, cost basis source.
    assert.match(source, /tallyStockCountRows\(allWorkingRows, effectiveCostBasisByProductName\)/);
  });

  it('does not introduce any new "expected"/second valuation field anywhere in the view', () => {
    assert.doesNotMatch(source, /expectedQuantity/i);
    assert.doesNotMatch(source, /item\.expected/i);
  });
});

describe('PeriodicStockCountView.tsx — no Add Stock / Smart Stock Entry / §19 / Business Worth coupling', () => {
  it('does not import from AddStockView or any Smart Stock Entry module', () => {
    assert.doesNotMatch(source, /from '\.\/AddStockView'/);
    assert.doesNotMatch(source, /smartStockEntry/i);
    assert.doesNotMatch(source, /receiptSequencing/);
  });

  it('never references StockBatch.derivedSellingValuation, calculateDerivedTransactionValuation, or calculateBatch', () => {
    assert.doesNotMatch(source, /derivedSellingValuation/);
    assert.doesNotMatch(source, /calculateDerivedTransactionValuation/);
    assert.doesNotMatch(source, /calculateBatch/);
  });

  it('does not introduce any selling-basis Initial Capital figure (§19 remains excluded)', () => {
    assert.doesNotMatch(source, /sellingBasisCapital/i);
    assert.doesNotMatch(source, /capitalInicialVenda/i);
  });
});

describe('stockCountPortionGrouping.ts — confirms the B5 helper was reused, not forked', () => {
  const helperSource = readFileSync(
    new URL('../apps/tenant/src/lib/stockCountPortionGrouping.ts', import.meta.url),
    'utf-8'
  );

  it('still exports computePortionLabels, unchanged, alongside whatever else the shared file has since gained', () => {
    // [Grouped Initial Stock UX; extended by Decision 37, B.3]
    // computePortionLabels — the function B6 originally introduced —
    // remains present and unmodified. groupRowsByProductName (also
    // exported here) was originally added for
    // InitialStockCountView.tsx's own later grouped redesign, and is
    // now ALSO used by PeriodicStockCountView.tsx (B.3, below) — a
    // second CONSUMER of the same, still-unforked, still-unmodified
    // shared function, exactly matching this file's own header comment
    // discipline ("no new grouping RULE, only a new output SHAPE").
    const exportedFunctionNames = [...helperSource.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
    assert.ok(exportedFunctionNames.includes('computePortionLabels'));
    assert.ok(exportedFunctionNames.includes('groupRowsByProductName'));
  });

  it('PeriodicStockCountView.tsx now reuses groupRowsByProductName, unmodified, for Decision 37 B.3 (Multiple Current-Stock Portions + first-class "+ Adicionar Porção")', () => {
    // [SUPERSEDES a prior B6-era assertion that PeriodicStockCountView.tsx
    // never referenced groupRowsByProductName.] That assertion recorded
    // an accurate, but explicitly point-in-time, fact: as of Checkpoint
    // B6, Periodic Contagem had not yet adopted the Grouped Initial
    // Stock UX pattern. Decision 37/B.3 (Rule 8 Finding FT-3;
    // Implementation Plan Amendment §B.3; Implementation Authorization
    // §36) is the separately-authorized, later work that deliberately
    // changes this — porting the SAME, unmodified groupRowsByProductName
    // function into PeriodicStockCountView.tsx's own manual-row
    // rendering, exactly as FT-3 anticipated ("directly portable to
    // Periodic Contagem"). This test now asserts the opposite of its
    // original form: the reference IS present, and stockCountPortionGrouping.ts
    // itself required zero modification to support it (confirmed by the
    // test immediately above).
    assert.match(source, /groupRowsByProductName/);
  });
});
