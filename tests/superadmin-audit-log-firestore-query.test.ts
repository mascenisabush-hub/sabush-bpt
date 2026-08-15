// SuperAdmin V1 Operational Control Plane — Phase D real Firestore
// query-execution verification.
//
// WHY THIS FILE EXISTS: tests/superadmin-audit-log-query.test.ts
// already proves queryAuditLog()'s logic is correct against an
// in-memory fake that mimics Firestore's chainable Query API. It does
// NOT and cannot prove that a real Firestore engine actually accepts
// and correctly executes the query shapes that module builds — filter
// semantics, ordering, and the composite-index requirements those
// shapes imply can only be answered by running against a live
// Firestore instance. This file does that.
//
// This imports the REAL, unmodified `queryAuditLog()` from
// server/auditLogQuery.ts — no duplicated query logic, no
// reimplementation. It is called with a real `firebase-admin`
// Firestore instance connected to the local emulator, matching
// production's own code path exactly: server/index.ts passes
// `queryAuditLog()` a `db` obtained from `getFirestore(app)` via
// `firebase-admin/firestore` (the Admin SDK), cast
// `as unknown as AuditLogDb` — not the modular client SDK
// `@firebase/rules-unit-testing` gives you (whose Firestore instances
// use functional `query()`/`where()`/`orderBy()` composition, not the
// chainable `.where().orderBy().limit()` shape `AuditLogQueryLike`
// expects). This file therefore does NOT use
// `@firebase/rules-unit-testing` (unlike tests/firestore-rules.test.ts)
// — it connects via the Admin SDK directly, the same way
// server/index.ts's own `auditLogDb` does, just pointed at the local
// emulator instead of production credentials.
//
// *** IMPORTANT BOUNDARY, READ BEFORE TRUSTING THIS FILE'S RESULTS ***
// This proves the query shapes execute correctly against a real
// Firestore engine and return the right documents in the right order.
// It does NOT prove production Firestore has every required composite
// index actually deployed — the Firestore emulator is known to be
// more lenient than production about composite-index enforcement; a
// query that succeeds here is not guaranteed to succeed against
// production without the corresponding entries in
// firestore.indexes.json actually being deployed there. That remains
// a separate, not-yet-performed deployment-level verification.
//
// HOW TO RUN:
//   npm run test:audit-log-firestore-query:emulator
// (requires a Firestore emulator; the single-command way, matching
// tests/open-batch-concurrency.test.ts's own precedent exactly, uses
// firebase-tools emulators:exec to start the emulator, run this file,
// then tear the emulator down automatically.)
//
// This suite could not be executed in the sandbox that authored it —
// confirmed by direct attempt, storage.googleapis.com (required to
// download the emulator binary) is not in this sandbox's network
// allowlist. Typechecked but not run end-to-end from this environment.

