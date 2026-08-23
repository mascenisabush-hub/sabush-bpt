// [Initial Stock Accidental Confirmation Recovery ("Void & Redo") —
// Implementation Authorization, §2 item 1] Only this file's
// StockCount.confirmedAt field (below) uses the SDK's Timestamp type
// rather than this file's usual ISO-string convention (see the
// Notifications block's own note on that convention). This is a
// deliberate, isolated departure: confirmedAt must be a server-
// enforced value comparable against `request.time` in firestore.rules
// (Rule 8 Assessment Finding B1) — a client-generated ISO string
// cannot be trusted for that purpose, since a manipulated client clock
// could otherwise extend an apparent recovery window.
import type { Timestamp } from 'firebase/firestore';

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

// [Increment B, Checkpoint B3 — Consolidated Specification §13-14
// (product-memory-purchase-selling-valuation-specification.md), Rule 8
// Assessment Finding 1, revised (product-memory-purchase-selling-
// valuation-rule8-assessment.md)]. The frozen, transaction-scoped
// "Concept C" system-derived selling valuation for ONE StockBatch.
// Written ONLY at the moment that batch is committed (addMultipleStockBatches),
// never retroactively, and ONLY when the product's Product Memory
// (Product.unitRelationship, a confirmed sellingUnit within it, and
// Product.sellingPrice) was valid AT THAT MOMENT -- its absence on a
// StockBatch is the ordinary, fully anticipated "no confirmed Product
// Memory yet" case (BDR-0012 §5.A Item 6), never an error, and never
// backfilled onto an older batch. This object is FULLY SEPARATE FROM,
// and never read by, StockBatch.sellingPrice/costPrice, calculateBatch,
// the Embedded Profit Engine, Business Worth, or any Dashboard/Report
// KPI (Rule 8 Finding 1, revised) -- it is never itself a claim that a
// sale occurred, at that price or any price, per the Consolidated
// Specification's own §24 non-goal. Once written, this ENTIRE object
// is governed by the same immutability discipline costPrice already
// has (BDR-0012 Decisions 15-16) -- never recalculated from whatever
// Product Memory says at a later read/display time (§14). Because
// ratePerPurchaseUnit is a RATE (MZN per one purchase unit), not an
// absolute converted selling-unit quantity, it remains correct against
// a live, quebra-reduced remaining quantity without ever needing to be
// updated itself (§15) -- see calculateDerivedTransactionValuation
// (Checkpoint B4) for the live-quantity multiplication this rate feeds.
export interface StockBatchDerivedSellingValuation {
  ratePerPurchaseUnit: number; // MZN implied selling value per ONE unit of this batch's OWN purchase unit (batch.unit) -- the frozen rate itself. Stored at full precision, never pre-rounded -- see purchaseToSellingConversion.ts's own header comment on why rounding belongs only at final-display time, not here.
  sellingUnit: string; // Product Memory's selling unit AT THE TIME of derivation -- audit/display only, never re-read from current Product Memory after this write
  sellingUnitPrice: number; // Product Memory's remembered selling price (Product.sellingPrice) AT THE TIME of derivation, in sellingUnit's own terms -- audit/display only, preserved verbatim, never itself recalculated
  unitRelationshipSnapshot: Array<{ unit: string; factorFromPrevious: number }>; // frozen copy of the confirmed chain used for this derivation -- audit/display only, independent of Product.unitRelationship's current value
  derivedAt: string; // ISO timestamp
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
  // [Increment B, Checkpoint B3] See StockBatchDerivedSellingValuation
  // above. Absent on every batch recorded before this checkpoint, and
  // on any batch (before or after) whose product had no confirmed
  // Product Memory at the moment it was recorded -- never backfilled.
  derivedSellingValuation?: StockBatchDerivedSellingValuation;
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

// Product Unit-of-Measure & Product Memory (BDR-0012, POL-0001-0006,
// product-unit-of-measure-specification.md §2 "Model B", Rule 8
// Assessment at docs/engineering/product-memory-purchase-selling-valuation-rule8-assessment.md
// Finding 5, Implementation Authorization Increment A — signed 2026-08-19
// by Product Architect SABUSHIMIKE MASCENI). Represents an owner-confirmed
// unit-of-measure relationship for one product — a single, strictly-
// ordered chain (BDR-0012 §5.A Item 3: exactly one relationship family
// per product; no family selector/identifier exists or is introduced).
// `units[0]` is the top-level/default unit (BDR-0012 §5.A Item 4);
// `factorFromPrevious` on `units[0]` is unused/ignored. `sellingUnit`,
// when set, MUST be one of `units[].unit` (POL-0005's minimum-
// configuration threshold) — see isValidUnitRelationship in
// lib/unitRelationship.ts, which is the single source of truth for this
// validation. Absence of `unitRelationship` on a Product means no
// confirmed configuration exists — the exact condition BDR-0012 §5.A
// Item 6 (warn, allow entry) and POL-0005 govern; this is NOT an error
// state. This type carries ONLY the unit relationship and selling unit —
// it is deliberately NOT where a remembered selling price lives; that
// remains Product.sellingPrice (the pre-existing "reference price"
// field, given meaning by unitRelationship.sellingUnit once confirmed —
// see Product.sellingPrice's own comment above). This type introduces no
// conversion arithmetic, no multi-hop composition, and no transaction-
// derived valuation of any kind — those remain Increment B's Concept C
// scope (product-memory-purchase-selling-valuation-specification.md
// §13-15), explicitly not implemented by Increment A.
export interface UnitRelationship {
  units: Array<{ unit: string; factorFromPrevious: number }>;
  sellingUnit?: string; // must be a member of units[].unit, per POL-0005 — validated by isValidUnitRelationship, never trusted un-checked
  confirmedAt: string; // ISO string — set only by the owner's explicit confirmation action (UOM Specification §3 steps 3-4); never written speculatively
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
  // Product Unit-of-Measure & Product Memory (see UnitRelationship
  // above). Written ONLY by the owner's explicit confirmation action
  // (Recognition proposal accepted, or manual entry confirmed) — never
  // inferred, never silently populated, never overwritten by a routine
  // purchase/count entry. Once set, reused automatically on every
  // future entry for this product (BDR-0012 Decision 13); Recognition
  // is never re-run for a product that already has this field
  // (UOM Specification §3 step 5). A purchase/count entry against a
  // product with no unitRelationship is warned, not blocked (BDR-0012
  // §5.A Item 6) — this field's absence is an ordinary, fully
  // anticipated state, not an error.
  unitRelationship?: UnitRelationship;
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
  // [Business Worth Evolution — Implementation Authorization, Increment 4;
  // Specification §15, FR-20] Display-only transparency marker: which
  // Contagem valuation mode produced this portion's own `sellingPrice`
  // above — 'A' if it was derived from a single Owner-entered reference
  // price via unit conversion (contagemMultiUnitValuation.ts), 'B' if the
  // Owner entered this exact portion's price directly (this codebase's
  // existing, unconditional, already-shipped default behavior — see that
  // file's own header comment). Optional, and absent on every record
  // created before this Increment shipped, mirroring sellingPrice's own
  // established optionality above — never backfilled. NEVER read by any
  // valuation calculation (sellingPrice/totalValue/totalSellingValue are
  // computed identically regardless of this field's value or absence) —
  // purely so the Owner, and any drill-down view, can see HOW a price was
  // arrived at (governing prompt's "do not hide unit conversions that
  // materially affect valuation" requirement), never a second source of
  // truth for the valuation itself.
  valuationMode?: ContagemValuationMode;
}

// [Business Worth Evolution — Implementation Authorization, Increment 4;
// Specification §15] The two Contagem valuation modes — see
// contagemMultiUnitValuation.ts's own header comment for the full design-
// pass resolution of Rule 8 open question #1 (Specification §36 item 1).
export type ContagemValuationMode = 'A' | 'B';

export type InitialCapitalBasis = 'cost' | 'selling';

export interface StockCount {
  id: string;
  type: StockCountType;
  label?: string; // owner-given label, mainly used for 'custom' counts
  date: string; // YYYY-MM-DD
  items: StockCountItem[];
  totalValue: number; // sum of all items' totalValue = inventory value at this count, COST basis (quantity * costPrice) — unchanged in meaning by the two fields below
  createdAt: string; // ISO string
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 5]
  // Present only on periodic counts recorded after this amendment.
  // The exact Expected Current Stock Value used as this count's
  // comparison baseline, frozen at record time — never recalculated
  // later from the live formula. Absent on the 'initial' count (it has
  // no baseline to compare against) and on every historical count
  // recorded before this field existed.
  expectedValueAtCount?: number;
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 items 1-2] The sum of quantity * sellingPrice across all
  // portions — the SELLING-basis counterpart to totalValue's cost
  // basis, computed and frozen at the same confirmation moment, never
  // discarding or replacing totalValue. Present on every StockCount
  // (both 'initial' and periodic types, per BDR-0014 Decision 7)
  // confirmed after this feature ships; absent on every historical
  // count recorded before it existed — never backfilled.
  totalSellingValue?: number;
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 items 2-4] ONLY ever present when type === 'initial'. A frozen,
  // per-count POINTER — never a monetary value of its own — recording
  // which of totalValue (cost) or totalSellingValue (selling) resolves
  // as initialCapitalValue for this business (see
  // resolveInitialCapitalValue, calculations.ts). Chosen once, by the
  // owner, before this count's own confirmation; immutable forever
  // after (enforced by the existing, unconditional
  // firestore.rules type=='initial' update/delete refusal — no rules
  // change was needed for this). Absent on every 'initial' count
  // confirmed before this capability existed — such a count's
  // initialCapitalValue resolves to totalValue (cost), exactly as it
  // already does today, permanently (BDR-0014 §5.A item 1,
  // prospective-only). Never present on a periodic-type count —
  // Periodic Contagem has no equivalent of "Initial Capital" and gains
  // no basis-choice concept from this feature (BDR-0014 Decision 7).
  initialCapitalBasis?: InitialCapitalBasis;
  // [Void & Redo — Implementation Authorization §2 item 1; Rule 8
  // Finding B1] Server-enforced confirmation timestamp, written with
  // the SDK's serverTimestamp() sentinel at confirm time — never a
  // client-generated value. This is the "confirmation event's own
  // timestamp" BDR-0015 Decision B / POL-0008 Rule B measures a
  // recovery window from. ONLY present on a `type: 'initial'`
  // confirmation created under this feature (original or redo); absent
  // on every 'initial' count confirmed before this capability existed
  // and on every periodic-type count (this feature has no bearing on
  // Periodic Contagem — POL-0008 Terminology). A record with this field
  // absent is, by construction, never eligible for Void & Redo (Rule 8
  // §11 — no migration, no backfill, no default-into-eligibility).
  confirmedAt?: Timestamp;
  // [Void & Redo — Implementation Authorization §2 item 1; Rule 8
  // Finding E1] This confirmation event's position in its Initial Stock
  // chain: 1 for the original confirmation, 2/3/4 for a first/second/
  // third redo. Present only alongside confirmedAt (i.e. only for a
  // confirmation created under this feature). A business may have at
  // most one confirmation at each position, and at most 4 positions
  // ever (POL-0008 Decision 5). chainPosition === 4 is the ceiling
  // marker: Void & Redo is unavailable against that confirmation, even
  // though its own 12-hour window [Recovery Window Amendment, amending
  // the original 30-minute value] is still computed and displayed
  // exactly like every other confirmation's (Specification §21).
  chainPosition?: 1 | 2 | 3 | 4;
  // [Void & Redo — Implementation Authorization §2 item 1] Present only
  // on a redo confirmation (chainPosition 2, 3, or 4) — the id of the
  // confirmation event it replaces (i.e. the confirmation voided to
  // produce this one). Absent on the original confirmation
  // (chainPosition 1, which redoes nothing). Purely a lineage pointer
  // for audit/history display (FR-9) — never read by any calculation
  // (initialCapitalValue resolution reads only the active confirmation,
  // Rule 8 Finding F1, independent of this field).
  redoesConfirmationId?: string;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1; Specification §14, FR-18, FR-19; Rule 8 Finding, Gap Analysis]
  // The AUTHORITATIVE, and only, marker distinguishing a "new-model"
  // Contagem (one that produces a BusinessWorthSnapshot) from a
  // historical, pre-capability record. Set true ONLY at the moment a
  // Contagem is confirmed under this model going forward — never
  // inferred from date, never backfilled onto any existing record.
  // Absent (or false) is the permanent, accurate state of every
  // pre-capability StockCount — mirrors the identical "no timestamp is
  // inferred, defaulted, or substituted" discipline confirmedAt already
  // establishes above. No code path may determine eligibility any other
  // way (e.g. comparing `date` against a cutover moment) — Specification
  // Decision 1 explicitly rejected a cutover-timestamp design.
  producesBusinessWorthSnapshot?: boolean;
}

