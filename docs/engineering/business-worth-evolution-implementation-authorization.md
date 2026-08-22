# Implementation Authorization — Business Worth Evolution & Measurement Model

**Status:** ✅ **Signed and Authorized for Incremental Implementation.** See §14 for the recorded Product Architect signature. Implementation of the complete Business Worth Evolution capability — strictly within §2's scope, §3's exclusions, and §7's mandatory one-increment-at-a-time discipline — is authorized as of this signature. **No code, `firestore.rules`, `firestore.indexes.json`, or test file has yet been created, modified, or committed** — signature is the governance gate that permits that next, separate execution step; it does not itself perform it, and it does not authorize performing more than Increment 1 before the next verification checkpoint (§7).
**Governing chain:** [`BDR-pending-business-worth-evolution-measurement-model.md`](../specs/BDR-pending-business-worth-evolution-measurement-model.md) (✅ Business Decision phase complete, 35 decisions) → [`POL-0010`](../specs/POL-pending-business-worth-evolution-policy.md) (✅ Drafted, numbered, traces all 35 decisions) → [Consolidated Specification](../specs/business-worth-evolution-specification.md) (✅ **Accepted**, SABUSHIMIKE Masceni, 22 August 2026, twice-amended) → [Rule 8 Assessment](./business-worth-evolution-rule8-assessment.md) (✅ **READY FOR IMPLEMENTATION**, both blockers resolved by explicit Product Architect decision) → [Implementation Plan](./business-worth-evolution-implementation-plan.md) (drafted, reviewed, corrected — cash-ledger/`+Stock` mechanism clarified, traceability re-verified) → **this Authorization (✅ Signed, §14)**.
**File discipline note:** Filed unprefixed in `docs/engineering/`, per this repository's established convention for a cross-cutting capability whose source BDR and Policy are themselves unprefixed (`docs/specs/README.md`'s own numbering ledger; the precedent set by this same capability's own Rule 8 Assessment and Implementation Plan files). No `BDR-NNNN`/`POL-NNNN`/authorization-number identifier is assigned here — none is invented, consistent with the numbering-ledger rule this session has followed throughout ("no number may be inferred; each requires its own explicit Product Architect decision," which has not been made for this document).
**One umbrella Authorization, not nine.** Per source BDR Decision 35 and POL-0010 CPR-5: this single document authorizes the entire Business Worth Evolution capability. No separate Implementation Authorization exists, or will be created, for Cash, Receivables, Payables, Contagem, Fecho, Startup Investment, Recovery, or any other sub-area named in §2, below.

---

## 1. Preflight Confirmation — Re-Verified, Not Re-Investigated

The Rule 8 Assessment already performed the required Current State Assessment against the live codebase (its §1, all 15 dimensions) and the Implementation Plan re-confirmed every file/line reference it relies on by direct inspection immediately before drafting (its own header). This Authorization does not repeat that investigation; it re-confirms, as of signature, that nothing has changed since:

