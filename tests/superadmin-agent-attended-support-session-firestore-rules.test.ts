// SuperAdmin Agent Attended Support Session — Checkpoint 1 Firestore
// Security Rules test suite.
//
// WHY THIS FILE EXISTS: this is the dedicated, falsifiable test Rule 8
// Finding 12-A requires before Implementation Authorization is
// considered complete, and the first thing Checkpoint 1 of the signed
// Implementation Authorization (docs/engineering/superadmin-agent-
// attended-support-session-implementation-authorization.md, §10 item 1)
// names as required validation. It answers exactly one question,
// directly against the real firestore.rules file via the emulator, not
// inferred from application code: **can a legitimately connected
// Support operator read only the active customer's own support-session
// data, while another platform operator or an unrelated tenant
// cannot?**
//
// SCOPE: Checkpoint 1 — the isActiveSupportOperatorForSession()
// authorization boundary on supportSessions, supportViewState, pointer,
// and webrtcSignaling — PLUS Checkpoint 2's own addition: the
// supportSessionInvitation/current read/write authorization boundary
// (member-only read, Admin-SDK-only write; no platform-operator read
// grant exists on this collection at all). Heartbeat semantics
// (Checkpoint 3), Support View State field-content allowlisting
// (Checkpoint 4), and pointer/WebRTC content shape (Checkpoints 5-6)
// remain deliberately out of scope for this file. This suite seeds
// supportSessions and supportSessionInvitation documents directly
// (bypassing rules, via withSecurityRulesDisabled), exactly as
// tests/firestore-rules.test.ts's own initialStockRecoveryAuthorization
// suite seeds Authorization documents — Checkpoint 2 does add the real
// server-side routes that write these documents in production
// (server/supportSessionInvitation.ts, server/supportSessionConsumption.ts),
// covered by their own dedicated unit-test files
// (tests/support-session-invitation.test.ts,
// tests/support-session-consumption.test.ts) rather than by this rules
// suite, which stays focused on the rules layer only.
//
// HOW TO RUN:
//   npm run test:support-session-rules
// (added by this same change) requires a Firestore emulator already
// running on localhost:8080 (see firebase.json). Equivalent one-command
// form:
//   npm run test:support-session-rules:emulator
//
// This suite could not be executed in the sandbox that authored it —
// this sandbox's network egress is allow-listed to a fixed set of
// domains (npm, github, pypi, crates.io, ubuntu archives) and does not
// include Google's emulator-binary infrastructure, the identical
// limitation tests/firestore-rules.test.ts's own header already
// discloses. It has been typechecked (`tsc --noEmit`) but NOT run
// end-to-end. Treat a clean run of
// `npm run test:support-session-rules:emulator` as the actual
// acceptance gate before this checkpoint is considered complete — not
// this file's existence or its passing a typecheck alone.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-rules-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';

const OWNER_UID = 'owner1'; // member of BIZ — "the customer"
const OTHER_OWNER_UID = 'owner2'; // member of OTHER_BIZ — tenant isolation checks
const STAFF_UID = 'staff1'; // also a member of BIZ — "the customer" can be non-Owner too

const OPERATOR_UID = 'operator1'; // the Support operator legitimately connected to SESSION_ID on BIZ
const OTHER_OPERATOR_UID = 'operator2'; // a real platform operator with NO session on BIZ at all
const WRONG_SESSION_OPERATOR_UID = 'operator3'; // a real platform operator with a session naming operator3, not operator1