// [Business Worth Evolution — Implementation Authorization, Increment 1;
// Specification §8; source BDR Decision 10] The authoritative FROZEN
// Business Worth measurement result produced by a single confirmed
// new-model Contagem. Deliberately a SEPARATE record type from
// StockCount, never merged with it and never a substitute for it:
// StockCount remains the physical measurement event; this is the
// financial result that measurement produced, frozen at that moment.
//
// Created exactly once per confirmed new-model Contagem, in the SAME
// atomic Firestore batch as the StockCount write (see recordStockCount,
// AppContext.tsx) — never independently, never retroactively.
//
// [Correction — Product Architect clarification, this session] The
// previous version of this comment stated cashPosition/
// receivablesPosition/payablesPosition are "always 0" and
// estimatedBusinessWorthImmediatelyBefore/difference are "always null"
// in Increment 1. Both were WRONG: a hard-coded 0 for a real financial
// position is a false zero, not an honest absence, and a permanent
// null written into an immutable historical record is a misleading
// value the system can never truthfully correct later. Corrected
// design: these five fields are OPTIONAL and are OMITTED ENTIRELY from
// a snapshot written before their own governing increment ships — the
// exact same "absent means this feature didn't exist yet when this
// record was written" idiom this codebase already uses everywhere else
// (expectedValueAtCount?, initialCapitalBasis?, chainPosition?, etc.),
// applied here for the first time to this new record type. Absent is
// never later silently backfilled (immutability, I-3, FR-6) — a field
// that was genuinely unavailable when a snapshot was created remains
// absent on that snapshot forever; only a NEW, later snapshot (from a
// later Contagem, once the governing increment has shipped) will carry
// it.
//
// measuredBusinessWorth itself is corrected to actually incorporate
// EXISTING, already-tracked financial activity — see that field's own
// comment below for the exact formula and why the previous
// productValuationTotal-alone version was an undercount, not a
// reasonable interim value.
export interface BusinessWorthSnapshot {
  id: string;
  businessId: string;
  // The Contagem (StockCount) that produced this snapshot.
  sourceStockCountId: string;
  // Server-recorded (Timestamp, via serverTimestamp()) — never a
  // client-computed value, matching the identical discipline
  // StockCount.confirmedAt already establishes above (Void & Redo
  // Implementation Authorization §2 item 1). This snapshot's own
  // immutable anchor — independent of, and not copied from, the source
  // StockCount's own (possibly absent, for a periodic count) confirmedAt.
  confirmedAt: Timestamp;
  // [Corrected] Frozen at confirmation time as:
  //   productValuationTotal
  //   + cashPosition + receivablesPosition − payablesPosition (when present)
  //   − totalExpensesAllTime − totalWithdrawalsAllTime (the EXISTING,
  //     already-tracked, all-time cumulative totals this codebase
  //     already computes today — AppContext.tsx's own existing
  //     businessWorth formula, line ~943, unchanged and reused here,
  //     not recomputed independently)
  // This mirrors the EXISTING, unmodified Business Worth Engine formula
  // (totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime)
  // exactly, with productValuationTotal (the Contagem's own MEASURED
  // physical count) standing in for totalMarketValueAllTime (the
  // batch-ledger's own ESTIMATE) — the entire point of a Contagem being
  // a more accurate, measured figure than the estimate it replaces.
  // cashPosition/receivablesPosition/payablesPosition are included only
  // when present (Increment 3+) — their absence in Increment 1 means
  // this formula correctly omits a term with no existing source, rather
  // than silently treating it as an included zero. Quebras need no
  // separate term here: a physical count already reflects any breakage
  // (broken stock simply isn't there to count), exactly as the existing
  // batch-ledger calculation already relies on for the same reason.
  // Resolves Rule 8 open question #4 (§36 item 4) for its ADDITIVE
  // STRUCTURE only, directly from the Specification's own FR-24 text
  // ("embeddedProfitTotal... never a second addend to
  // measuredBusinessWorth") — not an invented rule.
  measuredBusinessWorth: number;
  // The physical Contagem's own selling-basis (market) valuation total —
  // StockCount.totalSellingValue at the moment of confirmation. Matches
  // the existing Business Worth Engine's market-value convention
  // (calculations.ts calculateInventoryTotals' totalMarketValue), not a
  // new valuation basis.
  productValuationTotal: number;
  // Per-product drill-down. A frozen, self-contained line (not merely a
  // productId reference) — chosen here, for historical accuracy, over a
  // bare reference that could break if a Product is later renamed or
  // deleted. The exact reference-vs-frozen-value balance is Rule 8 open
  // question #2 (§36 item 2); this is Increment 1's implementation-time
  // resolution of it, not a business decision.
  productValuationDetail: BusinessWorthSnapshotProductValuationLine[];
  // Drill-down/explanatory only (FR-24) — never a second addend to
  // measuredBusinessWorth. Computed fresh, at confirmation time, from
  // the existing calculateInventoryTotals(batches, quebras) — the same
  // single source of truth Dashboard/Reports/Closings already use.
  embeddedProfitTotal: number;
  embeddedProfitDetail: BusinessWorthSnapshotEmbeddedProfitLine[];
  // [Corrected] Genuinely unavailable until Increment 3 (Cash Ledger/
  // Receivables/Payables) — confirmed, twice now, by direct repository
  // inspection to have no existing source anywhere in this codebase.
  // OPTIONAL and OMITTED on every Increment-1-created snapshot — never
  // written as a fabricated 0. A future Increment 3 snapshot will carry
  // real values here; an Increment-1-era snapshot simply lacks the
  // field, forever (immutability) — exactly like StockCount's own
  // expectedValueAtCount/initialCapitalBasis fields are absent on
  // records that predate THEIR features.
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 7; Specification §10 Decision 3, §22, FR-11, FR-55] The
  // Owner-CONFIRMED actual cash position as of this Contagem's own
  // date — never a mechanical read of the ledger-derived balance
  // (cashLedgerBalanceAtConfirmation, below, is that separate,
  // independently-frozen figure). This is the figure
  // computeMeasuredBusinessWorth's own cashPosition parameter now
  // receives (previously never passed — see that call site's own
  // comment, AppContext.tsx). Still OPTIONAL and OMITTED (never a
  // fabricated 0) on every pre-Increment-7 snapshot, for the identical
  // reason receivablesPosition/payablesPosition were omitted before
  // Increment 3 shipped.
  cashPosition?: number;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 7; Specification §10, FR-11] The ledger-derived cash balance (sum
  // of CashLedgerEntry inflow minus outflow, all-time) at the moment
  // of this confirmation — frozen here purely so a later drill-down can
  // show "system cash" and "physical cash" side by side (§22's own
  // possible-cause-guidance requirement), exactly as the Specification's
  // worked example does. Never itself fed into measuredBusinessWorth —
  // only cashPosition (the Owner-confirmed figure) is. Omitted on every
  // pre-Increment-7 snapshot, same discipline as every other optional
  // field on this record.
  cashLedgerBalanceAtConfirmation?: number;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 7; Specification §22, FR-11, FR-31, FR-32] cashPosition minus
  // cashLedgerBalanceAtConfirmation — a signed numeric reconciliation
  // signal ONLY, exactly mirroring `difference`'s own "never a default
  // classification beyond reconciliation signal" discipline (FR-32
  // applies identically here: never automatically labeled theft, loss,
  // error, or Quebra). Omitted on every pre-Increment-7 snapshot.
  cashReconciliationDifference?: number;
  receivablesPosition?: number;
  payablesPosition?: number;
  // Drill-down/explanatory — narrower-window (since the previous
  // snapshot, not all-time) sums of the EXISTING Expense/Quebra/
  // Withdrawal collections (unmodified by this capability,
  // FR-28-FR-30). [Corrected] Not all three are "already reflected in
  // the physical count" the way the previous version of this comment
  // claimed: breakagesSinceLastSnapshot genuinely is (broken stock
  // isn't there to count) — but expensesSinceLastSnapshot and
  // levantamentosSinceLastSnapshot are NOT reflected in a physical
  // stock count at all (they affect money, not counted quantity).
  // Their actual effect on measuredBusinessWorth is via the ALL-TIME
  // totalExpensesAllTime/totalWithdrawalsAllTime terms already
  // subtracted above — these three fields are a narrower, purely
  // informational window (since-last-snapshot, not all-time) for
  // reconciliation display only, never a SECOND subtraction on top of
  // the all-time terms already baked into measuredBusinessWorth.
  expensesSinceLastSnapshot: number;
  breakagesSinceLastSnapshot: number;
  levantamentosSinceLastSnapshot: number;
  // The prior Current Business Worth (the immediately-preceding
  // snapshot's own measuredBusinessWorth) — null ONLY for a business's
  // very first snapshot ever, which is a truthful null (there genuinely
  // is no prior snapshot), not a placeholder. Uses Increment 1's own §6
  // read path only — no dependency on Increment 2/3.
  previousCurrentBusinessWorth: number | null;
  // [Corrected] Genuinely unavailable until Increment 2's Estimated
  // Business Worth engine exists — computing a real value now would
  // require pretending that engine already exists, which it does not.
  // OPTIONAL and OMITTED on every Increment-1-created snapshot — never
  // written as a permanent, misleading null. A future Increment 2
  // snapshot will carry a real value here; an Increment-1-era snapshot
  // simply lacks the field, forever (immutability, I-3, FR-6).
  estimatedBusinessWorthImmediatelyBefore?: number;
  // measuredBusinessWorth − estimatedBusinessWorthImmediatelyBefore —
  // genuinely uncomputable while that term is unavailable (see above).
  // OPTIONAL and OMITTED for the identical reason, on the identical
  // schedule.
  difference?: number;
  // [Display-only, non-authoritative — same discipline as
  // computeInitialStockVoidEligibility's own "client display only, never
  // authoritative" precedent, calculations.ts. The AUTHORITATIVE 3-hour
  // correction-window enforcement, once Increment 8 implements it, will
  // be evaluated at the Security Rules layer directly against this
  // document's own real, server-set confirmedAt field (request.time <
  // confirmedAt + duration.value(3,'h')) — mirroring
  // initialStockConfirmationVoidable()'s exact existing pattern for the
  // analogous 12-hour window, which similarly stores no separate
  // expiresAt field of its own. This field is a client-computed
  // convenience only, subject to ordinary clock-skew, never trusted by
  // any rule.] Approximately confirmedAt + 3 hours.
  correctionWindowExpiresAt: string;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25, §26, §27, FR-39, FR-58] One-way transitions
  // only, and only via the narrow, field-locked update firestore.rules
  // permits: 'active' -> 'corrected' (an Owner correction performed
  // within the 3-hour window, §25) or 'active' -> 'superseded-by-
  // recovery' (a SuperAdmin-authorized recovery consumed within the
  // 72-hour ceiling, §26). Every other field on a snapshot in either
  // terminal status remains exactly as originally frozen — a
  // correction/recovery never edits any field but this one on the
  // original document; the corrected/recovered figures live on a NEW
  // snapshot instead (supersedesSnapshotId, below).
  status: 'active' | 'corrected' | 'superseded-by-recovery';
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25 FR-39, §26 FR-40] Set only on a snapshot
  // CREATED BY a correction or an authorized recovery — the id of the
  // original snapshot it supersedes. Never set on an ordinary Contagem
  // confirmation's own snapshot (Increments 1-7). Purely a lineage
  // pointer for audit/history display — never read by any Current/
  // Estimated Business Worth calculation beyond the ordinary "latest
  // active snapshot" selection those functions already perform (a
  // superseded snapshot's own status !== 'active' is what excludes it
  // from that selection — supersedesSnapshotId itself is not consulted
  // by any calculation).
  supersedesSnapshotId?: string;
}

