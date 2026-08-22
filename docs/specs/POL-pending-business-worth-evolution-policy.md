Decision Record

# POL-0010 — Business Worth Evolution & Measurement Model Policy

**Status:** ✅ **Drafted, and numbered by explicit Product Architect decision.** Operationalizes every DECIDED business rule in the approved umbrella BDR (below) into enforceable "how, specifically" operational rules. **`POL-0010` is explicitly assigned to this Policy by direct Product Architect decision**, recorded verbatim under "Numbering," below, satisfying `19-governance-bdr-policy-framework.md`'s Numbering Ledger assignment-authority rule — "assigning a `POL-NNNN` number requires an explicit Product Architect decision, made each time ... No `POL-NNNN` number may be inferred from repository state, from the highest previously-assigned number, or from any other document's convention." This number was not inferred by this document — it was confirmed collision-free against the cross-cutting `POL-NNNN` namespace, which ran `POL-0001`–`POL-0009` before this assignment (confirmed continuous with no gap by direct inspection of `docs/specs/`); `POL-0011` is now the next available slot, not assigned here. This document's own substantive Policy content (Purpose, Scope, Definitions, all operational rules, Traceability, Acceptance Criteria) is unchanged by this numbering decision.

**Type:** Policy document, per the category `19-governance-bdr-policy-framework.md` §2 establishes. Operationalizes an approved Business Decision Record's "why/what philosophy" into the "how, specifically" operational rule a future Business Domain Specification will need. Does not itself decide strategic business philosophy (that is the source BDR's role, already settled) and does not itself define any technical implementation — Firestore schema, field names, security rules, timestamp mechanism, UI, database transaction design, or algorithm are all reserved for Specification/Rule 8/Implementation Authorization, exactly as `19-governance-bdr-policy-framework.md` §2 draws the Policy/Specification boundary.

**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace the Numbering Ledger addendum establishes — the same namespace `POL-0001`–`POL-0009` already occupied before this assignment — because this Policy's subject (the entire Business Worth evolution: Contagem-as-measurement, cash/receivables/payables, Startup Investment, Business Worth history, Fecho, autosave/recovery) is cross-cutting in exactly the sense that led its own source BDR to be filed unprefixed, spanning Stock Counts, Withdrawals, Expenses, Breakages, Monthly Closings, and the Dashboard with no single module home. The file itself remains at its original descriptive path, `POL-pending-business-worth-evolution-policy.md` — this numbering decision assigns the identifier `POL-0010` to this document's content and header identity; it does not rename the file, which was not part of this task's instructions.

**Authority/source BDR:** [`BDR-pending-business-worth-evolution-measurement-model.md`](./BDR-pending-business-worth-evolution-measurement-model.md) — verified, before drafting this Policy, to be the finalized, pushed umbrella Business Decision Record for this work: its own Status line reads "✅ Business Decision phase complete," its §4 records all 35 Product Architect decisions as DECIDED, its §6 confirms no Product Architect business decision remains open, and it is present in the repository's `main` branch history (commit `de39377`, confirmed by direct inspection before drafting). This Policy operationalizes that BDR's §4 Decisions 1–35 in full; it does not decide anything that BDR left open, and where the BDR itself defers a matter to "Specification/Architecture" (its own §6), this Policy defers it identically rather than resolving it prematurely.

**Depends on:** The source BDR (above), in full. This Policy also depends on, without amending: `BDR-0014` (Initial Stock & Initial Capital Dual-Valuation-Basis) and its two companion amendments, for the unit/basis-preservation mechanics this Policy's Contagem rules restate rather than re-derive; `BDR-0012` (Product Unit-of-Measure & Product Memory), for the cost/selling-price-memory mechanics this Policy's Contagem rules depend on; `BDR-0015`/`POL-0008` (Void & Redo) and `BDR-0016`/`POL-0009` (SuperAdmin-Assisted Recovery), for the recovery-window *shape* this Policy's correction/recovery rules deliberately mirror without merging into; `10-stock-counts.md`, `09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`, `11-monthly-closings.md`, and `01-dashboard.md`, for the existing module behavior this Policy explicitly preserves or extends, per §11 of this document.

**Does not amend:** The source BDR; `BDR-0014` and its companion amendments; `BDR-0012`; `BDR-0015`/`POL-0008`; `BDR-0016`/`POL-0009`; `10-stock-counts.md` and its three amendments; `02-business-worth-engine.md`; `09-withdrawals.md`; `08-expenses.md`; `07-breakages.md`; `11-monthly-closings.md`; `01-dashboard.md`; or any application code, Firestore rule, test, schema, or index.

**Followed by:** One consolidated Business Domain Specification (functional requirements and acceptance criteria for implementation, across every feature this Policy operationalizes), one Rule 8 Assessment, and one signed Implementation Authorization — each its own separate, explicitly gated step, none of which this document performs, drafts, or authorizes. Implementation itself, once authorized, may proceed feature-by-feature in controlled increments, per the source BDR §10.

---

## Numbering (Recorded Verbatim)

