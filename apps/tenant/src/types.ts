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
  // SuperAdmin V1 Operational Control Plane, Phase C (ADR-0006, Gap 1 —
  // Product-Architect-confirmed). Set exclusively by the privileged
  // server (server/index.ts's business-suspension routes, via the
  // Admin SDK — firestore.rules blocks any client-side write to this
  // field, even by the business's own Owner). Missing/absent means
  // NOT suspended — same "optional field, false default" convention
  // already used by UserProfile.suspended (BDS #16), applied one level
  // up from staff to the whole business. Unlike UserProfile.suspended,
  // this never disables a Firebase Auth account — it is enforced
  // purely at the Firestore Rules layer (isBusinessSuspended(),
  // folded into isMemberOf()), so an Owner/Staff can still sign in and
  // see a clear suspended-state message; only business-scoped reads
  // and writes are denied.
  // SuperAdmin V1 Operational Control Plane, Phase E (BDR-0010,
  // POL-18-001) — Business Directory. Both fields optional/additive,
  // same "missing = default" convention already proven for `suspended`
  // (Phase C). Set exclusively by privileged server code (never
  // client-writable, matching the same principle) — `lastActivityAt`
  // via the new /api/business/touch-activity tenant-authenticated
  // endpoint (server/activityTouch.ts), `subscriptionStatusCache` via
  // the same already-server-side write sites that already set
  // subscriptions/{businessId}.status (server/subscriptionEngine.ts,
  // server/index.ts) — never a second source of truth for either.
  lastActivityAt?: string;
  subscriptionStatusCache?: string;
  // [Module #17 Owner Portfolio v0.2 addendum, currentWorth refresh
  // amendment — Accepted 2026-08-17, Stage 8 Authorization signed]
  // Non-authoritative, point-in-time cache of this shop's Business
  // Worth, read only by the Owner Portfolio screen — never by
  // Dashboard, Reports, the Business Worth Engine, Closings, or any
  // other module. Client-writable (unlike lastActivityAt/
  // subscriptionStatusCache above): the underlying computation is
  // itself entirely client-side (calculateInventoryTotals + the same
  // formula AppContext.tsx already uses for `businessWorth`), and
  // nothing outside the Portfolio ever reads this field, so a
  // client-supplied value carries none of the trust/security
  // implications those two server-only fields exist to guard against.
  // Populated only via an explicit, per-shop Admin refresh action —
  // never automatically, never on a schedule, never as a side effect
  // of any write. `value` is always the same figure the Business
  // Worth Engine would compute live for this shop, as of
  // `calculatedAt` — never a different or approximated formula.
  currentWorth?: {
    value: number;
    calculatedAt: string;
    sourceRevision?: string;
  };
}

// Module #19 (Subscriptions), Phase 1 — Business State Model's technical
// encoding, per docs/specs/19-subscriptions.md "Technical Status Model".
// These six values, and no others, are approved (POL-19-005). Phase 1
// only ever produces 'trial_pending' — the remaining five are reachable
// starting Phase 2 (Trial Engine) and Phase 3 (Subscription Lifecycle).
//
// [ADR-0005 / SuperAdmin Payment Operations migration] SubscriptionStatus
// and Subscription now live in packages/shared-types (the single source
// of truth both apps/tenant and apps/superadmin read) — re-exported here
// unchanged so nothing importing them from './types' (or '../types',
// etc.) anywhere in this app needed to change.
export type { SubscriptionStatus, Subscription } from '@sabush/shared-types';

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

