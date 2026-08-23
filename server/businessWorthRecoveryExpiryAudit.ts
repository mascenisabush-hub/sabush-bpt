// Business Worth Evolution — Implementation Authorization, Increment 9
// (Auditability) — SuperAdmin Recovery Authorization unconsumed-expiry
// audit sweep.
//
// Governing chain: docs/specs/business-worth-evolution-specification.md
// (§34, FR-48) -> docs/engineering/business-worth-evolution-rule8-
// assessment.md (Finding 11-A, which explicitly treats grant/consume/
// EXPIRE as three separate events, each needing a real actionType-
// tagged audit record) -> docs/engineering/business-worth-evolution-
// implementation-plan.md (§15, which explicitly proposes
// `business_worth_recovery.expired` as a concrete actionType, parallel
// in kind to `.authorized`/`.consumed`) -> docs/engineering/business-
// worth-evolution-implementation-authorization.md (§21, signed
// SABUSHIMIKE Masceni, 23 August 2026).
//
// CORRECTION, STATED PLAINLY: an earlier pass of this increment
// concluded no discrete expiry-write event was needed, reasoning by
// analogy from Initial-Stock recovery's own deliberate design (which
// has no `expired` status ever written — see
// InitialStockRecoveryAuthorization's own type comment). That analogy
// was wrong for THIS mechanism specifically: unlike Initial-Stock
// recovery, this Specification's own governance chain (Rule 8 Finding
// 11-A, Plan §15) explicitly names and proposes an actionType for the
// expiry event, which Initial-Stock's own chain never does. This
// module exists to correct that gap, not to reinterpret or redesign
// anything already approved.
//
// EXTENDS EXISTING INFRASTRUCTURE, invents nothing new: reuses the
// same `platform_audit_log` collection and `actionType` convention
// Increment 8's own grant route already writes to
// (`business_worth_recovery.authorized`), and the same registered-
// Background-Worker-job pattern this codebase already uses for every
// other scheduled sweep (trial-lifecycle-sweep, closing-notification-
// sweep, breakage-notification-sweep, business-worth-notification-
// sweep, grace-period-expiry-sweep — the last of which is this
// module's own closest structural precedent: server/subscriptionEngine.ts's
// runGracePeriodExpirySweep(), including its atomic in-transaction
// audit write, its own DI'd `now` parameter for deterministic testing,
// and its own per-document try/catch isolation).
//
// SCOPE: this module's write surface is exactly two documents, both
// inside ONE Firestore transaction per authorization processed —
// businesses/{businessId}/businessWorthRecoveryAuthorizations/current
// (a narrow, additive `expiryAuditedAt` marker only — never `status`,
// `targetSnapshotId`, or any other field FR-42 already governs) and a
// new platform_audit_log/{autoId} document. NEVER writes to
// businessWorthSnapshots or stockCounts (mirrors FR-42's own
// discipline, extended here to this sweep). NEVER interacts with the
// existing initialStockRecoveryAuthorization collection (FR-43).
//
// IDEMPOTENCY: `expiryAuditedAt` is the fixed-slot document's own
// idempotency marker — re-checked INSIDE the transaction (never
// trusted from the initial, non-transactional scan alone), so two
// overlapping sweep ticks (or a sweep tick racing a fresh grant that
// overwrites the whole document) can never produce two expiry audit
// entries for the same authorization. A fresh grant overwrites this
// whole fixed-slot document, including this marker, so it is never
// carried forward onto a later, unrelated Authorization for the same
// business — exactly mirroring how `status`/`consumedAt` already reset
// on every new grant.
//
// SCAN STRATEGY: an unconditional (no `.where()` filter) collectionGroup
// scan, filtered in-memory — the same choice
// businessWorthNotificationProducer.ts (Increment 7) already made, for
// the identical reason: avoids requiring any new Firestore composite
// index (no firestore.indexes.json change), and this collection's own
// document count is naturally small (at most one per business that has
// ever received a grant).

import type { WriteAuditLogEntryParams } from './platformAuditLog';

interface DocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  ref: { parent: { parent: { id: string } | null } };
}

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
}

interface Transaction {
  get(ref: DocRef): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  update(ref: DocRef, data: Record<string, unknown>): void;
  set(ref: DocRef, data: Record<string, unknown>): void;
}

