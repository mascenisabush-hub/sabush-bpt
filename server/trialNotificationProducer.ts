// Module #20 (Notifications) — Phase 3, Checkpoint 3: Trial Engine
// Producer.
//
// Per the signed Phase 3 Implementation Authorization
// (docs/engineering/20-phase3-implementation-authorization.md §2,
// which explicitly names `trial.ending_soon`/`trial.ending_tomorrow`,
// producer `trial-engine`, as authorized) and BDR-0007 §4.3 (trigger
// definitions) / §5 (Notify / Immediate, per BDR-0006 §9.2).
//
// This is the first real BusinessEvent producer wired against the
// Checkpoint 2 platform infrastructure (server/notificationPlatform.ts)
// — chosen first per explicit Product Architect direction because it
// reuses existing scheduling (Module #19 Phase 2's Trial Lifecycle
// Worker/registerJob), needs no collection-group query, and is the
// lowest-risk way to prove the Event -> Platform -> Notification
// pipeline end to end.
//
// Business facts only, per BDR-0007 §4.3:
//   trial.ending_soon      — 7 days before trialEndsAt (T-7)
//   trial.ending_tomorrow  — 1 day before trialEndsAt (T-1)
// Both map to Notify / Immediate (BDR-0006 §9.2, BDR-0007 §5) — this
// file sets `priority: 'immediate'` (delivery) and `importance:
// 'immediate'` (BusinessEvent significance, Priority Reconciliation
// Amendment v1.3) consistently, exactly as that Amendment's own note
// anticipated Phase 3 producers would.
//
// Recipient binding: Business-scoped (`recipient.scope === 'business'`,
// `businessId` = the subscription's own document ID, matching Module
// #19's businessId-level binding) — not User-scoped. This mirrors
// 20-notifications.md's own "Users" section: Manager sees Business-
// scoped Subscription notifications view-only, the same visibility
// tier already established for "Own Subscription — view (only)".
//
// TEMPLATE COPY NOTE: BDR-0007/ADR-0004 both explicitly defer wording
// to "a future producer checkpoint" (Checkpoint 2's own comment) — no
// literal copy was fixed by any prior governance record. The strings
// below are engineering's first draft, written to honor POL-19-008's
// tone principles (no fear/urgency/threats; explain what happened, why
// it matters, what's next) but are NOT themselves Product-Architect-
// approved copy — flag for review, not a silent business decision.
//
// Out of scope for this checkpoint, deliberately not touched here:
// Closing Integrity producer, Breakage producer, any Firestore index
// change (the existing `subscriptions (status ASC, trialEndsAt ASC)`
// composite index already covers this file's query — same fields,
// different threshold value), any change to
// `runTrialLifecycleSweep()`'s own trial_active -> trial_completed
// transition logic (untouched, still the sole owner of that
// transition).

import type { NotificationPlatform, BusinessEvent, Language } from './notificationPlatform';
import { t } from './notificationPlatform';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** BDR-0007 §4.3 — T-7. */
export const TRIAL_ENDING_SOON_THRESHOLD_DAYS = 7;
/** BDR-0007 §4.3 — T-1. */
export const TRIAL_ENDING_TOMORROW_THRESHOLD_DAYS = 1;

const TRIAL_EVENT_TYPES = {
  endingSoon: 'trial.ending_soon',
  endingTomorrow: 'trial.ending_tomorrow',
} as const;

/**
 * Registers this producer's communication policy and notification
 * templates against a Notification Platform instance (ADR-0004
 * Decision 4/5, BDR-0006 §9.2). Call once, at startup, before any
 * sweep runs — mirrors how a future Closing/Breakage checkpoint will
 * register its own policies/templates against the same shared
 * instance.
 */
export function registerTrialNotificationPolicyAndTemplates(platform: NotificationPlatform): void {
  platform.registerCommunicationPolicy(TRIAL_EVENT_TYPES.endingSoon, {
    outcome: 'notify',
    priority: 'immediate',
  });
  platform.registerCommunicationPolicy(TRIAL_EVENT_TYPES.endingTomorrow, {
    outcome: 'notify',
    priority: 'immediate',
  });

  platform.registerTemplate(TRIAL_EVENT_TYPES.endingSoon, {
    category: 'subscription',
    type: TRIAL_EVENT_TYPES.endingSoon,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.trial.endingSoon.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.trial.endingSoon.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.trial.endingSoon.recommendedAction'),
    }),
  });

  platform.registerTemplate(TRIAL_EVENT_TYPES.endingTomorrow, {
    category: 'subscription',
    type: TRIAL_EVENT_TYPES.endingTomorrow,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.trial.endingTomorrow.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.trial.endingTomorrow.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.trial.endingTomorrow.recommendedAction'),
    }),
  });
}