// [Restock Observation Amendment v1.0 — 05-restock-observation-amendment.md]
// A purely informational, owner-provided physical observation recorded
// at the moment an EXISTING product is restocked: how much of it was
// physically left immediately before this new batch arrived. NEVER a
// sales record — `movement` may reflect sales, spoilage, internal use,
// theft, transfer, or counting error, and the system never attributes
// it to any single cause. NEVER read by calculateBatch,
// calculateInventoryTotals, businessWorth, capitalGrowth, or any other
// calculation in calculations.ts (amendment Part 6) — an information
// layer only. `previousRemainingQuantity` is the Owner's own explicit,
// entered-at-restock-time figure, the same "authoritative input, never
// inferred" discipline as InitialStockPriceChangeEvent.quantityRemaining
// above — unknown must remain unknown; the system never defaults this
// (or the resulting `movement`) to 0.
export interface StockBatchRestockObservation {
  previousRemainingQuantity: number;
  // previousCycleQuantity - previousRemainingQuantity, computed only
  // when both operands are known — see addStockBatch/
  // addMultipleStockBatches. Never itself a valuation input.
  movement: number;
  observedAt: string; // ISO string, same convention as StockBatch.createdAt
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
  // [Restock Observation Amendment v1.0] Absent on every batch created
  // before this amendment and on any batch where the operator declined
  // to provide the observation — never backfilled, and never present
  // for a brand-new product's first-ever batch (there is no previous
  // cycle to compare against). See the amendment doc for full rules.
  restockObservation?: StockBatchRestockObservation;
}

// ============================================================
// SUPPLIER (attached to a Purchase Batch, not to individual products)
// ============================================================
export interface Supplier {
  name: string;
  phone?: string;
  notes?: string;
}

