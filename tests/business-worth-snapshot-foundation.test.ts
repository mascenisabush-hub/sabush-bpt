// Business Worth Evolution — Increment 1 (Foundation) — against a REAL
// Firestore emulator, not application code.
//
// [Business Worth Evolution — Implementation Authorization, Increment 1;
// Specification §8, §14, §18, §27, FR-5, FR-6, FR-18, FR-19, FR-36,
// FR-37, FR-44; I-2, I-3]
//
// WHY THIS FILE EXISTS AS A SEPARATE SUITE FROM
// tests/business-worth-current-read-path.test.ts: that file proves the
// pure Current Business Worth read function in isolation. This file
// proves the Firestore-level properties recordStockCount's own atomic
// batch-write extension depends on — the same split this repository
// already established for the periodic-stock-finalization feature (see
// tests/periodic-stock-finalization.test.ts's own header comment).
//
// This suite intentionally does NOT invoke AppContext.tsx's
// recordStockCount() directly — that function is tightly coupled to the
// live Firebase client SDK's `db` singleton and React state (see
// tests/initial-stock-confirmation.test.ts's own header for why).
// Instead, this suite performs the exact same Firestore operations
// recordStockCount() performs (same deterministic id formula —
// 'bws-' + sourceStockCountId — same batch shape), directly against the
// emulator, and asserts on the resulting documents and rule outcomes.
//
// HOW TO RUN:
//   npm run test:business-worth-snapshot-foundation:emulator
// Requires a Firestore emulator on localhost:8080, same as
// tests/firestore-rules.test.ts.
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed to
// a fixed set of domains and does not include Google's emulator-binary
// infrastructure. It has been typechecked but NOT run end-to-end. Treat
// a clean run of the :emulator script as the actual acceptance gate, not
// this file's existence or a typecheck pass — same disclosure this
// repository's other emulator-dependent suites already carry.

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-business-worth-snapshot-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';
const OWNER_UID = 'owner1';
const OTHER_OWNER_UID = 'owner2';
const STAFF_UID = 'staff1';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(ctx.firestore(), 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
    await setDoc(doc(ctx.firestore(), 'users', STAFF_UID), { role: 'staff', businessId: BIZ });
    // No subscriptions/{BIZ} doc seeded — subscriptionAllowsNewRecords()
    // fails open when none exists (this repo's documented interim
    // behavior); businessWorthSnapshots' own create rule does not gate
    // on subscription state at all (Increment 1 scope), so this is
    // immaterial here — seeded (or not) exactly like the sibling
    // periodic-stock-finalization suite.
  });
});

function ownerDbFor() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}
function otherOwnerDbFor() {
  return testEnv.authenticatedContext(OTHER_OWNER_UID).firestore();
}
function staffDbFor() {
  return testEnv.authenticatedContext(STAFF_UID).firestore();
}

// Mirrors AppContext.tsx's recordStockCount() deterministic-id formula
// exactly (Increment 1) — kept as a literal string template here, not
// imported, since this suite deliberately exercises Firestore directly
// (see file header).
const snapshotId = (sourceStockCountId: string) => 'bws-' + sourceStockCountId;

function stockCountBody(id: string) {
  return {
    id,
    type: 'monthly',
    date: '2026-08-10',
    items: [{ productId: 'p1', productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65, totalValue: 500 }],
    totalValue: 500,
    totalSellingValue: 650,
    createdAt: new Date().toISOString(),
    producesBusinessWorthSnapshot: true,
  };
}

function snapshotBody(id: string, sourceStockCountId: string, overrides: Record<string, unknown> = {}) {
  // [Corrected] cashPosition/receivablesPosition/payablesPosition/
  // estimatedBusinessWorthImmediatelyBefore/difference are OMITTED by
  // default here, matching the corrected BusinessWorthSnapshot
  // interface exactly (all five are optional; Increment 1 never
  // fabricates a 0 or a permanent null for them — see types.ts's own
  // comment). A test that needs one present can still supply it via
  // `overrides`.
  return {
    id,
    businessId: BIZ,
    sourceStockCountId,
    confirmedAt: serverTimestamp(),
    measuredBusinessWorth: 650,
    productValuationTotal: 650,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    ...overrides,
  };
}

