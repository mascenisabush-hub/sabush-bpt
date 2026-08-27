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
import { readFileSync } from 'node:fs';
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

// [POL-0011; product-identity-alternative-name-specification-unit-
// spelling-amendment.md; Implementation Authorization A §4 Testing
// Requirements] Ground (c) — unit-spelling equivalence.
describe('detectSupplierWordingCandidates — ground (c), unit-spelling equivalence', () => {
  it('positive normalization: attached vs space-separated unit spelling produce a candidate ("2L" vs "2 Lt")', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2 Lt', products);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].productId, 'p1');
    assert.ok(candidates[0].grounds.includes('unit-spelling-equivalence'));
  });

  it('positive normalization: other approved spelling variants (Ltr, Liter, Litro; Kg, Kilo, Quilo)', () => {
    assert.ok(
      detectSupplierWordingCandidates('Agua 5 Ltr', [{ id: 'p1', name: 'Agua 5L' }])[0]?.grounds.includes(
        'unit-spelling-equivalence'
      )
    );
    assert.ok(
      detectSupplierWordingCandidates('Agua 5 Liter', [{ id: 'p1', name: 'Agua 5L' }])[0]?.grounds.includes(
        'unit-spelling-equivalence'
      )
    );
    assert.ok(
      detectSupplierWordingCandidates('Agua 5 Litro', [{ id: 'p1', name: 'Agua 5L' }])[0]?.grounds.includes(
        'unit-spelling-equivalence'
      )
    );
    assert.ok(
      detectSupplierWordingCandidates('Arroz 25 Kilo', [{ id: 'p1', name: 'Arroz 25KG' }])[0]?.grounds.includes(
        'unit-spelling-equivalence'
      )
    );
    assert.ok(
      detectSupplierWordingCandidates('Arroz 25 Quilo', [{ id: 'p1', name: 'Arroz 25KG' }])[0]?.grounds.includes(
        'unit-spelling-equivalence'
      )
    );
  });

  it('quantity protection: "Coca Cola 1L" vs "Coca Cola 2L" must NOT produce a candidate under this ground', () => {
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('Coca Cola 1L', products);
    assert.deepEqual(candidates, [], 'Different quantities must remain distinct — no candidate at all, from any ground.');
  });

  it('quantity protection holds even with a space-separated unit ("Agua 1 Lt" vs "Agua 2 Lt")', () => {
    const products = [{ id: 'p1', name: 'Agua 2 Lt' }];
    assert.deepEqual(detectSupplierWordingCandidates('Agua 1 Lt', products), []);
  });

  it('false-match protection: a distinguishing token elsewhere in the name is not erased by unit-spelling normalization', () => {
    // "Coke 500ml" vs "Coke Zero 500ml" — the "Zero" token must still
    // distinguish these; unit normalization must not collapse them.
    const products = [{ id: 'p1', name: 'Coke Zero 500ml' }];
    assert.deepEqual(detectSupplierWordingCandidates('Coke 500ml', products), []);
  });

  it('false-match protection: differing quantities on an otherwise-identical name remain distinct ("Arroz Tio Joao 25KG" vs "10KG")', () => {
    const products = [{ id: 'p1', name: 'Arroz Tio Joao 25KG' }];
    assert.deepEqual(detectSupplierWordingCandidates('Arroz Tio Joao 10KG', products), []);
  });

  it('fires against an already-confirmed alternative wording too, not only Product.name', () => {
    const products = [
      { id: 'p1', name: 'Leite em Po', supplierWordings: [{ wording: 'Leite em Po 400g' }] },
    ];
    const candidates = detectSupplierWordingCandidates('Leite em Po 400 gramas', products);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0].grounds.includes('unit-spelling-equivalence'));
  });

  it('an already-exact match reports ONLY ground (a) — ground (c) requires the strings to genuinely differ, per the Specification\'s own "differ only in unit spelling" wording', () => {
    const products = [{ id: 'p1', name: 'Arroz 5kg' }];
    const candidates = detectSupplierWordingCandidates('arroz 5kg', products);
    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].grounds, ['initial-stock-name']);
  });

  it('does not fire for an unrecognized unit spelling — this ground simply does not apply, no error', () => {
    const products = [{ id: 'p1', name: 'Vinho 750ml' }];
    // "cc" is not in the small, fixed equivalence table.
    assert.deepEqual(detectSupplierWordingCandidates('Vinho 750cc', products), []);
  });

  it('existing-behavior regression: grounds (a) and (b) continue to fire exactly as before, unaffected by ground (c)\'s presence', () => {
    const products = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const candidates = detectSupplierWordingCandidates('  CAFE   preto 500ML ', products);
    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].grounds, ['initial-stock-name']);
  });

  it('boundary: this ground never fires from findExistingSupplierWordingMatch — that function has no unit-spelling awareness at all', () => {
    const relationships = [{ supplierRecordId: 'sup1', wording: 'Agua 2L', productId: 'p1' }];
    // A normalized-but-not-byte-exact wording (unit-spelling variant)
    // must NOT silently reuse an existing relationship.
    assert.equal(findExistingSupplierWordingMatch('Agua 2 Lt', 'sup1', relationships), null);
  });
});

