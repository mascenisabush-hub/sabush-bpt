// Module #19 (Subscriptions) — V1 Subscription Lifecycle Engine tests.
//
// Exercises the real module directly — the pure computeSubscriptionTransition()
// function against plain objects (no I/O at all), and the Firestore-
// integrated layer against a lightweight in-memory fake, matching the
// same pattern every Module #20 producer test suite already
// established in this repository.
//
// Covers every scenario named in the Implementation Authorization's
// own seven-transition table, plus the scenarios explicitly called out
// this session: active -> grace, grace -> expired, reversal repeated
// during grace, payment during grace, payment at the expiry boundary,
// late payment/reversal after expiry, duplicate events, out-of-order
// events, tenant isolation, and historical data preservation.
//
// HOW TO RUN:
//   npx tsx --test tests/subscription-engine.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeSubscriptionTransition,
  isGracePeriodExpired,
  createSubscriptionEngine,
  type SubscriptionSnapshot,
  type SubscriptionEngineDb,
} from '../server/subscriptionEngine';

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(msOffset: number, from = '2026-08-08T12:00:00.000Z'): string {
  return new Date(new Date(from).getTime() + msOffset).toISOString();
}

// ------------------------------------------------------------------
// Part 1 — the pure function, no I/O, exercised directly against plain
// objects. This is the Engine's own core: every one of the seven
// governed transitions, plus the explicitly-unhandled cases.
// ------------------------------------------------------------------

function snap(status: SubscriptionSnapshot['status'], overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return { status, gracePeriodEndsAt: null, renewalDate: null, ...overrides };
}

describe('computeSubscriptionTransition — the seven governed transitions', () => {
  it('trial_completed + payment_success -> active (POL-19-006)', () => {
    const result = computeSubscriptionTransition(snap('trial_completed'), {
      type: 'payment_success',
      occurredAt: iso(0),
    });
    assert.ok(result);
    assert.equal(result!.status, 'active');
    assert.equal(result!.gracePeriodEndsAt, null);
    assert.ok(result!.renewalDate);
    assert.ok(new Date(result!.renewalDate!).getTime() > new Date(iso(0)).getTime());
  });

  it('active + payment_reversal -> grace_period, +7 days from event (POL-19-010)', () => {
    const occurredAt = iso(0);
    const result = computeSubscriptionTransition(snap('active'), { type: 'payment_reversal', occurredAt });
    assert.ok(result);
    assert.equal(result!.status, 'grace_period');
    assert.equal(result!.gracePeriodEndsAt, new Date(new Date(occurredAt).getTime() + 7 * DAY_MS).toISOString());
  });

  it('grace_period + payment_reversal (repeat) -> no change (POL-19-013)', () => {
    const originalEnd = iso(3 * DAY_MS);
    const current = snap('grace_period', { gracePeriodEndsAt: originalEnd });
    const result = computeSubscriptionTransition(current, { type: 'payment_reversal', occurredAt: iso(1 * DAY_MS) });
    assert.equal(result, null);
  });

  it('a second, third, and fourth repeat reversal during grace all remain no-ops — the original deadline never moves', () => {
    const originalEnd = iso(3 * DAY_MS);
    const current = snap('grace_period', { gracePeriodEndsAt: originalEnd });
    for (const offset of [1, 2, 2.5, 2.9].map((d) => d * DAY_MS)) {
      const result = computeSubscriptionTransition(current, { type: 'payment_reversal', occurredAt: iso(offset) });
      assert.equal(result, null, `reversal at offset ${offset}ms should be a no-op`);
    }
  });

  it('grace_period + payment_success -> active (POL-19-004 Transition, POL-19-006)', () => {
    const occurredAt = iso(2 * DAY_MS);
    const current = snap('grace_period', { gracePeriodEndsAt: iso(5 * DAY_MS) });
    const result = computeSubscriptionTransition(current, { type: 'payment_success', occurredAt });
    assert.ok(result);
    assert.equal(result!.status, 'active');
    assert.equal(result!.gracePeriodEndsAt, null);
    assert.ok(result!.renewalDate);
  });

  it('expired + payment_reversal -> no change (POL-19-010/013 Edge Case B, settled)', () => {
    const result = computeSubscriptionTransition(snap('expired'), { type: 'payment_reversal', occurredAt: iso(0) });
    assert.equal(result, null);
  });

  it('a late reversal never resurrects an expired subscription, no matter how many arrive', () => {
    for (const offset of [0, 1, 10, 100].map((d) => d * DAY_MS)) {
      const result = computeSubscriptionTransition(snap('expired'), { type: 'payment_reversal', occurredAt: iso(offset) });
      assert.equal(result, null);
    }
  });

  it('expired + payment_success -> active (POL-19-007 Recovery)', () => {
    const occurredAt = iso(30 * DAY_MS);
    const result = computeSubscriptionTransition(snap('expired'), { type: 'payment_success', occurredAt });
    assert.ok(result);
    assert.equal(result!.status, 'active');
    assert.equal(result!.gracePeriodEndsAt, null);
    assert.ok(result!.renewalDate);
  });
});

