// Module #20 (Notifications) — Phase 3, Checkpoint 2: Platform
// Infrastructure Only.
//
// Per the signed Phase 3 Implementation Authorization
// (docs/engineering/20-phase3-implementation-authorization.md §2),
// scoped narrower than that Authorization's full ceiling per explicit
// Product Architect instruction for this checkpoint: infrastructure
// only. NO producer is wired here. No Closing/Trial/Breakage detection
// exists in this file. `evaluateBusinessEvent()` is exercised in this
// checkpoint only via tests/stubs (tests/notification-platform.test.ts)
// registering fake eventTypes — never via a real scheduled job.
//
// Governance basis:
// - ADR-0002/0003 (Background Worker, job registration) — unrelated to
//   this file directly; this file is invoked BY a future registered
//   job, it does not itself register one.
// - ADR-0004 (Notification Platform Architecture) — Decisions 1-5
//   implemented here: producers emit BusinessEvents, not notification
//   text (Decision 1); idempotency applies to evaluation, not only
//   notification creation (Decision 2); BusinessEvent is in-process
//   only, never persisted (Decision 3); the platform (not the
//   producer) decides whether/how to communicate (Decision 4);
//   template resolution reuses the existing LanguageContext/t() locale
//   dictionaries, no second localization system (Decision 5).
// - BDR-0005 (Notification Language Resolution Policy) — three-level
//   fallback chain implemented in resolveNotificationLanguage().
// - BDR-0006 (Notification Communication Policy) — Notify/Batch/
//   Suppress outcome model + four-level importance scale. Only
//   Notify is implemented with real behavior in V1 (Batch/Suppress are
//   not authorized for V1 by BDR-0006 §5) — see evaluateBusinessEvent().
// - [Priority Reconciliation Amendment, v1.3] — settles the
//   `priority` (delivery strategy, unchanged) vs `importance`
//   (business significance, BDR-0006 §6) field split on the persisted
//   Notification document. This file's BusinessEvent contract uses
//   `importance` (not ADR-0004's original prose "priority") for the
//   producer-supplied urgency field, deliberately applying the
//   Reconciliation Amendment's settled terminology one layer earlier
//   (at the producer contract) than the Amendment itself was scoped to
//   (the Notification document schema) — this is the same distinction,
//   named consistently, not a new decision.
//
// REFACTOR NOTE: `writeNotification()`, its payload types, and
// `validateNotificationPayload()` are moved here from server/index.ts
// (Module #20 Phase 1 Checkpoint 2) — logic unchanged, byte-for-byte,
// only relocated and rebound to an injected `db` instead of a
// module-level one. This is what "integration with the existing Phase
// 1 notification write path" (this checkpoint's scope) means in
// practice: one write path, reused, not a second one built alongside
// it. server/index.ts now imports `writeNotification` from here — all
// five existing Phase 2 staff-endpoint call sites are unchanged in
// behavior.
//
// TESTABILITY NOTE: this module takes `db` as an injected parameter
// and performs no Firebase Admin initialization or process-level side
// effects itself (unlike server/index.ts, which does both at import
// time — the reason this repo's existing server tests are static/
// source-text-based, per tests/staff-notifications.test.ts's own
// header). Because this module has no such side effect, it can be
// exercised with a lightweight fake Firestore in a real unit test
// (tests/notification-platform.test.ts) rather than a source-text
// regex check — a genuine testability improvement this checkpoint's
// own "controlled tests or stubs" requirement created room for, not
// scope creep beyond it.

import { pt, type TranslationDict } from '../src/i18n/locales/pt';
import { en } from '../src/i18n/locales/en';
import { fr } from '../src/i18n/locales/fr';

// ------------------------------------------------------------------
// Minimal Firestore surface this module needs. Matches the shape of
// firebase-admin's Firestore/DocumentReference/DocumentSnapshot enough
// to be satisfied by both the real Admin SDK instance (server/index.ts)
// and a lightweight in-memory fake (tests/notification-platform.test.ts)
// — this is the dependency-injection seam the existing test suite's
// own header notes this repo doesn't otherwise have.
// ------------------------------------------------------------------
export interface FirestoreLike {
  collection(name: string): {
    doc(id?: string): {
      id: string;
      set(data: Record<string, unknown>): Promise<unknown>;
      get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
    };
  };
}

