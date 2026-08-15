// Module #19 (Subscriptions) — V1 Subscription Lifecycle Engine.
//
// Per the signed Implementation Authorization
// (docs/engineering/19-v1-subscription-lifecycle-engine-implementation-authorization.md
// §2), grounded in POL-19-004 (Grace Period), POL-19-005 (State
// Model), POL-19-006 (Conversion), POL-19-007 (Recovery), POL-19-010
// (Payment Reversal, Core Transition) + POL-19-013 (Payment Reversal
// Amendment, Edge Cases A/B).
//
// PROCESSOR-INDEPENDENT BY DESIGN — this is the load-bearing property
// of this file, not an implementation preference. This module has zero
// knowledge of PaySuite, or any payment processor: no import, no
// reference, no assumption about webhook shape, event names, or
// signature scheme. It accepts only the normalized
// `SubscriptionLifecycleEvent` shape defined below. A future Payment
// Adapter (not part of this file, not yet authorized — see the
// Authorization §3) is responsible for verifying a real processor's
// webhook and translating its payload into this shape. If this file
// ever needs to import or reference anything processor-specific, that
// is a signal the Engine/Adapter boundary is being violated — stop and
// return to Product Architecture, per the Authorization §4.
//
// SEVEN GOVERNED TRANSITIONS (Authorization §2's own table — this file
// implements exactly these, no more, no fewer):
//   trial_completed + payment_success  -> active            (POL-19-006)
//   active           + payment_reversal -> grace_period      (POL-19-010)
//   grace_period     + payment_reversal -> (no change)       (POL-19-013)
//   grace_period     + payment_success  -> active            (POL-19-004, POL-19-006)
//   grace_period     + [7 days elapse]  -> expired           (POL-19-004, POL-19-005)
//   expired          + payment_reversal -> (no change, log)  (POL-19-010/013 Edge Case B)
//   expired          + payment_success  -> active            (POL-19-007)
//
// EXPLICITLY UNHANDLED, NOT SILENTLY ANSWERED: any event arriving while
// a subscription is trial_pending or trial_active. Rule 8 v2's own
// flagged open boundary question — does early payment during
// trial_active also convert to active? — remains unresolved by any
// approved policy. This file treats both as a no-op, matching
// governance's own silence, not assuming an answer either way
// (Authorization §2/§3).
//
// IDEMPOTENCY: achieved by re-reading current status inside a Firestore
// transaction immediately before every write — the same pattern
// runTrialLifecycleSweep() already establishes in server/index.ts —
// not by external event-ID deduplication. A processor's own event-ID
// scheme (PaySuite's or otherwise) remains unverified and is the future
// Payment Adapter's concern, not this Engine's.
//
// Deliberately not imported from src/types.ts — same file-local
// convention established by every Module #20 producer's own header
// (server/notificationPlatform.ts, server/trialNotificationProducer.ts,
// etc.) and already true of server/index.ts's own existing subscription
// code, which works with untyped Firestore documents directly rather
// than importing SubscriptionStatus/Subscription.

import { reportCriticalFailure } from './alerting';

const GRACE_PERIOD_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // POL-19-004 — 7 consecutive calendar days
// POL-19-011's monthly billing cadence, approximated as a flat 30 days
// — the same "calendar month as 30 days" convention already
// established by POL-19-002's own trial-duration precedent in this
// codebase (trialActivatedAt + 30 days), not a new engineering
// decision invented here.
const RENEWAL_CADENCE_MS = 30 * 24 * 60 * 60 * 1000;

export type SubscriptionStatus =
  | 'trial_pending'
  | 'trial_active'
  | 'trial_completed'
  | 'active'
  | 'grace_period'
  | 'expired';

export type SubscriptionLifecycleEventType = 'payment_success' | 'payment_reversal';

export interface SubscriptionLifecycleEvent {
  type: SubscriptionLifecycleEventType;
  /** ISO timestamp of when the underlying financial event occurred, per the (future) Payment Adapter — never "now" at processing time if these can differ. */
  occurredAt: string;
}

/** The minimal subscription fields this Engine reads and writes. Mirrors src/types.ts's Subscription shape for these fields specifically, without importing it (see file header). */
export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  gracePeriodEndsAt: string | null;
  renewalDate: string | null;
}