// [Durable Purchase Capture Amendment v1.0] Reusable, tenant-scoped
// Supplier entity — deliberately a DIFFERENT type from `Supplier`
// above, which remains exactly as-is and continues to be what
// PurchaseBatch.supplier embeds as a historical, point-in-time
// snapshot. Editing a SupplierRecord must never rewrite any existing
// PurchaseBatch.supplier snapshot — see PurchaseBatch.supplierId's own
// comment below and the amendment's Part 7. Not itself a valuation
// input anywhere — see the amendment's Part 10.
export interface SupplierRecord {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string; // ISO string
  createdByName?: string; // display convenience, mirrors PurchaseBatch.createdByName — not audit-log-grade
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
  // [Durable Purchase Capture Amendment v1.0] Optional, additive —
  // present only on purchases finalized after this feature shipped
  // AND linked to a reusable SupplierRecord (selected existing, or a
  // new one created at finalization time). Absent on every historical
  // PurchaseBatch and on any purchase where no reusable supplier was
  // involved. The `supplier` field above remains the always-populated,
  // immutable historical snapshot regardless of whether this field is
  // present — this field is purely a forward-looking reference back to
  // the reusable SupplierRecord, never a replacement for the snapshot.
  supplierId?: string;
  // [Multi-Supplier Purchase Event Amendment v1.0] Optional, additive
  // correlation value — present only on PurchaseBatch documents the
  // Admin has explicitly indicated belong to the same broader
  // restocking activity as at least one other PurchaseBatch (Part 7:
  // lazy, explicit-click-only assignment, never set by default).
  // A plain client-generated string, never a Firestore document
  // reference — there is no PurchaseEvent collection or document
  // (Part 3). Does NOT change what this PurchaseBatch itself means —
  // it remains exactly what it already is: one supplier's delivery
  // (Part 4). Absent on every historical PurchaseBatch and on any
  // purchase the Admin never chose to correlate; never read by
  // calculateBatch, calculateInventoryTotals, or
  // calculatePurchaseBatchSummary (Part 12 — organizational metadata
  // only, not a valuation input).
  purchaseEventId?: string;
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
// Supplier-Wording Recognition, Confirmation & Conflict (BDR-0013,
// POL-0007, product-identity-alternative-name-specification.md,
// Terminology Amendment, Rule 8 Assessment — all governance docs at
// docs/specs/ and docs/engineering/). Represents one confirmed
// relationship between a specific supplier's own wording for a product
// and that product's identity. Established only during Add Stock or
// Smart Stock Entry ("supplier stock entry" — Rule 8 Assessment §0);
// never during Initial Stock, which has no supplier concept and is not
// a target of this type. `confirmedAt` is required for correctness
// (Rule 8 Finding 19 — distinguishes "confirmed" from "merely
// proposed," needed by future reuse-matching logic). `provenance` and
// `confirmedByName` are optional, implementation-time-discretion
// metadata per the same finding — not required by any accepted
// business rule. This type introduces no matching, normalization, or
// confirmation-flow behavior itself (all deferred to a later,
// separately-authorized checkpoint).
export interface SupplierWordingRelationship {
  supplierRecordId: string; // SupplierRecord.id — reusable, forward-looking identity (Rule 8 Finding 2), not PurchaseBatch.supplier's immutable snapshot
  wording: string; // the supplier's own wording, as confirmed
  confirmedAt: string; // ISO string — required, see note above
  provenance?: 'system-proposed' | 'owner-initiated'; // optional, POL-0007 governs both identically once established
  confirmedByName?: string; // optional, display convenience only — mirrors SupplierRecord.createdByName/PurchaseBatch.createdByName; not audit-log-grade
}

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
  // Supplier-Wording Recognition (BDR-0013/POL-0007/Specification, see
  // SupplierWordingRelationship above). A product may have zero or more
  // confirmed relationships, one per (supplier, wording) pair, each
  // pointing back to this same product. This field is strictly
  // additive — `name` above remains the single primary/reference name
  // (BDR-0013 item 2); nothing here replaces or renames it. Inline
  // array, not a subcollection (Rule 8 Finding 1) — deletes atomically
  // with the parent Product document, requiring no change to
  // deleteProductPlan.ts. Populated only by a later, separately
  // authorized checkpoint — this field's presence alone implements no
  // matching, candidate-detection, or confirmation behavior.
  supplierWordings?: SupplierWordingRelationship[];
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
// ============================================================
// PAYMENTS (Module #19 V1 Manual Payment Bridge)
//
// Temporary manual confirmation bridge — NOT the final payment
// architecture. PaySuite/PayTED automated processor integration
// remains deferred pending vendor verification (see
// docs/engineering/19-v1-payment-adapter-contract-and-test-matrix.md).
// A Payment record here is submitted by a Business Owner after paying
// externally (M-Pesa/e-Mola/Millennium BIM), then confirmed or
// rejected by a privileged, server-side-only mechanism — never by the
// client, never by the submitting Owner themselves. Confirmation is
// the ONLY thing that ever calls the Subscription Lifecycle Engine's
// applyLifecycleEvent() with a payment_success event; this record
// itself never mutates subscription.status directly, at any point.
//
// Payment status is deliberately a separate concept from Subscription
// status (src/types.ts SubscriptionStatus) — a 'pending' Payment has
// no effect on the subscription at all until confirmed.
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';
export type PaymentMethod = 'mpesa' | 'emola' | 'bim';

// [ADR-0005 migration] Payment now lives in packages/shared-types too —
// see the SubscriptionStatus/Subscription re-export above for why. The
// PaymentStatus/PaymentMethod literal unions above are kept as local
// aliases (identical values) rather than re-exports, since a handful of
// files in this app reference them as standalone types independent of
// Payment itself; no behavior difference either way.
export type { Payment } from '@sabush/shared-types';

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
  // [Module #10 — Selling Price on Stock Counts] The expected selling
  // price per unit at the time of the count, recorded alongside
  // costPrice so historical stock reconciliation can see both what the
  // owner paid and what the stock was expected to sell for — mirrors
  // StockBatch's existing costPrice/sellingPrice pair (see StockBatch
  // above). Optional because every StockCountItem persisted before this
  // field existed has no sellingPrice — those historical documents
  // remain readable as-is; this is never backfilled. Purely additional
  // information: it does NOT feed Expected Current Stock Value or the
  // Investment Value calculation, which remain cost-based (see
  // BATCH CALCULATIONS note below and the amendment doc's Part 5).
  sellingPrice?: number; // selling price per unit at the time of the count
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
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 5]
  // Present only on periodic counts recorded after this amendment.
  // The exact Expected Current Stock Value used as this count's
  // comparison baseline, frozen at record time — never recalculated
  // later from the live formula. Absent on the 'initial' count (it has
  // no baseline to compare against) and on every historical count
  // recorded before this field existed.
  expectedValueAtCount?: number;
}

