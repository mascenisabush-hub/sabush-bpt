// SuperAdmin V1 Operational Control Plane — Phase B: Business Visibility
// business/authorization logic.
//
// Same extraction rationale as server/operatorManagement.ts (Phase A,
// approved as an implementation-level adjustment preserving this
// repository's established testing architecture — see that file's own
// header for the full reasoning, which applies identically here):
// server/index.ts cannot be imported by any test (it calls
// initializeApp({credential: cert(...)}) at module load), so
// business/authorization logic lives in its own importable module and
// the Express route in server/index.ts stays a thin wrapper.
//
// Governing chain: ADR-0006; Architecture Gap Resolutions — Gap 2
// CONFIRMED (Option B: narrow, server-mediated, audited diagnostic
// access, no Support Session credential, no client-side Firestore
// access to raw tenant collections), Gap 3 CONFIRMED (owner email
// exposed only in the single-business detail view, never in search
// results); docs/specs/18-superadmin-v1-operational-control-plane-slice.md
// BR-4 (read-only, absolute — this module performs zero writes of any
// kind), BR-5 (curated response only — exactly the allowlisted field
// set below, nothing else), BR-6 (owner email never in search results),
// BR-7 (justification required for the single-business detail read;
// the caller audits it exactly once via the existing
// writeAuditLogEntry() primitive, matching Phase A's own pattern of
// this module never writing platform_audit_log itself).
//
// Scope: Phase B only, strictly read-only. No suspension, no mutation,
// no subscription/payment write of any kind. Gap 1 (business
// suspension model, Phase C) is not decided or touched by this file.

interface DocSnap<T> {
  exists: boolean;
  id: string;
  data(): T | undefined;
}

interface QueryLike<T> {
  where(field: string, op: string, value: unknown): QueryLike<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): QueryLike<T>;
  limit(n: number): QueryLike<T>;
  get(): Promise<{ docs: DocSnap<T>[] }>;
}

interface BusinessDoc {
  name?: string;
  category?: string;
  currencySymbol?: string;
  createdAt?: string;
  ownerUid?: string;
  // [Phase C — ADR-0006, Gap 1] Added to this module's read shape only
  // so the SuperAdmin BusinessDetail screen can show current
  // suspension state and gate its suspend/reactivate actions — an
  // explicitly-scoped, one-field addition to the curated response
  // (BR-5), not a broadening of what this module reads or returns
  // beyond that single field.
  suspended?: boolean;
}

interface UserDoc {
  name?: string;
  email?: string;
  createdAt?: string;
}

interface StaffDoc {
  name?: string;
  suspended?: boolean;
}

interface PaymentDoc {
  amount?: number;
  currency?: string;
  method?: string;
  reference?: string;
  submittedAt?: string;
  status?: string;
}

export interface BusinessVisibilityDb {
  collection(name: 'businesses'): QueryLike<BusinessDoc> & {
    doc(businessId: string): {
      get(): Promise<DocSnap<BusinessDoc>>;
      collection(name: 'staff'): { get(): Promise<{ docs: DocSnap<StaffDoc>[] }> };
      collection(name: 'payments'): QueryLike<PaymentDoc>;
    };
  };
  collection(name: 'users'): {
    doc(uid: string): { get(): Promise<DocSnap<UserDoc>> };
  };
}

export interface BusinessSearchRow {
  businessId: string;
  name: string;
}

const SEARCH_RESULT_LIMIT = 20;
const RECENT_PAYMENTS_LIMIT = 10;

/**
 * FR-B1. BR-6: returns businessId + name only, never email or any other
 * field — enforced by this function's own return shape, not left to the
 * caller to strip. Combines an exact businessId lookup (if the query
 * matches a real document) with a name-prefix range query, deduplicated.
 * An empty/whitespace-only query returns an empty list rather than
 * running an unbounded scan.
 */