/** What changed, or null if the event produced no state change (a legitimate, correct outcome for several of the seven governed cases — never an error). */
export interface SubscriptionTransitionResult {
  status: SubscriptionStatus;
  gracePeriodEndsAt: string | null;
  renewalDate: string | null;
  /** Human-readable reason, for audit logging — not itself a business rule, just a label identifying which of the seven governed cases fired. */
  reason: string;
}

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

/**
 * The pure heart of the Engine — computes the next subscription state
 * (or no change) for a given current snapshot and incoming event, per
 * the seven governed transitions in this file's own header. No I/O, no
 * Firestore, no processor knowledge — exercised directly in
 * tests/subscription-engine.test.ts against plain objects.
 */
export function computeSubscriptionTransition(
  current: SubscriptionSnapshot,
  event: SubscriptionLifecycleEvent,
): SubscriptionTransitionResult | null {
  switch (current.status) {
    case 'trial_completed': {
      if (event.type === 'payment_success') {
        return {
          status: 'active',
          gracePeriodEndsAt: null,
          renewalDate: addMs(event.occurredAt, RENEWAL_CADENCE_MS),
          reason: 'trial_completed + payment_success -> active (POL-19-006)',
        };
      }
      // payment_reversal on a trial_completed subscription: no prior
      // payment exists to reverse. Not one of the seven governed cases
      // — no-op, not an error, matching this file's "unhandled means
      // no change, never a guess" discipline.
      return null;
    }

    case 'active': {
      if (event.type === 'payment_reversal') {
        return {
          status: 'grace_period',
          gracePeriodEndsAt: addMs(event.occurredAt, GRACE_PERIOD_DURATION_MS),
          renewalDate: current.renewalDate,
          reason: 'active + payment_reversal -> grace_period (POL-19-010)',
        };
      }
      // payment_success while already active: no defined transition
      // (already at the target state) — no-op.
      return null;
    }

    case 'grace_period': {
      if (event.type === 'payment_success') {
        return {
          status: 'active',
          gracePeriodEndsAt: null,
          renewalDate: addMs(event.occurredAt, RENEWAL_CADENCE_MS),
          reason: 'grace_period + payment_success -> active (POL-19-004 Transition, POL-19-006)',
        };
      }
      // payment_reversal while already grace_period: POL-19-013's
      // simplified Edge Case A — no additional effect. The original
      // gracePeriodEndsAt is deliberately left untouched, not
      // recalculated. This is a correct, intentional no-op, not a
      // missed case.
      return null;
    }

    case 'expired': {
      if (event.type === 'payment_success') {
        return {
          status: 'active',
          gracePeriodEndsAt: null,
          renewalDate: addMs(event.occurredAt, RENEWAL_CADENCE_MS),
          reason: 'expired + payment_success -> active (POL-19-007 Recovery)',
        };
      }
      // payment_reversal while already expired: POL-19-010/POL-19-013
      // Edge Case B, confirmed settled — no automatic state effect,
      // ever. May be logged by the caller for record-keeping; this
      // function itself returns null, meaning "no state change,"
      // exactly per policy.
      return null;
    }

    case 'trial_pending':
    case 'trial_active':
    default:
      // Explicitly unhandled — see this file's header. Not an error,
      // not a guess: governance has not yet answered whether an event
      // in this state should do anything, so this Engine does nothing.
      return null;
  }
}

/** Has a grace period run its full 7 days without recovery? Pure, no I/O — used by the sweep below and directly testable on its own. */
export function isGracePeriodExpired(gracePeriodEndsAt: string | null, now: Date): boolean {
  if (!gracePeriodEndsAt) return false;
  return new Date(gracePeriodEndsAt).getTime() <= now.getTime();
}

// ------------------------------------------------------------------
// Firestore-integrated layer — transaction-guarded, DI'd `db`, matching
// the same factory pattern every Module #20 producer already
// established (createTrialNotificationProducer(db, platform), etc.),
// for the same reason: exercisable in tests/subscription-engine.test.ts
// against a lightweight fake, no Firebase Admin init required.

interface SubscriptionDocSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface SubscriptionDocRef {
  get(): Promise<SubscriptionDocSnapshot>;
}

