// Business Worth Evolution — Increment 10 (Revision 3) — Owner-Declared
// Business Worth — against a REAL Firestore emulator, not application
// code.
//
// [Business Worth Evolution — Implementation Authorization, Increment
// 10; Specification §42.1, §42.3, §8, FR-61, FR-69; BDR Decision 36;
// Rule 8 Finding OD-1-OD-5]
//
// WHY THIS FILE EXISTS AS A SEPARATE SUITE FROM
// tests/business-worth-snapshot-foundation.test.ts: that file proves the
// Contagem-sourced snapshot path (paired StockCount + BusinessWorthSnapshot
// atomic batch write). This file proves the second, structurally
// different establishment path this Increment adds — a single-document
// create with no StockCount behind it — and the mutual-exclusion/
// omission rules the new firestore.rules branch enforces between the two
// methods.
//
// This suite intentionally does NOT invoke AppContext.tsx's
// recordOwnerDeclaredBusinessWorth() directly, for the same reason the
// sibling suite does not invoke recordStockCount() — that function is
// tightly coupled to the live Firebase client SDK's `db` singleton and
// React state. Instead, this suite performs the exact same Firestore
// operation that function performs (same deterministic id formula —
// 'bws-owner-declared-' + submissionId), directly against the emulator,
// and asserts on the resulting documents and rule outcomes.
//
// HOW TO RUN:
//   Requires a Firestore emulator on localhost:8080, same as
//   tests/firestore-rules.test.ts and tests/business-worth-snapshot-foundation.test.ts:
//     npx tsx --test tests/business-worth-owner-declared.test.ts
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed to
// a fixed set of domains and does not include Google's emulator-binary
// infrastructure, and the Firebase CLI/JDK the emulator requires are not
// installed there. It has been typechecked (via `npm run lint:server`,
// modulo one unrelated pre-existing failure in
// tests/startup-investment.test.ts) but NOT run end-to-end. Treat a clean
// run of this suite against a real emulator as the actual acceptance
// gate for this Increment's rules change, not this file's existence or a
// typecheck pass — same disclosure this repository's other
// emulator-dependent suites already carry.

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-business-worth-owner-declared-test';
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

// Mirrors AppContext.tsx's recordOwnerDeclaredBusinessWorth() deterministic-
// id formula exactly (Increment 10) — kept as a literal string template
// here, not imported, matching the sibling suite's own stated rationale
// for exercising Firestore directly.
const ownerDeclaredSnapshotId = (submissionId: string) => 'bws-owner-declared-' + submissionId;

// A minimal, valid Owner-Declared snapshot write — every FR-69-omitted
// field is genuinely absent (never included with an overridable default),
// so a test that wants to prove a specific field's absence is REJECTED
// must add that field via `extraFields`, not toggle a default off.
function ownerDeclaredBody(id: string, overrides: Record<string, unknown> = {}, extraFields: Record<string, unknown> = {}) {
  return {
    id,
    businessId: BIZ,
    establishmentMethod: 'owner-declared',
    confirmedAt: serverTimestamp(),
    measuredBusinessWorth: 350000,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    ...extraFields,
    ...overrides,
  };
}

describe('FR-61, BDR Decision 36 — Owner-Declared establishment, the basic case', () => {
  it('Owner can create an Owner-Declared BusinessWorthSnapshot with no StockCount behind it', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-001';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );

    const snap = await getDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId));
    assert.equal(snap.exists(), true);
    assert.equal(snap.data()?.establishmentMethod, 'owner-declared');
    assert.equal(snap.data()?.measuredBusinessWorth, 350000);
    assert.equal(snap.data()?.status, 'active');
    assert.equal('sourceStockCountId' in (snap.data() ?? {}), false, 'sourceStockCountId must be genuinely absent, not null');
  });

  it('Staff cannot declare Business Worth — Owner-tier only, same as every other financial-fact collection', async () => {
    const db = staffDbFor();
    const submissionId = 'owner-declared-sub-staff';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );
  });

  it('An Owner of a DIFFERENT business cannot declare Business Worth for this one — tenant isolation', async () => {
    const db = otherOwnerDbFor();
    const submissionId = 'owner-declared-sub-cross-tenant';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );
  });
});

