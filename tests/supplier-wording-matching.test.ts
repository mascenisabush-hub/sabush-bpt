// [Supplier-Wording Recognition — Checkpoint 2] Tests for the two pure
// matching functions in apps/tenant/src/lib/supplierWordingMatching.ts.
//
// SCOPE: proves candidate detection and reuse matching against plain
// in-memory values only. Neither function under test touches Firestore
// or UI, and neither is wired into Add Stock or Smart Stock Entry yet —
// this suite tests the functions in isolation, matching the
// Implementation Authorization's own Checkpoint 2 boundary.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-matching.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  detectSupplierWordingCandidates,
  findExistingSupplierWordingMatch,
} from '../apps/tenant/src/lib/supplierWordingMatching';

describe('detectSupplierWordingCandidates', () => {
  it('returns no candidates for an empty or whitespace-only wording', () => {
    const products = [{ id: 'p1', name: 'Lite 330ml' }];
    assert.deepEqual(detectSupplierWordingCandidates('', products), []);
    assert.deepEqual(detectSupplierWordingCandidates('   ', products), []);
  });

  it('returns no candidates against an empty product list', () => {
    assert.deepEqual(detectSupplierWordingCandidates('Castle Lite 330', []), []);
  });

  it('matches on normalization-level similarity to Product.name (case, spacing, accent)', () => {
    const products = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const candidates = detectSupplierWordingCandidates('  CAFE   preto 500ML ', products);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].productId, 'p1');
    assert.deepEqual(candidates[0].grounds, ['initial-stock-name']);
  });

  it('does not match on genuinely different wording (no semantic matching)', () => {
    const products = [{ id: 'p1', name: 'Massa Cotovelo' }];
    // Discovery Report's own semantic (non-textual) example — must NOT match,
    // per POL-0007's explicit statement that this Policy does not resolve
    // genuinely semantic association.
    const candidates = detectSupplierWordingCandidates('Bela 400g', products);
    assert.deepEqual(candidates, []);
  });

  it('matches on normalization-level similarity to an already-confirmed alternative wording, regardless of which supplier recorded it', () => {
    const products = [
      {
        id: 'p1',
        name: 'Lite 330ml',
        supplierWordings: [
          { wording: 'Castle-Lite' },
          { wording: 'Castle Lite 330' },
        ],
      },
    ];
    const candidates = detectSupplierWordingCandidates('castle lite 330', products);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].productId, 'p1');
    assert.deepEqual(candidates[0].grounds, ['existing-alternative-wording']);
  });

  it('reports both grounds when a wording matches Product.name AND an existing alternative wording', () => {
    const products = [
      {
        id: 'p1',
        name: 'Agua 500ml',
        supplierWordings: [{ wording: 'agua 500ml' }],
      },
    ];
    const candidates = detectSupplierWordingCandidates('Agua 500ml', products);
    assert.equal(candidates.length, 1);
    assert.deepEqual(
      new Set(candidates[0].grounds),
      new Set(['initial-stock-name', 'existing-alternative-wording'])
    );
  });

  it('returns multiple plausible candidates together, unranked, when more than one product matches', () => {
    const products = [
      { id: 'p1', name: 'Refresco 1L', supplierWordings: [{ wording: 'Refresco 1L' }] },
      { id: 'p2', name: 'Refresco 1L' },
    ];
    const candidates = detectSupplierWordingCandidates('refresco 1l', products);
    assert.equal(candidates.length, 2);
    const ids = candidates.map((c) => c.productId).sort();
    assert.deepEqual(ids, ['p1', 'p2']);
  });

  it('treats a product with no supplierWordings array as having zero alternative wordings, not an error', () => {
    const products = [{ id: 'p1', name: 'Arroz 5kg' }];
    assert.deepEqual(detectSupplierWordingCandidates('arroz 5kg', products)[0].grounds, [
      'initial-stock-name',
    ]);
  });
});

describe('findExistingSupplierWordingMatch', () => {
  it('returns null for an empty or whitespace-only wording', () => {
    assert.equal(findExistingSupplierWordingMatch('', 'sup1', []), null);
    assert.equal(findExistingSupplierWordingMatch('   ', 'sup1', []), null);
  });

  it('returns null when no relationship exists for that supplier/wording pair', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Castle-Lite', productId: 'p1' }];
    assert.equal(findExistingSupplierWordingMatch('Castle-Lite', 'sup2', relationships), null);
  });

  it('matches byte-exact (trimmed) wording for the same supplier', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Castle-Lite', productId: 'p1' }];
    const result = findExistingSupplierWordingMatch('  Castle-Lite  ', 'sup1', relationships);
    assert.deepEqual(result, { productId: 'p1' });
  });

  it('does NOT match on case variation — reuse is stricter than candidate detection', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Castle-Lite', productId: 'p1' }];
    assert.equal(findExistingSupplierWordingMatch('castle-lite', 'sup1', relationships), null);
  });

  it('does NOT match on accent variation — reuse is stricter than candidate detection', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Café Preto', productId: 'p1' }];
    assert.equal(findExistingSupplierWordingMatch('Cafe Preto', 'sup1', relationships), null);
  });

  it('does NOT match the same wording from a different supplier', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Castle-Lite', productId: 'p1' }];
    assert.equal(findExistingSupplierWordingMatch('Castle-Lite', 'sup-other', relationships), null);
  });

  it('scopes correctly when multiple suppliers have relationships for similarly-named products', () => {
    const relationships = [
      { supplierRecordId: 'sup1', wording: 'Lite 330', productId: 'p1' },
      { supplierRecordId: 'sup2', wording: 'Lite 330', productId: 'p2' },
    ];
    assert.deepEqual(findExistingSupplierWordingMatch('Lite 330', 'sup1', relationships), {
      productId: 'p1',
    });
    assert.deepEqual(findExistingSupplierWordingMatch('Lite 330', 'sup2', relationships), {
      productId: 'p2',
    });
  });
});
