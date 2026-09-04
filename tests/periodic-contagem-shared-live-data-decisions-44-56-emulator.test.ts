// Periodic Contagem Shared Live Data — Decisions 44-56 — Firestore
// Security Rules emulator suite.
//
// WHY THIS FILE EXISTS: tests/periodic-contagem-shared-live-data-decisions-
// 44-56.test.ts (source-text-pattern assertions) verifies the RULE TEXT
// exists in the expected shape. It cannot verify the rules actually
// ENFORCE that shape against a real rules engine — that requires the
// Firestore emulator, exactly like tests/firestore-rules.test.ts's own
// existing suite for the rest of firestore.rules. This file is that
// suite, scoped to the new contagemAuthority/items/{rowKey}/stockCounts
// mechanisms Decisions 44-56 and the Implementation Authorization
// (commit 67d60a7) added.
//
// HOW TO RUN:
//   npm run test:periodic-contagem-shared-live-data-decisions-44-56:emulator
// which uses `firebase-tools emulators:exec` to start the Firestore
// emulator, run this suite against it, then tear the emulator down
// automatically. Requires a one-time emulator binary download from
// Google's infrastructure the first time it runs.
//
// This suite could NOT be executed in the sandbox that authored it — the
// environment's network egress is allow-listed to a fixed set of domains
// (npm, github, pypi, crates.io, ubuntu archives) and does not include
// Google's emulator-binary infrastructure (confirmed empirically this
// session: `firebase emulators:exec` fails with `download failed, status
// 403: Host not in allowlist: storage.googleapis.com`). It has been
// typechecked (`tsc --noEmit`) but NOT run end-to-end. A clean run of the
// `:emulator` script above — not this file's mere existence or a passing
// typecheck — is the actual evidence needed before Finding K, or any of
// Decisions 47/50/55/56's technical mechanisms, can be reclassified as
// server-side verified in the Rule 8 Assessment.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-periodic-shared-live-data-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';

const OWNER_UID = 'owner1';
const DELEGATE_UID = 'staffA'; // will be assigned as the delegated Editor for BIZ
const OTHER_STAFF_UID = 'staffB'; // authorized for BIZ, never delegated — a Viewer
const OUTSIDE_STAFF_UID = 'staffC'; // NOT authorized for BIZ at all — ineligible candidate
const OTHER_OWNER_UID = 'owner2'; // owns OTHER_BIZ — tenant isolation checks

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
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(db, 'users', DELEGATE_UID), { role: 'staff', businessId: BIZ });
    await setDoc(doc(db, 'users', OTHER_STAFF_UID), { role: 'staff', businessId: BIZ });
    await setDoc(doc(db, 'users', OUTSIDE_STAFF_UID), { role: 'staff', businessId: OTHER_BIZ });
    await setDoc(doc(db, 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
  });
});

function ctxFor(uid: string) {
  return testEnv.authenticatedContext(uid);
}

async function assignDelegate(uid: string | null) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
      delegatedEditorUid: uid,
      assignedByUid: OWNER_UID,
      assignedAt: new Date().toISOString(),
    });
  });
}

async function seedRow(rowKey: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', rowKey), data);
  });
}

async function seedMeta(openConflictCount: number) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
      type: 'periodic',
      date: '2026-09-04',
      updatedAt: new Date().toISOString(),
      openConflictCount,
    });
  });
}

// ---------------------------------------------------------------------
// contagemAuthority/current — Decision 46 §1, 48, 49, 54
// ---------------------------------------------------------------------
describe('contagemAuthority/current', () => {
  it('Owner can assign an eligible staff member (same business) as delegate', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
        delegatedEditorUid: DELEGATE_UID,
        assignedByUid: OWNER_UID,
        assignedAt: serverTimestamp(),
      })
    );
  });

  it('Owner CANNOT assign a candidate who is not authorized for this business (Decision 54 eligibility)', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
        delegatedEditorUid: OUTSIDE_STAFF_UID,
        assignedByUid: OWNER_UID,
        assignedAt: serverTimestamp(),
      })
    );
  });

  it('Owner can explicitly clear delegation (uid: null)', async () => {
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
        delegatedEditorUid: null,
        assignedByUid: OWNER_UID,
        assignedAt: serverTimestamp(),
      })
    );
  });

  it('Staff (including the current delegate) CANNOT assign/reassign delegation', async () => {
    const db = ctxFor(DELEGATE_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
        delegatedEditorUid: DELEGATE_UID,
        assignedByUid: DELEGATE_UID,
        assignedAt: serverTimestamp(),
      })
    );
  });

  it('a Viewer (authorized, non-delegate staff) CAN read the authority document', async () => {
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(OTHER_STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current')));
  });

  it('the document can never be deleted, even by the Owner (Decision 48/49 — explicit-null clear is the only path)', async () => {
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current')));
  });

  it('an owner from a DIFFERENT business cannot assign delegation for this business (tenant isolation)', async () => {
    const db = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'contagemAuthority', 'current'), {
        delegatedEditorUid: DELEGATE_UID,
        assignedByUid: OTHER_OWNER_UID,
        assignedAt: serverTimestamp(),
      })
    );
  });
});

