// Increment B, Checkpoint B5, extended by the Grouped Initial Stock UX
// checkpoint — source-level regression guards for
// InitialStockCountView.tsx (Consolidated Specification §16).
//
// SCOPE: this repository has no React/DOM test harness (see
// stock-count-simplification.test.ts's own "PeriodicStockCountView.tsx
// — source-level wiring guards" precedent, which this suite mirrors
// exactly). These tests inspect the component's SOURCE TEXT to prove
// specific structural guarantees the pure-function tests
// (stock-count-portion-grouping.test.ts, stock-count-row-grouping.test.ts)
// cannot: that the grouping helper is actually wired in, that no
// supplier-wording/duplicate-candidate machinery exists on this
// surface, and that nothing about the existing valuation/totals
// computation was touched.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-portion-grouping-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('InitialStockCountView.tsx — Grouped Initial Stock UX wiring', () => {
  it('imports and uses groupRowsByProductName from the shared grouping helper', () => {
    assert.match(source, /import\s*\{\s*groupRowsByProductName\s*\}\s*from\s*'\.\.\/lib\/stockCountPortionGrouping'/);
    assert.match(source, /groupRowsByProductName\(rows\)/);
  });

  it('the product name field is rendered once per group (group.displayName), not once per row (row.productName)', () => {
    assert.match(source, /value=\{group\.displayName\}/);
    // The old B5-era per-row name binding must be gone — every name
    // field in the grouped renderer reads from the group, never
    // directly from a bare `row.productName` value binding.
    assert.doesNotMatch(source, /value=\{row\.productName\}/);
  });

  it('renders a distinct nested portion list only for a group with more than one row (isSolo gate)', () => {
    assert.match(source, /const isSolo = group\.rows\.length === 1;/);
    assert.match(source, /\{!isSolo &&/);
  });

  it('provides an "add portion" action scoped to an existing, named group', () => {
    assert.match(source, /handleAddPortion/);
    assert.match(source, /\{group\.key &&/); // never offered for a still-blank/unnamed group
  });

  it('provides a "remove whole group" action distinct from the existing per-row handleRemoveRow', () => {
    assert.match(source, /handleRemoveGroup/);
    // Still calls handleRemoveRow for a single portion's own delete —
    // that existing function is not replaced, only supplemented.
    assert.match(source, /handleRemoveRow/);
  });
});

describe('InitialStockCountView.tsx — requirement 5/8: no duplicate-product detection exists on this surface', () => {
  it('does not import or reference any supplier-wording candidate-detection machinery', () => {
    // Confirms Consolidated Specification §6's "Trigger surfaces: Add
    // Stock and Smart Stock Entry only" is still true after B5 — this
    // view never gained, and B5 did not add, any cross-Product
    // duplicate/candidate-detection mechanism of any kind.
    assert.doesNotMatch(source, /supplierWordingCandidates/);
    assert.doesNotMatch(source, /detectSupplierWordingCandidates/);
    assert.doesNotMatch(source, /resolveSupplierWordingRecognition/);
    assert.doesNotMatch(source, /POL-0003/);
  });

  it('isGenuinelyNewProductName only checks against the live product catalog, never against sibling rows in this same draft', () => {
    const fnMatch = source.match(/const isGenuinelyNewProductName[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find isGenuinelyNewProductName function body');
    const fnBody = fnMatch![0];
    assert.match(fnBody, /products\.some/);
    // Must not reference `rows` (this draft's own sibling rows) at all —
    // that would turn this into cross-row duplicate detection, exactly
    // what requirement 8 forbids introducing.
    assert.doesNotMatch(fnBody, /\brows\b/);
  });

  it('[Grouped Initial Stock UX] isGenuinelyNewProductName is now called once per GROUP (group.displayName), not once per row', () => {
    assert.match(source, /isGenuinelyNewProductName\(group\.displayName\)/);
  });
});

describe('InitialStockCountView.tsx — requirement 6: existing valuation semantics untouched', () => {
  it('totalCapital is still a plain sum of quantity * costPrice across all rows — no product-level grouping/merging in the calculation itself', () => {
    const totalCapitalMatch = source.match(/const totalCapital = rows\.reduce\(([\s\S]*?)\n  \}, 0\);/);
    assert.ok(totalCapitalMatch, 'expected to find totalCapital computation');
    const body = totalCapitalMatch![0];
    assert.match(body, /q \* c/);
    // The grouping helper must NOT be referenced inside the totals
    // computation — it is presentation-only, per its own module
    // contract, and must never influence this number.
    assert.doesNotMatch(body, /computePortionLabels/);
    assert.doesNotMatch(body, /portionLabel/);
  });

  it('does not introduce any selling-basis Initial Capital figure (§19 remains excluded)', () => {
    assert.doesNotMatch(source, /sellingBasisCapital/i);
    assert.doesNotMatch(source, /capitalInicialVenda/i);
  });
});

describe('InitialStockCountView.tsx — requirement 9: no Add Stock / Smart Stock Entry coupling', () => {
  it('does not import from AddStockView or any Smart Stock Entry module', () => {
    assert.doesNotMatch(source, /from '\.\/AddStockView'/);
    assert.doesNotMatch(source, /smartStockEntry/i);
    assert.doesNotMatch(source, /receiptSequencing/);
  });
});

describe('InitialStockCountView.tsx — requirement 12: no derivedSellingValuation / Business Worth coupling', () => {
  it('never references StockBatch.derivedSellingValuation, calculateDerivedTransactionValuation, or calculateBatch', () => {
    assert.doesNotMatch(source, /derivedSellingValuation/);
    assert.doesNotMatch(source, /calculateDerivedTransactionValuation/);
    assert.doesNotMatch(source, /calculateBatch/);
  });
});
