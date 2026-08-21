// SuperAdmin Payment Operations V1 Launch Slice — the platform Audit Log
// write primitive (Architecture §7.4, schema fixed by §9.6; BDS BR-6
// "audit is structurally required, not optional").
//
// One function, reused by every audited platform-operator action this
// slice adds (payment.confirmed, payment.rejected) — matching this
// codebase's existing "one primitive, reused" convention (see
// server/alerting.ts's own header, Fix #8). A future slice adding more
// audited actions (support_session.issued, business.suspended, etc.,
// per §9.6's full action-type list) reuses this same function rather
// than inlining another write site.
//
// ATOMICITY (Rule 8 Assessment §"Audit Atomicity", flagged explicitly
// per the implementation prompt's own instruction not to quietly
// downgrade BR-6): this write is NOT in the same Firestore transaction
// as confirmPayment()/rejectPayment()'s own transaction. Two genuine
// constraints prevent that without changing the existing, tested
// payment-confirmation engine:
//   1. Firestore's Admin SDK does not support nested transactions —
//      confirmPayment()/rejectPayment() already run their own
//      (paymentConfirmation.ts's own header documents this same
//      constraint for its relationship with the Subscription Lifecycle
//      Engine's transaction). Folding a third write into that existing
//      transaction would mean modifying paymentConfirmation.ts's own
//      transaction body — exactly the "duplicate/modify the existing
//      engine" this slice's BR-1 forbids.
//   2. The audit entry's own actorUid/actorRole must reflect
//      information (the caller's platform_operators role) that has
//      nothing to do with the Payment document's own transaction and
//      does not need to be read inside it.
// The call sites in server/index.ts therefore write the audit entry as
// a separate step immediately after confirmPayment()/rejectPayment()
// returns a definite outcome ('confirmed' or 'rejected') — not
// speculatively before, and only for an outcome that actually changed
// state (an idempotent 'already-confirmed'/'already-rejected' replay
// does not produce a second audit entry for the same action, since no
// new action actually occurred). This mirrors paymentConfirmation.ts's
// own two-step, idempotent-by-construction design for exactly the same
// reason it uses there: re-running the whole route handler after a
// partial failure (payment transitioned, audit write failed) is always
// safe — the payment-transition step is a no-op on retry, and the
// audit write is retried until it succeeds, without ever producing two
// audit entries for one real action.
//
// This is a real limitation, stated plainly rather than downgraded:
// there is a narrow window where a payment has been confirmed/rejected
// but the audit entry has not yet been written (network blip between
// the two steps). BDS §9's "Every write... goes through the privileged
// server" already means no client-observable state exists in that
// window (the response to the SuperAdmin's browser is only sent after
// this module's write below settles or definitively fails), and
// FR-9/the test suite (superadmin-payment-operations.test.ts) proves
// the failure is reported to the caller as a partial outcome, not
// silently swallowed — consistent with this codebase's existing
// partial-failure pattern (server/index.ts's staff endpoints,
// HANDOFF.md "Backend reliability — staff endpoints").

import type { PlatformAuditLogEntry, PlatformRole } from '../packages/shared-types';

interface AuditLogCollection {
  collection(name: 'platform_audit_log'): {
    doc(): { id: string };
    doc(id: string): { set(data: Record<string, unknown>): Promise<unknown> };
  };
}

export type WriteAuditLogEntryParams = Omit<PlatformAuditLogEntry, 'id' | 'timestamp'>;

/**
 * Writes one platform_audit_log entry. Server timestamp, not
 * client-supplied (§9.6's schema requirement) — this module always
 * sets `timestamp` itself from `new Date().toISOString()` at the
 * moment of the call, ignoring any timestamp the caller might pass.
 * Throws on failure — callers decide how to surface that (see this
 * file's header re: atomicity), never swallows it silently.
 */
export async function writeAuditLogEntry(
  db: AuditLogCollection,
  entry: WriteAuditLogEntryParams
): Promise<{ id: string }> {
  const ref = db.collection('platform_audit_log').doc();
  const id = ref.id;
  const timestamp = new Date().toISOString();

  await db
    .collection('platform_audit_log')
    .doc(id)
    .set({
      id,
      actorUid: entry.actorUid,
      actorRole: entry.actorRole,
      actionType: entry.actionType,
      ...(entry.targetBusinessId !== undefined ? { targetBusinessId: entry.targetBusinessId } : {}),
      ...(entry.targetUid !== undefined ? { targetUid: entry.targetUid } : {}),
      ...(entry.targetStockCountId !== undefined ? { targetStockCountId: entry.targetStockCountId } : {}),
      ...(entry.authorizationId !== undefined ? { authorizationId: entry.authorizationId } : {}),
      ...(entry.justification !== undefined ? { justification: entry.justification } : {}),
      timestamp,
    });

  return { id };
}
