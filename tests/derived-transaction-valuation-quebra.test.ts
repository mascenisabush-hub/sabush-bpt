// Increment B, Checkpoint B4 — tests for calculateDerivedTransactionValuation
// (apps/tenant/src/lib/purchaseToSellingConversion.ts), the live
// remaining-quantity / quebra-aware current derived valuation
// (Consolidated Specification §15, Rule 8 Assessment Finding 3, revised).
//
// SCOPE: proves the pure function against plain in-memory StockBatch/
// Quebra values only — no Firestore, no UI. Also directly re-verifies
// (rather than merely asserting by construction) that calculateBatch
// itself — the existing, authoritative Business Worth calculation —
// produces byte-for-byte identical results whether or not a batch
// carries a derivedSellingValuation, proving no second, competing
// valuation engine was introduced.
//
// HOW TO RUN:
//   npx tsx --test tests/derived-transaction-valuation-quebra.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateDerivedTransactionValuation,
  buildDerivedSellingValuationSnapshot,
} from '../apps/tenant/src/lib/purchaseToSellingConversion';
import { calculateBatch } from '../apps/tenant/src/utils/calculations';
import type { StockBatch, Quebra, StockBatchDerivedSellingValuation, UnitRelationship } from '../apps/tenant/src/types';

// Canonical example, exactly as the governing prompt states it:
// 3 Cx, 1 Cx = 24 Un, 60 MZN/Un -> frozen rate 1,440 MZN/Cx.
const frozenSnapshot: StockBatchDerivedSellingValuation = {
  ratePerPurchaseUnit: 1440,
  sellingUnit: 'Un',
  sellingUnitPrice: 60,
  unitRelationshipSnapshot: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  derivedAt: '2026-08-01T00:00:00.000Z',
};

const baseBatch: StockBatch = {
  id: 'batch-1',
  productId: 'prod-1',
  dateEntered: '2026-08-01',
  quantity: 3,
  unit: 'Cx',
  costPrice: 1250,
  sellingPrice: 1440, // an ordinary, owner-set reference figure — deliberately ALSO 1,440 here to make case 10 below a meaningful test (see its own comment), not evidence of any coupling between the two fields
  status: 'open',
  createdAt: '2026-08-01T00:00:00.000Z',
};

const batchWithSnapshot: StockBatch = { ...baseBatch, derivedSellingValuation: frozenSnapshot };
const batchWithoutSnapshot: StockBatch = { ...baseBatch }; // no derivedSellingValuation at all — pre-B3 batch, or product had no confirmed Product Memory at commit time

const quebra = (batchId: string, quantityLost: number, id = 'q-' + Math.random()): Quebra => ({
  id,
  batchId,
  productId: 'prod-1',
  date: '2026-08-05',
  quantityLost,
  reason: 'test',
  createdAt: '2026-08-05T00:00:00.000Z',
});

describe('calculateDerivedTransactionValuation — requirement 1: no snapshot, no fabricated valuation', () => {
  it('returns null when the batch has no derivedSellingValuation at all', () => {
    assert.equal(calculateDerivedTransactionValuation(batchWithoutSnapshot, []), null);
  });

  it('returns null even when quebras exist for a batch with no derivedSellingValuation', () => {
    assert.equal(calculateDerivedTransactionValuation(batchWithoutSnapshot, [quebra('batch-1', 1)]), null);
  });
});

describe('calculateDerivedTransactionValuation — requirement 2: no quebra, full quantity', () => {
  it('3 Cx x 1,440 MZN/Cx = 4,320 MZN', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, []);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 3);
    assert.equal(result!.currentDerivedSellingValue, 4320);
  });
});

describe('calculateDerivedTransactionValuation — requirements 3-5: quebra reduces value proportionally', () => {
  it('3 Cx with 1 Cx quebra -> remaining 2 Cx -> 2,880 MZN', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 1)]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 2);
    assert.equal(result!.currentDerivedSellingValue, 2880);
  });

  it('3 Cx with 2 Cx quebra -> remaining 1 Cx -> 1,440 MZN', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 2)]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 1);
    assert.equal(result!.currentDerivedSellingValue, 1440);
  });

  it('3 Cx with 3 Cx quebra -> remaining 0 Cx -> 0 MZN', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 3)]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 0);
    assert.equal(result!.currentDerivedSellingValue, 0);
  });

  it('quebra exceeding original quantity floors remaining quantity (and derived value) at 0, never negative', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 5)]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 0);
    assert.equal(result!.currentDerivedSellingValue, 0);
  });
});

describe('calculateDerivedTransactionValuation — requirement 6: multiple quebra records sum correctly', () => {
  it('two separate quebra records against the same batch sum before reducing remaining quantity', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [
      quebra('batch-1', 1, 'q-a'),
      quebra('batch-1', 1, 'q-b'),
    ]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 1); // 3 - (1+1)
    assert.equal(result!.currentDerivedSellingValue, 1440);
  });

  it('quebras for a DIFFERENT batch are correctly excluded (relies on calculateBatch\'s own batchId filter)', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [
      quebra('batch-1', 1),
      quebra('some-other-batch', 2),
    ]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 2); // only batch-1's own 1 Cx counted
    assert.equal(result!.currentDerivedSellingValue, 2880);
  });
});

