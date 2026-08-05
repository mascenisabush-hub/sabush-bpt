// [Phase 0 Stage 2 Compatibility Correction] Includes 'admin' alongside
// the legacy 'owner' value — both are owner-level, per the Phase 0
// owner->admin migration. New self-registrations write 'admin'
// (AuthView.tsx); existing accounts remain 'owner' until Stage 3's
// backfill runs. See docs/engineering/phase0-owner-admin-migration-implementation-plan.md.
export type UserRole = 'owner' | 'admin' | 'staff';

// Additive Staff tier (BDS #16). NOT a new UserRole value — a Manager is
// still, structurally, role: 'staff' for every existing Auth pattern and
// Security Rule not explicitly amended for this tier. Optional/absent is
// equivalent to 'staff' for every account created before this module.
export type StaffTier = 'staff' | 'manager';

// Per-permission grants for a Manager-tier staff account (BDS #16).
// Optional; every key defaults to false, including immediately after a
// promotion to 'manager' — promoting and granting are two separate,
// explicit Admin actions. Only the Admin may write this field (enforced
// server-side, never client-writable — see server/index.ts set-tier
// endpoint and firestore.rules).
export interface ManagerPermissions {
  closings: boolean;
  staffManagement: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  // Legacy single-shop field. Still the source of truth for staff (who
  // always belong to exactly one shop) and for owner accounts created
  // before multi-shop support existed. Never changes after creation.
  businessId: string;
  createdAt: string;
  // Multi-shop support (owners only, up to 10 shops per account — see
  // MAX_SHOPS_PER_OWNER in AppContext). Optional/absent on older owner
  // profiles and on all staff profiles.
  businessIds?: string[];
  activeBusinessId?: string;
  // Staff-only. Set exclusively by the server (server/index.ts, via
  // Firebase Admin SDK — firestore.rules blocks any client-side write to
  // this field, even on the user's own profile). Suspending disables the
  // Firebase Auth account outright (no login possible at all) and this
  // flag lets the client detect it in real time and force an immediate
  // sign-out of any session that's already open.
  suspended?: boolean;
  // Staff-only (BDS #16). Absent or 'staff' behaves identically to today.
  // Set exclusively by the server, same as `suspended` — never
  // client-writable, including by the staff member whose access it gates.
  staffTier?: StaffTier;
  // Staff-only (BDS #16). Only meaningful when staffTier === 'manager';
  // ignored otherwise. Set exclusively by the server, same as staffTier.
  managerPermissions?: ManagerPermissions;
}

export interface Business {
  id: string;
  name: string;
  ownerUid: string;
  category: string;
  currencySymbol: string;
  createdAt: string;
  contact?: string;
  location?: string;
  email?: string;
}

// Module #19 (Subscriptions), Phase 1 — Business State Model's technical
// encoding, per docs/specs/19-subscriptions.md "Technical Status Model".
// These six values, and no others, are approved (POL-19-005). Phase 1
// only ever produces 'trial_pending' — the remaining five are reachable
// starting Phase 2 (Trial Engine) and Phase 3 (Subscription Lifecycle).
export type SubscriptionStatus =
  | 'trial_pending'
  | 'trial_active'
  | 'trial_completed'
  | 'active'
  | 'grace_period'
  | 'expired';

// One document per Business (subscriptions/{businessId} — subscriptionId
// === businessId, per the spec's Data Model). Created exclusively by the
// server's Business Provisioning Orchestrator (server/index.ts) via the
// Admin SDK — never client-writable (see firestore.rules). Business
// Rule 7: no payment-instrument field exists here, ever.
export interface Subscription {
  businessId: string; // required, immutable after creation
  planId: string; // Phase 1: a single placeholder V1 plan id; Plan catalogue is out of scope
  status: SubscriptionStatus;
  trialActivatedAt: string | null; // null until Phase 2's activation trigger fires (POL-19-001)
  trialEndsAt: string | null; // set at activation; trialActivatedAt + 30 days (POL-19-002)
  gracePeriodEndsAt: string | null; // set on entry to grace_period; +7 days (POL-19-004)
  renewalDate: string | null;
  entitlements: {
    business_limit: number;
    feature_flags: { [featureKey: string]: boolean };
  };
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  businessId: string;
  createdAt: string;
  suspended?: boolean;
  // Mirror of users/{uid}.staffTier (BDS #16) — users/{uid} remains the
  // authoritative document Security Rules check; this copy exists only
  // so the Staff list UI doesn't need a second read per row. Server keeps
  // both in sync in the same batch write (see server/index.ts set-tier).
  staffTier?: StaffTier;
  managerPermissions?: ManagerPermissions;
}

