import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  getDoc,
  onSnapshot,
  writeBatch as createFirestoreBatch,
  runTransaction,
  deleteField,
  serverTimestamp,
  type WithFieldValue,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { normalizeStockCountItems } from '../utils/stockCount';
import { buildProductCostBasisMap } from '../lib/fr67CostBasisConversion';
import { planDeleteProduct } from '../utils/deleteProductPlan';
import { computeBatchIdsToCheck, computeBatchesToClose, type CheckedBatchSnapshot } from '../lib/openBatchSupersession';
import {
  planSupplierWordingConfirmation,
  SupplierWordingConflictError,
  buildProductCreatedTimelineEventContent,
  type CheckedProductWordingSnapshot,
} from '../lib/supplierWordingConfirmation';
import { isValidUnitRelationship, confirmUnitRelationship, type UnitRelationshipProposal } from '../lib/unitRelationship';
import { buildDerivedSellingValuationSnapshot } from '../lib/purchaseToSellingConversion';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  Product,
  StockBatch,
  Quebra,
  Expense,
  UserProfile,
  Business,
  StaffMember,
  StockCount,
  StockCountType,
  InitialStockDraft,
  InitialStockDraftItem,
  PeriodicStockDraft,
  PeriodicStockDraftItem,
  PurchaseDraft,
  PurchaseDraftLineItem,
  SupplierRecord,
  Withdrawal,
  Closing,
  ClosedPeriod,
  ClosingPeriodType,
  PurchaseBatch,
  Supplier,
  TimelineEvent,
  TimelineActivityType,
  TimelineFinancialImpact,
  PairedDevice,
  StaffTier,
  ManagerPermissions,
  Subscription,
  Payment,
  PaymentMethod,
  InitialStockPriceChangeEvent,
  InitialCapitalBasis,
  SupplierWordingRelationship,
  UnitRelationship,
  VoidRecord,
  InitialStockRecoveryAuthorization,
  BusinessWorthRecoveryAuthorization,
  BusinessWorthSnapshot,
  BusinessWorthSnapshotProductValuationLine,
  BusinessWorthSnapshotEmbeddedProfitLine,
  CashLedgerEntry,
  Receivable,
  ReceivablePayment,
  Payable,
  PayablePayment,
  StartupInvestmentEntry,
  CashPositionDeclaration,
  ContagemValuationMode,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_BATCHES, INITIAL_QUEBRAS, INITIAL_EXPENSES } from '../data/sampleData';
import { calculateInventoryTotals, calculateBatch, groupQuebrasByBatch, generateReportSummary, isDateInRange, calculateInitialStockCurrentValuation, resolveInitialCapitalValue, computeInitialStockVoidEligibility, computeInitialStockAuthorizedRecoveryEligibility, getCurrentBusinessWorth, getEstimatedBusinessWorth, computeMeasuredBusinessWorth, sumOutstandingPayables, sumOutstandingReceivables, buildProductValuationDetail, resolveStartupInvestmentWindow, computeStartupInvestmentTotal, resolveActiveBusinessWorthBaselineDate, getLedgerDerivedCashBalance, computeCashReconciliationDifference, computeBusinessWorthCorrectionEligibility, computeBusinessWorthAuthorizedRecoveryEligibility, type VoidEligibility, type AuthorizedRecoveryEligibility } from '../utils/calculations';
import { generateBatchNumber, getNextBatchSeq, resolveSupplierForPurchase } from '../utils/purchaseBatchCalculations';
import { computeRestockObservation, findMostRecentBatchForProduct } from '../lib/restockObservation';
import { getTodayDateString } from '../utils/formatters';
import { SUBSCRIPTION_PLAN_PRICE_MZN, SUBSCRIPTION_PLAN_CURRENCY } from '../data/subscriptionPlan';

// [Smart Stock Entry — Tier 1] Client-side mirror of the server's
// FieldState<T>/proposal shapes (server/smartStockEntry.ts) — duplicated
// deliberately rather than imported, since src/ and server/ are separate
// build targets in this repository (no shared package) and this shape is
// small and stable. `status` drives the ✓ Detected / ⚠ Review / — Not
// found indicator; `value` is null whenever status is 'not_found'.
export interface SmartStockEntryFieldState<T> {
  value: T | null;
  status: 'detected' | 'review' | 'not_found';
}

export interface SmartStockEntryLineItemProposal {
  productName: SmartStockEntryFieldState<string>;
  quantity: SmartStockEntryFieldState<number>;
  unit: SmartStockEntryFieldState<string>;
  costPrice: SmartStockEntryFieldState<number>;
  productMatch: { status: 'confident' | 'uncertain' | 'no_match'; productId: string | null };
}

export interface SmartStockEntryProposal {
  lineItems: SmartStockEntryLineItemProposal[];
  supplierName: SmartStockEntryFieldState<string>;
  documentDate: SmartStockEntryFieldState<string>;
}

export type SmartStockEntryFailureReason =
  | 'invalid_upload'
  | 'too_large'
  | 'unsupported_type'
  | 'provider_unavailable'
  | 'unreadable'
  | 'network_error';

export type SmartStockEntryScanResult =
  | { success: true; proposal: SmartStockEntryProposal }
  | { success: false; reason: SmartStockEntryFailureReason };

interface AddStockParams {
  productName: string;
  dateEntered: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  // [Restock Observation Amendment v1.0] The operator's optional,
  // explicit "how much was physically left before this restock"
  // observation. `undefined`/blank means "I don't know" — never
  // treated as 0. Only meaningful (and only ever produces a persisted
  // restockObservation) when this product already has a prior batch to
  // compare against — see computeRestockObservation.
  previousRemainingQuantity?: number | string;
  // [Supplier-Wording Recognition — Checkpoint 3] Set only when this
  // line item's `productName` was rewritten, client-side, from a
  // supplier's own wording to an existing product's canonical
  // `Product.name` (a candidate confirmation, a reuse-match, or an
  // owner-initiated declaration — AddStockView.tsx). `wording` preserves
  // exactly what was originally typed/received, for the relationship
  // record (SupplierWordingRelationship.wording); `productName` above
  // has ALREADY been rewritten to the matched product's name by the
  // time this reaches addMultipleStockBatches, so this field never
  // changes which product the batch itself attaches to — it only tells
  // addMultipleStockBatches a NEW relationship needs to be confirmed
  // (via confirmSupplierWordingRelationship, transaction-protected —
  // Rule 8 Finding 13) once the supplier's own identity is resolved.
  // Deliberately absent for a silent reuse-match (no NEW relationship to
  // write — POL-0007's automatic-reuse-without-reconfirmation) and for
  // any row with no recognition involved at all.
  pendingSupplierWording?: {
    wording: string;
    provenance: 'system-proposed' | 'owner-initiated';
    // Other candidate productIds the owner was shown for this same
    // wording (if any) — re-checked fresh inside the confirmation
    // transaction so a concurrent confirmation onto one of THEM is
    // caught, not silently overwritten (Rule 8 Finding 13).
    conflictCheckProductIds: string[];
  };
  // [Supplier-Wording Recognition — Checkpoint 5, POL-0007 "Conflicting
  // Supplier Wording"] Present only for a row where the owner declined a
  // candidate that already carried an established alternative-wording
  // relationship to a DIFFERENT product (AddStockView.tsx's
  // supplierWordingConflictPending gate) and is therefore creating a
  // genuinely new product in response to that conflict. Captured on the
  // resulting product-created timeline event (TimelineEvent.details is
  // already a free-form Record<string, string | number | undefined> —
  // no new Product field, no new collection, no schema change of any
  // kind). Field shape and persistence mechanism are implementation-time
  // engineering judgment, explicitly authorized by Rule 8 Finding 9 and
  // quoted verbatim as a binding technical decision in the
  // Implementation Authorization's own §2 — not a new business rule.
  distinguishingInfo?: string;
  // [Product Memory / UOM — Increment A] Set only when this line's
  // productName resolves to a GENUINELY NEW product (no existing
  // Product matched) AND the owner has explicitly confirmed a unit
  // relationship for it in the same entry flow — e.g. via a UOM
  // Recognition proposal accepted, or manual entry, per the accepted
  // UOM Specification §3 steps 3-4. Deliberately absent whenever the
  // line resolves to an EXISTING product: an existing product's
  // unitRelationship, confirmed or not, is NEVER touched by this
  // field (BDR-0012 Decision 17's "never re-run/never silently
  // overwrite" rule) — addStockBatch/addMultipleStockBatches below
  // enforce this by only ever reading this field inside the
  // brand-new-product creation branch. Re-validated via
  // isValidUnitRelationship before being written; an invalid or
  // missing value simply results in no unitRelationship being set on
  // the new Product (BDR-0012 §5.A Item 6's warn-not-block condition),
  // never a thrown error and never a partial/invalid write.
  unitRelationship?: UnitRelationship;
}

interface AddQuebraParams {
  productId: string;
  batchId: string;
  date: string;
  quantityLost: number;
  reason: string;
  // [Bug fix — no duplicate-submission protection] Optional, backward-
  // compatible — see addQuebra's own comment for the full idempotency
  // mechanism this enables.
  submissionId?: string;
}

interface AddExpenseParams {
  date: string;
  description: string;
  amount: number;
  category?: string;
  submissionId?: string;
}

interface AddWithdrawalParams {
  date: string;
  amount: number;
  reason?: string;
  notes?: string;
  submissionId?: string;
}

interface RecordStockCountItemInput {
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice?: number;
  // [Product Memory / UOM — Increment A] Same rule as
  // AddStockParams.unitRelationship, above: read ONLY when this row's
  // productName resolves to a genuinely new product within
  // recordStockCount's own product-creation branch; never touches an
  // existing product's configuration. Initial Stock is frequently the
  // very first time a product is entered at all (UOM Specification §4,
  // "Initial Stock" — the general first-time-entry trigger applies here
  // too), so this is the primary surface this field exists for; it
  // applies identically for a genuinely new product introduced during
  // Periodic Contagem.
  unitRelationship?: UnitRelationship;
  // [Business Worth Evolution — Implementation Authorization, Increment 4;
  // Specification §15, FR-20] Optional, display-only pass-through — see
  // StockCountItem.valuationMode's own comment (types.ts). Flows,
  // unmodified, through normalizeStockCountItems (utils/stockCount.ts,
  // itself already extended with the identical optional pass-through)
  // into countItems below and from there into
  // BusinessWorthSnapshotProductValuationLine.valuationMode. Never read
  // by any arithmetic in this function.
  valuationMode?: ContagemValuationMode;
}

interface RecordStockCountParams {
  type: StockCountType;
  label?: string;
  date: string;
  items: RecordStockCountItemInput[];
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 5]
  // The Expected Current Stock Value at the moment this periodic count
  // is being recorded — frozen into the resulting StockCount document.
  // Never set for type === 'initial' (it has no baseline to compare
  // against yet).
  expectedValueAtCount?: number;
  // [Stock Count Data-Loss Resilience — Implementation Task, Section 3]
  // The stable submission identity (client-generated, established and
  // persisted durably before this call — see PeriodicStockDraft's own
  // comment) that every retry of the same logical periodic finalization
  // reuses. Required for type !== 'initial' (enforced below); never set
  // for type === 'initial', which keeps its own pre-existing fixed-id
  // scheme untouched.
  submissionId?: string;
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 items 2, 5] The owner's confirmed choice of which retained
  // valuation total ('cost' or 'selling') resolves as this business's
  // initialCapitalValue, going forward. Only ever meaningful for, and
  // only ever set by, the type === 'initial' caller
  // (InitialStockCountView.tsx) — never set for a periodic count,
  // mirroring exactly how expectedValueAtCount, above, is the reverse
  // (periodic-only, never set for 'initial'). Written into the
  // resulting StockCount document once, at confirmation, and never
  // read or referenced again by this function after that single write
  // — the frozen field on the persisted document, not this transient
  // parameter, is what makes the choice permanent (types.ts,
  // StockCount.initialCapitalBasis).
  initialCapitalBasis?: InitialCapitalBasis;
  // [Void & Redo — Implementation Authorization §2 items 5-6; Rule 8
  // Findings D1, F1] Present ONLY when this call is producing a REDO
  // confirmation (chainPosition 2, 3, or 4) — the id of the
  // confirmation event this redo replaces (i.e. the confirmation that
  // was just voided). Never set for the original confirmation. When
  // set: (a) the "already has an Initial Stock Count" guard below,
  // which exists solely to block an accidental SECOND ORIGINAL
  // confirmation, does not apply — firestore.rules independently and
  // authoritatively enforces every Void & Redo precondition regardless
  // of this client-side guard (Rule 8 Finding F2); (b) this function
  // resolves the correct fixed chain-slot id/chainPosition from this
  // value alone (never trusted from a separately-passed chainPosition
  // parameter, to keep a single source of truth) and writes
  // confirmedAt as a genuine serverTimestamp() sentinel, matching
  // firestore.rules' own confirmedAt === request.time requirement for
  // every redo branch.
  redoesConfirmationId?: string;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1; Specification §14, FR-18, FR-19; Implementation Plan §4] Supplied
  // by the caller (a UI decision point, or a business-level "is this
  // business now on the new model" read — an implementation, not
  // business, detail) — recordStockCount itself does not decide this.
  // When true, the resulting StockCount is marked
  // producesBusinessWorthSnapshot: true and a corresponding
  // BusinessWorthSnapshot is created atomically in the same batch (§5,
  // below). Never set for a call reconstructing/redoing a historical
  // confirmation via Void & Redo (that mechanism is entirely separate —
  // Implementation Plan §13's exclusivity design).
  producesBusinessWorthSnapshot?: boolean;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 7; Specification §10 Decision 3, §22, FR-11, FR-55] The Owner-
  // confirmed actual cash position as of this Contagem's own date —
  // required product behavior whenever producesBusinessWorthSnapshot is
  // true (FR-55), per the identical "physical measurement" discipline
  // Contagem already applies to stock. Ignored (never read) when
  // producesBusinessWorthSnapshot is not true — mirrors
  // expectedValueAtCount's own "only meaningful for its own governing
  // flag" shape, above. The caller (a UI decision point) is responsible
  // for actually collecting this from the Owner; this function does not
  // decide whether to prompt for it.
  ownerConfirmedCashPosition?: number;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25, §26, FR-38, FR-39, FR-58] Present ONLY when
  // this call is a correction (Owner, within the 3-hour window) or an
  // authorized recovery (Owner, consuming a valid SuperAdmin-granted
  // Authorization) of an existing, currently-active `BusinessWorthSnapshot`
  // — the id of the snapshot being corrected/recovered. Never set for
  // an ordinary Contagem confirmation. When set, the resulting new
  // snapshot's own `supersedesSnapshotId` is written as this value, and
  // the ORIGINAL snapshot's `status` transitions from 'active' to
  // exactly one of 'corrected' or 'superseded-by-recovery' (never both,
  // never any other value) — which one is determined by `correctionKind`
  // below, itself only ever meaningful together with this field.
  correctionOfSnapshotId?: string;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8] Required whenever correctionOfSnapshotId is set; ignored
  // otherwise. 'owner-correction' targets the ordinary Owner-only
  // 3-hour window (firestore.rules `businessWorthSnapshotCorrectable`)
  // and writes the original's status as 'corrected'. 'superadmin-
  // authorized-recovery' targets a currently-active, unconsumed
  // Authorization naming this exact snapshot (firestore.rules
  // `businessWorthRecoveryAuthorizationActive`) and writes the
  // original's status as 'superseded-by-recovery', consuming that
  // Authorization in the SAME atomic batch. The caller (a UI decision
  // point, using computeBusinessWorthCorrectionEligibility /
  // computeBusinessWorthAuthorizedRecoveryEligibility to decide which
  // path is actually available) picks this — recordStockCount itself
  // does not decide it, and firestore.rules independently and
  // authoritatively re-verifies whichever path is claimed regardless of
  // what the caller asserts here.
  correctionKind?: 'owner-correction' | 'superadmin-authorized-recovery';
}

// [Initial Stock Valuation History] Owner-entered input for a new price
// change event — see InitialStockPriceChangeEvent (types.ts) for why
// quantityRemaining is an explicit input, not a derived figure.
interface RecordInitialStockPriceChangeParams {
  productId: string;
  effectiveDate: string;
  quantityRemaining: number;
  newCostPrice: number;
  newSellingPrice: number;
  reason?: string;
}

interface RecordClosingParams {
  periodType: ClosingPeriodType;
  periodLabel: string;
  startDate: string;
  endDate: string;
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; FR-53] Optional, additive — monthly/yearly Closings never
  // pass this and keep reading the existing `businessWorth` closure
  // variable exactly as before (no redesign of that path). Fecho's own
  // wrapper (recordFechoClosing, below) supplies this instead: the shared
  // §9 Estimated Business Worth calculation evaluated as of the selected
  // end date — never the old pre-Evolution `businessWorth` formula — per
  // FR-53's "never a separately re-filtered calculation" requirement.
  businessWorthOverride?: number;
}