**Status:** ✅ Explicitly assigned by direct Product Architect decision, reproduced here per this repository's established practice of recording a numbering decision's substance directly in the governing artifact (`BDR-0014` §10–§11, `BDR-0015` §9, `POL-0008`/`POL-0009` "Numbering" precedent).

> I am now making the explicit Product Architect numbering decision: **ASSIGN `POL-0010` to the Business Worth Evolution Policy.**

This satisfies `19-governance-bdr-policy-framework.md`'s Numbering Ledger assignment-authority rule in full: the number is explicit, made by the Product Architect, and not inferred from repository state or from the highest previously-assigned number. It does not change any substantive Policy rule (§6–§17), any of the 35 BDR decisions this Policy traces to (§20), or the source BDR itself — none of which this numbering decision touches.

---

## 1. Verification Performed Before Drafting

Before drafting any rule below, the following was confirmed by direct inspection, per this task's own instruction:

1. **The source BDR is the approved business authority for this work.** `BDR-pending-business-worth-evolution-measurement-model.md` is present on `main` (commit `de39377`), its Status line declares the Business Decision phase complete, and its §4 contains 35 explicitly numbered DECIDED business rules with no open Product Architect decision remaining (its own §6). No other document in `docs/specs/` claims BDR-level authority over this same subject matter.
2. **The governance framework and numbering rules were read.** `19-governance-bdr-policy-framework.md` §2 (Policy category definition, Policy/Specification boundary), its Numbering Ledger and Numbering Ledger addendum (cross-cutting `POL-NNNN` namespace, assignment-authority rule), and §3 (governance hierarchy) all inform this document's structure and numbering treatment.
3. **Existing Policy examples and templates were read.** `POL-0008` (Initial Stock Accidental Confirmation Recovery Policy) and `POL-0009` (SuperAdmin-Assisted Initial Stock Recovery Policy) were used as the structural template for this document — header block, Numbering treatment, lettered/numbered Operational Rules tied back to specific BDR decisions, an explicit Scope Exclusions section, and Governance Notes. `POL-0001`–`POL-0007` were confirmed to exist and were not otherwise consulted for structure, being shorter single-topic policies.
4. **Terminology was verified against the actual codebase**, consistent with the source BDR's own §2/§3 groundwork: "Contagem," "Capital Inicial," "Levantamentos," and "Fecho Mensal/Anual" are confirmed real, existing UI/code terms (`PeriodicStockCountView.tsx`, `InitialStockCountView.tsx`, `ClosingView.tsx`, `DashboardView.tsx`), not terms newly invented by this Policy.
5. **No settled BDR decision is contradicted below.** Every rule in §7–§17 traces to a specific, numbered decision in the source BDR's §4; none reopens, narrows, or silently extends any of them.

## 2. Purpose

The source BDR answers **what Business Worth means** — that it is unknown before a business's first standing-on-its-own Contagem, that a confirmed Contagem becomes a dated measurement, that cash/receivables/payables are narrow required inputs, and everything else recorded in its §4. This Policy answers **what rules the system and its users must follow to preserve that meaning** — the operational "how, specifically" layer a future consolidated Specification will need before it can write functional requirements and acceptance criteria. This Policy does not decide Firestore collections, field names, API routes, React components, indexes, or transaction implementation — those remain reserved for Specification, Rule 8, and Implementation Authorization, exactly as `19-governance-bdr-policy-framework.md` §2 requires.

## 3. Scope

This Policy governs, as **one consolidated whole**, every operational rule needed to implement the source BDR: Business Worth existence and timing; Current and Estimated Business Worth; Business Worth history and snapshot content; Contagem as measurement and reconciliation; Contagem selling-price flexibility and its boundary against +Stock; cash, receivables, and supplier obligations; Startup Investment; the treatment of existing Expenses, Quebras, and Levantamentos; Fecho's reporting and date-range requirement; the Estimated-vs-Measured reconciliation signal; the historical-Capital-Inicial transition treatment; Contagem autosave and confirmation safety; the Owner correction window and SuperAdmin recovery ceiling; historical immutability; the Dashboard's conceptual (not structural) change; and the narrow architecture-boundary override. **No separate Policy is created for any one of these areas** — per the source BDR's Decision 35 and this task's own governing instruction, they are one approved Business Worth evolution and are governed here as one Policy.

This Policy does not govern, and explicitly excludes: any technical data model or schema; any UI/interaction design; any API or transaction design; any rounding/precision rule beyond the existing `POL-0001`/`POL-0002` convention; and any migration/backfill mechanism. Each is reserved for the Specification/Rule 8/Implementation Authorization stages that must follow (§18, below).

## 4. Definitions

Terms below carry exactly the meaning the source BDR's §2 already fixes; this Policy does not redefine them, and repeats only what is necessary for this document to be read on its own:

