// Module #20 (Notifications) — Phase 3, Checkpoint 5: Breakage Producer.
//
// Per the signed Phase 3 Implementation Authorization
// (docs/engineering/20-phase3-implementation-authorization.md §2,
// which explicitly names `inventory.risk.breakage`, producer
// `breakage-tracking` — "illustrative identifier per BDR-0007's own
// caveat; the real producer identifier is engineering's to finalize at
// implementation time" — as authorized), BDR-0007 §4.2 (trigger
// definition) / §5 (Notify / High, per BDR-0006 §9.3).
//
// ADAPT, NOT REUSE (BDR-0007 §4.2, the load-bearing distinction this
// checkpoint exists to respect): `isQuebraExceedingWarning`
// (src/utils/calculations.ts) remains exactly what it was — a
// data-quality signal, UI-only, unchanged Dashboard warning banner,
// answering "does this batch's data look wrong?" This producer does
// NOT call or import that function. It uses the *same underlying
// condition* — cumulative losses on a batch exceeding that batch's
// original quantity — as a *separately named*, business-value fact:
// "should the Owner be told their business value is at risk?"
// (BDR-0007 §4.2's own framing). No business rule is invented here;
// the threshold is the one already established by
// `isQuebraExceedingWarning`'s own comparison, read from persisted
// data instead of a pending form value.
//
// WHY A NEW FUNCTION, NOT A CALL TO THE EXISTING ONE: even setting
// aside "no src/ import" (this file's inherited convention, per
// notificationPlatform.ts's own header), `isQuebraExceedingWarning`'s
// signature — `(batch, existingQuebras, newQuantity)` — is shaped for
// a live form: it answers "would adding *this pending* quantity push
// the batch over?" A background sweep has no pending quantity; it asks
// "has this batch's already-persisted total already crossed?" That is
// the same comparison with `newQuantity` fixed at 0, not a different
// rule — `isBreakageRiskExceeded()` below expresses exactly that,
// nothing more.
//
// Trigger, per BDR-0007 §4.2: for a Stock Batch, sum(quantityLost)
// across all its Quebras (any batch status — AddQuebraView.tsx applies
// no open/closed restriction on which batches accept a Quebra, so
// neither does this) strictly exceeds the batch's own `quantity`. One
// `eventType`: `inventory.risk.breakage`. Maps to Notify / High
// (BDR-0006 §9.3, BDR-0007 §5) — per the Priority Reconciliation
// Amendment §6 (which exists specifically because `inventory.risk.
// breakage`'s "High" has no corresponding value in the three-tier
// delivery-priority field): `priority: 'immediate'` (delivery
// strategy — uniform across all three Phase 3 producers, all
// Notify-outcome, per BDR-0006 §9) and `importance: 'high'`
// (BusinessEvent significance, taken directly from BDR-0007 §5's
// mapping) — two different fields, not a contradiction.
//
// DEDUPE MODEL: dedupeKey is `inventory.risk.breakage:{businessId}:
// {batchId}` — no date/period component, because a Stock Batch (unlike
// a Trial or a Closing period) doesn't repeat; BDR-0007 §4.2 frames
// this as firing "the moment isQuebraExceedingWarning becomes true for
// a batch" — a one-time state transition, not a recurring one. Known,
// accepted limitation (same category as Checkpoints 3/4's own dedupe
// assumptions, not new here): if a Quebra were later deleted (dropping
// the batch back under threshold) and a new one re-crossed it, this
// producer would not fire again — the dedupeKey has already been
// marked evaluated. Quebras are effectively append-only in this
// codebase today (07-breakages.md: "A Quebra cannot be edited after
// creation"), so this is a low-probability edge, not ignored, just
// accepted at the same precedent-level Trial/Closing already accept
// for their own one-shot dedupeKeys.
//
// occurredAt: no single existing field marks "the moment the batch
// crossed the threshold" (unlike Trial's `trialEndsAt` or Closing's
// projected `endDate`) — multiple Quebras may exist, any of which
// could be the one that tipped the sum over. This producer uses the
// most recent contributing Quebra's own `createdAt` for that batch as
// the closest available real fact, not a fabricated timestamp. This is
// an engineering judgment call within ADR-0004 Decision 1's "per the
// producer" latitude, not a re-opened business-fact question — flagged
// here, not decided silently.
//
// Recipient binding: Business-scoped, matching 20-notifications.md's
// Inventory Risk category (sourced from Breakages/#7 and Stock Counts/
// #10) and the same business-wide visibility Checkpoints 3/4 already
// established for their own categories.
//
// TEMPLATE COPY NOTE: same status as Checkpoints 3/4's — first-draft
// engineering copy per POL-19-008's tone principles, not itself
// Product-Architect-approved wording.
//
// Out of scope for this checkpoint, deliberately not touched here:
// Stock Counts inventory risk (BDR-0007 §4.2 explicit deferral — no
// eventType exists to build against), any change to
// `isQuebraExceedingWarning`, `AddQuebraView.tsx`, or the Dashboard's
// own `hasExceededWarning` banner (all untouched — this file only
// reads Quebra/StockBatch documents, never writes them, and never
// calls the client-side warning function).

