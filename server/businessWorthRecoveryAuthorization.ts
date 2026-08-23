// Business Worth Evolution — Implementation Authorization, Increment 8
// (Correction / Recovery) — SuperAdmin-Authorized Recovery grant logic.
//
// Governing chain: docs/specs/business-worth-evolution-specification.md
// (§26, FR-40-FR-43, FR-58) -> docs/engineering/business-worth-evolution-
// implementation-plan.md (§13) -> docs/engineering/business-worth-
// evolution-rule8-assessment.md (Findings 4-A, 4-B, 10-B) ->
// docs/engineering/business-worth-evolution-implementation-authorization.md
// (§20, signed SABUSHIMIKE Masceni, 23 August 2026).
//
// DELIBERATELY the identical shipped pattern
// server/initialStockRecoveryAuthorization.ts already establishes
// (Rule 8 Finding 4-A — "not just analogous, the identical shipped
// pattern"), reused verbatim in shape with a new collection name and a
// different target document type — but a FULLY SEPARATE, PARALLEL
// mechanism: this module never reads, writes, or references the
// existing businesses/{businessId}/initialStockRecoveryAuthorization
// collection or its own grant/consumption modules (FR-43).
//
// SCOPE (Specification §26 FR-42): this module's ONLY write surface is
// the fixed-id-per-business
// businesses/{businessId}/businessWorthRecoveryAuthorizations/current
// document. It NEVER writes to businessWorthSnapshots or stockCounts —
// Owner-tier execution of the actual correction/recovery write itself
// remains entirely client-side, at the Security Rules layer
// (firestore.rules businessWorthRecoveryAuthorizationActive()),
// mirroring Plan §13's own explicit "Consumption: Owner-only, via a new
// eligibility branch on whatever write path performs the correction"
// instruction.
//
// NO CYCLE-COUNT CEILING (Rule 8 Finding 4-B, RESOLVED; Specification
// §26/§30b — explicit Product Architect decision: "NO additional
// numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin
// authorization are the governing limits."): unlike
// grantInitialStockRecoveryAuthorization's own chainPosition-4 ceiling
// check, this module has no equivalent — a snapshot may be granted a
// recovery Authorization repeatedly across its lifetime, bounded only
// by FR-41's "at most one unconsumed, unexpired Authorization per
// business at a time." This is a knowingly-accepted, already-approved
// design choice, not an oversight.
//
// CONCURRENCY: grantBusinessWorthRecoveryAuthorization() runs inside a
// single Firestore transaction that reads the existing fixed-id
// document AND the target businessWorthSnapshots document before
// writing — two simultaneous grant requests for the same business
// resolve so that only one transaction commits, identical to the
// Initial-Stock precedent.

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface DocRef {
  get(): Promise<DocSnap>;
}

interface Transaction {
  get(ref: DocRef): Promise<DocSnap>;
  set(ref: DocRef, data: Record<string, unknown>): void;
}

export interface BusinessWorthRecoveryAuthorizationDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'businessWorthSnapshots'): {
        doc(snapshotId: string): DocRef;
      };
      collection(name: 'businessWorthRecoveryAuthorizations'): {
        doc(docId: 'current'): DocRef;
      };
    };
  };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/** Minimal Admin-SDK-shaped server-clock Timestamp — satisfied by firebase-admin's real Timestamp. */
export interface ServerTimestamp {
  toMillis(): number;
}

export interface TimestampFactory {
  now(): ServerTimestamp;
  fromMillis(ms: number): ServerTimestamp;
}

export type GrantBusinessWorthRecoveryOutcome =
  | {
      outcome: 'granted';
      businessId: string;
      targetSnapshotId: string;
      targetStockCountId: string;
      authorizedAt: ServerTimestamp;
      expiresAt: ServerTimestamp;
    }
  | { outcome: 'missing-justification'; message: string }
  | { outcome: 'missing-target'; message: string }
  | { outcome: 'target-not-found'; message: string }
  // Mirrors 'target-not-current' from the Initial-Stock precedent,
  // renamed to this collection's own vocabulary — a snapshot whose
  // status is no longer 'active' (already 'corrected' or already
  // 'superseded-by-recovery') is no longer the business's current
  // Business Worth figure and cannot be granted a further recovery
  // Authorization (Specification §26's "one exact confirmation per
  // Authorization," the current one, mirroring POL-0009 Rule U/Rule 8
  // Finding E for this Specification's own target type).
  | { outcome: 'target-not-active'; message: string }
  | { outcome: 'authorization-already-active'; message: string };

