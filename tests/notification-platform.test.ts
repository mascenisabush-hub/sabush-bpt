// Module #20 (Notifications) — Phase 3 Checkpoint 2 (Platform
// Infrastructure) verification.
//
// UNLIKE tests/staff-notifications.test.ts (static/source-text, because
// server/index.ts performs Firebase Admin init + expressApp.listen() as
// import-time side effects), server/notificationPlatform.ts takes `db`
// as an injected parameter and has no such side effect — so this suite
// exercises the real module directly, against a lightweight in-memory
// fake Firestore, per this checkpoint's own "exercised only through
// controlled tests or stubs" requirement. No emulator, no live
// Firestore, no network egress required.
//
// HOW TO RUN:
//   npx tsx --test tests/notification-platform.test.ts

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import {
  createNotificationPlatform,
  resolveNotificationLanguage,
  t,
  type BusinessEvent,
  type FirestoreLike,
  type NotificationTemplate,
} from '../server/notificationPlatform';

// ---------------------------------------------------------------------
// In-memory fake satisfying FirestoreLike — enough surface to exercise
// writeNotification/dedupe/watermark without a real Firestore instance.
// ---------------------------------------------------------------------
function makeFakeDb(): FirestoreLike & { dump(): Record<string, Record<string, Record<string, unknown>>> } {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  let autoIdCounter = 0;

  return {
    collection(name: string) {
      store[name] ??= {};
      return {
        doc(id?: string) {
          const docId = id ?? `auto-${++autoIdCounter}`;
          return {
            id: docId,
            async set(data: Record<string, unknown>) {
              store[name][docId] = data;
              return undefined;
            },
            async get() {
              const exists = docId in store[name];
              return { exists, data: () => (exists ? store[name][docId] : undefined) };
            },
          };
        },
      };
    },
    dump() {
      return store;
    },
  };
}

function makeEvent(overrides: Partial<BusinessEvent> = {}): BusinessEvent {
  return {
    producer: 'test-producer',
    eventType: 'test.event',
    dedupeKey: 'test:dedupe:1',
    occurredAt: '2026-08-05T00:00:00.000Z',
    importance: 'immediate',
    context: { collection: 'testCollection', documentId: 'doc-1' },
    recipient: { scope: 'business', businessId: 'biz-1', userId: null },
    payload: { count: 3 },
    recommendedAction: null,
    ...overrides,
  };
}

const testTemplate: NotificationTemplate = {
  category: 'closing', // reusing an existing accepted category for the test — no new category invented
  type: 'test.event',
  render: (language, event) => ({
    whatHappened: t(language, 'common.close') + ` (${event.payload.count})`,
    whyItMatters: 'test-why-it-matters',
    recommendedAction: null,
  }),
};

describe('resolveNotificationLanguage (BDR-0005)', () => {
  it('Level 1 — uses userLanguage when present and supported', () => {
    assert.equal(resolveNotificationLanguage({ userLanguage: 'en', businessLanguage: 'fr' }), 'en');
  });
  it('Level 2 — falls back to businessLanguage when no userLanguage', () => {
    assert.equal(resolveNotificationLanguage({ businessLanguage: 'fr' }), 'fr');
  });
  it('Level 3 — falls back to Portuguese platform default when neither exists (current real-world case — no persisted language field yet)', () => {
    assert.equal(resolveNotificationLanguage({}), 'pt');
  });
  it('ignores an unsupported language code and continues down the chain', () => {
    assert.equal(resolveNotificationLanguage({ userLanguage: 'de', businessLanguage: 'fr' }), 'fr');
  });
});

describe('t() — reuses the existing en/pt/fr locale dictionaries (ADR-0004 Decision 5)', () => {
  it('resolves a known key in Portuguese (canonical)', () => {
    assert.equal(t('pt', 'common.close'), t('pt', 'common.close')); // sanity: deterministic
    assert.ok(typeof t('pt', 'common.close') === 'string' && t('pt', 'common.close').length > 0);
  });
  it('resolves the same key differently across languages (proves it reads the real dictionaries, not a stub)', () => {
    const en = t('en', 'common.close');
    const pt = t('pt', 'common.close');
    assert.notEqual(en, pt);
  });
  it('falls back to the missing-key literal for a key that exists in no dictionary', () => {
    assert.equal(t('en', 'this.key.does.not.exist'), 'this.key.does.not.exist');
  });
});

describe('BusinessEvent validation', () => {
  it('rejects a business-scoped event missing businessId', () => {
    const platform = createNotificationPlatform(makeFakeDb());
    const event = makeEvent({ recipient: { scope: 'business', businessId: null, userId: null } });
    return assert.rejects(() => platform.evaluateBusinessEvent(event));
  });
  it('rejects an event with an invalid importance value', () => {
    const platform = createNotificationPlatform(makeFakeDb());
    // @ts-expect-error deliberately invalid for the test
    const event = makeEvent({ importance: 'urgent' });
    return assert.rejects(() => platform.evaluateBusinessEvent(event));
  });
});

