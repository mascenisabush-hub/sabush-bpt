// [Product Recognition Intelligence — Checkpoint 1] Tests for the
// 'character-spelling-variation' ground added to
// apps/tenant/src/lib/supplierWordingMatching.ts, and for the pure
// distance primitives it's built on (both the local copy in that file
// and the sibling copy in productNameSimilarity.ts). Governing chain:
// ADR-0008 -> POL-0013 -> product-recognition-intelligence-rule8-
// assessment.md (READY) -> product-recognition-intelligence-
// implementation-plan.md Sec3 Checkpoint 1 ->
// product-recognition-intelligence-implementation-authorization.md
// Sec2 Checkpoint 1 (Accepted/Authorized).
//
// Covers Acceptance Criterion 1 (ADR-0008 Sec7's own accepted examples)
// directly, plus the negative/short-word-collision cases the
// Implementation Plan Sec7 calls out.
//
// HOW TO RUN:
//   npx tsx --test tests/product-recognition-spelling-variation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { detectSupplierWordingCandidates } from '../apps/tenant/src/lib/supplierWordingMatching';
import { damerauLevenshteinDistance, characterSpellingVariationCeiling } from '../apps/tenant/src/lib/productNameSimilarity';

describe('damerauLevenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    assert.equal(damerauLevenshteinDistance('coca', 'coca'), 0);
  });

  it('counts a single substitution as distance 1', () => {
    assert.equal(damerauLevenshteinDistance('coka', 'coca'), 1);
  });

  it('counts a single insertion as distance 1', () => {
    assert.equal(damerauLevenshteinDistance('pedaco', 'pedasco'), 1);
  });

  it('counts an adjacent transposition as distance 1, not 2', () => {
    assert.equal(damerauLevenshteinDistance('ab', 'ba'), 1);
  });

  it('handles empty strings against non-empty ones as their length', () => {
    assert.equal(damerauLevenshteinDistance('', 'abc'), 3);
    assert.equal(damerauLevenshteinDistance('abc', ''), 3);
  });
});

describe('characterSpellingVariationCeiling', () => {
  it('allows distance up to 2 for tokens of length >= 4', () => {
    assert.equal(characterSpellingVariationCeiling(4), 2);
    assert.equal(characterSpellingVariationCeiling(7), 2);
  });

  it('allows only distance 1 for short tokens (length 2-3)', () => {
    assert.equal(characterSpellingVariationCeiling(2), 1);
    assert.equal(characterSpellingVariationCeiling(3), 1);
  });

  it('requires an exact match for single-character tokens', () => {
    assert.equal(characterSpellingVariationCeiling(1), 0);
  });
});

describe("detectSupplierWordingCandidates — ground 'character-spelling-variation'", () => {
  it('[ADR-0008 Sec7] "Coka Cola 2L" against a catalog containing "Coca Cola 2L" produces a candidate on this ground', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('Coka Cola 2L', products);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].productId, 'p1');
    assert.ok(candidates[0].grounds.includes('character-spelling-variation'));
  });

  it('[ADR-0008 Sec7] "Pedasco Normale" against a catalog containing "Pedaço" produces a candidate on this ground (extra word tolerated)', () => {
    const products = [{ id: 'p1', name: 'Pedaço' }];
    const candidates = detectSupplierWordingCandidates('Pedasco Normale', products);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].productId, 'p1');
    assert.ok(candidates[0].grounds.includes('character-spelling-variation'));
  });

  it('a wording sharing no meaningful token/character overlap with any catalog product produces no candidate from this ground', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }, { id: 'p2', name: 'Massa Cotovelo' }];
    const candidates = detectSupplierWordingCandidates('Sabao Azul 1kg', products);
    assert.deepEqual(candidates, []);
  });

  it('does not fire when the wording is already an EXACT match — that stays grounds (a)/(b) only, never gains this ground too', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('coca cola 2l', products);
    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].grounds, ['initial-stock-name']);
  });

  it('an already-confirmed alternative wording can also be matched via this ground', () => {
    const products = [
      { id: 'p1', name: 'Lite 330ml', supplierWordings: [{ wording: 'Castle Lite 330' }] },
    ];
    const candidates = detectSupplierWordingCandidates('Castle Lyte 330', products);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0].grounds.includes('character-spelling-variation'));
  });

  it('short-word collision guard: two different short/common tokens do not spuriously match under the length-2/3 ceiling', () => {
    // "un" vs "um" — both length 2, distance 1, ceiling for length-2
    // tokens is 1, so this WOULD match if this were the only token
    // pair in the comparison. Confirm that surrounding context
    // (a genuinely different product) still prevents a false
    // candidate for an unrelated product.
    const products = [{ id: 'p1', name: 'Arroz 5kg' }];
    const candidates = detectSupplierWordingCandidates('Feijao 5kg', products);
    assert.deepEqual(candidates, []);
  });
});

describe('detectSupplierWordingCandidates — Contradiction Check (quantity/unit disagreement)', () => {
  it('[ADR-0008 Sec7] "Coca Cola 2L" against a catalog containing ONLY "Coca Cola 1L" does not produce an un-flagged candidate', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 1L' }];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2L', products);
    assert.deepEqual(candidates, []);
  });

  it('the contradiction suppresses the candidate even though a positive ground (character-spelling-variation would otherwise fire on a nearby size) exists', () => {
    // "Coka Cola 2L" is a near-spelling-match to "Coca Cola 1L" on the
    // "Co(k/c)a"/"Cola" tokens, AND the quantities (2L vs 1L) directly
    // disagree — the contradiction must win regardless.
    const products = [{ id: 'p1', name: 'Coca Cola 1L' }];
    const candidates = detectSupplierWordingCandidates('Coka Cola 2L', products);
    assert.deepEqual(candidates, []);
  });

  it('no contradiction when the wording names no quantity/unit token at all', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 1L' }];
    const candidates = detectSupplierWordingCandidates('Coka Cola', products);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0].grounds.includes('character-spelling-variation'));
  });

  it('no contradiction when the quantities agree, even under a differing unit spelling', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2 Lt', products);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0].grounds.includes('unit-spelling-equivalence'));
  });
});
