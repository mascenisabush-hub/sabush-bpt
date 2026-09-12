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

**Governing basis, in order:** BDR-pending-business-worth-evolution-measurement-model.md §4, Decision 37 (✅ APPROVED AND SIGNED, SABUSHIMIKE Masceni, 23 August 2026) → Rule 8 Assessment Addendum — First-Time Contagem Product-Information Model (✅ ACCEPTED, SABUSHIMIKE Masceni, 23 August 2026, gate READY FOR PLAN) → **Implementation Authorization §36 (✅ SIGNED AND AUTHORIZED, SABUSHIMIKE Masceni, 23 August 2026, this item)**.

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

---

## 37. Execution Record — Decision 37, Item B.1 (Product-Level First-Time Contagem Information Panel)

**Status: ✅ IMPLEMENTED AND VERIFIED, INCLUDING ONE POST-COMMIT ROBUSTNESS CORRECTION.** Per §36's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result) and §23's identical precedent. This is an execution log entry, not a new Product Architect decision — no item authorized in §36 is reopened, reweakened, or reinterpreted by this record. Only B.1 was executed; B.2, B.3, B.4, and B.5 remain unauthorized to begin.

**Commits:**
- `7fd4dea` — "feat(contagem): Decision 37 B.1 — Product-Level First-Time Information Panel" (initial implementation).
- `e2f9c61` — "fix(contagem): Decision 37 B.1 correction — product-level data survives portion deletion/reordering" (post-implementation-review correction to the same item, landed before B.2 was permitted to begin, per the explicit instruction not to build on an unreviewed B.1).

**Scope implemented, matching §36 item B.1 exactly:**
- `apps/tenant/src/components/PeriodicStockCountView.tsx`: new `NewProductInfoPanel` component — a visually distinct product-level card showing product identity (read-only echo of the group's own name), original purchase unit, original purchase cost, and the unit relationship (the existing `UnitRelationshipRow` control, relocated unchanged — still its existing two-level form; extending it to arbitrary length remains B.2's own scope). Render cadence fixed so this panel appears exactly once per genuinely-new product group (`portionLabel.portionIndex === 1`), never once per portion, and never for an already-catalogued product (`isGenuinelyNewProductName`, unchanged).
- `apps/tenant/src/utils/stockCount.ts`: `StockCountWorkingRow` initially gained two UI-only fields (`newProductPurchaseUnit`, `newProductPurchaseCost`); both, along with the pre-existing `newProductSellingUnit`/`newProductSellingUnitFactor`, were subsequently **removed** by the correction commit (see below) once their ownership moved to component state.

**Post-implementation review finding and correction (recorded here in full, per this document's own §16/§24/§25/§35 precedent for recording a correction discovered after initial landing, within the same authorized item's scope — not a new decision).** A self-review conducted before authorizing B.2 found that the initial B.1 pass stored product-level information (purchase unit/cost, relationship candidate) as fields on the specific row that happened to be the group's first portion. `handleRemoveManualRow` performs no data migration, so deleting that one row silently destroyed the product's cost basis and relationship candidate — a real correctness defect, not a style preference. **Corrected in `e2f9c61`:** this information now lives in a new component state, `newProductInfo: Record<string, {...}>`, keyed by `productKeyFor(name)` — the identical key convention `modeAGroups` (Increment 4) already uses — which survives row deletion/reordering by construction. The panel's render location remains portionIndex-1-only (a presentation choice); data ownership no longer has anything to do with which row renders it. The submit-time `unitRelationshipByProductName` correlation loop was updated to iterate `newProductInfo`'s own keys rather than scanning rows. The four row-owned fields this required were removed from `StockCountWorkingRow` entirely, confirmed to have no other consumer (`AddStockView.tsx`/`InitialStockCountView.tsx` use their own, independently-declared, unrelated row types).

**Diff scope confirmed (both commits together):** `apps/tenant/src/components/PeriodicStockCountView.tsx`, `apps/tenant/src/utils/stockCount.ts`, and `tests/periodic-stock-new-product-panel.test.ts` only — verified via `git diff --name-only` against the pre-B.1 baseline (`6dd200f`). Zero diff on `firestore.rules`, `firestore.indexes.json`, any `package.json`/lockfile, `getConversionFactor`, `Product`/`UnitRelationship`/`StockBatch` type shapes, Mode A/Mode B selling logic, `totalSellingValue`/`productValuationTotal`, Business Worth's selling-basis formula, Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item.

**Verification results:**
- `npx tsc --noEmit` (tenant app, after `npm install`): clean, 0 errors, both before and after the correction.
- `tests/periodic-stock-new-product-panel.test.ts` (new, rewritten by the correction): **11/11 pass**, including the exact named regression scenario — a two-portion new product (2 Cx + 3 Emb), product-level information filled in, first portion deleted, second portion becomes first-visible, product-level information proven byte-identical before and after deletion — plus portion reordering, two-simultaneous-new-products key isolation, cross-contamination guard, and an existing-catalogued-product-unaffected case.
- Regression, 8 suites / 116 tests (`contagem-multi-unit-valuation`, `periodic-stock-mode-a-integration`, `periodic-stock-portion-grouping-wiring`, `stock-count-portion-grouping`, `initial-stock-confirmation`, `initial-stock-grouped-ux`, `periodic-stock-multi-portion-valuation`, `stock-count-simplification`): **all pass**, both before and after the correction.

**Governance compliance re-check against §36's own scope list:** B.1's product-level panel, cost-basis/relationship display, and once-per-group render cadence — met. No arbitrary-length relationship editor (B.2), no ported "+ Add Portion" interaction (B.3), no cost-field suppression or FR-67 derivation wiring (B.4), and no first-time/subsequent-distinction code beyond what B.5 already confirmed required none — all correctly absent from this diff, confirmed by direct inspection, not merely asserted.

**Not yet done, and not claimed as done by this record:** Decision 37 items B.2, B.3, B.4, and B.5 (§36, above) remain unimplemented and unauthorized to begin until their own separate, explicit per-item instruction, per §36's own execution rule.

---

## 38. Execution Record — Decision 37, Item B.2 (Arbitrary-Length Unit-Relationship Entry)

**Status: ✅ IMPLEMENTED AND VERIFIED.** Per §36's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result) and §37's identical precedent. This is an execution log entry, not a new Product Architect decision — no item authorized in §36 is reopened, reweakened, or reinterpreted by this record. Only B.2 was executed; B.3, B.4, and B.5 remain unauthorized to begin.

**Commit:** `249799a` — "feat(contagem): Decision 37 B.2 — Arbitrary-Length Unit-Relationship Entry".

**Scope implemented, matching §36 item B.2 exactly:**
- `apps/tenant/src/components/PeriodicStockCountView.tsx`: the fixed two-level first-time relationship UI (this file's own former `UnitRelationshipRow`) was replaced with **`UnitRelationshipChainEditor`** — a repeatable chain-step list ("1 [previous level's unit] = [quantity] [unit]", "+ Adicionar nível"), each step's own unit naturally becoming the next step's reference label, matching the governing worked example exactly: 1 Cx = 4 Emb, 1 Emb = 6 Un → 1 Cx = 4 Emb = 24 Un.
- The relationship is stored **at the product level**, through B.1's own `newProductInfo[productKey]` state (keyed by `productKeyFor`), never on an individual portion row. `newProductInfo`'s shape was extended — its former `sellingUnit?`/`sellingUnitFactor?` pair replaced with `relationshipSteps: {unit, factor}[]` — but its ownership model is unchanged from B.1's own correction (§37, above).
- The chain **survives portion deletion and reordering** by the same construction B.1 already established: since the data lives keyed by product name rather than attached to any row, `handleRemoveManualRow`'s plain array filter cannot reach it.
- **`getConversionFactor` and `isValidUnitRelationship` were reused completely unchanged** — no new conversion engine, no new validation logic. B.2 is exclusively a candidate-construction/UI change feeding the same, unmodified engine and validator.
- **No `sellingUnit` decision was introduced.** The candidate `UnitRelationship` this item constructs leaves `sellingUnit` unset — `isValidUnitRelationship`'s own contract already treats this field as optional. Selling-unit/selling-price behavior (Mode A's reference-unit choice, Mode B's independent per-portion pricing) remains entirely under the existing, unmodified selling-valuation logic.
- **No cost derivation and no cost-field suppression were implemented.** No per-level cost (e.g. "312.50 MZN/Emb") is calculated, stored, or displayed anywhere in this diff. `normalizeStockCountItems` was not touched. These remain B.4/FR-67's own, separately-authorized-pending-execution scope.
- No B.3 ("+ Adicionar Porção" interaction, grouped-row screen redesign) and no B.5-specific code were implemented or touched.

**Implementation bug discovered and corrected before this commit was finalized (recorded here for completeness, per this document's own §16/§24/§25/§35/§37 precedent for recording a correction found during an item's own implementation pass, not a separate decision).** The first draft of `UnitRelationshipChainEditor` rendered a display-only "fake" placeholder step whenever the real `relationshipSteps` array was empty, so the chain always showed at least one editable row. That placeholder was never written back into actual state: `updateStep`/`onChange` operated on the real, empty array, so typing into the fake placeholder's inputs would have silently done nothing on first use. **Corrected before commit:** the editor now seeds one real, empty step into actual state at the moment the Owner expands the relationship section, so every rendered input always corresponds to a real array index. Verified by the new test suite's own `canAddLevel`/state-construction coverage (§ below) and by direct code inspection; no separate regression test file was needed since the fix was made and verified before the commit landed, unlike B.1's own post-commit correction (§37).

**Diff scope confirmed:** `apps/tenant/src/components/PeriodicStockCountView.tsx` and `tests/periodic-stock-arbitrary-length-relationship.test.ts` only — verified via `git diff --stat` against the B.1-closed baseline (`e21ba59`). Zero diff on `firestore.rules`, `firestore.indexes.json`, any `package.json`/lockfile, `getConversionFactor`/`purchaseToSellingConversion.ts`, `isValidUnitRelationship`/`unitRelationship.ts`, `types.ts` (`Product`/`UnitRelationship`/`StockBatch` unchanged), `contagemMultiUnitValuation.ts`, `calculations.ts`, `AppContext.tsx`, `stockCount.ts`, Business Worth's selling-basis formula, Mode A/Mode B selling logic, `normalizeStockCountItems`, Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item.

