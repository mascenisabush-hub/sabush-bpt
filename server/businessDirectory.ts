// SuperAdmin V1 Operational Control Plane — Phase E: Business
// Directory query module.
//
// Governing chain: BDR-0010, POL-18-001,
// docs/specs/18-superadmin-business-directory-slice.md v1.2. Rule 8
// verdict: READY (real Firestore verification, this session — see
// that specification's §13/§23 Resolution Log Item 2: a query
// combining inequality/range filters on createdAt AND lastActivityAt
// in one query is CONFIRMED to work, 6/6 tests against a real
// emulator). No Operational Activity bucket field, no background
// aging process — every classification is computed fresh, either at
// query time (as a range filter) or at response-assembly time (for
// display), directly from createdAt/lastActivityAt.
//
// Same extraction rationale as every prior Phase A-D module:
// server/index.ts cannot be imported by any test (Firebase Admin init
// at module load), so logic lives here, the route in server/index.ts
// stays a thin wrapper.
//
// SEARCH ARCHITECTURE NOTE — read before touching this file: this
// module does NOT call server/businessVisibility.ts's searchBusinesses()
// directly. That function's signature and response shape (BR-5/BR-6,
// Phase B) are a fixed, already-proven contract for a different
// screen (single-purpose search + detail lookup) and are deliberately
// left untouched here, not because a second search architecture is
// being introduced, but for the opposite reason: this module
// structurally MIRRORS that exact same two-part shape (an exact-ID
// match unioned with a name-prefix range query) rather than widening
// businessVisibility.ts's own contract to carry filters and extra
// fields it was never designed to return. This is the same "one
// proven shape, reused everywhere it fits" discipline every prior
// phase has followed — not a new pattern.
//
// The two distinct search-combination rules from the specification's
// Resolution Log (Item 3), both implemented exactly as decided,
// neither improvised:
//   - Search + Suspension/Subscription (equality filters): combine in
//     ONE Firestore query — the same equality+range shape Phase D's
//     auditLogQuery.ts already proved works (BR-6's "not a second
//     search architecture" concern does not apply to appending
//     .where() clauses to the exact same base query shape).
//   - Search + Operational Activity (range-based): does NOT combine
//     in one query — three range-treated fields (name, createdAt,
//     lastActivityAt) simultaneously is beyond what was verified.
//     Instead: the search's own SEARCH_RESULT_LIMIT-bounded result set
//     is fetched, then Activity is applied as a small, bounded
//     post-filter on those already-fetched rows — not the
//     full-population client-side scan BDR-0010 prohibits.

const SEARCH_RESULT_LIMIT = 20;
const DIRECTORY_PAGE_SIZE = 100;

const KNOWN_SUBSCRIPTION_STATUSES = [
  'trial_pending',
  'trial_active',
  'trial_completed',
  'active',
  'grace_period',
  'expired',
] as const;

export type OperationalActivityFilter = 'new' | 'active' | 'inactive' | 'dormant';
export type SortField = 'lastActivityAt' | 'createdAt' | 'name';

export interface DirectoryFilters {
  search?: string;
  operationalActivity?: OperationalActivityFilter;
  subscriptionState?: string;
  suspended?: boolean;
  sortBy?: SortField;
  cursor?: string; // opaque — the last row's sort-field value from the prior page
  pageSize?: number; // defaults to DIRECTORY_PAGE_SIZE, never exceeds it
}

export interface DirectoryRow {
  businessId: string;
  name: string | null;
  operationalActivity: 'New' | 'Active' | 'Inactive' | 'Dormant';
  daysSinceActivity: number | null; // null only for New businesses with no activity yet
  lastActivityAt: string | null;
  subscriptionState: string | null;
  suspended: boolean;
  createdAt: string | null;
  ownerUid: string | null;
}

export type DirectoryQueryResult =
  | { outcome: 'ok'; rows: DirectoryRow[]; nextCursor: string | null }
  | { outcome: 'invalid'; message: string };

interface BusinessDoc {
  id?: string;
  name?: string;
  createdAt?: string;
  lastActivityAt?: string;
  subscriptionStatusCache?: string;
  suspended?: boolean;
  ownerUid?: string;
}

interface DocSnap {
  id: string;
  exists: boolean;
  data(): BusinessDoc | undefined;
}

interface QueryLike {
  where(field: string, op: string, value: unknown): QueryLike;
  orderBy(field: string, direction?: 'asc' | 'desc'): QueryLike;
  startAfter(value: unknown): QueryLike;
  limit(n: number): QueryLike;
  get(): Promise<{ docs: DocSnap[] }>;
}

export interface BusinessDirectoryDb {
  collection(name: 'businesses'): QueryLike & {
    doc(businessId: string): { get(): Promise<DocSnap> };
  };
}