// ------------------------------------------------------------------
// Notification persistence types — moved unchanged from server/index.ts
// (Phase 1 Checkpoint 2). Schema per docs/specs/20-notifications.md
// (v1.3, Accepted), mirrored from src/types.ts's `Notification` /
// `NotificationEventContext` / `NotificationImportance`. Kept as plain
// literal types here rather than importing the client type, matching
// this file's inherited convention from server/index.ts (see that
// file's own comment, unchanged) — the one deliberate exception to
// "no src/ import" is the locale dictionaries above, required by
// ADR-0004 Decision 5, not extended to the type definitions.
// ------------------------------------------------------------------
export type NotificationScope = 'business' | 'user';
export type NotificationCategory = 'closing' | 'inventory_risk' | 'subscription' | 'platform_announcement' | 'staff';
export type NotificationChannel = 'in_app';
export type NotificationPriority = 'immediate' | 'timeline' | 'daily_summary';
// [Priority Reconciliation Amendment, v1.3] — business significance of
// the underlying BusinessEvent, independent of `priority` (delivery
// strategy, above). Optional on NotificationPayload/Notification
// because Phase 1/2 writers (the five staff endpoints) predate the
// Amendment and are not required to supply it (Amendment §4, Migration
// Statement) — Checkpoint 2's own pipeline always supplies it (§6).
export type NotificationImportance = 'immediate' | 'high' | 'normal' | 'low';

export interface NotificationPayload {
  scope: NotificationScope;
  businessId: string | null;
  userId: string | null;
  category: NotificationCategory;
  type: string;
  payloadRef: { collection: string; documentId: string };
  dedupeKey: string;
  context: {
    whatHappened: string;
    whyItMatters: string;
    recommendedAction: string | null;
  };
  priority: NotificationPriority;
  importance?: NotificationImportance;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'closing',
  'inventory_risk',
  'subscription',
  'platform_announcement',
  'staff',
];
const NOTIFICATION_PRIORITIES: NotificationPriority[] = ['immediate', 'timeline', 'daily_summary'];
const NOTIFICATION_IMPORTANCES: NotificationImportance[] = ['immediate', 'high', 'normal', 'low'];

export function validateNotificationPayload(payload: NotificationPayload): void {
  if (payload.scope !== 'business' && payload.scope !== 'user') {
    throw new Error(`Invalid notification scope: ${String(payload.scope)}`);
  }
  if (payload.scope === 'business') {
    if (!payload.businessId || payload.userId) {
      throw new Error('Business-scoped notification requires businessId set and userId null.');
    }
  } else {
    if (!payload.userId || payload.businessId) {
      throw new Error('User-scoped notification requires userId set and businessId null.');
    }
  }
  if (!NOTIFICATION_CATEGORIES.includes(payload.category)) {
    throw new Error(`Invalid notification category: ${String(payload.category)}`);
  }
  if (!payload.type || typeof payload.type !== 'string') {
    throw new Error('Notification type is required.');
  }
  if (!payload.payloadRef?.collection || !payload.payloadRef?.documentId) {
    throw new Error('Notification payloadRef.collection and payloadRef.documentId are required.');
  }
  if (!payload.dedupeKey || typeof payload.dedupeKey !== 'string') {
    throw new Error('Notification dedupeKey is required.');
  }
  if (
    !payload.context ||
    typeof payload.context.whatHappened !== 'string' || !payload.context.whatHappened ||
    typeof payload.context.whyItMatters !== 'string' || !payload.context.whyItMatters ||
    (payload.context.recommendedAction !== null && typeof payload.context.recommendedAction !== 'string')
  ) {
    throw new Error('Notification context (whatHappened, whyItMatters, recommendedAction) is required.');
  }
  if (!NOTIFICATION_PRIORITIES.includes(payload.priority)) {
    throw new Error(`Invalid notification priority: ${String(payload.priority)}`);
  }
  // [Priority Reconciliation Amendment, v1.3] importance is optional
  // (Phase 1/2 callers predate it) but if supplied must be one of the
  // four BDR-0006 §6 values — never silently accept an invented one.
  if (payload.importance !== undefined && !NOTIFICATION_IMPORTANCES.includes(payload.importance)) {
    throw new Error(`Invalid notification importance: ${String(payload.importance)}`);
  }
}

