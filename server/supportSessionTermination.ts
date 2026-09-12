// SuperAdmin Agent Attended Support Session — Checkpoint 7: customer
// transparency and session termination (server mechanism).
//
// Governing chain: identical to server/supportSessionHeartbeat.ts's own
// header — BDR-0018 -> Policy (Rule Q/R/S/T) -> Specification
// (FR-31-FR-36, Sections 14-15) -> Rule 8 (CLOSED / PASS, 312f64c) ->
// Implementation Authorization (Signed, 2026-09-11, covers this
// checkpoint at §3 item 10) -> this Checkpoint.
//
// SCOPE: this module's write surface is EXACTLY one document per call —
// the existing businesses/{businessId}/supportSessions/{sessionId}
// document (update only, never create) — identical in kind to
// supportSessionHeartbeat.ts's own write surface, deliberately NOT
// merged into that module (this checkpoint's own instruction: "Do not
// modify the existing heartbeat function to perform explicit
// termination"). Types are imported from supportSessionHeartbeat.ts
// (not redefined) purely to avoid duplicating identical structural
// interfaces — the heartbeat function itself is untouched.
//
// RACE HANDLING (Rule 8 Finding 11-B, reused — not reinvented): a
// termination request that finds the Session already 'ended' (by a
// prior explicit termination, or by the heartbeat module's own
// abandonment/completion transition) simply no-ops — returns
// 'already-ended', performs no write, never errors, never overwrites
// the original endedAt/endedBy, and never resurrects the Session.
//
// IDENTITY (I-12's discipline, applied server-side — identical
// discipline to the heartbeat module): an operator's own termination
// request is accepted only if the calling operatorUid matches the
// Session's own operatorUid field. The customer's termination request
// uses the same tenant-membership authorization the caller (server/
// index.ts's route) already verifies before this module is invoked —
// this module trusts its caller for that check, exactly as
// recordSupportSessionHeartbeat does for its own customer participant.
//
// FR-36 EFFECT: this module's own write (status: 'ended', endedAt,
// endedBy) is the ONLY thing Checkpoint 7 needs to do to trigger every
// other already-built reactive consumer (Checkpoint 5's Pointer
// overlay, Checkpoint 6's WebRTC capture/viewer, and the existing
// Support View State read-authorization boundary) — none of those are
// touched by this module or by this checkpoint.

import type { SupportSessionHeartbeatDb, ServerTimestamp, TimestampFactory, SupportSessionParticipant } from './supportSessionHeartbeat';

export type SupportSessionTerminationDb = SupportSessionHeartbeatDb;

export type RecordTerminationOutcome =
  | { outcome: 'ended'; endedAt: ServerTimestamp; endedBy: 'customer' | 'support' }
  | { outcome: 'already-ended'; message: string }
  | { outcome: 'session-not-found'; message: string }
  | { outcome: 'operator-mismatch'; message: string };

/**
 * Records an explicit, participant-triggered termination of a Support
 * Session (FR-34 for the customer, FR-35 for the Support operator).
 * Called only from a direct customer- or operator-initiated disconnect
 * action — never from a lazily-discovered timing condition (that
 * remains recordSupportSessionHeartbeat's own, separate responsibility
 * for natural completion/abandonment).
 */
export async function recordSupportSessionTermination(
  db: SupportSessionTerminationDb,
  clock: TimestampFactory,
  params: {
    businessId: string;
    sessionId: string;
    participant: SupportSessionParticipant;
    operatorUid?: string;
  }
): Promise<RecordTerminationOutcome> {
  const { businessId, sessionId, participant, operatorUid } = params;

  const sessionRef = db.collection('businesses').doc(businessId).collection('supportSessions').doc(sessionId);

  return db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);

    if (!sessionSnap.exists) {
      return { outcome: 'session-not-found', message: 'Esta sessão de suporte não existe.' };
    }

    const session = sessionSnap.data() ?? {};
    const status = session.status as string | undefined;

    // [Rule 8 Finding 11-B, reused] Already ended — no-op. Never
    // overwrites the original endedAt/endedBy, never errors, never
    // resurrects.
    if (status === 'ended') {
      return { outcome: 'already-ended', message: 'Esta sessão de suporte já terminou.' };
    }

    // [I-12, applied server-side] An operator's own termination request
    // is bound to the exact operatorUid this Session names.
    if (participant === 'operator' && session.operatorUid !== operatorUid) {
      return { outcome: 'operator-mismatch', message: 'Este operador não corresponde ao operador desta sessão.' };
    }

    // [FR-36] endedBy is derived exclusively from the server-verified
    // participant — never a client-supplied value of any kind.
    const endedBy: 'customer' | 'support' = participant === 'customer' ? 'customer' : 'support';
    const endedAt = clock.now();

    tx.update(sessionRef, { status: 'ended', endedAt, endedBy, graceExpiresAt: null });

    return { outcome: 'ended', endedAt, endedBy };
  });
}
