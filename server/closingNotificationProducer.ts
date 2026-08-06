// Module #20 (Notifications) — Phase 3, Checkpoint 4: Closing Integrity
// Producer.
//
// Per the signed Phase 3 Implementation Authorization
// (docs/engineering/20-phase3-implementation-authorization.md §2,
// which explicitly names `closing.approaching`/`closing.due`/
// `closing.overdue`, producer `closing-integrity`, as authorized),
// BDR-0007 §4.1 (trigger definitions) / §5 (Notify / Immediate, per
// BDR-0006 §9.1), and the BDR-0007 Amendment — Closing Cadence Is Not
// a Business Setting (docs/specs/20-bdr-0007-closing-cadence-amendment.md),
// which resolved §4.1's unsupported assumption that a business's
// current-period `endDate` is directly available.
//
// Business facts only, per BDR-0007 §4.1, evaluated against the
// Amendment's derivation rule (not a stored field):
//   closing.approaching  — projected endDate is 3 days away
//   closing.due          — projected endDate is today
//   closing.overdue      — projected endDate was 3 days ago
// All three map to Notify / Immediate (BDR-0006 §9.1, BDR-0007 §5) —
// this file sets `priority: 'immediate'` (delivery) and `importance:
// 'immediate'` (BusinessEvent significance, Priority Reconciliation
// Amendment v1.3) consistently, exactly as trialNotificationProducer.ts
// (Checkpoint 3) already established for its own Notify/Immediate
// eventTypes.
//
// DERIVATION (BDR-0007 Amendment §3/§6) — the load-bearing difference
// from Checkpoint 3: a business does not own a configurable Closing
// Cadence. "The current period" is derived, not stored: this producer
// finds each business's most recent ACTIVE `Closing` document (status
// absent or 'active' — matching src/context/AppContext.tsx's own
// `isPeriodClosed` in-memory semantics exactly, see the status-handling
// comment below) and projects its `periodType`/`endDate` forward to the
// next expected boundary. A business with zero prior active Closings
// receives no Closing notifications — the intended behavior per the
// Amendment §3, not a gap.
//
// Because the projected boundary is, by construction, the period
// immediately after the most recent active Closing, no separate
// `isPeriodClosed` check is needed here: no Closing can already exist
// for a period that starts after the latest one on record, or it would
// itself be the latest one. This is an implementation consequence of
// the derivation rule, not a separate decision.
//
// Recipient binding: Business-scoped (`recipient.scope === 'business'`),
// matching 20-notifications.md's own statement that an overdue Closing
// is "visible to me and to any Manager" (line ~139) — the same
// business-wide visibility already established for Trial (Checkpoint 3).
//
// TEMPLATE COPY NOTE: same status as Checkpoint 3's — BDR-0007/ADR-0004
// both defer wording to "a future producer checkpoint." The strings
// added to src/i18n/locales/{pt,en,fr}.ts are engineering's first draft,
// written to honor POL-19-008's tone principles (no fear/urgency/
// threats; explain what happened, why it matters, what's next) but are
// NOT themselves Product-Architect-approved copy — flag for review, not
// a silent business decision.
//
// Out of scope for this checkpoint, deliberately not touched here:
// Breakage producer (`inventory.risk.breakage`), Stock Counts (BDR-0007
// §4.2 explicit deferral — no eventType exists to build against), any
// change to `recordClosing`/`reopenClosing`/`isPeriodClosed` in
// src/context/AppContext.tsx (untouched — this file only reads Closing
// documents, never writes them), any `Business`/`Closing`/`ClosedPeriod`
// schema change (the Amendment explicitly introduces none).

import type { NotificationPlatform, BusinessEvent, Language } from './notificationPlatform';
import { t } from './notificationPlatform';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** BDR-0007 §4.1 — 3 days before the projected endDate. */
export const CLOSING_APPROACHING_THRESHOLD_DAYS = 3;
/** BDR-0007 §4.1 — 3 days after the projected endDate. */
export const CLOSING_OVERDUE_THRESHOLD_DAYS = 3;

