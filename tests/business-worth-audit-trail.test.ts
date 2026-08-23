// Business Worth Evolution — Increment 9 (Auditability) — against a REAL
// Firestore emulator, not application code.
//
// [Business Worth Evolution — Implementation Authorization, Increment 9;
// Specification §34, FR-48; Rule 8 Finding 11-A]
//
// This suite proves the Firestore-level properties this increment's own
// audit-trail design depends on: (1) the new `timelineEvents` activity
// types (business-worth-snapshot-confirmed, business-worth-correction,
// business-worth-recovery-consumed, receivable-payment-recorded,
// payable-payment-recorded) can be created under the collection's own
// existing, UNCHANGED rules; (2) a retry against the exact same
// deterministic id is REJECTED, not silently overwritten — the
// mechanism this increment's own AppContext.tsx wiring relies on to
// guarantee a retry can never produce a misleading duplicate audit
// entry; (3) `platform_audit_log` remains `allow write: if false` for
// every client credential, unmodified by this increment (the SuperAdmin
// recovery-grant audit entry, already shipped in Increment 8, remains
// exclusively Admin-SDK-written); (4) ordinary tenant isolation is
// unaffected.
//
// This suite deliberately does NOT invoke AppContext.tsx's
// recordStockCount()/recordReceivablePayment()/recordPayablePayment()
// directly (tightly coupled to the live Firebase client SDK singleton
// and React state — see tests/initial-stock-confirmation.test.ts's own
// header for why). Instead it performs the exact same Firestore
// operations those functions perform (same deterministic id formulas)
// directly against the emulator.
//
// HOW TO RUN:
//   npm run test:business-worth-audit-trail:emulator
// Requires a Firestore emulator on localhost:8080.
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed
// to a fixed set of domains and does not include Google's emulator-
// binary infrastructure. It has been typechecked but NOT run
// end-to-end. Treat a clean run of the :emulator script as the actual
// acceptance gate, not this file's existence or a typecheck pass — same
// disclosure this repository's other emulator-dependent suites already
// carry (see tests/business-worth-snapshot-foundation.test.ts's own
// header).

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-business-worth-audit-trail-test';
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

// Mirrors AppContext.tsx's logTimelineEvent() write shape exactly —
// kept as a literal object here, not imported, since this suite
// deliberately exercises Firestore directly (see file header).
function timelineEventBody(id: string, type: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type,
    date: '2026-08-23',
    createdAt: new Date().toISOString(),
    userName: 'Dono Teste',
    title: 'Evento de Teste',
    description: 'Descrição de teste.',
    ...overrides,
  };
}

describe('timelineEvents — Increment 9 new activity types (business-worth-snapshot-confirmed)', () => {
  it('Owner can create a business-worth-snapshot-confirmed Timeline entry, under the existing, unmodified isMemberOf create rule', async () => {
    const db = ownerDbFor();
    const id = 'tl-bws-stockcount-periodic-001';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'business-worth-snapshot-confirmed'))
    );
    const snap = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id));
    assert.equal(snap.exists(), true);
    assert.equal(snap.data()?.type, 'business-worth-snapshot-confirmed');
  });

  it('a retry against the SAME deterministic id is REJECTED, not silently overwritten — the exact mechanism recordStockCount\'s own audit call relies on for retry safety', async () => {
    const db = ownerDbFor();
    const id = 'tl-bws-stockcount-periodic-002';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'business-worth-snapshot-confirmed'))
    );
    // A second write to the same path — Firestore classifies this as an
    // `update`, and timelineEvents' own pre-existing `allow update: if
    // false` rule rejects it outright, exactly as it already does for
    // every other activity type in this collection.
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'business-worth-snapshot-confirmed', { title: 'Segunda tentativa' }))
    );
  });

  it('Staff (a team member) can also create these entries — no access-tier regression versus every other existing activity type', async () => {
    const db = staffDbFor();
    const id = 'tl-bws-stockcount-periodic-003';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'business-worth-snapshot-confirmed'))
    );
  });

  it('a member of a different business cannot create a Timeline entry under this business\'s path', async () => {
    const db = otherOwnerDbFor();
    const id = 'tl-bws-stockcount-periodic-004';
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'business-worth-snapshot-confirmed'))
    );
  });
});

