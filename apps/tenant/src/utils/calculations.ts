import { StockBatch, Quebra, BatchCalculation, Product, ProductReportDetail, Expense, ReportSummary, Withdrawal, StockCount, InitialStockPriceChangeEvent, InitialStockRecoveryAuthorization, BusinessWorthSnapshot } from '../types';

/**
 * Calculates Investment Value / Market Value / Embedded Profit for a single
 * Stock Batch. IMPORTANT: this app never records sales, so nothing here is
 * "revenue" or "profit realized" — it is potential profit embedded in
 * unsold inventory. Quebras (losses) reduce remaining quantity, which
 * reduces Investment Value and Market Value on the exact same basis.
 */
export function calculateBatch(batch: StockBatch, batchQuebras: Quebra[]): BatchCalculation {
  const relevantQuebras = batchQuebras.filter(q => q.batchId === batch.id);
  const totalQuebraQuantity = relevantQuebras.reduce((sum, q) => sum + Number(q.quantityLost || 0), 0);
  const quebraValue = totalQuebraQuantity * batch.costPrice;

  // [Business Calculation Compliance Audit V-5] Financial valuation must
  // never go negative, even if logged quebra quantity exceeds the batch's
  // original quantity (a data-entry edge case). `totalQuebraQuantity` above
  // is left untouched — it is the audit-trail record of what was actually
  // logged, not a valuation figure — and `hasExceededWarning` below still
  // fires exactly as before, so the fact that excessive quebra occurred is
  // fully preserved. Only the *quantity used for valuation* is floored.
  const remainingQuantity = Math.max(0, batch.quantity - totalQuebraQuantity);

  // Both values computed off the SAME basis (remainingQuantity) — a quebra
  // reduces Investment Value and Market Value identically, never one alone.
  const investmentValue = remainingQuantity * batch.costPrice;
  const marketValue = remainingQuantity * batch.sellingPrice;
  const embeddedProfit = marketValue - investmentValue;

  const isEstimate = batch.status === 'open';
  const hasExceededWarning = totalQuebraQuantity > batch.quantity;

  return {
    batch,
    totalQuebraQuantity,
    quebraValue,
    remainingQuantity,
    investmentValue,
    marketValue,
    embeddedProfit,
    isEstimate,
    hasExceededWarning,
  };
}

/**
 * Groups a Quebra list by batchId once, so callers iterating many batches
 * can look up each batch's quebras in O(1) instead of filtering the full
 * list per batch. Same semantics as `quebras.filter(q => q.batchId === id)`
 * — batches with no quebras simply have no entry (callers use `?? []`).
 */
export function groupQuebrasByBatch(quebras: Quebra[]): Map<string, Quebra[]> {
  const map = new Map<string, Quebra[]>();
  for (const q of quebras) {
    const existing = map.get(q.batchId);
    if (existing) {
      existing.push(q);
    } else {
      map.set(q.batchId, [q]);
    }
  }
  return map;
}

/**
 * Aggregates Investment Value, Market Value and Embedded Profit across a
 * set of batches. This is the single source of truth for any aggregate
 * inventory figure (Dashboard cards, Reports, Closings) — nothing else
 * should re-derive these totals independently.
 */
export function calculateInventoryTotals(batches: StockBatch[], quebras: Quebra[]) {
  let totalInvestmentValue = 0;
  let totalMarketValue = 0;
  let totalEmbeddedProfit = 0;
  let activeBatchCount = 0;

  const quebrasByBatch = groupQuebrasByBatch(quebras);

  batches.forEach((batch) => {
    const calc = calculateBatch(batch, quebrasByBatch.get(batch.id) ?? []);
    totalInvestmentValue += calc.investmentValue;
    totalMarketValue += calc.marketValue;
    totalEmbeddedProfit += calc.embeddedProfit;
    if (calc.remainingQuantity > 0) activeBatchCount += 1;
  });

  return { totalInvestmentValue, totalMarketValue, totalEmbeddedProfit, activeBatchCount };
}