describe('Rule 8 Finding OD-1 — sourceStockCountId must be genuinely absent, never fabricated, never merely falsy', () => {
  it('rejects an Owner-Declared write that also carries a sourceStockCountId — cannot blur the two establishment methods', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-fabricated-stockcount';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertFails(
      setDoc(
        doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId),
        ownerDeclaredBody(bwsId, {}, { sourceStockCountId: 'some-real-or-fake-stockcount-id' })
      )
    );
  });

  it('rejects an Owner-Declared write with sourceStockCountId explicitly set to an empty string — absence means absence, not falsy', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-empty-string';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertFails(
      setDoc(
        doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId),
        ownerDeclaredBody(bwsId, {}, { sourceStockCountId: '' })
      )
    );
  });
});

describe('FR-69 — every omitted drill-down field must be genuinely absent, server-enforced', () => {
  const forbiddenFields: Record<string, unknown> = {
    productValuationTotal: 100000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    cashPosition: 5000,
    receivablesPosition: 0,
    payablesPosition: 0,
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    ownerInvestmentSinceLastSnapshot: 0,
  };

  for (const [field, value] of Object.entries(forbiddenFields)) {
    it(`rejects an Owner-Declared write that leaks a "${field}" field, even with a plausible-looking value`, async () => {
      const db = ownerDbFor();
      const submissionId = `owner-declared-sub-leak-${field}`;
      const bwsId = ownerDeclaredSnapshotId(submissionId);

      await assertFails(
        setDoc(
          doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId),
          ownerDeclaredBody(bwsId, {}, { [field]: value })
        )
      );
    });
  }

  it('accepts an Owner-Declared write that omits every one of the above fields entirely (the honest, correct shape)', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-clean';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );
  });
});

describe('establishmentMethod discriminates the two branches — neither can borrow the other\'s leniency', () => {
  it('rejects a write with establishmentMethod "owner-declared" but no measuredBusinessWorth', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-no-amount';
    const bwsId = ownerDeclaredSnapshotId(submissionId);
    const body = ownerDeclaredBody(bwsId) as Record<string, unknown>;
    delete body.measuredBusinessWorth;

    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body));
  });

  it('rejects a write with an unrecognized establishmentMethod value — closed enum, not an arbitrary string', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-bad-enum';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertFails(
      setDoc(
        doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId),
        ownerDeclaredBody(bwsId, { establishmentMethod: 'estimated-guess' })
      )
    );
  });

  it('a Contagem-branch write with no establishmentMethod field at all still succeeds — backward compatible with every pre-Increment-10 caller', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-periodic-legacy-caller';
    const bwsId = 'bws-' + sId;
    const legacyStyleBody = {
      id: bwsId,
      businessId: BIZ,
      sourceStockCountId: sId,
      confirmedAt: serverTimestamp(),
      measuredBusinessWorth: 500000,
      productValuationTotal: 500000,
      productValuationDetail: [],
      embeddedProfitTotal: 0,
      embeddedProfitDetail: [],
      expensesSinceLastSnapshot: 0,
      breakagesSinceLastSnapshot: 0,
      levantamentosSinceLastSnapshot: 0,
      previousCurrentBusinessWorth: null,
      correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      // Deliberately NO establishmentMethod field — proves the
      // Contagem branch's `in ['contagem', null]` acceptance really
      // does treat "absent" as legitimate, not just "set to null".
    };

    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), legacyStyleBody)
    );
  });
});

describe('Idempotency (Rule 8 Finding OD-3) — a retried Owner-Declared submission never produces a duplicate', () => {
  it('a retried write under the same submissionId is rejected by the collection\'s own allow-update:false rule, not silently duplicated', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-retry';
    const bwsId = ownerDeclaredSnapshotId(submissionId);

    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );
    // Retry — same id, same shape, exactly what a network-retry of the
    // same submission attempt would produce.
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId))
    );

    const all = await getDocs(collection(db, 'businesses', BIZ, 'businessWorthSnapshots'));
    assert.equal(all.size, 1, `Expected exactly 1 snapshot after a retry, found ${all.size}.`);
  });
});

describe('Immutability — an Owner-Declared snapshot is exactly as immutable as a Contagem-sourced one', () => {
  it('Owner cannot rewrite an existing Owner-Declared snapshot\'s frozen fields outside the governed correction window mechanism', async () => {
    const db = ownerDbFor();
    const submissionId = 'owner-declared-sub-immutable';
    const bwsId = ownerDeclaredSnapshotId(submissionId);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'businessWorthSnapshots', bwsId), ownerDeclaredBody(bwsId));
    });

    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), { measuredBusinessWorth: 999999 }, { merge: true })
    );
  });
});
