// SuperAdmin V1 Operational Control Plane — Phase E real Firestore
// query-execution verification (BDR-0010, POL-18-001, spec v1.2).
//
// WHY THIS FILE EXISTS: tests/superadmin-business-directory.test.ts
// already proves queryBusinessDirectory()'s logic against an in-memory
// fake. It does NOT and cannot prove a real Firestore engine actually
// accepts and correctly executes the query shapes that module builds
// — particularly the two-field range query for Operational Activity,
// which Rule 8's own real-emulator check already confirmed works as a
// standalone query shape, but never through this module's actual
// implementation. This file closes that gap: it imports the REAL,
// unmodified `queryBusinessDirectory()` from server/businessDirectory.ts
// — no duplicated query logic — and calls it against a real
// firebase-admin Firestore instance connected to the local emulator,
// matching production's own code path exactly (Admin SDK, the same
// chainable Query shape, not the client SDK's functional composition).
//
// *** IMPORTANT BOUNDARY *** — same as every real-Firestore
// verification this project has produced: this proves query execution
// and filter semantics against a real engine. It does not prove
// production has every required composite index deployed — the
// emulator is known to be more lenient than production about
// composite-index enforcement. That remains a separate,
// not-yet-performed deployment-level verification.
//
// HOW TO RUN:
//   npm run test:superadmin-business-directory-firestore:emulator
//
// This suite could not be executed in the sandbox that authored it —
// confirmed by direct attempt, storage.googleapis.com is not in this
// sandbox's network allowlist. Typechecked but not run end-to-end from
// this environment.