// A device-local (never synced to Firestore) cache used by the PIN-based
// quick-login screen on a shared shop device — see AppContext's
// pairDevice/unpairDevice and components/QuickLoginScreen.tsx.
export interface PairedDevice {
  businessId: string;
  businessName: string;
  staff: Array<{ uid: string; name: string; email: string }>;
  pairedAt: string;
}

export type BatchStatus = 'open' | 'closed';

export interface Quebra {
  id: string;
  batchId: string;
  productId: string;
  date: string; // YYYY-MM-DD
  quantityLost: number;
  reason: string;
  createdAt: string; // ISO string
}

export interface StockBatch {
  id: string;
  productId: string;
  dateEntered: string; // YYYY-MM-DD
  quantity: number;
  unit?: string; // unit of measure e.g. un, cx, kg, saco
  costPrice: number; // per unit
  sellingPrice: number; // per unit
  status: BatchStatus;
  createdAt: string; // ISO string
  // Links this per-product stock line back to the Purchase Batch (the
  // investment/purchase event) it was bought under. Optional because
  // batches created before this feature existed have no Purchase Batch —
  // those are still shown in the Investment Ledger, just grouped by date
  // instead, so no historical data is ever lost or hidden.
  purchaseBatchId?: string;
}

// ============================================================
// SUPPLIER (attached to a Purchase Batch, not to individual products)
// ============================================================
export interface Supplier {
  name: string;
  phone?: string;
  notes?: string;
}

// A Purchase Batch's status is always derived automatically from its line
// items' remaining quantities (see calculatePurchaseBatchSummary) — never
// stored/edited directly, except for 'archived' which is an explicit,
// reversible owner action to declutter old, fully-settled investments.
export type PurchaseBatchStatus = 'active' | 'partially_remaining' | 'fully_consumed' | 'archived';

// ============================================================
// PURCHASE BATCH — one real-world stock purchase / investment event.
// ============================================================
// A Purchase Batch is the "envelope" around one or more StockBatch line
// items (one per product) that were all bought together, on the same
// date, from the same supplier. This is what the Investment Ledger
// (Batch History) is built around. It never carries its own cost/price
// figures — those always come from its StockBatch line items via the
// existing Embedded Profit engine in calculations.ts.
export interface PurchaseBatch {
  id: string;
  batchNumber: string; // human-readable, permanent, e.g. "BAT-000001"
  batchSeq: number; // numeric sequence used to generate batchNumber
  date: string; // YYYY-MM-DD — purchase date
  supplier: Supplier;
  notes?: string;
  createdByName?: string; // display name of whoever recorded the purchase
  createdAt: string; // ISO string
  archived?: boolean;
  archivedAt?: string; // ISO string
}

// ============================================================
// PRODUCT — catalog metadata only. IMPORTANT: costPrice/sellingPrice
// here are a REFERENCE price for browsing/editing/pre-filling Add
// Stock — they are NOT used by any Investment/Market/Profit
// calculation. Every calculation always reads price from the actual
// StockBatch it belongs to (see calculations.ts), never from here.
// This keeps historical batches accurate even if the reference price
// on the product is edited later.
// ============================================================
export interface Product {
  id: string;
  name: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string — last time catalog metadata was edited
  category?: string;
  supplier?: string;
  sku?: string;
  barcode?: string;
  costPrice?: number; // reference price only, see note above
  sellingPrice?: number; // reference price only, see note above
}