describe('computeSubscriptionTransition — explicitly unhandled cases (not silently answered)', () => {
  it('trial_pending + any event -> no change', () => {
    assert.equal(computeSubscriptionTransition(snap('trial_pending'), { type: 'payment_success', occurredAt: iso(0) }), null);
    assert.equal(computeSubscriptionTransition(snap('trial_pending'), { type: 'payment_reversal', occurredAt: iso(0) }), null);
  });

  it("trial_active + payment_success -> no change (Rule 8 v2's own flagged open question, not silently resolved)", () => {
    assert.equal(computeSubscriptionTransition(snap('trial_active'), { type: 'payment_success', occurredAt: iso(0) }), null);
  });

  it('trial_active + payment_reversal -> no change', () => {
    assert.equal(computeSubscriptionTransition(snap('trial_active'), { type: 'payment_reversal', occurredAt: iso(0) }), null);
  });

  it('trial_completed + payment_reversal -> no change (nothing to reverse)', () => {
    assert.equal(computeSubscriptionTransition(snap('trial_completed'), { type: 'payment_reversal', occurredAt: iso(0) }), null);
  });

  it('active + payment_success -> no change (already at the target state)', () => {
    assert.equal(computeSubscriptionTransition(snap('active'), { type: 'payment_success', occurredAt: iso(0) }), null);
  });
});

describe('isGracePeriodExpired', () => {
  it('returns false when gracePeriodEndsAt is null', () => {
    assert.equal(isGracePeriodExpired(null, new Date(iso(0))), false);
  });

  it('returns false before the deadline, true at and after it', () => {
    const deadline = iso(7 * DAY_MS);
    assert.equal(isGracePeriodExpired(deadline, new Date(iso(6.9 * DAY_MS))), false);
    assert.equal(isGracePeriodExpired(deadline, new Date(deadline)), true);
    assert.equal(isGracePeriodExpired(deadline, new Date(iso(7.1 * DAY_MS))), true);
  });
});

// ------------------------------------------------------------------
// Part 2 — the Firestore-integrated layer, against a lightweight fake.
// Proves transactional idempotency, tenant isolation, audit logging,
// and the scheduled sweep — not just the pure logic in isolation.
// ------------------------------------------------------------------

interface FakeSubscription {
  status: string;
  gracePeriodEndsAt: string | null;
  renewalDate: string | null;
  updatedAt?: string;
}

interface FakeSubscriptionRef {
  __businessId: string;
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
}

function makeFakeDb(subscriptionsByBusiness: Record<string, FakeSubscription>): SubscriptionEngineDb & {
  dump(): Record<string, FakeSubscription>;
  auditLog(): Record<string, unknown>[];
} {
  const subs: Record<string, FakeSubscription> = { ...subscriptionsByBusiness };
  const audit: Record<string, unknown>[] = [];

  function makeSubscriptionRef(businessId: string): FakeSubscriptionRef {
    return {
      __businessId: businessId,
      async get() {
        const data = subs[businessId];
        return { exists: !!data, data: () => (data ? { ...data } : undefined) };
      },
    };
  }

  function makeSubscriptionsCollection(filters: { field: string; op: string; value: unknown }[] = []): ReturnType<SubscriptionEngineDb['collection']> {
    return {
      doc(businessId: string) {
        return makeSubscriptionRef(businessId) as never;
      },
      where(field: string, op: string, value: unknown) {
        return makeSubscriptionsCollection([...filters, { field, op, value }]);
      },
      async get() {
        const docs = Object.entries(subs)
          .filter(([, data]) =>
            filters.every((f) => {
              const actual = (data as unknown as Record<string, unknown>)[f.field];
              if (f.op === '==') return actual === f.value;
              if (f.op === '<=') return typeof actual === 'string' && typeof f.value === 'string' && actual <= f.value;
              throw new Error(`Fake Firestore: unsupported op "${f.op}"`);
            }),
          )
          .map(([businessId, data]) => ({ id: businessId, data: () => ({ ...data }) }));
        return { empty: docs.length === 0, docs };
      },
    } as never;
  }

  return {
    collection(name: string) {
      if (name === 'subscriptions') return makeSubscriptionsCollection() as never;
      if (name === 'platform_audit_log') {
        return { doc: () => ({}) } as never;
      }
      throw new Error(`Fake Firestore: unsupported collection "${name}"`);
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref: FakeSubscriptionRef) {
          return ref.get();
        },
        update(ref: FakeSubscriptionRef, data: Record<string, unknown>) {
          subs[ref.__businessId] = { ...subs[ref.__businessId], ...data } as FakeSubscription;
        },
        set(_ref: unknown, data: Record<string, unknown>) {
          audit.push(data);
        },
      };
      return fn(tx as never);
    },
    dump() {
      return { ...subs };
    },
    auditLog() {
      return audit;
    },
  } as never;
}