// ------------------------------------------------------------------
// [Void & Redo — Implementation Authorization §2 items 8-9; Rule 8
// Finding I1; Specification FR-2, FR-8, FR-21] Client-side DISPLAY of
// whether Void & Redo currently looks available for a given
// confirmation, and how much of its 12-hour window [Recovery Window
// Amendment, amending the original 30-minute value] remains.
//
// NEVER the authoritative gate — firestore.rules'
// initialStockConfirmationVoidable() is authoritative, evaluated
// against request.time (the server's trusted clock), not anything
// computed here. A stale/manipulated client clock can, at worst,
// cause this to report `eligible: true` a few moments after the
// server would in fact refuse the write, or `eligible: false`
// slightly early — never the reverse in a way that grants a write the
// rules layer wouldn't independently allow. Exists purely so the UI
// can display "time remaining" / "recovery available" without a
// round-trip.
//
// A confirmation with no `confirmedAt` (every 'initial' count
// confirmed before this feature existed) is never eligible — no
// timestamp inferred or substituted, mirroring firestore.rules'
// `confirmedAt != null` requirement exactly (Rule 8 Finding B1).
//
// Confirmation #4 (chainPosition 4) always reports `eligible: false`
// regardless of remaining time — its window still has a real
// msRemaining value (§21/FR-21's visibility requirement), but Void &
// Redo can never succeed against it (Rule 8 Finding E1).
//
// Pure, deterministic (aside from reading the current time once), no
// Firestore/AppContext dependency — safe to unit test directly.
// ------------------------------------------------------------------
export interface VoidEligibility {
  eligible: boolean;
  windowExpiresAt: Date | null;
  msRemaining: number;
}

export function computeInitialStockVoidEligibility(
  initialStockCount: StockCount | null | undefined,
  now: Date = new Date()
): VoidEligibility {
  if (!initialStockCount || !initialStockCount.confirmedAt) {
    return { eligible: false, windowExpiresAt: null, msRemaining: 0 };
  }

  const confirmedAtMs = initialStockCount.confirmedAt.toMillis();
  const windowExpiresAtMs = confirmedAtMs + 12 * 60 * 60 * 1000;
  const msRemaining = Math.max(0, windowExpiresAtMs - now.getTime());
  const chainPosition = initialStockCount.chainPosition ?? 1;
  const withinWindow = now.getTime() < windowExpiresAtMs;
  const eligible = chainPosition !== 4 && withinWindow;

  return { eligible, windowExpiresAt: new Date(windowExpiresAtMs), msRemaining };
}

// ------------------------------------------------------------------
// [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan §17;
// POL-0009 Rule K precedent] computeInitialStockAuthorizedRecoveryEligibility
//
// Mirrors computeInitialStockVoidEligibility's own shape and its own
// "never the authoritative gate" discipline exactly: firestore.rules'
// initialStockRecoveryAuthorizationActive() is authoritative, evaluated
// server-side against request.time — this function exists only so the
// Owner UI can display "an authorized recovery is available, N hours
// remaining" without a round trip, and can never grant a write the
// rules layer wouldn't independently allow.
//
// Distinct from, and never confused with, the ordinary 12-hour window
// this file's own computeInitialStockVoidEligibility already computes
// (POL-0009 Rule R: "completely separate from the normal 12-hour
// confirmedAt recovery window"). A confirmation may simultaneously have
// eligible: false from computeInitialStockVoidEligibility (its own
// window expired, or it is legacy and never had one) and eligible: true
// here — that is precisely the case this capability exists to serve.
// ------------------------------------------------------------------
export interface AuthorizedRecoveryEligibility {
  eligible: boolean;
  expiresAt: Date | null;
  msRemaining: number;
}

export function computeInitialStockAuthorizedRecoveryEligibility(
  authorization: InitialStockRecoveryAuthorization | null | undefined,
  targetStockCountId: string | null | undefined,
  now: Date = new Date()
): AuthorizedRecoveryEligibility {
  if (
    !authorization ||
    !targetStockCountId ||
    authorization.status !== 'unconsumed' ||
    authorization.targetStockCountId !== targetStockCountId
  ) {
    return { eligible: false, expiresAt: null, msRemaining: 0 };
  }

  const expiresAtMs = authorization.expiresAt.toMillis();
  const msRemaining = Math.max(0, expiresAtMs - now.getTime());
  const eligible = now.getTime() < expiresAtMs;

  return { eligible, expiresAt: new Date(expiresAtMs), msRemaining };
}

