import { StockBatch, Quebra, BatchCalculation, Product, ProductReportDetail, Expense, ReportSummary, Withdrawal, StockCount, InitialStockPriceChangeEvent, InitialStockRecoveryAuthorization, BusinessWorthSnapshot, Payable, CashLedgerEntry, Receivable, BusinessWorthSnapshotProductValuationLine, StartupInvestmentEntry } from '../types';

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
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §7/§9, FR-14, FR-15; Implementation Plan §7's own
  // "±Receivables/Payables/Cash position changes" clarification] Optional
  // and additive — genuinely new sources with no existing representation
  // before this increment, following the exact same "omit, don't
  // fabricate a zero-that-means-something-real" discipline this function
  // already used for them in Increment 1/2 (see this function's own
  // pre-Increment-3 doc comment, preserved below). Defaulting to `[]`
  // when omitted is safe and NOT the same "fabricated zero" concern that
  // discipline warns against, because an empty array is the true,
  // accurate state of "no Payables/CashLedgerEntries exist for this
  // business yet" — unlike a numeric 0 standing in for "this term simply
  // isn't computed," which is what that discipline actually forbids.
  payables?: Payable[];
  cashLedgerEntries?: CashLedgerEntry[];
  asOfDate?: string;
}): number | 'UNKNOWN' {
  const { snapshots, batches, quebras, expenses, withdrawals } = params;
  const payables = params.payables ?? [];
  const cashLedgerEntries = params.cashLedgerEntries ?? [];
  const asOfDate = params.asOfDate ?? new Date().toISOString().slice(0, 10);
  const asOfMillis = new Date(`${asOfDate}T23:59:59.999Z`).getTime();

  if (!snapshots || snapshots.length === 0) return 'UNKNOWN';

  const active = snapshots.filter((s) => s.status === 'active');
  if (active.length === 0) return 'UNKNOWN';

  const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];

  return computeCaseALiveBusinessWorth({ latest, batches, quebras, expenses, withdrawals, payables, cashLedgerEntries, asOfMillis });
}

/**
 * [Business Worth Evolution — Implementation Authorization, Increment 2;
 * Specification §9 Case A, §41.4] Extracted, unchanged in behavior, from
 * `getCurrentBusinessWorth`'s own previous inline body — the exact same
 * "Case A" arithmetic, now shared so `getEstimatedBusinessWorth` (below)
 * can call the identical calculation for a business that already has an
 * active `BusinessWorthSnapshot`, per §41.4's own note: "Current" and
 * "Estimated" are two names for the same formula, never two competing
 * ones. `getCurrentBusinessWorth`'s own external behavior (including its
 * 'UNKNOWN' handling) is completely unchanged by this extraction.
 *
 * [Extended, Increment 3 — Specification §7/§9's "±Receivables/Payables/
 * Cash position changes" term, Implementation Plan §7's own mechanical
 * clarification of it] Per Plan §7, this term is NEVER "the ledger-
 * derived cash balance minus the snapshot's own cash figure" — that
 * would re-subtract Expenses/Levantamentos a second time, since those
 * already have their own linked CashLedgerEntry categories AND their own
 * separate `expensesSinceSnapshot`/`levantamentosSinceSnapshot` terms
 * above. Per Plan §7's own three-part breakdown, this term is instead
 * built from exactly:
 *
 * (1) Receivables: NO separate "outstanding balance" term at all. An
 *     unpaid Receivable contributes nothing (FIN-3) and never did, so
 *     there is nothing to track here — a receivable's entire effect on
 *     Business Worth flows through (3) below, its own linked
 *     `customer-payment` CashLedgerEntry, the moment a payment is
 *     actually received. (Plan §7's own "cash increases by the paid
 *     amount, the receivable decreases by the same amount, net zero"
 *     language describes exactly why NOT adding a second, symmetric
 *     receivable-balance term here is correct — adding one would cancel
 *     out the genuine, positive `customer-payment` effect (3) already
 *     provides, wrongly returning FIN-3's "unpaid = zero" rule to every
 *     receivable, paid or not.)
 * (2) Payables: an outstanding Payable DOES reduce Business Worth the
 *     moment it's recorded (FIN-4) — unlike a Receivable, a Payable has
 *     no linked CashLedgerEntry at the moment it's created (no cash
 *     moves yet), so its own effect can ONLY be captured by tracking its
 *     outstanding-balance CHANGE since the snapshot: an increase (a new
 *     supplier-credit purchase) reduces this term; a later decrease (a
 *     PayablePayment settling it) increases this term back — exactly
 *     offsetting that same payment's own `supplier-payment` outflow in
 *     (3), so the payment itself nets to zero change overall (FIN-5,
 *     "settles, never doubly reduces").
 * (3) Any other governed CashLedgerEntry this Plan's categories actually
 *     produce, restricted to `customer-payment` (inflow, adds) and
 *     `supplier-payment` (outflow, subtracts) — `expense`/`levantamento`
 *     categories are deliberately EXCLUDED here, since those two are
 *     already fully captured by this function's own pre-existing
 *     `expensesSinceSnapshot`/`levantamentosSinceSnapshot` terms above;
 *     including them again here would double-subtract them (the
 *     Test Requirements' own Examples D/E, and the explicit
 *     "no duplicate stock-purchase cash subtraction" requirement).
 *
 * A cash-financed `+Stock` purchase touches NONE of (1)/(2)/(3) — it
 * produces no CashLedgerEntry and no Payable/Receivable — so this whole
 * term is entirely unaffected by it, exactly as the worked example
 * (500,000 + 5,000 embedded profit = 505,000, never 480,000/530,000)
 * requires.
 */