describe('FR-5, FR-36 — atomic snapshot-producing confirmation', () => {
  it('Owner can create a StockCount and its BusinessWorthSnapshot together, in one batch', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-001';
    const bwsId = snapshotId(sId);

    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    await assertSucceeds(batch.commit());

    const snap = await getDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId));
    assert.equal(snap.exists(), true);
    assert.equal(snap.data()?.sourceStockCountId, sId);
    assert.equal(snap.data()?.measuredBusinessWorth, 650);
    assert.equal(snap.data()?.status, 'active');
  });

  it('a retried confirmation attempt under the same sourceStockCountId does not create a second snapshot (FR-37, I-2) — the retry batch is rejected, not silently duplicated', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-002';
    const bwsId = snapshotId(sId);

    const batch1 = writeBatch(db);
    batch1.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch1.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    await assertSucceeds(batch1.commit());

    // Retry — client never saw attempt 1's result, resubmits identically.
    // Firestore classifies the businessWorthSnapshots write as an UPDATE
    // this time (the document now exists) — this collection's own
    // `allow update: if false` rejects it outright, taking the whole
    // retry batch down with it (Increment 1's accepted trade-off,
    // mirroring the existing 'initial' StockCount's own identical
    // retry-rejection characteristic — see this suite's own header and
    // the Implementation Authorization's final report for the explicit
    // discussion of this).
    const batch2 = writeBatch(db);
    batch2.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch2.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    await assertFails(batch2.commit());

    // The data-level outcome still holds regardless: exactly one
    // snapshot exists for this sourceStockCountId, never two.
    const all = await getDocs(collection(db, 'businesses', BIZ, 'businessWorthSnapshots'));
    assert.equal(all.size, 1, `Expected exactly 1 businessWorthSnapshots document after a retry, found ${all.size}.`);
  });

  it('two DIFFERENT sourceStockCountIds produce two separate snapshots — the mechanism does not over-collapse unrelated Contagens', async () => {
    const db = ownerDbFor();
    for (const sId of ['stockcount-periodic-sub-A', 'stockcount-periodic-sub-B']) {
      const bwsId = snapshotId(sId);
      const batch = writeBatch(db);
      batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
      batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
      await assertSucceeds(batch.commit());
    }
    const all = await getDocs(collection(db, 'businesses', BIZ, 'businessWorthSnapshots'));
    assert.equal(all.size, 2, 'Two distinct source Contagens must produce two distinct snapshots.');
  });
});

describe('FR-6, I-3, §27 — immutability (Increment 1: no exception yet)', () => {
  it('Owner cannot update an existing snapshot\'s frozen fields — no correction/recovery mechanism exists yet', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-003';
    const bwsId = snapshotId(sId);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    });

    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), { measuredBusinessWorth: 999999 }, { merge: true }));
  });

  it('Owner cannot delete an existing snapshot', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-004';
    const bwsId = snapshotId(sId);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    });

    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId)));
  });
});

describe('FR-44, §18 — create-time enforcement, never merely UI omission', () => {
  it('rejects a create whose confirmedAt is client-supplied rather than request.time (untamperable correction-window anchor, mirroring initialStockConfirmationVoidable\'s own confirmedAt discipline)', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-005';
    const bwsId = snapshotId(sId);
    const bodyWithFakeTimestamp = {
      ...snapshotBody(bwsId, sId),
      confirmedAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), bodyWithFakeTimestamp));
  });

  it('rejects a create with a status other than \'active\' (Increment 1 never produces any other status)', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-006';
    const bwsId = snapshotId(sId);
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId, { status: 'corrected' }))
    );
  });

  it('rejects a create whose businessId does not match the URL path business (tenant isolation is structural, not merely checked)', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-007';
    const bwsId = snapshotId(sId);
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId, { businessId: OTHER_BIZ }))
    );
  });

  it('rejects a create whose document id does not match the resource.data.id field', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-sub-008';
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', snapshotId(sId)), snapshotBody('mismatched-id', sId))
    );
  });

  it('Staff cannot create a snapshot — Owner-only, matching stockCounts\' own create tier exactly', async () => {
    const db = staffDbFor();
    const sId = 'stockcount-periodic-sub-009';
    const bwsId = snapshotId(sId);
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId)));
  });
});

describe('§18, §33 — tenant isolation', () => {
  it('a member of a different business cannot read this business\'s snapshots', async () => {
    const sId = 'stockcount-periodic-sub-010';
    const bwsId = snapshotId(sId);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    });

    const otherDb = otherOwnerDbFor();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'businessWorthSnapshots', bwsId)));
  });

  it('the Owner of a different business cannot create a snapshot under this business\'s path', async () => {
    const sId = 'stockcount-periodic-sub-011';
    const bwsId = snapshotId(sId);
    const otherDb = otherOwnerDbFor();
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId)));
  });

  it('the business\'s own Owner and Staff can both read', async () => {
    const sId = 'stockcount-periodic-sub-012';
    const bwsId = snapshotId(sId);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId), snapshotBody(bwsId, sId));
    });

    await assertSucceeds(getDoc(doc(ownerDbFor(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId)));
    await assertSucceeds(getDoc(doc(staffDbFor(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId)));
  });
});

describe('FR-19 — no historical backfill (marker field)', () => {
  it('a legacy StockCount with no producesBusinessWorthSnapshot field, and no snapshot, is exactly what a pre-capability record looks like — this suite asserts absence, never presence', async () => {
    const db = ownerDbFor();
    const legacyId = 'stockcount-legacy-001';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCounts', legacyId), {
        id: legacyId,
        type: 'monthly',
        date: '2020-01-01',
        items: [],
        totalValue: 0,
        createdAt: '2020-01-01T00:00:00.000Z',
        // producesBusinessWorthSnapshot deliberately absent.
      });
    });

    const legacySnap = await getDoc(doc(db, 'businesses', BIZ, 'stockCounts', legacyId));
    assert.equal(legacySnap.data()?.producesBusinessWorthSnapshot, undefined);

    const allSnapshots = await getDocs(collection(db, 'businesses', BIZ, 'businessWorthSnapshots'));
    assert.equal(allSnapshots.size, 0, 'No BusinessWorthSnapshot should exist for a legacy, never-participating StockCount.');
  });
});