// ------------------------------------------------------------------
// [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
// §2 item 6] resolveInitialCapitalValue — the single, pure function
// replacing the previous inline `initialStockCount?.totalValue || 0`
// expression in AppContext.tsx. Every consumer of initialCapitalValue
// (Dashboard, both Reports, InitialStockPriceChangeModal, and the
// Initial Stock confirmation Timeline entry — see recordStockCount)
// reads through this exact function, so this is the ONE place this
// feature's business meaning lives.
// ------------------------------------------------------------------

/**
 * Resolves what `initialCapitalValue` means for a given business's
 * `initial` StockCount, per BDR-0014 §5.A's four resolved decisions:
 *
 * - No confirmed Initial Stock count at all → 0 (unchanged from today).
 * - `initialCapitalBasis` absent (every 'initial' count confirmed
 *   before this capability existed, and any future count where the
 *   owner explicitly chose Cost) → `totalValue` (cost basis) —
 *   BYTE-IDENTICAL to what `initialStockCount?.totalValue || 0`
 *   already returned before this function existed. This is the
 *   prospective-only, no-retroactive-change guarantee (BDR-0014 §5.A
 *   item 1, Specification Invariant I-4) made concrete: an old
 *   business's figure literally cannot change, because the code path
 *   producing it is unchanged.
 * - `initialCapitalBasis === 'cost'` (an explicit choice, same result
 *   as the absent case) → `totalValue`.
 * - `initialCapitalBasis === 'selling'` → `totalSellingValue`, with a
 *   defensive fallback to `totalValue` if `totalSellingValue` is for
 *   any reason not a finite number (should not occur under this
 *   feature's own write path — Findings 1/2 always compute and freeze
 *   both totals together at the same confirmation — but matches this
 *   codebase's established `|| 0`/defensive-fallback discipline rather
 *   than ever surfacing `NaN` or `undefined` to a consumer).
 *
 * Pure, deterministic, no Firestore/AppContext dependency — safe to
 * unit test directly, matching this repository's established
 * "business-meaning calculations get their own dedicated function"
 * convention (Rule 8 Assessment Finding 4).
 */
export function resolveInitialCapitalValue(initialStockCount: StockCount | null | undefined): number {
  if (!initialStockCount) return 0;

  const costTotal = initialStockCount.totalValue || 0;

  if (initialStockCount.initialCapitalBasis === 'selling') {
    const sellingTotal = initialStockCount.totalSellingValue;
    return typeof sellingTotal === 'number' && Number.isFinite(sellingTotal) ? sellingTotal : costTotal;
  }

  // Absent, or explicitly 'cost' — both resolve identically to the
  // cost total, exactly as this codebase has always behaved.
  return costTotal;
}

