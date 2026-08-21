// SuperAdmin-Assisted Initial Stock Recovery — Owner consumption logic.
//
// Governing chain: docs/specs/BDR-0016.../POL-0009.../Specification ->
// docs/engineering/superadmin-assisted-initial-stock-recovery-rule8-assessment.md
// (READY) -> docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-rule8-reassessment.md
// (READY) -> docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md
// -> docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-implementation-authorization.md
// (Signed, SABUSHIMIKE MASCENI, 2026-08-21).
//
// Same extraction rationale as server/initialStockRecoveryAuthorization.ts
// and every other server/*.ts module in this codebase: independently
// importable by tests, server/index.ts stays a thin wrapper.
//
// SCOPE (Amendment §3, Supplementary Authorization §2/§7): this
// module's write surface is EXACTLY two documents, both inside ONE
// Firestore transaction — businesses/{businessId}/voidRecords/{targetStockCountId}
// (create) and businesses/{businessId}/initialStockRecoveryAuthorization/current
// (partial update: status, consumedAt only). It NEVER writes to
// stockCounts (original immutability, Amendment §3 step 8/Supplementary
// Authorization Acceptance Criterion 6) and NEVER writes platform_audit_log
// itself (that happens as a separate step, in server/index.ts's route,
// per Amendment §4 — audit non-atomicity is a repository-wide
// architectural constraint, not something this module works around).

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface DocRef {
  get(): Promise<DocSnap>;
}

interface Transaction {
  get(ref: DocRef): Promise<DocSnap>;
  create(ref: DocRef, data: Record<string, unknown>): void;
  update(ref: DocRef, data: Record<string, unknown>): void;
}

export interface InitialStockRecoveryConsumptionDb {
  collection(name: 'users'): {
    doc(uid: string): DocRef;
  };
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'stockCounts'): { doc(id: string): DocRef };
      collection(name: 'voidRecords'): { doc(id: string): DocRef };
      collection(name: 'initialStockRecoveryAuthorization'): { doc(id: 'current'): DocRef };
    };
  };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

export interface ServerTimestamp {
  toMillis(): number;
}

export interface TimestampFactory {
  now(): ServerTimestamp;
}

export type ConsumeAuthorizationOutcome =
  | {
      outcome: 'consumed';
      businessId: string;
      targetStockCountId: string;
      authorizationAuthorizedAt: ServerTimestamp;
      authorizationJustification: string;
    }
  | { outcome: 'missing-target'; message: string }
  | { outcome: 'requester-not-found'; message: string }
  | { outcome: 'not-owner'; message: string }
  | { outcome: 'target-not-found'; message: string }
  | { outcome: 'target-not-initial-type'; message: string }
  | { outcome: 'target-not-current'; message: string }
  | { outcome: 'target-at-ceiling'; message: string }
  | { outcome: 'no-active-authorization'; message: string }
  | { outcome: 'authorization-mismatch'; message: string }
  | { outcome: 'authorization-expired'; message: string }
  | { outcome: 'already-consumed'; consumed: true; businessId: string; targetStockCountId: string };

/**
 * Verifies, server-side, that requesterUid resolves to the Owner/Admin
 * (POL-0009 Rule Q/N; matches firestore.rules' own isOwnerOf() exactly:
 * role owner-or-admin, businessId in the requester's own ownedBusinessIds)
 * of businessId — never a Manager, Staff, or Owner of a DIFFERENT
 * business. Mirrors the existing verifyStaffManagementAction()'s own
 * isAdmin resolution (server/index.ts) so this capability's notion of
 * "Owner" is identical to, not a second definition of, the one this
 * codebase already establishes.
 */
async function resolveIsOwnerOfBusiness(
  db: InitialStockRecoveryConsumptionDb,
  requesterUid: string,
  businessId: string
): Promise<'not-found' | 'not-owner' | 'owner'> {
  const requesterSnap = await db.collection('users').doc(requesterUid).get();
  if (!requesterSnap.exists) return 'not-found';
  const profile = requesterSnap.data() ?? {};
  const ownedBusinessIds: string[] =
    Array.isArray(profile.businessIds) && (profile.businessIds as string[]).length > 0
      ? (profile.businessIds as string[])
      : profile.businessId
        ? [profile.businessId as string]
        : [];
  const isOwner = (profile.role === 'owner' || profile.role === 'admin') && ownedBusinessIds.includes(businessId);
  return isOwner ? 'owner' : 'not-owner';
}

/**
 * Consumes a valid SuperAdmin-Assisted Initial Stock Recovery
 * Authorization on the Owner's behalf, server-mediated (the Owner
 * remains the sole actor and decision-maker — this function is an
 * authenticated proxy, never a second authorization decision,
 * Amendment §7).
 *
 * Enforces, in the exact order the Supplementary Authorization §2
 * item 3 / Amendment §3 specify, ALL inside one Firestore transaction:
 * authenticated Owner (caller resolved as Owner of businessId);
 * current confirmation (target exists, type 'initial', no existing
 * voidRecords entry); a valid Authorization naming this exact target;
 * unexpired (48h) Authorization; not-already-consumed Authorization;
 * chainPosition !== 4 (Confirmation #4 ceiling, legacy defaults to 1).
 *
 * NEVER writes stockCounts (original immutability) and NEVER
 * fabricates/backfills confirmedAt or chainPosition on the target.
 */
