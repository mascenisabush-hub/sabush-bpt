// SuperAdmin V1 Operational Control Plane — Phase E: one-time backfill
// for lastActivityAt and subscriptionStatusCache on existing businesses.
//
// Governing chain: BDR-0010, POL-18-001,
// docs/specs/18-superadmin-business-directory-slice.md v1.2 §7/§16/§18.
//
// Same extraction rationale as every prior Phase A-D module and as
// server/businessDirectory.ts itself: this file holds the pure/testable
// logic; server/scripts/backfillPhaseE.ts is the actual CLI entry
// point (real Admin SDK credentials, following
// server/scripts/provisionPlatformOperator.ts's exact structure) and
// is NOT imported here, so this module stays safely importable by
// tests with no credential-loading side effect.
//
// SCOPE, restated from the specification and this session's own
// governing instructions:
//   - Existing businesses only. Newly-created businesses already
//     receive both fields at creation time (server/index.ts) — this
//     script exists specifically to close the gap for businesses that
//     predate that invariant.
//   - Idempotent: a business that already has either field populated
//     is left untouched for that field — this script never overwrites
//     real, already-correct data (whether set by the creation-time
//     invariant, a prior run of this same script, or a real activity
//     touch) with a backfilled value.
//   - lastActivityAt: populated from the business's most recent
//     existing timelineEvents entry, or from createdAt itself if the
//     business has none — the same invariant already established at
//     creation time (server/businessDirectory.ts's Dormant-filter
//     comment), applied retroactively here.
//   - subscriptionStatusCache: populated by copying the CURRENT value
//     of subscriptions/{businessId}.status — read-only against that
//     collection, never written to. The canonical subscription record
//     is never altered by this script, in any way.
//   - No background/recurring aging process — this is a one-time,
//     bounded migration, not a live worker (unlike
//     server/backgroundWorker.ts's registered jobs).

interface TimelineEventDoc {
  createdAt?: string;
}

interface BusinessDoc {
  id?: string;
  createdAt?: string;
  lastActivityAt?: string;
  subscriptionStatusCache?: string;
}

interface SubscriptionDoc {
  status?: string;
}

interface DocSnap<T> {
  id: string;
  exists: boolean;
  data(): T | undefined;
}

export interface BackfillDb {
  collection(name: 'businesses'): {
    get(): Promise<{ docs: DocSnap<BusinessDoc>[] }>;
    doc(businessId: string): {
      update(data: Record<string, unknown>): Promise<unknown>;
      collection(name: 'timelineEvents'): {
        orderBy(field: 'createdAt', direction: 'desc'): {
          limit(n: number): {
            get(): Promise<{ docs: DocSnap<TimelineEventDoc>[] }>;
          };
        };
      };
    };
  };
  collection(name: 'subscriptions'): {
    doc(businessId: string): { get(): Promise<DocSnap<SubscriptionDoc>> };
  };
}

export interface BackfillDecisionInput {
  businessId: string;
  createdAt: string;
  existingLastActivityAt?: string;
  mostRecentTimelineEventAt?: string;
  existingSubscriptionStatusCache?: string;
  canonicalSubscriptionStatus?: string;
}

export interface BackfillDecision {
  businessId: string;
  lastActivityAtUpdate?: string;
  subscriptionStatusCacheUpdate?: string;
}

/**
 * Pure decision function — no I/O, fully deterministic, unit-testable
 * without any Firestore dependency at all. Given one business's
 * current state, decides which field(s), if any, need a backfill
 * write. Never returns an update for a field that's already present —
 * idempotency lives here, at the decision level, not bolted on
 * separately at the orchestration level.
 */
export function computeBackfillDecision(input: BackfillDecisionInput): BackfillDecision {
  const decision: BackfillDecision = { businessId: input.businessId };

  if (input.existingLastActivityAt === undefined) {
    decision.lastActivityAtUpdate = input.mostRecentTimelineEventAt ?? input.createdAt;
  }

  // Only backfills the cache if a canonical status genuinely exists to
  // copy — never invents a value. Per ADR-0001, every business
  // provisioned through the orchestrator already has a subscription
  // document, but this stays defensive against any business that,
  // for whatever historical reason, does not.
  if (input.existingSubscriptionStatusCache === undefined && input.canonicalSubscriptionStatus !== undefined) {
    decision.subscriptionStatusCacheUpdate = input.canonicalSubscriptionStatus;
  }

  return decision;
}

export interface BackfillSummary {
  totalBusinesses: number;
  lastActivityAtBackfilled: number;
  subscriptionStatusCacheBackfilled: number;
  alreadyComplete: number; // needed neither field
  missingSubscriptionDoc: number; // flagged, not silently skipped
  decisions: BackfillDecision[];
}

/**
 * Orchestration — reads every business once, reads each one's most
 * recent timelineEvents entry (if any) and its subscription document,
 * computes the decision, applies only the writes that decision
 * requires. A one-time, bounded pass over the current business
 * population — not a recurring job, no aging logic, no periodic
 * re-evaluation.
 */
export async function runBackfill(db: BackfillDb, options: { dryRun?: boolean } = {}): Promise<BackfillSummary> {
  const businessesSnap = await db.collection('businesses').get();
  const summary: BackfillSummary = {
    totalBusinesses: businessesSnap.docs.length,
    lastActivityAtBackfilled: 0,
    subscriptionStatusCacheBackfilled: 0,
    alreadyComplete: 0,
    missingSubscriptionDoc: 0,
    decisions: [],
  };

  for (const businessDoc of businessesSnap.docs) {
    const business = businessDoc.data();
    if (!business) continue;
    const businessId = businessDoc.id;

    let mostRecentTimelineEventAt: string | undefined;
    if (business.lastActivityAt === undefined) {
      const timelineSnap = await db.collection('businesses').doc(businessId).collection('timelineEvents').orderBy('createdAt', 'desc').limit(1).get();
      mostRecentTimelineEventAt = timelineSnap.docs[0]?.data()?.createdAt;
    }

    let canonicalSubscriptionStatus: string | undefined;
    if (business.subscriptionStatusCache === undefined) {
      const subSnap = await db.collection('subscriptions').doc(businessId).get();
      if (subSnap.exists) {
        canonicalSubscriptionStatus = subSnap.data()?.status;
      } else {
        summary.missingSubscriptionDoc += 1;
      }
    }

    const decision = computeBackfillDecision({
      businessId,
      createdAt: business.createdAt ?? '',
      existingLastActivityAt: business.lastActivityAt,
      mostRecentTimelineEventAt,
      existingSubscriptionStatusCache: business.subscriptionStatusCache,
      canonicalSubscriptionStatus,
    });

    if (!decision.lastActivityAtUpdate && !decision.subscriptionStatusCacheUpdate) {
      summary.alreadyComplete += 1;
      continue;
    }

    summary.decisions.push(decision);
    if (decision.lastActivityAtUpdate) summary.lastActivityAtBackfilled += 1;
    if (decision.subscriptionStatusCacheUpdate) summary.subscriptionStatusCacheBackfilled += 1;

    if (!options.dryRun) {
      const update: Record<string, unknown> = {};
      if (decision.lastActivityAtUpdate) update.lastActivityAt = decision.lastActivityAtUpdate;
      if (decision.subscriptionStatusCacheUpdate) update.subscriptionStatusCache = decision.subscriptionStatusCacheUpdate;
      await db.collection('businesses').doc(businessId).update(update);
    }
  }

  return summary;
}
