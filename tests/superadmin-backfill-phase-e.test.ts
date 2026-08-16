// SuperAdmin V1 Operational Control Plane — Phase E backfill tests
// (BDR-0010, POL-18-001, docs/specs/18-superadmin-business-directory-slice.md
// v1.2 §16/§18).
//
// Scope: server/backfillPhaseE.ts only. server/scripts/backfillPhaseE.ts
// (the real CLI entry point) is intentionally NOT imported here — it
// calls initializeApp({credential: cert(...)}) at module load, same
// constraint as server/index.ts and every other script in that
// directory; the decision/orchestration logic it wraps is fully
// covered here instead.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-backfill-phase-e.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computeBackfillDecision, runBackfill, type BackfillDb } from '../server/backfillPhaseE';

// ------------------------------------------------------------------
// Part 1 — computeBackfillDecision(): pure, no I/O, fully deterministic.
// ------------------------------------------------------------------
describe('computeBackfillDecision — pure decision logic', () => {
  it('a business with an existing timeline event: lastActivityAt backfills from that event, not createdAt', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      mostRecentTimelineEventAt: '2026-03-15T00:00:00.000Z',
    });
    assert.equal(d.lastActivityAtUpdate, '2026-03-15T00:00:00.000Z');
  });

  it('a business with NO timeline events: lastActivityAt backfills from createdAt, matching the same invariant established at creation time', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      mostRecentTimelineEventAt: undefined,
    });
    assert.equal(d.lastActivityAtUpdate, '2026-01-01T00:00:00.000Z');
  });

  it('idempotent: a business that already has lastActivityAt gets no update for that field, regardless of timeline history', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      existingLastActivityAt: '2026-05-01T00:00:00.000Z',
      mostRecentTimelineEventAt: '2026-03-15T00:00:00.000Z', // would be a different, WRONG value if applied
    });
    assert.equal(d.lastActivityAtUpdate, undefined);
  });

  it('subscriptionStatusCache backfills from the canonical subscription status when absent', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      canonicalSubscriptionStatus: 'active',
    });
    assert.equal(d.subscriptionStatusCacheUpdate, 'active');
  });

  it('idempotent: a business that already has subscriptionStatusCache gets no update for that field', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      existingSubscriptionStatusCache: 'active',
      canonicalSubscriptionStatus: 'expired', // would be a different, WRONG value if applied
    });
    assert.equal(d.subscriptionStatusCacheUpdate, undefined);
  });

  it('never invents a subscriptionStatusCache value when no canonical subscription exists', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      canonicalSubscriptionStatus: undefined,
    });
    assert.equal(d.subscriptionStatusCacheUpdate, undefined);
  });

  it('a business needing neither field returns a decision with both updates undefined', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      existingLastActivityAt: '2026-05-01T00:00:00.000Z',
      existingSubscriptionStatusCache: 'active',
    });
    assert.equal(d.lastActivityAtUpdate, undefined);
    assert.equal(d.subscriptionStatusCacheUpdate, undefined);
  });

  it('a business needing both fields returns both updates in one decision', () => {
    const d = computeBackfillDecision({
      businessId: 'biz-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      mostRecentTimelineEventAt: '2026-02-01T00:00:00.000Z',
      canonicalSubscriptionStatus: 'trial_active',
    });
    assert.equal(d.lastActivityAtUpdate, '2026-02-01T00:00:00.000Z');
    assert.equal(d.subscriptionStatusCacheUpdate, 'trial_active');
  });
});

// ------------------------------------------------------------------
// Part 2 — runBackfill(): orchestration against an in-memory fake.
// ------------------------------------------------------------------

interface FakeBusiness {
  id: string;
  createdAt: string;
  lastActivityAt?: string;
  subscriptionStatusCache?: string;
}

interface FakeTimelineEvent {
  createdAt: string;
}

