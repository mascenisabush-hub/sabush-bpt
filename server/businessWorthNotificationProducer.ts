// Module #20 (Notifications), extended by Business Worth Evolution —
// Implementation Authorization §19 (Increment 7: Reconciliation /
// Notifications).
//
// Governing chain: Specification §22 (FR-31, FR-32, FR-56, FR-57),
// Implementation Plan §8, Rule 8 Current State Assessment (open
// question #9, resolved low-risk/precedented), §19 Product Architect
// Authorization (signed 23 August 2026).
//
// ADAPT, NOT REUSE — same discipline breakageNotificationProducer.ts's
// own header already establishes: this file extends the existing,
// real, shipped Notifications platform with ONE new producer following
// the identical "derive facts, call writeNotification" shape the three
// existing producers (trial/closing/breakage) already use — never a
// new, parallel notification system (Specification §22's own explicit
// "Preventive notifications" decision).
//
// FOUR eventTypes, each mapped 1:1 to one of the Specification's own
// four illustrative example messages (§22):
//   - business_worth.reconciliation.value_discrepancy — "Last Contagem
//     showed a difference in stock. Make sure stock movements are
//     being recorded correctly." Fires when the latest active
//     BusinessWorthSnapshot carries a nonzero `difference`
//     (measuredBusinessWorth vs. estimatedBusinessWorthImmediatelyBefore
//     — Specification §22's own reconciliation-signal field).
//   - business_worth.reconciliation.cash_discrepancy — "Last Contagem
//     showed a stock discrepancy. Remember to verify your stock
//     records before the next Contagem." (the Specification's own cash
//     worked example, §10/§22.) Fires when the latest active snapshot
//     carries a nonzero `cashReconciliationDifference` (Increment 7's
//     own new field, calculations.ts `computeCashReconciliationDifference`).
//   - business_worth.payable.outstanding — "You have outstanding
//     supplier payments. Remember to update their payment status."
//     Fires per currently-outstanding (unpaid/partially-paid) Payable.
//   - business_worth.receivable.outstanding — "Some receivables remain
//     outstanding. Consider following up with customers." Fires per
//     currently-outstanding Receivable.
//
// Every notification produced here is DESCRIPTIVE of an already-real,
// already-recorded fact — never a classification of its cause (FR-32).
// No code path in this file writes "theft," "loss," "error," or
// "Quebra" anywhere.
//
// DEDUPE MODEL: one-shot per triggering document, matching the
// accepted-limitation precedent breakageNotificationProducer.ts's own
// header already establishes and documents for the identical reason —
// a BusinessWorthSnapshot never changes after creation (immutability,
// §27) so its own discrepancy fields are a fixed fact forever; a
// Payable/Receivable's `status` DOES change over its lifetime (unpaid
// -> partially-paid -> paid), so this producer's own per-record dedupe
// key intentionally omits any status/amount component — once a
// Payable/Receivable has been notified on once, it is never notified
// on again by this producer, even if it later moves between
// partially-paid states while still outstanding. This is the same
// "known, accepted, non-repeating reminder" limitation Trial/Closing/
// Breakage already accept for their own one-shot dedupeKeys — not
// silently different here.
//
// occurredAt: for the two reconciliation eventTypes, the snapshot's own
// confirmedAt (a real fact — the moment the discrepancy became known).
// For the two outstanding-obligation eventTypes, the record's own
// createdAt (the moment the obligation was recorded) — never a
// fabricated "now."
//
// Recipient binding: business-scoped, matching every other Phase 3
// producer's own category (Inventory Risk, Closing, Trial all bind to
// the business, not an individual user) and 20-notifications.md's own
// existing convention.
//
// TEMPLATE COPY NOTE: same status as every other Phase 3 producer's —
// first-draft engineering copy per POL-19-008's tone principles
// (preventive, actionable, evidence-based, non-accusatory — Specification
// §22's own explicit requirement), not itself Product-Architect-approved
// wording.
//
// Out of scope, deliberately not touched here: possible-cause guidance
// display (FR-56 — calculations.ts `getPossibleReconciliationCauses`,
// a separate pure function this producer does not call, since a
// notification is a short reminder, not a drill-down view); the
// Owner-confirmed cash-entry UI itself (a separate, not-yet-wired UI
// gap — see this Increment's own scope note); Increment 8/9's own
// correction/recovery and auditability mechanisms.

import type { NotificationPlatform, BusinessEvent, Language } from './notificationPlatform';
import { t } from './notificationPlatform';
import { reportCriticalFailure } from './alerting';

const VALUE_DISCREPANCY_EVENT_TYPE = 'business_worth.reconciliation.value_discrepancy';
const CASH_DISCREPANCY_EVENT_TYPE = 'business_worth.reconciliation.cash_discrepancy';
const PAYABLE_OUTSTANDING_EVENT_TYPE = 'business_worth.payable.outstanding';
const RECEIVABLE_OUTSTANDING_EVENT_TYPE = 'business_worth.receivable.outstanding';