describe('timelineEvents — Increment 9 (business-worth-correction / business-worth-recovery-consumed)', () => {
  it('an Owner correction entry and a SuperAdmin-authorized recovery entry are distinguishable, real, separate documents — never collapsed into one generic type', async () => {
    const db = ownerDbFor();
    const correctionId = 'tl-bws-stockcount-periodic-005';
    const recoveryId = 'tl-bws-stockcount-periodic-006';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', correctionId), timelineEventBody(correctionId, 'business-worth-correction'))
    );
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', recoveryId), timelineEventBody(recoveryId, 'business-worth-recovery-consumed'))
    );
    const correctionSnap = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', correctionId));
    const recoverySnap = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', recoveryId));
    assert.equal(correctionSnap.data()?.type, 'business-worth-correction');
    assert.equal(recoverySnap.data()?.type, 'business-worth-recovery-consumed');
    assert.notEqual(correctionSnap.data()?.type, recoverySnap.data()?.type);
  });
});

describe('timelineEvents — Increment 9 (receivable-payment-recorded / payable-payment-recorded)', () => {
  it('a receivable payment audit entry can be created once, at its deterministic id, and a retry is rejected', async () => {
    const db = ownerDbFor();
    const id = 'tl-receivable-payment-submission-001';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'receivable-payment-recorded'))
    );
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'receivable-payment-recorded', { title: 'Retry' }))
    );
  });

  it('a payable payment audit entry can be created once, at its deterministic id, and a retry is rejected', async () => {
    const db = ownerDbFor();
    const id = 'tl-payable-payment-submission-001';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'payable-payment-recorded'))
    );
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', id), timelineEventBody(id, 'payable-payment-recorded', { title: 'Retry' }))
    );
  });

  it('two DIFFERENT submissionIds produce two separate, independent audit entries — the mechanism does not over-collapse unrelated payments', async () => {
    const db = ownerDbFor();
    const idA = 'tl-receivable-payment-submission-002';
    const idB = 'tl-receivable-payment-submission-003';
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', idA), timelineEventBody(idA, 'receivable-payment-recorded'))
    );
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', idB), timelineEventBody(idB, 'receivable-payment-recorded'))
    );
    const snapA = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', idA));
    const snapB = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', idB));
    assert.equal(snapA.exists(), true);
    assert.equal(snapB.exists(), true);
  });
});

describe('platform_audit_log — Increment 9 does not weaken or alter this collection\'s existing rules', () => {
  it('no client credential — Owner, Staff, or a different business\'s Owner — can write directly to platform_audit_log; it remains exclusively Admin-SDK-written', async () => {
    const ownerAttempt = setDoc(doc(ownerDbFor(), 'platform_audit_log', 'fake-entry-1'), {
      actorUid: OWNER_UID,
      actorRole: 'owner',
      actionType: 'business_worth_recovery.authorized',
      timestamp: new Date().toISOString(),
    });
    await assertFails(ownerAttempt);

    const staffAttempt = setDoc(doc(staffDbFor(), 'platform_audit_log', 'fake-entry-2'), {
      actorUid: STAFF_UID,
      actorRole: 'staff',
      actionType: 'business_worth_recovery.authorized',
      timestamp: new Date().toISOString(),
    });
    await assertFails(staffAttempt);
  });

  it('an Owner cannot read platform_audit_log (platform-operator-scoped, per 09-superadmin-architecture.md §9.6 — never a tenant-readable collection)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_audit_log', 'seeded-entry-1'), {
        actorUid: 'op-1',
        actorRole: 'superadmin',
        actionType: 'business_worth_recovery.authorized',
        timestamp: new Date().toISOString(),
      });
    });
    await assertFails(getDoc(doc(ownerDbFor(), 'platform_audit_log', 'seeded-entry-1')));
  });
});