const CLOSING_EVENT_TYPES = {
  approaching: 'closing.approaching',
  due: 'closing.due',
  overdue: 'closing.overdue',
} as const;

/**
 * Registers this producer's communication policy and notification
 * templates against a Notification Platform instance (ADR-0004
 * Decision 4/5, BDR-0006 §9.1). Call once, at startup, before any
 * sweep runs — same pattern as
 * registerTrialNotificationPolicyAndTemplates() (Checkpoint 3).
 */
export function registerClosingNotificationPolicyAndTemplates(platform: NotificationPlatform): void {
  platform.registerCommunicationPolicy(CLOSING_EVENT_TYPES.approaching, {
    outcome: 'notify',
    priority: 'immediate',
  });
  platform.registerCommunicationPolicy(CLOSING_EVENT_TYPES.due, {
    outcome: 'notify',
    priority: 'immediate',
  });
  platform.registerCommunicationPolicy(CLOSING_EVENT_TYPES.overdue, {
    outcome: 'notify',
    priority: 'immediate',
  });

  platform.registerTemplate(CLOSING_EVENT_TYPES.approaching, {
    category: 'closing',
    type: CLOSING_EVENT_TYPES.approaching,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.closing.approaching.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.closing.approaching.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.closing.approaching.recommendedAction'),
    }),
  });

  platform.registerTemplate(CLOSING_EVENT_TYPES.due, {
    category: 'closing',
    type: CLOSING_EVENT_TYPES.due,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.closing.due.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.closing.due.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.closing.due.recommendedAction'),
    }),
  });

  platform.registerTemplate(CLOSING_EVENT_TYPES.overdue, {
    category: 'closing',
    type: CLOSING_EVENT_TYPES.overdue,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.closing.overdue.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.closing.overdue.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.closing.overdue.recommendedAction'),
    }),
  });
}

// Deliberately not imported from src/types.ts — same file-local
// convention notificationPlatform.ts's own header already establishes
// ("Kept as plain literal types here rather than importing the client
// type"). Only 'monthly' | 'yearly' exist (src/types.ts
// ClosingPeriodType) as of this checkpoint.
type ClosingPeriodType = 'monthly' | 'yearly';

interface ClosingDocSnapshot {
  id: string;
  data(): Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}

interface ClosingsCollectionGroupLike {
  get(): Promise<{ docs: ClosingDocSnapshot[] }>;
}

// Minimal Firestore surface this file needs for a collection-group scan
// across every business's `closings` subcollection — deliberately
// separate from notificationPlatform.ts's `FirestoreLike` (single-doc
// access) and trialNotificationProducer.ts's `TrialSweepDb`
// (single-collection query access), mirroring the real Admin SDK's own
// `db.collectionGroup(id)` shape closely enough that the real `db`
// instance satisfies this interface unchanged.
export interface ClosingSweepDb {
  collectionGroup(collectionId: string): ClosingsCollectionGroupLike;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Projects the next expected period boundary from the most recent
 * active Closing's own `periodType`/`endDate` — the BDR-0007 Amendment's
 * derivation rule. No new field, no assumed cadence: pure date
 * arithmetic on a value that already exists.
 *
 * Duplicated, deliberately, from ClosingView.tsx's own local,
 * unexported `pad()`/`lastDayOfMonth()` helpers — the same class of
 * necessary duplication notificationPlatform.ts's header already
 * explains for `getNestedValue`/`interpolate` (a browser-only file
 * cannot be imported into this server-only one). The *algorithm* is
 * duplicated; there is no second source of truth for period
 * boundaries — ClosingView.tsx computes a period's own start/end from
 * a chosen year/month exactly the same way.
 */
function projectNextPeriodBoundary(
  periodType: ClosingPeriodType,
  lastEndDate: string,
): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = lastEndDate.split('-');
  const year = Number(yearStr);