// Phase E (BDR-0010) — the subscriptionStatusCache mirror target.
// Deliberately empty: this module only ever calls .update() on this
// ref, never .get() — an interface with zero required members is
// trivially satisfied by the real Firestore Admin SDK's
// DocumentReference (or any object), preserving structural
// compatibility with the real `db` instance this module is
// instantiated against directly in server/index.ts (no `as unknown as`
// cast at that call site — this interface must genuinely match).
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BusinessDocRef {}

interface AuditLogDocRef {
  // matches the real Admin SDK's own auto-id doc() shape closely enough
  // that a real Firestore instance satisfies this structurally.
}

interface Transaction {
  get(ref: SubscriptionDocRef): Promise<SubscriptionDocSnapshot>;
  update(ref: SubscriptionDocRef | BusinessDocRef, data: Record<string, unknown>): void;
  set(ref: AuditLogDocRef, data: Record<string, unknown>): void;
}

interface SubscriptionsQueryLike {
  where(field: string, op: string, value: unknown): SubscriptionsQueryLike;
  get(): Promise<{ empty: boolean; docs: Array<{ id: string; data(): Record<string, unknown> }> }>;
}

interface SubscriptionsCollectionLike extends SubscriptionsQueryLike {
  doc(businessId: string): SubscriptionDocRef;
}

interface AuditLogCollectionLike {
  doc(): AuditLogDocRef;
}

// Phase E (BDR-0010) — write-only collection accessor, same
// deliberate minimalism as BusinessDocRef above.
interface BusinessesCollectionLike {
  doc(businessId: string): BusinessDocRef;
}