function computeCaseALiveBusinessWorth(params: {
  latest: BusinessWorthSnapshot;
  batches: StockBatch[];
  quebras: Quebra[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  payables: Payable[];
  cashLedgerEntries: CashLedgerEntry[];
  asOfMillis: number;
}): number {
  const { latest, batches, quebras, expenses, withdrawals, payables, cashLedgerEntries, asOfMillis } = params;
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

  // [Increment 3] (2) Payables outstanding-balance CHANGE since the
  // snapshot — see this function's own doc comment above.
  const currentPayablesOutstanding = payables.reduce((sum, p) => sum + Number(p.amountRemaining || 0), 0);
  const payablesOutstandingAtSnapshot = latest.payablesPosition ?? 0;
  const payablesPositionChange = Number((payablesOutstandingAtSnapshot - currentPayablesOutstanding).toFixed(2));

  // [Increment 3] (3) customer-payment/supplier-payment CashLedgerEntry
  // net, since the snapshot — see this function's own doc comment above
  // for why `expense`/`levantamento` categories are excluded here.
  const cashLedgerNetSinceSnapshot = Number(
    cashLedgerEntries
      .filter((e) => isPostSnapshotActivity(e.createdAt) && (e.category === 'customer-payment' || e.category === 'supplier-payment'))
      .reduce((sum, e) => sum + (e.direction === 'inflow' ? Number(e.amount || 0) : -Number(e.amount || 0)), 0)
      .toFixed(2)
  );

  const financialPositionChangeSinceSnapshot = Number((payablesPositionChange + cashLedgerNetSinceSnapshot).toFixed(2));

  return Number(
    (
      latest.measuredBusinessWorth +
      embeddedProfitSinceSnapshot -
      expensesSinceSnapshot -
      levantamentosSinceSnapshot +
      financialPositionChangeSinceSnapshot
    ).toFixed(2)
  );
}

/**
 * [Business Worth Evolution — Implementation Authorization, Increment 2;
 * Specification §9, §6 State 1a, §41.4; Implementation Plan §7; source
 * BDR Decisions 7, 25]
 *
 * THE SAME SHARED CALCULATION, READ UNDER ITS "ESTIMATED" NAME.
 *
 * Per the accepted §41 amendment, "Current Business Worth" and
 * "Estimated Business Worth Case A" are the exact same formula — this
 * function's own Case A branch below calls the identical
 * `computeCaseALiveBusinessWorth` helper `getCurrentBusinessWorth` uses,
 * never a second, independently-maintained calculation. What this
 * function ADDS, that `getCurrentBusinessWorth` deliberately does not
 * have (FR-1: Current Business Worth must never be presented before a
 * business's first confirmed new-model Contagem), is Case B: a business
 * with no `BusinessWorthSnapshot` yet, but a preserved historical
 * Capital Inicial (State 1a) — Estimated Business Worth exists for such
 * a business today, per FR-50, without requiring a new Contagem first.
 *
 * Case B formula (Specification §9): `Historical Capital Inicial +
 * embedded profits since the applicable baseline − Expenses −
 * Breakages − Levantamentos`. Reads only `resolveInitialCapitalValue`
 * (existing, unchanged) plus the same already-shipped
 * `calculateInventoryTotals` this codebase's Case A branch already
 * uses — no new collection, no fabricated Cash/Receivables/Payables
 * term (those remain Increment 3 only, and Case B's own formula shape
 * in the Specification has no such term to begin with).
 *
 * [Basis-aware baseline, implementation-level resolution of "embedded
 * profits since the applicable baseline" — not a new business rule, an
 * implementation mapping of the Specification's own formula onto this
 * codebase's existing dual-valuation-basis fields] `initialCapitalValue`
 * (via `resolveInitialCapitalValue`, unchanged) resolves to EITHER the
 * initial StockCount's cost total OR its selling total, depending on
 * the Owner's own `initialCapitalBasis` choice (Initial Stock
 * Dual-Valuation-Basis feature, pre-existing, unmodified). Which one was
 * chosen determines whether the initial goods' own built-in margin
 * (selling total − cost total, frozen at the same confirmation moment)
 * is already folded into Capital Inicial or not:
 *   - basis === 'cost': Capital Inicial carries NO margin yet — the
 *     initial goods' own current embedded profit is genuinely new
 *     information to add, exactly like every other batch's.
 *   - basis === 'selling': Capital Inicial already IS the initial
 *     goods' own market value (cost + margin) — adding that same
 *     margin again via the embedded-profit term would double-count it,
 *     the exact "never add a stock purchase's full cost twice" family
 *     of error FR-9 forbids for Case A, applied here to Case B's own
 *     baseline instead of a snapshot.
 * Both bases converge on the identical total (the initial goods' full
 * market value) when nothing else has happened yet — verified as an
 * invariant, not asserted by convention alone.
 *
 * Quebras: no separate term, for the identical reason
 * `computeCaseALiveBusinessWorth` already documents — a physical loss
 * is already absent from what remains to be valued.
 *
 * Expenses/Levantamentos: subtracted ALL-TIME (never date-filtered),
 * unlike Case A's own "since the snapshot" window — Case B's baseline
 * (Capital Inicial) has never had any Expense/Levantamento deducted
 * from it before, so nothing is "already accounted for" the way a
 * snapshot's own frozen `measuredBusinessWorth` already accounts for
 * every Expense/Levantamento that existed at confirmation time.
 *
 * Returns 'UNKNOWN' — never a fabricated Estimated figure — for a
 * genuinely new business with no preserved historical Capital Inicial
 * and no `BusinessWorthSnapshot` either (Specification §6 State 1,
 * I-1). Exactly one of {'UNKNOWN', Case B value, Case A value} is ever
 * returned — never a third, blended outcome.
 */
export function getEstimatedBusinessWorth(params: {
  snapshots: BusinessWorthSnapshot[] | null | undefined;
  initialStockCount: StockCount | null | undefined;
  batches: StockBatch[];
  quebras: Quebra[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  // [Business Worth Evolution — Implementation Authorization, Increment 3]
  // See getCurrentBusinessWorth's own identical parameters for the full
  // rationale — optional/additive, defaulting to `[]`.
  payables?: Payable[];
  cashLedgerEntries?: CashLedgerEntry[];
  asOfDate?: string;
}): number | 'UNKNOWN' {
  const { snapshots, initialStockCount, batches, quebras, expenses, withdrawals } = params;
  const payables = params.payables ?? [];
  const cashLedgerEntries = params.cashLedgerEntries ?? [];
  const asOfDate = params.asOfDate ?? new Date().toISOString().slice(0, 10);
  const asOfMillis = new Date(`${asOfDate}T23:59:59.999Z`).getTime();

  const active = (snapshots ?? []).filter((s) => s.status === 'active');
  if (active.length > 0) {
    // Case A — a BusinessWorthSnapshot already exists. Same calculation
    // as getCurrentBusinessWorth, per §41.4 — this function's own
    // "Estimated" name applies only in the sense that a caller reading
    // this function's output as of a date other than "right now" (Fecho,
    // a later increment) would call it Estimated; the arithmetic itself
    // never differs from Current.
    const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];
    return computeCaseALiveBusinessWorth({ latest, batches, quebras, expenses, withdrawals, payables, cashLedgerEntries, asOfMillis });
  }

  // Case B — State 1a: existing business, preserved historical Capital
  // Inicial, no BusinessWorthSnapshot yet.
  if (!initialStockCount) {
    // No baseline at all — a genuinely new business, State 1, UNKNOWN
    // (Specification §6, I-1). Never a fabricated Estimated figure.
    return 'UNKNOWN';
  }

  const initialCapitalValue = resolveInitialCapitalValue(initialStockCount);
  const basis: 'cost' | 'selling' = initialStockCount.initialCapitalBasis === 'selling' ? 'selling' : 'cost';
  const initialCostTotal = initialStockCount.totalValue || 0;
  const initialSellingTotalRaw = initialStockCount.totalSellingValue;
  const initialSellingTotal =
    typeof initialSellingTotalRaw === 'number' && Number.isFinite(initialSellingTotalRaw)
      ? initialSellingTotalRaw
      : initialCostTotal;
  // See this function's own doc comment above for why this term is 0 for
  // a 'cost'-basis Capital Inicial and the initial goods' own frozen
  // margin for a 'selling'-basis one.
  const initialMarginAlreadyIncludedInBaseline = basis === 'selling' ? initialSellingTotal - initialCostTotal : 0;

  const currentEmbeddedProfitTotal = calculateInventoryTotals(
    batches.filter((b) => b.status === 'open'),
    quebras
  ).totalEmbeddedProfit;
  const embeddedProfitSinceBaseline = Number(
    (currentEmbeddedProfitTotal - initialMarginAlreadyIncludedInBaseline).toFixed(2)
  );

  const totalExpensesAllTime = Number(
    expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)
  );
  const totalWithdrawalsAllTime = Number(
    withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0).toFixed(2)
  );

  // [Increment 3] Case B has no snapshot baseline to measure a delta
  // against at all — its baseline (Capital Inicial) predates the Cash
  // Ledger/Payables collections entirely, exactly mirroring the
  // Expenses/Levantamentos treatment immediately above: subtracted/added
  // ALL-TIME, never "since" a boundary that doesn't exist for this case.
  const totalPayablesOutstanding = Number(
    payables.reduce((sum, p) => sum + Number(p.amountRemaining || 0), 0).toFixed(2)
  );
  const cashLedgerNetAllTime = Number(
    cashLedgerEntries
      .filter((e) => e.category === 'customer-payment' || e.category === 'supplier-payment')
      .reduce((sum, e) => sum + (e.direction === 'inflow' ? Number(e.amount || 0) : -Number(e.amount || 0)), 0)
      .toFixed(2)
  );
  const financialPositionEffect = Number((cashLedgerNetAllTime - totalPayablesOutstanding).toFixed(2));

  return Number(
    (
      initialCapitalValue +
      embeddedProfitSinceBaseline -
      totalExpensesAllTime -
      totalWithdrawalsAllTime +
      financialPositionEffect
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
/**
 * [Business Worth Evolution — Implementation Authorization, Increment 3]
 * Pure sum of every currently-outstanding (unpaid or partially-paid)
 * Payable's `amountRemaining` for a business — the exact figure this
 * capability's snapshot-creation path freezes as `BusinessWorthSnapshot.
 * payablesPosition` (a real, meaningful subtraction at snapshot-creation
 * time — a fresh physical count already includes credit-financed stock
 * at full value, so the outstanding debt against it must be subtracted
 * to reflect true net worth, Specification §12 FIN-4) and the exact
 * figure the live calculation above compares against to detect a
 * Payable's own outstanding-balance CHANGE since that snapshot.
 */
export function sumOutstandingPayables(payables: Payable[]): number {
  return Number(payables.reduce((sum, p) => sum + Number(p.amountRemaining || 0), 0).toFixed(2));
}

/**
 * [Business Worth Evolution — Implementation Authorization, Increment 3]
 * Pure sum of every currently-outstanding (unpaid or partially-paid)
 * Receivable's `amountRemaining` for a business — INFORMATIONAL/drill-
 * down only (frozen onto `BusinessWorthSnapshot.receivablesPosition` for
 * audit/history display), NEVER fed into `computeMeasuredBusinessWorth`'s
 * own arithmetic — an unpaid Receivable contributes nothing to Business
 * Worth (Specification §11 FIN-3), so passing this sum into that
 * function's additive `receivablesPosition` parameter would wrongly add
 * it. See `computeMeasuredBusinessWorth`'s own doc comment.
 */
export function sumOutstandingReceivables(receivables: Receivable[]): number {
  return Number(receivables.reduce((sum, r) => sum + Number(r.amountRemaining || 0), 0).toFixed(2));
}

/**
 * [Business Worth Evolution — Finding 3 correction, Product Architect
 * Decision: Option A (accepted).] Builds a `BusinessWorthSnapshot`'s
 * frozen `productValuationDetail` lines from the confirming Contagem's
 * own items.
 *
 * `totalValue` on each line MUST be the same selling-basis figure the
 * snapshot's own `productValuationTotal` is built from (quantity *
 * sellingPrice — see `normalizeStockCountItems`'s own
 * `totalSellingValue`, `stockCount.ts`), not the item's cost-basis
 * `totalValue` (quantity * costPrice, the investment basis used
 * elsewhere for Expected Current Stock Value). Before this correction,
 * this line's `totalValue` was a pass-through of the item's cost-basis
 * total, which could never sum to `productValuationTotal` whenever
 * `costPrice` differed from `sellingPrice` — the drill-down did not
 * mathematically reconcile with its own parent total. `costPrice` is
 * still carried on the line unchanged, for consumers that need it
 * independently — only the meaning of `totalValue` changes.
 *
 * Pure, deterministic, no Firestore/AppContext dependency — safe to
 * unit test directly.
 */
export function buildProductValuationDetail(
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit?: string;
    costPrice: number;
    // Optional to match StockCountItem's own field (a Stock Count
    // confirmed before the Dual-Valuation-Basis feature may genuinely
    // lack it) — coerced to 0 with the same `Number(x) || 0` rule
    // normalizeStockCountItems already applies, never left as
    // undefined/NaN.
    sellingPrice?: number;
    valuationMode?: 'A' | 'B';
  }>
): BusinessWorthSnapshotProductValuationLine[] {
  return items.map((item) => {
    const sellingPrice = Number(item.sellingPrice) || 0;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      ...(item.unit ? { unit: item.unit } : {}),
      costPrice: item.costPrice,
      sellingPrice,
      totalValue: Number((item.quantity * sellingPrice).toFixed(2)),
      ...(item.valuationMode ? { valuationMode: item.valuationMode } : {}),
    };
  });
}

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