/**
 * Registers this producer's communication policies and notification
 * templates against a Notification Platform instance (ADR-0004
 * Decision 4/5, BDR-0006 §9). Call once, at startup, before any sweep
 * runs — same pattern as every other Phase 3 producer's own
 * register*PolicyAndTemplates() function.
 */
export function registerBusinessWorthNotificationPolicyAndTemplates(platform: NotificationPlatform): void {
  // [BDR-0006 §9] All four eventTypes: Notify outcome, 'timeline'
  // delivery (never 'immediate') — a reconciliation reminder is
  // informational/preventive, not a time-critical alert the way a
  // breakage-risk crossing or a Closing deadline is. 'normal'
  // importance (BusinessEvent significance) for the same reason.
  for (const eventType of [
    VALUE_DISCREPANCY_EVENT_TYPE,
    CASH_DISCREPANCY_EVENT_TYPE,
    PAYABLE_OUTSTANDING_EVENT_TYPE,
    RECEIVABLE_OUTSTANDING_EVENT_TYPE,
  ]) {
    platform.registerCommunicationPolicy(eventType, {
      outcome: 'notify',
      priority: 'timeline',
    });
  }

  platform.registerTemplate(VALUE_DISCREPANCY_EVENT_TYPE, {
    category: 'business_worth',
    type: VALUE_DISCREPANCY_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.businessWorth.valueDiscrepancy.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.businessWorth.valueDiscrepancy.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.businessWorth.valueDiscrepancy.recommendedAction'),
    }),
  });

  platform.registerTemplate(CASH_DISCREPANCY_EVENT_TYPE, {
    category: 'business_worth',
    type: CASH_DISCREPANCY_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.businessWorth.cashDiscrepancy.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.businessWorth.cashDiscrepancy.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.businessWorth.cashDiscrepancy.recommendedAction'),
    }),
  });

  platform.registerTemplate(PAYABLE_OUTSTANDING_EVENT_TYPE, {
    category: 'business_worth',
    type: PAYABLE_OUTSTANDING_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.businessWorth.payableOutstanding.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.businessWorth.payableOutstanding.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.businessWorth.payableOutstanding.recommendedAction'),
    }),
  });

  platform.registerTemplate(RECEIVABLE_OUTSTANDING_EVENT_TYPE, {
    category: 'business_worth',
    type: RECEIVABLE_OUTSTANDING_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.businessWorth.receivableOutstanding.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.businessWorth.receivableOutstanding.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.businessWorth.receivableOutstanding.recommendedAction'),
    }),
  });
}

interface SnapshotDocSnapshot {
  id: string;
  data(): Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}

interface ObligationDocSnapshot {
  id: string;
  data(): Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}

interface CollectionGroupLike<T> {
  get(): Promise<{ docs: T[] }>;
}