// Frozen, self-contained per-product line for BusinessWorthSnapshot.productValuationDetail
// — see that field's own comment for why this is a frozen copy, not a bare reference.
export interface BusinessWorthSnapshotProductValuationLine {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  totalValue: number;
  // [Business Worth Evolution — Implementation Authorization, Increment 4;
  // Specification §15, FR-20] Frozen copy of the source StockCountItem's
  // own valuationMode (types.ts, StockCountItem) — same "display-only,
  // never read by any calculation, absent on every pre-Increment-4
  // snapshot, never backfilled" discipline as that field. Lets a historical
  // drill-down honestly show whether a given line's price was Owner-
  // entered directly (Mode B) or derived by unit conversion from a single
  // reference price (Mode A), exactly as it was at confirmation time —
  // never recomputed later.
  valuationMode?: ContagemValuationMode;
}

// Frozen, self-contained per-batch line for BusinessWorthSnapshot.embeddedProfitDetail.
export interface BusinessWorthSnapshotEmbeddedProfitLine {
  batchId: string;
  productId: string;
  productName: string;
  investmentValue: number;
  marketValue: number;
  embeddedProfit: number;
}

// ============================================================
// BUSINESS WORTH EVOLUTION — INCREMENT 8
// Owner Correction Window / SuperAdmin-Authorized Recovery
// (Specification §25-26; Plan §12-13; Authorization §20).
// ============================================================

