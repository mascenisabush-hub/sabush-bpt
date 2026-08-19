// [Product Memory / UOM — Increment A] Tests for the pure functions in
// apps/tenant/src/lib/unitRelationship.ts.
//
// SCOPE: proves validation (POL-0005), reuse/membership checks, and the
// Recognition-proposal stub against plain in-memory values only. None of
// these functions touch Firestore or UI; none are wired into Add Stock,
// Initial Stock, Periodic Contagem, or Smart Stock Entry screens in this
// checkpoint. Matches this repository's existing pure-function-first
// test pattern (tests/supplier-wording-matching.test.ts).
//
// HOW TO RUN:
//   npx tsx --test tests/unit-relationship.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  isValidUnitRelationship,
  hasConfirmedUnitRelationship,
  getDefaultUnit,
  isUnitInChain,
  proposeUnitRelationshipRecognition,
  confirmUnitRelationship,
} from '../apps/tenant/src/lib/unitRelationship';

describe('isValidUnitRelationship — POL-0005 minimum configuration', () => {
  it('rejects undefined/null', () => {
    assert.equal(isValidUnitRelationship(undefined), false);
    assert.equal(isValidUnitRelationship(null), false);
  });

  it('rejects an empty units array', () => {
    assert.equal(isValidUnitRelationship({ units: [], confirmedAt: '2026-08-20T00:00:00.000Z' }), false);
  });

  it('accepts a single-unit chain (top-level only, no selling unit)', () => {
    assert.equal(
      isValidUnitRelationship({ units: [{ unit: 'Cx', factorFromPrevious: 0 }], confirmedAt: '2026-08-20T00:00:00.000Z' }),
      true
    );
  });

  it('accepts the canonical worked example: 1 Cx = 4 Emb = 24 Un, selling unit Un', () => {
    const ur = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(ur), true);
  });

  it('rejects a sellingUnit that is not a member of units[]', () => {
    const ur = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 24 }],
      sellingUnit: 'Emb', // not in the chain
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(ur), false);
  });

  it('rejects a non-positive factorFromPrevious on a non-top-level unit', () => {
    const zero = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 0 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    const negative = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: -5 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(zero), false);
    assert.equal(isValidUnitRelationship(negative), false);
  });

  it('rejects a non-finite factorFromPrevious', () => {
    const ur = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: NaN }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(ur), false);
  });

  it('ignores units[0].factorFromPrevious entirely (documented as unused)', () => {
    const ur = {
      units: [{ unit: 'Cx', factorFromPrevious: -999 }, { unit: 'Un', factorFromPrevious: 24 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(ur), true);
  });

  it('rejects an empty or whitespace-only unit string anywhere in the chain', () => {
    const emptyTop = { units: [{ unit: '', factorFromPrevious: 0 }], confirmedAt: '2026-08-20T00:00:00.000Z' };
    const blankSecond = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: '   ', factorFromPrevious: 24 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    assert.equal(isValidUnitRelationship(emptyTop), false);
    assert.equal(isValidUnitRelationship(blankSecond), false);
  });

  it('rejects a missing/empty confirmedAt', () => {
    const ur = { units: [{ unit: 'Cx', factorFromPrevious: 0 }], confirmedAt: '' };
    assert.equal(isValidUnitRelationship(ur as any), false);
  });

  it('does NOT require a selling price — POL-0005 only requires the unit relationship, and the selling unit only if a selling reference is being configured', () => {
    const ur = { units: [{ unit: 'Cx', factorFromPrevious: 0 }], confirmedAt: '2026-08-20T00:00:00.000Z' };
    // No sellingUnit at all — still valid per POL-0005's "may remain
    // optional/deferred" treatment of the selling side.
    assert.equal(isValidUnitRelationship(ur), true);
  });
});

describe('hasConfirmedUnitRelationship', () => {
  it('is false for a product with no unitRelationship field', () => {
    assert.equal(hasConfirmedUnitRelationship({ unitRelationship: undefined }), false);
  });

  it('is false for a product whose unitRelationship fails validation', () => {
    assert.equal(hasConfirmedUnitRelationship({ unitRelationship: { units: [], confirmedAt: 'x' } as any }), false);
  });

  it('is true for a product with a valid, confirmed unitRelationship', () => {
    const product = {
      unitRelationship: {
        units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 24 }],
        sellingUnit: 'Un',
        confirmedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    assert.equal(hasConfirmedUnitRelationship(product), true);
  });
});

describe('getDefaultUnit', () => {
  it('returns undefined for a product with no confirmed configuration — never invents a default', () => {
    assert.equal(getDefaultUnit({ unitRelationship: undefined }), undefined);
  });

  it('returns units[0].unit — the top-level/default unit (BDR-0012 §5.A Item 4)', () => {
    const product = {
      unitRelationship: {
        units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Emb', factorFromPrevious: 4 }, { unit: 'Un', factorFromPrevious: 6 }],
        confirmedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    assert.equal(getDefaultUnit(product), 'Cx');
  });
});

describe('isUnitInChain', () => {
  const product = {
    unitRelationship: {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Emb', factorFromPrevious: 4 }, { unit: 'Un', factorFromPrevious: 6 }],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    },
  };

  it('returns true for every unit that is a member of the confirmed chain', () => {
    assert.equal(isUnitInChain(product, 'Cx'), true);
    assert.equal(isUnitInChain(product, 'Emb'), true);
    assert.equal(isUnitInChain(product, 'Un'), true);
  });

  it('returns false for a unit that is not part of the confirmed chain — triggers BDR-0012 §5.A Item 6 warn-and-allow, never a silent conversion', () => {
    assert.equal(isUnitInChain(product, 'Kg'), false);
  });

  it('returns false for a product with no confirmed configuration at all — distinct from "configured, but this unit is not a member"', () => {
    assert.equal(isUnitInChain({ unitRelationship: undefined }, 'Cx'), false);
  });

  it('returns false for an empty unit string', () => {
    assert.equal(isUnitInChain(product, ''), false);
  });
});

describe('proposeUnitRelationshipRecognition — honest stub, no algorithm authorized', () => {
  it('always returns null, regardless of product name — UOM Specification §12 excludes any recognition algorithm from scope', () => {
    assert.equal(proposeUnitRelationshipRecognition('Savanna'), null);
    assert.equal(proposeUnitRelationshipRecognition(''), null);
    assert.equal(proposeUnitRelationshipRecognition('Anything at all'), null);
  });
});

describe('confirmUnitRelationship', () => {
  it('stamps confirmedAt and returns a valid UnitRelationship for a valid proposal', () => {
    const proposal = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 24 }],
      sellingUnit: 'Un',
    };
    const result = confirmUnitRelationship(proposal, '2026-08-20T12:00:00.000Z');
    assert.deepEqual(result, {
      units: proposal.units,
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T12:00:00.000Z',
    });
  });

  it('defaults confirmedAt to "now" when not supplied', () => {
    const proposal = { units: [{ unit: 'Cx', factorFromPrevious: 0 }] };
    const before = new Date().toISOString();
    const result = confirmUnitRelationship(proposal);
    const after = new Date().toISOString();
    assert.ok(result);
    assert.ok(result!.confirmedAt >= before && result!.confirmedAt <= after);
  });

  it('returns null and refuses to confirm an invalid candidate (e.g. sellingUnit not in chain) — never persists an invalid configuration', () => {
    const proposal = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }],
      sellingUnit: 'Un', // not a member of units[]
    };
    assert.equal(confirmUnitRelationship(proposal), null);
  });

  it('returns null for an empty units array', () => {
    assert.equal(confirmUnitRelationship({ units: [] }), null);
  });
});