// ============================================================
// BUSINESS WORTH EVOLUTION — INCREMENT 5
// Startup Investment (Specification §13; Plan §3.5; Rule 8 Finding 6-A).
// Two pure functions, deliberately separate from every Current/Estimated
// Business Worth function above (getCurrentBusinessWorth,
// getEstimatedBusinessWorth, computeMeasuredBusinessWorth): Startup
// Investment is its own independent measurement, never merged into or
// netted against Business Worth (FR-52) — see §"Business Worth boundary"
// below. Neither function reads a BusinessWorthSnapshot, nor is called
// from any Business Worth function — the isolation is structural, not
// merely a documented intent.
// ============================================================

/**
 * [Specification §13, FR-16; Rule 8 Finding 6-A] Resolves the Startup
 * Investment date window's end boundary — never its own new business
 * decision, purely "which of two already-decided dates applies to this
 * business's own case":
 *
 * - **Genuinely new business** (this business's own `initial` StockCount
 *   already carries `producesBusinessWorthSnapshot: true` — i.e. its own
 *   Initial Stock/Capital Inicial confirmation IS this model's first
 *   Contagem confirmation, State 2 directly): window ends at that same
 *   confirmation's own timestamp (`firstContagemConfirmedAt`).
 * - **Existing business already in State 1a or beyond** (its `initial`
 *   StockCount predates this capability, so it does NOT carry the
 *   marker): window ends at `historicalCapitalInicialDate`, resolved per
 *   Rule 8 Finding 6-A to that same `initial` StockCount's own
 *   `createdAt` — never `confirmedAt` (frequently absent on legacy
 *   records) and never a future new-model Contagem's date, exactly per
 *   FR-16's own "never using firstContagemConfirmedAt... for an existing
 *   business already in State 1a" rule.
 *
 * Returns `null` when no `initial` StockCount exists yet at all — there is
 * no baseline to anchor a window to, so nothing is reported (never a
 * fabricated zero-width or all-time window).
 */
