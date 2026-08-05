// Module #20 (Notifications) — Phase 3 Checkpoint 3 (Trial Engine
// Producer) verification.
//
// Exercises the real module directly, against a lightweight in-memory
// fake Firestore — same pattern as tests/notification-platform.test.ts
// (no emulator, no live Firestore, no network egress required),
// combined with the real createNotificationPlatform() so this suite
// proves the full Event -> Platform -> Notification pipeline, not just
// the producer's query logic in isolation.
//
// HOW TO RUN:
//   npx tsx --test tests/trial-notification-producer.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { createNotificationPlatform, type FirestoreLike } from '../server/notificationPlatform';
import {
  createTrialNotificationProducer,
  registerTrialNotificationPolicyAndTemplates,
  TRIAL_ENDING_SOON_THRESHOLD_DAYS,
  TRIAL_ENDING_TOMORROW_THRESHOLD_DAYS,
  type TrialSweepDb,
} from '../server/trialNotificationProducer';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface FakeSubscription {
  status: string;
  trialEndsAt: string;
}

// One fake satisfying both FirestoreLike (single-doc access, used by
// notificationPlatform.ts for notifications/platform_event_dedupe/
// platform_worker_state) and TrialSweepDb (where()/get() query access,
// used by trialNotificationProducer.ts to read `subscriptions`).
function makeFakeDb(
  subscriptions: Record<string, FakeSubscription>,
): FirestoreLike & TrialSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> } {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  let autoIdCounter = 0;

  function makeDocApi(name: string, docId: string) {
    return {
      id: docId,
      async set(data: Record<string, unknown>) {
        store[name] ??= {};
        store[name][docId] = data;
        return undefined;
      },
      async get() {
        const exists = docId in (store[name] ?? {});
        return { exists, data: () => (exists ? store[name][docId] : undefined) };
      },
    };
  }

  function makeSubscriptionsQuery(filters: Array<{ field: string; op: string; value: unknown }>) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeSubscriptionsQuery([...filters, { field, op, value }]);
      },
      async get() {
        const docs = Object.entries(subscriptions)
          .filter(([, sub]) =>
            filters.every((f) => {
              const actual = (sub as unknown as Record<string, unknown>)[f.field];
              if (f.op === '==') return actual === f.value;
              if (f.op === '<=') return typeof actual === 'string' && typeof f.value === 'string' && actual <= f.value;
              throw new Error(`Fake Firestore: unsupported op "${f.op}"`);
            }),
          )
          .map(([id, sub]) => ({ id, data: () => sub as unknown as Record<string, unknown> }));
        return { empty: docs.length === 0, docs };
      },
    };
  }

  return {
    collection(name: string) {
      if (name === 'subscriptions') {
        return makeSubscriptionsQuery([]) as never;
      }
      return {
        doc(id?: string) {
          const docId = id ?? `auto-${++autoIdCounter}`;
          return makeDocApi(name, docId);
        },
      } as never;
    },
    dump() {
      return store;
    },
  } as FirestoreLike & TrialSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> };
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString();
}

function setup(subscriptions: Record<string, FakeSubscription>) {
  const db = makeFakeDb(subscriptions);
  const platform = createNotificationPlatform(db);
  registerTrialNotificationPolicyAndTemplates(platform);
  const producer = createTrialNotificationProducer(db, platform);
  return { db, platform, producer };
}

describe('registerTrialNotificationPolicyAndTemplates', () => {
  it('registers both eventTypes exactly once — a second registration attempt in the same process would throw', () => {
    const { platform } = setup({});
    assert.throws(() => platform.registerCommunicationPolicy('trial.ending_soon', { outcome: 'notify', priority: 'immediate' }));
    assert.throws(() => platform.registerCommunicationPolicy('trial.ending_tomorrow', { outcome: 'notify', priority: 'immediate' }));
  });
});

