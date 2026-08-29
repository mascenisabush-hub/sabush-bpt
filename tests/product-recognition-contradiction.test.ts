// [Product Recognition Intelligence — Checkpoint 1] Tests for
// `detectSupplierWordingContradictions`
// (apps/tenant/src/lib/supplierWordingMatching.ts) — the standalone
// companion to `detectSupplierWordingCandidates` that exposes WHICH
// products were suppressed by the Contradiction Check, and why.
// Governing chain: same as product-recognition-spelling-variation.test.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/product-recognition-contradiction.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  detectSupplierWordingCandidates,
  detectSupplierWordingContradictions,
} from '../apps/tenant/src/lib/supplierWordingMatching';

describe('detectSupplierWordingContradictions', () => {
  it('reports a contradiction for a product that a positive ground would otherwise have proposed, but whose quantity/unit disagrees', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 1L' }];
    const contradictions = detectSupplierWordingContradictions('Coca Cola 2L', products);
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0].productId, 'p1');
    assert.equal(contradictions[0].reason, 'quantity-unit-mismatch');
  });

  it('reports nothing for a product with no positive ground at all — there is nothing to suppress or explain', () => {
    const products = [{ id: 'p1', name: 'Massa Cotovelo 1L' }];
    const contradictions = detectSupplierWordingContradictions('Sabao Azul 2L', products);
    assert.deepEqual(contradictions, []);
  });

  it('reports nothing when quantities agree', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const contradictions = detectSupplierWordingContradictions('Coka Cola 2L', products);
    assert.deepEqual(contradictions, []);
  });

  it('is exactly the complement of detectSupplierWordingCandidates\'s own suppression: the contradicted product never appears in the candidates array', () => {
    const products = [
      { id: 'p1', name: 'Coca Cola 1L' }, // contradicted
      { id: 'p2', name: 'Coca Cola Zero 2L' }, // genuinely unrelated, no ground at all
    ];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2L', products);
    const contradictions = detectSupplierWordingContradictions('Coca Cola 2L', products);
    assert.deepEqual(candidates.map((c) => c.productId), []);
    assert.deepEqual(contradictions.map((c) => c.productId), ['p1']);
  });

  it('does not cross-contaminate across multiple candidate products — only the actually-contradicted one is reported', () => {
    const products = [
      { id: 'p1', name: 'Coca Cola 1L' }, // contradicted (2L vs 1L)
      { id: 'p2', name: 'Coka Cola 2L Diet' }, // NOT contradicted (quantities agree), a spelling-variation candidate
    ];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2L', products);
    const contradictions = detectSupplierWordingContradictions('Coca Cola 2L', products);
    assert.deepEqual(contradictions.map((c) => c.productId), ['p1']);
    assert.ok(candidates.some((c) => c.productId === 'p2'));
    assert.ok(!candidates.some((c) => c.productId === 'p1'));
  });
});