export async function consumeInitialStockRecoveryAuthorization(
  db: InitialStockRecoveryConsumptionDb,
  clock: TimestampFactory,
  params: { requesterUid: string; businessId: string; targetStockCountId: string }
): Promise<ConsumeAuthorizationOutcome> {
  const { requesterUid, businessId, targetStockCountId } = params;

  if (!targetStockCountId || !targetStockCountId.trim()) {
    return { outcome: 'missing-target', message: 'É obrigatório indicar a confirmação a recuperar.' };
  }

  // [Amendment §3 step 1/2] Authenticated Owner + business ownership —
  // checked BEFORE any recovery-specific read, so an unauthorized
  // caller learns nothing about the business's recovery state.
  const ownership = await resolveIsOwnerOfBusiness(db, requesterUid, businessId);
  if (ownership === 'not-found') {
    return { outcome: 'requester-not-found', message: 'Perfil do utilizador não encontrado.' };
  }
  if (ownership === 'not-owner') {
    return { outcome: 'not-owner', message: 'Apenas o dono do negócio pode executar esta recuperação.' };
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const targetRef = businessRef.collection('stockCounts').doc(targetStockCountId);
  const voidRecordRef = businessRef.collection('voidRecords').doc(targetStockCountId);
  const authorizationRef = businessRef.collection('initialStockRecoveryAuthorization').doc('current');

  return db.runTransaction(async (tx) => {
    const [targetSnap, voidRecordSnap, authorizationSnap] = await Promise.all([
      tx.get(targetRef),
      tx.get(voidRecordRef),
      tx.get(authorizationRef),
    ]);

    // [Amendment §3 step 3] Current confirmation.
    if (!targetSnap.exists) {
      return { outcome: 'target-not-found', message: 'A confirmação de Capital Inicial indicada não existe.' };
    }
    const target = targetSnap.data() ?? {};
    if (target.type !== 'initial') {
      return { outcome: 'target-not-initial-type', message: 'Só é possível recuperar a Contagem Inicial de Stock.' };
    }

    // [Amendment §5 — idempotency, corrected] Checked BEFORE the
    // voidRecords-existence ("current confirmation") check, not after:
    // a successful prior consumption of THIS SAME Authorization already
    // created this exact voidRecords document — so, on a retry (e.g.
    // after the transaction committed but the audit write failed), the
    // target is now genuinely, expectedly no longer "current," and
    // must NOT be reported as the ordinary target-not-current error.
    // Checking Authorization status first means a safe retry is
    // recognized as "already done" rather than misreported as a fresh
    // ineligibility, regardless of what voidRecordSnap says.
    if (authorizationSnap.exists) {
      const existingAuthorization = authorizationSnap.data() ?? {};
      if (existingAuthorization.targetStockCountId === targetStockCountId && existingAuthorization.status === 'consumed') {
        return { outcome: 'already-consumed', consumed: true, businessId, targetStockCountId };
      }
    }

    if (voidRecordSnap.exists) {
      return { outcome: 'target-not-current', message: 'Esta confirmação já foi anulada e substituída — não é a confirmação atual do negócio.' };
    }

    // [Amendment §3 step 7; Supplementary Authorization Acceptance
    // Criterion 4] Confirmation #4 ceiling — legacy target (no
    // chainPosition field) defaults to 1, never excluded here.
    const chainPosition = typeof target.chainPosition === 'number' ? target.chainPosition : 1;
    if (chainPosition === 4) {
      return { outcome: 'target-at-ceiling', message: 'Esta confirmação atingiu o limite de recuperações (Confirmação #4) e não pode ser anulada.' };
    }

    // [Amendment §3 step 4] Valid Authorization naming this exact target.
    if (!authorizationSnap.exists) {
      return { outcome: 'no-active-authorization', message: 'Não existe nenhuma autorização de recuperação para este negócio.' };
    }
    const authorization = authorizationSnap.data() ?? {};
    if (authorization.targetStockCountId !== targetStockCountId) {
      return { outcome: 'authorization-mismatch', message: 'A autorização existente não corresponde a esta confirmação.' };
    }

    // [Amendment §3 step 6] One-time consumption — an already-consumed
    // Authorization returns a distinct, non-error outcome (idempotency;
    // Amendment §5) rather than a fresh failure, so a safe retry after
    // a prior partial success (transaction committed, audit write
    // failed) never appears to the Owner as a new error.
    if (authorization.status === 'consumed') {
      return { outcome: 'already-consumed', consumed: true, businessId, targetStockCountId };
    }

    // [Amendment §3 step 5] 48-hour expiry — server clock only.
    const expiresAt = authorization.expiresAt as ServerTimestamp | undefined;
    const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
    if (clock.now().toMillis() >= expiresAtMs) {
      return { outcome: 'authorization-expired', message: 'A autorização de recuperação expirou.' };
    }

    // [Amendment §3 step 8] Atomic: VoidRecord creation + Authorization
    // consumed transition, together, in this same transaction. NEVER
    // writes stockCounts. NEVER writes confirmedAt/chainPosition
    // anywhere in this function.
    tx.create(voidRecordRef, {
      id: targetStockCountId,
      voidedConfirmationId: targetStockCountId,
      voidedAt: clock.now(),
    });
    tx.update(authorizationRef, {
      status: 'consumed',
      consumedAt: clock.now(),
    });

    return {
      outcome: 'consumed',
      businessId,
      targetStockCountId,
      authorizationAuthorizedAt: authorization.authorizedAt as ServerTimestamp,
      authorizationJustification: String(authorization.justification ?? ''),
    };
  });
}