/** 72 hours, per Specification Decision 32/§26 — a single named constant, never re-derived or re-typed elsewhere. */
export const BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS = 72 * 60 * 60 * 1000;

/**
 * Grants a new SuperAdmin-Authorized Business Worth Recovery
 * Authorization for one named, currently-eligible (status === 'active')
 * `BusinessWorthSnapshot`.
 *
 * Enforces, server-side, every grant-time precondition Specification
 * §26/Plan §13/Rule 8 require — this is the FIRST of the two
 * enforcement points the Initial-Stock precedent's own "belt-and-
 * suspenders" design establishes for this class of mechanism;
 * firestore.rules' businessWorthRecoveryAuthorizationActive() (checked
 * again at Owner consumption time) is the second, and remains
 * authoritative regardless of what this function does or does not
 * catch.
 *
 * NEVER writes to businessWorthSnapshots or stockCounts (FR-42).
 */
export async function grantBusinessWorthRecoveryAuthorization(
  db: BusinessWorthRecoveryAuthorizationDb,
  clock: TimestampFactory,
  params: { businessId: string; targetSnapshotId: string; justification: string; grantedByUid: string }
): Promise<GrantBusinessWorthRecoveryOutcome> {
  const { businessId, targetSnapshotId, justification, grantedByUid } = params;

  if (!justification || !justification.trim()) {
    return { outcome: 'missing-justification', message: 'É obrigatório indicar uma justificação.' };
  }
  if (!targetSnapshotId || !targetSnapshotId.trim()) {
    return { outcome: 'missing-target', message: 'É obrigatório indicar o registo de valor do negócio a autorizar.' };
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const targetRef = businessRef.collection('businessWorthSnapshots').doc(targetSnapshotId);
  const authorizationRef = businessRef.collection('businessWorthRecoveryAuthorizations').doc('current');

  return db.runTransaction(async (tx) => {
    const [targetSnap, existingAuthorizationSnap] = await Promise.all([
      tx.get(targetRef),
      tx.get(authorizationRef),
    ]);

    if (!targetSnap.exists) {
      return { outcome: 'target-not-found', message: 'O registo de valor do negócio indicado não existe.' };
    }
    const target = targetSnap.data() ?? {};
    // [Specification §26 "one exact confirmation per Authorization,
    // the current one"] Only a still-'active' snapshot is eligible —
    // mirrors the Initial-Stock precedent's own
    // "target-not-current"/voidRecordSnap.exists check, adapted to this
    // Specification's own one-way status field (types.ts,
    // BusinessWorthSnapshot.status).
    if (target.status !== 'active') {
      return { outcome: 'target-not-active', message: 'Este registo de valor do negócio já foi corrigido ou recuperado — não é o registo atual.' };
    }

    if (existingAuthorizationSnap.exists) {
      const existing = existingAuthorizationSnap.data() ?? {};
      const existingExpiresAtMs = (existing.expiresAt as ServerTimestamp | undefined)?.toMillis?.() ?? 0;
      const stillActive = existing.status === 'unconsumed' && clock.now().toMillis() < existingExpiresAtMs;
      if (stillActive) {
        return { outcome: 'authorization-already-active', message: 'Já existe uma autorização de recuperação ativa para este negócio.' };
      }
    }

    const authorizedAt = clock.now();
    const expiresAt = clock.fromMillis(authorizedAt.toMillis() + BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS);
    const targetStockCountId = String(target.sourceStockCountId ?? '');

    tx.set(authorizationRef, {
      id: 'current',
      targetSnapshotId,
      targetStockCountId,
      authorizedAt,
      expiresAt,
      status: 'unconsumed',
      grantedByUid,
      justification,
    });

    return { outcome: 'granted', businessId, targetSnapshotId, targetStockCountId, authorizedAt, expiresAt };
  });
}
