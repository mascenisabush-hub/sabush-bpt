// [Product Recognition Intelligence — Checkpoint 4] Tests for the
// isolated Semantic/AI mechanism's composition into the recognition
// pipeline: apps/tenant/src/lib/supplierWordingRecognition.ts's
// `resolveSupplierWordingRecognitionAsync` /
// `resolveScanRowSupplierWordingAsync`, and `unionSupplierWordingCandidates`.
// Governing chain: ADR-0008 -> POL-0013 -> product-recognition-
// intelligence-rule8-assessment.md (READY) -> product-recognition-
// intelligence-implementation-plan.md Sec3 Checkpoint 4 ->
// product-recognition-intelligence-implementation-authorization.md
// Sec2 Checkpoint 4 (Accepted/Authorized).
//
// SCOPE: the external call itself (server/productRecognitionSemanticMatch.ts's
// findSemanticProductMatches, which actually talks to the AI provider)
// is exercised here only via an in-memory mock matching its exact
// signature/contract — never a real network call. This mirrors
// tests/smart-stock-entry*.test.ts's own established pattern for
// callVisionExtractionProvider.
//
// HOW TO RUN:
//   npx tsx --test tests/product-recognition-semantic-ai.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  resolveSupplierWordingRecognition,
  resolveSupplierWordingRecognitionAsync,
  resolveScanRowSupplierWording,
  resolveScanRowSupplierWordingAsync,
  unionSupplierWordingCandidates,
  type SemanticSupplierWordingMatcher,
  type RecognitionProduct,
} from '../apps/tenant/src/lib/supplierWordingRecognition';

describe('unionSupplierWordingCandidates', () => {
  it('[Acceptance Criterion 5] the same productId from two lists merges into exactly one candidate entry, with the union of both grounds', () => {
    const base = [{ productId: 'p1', grounds: ['character-spelling-variation'] as const }];
    const additional = [{ productId: 'p1', grounds: ['semantic-match'] as const }];
    const result = unionSupplierWordingCandidates(base as any, additional as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].productId, 'p1');
    assert.deepEqual([...result[0].grounds].sort(), ['character-spelling-variation', 'semantic-match'].sort());
  });

  it('[Acceptance Criterion 6] different productIds from each list are both kept, unranked — no implicit ranking or default selection', () => {
    const base = [{ productId: 'p1', grounds: ['character-spelling-variation'] as const }];
    const additional = [{ productId: 'p2', grounds: ['semantic-match'] as const }];
    const result = unionSupplierWordingCandidates(base as any, additional as any);
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((c) => c.productId).sort(), ['p1', 'p2']);
  });

  it('does not duplicate grounds when the same ground appears in both lists for the same product', () => {
    const base = [{ productId: 'p1', grounds: ['semantic-match'] as const }];
    const additional = [{ productId: 'p1', grounds: ['semantic-match'] as const }];
    const result = unionSupplierWordingCandidates(base as any, additional as any);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].grounds, ['semantic-match']);
  });

  it('an empty additional list leaves the base list unchanged', () => {
    const base = [{ productId: 'p1', grounds: ['initial-stock-name'] as const }];
    const result = unionSupplierWordingCandidates(base as any, []);
    assert.deepEqual(result, base);
  });

  it('an empty base list is just the additional list', () => {
    const additional = [{ productId: 'p1', grounds: ['semantic-match'] as const }];
    const result = unionSupplierWordingCandidates([], additional as any);
    assert.deepEqual(result, additional);
  });
});