// [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1] A
// persistent, per-business, pre-confirmation Initial Stock draft. NOT
// Initial Capital — never read by initialCapitalValue, never part of
// Business Worth or Expected Current Stock Value while unconfirmed.
// Single document per business (fixed id 'initial'); confirming it
// deletes this document in the same Firestore batch that creates the
// permanent 'initial' StockCount.
export interface InitialStockDraftItem {
  id: string; // stable client-generated row id, so edits round-trip cleanly
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  // [Module #10 — Selling Price on Stock Counts] Optional for the same
  // backward-compatibility reason as StockCountItem.sellingPrice above —
  // drafts saved before this field existed have no sellingPrice.
  sellingPrice?: number;
}

export interface InitialStockDraft {
  items: InitialStockDraftItem[];
  date: string; // YYYY-MM-DD — the count date the owner has staged so far
  updatedAt: string; // ISO string
}

// [Stock Count Data-Loss Resilience — Implementation Task, Section 1]
// Persistent, per-business Periodic Contagem draft. Sibling to
// InitialStockDraft above, deliberately NOT sharing code with it (the
// frozen specification's §5 explicitly does not authorize a shared
// hook/utility between the initial and periodic draft mechanisms).
// Single document per business (fixed id 'periodic', matching
// `initial`'s own singleton shape) — periodic `stockCounts` creation is
// already Owner-only, so this does not need to support concurrent
// multi-user editing of the same periodic count (frozen spec §5).
// Never itself a StockCount; never read by any valuation calculation.
export interface PeriodicStockDraftItem {
  // Mirrors StockCountWorkingRow's shape (utils/stockCount.ts) as
  // persisted — optional fields are omitted entirely when absent,
  // never written as literal `undefined` (Firestore rejects that; see
  // savePurchaseDraft's own documented fix for this exact class of bug).
  productId?: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  removed?: boolean;
}

export interface PeriodicStockDraft {
  items: PeriodicStockDraftItem[];
  type: StockCountType;
  label?: string;
  date: string;
  // [Implementation Task, Section 3/4b] The stable submission identity
  // every retry of the same logical finalization attempt reuses.
  // Present once the operator has entered the mandatory Counted/Not
  // Counted confirmation step at least once; absent while still
  // editing. This field's durability (written immediately, not
  // debounced, before finalization begins) is what makes the
  // deterministic-id idempotency mechanism survive a crash-and-retry —
  // see the Implementation Task's §3/§4b for why this is required, not
  // merely convenient.
  submissionId?: string;
  updatedAt: string; // ISO string
}

// [Durable Purchase Capture Amendment v1.0] A persistent, per-user,
// pre-finalization Purchase Draft — the Add Stock analogue of
// InitialStockDraft above, deliberately modeled on it. NOT inventory —
// never read by calculateBatch, calculateInventoryTotals,
// calculatePurchaseBatchSummary, expectedCurrentStockValue,
// businessWorth, capitalGrowth, capitalGrowthPct, or
// initialCapitalValue while unfinalized (amendment Part 10). One
// document per (businessId, uid) — the document ID IS the owning
// user's own Firebase Auth uid, so two team members' drafts can never
// collide (Rule 8 Assessment, Section 11). Finalizing deletes this
// document in the same Firestore batch that creates the real
// PurchaseBatch/StockBatch records; a failed finalization never
// deletes it, since the delete lives in the same all-or-nothing batch.
export interface PurchaseDraftLineItem {
  id: string; // stable client-generated row id, so edits round-trip cleanly
  productName: string;
  dateEntered: string; // YYYY-MM-DD
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  // [Restock Observation Amendment v1.0] Optional, draft-only mirror of
  // the same field on AddStockParams — carried through autosave/restore
  // so an interruption while filling this in isn't silently lost.
  // Absent (not 0) means "not yet entered" / "I don't know" for this
  // draft row, same "never invent 0" discipline as the finalized
  // observation itself.
  previousRemainingQuantity?: number;
}