const SESSION_ID = 'session1';

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
  // Defensive: if before() failed to reach the emulator (e.g. "fetch
  // failed" — no emulator running), testEnv was never assigned. Without
  // this guard, that produces a second, more confusing failure here on
  // top of the real one, obscuring the actual problem.
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed every fixture user's own profile doc — myProfile()/isMemberOf()
  // in the rules read users/{uid} directly, not auth custom claims.
  // Seed every fixture operator's own platform_operators/{uid} doc —
  // isPlatformOperator() reads this directly, existence only (no
  // platformRole-based distinction anywhere in this capability's rules,
  // matching this file's own single existing isPlatformOperator() use
  // at platform_audit_log).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(db, 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
    await setDoc(doc(db, 'users', STAFF_UID), { role: 'staff', businessId: BIZ });
    await setDoc(doc(db, 'platform_operators', OPERATOR_UID), { platformRole: 'support' });
    await setDoc(doc(db, 'platform_operators', OTHER_OPERATOR_UID), { platformRole: 'support' });
    await setDoc(doc(db, 'platform_operators', WRONG_SESSION_OPERATOR_UID), { platformRole: 'support' });
  });
});

function ctxFor(uid: string) {
  return testEnv.authenticatedContext(uid);
}

/**
 * Seeds a businesses/{businessId}/supportSessions/{sessionId} document
 * directly via the Admin SDK bypass — standing in for the server-side
 * establishment route (Checkpoint 2, not yet built) that will write
 * this document in production, exactly as
 * tests/firestore-rules.test.ts's own seedAuthorization() stands in for
 * initialStockRecoveryAuthorization's server-side grant route.
 */
async function seedSession(
  businessId: string,
  sessionId: string,
  fields: { operatorUid: string; status: 'active' | 'reconnecting' | 'ended' }
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'supportSessions', sessionId), {
      businessId,
      operatorUid: fields.operatorUid,
      status: fields.status,
      renderingPath: 'mobile',
      establishedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      lastHeartbeatAt: serverTimestamp(),
      lastOperatorHeartbeatAt: serverTimestamp(),
    });
  });
}

// ---------------------------------------------------------------------
// supportSessions/{sessionId} — the authorization root every nested
// collection's own grant (isActiveSupportOperatorForSession) depends on.
// ---------------------------------------------------------------------
describe('supportSessions — session-scoped Firestore authorization (Checkpoint 1, I-12/FR-63)', () => {
  it("THE core Finding 12-A test: a real platform operator with NO active session for this business cannot read its Session document — platformRole/isPlatformOperator() alone is never sufficient", async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    // OTHER_OPERATOR_UID is a verified platform_operators/{uid} — but
    // never consumed any code, never named on any Session for BIZ.
    const otherOperatorDb = ctxFor(OTHER_OPERATOR_UID).firestore();
    await assertFails(getDoc(doc(otherOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('The legitimately connected Support operator (matching operatorUid, status active) CAN read the Session document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('The legitimately connected Support operator CAN still read while the Session is "reconnecting" (grace period, FR-55)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'reconnecting' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('A real platform operator whose OWN session on this business has already ENDED cannot read it (status check, FR-61)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'ended' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('A real platform operator named on a DIFFERENT Session (wrong operatorUid) cannot read this Session (operator-session binding, I-5)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const wrongOperatorDb = ctxFor(WRONG_SESSION_OPERATOR_UID).firestore();
    await assertFails(getDoc(doc(wrongOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it("Tenant isolation: the operator's active session is for OTHER_BIZ — reading the SAME session id under BIZ still fails (path-scoped, Rule K/L)", async () => {
    await seedSession(OTHER_BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID)));
    // Confirmed readable on the business it actually belongs to.
    await assertSucceeds(getDoc(doc(operatorDb, 'businesses', OTHER_BIZ, 'supportSessions', SESSION_ID)));
  });

  it('The customer (any business member — Owner or Staff) can read their own Session document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await assertSucceeds(getDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID)));
    await assertSucceeds(getDoc(doc(ctxFor(STAFF_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('A member of a DIFFERENT business cannot read this Session document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await assertFails(getDoc(doc(ctxFor(OTHER_OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });

  it('No client — Owner, Staff, or the matched Support operator — can WRITE a Session document from the client SDK (Admin-SDK/server-only, matching initialStockRecoveryAuthorization)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const sessionBody = {
      businessId: BIZ, operatorUid: OPERATOR_UID, status: 'active',
      renderingPath: 'mobile', establishedAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', 'session-new'), sessionBody));
    await assertFails(
      updateDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID), { status: 'ended' })
    );
    await assertFails(
      updateDoc(doc(ctxFor(OPERATOR_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID), {
        lastOperatorHeartbeatAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID)));
  });
});

// ---------------------------------------------------------------------
// supportViewState — mobile path. Support-read-only, customer-write-only.
// ---------------------------------------------------------------------
describe('supportSessions/{sessionId}/supportViewState — mobile path authorization (Checkpoint 1)', () => {
  it('The legitimately connected Support operator CAN read the Support View State document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'), {
        route: '/add-stock', viewportWidth: 390, viewportHeight: 844,
      });
    });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(
      getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'))
    );
  });

  it('A platform operator with NO active session for this business cannot read the Support View State document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'), {
        route: '/add-stock',
      });
    });
    const otherOperatorDb = ctxFor(OTHER_OPERATOR_UID).firestore();
    await assertFails(
      getDoc(doc(otherOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'))
    );
  });

  it('The customer (their own tenant session, FR-25) CAN write the Support View State document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'), {
        route: '/add-stock', viewportWidth: 390, viewportHeight: 844,
      })
    );
  });

  it('The Support operator — matched or not — can NEVER write the Support View State document (FR-24, I-6)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(
      setDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'), {
        route: '/add-stock',
      })
    );
  });

  it('A member of a DIFFERENT business cannot write this Session\'s Support View State document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const otherOwnerDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(otherOwnerDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'supportViewState', 'current'), {
        route: '/add-stock',
      })
    );
  });
});

