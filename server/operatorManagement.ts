// SuperAdmin V1 Operational Control Plane — Phase A: Internal Account
// Management business/authorization logic.
//
// Extracted into its own importable module for exactly the reason
// server/paymentConfirmation.ts already is: server/index.ts calls
// initializeApp({credential: cert(...)}) at module load time, which
// requires real Firebase Admin credentials — no test in this repository
// imports server/index.ts directly for that reason (see
// tests/superadmin-payment-operations.test.ts's own header). Every
// existing privileged-server suite instead tests the underlying pure
// module the route calls, not the route itself. This file follows that
// established convention rather than introducing a new one — the same
// "operator logic lives here, the Express route in server/index.ts is a
// thin wrapper" shape already proven by paymentConfirmation.ts,
// superadminAuth.ts, and platformAuditLog.ts.
//
// Governing chain: ADR-0006, docs/specs/18-superadmin-v1-operational-control-plane-slice.md
// BR-2 (no self-escalation — an operator can never provision or revoke
// using their own uid as the target), BR-3 (an operator cannot be
// revoked if doing so would leave zero active 'superadmin' records,
// computed from a fresh Firestore read at request time, never cached or
// client-supplied).
//
// Scope: Phase A only. This module never writes platform_audit_log
// itself — the caller (server/index.ts's route) does that via the
// existing writeAuditLogEntry() primitive, exactly as the Payment
// Operations routes already do; this module stays symmetric with
// paymentConfirmation.ts, which also never writes audit entries itself.

import type { PlatformRole } from '../packages/shared-types';

const VALID_PLATFORM_ROLES: readonly PlatformRole[] = ['support', 'developer', 'superadmin'];

interface OperatorDocSnapshot {
  exists: boolean;
  data(): { platformRole?: string } | undefined;
}

interface OperatorQueryDocSnapshot {
  id: string;
  data(): { platformRole?: string } | undefined;
}

export interface OperatorsCollection {
  collection(name: 'platform_operators'): {
    doc(uid: string): {
      get(): Promise<OperatorDocSnapshot>;
      set(data: { platformRole: PlatformRole }): Promise<unknown>;
      delete(): Promise<unknown>;
    };
    get(): Promise<{ docs: OperatorQueryDocSnapshot[] }>;
  };
}

export interface OperatorRecord {
  uid: string;
  platformRole: PlatformRole;
}

export type ProvisionOperatorResult =
  | { outcome: 'provisioned'; uid: string; platformRole: PlatformRole }
  | { outcome: 'invalid-argument'; message: string }
  | { outcome: 'self-target'; message: string };

export type RevokeOperatorResult =
  | { outcome: 'revoked'; uid: string; platformRole: PlatformRole | null }
  | { outcome: 'not-found'; message: string }
  | { outcome: 'self-target'; message: string }
  | { outcome: 'last-superadmin'; message: string };

/**
 * FR-A1. BR-2: rejects targetUid === requesterUid — provisioning always
 * targets a different account than the caller's own. Validates
 * platformRole against the same three-value union superadminAuth.ts
 * already enforces on read, so an invalid value can never be written in
 * the first place.
 */
export async function provisionOperator(
  db: OperatorsCollection,
  params: { targetUid: string; platformRole: string; requesterUid: string }
): Promise<ProvisionOperatorResult> {
  const { targetUid, platformRole, requesterUid } = params;

  if (!targetUid || typeof targetUid !== 'string') {
    return { outcome: 'invalid-argument', message: 'uid é obrigatório.' };
  }
  if (!VALID_PLATFORM_ROLES.includes(platformRole as PlatformRole)) {
    return { outcome: 'invalid-argument', message: 'platformRole inválido.' };
  }
  if (targetUid === requesterUid) {
    return { outcome: 'self-target', message: 'Não pode conceder acesso de operador a si mesmo.' };
  }

  await db.collection('platform_operators').doc(targetUid).set({ platformRole: platformRole as PlatformRole });

  return { outcome: 'provisioned', uid: targetUid, platformRole: platformRole as PlatformRole };
}

/**
 * FR-A2. BR-2: rejects targetUid === requesterUid — an operator can
 * never revoke their own access through this path. BR-3: if the target
 * is a 'superadmin', counts currently-active 'superadmin' records via a
 * fresh read of the whole collection at request time (never cached,
 * never derived from any client-supplied count) and rejects if the
 * target is the last one.
 */
export async function revokeOperator(
  db: OperatorsCollection,
  params: { targetUid: string; requesterUid: string }
): Promise<RevokeOperatorResult> {
  const { targetUid, requesterUid } = params;

  if (targetUid === requesterUid) {
    return { outcome: 'self-target', message: 'Não pode revogar o seu próprio acesso de operador.' };
  }

  const targetSnap = await db.collection('platform_operators').doc(targetUid).get();
  if (!targetSnap.exists) {
    return { outcome: 'not-found', message: 'Operador não encontrado.' };
  }
  const targetRole = targetSnap.data()?.platformRole as PlatformRole | undefined;

  if (targetRole === 'superadmin') {
    const listSnap = await db.collection('platform_operators').get();
    const activeSuperAdmins = listSnap.docs.filter((d) => d.data()?.platformRole === 'superadmin');
    if (activeSuperAdmins.length <= 1) {
      return { outcome: 'last-superadmin', message: 'Não é possível revogar o último SuperAdmin ativo.' };
    }
  }

  await db.collection('platform_operators').doc(targetUid).delete();

  return { outcome: 'revoked', uid: targetUid, platformRole: targetRole ?? null };
}

/**
 * FR-A3. Read-only — no audit entry is written for a plain list read,
 * matching the existing GET /api/superadmin/payments/pending route,
 * which also doesn't audit its own read. Records with a missing or
 * invalid platformRole are silently excluded rather than surfaced as
 * malformed, since a hand-edited or partially-migrated document should
 * never crash this screen — the same defensive posture
 * requirePlatformOperator already takes on read.
 */
export async function listOperators(db: OperatorsCollection): Promise<OperatorRecord[]> {
  const snap = await db.collection('platform_operators').get();
  return snap.docs
    .map((d) => ({ uid: d.id, platformRole: d.data()?.platformRole as PlatformRole | undefined }))
    .filter((o): o is OperatorRecord => !!o.platformRole && VALID_PLATFORM_ROLES.includes(o.platformRole));
}
