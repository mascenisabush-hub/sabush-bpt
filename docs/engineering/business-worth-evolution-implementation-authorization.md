# Implementation Authorization — Business Worth Evolution & Measurement Model

**Status:** ✅ **Signed and Authorized for Incremental Implementation.** See §14 for the recorded Product Architect signature. Implementation of the complete Business Worth Evolution capability — strictly within §2's scope, §3's exclusions, and §7's mandatory one-increment-at-a-time discipline — is authorized as of this signature. **No code, `firestore.rules`, `firestore.indexes.json`, or test file has yet been created, modified, or committed** — signature is the governance gate that permits that next, separate execution step; it does not itself perform it, and it does not authorize performing more than Increment 1 before the next verification checkpoint (§7).
**Amendment Status (this pass): ✅ ACCEPTED (22 August 2026).** Following the Specification's own §41 amendment, the matching Rule 8 reconciliation, and the Implementation Plan's own §6/§7/§24/§25 correction (all Accepted 22 August 2026), this Authorization's §7 (Incremental Implementation Sequence) is updated below to mirror the Plan's corrected §24 verbatim — **Increment 1 now explicitly includes the minimum live Current Business Worth foundation** (the shared Current/Estimated calculation function, scoped to existing sources only), per explicit Product Architect direction. **The whole capability remains authorized; execution remains strictly one increment at a time; no increment moves earlier than Increment 1 except as this update states.** This reconciliation pass is now formally accepted — see §15, below, for the signed record.
**Governing chain:** [`BDR-pending-business-worth-evolution-measurement-model.md`](../specs/BDR-pending-business-worth-evolution-measurement-model.md) (✅ Business Decision phase complete, 35 decisions) → [`POL-0010`](../specs/POL-pending-business-worth-evolution-policy.md) (✅ Drafted, numbered, traces all 35 decisions) → [Consolidated Specification](../specs/business-worth-evolution-specification.md) (✅ **Accepted**, SABUSHIMIKE Masceni, 22 August 2026, including the §41 terminology-correction amendment, also Accepted) → [Rule 8 Assessment](./business-worth-evolution-rule8-assessment.md) (✅ **READY FOR IMPLEMENTATION**, both blockers resolved by explicit Product Architect decision, re-confirmed after the §41 reconciliation) → [Implementation Plan](./business-worth-evolution-implementation-plan.md) (drafted, reviewed, corrected — cash-ledger/`+Stock` mechanism clarified, traceability re-verified, §6/§7/§24 corrected per §41) → **this Authorization (originally Signed §14; §7 now updated below, PENDING re-acceptance)**.
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

**[Corrected and ACCEPTED by the §41 reconciliation pass, 22 August 2026 — Increment 1's boundary only, mirroring the Implementation Plan's own corrected §24 verbatim; Increments 2–9 unchanged in substance]** Per explicit Product Architect direction following the Specification's §41 amendment: *"Increment 1 must absorb the minimum live Current Business Worth foundation required by the accepted §41 Specification... Increment 1 must NOT implement the complete later Cash/Receivables/Payables capability. Increment 2 and later increments remain separate."*

**This Authorization covers the complete capability. Execution does not.** Per the source BDR §10/Decision 35 and the Implementation Plan's own §24, implementation proceeds **one increment at a time**, in this exact order (reproduced from Plan §24, not re-derived):