/**
 * [Business Worth Evolution — Implementation Authorization, Increment 1
 * (corrected per Specification §41, Accepted 22 August 2026; Implementation
 * Plan §6/§7, Accepted 22 August 2026); Specification §7, FR-1, FR-3, FR-4,
 * §41.3; source BDR Decisions 1, 3, 21, 23]
 *
 * THE SHARED CURRENT/ESTIMATED BUSINESS WORTH CALCULATION FUNCTION.
 *
 * [Correction, this pass] The previous version of this function returned
 * only the latest snapshot's own frozen `measuredBusinessWorth` — accurate
 * against the Specification's *original* text ("never itself independently
 * computed... never a live recomputation"), but that text is now corrected
 * by the accepted §41 amendment: Current Business Worth is the latest
 * confirmed `BusinessWorthSnapshot` PLUS every governed Business-Worth-
 * affecting change recorded since that snapshot's own `confirmedAt` — a
 * live, on-demand calculation, not a frozen read. This is the SAME
 * calculation the Implementation Plan's §9/Case-A formula already defines
 * for Estimated Business Worth — per §41.4's own note, "Current" and
 * "Estimated" are two names for the same formula, read at different
 * moments ("as of right now" vs. "as of a chosen date, or before any
 * measurement exists"). This function is that one shared calculation.
 *
 * [Increment 1 scope — existing sources only, per explicit Product
 * Architect direction] This function reads only from collections that
 * already exist in this codebase today — `batches`, `quebras`, `expenses`,
 * `withdrawals` — exactly the four sources the source BDR/Specification
 * confirm already exist (embedded profit, Expenses, Quebras,
 * Levantamentos). It deliberately does NOT read Receivables, Payables, or
 * a Cash Ledger — those genuinely have no existing source anywhere in this
 * codebase (confirmed, independently, three separate times across this
 * capability's own governance history: the Rule 8 Assessment's Current
 * State Assessment, the Specification's own §1 item 8 investigation, and
 * the Implementation Plan's own §3.2/§3.4 correction pass) and remain
 * correctly deferred to Increment 3 — this function's own signature has no
 * parameter for them at all in Increment 1, so there is no zero to
 * silently fabricate.
 *
 * [Correction, this pass — snapshot-boundary temporal semantics, per the
 * Increment 1 financial-integrity audit's own finding] The PREVIOUS
 * version of this function used each record's `date` field (an
 * Owner-entered calendar day, e.g. "2026-05-01", with no time-of-day) to
 * decide whether it occurred "since" the snapshot, compared against the
 * snapshot's OWN calendar day. This double-counted any Expense/Withdrawal
 * dated on the exact same calendar day as the Contagem's own confirmation,
 * if that record already existed (was already created) BEFORE the
 * confirmation moment — because `AppContext.tsx`'s own
 * `totalExpensesAllTime`/`totalWithdrawalsAllTime` (the inputs
 * `computeMeasuredBusinessWorth` uses to freeze the snapshot) sum EVERY
 * currently-existing record with no date filter at all, so such a record
 * is already baked into the snapshot's own frozen `measuredBusinessWorth`
 * — counting it again here double-subtracted it.
 *
 * THREE DISTINCT CONCEPTS, NEVER CONFLATED:
 * - BUSINESS DATE (`record.date`) — the transaction's Owner-declared
 *   date, for reporting/business-date purposes. Unchanged, still used
 *   elsewhere in this codebase exactly as before. NOT used for this
 *   function's own snapshot-boundary decision.
 * - CREATION TIMESTAMP (`record.createdAt`, an existing ISO-timestamp
 *   field already present on `Expense`/`Withdrawal`/`Quebra`) — when the
 *   record actually entered the system. THIS is what this function now
 *   compares against the snapshot boundary.
 * - SNAPSHOT CONFIRMATION TIMESTAMP (`snapshot.confirmedAt`) — when the
 *   Business Worth measurement became frozen; the boundary itself.
 *
 * CORRECTED RULE: `record.createdAt <= snapshot.confirmedAt` → the record
 * already existed at measurement time → excluded from the post-snapshot
 * delta (it is already reflected in the snapshot's own frozen value).
 * `record.createdAt > snapshot.confirmedAt` → the record was created
 * after measurement → included, per its own approved Business Worth
 * effect. **Equality is treated as "already existed"** (`<=`, not `<`) —
 * a deterministic default requiring no new business rule: the snapshot's
 * own frozen totals are computed by summing whatever exists in Firestore
 * at the instant of confirmation, so a record whose `createdAt` exactly
 * equals that instant was, by construction, already part of that sum.
 *
 * This correction also fixes a related, previously-unnoticed gap: a
 * BACKDATED record (Owner-entered `date` before the snapshot, but actually
 * `createdAt` AFTER it — e.g. correcting a forgotten historical expense)
 * is now correctly included in the post-snapshot delta, since its
 * `createdAt` is what is compared, not its `date`. Under the previous
 * `date`-based filter, such a record would have been silently and
 * permanently excluded from ever affecting Business Worth.
 *
 * [`asOfDate` — the requested calculation endpoint, a separate concept
 * from the snapshot boundary above, per explicit instruction not to
 * replace one with the other] `asOfDate` remains an Owner/caller-facing
 * calendar-day string. For consistency with the corrected, timestamp-based
 * snapshot boundary, it is compared as "the end of that calendar day"
 * (`asOfDate` + `T23:59:59.999Z`, UTC) — a record created after that
 * instant is excluded from this particular read, even though it may
 * still be a genuinely valid post-snapshot record for a *later* read.
 *
 * Returns 'UNKNOWN' when no 'active' `BusinessWorthSnapshot` exists yet
 * for the business (State 1/1a) — never a third outcome (FR-3, I-1).
 *
 * Pure, deterministic given its inputs — no Firestore/AppContext
 * dependency of its own, safe to unit test directly. `asOfDate` defaults
 * to "today" (an ISO date string) when omitted, but accepting it
 * explicitly keeps the function fully deterministic for tests.
 */
