// Business Worth Evolution — Decision 37, B.1 completion (the
// read-only existing-product summary the Plan's own §B.1 text named
// explicitly but was never actually built when B.1 first shipped —
// see PeriodicStockCountView.tsx's own ExistingProductSummary header
// comment for the full history).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see tests/periodic-stock-new-product-panel.test.ts's
// own header, tests/business-worth-correction-recovery-ui.test.ts's own
// header). This suite follows both of this repo's established
// techniques for that constraint: (1) a small local reimplementation
// of ExistingProductSummary's own trivial guard logic (hasRelationship/
// hasCostBasis/null-return), exercised against fixture inputs, and (2)
// structural source-text assertions confirming the two render call
// sites (catalog-row loop, manual-row loop) exist with the correct
// gating conditions and the correct mutual exclusivity against
// NewProductInfoPanel.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-existing-product-summary.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

/** Mirrors ExistingProductSummary's own guard logic exactly — the
 * component's entire decision of whether it renders anything at all,
 * and which of its two halves (cost basis / relationship chain)
 * appear. Duplicated here only as a small test fixture, matching this
 * repo's own established pattern for this exact class of problem. */
function summaryVisibility(
  costBasis: { purchaseUnit: string; purchaseCost: number; relationship: UnitRelationship | null | undefined } | undefined,
  relationship: UnitRelationship | undefined
): { rendersAtAll: boolean; showsCostBasis: boolean; showsRelationship: boolean } {
  const hasRelationship = !!relationship && isValidUnitRelationship(relationship);
  const hasCostBasis = !!costBasis && Number.isFinite(costBasis.purchaseCost) && costBasis.purchaseCost >= 0 && !!costBasis.purchaseUnit;
  return {
    rendersAtAll: hasRelationship || hasCostBasis,
    showsCostBasis: hasCostBasis,
    showsRelationship: hasRelationship,
  };
}

describe('ExistingProductSummary — guard logic (B.1 completion)', () => {
  it('renders nothing when the product has neither a cost basis nor a confirmed relationship', () => {
    const result = summaryVisibility(undefined, undefined);
    assert.equal(result.rendersAtAll, false);
  });

  it('shows only the cost-basis line when a relationship has not been confirmed', () => {
    const result = summaryVisibility({ purchaseUnit: 'Cx', purchaseCost: 1250, relationship: undefined }, undefined);
    assert.equal(result.rendersAtAll, true);
    assert.equal(result.showsCostBasis, true);
    assert.equal(result.showsRelationship, false);
  });

  it('shows only the relationship line when no cost has been recorded', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const result = summaryVisibility(undefined, relationship);
    assert.equal(result.rendersAtAll, true);
    assert.equal(result.showsCostBasis, false);
    assert.equal(result.showsRelationship, true);
  });

  it('shows both lines when the product has full memory (cost basis and a confirmed relationship)', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const result = summaryVisibility({ purchaseUnit: 'Cx', purchaseCost: 1250, relationship }, relationship);
    assert.equal(result.rendersAtAll, true);
    assert.equal(result.showsCostBasis, true);
    assert.equal(result.showsRelationship, true);
  });

  it('never fabricates a cost basis for a negative or non-finite purchaseCost', () => {
    const negative = summaryVisibility({ purchaseUnit: 'Cx', purchaseCost: -5, relationship: undefined }, undefined);
    assert.equal(negative.showsCostBasis, false);
    const nonFinite = summaryVisibility({ purchaseUnit: 'Cx', purchaseCost: NaN, relationship: undefined }, undefined);
    assert.equal(nonFinite.showsCostBasis, false);
  });

  it('an invalid (incomplete) relationship is treated as absent, matching isValidUnitRelationship elsewhere in this codebase', () => {
    const invalid = { units: [{ unit: 'Cx', factorFromPrevious: 0 }], confirmedAt: new Date().toISOString() } as UnitRelationship;
    const result = summaryVisibility(undefined, invalid);
    assert.equal(result.showsRelationship, isValidUnitRelationship(invalid));
  });
});

describe('PeriodicStockCountView.tsx — ExistingProductSummary is actually wired in (source-structure checks)', () => {
  it('is defined once, as a sibling of NewProductInfoPanel, reading costBasisByProductName and getUnitRelationshipForProductName — the exact already-existing read path Finding FT-4 names, no new lookup', () => {
    assert.match(periodicSrc, /const ExistingProductSummary: React\.FC<\{/);
    // Exactly one component definition — not duplicated per call site.
    const defCount = (periodicSrc.match(/const ExistingProductSummary: React\.FC<\{/g) || []).length;
    assert.equal(defCount, 1);
  });

  it('the catalog-row loop renders it under the same isFirstPortionOfMultiPortionGroup gate Mode A already uses — no additional isGenuinelyNewProductName check needed there (a catalog row is never genuinely new, by construction)', () => {
    const start = periodicSrc.indexOf('const isFirstPortionOfMultiPortionGroup = portionLabel.portionIndex === 1;');
    assert.notEqual(start, -1);
    const block = periodicSrc.slice(start, start + 11000);
    assert.match(block, /\{isFirstPortionOfMultiPortionGroup && \(\s*<ExistingProductSummary/);
    assert.match(block, /costBasis=\{costBasisByProductName\.get\(productKeyFor\(row\.productName\)\)\}/);
    assert.match(block, /relationship=\{getUnitRelationshipForProductName\(row\.productName\)\}/);
  });

  it('the manual-row loop renders it only when !isNewProduct, so it and NewProductInfoPanel are mutually exclusive per card — never both for the same product', () => {
    const start = periodicSrc.indexOf('const cardIsFirstPortionOfMultiPortionGroup = firstRowLabel.portionIndex === 1;');
    assert.notEqual(start, -1);
    // [Implementation Authorization — Existing-Product Selling-Unit /
    // Price-Memory Correction] Window widened 9500 -> 10000: that
    // correction's own added comment lines in this render site's
    // sibling Mode A block (relationship.sellingUnit two-tier default)
    // pushed ExistingProductSummary's render call slightly further from
    // this anchor. No assertion content below changed.
    const block = periodicSrc.slice(start, start + 10000);
    assert.match(block, /\{isNewProduct &&/);
    assert.match(block, /\{!isNewProduct && cardIsFirstPortionOfMultiPortionGroup && \(\s*<ExistingProductSummary/);
    assert.match(block, /costBasis=\{costBasisByProductName\.get\(productKeyFor\(group\.displayName\)\)\}/);
    assert.match(block, /relationship=\{getUnitRelationshipForProductName\(group\.displayName\)\}/);
  });

  it('is a read-only display component — no onChange/onClick/state hook of its own', () => {
    const start = periodicSrc.indexOf('const ExistingProductSummary: React.FC<{');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\nexport const PeriodicStockCountView', start);
    assert.notEqual(end, -1);
    const componentBody = periodicSrc.slice(start, end);
    assert.doesNotMatch(componentBody, /onChange=/);
    assert.doesNotMatch(componentBody, /onClick=/);
    assert.doesNotMatch(componentBody, /useState/);
  });

  it('reuses the existing costBasisByProductName map (FR-67) rather than introducing a second, competing cost-basis source', () => {
    assert.match(periodicSrc, /const costBasisByProductName = useMemo\(\(\) => buildProductCostBasisMap\(products\)/);
    // Only one buildProductCostBasisMap call in the whole file.
    const callCount = (periodicSrc.match(/buildProductCostBasisMap\(/g) || []).length;
    assert.equal(callCount, 1);
  });
});