// ------------------------------------------------------------------
// BusinessEvent contract (ADR-0004 Decision 1), with `importance`
// naming applied per the Reconciliation Amendment (see file header).
// This is an in-process-only type (ADR-0004 Decision 3) — never
// persisted as its own document/collection.
// ------------------------------------------------------------------
export interface BusinessEvent {
  /** Stable identity of the originating module/job, e.g. "trial-engine". */
  producer: string;
  /** e.g. "closing.overdue", "trial.ending_soon" — producer-owned, per BDR-0007. */
  eventType: string;
  /** Deterministic, producer-owned — defines "the same event" for dedupe/evaluation-idempotency (ADR-0004 Decision 2). */
  dedupeKey: string;
  /** ISO 8601 — when the underlying business fact became true, per the producer. Never derived from evaluation/write time. */
  occurredAt: string;
  /** Business significance (BDR-0006 §6 four-level scale) — see file header re: naming. */
  importance: NotificationImportance;
  /** Pointer to the triggering record only — never a copy of financial data (ADR-0004 Decision 1, consistent with spec 20.1's payloadRef). */
  context: { collection: string; documentId: string };
  /** Recipient binding — exactly one of businessId/userId, matching NotificationPayload's own rule (spec 20.1 Decision Gate 1). */
  recipient: { scope: NotificationScope; businessId: string | null; userId: string | null };
  /** Free-form producer data used only for template interpolation — never persisted verbatim on the Notification document. */
  payload: Record<string, string | number>;
  recommendedAction: string | null;
}

function validateBusinessEvent(event: BusinessEvent): void {
  if (!event.producer) throw new Error('BusinessEvent.producer is required.');
  if (!event.eventType) throw new Error('BusinessEvent.eventType is required.');
  if (!event.dedupeKey) throw new Error('BusinessEvent.dedupeKey is required (ADR-0004 Decision 1 — producer-owned, never derived by the platform).');
  if (!event.occurredAt) throw new Error('BusinessEvent.occurredAt is required (ADR-0004 Decision 1).');
  if (!NOTIFICATION_IMPORTANCES.includes(event.importance)) {
    throw new Error(`Invalid BusinessEvent.importance: ${String(event.importance)}`);
  }
  if (!event.context?.collection || !event.context?.documentId) {
    throw new Error('BusinessEvent.context.collection and context.documentId are required.');
  }
  if (event.recipient.scope === 'business') {
    if (!event.recipient.businessId || event.recipient.userId) {
      throw new Error('Business-scoped BusinessEvent requires recipient.businessId set and recipient.userId null.');
    }
  } else if (event.recipient.scope === 'user') {
    if (!event.recipient.userId || event.recipient.businessId) {
      throw new Error('User-scoped BusinessEvent requires recipient.userId set and recipient.businessId null.');
    }
  } else {
    throw new Error(`Invalid BusinessEvent.recipient.scope: ${String(event.recipient.scope)}`);
  }
}

// ------------------------------------------------------------------
// BDR-0005 — Notification Language Resolution Policy. Pure function,
// no I/O: callers pass whatever preference data they currently have.
// Level 1 (user preference) and Level 2 (business default) will always
// be undefined today, since no persisted language field exists yet on
// User or Business (BDR-0005 §10's own anticipated "Informational
// Dependency", not a defect of this checkpoint) — this always resolves
// to 'pt' (Level 3) until that field lands, with zero change required
// to this function or the fallback order when it does (§7 — engineering
// owns storage/retrieval, not the resolution order itself).
// ------------------------------------------------------------------
export type Language = 'pt' | 'en' | 'fr';
const SUPPORTED_LANGUAGES: Language[] = ['pt', 'en', 'fr'];

export function resolveNotificationLanguage(pref: {
  userLanguage?: string | null;
  businessLanguage?: string | null;
}): Language {
  if (pref.userLanguage && SUPPORTED_LANGUAGES.includes(pref.userLanguage as Language)) {
    return pref.userLanguage as Language;
  }
  if (pref.businessLanguage && SUPPORTED_LANGUAGES.includes(pref.businessLanguage as Language)) {
    return pref.businessLanguage as Language;
  }
  return 'pt'; // Level 3 — platform default (BDR-0005 §4).
}