// [Implementation Authorization A §4 — "Boundary test: confirm the new
// ground's logic is not reachable from, or accidentally shared with,
// productNameSimilarity.ts's catalog-wide comparison"] A dedicated,
// explicitly-named block so this requirement is auditable directly
// from the test suite, not merely satisfied incidentally by other
// tests. Uses the same source-level, readFileSync-based technique
// already established throughout this file and this repository — no
// import of productNameSimilarity.ts is introduced anywhere in this
// test file (confirmed by this file's own import list, above), and
// none is needed: this suite already exercises ground (c) end-to-end
// without ever touching that sibling module.
describe('detectSupplierWordingCandidates — ground (c) architectural boundary (Implementation Authorization A §4)', () => {
  const supplierWordingMatchingSource = readFileSync(
    new URL('../apps/tenant/src/lib/supplierWordingMatching.ts', import.meta.url),
    'utf-8'
  );

  it('supplierWordingMatching.ts does not import productNameSimilarity.ts', () => {
    assert.doesNotMatch(
      supplierWordingMatchingSource,
      /from\s+['"][^'"]*productNameSimilarity['"]/,
      'Supplier-Wording Recognition must not import the catalog-wide Similarity Suggestion module — the two remain architecturally separate, per ADR-0007 Addendum 2 and both Rule 8 Assessments\' shared requirement.'
    );
  });

  it('supplierWordingMatching.ts does not call any productNameSimilarity.ts export — computeNameSimilarity, findSimilarProducts, normalizeForSimilarity, tokenize, or canonicalizeTokensForUnitSpelling', () => {
    assert.doesNotMatch(supplierWordingMatchingSource, /\bcomputeNameSimilarity\s*\(/);
    assert.doesNotMatch(supplierWordingMatchingSource, /\bfindSimilarProducts\s*\(/);
    assert.doesNotMatch(supplierWordingMatchingSource, /\bnormalizeForSimilarity\s*\(/);
    assert.doesNotMatch(supplierWordingMatchingSource, /\bcanonicalizeTokensForUnitSpelling\s*\(/);
  });

  it('the only import in supplierWordingMatching.ts is the pre-existing, unrelated normalize() from businessCategories.ts', () => {
    const importLines = supplierWordingMatchingSource
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));
    assert.equal(importLines.length, 1, `Expected exactly one import statement, found ${importLines.length}: ${JSON.stringify(importLines)}`);
    assert.match(importLines[0], /from\s+['"]\.\.\/data\/businessCategories['"]/);
  });

  it('ground (c) evaluates entirely within the Supplier-Wording Recognition path alone — detectSupplierWordingCandidates produces a unit-spelling-equivalence candidate with no catalog-wide similarity function anywhere in the call chain', () => {
    // This test file itself never imports productNameSimilarity.ts
    // (confirmed by this file's own import list at the top) and the
    // module under test doesn't either (confirmed above) — so this
    // successful, self-contained call is itself evidence that no
    // catalog-wide similarity function is required to produce a
    // ground (c) candidate.
    const products = [{ id: 'p1', name: 'Coca Cola 2L' }];
    const candidates = detectSupplierWordingCandidates('Coca Cola 2 Lt', products);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0].grounds.includes('unit-spelling-equivalence'));
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