describe('evaluateBusinessEvent — no policy/template registered', () => {
  it('throws when no communication policy is registered for the eventType', async () => {
    const platform = createNotificationPlatform(makeFakeDb());
    await assert.rejects(
      () => platform.evaluateBusinessEvent(makeEvent()),
      /No communication policy registered/,
    );
  });

  it('throws when policy is notify but no template is registered', async () => {
    const platform = createNotificationPlatform(makeFakeDb());
    platform.registerCommunicationPolicy('test.event', { outcome: 'notify', priority: 'immediate' });
    await assert.rejects(
      () => platform.evaluateBusinessEvent(makeEvent()),
      /No notification template registered/,
    );
  });
});

describe('evaluateBusinessEvent — notify outcome (full pipeline)', () => {
  let db: ReturnType<typeof makeFakeDb>;
  let platform: ReturnType<typeof createNotificationPlatform>;

  beforeEach(() => {
    db = makeFakeDb();
    platform = createNotificationPlatform(db);
    platform.registerCommunicationPolicy('test.event', { outcome: 'notify', priority: 'immediate' });
    platform.registerTemplate('test.event', testTemplate);
  });

  it('writes exactly one notification document with both priority (delivery) and importance (business significance) set', async () => {
    const result = await platform.evaluateBusinessEvent(makeEvent());
    assert.equal(result.outcome, 'notify');
    assert.ok(result.notificationId);

    const notifications = db.dump().notifications;
    const ids = Object.keys(notifications);
    assert.equal(ids.length, 1);
    const doc = notifications[ids[0]];
    assert.equal(doc.priority, 'immediate'); // delivery strategy — from the policy entry
    assert.equal(doc.importance, 'immediate'); // business significance — from the BusinessEvent [Priority Reconciliation Amendment, v1.3]
    assert.equal(doc.dedupeKey, 'test:dedupe:1');
    assert.equal(doc.businessId, 'biz-1');
    assert.equal(doc.channel, 'in_app');
    assert.equal(doc.status, 'unread');
  });

  it('localizes rendered content according to resolveNotificationLanguage', async () => {
    await platform.evaluateBusinessEvent(makeEvent({ dedupeKey: 'dk-en' }), { userLanguage: 'en' });
    const notifications = db.dump().notifications;
    const doc = Object.values(notifications)[0] as { context: { whatHappened: string } };
    assert.ok(doc.context.whatHappened.startsWith(t('en', 'common.close')));
  });

  it('is idempotent — evaluating the same dedupeKey twice writes only one notification', async () => {
    await platform.evaluateBusinessEvent(makeEvent());
    const second = await platform.evaluateBusinessEvent(makeEvent());
    assert.equal(second.outcome, 'duplicate');
    assert.equal(Object.keys(db.dump().notifications).length, 1);
  });

  it('records the evaluation in platform_event_dedupe, keyed by dedupeKey', async () => {
    await platform.evaluateBusinessEvent(makeEvent());
    const dedupeDocs = db.dump().platform_event_dedupe;
    assert.ok(dedupeDocs['test:dedupe:1']);
    assert.equal(dedupeDocs['test:dedupe:1'].outcome, 'notify');
  });
});

describe('evaluateBusinessEvent — suppress/batch outcome (recorded, no notification written)', () => {
  it('records evaluation without writing a notification (ADR-0004 Decision 2)', async () => {
    const db = makeFakeDb();
    const platform = createNotificationPlatform(db);
    platform.registerCommunicationPolicy('test.suppressed', { outcome: 'suppress', priority: 'daily_summary' });

    const result = await platform.evaluateBusinessEvent(makeEvent({ eventType: 'test.suppressed', dedupeKey: 'dk-suppress' }));

    assert.equal(result.outcome, 'suppress');
    assert.equal(result.notificationId, null);
    assert.equal(Object.keys(db.dump().notifications ?? {}).length, 0);
    assert.ok(db.dump().platform_event_dedupe['dk-suppress']);

    // Re-evaluating the same dedupeKey must not re-run policy/template resolution.
    const second = await platform.evaluateBusinessEvent(makeEvent({ eventType: 'test.suppressed', dedupeKey: 'dk-suppress' }));
    assert.equal(second.outcome, 'duplicate');
  });
});

describe('watermark helpers (Architecture §4.8.1, run-level watermark)', () => {
  it('returns null for a jobType with no watermark yet', async () => {
    const platform = createNotificationPlatform(makeFakeDb());
    assert.equal(await platform.getWatermark('some-job'), null);
  });

  it('round-trips a watermark value', async () => {
    const platform = createNotificationPlatform(makeFakeDb());
    await platform.setWatermark('some-job', '2026-08-05T00:00:00.000Z');
    assert.equal(await platform.getWatermark('some-job'), '2026-08-05T00:00:00.000Z');
  });
});

describe('registry guards', () => {
  it('rejects registering the same eventType template twice', () => {
    const platform = createNotificationPlatform(makeFakeDb());
    platform.registerTemplate('dup.event', testTemplate);
    assert.throws(() => platform.registerTemplate('dup.event', testTemplate));
  });
  it('rejects registering the same eventType communication policy twice', () => {
    const platform = createNotificationPlatform(makeFakeDb());
    platform.registerCommunicationPolicy('dup.event', { outcome: 'notify', priority: 'immediate' });
    assert.throws(() => platform.registerCommunicationPolicy('dup.event', { outcome: 'notify', priority: 'immediate' }));
  });
});
