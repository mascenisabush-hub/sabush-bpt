// Module #19 V1 Manual Payment Bridge — the privileged, server-side-
// only confirmation mechanism.
//
// Per the Implementation Authorization's own §5, this is deliberately
// NOT an in-app role, NOT a new Express route reachable by any tenant
// user, and NOT platformRole/SuperAdmin/Module #18 in any form — the
// existing role model (owner/admin/staff, all per-business-scoped) has
// no cross-business "platform operator" concept, and building one is
// explicitly out of this bridge's scope. This module is invoked only
// by server/scripts/confirmPayment.ts, run directly by whoever already
// holds legitimate Firebase Admin SDK / deploy access — the same
// ambient trust boundary the Background Worker itself already operates
// under, not a new one invented for this bridge.
//
// CRITICAL ARCHITECTURAL BOUNDARY: this module never sets
// subscription.status, subscription.renewalDate, subscription.trial*,
// or subscription.grace* directly, at any point. The only way it
// affects a subscription is by calling the existing, already-tested
// createSubscriptionEngine(db).applyLifecycleEvent() with a normalized
// payment_success event — the Subscription Lifecycle Engine remains
// the sole owner of subscription-state transitions, unmodified and
// untouched by this file.
//
// PARTIAL-FAILURE SAFETY (the specific risk the Implementation
// Authorization's §11 asks to be reasoned through explicitly, not
// assumed away): a Payment's own status transition (pending ->
// confirmed) and the Subscription Engine's own transaction
// (grace_period/trial_completed/expired -> active) cannot be one
// atomic Firestore transaction — Firestore's Admin SDK does not
// support nested transactions, and applyLifecycleEvent() already runs
// its own. Instead: confirmPayment() marks the Payment 'confirmed' in
// its own transaction FIRST (idempotent — a payment already
// 'confirmed' is left exactly as it was, original confirmedAt/
// confirmedBy preserved, never overwritten by a retry), THEN calls
// applyLifecycleEvent() as a second step. If that second step fails
// (network blip, transient Firestore error), the Payment record is
// left 'confirmed' with the lifecycle event not yet applied — but
// simply re-running confirmPayment() with the same paymentId is always
// safe: the payment-transition step becomes a no-op (already
// confirmed), and applyLifecycleEvent() is called again — which is
// itself already idempotent (createSubscriptionEngine's own
// transaction re-checks current status before writing), so a retry
// either completes the missed step or safely no-ops if it turns out
// the first attempt actually succeeded despite an apparent failure.
// No new "was the lifecycle event applied" field is needed — re-
// running is unconditionally safe by construction.

import type { SubscriptionLifecycleEvent, SubscriptionTransitionResult } from './subscriptionEngine';
import type { PaymentMethod, PaymentStatus } from '../src/types';

interface PaymentDocSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface PaymentDocRef {
  get(): Promise<PaymentDocSnapshot>;
}

interface Transaction {
  get(ref: PaymentDocRef): Promise<PaymentDocSnapshot>;
  update(ref: PaymentDocRef, data: Record<string, unknown>): void;
}

// Deliberately independent of SubscriptionEngineDb, not an extension of
// it — confirmPayment()/rejectPayment() never call
// db.collection('subscriptions'|'platform_audit_log') directly, only
// db.collection('businesses'); that dependency is fully encapsulated
// inside the `engine: LifecycleApplier` parameter instead. The real
// Firestore Admin SDK db instance satisfies both this interface and
// SubscriptionEngineDb simultaneously (its collection() accepts any
// string) — see server/scripts/confirmPayment.ts for how the same `db`
// is used for both.
export interface PaymentConfirmationDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'payments'): {
        doc(paymentId: string): PaymentDocRef;
      };
    };
  };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/** The subset of createSubscriptionEngine()'s own return shape this module depends on — kept narrow deliberately, so a test double doesn't need the full Engine. */
export interface LifecycleApplier {
  applyLifecycleEvent(businessId: string, event: SubscriptionLifecycleEvent): Promise<SubscriptionTransitionResult | null>;
}