// [Closing Integrity Amendment v1.0 — Option B] closingId/lockedAt are
// absent for every Expense recorded before this field existed, and for
// any Expense in a period that has never been closed. Present once this
// Expense has been included in a Closing's frozen snapshot (recordClosing,
// AppContext.tsx) — at that point it can no longer be edited or deleted.
// Cleared (not left stale) if the owning Closing is later reopened
// (reopenClosing), per the amendment's "supersede, not rewrite" rule.
export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category?: string;
  createdAt: string; // ISO string
  closingId?: string;
  lockedAt?: string; // ISO string
}

// Owner Withdrawals: money taken out of the business by the owner for
// personal use. This is intentionally a SEPARATE concept from Expense —
// a withdrawal is not a business cost, it's capital leaving the business
// in the owner's hands. Never merge these two collections.
// [Closing Integrity Amendment v1.0 — Option B] Same lock-field pattern
// as Expense, above — see that comment for the full rule.
export interface Withdrawal {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason?: string; // e.g. Uso Pessoal, Salário, Família, Emergência, Casa, Veículo, Outro
  notes?: string;
  createdAt: string; // ISO string
  closingId?: string;
  lockedAt?: string; // ISO string
}

// ============================================================
// STOCK COUNTS (Capital baseline + periodic physical counts)
// ============================================================
// IMPORTANT: A StockCount is NOT a purchase and NOT a batch. It records
// what the owner physically counts as already owned, at a point in time,
// for the purpose of establishing/verifying business capital. The very
// first StockCount a business ever records (type: 'initial') becomes the
// permanent INITIAL BUSINESS CAPITAL baseline and can never be re-created
// or edited afterwards — everything else is measured against it.
export type StockCountType = 'initial' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface StockCountItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number; // cost per unit at the time of the count
  totalValue: number; // quantity * costPrice
}

export interface StockCount {
  id: string;
  type: StockCountType;
  label?: string; // owner-given label, mainly used for 'custom' counts
  date: string; // YYYY-MM-DD
  items: StockCountItem[];
  totalValue: number; // sum of all items' totalValue = inventory value at this count
  createdAt: string; // ISO string
}

// ============================================================
// CLOSINGS (Monthly/Yearly period locking)
// ============================================================
// A Closing permanently "locks" a calendar period (a month or a year).
// Once recorded, that period's figures (profit, expenses, withdrawals)
// are frozen as historical fact, alongside a snapshot of Business Worth
// at the moment of closing. Closings are never edited — only recorded
// or, in case of a mistake, deleted (which simply re-opens the period).
export type ClosingPeriodType = 'monthly' | 'yearly';

// [Closing Integrity Amendment v1.0] A Firestore security rule cannot run
// a range query ("does any Closing cover this date?") — it can only
// `get()` one document at a known path. This collection exists purely so
// that check becomes a plain, deterministic lookup: for any Expense/
// Withdrawal `date`, the rule derives id `monthly:YYYY-MM` and
// `yearly:YYYY` directly from the date string and checks whether either
// document exists. Never read by the UI for anything financial — the
// Closing document itself remains the source of truth for actual figures;
// this is a lock index, not a duplicate ledger.
export interface ClosedPeriod {
  id: string; // 'monthly:2026-07' or 'yearly:2026'
  periodType: ClosingPeriodType;
  startDate: string;
  endDate: string;
  closingId: string;
  closedAt: string; // ISO string
}