// [Business Worth Evolution — Implementation Authorization, Increment
// 8; Specification §26, FR-40-FR-43] Deliberately the identical
// shipped shape InitialStockRecoveryAuthorization already establishes
// (request -> grant -> consume-or-expire, fixed slot, SuperAdmin-
// grants/Owner-consumes-only) — reused as a NEW, SEPARATE, PARALLEL
// type/collection, never merged with or read by the existing
// Initial-Stock-specific type above (FR-43). One-way status:
// 'unconsumed' -> 'consumed', via the one narrow, field-locked
// Owner-tier update firestore.rules permits (mirroring Plan §13's own
// "Consumption: Owner-only, via a new eligibility branch on whatever
// write path performs the correction" instruction) — there is
// deliberately no 'expired' status ever written by any code path;
// expiry is enforced entirely via the expiresAt comparison at
// consumption time, never by a status flip.
export type BusinessWorthRecoveryAuthorizationStatus = 'unconsumed' | 'consumed';

export interface BusinessWorthRecoveryAuthorization {
  // Always the literal string 'current' — the fixed-id-per-business
  // convention (Plan §13), identical in kind to
  // InitialStockRecoveryAuthorization.id.
  id: 'current';
  // The exact businessWorthSnapshots/{id} this Authorization names
  // (Specification §26 "one exact confirmation per Authorization,"
  // mirroring POL-0009 Rule O) — the business's current (status ===
  // 'active') snapshot at the moment of grant, re-verified, not
  // merely recorded, at both grant time (server) and consumption time
  // (firestore.rules).
  targetSnapshotId: string;
  // Carried alongside targetSnapshotId purely for display/traceability
  // (Plan §13's own field list) — never itself re-verified at
  // consumption time; targetSnapshotId is the sole authoritative
  // target.
  targetStockCountId: string;
  // Server-recorded grant moment — set only by the privileged server
  // via the Admin SDK's server timestamp, never client-supplied.
  authorizedAt: Timestamp;
  // authorizedAt + 72 hours, computed once at grant time (Specification
  // Decision 32/§26 — this capability's own figure, distinct from
  // POL-0009's 48-hour duration). Stored, not recomputed at read time.
  expiresAt: Timestamp;
  status: BusinessWorthRecoveryAuthorizationStatus;
  // The platform_operators/{uid} who granted this Authorization.
  grantedByUid: string;
  // Required, non-empty — carried into the platform_audit_log entry at
  // grant time.
  justification: string;
  // Set only at the moment of Owner consumption (the same client batch
  // that creates the new, corrected/recovered BusinessWorthSnapshot and
  // transitions the original's own status) — structurally distinct
  // from authorizedAt and from BusinessWorthSnapshot.confirmedAt,
  // mirroring InitialStockRecoveryAuthorization's own identical
  // distinctness requirement.
  consumedAt?: Timestamp;
}