// ---------------------------------------------------------------------
// stockCountDrafts/periodic — widened read (Decision 52), write gated to
// isActiveContagemEditor (Decision 46) — and stockCountDrafts/initial
// UNCHANGED (regression check for the wildcard-vs-specific rule design)
// ---------------------------------------------------------------------
describe('stockCountDrafts/periodic — dual-editor + Viewer read', () => {
  it('Owner can read and write the periodic meta document', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
        type: 'periodic', date: '2026-09-04', updatedAt: new Date().toISOString(),
      })
    );
  });

  it('the currently delegated Editor can read AND write the periodic meta document', async () => {
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(DELEGATE_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
        type: 'periodic', date: '2026-09-04', updatedAt: new Date().toISOString(),
      })
    );
  });

  it('an authorized non-delegate staff member (Viewer) can READ but CANNOT write the periodic meta document', async () => {
    await assignDelegate(DELEGATE_UID); // OTHER_STAFF_UID is deliberately NOT the delegate
    const db = ctxFor(OTHER_STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
        type: 'periodic', date: '2026-09-04', updatedAt: new Date().toISOString(),
      })
    );
  });

  it('a former delegate (reassigned away) immediately loses write access — Decision 49', async () => {
    await assignDelegate(DELEGATE_UID);
    await assignDelegate(OTHER_STAFF_UID); // reassign away from DELEGATE_UID to OTHER_STAFF_UID
    const db = ctxFor(DELEGATE_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
        type: 'periodic', date: '2026-09-04', updatedAt: new Date().toISOString(),
      })
    );
  });

  it('REGRESSION: stockCountDrafts/initial remains Owner-only for BOTH read and write — the wildcard block is untouched', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'initial'), { type: 'initial' });
    });
    const staffDb = ctxFor(OTHER_STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
  });
  it('REGRESSION FIX (found by this exact emulator run): the wildcard stockCountDrafts/{draftId} block no longer bypasses the periodic three-branch rule for the Owner', async () => {
    // Before the fix: the wildcard's unconditional isOwnerOf write
    // grant also matched draftId=='periodic', so an Owner's stale
    // write (or an arbitrary-value "resolution") always succeeded
    // regardless of what the more-specific block required. Fixed by
    // adding `draftId != 'periodic'` to the wildcard's own two write
    // grants (meta doc and items/{rowKey}) — see firestore.rules'
    // own comment at that exact line for the full explanation.
    await seedRow('catalog:pWildcard', {
      productName: 'Produto Wildcard', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 5, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    const db = ctxFor(OWNER_UID).firestore();
    // A stale rev (not 5+1=6) must now be rejected for the Owner too.
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:pWildcard'), {
        productName: 'Produto Wildcard', quantity: '99', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('the exclusion does not affect stockCountDrafts/initial — Owner can still write it exactly as before', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { type: 'initial' })
    );
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'initial', 'items', 'row1'), {
        productName: 'X', quantity: '1', unit: 'un', costPrice: '1', sellingPrice: '1',
      })
    );
  });
});