import type { NotificationPlatform, BusinessEvent, Language } from './notificationPlatform';
import { t } from './notificationPlatform';
import { reportCriticalFailure } from './alerting';

const BREAKAGE_EVENT_TYPE = 'inventory.risk.breakage';

/**
 * Registers this producer's communication policy and notification
 * template against a Notification Platform instance (ADR-0004
 * Decision 4/5, BDR-0006 §9.3). Call once, at startup, before any
 * sweep runs — same pattern as Checkpoints 3/4's own
 * register*PolicyAndTemplates() functions.
 */
export function registerBreakageNotificationPolicyAndTemplates(platform: NotificationPlatform): void {
  platform.registerCommunicationPolicy(BREAKAGE_EVENT_TYPE, {
    outcome: 'notify',
    // Delivery strategy (§20.1/§20.7) — 'immediate', per the Priority
    // Reconciliation Amendment §6: uniform across all three Phase 3
    // producers, all Notify-outcome (BDR-0006 §9). NOT the same field
    // as this eventType's 'high' business significance — see
    // buildBreakageEvent()'s `importance: 'high'` below, and this
    // file's header for the full field-split explanation.
    priority: 'immediate',
  });

  platform.registerTemplate(BREAKAGE_EVENT_TYPE, {
    category: 'inventory_risk',
    type: BREAKAGE_EVENT_TYPE,
    render: (language: Language) => ({
      whatHappened: t(language, 'notificationTemplates.inventoryRisk.breakage.whatHappened'),
      whyItMatters: t(language, 'notificationTemplates.inventoryRisk.breakage.whyItMatters'),
      recommendedAction: t(language, 'notificationTemplates.inventoryRisk.breakage.recommendedAction'),
    }),
  });
}

interface QuebraDocSnapshot {
  data(): Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}

interface BatchDocSnapshot {
  id: string;
  data(): Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}

interface CollectionGroupLike<T> {
  get(): Promise<{ docs: T[] }>;
}

// Minimal Firestore surface this file needs for two collection-group
// scans (`quebras`, `batches`) across every business's subcollections —
// mirrors closingNotificationProducer.ts's own ClosingSweepDb shape,
// extended to a second collection group since this producer must
// correlate two collections to evaluate its trigger, unlike Closing's
// single-collection scan.
export interface BreakageSweepDb {
  collectionGroup(collectionId: 'quebras'): CollectionGroupLike<QuebraDocSnapshot>;
  collectionGroup(collectionId: 'batches'): CollectionGroupLike<BatchDocSnapshot>;
}

interface BatchLossAggregate {
  businessId: string;
  batchId: string;
  totalLoss: number;
  latestQuebraCreatedAt: string | null;
}

// Null byte (`\u0000`) as separator, not `:` — a business or batch ID
// containing a colon is not currently possible given how IDs are
// generated elsewhere in this codebase, but a null byte can never
// legally appear inside a Firestore document ID, so this composite key
// can never collide across a (businessId, batchId) pair by accident,
// without relying on that assumption holding.
function batchKey(businessId: string, batchId: string): string {
  return `${businessId}\u0000${batchId}`;
}

/**
 * The adapted trigger condition (BDR-0007 §4.2): does this batch's
 * already-persisted cumulative loss exceed its original quantity?
 * Same comparison `isQuebraExceedingWarning` performs, with no pending
 * `newQuantity` — see this file's header for why a background sweep
 * cannot reuse that function's own signature.
 */
function isBreakageRiskExceeded(totalLoss: number, batchQuantity: number): boolean {
  return totalLoss > batchQuantity;
}

function buildBreakageEvent(businessId: string, batchId: string, occurredAt: string): BusinessEvent {
  return {
    producer: 'breakage-tracking',
    eventType: BREAKAGE_EVENT_TYPE,
    // Deterministic, producer-owned (ADR-0004 Decision 1). No date
    // component — see this file's header "DEDUPE MODEL" note: a batch
    // crosses this threshold at most once in the sense this producer
    // tracks, matching trialNotificationProducer.ts's own
    // `{eventType}:{businessId}` precedent for a non-repeating fact.
    dedupeKey: `${BREAKAGE_EVENT_TYPE}:${businessId}:${batchId}`,
    occurredAt,
    importance: 'high',
    context: { collection: 'batches', documentId: batchId },
    recipient: { scope: 'business', businessId, userId: null },
    payload: {},
    recommendedAction: null,
  };
}