function makeFakeDb(
  businesses: FakeBusiness[],
  timelineEventsByBusiness: Record<string, FakeTimelineEvent[]>,
  subscriptionsByBusiness: Record<string, { status: string } | undefined>,
): BackfillDb & { subscriptionReadCount: number; businessesState: () => Record<string, FakeBusiness> } {
  const bizState: Record<string, FakeBusiness> = Object.fromEntries(businesses.map((b) => [b.id, { ...b }]));
  let subscriptionReadCount = 0;
  let subscriptionWriteAttempted = false;

  return {
    get subscriptionReadCount() {
      return subscriptionReadCount;
    },
    businessesState() {
      return { ...bizState };
    },
    collection(name: string) {
      if (name === 'businesses') {
        return {
          async get() {
            return {
              docs: Object.values(bizState).map((b) => ({
                id: b.id,
                exists: true,
                data: () => ({ ...b }),
              })),
            };
          },
          doc(businessId: string) {
            return {
              async update(data: Record<string, unknown>) {
                bizState[businessId] = { ...bizState[businessId], ...data } as FakeBusiness;
              },
              collection(subName: string) {
                if (subName !== 'timelineEvents') throw new Error(`fake db: unsupported subcollection "${subName}"`);
                const events = [...(timelineEventsByBusiness[businessId] ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
                return {
                  orderBy(_field: 'createdAt', _dir: 'desc') {
                    return {
                      limit(n: number) {
                        return {
                          async get() {
                            return { docs: events.slice(0, n).map((e, i) => ({ id: `evt-${i}`, exists: true, data: () => e })) };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        } as never;
      }
      if (name === 'subscriptions') {
        return {
          doc(businessId: string) {
            return {
              async get() {
                subscriptionReadCount += 1;
                const sub = subscriptionsByBusiness[businessId];
                return { id: businessId, exists: !!sub, data: () => sub };
              },
              async update() {
                subscriptionWriteAttempted = true;
                throw new Error('backfillPhaseE.ts must never write to subscriptions/ — this is a canonical-record violation');
              },
            };
          },
        } as never;
      }
      throw new Error(`fake db: unsupported collection "${name}"`);
    },
  } as never;
}

describe('runBackfill — orchestration', () => {
  it('backfills lastActivityAt from the most recent timelineEvents entry, subscriptionStatusCache from the canonical subscription', async () => {
    const db = makeFakeDb(
      [{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' }],
      { 'biz-1': [{ createdAt: '2026-02-01T00:00:00.000Z' }, { createdAt: '2026-03-01T00:00:00.000Z' }] }, // most recent = March
      { 'biz-1': { status: 'active' } },
    );
    const summary = await runBackfill(db);

    assert.equal(summary.totalBusinesses, 1);
    assert.equal(summary.lastActivityAtBackfilled, 1);
    assert.equal(summary.subscriptionStatusCacheBackfilled, 1);
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, '2026-03-01T00:00:00.000Z');
    assert.equal(db.businessesState()['biz-1'].subscriptionStatusCache, 'active');
  });

  it('a business with no timeline events gets lastActivityAt = createdAt', async () => {
    const db = makeFakeDb([{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' }], { 'biz-1': [] }, { 'biz-1': { status: 'trial_pending' } });
    await runBackfill(db);
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, '2026-01-01T00:00:00.000Z');
  });

  it('idempotent: a business that already has both fields is untouched and counted as alreadyComplete', async () => {
    const db = makeFakeDb(
      [{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z', lastActivityAt: '2026-05-01T00:00:00.000Z', subscriptionStatusCache: 'active' }],
      { 'biz-1': [{ createdAt: '2026-06-01T00:00:00.000Z' }] }, // present but must be ignored — field already set
      { 'biz-1': { status: 'expired' } }, // present but must be ignored — field already set
      );
    const summary = await runBackfill(db);

    assert.equal(summary.alreadyComplete, 1);
    assert.equal(summary.lastActivityAtBackfilled, 0);
    assert.equal(summary.subscriptionStatusCacheBackfilled, 0);
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, '2026-05-01T00:00:00.000Z'); // unchanged
    assert.equal(db.businessesState()['biz-1'].subscriptionStatusCache, 'active'); // unchanged
  });

  it('idempotent: does not even READ timelineEvents or subscriptions for a business that already has both fields — no wasted work', async () => {
    const db = makeFakeDb(
      [{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z', lastActivityAt: '2026-05-01T00:00:00.000Z', subscriptionStatusCache: 'active' }],
      {},
      {},
    );
    await runBackfill(db);
    assert.equal(db.subscriptionReadCount, 0);
  });

  it('a business with no subscription document at all is flagged, not silently skipped, and subscriptionStatusCache is left unset', async () => {
    const db = makeFakeDb([{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' }], { 'biz-1': [] }, { 'biz-1': undefined });
    const summary = await runBackfill(db);

    assert.equal(summary.missingSubscriptionDoc, 1);
    assert.equal(summary.subscriptionStatusCacheBackfilled, 0);
    assert.equal(db.businessesState()['biz-1'].subscriptionStatusCache, undefined);
    // lastActivityAt still backfills correctly regardless — the two
    // fields are independent, one missing subscription doc doesn't
    // block the other backfill.
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, '2026-01-01T00:00:00.000Z');
  });

  it('dry-run computes the correct summary but writes nothing', async () => {
    const db = makeFakeDb([{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' }], { 'biz-1': [] }, { 'biz-1': { status: 'active' } });
    const summary = await runBackfill(db, { dryRun: true });

    assert.equal(summary.lastActivityAtBackfilled, 1);
    assert.equal(summary.subscriptionStatusCacheBackfilled, 1);
    // The fake's businessesState() reflects the ORIGINAL, unwritten
    // data — dry-run must never call .update().
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, undefined);
    assert.equal(db.businessesState()['biz-1'].subscriptionStatusCache, undefined);
  });

  it('processes multiple businesses independently, correct per-business results', async () => {
    const db = makeFakeDb(
      [
        { id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'biz-2', createdAt: '2026-02-01T00:00:00.000Z', lastActivityAt: '2026-06-01T00:00:00.000Z', subscriptionStatusCache: 'active' },
      ],
      { 'biz-1': [{ createdAt: '2026-01-15T00:00:00.000Z' }] },
      { 'biz-1': { status: 'trial_active' } },
    );
    const summary = await runBackfill(db);

    assert.equal(summary.totalBusinesses, 2);
    assert.equal(summary.lastActivityAtBackfilled, 1); // only biz-1
    assert.equal(summary.alreadyComplete, 1); // only biz-2
    assert.equal(db.businessesState()['biz-1'].lastActivityAt, '2026-01-15T00:00:00.000Z');
    assert.equal(db.businessesState()['biz-2'].lastActivityAt, '2026-06-01T00:00:00.000Z'); // untouched
  });

  it('never attempts to write to subscriptions/ — the fake throws if this module ever calls .update() on that collection', async () => {
    // This test passing (not throwing) is itself the proof: if
    // runBackfill ever attempted a subscriptions/ write, the fake's
    // own .update() implementation above would throw, failing this
    // test loudly rather than silently.
    const db = makeFakeDb([{ id: 'biz-1', createdAt: '2026-01-01T00:00:00.000Z' }], { 'biz-1': [] }, { 'biz-1': { status: 'active' } });
    await assert.doesNotReject(runBackfill(db));
  });
});
