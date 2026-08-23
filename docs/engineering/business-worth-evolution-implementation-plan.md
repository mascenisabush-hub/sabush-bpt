# Implementation Plan — Business Worth Evolution & Measurement Model

**Status:** DRAFT. This is a plan document only — no code, `firestore.rules`, `firestore.indexes.json`, or test file is written or modified here. **Implementation is NOT authorized by this document.**
**Amendment Status (this pass): ✅ ACCEPTED (22 August 2026).** Following the Specification's own §41 amendment (Accepted 22 August 2026) and the matching Rule 8 reconciliation (also Accepted), this Plan's §6, §7, §24, and §25 were corrected: Increment 1 now delivers the minimum live Current Business Worth foundation (the shared Current/Estimated calculation function, using existing sources only), per explicit Product Architect direction — not merely the previous "latest snapshot lookup." **No other increment moves earlier; Increments 2–9 remain separately sequenced, in substance unchanged.** This reconciliation pass is now formally accepted:

> I have reviewed the §41 reconciliation corrections to this Implementation Plan (§6's redesign; §7's retitling and worked-example correction; §24's revised Increment 1 boundary; §25's updated traceability rows). I confirm they introduce no new business decision, formula, ceiling, or storage mechanism, correctly preserve Increments 2–9's separate sequencing, and accurately implement the accepted Specification's §41 meaning. This reconciliation is **ACCEPTED and APPROVED**.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 22 August 2026
**Governing chain:** [`BDR-pending-business-worth-evolution-measurement-model.md`](../specs/BDR-pending-business-worth-evolution-measurement-model.md) (✅ Business Decision phase complete, 35 decisions) → [`POL-0010`](../specs/POL-pending-business-worth-evolution-policy.md) (✅ Drafted, numbered, traces all 35 decisions) → [Consolidated Specification](../specs/business-worth-evolution-specification.md) (✅ **Accepted**, SABUSHIMIKE Masceni, 22 August 2026, including the §41 terminology-correction amendment, also Accepted) → [Rule 8 Assessment](./business-worth-evolution-rule8-assessment.md) (✅ **READY FOR IMPLEMENTATION**, both blockers resolved by explicit Product Architect decision, re-confirmed after the §41 reconciliation). This Plan introduces no new business decision beyond what those four documents already settled — every item below cites the specific BDR Decision / POL-0010 Rule / Specification FR / Rule 8 Finding it implements.
**Method:** Every design choice below either (a) directly implements a named FR/Finding, or (b) is an implementation-detail choice within Rule 8's own resolved direction (exact field/route/collection names, all explicitly still illustrative per the Specification's own §3/§37 out-of-scope list) — never a new business judgment. §25 re-verifies this traceability explicitly. Every file/line reference below was re-confirmed by direct inspection of the current repository state (`firestore.rules`, `apps/tenant/src/types.ts`, `apps/tenant/src/context/AppContext.tsx`, `server/notificationPlatform.ts`, `server/closingNotificationProducer.ts`) immediately before drafting — not recalled from the Rule 8 Assessment's own text alone.

---

## 1. Purpose

Converts the Rule 8 Assessment's Findings (§3, all 15 dimensions) and Decision Table (§5), together with the Specification's 60 Functional Requirements and 7 Invariants, into a concrete map of exactly which files would change, what each change is, and how each change traces back through the Specification to POL-0010 and the source BDR. Commits no code, no `firestore.rules` text, no index, no test.

## 2. Scope and Sequencing Principle

Per the source BDR §10 and Decision 35: this is **one umbrella capability**, gated by **one** signed Implementation Authorization following this Plan — not a separate governance chain per feature. Within that one Authorization, implementation proceeds **feature-by-feature, in controlled increments** (§24, below, proposes the increment order). This Plan is the single map for the whole capability; it is not itself divided into per-increment sub-plans, matching how this Specification is one consolidated document rather than several.

## 3. New Collections — Data Model (implements §8, §10–§13, §26 of the Specification)

All new collections are tenant-scoped at `businesses/{businessId}/...`, matching the existing `isMemberOf`/`isOwnerOf` pattern uniformly used by every collection inspected (`suppliers`, `purchaseBatches`, `stockCounts`, `stockCountDrafts`, `closings`, `initialStockRecoveryAuthorization` — Rule 8 Finding 10-A). Field names below are exactly the Specification's own illustrative names (§8, §10–§13); finalizing them remains an implementation-time, not business, decision (Specification §3, §37).

| Collection | Purpose | Spec §/FR | Rule 8 Finding |
|---|---|---|---|
| `businesses/{businessId}/businessWorthSnapshots/{snapshotId}` | Frozen Business Worth measurement result per confirmed new-model Contagem | §8, FR-5–FR-7, I-2, I-3 | 2-A |
| `businesses/{businessId}/cashLedgerEntries/{entryId}` | Append-only cash inflow/outflow ledger | §10, FR-10, FR-11, FR-55, I-4 | (Current State Assessment) |
| `businesses/{businessId}/receivables/{receivableId}` + `.../receivablePayments/{paymentId}` | Customer amounts owed to the business, and their payment events | §11, FR-12, FR-13, I-5 | Gap Analysis |
| `businesses/{businessId}/payables/{payableId}` + `.../payablePayments/{paymentId}` | Supplier liabilities and their payment events | §12, FR-14, FR-15, I-6 | Gap Analysis, §1 item 8 |
| `businesses/{businessId}/startupInvestmentEntries/{entryId}` | Residual startup spending with no existing Product/Stock/Expense home | §13, FR-16, FR-17, FR-52 | Gap Analysis |
| `businesses/{businessId}/businessWorthRecoveryAuthorizations/{docId}` | SuperAdmin-granted, Owner-consumed recovery Authorization, parallel to but never merged with `initialStockRecoveryAuthorization` | §26, FR-40–FR-43, FR-58 | Finding 4-A, 10-B |

**Explicitly not one collection:** `BusinessWorthSnapshot` and `StockCount` remain two separate record types, per the Specification's own Decision 10 (§8) — a Contagem confirmation writes one of each, atomically (§5, below), never merging them into a single document type. No item in this table proposes otherwise.

**Architecture Boundary restated (implements Decision 34; POL-0010 ARCH-1, ARCH-2, FIN-7):** every collection in this table exists solely to support Business Worth measurement and business decision-making. None of them — individually or combined — introduces point-of-sale functionality, checkout, invoicing, payroll, full accounting, or ERP functionality, or general customer transaction management. `Receivable`/`Payable` record the narrow financial-position facts the source BDR's explicit, bounded override authorizes (money owed, money owed to suppliers) — neither is, or becomes, an invoicing or billing system. Any future proposal to extend this surface toward those excluded areas requires its own, separate BDR-level Product Architect decision; it is not licensed by anything in this Plan.

### 3.1 `BusinessWorthSnapshot`

Fields exactly as Specification §8 defines: `id`, `businessId`, `sourceStockCountId`, `confirmedAt`, `measuredBusinessWorth`, `productValuationTotal`/`productValuationDetail`, `embeddedProfitTotal`/`embeddedProfitDetail`, `cashPosition`, `receivablesPosition`, `payablesPosition`, `expensesSinceLastSnapshot`, `breakagesSinceLastSnapshot`, `levantamentosSinceLastSnapshot`, `otherContributingFactors?`, `previousCurrentBusinessWorth`, `estimatedBusinessWorthImmediatelyBefore`, `difference`, `correctionWindowExpiresAt`, `status`, `supersedesSnapshotId?`.

- **Immutable fields** (`id` through `difference`, per §8): never the target of an `update` operation outside §16's governed window (FR-6). Enforced at the Security Rules layer (§18, below), not merely by UI omission — the exact lesson `10-stock-counts.md`'s own finding already names for the `initial` count (Rule 8 Finding, mirrored here).
- `productValuationDetail`/`embeddedProfitDetail` **reference** existing `StockCountItem`/`StockBatch` ids rather than duplicating their content — the "aggregate, don't duplicate" precedent `04-purchase-batches.md` already establishes (Specification §8, Rule 8 Finding 2-A). The exact reference-vs-frozen-value balance for each field is Rule 8 open question #2 (§36 item 2), deliberately left open here too, per the Specification's own instruction not to fabricate a resolution — the increment implementing this collection (§24, Increment 1) resolves it as an ordinary schema-design task, not a business decision.
- `status: 'active' | 'corrected' | 'superseded-by-recovery'` is the only field ever rewritten post-write, and even that rewrite never touches any other field (§8, FR-6) — a correction or recovery always produces a **new** document with `supersedesSnapshotId` set, never an edit-in-place, per Specification Decision 33 and I-3.

### 3.2 `CashLedgerEntry`

Fields exactly as Specification §10 defines: `id`, `businessId`, `direction`, `amount`, `category`, `sourceReference`, `occurredAt`, `createdAt`, `createdBy`. Append-only — no `update`/`delete` path exists for any role, at any time (I-4), matching the existing `InitialStockPriceChangeEvent`/Timeline-event append-only precedent already used elsewhere in this codebase. Current cash balance is always derived (`Σinflow − Σoutflow`) at read time, never a separately stored, independently mutable field (§10).

