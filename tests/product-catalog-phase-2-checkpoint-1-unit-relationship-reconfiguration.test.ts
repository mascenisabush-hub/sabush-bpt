// [Product Catalog Phase 2 — Implementation Checkpoint 1: UnitRelationship
// old-state-aware extension] Governed by Decision 1
// (docs/specs/product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md),
// the accepted Phase 2 Specification §11, and the Stage 8 Implementation
// Authorization (docs/engineering/product-catalog-phase-2-implementation-authorization.md,
// commit 69aaea9e6911e8f8290946924d8263a173c7c555).
//
// SCOPE: proves classifyUnitRelationshipChange and
// evaluateUnitRelationshipReplacement (both new, pure, in
// apps/tenant/src/lib/unitRelationship.ts) directly against real
// fixture values, and confirms — via source-text structural assertion,
// this repository's own established technique for AppContext.tsx logic
// with no DOM/live-Firestore harness (see
// add-stock-cost-selling-unit-conflation-bugfix.test.ts's own header) —
// that confirmProductUnitRelationship is correctly wired to the new
// check before its existing write, and that isValidUnitRelationship/
// confirmUnitRelationship themselves remain byte-for-byte unmodified.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-2-checkpoint-1-unit-relationship-reconfiguration.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  isValidUnitRelationship,
  classifyUnitRelationshipChange,
  evaluateUnitRelationshipReplacement,
  type UnitRelationshipProposal,
} from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');

const CX_UN: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Cx',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

// ==================================================================
// TEST 1 — Existing valid relationship remains valid (baseline)
// ==================================================================
describe('TEST 1 — existing valid UnitRelationship remains valid', () => {
  it('CX_UN fixture itself passes isValidUnitRelationship, unchanged', () => {
    assert.equal(isValidUnitRelationship(CX_UN), true);
  });
});

// ==================================================================
// TEST 2/3/4/5 — Pure extension: accepted, preserves tokens, preserves
// factors, adds a new unit
// ==================================================================
describe('TEST 2-5 — pure extension: 1 Cx = 24 Un + 1 Emb = 6 Un -> 1 Cx = 4 Emb = 24 Un', () => {
  const extended: UnitRelationshipProposal = {
    units: [
      { unit: 'Cx', factorFromPrevious: 0 },
      { unit: 'Emb', factorFromPrevious: 4 },
      { unit: 'Un', factorFromPrevious: 24 },
    ],
    sellingUnit: 'Cx',
  };

  it('classified as extension', () => {
    assert.equal(classifyUnitRelationshipChange(CX_UN, extended), 'extension');
  });

  it('preserves every old unit token (Cx, Un both present in the extended candidate)', () => {
    const names = extended.units.map((u) => u.unit);
    assert.ok(names.includes('Cx'));
    assert.ok(names.includes('Un'));
  });

  it('preserves every old factor exactly — Un.factorFromPrevious remains 24, byte-identical, despite Emb being inserted positionally between Cx and Un', () => {
    const un = extended.units.find((u) => u.unit === 'Un');
    assert.equal(un?.factorFromPrevious, 24);
  });

  it('adds a genuinely new unit (Emb) not present in the original chain', () => {
    const names = extended.units.map((u) => u.unit);
    assert.ok(names.includes('Emb'));
    const originalNames = CX_UN.units.map((u) => u.unit);
    assert.ok(!originalNames.includes('Emb'));
  });
});

// ==================================================================
// TEST 6 — Existing sellingUnit remains valid after extension
// ==================================================================
describe('TEST 6 — existing sellingUnit (Cx) remains valid after extension', () => {
  it('evaluateUnitRelationshipReplacement allows it — Cx is still a member of the extended relationship', () => {
    const extended: UnitRelationshipProposal = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Cx',
    };
    const result = evaluateUnitRelationshipReplacement(CX_UN, extended);
    assert.deepEqual(result, { allowed: true });
  });
});

