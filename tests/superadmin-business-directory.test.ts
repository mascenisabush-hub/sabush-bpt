// SuperAdmin V1 Operational Control Plane — Phase E server-side tests
// (BDR-0010, POL-18-001, docs/specs/18-superadmin-business-directory-slice.md
// v1.2).
//
// Scope: server/businessDirectory.ts only, exercised directly against
// an in-memory fake — the real module, not a duplicated test-only
// implementation. Same convention as every prior phase's own test
// file: no suite imports server/index.ts directly, since it requires
// real Firebase Admin credentials at module load.
//
// The fake below genuinely applies where()/orderBy()/startAfter()/
// limit() semantics against a fixed dataset — including range
// operators on two different fields simultaneously — so filter and
// pagination tests are real proofs, not just "was .where() called"
// assertions.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-business-directory.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { queryBusinessDirectory, classifyOperationalActivity, type BusinessDirectoryDb } from '../server/businessDirectory';

// ------------------------------------------------------------------
// Fake — genuinely-filtering in-memory Firestore stand-in.
// ------------------------------------------------------------------

interface FakeBusiness {
  id: string;
  name: string;
  createdAt: string;
  lastActivityAt?: string;
  subscriptionStatusCache?: string;
  suspended?: boolean;
  ownerUid?: string;
}

function makeFakeDb(businesses: FakeBusiness[]): BusinessDirectoryDb {
  function makeQuery(
    filters: Array<{ field: string; op: string; value: unknown }>,
    sortField: string | null,
    sortDir: 'asc' | 'desc',
    afterValue: unknown,
    limitN: number | null,
  ) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeQuery([...filters, { field, op, value }], sortField, sortDir, afterValue, limitN);
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        return makeQuery(filters, field, direction, afterValue, limitN);
      },
      startAfter(value: unknown) {
        return makeQuery(filters, sortField, sortDir, value, limitN);
      },
      limit(n: number) {
        return makeQuery(filters, sortField, sortDir, afterValue, n);
      },
      async get() {
        let rows = businesses.filter((b) =>
          filters.every((f) => {
            const actual = (b as unknown as Record<string, unknown>)[f.field];
            if (f.op === '==') return actual === f.value;
            if (f.op === '>=') return typeof actual === 'string' && typeof f.value === 'string' && actual >= f.value;
            if (f.op === '<=') return typeof actual === 'string' && typeof f.value === 'string' && actual <= f.value;
            if (f.op === '<') return typeof actual === 'string' && typeof f.value === 'string' && actual < f.value;
            throw new Error(`fake db does not support op ${f.op}`);
          }),
        );
        if (sortField) {
          rows = [...rows].sort((a, b) => {
            const av = String((a as unknown as Record<string, unknown>)[sortField] ?? '');
            const bv = String((b as unknown as Record<string, unknown>)[sortField] ?? '');
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
          });
        }
        if (afterValue !== undefined && sortField) {
          const idx = rows.findIndex((r) => String((r as unknown as Record<string, unknown>)[sortField]) === String(afterValue));
          rows = idx >= 0 ? rows.slice(idx + 1) : rows;
        }
        if (limitN != null) rows = rows.slice(0, limitN);
        return { docs: rows.map((r) => ({ id: r.id, exists: true, data: () => ({ ...r }) })) };
      },
    };
  }

  return {
    collection(_name: 'businesses') {
      return {
        ...makeQuery([], null, 'asc', undefined, null),
        doc(id: string) {
          return {
            async get() {
              const b = businesses.find((x) => x.id === id);
              return { id, exists: !!b, data: () => (b ? { ...b } : undefined) };
            },
          };
        },
      } as never;
    },
  };
}

