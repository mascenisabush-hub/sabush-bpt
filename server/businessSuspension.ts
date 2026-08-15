// SuperAdmin V1 Operational Control Plane — Phase C: Business
// Suspend/Reactivate business/authorization logic.
//
// Same extraction rationale as server/operatorManagement.ts (Phase A)
// and server/businessVisibility.ts (Phase B): server/index.ts cannot be
// imported by any test (it calls initializeApp({credential: cert(...)})
// at module load, requiring real Firebase Admin credentials), so
// business/authorization logic lives in its own importable module and
// the Express route in server/index.ts stays a thin wrapper.
//
// Governing chain: ADR-0006; Architecture Gap Resolutions — Gap 1
// CONFIRMED (suspended?: boolean on businesses/{businessId}, missing
// means not-suspended, isBusinessSuspended() folded into isMemberOf(),
// field-protected against tenant self-modification, exclusively
// server/Admin-SDK-writable, non-destructive/reversible, no Firebase
// Auth disable, no subscription/payment mutation); the Phase C
// Pre-Implementation Verification (idempotency — CONFIRMED Option B:
// a repeated identical state transition is rejected with a controlled
// error, never a silent no-op, so "exactly one audit entry per
// accepted mutation" holds by construction, not by careful outcome-
// classification).
//
// Scope: Phase C only. This module never writes platform_audit_log
// itself — the caller (server/index.ts's route) does that via the
// existing writeAuditLogEntry() primitive, exactly as Phase A/B's
// modules already do. Never touches subscriptions/*, payments/*, or
// any Firebase Auth account.

interface DocSnap {
  exists: boolean;
  data(): { suspended?: boolean } | undefined;
}

export interface BusinessSuspensionDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      get(): Promise<DocSnap>;
      update(data: { suspended: boolean }): Promise<unknown>;
    };
  };
}

export type SuspendBusinessResult =
  | { outcome: 'suspended'; businessId: string }
  | { outcome: 'missing-justification'; message: string }
  | { outcome: 'not-found'; message: string }
  | { outcome: 'already-suspended'; message: string };

export type ReactivateBusinessResult =
  | { outcome: 'reactivated'; businessId: string }
  | { outcome: 'missing-justification'; message: string }
  | { outcome: 'not-found'; message: string }
  | { outcome: 'already-active'; message: string };

/**
 * Requirement 6 (Suspend route). Validates justification first (no
 * read happens for an invalid request). Verifies the business exists.
 * Idempotency — CONFIRMED Option B: an already-suspended business
 * returns 'already-suspended' (maps to HTTP 409 in the route) — no
 * write, no audit entry. Otherwise performs exactly one minimal
 * partial update (`.update({ suspended: true })`, never a full-
 * document overwrite, per the approved design).
 */
export async function suspendBusiness(
  db: BusinessSuspensionDb,
  businessId: string,
  justification: string
): Promise<SuspendBusinessResult> {
  if (!justification || !justification.trim()) {
    return { outcome: 'missing-justification', message: 'É obrigatório indicar uma justificação.' };
  }

  const snap = await db.collection('businesses').doc(businessId).get();
  if (!snap.exists) {
    return { outcome: 'not-found', message: 'Negócio não encontrado.' };
  }

  if (snap.data()?.suspended === true) {
    return { outcome: 'already-suspended', message: 'Este negócio já está suspenso.' };
  }

  await db.collection('businesses').doc(businessId).update({ suspended: true });

  return { outcome: 'suspended', businessId };
}

/**
 * Requirement 7 (Reactivate route). Same shape as suspendBusiness(),
 * mirrored. Idempotency — CONFIRMED Option B: a business that is not
 * currently suspended (suspended missing or false) returns
 * 'already-active' — no write, no audit entry.
 */
export async function reactivateBusiness(
  db: BusinessSuspensionDb,
  businessId: string,
  justification: string
): Promise<ReactivateBusinessResult> {
  if (!justification || !justification.trim()) {
    return { outcome: 'missing-justification', message: 'É obrigatório indicar uma justificação.' };
  }

  const snap = await db.collection('businesses').doc(businessId).get();
  if (!snap.exists) {
    return { outcome: 'not-found', message: 'Negócio não encontrado.' };
  }

  if (snap.data()?.suspended !== true) {
    return { outcome: 'already-active', message: 'Este negócio já está ativo.' };
  }

  await db.collection('businesses').doc(businessId).update({ suspended: false });

  return { outcome: 'reactivated', businessId };
}
