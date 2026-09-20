// SuperAdmin Direct Subscription Activation — EMERGENCY capability.
//
// Ordered by the Product Architect on 2026-09-20 as an emergency: clients
// whose trial/subscription had ended could not get reactivated because the
// in-app payment submission was failing (see 963f9e6), and SuperAdmin had no
// way to activate a business whose payment was verified out-of-band
// (screenshot, WhatsApp, mobile-money statement) before — or without — the
// client ever submitting a payment reference. SuperAdmin therefore reserves
// the right to activate a subscription directly, after confirming the
// payment itself.
//
// NOT part of the signed BDR -> Policy -> Specification -> Rule 8 chain: this
// was built under emergency instruction and needs a retroactive governance
// record (flagged in HANDOFF.md). It is deliberately built to stay INSIDE
// every boundary that chain already established, so that record can be
// written against an implementation that does not contradict it:
//
//   * The Subscription Lifecycle Engine remains the SOLE writer of
//     subscription state. This module never writes `subscriptions/*` or
//     `businesses.subscriptionStatusCache`. It records a Payment, then calls
//     the existing, unmodified confirmPayment() -> applyLifecycleEvent()
//     chain (ADR-0005 golden rule: "SuperAdmin controls the operation; the
//     existing subscription engine controls the business state").
//   * Eligibility is exactly what the engine already governs:
//     trial_completed, grace_period, expired (POL-19-004/006/007). For
//     trial_pending / trial_active the engine deliberately does nothing —
//     governance has NOT decided whether a payment during a trial converts
//     to active (see subscriptionEngine.ts header). This module refuses
//     those states instead of inventing that policy; for `active` there is
//     nothing to activate. Eligibility is checked BEFORE any write, so a
//     refusal leaves no orphan Payment behind.
//   * Server-side only (Admin SDK): the tenant-facing firestore.rules for
//     `payments` are untouched — a client still can never create an
//     already-confirmed payment.
//   * Exactly one audit entry per activation is written by the route, and
//     the engine writes its own subscription_lifecycle_transition entry.
//
// The operator's justification is recorded ONLY in the platform audit log —
// never on the Payment document, because `payments` is readable by the
// business Owner and the justification is internal operator text.

import type { PaymentMethod } from '../packages/shared-types';
import type { ConfirmPaymentOutcome } from './paymentConfirmation';
import type { SubscriptionTransitionResult } from './subscriptionEngine';

/** The only subscription states the lifecycle engine transitions to `active` on payment_success. */
export const DIRECT_ACTIVATION_ELIGIBLE_STATUSES = ['trial_completed', 'grace_period', 'expired'] as const;

// V1's single paid plan (POL-19-011). Mirrors apps/tenant/src/data/subscriptionPlan.ts
// SUBSCRIPTION_PLAN_PRICE_MZN — the server has no shared constant for it and
// the tenant app cannot be imported here (build boundary).
export const DIRECT_ACTIVATION_PLAN_AMOUNT_MZN = 699;

export const DIRECT_ACTIVATION_METHODS: readonly PaymentMethod[] = ['mpesa', 'emola', 'bim'];

const MAX_REFERENCE_LENGTH = 120;
const MAX_JUSTIFICATION_LENGTH = 500;

export interface DirectActivationInput {
  method: PaymentMethod;
  reference: string;
  justification: string;
}

// A plain shape (not a discriminated union): the server tsconfig is not in
// strict mode, where TypeScript does not narrow on `ok: true | false`.
// Invariant: ok === true  <=> value is set; ok === false <=> message is set.
export interface ParseDirectActivationResult {
  ok: boolean;
  value?: DirectActivationInput;
  message?: string;
}

export function parseDirectActivationInput(body: unknown): ParseDirectActivationResult {
  const b = (body ?? {}) as Record<string, unknown>;

  const method = b.method;
  if (typeof method !== 'string' || !(DIRECT_ACTIVATION_METHODS as readonly string[]).includes(method)) {
    return { ok: false, message: 'Método de pagamento inválido.' };
  }

  const reference = typeof b.reference === 'string' ? b.reference.trim() : '';
  if (!reference) return { ok: false, message: 'É obrigatório indicar a referência do pagamento.' };
  if (reference.length > MAX_REFERENCE_LENGTH) return { ok: false, message: 'A referência é demasiado longa.' };

  const justification = typeof b.justification === 'string' ? b.justification.trim() : '';
  if (!justification) return { ok: false, message: 'É obrigatório indicar uma justificação.' };
  if (justification.length > MAX_JUSTIFICATION_LENGTH) return { ok: false, message: 'A justificação é demasiado longa.' };

  return { ok: true, value: { method: method as PaymentMethod, reference, justification } };
}