  if (periodType === 'yearly') {
    const nextYear = year + 1;
    return { startDate: `${nextYear}-01-01`, endDate: `${nextYear}-12-31` };
  }

  const monthIndex = Number(monthStr) - 1; // 0-indexed, matching ClosingView.tsx
  let nextMonthIndex = monthIndex + 1;
  let nextYear = year;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextYear += 1;
  }
  return {
    startDate: `${nextYear}-${pad(nextMonthIndex + 1)}-01`,
    endDate: `${nextYear}-${pad(nextMonthIndex + 1)}-${pad(lastDayOfMonth(nextYear, nextMonthIndex))}`,
  };
}

function buildClosingEvent(
  eventType: string,
  businessId: string,
  sourceClosingId: string,
  projectedEndDate: string,
  occurredAt: string,
): BusinessEvent {
  return {
    producer: 'closing-integrity',
    eventType,
    // Deterministic, producer-owned (ADR-0004 Decision 1). Includes the
    // projected endDate (unlike trialNotificationProducer.ts's
    // `{eventType}:{businessId}`, which needs no date — a trial ends
    // once) because a business's Closing cadence repeats: the same
    // eventType must fire again, independently, for a later period.
    dedupeKey: `${eventType}:${businessId}:${projectedEndDate}`,
    occurredAt,
    importance: 'immediate',
    // Points at the most recent active Closing — the actual record
    // read to derive this projection (ADR-0004 Decision 1: "pointers
    // to the triggering record"). There is no document yet for the
    // still-open projected period itself.
    context: { collection: 'closings', documentId: sourceClosingId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}

interface LatestActiveClosing {
  closingId: string;
  periodType: ClosingPeriodType;
  endDate: string;
}

/**
 * Factory mirroring notificationPlatform.ts's/trialNotificationProducer.ts's
 * own DI pattern — takes `db` and the shared Notification Platform
 * instance as injected parameters, so this sweep can be exercised
 * directly in a unit test (tests/closing-notification-producer.test.ts)
 * against a fake Firestore, without Firebase Admin init or
 * process-level side effects.
 */
export function createClosingNotificationProducer(db: ClosingSweepDb, platform: NotificationPlatform) {
  // `now` is an optional injected parameter — defaults to the real
  // current time in production (the Background Worker's registered
  // `execute` never passes one). Exists purely for deterministic unit
  // testing: a monthly period's projected boundary is always a real
  // calendar month-end (28-31 days apart), so a test asserting an exact
  // threshold-boundary scenario (e.g. "exactly 2 days from due") cannot
  // reliably construct one by choosing "months back" against whatever
  // day the test suite happens to run on. Same DI rationale as this
  // file's own `db`/`platform` parameters (see the factory's own
  // docstring) and notificationPlatform.ts's header ("this module...
  // performs no process-level side effects itself... so it can be
  // exercised with a lightweight fake").
  async function runClosingNotificationSweep(now: Date = new Date()): Promise<void> {
    let snap;
    try {
      snap = await db.collectionGroup('closings').get();
    } catch (err) {
      // Collection-group queries require an explicit index/scope to be
      // enabled for the collection ID, even unfiltered — see
      // firestore.indexes.json's new `closings` entry (queryScope
      // COLLECTION_GROUP). Same defensive shape as
      // runTrialLifecycleSweep/runTrialNotificationSweep's own
      // "composite index missing?" handling — never crashes the
      // server, the sweep just silently does nothing until the index
      // is deployed.
      console.error('[closing-notification-producer] collection-group query failed (index missing?)', {
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (snap.docs.length === 0) return;

    // Reduce to the most recent ACTIVE Closing per business — the
    // BDR-0007 Amendment's own derivation rule (§3, §6). A `status`
    // field absent on a document is treated as 'active', matching
    // isPeriodClosed's own established in-memory semantics
    // (src/context/AppContext.tsx: `(c.status ?? 'active') === 'active'`)
    // exactly. This is deliberately NOT done via a Firestore equality
    // filter (`where('status', '==', 'active')`) — that would silently
    // exclude any Closing recorded before the Closing Integrity
    // Amendment introduced the `status` field, changing which
    // businesses receive Closing notifications as a side effect of a
    // query-implementation choice. That is not this checkpoint's call
    // to make: the BDR-0007 Amendment defines the business rule (via
    // its explicit reference to the *existing, already-implemented*
    // semantics), this file matches it, it does not reinterpret it.
    const latestActiveByBusiness = new Map<string, LatestActiveClosing>();
    for (const docSnap of snap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;

      const data = docSnap.data();
      const status = typeof data.status === 'string' ? data.status : 'active';
      if (status !== 'active') continue;

      const periodType = data.periodType;
      const endDate = data.endDate;
      if ((periodType !== 'monthly' && periodType !== 'yearly') || typeof endDate !== 'string') continue;

      const existing = latestActiveByBusiness.get(businessId);
      if (!existing || endDate > existing.endDate) {
        latestActiveByBusiness.set(businessId, { closingId: docSnap.id, periodType, endDate });
      }
    }

    if (latestActiveByBusiness.size === 0) return;

    const nowMs = now.getTime();

    for (const [businessId, latest] of latestActiveByBusiness) {
      const projected = projectNextPeriodBoundary(latest.periodType, latest.endDate);
      // End-of-day, matching how a business owner would think of "the
      // deadline" — a Closing is due through the end of its endDate,
      // not at 00:00 on that date.
      const projectedEndMs = new Date(`${projected.endDate}T23:59:59.999Z`).getTime();
      const daysUntilEnd = (projectedEndMs - nowMs) / MS_PER_DAY;

      // Each of the three eventTypes is checked independently, exactly
      // as runTrialNotificationSweep checks T-7/T-1 independently
      // (BDR-0007 §4.1: "the existence of one BusinessEvent does not
      // replace or invalidate another" — all three remain true, once
      // reached, for as long as the period stays open). Dedupe
      // (Checkpoint 2) is what makes each fire at most once per period,
      // not this branching.
      if (daysUntilEnd <= CLOSING_APPROACHING_THRESHOLD_DAYS) {
        try {
          const occurredAt = new Date(projectedEndMs - CLOSING_APPROACHING_THRESHOLD_DAYS * MS_PER_DAY).toISOString();
          await platform.evaluateBusinessEvent(
            buildClosingEvent(CLOSING_EVENT_TYPES.approaching, businessId, latest.closingId, projected.endDate, occurredAt),
          );
        } catch (err) {
          // One business's evaluation failure must never block another's
          // (same isolation principle as runTrialLifecycleSweep/
          // runTrialNotificationSweep).
          console.error('[closing-notification-producer] closing.approaching evaluation failed, continuing', {
            businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (daysUntilEnd <= 0) {
        try {
          const occurredAt = new Date(projectedEndMs).toISOString();
          await platform.evaluateBusinessEvent(
            buildClosingEvent(CLOSING_EVENT_TYPES.due, businessId, latest.closingId, projected.endDate, occurredAt),
          );
        } catch (err) {
          console.error('[closing-notification-producer] closing.due evaluation failed, continuing', {
            businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (daysUntilEnd <= -CLOSING_OVERDUE_THRESHOLD_DAYS) {
        try {
          const occurredAt = new Date(projectedEndMs + CLOSING_OVERDUE_THRESHOLD_DAYS * MS_PER_DAY).toISOString();
          await platform.evaluateBusinessEvent(
            buildClosingEvent(CLOSING_EVENT_TYPES.overdue, businessId, latest.closingId, projected.endDate, occurredAt),
          );
        } catch (err) {
          console.error('[closing-notification-producer] closing.overdue evaluation failed, continuing', {
            businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  return { runClosingNotificationSweep };
}
