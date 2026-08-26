// [Feature — "did you mean an existing product?" suggestions]
// See apps/tenant/src/lib/productNameSimilarity.ts's own header for the
// full owner-reported scenario this exists for: a receipt scanned by
// Smart Stock Entry read "Maquina Bic 1×2 emb" while the same real
// product already existed in the catalog as "Máquina Bic 1x2" —
// neither the codebase's exact-match rule nor the existing, narrower,
// supplier-scoped Supplier-Wording candidate detection recognized
// these as the same product.
//
// Pure functions, no Firestore/DOM dependency — runs directly under
// Node's built-in test runner.
//
// HOW TO RUN:
//   npx tsx --test tests/product-name-similarity.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  normalizeForSimilarity,
  tokenize,
  computeNameSimilarity,
  findSimilarProducts,
} from '../apps/tenant/src/lib/productNameSimilarity';

describe('normalizeForSimilarity', () => {
  it('lowercases and strips accents, matching the shared normalize() behavior', () => {
    assert.equal(normalizeForSimilarity('Máquina'), 'maquina');
  });

  it('treats the × multiplication sign as the letter x', () => {
    assert.equal(normalizeForSimilarity('1×2'), '1x2');
  });

  it('collapses any run of punctuation/symbols into a single space boundary', () => {
    assert.equal(normalizeForSimilarity('Coca-Cola, 1.5L'), 'coca cola 1 5l');
  });

  it('trims and collapses whitespace', () => {
    assert.equal(normalizeForSimilarity('  Óleo   Fula  '), 'oleo fula');
  });
});

describe('tokenize', () => {
  it('splits a normalized name into its word tokens', () => {
    assert.deepEqual(tokenize('maquina bic 1x2 emb'), ['maquina', 'bic', '1x2', 'emb']);
  });

  it('returns an empty array for an empty string', () => {
    assert.deepEqual(tokenize(''), []);
  });
});

describe('computeNameSimilarity', () => {
  it('THE OWNER-REPORTED CASE: "Maquina Bic 1×2 emb" vs "Máquina Bic 1x2" scores well above the default 0.5 threshold', () => {
    const score = computeNameSimilarity('Maquina Bic 1×2 emb', 'Máquina Bic 1x2');
    // tokens: {maquina,bic,1x2,emb} vs {maquina,bic,1x2} -> intersection 3, union 4 -> 0.75
    assert.ok(score >= 0.5, `Expected score >= 0.5, got ${score}`);
    assert.equal(Math.round(score * 100) / 100, 0.75);
  });

  it('is exactly 1 for genuinely identical names (after normalization)', () => {
    assert.equal(computeNameSimilarity('Água Mineral 1.5L', 'agua mineral 1.5l'), 1);
  });

  it('is exactly 0 for completely unrelated names', () => {
    assert.equal(computeNameSimilarity('Arroz Branco 5kg', 'Sabão em Pó'), 0);
  });

  it('is 0 when either input is blank', () => {
    assert.equal(computeNameSimilarity('', 'Arroz'), 0);
    assert.equal(computeNameSimilarity('Arroz', ''), 0);
  });

  it('a single shared short/common word among several distinct ones scores low, not a false high match', () => {
    // "de" is the only shared token; 1 shared out of a 7-word combined
    // union should score well under the 0.5 threshold used by
    // findSimilarProducts' default.
    const score = computeNameSimilarity('Farinha de Trigo Premium', 'Óleo de Soja Especial');
    assert.ok(score < 0.5, `Expected a low score for mostly-unrelated names, got ${score}`);
  });
});

describe('findSimilarProducts', () => {
  const catalog = [
    { id: 'p1', name: 'Máquina Bic 1x2' },
    { id: 'p2', name: 'Arroz Branco 5kg' },
    { id: 'p3', name: 'Máquina Bic 1x2 Nova' },
    { id: 'p4', name: 'Sabão em Pó' },
  ];

  it('THE OWNER-REPORTED CASE: finds the existing product for the scanned near-miss name', () => {
    const results = findSimilarProducts('Maquina Bic 1×2 emb', catalog);
    const ids = results.map((r) => r.id);
    assert.ok(ids.includes('p1'), 'Expected "Máquina Bic 1x2" to be suggested');
  });

  it('sorts most-similar-first', () => {
    const results = findSimilarProducts('Máquina Bic 1x2', catalog);
    assert.ok(results.length >= 1);
    // p1 is an exact normalized match (score 1), should sort ahead of
    // p3's partial match if p3 also clears the threshold.
    assert.equal(results[0].id, 'p1');
    assert.equal(results[0].score, 1);
  });

  it('returns an empty array for a blank query', () => {
    assert.deepEqual(findSimilarProducts('', catalog), []);
    assert.deepEqual(findSimilarProducts('   ', catalog), []);
  });

  it('returns an empty array when nothing clears the threshold', () => {
    const results = findSimilarProducts('Detergente Líquido Concentrado', catalog);
    assert.deepEqual(results, []);
  });

  it('respects a custom threshold', () => {
    // "Sabão em Pó" vs "Sabão" alone: tokens {sabao,em,po} vs {sabao} ->
    // intersection 1, union 3 -> ~0.33, below the default 0.5 but above
    // a lowered custom threshold.
    const defaultResults = findSimilarProducts('Sabão', catalog);
    assert.deepEqual(defaultResults.map((r) => r.id), []);
    const loweredThresholdResults = findSimilarProducts('Sabão', catalog, { threshold: 0.3 });
    assert.ok(loweredThresholdResults.some((r) => r.id === 'p4'));
  });

  it('respects maxResults, keeping only the top N', () => {
    const manyMatches = [
      { id: 'a', name: 'Café Torrado' },
      { id: 'b', name: 'Café Torrado Especial' },
      { id: 'c', name: 'Café Torrado Premium' },
      { id: 'd', name: 'Café Torrado Extra' },
    ];
    const results = findSimilarProducts('Café Torrado', manyMatches, { maxResults: 2 });
    assert.equal(results.length, 2);
  });

  it('never returns a score below the given threshold', () => {
    const results = findSimilarProducts('Maquina Bic 1×2 emb', catalog, { threshold: 0.5 });
    for (const r of results) {
      assert.ok(r.score >= 0.5);
    }
  });
});
