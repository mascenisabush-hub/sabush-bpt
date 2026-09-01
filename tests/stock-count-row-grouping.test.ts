// Grouped Initial Stock UX — tests for groupRowsByProductName
// (apps/tenant/src/lib/stockCountPortionGrouping.ts), the pure
// function reshaping a flat rows array into product groups for
// InitialStockCountView.tsx's grouped renderer.
//
// SCOPE: proves the pure grouping function against plain in-memory row
// values only — no Firestore, no React harness. Does NOT re-test
// computePortionLabels, which is unchanged and separately covered by
// tests/stock-count-portion-grouping.test.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/stock-count-row-grouping.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { groupRowsByProductName, type PortionGroupableRow } from '../apps/tenant/src/lib/stockCountPortionGrouping';

const row = (id: string, productName: string): PortionGroupableRow => ({ id, productName });

describe('groupRowsByProductName — one product / one portion', () => {
  it('a single named row becomes a single group of one', () => {
    const groups = groupRowsByProductName([row('r1', 'Arroz')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].key, 'arroz');
    assert.equal(groups[0].displayName, 'Arroz');
    assert.deepEqual(groups[0].rows.map((r) => r.id), ['r1']);
  });
});

describe('groupRowsByProductName — one product / multiple portions', () => {
  it('two rows sharing a name become ONE group with two rows, in original order', () => {
    const groups = groupRowsByProductName([row('r1', 'Coca-Cola'), row('r2', 'Coca-Cola')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
    assert.deepEqual(groups[0].rows.map((r) => r.id), ['r1', 'r2']);
  });

  it('three rows sharing a name become one group with three rows', () => {
    const groups = groupRowsByProductName([row('r1', 'Coca-Cola'), row('r2', 'Coca-Cola'), row('r3', 'Coca-Cola')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 3);
  });
});

describe('groupRowsByProductName — mixed units (Cx + Un, Emb + Cx + Un)', () => {
  it('groups rows regardless of their own unit/quantity/price fields — grouping is name-only', () => {
    // PortionGroupableRow only carries id/productName; unit/quantity/
    // price live on the caller's own richer row type and are
    // deliberately irrelevant to this function — proven by grouping
    // succeeding with no such fields present at all.
    const groups = groupRowsByProductName([row('r1', 'Coca-Cola'), row('r2', 'Coca-Cola')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('groupRowsByProductName — same unit, different prices', () => {
  it('still groups purely by name, independent of any other field', () => {
    const groups = groupRowsByProductName([row('r1', 'Feijão'), row('r2', 'Feijão')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('groupRowsByProductName — two different products', () => {
  it('never merges rows with different names into one group', () => {
    const groups = groupRowsByProductName([row('r1', 'Arroz'), row('r2', 'Feijão')]);
    assert.equal(groups.length, 2);
    assert.deepEqual(groups.map((g) => g.displayName), ['Arroz', 'Feijão']);
  });

  it('preserves group first-appearance order even when interleaved', () => {
    const groups = groupRowsByProductName([
      row('r1', 'Arroz'),
      row('r2', 'Feijão'),
      row('r3', 'Arroz'),
      row('r4', 'Feijão'),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].displayName, 'Arroz');
    assert.deepEqual(groups[0].rows.map((r) => r.id), ['r1', 'r3']);
    assert.equal(groups[1].displayName, 'Feijão');
    assert.deepEqual(groups[1].rows.map((r) => r.id), ['r2', 'r4']);
  });
});

describe('groupRowsByProductName — case/whitespace insensitivity, display casing', () => {
  it('groups case-insensitively but keeps the FIRST row\'s own casing as displayName', () => {
    const groups = groupRowsByProductName([row('r1', 'Coca-Cola'), row('r2', 'COCA-COLA'), row('r3', 'coca-cola')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].displayName, 'Coca-Cola');
    assert.equal(groups[0].rows.length, 3);
  });

  it('trims incidental whitespace when computing the grouping key', () => {
    const groups = groupRowsByProductName([row('r1', '  Coca-Cola  '), row('r2', 'Coca-Cola')]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('groupRowsByProductName — blank/empty portion handling', () => {
  it('never groups two blank-name rows together — each is its own singleton group', () => {
    const groups = groupRowsByProductName([row('r1', ''), row('r2', '   '), row('r3', '')]);
    assert.equal(groups.length, 3);
    // [Bug fix — displayName snapping mid-typing] displayName is
    // deliberately the row's own raw, UNtrimmed productName (see this
    // library's own comment on why trimming here would disturb live
    // typing, e.g. a lone leading space) — only `key` (used for
    // grouping/matching) is trimmed. Row r2's real, untrimmed
    // productName is three spaces, not empty, so its group's
    // displayName must reflect that verbatim, even though its
    // (trimmed) key is still the same empty-string key every blank
    // row shares.
    const expectedDisplayNames = ['', '   ', ''];
    groups.forEach((g, i) => {
      assert.equal(g.key, '');
      assert.equal(g.displayName, expectedDisplayNames[i]);
      assert.equal(g.rows.length, 1);
    });
  });

  it('a blank row interleaved with named rows does not disturb the named groups', () => {
    const groups = groupRowsByProductName([row('r1', 'Arroz'), row('r2', ''), row('r3', 'Arroz')]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].displayName, 'Arroz');
    assert.equal(groups[0].rows.length, 2);
    assert.equal(groups[1].key, '');
    assert.equal(groups[1].rows.length, 1);
  });
});

describe('groupRowsByProductName — no mutation, no cloning', () => {
  it('does not mutate or reorder the input array', () => {
    const rows = [row('r1', 'Arroz'), row('r2', 'Feijão'), row('r3', 'Arroz')];
    const snapshot = JSON.stringify(rows);
    groupRowsByProductName(rows);
    assert.equal(JSON.stringify(rows), snapshot);
  });

  it('group.rows holds the SAME object references as the input, not copies', () => {
    const original = row('r1', 'Arroz');
    const groups = groupRowsByProductName([original]);
    assert.equal(groups[0].rows[0], original);
  });

  it('handles an empty rows array', () => {
    const groups = groupRowsByProductName([]);
    assert.deepEqual(groups, []);
  });
});

describe('groupRowsByProductName — large input (300+ products scale check)', () => {
  it('handles 300 distinct products plus scattered multi-portion products correctly', () => {
    const rows: PortionGroupableRow[] = [];
    for (let i = 0; i < 300; i++) {
      rows.push(row(`solo-${i}`, `Produto ${i}`));
    }
    // Interleave a few multi-portion products among the 300 singles.
    rows.push(row('mp-1', 'Coca-Cola'));
    rows.push(row('mp-2', 'Coca-Cola'));
    rows.push(row('mp-3', 'Coca-Cola'));

    const groups = groupRowsByProductName(rows);
    assert.equal(groups.length, 301); // 300 solo groups + 1 Coca-Cola group
    const cocaGroup = groups.find((g) => g.displayName === 'Coca-Cola');
    assert.ok(cocaGroup);
    assert.equal(cocaGroup!.rows.length, 3);
  });
});