interface SubscriptionsQueryLike {
  where(field: string, op: string, value: unknown): SubscriptionsQueryLike;
  get(): Promise<{
    empty: boolean;
    docs: Array<{ id: string; data(): Record<string, unknown> }>;
  }>;
}

// Minimal Firestore surface this file needs for reading `subscriptions`
// — deliberately separate from notificationPlatform.ts's `FirestoreLike`
// (which only covers single-document collection().doc() access, not
// query filtering). The real Firebase Admin `db` instance satisfies
// both interfaces simultaneously; a test fake can implement just this
// one.
export interface TrialSweepDb {
  collection(name: string): SubscriptionsQueryLike;
}

function buildTrialEvent(eventType: string, businessId: string, trialEndsAt: string, thresholdDays: number): BusinessEvent {
  // occurredAt is the moment the underlying business fact became true
  // (ADR-0004 Decision 1) — i.e. exactly trialEndsAt minus the
  // threshold, not "now" (evaluation time). Deterministic regardless
  // of how late a given sweep tick detects the crossing.
  const occurredAt = new Date(new Date(trialEndsAt).getTime() - thresholdDays * MS_PER_DAY).toISOString();
  return {
    producer: 'trial-engine',
    eventType,
    // Deterministic, producer-owned (ADR-0004 Decision 1) — a trial
    // reaches each threshold at most once in its lifecycle, so
    // `{eventType}:{businessId}` is sufficient identity; the dedupe
    // mechanism (Checkpoint 2) guarantees exactly-once evaluation
    // across however many sweep ticks re-match the same subscription.
    dedupeKey: `${eventType}:${businessId}`,
    occurredAt,
    importance: 'immediate',
    context: { collection: 'subscriptions', documentId: businessId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}

/**
 * Factory mirroring notificationPlatform.ts's own DI pattern — takes
 * `db` and the shared Notification Platform instance as injected
 * parameters, so this sweep can be exercised directly in a unit test
 * (tests/trial-notification-producer.test.ts) against a fake
 * Firestore, without Firebase Admin init or process-level side
 * effects.
 */
export function createTrialNotificationProducer(db: TrialSweepDb, platform: NotificationPlatform) {
  async function runTrialNotificationSweep(): Promise<void> {
    const now = new Date();
    const soonThresholdIso = new Date(now.getTime() + TRIAL_ENDING_SOON_THRESHOLD_DAYS * MS_PER_DAY).toISOString();

    let snap;
    try {
      snap = await db
        .collection('subscriptions')
        .where('status', '==', 'trial_active')
        .where('trialEndsAt', '<=', soonThresholdIso)
        .get();
    } catch (err) {
      // Same composite index as runTrialLifecycleSweep (status ASC,
      // trialEndsAt ASC) — already required by that job, not a new
      // deploy dependency introduced here.
      console.error('[trial-notification-producer] query failed (composite index missing?)', {
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (snap.empty) return;

    for (const docSnap of snap.docs) {
      const businessId = docSnap.id;
      const data = docSnap.data();
      const trialEndsAt = typeof data.trialEndsAt === 'string' ? data.trialEndsAt : null;
      if (!trialEndsAt) continue;

      const msRemaining = new Date(trialEndsAt).getTime() - now.getTime();

      // T-1 and T-7 are independent eventTypes with independent
      // dedupeKeys — both are checked every sweep; dedupe (Checkpoint
      // 2) is what makes each fire at most once, not this branching.
      if (msRemaining <= TRIAL_ENDING_TOMORROW_THRESHOLD_DAYS * MS_PER_DAY) {
        try {
          await platform.evaluateBusinessEvent(
            buildTrialEvent(TRIAL_EVENT_TYPES.endingTomorrow, businessId, trialEndsAt, TRIAL_ENDING_TOMORROW_THRESHOLD_DAYS),
          );
        } catch (err) {
          // One business's evaluation failure must never block another's
          // (same isolation principle as runTrialLifecycleSweep).
          console.error('[trial-notification-producer] trial.ending_tomorrow evaluation failed, continuing', {
            businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (msRemaining <= TRIAL_ENDING_SOON_THRESHOLD_DAYS * MS_PER_DAY) {
        try {
          await platform.evaluateBusinessEvent(
            buildTrialEvent(TRIAL_EVENT_TYPES.endingSoon, businessId, trialEndsAt, TRIAL_ENDING_SOON_THRESHOLD_DAYS),
          );
        } catch (err) {
          console.error('[trial-notification-producer] trial.ending_soon evaluation failed, continuing', {
            businessId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  return { runTrialNotificationSweep };
}