export async function searchBusinesses(db: BusinessVisibilityDb, rawQuery: string): Promise<BusinessSearchRow[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const results = new Map<string, string>(); // businessId -> name

  const exactSnap = await db.collection('businesses').doc(q).get();
  if (exactSnap.exists) {
    results.set(exactSnap.id, exactSnap.data()?.name ?? '');
  }

  const prefixSnap = await db
    .collection('businesses')
    .where('name', '>=', q)
    .where('name', '<=', q + '\uf8ff')
    .limit(SEARCH_RESULT_LIMIT)
    .get();
  for (const doc of prefixSnap.docs) {
    if (!results.has(doc.id)) {
      results.set(doc.id, doc.data()?.name ?? '');
    }
  }

  return Array.from(results.entries())
    .slice(0, SEARCH_RESULT_LIMIT)
    .map(([businessId, name]) => ({ businessId, name }));
}

export interface BusinessDetailStaffRow {
  name: string;
  suspended: boolean;
}

export interface BusinessDetailPaymentRow {
  amount: number | null;
  currency: string | null;
  method: string | null;
  reference: string | null;
  submittedAt: string | null;
  status: string | null;
}

export interface BusinessDetail {
  businessId: string;
  name: string | null;
  category: string | null;
  currencySymbol: string | null;
  createdAt: string | null;
  owner: {
    name: string | null;
    email: string | null;
    createdAt: string | null;
  } | null;
  staff: BusinessDetailStaffRow[];
  subscriptionStatus: string | null;
  recentPayments: BusinessDetailPaymentRow[];
  // [Phase C — ADR-0006, Gap 1] See BusinessDoc.suspended above.
  suspended: boolean;
}

export type FetchBusinessDetailResult =
  | { outcome: 'found'; detail: BusinessDetail }
  | { outcome: 'not-found'; message: string }
  | { outcome: 'missing-justification'; message: string };

/**
 * FR-B2. BR-7: rejects a missing/empty justification before any read
 * happens. BR-5: assembles exactly the curated field set named in the
 * Architecture Gap Resolutions (Gap 2) — no other collection is ever
 * touched by this function. `readSubscriptionStatus` is injected by the
 * caller (server/index.ts) rather than re-implemented here, so this
 * module reuses the exact same existing, already-proven platform-scoped
 * read Payment Operations already relies on — no second read pattern.
 */
export async function fetchBusinessDetail(
  db: BusinessVisibilityDb,
  businessId: string,
  justification: string,
  readSubscriptionStatus: (businessId: string) => Promise<string | null>
): Promise<FetchBusinessDetailResult> {
  if (!justification || !justification.trim()) {
    return { outcome: 'missing-justification', message: 'É obrigatório indicar uma justificação.' };
  }

  const businessSnap = await db.collection('businesses').doc(businessId).get();
  if (!businessSnap.exists) {
    return { outcome: 'not-found', message: 'Negócio não encontrado.' };
  }
  const businessData = businessSnap.data();

  const [ownerSnap, staffSnap, subscriptionStatus, paymentsSnap] = await Promise.all([
    businessData?.ownerUid
      ? db.collection('users').doc(businessData.ownerUid).get()
      : Promise.resolve<DocSnap<UserDoc>>({ exists: false, id: '', data: () => undefined }),
    db.collection('businesses').doc(businessId).collection('staff').get(),
    readSubscriptionStatus(businessId),
    db.collection('businesses').doc(businessId).collection('payments').orderBy('submittedAt', 'desc').limit(RECENT_PAYMENTS_LIMIT).get(),
  ]);

  const detail: BusinessDetail = {
    businessId,
    name: businessData?.name ?? null,
    category: businessData?.category ?? null,
    currencySymbol: businessData?.currencySymbol ?? null,
    createdAt: businessData?.createdAt ?? null,
    owner: ownerSnap.exists
      ? {
          name: ownerSnap.data()?.name ?? null,
          email: ownerSnap.data()?.email ?? null,
          createdAt: ownerSnap.data()?.createdAt ?? null,
        }
      : null,
    staff: staffSnap.docs.map((d) => ({ name: d.data()?.name ?? '', suspended: d.data()?.suspended === true })),
    subscriptionStatus,
    suspended: businessData?.suspended === true,
    recentPayments: paymentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        amount: data?.amount ?? null,
        currency: data?.currency ?? null,
        method: data?.method ?? null,
        reference: data?.reference ?? null,
        submittedAt: data?.submittedAt ?? null,
        status: data?.status ?? null,
      };
    }),
  };

  return { outcome: 'found', detail };
}