export function resolveStartupInvestmentWindow(params: {
  businessCreatedAt: string;
  initialStockCount: StockCount | null | undefined;
}): { startDate: string; endDate: string } | null {
  const { businessCreatedAt, initialStockCount } = params;
  if (!initialStockCount) return null;

  const isGenuinelyNewBusiness = initialStockCount.producesBusinessWorthSnapshot === true;

  const endDate = isGenuinelyNewBusiness
    ? (initialStockCount.confirmedAt ? new Date(toMillis(initialStockCount.confirmedAt)).toISOString() : initialStockCount.createdAt)
    : initialStockCount.createdAt; // Rule 8 Finding 6-A — createdAt, never confirmedAt

  return { startDate: businessCreatedAt, endDate };
}

/**
 * [Specification §18, FR-25; Rule 8 Finding 8-A, 8-B; Plan §9] Resolves
 * Fecho's own start date — never an independently Owner-chosen date.
 * Per §9's "exactly one baseline, the latest, is ever active" rule, Fecho's
 * start is always the active baseline:
 *
 * - **A `BusinessWorthSnapshot` already exists** (Case A, State ≥2): the
 *   latest active snapshot's own `confirmedAt` — the exact same "latest
 *   active snapshot" selection `getEstimatedBusinessWorth`/
 *   `getCurrentBusinessWorth` already use, so Fecho's own boundary can
 *   never disagree with either of those functions about which baseline is
 *   active.
 * - **No snapshot yet, State 1a** (Case B): the same historical Capital
 *   Inicial baseline date `resolveStartupInvestmentWindow` already
 *   resolves for the same business (Rule 8 Finding 6-A — the `initial`
 *   StockCount's own `createdAt`, never `confirmedAt`) — reused here
 *   rather than re-derived, so both this function and Startup Investment
 *   anchor to the identical date for a business in this state.
 *
 * Returns `null` when neither a snapshot nor an `initial` StockCount
 * exists — there is no baseline to anchor Fecho to yet (genuinely new
 * business, State 1, UNKNOWN), never a fabricated date.
 */