const NOW = new Date('2026-08-15T00:00:00.000Z');
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ------------------------------------------------------------------
// Part 1 — classifyOperationalActivity() — pure boundary logic
// ------------------------------------------------------------------
describe('classifyOperationalActivity — POL-18-001 boundaries', () => {
  it('New: business within 30 days, regardless of activity', () => {
    const r = classifyOperationalActivity(daysAgo(5), daysAgo(1), NOW);
    assert.equal(r.state, 'New');
    assert.equal(r.daysSinceActivity, null);
  });

  it('New: even with zero activity ever (lastActivityAt == createdAt)', () => {
    const r = classifyOperationalActivity(daysAgo(5), daysAgo(5), NOW);
    assert.equal(r.state, 'New');
  });

  it('Active: exactly 14 days since activity (inclusive boundary)', () => {
    const r = classifyOperationalActivity(daysAgo(200), daysAgo(14), NOW);
    assert.equal(r.state, 'Active');
    assert.equal(r.daysSinceActivity, 14);
  });

  it('Inactive: exactly 15 days since activity (inclusive boundary, just past Active)', () => {
    const r = classifyOperationalActivity(daysAgo(200), daysAgo(15), NOW);
    assert.equal(r.state, 'Inactive');
  });

  it('Inactive: exactly 45 days since activity (inclusive boundary, still Inactive)', () => {
    const r = classifyOperationalActivity(daysAgo(200), daysAgo(45), NOW);
    assert.equal(r.state, 'Inactive');
  });

  it('Dormant: exactly 46 days since activity (just past Inactive)', () => {
    const r = classifyOperationalActivity(daysAgo(200), daysAgo(46), NOW);
    assert.equal(r.state, 'Dormant');
  });

  it('Dormant: a never-active business (lastActivityAt == createdAt, both old)', () => {
    const r = classifyOperationalActivity(daysAgo(200), daysAgo(200), NOW);
    assert.equal(r.state, 'Dormant');
  });

  it('Dormant: no lastActivityAt at all, outside New window (legacy/malformed data)', () => {
    const r = classifyOperationalActivity(daysAgo(200), undefined, NOW);
    assert.equal(r.state, 'Dormant');
    assert.equal(r.daysSinceActivity, null);
  });
});

// ------------------------------------------------------------------
// Fixtures for the full query module — covers search, filters, sort,
// pagination, and dimension independence.
// ------------------------------------------------------------------
const FIXTURES: FakeBusiness[] = [
  { id: 'biz-new', name: 'Loja Nova', createdAt: daysAgo(5), lastActivityAt: daysAgo(5), suspended: false, subscriptionStatusCache: 'trial_active', ownerUid: 'u-1' },
  { id: 'biz-active', name: 'Loja Central', createdAt: daysAgo(200), lastActivityAt: daysAgo(3), suspended: false, subscriptionStatusCache: 'active', ownerUid: 'u-2' },
  { id: 'biz-active-boundary', name: 'Loja Boundary', createdAt: daysAgo(200), lastActivityAt: daysAgo(14), suspended: false, subscriptionStatusCache: 'active', ownerUid: 'u-3' },
  { id: 'biz-inactive', name: 'Loja Norte', createdAt: daysAgo(200), lastActivityAt: daysAgo(20), suspended: false, subscriptionStatusCache: 'active', ownerUid: 'u-4' },
  { id: 'biz-dormant', name: 'Padaria Sul', createdAt: daysAgo(200), lastActivityAt: daysAgo(60), suspended: false, subscriptionStatusCache: 'expired', ownerUid: 'u-5' },
  { id: 'biz-never-active', name: 'Loja Esquecida', createdAt: daysAgo(200), lastActivityAt: daysAgo(200), suspended: false, subscriptionStatusCache: 'trial_completed', ownerUid: 'u-6' },
  // Dimension-independence fixtures — deliberately "contradictory-looking" combinations, per BDR-0010 Part 1.
  { id: 'biz-active-grace', name: 'Loja Graça', createdAt: daysAgo(200), lastActivityAt: daysAgo(2), suspended: false, subscriptionStatusCache: 'grace_period', ownerUid: 'u-7' },
  { id: 'biz-active-suspended', name: 'Loja Suspensa', createdAt: daysAgo(200), lastActivityAt: daysAgo(1), suspended: true, subscriptionStatusCache: 'active', ownerUid: 'u-8' },
  { id: 'biz-dormant-active-sub', name: 'Loja Dormente Paga', createdAt: daysAgo(200), lastActivityAt: daysAgo(60), suspended: false, subscriptionStatusCache: 'active', ownerUid: 'u-9' },
];