export function getCurrentBusinessWorth(params: {
  snapshots: BusinessWorthSnapshot[] | null | undefined;
  batches: StockBatch[];
  quebras: Quebra[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  asOfDate?: string;
}): number | 'UNKNOWN' {
  const { snapshots, batches, quebras, expenses, withdrawals } = params;
  const asOfDate = params.asOfDate ?? new Date().toISOString().slice(0, 10);
  const asOfMillis = new Date(`${asOfDate}T23:59:59.999Z`).getTime();

  if (!snapshots || snapshots.length === 0) return 'UNKNOWN';

  const active = snapshots.filter((s) => s.status === 'active');
  if (active.length === 0) return 'UNKNOWN';

  const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];
  const snapshotMillis = toMillis(latest.confirmedAt);

  // Embedded profit delta since the snapshot (see doc comment above) —
  // unchanged by this correction: a live-vs-frozen comparison, not a
  // date-filtered range, so it carries no date-granularity risk.
  const currentEmbeddedProfitTotal = calculateInventoryTotals(
    batches.filter((b) => b.status === 'open'),
    quebras
  ).totalEmbeddedProfit;
  const embeddedProfitSinceSnapshot = Number(
    (currentEmbeddedProfitTotal - latest.embeddedProfitTotal).toFixed(2)
  );

  // [Corrected] createdAt (a precise timestamp) vs confirmedAt (a precise
  // timestamp) — never date (a calendar day) vs confirmedAt. A record's
  // own `createdAt` must be strictly AFTER the snapshot's confirmedAt to
  // be considered post-snapshot activity, and no later than the end of
  // the requested asOfDate.
  const isPostSnapshotActivity = (createdAt: string): boolean => {
    const createdMillis = new Date(createdAt).getTime();
    return createdMillis > snapshotMillis && createdMillis <= asOfMillis;
  };

  const expensesSinceSnapshot = Number(
    expenses
      .filter((e) => isPostSnapshotActivity(e.createdAt))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      .toFixed(2)
  );
  const levantamentosSinceSnapshot = Number(
    withdrawals
      .filter((w) => isPostSnapshotActivity(w.createdAt))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0)
      .toFixed(2)
  );

  // Receivables/Payables/Cash position changes: deliberately no term here
  // in Increment 1 — see doc comment above. Not a fabricated zero; the
  // function simply has no such input to read yet.
  return Number(
    (
      latest.measuredBusinessWorth +
      embeddedProfitSinceSnapshot -
      expensesSinceSnapshot -
      levantamentosSinceSnapshot
    ).toFixed(2)
  );
}