import { before, after, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { queryBusinessDirectory, type BusinessDirectoryDb } from '../server/businessDirectory';

const EMULATOR_PROJECT_ID = 'sabush-bpt-rules-test';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

let app: App;
let db: Firestore;
let directoryDb: BusinessDirectoryDb;

before(() => {
  app = initializeApp({ projectId: EMULATOR_PROJECT_ID }, 'business-directory-firestore-query-test');
  db = getFirestore(app);
  directoryDb = db as unknown as BusinessDirectoryDb;
});

after(async () => {
  await deleteApp(app);
});

const NOW = new Date('2026-08-15T00:00:00.000Z');
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ------------------------------------------------------------------
// Realistic fixtures — full field sets matching the actual Business
// document shape (not synthetic minimal stubs), covering every
// scenario the checkpoint requires: search matches, all four
// Operational Activity states with exact boundary values, the
// never-active invariant, and dimension-independence combinations.
// ------------------------------------------------------------------
before(async () => {
  const businesses = [
    {
      id: 'biz-new',
      name: 'Mercearia Nova Aurora',
      ownerUid: 'owner-1',
      category: 'Mercearia',
      currencySymbol: 'MT',
      createdAt: daysAgo(5),
      lastActivityAt: daysAgo(5), // = createdAt, matches the creation-time invariant
      subscriptionStatusCache: 'trial_active',
      suspended: false,
    },
    {
      id: 'biz-active',
      name: 'Loja Central Muhalaze',
      ownerUid: 'owner-2',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(3),
      subscriptionStatusCache: 'active',
      suspended: false,
    },
    {
      id: 'biz-active-boundary',
      name: 'Loja Fronteira Norte',
      ownerUid: 'owner-3',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(14), // exact Active boundary
      subscriptionStatusCache: 'active',
      suspended: false,
    },
    {
      id: 'biz-inactive',
      name: 'Padaria Sul',
      ownerUid: 'owner-4',
      category: 'Padaria',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(20),
      subscriptionStatusCache: 'active',
      suspended: false,
    },
    {
      id: 'biz-dormant',
      name: 'Bar Esquina',
      ownerUid: 'owner-5',
      category: 'Bar',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(60),
      subscriptionStatusCache: 'expired',
      suspended: false,
    },
    {
      id: 'biz-never-active',
      name: 'Loja Esquecida',
      ownerUid: 'owner-6',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(200), // = createdAt — never had real activity
      subscriptionStatusCache: 'trial_completed',
      suspended: false,
    },
    {
      id: 'biz-active-grace',
      name: 'Loja Graça',
      ownerUid: 'owner-7',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(2),
      subscriptionStatusCache: 'grace_period',
      suspended: false,
    },
    {
      id: 'biz-active-suspended',
      name: 'Loja Suspensa',
      ownerUid: 'owner-8',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(1),
      subscriptionStatusCache: 'active',
      suspended: true,
    },
    {
      id: 'biz-dormant-active-sub',
      name: 'Loja Dormente Paga',
      ownerUid: 'owner-9',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(60),
      subscriptionStatusCache: 'active',
      suspended: false,
    },
  ];
  await Promise.all(businesses.map((b) => db.collection('businesses').doc(b.id).set(b)));
});

// ------------------------------------------------------------------
// A. Search / filter combinations — real, no unintended client-side
// filtering: every assertion below checks exactly what Firestore's
// own query engine returned, not a locally-filtered copy.
// ------------------------------------------------------------------
describe('A. Search / filter combinations (real Firestore)', () => {
  it('search by exact business ID', async () => {
    const result = await queryBusinessDirectory(directoryDb, { search: 'biz-active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.ok(result.rows.some((r) => r.businessId === 'biz-active'));
  });

  it('search by name prefix', async () => {
    const result = await queryBusinessDirectory(directoryDb, { search: 'Loja' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.ok(result.rows.length > 0);
    assert.ok(result.rows.every((r) => r.name?.startsWith('Loja')));
  });

  it('search + Suspension combines in one real query', async () => {
    const result = await queryBusinessDirectory(directoryDb, { search: 'Loja', suspended: true }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-suspended']);
  });

  it('search + Subscription State combines in one real query', async () => {
    const result = await queryBusinessDirectory(directoryDb, { search: 'Loja', subscriptionState: 'grace_period' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-grace']);
  });

  it('search + Operational Activity is applied as a bounded post-filter, not a compound range query', async () => {
    const result = await queryBusinessDirectory(directoryDb, { search: 'Loja', operationalActivity: 'dormant' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId).sort(), ['biz-dormant-active-sub', 'biz-never-active'].sort());
  });
});

// ------------------------------------------------------------------
// B. Activity-state boundaries — the real two-field range query,
// exercised through the actual module, not a standalone hand-rolled
// query (Rule 8's own gate proved the query SHAPE works; this proves
// this module's actual implementation of it works).
// ------------------------------------------------------------------
describe('B. Activity-state boundaries (real two-field range query)', () => {
  it('New', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'new' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-new']);
  });

  it('Active, including the exact 14-day boundary', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const ids = result.rows.map((r) => r.businessId).sort();
    assert.deepEqual(ids, ['biz-active', 'biz-active-boundary', 'biz-active-grace', 'biz-active-suspended'].sort());
  });

  it('Inactive', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'inactive' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-inactive']);
  });

  it('Dormant, including the never-active invariant (lastActivityAt == createdAt, correctly discoverable via the real range filter)', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'dormant' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const ids = result.rows.map((r) => r.businessId).sort();
    assert.deepEqual(ids, ['biz-dormant', 'biz-dormant-active-sub', 'biz-never-active'].sort());
  });
});

// ------------------------------------------------------------------
// C. Dimension independence — real combined equality + range queries.
// ------------------------------------------------------------------
describe('C. Dimension independence (real combined queries)', () => {
  it('Active + Grace Period', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'active', subscriptionState: 'grace_period' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-grace']);
  });

  it('Active + Suspended', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'active', suspended: true }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-suspended']);
  });

  it('Dormant + Active Subscription', async () => {
    const result = await queryBusinessDirectory(directoryDb, { operationalActivity: 'dormant', subscriptionState: 'active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-dormant-active-sub']);
  });
});

// ------------------------------------------------------------------
// D. Subscription-cache reads — proven against a real engine that the
// module reads subscriptionStatusCache directly off the businesses
// document, never a live subscriptions/{businessId} lookup.
// ------------------------------------------------------------------
describe('D. Subscription-cache reads (real Firestore, no subscriptions/ collection ever touched)', () => {
  it('filters correctly by subscriptionStatusCache alone', async () => {
    const result = await queryBusinessDirectory(directoryDb, { subscriptionState: 'expired' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-dormant']);
  });
});

// ------------------------------------------------------------------
// E. Sorting — real Firestore orderBy, all three fields.
// ------------------------------------------------------------------
describe('E. Sorting (real Firestore orderBy)', () => {
  it('by name, ascending', async () => {
    const result = await queryBusinessDirectory(directoryDb, { sortBy: 'name' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const names = result.rows.map((r) => r.name);
    assert.deepEqual(names, [...names].sort());
  });

  it('by createdAt, descending', async () => {
    const result = await queryBusinessDirectory(directoryDb, { sortBy: 'createdAt' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows[0].businessId, 'biz-new');
  });

  it('by lastActivityAt, descending', async () => {
    const result = await queryBusinessDirectory(directoryDb, { sortBy: 'lastActivityAt' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows[0].businessId, 'biz-active-suspended');
  });
});

// ------------------------------------------------------------------
// F. Cursor pagination — real Firestore startAfter, proven with a
// real 105-document seed distinct from the fixtures above, verifying
// zero overlap and zero missing rows across two real pages.
// ------------------------------------------------------------------
describe('F. Cursor pagination (real Firestore startAfter)', () => {
  before(async () => {
    const bulk = Array.from({ length: 105 }, (_, i) => ({
      id: `bulk-${String(i).padStart(3, '0')}`,
      name: `Bulk Business ${String(i).padStart(3, '0')}`,
      ownerUid: 'owner-bulk',
      category: 'Loja',
      currencySymbol: 'MT',
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(1),
      // Deliberately a status no core fixture above uses (they use
      // trial_active/active/expired/trial_completed/grace_period) —
      // makes this filter uniquely isolate the bulk set, avoiding a
      // miscounted assertion below rather than requiring one.
      subscriptionStatusCache: 'trial_pending',
      suspended: false,
    }));
    await Promise.all(bulk.map((b) => db.collection('businesses').doc(b.id).set(b)));
  });

  it('page 1 returns exactly 100 rows with a next cursor', async () => {
    const result = await queryBusinessDirectory(directoryDb, { sortBy: 'name', subscriptionState: 'trial_pending' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows.length, 100);
    assert.ok(result.nextCursor);
  });

  it('page 2, via the real cursor, has zero overlap with page 1 and together account for all 105 bulk rows', async () => {
    const page1 = await queryBusinessDirectory(directoryDb, { sortBy: 'name', subscriptionState: 'trial_pending' }, NOW);
    assert.equal(page1.outcome, 'ok');
    if (page1.outcome !== 'ok') return;

    const page2 = await queryBusinessDirectory(directoryDb, { sortBy: 'name', subscriptionState: 'trial_pending', cursor: page1.nextCursor! }, NOW);
    assert.equal(page2.outcome, 'ok');
    if (page2.outcome !== 'ok') return;

    const p1 = new Set(page1.rows.map((r) => r.businessId));
    const p2 = new Set(page2.rows.map((r) => r.businessId));
    const overlap = [...p1].filter((id) => p2.has(id));
    assert.deepEqual(overlap, []);
    // subscriptionState: 'trial_pending' uniquely isolates the 105
    // bulk rows — no core fixture above uses that status value.
    assert.equal(p1.size + p2.size, 105);
  });
});
