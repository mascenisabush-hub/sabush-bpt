// SuperAdmin Agent Attended Support Session — Checkpoint 2: code entry,
// atomic consumption, brute-force lockout, and Session establishment.
//
// Governing chain: identical to server/supportSessionInvitation.ts's
// own header — BDR-0018 -> Policy -> Specification (SPEC-1/2/3) ->
// Rule 8 (CLOSED / PASS, 312f64c) -> Implementation Authorization
// (Signed, 2026-09-11) -> this Checkpoint.
//
// Same extraction rationale as every server/*.ts module in this
// codebase — independently importable by tests, server/index.ts stays
// a thin wrapper deriving the authenticated operator identity from
// req.platformOperator.uid (Step 11 — NEVER from a client-supplied
// operatorUid field) before calling this module.
//
// SCOPE (Implementation Authorization §3 items 1-3): this module's
// write surface is EXACTLY two documents, both inside ONE Firestore
// transaction — businesses/{businessId}/supportSessionInvitation/current
// (status/failedAttempts/lockedAt/consumedByUid/consumedAt transitions
// only) and, on success only,
// businesses/{businessId}/supportSessions/{sessionId} (create). It
// NEVER writes any other tenant collection (FR-43).
//
// ATOMICITY (Rule 8 Finding 4-A/4-C; Checkpoint 2 prompt Step 5): runs
// inside a single Firestore transaction, mirroring
// consumeInitialStockRecoveryAuthorization's own shape — two
// simultaneous entry attempts against the same Invitation can never
// both succeed, since Firestore's own optimistic-concurrency control
// rejects whichever transaction re-reads a now-stale
// supportSessionInvitation/current document. This suite's own unit
// tests verify this module's precondition logic sequentially (the same
// "necessary but not sufficient" scope note
// superadmin-initial-stock-recovery-authorization.test.ts's header
// already discloses) — true concurrent-transaction safety additionally
// depends on Firestore's own transaction guarantees and is not,
// and cannot be, exercised without a live emulator/Firestore instance
// in this sandbox.
//
// CODE SECURITY (FR-4, Step 3): verification uses the exact same
// crypto.scrypt + crypto.timingSafeEqual shape as
// server/supportSessionInvitation.ts's generation side and the
// Clear-Data Password precedent — never a plain `===` comparison,
// which would leak timing information about a valid hash.
//
// SESSION IDENTITY (Checkpoint 2 prompt Step 8): sessionId is a
// Firestore-generated auto-id (matching this codebase's
// platform_audit_log doc-id convention) — never client-supplied, never
// derived from the code or Invitation id.

import crypto from 'crypto';

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface DocRef {
  get(): Promise<DocSnap>;
}

interface AutoIdDocRef {
  id: string;
}

interface Transaction {
  get(ref: DocRef): Promise<DocSnap>;
  update(ref: DocRef, data: Record<string, unknown>): void;
  create(ref: AutoIdDocRef, data: Record<string, unknown>): void;
}

export interface SupportSessionConsumptionDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'supportSessionInvitation'): {
        doc(docId: 'current'): DocRef;
      };
      collection(name: 'supportSessions'): {
        doc(): AutoIdDocRef;
      };
    };
  };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

export interface ServerTimestamp {
  toMillis(): number;
}

export interface TimestampFactory {
  now(): ServerTimestamp;
  fromMillis(ms: number): ServerTimestamp;
}

/** 5 failed attempts, per BDR-0018/Policy Rule G, Specification FR-14. */
export const LOCKOUT_MAX_ATTEMPTS = 5;

/** 60 minutes, per BDR-0018/Policy Rule I, Specification FR-17 (reusing Architecture §9.7's figure directly). */
export const SESSION_DURATION_MS = 60 * 60 * 1000;

export type ConsumeInvitationCodeOutcome =
  | {
      outcome: 'established';
      businessId: string;
      sessionId: string;
      operatorUid: string;
      customerUid: string | null;
      establishedAt: ServerTimestamp;
      expiresAt: ServerTimestamp;
    }
  | { outcome: 'no-active-invitation'; message: string }
  | { outcome: 'invitation-expired'; message: string }
  | { outcome: 'invitation-locked'; message: string }
  | { outcome: 'invitation-already-consumed'; message: string }
  | { outcome: 'invalid-code'; attemptsRemaining: number; message: string }
  | { outcome: 'locked-now'; message: string };