// Firestore Timestamp objects expose toMillis()/seconds; a plain object
// (e.g. from a test fixture not using the real SDK type) may instead
// carry a raw `seconds` field. Falls back to 0 (oldest possible) only
// for a genuinely malformed entry — never throws, never silently drops
// a real snapshot from consideration.
function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof (value as { seconds?: number }).seconds === 'number') {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/**
 * [Business Worth Evolution — Implementation Authorization, Increment 1
 * (corrected); Specification §8, FR-24; Product Architect clarification
 * "Decision A" — existing financial activity already exists and must
 * not be treated as zero] Computes a BusinessWorthSnapshot's own frozen
 * `measuredBusinessWorth` at the moment of a new-model Contagem
 * confirmation.
 *
 * Deliberately mirrors the EXISTING, unmodified Business Worth Engine
 * formula (`businessWorth = totalMarketValueAllTime -
 * totalExpensesAllTime - totalWithdrawalsAllTime`, AppContext.tsx line
 * ~943) exactly, with `productValuationTotal` (the Contagem's own
 * MEASURED physical count) standing in for `totalMarketValueAllTime`
 * (the batch-ledger's own ESTIMATE) — the entire point of a Contagem
 * being a more accurate, measured figure than the estimate it
 * replaces. `totalExpensesAllTime`/`totalWithdrawalsAllTime` are the
 * SAME all-time cumulative totals this codebase already computes today
 * — passed in here, never independently recomputed, so there is only
 * ever one source of truth for those two figures.
 *
 * `cashPosition`/`receivablesPosition`/`payablesPosition` are accepted
 * as optional, additive terms for forward compatibility with Increment
 * 3 (Cash Ledger/Receivables/Payables) — omitted (not defaulted to 0)
 * when genuinely unavailable, so a caller that has no such data simply
 * does not pass them, rather than this function silently treating an
 * omission as a real zero balance.
 *
 * Quebras need no separate term here: a physical count already
 * reflects any breakage (broken stock isn't there to count), exactly
 * as the existing batch-ledger calculation (calculateBatch's own
 * `remainingQuantity`) already relies on for the identical reason.
 *
 * Pure, deterministic, no Firestore/AppContext dependency — safe to
 * unit test directly.
 */
export function computeMeasuredBusinessWorth(params: {
  productValuationTotal: number;
  totalExpensesAllTime: number;
  totalWithdrawalsAllTime: number;
  cashPosition?: number;
  receivablesPosition?: number;
  payablesPosition?: number;
}): number {
  const {
    productValuationTotal,
    totalExpensesAllTime,
    totalWithdrawalsAllTime,
    cashPosition = 0,
    receivablesPosition = 0,
    payablesPosition = 0,
  } = params;
  return Number(
    (
      productValuationTotal +
      cashPosition +
      receivablesPosition -
      payablesPosition -
      totalExpensesAllTime -
      totalWithdrawalsAllTime
    ).toFixed(2)
  );
}

/**
 * [Initial Stock Valuation History] Current, per-product-aware valuation
 * of the remaining ORIGINAL Initial Stock — distinct from the immutable
 * `initialCapitalValue` (== the confirmed 'initial' StockCount's own
 * frozen `totalValue`, always the original prices, never touched here).
 *
 * For each product on the 'initial' StockCount:
 *   - If it has one or more price-change events, the most recent one
 *     (by effectiveDate, tie-broken by createdAt) is authoritative: that
 *     event's own quantityRemaining × new{Cost,Selling}Price is what's
 *     used — NOT the original item's quantity/price, and NOT summed
 *     across all of a product's events (each new event's quantityRemaining
 *     already represents everything left at that later moment, per this
 *     feature's own quantity semantics — see InitialStockPriceChangeEvent
 *     in types.ts).
 *   - If it has none, the original item's quantity/costPrice/sellingPrice
 *     is used unchanged — this is what makes the function fully backward
 *     compatible: a business with zero price-change events gets back
 *     exactly the original Initial Stock valuation, product by product.
 *
 * Deterministic, side-effect-free, no Firestore/AppContext dependency —
 * safe to unit test directly. Does not read, write, or otherwise
 * participate in initialCapitalValue, businessWorth, capitalGrowth, or
 * expectedCurrentStockValue; wiring this into any of those remains an
 * explicit, separate, not-yet-authorized decision (see
 * docs/specs/README.md's governance note for this feature).
 */
/**
 * [Initial Stock Valuation History — Refinement] The six figures that
 * explain the PRICE-DRIVEN VALUATION DIFFERENCE a single price-change
 * event represents, at that event's own `quantityRemaining`. These are
 * explicitly VALUATION CHANGES, not profit, sales, purchases, expenses,
 * withdrawals, or stock movements — see InitialStockPriceChangeEvent's
 * own header comment in types.ts for why this feature has no
 * inventory-movement ledger. Deliberately NOT fed into
 * calculateInventoryTotals/embeddedProfit, businessWorth, or
 * Initial Capital anywhere in this codebase.
 *
 * Operates on a single event's own fields only (not the full event list
 * or the StockCount) — this makes it equally usable for the CURRENT
 * state (the latest event) and for every HISTORICAL event in a
 * product's audit trail, so the owner can see "what did this specific
 * recorded change explain" for any entry, not only the most recent one.
 */
export interface InitialStockValuationChange {
  costValuationBefore: number;
  costValuationAfter: number;
  costValuationChange: number;
  sellingValuationBefore: number;
  sellingValuationAfter: number;
  sellingValuationChange: number;
}

export function calculateInitialStockValuationChange(event: {
  quantityRemaining: number;
  previousCostPrice: number;
  newCostPrice: number;
  previousSellingPrice: number;
  newSellingPrice: number;
}): InitialStockValuationChange {
  const qty = event.quantityRemaining;
  const costValuationBefore = qty * event.previousCostPrice;
  const costValuationAfter = qty * event.newCostPrice;
  const sellingValuationBefore = qty * event.previousSellingPrice;
  const sellingValuationAfter = qty * event.newSellingPrice;

  return {
    costValuationBefore,
    costValuationAfter,
    costValuationChange: costValuationAfter - costValuationBefore,
    sellingValuationBefore,
    sellingValuationAfter,
    sellingValuationChange: sellingValuationAfter - sellingValuationBefore,
  };
}

export function calculateInitialStockCurrentValuation(
  initialStockCount: StockCount | null,
  priceChangeEvents: InitialStockPriceChangeEvent[]
): {
  totalInvestmentValue: number;
  totalMarketValue: number;
  perProduct: Array<{
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    investmentValue: number;
    marketValue: number;
    hasPriceChange: boolean;
    latestEvent: InitialStockPriceChangeEvent | null;
    // [Refinement] The valuation-change explanation for the CURRENT
    // state, derived from `latestEvent` alone (see
    // calculateInitialStockValuationChange above). null when the
    // product has no price-change event — there is nothing to explain.
    valuationChange: InitialStockValuationChange | null;
  }>;
} {
  if (!initialStockCount) {
    return { totalInvestmentValue: 0, totalMarketValue: 0, perProduct: [] };
  }

  // Group events by productId, then resolve the single most-recent one
  // per product once, rather than re-scanning the full event list per item.
  const eventsByProduct = new Map<string, InitialStockPriceChangeEvent[]>();
  for (const ev of priceChangeEvents) {
    const list = eventsByProduct.get(ev.productId);
    if (list) list.push(ev);
    else eventsByProduct.set(ev.productId, [ev]);
  }

  const mostRecent = (events: InitialStockPriceChangeEvent[]): InitialStockPriceChangeEvent =>
    events.reduce((latest, ev) => {
      const latestDate = new Date(latest.effectiveDate).getTime();
      const evDate = new Date(ev.effectiveDate).getTime();
      if (evDate !== latestDate) return evDate > latestDate ? ev : latest;
      // Same effectiveDate — tie-break on createdAt (later write wins).
      return new Date(ev.createdAt).getTime() > new Date(latest.createdAt).getTime() ? ev : latest;
    });

  let totalInvestmentValue = 0;
  let totalMarketValue = 0;
  const perProduct: Array<{
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    investmentValue: number;
    marketValue: number;
    hasPriceChange: boolean;
    latestEvent: InitialStockPriceChangeEvent | null;
    valuationChange: InitialStockValuationChange | null;
  }> = [];

  for (const item of initialStockCount.items) {
    const productEvents = eventsByProduct.get(item.productId);
    const latestEvent = productEvents && productEvents.length > 0 ? mostRecent(productEvents) : null;

    const quantity = latestEvent ? latestEvent.quantityRemaining : item.quantity;
    const costPrice = latestEvent ? latestEvent.newCostPrice : item.costPrice;
    const sellingPrice = latestEvent ? latestEvent.newSellingPrice : (item.sellingPrice ?? 0);

    const investmentValue = quantity * costPrice;
    const marketValue = quantity * sellingPrice;

    totalInvestmentValue += investmentValue;
    totalMarketValue += marketValue;

    perProduct.push({
      productId: item.productId,
      productName: item.productName,
      quantity,
      costPrice,
      sellingPrice,
      investmentValue,
      marketValue,
      hasPriceChange: !!latestEvent,
      latestEvent,
      valuationChange: latestEvent ? calculateInitialStockValuationChange(latestEvent) : null,
    });
  }

  return { totalInvestmentValue, totalMarketValue, perProduct };
}

/**
 * Checks if adding a new quebra quantity will cause total losses to exceed batch's initial stock.
 */
export function isQuebraExceedingWarning(batch: StockBatch, existingQuebras: Quebra[], newQuantity: number): boolean {
  const batchQuebras = existingQuebras.filter(q => q.batchId === batch.id);
  const currentLoss = batchQuebras.reduce((sum, q) => sum + Number(q.quantityLost || 0), 0);
  return (currentLoss + Number(newQuantity || 0)) > batch.quantity;
}

/**
 * Helper to check if date string YYYY-MM-DD falls within [start, end] inclusive.
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  // Standard string comparison YYYY-MM-DD works natively!
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/**
 * Generates custom date range reports per product and overall business
 * Embedded Profit. Nothing here implies a sale occurred.
 */
export function generateReportSummary(
  startDate: string,
  endDate: string,
  products: Product[],
  batches: StockBatch[],
  quebras: Quebra[],
  expenses: Expense[],
  withdrawals: Withdrawal[] = []
): ReportSummary {
  // Filter batches in range
  const batchesInRange = batches.filter(b => isDateInRange(b.dateEntered, startDate, endDate));

  // Filter quebras in range
  const quebrasInRange = quebras.filter(q => isDateInRange(q.date, startDate, endDate));

  // Filter expenses in range
  const expensesInRange = expenses.filter(e => isDateInRange(e.date, startDate, endDate));

  // Filter withdrawals in range
  const withdrawalsInRange = withdrawals.filter(w => isDateInRange(w.date, startDate, endDate));

  // Grouped once for the whole report, not re-filtered per batch/product.
  const allQuebrasByBatch = groupQuebrasByBatch(quebras);

  const productDetails: ProductReportDetail[] = products.map(product => {
    const productBatchesInRange = batchesInRange.filter(b => b.productId === product.id);
    const productQuebrasInRange = quebrasInRange.filter(q => q.productId === product.id);

    let totalQuantityEntered = 0;
    let totalInvestmentValue = 0;
    let totalMarketValue = 0;
    let finalizedEmbeddedProfit = 0;
    let estimatedEmbeddedProfit = 0;

    productBatchesInRange.forEach(batch => {
      // Find all quebras for this batch (not just ones in range — a batch's
      // remaining quantity depends on every quebra ever logged against it).
      const batchQuebras = allQuebrasByBatch.get(batch.id) ?? [];
      const calc = calculateBatch(batch, batchQuebras);

      totalQuantityEntered += batch.quantity;
      totalInvestmentValue += calc.investmentValue;
      totalMarketValue += calc.marketValue;

      if (batch.status === 'closed') {
        finalizedEmbeddedProfit += calc.embeddedProfit;
      } else {
        estimatedEmbeddedProfit += calc.embeddedProfit;
      }
    });

    // Detail each quebra for this product in range
    const quebrasDetailed = productQuebrasInRange.map(q => {
      const linkedBatch = batches.find(b => b.id === q.batchId);
      const batchCostPrice = linkedBatch ? linkedBatch.costPrice : 0;
      return {
        quebra: q,
        batchCostPrice,
        value: q.quantityLost * batchCostPrice,
      };
    });

    const totalQuebraQuantity = quebrasDetailed.reduce((sum, item) => sum + item.quebra.quantityLost, 0);
    const totalQuebraValue = quebrasDetailed.reduce((sum, item) => sum + item.value, 0);

    const productEmbeddedProfit = totalMarketValue - totalInvestmentValue;

    return {
      product,
      quantityEntered: totalQuantityEntered,
      totalInvestmentValue,
      quebras: quebrasDetailed,
      totalQuebraQuantity,
      totalQuebraValue,
      totalMarketValue,
      productEmbeddedProfit,
      finalizedEmbeddedProfit,
      estimatedEmbeddedProfit,
    };
  });

  // [V-4 Report Data Semantic Correction] productDetails represents products
  // with activity inside the selected period — nothing more. An empty
  // activity period returns an empty collection, not a fallback to the full
  // product list. Scalar totals below are intentionally still summed from
  // the full, unfiltered `productDetails` (inactive products always
  // contribute 0), so this filter only affects the returned list, never the
  // totals.
  const activeProductDetails = productDetails.filter(p =>
    p.quantityEntered > 0 || p.quebras.length > 0
  );

  const totalEmbeddedProfit = productDetails.reduce((sum, p) => sum + p.productEmbeddedProfit, 0);
  const totalExpenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalWithdrawals = withdrawalsInRange.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  return {
    startDate,
    endDate,
    productDetails: activeProductDetails,
    totalEmbeddedProfit,
    totalExpenses,
    totalWithdrawals,
    expensesList: expensesInRange,
  };
}