- `firestore.rules`' `initialStockConfirmationVoidable`/`initialStockRecoveryAuthorizationActive` functions, the `closings` and `notifications` rule blocks, and the `initialStockRecoveryAuthorization` collection remain exactly as the Rule 8 Assessment and Implementation Plan describe them.
- `StockCount.createdAt` remains required and unconditionally set on every record (the basis for the Implementation Plan's `historicalCapitalInicialDate` resolution, Rule 8 Finding 6-A).
- `AppContext.tsx`'s `businessWorth` formula (line ~943) and `refreshShopWorth`'s Owner Portfolio `currentWorth` cache (line ~1662) remain exactly as inspected.
- `server/notificationPlatform.ts`'s `NOTIFICATION_CATEGORIES` array and the three existing notification producers remain exactly as inspected.

No new investigation was required or performed to reach this confirmation; no legacy-data reconstruction question comparable to prior capabilities' preflights was identified as open by the Rule 8 Assessment or the Implementation Plan for this capability.

## 2. What This Authorization Covers (Complete Umbrella Scope)

Exactly, and only, the scope the source BDR → POL-0010 → Specification → Rule 8 Assessment → Implementation Plan chain already defines, in full:

| # | Area | Implementation Plan §/Item |
|---|---|---|
| 1 | Business Worth lifecycle/state model (UNKNOWN, State 1a, Current, Estimated, New Contagem reset) | Plan §4, §6, §7 |
| 2 | Existing-business Estimated Business Worth (State 1a, Case B) | Plan §7, §21 |
| 3 | Business Worth UNKNOWN state | Plan §6 |
| 4 | First new-model Contagem / transition event | Plan §4, §5 |
| 5 | Current Business Worth | Plan §6 |
| 6 | `BusinessWorthSnapshot` | Plan §3.1 |
| 7 | Historical Business Worth snapshots / drill-down history | Plan §3.1, §17 |
| 8 | Estimated Business Worth between Contagens (Case A) | Plan §7 |
| 9 | Contagem reconciliation | Plan §8 |
| 10 | Cash / governed financial-position behavior | Plan §3.2 |
| 11 | Receivables | Plan §3.3 |
| 12 | Supplier obligations / Payables | Plan §3.4 |
| 13 | Expenses integration (unmodified, consumed by reference) | Plan §3.7 |
| 14 | Quebras integration (unmodified, consumed by reference) | Plan §3.7 |
| 15 | Levantamentos integration (unmodified, consumed by reference) | Plan §3.7 |
| 16 | Embedded Profit integration (unmodified, consumed by reference) | Plan §7 |
| 17 | Startup Investment | Plan §3.5 |
| 18 | Fecho baseline-anchored behavior | Plan §9 |
| 19 | Contagem autosave/draft recovery | Plan §11 |
| 20 | Safe confirmation | Plan §5, §11 |
| 21 | Owner 3-hour correction window | Plan §12 |
| 22 | SuperAdmin 72-hour recovery authorization | Plan §13 |
| 23 | Historical immutability | Plan §3.1 (frozen fields), §27's Rules Inventory (Plan §14) |
| 24 | Existing-business transition | Plan §21 |
| 25 | Product Memory / UOM / valuation compatibility | Plan §20 |
| 26 | Multi-unit valuation behavior (Mode A/B) | Plan §20 (Mode A/B interaction with `units[0]` explicitly deferred to a dedicated design pass within Increment 4 — not resolved by this Authorization) |
| 27 | Dashboard integration | Plan §17 |
| 28 | Owner Portfolio `currentWorth` integration | Plan §7 (Owner Portfolio rewire) |
| 29 | Reconciliation/discrepancy guidance | Plan §8 |
| 30 | Preventive notifications | Plan §8 |
| 31 | Auditability | Plan §15 |
| 32 | Idempotency/failure handling | Plan §19 |
| 33 | Tenant isolation/security | Plan §18 |
| 34 | Historical preservation | Plan §21, §23 |
| 35 | All other approved requirements represented by the BDR, POL-0010, Specification, and Implementation Plan | The Plan's own §25 Traceability Re-Verification table, in full |

Also explicitly covered: the `closings` field-level immutability fix (Plan §10, resolving Rule 8 Finding 8-B) and the new Firestore composite indexes the Plan's §16 names — both required as part of this capability's own correctness guarantee, not optional additions.

## 3. What This Authorization Does Not Cover

- Any change to `BDR-0012`, `BDR-0014` and its companion amendments, `BDR-0015`/`POL-0008`, `BDR-0016`/`POL-0009`, `10-stock-counts.md`, `02-business-worth-engine.md`, `09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`, `11-monthly-closings.md`, `01-dashboard.md`, `product-unit-of-measure-specification.md`, or the Stock Count Data-Loss Resilience Specification — every one of these is reused or extended, never amended, per the Specification's own §30 Governance Conflict Check and §37 Non-Goals.
- Any point-of-sale functionality, checkout, invoicing, payroll, full accounting, or ERP functionality, or general customer transaction management (source BDR Decision 34; POL-0010 ARCH-1, ARCH-2; Plan §3's restated Architecture Boundary).
- Any broadening of SuperAdmin's authority beyond issuing/expiring the one new Business-Worth-specific recovery Authorization type (Plan §13) — no general financial-data editing capability, no direct write to any `BusinessWorthSnapshot`/`StockCount` field.
- Any change to `POL-0008`'s 12-hour Owner window, its 3-recovery-cycle/4-confirmation-event ceiling, or `POL-0009`'s 48-hour SuperAdmin authorization duration — all remain entirely unamended, governing Initial Stock confirmations exactly as before (Plan §13's exclusivity design).
- Any migration or backfill of any historical `StockCount`, `Expense`, `Quebra`, `Withdrawal`, cash, receivable, payable, or snapshot record (Plan §23).
- Any UI/component/layout design beyond the functional requirements the Specification and Implementation Plan state (Specification §3, §37; Plan §17, §20).
- Any Firestore composite index definition, exact `firestore.rules` expression, exact `actionType` string, or other implementation-time detail beyond the inventories the Implementation Plan already provides (Plan §14, §15, §16) — these remain implementation-time choices within the Plan's own resolved direction, not decided by this signature.
- Nine separate authorizations. This is one umbrella Authorization; no sub-area listed in §2 receives its own signature.

## 4. Traceability Re-Verification

Every item this Authorization covers traces to a specific BDR Decision, POL-0010 Rule, Specification FR/Invariant/Acceptance Criterion, and Rule 8 Finding, per the Implementation Plan's own §25 table — re-confirmed here rather than re-derived. All 35 source-BDR decisions are represented (Plan §25, as corrected); both Rule-8-stage decisions (Findings 4-B, 15-A) are implemented, not reopened (§6, below); no Implementation Plan item lacked a governing citation as of the Plan's most recent correction pass.

## 5. Approved Financial Behavior — Restated, Not Redecided

Per BDR Decisions 15–16, POL-0010 FIN-5/FIN-6, and the Implementation Plan's corrected §3.2/§3.4/§7:

- A cash-financed stock purchase is an **asset conversion** (cash → stock) — it does not itself reduce or increase Business Worth.
- `+Stock` remains the sole, authoritative record of the purchase, reviewable in the existing Stocks view, unmodified.
- The Cash Ledger records only specific, already-governed financial events (a receivable payment actually received, a payable payment actually made, an expense, a Levantamento) — **never** a generic entry for every physical cash movement, and never a duplicate of a `+Stock` purchase.
- Supplier payments follow the two distinct, already-decided cases (paid immediately; paid on credit via a `Payable`, later settled by exactly one `PayablePayment`) without double-counting the purchase or the liability settlement.

**Worked example, which implementation must reproduce exactly:**

```
Current Business Worth:        500,000
Stock purchased with cash:      25,000  (recorded via +Stock only; no CashLedgerEntry)
Resulting embedded profit:       5,000
Estimated Business Worth:      505,000
```

Not `480,000` (treating the purchase as an expense/outflow against the estimate). Not `530,000` (double-counting the purchase as new value in addition to its embedded profit). This is a restatement of an already-approved rule, not a new one — no Product Architect decision is created, changed, or implied by this section.

## 6. Approved Product Architect Decisions — Binding, Restated Verbatim Where Quoted

1. **New-model Contagem identification.** `producesBusinessWorthSnapshot = true` is the sole, authoritative eligibility marker (Specification Decision 1, §14) — no cutover timestamp is ever used (Plan §4).
2. **New-model recovery.** Owner: 3-hour correction window, timed from confirmation, never reset by activity. SuperAdmin: may authorize recovery within 72 hours; SuperAdmin authorizes only, never edits Contagem or `BusinessWorthSnapshot` directly; Owner performs the recovery and reconfirms. **No additional numerical correction/recovery-cycle ceiling** — per the Rule 8 Assessment's recorded decision: *"NO additional numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin authorization are the governing limits."* (Plan §12–§13).
3. **Owner Portfolio.** Business Worth Evolution is the authoritative source: `Confirmed Contagem → BusinessWorthSnapshot → Current Business Worth → Owner Portfolio currentWorth`. Owner Portfolio must not maintain a competing Business Worth calculation — per the Rule 8 Assessment's recorded decision: *"Business Worth Evolution is authoritative. Owner Portfolio consumes that value rather than maintaining a competing Business Worth mechanism."* (Plan §7).
4. **Existing businesses.** Historical Capital Inicial remains untouched. An existing business may show Estimated Business Worth (State 1a, Case B) before its first new-model Contagem, without needing to perform one first (Specification §6, §9; Plan §7, §21).
5. **New Contagem.** A confirmed new-model Contagem establishes Current Business Worth based on what is actually, physically present at measurement — never replaced or averaged with the prior estimate (Plan §5, §6, §8).
6. **Fecho.** Latest Contagem/Business Worth baseline → governed activity → Owner-selected end date → Estimated Business Worth. Fecho is not a generic arbitrary-date-range profit report; an arbitrary sub-range request routes to the existing Reports module instead (Plan §9).
7. **Discrepancy.** Measured Current Business Worth is never replaced by the estimate; a discrepancy is preserved as a reconciliation signal, with evidence-supported possible-cause guidance and preventive notifications — never an automatic accusation or classification as fact (Plan §8).
8. **`BusinessWorthSnapshot` / `StockCount` separation.** `StockCount` remains the authoritative physical measurement record; `BusinessWorthSnapshot` is the authoritative frozen historical Business Worth result. The two are never merged into one record type (Specification Decision 10, §8; Plan §3.1).

**None of these decisions is reopened, weakened, or reinterpreted by this Authorization.** This section restates them for the implementer's direct reference; it does not re-decide them.

## 7. Incremental Implementation Sequence and Execution Rule

**This Authorization covers the complete capability. Execution does not.** Per the source BDR §10/Decision 35 and the Implementation Plan's own §24, implementation proceeds **one increment at a time**, in this exact order (reproduced from Plan §24, not re-derived):

1. **Foundation** — `producesBusinessWorthSnapshot` marker (Plan §4); `BusinessWorthSnapshot` collection, rules, and index (Plan §3.1, §14, §16); atomic snapshot-producing confirmation write (Plan §5); Current Business Worth read path (Plan §6). No UI change beyond making the marker settable.
2. **Estimated Business Worth + Dashboard/Owner Portfolio wiring** — Case A/B function (Plan §7); Dashboard card rewire and State-1a display (Plan §17); Owner Portfolio `currentWorth` rewire, resolving Finding 15-A (Plan §7, FR-60).
3. **Cash, Receivables, Payables** — all three new collections, rules, and indexes (Plan §3.2–§3.4, §14, §16); Contagem's cash-at-confirmation entry step (Plan §3.2); Estimated Business Worth extended to read these new inputs (designed in Increment 2, activated here).
4. **Multi-unit valuation (Mode A/B) design-and-build** (Plan §20) — the one increment requiring a dedicated design pass for Rule 8 open question #1 (§36 item 1) before implementation.
5. **Startup Investment** — `StartupInvestmentEntry` collection, rules, index; report-time aggregation function using the `historicalCapitalInicialDate → StockCount.createdAt` resolution (Plan §3.5).
6. **Fecho baseline-anchoring + `closings` immutability fix** — new `periodType` value, `startDate` derivation, `closings` rules fix (Plan §9, §10) — the rules fix lands in this increment specifically, since it is what makes FR-25 actually enforceable rather than merely UI-observed.
7. **Reconciliation signal, possible-cause guidance, preventive notifications** (Plan §8's function and the new notification producer/category).
8. **Owner 3-hour correction window + SuperAdmin 72-hour recovery** (Plan §12–§13), including the new parallel Authorization collection, grant route, and exclusivity-routing rules helper — deliberately last among the core mechanisms, since every earlier increment's data must already exist correctly for a correction/recovery to meaningfully act on.
9. **Auditability wiring across all of the above** (Plan §15) — its own pass across every write path introduced in Increments 1–8, so every `actionType` is named consistently in one review.

**For every increment, without exception:**

1. Read the increment's scope (above, and the cited Plan section(s)) before writing anything.
2. Verify its prerequisites — confirm every earlier increment it depends on is actually complete and verified, not merely started.
3. Implement **only** that increment's scope and its explicitly required dependencies — no increment may silently implement functionality belonging to a later increment unless the Plan explicitly names that dependency as required now.
4. Run the tests/verification the Plan's §22 names for that increment's scope.
5. Inspect the diff — confirm no file outside the increment's own stated scope was touched.
6. Verify governance compliance — re-check the increment's output against the specific FR(s)/Decision(s)/Finding(s) it claims to implement (Plan §25).
7. Record the result.
8. Only then proceed to the next increment.

**This Authorization does not permit implementing all nine increments in one pass, and does not permit treating this signature as license to bypass any of the eight steps above for any increment.**

## 8. Governance Boundary During Implementation

If, during implementation of any increment, a genuine problem is discovered that would change:

- business meaning,
- approved financial logic (including anything that would produce a result other than the §5 worked example),
- a security boundary,
- tenant isolation,
- recovery authority (the 3-hour/72-hour windows, or the "no additional ceiling" decision),
- historical meaning, or
- any approved Product Architect decision (§6, above) —

**implementation must stop.** The issue must be reported, not silently redesigned or decided, and returned for Product Architect review before proceeding. Ordinary implementation details — exact field names, exact route paths, exact index definitions, exact `actionType` strings, and the other items the Specification's §3/§37 and this Plan's own text already reserve for implementation time — may be resolved within the Plan's approved boundaries without triggering this stop condition.

## 9. No Redesign

Implementation must preserve, not redesign:

- the existing Dashboard's nine-KPI-card structure;
- the existing `+Stock` behavior and data model;
- the existing Stocks view as the Owner's review location for purchases;
- the existing Product Memory/UOM behavior (`BDR-0012`, `product-unit-of-measure-specification.md`);
- the existing Expense system and categories;
- the existing Quebra mechanism and valuation basis;
- the existing Levantamentos (Withdrawals) behavior;
- the existing Fecho/Closing architecture, extended only as Plan §9–§10 describe;
- the existing Void & Redo / SuperAdmin-Assisted Recovery governance (`POL-0008`/`POL-0009`), entirely unamended;
- the existing tenant/security architecture (`isMemberOf`/`isOwnerOf`).

This capability is an **evolution** of the existing product, implemented per the approved chain — not a new product, and not an occasion to improve, simplify, or restructure anything outside its own explicitly authorized scope.

## 10. Security

This Authorization does not grant general administrative editing rights to any role. Implementation must preserve:

- tenant isolation and `businessId` path-scoping for every new collection (Plan §18);
- Owner-only authorization for governed writes within the correction window (Plan §12);
- SuperAdmin's authorization-**only** role in recovery — SuperAdmin never becomes a general financial-data editor, and never writes directly to `BusinessWorthSnapshot` or `StockCount` (Plan §13, FR-42);
- historical immutability outside the governed correction/recovery windows, enforced at the Security Rules layer, not merely by UI omission (Plan §14, FR-44);
- every existing security boundary this capability does not explicitly, narrowly extend (Plan §18).

## 11. Historical Data

Historical Capital Inicial remains untouched. Historical Contagens remain untouched — no historical `StockCount` retroactively acquires a `producesBusinessWorthSnapshot: true` marker or a `BusinessWorthSnapshot` it did not produce at confirmation time (FR-19). No historical cash, receivable, payable, or Business Worth snapshot is ever fabricated for a period before this capability existed for a given business (Plan §21, §23). No historical record is reinterpreted merely because this model is being introduced (Specification HIST-3, HIST-4).

## 12. Acceptance Criteria Governing Completion

Every one of the Specification's own 31 Acceptance Criteria (§29) governs whether the complete, fully-implemented capability may be considered done — not repeated here in full, since repeating them would risk a transcription drift from the authoritative source. The following are called out because they are the criteria this Authorization's own §5–§6 make most directly binding on implementation, and are the ones most at risk of being silently violated by an incremental build:

- AC 8 / AC 9 — a stock purchase, cash- or credit-financed, is never counted as new Business Worth beyond its own embedded profit; the Estimated Business Worth formula has no double-counted purchase cost, no double-subtracted payment, no unpaid receivable counted.
- AC 17 — the Owner's 3-hour window and SuperAdmin's 72-hour ceiling are the sole governing limits, with no third, cycle-count ceiling.
- AC 22 — an existing business shows Estimated Business Worth immediately, without a new Contagem first.
- AC 23 — a new snapshot resets the estimate baseline permanently; no accumulation from an earlier baseline.
- AC 24 — Fecho's Estimated Business Worth uses the exact same formula/scope as any other read of it; an arbitrary sub-range request routes to Reports, not a new Fecho behavior.
- AC 25 / AC 26 — a reconciliation discrepancy surfaces evidence-supported possible causes, never an asserted fact; preventive reminders are non-accusatory and route through the existing Notifications module.
- AC 27 — recovery eligibility for any `StockCount` is determined exclusively by its own `producesBusinessWorthSnapshot` marker, never both mechanisms at once.
- AC 31 — Owner Portfolio's `currentWorth` never diverges from the same Current/Estimated Business Worth value the Dashboard reads for the same business.

## 13. Explicit Gate Statement

**As of §14's signature below, implementation of the complete Business Worth Evolution capability, strictly within §2's scope, §3's exclusions, and §7's one-increment-at-a-time discipline, is authorized.** Prior to this signature, no code, `firestore.rules`, `firestore.indexes.json`, or test file had been created, modified, or committed to produce this document or its companion Implementation Plan — that remains true as of the signature itself. Implementation of Increment 1 is the next, separate execution step this signature enables; it is not performed in this same governance step, and no increment beyond Increment 1 may begin until Increment 1's own verification (§7, steps 1–7) is complete and recorded.

## 14. Product Architect Signature

**Status:** ✅ **Signed and Authorized for Incremental Implementation.**

**Product Architect:** SABUSHIMIKE Masceni

**Date:** 22 August 2026

**Authorization decision (verbatim):**
> "I accept and authorize the Implementation Authorization for Business Worth Evolution & Measurement Model, for incremental implementation per the approved Implementation Plan sequence."

**Confirmed as part of this signature:**

- [x] The BDR is approved (Business Decision phase complete, all 35 decisions DECIDED).
- [x] POL-0010 is approved (drafted, numbered, all 35 decisions traced).
- [x] The Consolidated Specification is accepted (22 August 2026, twice-amended).
- [x] Rule 8 is READY FOR IMPLEMENTATION (both blockers resolved by explicit Product Architect decision).
- [x] The Implementation Plan has been reviewed and corrected (cash-ledger/`+Stock` mechanism clarified; prior traceability defects corrected).
- [x] This Authorization's scope (§2) is approved as stated, and its exclusions (§3) are approved as stated.
- [x] The approved financial behavior (§5) and every Product Architect decision restated in §6 are confirmed intact, unweakened, and unreopened.
- [x] Implementation is authorized to proceed **incrementally, one approved increment at a time** (§7) — this signature does not authorize implementing all nine increments, or any increment beyond Increment 1, in a single pass.
- [x] The governance boundary (§8), no-redesign requirement (§9), security preservation (§10), and historical-data preservation (§11) are all binding on every increment.

**Status:** AUTHORIZED FOR INCREMENTAL IMPLEMENTATION.

---

**This document, as signed, authorizes implementation strictly per §2's scope, §3's exclusions, and §7's incremental discipline.** No code has been written and no schema or `firestore.rules` change has been made as of the filing of this signed authorization. **The next operational action is: BEGIN IMPLEMENTATION INCREMENT 1 ONLY** (§7, item 1) — Increment 2 and every later increment remain unauthorized to begin until Increment 1 is implemented and verified per §7's own steps.