**Not a generic, bank-style ledger of every physical cash movement — a governed-events ledger only [clarification, correcting this Plan's own prior draft].** Per Specification §10/FR-10, a `CashLedgerEntry` is written **only** for the specific governed financial events the approved model actually names: a `Receivable` payment actually received (`category: 'customer-payment'`, §3.3), a `Payable` payment actually made to a supplier (`category: 'supplier-payment'`, §3.4), an `Expense` (`category: 'expense'`), a Levantamento (`category: 'levantamento'`), and any other explicitly-governed movement the model defines. **A cash-financed `+Stock` purchase is not one of these events and must never produce a `CashLedgerEntry` of any category — including `'other-governed-movement'`, which exists for future governed events this Policy already names, not as a catch-all for "any cash that left the business."** `+Stock` (`04-purchase-batches.md`, the existing purchase-recording flow `10-stock-counts.md` and `04-purchase-batches.md` already govern) remains the sole, authoritative record of a stock purchase — reviewable by the Owner in the existing Stocks view, exactly as today, unmodified by this Plan. This directly implements BDR Decisions 15–16 / POL-0010 FIN-5/FIN-6: a cash-financed purchase is an asset conversion (cash → stock), not a governed cash-affecting event in the Cash Ledger's own sense, and the resulting batch's embedded profit — never a `CashLedgerEntry` — is what carries the purchase's effect into Estimated Business Worth (§7 states the exact mechanism this produces).

**Supplier payment — one record, never two.** Whether a stock purchase is paid immediately or on credit, the purchase itself is recorded exactly once, via `+Stock`. Where a payment to a supplier actually occurs — immediately at purchase, or later, settling an existing `Payable` (§3.4) — that payment is recorded exactly once, as one `PayablePayment` (§3.4) producing exactly one linked `CashLedgerEntry` of `category: 'supplier-payment'`. No separate, additional "stock purchase" `CashLedgerEntry` is ever created for the same payment — `+Stock`'s own purchase record and the `supplier-payment` ledger entry describe two different facts (what was acquired; what cash left the business to pay for it), never the same fact recorded twice.

**Cash-at-Contagem write (FR-55):** a new-model Contagem confirmation requires the Owner to record the actual cash position as of that date; this figure becomes `BusinessWorthSnapshot.cashPosition` directly (a measured fact of the snapshot), not merely a mechanical read of the ledger-derived balance — the two are compared (§8, below), never silently reconciled into one. Because a cash-financed `+Stock` purchase never touches the ledger (above), the ledger-derived balance and the Owner's physically-counted cash are expected to agree in the ordinary case — a difference is a genuine reconciliation signal to investigate (§8), not a routine, structurally-guaranteed artifact of the schema.

**No historical backfill (FR-46, FR-55):** no `CashLedgerEntry` may ever be created for a date before a given business's own Cash Ledger began, as a means of reconstructing historical cash — the first Contagem-confirmed cash position under this model is the Owner's own confirmed starting fact.

### 3.3 `Receivable` / `ReceivablePayment`

Fields exactly as Specification §11 defines. An unpaid or partially-paid `Receivable` contributes to Business Worth only to the extent of its already-received `amountPaid` (FR-12) — never its `totalAmount`. Every `ReceivablePayment` write must produce exactly one linked `CashLedgerEntry` of `category: 'customer-payment'`, in the same atomic operation (FR-13) — no payment event may exist without a corresponding cash-ledger effect. `amountPaid` on the parent `Receivable` is either a denormalized running total updated transactionally alongside each payment write, or derived at read time from the `receivablePayments` subcollection — this exact choice is Rule 8 open question #3 (§36 item 3), left open here for the same reason as §3.1's drill-down-field question: it is a schema-shape choice, not a business rule, and either choice satisfies I-5 (`amountPaid` always equals the sum of its payments) identically.

### 3.4 `Payable` / `PayablePayment`

Fields exactly as Specification §12 defines, additionally carrying `sourcePurchaseBatchId` (required) and `supplierId?` (linking the existing reusable `Supplier` entity where one was used, without altering it — confirmed no existing payable/debt model exists anywhere in this codebase, Rule 8 §1 item 8).

**Two economically distinct cases, both already distinguishable via the existing `+Stock` purchase flow — this Plan introduces no new purchase-classification concept:**

- **Case 1 — paid immediately.** The Owner acquires stock and pays the supplier at the same time. `+Stock` records the acquisition, exactly as today. No `Payable` is created (there is no outstanding obligation to track). If the payment is made from recorded business cash, it is captured as a `CashLedgerEntry` (`category: 'supplier-payment'`) at the moment of that payment — **once**, not as a second entry duplicating the `+Stock` purchase record itself. `+Stock` answers "what was acquired"; the ledger entry (where one is warranted) answers "what cash left the business to pay for it" — the same underlying event, recorded once in each of two structurally different, non-overlapping systems of record, never twice in the same one.
- **Case 2 — supplier credit.** `+Stock` records the acquisition exactly as today, and, **at the same time** (same atomicity discipline as §5's Contagem-confirmation write), a `Payable` is created for the credited amount (FR-14). The purchase itself creates no Business Worth change — only the resulting batch's embedded profit does (§7). When the Owner later pays the supplier, exactly one `PayablePayment` is created, decreasing the `Payable`'s `amountRemaining` and producing exactly one linked `CashLedgerEntry` of `category: 'supplier-payment'` (§3.2) — this payment **settles** the already-recorded liability; it must never register as a second, independent Business Worth reduction beyond the reduction the outstanding liability already represented from the moment it was recorded (FR-15) — mirroring §3.3's non-double-counting discipline exactly (I-6 mirrors I-5).

In neither case does this Plan introduce a duplicate stock-purchase record: `+Stock` remains the sole, authoritative record of the acquisition in both cases, exactly as today.

### 3.5 `StartupInvestmentEntry`

Fields exactly as Specification §13 defines: `id`, `businessId`, `category` (`'labor' | 'wages' | 'transport' | 'preparation' | 'license' | 'other'`), `amount`, `description?`, `recordedAt`. Reserved **exclusively** for spending with no existing Product/Stock/Expense record (FR-17) — this collection is never a general-purpose alternative to Expense recording. Total Startup Investment is a **report-time aggregation**: `Σ(pre-baseline PurchaseBatch original-investment totals) + Σ(pre-baseline Expense totals) + Σ(StartupInvestmentEntry.amount)`, never a duplicated ledger (FR-16).

**Date-window resolution (FR-16, resolving Specification §36 item 11 via Rule 8 Finding 6-A):** for a genuinely new business, the window is `[businessCreatedAt, firstContagemConfirmedAt)`; for an existing business (State 1a or beyond), the window is `[businessCreatedAt, historicalCapitalInicialDate)`, where **`historicalCapitalInicialDate` resolves to the `initial` `StockCount`'s `createdAt` field — never `confirmedAt`** (Rule 8 Finding 6-A: `confirmedAt` is genuinely, sometimes absent on legacy records per `firestore.rules`' own `initialStockConfirmationVoidable` comment; `createdAt` is required and unconditionally set on every `StockCount` ever written, `types.ts` line 547, with no legacy-absence exception anywhere in the codebase). This is a direction, not a new business decision — it closes a gap the Specification itself correctly declined to guess at (§13), using a field the codebase already guarantees exists for every business without exception.

**Never netted (FR-52):** no code path computes or displays a Startup-Investment-vs-Business-Worth "shortfall," "loss," or "performance" figure — the two totals are presented as independent, separately-labeled reads only.

### 3.6 `businessWorthRecoveryAuthorizations`

Deliberately parallel in shape to, and **never merged with**, the existing `initialStockRecoveryAuthorization` collection `POL-0009`'s Implementation Authorization already ships (confirmed real, live code: `firestore.rules` line ~703, `server/initialStockRecoveryAuthorization.ts`, `server/initialStockRecoveryConsumption.ts` — Rule 8 Finding 4-A/10-B). See §16, below, for the full design; this entry exists here only to complete the collection inventory.

### 3.7 Existing Records Consumed by Reference, Unmodified (implements §19–§21, FR-28, FR-29, FR-30)

For completeness of this Plan's own traceability: `Expense` (`08-expenses.md`), `Quebra` (`07-breakages.md`), and `Withdrawal`/Levantamento (`09-withdrawals.md`) records are consumed by reference throughout this Plan (§7's Estimated Business Worth inputs; §3.1's snapshot drill-down fields) exactly as they exist today. **No file in this Plan touches any of these three modules' own schema, category taxonomy, or valuation formula** — no new field, no new category, no new calculation is proposed for `Expense`, `Quebra`, or `Withdrawal` anywhere in this document (FR-28, FR-29, FR-30). Levantamentos specifically remain visible in Fecho (§9), clearly marked as money removed from the business, never treated as an ordinary operating expense — an existing, unmodified behavior this Plan relies on rather than re-implements.

## 4. `StockCount.producesBusinessWorthSnapshot` Marker (implements §14, FR-18, FR-19)

**New optional field** on the existing `StockCount` interface (`apps/tenant/src/types.ts`, alongside `expectedValueAtCount`, `totalSellingValue`, `initialCapitalBasis` — the exact class of additive, optional field this interface already tolerates being added over time without migration, Rule 8 Gap Analysis): `producesBusinessWorthSnapshot: boolean`.

- Set `true` on **every** Contagem confirmed under this model going forward — both a genuinely new business's founding (`type: 'initial'`) confirmation, and an existing State-1a business's first periodic Contagem under this model (Specification §6 State 2).
- **Never backfilled** onto any historical record (FR-19) — absent or `false` is the permanent, accurate state of every pre-capability `StockCount`, matching the identical "no timestamp is inferred, defaulted, or substituted" discipline `firestore.rules`' own `initialStockConfirmationVoidable` comment already establishes for `confirmedAt`.
- This is the **sole, authoritative** eligibility mechanism (FR-18) — no code path may instead compare a `StockCount`'s date against a cutover timestamp. This directly implements the Specification's Decision 1 (§14), which explicitly rejected a cutover-timestamp design.
- **No separate "operational" control (FR-2):** this boolean is set as a side effect of the Owner's own Contagem confirmation action (§5) — this Plan introduces no separate button, flag, or UI control whose function is "declare the business operational" independent of that confirmation. Combined with §6's read path, this is what makes FR-1 hold in practice: a business is never presented with a known, measured Business Worth before this marker is first set `true` for it.

**Write-site change:** `recordStockCount`'s existing write-payload construction (`AppContext.tsx` ~line 2856, the `newCount: StockCount = {...}` object literal) gains one new conditional field, following the exact same "omit entirely, never a literal `undefined`" discipline already used there for `label`/`expectedValueAtCount`/`initialCapitalBasis` — `...(producesBusinessWorthSnapshot ? { producesBusinessWorthSnapshot: true } : {})`. The caller (a new UI decision point, or a business-level "is this business now on the new model" read — an implementation, not business, detail) supplies this boolean; `recordStockCount` itself does not decide it.

## 5. Atomic Snapshot-Producing Confirmation (implements §8, §24, FR-5, FR-36, FR-37)

Extends `recordStockCount`'s existing Firestore-batch-write pattern (`AppContext.tsx` ~line 2679 onward), already proven for `StockCount` + Timeline-event creation in one batch:

- When `producesBusinessWorthSnapshot === true`, the same `fsBatch`/batch-write call that writes the `StockCount` document also writes exactly one new `BusinessWorthSnapshot` document, computed from: the confirmed Contagem's own items (`productValuationTotal`/`productValuationDetail`), the existing `calculateBatch`/`calculateInventoryTotals` output (`embeddedProfitTotal`/`embeddedProfitDetail`), the Owner-confirmed cash position (§3.2), the current `receivables`/`payables` outstanding totals (§3.3–§3.4), and the previous Current/Estimated Business Worth values (for the `previousCurrentBusinessWorth`/`estimatedBusinessWorthImmediatelyBefore`/`difference` reconciliation fields, §8 below).
- **Never two separately-retriable writes** (FR-36): a partial outcome — a `StockCount` with no corresponding snapshot, or vice versa — must be structurally impossible, exactly as the existing `stockCounts` + Timeline-event batch write already guarantees for its own two documents today.
- **Submission-identity idempotency** (FR-37): the `BusinessWorthSnapshot` document's own id is derived from the same `submissionId`/`initialConfirmationId` scheme `recordStockCount` already uses for the `StockCount` document itself (`AppContext.tsx` ~line 2856's own `id:` expression) — a retried finalization attempt against an already-committed submission identity produces no duplicate `StockCount` and no duplicate `BusinessWorthSnapshot`, extending the accepted Data-Loss-Resilience Specification's own regression coverage (its §14 item 2) to this new write, per §11 below.

## 6. Current Business Worth — Live Foundation (implements §6, §7; Specification §41; FR-1, FR-3, FR-4)