// ---------------------------------------------------------------------
// pointer — common to both rendering paths. Support-write, both-read.
// ---------------------------------------------------------------------
describe('supportSessions/{sessionId}/pointer — pointer channel authorization (Checkpoint 1)', () => {
  it('The legitimately connected Support operator CAN write the pointer document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(
      setDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'), {
        x: 120, y: 340, timestamp: Date.now(),
      })
    );
  });

  it('A platform operator with NO active session for this business cannot write the pointer document — the first-ever platform-operator client write in this codebase must stay narrowly scoped (Rule 8 Finding 3-B)', async () => {
    const otherOperatorDb = ctxFor(OTHER_OPERATOR_UID).firestore();
    await assertFails(
      setDoc(doc(otherOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'), {
        x: 1, y: 1, timestamp: Date.now(),
      })
    );
  });

  it('The customer (any business member) can NEVER write the pointer document — Support-only (FR-28)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'), {
        x: 1, y: 1, timestamp: Date.now(),
      })
    );
  });

  it('The customer CAN read the pointer document their connected Support operator publishes', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'), {
        x: 50, y: 60, timestamp: Date.now(),
      });
    });
    await assertSucceeds(
      getDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'))
    );
  });

  it('A member of a DIFFERENT business cannot read this Session\'s pointer document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'), {
        x: 50, y: 60, timestamp: Date.now(),
      });
    });
    await assertFails(
      getDoc(doc(ctxFor(OTHER_OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'pointer', 'current'))
    );
  });
});