// ============================================================
// BUSINESS WORTH EVOLUTION — INCREMENT 3
// Cash Ledger, Receivables, Payables (Specification §10-12).
// ============================================================

// [Business Worth Evolution — Implementation Authorization, Increment 3;
// Specification §10] An append-only ledger of GOVERNED cash-affecting
// events only — never a generic record of every arbitrary cash movement.
// A cash-financed +Stock purchase NEVER produces one of these (that
// purchase is, and remains, exclusively recorded via +Stock/PurchaseBatch
// — see AppContext.tsx's own addMultipleStockBatches, unmodified by this
// increment). No update/delete path exists for any role, at any time
// (I-4) — mirrors the existing InitialStockPriceChangeEvent/Timeline-event
// append-only precedent.
export interface CashLedgerEntry {
  id: string;
  businessId: string;
  direction: 'inflow' | 'outflow';
  amount: number;
  category: 'customer-payment' | 'supplier-payment' | 'expense' | 'levantamento' | 'other-governed-movement';
  sourceReference: {
    type: 'receivable' | 'payable' | 'expense' | 'withdrawal' | 'contagem-reconciliation' | 'other';
    id?: string;
  };
  occurredAt: string; // ISO string — the Owner-declared date of the event, e.g. a payment date
  createdAt: string; // ISO string — server-recorded write time, distinct from occurredAt
  createdBy: string; // uid, for auditability
}