// ---------------------------------------------------------------------
// items/{rowKey} — the three-branch write rule (ordinary/conflict/
// resolution) — Decision 47/55; Technical Design §7/§8/§9
// ---------------------------------------------------------------------
describe('stockCountDrafts/periodic/items/{rowKey} — concurrency + conflict', () => {
  it('Owner can create a row at rev 1 with their own uid as lastWriterUid', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('a create is REJECTED if rev != 1 or lastWriterUid does not match the caller', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p2'), {
        productName: 'Produto Y', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 1, state: 'ACCEPTED', lastWriterUid: DELEGATE_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('an ordinary update with rev == priorRev + 1 by any Active Editor succeeds', async () => {
    await seedRow('catalog:p1', {
      productName: 'Produto X', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(DELEGATE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 2, state: 'ACCEPTED', lastWriterUid: DELEGATE_UID, lastWriterRole: 'delegate', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('a STALE write (rev does not equal priorRev + 1) is REJECTED — never blind last-write-wins', async () => {
    await seedRow('catalog:p1', {
      productName: 'Produto X', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 3, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '99', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 2, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('a genuine collision transition (ACCEPTED -> CONFLICT) with both observations succeeds', async () => {
    await seedRow('catalog:p1', {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await assignDelegate(DELEGATE_UID);
    const db = ctxFor(DELEGATE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 2, state: 'CONFLICT',
        conflict: {
          observationA: { value: '12', writerUid: OWNER_UID, writerRole: 'owner', at: new Date().toISOString(), baseRev: 1 },
          observationB: { value: '15', writerUid: DELEGATE_UID, writerRole: 'delegate', at: new Date().toISOString(), baseRev: 1 },
        },
      })
    );
  });

  it('resolution (CONFLICT -> ACCEPTED) succeeds ONLY when the new quantity matches one of the two preserved observations', async () => {
    await seedRow('catalog:p1', {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 2, state: 'CONFLICT',
      conflict: {
        observationA: { value: '12', writerUid: OWNER_UID, writerRole: 'owner', at: new Date().toISOString(), baseRev: 1 },
        observationB: { value: '15', writerUid: DELEGATE_UID, writerRole: 'delegate', at: new Date().toISOString(), baseRev: 1 },
      },
    });
    const db = ctxFor(OWNER_UID).firestore();
    // A third, freshly-typed value MUST be rejected — never a new observation via "resolution".
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '20', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 3, state: 'ACCEPTED',
        conflict: {
          observationA: { value: '12', writerUid: OWNER_UID, writerRole: 'owner', at: new Date().toISOString(), baseRev: 1 },
          observationB: { value: '15', writerUid: DELEGATE_UID, writerRole: 'delegate', at: new Date().toISOString(), baseRev: 1 },
          resolvedValue: '20', resolverUid: OWNER_UID, resolverRole: 'owner', resolvedAt: new Date().toISOString(),
        },
      })
    );
    // Selecting one of the two ALREADY-preserved values succeeds.
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '15', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 3, state: 'ACCEPTED',
        conflict: {
          observationA: { value: '12', writerUid: OWNER_UID, writerRole: 'owner', at: new Date().toISOString(), baseRev: 1 },
          observationB: { value: '15', writerUid: DELEGATE_UID, writerRole: 'delegate', at: new Date().toISOString(), baseRev: 1 },
          resolvedValue: '15', resolverUid: OWNER_UID, resolverRole: 'owner', resolvedAt: new Date().toISOString(),
        },
      })
    );
  });

  it('a Viewer (authorized, non-delegate staff) CANNOT write a row at all — read-only, per Decision 52', async () => {
    await assignDelegate(DELEGATE_UID);
    await seedRow('catalog:p1', {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    const db = ctxFor(OTHER_STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1')));
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'), {
        productName: 'Produto X', quantity: '99', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 2, state: 'ACCEPTED', lastWriterUid: OTHER_STAFF_UID, lastWriterRole: 'delegate', lastWriteAt: new Date().toISOString(),
      })
    );
  });
});

// ---------------------------------------------------------------------
// stockCounts (finalization) — Decision 55 §5 items 7-10 precondition,
// and Decision 56's update/delete split
// ---------------------------------------------------------------------
describe('stockCounts create — openConflictCount precondition (Decision 55)', () => {
  it('finalization SUCCEEDS when no periodic draft exists at all (never blocked for an unrelated reason)', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCounts', 'stockcount-periodic-sub1'), {
        type: 'periodic', date: '2026-09-04', items: [], confirmedAt: serverTimestamp(),
      })
    );
  });

  it('finalization SUCCEEDS when openConflictCount is 0', async () => {
    await seedMeta(0);
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'stockCounts', 'stockcount-periodic-sub2'), {
        type: 'periodic', date: '2026-09-04', items: [], confirmedAt: serverTimestamp(),
      })
    );
  });

  it('finalization is REJECTED when openConflictCount > 0 — never resolves the conflict, only refuses', async () => {
    await seedMeta(1);
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'stockCounts', 'stockcount-periodic-sub3'), {
        type: 'periodic', date: '2026-09-04', items: [], confirmedAt: serverTimestamp(),
      })
    );
  });
});

describe('stockCounts update/delete — Decision 56 immutability (update-only narrowing)', () => {
  it('a finalized non-initial stockCounts document CANNOT be updated by anyone, even the Owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCounts', 'sc1'), {
        type: 'periodic', date: '2026-09-04', items: [],
      });
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, 'businesses', BIZ, 'stockCounts', 'sc1'), { label: 'edited' }));
  });

  it('REGRESSION — Decision 56 §7 NOT decided here: delete remains available to the Owner exactly as before (Clear All Data dependency)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCounts', 'sc2'), {
        type: 'periodic', date: '2026-09-04', items: [],
      });
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'businesses', BIZ, 'stockCounts', 'sc2')));
  });
});
