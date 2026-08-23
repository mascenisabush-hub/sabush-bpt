// Business Worth Evolution — Decision 37, B.2: Arbitrary-Length
// Unit-Relationship Entry (PeriodicStockCountView.tsx).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent, see tests/periodic-stock-new-product-panel.test.ts's
// own identical scope note (B.1's own suite). This suite follows the
// same pattern: it exercises the SAME pure logic the component's
// UnitRelationshipChainEditor and its submit-time correlation loop
// depend on, via small local reimplementations of the component's own
// trivial closures (productKeyFor) plus the REAL, imported, unmodified
// production engine (getConversionFactor, isValidUnitRelationship) —
// proving the actual arithmetic B.2 must remain compatible with,
// rather than re-testing already-covered engine behavior.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-arbitrary-length-relationship.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import { getConversionFactor } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

function productKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

type RelationshipStep = { unit: string; factor: string };
type NewProductInfo = { purchaseUnit: string; purchaseCost: string; relationshipSteps: RelationshipStep[] };

/** Mirrors PeriodicStockCountView.tsx's own corrected (B.2) submit-time
 * correlation loop exactly: builds a UnitRelationship candidate PER
 * PRODUCT KEY from newProductInfo.relationshipSteps, dropping only a
 * trailing incomplete step, never inventing a fabricated factor. */
function correlateUnitRelationships(
  newProductInfo: Record<string, NewProductInfo>,
  rows: { productName: string; unit: string }[]
): Map<string, UnitRelationship> {
  const result = new Map<string, UnitRelationship>();
  for (const [key, info] of Object.entries(newProductInfo)) {
    if (!key) continue;
    const completeSteps = info.relationshipSteps.filter(
      (s) => s.unit.trim() && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
    );
    if (completeSteps.length === 0) continue;
    const fallbackRow = rows.find((r) => productKeyFor(r.productName) === key);
    const purchaseUnit = info.purchaseUnit.trim() || fallbackRow?.unit || 'un';
    const candidate: UnitRelationship = {
      units: [
        { unit: purchaseUnit, factorFromPrevious: 0 },
        ...completeSteps.map((s) => ({ unit: s.unit.trim(), factorFromPrevious: parseFloat(s.factor) })),
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    if (isValidUnitRelationship(candidate)) {
      result.set(key, candidate);
    }
  }
  return result;
}

/** Mirrors UnitRelationshipChainEditor's own "+ Adicionar nível" gate:
 * enabled only when there are zero steps, or the current last step has
 * both a unit and a valid positive factor. */
function canAddLevel(steps: RelationshipStep[]): boolean {
  const last = steps[steps.length - 1];
  if (!last) return true;
  const factor = parseFloat(last.factor);
  return !!last.unit.trim() && Number.isFinite(factor) && factor > 0;
}

/** Mirrors UnitRelationshipChainEditor's own removeFromStep: truncates
 * the chain from `index` onward. */
function removeFromStep(steps: RelationshipStep[], index: number): RelationshipStep[] {
  return steps.slice(0, index);
}

describe('B.2 — A. two-level relationship', () => {
  it('1 Cx = 4 Emb produces the correct two-unit chain', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps: [{ unit: 'Emb', factor: '4' }] },
    };
    const result = correlateUnitRelationships(newProductInfo, []);
    assert.deepEqual(result.get(key), {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    });
  });
});

describe('B.2 — B. three-level relationship', () => {
  it('1 Cx = 4 Emb, 1 Emb = 6 Un produces the correct three-unit chain (1 Cx = 4 Emb = 24 Un)', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: {
        purchaseUnit: 'Cx',
        purchaseCost: '1250',
        relationshipSteps: [
          { unit: 'Emb', factor: '4' },
          { unit: 'Un', factor: '6' },
        ],
      },
    };
    const result = correlateUnitRelationships(newProductInfo, []);
    const relationship = result.get(key)!;
    assert.deepEqual(relationship.units, [
      { unit: 'Cx', factorFromPrevious: 0 },
      { unit: 'Emb', factorFromPrevious: 4 },
      { unit: 'Un', factorFromPrevious: 6 },
    ]);
  });
});

