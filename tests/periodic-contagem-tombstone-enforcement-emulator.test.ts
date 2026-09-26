// Periodic Contagem Expanded Phase 2 — TOMBSTONE RULES ENFORCEMENT —
// Firestore emulator suite.
//
// WHY THIS FILE EXISTS: firestore.rules' own tombstones/{key} block
// (Stage 10) has a source-level test proving the RULE TEXT has the
// expected shape (tests/periodic-contagem-firestore-rules-tombstones.test.ts)
// but that test cannot execute the rule against a real rules engine —
// exactly the same limitation this project's own emulator-verification
// gate has flagged for every other rules-shape claim. This file proves
// the rule genuinely enforces immutability, membership-scoped read, and
// active-editor-scoped create/delete, against a real Firestore instance.
//
// HOW TO RUN (emulator already running standalone in another window):
//   npx tsx --test tests/periodic-contagem-tombstone-enforcement-emulator.test.ts
//
// Not yet executed anywhere as of authoring; awaiting a real run on the
// operator's own machine.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-tombstone-enforcement-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';
const OWNER_UID = 'owner1';
const STAFF_UID = 'staff1';
const OTHER_OWNER_UID = 'owner2';
const TOMBSTONE_KEY = 'manual:5';

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
  // [Same emulator-settling artifact found and fixed in the other two
  // new emulator test files this session — applied here preemptively,
  // since this file has the identical beforeEach pattern.]
  try {
    await testEnv.clearFirestore();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await testEnv.clearFirestore();
  }
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(db, 'users', STAFF_UID), { role: 'staff', businessId: BIZ });
    await setDoc(doc(db, 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
    await setDoc(doc(db, 'businesses', BIZ), { subscriptionStatus: 'active' });
    await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
      type: 'periodic',
      date: '2026-09-26',
      updatedAt: new Date().toISOString(),
    });
  });
});

function tombstoneRef(uid: string) {
  const db = testEnv.authenticatedContext(uid).firestore();
  return doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY);
}

describe('tombstones/{key} — create', () => {
  it('the active editor (Owner) can create a valid tombstone naming themselves as deletedByUid with a string deletedAt', async () => {
    await assertSucceeds(setDoc(tombstoneRef(OWNER_UID), { deletedAt: new Date().toISOString(), deletedByUid: OWNER_UID }));
  });

  it('create is REJECTED if deletedByUid does not match the caller — cannot attribute a deletion to someone else', async () => {
    await assertFails(setDoc(tombstoneRef(OWNER_UID), { deletedAt: new Date().toISOString(), deletedByUid: STAFF_UID }));
  });

  it('create is REJECTED if deletedAt is missing or not a string', async () => {
    await assertFails(setDoc(tombstoneRef(OWNER_UID), { deletedByUid: OWNER_UID }));
  });

  it('a plain staff member (never assigned as delegate) CANNOT create a tombstone', async () => {
    await assertFails(setDoc(tombstoneRef(STAFF_UID), { deletedAt: new Date().toISOString(), deletedByUid: STAFF_UID }));
  });

  it('an owner from a DIFFERENT business cannot create a tombstone here — tenant isolation', async () => {
    await assertFails(setDoc(tombstoneRef(OTHER_OWNER_UID), { deletedAt: new Date().toISOString(), deletedByUid: OTHER_OWNER_UID }));
  });
});

describe('tombstones/{key} — immutability (no update rule at all)', () => {
  it('a tombstone, once created, CANNOT be updated — not even by the Owner who created it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY), {
        deletedAt: new Date().toISOString(),
        deletedByUid: OWNER_UID,
      });
    });
    await assertFails(updateDoc(tombstoneRef(OWNER_UID), { deletedAt: new Date().toISOString() }));
  });
});

describe('tombstones/{key} — read', () => {
  it('any member of the business can read a tombstone', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY), {
        deletedAt: new Date().toISOString(),
        deletedByUid: OWNER_UID,
      });
    });
    await assertSucceeds(getDoc(tombstoneRef(STAFF_UID)));
  });

  it('a member of a DIFFERENT business cannot read this business\'s tombstone', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY), {
        deletedAt: new Date().toISOString(),
        deletedByUid: OWNER_UID,
      });
    });
    await assertFails(getDoc(tombstoneRef(OTHER_OWNER_UID)));
  });
});

describe('tombstones/{key} — delete', () => {
  it('the active editor (Owner) can delete a tombstone (the two authorized lifecycle endpoints: finalization, explicit discard)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY), {
        deletedAt: new Date().toISOString(),
        deletedByUid: OWNER_UID,
      });
    });
    await assertSucceeds(deleteDoc(tombstoneRef(OWNER_UID)));
  });

  it('a plain staff member (non-editor) CANNOT delete a tombstone', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'tombstones', TOMBSTONE_KEY), {
        deletedAt: new Date().toISOString(),
        deletedByUid: OWNER_UID,
      });
    });
    await assertFails(deleteDoc(tombstoneRef(STAFF_UID)));
  });
});
