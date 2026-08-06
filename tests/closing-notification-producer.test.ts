// Module #20 (Notifications) — Phase 3 Checkpoint 4 (Closing Integrity
// Producer) verification.
//
// Exercises the real module directly, against a lightweight in-memory
// fake Firestore — same pattern as
// tests/trial-notification-producer.test.ts (no emulator, no live
// Firestore, no network egress required), combined with the real
// createNotificationPlatform() so this suite proves the full
// Event -> Platform -> Notification pipeline, not just the producer's
// query/projection logic in isolation.
//
// DETERMINISM NOTE: every scenario below fixes both the most recent
// active Closing's own `endDate` (always a real calendar month-end, per
// how Monthly Closings are actually recorded — see
// src/components/ClosingView.tsx) AND the sweep's injected `now`
// (runClosingNotificationSweep's optional testability parameter — see
// that file's own comment). This makes every assertion exact and
// reproducible on any date the suite happens to run, rather than
// depending on which day-of-month "today" is when CI runs it.
//
// HOW TO RUN:
//   npx tsx --test tests/closing-notification-producer.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { createNotificationPlatform, type FirestoreLike } from '../server/notificationPlatform';
import {
  createClosingNotificationProducer,
  registerClosingNotificationPolicyAndTemplates,
  type ClosingSweepDb,
} from '../server/closingNotificationProducer';

interface FakeClosing {
  periodType: 'monthly' | 'yearly';
  endDate: string; // YYYY-MM-DD
  status?: 'active' | 'reopened';
}

// One fake satisfying both FirestoreLike (single-doc access, used by
// notificationPlatform.ts for notifications/platform_event_dedupe/
// platform_worker_state) and ClosingSweepDb (collectionGroup().get()
// access, used by closingNotificationProducer.ts to scan every
// business's `closings` subcollection at once — mirroring the real
// Admin SDK's collection-group query shape).
function makeFakeDb(
  closingsByBusiness: Record<string, Record<string, FakeClosing>>,
): FirestoreLike & ClosingSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> } {
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
      if (collectionId !== 'closings') {
        throw new Error(`Fake Firestore: unsupported collectionGroup "${collectionId}"`);
      }
      return {
        async get() {
          const docs = Object.entries(closingsByBusiness).flatMap(([businessId, closings]) =>
            Object.entries(closings).map(([closingId, data]) => ({
              id: closingId,
              data: () => data as unknown as Record<string, unknown>,
              ref: { parent: { parent: { id: businessId } } },
            })),
          );
          return { docs };
        },
      };
    },
    dump() {
      return store;
    },
  } as FirestoreLike & ClosingSweepDb & { dump(): Record<string, Record<string, Record<string, unknown>>> };
}

function setup(closingsByBusiness: Record<string, Record<string, FakeClosing>>) {
  const db = makeFakeDb(closingsByBusiness);
  const platform = createNotificationPlatform(db);
  registerClosingNotificationPolicyAndTemplates(platform);
  const producer = createClosingNotificationProducer(db, platform);
  return { db, platform, producer };
}

// A fixed reference point: the most recent active monthly Closing ended
// 2026-07-31 (a real month-end). Projected next period is therefore
// always August 2026, ending 2026-08-31 23:59:59.999Z — every `now`
// below is chosen relative to that fixed projected boundary.
const JULY_CLOSING_END_DATE = '2026-07-31';

describe('registerClosingNotificationPolicyAndTemplates', () => {
  it('registers all three eventTypes exactly once — a second registration attempt in the same process would throw', () => {
    const { platform } = setup({});
    assert.throws(() => platform.registerCommunicationPolicy('closing.approaching', { outcome: 'notify', priority: 'immediate' }));
    assert.throws(() => platform.registerCommunicationPolicy('closing.due', { outcome: 'notify', priority: 'immediate' }));
    assert.throws(() => platform.registerCommunicationPolicy('closing.overdue', { outcome: 'notify', priority: 'immediate' }));
  });
});

describe('runClosingNotificationSweep — derivation (BDR-0007 Amendment)', () => {
  it('a business with zero Closings receives no notifications', async () => {
    const { db, producer } = setup({ 'biz-none': {} });
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it('a business whose only Closing is "reopened" (not active) receives no notifications', async () => {
    const { db, producer } = setup({
      'biz-reopened-only': {
        'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'reopened' },
      },
    });
    // Sep 5 — well past the projected Aug 31 boundary, would be
    // overdue if this Closing counted as active.
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });

  it("a Closing with status absent is treated as active, matching isPeriodClosed's established semantics", async () => {
    const { db, producer } = setup({
      'biz-legacy': {
        'closing-legacy': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE }, // status omitted entirely
      },
    });
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.length > 0, 'expected at least one Closing notification for a legacy active Closing');
  });
});