// [Business Worth Evolution — Implementation Authorization, Increment 3;
// Specification §11] A manually-recorded debt — money owed TO the
// business. An unpaid Receivable contributes NOTHING to Business Worth
// (FIN-3) — only an actually-received payment does, via its own linked
// CashLedgerEntry (customer-payment).
export interface Receivable {
  id: string;
  businessId: string;
  totalAmount: number;
  // [Rule 8 open question §36 item 3, resolved here as a schema-shape
  // choice, not a business rule] Maintained as a denormalized running
  // total, updated transactionally alongside each payment write —
  // mirrors this codebase's own existing "amountPaid on the parent
  // document" precedent (Payable, below) rather than requiring a
  // subcollection read on every display. I-5 (amountPaid always equals
  // the sum of its own payments) is enforced at the write path
  // (recordReceivablePayment), not merely assumed.
  amountPaid: number;
  amountRemaining: number;
  status: 'unpaid' | 'partially-paid' | 'paid';
  createdAt: string; // ISO string
  description?: string;
  // Free-text, owner-entered — who owes this money. Not a reference to
  // any existing customer/user entity (this system has no customer
  // accounts) — a genuinely new, narrow field for exactly this purpose.
  debtorName?: string;
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  amountPaid: number;
  paidAt: string; // ISO string
  createdAt: string; // ISO string — server-recorded write time
  cashLedgerEntryId: string; // the CashLedgerEntry this payment produced
}

