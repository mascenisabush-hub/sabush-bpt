// Increment B, Checkpoint B3 — tests for
// buildDerivedSellingValuationSnapshot (apps/tenant/src/lib/purchaseToSellingConversion.ts)
// and, specifically, the §14 freeze/persistence boundary this
// checkpoint introduces: StockBatch.derivedSellingValuation, once
// written, must never silently change as a side effect of a LATER
// Product Memory change.
//
// SCOPE: proves the pure snapshot-builder function against plain
// in-memory values only — no Firestore, no React harness. The actual
// Firestore write path (AppContext.tsx's addMultipleStockBatches) is
// deliberately thin glue around this function, matching this
// repository's established pattern (supplierWordingConfirmation.ts,
// openBatchSupersession.ts) — it is not independently re-tested here,
// same reasoning already applied to every prior checkpoint in this
// lineage. The "freeze" itself is a CALL-DISCIPLINE guarantee (call
// this function once, at commit time, then never again for that same
// batch) rather than internal state — tests 6-9 below model that
// discipline explicitly, the same way a caller must.
//
// HOW TO RUN:
//   npx tsx --test tests/derived-selling-valuation-snapshot.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildDerivedSellingValuationSnapshot,
  type ProductMemorySnapshot,
} from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

const savannaRelationship: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 }, // composes to 1 Cx = 24 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

describe('buildDerivedSellingValuationSnapshot — requirement 1: canonical worked example', () => {
  it('matches the Consolidated Specification\'s own canonical figures exactly (3 Cx @ 1,250 MZN/Cx)', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const snapshot = buildDerivedSellingValuationSnapshot(memory, 'Cx', '2026-08-20T10:00:00.000Z');
    assert.ok(snapshot);
    assert.equal(snapshot!.ratePerPurchaseUnit, 1440); // 24 Un/Cx * 60 MZN/Un
    assert.equal(snapshot!.sellingUnit, 'Un');
    assert.equal(snapshot!.sellingUnitPrice, 60);
    assert.equal(snapshot!.derivedAt, '2026-08-20T10:00:00.000Z');
    assert.deepEqual(snapshot!.unitRelationshipSnapshot, [
      { unit: 'Cx', factorFromPrevious: 0 },
      { unit: 'Emb', factorFromPrevious: 4 },
      { unit: 'Un', factorFromPrevious: 6 },
    ]);
  });
});

