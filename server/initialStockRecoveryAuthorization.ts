// SuperAdmin-Assisted Initial Stock Recovery — grant logic.
//
// Governing chain: docs/specs/BDR-0016-superadmin-assisted-initial-stock-recovery.md
// (Approved) -> docs/specs/POL-0009-superadmin-assisted-initial-stock-recovery-policy.md
// (Approved) -> docs/specs/superadmin-assisted-initial-stock-recovery-specification.md
// -> docs/engineering/superadmin-assisted-initial-stock-recovery-rule8-assessment.md
// (READY) -> docs/engineering/superadmin-assisted-initial-stock-recovery-implementation-plan.md
// -> docs/engineering/superadmin-assisted-initial-stock-recovery-implementation-authorization.md
// (Signed, SABUSHIMIKE MASCENI, 2026-08-21).
//
// Same extraction rationale as server/businessSuspension.ts,
// server/operatorManagement.ts, server/businessVisibility.ts:
// server/index.ts cannot be imported by any test (it calls
// initializeApp({credential: cert(...)}) at module load), so this
// grant logic lives in its own importable module and the Express
// route in server/index.ts stays a thin wrapper (Implementation Plan
// §9; Rule 8 Finding B).
//
// SCOPE (Implementation Authorization §2/§3): this module's ONLY write
// surface is the fixed-id-per-business
// businesses/{businessId}/initialStockRecoveryAuthorization/current
// document. It NEVER writes to stockCounts, voidRecords, or any other
// tenant collection — Owner-tier execution of Void & Redo itself
// (draft restoration, void-record creation, redo confirmation,
// reconfirmation) remains entirely client-side, at the Security Rules
// layer, exactly as it already is for the ordinary path (POL-0009 Rule
// N: "SuperAdmin authorizes; SuperAdmin does not act").
//
// CONCURRENCY (Rule 8 Finding F; Implementation Plan §5): grantAuthorization()
// runs inside a single Firestore transaction that reads the existing
// fixed-id document AND the target stockCounts/voidRecords documents
// before writing — two simultaneous grant requests for the same
// business resolve so that only one transaction commits; Firestore's
// own optimistic-concurrency control rejects the other, requiring no
// additional locking primitive (identical pattern to
// server/paymentConfirmation.ts's own transactional idempotency).

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

export interface InitialStockRecoveryAuthorizationDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'stockCounts'): {
        doc(stockCountId: string): DocRef;
      };
      collection(name: 'voidRecords'): {
        doc(stockCountId: string): DocRef;
      };
      collection(name: 'initialStockRecoveryAuthorization'): {
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

export type GrantAuthorizationOutcome =
  | { outcome: 'granted'; businessId: string; targetStockCountId: string; authorizedAt: ServerTimestamp; expiresAt: ServerTimestamp }
  | { outcome: 'missing-justification'; message: string }
  | { outcome: 'missing-target'; message: string }
  // No separate 'business-not-found' outcome: if businessId names no
  // real business, it also has no stockCounts subcollection, so
  // 'target-not-found' already reports this accurately — a second,
  // redundant business-existence read is not needed inside the same
  // transaction.
  | { outcome: 'target-not-found'; message: string }
  | { outcome: 'target-not-initial-type'; message: string }
  | { outcome: 'target-not-current'; message: string }
  | { outcome: 'target-at-ceiling'; message: string }
  | { outcome: 'authorization-already-active'; message: string }
  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 3] Returned when a new grant is attempted after the
  // retirement cutover (see CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS
  // below). No businessId/targetStockCountId/expiresAt fields — a
  // caller must never treat this as a granted result.
  | { outcome: 'retirement-cutover-reached'; message: string };

/** 48 hours, per explicit, final Product Architect decision (BDR-0016 §9 Decision 1; POL-0009 Rule R). A single named constant — never re-derived or re-typed elsewhere. */
export const AUTHORIZATION_DURATION_MS = 48 * 60 * 60 * 1000;

/**
 * [Capital Inicial Retirement — Implementation Authorization
 * Increment 3] The fixed retirement-cutover instant, defined at
 * implementation time as the moment Increment 2 shipped — the commit
 * that closed the stockCounts create path for new Capital Inicial
 * confirmations (`a7fea6b`, 2026-08-31T13:44:47Z UTC). A hardcoded
 * constant, never derived from a request-supplied or Owner-editable
 * value, compared only against this module's own injected
 * TimestampFactory server clock (never `Date.now()` directly, and
 * never any client input) — see the Security constraints in the
 * signed Implementation Authorization, Increment 3.
 */
export const CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS = Date.UTC(2026, 7, 31, 13, 44, 47);