// [Business Worth Evolution — Implementation Authorization, Increment 3;
// Specification §12] Money the business OWES to a supplier — created
// only for Case 2 (supplier credit) at the same time +Stock records the
// acquisition (FR-14). Never created merely because a supplier was paid
// immediately (Case 1) — that payment, if made from recorded business
// cash, is its own CashLedgerEntry only, never a Payable.
export interface Payable {
  id: string;
  businessId: string;
  sourcePurchaseBatchId: string;
  supplierId?: string; // links to the existing reusable SupplierRecord, where one was used
  totalAmount: number;
  amountPaid: number; // denormalized running total — same discipline as Receivable.amountPaid, above
  amountRemaining: number;
  status: 'unpaid' | 'partially-paid' | 'paid';
  createdAt: string; // ISO string
}

export interface PayablePayment {
  id: string;
  payableId: string;
  amountPaid: number;
  paidAt: string; // ISO string
  createdAt: string; // ISO string — server-recorded write time
  cashLedgerEntryId: string;
}

// [Business Worth Evolution — Implementation Authorization, Increment 5;
// Specification §13, FR-16, FR-17] A narrow, residual record for Startup
// Investment spending that has no existing Product/Stock/Expense home —
// labor, wages, transport, licensing, preparation/renovation costs (FR-17).
// This is NEVER a general-purpose alternative to Expense recording, and it
// is NEVER itself the full Startup Investment figure — the full figure is
// a report-time aggregation of (referenced pre-baseline PurchaseBatch
// investment totals) + (referenced pre-baseline Expense totals) + (the sum
// of these entries), computed by computeStartupInvestmentTotal
// (calculations.ts), never a duplicated ledger (FR-16). Append-only — no
// update/delete path exists for any role, at any time, mirroring
// CashLedgerEntry's own I-4 discipline (see firestore.rules).
export interface StartupInvestmentEntry {
  id: string;
  businessId: string;
  category: 'labor' | 'wages' | 'transport' | 'preparation' | 'license' | 'other';
  amount: number;
  description?: string;
  recordedAt: string; // ISO string
  createdAt: string; // ISO string — server-recorded write time
  createdBy: string; // uid, for auditability
}

// [Void & Redo — Implementation Authorization §2 item 2; Rule 8 Finding
// G1, Direction 2 (adopted)] The additive, create-only artifact
// recording that a given `initial` StockCount confirmation has been
// voided via Void & Redo — WITHOUT ever mutating the original
// confirmation document. This is the entire mechanism by which
// BDR-0015 Decision D / POL-0008 Rule D ("the original confirmation is
// never edited or deleted... explicitly marked as voided") is
// satisfied while leaving firestore.rules' existing unconditional
// `type == 'initial'` update/delete refusal completely untouched
// (Architecture 8.6's "no exceptions" immutability tier — see that
// rule's own in-code comment).
//
// One document per successful void, ever. Never updated after
// creation (POL-0008 Rule I — no historical fact of a voided
// confirmation, including its voided marker, is ever rewritten).
// `initialStockCount` derivation treats a `type: 'initial'` StockCount
// as voided if, and only if, a VoidRecord exists whose
// voidedConfirmationId equals that StockCount's id (Rule 8 Finding F1).
export interface VoidRecord {
  id: string;
  // The id of the `type: 'initial'` StockCount this record voids.
  // Exactly one VoidRecord may ever exist per voidedConfirmationId —
  // enforced at the firestore.rules layer (a create precondition that
  // no VoidRecord already exists for this target), not by this type.
  voidedConfirmationId: string;
  // Server-enforced, exactly like StockCount.confirmedAt above and for
  // the identical reason (Rule 8 Finding B1) — the moment the void
  // itself was recorded. Informational only; the governing timestamp
  // for window/ceiling enforcement remains the voided confirmation's
  // own confirmedAt, never this field.
  voidedAt: Timestamp;
}

// [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1] A
// persistent, per-business, pre-confirmation Initial Stock draft. NOT
// Initial Capital — never read by initialCapitalValue, never part of
// Business Worth or Expected Current Stock Value while unconfirmed.
// Single document per business (fixed id 'initial'); confirming it
// deletes this document in the same Firestore batch that creates the
// permanent 'initial' StockCount.
// [SuperAdmin-Assisted Initial Stock Recovery — BDR-0016/POL-0009/
// Specification/Rule 8/Implementation Plan/Implementation Authorization,
// signed 2026-08-21] The Authorization artifact POL-0009's Terminology
// section defines: a SuperAdmin-granted, Owner-consumed, one-time,
// time-bounded permission that makes one named, otherwise-ineligible
// Initial Stock confirmation eligible to enter the existing Void & Redo
// flow. NOT itself a Void, a Redo, or a confirmation event of any kind
// (POL-0009 Terminology). Lives at a single, fixed document id
// ('current') per business — Implementation Plan §2/§5: "at most one
// active Authorization per business" (POL-0009 Rule T) is therefore a
// structural property of the collection, not a query-then-write race.
export type InitialStockRecoveryAuthorizationStatus = 'unconsumed' | 'consumed';