describe('buildDerivedSellingValuationSnapshot — requirement 2: only fires with valid confirmed Product Memory', () => {
  it('fires when unitRelationship is confirmed, has a selling unit, and sellingPrice is a finite number', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    assert.notEqual(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('fires for a purchase in an interior unit of the chain (Emb), not only the top level', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const snapshot = buildDerivedSellingValuationSnapshot(memory, 'Emb');
    assert.ok(snapshot);
    assert.equal(snapshot!.ratePerPurchaseUnit, 360); // 6 Un/Emb * 60
  });
});

describe('buildDerivedSellingValuationSnapshot — requirement 3: never fabricates a valuation', () => {
  it('returns undefined when productMemory is entirely absent (brand-new product, first batch)', () => {
    assert.equal(buildDerivedSellingValuationSnapshot(undefined, 'Cx'), undefined);
  });

  it('returns undefined when unitRelationship is missing', () => {
    const memory: ProductMemorySnapshot = { sellingPrice: 60 };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('returns undefined when unitRelationship has no confirmed selling unit (POL-0005 minimum not met)', () => {
    const noSellingUnit: UnitRelationship = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }],
      confirmedAt: '2026-08-20T00:00:00.000Z',
      // sellingUnit intentionally omitted
    };
    const memory: ProductMemorySnapshot = { unitRelationship: noSellingUnit, sellingPrice: 60 };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('returns undefined when unitRelationship is structurally invalid (empty units)', () => {
    const invalid = { units: [], confirmedAt: '2026-08-20T00:00:00.000Z' } as UnitRelationship;
    const memory: ProductMemorySnapshot = { unitRelationship: invalid, sellingPrice: 60 };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('returns undefined when Product.sellingPrice (remembered selling price) is missing', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('returns undefined when Product.sellingPrice is not a finite number (defensive against corrupt data)', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: NaN };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Cx'), undefined);
  });

  it('returns undefined when the recorded purchase unit is not a member of the confirmed chain', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    assert.equal(buildDerivedSellingValuationSnapshot(memory, 'Saco'), undefined);
  });

  it('never returns a fabricated rate of the selling price itself (factor 1) for an unresolvable purchase unit', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const snapshot = buildDerivedSellingValuationSnapshot(memory, 'Saco');
    assert.equal(snapshot, undefined); // not { ratePerPurchaseUnit: 60, ... }
  });
});

describe('buildDerivedSellingValuationSnapshot — requirement 5: never touches purchase facts or sellingPrice/costPrice semantics', () => {
  it('the returned object carries only Concept-C fields — no quantity, costPrice, or purchase-unit-as-batch-unit leakage', () => {
    const memory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const snapshot = buildDerivedSellingValuationSnapshot(memory, 'Cx');
    assert.ok(snapshot);
    assert.deepEqual(Object.keys(snapshot!).sort(), [
      'derivedAt',
      'ratePerPurchaseUnit',
      'sellingUnit',
      'sellingUnitPrice',
      'unitRelationshipSnapshot',
    ]);
  });
});

describe('§14 freeze/persistence boundary — requirement 6', () => {
  // These tests model the EXACT call discipline AppContext.tsx's
  // addMultipleStockBatches follows: call the builder once at commit
  // time, persist the return value verbatim onto that StockBatch
  // document, and never call the builder again for that same,
  // already-recorded batch — even after Product Memory changes.

  it('a snapshot taken under old Product Memory is unaffected when Product Memory later changes', () => {
    // Transaction 1: recorded under the OLD relationship/price.
    const oldMemory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const historicalSnapshot = buildDerivedSellingValuationSnapshot(oldMemory, 'Cx', '2026-08-01T00:00:00.000Z');
    assert.ok(historicalSnapshot);
    assert.equal(historicalSnapshot!.ratePerPurchaseUnit, 1440);

    // Product Memory changes (Product Architect's Example 6): 1 Cx = 20 Un now, 65 MZN/Un.
    const newRelationship: UnitRelationship = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }, { unit: 'Un', factorFromPrevious: 20 }],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T12:00:00.000Z',
    };
    const newMemory: ProductMemorySnapshot = { unitRelationship: newRelationship, sellingPrice: 65 };

    // The ALREADY-RECORDED historicalSnapshot object itself — the one
    // that would already be sitting on the StockBatch document — is a
    // plain, already-returned value. Nothing re-derives it merely
    // because newMemory now exists; it is simply never touched again.
    assert.equal(historicalSnapshot!.ratePerPurchaseUnit, 1440);
    assert.equal(historicalSnapshot!.sellingUnit, 'Un');
    assert.equal(historicalSnapshot!.sellingUnitPrice, 60);
    assert.deepEqual(historicalSnapshot!.unitRelationshipSnapshot, [
      { unit: 'Cx', factorFromPrevious: 0 },
      { unit: 'Emb', factorFromPrevious: 4 },
      { unit: 'Un', factorFromPrevious: 6 },
    ]);

    // A NEW transaction recorded now correctly uses the NEW memory —
    // prospective-only, per BDR-0012 §5.A Item 1/Decisions 15-16.
    const newSnapshot = buildDerivedSellingValuationSnapshot(newMemory, 'Cx', '2026-08-20T12:05:00.000Z');
    assert.ok(newSnapshot);
    assert.equal(newSnapshot!.ratePerPurchaseUnit, 1300); // 20 Un/Cx * 65 MZN/Un
    assert.notEqual(newSnapshot!.ratePerPurchaseUnit, historicalSnapshot!.ratePerPurchaseUnit);
  });

  it('the unitRelationshipSnapshot is a deep copy, never a live reference into the source relationship object', () => {
    const mutableRelationship: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    const memory: ProductMemorySnapshot = { unitRelationship: mutableRelationship, sellingPrice: 60 };
    const snapshot = buildDerivedSellingValuationSnapshot(memory, 'Cx');
    assert.ok(snapshot);

    // Mutate the SOURCE relationship object after the snapshot was taken.
    mutableRelationship.units[1].factorFromPrevious = 20;
    mutableRelationship.sellingUnit = 'Un';

    // The already-taken snapshot must be completely unaffected.
    assert.equal(snapshot!.unitRelationshipSnapshot[1].factorFromPrevious, 24);
    assert.equal(snapshot!.ratePerPurchaseUnit, 1440); // still 24 * 60, not 20 * 60
  });

  it('successive transactions for the SAME product, recorded before and after a Product Memory change, each freeze their own correct rate', () => {
    const memoryV1: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const txn1 = buildDerivedSellingValuationSnapshot(memoryV1, 'Cx', '2026-08-01T00:00:00.000Z');

    const relationshipV2: UnitRelationship = {
      units: savannaRelationship.units.map((u) => ({ ...u })),
      sellingUnit: 'Emb', // owner reconfigures selling unit itself, not just price/factor
      confirmedAt: '2026-08-10T00:00:00.000Z',
    };
    const memoryV2: ProductMemorySnapshot = { unitRelationship: relationshipV2, sellingPrice: 250 };
    const txn2 = buildDerivedSellingValuationSnapshot(memoryV2, 'Cx', '2026-08-10T00:00:00.000Z');

    assert.ok(txn1);
    assert.ok(txn2);
    assert.equal(txn1!.ratePerPurchaseUnit, 1440); // 24 Un/Cx * 60
    assert.equal(txn1!.sellingUnit, 'Un');
    assert.equal(txn2!.ratePerPurchaseUnit, 1000); // 4 Emb/Cx * 250
    assert.equal(txn2!.sellingUnit, 'Emb');

    // txn1 remains exactly as it was, unaffected by txn2 ever having been computed.
    assert.equal(txn1!.ratePerPurchaseUnit, 1440);
    assert.equal(txn1!.sellingUnit, 'Un');
  });

  it('a product with NO confirmed Product Memory at transaction time gets no snapshot, even if Product Memory is confirmed moments later', () => {
    // Transaction recorded before any Product Memory exists at all.
    const before = buildDerivedSellingValuationSnapshot(undefined, 'Cx', '2026-08-01T00:00:00.000Z');
    assert.equal(before, undefined);

    // Product Memory gets confirmed afterward.
    const afterMemory: ProductMemorySnapshot = { unitRelationship: savannaRelationship, sellingPrice: 60 };
    const after = buildDerivedSellingValuationSnapshot(afterMemory, 'Cx', '2026-08-05T00:00:00.000Z');
    assert.ok(after);

    // The FIRST (already-recorded, hypothetically) transaction's own
    // result is still `undefined` — nothing retroactively backfills it.
    assert.equal(before, undefined);
  });
});