describe('calculateDerivedTransactionValuation — requirement 7: fractional remaining quantities', () => {
  it('a fractional quebra produces a correctly proportional fractional remaining value', () => {
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 0.5)]);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 2.5);
    assert.equal(result!.currentDerivedSellingValue, 3600); // 2.5 * 1440
  });

  it('a batch originally recorded with a fractional quantity works correctly', () => {
    const fractionalBatch: StockBatch = { ...batchWithSnapshot, quantity: 2.5 };
    const result = calculateDerivedTransactionValuation(fractionalBatch, []);
    assert.ok(result);
    assert.equal(result!.remainingQuantity, 2.5);
    assert.equal(result!.currentDerivedSellingValue, 3600);
  });
});

describe('calculateDerivedTransactionValuation — requirements 8-9: frozen rate survives Product Memory changes', () => {
  it('the frozen rate is used even when a NEW derivation under current Product Memory would differ', () => {
    // Simulate: Product Memory has since changed (1 Cx = 20 Un, 65 MZN/Un
    // -> would derive 1,300 MZN/Cx today), but this batch's OWN frozen
    // snapshot must still be used, exactly as recorded originally.
    const newRelationship: UnitRelationship = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 20 }],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    const newSnapshotForAHypotheticalNewBatch = buildDerivedSellingValuationSnapshot(
      { unitRelationship: newRelationship, sellingPrice: 65 },
      'Cx'
    );
    assert.ok(newSnapshotForAHypotheticalNewBatch);
    assert.equal(newSnapshotForAHypotheticalNewBatch!.ratePerPurchaseUnit, 1300);

    // The ALREADY-RECORDED batch (batchWithSnapshot) still carries its
    // own original frozen snapshot — nothing about computing the new
    // one above touched it.
    assert.equal(batchWithSnapshot.derivedSellingValuation!.ratePerPurchaseUnit, 1440);

    const result = calculateDerivedTransactionValuation(batchWithSnapshot, []);
    assert.ok(result);
    assert.equal(result!.currentDerivedSellingValue, 4320); // still the OLD rate, not 1300 * 3 = 3900
  });

  it('calling calculateDerivedTransactionValuation itself never mutates batch.derivedSellingValuation', () => {
    const snapshotBefore = JSON.stringify(batchWithSnapshot.derivedSellingValuation);
    calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 1)]);
    calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 2)]);
    const snapshotAfter = JSON.stringify(batchWithSnapshot.derivedSellingValuation);
    assert.equal(snapshotBefore, snapshotAfter);
  });

  it('never freezes/persists an absolute converted selling-unit quantity — only the rate is multiplied against a freshly computed live quantity', () => {
    // If an absolute quantity (e.g. "72 Un" for the original 3 Cx) had
    // been frozen instead of a rate, this quebra scenario would still
    // report the STALE 72 Un-equivalent value. Proving the actual
    // result tracks the live remaining quantity (2 Cx, not 3 Cx)
    // demonstrates no absolute quantity was ever the frozen input.
    const result = calculateDerivedTransactionValuation(batchWithSnapshot, [quebra('batch-1', 1)]);
    assert.ok(result);
    assert.notEqual(result!.currentDerivedSellingValue, 4320); // NOT the stale full-quantity figure
    assert.equal(result!.currentDerivedSellingValue, 2880); // reflects live remaining quantity (2 Cx)
    // And the object frozen on the batch itself carries no quantity
    // field of any kind — only rate/relationship/price metadata.
    assert.deepEqual(Object.keys(batchWithSnapshot.derivedSellingValuation!).sort(), [
      'derivedAt',
      'ratePerPurchaseUnit',
      'sellingUnit',
      'sellingUnitPrice',
      'unitRelationshipSnapshot',
    ]);
  });
});

describe('calculateDerivedTransactionValuation — requirements 10-11: existing calculateBatch/Business Worth architecture is untouched', () => {
  it('calculateBatch produces IDENTICAL results whether or not the batch carries a derivedSellingValuation', () => {
    const resultWith = calculateBatch(batchWithSnapshot, [quebra('batch-1', 1)]);
    const resultWithout = calculateBatch(batchWithoutSnapshot, [quebra('batch-1', 1)]);
    assert.equal(resultWith.remainingQuantity, resultWithout.remainingQuantity);
    assert.equal(resultWith.investmentValue, resultWithout.investmentValue);
    assert.equal(resultWith.marketValue, resultWithout.marketValue);
    assert.equal(resultWith.embeddedProfit, resultWithout.embeddedProfit);
  });

  it("calculateBatch's own marketValue still reads batch.sellingPrice, not the derived rate, even when the two numbers happen to coincide", () => {
    // baseBatch.sellingPrice is deliberately also 1440 (see its own
    // comment) so this test proves calculateBatch is reading
    // batch.sellingPrice itself, not silently substituting the
    // derived rate for it (the two are set to the SAME number here
    // specifically so a bug that swapped one field for the other
    // would NOT be caught by a plain equality check against a
    // DIFFERENT expected number — this asserts marketValue changes in
    // lockstep with sellingPrice, proving the field actually read).
    const withOriginalSellingPrice = calculateBatch(batchWithSnapshot, []);
    assert.equal(withOriginalSellingPrice.marketValue, 3 * 1440);

    const differentSellingPriceBatch: StockBatch = { ...batchWithSnapshot, sellingPrice: 999 };
    const withDifferentSellingPrice = calculateBatch(differentSellingPriceBatch, []);
    assert.equal(withDifferentSellingPrice.marketValue, 3 * 999);
    // Changing sellingPrice changed marketValue — proving calculateBatch
    // reads batch.sellingPrice, and the unchanged derivedSellingValuation
    // (still ratePerPurchaseUnit: 1440) had zero effect on the result.
    assert.notEqual(withDifferentSellingPrice.marketValue, withOriginalSellingPrice.marketValue);
  });
});
