// SABUSH BPT — Business Data Reset ("reposição de fábrica"), Owner-requested
// 2026-09-29.
//
// WHY: a business's data belongs to the client, and the client carries the
// responsibility for it. Real cases: an owner who started badly and wants to
// begin afresh; an owner who changed business and does not want to keep data
// he no longer needs. The Owner/Admin may therefore erase the business's
// operational data — all of it, or one area — protected by the business's own
// reset password (the existing clear-data password, with its lockout).
//
// WHY SERVER-SIDE: firestore.rules deliberately make stockCounts and Business
// Worth snapshots immutable for every client (Decisions 56/57), so a real
// reset cannot run in the browser. It also must not stop half-way because a
// phone lost signal. The Admin SDK's recursiveDelete removes each collection
// together with every nested subcollection (e.g. stockCountDrafts/periodic/
// items and /tombstones).
//
// NEVER DELETED by any option (the business itself and its relationship with
// SABUSH, not its operational data): the business document's identity and
// profile, staff accounts and roles, subscription payments, support sessions,
// the reset password itself (`private`), and the platform audit log.

export type ResetScope = 'all' | 'catalog' | 'stock' | 'cash' | 'worth';
export type AreaScope = Exclude<ResetScope, 'all'>;

export const AREA_SCOPES: AreaScope[] = ['catalog', 'stock', 'cash', 'worth'];

// Every operational subcollection of businesses/{businessId}, by area.
export const RESET_SCOPE_COLLECTIONS: Record<AreaScope, string[]> = {
  // Catálogo — the product list and supplier records.
  catalog: ['products', 'suppliers'],
  // Stock e contagens — purchases, stock batches, breakages and every
  // Contagem (confirmed counts, drafts, authorizations tied to them).
  stock: [
    'batches',
    'purchaseBatches',
    'purchaseDrafts',
    'quebras',
    'openBatchLocks',
    'stockCounts',
    'stockCountDrafts',
    'initialStockPriceChangeEvents',
    'initialStockRecoveryAuthorization',
    'voidRecords',
    'contagemAuthority',
  ],
  // Caixa e movimentos — cash, closings, expenses, withdrawals and debts.
  cash: [
    'cashLedgerEntries',
    'cashPositionDeclarations',
    'closings',
    'closedPeriods',
    'expenses',
    'withdrawals',
    'receivables',
    'receivablePayments',
    'payables',
    'payablePayments',
  ],
  // Valor de negócio e painel — every snapshot, investment and the cached
  // current worth (cleared on the business document, see below).
  worth: ['businessWorthSnapshots', 'businessWorthRecoveryAuthorizations', 'ownerInvestments', 'startupInvestmentEntries'],
};

// Only with "Tudo": the activity timeline and per-user Contagem preferences.
export const ALL_ONLY_COLLECTIONS: string[] = ['timelineEvents', 'periodicContagemUserPrefs'];

export const NEVER_DELETED_COLLECTIONS: string[] = [
  'staff',
  'payments',
  'private',
  'supportSessions',
  'supportSessionInvitation',
];

// Dependencies — deleting an area without the areas that point at it would
// leave records referring to things that no longer exist:
//   catalog ⇒ stock  (stock batches and counts reference products)
//   stock   ⇒ worth  (every Business Worth snapshot is a measured Contagem)
export function expandResetScopes(requested: ResetScope[]): AreaScope[] {
  const set = new Set<AreaScope>();
  if (requested.includes('all')) AREA_SCOPES.forEach((s) => set.add(s));
  for (const s of requested) if (s !== 'all' && AREA_SCOPES.includes(s)) set.add(s);
  if (set.has('catalog')) set.add('stock');
  if (set.has('stock')) set.add('worth');
  return AREA_SCOPES.filter((s) => set.has(s));
}

export function collectionsForScopes(requested: ResetScope[]): string[] {
  const areas = expandResetScopes(requested);
  const names = areas.flatMap((a) => RESET_SCOPE_COLLECTIONS[a]);
  if (requested.includes('all')) names.push(...ALL_ONLY_COLLECTIONS);
  // Defence in depth: never, whatever the mapping above says.
  return names.filter((n) => !NEVER_DELETED_COLLECTIONS.includes(n));
}

export function parseResetScopes(raw: unknown): ResetScope[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const valid: ResetScope[] = ['all', ...AREA_SCOPES];
  const scopes = raw.map((s) => String(s)) as ResetScope[];
  if (!scopes.every((s) => valid.includes(s))) return null;
  return Array.from(new Set(scopes));
}

// Minimal structural types so this module is testable with a fake db.
interface CollectionRefLike {
  count(): { get(): Promise<{ data(): { count: number } }> };
}
interface DocRefLike {
  collection(name: string): CollectionRefLike;
  set(data: Record<string, unknown>, options: { merge: boolean }): Promise<unknown>;
}
export interface ResetDbLike {
  collection(name: 'businesses'): { doc(id: string): DocRefLike };
  recursiveDelete(ref: CollectionRefLike): Promise<void>;
}

export interface BusinessDataResetResult {
  scopes: AreaScope[];
  deletedCounts: Record<string, number>;
  clearedCurrentWorth: boolean;
}

export async function executeBusinessDataReset(
  db: ResetDbLike,
  businessId: string,
  requested: ResetScope[],
  deleteField: () => unknown
): Promise<BusinessDataResetResult> {
  const scopes = expandResetScopes(requested);
  const businessRef = db.collection('businesses').doc(businessId);
  const deletedCounts: Record<string, number> = {};
  for (const name of collectionsForScopes(requested)) {
    const ref = businessRef.collection(name);
    const snap = await ref.count().get();
    deletedCounts[name] = snap.data().count;
    await db.recursiveDelete(ref);
  }
  // The cached "current worth" lives on the business document itself.
  const clearedCurrentWorth = scopes.includes('worth');
  if (clearedCurrentWorth) {
    await businessRef.set({ currentWorth: deleteField() }, { merge: true });
  }
  return { scopes, deletedCounts, clearedCurrentWorth };
}