describe('B.2 — C. arbitrary-length behavior', () => {
  it('adding a fourth level beyond three keeps the resulting units[] structure correct', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: {
        purchaseUnit: 'Palete',
        purchaseCost: '30000',
        relationshipSteps: [
          { unit: 'Cx', factor: '10' }, // 1 Palete = 10 Cx
          { unit: 'Emb', factor: '4' }, // 1 Cx = 4 Emb
          { unit: 'Un', factor: '6' }, // 1 Emb = 6 Un
        ],
      },
    };
    const result = correlateUnitRelationships(newProductInfo, []);
    const relationship = result.get(key)!;
    assert.equal(relationship.units.length, 4);
    assert.deepEqual(relationship.units, [
      { unit: 'Palete', factorFromPrevious: 0 },
      { unit: 'Cx', factorFromPrevious: 10 },
      { unit: 'Emb', factorFromPrevious: 4 },
      { unit: 'Un', factorFromPrevious: 6 },
    ]);
    assert.equal(isValidUnitRelationship(relationship), true);
  });

  it('canAddLevel only permits a new level once the current last step is complete — prevents an interior gap from ever being constructible', () => {
    assert.equal(canAddLevel([]), true, 'zero steps: adding the first level is always allowed');
    assert.equal(canAddLevel([{ unit: '', factor: '' }]), false, 'incomplete last step blocks adding another level');
    assert.equal(canAddLevel([{ unit: 'Emb', factor: '' }]), false, 'unit alone, no factor, still blocks');
    assert.equal(canAddLevel([{ unit: '', factor: '4' }]), false, 'factor alone, no unit, still blocks');
    assert.equal(canAddLevel([{ unit: 'Emb', factor: '0' }]), false, 'non-positive factor still blocks');
    assert.equal(canAddLevel([{ unit: 'Emb', factor: '4' }]), true, 'complete last step allows adding another level');
  });

  it('removeFromStep truncates from the removed index onward — can never leave an orphaned later step', () => {
    const steps: RelationshipStep[] = [
      { unit: 'Cx', factor: '10' },
      { unit: 'Emb', factor: '4' },
      { unit: 'Un', factor: '6' },
    ];
    assert.deepEqual(removeFromStep(steps, 1), [{ unit: 'Cx', factor: '10' }]);
    assert.deepEqual(removeFromStep(steps, 0), []);
    assert.deepEqual(removeFromStep(steps, 3), steps, 'removing past the end is a no-op truncation');
  });
});

describe('B.2 — D. correct product-level ownership (relationshipSteps lives in newProductInfo, not on a row)', () => {
  it('relationshipSteps for two different in-progress new products never cross-contaminate', () => {
    const cocaKey = productKeyFor('Coca-Cola');
    const fantaKey = productKeyFor('Fanta Laranja');
    let newProductInfo: Record<string, NewProductInfo> = {};

    newProductInfo = {
      ...newProductInfo,
      [cocaKey]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps: [{ unit: 'Emb', factor: '4' }] },
    };
    newProductInfo = {
      ...newProductInfo,
      [fantaKey]: { purchaseUnit: 'Cx', purchaseCost: '900', relationshipSteps: [{ unit: 'Un', factor: '12' }] },
    };

    assert.deepEqual(newProductInfo[cocaKey].relationshipSteps, [{ unit: 'Emb', factor: '4' }]);
    assert.deepEqual(newProductInfo[fantaKey].relationshipSteps, [{ unit: 'Un', factor: '12' }]);
  });
});