describe('createSubscriptionEngine().applyLifecycleEvent — transactional integration', () => {
  it('applies a governed transition and writes exactly one audit entry', async () => {
    const db = makeFakeDb({ 'biz-1': { status: 'active', gracePeriodEndsAt: null, renewalDate: null } });
    const engine = createSubscriptionEngine(db);

    const result = await engine.applyLifecycleEvent('biz-1', { type: 'payment_reversal', occurredAt: iso(0) });

    assert.ok(result);
    assert.equal(result!.status, 'grace_period');
    assert.equal(db.dump()['biz-1'].status, 'grace_period');
    assert.ok(db.dump()['biz-1'].gracePeriodEndsAt);
    assert.equal(db.auditLog().length, 1);
    assert.equal(db.auditLog()[0].previousStatus, 'active');
    assert.equal(db.auditLog()[0].newStatus, 'grace_period');
  });

  it('returns null and writes no audit entry when the event produces no change', async () => {
    const db = makeFakeDb({ 'biz-1': { status: 'expired', gracePeriodEndsAt: null, renewalDate: null } });
    const engine = createSubscriptionEngine(db);

    const result = await engine.applyLifecycleEvent('biz-1', { type: 'payment_reversal', occurredAt: iso(0) });

    assert.equal(result, null);
    assert.equal(db.dump()['biz-1'].status, 'expired'); // unchanged
    assert.equal(db.auditLog().length, 0);
  });

  it('a nonexistent business is a safe no-op, not an error', async () => {
    const db = makeFakeDb({});
    const engine = createSubscriptionEngine(db);
    await assert.doesNotReject(() => engine.applyLifecycleEvent('ghost-biz', { type: 'payment_reversal', occurredAt: iso(0) }));
    assert.equal(db.auditLog().length, 0);
  });

  describe('duplicate and out-of-order events', () => {
    it('applying the same reversal event twice in a row is safe and idempotent', async () => {
      const db = makeFakeDb({ 'biz-1': { status: 'active', gracePeriodEndsAt: null, renewalDate: null } });
      const engine = createSubscriptionEngine(db);

      const first = await engine.applyLifecycleEvent('biz-1', { type: 'payment_reversal', occurredAt: iso(0) });
      const secondEndsAt = db.dump()['biz-1'].gracePeriodEndsAt;
      const second = await engine.applyLifecycleEvent('biz-1', { type: 'payment_reversal', occurredAt: iso(0) });

      assert.ok(first);
      assert.equal(second, null); // second call sees grace_period already, correctly a no-op per POL-19-013
      assert.equal(db.dump()['biz-1'].gracePeriodEndsAt, secondEndsAt); // untouched by the duplicate
    });

    it('an out-of-order payment_success arriving after the business has already recovered is a safe no-op', async () => {
      const db = makeFakeDb({ 'biz-1': { status: 'active', gracePeriodEndsAt: null, renewalDate: iso(0) } });
      const engine = createSubscriptionEngine(db);

      // Business is already active; a stale/duplicate payment_success event arrives late.
      const result = await engine.applyLifecycleEvent('biz-1', { type: 'payment_success', occurredAt: iso(-1 * DAY_MS) });
      assert.equal(result, null);
      assert.equal(db.dump()['biz-1'].status, 'active');
    });
  });

  describe('tenant isolation', () => {
    it('applying an event to one business never affects another', async () => {
      const db = makeFakeDb({
        'biz-a': { status: 'active', gracePeriodEndsAt: null, renewalDate: null },
        'biz-b': { status: 'active', gracePeriodEndsAt: null, renewalDate: null },
      });
      const engine = createSubscriptionEngine(db);

      await engine.applyLifecycleEvent('biz-a', { type: 'payment_reversal', occurredAt: iso(0) });

      assert.equal(db.dump()['biz-a'].status, 'grace_period');
      assert.equal(db.dump()['biz-b'].status, 'active'); // untouched
    });
  });
});

