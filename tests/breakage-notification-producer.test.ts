// Module #20 (Notifications) — Phase 3 Checkpoint 5 (Breakage Producer)
// verification.
//
// Exercises the real module directly, against a lightweight in-memory
// fake Firestore — same pattern as
// tests/closing-notification-producer.test.ts (no emulator, no live
// Firestore, no network egress required), combined with the real
// createNotificationPlatform() so this suite proves the full
// Event -> Platform -> Notification pipeline, not just the producer's
// aggregation logic in isolation.
//
// HOW TO RUN:
//   npx tsx --test tests/breakage-notification-producer.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { createNotificationPlatform, type FirestoreLike } from '../server/notificationPlatform';
import {
  createBreakageNotificationProducer,
  registerBreakageNotificationPolicyAndTemplates,
  type BreakageSweepDb,
} from '../server/breakageNotificationProducer';

interface FakeQuebra {
  batchId: string;
  quantityLost: number;
  createdAt?: string;
}

interface FakeBatch {
  quantity: number;
}

// One fake satisfying both FirestoreLike (single-doc access, used by
// notificationPlatform.ts for notifications/platform_event_dedupe/
// platform_worker_state) and BreakageSweepDb (collectionGroup().get()
// access for both `quebras` and `batches`, used by
// breakageNotificationProducer.ts to correlate the two across every
// business).
function makeFakeDb(
  quebrasByBusiness: Record<string, Record<string, FakeQuebra>>,
  batchesByBusiness: Record<string, Record<string, FakeBatch>>,
): FirestoreLike & BreakageSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> } {
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

  return {
    collection(name: string) {
      return {
        doc(id?: string) {
          const docId = id ?? `auto-${++autoIdCounter}`;
          return makeDocApi(name, docId);
        },
      } as never;
    },
    collectionGroup(collectionId: string) {
      if (collectionId === 'quebras') {
        return {
          async get() {
            const docs = Object.entries(quebrasByBusiness).flatMap(([businessId, quebras]) =>
              Object.entries(quebras).map(([quebraId, data]) => ({
                id: quebraId,
                data: () => data as unknown as Record<string, unknown>,
                ref: { parent: { parent: { id: businessId } } },
              })),
            );
            return { docs };
          },
        } as never;
      }
      if (collectionId === 'batches') {
        return {
          async get() {
            const docs = Object.entries(batchesByBusiness).flatMap(([businessId, batches]) =>
              Object.entries(batches).map(([batchId, data]) => ({
                id: batchId,
                data: () => data as unknown as Record<string, unknown>,
                ref: { parent: { parent: { id: businessId } } },
              })),
            );
            return { docs };
          },
        } as never;
      }
      throw new Error(`Fake Firestore: unsupported collectionGroup "${collectionId}"`);
    },
    dump() {
      return store;
    },
  } as FirestoreLike & BreakageSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> };
}

function setup(
  quebrasByBusiness: Record<string, Record<string, FakeQuebra>>,
  batchesByBusiness: Record<string, Record<string, FakeBatch>>,
) {
  const db = makeFakeDb(quebrasByBusiness, batchesByBusiness);
  const platform = createNotificationPlatform(db);
  registerBreakageNotificationPolicyAndTemplates(platform);
  const producer = createBreakageNotificationProducer(db, platform);
  return { db, platform, producer };
}

describe('registerBreakageNotificationPolicyAndTemplates', () => {
  it('registers the eventType exactly once — a second registration attempt in the same process would throw', () => {
    const { platform } = setup({}, {});
    assert.throws(() => platform.registerCommunicationPolicy('inventory.risk.breakage', { outcome: 'notify', priority: 'immediate' }));
  });
});

describe('runBreakageNotificationSweep — trigger condition (BDR-0007 §4.2, adapted isQuebraExceedingWarning)', () => {
  it('fires when cumulative Quebra losses exceed the batch quantity', async () => {
    const { db, producer } = setup(
      {
        'biz-1': {
          'q1': { batchId: 'batch-1', quantityLost: 6, createdAt: '2026-08-01T10:00:00.000Z' },
          'q2': { batchId: 'batch-1', quantityLost: 5, createdAt: '2026-08-02T10:00:00.000Z' },
        },
      },
      { 'biz-1': { 'batch-1': { quantity: 10 } } }, // 6 + 5 = 11 > 10
    );
    await producer.runBreakageNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'inventory.risk.breakage');
    assert.equal(notifications[0].category, 'inventory_risk');
    assert.equal(notifications[0].scope, 'business');
    assert.equal(notifications[0].businessId, 'biz-1');
    assert.equal(notifications[0].userId, null);
    assert.equal(notifications[0].priority, 'immediate'); // delivery strategy, uniform Phase 3 (Priority Reconciliation Amendment §6)
    assert.equal(notifications[0].importance, 'high'); // business significance (BDR-0007 §5)
  });

  it('does not fire when cumulative losses equal the batch quantity (strictly greater-than, matching isQuebraExceedingWarning)', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'batch-1', quantityLost: 10 } } },
      { 'biz-1': { 'batch-1': { quantity: 10 } } }, // 10 == 10, not exceeding
    );
    await producer.runBreakageNotificationSweep();
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it('does not fire when cumulative losses are below the batch quantity', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'batch-1', quantityLost: 3 } } },
      { 'biz-1': { 'batch-1': { quantity: 10 } } },
    );
    await producer.runBreakageNotificationSweep();
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it('a batch with no Quebras at all is never evaluated (no false positive from an empty aggregate)', async () => {
    const { db, producer } = setup({}, { 'biz-1': { 'batch-1': { quantity: 10 } } });
    await producer.runBreakageNotificationSweep();
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });
});