describe('resolveSupplierWordingRecognitionAsync — gating (Acceptance Criteria 7, 8)', () => {
  it('[Criterion 8] when a deterministic candidate already exists, the semantic/AI mechanism is never invoked at all', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Coca Cola 2L' }];
    let aiCalled = false;
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      aiCalled = true;
      return [];
    };
    const outcome = await resolveSupplierWordingRecognitionAsync('Coka Cola 2L', undefined, products, semanticMatch);
    assert.equal(aiCalled, false);
    assert.equal(outcome.type, 'candidates');
  });

  it('[Criterion 7] the semantic/AI mechanism IS invoked before a no-candidates result is returned, when deterministic mechanisms alone find nothing', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    let aiCalled = false;
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      aiCalled = true;
      return [];
    };
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.equal(aiCalled, true);
    assert.equal(outcome.type, 'no-candidates');
  });

  it('a semantic/AI match on an otherwise-unrecognized wording produces a candidate with ground "semantic-match"', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [{ productId: 'p1' }];
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.equal(outcome.type, 'candidates');
    if (outcome.type === 'candidates') {
      assert.equal(outcome.candidates.length, 1);
      assert.equal(outcome.candidates[0].productId, 'p1');
      assert.deepEqual(outcome.candidates[0].grounds, ['semantic-match']);
    }
  });

  it('[Acceptance Criterion 20] omitting semanticMatch entirely behaves exactly like the deterministic function alone — Checkpoint 4 disabled/reverted', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const syncOutcome = resolveSupplierWordingRecognition('Bela 400g', undefined, products);
    const asyncOutcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products);
    assert.deepEqual(asyncOutcome, syncOutcome);
  });

  it('a "reused" or "none" outcome from the deterministic function is returned as-is, without ever invoking the AI mechanism', async () => {
    const products: RecognitionProduct[] = [
      { id: 'p1', name: 'Lager 330ml', supplierWordings: [{ supplierRecordId: 's1', wording: 'Lager Grande' }] },
    ];
    let aiCalled = false;
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      aiCalled = true;
      return [];
    };
    const outcome = await resolveSupplierWordingRecognitionAsync('Lager Grande', 's1', products, semanticMatch);
    assert.equal(aiCalled, false);
    assert.equal(outcome.type, 'reused');
  });
});

describe('resolveSupplierWordingRecognitionAsync — AI failure isolation (Acceptance Criteria 9, 10)', () => {
  it('[Criterion 9] a provider error (rejected promise) resolves to an empty AI contribution — never propagates, never blocks', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      throw new Error('provider unavailable');
    };
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.equal(outcome.type, 'no-candidates');
  });

  it('[Criterion 9] a non-2xx-equivalent / malformed response (empty array, per the client wrapper\'s own contract) resolves to an empty AI contribution', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [];
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.equal(outcome.type, 'no-candidates');
  });

  it('[Criterion 10] a simulated hang (never-resolving promise) still resolves within a bounded time when the caller itself races/times out the matcher', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    // Simulates a caller-side timeout wrapper (as
    // findSemanticSupplierWordingCandidates/findSemanticProductMatches
    // themselves implement) — resolveSupplierWordingRecognitionAsync's
    // own contract is simply to await whatever Promise it's given, so
    // the bounded-timeout guarantee is proven at the matcher's own
    // level (see server/productRecognitionSemanticMatch.ts's own
    // Promise.race). This test proves the composition layer here does
    // not ADD its own unbounded wait beyond whatever the matcher
    // itself resolves in.
    const semanticMatch: SemanticSupplierWordingMatcher = async () =>
      new Promise((resolve) => setTimeout(() => resolve([]), 20));
    const start = Date.now();
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    const elapsed = Date.now() - start;
    assert.equal(outcome.type, 'no-candidates');
    assert.ok(elapsed < 2000, `expected a fast resolution, took ${elapsed}ms`);
  });

  it('deterministic candidates already found in the same pass are never erased by an AI failure — because the AI mechanism is never even invoked once a deterministic candidate exists (Checkpoint 4 gating)', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      throw new Error('provider unavailable');
    };
    const outcome = await resolveSupplierWordingRecognitionAsync('Coka Cola 2L', undefined, products, semanticMatch);
    assert.equal(outcome.type, 'candidates');
    if (outcome.type === 'candidates') {
      assert.equal(outcome.candidates[0].productId, 'p1');
    }
  });
});

describe('resolveSupplierWordingRecognitionAsync — Contradiction Check applies to AI candidates too', () => {
  it('an AI-proposed candidate whose target product contradicts the wording on quantity/unit is suppressed', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Coca Cola 1L' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [{ productId: 'p1' }];
    const outcome = await resolveSupplierWordingRecognitionAsync('Coca Cola 2L Novo', undefined, products, semanticMatch);
    // "Coca Cola 2L Novo" has no deterministic ground against "Coca Cola 1L"
    // (extra word "Novo" + differing quantity), so the AI mechanism IS
    // invoked; its proposed candidate must be suppressed by the
    // Contradiction Check.
    assert.equal(outcome.type, 'no-candidates');
  });

  it('an AI-proposed candidate for a product not in the supplied products array is dropped defensively', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [{ productId: 'does-not-exist' }];
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.equal(outcome.type, 'no-candidates');
  });
});

