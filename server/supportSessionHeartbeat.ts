// SuperAdmin Agent Attended Support Session — Checkpoint 3: bidirectional
// heartbeat and reconnection.
//
// Governing chain: identical to server/supportSessionConsumption.ts's own
// header — BDR-0018 -> Policy -> Specification (SPEC-1/2/3) -> Rule 8
// (CLOSED / PASS, 312f64c) -> Implementation Authorization (Signed,
// 2026-09-11, covers this checkpoint at §3 item 4) -> this Checkpoint.
//
// SCOPE (Specification §21, FR-54 as amended-FR-62; Invariants I-10,
// I-11): this module's write surface is EXACTLY one document per call —
// the existing businesses/{businessId}/supportSessions/{sessionId}
// document Checkpoint 2 already creates (update only, never create).
// It never writes supportSessionInvitation, never writes any tenant-
// owned collection (FR-43), and never creates a second Session.
//
// LAZY TRANSITION DISCIPLINE (mirrors supportSessionConsumption.ts's own
// Invitation-expiry precedent exactly — see that file's "isExpired"
// handling): there is no scheduled/background job in this checkpoint.
// Every state transition (active -> reconnecting, reconnecting -> active,
// reconnecting -> ended [abandonment], active/reconnecting -> ended
// [natural 60-minute completion]) is discovered and applied the next
// time EITHER participant's heartbeat touches this document — the
// window itself (FR-55's 30-second lapse, FR-57's 2-minute grace,
// FR-17/I-11's 60-minute cap) is authoritative regardless of whether a
// heartbeat happens to arrive exactly at the boundary. This is the
// identical "lazily transition when discovered" pattern
// consumeSupportSessionInvitationCode already established for
// Invitation.expiresAt, applied here to Session.expiresAt/graceExpiresAt
// — not a new mechanism.
//
// RACE HANDLING (Rule 8 Finding 11-B): a heartbeat that finds the
// Session already 'ended' (by explicit termination or a prior
// heartbeat's own abandonment/completion transition) simply no-ops —
// returns 'already-ended', performs no write, never errors, and never
// resurrects the Session. This is the accepted
// last-write-wins-with-status-check behavior, not a new conflict-
// resolution model.
//
// IDENTITY (I-12's discipline, applied server-side, not only in
// firestore.rules): an operator's own heartbeat is accepted only if the
// calling operatorUid matches the Session's own operatorUid field —
// mirrors isActiveSupportOperatorForSession()'s own operatorUid check.
// The customer's heartbeat uses the same tenant-membership authorization
// server/index.ts's generate-code route already requires (isMemberOf-
// equivalent, verified by the caller before this module is invoked) —
// this module itself trusts its caller for that check, exactly as
// consumeSupportSessionInvitationCode trusts its caller for
// operatorUid's own eligibility (requireSupportEligibleOperator).
//
// NEVER-YET-HEARTBEATED BASELINE (implementation-detail interpretation,
// not a new business rule — the Specification's FR-54/FR-55 do not
// address a participant who has not yet sent a first heartbeat):
// lastHeartbeatAt/lastOperatorHeartbeatAt are null at establishment
// (Checkpoint 2). A null timestamp is treated as "not yet lapsed" until
// FR-55's own 30-second window has elapsed since establishedAt — this
// avoids forcing a freshly-established Session into 'reconnecting'
// before either participant has had a chance to send their first
// heartbeat, while still applying the identical 30-second rule FR-55
// already fixes, just anchored to establishedAt instead of a heartbeat
// that has not happened yet.

interface ServerTimestampLike {
  toMillis(): number;
}

interface SessionDocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface SessionDocRef {
  get(): Promise<SessionDocSnap>;
}

interface Transaction {
  get(ref: SessionDocRef): Promise<SessionDocSnap>;
  update(ref: SessionDocRef, data: Record<string, unknown>): void;
}