/**
 * Grants a new SuperAdmin-Assisted Initial Stock Recovery Authorization
 * for one exact, currently-eligible confirmation.
 *
 * Enforces, server-side, EVERY grant-time precondition BDR-0016/POL-0009/
 * Rule 8/Implementation Plan §2, §3, §6, §14 require — this is the
 * FIRST of the two enforcement points Rule 8 Finding E's "belt-and-
 * suspenders" design calls for; firestore.rules'
 * initialStockRecoveryAuthorizationActive() (checked again at Owner
 * consumption time) is the second, and remains authoritative
 * regardless of what this function does or does not catch:
 *
 * - Non-empty justification (POL-0009 Rule V).
 * - The target stockCounts/{id} exists, is type 'initial', and has no
 *   existing voidRecords/{id} — i.e. it is the business's CURRENT
 *   confirmation (POL-0009 Rule U; Rule 8 Finding E).
 * - The target's chainPosition is not 4 (Confirmation #4 remains
 *   absolutely non-voidable under every path; Implementation
 *   Authorization Acceptance Criterion 12) — a legacy target (no
 *   chainPosition field) is never excluded by this check.
 * - No unconsumed, unexpired Authorization already exists for this
 *   business (POL-0009 Rule T; Rule 8 Finding F) — the fixed document
 *   id ('current') makes this a single read inside the same
 *   transaction, not a separate query.
 *
 * NEVER writes to StockCount (Implementation Authorization Acceptance
 * Criterion 10) and NEVER fabricates/backfills confirmedAt or
 * chainPosition on the target (Acceptance Criteria 8, 9).
 *
 * [Increment 3] Checked FIRST, before every precondition above: once
 * the server's own trusted clock has reached
 * CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS, no new grant is issued, for
 * any business, any target, regardless of justification or
 * eligibility — Capital Inicial's retirement extends to closing this
 * recovery path, not merely the ordinary creation path Increment 2
 * already closed. A grant already issued before cutover remains fully
 * consumable afterward, within its own already-set expiresAt —
 * consumption logic (server/initialStockRecoveryConsumption.ts) is
 * untouched by this increment, by design.
 */
export async function grantInitialStockRecoveryAuthorization(
  db: InitialStockRecoveryAuthorizationDb,
  clock: TimestampFactory,
  params: { businessId: string; targetStockCountId: string; justification: string; grantedByUid: string }
): Promise<GrantAuthorizationOutcome> {
  const { businessId, targetStockCountId, justification, grantedByUid } = params;

  if (clock.now().toMillis() >= CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS) {
    return {
      outcome: 'retirement-cutover-reached',
      message: 'Capital Inicial foi retirado como conceito de negócio activo — já não é possível conceder novas autorizações de recuperação.',
    };
  }

  if (!justification || !justification.trim()) {
    return { outcome: 'missing-justification', message: 'É obrigatório indicar uma justificação.' };
  }
  if (!targetStockCountId || !targetStockCountId.trim()) {
    return { outcome: 'missing-target', message: 'É obrigatório indicar a confirmação a autorizar.' };
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const targetRef = businessRef.collection('stockCounts').doc(targetStockCountId);
  const voidRecordRef = businessRef.collection('voidRecords').doc(targetStockCountId);
  const authorizationRef = businessRef.collection('initialStockRecoveryAuthorization').doc('current');

  return db.runTransaction(async (tx) => {
    const [targetSnap, voidRecordSnap, existingAuthorizationSnap] = await Promise.all([
      tx.get(targetRef),
      tx.get(voidRecordRef),
      tx.get(authorizationRef),
    ]);

    if (!targetSnap.exists) {
      return { outcome: 'target-not-found', message: 'A confirmação de Capital Inicial indicada não existe.' };
    }
    const target = targetSnap.data() ?? {};
    if (target.type !== 'initial') {
      return { outcome: 'target-not-initial-type', message: 'Só é possível autorizar a recuperação da Contagem Inicial de Stock.' };
    }
    // [POL-0009 Rule U; Rule 8 Finding E] "Current confirmation" means:
    // exists, type 'initial', and not already superseded — a
    // voidRecords/{targetStockCountId} document existing proves this
    // exact slot has already been voided (by either the ordinary or an
    // earlier authorized path) and therefore is no longer current.
    if (voidRecordSnap.exists) {
      return { outcome: 'target-not-current', message: 'Esta confirmação já foi anulada e substituída — não é a confirmação atual do negócio.' };
    }
    // [Implementation Authorization Acceptance Criterion 12] chainPosition
    // is absent on a legacy confirmation (default 1, mirroring
    // firestore.rules' own `chainPosition', 1)` default) — never
    // excluded here. Only an explicit chainPosition === 4 is refused.
    const chainPosition = typeof target.chainPosition === 'number' ? target.chainPosition : 1;
    if (chainPosition === 4) {
      return { outcome: 'target-at-ceiling', message: 'Esta confirmação atingiu o limite de recuperações (Confirmação #4) e não pode ser autorizada.' };
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
    const expiresAt = clock.fromMillis(authorizedAt.toMillis() + AUTHORIZATION_DURATION_MS);

    tx.set(authorizationRef, {
      id: 'current',
      targetStockCountId,
      authorizedAt,
      expiresAt,
      status: 'unconsumed',
      grantedByUid,
      justification,
    });

    return { outcome: 'granted', businessId, targetStockCountId, authorizedAt, expiresAt };
  });
}