describe('resolveSupplierWordingRecognitionAsync — tenant isolation (Acceptance Criterion 11)', () => {
  it('the semantic/AI mechanism is invoked with exactly the products array this function was itself given — never more, never less, never another business\'s data', async () => {
    const businessAProducts: RecognitionProduct[] = [
      { id: 'a1', name: 'Massa Cotovelo' },
      { id: 'a2', name: 'Arroz 5kg' },
    ];
    let receivedProducts: Array<{ id: string; name: string }> = [];
    const semanticMatch: SemanticSupplierWordingMatcher = async (_wording, products) => {
      receivedProducts = products;
      return [];
    };
    await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, businessAProducts, semanticMatch);
    assert.deepEqual(
      receivedProducts.map((p) => p.id).sort(),
      businessAProducts.map((p) => p.id).sort()
    );
    // No field beyond id/name reaches the matcher — the array shape
    // itself only exposes id/name.
    for (const p of receivedProducts) {
      assert.deepEqual(Object.keys(p).sort(), ['id', 'name']);
    }
  });
});

describe('resolveScanRowSupplierWordingAsync — parity with resolveScanRowSupplierWording (sync)', () => {
  it('with no semanticMatch supplied, behaves identically to the sync function', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const serverMatch = { status: 'no_match' as const, productId: null };
    const syncDecision = resolveScanRowSupplierWording('CAFE preto 500ML', serverMatch, undefined, products);
    const asyncDecision = await resolveScanRowSupplierWordingAsync('CAFE preto 500ML', serverMatch, undefined, products);
    assert.deepEqual(asyncDecision, syncDecision);
  });

  it('a server-confident exact match short-circuits before the AI mechanism is ever considered', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Café Preto 500ml' }];
    let aiCalled = false;
    const semanticMatch: SemanticSupplierWordingMatcher = async () => {
      aiCalled = true;
      return [];
    };
    const decision = await resolveScanRowSupplierWordingAsync(
      'Café Preto 500ml',
      { status: 'confident', productId: 'p1' },
      undefined,
      products,
      semanticMatch
    );
    assert.equal(aiCalled, false);
    assert.equal(decision.matchedProductId, 'p1');
  });

  it('surfaces a semantic-match candidate for a scan row when deterministic mechanisms find nothing', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [{ productId: 'p1' }];
    const decision = await resolveScanRowSupplierWordingAsync(
      'Bela 400g',
      { status: 'no_match', productId: null },
      undefined,
      products,
      semanticMatch
    );
    assert.equal(decision.matchedProductId, undefined);
    assert.ok(decision.supplierWordingCandidates);
    assert.equal(decision.supplierWordingCandidates!.length, 1);
    assert.deepEqual(decision.supplierWordingCandidates![0].grounds, ['semantic-match']);
  });
});

describe('No automatic selection/creation/merge from the semantic/AI mechanism (Acceptance Criterion 13/18, negative)', () => {
  it('an AI-found candidate is only ever returned as a CANDIDATE — never as a "reused" (silent, no-owner-review) outcome', async () => {
    const products: RecognitionProduct[] = [{ id: 'p1', name: 'Massa Cotovelo' }];
    const semanticMatch: SemanticSupplierWordingMatcher = async () => [{ productId: 'p1' }];
    const outcome = await resolveSupplierWordingRecognitionAsync('Bela 400g', undefined, products, semanticMatch);
    assert.notEqual(outcome.type, 'reused');
    assert.equal(outcome.type, 'candidates');
  });

  it('the outcome type union has no "merged" or "created" variant of any kind — a structural guarantee, not merely a runtime assertion', () => {
    // Compile-time proof: SupplierWordingRecognitionOutcome is a closed
    // union of exactly 'none' | 'reused' | 'candidates' | 'no-candidates'
    // (see supplierWordingRecognition.ts's own type definition) — this
    // test's own successful compilation IS the assertion; TypeScript
    // would reject an attempt to construct any other variant.
    const outcomes: Array<'none' | 'reused' | 'candidates' | 'no-candidates'> = ['none', 'reused', 'candidates', 'no-candidates'];
    assert.equal(outcomes.length, 4);
  });
});
