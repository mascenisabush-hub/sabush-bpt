// SuperAdmin V1 Operational Control Plane — Phase D: Audit Center
// Filtering, query-building/validation logic.
//
// Same extraction rationale as server/operatorManagement.ts (Phase A),
// server/businessVisibility.ts (Phase B), and server/businessSuspension.ts
// (Phase C): server/index.ts cannot be imported by any test (it calls
// initializeApp({credential: cert(...)}) at module load), so logic
// lives in its own importable module and the Express route in
// server/index.ts stays a thin wrapper. Kept deliberately small — this
// is a query-shape translator, not a query framework — per the
// governing instruction's own "keep it small" constraint.
//
// Governing chain: ADR-0006, docs/specs/18-superadmin-v1-operational-control-plane-slice.md
// FR-D1/FR-D2, BR-12 (no second audit system — this module never
// writes; it only builds a read query against the existing
// platform_audit_log collection via the existing schema).
//
// Decisions this module implements (Phase D controlled implementation
// prompt, this session):
//   A. All five filters (businessId, actorUid, actionType, from, to)
//      may be combined simultaneously — one query, all supplied
//      constraints applied together, not one-filter-at-a-time.
//   B. Absent actionType means "every action type," not the prior
//      hardcoded payment-only restriction — the old
//      where('actionType','in',['payment.confirmed','payment.rejected'])
//      allowlist is removed entirely, not merely made optional.
//   C. targetUid is now included in the curated response allowlist
//      (operator-related events naturally target a uid, not a
//      business).
//   D. No pagination — orderBy('timestamp','desc').limit(100) is
//      preserved unchanged from the pre-Phase-D route.
//   E. No firestore.rules change — this module is Admin-SDK-mediated,
//      same as every read in businessVisibility.ts.
//
// Scope: read-only. This module performs zero writes of any kind.

/**
 * The complete, closed set of action types this platform has ever
 * written to platform_audit_log, as of Phase D — confirmed by direct
 * inspection of every writeAuditLogEntry() call site in
 * server/index.ts. Exported so the SuperAdmin UI's action-type filter
 * dropdown can reuse this exact list rather than maintaining a second,
 * potentially-drifting copy. actionType itself remains an open string
 * on the schema (PlatformAuditLogEntry) — this list is a Phase D
 * *filter-validation* allowlist, not a schema constraint; a future
 * phase adding a new action type updates this list, not the schema.
 */
export const KNOWN_ACTION_TYPES = [
  'payment.confirmed',
  'payment.rejected',
  'operator.provisioned',
  'operator.revoked',
  'business.viewed',
  'business.suspended',
  'business.reactivated',
] as const;

export type KnownActionType = (typeof KNOWN_ACTION_TYPES)[number];

export interface AuditLogFilters {
  businessId?: string;
  actorUid?: string;
  actionType?: string;
  from?: string;
  to?: string;
}

export interface AuditLogEntryRow {
  id: string;
  timestamp: string;
  actorUid: string;
  actorRole: string;
  actionType: string;
  targetBusinessId: string | null;
  targetUid: string | null;
  justification: string | null;
}

export type QueryAuditLogResult =
  | { outcome: 'ok'; entries: AuditLogEntryRow[] }
  | { outcome: 'invalid'; message: string };

interface AuditLogDoc {
  id: string;
  data(): Record<string, unknown> | undefined;
}

interface AuditLogQueryLike {
  where(field: string, op: string, value: unknown): AuditLogQueryLike;
  orderBy(field: string, direction: 'asc' | 'desc'): AuditLogQueryLike;
  limit(n: number): AuditLogQueryLike;
  get(): Promise<{ docs: AuditLogDoc[] }>;
}

export interface AuditLogDb {
  collection(name: 'platform_audit_log'): AuditLogQueryLike;
}

const RESULT_LIMIT = 100;