// Minimal Firestore surface this file needs — three collection-group
// scans, mirroring breakageNotificationProducer.ts's own
// BreakageSweepDb shape (extended here to a third collection group).
export interface BusinessWorthSweepDb {
  collectionGroup(collectionId: 'businessWorthSnapshots'): CollectionGroupLike<SnapshotDocSnapshot>;
  collectionGroup(collectionId: 'payables'): CollectionGroupLike<ObligationDocSnapshot>;
  collectionGroup(collectionId: 'receivables'): CollectionGroupLike<ObligationDocSnapshot>;
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function buildReconciliationEvent(
  eventType: string,
  producer: string,
  businessId: string,
  snapshotId: string,
  occurredAt: string
): BusinessEvent {
  return {
    producer,
    eventType,
    // One-shot per snapshot — see this file's own header "DEDUPE
    // MODEL" note. A BusinessWorthSnapshot never changes post-creation
    // (immutability, §27), so this fact never needs re-evaluating.
    dedupeKey: `${eventType}:${businessId}:${snapshotId}`,
    occurredAt,
    importance: 'normal',
    context: { collection: 'businessWorthSnapshots', documentId: snapshotId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}

function buildObligationEvent(
  eventType: string,
  producer: string,
  collection: 'payables' | 'receivables',
  businessId: string,
  documentId: string,
  occurredAt: string
): BusinessEvent {
  return {
    producer,
    eventType,
    // One-shot per obligation record — see this file's own header
    // "DEDUPE MODEL" note for why a later status change does not
    // re-trigger this producer.
    dedupeKey: `${eventType}:${businessId}:${documentId}`,
    occurredAt,
    importance: 'normal',
    context: { collection, documentId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}

/**
 * Factory mirroring the other Phase 3 producers' DI pattern — takes
 * `db` and the shared Notification Platform instance as injected
 * parameters, so this sweep can be exercised directly in a unit test
 * against a fake Firestore, without Firebase Admin init or
 * process-level side effects.
 */
export function createBusinessWorthNotificationProducer(db: BusinessWorthSweepDb, platform: NotificationPlatform) {
  async function runBusinessWorthNotificationSweep(): Promise<void> {
    let snapshotSnap;
    let payableSnap;
    let receivableSnap;
    try {
      [snapshotSnap, payableSnap, receivableSnap] = await Promise.all([
        db.collectionGroup('businessWorthSnapshots').get(),
        db.collectionGroup('payables').get(),
        db.collectionGroup('receivables').get(),
      ]);
    } catch (err) {
      // Same defensive shape as every other Phase 3 producer's own
      // "composite index missing?" handling — never crashes the
      // server; the sweep produces zero notifications this cycle and
      // escalates so someone finds out why.
      reportCriticalFailure(
        '[business-worth-notification-producer]',
        'collection-group query failed (index missing?) — sweep produced zero notifications this cycle',
        { error: err instanceof Error ? err.message : String(err) },
      );
      return;
    }

    // [Specification §22, per-business latest-snapshot only] Only the
    // MOST RECENT active snapshot per business is a live reconciliation
    // signal — an older, superseded-by-a-later-Contagem snapshot's own
    // discrepancy is historical, not something to keep reminding the
    // Owner about. Mirrors AppContext.tsx's own existing
    // "latest active snapshot" selection logic (getEstimatedBusinessWorth
    // Case A), applied here server-side against raw document data
    // instead of a typed BusinessWorthSnapshot array.
    const latestByBusiness = new Map<string, { id: string; confirmedAtIso: string; data: Record<string, unknown> }>();
    for (const docSnap of snapshotSnap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;
      const data = docSnap.data();
      if (data.status !== 'active') continue;
      const confirmedAtIso = toIsoString(data.confirmedAt);
      if (!confirmedAtIso) continue;
      const existing = latestByBusiness.get(businessId);
      if (!existing || confirmedAtIso > existing.confirmedAtIso) {
        latestByBusiness.set(businessId, { id: docSnap.id, confirmedAtIso, data });
      }
    }

    for (const [businessId, latest] of latestByBusiness) {
      const difference = latest.data.difference;
      if (typeof difference === 'number' && Number.isFinite(difference) && difference !== 0) {
        try {
          await platform.evaluateBusinessEvent(
            buildReconciliationEvent(
              VALUE_DISCREPANCY_EVENT_TYPE,
              'business-worth-reconciliation',
              businessId,
              latest.id,
              latest.confirmedAtIso,
            ),
          );
        } catch (err) {
          console.error('[business-worth-notification-producer] value-discrepancy evaluation failed, continuing', {
            businessId,
            snapshotId: latest.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const cashDifference = latest.data.cashReconciliationDifference;
      if (typeof cashDifference === 'number' && Number.isFinite(cashDifference) && cashDifference !== 0) {
        try {
          await platform.evaluateBusinessEvent(
            buildReconciliationEvent(
              CASH_DISCREPANCY_EVENT_TYPE,
              'business-worth-reconciliation',
              businessId,
              latest.id,
              latest.confirmedAtIso,
            ),
          );
        } catch (err) {
          console.error('[business-worth-notification-producer] cash-discrepancy evaluation failed, continuing', {
            businessId,
            snapshotId: latest.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    for (const docSnap of payableSnap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;
      const data = docSnap.data();
      if (data.status === 'paid') continue;
      const occurredAt = toIsoString(data.createdAt) ?? new Date().toISOString();
      try {
        await platform.evaluateBusinessEvent(
          buildObligationEvent(
            PAYABLE_OUTSTANDING_EVENT_TYPE,
            'business-worth-obligations',
            'payables',
            businessId,
            docSnap.id,
            occurredAt,
          ),
        );
      } catch (err) {
        console.error('[business-worth-notification-producer] payable-outstanding evaluation failed, continuing', {
          businessId,
          payableId: docSnap.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const docSnap of receivableSnap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;
      const data = docSnap.data();
      if (data.status === 'paid') continue;
      const occurredAt = toIsoString(data.createdAt) ?? new Date().toISOString();
      try {
        await platform.evaluateBusinessEvent(
          buildObligationEvent(
            RECEIVABLE_OUTSTANDING_EVENT_TYPE,
            'business-worth-obligations',
            'receivables',
            businessId,
            docSnap.id,
            occurredAt,
          ),
        );
      } catch (err) {
        console.error('[business-worth-notification-producer] receivable-outstanding evaluation failed, continuing', {
          businessId,
          receivableId: docSnap.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { runBusinessWorthNotificationSweep };
}