export interface InitialStockRecoveryAuthorization {
  // Always the literal string 'current' — the fixed-id-per-business
  // convention (Implementation Plan §2/§5). Included as a field, not
  // only as the document id, so a client reading this document can
  // self-verify it fetched the right shape without a second lookup.
  id: 'current';
  // The exact stockCounts/{id} this Authorization names (POL-0009 Rule
  // O — "one exact confirmation per Authorization"). Always the
  // business's current, not-yet-superseded confirmation at the moment
  // of grant (POL-0009 Rule U / BDR-0016 §9 Decision 3) — re-verified,
  // not merely recorded, at both grant time (server) and consumption
  // time (firestore.rules).
  targetStockCountId: string;
  // Server-recorded grant moment (POL-0009 Terminology: `authorizedAt`)
  // — set only by the privileged server via the Admin SDK's server
  // timestamp, never client-supplied. Structurally distinct from, and
  // never derived from or copied to, StockCount.confirmedAt (POL-0009
  // Rule S; Implementation Authorization Acceptance Criterion 7/8).
  authorizedAt: Timestamp;
  // authorizedAt + 48 hours, computed once at grant time (BDR-0016 §9
  // Decision 1; POL-0009 Rule R — final, Product-Architect-approved
  // figure, not a proposal). Stored, not recomputed at read time, so
  // firestore.rules' consumption-time check is a single request.time
  // comparison (Implementation Plan §4).
  expiresAt: Timestamp;
  // One-way: 'unconsumed' -> 'consumed', per the one narrow, field-
  // locked Owner-tier update firestore.rules permits (POL-0009 Rule Q;
  // Implementation Plan §10's atomic-consumption requirement). There is
  // deliberately no 'expired' status value written by any code path —
  // expiry is enforced entirely via the expiresAt comparison at
  // consumption time (Implementation Plan §16), never by a status
  // flip, so "unconsumed but past expiresAt" and "unconsumed and still
  // valid" are distinguished by time, not by an extra write nobody is
  // required to perform.
  status: InitialStockRecoveryAuthorizationStatus;
  // The platform_operators/{uid} who granted this Authorization
  // (POL-0009 Rule N — SuperAdmin grants; SuperAdmin never performs any
  // Void & Redo step itself).
  grantedByUid: string;
  // Required, non-empty (POL-0009 Rule V). Carried into the
  // platform_audit_log entry at grant time; never itself required to
  // uniquely identify the grant (the fixed document id/path already
  // does that).
  justification: string;
  // Set only at the moment of Owner consumption (the same client
  // batch that creates the voidRecords document) — structurally
  // distinct from authorizedAt and from StockCount.confirmedAt
  // (POL-0009 Rule S's distinctness requirement, extended to this
  // third timestamp).
  consumedAt?: Timestamp;
}

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
  // [Multi-level unit chain — Cross-Portion Auto-Computation feature]
  // A genuinely-new product's in-progress unit chain (the levels AFTER
  // this item's own `unit`), the selling-unit choice among that chain,
  // and the one canonical selling rate for the whole product — all
  // optional, all absent on any draft saved before this feature
  // existed or on an item that never configured one. Deliberately
  // persisted (unlike this feature's InitialStockCountView.tsx
  // predecessor, which kept the equivalent config UI-only) so a
  // mid-configuration chain survives a refresh.
  unitChain?: Array<{ unit: string; factorFromPrevious: number }>;
  chainSellingUnit?: string;
  sellingPricePerSellingUnit?: number;
}

export interface InitialStockDraft {
  items: InitialStockDraftItem[];
  date: string; // YYYY-MM-DD — the count date the owner has staged so far
  updatedAt: string; // ISO string
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 item 3] Mirrors StockCount.initialCapitalBasis, but here as the
  // owner's IN-PROGRESS, not-yet-confirmed selection — snapshot-level
  // (like `date` above), never per-item, matching Invariant I-1's
  // "one basis for the whole snapshot" rule even while still a draft.
  // Survives autosave/resurrection exactly like every other field on
  // this screen. Discarded (never migrated anywhere) the moment this
  // draft document is deleted at confirmation — see recordStockCount,
  // which reads the confirmed selection from its own explicit
  // parameter, never from this draft. Absent on a draft saved before
  // this capability existed, or before the owner has made a selection
  // yet; InitialStockCountView.tsx treats an absent value as 'cost'
  // for its own UI default, matching the confirmed-side backward-
  // compatibility default (BDR-0014 §5.A item 1).
  initialCapitalBasis?: InitialCapitalBasis;
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
// [Business Worth Evolution — Implementation Authorization §18, Increment
// 6] 'custom' is Fecho's own additive period type (Specification §18,
// FR-25–FR-27; Rule 8 Finding 8-A; Plan §9) — a baseline-anchored range,
// never an arbitrary Owner-chosen start/end pair. Confirmed clean against
// the one real code consumer that switches on `periodType`
// (`closingNotificationProducer.ts`), which already silently and
// correctly excludes any non-`monthly`/`yearly` Closing with zero code
// change required (Rule 8 Finding 8-A).
export type ClosingPeriodType = 'monthly' | 'yearly' | 'custom';

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
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6] Fecho's own timeline event type, distinct from the
  // calendar-aligned monthly/yearly closings above (Specification §18).
  | 'fecho-closing'
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

// The six V1 categories (20.3, Decision Gate 4, as amended by
// [Amendment v1.2] — the Module #20 Category Amendment — and by
// Business Worth Evolution Increment 7, Specification §22, FR-57).
// Originally four; `staff` added by v1.2 to give staff-action
// confirmation events (suspend/reactivate/delete/set-tier/reset-pin —
// Business Rule 4, 20.5 Path 2) a category to belong to; `business_worth`
// added by Increment 7, following the identical additive-enum-entry
// precedent, for reconciliation/preventive-reminder notifications
// (§22). Still fixed, not extensible without a further spec amendment.
export type NotificationCategory =
  | 'closing'
  | 'inventory_risk'
  | 'subscription'
  | 'platform_announcement'
  | 'staff'
  | 'business_worth';

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