describe('runTrialNotificationSweep — trial.ending_soon (T-7)', () => {
  it('fires when trialEndsAt is within the 7-day window', async () => {
    const { db, producer } = setup({
      'biz-soon': { status: 'trial_active', trialEndsAt: isoDaysFromNow(TRIAL_ENDING_SOON_THRESHOLD_DAYS - 1) },
    });
    await producer.runTrialNotificationSweep();
    const dump = db.dump();
    const notifications = Object.values(dump['notifications'] ?? {});
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'trial.ending_soon');
    assert.equal(notifications[0].scope, 'business');
    assert.equal(notifications[0].businessId, 'biz-soon');
    assert.equal(notifications[0].userId, null);
  });

  it('does not fire when trialEndsAt is more than 7 days away', async () => {
    const { db, producer } = setup({
      'biz-far': { status: 'trial_active', trialEndsAt: isoDaysFromNow(TRIAL_ENDING_SOON_THRESHOLD_DAYS + 5) },
    });
    await producer.runTrialNotificationSweep();
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it('does not fire for a subscription that is not trial_active', async () => {
    const { db, producer } = setup({
      'biz-completed': { status: 'trial_completed', trialEndsAt: isoDaysFromNow(1) },
    });
    await producer.runTrialNotificationSweep();
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });
});

describe('runTrialNotificationSweep — trial.ending_tomorrow (T-1)', () => {
  it('fires when trialEndsAt is within the 1-day window', async () => {
    const { db, producer } = setup({
      'biz-tomorrow': { status: 'trial_active', trialEndsAt: isoDaysFromNow(TRIAL_ENDING_TOMORROW_THRESHOLD_DAYS - 0.1) },
    });
    await producer.runTrialNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    const types = notifications.map((n) => n.type);
    assert.ok(types.includes('trial.ending_tomorrow'));
  });

  it('a subscription inside the T-1 window also produces trial.ending_soon (both windows independently satisfied)', async () => {
    const { db, producer } = setup({
      'biz-both': { status: 'trial_active', trialEndsAt: isoDaysFromNow(0.5) },
    });
    await producer.runTrialNotificationSweep();
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type);
    assert.equal(types.length, 2);
    assert.ok(types.includes('trial.ending_soon'));
    assert.ok(types.includes('trial.ending_tomorrow'));
  });
});

describe('runTrialNotificationSweep — dedupe (Checkpoint 2 mechanism)', () => {
  it('does not create a second notification for the same business/eventType on a repeat sweep', async () => {
    const { db, producer } = setup({
      'biz-repeat': { status: 'trial_active', trialEndsAt: isoDaysFromNow(0.5) },
    });
    await producer.runTrialNotificationSweep();
    const firstCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    await producer.runTrialNotificationSweep();
    const secondCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    assert.equal(firstCount, 2); // ending_soon + ending_tomorrow, first sweep
    assert.equal(secondCount, 2); // unchanged — both dedupeKeys already evaluated
  });
});

describe('runTrialNotificationSweep — multi-tenant isolation and per-business failure isolation', () => {
  it('evaluates every matching business independently in one sweep', async () => {
    const { db, producer } = setup({
      'biz-a': { status: 'trial_active', trialEndsAt: isoDaysFromNow(0.5) },
      'biz-b': { status: 'trial_active', trialEndsAt: isoDaysFromNow(3) },
      'biz-c': { status: 'trial_active', trialEndsAt: isoDaysFromNow(30) }, // outside both windows
    });
    await producer.runTrialNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    const businessIds = notifications.map((n) => n.businessId).sort();
    // biz-a: ending_soon + ending_tomorrow; biz-b: ending_soon only; biz-c: none
    assert.deepEqual(businessIds, ['biz-a', 'biz-a', 'biz-b'].sort());
  });

  it('a subscription with a malformed trialEndsAt is skipped, not thrown, and does not block other businesses', async () => {
    const { db, producer } = setup({
      'biz-bad': { status: 'trial_active', trialEndsAt: undefined as unknown as string },
      'biz-good': { status: 'trial_active', trialEndsAt: isoDaysFromNow(0.5) },
    });
    await assert.doesNotReject(() => producer.runTrialNotificationSweep());
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.some((n) => n.businessId === 'biz-good'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-bad'));
  });
});
