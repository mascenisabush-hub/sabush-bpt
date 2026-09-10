// Bug fix — new-product Unit Relationship silently loses its conversion
// factor when the purchase/cost unit and the selling unit collide.
//
// REPORTED BEHAVIOR: during Add Stock, confirming a brand-new product and
// configuring its Unit Relationship (e.g. "1 Cx = 24 Un", selling unit
// "Un") sometimes has no effect — the factor the Owner typed is silently
// ignored. ROOT CAUSE: `isValidUnitRelationship` (unitRelationship.ts) did
// not reject a candidate whose purchase/cost unit (units[0], almost always
// the row's shared, easy-to-forget-to-change "Unidade" field — defaulting
// to a generic "un") and selling unit NORMALIZE (trim + lowercase) to the
// same string. `getConversionFactor` then resolves BOTH sides via
// `findIndex`, which returns the FIRST matching entry for a collision —
// silently producing a conversion factor of 1 (as if purchase unit and
// selling unit were the same measure) and discarding whatever real factor
// the Owner had typed, with no error shown anywhere. This suite proves:
// (1) the collision is now rejected by isValidUnitRelationship itself —
// the single source of truth every write path already routes through, so
// every consumer (Add Stock, Contagem, Initial Stock, Product Catalog) is
// fixed at once; (2) a genuinely distinct purchase/selling unit pair is
// completely unaffected; (3) the collision is now surfaced to the Owner,
// live, inside AddStockView's UnitRelationshipRow, instead of failing
// silently.
//
// SCOPE NOTE: this repository has no DOM/React render harness (established
// precedent — tests/add-stock-typing-and-autofill-bugfix.test.ts's own
// header). This suite follows the same two established techniques: (1)
// direct fixture tests against the REAL, imported isValidUnitRelationship/
// getConversionFactor, and (2) structural source-text assertions
// confirming AddStockView.tsx's UnitRelationshipRow surfaces the warning.
//
// HOW TO RUN:
//   npx tsx --test tests/new-product-cost-selling-unit-collision-bugfix.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import { getConversionFactor } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const ptLocaleSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enLocaleSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frLocaleSrc = src('apps/tenant/src/i18n/locales/fr.ts');

// ==================================================================
// A — Post-fix behavior: a colliding candidate is now rejected at its
// SOURCE (isValidUnitRelationship), so getConversionFactor's own
// existing "no derivation possible" guard (unmodified, protected)
// correctly returns null instead of ever reaching the silent,
// first-match findIndex collision that used to fabricate a factor of 1
// ==================================================================
describe('A — post-fix: a colliding candidate is rejected before getConversionFactor ever sees it as valid', () => {
  it('purchase unit "un" (never changed from the generic default) colliding with selling unit "Un" now makes getConversionFactor correctly return null (never a fabricated 1) — the typed factor of 24 is no longer silently discarded, it is refused up front', () => {
    const colliding: UnitRelationship = {
      units: [
        { unit: 'un', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    // getConversionFactor itself is NOT modified by this fix (protected,
    // unrelated to this bugfix's own scope) — its own FIRST guard is
    // `if (!isValidUnitRelationship(relationship)) return null;`, so
    // today's fix (isValidUnitRelationship now rejecting the collision)
    // is what changes this call's result, end to end.
    assert.equal(getConversionFactor(colliding, 'un', 'Un'), null);
  });
});

// ==================================================================
// B — isValidUnitRelationship now rejects the collision, at the single
// source of truth every write path already routes through
// ==================================================================
describe('B — isValidUnitRelationship rejects a purchase/selling unit collision', () => {
  it('rejects when the top-level (purchase/cost) unit and the selling unit normalize to the same string', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'un', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), false);
  });

  it('rejects regardless of whitespace differences (" Cx " vs "cx")', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: ' Cx ', factorFromPrevious: 0 },
        { unit: 'cx', factorFromPrevious: 24 },
      ],
      sellingUnit: 'cx',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), false);
  });

  it('rejects a collision anywhere in a longer chain (e.g. units[1] colliding with units[2]), not only units[0]', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'emb', factorFromPrevious: 6 },
      ],
      sellingUnit: 'emb',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), false);
  });

  it('still accepts a genuinely distinct purchase/selling unit pair — the fix never rejects a legitimate relationship', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), true);
  });

  it('still accepts the canonical multi-hop worked example (1 Cx = 4 Emb = 24 Un) — no regression to a legitimate longer chain', () => {
    const candidate: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), true);
  });

  it('still accepts a single-unit chain with no selling unit at all — collision detection only ever compares units[] entries against each other, never invents a comparison', () => {
    const candidate: UnitRelationship = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(candidate), true);
  });
});

// ==================================================================
// C — AddStockView.tsx: the collision is now surfaced to the Owner,
// live, instead of failing silently
// ==================================================================
describe('C — UnitRelationshipRow surfaces the collision to the Owner', () => {
  function componentBody(): string {
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
    return addStockSrc.slice(startIdx, i + 1);
  }

  it('computes unitsCollide by normalizing (trim + lowercase) both the purchase unit and the selling unit, mirroring isValidUnitRelationship\'s own new check', () => {
    const body = componentBody();
    assert.match(body, /purchaseUnitNormalized = \(purchaseUnit \|\| 'un'\)\.trim\(\)\.toLowerCase\(\)/);
    assert.match(body, /sellingUnitNormalized = sellingUnit\.trim\(\)\.toLowerCase\(\)/);
    assert.match(body, /unitsCollide = !!sellingUnitNormalized && sellingUnitNormalized === purchaseUnitNormalized/);
  });

  it('renders a visible, translated warning when unitsCollide is true — never silent', () => {
    const body = componentBody();
    assert.match(body, /\{unitsCollide && \(/);
    assert.match(body, /t\('addStock\.newProductSellingUnitSameAsCostUnitWarning', \{ unit: purchaseUnit \|\| 'un' \}\)/);
  });

  it('the warning uses this file\'s own established "warn, don\'t silently fail" amber styling, matching unitOutsideRelationshipWarning/priceDeviationWarning', () => {
    const body = componentBody();
    const warningBlockIdx = body.indexOf('{unitsCollide && (');
    assert.notEqual(warningBlockIdx, -1);
    const warningBlock = body.slice(warningBlockIdx, warningBlockIdx + 250);
    assert.match(warningBlock, /text-amber-600/);
  });
});

// ==================================================================
// D — Translation keys present in all three locales, each accepting
// the {{unit}} interpolation so the message names the actual colliding
// unit rather than a generic warning
// ==================================================================
describe('D — newProductSellingUnitSameAsCostUnitWarning translation key exists in every locale', () => {
  it('pt.ts (canonical/fallback locale): declared in the interface and implemented, with {{unit}} interpolation', () => {
    assert.match(ptLocaleSrc, /newProductSellingUnitSameAsCostUnitWarning: string;/);
    assert.match(ptLocaleSrc, /newProductSellingUnitSameAsCostUnitWarning:\s*\n\s*'[^']*\{\{unit\}\}[^']*'/);
  });

  it('en.ts implements the same key, with {{unit}} interpolation', () => {
    assert.match(enLocaleSrc, /newProductSellingUnitSameAsCostUnitWarning:/);
    assert.match(enLocaleSrc, /\{\{unit\}\}/);
  });

  it('fr.ts implements the same key, with {{unit}} interpolation', () => {
    assert.match(frLocaleSrc, /newProductSellingUnitSameAsCostUnitWarning:/);
    assert.match(frLocaleSrc, /\{\{unit\}\}/);
  });
});
