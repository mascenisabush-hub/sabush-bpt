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
import { readFileSync } from 'node:fs';
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

// [POL-0012; similarity-confirmation-threshold-specification.md,
// signal 3; Implementation Authorization B §5 Testing Requirements]
describe('computeNameSimilarity — signal 3, unit-spelling equivalence', () => {
  it('positive normalization: attached vs space-separated unit spelling raises similarity for an otherwise-identical name ("2L" vs "2 Lt")', () => {
    // Without signal 3: tokens {coca,cola,2l} vs {coca,cola,2,lt} ->
    // intersection 2 ("coca","cola"), union 5 -> 0.4 (below the
    // default 0.5 threshold). With signal 3, "2" + "lt" canonicalizes
    // to "2l", matching the other side's "2l" token exactly ->
    // intersection 3, union 3 -> 1.
    const score = computeNameSimilarity('Coca Cola 2L', 'Coca Cola 2 Lt');
    assert.equal(score, 1, `Expected the two unit spellings to canonicalize to an identical token set, got score ${score}`);
  });

  it('positive normalization: other approved spelling variants (Ltr, Liter, Litro; Kg, Kilo, Quilo)', () => {
    assert.equal(computeNameSimilarity('Agua 5L', 'Agua 5 Ltr'), 1);
    assert.equal(computeNameSimilarity('Agua 5L', 'Agua 5 Liter'), 1);
    assert.equal(computeNameSimilarity('Agua 5L', 'Agua 5 Litro'), 1);
    assert.equal(computeNameSimilarity('Arroz 25KG', 'Arroz 25 Kilo'), 1);
    assert.equal(computeNameSimilarity('Arroz 25KG', 'Arroz 25 Quilo'), 1);
  });

  it('quantity protection: "...1L" vs "...2L" name pairs must not become MORE similar under this signal than they already are today', () => {
    // Without signal 3: tokens {coca,cola,1l} vs {coca,cola,2l} ->
    // intersection 2, union 4 -> 0.5. Signal 3 must not change this —
    // "1l" and "2l" are both already-canonical attached tokens (their
    // own unit portion "l" needs no canonicalization), and the digits
    // "1"/"2" are never equated with each other under any code path.
    const score = computeNameSimilarity('Coca Cola 1L', 'Coca Cola 2L');
    assert.equal(score, 0.5, `Expected the pre-existing score to be unchanged, got ${score}`);
  });

  it('quantity protection holds for the space-separated form too ("...1 Lt" vs "...2 Lt")', () => {
    // Without signal 3: {coca,cola,1,lt} vs {coca,cola,2,lt} ->
    // intersection 3 ("coca","cola","lt"), union 5 -> 0.6. With
    // signal 3: "1"+"lt" -> "1l", "2"+"lt" -> "2l" -> {coca,cola,1l}
    // vs {coca,cola,2l} -> intersection 2, union 4 -> 0.5, i.e. the
    // signal must not treat "1 Lt" and "2 Lt" as MORE similar than
    // "1L"/"2L" already are — the quantity distinction is preserved
    // either way the unit is spelled.
    const score = computeNameSimilarity('Coca Cola 1 Lt', 'Coca Cola 2 Lt');
    assert.equal(score, 0.5, `Expected quantity distinction preserved, got ${score}`);
  });

  it('false-match protection: "Coke 500ml" vs "Coke Zero 500ml" — the distinguishing "Zero" token is unaffected', () => {
    // {coke,500ml} vs {coke,zero,500ml} -> intersection 2, union 3 ->
    // ~0.667, unchanged by signal 3 (500ml is already canonical on
    // both sides).
    const score = computeNameSimilarity('Coke 500ml', 'Coke Zero 500ml');
    assert.equal(Math.round(score * 1000) / 1000, 0.667);
  });

  it('false-match protection: "Arroz Tio Joao 25KG" vs "Arroz Tio Joao 10KG" — distinguishing quantity is unaffected', () => {
    // {arroz,tio,joao,25kg} vs {arroz,tio,joao,10kg} -> intersection
    // 3, union 5 -> 0.6, unchanged (both already-canonical attached
    // tokens with genuinely different quantities).
    const score = computeNameSimilarity('Arroz Tio Joao 25KG', 'Arroz Tio Joao 10KG');
    assert.equal(score, 0.6);
  });

  it('does not fire for an unrecognized unit spelling — falls back to the pre-existing token-set behavior, no error', () => {
    // "cc" is not in the small, fixed equivalence table — "750cc" and
    // "750 cc" are each left as their own tokens, exactly as they
    // would be without signal 3 at all.
    const withSpace = computeNameSimilarity('Vinho 750 cc', 'Vinho 750cc');
    const bothAttached = computeNameSimilarity('Vinho 750cc', 'Vinho 750cc');
    assert.ok(withSpace < bothAttached, 'An unrecognized unit spelling must not be silently canonicalized.');
  });

  it('existing-behavior regression: the owner-reported case score is unchanged by this signal\'s presence', () => {
    const score = computeNameSimilarity('Maquina Bic 1×2 emb', 'Máquina Bic 1x2');
    assert.equal(Math.round(score * 100) / 100, 0.75);
  });

  it('existing-behavior regression: identical names still score exactly 1', () => {
    assert.equal(computeNameSimilarity('Água Mineral 1.5L', 'agua mineral 1.5l'), 1);
  });

  it('boundary: no write to Product.supplierWordings, and confirmSupplierWordingRelationship is never referenced by this module', () => {
    const source = readFileSync(new URL('../apps/tenant/src/lib/productNameSimilarity.ts', import.meta.url), 'utf-8');
    assert.doesNotMatch(source, /supplierWordings/);
    assert.doesNotMatch(source, /confirmSupplierWordingRelationship/);
  });
});