// Firestore composite-index requirement (Decision A — all five filters
// may combine simultaneously): every distinct SUBSET of the three
// equality filters {targetBusinessId, actorUid, actionType} that can
// be applied together needs its own composite index unioned with
// `timestamp` (the always-present orderBy/range field) — Firestore
// does not automatically merge single-field indexes across an
// equality+range-on-a-different-field combination. The "no equality
// filter at all" case (date range only, or no filter at all) needs
// no composite index — the automatic single-field `timestamp` index
// already serves range+orderBy on one field natively.
//
// Exactly 7 combinations exist (2^3 - 1, excluding the empty set):
//   {actionType}                                — ALREADY EXISTS in
//     firestore.indexes.json (actionType ASC, timestamp DESC) —
//     reused as-is, predates Phase D.
//   {targetBusinessId}                          — NEW
//   {actorUid}                                  — NEW
//   {targetBusinessId, actorUid}                — NEW
//   {targetBusinessId, actionType}              — NEW
//   {actorUid, actionType}                      — NEW
//   {targetBusinessId, actorUid, actionType}    — NEW
// Six new composite indexes are added to firestore.indexes.json
// (JSON cannot hold inline comments, hence this explanation lives
// here instead) — this is the direct, necessary consequence of
// Decision A, not over-provisioning. Field order within each index
// entry does not matter for equality fields (Firestore permutes
// freely among leading equality fields); `timestamp DESCENDING` is
// always the trailing field, matching the query's own orderBy.

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

/**
 * FR-D1. Validates every filter before touching Firestore (§8's own
 * requirement — malformed input never reaches the query builder).
 * `businessId`/`actorUid` are treated as free-form Firebase document
 * IDs/UIDs with no format constraint beyond non-empty — an empty
 * string is treated identically to the filter being absent (same
 * leniency businessVisibility.ts's searchBusinesses already applies
 * to its own query parameter). `actionType`, if supplied, must be one
 * of KNOWN_ACTION_TYPES — rejecting anything else with a clear
 * validation error rather than silently applying an arbitrary filter
 * value. `from`/`to` must each be a parseable date if supplied, and
 * `from` must not be after `to`.
 *
 * Applies whichever of the five filters were actually supplied, in
 * combination — Decision A. No `actionType` filter means every action
 * type is returned — Decision B, the removal of the prior hardcoded
 * payment-only restriction. Ordering and the 100-row limit are always
 * applied, unconditionally — Decision D.
 *
 * Response is mapped into exactly the curated allowlist (§10) — never
 * a raw Firestore document passthrough.
 */
export async function queryAuditLog(db: AuditLogDb, rawFilters: AuditLogFilters): Promise<QueryAuditLogResult> {
  const businessId = rawFilters.businessId?.trim() || undefined;
  const actorUid = rawFilters.actorUid?.trim() || undefined;
  const actionType = rawFilters.actionType?.trim() || undefined;
  const from = rawFilters.from?.trim() || undefined;
  const to = rawFilters.to?.trim() || undefined;

  if (actionType !== undefined && !(KNOWN_ACTION_TYPES as readonly string[]).includes(actionType)) {
    return { outcome: 'invalid', message: `actionType inválido: ${actionType}` };
  }
  if (from !== undefined && !isValidIsoDate(from)) {
    return { outcome: 'invalid', message: 'Data inicial (from) inválida.' };
  }
  if (to !== undefined && !isValidIsoDate(to)) {
    return { outcome: 'invalid', message: 'Data final (to) inválida.' };
  }
  if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
    return { outcome: 'invalid', message: 'A data inicial (from) não pode ser posterior à data final (to).' };
  }

  let query: AuditLogQueryLike = db.collection('platform_audit_log');
  if (businessId !== undefined) query = query.where('targetBusinessId', '==', businessId);
  if (actorUid !== undefined) query = query.where('actorUid', '==', actorUid);
  if (actionType !== undefined) query = query.where('actionType', '==', actionType);
  if (from !== undefined) query = query.where('timestamp', '>=', from);
  if (to !== undefined) query = query.where('timestamp', '<=', to);
  query = query.orderBy('timestamp', 'desc').limit(RESULT_LIMIT);

  const snap = await query.get();

  const entries: AuditLogEntryRow[] = snap.docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      timestamp: data.timestamp as string,
      actorUid: data.actorUid as string,
      actorRole: data.actorRole as string,
      actionType: data.actionType as string,
      targetBusinessId: (data.targetBusinessId as string | undefined) ?? null,
      targetUid: (data.targetUid as string | undefined) ?? null,
      justification: (data.justification as string | undefined) ?? null,
    };
  });

  return { outcome: 'ok', entries };
}