- **Contagem** — the platform's existing physical/financial stock-counting mechanism. Under this Policy, a Contagem confirmed going forward is also the mechanism that produces a Current Business Worth measurement (§9).
- **Current Business Worth** — the most recent confirmed Contagem-derived Business Worth snapshot.
- **Estimated Business Worth** — the system's running projection of Business Worth between two confirmed Contagens.
- **Startup Investment** — everything the owner spends establishing the business, from the beginning until declaring the business can stand on its own.
- **Capital Inicial** — the platform's existing, real term for the current `initial` Stock Count's frozen valuation, governed by `10-stock-counts.md` and `BDR-0014`. Untouched historically; its conceptual role transfers to Current Business Worth going forward (§9, §16).
- **Levantamentos** — Withdrawals, per `09-withdrawals.md`.
- **Quebras** — Breakages, per `07-breakages.md`.
- **Fecho** — a Closing, per `11-monthly-closings.md`.
- **Embedded Profit** — `02-business-worth-engine.md`'s existing `marketValue − investmentValue` figure.
- **Receivables** — money owed to the business by customers.
- **Supplier obligations / Payables** — money the business owes suppliers, arising from purchase records.
- **Cash Ledger** — a complete, recorded ledger of business cash inflows/outflows, not an arbitrary typed balance.
- **Reconciliation signal** — the difference between an estimated/system-recorded position and a measured/physical position, surfaced for owner investigation, never auto-classified as a specific cause.

## 5. Core Policy Rules — Governance Discipline

The following discipline binds every rule in §6–§17:

- **CPR-1.** Every operational rule below cites the specific source-BDR decision it operationalizes. A rule that cannot be traced to a specific DECIDED business rule is out of scope for this Policy and is not included.
- **CPR-2.** This Policy never contradicts, narrows, or silently extends any DECIDED decision in the source BDR's §4. Where the BDR itself left a matter to a later technical stage (its own §6), this Policy defers it identically rather than resolving it here.
- **CPR-3.** This Policy preserves every existing, currently-approved Policy and module behavior unless the source BDR explicitly changed it. §18, below, states exactly which existing governance is preserved, extended, or left genuinely unresolved for Specification.
- **CPR-4.** This Policy does not invent a technical implementation detail to make a business rule "complete." Where the business principle is settled but its mechanism is not, this Policy states the principle and explicitly defers the mechanism (§19, Scope Exclusions).
- **CPR-5.** This Policy governs the whole approved Business Worth evolution as one document. No rule below may be extracted into, or treated as authorizing, a separate Policy for any sub-topic (cash, receivables, payables, Startup Investment, Contagem, Business Worth history, Estimated Business Worth, Fecho, reconciliation, or autosave/recovery) without its own explicit Product Architect decision to split this Policy — mirroring the source BDR's own Decision 35.

## 6. User/Owner Responsibilities

- **OWN-1.** The Owner alone decides when the business "can stand on its own" and triggers that determination by performing and confirming a Contagem — no other role may make or trigger this determination (source BDR Decision 1).
- **OWN-2.** During Contagem, the Owner is responsible for verifying and entering **physical reality** only — quantities, in their own physical units, exactly as counted. The Owner is not responsible for re-entering financial data the system already knows (source BDR Decisions 9–10).
- **OWN-3.** The Owner is responsible for choosing, at Contagem, either a single selling-unit price (Mode A) or multiple selling-unit prices across physical portions (Mode B) — the system does not force a choice between these (source BDR Decision 7).
- **OWN-4.** The Owner alone may trigger, review, and act within the 3-hour post-confirmation correction window; only the Owner may execute a SuperAdmin-authorized recovery once one is granted (source BDR Decisions 31–32) — matching the Owner-only authorization tier `POL-0008` Rule E and `POL-0009` already establish for the analogous Initial Stock mechanism, applied here as a parallel rule, not a shared one (§16).
- **OWN-5.** Where a reconciliation signal appears (system-recorded vs. physical/measured, or Estimated vs. Measured Business Worth), the Owner is responsible for investigating the discrepancy; the system is not required, and must not attempt, to assign an automatic cause on the Owner's behalf (source BDR Decisions 11, 22).

## 7. System Responsibilities