function verifyCodeHash(code: string, hash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(code, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

/**
 * Verifies an entered code against businessId's own Invitation only
 * (FR-9, FR-10, Rule K — never a bare cross-business code search: the
 * caller must already have identified the business, exactly as every
 * other /api/superadmin/* route requires businessId as an explicit,
 * server-re-verified parameter). On success, atomically transitions
 * the Invitation to 'consumed' and establishes a new Session bound to
 * this exact business and this exact operatorUid (FR-11, I-4, I-5) —
 * unbound to any prior relationship between operator and business
 * (FR-12, Rule H / CODE-2).
 *
 * On failure, increments the Invitation's own failedAttempts counter
 * (FR-13 — scoped to the Invitation, never the operator) and, on the
 * 5th failure, permanently locks it (FR-14) with no path back to
 * 'active' (FR-15) — a fresh Invitation requires an entirely new
 * customer-triggered generation (FR-16).
 */
export async function consumeSupportSessionInvitationCode(
  db: SupportSessionConsumptionDb,
  clock: TimestampFactory,
  params: { businessId: string; code: string; operatorUid: string }
): Promise<ConsumeInvitationCodeOutcome> {
  const { businessId, code, operatorUid } = params;

  const businessRef = db.collection('businesses').doc(businessId);
  const invitationRef = businessRef.collection('supportSessionInvitation').doc('current');

  return db.runTransaction(async (tx) => {
    const invitationSnap = await tx.get(invitationRef);

    if (!invitationSnap.exists) {
      return { outcome: 'no-active-invitation', message: 'Não existe nenhum código de sessão de suporte ativo para este negócio.' };
    }

    const invitation = invitationSnap.data() ?? {};
    const status = invitation.status as string | undefined;

    // [FR-15] A locked Invitation never transitions back to active,
    // and no further attempt — correct or incorrect — is even
    // evaluated against it. No write performed: it is already exactly
    // as locked as this attempt would leave it.
    if (status === 'locked') {
      return { outcome: 'invitation-locked', message: 'Este código foi bloqueado após demasiadas tentativas falhadas. É necessário gerar um novo código.' };
    }

    // [I-4] A consumed Invitation can never be consumed again, by
    // anyone — first eligible operator to succeed already established
    // the Session (FR-12); this is not an error the operator caused,
    // just a stale/already-used code.
    if (status === 'consumed') {
      return { outcome: 'invitation-already-consumed', message: 'Este código já foi utilizado para estabelecer uma sessão de suporte.' };
    }

    const expiresAt = invitation.expiresAt as ServerTimestamp | undefined;
    const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
    const isExpired = status === 'expired' || clock.now().toMillis() >= expiresAtMs;

    if (isExpired) {
      // [FR-6/FR-7] Lazily transition to 'expired' when discovered —
      // the window itself is authoritative regardless of whether any
      // attempt was ever made; this write just makes that fact visible
      // on the document for the next reader (e.g. the next generation
      // attempt, or an operator's own retry), never re-extends or
      // resets anything.
      if (status !== 'expired') {
        tx.update(invitationRef, { status: 'expired' });
      }
      return { outcome: 'invitation-expired', message: 'Este código expirou. É necessário gerar um novo código.' };
    }

    // Only remaining state per I-4 is 'active', unexpired, unlocked —
    // evaluate the entered code.
    const codeHash = String(invitation.codeHash ?? '');
    const codeSalt = String(invitation.codeSalt ?? '');
    const isValid = codeHash && codeSalt ? verifyCodeHash(code, codeHash, codeSalt) : false;

    if (isValid) {
      // [FR-11, I-4, I-5] Atomic within this same transaction: the
      // Invitation transitions to 'consumed' AND the Session is
      // created together — no window where one exists without the
      // other.
      tx.update(invitationRef, {
        status: 'consumed',
        consumedByUid: operatorUid,
        consumedAt: clock.now(),
      });

      const sessionRef = businessRef.collection('supportSessions').doc();
      const establishedAt = clock.now();
      const sessionExpiresAt = clock.fromMillis(establishedAt.toMillis() + SESSION_DURATION_MS);
      const customerUid = typeof invitation.generatedByUid === 'string' ? invitation.generatedByUid : null;

      tx.create(sessionRef, {
        businessId,
        operatorUid,
        customerUid,
        // [Checkpoint 2 prompt Step 8 — minimum required fields only;
        // renderingPath detection belongs to the Desktop/Mobile
        // rendering-path checkpoints, not this one] Left null here,
        // deliberately not invented.
        renderingPath: null,
        establishedAt,
        expiresAt: sessionExpiresAt,
        status: 'active',
        lastHeartbeatAt: null,
        lastOperatorHeartbeatAt: null,
        graceExpiresAt: null,
        endedAt: null,
        endedBy: null,
      });

      return {
        outcome: 'established',
        businessId,
        sessionId: sessionRef.id,
        operatorUid,
        customerUid,
        establishedAt,
        expiresAt: sessionExpiresAt,
      };
    }

    // [FR-13, FR-14] Failed attempt — increment the per-Invitation
    // counter; the 5th failure locks it permanently, atomically with
    // recording that failure.
    const failedAttempts = (typeof invitation.failedAttempts === 'number' ? invitation.failedAttempts : 0) + 1;

    if (failedAttempts >= LOCKOUT_MAX_ATTEMPTS) {
      tx.update(invitationRef, {
        failedAttempts,
        status: 'locked',
        lockedAt: clock.now(),
      });
      return { outcome: 'locked-now', message: 'Código incorreto. Número máximo de tentativas atingido — este código foi bloqueado. É necessário gerar um novo código.' };
    }

    tx.update(invitationRef, { failedAttempts });
    return {
      outcome: 'invalid-code',
      attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - failedAttempts,
      message: 'Código incorreto.',
    };
  });
}