**[Corrected by this reconciliation pass, replacing this section's entire prior design]** The Specification's own §41 amendment (Accepted 22 August 2026) corrects what "Current Business Worth" means: **not** a bare read of the latest snapshot's frozen value, but that value **plus every governed Business-Worth-affecting change recorded since that snapshot's own `confirmedAt`** — a live, on-demand calculation, computed via the same formula §7 (below) defines for Estimated Business Worth's own Case A. This section's prior design ("resolves to the latest snapshot's frozen `measuredBusinessWorth`... never a live recomputation") was accurate against the Specification's *original* text and is now superseded.

**One shared function, two names, not two competing formulas.** Per the Specification's own §41.4/§9 amendment note: "Current Business Worth" (this section) and "Estimated Business Worth Case A" (§7, below) are the *same calculation*, read at different moments — "as of right now" (Current) versus "as of a chosen date, or before any measurement exists" (Estimated). This Plan implements **one** pure function — see §7's own definition, below — that both this section's Dashboard/Owner-Portfolio-facing read and §7's Fecho/State-1a-facing read both call. No second, independently-maintained calculation is introduced.

**FR-3 (two outcomes, never a third):** this section's read resolves to exactly one of (a) a live-computed value — the shared function's own output, given the latest snapshot plus governed activity since — or (b) an explicit `UNKNOWN` state, when no `BusinessWorthSnapshot` exists yet for the business (State 1/1a, §6 of the Specification). There is no third outcome.

**Increment 1's own scope for this shared function — existing sources only, no fabricated zeros:**

- Reads the latest confirmed `BusinessWorthSnapshot` (§3.1, §5) as its baseline.
- Adds embedded profit generated since that snapshot, from the **existing**, live `calculateBatch`/`calculateInventoryTotals` output over `batches`/`quebras` — real, already-shipped code, zero new collections.
- Subtracts Expenses recorded since that snapshot, from the **existing** `Expense` collection (unmodified, FR-28–FR-30, §3.7).
- Subtracts breakages (Quebras) recorded since that snapshot — already reflected in the embedded-profit input above (a physical loss is already absent from `remainingQuantity`); tracked separately here only as an explanatory/drill-down figure, per §3.1's own existing discipline, never a second subtraction.
- Subtracts Levantamentos recorded since that snapshot, from the **existing** `Withdrawal` collection (unmodified, FR-28–FR-30, §3.7).
- **Does not include** any Receivables/Payables/Cash position-change term in Increment 1 — **[factual correction, this pass]** unlike embedded profit/Expenses/Quebras/Levantamentos, no existing BPT mechanism represents cash-on-hand, money owed to the business, or money the business owes a supplier; this has been confirmed, independently, on three separate occasions across this capability's governance history: the Rule 8 Assessment's own Current State Assessment (citing `AppContext.tsx`'s own comment, "there is no real 'cash on hand' figure... we don't invent a substitute"), the Specification's own §1 item 8 investigation ("no supplier-payable, supplier-debt, or accounts-payable capability exists anywhere in this codebase today"), and this Plan's own §3.2/§3.4 correction pass. This is not an increment-numbering convenience — these three inputs are genuinely new capabilities with zero existing representation, unlike the four inputs above, which are all real, live, already-shipped BPT mechanisms. The term is **omitted** from Increment 1's version of the function (not computed as zero) and is added, additively, when Increment 3 ships (§24, below) — the function's own signature accepts these three inputs as optional parameters for exactly this reason, mirroring the "omit entirely, never a fabricated value" discipline this Plan already established for `BusinessWorthSnapshot`'s own optional fields (§3.1).

**Absent** (State 1, UNKNOWN, or State 1a, Estimated-only) when no snapshot exists yet — unchanged; this function is never called, and Current Business Worth is never presented, before a business's first confirmed new-model Contagem (FR-1).

**The snapshot itself remains untouched.** This live calculation never writes to, mutates, or requires any change to a `BusinessWorthSnapshot`'s own frozen fields (§3.1, §27) — it is a pure read computed *from* the snapshot forward, exactly as the Specification's own §27 amendment note now states explicitly.

**Dashboard wiring (FR-4):** the existing Business Worth card (`01-dashboard.md`) is rewired to call this shared function instead of continuing to read `businessWorth`/`initialCapitalValue` directly. **The actual Dashboard component change is Increment 2's own item (§17, below)** — Increment 1 delivers the function only, so Increment 2 can wire the UI without any new data-loading work, exactly matching this Plan's own original "foundation now, UI later" sequencing discipline (§24).

**Owner Portfolio (FR-60, Finding 15-A):** Increment 1's function is designed so Increment 2's Owner Portfolio rewire (§7, below) can call it directly, with no further change to its own signature — Increment 1 does not itself modify `refreshShopWorth`; it only ensures nothing about the function's shape will need revisiting when Increment 2 performs that rewire.

## 7. Shared Current/Estimated Business Worth Calculation Function (implements §9, FR-8, FR-9, FR-50, FR-51; Decisions 15, 16, 21; Specification §41)

**[Corrected by this reconciliation pass]** This is the **one** function §6 (above) calls for the live "as of right now" read (Current Business Worth), and this section itself calls for the "as of a chosen date" read (Fecho, §9 below) and the "no measurement exists yet" read (Case B, State 1a). Never two independently-maintained formulas — per the Specification's own §41 amendment note, these are the same calculation under two names.

**New pure, on-demand function**, never itself a Firestore-persisted field (§9):

- **Case A** (a `BusinessWorthSnapshot` exists): `latest snapshot.measuredBusinessWorth + embedded profit since that snapshot − expenses since − breakages since − Levantamentos since ± Receivables/Payables/Cash position changes`.
- **Case B** (existing business, State 1a, no snapshot yet): `historicalCapitalInicialValue (via the existing resolveInitialCapitalValue, unchanged) + embedded profits since the applicable baseline − expenses − breakages − Levantamentos`.
- Reads only from: `BusinessWorthSnapshot` (latest, if any), historical Capital Inicial (if none), `CashLedgerEntry`, `Receivable`, `Payable`, `Expense`, `Quebra`, `Withdrawal` (FR-8).

**Clarification of the "± Receivables/Payables/Cash position changes" term [correcting this Plan's own prior draft]:** this term must **not** be read as "subtract every `CashLedgerEntry` outflow since the last snapshot." Per §3.2's now-corrected design, a cash-financed `+Stock` purchase never produces a `CashLedgerEntry` at all — so it is never part of this term in the first place, and there is nothing for this term to double-subtract. Concretely, this term is the net effect of exactly three kinds of already-governed change since the last snapshot: (1) a `Receivable`'s outstanding balance decreasing because a payment was actually received (§3.3) — cash increases by the paid amount, the receivable decreases by the same amount, net zero, since the receivable was never counted as Business Worth while unpaid (FIN-3); (2) a `Payable`'s outstanding balance changing — increasing when a new supplier-credit purchase records one (a Business Worth reduction at that moment, per FIN-4, entirely separate from and prior to this term reading it), or decreasing when a `PayablePayment` settles it (cash and liability fall together, net zero, per FIN-5); (3) any other `CashLedgerEntry` this Plan's governed categories actually produce (`customer-payment`, `supplier-payment`, `expense`, `levantamento` — the last two already covered by this same formula's own separate `expenses since`/`Levantamentos since` terms, so not double-read here). **A cash-financed stock purchase is not case (1), (2), or (3) — it produces no `CashLedgerEntry` and touches no `Receivable`/`Payable` balance — so this term is entirely unaffected by it; only the separate `embedded profit since that snapshot` term captures its effect**, exactly as BDR Decision 16/FIN-6 requires.

**Worked example, verified against the approved economic model (BDR Decisions 15–16; POL-0010 FIN-5, FIN-6):**

**[Corrected by this reconciliation pass]** This example's result is **Current Business Worth** (§6, above) — read "as of right now," with a prior snapshot already existing — not "Estimated," per §41's corrected terminology. The formula and figures are exactly as before; only the label is corrected.

```
Current Business Worth (baseline, from latest snapshot): 500,000
Owner buys stock with business cash:  25,000  (recorded via +Stock only — §3.2/§3.4;
                                                no CashLedgerEntry, no Payable)
Resulting batch's embedded profit:     5,000

Current Business Worth (now) =
    500,000                            (latest snapshot.measuredBusinessWorth)
  +   5,000                            (embedded profit since that snapshot)
  −       0 / −0 / −0                  (expenses / breakages / Levantamentos since: none in this example)
  ±       0                            (Receivables/Payables/Cash position changes: not yet available in
                                         Increment 1 — omitted, not zeroed; see §6, above — and in any
                                         case the purchase produced none of the three governed changes
                                         this term would ever capture)
  = 505,000
```

This is neither `480,000` (which would result from incorrectly treating the `25,000` outflow as a governed cash-position change) nor `530,000` (which would result from incorrectly treating the `25,000` purchase as new value in addition to the resulting embedded profit) — it is exactly the approved `505,000`, produced by the mechanism above without inventing any new business rule: the existing rule (cash-financed purchase = asset conversion; embedded profit = the growth component) is unchanged; what this section adds is the implementation-level explanation of *how* the already-decided rule maps onto this Plan's own `CashLedgerEntry`/`Payable` schema (§3.2, §3.4), and — per this reconciliation pass — which of the two now-distinguished names (Current vs. Estimated) applies to this particular reading of it.

- **Baseline reset** (FR-51, Specification "no continued accumulation past a new measurement"): once any `BusinessWorthSnapshot` exists for a business, this function must never read or accumulate forward from any earlier baseline — including the historical Capital Inicial value that may have served as Case B's baseline before that snapshot existed. Enforced structurally by the function's own precedence order (check for a snapshot first; only fall through to Case B when genuinely none exists) — not by a separate flag.
- **Non-double-counting invariants** (FR-9), each independently verifiable per §29 Acceptance Criterion 9, and now mechanically explained above rather than merely asserted: a cash- or credit-financed stock purchase never adds its own full cost (only the resulting batch's embedded profit contributes); a supplier-liability payment never subtracts twice (the liability already reduced the estimate when recorded outstanding — the payment is a cash↔liability conversion); an unpaid receivable is never treated as received money.
- **Still genuinely open, not resolved here (FR-24, Specification §17; Rule 8 open question #4, §36 item 4):** the exact aggregation formula linking `productValuationTotal` and `embeddedProfitTotal` into a `BusinessWorthSnapshot`'s own `measuredBusinessWorth` **at the moment a new snapshot is created** (§3.1, §5) is a separate, still-unresolved question from the Estimated Business Worth mechanism clarified above — that mechanism governs the *ongoing, between-snapshots* calculation only. Both must independently satisfy the same non-double-counting discipline (BDR Decision 5), but neither resolves the other, and this Plan does not conflate them.

**Owner Portfolio rewire (implements §7, FR-60, resolving Rule 8 Finding 15-A) — Increment 2's own item, not Increment 1's:** `refreshShopWorth` (`AppContext.tsx` ~line 1662) currently computes its `currentWorth.value` via its own independent `totalMarketValue − shopTotalExpenses − shopTotalWithdrawals` expression — confirmed by direct inspection to be exactly the live Engine formula, computed a second, separate time for a non-active shop. **[Corrected by this reconciliation pass]** This function is rewired to instead call **the one shared function** this section and §6 both define (Current Business Worth's own live read where a snapshot exists — not "§6 or this section," since they are the same function — or Case B's Estimated read where none exists yet), for the target `businessId`, reading that shop's own `businessWorthSnapshots`/ledger/receivables/payables collections rather than re-deriving an independent figure from `batches`/`expenses`/`withdrawals` alone. This is the exact, now-fixed Product Architect direction from Finding 15-A: **"Business Worth Evolution is authoritative. Owner Portfolio consumes that value rather than maintaining a competing Business Worth mechanism."** The existing one-time-read (`getDocs`, never `onSnapshot`), Owner-only, explicit-Admin-action-only shape of `refreshShopWorth` is otherwise unchanged — only the internal calculation it performs is rewired. **Increment 1 delivers the shared function only (§6); this actual code change to `refreshShopWorth` remains Increment 2's own scope, per §24 below** — Increment 1's function is designed so this rewire requires no further change to the function's own signature when Increment 2 performs it.

## 8. Contagem Reconciliation Signal, Possible-Cause Guidance, Preventive Notifications (implements §22, FR-31, FR-32, FR-56, FR-57)

- **Reconciliation signal** (FR-31): the cash-position comparison (§3.2) and the `BusinessWorthSnapshot.difference` field (measured − estimated-immediately-before, §5) are both recorded and displayed as a signed numeric difference with no default classification beyond "reconciliation signal" — never automatically labeled theft, loss, error, or Quebra (FR-32).
- **Measured value is never replaced by the estimate:** `BusinessWorthSnapshot.measuredBusinessWorth` is always the actually-measured figure; `difference` is preserved separately and never used to adjust it (Specification's worked example, §22).
- **Possible-cause guidance** (FR-56): a new, pure function generates a non-exhaustive list of possible causes to investigate — unrecorded expenses, stock not properly recorded, an incorrect count, unrecorded breakage, an unrecorded Levantamento, supplier/payment records not updated, outstanding receivables — drawn only from what the business's own existing records can actually evidence. No cause is ever stated as fact unless those records already establish it as fact.
- **Preventive notifications** (FR-57): extends the existing, real, shipped Notifications platform (`server/notificationPlatform.ts`, confirmed live with `NotificationContext.tsx`, `deliveryChannel.ts`, and three existing producers — `trialNotificationProducer.ts`, `closingNotificationProducer.ts`, `breakageNotificationProducer.ts`, each with its own test file — Rule 8 Current State Assessment, correcting the Specification's own stale citation of `20-notifications.md`'s header). A new `businessWorthNotificationProducer.ts`, following the identical "derive facts, call `writeNotification`" shape as the three existing producers, is added — **never a new, parallel notification system**. `NOTIFICATION_CATEGORIES` (`server/notificationPlatform.ts` line 127, currently `['closing', 'inventory_risk', 'subscription', 'platform_announcement', 'staff']`) gains one new entry (illustrative name, e.g. `'business_worth'`), following the exact precedent the `'staff'` category amendment already used — an additive array entry, low risk, no change to `validateNotificationPayload`'s own logic (line 150). The exact new category string and the exact Background Worker trigger heuristic are Rule 8 open question #9 (§36 item 9), deliberately not decided here.

## 9. Fecho Baseline-Anchored Custom Range (implements §18, FR-25–FR-27, FR-53, FR-54)

- `ClosingPeriodType` (`types.ts` line 928, currently `'monthly' | 'yearly'`) gains one new additive value (illustrative: `'custom'`) — confirmed clean by direct inspection: the one real code consumer that switches on `periodType`, `closingNotificationProducer.ts` line 318 (`if ((periodType !== 'monthly' && periodType !== 'yearly') ...) continue;`), already silently and correctly excludes any non-`monthly`/`yearly` `Closing` with **zero code change required** (Rule 8 Finding, Current State Assessment — a materially favorable finding, not a gap).
- A `'custom'`-type `Closing`'s `startDate` is always populated from the active baseline's own date (the latest `BusinessWorthSnapshot.confirmedAt`, or the historical Capital Inicial baseline date for a State-1a business) — **never independently owner-chosen** (FR-25). `endDate` remains Owner-chosen, exactly as today.
- The existing double-close guard (`isPeriodClosed`, keyed on the exact `periodType`+`startDate`+`endDate` triple) is reused **unmodified** for the new value (FR-26) — confirmed compatible by direct inspection, no structural change needed.
- Fecho's reported Estimated Business Worth is computed via the **exact same §7 (Specification §9) function**, evaluated as of the selected end date — never a separately re-filtered calculation bounded only by the Fecho window (FR-53). An arbitrary historical sub-range profit request (neither boundary the active baseline) is explicitly **not** a Fecho behavior — it routes to the existing Reports module's `generateReportSummary` (`calculations.ts` line 438, confirmed to exist by Rule 8 Finding, Decision Table item 10), never a new Fecho behavior or a new reporting module (FR-54). Whether `generateReportSummary` needs any Business-Worth-Evolution-specific extension for that routing is Rule 8 open question #10 (§36 item 10), not resolved here.

## 10. `closings` Field-Level Immutability Fix (implements §27, FR-25 correctness; resolves Rule 8 Finding 8-B)

**Pre-existing gap, now load-bearing:** `firestore.rules`' current `match /closings/{closingId}` rule (line 892) reads `allow update: if isOwnerOf(businessId);` with **no field-level restriction of any kind** — confirmed by direct inspection. The `Closing` interface's frozen fields (`businessWorthAtClose`, `inventoryCostAtClose`, `inventoryMarketValueAtClose`, `totalEmbeddedProfit`, `totalExpenses`, `totalWithdrawals`, `periodType`, `startDate`, `endDate`) are today protected only by the app's own UI never writing them on `update` — not by the Security Rule itself. This directly threatens FR-25's "`startDate` must always be the active baseline's own date, never owner-chosen" guarantee for the new `'custom'`-type Closing, since nothing today stops any other client from rewriting `startDate` post-creation.

**Direction (Rule 8 Finding 8-B):** extend the `closings.allow update` rule with the same per-field immutability-lock pattern the `notifications` collection already demonstrates (`firestore.rules` ~line 1006 onward: `request.resource.data.X == resource.data.X` for every frozen field, permitting only the reopen-workflow fields — `status`, `reopenedAt`, `reopenedByUid`, `reopenedByName`, `reopenReason` — to change). This is a direct, in-repository precedent, required as part of this capability's own correctness guarantee (not merely a pre-existing nice-to-have left for later), and is independent of, and must not regress, the existing reopen-workflow behavior itself.

## 11. Contagem Autosave and Confirmation Safety (implements §23–§24, FR-33–FR-37)

**No new design.** The accepted Stock Count Data-Loss Resilience Specification's existing Draft Lifecycle State Model (`editing`/`saving`/`saved`/`save-failed`) and durable-vs-committed distinction, already tested (`periodic-stock-draft-resurrection.test.ts`, `periodic-stock-finalization.test.ts`), is inherited unmodified for Periodic Contagem generally (FR-33). An autosaved draft is never read by any Business Worth calculation while unconfirmed — Current, Estimated, or Snapshot (FR-34), mirroring that Specification's own existing invariant. Finalization safety (FR-35–FR-37) is covered by §5's atomic-write design above, which is itself an extension of this same existing pattern, not a new one.

## 12. Owner 3-Hour Correction Window (implements §25, FR-38, FR-39, I-7)

- `BusinessWorthSnapshot.correctionWindowExpiresAt` (§3.1) is computed once, at confirmation time (`confirmedAt + 3 hours`), and frozen exactly like `confirmedAt` itself — never recomputed or extended by any later activity (I-7).
- A new governed correction path (UI + write path) is available to the Owner **only while `now < correctionWindowExpiresAt`** (FR-38). A correction produces a **new** `BusinessWorthSnapshot`, referencing the original via `supersedesSnapshotId`, never an edit-in-place to the original's frozen fields (FR-39) — exactly §3.1's write discipline.
- **Distinct from, and never confused with,** the existing 12-hour Void & Redo window `POL-0008` already governs for Initial Stock — this is this Specification's own, separate figure, for a structurally different mechanism (§26, below, resolves which `StockCount`s this window applies to at all).

## 13. SuperAdmin-Authorized Recovery — 72-Hour Ceiling, Parallel Collection (implements §26, FR-40–FR-43, FR-58; resolves Rule 8 Finding 4-A, 4-B)

**Deliberately the identical shipped pattern, reused verbatim with a new collection name** (Rule 8 Finding 4-A — "not just analogous, the identical shipped pattern"), mirroring the existing `initialStockRecoveryAuthorization`/`initialStockRecoveryConsumption` design (`firestore.rules` ~line 703, `server/initialStockRecoveryAuthorization.ts`, `server/initialStockRecoveryConsumption.ts`) but as a fully **separate, parallel** collection and route set — never sharing state, a document, or a code path with the existing Initial-Stock-specific mechanism:

- **Collection:** `businesses/{businessId}/businessWorthRecoveryAuthorizations/{docId}` — fixed id per business (e.g. `'current'`), one document at a time, overwritten on each new grant — the identical fixed-slot discipline that makes "at most one active Authorization per business" a structural property rather than a query-then-check race (FR-41, mirroring `POL-0009` Rule T).
- **Fields:** `targetSnapshotId`/`targetStockCountId`, `authorizedAt` (server timestamp, Admin-SDK-only), `expiresAt = authorizedAt + 72h` (computed server-side at grant time — this Specification's own figure, distinct from `POL-0009`'s 48-hour duration, per Specification Decision 32/§26), `status` (`'unconsumed' | 'consumed' | 'expired'`), `grantedByUid`, `justification` (required, non-empty).
- **Grant route:** a new `POST /api/superadmin/business-worth-recovery/:businessId/authorize`, alongside the existing SuperAdmin routes in `server/index.ts`, using the identical `requirePlatformOperator` → `requireSuperAdmin` middleware chain (`server/superadminAuth.ts`) every other privileged SuperAdmin write already uses (Rule 8 Finding 10-B — the correct, already-proven precedent, never a `firestore.rules`-only SuperAdmin-tier branch).
- **Consumption:** Owner-only, via a new eligibility branch on whatever write path performs the correction (§12) — SuperAdmin's grant never substitutes for Owner-tier execution, and SuperAdmin's write surface never includes a write to any `BusinessWorthSnapshot`/`StockCount` field (FR-42, mirroring `POL-0009` Rule N).
- **Never interacts with the existing Initial-Stock Authorization collection** (FR-43) — no shared read, no shared write, no shared eligibility check.
- **No correction/recovery-cycle ceiling** (Rule 8 Finding 4-B, resolved): per the explicit Product Architect decision recorded in the Rule 8 Assessment and Specification §26/§30b — *"NO additional numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin authorization are the governing limits."* — no third, cycle-count limit is implemented. Ordinary rate-limiting and auditability discipline (§15, below) applies as an implementation-level safeguard against the knowingly-accepted unbounded-chain risk, but no business-rule ceiling is coded.

**Recovery exclusivity (FR-58, implements Specification Decision 2, §26):** eligibility for any `StockCount` is determined **exclusively** by its own `producesBusinessWorthSnapshot` marker (§4). A new eligibility helper — structurally parallel to `initialStockConfirmationVoidable`/`initialStockRecoveryAuthorizationActive` (`firestore.rules` lines ~224, ~272) but reading the new marker — routes `true` exclusively to this section's mechanism and absent/`false` exclusively to the existing, entirely-unchanged `POL-0008`/`POL-0009` Void & Redo mechanism. No `StockCount` is ever eligible for both at once — this is a routing rule, not an amendment to either existing Policy's own figures.

## 14. `firestore.rules` Change Inventory (implements §33, FR-44; summarized, not written here)

Per Specification §3/§37, the exact rule expressions are an implementation-time artifact, not decided by this Plan. The inventory of what changes:

1. New tenant-scoped rule blocks for `businessWorthSnapshots`, `cashLedgerEntries`, `receivables`/`receivablePayments`, `payables`/`payablePayments`, `startupInvestmentEntries` — `allow read: if isMemberOf(businessId)`, `allow create` gated to Owner (or, for ledger/payment writes, to the same write path that also creates the linked record, per §3.3/§3.4's atomicity requirement), `allow update: if false` on every frozen field outside §12/§13's governed windows (FR-44), `allow delete: if false` (append-only/immutable, matching `CashLedgerEntry`'s I-4 and `BusinessWorthSnapshot`'s I-3).
2. New collection rule for `businessWorthRecoveryAuthorizations` — `allow read: if isMemberOf(businessId)`; `allow write: if false` for every client, Admin-SDK-only, matching `initialStockRecoveryAuthorization`'s own existing pattern exactly (§13, Rule 8 Finding 10-B).
3. New eligibility helper function (§13, FR-58), parallel in shape to `initialStockConfirmationVoidable`/`initialStockRecoveryAuthorizationActive` but reading `producesBusinessWorthSnapshot` and the new Authorization collection.
4. `closings` `allow update` rule extended with the per-field immutability lock (§10), following the `notifications` collection's existing pattern (`firestore.rules` ~line 1006) verbatim in shape.
5. **No change** to any existing `voidRecords`, `stockCounts` redo-confirmation, `initialStockRecoveryAuthorization`, or `notifications`/`platform_operators`/`platform_audit_log` rule — every one of these remains byte-for-byte as it exists today, per §13's exclusivity design and §8's "extend, don't replace" integration.

## 15. Auditability (implements §34, FR-48)

Extends the existing `platform_audit_log` schema (`actorUid`, `actorRole`, `actionType`, `justification`, server `timestamp` — confirmed directly in `docs/architecture/09-superadmin-architecture.md` §9.6, Rule 8 Finding 11-A) rather than inventing a new one. Minimum audit-recorded events: a Contagem confirmation that produces a `BusinessWorthSnapshot`; an Owner correction within the 3-hour window (§12); a SuperAdmin recovery-Authorization grant, consumption, or unconsumed expiry (§13); a `Receivable`/`Payable` payment event; any reconciliation-signal event (§8); any preventive-notification dispatch (§8). Proposed `actionType` values follow the existing `support_session.issued`-style convention (e.g. `business_worth_recovery.authorized`, `business_worth_recovery.consumed`, `business_worth_recovery.expired`). Whether Contagem-confirmation-level (Owner-initiated) events belong in `platform_audit_log` or a tenant-scoped audit trail is Rule 8 open question #7 (§36 item 7), not resolved here.

## 16. Firestore Indexes (implements Rule 8 Finding 12-A)

`firestore.indexes.json` (confirmed 124 lines, no entry today for `stockCounts` or any of the six new collections above) requires new composite indexes at minimum for: `businessWorthSnapshots` ordered by `confirmedAt` per business (§6's Current Business Worth read, §7's history view, FR-7); `receivables`/`payables` filtered by `status` per business (for outstanding-position aggregation, §7's Estimated calculation inputs). Exact index definitions are an ordinary, standard implementation task — no evidence of a structural scale risk beyond what `calculateInventoryTotals`'s own already-documented `O(batches + quebras)` discipline already handles for these inputs (Rule 8 Finding 12-A).

## 17. Dashboard Integration (implements §32, FR-4, FR-47, FR-59)

- **No redesign** of the existing nine-KPI-card structure (Specification Decision 27). The existing Business Worth card is rewired to read via §6's Current Business Worth function (FR-4) and gains a click-through into a new Business Worth history view (§7's `businessWorthSnapshots`, ordered, every record independently drillable — FR-47).
- **State 1a display (FR-59):** for a business with no `BusinessWorthSnapshot` yet, the same existing card reads and displays §7's Estimated Business Worth (Case B), **visibly distinguished** from Current Business Worth — never presented as a measured figure. The exact copy/visual treatment is Rule 8 open question #6 (§36 item 6), not decided here; the business rule (never present Estimated as Current, no new card/section) is fixed by the Specification and is what this item implements.

## 18. Security / Authorization Boundaries (implements §33)

Reuses the existing `isMemberOf`/`isOwnerOf` tenant-isolation model unmodified. Owner: full read/write within §12/§13's governed windows over their own business's new record types. SuperAdmin: may create a Business-Worth-specific recovery Authorization only (§13); never a direct writer to any Business Worth record type; never crosses tenant boundaries; cannot bypass the 72-hour ceiling; has no discretion over §13's marker-keyed routing. Staff: inherits Contagem's existing access tier (no access, per `10-stock-counts.md`'s own precedent) unless a future, separate Manager-tier decision changes it — this Plan introduces no new Staff-access rule.

## 19. Idempotency / Failure Safety (implements §35, FR-49)

- **Duplicate confirmation:** covered by §5/§11 (FR-36, FR-37).
- **Duplicate payment** (`ReceivablePayment`/`PayablePayment`): each write must carry its own submission identity, following the identical pattern §5 uses for Contagem finalization, so a retried payment attempt cannot double-apply.
- **Recovery consumption retry:** atomic and one-way, mirroring `POL-0009`'s existing Invariant I-5 exactly (§13).
- **Partial transaction failure:** no financial write introduced by this Plan (`BusinessWorthSnapshot`, `CashLedgerEntry`, `ReceivablePayment`, `PayablePayment`) may be observably partially applied — each is a single Firestore batch write or transaction, matching `10-stock-counts.md`'s own "single Firestore batch write" precedent, never a multi-step, independently-failable sequence.

## 20. Multi-Unit Valuation (Mode A/B) — Explicitly Deferred Design Detail (implements §15–§16, FR-20–FR-23)

Contagem entry accepts either a single selling-unit price applied uniformly (Mode A) or multiple independently-entered selling-unit prices per physical portion (Mode B), without altering how a physical quantity or its unit label is stored or displayed (FR-20, FR-21). **Cost/selling-price preservation (FR-23, Specification §16, Decision 6):** no Contagem entry or valuation calculation introduced by this Plan may overwrite an Owner-entered cost/selling price's unit label with a converted equivalent, anywhere in stored data or default display — internal unit conversion (§15) exists solely for the valuation calculation itself, never for what is stored or shown. **+Stock's existing single-purchase-unit/single-cost-unit/single-selling-unit/single-price-per-batch model is entirely unmodified** — Mode B's flexibility does not extend there (FR-22, no file in `+Stock`'s own write path is touched by this Plan). Cost/selling-price memory continues to draw on the existing, unmodified `BDR-0012` Product Memory mechanics. **Genuinely open, not resolved by this Plan:** the precise interaction between Mode B's multiple simultaneous prices and the existing `Product.unitRelationship`/"combine to `units[0]`" reference-unit convention is Rule 8 open question #1 (§36 item 1) — confirmed workable in direction (Rule 8 Finding 7-A) but not mechanically designed here; this is the one item in this Plan explicitly left for a dedicated design pass at the start of Increment 4 (§24), not a gap in this Plan's own completeness.

## 21. Historical Transition (implements §31, FR-45, FR-46)

No existing business's historical Capital Inicial value is touched by any file this Plan changes. §7's Estimated Business Worth Case B function is exactly what allows a State-1a business to show an Estimated figure immediately, using that preserved value as-is (FR-45) — no write to any historical record is required to enable this. No migration script, batch job, or manual data operation backfilling `CashLedgerEntry`, `Receivable`, or `Payable` against historical activity is included in, or authorized by, this Plan (FR-46) — every new collection in §3 starts genuinely empty for every existing business.

## 22. Tests (at minimum; enumerated as required future work, not written here)

- **Rules-emulator tests**, extending the existing suite's own conventions (`tests/initial-stock-void-redo.test.ts`, `tests/superadmin-initial-stock-recovery-*.test.ts`):
  - Every new collection's tenant isolation (cross-business read/write denial).
  - `BusinessWorthSnapshot` frozen-field immutability outside an active correction window; mutability of only `status` inside one.
  - `closings`' new per-field lock (§10) — a client cannot rewrite `startDate`/`businessWorthAtClose`/etc. via `update`, but the existing reopen-workflow fields remain writable exactly as today.
  - SuperAdmin-tier credential cannot write directly to `BusinessWorthSnapshot`/`StockCount` even with a valid recovery Authorization present (mirroring the existing Initial-Stock test's own equivalent case).
  - A `StockCount` with `producesBusinessWorthSnapshot: true` is never eligible for `POL-0008` Void & Redo, and vice versa (§13 exclusivity — FR-58).
  - Two simultaneous grant requests for the same business's recovery Authorization: exactly one succeeds (mirroring `POL-0009`'s own concurrency test).
- **Unit tests** for the new pure functions: Current Business Worth resolution (§6), Estimated Business Worth Case A/B (§7, including the baseline-reset invariant FR-51 and every non-double-counting case FR-9 names explicitly), the possible-cause guidance function (§8), and `historicalCapitalInicialDate` resolution to `StockCount.createdAt` (§3.5).
- **Regression tests:** full existing suite (`initial-stock-void-redo.test.ts`, `initial-stock-confirmation.test.ts`, `initial-stock-dual-valuation-basis*.test.ts`, `owner-portfolio-currentworth.test.ts`, `closing-notification-producer.test.ts`, `notification-platform.test.ts`) must pass unmodified in behavior, proving zero regression to any existing path this Plan extends rather than replaces — `owner-portfolio-currentworth.test.ts` specifically will need updating to assert the new (rewired, §7) calculation path, which is an intentional, FR-60-required behavior change to that one test, not a regression.
- **Atomicity/idempotency tests:** a retried Contagem finalization attempt (ambiguous network outcome) against the same submission identity produces exactly one `StockCount` and exactly one `BusinessWorthSnapshot` (FR-37); a retried `ReceivablePayment`/`PayablePayment` attempt produces no duplicate cash-ledger effect (FR-49).

## 23. Migration / Backfill Prohibition (implements FR-19, FR-46)

**Explicitly out of scope, and explicitly not needed.** No migration or backfill of any historical `StockCount`, `Expense`, `Quebra`, or `Withdrawal` record is required or authorized — `producesBusinessWorthSnapshot`'s absence on every historical record is itself the correct, sufficient signal (§4), requiring no write to any existing document. No historical `CashLedgerEntry`/`Receivable`/`Payable` is ever fabricated for a period before this capability existed for a given business (§3.2, §21).

## 24. Proposed Incremental Implementation Sequence (per source BDR §10/Decision 35)

**[Corrected by this reconciliation pass — Increment 1's boundary only; Increments 2–9 unchanged in substance]** Per explicit Product Architect direction following the Specification's §41 amendment: *"Increment 1 must absorb the minimum live Current Business Worth foundation required by the accepted §41 Specification... Increment 1 must NOT implement the complete later Cash/Receivables/Payables capability. Increment 2 and later increments remain separate."* This changes Increment 1's own content (below) — it does **not** move Increment 3 (or any other increment) earlier, and does not merge any two increments.

One signed Implementation Authorization gates the whole capability; coding proceeds feature-by-feature within it, in this proposed order (later increments depend on earlier ones; reordering within a dependency-safe boundary is an implementation-time judgment, not a governance one):

1. **Foundation + minimum live Current Business Worth.** `producesBusinessWorthSnapshot` marker (§4); `BusinessWorthSnapshot` collection, rules, and index (§3.1, §14, §16); atomic snapshot-producing confirmation write (§5); **the shared Current/Estimated calculation function (§6, §7), scoped in this increment to the existing sources only — embedded profit, Expenses, Quebras, Levantamentos — with the Receivables/Payables/Cash position-change term correctly omitted (not zeroed), per §6's own explicit note.** No UI change yet beyond making the marker settable — the Dashboard/Owner Portfolio *code* changes that consume this function remain Increment 2's own item (below), per §6/§7's own "foundation now, wiring later" note.
2. **Broader Estimated Business Worth + Dashboard/Owner Portfolio wiring:** Case B (State 1a, no snapshot yet) added to the shared function Increment 1 already built (§7); Dashboard card rewire and State-1a display, the actual component change (§17); Owner Portfolio `currentWorth` rewire, resolving Finding 15-A, the actual `refreshShopWorth` code change (§7, FR-60). **This increment does not re-implement the shared function's own Case-A logic — that already exists from Increment 1; this increment adds Case B and performs the UI-facing wiring.**
3. **Cash, Receivables, Payables — unchanged, still Increment 3, not moved earlier.** All three new collections, rules, and indexes (§3.2–§3.4, §14, §16); Contagem's cash-at-confirmation entry step (§3.2); the shared function (§6/§7) extended to add the Receivables/Payables/Cash position-change term it has correctly omitted since Increment 1 — an additive parameter, not a rewrite of the function's own existing logic.
4. **Multi-unit valuation (Mode A/B) design-and-build** (§20) — the one increment requiring a dedicated design pass for Rule 8 open question #1 before implementation, per §20's own note.
5. **Startup Investment:** `StartupInvestmentEntry` collection, rules, index; report-time aggregation function using the `historicalCapitalInicialDate → StockCount.createdAt` resolution (§3.5).
6. **Fecho baseline-anchoring + `closings` immutability fix:** new `periodType` value, `startDate` derivation, `closings` rules fix (§9, §10) — the rules fix (§10) should land in this increment specifically, since it is what makes FR-25 actually enforceable rather than merely UI-observed.
7. **Reconciliation signal, possible-cause guidance, preventive notifications:** §8's function and the new notification producer/category.
8. **Owner 3-hour correction window + SuperAdmin 72-hour recovery:** §12–§13, including the new parallel Authorization collection, grant route, and exclusivity-routing rules helper — deliberately sequenced last among the core mechanisms, since it is the one new mechanism every earlier increment's data must already exist correctly for a correction/recovery to meaningfully act on.
9. **Auditability wiring across all of the above** (§15) — proposed as its own pass across every write path introduced in Increments 1–8, rather than piecemeal per increment, so every `actionType` is named consistently in one review.

**Why this resequencing is not a new business decision:** the *formula* Increment 1 now partially implements (§6/§7's shared function) was already fully decided by the Specification (§9's Case A, unamended in substance by §41). What moved is *which increment builds which piece of already-decided logic* — an ordinary engineering sequencing choice, of the same kind this Plan already makes for every other increment boundary (e.g. "the `closings` rules fix lands in Increment 6, not earlier"). No new formula, ceiling, storage mechanism, or non-double-counting rule is introduced by this resequencing.

Each increment is still bound by the Specification's own §29 Acceptance Criteria in full — an increment is not "done" merely because its own files compile; the relevant Acceptance Criteria (§25, below, cross-references each) must hold.

## 25. Traceability Re-Verification

| Plan §/item | BDR Decision(s) | POL-0010 Rule(s) | Specification §/FR | Rule 8 Finding |
|---|---|---|---|---|
| §3.1 `BusinessWorthSnapshot` | 4, 5, 33 | BW-3, BW-4, SYS-10, REC-4 | §8, FR-5–FR-7 | 2-A |
| §3.2 Cash Ledger (governed-events-only clarification) | 11, 12, **15, 16** | FIN-1, FIN-2, **FIN-5, FIN-6**, SYS-3 | §10, FR-10, FR-11, FR-55 | Current State Assessment |
| §3.3 Receivables | 13 | FIN-3, SYS-4 | §11, FR-12, FR-13 | Gap Analysis |
| §3.4 Payables (Case 1/Case 2 clarification) | 14, 15 | FIN-4, FIN-5, SYS-5, SYS-6 | §12, FR-14, FR-15 | §1 item 8 |
| §3.5 Startup Investment | 20 | SI-1, SI-2, SI-3 | §13, FR-16, FR-17, FR-52 | Finding 6-A |
| §3.7 Expenses/Quebras/Levantamentos unmodified | 17, 18, 19 | EXP-1, EXP-2, QUE-1, LEV-1 | §19–§21, FR-28, FR-29, FR-30 | — |
| Architecture Boundary restated (§3) | 34 | ARCH-1, ARCH-2, FIN-7 | §3, §37 | — |
| §4 Marker field | 1, 2, 25–26 | CON-1, CON-2, HIST-4 | §14, FR-1, FR-2, FR-18, FR-19 | Gap Analysis |
| §5 Atomic write | 4, 30 | BW-3, CON-10, SYS-9 | §8, §24, FR-5, FR-36, FR-37 | Findings 2-A, 3-A |
| §6 Current Business Worth (live foundation, corrected per Specification §41) | 1, 3, 21, 23 | BW-1, BW-2, BW-5, BW-7, DASH-1 | §6, §7, FR-1, FR-3, FR-4 | §1; **§41 reconciliation** |
| §7 Shared Current/Estimated Business Worth function + Owner Portfolio rewire (cash-financed-purchase mechanism clarified; unified per §41) | 15, 16, 21, 23 (Rule-8-resolved) | FIN-5, FIN-6, BW-5, BW-7 | §9, FR-8, FR-9, FR-50, FR-51; §7 FR-60; **FR-24 named still-open, not resolved** | Finding 5-A; **Finding 15-A**; **§41 reconciliation** |
| §8 Reconciliation/notifications | 11, 22 | CON-8, FIN-2, OWN-5, BW-6 | §22, FR-31, FR-32, FR-56, FR-57 | Current State Assessment (Notifications) |
| §9 Fecho | 24 | FEC-1, FEC-2, FEC-4 | §18, FR-25–FR-27, FR-53, FR-54 | Findings 8-A, §1 item 9 |
| §10 `closings` immutability fix | (implementation correctness for Decision 24) | FEC-1 | §27 (by analogy), FR-25 | **Finding 8-B** |
| §11 Autosave/confirmation safety | 29, 30 | CON-9, CON-10, SYS-8, SYS-9 | §23–§24, FR-33–FR-37 | Finding 3-A |
| §12 Owner 3h window | 31 | REC-1, OWN-4 | §25, FR-38, FR-39, I-7 | — |
| §13 SuperAdmin 72h recovery | 32, §5 item 6 (Rule-8-resolved) | REC-2, REC-3, OWN-4 | §26, FR-40–FR-43, FR-58 | Findings 4-A, **4-B**, 10-B |
| §14 Rules inventory | 33 | SYS-10, REC-4 | §27, FR-44 | §1, Finding 8-B |
| §15 Auditability | (restates existing V1 discipline) | — | §34, FR-48 | Finding 11-A |
| §16 Indexes | — | — | — | Finding 12-A |
| §17 Dashboard | 27, 28 | DASH-1, BW-3 | §32, FR-4, FR-47, FR-59 | Finding 9-A |
| §18 Security | — | — | §33 | Findings 10-A, 10-B |
| §19 Idempotency | — | — | §35, FR-49 | Finding 13-A |
| §20 Multi-unit valuation | 6, 7, 8, 9, 10 | CON-3, CON-4–CON-7, OWN-2, OWN-3, SYS-7 | §15–§16, FR-20–FR-23 | Finding 7-A |
| §21 Historical transition | 25, 26 | HIST-1–HIST-4, SYS-11 | §31, FR-45, FR-46 | Finding 6-A, 14-A |
| §22 Tests | — | — | §29 (all ACs) | Finding 13-A, §5 |
| §23 Migration prohibition | 26 | HIST-4 | FR-19, FR-46 | Finding 14-A |

**Correction, this revision:** the §7 row previously cited BDR Decision 27 (Dashboard) in error — Decision 27 belongs only to the §17 Dashboard row, where it is correctly cited; it has been removed from the §7 row. Decision 2 (Contagem means measurement, not a purchase) and Decisions 6, 17–19, 34 — previously represented in substance but not explicitly cited anywhere in this table — are now cited against the sections that already implement them (§4, §20, §3.7, and the new Architecture Boundary row respectively). No design in those sections changed; only the table's own completeness was corrected.

**No item in this Plan required a new Product Architect business decision.** The two Rule-8-stage decisions (Findings 4-B, 15-A) are already resolved and are implemented, not reopened, by §13 and §7 respectively. Every other design choice above is either a direct implementation of an already-approved FR/Rule, or an implementation-detail choice (exact field/collection/route names, exact index definitions, exact `actionType` strings) explicitly reserved for this stage by the Specification's own §3/§37 out-of-scope list.

## 26. Governance Notes

- This is an Implementation Plan only. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document.
- This Plan does not modify the source BDR, POL-0010, the Specification, or the Rule 8 Assessment.
- No Implementation Authorization is signed by this document.
- Every Rule 8 open question this Plan does not resolve (§36 items 1–3, 5–11; item 4 is scoped exactly where the Specification leaves it, at the `measuredBusinessWorth` aggregation formula, and is now explicitly named as still-open in §7 rather than left implicit) is explicitly named at the point in this Plan where it is relevant (§3.1, §3.3, §7, §8, §9, §15, §17, §20), never silently resolved or silently dropped.
- **Correction pass (this revision), triggered by a clarification of an existing, already-approved BPT financial-model behavior — not a new Product Architect decision:** §3.2 and §3.4 are corrected to reflect that the Cash Ledger records only specific, already-governed financial events (a received receivable payment, a made payable payment, an expense, a Levantamento), never a generic entry for every physical cash movement — in particular, a cash-financed `+Stock` purchase never produces a `CashLedgerEntry`, since `+Stock` (reviewable in the existing Stocks view) already is, and remains, the sole authoritative record of that purchase. §7 is corrected to explain, mechanically, exactly how its "± Receivables/Payables/Cash position changes" term avoids double-counting a cash-financed purchase, with the BDR's own worked example (`500,000 → 505,000`) verified against the corrected mechanism. §25's traceability table is corrected: an erroneous BDR Decision 27 citation is removed from the §7 row; Decisions 2, 6, 15, 16, 17–19, 21, 34 and FR-1, FR-2, FR-23, FR-24 (the last named explicitly as still-open, not resolved) are now cited where they already applied in substance; a new §3.7 was added covering Expenses/Quebras/Levantamentos (FR-28–FR-30); the Architecture Boundary Override (Decision 34/ARCH-1/ARCH-2) is now explicitly restated in §3. Two broken internal cross-references ("§14, below" in §3.2 and §5, which should have read "§8, below") are corrected. **None of this changes any approved business decision** — the underlying rule (cash-financed purchase = asset conversion; embedded profit = the growth component; supplier-credit purchase creates a matched asset/liability; a payment settles rather than doubly reduces) is exactly what BDR Decisions 15–16/21 and POL-0010 FIN-5/FIN-6 already decided; this pass only clarifies, and makes explicit, how that already-decided rule maps onto this Plan's own `CashLedgerEntry`/`Payable` schema, and corrects several citation/cross-reference defects a prior review identified.
- Nothing was committed or pushed to produce this document.
- **§41 reconciliation pass (22 August 2026, ✅ ACCEPTED):** following the Specification's own §41 amendment (Accepted 22 August 2026) and the matching Rule 8 reconciliation, §6 is redesigned (Current Business Worth is now the shared live-calculation function's own "as of right now" read, not a bare snapshot lookup), §7 is corrected (retitled to reflect it is the *shared* function; its worked example relabeled Current, not Estimated; its Owner Portfolio paragraph corrected to describe one function, not two alternative reads), §24 is corrected (Increment 1 now delivers the shared function scoped to existing sources only — embedded profit, Expenses, Quebras, Levantamentos — with Receivables/Payables/Cash correctly omitted, not zeroed, until Increment 3; no other increment moves), and §25's §6/§7 rows are updated to match. **No new business decision is introduced** — the resequencing is an ordinary engineering-planning choice about which increment builds which already-decided piece of logic, not a new formula, ceiling, or rule. Increments 2–9 remain separately sequenced and unchanged in substance. **Accepted by explicit Product Architect signature, 22 August 2026 (see header above).**

## 27. Next Governance Step

The next step — **not performed here** — is a signed Implementation Authorization, per `19-governance-bdr-policy-framework.md` §3. No push or merge of this document is performed unless explicitly instructed.

**Lifecycle:** Drafted → Product Architect Reviewed → Accepted → Rule 8 Assessed → READY FOR IMPLEMENTATION → **Implementation Plan (this step)**. Not yet an Implementation Authorization. Not Implemented.

---

# Implementation Plan Amendment — Revision 3 (Business Worth First Establishment Lifecycle)

**Status: ✅ ACCEPTED AND SIGNED (23 August 2026).** Reviewed and accepted by explicit Product Architect signature, including the settled Owner-Declared Business Worth UI decision (dedicated entry point/screen, never a mode/toggle inside Contagem). This amendment is, as of this acceptance, authoritative Implementation Plan content, appended per this document's own established append/reconciliation-pass discipline (its existing 22 August 2026 corrections, its §41 reconciliation pass).

**Target of this amendment:** `docs/engineering/business-worth-evolution-implementation-plan.md`, as a new dated amendment section to be appended there once accepted — following that document's own established append/reconciliation-pass discipline (its existing 22 August 2026 corrections and its §41 reconciliation pass, §26). This amendment is now recorded in this file itself. No code, test, `firestore.rules`, `firestore.indexes.json`, or Implementation Authorization file is touched by this document. This document itself is not an Implementation Authorization and grants no permission to write code.

**Governing basis:** the Revision 3 governance amendment (Specification §42/§43 and inline corrections; BDR §4 Decision 1 corrected, Decision 36 added), live on `origin/main` at `5870bdd`; and the **Rule 8 Assessment Addendum — Revision 3** (draft, gate status `READY AFTER DECISIONS`, all three required acknowledgment points now accepted by explicit Product Architect decision, SABUSHIMIKE Masceni, 23 August 2026). This amendment converts that addendum's findings into a concrete implementation map, exactly as the parent Plan's own §1 Purpose describes its relationship to the Rule 8 Assessment. **No item below introduces a business decision beyond what Revision 3 and the Rule 8 Addendum already settled** — every design choice either directly implements a named FR/Finding, or is an implementation-detail choice (exact field/route/collection names) explicitly reserved for this stage.

**Companion item, not part of this Plan amendment:** the Product Architect's acknowledgment #3 (Rule 8 Addendum) — that FR-1's literal wording should be corrected to recognize both establishment methods — is a Specification-text correction, not an Implementation Plan item. It is **not resolved here** and is not silently folded into any section below; it is listed as its own line in this amendment's Governance Notes (§7) as a companion action tracked separately, per the Product Architect's own instruction not to silently resolve it elsewhere.

**Scope note, restated from the Rule 8 Addendum's own §0, and per explicit instruction to keep it separate throughout:** this amendment is organized in two parts with different governance weight:
- **Part A — Increment 10 (new capability).** Genuinely new code paths; nothing in Increments 1–9 does this today.
- **Part B — Post-Implementation Corrections.** Changes to the *observable behavior* of already-shipped, already-tested code (Increments 4, 6, 7), classified per the Implementation Authorization's own §16 precedent ("Post-Implementation Correction — Finding 3, Option A") — engineering-planned here, but their own Product-Architect-level acceptance record belongs in the Implementation Authorization (a future, separate document), exactly as §16 itself was recorded there, not in the Plan.

---

## PART A — Increment 10: New Collections and Data Model (implements Specification §8 as extended, §12 as extended, §43)

Mirrors the parent Plan's own §3 structure and citation discipline.

### A.1 `BusinessWorthSnapshot` — Owner-Declared Establishment Branch (implements §42.1, §8 `establishmentMethod`, FR-61; Rule 8 Finding OD-1–OD-5)

**No new collection** — extends the existing `businessWorthSnapshots` collection's write path with a second creation branch, alongside the existing Contagem-confirmation branch.

**Schema addition** (already recorded in the Specification, §8): `establishmentMethod: 'contagem' | 'owner-declared'`, immutable, set once at creation.

**`firestore.rules` change** (`businessWorthSnapshots.allow create`, currently line 727): add a second disjunct alongside the existing Contagem-confirmation branch, structurally parallel to it —

```
allow create: if isOwnerOf(businessId) &&
  request.resource.data.get('businessId', null) == businessId &&
  request.resource.data.get('id', null) == snapshotId &&
  request.resource.data.get('confirmedAt', null) == request.time &&
  request.resource.data.get('measuredBusinessWorth', null) is number &&
  request.resource.data.get('measuredBusinessWorth', 0) > 0 &&
  (
    // Existing Contagem branch — UNCHANGED (Rule 8 Finding OD-1: the
    // existing branch's own text/conditions are not modified by this
    // amendment; only a new disjunct is added alongside it).
    (
      request.resource.data.get('establishmentMethod', null) == 'contagem' &&
      request.resource.data.get('sourceStockCountId', null) is string &&
      ( ...exactly the existing status/supersedesSnapshotId conditions, unchanged... )
    )
    ||
    // NEW — Owner-Declared branch (Rule 8 Finding OD-1). sourceStockCountId
    // must be genuinely ABSENT, never null/empty-string, so a client
    // cannot fabricate a fake StockCount id to blur the two methods.
    // Every FR-69 omitted field (§A.1 note below) must also be absent,
    // enforced server-side, not merely UI-convention.
    (
      request.resource.data.get('establishmentMethod', null) == 'owner-declared' &&
      !('sourceStockCountId' in request.resource.data) &&
      !('productValuationTotal' in request.resource.data) &&
      !('productValuationDetail' in request.resource.data) &&
      !('embeddedProfitTotal' in request.resource.data) &&
      !('embeddedProfitDetail' in request.resource.data) &&
      !('cashPosition' in request.resource.data) &&
      !('receivablesPosition' in request.resource.data) &&
      !('payablesPosition' in request.resource.data) &&
      !('expensesSinceLastSnapshot' in request.resource.data) &&
      !('breakagesSinceLastSnapshot' in request.resource.data) &&
      !('levantamentosSinceLastSnapshot' in request.resource.data) &&
      !('ownerInvestmentSinceLastSnapshot' in request.resource.data) &&
      request.resource.data.get('supersedesSnapshotId', null) == null &&
      request.resource.data.get('status', null) == 'active'
    )
  );
```

Exact field list and rule text above are this Plan's own illustrative implementation detail (per Specification §3/§37's own out-of-scope convention) — the *requirement* (Owner-only, tenant-scoped, mutually exclusive from Contagem provenance, FR-69's omission list server-enforced) is fixed by Revision 3 and the Rule 8 Addendum; the exact Rules syntax is an implementation choice, subject to normal code review.

**Write path (UI/route boundary — Rule 8 Finding OD-5, explicitly flagged as undecided by the Addendum):** **Implementation decision required, not resolved by this Plan amendment.** Two options: (a) a dedicated "Declare Business Worth" entry point, structurally separate from the Contagem entry flow; (b) a mode toggle on the existing Contagem entry screen. **Settled by explicit Product Architect decision, recorded in the Implementation Authorization Amendment:** option (a), a dedicated entry point/screen, is the approved direction — never a mode/toggle inside Contagem. See the Implementation Authorization Amendment's own recorded decision for the full rationale.

**Atomicity/idempotency (implements Rule 8 Finding OD-3):** single-document create, trivially atomic by Firestore's own per-document write guarantee — no batch-write design needed, unlike the paired Contagem write. The document's own `id` must derive from a client-generated `submissionId`, exactly as `recordStockCount` already does for `StockCount` (`AppContext.tsx` ~line 2856's own `id:` expression) — direct reuse of an existing, proven idempotency pattern, not a new one.

**Correction/recovery (Rule 8 Finding OD-4 — confirmed no code change required):** `businessWorthSnapshotCorrectable()` and `businessWorthRecoveryAuthorizationActive()` (both already shipped, Increment 8) operate generically on `snapshotId`/`confirmedAt` with no branch on establishment method — an Owner-Declared snapshot is correctable/recoverable on identical terms with **zero modification to either function.**

**Drill-down (implements §42.3, FR-69):** the Business Worth history view's read/render path gains a branch: when `establishmentMethod === 'owner-declared'`, display `measuredBusinessWorth`, `confirmedAt`, `establishmentMethod` badge, and an explicit "no physical/financial breakdown exists for this establishment" notice — never a blank/zero field presented as though it were data. This is a UI-layer conditional, not a new calculation.

**Verification-status display (implements §42.8, FR-70 — new, per the Product Architect's approved Option A decision, 23 August 2026).** Two additional display requirements, both display-layer only, neither affecting any calculation, formula, or Fecho-baseline resolution:

- **Dashboard headline.** The Dashboard's Business Worth headline presentation (distinct from the history list above, which already carries the `establishmentMethod` badge per the drill-down item) gains the same kind of branch: when the latest active snapshot's `establishmentMethod === 'owner-declared'`, the headline must present an explicit "Owner Declared / Unverified" framing rather than the plain "Current Business Worth" framing used for a Contagem-sourced latest snapshot — using the identical underlying number and calculation (`getCurrentBusinessWorth`) in both cases. This was the one gap Rule 8 Finding OD-2's original "no downstream read path requires modification" language did not separately verify (it checked calculation paths and the drill-down/history list, not the headline display path specifically) — now closed by this requirement, qualified in the Rule 8 Addendum accordingly.
- **Declaration entry screen.** The Owner-Declared entry screen's pre-confirmation copy must state, before the Owner confirms: (a) the value is Owner-provided; (b) SABUSH BPT has not independently verified it; (c) a future Contagem will establish the measured Business Worth.

**Explicitly NOT required by this addition (per the Product Architect's own direction):** no change to `getCurrentBusinessWorth`, `getEstimatedBusinessWorth`/`computeCaseALiveBusinessWorth`, or `resolveActiveBusinessWorthBaselineDate` — no Contagem-only filter is introduced anywhere in live calculation or Fecho-baseline resolution. An Owner-Declared snapshot remains a fully valid operational Business Worth baseline and a fully valid Fecho baseline. No new data-model field — `establishmentMethod` remains the sole source of truth for this distinction.

### A.2 `Payable` — Opening Balance / Other Obligation Origins (implements §42 Decision 12, §12 as extended, FR-62; Rule 8 Finding OP-1–OP-4)

**No new collection** — extends the existing `payables` collection's schema (`origin`, `description` fields, already recorded in the Specification §12) and write rule.

**`firestore.rules` change** (`payables.allow create`, currently line 920): restructure into an origin-branching rule —

```
allow create: if isOwnerOf(businessId) &&
  request.resource.data.get('businessId', null) == businessId &&
  request.resource.data.get('id', null) == payableId &&
  request.resource.data.get('totalAmount', null) is number &&
  request.resource.data.get('totalAmount', 0) > 0 &&
  request.resource.data.get('amountPaid', null) == 0 &&
  request.resource.data.get('amountRemaining', null) == request.resource.data.get('totalAmount', null) &&
  request.resource.data.get('status', null) == 'unpaid' &&
  (
    // Existing purchase-origin branch — UNCHANGED, byte-for-byte, per
    // the Specification's own "purchase-origin Payables unchanged"
    // preservation item and Rule 8 Finding OP-1.
    (
      request.resource.data.get('origin', null) == 'purchase' &&
      request.resource.data.get('sourcePurchaseBatchId', null) is string
    )
    ||
    // NEW — opening-balance / other-obligation. sourcePurchaseBatchId
    // must be genuinely ABSENT (Rule 8 Finding OP-1: this is the
    // control preventing a non-purchase liability from also carrying
    // purchase provenance). description required non-empty.
    (
      request.resource.data.get('origin', null) in ['opening-balance', 'other-obligation'] &&
      !('sourcePurchaseBatchId' in request.resource.data) &&
      request.resource.data.get('description', null) is string &&
      request.resource.data.get('description', '').size() > 0
    )
  );
```

**`PayablePayment` and `payables.allow update` (implements Rule 8 Finding OP-2 — confirmed zero change required):** both are already origin-agnostic (neither references `sourcePurchaseBatchId` or `origin` today) — no schema or rule change needed for existing settlement mechanics to cover the two new origins, satisfying FR-62's "must otherwise participate in the exact same payment, settlement... mechanics... without alteration."

**Notification interaction (Rule 8 Finding OP-3 — confirmed zero change required):** the existing `PAYABLE_OUTSTANDING_EVENT_TYPE` sweep filters only on outstanding status, with no origin-based condition — a new-origin `Payable` is picked up automatically.

**Legacy-record read-path treatment (Rule 8 Finding OP-4 — implementation decision, not resolved here):** any UI distinguishing the three origins must treat a pre-amendment `Payable` with no `origin` field as equivalent to `'purchase'` (the only origin that existed before). This Plan amendment names this as the required default; it does not design the exact UI conditional.

### A.3 `OwnerInvestment` — New Collection (implements §43, FR-63–66; Rule 8 Finding OI-1–OI-6)

**New collection:** `businesses/{businessId}/ownerInvestments/{investmentId}`, schema exactly as Specification §43 defines (`id`, `businessId`, `amount`, `date`, `description?`, `createdAt`, `createdBy`).

**`firestore.rules` addition**, structurally identical in shape to the existing `startupInvestmentEntries` rule (line 963 — same tenant path, same `isOwnerOf` gate, same closed-field-presence discipline, append-only):

```
match /ownerInvestments/{investmentId} {
  allow read: if isOwnerOf(businessId);
  allow create: if isOwnerOf(businessId) &&
    request.resource.data.get('businessId', null) == businessId &&
    request.resource.data.get('id', null) == investmentId &&
    request.resource.data.get('amount', null) is number &&
    request.resource.data.get('amount', 0) > 0 &&
    request.resource.data.get('createdBy', null) == request.auth.uid;
  allow update, delete: if false;
}
```

**Atomic pairing with `CashLedgerEntry` (implements FR-63; Rule 8 Finding OI-2 — confirmed zero schema/rules change to `cashLedgerEntries` itself):** `category: 'other-governed-movement'` already exists in the live enum (`types.ts` line 994, `firestore.rules` line 862) and is confirmed genuinely unused by any current production code path today — direct reuse. The write path pairs one `OwnerInvestment` document with exactly one `CashLedgerEntry` document (`direction: 'inflow'`, `category: 'other-governed-movement'`) in a single Firestore batch write, following the identical pattern `recordReceivablePayment`/`recordPayablePayment` already use for their own payment-plus-ledger-entry pairs.

**Idempotency (implements FR-63; Rule 8 Finding OI-3):** the `OwnerInvestment` document's `id` derives from a client-supplied `submissionId`, mirroring §5's existing discipline. Exact id-derivation scheme (e.g. `` `${submissionId}` `` vs. a composite) is an implementation detail for the engineer picking this up, not decided here.

**Live formula extension (implements FR-64; Rule 8 Finding OI-4):** `computeCaseALiveBusinessWorth` (Increment 3, `calculations.ts`) gains one new additive parameter: `+ ownerInvestmentsSinceSnapshot`, computed as the sum of `OwnerInvestment.amount` where `date > <active baseline's own confirmedAt>`. This is structurally the same kind of additive-term extension Increment 3 already performed once for the Receivables/Payables/Cash position-change term (Plan §24 item 3) — not a new class of change to this function. **No double-counting:** this term is read directly from `OwnerInvestment` records; the function must **not** separately sum `cashLedgerEntries` by `category: 'other-governed-movement'` into the same total — the linked `CashLedgerEntry`'s own effect and this term must never both move the live figure independently.

**Snapshot drill-down field (implements FR-65):** `BusinessWorthSnapshot` gains `ownerInvestmentSinceLastSnapshot`, following the existing "reference, don't duplicate" discipline §8 already establishes for its sibling since-last-snapshot fields. **Confirmed compatible with §42.3's Owner-Declared omission rule (Rule 8 Finding OI-6):** this field is a *since-baseline* field, never an *at-establishment* field, so it is never one of the fields FR-69 requires omitted on an Owner-Declared snapshot's own establishment-moment detail — present identically regardless of which method established the baseline.

**Timeline audit event (implements Rule 8 Finding OI-5):** a new `TimelineEvent` variant, following the existing, already-proven "log after successful batch commit" pattern (`AppContext.tsx`'s existing Timeline-write discipline) — logged to the per-business Timeline, never `platform_audit_log` (reserved for platform/SuperAdmin events; Owner Investment is an Owner-initiated, business-scoped event).

**Never widens Startup Investment (implements FR-66):** no change of any kind to `startupInvestmentEntries`'s schema, category enum, or FR-17's scope restriction — confirmed by construction, since `OwnerInvestment` is a wholly separate collection and code path.

---

## PART A — Recurring 30-Day Receivable Reminders (implements §22/FR-57 as amended; Rule 8 Finding RC-1–RC-5)

**Product Architect decision now incorporated (acceptance point 1, above): `lastReminderSentAt`-style field on `Receivable`, written only by the reminder-firing action.**

**Schema addition:** `Receivable` gains `lastReminderSentAt?: Timestamp` (or ISO string, matching this collection's existing `createdAt: string` convention) — an additive optional field, tolerated the same way `StockCount.producesBusinessWorthSnapshot` was added without migration (Rule 8 Assessment's own precedent, Finding 14-A).

**Write-path isolation (implements the "partial payment does not reset cadence" requirement structurally, not by convention — Rule 8 Finding RC-2):** `lastReminderSentAt` is written **exclusively** by the reminder-firing server action, and the recordReceivablePayment write path must not touch this field under any circumstance. This isolation is itself the mechanism that makes cadence-preservation-under-partial-payment a structural guarantee rather than an assumption — this Plan amendment states it as an explicit constraint the code review for this Increment must verify, not merely as a design intention.

**Sweep logic change (implements FR-57; Rule 8 Finding RC-5 — the one genuinely new-shape piece of this item):** `businessWorthNotificationProducer.ts`'s existing `RECEIVABLE_OUTSTANDING_EVENT_TYPE` sweep currently fires once per document, ever (its own header's documented one-shot dedupe model, `dedupeKey` with no time component). This must change from "skip if already notified" to "re-evaluate every outstanding Receivable on each pass, gate firing on `now − lastReminderSentAt ≥ 30 days`" (or `lastReminderSentAt` absent, for the first-ever reminder). **This is the one item in this amendment requiring a genuine change to the sweep's own control flow**, not a pure additive extension — flagged for extra code-review attention, though still a bounded, well-precedented kind of scheduling logic (Class A in the Rule 8 sense: an implementation-detail answer to an already-decided business requirement, not a new business judgment).

**Stops on paid (implements the "paid status stops reminders permanently" requirement; Rule 8 Finding RC-3 — confirmed zero additional logic required):** the existing sweep's own outstanding-status filter (`unpaid`/`partially-paid` only) already excludes any `Receivable` that has reached `status: 'paid'` — this requirement is satisfied as a direct consequence of the existing filter, with no new code.

**FIN-3 unaffected (Rule 8 Finding RC-4 — confirmed structurally unreachable):** no code in this item writes to `amountRemaining`, the live Business Worth formula, or any Business-Worth-bearing field — this is a pure downstream notification concern.

---

## PART A — Contagem Cost-Basis Conversion (implements §15/FR-67; Rule 8 Finding CB-1–CB-3)

**Engine reuse (confirmed, zero new engine — Rule 8 Finding CB-3):** `getConversionFactor` (`apps/tenant/src/lib/purchaseToSellingConversion.ts`) already has the exact null-handling contract FR-67 requires (returns `null`, never a fabricated `1`, when the relationship is invalid or a unit is outside the confirmed chain) — direct reuse, no new conversion engine, no new field on `UnitRelationship`.

**The actual code change — per-portion cost-entry path (`apps/tenant/src/utils/stockCount.ts`):** when a Contagem portion's unit differs from the product's most recent purchase unit and a valid `unitRelationship` covers that unit, the cost price for that portion is computed via `getConversionFactor`, automatically and unconditionally — never an Owner-facing toggle. **This replaces the currently-shipped `const costPrice = Number(raw.costPrice) || 0;` line for exactly this case** (§B.2, below, carries the Post-Implementation-Correction-level regression-review requirement for this change, since it modifies already-shipped Increment 4 code). Outside this specific case (single-unit Contagem, or no confirmed `unitRelationship`), today's behavior is unchanged — manual entry remains, with the existing zero-coercion for a genuinely blank entry (FR-67's own "narrow exception" clause), since a manual-entry case is exactly the case `getConversionFactor` itself already treats as unconvertible.

**Zero coupling with selling-price logic (confirmed — Rule 8 Finding CB-3):** `deriveModeAPortionValuations` (Increment 4's own Mode A engine) only ever reads/writes `sellingPrice`, never `costPrice` — this cost-basis change introduces no interaction with that function, preserving Specification §15's "zero interaction between the two calculations" requirement by construction, not by added guard logic.

**Required regression gate before merge (implements the Product Architect's acceptance point 2's "existing regression tests must be updated in the same implementation change," applied here per Rule 8 Finding CB-2/ZF-1):** `tests/contagem-multi-unit-valuation.test.ts` and `tests/periodic-stock-mode-a-integration.test.ts` must be reviewed for any fixture relying on (or merely tolerating) the silent-zero cost-price default, and updated in the same change that lands this feature — not treated as a pre-existing, unrelated suite.

---

## PART A — Fecho Batch-Level Profit Attribution (implements §18/FR-68; Rule 8 Finding BP-1, BP-2)

**The actual code change:** `generateReportSummary` (`apps/tenant/src/utils/calculations.ts`, line 1295) already calls `calculateBatch(batch, batchQuebras)` per batch inside its own loop (line 1333) before aggregating into product-level totals. `ProductReportDetail`'s return type gains a new `batchContributions: { batchId, costPrice, embeddedProfit, status }[]` field, populated from that same, already-running per-batch call — a parallel accumulation alongside the existing aggregation, not a second computation of profit. **Zero change to `generateReportSummary`'s existing aggregate return fields** (`productEmbeddedProfit`/`finalizedEmbeddedProfit`/`estimatedEmbeddedProfit` unchanged in meaning or value).

**No interaction with Business Worth Engine or snapshot immutability (Rule 8 Finding BP-2 — confirmed):** `generateReportSummary` shares no mutable state with `computeCaseALiveBusinessWorth` or any `BusinessWorthSnapshot` write path.

---

## PART A — Three-Surface Terminology Correction (implements §32; Rule 8 Finding TS-1)

**No schema, rule, or write-path change** — a display-layer relabeling across three named files (the Dashboard's Business Worth summary modal; `CapitalGrowthReport.tsx`'s `initialCapitalValue`-labeled timeline start-point; `BusinessWorthReport.tsx`'s `kpiInitialCapital`/`kpiInitialCapitalFull` KPI card). Each: before establishment (State 1/1a), label "Business Worth" (Estimated where applicable); after establishment (State 3, either method), label "Current Business Worth," reading the already-live §7 calculation. Historical Capital Inicial data is relocated in display only, to an "Initial Investment / capital history" section — never deleted, migrated, or rewritten (HIST-1). This item has no atomicity, security, or data-integrity dimension per the Rule 8 Addendum's own TS-1 finding, and can proceed directly from the Specification text.

**Sequencing dependency (Rule 8 Finding FB-4, carried forward here):** this item should land together with, or with an explicit note relative to, Part B.1 (Fecho baseline removal) below — a business losing its Fecho baseline while its Dashboard still shows an unlabeled Capital-Inicial-derived figure would present an inconsistent mid-rollout state to the Owner.

---

## PART B — Post-Implementation Corrections (implements the Product Architect's acceptance point 2)

**Governance note, restated:** per the Implementation Authorization's own §16 precedent, each item below will require its own dated Product-Architect-signed acceptance section in a future Implementation Authorization amendment (structurally mirroring §16's "Finding → Product Architect Decision → Rationale → What This Explicitly Does NOT Change → Formal acceptance" shape) — **not created by this Plan amendment.** This Plan amendment's own job, for Part B, is limited to defining the concrete technical change and its regression-handling requirement, so that future Authorization section has a settled technical basis to accept.

### B.1 Fecho Baseline — Capital Inicial Fallback Removal (implements §18/FR-25 as corrected; Rule 8 Finding FB-1–FB-4)

**The actual code change:** `resolveActiveBusinessWorthBaselineDate` (`apps/tenant/src/utils/calculations.ts`, line 1478) removes its `initialStockCount.createdAt` fallback branch entirely. When no `BusinessWorthSnapshot` exists (of either `establishmentMethod`), the function returns its own explicit "no baseline" result — never a Capital-Inicial-derived date, regardless of whether the business has one.

**Required regression update (Rule 8 Finding FB-1 — identified, not hypothetical):** `tests/fecho-baseline-anchored-closing.test.ts` contains at least three test cases exercising the fallback path directly (`resolveActiveBusinessWorthBaselineDate({ snapshots: [], initialStockCount: initial })`-shaped calls). These cases must be updated **in the same change** to assert the new "no baseline" result instead of the old fallback date — this is an expected, correct consequence of the correction, not an incidental test break to be patched around.

**UI messaging, sequenced with the code change (implements Decision 4's own required copy; Rule 8 Finding FB-2):** the Portuguese message — *"Estabeleça primeiro o Valor do Negócio através de uma Contagem ou de um Valor de Negócio Declarado para utilizar o Fecho."* — must land atomically with, or before, this code change goes live for any given business, not as a follow-up — since any currently-onboarded State-1a business loses custom-period Fecho the moment this change ships (an explicitly accepted, not hypothetical, behavior change per the signed decision log's own Decision 4).

**No security/atomicity/rules dimension (Rule 8 Finding FB-3):** pure calculation-logic change, no `firestore.rules` change, no new write path, no new collection.

### B.2 Cost-Price Silent-Zero-Fallback Removal (implements §15/FR-67; Rule 8 Finding ZF-1, ZF-2 — cross-referenced from Part A's cost-basis-conversion item, recorded again here per explicit instruction to classify it separately)

**The actual code change:** already specified under Part A's Contagem Cost-Basis Conversion section above — `stockCount.ts`'s `Number(raw.costPrice) || 0` fallback is removed **only for the specific case FR-67 names** (multi-portion entry, unit differs from purchase unit, valid confirmed `unitRelationship` exists). Outside that case, today's behavior is unchanged (Rule 8 Finding ZF-2) — this is a narrower behavior change than B.1's.

**Required regression review (Rule 8 Finding ZF-1):** `tests/contagem-multi-unit-valuation.test.ts` and `tests/periodic-stock-mode-a-integration.test.ts` fixtures must be checked for any case relying on the silent-zero default within FR-67's own narrow scope, and updated in the same change if found.

---

## Proposed Sequencing (Increment 10, per source BDR §10/Decision 35's "feature-by-feature within one umbrella Authorization" discipline)

Mirrors the parent Plan's own §24 format. This is a sequencing proposal only — it does not itself authorize any increment; a future Implementation Authorization amendment does that.

1. **Foundation — Owner-Declared establishment method.** §A.1's rules branch, drill-down UI conditional, and the (not-yet-decided) entry-point UI. This is foundational because Owner Investment's drill-down interaction (§A.3, Finding OI-6) and the three-surface terminology item both assume `establishmentMethod` already exists and is populated correctly.
2. **Opening/other-obligation Payables.** §A.2 — independent of item 1, can proceed in parallel.
3. **Owner Investment.** §A.3 — depends on item 1 only for its drill-down-field interaction (Finding OI-6); the collection, rules, atomic write, and live-formula extension are otherwise independent.
4. **Recurring receivable reminders.** The schema field is independent and can land any time; the sweep-logic change (the genuinely new-shape piece, Finding RC-5) should land as its own reviewed unit given its higher control-flow risk.
5. **Contagem cost-basis conversion, together with its Post-Implementation-Correction regression update (B.2).** Sequenced together deliberately, per the instruction that the existing regression suites be updated in the same change.
6. **Fecho baseline removal (B.1), together with the three-surface terminology correction (Part A).** Sequenced together per Finding FB-4's own dependency note, to avoid a mid-rollout inconsistent-display state.
7. **Fecho batch-level profit attribution.** Independent, low-risk, can land at any point after item 6 or in parallel with it.

**Why this sequencing is not itself a new business decision:** every dependency named above is a technical build-order consequence of what Revision 3 and the Rule 8 Addendum already decided (e.g., Owner Investment's drill-down field only makes sense once `establishmentMethod` exists) — no item's *content* changes based on this ordering, only *when* it is built, exactly the same kind of engineering-sequencing judgment the parent Plan's own §24 already makes for Increments 1–9.

---

## Traceability

| Item | Class | Spec §/FR | Rule 8 Finding(s) | Reverses shipped behavior? |
|---|---|---|---|---|
| Owner-Declared snapshot creation | A — new | §42.1, §8, FR-61 | OD-1–OD-5 | No |
| Opening/other-obligation Payables | A — new | §42 Dec. 12, §12, FR-62 | OP-1–OP-4 | No |
| Owner Investment | A — new | §43, FR-63–66 | OI-1–OI-6 | No |
| Recurring receivable reminders | A — new | §22, FR-57 | RC-1–RC-5 | No (extends a one-shot mechanism, does not remove prior guarantee) |
| Contagem cost-basis conversion (engine + write) | A — new, with a B-class sub-item | §15, FR-67 | CB-1–CB-3 | Partially — see B.2 |
| Fecho batch-level profit attribution | A — new | §18, FR-68 | BP-1, BP-2 | No |
| Three-surface terminology | A — new (display-only) | §32 | TS-1 | No |
| Fecho baseline fallback removal | **B — Post-Implementation Correction** | §18/FR-25 (corrected) | FB-1–FB-4 | **Yes — removes shipped Increment 6 fallback behavior** |
| Cost-price silent-zero-fallback removal | **B — Post-Implementation Correction** | §15/FR-67 | ZF-1, ZF-2 | **Yes — removes a shipped default, narrowly scoped** |

---

## Governance Notes

- This is an Implementation Plan amendment draft only. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document.
- This amendment does not modify the source BDR, the Specification, or the Rule 8 Assessment/Addendum.
- No Implementation Authorization is created or amended by this document. Per the Product Architect's own explicit instruction, this acceptance authorizes drafting/amending the Implementation Plan only.
- **Companion item, tracked separately, not resolved here:** Specification FR-1's literal wording ("no confirmed Contagem under this model") should be corrected to also recognize Owner-Declared establishment, consistent with the already-corrected §6 State 2 text. This is a Specification-text correction, not a Plan item, and is recorded here only so it is not silently dropped between governance artifacts.
- Both Part B items require their own dated Product-Architect-signed acceptance in a future Implementation Authorization amendment, mirroring the existing §16 precedent — not created here.
- All Revision 3 Product Architect decisions are preserved exactly as recorded; no settled business decision is reopened by this amendment.
- Nothing was committed or pushed to produce this document.

## Next Governance Step (Revision 3 Amendment)

This amendment's own next governance step, per this repository's established sequence, was a signed Implementation Authorization Amendment — now itself drafted, signed, and recorded (see `business-worth-evolution-implementation-authorization.md`'s own recorded Revision 3 sections), including its own "Product Architect Authorization — Increment 10" section and the two Part B "Post-Implementation Correction" sections. No code, test, rules, or index file is created, modified, or authorized by this Plan amendment itself — that remains gated by the separate, explicit per-item implementation instruction the signed Authorization Amendment itself requires.

**Lifecycle (Revision 3):** Signed Revision 3 decisions → Governance recording (Specification/BDR/Rule 8 Assessment, `5870bdd`) → Rule 8 Assessment Addendum (accepted) → Implementation Plan Amendment (accepted, signed, this document) → Implementation Authorization Amendment (accepted, signed). Not yet implemented — implementation begins only per the signed Authorization's own one-item-at-a-time execution rule and a further explicit per-item instruction.

---

# Implementation Plan Amendment — Decision 37 (First-Time Contagem Product-Information Model)

**Status: ✅ ACCEPTED (23 August 2026).** Reviewed and accepted by explicit Product Architect decision:

> I have reviewed the Decision 37 Implementation Plan Amendment. I ACCEPT AND SIGN IT.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026
>
> The approved scope is limited to: first-time product-level information collection in Contagem; one original purchase/cost basis per product; one complete arbitrary-length unit relationship per product; multiple physical portions for one product; a first-class "+ Add Portion" interaction; first-time product setup versus subsequent Contagens; proper suppression of redundant per-portion cost entry; reuse of the already-authorized FR-67 cost-basis conversion; independent selling units/prices; automatic Total Cost Value; automatic Total Selling Valuation; Business Worth continuing to use the selling valuation. Unchanged and out of scope: Business Worth's selling-basis formula, existing Mode A/Mode B selling behavior, `getConversionFactor`, Product/UnitRelationship/StockBatch data models, Owner-Declared Business Worth, Fecho, Owner Portfolio, other Increment 10 items, Firestore rules/indexes.
>
> This acceptance authorizes the next governance step only — preparation of the Implementation Authorization Amendment for Decision 37. It does not authorize implementation.

Governing basis: BDR-pending-business-worth-evolution-measurement-model.md §4, Decision 37, and the Rule 8 Assessment Addendum — First-Time Contagem Product-Information Model (✅ ACCEPTED, SABUSHIMIKE Masceni, 23 August 2026, gate READY FOR PLAN). This amendment covers Decision 37's scope only and does not reopen, amend, or reinterpret Revision 3 above, or any Part A/Part B item already recorded there.

**Target of this amendment:** `docs/engineering/business-worth-evolution-implementation-plan.md`, appended per this document's own established append-only discipline. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document — plan-drafting only, matching the discipline every prior Plan amendment in this file has followed.

## A. Already-authorized behavior being reused (no new Plan item — named here only so this amendment does not silently duplicate or re-decide it)

- **FR-67 cost-basis conversion** (Specification §15/FR-67; Rule 8 Findings CB-1–CB-3; Plan §"PART A — Contagem Cost-Basis Conversion," above; Authorization §22 item 5/§23 item 5/§25). The silent Total Cost Value derivation this Decision's item 7 requires is exactly that already-planned, already-authorized-pending-execution engine and code change — this amendment adds no second derivation path.
- **Selling-price independence / Mode A / Mode B** (Specification §15/FR-20; Increment 4, already shipped and tested — `deriveModeAPortionValuations`, `contagemMultiUnitValuation.ts`). Decision 37's items 8–9 (independent selling units/prices, automatic Total Selling Valuation) restate this existing, already-shipped behavior; this amendment changes nothing about it.
- **`totalSellingValue`/`productValuationTotal`/Business Worth's selling-basis valuation** (`normalizeStockCountItems`, `AppContext.tsx`) — already selling-basis, already correct (confirmed by direct inspection, prior investigation). Decision 37 item 10 restates this; no code change is proposed or needed.

## B. Decision 37's newly approved scope — the actual Plan items

### B.1 Product-Level First-Time Setup Panel (implements Decision 37 items 1, 2, 6; Rule 8 Finding FT-4)

**The actual UI change (`apps/tenant/src/components/PeriodicStockCountView.tsx`):** for a genuinely-new product only (existing `isGenuinelyNewProductName` gate, unchanged), render one product-level panel containing: product name (once), original purchase unit, original purchase cost — in place of today's per-row cost/unit fields duplicated across manual rows for the same product. For an existing product, this panel is replaced by a read-only summary line pulling `Product.unitRelationship`/purchase cost basis via the already-existing `getUnitRelationshipForProductName`/`findMostRecentBatchForProduct` (Finding FT-4 — no new read path required).

### B.2 Arbitrary-Length Unit-Relationship Entry (implements Decision 37 item 3; Rule 8 Findings FT-1, FT-2)

**The actual UI change:** extend `UnitRelationshipRow` (or its replacement) from its current fixed two-level `{sellingUnit, factor}` pair into a repeatable chain-step list ("1 [unit] = [N] [unit]", "+ Adicionar nível"), producing a `UnitRelationship.units[]` of however many levels the Owner enters. **Engine/data-model reuse, confirmed zero new engine (Finding FT-1):** `getConversionFactor` and `Product.unitRelationship.units[]` already accept and correctly compose an arbitrary-length chain — this is a UI/candidate-construction change only, not an engine change.

**Candidate correlation fix (Finding FT-2):** the resulting `UnitRelationship` candidate must be correlated to the entire product **group** (every row/portion sharing the product's name in the current draft), not to whichever single row's disclosure happened to be expanded — replacing the current per-row `unitRelationshipByProductName` construction with a per-group construction.

### B.3 Multiple Current Physical Portions + "+ Add Portion" (implements Decision 37 items 4, 5, 11; Rule 8 Finding FT-3)

**The actual UI change:** port the already-shipped Grouped Initial Stock UX pattern — `groupRowsByProductName`/`RowGroup` (`apps/tenant/src/lib/stockCountPortionGrouping.ts`, already generic, no change needed) and `handleAddPortion`/`handleRenameGroup`/`handleRemoveGroup` (`InitialStockCountView.tsx`) — into `PeriodicStockCountView.tsx`. This replaces the current flat `catalogRows`/`manualRows` list rendering with product-level cards, each listing its own portions, with a **"+ Adicionar Porção"** button pre-filling the product name (never blank), sitting alongside — not replacing — the existing page-level "Adicionar produto" action for a genuinely different product. **Zero risk to `stockCountPortionGrouping.ts` itself** (Finding FT-3): this module is already generic over any `PortionGroupableRow`-shaped row and requires no modification; only its consuming view changes.

### B.4 Cost-Field Suppression on Non-Purchase-Unit Portions (supports Decision 37 items 2, 7; coordinates with, does not duplicate, the already-planned FR-67 item)

**The actual UI change:** once a product-level cost basis + unit relationship exist (B.1/B.2), hide/disable the per-portion `costPrice` input for any portion whose unit differs from the product's purchase unit — this is the presentational counterpart to the already-authorized FR-67 derivation (§A, above): the Owner is never shown a field inviting a second, redundant cost entry for EMB/UN once CX's cost basis is on record. **No new calculation lives here** — this item is UI-only; the actual Total Cost Value figure is produced by the already-planned FR-67 code change in `stockCount.ts`.

### B.5 First-Time vs. Subsequent Contagem Distinction (implements Decision 37 item 6; Rule 8 Finding FT-4)

**Confirmed no new code required beyond B.1's read-only-summary branch.** The existing `isGenuinelyNewProductName` gate already distinguishes the two cases; B.1 above is the only place this distinction needs new rendering logic (first-time editable panel vs. subsequent read-only summary).

## Dependencies

- **B.2 and B.3 are independent of each other and may land in either order** — B.2 changes the relationship-entry form; B.3 changes row/grouping layout. Both touch `PeriodicStockCountView.tsx` but different, non-overlapping sections of it.
- **B.1 depends on B.2** only insofar as the product-level panel (B.1) is the container the chain-step list (B.2) renders inside.
- **B.4 depends on B.1** (a cost basis must exist before a per-portion cost field can be meaningfully suppressed) **and coordinates with, but does not depend on the code for,** the separately-authorized-pending-execution FR-67 item (§A) — B.4 can land first (fields hidden, no derived total shown yet) or after (fields hidden, derived total already available), Plan sequencing is a Product Architect/Authorization-stage choice, not fixed here.
- **No dependency on any other Increment 10 item** (Owner-Declared Business Worth, Owner Investment, receivable reminders, Fecho baseline removal, batch-level profit attribution, three-surface terminology) — confirmed by Rule 8 Finding FT-6 (non-overlapping code paths) and this amendment's own inspection.

## Tests anticipated

- `UnitRelationshipRow`/its replacement: constructing a 3+ level chain from UI input produces a `UnitRelationship` that `isValidUnitRelationship` accepts and `getConversionFactor` composes correctly across all levels (new coverage — today's tests only exercise the 2-level candidate path).
- Grouping/candidate-correlation: three manual portion rows for one new product name produce exactly one first-time panel and one correctly-correlated `UnitRelationship` candidate for the whole group, not three independent candidates (new coverage, Finding FT-2).
- `handleAddPortion`-equivalent for Contagem: pre-fills the existing product's name, never creates a blank/generic row (new coverage, mirrors Initial Stock's own existing test pattern for the same handler).
- Regression: an existing product (already has `unitRelationship`) never renders the first-time editable panel — only the read-only summary (existing `isGenuinelyNewProductName` gate, regression-checked).
- Regression: `totalSellingValue`, `productValuationTotal`, and `measuredBusinessWorth` are byte-identical before/after this UI change — this amendment touches no selling-side or Business-Worth-path code.
- Regression: `stockCountPortionGrouping.ts`'s existing exported functions and their existing call sites in `InitialStockCountView.tsx` remain untouched and their existing tests continue to pass unmodified — this amendment only adds a new consumer (`PeriodicStockCountView.tsx`), never edits the shared module's own behavior.

## Explicitly out of scope (restated from Decision 37's own "does not authorize" list, and from this amendment's own inspection)

- `getConversionFactor`, `Product.unitRelationship`'s type shape, `StockBatch`'s cost-basis type shape — no change.
- Selling-price Mode A/Mode B logic, `totalSellingValue`, `productValuationTotal`, Business Worth's selling-basis formula — no change.
- `firestore.rules`, `firestore.indexes.json` — no change identified or required by this amendment.
- Owner-Declared Business Worth, Fecho, Owner Portfolio, and every other Increment 10 item not named in §A/§B above.
- Any shared-component consolidation of `UnitRelationshipRow`/grouping logic across `InitialStockCountView.tsx`/`AddStockView.tsx`/`PeriodicStockCountView.tsx` — remains the explicitly deferred "future pure-refactor checkpoint" `stockCountPortionGrouping.ts`'s own header comment already names; this amendment introduces a second, duplicated copy in `PeriodicStockCountView.tsx`, consistent with that existing, deliberate discipline, not a refactor of it.
- The actual FR-67 cost-derivation code change itself (`stockCount.ts`'s per-portion cost-entry path) — that remains the separately-authorized-pending-execution Plan item under "PART A — Contagem Cost-Basis Conversion," above; this amendment's B.4 only prepares the UI to consume its output.

## Next Governance Step

Per this repository's established sequence and identical to Revision 3's own lifecycle, above: this Plan Amendment, once accepted and signed by the Product Architect, is followed by a signed Implementation Authorization item (its own dated section in `business-worth-evolution-implementation-authorization.md`, naming B.1–B.5 individually, subject to that document's existing one-item-at-a-time execution rule). Not created by this document. No code, test, rules, or index file is authorized to be touched by this Plan amendment alone.