import { before, after, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { queryAuditLog, type AuditLogDb } from '../server/auditLogQuery';

const EMULATOR_PROJECT_ID = 'sabush-bpt-rules-test';

// emulators:exec (the wrapper this file's :emulator script uses) sets
// FIRESTORE_EMULATOR_HOST for the child process automatically. This
// fallback exists only for a developer running `npm run
// test:audit-log-firestore-query` directly against an
// already-running, manually-started emulator — same defensive
// posture, not a behavior change to how the wrapped script connects.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

let app: App;
let db: Firestore;
let auditLogDb: AuditLogDb;

before(() => {
  // A distinctly-named app instance, matching this repo's own
  // precedent for avoiding collisions with any other initializeApp()
  // call in the same process — no credentials needed, since
  // FIRESTORE_EMULATOR_HOST routes every call to the local emulator,
  // which does not authenticate.
  app = initializeApp({ projectId: EMULATOR_PROJECT_ID }, 'audit-log-firestore-query-test');
  db = getFirestore(app);
  auditLogDb = db as unknown as AuditLogDb;
});

after(async () => {
  await deleteApp(app);
});

// ------------------------------------------------------------------
// Fixed dataset, seeded once — every test below is read-only, so a
// single shared seed (rather than a beforeEach reseed) is both
// correct and avoids unnecessary emulator writes. Deterministic
// timestamps, one document per named event for easy cross-reference
// against the assertions below.
// ------------------------------------------------------------------

const T1 = '2026-01-01T00:00:00.000Z'; // Event A
const T2 = '2026-01-02T00:00:00.000Z'; // Event B
const T3 = '2026-01-03T00:00:00.000Z'; // Event C
const T4 = '2026-01-04T00:00:00.000Z'; // Event D
const T5 = '2026-01-05T00:00:00.000Z'; // Event E

before(async () => {
  const events: Array<{ id: string; data: Record<string, unknown> }> = [
    {
      id: 'evt-a',
      data: { actorUid: 'actor-a', actorRole: 'superadmin', actionType: 'business.viewed', targetBusinessId: 'business-a', timestamp: T1 },
    },
    {
      id: 'evt-b',
      data: { actorUid: 'actor-a', actorRole: 'superadmin', actionType: 'business.suspended', targetBusinessId: 'business-a', justification: 'abuse report', timestamp: T2 },
    },
    {
      id: 'evt-c',
      data: { actorUid: 'actor-b', actorRole: 'superadmin', actionType: 'business.reactivated', targetBusinessId: 'business-a', justification: 'resolved', timestamp: T3 },
    },
    {
      id: 'evt-d',
      data: { actorUid: 'actor-b', actorRole: 'superadmin', actionType: 'operator.provisioned', targetUid: 'new-operator', timestamp: T4 },
    },
    {
      id: 'evt-e',
      data: { actorUid: 'actor-c', actorRole: 'superadmin', actionType: 'payment.confirmed', targetBusinessId: 'business-b', timestamp: T5 },
    },
  ];
  await Promise.all(events.map((e) => db.collection('platform_audit_log').doc(e.id).set(e.data)));
});

// ------------------------------------------------------------------
// A. No equality filters
// ------------------------------------------------------------------
describe('A. no equality filters', () => {
  it('returns all seeded events, ordered timestamp desc, unfiltered', async () => {
    const result = await queryAuditLog(auditLogDb, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 5);
    // Explicit order check with 5 matching documents, not just length.
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-e', 'evt-d', 'evt-c', 'evt-b', 'evt-a']);
  });
});

// ------------------------------------------------------------------
// B. Business filter
// ------------------------------------------------------------------
describe('B. business filter', () => {
  it('targetBusinessId=business-a returns exactly A, B, C, ordered desc; excludes business-b and the businessId-absent event', async () => {
    const result = await queryAuditLog(auditLogDb, { businessId: 'business-a' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-c', 'evt-b', 'evt-a']);
  });
});

// ------------------------------------------------------------------
// C. Actor filter
// ------------------------------------------------------------------
describe('C. actor filter', () => {
  it('actorUid=actor-a returns exactly A, B, ordered desc', async () => {
    const result = await queryAuditLog(auditLogDb, { actorUid: 'actor-a' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b', 'evt-a']);
  });
});

// ------------------------------------------------------------------
// D. Action-type filter
// ------------------------------------------------------------------
describe('D. action-type filter', () => {
  it('actionType=business.suspended returns exactly B', async () => {
    const result = await queryAuditLog(auditLogDb, { actionType: 'business.suspended' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b']);
  });
});

// ------------------------------------------------------------------
// E. Business + Actor
// ------------------------------------------------------------------
describe('E. business + actor', () => {
  it('businessId=business-a + actorUid=actor-a returns exactly A, B — excludes C (actor-b)', async () => {
    const result = await queryAuditLog(auditLogDb, { businessId: 'business-a', actorUid: 'actor-a' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b', 'evt-a']);
  });
});

// ------------------------------------------------------------------
// F. Business + Action type
// ------------------------------------------------------------------
describe('F. business + action type', () => {
  it('businessId=business-a + actionType=business.suspended returns exactly B', async () => {
    const result = await queryAuditLog(auditLogDb, { businessId: 'business-a', actionType: 'business.suspended' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b']);
  });
});

// ------------------------------------------------------------------
// G. Actor + Action type
// ------------------------------------------------------------------
describe('G. actor + action type', () => {
  it('actorUid=actor-b + actionType=business.reactivated returns exactly C', async () => {
    const result = await queryAuditLog(auditLogDb, { actorUid: 'actor-b', actionType: 'business.reactivated' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-c']);
  });
});

// ------------------------------------------------------------------
// H. Business + Actor + Action type
// ------------------------------------------------------------------
describe('H. business + actor + action type', () => {
  it('all three equality filters together return exactly B, the sole document matching all three', async () => {
    const result = await queryAuditLog(auditLogDb, { businessId: 'business-a', actorUid: 'actor-a', actionType: 'business.suspended' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b']);
  });
});

// ------------------------------------------------------------------
// Date-range tests — auditLogQuery.ts's actual comparison semantics
// (confirmed by reading the committed source): `from` maps to
// `timestamp >= from` (inclusive), `to` maps to `timestamp <= to`
// (inclusive). Tested here against the real engine, not assumed.
// ------------------------------------------------------------------
describe('date range', () => {
  it('from=T3 (inclusive) returns C, D, E — A and B are strictly before T3', async () => {
    const result = await queryAuditLog(auditLogDb, { from: T3 });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-e', 'evt-d', 'evt-c']);
  });

  it('to=T2 (inclusive) returns A, B — C, D, E are strictly after T2', async () => {
    const result = await queryAuditLog(auditLogDb, { to: T2 });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-b', 'evt-a']);
  });

  it('from=T2 and to=T4 together return exactly B, C, D — the boundary events are inclusive, A and E excluded', async () => {
    const result = await queryAuditLog(auditLogDb, { from: T2, to: T4 });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-d', 'evt-c', 'evt-b']);
  });

  it('a date range combined with an equality filter narrows correctly: businessId=business-a + from=T2 returns B, C', async () => {
    const result = await queryAuditLog(auditLogDb, { businessId: 'business-a', from: T2 });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['evt-c', 'evt-b']);
  });
});

// ------------------------------------------------------------------
// Limit — a real, distinct seed of 105 additional documents, run
// last so it doesn't disturb the exact-count assertions above (all
// of which use filters that naturally exclude these, and the one
// unfiltered test, "A. no equality filters," already ran and
// asserted its exact 5-document result before this block's own
// `before` hook adds anything). Cheap enough against a local emulator
// (105 tiny document writes) to genuinely prove .limit(100) is
// enforced by the real engine, not just correctly spelled in the
// query builder.
// ------------------------------------------------------------------
describe('limit', () => {
  before(async () => {
    const extra = Array.from({ length: 105 }, (_, i) => ({
      id: `limit-extra-${i}`,
      data: {
        actorUid: 'limit-test-actor',
        actorRole: 'superadmin',
        actionType: 'business.viewed',
        timestamp: new Date(2027, 0, 1, 0, 0, i).toISOString(),
      },
    }));
    await Promise.all(extra.map((e) => db.collection('platform_audit_log').doc(e.id).set(e.data)));
  });

  it('an unfiltered query never returns more than 100 documents, even when 110 exist', async () => {
    const result = await queryAuditLog(auditLogDb, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 100);
  });

  it('a filtered query into the 105-document limit-test set also caps at 100', async () => {
    const result = await queryAuditLog(auditLogDb, { actorUid: 'limit-test-actor' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 100);
  });
});