export interface PurchaseDraft {
  items: PurchaseDraftLineItem[];
  // Supplier is EITHER a reference to an existing SupplierRecord
  // (supplierId set) OR free-text fields for a not-yet-created
  // supplier (supplierId absent) — never both meaningfully populated
  // at once. A brand-new supplier is not created as a real
  // SupplierRecord until finalization, mirroring how a new Product is
  // not created until finalization today (Rule 8 Assessment, Section
  // 13) — an abandoned, never-finalized draft must not leave
  // permanent master data behind.
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierNotes?: string;
  date: string; // YYYY-MM-DD — purchase date staged so far
  notes?: string; // batch-level notes, mirrors PurchaseBatch.notes
  // [Multi-Supplier Purchase Event Amendment v1.0] Optional, additive
  // — carries a Purchase Event correlation forward through the
  // existing durable-draft mechanism (autosave/restore), so an
  // interruption (crash/refresh) while entering a SECOND supplier's
  // products, after the Admin has already chosen to correlate it with
  // a first (already-finalized) PurchaseBatch, does not silently lose
  // that correlation. Mirrors PurchaseBatch.purchaseEventId's own
  // meaning exactly — this field carries no other purpose.
  purchaseEventId?: string;
  updatedAt: string; // ISO string
}

// ============================================================
// INITIAL STOCK PRICE CHANGE EVENTS
// ============================================================
// [Initial Stock Valuation History] Records a price change affecting
// units of a product still remaining from the original 'initial'
// StockCount, WITHOUT editing that StockCount. The 'initial' StockCount
// (and therefore initialCapitalValue) remains a permanently immutable
// historical snapshot — see StockCount/type above and firestore.rules'
// "no exceptions" tier for type === 'initial'. This is a parallel,
// append-only audit trail that lets later valuation figures use current
// pricing for the units that are still around, without rewriting history.
//
// QUANTITY SEMANTICS: this app records no sales/POS ledger (Architecture
// non-goal — see CLAUDE.md Rule 3/4), so there is no reliable, derivable
// "units of the original Initial Stock still remaining" figure anywhere
// in the data model. quantityRemaining is therefore the Owner's own
// explicit, entered-at-event-time figure — the authoritative input, not
// a value the system reconstructs. It is validated (>0, not exceeding
// the original item's quantity) but never inferred.
//
// MULTIPLE EVENTS: a product can have any number of these, one per price
// change. Each is immutable once created (see firestore.rules — update
// and delete are both refused unconditionally, the same "no exceptions"
// tier as the 'initial' StockCount itself). The most recent event (by
// effectiveDate, tie-broken by createdAt) is the one that reflects
// current reality for that product; earlier ones remain as history, not
// superseded/mutated in place. See calculations.ts
// (calculateInitialStockCurrentValuation) for how "most recent" is
// resolved deterministically.
export interface InitialStockPriceChangeEvent {
  id: string;
  businessId: string;
  productId: string;
  productName: string; // denormalized at creation, same pattern as StockCountItem.productName
  effectiveDate: string; // YYYY-MM-DD
  // Quantity of the ORIGINAL Initial Stock still remaining/affected at
  // the moment of this price change (Owner-entered — see note above).
  quantityRemaining: number;
  // Snapshot of what the price was immediately before this event — the
  // original 'initial' StockCount's item values the first time this
  // product is repriced, or the previous event's new* values for a
  // second-or-later reprice of the same product. Recorded for audit
  // legibility only; never itself read by any calculation.
  previousCostPrice: number;
  previousSellingPrice: number;
  newCostPrice: number;
  newSellingPrice: number;
  reason?: string;
  createdAt: string; // ISO string
  createdBy: string; // uid of the Owner who recorded this event
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