export type ConfirmPaymentOutcome =
  | { outcome: 'confirmed'; lifecycleTransition: SubscriptionTransitionResult | null }
  | { outcome: 'not-found' }
  | { outcome: 'already-rejected' };

export type RejectPaymentOutcome =
  | { outcome: 'rejected' }
  | { outcome: 'not-found' }
  | { outcome: 'already-confirmed' };

interface PaymentSnapshot {
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  reference: string;
  confirmedAt?: string;
}

function toPaymentSnapshot(data: Record<string, unknown>): PaymentSnapshot {
  return {
    status: (data.status as PaymentStatus) ?? 'pending',
    method: data.method as PaymentMethod,
    amount: data.amount as number,
    currency: (data.currency as string) ?? 'MZN',
    reference: data.reference as string,
    confirmedAt: typeof data.confirmedAt === 'string' ? data.confirmedAt : undefined,
  };
}

/**
 * Confirms a pending Payment and, exactly once its own transition is
 * durable, calls the Subscription Lifecycle Engine with a
 * payment_success event carrying that same businessId. Safe to call
 * more than once for the same paymentId — see this file's header for
 * the full reasoning.
 */
export async function confirmPayment(
  db: PaymentConfirmationDb,
  engine: LifecycleApplier,
  params: { businessId: string; paymentId: string; confirmedBy: string },
): Promise<ConfirmPaymentOutcome> {
  const paymentRef = db.collection('businesses').doc(params.businessId).collection('payments').doc(params.paymentId);

  const confirmedAt = await db.runTransaction(async (tx) => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) return null;

    const payment = toPaymentSnapshot(snap.data() ?? {});
    if (payment.status === 'rejected') return 'rejected' as const;

    if (payment.status === 'confirmed') {
      // Idempotent — already confirmed by a prior attempt (or a
      // concurrent one that committed first). Do not overwrite the
      // original confirmedAt/confirmedBy; just report it back so the
      // caller can still (re-)drive the lifecycle step below.
      return payment.confirmedAt ?? new Date().toISOString();
    }

    // payment.status === 'pending' — the only case that actually writes.
    const nowIso = new Date().toISOString();
    tx.update(paymentRef, {
      status: 'confirmed' satisfies PaymentStatus,
      confirmedAt: nowIso,
      confirmedBy: params.confirmedBy,
    });
    return nowIso;
  });

  if (confirmedAt === null) return { outcome: 'not-found' };
  if (confirmedAt === 'rejected') return { outcome: 'already-rejected' };

  // Step 2, deliberately outside the Payment's own transaction (see
  // this file's header) — always (re-)invoked, safe by construction.
  const lifecycleTransition = await engine.applyLifecycleEvent(params.businessId, {
    type: 'payment_success',
    occurredAt: confirmedAt,
  });

  return { outcome: 'confirmed', lifecycleTransition };
}

/**
 * Rejects a pending Payment. Never touches the subscription in any
 * way — rejection has no lifecycle effect, per the Implementation
 * Authorization's own explicit instruction. Idempotent: rejecting an
 * already-rejected payment is a safe no-op preserving the original
 * rejectedAt/rejectedBy/rejectionReason.
 */
export async function rejectPayment(
  db: PaymentConfirmationDb,
  params: { businessId: string; paymentId: string; rejectedBy: string; rejectionReason: string },
): Promise<RejectPaymentOutcome> {
  const paymentRef = db.collection('businesses').doc(params.businessId).collection('payments').doc(params.paymentId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) return { outcome: 'not-found' as const };

    const payment = toPaymentSnapshot(snap.data() ?? {});
    if (payment.status === 'confirmed') return { outcome: 'already-confirmed' as const };
    if (payment.status === 'rejected') return { outcome: 'rejected' as const }; // idempotent, no rewrite

    tx.update(paymentRef, {
      status: 'rejected' satisfies PaymentStatus,
      rejectedAt: new Date().toISOString(),
      rejectedBy: params.rejectedBy,
      rejectionReason: params.rejectionReason,
    });
    return { outcome: 'rejected' as const };
  });
}
