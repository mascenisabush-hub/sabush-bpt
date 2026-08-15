// RULE 8 VERIFICATION — SuperAdmin Business Directory (Phase E)
//
// Purpose: determine whether this project's Firestore supports a
// query combining inequality/range filters on two DIFFERENT fields
// (createdAt, lastActivityAt) in one query — the exact shape the
// Phase E specification's "no denormalized bucket field" design
// requires (docs/specs/18-superadmin-business-directory-slice.md,
// §10/§12/§13, Resolution Log Item 2).
//
// This has zero precedent anywhere in this codebase's existing query
// usage — every prior range-query usage (Phase D's audit log, Phase
// B's search, the trial/grace-period sweeps) is always a range on a
// single field. This test is the one thing standing between the
// current ENVIRONMENT BLOCKED Rule 8 verdict and either READY or the
// documented fallback (a single static `businessAgeExpiresAt` field).
//
// This file is NOT part of any production code path, is not imported
// by anything, and should be deleted after this verification runs —
// governance-only artifact, not permanent test infrastructure.
//
// HOW TO RUN:
//   npm run test:rule8-directory-query-gate:emulator
// (add the two package.json scripts below first, or run directly:)
//   firebase emulators:exec --only firestore --project sabush-bpt-rules-test "npx tsx --test tests/TEMP-rule8-directory-query-gate.test.ts"

import { before, after, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const EMULATOR_PROJECT_ID = 'sabush-bpt-rules-test';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

let app: App;
let db: Firestore;

before(() => {
  app = initializeApp({ projectId: EMULATOR_PROJECT_ID }, 'rule8-directory-query-gate');
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

const NOW = new Date('2026-08-15T00:00:00.000Z');
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

// Fixtures covering New / Active / Inactive / Dormant, per POL-18-001's
// exact boundaries (30 / 14 / 45 days), plus the exact boundary values.
before(async () => {
  const fixtures = [
    { id: 'biz-new', createdAt: daysAgo(5), lastActivityAt: daysAgo(2) },       // New (age < 30)
    { id: 'biz-active', createdAt: daysAgo(200), lastActivityAt: daysAgo(3) },  // Active
    { id: 'biz-active-boundary', createdAt: daysAgo(200), lastActivityAt: daysAgo(14) }, // Active, exact 14-day boundary
    { id: 'biz-inactive', createdAt: daysAgo(200), lastActivityAt: daysAgo(20) }, // Inactive
    { id: 'biz-inactive-boundary', createdAt: daysAgo(200), lastActivityAt: daysAgo(15) }, // Inactive, exact 15-day boundary
    { id: 'biz-dormant', createdAt: daysAgo(200), lastActivityAt: daysAgo(60) }, // Dormant
    { id: 'biz-dormant-boundary', createdAt: daysAgo(200), lastActivityAt: daysAgo(46) }, // Dormant, exact 46-day boundary
  ];
  await Promise.all(fixtures.map((f) => db.collection('businesses').doc(f.id).set(f)));
});

describe('Rule 8 gate: two-field range query (createdAt + lastActivityAt)', () => {
  it('createdAt range only', async () => {
    const cutoff = daysAgo(30);
    const snap = await db.collection('businesses').where('createdAt', '>=', cutoff).get();
    assert.ok(snap.docs.length >= 1);
  });

  it('lastActivityAt range only', async () => {
    const cutoff = daysAgo(14);
    const snap = await db.collection('businesses').where('lastActivityAt', '>=', cutoff).get();
    assert.ok(snap.docs.length >= 1);
  });

  it('createdAt range AND lastActivityAt range combined — the critical, unprecedented shape', async () => {
    const ageCutoff = daysAgo(30);
    const activeCutoff = daysAgo(14);
    // The exact Active-filter shape the specification proposes:
    // createdAt < ageCutoff (outside New window) AND lastActivityAt >= activeCutoff
    const snap = await db
      .collection('businesses')
      .where('createdAt', '<', ageCutoff)
      .where('lastActivityAt', '>=', activeCutoff)
      .get();
    // If this line is reached at all without throwing, the combined
    // two-field range query executed successfully.
    assert.ok(Array.isArray(snap.docs));
    assert.equal(snap.docs.length, 2); // biz-active, biz-active-boundary
  });

  it('exact 14-day Active boundary is inclusive', async () => {
    const ageCutoff = daysAgo(30);
    const activeCutoff = daysAgo(14);
    const snap = await db
      .collection('businesses')
      .where('createdAt', '<', ageCutoff)
      .where('lastActivityAt', '>=', activeCutoff)
      .get();
    const ids = snap.docs.map((d) => d.id);
    assert.ok(ids.includes('biz-active-boundary'));
  });

  it('exact 45-day Dormant boundary is inclusive on the correct side', async () => {
    const ageCutoff = daysAgo(30);
    const dormantCutoff = daysAgo(45);
    const snap = await db
      .collection('businesses')
      .where('createdAt', '<', ageCutoff)
      .where('lastActivityAt', '<', dormantCutoff)
      .get();
    const ids = snap.docs.map((d) => d.id);
    assert.ok(ids.includes('biz-dormant'));
    assert.ok(ids.includes('biz-dormant-boundary'));
    assert.ok(!ids.includes('biz-inactive'));
  });

  it('Inactive band (15-45 days) excludes both Active and Dormant boundaries', async () => {
    const ageCutoff = daysAgo(30);
    const inactiveStart = daysAgo(45); // <= this (not yet Dormant)
    const inactiveEnd = daysAgo(15);   // >= this (past Active)
    const snap = await db
      .collection('businesses')
      .where('createdAt', '<', ageCutoff)
      .where('lastActivityAt', '>=', inactiveStart)
      .where('lastActivityAt', '<=', inactiveEnd)
      .get();
    const ids = snap.docs.map((d) => d.id);
    assert.ok(ids.includes('biz-inactive'));
    assert.ok(ids.includes('biz-inactive-boundary'));
    assert.ok(!ids.includes('biz-active'));
    assert.ok(!ids.includes('biz-dormant'));
  });
});
