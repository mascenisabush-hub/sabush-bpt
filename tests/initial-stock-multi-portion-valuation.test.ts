// Increment B, Checkpoint B5 — proves the EXISTING, unmodified
// normalizeStockCountItems (apps/tenant/src/utils/stockCount.ts) already
// correctly supports §16's multi-portion, mixed-unit/mixed-price-basis
// Initial Stock valuation requirement, with ZERO code change — exactly
// Rule 8 Assessment Finding 4's conclusion ("the existing summation
// logic already combines their totalValue contributions correctly with
// zero code change"). This suite adds the specific same-product,
// multiple-rows, different-unit/different-price-basis coverage the
// existing tests/initial-stock-confirmation.test.ts suite does not
// already prove (that suite covers the confirmation data-flow
// contract, not this particular valuation scenario).
//
// SCOPE: normalizeStockCountItems is a pure function — no Firestore, no
// UI. This file makes NO changes to stockCount.ts; it only exercises
// the function that already exists.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-multi-portion-valuation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeStockCountItems } from '../apps/tenant/src/utils/stockCount';

describe('normalizeStockCountItems — §16 canonical worked example (Pretinha)', () => {
  it('two rows for the same product, different units AND different price bases, sum correctly', () => {
    const result = normalizeStockCountItems([
      { productName: 'Pretinha', quantity: 6, unit: 'Cx', costPrice: 820 }, // 6 Cx @ 820 MZN/Cx
      { productName: 'Pretinha', quantity: 4, unit: 'Un', costPrice: 50 }, // 4 Un @ 50 MZN/Un instead
    ]);

    assert.equal(result.items.length, 2, 'both rows are preserved as SEPARATE items — never merged into one row');

    // Requirement 2: different units on those rows are preserved.
    assert.equal(result.items[0].unit, 'Cx');
    assert.equal(result.items[1].unit, 'Un');

    // Requirement 3: different valuation price bases are preserved per row.
    assert.equal(result.items[0].costPrice, 820);
    assert.equal(result.items[1].costPrice, 50);

    // Requirement 4: existing normalization sums the portions correctly.
    assert.equal(result.items[0].totalValue, 4920); // 6 * 820
    assert.equal(result.items[1].totalValue, 200); // 4 * 50
    assert.equal(result.totalValue, 5120); // 4920 + 200 — combined as ONE product's count
  });

  it('both rows retain the identical productName, confirming they are treated as ONE product, not two', () => {
    const result = normalizeStockCountItems([
      { productName: 'Pretinha', quantity: 6, unit: 'Cx', costPrice: 820 },
      { productName: '  Pretinha  ', quantity: 4, unit: 'Un', costPrice: 50 }, // owner re-types with incidental whitespace
    ]);
    assert.equal(result.items[0].productName, 'Pretinha');
    assert.equal(result.items[1].productName, 'Pretinha'); // trimmed identically — same product identity
  });

  it('three or more portions of the same product all contribute independently to the combined total', () => {
    const result = normalizeStockCountItems([
      { productName: 'Pretinha', quantity: 6, unit: 'Cx', costPrice: 820 },
      { productName: 'Pretinha', quantity: 4, unit: 'Un', costPrice: 50 },
      { productName: 'Pretinha', quantity: 2, unit: 'Emb', costPrice: 300 },
    ]);
    assert.equal(result.items.length, 3);
    assert.equal(result.totalValue, 4920 + 200 + 600);
  });

  it('sellingPrice may also differ per portion without affecting totalValue (cost-basis rule unchanged, requirement 6)', () => {
    const result = normalizeStockCountItems([
      { productName: 'Pretinha', quantity: 6, unit: 'Cx', costPrice: 820, sellingPrice: 950 },
      { productName: 'Pretinha', quantity: 4, unit: 'Un', costPrice: 50, sellingPrice: 65 },
    ]);
    assert.equal(result.items[0].sellingPrice, 950);
    assert.equal(result.items[1].sellingPrice, 65);
    // totalValue is STILL cost-basis only — sellingPrice never enters it,
    // exactly as before this checkpoint (BDR-0009's existing rule).
    assert.equal(result.totalValue, 4920 + 200);
  });

  it('a same-product multi-portion count coexists correctly alongside unrelated single-portion products', () => {
    const result = normalizeStockCountItems([
      { productName: 'Arroz', quantity: 10, unit: 'Saco', costPrice: 500 },
      { productName: 'Pretinha', quantity: 6, unit: 'Cx', costPrice: 820 },
      { productName: 'Pretinha', quantity: 4, unit: 'Un', costPrice: 50 },
      { productName: 'Feijão', quantity: 3, unit: 'Saco', costPrice: 300 },
    ]);
    assert.equal(result.items.length, 4);
    assert.equal(result.totalValue, 5000 + 4920 + 200 + 900);
  });
});
