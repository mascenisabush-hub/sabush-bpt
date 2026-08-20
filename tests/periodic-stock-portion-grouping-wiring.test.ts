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
    assert.match(source, /import\s*\{\s*computePortionLabels\s*\}\s*from\s*'\.\.\/lib\/stockCountPortionGrouping'/);
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
    const updateManualRowMatch = source.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    assert.ok(updateManualRowMatch, 'expected to find updateManualRow');
    assert.doesNotMatch(updateManualRowMatch![0], /productId/);
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
    assert.match(source, /tallyStockCountRows\(allWorkingRows\)/);
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

  it('exports exactly one grouping function, computePortionLabels — no Periodic-Contagem-specific variant was added', () => {
    const exportedFunctionNames = [...helperSource.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
    assert.deepEqual(exportedFunctionNames, ['computePortionLabels']);
  });
});