// [Implementation Authorization B §5 — "Confirmation-UI non-regression"]
// AddStockView.tsx is explicitly prohibited from being modified to
// produce or support this test (per the Authorization's own §3/§4
// boundary) — this test reads it read-only, exactly as
// tests/add-stock-similar-product-suggestions.test.ts's own established
// "source-structure coverage... this repository has no DOM/React render
// harness" convention already does for this same file. A literal
// byte-for-byte comparison of the ENTIRE file would be too brittle
// (unrelated edits elsewhere in this large component would false-fail
// it) and too broad (this requirement is about the SUGGESTION
// INTERACTION CONTRACT specifically, not the whole file) — so the
// narrowest valid assertion is a byte-for-byte comparison of exactly
// that one, uniquely-locatable JSX block: the suggestion banner's
// trigger condition through its closing tag. GOLDEN_SUGGESTION_BANNER_BLOCK
// below was captured verbatim (via a one-time, tool-assisted extraction,
// not hand-retyped) from AddStockView.tsx at the moment Track B's
// productNameSimilarity.ts change was completed — proving this signal
// 3 work did not alter the interaction contract by so much as one
// character, and will fail this test the moment it ever does.
describe('AddStockView.tsx suggestion banner — Confirmation-UI non-regression (Implementation Authorization B §5)', () => {
  const GOLDEN_SUGGESTION_BANNER_BLOCK = `{row.productName.trim() && !exactMatchExists && similarProducts.length > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[1px]" strokeWidth={2.25} />
                            <p className="text-[13px] text-amber-800 leading-snug">
                              {t('addStock.similarProduct.warning')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {similarProducts.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProductForTool(row.id, p.name)}
                                className="text-[12.5px] font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors duration-150"
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}`;

  function extractLiveSuggestionBannerBlock(): string {
    const source = readFileSync(new URL('../apps/tenant/src/components/AddStockView.tsx', import.meta.url), 'utf-8');
    const startMarker = '{row.productName.trim() && !exactMatchExists && similarProducts.length > 0 && (';
    const startIdx = source.indexOf(startMarker);
    assert.notEqual(startIdx, -1, 'Could not locate the suggestion banner\'s trigger condition — has it been renamed or removed?');
    const endMarker = '                      )}';
    const endIdx = source.indexOf(endMarker, startIdx);
    assert.notEqual(endIdx, -1, 'Could not locate the suggestion banner\'s closing tag after its trigger condition.');
    return source.slice(startIdx, endIdx + endMarker.length);
  }

  it('the suggestion banner\'s trigger condition, single select-button-per-suggestion interaction, and absence of any separate decline/different-product button are byte-for-byte unchanged', () => {
    const liveBlock = extractLiveSuggestionBannerBlock();
    assert.equal(
      liveBlock,
      GOLDEN_SUGGESTION_BANNER_BLOCK,
      'The suggestion banner\'s interaction contract has changed since this golden snapshot was captured. Per Implementation Authorization B §4, the catalog-wide unit-spelling signal must never be the occasion for changing this UI in either direction — if this change was intentional and separately authorized, update GOLDEN_SUGGESTION_BANNER_BLOCK to match; otherwise, this is exactly the regression this test exists to catch.'
    );
  });

  it('sanity check: the golden snapshot itself still contains exactly one interactive element (the select button) and zero decline/different-product controls, confirming the deferred POL-0003 conformance question remains untouched either way', () => {
    const buttonCount = (GOLDEN_SUGGESTION_BANNER_BLOCK.match(/<button\b/g) || []).length;
    assert.equal(buttonCount, 1, 'Expected exactly one <button> template per suggestion (the select action) inside this block.');
    assert.doesNotMatch(
      GOLDEN_SUGGESTION_BANNER_BLOCK,
      /decline|different.?product|ignore|dismiss/i,
      'Expected no separate decline/different-product/dismiss control — the deferred POL-0003 confirmation-experience conformance question (select-or-ignore, one button only) must remain exactly as open as it is today.'
    );
  });
});