// POL-18-001's exact thresholds — cited, not restated with variation.
const NEW_WINDOW_DAYS = 30;
const ACTIVE_WINDOW_DAYS = 14;
const DORMANT_THRESHOLD_DAYS = 45;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Computes the POL-18-001 operational-activity classification for one
 * business, purely from createdAt/lastActivityAt — no stored bucket,
 * matching §6.4/§8 of the specification exactly. `now` is injected
 * (defaults to the real clock) for deterministic testing, the same DI
 * rationale already established elsewhere in this codebase
 * (closingNotificationProducer.ts, runGracePeriodExpirySweep()).
 */
export function classifyOperationalActivity(
  createdAt: string | undefined,
  lastActivityAt: string | undefined,
  now: Date = new Date(),
): { state: DirectoryRow['operationalActivity']; daysSinceActivity: number | null } {
  const nowIso = now.toISOString();
  if (!createdAt) {
    // Should not occur in practice (createdAt is always set at
    // creation) — treated as New rather than throwing, matching this
    // codebase's general defensive posture toward malformed legacy data.
    return { state: 'New', daysSinceActivity: null };
  }
  const ageDays = daysBetween(createdAt, nowIso);
  if (ageDays < NEW_WINDOW_DAYS) {
    return { state: 'New', daysSinceActivity: null };
  }
  if (!lastActivityAt) {
    // Outside the New window, never any recorded activity — Dormant
    // by construction, per the specification's §7 backfill discussion
    // (this is the correct, expected classification, not an error).
    return { state: 'Dormant', daysSinceActivity: null };
  }
  const activityDays = daysBetween(lastActivityAt, nowIso);
  if (activityDays <= ACTIVE_WINDOW_DAYS) {
    return { state: 'Active', daysSinceActivity: activityDays };
  }
  if (activityDays <= DORMANT_THRESHOLD_DAYS) {
    return { state: 'Inactive', daysSinceActivity: activityDays };
  }
  return { state: 'Dormant', daysSinceActivity: activityDays };
}

function mapDoc(doc: DocSnap): DirectoryRow {
  const data = doc.data() ?? {};
  const classification = classifyOperationalActivity(data.createdAt, data.lastActivityAt);
  return {
    businessId: doc.id,
    name: data.name ?? null,
    operationalActivity: classification.state,
    daysSinceActivity: classification.daysSinceActivity,
    lastActivityAt: data.lastActivityAt ?? null,
    subscriptionState: data.subscriptionStatusCache ?? null,
    suspended: data.suspended === true,
    createdAt: data.createdAt ?? null,
    ownerUid: data.ownerUid ?? null,
  };
}

/**
 * FR (Phase E). Validates filters, then dispatches to one of two
 * query strategies:
 *   - search present -> §9/§15's bounded, two-stage approach
 *   - search absent -> a single, fully server-side filtered/sorted/
 *     paginated query, including the now-proven Activity range filter
 */
export async function queryBusinessDirectory(db: BusinessDirectoryDb, filters: DirectoryFilters): Promise<DirectoryQueryResult> {
  if (filters.subscriptionState !== undefined && !(KNOWN_SUBSCRIPTION_STATUSES as readonly string[]).includes(filters.subscriptionState)) {
    return { outcome: 'invalid', message: `subscriptionState inválido: ${filters.subscriptionState}` };
  }
  if (
    filters.operationalActivity !== undefined &&
    !(['new', 'active', 'inactive', 'dormant'] as const).includes(filters.operationalActivity)
  ) {
    return { outcome: 'invalid', message: `operationalActivity inválido: ${filters.operationalActivity}` };
  }
  const pageSize = Math.min(filters.pageSize ?? DIRECTORY_PAGE_SIZE, DIRECTORY_PAGE_SIZE);
  const sortBy: SortField = filters.sortBy ?? 'lastActivityAt';

  const searchTerm = filters.search?.trim();
  if (searchTerm) {
    return queryWithSearch(db, searchTerm, filters);
  }
  return queryWithoutSearch(db, filters, sortBy, pageSize);
}

/**
 * §15's approved strategy: search's own bounded result set (exact-ID
 * match unioned with a name-prefix range, same two-part shape as
 * businessVisibility.ts's searchBusinesses(), capped at
 * SEARCH_RESULT_LIMIT) — Suspension/Subscription equality filters are
 * pushed into the SAME query (proven, equality+range shape); the
 * Operational Activity filter, if present, is applied afterward as a
 * bounded post-filter on the already-fetched, already-small result
 * set — never the full-population scan BDR-0010 prohibits.
 */