interface AppContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  business: Business | null;
  // Release Readiness Audit (19-v1-completion-review-and-release-readiness-audit.md,
  // §2a) finding: the client previously never read the subscription
  // document at all — zero in-app visibility of trial/grace/expired
  // status, despite firestore.rules already permitting the read. These
  // four fields close that gap. `subscriptionBlocksNewRecords` mirrors
  // firestore.rules' own subscriptionAllowsNewRecords() exactly
  // (blocks only on 'trial_completed'/'expired', fail-open — false —
  // when no subscription document exists at all, matching that
  // function's own documented INTERIM behavior for pre-Phase-1
  // legacy businesses) so the client can pre-empt a write with a
  // clear message instead of only reacting to a raw permission-denied
  // error after the fact.
  subscription: Subscription | null;
  subscriptionTrialDaysRemaining: number | null;
  subscriptionGracePeriodDaysRemaining: number | null;
  subscriptionBlocksNewRecords: boolean;
  isAuthLoading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  // BDS #16 — Manager is a Staff account with staffTier === 'manager'.
  // isManager is true regardless of which permissions are granted; the
  // two derived booleans below reflect the actual per-permission grants
  // (both false for every plain Staff account and for a Manager with
  // nothing granted yet).
  isManager: boolean;
  canManagerCloseBooks: boolean;
  canManagerManageStaff: boolean;
  products: Product[];
  // [Stock Count Simplification Amendment v1.0, Part 21] Set only by
  // the products onSnapshot listener's own error callback below —
  // never inferred from `products.length === 0`, so a genuinely empty
  // catalog and a failed load remain distinguishable to any screen
  // (e.g. PeriodicStockCountView) that needs to tell them apart.
  // Cleared on every successful snapshot and on business switch.
  productsError: boolean;
  batches: StockBatch[];
  purchaseBatches: PurchaseBatch[];
  // [Durable Purchase Capture Amendment v1.0] Reusable, tenant-scoped
  // Supplier entities. Not a valuation input anywhere.
  suppliers: SupplierRecord[];
  quebras: Quebra[];
  expenses: Expense[];
  stockCounts: StockCount[];
  // [Void & Redo — Implementation Authorization §2 item 3]
  voidRecords: VoidRecord[];
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1; Specification §8, FR-5-FR-7] Every BusinessWorthSnapshot ever
  // created for this business, ordered newest-first.
  businessWorthSnapshots: BusinessWorthSnapshot[];
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1; Specification §7, FR-1, FR-3, FR-4] The single, unambiguous
  // Current Business Worth read — see getCurrentBusinessWorth's own doc
  // comment (calculations.ts) for exactly what this is and is not. Not
  // yet consumed by the Dashboard or Owner Portfolio (both Increment 2).
  currentBusinessWorth: number | 'UNKNOWN';
  // [Business Worth Evolution — Implementation Authorization, Increment 2;
  // Specification §9 Case B/§6 State 1a] See estimatedBusinessWorth's own
  // computation site (above currentBusinessWorth's sibling definition) for
  // the full doc comment — one shared calculation, two context fields
  // exposing its two named readings.
  estimatedBusinessWorth: number | 'UNKNOWN';
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; Specification §18, FR-25] The active baseline date
  // Fecho's own startDate is anchored to — null when no baseline exists
  // yet. See fechoBaselineDate's own computation site for the full
  // comment.
  fechoBaselineDate: string | null;
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; FR-53] See getEstimatedBusinessWorthAsOf's own
  // computation site for the full comment.
  getEstimatedBusinessWorthAsOf: (asOfDate: string) => number | 'UNKNOWN';
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §10-12, §33] Owner-only tier — see the onSnapshot
  // listener setup's own doc comment for why.
  cashLedgerEntries: CashLedgerEntry[];
  receivables: Receivable[];
  receivablePayments: ReceivablePayment[];
  payables: Payable[];
  payablePayments: PayablePayment[];
  // [Owner-recorded cash position] Newest-first (see the onSnapshot
  // listener's own sort). cashPositionDeclarations[0] — if present — is
  // the current declared cash figure; see CashPositionDeclaration's own
  // type comment for what this is and how it reaches Business Worth.
  cashPositionDeclarations: CashPositionDeclaration[];
  // Records a new cash-position declaration — a full restatement
  // ("cash on hand is now X"), not an incremental movement. A single,
  // un-batched, append-only write (mirrors addStartupInvestmentEntry
  // exactly) — callable as often as the Owner likes, which is what makes
  // this "updatable any time" rather than a one-time onboarding step.
  addCashPositionDeclaration: (params: { amount: number; declaredAt?: string; description?: string }) => Promise<{ entryId: string }>;
  // [Business Worth Evolution — Implementation Authorization, Increment 5;
  // Specification §13, §33] Owner-only tier, mirrors receivables/payables
  // above. Never itself the full Startup Investment figure — see
  // computeStartupInvestmentTotal (calculations.ts) for the report-time
  // aggregation this collection feeds into.
  startupInvestmentEntries: StartupInvestmentEntry[];
  // Creates a residual StartupInvestmentEntry — reserved exclusively for
  // spending with no existing Product/Stock/Expense record (FR-17). A
  // single, un-batched, append-only write — no Business Worth field is
  // touched by this call, and no update/delete path exists afterward.
  addStartupInvestmentEntry: (params: { category: StartupInvestmentEntry['category']; amount: number; description?: string; recordedAt?: string; submissionId?: string }) => Promise<{ entryId: string }>;
  // Creates a manually-recorded debt owed TO the business (Specification
  // §11). Contributes nothing to Business Worth until actually paid
  // (FIN-3) — see recordReceivablePayment for the payment side.
  addReceivable: (params: { totalAmount: number; description?: string; debtorName?: string }) => Promise<{ receivableId: string }>;
  // [Owner-recorded opening-balance debts] Creates a manually-recorded
  // debt the business owes TO a supplier (Payable.isManualEntry === true)
  // — for an existing business's pre-system supplier debt, which the
  // automatic Case-2 supplier-credit path (a real +Stock purchase) has
  // no way to represent. Mirrors addReceivable exactly: a single,
  // un-batched write; contributes to Business Worth immediately (FIN-4 —
  // unlike a Receivable, an outstanding Payable DOES reduce Business
  // Worth the moment it's recorded), via the SAME existing
  // payables-position-change term every other Payable already flows
  // through — no change to that calculation was needed for this.
  addPayable: (params: { totalAmount: number; description?: string; supplierName?: string }) => Promise<{ payableId: string }>;
  // Records a payment against an existing Receivable — atomic with its
  // own linked CashLedgerEntry (FR-13), rejects an amount exceeding what
  // remains outstanding (never an overpayment), and is itself idempotent
  // against a client-supplied submissionId (a retried call with the same
  // id never double-applies).
  recordReceivablePayment: (params: { receivableId: string; amountPaid: number; paidAt: string; submissionId: string }) => Promise<{ success: boolean; error?: string }>;
  // Records a payment against an existing supplier Payable — same
  // atomicity/idempotency/overpayment-rejection discipline as
  // recordReceivablePayment, mirrored for the liability side (I-6, FR-15).
  recordPayablePayment: (params: { payableId: string; amountPaid: number; paidAt: string; submissionId: string }) => Promise<{ success: boolean; error?: string }>;
  // [Void & Redo — Implementation Authorization §2 item 9; FR-9, FR-10]
  // Every 'initial'-type confirmation event ever recorded, chain-order
  // sorted, for history/audit display only.
  initialStockConfirmationChain: StockCount[];
  // [Void & Redo — Implementation Authorization §2 item 8; FR-21]
  // Client-side display only — see computeInitialStockVoidEligibility's
  // own doc comment (calculations.ts) for why this is never
  // authoritative.
  initialStockVoidEligibility: VoidEligibility;
  // [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan
  // §2/§17] The business's single Authorization document, or null if
  // none has ever been granted / it has been fully superseded.
  initialStockRecoveryAuthorization: InitialStockRecoveryAuthorization | null;
  // Client-side display only, same discipline as initialStockVoidEligibility
  // immediately above, for the separate 48-hour Authorization window.
  initialStockAuthorizedRecoveryEligibility: AuthorizedRecoveryEligibility;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §26, FR-43] The business's single Business-Worth-
  // specific recovery Authorization document, or null — a FULLY
  // SEPARATE field from initialStockRecoveryAuthorization above, never
  // merged with or derived from it.
  businessWorthRecoveryAuthorization: BusinessWorthRecoveryAuthorization | null;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25] Display-only eligibility for the Owner's own
  // 3-hour correction window against the business's current (latest
  // active) BusinessWorthSnapshot.
  businessWorthCorrectionEligibility: VoidEligibility;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §26] Display-only eligibility for the separate,
  // SuperAdmin-authorized 72-hour recovery ceiling.
  businessWorthAuthorizedRecoveryEligibility: AuthorizedRecoveryEligibility;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8] The business's own current (latest active) BusinessWorthSnapshot
  // — null when none exists. Exposed so the UI never needs to
  // re-derive this selection itself (a second, potentially-diverging
  // implementation of "which snapshot is current" is exactly what this
  // avoids).
  latestActiveBusinessWorthSnapshot: BusinessWorthSnapshot | null;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8] The cross-view correction/recovery-mode signal, above, plus its
  // start/clear controls.
  pendingBusinessWorthCorrection: { snapshotId: string; kind: 'owner-correction' | 'superadmin-authorized-recovery' } | null;
  startBusinessWorthCorrection: (snapshotId: string, kind: 'owner-correction' | 'superadmin-authorized-recovery') => void;
  clearBusinessWorthCorrection: () => void;
  withdrawals: Withdrawal[];
  // Module #19 V1 Manual Payment Bridge — temporary confirmation
  // bridge, not the final payment architecture.
  payments: Payment[];
  submitPayment: (params: { method: PaymentMethod; reference: string; notes?: string }) => Promise<Payment>;
  staffMembers: StaffMember[];
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  businessCategory: string;
  setBusinessCategory: (category: string) => void;
  isBusinessProfileComplete: boolean;
  updateBusinessProfile: (profile: { name: string; category: string; contact: string; location: string; email: string }) => Promise<void>;
  addStockBatch: (params: AddStockParams) => Promise<{ productId: string; batchId: string }>;
  // [Durable Purchase Capture Amendment v1.0] supplierId is optional and
  // additive — when provided, the purchase is linked to an existing
  // reusable SupplierRecord (its current name/phone/notes become the
  // historical snapshot written to supplier below, and the new
  // PurchaseBatch.supplierId field is set). When omitted, behavior is
  // completely unchanged from before this amendment: supplier is used
  // as a one-off, free-text snapshot exactly as today. See Rule 8
  // Assessment, Section 13.
  // [Multi-Supplier Purchase Event Amendment v1.0] purchaseEventId is
  // optional and additive — when provided, carries a Purchase Event
  // correlation onto the new PurchaseBatch (Part 5). Never assigned by
  // default; passed only when the Admin has explicitly chosen to
  // correlate this purchase with another (Part 7). Does not change
  // PurchaseBatch's own meaning — see attachPurchaseEventId, below,
  // for the retroactive-tagging counterpart used when the correlation
  // decision is made only AFTER the first purchase in a Purchase Event
  // was already finalized.
  addMultipleStockBatches: (
    items: AddStockParams[],
    supplier?: Supplier,
    notes?: string,
    supplierId?: string,
    purchaseEventId?: string,
    // [Business Worth Evolution — Implementation Authorization, Increment
    // 3; Specification §12 Case 2, FR-14] When true, this purchase was
    // acquired on supplier credit rather than paid immediately — a
    // `Payable` is created, in the same atomic write as everything else
    // here, for this purchase's own total investment value. `+Stock`
    // itself is completely unmodified otherwise: this flag adds one
    // additional document to the same batch, never a second
    // stock-acquisition record (Specification §12's own "no duplicate
    // stock-purchase record" rule).
    supplierCredit?: boolean
  ) => Promise<{ purchaseBatchId: string | null }>;
  // [Multi-Supplier Purchase Event Amendment v1.0] Retroactively tags
  // an already-finalized PurchaseBatch with a Purchase Event
  // correlation — a single-field, single-document update, reusing the
  // existing, unmodified purchaseBatches update rule (isMemberOf-only,
  // no subscription gate, same tier archive/unarchive already uses:
  // organizing an already-real record doesn't create or change
  // Business Worth). See the amendment's Part 7.
  attachPurchaseEventId: (purchaseBatchId: string, purchaseEventId: string) => Promise<void>;
  archivePurchaseBatch: (id: string) => Promise<void>;
  unarchivePurchaseBatch: (id: string) => Promise<void>;
  addQuebra: (params: AddQuebraParams) => Promise<Quebra>;
  addExpense: (params: AddExpenseParams) => Promise<Expense>;
  addWithdrawal: (params: AddWithdrawalParams) => Promise<Withdrawal>;
  deleteWithdrawal: (id: string) => Promise<void>;
  hasInitialStockCount: boolean;
  initialStockCount: StockCount | null;
  initialCapitalValue: number;
  recordStockCount: (params: RecordStockCountParams) => Promise<StockCount>;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 10 (Revision 3); Specification §42.1, §8, FR-61; BDR Decision 36]
  // Establishes Business Worth directly from an Owner-entered known
  // figure, without a physical Contagem — the second, equally
  // legitimate establishment method. A single-document, trivially
  // atomic create (Rule 8 Finding OD-3 — no paired StockCount write,
  // unlike recordStockCount), idempotent against a client-supplied
  // submissionId. Every FR-69-omitted drill-down field is genuinely
  // absent from the write, never a fabricated zero (enforced
  // server-side, firestore.rules).
  recordOwnerDeclaredBusinessWorth: (params: {
    declaredAmount: number;
    date: string;
    submissionId: string;
  }) => Promise<{ success: boolean; snapshotId?: string; error?: string }>;
  // [Void & Redo — Implementation Authorization §2 item 5]
  voidInitialStockConfirmation: () => Promise<InitialStockDraft>;
  // [Initial Stock Valuation History] Immutable, append-only audit trail
  // of price changes affecting units still remaining from the original
  // 'initial' StockCount. NEVER edits initialStockCount/initialCapitalValue
  // — see types.ts (InitialStockPriceChangeEvent) and calculations.ts
  // (calculateInitialStockCurrentValuation) for the full rule.
  initialStockPriceChangeEvents: InitialStockPriceChangeEvent[];
  recordInitialStockPriceChangeEvent: (params: RecordInitialStockPriceChangeParams) => Promise<InitialStockPriceChangeEvent>;
  // Current, per-product-aware valuation of the remaining original
  // Initial Stock (falls back to original prices for any product with no
  // price-change event — see the underlying pure function's own comment
  // for the full backward-compatibility guarantee). NOT read by
  // expectedCurrentStockValue/businessWorth/capitalGrowth — wiring this
  // into any of those formulas is an explicit, separate, not-yet-
  // authorized decision (see docs/specs/README.md governance note for
  // this feature).
  initialStockCurrentValuation: {
    totalInvestmentValue: number;
    totalMarketValue: number;
    perProduct: ReturnType<typeof calculateInitialStockCurrentValuation>['perProduct'];
  };
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1]
  // Persistent Initial Stock draft — null until an Owner starts one,
  // cleared automatically the moment it's confirmed. NOT Initial Capital.
  initialStockDraft: InitialStockDraft | null;
  // True once Firestore's onSnapshot has delivered its first callback
  // (success or denied) for this business — disambiguates "we don't
  // know yet" from "confirmed: no draft exists." See the fix comment on
  // the underlying state in AppProvider for why this exists.
  initialStockDraftLoaded: boolean;
  saveInitialStockDraft: (items: InitialStockDraftItem[], date: string, initialCapitalBasis?: InitialCapitalBasis) => Promise<void>;
  clearInitialStockDraft: () => Promise<void>;
  // [Stock Count Data-Loss Resilience — Implementation Task, Section 1]
  // Persistent Periodic Contagem draft — null until an Owner starts one,
  // cleared automatically the moment it's finalized. NOT a StockCount.
  periodicStockDraft: PeriodicStockDraft | null;
  // Same "loaded" disambiguation as initialStockDraftLoaded above.
  periodicStockDraftLoaded: boolean;
  // Full-document overwrite (Implementation Task §2's debounced
  // autosave path — the caller debounces, this function never does).
  // submissionId is optional so ordinary row-content saves during
  // `editing` (before the identity exists yet) don't require one.
  savePeriodicStockDraft: (
    items: PeriodicStockDraftItem[],
    type: StockCountType,
    label: string | undefined,
    date: string,
    submissionId?: string,
    newProductInfo?: Record<
      string,
      { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }
    >
  ) => Promise<void>;
  clearPeriodicStockDraft: () => Promise<void>;
  // [Durable Purchase Capture Amendment v1.0] Persistent, per-user
  // Purchase Draft — null until the current user starts one for this
  // business, cleared automatically the moment it's finalized. NOT
  // inventory — see the amendment's Part 10.
  purchaseDraft: PurchaseDraft | null;
  // Same "loaded" disambiguation as initialStockDraftLoaded above.
  purchaseDraftLoaded: boolean;
  savePurchaseDraft: (
    items: PurchaseDraftLineItem[],
    supplier: { supplierId?: string; supplierName?: string; supplierPhone?: string; supplierNotes?: string },
    date: string,
    notes?: string,
    purchaseEventId?: string
  ) => Promise<void>;
  clearPurchaseDraft: () => Promise<void>;
  // [Smart Stock Entry — Tier 1] Calls the server's extraction route for
  // one photographed purchase document. Returns a transient proposal
  // ONLY — this function never writes to purchaseDrafts, never creates a
  // Product/StockBatch, and the caller (AddStockView) is responsible for
  // merging the result into its own local `rows` state, exactly as
  // manual typing already populates it. See docs/architecture/
  // 10-smart-stock-entry-adr.md Decision 2a for why this boundary is
  // load-bearing, not stylistic.
  scanPurchaseDocument: (imageBase64: string, mimeType: string) => Promise<SmartStockEntryScanResult>;
  // [Amendment v1.0, Part 2] Contagem's comparison baseline — Confirmed
  // Initial Capital + StockBatch cost value. NOT a Business Worth input;
  // see spec #2's own non-goals note for the boundary.
  expectedCurrentStockValue: number;
  // Ground-truth physical count value (from the latest Stock Count), kept
  // separate from the batch-derived figures below. See the computation
  // block in AppProvider for the full rationale.
  latestStockCount: StockCount | null;
  currentInventoryValue: number;
  // Batch-derived, all-time inventory figures. Nothing here is "sold" or
  // "realized" — this app never records sales. Business Worth is honestly
  // built from Inventory Market Value minus what has actually left the
  // business (expenses, withdrawals) — never from an assumed cash ledger.
  totalInvestmentValueAllTime: number;
  totalMarketValueAllTime: number;
  totalEmbeddedProfitAllTime: number;
  activeBatchCount: number;
  totalExpensesAllTime: number;
  totalWithdrawalsAllTime: number;
  businessWorth: number;
  capitalGrowth: number;
  capitalGrowthPct: number;
  // Monthly/Yearly Closings — permanently lock a period's figures.
  closings: Closing[];
  recordClosing: (params: RecordClosingParams) => Promise<Closing>;
  // [Increment 6] Fecho — always periodType: 'custom'; startDate is never
  // a parameter here, see this function's own comment above (FR-25).
  recordFechoClosing: (endDate: string, periodLabel?: string) => Promise<Closing>;
  // [Closing Integrity Amendment v1.0] Replaces the old deleteClosing —
  // a Closing is never deleted, only reopened (Owner-only, logged,
  // supersedes in place). See reopenClosing's own comment for the full
  // rule.
  reopenClosing: (id: string, reason?: string) => Promise<void>;
  // One-time, idempotent, Owner-only migration for Closings recorded
  // before this amendment shipped — see its own comment for exact behavior.
  backfillClosingLocks: () => Promise<{ closingsIndexed: number; expensesLocked: number; withdrawalsLocked: number }>;
  isPeriodClosed: (periodType: ClosingPeriodType, startDate: string, endDate: string) => boolean;
  // Business Timeline — chronological history log (see types.ts). Populated
  // automatically by the actions above; logReportExport is the one manual
  // hook, called by the Reports screen when a report is exported/printed.
  timelineEvents: TimelineEvent[];
  logReportExport: (reportTitle: string) => Promise<void>;
  deleteQuebra: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  // [Product Memory / UOM — Increment A] BDR-0012 Decision 14's explicit
  // owner-reconfiguration action — see the function's own comment in the
  // provider body for the full contract. Throws if `candidate` fails
  // POL-0005 validation; never silently discards an invalid value.
  confirmProductUnitRelationship: (productId: string, candidate: UnitRelationshipProposal) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStaffMember: (name: string, email: string, password: string) => Promise<void>;
  deleteStaffMember: (staffUid: string, reason?: string) => Promise<void>;
  suspendStaffMember: (staffUid: string, reason?: string) => Promise<void>;
  reactivateStaffMember: (staffUid: string) => Promise<void>;
  resetStaffPin: (staffUid: string, newPin: string) => Promise<void>;
  // BDS #16 — Admin-only. Promotes/demotes a Staff member's tier and, for
  // 'manager', sets which permissions are granted. Passing 'staff'
  // always clears both permissions server-side, regardless of what's
  // passed in managerPermissions.
  setStaffTier: (staffUid: string, staffTier: StaffTier, managerPermissions?: Partial<ManagerPermissions>) => Promise<void>;
  // Device pairing for PIN-based quick login (shared shop devices) — see
  // AppContext's DEVICE PAIRING section for details. null on devices that
  // have never been paired (e.g. a staff member's personal phone).
  pairedDevice: PairedDevice | null;
  pairDevice: () => void;
  unpairDevice: () => void;
  suspensionNotice: string | null;
  clearSuspensionNotice: () => void;
  // SuperAdmin V1 Operational Control Plane, Phase C (ADR-0006, Gap 1).
  // Distinct from suspensionNotice above — that one is a one-shot,
  // sign-out-triggering message for a suspended STAFF account
  // (Firebase Auth is disabled, the message is shown once on the
  // login screen). This is a persistent, reactive flag for a
  // suspended BUSINESS: the user's own Firebase Auth account is never
  // touched and they are never signed out — only business-scoped
  // reads/writes are denied at the Firestore Rules layer, so this
  // stays true for as long as the active business remains suspended,
  // driven by the existing businesses/{businessId} listener below.
  businessSuspended: boolean;
  // Multi-shop support (owners only, up to MAX_SHOPS_PER_OWNER shops).
  // `activeBusinessId` is the shop currently being viewed/operated on —
  // every other field/action in this context (business, products,
  // batches, etc.) is already scoped to it.
  ownedBusinesses: Business[];
  activeBusinessId: string | null;
  maxShopsPerOwner: number;
  addShop: (businessName: string, category: string, currencySymbol?: string) => Promise<void>;
  switchShop: (businessId: string) => Promise<void>;
  // [Module #17 Owner Portfolio v0.2] Explicit, per-shop refresh only —
  // see the function's own implementation comment for the full
  // governance basis. Never throws; reports outcome via return value.
  refreshShopWorth: (businessId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Set only when a staff account gets force-signed-out mid-session because
  // an owner suspended it (see the profile listener below). Survives the
  // logout itself (unlike userProfile, which gets cleared) so the login
  // screen can show *why* they were logged out, then it's cleared once shown.
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
  // Phase C — see the AppContextType field's own comment for why this
  // is a distinct, persistent flag rather than a reuse of
  // suspensionNotice. Reset to false whenever activeBusinessId changes
  // (below, alongside every other per-business reset) so switching
  // shops never carries a stale suspended state from the prior one.
  const [businessSuspended, setBusinessSuspended] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState(false);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [purchaseBatches, setPurchaseBatches] = useState<PurchaseBatch[]>([]);
  // [Durable Purchase Capture Amendment v1.0] Reusable, tenant-scoped
  // Supplier entities — loaded in full per business and searched/matched
  // client-side, exactly like `products` (Rule 8 Assessment, Section 7).
  // Not a valuation input anywhere.
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [quebras, setQuebras] = useState<Quebra[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  // [Void & Redo — Implementation Authorization §2 item 3; Rule 8
  // Finding G1, Direction 2] The additive, create-only void-record
  // artifact. Loaded exactly like stockCounts (same read tier,
  // isMemberOf, per firestore.rules) — never itself mutated once a
  // snapshot arrives, matching the collection's own create-only
  // design.
  const [voidRecords, setVoidRecords] = useState<VoidRecord[]>([]);
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1; Specification §8, FR-5-FR-7] Every BusinessWorthSnapshot ever
  // created for this business — loaded exactly like stockCounts (same
  // read tier, isMemberOf, per firestore.rules). Immutable once written
  // (outside the not-yet-implemented Increment 8 correction/recovery
  // window), so a snapshot arriving here never needs reconciling against
  // a locally-optimistic copy.
  const [businessWorthSnapshots, setBusinessWorthSnapshots] = useState<BusinessWorthSnapshot[]>([]);
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §10-12, §33] Owner-only tier (isOwnerOf), same access
  // class as withdrawals — Staff never handles these, matching the
  // Specification's own explicit authorization boundary for these three
  // record types.
  const [cashLedgerEntries, setCashLedgerEntries] = useState<CashLedgerEntry[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [startupInvestmentEntries, setStartupInvestmentEntries] = useState<StartupInvestmentEntry[]>([]);
  const [receivablePayments, setReceivablePayments] = useState<ReceivablePayment[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [payablePayments, setPayablePayments] = useState<PayablePayment[]>([]);
  // [Owner-recorded cash position] Same Owner-only access class as the
  // three collections immediately above — see CashPositionDeclaration's
  // own type comment for what this is and isn't.
  const [cashPositionDeclarations, setCashPositionDeclarations] = useState<CashPositionDeclaration[]>([]);
  // [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan
  // §17] Null when no Authorization has ever been granted for this
  // business, or once it has been fully superseded (a fresh grant
  // overwrites the same fixed 'current' document). Read-only from the
  // client's perspective except for the one narrow 'consumed'
  // transition voidInitialStockConfirmation() performs below — never
  // itself created or granted client-side (POL-0009 Rule N).
  const [initialStockRecoveryAuthorization, setInitialStockRecoveryAuthorization] = useState<InitialStockRecoveryAuthorization | null>(null);
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §26] Same discipline as
  // initialStockRecoveryAuthorization immediately above, for the new,
  // fully separate collection — never itself created client-side (only
  // the one narrow 'consumed' transition, performed inside
  // recordStockCount's own atomic batch, Specification §26 FR-42).
  const [businessWorthRecoveryAuthorization, setBusinessWorthRecoveryAuthorization] = useState<BusinessWorthRecoveryAuthorization | null>(null);
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25, §26] Cross-view "correction mode" signal —
  // this app switches between full-screen tabs (App.tsx's own
  // activeTab state), not nested routes, so a component initiating a
  // correction/recovery (DashboardView's history modal) and the
  // component that actually performs it (PeriodicStockCountView, on a
  // different tab) share this one piece of context state rather than
  // App.tsx growing a new prop-drilled channel — the same pattern this
  // codebase already uses for cross-view drafts. Always bound to the
  // business's own real, current snapshot id (never a free-typed
  // value) — see startBusinessWorthCorrection's own comment below.
  const [pendingBusinessWorthCorrection, setPendingBusinessWorthCorrection] = useState<{
    snapshotId: string;
    kind: 'owner-correction' | 'superadmin-authorized-recovery';
  } | null>(null);
  const [initialStockPriceChangeEvents, setInitialStockPriceChangeEvents] = useState<InitialStockPriceChangeEvent[]>([]);
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1]
  // Null when no draft exists yet for this business (or once confirmed
  // and cleared). Never itself Initial Capital.
  const [initialStockDraft, setInitialStockDraft] = useState<InitialStockDraft | null>(null);
  // [Fix — Initial Stock draft load race] `initialStockDraft === null` is
  // ambiguous on its own: it's both the untouched default AND what
  // Firestore reports when no draft doc exists. onSnapshot's first
  // callback is always asynchronous — never synchronous on mount — so a
  // consumer that treats the default null as "confirmed no draft" acts
  // on stale information. This flag disambiguates: false until the
  // listener's first callback (success OR error) has actually fired.
  const [initialStockDraftLoaded, setInitialStockDraftLoaded] = useState(false);
  // [Stock Count Data-Loss Resilience — Implementation Task, Section 1]
  // Same shape/reasoning as initialStockDraft/initialStockDraftLoaded
  // above, for the sibling `stockCountDrafts/periodic` singleton — kept
  // as its own separate state pair (not merged with the initial draft's)
  // since the two are never read together and the frozen spec §5/§12
  // explicitly keeps the two mechanisms un-shared.
  const [periodicStockDraft, setPeriodicStockDraft] = useState<PeriodicStockDraft | null>(null);
  const [periodicStockDraftLoaded, setPeriodicStockDraftLoaded] = useState(false);
  // [Durable Purchase Capture Amendment v1.0] Same "loaded flag"
  // disambiguation as initialStockDraft above, for exactly the same
  // reason — this is a per-user document (Rule 8 Assessment, Section 7),
  // not per-business, but the race is identical.
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft | null>(null);
  const [purchaseDraftLoaded, setPurchaseDraftLoaded] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  // [Closing Integrity Amendment v1.0] Lock-index docs — see ClosedPeriod
  // type in types.ts for why this collection exists. Not shown anywhere
  // in the UI; consumed only by backfillClosingLocks and recordClosing/
  // reopenClosing's own writes.
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // [Phase 0 Stage 2 Compatibility Correction] Must match firestore.rules'
  // isOwnerOf(), which already treats 'owner' and 'admin' as equivalent
  // (Stage 1). This was the missing synchronization point: Stage 2 started
  // writing 'admin' for new registrations, but this check still only
  // recognized 'owner', so every account created after Stage 2 shipped
  // lost all owner-level app capability (while still passing the rules
  // layer). Fixed here, not a new role model.
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  const isStaff = userProfile?.role === 'staff';
  // BDS #16 — additive on top of isStaff, never a replacement for it.
  // Every existing `isStaff` check in the app is unaffected; these three
  // are new, narrower checks used only where Manager delegation applies.
  const isManager = isStaff && userProfile?.staffTier === 'manager';
  const canManagerCloseBooks = isManager && userProfile?.managerPermissions?.closings === true;
  const canManagerManageStaff = isManager && userProfile?.managerPermissions?.staffManagement === true;

  const MAX_SHOPS_PER_OWNER = 10;

  // ============================================================
  // MULTI-SHOP SUPPORT (owners only, up to MAX_SHOPS_PER_OWNER shops).
  // ============================================================
  // Staff accounts stay single-shop, always resolved from the legacy
  // `businessId` field on their profile — unchanged from before.
  //
  // Owners: `businessIds` is the real list. Owner accounts created before
  // this feature existed only have the legacy singular `businessId` field
  // and no `businessIds` array yet — rather than running a bulk migration,
  // we derive the list on the fly (falls back to a one-item array built
  // from `businessId`). The first time such an owner adds a second shop,
  // `addShop` persists this derived list for real (see below), so the
  // lazy fallback here only ever matters before that first write.
  const ownedBusinessIds: string[] = isOwner
    ? (userProfile?.businessIds?.length ? userProfile.businessIds : (userProfile?.businessId ? [userProfile.businessId] : []))
    : [];

  // The shop currently being viewed/operated on. For owners this is
  // `activeBusinessId` (validated against the owned list, since a stale
  // value could in theory point at a shop no longer in the array) falling
  // back to the first owned shop. For staff it's simply their one shop.
  const activeBusinessId: string | null = isOwner
    ? (userProfile?.activeBusinessId && ownedBusinessIds.includes(userProfile.activeBusinessId)
        ? userProfile.activeBusinessId
        : (ownedBusinessIds[0] || null))
    : (userProfile?.businessId || null);

  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);

  // Live-listen to every shop an owner has, so the shop switcher shows
  // up-to-date names without a separate fetch each time it opens.
  useEffect(() => {
    if (!isOwner || ownedBusinessIds.length === 0) {
      setOwnedBusinesses([]);
      return;
    }

    const unsubs = ownedBusinessIds.map((id) =>
      onSnapshot(
        doc(db, 'businesses', id),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Business;
          setOwnedBusinesses((prev) => {
            const next = prev.filter((b) => b.id !== id);
            next.push(data);
            // Keep the same order as ownedBusinessIds for a stable menu.
            return ownedBusinessIds
              .map((oid) => next.find((b) => b.id === oid))
              .filter((b): b is Business => !!b);
          });
        },
        (err) => console.error('Error fetching owned business', id, err)
      )
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, JSON.stringify(ownedBusinessIds)]);

  const currencySymbol = business?.currencySymbol || 'MT';
  const businessCategory = business?.category || '';

  // ============================================================
  // DEVICE PAIRING for PIN-based quick login (shared shop devices).
  // ============================================================
  // Stored ONLY in this browser's localStorage — never synced to
  // Firestore, never visible to anyone else. It's purely a local cache
  // of "which shop is this specific device set up for" + that shop's
  // staff names, so the logged-out screen on a shared device can show a
  // name-picker + PIN pad instead of asking for a full email each time.
  // The PIN itself is never cached here — it's the staff member's real
  // Firebase Auth password, typed fresh at each login.
  const DEVICE_PAIRING_KEY = 'sabush_device_pairing';

  const [pairedDevice, setPairedDeviceState] = useState<PairedDevice | null>(() => {
    try {
      const raw = localStorage.getItem(DEVICE_PAIRING_KEY);
      return raw ? (JSON.parse(raw) as PairedDevice) : null;
    } catch {
      return null;
    }
  });

  const persistPairedDevice = (value: PairedDevice | null) => {
    setPairedDeviceState(value);
    try {
      if (value) {
        localStorage.setItem(DEVICE_PAIRING_KEY, JSON.stringify(value));
      } else {
        localStorage.removeItem(DEVICE_PAIRING_KEY);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — pairing just
      // won't persist across reloads; not worth failing the action for.
    }
  };

  const pairDevice = () => {
    if (!isOwner || !activeBusinessId || !business) {
      throw new Error('Apenas o dono, com uma loja selecionada, pode configurar este dispositivo.');
    }
    persistPairedDevice({
      businessId: activeBusinessId,
      businessName: business.name,
      // Suspended/removed staff never appear on the PIN pad — filtered
      // out here so a device doesn't keep advertising an account that
      // can't log in anyway.
      staff: staffMembers.filter((s) => !s.suspended).map((s) => ({ uid: s.uid, name: s.name, email: s.email })),
      pairedAt: new Date().toISOString(),
    });
  };

  const unpairDevice = () => {
    persistPairedDevice(null);
  };

  // Keep the cached staff list fresh automatically while the owner is
  // using this same device for this same shop — so adding/removing/
  // suspending staff shows up on the PIN pad without a manual re-pair.
  useEffect(() => {
    if (!isOwner || !pairedDevice || pairedDevice.businessId !== activeBusinessId) return;
    const freshStaff = staffMembers.filter((s) => !s.suspended).map((s) => ({ uid: s.uid, name: s.name, email: s.email }));
    const changed = JSON.stringify(freshStaff) !== JSON.stringify(pairedDevice.staff);
    const nameChanged = business?.name && business.name !== pairedDevice.businessName;
    if (changed || nameChanged) {
      persistPairedDevice({ ...pairedDevice, staff: freshStaff, businessName: business?.name || pairedDevice.businessName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, activeBusinessId, JSON.stringify(staffMembers), business?.name]);

  // ============================================================
  // SUBSCRIPTION STATUS — derived, read-only client mirrors of
  // firestore.rules' own gating logic. Never a second source of
  // truth: the Security Rule is what actually enforces the
  // restriction (Architecture 7.1, same as every other module) —
  // these values exist only so the UI can explain that restriction
  // clearly, pre-emptively, instead of surfacing a raw
  // permission-denied error after a blocked write attempt.
  // ============================================================
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const subscriptionTrialDaysRemaining =
    subscription && subscription.status === 'trial_active' && subscription.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / MS_PER_DAY))
      : null;
  const subscriptionGracePeriodDaysRemaining =
    subscription && subscription.status === 'grace_period' && subscription.gracePeriodEndsAt
      ? Math.max(0, Math.ceil((new Date(subscription.gracePeriodEndsAt).getTime() - Date.now()) / MS_PER_DAY))
      : null;
  // Mirrors firestore.rules' subscriptionAllowsNewRecords() exactly:
  // blocks only on 'trial_completed'/'expired'; fail-open (false, not
  // blocking) when no subscription document exists at all, matching
  // that function's own documented INTERIM behavior for businesses
  // that predate Phase 1's atomic subscription creation.
  const subscriptionBlocksNewRecords =
    !!subscription && (subscription.status === 'trial_completed' || subscription.status === 'expired');

  // The one-and-only 'initial' StockCount establishes the permanent
  // Initial Business Capital baseline (see types.ts for the rationale).
  // [Void & Redo — Implementation Authorization §2 item 3; Rule 8
  // Finding F1] Extended, not replaced: a confirmation is excluded here
  // if a VoidRecord exists for it — the single, centralized choke
  // point every consumer below (Dashboard, both Reports,
  // InitialStockPriceChangeModal, the Timeline entry) continues to
  // read through, unchanged, with zero individual updates required to
  // any of them (the same low-blast-radius argument Rule 8 Finding F1
  // relies on).
  const voidedConfirmationIds = new Set(voidRecords.map((v) => v.voidedConfirmationId));
  const initialStockCount =
    stockCounts.find((s) => s.type === 'initial' && !voidedConfirmationIds.has(s.id)) || null;
  const hasInitialStockCount = !!initialStockCount;
  // [Void & Redo — Implementation Authorization §2 item 9; FR-9, FR-10]
  // Every confirmation event ever recorded for this business's Initial
  // Stock, in chain order (1 → up to 4) — the active one plus every
  // voided one. For history/audit display only; never read by any
  // calculation (FR-12, FR-13 — those read `initialStockCount` above,
  // and only that).
  const initialStockConfirmationChain = stockCounts
    .filter((s) => s.type === 'initial')
    .slice()
    .sort((a, b) => (a.chainPosition ?? 1) - (b.chainPosition ?? 1));
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 item 6] Replaces the previous inline
  // `initialStockCount?.totalValue || 0` expression with a call to the
  // single, pure, independently-tested resolution function — see its
  // own doc comment (calculations.ts) for exactly what it resolves and
  // why. Every consumer below (businessWorth's own capitalGrowth
  // computation, Dashboard, both Reports, InitialStockPriceChangeModal)
  // is unaffected by this change in shape — they all already read this
  // same `initialCapitalValue` constant, not the expression that
  // produces it.
  const initialCapitalValue = resolveInitialCapitalValue(initialStockCount);
  // [Void & Redo — Implementation Authorization §2 item 8; Rule 8
  // Finding I1] Display-only eligibility/window info for the currently
  // active confirmation — see computeInitialStockVoidEligibility's own
  // doc comment (calculations.ts) for why this is never authoritative.
  // Recomputed on every render (cheap — a few arithmetic ops), so a
  // consumer polling via setInterval/re-render gets a live countdown
  // without this context needing its own timer.
  const initialStockVoidEligibility = computeInitialStockVoidEligibility(initialStockCount);
  // [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan
  // §17] Display-only, never authoritative — same discipline as
  // initialStockVoidEligibility immediately above, applied to the
  // separate 48-hour Authorization window (POL-0009 Rule R: completely
  // separate from the 12-hour window computed above). `null` for
  // targetStockCountId when there is no current confirmation to check
  // against — computeInitialStockAuthorizedRecoveryEligibility already
  // treats that as ineligible.
  const initialStockAuthorizedRecoveryEligibility = computeInitialStockAuthorizedRecoveryEligibility(
    initialStockRecoveryAuthorization,
    initialStockCount?.id ?? null
  );

  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25, §26] The business's own current (latest
  // active) BusinessWorthSnapshot — the only one a correction or
  // recovery can ever target (§26's own "one exact confirmation per
  // Authorization, the current one"). `null` when the business has no
  // active snapshot at all (State 1/1a, or every snapshot already
  // terminal) — both eligibility functions below already treat that as
  // ineligible.
  const latestActiveBusinessWorthSnapshot =
    businessWorthSnapshots
      .filter((s) => s.status === 'active')
      .sort((a, b) => {
        const aMs = (a.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const bMs = (b.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return bMs - aMs;
      })[0] ?? null;
  // Display-only, never authoritative — same discipline as
  // initialStockVoidEligibility/initialStockAuthorizedRecoveryEligibility
  // above, applied to this Specification's own 3-hour Owner window.
  const businessWorthCorrectionEligibility = computeBusinessWorthCorrectionEligibility(latestActiveBusinessWorthSnapshot);
  // Display-only, never authoritative — the separate 72-hour ceiling
  // (Specification §26), completely independent of the 3-hour window
  // immediately above (mirroring POL-0009 Rule R's own "completely
  // separate" precedent).
  const businessWorthAuthorizedRecoveryEligibility = computeBusinessWorthAuthorizedRecoveryEligibility(
    businessWorthRecoveryAuthorization,
    latestActiveBusinessWorthSnapshot
  );

  // [Business Worth Evolution — Implementation Authorization, Increment
  // 1, corrected per Specification §41 (Accepted 22 August 2026) and the
  // Implementation Plan's own §6/§7 correction (Accepted 22 August 2026)]
  // Current Business Worth is now a LIVE, on-demand calculation — the
  // latest confirmed BusinessWorthSnapshot plus governed activity since
  // (embedded profit delta, Expenses, Levantamentos — existing sources
  // only; Receivables/Payables/Cash correctly deferred to Increment 3) —
  // not a bare frozen-snapshot lookup. See getCurrentBusinessWorth's own
  // doc comment (calculations.ts) for the full mechanism. Not yet
  // consumed by the Dashboard or Owner Portfolio's own component code in
  // Increment 1 (both are explicitly Increment 2 scope, per the
  // Implementation Plan's §24 sequence) — exposed on this context now so
  // Increment 2 can wire the UI without needing any new data-loading work.
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §7/§9] `payables`/`cashLedgerEntries` now supply the
  // "±Receivables/Payables/Cash position changes" term this function's
  // own doc comment (calculations.ts) describes in full — the term is no
  // longer omitted (Increment 1/2), it is genuinely computed.
  const currentBusinessWorth = getCurrentBusinessWorth({
    snapshots: businessWorthSnapshots,
    batches,
    quebras,
    expenses,
    withdrawals,
    payables,
    cashLedgerEntries,
  });

  // [Business Worth Evolution — Implementation Authorization, Increment 2;
  // Specification §9 Case B, §6 State 1a; Implementation Plan §7] The
  // SAME shared calculation as currentBusinessWorth above, read under its
  // "Estimated" name — for a business with no BusinessWorthSnapshot yet
  // (State 1a), this resolves to the Case B figure (Historical Capital
  // Inicial + embedded profit since baseline − Expenses − Levantamentos
  // ± the same Increment-3 financial-position term above) instead of
  // UNKNOWN; for a business that already has an active snapshot, it
  // resolves to the identical value currentBusinessWorth does (§41.4 —
  // one calculation, two names). Consumed by the Dashboard (Increment 2,
  // DashboardView.tsx) and Owner Portfolio (refreshShopWorth, below) so
  // the same authoritative figure is never independently recomputed a
  // second time by either.
  const estimatedBusinessWorth = getEstimatedBusinessWorth({
    snapshots: businessWorthSnapshots,
    initialStockCount,
    batches,
    quebras,
    expenses,
    withdrawals,
    payables,
    cashLedgerEntries,
  });

  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; Specification §18, FR-25] The active baseline date Fecho
  // is anchored to — exposed here so ClosingView can display it read-only
  // without independently re-deriving it (the same single source of truth
  // recordFechoClosing itself uses to build startDate).
  const fechoBaselineDate = resolveActiveBusinessWorthBaselineDate({
    snapshots: businessWorthSnapshots,
    initialStockCount,
  });

  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; FR-53] Lets ClosingView preview Fecho's own Estimated
  // Business Worth as of an Owner-selected (not-yet-saved) end date,
  // without needing every one of this function's own input collections
  // exposed on the context individually. Uses the exact same shared
  // function/parameters recordFechoClosing itself uses at save time, so
  // the preview can never disagree with what actually gets recorded.
  const getEstimatedBusinessWorthAsOf = (asOfDate: string): number | 'UNKNOWN' =>
    getEstimatedBusinessWorth({
      snapshots: businessWorthSnapshots,
      initialStockCount,
      batches,
      quebras,
      expenses,
      withdrawals,
      payables,
      cashLedgerEntries,
      asOfDate,
    });

  // ============================================================
  // BUSINESS WORTH — no fabricated cash ledger.
  // ============================================================
  // Sabush never records sales, so there is no real "cash on hand" figure
  // to compute — a previous version of this app faked one by assuming
  // every remaining unit in every batch had been sold. That assumption
  // leaked into Business Worth and made it silently wrong. We don't
  // invent a substitute cash figure here.
  //
  // Current Inventory Value (ground truth) comes from the most recent
  // physical Stock Count — the owner's own snapshot of what's physically
  // on the shelf, at cost. It's kept as a separate, honest number and
  // used for stock-recount comparisons, not folded into Business Worth.
  const latestStockCount = stockCounts.length > 0
    ? [...stockCounts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const currentInventoryValue = latestStockCount?.totalValue || 0;

  // Batch-derived figures: Investment Value (what was paid), Market Value
  // (what it's marked to sell for) and Embedded Profit (the difference) —
  // all POTENTIAL, none realized. This is the single source of truth used
  // everywhere else (Dashboard, Reports, Closings).
  const {
    totalInvestmentValue: totalInvestmentValueAllTime,
    totalMarketValue: totalMarketValueAllTime,
    totalEmbeddedProfit: totalEmbeddedProfitAllTime,
    activeBatchCount,
  } = calculateInventoryTotals(batches, quebras);

  const totalExpensesAllTime = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalWithdrawalsAllTime = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // Business Worth = Inventory Market Value − Expenses − Withdrawals.
  // Both Expenses and Withdrawals are real money that has actually left
  // the business; Inventory Market Value is what's genuinely on the shelf
  // valued at asking price. No assumed sale, no fabricated cash figure.
  const businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime;
  // Growth is measured against the Initial Business Capital baseline —
  // the whole reason that baseline is permanent and never editable.
  const capitalGrowth = businessWorth - initialCapitalValue;
  const capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) * 100 : 0;

  // ============================================================
  // EXPECTED CURRENT STOCK VALUE — [Amendment v1.0, Part 2]
  // ============================================================
  // Contagem's comparison baseline, NOT a Business Worth input. Confirmed
  // Initial Capital + StockBatch cost value at current remaining
  // quantity (Quebra already netted in via totalInvestmentValueAllTime's
  // own remainingQuantity basis — no second subtraction here). Initial
  // Capital and StockBatch inventory are separate, non-overlapping value
  // pools by construction (see the amendment document's Part 2 — neither
  // type has ever referenced the other), so both are always included,
  // unconditionally, regardless of which was created first. Mirrors
  // capitalGrowthPct's own explicit-zero-not-NaN pattern: a business
  // that hasn't confirmed Initial Stock yet still gets a defined number
  // (0 + totalInvestmentValueAllTime), never NaN/undefined.
  const expectedCurrentStockValue = initialCapitalValue + totalInvestmentValueAllTime;

  // [Initial Stock Valuation History] Derived, read-only — see the
  // AppContextType field's own comment and calculateInitialStockCurrentValuation's
  // header comment (calculations.ts) for the full rule. Deliberately NOT
  // folded into expectedCurrentStockValue/businessWorth/capitalGrowth above.
  const initialStockCurrentValuation = calculateInitialStockCurrentValuation(
    initialStockCount,
    initialStockPriceChangeEvents
  );

  // A business is considered "complete" once it has a category plus the core
  // contact-card fields. Businesses created before these fields existed will
  // be missing them and get prompted once to fill the gap.
  const isBusinessProfileComplete = !!(
    business &&
    business.category &&
    business.contact &&
    business.location &&
    business.email
  );

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setBusiness(null);
        setProducts([]);
        setBatches([]);
        setPurchaseBatches([]);
        setQuebras([]);
        setExpenses([]);
        setStockCounts([]);
        setInitialStockDraft(null);
        setInitialStockDraftLoaded(false);
        setPeriodicStockDraft(null);
        setPeriodicStockDraftLoaded(false);
        setWithdrawals([]);
        setClosings([]);
        setStaffMembers([]);
        setTimelineEvents([]);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to User Profile when auth user exists
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        // A staff account can be suspended by its owner at any time (see
        // suspendStaffMember / server/index.ts). Firebase Auth disabling
        // blocks all *future* logins immediately, but an already-open
        // session's ID token can otherwise keep working until it naturally
        // expires. Catching `suspended` here, live, closes that gap —
        // the moment this doc updates, we sign the session out ourselves.
        if (profile.role === 'staff' && profile.suspended === true) {
          setSuspensionNotice('A sua conta foi suspensa pelo dono do negócio. Contacte-o para mais informações.');
          setUserProfile(null);
          signOut(auth).catch((err) => console.error('Error signing out suspended staff session:', err));
        } else {
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    }, (error) => {
      console.error('Error fetching user profile:', error);
      setIsAuthLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser]);

  // Listen to Business and Subcollections when userProfile and businessId exist
  useEffect(() => {
    // [Fix — business-switch draft staleness] Reset unconditionally on
    // every activeBusinessId change, not only when it becomes falsy.
    // This effect is keyed solely on [activeBusinessId] and re-runs in
    // full on a direct Business A → Business B switch (ShopSwitcher's
    // switchShop) — but every OTHER branch below only reset state in
    // the `!activeBusinessId` case, so a direct switch would otherwise
    // leave Business A's already-loaded initialStockDraft (and its
    // stale "loaded" flag) sitting in state until Business B's listener
    // delivered its first snapshot. That window is exactly how
    // Business A's draft could momentarily read as if it belonged to
    // Business B. Scoped narrowly to these two draft-specific values —
    // the equivalent staleness exists for every other collection here
    // too, but fixing that broadly is a separate, larger change outside
    // this specific fix's scope.
    setInitialStockDraft(null);
    setInitialStockDraftLoaded(false);
    // [Stock Count Data-Loss Resilience — Implementation Task, Section 6]
    // Same staleness-avoidance reasoning as the two lines above, applied
    // to the sibling periodic draft — otherwise Business A's
    // already-loaded periodicStockDraft could momentarily read as
    // Business B's during a direct switch, same class of bug as the fix
    // this effect already exists to prevent for the initial draft.
    setPeriodicStockDraft(null);
    setPeriodicStockDraftLoaded(false);
    // Phase C — same "reset unconditionally on every switch" reasoning
    // as the two lines above: a direct Business A -> Business B switch
    // must never carry A's suspended state into B's screen for the
    // brief window before B's own listener delivers its first event.
    setBusinessSuspended(false);

    if (!activeBusinessId) {
      setBusiness(null);
      setProducts([]);
      setProductsError(false);
      setBatches([]);
      setPurchaseBatches([]);
      setSuppliers([]);
      setQuebras([]);
      setExpenses([]);
      setStockCounts([]);
      setWithdrawals([]);
      setClosings([]);
      setStaffMembers([]);
      setTimelineEvents([]);
      return;
    }

    const businessId = activeBusinessId;

    // 1. Business doc listener
    const businessRef = doc(db, 'businesses', businessId);
    const unsubBusiness = onSnapshot(
      businessRef,
      (snap) => {
        if (snap.exists()) {
          setBusiness(snap.data() as Business);
          // A successful read is only possible for a non-suspended
          // business (isBusinessSuspended() denies the read itself,
          // firestore.rules) — clears any stale suspended state left
          // over from before a reactivation's listener re-fires.
          setBusinessSuspended(false);
        }
      },
      (err) => {
        console.error('Error fetching business:', err);
        // [Phase C — ADR-0006, Gap 1] isBusinessSuspended() denies
        // *reads* of this exact document, not only writes — so a
        // permission-denied error here, for a document this same
        // listener could read a moment ago, is the live signal a
        // business was just suspended (see the Pre-Implementation
        // Verification's §9/§14: the client cannot always positively
        // read business.suspended === true after suspension, since
        // the read itself becomes denied — the error callback is the
        // boundary, not the data). Firestore's permission-denied
        // error code is 'permission-denied' for every rules-layer
        // rejection; a network/offline error uses a different code
        // ('unavailable', etc.), so this narrows to the suspension
        // case specifically rather than treating every listener error
        // as a suspension.
        if (err.code === 'permission-denied') {
          setBusinessSuspended(true);
        }
      }
    );

    // 1a. Subscription doc listener — top-level collection, doc ID ==
    // businessId (server/subscriptionEngine.ts and server/index.ts's
    // own activate-trial endpoint both key it this same way). Added
    // per the Release Readiness Audit's own finding: previously never
    // read client-side at all.
    const subscriptionRef = doc(db, 'subscriptions', businessId);
    const unsubSubscription = onSnapshot(
      subscriptionRef,
      (snap) => {
        setSubscription(snap.exists() ? (snap.data() as Subscription) : null);
      },
      (err) => console.error('Error fetching subscription:', err)
    );

    // 2. Products collection
    const productsRef = collection(db, 'businesses', businessId, 'products');
    const unsubProducts = onSnapshot(
      productsRef,
      (snap) => {
        const list: Product[] = [];
        snap.forEach((doc) => list.push(doc.data() as Product));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(list);
        setProductsError(false);
      },
      (err) => {
        console.error('Error fetching products:', err);
        setProductsError(true);
      }
    );

    // 3. Batches collection
    const batchesRef = collection(db, 'businesses', businessId, 'batches');
    const unsubBatches = onSnapshot(
      batchesRef,
      (snap) => {
        const list: StockBatch[] = [];
        snap.forEach((doc) => list.push(doc.data() as StockBatch));
        list.sort((a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime());
        setBatches(list);
      },
      (err) => console.error('Error fetching batches:', err)
    );

    // 3b. Purchase Batches collection (Investment Ledger — one doc per
    // real-world purchase/investment event, grouping one or more of the
    // per-product StockBatch line items above).
    const purchaseBatchesRef = collection(db, 'businesses', businessId, 'purchaseBatches');
    const unsubPurchaseBatches = onSnapshot(
      purchaseBatchesRef,
      (snap) => {
        const list: PurchaseBatch[] = [];
        snap.forEach((doc) => list.push(doc.data() as PurchaseBatch));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPurchaseBatches(list);
      },
      (err) => console.error('Error fetching purchase batches:', err)
    );

    // 3c. [Durable Purchase Capture Amendment v1.0] Suppliers collection —
    // reusable, tenant-scoped supplier entities. Loaded in full and
    // searched/matched client-side, exactly like Products (2, above).
    // Not a valuation input anywhere.
    const suppliersRef = collection(db, 'businesses', businessId, 'suppliers');
    const unsubSuppliers = onSnapshot(
      suppliersRef,
      (snap) => {
        const list: SupplierRecord[] = [];
        snap.forEach((doc) => list.push(doc.data() as SupplierRecord));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSuppliers(list);
      },
      (err) => console.error('Error fetching suppliers:', err)
    );

    // 4. Quebras collection
    const quebrasRef = collection(db, 'businesses', businessId, 'quebras');
    const unsubQuebras = onSnapshot(
      quebrasRef,
      (snap) => {
        const list: Quebra[] = [];
        snap.forEach((doc) => list.push(doc.data() as Quebra));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setQuebras(list);
      },
      (err) => console.error('Error fetching quebras:', err)
    );

    // 5. Expenses collection
    const expensesRef = collection(db, 'businesses', businessId, 'expenses');
    const unsubExpenses = onSnapshot(
      expensesRef,
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((doc) => list.push(doc.data() as Expense));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(list);
      },
      (err) => console.error('Error fetching expenses:', err)
    );

    // 5b. Stock Counts collection (Initial Capital + periodic counts)
    const stockCountsRef = collection(db, 'businesses', businessId, 'stockCounts');
    const unsubStockCounts = onSnapshot(
      stockCountsRef,
      (snap) => {
        const list: StockCount[] = [];
        snap.forEach((doc) => list.push(doc.data() as StockCount));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setStockCounts(list);
      },
      (err) => console.error('Error fetching stock counts:', err)
    );

    // [Void & Redo — Implementation Authorization §2 item 3] VoidRecords
    // collection — same read tier as stockCounts (isMemberOf). Small,
    // bounded (at most 3 per business, ever — POL-0008 Decision 5), so
    // loaded in full and matched client-side against stockCounts,
    // exactly like initialStockPriceChangeEvents above.
    const voidRecordsRef = collection(db, 'businesses', businessId, 'voidRecords');
    const unsubVoidRecords = onSnapshot(
      voidRecordsRef,
      (snap) => {
        const list: VoidRecord[] = [];
        snap.forEach((doc) => list.push(doc.data() as VoidRecord));
        setVoidRecords(list);
      },
      (err) => console.error('Error fetching void records:', err)
    );

    // [Business Worth Evolution — Implementation Authorization,
    // Increment 1; Specification §8, FR-7] Loaded exactly like
    // stockCounts/voidRecords above (same read tier, isMemberOf).
    // Ordering here is cosmetic only (getCurrentBusinessWorth, above,
    // does its own confirmedAt-based sort and never trusts array order)
    // — sorted for any future direct-list display (§7 FR-7's history
    // view, Increment 2+) to already read newest-first.
    const businessWorthSnapshotsRef = collection(db, 'businesses', businessId, 'businessWorthSnapshots');
    const unsubBusinessWorthSnapshots = onSnapshot(
      businessWorthSnapshotsRef,
      (snap) => {
        const list: BusinessWorthSnapshot[] = [];
        snap.forEach((doc) => list.push(doc.data() as BusinessWorthSnapshot));
        list.sort((a, b) => {
          const aMs = (a.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const bMs = (b.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        setBusinessWorthSnapshots(list);
      },
      (err) => console.error('Error fetching business worth snapshots:', err)
    );

    // [Business Worth Evolution — Implementation Authorization, Increment 3;
    // Specification §10-12] Five new, tenant-scoped, Owner-only
    // collections — loaded exactly like withdrawals (same read tier,
    // isOwnerOf), unconditionally (small, bounded per-business lists,
    // same class as businessWorthSnapshots above — no pagination
    // introduced, matching this Plan's own "no unrelated engineering
    // improvement" discipline).
    const cashLedgerEntriesRef = collection(db, 'businesses', businessId, 'cashLedgerEntries');
    const unsubCashLedgerEntries = onSnapshot(
      cashLedgerEntriesRef,
      (snap) => {
        const list: CashLedgerEntry[] = [];
        snap.forEach((doc) => list.push(doc.data() as CashLedgerEntry));
        setCashLedgerEntries(list);
      },
      (err) => console.error('Error fetching cash ledger entries:', err)
    );

    const receivablesRef = collection(db, 'businesses', businessId, 'receivables');
    const unsubReceivables = onSnapshot(
      receivablesRef,
      (snap) => {
        const list: Receivable[] = [];
        snap.forEach((doc) => list.push(doc.data() as Receivable));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReceivables(list);
      },
      (err) => console.error('Error fetching receivables:', err)
    );

    const receivablePaymentsRef = collection(db, 'businesses', businessId, 'receivablePayments');
    const unsubReceivablePayments = onSnapshot(
      receivablePaymentsRef,
      (snap) => {
        const list: ReceivablePayment[] = [];
        snap.forEach((doc) => list.push(doc.data() as ReceivablePayment));
        setReceivablePayments(list);
      },
      (err) => console.error('Error fetching receivable payments:', err)
    );

    const payablesRef = collection(db, 'businesses', businessId, 'payables');
    const unsubPayables = onSnapshot(
      payablesRef,
      (snap) => {
        const list: Payable[] = [];
        snap.forEach((doc) => list.push(doc.data() as Payable));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayables(list);
      },
      (err) => console.error('Error fetching payables:', err)
    );

    const payablePaymentsRef = collection(db, 'businesses', businessId, 'payablePayments');
    const unsubPayablePayments = onSnapshot(
      payablePaymentsRef,
      (snap) => {
        const list: PayablePayment[] = [];
        snap.forEach((doc) => list.push(doc.data() as PayablePayment));
        setPayablePayments(list);
      },
      (err) => console.error('Error fetching payable payments:', err)
    );

    // [Owner-recorded cash position] Same listener shape as payables,
    // above — sorted newest-first so consumers (DebtsView's "current"
    // reading) can simply take index 0 rather than re-sorting themselves.
    const cashPositionDeclarationsRef = collection(db, 'businesses', businessId, 'cashPositionDeclarations');
    const unsubCashPositionDeclarations = onSnapshot(
      cashPositionDeclarationsRef,
      (snap) => {
        const list: CashPositionDeclaration[] = [];
        snap.forEach((doc) => list.push(doc.data() as CashPositionDeclaration));
        list.sort((a, b) => new Date(b.declaredAt).getTime() - new Date(a.declaredAt).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCashPositionDeclarations(list);
      },
      (err) => console.error('Error fetching cash position declarations:', err)
    );

    // [Business Worth Evolution — Implementation Authorization, Increment
    // 5; Specification §13] StartupInvestmentEntry — Owner-only per
    // firestore.rules; sorted newest-first by recordedAt, mirroring
    // receivables' own createdAt-descending convention above.
    const startupInvestmentEntriesRef = collection(db, 'businesses', businessId, 'startupInvestmentEntries');
    const unsubStartupInvestmentEntries = onSnapshot(
      startupInvestmentEntriesRef,
      (snap) => {
        const list: StartupInvestmentEntry[] = [];
        snap.forEach((doc) => list.push(doc.data() as StartupInvestmentEntry));
        list.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        setStartupInvestmentEntries(list);
      },
      (err) => console.error('Error fetching startup investment entries:', err)
    );

    // [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan
    // §2/§17] Single fixed-id document, not a collection — mirrors the
    // subscription doc listener's own shape (1a, above) rather than
    // voidRecords' collection-query shape, since this artifact is a
    // per-business singleton, not a bounded list.
    const initialStockRecoveryAuthorizationRef = doc(db, 'businesses', businessId, 'initialStockRecoveryAuthorization', 'current');
    const unsubInitialStockRecoveryAuthorization = onSnapshot(
      initialStockRecoveryAuthorizationRef,
      (snap) => {
        setInitialStockRecoveryAuthorization(snap.exists() ? (snap.data() as InitialStockRecoveryAuthorization) : null);
      },
      (err) => console.error('Error fetching initial stock recovery authorization:', err)
    );

    // [Business Worth Evolution — Implementation Authorization, Increment
    // 8; Specification §26, FR-43] A FULLY SEPARATE listener from the
    // Initial-Stock one immediately above — same fixed-id-singleton
    // shape, never merged with it (mirrors the two collections'
    // own firestore.rules separation).
    const businessWorthRecoveryAuthorizationRef = doc(db, 'businesses', businessId, 'businessWorthRecoveryAuthorizations', 'current');
    const unsubBusinessWorthRecoveryAuthorization = onSnapshot(
      businessWorthRecoveryAuthorizationRef,
      (snap) => {
        setBusinessWorthRecoveryAuthorization(snap.exists() ? (snap.data() as BusinessWorthRecoveryAuthorization) : null);
      },
      (err) => console.error('Error fetching business worth recovery authorization:', err)
    );

    // [Initial Stock Valuation History] Immutable, append-only price-change
    // audit trail — read tier matches stockCounts (any team member).
    const initialStockPriceChangeEventsRef = collection(db, 'businesses', businessId, 'initialStockPriceChangeEvents');
    const unsubInitialStockPriceChangeEvents = onSnapshot(
      initialStockPriceChangeEventsRef,
      (snap) => {
        const list: InitialStockPriceChangeEvent[] = [];
        snap.forEach((doc) => list.push(doc.data() as InitialStockPriceChangeEvent));
        list.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
        setInitialStockPriceChangeEvents(list);
      },
      (err) => console.error('Error fetching initial stock price change events:', err)
    );

    // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1]
    // 5b-2. Persistent Initial Stock draft — single doc, id 'initial'.
    // Owner-only per firestore.rules; a non-Owner (Staff) session simply
    // never receives a snapshot, same as any other Owner-only read here.
    const initialDraftRef = doc(db, 'businesses', businessId, 'stockCountDrafts', 'initial');
    const unsubInitialDraft = onSnapshot(
      initialDraftRef,
      (snap) => {
        setInitialStockDraft(snap.exists() ? (snap.data() as InitialStockDraft) : null);
        setInitialStockDraftLoaded(true);
      },
      // Expected for a Staff session (rules deny read) — not an error
      // worth logging noisily; the draft simply stays null for them.
      // Still counts as "loaded": a denied read IS Firestore's actual
      // answer for this session, not an unknown/pending state.
      () => {
        setInitialStockDraft(null);
        setInitialStockDraftLoaded(true);
      }
    );

    // [Stock Count Data-Loss Resilience — Implementation Task, Section
    // 6] Persistent Periodic Contagem draft — single doc, id
    // 'periodic'. Own separate onSnapshot from the initial draft's
    // above (not a modification of it), same Owner-only-per-rules
    // reasoning.
    const periodicDraftRef = doc(db, 'businesses', businessId, 'stockCountDrafts', 'periodic');
    const unsubPeriodicDraft = onSnapshot(
      periodicDraftRef,
      (snap) => {
        setPeriodicStockDraft(snap.exists() ? (snap.data() as PeriodicStockDraft) : null);
        setPeriodicStockDraftLoaded(true);
      },
      () => {
        setPeriodicStockDraft(null);
        setPeriodicStockDraftLoaded(true);
      }
    );

    // 5c. Withdrawals collection (money the owner has taken out — NOT an expense)
    const withdrawalsRef = collection(db, 'businesses', businessId, 'withdrawals');
    const unsubWithdrawals = onSnapshot(
      withdrawalsRef,
      (snap) => {
        const list: Withdrawal[] = [];
        snap.forEach((doc) => list.push(doc.data() as Withdrawal));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWithdrawals(list);
      },
      (err) => console.error('Error fetching withdrawals:', err)
    );

    // 5c-ii. Payments collection (Module #19 V1 Manual Payment Bridge —
    // temporary confirmation bridge, not the final payment architecture)
    const paymentsRef = collection(db, 'businesses', businessId, 'payments');
    const unsubPayments = onSnapshot(
      paymentsRef,
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((doc) => list.push(doc.data() as Payment));
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setPayments(list);
      },
      (err) => console.error('Error fetching payments:', err)
    );

    // 5d. Closings collection (Monthly/Yearly period locks)
    const closingsRef = collection(db, 'businesses', businessId, 'closings');
    const unsubClosings = onSnapshot(
      closingsRef,
      (snap) => {
        const list: Closing[] = [];
        snap.forEach((doc) => list.push(doc.data() as Closing));
        list.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        setClosings(list);
      },
      (err) => console.error('Error fetching closings:', err)
    );

    // 5e. [Closing Integrity Amendment v1.0] ClosedPeriod lock-index docs
    const closedPeriodsRef = collection(db, 'businesses', businessId, 'closedPeriods');
    const unsubClosedPeriods = onSnapshot(
      closedPeriodsRef,
      (snap) => {
        const list: ClosedPeriod[] = [];
        snap.forEach((doc) => list.push(doc.data() as ClosedPeriod));
        setClosedPeriods(list);
      },
      (err) => console.error('Error fetching closed periods:', err)
    );

    // 6. Staff collection
    const staffRef = collection(db, 'businesses', businessId, 'staff');
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        const list: StaffMember[] = [];
        snap.forEach((doc) => list.push(doc.data() as StaffMember));
        setStaffMembers(list);
      },
      (err) => console.error('Error fetching staff:', err)
    );

    // 7. Timeline Events collection (Business Timeline — see types.ts).
    // Sorted by createdAt (the moment the event was logged) so entries
    // read newest-first even when several happen on the same business date.
    const timelineRef = collection(db, 'businesses', businessId, 'timelineEvents');
    const unsubTimeline = onSnapshot(
      timelineRef,
      (snap) => {
        const list: TimelineEvent[] = [];
        snap.forEach((doc) => list.push(doc.data() as TimelineEvent));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTimelineEvents(list);
      },
      (err) => console.error('Error fetching timeline events:', err)
    );

    return () => {
      unsubBusiness();
      unsubSubscription();
      unsubProducts();
      unsubBatches();
      unsubPurchaseBatches();
      unsubSuppliers();
      unsubQuebras();
      unsubExpenses();
      unsubStockCounts();
      unsubVoidRecords();
      unsubBusinessWorthSnapshots();
      unsubCashLedgerEntries();
      unsubReceivables();
      unsubReceivablePayments();
      unsubPayables();
      unsubPayablePayments();
      unsubCashPositionDeclarations();
      unsubStartupInvestmentEntries();
      unsubInitialStockRecoveryAuthorization();
      unsubBusinessWorthRecoveryAuthorization();
      unsubInitialStockPriceChangeEvents();
      unsubInitialDraft();
      unsubPeriodicDraft();
      unsubWithdrawals();
      unsubPayments();
      unsubClosings();
      unsubClosedPeriods();
      unsubStaff();
      unsubTimeline();
    };
  }, [activeBusinessId]);

  // [Durable Purchase Capture Amendment v1.0] Persistent, per-user
  // Purchase Draft — a SEPARATE, isolated effect from the main
  // business-scoped listener block above, deliberately: this is the
  // only piece of state here that depends on WHICH team member is
  // signed in (Rule 8 Assessment, Section 11 — one draft per
  // (businessId, uid) pair, document ID == the owning user's own
  // Firebase Auth uid). Keying the entire block above on
  // [activeBusinessId, currentUser] would tear down and resubscribe
  // every unrelated collection (products, batches, etc.) on every
  // staff PIN quick-login switch, even when the business doesn't
  // change — an unnecessary cost for those collections, which are
  // tenant-wide, not user-specific. Isolating this effect avoids that
  // while still correctly reacting to a user switch.
  useEffect(() => {
    // [Fix — draft load race, same class as initialStockDraft's own
    // fix above] Reset unconditionally on every businessId/uid change,
    // not only when either becomes falsy — otherwise a direct
    // business switch or a PIN quick-login user switch could leave
    // the PREVIOUS user's/business's already-loaded purchaseDraft
    // sitting in state until the new listener's first snapshot
    // arrives, momentarily misattributing it.
    setPurchaseDraft(null);
    setPurchaseDraftLoaded(false);

    const uid = currentUser?.uid;
    if (!activeBusinessId || !uid) {
      return;
    }

    const draftRef = doc(db, 'businesses', activeBusinessId, 'purchaseDrafts', uid);
    const unsubPurchaseDraft = onSnapshot(
      draftRef,
      (snap) => {
        setPurchaseDraft(snap.exists() ? (snap.data() as PurchaseDraft) : null);
        setPurchaseDraftLoaded(true);
      },
      // A denied read (e.g. subscription-blocked, or mid-permission-
      // change) is still Firestore's actual answer for this session,
      // not an unknown/pending state — same reasoning as
      // unsubInitialDraft's own error handler above.
      () => {
        setPurchaseDraft(null);
        setPurchaseDraftLoaded(true);
      }
    );

    return () => unsubPurchaseDraft();
  }, [activeBusinessId, currentUser]);

  // Actions
  const setCurrencySymbol = async (symbol: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
      currencySymbol: symbol,
    });
  };

  const setBusinessCategory = async (category: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
      category,
    });
  };

  const updateBusinessProfile = async (profile: { name: string; category: string; contact: string; location: string; email: string }) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
      name: profile.name.trim(),
      category: profile.category.trim(),
      contact: profile.contact.trim(),
      location: profile.location.trim(),
      email: profile.email.trim(),
    });

    await logTimelineEvent({
      type: 'business-profile-updated',
      date: getTodayDateString(),
      title: 'Perfil do Negócio Atualizado',
      description: `Informações de "${profile.name.trim()}" foram atualizadas.`,
      details: {
        name: profile.name.trim(),
        category: profile.category.trim(),
        contact: profile.contact.trim(),
        location: profile.location.trim(),
        email: profile.email.trim(),
      },
    });
  };

  // ============================================================
  // MULTI-SHOP: add a new shop (up to MAX_SHOPS_PER_OWNER) and make it
  // the active one, or switch which existing shop is active.
  // ============================================================
  // Module #19 Phase 1 (ADR-0001) — addShop now calls the Business
  // Provisioning Orchestrator instead of writing businesses/users
  // directly from the client. This is the "equivalent, though smaller"
  // atomicity gap the Registration & Subscription Creation Architecture
  // Decision's Future Work section named: the same server endpoint that
  // handles Registration also creates addShop's business record, updates
  // the owner's shop list, AND — Business Rule 4, "no null subscription
  // states, ever" — the new shop's initial 'trial_pending' subscription,
  // in one Firestore transaction. The client-side MAX_SHOPS_PER_OWNER
  // check below remains as an immediate UX guard (fail fast without a
  // round-trip); the server independently re-verifies it against the
  // caller's actual profile, never trusting this check alone (Rule 8
  // Assessment, Security Impact).
  const addShop = async (businessName: string, category: string, symbol: string = 'MT') => {
    if (!currentUser || !isOwner) throw new Error('Apenas o dono pode criar uma nova loja.');

    if (ownedBusinessIds.length >= MAX_SHOPS_PER_OWNER) {
      throw new Error(`Limite de ${MAX_SHOPS_PER_OWNER} lojas por conta atingido.`);
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch('/api/provisioning/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'addShop',
          businessName: businessName.trim(),
          category: category.trim(),
          currencySymbol: symbol,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Não foi possível criar a nova loja. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  // Module #19 Phase 2 (Trial Engine), Decision 1 (approved): the
  // platform-level activation concept — "the first successful
  // operational transaction that creates enduring business value" —
  // mapped, as implementation detail per that decision's own delegation,
  // onto this codebase's actual write paths: stock receipt
  // (addStockBatch/addMultipleStockBatches), expenses (addExpense),
  // inventory adjustment (addQuebra), and the initial Stock Count
  // (recordStockCount) — POL-19-001's own "recording initial business
  // inventory" example. Deliberately NOT wired to addWithdrawal (a
  // withdrawal extracts value rather than recording genuine business
  // activity) or plain product creation (catalog metadata alone doesn't
  // move Business Worth) — see the Phase 2 report for this reasoning.
  //
  // Fire-and-forget: never blocks or throws into the caller's own
  // operation — this is a best-effort trigger, not a precondition for
  // using the app. A call that's missed (offline, server briefly down)
  // has no automatic retry today; the next qualifying write attempts
  // activation again, so a business using the app at all will still
  // activate on its next real transaction — but this is an accepted
  // interim risk, not a guaranteed retry, and is called out as such in
  // the Phase 2 report.
  const triggerTrialActivation = (businessId: string) => {
    if (!currentUser) return;
    currentUser
      .getIdToken()
      .then((idToken) =>
        fetch('/api/subscriptions/activate-trial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ businessId }),
        })
      )
      .catch((err) => {
        console.warn('[trial-activation] best-effort trigger failed, ignored', err);
      });
  };

  const switchShop = async (businessId: string) => {
    if (!currentUser || !isOwner) return;
    if (!ownedBusinessIds.includes(businessId)) {
      throw new Error('Essa loja não pertence a esta conta.');
    }
    await updateDoc(doc(db, 'users', currentUser.uid), {
      activeBusinessId: businessId,
    });
  };

  // [Module #17 Owner Portfolio v0.2 addendum, currentWorth refresh
  // amendment — Accepted 2026-08-17; Stage 8 Authorization signed
  // 2026-08-17, corrected 2026-08-17 per a dedicated feasibility check]
  //
  // [Business Worth Evolution — Implementation Authorization, Increment 2;
  // Specification §7 FR-60, Rule 8 Finding 15-A; Implementation Plan §7
  // "Owner Portfolio rewire"] Rewired, this pass, to stop computing its
  // own independent `totalMarketValue − shopTotalExpenses −
  // shopTotalWithdrawals` figure — a second, competing Business Worth
  // formula (confirmed by direct inspection to already have existed
  // separately from the live Engine formula, Finding 15-A) — and instead
  // call the SAME authoritative shared calculation the Dashboard uses
  // (getEstimatedBusinessWorth, calculations.ts — Current where a
  // BusinessWorthSnapshot exists for the target shop, Estimated Case B
  // where none exists yet, exactly matching the Dashboard's own State 1a
  // treatment, per §7's own explicit instruction). "Business Worth
  // Evolution is authoritative. Owner Portfolio consumes that value
  // rather than maintaining a competing Business Worth mechanism."
  //
  // Refreshes exactly ONE owned shop's currentWorth cache, on an
  // explicit Admin action only — never automatic, never scheduled,
  // never a side effect of any other write. May target ANY owned
  // shop, active or not — confirmed safe by the governance chain's own
  // feasibility check: batches/quebras/expenses' read rules use
  // isMemberOf(businessId), withdrawals'/stockCounts'/
  // businessWorthSnapshots' use isOwnerOf(businessId)/isMemberOf(businessId)
  // — all evaluated per-businessId, never against which business is
  // "active" in this session, so an Admin already has read access to
  // every owned shop's operational data today.
  //
  // Deliberately one-time reads (getDocs), never a new onSnapshot
  // listener — the fetched data is used once, to compute a single
  // value, then discarded. This is NOT a new live subscription for a
  // non-active shop; nothing about this function changes what data is
  // continuously synced for the app. Still scoped to exactly the six
  // collections a single target business owns (batches, quebras,
  // expenses, withdrawals, stockCounts, businessWorthSnapshots) plus
  // voidRecords (needed only to resolve that shop's own
  // initialStockCount exactly as the active-shop context already does,
  // §14 marker aside — never a cross-business query, never a background
  // sweep, never a write-triggered recomputation).
  //
  // Never throws to its caller in a way that corrupts anything — a
  // failed refresh (network, read, or write failure, or a genuinely
  // UNKNOWN Business Worth for that shop — no baseline at all yet) simply
  // means the Firestore document is never touched, so any previously-
  // cached currentWorth/calculatedAt is left exactly as it was. The
  // caller (the Owner Portfolio UI) is responsible for surfacing
  // success/failure to the Admin; this function reports that outcome via
  // its return value rather than by throwing, so a failure here can
  // never propagate into breaking anything else in the app.
  const refreshShopWorth = async (businessId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isOwner) {
      return { success: false, error: 'Apenas o dono do negócio pode atualizar este valor.' };
    }
    if (!ownedBusinessIds.includes(businessId)) {
      return { success: false, error: 'Essa loja não pertence a esta conta.' };
    }

    try {
      const [batchesSnap, quebrasSnap, expensesSnap, withdrawalsSnap, stockCountsSnap, voidRecordsSnap, businessWorthSnapshotsSnap, payablesSnap, cashLedgerEntriesSnap] = await Promise.all([
        getDocs(collection(db, 'businesses', businessId, 'batches')),
        getDocs(collection(db, 'businesses', businessId, 'quebras')),
        getDocs(collection(db, 'businesses', businessId, 'expenses')),
        getDocs(collection(db, 'businesses', businessId, 'withdrawals')),
        getDocs(collection(db, 'businesses', businessId, 'stockCounts')),
        getDocs(collection(db, 'businesses', businessId, 'voidRecords')),
        getDocs(collection(db, 'businesses', businessId, 'businessWorthSnapshots')),
        getDocs(collection(db, 'businesses', businessId, 'payables')),
        getDocs(collection(db, 'businesses', businessId, 'cashLedgerEntries')),
      ]);

      const shopBatches: StockBatch[] = [];
      batchesSnap.forEach((d) => shopBatches.push(d.data() as StockBatch));
      const shopQuebras: Quebra[] = [];
      quebrasSnap.forEach((d) => shopQuebras.push(d.data() as Quebra));
      const shopExpenses: Expense[] = [];
      expensesSnap.forEach((d) => shopExpenses.push(d.data() as Expense));
      const shopWithdrawals: Withdrawal[] = [];
      withdrawalsSnap.forEach((d) => shopWithdrawals.push(d.data() as Withdrawal));
      const shopStockCounts: StockCount[] = [];
      stockCountsSnap.forEach((d) => shopStockCounts.push(d.data() as StockCount));
      const shopVoidRecords: VoidRecord[] = [];
      voidRecordsSnap.forEach((d) => shopVoidRecords.push(d.data() as VoidRecord));
      const shopBusinessWorthSnapshots: BusinessWorthSnapshot[] = [];
      businessWorthSnapshotsSnap.forEach((d) => shopBusinessWorthSnapshots.push(d.data() as BusinessWorthSnapshot));
      const shopPayables: Payable[] = [];
      payablesSnap.forEach((d) => shopPayables.push(d.data() as Payable));
      const shopCashLedgerEntries: CashLedgerEntry[] = [];
      cashLedgerEntriesSnap.forEach((d) => shopCashLedgerEntries.push(d.data() as CashLedgerEntry));

      // Same "exclude a voided confirmation" choke point the active-shop
      // context already applies (see `initialStockCount`'s own definition,
      // above) — applied here to this OTHER shop's own data, never mixed
      // with the active shop's.
      const shopVoidedConfirmationIds = new Set(shopVoidRecords.map((v) => v.voidedConfirmationId));
      const shopInitialStockCount =
        shopStockCounts.find((s) => s.type === 'initial' && !shopVoidedConfirmationIds.has(s.id)) || null;

      const shopEstimatedOrCurrentWorth = getEstimatedBusinessWorth({
        snapshots: shopBusinessWorthSnapshots,
        initialStockCount: shopInitialStockCount,
        batches: shopBatches,
        quebras: shopQuebras,
        expenses: shopExpenses,
        withdrawals: shopWithdrawals,
        payables: shopPayables,
        cashLedgerEntries: shopCashLedgerEntries,
      });

      if (shopEstimatedOrCurrentWorth === 'UNKNOWN') {
        // No baseline at all yet for this shop (no Capital Inicial, no
        // BusinessWorthSnapshot) — never write a fabricated currentWorth
        // value; report this as a (non-corrupting) failure instead,
        // matching this function's own established "no fabricated
        // substitute" discipline.
        return { success: false, error: 'Esta loja ainda não tem Capital Inicial definido.' };
      }

      const value = shopEstimatedOrCurrentWorth;

      await updateDoc(doc(db, 'businesses', businessId), {
        currentWorth: {
          value: Number(value.toFixed(2)),
          calculatedAt: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error refreshing shop worth:', businessId, err);
      return { success: false, error: err.message || 'Erro ao atualizar o valor desta loja.' };
    }
  };

  // ============================================================
  // BUSINESS TIMELINE LOGGING
  // ============================================================
  // Writes one append-only history entry alongside an action that already
  // happened elsewhere in this file. Never touches — and is never touched
  // by — any calculation. If logging fails for any reason, it is swallowed
  // so the underlying business action (which already succeeded) is never
  // rolled back or reported as failed just because its history entry didn't
  // get written.
  const logTimelineEvent = async (input: {
    type: TimelineActivityType;
    date: string;
    title: string;
    description: string;
    financialImpact?: TimelineFinancialImpact[];
    details?: Record<string, string | number | undefined>;
    productName?: string;
    supplierName?: string;
    batchNumber?: string;
    expenseCategory?: string;
    // [Stock Count Data-Loss Resilience — Implementation Task, Section
    // 3] Optional explicit id, used only by the periodic finalization
    // call site so a retry's write lands on the same document instead
    // of creating a second one. Every other existing call site omits
    // this and keeps the random-id behavior below unchanged.
    id?: string;
  }) => {
    if (!activeBusinessId) return;
    const newEvent: TimelineEvent = {
      id: input.id || 'tl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: input.type,
      date: input.date,
      createdAt: new Date().toISOString(),
      userName: userProfile.name || 'Utilizador',
      title: input.title,
      description: input.description,
      financialImpact: input.financialImpact,
      details: input.details,
      productName: input.productName,
      supplierName: input.supplierName,
      batchNumber: input.batchNumber,
      expenseCategory: input.expenseCategory,
    };
    try {
      await setDoc(doc(db, 'businesses', activeBusinessId, 'timelineEvents', newEvent.id), newEvent);
    } catch (err) {
      console.error('Error logging timeline event:', err);
    }
    // SuperAdmin V1 Operational Control Plane, Phase E (BDR-0010,
    // POL-18-001) — the approved server-authoritative lastActivityAt
    // mechanism (BDR-0010 Part 5). Deliberately its own, independent
    // try/catch — the qualifying activity itself (the stock/expense/
    // etc. write this function is always called after) has already
    // happened regardless of whether the timelineEvents write above
    // succeeded, so this fires unconditionally, not nested inside that
    // block. Best-effort, fire-and-forget in spirit: never blocks this
    // function's return, never surfaces to the caller, never retried
    // here — matching BDR-0010 Part 6's explicit "never block the
    // underlying business action" requirement. The server-side
    // /api/business/touch-activity endpoint itself also never returns
    // a failure status for this reason — see server/index.ts's own
    // comment at that route for the matching half of this contract.
    try {
      const idToken = await currentUser?.getIdToken();
      if (idToken) {
        await fetch('/api/business/touch-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ businessId: activeBusinessId }),
        });
      }
    } catch (err) {
      console.error('Error touching business activity:', err);
    }
  };

  // Report exports have no other collection to hook into — the Reports
  // screen calls this directly whenever a PDF/Excel export or print action
  // completes.
  const logReportExport = async (reportTitle: string) => {
    await logTimelineEvent({
      type: 'report-exported',
      date: getTodayDateString(),
      title: 'Relatório Exportado',
      description: `Relatório "${reportTitle}" foi exportado.`,
      details: { reportTitle },
    });
  };

  const addStockBatch = async ({ productName, dateEntered, quantity, unit, costPrice, sellingPrice, previousRemainingQuantity, unitRelationship }: AddStockParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const businessId = activeBusinessId;
    const trimmedName = productName.trim();

    let product = products.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    let productId = product?.id;
    let isNewProduct = false;

    // [Restock Observation Amendment v1.0] The most recent PRIOR batch
    // for this product (if any) is this restock's "previous cycle" —
    // the same batch whose price already prefills the form client-side
    // (AddStockView's own `productBatches[0]`). `undefined` for a
    // brand-new product — there is no prior cycle to compare against.
    const previousBatchForProduct = !product
      ? undefined
      : findMostRecentBatchForProduct(batches, productId!);
    const restockObservation = computeRestockObservation(
      previousBatchForProduct?.quantity,
      previousRemainingQuantity,
      new Date().toISOString()
    );

    if (!product) {
      productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      // [Product Memory / UOM — Increment A] Only ever reached for a
      // genuinely NEW product (this whole block is inside `if
      // (!product)`) — an existing product's unitRelationship is never
      // read or touched here. Re-validated via isValidUnitRelationship
      // regardless of what the caller passed, since this is the actual
      // Firestore write path, not merely a UI-layer check; an invalid
      // or absent value simply means the new product starts with no
      // confirmed configuration (BDR-0012 §5.A Item 6's ordinary,
      // fully-anticipated warn-not-block state), never an error.
      const newProd: Product = {
        id: productId,
        name: trimmedName,
        createdAt: new Date().toISOString(),
        ...(unitRelationship && isValidUnitRelationship(unitRelationship) ? { unitRelationship } : {}),
      };
      await setDoc(doc(db, 'businesses', businessId, 'products', productId), newProd);
      isNewProduct = true;
    }

    // [Fix #10 — transactional open-batch supersession] Enforces the
    // existing Stock Batch spec rule (docs/specs/05-stock-batches.md:
    // "only one batch per product can be 'open' at a time... every
    // previously-open batch for that same product is automatically
    // closed") atomically, so two concurrent addStockBatch calls for the
    // same product (two staff, two tabs, a retried request) can never
    // both observe "no open batch" and both leave their own batch open.
    //
    // The Firebase Web SDK's Transaction.get() only accepts a single
    // DocumentReference — it has no Query overload (verified directly
    // against node_modules/@firebase/firestore's own type declarations;
    // this is a real SDK constraint, not a stylistic choice), so "find
    // all open batches for this product" cannot be read transactionally
    // via a query. `openBatchLocks/{productId}` exists purely to give
    // every addStockBatch transaction for the same product a single,
    // known document to read and write — the concrete anchor Firestore's
    // optimistic-concurrency control needs to actually serialize two
    // concurrent transactions against each other.
    //
    // IMPORTANT: this document is a concurrency-control mechanism, not
    // business data. It exists solely to provide a deterministic
    // transaction read/write anchor for the single-open-batch invariant
    // — it is written by this function only, read by no other code path
    // in this app, is not a valuation input, and never appears in
    // Business Worth, Stock Value, or any report. Do not extend it into
    // an application-facing collection.
    //
    // Because Firestore's transaction conflict-detection is based on
    // every path a transaction reads via tx.get() — including a read
    // that finds nothing there yet — two transactions that both read
    // this SAME lock path are serialized by Firestore even on a
    // product's very first-ever write, before either one has created the
    // lock document: whichever commits first invalidates the other's
    // read of that (until-then-nonexistent) path, and the SDK retries
    // the second automatically, at which point it sees the first
    // transaction's now-written lock and correctly closes that batch
    // before creating its own. This is the general Firestore transaction
    // guarantee, not something specific to documents that already exist.
    //
    // Bootstrap caveat (the real residual gap, distinct from the above):
    // for a legacy product that already has an open batch predating this
    // fix (so no lock doc exists yet), the first post-fix transaction's
    // candidate list of "what to check" comes from AppContext's live
    // `batches` listener (client state) — used only to decide *which
    // documents to tx.get()*, never as authority on what's open (that
    // decision is always made from the fresh tx.get() snapshot itself).
    // If that client snapshot is missing/stale and doesn't include the
    // legacy open batch's id, that legacy batch is not part of this
    // transaction's read set at all, so it is never closed and the lock
    // is still created pointing at the new batch — leaving the legacy
    // batch open indefinitely as an orphan, not serialized. This does
    // NOT undermine serialization of concurrent post-fix writes (the
    // lock-based conflict detection above holds regardless); it is a
    // one-time legacy-data cleanup risk, distinct from a live-concurrency
    // race, and is called out as an explicit residual risk in the Fix #10
    // report rather than solved here.
    const lockRef = doc(db, 'businesses', businessId, 'openBatchLocks', productId!);
    const candidateOpenBatchIds = isNewProduct
      ? []
      : batches.filter((b) => b.productId === productId && b.status === 'open').map((b) => b.id);

    // Create new batch
    const newBatchId = 'batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newBatch: StockBatch = {
      id: newBatchId,
      productId: productId!,
      dateEntered,
      quantity: Number(quantity),
      unit: unit ? unit.trim() : 'un',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      status: 'open',
      createdAt: new Date().toISOString(),
      // [Restock Observation Amendment v1.0] Conditionally spread, same
      // undefined-field discipline this codebase already applies to
      // every other optional field (see `purchaseBatchId` on this same
      // type, and the Durable Purchase Capture Amendment's own
      // supplier/notes fields elsewhere in this file) — never written
      // when no valid observation could be computed.
      ...(restockObservation ? { restockObservation } : {}),
    };
    const newBatchRef = doc(db, 'businesses', businessId, 'batches', newBatchId);

    await runTransaction(db, async (tx) => {
      // ---- READS (all before any write — required by Firestore) ----
      const lockSnap = await tx.get(lockRef);
      const lockData = lockSnap.exists() ? (lockSnap.data() as { openBatchId?: string | null }) : null;
      const lockOpenBatchId = lockData?.openBatchId ?? null;

      const idsToCheck = computeBatchIdsToCheck(lockSnap.exists(), lockOpenBatchId, candidateOpenBatchIds);

      const checkedBatches: CheckedBatchSnapshot[] = [];
      const batchRefsById = new Map<string, ReturnType<typeof doc>>();
      for (const id of idsToCheck) {
        const ref = doc(db, 'businesses', businessId, 'batches', id);
        batchRefsById.set(id, ref);
        const snap = await tx.get(ref);
        checkedBatches.push({
          id,
          exists: snap.exists(),
          status: snap.exists() ? (snap.data() as { status?: string }).status : undefined,
        });
      }

      // ---- WRITES (only after every read above has completed) ----
      const idsToClose = computeBatchesToClose(checkedBatches);
      for (const id of idsToClose) {
        tx.update(batchRefsById.get(id)!, { status: 'closed' });
      }

      tx.set(newBatchRef, newBatch);
      tx.set(lockRef, {
        productId,
        openBatchId: newBatchId,
        updatedAt: new Date().toISOString(),
      });
    });

    if (isNewProduct) {
      await logTimelineEvent({
        type: 'product-created',
        date: dateEntered,
        title: 'Produto Criado',
        description: `"${trimmedName}" foi adicionado como novo produto.`,
        productName: trimmedName,
        details: { productName: trimmedName },
      });
    }

    const investmentValue = Number(quantity) * Number(costPrice);
    const marketValue = Number(quantity) * Number(sellingPrice);
    await logTimelineEvent({
      type: 'stock-batch-created',
      date: dateEntered,
      title: 'Stock Adicionado',
      description: `${quantity} ${unit ? unit.trim() : 'un'} de "${trimmedName}" adicionado(s) ao stock.`,
      productName: trimmedName,
      financialImpact: [
        { label: 'Investimento', amount: investmentValue, tone: 'neutral' },
        { label: 'Lucro Embutido', amount: marketValue - investmentValue, tone: 'positive' },
      ],
      details: {
        productName: trimmedName,
        quantity,
        unit: unit ? unit.trim() : 'un',
        costPrice,
        sellingPrice,
        investmentValue,
        marketValue,
        embeddedProfit: marketValue - investmentValue,
      },
    });

    triggerTrialActivation(businessId);
    return { productId: productId!, batchId: newBatchId };
  };

  // [Supplier-Wording Recognition — Checkpoint 3] Confirms one
  // supplier-wording-to-product relationship (Checkpoint 1's
  // SupplierWordingRelationship, appended to Product.supplierWordings),
  // transaction-protected per Rule 8 Finding 13. Internal helper, not
  // exposed on the context value — called only from
  // addMultipleStockBatches below, after the stock/product write has
  // already committed and the supplier's own identity is known.
  //
  // Reads the TARGET product plus every `conflictCheckProductId` FRESH,
  // inside the transaction (never from stale client state — see
  // supplierWordingConfirmation.ts's own module comment for the full
  // reasoning behind this specific mechanism, and its one acknowledged
  // residual gap). Throws SupplierWordingConflictError if a different
  // product already independently claims this exact
  // (supplierRecordId, wording) pair; resolves silently (no write) if
  // the target already holds it (idempotent retry); otherwise appends
  // the new relationship.
  const confirmSupplierWordingRelationship = async (
    businessId: string,
    targetProductId: string,
    supplierRecordId: string,
    wording: string,
    conflictCheckProductIds: string[],
    provenance: 'system-proposed' | 'owner-initiated'
  ): Promise<void> => {
    const trimmedWording = wording.trim();
    if (!trimmedWording) return;

    const idsToCheck = Array.from(new Set([targetProductId, ...conflictCheckProductIds]));

    await runTransaction(db, async (tx) => {
      // ---- READS (all before any write — required by Firestore) ----
      const snapshots: CheckedProductWordingSnapshot[] = [];
      const refsById = new Map<string, ReturnType<typeof doc>>();
      for (const id of idsToCheck) {
        const ref = doc(db, 'businesses', businessId, 'products', id);
        refsById.set(id, ref);
        const snap = await tx.get(ref);
        const data = snap.exists() ? (snap.data() as Product) : undefined;
        snapshots.push({
          productId: id,
          exists: snap.exists(),
          supplierWordings: (data?.supplierWordings ?? []).map((r) => ({
            supplierRecordId: r.supplierRecordId,
            wording: r.wording,
          })),
        });
      }

      const plan = planSupplierWordingConfirmation(targetProductId, supplierRecordId, trimmedWording, snapshots);

      if (plan.conflict) {
        throw new SupplierWordingConflictError(plan.conflict.productId);
      }
      if (!plan.shouldWrite) {
        // Either already-confirmed (idempotent no-op) or the target
        // product no longer exists (nothing safe to write to).
        return;
      }

      // ---- WRITES (only after every read above has completed) ----
      const targetSnapshot = snapshots.find((s) => s.productId === targetProductId)!;
      const newRelationship: SupplierWordingRelationship = {
        supplierRecordId,
        wording: trimmedWording,
        confirmedAt: new Date().toISOString(),
        provenance,
        ...(userProfile?.name ? { confirmedByName: userProfile.name } : {}),
      };
      tx.update(refsById.get(targetProductId)!, {
        supplierWordings: [...targetSnapshot.supplierWordings, newRelationship],
      });
    });
  };

  const addMultipleStockBatches = async (
    items: AddStockParams[],
    supplier?: Supplier,
    notes?: string,
    supplierId?: string,
    purchaseEventId?: string,
    supplierCredit?: boolean
  ) => {
    if (!activeBusinessId || !items.length) return { purchaseBatchId: null };
    const businessId = activeBusinessId;

    const fsBatch = createFirestoreBatch(db);

    // Track products updated/created in this loop
    const tempProducts = [...products];
    const tempBatches = [...batches];
    // [Supplier-Wording Recognition — Checkpoint 5] Extended from a plain
    // string[] to carry each new product's optional distinguishing
    // information (POL-0007's mandatory-on-conflict requirement) through
    // to its own product-created timeline event, below. Absent for the
    // overwhelming majority of new products (no conflict was involved).
    const newlyCreatedProductNames: Array<{ name: string; distinguishingInfo?: string }> = [];
    let totalInvestmentValue = 0;
    let totalMarketValue = 0;
    const lineItemSummaries: { productName: string; quantity: number; unit: string }[] = [];
    // [Supplier-Wording Recognition — Checkpoint 3] Collected during the
    // per-item loop below, resolved AFTER fsBatch.commit() succeeds (see
    // after the loop) — each entry pairs a resolved existing productId
    // with the NEW relationship that must be confirmed for it. Never
    // populated for a brand-new product (Specification §4 — no
    // relationship, wording IS the new Product.name) or for a silent
    // reuse-match (no new relationship, nothing to write).
    const pendingSupplierWordingConfirmations: Array<{
      productId: string;
      wording: string;
      provenance: 'system-proposed' | 'owner-initiated';
      conflictCheckProductIds: string[];
    }> = [];

    // [Durable Purchase Capture Amendment v1.0] Supplier find-or-create.
    // Resolution itself is a pure function
    // (resolveSupplierForPurchase, purchaseBatchCalculations.ts) so it
    // can be tested without a live Firestore client — this block only
    // handles the Firestore-specific part: generating a new document
    // id and adding it to the SAME batch as everything else (Rule 8
    // Assessment, Section 13). A brand-new SupplierRecord is only ever
    // created here, at finalization — never while a draft is merely
    // being typed, so an abandoned draft leaves no permanent Supplier
    // behind.
    const supplierResolution = resolveSupplierForPurchase(suppliers, {
      supplierId,
      supplierName: supplier?.name,
      supplierPhone: supplier?.phone,
      supplierNotes: supplier?.notes,
    });
    let resolvedSupplierId = supplierResolution.matchedSupplierId;
    const resolvedSupplierName = supplierResolution.name;
    const resolvedSupplierPhone = supplierResolution.phone;
    const resolvedSupplierNotes = supplierResolution.notes;

    if (!resolvedSupplierId && resolvedSupplierName) {
      // No existing SupplierRecord matched, but a name was given (new
      // or free-text) — create one now, in the same batch.
      //
      // [Bug fix — undefined-field Firestore rejection] phone/notes are
      // conditionally spread, never assigned `undefined` directly. This
      // repository's Firestore client uses default settings
      // (ignoreUndefinedProperties is NOT enabled, src/lib/firebase.ts)
      // — WriteBatch.set()/setDoc() reject any field whose value is the
      // literal `undefined`, even nested inside an object, at call time
      // (synchronously, before any network I/O). `phone: resolvedSupplierPhone`
      // would set that literal value whenever no phone was entered,
      // throwing "Unsupported field value: undefined" and aborting the
      // entire write before fsBatch.commit() is ever reached. Omitting
      // the key entirely — rather than writing `''` — matches
      // SupplierRecord's own `phone?: string` type contract (absent,
      // not empty) and this repository's existing convention for
      // exactly this situation (InitialStockPriceChangeEvent.reason,
      // `...(reason?.trim() ? { reason: reason.trim() } : {})`, above).
      const newSupplierId = 'supplier-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const newSupplierRecord: SupplierRecord = {
        id: newSupplierId,
        name: resolvedSupplierName,
        ...(resolvedSupplierPhone ? { phone: resolvedSupplierPhone } : {}),
        ...(resolvedSupplierNotes ? { notes: resolvedSupplierNotes } : {}),
        createdAt: new Date().toISOString(),
        createdByName: userProfile.name,
      };
      fsBatch.set(doc(db, 'businesses', businessId, 'suppliers', newSupplierId), newSupplierRecord);
      resolvedSupplierId = newSupplierId;
    }
    // If neither a supplierId nor a name was given at all, resolvedSupplierId
    // stays undefined and resolvedSupplierName stays '' — unchanged from
    // today's behavior (falls through to 'Fornecedor Não Especificado' below).

    // Create the Purchase Batch envelope (the Investment Ledger entry) that
    // will group every line item created below under one supplier/date/
    // batch number. This never touches cost/price figures — those still
    // live entirely on the StockBatch line items and the existing
    // Embedded Profit engine in calculations.ts.
    //
    // [Bug fix — undefined-field Firestore rejection] Same fix applied
    // here: supplier.phone/notes, the top-level supplierId, and the
    // top-level notes are all conditionally spread. supplierId and
    // notes are pre-existing optional fields — supplierId is new to
    // this amendment; notes?.trim() || undefined already existed
    // before this amendment and shared the identical vulnerability
    // whenever no batch notes were entered, independent of anything
    // supplier-related. Fixed here as part of the same narrowly-scoped
    // correction, since this exact write path now exercises it.
    const newBatchSeq = getNextBatchSeq(purchaseBatches);
    const newPurchaseBatchId = 'pbatch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newPurchaseBatch: PurchaseBatch = {
      id: newPurchaseBatchId,
      batchNumber: generateBatchNumber(newBatchSeq),
      batchSeq: newBatchSeq,
      date: items[0].dateEntered,
      supplier: {
        name: resolvedSupplierName || 'Fornecedor Não Especificado',
        ...(resolvedSupplierPhone ? { phone: resolvedSupplierPhone } : {}),
        ...(resolvedSupplierNotes ? { notes: resolvedSupplierNotes } : {}),
      },
      ...(resolvedSupplierId ? { supplierId: resolvedSupplierId } : {}),
      // [Multi-Supplier Purchase Event Amendment v1.0] Conditionally
      // spread, same discipline as every other optional field on this
      // document — never assigned `undefined` (Part 5).
      ...(purchaseEventId ? { purchaseEventId } : {}),
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
      createdByName: userProfile.name,
      createdAt: new Date().toISOString(),
    };
    fsBatch.set(doc(db, 'businesses', businessId, 'purchaseBatches', newPurchaseBatchId), newPurchaseBatch);

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const trimmedName = item.productName.trim();
      if (!trimmedName) continue;

      let product = tempProducts.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
      let productId = product?.id;

      if (!product) {
        productId = 'prod-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
        // [Product Memory / UOM — Increment A] Same "genuinely new
        // product only, re-validated at the actual write path" rule as
        // addStockBatch's own product-creation branch, above.
        const newProd: Product = {
          id: productId,
          name: trimmedName,
          createdAt: new Date().toISOString(),
          ...(item.unitRelationship && isValidUnitRelationship(item.unitRelationship) ? { unitRelationship: item.unitRelationship } : {}),
        };
        const prodRef = doc(db, 'businesses', businessId, 'products', productId);
        fsBatch.set(prodRef, newProd);
        tempProducts.push(newProd);
        newlyCreatedProductNames.push({
          name: trimmedName,
          ...(item.distinguishingInfo?.trim() ? { distinguishingInfo: item.distinguishingInfo.trim() } : {}),
        });
      } else if (item.pendingSupplierWording) {
        // [Supplier-Wording Recognition — Checkpoint 3] `product` is an
        // EXISTING product (this branch only runs when `!product` above
        // was false) and this item carries a pending relationship —
        // AddStockView.tsx already rewrote `item.productName` to this
        // exact product's canonical name before calling us (a candidate
        // confirmation or an owner-initiated declaration), so `productId`
        // above already resolved correctly via ordinary name matching;
        // nothing about batch/product creation changes. Collected here,
        // resolved into an actual write only AFTER fsBatch.commit()
        // succeeds, below — never before (Specification §8: nothing is
        // persisted to Product until this entry's own finalization
        // commit actually succeeds).
        pendingSupplierWordingConfirmations.push({
          productId: productId!,
          wording: item.pendingSupplierWording.wording,
          provenance: item.pendingSupplierWording.provenance,
          conflictCheckProductIds: item.pendingSupplierWording.conflictCheckProductIds,
        });
      }

      // [Restock Observation Amendment v1.0] Resolve the "previous
      // cycle" (most recent EXISTING batch for this product) BEFORE
      // this item's own new batch is pushed into tempBatches below —
      // otherwise a product name repeated across two rows in the same
      // submission would see its own not-yet-committed sibling row as
      // its "previous cycle," which is never correct. `product` is the
      // pre-loop lookup above, so this is `undefined` exactly when the
      // product is brand-new to this submission.
      const previousBatchForProduct = !product
        ? undefined
        : findMostRecentBatchForProduct(tempBatches, productId!);
      const restockObservation = computeRestockObservation(
        previousBatchForProduct?.quantity,
        item.previousRemainingQuantity,
        new Date().toISOString()
      );

      // Close open batches for this product
      const openBatches = tempBatches.filter((b) => b.productId === productId && b.status === 'open');
      for (const b of openBatches) {
        const batchRef = doc(db, 'businesses', businessId, 'batches', b.id);
        fsBatch.update(batchRef, { status: 'closed' });
        const idx = tempBatches.findIndex((tb) => tb.id === b.id);
        if (idx !== -1) {
          tempBatches[idx] = { ...tempBatches[idx], status: 'closed' };
        }
      }

      // Add new batch
      const newBatchId = 'batch-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
      const batchUnit = item.unit ? item.unit.trim() : 'un';

      // [Increment B, Checkpoint B3 — Consolidated Specification §13-14,
      // Rule 8 Assessment Finding 1/2, revised] Concept C: computed
      // ONCE, here, at the exact moment this batch is about to be
      // written, via the pure, independently-tested
      // buildDerivedSellingValuationSnapshot (purchaseToSellingConversion.ts)
      // — this call site is deliberately thin glue, matching this
      // repo's established pattern (supplierWordingConfirmation.ts,
      // openBatchSupersession.ts). Reads whichever Product Memory is
      // CURRENTLY confirmed for this product (the `product` lookup
      // above, resolved fresh from `tempProducts` at the top of this
      // function call — never a stale earlier read). `product` is
      // `undefined` here for a brand-new product created earlier in
      // THIS SAME loop iteration (the `!product` branch, above) — a
      // brand-new product has no Product.sellingPrice yet, so
      // derivation correctly does not fire for a product's own very
      // first batch (BDR-0012 §5.A Item 6's ordinary warn-not-block
      // case, never an error).
      //
      // PURCHASE FACTS ARE NEVER TOUCHED BY THIS: item.quantity/
      // batchUnit/item.costPrice above (and newBatch.sellingPrice,
      // below) are read completely unchanged, exactly as before this
      // checkpoint — this call only ever ADDS the separate, optional
      // derivedSellingValuation object; it never reads or writes
      // item.sellingPrice (StockBatch.sellingPrice is a different
      // concept entirely from Product Memory's remembered selling
      // price, §4/§13 — conflating the two is exactly the error this
      // Increment's governance chain exists to prevent).
      const derivedSellingValuation = buildDerivedSellingValuationSnapshot(
        product ? { unitRelationship: product.unitRelationship, sellingPrice: product.sellingPrice } : undefined,
        batchUnit
      );

      const newBatch: StockBatch = {
        id: newBatchId,
        productId: productId!,
        dateEntered: item.dateEntered,
        quantity: Number(item.quantity),
        unit: batchUnit,
        costPrice: Number(item.costPrice),
        sellingPrice: Number(item.sellingPrice),
        // [Restock Observation Amendment v1.0] Same undefined-field
        // discipline as addStockBatch above — never written when no
        // valid observation could be computed.
        ...(restockObservation ? { restockObservation } : {}),
        status: 'open',
        createdAt: new Date().toISOString(),
        purchaseBatchId: newPurchaseBatchId,
        // [Increment B, Checkpoint B3] Same undefined-field discipline
        // as every other optional StockBatch field above — absent,
        // never a placeholder/null, whenever no derivation fired.
        ...(derivedSellingValuation ? { derivedSellingValuation } : {}),
      };

      const newBatchRef = doc(db, 'businesses', businessId, 'batches', newBatchId);
      fsBatch.set(newBatchRef, newBatch);
      tempBatches.push(newBatch);

      totalInvestmentValue += Number(item.quantity) * Number(item.costPrice);
      totalMarketValue += Number(item.quantity) * Number(item.sellingPrice);
      lineItemSummaries.push({
        productName: trimmedName,
        quantity: Number(item.quantity),
        unit: batchUnit,
      });
    }

    // [Business Worth Evolution — Implementation Authorization, Increment
    // 3; Specification §12 Case 2, FR-14] Supplier-credit purchase — a
    // Payable is created, in the SAME atomic batch as the stock write
    // above, for this purchase's own total investment (cost) value. The
    // stock acquisition itself is entirely unmodified above (+Stock
    // remains the sole acquisition record) — this adds one additional
    // document only, never a duplicate purchase record. No Business
    // Worth change occurs here beyond what the resulting batches'
    // embedded profit already produces (FR-14) — the live calculation's
    // own payables-position term (calculations.ts) is what reflects this
    // Payable's outstanding balance, not this write itself.
    if (supplierCredit && totalInvestmentValue > 0) {
      const newPayableId = 'payable-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const roundedTotal = Number(totalInvestmentValue.toFixed(2));
      const newPayable: Payable = {
        id: newPayableId,
        businessId,
        sourcePurchaseBatchId: newPurchaseBatchId,
        ...(resolvedSupplierId ? { supplierId: resolvedSupplierId } : {}),
        totalAmount: roundedTotal,
        amountPaid: 0,
        amountRemaining: roundedTotal,
        status: 'unpaid',
        createdAt: new Date().toISOString(),
      };
      fsBatch.set(doc(db, 'businesses', businessId, 'payables', newPayableId), newPayable);
    }

    // [Durable Purchase Capture Amendment v1.0] Clear the finalizing
    // user's Purchase Draft in the SAME atomic batch as everything
    // above — Firestore batch writes are all-or-nothing, so if this
    // batch fails to commit, the draft is left completely untouched
    // (Rule 8 Assessment, Section 12). Safe even when no draft
    // document exists for this user (Firestore delete on a
    // non-existent doc is a no-op within a batch, not an error) — this
    // repository's Add Stock flow now always sources its rows from a
    // draft, but this call remains correct even if invoked without one.
    if (currentUser) {
      fsBatch.delete(doc(db, 'businesses', businessId, 'purchaseDrafts', currentUser.uid));
    }

    await fsBatch.commit();

    // [Supplier-Wording Recognition — Checkpoint 3] Run AFTER the stock/
    // product write has already committed, and only if a real supplier
    // identity now exists (a relationship must be keyed to
    // SupplierRecord.id per Rule 8 Finding 2 — this is always true here
    // by construction, since AddStockView.tsx only ever populates
    // pendingSupplierWording once a candidate/reuse/declaration already
    // exists, which only ever fires alongside a resolvable supplier, but
    // guarded defensively regardless). Each confirmation is its own
    // transaction (Rule 8 Finding 13) — sequential, not parallel, so two
    // rows in the SAME submission that happen to reference each other as
    // conflictCheckProductIds are still checked against each other's
    // already-committed result, not a stale pre-loop snapshot.
    //
    // Deliberately best-effort past this point: the stock itself is
    // already durably recorded (the value that matters most). If a
    // relationship confirmation fails (conflict, transient network
    // issue), that ONE relationship simply isn't remembered this time —
    // exactly Specification §10's "owner abandons confirmation mid-flow"
    // failure mode, not a reason to make the caller believe their stock
    // entry itself failed. Never surfaced via the blocking alert() the
    // catch block around this whole call would otherwise show.
    if (resolvedSupplierId) {
      for (const pending of pendingSupplierWordingConfirmations) {
        try {
          await confirmSupplierWordingRelationship(
            businessId,
            pending.productId,
            resolvedSupplierId,
            pending.wording,
            pending.conflictCheckProductIds,
            pending.provenance
          );
        } catch (err) {
          console.error('[supplierWordingRelationship] confirmation failed, non-blocking', err);
        }
      }
    }

    for (const newProduct of newlyCreatedProductNames) {
      const { description, details } = buildProductCreatedTimelineEventContent(
        newProduct.name,
        newProduct.distinguishingInfo
      );
      await logTimelineEvent({
        type: 'product-created',
        date: items[0].dateEntered,
        title: 'Produto Criado',
        description,
        productName: newProduct.name,
        details,
      });
    }

    const supplierName = newPurchaseBatch.supplier.name;
    await logTimelineEvent({
      type: 'stock-batch-created',
      date: newPurchaseBatch.date,
      title: 'Lote de Compra Criado',
      description: `Lote ${newPurchaseBatch.batchNumber} registado junto de ${supplierName}, com ${lineItemSummaries.length} produto(s).`,
      productName: lineItemSummaries.length === 1 ? lineItemSummaries[0].productName : undefined,
      supplierName,
      batchNumber: newPurchaseBatch.batchNumber,
      financialImpact: [
        { label: 'Investimento', amount: totalInvestmentValue, tone: 'neutral' },
        { label: 'Lucro Embutido', amount: totalMarketValue - totalInvestmentValue, tone: 'positive' },
      ],
      details: {
        batchNumber: newPurchaseBatch.batchNumber,
        supplierName,
        notes: newPurchaseBatch.notes,
        products: lineItemSummaries.map((li) => `${li.quantity} ${li.unit} ${li.productName}`).join(', '),
        investmentValue: totalInvestmentValue,
        marketValue: totalMarketValue,
        embeddedProfit: totalMarketValue - totalInvestmentValue,
      },
    });

    triggerTrialActivation(businessId);
    return { purchaseBatchId: newPurchaseBatchId };
  };

  // [Multi-Supplier Purchase Event Amendment v1.0] Retroactively tags
  // an already-finalized PurchaseBatch with a Purchase Event
  // correlation — the "Add Another Supplier" moment, when the Admin
  // decides only AFTER finalizing the first purchase that a second one
  // (a different supplier) belongs to the same restocking activity
  // (amendment Part 7). A single-field, single-document update — never
  // a batch, never touches StockBatch/Product/Supplier records, never
  // touches any cost/price/valuation figure. Reuses the existing,
  // unmodified purchaseBatches `update` rule (isMemberOf-only, no
  // subscription gate) — the same tier archive/unarchive already uses,
  // on the same reasoning: organizing an already-real record doesn't
  // create or change Business Worth.
  const attachPurchaseEventId = async (purchaseBatchId: string, purchaseEventId: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId, 'purchaseBatches', purchaseBatchId), {
      purchaseEventId,
    });
  };

  // Archiving is a reversible, explicit action (never automatic) that
  // simply hides a fully-settled Purchase Batch from the default active
  // ledger view — it does not touch any StockBatch line item or figure.
  const archivePurchaseBatch = async (id: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId, 'purchaseBatches', id), {
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  };

  const unarchivePurchaseBatch = async (id: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId, 'purchaseBatches', id), {
      archived: false,
      archivedAt: null,
    });
  };

  const addQuebra = async ({ productId, batchId, date, quantityLost, reason, submissionId }: AddQuebraParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const businessId = activeBusinessId;
    // [Bug fix — no duplicate-submission protection] Same discipline as
    // addExpense/addWithdrawal's own identical fix, above.
    const quebraId = submissionId || 'quebra-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const quebraRef = doc(db, 'businesses', businessId, 'quebras', quebraId);
    const existingSnap = await getDoc(quebraRef);
    if (existingSnap.exists()) {
      return existingSnap.data() as Quebra;
    }

    const newQuebra: Quebra = {
      id: quebraId,
      productId,
      batchId,
      date,
      quantityLost: Number(quantityLost),
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(quebraRef, newQuebra);

    const relatedBatch = batches.find((b) => b.id === batchId);
    const relatedProduct = products.find((p) => p.id === productId);
    const lossValue = relatedBatch ? Number(quantityLost) * relatedBatch.costPrice : 0;

    await logTimelineEvent({
      type: 'quebra-recorded',
      date,
      title: 'Quebra Registada',
      description: `${quantityLost} ${relatedBatch?.unit || 'un'} de "${relatedProduct?.name || 'produto'}" perdido(s) — ${reason.trim()}.`,
      productName: relatedProduct?.name,
      financialImpact: [{ label: 'Perda', amount: -lossValue, tone: 'negative' }],
      details: {
        productName: relatedProduct?.name,
        quantityLost,
        reason: reason.trim(),
        lossValue,
      },
    });

    triggerTrialActivation(activeBusinessId);
    return newQuebra;
  };

  // [Closing Integrity Amendment v1.0 — Q1/Q2] A closed period must mean
  // the same thing the day it closes and years later: no new Expense or
  // Withdrawal may be *backdated* into it, even though nothing here
  // touches an existing record. Checks only 'active' Closings — a
  // reopened one no longer counts, by design (reopenClosing). This is the
  // client-side half of the guard; firestore.rules enforces the same
  // check independently via the closedPeriods lock index, since
  // client-side gating alone is never sufficient (CLAUDE.md Rule 7).
  const findClosedPeriodConflict = (date: string): Closing | undefined =>
    closings.find((c) => (c.status ?? 'active') === 'active' && isDateInRange(date, c.startDate, c.endDate));

  const addExpense = async ({ date, description, amount, category, submissionId }: AddExpenseParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const conflict = findClosedPeriodConflict(date);
    if (conflict) {
      throw new Error(
        `Não é possível registar uma despesa em ${date} — este período ("${conflict.periodLabel}") já foi fechado. Para corrigir um período fechado, reabra-o primeiro em Fechos.`
      );
    }

    const businessId = activeBusinessId;
    // [Bug fix — no duplicate-submission protection] Same discipline as
    // recordStockCount/recordReceivablePayment: a caller-supplied
    // submissionId becomes the expense's own deterministic id, so a
    // retry (double-click, or a resubmit after an ambiguous network
    // error) with the SAME id is recognized and safely no-ops instead
    // of creating a second expense. Falls back to the previous random
    // id for any caller that doesn't yet supply one — fully backward
    // compatible, never a behavior change for an existing call site.
    const expenseId = submissionId || 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const expenseRef = doc(db, 'businesses', businessId, 'expenses', expenseId);
    const existingSnap = await getDoc(expenseRef);
    if (existingSnap.exists()) {
      // Idempotent retry — already applied by an earlier attempt with
      // this exact submissionId. Return the existing record unchanged
      // rather than re-running the write (which would silently
      // overwrite createdAt and create a duplicate timeline event).
      return existingSnap.data() as Expense;
    }

    const newExpense: Expense = {
      id: expenseId,
      date,
      description: description.trim(),
      amount: Number(amount),
      category: category ? category.trim() : 'Geral',
      createdAt: new Date().toISOString(),
    };

    // [Business Worth Evolution — Implementation Authorization, Increment
    // 3; Specification §10 FR-10] Every Expense also gets its own
    // governed CashLedgerEntry (category 'expense') — for auditability/
    // completeness of the ledger only. This entry is deliberately
    // EXCLUDED from the live calculation's own position-change term
    // (calculations.ts) — Expense's real Business Worth effect continues
    // to flow exclusively through the existing, unmodified
    // expensesSinceSnapshot/totalExpensesAllTime terms, exactly as
    // before this increment (Test Requirement "Expense is not subtracted
    // twice through Cash Ledger"). The Expense record/category system
    // itself is completely unmodified — this is an additive, atomic
    // sibling write, never a change to Expense's own shape or behavior.
    const cashLedgerEntryId = 'cle-expense-' + newExpense.id;
    const cashLedgerEntry: CashLedgerEntry = {
      id: cashLedgerEntryId,
      businessId,
      direction: 'outflow',
      amount: newExpense.amount,
      category: 'expense',
      sourceReference: { type: 'expense', id: newExpense.id },
      occurredAt: date,
      createdAt: newExpense.createdAt,
      createdBy: currentUser?.uid || '',
    };

    const fsBatch = createFirestoreBatch(db);
    fsBatch.set(doc(db, 'businesses', businessId, 'expenses', newExpense.id), newExpense);
    fsBatch.set(doc(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId), cashLedgerEntry);
    await fsBatch.commit();

    await logTimelineEvent({
      type: 'expense-recorded',
      date,
      title: 'Despesa Registada',
      description: newExpense.description,
      expenseCategory: newExpense.category,
      financialImpact: [{ label: 'Despesa', amount: -newExpense.amount, tone: 'negative' }],
      details: {
        description: newExpense.description,
        category: newExpense.category,
        amount: newExpense.amount,
      },
    });

    triggerTrialActivation(activeBusinessId);
    return newExpense;
  };

  // Owner Withdrawals: money taken by the owner for personal use. This is
  // NOT an expense — it reduces available business capital directly,
  // without affecting profit/loss the way an operating expense does.
  const addWithdrawal = async ({ date, amount, reason, notes, submissionId }: AddWithdrawalParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const conflict = findClosedPeriodConflict(date);
    if (conflict) {
      throw new Error(
        `Não é possível registar uma retirada em ${date} — este período ("${conflict.periodLabel}") já foi fechado. Para corrigir um período fechado, reabra-o primeiro em Fechos.`
      );
    }

    const businessId = activeBusinessId;
    // [Bug fix — no duplicate-submission protection] Same discipline as
    // addExpense's own identical fix, immediately above.
    const withdrawalId = submissionId || 'wd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const withdrawalRef = doc(db, 'businesses', businessId, 'withdrawals', withdrawalId);
    const existingSnap = await getDoc(withdrawalRef);
    if (existingSnap.exists()) {
      return existingSnap.data() as Withdrawal;
    }

    const newWithdrawal: Withdrawal = {
      id: withdrawalId,
      date,
      amount: Number(amount),
      reason: reason ? reason.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    // [Business Worth Evolution — Implementation Authorization, Increment
    // 3; Specification §10 FR-10] Same discipline as addExpense's own
    // CashLedgerEntry, immediately above — a Levantamento's own governed
    // ledger entry (category 'levantamento'), for auditability only,
    // EXCLUDED from the live calculation's own position-change term.
    // Withdrawal's own record/behavior is completely unmodified.
    const cashLedgerEntryId = 'cle-levantamento-' + newWithdrawal.id;
    const cashLedgerEntry: CashLedgerEntry = {
      id: cashLedgerEntryId,
      businessId,
      direction: 'outflow',
      amount: newWithdrawal.amount,
      category: 'levantamento',
      sourceReference: { type: 'withdrawal', id: newWithdrawal.id },
      occurredAt: date,
      createdAt: newWithdrawal.createdAt,
      createdBy: currentUser?.uid || '',
    };

    const fsBatch = createFirestoreBatch(db);
    fsBatch.set(doc(db, 'businesses', businessId, 'withdrawals', newWithdrawal.id), newWithdrawal);
    fsBatch.set(doc(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId), cashLedgerEntry);
    await fsBatch.commit();

    await logTimelineEvent({
      type: 'withdrawal-recorded',
      date,
      title: 'Retirada do Proprietário',
      description: newWithdrawal.reason
        ? `Retirada para "${newWithdrawal.reason}".`
        : 'Retirada registada.',
      financialImpact: [{ label: 'Retirada', amount: -newWithdrawal.amount, tone: 'negative' }],
      details: {
        reason: newWithdrawal.reason,
        notes: newWithdrawal.notes,
        amount: newWithdrawal.amount,
      },
    });

    return newWithdrawal;
  };

  // ============================================================
  // BUSINESS WORTH EVOLUTION — INCREMENT 3
  // Receivables (Specification §11) + Payables (§12) payment recording.
  // ============================================================

  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §11, FR-12] Creating a Receivable itself has NO
  // Business Worth effect (FIN-3) — a single, un-batched write is
  // sufficient (nothing else needs to change atomically alongside it).
  const addReceivable = async ({ totalAmount, description, debtorName }: { totalAmount: number; description?: string; debtorName?: string }) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode registar dívidas.');
    if (!(Number(totalAmount) > 0)) throw new Error('O valor da dívida deve ser maior que zero.');

    const businessId = activeBusinessId;
    const receivableId = 'receivable-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const rounded = Number(Number(totalAmount).toFixed(2));

    const newReceivable: Receivable = {
      id: receivableId,
      businessId,
      totalAmount: rounded,
      amountPaid: 0,
      amountRemaining: rounded,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      ...(description?.trim() ? { description: description.trim() } : {}),
      ...(debtorName?.trim() ? { debtorName: debtorName.trim() } : {}),
    };

    await setDoc(doc(db, 'businesses', businessId, 'receivables', receivableId), newReceivable);
    return { receivableId };
  };

  // [Owner-recorded opening-balance debts] Creating a manually-entered
  // Payable DOES have an immediate Business Worth effect (FIN-4) —
  // unlike addReceivable above — but that effect requires no extra write
  // here: getCurrentBusinessWorth's own payables-position-change term
  // (calculations.ts) already reduces the live figure the moment this
  // new Payable simply exists in the `payables` collection with a
  // positive amountRemaining, exactly as it already does for an
  // automatically-created one. So, like addReceivable, a single,
  // un-batched write is sufficient here too.
  const addPayable = async ({ totalAmount, description, supplierName }: { totalAmount: number; description?: string; supplierName?: string }) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode registar dívidas.');
    if (!(Number(totalAmount) > 0)) throw new Error('O valor da dívida deve ser maior que zero.');

    const businessId = activeBusinessId;
    const payableId = 'payable-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const rounded = Number(Number(totalAmount).toFixed(2));

    const newPayable: Payable = {
      id: payableId,
      businessId,
      totalAmount: rounded,
      amountPaid: 0,
      amountRemaining: rounded,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      isManualEntry: true,
      ...(description?.trim() ? { description: description.trim() } : {}),
      ...(supplierName?.trim() ? { supplierName: supplierName.trim() } : {}),
    };

    await setDoc(doc(db, 'businesses', businessId, 'payables', payableId), newPayable);
    return { payableId };
  };

  // [Owner-recorded cash position] A full restatement, not an
  // incremental movement — see CashPositionDeclaration's own type
  // comment. A single, un-batched, append-only write, mirroring
  // addStartupInvestmentEntry exactly; no Business Worth field is
  // touched by this write itself (that happens later, at the next
  // Contagem confirmation, via RecordStockCountParams.ownerConfirmedCashPosition).
  const addCashPositionDeclaration = async ({ amount, declaredAt, description }: { amount: number; declaredAt?: string; description?: string }) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode registar a posição de caixa.');
    if (!(Number(amount) >= 0)) throw new Error('O valor deve ser 0 ou maior.');

    const businessId = activeBusinessId;
    const entryId = 'cash-position-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const rounded = Number(Number(amount).toFixed(2));

    const newEntry: CashPositionDeclaration = {
      id: entryId,
      businessId,
      amount: rounded,
      declaredAt: declaredAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || '',
      ...(description?.trim() ? { description: description.trim() } : {}),
    };

    await setDoc(doc(db, 'businesses', businessId, 'cashPositionDeclarations', entryId), newEntry);
    return { entryId };
  };

  // ============================================================
  // BUSINESS WORTH EVOLUTION — INCREMENT 5
  // Startup Investment entry recording (Specification §13, FR-17).
  // ============================================================

  // [Business Worth Evolution — Implementation Authorization, Increment 5;
  // Specification §13, FR-17] Creating a StartupInvestmentEntry has no
  // Business Worth effect whatsoever — a single, un-batched write is
  // sufficient, mirroring addReceivable's own reasoning above. Reserved
  // exclusively for spending with no existing Product/Stock/Expense
  // record (FR-17) — this function does not, and must not, become a
  // general-purpose alternative to Add Expense.
  const addStartupInvestmentEntry = async ({
    category,
    amount,
    description,
    recordedAt,
    submissionId,
  }: {
    category: StartupInvestmentEntry['category'];
    amount: number;
    description?: string;
    recordedAt?: string;
    submissionId?: string;
  }) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode registar Investimento Inicial.');
    if (!(Number(amount) > 0)) throw new Error('O valor deve ser maior que zero.');
    const allowedCategories: StartupInvestmentEntry['category'][] = ['labor', 'wages', 'transport', 'preparation', 'license', 'other'];
    if (!allowedCategories.includes(category)) throw new Error('Categoria inválida.');

    const businessId = activeBusinessId;
    // [Bug fix — no duplicate-submission protection] Same discipline as
    // addExpense/addWithdrawal/addQuebra's own identical fix, above.
    // StartupInvestmentView.tsx already declares a stable
    // submissionIdRef for exactly this purpose — this parameter is
    // what actually lets it do its job, closing the gap where it was
    // previously reset after every success but never passed anywhere.
    const entryId = submissionId || 'startup-investment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const entryRef = doc(db, 'businesses', businessId, 'startupInvestmentEntries', entryId);
    const existingSnap = await getDoc(entryRef);
    if (existingSnap.exists()) {
      return { entryId };
    }
    const rounded = Number(Number(amount).toFixed(2));

    const newEntry: StartupInvestmentEntry = {
      id: entryId,
      businessId,
      category,
      amount: rounded,
      recordedAt: recordedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || '',
      ...(description?.trim() ? { description: description.trim() } : {}),
    };

    await setDoc(entryRef, newEntry);
    return { entryId };
  };

  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §11, FR-12, FR-13, I-5] Records a payment against an
  // existing Receivable. Atomic (one Firestore transaction): the payment
  // record, its linked CashLedgerEntry (FR-13 — no payment may exist
  // without one), and the Receivable's own denormalized amountPaid/
  // amountRemaining/status all update together or not at all.
  //
  // Idempotent by construction: the payment document's id IS the
  // caller-supplied submissionId, so a retried call with the same id
  // reads back its own already-written payment inside the transaction
  // and returns success without applying anything a second time — the
  // identical "deterministic id, read-then-no-op-if-already-written"
  // discipline this codebase already uses for BusinessWorthSnapshot's
  // own 'bws-' + sourceStockCountId id.
  //
  // Overpayment is rejected: an amountPaid that would take
  // amountRemaining below zero throws before any write is attempted.
  const recordReceivablePayment = async ({
    receivableId,
    amountPaid,
    paidAt,
    submissionId,
  }: {
    receivableId: string;
    amountPaid: number;
    paidAt: string;
    submissionId: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeBusinessId) return { success: false, error: 'Sem negócio associado.' };
    if (!isOwner) return { success: false, error: 'Apenas o dono pode registar pagamentos.' };
    if (!(Number(amountPaid) > 0)) return { success: false, error: 'O valor pago deve ser maior que zero.' };

    const businessId = activeBusinessId;
    const roundedAmount = Number(Number(amountPaid).toFixed(2));

    try {
      await runTransaction(db, async (tx) => {
        const receivableRef = doc(db, 'businesses', businessId, 'receivables', receivableId);
        const paymentRef = doc(db, 'businesses', businessId, 'receivablePayments', submissionId);

        // Reads must happen before any write inside a Firestore
        // transaction — both reads are issued before either ref below is
        // touched.
        const [receivableSnap, existingPaymentSnap] = await Promise.all([tx.get(receivableRef), tx.get(paymentRef)]);

        if (existingPaymentSnap.exists()) {
          // Idempotent retry — already applied by an earlier attempt with
          // this exact submissionId. Nothing more to do.
          return;
        }
        if (!receivableSnap.exists()) {
          throw new Error('Dívida não encontrada.');
        }

        const receivable = receivableSnap.data() as Receivable;
        const newAmountRemaining = Number((receivable.amountRemaining - roundedAmount).toFixed(2));
        if (newAmountRemaining < -0.005) {
          throw new Error('O valor pago excede o saldo em aberto desta dívida.');
        }
        const clampedRemaining = Math.max(0, newAmountRemaining);
        const newAmountPaid = Number((receivable.amountPaid + roundedAmount).toFixed(2));
        const newStatus: Receivable['status'] = clampedRemaining <= 0.005 ? 'paid' : 'partially-paid';

        const cashLedgerEntryId = 'cle-receivable-' + submissionId;
        const cashLedgerEntry: CashLedgerEntry = {
          id: cashLedgerEntryId,
          businessId,
          direction: 'inflow',
          amount: roundedAmount,
          category: 'customer-payment',
          sourceReference: { type: 'receivable', id: receivableId },
          occurredAt: paidAt,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || '',
        };
        const payment: ReceivablePayment = {
          id: submissionId,
          receivableId,
          amountPaid: roundedAmount,
          paidAt,
          createdAt: new Date().toISOString(),
          cashLedgerEntryId,
        };

        tx.set(paymentRef, payment);
        tx.set(doc(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId), cashLedgerEntry);
        tx.update(receivableRef, {
          amountPaid: newAmountPaid,
          amountRemaining: clampedRemaining,
          status: newStatus,
        });
      });

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 9; Specification §34, FR-48] Audits the actual
      // governed payment event (this transaction), never a mere UI
      // click — logged AFTER the transaction above has already
      // succeeded (a throw inside it is caught below, never reaching
      // this line). Deterministic id derived from the same
      // submissionId the payment/idempotency architecture already
      // uses — a retry lands on the same Timeline document id, which
      // `timelineEvents`' own pre-existing `allow update: if false`
      // rule rejects outright, absorbed by logTimelineEvent's own
      // pre-existing try/catch — the same "exactly one document,
      // rules-enforced" mechanism this file's periodic
      // 'stock-verification' entry already establishes, extended here
      // rather than reinvented. This call is unconditional (fired on
      // both a genuine first apply and an idempotent retry no-op) by
      // design — the id-collision rule, not a branch in this function,
      // is what prevents a misleading duplicate audit entry.
      await logTimelineEvent({
        id: 'tl-receivable-payment-' + submissionId,
        type: 'receivable-payment-recorded',
        date: paidAt,
        title: 'Pagamento de Dívida Recebido',
        description: `Pagamento de ${roundedAmount} registado contra uma dívida a receber.`,
        financialImpact: [{ label: 'Pagamento Recebido', amount: roundedAmount, tone: 'positive' }],
        details: { receivableId },
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error recording receivable payment:', businessId, receivableId, err);
      return { success: false, error: err.message || 'Erro ao registar o pagamento.' };
    }
  };

  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §12, FR-15, I-6] Records a payment against an existing
  // supplier Payable — mirrors recordReceivablePayment exactly (atomicity,
  // idempotency, overpayment rejection), for the liability side. The
  // linked CashLedgerEntry is category 'supplier-payment' (an outflow),
  // never a second, independent Business Worth reduction beyond the
  // reduction the Payable's own outstanding balance already represents
  // (FR-15 — the live calculation's own payables-position term,
  // calculations.ts, is what makes this settle rather than doubly reduce).
  const recordPayablePayment = async ({
    payableId,
    amountPaid,
    paidAt,
    submissionId,
  }: {
    payableId: string;
    amountPaid: number;
    paidAt: string;
    submissionId: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeBusinessId) return { success: false, error: 'Sem negócio associado.' };
    if (!isOwner) return { success: false, error: 'Apenas o dono pode registar pagamentos.' };
    if (!(Number(amountPaid) > 0)) return { success: false, error: 'O valor pago deve ser maior que zero.' };

    const businessId = activeBusinessId;
    const roundedAmount = Number(Number(amountPaid).toFixed(2));

    try {
      await runTransaction(db, async (tx) => {
        const payableRef = doc(db, 'businesses', businessId, 'payables', payableId);
        const paymentRef = doc(db, 'businesses', businessId, 'payablePayments', submissionId);

        const [payableSnap, existingPaymentSnap] = await Promise.all([tx.get(payableRef), tx.get(paymentRef)]);

        if (existingPaymentSnap.exists()) {
          // Idempotent retry — already applied.
          return;
        }
        if (!payableSnap.exists()) {
          throw new Error('Dívida ao fornecedor não encontrada.');
        }

        const payable = payableSnap.data() as Payable;
        const newAmountRemaining = Number((payable.amountRemaining - roundedAmount).toFixed(2));
        if (newAmountRemaining < -0.005) {
          throw new Error('O valor pago excede o saldo em aberto desta dívida ao fornecedor.');
        }
        const clampedRemaining = Math.max(0, newAmountRemaining);
        const newAmountPaid = Number((payable.amountPaid + roundedAmount).toFixed(2));
        const newStatus: Payable['status'] = clampedRemaining <= 0.005 ? 'paid' : 'partially-paid';

        const cashLedgerEntryId = 'cle-payable-' + submissionId;
        const cashLedgerEntry: CashLedgerEntry = {
          id: cashLedgerEntryId,
          businessId,
          direction: 'outflow',
          amount: roundedAmount,
          category: 'supplier-payment',
          sourceReference: { type: 'payable', id: payableId },
          occurredAt: paidAt,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || '',
        };
        const payment: PayablePayment = {
          id: submissionId,
          payableId,
          amountPaid: roundedAmount,
          paidAt,
          createdAt: new Date().toISOString(),
          cashLedgerEntryId,
        };

        tx.set(paymentRef, payment);
        tx.set(doc(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId), cashLedgerEntry);
        tx.update(payableRef, {
          amountPaid: newAmountPaid,
          amountRemaining: clampedRemaining,
          status: newStatus,
        });
      });

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 9; Specification §34, FR-48] Mirrors
      // recordReceivablePayment's own audit call exactly — see that
      // function's own comment for the full idempotency/retry-safety
      // rationale (deterministic id, rules-enforced single-document
      // convergence, unconditional call).
      await logTimelineEvent({
        id: 'tl-payable-payment-' + submissionId,
        type: 'payable-payment-recorded',
        date: paidAt,
        title: 'Pagamento a Fornecedor Registado',
        description: `Pagamento de ${roundedAmount} registado contra uma dívida a fornecedor.`,
        financialImpact: [{ label: 'Pagamento a Fornecedor', amount: -roundedAmount, tone: 'negative' }],
        details: { payableId },
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error recording payable payment:', businessId, payableId, err);
      return { success: false, error: err.message || 'Erro ao registar o pagamento.' };
    }
  };

  // [Business Worth Evolution — Implementation Authorization, Increment
  // 10 (Revision 3); Specification §42.1, §42.3, §8, FR-61, FR-69; BDR
  // Decision 36; Plan Amendment §A.1; Rule 8 Finding OD-1-OD-5]
  // Establishes Business Worth directly from an Owner-declared figure,
  // with no physical Contagem behind it — the second, equally
  // legitimate establishment method. Unlike recordStockCount's paired
  // StockCount + BusinessWorthSnapshot atomic batch write (§5), this is
  // a SINGLE-DOCUMENT create — trivially atomic by Firestore's own
  // per-document write guarantee (Rule 8 Finding OD-3), so no batch
  // write is needed here. Submission-identity idempotency mirrors
  // recordReceivablePayment's own pattern exactly: the snapshot's own
  // id is derived from the caller's submissionId, so a retried call
  // (network retry, double-tap) never produces a duplicate snapshot —
  // enforced by a pre-write existence check inside a transaction,
  // exactly like recordReceivablePayment's own paymentRef check above.
  const recordOwnerDeclaredBusinessWorth = async ({
    declaredAmount,
    date,
    submissionId,
  }: {
    declaredAmount: number;
    date: string;
    submissionId: string;
  }): Promise<{ success: boolean; snapshotId?: string; error?: string }> => {
    if (!activeBusinessId) return { success: false, error: 'Sem negócio associado.' };
    if (!isOwner) return { success: false, error: 'Apenas o dono pode declarar o Valor do Negócio.' };
    if (!(Number(declaredAmount) > 0)) return { success: false, error: 'O valor declarado deve ser maior que zero.' };

    const businessId = activeBusinessId;
    const snapshotId = 'bws-owner-declared-' + submissionId;
    const roundedAmount = Number(Number(declaredAmount).toFixed(2));

    try {
      let alreadyApplied = false;

      await runTransaction(db, async (tx) => {
        const snapshotRef = doc(db, 'businesses', businessId, 'businessWorthSnapshots', snapshotId);
        const existingSnapshotSnap = await tx.get(snapshotRef);

        if (existingSnapshotSnap.exists()) {
          // Idempotent retry — this exact submissionId already produced
          // a snapshot on an earlier attempt. Nothing more to do —
          // mirrors recordReceivablePayment's own early-return-inside-
          // transaction pattern exactly.
          alreadyApplied = true;
          return;
        }

        // [Specification §7, §41 corrected meaning; mirrors §5's own
        // computation exactly] The live Current Business Worth
        // immediately before this declaration — the prior active
        // snapshot (of EITHER establishment method — getCurrentBusinessWorth
        // already reads "the latest active snapshot" generically, per
        // Rule 8 Finding OD-2) plus governed activity since it, as of
        // this declaration's own date. 'UNKNOWN' (no prior snapshot at
        // all) becomes null — a truthful null, not a placeholder,
        // identical contract to recordStockCount's own
        // previousCurrentBusinessWorth field.
        const priorCurrent = getCurrentBusinessWorth({
          snapshots: businessWorthSnapshots,
          batches,
          quebras,
          expenses,
          withdrawals,
          payables,
          cashLedgerEntries,
          asOfDate: date,
        });
        const previousCurrentBusinessWorth = priorCurrent === 'UNKNOWN' ? null : priorCurrent;

        // [Reconciliation signal, §22/§42.3 — "meaningfully computable"
        // reconciliation fields remain populated even for an
        // Owner-Declared snapshot; only the physical/financial
        // drill-down detail (productValuationTotal, embeddedProfitTotal,
        // cashPosition, etc. — FR-69) is genuinely omitted below.]
        const priorEstimated = getEstimatedBusinessWorth({
          snapshots: businessWorthSnapshots,
          initialStockCount,
          batches,
          quebras,
          expenses,
          withdrawals,
          payables,
          cashLedgerEntries,
          asOfDate: date,
        });
        const estimatedBusinessWorthImmediatelyBefore = priorEstimated === 'UNKNOWN' ? undefined : priorEstimated;
        const difference =
          estimatedBusinessWorthImmediatelyBefore === undefined
            ? undefined
            : Number((roundedAmount - estimatedBusinessWorthImmediatelyBefore).toFixed(2));

        // [Rule 8 Finding OD-1; firestore.rules' own owner-declared
        // branch independently re-verifies every one of these fields is
        // absent — this object is deliberately built via a precise
        // field list, never a spread of a larger object, so there is no
        // risk of an FR-69-omitted field leaking in from a shared
        // helper.] Every field FR-69 requires omitted — sourceStockCountId,
        // productValuationTotal/Detail, embeddedProfitTotal/Detail,
        // cashPosition, receivablesPosition, payablesPosition,
        // expenses/breakages/levantamentosSinceLastSnapshot,
        // ownerInvestmentSinceLastSnapshot — is genuinely absent below,
        // never written as a fabricated zero/undefined-as-zero.
        const businessWorthSnapshot: Omit<BusinessWorthSnapshot, 'confirmedAt'> = {
          id: snapshotId,
          businessId,
          establishmentMethod: 'owner-declared',
          measuredBusinessWorth: roundedAmount,
          previousCurrentBusinessWorth,
          ...(estimatedBusinessWorthImmediatelyBefore !== undefined ? { estimatedBusinessWorthImmediatelyBefore } : {}),
          ...(difference !== undefined ? { difference } : {}),
          correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        };
        const businessWorthSnapshotWritePayload: WithFieldValue<BusinessWorthSnapshot> = {
          ...businessWorthSnapshot,
          confirmedAt: serverTimestamp(),
        };

        tx.set(snapshotRef, businessWorthSnapshotWritePayload);
      });

      if (!alreadyApplied) {
        // [Implementation Authorization, Increment 9 precedent;
        // Specification §34, FR-48] Fired unconditionally on a genuine
        // first apply only (never on an idempotent retry no-op) —
        // deterministic id derived from submissionId, mirroring every
        // other governed-write Timeline call in this file.
        await logTimelineEvent({
          id: 'tl-owner-declared-' + submissionId,
          type: 'business-worth-owner-declared',
          date,
          title: 'Valor do Negócio Declarado',
          description: `O dono declarou o Valor do Negócio em ${roundedAmount}, sem Contagem física.`,
          financialImpact: [{ label: 'Valor do Negócio Declarado', amount: roundedAmount, tone: 'neutral' }],
          details: { snapshotId },
        });
      }

      return { success: true, snapshotId };
    } catch (err: any) {
      console.error('Error recording owner-declared business worth:', businessId, err);
      return { success: false, error: err.message || 'Erro ao declarar o Valor do Negócio.' };
    }
  };

  // Module #19 V1 Manual Payment Bridge — temporary confirmation bridge,
  // not the final payment architecture (PaySuite/PayTED remain
  // deferred). Writes a 'pending' Payment record only — never touches
  // subscription.status directly, at any point. Deliberately does NOT
  // check subscriptionAllowsNewRecords()/trial/grace/expired status:
  // this is precisely the write path that must remain reachable while
  // a subscription is trial_completed or expired, since it's the
  // Owner's way out of that state. firestore.rules enforces the same
  // (payments/create has no subscriptionAllowsNewRecords() gate,
  // unlike every other create rule in this file).
  const submitPayment = async ({
    method,
    reference,
    notes,
  }: {
    method: PaymentMethod;
    reference: string;
    notes?: string;
  }): Promise<Payment> => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!currentUser) throw new Error('Sessão expirada. Inicie sessão novamente.');
    if (!reference.trim()) throw new Error('Indique a referência do pagamento.');

    const newPayment: Payment = {
      id: 'pmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      businessId: activeBusinessId,
      amount: SUBSCRIPTION_PLAN_PRICE_MZN,
      currency: SUBSCRIPTION_PLAN_CURRENCY,
      method,
      reference: reference.trim(),
      submittedAt: new Date().toISOString(),
      submittedBy: currentUser.uid,
      status: 'pending',
      notes: notes ? notes.trim() : undefined,
    };

    await setDoc(doc(db, 'businesses', activeBusinessId, 'payments', newPayment.id), newPayment);

    return newPayment;
  };

  // [Closing Integrity Amendment v1.0] Same lock check as deleteExpense —
  // see that comment.
  const deleteWithdrawal = async (id: string) => {
    if (!activeBusinessId) return;
    const target = withdrawals.find((w) => w.id === id);
    if (target?.closingId) {
      throw new Error('Esta retirada pertence a um período já fechado e não pode ser removida. Reabra o período em Fechos para a corrigir.');
    }
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'withdrawals', id));
  };

  // Records a physical Stock Count. This is NEVER a purchase and NEVER
  // creates/touches a StockBatch — it simply records what the owner
  // physically counted as already owned, at a point in time.
  //
  // type === 'initial' is special: it can only ever be recorded once per
  // business. Once set, it becomes the permanent Initial Business Capital
  // baseline that everything else (capital growth, business worth) is
  // measured against, so it is intentionally never editable or repeatable.
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §25, §26, FR-38, FR-40] Starts a correction/
  // recovery — always bound to the caller's own already-known,
  // already-eligible snapshot id (DashboardView passes
  // latestActiveBusinessWorthSnapshot.id, this context's own selection,
  // never a free-typed value) — this function itself does not decide
  // eligibility (computeBusinessWorthCorrectionEligibility/
  // computeBusinessWorthAuthorizedRecoveryEligibility, calculations.ts,
  // already exposed via this context, are what the caller checks
  // before ever calling this), and firestore.rules independently and
  // authoritatively re-verifies eligibility again at write time
  // regardless of what is set here.
  const startBusinessWorthCorrection = (snapshotId: string, kind: 'owner-correction' | 'superadmin-authorized-recovery') => {
    setPendingBusinessWorthCorrection({ snapshotId, kind });
  };
  const clearBusinessWorthCorrection = () => {
    setPendingBusinessWorthCorrection(null);
  };

  const recordStockCount = async ({ type, label, date, items, expectedValueAtCount, submissionId, initialCapitalBasis, redoesConfirmationId, producesBusinessWorthSnapshot, ownerConfirmedCashPosition, correctionOfSnapshotId, correctionKind }: RecordStockCountParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!items.length) throw new Error('Adicione pelo menos um produto à contagem.');

    // [Void & Redo — Implementation Authorization §2 items 5-6; Rule 8
    // Finding F2] This guard exists to block an accidental SECOND
    // ORIGINAL confirmation — it must not also block a legitimate redo
    // (which, by the time this call happens, has already correctly
    // made hasInitialStockCount false via the F1 read-path change,
    // since the predecessor was just voided — but the `!redoesConfirmationId`
    // check here is kept as an explicit, intention-revealing guard
    // rather than relying solely on that timing). firestore.rules
    // remains the authoritative enforcement for every Void & Redo
    // precondition regardless of this client-side check.
    if (type === 'initial' && !redoesConfirmationId && hasInitialStockCount) {
      throw new Error('O Capital Inicial já foi definido e não pode ser registado novamente.');
    }
    // [Void & Redo] A redo must name a real predecessor slot — resolved
    // here, once, as the single source of truth for both the new
    // document's id and its chainPosition (never separately passed and
    // separately trusted). A predecessor outside {initial, initial-2,
    // initial-3} (in particular 'initial-4', Confirmation #4 — which
    // Rule 8 Finding E1/firestore.rules already refuse to ever let be
    // voided in the first place, so a real VoidRecord for it could
    // never exist) is rejected here immediately, client-side, as a
    // defensive guard — firestore.rules' own redo-branch preconditions
    // are the authoritative backstop regardless.
    const redoChainSlotByPredecessor: Record<string, { chainPosition: 2 | 3 | 4; docId: string }> = {
      initial: { chainPosition: 2, docId: 'initial-2' },
      'initial-2': { chainPosition: 3, docId: 'initial-3' },
      'initial-3': { chainPosition: 4, docId: 'initial-4' },
    };
    let initialConfirmationId = 'initial';
    let initialChainPosition: 1 | 2 | 3 | 4 = 1;
    if (type === 'initial' && redoesConfirmationId) {
      const slot = redoChainSlotByPredecessor[redoesConfirmationId];
      if (!slot) {
        throw new Error('Não é possível refazer esta confirmação — o limite de recuperação já foi atingido.');
      }
      initialConfirmationId = slot.docId;
      initialChainPosition = slot.chainPosition;
    }
    // [Stock Count Data-Loss Resilience — Implementation Task, Section 3]
    // Periodic finalization's idempotency mechanism is entirely
    // dependent on the caller always supplying the same stable
    // submissionId across retries — enforced here so a future call site
    // cannot silently regress to the old random-id behavior by simply
    // omitting the parameter.
    if (type !== 'initial' && !submissionId) {
      throw new Error('Identificador de submissão em falta para esta contagem periódica.');
    }

    const businessId = activeBusinessId;
    const fsBatch = createFirestoreBatch(db);
    const tempProducts = [...products];

    // [Product Memory / UOM — Increment A] Correlates each raw item's
    // own unitRelationship (attached per-portion by the caller, see
    // this field's own comment on RecordStockCountItemInput above)
    // back to its product name — the same key normalizeStockCountItems
    // itself trims to build NormalizedStockCountItem.productName. Last
    // matching raw entry wins for a repeated name (mirrors ordinary
    // "last edit wins" expectations for a single submission); a blank
    // productName is never a key here since normalizeStockCountItems
    // already drops those rows entirely.
    //
    // MOVED ABOVE costBasisByProductName (was originally built AFTER
    // it) — see this bug fix's own comment on the merge loop
    // immediately below for why the ordering itself was the defect.
    const unitRelationshipByProductName = new Map<string, UnitRelationship>();
    for (const raw of items) {
      const key = raw.productName.trim().toLowerCase();
      if (key && raw.unitRelationship && isValidUnitRelationship(raw.unitRelationship)) {
        unitRelationshipByProductName.set(key, raw.unitRelationship);
      }
    }

    // [Business Worth Evolution — Increment 10 Item 5 / Post-
    // Implementation Correction §25, Specification §15/FR-67; Product
    // Architect resolution, 24 August 2026] Resolved BEFORE
    // normalizeStockCountItems() runs, from `tempProducts` (the
    // pre-write catalog state this function already has — the same
    // list the per-item loop below uses for its own `product`/
    // `productId` lookup, so this reflects exactly the same "existing
    // vs. new" distinction that loop makes) via the SAME shared
    // resolver PeriodicStockCountView.tsx's own preview uses
    // (buildProductCostBasisMap, lib/fr67CostBasisConversion.ts) — one
    // resolution path, not two, so the Owner-facing preview and this
    // persisted write can never disagree.
    const costBasisByProductName = buildProductCostBasisMap(tempProducts);

    // [Bug fix — cost total silently stayed 0,00 for a genuinely new
    // multi-unit product's non-purchase-unit portions] The comment
    // this replaced claimed a new product's absence from this map was
    // "correct by construction, falls through to §25's fallback
    // automatically" — true only for a product with NO confirmed
    // relationship at all. But Decision 37 B.4 SUPPRESSES the
    // per-portion costPrice input (shows "Definido na compra") the
    // moment a valid cost basis + relationship exist, INCLUDING for a
    // brand-new product still being entered in this same Contagem
    // (getCostBasisForSuppression, PeriodicStockCountView.tsx, already
    // reads newProductInfo for exactly this case). That left a real
    // contradiction: the UI confidently hid the field (implying "this
    // is handled elsewhere"), while this map — built from the SAVED
    // catalog only, before the new product's own Product document even
    // gets created a few lines below — had no entry for it at all, so
    // §25's fallback (raw quantity * costPrice) silently used the
    // suppressed field's own blank/0 value. Every non-purchase-unit
    // portion of a brand-new multi-unit product therefore persisted as
    // 0,00 MT, understating totalValue and StockCount.totalValue with
    // no error or warning — exactly the defect a live report described
    // ("cost value total remains zero when the system autocalculated").
    //
    // Fixed by synthesizing a cost basis for each genuinely new product
    // that DOES have a confirmed candidate relationship
    // (unitRelationshipByProductName, above) — using that SAME
    // relationship, and reading purchaseCost off whichever raw item is
    // this product's own purchase-unit portion (the one field Decision
    // 37 B.4 leaves editable, never suppressed, so it is always the
    // Owner's own direct entry, never a derived/fabricated number).
    // Never overrides an EXISTING catalog product's own already-
    // authoritative basis (the `costBasisByProductName.has(key)` guard)
    // — this only ever fills the genuinely-new-product gap the
    // surrounding comment already documents.
    for (const [key, relationship] of unitRelationshipByProductName) {
      if (costBasisByProductName.has(key)) continue;
      const purchaseUnit = relationship.units[0]?.unit?.trim();
      if (!purchaseUnit) continue;
      const purchaseUnitItem = items.find(
        (raw) =>
          raw.productName.trim().toLowerCase() === key &&
          (raw.unit ?? '').trim().toLowerCase() === purchaseUnit.toLowerCase()
      );
      if (!purchaseUnitItem) continue;
      const purchaseCost = purchaseUnitItem.costPrice;
      if (typeof purchaseCost !== 'number' || !Number.isFinite(purchaseCost) || purchaseCost < 0) continue;
      costBasisByProductName.set(key, { purchaseUnit, purchaseCost, relationship });
    }

    // [Fix — data-flow contract] Normalization happens via the pure,
    // independently-tested normalizeStockCountItems() — operating only
    // on the `items` argument this function received explicitly from
    // its caller. Nothing here reads initialStockDraft or any other
    // React/context state; whatever the caller passed is exactly what
    // gets persisted, regardless of debounce timing on any autosave
    // side-channel. See tests/initial-stock-confirmation.test.ts.
    // [Initial Stock Dual-Valuation-Basis] totalSellingValue is the new
    // selling-basis counterpart to totalValue — see stockCount.ts's own
    // header comment. Both are read here directly from the same, single
    // normalizeStockCountItems() call; nothing recomputes either total
    // independently elsewhere.
    // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67]
    // costBasisByProductName (immediately above, now including this
    // bug fix's synthesized new-product entries) is threaded through
    // as normalizeStockCountItems' own optional second parameter.
    const { items: normalizedItems, totalSellingValue: normalizedTotalSellingValue } = normalizeStockCountItems(
      items,
      costBasisByProductName
    );

    // [Product Memory / UOM — Increment A] normalizeStockCountItems()
    // above is a pure, independently-tested function whose own
    // NormalizedStockCountItem shape deliberately carries only
    // productName/quantity/unit/costPrice/sellingPrice/totalValue — it
    // is NOT touched by this feature, to keep that heavily-tested
    // module's contract exactly as it already is.

    const countItems: StockCount['items'] = [];
    let totalValue = 0;

    for (const norm of normalizedItems) {
      // Find or create the product, exactly like addStockBatch does —
      // a Stock Count can introduce products the business hasn't
      // purchased through a batch yet (e.g. inventory owned before
      // starting to use this system).
      let product = tempProducts.find((p) => p.name.toLowerCase() === norm.productName.toLowerCase());
      let productId = product?.id;

      if (!product) {
        productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        // [Product Memory / UOM — Increment A] Only ever reached for a
        // genuinely NEW product (this whole block is inside `if
        // (!product)`) — an existing product's unitRelationship is
        // never read or touched here, matching addStockBatch's and
        // addMultipleStockBatches's identical guarantee.
        const newProd: Product = {
          id: productId,
          name: norm.productName,
          createdAt: new Date().toISOString(),
          ...(unitRelationshipByProductName.has(norm.productName.toLowerCase())
            ? { unitRelationship: unitRelationshipByProductName.get(norm.productName.toLowerCase())! }
            : {}),
        };
        fsBatch.set(doc(db, 'businesses', businessId, 'products', productId), newProd);
        tempProducts.push(newProd);
      }

      totalValue += norm.totalValue;

      countItems.push({
        productId: productId!,
        productName: norm.productName,
        quantity: norm.quantity,
        unit: norm.unit,
        costPrice: norm.costPrice,
        sellingPrice: norm.sellingPrice,
        totalValue: norm.totalValue,
        // [Business Worth Evolution — Increment 4, Specification §15,
        // FR-20] Pass-through only — see this field's own comment on
        // StockCountItem (types.ts).
        ...(norm.valuationMode ? { valuationMode: norm.valuationMode } : {}),
      });
    }

    if (!countItems.length) throw new Error('Adicione pelo menos um produto válido à contagem.');

    // [Fix #3 — Initial Stock Count Singleton] type === 'initial' now
    // always writes to the same, fixed document id ('initial') instead
    // of a fresh random one. This makes the singleton invariant ("a
    // business may create an Initial Stock Count only if none already
    // exists") race-proof and server-side: Firestore classifies a write
    // to a path that already holds a document as an `update`, not a
    // `create`, regardless of client method — and firestore.rules
    // already refuses any update to a type: 'initial' document,
    // unconditionally (Architecture 8.6's "no exceptions" tier). A
    // second attempt (e.g. a retry after a dropped-connection false
    // failure) now hits that existing rule directly instead of quietly
    // creating a second, order-unstable baseline document. Existing
    // businesses' already-created initial counts keep their old random
    // ids forever — this only affects the id assigned to a *new*
    // initial count going forward, and nothing in this codebase reads,
    // stores, or foreign-keys off that id (every consumer looks it up
    // via `stockCounts.find(s => s.type === 'initial')`), so this is
    // safe to change without any migration.
    //
    // [Stock Count Data-Loss Resilience — Implementation Task, Section
    // 3] Periodic counts now ALSO use a deterministic id — no longer
    // the old `'stockcount-' + Date.now() + ...` random scheme this
    // comment previously described as untouched. The id is derived from
    // `submissionId` (validated non-empty above), which the caller
    // establishes once and reuses across every retry of the same
    // logical finalization attempt (see PeriodicStockCountView's
    // handleConfirmSave and PeriodicStockDraft.submissionId). Because
    // the id is stable across retries, a retry's `fsBatch.set()` below
    // lands on the SAME document — Firestore classifies it as an
    // `update` (existing periodic-type documents are Owner-updatable
    // unconditionally per firestore.rules, unchanged by this task), and
    // writing materially identical content again is a no-op in effect,
    // never a second document. This is what makes §14 acceptance
    // criterion 2 ("ambiguous commit + retry → exactly one logical
    // result") hold without a transaction or a pre-write existence
    // check. Existing periodic counts recorded before this task keep
    // their old random ids forever — nothing reads or foreign-keys off
    // this id either, matching the 'initial' id's own safety argument
    // above.
    const newCount: StockCount = {
      id: type === 'initial' ? initialConfirmationId : 'stockcount-periodic-' + submissionId,
      type,
      date,
      items: countItems,
      totalValue: Number(totalValue.toFixed(2)),
      createdAt: new Date().toISOString(),
      // [Fix — undefined field crash] `label` must be conditionally
      // included, never assigned literal `undefined` directly — the
      // exact same class of bug this repository has fixed repeatedly
      // elsewhere (savePurchaseDraft, periodic/initial stock drafts):
      // Firestore's WriteBatch.set()/setDoc() reject a document
      // containing any field whose value is literal `undefined`,
      // synchronously, before the write is ever queued. Every caller
      // of recordStockCount except a 'custom'-type periodic count
      // never supplies a label at all (InitialStockCountView.tsx
      // passes none; PeriodicStockCountView.tsx explicitly passes
      // `undefined` for every non-'custom' type) — meaning the
      // previous `label: label?.trim() || undefined` line assigned a
      // literal `undefined` value directly, on every single
      // confirmation of every type except 'custom', unconditionally.
      // This is not a rare edge case — it is the default, universal
      // path for Initial Stock Count and every non-custom periodic
      // count, confirmed by directly reading both calling components.
      ...(label?.trim() ? { label: label.trim() } : {}),
      // [Amendment v1.0, Part 5] Only ever set for periodic counts — the
      // 'initial' count has no baseline to compare against, and the
      // caller (recordStockCount's own callers) never passes it for
      // type === 'initial'; this guard is a second line of defense
      // against that ever changing silently.
      ...(type !== 'initial' && typeof expectedValueAtCount === 'number'
        ? { expectedValueAtCount: Number(expectedValueAtCount.toFixed(2)) }
        : {}),
      // [Initial Stock Dual-Valuation-Basis — Implementation
      // Authorization, §2 items 1-2] Present on every count of either
      // type, per BDR-0014 Decision 7 — computed once, here, from the
      // same normalizeStockCountItems() call as totalValue itself,
      // never a separate/redundant accumulation.
      totalSellingValue: Number(normalizedTotalSellingValue.toFixed(2)),
      // [Initial Stock Dual-Valuation-Basis — Implementation
      // Authorization, §2 items 2, 5] ONLY ever written for
      // type === 'initial' — never for a periodic count, matching
      // types.ts's own StockCount.initialCapitalBasis contract exactly.
      // Undefined-field-crash discipline (see the `label` comment,
      // above) applies identically here: omitted entirely, never a
      // literal `undefined`, whenever the caller didn't supply one
      // (e.g. a hypothetical future caller that forgets to, or a test
      // exercising the defensive path) — resolveInitialCapitalValue's
      // own absent-basis default (calculations.ts) is what makes that
      // safe, not a fabricated default written here.
      ...(type === 'initial' && initialCapitalBasis ? { initialCapitalBasis } : {}),
      // [Void & Redo — Implementation Authorization §2 items 1, 5-6]
      // Plain values, safe to set directly on this precisely-typed
      // record (unlike confirmedAt, a server-timestamp sentinel
      // handled separately at the write-payload construction below,
      // since StockCount.confirmedAt is typed as a resolved Timestamp,
      // not a writable sentinel — see that comment for why).
      ...(type === 'initial' ? { chainPosition: initialChainPosition } : {}),
      ...(type === 'initial' && redoesConfirmationId ? { redoesConfirmationId } : {}),
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 1; Specification §14, FR-18, FR-19] Same
      // "omit entirely, never a literal `undefined`/`false`" discipline
      // as every other optional field on this object — absent is the
      // correct, permanent state for a historical/non-participating
      // count, not `false` written explicitly (both read identically as
      // falsy today, but omission keeps a future migration/audit query
      // for "which counts have this field at all" meaningful).
      ...(producesBusinessWorthSnapshot ? { producesBusinessWorthSnapshot: true } : {}),
    };

    // [Void & Redo — Implementation Authorization §2 items 1, 5-6; Rule
    // 8 Finding B1] confirmedAt is written as a genuine serverTimestamp()
    // sentinel — never a client-computed value — for every
    // chainPosition-bearing 'initial' confirmation (original and every
    // redo alike). firestore.rules requires confirmedAt === request.time
    // for those branches; a client-computed Date would fail that check
    // outright, by design (this is what makes the 12-hour window's own
    // timestamp untamperable). Built as a SEPARATE write-payload object
    // (not by adding confirmedAt onto `newCount` itself) purely so
    // `newCount` — used below for Timeline logging and
    // resolveInitialCapitalValue — stays a precisely-typed, sentinel-free
    // StockCount; only the single write() call needs to tolerate a
    // FieldValue.
    const stockCountWritePayload: WithFieldValue<StockCount> =
      type === 'initial' ? { ...newCount, confirmedAt: serverTimestamp() } : newCount;
    fsBatch.set(doc(db, 'businesses', businessId, 'stockCounts', newCount.id), stockCountWritePayload);

    // [Business Worth Evolution — Implementation Authorization,
    // Increment 9; Specification §34, FR-48] Hoisted above the
    // producesBusinessWorthSnapshot block below so the values needed
    // for this event's own Timeline audit entry survive past that
    // block's closing brace to the post-commit logging call further
    // down — the audit entry is logged only AFTER the batch commit
    // below actually succeeds (matching every other logTimelineEvent
    // call site in this file, and the explicit "never audit an
    // operation that ultimately failed" discipline this increment's
    // own task requires), never before.
    let businessWorthSnapshotForTimeline:
      | { id: string; measuredBusinessWorth: number; difference?: number; cashReconciliationDifference?: number }
      | undefined;

    // [Business Worth Evolution — Implementation Authorization,
    // Increment 1; Specification §5 (Plan), §8, FR-5, FR-36, FR-37]
    // Writes exactly one BusinessWorthSnapshot in the SAME batch as the
    // StockCount write above — never a separately-retriable write, so a
    // partial outcome (StockCount confirmed, no snapshot, or vice versa)
    // is structurally impossible, exactly as this batch already
    // guarantees for stockCounts + the draft-delete below.
    if (producesBusinessWorthSnapshot) {
      // [FR-37 idempotency] Deterministic, submission-identity-derived
      // id — one-to-one with sourceStockCountId (newCount.id), the exact
      // same fixed-id-per-source-event discipline this codebase already
      // trusts for stockCounts/voidRecords (Rule 8 Finding 10-A). This
      // structurally guarantees I-2 ("no two BusinessWorthSnapshot
      // documents share a sourceStockCountId") via Firestore's own
      // create-if-absent semantics — no query or transaction needed.
      const businessWorthSnapshotId = 'bws-' + newCount.id;

      // [Specification §16, FR-23; existing calculateInventoryTotals/
      // calculateBatch, calculations.ts] Embedded profit is drill-down/
      // explanatory only (FR-24) — computed fresh, at confirmation time,
      // from the SAME single source of truth Dashboard/Reports/Closings
      // already use. NOT the Contagem's own items — the Contagem
      // measures physical stock; embedded profit is a property of the
      // currently-open PURCHASE BATCHES, a structurally distinct figure
      // (this is exactly what makes a reconciliation difference between
      // them possible and meaningful — Specification §22).
      const quebrasByBatch = groupQuebrasByBatch(quebras);
      const openBatches = batches.filter((b) => b.status === 'open');
      const embeddedProfitDetail: BusinessWorthSnapshotEmbeddedProfitLine[] = openBatches.map((b) => {
        const calc = calculateBatch(b, quebrasByBatch.get(b.id) ?? []);
        // StockBatch itself carries no productName — resolved here via
        // the same tempProducts lookup already used above for
        // countItems, matching how every other batch-drill-down display
        // in this codebase (Dashboard, Reports) already resolves it.
        const productName = tempProducts.find((p) => p.id === b.productId)?.name ?? b.productId;
        return {
          batchId: b.id,
          productId: b.productId,
          productName,
          investmentValue: Number(calc.investmentValue.toFixed(2)),
          marketValue: Number(calc.marketValue.toFixed(2)),
          embeddedProfit: Number(calc.embeddedProfit.toFixed(2)),
        };
      });
      const embeddedProfitTotal = Number(
        embeddedProfitDetail.reduce((sum, l) => sum + l.embeddedProfit, 0).toFixed(2)
      );

      // [Corrected — Product Architect clarification, this session] The
      // previous version of this code set measuredBusinessWorth to
      // productValuationTotal ALONE, silently ignoring the business's
      // own EXISTING, already-tracked expenses and withdrawals — an
      // undercount of the true measured figure, not a reasonable
      // interim value. Corrected: reuses totalExpensesAllTime/
      // totalWithdrawalsAllTime, the SAME all-time cumulative constants
      // this component already computes today (above, unchanged — the
      // existing Business Worth Engine's own inputs) — never a second,
      // duplicate reduction. cashPosition/receivablesPosition/
      // payablesPosition are OMITTED here (not included as 0) because
      // Cash Ledger/Receivables/Payables genuinely do not exist until
      // Increment 3 — confirmed, twice now, by direct repository
      // inspection to have no existing source anywhere in this
      // codebase. This mirrors the EXISTING, unmodified formula
      // (totalMarketValueAllTime − totalExpensesAllTime −
      // totalWithdrawalsAllTime, AppContext.tsx line ~943) exactly,
      // with productValuationTotal (the Contagem's own MEASURED
      // physical count) standing in for totalMarketValueAllTime (the
      // batch-ledger's own ESTIMATE). Quebras need no separate term: a
      // physical count already reflects breakage (broken stock isn't
      // there to count), exactly as the existing batch-ledger
      // calculation already relies on for the identical reason.
      const productValuationTotal = Number(normalizedTotalSellingValue.toFixed(2));
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 3; Specification §12 FIN-4] A fresh physical count
      // (productValuationTotal above) already includes credit-financed
      // stock at its FULL market value — regardless of whether it's
      // been paid for yet. currentPayablesOutstanding is subtracted here
      // so a business that owes a supplier for stock sitting in this
      // count isn't measured as though that stock were fully, freely
      // owned. This is NOT a double-count against the live "since
      // snapshot" calculation's own payables-position term
      // (calculations.ts) — that term only tracks the outstanding
      // balance CHANGING after this snapshot, using this exact figure as
      // its own new starting baseline (payablesPosition, below).
      //
      // [Specification §11 FIN-3] receivablesPosition is deliberately
      // NEVER passed to computeMeasuredBusinessWorth's own additive
      // parameter — an outstanding (unpaid) Receivable must contribute
      // ZERO to Business Worth, so passing a real, nonzero sum into an
      // ADDITIVE parameter would violate FIN-3. The sum is still frozen
      // onto the snapshot itself, below, as an informational drill-down
      // figure only (§8) — never fed into this arithmetic.
      const currentPayablesOutstanding = sumOutstandingPayables(payables);
      const currentReceivablesOutstanding = sumOutstandingReceivables(receivables);
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 7; Specification §10 Decision 3, §22, FR-11, FR-55]
      // cashPosition is now genuinely available — the Owner-confirmed
      // actual cash position at this Contagem, when the caller supplied
      // one (RecordStockCountParams.ownerConfirmedCashPosition, above).
      // Passed into computeMeasuredBusinessWorth's own existing
      // (previously always-omitted) cashPosition parameter — the first
      // time this term is ever actually included, not a change to the
      // function's own formula. Genuinely omitted (never a fabricated
      // 0) when the caller supplies nothing, exactly as
      // payablesPosition/receivablesPosition were omitted before
      // Increment 3.
      const hasCashPosition = typeof ownerConfirmedCashPosition === 'number' && Number.isFinite(ownerConfirmedCashPosition);
      const measuredBusinessWorth = computeMeasuredBusinessWorth({
        productValuationTotal,
        totalExpensesAllTime,
        totalWithdrawalsAllTime,
        payablesPosition: currentPayablesOutstanding,
        ...(hasCashPosition ? { cashPosition: ownerConfirmedCashPosition } : {}),
      });

      // [Finding 3 correction — Product Architect Decision: Option A,
      // accepted] totalValue on each line is now the same selling-basis
      // figure productValuationTotal is built from (quantity *
      // sellingPrice), via the pure, independently-tested
      // buildProductValuationDetail() (calculations.ts) — see that
      // function's own header comment for why. valuationMode remains a
      // frozen, display-only pass-through of the source item's own
      // field — see BusinessWorthSnapshotProductValuationLine's own
      // comment (types.ts). Never read by measuredBusinessWorth or any
      // other calculation above/below this line.
      const productValuationDetail: BusinessWorthSnapshotProductValuationLine[] =
        buildProductValuationDetail(countItems);

      // [Drill-down/explanatory, narrower window than the all-time terms
      // already subtracted above — FR-24; existing Expense/Quebra/
      // Withdrawal collections, unmodified, FR-28-FR-30] Since the
      // previous snapshot's confirmedAt if one exists, else since the
      // business's own creation date — never fabricated, never a
      // cutover timestamp (Decision 1). Uses each record's own `date`
      // field, matching how this codebase already filters by date
      // elsewhere (isDateInRange, calculations.ts).
      const previousSnapshots = businessWorthSnapshots.filter((s) => s.status === 'active');
      const previousSnapshot = previousSnapshots.length
        ? [...previousSnapshots].sort((a, b) => {
            const aMs = (a.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
            const bMs = (b.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
            return bMs - aMs;
          })[0]
        : null;
      const windowStartDate = previousSnapshot
        ? new Date(
            (previousSnapshot.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0
          ).toISOString().slice(0, 10)
        : (business?.createdAt ?? '1970-01-01').slice(0, 10);
      const expensesSinceLastSnapshot = Number(
        expenses
          .filter((e) => isDateInRange(e.date, windowStartDate, date))
          .reduce((sum, e) => sum + Number(e.amount || 0), 0)
          .toFixed(2)
      );
      const breakagesSinceLastSnapshot = Number(
        quebras
          .filter((q) => isDateInRange(q.date, windowStartDate, date))
          .reduce((sum, q) => sum + Number(q.quantityLost || 0) * (batches.find((b) => b.id === q.batchId)?.costPrice ?? 0), 0)
          .toFixed(2)
      );
      const levantamentosSinceLastSnapshot = Number(
        withdrawals
          .filter((w) => isDateInRange(w.date, windowStartDate, date))
          .reduce((sum, w) => sum + Number(w.amount || 0), 0)
          .toFixed(2)
      );

      // [Specification §7, §41; Implementation Plan §6 (corrected)]
      // previousCurrentBusinessWorth now correctly captures the LIVE
      // Current Business Worth immediately before this new confirmation
      // — the prior snapshot (if any) plus governed activity accumulated
      // since it, evaluated as of this Contagem's own `date` — not merely
      // the prior snapshot's frozen value, matching §41's corrected
      // meaning of "Current Business Worth." 'UNKNOWN' (this business's
      // very first snapshot) becomes null, matching the field's own
      // null-only-for-first-snapshot contract (Specification §8) — a
      // truthful null, not a placeholder (there genuinely is no prior
      // snapshot). `businessWorthSnapshots` here still holds only the
      // PRIOR snapshots — the new one has not yet been added to context
      // state, since it is written directly to Firestore below, not
      // pushed into this array first.
      const priorCurrent = getCurrentBusinessWorth({
        snapshots: businessWorthSnapshots,
        batches,
        quebras,
        expenses,
        withdrawals,
        payables,
        cashLedgerEntries,
        asOfDate: date,
      });
      const previousCurrentBusinessWorth = priorCurrent === 'UNKNOWN' ? null : priorCurrent;

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 2; Specification §8] Estimated Business Worth now
      // exists (getEstimatedBusinessWorth, calculations.ts) — this
      // snapshot's own reconciliation figures can be genuinely computed
      // for the first time. Read as of this Contagem's own `date`, using
      // ONLY the PRIOR snapshots/initial stock count still in context
      // state at this point (the new snapshot being written below has not
      // been added to `businessWorthSnapshots` yet), so this is honestly
      // "what Estimated Business Worth was immediately before this
      // confirmation" — never the post-confirmation figure. Omitted
      // entirely (never a fabricated 0/null) when genuinely 'UNKNOWN' —
      // a genuinely new business's very first confirmation (simultaneously
      // its first Initial Stock AND its first snapshot) had no baseline at
      // all to estimate from beforehand.
      const priorEstimated = getEstimatedBusinessWorth({
        snapshots: businessWorthSnapshots,
        initialStockCount,
        batches,
        quebras,
        expenses,
        withdrawals,
        payables,
        cashLedgerEntries,
        asOfDate: date,
      });
      const estimatedBusinessWorthImmediatelyBefore = priorEstimated === 'UNKNOWN' ? undefined : priorEstimated;
      const difference =
        estimatedBusinessWorthImmediatelyBefore === undefined
          ? undefined
          : Number((measuredBusinessWorth - estimatedBusinessWorthImmediatelyBefore).toFixed(2));

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 7; Specification §10 Decision 3, §22, FR-11, FR-55]
      // cashPosition/cashLedgerBalanceAtConfirmation/
      // cashReconciliationDifference are now genuinely computable when
      // the caller supplied an Owner-confirmed cash figure — omitted
      // entirely (never a fabricated 0/undefined-as-zero) on the path
      // where the caller genuinely supplied nothing, continuing the
      // exact same "omit entirely" discipline this codebase already
      // uses for every other optional field on this record.
      // payablesPosition/receivablesPosition are computed above
      // (Increment 3) — see their own computation for what each
      // represents.
      const ledgerDerivedCashBalance = hasCashPosition
        ? getLedgerDerivedCashBalance(cashLedgerEntries, new Date(`${date}T23:59:59.999Z`).getTime())
        : undefined;
      const cashReconciliationDifference =
        hasCashPosition && ledgerDerivedCashBalance !== undefined
          ? computeCashReconciliationDifference(ownerConfirmedCashPosition as number, ledgerDerivedCashBalance)
          : undefined;
      const businessWorthSnapshot: Omit<BusinessWorthSnapshot, 'confirmedAt'> = {
        id: businessWorthSnapshotId,
        businessId,
        // [Business Worth Evolution — Implementation Authorization,
        // Increment 10 (Revision 3); Specification §42.1, FR-61]
        // REQUIRED as of Increment 10 — firestore.rules' own
        // businessWorthSnapshots.allow create Contagem branch now
        // explicitly requires this exact value; omitting it would
        // reject every ordinary Contagem confirmation outright, not
        // merely leave the field unset.
        establishmentMethod: 'contagem',
        sourceStockCountId: newCount.id,
        measuredBusinessWorth,
        productValuationTotal,
        productValuationDetail,
        embeddedProfitTotal,
        embeddedProfitDetail,
        payablesPosition: currentPayablesOutstanding,
        receivablesPosition: currentReceivablesOutstanding,
        expensesSinceLastSnapshot,
        breakagesSinceLastSnapshot,
        levantamentosSinceLastSnapshot,
        previousCurrentBusinessWorth,
        // [Increment 2] Now genuinely computable — see doc comment above.
        // Still omitted (not fabricated) on the one path where it is
        // genuinely 'UNKNOWN' (no baseline existed before this
        // confirmation at all).
        ...(estimatedBusinessWorthImmediatelyBefore !== undefined ? { estimatedBusinessWorthImmediatelyBefore } : {}),
        ...(difference !== undefined ? { difference } : {}),
        // [Increment 7] See doc comment above.
        ...(hasCashPosition ? { cashPosition: ownerConfirmedCashPosition as number } : {}),
        ...(ledgerDerivedCashBalance !== undefined ? { cashLedgerBalanceAtConfirmation: ledgerDerivedCashBalance } : {}),
        ...(cashReconciliationDifference !== undefined ? { cashReconciliationDifference } : {}),
        correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        // [Business Worth Evolution — Implementation Authorization,
        // Increment 8; Specification §25 FR-39, §26 FR-40] Set ONLY
        // when this call is a correction/recovery of an existing
        // snapshot (RecordStockCountParams.correctionOfSnapshotId,
        // above) — the id of the original this new snapshot supersedes.
        // Absent for every ordinary Contagem confirmation, exactly as
        // before this increment.
        ...(correctionOfSnapshotId ? { supersedesSnapshotId: correctionOfSnapshotId } : {}),
      };
      // [Void & Redo — Implementation Authorization §2 items 1, 5-6;
      // Rule 8 Finding B1 — same discipline, applied here] confirmedAt
      // is written ONLY at the write-payload boundary, as a genuine
      // serverTimestamp() sentinel — never a client-computed value.
      // `businessWorthSnapshot` itself stays a precisely-typed,
      // sentinel-free object (via the Omit above); only this single
      // write() call needs to tolerate a FieldValue — mirroring
      // stockCountWritePayload's own exact pattern immediately above.
      const businessWorthSnapshotWritePayload: WithFieldValue<BusinessWorthSnapshot> = {
        ...businessWorthSnapshot,
        confirmedAt: serverTimestamp(),
      };
      fsBatch.set(
        doc(db, 'businesses', businessId, 'businessWorthSnapshots', businessWorthSnapshotId),
        businessWorthSnapshotWritePayload
      );

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 9; Specification §34, FR-48] Captured here, inside
      // this block, into the hoisted variable declared above this
      // block — read only after the batch commit below succeeds,
      // further down. `difference`/`cashReconciliationDifference`
      // (Specification §22's own reconciliation-signal fields) are
      // carried through so the eventual Timeline entry can surface a
      // reconciliation
      // discrepancy at the SAME moment as the confirmation itself —
      // never a second, separately-invented reconciliation event or
      // calculation (this increment's own explicit instruction).
      businessWorthSnapshotForTimeline = {
        id: businessWorthSnapshotId,
        measuredBusinessWorth,
        ...(difference !== undefined ? { difference } : {}),
        ...(cashReconciliationDifference !== undefined ? { cashReconciliationDifference } : {}),
      };

      // [Business Worth Evolution — Implementation Authorization,
      // Increment 8; Specification §25 FR-39, §26 FR-40-FR-43, FR-58;
      // Plan §12-§13] The correction/recovery's OTHER two writes,
      // batched atomically alongside the new snapshot above — never
      // separately retriable, so a partial outcome (new snapshot
      // written, original left 'active'; or Authorization left
      // 'unconsumed' after a real recovery) is structurally impossible,
      // exactly as this batch already guarantees for stockCounts +
      // businessWorthSnapshots together (§5).
      if (correctionOfSnapshotId) {
        // The original's status transitions exactly once, to exactly
        // one terminal value — firestore.rules independently and
        // authoritatively re-verifies this transition is legitimate
        // (businessWorthSnapshotCorrectable / businessWorthRecoveryAuthorizationActive)
        // regardless of what correctionKind the caller asserts here.
        fsBatch.update(
          doc(db, 'businesses', businessId, 'businessWorthSnapshots', correctionOfSnapshotId),
          { status: correctionKind === 'superadmin-authorized-recovery' ? 'superseded-by-recovery' : 'corrected' }
        );
        if (correctionKind === 'superadmin-authorized-recovery') {
          // [Plan §13 "Consumption: Owner-only, via a new eligibility
          // branch on whatever write path performs the correction"] The
          // Authorization is consumed in the SAME batch as the recovery
          // it authorizes — never a separate, unguarded write, and
          // never left 'unconsumed' after a real recovery has already
          // happened (which would wrongly leave it reusable).
          fsBatch.update(
            doc(db, 'businesses', businessId, 'businessWorthRecoveryAuthorizations', 'current'),
            { status: 'consumed', consumedAt: serverTimestamp() }
          );
        }
      }
    }
    // [Void & Redo — Implementation Authorization §2 items 1, 5-6; Rule
    // 8 Finding B1] confirmedAt is written ONLY here, as a genuine
    // serverTimestamp() sentinel — never a client-computed value.
    // firestore.rules requires confirmedAt === request.time for every
    // chainPosition-bearing 'initial' create (both the new-shape
    // original and every redo branch); a client-computed Date would
    // fail that check outright, by design (this is what makes the
    // 12-hour window's own timestamp untamperable — Finding B1).
    // [Amendment v1.0, Part 1] Confirmation is atomic with draft cleanup —
    // same Firestore batch as the stockCounts write above. If the batch
    // fails to commit for any reason, this delete never happens either,
    // so the draft is left intact, exactly as specified.
    if (type === 'initial') {
      fsBatch.delete(doc(db, 'businesses', businessId, 'stockCountDrafts', 'initial'));
    } else {
      // [Implementation Task, Section 3] Same atomicity guarantee,
      // extended to the periodic draft — a retry that lands on this
      // batch again (same deterministic stockCounts id) harmlessly
      // re-issues this delete against a document that may already be
      // gone; Firestore's batched delete on a non-existent document is
      // a no-op, not an error.
      fsBatch.delete(doc(db, 'businesses', businessId, 'stockCountDrafts', 'periodic'));
    }
    await fsBatch.commit();

    if (type === 'initial') {
      // [Initial Stock Dual-Valuation-Basis — Implementation
      // Authorization, §2 item 7 / §5 "The Timeline Finding"] Uses the
      // RESOLVED value (whichever basis newCount.initialCapitalBasis
      // selected, or cost if absent) for the "Capital Inicial"
      // financial-impact figure the owner actually sees — not
      // newCount.totalValue directly, which would always show the cost
      // total regardless of the selected basis. `details.totalValue`,
      // below, deliberately continues to mirror the raw, always-cost
      // StockCount.totalValue field verbatim (same name, same meaning,
      // an honest audit trail of that specific field) — it is the
      // financialImpact label the owner sees that needed the fix, per
      // Rule 8 Finding 5.
      const resolvedInitialCapital = resolveInitialCapitalValue(newCount);
      await logTimelineEvent({
        type: 'initial-stock-count',
        date,
        title: 'Contagem Inicial de Stock Concluída',
        description: `Capital inicial do negócio estabelecido com ${countItems.length} produto(s).`,
        financialImpact: [{ label: 'Capital Inicial', amount: resolvedInitialCapital, tone: 'neutral' }],
        details: {
          productCount: countItems.length,
          totalValue: newCount.totalValue,
        },
      });
    } else {
      await logTimelineEvent({
        // [Implementation Task, Section 3/6a — corrected during
        // implementation, see below] Deterministic id derived from the
        // same submissionId as the stockCounts document above.
        //
        // [CORRECTION] This does NOT converge via "harmless overwrite"
        // as originally described in the Implementation Task — confirmed
        // by `npm run test:periodic-stock-finalization:emulator`
        // actually catching this. `timelineEvents`' own rule
        // (firestore.rules) is `allow update: if false` — entries are
        // unconditionally append-only, by a pre-existing, deliberate
        // design this task does not touch. Firestore classifies a write
        // to a path that already holds a document as an `update`, so a
        // retry's write here is REJECTED outright by that rule, not
        // silently accepted as a no-op overwrite.
        //
        // This still converges to exactly one document, just via a
        // different mechanism: logTimelineEvent's own pre-existing
        // try/catch (a few lines up in this file, already in place for
        // every call site, not added by this task) swallows that
        // rejection — so this call never throws into recordStockCount
        // regardless of whether the write was the first (succeeds, a
        // genuine create) or a retry (fails closed, silently absorbed).
        // Net effect: exactly one timelineEvents document ever exists at
        // this id — whichever attempt's write reached Firestore first —
        // satisfying the frozen spec's §8b requirement via the existing
        // immutability rule acting as a rules-enforced "existence check
        // preceding the write" (one of §8a's explicitly listed,
        // non-exhaustive mechanism options), not via idempotent
        // overwrite. Independent of the stockCounts+draft-delete batch's
        // atomicity (this call happens after that batch commits,
        // matching every other logTimelineEvent call site in this file)
        // — §8b does not require cross-collection atomicity, only this
        // convergent outcome.
        id: 'tl-periodic-' + submissionId,
        type: 'stock-verification',
        date,
        title: 'Verificação de Stock Concluída',
        description: `Contagem física de stock (${label?.trim() || type}) com ${countItems.length} produto(s).`,
        financialImpact: [{ label: 'Valor Contado', amount: newCount.totalValue, tone: 'neutral' }],
        details: {
          countType: type,
          // [Fix — same undefined-field bug as newCount.label above]
          // label?.trim() is undefined for every non-'custom' type;
          // Record<string, string | number | undefined>'s type
          // signature permits this, but Firestore rejects it at any
          // nesting depth, not just top-level fields. This write is
          // wrapped in logTimelineEvent's own try/catch (below), so
          // this specific instance was never user-blocking — it
          // silently failed the timeline entry only, logged to
          // console. Still a real bug: fixed the same way.
          ...(label?.trim() ? { label: label.trim() } : {}),
          productCount: countItems.length,
          totalValue: newCount.totalValue,
        },
      });
    }

    // [Business Worth Evolution — Implementation Authorization,
    // Increment 9; Specification §34, FR-48; Rule 8 Finding 11-A / §36
    // item 7's own resolution] Tenant-scoped audit entry for this
    // Contagem's own Business Worth event — logged only after
    // fsBatch.commit() has already succeeded (this function would have
    // thrown above otherwise, and this line would never be reached),
    // matching every other logTimelineEvent call site in this file.
    // Deterministic id derived from the same businessWorthSnapshotId
    // the underlying write already used (itself one-to-one with
    // sourceStockCountId, FR-37) — a retry of the same logical
    // confirmation lands on the same Timeline document id, which
    // `timelineEvents`' own pre-existing `allow update: if false` rule
    // rejects outright (never a silent overwrite), and
    // logTimelineEvent's own pre-existing try/catch absorbs that
    // rejection — the exact same "exactly one document, enforced by the
    // rules layer, not by idempotent overwrite" mechanism this file's
    // own periodic 'stock-verification' entry above already
    // establishes. This is never skipped merely because the eventual
    // write is a no-op — the point is that a retry can never produce a
    // MISLEADING duplicate audit entry, not that this call is
    // conditional.
    //
    // Distinguishes exactly the three lifecycle events FR-48/this
    // increment's own task require be distinguishable, never collapsed
    // into one generic type: an ordinary Contagem confirmation, an
    // Owner correction (§25), and a SuperAdmin-authorized recovery
    // consumption (§26) — the correctionKind parameter (never
    // free-typed by this function itself; see RecordStockCountParams'
    // own comment) is what the caller already established, re-read
    // here only to select the correct event type, never re-decided.
    //
    // Reconciliation-signal auditing (Specification §22, FR-48's own
    // "reconciliation-signal event" item): carried as this SAME entry's
    // own financialImpact/details when a discrepancy exists on this
    // snapshot, rather than a second, separately-invented event or
    // calculation — the discrepancy becomes knowable at exactly this
    // moment (confirmation time), and this Specification's own §22
    // already frames the reconciliation signal as part of what a
    // Contagem confirmation produces, not a later, independent event.
    if (businessWorthSnapshotForTimeline) {
      const bwsTimeline = businessWorthSnapshotForTimeline;
      const reconciliationImpact: TimelineFinancialImpact[] = [];
      if (typeof bwsTimeline.difference === 'number' && bwsTimeline.difference !== 0) {
        reconciliationImpact.push({
          label: 'Diferença de Reconciliação (Valor do Negócio)',
          amount: bwsTimeline.difference,
          tone: bwsTimeline.difference < 0 ? 'negative' : 'positive',
        });
      }
      if (typeof bwsTimeline.cashReconciliationDifference === 'number' && bwsTimeline.cashReconciliationDifference !== 0) {
        reconciliationImpact.push({
          label: 'Diferença de Reconciliação (Caixa)',
          amount: bwsTimeline.cashReconciliationDifference,
          tone: bwsTimeline.cashReconciliationDifference < 0 ? 'negative' : 'positive',
        });
      }

      if (correctionOfSnapshotId && correctionKind === 'superadmin-authorized-recovery') {
        await logTimelineEvent({
          id: 'tl-' + bwsTimeline.id,
          type: 'business-worth-recovery-consumed',
          date,
          title: 'Recuperação de Valor do Negócio Executada',
          description: `Recuperação autorizada pelo SuperAdmin executada — substitui o registo de valor do negócio anterior (${correctionOfSnapshotId}).`,
          financialImpact: [
            { label: 'Valor do Negócio (Recuperado)', amount: bwsTimeline.measuredBusinessWorth, tone: 'neutral' },
            ...reconciliationImpact,
          ],
          details: { supersedesSnapshotId: correctionOfSnapshotId, businessWorthSnapshotId: bwsTimeline.id },
        });
      } else if (correctionOfSnapshotId && correctionKind === 'owner-correction') {
        await logTimelineEvent({
          id: 'tl-' + bwsTimeline.id,
          type: 'business-worth-correction',
          date,
          title: 'Contagem Corrigida',
          description: `Correção do dono, dentro da janela de 3 horas — substitui o registo de valor do negócio anterior (${correctionOfSnapshotId}).`,
          financialImpact: [
            { label: 'Valor do Negócio (Corrigido)', amount: bwsTimeline.measuredBusinessWorth, tone: 'neutral' },
            ...reconciliationImpact,
          ],
          details: { supersedesSnapshotId: correctionOfSnapshotId, businessWorthSnapshotId: bwsTimeline.id },
        });
      } else {
        await logTimelineEvent({
          id: 'tl-' + bwsTimeline.id,
          type: 'business-worth-snapshot-confirmed',
          date,
          title: 'Valor do Negócio Registado',
          description: `Contagem confirmada — novo registo de valor do negócio criado.`,
          financialImpact: [
            { label: 'Valor do Negócio', amount: bwsTimeline.measuredBusinessWorth, tone: 'neutral' },
            ...reconciliationImpact,
          ],
          details: { businessWorthSnapshotId: bwsTimeline.id },
        });
      }
    }

    // [Implementation Task, Section 3] Deliberately NOT gated on "was
    // this the first successful commit" — triggerTrialActivation's own
    // server-side transition (trial_pending -> trial_active) is already
    // a one-way, idempotent no-op on a second call (see this function's
    // own comment below), so calling it unconditionally on every
    // finalization attempt — exactly as every other call site in this
    // file already does — cannot produce a harmful duplicate effect.
    // Gating it would add complexity without changing the observable
    // outcome the frozen spec's §8a requires.
    triggerTrialActivation(businessId);
    return newCount;
  };

  // [Void & Redo — Implementation Authorization §2 item 5; Rule 8
  // Findings A1, D1, K1; Specification FR-3, FR-4] Voids the CURRENTLY
  // ACTIVE Initial Stock confirmation and reconstructs the exact
  // pre-confirmation draft state from its own items/initialCapitalBasis
  // — never a blank form, never a partial reconstruction (FR-3).
  //
  // Authorization is entirely firestore.rules' — this function does
  // NOT re-implement the Owner-only/12-hour-window/ceiling checks;
  // it only issues the write and surfaces a clear message if the rules
  // layer rejects it (window elapsed, Confirmation #4, non-Owner, or
  // any other precondition failure — all indistinguishable from a
  // generic permission error at this layer, since firestore.rules
  // gives no more specific reason than a denial).
  //
  // [Rule 8 Finding A1; Authorization §2 item 5, §8 acceptance
  // criterion 17] The reconstructed draft is deliberately TRANSIENT —
  // set into local React state only (`initialStockDraft`), never
  // written to the existing `stockCountDrafts/initial` Firestore
  // document. This is a deliberate scope boundary, not an oversight:
  // that collection's own create/update rule remains gated on
  // subscriptionAllowsNewRecords (unchanged, unmodified by this
  // feature — the Option A exemption (Rule 8 Finding K1) was
  // authorized ONLY for the void-record artifact and the redo
  // confirmation document, §2 item 7 of the signed Authorization,
  // never for stockCountDrafts). Persisting the reconstructed draft
  // there would silently widen the subscription exemption's surface
  // beyond what was authorized. The practical consequence — a
  // reconstructed draft is lost on page refresh before the Owner
  // reconfirms — is a known, deliberately-accepted limitation of this
  // step's scope, not resolved here; see this session's own
  // verification notes for where this is tracked for the final
  // verification pass.
  const voidInitialStockConfirmation = async (): Promise<InitialStockDraft> => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!initialStockCount) {
      throw new Error('Não existe uma confirmação de Capital Inicial ativa para anular.');
    }

    const businessId = activeBusinessId;
    const targetId = initialStockCount.id;

    // [SuperAdmin-Assisted Initial Stock Recovery — Consumption & Audit
    // Amendment; Supplementary Implementation Authorization, signed
    // 2026-08-21] Two distinct write paths, chosen the same way as
    // before this amendment (ONLY use the authorized path when the
    // ordinary 12-hour window does NOT already cover it — never spends
    // a still-valid Authorization unnecessarily):
    //
    // - ORDINARY path (unchanged from before this amendment): a direct
    //   client batch write, gated by firestore.rules'
    //   initialStockConfirmationVoidable().
    // - AUTHORIZED path (Amendment §2/§3): the client no longer writes
    //   voidRecords/the Authorization document directly at all — it
    //   calls POST /api/initial-stock-recovery/consume, which performs
    //   both writes together in one server-side Firestore transaction
    //   and is what makes the resulting `.consumed` audit entry
    //   possible in the first place (a pure client write structurally
    //   cannot write platform_audit_log). The Owner remains the sole
    //   actor — this call is authenticated as the Owner, never a
    //   platform-operator credential, and the server performs no
    //   judgment of its own beyond re-verifying what was already true.
    const usingAuthorizedRecovery =
      !initialStockVoidEligibility.eligible && initialStockAuthorizedRecoveryEligibility.eligible;

    if (usingAuthorizedRecovery) {
      if (!currentUser) {
        throw new Error('A sua sessão expirou. Inicie sessão novamente.');
      }
      const idToken = await currentUser.getIdToken();
      let response: Response;
      try {
        response = await fetch('/api/initial-stock-recovery/consume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ businessId, targetStockCountId: targetId }),
        });
      } catch {
        throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
      }
      if (!response.ok) {
        let message = 'Não foi possível concluir a recuperação autorizada. Tente novamente.';
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch {
          // response wasn't JSON — keep the generic message
        }
        throw new Error(message);
      }
    } else {
      // [Rule 8 Finding D1] A single-document write is already atomic
      // by itself; a batch of one is used here only for consistency
      // with this file's established pattern for every other Firestore
      // write (fsBatch.set + fsBatch.commit), not because atomicity
      // across multiple documents is needed for this specific step.
      const fsBatch = createFirestoreBatch(db);
      const voidRecordPayload: WithFieldValue<VoidRecord> = {
        id: targetId,
        voidedConfirmationId: targetId,
        voidedAt: serverTimestamp(),
      };
      fsBatch.set(doc(db, 'businesses', businessId, 'voidRecords', targetId), voidRecordPayload);
      await fsBatch.commit();
    }

    // [FR-3; Rule 8 Finding A1] The confirmed StockCountItem shape is a
    // strict superset of InitialStockDraftItem's business-meaningful
    // fields, minus only the client-generated row id — a UI list-key
    // convenience, never business data, regenerated fresh here without
    // any loss of information.
    const reconstructedDraft: InitialStockDraft = {
      items: initialStockCount.items.map((item) => ({
        id: 'draft-item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        productName: item.productName,
        quantity: item.quantity,
        ...(item.unit ? { unit: item.unit } : {}),
        costPrice: item.costPrice,
        ...(typeof item.sellingPrice === 'number' ? { sellingPrice: item.sellingPrice } : {}),
      })),
      date: initialStockCount.date,
      updatedAt: new Date().toISOString(),
      ...(initialStockCount.initialCapitalBasis ? { initialCapitalBasis: initialStockCount.initialCapitalBasis } : {}),
    };

    setInitialStockDraft(reconstructedDraft);
    setInitialStockDraftLoaded(true);

    return reconstructedDraft;
  };

  // [Initial Stock Valuation History] Records a price change affecting
  // units still remaining from the original 'initial' StockCount, WITHOUT
  // editing that StockCount — see InitialStockPriceChangeEvent (types.ts)
  // for the full data-model rule this implements. Owner-only, matching
  // firestore.rules' own create rule for this collection.
  const recordInitialStockPriceChangeEvent = async ({
    productId,
    effectiveDate,
    quantityRemaining,
    newCostPrice,
    newSellingPrice,
    reason,
  }: RecordInitialStockPriceChangeParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode registar uma alteração de preço.');
    if (!initialStockCount) throw new Error('O Capital Inicial ainda não foi definido.');

    const originalItem = initialStockCount.items.find((i) => i.productId === productId);
    if (!originalItem) {
      throw new Error('Este produto não faz parte da Contagem Inicial de Stock.');
    }

    if (!Number.isFinite(quantityRemaining) || quantityRemaining <= 0) {
      throw new Error('Introduza uma quantidade restante maior que zero.');
    }
    // Validated against the ORIGINAL item's quantity — this event can
    // never claim more units remain than were ever originally counted.
    // It intentionally does NOT validate against a prior event's own
    // quantityRemaining: the app has no sales ledger to reliably derive
    // "remaining" from, so a later, larger owner-entered correction for
    // the same product is not treated as an error here (see types.ts —
    // quantityRemaining is the Owner's authoritative input, not a
    // system-derived figure).
    if (quantityRemaining > originalItem.quantity) {
      throw new Error(`A quantidade restante não pode exceder a quantidade original (${originalItem.quantity}).`);
    }
    if (!Number.isFinite(newCostPrice) || newCostPrice < 0) {
      throw new Error('Introduza um custo válido (não negativo).');
    }
    if (!Number.isFinite(newSellingPrice) || newSellingPrice < 0) {
      throw new Error('Introduza um preço de venda válido (não negativo).');
    }
    if (!effectiveDate) {
      throw new Error('Introduza uma data efetiva válida.');
    }

    const businessId = activeBusinessId;

    // Previous price snapshot: the most recent existing event for this
    // product if one exists, otherwise the original 'initial' item's own
    // values — see the field's own comment on InitialStockPriceChangeEvent.
    const existingForProduct = initialStockPriceChangeEvents.filter((e) => e.productId === productId);
    const previousEvent = existingForProduct.length
      ? existingForProduct.reduce((latest, e) =>
          new Date(e.effectiveDate).getTime() > new Date(latest.effectiveDate).getTime() ||
          (new Date(e.effectiveDate).getTime() === new Date(latest.effectiveDate).getTime() &&
            new Date(e.createdAt).getTime() > new Date(latest.createdAt).getTime())
            ? e
            : latest
        )
      : null;

    const previousCostPrice = previousEvent ? previousEvent.newCostPrice : originalItem.costPrice;
    const previousSellingPrice = previousEvent ? previousEvent.newSellingPrice : (originalItem.sellingPrice ?? 0);

    const newEvent: InitialStockPriceChangeEvent = {
      id: 'iscpe-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      businessId,
      productId,
      productName: originalItem.productName,
      effectiveDate,
      quantityRemaining: Number(quantityRemaining),
      previousCostPrice,
      previousSellingPrice,
      newCostPrice: Number(newCostPrice),
      newSellingPrice: Number(newSellingPrice),
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || '',
    };

    await setDoc(doc(db, 'businesses', businessId, 'initialStockPriceChangeEvents', newEvent.id), newEvent);

    await logTimelineEvent({
      type: 'stock-verification',
      date: effectiveDate,
      title: 'Alteração de Preço no Capital Inicial Registada',
      description: `Preço de "${originalItem.productName}" atualizado para ${quantityRemaining} unidade(s) restantes do Capital Inicial.`,
      productName: originalItem.productName,
      details: {
        productId,
        quantityRemaining,
        previousCostPrice,
        previousSellingPrice,
        newCostPrice,
        newSellingPrice,
        reason: reason?.trim(),
      },
    });

    return newEvent;
  };

  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1]
  // Upserts the persistent Initial Stock draft. Owner-only at the rules
  // layer. Deliberately NOT Initial Capital — this never writes to
  // stockCounts, never creates a Product, and is never read by
  // initialCapitalValue/expectedCurrentStockValue. Overwrites the whole
  // draft document each call (the draft is small — a handful of rows —
  // so a full overwrite is simpler and safer than incremental per-item
  // writes, and matches how the view already holds the whole row list
  // in local state before calling this).
  const saveInitialStockDraft = async (items: InitialStockDraftItem[], date: string, initialCapitalBasis?: InitialCapitalBasis) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (hasInitialStockCount) {
      throw new Error('O Capital Inicial já foi definido e não pode ser registado novamente.');
    }
    const draft: InitialStockDraft = {
      items,
      date,
      updatedAt: new Date().toISOString(),
      // [Initial Stock Dual-Valuation-Basis — Implementation
      // Authorization, §2 item 3] Same undefined-field discipline as
      // every other optional field in this file — omitted entirely,
      // never a literal `undefined`, whenever the caller hasn't made a
      // selection yet (e.g. a draft autosaved before the owner has
      // touched the new basis control at all).
      ...(initialCapitalBasis ? { initialCapitalBasis } : {}),
    };
    await setDoc(doc(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'initial'), draft);
  };

  // Discards the draft without confirming it — an explicit "start over"
  // path, distinct from confirmation's automatic cleanup.
  const clearInitialStockDraft = async () => {
    if (!activeBusinessId) return;
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'initial'));
  };

  // [Stock Count Data-Loss Resilience — Implementation Task, Section 6]
  // Persistent Periodic Contagem draft — own code path, deliberately
  // NOT sharing code with saveInitialStockDraft above (frozen spec §5's
  // explicit non-authorization of a shared hook between the two
  // mechanisms). Full-document overwrite each call, same reasoning as
  // saveInitialStockDraft: the caller already holds the whole working
  // list in memory before calling this, so a partial/incremental write
  // would only add complexity without a durability benefit.
  //
  // `items` are expected already Firestore-safe (no literal `undefined`
  // field values) — the caller (PeriodicStockCountView's
  // scheduleDraftSave) is responsible for that, matching
  // savePurchaseDraft's own documented discipline for this exact class
  // of bug (optional fields conditionally included, never assigned
  // `undefined` directly).
  //
  // `submissionId` is optional: absent during ordinary `editing`-state
  // autosaves (no identity has been generated yet), present once the
  // operator has entered `pendingTally` at least once. When present,
  // this function does NOT merge — it writes the full document
  // including the identity, which is what makes the identity durable
  // by construction rather than needing a separate merge-only write
  // path (see §4b of the Implementation Task for why the identity must
  // be durable before finalization; this function's full-overwrite
  // shape is what `establishSubmissionIdentity`-equivalent calls below
  // rely on to avoid ever persisting a document with the identity but
  // missing row content, or vice versa).
  // `newProductInfo` [Decision 38 Amendment, Implementation Task §5b;
  // Implementation Authorization §2 item 3] is optional for the same
  // reason `label`/`submissionId` are: conditionally spread only when
  // non-empty, never assigned the literal value `undefined` (Firestore
  // rejects that). A draft written before this parameter existed
  // simply lacks the field — no migration, no backward-compatibility
  // branch is needed here; the resume path (PeriodicStockCountView.tsx)
  // is what treats absence as an empty object.
  const savePeriodicStockDraft = async (
    items: PeriodicStockDraftItem[],
    type: StockCountType,
    label: string | undefined,
    date: string,
    submissionId?: string,
    newProductInfo?: Record<
      string,
      { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }
    >
  ) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    const draft: PeriodicStockDraft = {
      items,
      type,
      ...(label ? { label } : {}),
      date,
      ...(submissionId ? { submissionId } : {}),
      ...(newProductInfo && Object.keys(newProductInfo).length > 0 ? { newProductInfo } : {}),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic'), draft);
  };

  // Discards the periodic draft without finalizing it — the explicit
  // "Começar de novo" path on the stale-draft resume banner
  // (Implementation Task, Section 5), distinct from finalization's
  // automatic atomic cleanup inside recordStockCount below.
  const clearPeriodicStockDraft = async () => {
    if (!activeBusinessId) return;
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic'));
  };

  // [Durable Purchase Capture Amendment v1.0] Upserts the persistent,
  // per-user Purchase Draft (Rule 8 Assessment, Section 3/12) — the
  // Add Stock analogue of saveInitialStockDraft above. NOT inventory —
  // never creates a Product, StockBatch, or PurchaseBatch, and never
  // read by any valuation calculation (amendment Part 10). Overwrites
  // the whole draft document each call, same reasoning as
  // saveInitialStockDraft: small document, matches how AddStockView
  // already holds the whole row list in local state before calling
  // this.
  //
  // [Bug fix — undefined-field Firestore rejection] This is the most
  // consequential instance of the bug: autosave fires automatically,
  // in the background, on every meaningful change — and the common
  // case (no supplier selected yet, phone/notes/batch-notes still
  // blank) is exactly the case that previously set these fields to the
  // literal value `undefined`. setDoc() rejects that synchronously,
  // and the autosave effect's own .catch() silently swallowed the
  // failure — meaning the draft was very likely never actually
  // persisting in the common case, defeating the entire durability
  // purpose of this feature. Every optional field below is now
  // conditionally spread (omitted when falsy/absent) rather than
  // assigned `undefined` directly — this function is written to be
  // Firestore-safe regardless of whether its caller passes `undefined`
  // or `''` for "not provided," so this fix holds even if a future
  // call site is less careful.
  //
  // [Multi-Supplier Purchase Event Amendment v1.0] purchaseEventId is
  // optional and additive, same conditional-spread discipline as every
  // other field here — carries a Purchase Event correlation forward
  // through an interruption while entering a SECOND supplier's
  // products, after the Admin has already chosen to correlate it with
  // a first, already-finalized PurchaseBatch (amendment Part 6).
  const savePurchaseDraft = async (
    items: PurchaseDraftLineItem[],
    supplier: { supplierId?: string; supplierName?: string; supplierPhone?: string; supplierNotes?: string },
    date: string,
    notes?: string,
    purchaseEventId?: string
  ) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!currentUser) throw new Error('Sessão inválida.');
    const draft: PurchaseDraft = {
      items,
      ...(supplier.supplierId ? { supplierId: supplier.supplierId } : {}),
      ...(supplier.supplierName ? { supplierName: supplier.supplierName } : {}),
      ...(supplier.supplierPhone ? { supplierPhone: supplier.supplierPhone } : {}),
      ...(supplier.supplierNotes ? { supplierNotes: supplier.supplierNotes } : {}),
      date,
      ...(notes ? { notes } : {}),
      ...(purchaseEventId ? { purchaseEventId } : {}),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', activeBusinessId, 'purchaseDrafts', currentUser.uid), draft);
  };

  // Discards the draft without finalizing it — an explicit "start
  // over"/discard path, distinct from finalization's automatic
  // cleanup (addMultipleStockBatches deletes the draft atomically in
  // the same Firestore batch as the real records it creates — see
  // that function, below).
  const clearPurchaseDraft = async () => {
    if (!activeBusinessId || !currentUser) return;
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'purchaseDrafts', currentUser.uid));
  };

  // [Smart Stock Entry — Tier 1] See the interface's own comment above —
  // this NEVER touches purchaseDrafts and NEVER writes anything. It is a
  // thin wrapper around one privileged server call, following the exact
  // same authenticated-fetch pattern as deleteStaffMember/_staffActionRequest
  // above (Bearer ID token, JSON body, businessId re-verified server-side —
  // never trusted from this call alone). A network failure or any
  // non-2xx response is mapped to a graceful `{ success: false, reason:
  // 'network_error' }` rather than thrown — per the amendment's own
  // "AI failure must never block stock entry" rule, the caller
  // (AddStockView) is expected to fall back to manual entry on any
  // failure result, never to treat this as an unhandled exception.
  const scanPurchaseDocument = async (
    imageBase64: string,
    mimeType: string
  ): Promise<SmartStockEntryScanResult> => {
    if (!activeBusinessId || !currentUser) {
      return { success: false, reason: 'network_error' };
    }

    let idToken: string;
    try {
      idToken = await currentUser.getIdToken();
    } catch {
      return { success: false, reason: 'network_error' };
    }

    let response: Response;
    try {
      response = await fetch('/api/smart-stock-entry/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId: activeBusinessId,
          imageBase64,
          mimeType,
        }),
      });
    } catch {
      return { success: false, reason: 'network_error' };
    }

    if (!response.ok) {
      return { success: false, reason: 'network_error' };
    }

    try {
      const body = await response.json();
      if (body?.success === true && body?.proposal) {
        return { success: true, proposal: body.proposal as SmartStockEntryProposal };
      }
      const reason: SmartStockEntryFailureReason =
        body?.reason === 'too_large' ||
        body?.reason === 'unsupported_type' ||
        body?.reason === 'provider_unavailable' ||
        body?.reason === 'unreadable' ||
        body?.reason === 'invalid_upload'
          ? body.reason
          : 'unreadable';
      return { success: false, reason };
    } catch {
      return { success: false, reason: 'network_error' };
    }
  };

  // A period is "closed" if any existing Closing of the same type shares
  // its exact start/end range. Prevents accidentally closing the same
  // month or year twice.
  // A 'reopened' Closing no longer counts as blocking its period — a new
  // Closing can be recorded once corrections are made (Amendment v1.0, Q4).
  const isPeriodClosed = (periodType: ClosingPeriodType, startDate: string, endDate: string) => {
    return closings.some(
      (c) => c.periodType === periodType && c.startDate === startDate && c.endDate === endDate && (c.status ?? 'active') === 'active'
    );
  };

  // [Closing Integrity Amendment v1.0] Deterministic id for the
  // ClosedPeriod lock-index doc — firestore.rules derives this exact same
  // id from an incoming Expense/Withdrawal's own `date` field (via
  // string.split('-'), since rules can't slice/query). Keep both sides in
  // sync if this ever changes.
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6] 'custom' (Fecho) is NOT given a derivable lock-index key
  // here. The monthly/yearly scheme works only because firestore.rules
  // can independently derive the identical id from any Expense/
  // Withdrawal's own `date` string alone (a plain calendar-boundary
  // computation) — that is the entire reason this lock-index collection
  // exists (see ClosedPeriod's own doc comment, types.ts). A Fecho range
  // is not calendar-aligned and its end date is Owner-chosen per closing,
  // so no single-date-derived key can identify "does any Fecho cover this
  // date?" the same deterministic way. Extending this mechanism to
  // 'custom' is a genuine, undocumented structural question outside what
  // Plan §9/§10 and Rule 8 Finding 8-A/8-B resolve (both address the
  // periodType value and the update-immutability fix only, never this
  // lock-index scheme) — per §8's Governance Boundary, that question is
  // reported for Product Architect review, not silently decided here.
  // recordFechoClosing therefore does not write a ClosedPeriod doc; a
  // Fecho Closing still locks its own Expense/Withdrawal records exactly
  // like monthly/yearly (closingId/lockedAt), and the in-memory
  // isPeriodClosed double-close guard (reused unmodified, Finding 8-A)
  // still fully protects against closing the identical range twice — only
  // the independent backdated-entry Security Rule block is not extended
  // to 'custom' by this increment.
  const closedPeriodKey = (periodType: 'monthly' | 'yearly', startDate: string): string => {
    const [year, month] = startDate.split('-');
    return periodType === 'monthly' ? `monthly:${year}-${month}` : `yearly:${year}`;
  };

  // Splits a flat list of batch operations into ≤498-write chunks (leaving
  // headroom under Firestore's 500-write batch limit) so a single very
  // large Closing (many expenses/withdrawals in one period) can never
  // silently fail past that ceiling.
  const commitInChunks = async (ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void>) => {
    const CHUNK = 498;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const batch = createFirestoreBatch(db);
      ops.slice(i, i + CHUNK).forEach((op) => op(batch));
      await batch.commit();
    }
  };

  // Records a Monthly or Yearly Closing. This permanently locks the period's
  // figures (product profit, expenses, net income, withdrawals) as historical
  // fact, plus a snapshot of Business Worth (Cash on Hand + Current Inventory
  // Value) at the moment of closing.
  //
  // [Closing Integrity Amendment v1.0] Closing is no longer just "record a
  // snapshot" — it now also locks its *inputs*, not only freezing the
  // *result*: every Expense/Withdrawal this snapshot actually counted gets
  // closingId/lockedAt attached (Option B), and a ClosedPeriod lock-index
  // doc is written so firestore.rules can independently block a new
  // backdated Expense/Withdrawal from landing inside this period later.
  // Closings are never edited or deleted — only recorded, or reopened
  // (reopenClosing), which supersedes this one in place.
  const recordClosing = async ({ periodType, periodLabel, startDate, endDate, businessWorthOverride }: RecordClosingParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    if (isPeriodClosed(periodType, startDate, endDate)) {
      throw new Error('Este período já foi fechado anteriormente.');
    }

    const report = generateReportSummary(startDate, endDate, products, batches, quebras, expenses, withdrawals);

    const newClosing: Closing = {
      id: 'closing-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      periodType,
      periodLabel: periodLabel.trim(),
      startDate,
      endDate,
      totalEmbeddedProfit: report.totalEmbeddedProfit,
      totalExpenses: report.totalExpenses,
      totalWithdrawals: report.totalWithdrawals,
      inventoryCostAtClose: totalInvestmentValueAllTime,
      inventoryMarketValueAtClose: totalMarketValueAllTime,
      businessWorthAtClose: businessWorthOverride ?? businessWorth,
      closedAt: new Date().toISOString(),
      status: 'active',
    };

    const lockedAt = newClosing.closedAt;
    // [Increment 6] 'custom' (Fecho) intentionally has no ClosedPeriod
    // lock-index doc — see closedPeriodKey's own comment, above, for why
    // that mechanism does not extend to a non-calendar-aligned range.
    const periodKey = periodType === 'custom' ? null : closedPeriodKey(periodType, startDate);
    const closedPeriod: ClosedPeriod | null = periodKey
      ? { id: periodKey, periodType, startDate, endDate, closingId: newClosing.id, closedAt: newClosing.closedAt }
      : null;

    const expensesToLock = expenses.filter((e) => !e.closingId && isDateInRange(e.date, startDate, endDate));
    const withdrawalsToLock = withdrawals.filter((w) => !w.closingId && isDateInRange(w.date, startDate, endDate));

    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [
      (b) => b.set(doc(db, 'businesses', activeBusinessId!, 'closings', newClosing.id), newClosing),
      ...(periodKey && closedPeriod
        ? [(b: ReturnType<typeof createFirestoreBatch>) => b.set(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', periodKey), closedPeriod)]
        : []),
      ...expensesToLock.map((e) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: newClosing.id, lockedAt })
      ),
      ...withdrawalsToLock.map((w) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: newClosing.id, lockedAt })
      ),
    ];
    await commitInChunks(ops);

    const timelineType: TimelineActivityType =
      periodType === 'monthly' ? 'monthly-closing' : periodType === 'yearly' ? 'yearly-closing' : 'fecho-closing';
    const timelineTitle =
      periodType === 'monthly' ? 'Fecho Mensal Concluído' : periodType === 'yearly' ? 'Fecho Anual Concluído' : 'Fecho Concluído';
    await logTimelineEvent({
      type: timelineType,
      date: endDate,
      title: timelineTitle,
      description: `Período "${periodLabel.trim()}" fechado e bloqueado permanentemente.`,
      financialImpact: [
        { label: 'Lucro Embutido', amount: newClosing.totalEmbeddedProfit, tone: 'positive' },
        { label: 'Despesas', amount: -newClosing.totalExpenses, tone: 'negative' },
        { label: 'Retiradas', amount: -newClosing.totalWithdrawals, tone: 'negative' },
      ],
      details: {
        periodLabel: periodLabel.trim(),
        startDate,
        endDate,
        totalEmbeddedProfit: newClosing.totalEmbeddedProfit,
        totalExpenses: newClosing.totalExpenses,
        totalWithdrawals: newClosing.totalWithdrawals,
        businessWorthAtClose: newClosing.businessWorthAtClose,
      },
    });

    return newClosing;
  };

  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6; Specification §18, FR-25; Plan §9] Records a Fecho —
  // always periodType: 'custom'. Deliberately takes only `endDate` (and an
  // optional display label) as parameters — never a caller-supplied
  // `startDate` — so FR-25's "start date must always be the active
  // baseline's own date, never an independently owner-chosen start" is
  // enforced structurally by this function's own signature, not merely by
  // UI convention. The baseline is resolved fresh, right here, via the
  // exact same "latest active snapshot, else historical Capital Inicial"
  // rule getEstimatedBusinessWorth/getCurrentBusinessWorth and Startup
  // Investment's own window already use (§9's "exactly one baseline, the
  // latest, is ever active" rule) — never independently re-derived.
  // Everything else (the double-close guard, the Expense/Withdrawal
  // locking, the timeline event) is inherited unmodified from recordClosing,
  // above — this is a thin wrapper, not a parallel write path.
  const recordFechoClosing = async (endDate: string, periodLabel?: string): Promise<Closing> => {
    const startDate = resolveActiveBusinessWorthBaselineDate({
      snapshots: businessWorthSnapshots,
      initialStockCount,
    });
    if (!startDate) {
      throw new Error('Ainda não existe uma base (Contagem ou Capital Inicial) para ancorar o Fecho.');
    }
    if (endDate < startDate) {
      throw new Error('A data final do Fecho não pode ser anterior à data base ativa.');
    }
    const label = (periodLabel && periodLabel.trim()) || `Fecho ${startDate} — ${endDate}`;

    // [FR-53] Never the old pre-Evolution `businessWorth` formula, and
    // never a separately re-filtered calculation — the exact same shared
    // §9 function `currentBusinessWorth`/`estimatedBusinessWorth` above
    // already use, evaluated as of the Owner-selected end date.
    const fechoBusinessWorth = getEstimatedBusinessWorthAsOf(endDate);
    if (fechoBusinessWorth === 'UNKNOWN') {
      throw new Error('Ainda não existe uma base (Contagem ou Capital Inicial) para ancorar o Fecho.');
    }

    return recordClosing({ periodType: 'custom', periodLabel: label, startDate, endDate, businessWorthOverride: fechoBusinessWorth });
  };

  // [Closing Integrity Amendment v1.0 — Q4: period reopening, Owner-only,
  // logged] Replaces the old deleteClosing, which literally deleted the
  // Closing document. The amendment decided a Closing is never deleted —
  // reopening supersedes it in place (status: 'reopened'), so the original
  // frozen snapshot remains a permanent historical record of what this
  // Closing captured at close time (Architecture 8.8: "re-opens the
  // period; never edits the frozen figures retroactively"). Every Expense/
  // Withdrawal this Closing had locked is unlocked (closingId/lockedAt
  // cleared) so it can be corrected; a brand-new Closing is required to
  // re-lock the period afterward — recordClosing above will accept one,
  // since isPeriodClosed ignores a 'reopened' Closing.
  //
  // Deliberately Owner-only — NOT covered by a Manager's granted
  // 'closings' permission (BDS #16), since that permission governs
  // *recording* a Closing, not undoing one (Amendment v1.0 Decisions
  // Record). Enforced here and, independently, in firestore.rules.
  const reopenClosing = async (id: string, reason?: string) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode reabrir um período fechado.');

    const target = closings.find((c) => c.id === id);
    if (!target) throw new Error('Fecho não encontrado.');
    if ((target.status ?? 'active') !== 'active') {
      throw new Error('Este período já foi reaberto anteriormente.');
    }

    const reopenedAt = new Date().toISOString();
    const closingUpdate: Record<string, unknown> = {
      status: 'reopened',
      reopenedAt,
      reopenedByUid: currentUser?.uid || '',
      reopenedByName: userProfile?.name || '',
    };
    if (reason && reason.trim()) closingUpdate.reopenReason = reason.trim();

    const lockedExpenses = expenses.filter((e) => e.closingId === id);
    const lockedWithdrawals = withdrawals.filter((w) => w.closingId === id);

    // [Increment 6] No ClosedPeriod doc was ever written for a 'custom'
    // (Fecho) Closing — see recordClosing/closedPeriodKey's own comments —
    // so there is nothing to delete here for one. Narrowed to a local
    // const first: TS property-access narrowing on `target.periodType`
    // does not persist inside the arrow-function closure below.
    const targetPeriodType = target.periodType;
    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [
      (b) => b.update(doc(db, 'businesses', activeBusinessId!, 'closings', id), closingUpdate),
      ...(targetPeriodType === 'custom'
        ? []
        : [(b: ReturnType<typeof createFirestoreBatch>) =>
            b.delete(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', closedPeriodKey(targetPeriodType, target.startDate)))]),
      ...lockedExpenses.map((e) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: deleteField(), lockedAt: deleteField() })
      ),
      ...lockedWithdrawals.map((w) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: deleteField(), lockedAt: deleteField() })
      ),
    ];
    await commitInChunks(ops);

    await logTimelineEvent({
      type: 'period-reopened',
      date: reopenedAt.slice(0, 10),
      title: 'Período Reaberto',
      description: `Período "${target.periodLabel}" reaberto por ${userProfile?.name || 'Dono'}${reason && reason.trim() ? ` — ${reason.trim()}` : ''}. As despesas e retiradas deste período foram desbloqueadas para correção.`,
      details: {
        periodLabel: target.periodLabel,
        startDate: target.startDate,
        endDate: target.endDate,
        ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
      },
    });
  };

  // [Closing Integrity Amendment v1.0 — backfill decision] One-time,
  // idempotent, Owner-only migration: attaches closingId/lockedAt to every
  // Expense/Withdrawal that falls inside an already-recorded (pre-amendment)
  // active Closing's range but doesn't have a lock yet, and writes the
  // ClosedPeriod lock-index doc for any active Closing missing one. Safe to
  // run more than once — anything already locked/indexed is skipped, so
  // this can be re-run harmlessly if it's ever interrupted partway.
  const backfillClosingLocks = async (): Promise<{ closingsIndexed: number; expensesLocked: number; withdrawalsLocked: number }> => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode aplicar esta migração.');

    const activeClosings = closings.filter((c) => (c.status ?? 'active') === 'active');
    const existingPeriodKeys = new Set(closedPeriods.map((p) => p.id));

    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [];
    let closingsIndexed = 0;
    let expensesLocked = 0;
    let withdrawalsLocked = 0;

    for (const c of activeClosings) {
      // [Increment 6] A 'custom' (Fecho) Closing never has a ClosedPeriod
      // lock-index doc to backfill — see closedPeriodKey's own comment.
      if (c.periodType === 'custom') continue;
      const periodKey = closedPeriodKey(c.periodType, c.startDate);
      if (!existingPeriodKeys.has(periodKey)) {
        const closedPeriod: ClosedPeriod = {
          id: periodKey,
          periodType: c.periodType,
          startDate: c.startDate,
          endDate: c.endDate,
          closingId: c.id,
          closedAt: c.closedAt,
        };
        ops.push((b) => b.set(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', periodKey), closedPeriod));
        closingsIndexed++;
      }

      const lockedAt = c.closedAt;
      expenses
        .filter((e) => !e.closingId && isDateInRange(e.date, c.startDate, c.endDate))
        .forEach((e) => {
          ops.push((b) => b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: c.id, lockedAt }));
          expensesLocked++;
        });
      withdrawals
        .filter((w) => !w.closingId && isDateInRange(w.date, c.startDate, c.endDate))
        .forEach((w) => {
          ops.push((b) => b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: c.id, lockedAt }));
          withdrawalsLocked++;
        });
    }

    await commitInChunks(ops);
    return { closingsIndexed, expensesLocked, withdrawalsLocked };
  };

  const deleteQuebra = async (id: string) => {
    if (!activeBusinessId) return;
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'quebras', id));
  };

  // [Closing Integrity Amendment v1.0 — protects existing records, the
  // "Half 1" gap specs #8/#9 already named]. firestore.rules enforces this
  // independently (allow delete only if resource.data.closingId is absent) —
  // this client-side check exists purely to fail fast with a clear message
  // instead of a raw permission-denied.
  const deleteExpense = async (id: string) => {
    if (!activeBusinessId) return;
    const target = expenses.find((e) => e.id === id);
    if (target?.closingId) {
      throw new Error('Esta despesa pertence a um período já fechado e não pode ser removida. Reabra o período em Fechos para a corrigir.');
    }
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'expenses', id));
  };

  // Edits catalog metadata only (name, category, supplier, sku, barcode,
  // reference cost/selling price). Never touches batches, quebras, or any
  // Investment/Market/Profit figure — those are always derived from the
  // StockBatch records themselves, untouched by this function.
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    const payload: Partial<Product> = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'businesses', businessId, 'products', id), payload as any);
  };

  // [Product Memory / UOM — Increment A] The single explicit-confirmation
  // write path for a product's unit relationship — BDR-0012 Decision 14's
  // "the owner may review or edit any remembered Product Memory
  // configuration at any time" action, distinct from the automatic
  // new-product-creation paths in addStockBatch/addMultipleStockBatches/
  // recordStockCount above (which only ever set unitRelationship at the
  // moment a brand-new Product is created, never on an existing one).
  // This function is the ONLY code path in this file that can change an
  // EXISTING product's unitRelationship — reusing the existing,
  // unmodified updateProduct above rather than introducing a second
  // Firestore write mechanism. Always re-validates via
  // isValidUnitRelationship immediately before writing (never trusts a
  // caller-supplied value, UI-layer validation notwithstanding) and
  // throws rather than silently proceeding or silently discarding an
  // invalid candidate — consistent with confirmUnitRelationship's own
  // "never persists an invalid configuration" contract in
  // lib/unitRelationship.ts. Callers are responsible for invoking this
  // only in response to an explicit, deliberate owner action (e.g. a
  // catalog "confirm unit relationship" screen) — this function has no
  // way to distinguish a deliberate reconfiguration from an accidental
  // call, so that discipline lives entirely in the caller, exactly as
  // it already does for updateProduct itself.
  const confirmProductUnitRelationship = async (productId: string, candidate: UnitRelationshipProposal) => {
    const confirmed = confirmUnitRelationship(candidate);
    if (!confirmed) {
      throw new Error('Relação de unidades inválida — verifique a unidade de venda e a estrutura de unidades.');
    }
    await updateProduct(productId, { unitRelationship: confirmed });
  };

  // [Fix #7 — Destructive Operations Safety] Previously a sequence of
  // independently-awaited deleteDoc calls (product, then each batch, then
  // each quebra) — if any call in the middle failed (lost connectivity,
  // tab closed), the product doc was already gone while its batches
  // remained, and calculateInventoryTotals sums ALL batches/quebras in
  // state regardless of whether their product still exists, so those
  // orphaned batches kept silently inflating Business Worth. Now built
  // from planDeleteProduct() (src/utils/deleteProductPlan.ts — see that
  // file and tests/delete-product-plan.test.ts for the full contract):
  // the common case (product + its batches + its quebras <= 500 Firestore
  // ops, true for the overwhelming majority of real businesses) commits
  // as a single atomic writeBatch, exactly matching deleteExpense/
  // deleteWithdrawal's existing all-or-nothing shape. Only a business
  // whose product has accumulated more history than that ever needs more
  // than one commit — Firestore's writeBatch has a hard 500-operation
  // ceiling, which no client-side code can raise — and even then the
  // product doc is only ever deleted in the LAST commit, after every
  // batch/quebra commit has already succeeded, so a mid-cascade failure
  // never orphans a batch/quebra under a deleted product; it just leaves
  // the product visible with some history still attached, safely
  // retryable, never a misleading Business Worth figure.
  const deleteProduct = async (id: string) => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    const prodBatchIds = batches.filter((b) => b.productId === id).map((b) => b.id);
    const prodQuebraIds = quebras.filter((q) => q.productId === id).map((q) => q.id);
    const chunks = planDeleteProduct(id, prodBatchIds, prodQuebraIds);

    const collectionFor = (kind: 'product' | 'batch' | 'quebra') =>
      kind === 'product' ? 'products' : kind === 'batch' ? 'batches' : 'quebras';

    for (const chunk of chunks) {
      const fsBatch = createFirestoreBatch(db);
      for (const op of chunk) {
        fsBatch.delete(doc(db, 'businesses', businessId, collectionFor(op.kind), op.id));
      }
      await fsBatch.commit();
    }
  };

  const addStaffMember = async (name: string, email: string, password: string) => {
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) throw new Error('Apenas o dono ou um gestor autorizado pode adicionar funcionários.');

    const businessId = activeBusinessId;
    const secondaryAppName = `staff-app-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = (await import('firebase/auth')).getAuth(secondaryApp);
    const createFn = (await import('firebase/auth')).createUserWithEmailAndPassword;

    try {
      const userCred = await createFn(secondaryAuth, email.trim(), password);
      const staffUid = userCred.user.uid;

      const staffProfile: UserProfile = {
        uid: staffUid,
        email: email.trim(),
        name: name.trim(),
        role: 'staff',
        businessId: businessId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', staffUid), staffProfile);

      const staffData: StaffMember = {
        uid: staffUid,
        email: email.trim(),
        name: name.trim(),
        businessId: businessId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'businesses', businessId, 'staff', staffUid), staffData);
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  // Deleting a staff member must fully revoke their access — including
  // their Firebase Authentication account, which the client SDK has no
  // permission to delete for anyone but itself. That privileged step (plus
  // the matching Firestore cleanup and audit entry) happens server-side,
  // on our own Express/Node server (server/index.ts) authenticated with a
  // Firebase Admin SDK service account. Deliberately NOT a Cloud Function —
  // Cloud Functions requires the Blaze billing plan; this runs on the same
  // Railway service that already hosts the app.
  const deleteStaffMember = async (staffUid: string, reason?: string) => {
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) {
      throw new Error('Apenas o dono ou um gestor autorizado pode remover funcionários.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch('/api/staff/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          reason,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao remover funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const _staffActionRequest = async (
    endpoint: 'suspend' | 'reactivate',
    staffUid: string,
    reason?: string
  ) => {
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) {
      throw new Error('Apenas o dono ou um gestor autorizado pode gerir funcionários.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch(`/api/staff/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          reason,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = endpoint === 'suspend'
        ? 'Erro ao suspender funcionário. Tente novamente.'
        : 'Erro ao reativar funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  // Reversible alternative to deleteStaffMember: blocks the staff member's
  // access entirely (Firebase Auth account disabled + refresh tokens
  // revoked server-side) without touching any data they've entered.
  const suspendStaffMember = async (staffUid: string, reason?: string) => {
    await _staffActionRequest('suspend', staffUid, reason);
  };

  const reactivateStaffMember = async (staffUid: string) => {
    await _staffActionRequest('reactivate', staffUid);
  };

  // BDS #16 — Admin-only. Promotes/demotes staffTier and sets which
  // Manager permissions are granted. Deliberately not routed through
  // _staffActionRequest: that helper allows a granted Manager, and tier/
  // permission changes must never be delegable, even to a Manager with
  // staffManagement granted.
  const setStaffTier = async (
    staffUid: string,
    staffTier: StaffTier,
    managerPermissions?: Partial<ManagerPermissions>
  ) => {
    if (!activeBusinessId || !isOwner) {
      throw new Error('Apenas o dono pode alterar o nível de um funcionário.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();
    let response: Response;
    try {
      response = await fetch('/api/staff/set-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          staffTier,
          managerPermissions,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao atualizar o nível do funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const resetStaffPin = async (staffUid: string, newPin: string) => {
    if (!/^\d{6}$/.test(newPin)) {
      throw new Error('O PIN deve ter exatamente 6 dígitos numéricos.');
    }
    if (!activeBusinessId || !isOwner) {
      throw new Error('Apenas o dono pode redefinir o PIN de um funcionário.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();
    let response: Response;
    try {
      response = await fetch('/api/staff/reset-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ staffUid, businessId: activeBusinessId, newPin }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao redefinir o PIN. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadSampleData = async () => {
    if (!activeBusinessId || !isOwner) return;
    const businessId = activeBusinessId;

    const fsBatch = createFirestoreBatch(db);

    INITIAL_PRODUCTS.forEach((p) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'products', p.id), p);
    });

    INITIAL_BATCHES.forEach((b) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'batches', b.id), b);
    });

    INITIAL_QUEBRAS.forEach((q) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'quebras', q.id), q);
    });

    INITIAL_EXPENSES.forEach((e) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'expenses', e.id), e);
    });

    await fsBatch.commit();
  };

  const clearAllData = async () => {
    if (!activeBusinessId || !isOwner) return;
    const businessId = activeBusinessId;

    for (const p of products) {
      await deleteDoc(doc(db, 'businesses', businessId, 'products', p.id));
    }
    for (const b of batches) {
      await deleteDoc(doc(db, 'businesses', businessId, 'batches', b.id));
    }
    for (const pb of purchaseBatches) {
      await deleteDoc(doc(db, 'businesses', businessId, 'purchaseBatches', pb.id));
    }
    for (const q of quebras) {
      await deleteDoc(doc(db, 'businesses', businessId, 'quebras', q.id));
    }
    for (const e of expenses) {
      await deleteDoc(doc(db, 'businesses', businessId, 'expenses', e.id));
    }
    // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 3]
    // The 'initial' StockCount is now refused by firestore.rules for
    // update/delete unconditionally, Owner included ("no exceptions",
    // Architecture 8.6). This loop is sequential, unguarded deleteDoc
    // calls — the same shape the Closing Integrity Amendment already
    // found and fixed for Closings (comment below), so an attempted
    // delete of the 'initial' document here would throw and silently
    // abort before reaching withdrawals/timelineEvents. Skipping it
    // explicitly is the identical fix applied there: "Clear All Data"
    // now no longer removes the Initial Capital baseline either — a
    // real, deliberate, and directly-intended consequence of the
    // already-approved immutability rule (not a new decision made here),
    // flagged plainly rather than left to be discovered as a runtime
    // error.
    for (const s of stockCounts) {
      if (s.type === 'initial') continue;
      await deleteDoc(doc(db, 'businesses', businessId, 'stockCounts', s.id));
    }
    // [Initial Stock Valuation History] Same "no exceptions" immutability
    // tier as the 'initial' StockCount itself (firestore.rules: allow
    // delete: if false, unconditionally) — "Clear All Data" does not
    // attempt to remove these either, for the identical reason the loop
    // above skips the 'initial' StockCount. Not iterated at all, matching
    // that established pattern rather than looping and swallowing a
    // guaranteed per-item failure.
    // The draft (if any) is not itself Initial Capital, so it is still
    // fully cleared by "Clear All Data" — no rule prevents this.
    await deleteDoc(doc(db, 'businesses', businessId, 'stockCountDrafts', 'initial')).catch(() => {
      // No draft existed — nothing to clean up, not an error.
    });
    for (const w of withdrawals) {
      await deleteDoc(doc(db, 'businesses', businessId, 'withdrawals', w.id));
    }
    // [Closing Integrity Amendment v1.0] Closings can no longer be
    // deleted at all (firestore.rules: allow delete: if false — a Closing
    // is permanent, only ever superseded via reopenClosing). "Clear All
    // Data" therefore no longer removes Closing or ClosedPeriod records —
    // attempting to would simply fail against the rule. This is a real,
    // deliberate behavior change from before this amendment (when
    // deleteClosing did a plain deleteDoc) and is worth a product decision
    // on whether "Limpar Todos os Dados" should still claim to wipe
    // literally everything, or whether its copy should be updated to
    // reflect that Closings now survive a reset by design — flagged here,
    // not silently decided.
    for (const t of timelineEvents) {
      await deleteDoc(doc(db, 'businesses', businessId, 'timelineEvents', t.id));
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userProfile,
        business,
        subscription,
        subscriptionTrialDaysRemaining,
        subscriptionGracePeriodDaysRemaining,
        subscriptionBlocksNewRecords,
        isAuthLoading,
        isOwner,
        isStaff,
        isManager,
        canManagerCloseBooks,
        canManagerManageStaff,
        products,
        productsError,
        batches,
        purchaseBatches,
        suppliers,
        quebras,
        expenses,
        stockCounts,
        voidRecords,
        businessWorthSnapshots,
        currentBusinessWorth,
        estimatedBusinessWorth,
        fechoBaselineDate,
        getEstimatedBusinessWorthAsOf,
        cashLedgerEntries,
        receivables,
        receivablePayments,
        payables,
        payablePayments,
        cashPositionDeclarations,
        startupInvestmentEntries,
        addReceivable,
        addPayable,
        addCashPositionDeclaration,
        recordReceivablePayment,
        recordPayablePayment,
        recordOwnerDeclaredBusinessWorth,
        addStartupInvestmentEntry,
        initialStockConfirmationChain,
        initialStockVoidEligibility,
        initialStockRecoveryAuthorization,
        businessWorthRecoveryAuthorization,
        businessWorthCorrectionEligibility,
        businessWorthAuthorizedRecoveryEligibility,
        latestActiveBusinessWorthSnapshot,
        pendingBusinessWorthCorrection,
        startBusinessWorthCorrection,
        clearBusinessWorthCorrection,
        initialStockAuthorizedRecoveryEligibility,
        withdrawals,
        payments,
        submitPayment,
        staffMembers,
        currencySymbol,
        setCurrencySymbol,
        businessCategory,
        setBusinessCategory,
        isBusinessProfileComplete,
        updateBusinessProfile,
        addStockBatch,
        addMultipleStockBatches,
        attachPurchaseEventId,
        archivePurchaseBatch,
        unarchivePurchaseBatch,
        addQuebra,
        addExpense,
        addWithdrawal,
        deleteWithdrawal,
        hasInitialStockCount,
        initialStockCount,
        initialCapitalValue,
        recordStockCount,
        voidInitialStockConfirmation,
        initialStockPriceChangeEvents,
        recordInitialStockPriceChangeEvent,
        initialStockCurrentValuation,
        initialStockDraft,
        initialStockDraftLoaded,
        saveInitialStockDraft,
        clearInitialStockDraft,
        periodicStockDraft,
        periodicStockDraftLoaded,
        savePeriodicStockDraft,
        clearPeriodicStockDraft,
        purchaseDraft,
        purchaseDraftLoaded,
        savePurchaseDraft,
        clearPurchaseDraft,
        scanPurchaseDocument,
        expectedCurrentStockValue,
        latestStockCount,
        currentInventoryValue,
        totalInvestmentValueAllTime,
        totalMarketValueAllTime,
        totalEmbeddedProfitAllTime,
        activeBatchCount,
        totalExpensesAllTime,
        totalWithdrawalsAllTime,
        businessWorth,
        capitalGrowth,
        capitalGrowthPct,
        closings,
        recordClosing,
        recordFechoClosing,
        reopenClosing,
        backfillClosingLocks,
        isPeriodClosed,
        timelineEvents,
        logReportExport,
        deleteQuebra,
        deleteExpense,
        updateProduct,
        confirmProductUnitRelationship,
        deleteProduct,
        addStaffMember,
        deleteStaffMember,
        suspendStaffMember,
        reactivateStaffMember,
        resetStaffPin,
        setStaffTier,
        pairedDevice,
        pairDevice,
        unpairDevice,
        suspensionNotice,
        clearSuspensionNotice: () => setSuspensionNotice(null),
        businessSuspended,
        ownedBusinesses,
        activeBusinessId,
        maxShopsPerOwner: MAX_SHOPS_PER_OWNER,
        addShop,
        switchShop,
        refreshShopWorth,
        logout,
        loadSampleData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