describe('runClosingNotificationSweep — closing.approaching', () => {
  it('fires when the projected endDate is within the approaching window but not yet due', async () => {
    const { db, producer } = setup({
      'biz-approaching': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    // Aug 29, 12:00 — ~2.5 days before Aug 31 23:59:59.999.
    await producer.runClosingNotificationSweep(new Date('2026-08-29T12:00:00.000Z'));
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type).sort();
    assert.deepEqual(types, ['closing.approaching']);
  });

  it('does not fire when the projected endDate is far in the future', async () => {
    const { db, producer } = setup({
      'biz-far': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    // Aug 1 — 30 days before Aug 31.
    await producer.runClosingNotificationSweep(new Date('2026-08-01T12:00:00.000Z'));
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });
});

describe('runClosingNotificationSweep — closing.due and closing.overdue', () => {
  it('fires closing.due (and closing.approaching, independently true) when the projected endDate has just passed, but not yet closing.overdue', async () => {
    const { db, producer } = setup({
      'biz-due': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    // Sep 1, 12:00 — ~0.5 days after Aug 31 23:59:59.999.
    await producer.runClosingNotificationSweep(new Date('2026-09-01T12:00:00.000Z'));
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type).sort();
    assert.deepEqual(types, ['closing.approaching', 'closing.due']);
  });

  it('fires closing.overdue once the projected endDate is at least the overdue threshold in the past, alongside closing.due and closing.approaching (independent facts, BDR-0007 §4.1)', async () => {
    const { db, producer } = setup({
      'biz-overdue': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    // Sep 5, 12:00 — ~4.5 days after Aug 31 23:59:59.999.
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type).sort();
    assert.deepEqual(types, ['closing.approaching', 'closing.due', 'closing.overdue']);
  });
});

describe('runClosingNotificationSweep — periodType: yearly', () => {
  it('projects a yearly period forward correctly (Dec 31 -> next Dec 31)', async () => {
    const { db, producer } = setup({
      'biz-yearly': { 'closing-1': { periodType: 'yearly', endDate: '2025-12-31', status: 'active' } },
    });
    // Dec 29, 2026 — ~2.5 days before Dec 31, 2026 23:59:59.999.
    await producer.runClosingNotificationSweep(new Date('2026-12-29T12:00:00.000Z'));
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type).sort();
    assert.deepEqual(types, ['closing.approaching']);
  });

  it('an overdue yearly Closing fires all three eventTypes', async () => {
    const { db, producer } = setup({
      'biz-yearly-overdue': { 'closing-1': { periodType: 'yearly', endDate: '2024-12-31', status: 'active' } },
    });
    // Jan 5, 2026 — projected next boundary is Dec 31, 2025, ~5 days past.
    await producer.runClosingNotificationSweep(new Date('2026-01-05T12:00:00.000Z'));
    const types = Object.values(db.dump()['notifications'] ?? {}).map((n) => n.type).sort();
    assert.deepEqual(types, ['closing.approaching', 'closing.due', 'closing.overdue']);
  });
});

describe('runClosingNotificationSweep — dedupe (Checkpoint 2 mechanism)', () => {
  it('does not create a second notification for the same business/eventType/period on a repeat sweep', async () => {
    const { db, producer } = setup({
      'biz-repeat': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    const now = new Date('2026-09-05T12:00:00.000Z');
    await producer.runClosingNotificationSweep(now);
    const firstCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    await producer.runClosingNotificationSweep(now);
    const secondCount = Object.keys(db.dump()['notifications'] ?? {}).length;
    assert.equal(firstCount, 3); // approaching + due + overdue, first sweep
    assert.equal(secondCount, 3); // unchanged — all three dedupeKeys already evaluated
  });
});

describe('runClosingNotificationSweep — multi-tenant isolation', () => {
  it("evaluates every business independently, using each one's own most recent active Closing", async () => {
    const { db, producer } = setup({
      'biz-overdue': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
      'biz-fresh': { 'closing-1': { periodType: 'monthly', endDate: '2026-08-31', status: 'active' } }, // next period ends Sep 30
      'biz-none': {},
    });
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.some((n) => n.businessId === 'biz-overdue'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-fresh'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-none'));
  });

  it('uses only the most recent active Closing per business when multiple exist', async () => {
    // A very old Closing plus a recent one — must derive the projected
    // boundary from the recent one, not the old one (which would
    // otherwise falsely report as deeply overdue).
    const { db, producer } = setup({
      'biz-multi': {
        'closing-old': { periodType: 'monthly', endDate: '2020-01-31', status: 'active' },
        'closing-recent': { periodType: 'monthly', endDate: '2026-08-31', status: 'active' }, // next period ends Sep 30
      },
    });
    await producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z'));
    assert.equal(Object.keys(db.dump()['notifications'] ?? {}).length, 0);
  });
});

describe('runClosingNotificationSweep — malformed data isolation', () => {
  it('skips a Closing document missing periodType/endDate without throwing and without blocking other businesses', async () => {
    const { db, producer } = setup({
      'biz-bad': { 'closing-1': { periodType: undefined as unknown as 'monthly', endDate: undefined as unknown as string, status: 'active' } },
      'biz-good': { 'closing-1': { periodType: 'monthly', endDate: JULY_CLOSING_END_DATE, status: 'active' } },
    });
    await assert.doesNotReject(() => producer.runClosingNotificationSweep(new Date('2026-09-05T12:00:00.000Z')));
    const notifications = Object.values(db.dump()['notifications'] ?? {});
    assert.ok(notifications.some((n) => n.businessId === 'biz-good'));
    assert.ok(!notifications.some((n) => n.businessId === 'biz-bad'));
  });
});