export interface SupportSessionHeartbeatDb {
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'supportSessions'): {
        doc(sessionId: string): SessionDocRef;
      };
    };
  };
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

export interface ServerTimestamp extends ServerTimestampLike {}

export interface TimestampFactory {
  now(): ServerTimestamp;
  fromMillis(ms: number): ServerTimestamp;
}

/** FR-55: a participant is considered lapsed once 30 seconds pass with no heartbeat. */
export const HEARTBEAT_LAPSE_MS = 30 * 1000;

/** FR-57: 2 minutes from the last successful heartbeat, never extending past FR-17/I-11's 60-minute cap. */
export const RECONNECT_GRACE_MS = 2 * 60 * 1000;

export type SupportSessionParticipant = 'customer' | 'operator';

export type RecordHeartbeatOutcome =
  | { outcome: 'active'; recoveredFromReconnecting: boolean }
  | { outcome: 'reconnecting'; graceExpiresAt: ServerTimestamp }
  | { outcome: 'ended-abandonment'; endedAt: ServerTimestamp }
  | { outcome: 'ended-completed'; endedAt: ServerTimestamp }
  | { outcome: 'already-ended'; message: string }
  | { outcome: 'session-not-found'; message: string }
  | { outcome: 'operator-mismatch'; message: string };

function toMillisOrNull(ts: unknown): number | null {
  if (ts && typeof (ts as ServerTimestampLike).toMillis === 'function') {
    return (ts as ServerTimestampLike).toMillis();
  }
  return null;
}

/**
 * Records one heartbeat from one participant and applies whatever
 * connectivity-status transition the Specification's own rules require
 * as a result (§21, FR-54 as amended-FR-61). Called on every periodic
 * heartbeat POST from either the customer's or the Support operator's
 * own browser — never on any other event.
 */