- **SYS-1.** The system must report known operational information (stock purchased, cost/selling valuation, embedded profits, expenses, startup investment, other recorded activity) for any business whose Business Worth is UNKNOWN, without presenting any figure as a known, measured Business Worth (source BDR Decisions 1, 9 of the prior consolidation, restated in the final consolidation's Decision 1).
- **SYS-2.** The system must supply, during Contagem, the latest known cost, the latest known selling price, and the product's own unit relationships, so the Owner is not required to re-type information already on record (source BDR Decisions 9–10).
- **SYS-3.** The system must maintain cash as a complete, recorded ledger of inflows/outflows — never accept or store an arbitrary owner-typed cash balance as the system of record (source BDR Decision 12).
- **SYS-4.** The system must distinguish, at all times, money owed (a receivable) from money actually received, and must never count an unpaid receivable toward Business Worth (source BDR Decision 13).
- **SYS-5.** The system must track each supplier obligation's total amount, amount paid, and amount remaining, and must never apply a second, independent Business Worth reduction for a payment against a liability already reflected in Business Worth (source BDR Decision 14).
- **SYS-6.** The system must never add the full cost of a stock purchase to Business Worth when that purchase was financed by existing business cash or by supplier credit — only the resulting embedded profit may increase the estimate (source BDR Decisions 15–16).
- **SYS-7.** The system must preserve physical quantities and entered unit-labeled prices exactly as entered during Contagem, performing any unit conversion internally, for calculation only, never altering what is displayed or stored as entered (source BDR Decision 6).
- **SYS-8.** The system must continuously autosave Contagem draft progress, and must never treat autosaved draft data as a confirmed Business Worth measurement (source BDR Decision 29).
- **SYS-9.** The system must require a deliberate, distinctly separated confirmation action to finalize a Contagem, and must make the Owner aware, before that action, that it finalizes the current measurement (source BDR Decision 30).
- **SYS-10.** The system must never permit direct editing or deletion of a finalized historical Business Worth snapshot or Contagem record outside the correction/recovery windows this Policy defines (§16) (source BDR Decision 33).
- **SYS-11.** The system must never fabricate historical cash, receivable, or payable data for a period before this capability existed, and must never treat a historical Contagem as though it contained data it never actually recorded (source BDR Decisions 25–26).

## 8. Financial-Position Rules — Cash, Receivables, Payables

- **FIN-1 (Cash).** Cash contributes to Business Worth strictly according to actual recorded cash-ledger movements — customer payments actually received, supplier payments actually made, expenses, Levantamentos, and other governed business cash movements where applicable. A typed, unsupported balance adjustment is not a valid cash-ledger entry under this Policy (source BDR Decision 12).
- **FIN-2 (Cash reconciliation).** Contagem may compare recorded (ledger) cash against physically counted cash. Any difference is a reconciliation signal (§4) — visible and explainable — and must never silently overwrite the recorded ledger (source BDR Decision 11).
- **FIN-3 (Receivables).** A receivable is recorded as money owed, distinct from cash. It does not increase Business Worth while unpaid. Partial payment must be supported: the paid portion becomes cash and contributes to Business Worth; the remaining unpaid portion continues to be tracked as an outstanding receivable (source BDR Decision 13).
- **FIN-4 (Payables/supplier obligations).** A supplier obligation is recorded as Paid, Partially Paid, or Unpaid, always exposing total amount, amount paid, and amount remaining. Outstanding obligations reduce Business Worth. A payment event updates the obligation's state; it must never be counted as a second, independent Business Worth reduction beyond the reduction the outstanding liability itself already represents (source BDR Decision 14).
- **FIN-5 (Supplier credit purchases).** A purchase made on supplier credit creates a stock asset matched by an equal liability — Business Worth is unaffected by the purchase itself; only the batch's own embedded profit may increase the estimate. Later payment of that liability decreases cash and decreases the liability together, without an artificial additional Business Worth fall from the payment event itself (source BDR Decision 15).
- **FIN-6 (Cash-financed purchases).** A purchase made using existing business cash is a conversion of an existing asset (cash → stock), not a new injection of value — only the batch's own embedded profit may increase Estimated Business Worth (source BDR Decision 16).
- **FIN-7 (Architecture boundary — restated for financial-position rules specifically).** Every rule in this §8 exists solely to support Business Worth measurement and business decision-making. None of FIN-1 through FIN-6 may be read as authorizing point-of-sale functionality, invoicing, checkout, payroll, full accounting, ERP functionality, or general customer transaction management (source BDR Decision 34; §17, below).

## 9. Contagem Rules

- **CON-1 (Measurement, not purchase).** A Contagem records what physically/financially exists at the moment of the count. It is never treated as a purchase event, a stock-entry batch, or proof of when or whether counted products were recently purchased (source BDR Decision 2).
- **CON-2 (Transition event).** The first Contagem a business confirms is the sole transition event by which Business Worth moves from UNKNOWN to measured. No separate "business is operational" confirmation step exists under this Policy. Because the platform's existing schema already requires an `initial` Stock Count before any periodic Contagem, that first confirmation event is the same event today's Initial Stock/Capital Inicial confirmation represents — this Policy does not introduce a second, parallel confirmation mechanism (source BDR Decision 1).
- **CON-3 (Unit and price preservation).** Physical quantities and entered cost/selling prices are preserved exactly as entered, in their own units; the system performs any unit conversion internally, for valuation calculation only (source BDR Decision 6).
- **CON-4 (Selling-price flexibility).** Contagem supports both a single selling-unit price applied across all physical quantities (Mode A) and multiple, independently-set selling-unit prices applied to their own physical portions (Mode B). This flexibility is specific to Contagem (source BDR Decision 7).
- **CON-5 (Boundary against +Stock).** +Stock's existing single-purchase-unit, single-cost-unit, single-selling-unit, single-price-per-batch model is unaffected by CON-4. Contagem's multi-selling-unit flexibility does not extend to +Stock (source BDR Decision 8).
- **CON-6 (Cost/price memory).** The system supplies the latest known cost and latest known selling price during Contagem, per `BDR-0012`'s existing Product Memory mechanics; the Owner is not required to re-enter what the system already knows unless correcting or updating it (source BDR Decision 9).
- **CON-7 (Contagem boundary).** The Owner's role at Contagem is to measure/verify physical reality; the system's role is to supply recorded financial reality — latest cost, latest selling price, unit relationships, embedded profits, expenses, breakages, Levantamentos, cash-ledger position, receivables, supplier obligations, and payment states — without requiring the Owner to re-enter any of it (source BDR Decision 10).
- **CON-8 (Reconciliation).** Contagem is both a measurement and a reconciliation point between physical/measured reality and system-recorded financial reality. A discrepancy is surfaced as a reconciliation signal and must be visible and explainable; the system must never silently overwrite its recorded ledger merely because a physical count differs (source BDR Decision 11; §8, FIN-2).
- **CON-9 (Autosave).** Contagem must continuously autosave draft progress against electricity failure, battery loss, accidental navigation, browser/app closure, connection interruption, and unexpected application failure. Autosave is never confirmation (source BDR Decision 29).
- **CON-10 (Confirmation safety).** The final Contagem confirmation action must be deliberately separated/protected from ordinary data entry, and the Owner must be made aware, before confirming, that the action finalizes the current measurement (source BDR Decision 30).

## 10. Business Worth Rules

- **BW-1 (Existence).** Business Worth is UNKNOWN for any business that has not yet had its first Contagem confirmed under this model. No figure may be presented as a known, measured Business Worth before that point (source BDR Decisions 1, 9).
- **BW-2 (Current Business Worth).** The most recent confirmed Contagem-derived snapshot is Current Business Worth. It remains the official figure — never silently replaced by an Estimated Business Worth figure — until a new Contagem is confirmed, at which point the new measured value becomes Current Business Worth and the previous value becomes historical (source BDR Decisions 3, 23).
- **BW-3 (Business Worth history).** Every confirmed Contagem under this model creates its own dated snapshot. Snapshots are preserved, never overwritten, viewable, and drillable, subject to the correction/recovery windows in §16 (source BDR Decision 4).
- **BW-4 (Snapshot content).** Every Business Worth snapshot must expose, at minimum: product valuation total and product-level detail; embedded profit total and batch-level detail; cash position; receivables position; supplier/payable obligations; expenses; breakages; Levantamentos; other contributing factors; and comparison/evolution against the previous snapshot. Embedded profit must never be double-counted on top of a measured valuation where doing so would count the same economic value twice (source BDR Decision 5).
- **BW-5 (Estimated Business Worth).** Between confirmed Contagens, Estimated Business Worth begins from the latest measured Business Worth and reflects governed changes since that measurement: embedded profits generated; less expenses; less breakages; less Levantamentos; adjusted for applicable outstanding obligations/position changes — never adding the full cost of a cash- or credit-financed stock purchase, never subtracting a supplier payment twice, and never treating an unpaid receivable as received (source BDR Decision 21; §8 FIN-3 through FIN-6).
- **BW-6 (Reconciliation at new Contagem).** When a new Contagem is confirmed, the system must present the Previous Current Business Worth, the Estimated Business Worth immediately before the new Contagem, the New Measured Business Worth, and the Difference. The Difference is a reconciliation signal for the Owner to investigate — never automatically classified as expense, loss, theft, breakage, or error (source BDR Decision 22).
- **BW-7 (New Contagem resets the estimate).** Confirming a new Contagem always resets the Estimated Business Worth baseline to that new measured value; the previous measured value and every prior snapshot remain historical, never overwritten (source BDR Decision 23).

## 11. Fecho Rules

- **FEC-1 (Required content).** Fecho must report, for the selected period: (1) embedded profits; (2) Levantamentos; (3) expenses; (4) breakages; (5) Estimated Business Worth (source BDR Decision 24).
- **FEC-2 (Flexible date range).** Fecho must support an arbitrary owner-chosen date range (e.g. a specific start date to a specific end date), not only calendar month or year — this is a business requirement this Policy fixes; the exact mechanism against the existing `monthly`/`yearly`-only period-type model is reserved for Specification (source BDR Decision 24; §19).
- **FEC-3 (Levantamentos visibility).** Levantamentos must remain visible as activity within Fecho, clearly marked as money removed from the business — never omitted from performance reporting merely because the money left the business, and never treated as an ordinary operating expense (source BDR Decisions 19, 24).
- **FEC-4 (No redesign).** This Policy does not authorize redesigning the existing Fecho module beyond what FEC-1 through FEC-3 require; its existing structural role (freezing a period, existing double-close guard) is otherwise preserved (source BDR Decision 24; §18, item 4).

## 12. Startup Investment Rules

- **SI-1 (Coverage).** Startup Investment records everything the Owner spends establishing the business, from the beginning until declaring the business can stand on its own — including stock, equipment, materials, renovation/preparation, transport, labor, wages, licenses, setup costs, and other legitimate startup preparation costs (source BDR Decision 20).
- **SI-2 (No duplication).** A stock purchase already recorded via +Stock must not be recorded a second time as a separate Startup Investment transaction — Startup Investment references/includes the existing record for reporting purposes instead (source BDR Decision 20).
- **SI-3 (Distinct measurement).** Startup Investment and Business Worth are different measurements. A large Startup Investment figure relative to a smaller first measured Business Worth does not, by itself, indicate poor performance, and the system must not present it as such (source BDR Decision 20).

## 13. Expense, Breakage, and Withdrawal Rules

- **EXP-1 (Expenses unchanged).** The existing Expense system and its categories are preserved without modification; no new expense taxonomy is introduced by this Policy. Expenses reduce Estimated Business Worth without double-counting (source BDR Decision 17).
- **EXP-2 (Startup vs. operating).** Startup-phase spending may also contribute to Startup Investment reporting per §12, without duplicating the underlying financial transaction; ordinary operating expenses after the business is operational contribute to Estimated Business Worth per §10 BW-5 (source BDR Decision 17).
- **QUE-1 (Quebras unchanged).** The existing Quebra mechanism and valuation basis are preserved without modification; this Policy does not introduce a new Quebra valuation methodology. The Business Worth model consumes existing Quebra records exactly per their established behavior (source BDR Decision 18).
- **LEV-1 (Levantamentos).** Levantamentos reduce the business's position because the money leaves the business, remain visible in business activity, and are reported in Fecho (§11, FEC-3). They are never treated as an ordinary operating expense and must never be double-counted (source BDR Decision 19).

## 14. Historical Data and Existing-Business Transition Rules

- **HIST-1 (Capital Inicial preserved).** No existing business's historical Capital Inicial value is deleted, rewritten, or fabricated by any rule in this Policy (source BDR Decision 25).
- **HIST-2 (Transition baseline).** An existing business may use its preserved Capital Inicial as the starting baseline for Estimated Business Worth during the transition period, until that business performs its first Contagem under this model, at which point that Contagem establishes its first Current Business Worth snapshot (source BDR Decision 25).
- **HIST-3 (No retroactive fabrication).** A historical Contagem recorded before this capability existed must never be reinterpreted as though it contained cash, receivable, or payable information that was never actually collected (source BDR Decision 25).
- **HIST-4 (Prospective application).** This Policy's rules apply prospectively to new information and new measurements. No destructive migration and no silent reinterpretation of any historical record is authorized by this Policy beyond the explicit transition treatment in HIST-1 through HIST-3 (source BDR Decision 26).

## 15. Dashboard Rule

- **DASH-1 (No redesign; conceptual transfer only).** The existing Dashboard is not redesigned by this Policy. The existing Capital Inicial presentation's conceptual role transfers to Current Business Worth (§10, BW-2); the Business Worth card must open a history containing the current record and every prior dated record, each drillable, with finalized historical records read-only (source BDR Decisions 3, 27–28). Exactly which existing card surfaces which behavior, and any resulting layout detail, is a Specification-stage question this Policy does not decide (§19).

## 16. Recovery / Correction Rules

- **REC-1 (Owner correction window).** After Contagem confirmation, the Owner has a correction window of exactly **3 hours**, measured from the confirmation's own timestamp. This window does not restart or extend because of later clicks or other activity. During this window, the Owner may return and correct the Contagem (source BDR Decision 31).
- **REC-2 (SuperAdmin-authorized recovery).** After the Owner's 3-hour window closes, SuperAdmin support may authorize recovery within a **72-hour** ceiling from the applicable confirmation/recovery event. SuperAdmin never directly edits the Owner's Contagem. The flow is: SuperAdmin authorizes → Owner performs the recovery/edit → Owner confirms. After 72 hours, no SuperAdmin authorization is available through this mechanism (source BDR Decision 32).
- **REC-3 (Distinct from Initial Stock recovery).** REC-1 and REC-2 establish a parallel mechanism for Contagem-derived Business Worth snapshots specifically. They do not amend, merge with, or extend `POL-0008`'s 12-hour Owner window, its 3-recovery-cycle/4-confirmation-event ceiling, or `POL-0009`'s 48-hour SuperAdmin authorization duration — each of which continues to govern Initial Stock confirmations exactly as already approved (source BDR Decisions 31–32; §18, item 5).
- **REC-4 (Immutability outside the windows).** Once the applicable correction/recovery windows close, a Business Worth snapshot or Contagem record is viewable and drillable forever, and is not directly editable or deletable through ordinary UI. Recovery under REC-2 is a controlled, time-boxed exception — never a general administrative editing authority (source BDR Decision 33).

## 17. Architecture Boundary

- **ARCH-1 (Narrow override, explicitly bounded).** Cash, receivables, and supplier obligations/payables are permitted, under this Policy, strictly as narrowly scoped inputs to Business Worth measurement and business decision-making (source BDR Decision 34).
- **ARCH-2 (Explicit non-authorization).** Nothing in this Policy authorizes point-of-sale functionality, checkout, invoicing, payroll, full accounting, ERP functionality, or general customer transaction management. Any future Specification proposing such functionality requires its own, separate Product Architect decision at the BDR level — it is not licensed by this Policy (source BDR Decision 34).

## 18. Governance Interactions — What Existing Governance This Policy Preserves, Extends, or Leaves Open

1. **`10-stock-counts.md`'s "Contagem is deliberately outside the Business Worth formula" rule** is **extended, not silently overridden**: under this Policy (per CON-2, BW-1–BW-2), a Contagem confirmed going forward *is* the mechanism producing Current Business Worth — a deliberate, decided expansion the source BDR already settled (its Decision 1, its §5 item 1), applied prospectively (HIST-4). Every historical, pre-capability Contagem's existing comparison-only role is untouched for activity that already happened under it.
2. **`02-business-worth-engine.md`'s existing `businessWorth`/`capitalGrowth` formulas** are **preserved as-is at the code level**; this Policy does not rewrite them. It establishes only the business relationship (BW-2, DASH-1) that Current/Estimated Business Worth are the concepts the Dashboard's existing Business Worth presentation surfaces going forward. The precise code-level reconciliation between the existing Engine formula and this new model is explicitly left to Specification (§19) — a genuine, not silently assumed, open technical question, consistent with the source BDR's own §5 item 2 and §6 item 3.
3. **`01-dashboard.md`'s existing two-card layout** is **preserved structurally** (DASH-1) — this Policy does not authorize a redesign. Only the conceptual meaning of the existing Capital Inicial presentation changes.
4. **`11-monthly-closings.md`'s existing `monthly`/`yearly`-only period model and double-close guard** are **extended, not discarded**: FEC-2 fixes the business requirement (arbitrary range); the mechanism for reconciling it against the existing period-type model and guard is left to Specification (§19), consistent with the source BDR's own §5 item 4 and §6 item 4.
5. **`BDR-0015`/`POL-0008` and `BDR-0016`/`POL-0009`'s existing Initial Stock recovery windows** (12-hour Owner window, 3-recovery-cycle/4-confirmation-event ceiling, 48-hour SuperAdmin authorization) are **preserved entirely unamended** (REC-3). REC-1/REC-2 are a distinct, parallel mechanism for Contagem-derived Business Worth snapshots, sharing the same *shape* (Owner window → SuperAdmin-authorized recovery → Owner-executed edit) and the same 72-hour SuperAdmin figure as `BDR-0016`'s ceiling, but governing a different confirmation type entirely.
6. **`BDR-0014`'s dual-valuation-basis mechanics** (cost-basis and selling-basis, both preserved, owner-chosen display basis, prospective-only) are **preserved entirely unamended**. CON-3–CON-4 restate and depend on this discipline; they do not re-decide it. Whether a new-model Contagem snapshot itself carries a cost/selling basis choice, or always preserves both, is a Specification-level question this Policy does not resolve beyond what CON-3–CON-4 already state.
7. **`BDR-0012`'s Product Memory mechanics** (remembered unit relationships, latest recorded selling price/unit) are **preserved entirely unamended**. CON-6 depends on, and does not redefine, this existing behavior.
8. **`08-expenses.md` and `07-breakages.md`'s existing categories and valuation bases** are **preserved entirely unamended** (EXP-1, QUE-1) — no new taxonomy or valuation methodology is introduced.
9. **No existing Policy, BDR, or module specification is superseded merely because the source BDR changes business philosophy.** Every relationship above is traced explicitly; nothing is assumed superseded by silence.

## 19. Scope Exclusions — Technical Implementation Not Decided Here

Consistent with the source BDR's own §6 and §7, and the Policy/Specification boundary `19-governance-bdr-policy-framework.md` §2 draws, this Policy does **not** decide:

- Firestore schema, collection names, or field names for any new record type (Contagem-derived snapshot records, Startup Investment records, receivables, payables/supplier-obligation records, cash-ledger entries, autosave draft persistence).
- The technical mechanism distinguishing a Contagem confirmed "under the new model" from a historical, pre-capability Contagem at the data/flag level.
- The precise code-level reconciliation between the existing `businessWorth`/`capitalGrowth` Engine formula and the new Current/Estimated Business Worth model.
- The exact Fecho arbitrary-date-range mechanism against the existing `monthly`/`yearly`-only period-type model and its double-close guard.
- Dashboard card-level layout detail — which exact existing card surfaces which new behavior.
- The timestamp implementation used to measure the 3-hour Owner correction window or the 72-hour SuperAdmin ceiling.
- The `firestore.rules` implementation of Owner-only, time-boxed correction authorization, or of SuperAdmin-authorized recovery.
- Any UI/interaction layout for Contagem entry, confirmation, reconciliation display, or Business Worth history drill-down.
- Database transaction design for confirming a Contagem, updating the cash ledger, or recording a payment event.
- API design for any endpoint or function implementing any rule in this Policy.
- Migration or backfill strategy for any historical Stock Count, Withdrawal, Expense, or Quebra record recorded before this capability exists.
- Any rounding/precision rule beyond the existing `POL-0001`/`POL-0002` convention.

Each of these remains reserved for the Specification, Rule 8 Assessment, and Implementation Authorization stages that must follow.

## 20. Traceability to the Source BDR

Every rule in §6–§17 above cites the specific source-BDR decision number it operationalizes. No rule in this Policy exists without such a citation, and no source-BDR decision (1–35) is left unoperationalized:

| Source BDR Decision | Operationalized by |
|---|---|
| 1 (When Business Worth exists) | BW-1, CON-2, OWN-1, SYS-1 |
| 2 (Contagem means measurement) | CON-1 |
| 3 (Current Business Worth) | BW-2, DASH-1 |
| 4 (Business Worth history) | BW-3 |
| 5 (Snapshot content) | BW-4 |
| 6 (Product entry / unit preservation) | CON-3, SYS-7 |
| 7 (Selling-price flexibility) | CON-4, OWN-3 |
| 8 (+Stock boundary) | CON-5 |
| 9 (Cost/price memory) | CON-6, OWN-2, SYS-2 |
| 10 (Contagem boundary) | CON-7, OWN-2 |
| 11 (Contagem reconciliation) | CON-8, FIN-2, OWN-5 |
| 12 (Cash) | FIN-1, SYS-3 |
| 13 (Receivables) | FIN-3, SYS-4 |
| 14 (Supplier obligations) | FIN-4, SYS-5 |
| 15 (Supplier credit purchases) | FIN-5, SYS-6 |
| 16 (Cash-financed purchases) | FIN-6, SYS-6 |
| 17 (Expenses) | EXP-1, EXP-2 |
| 18 (Quebras) | QUE-1 |
| 19 (Levantamentos) | LEV-1, FEC-3 |
| 20 (Startup Investment) | SI-1, SI-2, SI-3 |
| 21 (Estimated Business Worth) | BW-5 |
| 22 (Business Worth reconciliation) | BW-6, OWN-5 |
| 23 (New Contagem resets the estimate) | BW-2, BW-7 |
| 24 (Fecho) | FEC-1, FEC-2, FEC-4 |
| 25 (Historical Capital Inicial) | HIST-1, HIST-2, HIST-3, SYS-11 |
| 26 (Historical data / transition) | HIST-4, SYS-11 |
| 27 (Dashboard) | DASH-1 |
| 28 (Business Worth history UI) | BW-3, DASH-1 |
| 29 (Contagem autosave) | CON-9, SYS-8 |
| 30 (Confirmation safety) | CON-10, SYS-9 |
| 31 (Owner 3-hour correction window) | REC-1, OWN-4 |
| 32 (SuperAdmin recovery) | REC-2, OWN-4 |
| 33 (Immutability) | REC-4, SYS-10 |
| 34 (Architecture override) | ARCH-1, ARCH-2, FIN-7 |
| 35 (One umbrella governance model) | This document's own existence as a single, undivided Policy (§3, CPR-5) |

## 21. Acceptance / Consistency Criteria

1. Every operational rule in §6–§17 traces to a specific, numbered source-BDR decision (§20), and no source-BDR decision (1–35) is left unoperationalized.
2. No rule in this Policy conflicts with, narrows, or silently extends any DECIDED decision in the source BDR's §4.
3. No rule in this Policy conflicts with, narrows, or silently extends `BDR-0014`, `BDR-0012`, `BDR-0015`/`POL-0008`, or `BDR-0016`/`POL-0009` — each relationship is explicitly traced (§18).
4. No technical implementation detail (schema, field names, security rules, timestamp mechanism, UI, transaction design, API, migration, rounding) is committed anywhere in this document (§19).
5. The one-umbrella-governance principle is preserved: this Policy is the sole Policy document for the entire Business Worth evolution; no rule purports to authorize splitting it into topic-specific Policies (CPR-5, §3).
6. The narrow Architecture Boundary Override is preserved exactly as the source BDR decided it, with its explicit non-authorization list intact and unexpanded (ARCH-1, ARCH-2).
7. Every place this Policy defers a technical question to Specification/Rule 8 is stated as a deferral, not silently omitted or silently resolved (§18 items 2 and 4; §19 in full).

## Governance Notes

- This is a Policy document only. No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` file is touched by this document. No UI, schema, or code is modified.
- This Policy does not modify the source BDR, `BDR-0014` or its companion amendments, `BDR-0012`, `BDR-0015`/`POL-0008`, `BDR-0016`/`POL-0009`, `10-stock-counts.md` and its three amendments, `02-business-worth-engine.md`, `09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`, `11-monthly-closings.md`, or `01-dashboard.md` — all confirmed unmodified by this document.
- This Policy does not create a Business Domain Specification, Rule 8 Assessment, or Implementation Authorization.
- This Policy's identifier, `POL-0010`, is explicitly assigned by direct Product Architect decision (see "Numbering," above), per `19-governance-bdr-policy-framework.md`'s Numbering Ledger assignment-authority rule. The next available unprefixed slot for any future Policy is now `POL-0011` — not assigned to anything by this document.
- `docs/specs/README.md` and `19-governance-bdr-policy-framework.md`'s Numbering Ledger are not modified by this document; recording `POL-0010` in the Ledger's `POL-NNNN` table is a follow-on documentation step, not performed here — the same deferral `POL-0008`'s own Governance Notes recorded for its own number.
- No other file, in `docs/specs/` or elsewhere, is created or modified by this document. Nothing is committed or pushed as part of producing this document.

## Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3's governing hierarchy, and the source BDR's own §10, now that `POL-0010` is numbered: the next governance step is one consolidated Business Domain Specification covering functional requirements and acceptance criteria across every rule in this Policy. Not drafted, started, or authorized by this document.

**Lifecycle:** Drafted → **Numbered (`POL-0010`, this step)**. Not yet Product-Architect-approved as a Policy in full (numbering is a distinct decision from substantive approval; none of the substantive rules were re-reviewed or re-approved by this numbering decision). Not Specified. Not Implemented.