export function resolveActiveBusinessWorthBaselineDate(params: {
  snapshots: BusinessWorthSnapshot[] | null | undefined;
  initialStockCount: StockCount | null | undefined;
}): string | null {
  const { snapshots, initialStockCount } = params;

  const active = (snapshots ?? []).filter((s) => s.status === 'active');
  if (active.length > 0) {
    const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];
    return new Date(toMillis(latest.confirmedAt)).toISOString().slice(0, 10);
  }

  if (!initialStockCount) return null;

  // Rule 8 Finding 6-A — createdAt, never confirmedAt (frequently absent
  // on legacy records); the same resolution resolveStartupInvestmentWindow
  // already applies for the identical business/state.
  return initialStockCount.createdAt.slice(0, 10);
}

/**
 * [Specification §13, FR-16, FR-17; Plan §3.5] The report-time Startup
 * Investment aggregation itself — `businesses/{id}/startupInvestmentEntries`
 * documents are never the whole figure on their own. Never re-records a
 * PurchaseBatch/Expense amount into a new transaction (FR-16) — this
 * function only reads the existing `StockBatch`/`Expense` collections
 * already maintained by +Stock and Add Expense, scoped to the resolved
 * window, exactly the same "aggregate and format, never duplicate"
 * discipline `generateReportSummary` (above) already applies to its own
 * Fecho range.
 *
 * Deliberately returns three separate sub-totals plus their sum, and
 * NOTHING resembling a "shortfall," "loss," or "performance" figure
 * relative to Business Worth (FR-52) — no Business Worth value is even a
 * parameter to this function, so there is nothing here to net against it.
 */