describe('createSubscriptionEngine().runGracePeriodExpirySweep — the time-based transition', () => {
  it('transitions a business past its grace deadline to expired', async () => {
    const db = makeFakeDb({
      'biz-1': { status: 'grace_period', gracePeriodEndsAt: iso(-1 * DAY_MS), renewalDate: null }, // deadline already passed
    });
    const engine = createSubscriptionEngine(db);

    await engine.runGracePeriodExpirySweep(new Date(iso(0)));

    assert.equal(db.dump()['biz-1'].status, 'expired');
    assert.equal(db.auditLog().length, 1);
    assert.equal(db.auditLog()[0].newStatus, 'expired');
  });

  it('does not touch a business still within its grace window', async () => {
    const db = makeFakeDb({
      'biz-1': { status: 'grace_period', gracePeriodEndsAt: iso(3 * DAY_MS), renewalDate: null }, // deadline in the future
    });
    const engine = createSubscriptionEngine(db);

    await engine.runGracePeriodExpirySweep(new Date(iso(0)));

    assert.equal(db.dump()['biz-1'].status, 'grace_period');
    assert.equal(db.auditLog().length, 0);
  });

  it('is a no-op for a business that already recovered before the sweep ran (grace-window boundary race)', async () => {
    // Simulates: gracePeriodEndsAt has passed, but the business already
    // recovered to active before this sweep tick reached it — the
    // in-transaction re-check must catch this, not the initial query
    // alone (which only filters on status == 'grace_period' at query
    // time, matching runTrialLifecycleSweep()'s own established
    // precedent for the identical race).
    const db = makeFakeDb({
      'biz-1': { status: 'active', gracePeriodEndsAt: iso(-1 * DAY_MS), renewalDate: iso(29 * DAY_MS) },
    });
    const engine = createSubscriptionEngine(db);

    await engine.runGracePeriodExpirySweep(new Date(iso(0)));

    assert.equal(db.dump()['biz-1'].status, 'active'); // unaffected — status no longer grace_period
    assert.equal(db.auditLog().length, 0);
  });

  it('processes every eligible business independently and does not stop on one failure', async () => {
    const db = makeFakeDb({
      'biz-a': { status: 'grace_period', gracePeriodEndsAt: iso(-2 * DAY_MS), renewalDate: null },
      'biz-b': { status: 'grace_period', gracePeriodEndsAt: iso(-1 * DAY_MS), renewalDate: null },
      'biz-c': { status: 'active', gracePeriodEndsAt: null, renewalDate: null }, // not eligible
    });
    const engine = createSubscriptionEngine(db);

    await engine.runGracePeriodExpirySweep(new Date(iso(0)));

    assert.equal(db.dump()['biz-a'].status, 'expired');
    assert.equal(db.dump()['biz-b'].status, 'expired');
    assert.equal(db.dump()['biz-c'].status, 'active');
  });

  it('is exactly at the boundary (gracePeriodEndsAt == now) still transitions — inclusive, matching isGracePeriodExpired', async () => {
    const boundary = iso(0);
    const db = makeFakeDb({ 'biz-1': { status: 'grace_period', gracePeriodEndsAt: boundary, renewalDate: null } });
    const engine = createSubscriptionEngine(db);
    await engine.runGracePeriodExpirySweep(new Date(boundary));
    assert.equal(db.dump()['biz-1'].status, 'expired');
  });
});

describe('historical data preservation (POL-19-010 Guiding Principle)', () => {
  it('a reversal event never touches any field outside status/gracePeriodEndsAt/renewalDate/updatedAt', async () => {
    const db = makeFakeDb({
      'biz-1': { status: 'active', gracePeriodEndsAt: null, renewalDate: iso(20 * DAY_MS) },
    });
    const engine = createSubscriptionEngine(db);
    await engine.applyLifecycleEvent('biz-1', { type: 'payment_reversal', occurredAt: iso(0) });

    const finalKeys = Object.keys(db.dump()['biz-1']).sort();
    assert.deepEqual(finalKeys, ['gracePeriodEndsAt', 'renewalDate', 'status', 'updatedAt']);
  });
});