interface CollectionGroupLike {
  get(): Promise<{ docs: DocSnap[] }>;
}

export interface BusinessWorthRecoveryExpiryAuditDb {
  collectionGroup(collectionId: 'businessWorthRecoveryAuthorizations'): CollectionGroupLike;
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'businessWorthRecoveryAuthorizations'): { doc(id: 'current'): DocRef };
    };
  };
  collection(name: 'platform_audit_log'): { doc(): DocRef };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

export interface ServerTimestampLike {
  toMillis(): number;
}

/**
 * Scans every business's own fixed-slot
 * businessWorthRecoveryAuthorizations/current document for one that is
 * still `status: 'unconsumed'`, whose `expiresAt` has already passed
 * `now`, and that has not yet had its expiry audited
 * (`expiryAuditedAt` absent) — and, for each one found, writes a
 * `platform_audit_log` entry (`actionType:
 * 'business_worth_recovery.expired'`) and marks `expiryAuditedAt` on
 * the authorization document, atomically, inside one transaction per
 * authorization.
 *
 * `now` is an optional injected parameter, defaulting to the real
 * current time in production — exists purely for deterministic
 * testing (mirroring runGracePeriodExpirySweep's own identical
 * rationale), not a production behavior change.
 *
 * One authorization's failure must never block another's — same
 * per-document try/catch isolation every other sweep in this codebase
 * already uses.
 */
export function createBusinessWorthRecoveryExpiryAuditSweep(
  db: BusinessWorthRecoveryExpiryAuditDb,
  reportCriticalFailure: (source: string, message: string, context: Record<string, unknown>) => void
) {
  async function runBusinessWorthRecoveryExpiryAuditSweep(now: Date = new Date()): Promise<void> {
    let snap;
    try {
      snap = await db.collectionGroup('businessWorthRecoveryAuthorizations').get();
    } catch (err) {
      reportCriticalFailure(
        '[business-worth-recovery-expiry-audit]',
        'collection-group query failed (index missing?) — sweep audited zero expiries this cycle',
        { error: err instanceof Error ? err.message : String(err) },
      );
      return;
    }

    if (snap.docs.length === 0) return;

    const nowMs = now.getTime();

    for (const docSnap of snap.docs) {
      const businessId = docSnap.ref.parent.parent?.id;
      if (!businessId) continue;

      const data = docSnap.data() ?? {};
      if (data.status !== 'unconsumed') continue;
      if (data.expiryAuditedAt) continue; // already audited on an earlier tick
      const expiresAt = data.expiresAt as ServerTimestampLike | undefined;
      const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
      if (nowMs < expiresAtMs) continue; // not yet expired

      try {
        const businessRef = db.collection('businesses').doc(businessId);
        const authorizationRef = businessRef.collection('businessWorthRecoveryAuthorizations').doc('current');
        const auditLogRef = db.collection('platform_audit_log').doc();

        await db.runTransaction(async (tx) => {
          // Re-read and re-check inside the transaction — never trusted
          // from the initial, non-transactional scan alone. Guards
          // against a second sweep tick, a fresh grant overwriting this
          // whole document, or an Owner's consumption having already
          // happened since the scan ran.
          const current = await tx.get(authorizationRef);
          if (!current.exists) return;
          const currentData = current.data() ?? {};
          if (currentData.status !== 'unconsumed') return;
          if (currentData.expiryAuditedAt) return;
          const currentExpiresAt = currentData.expiresAt as ServerTimestampLike | undefined;
          if (nowMs < (currentExpiresAt?.toMillis?.() ?? 0)) return;

          const auditEntry: WriteAuditLogEntryParams = {
            actorUid: 'system',
            actorRole: 'system',
            actionType: 'business_worth_recovery.expired',
            targetBusinessId: businessId,
            targetStockCountId: String(currentData.targetStockCountId ?? ''),
            justification: 'Automated expiry sweep — Authorization was never consumed within the 72-hour ceiling.',
          };
          tx.set(auditLogRef, { ...auditEntry, timestamp: now.toISOString() });
          tx.update(authorizationRef, { expiryAuditedAt: now });
        });
      } catch (err) {
        console.error('[business-worth-recovery-expiry-audit] audit failed for one business, continuing', {
          businessId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { runBusinessWorthRecoveryExpiryAuditSweep };
}