// ------------------------------------------------------------------
// ADR-0004 Decision 5 — template resolution reuses the existing
// LanguageContext/t() locale dictionaries (src/i18n/locales/*), not a
// second system. `getNestedValue`/`interpolate` below are a minimal,
// deliberate re-implementation of LanguageContext.tsx's own private
// (unexported) pure helpers of the same name — the *lookup algorithm*
// is necessarily duplicated (five lines; not exported by that file,
// and that file cannot itself be imported here since it depends on
// 'react' and browser APIs this server process doesn't have), but the
// *translation content* is not: both this function and the client read
// the exact same pt.ts/en.ts/fr.ts dictionaries as their single source
// of truth, per Decision 5's actual requirement.
// ------------------------------------------------------------------
const DICTIONARIES: Record<Language, TranslationDict> = { pt, en, fr };

function getNestedValue(dict: TranslationDict, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [paramKey, value]) => acc.split(`{{${paramKey}}}`).join(String(value)),
    template,
  );
}

export function t(language: Language, key: string, params?: Record<string, string | number>): string {
  let value = getNestedValue(DICTIONARIES[language], key);
  if (typeof value !== 'string' && language !== 'pt') {
    value = getNestedValue(DICTIONARIES.pt, key); // canonical-dictionary fallback, same as the client
  }
  if (typeof value !== 'string') {
    console.warn(`[notification-platform] Missing translation for key: "${key}"`);
    return key;
  }
  return interpolate(value, params);
}

// ------------------------------------------------------------------
// Notification template registry (ADR-0004 Decision 5). Empty by
// default — this checkpoint wires no real eventType. Each future
// producer checkpoint (Trial Engine, Closing Integrity, Breakage)
// registers its own template(s), alongside adding the corresponding
// i18n keys to en.ts/pt.ts/fr.ts, as part of that checkpoint's own
// scope — not invented here ahead of time.
// ------------------------------------------------------------------
export interface NotificationTemplate {
  category: NotificationCategory;
  type: string;
  /** Builds the three localized content strings for one event, given its payload. */
  render(language: Language, event: BusinessEvent): { whatHappened: string; whyItMatters: string; recommendedAction: string | null };
}

// ------------------------------------------------------------------
// Communication policy registry (BDR-0006). Only 'notify' has real
// write behavior in evaluateBusinessEvent() below — 'batch'/'suppress'
// are recorded as evaluated (ADR-0004 Decision 2) but are otherwise
// no-ops, since BDR-0006 §5 does not authorize either outcome for V1.
// Empty by default, same reasoning as the template registry above.
// ------------------------------------------------------------------
export interface CommunicationPolicyEntry {
  outcome: 'notify' | 'batch' | 'suppress';
  priority: NotificationPriority; // delivery strategy — unchanged field, §20.1/§20.7
}