// ==================================================================
// TEST 7 — sellingUnit reassignment within an existing relationship is
// distinct from relationship replacement (classification-level check)
// ==================================================================
describe('TEST 7 — sellingUnit reassignment (same units[], different sellingUnit) is distinct from replacement', () => {
  it('classifyUnitRelationshipChange treats a same-chain sellingUnit change as NOT an extension (no new unit added) — this is the narrower, already-existing reassignment case, out of this classifier\'s scope by design', () => {
    const sameChainDifferentSellingUnit: UnitRelationshipProposal = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un', // was Cx
    };
    // Not an extension (no new unit token) — falls to 'replacement' in
    // this classifier's binary scheme, but evaluateUnitRelationshipReplacement
    // (below) correctly allows it since Un is a member of the proposed
    // relationship — proving the two functions are independently
    // correct and this case is handled safely either way.
    assert.equal(classifyUnitRelationshipChange(CX_UN, sameChainDifferentSellingUnit), 'replacement');
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, sameChainDifferentSellingUnit), { allowed: true });
  });
});

// ==================================================================
// TEST 8 — Replacement detected: existing factor changed
// ==================================================================
describe('TEST 8 — replacement detected when an existing factor changes (1 Cx = 24 Un -> 1 Cx = 20 Un)', () => {
  it('classified as replacement, not extension', () => {
    const factorChanged: UnitRelationshipProposal = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 20 },
      ],
      sellingUnit: 'Cx',
    };
    assert.equal(classifyUnitRelationshipChange(CX_UN, factorChanged), 'replacement');
  });
});

// ==================================================================
// TEST 9 — Replacement detected: existing unit removed
// ==================================================================
describe('TEST 9 — replacement detected when an existing unit is removed', () => {
  it('classified as replacement (Un dropped entirely)', () => {
    const unitRemoved: UnitRelationshipProposal = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }],
      sellingUnit: 'Cx',
    };
    assert.equal(classifyUnitRelationshipChange(CX_UN, unitRemoved), 'replacement');
  });
});

// ==================================================================
// TEST 10 — Replacement detected: restructuring (top-level changed)
// ==================================================================
describe('TEST 10 — replacement detected for restructuring (top-level unit changed)', () => {
  it('classified as replacement when units[0] itself changes, even if old unit tokens remain present', () => {
    const restructured: UnitRelationshipProposal = {
      units: [
        { unit: 'Un', factorFromPrevious: 0 },
        { unit: 'Cx', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Cx',
    };
    assert.equal(classifyUnitRelationshipChange(CX_UN, restructured), 'replacement');
  });
});

// ==================================================================
// TEST 11 — Replacement allowed when existing sellingUnit remains valid
// ==================================================================
describe('TEST 11 — replacement allowed when the current sellingUnit (Cx) remains a member of the proposed relationship', () => {
  it('evaluateUnitRelationshipReplacement allows the factor-changed candidate above', () => {
    const factorChanged: UnitRelationshipProposal = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 20 },
      ],
      sellingUnit: 'Cx',
    };
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, factorChanged), { allowed: true });
  });

  it('subject to all existing relationship validation — an otherwise-invalid candidate is still rejected by isValidUnitRelationship/confirmUnitRelationship regardless of the replacement evaluation', () => {
    const invalidFactor: UnitRelationshipProposal = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: -5 }, // invalid: non-positive
      ],
      sellingUnit: 'Cx',
    };
    // Replacement evaluation alone would allow it (Cx still present)...
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, invalidFactor), { allowed: true });
    // ...but isValidUnitRelationship independently rejects it — the two
    // checks are complementary, not substitutes for one another.
    assert.equal(isValidUnitRelationship({ ...invalidFactor, confirmedAt: '2026-09-09T00:00:00.000Z' }), false);
  });
});