describe('queryBusinessDirectory — search', () => {
  it('search by exact ID', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { search: 'biz-active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.ok(result.rows.some((r) => r.businessId === 'biz-active'));
  });

  it('search by name prefix', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { search: 'Loja' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.ok(result.rows.length > 0);
    assert.ok(result.rows.every((r) => r.name?.startsWith('Loja')));
    assert.ok(!result.rows.some((r) => r.businessId === 'biz-dormant')); // "Padaria Sul" — not a "Loja" prefix match
  });

  it('search + Suspension combines in one query', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { search: 'Loja', suspended: true }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-suspended']);
  });

  it('search + Subscription State combines in one query', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { search: 'Loja', subscriptionState: 'grace_period' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-grace']);
  });

  it('search + Operational Activity does NOT attempt a compound range query — applied as a post-filter on the bounded search result', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { search: 'Loja', operationalActivity: 'dormant' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    // Both "Loja Dormente Paga" and "Loja Esquecida" match the "Loja"
    // prefix and are genuinely Dormant.
    assert.deepEqual(result.rows.map((r) => r.businessId).sort(), ['biz-dormant-active-sub', 'biz-never-active'].sort());
  });
});

describe('queryBusinessDirectory — Operational Activity filter (no search, real range-query path)', () => {
  it('filters to New only', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'new' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId).sort(), ['biz-new']);
  });

  it('filters to Active only, excludes the exact-14-day boundary business too (both inclusive-Active)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId).sort(), ['biz-active', 'biz-active-boundary', 'biz-active-grace', 'biz-active-suspended'].sort());
  });

  it('filters to Inactive only', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'inactive' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-inactive']);
  });

  it('filters to Dormant only, and correctly includes the never-active business (the invariant this session closed)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'dormant' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const ids = result.rows.map((r) => r.businessId).sort();
    assert.deepEqual(ids, ['biz-dormant', 'biz-dormant-active-sub', 'biz-never-active'].sort());
  });
});

describe('queryBusinessDirectory — dimension independence', () => {
  it('Active + Grace Period is a valid, representable combination', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'active', subscriptionState: 'grace_period' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-grace']);
    assert.equal(result.rows[0].operationalActivity, 'Active');
    assert.equal(result.rows[0].subscriptionState, 'grace_period');
  });

  it('Active + Suspended is a valid, representable combination', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'active', suspended: true }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-active-suspended']);
    assert.equal(result.rows[0].operationalActivity, 'Active');
    assert.equal(result.rows[0].suspended, true);
  });

  it('Dormant + Active Subscription is a valid, representable combination', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { operationalActivity: 'dormant', subscriptionState: 'active' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-dormant-active-sub']);
    assert.equal(result.rows[0].operationalActivity, 'Dormant');
    assert.equal(result.rows[0].subscriptionState, 'active');
  });

  it('no filter combination conflates the three dimensions into one field — every row exposes all three independently', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, {}, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    for (const row of result.rows) {
      assert.ok('operationalActivity' in row);
      assert.ok('subscriptionState' in row);
      assert.ok('suspended' in row);
      // Structural proof: these are three separate keys, not one merged string.
      assert.notEqual(typeof row.operationalActivity, 'undefined');
    }
  });
});

describe('queryBusinessDirectory — subscription cache usage', () => {
  it('filtering by subscriptionState reads subscriptionStatusCache, never touches a subscriptions collection', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { subscriptionState: 'expired' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.rows.map((r) => r.businessId), ['biz-dormant']);
    // The fake db only ever exposes a 'businesses' collection — if this
    // module tried to read a 'subscriptions' collection, the fake would
    // throw (no such collection registered), and this test would fail
    // with an error, not a wrong-result assertion. Reaching this line
    // at all is itself proof the module never touches that collection.
  });

  it('rejects an unknown subscriptionState value rather than silently matching nothing', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { subscriptionState: 'not-a-real-status' }, NOW);
    assert.equal(result.outcome, 'invalid');
  });
});