async function queryWithSearch(db: BusinessDirectoryDb, searchTerm: string, filters: DirectoryFilters): Promise<DirectoryQueryResult> {
  const results = new Map<string, DirectoryRow>();

  const exactSnap = await db.collection('businesses').doc(searchTerm).get();
  if (exactSnap.exists && matchesEqualityFilters(exactSnap.data(), filters)) {
    results.set(exactSnap.id, mapDoc(exactSnap));
  }

  let prefixQuery: QueryLike = db.collection('businesses').where('name', '>=', searchTerm).where('name', '<=', searchTerm + '\uf8ff');
  if (filters.suspended !== undefined) prefixQuery = prefixQuery.where('suspended', '==', filters.suspended);
  if (filters.subscriptionState !== undefined) prefixQuery = prefixQuery.where('subscriptionStatusCache', '==', filters.subscriptionState);
  const prefixSnap = await prefixQuery.limit(SEARCH_RESULT_LIMIT).get();
  for (const doc of prefixSnap.docs) {
    if (!results.has(doc.id)) results.set(doc.id, mapDoc(doc));
  }

  let rows = Array.from(results.values()).slice(0, SEARCH_RESULT_LIMIT);

  if (filters.operationalActivity !== undefined) {
    rows = rows.filter((r) => r.operationalActivity.toLowerCase() === filters.operationalActivity);
  }

  rows = sortRows(rows, filters.sortBy ?? 'lastActivityAt');

  return { outcome: 'ok', rows, nextCursor: null }; // search results are never paginated further — bounded by SEARCH_RESULT_LIMIT itself
}

function matchesEqualityFilters(data: BusinessDoc | undefined, filters: DirectoryFilters): boolean {
  if (!data) return false;
  if (filters.suspended !== undefined && data.suspended !== filters.suspended) return false;
  if (filters.subscriptionState !== undefined && data.subscriptionStatusCache !== filters.subscriptionState) return false;
  return true;
}

function sortRows(rows: DirectoryRow[], sortBy: SortField): DirectoryRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    return av > bv ? -1 : av < bv ? 1 : 0; // descending, matching every other "recent first" surface (Phase D's audit log)
  });
  return sorted;
}

/**
 * The no-search path: a single, fully server-side query. Suspension/
 * Subscription are plain equality filters. Operational Activity, when
 * requested, is expressed as the now-proven compound range on
 * createdAt + lastActivityAt — no stored bucket field, computed fresh
 * from the two boundary values POL-18-001 defines, at query time.
 */
async function queryWithoutSearch(
  db: BusinessDirectoryDb,
  filters: DirectoryFilters,
  sortBy: SortField,
  pageSize: number,
): Promise<DirectoryQueryResult> {
  let query: QueryLike = db.collection('businesses');

  if (filters.suspended !== undefined) query = query.where('suspended', '==', filters.suspended);
  if (filters.subscriptionState !== undefined) query = query.where('subscriptionStatusCache', '==', filters.subscriptionState);

  if (filters.operationalActivity !== undefined) {
    const now = new Date();
    const ageCutoff = new Date(now.getTime() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const activeCutoff = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const dormantCutoff = new Date(now.getTime() - DORMANT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    if (filters.operationalActivity === 'new') {
      query = query.where('createdAt', '>=', ageCutoff);
    } else {
      // Active/Inactive/Dormant all exclude the New window first —
      // POL-18-001's precedence rule (age always wins), the exact
      // two-field range shape confirmed against a real Firestore
      // engine (spec v1.2, §13/§23 Resolution Log Item 2).
      query = query.where('createdAt', '<', ageCutoff);
      if (filters.operationalActivity === 'active') {
        query = query.where('lastActivityAt', '>=', activeCutoff);
      } else if (filters.operationalActivity === 'inactive') {
        query = query.where('lastActivityAt', '>=', dormantCutoff).where('lastActivityAt', '<', activeCutoff);
      } else {
        // Dormant. Firestore cannot range-query a field's absence, so
        // this relies on the data-model invariant established at
        // business creation (server/index.ts) and by the backfill
        // migration (server/scripts/backfillPhaseE.ts): lastActivityAt
        // is always present, initialized to createdAt itself for a
        // business with no real activity yet — never left absent. A
        // never-active business therefore correctly and queryably
        // shows as Dormant once its New window passes, without a
        // second query branch or a stored bucket field.
        query = query.where('lastActivityAt', '<', dormantCutoff);
      }
    }
  }

  const sortDirection = sortBy === 'name' ? 'asc' : 'desc';
  query = query.orderBy(sortBy, sortDirection);
  if (filters.cursor !== undefined) {
    query = query.startAfter(filters.cursor);
  }
  query = query.limit(pageSize);

  const snap = await query.get();
  const rows = snap.docs.map(mapDoc);
  const lastRow = rows[rows.length - 1];
  const nextCursor = rows.length === pageSize && lastRow ? String(lastRow[sortBy] ?? '') : null;

  return { outcome: 'ok', rows, nextCursor };
}
