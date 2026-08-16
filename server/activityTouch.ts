// SuperAdmin V1 Operational Control Plane — Phase E: server-authoritative
// lastActivityAt maintenance.
//
// Governing chain: BDR-0010 Part 5 (the client-side logTimelineEvent()
// write was explicitly REJECTED, not refined — Staff have no write
// path to businesses/{businessId} today, and a client-supplied
// timestamp is untrusted); the Phase E implementation task's own
// mechanism decision (Product Architect, this session): a server-side,
// Admin-SDK-backed activity-touch mechanism, server-generated
// timestamp, no firestore.rules change, no client write path of any
// kind to this field.
//
// This module is called from a new tenant-facing (not SuperAdmin)
// route in server/index.ts — POST /api/business/touch-activity — which
// the client calls as a best-effort side effect after logTimelineEvent()
// succeeds. This module never throws to its caller in a way that
// should be treated as failing the underlying business action — per
// BDR-0010 Part 6 and the Phase E specification's own failure
// requirement, activity metadata failure must never block the real
// action. The caller (the route handler) is responsible for that
// boundary; this module simply reports outcome, it does not decide
// whether to propagate failure as an HTTP error.

interface BusinessDocRef {
  update(data: { lastActivityAt: string }): Promise<unknown>;
}

export interface ActivityTouchDb {
  collection(name: 'businesses'): {
    doc(businessId: string): BusinessDocRef;
  };
}

export type TouchBusinessActivityResult =
  | { outcome: 'touched'; businessId: string; timestamp: string }
  | { outcome: 'failed'; businessId: string; message: string };

/**
 * Sets businesses/{businessId}.lastActivityAt to a server-generated
 * timestamp (new Date().toISOString() by default, the same
 * server-clock idiom every other privileged write in this codebase
 * already uses — never a client-supplied value). `now` is injected
 * (defaults to the real clock) for deterministic testing, matching
 * the same DI pattern already established elsewhere in this codebase
 * (runGracePeriodExpirySweep(), businessDirectory.ts's
 * classifyOperationalActivity()/queryBusinessDirectory()). Never
 * throws — a failure here must never propagate as a failure of
 * whatever business action triggered it, so this function itself
 * absorbs the error and reports 'failed' rather than rejecting.
 */
export async function touchBusinessActivity(db: ActivityTouchDb, businessId: string, now: Date = new Date()): Promise<TouchBusinessActivityResult> {
  const timestamp = now.toISOString();
  try {
    await db.collection('businesses').doc(businessId).update({ lastActivityAt: timestamp });
    return { outcome: 'touched', businessId, timestamp };
  } catch (err) {
    return { outcome: 'failed', businessId, message: err instanceof Error ? err.message : String(err) };
  }
}