export interface Closing {
  id: string;
  periodType: ClosingPeriodType;
  periodLabel: string; // e.g. "Julho 2026" or "2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  // Embedded Profit is NOT realized income — no sales are ever recorded in
  // this app. It's the profit "built in" to inventory if it eventually
  // sells at the marked selling price. Never call this "netIncome" or
  // "revenue" anywhere in the UI.
  totalEmbeddedProfit: number;
  totalExpenses: number;
  totalWithdrawals: number;
  // Business Worth snapshot at the moment the period was closed.
  inventoryCostAtClose: number;
  inventoryMarketValueAtClose: number;
  businessWorthAtClose: number;
  closedAt: string; // ISO string
  // [Closing Integrity Amendment v1.0] A Closing is never deleted —
  // reopening supersedes it in place. 'active' (or absent, for every
  // Closing recorded before this field existed — treated as active) means
  // the period is currently locked and counted by isPeriodClosed/the
  // backdated-entry block. 'reopened' means an Owner has temporarily
  // unlocked the period for correction; the frozen totals above are left
  // untouched as the historical record of what this Closing originally
  // captured, and a brand-new Closing document is required to re-lock the
  // same period — this one is never revived or edited back to 'active'.
  status?: 'active' | 'reopened';
  reopenedAt?: string; // ISO string
  reopenedByUid?: string;
  reopenedByName?: string;
  reopenReason?: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

// ============================================================
// BATCH CALCULATIONS — no sales are ever recorded in this app.
// ============================================================
// A batch's remaining quantity (after quebras) has TWO independent
// values, always shown side by side, never netted into a single number
// that implies a sale happened:
//   - Investment Value = what was actually paid for the remaining stock
//     (remainingQuantity * costPrice)
//   - Market Value = what the remaining stock is marked to sell for
//     (remainingQuantity * sellingPrice)
//   - Embedded Profit = Market Value - Investment Value. This is
//     POTENTIAL profit baked into unsold inventory, never realized
//     income. Quebras reduce Investment Value and Market Value on the
//     exact same basis (remainingQuantity), so Embedded Profit shrinks
//     consistently on both sides.
export interface BatchCalculation {
  batch: StockBatch;
  totalQuebraQuantity: number;
  quebraValue: number; // quebra loss valued at cost
  remainingQuantity: number;
  investmentValue: number;
  marketValue: number;
  embeddedProfit: number;
  isEstimate: boolean; // true while batch is still 'open'
  hasExceededWarning: boolean;
}

export interface ProductReportDetail {
  product: Product;
  quantityEntered: number;
  totalInvestmentValue: number;
  quebras: {
    quebra: Quebra;
    batchCostPrice: number;
    value: number;
  }[];
  totalQuebraQuantity: number;
  totalQuebraValue: number;
  totalMarketValue: number;
  productEmbeddedProfit: number; // Market Value - Investment Value across all batches in range
  finalizedEmbeddedProfit: number; // from closed batches only
  estimatedEmbeddedProfit: number; // from still-open batches only
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  productDetails: ProductReportDetail[];
  totalEmbeddedProfit: number;
  totalExpenses: number;
  totalWithdrawals: number;
  expensesList: Expense[];
}

// ============================================================
// BUSINESS TIMELINE — chronological history of the business.
// ============================================================
// A TimelineEvent is a permanent, append-only record of something that
// happened in the business. It never drives any calculation — it is a
// read-only narration layer written alongside the existing collections at
// the moment each action already happens (see AppContext). Nothing here
// is ever edited; if a mistake needs correcting, a new event describing
// the correction is what would be added — the log itself stays intact.
export type TimelineActivityType =
  | 'initial-stock-count'
  | 'stock-batch-created'
  | 'stock-verification'
  | 'expense-recorded'
  | 'withdrawal-recorded'
  | 'quebra-recorded'
  | 'product-created'
  | 'business-profile-updated'
  | 'monthly-closing'
  | 'yearly-closing'
  | 'report-exported'
  | 'staff-removed'
  | 'staff-suspended'
  | 'staff-reactivated'
  | 'period-reopened';

export interface TimelineFinancialImpact {
  label: string; // e.g. "Investimento", "Despesa", "Retirada", "Perda"
  amount: number; // signed value: negative for money/stock leaving the business
  tone: 'positive' | 'negative' | 'neutral';
}

// ============================================================
// Module #20 (Notifications), Phase 1 (Foundations) — data model per
// docs/specs/20-notifications.md §20.1 (v1.1, Accepted), including
// [Amendment v1.1]'s `context`/`priority` fields (Business Rules 9/10).
// Authored field-by-field against that schema; no field invented here.
// One top-level `notifications/{notificationId}` collection (not
// business-nested) — see firestore.rules for the tenant-isolation
// mechanism this implies. Documents are never created client-side
// (Decision Gate 2) — only the server/Background Worker/webhook
// handler (20.5) write them, via the Admin SDK. `createdAt` uses this
// file's existing ISO-string convention (see `Subscription`, `Business`
// above), not a raw Firestore Timestamp type.
// ============================================================

// Exactly one of `businessId`/`userId` is set on any document, matching
// `scope` (Business Rule 1 / Decision Gate 1) — never both, never
// neither. Enforced by the writer (server-side), not by this type.
export type NotificationScope = 'business' | 'user';

// The five V1 categories (20.3, Decision Gate 4, as amended by
// [Amendment v1.2] — the Module #20 Category Amendment). Originally
// four; `staff` added by v1.2 to give staff-action confirmation events
// (suspend/reactivate/delete/set-tier/reset-pin — Business Rule 4,
// 20.5 Path 2) a category to belong to. Still fixed, not extensible
// without a further spec amendment.
export type NotificationCategory =
  | 'closing'
  | 'inventory_risk'
  | 'subscription'
  | 'platform_announcement'
  | 'staff';

// V1 implements exactly one delivery channel (20.4, Decision Gate 3).
// The field exists now so Email/WhatsApp are additive later, not a
// schema migration.
export type NotificationChannel = 'in_app';

export type NotificationStatus = 'unread' | 'read';

// Communication Priority Tiers [Amendment v1.1], 20.7 / Business Rule 10.
export type NotificationPriority = 'immediate' | 'timeline' | 'daily_summary';

// [Priority Reconciliation Amendment, v1.3, Accepted] Business
// significance of the underlying BusinessEvent (BDR-0006 §6) —
// independent of NotificationPriority, which is delivery strategy
// only. Optional here (not on the server's own literal payload type)
// because documents created before this amendment have no value for
// it and are never migrated — a client reading an old notification
// must not assume this field exists.
export type NotificationImportance = 'immediate' | 'high' | 'normal' | 'low';

// Pointer only — never duplicates the triggering record's financial
// data (Business Rule 3).
export interface NotificationPayloadRef {
  collection: string;
  documentId: string;
}

// [Amendment v1.1] Context-First Communication, 20.6 / Business Rule 9.
// Named `NotificationEventContext` (not `NotificationContext`) to avoid
// colliding with the React context of the same conceptual name in
// src/context/NotificationContext.tsx; the field on `Notification`
// itself is still named `context`, matching 20.1 exactly.
export interface NotificationEventContext {
  whatHappened: string;
  whyItMatters: string;
  recommendedAction: string | null;
}

export interface Notification {
  id: string;
  scope: NotificationScope;
  businessId: string | null;
  userId: string | null;
  category: NotificationCategory;
  type: string;
  payloadRef: NotificationPayloadRef;
  channel: NotificationChannel;
  status: NotificationStatus;
  dedupeKey: string;
  createdAt: string;
  context: NotificationEventContext;
  priority: NotificationPriority;
  // [Priority Reconciliation Amendment, v1.3] absent on documents
  // created before this amendment — see NotificationImportance's own
  // comment above.
  importance?: NotificationImportance;
}

export interface TimelineEvent {
  id: string;
  type: TimelineActivityType;
  date: string; // YYYY-MM-DD — the business date of the underlying record
  createdAt: string; // ISO string — exact moment the event was logged; used for time-of-day display and default sort
  userName: string; // display name of whoever performed the action
  title: string;
  description: string;
  financialImpact?: TimelineFinancialImpact[];
  // Free-form structured fields for the Detail View. Each activity type
  // populates only the keys relevant to it (e.g. a batch event carries
  // batchNumber/supplier/investment; an expense carries category/amount).
  details?: Record<string, string | number | undefined>;
  // Denormalized fields purely for filtering/search — never a source of truth.
  productName?: string;
  supplierName?: string;
  batchNumber?: string;
  expenseCategory?: string;
}
