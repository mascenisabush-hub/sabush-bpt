// [Product Recognition Intelligence — Checkpoint 2] Tests for
// abbreviation/synonym/translation recognition in
// apps/tenant/src/lib/supplierWordingMatching.ts. Governing chain:
// same as product-recognition-spelling-variation.test.ts.
//
// PRODUCTION TABLE STATE: ABBREVIATION_TABLE, SYNONYM_TABLE, and
// TRANSLATION_TABLE ship genuinely empty by default, per the
// Implementation Plan Sec3 Checkpoint 2's own proposal ("ship each
// table intentionally small and empty-by-default at first merge...
// entries added incrementally per real supplier/receipt evidence").
// This suite therefore covers TWO things: (1) against the real,
// currently-empty production tables, detectSupplierWordingCandidates
// never produces an abbreviation/synonym/translation candidate for any
// input (Acceptance Criterion 3's "with an empty table... no false
// candidate is introduced... under any input"); (2) the underlying
// matching MECHANISM (`canonicalizeViaTable`/`firesViaTable`, both
// exported specifically for this purpose) is proven correct against
// locally-constructed, in-test tables — including the exact
// Lixívia/Bleach example ADR-0008 Sec7 itself names — without
// requiring that example to be pre-populated into the shipped,
// empty-by-default production tables.
//
// HOW TO RUN:
//   npx tsx --test tests/product-recognition-naming-tables.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  detectSupplierWordingCandidates,
  canonicalizeViaTable,
  firesViaTable,
  ABBREVIATION_TABLE,
  SYNONYM_TABLE,
  TRANSLATION_TABLE,
} from '../apps/tenant/src/lib/supplierWordingMatching';

describe('production tables ship empty by default', () => {
  it('ABBREVIATION_TABLE, SYNONYM_TABLE, and TRANSLATION_TABLE are all empty', () => {
    assert.deepEqual(ABBREVIATION_TABLE, {});
    assert.deepEqual(SYNONYM_TABLE, {});
    assert.deepEqual(TRANSLATION_TABLE, {});
  });

  it('no abbreviation/synonym/translation candidate is ever produced against the current, empty production tables — under a variety of inputs', () => {
    const products = [
      { id: 'p1', name: 'Bleach 1L' },
      { id: 'p2', name: 'Detergente 500ml' },
      { id: 'p3', name: 'Sabao Azul' },
    ];
    for (const wording of ['Lixivia 1L', 'Lixívia 1L', 'Bleach 1L Novo', 'Sabao em Po', 'random text 12x']) {
      const candidates = detectSupplierWordingCandidates(wording, products);
      for (const c of candidates) {
        assert.ok(!c.grounds.includes('abbreviation-match'));
        assert.ok(!c.grounds.includes('synonym-match'));
        assert.ok(!c.grounds.includes('translation-match'));
      }
    }
  });
});

describe('canonicalizeViaTable', () => {
  it('is the identity function for an empty table', () => {
    assert.equal(canonicalizeViaTable('lixivia 1l', {}), 'lixivia 1l');
  });

  it('maps a word present in the table, leaves an unrecognized word unchanged', () => {
    const table = { lixivia: 'bleach' };
    assert.equal(canonicalizeViaTable('lixivia 1l', table), 'bleach 1l');
    assert.equal(canonicalizeViaTable('detergente 1l', table), 'detergente 1l');
  });
});

describe("firesViaTable — mechanism proof for 'translation-match' (ADR-0008 Sec7's own accepted example)", () => {
  it('[ADR-0008 Sec7] with a translation-table entry mapping "lixivia" -> "bleach", "Lixivia 1L" against a catalog product "Bleach 1L" fires', () => {
    const table = { lixivia: 'bleach' };
    const needle = 'lixivia 1l'; // already normalizeForCandidateDetection-shaped: lowercase, accent-folded, single-spaced
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'bleach 1l', undefined, table);
    assert.equal(fires, true);
  });

  it('does not fire when the raw strings are already byte-equal (that stays grounds (a)/(b) territory, not this ground)', () => {
    const table = { lixivia: 'bleach' };
    const needle = 'bleach 1l';
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'bleach 1l', undefined, table);
    assert.equal(fires, false);
  });

  it('fires against an already-confirmed alternative wording, not only Product.name', () => {
    const table = { lixivia: 'bleach' };
    const needle = 'lixivia 1l';
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'some other name', [{ wording: 'bleach 1l' }], table);
    assert.equal(fires, true);
  });

  it('an empty table never fires, for any input', () => {
    const needle = 'lixivia 1l';
    const needleCanonical = canonicalizeViaTable(needle, {});
    const fires = firesViaTable(needle, needleCanonical, 'bleach 1l', undefined, {});
    assert.equal(fires, false);
  });

  it('does not produce a false candidate for a genuinely unrelated product', () => {
    const table = { lixivia: 'bleach' };
    const needle = 'lixivia 1l';
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'massa cotovelo', undefined, table);
    assert.equal(fires, false);
  });
});

describe('firesViaTable — abbreviation/synonym shape (same mechanism, different table)', () => {
  it('an abbreviation-table entry fires the same way a translation-table entry does', () => {
    const table = { cx: 'caixa' }; // e.g. a common trade abbreviation for "caixa" (box)
    const needle = 'cx 12un';
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'caixa 12un', undefined, table);
    assert.equal(fires, true);
  });

  it('a synonym-table entry fires the same way', () => {
    const table = { refrigerante: 'soda' };
    const needle = 'refrigerante cola 2l';
    const needleCanonical = canonicalizeViaTable(needle, table);
    const fires = firesViaTable(needle, needleCanonical, 'soda cola 2l', undefined, table);
    assert.equal(fires, true);
  });
});