export interface SubscriptionEngineDb {
  collection(name: 'subscriptions'): SubscriptionsCollectionLike;
  collection(name: 'platform_audit_log'): AuditLogCollectionLike;
  collection(name: 'businesses'): BusinessesCollectionLike;
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

function toSnapshot(data: Record<string, unknown>): SubscriptionSnapshot {
  const status = typeof data.status === 'string' ? (data.status as SubscriptionStatus) : 'trial_pending';
  return {
    status,
    gracePeriodEndsAt: typeof data.gracePeriodEndsAt === 'string' ? data.gracePeriodEndsAt : null,
    renewalDate: typeof data.renewalDate === 'string' ? data.renewalDate : null,
  };
}

/**
 * Factory mirroring every Module #20 producer's own DI pattern. `db` is
 * injected so this Engine can be exercised directly in a unit test
 * against a lightweight fake Firestore, without Firebase Admin init or
 * process-level side effects — and so it can, later, be wired into
 * server/index.ts's real `db` instance unchanged, exactly as every
 * Module #20 producer already is.
 */
export function createSubscriptionEngine(db: SubscriptionEngineDb) {
  /**
   * Applies one normalized lifecycle event to one business's
   * subscription, transactionally. Re-reads current status inside the
   * transaction (idempotency/ordering guard, matching
   * runTrialLifecycleSweep()'s own established pattern) — a duplicate
   * or out-of-order call is always safe: it either produces the same
   * correct transition again (harmless — Firestore last-write-wins on
   * an idempotent value) or, if the subscription has already moved on
   * to a status this event no longer applies to, produces no change at
   * all, per computeSubscriptionTransition's own per-status logic.
   *
   * Returns the transition applied, or null if the event produced no
   * change (a correct, expected outcome for several of the seven
   * governed cases — never thrown as an error).
   */
  async function applyLifecycleEvent(
    businessId: string,
    event: SubscriptionLifecycleEvent,
  ): Promise<SubscriptionTransitionResult | null> {
    return db.runTransaction(async (tx) => {
      const subscriptionRef = db.collection('subscriptions').doc(businessId);
      const current = await tx.get(subscriptionRef);
      if (!current.exists) return null;

      const snapshot = toSnapshot(current.data() ?? {});
      const transition = computeSubscriptionTransition(snapshot, event);
      if (!transition) return null;

      const nowIso = new Date().toISOString();
      tx.update(subscriptionRef, {
        status: transition.status,
        gracePeriodEndsAt: transition.gracePeriodEndsAt,
        renewalDate: transition.renewalDate,
        updatedAt: nowIso,
      });
      // Phase E (BDR-0010) — subscriptionStatusCache mirror, same
      // transaction, same moment as the authoritative status write.
      tx.update(db.collection('businesses').doc(businessId), { subscriptionStatusCache: transition.status });
      // Decision 4 (audit scope, approved) — every automatic lifecycle
      // transition writes one platform_audit_log entry, in the same
      // transaction as the state change itself, matching
      // runTrialLifecycleSweep()'s and the activation endpoint's own
      // existing precedent in server/index.ts.
      tx.set(db.collection('platform_audit_log').doc(), {
        eventType: 'subscription_lifecycle_transition',
        businessId,
        subscriptionId: businessId,
        previousStatus: snapshot.status,
        newStatus: transition.status,
        triggerEventType: event.type,
        reason: transition.reason,
        occurredAt: nowIso,
      });

      return transition;
    });
  }

  /**
   * Time-based sweep for the one governed transition with no
   * triggering event: grace_period -> expired once 7 days have elapsed
   * with no recovery. Mirrors runTrialLifecycleSweep()'s exact shape
   * (query -> per-doc transaction-guarded re-check -> transition ->
   * audit entry -> continue past any single failure) — intended to be
   * registered via backgroundWorker.registerJob(), the same job-
   * registration abstraction Module #20 already established, not a new
   * scheduling mechanism.
   *
   * `now` is an optional injected parameter — defaults to the real
   * current time in production, matching closingNotificationProducer.ts's
   * own established DI rationale: a boundary-exactness test (deadline
   * == now) cannot reliably assert against the real wall clock, so this
   * parameter exists purely for deterministic testing, not a production
   * behavior change.
   */
  async function runGracePeriodExpirySweep(now: Date = new Date()): Promise<void> {
    const nowIso = now.toISOString();
    let snap;
    try {
      snap = await db
        .collection('subscriptions')
        .where('status', '==', 'grace_period')
        .where('gracePeriodEndsAt', '<=', nowIso)
        .get();
    } catch (err) {
      // Fix #8: this used to be a silent `return` — the sweep expires
      // zero grace-period subscriptions for the entire cycle and
      // nothing upstream ever learned why. Escalated here since this
      // is the one place that knows.
      reportCriticalFailure(
        '[subscription-lifecycle-engine]',
        'grace-period-expiry query failed (composite index missing?) — sweep processed zero subscriptions this cycle',
        { error: err instanceof Error ? err.message : String(err) },
      );
      return;
    }

    if (snap.empty) return;

    for (const docSnap of snap.docs) {
      const businessId = docSnap.id;
      try {
        await db.runTransaction(async (tx) => {
          const subscriptionRef = db.collection('subscriptions').doc(businessId);
          const current = await tx.get(subscriptionRef);
          if (!current.exists) return;
          const snapshot = toSnapshot(current.data() ?? {});
          // Re-check inside the transaction — guards against a second
          // sweep, a recovery payment, or a SuperAdmin override having
          // already moved this subscription on since the query ran.
          if (snapshot.status !== 'grace_period' || !isGracePeriodExpired(snapshot.gracePeriodEndsAt, new Date(nowIso))) {
            return;
          }

          tx.update(subscriptionRef, { status: 'expired', updatedAt: nowIso });
          // Phase E (BDR-0010) — subscriptionStatusCache mirror.
          tx.update(db.collection('businesses').doc(businessId), { subscriptionStatusCache: 'expired' });
          tx.set(db.collection('platform_audit_log').doc(), {
            eventType: 'subscription_lifecycle_transition',
            businessId,
            subscriptionId: businessId,
            previousStatus: 'grace_period',
            newStatus: 'expired',
            triggerEventType: 'grace_period_elapsed',
            reason: 'grace_period + [7 days elapse] -> expired (POL-19-004, POL-19-005)',
            occurredAt: nowIso,
          });
        });
      } catch (err) {
        // One bad doc must never stop the sweep from processing the
        // rest — same isolation principle as runTrialLifecycleSweep().
        console.error('[subscription-lifecycle-engine] grace-period-expiry transition failed for one business, continuing', {
          businessId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { applyLifecycleEvent, runGracePeriodExpirySweep };
}