describe('B.2 — E. deletion/reordering regression (relationship survives, mirrors B.1\'s own guarantee)', () => {
  it('deleting the currently-first portion leaves relationshipSteps completely intact', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: {
        purchaseUnit: 'Cx',
        purchaseCost: '1250',
        relationshipSteps: [
          { unit: 'Emb', factor: '4' },
          { unit: 'Un', factor: '6' },
        ],
      },
    };
    const rowsBefore = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Coca-Cola', unit: 'Emb' },
    ];
    const before = correlateUnitRelationships(newProductInfo, rowsBefore);

    // Delete the first portion row — newProductInfo is untouched by
    // this, exactly like B.1's own guarantee (handleRemoveManualRow is
    // a plain array filter that never reaches into newProductInfo).
    const rowsAfter = rowsBefore.slice(1);
    const after = correlateUnitRelationships(newProductInfo, rowsAfter);

    assert.deepEqual(before.get(key), after.get(key));
    assert.equal(after.get(key)?.units.length, 3);
  });

  it('reordering portions never affects the correlated relationship', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps: [{ unit: 'Emb', factor: '4' }, { unit: 'Un', factor: '6' }] },
    };
    const rows = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Coca-Cola', unit: 'Emb' },
      { productName: 'Coca-Cola', unit: 'Un' },
    ];
    const reordered = [rows[2], rows[0], rows[1]];

    assert.deepEqual(correlateUnitRelationships(newProductInfo, rows).get(key), correlateUnitRelationships(newProductInfo, reordered).get(key));
  });
});

describe('B.2 — F. existing-product regression', () => {
  it('an existing product with a confirmed unitRelationship never enters the first-time flow — newProductInfo stays empty for it (isGenuinelyNewProductName gate, unchanged by B.2)', () => {
    // B.2 does not touch isGenuinelyNewProductName or the panel's own
    // render gate at all — this is a pure documentation/regression
    // test confirming the correlation loop produces nothing for a
    // product that never had a newProductInfo entry in the first
    // place, which is what happens for an existing product (the panel
    // never renders for it, so setNewProductInfo is never called for
    // its key).
    const rows = [
      { productName: 'Coca-Cola', unit: 'Cx' },
      { productName: 'Coca-Cola', unit: 'Un' },
    ];
    const result = correlateUnitRelationships({}, rows);
    assert.equal(result.size, 0);
  });
});

describe('B.2 — G. invalid/incomplete relationship handling (isValidUnitRelationship\'s existing contract, unmodified)', () => {
  it('a trailing incomplete step is dropped, not fabricated into a candidate', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: {
        purchaseUnit: 'Cx',
        purchaseCost: '1250',
        relationshipSteps: [
          { unit: 'Emb', factor: '4' },
          { unit: '', factor: '' }, // incomplete trailing step
        ],
      },
    };
    const result = correlateUnitRelationships(newProductInfo, []);
    // The complete leading step still produces a valid two-level
    // candidate; the incomplete trailing step is simply filtered out,
    // never coerced into a fabricated unit/factor.
    assert.deepEqual(result.get(key)?.units, [
      { unit: 'Cx', factorFromPrevious: 0 },
      { unit: 'Emb', factorFromPrevious: 4 },
    ]);
  });

  it('zero complete steps produces no candidate at all for that product', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, NewProductInfo> = {
      [key]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps: [] },
    };
    const result = correlateUnitRelationships(newProductInfo, []);
    assert.equal(result.has(key), false);
  });

  it('a non-positive or non-finite factor anywhere in the chain is rejected by isValidUnitRelationship, unchanged', () => {
    const invalid: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: -4 },
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(invalid), false);
  });

  it('a blank unit anywhere in the chain is rejected by isValidUnitRelationship, unchanged', () => {
    const invalid: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: '  ', factorFromPrevious: 4 },
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(invalid), false);
  });
});

describe('B.2 — H. conversion compatibility with the existing, unmodified getConversionFactor', () => {
  it('the arbitrary-length candidate composes correctly: 1 Cx = 4 Emb = 24 Un', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    assert.equal(getConversionFactor(relationship, 'Cx', 'Emb'), 4);
    assert.equal(getConversionFactor(relationship, 'Cx', 'Un'), 24);
    assert.equal(getConversionFactor(relationship, 'Emb', 'Un'), 6);
    // Reverse directions compose correctly too, unchanged engine behavior.
    assert.equal(getConversionFactor(relationship, 'Un', 'Cx'), 1 / 24);
  });

  it('a four-level candidate composes correctly across all pairs, including non-adjacent ones', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'Palete', factorFromPrevious: 0 },
        { unit: 'Cx', factorFromPrevious: 10 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      confirmedAt: '2026-08-23T00:00:00.000Z',
    };
    assert.equal(getConversionFactor(relationship, 'Palete', 'Un'), 10 * 4 * 6);
    assert.equal(getConversionFactor(relationship, 'Cx', 'Un'), 4 * 6);
  });
});