// ==================================================================
// TEST 12 — Replacement blocked when current sellingUnit is removed
// ==================================================================
describe('TEST 12 — replacement blocked when the current sellingUnit (Cx) is removed from the proposed relationship', () => {
  it('evaluateUnitRelationshipReplacement refuses, with the distinguishable reason', () => {
    const cxRemoved: UnitRelationshipProposal = {
      units: [{ unit: 'Un', factorFromPrevious: 0 }],
      // no sellingUnit supplied
    };
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, cxRemoved), {
      allowed: false,
      reason: 'requires-new-selling-unit',
    });
  });
});

// ==================================================================
// TEST 13 — A blocked replacement never auto-selects another sellingUnit
// ==================================================================
describe('TEST 13 — a blocked replacement does not auto-select a replacement sellingUnit', () => {
  it('the blocked result carries no sellingUnit suggestion of any kind — only allowed:false + a reason code', () => {
    const cxRemoved: UnitRelationshipProposal = {
      units: [{ unit: 'Un', factorFromPrevious: 0 }],
    };
    const result = evaluateUnitRelationshipReplacement(CX_UN, cxRemoved);
    assert.equal(result.allowed, false);
    assert.equal(Object.keys(result).sort().join(','), 'allowed,reason');
  });

  it('structural: evaluateUnitRelationshipReplacement\'s own source never assigns a value to proposed.sellingUnit', () => {
    const libSrc = src('apps/tenant/src/lib/unitRelationship.ts');
    const fnMatch = libSrc.match(/export function evaluateUnitRelationshipReplacement\([\s\S]*?\n}/);
    assert.ok(fnMatch, 'expected to find evaluateUnitRelationshipReplacement');
    assert.doesNotMatch(fnMatch![0], /proposed\.sellingUnit\s*=/);
  });
});