export async function recordSupportSessionHeartbeat(
  db: SupportSessionHeartbeatDb,
  clock: TimestampFactory,
  params: {
    businessId: string;
    sessionId: string;
    participant: SupportSessionParticipant;
    operatorUid?: string;
  }
): Promise<RecordHeartbeatOutcome> {
  const { businessId, sessionId, participant, operatorUid } = params;

  const sessionRef = db.collection('businesses').doc(businessId).collection('supportSessions').doc(sessionId);

  return db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);

    if (!sessionSnap.exists) {
      return { outcome: 'session-not-found', message: 'Esta sessão de suporte não existe.' };
    }

    const session = sessionSnap.data() ?? {};
    const status = session.status as string | undefined;

    // [Rule 8 Finding 11-B] A heartbeat that finds the Session already
    // ended (explicit termination, FR-34/FR-35 — or a prior heartbeat's
    // own lazy abandonment/completion transition) simply no-ops. No
    // write, no error, never resurrects the Session (FR-61).
    if (status === 'ended') {
      return { outcome: 'already-ended', message: 'Esta sessão de suporte já terminou.' };
    }

    // [I-12, applied server-side] An operator's own heartbeat is bound
    // to the exact operatorUid this Session names — never accepted from
    // a different operator, mirroring isActiveSupportOperatorForSession's
    // own rules-layer check.
    if (participant === 'operator' && session.operatorUid !== operatorUid) {
      return { outcome: 'operator-mismatch', message: 'Este operador não corresponde ao operador desta sessão.' };
    }

    const nowMs = clock.now().toMillis();
    const expiresAtMs = toMillisOrNull(session.expiresAt) ?? 0;

    // [FR-61, I-11 — natural 60-minute completion] Lazily discovered,
    // identical in kind to the Invitation-expiry precedent. Fires
    // regardless of current status (active or reconnecting) — the
    // 60-minute cap is absolute and unaffected by connectivity state
    // (I-11: "under any circumstance").
    if (nowMs >= expiresAtMs) {
      const endedAt = clock.now();
      tx.update(sessionRef, { status: 'ended', endedAt, endedBy: 'completed', graceExpiresAt: null });
      return { outcome: 'ended-completed', endedAt };
    }

    const establishedAtMs = toMillisOrNull(session.establishedAt) ?? nowMs;

    // [FR-54] Record this participant's own heartbeat — never the
    // other's. Both fields are tracked and evaluated independently.
    const updates: Record<string, unknown> = {};
    if (participant === 'customer') {
      updates.lastHeartbeatAt = clock.now();
    } else {
      updates.lastOperatorHeartbeatAt = clock.now();
    }

    // [FR-55] Freshness of BOTH participants, post this update. A
    // participant who has never yet heartbeated is treated as fresh
    // until 30 seconds have passed since establishedAt (see this file's
    // own header note) — not immediately lapsed merely for not having
    // sent a first heartbeat yet.
    const lastHeartbeatAtMs = participant === 'customer' ? nowMs : toMillisOrNull(session.lastHeartbeatAt);
    const lastOperatorHeartbeatAtMs = participant === 'operator' ? nowMs : toMillisOrNull(session.lastOperatorHeartbeatAt);

    const customerBaselineMs = lastHeartbeatAtMs ?? establishedAtMs;
    const operatorBaselineMs = lastOperatorHeartbeatAtMs ?? establishedAtMs;

    const customerLapsed = nowMs - customerBaselineMs >= HEARTBEAT_LAPSE_MS;
    const operatorLapsed = nowMs - operatorBaselineMs >= HEARTBEAT_LAPSE_MS;
    const anyLapsed = customerLapsed || operatorLapsed;

    if (!anyLapsed) {
      // [FR-56] Both participants fresh. If we were 'reconnecting',
      // this is the recovery case — return directly to 'active',
      // clearing graceExpiresAt, never touching establishedAt/expiresAt
      // or any other authorization-bearing field.
      if (status === 'reconnecting') {
        updates.status = 'active';
        updates.graceExpiresAt = null;
        tx.update(sessionRef, updates);
        return { outcome: 'active', recoveredFromReconnecting: true };
      }
      tx.update(sessionRef, updates);
      return { outcome: 'active', recoveredFromReconnecting: false };
    }

    // At least one participant is lapsed.
    if (status === 'active') {
      // [FR-55] First detected lapse — transition into 'reconnecting',
      // never straight to 'ended'. Session's own status field remains
      // observable as having moved off 'active'; expiresAt is
      // completely unchanged (I-11).
      const graceExpiresAtMs = Math.min(nowMs + RECONNECT_GRACE_MS, expiresAtMs);
      const graceExpiresAt = clock.fromMillis(graceExpiresAtMs);
      updates.status = 'reconnecting';
      updates.graceExpiresAt = graceExpiresAt;
      tx.update(sessionRef, updates);
      return { outcome: 'reconnecting', graceExpiresAt };
    }

    // status === 'reconnecting' already — evaluate the grace deadline.
    // [FR-57] Capped so the grace period can never push the Session
    // past its own 60-minute expiresAt.
    const existingGraceExpiresAtMs = toMillisOrNull(session.graceExpiresAt) ?? Math.min(nowMs + RECONNECT_GRACE_MS, expiresAtMs);
    const effectiveDeadlineMs = Math.min(existingGraceExpiresAtMs, expiresAtMs);

    if (nowMs >= effectiveDeadlineMs) {
      // [FR-58] Grace period elapsed without both participants
      // recovering — genuinely abandoned, not merely a transient blip.
      const endedAt = clock.now();
      tx.update(sessionRef, { ...updates, status: 'ended', endedAt, endedBy: 'abandonment', graceExpiresAt: null });
      return { outcome: 'ended-abandonment', endedAt };
    }

    // Still within grace, still lapsed — remain 'reconnecting'.
    tx.update(sessionRef, updates);
    return { outcome: 'reconnecting', graceExpiresAt: clock.fromMillis(existingGraceExpiresAtMs) };
  });
}