**Verification results:**
- `npx tsc --noEmit` (tenant app): clean, 0 errors.
- `tests/periodic-stock-arbitrary-length-relationship.test.ts` (new): **15/15 pass** — two-level and three-level chains, arbitrary (four-level) length, add-level/remove-level gap-prevention gating, product-key isolation across two simultaneous new products, deletion/reordering survival, an existing-product regression, incomplete/invalid-relationship handling via the unmodified `isValidUnitRelationship`, and conversion compatibility with the unmodified `getConversionFactor` (including the exact 1 Cx = 4 Emb = 24 Un case).
- `tests/periodic-stock-new-product-panel.test.ts` (B.1's own suite): **11/11 pass**, unaffected.
- Regression, 8 further suites: **116/116 pass**.

**Governance compliance re-check against §36's own scope list:** B.2's arbitrary-length relationship entry, product-level ownership via `newProductInfo`, and reuse of the unmodified conversion/validation engine — met. No cost derivation/suppression (B.4), no "+ Add Portion" interaction (B.3), and no first-time/subsequent-distinction code beyond what B.5 already confirmed required none — all correctly absent from this diff, confirmed by direct inspection, not merely asserted.

**Not yet done, and not claimed as done by this record:** Decision 37 items B.3, B.4, and B.5 (§36, above) remain unimplemented and unauthorized to begin until their own separate, explicit per-item instruction, per §36's own execution rule.

---

## 39. Execution Record — Decision 37, Item B.3 (Multiple Current-Stock Portions + First-Class "+ Adicionar Porção")

**Status: ✅ IMPLEMENTED AND VERIFIED.** Per §36's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result) and §37/§38's identical precedent. This is an execution log entry, not a new Product Architect decision — no item authorized in §36 is reopened, reweakened, or reinterpreted by this record. Only B.3 was executed; B.4 and B.5 remain unauthorized to begin.

**Commit:** `c57ad76` — "feat(contagem): Decision 37 B.3 — Multiple Current-Stock Portions + first-class '+ Adicionar Porção'". Verified directly against the actual commit diff (`git show c57ad76 --stat`), not assumed from a prior in-conversation report alone.

**Scope implemented, matching §36 item B.3 exactly, in two parts:**

1. **Original implementation.** `apps/tenant/src/components/PeriodicStockCountView.tsx`'s manual-row rendering was restructured into one grouped card per product name, reusing `groupRowsByProductName` completely unmodified (the same, already-shipped, already-tested function `InitialStockCountView.tsx`'s own Grouped Initial Stock UX already uses — a second consumer, not a fork). Product name is shown/edited once per card (new `handleRenameManualGroup`, mirroring `InitialStockCountView.tsx`'s own `handleRenameGroup`); portions are listed beneath; a per-card **"+ Adicionar Porção"** button (new `handleAddPortionToManualGroup`, mirroring `handleAddPortion`) appends a new portion pre-filled with the card's own name. Mode A's and B.1's `NewProductInfoPanel` gating were re-derived per-card rather than per-row, with identical underlying semantics — confirmed no behavior change for either.

2. **B.3 completion (existing catalogue products).** A read-only investigation, conducted mid-item at the Product Architect's request, found that the original implementation left a real gap: an *already-catalogued* product's first additional portion still required the generic "Adicionar produto que não está no catálogo" workaround and a retyped name — only the second and later additional portions benefited from the new card's own button. This was completed by adding a single "+ Adicionar Porção" button to each catalogue row (`visibleCatalogEntries` loop), reusing `handleAddPortionToManualGroup` **completely unchanged** — no second handler, no duplicated grouping logic, confirmed by direct source inspection (`grep` for the handler name showed exactly one definition and two call sites). The catalogue row itself, `catalogRows`, and `buildCatalogRow` remain untouched; the new portion joins the existing manual-row grouped card via the same, already-built mechanism. Per the Product Architect's own explicit scope boundary, the more visually unified "nest portions under the catalogue row" alternative (Option 2) was **not** implemented — the catalogue row remains in the catalogue section, and additional portions remain in the existing "Adicionados Manualmente" grouped card.

The generic page-level "Adicionar produto que não está no catálogo" button remains, unchanged, for starting a genuinely different product.

**Diff scope confirmed:** `apps/tenant/src/components/PeriodicStockCountView.tsx`, `tests/periodic-stock-add-portion.test.ts` (new), and `tests/periodic-stock-portion-grouping-wiring.test.ts` (updated) — verified via `git show c57ad76 --stat` directly against the commit, not merely re-asserted. `InitialStockCountView.tsx` and `stockCountPortionGrouping.ts`: zero diff. Zero diff on `firestore.rules`, `firestore.indexes.json`, any `package.json`/lockfile, `getConversionFactor`, `Product`/`UnitRelationship`/`StockBatch` type shapes, Mode A/Mode B selling logic, `totalSellingValue`/`productValuationTotal`, Business Worth's selling-basis formula, cost derivation/FR-67, `normalizeStockCountItems`, Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item.

**B.1 and B.2 confirmed intact.** `NewProductInfoPanel`, `newProductInfo` (keyed by `productKeyFor`), B.2's `relationshipSteps`, and both items' own state-survival-across-deletion/reordering guarantees are untouched by B.3's grouping/rename/add-portion mechanics — none of B.3's new handlers (`handleAddPortionToManualGroup`, `handleRenameManualGroup`) reference `newProductInfo` at all. Re-verified by the B.1 suite (11/11) and B.2 suite (15/15), both passing unmodified against this commit.

**Regression-test assertion intentionally updated, and why (per the Product Architect's own instruction to identify and document any such case explicitly).** `tests/periodic-stock-portion-grouping-wiring.test.ts` contained two assertions from an earlier checkpoint (B6) whose entire premise — "Periodic Contagem was untouched by the Grouped Initial Stock UX checkpoint" — is exactly what Decision 37/B.3 is authorized to change. Both were updated to assert the new, correct, authorized state (`groupRowsByProductName` is now referenced, deliberately, by `PeriodicStockCountView.tsx`), with an in-file comment explaining the supersession. `stockCountPortionGrouping.ts` itself was independently confirmed unmodified — no assertion about the shared helper's own contents was weakened, only the assertion about which files consume it.

**Verification results, independently re-run at commit `c57ad76` for this record (not merely re-stated from the prior in-conversation report):**
- `npx tsc --noEmit` (tenant app): clean, 0 errors.
- `tests/periodic-stock-add-portion.test.ts` (new): **23/23 pass** — multiple portions per product, "+ Adicionar Porção" inheriting the product name without retyping, one product identity after grouping (case-insensitive/trimmed), portion removal (first/middle), B.1/B.2 product-level-info survival across add/remove/reorder, cross-product isolation, existing-product regression (`NewProductInfoPanel` still absent), genuinely-new-product regression, independent selling prices, rename-group semantics, and the existing-catalogue-product completion cases (first-click-from-zero manual rows, multi-portion identity, delete-first/middle, cross-contamination guard, unaffected pre-existing manual-card behavior).
- `tests/periodic-stock-portion-grouping-wiring.test.ts` (updated): **16/16 pass**.
- B.1 suite (`periodic-stock-new-product-panel.test.ts`): **11/11 pass**. B.2 suite (`periodic-stock-arbitrary-length-relationship.test.ts`): **15/15 pass**.
- 9 further regression suites, including `InitialStockCountView.tsx`'s own equivalent wiring test (`initial-stock-portion-grouping-wiring.test.ts`): **all pass**.
- **Total: 167/167 tests across 12 suites.**

**Governance compliance re-check against §36's own scope list:** B.3's multiple-current-stock-portions model, the first-class "+ Adicionar Porção" interaction (for both genuinely-new and existing catalogue products), and product identity preservation across portions — met. No B.4 (cost derivation, cost-field suppression, Total Cost Value) and no B.5-specific code were implemented or touched — confirmed by direct inspection, not merely asserted.

**Not yet done, and not claimed as done by this record:** Decision 37 items B.4 and B.5 (§36, above) remain unimplemented and unauthorized to begin until their own separate, explicit per-item instruction, per §36's own execution rule. B.4 was not started as part of recording this record.

## 40. Execution Record — Decision 37, Item B.4 (Cost-Field Suppression on Non-Purchase-Unit Portions)

**Status: ✅ IMPLEMENTED AND VERIFIED.** Per §36's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result) and §37/§38/§39's identical precedent. This is an execution log entry, not a new Product Architect decision — no item authorized in §36 is reopened, reweakened, or reinterpreted by this record. Only B.4 was executed; B.5 remains unauthorized to begin.

**Commit:** `28e301c` — "feat(contagem): Decision 37 B.4 — Cost-Field Suppression on Non-Purchase-Unit Portions". Verified directly against the actual commit diff (`git diff --stat 514898c..28e301c`), not assumed from a prior in-conversation report alone.

**Governance-contradiction found and resolved before any code was written (recorded here per this document's own §16/§24/§25/§35/§37 precedent for recording a finding discovered before/during an item's own execution, within the same authorized item's scope — not a new decision).** The task instruction this item began from described "B.4" as a full automatic Total Cost Value calculation — a new derivation function, weighted purchase-unit-equivalent math, a non-editable "Total Cost Value" display, and calculation-focused tests — none of which matches this repository's own signed governance. §36 item 4 states B.4 is **"UI-only; introduces no new calculation,"** and the Plan Amendment's own §B.4 text is explicit: **"No new calculation lives here — this item is UI-only; the actual Total Cost Value figure is produced by the already-planned FR-67 code change in `stockCount.ts`"** — a separate, already-authorized-pending-execution item (Implementation Authorization §23 item 5, §24–25; PART A "Contagem Cost-Basis Conversion" in the Plan). Per §36's own execution rule step 1 ("read the item's scope... before writing anything") and this document's own repeated stop-condition discipline, implementation did not proceed against the task instruction's description. The Product Architect was asked to resolve the conflict and explicitly chose: **implement B.4 exactly as governed (UI-only suppression, no calculation)** — the scope recorded below implements that choice, not the task instruction's original, ungoverned description.

**Scope implemented, matching §36 item B.4 and Plan Amendment §B.4 exactly:**
- Two new closures in `PeriodicStockCountView.tsx`: `getCostBasisForSuppression` (resolves a product-level cost basis + purchase unit from either an existing product's own, already-confirmed `unitRelationship` — `getUnitRelationshipForProductName`, unchanged — or a genuinely-new product's B.1/B.2 `newProductInfo` panel state, mirroring but not duplicating the authority of the existing submit-time correlation loop's own "complete step" filter) and `isCostFieldSuppressed` (the suppression condition itself: a cost basis + relationship must exist, AND the specific portion's own unit must differ from the purchase unit).
- Wired into both cost-entry sites: the catalog-row `costPrice` input and the manual-row (grouped-card, B.3) `costPrice` input. When suppressed, the editable `<input>` is replaced with a disabled, non-interactive label ("Definido na compra") — the field is neither pre-filled nor auto-computed, since no calculated value exists yet (FR-67 has not landed). The purchase-unit portion's own cost field remains editable in every case — that is the one place the cost basis is actually entered, per Decision 37's own Coca-Cola/CX example.
- `row.costPrice` itself, `updateCatalogRow`, `updateManualRow`, and `StockCountWorkingRow`'s shape are completely untouched — no value is read, cleared, coerced, or derived by this change. Confirmed by the new suite's own regression test (`tallyStockCountRows` byte-identical before/after for a suppressed portion's already-blank cost).

**Diff scope confirmed:** `apps/tenant/src/components/PeriodicStockCountView.tsx` and `tests/periodic-stock-cost-field-suppression.test.ts` (new) only — verified via `git diff --name-only origin/main` at commit `28e301c`. Zero diff on `firestore.rules`, `firestore.indexes.json`, any `package.json`/lockfile, `getConversionFactor`/`unitRelationship.ts`, `stockCount.ts` (including its still-unmodified `Number(raw.costPrice) || 0` fallback — FR-67 remains unexecuted), `stockCountPortionGrouping.ts`, `contagemMultiUnitValuation.ts`, `calculations.ts`, `AppContext.tsx`, `Product`/`UnitRelationship`/`StockBatch` type shapes, Mode A/Mode B selling logic, `totalSellingValue`/`productValuationTotal`, Business Worth's selling-basis formula, Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item.

**B.1, B.2, and B.3 confirmed intact.** `NewProductInfoPanel`, `newProductInfo` (keyed by `productKeyFor`), B.2's `relationshipSteps`, B.3's grouped-card/`handleAddPortionToManualGroup`/`handleRenameManualGroup` mechanics, and every prior item's own state-survival-across-deletion/reordering guarantee are untouched by B.4's two new closures — neither closure writes to any state, both are pure reads of existing `products`/`newProductInfo`. Re-verified by the B.1 suite (11/11), B.2 suite, and B.3 suite (`periodic-stock-add-portion.test.ts`, `periodic-stock-portion-grouping-wiring.test.ts`), all passing unmodified against this commit.

**Verification results, run at commit `28e301c` for this record:**
- `npm run lint:tenant` (`tsc --noEmit -p apps/tenant`): clean, 0 errors.
- `tests/periodic-stock-cost-field-suppression.test.ts` (new): **10/10 pass** — existing-product suppression (Coca-Cola/CX/EMB/UN example), purchase-unit portion never suppressed (case-insensitive), no-relationship and invalid/incomplete-relationship non-suppression, new-product suppression via `newProductInfo`, incomplete new-product entry (no complete step, no purchase cost) non-suppression, blank-portion-unit non-suppression, existing-product precedence over a stale `newProductInfo` entry for the same key, and a regression proving `tallyStockCountRows`' `quantity*costPrice`/`sellingPrice` math is unaffected.
- B.1 suite: **11/11 pass**. B.2, B.3 (`periodic-stock-add-portion.test.ts`, `periodic-stock-portion-grouping-wiring.test.ts`), Mode A integration, multi-portion valuation, finalization, and draft-resurrection suites: **all pass**.
- Selling-side/Business-Worth regression, run individually: `tests/contagem-multi-unit-valuation.test.ts` **17/17 pass**; `tests/business-worth-current-read-path.test.ts` **29/29 pass**; `tests/business-worth-measured-value.test.ts` **5/5 pass**.
- `git diff --check`: clean.

**Governance compliance re-check against §36's own scope list:** B.4's cost-field suppression, gated on a product-level cost basis + confirmed relationship existing (B.1/B.2), UI-only, no new calculation — met. No FR-67 cost-derivation code, no Total Cost Value figure or display, and no B.5-specific code were implemented or touched — confirmed by direct inspection (the exclusion list above), not merely asserted.

**Not yet done, and not claimed as done by this record:** Decision 37 item B.5 (§36, above) remains unimplemented and unauthorized to begin until its own separate, explicit instruction, per §36's own execution rule — though §36 item 5 already anticipates B.5 requires no new code beyond B.1's existing-product read-only branch. The separately-authorized-pending-execution FR-67 item (Implementation Authorization §23 item 5, §24–25) also remains unexecuted; `stockCount.ts`'s `Number(raw.costPrice) || 0` fallback is unchanged by this record, confirmed above.

---

## 41. Execution Record — Increment 10 Item 5 (Contagem Cost-Basis Conversion, FR-67) + Post-Implementation Correction §25 (Contagem Cost-Price Zero-Fallback Removal)

**Status: ✅ IMPLEMENTED AND VERIFIED — NOT YET COMMITTED.** Per §23's own execution rule (steps 4–7: run verification, inspect the diff, verify governance compliance, record the result) and §37/§38/§39/§40's identical precedent for an execution log entry, not a new Product Architect decision. Item 5 was authorized at §23 item 5; its paired removal of the silent-zero cost-price fallback was authorized at §25, above (and jointly, again, at §23 item 5's own text: "authorized only together with, and subject to, §25 below, not independently"). Both were implemented together, in the same change, exactly as required. No item authorized at §23 or §25 is reopened, reweakened, or reinterpreted by this record. Only Item 5 + §25 were executed; no other Increment 10 item (§23 items 1–4, 6, 7) was started or touched.

**Authoritative cost-basis source, resolved by explicit Product Architect instruction before implementation began (recorded here per this document's own §16/§24/§25/§35/§37/§40 precedent for recording a pre-implementation finding/resolution within the same authorized item's scope — not a new decision).** Direct inspection of the submission-time data flow (`PeriodicStockCountView.tsx`'s `handleConfirmSave`, `AppContext.tsx`'s `recordStockCount`) found that an existing catalogued product's confirmed `unitRelationship` was never threaded into the submitted item at all (only a genuinely-new product's was), and that the UI's own cost-field pre-fill (`buildCatalogRow`) sources from `latestBatch.costPrice` — priced in whatever unit that batch happened to be recorded in, not necessarily the product's own purchase unit — creating a genuine ambiguity among three candidate "original purchase cost" sources this Authorization did not itself resolve. Implementation stopped and reported this before writing any code, per §13/§14's own stop-condition discipline. The Product Architect resolved it explicitly:

> The authoritative original cost basis for FR-67 is `Product.costPrice` + `Product.unitRelationship.units[0].unit` — together, e.g. `1,250 MZN/CX`. `StockBatch.costPrice` is never used as a substitute when its unit differs from the purchase unit, and the current Contagem's own row never redefines the product's original cost basis. FR-67 must still work even when no purchase-unit portion is counted in the current Contagem — the basis is read from the Product record, not reconstructed from the current rows.

This resolution governs the implementation recorded below; it is restated here for traceability, not re-decided.

**Scope implemented, matching §23 item 5 and §25 exactly:**
- `apps/tenant/src/lib/fr67CostBasisConversion.ts` (new): the single shared, pure cost-basis module. `deriveCostContribution(quantity, unit, rawCostPrice, basis)` — the ONE calculation both call sites below use — derives a portion's cost contribution via `getConversionFactor` (reused unmodified, no new conversion engine) when a valid `ProductCostBasis` and a convertible unit are both present (the FR-67-governed case, including the purchase-unit portion itself, per the resolution's "do not let the current row redefine the basis" instruction), and falls back to `quantity * rawCostPrice` — §25's own exact, unchanged behavior, including its existing zero-coercion for a blank manual entry — whenever no valid basis exists or the unit is genuinely outside the confirmed chain (`getConversionFactor` returns `null`). `buildProductCostBasisMap(products)` resolves the `ProductCostBasis` lookup from `Product.costPrice`/`Product.unitRelationship` for every product that has both, so both call sites resolve the SAME basis the SAME way.
- `apps/tenant/src/utils/stockCount.ts`: `normalizeStockCountItems` (persisted `totalValue`, called from `recordStockCount`) and `tallyStockCountRows` (Owner-facing preview `totalPurchaseValue`, called from `PeriodicStockCountView.tsx`'s live tally and confirm-time tally) each gained one new, optional parameter, `costBasisByProductName`, and now call `deriveCostContribution` for each row/item's cost contribution instead of the old, unconditional `quantity * costPrice`. Neither function's own item/row shape changed; each item's own `costPrice` field is left exactly as entered — never overwritten with a derived value (no synthetic per-portion cost price is ever written, stored, or displayed). Absent the new parameter (every pre-existing call site that does not pass it), both functions are byte-for-byte unchanged from their pre-correction behavior.
- `apps/tenant/src/context/AppContext.tsx`: `recordStockCount` builds `costBasisByProductName` via `buildProductCostBasisMap(tempProducts)` — the pre-write catalog state this function already holds — and threads it into its own `normalizeStockCountItems` call. No other line in `recordStockCount` changed; the selling-basis path (`normalizedTotalSellingValue`, `StockCount.totalSellingValue`) is untouched.
- `apps/tenant/src/components/PeriodicStockCountView.tsx`: the SAME `buildProductCostBasisMap`, called over `products` (memoized), threaded into both existing `tallyStockCountRows` call sites — `liveTally` and `handleRequestConfirmation`'s own tally. This is what makes the Owner-facing preview and the persisted `StockCount.totalValue` use the identical resolution and the identical calculation, confirmed by a dedicated parity test (below) rather than merely asserted.

**The exact mandatory example, verified passing:** product basis `1,250 MZN/CX`; relationship `1 CX = 4 EMB = 24 UN`; counted `2 CX + 3 EMB + 5 UN` → `2 + 0.75 + 0.208333... = 2.958333... CX` → **`3,697.92 MZN`**, produced identically by `tallyStockCountRows` (preview) and `normalizeStockCountItems` (persistence) for the same input.

**No synthetic per-portion cost price is created, stored, or displayed anywhere** — `deriveCostContribution` returns a currency VALUE only, never a per-EMB/per-UN rate; each normalized item's/tally item's own `costPrice` field remains exactly the raw entered value, confirmed by dedicated tests on both call sites.

**§25's exact, unchanged fallback is preserved outside the governed case** — no valid `Product.costPrice`/`unitRelationship` for the product, or a portion whose unit is genuinely outside the confirmed chain — cost is not derived; the caller's raw, already-coerced `costPrice` is used, including its existing zero-coercion for a genuinely blank manual entry. This is FR-67's own named exception, mirroring `getConversionFactor`'s own null-handling contract exactly, and is never a second, invented fallback policy.

**Selling-side and Business Worth confirmed untouched.** `sellingPrice`, `totalSellingValue`, `productValuationTotal`, and `measuredBusinessWorth` are not read, written, or referenced anywhere in `fr67CostBasisConversion.ts`, and no line touching them changed in `stockCount.ts`, `AppContext.tsx`, or `PeriodicStockCountView.tsx` — confirmed both by direct diff inspection (below) and by dedicated regression tests asserting `totalSellingValue` is unaffected even when a cost basis derives a non-trivial `totalValue` for the same items.

**Diff scope confirmed** via `git diff --name-only` / `--stat` against the pre-Item-5 baseline (`fbab06c`): `apps/tenant/src/components/PeriodicStockCountView.tsx`, `apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/utils/stockCount.ts`, `tests/periodic-stock-portion-grouping-wiring.test.ts`, `tests/stock-count-simplification.test.ts` (both test files updated only to match the new, authorized `tallyStockCountRows(allWorkingRows, costBasisByProductName)` call signature in their own pre-existing source-level wiring guards — the invariant each guard protects, `allWorkingRows` as the sole, unfiltered source of truth, is unchanged), plus two new files: `apps/tenant/src/lib/fr67CostBasisConversion.ts` and `tests/contagem-cost-basis-conversion.test.ts`. Zero diff on `firestore.rules`, `firestore.indexes.json`, any `package.json`/lockfile, `Product`/`UnitRelationship`/`StockBatch` type shapes, `getConversionFactor`/`purchaseToSellingConversion.ts` (reused unmodified), `contagemMultiUnitValuation.ts` (Mode A, untouched), `calculations.ts`, `unitRelationship.ts`, Mode A/Mode B selling logic, `totalSellingValue`/`productValuationTotal`, Business Worth's selling-basis formula, Owner-Declared Business Worth, Fecho, Owner Portfolio, or any other Increment 10 item.

**Verification results:**
- `npx tsc --noEmit -p apps/tenant`: clean, 0 errors.
- `git diff --check`: clean, 0 whitespace errors.
- New suite, `tests/contagem-cost-basis-conversion.test.ts`: **31/31 pass** — every §8/§10 edge case (same purchase unit, two-level, three-level, four-level relationships, invalid/unconvertible unit, no relationship, invalid relationship, missing/negative purchase cost, non-purchase-unit blank cost not silently zeroed, mismatched purchase-unit-vs-relationship defensive case), the exact mandatory 3,697.92 example, `buildProductCostBasisMap` resolution rules, `normalizeStockCountItems`/`tallyStockCountRows` integration (including no-CX-portion-present, multiple products isolated, multiple portions of one product, no-synthetic-costPrice), preview/persistence parity, and selling-side independence.
- Named required regression review (§25's own text): `tests/contagem-multi-unit-valuation.test.ts` (**28/28 pass**) and `tests/periodic-stock-mode-a-integration.test.ts` (**all pass**) — both pass unmodified; neither fixture relied on or merely tolerated the silent-zero default within FR-67's own narrow scope, so neither required updating.
- Broader non-emulator regression sweep, 90 of 91 test files (batched to avoid a single-process resource limit): **0 failures caused by this change.** Includes B.1–B.4 (`periodic-stock-new-product-panel`, `periodic-stock-arbitrary-length-relationship`, `periodic-stock-add-portion`, `periodic-stock-portion-grouping-wiring`, `periodic-stock-cost-field-suppression`), `stock-count-portion-grouping`, `stock-count-row-grouping`, `stock-count-simplification`, `initial-stock-confirmation`, `initial-stock-portion-grouping-wiring`, and the named Business Worth suites (`business-worth-measured-value`, `business-worth-snapshot-product-valuation-line`, `business-worth-snapshot-foundation`). A small number of unrelated `not ok`/cancelled results, all traced to one pre-existing cause — no Firestore emulator reachable in the implementation sandbox — confirmed via `git stash` to reproduce identically on the pre-Item-5 baseline; not attributable to this change.
- Emulator-backed suites (`tests/firestore-rules.test.ts`, `tests/business-worth-snapshot-foundation.test.ts`, `tests/business-worth-owner-declared.test.ts`, `tests/business-worth-audit-trail.test.ts`, `tests/periodic-stock-finalization.test.ts`, `tests/open-batch-concurrency.test.ts`, `tests/supplier-wording-confirmation-concurrency.test.ts`, `tests/superadmin-audit-log-firestore-query.test.ts`, `tests/superadmin-business-directory-firestore.test.ts`): subsequently run by the Product Architect against a locally-running Firestore emulator — **all pass**.

**Governance compliance re-check against §23 item 5 and §25's own text:** deterministic, unconditional derivation via the existing `getConversionFactor` engine for the FR-67-named case — met (AC-R3-5). Silent-zero fallback removed only within that same named case; manual-entry behavior outside it (single-unit Contagem, or no confirmed `unitRelationship`) unchanged — met (AC-R3-9). No new conversion engine, no new field on `UnitRelationship`, no synthetic per-portion cost price, no change to selling-price entry, `deriveModeAPortionValuations` (Mode A), `totalSellingValue`, `productValuationTotal`, or Business Worth's selling-basis formula — all confirmed by direct inspection (diff scope, above), not merely asserted.

**No other Increment 10 item was implemented, started, or touched by this record.** §23 items 1 (Owner-Declared Business Worth), 2 (opening-balance/other-obligation Payables), 3 (`OwnerInvestment`), 4 (recurring receivable reminders), 6 (Fecho batch-level profit attribution), and 7 (Dashboard/report terminology correction) remain exactly as they stood before this record, per §23's own one-item-at-a-time execution rule.

**Item 5 + §25 are now implemented and verified.** Not yet committed or pushed, and no execution-record commit has been made — this record documents the working-tree state pending the Product Architect's review and explicit authorization to commit, per that review's own governing instruction.

---

## 42. Execution Record — Decision 37, Item B.5 (First-Time vs. Subsequent Contagem Distinction)

**Status: ✅ IMPLEMENTED AND VERIFIED.** Per §36's own execution rule and §37–§41's identical precedent. This is an execution log entry, not a new Product Architect decision — no item authorized in §36 is reopened, reweakened, or reinterpreted by this record.

**Governance context — why this record exists in two parts.** §36 item 5 (B.5) states its own entire authorized scope is: *"Confirmed no new code required beyond B.1's read-only-summary branch. The existing `isGenuinelyNewProductName` gate already distinguishes the two cases; B.1 above is the only place this distinction needs new rendering logic."* Execution Record §37 (B.1) implemented only the first-time editable branch (`NewProductInfoPanel`) and explicitly recorded, in its own words, that the panel "never [renders] for an already-catalogued product" — meaning nothing rendered in its place for an existing product at all. This left B.5's own stated precondition unmet: the read-only-summary branch it depends on did not exist. A separate corrective pass (recorded as its own commit, `43f657d`, preceding this record) completed B.1's own already-authorized scope by adding `ExistingProductSummary` — the missing branch B.1's own Plan text (§B.1) named but never built. That correction is B.1-scoped, not B.5-scoped, and is not re-litigated here; it is restated only so this record's own basis is traceable.

**With B.1 now complete, B.5's own stated precondition is met, and B.5 itself requires zero additional code — confirmed by direct inspection, not assumed:**
- The first-time editable branch (`NewProductInfoPanel`) and the subsequent read-only branch (`ExistingProductSummary`) are both gated by the same `isGenuinelyNewProductName`/`isNewProduct` check B.5's own text names as already sufficient — no new gate, marker, or distinguishing mechanism was introduced.
- The two branches are mutually exclusive by construction: the manual-row loop's `ExistingProductSummary` call site is gated `!isNewProduct && cardIsFirstPortionOfMultiPortionGroup` — the literal negation of `NewProductInfoPanel`'s own `isNewProduct` gate on the same card — so exactly one of the two ever renders per product, confirmed by a dedicated test (`tests/periodic-stock-existing-product-summary.test.ts`, "the manual-row loop renders it only when `!isNewProduct`, so it and `NewProductInfoPanel` are mutually exclusive per card — never both for the same product").
- The catalog-row loop needs no `isGenuinelyNewProductName` check at all for `ExistingProductSummary`, since a catalog row is never genuinely new by construction (confirmed by the same principle §37's own record already established for this file).

**No code was written or changed by this record itself** — B.5's own scope was fully satisfied by the B.1 completion commit (`43f657d`) that precedes it. This record's own purpose is solely to close out B.5 as its own separately-authorized item, per §36's own per-item execution/recording discipline, and to correct the false "B.5 requires no new code" premise §36 item 5 stated in good faith at authorization time — true again now, but only after the B.1 gap it depended on was actually closed.

**Diff scope:** none, for this record. See `43f657d`'s own commit message for the B.1 completion diff scope (`apps/tenant/src/components/PeriodicStockCountView.tsx`, `tests/periodic-stock-existing-product-summary.test.ts` only).

**Verification results:** `npx tsc --noEmit -p apps/tenant`: clean. `tests/periodic-stock-existing-product-summary.test.ts`: **11/11 pass**. `tests/periodic-stock-new-product-panel.test.ts` (B.1's own suite, unaffected): **11/11 pass**. Full Contagem-related regression battery (13 suites): **212/212 pass**. `npm run build`: succeeds.

**Governance compliance re-check against §36's own scope list:** the first-time/subsequent distinction now renders correctly via the existing `isGenuinelyNewProductName` gate, with no new marker or mechanism introduced — met. No change to Mode A/B, portion creation/grouping, valuation, `normalizeStockCountItems`, `StockCount` confirmation, `producesBusinessWorthSnapshot`, or any other Increment 10/Increment 1 item — confirmed by direct inspection, not merely asserted.

**Decision 37 (B.1–B.5) is now fully implemented.** All five items — §37 (B.1, plus its own completion above), §38 (B.2), §39 (B.3), §40 (B.4), and this record (B.5) — are executed and verified. The separately-authorized-pending-execution FR-67 item (§23 item 5, recorded implemented-but-not-yet-committed at §41, above) remains its own distinct item, unaffected by this record.

---

## 43. Product Architect Authorization — CAIXER (BDR Decision 40 / Specification §45) — DRAFT

**Status: 🔶 DRAFT — AWAITING PRODUCT ARCHITECT SIGNATURE.** Drafted below per this document's own established "one umbrella Authorization, extended, not replaced" discipline (§7's own opening statement; §17–§21, §23, §34–§36's own precedent for adding a new dated item) and this repository's established pending-authorization convention (`capital-inicial-retirement-implementation-authorization.md`, "Product Architect Authorization — Amendment 2/3 — Pending"). **Drafting this section authorizes nothing by itself.** No `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or test file is touched to produce it. Signing the blank Formal Acceptance block at the end of this section (§43.7, below) is the sole act that would authorize implementation to be instructed to begin — and even then, per §7's own one-item-at-a-time discipline restated at §43.5 below, signature is the governance gate only, not an instruction to start.

### 43.1 Governing Chain

`BDR-pending-business-worth-evolution-measurement-model.md` Decision 40 (✅ SIGNED, SABUSHIMIKE MASCENI, 11 September 2026; [full decision record](./caixer-multi-method-liquidity-measurement-decision.md)) → Specification §45 (✅ ACCEPTED, 11 September 2026, including §45.13's refinement, FR-73–FR-81, Invariant I-8) → Rule 8 Assessment Addendum — CAIXER (`business-worth-evolution-rule8-assessment.md`, ✅ ACCEPTED, verdict `READY FOR IMPLEMENTATION PLAN`) → Product Architect Acceptance of the Rule 8 gate decisions CX-1, CX-2, CX-6, CX-13, CX-14 (`caixer-rule8-gate-decisions-product-architect-acceptance.md`, ✅ ACCEPTED AND SIGNED, 11 September 2026) → Implementation Plan Amendment — CAIXER (`business-worth-evolution-implementation-plan.md`, ✅ ACCEPTED, 11 September 2026, commit `07cef6e528849a3807dc9d03b53e5f8668bdd26f`; Plan-level acceptance itself recorded at commit `fb55434fef0afa0ac32867c3402091654a8e3552`) → **this draft Authorization item (§43), pending signature.**

**One umbrella Authorization, extended, not replaced** — this section does not create a second, separate Implementation Authorization for CAIXER; it proposes to extend the single existing document with a new dated item, exactly as §17–§21, §23, and §36 already did for Increments 5–9, Increment 10, and Decision 37 respectively.

### 43.2 Scope of This Authorization Item — Exactly the Accepted Plan Amendment's §B–§I, No More

Per the accepted Implementation Plan Amendment's own checkpoints (`business-worth-evolution-implementation-plan.md`, "Implementation Plan Amendment — CAIXER" section):

1. **Plan §B (C.1, C.2) — Data model.** Four new optional `BusinessWorthSnapshot` fields (`cashPositionCash`, `cashPositionEmola`, `cashPositionMpesa`, `cashPositionBanco`, `apps/tenant/src/types.ts`) and one new optional `PeriodicStockDraft.caixerDraft` field for durable in-progress CAIXER entry.
2. **Plan §C (C.3–C.5) — CAIXER UI/state flow.** A new `caixerStage` sub-stage inserted at `PeriodicStockCountView.tsx`'s existing `handleRequestConfirmation` entry point, satisfying FR-80's direct-transition requirement; the existing `pendingTally` review screen extended to display all four CAIXER components plus the system-calculated total alongside the already-shown product valuation (FR-81/CX-6); reversible "Corrigir Caixa"/"Voltar" navigation that never clears `caixerDraft` or `pendingTally`.
3. **Plan §D (C.6–C.8) — Non-destructive validation and write-boundary enforcement.** Client-side blocking validation (`0` valid, blank invalid); a new pure `computeCaixerTotalLiquidity()` function (`calculations.ts`); `RecordStockCountParams`/`recordStockCount` (`AppContext.tsx`) changed to derive `cashPosition` internally from four new parameters rather than accept it directly; new `firestore.rules` conditions on the existing `businessWorthSnapshots` `allow create` Contagem branch enforcing four-field presence/type (CX-2) and aggregate-sum consistency within a fixed tolerance (CX-1).
4. **Plan §E — Reconciliation.** Confirmed, not newly coded: `computeCashReconciliationDifference` and its call site are unchanged; CX-13's total-only acceptance requires no new function, no per-method ledger.
5. **Plan §G (C.9) — Standalone declaration gap fix.** Removes the existing silent `ownerConfirmedCashPosition: cashPositionDeclarations[0].amount` reuse (`PeriodicStockCountView.tsx:5649-5651`); the most recent declaration may be shown as a labeled reference/hint only, never pre-filling or auto-submitting a CAIXER value (FR-76, closes Rule 8 Finding CX-8).
6. **Plan §H — Backward compatibility.** No migration, no backfill; the four new fields remain genuinely absent on every pre-CAIXER snapshot (CX-14).
7. **Plan §I — Security/tenant isolation.** The two new `firestore.rules` conditions named in item 3, above, are the only new security-rule surface this item introduces; no new collection, no new role, no widened grant.

**No item outside Plan §B–§I is authorized by this section.** In particular, this authorization does **not** cover anything the Plan's own "Explicitly Out of Scope" section already excludes (per-method ledgers/reconciliation, Business Worth Engine redesign, Owner Investment/Levantamento redesign, historical rewriting, background jobs, unrelated UI/Contagem redesign, `firestore.indexes.json` changes) — restated in full at §43.4, below.

### 43.3 Non-Destructive Validation — Mandatory, Binding on Every Checkpoint

**This requirement is not optional implementation guidance — it is a formal Product-Architect-accepted acceptance criterion**, per `caixer-rule8-gate-decisions-product-architect-acceptance.md` §3 and restated at Plan §F ("Critical Data-Preservation Analysis"). It governs Plan §C.3–§C.8 in particular and is binding on implementation of every checkpoint in §43.2 that touches CAIXER input, validation, or the confirmation write path:

If validation fails — because a required CAIXER field is blank/invalid client-side, or because the authoritative server-side check (the new `firestore.rules` conditions, §43.2 item 3) rejects a submission — the implementation MUST:

- preserve every already-entered CAIXER value (never clear the form);
- preserve all in-progress Stock Count/Contagem data (never discard a stock-count quantity or reset the workflow);
- never create a partial or invalid `BusinessWorthSnapshot`;
- identify the exact field(s) in error;
- keep the operator on the relevant step, able to correct and resubmit;
- treat a transient network/server failure identically — no code path introduced by this authorization may silently destroy the operator's in-progress work on a failed submission.

**Verification requirement:** the Execution Record for any checkpoint touching validation/the confirmation write path must explicitly test and report on this behavior — a passing test suite that does not exercise at least the "one field blank," "server rejects the aggregate," and "operator navigates backward and corrects" scenarios named at Plan §F does not satisfy this authorization's own completion bar for that checkpoint.

### 43.4 Explicitly Out of Scope (Restated from the Accepted Plan, Binding)

This authorization does **not** cover, and no checkpoint under §43.2 may be used to justify:

- per-method transaction ledgers for eMola, M-Pesa, or Banco, or any change to `CashLedgerEntry`'s schema;
- per-method reconciliation of any kind (CX-13 fixes total-only, restated §43.2 item 4);
- any new payment/billing architecture;
- redesign of Owner Investment (§43 of the Specification) or Levantamento (§19) — neither is reopened, touched, or reinterpreted;
- rewriting, migrating, or backfilling any historical `BusinessWorthSnapshot`;
- background liquidity jobs or scheduled liquidity recomputation of any kind — every CAIXER computation is synchronous, inside the existing atomic confirmation write;
- cross-business queries of any kind;
- unrelated Contagem redesign — `stockCountPortionGrouping.ts`, `contagemMultiUnitValuation.ts`, and Decision 37's own B.1–B.5 items are untouched;
- unrelated module changes — Owner-Declared Business Worth, Fecho, Owner Portfolio, receivable reminders, Fecho batch-level profit, and every other Increment 10/Decision 37 item already authorized elsewhere in this document remain exactly as scoped there;
- unrelated UI redesign — only `PeriodicStockCountView.tsx`'s CAIXER entry/Review sections named at §43.2 item 2 are in scope;
- `firestore.indexes.json` — no new query pattern is introduced;
- redesign of `computeMeasuredBusinessWorth`'s signature/formula, or the fresh-remeasurement principle — both unchanged;
- any product or architectural redesign not contained in the accepted CAIXER Specification (§45) or the accepted Implementation Plan Amendment.

### 43.5 Execution Rule, If Signed (Mirrors §7/§23/§36's Discipline Exactly)

1. Read the item's scope (§43.2, and the Plan Amendment's own §B–§I text) before writing anything.
2. Verify prerequisites — per the Plan's own "Dependencies" section: types (§B) before the `AppContext.tsx` write payload (§D); the entry-screen state (§C.3) before Review (§C.4); §D's `firestore.rules` change may land independently of, or before, the client-side derivation change.
3. Implement only that item's own scope — no checkpoint may silently implement a later checkpoint's functionality.
4. Run the tests the Plan Amendment's own "Tests Anticipated" section names for that checkpoint, including every regression check it lists (byte-identical `computeMeasuredBusinessWorth` behavior where unchanged, existing Go-Back/idempotency coverage, existing tenant-isolation pattern extended, not replaced).
5. Inspect the diff — confirm no file outside the checkpoint's own named surfaces was touched, unless a genuinely required change is separately identified and justified.
6. Verify governance compliance against this section's own scope (§43.2) and out-of-scope list (§43.4), and explicitly verify the non-destructive validation requirement (§43.3) for any checkpoint that touches it.
7. Record the result as its own dated Execution Record section, mirroring §37–§42's format.
8. Only then proceed to the next checkpoint.

**Implementation remains strictly one checkpoint at a time** — no checkpoint under §43.2 becomes authorized to *begin* merely because this section is signed; each requires its own further, separate, explicit "begin this item" instruction, exactly as §36 already establishes for Decision 37's B.1–B.5.

### 43.6 Acceptance Criteria Governing Completion

Traceable to the Specification (§45, FR-73–FR-81), the Rule 8 gate decisions (CX-1, CX-2, CX-6, CX-13, CX-14), and the accepted Implementation Plan's own Traceability table:

- **AC-CX-1** — all four CAIXER fields (Cash, eMola, M-Pesa, Banco) are mandatory at authoritative submission; blank/null/undefined is rejected at both the UI and `firestore.rules` layer (FR-73).
- **AC-CX-2** — an explicit `0` is valid and accepted identically to any other numeric value, at every layer, with no falsy-coercion defect (§45.2).
- **AC-CX-3** — `cashPosition` is never accepted as direct, independently-typed input through any code path; it is always the system-calculated sum of the four components (FR-79, CX-1).
- **AC-CX-4** — the authoritative write boundary (`firestore.rules`) recomputes/verifies the aggregate-consistency relationship rather than trusting a client-supplied `cashPosition` (CX-1).
- **AC-CX-5 — NON-DESTRUCTIVE VALIDATION (see §43.3, binding in full).** A validation failure at any layer never clears CAIXER input, never discards Stock Count/Contagem state, never resets the workflow, and never produces a partial `BusinessWorthSnapshot`; the operator can always identify the error, correct it, and resubmit.
- **AC-CX-6** — the Contagem action concluding physical stock counting transitions directly into CAIXER entry, with no intervening screen or deferral option (FR-80).
- **AC-CX-7** — the Review step, before final confirmation, displays Cash, eMola, M-Pesa, Banco, the system-calculated Total Liquidity, the measured product/stock valuation, and the complete governed Business Worth calculation (FR-81, CX-6).
- **AC-CX-8** — before final confirmation, the Owner may move backward from Review to CAIXER, and from CAIXER to Stock Count, correcting any value; no `BusinessWorthSnapshot` exists, and no data is lost, at any point in this reversible flow (Rule 8 Finding CX-5; the "Additional Product Architect Principle").
- **AC-CX-9** — a `BusinessWorthSnapshot` is created only once, atomically, at successful final confirmation, and is immutable thereafter outside the existing §25/§26 correction/recovery windows.
- **AC-CX-10** — the existing `submissionId`-keyed idempotency protection continues to prevent a retried or duplicate confirmation from producing more than one snapshot, with CAIXER data present (Rule 8 Finding CX-7).
- **AC-CX-11** — every pre-CAIXER historical `BusinessWorthSnapshot` remains valid, immutable, and readable without migration, backfill, or fabricated zeros on the four new fields (CX-14).
- **AC-CX-12** — reconciliation (`computeCashReconciliationDifference`) is performed against the four-method total only; no per-method reconciliation mechanism or per-method ledger is introduced (CX-13).
- **AC-CX-13** — no cross-business CAIXER read or write is possible; the two new `firestore.rules` conditions apply only within the existing `isMemberOf`/`isOwnerOf`-scoped branch, and aggregate verification is scoped to the single writing business (Rule 8 Finding CX-15).
- **AC-CX-14** — no unauthorized change to Business Worth economics, Owner Investment, Levantamento, stock/cash conversion semantics, Startup Investment, or historical snapshot economics is introduced by any checkpoint (§45.6, Rule 8 Finding CX-11/CX-12).
- **AC-CX-15** — no double-counting: money measured through any CAIXER method that is later converted into stock, or transferred between methods, is never attributed to more than one Contagem or more than one of {CAIXER component, physical stock count} within the same Contagem (I-8, FR-77).

### 43.7 Formal Acceptance — PENDING, NOT SIGNED

> I have reviewed §43, "Product Architect Authorization — CAIXER," in full, including its scope (§43.2), the mandatory non-destructive validation requirement (§43.3), its explicit out-of-scope boundaries (§43.4), the execution rule (§43.5), and the acceptance criteria (§43.6). I understand that signing below authorizes, exactly and only, the checkpoints named in §43.2 (Plan §B–§I), to be implemented strictly one checkpoint at a time per §43.5, subject to every boundary in §43.3/§43.4. I understand this does not reopen or reinterpret BDR Decision 40, Specification §45, the Rule 8 Assessment Addendum, the CX-1/CX-2/CX-6/CX-13/CX-14 acceptance, or the accepted Implementation Plan Amendment. I understand this signature is a governance authorization gate only — it does not itself instruct implementation of any checkpoint to begin; a further, separate, explicit per-checkpoint instruction is required before any code, test, or `firestore.rules` change may be made.
>
> **Product Architect:** ______________________________
> **Date:** __________________________________________
> **Decision:**
> ☐ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

**Status: 🔶 DRAFT — AWAITING PRODUCT ARCHITECT SIGNATURE.** The Formal Acceptance block above is blank, per this repository's own established pending-authorization convention (`capital-inicial-retirement-implementation-authorization.md`'s "Pending" sections) — it is preserved exactly as circulated for review; a future, separate, dated "§43 — Recorded" section is where an actual signature would be entered, mirroring that document's own Pending → Recorded pattern. **Implementation remains blocked until the Product Architect formally accepts/signs this Implementation Authorization.** No checkpoint in §43.2 is authorized to begin, no code/test/`firestore.rules` file may be modified on the strength of this section, and this document's own §7/§23/§36 precedent for what a signature does and does not authorize applies identically here, once and if signed.

---

## 44. Product Architect Authorization — CAIXER — Recorded

**Status: ✅ AUTHORIZED FOR IMPLEMENTATION (11 September 2026).** Recorded additively below, per this repository's own established signature-recording convention (`capital-inicial-retirement-implementation-authorization.md`'s "Amendment N — Pending" → "Amendment N — Recorded" pattern; this document's own §14/§31 "signature is a separate, later, dated act" precedent) — **§43 above, including its own "DRAFT — AWAITING PRODUCT ARCHITECT SIGNATURE" status lines and the blank Formal Acceptance block at §43.7, is preserved completely unedited as the historical record of what was drafted and circulated for review.** This section is the actual, dated act of signature; §43.1–§43.6's scope, non-destructive validation requirement, out-of-scope list, execution rule, and acceptance criteria are not restated, reworded, or reopened here — they govern exactly as drafted.

**Formal acceptance, recorded verbatim from the Product Architect's own authorization:**

> I, SABUSHIMIKE MASCENI, acting as Product Architect for SABUSH BPT, have reviewed the CAIXER Implementation Authorization §43 in full — its scope (§43.2), the mandatory non-destructive validation requirement (§43.3), its explicit out-of-scope boundaries (§43.4), the execution rule (§43.5), and the acceptance criteria (§43.6) — and hereby AUTHORIZE IMPLEMENTATION.
>
> I authorize implementation of the CAIXER multi-method liquidity measurement model strictly according to: the accepted CAIXER Specification; the resolved Rule 8 decisions; the accepted Product Architect decisions (CX-1, CX-2, CX-6, CX-13, CX-14); the accepted CAIXER Implementation Plan; and the scope, checkpoints, acceptance criteria, invariants, dependencies, and exclusions contained in §43 of this Implementation Authorization.
>
> This authorization does not authorize redesign. Implementation must remain strictly within the accepted governance state, and must in particular preserve: the four CAIXER methods (Cash, eMola, M-Pesa, Banco), all mandatory, `0` valid; Total Liquidity calculated exclusively by the system; `cashPosition` derived from the four components; aggregate consistency enforced at the authoritative write boundary; non-destructive validation in full (§43.3) — on any validation failure, entered CAIXER values and Stock Count/Contagem data must remain, the workflow must not reset, no valid in-progress data may be discarded, the exact error must be identified, the operator must be able to correct and resubmit, and no partial snapshot may be created; the direct Stock Count → CAIXER transition; CAIXER → Review → final confirmation; Review's exposure of all four components, the calculated total, the measured product valuation, and the governed Business Worth calculation together; back-navigation/correction remaining possible until final confirmation; an immutable `BusinessWorthSnapshot` created only at successful final confirmation; existing duplicate-confirmation/idempotency protection; backward compatibility with pre-CAIXER historical snapshots, without unnecessary migration or rewriting; total-only reconciliation, with no per-method transaction ledgers; unchanged Owner Investment, Levantamento, stock/cash conversion, and Business Worth economic semantics; intact tenant isolation and existing authorization boundaries; and no unrelated module or product redesign.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 11 September 2026
> **Decision:**
> ☑ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

**Governance gate — resolved.** §43's own Governance Gate (§43's closing paragraph) and its §7/§23/§36-mirrored execution discipline now apply as an active authorization, not a pending one: this signature is the governance authorization gate for the seven checkpoints named at §43.2 (Plan §B–§I) — it authorizes them to be implemented, strictly **one checkpoint at a time** (§43.5), subject in full to §43.3 (non-destructive validation, binding and unweakened), §43.4 (explicit exclusions, unweakened), and §43.6 (acceptance criteria, unweakened). None of §43.1–§43.6 is reopened, reworded, or reinterpreted by this signature.

**This signature does not itself instruct implementation of any checkpoint to begin.** Per §43.5's own "implementation remains strictly one checkpoint at a time" discipline and this document's identical §36 precedent for Decision 37 ("no item becomes authorized to begin merely because the section is signed"), a further, separate, explicit per-checkpoint instruction — naming which of §43.2's seven items (or which grouping) is to be implemented first — remains required before any application code, test, `firestore.rules`, or `firestore.indexes.json` file may be created or modified. **No such instruction is given, implied, or begun by this section.** No Execution Record (mirroring §37–§42's format) exists yet for any CAIXER checkpoint.

**Next Governance Step:** a separate, subsequent, explicit instruction identifying the first CAIXER checkpoint to implement — not performed, drafted, or implied by this signature.

---

## 45. Product Architect Authorization — Owner Investment UI Entry Point (OI-PA-3 / OI-PA-4)

**Status: ✅ AUTHORIZED FOR IMPLEMENTATION (12 September 2026).** Recorded per this document's own established signature-recording convention (§14/§31/§36/§44's "signature is a separate, later, dated act" precedent). This section formalizes, at Authorization level, the Product Architect decisions already recorded at Plan level as OI-PA-3 and OI-PA-4 (`business-worth-evolution-implementation-plan.md`, "Product Architect Decisions — Owner Investment Completion Scope"), following the existing Owner-Declared UI authorization precedent (§26, above).

**Governing basis, in order:** the OI-PA-1 through OI-PA-14 audit and decision record (✅ Accepted, 12 September 2026, Plan) → OI-PA-3 ("Owner Investment User Entry Point") and OI-PA-4 ("Simple Entry Form") specifically → §23 item 3 of this Authorization (Increment 10, `OwnerInvestment` new collection/rules/atomic pairing — already authorized and implemented, Checkpoints 1–6) → **this §45 (✅ AUTHORIZED, 12 September 2026)**.

**One umbrella Authorization, extended, not replaced** — this section does not create a second, separate Implementation Authorization; it extends the single existing document with a new dated item, exactly as §17–§21, §23, §36, and §43–§44 already did for their respective items.

**Scope of this authorization item:**

1. Owner Investment shall be exposed to the Owner through the existing Cash Flow area (`CashFlowView.tsx`), positioned alongside the existing financial sections — Cash Position, Receivables, Payables, Expenses, Withdrawals. No new top-level module is authorized. Conceptually, Owner Investment/Capital Added is the mirror of Levantamento (Withdrawal): money entering the business from the Owner, rather than leaving it.
2. The entry point shall use a dedicated `AddOwnerInvestmentView.tsx` component, following the existing `AddWithdrawalView.tsx`/`AddExpenseView.tsx` structural pattern where appropriate.
3. The form shall require only `date` and `amount`; `description` is optional. No additional accounting or financial-classification field is authorized — specifically excluded: investment category, financing source, equity percentage, repayment terms, accounting classification, a separate reason/notes field, or any other new economic concept.
4. The view shall call the existing `addOwnerInvestment()` function (`AppContext.tsx`) unchanged, using its already-governed signature (`date`, `amount`, optional `description`, optional `submissionId`) — no change to `AddOwnerInvestmentParams` or the underlying `OwnerInvestment` data model is authorized or required.
5. The view shall preserve `submissionId` idempotency behavior and `try`/`catch` handling of the async write, mirroring the existing entry-point screens exactly.
6. The view shall respect, unmodified, the already-implemented closed-period enforcement (OI-PA-1, §23 item 3, Checkpoint 5) and subscription/trial entitlement gating (OI-PA-2, §23 item 3, Checkpoint 6) — both already authoritative at the Firestore boundary; the view wires in the existing `subscriptionBlocksNewRecords` client-side check the same way `AddWithdrawalView.tsx`/`AddExpenseView.tsx` already do, introducing no new gating mechanism.
7. Owner-only access, as already established for Owner Investment, is preserved unmodified. No new authorization model is introduced by this UI.

**This authorization means, and means only:**
- This is Authorization-level formalization of a UI entry point for an already-governed, already-implemented data/rules layer (§23 item 3, Checkpoints 1–6) — it authorizes UI implementation only, not any change to the Owner Investment economic model, calculation, CAIXER, FR-64, FR-65, Levantamento, or Startup Investment, all of which remain exactly as already governed.
- This signature is the **governance authorization gate only** — it does not by itself instruct implementation to begin, exactly as §14/§31/§36/§44's own established language establishes for every prior item in this document. A further, separate, explicit instruction remains required before `AddOwnerInvestmentView.tsx`, `CashFlowView.tsx`, `AppContext.tsx`, `calculations.ts`, `firestore.rules`, tests, or i18n files may be created or modified.
- This authorization does not reopen OI-PA-1, OI-PA-2, OI-PA-5 through OI-PA-14, the Specification (`business-worth-evolution-specification.md`), or the Rule 8 Assessment (`business-worth-evolution-rule8-assessment.md`) — all remain exactly as already accepted, with no contradiction identified between any of them and this item.

**Acceptance criterion for this item (extends §28's AC-R3 series):**
- **AC-OI-UI-1:** Owner Investment is accessible from `CashFlowView.tsx`, positioned alongside Cash Position, Receivables, Payables, Expenses, and Withdrawals, via a dedicated `AddOwnerInvestmentView.tsx` entry-point component; the form requires `date` and `amount`, with `description` optional and no additional accounting field present; the existing `addOwnerInvestment()` write path is used unchanged; the existing subscription/trial gate and closed-period enforcement are respected without a new gating mechanism; Owner-only access is preserved; existing `submissionId` idempotency behavior is preserved; a failed write is caught and does not falsely display success; no Owner Investment economic-model, CAIXER, FR-64, or FR-65 change accompanies this item.

**Formal acceptance, recorded verbatim from the Product Architect's own authorization:**

> I, SABUSHIMIKE MASCENI, acting as Product Architect for SABUSH BPT, have reviewed OI-PA-3 ("Owner Investment User Entry Point") and OI-PA-4 ("Simple Entry Form") as recorded in the Implementation Plan, and hereby AUTHORIZE their formalization at Authorization level exactly as recorded in §45 above, following the existing Owner-Declared UI authorization precedent (§26).
>
> This authorization covers a future Owner Investment UI implementation checkpoint's scope and constraints only. It does not itself instruct implementation to begin. It does not reopen or amend OI-PA-1, OI-PA-2, or OI-PA-5 through OI-PA-14, the Owner Investment economic model, CAIXER, FR-64, FR-65, Levantamento, or Startup Investment, all of which remain exactly as already governed. Implementation of the Owner Investment UI entry point begins only upon a further, separate, explicit instruction.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 12 September 2026
> **Decision:**
> ☑ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

**This signature does not itself instruct implementation of this checkpoint to begin.** Per this document's own §14/§31/§36/§44 precedent ("no item becomes authorized to begin merely because the section is signed"), a further, separate, explicit instruction to begin the Owner Investment UI implementation checkpoint remains required before any application code, test, or `firestore.rules` file may be created or modified. **No such instruction is given, implied, or begun by this section.** No Execution Record exists yet for this checkpoint.

**Next Governance Step:** a separate, subsequent, explicit instruction to begin the Owner Investment UI implementation checkpoint — not performed, drafted, or implied by this signature.

## 46. Product Architect Authorization — Lifetime Owner Investment Total (OI-PA-6 / Specification §46, FR-82) — DRAFT

**Status: 🔶 DRAFT — AWAITING PRODUCT ARCHITECT SIGNATURE.** Drafted below per this document's own established "one umbrella Authorization, extended, not replaced" discipline (§7's own opening statement; §17–§21, §23, §36, §43–§45's own precedent for adding a new dated item) and this document's own §43 precedent for a pending, unsigned draft item. **Drafting this section authorizes nothing by itself.** No `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, i18n, or test file is touched to produce it. Signing the blank Formal Acceptance block at the end of this section (§46.7, below) is the sole act that would authorize implementation to be instructed to begin — and even then, per §7's own one-item-at-a-time discipline restated at §46.5 below, signature is the governance gate only, not an instruction to start.

### 46.1 Governing Chain

Specification §46/FR-82 (✅ Accepted, 12 September 2026, SABUSHIMIKE MASCENI, `business-worth-evolution-specification.md`, commit `29902b0`) → Rule 8 Assessment Addendum — Lifetime Owner Investment Total (`business-worth-evolution-rule8-assessment.md`, Findings OI-7–OI-18, verdict `READY FOR PLAN`, commit `c2b03ce`) → Implementation Plan Amendment — Lifetime Owner Investment Total, Checkpoint 8 (`business-worth-evolution-implementation-plan.md`, drafted commit `5f558b3`, ✅ ACCEPTED by Product Architect 12 September 2026, acceptance recorded commit `9607f06`) → **this draft Authorization item (§46), pending signature.**

**One umbrella Authorization, extended, not replaced** — this section does not create a second, separate Implementation Authorization for Owner Investment; it proposes to extend the single existing document with a new dated item, exactly as §17–§21, §23, §36, §43, and §45 already did for their respective items, including the existing Owner Investment UI entry-point item (§45, above), which this item does not reopen.

### 46.2 Scope of This Authorization Item — Exactly the Accepted Plan Amendment's Checkpoint 8, No More

Per the accepted Implementation Plan Amendment's own Checkpoint 8 (`business-worth-evolution-implementation-plan.md`, "Implementation Plan Amendment — Lifetime Owner Investment Total"):

1. **Checkpoint 8, item 1 — Pure derived calculation.** A new function in the existing calculation utilities (`apps/tenant/src/utils/calculations.ts`), alongside the existing `computeStartupInvestmentTotal`, computing `SUM(OwnerInvestment.amount)` across a supplied `OwnerInvestment[]` array belonging to one business, with no snapshot/date/`createdAt`/establishment-method parameter or filter of any kind — structurally distinct, by name and signature, from `computeOwnerInvestmentsSinceSnapshot` (FR-64/FR-65's existing time-bounded function). The exact function name is an implementation-detail latitude already granted by the accepted Plan (item 7 does not fix it); the signature shape (array in, number out, no time bound) is fixed and binding.
2. **Checkpoint 8, item 2 — Cash Flow UI.** The existing Owner Investment card in `apps/tenant/src/components/CashFlowView.tsx` (currently: title, add-button, subtitle only) gains a visible Lifetime Owner Investment Total and a collapsible history of individual `OwnerInvestment` records, adapting the existing Cash Position `showCashHistory`/`cashPositionDeclarations.slice(1)` pattern in the same file to `OwnerInvestment`'s own `date`/`amount`/`description` shape. Both the total and the history list must read from the same business-scoped `ownerInvestments` array already available from `AppContext` — the history list may never be independently filtered, paginated, or re-queried in a way the total's own sum does not equally reflect.
3. **Checkpoint 8, item 3 — i18n.** New label strings only, added to `apps/tenant/src/i18n/locales/{en,pt,fr}.ts` under the existing `cashFlow.ownerInvestmentSection` namespace already established by the Checkpoint 7 UI entry-point item (§45, above) — no restructuring of existing keys.
4. **Checkpoint 8, item 4 — Tests.** A new `tests/owner-investment-checkpoint-8-lifetime-total.test.ts`, following the existing `owner-investment-checkpoint-{1..7}` naming and structural convention, covering the full Testing Plan the accepted Implementation Plan Amendment enumerates (eighteen items — restated in full at §46.6, below, as Acceptance Criteria AC-OI-LT-12's own governing list).

**No item outside Checkpoint 8's own four items above is authorized by this section.** In particular, this authorization does **not** cover anything the accepted Plan's own "Explicitly Out of Scope" section already excludes (restated in full at §46.4, below).

### 46.3 No New Write Path — Read/Derivation Only (Confirmed Boundary)

Unlike CAIXER's own §43 (a write-boundary-heavy authorization item), Checkpoint 8 introduces **no new write of any kind**. The Lifetime Owner Investment Total is computed fresh, at read time, from `OwnerInvestment` records that already exist under the existing, unmodified write path (FR-63, §43 of the Specification, already implemented at Checkpoints 1–7). Consequently:

- No new `firestore.rules` condition is authorized or required by this item — the existing `allow read: if isOwnerOf(businessId)` / `allow update, delete: if false` block governing `ownerInvestments` already covers every read this checkpoint performs.
- No non-destructive-validation requirement analogous to §43.3 applies — there is no form submission, no write-time failure mode, and no in-progress operator data this checkpoint could lose, since it displays already-committed, already-immutable records only.
- The sole failure mode in scope is ordinary reactive-UI staleness (a listener not yet reflecting a just-written record), which is not a new risk class — Rule 8 Finding OI-17 (Rule 8 Assessment Addendum) already classifies this as normal reactive behavior, not a defect.

### 46.4 Explicitly Out of Scope (Restated from the Accepted Plan, Binding)

This authorization does **not** cover, and Checkpoint 8 may not be used to justify:

- implementation of anything beyond Checkpoint 8's own four items (§46.2);
- any change to FR-63, FR-64, FR-65, or FR-66, or to §43 of the Specification's existing write model;
- any change to CAIXER (Specification §45, FR-73–FR-81) or any CAIXER field (`cashPosition`, `cashPositionCash`, `cashPositionEmola`, `cashPositionMpesa`, `cashPositionBanco`);
- any change to `BusinessWorthSnapshot`'s schema, `measuredBusinessWorth`, or any Business Worth Evolution formula, and no insertion of the lifetime total into Business Worth History;
- any new Firestore collection, persisted aggregate field, backend scheduled job, new listener, migration, or new index;
- any cross-business query — the function operates exclusively on one business's already-scoped array;
- editing or deleting historical `OwnerInvestment` records, or any change to their append-only/immutable status;
- any new accounting field, investment category, or classification on `OwnerInvestment` — the existing simple `date`/`amount`/`description?` schema is unchanged;
- a new top-level Owner Investment module or navigation item — the existing Owner Investment entry form authorized under §45 (above) is unchanged and unreopened by this item;
- unrelated Contagem, Fecho, Owner Portfolio, SuperAdmin, or Subscription redesign — none is touched by anything in §46.2;
- any product or architectural redesign not contained in the accepted Specification §46/FR-82 or the accepted Implementation Plan Amendment (Checkpoint 8).

### 46.5 Execution Rule, If Signed (Mirrors §7/§23/§36/§43's Discipline Exactly)

1. Read this item's scope (§46.2, and the Plan Amendment's own Checkpoint 8 text) before writing anything.
2. Verify prerequisites — per the Plan's own "Dependencies" section: none of Checkpoint 8's four items depends on any other in-flight or unimplemented work; Checkpoints 1–7 are already implemented and unaffected.
3. Implement only Checkpoint 8's own scope — no later, unrelated Owner Investment or Business Worth work may be silently folded in.
4. Run the tests the Plan Amendment's own Testing Plan names (eighteen items, restated at §46.6/AC-OI-LT-12), including every regression check it lists (FR-64/FR-65 unaffected, CAIXER unaffected, Business Worth History unaffected, Startup Investment/Levantamento unaffected, tenant scoping, reactive update, no persisted accumulator).
5. Inspect the diff — confirm no file outside Checkpoint 8's own named surfaces (`calculations.ts`, `CashFlowView.tsx`, the three i18n locale files, the one new test file) was touched, unless a genuinely required change is separately identified and justified.
6. Verify governance compliance against this section's own scope (§46.2) and out-of-scope list (§46.4).
7. Record the result as its own dated Execution Record section, mirroring §37–§42's format.

**Implementation remains strictly this one checkpoint** — Checkpoint 8 does not become authorized to *begin* merely because this section is signed; a further, separate, explicit "begin this item" instruction remains required, exactly as §36 and §43 already establish for their own items.

### 46.6 Acceptance Criteria Governing Completion

Traceable to the Specification (§46, FR-82), the Rule 8 Assessment Addendum (Findings OI-7–OI-18), and the accepted Implementation Plan's own Traceability table:

- **AC-OI-LT-1** — the lifetime total equals the sum of all immutable, business-scoped `OwnerInvestment.amount` records, with no record excluded.
- **AC-OI-LT-2** — no `date`, `createdAt`, snapshot-boundary, Contagem, or establishment-method filtering is applied anywhere in the calculation.
- **AC-OI-LT-3** — no mutable or persisted accumulator is introduced; the total is a pure, report-time derivation only.
- **AC-OI-LT-4** — `ownerInvestmentSinceLastSnapshot` (FR-65) remains unchanged and is computed independently, via its own existing function (`computeOwnerInvestmentsSinceSnapshot`), never reused, renamed, replaced, or modified to serve as the lifetime total.
- **AC-OI-LT-5** — CAIXER remains completely uninvolved: no code path in the lifetime calculation reads `cashPosition` or any of its four components, and no `firestore.rules`/schema change touches any CAIXER field.
- **AC-OI-LT-6** — `BusinessWorthSnapshot` and Business Worth History remain unchanged; the lifetime total is not written into the snapshot schema and does not alter `measuredBusinessWorth` or any Business Worth Evolution formula.
- **AC-OI-LT-7** — the Lifetime Owner Investment Total is displayed inside the existing Owner Investment card in `CashFlowView.tsx`, with no new top-level module or navigation item.
- **AC-OI-LT-8** — the same card provides the approved collapsible history of individual `OwnerInvestment` records, following the existing Cash Position `showCashHistory` structural pattern.
- **AC-OI-LT-9** — the total and the history list are demonstrated (by test or component-level check) to derive from the exact same business-scoped `ownerInvestments` source array.
- **AC-OI-LT-10** — existing security (Owner-only `isOwnerOf(businessId)` access), tenant isolation, `OwnerInvestment` immutability (`allow update, delete: if false`), closed-period enforcement (OI-PA-1), subscription/trial gating (OI-PA-2), and existing submission-identity idempotency all remain fully intact and unmodified.
- **AC-OI-LT-11** — no new Firestore collection, listener, backend job, migration, index, or persisted aggregate is introduced by any part of this checkpoint.
- **AC-OI-LT-12** — `tests/owner-investment-checkpoint-8-lifetime-total.test.ts` covers, at minimum, all eighteen scenarios the accepted Implementation Plan Amendment's Testing Plan enumerates (empty array; single investment; multiple investments; decimal amounts; backdated `date` included; varying `createdAt` all included; investments before/after snapshots all included; Owner-Declared/Contagem establishment-method irrelevance; FR-65 independence; CAIXER non-effect; Business Worth History non-effect; Startup Investment non-effect; Levantamento non-effect; duplicate/idempotency inheritance; total/history shared-source; tenant scoping; reactive update; no persisted accumulator) — and passes.

### 46.7 Formal Acceptance — PENDING, NOT SIGNED

> I have reviewed §46, "Product Architect Authorization — Lifetime Owner Investment Total," in full, including its scope (§46.2), the confirmed no-new-write-path boundary (§46.3), its explicit out-of-scope boundaries (§46.4), the execution rule (§46.5), and the acceptance criteria (§46.6). I understand that signing below authorizes, exactly and only, Checkpoint 8 as named in §46.2, subject to every boundary in §46.3/§46.4. I understand this does not reopen or reinterpret Specification §46/FR-82, the Rule 8 Assessment Addendum, the accepted Implementation Plan Amendment, or §45 (the existing Owner Investment UI entry-point authorization). I understand this signature is a governance authorization gate only — it does not itself instruct implementation of Checkpoint 8 to begin; a further, separate, explicit instruction is required before any code, test, `firestore.rules`, or i18n file may be created or modified.
>
> **Product Architect:** ______________________________
> **Date:** __________________________________________
> **Decision:**
> ☐ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

**Status: 🔶 DRAFT — AWAITING PRODUCT ARCHITECT SIGNATURE.** The Formal Acceptance block above is blank, per this document's own established pending-authorization convention (§43.7's own precedent, above) — it is preserved exactly as circulated for review; a future, separate, dated "§46 — Recorded" section is where an actual signature would be entered, mirroring §43→§44's own Draft → Recorded pattern. **Implementation remains blocked until the Product Architect formally accepts/signs this Implementation Authorization.** Checkpoint 8 is not authorized to begin, no code/test/`firestore.rules`/i18n file may be modified on the strength of this section, and this document's own §7/§23/§36/§43 precedent for what a signature does and does not authorize applies identically here, once and if signed.