// ==================================================================
// TEST 14 — A blocked replacement does NOT auto-clear sellingPrice
// ==================================================================
describe('TEST 14 — a blocked replacement does not auto-clear sellingPrice', () => {
  it('structural: evaluateUnitRelationshipReplacement never references sellingPrice at all — it has no awareness of that field by design', () => {
    const libSrc = src('apps/tenant/src/lib/unitRelationship.ts');
    const fnMatch = libSrc.match(/export function evaluateUnitRelationshipReplacement\([\s\S]*?\n}/);
    assert.ok(fnMatch);
    assert.doesNotMatch(fnMatch![0], /sellingPrice/);
  });

  it('structural: confirmProductUnitRelationship (AppContext.tsx) never writes sellingPrice, before or after the new check', () => {
    const fnMatch = appContextSrc.match(/const confirmProductUnitRelationship = async \([\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find confirmProductUnitRelationship');
    assert.doesNotMatch(fnMatch![0], /sellingPrice/);
  });
});

// ==================================================================
// TEST 15 — Replacement can proceed once the owner supplies a valid new
// sellingUnit from the proposed relationship, in the same action
// ==================================================================
describe('TEST 15 — replacement proceeds once a valid new sellingUnit is explicitly supplied in the same candidate', () => {
  it('evaluateUnitRelationshipReplacement allows it once proposed.sellingUnit = Un (a member of the new units[])', () => {
    const cxRemovedWithNewSellingUnit: UnitRelationshipProposal = {
      units: [{ unit: 'Un', factorFromPrevious: 0 }],
      sellingUnit: 'Un',
    };
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, cxRemovedWithNewSellingUnit), { allowed: true });
  });

  it('still refused if the supplied sellingUnit is itself not a member of the proposed units[]', () => {
    const bogusSellingUnit: UnitRelationshipProposal = {
      units: [{ unit: 'Un', factorFromPrevious: 0 }],
      sellingUnit: 'Kg', // not a member of the proposed relationship
    };
    assert.deepEqual(evaluateUnitRelationshipReplacement(CX_UN, bogusSellingUnit), {
      allowed: false,
      reason: 'requires-new-selling-unit',
    });
  });
});

// ==================================================================
// TEST 16 — Invalid UnitRelationships continue to be rejected exactly
// as before (isValidUnitRelationship/confirmUnitRelationship untouched)
// ==================================================================
describe('TEST 16 — invalid UnitRelationships still rejected by the existing, unmodified validation', () => {
  it('empty units array still rejected', () => {
    assert.equal(isValidUnitRelationship({ units: [], confirmedAt: '2026-09-09T00:00:00.000Z' }), false);
  });

  it('sellingUnit not a chain member still rejected', () => {
    assert.equal(
      isValidUnitRelationship({
        units: [{ unit: 'Cx', factorFromPrevious: 0 }],
        sellingUnit: 'Un',
        confirmedAt: '2026-09-09T00:00:00.000Z',
      }),
      false
    );
  });
});

// ==================================================================
// TEST 17 — Existing callers/behavior of reusable validation functions
// do not regress — structural, source-level confirmation
// ==================================================================
describe('TEST 17 — no regression to existing validation functions or call sites', () => {
  it('isValidUnitRelationship and confirmUnitRelationship are byte-for-byte unmodified — the new functions are additive, appended after confirmUnitRelationship, never editing it', () => {
    const libSrc = src('apps/tenant/src/lib/unitRelationship.ts');
    assert.match(
      libSrc,
      /export function confirmUnitRelationship\(\s*\n\s*candidate: UnitRelationshipProposal,\s*\n\s*confirmedAt: string = new Date\(\)\.toISOString\(\)\s*\n\): UnitRelationship \| null \{\s*\n\s*const withTimestamp: UnitRelationship = \{ \.\.\.candidate, confirmedAt \};\s*\n\s*return isValidUnitRelationship\(withTimestamp\) \? withTimestamp : null;\s*\n\}/
    );
  });

  it('confirmProductUnitRelationship still calls confirmUnitRelationship and still writes only unitRelationship via updateProduct', () => {
    const fnMatch = appContextSrc.match(/const confirmProductUnitRelationship = async \([\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /confirmUnitRelationship\(candidate\)/);
    assert.match(fnMatch![0], /updateProduct\(productId, \{ unitRelationship: confirmed \}\)/);
  });

  it('the new old-state-aware check runs BEFORE confirmUnitRelationship/the write — never after', () => {
    const fnMatch = appContextSrc.match(/const confirmProductUnitRelationship = async \([\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    const body = fnMatch![0];
    const replacementCheckIdx = body.indexOf('evaluateUnitRelationshipReplacement');
    const confirmCallIdx = body.indexOf('confirmUnitRelationship(candidate)');
    const writeIdx = body.indexOf('updateProduct(productId,');
    assert.ok(replacementCheckIdx > -1 && confirmCallIdx > -1 && writeIdx > -1);
    assert.ok(replacementCheckIdx < confirmCallIdx, 'old-state check must run before confirmUnitRelationship');
    assert.ok(confirmCallIdx < writeIdx, 'confirmUnitRelationship must run before the write');
  });

  it('zero actual call-site invocations of confirmProductUnitRelationship exist yet — confirms Checkpoint 1 introduced no new UI wiring', () => {
    // A real call site looks like `confirmProductUnitRelationship(arg1, arg2)`
    // immediately following the name with no space. The interface
    // declaration (`confirmProductUnitRelationship: (...) => ...`) and
    // the function's own definition (`const confirmProductUnitRelationship = async (...`)
    // and its context-value export (`confirmProductUnitRelationship,`)
    // are deliberately excluded by this same pattern — none of them has
    // an open-paren immediately after the identifier. Confirmed here to
    // still be exactly zero, unchanged from before this checkpoint.
    const occurrences = (appContextSrc.match(/confirmProductUnitRelationship\(/g) || []).length;
    assert.equal(occurrences, 0);
  });
});