interface DocSnapshotLike {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

// Deliberately minimal: only what this module actually touches. The real
// Firestore Admin SDK instance satisfies it (cast at the call site).
export interface DirectActivationDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      get(): Promise<DocSnapshotLike>;
      collection(name: 'payments'): {
        doc(paymentId: string): { create(data: Record<string, unknown>): Promise<unknown> };
      };
    };
  };
  collection(name: 'subscriptions'): {
    doc(businessId: string): { get(): Promise<DocSnapshotLike> };
  };
}

export type ConfirmFn = (params: { businessId: string; paymentId: string; confirmedBy: string }) => Promise<ConfirmPaymentOutcome>;

export type DirectActivationOutcome =
  | { outcome: 'activated'; paymentId: string; lifecycleTransition: SubscriptionTransitionResult }
  // The Payment was recorded and confirmed, but the engine made no change —
  // only possible if the subscription moved out of an eligible state between
  // the eligibility check and the engine's own transaction (a concurrent
  // activation). Reported honestly, never as success.
  | { outcome: 'activation-not-applied'; paymentId: string }
  | { outcome: 'business-not-found' }
  | { outcome: 'state-not-eligible'; currentStatus: string | null };

export interface DirectActivationDeps {
  db: DirectActivationDb;
  /** confirmPayment(paymentConfirmationDb, subscriptionEngine, ...) bound at the call site. */
  confirm: ConfirmFn;
  now?: () => Date;
  newPaymentId?: () => string;
}

export async function directlyActivateSubscription(
  deps: DirectActivationDeps,
  params: { businessId: string; operatorUid: string } & DirectActivationInput,
): Promise<DirectActivationOutcome> {
  const now = deps.now ?? (() => new Date());
  const newPaymentId = deps.newPaymentId ?? (() => 'pmt-sa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));

  // 1. Eligibility — BEFORE any write. A refusal must leave nothing behind.
  const businessSnap = await deps.db.collection('businesses').doc(params.businessId).get();
  if (!businessSnap.exists) return { outcome: 'business-not-found' };

  const subscriptionSnap = await deps.db.collection('subscriptions').doc(params.businessId).get();
  const currentStatus =
    subscriptionSnap.exists && typeof subscriptionSnap.data()?.status === 'string'
      ? (subscriptionSnap.data()!.status as string)
      : null;
  if (currentStatus === null || !(DIRECT_ACTIVATION_ELIGIBLE_STATUSES as readonly string[]).includes(currentStatus)) {
    return { outcome: 'state-not-eligible', currentStatus };
  }

  // 2. Record the Payment the way the engine's own confirmation path expects
  //    to find it: status 'pending', then confirmed by the existing
  //    confirmPayment(). `create()` (not `set()`) so a colliding id fails
  //    loudly instead of overwriting a real payment.
  const paymentId = newPaymentId();
  await deps.db
    .collection('businesses')
    .doc(params.businessId)
    .collection('payments')
    .doc(paymentId)
    .create({
      id: paymentId,
      businessId: params.businessId,
      amount: DIRECT_ACTIVATION_PLAN_AMOUNT_MZN,
      currency: 'MZN',
      method: params.method,
      reference: params.reference,
      submittedAt: now().toISOString(),
      // The platform operator, not the business Owner — this is how a
      // SuperAdmin-initiated payment is distinguishable from an
      // Owner-submitted one without adding a field to the Payment schema.
      submittedBy: params.operatorUid,
      status: 'pending',
      notes: 'Ativação directa pelo SuperAdmin.',
    });

  // 3. Existing, unmodified confirmation chain -> Subscription Lifecycle Engine.
  const confirmed = await deps.confirm({
    businessId: params.businessId,
    paymentId,
    confirmedBy: params.operatorUid,
  });
  if (confirmed.outcome !== 'confirmed') {
    // 'not-found' / 'already-rejected' cannot happen for a payment this
    // function created milliseconds ago; treat as an unexpected internal error.
    throw new Error(`direct activation: confirmPayment returned '${confirmed.outcome}' for freshly created payment ${paymentId}`);
  }
  if (!confirmed.lifecycleTransition || confirmed.lifecycleTransition.status !== 'active') {
    return { outcome: 'activation-not-applied', paymentId };
  }
  return { outcome: 'activated', paymentId, lifecycleTransition: confirmed.lifecycleTransition };
}