/**
 * Factory mirroring the other two producers' DI pattern — takes `db`
 * and the shared Notification Platform instance as injected
 * parameters, so this sweep can be exercised directly in a unit test
 * (tests/breakage-notification-producer.test.ts) against a fake
 * Firestore, without Firebase Admin init or process-level side
 * effects.
 */
export function createBreakageNotificationProducer(db: BreakageSweepDb, platform: NotificationPlatform) {
  async function runBreakageNotificationSweep(): Promise<void> {
    let quebraSnap;
    let batchSnap;
    try {
      [quebraSnap, batchSnap] = await Promise.all([
        db.collectionGroup('quebras').get(),
        db.collectionGroup('batches').get(),
      ]);
    } catch (err) {
      // Same defensive shape as the Trial/Closing producers'
      // "composite index missing?" handling — never crashes the
      // server, the sweep just silently does nothing until both
      // collection-group indexes (firestore.indexes.json) are
      // deployed.
      // Fix #8: this used to be a silent `return` — the sweep produces
      // zero breakage-risk notifications for the entire cycle and
      // nothing upstream ever learned why. Escalated here since this
      // is the one place that knows.
      reportCriticalFailure(
        '[breakage-notification-producer]',
        'collection-group query failed (index missing?) — sweep produced zero notifications this cycle',
        { error: err instanceof Error ? err.message : String(err) },
      );
      return;
    }

    if (quebraSnap.docs.length === 0 || batchSnap.docs.length === 0) return;

    // Aggregate cumulative loss per (businessId, batchId) — tenant
    // isolation preserved by keying on both, never summing a Quebra
    // into a batch belonging to a different business (batchId alone is
    // not guaranteed globally unique, only unique within its own
    // business's `batches` subcollection).
    const lossByBatch = new Map<string, BatchLossAggregate>();
    for (const docSnap of quebraSnap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;

      const data = docSnap.data();
      const batchId = data.batchId;
      const quantityLost = data.quantityLost;
      const createdAt = data.createdAt;
      if (typeof batchId !== 'string' || typeof quantityLost !== 'number' || !Number.isFinite(quantityLost)) continue;

      const key = batchKey(businessId, batchId);
      const existing = lossByBatch.get(key);
      const latestCreatedAt =
        typeof createdAt === 'string' &&
        (!existing?.latestQuebraCreatedAt || createdAt > existing.latestQuebraCreatedAt)
          ? createdAt
          : existing?.latestQuebraCreatedAt ?? null;

      lossByBatch.set(key, {
        businessId,
        batchId,
        totalLoss: (existing?.totalLoss ?? 0) + quantityLost,
        latestQuebraCreatedAt: latestCreatedAt,
      });
    }

    if (lossByBatch.size === 0) return;

    // Look up each aggregated batch's own `quantity` — only batches
    // with at least one Quebra were aggregated above, so this map only
    // needs entries for keys actually present in lossByBatch, but is
    // built from the full batches scan since a batch's businessId is
    // only knowable from its own document (batchId alone doesn't carry
    // it).
    const quantityByBatch = new Map<string, number>();
    for (const docSnap of batchSnap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;
      const data = docSnap.data();
      const quantity = data.quantity;
      if (typeof quantity !== 'number' || !Number.isFinite(quantity)) continue;
      quantityByBatch.set(batchKey(businessId, docSnap.id), quantity);
    }

    for (const aggregate of lossByBatch.values()) {
      const key = batchKey(aggregate.businessId, aggregate.batchId);
      const batchQuantity = quantityByBatch.get(key);
      if (batchQuantity === undefined) continue; // Quebra references a batch not found in this scan — skip, don't guess.

      if (!isBreakageRiskExceeded(aggregate.totalLoss, batchQuantity)) continue;

      try {
        const occurredAt = aggregate.latestQuebraCreatedAt ?? new Date().toISOString();
        await platform.evaluateBusinessEvent(buildBreakageEvent(aggregate.businessId, aggregate.batchId, occurredAt));
      } catch (err) {
        // One batch's evaluation failure must never block another's
        // (same isolation principle as every prior Phase 3 producer).
        console.error('[breakage-notification-producer] evaluation failed for one batch, continuing', {
          businessId: aggregate.businessId,
          batchId: aggregate.batchId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { runBreakageNotificationSweep };
}