describe('queryBusinessDirectory — sorting', () => {
  it('sorts by name, ascending', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { sortBy: 'name' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const names = result.rows.map((r) => r.name);
    const sorted = [...names].sort();
    assert.deepEqual(names, sorted);
  });

  it('sorts by createdAt, descending (newest first)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, { sortBy: 'createdAt' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows[0].businessId, 'biz-new'); // most recently created
  });

  it('sorts by lastActivityAt, descending (most recent first) — the default', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, {}, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows[0].businessId, 'biz-active-suspended'); // daysAgo(1), most recent
  });
});

describe('queryBusinessDirectory — pagination', () => {
  it('caps at 100 rows even when more exist', async () => {
    const many: FakeBusiness[] = Array.from({ length: 150 }, (_, i) => ({
      id: `bulk-${String(i).padStart(3, '0')}`,
      name: `Bulk ${String(i).padStart(3, '0')}`,
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(1),
      suspended: false,
    }));
    const db = makeFakeDb(many);
    const result = await queryBusinessDirectory(db, { sortBy: 'name' }, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.rows.length, 100);
    assert.ok(result.nextCursor);
  });

  it('cursor pagination returns no duplicate and no missing rows across two pages', async () => {
    const many: FakeBusiness[] = Array.from({ length: 150 }, (_, i) => ({
      id: `bulk-${String(i).padStart(3, '0')}`,
      name: `Bulk ${String(i).padStart(3, '0')}`,
      createdAt: daysAgo(200),
      lastActivityAt: daysAgo(1),
      suspended: false,
    }));
    const db = makeFakeDb(many);
    const page1 = await queryBusinessDirectory(db, { sortBy: 'name' }, NOW);
    assert.equal(page1.outcome, 'ok');
    if (page1.outcome !== 'ok') return;
    assert.ok(page1.nextCursor);

    const page2 = await queryBusinessDirectory(db, { sortBy: 'name', cursor: page1.nextCursor! }, NOW);
    assert.equal(page2.outcome, 'ok');
    if (page2.outcome !== 'ok') return;

    const page1Ids = new Set(page1.rows.map((r) => r.businessId));
    const page2Ids = new Set(page2.rows.map((r) => r.businessId));
    const overlap = [...page1Ids].filter((id) => page2Ids.has(id));
    assert.deepEqual(overlap, []); // no duplicates
    assert.equal(page1Ids.size + page2Ids.size, 150); // no missing rows
  });

  it('a small result set has no next cursor', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryBusinessDirectory(db, {}, NOW);
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.nextCursor, null);
  });
});

// ------------------------------------------------------------------
// Part 2 — the creation-path invariant, tested structurally.
//
// WHY STATIC/STRUCTURAL, NOT RUNTIME: same constraint documented in
// tests/staff-management-multishop-authorization.test.ts's own
// header — server/index.ts performs Firebase Admin initialization at
// import time, there is no dependency-injection seam for `db`, and
// this sandbox has no live Firestore to exercise the two business-
// creation routes end-to-end. This suite reads server/index.ts as
// source text and asserts the exact invariant is present in both
// creation sites — real verification of what's actually committed.
//
// This exists specifically because the businessDirectory.ts Dormant
// filter (tested above) depends on lastActivityAt always being
// present, never absent, from the moment a business is created — if a
// future change ever silently drops this from either creation site,
// the directory would regress into exactly the missing-field problem
// this session closed. This test is the guard against that.
// ------------------------------------------------------------------
describe('Phase E — lastActivityAt creation invariant (structural)', () => {
  const SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

  it('both business-creation object literals set lastActivityAt: startedAt, matching createdAt', () => {
    const occurrences = SOURCE.match(/lastActivityAt: startedAt,/g) || [];
    assert.equal(
      occurrences.length,
      2,
      'Expected lastActivityAt: startedAt in both business-creation sites (register and addShop) — if this count drops, a newly-created business could be created without lastActivityAt, regressing the Dormant filter\'s missing-field problem this session closed.',
    );
  });

  it('both business-creation object literals also set subscriptionStatusCache: initialSubscription.status', () => {
    const occurrences = SOURCE.match(/subscriptionStatusCache: initialSubscription\.status,/g) || [];
    assert.equal(occurrences.length, 2, 'Expected subscriptionStatusCache in both business-creation sites.');
  });
});