export function computeStartupInvestmentTotal(params: {
  window: { startDate: string; endDate: string } | null;
  batches: StockBatch[];
  expenses: Expense[];
  entries: StartupInvestmentEntry[];
}): {
  referencedPurchasesTotal: number;
  referencedExpensesTotal: number;
  entriesTotal: number;
  total: number;
} {
  const { window, batches, expenses, entries } = params;

  // FR-17: entries are never window-gated — every StartupInvestmentEntry
  // ever recorded for this business is its own residual-category record,
  // regardless of when it was recorded relative to the referenced-record
  // window below (that window governs ONLY the referenced PurchaseBatch/
  // Expense aggregation, per FR-16).
  const entriesTotal = Number(
    entries.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)
  );

  if (!window) {
    return { referencedPurchasesTotal: 0, referencedExpensesTotal: 0, entriesTotal, total: entriesTotal };
  }

  const startMs = new Date(window.startDate).getTime();
  const endMs = new Date(window.endDate).getTime();
  const inWindow = (dateStr: string | undefined) => {
    if (!dateStr) return false;
    const ms = new Date(dateStr).getTime();
    return ms >= startMs && ms < endMs;
  };

  // Investment/purchase spending: only batches linked to a PurchaseBatch
  // (purchaseBatchId present) represent an actual investment/purchase
  // event — mirrors the same distinction `04-purchase-batches.md`'s own
  // aggregation already relies on.
  const referencedPurchasesTotal = Number(
    batches
      .filter((b) => b.purchaseBatchId && inWindow(b.dateEntered))
      .reduce((sum, b) => sum + Number(b.quantity || 0) * Number(b.costPrice || 0), 0)
      .toFixed(2)
  );

  const referencedExpensesTotal = Number(
    expenses
      .filter((e) => inWindow(e.date))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      .toFixed(2)
  );

  const total = Number((referencedPurchasesTotal + referencedExpensesTotal + entriesTotal).toFixed(2));

  return { referencedPurchasesTotal, referencedExpensesTotal, entriesTotal, total };
}
