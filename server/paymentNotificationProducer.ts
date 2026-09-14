// Payment-confirmed notification producer.
//
// [Owner-directed fix, trial->payment UX investigation — NOT a formally
// authorized Module #20 Phase checkpoint the way trialNotification-
// Producer.ts, closingNotificationProducer.ts, breakageNotification-
// Producer.ts, and businessWorthNotificationProducer.ts each were. This
// file follows their exact registration pattern (registerTemplate +
// registerCommunicationPolicy against the shared NotificationPlatform
// instance, category 'subscription', which BDR-0007's own enum already
// anticipates) because that pattern is the only sanctioned way anything
// reaches the `notifications` collection in this codebase — but the
// wording below is engineering's own first draft, same as trial-engine's
// own template copy note: flag for review, not a silent business
// decision.]
//
// Investigation finding this closes: a customer who submits a payment
// via SubscriptionContactModal and then closes the app had no way to
// learn their payment was confirmed short of reopening the app and
// happening to notice the top banner had quietly turned green. This
// producer fires exactly once per confirmed payment, at the moment
// server/index.ts's POST /api/superadmin/payments/:businessId/:paymentId
// /confirm route sees `confirmPayment()` return a genuine lifecycle
// transition (i.e. a real state change occurred, not an idempotent
// replay of an already-confirmed payment) whose resulting status is
// 'active'.
//
// Unlike trial/closing/breakage/business-worth, this is event-driven,
// not a scheduled sweep — payment confirmation is a discrete superadmin
// action with no periodic condition to poll for, so there is no
// `createPaymentNotificationProducer(db, platform)` sweep runner here,
// only `buildPaymentConfirmedEvent()` for the route to call directly.
// paymentConfirmation.ts itself is deliberately left untouched — its
// own header already documents a narrow dependency boundary
// (LifecycleApplier only, never a direct Firestore/notification
// dependency) that this fix has no reason to widen.
//
// dedupeKey is paymentId-scoped (`subscription.payment_confirmed:
// {paymentId}`), not businessId-scoped — a single business will submit
// many payments over its lifetime, and each one is its own distinct
// BusinessEvent under ADR-0004 Decision 1/2, not a single recurring
// fact to fire at most once ever.

import type { NotificationPlatform, BusinessEvent, Language } from './notificationPlatform';
import { t } from './notificationPlatform';

const PAYMENT_CONFIRMED_EVENT_TYPE = 'subscription.payment_confirmed';

/**
 * Registers this producer's communication policy and notification
 * template against a Notification Platform instance. Call once, at
 * startup, alongside the other producers' registration calls.
 */
export function registerPaymentNotificationPolicyAndTemplates(platform: NotificationPlatform): void {
  platform.registerCommunicationPolicy(PAYMENT_CONFIRMED_EVENT_TYPE, {
    outcome: 'notify',
    priority: 'immediate',
  });

  platform.registerTemplate(PAYMENT_CONFIRMED_EVENT_TYPE, {
    category: 'subscription',
    type: PAYMENT_CONFIRMED_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.subscription.paymentConfirmed.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.subscription.paymentConfirmed.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.subscription.paymentConfirmed.recommendedAction'),
    }),
  });
}

/**
 * Builds the BusinessEvent for one confirmed payment. `occurredAt` is
 * the confirm route's own request-time timestamp — a few milliseconds
 * after the payment doc's actual `confirmedAt` (written inside
 * confirmPayment() itself), which this file deliberately does not
 * thread back out through, per the header note above. Close enough for
 * a notification's own display purposes; not used for any billing
 * calculation.
 */
export function buildPaymentConfirmedEvent(businessId: string, paymentId: string, occurredAt: string): BusinessEvent {
  return {
    producer: 'payment-confirmation',
    eventType: PAYMENT_CONFIRMED_EVENT_TYPE,
    dedupeKey: `${PAYMENT_CONFIRMED_EVENT_TYPE}:${paymentId}`,
    occurredAt,
    importance: 'immediate',
    context: { collection: 'payments', documentId: paymentId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}