export function createNotificationPlatform(db: FirestoreLike) {
  const templates = new Map<string, NotificationTemplate>();
  const policies = new Map<string, CommunicationPolicyEntry>();

  function registerTemplate(eventType: string, template: NotificationTemplate): void {
    if (templates.has(eventType)) {
      throw new Error(`Notification template already registered for eventType "${eventType}".`);
    }
    templates.set(eventType, template);
  }

  function registerCommunicationPolicy(eventType: string, policy: CommunicationPolicyEntry): void {
    if (policies.has(eventType)) {
      throw new Error(`Communication policy already registered for eventType "${eventType}".`);
    }
    policies.set(eventType, policy);
  }

  // Reusable write helper — moved unchanged from server/index.ts (see
  // file header REFACTOR NOTE). `channel` always 'in_app' in V1, never
  // caller-supplied; `status` always starts 'unread', never
  // caller-supplied.
  async function writeNotification(payload: NotificationPayload): Promise<string> {
    validateNotificationPayload(payload);

    const ref = db.collection('notifications').doc();
    await ref.set({
      scope: payload.scope,
      businessId: payload.businessId,
      userId: payload.userId,
      category: payload.category,
      type: payload.type,
      payloadRef: payload.payloadRef,
      channel: 'in_app' as NotificationChannel,
      status: 'unread',
      dedupeKey: payload.dedupeKey,
      createdAt: new Date().toISOString(),
      context: payload.context,
      priority: payload.priority,
      ...(payload.importance !== undefined ? { importance: payload.importance } : {}),
    });

    return ref.id;
  }

  // ------------------------------------------------------------------
  // Dedupe/watermark mechanism (Architecture §4.8.1). Engineering
  // choice between the two named candidates (BDR-0007's own precision
  // note; Remaining Product Decisions Review §2.4 confirms this is not
  // a Product Architect question): a dedicated
  // `platform_event_dedupe/{dedupeKey}` collection, keyed by the
  // producer-owned dedupeKey as the document ID itself (the second
  // named candidate shape). Chosen over relying solely on the
  // `notifications` collection's own document existing, because
  // ADR-0004 Decision 2 requires idempotency on *evaluation*, not only
  // on notification creation — a future 'batch'/'suppress' outcome
  // must still be remembered as "already decided" even though it
  // writes no `notifications` document. `platform_worker_state/{jobType}`
  // (the first named candidate shape) is used separately, only for the
  // run-level scan-window watermark a future scheduled producer will
  // use to narrow its query — not for per-event dedupe.
  // ------------------------------------------------------------------
  async function hasBeenEvaluated(dedupeKey: string): Promise<boolean> {
    const snap = await db.collection('platform_event_dedupe').doc(dedupeKey).get();
    return snap.exists;
  }

  async function markEvaluated(
    event: BusinessEvent,
    outcome: CommunicationPolicyEntry['outcome'],
    notificationId: string | null,
  ): Promise<void> {
    await db.collection('platform_event_dedupe').doc(event.dedupeKey).set({
      dedupeKey: event.dedupeKey,
      producer: event.producer,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      evaluatedAt: new Date().toISOString(),
      outcome,
      notificationId,
    });
  }

  async function getWatermark(jobType: string): Promise<string | null> {
    const snap = await db.collection('platform_worker_state').doc(jobType).get();
    if (!snap.exists) return null;
    const value = snap.data()?.lastRunCompletedAt;
    return typeof value === 'string' ? value : null;
  }

  async function setWatermark(jobType: string, completedAtIso: string): Promise<void> {
    await db.collection('platform_worker_state').doc(jobType).set({
      jobType,
      lastRunCompletedAt: completedAtIso,
    });
  }

  // ------------------------------------------------------------------
  // The evaluation pipeline itself (ADR-0004 Decisions 1-5, BDR-0006).
  // Producers call this with a BusinessEvent; everything downstream —
  // dedupe, communication-policy outcome, template resolution,
  // localization (BDR-0005), and persistence via the existing
  // writeNotification() — is the platform's responsibility, never the
  // producer's (BDR-0006 §3/§7/§8).
  // ------------------------------------------------------------------
  async function evaluateBusinessEvent(
    event: BusinessEvent,
    languagePref: { userLanguage?: string | null; businessLanguage?: string | null } = {},
  ): Promise<{ outcome: CommunicationPolicyEntry['outcome'] | 'duplicate'; notificationId: string | null }> {
    validateBusinessEvent(event);

    if (await hasBeenEvaluated(event.dedupeKey)) {
      return { outcome: 'duplicate', notificationId: null };
    }

    const policy = policies.get(event.eventType);
    if (!policy) {
      throw new Error(
        `No communication policy registered for eventType "${event.eventType}" (BDR-0006). ` +
        `A producer must not emit an eventType the platform has no policy for.`,
      );
    }

    if (policy.outcome !== 'notify') {
      // 'batch'/'suppress' — not authorized for V1 by BDR-0006 §5.
      // Recorded as evaluated (Decision 2) so it is never re-evaluated,
      // but no notification is written.
      await markEvaluated(event, policy.outcome, null);
      return { outcome: policy.outcome, notificationId: null };
    }

    const template = templates.get(event.eventType);
    if (!template) {
      throw new Error(`No notification template registered for eventType "${event.eventType}" (ADR-0004 Decision 5).`);
    }

    const language = resolveNotificationLanguage(languagePref);
    const rendered = template.render(language, event);

    const notificationId = await writeNotification({
      scope: event.recipient.scope,
      businessId: event.recipient.businessId,
      userId: event.recipient.userId,
      category: template.category,
      type: template.type,
      payloadRef: event.context,
      dedupeKey: event.dedupeKey,
      context: rendered,
      priority: policy.priority,
      importance: event.importance,
    });

    await markEvaluated(event, 'notify', notificationId);

    return { outcome: 'notify', notificationId };
  }

  return {
    writeNotification,
    registerTemplate,
    registerCommunicationPolicy,
    evaluateBusinessEvent,
    getWatermark,
    setWatermark,
    hasBeenEvaluated,
  };
}

export type NotificationPlatform = ReturnType<typeof createNotificationPlatform>;