// ---------------------------------------------------------------------
// webrtcSignaling — desktop path only. Bidirectional read/create.
// ---------------------------------------------------------------------
describe('supportSessions/{sessionId}/webrtcSignaling — desktop signaling authorization (Checkpoint 1)', () => {
  it('The legitimately connected Support operator CAN create and read a signaling document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(
      setDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'answer'), {
        type: 'answer', sdp: 'v=0...',
      })
    );
    await assertSucceeds(
      getDoc(doc(operatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'answer'))
    );
  });

  it('The customer CAN create and read a signaling document (the offer)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'), {
        type: 'offer', sdp: 'v=0...',
      })
    );
  });

  it('A platform operator with NO active session for this business cannot read or create a signaling document', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    const otherOperatorDb = ctxFor(OTHER_OPERATOR_UID).firestore();
    await assertFails(
      setDoc(doc(otherOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'), {
        type: 'offer', sdp: 'v=0...',
      })
    );
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'), {
        type: 'offer', sdp: 'v=0...',
      });
    });
    await assertFails(
      getDoc(doc(otherOperatorDb, 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'))
    );
  });

  it('No client — Owner or the matched Support operator — can update or delete a signaling document (write-once; cleanup deferred to the Desktop WebRTC checkpoint)', async () => {
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'), {
        type: 'offer', sdp: 'v=0...',
      });
    });
    await assertFails(
      updateDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'), {
        sdp: 'v=0...changed',
      })
    );
    await assertFails(
      deleteDoc(doc(ctxFor(OPERATOR_UID).firestore(), 'businesses', BIZ, 'supportSessions', SESSION_ID, 'webrtcSignaling', 'offer'))
    );
  });
});

// ---------------------------------------------------------------------
// supportSessionInvitation/current — Checkpoint 2's own rules addition.
// Generation/consumption/lockout are entirely server-mediated (Admin
// SDK, server/supportSessionInvitation.ts /
// server/supportSessionConsumption.ts) — this collection's rules fix
// only the read boundary (the customer's own tenant session) and the
// write boundary (Admin-SDK-only). No platform-operator read grant
// exists on this collection at all; a Support operator's only
// interaction with it is via the consume-code route, which bypasses
// these rules via the Admin SDK.
// ---------------------------------------------------------------------
async function seedInvitation(businessId: string, fields: { status: 'active' | 'consumed' | 'expired' | 'locked'; generatedByUid: string }) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'supportSessionInvitation', 'current'), {
      codeHash: 'irrelevant-for-rules-test',
      codeSalt: 'irrelevant-for-rules-test',
      status: fields.status,
      generatedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      failedAttempts: 0,
      lockedAt: null,
      consumedByUid: null,
      consumedAt: null,
      generatedByUid: fields.generatedByUid,
    });
  });
}

describe('supportSessionInvitation/current — Checkpoint 2 authorization boundary', () => {
  it('A member of the business (the customer, Owner or non-Owner) CAN read the Invitation document', async () => {
    await seedInvitation(BIZ, { status: 'active', generatedByUid: OWNER_UID });
    await assertSucceeds(getDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current')));
    await assertSucceeds(getDoc(doc(ctxFor(STAFF_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current')));
  });

  it('A member of a DIFFERENT business cannot read the Invitation document (tenant isolation)', async () => {
    await seedInvitation(BIZ, { status: 'active', generatedByUid: OWNER_UID });
    await assertFails(getDoc(doc(ctxFor(OTHER_OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current')));
  });

  it('A real platform operator CANNOT read the Invitation document directly, even a legitimately connected one for this business (no platform-operator read grant exists on this collection at all)', async () => {
    await seedInvitation(BIZ, { status: 'active', generatedByUid: OWNER_UID });
    await seedSession(BIZ, SESSION_ID, { operatorUid: OPERATOR_UID, status: 'active' });
    await assertFails(getDoc(doc(ctxFor(OPERATOR_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current')));
  });

  it('No client — customer or platform operator — can write the Invitation document; generation/consumption/lockout are exclusively Admin-SDK-mediated', async () => {
    await assertFails(
      setDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current'), {
        status: 'active', codeHash: 'x', codeSalt: 'y',
      })
    );
    await seedInvitation(BIZ, { status: 'active', generatedByUid: OWNER_UID });
    await assertFails(
      updateDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current'), {
        status: 'consumed',
      })
    );
    await assertFails(
      updateDoc(doc(ctxFor(OPERATOR_UID).firestore(), 'businesses', BIZ, 'supportSessionInvitation', 'current'), {
        status: 'consumed',
      })
    );
  });
});