1. **Foundation + minimum live Current Business Worth.** `producesBusinessWorthSnapshot` marker (Plan §4); `BusinessWorthSnapshot` collection, rules, and index (Plan §3.1, §14, §16); atomic snapshot-producing confirmation write (Plan §5); **the shared Current/Estimated calculation function (Plan §6, §7), scoped in this increment to existing sources only — embedded profit, Expenses, Quebras, Levantamentos — with the Receivables/Payables/Cash position-change term correctly omitted (not zeroed) until Increment 3.** No UI change beyond making the marker settable — the Dashboard/Owner Portfolio *code* changes that consume this function remain Increment 2's own item.
2. **Broader Estimated Business Worth + Dashboard/Owner Portfolio wiring** — Case B (State 1a, no snapshot yet) added to the shared function Increment 1 already built (Plan §7); Dashboard card rewire and State-1a display, the actual component change (Plan §17); Owner Portfolio `currentWorth` rewire, resolving Finding 15-A, the actual `refreshShopWorth` code change (Plan §7, FR-60). This increment does not re-implement the shared function's own Case-A logic — that already exists from Increment 1; it adds Case B and performs the UI-facing wiring.
3. **Cash, Receivables, Payables — unchanged, still Increment 3, not moved earlier.** All three new collections, rules, and indexes (Plan §3.2–§3.4, §14, §16); Contagem's cash-at-confirmation entry step (Plan §3.2); the shared function extended to add the Receivables/Payables/Cash position-change term it has correctly omitted since Increment 1 — an additive parameter, not a rewrite of the function's own existing logic.
4. **Multi-unit valuation (Mode A/B) design-and-build** (Plan §20) — the one increment requiring a dedicated design pass for Rule 8 open question #1 (§36 item 1) before implementation.
5. **Startup Investment** — `StartupInvestmentEntry` collection, rules, index; report-time aggregation function using the `historicalCapitalInicialDate → StockCount.createdAt` resolution (Plan §3.5).
6. **Fecho baseline-anchoring + `closings` immutability fix** — new `periodType` value, `startDate` derivation, `closings` rules fix (Plan §9, §10) — the rules fix lands in this increment specifically, since it is what makes FR-25 actually enforceable rather than merely UI-observed.
7. **Reconciliation signal, possible-cause guidance, preventive notifications** (Plan §8's function and the new notification producer/category).
8. **Owner 3-hour correction window + SuperAdmin 72-hour recovery** (Plan §12–§13), including the new parallel Authorization collection, grant route, and exclusivity-routing rules helper — deliberately last among the core mechanisms, since every earlier increment's data must already exist correctly for a correction/recovery to meaningfully act on.
9. **Auditability wiring across all of the above** (Plan §15) — its own pass across every write path introduced in Increments 1–8, so every `actionType` is named consistently in one review.

**Why this resequencing is not a new business decision:** the formula Increment 1 now partially implements (the shared function) was already fully decided by the Specification (§9's Case A, unamended in substance by §41). What moved is *which increment builds which piece of already-decided logic* — an ordinary engineering sequencing choice, not a new formula, ceiling, storage mechanism, or non-double-counting rule.

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

## 15. §41 Reconciliation — ACCEPTED

**This section, and the corrected §7 above, were NOT covered by §14's original 22 August 2026 signature** — that signature authorized the Increment 1 boundary as it existed *before* the Specification's §41 amendment. Following §41's acceptance and the matching Rule 8 and Implementation Plan reconciliations (all also 22 August 2026), §7 above is updated to mirror the Plan's corrected §24 verbatim: **Increment 1 now explicitly includes the minimum live Current Business Worth foundation** — the shared Current/Estimated calculation function, scoped to existing sources only (embedded profit, Expenses, Quebras, Levantamentos), with the Receivables/Payables/Cash position-change term correctly omitted until Increment 3.

**What remained unchanged throughout and was never in question:** §2's scope (unchanged in substance), §3's exclusions (unchanged), §5's approved financial behavior (unchanged), §6's eight restated Product Architect decisions (none reopened, none reworded), §8's governance boundary, §9's no-redesign requirement, §10's security preservation, §11's historical-data preservation, and Increments 2–9's own content (unchanged in substance — no increment other than Increment 1 is affected by this reconciliation).

**Formal acceptance, recorded here separately from §14 since it covers only §7's updated Increment 1 boundary:**

> I have reviewed the §41 reconciliation correction to this Implementation Authorization (§7's updated Increment 1 boundary, mirroring the Implementation Plan's own corrected §24). I confirm it introduces no new business decision, does not move any increment other than Increment 1 earlier, preserves the whole-capability authorization and the one-increment-at-a-time discipline, and accurately reflects the accepted Specification's §41 meaning. This update is **ACCEPTED and APPROVED**.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 22 August 2026

**Status:** ✅ **ACCEPTED.**

The whole-capability authorization stated throughout this document (§2, §13, §14) was never withdrawn — the complete Business Worth Evolution capability remains authorized, and execution remains strictly one increment at a time. §7's corrected Increment 1 boundary is now, as of this acceptance, fully authorized alongside the rest of this document.

**This document's original signature (§14), together with §15's now-accepted update to §7, together authorize implementation strictly per §2's scope, §3's exclusions, and §7's (corrected) incremental discipline.** No code has been written and no schema or `firestore.rules` change has been made as of this acceptance. **The next operational action, once separately instructed, is: BEGIN IMPLEMENTATION INCREMENT 1 ONLY, per §7's corrected scope** — Increment 2 and every later increment remain unauthorized to begin until Increment 1 is implemented and verified per §7's own steps. This acceptance itself does not begin coding; it clears the governance gate that a future, separate instruction to start Increment 1 will act on.

---

## 16. Post-Implementation Correction — Finding 3, Option A — ACCEPTED

**Scope note, to avoid a numbering collision:** this "Finding 3" is unrelated to the Rule 8 Assessment's own Finding 3-A (autosave/draft-recovery/idempotent-finalization, §"Recovery Safety" §3 of that document) — it is a distinct, later finding, discovered by direct code review of the already-shipped Increment 1–4 implementation (`4186357`, `c337ba8`, `49fb8ab`, all already authorized and merged under this same Authorization). It is recorded here, as a new section, rather than under the Rule 8 Assessment's existing Finding 3 heading, precisely so it is not confused with that unrelated finding.

**Finding.** `BusinessWorthSnapshotProductValuationLine.totalValue` (the per-product drill-down line frozen onto every `BusinessWorthSnapshot.productValuationDetail`) was constructed as a direct pass-through of the source Stock Count item's own cost-basis `totalValue` (`quantity × costPrice` — the investment basis `normalizeStockCountItems` computes for Expected Current Stock Value). The snapshot's own headline `productValuationTotal`, however, is — and always was, since Increment 1 — the selling-basis figure (`normalizeStockCountItems`'s `totalSellingValue`, `quantity × sellingPrice`, summed). Whenever a product's `costPrice` and `sellingPrice` differ, the drill-down's own line totals could never sum to the snapshot's own headline total — the detail did not mathematically reconcile with the figure it exists to explain.

**Product Architect Decision: Option A — SELLING-BASIS (accepted).**

> For every `BusinessWorthSnapshotProductValuationLine`:
>
>     totalValue = quantity × sellingPrice
>
> This is the same selling-basis valuation used by the authoritative `productValuationTotal`.

**Rationale (recorded verbatim from the accepted decision):** the snapshot drill-down must reconcile mathematically with `productValuationTotal`, which is already the authoritative selling-basis valuation. This prevents an Owner from seeing detail lines whose totals do not reconcile with the Business Worth headline.

**What this decision explicitly does NOT change** (restated per the decision's own terms — none of the following was touched, redesigned, or reopened by this correction):
- the Business Worth economic formula;
- `productValuationTotal`;
- `measuredBusinessWorth`;
- Current Business Worth;
- Estimated Business Worth;
- `costPrice` itself — **remains preserved as its own field on the line, unchanged, not deleted or redefined**; only `totalValue`'s own meaning changed;
- physical `quantity`;
- `unit`;
- `valuationMode`;
- historical snapshot immutability (no historical snapshot is backfilled or rewritten — this correction governs how a line is *computed going forward*, exactly like every other Increment 1–4 field-level fix in this capability's own history);
- any Cash Ledger / Receivables / Payables behavior;
- any Increment 5+ scope.

**Classification: a clarification/acceptance of Finding 3, not a new business rule.** `productValuationTotal`'s selling-basis meaning was already decided (Increment 1, Specification §8/FR-18–19) and already implemented, unchanged by this correction. This decision settles only which of two *already-approved, already-computed* bases (`normalizeStockCountItems` has always computed both, in parallel, since the Initial Stock Dual-Valuation-Basis capability) a single *other* field — `totalValue` on the drill-down line — should mirror, so that field agrees with a total the Specification already authoritatively defines. No new financial concept, ceiling, formula, or figure is introduced; Section 9 ("No Redesign") above is not implicated.

**Already-implemented correction this decision formally records:** `apps/tenant/src/utils/calculations.ts`'s new pure `buildProductValuationDetail()` function (alongside the existing `computeMeasuredBusinessWorth`), used by `AppContext.tsx`'s `recordStockCount` to construct `productValuationDetail`; `BusinessWorthSnapshotProductValuationLine.totalValue` is now `quantity × sellingPrice`, `Number(...).toFixed(2)`-rounded per line, exactly matching this section's decision. Regression coverage: `tests/business-worth-snapshot-product-valuation-line.test.ts` — proves `totalValue === quantity × sellingPrice` per line, proves the summed line totals reconcile exactly to `productValuationTotal` (computed via the real `normalizeStockCountItems`, not reimplemented), and proves `totalValue` follows `sellingPrice` rather than `costPrice` when they diverge. Commit `0a78cdf`.

**Formal acceptance:**

> I have reviewed Finding 3 (`BusinessWorthSnapshotProductValuationLine.totalValue` not reconciling with `productValuationTotal` whenever `costPrice` and `sellingPrice` diverge) and select **Option A — SELLING-BASIS**: `totalValue = quantity × sellingPrice`, matching `productValuationTotal`'s own already-authoritative basis. This is a clarification of an already-approved figure's construction, not a new business decision — it introduces no new financial concept, changes no economic formula, and does not reopen `productValuationTotal`, `measuredBusinessWorth`, Current/Estimated Business Worth, `costPrice`, or any Increment 5+ scope. **ACCEPTED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **ACCEPTED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected — this section records a field-level construction correction within already-authorized, already-implemented Increments 1–4; it does not reopen, extend, or advance the incremental sequence. Increment 5 remains unauthorized to begin until separately instructed.

---

## 17. Product Architect Authorization — Increment 5

**Increment 5: STARTUP INVESTMENT**

**Status:** ✅ **AUTHORIZED TO BEGIN.**

**Prerequisite confirmation:**
- [x] Increment 1 is complete (`4186357`, plus the corrective commits `779c542`, `4b77b54`, `4a99430`).
- [x] Increment 2 is complete (`ba2c130`).
- [x] Increment 3 is complete (`c337ba8`).
- [x] Increment 4 is complete (`49fb8ab`).
- [x] Increment 5 is now authorized to begin.

**This authorization means, and means only:**
- Implementation remains strictly **one increment at a time** (§7) — Increment 6 and every later increment remain unauthorized to begin.
- This authorization does **not** authorize implementation of the whole Business Worth Evolution capability at once.
- This authorization does **not** change any business decision.
- This authorization does **not** amend the Startup Investment economic rules.
- Implementation must follow the already-approved Specification, Rule 8 Assessment, Implementation Plan, and this Authorization — none of which are reopened, reinterpreted, or amended by this section.

**Increment 5 scope, explicitly preserved as already approved (not restated in substance, not redesigned):**
- `StartupInvestmentEntry` collection — fields per Specification §13 / Plan §3.5.
- The approved report-time aggregation (never a duplicated ledger, per FR-16): `Σ(pre-baseline PurchaseBatch original-investment totals) + Σ(pre-baseline Expense totals) + Σ(StartupInvestmentEntry.amount)`.
- The approved `historicalCapitalInicialDate → StockCount.createdAt` date-window resolution for existing businesses (Rule 8 Finding 6-A — `createdAt`, not `confirmedAt`, since `createdAt` is unconditionally set on every `StockCount` with no legacy-absence exception).
- FR-17's boundary: `StartupInvestmentEntry` is reserved exclusively for spending with no existing Product/Stock/Expense record — never a general-purpose alternative to Expense recording.
- FR-52's boundary: no code path may compute or display a Startup-Investment-vs-Business-Worth "shortfall," "loss," or "performance" figure — the two totals remain independent, separately-labeled measurements only.
- Rule 8 Finding 6-A is resolved and is not reopened by this section.

**No requirement above is added to, removed from, or reinterpreted by this authorization.**

**Formal acceptance:**

> I authorize Increment 5 — Startup Investment — to begin, per the already-approved scope in Specification §13, Plan §3.5, and Rule 8 Finding 6-A. Increments 1–4 are confirmed complete. Implementation remains strictly one increment at a time; Increment 6 and all later increments remain unauthorized. This authorization introduces no new business decision, does not amend the Startup Investment economic rules (including FR-16, FR-17, FR-52), and does not reopen Finding 3 / Option A (`BusinessWorthSnapshotProductValuationLine.totalValue = quantity × sellingPrice`), which remains intact. **AUTHORIZED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **AUTHORIZED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected. §16's Finding 3 / Option A correction is unaffected and remains intact. This section authorizes only Increment 5's own beginning, per §7's one-increment-at-a-time discipline — Increments 6–9 remain unauthorized to begin until each is separately instructed in turn.

---

## 18. Product Architect Authorization — Increment 6

**Increment 6: FECHO**

**Status:** ✅ **AUTHORIZED TO BEGIN.**

**Prerequisite confirmation:**
- [x] Increment 1 is complete (`4186357`, plus the corrective commits `779c542`, `4b77b54`, `4a99430`).
- [x] Increment 2 is complete (`ba2c130`).
- [x] Increment 3 is complete (`c337ba8`).
- [x] Increment 4 is complete (`49fb8ab`).
- [x] Increment 5 is complete and authorized (§17, above).
- [x] Increment 6 is now authorized to begin.

**This authorization means, and means only:**
- Implementation remains strictly **one increment at a time** (§7) — Increment 7 and every later increment remain unauthorized to begin.
- This authorization does **not** authorize implementation of the whole Business Worth Evolution capability at once.
- This authorization does **not** change any business decision.
- This authorization does **not** introduce any new business rule, financial formula, ceiling, correction mechanism, reconciliation mechanism, notification mechanism, recovery mechanism, or auditability mechanism.
- Implementation must follow the already-approved Specification, Rule 8 Assessment, Implementation Plan, and this Authorization — none of which are reopened, reinterpreted, or amended by this section.

**Increment 6 scope, explicitly preserved as already approved (not restated in substance, not redesigned):**
- Fecho baseline-anchored custom reporting range — Specification §18, FR-25–FR-27, FR-53, FR-54; Plan §9.
- The additive `ClosingPeriodType` value (illustrative: `'custom'`) — confirmed clean by direct inspection against `closingNotificationProducer.ts`'s existing `periodType` switch, requiring zero code change to that consumer (Rule 8 Finding 8-A).
- `'custom'`-type `Closing.startDate` populated exclusively from the active baseline's own date (latest `BusinessWorthSnapshot.confirmedAt`, or the historical Capital Inicial baseline date for a State-1a business) — never independently owner-chosen (FR-25).
- The existing double-close guard (`isPeriodClosed`, keyed on `periodType`+`startDate`+`endDate`) reused unmodified for the new value (FR-26).
- Fecho's reported Estimated Business Worth computed via the exact same §7/Specification §9 shared calculation function, evaluated as of the selected end date — never a separately re-filtered calculation (FR-53); an arbitrary historical sub-range profit request routes to the existing Reports module, never a new Fecho behavior (FR-54).
- The `closings` field-level immutability fix (Plan §10, resolving Rule 8 Finding 8-B) — extending `firestore.rules`' `closings.allow update` rule with the same per-field immutability-lock pattern the `notifications` collection already demonstrates, landing in this increment specifically because it is what makes FR-25 actually enforceable rather than merely UI-observed.
- Rule 8 Findings 8-A and 8-B are resolved and are not reopened by this section.

**No requirement above is added to, removed from, or reinterpreted by this authorization.**

**Formal acceptance:**

> I authorize Increment 6 — Fecho — to begin, per the already-approved scope in Specification §18, Plan §9 and §10, and Rule 8 Findings 8-A and 8-B. Increments 1–5 are confirmed complete/authorized. Implementation remains strictly one increment at a time; Increment 7 and all later increments remain unauthorized. This authorization introduces no new business rule, financial formula, ceiling, correction mechanism, reconciliation mechanism, notification mechanism, recovery mechanism, or auditability mechanism, and does not reopen §16's Finding 3 / Option A or §17's Increment 5 authorization, both of which remain intact. **AUTHORIZED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **AUTHORIZED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected. §16's Finding 3 / Option A correction and §17's Increment 5 authorization are unaffected and remain intact. This section authorizes only Increment 6's own beginning, per §7's one-increment-at-a-time discipline. Increment 7 — Reconciliation / Notifications — remains unauthorized. Increment 8 — Correction / Recovery — remains unauthorized. Increment 9 — Auditability — remains unauthorized. Increments 7–9 remain unauthorized to begin until each is separately instructed in turn. This section authorizes implementation to begin; it does not itself implement any code.

---

## 19. Product Architect Authorization — Increment 7

**Increment 7: RECONCILIATION / NOTIFICATIONS**

**Status:** ✅ **AUTHORIZED TO BEGIN.**

**Prerequisite confirmation:**
- [x] Increment 1 is complete (`4186357`, plus the corrective commits `779c542`, `4b77b54`, `4a99430`).
- [x] Increment 2 is complete (`ba2c130`).
- [x] Increment 3 is complete (`c337ba8`).
- [x] Increment 4 is complete (`49fb8ab`).
- [x] Increment 5 is complete and authorized (§17, above).
- [x] Increment 6 is complete and authorized (§18, above; `b2578d0`, `a060c96`).
- [x] Increment 7 is now authorized to begin.

**This authorization means, and means only:**
- Implementation remains strictly **one increment at a time** (§7) — Increment 8 and every later increment remain unauthorized to begin.
- This authorization does **not** authorize implementation of the whole Business Worth Evolution capability at once.
- This authorization does **not** change any business decision.
- This authorization does **not** introduce any new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism.
- Implementation must follow the already-approved Specification, Rule 8 Assessment, Implementation Plan, and this Authorization — none of which are reopened, reinterpreted, or amended by this section.

**Increment 7 scope, explicitly preserved as already approved (not restated in substance, not redesigned):**
- Contagem Reconciliation Signal — Specification §22, FR-31, FR-32; Plan §8; Authorization §7 item 7.
- The cash-position comparison (Specification §3.2/§22) and `BusinessWorthSnapshot.difference` (measured − estimated-immediately-before, Plan §5) are recorded and displayed as a signed numeric difference with no default classification beyond "reconciliation signal" — never automatically labeled theft, loss, error, or Quebra (FR-32).
- Possible-cause guidance (FR-56) — a non-exhaustive, evidence-supported list of possible causes to investigate, drawn only from what the business's own existing records can actually evidence; never presented as a determined fact unless those records already establish it as fact (Specification §22's "Possible-cause guidance" decision, 22 August 2026).
- Preventive notifications (FR-57) — extending the existing, real, shipped Notifications platform (`server/notificationPlatform.ts`, `NotificationContext.tsx`, `deliveryChannel.ts`, and the three existing producers — `trialNotificationProducer.ts`, `closingNotificationProducer.ts`, `breakageNotificationProducer.ts`) with one new producer following the identical "derive facts, call `writeNotification`" shape, and one new additive `NotificationCategory` entry, following the exact precedent the `'staff'` category amendment already used — never a new, parallel notification system (Rule 8 Current State Assessment, §1 item 13; Rule 8 open question #9, resolved low-risk/precedented).
- The authoritative Business Worth path (Contagem/Snapshot → Current/Estimated Business Worth → approved financial activity → Fecho/other approved events) is not altered, superseded, or duplicated by this increment — reconciliation identifies and reports differences; it does not become a second source of truth and does not mutate `BusinessWorthSnapshot.measuredBusinessWorth`, Current Business Worth, Estimated Business Worth, historical StockCounts, historical financial records, or Fecho records, unless the Specification explicitly authorizes a particular mutation (none does, for this increment).

**No requirement above is added to, removed from, or reinterpreted by this authorization.**

**Formal acceptance:**

> I authorize Increment 7 — Reconciliation / Notifications — to begin, per the already-approved scope in Specification §22 (FR-31, FR-32, FR-56, FR-57), Plan §8 and §24 item 7, Authorization §7 item 7, and the Rule 8 Current State Assessment's confirmation that the existing Notifications platform is the correct extension point. Increments 1–6 are confirmed complete/authorized. Implementation remains strictly one increment at a time; Increment 8 and all later increments remain unauthorized. This authorization introduces no new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism, and does not reopen §16's Finding 3 / Option A or §17's/§18's Increment 5/6 authorizations, all of which remain intact. **AUTHORIZED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **AUTHORIZED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected. §16's Finding 3 / Option A correction, §17's Increment 5 authorization, and §18's Increment 6 authorization are unaffected and remain intact. This section authorizes only Increment 7's own beginning, per §7's one-increment-at-a-time discipline. Increment 8 — Correction / Recovery — remains unauthorized. Increment 9 — Auditability — remains unauthorized. Increments 8–9 remain unauthorized to begin until each is separately instructed in turn. This section authorizes implementation to begin; it does not itself implement any code.

---

## 20. Product Architect Authorization — Increment 8

**Increment 8: CORRECTION / RECOVERY**

**Status:** ✅ **AUTHORIZED TO BEGIN.**

**Prerequisite confirmation:**
- [x] Increment 1 is complete (`4186357`, plus the corrective commits `779c542`, `4b77b54`, `4a99430`).
- [x] Increment 2 is complete (`ba2c130`).
- [x] Increment 3 is complete (`c337ba8`).
- [x] Increment 4 is complete (`49fb8ab`).
- [x] Increment 5 is complete and authorized (§17, above).
- [x] Increment 6 is complete and authorized (§18, above; `b2578d0`, `a060c96`).
- [x] Increment 7 is complete and authorized (§19, above; implementation commit `ba61fe4`).
- [x] Increment 8 is now authorized to begin.

**This authorization means, and means only:**
- Implementation remains strictly **one increment at a time** (§7) — Increment 9 remains unauthorized to begin.
- This authorization does **not** authorize implementation of the whole Business Worth Evolution capability at once.
- This authorization does **not** change any business decision.
- This authorization does **not** introduce any new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism.
- Implementation must follow the already-approved Specification, Rule 8 Assessment, Implementation Plan, and this Authorization — none of which are reopened, reinterpreted, or amended by this section.

**Increment 8 scope, explicitly preserved as already approved (not restated in substance, not redesigned):**
- Owner 3-Hour Correction Window — Specification §25, FR-38, FR-39, I-7; Plan §12; Authorization §7 item 8. A governed correction path against a `BusinessWorthSnapshot` (and its underlying `StockCount`) available to the Owner only while `now < correctionWindowExpiresAt` — a correction produces a **new** `BusinessWorthSnapshot` via `supersedesSnapshotId`, never an edit-in-place to the original's frozen fields. Structurally the same *kind* of mechanism as `BDR-0015`'s Void & Redo, but its own distinct figure and its own distinct mechanism — it does not amend Void & Redo's own 12-hour Initial-Stock-specific window.
- SuperAdmin-Authorized Recovery, 72-Hour Ceiling — Specification §26, FR-40 through FR-43, FR-58; Plan §13; Authorization §7 item 8. A new, separate, parallel collection (e.g. `businesses/{businessId}/businessWorthRecoveryAuthorizations/{id}`), deliberately the identical shipped pattern `POL-0009`'s existing Initial-Stock Authorization design already establishes, reused with a new collection name — never merged with, never interacting with, that existing collection (FR-43). SuperAdmin authorizes → Owner performs the recovery/edit → Owner confirms; SuperAdmin's write surface never includes a write to any `BusinessWorthSnapshot`/`StockCount` field, only to the Authorization artifact itself (FR-42).
- Recovery exclusivity (FR-58, Specification Decision 2, §26) — eligibility for any `StockCount` is determined exclusively by its own `producesBusinessWorthSnapshot` marker: `true` routes exclusively to this increment's §25–§26 mechanism; absent/`false` routes exclusively to the existing, entirely-unchanged `POL-0008`/`POL-0009` Void & Redo mechanism. No `StockCount` is ever eligible for both at once.
- **No correction/recovery-cycle ceiling** — per the Product Architect decision already recorded in the Rule 8 Assessment (Finding 4-B, RESOLVED) and Specification §26/§30b: *"NO additional numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin authorization are the governing limits."* This authorization introduces no new figure here either — the two already-approved windows remain the sole governing limits. The unbounded-chain risk this decision knowingly accepts (not silently dropped) is unchanged by this section; ordinary rate-limiting/auditability discipline applies at implementation time, not as a business rule.
- `POL-0008`/`POL-0009`'s own existing figures (12-hour window, 3-cycle/4-confirmation ceiling, 48-hour SuperAdmin authorization duration) are entirely unamended by this increment (Specification §26, REC-3).

**No requirement above is added to, removed from, or reinterpreted by this authorization.**

**Formal acceptance:**

> I authorize Increment 8 — Correction / Recovery — to begin, per the already-approved scope in Specification §25–§26 (FR-38 through FR-43, FR-58), Plan §12–§13 and §24 item 8, Authorization §7 item 8, and the Rule 8 Assessment's own resolved findings (4-A, 4-B, 10-B). Increments 1–7 are confirmed complete/authorized, including Increment 7's implementation commit `ba61fe4`. Implementation remains strictly one increment at a time; Increment 9 remains unauthorized. This authorization introduces no new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism, and does not reopen §16's Finding 3 / Option A or §17's/§18's/§19's Increment 5/6/7 authorizations, all of which remain intact. **AUTHORIZED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **AUTHORIZED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected. §16's Finding 3 / Option A correction, §17's Increment 5 authorization, §18's Increment 6 authorization, and §19's Increment 7 authorization are unaffected and remain intact. This section authorizes only Increment 8's own beginning, per §7's one-increment-at-a-time discipline. Increment 9 — Auditability — remains unauthorized to begin until separately instructed. This section authorizes implementation to begin; it does not itself implement any code.

---

## 21. Product Architect Authorization — Increment 9

**Increment 9: AUDITABILITY**

**Status:** ✅ **AUTHORIZED TO BEGIN.**

**Prerequisite confirmation — re-verified, not merely re-investigated:**
- [x] Increment 1 is complete (`4186357`, plus the corrective commits `779c542`, `4b77b54`, `4a99430`).
- [x] Increment 2 is complete (`ba2c130`).
- [x] Increment 3 is complete (`c337ba8`).
- [x] Increment 4 is complete (`49fb8ab`).
- [x] Increment 5 is complete and authorized (§17, above).
- [x] Increment 6 is complete and authorized (§18, above; `b2578d0`, `a060c96`).
- [x] Increment 7 is complete and authorized (§19, above; implementation commit `ba61fe4`).
- [x] Increment 8 is complete and closed (§20, above; implementation commits `4a40293`, `957897e`) — independently re-verified this session: branch `main`, working tree clean, HEAD matched `origin/main` at commit `957897e` before this section was recorded; all Increment 8 tests (53 pure-logic/source-inspection, plus 209 tests across five Firestore Rules Emulator suites — `business-worth-snapshot-foundation`, `periodic-stock-finalization`, `open-batch-concurrency`, `supplier-wording-confirmation-concurrency`, and the full `test:rules` suite) confirmed passing against real Firestore semantics, not merely source inspection.
- [x] Increment 9 is now authorized to begin.

**This authorization means, and means only:**
- Increment 9 is the **final** increment in the approved sequence (§7's own numbered list ends at item 9; the Implementation Plan's §24 defines no Increment 10 or later). This section authorizes Increment 9 alone — it does **not** authorize, imply, or create any Increment 10 or further future work. No such increment exists in the governance chain for this section to reference.
- Implementation remains strictly **one increment at a time** (§7) — this section closes out the incremental sequence; there is no next increment to remain unauthorized, and none is implied by the completion of this one.
- This authorization does **not** authorize implementation of the whole Business Worth Evolution capability at once (§7's own standing prohibition, already stated, unaffected).
- This authorization does **not** change any business decision.
- This authorization does **not** introduce any new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism beyond what the Specification/Rule 8 Assessment/Implementation Plan already approve.
- Implementation must follow the already-approved Specification, Rule 8 Assessment, Implementation Plan, and this Authorization — none of which are reopened, reinterpreted, or amended by this section.

**Increment 9 scope, explicitly preserved as already approved (not restated in substance, not redesigned):**
- Extends the existing `platform_audit_log` schema (`actorUid`, `actorRole`, `actionType`, `justification`, server `timestamp`) rather than inventing a new audit mechanism — Specification §34; Plan §15; Rule 8 Finding 11-A (Class A, not a blocker).
- **Minimum audit-recorded events (Specification §34, FR-48; Plan §15), across every write path introduced in Increments 1–8, reviewed in one consistent pass rather than piecemeal per increment (Plan §24 item 9):**
  - A Contagem confirmation that produces a `BusinessWorthSnapshot`.
  - An Owner correction within the 3-hour window (§25).
  - A SuperAdmin recovery-Authorization grant, consumption, or unconsumed expiry (§26).
  - A `Receivable`/`Payable` payment event.
  - Any reconciliation-signal event (§22).
  - Any preventive-notification dispatch tied to a discrepancy or an outstanding operational gap (§22).
- **FR-48**: every event named above must produce a permanent, append-only audit record, distinguishable by event type and business, using existing audit infrastructure where its shape already fits.
- Proposed `actionType` values follow the existing `support_session.issued`-style naming convention (e.g. `business_worth_recovery.authorized`, `business_worth_recovery.consumed`, `business_worth_recovery.expired`) — the exact strings are an Implementation Plan detail, not decided here (Plan §15's own explicit deferral).

**Explicitly NOT decided by this authorization — left to implementation, per the existing governance chain's own deferral, not invented or resolved here:**
- The exact `actionType` string for each event (Plan §15).
- Whether Contagem-confirmation-level (Owner-initiated, not SuperAdmin-initiated) events belong in the existing `platform_audit_log` collection or a separate tenant-scoped audit trail — Rule 8's own open question §36 item 7, classified Class A (resolvable within Rule 8/Implementation's own technical authority, not a blocking Product Architect decision; Rule 8 Assessment §4 row 7: "Yes... Existing schema already fits (Finding 11-A). Implementation Plan detail.").
- No new numerical ceiling, retention period, or deletion/redaction mechanism is introduced by this authorization — the existing `platform_audit_log`'s own append-only, non-deletable discipline (already governing every other audited action in this codebase) applies unmodified; this Specification does not decide otherwise and this section does not invent an exception.

**No unresolved Product Architect decision or governance contradiction was found for Increment 9.** The Specification (§34), Rule 8 Assessment (Finding 11-A, §36 item 7's own resolution), and Implementation Plan (§15, §24 item 9) are mutually consistent — every open item is classified as an implementation-time technical detail already within Rule 8/Implementation's own authority, never a re-opened business decision. Nothing here was mechanically invented or reinterpreted to force a resolution — where the chain itself defers a detail to implementation time, this section preserves that deferral rather than resolving it.

**No requirement above is added to, removed from, or reinterpreted by this authorization.**

**Formal acceptance:**

> I authorize Increment 9 — Auditability — to begin, per the already-approved scope in Specification §34 (FR-48), Plan §15 and §24 item 9, Authorization §7 item 9, and the Rule 8 Assessment's own resolved finding (11-A). Increments 1–8 are confirmed complete/closed, independently re-verified this session including Increment 8's full Firestore Rules Emulator verification (209 tests, five suites, all passing). Increment 9 is the final increment in the approved sequence — no Increment 10 or later is authorized, implied, or referenced by this section. This authorization introduces no new business rule, financial formula, ceiling, correction mechanism, recovery mechanism, or auditability mechanism beyond what is already approved, and does not reopen §16's Finding 3 / Option A or §17's/§18's/§19's/§20's Increment 5/6/7/8 authorizations, all of which remain intact. **AUTHORIZED.**
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **AUTHORIZED.**

The whole-capability authorization stated throughout this document (§2, §13, §14, §15) is unaffected. §16's Finding 3 / Option A correction, §17's Increment 5 authorization, §18's Increment 6 authorization, §19's Increment 7 authorization, and §20's Increment 8 authorization are unaffected and remain intact. This section authorizes only Increment 9's own beginning, per §7's one-increment-at-a-time discipline — and, being the final increment in the approved sequence, closes that discipline out rather than opening a further unauthorized increment. This section authorizes implementation to begin; it does not itself implement any code.

---

# Implementation Authorization Amendment — Revision 3 (Increment 10 + Post-Implementation Corrections)

**Status: ✅ SIGNED AND AUTHORIZED (23 August 2026).** Signed by explicit Product Architect signature (§10, below). This amendment is, as of this signature, authoritative Implementation Authorization content, appended per this document's own established pattern (§15 §41-reconciliation, §16 Post-Implementation Correction, §17–§21 per-increment authorizations). **This signature is the governance authorization gate. It does not by itself instruct implementation to begin.** Implementation may begin only upon a further, separate, explicit instruction identifying the specific Increment 10 item or Post-Implementation Correction to execute, per §23's own one-item-at-a-time execution rule.

**Target of this amendment:** `docs/engineering/business-worth-evolution-implementation-authorization.md`, as new dated sections to be appended there once signed — following that document's own established pattern (§15 §41-reconciliation, §16 Post-Implementation Correction, §17–§21 per-increment authorizations). This amendment is now recorded in this file itself. No code, test, `firestore.rules`, `firestore.indexes.json`, or other implementation artifact is touched by this document, and none is authorized to be touched by this document alone — a signature on this draft is the governance gate; it is not itself the instruction to begin coding, exactly as the existing §14/§15 signatures already establish for Increments 1–9 ("signature is the governance gate that permits that next, separate execution step; it does not itself perform it").

**Governing basis, in order:** BDR (`5870bdd`, Decision 1 corrected, Decision 36 added) → Specification (`5870bdd`, §42/§43 and inline corrections) → Rule 8 Assessment Addendum — Revision 3 (✅ **ACCEPTED**, gate `READY AFTER DECISIONS`, all three acknowledgment points accepted, SABUSHIMIKE Masceni, 23 August 2026) → Implementation Plan Amendment — Revision 3 (✅ **ACCEPTED AND SIGNED**, SABUSHIMIKE Masceni, 23 August 2026, including the Owner-Declared UI decision recorded there) → **this Authorization Amendment (✅ SIGNED, §10)**.

**One umbrella Authorization, extended, not replaced (per BDR Decision 35 / existing Authorization header's own "one umbrella Authorization, not nine" statement):** this amendment does not create a second, separate Implementation Authorization. It extends the single existing signed Authorization with new sections for Increment 10 and the two Post-Implementation Corrections, exactly as §15–§21 already extended it for the §41 reconciliation and Increments 5–9. §2 (Scope), §3 (Exclusions), §5 (Approved Financial Behavior), §6 (Restated Decisions), §8–§11 (Governance Boundary, No Redesign, Security, Historical Data) from the existing Authorization remain unchanged in substance and are not restated in full here — only extended where Revision 3 requires (§22, below).

---

## 22. What This Amendment Adds to §23's Scope

The existing Authorization's §2 ("What This Authorization Covers — Complete Umbrella Scope") is extended to include, for the first time:

- Owner-Declared Business Worth as a second snapshot-establishment method (BDR Decision 36; Specification §42.1, FR-61).
- Opening-balance / other-obligation `Payable` origins (Specification §42 Decision 12, FR-62).
- The `OwnerInvestment` collection and its live-formula/drill-down integration (Specification §43, FR-63–66).
- Recurring 30-day receivable reminders, including the new `Receivable.lastReminderSentAt` field (Specification §22/FR-57 as amended).
- Deterministic Contagem cost-basis conversion for multi-portion entries (Specification §15/FR-67).
- Fecho batch-level profit attribution (Specification §18/FR-68).
- Dashboard/report three-surface terminology correction (Specification §32).
- **Two Post-Implementation Corrections** to already-shipped Increment 6 and Increment 4 behavior (§24, §25 below) — these are corrections within the existing umbrella, not new capability, but are named here explicitly since the original §2 (in the base Implementation Authorization) did not anticipate a correction to already-shipped code at drafting time.

**§3's exclusions (existing Authorization) are unchanged and are not loosened by this amendment** — this remains a Business Worth measurement capability only; nothing above introduces POS, checkout, invoicing, payroll, full accounting, or ERP functionality, and Owner Portfolio remains completely outside this amendment's scope, exactly as the Specification's own preservation list (Part C, original Revision 3 draft) requires.

---

## 23. Product Architect Authorization — Increment 10

**Scope (implements Implementation Plan Amendment — Revision 3, Parts A):**

1. Owner-Declared Business Worth: `businessWorthSnapshots.allow create` second branch (Plan Amendment §A.1); dedicated "Declare Business Worth" entry point/screen, structurally separate from the Contagem data-entry flow — **per the Product Architect's own explicit decision, recorded in full at §6 below, this is not a mode/toggle inside Contagem.**
2. Opening-balance / other-obligation `Payable`s: extended `payables.allow create` rule, `origin`/`description` fields (Plan Amendment §A.2).
3. `OwnerInvestment`: new collection, rules, atomic pairing with `CashLedgerEntry` (`category: 'other-governed-movement'`), live-formula extension (`+ ownerInvestmentsSinceSnapshot`), `ownerInvestmentSinceLastSnapshot` drill-down field, Timeline audit event (Plan Amendment §A.3).
4. Recurring receivable reminders: `Receivable.lastReminderSentAt` field, write-path isolation from `recordReceivablePayment`, and the sweep-logic change to `businessWorthNotificationProducer.ts`'s `RECEIVABLE_OUTSTANDING_EVENT_TYPE` handling (Plan Amendment, "Recurring 30-Day Receivable Reminders").
5. Contagem cost-basis conversion: the `getConversionFactor`-driven automatic cost derivation in `stockCount.ts`'s per-portion cost-entry path, for the narrow case FR-67 names (Plan Amendment, "Contagem Cost-Basis Conversion"). **The removal of the existing silent-zero fallback for this same narrow case is authorized only together with, and subject to, §25 below (Post-Implementation Correction — Cost-Price Zero-Fallback), not independently.**
6. Fecho batch-level profit attribution: `batchContributions` on `ProductReportDetail`, sourced from `generateReportSummary`'s existing per-batch loop (Plan Amendment, "Fecho Batch-Level Profit Attribution").
7. Dashboard/report three-surface terminology: the Dashboard Business Worth summary modal, `CapitalGrowthReport.tsx`, `BusinessWorthReport.tsx` (Plan Amendment, "Three-Surface Terminology Correction"). **Sequenced together with §24 below (Fecho baseline removal), per the Plan Amendment's own Finding FB-4 dependency note — neither should ship to a given business without the other.**

**Execution rule — one item at a time, mirroring §7's existing eight-step discipline exactly, applied here to Increment 10's seven items above, in the Plan Amendment's own proposed order (Plan Amendment, "Proposed Sequencing," items 1–7):**

1. Read the item's scope (above, and the cited Plan Amendment section) before writing anything.
2. Verify its prerequisites — for item 3 (Owner Investment) and item 7 (terminology, paired with §3), confirm item 1 (`establishmentMethod`) and §3 (Fecho baseline removal) respectively are actually complete and verified, not merely started.
3. Implement only that item's own scope — no item may silently implement a later item's functionality.
4. Run the tests/verification the Plan Amendment names for that item, including any newly-required regression updates (§25 below, for item 5's paired correction).
5. Inspect the diff — confirm no file outside the item's own stated scope was touched.
6. Verify governance compliance against the specific FR(s)/Decision(s)/Finding(s) the item claims to implement.
7. Record the result.
8. Only then proceed to the next item.

**This Authorization Amendment does not permit implementing all seven Increment 10 items in one pass**, and does not permit bypassing any of the eight steps above for any item — identical discipline to §7's existing rule for Increments 1–9.

---

## 24. Post-Implementation Correction — Fecho Baseline (Capital Inicial Fallback Removal)

**Scope note, mirroring §16's own "avoid a numbering collision" discipline:** this correction is distinct from, and not to be confused with, the existing §16 "Finding 3, Option A" correction (an unrelated `BusinessWorthSnapshotProductValuationLine.totalValue` fix from Increments 1–4's own post-implementation review).

**Finding (per Rule 8 Assessment Addendum — Revision 3, Findings FB-1–FB-4, already accepted).** `resolveActiveBusinessWorthBaselineDate` (`apps/tenant/src/utils/calculations.ts`, line 1478), shipped as part of Increment 6 (`b2578d0`), currently falls back to `initialStockCount.createdAt` (Capital Inicial's date) as Fecho's baseline whenever no `BusinessWorthSnapshot` exists — a real, deliberately-tested behavior (`tests/fecho-baseline-anchored-closing.test.ts`, at least three cases exercising this exact path). Per Revision 3 (Specification §18/FR-25 as corrected; the signed decision log's own Decision 4), this fallback is superseded: Fecho's baseline must resolve exclusively from the latest active `BusinessWorthSnapshot`'s `confirmedAt` — of either `establishmentMethod` — never from Capital Inicial's date, under any circumstance.

**Product Architect Decision (recorded here for formal acceptance, not re-decided — this restates Decision 4 from the signed decision log, already approved 23 August 2026):**

> Remove the Capital Inicial fallback from `resolveActiveBusinessWorthBaselineDate`. When no `BusinessWorthSnapshot` exists, Fecho has no baseline and custom-period Fecho is unavailable, regardless of whether the business has a preserved historical Capital Inicial. The Owner sees the approved message: *"Estabeleça primeiro o Valor do Negócio através de uma Contagem ou de um Valor de Negócio Declarado para utilizar o Fecho."*

**Rationale:** Fecho's baseline must mean exactly one thing — a genuine Business Worth establishment event — never a proxy derived from unrelated historical capital-record data. The fallback's continued presence would have let a State-1a business run custom Fecho against a baseline that Revision 3's own terminology table (§42.1) explicitly says does **not** establish Business Worth — an internal contradiction this correction closes.

**What this correction explicitly does NOT change:**
- `resolveActiveBusinessWorthBaselineDate`'s treatment of an existing `BusinessWorthSnapshot` (of either establishment method) — unchanged, still the sole basis for the baseline once one exists.
- The `'custom'` `ClosingPeriodType` value, the double-close guard, or any other Fecho mechanism from Increment 6 — unchanged.
- Any Business Worth formula, ceiling, or figure — unaffected; this is a baseline-*resolution* change, not a valuation change.
- Historical Capital Inicial data itself — never deleted, migrated, or rewritten (HIST-1), exactly as every other item in this capability preserves it.

**Required regression update (implements the Product Architect's own instruction that existing regression tests be updated in the same implementation change):** `tests/fecho-baseline-anchored-closing.test.ts`'s fallback-path test cases (identified in the Rule 8 Addendum, Finding FB-1) must be updated, in the same change, to assert the new "no baseline" result — not left failing, and not silently deleted without replacement coverage for the "no snapshot exists" case.

**Sequencing requirement, carried from the Plan Amendment (Finding FB-4):** this correction must land together with, or with an explicit rollout note relative to, Increment 10 item 7 (Dashboard/report three-surface terminology) — the Owner-facing message above must be live for any business affected by this change no later than the change itself.

**Formal acceptance:**

> I have reviewed this Post-Implementation Correction (removal of the Capital Inicial fallback from `resolveActiveBusinessWorthBaselineDate`, Increment 6) and confirm it correctly implements the already-approved Decision 4. I confirm it introduces no new business decision, changes no Business Worth formula or figure, preserves all historical Capital Inicial data unmodified, and requires the named regression-test update in the same change. This correction is **ACCEPTED**, pending implementation per §23's execution rule.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

---

## 25. Post-Implementation Correction — Contagem Cost-Price Zero-Fallback Removal

**Scope note:** distinct from, and not to be confused with, §16's existing Finding 3/Option A or this document's own §24, above.

**Finding (per Rule 8 Assessment Addendum — Revision 3, Findings CB-1, CB-2, ZF-1, ZF-2, already accepted).** `apps/tenant/src/utils/stockCount.ts`'s per-portion cost-entry path, shipped as part of Increment 4 (`49fb8ab`), currently computes `const costPrice = Number(raw.costPrice) || 0;` — an unfilled or non-numeric `costPrice` silently becomes `0`, unconditionally, for every Contagem portion. Specification §15/FR-67 requires that, for the specific case of a multi-portion entry where a portion's unit differs from the product's purchase unit and a valid, confirmed `unitRelationship` exists, cost is instead derived automatically and deterministically via `getConversionFactor` — never silently defaulted to zero in that case.

**Product Architect Decision:**

> For the case FR-67 names — a Contagem portion whose unit differs from the product's most recent purchase unit, where a valid, confirmed `unitRelationship` covers that unit — the existing silent-zero cost-price fallback is removed and replaced with automatic, deterministic conversion via the existing `getConversionFactor` engine. Outside that specific case, today's manual cost-entry behavior, including its existing zero-coercion for a genuinely blank manual entry, is unchanged — this is FR-67's own named exception, mirroring `getConversionFactor`'s own null-handling contract exactly.

**Rationale:** a silently-zeroed cost price on a convertible portion would understate `embeddedProfitTotal` and, downstream, `measuredBusinessWorth` — a genuine data-integrity defect this correction closes for the case where a correct figure is actually derivable. Where no confirmed relationship exists, manual entry (and its existing behavior) remains appropriate, since no deterministic figure can be derived — Revision 3 does not require inventing one.

**What this correction explicitly does NOT change:**
- Cost-price handling for single-unit Contagem entries, or for a portion with no confirmed `unitRelationship` — unchanged.
- Selling-price entry or `deriveModeAPortionValuations` (Mode A) — confirmed zero coupling; this correction touches only `costPrice`, never `sellingPrice`.
- `getConversionFactor` itself, or `Product.unitRelationship` — reused unmodified, no new engine.
- Any already-frozen `BusinessWorthSnapshot`'s `embeddedProfitDetail` — this correction governs how a value is computed going forward, exactly like every other Increment 1–4 field-level fix in this capability's own history (§16's own precedent), never a rewrite of historical snapshot data (I-3, unaffected).

**Required regression review (per the Product Architect's own instruction):** `tests/contagem-multi-unit-valuation.test.ts` and `tests/periodic-stock-mode-a-integration.test.ts` must be checked for any fixture relying on, or merely tolerating, the silent-zero default within FR-67's own narrow scope, and updated in the same change if any such case exists.

**Formal acceptance:**

> I have reviewed this Post-Implementation Correction (removal of the silent cost-price zero-fallback, within FR-67's own named scope, Increment 4) and confirm it correctly implements FR-67 without altering cost-price handling outside that scope, without touching selling-price logic, and without rewriting any historical snapshot data. This correction is **ACCEPTED**, pending implementation per §23's execution rule and the required regression review above.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

---

## 26. Owner-Declared Business Worth UI Decision — Recorded

**Recorded here verbatim, per the Product Architect's own instruction, as the one implementation-detail decision this amendment settles that the Plan Amendment itself had left open (Plan Amendment, Rule 8 Finding OD-5):**

> **Owner-Declared Business Worth UI.** Use a dedicated "Declare Business Worth" entry point/screen, separate from the Contagem data-entry flow. Do not implement Owner-Declared Business Worth as a mode/toggle inside Contagem. **Reason:** Contagem is a physical stock-count establishment event, while Owner-Declared Business Worth is an explicit declaration by an Owner who already knows the business's worth. They are two different establishment methods and must remain clearly distinguishable in the UX.

This binds Increment 10 item 1 (§23, above) and closes the one UI-boundary question the Rule 8 Addendum and Plan Amendment both left open. No other implementation-detail decision is settled by this amendment beyond this one and the two Post-Implementation Corrections above — every other exact field/route/collection name in the Plan Amendment remains, as before, an ordinary implementation choice subject to normal code review, not a Product Architect decision.

---

## 27. The Resulting Lifecycle, as Approved

Recorded here verbatim from the Product Architect's acceptance, for direct traceability alongside Specification §6/§42:

**Existing business:** operational use → either Contagem **or** Declare Business Worth → Business Worth established → Current Business Worth.

**New business:** business creation → repeatable `+Stock` / Initial Investment activity → whenever Owner is ready, either Contagem **or** Declare Business Worth → Business Worth established → Current Business Worth.

**Capital Inicial remains neither a gate nor a Business Worth establishment mechanism** — confirmed consistent with §42.1's terminology table and §6 State 2 as corrected; no further textual change is required to the Specification for this lifecycle statement, since §6/§42 already state it in these terms.

---

## 28. Acceptance Criteria — Increment 10 and Post-Implementation Corrections

Mirrors the existing Authorization's §12 format, extended for Revision 3's new FRs.

**Increment 10:**
- AC-R3-1: A `BusinessWorthSnapshot` can be created via Owner-Declared establishment only through the dedicated entry point (§26, above); it is `isOwnerOf`-gated, carries `establishmentMethod: 'owner-declared'`, has no `sourceStockCountId`, and omits every field FR-69 names, enforced server-side.
- AC-R3-2: A `Payable` of `origin: 'opening-balance'` or `'other-obligation'` can be created via a standalone path requiring no `PurchaseBatch`, with `sourcePurchaseBatchId` structurally absent and `description` required non-empty; purchase-origin creation is byte-for-byte unchanged.
- AC-R3-3: Recording an `OwnerInvestment` produces exactly one linked `CashLedgerEntry` in the same atomic write; the live Business Worth calculation reflects it exactly once; it appears as `ownerInvestmentSinceLastSnapshot` on the next snapshot regardless of establishment method; it is logged to the Timeline, never `platform_audit_log`.
- AC-R3-4: An outstanding `Receivable` receives a reminder no more than once per 30-day period, measured from `lastReminderSentAt`; a partial payment does not reset this; `status: 'paid'` stops reminders permanently; `recordReceivablePayment` never writes `lastReminderSentAt`.
- AC-R3-5: For a Contagem portion meeting FR-67's named condition, cost price is derived automatically via `getConversionFactor`, never left at a silent zero; outside that condition, behavior is unchanged.
- AC-R3-6: `ProductReportDetail.batchContributions` reflects the same per-batch figures `generateReportSummary`'s existing loop already computes, with no change to existing aggregate fields.
- AC-R3-7: The Dashboard modal, `CapitalGrowthReport.tsx`, and `BusinessWorthReport.tsx` each display "Business Worth" (Estimated, where applicable) pre-establishment and "Current Business Worth" post-establishment (either method), with historical Capital Inicial data relocated to display only, never deleted.

**Post-Implementation Corrections:**
- AC-R3-8: `resolveActiveBusinessWorthBaselineDate` returns "no baseline" (never a Capital-Inicial-derived date) when no `BusinessWorthSnapshot` exists; `tests/fecho-baseline-anchored-closing.test.ts` reflects this; the approved Owner-facing message is live no later than this change.
- AC-R3-9: The cost-price silent-zero fallback is removed only for FR-67's named case; `tests/contagem-multi-unit-valuation.test.ts` and `tests/periodic-stock-mode-a-integration.test.ts` reflect this; manual-entry behavior outside that case is unchanged.

---

## 29. Traceability Re-Verification — Revision 3

| Item | BDR Decision | Specification §/FR | Rule 8 Finding | Plan Amendment § | AC |
|---|---|---|---|---|---|
| Owner-Declared establishment | 36 | §42.1, §8, FR-61 | OD-1–OD-5 | A.1 | AC-R3-1 |
| Opening/other-obligation Payables | 12 (Spec) | §42 Dec. 12, §12, FR-62 | OP-1–OP-4 | A.2 | AC-R3-2 |
| Owner Investment | — (new territory) | §43, FR-63–66 | OI-1–OI-6 | A.3 | AC-R3-3 |
| Recurring receivable reminders | — (fills open question) | §22, FR-57 | RC-1–RC-5 | (dedicated section) | AC-R3-4 |
| Cost-basis conversion (new-territory portion) | — (new territory) | §15, FR-67 | CB-3 | (dedicated section) | AC-R3-5 |
| Fecho batch-level profit | — (scoped enhancement) | §18, FR-68 | BP-1, BP-2 | (dedicated section) | AC-R3-6 |
| Three-surface terminology | 3 (Current Business Worth transfer) | §32 | TS-1 | (dedicated section) | AC-R3-7 |
| **Fecho baseline fallback removal** | 4 (signed decision log) | §18/FR-25 (corrected) | FB-1–FB-4 | §3 (this document) | AC-R3-8 |
| **Cost-price zero-fallback removal** | — (Rule 8-surfaced correction) | §15/FR-67 | CB-1, CB-2, ZF-1, ZF-2 | §4 (this document) | AC-R3-9 |
| Owner-Declared UI (dedicated screen) | — (implementation decision) | — | OD-5 | §5 (this document) | AC-R3-1 |

No row above introduces a decision beyond what Revision 3, the Rule 8 Addendum, the Plan Amendment, or this document's own §5 already settled.

---

## 30. Explicit Gate Statement

**This document, once signed, authorizes:** drafting the concrete code/rules/test changes for Increment 10's seven items and the two Post-Implementation Corrections, strictly per §23's execution rule, one item at a time, with the sequencing and pairing dependencies named in §2–§4 above.

**This document, even once signed, does NOT itself:**
- Write, modify, or commit any `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` file.
- Constitute the instruction to begin coding — a further, separate, explicit instruction ("BEGIN IMPLEMENTATION INCREMENT 10 ITEM 1," or equivalent, per §23's own sequencing) is required before any code is written, mirroring exactly how §15's own acceptance did not itself begin Increment 1.
- Authorize skipping the regression-update requirements named in §3/§4 for either Post-Implementation Correction.
- Reopen, reweaken, or reinterpret any decision from BDR Decisions 1–36, Specification §§1–43, or any prior Increment 1–9 Authorization section.

---

## 31. Product Architect Signature — Recorded

> I APPROVE AND SIGN the Implementation Authorization Amendment — Revision 3. I confirm that I have reviewed and accepted the full scope, execution discipline, acceptance criteria, traceability, the Increment 10 authorization, the Fecho baseline Post-Implementation Correction, the Contagem cost-price zero-fallback Post-Implementation Correction, and the dedicated Owner-Declared Business Worth UI decision. This signature is the governance authorization gate. It does not by itself instruct implementation to begin. Implementation may begin only upon my separate explicit instruction identifying the Increment 10 item or Post-Implementation Correction to execute.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status:** ✅ **SIGNED.**

---

## 32. Governance Notes

- This is an Implementation Authorization Amendment draft only. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document.
- This amendment does not modify the source BDR, the Specification, the Rule 8 Assessment/Addendum, or the Implementation Plan/Plan Amendment.
- **Companion item, still tracked separately, still not resolved by this document:** Specification FR-1's literal wording correction (recognizing both establishment methods), per the Implementation Plan Amendment's own Governance Notes. Not a Plan or Authorization item; flagged again here only so it is not lost.
- Nothing was committed or pushed to produce this document.

## 33. Next Governance Step

This amendment is now signed (§31, above). The next, separate operational action — **not performed here** — is an explicit instruction to begin a specific Increment 10 item or Post-Implementation Correction, per §23's own one-item-at-a-time execution rule. No code, test, rules, or index file is created, modified, or authorized by this document itself, even now that it is signed.

**Lifecycle:** Signed Revision 3 decisions → Governance recording (`5870bdd`) → Rule 8 Assessment Addendum (accepted) → Implementation Plan Amendment (accepted, signed) → **Implementation Authorization Amendment (signed, this document)**. Governance chain complete through Authorization. Not yet implemented — implementation begins only per a further, separate, explicit per-item instruction.

---

## 34. Execution Record — Increment 10 Item 1 (Owner-Declared Business Worth)

**Status: ✅ IMPLEMENTED AND VERIFIED.** Per §23's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result). This is an execution log entry, not a new Product Architect decision — no item authorized above is reopened, reweakened, or reinterpreted by this record.

**Commit:** `e122e5c` — "feat(business-worth-evolution): Increment 10 item 1 -- Owner-Declared Business Worth".

**Scope implemented, matching §23 item 1 exactly:**
- `types.ts`: `BusinessWorthSnapshot.establishmentMethod` field; `sourceStockCountId`, `productValuationTotal`/`Detail`, `embeddedProfitTotal`/`Detail`, `expensesSinceLastSnapshot`/`breakagesSinceLastSnapshot`/`levantamentosSinceLastSnapshot` made optional (FR-69's omission list); new `'business-worth-owner-declared'` `TimelineActivityType`.
- `firestore.rules`: `businessWorthSnapshots.allow create` gains the Owner-Declared branch (Rule 8 Finding OD-1), enforcing genuinely-absent `sourceStockCountId` and every FR-69-omitted field, server-side. The Contagem branch was corrected to accept `establishmentMethod in ['contagem', null]` rather than a strict `== 'contagem'` requirement — a fix made during implementation, not specified in the Plan Amendment, to preserve backward compatibility with every pre-Increment-10 caller/test (this codebase's own established additive-field discipline).
- `AppContext.tsx`: new `recordOwnerDeclaredBusinessWorth` (single-document, transactional, submission-id-idempotent, per Rule 8 Finding OD-3); `recordStockCount`'s own write payload now explicitly sets `establishmentMethod: 'contagem'`.
- `calculations.ts`: a correctness fix found during implementation — `computeCaseALiveBusinessWorth` read `latest.embeddedProfitTotal` with no fallback, which would have produced `NaN` once an Owner-Declared snapshot (which has no `embeddedProfitTotal`) became the active baseline. Fixed with `?? 0`, mirroring the existing `payablesPosition` fallback. Recorded here as a scope-internal fix required to make Item 1 actually function, not a separate item.
- `DeclareBusinessWorthView.tsx` (new) + `App.tsx` + `navigationTabs.ts` + `i18n/locales/{pt,en,fr}.ts`: the dedicated entry-point screen per the recorded UI decision (§26, above) — its own tab (`declare-worth`), never a mode inside `PeriodicStockCountView`.
- `DashboardView.tsx` + i18n: Owner-Declared badge and FR-69 omission notice in the existing Business Worth history list, satisfying FR-61's "visibly distinguished" requirement at this codebase's current drill-down depth.
- `timelineHelpers.ts`: the new Timeline event type registered in all three presentation maps (icon/color/label) — a gap `tsc` itself caught, not found by inspection alone.
- `tests/business-worth-owner-declared.test.ts` (new): 22 test cases — the positive case, Staff/cross-tenant rejection, `sourceStockCountId`-fabrication rejection (including the empty-string case), an individual rejection test for every FR-69-omitted field, `establishmentMethod` enum/required-field checks, the backward-compatible no-`establishmentMethod` legacy case, idempotency, and immutability.

**Diff scope confirmed:** only the files listed above; no other Increment 10 item and neither Post-Implementation Correction (Fecho baseline, cost-price fallback) touched, verified via `git diff --name-only` against the prior commit.

**Verification results:**
- `npm run lint:tenant`: clean.
- `npm run lint:server`: clean, except one pre-existing, unrelated failure in `tests/startup-investment.test.ts` (`BatchStatus` typing), confirmed via `git stash` to predate this change.
- 51/51 non-emulator-dependent Business Worth tests: pass.
- **`npm run test:business-worth-snapshot-foundation:emulator`, run locally against a real Firestore emulator: 14/14 pass, 0 failures.** Confirms the Contagem-sourced establishment path (create-time enforcement, tenant isolation, FR-19 no-backfill discipline) is unbroken by the rule change above.
- **`npm run test:business-worth-owner-declared:emulator`, run locally against a real Firestore emulator: 22/22 pass, 0 failures.** Confirms every case named above, including every individual FR-69 field-leak rejection, the establishment-method discrimination checks, the backward-compatible legacy-write case, idempotency, and immutability.

**Governance compliance re-check against AC-R3-1 (§28):** *"A `BusinessWorthSnapshot` can be created via Owner-Declared establishment only through the dedicated entry point (§26), is `isOwnerOf`-gated, carries `establishmentMethod: 'owner-declared'`, has no `sourceStockCountId`, and omits every field FR-69 names, enforced server-side."* — **Met**, per the emulator results above.

**Not yet done, and not claimed as done by this record:** Increment 10 items 2–7 (§23) and both Post-Implementation Corrections (§24, §25) remain unimplemented and unauthorized to begin until their own separate, explicit per-item instruction, per §23's own execution rule.

---

## 35. Owner-Declared Business Worth — Verification Status Clarification (Approved)

**Status: ✅ SIGNED AND APPROVED (23 August 2026).** Recorded here per this document's own established append-only discipline (§15, §16, §34 above) — §26's UI decision is not rewritten in place; this section qualifies it and Increment 10 item 1's own scope going forward, without reopening the UI-boundary decision §26 already settled.

**Background:** following investigation of the already-shipped Increment 10 item 1 code (Execution Record, §34), a genuine tension was identified between BDR Decision 36's unqualified "same governance weight"/"full stop" language and the Product Architect's clarified intent that an Owner-Declared value is a claim, never a SABUSH-verified measurement. Three options (A/B/C) were traced in full (Dashboard, history, Fecho, live calculation, notifications, corrections/recovery, Contagem-transition, existing/new businesses, Capital Inicial, `establishmentMethod` sufficiency, governance/implementation/test impact) and presented for decision.

**Decision: Option A, approved and signed.**

> I APPROVE OPTION A. Owner-Declared Business Worth remains in the product as a claim, not a system-verified measurement, clearly identified as "Owner Declared / Unverified." Contagem remains the system-measured establishment method. Owner-Declared remains the operational Business Worth baseline for the Dashboard, live calculations, and Fecho until a later Contagem establishes a measured baseline — no Contagem-only filter is introduced in the live calculation or Fecho baseline resolution. Correction/recovery mechanics remain unchanged, applying identically regardless of establishment method. Capital Inicial remains completely separate, never a gate, never a Business Worth or Fecho baseline — the existing decision to remove the Capital Inicial fallback from Fecho remains valid and unaffected. The Dashboard and the Declaration entry screen must visibly and explicitly distinguish an Owner-Declared figure from a Contagem-measured one. `establishmentMethod` remains the sole source of truth for this distinction — no new verification field is added. BDR Decision 36 and Specification §42.1's "same governance weight" language are qualified, not reversed, to narrow their scope to procedural treatment only (correction, recovery, auditability, immutability, snapshot lifecycle) — never numerical-verification equivalence.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Governance amendments made as a direct consequence of this Decision (governance-only, no code/test/rules/index touched by the amendment itself):**
- BDR Decision 36 qualified with the procedural-vs-verification distinction.
- Specification §42.1's terminology table gains a Verification Status column; new §42.8 (qualification) and §42.9 (its own Product Architect acceptance); new FR-70.
- Rule 8 Assessment Addendum's Finding OD-2 qualified: calculation paths confirmed unchanged (no Contagem-only filter); display paths (specifically the Dashboard headline, not just the history list) now require the branch FR-70 defines.
- Implementation Plan Amendment §A.1 extended with the two concrete display requirements (Dashboard headline framing; declaration-screen pre-confirmation copy) and an explicit "not required" list (no calculation, formula, or Fecho-baseline change; no new field).

**Implementation impact, not yet performed (per this same instruction's own scope control — governance amendment only, this section records the decision, it does not authorize the code change):**
- `apps/tenant/src/components/DashboardView.tsx` — headline card branch on `establishmentMethod`.
- `apps/tenant/src/components/DeclareBusinessWorthView.tsx` — strengthened pre-confirmation copy.
- `apps/tenant/src/i18n/locales/{pt,en,fr}.ts` — new/extended keys for the headline framing.
- **No change** to `apps/tenant/src/utils/calculations.ts`, `apps/tenant/src/context/AppContext.tsx`, `firestore.rules`, or `apps/tenant/src/types.ts` — explicitly confirmed unnecessary by this Decision.

**Test impact, not yet performed:** a Dashboard-level test proving the headline framing branches correctly by `establishmentMethod`, including the transition case (a later Contagem's snapshot becoming the latest active one reverts the headline to the standard framing). No change to any calculation-layer or rules-layer test file.

**This Decision does not reopen:** the approved Increment 10 item 1 UI-boundary decision (§26 — dedicated entry point, never a Contagem toggle); the Fecho baseline decision (Owner-Declared remains a valid operational and Fecho baseline; Capital Inicial fallback removal remains valid, §24); the already-signed correction/recovery mechanics (§25–§26 of the Specification; unaffected). It also does not authorize Increment 10 items 2–7 or either Post-Implementation Correction, which remain exactly as scoped in §23–§25, above.

**Next governance step for this Decision specifically:** a separate, explicit authorization is required before the display-layer implementation changes named above are written, per the Product Architect's own scope-control instruction accompanying this Decision. This section records the governance amendment only.

---

## 36. Product Architect Authorization — Decision 37 (First-Time Contagem Product-Information Model)

**Status: ✅ SIGNED AND AUTHORIZED (23 August 2026).** Signature recorded in the Formal acceptance block, below. Per this document's own established practice (§14/§15/§31), this signature is the governance authorization gate — it does not by itself instruct implementation to begin; that remains a further, separate, explicit per-item instruction (§7/§23-mirrored one-item-at-a-time discipline, restated below).

**Governing basis, in order:** BDR-pending-business-worth-evolution-measurement-model.md §4, Decision 37 (✅ APPROVED AND SIGNED, SABUSHIMIKE Masceni, 23 August 2026) → Rule 8 Assessment Addendum — First-Time Contagem Product-Information Model (✅ ACCEPTED, SABUSHIMIKE Masceni, 23 August 2026, gate READY FOR PLAN) → Implementation Plan Amendment — Decision 37 (✅ ACCEPTED, SABUSHIMIKE Masceni, 23 August 2026) → **this Authorization item (awaiting signature)**.

**One umbrella Authorization, extended, not replaced** (per BDR Decision 35 / this document's own existing "one umbrella Authorization, not nine" statement) — this section does not create a second, separate Implementation Authorization; it extends the single existing document with a new dated item, exactly as §17–§21, §23, and §34–§35 already did for Increments 5–9, Increment 10, and the Owner-Declared verification-status clarification respectively.

**Scope of this authorization item, per the accepted Plan Amendment's §B:**

1. **B.1 — Product-level first-time setup panel** (`PeriodicStockCountView.tsx`): one product name field, one original-purchase-unit field, one original-purchase-cost field, per genuinely-new product; replaced by a read-only summary (reusing existing `getUnitRelationshipForProductName`/`findMostRecentBatchForProduct`) once the product already exists.
2. **B.2 — Arbitrary-length unit-relationship entry**: extends `UnitRelationshipRow` (or its replacement) from a fixed two-level pair into a repeatable chain-step list; candidate `UnitRelationship` correlated to the entire product **group**, not a single row.
3. **B.3 — Multiple portions + "+ Add Portion"**: ports the already-shipped Grouped Initial Stock UX (`groupRowsByProductName`, `handleAddPortion`, `handleRenameGroup`, `handleRemoveGroup`) from `InitialStockCountView.tsx` into `PeriodicStockCountView.tsx`, unmodified at the `stockCountPortionGrouping.ts` level.
4. **B.4 — Cost-field suppression**: hides/disables the per-portion `costPrice` input for a portion whose unit differs from the product's purchase unit, once a cost basis + relationship exist. UI-only; introduces no new calculation.
5. **B.5 — First-time vs. subsequent distinction**: confirmed to require no code beyond B.1's existing-product read-only branch, reusing the existing `isGenuinelyNewProductName` gate.

**This authorization means, and means only:**
- Implementation remains strictly **one item at a time**, mirroring §7's and §23's existing discipline exactly — B.2 through B.5 do not become authorized merely because B.1 is instructed to begin, and vice versa; each of B.1–B.5 requires its own separate, explicit "begin this item" instruction before work starts on it.
- This signature, if given, is the **governance authorization gate only** — it does not itself instruct implementation to begin, exactly as §14/§15/§31's own established language already establishes for every prior increment/amendment in this document.
- This authorization does **not** change any business decision recorded in Decision 37, does not reopen the accepted Rule 8 Addendum or Plan Amendment, and does not amend `getConversionFactor`, `Product.unitRelationship`, `StockBatch`'s cost-basis model, Mode A/Mode B selling behavior, `totalSellingValue`, `productValuationTotal`, or Business Worth's selling-basis formula — all explicitly preserved, per Decision 37's own "does not authorize" list and the Plan Amendment's own §A/out-of-scope sections.
- This authorization does **not** touch Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item (§23–§25, §34–§35, above) — all remain exactly as already scoped there.
- This authorization does **not** by itself require any `firestore.rules` or `firestore.indexes.json` change — none was identified by the Rule 8 Addendum or Plan Amendment for this scope; should implementation surface a genuine need for one, that would itself require a separate governance step before being written, per §8/§9's existing "no redesign, no silent scope expansion" discipline.

**Execution rule, once signed (mirrors §23's eight-step discipline exactly, applied to B.1–B.5):**
1. Read the item's scope (above, and the Plan Amendment's own §B.1–§B.5 text) before writing anything.
2. Verify prerequisites — B.1 before B.2 (the panel B.2's chain-list renders inside); B.4 after B.1 (a cost basis must exist to suppress against).
3. Implement only that item's own scope — no item may silently implement a later item's functionality.
4. Run the tests the Plan Amendment names for that item, including the regression checks (`stockCountPortionGrouping.ts`'s existing exports/tests, selling-side/Business-Worth byte-identical checks, existing-product no-panel regression).
5. Inspect the diff — confirm no file outside `PeriodicStockCountView.tsx` (and its own new test file(s)) was touched, unless a genuinely required change is separately identified and justified.
6. Verify governance compliance against Decision 37's own items and this section's scope list, above.
7. Record the result as its own dated Execution Record section, mirroring §34's format.
8. Only then proceed to the next item.

**Formal acceptance:**

> I have reviewed §36, "Product Architect Authorization — Decision 37". I APPROVE AND SIGN THIS AUTHORIZATION.
>
> This authorization formally approves the Decision 37 Implementation Authorization exactly as drafted, including: B.1 — Product-level first-time Contagem information panel; B.2 — Arbitrary-length unit-relationship entry; B.3 — Multiple current-stock portions with a first-class "+ Add Portion" interaction; B.4 — Suppression of redundant per-portion cost entry; B.5 — First-time product setup versus subsequent Contagens.
>
> The approved product model is: one product → one original purchase/cost basis + one complete unit relationship; one Contagem → multiple current-stock portions for that product, each with its own quantity/unit and independent selling price. The system automatically calculates Total Cost Value from the original purchase/cost basis and unit relationship, and Total Selling Valuation from the current selling portions/prices. Business Worth continues to use the Total Selling Valuation.
>
> The following remain explicitly unchanged and out of scope: `getConversionFactor`; Product/UnitRelationship/StockBatch data models; Mode A/Mode B selling logic; Business Worth's selling-basis formula; Owner-Declared Business Worth; Fecho; Owner Portfolio; other Increment 10 items; Firestore rules and indexes; shared-component refactoring.
>
> This signature is governance authorization only. It does not authorize implementation to begin automatically. Implementation of B.1–B.5 begins only upon a further, separate, explicit instruction naming the exact item to begin.
>
> **Product Architect:** SABUSHIMIKE Masceni
> **Date:** 23 August 2026

**Status: ✅ SIGNED AND AUTHORIZED (23 August 2026).** Per the execution rule above (§7/§23-mirrored discipline), this signature is the governance authorization gate — it does not by itself instruct implementation to begin on B.1, B.2, B.3, B.4, or B.5. Each remains unauthorized to actually start until a further, separate, explicit instruction identifies the specific item to execute.