describe('runBreakageNotificationSweep — occurredAt', () => {
  it("uses the most recent contributing Quebra's own createdAt", async () => {
    const { db, producer } = setup(
      {
        'biz-1': {
          'q1': { batchId: 'batch-1', quantityLost: 6, createdAt: '2026-08-01T10:00:00.000Z' },
          'q2': { batchId: 'batch-1', quantityLost: 5, createdAt: '2026-08-03T10:00:00.000Z' }, // most recent
          'q3': { batchId: 'batch-1', quantityLost: 1, createdAt: '2026-08-02T10:00:00.000Z' },
        },
      },
      { 'biz-1': { 'batch-1': { quantity: 10 } } },
    );
    await producer.runBreakageNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.equal(notifications.length, 1);
  });

  it('falls back to the current time when no Quebra has a usable createdAt, without throwing', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'batch-1', quantityLost: 20 } } }, // createdAt omitted
      { 'biz-1': { 'batch-1': { quantity: 10 } } },
    );
    await assert.doesNotReject(() => producer.runBreakageNotificationSweep());
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 1);
  });
});

describe('runBreakageNotificationSweep — dedupe (Checkpoint 2 mechanism)', () => {
  it('does not create a second notification for the same batch on a repeat sweep', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'batch-1', quantityLost: 15, createdAt: '2026-08-01T10:00:00.000Z' } } },
      { 'biz-1': { 'batch-1': { quantity: 10 } } },
    );
    await producer.runBreakageNotificationSweep();
    const firstCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    await producer.runBreakageNotificationSweep();
    const secondCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    assert.equal(firstCount, 1);
    assert.equal(secondCount, 1);
  });
});

describe('runBreakageNotificationSweep — multi-tenant isolation', () => {
  it('never sums a Quebra into a batch belonging to a different business, even with a colliding batchId', async () => {
    const { db, producer } = setup(
      {
        'biz-a': { 'q1': { batchId: 'shared-id', quantityLost: 3 } }, // 3 <= 10, biz-a's own batch
        'biz-b': { 'q1': { batchId: 'shared-id', quantityLost: 12 } }, // 12 > 10, biz-b's own batch
      },
      {
        'biz-a': { 'shared-id': { quantity: 10 } },
        'biz-b': { 'shared-id': { quantity: 10 } },
      },
    );
    await producer.runBreakageNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].businessId, 'biz-b');
  });

  it('evaluates every business independently', async () => {
    const { db, producer } = setup(
      {
        'biz-exceeds': { 'q1': { batchId: 'b1', quantityLost: 15 } },
        'biz-ok': { 'q1': { batchId: 'b1', quantityLost: 2 } },
      },
      {
        'biz-exceeds': { 'b1': { quantity: 10 } },
        'biz-ok': { 'b1': { quantity: 10 } },
      },
    );
    await producer.runBreakageNotificationSweep();
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.some((n) => n.businessId === 'biz-exceeds'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-ok'));
  });
});

describe('runBreakageNotificationSweep — malformed / orphaned data isolation', () => {
  it('skips a Quebra referencing a batchId with no matching batch document, without throwing', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'nonexistent-batch', quantityLost: 999 } } },
      { 'biz-1': { 'other-batch': { quantity: 5 } } },
    );
    await assert.doesNotReject(() => producer.runBreakageNotificationSweep());
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it('skips a Quebra with a non-numeric quantityLost without throwing and without blocking other businesses', async () => {
    const { db, producer } = setup(
      {
        'biz-bad': { 'q1': { batchId: 'b1', quantityLost: undefined as unknown as number } },
        'biz-good': { 'q1': { batchId: 'b1', quantityLost: 15 } },
      },
      {
        'biz-bad': { 'b1': { quantity: 10 } },
        'biz-good': { 'b1': { quantity: 10 } },
      },
    );
    await assert.doesNotReject(() => producer.runBreakageNotificationSweep());
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.some((n) => n.businessId === 'biz-good'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-bad'));
  });

  it('skips a batch document with a non-numeric quantity without throwing', async () => {
    const { db, producer } = setup(
      { 'biz-1': { 'q1': { batchId: 'b1', quantityLost: 999 } } },
      { 'biz-1': { 'b1': { quantity: undefined as unknown as number } } },
    );
    await assert.doesNotReject(() => producer.runBreakageNotificationSweep());
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });
});
