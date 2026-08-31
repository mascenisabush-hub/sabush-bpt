Business Domain Specification

# Business Worth Evolution & Measurement Model — Consolidated Specification

**Status:** ✅ **Accepted (22 August 2026)**, including a **fourth amendment pass (§41), also now Accepted (22 August 2026)** — the base content described in this Status block, the three passes named in "Amended by," and §41 are all Accepted. Converts the approved umbrella BDR and the approved umbrella Policy into functional requirements and technical design across the entire Business Worth Evolution capability. See "Product Architect Acceptance" (§40, below) for the original signed acceptance statement, and §41.9 for the acceptance of the fourth (terminology-correction) amendment. **Acceptance authorizes progression to Rule 8 Assessment only** — it does not authorize coding, `firestore.rules` changes, test changes, index changes, an Implementation Plan, or an Implementation Authorization (§40). **Rule 8 Assessment complete:** `docs/engineering/business-worth-evolution-rule8-assessment.md` returned a verdict of **READY FOR IMPLEMENTATION** (22 August 2026), following explicit Product Architect resolution of its two findings — recorded in this Specification at §26 and §30b. This Specification's own Acceptance status is unchanged and is not reopened by the Rule 8 Assessment or by this cleanliness pass; the two Rule 8-stage decisions are additive to, not replacements for, anything already Accepted. **A separate Governance Reconciliation Report addresses whether the Rule 8 Assessment, Implementation Plan, and Implementation Authorization — all produced against this Specification's pre-§41 text — themselves require amendment as a result of §41's acceptance; that determination is not made by this Specification document itself.**
**Amended by:** (1) the Product Architect's ten-decision review, 22 August 2026, incorporated directly into this document — §6, §8, §9, §10, §14, §18, §22, §25–§26, §28, §30, §31, and §36 carried those changes; (2) a post-acceptance governance-review corrective pass, also 22 August 2026, fixing six identified Specification defects (an internal contradiction in Acceptance Criterion #1; a traceability-table mismap in §30a; propagation of State 1a into §13 and §32; a refreshed §3 Scope; and every stale internal section cross-reference found by a full-document sweep) — none of which reopens, alters, or reinterprets any Product Architect business decision; (3) a post-Rule-8 governance-cleanliness pass, also 22 August 2026, recording the Rule 8 Assessment's two resulting Product Architect decisions (§26, §30b, §36) and removing the now-resolved correction/recovery-cycle-ceiling item from §36's open-questions list; (4) an **amendment, also 22 August 2026, now ACCEPTED (§41)**, correcting the Current Business Worth / Estimated Business Worth / Business Worth Snapshot terminology relationship (§6, §7, §8, §9, §18, §22, §27, §29, §32, §36) per explicit Product Architect clarification that Current Business Worth must be a live, evolving figure — not a synonym for "the latest snapshot's frozen value" — while preserving every already-decided formula, ceiling, and non-double-counting rule unchanged. Sections not touched by any pass are unchanged from the original draft. **None of the four passes reopens, alters, or reinterprets any of the ten Specification-stage Product Architect decisions (§30a) or any of the 35 source-BDR decisions** — pass (4) is a terminology/semantic-relationship correction, not a new business decision (§41 explains why). **(5) [DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, 31 August 2026, §44]:** a fifth pass, addressing the Specification clarification required by the signed [Capital Inicial Retirement Decision Proposal](../engineering/capital-inicial-retirement-decision-proposal.md) §10(iii) and its governing BDR Decision 39 — Expected Current Stock Value's terminology (not arithmetic), Product Memory's preservation, and State 1a's permanent-legacy treatment, none of which touch this Specification's own Business Worth formulas, ceilings, or non-double-counting rules. **Not yet Accepted — see §44's own status line.**
**Type:** Business Domain Specification, per the category `19-governance-bdr-policy-framework.md` §2 establishes and per the governance hierarchy `docs/specs/README.md`/`CLAUDE.md` already document (`Architecture → Standards → Specifications → Implementation`). Defines system behavior, data model, and functional/acceptance criteria for implementation — the layer between the approved Policy and Rule 8 Assessment. Does not itself decide business philosophy (the source BDR's settled role) or operational policy (the source Policy's settled role), and does not itself constitute a Rule 8 Assessment, Implementation Plan, or Implementation Authorization.
**Location note:** Filed in `docs/specs/`, unprefixed and descriptively named (`business-worth-evolution-specification.md`) — this is this repository's established convention for a cross-cutting capability's Specification (`initial-stock-dual-valuation-basis-specification.md`, `superadmin-assisted-initial-stock-recovery-specification.md`, `product-unit-of-measure-specification.md` — none of these carry a `POL-NNNN`/`BDR-NNNN`-style number). This repository's Specification layer, unlike its BDR/Policy layer, has no established `SPEC-NNNN` numbering ledger to assign from — no number is invented here, consistent with the instruction not to guess a numbering scheme that does not exist.
**Authority/source BDR:** [`BDR-pending-business-worth-evolution-measurement-model.md`](./BDR-pending-business-worth-evolution-measurement-model.md) — verified present on `main` (commit `de39377`) before drafting; its Status line reads "✅ Business Decision phase complete," and its §4 records all 35 Product Architect decisions as DECIDED with no open business decision remaining (its own §6 confirms only technical/implementation matters are deferred).
**Authority/source Policy:** [`POL-pending-business-worth-evolution-policy.md`](./POL-pending-business-worth-evolution-policy.md) — filed at this path, not at `POL-0010-business-worth-evolution-policy.md`; the file itself records that `POL-0010` is the identifier explicitly assigned to its content (its own "Numbering" section), while the file's own path remains the original descriptive one, unchanged by that numbering decision. This Specification cites the document as **POL-0010** throughout, per its own self-identification, while linking to its actual path. Verified present on `main` (commit `c5bfa46`) before drafting; its Status line reads "✅ Drafted, and numbered by explicit Product Architect decision," and its §20 traces every one of the source BDR's 35 decisions to an operational rule with no gap.
**Depends on:** The source BDR and POL-0010 in full (above), and — without amending any of them — `BDR-0012`/the accepted [Product Unit-of-Measure & Product Memory Specification](./product-unit-of-measure-specification.md), `BDR-0014`/its two accepted companion amendments, `BDR-0015`/`POL-0008` (Void & Redo) and its accepted [Specification](./initial-stock-accidental-confirmation-recovery-specification.md), `BDR-0016`/`POL-0009` and its accepted [Specification](./superadmin-assisted-initial-stock-recovery-specification.md), `02-business-worth-engine.md`, `10-stock-counts.md` and its three amendments, the accepted [Stock Count Data-Loss Resilience Specification](./stock-count-data-loss-resilience-specification.md) (Contagem autosave/idempotent-finalization pattern this Specification reuses rather than reinvents), `04-purchase-batches.md` and its [Durable Purchase Capture & Reusable Suppliers Amendment](./04-durable-purchase-capture-and-suppliers-amendment.md), `09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`, `11-monthly-closings.md`, `01-dashboard.md`, `12-reports.md`, and `20-notifications.md` (added by the 22 August 2026 amendment, §22/§18), for the existing module behavior this Specification explicitly preserves or extends (§30, Governance Conflict Check).
**Does not amend:** Every document named above, in full — none of their own text is edited by this Specification. §30 identifies exactly which relationship each has to this Specification (Preserved / Extended / Superseded / requires clarification).
**Followed by:** One Rule 8 Assessment and one signed Implementation Authorization, each its own separate, explicitly gated step, neither drafted, started, or authorized by this document. Per the source BDR §10, implementation itself — once authorized — may proceed feature-by-feature in controlled increments, each still bound by this Specification's own acceptance criteria (§29).

---

## 1. Investigation Performed Before Drafting

Confirmed by direct repository inspection before any Specification text below was written, per this task's own governing instruction:

1. **The source BDR and POL-0010 are the approved authorities for this work**, verified as described above.
2. **`02-business-worth-engine.md`** was read in full: the existing `businessWorth = totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime` formula, `capitalGrowth = businessWorth − initialCapitalValue`, `calculateBatch`/`calculateInventoryTotals`, and the Engine's explicit "zero external dependencies" and "consumed identically by Dashboard/Reports/Closings" requirements.
3. **`10-stock-counts.md`** (and its Expected Current Stock Value, Initial Stock Valuation History, and Simplification amendments) was read in full: the `initial`/periodic `StockCount` model, the existing Draft → Editable → Confirmed workflow for Initial Stock (`stockCountDrafts/initial`), the "truly immutable, no exceptions" tier for the `initial` count, and the deliberate, code-commented separation of Contagem from `businessWorth`.
4. **The accepted Stock Count Data-Loss Resilience Specification** was read in full: its Draft Lifecycle State Model (`editing`/`saving`/`saved`/`save-failed`), its "durable vs. committed" distinction, its submission-identity idempotent-finalization design, and its explicit non-goal boundary (does not touch `InitialStockCountView.tsx`'s own known resurrection defect). This Specification's Contagem autosave/confirmation design (§20–§21) is built as a direct extension of this existing, already-authorized-direction pattern, not a new design.
5. **`BDR-0014` and its two companion amendments** were read in full: the dual cost/selling valuation-basis mechanics, the owner-chosen, prospective-only, fixed-once-set Initial Capital display basis, and the explicit boundary statement (`BDR-0014` §7) that "how Initial Stock, StockBatch inventory, expenses, withdrawals, or realized profit ultimately combine into a single Business Worth figure" was left for a future, separate decision — the source BDR names itself as exactly that decision (source BDR §9).
6. **`BDR-0015`/`POL-0008` (Void & Redo) and its accepted Specification, and `BDR-0016`/`POL-0009` (SuperAdmin-Assisted Recovery) and its accepted Specification**, were read in full: the 12-hour Owner window (Recovery Window Amendment), the 3-recovery-cycle/4-confirmation-event ceiling, the 48-hour SuperAdmin authorization duration, the Authorization-artifact lifecycle (request → grant → consume-or-expire), and the "SuperAdmin authorizes; SuperAdmin never acts" discipline this Specification's own §22 (SuperAdmin-Authorized Recovery) mirrors in shape without merging into.
7. **`product-unit-of-measure-specification.md` and `BDR-0012`** were read in full: the `Product.unitRelationship` ordered-chain data model, Product Memory's prefill-not-derive discipline, and Periodic Contagem's existing "combine to `units[0]`" reference-unit convention for mixed-unit valuation.
8. **`04-purchase-batches.md` and its Durable Purchase Capture & Reusable Suppliers Amendment** were read in full, specifically confirming — by direct grep against the amendment's own Part 7 ("Explicitly Out of Scope") — that **no supplier-payable, supplier-debt, or accounts-payable capability exists anywhere in this codebase today**. The reusable `Supplier` entity (`businesses/{businessId}/suppliers/{supplierId}`) and `PurchaseBatch.supplier` snapshot exist; a payment/liability lifecycle on top of either does not. This confirms Payables (§12) is a genuinely new record type, not an extension of an existing one.
9. **`11-monthly-closings.md`** was read in full: a `Closing` already stores a `periodType` (`monthly`/`yearly`), a **free-form `startDate`/`endDate`**, and `isPeriodClosed` guards against closing the exact same `periodType`+`startDate`+`endDate` combination twice. This is a materially favorable finding for §19 (Fecho) — the arbitrary-date-range requirement (source BDR Decision 24) does not require a new date-storage mechanism; it requires a new `periodType` value (or equivalent) so an arbitrary range is not forced to masquerade as a calendar month/year, while the existing free-form date fields and double-close guard need no structural change.
10. **`01-dashboard.md`** was read in full: the existing nine-KPI-card model, a dedicated Initial Capital card, a dedicated Business Worth card, "Data currency: always-current, never cached" as an explicit Dashboard-specific rule (distinct from SuperAdmin's own cached aggregation).
11. **`09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`** were confirmed, at the level the source BDR and POL-0010 already restate, to have no capability gap this Specification needs to close — each is consumed exactly as already governed (EXP-1, QUE-1, LEV-1).
12. **Architecture principles** — `docs/architecture/02-core-product-principles.md` §2.4 (Data Integrity Over Convenience), §2.10 (Historical Integrity), `docs/architecture/07-data-architecture.md` §7.6 (immutability tiers) — inform §26 (Immutability) below, consistent with how `BDR-0015` §3 itself already framed Void & Redo as "a narrow, bounded exception... not a precedent for 'immutable, except when...'".
13. **`20-notifications.md`, read in full during the 22 August 2026 Product Architect review amendment**: confirmed the module's three already-approved notification-creation paths (Decision Gate 2), specifically the Background Worker–driven scheduled/derived-trigger path, and confirmed the `NotificationCategory` enum has already been extended once before by amendment (`'staff'`, added by the accepted Category Amendment v1.2) — the precedent this Specification's own preventive-reminder integration (§22) follows, rather than inventing a new notification system.

No file, `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` path was modified to produce this Specification. Nothing was committed or pushed.

## 2. Purpose

The source BDR settled **what Business Worth means** under the new model; POL-0010 settled **what operational rules the system and its users must follow** to preserve that meaning. This Specification settles **the system behavior and technical design necessary to implement those approved decisions** — functional requirements, a data model, and acceptance criteria a Rule 8 Assessment can be run against. It introduces no new business decision and no new operational policy; every rule below traces to a specific BDR decision or POL-0010 rule (§28, Traceability Matrix).

## 3. Scope

**In scope, as one consolidated whole** (source BDR Decision 35; POL-0010 CPR-5): the Business Worth lifecycle and its states, including State 1a for an existing business (§6); Current and Estimated Business Worth (§7, §9); Business Worth history and snapshot data model (§8); the Cash Ledger (§10); Receivables (§11); Supplier Payables (§12); Startup Investment, including its State-1a-aware baseline (§13); Contagem as measurement and reconciliation, and its multi-unit valuation modes (§14–§15); Contagem's cost-price preservation and its boundary against +Stock (§16); Embedded Profit's interaction with the new model (§17); Fecho as a **baseline-anchored** (not arbitrary-start) reporting range (§18); Levantamentos (§19); Quebras (§20); Expenses (§21); the reconciliation signal, possible-cause guidance, and preventive notifications (§22); Contagem autosave (§23) and confirmation safety (§24); the Owner 3-hour correction window (§25) and SuperAdmin 72-hour recovery (§26); immutability (§27); the Traceability Matrix and Product Architect Decision traceability (§28, §30a); Acceptance Criteria (§29); the Governance Conflict Check (§30); historical transition (§31); the Dashboard's conceptual-only change, including its State-1a display rule (§32); and Security (§33), Auditability (§34), and Idempotency/Failure Safety (§35).

**Out of scope, per the source BDR/POL-0010's own explicit boundary (Architecture Boundary Override, ARCH-1/ARCH-2):** point-of-sale functionality, checkout, invoicing, payroll, full accounting, ERP functionality, or general customer transaction management. **Also out of scope, per this Specification's own discipline (§37, Explicit Non-Goals):** any Firestore security-rules text, any UI/component/layout design, any database transaction implementation, any API design, any migration/backfill script, and any rounding/precision rule beyond the existing `POL-0001`/`POL-0002` convention — each reserved for Rule 8 Assessment/Implementation Authorization.

## 4. Terminology — Preserved, Not Redefined

**Contagem**, **Capital Inicial**, **Levantamentos**, **Quebras**, **Fecho**, **Embedded Profit**, **Business Worth**, **Current Business Worth**, **Estimated Business Worth**, **Startup Investment**, **Receivables**, **Supplier obligations/Payables**, **Cash Ledger**, and **reconciliation signal** all carry exactly the meaning the source BDR §2 and POL-0010 §4 already fix. This Specification introduces no new business term. Where a new *technical* term is needed (e.g. a specific record-type name), it is introduced explicitly where that record type is defined (§8, §10–§13) and marked as a Specification-level naming choice, not a business concept.

## 5. Conflict-of-Reuse Principle Governing Every Section Below

Per the source BDR §6 item 6 and this task's own Technical Design Discipline: where an existing mechanism already does substantially the required job (Contagem draft persistence, Void & Redo's Authorization-artifact shape, the existing free-form Closing date fields), this Specification reuses and extends that mechanism rather than inventing a parallel one. Every section below states explicitly whether it is (A) reusing an existing mechanism unchanged, (B) extending an existing mechanism, or (C) introducing a genuinely new one — this labeling is carried into the Governance Conflict Check (§30) and the Explicit Non-Goals list (§37).

---

## 6. Business Worth Lifecycle

**(C) New concept; governs everything below.**

**State 1 — UNKNOWN (genuinely new business only).** From business creation until the first Contagem is confirmed under this model, a business with **no preserved historical Capital Inicial** has Business Worth = UNKNOWN. The system reports known operational information — stock purchased, cost valuation, selling valuation, embedded profits, expenses, Startup Investment, other recorded activity — never as a Business Worth figure (source BDR Decision 1; POL-0010 BW-1, SYS-1).

**State 1a — Estimated, pre-first-new-model-Contagem (existing business only) [DECIDED — Product Architect review, "Critical Transition Clarification," 22 August 2026].** An **existing business** that already has a preserved historical Capital Inicial does **not** need to perform a new-model Contagem before the system can show Estimated Business Worth. Estimated Business Worth already exists for such a business, computed as `Historical Capital Inicial + embedded profits since the applicable baseline − expenses − breakages − Levantamentos` (§9's transitional formula; source BDR Decision 25; POL-0010 HIST-2). This is a genuinely distinct state from State 1 — an existing business is never UNKNOWN merely because it has not yet performed a Contagem under the new model; only a business with no baseline at all (no historical Capital Inicial and no `BusinessWorthSnapshot`) is UNKNOWN. **Current Business Worth**, as opposed to Estimated, remains absent for such a business until its own first new-model Contagem is confirmed (§7) — State 1a has an Estimated figure but no Current figure yet, exactly as before this amendment; only what "Current Business Worth" itself means once it does exist (State 3, above) has changed.

**State 2 — First confirmed Contagem, or Owner-Declared establishment [Corrected, §42].** The Owner alone decides the business can stand on its own. ~~Because the existing schema already requires an `initial` `StockCount` before any periodic Contagem, this transition event **is** the same confirmation event as today's Initial Stock/Capital Inicial confirmation, for a genuinely new business (source BDR Decision 1, "logical consequence"; POL-0010 CON-2).~~ **[Corrected, §42]** A genuinely new business's first confirmed Contagem is never the same event as a Capital Inicial confirmation — the two are independent, optional events (BDR §4 Decision 1, as corrected). State 2 (the transition from no-Business-Worth/Estimated to established Business Worth) occurs at whichever event first produces a `BusinessWorthSnapshot`: a Contagem confirmation, or an Owner-Declared establishment (§42 Decision 11) — never at a Capital Inicial confirmation, which never produces a `BusinessWorthSnapshot` under any circumstance. For an existing business already in State 1a, this same transition event is instead its **first periodic Contagem confirmed under the new model, or its first Owner-Declared establishment** — the marker described in §14 is what makes a `StockCount` new-model-eligible in either case, not whether it happens to be the `initial` count specifically. No second, parallel "operational start" control is introduced (FR-1, as amended, §42).

**State 3 — Current Business Worth [AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41].** From a business's first confirmed Contagem onward, Current Business Worth is the business's live, present-moment Business Worth: the latest confirmed `BusinessWorthSnapshot`'s own `measuredBusinessWorth`, plus every governed Business-Worth-affecting change recorded since that snapshot's own `confirmedAt` — computed via the exact same on-demand formula §9's "Case A" already fully specifies (embedded profit since, minus expenses/breakages/Levantamentos since, plus applicable position changes). **The snapshot itself is not the Current Business Worth** — it is the frozen historical measurement Current Business Worth is currently computed *from*; Current Business Worth keeps evolving as approved activity occurs, while the snapshot it started from never changes (source BDR Decisions 3, 21, 23; POL-0010 BW-2, BW-5).

**State 4 — Estimated Business Worth.** Estimated Business Worth remains the governed estimate used specifically where (a) no measured checkpoint exists yet at all for the business (State 1a, §9 Case B), or (b) the approved Fecho model reads Business Worth as of a specific, possibly-past, Owner-selected date rather than "right now" (§18) — in both cases via the same formula shapes §9 already specifies, unchanged by this amendment. **Where a `BusinessWorthSnapshot` already exists and the read is "as of right now," that live figure is Current Business Worth (State 3, above), not Estimated** — this is the one terminology correction this amendment makes; the underlying calculation §9 Case A already defines is unchanged and is simply the same computation State 3 now also names (source BDR Decision 21; POL-0010 BW-5).

**State 5 — New Contagem.** A newly confirmed Contagem produces a new dated, frozen `BusinessWorthSnapshot` — the new baseline Current Business Worth is thereafter live-computed from; the previous snapshot becomes historical, permanently preserved and never overwritten (source BDR Decision 23; POL-0010 BW-7). Current Business Worth itself is never "reset" to a stored value at this moment — it is recomputed on demand, from the new baseline forward, exactly as it always is.

**FR-1.** The system must never present a **Current** Business Worth figure as known/measured for a business with no confirmed Contagem under this model.
**FR-2 [amended, §42].** The system must not introduce any control, button, or flag whose function is "declare the business operational" independent of a genuine Business Worth establishment event. Exactly two establishment events exist, and no others: (a) a confirmed Contagem (§14), and (b) an Owner-Declared Business Worth establishment (§42 Decision 11) — explicitly named here as the second permitted instance of "a genuine establishment event," per BDR Decision 36 and Specification Decision 11, never as a bypass or shortcut around establishment. No third mechanism, flag, or control of any kind, under any name, may declare a business "operational" or "established" outside these two named events.
**FR-50 [DECIDED — Product Architect review, 22 August 2026].** For an existing business with a preserved historical Capital Inicial and no `BusinessWorthSnapshot` yet, the system must compute and display Estimated Business Worth without requiring a new-model Contagem first — never presenting such a business as UNKNOWN.
**I-1 [AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41].** Exactly one of {UNKNOWN (no baseline at all), State 1a (Estimated only, existing business, no snapshot yet), has a Current Business Worth (at least one `BusinessWorthSnapshot` exists, and Current Business Worth is now live-computed from the latest one forward, per State 3)} is true for a business at any instant — never more than one, never none.

## 7. Current Business Worth

**(B) Extends the existing Dashboard's Business Worth presentation; does not redesign it.**

**[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41] This section's core definition is corrected below.** The existing Dashboard is unchanged in structure (§32). What the existing Capital Inicial presentation conceptually represented — the fixed baseline figure — is, going forward, presented as Current Business Worth (source BDR Decision 3; POL-0010 DASH-1). Current Business Worth is:

- **A live, on-demand calculation, not a frozen read.** From a business's first confirmed Contagem onward, Current Business Worth = the latest confirmed `BusinessWorthSnapshot`'s `measuredBusinessWorth`, plus every governed Business-Worth-affecting change recorded since that snapshot's own `confirmedAt` — computed via the exact same formula §9's "Case A" already fully specifies (embedded profit since, minus expenses/breakages/Levantamentos since, plus applicable position changes). **This is a correction to this Specification's original text**, which previously stated Current Business Worth was "never itself independently computed... never a live recomputation" — that language incorrectly collapsed "Current" into "the frozen snapshot value" and is withdrawn by this amendment. The economic formula itself is unchanged (§9 is not amended) — only which of the two already-defined figures (the frozen snapshot, or the live ongoing calculation built from it) the term "Current Business Worth" refers to.
- **Sourced from the most recent Business Worth Snapshot** (§8) for the business, ordered by `confirmedAt` (§8's data model), as its live baseline — never computed from any earlier snapshot once a later one exists (§9's baseline-reset rule, FR-51, is unchanged and applies identically here).
- **Absent** (State 1, UNKNOWN, or State 1a, Estimated-only) when no snapshot exists yet — unchanged by this amendment; Current Business Worth still does not exist before a business's first confirmed new-model Contagem.
- **The snapshot itself remains a separate, immutable historical fact** (§8, §27) — Current Business Worth evolving forward from it never mutates, backdates, or otherwise touches the snapshot's own frozen fields.

**FR-3 [AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41].** The system must expose a single, unambiguous "Current Business Worth" read that resolves to either (a) a live-computed value — the latest confirmed Business Worth Snapshot's `measuredBusinessWorth` plus governed activity since, per this section's own formula — or (b) an explicit UNKNOWN state when no snapshot exists yet, with no third possible outcome. **This corrects the original FR-3**, which defined Current Business Worth as resolving only to "the latest confirmed Business Worth Snapshot's frozen value" — that outcome (a) is now the live-computed figure described above, not the frozen value itself; outcome (b) (UNKNOWN) is unchanged.
**FR-4.** The Dashboard's existing Business Worth card must read Current Business Worth via FR-3, not via a new independent calculation path.

**Owner Portfolio consumes the same authoritative value [Rule-8-resolved Product Architect decision, 22 August 2026 — see §30b; reading corrected by the pending amendment, §41].** Module #17's existing per-shop `currentWorth` cache (`AppContext.tsx`) is not an independent, competing figure — it must read the same source FR-3 defines: the live Current Business Worth (this section, computed from the latest `BusinessWorthSnapshot` forward) where a snapshot exists, or the live Estimated Business Worth (§9 Case B) where none exists yet, exactly matching the State 1a treatment already decided for the Dashboard (§32). This was not addressed anywhere in the original BDR/POL-0010/Specification and is recorded here only because the Rule 8 Assessment's own code investigation surfaced it as a genuine gap — see §30b for the decision record and full traceability.

**FR-60 [Rule-8-resolved Product Architect decision, 22 August 2026].** Owner Portfolio's `currentWorth` read path must resolve to the same value FR-3 defines for a given business — never an independently-derived figure — so that no two screens can ever disagree about what a business is currently worth.

## 8. Business Worth History — Snapshot Data Model

**(C) New record type — the single most load-bearing new data structure this Specification introduces. [DECIDED — Product Architect review, Decision 10, 22 August 2026]:** `StockCount`/Contagem remains the authoritative **physical measurement** record; `BusinessWorthSnapshot` is the authoritative **frozen Business Worth result** of that measurement. The two are never merged into one record type, and neither substitutes for the other — this relationship, previously proposed, is now the decided design.

**Proposed collection:** `businesses/{businessId}/businessWorthSnapshots/{snapshotId}`, tenant-scoped identically to every other business-owned collection (`isMemberOf`/`isOwnerOf`, per existing `firestore.rules` conventions).

A Business Worth Snapshot is created **exactly once per confirmed Contagem under this model** — never independently, never retroactively, never edited except through the governed correction/recovery windows (§25–§26). Proposed fields (Specification-level technical design, not a business decision — field names below are illustrative and subject to Rule 8 refinement, not authoritative naming per §3's out-of-scope list):

```
BusinessWorthSnapshot {
  id: string
  businessId: string
  sourceStockCountId: string        // the Contagem (StockCount) that produced this snapshot
  confirmedAt: Timestamp            // server-recorded; the snapshot's own immutable anchor,
                                     // identical discipline to StockCount.confirmedAt (BDR-0015)
  measuredBusinessWorth: number     // frozen at confirmation time

  // Drill-down content — minimum twelve items, source BDR Decision 5 / POL-0010 BW-4:
  productValuationTotal: number
  productValuationDetail: ProductValuationLine[]   // per-product, references StockCount items
  embeddedProfitTotal: number
  embeddedProfitDetail: BatchProfitLine[]           // per-batch, references StockBatch ids
  cashPosition: number               // owner-recorded/confirmed actual cash position AS OF the
                                     // Contagem date (Decision 3, §10) — a measured fact of this
                                     // snapshot, not merely a read of the ongoing ledger balance
  receivablesPosition: number        // sum of outstanding Receivables (§11) at confirmation time
  payablesPosition: number           // sum of outstanding Payables (§12) at confirmation time
  expensesSinceLastSnapshot: number  // reference to Expense records in the intervening period
  breakagesSinceLastSnapshot: number // reference to Quebra records in the intervening period
  levantamentosSinceLastSnapshot: number // reference to Withdrawal records in the intervening period
  otherContributingFactors?: object  // extensible, non-authoritative supplementary detail

  // Reconciliation at this snapshot's own creation (source BDR Decision 22; POL-0010 BW-6):
  previousCurrentBusinessWorth: number | null   // null only for the very first snapshot
  estimatedBusinessWorthImmediatelyBefore: number | null
  difference: number | null          // measuredBusinessWorth − estimatedBusinessWorthImmediatelyBefore

  // Correction/recovery state (§25–§26):
  correctionWindowExpiresAt: Timestamp   // confirmedAt + 3 hours, frozen at write time
  status: 'active' | 'corrected' | 'superseded-by-recovery'
  supersedesSnapshotId?: string      // set only if this snapshot exists because an owner correction
                                      // or SuperAdmin-authorized recovery replaced a prior one

  establishmentMethod: 'contagem' | 'owner-declared'   // NEW — §42 Decision 11 (23 August 2026).
                                     // Immutable, set once at creation. Provenance/display metadata
                                     // only — does not alter which formula computes
                                     // measuredBusinessWorth, does not gate which downstream
                                     // consumer may read the snapshot, and does not affect I-2/I-3.
}
```

**Immutable fields** (never rewritten, at any time, by any role, through any path): `id`, `businessId`, `sourceStockCountId`, `confirmedAt`, `measuredBusinessWorth`, and every drill-down/reconciliation field listed above — matching the "truly immutable, no exceptions" discipline `02-business-worth-engine.md` already applies to `businessWorth` at Closing time and `10-stock-counts.md` already applies to the `initial` count itself. The only state that ever changes post-write is `status` (§25–§26), and even that change never rewrites the frozen figures — a correction or recovery produces a **new** snapshot referencing the old one via `supersedesSnapshotId`, never an edit-in-place (source BDR Decision 33; POL-0010 SYS-10, REC-4).

**Avoiding redundant sources of truth (task §25):** `productValuationDetail`/`embeddedProfitDetail` should reference existing `StockCountItem`/`StockBatch` identifiers rather than duplicating their content wholesale, consistent with `04-purchase-batches.md`'s own "this module only aggregates and formats" discipline and the source BDR's explicit "avoid unnecessary duplication of transactional records... prefer immutable snapshot values plus references to underlying source records where appropriate" instruction. The exact balance between "frozen value" and "reference to source" for each drill-down field is a Rule 8 question (§36, item 2) — this Specification fixes the *content* each field must expose (source BDR Decision 5), not the storage shape of each one.

**FR-5.** Confirming a Contagem under this model must, in the same atomic operation as the `StockCount` write (§23–§24), create exactly one new `BusinessWorthSnapshot` document.
**FR-6.** A `BusinessWorthSnapshot`'s frozen fields must never be the target of an `update` operation through any path outside §25–§26's governed windows.
**FR-7 [drill-down behavior for Owner-Declared snapshots amended, §42].** The Business Worth history view must return every snapshot for a business, ordered by `confirmedAt`, including the current one, each independently drillable into every field listed above. **For a snapshot with `establishmentMethod: 'owner-declared'`, see §42's amended drill-down rule (FR-69) — FR-7 requires every *available* content item be drillable, and has never required a content item to be fabricated where the establishment method genuinely does not produce it.**
**FR-61 [new, §42].** Every `BusinessWorthSnapshot` must carry an `establishmentMethod` field of exactly `'contagem'` or `'owner-declared'`, set once at creation, immutable thereafter, and visibly distinguished in every UI surface that displays snapshot history.
**I-2.** No two `BusinessWorthSnapshot` documents for the same business share a `sourceStockCountId`.
**I-3.** A `BusinessWorthSnapshot`'s `measuredBusinessWorth`, once written, never changes value — a correction produces a new document, never a field mutation on this one.

## 9. Estimated Business Worth

**(B) Extends the existing live-computed pattern `businessWorth` already uses in `02-business-worth-engine.md`, applied to a new formula. Two baseline cases now apply — [DECIDED — Product Architect review, Decisions 7 and the "Critical Transition Clarification," 22 August 2026].**

**Case A — a `BusinessWorthSnapshot` already exists (post-first-Contagem, any business).**

**[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41] Naming correction, formula unchanged.** This Case A formula is the exact same calculation §7 now calls **Current Business Worth** when evaluated as of right now, for a business that already has a `BusinessWorthSnapshot`. It continues to be called **Estimated Business Worth** in this section, and in Fecho (§18), when evaluated as of an Owner-selected date other than "right now" (Fecho's own end date), or, per Case B below, when no snapshot exists at all yet. The two names describe when/why the formula is being read, never two different formulas — nothing below this line changes as a result of this amendment.

```
Estimated Business Worth =
    Last Measured Business Worth (latest BusinessWorthSnapshot.measuredBusinessWorth)
  + Embedded profit generated since that snapshot (from open StockBatch activity)
  − Expenses recorded since that snapshot
  − Breakages (Quebras) recorded since that snapshot
  − Levantamentos recorded since that snapshot
  ± Applicable outstanding obligations/position changes (Receivables §11, Payables §12, Cash §10)
```

**Case B — an existing business with a preserved historical Capital Inicial and no `BusinessWorthSnapshot` yet (State 1a, §6).**

```
Estimated Business Worth =
    Historical Capital Inicial
  + Embedded profits since the applicable baseline
  − Expenses
  − Breakages (Quebras)
  − Levantamentos
```

**This business does not need to perform a new Contagem before this figure exists** — it must be visible in Fecho (§18) and wherever Estimated Business Worth is otherwise shown, from the moment this capability ships for that business, using its already-preserved historical Capital Inicial directly as the starting baseline (source BDR Decisions 25–26; POL-0010 HIST-2). Case B's baseline is a strict subset of Case A's formula shape (no cash/receivables/payables position terms, since those did not exist for the business before this capability — §31); once the business confirms its first Contagem under this model, its very next Estimated Business Worth calculation switches to Case A permanently — this is not a special, ongoing "transitional formula" the business remains on, it is what Case A degenerates to before any snapshot exists.

**Baseline reset — no continued accumulation past a new measurement [DECIDED — Product Architect review, Decision 7].** The instant a new Contagem is confirmed and its `BusinessWorthSnapshot` is written, Case A's "Last Measured Business Worth" term becomes that new snapshot's `measuredBusinessWorth`, and every earlier snapshot (or, for a business transitioning out of Case B, the historical Capital Inicial baseline itself) permanently stops contributing to any future Estimated Business Worth calculation. Estimated Business Worth is never computed by accumulating forward from two or more baselines at once — exactly one baseline (the latest) is ever active (source BDR Decision 23; POL-0010 BW-7).

Preserving the governed economic rules, in both cases (source BDR Decisions 15–16; POL-0010 FIN-5/FIN-6):

- A stock purchase financed by existing business cash or by supplier credit **never** adds its own full cost to the estimate — only the resulting batch's embedded profit contributes.
- A supplier-liability payment **never** subtracts twice — the liability already reduced Business Worth when it was recorded as outstanding (§12); the payment itself is a cash↔liability conversion, not a second reduction.
- A receivable is **never** treated as received money until an actual payment event exists against it (§11).

**Computed, never stored as authoritative** — Estimated Business Worth (and, per the amendment above, Current Business Worth once a snapshot exists) is a live read, recomputed on demand from the active baseline (either case above) plus the governed deltas, exactly as `businessWorth` itself is today a live, always-current, never-cached figure (`02-business-worth-engine.md` Functional Requirement #3). It is never itself frozen into a `BusinessWorthSnapshot` except as the `estimatedBusinessWorthImmediatelyBefore` field, captured once, at the moment a *new* Contagem is confirmed (§8) — see §36's new item on that field's own naming, exposed by this amendment.

**FR-8.** The system must provide a pure, on-demand Estimated Business Worth calculation function implementing both Case A and Case B above, reading only from `BusinessWorthSnapshot` (latest, if any), historical Capital Inicial (if no snapshot exists yet), Cash Ledger, Receivables, Payables, Expenses, Quebras, and Withdrawals — never itself a Firestore-persisted authoritative field. **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]** This same function's Case A output is also what §7 defines as Current Business Worth when read as of right now — one function, two names depending on context (§9's own amendment note, above).
**FR-9.** The calculation must never add a stock purchase's full cost, must never subtract a supplier payment twice, and must never count an unpaid receivable — verified per §29 Acceptance Criteria, not by code review alone.
**FR-51 [DECIDED — Product Architect review, 22 August 2026].** Once a `BusinessWorthSnapshot` exists for a business, no subsequent Estimated Business Worth calculation for that business may read from, or accumulate forward from, any baseline earlier than the latest snapshot — including the historical Capital Inicial value that may have served as Case B's baseline before that snapshot existed. **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]** This applies identically to Current Business Worth (§7), which is this same calculation's output when read as of right now.

## 10. Cash Ledger

**(C) New record type.**

**Proposed collection:** `businesses/{businessId}/cashLedgerEntries/{entryId}`. An append-only, complete ledger of cash inflows/outflows — never a typed arbitrary balance (source BDR Decision 12; POL-0010 SYS-3, FIN-1).

```
CashLedgerEntry {
  id: string
  businessId: string
  direction: 'inflow' | 'outflow'
  amount: number
  category: 'customer-payment' | 'supplier-payment' | 'expense' | 'levantamento' | 'other-governed-movement'
  sourceReference: { type: 'receivable' | 'payable' | 'expense' | 'withdrawal' | 'contagem-reconciliation' | 'other', id?: string }
  occurredAt: Timestamp
  createdAt: Timestamp  // server-recorded write time, distinct from occurredAt
  createdBy: string     // uid, for auditability (§34)
}
```

Current cash balance is **derived** (sum of `inflow` minus sum of `outflow` entries), never a separately stored, independently mutable field — the same "never a fabricated cash figure" discipline `10-stock-counts.md`'s own governing code comment already establishes for the platform generally.

**Cash at Contagem [DECIDED — Product Architect review, Decision 3, 22 August 2026].** At a new-model Contagem, the Owner records/confirms the **actual cash position as of that measurement date** — the same "physical measurement" discipline Contagem already applies to stock, applied to cash. The resulting `BusinessWorthSnapshot.cashPosition` (§8) is this Owner-confirmed figure, not merely a mechanical read of the ledger-derived balance, though the two are compared (below) and any difference is a reconciliation signal, never a silent overwrite of either figure. **The system must never attempt to reconstruct historical cash from old data** — for a period before the Cash Ledger existed for a given business, no `CashLedgerEntry` is fabricated, backdated, or inferred; the first Contagem-confirmed cash position under this model is the Owner's own confirmed starting fact, not a derived reconstruction (source BDR Decisions 11–12; POL-0010 FIN-1, FIN-2, SYS-11).

**FR-10.** The system must record every governed cash-affecting event (a receivable payment, a payable payment, an expense, a Levantamento, an other explicitly-governed movement) as its own `CashLedgerEntry`, never as a direct edit to a stored balance field.
**FR-11.** Contagem must be able to compare the ledger-derived cash balance against the Owner-confirmed actual cash position entered at that Contagem (§22), producing a reconciliation signal, never silently overwriting the ledger — or the Owner-confirmed figure — to force agreement.
**FR-55 [DECIDED — Product Architect review, 22 August 2026].** New-model Contagem confirmation must require the Owner to record/confirm the actual cash position as of that date; this confirmed figure, not a derived ledger balance alone, becomes `BusinessWorthSnapshot.cashPosition`. No `CashLedgerEntry` may be created for a date before the business's own Cash Ledger began, as a means of reconstructing historical cash.
**I-4.** No `CashLedgerEntry`, once written, is ever updated or deleted — append-only, matching the `InitialStockPriceChangeEvent`/Timeline-event precedent already established elsewhere in this codebase.

## 11. Receivables

**(C) New record type; new lifecycle.**

**Proposed collection:** `businesses/{businessId}/receivables/{receivableId}`.

```
Receivable {
  id: string
  businessId: string
  totalAmount: number
  amountPaid: number        // derived from linked payment events, or maintained transactionally — Rule 8 question (§36, item 3)
  amountRemaining: number   // totalAmount − amountPaid
  status: 'unpaid' | 'partially-paid' | 'paid'
  createdAt: Timestamp
  description?: string
}
ReceivablePayment {
  id: string
  receivableId: string
  amountPaid: number
  paidAt: Timestamp
  cashLedgerEntryId: string  // the CashLedgerEntry this payment produced (§10)
}
```

An unpaid receivable does **not** contribute to Business Worth (source BDR Decision 13; POL-0010 FIN-3, SYS-4). A payment reduces `amountRemaining`, transitions `status`, and produces exactly one `CashLedgerEntry` of `category: 'customer-payment'` for the paid amount — the paid portion, and only the paid portion, becomes cash and contributes to Business Worth, never double-counted as newly created wealth on top of the cash movement itself. Partial payments are supported: multiple `ReceivablePayment` records may exist against one `Receivable`, and the outstanding remainder continues to be tracked, remaining visible for business decision-making even while unpaid. **[Confirmed — Product Architect review, Decision 4, 22 August 2026: this design is decided as drafted, no change required.]**

**FR-12.** The system must never count a `Receivable` with `status !== 'paid'` toward any Business Worth calculation beyond its already-received `amountPaid` portion.
**FR-13.** Every `ReceivablePayment` must produce exactly one linked `CashLedgerEntry`; no payment event may exist without a corresponding cash-ledger effect.
**I-5.** For any `Receivable`, `amountPaid` equals the sum of its `ReceivablePayment.amountPaid` values, always.

## 12. Supplier Payables

**(C) New record type; new lifecycle — confirmed, by direct inspection of `04-durable-purchase-capture-and-suppliers-amendment.md` Part 7, to have no existing analog anywhere in this codebase (§1, item 8).**

**Proposed collection:** `businesses/{businessId}/payables/{payableId}`, referencing the existing `PurchaseBatch` that generated the obligation (`sourcePurchaseBatchId`), and — where available — the existing reusable `Supplier` record (`supplierId`), without altering either.

```
Payable {
  id: string
  businessId: string
  sourcePurchaseBatchId?: string     // NEW, §42 Decision 12 — now OPTIONAL, was required.
                                      // Required only when origin === 'purchase'.
  origin: 'purchase' | 'opening-balance' | 'other-obligation'   // NEW — §42 Decision 12
  supplierId?: string        // links to the existing reusable Supplier entity where one was used
  description?: string       // NEW, §42 Decision 12 — required when origin !== 'purchase'
  totalAmount: number
  amountPaid: number
  amountRemaining: number
  status: 'unpaid' | 'partially-paid' | 'paid'
  createdAt: Timestamp
}
PayablePayment {
  id: string
  payableId: string
  amountPaid: number
  paidAt: Timestamp
  cashLedgerEntryId: string
}
```

An outstanding `Payable` reduces Business Worth once, at the moment the liability is recorded (source BDR Decision 14; POL-0010 FIN-4). A `PayablePayment` decreases cash and decreases the liability **together** — it must never register as a second, independent Business Worth reduction on top of the reduction the outstanding liability already represents (source BDR Decision 15; POL-0010 FIN-5). Precisely the same non-double-counting discipline as Receivables (§11), mirrored for the liability side. **[Confirmed — Product Architect review, Decision 5, 22 August 2026: supplier obligations recorded during +Stock, Unpaid/Partially Paid/Paid states, original amount/paid/remaining all preserved, payment settles rather than doubly reduces — this design is decided as drafted, no change required.]**

**FR-14.** A supplier-credit purchase must create a `Payable` for the credited amount at the same time it creates its `StockBatch`/`PurchaseBatch` records, without adding the purchase's full cost to any Business Worth figure beyond the resulting embedded profit.
**FR-15.** A `PayablePayment` must never be counted as an additional Business Worth reduction beyond the reduction the `Payable`'s own outstanding balance already represents.
**FR-62 [new, §42 Decision 12].** A `Payable` of origin `'opening-balance'` or `'other-obligation'` must be creatable via a standalone path requiring no `PurchaseBatch`/`StockBatch`, must require a non-empty `description`, and must otherwise participate in the exact same payment, settlement, Business Worth, and notification mechanics (FR-14, FR-15, the existing `payable.outstanding` notification) as a purchase-origin `Payable`, without alteration to those existing mechanics.
**I-6.** For any `Payable`, `amountPaid` equals the sum of its `PayablePayment.amountPaid` values, always — mirroring I-5.

## 13. Startup Investment

**(B) Extends existing +Stock/Expense records via reference; (C) introduces a narrow new record type only for spending with no existing home.**

Startup Investment covers everything the Owner spends establishing the business, from creation until the business is considered to be standing on its own — for a genuinely new business, that is its first confirmed Contagem under this model; **for an existing business already in State 1a (§6), that milestone already occurred historically, at whatever point its historical Capital Inicial was established — it does not wait for a future new-model Contagem the business may not perform for a long time** (source BDR Decision 20; POL-0010 SI-1; §6, §9 State 1a/Case B). To satisfy "must not duplicate a stock purchase already recorded via +Stock" (SI-2):

- **For a genuinely new business (no preserved historical Capital Inicial yet):** stock spending already recorded as a `PurchaseBatch`/`StockBatch` in the window `[businessCreatedAt, firstContagemConfirmedAt)` is **referenced**, not re-recorded — Startup Investment reporting queries existing purchase records scoped to that window, the same non-duplication discipline `04-purchase-batches.md` already applies to its own aggregation ("this module only aggregates and formats"). Expense spending in the same window is referenced from existing `Expense` records identically.
- **For an existing business (State 1a or beyond):** the Startup Investment window is `[businessCreatedAt, historicalCapitalInicialDate)` — anchored to the date the business's own preserved historical Capital Inicial was actually established, never to `firstContagemConfirmedAt`. **Where the existing historical record does not carry a reliable date for that moment, this Specification does not fabricate one** — whether a sufficiently reliable historical date is available for every existing business, and if not, what fallback (if any) Rule 8 should adopt, is an open Rule 8 question, not resolved here.
- **Spending with no existing record type** — labor, wages, licenses, preparation/renovation costs not already captured as a Product/Stock/Expense — needs a narrow new record, for either case above:

**Proposed collection:** `businesses/{businessId}/startupInvestmentEntries/{entryId}` — for exactly this residual category only.

```
StartupInvestmentEntry {
  id: string
  businessId: string
  category: 'labor' | 'wages' | 'transport' | 'preparation' | 'license' | 'other'
  amount: number
  description?: string
  recordedAt: Timestamp
}
```

Total Startup Investment = (referenced pre-Contagem `PurchaseBatch` original-investment totals) + (referenced pre-Contagem `Expense` totals) + (sum of `StartupInvestmentEntry.amount`) — a report-time aggregation, not a duplicated ledger.

**Startup Investment is never subtracted from, or automatically compared as a shortfall against, Business Worth [DECIDED — Product Architect review, Decision 6, 22 August 2026].** A large Startup Investment relative to a smaller first measured Business Worth — the source BDR's own worked example, Startup Investment `800,000` MZN against a first measured Business Worth of `310,000` MZN — must **not** be automatically interpreted, labeled, or displayed as a loss or as poor performance anywhere in this system (source BDR Decision 20; POL-0010 SI-3). The system helps the Owner understand "how much did I invest to establish the business?" as a question distinct from "what is my business worth now?" — the two figures are shown side by side, never netted against each other into a single derived "performance" figure.

**FR-16.** Startup Investment reporting must aggregate existing `PurchaseBatch`/`Expense` records by reference and the correct date-window for the business's own case (new business: `[businessCreatedAt, firstContagemConfirmedAt)`; existing business: `[businessCreatedAt, historicalCapitalInicialDate)`), never by re-recording their amounts into a duplicate transaction, and never by using `firstContagemConfirmedAt` as the window boundary for an existing business already in State 1a.
**FR-17.** A `StartupInvestmentEntry` may only be created for spending with no existing Product/Stock/Expense record — this Specification does not authorize `StartupInvestmentEntry` as a general-purpose alternative to Expense recording.
**FR-52 [DECIDED — Product Architect review, 22 August 2026].** No code path may compute or display a Startup-Investment-vs-Business-Worth "shortfall," "loss," or "performance" figure; the two totals are presented as independent, separately-labeled measurements only.

## 14. Contagem — Measurement and Reconciliation

**(B) Extends the existing `StockCount` mechanism; does not alter its mechanical shape.**

Contagem's existing mechanical shape (a date, a type, a list of counted items) is unchanged (source BDR Decision 2; POL-0010 CON-1). What changes is meaning: a Contagem confirmed going forward under this model is also the mechanism producing a `BusinessWorthSnapshot` (§8).

**The mechanism distinguishing a "new-model" Contagem from a historical, pre-capability one — [DECIDED — Product Architect review, Decision 1, 22 August 2026]:** an explicit marker field, **`StockCount.producesBusinessWorthSnapshot: boolean`**, is the **authoritative** mechanism. It is set `true` on every Contagem confirmed under this model going forward, and is absent (or `false`) on every historical, pre-capability record — never backfilled (source BDR Decisions 25–26; POL-0010 HIST-4). **A cutover timestamp is explicitly rejected as the authoritative mechanism** — eligibility is decided by the marker field on the record itself, never inferred from when the record happens to have been confirmed relative to some cutover moment. This resolves what was previously an open Rule 8 question; it is no longer listed among this Specification's remaining open items (§36).

**FR-18.** The system must be able to determine, for any given `StockCount`, whether it is eligible to produce (or has already produced) a `BusinessWorthSnapshot`, by reading its own `producesBusinessWorthSnapshot` field — never by comparing its date against a cutover timestamp or any other derived condition.
**FR-19.** No historical `StockCount` recorded before this capability's cutover may retroactively acquire a `producesBusinessWorthSnapshot: true` marker or a `BusinessWorthSnapshot` it did not produce at confirmation time.

## 15. Multi-Unit Valuation (Contagem-Specific)

**(B) Extends the existing `Product.unitRelationship` chain and the existing "combine to `units[0]`" reference-unit convention `product-unit-of-measure-specification.md` §4 already documents for Periodic Contagem.**

Contagem supports:

- **Mode A — single selling-unit price**, applied across all physical quantities, internally converted for valuation.
- **Mode B — multiple, independently-set selling-unit prices**, each applied to its own physical portion, summed internally.

(source BDR Decision 7; POL-0010 CON-4)

Physical quantities and entered prices remain in their entered units, unchanged from how they are displayed and stored today; only the internal valuation calculation converts, exactly as `product-unit-of-measure-specification.md` §6 already establishes for fractional-quantity/rounding treatment (no new rounding scheme introduced here; §3's out-of-scope list).

**+Stock is explicitly unaffected**: it retains its existing single-purchase-unit/single-cost-unit/single-selling-unit/single-price-per-batch model. Contagem's Mode B flexibility does not extend to it (source BDR Decision 8; POL-0010 CON-5).

**Cost/selling price memory** during Contagem draws on the existing, unmodified `BDR-0012` Product Memory mechanics — latest known cost, latest known selling price, confirmed unit relationships — supplied so the Owner is not required to re-type what the system already knows, without silently overwriting it (source BDR Decisions 9–10; POL-0010 CON-6/CON-7).

**Genuine Rule-8 gap, not resolved here:** `product-unit-of-measure-specification.md` §4's existing "combine to `units[0]`" convention was designed for Periodic Contagem's *existing* single-selling-price behavior. Whether and how that convention interacts with Mode B's multiple simultaneous selling-unit prices — each portion valued at its own entered price rather than one converted reference price — is not resolved by any prior artifact and is flagged explicitly as a Rule 8 technical question (§36, item 1), not silently decided here.

**FR-20.** Contagem entry must accept either a single selling-unit price applied uniformly, or multiple independently-entered selling-unit prices applied per physical portion, without forcing a choice the Owner has not made.
**FR-21.** Neither mode may alter how a physical quantity or its entered unit label is stored or displayed — internal conversion exists solely for the valuation calculation.

**[Amendment, §42] Cost-basis preservation across portions — deterministic, always-on, never Owner-configurable.** A product's cost has exactly one original purchase unit and price (its most recent `StockBatch.costPrice`, in that batch's own purchase unit). Selling price is legitimately Owner-discretionary (Mode A/B above, completely untouched by this addition). Cost has no such discretion — it is a fact to compute, not a preference to set. When a Contagem portion's unit differs from the product's original purchase unit, and a valid, confirmed `unitRelationship` exists covering that unit, the system **automatically and unconditionally** computes that portion's cost price via the existing `getConversionFactor` engine (unmodified, reused exactly as Mode A already reuses it for selling price) — never as an Owner-facing toggle, never opt-in per product, never requiring manual entry, and never silently defaulting to zero. **The one narrow exception, mirroring `getConversionFactor`'s own existing, unmodified null-handling contract exactly:** when no valid/confirmed `unitRelationship` exists, or a portion's unit is outside the confirmed chain, `getConversionFactor` already returns `null` rather than fabricating a factor — in that specific case only, the Owner enters the cost manually, exactly as today.

**FR-67 [new, deterministic, §42].** For a multi-portion Contagem entry where a portion's unit differs from the product's most recent purchase unit, and a valid, confirmed `unitRelationship` exists covering that unit, the system MUST automatically and deterministically compute that portion's cost price via the existing unit-relationship conversion engine — never as an optional or Owner-configurable behavior, never requiring manual entry in this case, and never silently defaulting to zero. Manual cost entry is permitted only in the single case `getConversionFactor` itself already treats as unconvertible.
**FR-22.** +Stock's existing single-selling-unit-per-batch data model and entry flow must remain entirely unmodified by this capability.

## 16. Cost Price Preservation

**(A) Reuses existing behavior unchanged; restates it for this Specification's own completeness.**

Cost remains associated with the purchase/unit context exactly as entered (e.g. `2050 MZN/cx`), never silently rewritten into a converted per-smallest-unit figure for display, even where internal conversion occurs for calculation (source BDR Decision 6; POL-0010 CON-3, SYS-7).

**FR-23.** No Contagem entry or valuation calculation may overwrite an Owner-entered cost/selling price's unit label with a converted equivalent anywhere in stored data or default display.

## 17. Embedded Profit Interaction

**(A) Reuses the existing, unmodified `02-business-worth-engine.md` formula.**

`embeddedProfit = marketValue − investmentValue`, computed per-batch, unchanged (source BDR restates this as Embedded Profit's fixed meaning, §2). This Specification does not redefine it. Its interaction with the new model is purely as an *input*: Business Worth Snapshot content (§8) and Estimated Business Worth (§9) both consume the existing `calculateBatch`/`calculateInventoryTotals` output directly, never recomputing profit independently — matching `02-business-worth-engine.md`'s own Functional Requirement #5 ("zero external dependencies... every other module depends on it").

Embedded profit must never be double-counted on top of a measured valuation where doing so would count the same economic value twice (source BDR Decision 5; POL-0010 BW-4) — concretely, a `BusinessWorthSnapshot`'s `productValuationTotal` and `embeddedProfitTotal` fields must be additive-safe: `productValuationTotal` is the physical Contagem-measured valuation; `embeddedProfitTotal` is drill-down explanatory detail about that same valuation's composition, never a second addend to `measuredBusinessWorth`.

**FR-24.** `BusinessWorthSnapshot.measuredBusinessWorth` must be derived without adding `embeddedProfitTotal` as a second term on top of `productValuationTotal` — the exact aggregation formula linking the two is a Rule 8 question (§36, item 4), but the non-double-counting constraint itself is fixed here.

## 18. Fecho (Closing) — Baseline-Anchored Reporting Range

**(B) Extends the existing `Closing` record and `isPeriodClosed` guard; does not replace them. [DECIDED — Product Architect review, Decision 8, and the accompanying "Critical Fecho Position Rule," 22 August 2026 — this decision resolves the mechanism the source BDR itself deferred (§6, item 4) and supersedes this section's original "arbitrary Owner-chosen start/end date pair" framing below.]**

**Fecho is not a generic arbitrary-date-range profit report.** **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41 — cross-reference only; Fecho's own behavior below is unchanged]** Fecho continues to report its figure as Estimated Business Worth, per §9's own naming convention for a read evaluated as of a specific chosen date rather than "right now" — this is the same formula §7 now also calls Current Business Worth when read live/today; Fecho's own terminology and behavior are not altered by this amendment. Fecho's range always **starts at the latest applicable confirmed Contagem / Current Business Worth baseline** (a `BusinessWorthSnapshot.confirmedAt`, of either `establishmentMethod` — §42 Decision 11) and **runs forward to an Owner-selected end date**. **[Corrected, §42, Correction 4]** A business still in State 1a §6 (historical Capital Inicial only, no `BusinessWorthSnapshot` yet) has no Fecho baseline at all — see FR-25 as corrected, below. The Owner controls the end date; the start date is never independently owner-chosen — it is always the active baseline, consistent with §9's "exactly one baseline, the latest, is ever active" rule. Worked example, exactly as decided: last Contagem `01 May 2026`; Owner opens Fecho on `25 May 2026`; Fecho covers `01 May 2026 → 25 May 2026`.

This does not narrow the source BDR's own business requirement (Decision 24: "a flexible/custom owner-chosen date range... not only calendar month or year") — the Owner is still never restricted to a calendar month or year, and still freely chooses the end date. It fixes, at the Specification level, exactly which of the two boundaries the Owner is free to choose, per the source BDR's own explicit deferral of the arbitrary-range *mechanism* to this stage (§6, item 4; POL-0010 §19).

**Critical Fecho Position Rule — no re-filtering of Estimated Business Worth.** Because Fecho's start is always the active baseline, Fecho's reported Estimated Business Worth is never a separately re-filtered calculation bounded only by the Fecho window — it is the **exact same** §9 calculation (Case A or Case B, whichever applies), evaluated as of the selected end date, using the same "since the active baseline" scope §9 already defines. Concretely, per the decided example: a Contagem on `01 May` sets Current Business Worth to `500,000`; stock added immediately afterward, on `01 May`, must be reflected in Estimated Business Worth when the Owner opens Fecho on `25 May` — it must never disappear because the Owner is viewing Fecho later, and it must never be excluded on the theory that it falls "before" some separate Fecho-specific window start, since Fecho's own start already equals the baseline by construction (§9's own scope and Fecho's start are the same date, always).

Per the investigation (§1, item 9): `Closing` already stores free-form `startDate`/`endDate` fields, and `isPeriodClosed` already guards on the exact `periodType`+`startDate`+`endDate` triple. This Specification proposes a new `periodType` value (e.g. `'custom'`) alongside the existing `'monthly'`/`'yearly'` values, with `startDate` populated from the active baseline's own date (not owner-entered) and `endDate` owner-chosen, reusing the existing double-close guard unmodified. The exact enum value and any additional guard nuance are a Rule 8 question (§36, item 5).

**Arbitrary historical sub-range profit analysis is explicitly not a Fecho behavior.** A request such as "how much profit did I make specifically from 08 May 2026 → 18 May 2026," where neither boundary is the active baseline, is a different reporting requirement, not served by Fecho. Per the investigation (§1, §2): `02-business-worth-engine.md`'s own Users table already documents that **the existing Reports module (spec #12)** reads "the same figures, filtered to a date range via `generateReportSummary`" — this existing, already-approved capability is the appropriate home for arbitrary historical period-profit analysis. No new reporting module is introduced by this Specification to serve that need; whether `generateReportSummary`'s existing filtering needs any Business-Worth-Evolution-specific extension is a Rule 8 question (§36, item 10), not a gap this Specification treats as unserved today.

Fecho must report, for the selected period: (1) embedded profits, (2) Levantamentos, (3) expenses, (4) breakages, (5) Estimated Business Worth as of the selected end date (source BDR Decision 24; POL-0010 FEC-1). Levantamentos remain visible as activity, clearly marked as money removed from the business, never an ordinary operating expense (FEC-3). No other change to Fecho's existing structural role — freezing a period, the existing double-close guard — is authorized (FEC-4).

**FR-25 [Corrected, §42].** ~~Fecho must accept an Owner-chosen **end** date; its **start** date must always be the active baseline's own date (the latest `BusinessWorthSnapshot.confirmedAt`, or the historical Capital Inicial baseline date for a State-1a business) — never an independently owner-chosen start.~~ **[Corrected, §42]** Fecho's start date is resolved exclusively from the `confirmedAt` of the latest active `BusinessWorthSnapshot` — of either `establishmentMethod` (§42 Decision 11) — never from Capital Inicial's date under any circumstance. When no `BusinessWorthSnapshot` exists yet — regardless of whether the business has a preserved historical Capital Inicial — Business Worth has not yet been established, and Fecho has no baseline to use. Custom-period Fecho is unavailable in this state. The Owner sees an explicit message directing them to either establishment method: "Estabeleça primeiro o Valor do Negócio através de uma Contagem ou de um Valor de Negócio Declarado para utilizar o Fecho." This is an explicitly accepted behavior change: a business that previously relied on the Capital-Inicial fallback for custom-period Fecho will see it become unavailable until it performs a genuine establishment event.
**FR-26.** The existing double-close guard must continue to prevent closing the exact same period twice, for the new `periodType` exactly as it already does for `monthly`/`yearly`.
**FR-27.** No existing `Closing` behavior (freezing `businessWorthAtClose` from the live all-time figures at close time, per `02-business-worth-engine.md`) is altered by this Specification.
**FR-53 [DECIDED — Product Architect review, 22 August 2026].** Fecho's reported Estimated Business Worth must be computed via the exact same §9 formula and scope as any other Estimated Business Worth read for that business — never a separate calculation re-filtered to a narrower window than "since the active baseline."
**FR-54 [DECIDED — Product Architect review, 22 August 2026].** A request for profit analysis over a date range not anchored to the active baseline must be served by the existing Reports module (spec #12), never fabricated as a new Fecho behavior or a new reporting module.
**FR-68 [new, §42].** `ProductReportDetail` must expose a `batchContributions` array reusing the existing per-batch `calculateBatch` computation already performed inside `generateReportSummary`'s own loop, without altering that function's existing aggregate output fields. See §42's Batch-Level Profit Attribution amendment for full detail.

## 19. Levantamentos

**(A) Reuses `09-withdrawals.md` unchanged.**

Levantamentos reduce the business's position because the money leaves; remain visible in business activity and in Fecho; are never an ordinary operating expense; must never be double-counted (source BDR Decision 19; POL-0010 LEV-1). No schema or behavior change to `09-withdrawals.md` is introduced. Estimated Business Worth (§9) and Business Worth Snapshot content (§8) both consume existing `Withdrawal` records by reference.

**FR-28.** No `Withdrawal` record's existing schema, category, or valuation basis is modified by this Specification.

## 20. Quebras (Breakages)

**(A) Reuses `07-breakages.md` unchanged.**

The existing Quebra mechanism and valuation basis (`quebraValue = quantityLost × costPrice`, reducing Investment Value and Market Value simultaneously) are unchanged (source BDR Decision 18; POL-0010 QUE-1). Business Worth Snapshot content and Estimated Business Worth both consume existing `Quebra` records by reference, exactly as Embedded Profit's own existing calculation already does.

**FR-29.** No `Quebra` record's existing schema, valuation formula, or Business-Worth-Engine interaction is modified by this Specification.

## 21. Expenses

**(A) Reuses `08-expenses.md` unchanged.**

The existing Expense system and categories are preserved (source BDR Decision 17; POL-0010 EXP-1). Startup-phase spending may also contribute to Startup Investment reporting (§13) by reference, without duplicating the underlying `Expense` record (EXP-2).

**FR-30.** No `Expense` record's existing schema or category taxonomy is modified by this Specification.

## 22. Contagem Reconciliation Signal

**(C) New behavior, layered on top of existing Contagem entry.**

Contagem compares system-recorded financial reality (the Cash Ledger balance, §10) against physically counted reality entered during the count. The difference — e.g. system cash `120,000` vs. physical cash `115,000`, a `-5,000` difference — is a **reconciliation signal**: visible, explainable, and never automatically classified as theft, expense, loss, or Quebra (source BDR Decisions 11, 22; POL-0010 CON-8, FIN-2, OWN-5). The same reconciliation-signal treatment applies to Estimated-vs-Measured Business Worth at the moment a new Contagem is confirmed (§8's `difference` field; source BDR Decision 22; POL-0010 BW-6). The system helps the Owner investigate rather than asserting a conclusion — this Specification does not introduce any automated cause-classification logic.

**Measured value is never replaced by the estimate [DECIDED — Product Architect review, Decision 9, 22 August 2026].** Worked example, exactly as decided: Previous Current Business Worth `500,000`; Fecho's Estimated Business Worth immediately before the new Contagem, `525,000`; new Contagem's measured value, `518,000`. **Current Business Worth becomes `518,000`** — the measured figure — because that is what is actually present; the estimate is never substituted for, or blended with, the measurement. The `-7,000` difference (`518,000 − 525,000`) is preserved separately, on the new `BusinessWorthSnapshot`, as a reconciliation signal (§8's `difference` field), never used to adjust `measuredBusinessWorth` itself. **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]** This worked example's own numbers and outcome are unchanged. What changes is only a naming nuance the amendment surfaces: outside of Fecho, that same `525,000` figure — the live computation immediately before the new Contagem — is now called Current Business Worth (§7), not Estimated, since a prior `BusinessWorthSnapshot` already existed for it to be computed from. Fecho's own reading of it keeps the "Estimated" label per §9/§18's own convention (a read as of a chosen date, not "right now"). §8's own `estimatedBusinessWorthImmediatelyBefore` field name is not renamed by this amendment (§15's own instruction not to redesign the data model here) — see §36's new item for this exact naming question, carried forward rather than silently resolved.

**Possible-cause guidance — required product behavior, evidence-bound [DECIDED — Product Architect review, Decision 9, "Preventive Discrepancy Guidance," 22 August 2026].** When a discrepancy occurs (a cash reconciliation difference, §10, or an Estimated-vs-Measured difference, above), the system must:

1. Clearly display the Estimated figure, the Measured figure, and the Difference, side by side.
2. Preserve the Difference as a reconciliation signal (already required above).
3. Suggest **possible** causes to investigate, drawn only from areas the available records can actually support evidence for — at minimum: unrecorded expenses; stock not properly recorded; an incorrect stock count; unrecorded breakage; an unrecorded Levantamento; supplier/payment records not updated; receivables requiring follow-up; staff/stock-control issues; other evidence-supported operational gaps the specific business's own records indicate.

**These are possibilities to investigate, never asserted conclusions.** The system must never state a suspected cause as fact unless the business's own existing records already establish it as fact (e.g. an actually-recorded but unmarked-paid `Payable` is a fact the records establish; "the Owner probably forgot to record an expense" is a guess and must never be phrased as a finding).

**Preventive notifications — extend the existing Notifications module, do not create a new one [DECIDED — Product Architect review, "Preventive Notifications," 22 August 2026].** Per the investigation (§1, item 13): the existing Notifications module already defines exactly the extension point this behavior needs — its Background Worker–driven scheduled/derived-trigger path (`20-notifications.md` Architecture references, §4.8), one of that module's three already-approved notification-creation paths (its own Decision Gate 2), and a `NotificationCategory` enum that has already been extended once before by amendment (`'staff'` was added by the accepted Category Amendment, v1.2) — the same amendment mechanism this capability's own preventive-reminder category would use, rather than inventing a fourth creation path or a parallel notification system. Example reminder content, exactly as decided: *"Last Contagem showed a stock discrepancy. Remember to verify your stock records before the next Contagem."*; *"You have outstanding supplier payments. Remember to update their payment status."*; *"Some receivables remain outstanding. Consider following up with customers."*; *"Last Contagem showed a difference in stock. Make sure stock movements are being recorded correctly."* Every such notification must be **preventive, actionable, evidence-based, and non-accusatory** — never an unsupported accusation or conclusion, matching exactly the possible-cause discipline above. The objective, stated exactly as decided: **measure → identify possible causes → help the Owner prevent recurrence.**

**FR-31.** A cash reconciliation discrepancy must be recorded and displayed as a signed numeric difference with no default classification/label beyond "reconciliation signal."
**FR-32.** No code path may automatically write "theft," "loss," "error," or "Quebra" as the cause of a reconciliation discrepancy — that determination, if ever recorded, is exclusively an Owner-entered fact, never a system inference.
**FR-56 [DECIDED — Product Architect review, 22 August 2026].** When a reconciliation discrepancy exists, the system must present a non-exhaustive, evidence-supported list of possible causes drawn from the business's own existing records, and must never present any single cause as a determined fact unless those records already establish it.
**FR-57 [amended in place, §42].** The system must be able to generate preventive, actionable, evidence-based, non-accusatory reminders referencing a known prior discrepancy or an outstanding operational gap (an unpaid Receivable, an unpaid Payable, a prior stock or cash variance), delivered through the existing Notifications module's Background Worker trigger path and its (extended, per amendment precedent) `NotificationCategory` enum — never through a new, parallel notification system. **[Amendment, §42] Receivable reminder cadence:** the existing `business_worth.receivable.outstanding` notification is extended from one-shot to recurring: while a `Receivable`'s `status` remains `'unpaid'` or `'partially-paid'`, the system re-notifies every 30 days from the date of the last notification for that receivable. A partial payment does not reset this cadence. Notification ceases immediately and permanently once `status` becomes `'paid'`. **FIN-3 (§11) is entirely unaffected** — an unpaid receivable still contributes nothing to Business Worth regardless of reminder frequency. This extended cadence applies to this event type only; the trial/closing/breakage notification producers' own one-shot precedent is unaffected and remains one-shot for their own event types.

## 23. Contagem Autosave

**(A) Reuses the accepted Stock Count Data-Loss Resilience Specification's draft model directly, extended to the Contagem-produces-Business-Worth-Snapshot case.**

Per §1, item 4: the accepted Data-Loss-Resilience Specification already defines the required draft lifecycle (`editing`/`saving`/`saved`/`save-failed`) and the durable-vs-committed distinction for Periodic Contagem generally. This Specification does not redefine that model — it inherits it as the mechanism satisfying source BDR Decision 29 (POL-0010 CON-9, SYS-8): continuous autosave against interruption, refresh, power loss, battery failure, browser/app closure, and connection loss, with autosave never itself constituting confirmation.

**FR-33.** Contagem draft autosave must satisfy the Data-Loss-Resilience Specification's existing Draft Lifecycle State Model and durable-vs-committed distinction without modification to that model's own defined states.
**FR-34.** An autosaved Contagem draft must never be read by any Business Worth calculation (Current, Estimated, or Snapshot) while unconfirmed — mirroring that Specification's existing "never read by any valuation calculation" invariant for the draft record itself.

## 24. Confirmation Safety and Idempotent Finalization

**(A) Reuses the accepted Data-Loss-Resilience Specification's submission-identity idempotency design; (B) extends it to also cover the new `BusinessWorthSnapshot` write.**

The final confirmation action must be deliberately separated/protected from ordinary data entry, and the Owner must be made aware, before confirming, that the action finalizes the current measurement (source BDR Decision 30; POL-0010 CON-10, SYS-9). Finalization — the atomic operation creating the `StockCount` and (where applicable) its `BusinessWorthSnapshot` — must use the same submission-identity idempotency property the Data-Loss-Resilience Specification already requires for periodic `StockCount` finalization (that Specification's §7–§8), extended so that an ambiguous network outcome and retry can never produce two `BusinessWorthSnapshot` documents for the same confirmation, exactly as it already guarantees for the `StockCount` document itself.

**FR-35.** Contagem confirmation must require a deliberate, distinctly separated action, with explicit pre-confirmation messaging that the action finalizes the measurement.
**FR-36.** Confirming a Contagem that produces a `BusinessWorthSnapshot` must write the `StockCount` and the `BusinessWorthSnapshot` as part of one atomic operation — never as two separately-retriable writes that could produce a `StockCount` with no snapshot, or a snapshot with no corresponding `StockCount`.
**FR-37.** A retried finalization attempt against an already-committed submission identity must produce no duplicate `StockCount` and no duplicate `BusinessWorthSnapshot` — extending the Data-Loss-Resilience Specification's own required regression coverage (its §14, item 2) to this Specification's new write.

## 25. Owner 3-Hour Correction Window

**(C) New mechanism, parallel in shape to Void & Redo, not merged with it.**

After Contagem confirmation, the Owner has exactly a 3-hour correction window, measured from the confirmation's own `confirmedAt` timestamp, not reset by later activity (source BDR Decision 31; POL-0010 REC-1). Structurally the same *kind* of mechanism as `BDR-0015`'s Void & Redo (a narrow, bounded exception to immutability), but its own distinct figure and its own distinct mechanism for Contagem-derived Business Worth snapshots — it does not amend Void & Redo's own 12-hour Initial-Stock-specific window (source BDR §9; POL-0010 REC-3).

`BusinessWorthSnapshot.correctionWindowExpiresAt` (§8) is the frozen anchor for this window, computed and written once, at confirmation time, exactly like `confirmedAt` itself — never recomputed, never extended by activity.

**FR-38.** The system must expose, to the Owner, a governed correction path against a `BusinessWorthSnapshot` (and its underlying `StockCount`) available only while `now < correctionWindowExpiresAt`.
**FR-39.** A correction performed within the window must produce a new `BusinessWorthSnapshot` (via `supersedesSnapshotId`, §8) rather than editing the original snapshot's frozen fields.
**I-7.** `correctionWindowExpiresAt`, once written, is never recomputed or extended.

## 26. SuperAdmin-Authorized Recovery (72-Hour Ceiling)

**(C) New mechanism, deliberately shaped after — but not merged with — `BDR-0016`/`POL-0009`'s existing Authorization-artifact pattern for Initial Stock.**

After the Owner's 3-hour window closes, SuperAdmin support may authorize recovery within a 72-hour ceiling from the applicable confirmation/recovery event. SuperAdmin never directly edits the Owner's Contagem or `BusinessWorthSnapshot`. The flow: SuperAdmin authorizes → Owner performs the recovery/edit → Owner confirms (source BDR Decision 32; POL-0010 REC-2). After 72 hours, no SuperAdmin authorization is available through this mechanism.

Per §1, item 6, this Specification proposes reusing the *shape* `POL-0009`'s Authorization artifact already establishes (request → grant → consume-or-expire, one active Authorization per business, SuperAdmin-grants/Owner-consumes-only, non-extendable duration, server-recorded `authorizedAt`) — as a **separate, parallel collection**, e.g. `businesses/{businessId}/businessWorthRecoveryAuthorizations/{id}`, structurally analogous to but never merged with the existing Initial-Stock-specific Authorization collection `POL-0009`'s Specification defines. This mirrors the existing `BDR-0016`/`POL-0009` mechanism's discipline without amending its own governed figures (48-hour duration, Initial-Stock-only scope) in any way (source BDR §5, item 6; POL-0010 REC-3, §18 item 5).

**Previously-open question, now resolved [DECIDED — Product Architect review, Decision 2, 22 August 2026]:** the very first confirmed Contagem is, per source BDR Decision 1, the *same event* as today's `initial` Stock Count confirmation — raising the question of which recovery mechanism governs it, since the existing Initial-Stock-specific Void & Redo (12-hour Owner window / up to 4 confirmations via a 48-hour SuperAdmin-authorized path) and this Specification's own mechanism (3-hour Owner window / 72-hour SuperAdmin ceiling) could otherwise both appear to apply. **This is now resolved by an exclusivity rule keyed to §14's `producesBusinessWorthSnapshot` marker, not by merging the two mechanisms:**

- **Every `StockCount` with `producesBusinessWorthSnapshot: true`** (every new-model Contagem, including a genuinely new business's founding confirmation) **uses this Specification's 3-hour/72-hour mechanism exclusively.** It is never additionally eligible for `POL-0008`'s Void & Redo.
- **Every `StockCount` without that marker** (every legacy, pre-capability Initial Stock confirmation) **continues to be governed exactly as before, exclusively by `POL-0008`/`POL-0009`'s existing Void & Redo mechanism**, with every one of its own figures (12-hour window, 3-recovery-cycle/4-confirmation ceiling, 48-hour SuperAdmin authorization duration) entirely unchanged.
- **A `StockCount` is never subject to both mechanisms at once** — the marker is the single, unambiguous partition. This is a Specification-level scoping decision about which population of confirmations enters which already-approved recovery path; it does not edit a single rule, figure, or field within `POL-0008` or `POL-0009` themselves, so it does not "amend" either in the sense `POL-0010` REC-3 forbids — it decides routing, not content, consistent with the Product Architect's own explicit instruction not to silently merge the two mechanisms.

This was previously listed as a genuine open question (this document's prior draft, §36 item 7 in that draft's numbering); it is resolved as of this review and is no longer listed among this Specification's remaining open items (§36).

**No correction/recovery-cycle ceiling is decided for this mechanism — explicitly not invented here [governance review, 22 August 2026].** `POL-0008`'s Void & Redo has an explicit, decided ceiling for Initial Stock (3 recovery cycles / 4 confirmation events, Rule J). **No equivalent ceiling has been decided by the Product Architect for this Specification's own 3-hour Owner window / 72-hour SuperAdmin ceiling mechanism** — the source BDR (Decisions 31–32) and POL-0010 (REC-1/REC-2) fix the two time windows only and do not address how many correction/recovery cycles a single Contagem-derived `BusinessWorthSnapshot` line may go through. This Specification does not invent a number for it, and does not copy `POL-0008`'s 3-cycle/4-confirmation figure onto this different mechanism.

**RESOLVED — Rule 8 Assessment, 22 August 2026 amendment.** The Rule 8 Assessment (`docs/engineering/business-worth-evolution-rule8-assessment.md`, Finding 4-B) raised this exact question and returned it to the Product Architect for decision, per its own "no silent resolution" discipline. The Product Architect decided: *"NO additional numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin authorization are the governing limits."* No new figure is introduced here or anywhere else in this Specification; the two already-approved windows (§25, §26) remain the sole governing limits. This decision is recorded verbatim, and traced, in §30b, below — this paragraph is not itself the decision record, only a pointer to it, consistent with how this Specification records every other decision it did not itself make.

**FR-40.** SuperAdmin must be able to request a Business-Worth-specific recovery Authorization for one named, current `BusinessWorthSnapshot`/`StockCount`, with a recorded, non-empty justification, mirroring `POL-0009`'s FR-1/Rule V.
**FR-41.** At most one unconsumed, unexpired Business-Worth-specific Authorization may exist per business at a time, mirroring `POL-0009`'s Rule T/Invariant I-4.
**FR-42.** SuperAdmin's write surface under this capability must never include a write to any `StockCount` or `BusinessWorthSnapshot` field — only to the Authorization artifact itself, mirroring `POL-0009`'s Rule N/Invariant I-7.
**FR-43.** This mechanism must never write to, read the eligibility state of, or otherwise interact with the existing `POL-0009` Initial-Stock Authorization collection — the two remain structurally and operationally separate, per REC-3.
**FR-58 [DECIDED — Product Architect review, 22 August 2026].** Recovery eligibility for any `StockCount` must be determined exclusively by its own `producesBusinessWorthSnapshot` marker: `true` routes exclusively to this Specification's §25–§26 mechanism; absent/`false` routes exclusively to `POL-0008`/`POL-0009`'s existing Void & Redo mechanism, with that mechanism's own figures unchanged. No `StockCount` may be eligible for both paths at once.

## 27. Immutability

**(B) Extends the existing "truly immutable, no exceptions" tier's established shape (`initial` Stock Count, Closing) to `BusinessWorthSnapshot`, with the same narrow, bounded correction-window exception Void & Redo already established as precedent.**

Outside the §25/§26 windows, a `BusinessWorthSnapshot` and its finalized historical Contagem data are viewable, drillable, immutable, and non-deletable through ordinary UI (source BDR Decision 33; POL-0010 SYS-10, REC-4). Recovery is a controlled, time-boxed exception — never general editing authority, matching exactly the framing `BDR-0015` §3 already established for Void & Redo ("a narrow, bounded exception... not a precedent for 'immutable, except when...'"). This Specification does not authorize any administrative edit path to a `BusinessWorthSnapshot`'s frozen fields beyond §25/§26's own governed, time-boxed corrections. **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]** Current Business Worth (§7) evolving live, on demand, as governed activity occurs, never triggers, requires, or performs any write to a `BusinessWorthSnapshot`'s frozen fields — it is a read computed *from* the snapshot, never a process that updates it. This immutability guarantee is entirely unaffected by the §7 amendment.

**FR-44.** No role, including Owner and SuperAdmin, may directly `update` a `BusinessWorthSnapshot`'s frozen fields (§8) outside an active §25/§26 window — enforced at the Security Rules layer at implementation time, not merely by UI omission, matching the explicit lesson `10-stock-counts.md`'s own finding already names for the `initial` count (UI-only restriction is not sufficient).

## 28. Traceability Matrix — Source BDR Decision → POL-0010 Rule → Specification Section → FR/AC

| BDR Decision | POL-0010 Rule(s) | Spec Section(s) | FR(s) |
|---|---|---|---|
| 1 (When Business Worth exists) | BW-1, CON-2, OWN-1, SYS-1 | §6, §7 | FR-1, FR-2 |
| 2 (Contagem means measurement) | CON-1 | §14 | FR-18, FR-19 |
| 3 (Current Business Worth) | BW-2, DASH-1 | §7, §32 | FR-3, FR-4 |
| 4 (Business Worth history) | BW-3 | §8 | FR-5, FR-6, FR-7 |
| 5 (Snapshot content) | BW-4 | §8, §17 | FR-5, FR-24 |
| 6 (Product entry / unit preservation) | CON-3, SYS-7 | §16 | FR-23 |
| 7 (Selling-price flexibility) | CON-4, OWN-3 | §15 | FR-20 |
| 8 (+Stock boundary) | CON-5 | §15 | FR-22 |
| 9 (Cost/price memory) | CON-6, OWN-2, SYS-2 | §15 | FR-20 |
| 10 (Contagem boundary) | CON-7, OWN-2 | §15 | FR-20 |
| 11 (Contagem reconciliation) | CON-8, FIN-2, OWN-5 | §10, §22 | FR-31, FR-32, FR-55, FR-56, FR-57 |
| 12 (Cash) | FIN-1, SYS-3 | §10 | FR-10, FR-55 |
| 13 (Receivables) | FIN-3, SYS-4 | §11 | FR-12, FR-13 |
| 14 (Supplier obligations) | FIN-4, SYS-5 | §12 | FR-14, FR-15 |
| 15 (Supplier credit purchases) | FIN-5, SYS-6 | §9, §12 | FR-9, FR-14 |
| 16 (Cash-financed purchases) | FIN-6, SYS-6 | §9 | FR-9 |
| 17 (Expenses) | EXP-1, EXP-2 | §13, §21 | FR-16, FR-30 |
| 18 (Quebras) | QUE-1 | §20 | FR-29 |
| 19 (Levantamentos) | LEV-1, FEC-3 | §19 | FR-28 |
| 20 (Startup Investment) | SI-1, SI-2, SI-3 | §13 | FR-16, FR-17, FR-52 |
| 21 (Estimated Business Worth) | BW-5 | §9 | FR-8, FR-9, FR-50, FR-51 |
| 22 (Business Worth reconciliation) | BW-6, OWN-5 | §8, §22 | FR-31, FR-32, FR-56, FR-57 |
| 23 (New Contagem resets the estimate) | BW-2, BW-7 | §6, §7, §9 | FR-1, FR-51 |
| 24 (Fecho) | FEC-1, FEC-2, FEC-4 | §18 | FR-25, FR-26, FR-27, FR-53, FR-54 |
| 25 (Historical Capital Inicial) | HIST-1, HIST-2, HIST-3, SYS-11 | §6, §9, §31 | FR-45, FR-46, FR-50 |
| 26 (Historical data / transition) | HIST-4, SYS-11 | §31 | FR-45, FR-46 |
| 27 (Dashboard) | DASH-1 | §32 | FR-4, FR-47, FR-59 |
| 28 (Business Worth history UI) | BW-3, DASH-1 | §8, §32 | FR-7, FR-47 |
| 29 (Contagem autosave) | CON-9, SYS-8 | §23 | FR-33, FR-34 |
| 30 (Confirmation safety) | CON-10, SYS-9 | §24 | FR-35, FR-36 |
| 31 (Owner 3-hour window) | REC-1, OWN-4 | §25 | FR-38, FR-39 |
| 32 (SuperAdmin recovery) | REC-2, OWN-4 | §26 | FR-40, FR-41, FR-42, FR-43, FR-58 |
| 33 (Immutability) | REC-4, SYS-10 | §27 | FR-44 |
| 34 (Architecture override) | ARCH-1, ARCH-2, FIN-7 | §3, §10–§12 | (scope boundary, all of §10–§12) |
| 35 (One umbrella governance model) | CPR-5 | This document's own existence as one Specification | — |

Every one of the 35 source-BDR decisions is represented above; none is missing.

**[Added by the §41 amendment draft, PENDING Product Architect acceptance]** The pending §41 amendment changes the wording of §6, §7, §9, §18, §22, §27, §29, §32, and §36, but changes no row of this table — every FR the amendment touches (FR-3, FR-8, FR-51) keeps its own number and its own BDR/POL-0010/section mapping exactly as listed above; only what those FRs *say* changed, not which BDR decision they trace to.

## 29. Acceptance Criteria

1. A business with no confirmed new-model Contagem never has a Current/Measured Business Worth — but an existing business with a preserved historical Capital Inicial may still have an Estimated Business Worth before its first new-model Contagem (State 1a, §6; FR-1, FR-50).
2. A confirmed Contagem under this model produces exactly one new, dated, immutable `BusinessWorthSnapshot`, atomically with its `StockCount` (FR-5, FR-36, FR-37).
3. Every snapshot exposes the twelve required content items (§8), drillable to product/batch detail, without double-counting Embedded Profit (FR-24).
4. Contagem preserves physical quantities and entered unit-labeled prices exactly, supports both selling-price modes, supplies cost/price memory, and never forces +Stock into a multi-unit model (FR-20 through FR-23).
5. Cash is a complete, append-only ledger, reconcilable — never overwritten — against a physical Contagem count (FR-10, FR-11, I-4).
6. A Receivable never counts toward Business Worth until paid; partial payment is supported (FR-12, FR-13, I-5).
7. A Payable's lifecycle is fully tracked without double-counting a payment against the same liability (FR-14, FR-15, I-6).
8. A stock purchase — cash- or credit-financed — never counts as new Business Worth beyond its own embedded profit (FR-9, FR-14).
9. Estimated Business Worth follows exactly the §9 formula, with no double-counted purchase cost, no double-subtracted payment, and no unpaid receivable counted (FR-8, FR-9) — **[amendment, §41]** and, since §7's Current Business Worth is the same formula's output once a `BusinessWorthSnapshot` exists, this criterion applies identically there.
10. Existing Expense/Quebra systems are unmodified and correctly consumed by reference (FR-28 through FR-30).
11. Levantamentos remain visible in Fecho, marked as removed money, never treated as an expense (FR-28).
12. Startup Investment never duplicates an existing +Stock/Expense transaction (FR-16, FR-17).
13. Fecho's start is always the active baseline (latest `BusinessWorthSnapshot` or historical Capital Inicial), its end is Owner-chosen, and it reports exactly the five required lines, with the existing double-close guard intact (FR-25 through FR-27).
14. No existing business's historical Capital Inicial is altered, and no historical Contagem is retroactively reinterpreted as containing data it never recorded (FR-45, FR-46).
15. The Dashboard is not restructured; the Business Worth card opens a drillable history including the current record (FR-4, FR-7, FR-47).
16. Contagem autosaves continuously; a draft never becomes a snapshot without deliberate, protected confirmation (FR-33 through FR-36).
17. The Owner has exactly a 3-hour correction window, not reset by activity; SuperAdmin may authorize recovery only within a 72-hour ceiling thereafter, via an Owner-executed flow; neither mechanism amends `POL-0008`/`POL-0009`'s own Initial-Stock-specific figures (FR-38 through FR-43).
18. A finalized `BusinessWorthSnapshot`, outside its windows, is viewable/drillable forever and never directly editable (FR-44).
19. No cash/receivable/payable capability extends into POS, invoicing, checkout, payroll, full accounting, ERP, or general customer transaction management (§3, scope boundary).
20. No technical schema, algorithm, or UI decision in this Specification silently contradicts any DECIDED source-BDR/POL-0010 rule (§30, Governance Conflict Check).
21. A new-model Contagem requires the Owner to record/confirm the actual cash position as of that date; no historical cash is ever reconstructed or fabricated for a period before the Cash Ledger existed (FR-11, FR-55).
22. An existing business with a preserved historical Capital Inicial shows Estimated Business Worth immediately, without needing a new Contagem first, using §9 Case B (FR-8, FR-50, FR-45).
23. The instant a new `BusinessWorthSnapshot` is created, every subsequent Current/Estimated Business Worth calculation uses only that snapshot as its baseline — never continuing to accumulate from any earlier baseline (FR-51) — **[amendment, §41]** "Current" and "Estimated" both name reads of the same formula (§9's amendment note); the baseline-reset rule was, and remains, one rule for both.
24. Fecho's reported Estimated Business Worth is computed via the exact same §9 formula/scope as any other read of it — never re-filtered to a narrower window than "since the active baseline" — and an arbitrary sub-range profit request routes to the existing Reports module, not to a new Fecho behavior (FR-53, FR-54).
25. A reconciliation discrepancy always surfaces a non-exhaustive, evidence-supported list of possible causes, and never states a cause as fact unless the business's own records establish it (FR-56).
26. The system can generate preventive, actionable, evidence-based, non-accusatory reminders for a known discrepancy or outstanding operational gap, delivered through the existing Notifications module's Background Worker path (FR-57).
27. Recovery eligibility for any `StockCount` is determined exclusively by its own `producesBusinessWorthSnapshot` marker — routed to exactly one of §25–§26's mechanism or `POL-0008`/`POL-0009`'s Void & Redo, never both (FR-58).
28. Startup Investment and Business Worth are never netted into a single "shortfall" or "performance" figure, regardless of how large the difference between them is (FR-52).
29. For a State-1a business (§6) with no `BusinessWorthSnapshot` yet, the Dashboard's existing Business Worth card shows Estimated Business Worth, visibly distinguished from Current Business Worth, and never presents the Estimated figure as measured (FR-59).
30. The Rule 8 Assessment's own verdict (READY FOR IMPLEMENTATION) and its two Rule-8-resolved Product Architect decisions are accurately reflected in this Specification's §26, §30, §30b, and §36, with no other content silently altered (§30b).
31. Owner Portfolio's `currentWorth` never diverges from the same Current/Estimated Business Worth value the Dashboard reads for the same business (FR-60).

## 30. Governance Conflict Check

Per the task's own instruction, every existing artifact this capability touches is classified below. **No item is silently classified "requires governance clarification" (D) at the business-decision level** — every touchpoint below is already resolved by an explicit BDR/POL-0010 decision, or — for the two items the 22 August 2026 Product Architect review resolved — by that review directly; where a genuine *technical* (not business) open question remains, it is listed separately in §36, not hidden inside this table.

| Existing artifact | Classification | Basis |
|---|---|---|
| `02-business-worth-engine.md` | **C — Extended** | Formula/code unchanged; business relationship (Capital Inicial's role transfers to Current Business Worth) is new (source BDR §5 item 2; POL-0010 §18 item 2). Its `generateReportSummary`, already consumed by Reports (spec #12), is now also the identified home for arbitrary sub-range profit analysis Fecho itself does not serve (§18). |
| `10-stock-counts.md` | **C — Extended** | Contagem's role expands prospectively for new-model confirmations, now via the decided `producesBusinessWorthSnapshot` marker (§14, Decision 1); every historical Contagem's comparison-only role is untouched (source BDR §5 item 1; POL-0010 §18 item 1). |
| `01-dashboard.md` | **C — Extended** | Conceptual transfer only, no redesign (source BDR §5 item 3; POL-0010 DASH-1, §18 item 3). |
| `11-monthly-closings.md` | **C — Extended** | New `periodType` value added, with `startDate` now decided as baseline-anchored rather than owner-chosen (§18, Decision 8); existing double-close guard and free-form dates reused unmodified (source BDR §5 item 4; POL-0010 §18 item 4). |
| `12-reports.md` | **C — Extended** | Identified, not modified, as the existing home for arbitrary historical sub-range profit analysis that Fecho itself explicitly does not serve (§18, Decision 8); whether its existing filtering needs any extension is a Rule 8 question (§36 item 10), not a new module. |
| `20-notifications.md` | **C — Extended** | Its existing Background Worker trigger path and `NotificationCategory` enum (already amended once, for `'staff'`) are the identified integration point for preventive discrepancy reminders (§22); no new notification system is introduced. |
| `BDR-0012` / Product Unit-of-Measure Specification | **A — Preserved**, with one **C** sub-item | Product Memory mechanics untouched; Mode B's interaction with the existing `units[0]`-reference convention is a genuine Rule 8 gap (§15, §36 item 1), not a conflict with the decided business rule. |
| `BDR-0014` / its two companion amendments | **A — Preserved** | Dual-valuation-basis mechanics entirely unamended; CON-3/CON-4 restate, do not re-decide (POL-0010 §18 item 6). |
| `BDR-0015`/`POL-0008` (Void & Redo) | **A — Preserved** | 12-hour window, 3-cycle/4-confirmation ceiling entirely unamended; REC-1/REC-2 are a distinct, parallel mechanism (POL-0010 REC-3, §18 item 5). The previously-flagged technical edge case at their intersection is now resolved by an explicit, marker-keyed exclusivity rule (§26, Decision 2) — a routing decision, not an amendment to either document's own content. |
| `BDR-0016`/`POL-0009` (SuperAdmin-Assisted Recovery) | **A — Preserved** | 48-hour authorization duration, single-active-Authorization, current-confirmation-only constraints entirely unamended; §26's mechanism is structurally parallel, never merged (FR-43). |
| `08-expenses.md`, `07-breakages.md`, `09-withdrawals.md` | **A — Preserved** | Consumed exactly as already governed, no schema/behavior change (EXP-1, QUE-1, LEV-1). |
| `04-purchase-batches.md` / Reusable Suppliers Amendment | **C — Extended** | New `Payable` record layered on top, referencing existing `PurchaseBatch`/`Supplier` without altering either; confirmed no prior payable model existed to conflict with (§1 item 8). |
| Architecture §2.4/§2.10/§7.6 (Data Integrity, Historical Integrity, immutability tiers) | **A — Preserved** | `BusinessWorthSnapshot` enters the same immutability discipline these principles already establish, with the same narrow correction-window exception shape Void & Redo already set as precedent (§27). |
| `17-owner-portfolio.md` (Owner Portfolio) | **C — Extended** | Not named in this Specification's own original investigation or dependency list — surfaced only by the Rule 8 Assessment's direct code inspection (`AppContext.tsx`'s existing `currentWorth` cache). Resolved by explicit Product Architect decision, §30b below: Owner Portfolio's `currentWorth` consumes this Specification's authoritative Current/Estimated Business Worth rather than maintaining an independent figure. |

No true, unresolved *business-level* governance conflict was found. Every technical-level open question is enumerated in §36, following this repository's own established precedent (the accepted SuperAdmin-Assisted Initial Stock Recovery Specification's §16) of naming such questions explicitly rather than inventing an answer or silently omitting them.

### 30a. Product Architect Decisions (22 August 2026) — Traceability

Per the review's own explicit requirement, each of the ten decisions is traced below: Decision → source BDR decision(s) → POL-0010 rule(s) → Specification section(s) → Acceptance Criterion. **No new BDR decision and no new Policy decision is created by this table or by any of the ten decisions** — every one operationalizes a mechanism the source BDR and POL-0010 already deferred to this stage (§6/§19 of those two documents, respectively), exactly as the review's own instruction required.

| Product Architect Decision | Source BDR Decision(s) | POL-0010 Rule(s) | Spec Section(s) | Acceptance Criterion |
|---|---|---|---|---|
| 1 — New-model Contagem marker | 1 ("logical consequence"), 25–26 (§6 item 2) | CON-2, HIST-4 | §14 | AC 1, 2 |
| 2 — New-model Contagem recovery exclusivity | 31–32, §5 item 6 | REC-1, REC-2, REC-3 | §25, §26 | AC 17, 27 |
| 3 — Cash at Contagem | 11, 12 | FIN-1, FIN-2, CON-8, SYS-11 | §10, §22 | AC 5, 21 |
| 4 — Receivables | 13 | FIN-3, SYS-4 | §11 | AC 6 |
| 5 — Supplier obligations/Payables | 14, 15 | FIN-4, FIN-5, SYS-5, SYS-6 | §12 | AC 7 |
| 6 — Startup Investment | 20 | SI-1, SI-2, SI-3 | §13 | AC 12 |
| 7 — New-Contagem baseline reset + existing-business transition | 21, 23, 25, 26 | BW-5, BW-7, HIST-2 | §9, §31 | AC 9, 22, 23 |
| 8 — Fecho (baseline-anchored, not arbitrary-start) | 24, §6 item 4 | FEC-1, FEC-2, FEC-4 | §18 | AC 13, 24 |
| 9 — Measured vs. Estimated, possible-cause guidance, preventive notifications | 11, 22 | BW-6, CON-8, FIN-2, OWN-5 | §22 | AC 25, 26 |
| 10 — `BusinessWorthSnapshot` vs. `StockCount` separation | 4, 5, 33 | BW-3, BW-4, SYS-10, REC-4 | §8 | AC 2, 3 |

**[Added by the §41 amendment draft, PENDING Product Architect acceptance]** The pending amendment corrects how §7/§9 describe Decision 7's own baseline-reset formula in words — it does not reopen, weaken, or alter Decision 7 itself (still: exactly one baseline, the latest, is ever active; no accumulation from an earlier one) or any other decision in this table. No row above changes.

### 30b. Rule-8-Resolved Decisions (22 August 2026) — Traceability

Two further Product Architect decisions were made **after** Rule 8 Assessment, resolving the two findings that assessment classified as blockers (`docs/engineering/business-worth-evolution-rule8-assessment.md` §3 Findings 4-B, 15-A; §7 Verdict). **These are traced separately from §30a's ten decisions, not merged into that table, precisely because they were made at a different governance stage** (post-Rule-8, not pre-Rule-8) and neither reopens, alters, or reinterprets any of §30a's ten decisions or any of the 35 source-BDR decisions — each resolves a question those decisions left open, exactly as the ten did for the BDR/POL-0010.

| Product Architect Decision | Resolves | Spec Section(s) | FR(s) | Acceptance Criterion |
|---|---|---|---|---|
| Correction/recovery-cycle ceiling: **"NO additional numerical ceiling. The 3-hour Owner window and 72-hour SuperAdmin authorization are the governing limits."** | Rule 8 Finding 4-B; formerly §36 item 11 (removed) | §26 | — (no new FR; confirms FR-38–FR-43, FR-58 are complete and final as written) | AC 17 |
| Owner Portfolio `currentWorth`: **"Business Worth Evolution is authoritative. Owner Portfolio consumes that value rather than maintaining a competing Business Worth mechanism."** | Rule 8 Finding 15-A — a gap surfaced only by Rule 8's own code investigation, never previously named in the BDR, POL-0010, or this Specification | §7, §30 | FR-60 | AC 31 |

Neither decision is invented, defaulted, or inferred here — both are recorded verbatim from the Rule 8 Assessment's own §3, which itself records them verbatim from the Product Architect. Both remain traceable to that document as their primary source; this table exists so this Specification's own traceability (§28, §30a) is not left silently incomplete by two decisions made after this document's original Acceptance.

## 31. Historical Transition

**(A) Reuses the existing preservation discipline unmodified.**

No existing business's historical Capital Inicial value is deleted, rewritten, or fabricated (source BDR Decision 25; POL-0010 HIST-1). An existing business may use its preserved Capital Inicial as the starting baseline for Estimated Business Worth during transition (§9, Case B), **without needing to perform a new Contagem first** [DECIDED — Product Architect review, "Critical Transition Clarification," 22 August 2026 — see §6 State 1a and §9 for the full rule], until its first Contagem under this model establishes its first `BusinessWorthSnapshot`, at which point §9's Case A baseline-reset rule takes over permanently (HIST-2). A historical, pre-capability Contagem is never reinterpreted as though it contained cash/receivable/payable data it never actually recorded (HIST-3) — consistent with §10's explicit "never attempt to reconstruct historical cash from old data" rule. No destructive migration or backfill is authorized (source BDR Decision 26; POL-0010 HIST-4).

**FR-45.** The Estimated Business Worth calculation (§9, Case B) must, for a business with no `BusinessWorthSnapshot` yet but a historical Capital Inicial value, use that historical value as its starting baseline immediately, without requiring a new Contagem first and without writing a fabricated `BusinessWorthSnapshot` to represent it.
**FR-46.** No migration script, batch job, or manual data operation backfilling `CashLedgerEntry`, `Receivable`, or `Payable` records against historical activity is authorized by this Specification.

## 32. Dashboard

**(A) Reuses the existing structure entirely unmodified; conceptual relabeling only.**

The existing Dashboard's nine-KPI-card structure is not redesigned (source BDR Decision 27; POL-0010 DASH-1). The existing Capital Inicial card's conceptual role transfers to Current Business Worth (§7). **[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]** Per §7's corrected definition, this means the card presents a live figure — the latest `BusinessWorthSnapshot` plus governed activity since — not the frozen snapshot value alone; no card, layout, or component change is required to achieve this, since the card already reads whatever FR-3 defines as Current Business Worth (FR-4) and FR-3 itself is what changed. The existing Business Worth card gains a click-through into the history defined in §8 — current record plus every prior dated record, each drillable, with finalized historical records read-only (source BDR Decision 28; POL-0010 BW-3, DASH-1). No other Dashboard change is authorized. Exactly which existing card element carries which exact new label/behavior is explicitly left to Rule 8/implementation (§36, item 6) — the business rule (no redesign, conceptual transfer, drillable history) is fully fixed here.

**State 1a display — no false Current figure, existing card only [governance review, 22 August 2026].** For a business in State 1a (§6) — a preserved historical Capital Inicial, no `BusinessWorthSnapshot` yet — the same existing Business Worth card must **never** present its Estimated Business Worth (§9 Case B) as though it were a measured Current Business Worth. The existing card presents the Estimated figure, visibly labeled as Estimated, until the business's own first `BusinessWorthSnapshot` exists, at which point the same card switches to presenting the Current figure exactly as §7 already describes. This is the same single existing card in both states — no new Dashboard card, section, or layout element is introduced for State 1a; only which of the two already-defined figures (Estimated vs. Current) that one card currently reads is state-dependent. The exact copy/visual treatment distinguishing the two states remains a Rule 8/implementation concern (§36, item 6); the business rule — never present Estimated as Current, no redesign — is fixed here.

**FR-59 [governance review, 22 August 2026].** For a business with no `BusinessWorthSnapshot` yet, the Dashboard's existing Business Worth card must read and display Estimated Business Worth (§9 Case B), visibly distinguished from Current Business Worth, and must never present that Estimated figure as a measured Current Business Worth.

**FR-47.** Clicking the Dashboard's existing Business Worth card must open the Business Worth history view (§8's `businessWorthSnapshots` collection, ordered), including the current record.

**[Corrected/extended, §42] Three-surface terminology authorization.** The prior "no redesign" scope is extended to explicitly authorize, across exactly three surfaces and no others: (a) the Dashboard's Business Worth summary modal — replacing its "Initial Capital (starting point)" line item and its stale pre-Cash-Ledger `explanation` text with accurate, current-formula copy; (b) `CapitalGrowthReport.tsx` — correcting its use of `initialCapitalValue` as its timeline's starting-point label; (c) `BusinessWorthReport.tsx` — correcting its `kpiInitialCapital`/`kpiInitialCapitalFull` KPI card. In all three surfaces: before Business Worth establishment (State 1/1a), the displayed term is "Business Worth" (Estimated, where Capital Inicial's historical figure supports an Estimate per State 1a, clearly labeled as Estimated). After establishment (State 3, either method), the displayed term is "Current Business Worth," live per §7. Historical Capital Inicial data is never deleted, migrated, or rewritten (HIST-1, unaffected) — it is relocated, in display only, to an "Initial Investment / capital history" section or label, fully executing BDR Decision 3's original conceptual-transfer intent, which this section's prior text authorized in principle but did not fully specify in practice.

## 33. Security / Authorization

Minimum authorization boundaries, extending the existing `isMemberOf`/`isOwnerOf` tenant-isolation model unmodified:

- **Owner:** full read/write (within the governed windows, §25–§26) over their own business's `BusinessWorthSnapshot`, `CashLedgerEntry`, `Receivable`/`ReceivablePayment`, `Payable`/`PayablePayment`, `StartupInvestmentEntry`, and Contagem drafts/confirmations.
- **SuperAdmin:** may create a Business-Worth-specific recovery Authorization (§26) only; never a direct writer to any of the record types above; never crosses tenant boundaries; cannot bypass the 72-hour recovery-authorization ceiling; recovery-routing eligibility is determined solely by §14's `producesBusinessWorthSnapshot` marker (§26, FR-58) — SuperAdmin has no discretion to route a confirmation to the "wrong" mechanism.
- **Staff:** read/write tier matches the existing Stock Counts precedent (`10-stock-counts.md`: no access at any layer) unless a future Manager-tier decision changes it — this Specification does not introduce a new Staff-access rule beyond what Stock Counts already establishes, since Contagem-produced Business Worth data inherits Contagem's existing access tier.
- Historical `BusinessWorthSnapshot` reads follow ordinary tenant-read authorization; writes are refused outside §25/§26's governed windows through any path (FR-44).

Exact `firestore.rules` expressions are a Rule 8/Implementation Authorization concern (§3, out of scope), not decided here.

## 34. Auditability

Extending the existing `platform_audit_log`/Timeline-event infrastructure (`09-superadmin-architecture.md` §9.6) rather than inventing a new one, per this task's own instruction:

At minimum, the following must be audit-recorded: Contagem confirmation that produces a `BusinessWorthSnapshot`; an Owner correction within the 3-hour window; a SuperAdmin recovery-Authorization grant, consumption, or unconsumed expiry; a `Receivable`/`Payable` payment event; any reconciliation-signal event (§22); and any preventive-notification dispatch tied to a discrepancy or an outstanding operational gap (§22). Exact storage location (same collection as the existing platform audit log vs. a dedicated one cross-referenced from it) is a Rule 8 question (§36, item 7).

**FR-48.** Every event named above must produce a permanent, append-only audit record, distinguishable by event type and business, using existing audit infrastructure where its shape already fits.

## 35. Idempotency / Failure Safety

Per §24's finalization design, extended to every other write introduced by this Specification:

- **Duplicate confirmation** — covered by FR-36/FR-37.
- **Duplicate payment** (Receivable or Payable) — a `ReceivablePayment`/`PayablePayment` write must carry its own submission identity, following the same pattern as Contagem finalization, so a retried payment attempt cannot double-apply.
- **Recovery retry** — a SuperAdmin Authorization consumption (§26) must be atomic and one-way, mirroring `POL-0009`'s existing Invariant I-5 exactly.
- **Autosave interruption / network failure** — covered by §23's reuse of the existing Data-Loss-Resilience design.
- **Partial transaction failure** — no financial operation introduced by this Specification (a snapshot write, a payment write, a cash-ledger write) may leave a partially-applied state visible to any reader; each is either fully committed or not committed at all, consistent with the existing platform's Firestore-batch-write discipline (`10-stock-counts.md`'s own "single Firestore batch write" precedent).

**FR-49.** No financial write introduced by this Specification (`BusinessWorthSnapshot`, `CashLedgerEntry`, `ReceivablePayment`, `PayablePayment`) may be observably partially applied — each is atomic, and a retried attempt against the same submission identity produces no duplicate effect.

## 36. Explicit Rule-8 Technical Questions — Not Resolved Here

Consistent with this repository's established precedent (the accepted SuperAdmin-Assisted Initial Stock Recovery Specification's own §16), the following are named explicitly rather than silently decided or omitted. **Two items from this Specification's original draft — the new-model-Contagem marker mechanism, and the Void-&-Redo/3-hour-mechanism interaction — are resolved by the Product Architect's 22 August 2026 review (Decisions 1 and 2 respectively, §14 and §26) and are removed from this list; every other originally-listed item is preserved unchanged, per the review's own explicit instruction not to fabricate resolutions beyond what was actually decided. A further item — the correction/recovery-cycle ceiling question — was added by the 22 August 2026 post-acceptance governance review (a genuine gap identified during that review, not a Product Architect decision), assessed by the Rule 8 Assessment (`docs/engineering/business-worth-evolution-rule8-assessment.md`), and resolved there by explicit Product Architect decision — recorded in §30b, below — and is likewise removed from this list.**

1. Whether and how Contagem's Mode B (multiple simultaneous selling-unit prices) interacts with the existing `units[0]`-reference-unit convention `product-unit-of-measure-specification.md` §4 already establishes for Periodic Contagem's mixed-unit combination (§15).
2. The precise storage balance between "frozen value" and "reference to source record" for each `BusinessWorthSnapshot` drill-down field (§8).
3. Whether `Receivable.amountPaid`/`Payable.amountPaid` are maintained as denormalized running totals (updated transactionally alongside each payment write) or purely derived at read time from their payment subcollections (§11, §12).
4. The exact aggregation formula linking `productValuationTotal` and `embeddedProfitTotal` into `measuredBusinessWorth` without double-counting (§17, FR-24).
5. The exact new `periodType` enum value (or equivalent) and any additional overlapping-range guard nuance for the baseline-anchored custom Fecho range (§18).
6. Exactly which existing Dashboard card element carries which new label/click-through behavior, at the pixel/component level (§32).
7. Precise audit-log storage location relative to the existing `platform_audit_log` collection (§34).
8. `firestore.rules` expressions implementing §33's authorization boundaries, and whether any new custom claim or role check beyond `platform_operators/{uid}` is required for the Business-Worth-specific SuperAdmin Authorization tier (§26).
9. The exact new `NotificationCategory` enum value (or equivalent) for preventive Business-Worth-Evolution reminders, and the exact heuristic/rule-set the Background Worker uses to decide when a possible-cause suggestion or a preventive reminder is warranted (§22) — the *content* and *evidence-bound, non-accusatory* discipline are decided (§22); the exact trigger logic and category naming are not.
10. Whether `02-business-worth-engine.md`'s existing `generateReportSummary` (consumed today by Reports, spec #12) needs any extension to serve arbitrary historical sub-range profit analysis under this capability, or already serves it unmodified (§18).
11. Whether every existing business already in State 1a (§6, §9 Case B) has a sufficiently reliable `historicalCapitalInicialDate` on record to anchor its Startup Investment window (§13), and if not, what fallback treatment Rule 8 should adopt — this Specification deliberately does not fabricate a date where the existing historical record does not carry one. **Note:** the Rule 8 Assessment independently resolved this question favorably during its own investigation (anchor to `StockCount.createdAt`, which is present on every historical record without exception) — see the Rule 8 Assessment §3 Finding 6-A. That resolution is recorded there, not restated as a decision here, because it was reached entirely within Rule 8's own technical authority — unlike the correction/recovery-cycle ceiling question removed above, which required an actual Product Architect decision to resolve. This item is left in the list, unedited, as the accurate record of what this Specification itself decided (nothing) versus what a later governance stage resolved.
12. **[Added by the §41 amendment draft, PENDING Product Architect acceptance]** Whether `BusinessWorthSnapshot.estimatedBusinessWorthImmediatelyBefore` (§8) should be renamed to reflect that, under the corrected Current/Estimated distinction (§6, §7), the value it captures — the live formula's output immediately before a new Contagem, for a business that already had a prior snapshot — is what §7 now calls Current Business Worth, not a Case-B-style Estimated Business Worth. The *value* captured is unchanged either way (§22); this is a field-naming question only, explicitly not resolved here per the instruction not to redesign the data model as part of a terminology amendment.
13. **[Added by the §41 amendment draft, PENDING Product Architect acceptance]** Whether live Current Business Worth (§7) is (a) derived on read, exactly like `businessWorth`/Estimated Business Worth already are today (no new storage, a pure function evaluated on demand — matching this Specification's own long-standing "computed, never stored as authoritative" convention, §9), or (b) requires some form of maintained/cached value for performance or notification-triggering reasons not yet identified. This Specification does not decide (b) is necessary and does not invent any storage mechanism for it — per the source BDR/POL-0010's own "computed, never stored" precedent for Estimated Business Worth, option (a) is the default expectation carried into Rule 8, not a new open design space.

None of the above is a business decision reopened — each is a "how, specifically, at the code/schema level" question the source BDR and POL-0010 both explicitly deferred to this stage or the next, consistent with §6/§19 of those two documents respectively.

## 37. Explicit Non-Goals / Exclusions

- Does not decide any Firestore security-rules text (§33, §36 item 8).
- Does not decide any UI/interaction/component layout (§32, §36 item 6).
- Does not decide database transaction implementation details beyond the atomicity *requirements* stated in FR-36/FR-49.
- Does not decide API design for any endpoint or function implementing any rule in this Specification.
- Does not decide a migration or backfill strategy for any historical record (FR-46).
- Does not decide any rounding/precision rule beyond the existing `POL-0001`/`POL-0002` convention.
- Does not decide the exact `NotificationCategory` enum value or Background Worker trigger heuristic for preventive reminders (§36, item 9) — only that the existing module/path is the integration point, not a new one.
- **[Added by the §41 amendment draft, PENDING Product Architect acceptance]** Does not decide, invent, or require any new storage/caching mechanism for live Current Business Worth (§7, §36 item 13) — a pure, on-demand derivation (matching the existing `businessWorth`/Estimated Business Worth convention) remains the default expectation.
- Does not introduce POS, checkout, invoicing, payroll, full accounting, ERP, or general customer transaction management, per the Architecture Boundary Override's own explicit non-authorization (source BDR Decision 34; POL-0010 ARCH-2).
- Does not modify `BDR-0012`, `BDR-0014` and its companion amendments, `BDR-0015`/`POL-0008`, `BDR-0016`/`POL-0009`, `10-stock-counts.md` and its three amendments, `02-business-worth-engine.md`, `09-withdrawals.md`, `08-expenses.md`, `07-breakages.md`, `11-monthly-closings.md`, `01-dashboard.md`, `12-reports.md`, `20-notifications.md`, `product-unit-of-measure-specification.md`, or the Stock Count Data-Loss Resilience Specification — every one of these remains exactly as already approved.
- Does not create a Rule 8 Assessment, Implementation Plan, or Implementation Authorization.

## 38. Governance Notes

- This is a Specification document only. No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` file is touched by this document. No UI, schema, or code is modified.
- This Specification does not modify the source BDR, POL-0010, or any of the existing artifacts named in §30's table — all confirmed unmodified by this document.
- This Specification's 22 August 2026 amendment incorporates ten explicit Product Architect decisions (§30a) resolving the questions previously flagged in §36; every other, lower-level technical question from the original draft is preserved unchanged for Rule 8, per the review's own explicit instruction not to fabricate resolutions beyond what was actually decided.
- A second, same-day corrective pass fixed six identified Specification defects (AC #1's internal contradiction; §30a's traceability mismap; §13/§32 State-1a propagation; a stale §3 Scope; every broken internal cross-reference found by a full-document sweep). This pass changed no Product Architect business decision, invented no correction/recovery ceiling, and left the approved 3-hour and 72-hour figures exactly as decided — it added one new, explicitly unresolved Rule 8 question (§36, item 11 at that time) rather than inventing an answer.
- A Rule 8 Assessment (`docs/engineering/business-worth-evolution-rule8-assessment.md`) was subsequently completed, investigating the actual codebase and returning two findings requiring Product Architect decision. Both were resolved and are recorded, verbatim, in §26 and §30b of this document — a third, same-day governance-cleanliness pass. Neither resolution reopens, alters, or reinterprets any of the ten decisions in §30a, any of the 35 source-BDR decisions, or this Specification's own Acceptance (below). The former §36 item 11 (correction/recovery-cycle ceiling) is removed from that list as a result, per its own resolution; the remaining eleven items are unchanged.
- **A fourth pass, a terminology-correction amendment (§41), is now ACCEPTED (22 August 2026).** It corrects §6, §7, §9, §18, §22, §27, §29, §32, and §36 so that "Current Business Worth" means the business's live, evolving present-moment figure (not "the latest snapshot's frozen value," as originally written), while "Estimated Business Worth" (§9) and "Business Worth Snapshot" (§8) keep their own distinct meanings and neither is renamed. No economic formula changes (§9's Case A/Case B text is untouched in substance), no ceiling changes, no immutability exception is created, and no code/rules/tests/indexes/Implementation Plan/Implementation Authorization is touched by this Specification amendment itself. Two new technical questions are added to §36 (items 12–13) rather than silently resolved. Every passage elsewhere in this document marked `[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]` is, as of this acceptance, accepted content — the marker text remains in place as an accurate historical record of what changed, per §41's own status note, matching this document's existing convention for its earlier `[DECIDED...]`-tagged passages. **Whether the Rule 8 Assessment, Implementation Plan, and Implementation Authorization — each produced against this Specification's pre-§41 text — themselves require amendment as a result is addressed by a separate Governance Reconciliation Report, not by this Specification.**
- This Specification **is Accepted** — see "Product Architect Acceptance" (§40, below) for the signed acceptance statement. Acceptance authorizes progression to Rule 8 Assessment only; it does not authorize coding, `firestore.rules` changes, test changes, index changes, an Implementation Plan, or an Implementation Authorization (§40). **This Acceptance status is unchanged by the Rule 8 Assessment or by this cleanliness pass** — Rule 8's own READY-FOR-IMPLEMENTATION verdict is a separate, later governance-chain milestone, recorded in `docs/engineering/business-worth-evolution-rule8-assessment.md`, not a re-acceptance of this document.
- `docs/specs/README.md` is not modified by this document.
- No `BDR-NNNN`, `POL-NNNN`, or any other numbered identifier is assigned by this document — this repository's Specification layer has no established numbering ledger to assign from, and none is invented here.
- Nothing was committed or pushed to produce this document or its amendment.

## 39. Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3's governing hierarchy and the source BDR's own §10: the Rule 8 Assessment (`docs/engineering/business-worth-evolution-rule8-assessment.md`) is now complete, returning a verdict of **READY FOR IMPLEMENTATION** following explicit Product Architect resolution of its two findings (recorded in §26, §30b, above). The next governance step is an **Implementation Plan**, followed by a signed **Implementation Authorization**. Neither is drafted, started, or authorized by this document. All eleven remaining §36 technical questions (the twelfth, the correction/recovery-cycle ceiling, is resolved and removed) are carried forward as Implementation Plan inputs, per the Rule 8 Assessment's own §4/§6.

**Lifecycle:** Drafted → Product Architect Reviewed → **Accepted (22 August 2026)** → Rule 8 Assessed → **READY FOR IMPLEMENTATION (22 August 2026)** → Not yet an Implementation Plan → Not Implemented.

---

## 40. Product Architect Acceptance

**Status:** ✅ **Accepted (22 August 2026).**

> This Consolidated Specification — Business Worth Evolution & Measurement Model — has been reviewed. The umbrella Business Decision Record (`BDR-pending-business-worth-evolution-measurement-model.md`) is the governing business decision authority for this capability; `POL-0010` (`POL-pending-business-worth-evolution-policy.md`) is the governing policy authority. This Specification correctly converts both into functional requirements and technical design, and now incorporates the ten Product Architect decisions recorded in this review (§30a) — new-model Contagem identification via the `producesBusinessWorthSnapshot` marker; new-model Contagem recovery exclusivity; cash confirmed at Contagem; Receivables; Supplier Payables; Startup Investment as a non-netted, separate measurement; the new-Contagem baseline reset and the existing-business transitional Estimated Business Worth formula; Fecho as a baseline-anchored (not arbitrary-start) reporting range; the measured-value-is-never-replaced-by-the-estimate rule together with possible-cause guidance and preventive notifications; and the `BusinessWorthSnapshot`/`StockCount` separation. This Specification is **ACCEPTED and APPROVED**. The Product Architect authorizes progression to the next governance stage: **Rule 8 Assessment.**
>
> This acceptance does **not** authorize coding, `firestore.rules` changes, test changes, index changes, an Implementation Plan, an Implementation Authorization, or deployment. The next governance stage is Rule 8 Assessment; only after Rule 8 is satisfied may the chain proceed to an Implementation Plan, then an Implementation Authorization, then Incremental Implementation.

**Product Architect:** SABUSHIMIKE Masceni
**Date:** 22 August 2026

**Scope of this acceptance:** covers this Specification's content in full, as amended by the ten decisions in §30a — it does not reopen, amend, or re-approve the source BDR or POL-0010 themselves (both remain approved exactly as they already were), and it does not itself constitute a Rule 8 Assessment, Implementation Plan, or Implementation Authorization, each of which remains a distinct, separately-gated future step.

**Continued validity note (22 August 2026, added by the post-Rule-8 governance-cleanliness pass):** This Acceptance, and the quoted statement above, are the unaltered original record of what the Product Architect signed. The two further decisions recorded in §26 and §30b — made after Rule 8 Assessment, resolving that assessment's own findings — do not amend, reopen, or require re-signing this Acceptance; they are additive governance events at a later stage of the same chain, exactly as the ten decisions in §30a were additive to the source BDR and POL-0010 without reopening either.

---

## 41. Amendment — Current Business Worth / Estimated Business Worth / Business Worth Snapshot Terminology Correction

**Status:** ✅ **ACCEPTED (22 August 2026).** This section was drafted as "AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE" and is now formally **ACCEPTED and APPROVED** by explicit Product Architect signature (§41.9, below). Every passage elsewhere in this document previously marked `[AMENDMENT DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, §41]` is, as of this acceptance, **accepted, authoritative Specification content** — the bracketed marker text is left in place at each passage as an accurate historical record of what changed and why, exactly as this document's existing convention already does for the three earlier amendment passes (§30a, §30b), not because the content itself remains provisional.

### 41.1 The Clarified Decision Being Proposed

The Product Architect has clarified that the originally-drafted relationship between three already-decided concepts was stated incorrectly in this Specification's original text:

- **CURRENT BUSINESS WORTH** is the business's current, live Business Worth — not a synonym for "the latest snapshot's frozen value."
- **BUSINESS WORTH SNAPSHOT** is the immutable historical measurement a confirmed Contagem creates — unchanged, still exactly what §8 already defines.
- **ESTIMATED BUSINESS WORTH** is the governed estimate used where the business has no measured checkpoint yet, or where the approved Fecho model reads Business Worth as of a chosen date rather than "right now" — unchanged in its own formula (§9), narrowed only in when its *name* applies once a snapshot exists.

These three must not be collapsed into one another. This amendment corrects §6, §7, §9 (naming cross-reference only), §18 (naming cross-reference only), §22 (footnote only), §27 (clarifying sentence only), §29 (two Acceptance Criteria), §32 (naming clarification only), and §36 (two new technical questions) so the document consistently reflects this.

### 41.2 Old Definition (Superseded by This Amendment)

> **§7, original text:** "Current Business Worth is: Sourced from the most recent Business Worth Snapshot... **Never itself independently computed** — it is a read of the latest snapshot's frozen `measuredBusinessWorth` field, never a live recomputation from current batches/expenses/withdrawals (that live figure is Estimated Business Worth, §9, a structurally distinct read)."
>
> **FR-3, original text:** "The system must expose a single, unambiguous 'Current Business Worth' read that resolves to **the latest confirmed Business Worth Snapshot's frozen value**, or to an explicit UNKNOWN state, with no third possible outcome."

### 41.3 New Accepted Definition

> **§7, accepted text:** Current Business Worth = the latest confirmed `BusinessWorthSnapshot`'s `measuredBusinessWorth`, **plus every governed Business-Worth-affecting change recorded since that snapshot's own `confirmedAt`** — a live, on-demand calculation, computed via the exact same formula §9's Case A already specifies. The snapshot itself is not Current Business Worth; it is the frozen fact Current Business Worth is currently computed from.
>
> **FR-3, accepted text:** The system must expose a single, unambiguous "Current Business Worth" read that resolves to either (a) a live-computed value — the latest snapshot's `measuredBusinessWorth` plus governed activity since — or (b) an explicit UNKNOWN state when no snapshot exists yet, with no third possible outcome.

### 41.4 Exact Distinction Between the Four Concepts (Restated for Clarity)

- **CONTAGEM** — the physical measurement/reconciliation event. Unchanged (§14).
- **BUSINESS WORTH SNAPSHOT** — the immutable historical record a confirmed Contagem produces. Unchanged (§8). Never itself "the" Current Business Worth.
- **CURRENT BUSINESS WORTH** — the business's live Business Worth right now: latest snapshot + governed activity since. Corrected by this amendment (§6 State 3, §7, FR-3).
- **ESTIMATED BUSINESS WORTH** — the same formula shape, applied either (a) before any snapshot exists (§9 Case B — unchanged), or (b) whenever the read is "as of a chosen date" rather than "right now" (Fecho, §18 — unchanged in behavior, only the cross-reference is added).

### 41.5 No New Business Decision, No New Economic Rule

This amendment is a **terminology and semantic-relationship correction**, not a new Product Architect business decision, per the task's own explicit instruction not to disguise one as the other:

- No figure in the source BDR, POL-0010, or this Specification's own worked examples (`500,000 → 505,000`; `500,000/525,000/518,000`) changes.
- No ceiling (3-hour Owner window, 72-hour SuperAdmin authorization) changes.
- No non-double-counting rule (cash-financed purchase = asset conversion; supplier-credit purchase does not fabricate worth; a payment settles rather than doubly reduces; an unpaid receivable is never counted) changes.
- No `BusinessWorthSnapshot` field is renamed, added, or removed by this amendment — §15's own instruction not to redesign the data model here is followed; the one naming tension this amendment exposes (`estimatedBusinessWorthImmediatelyBefore`, §8) is carried forward as a new, explicit, unresolved technical question (§36 item 12), not silently decided.
- Fecho's own baseline-anchored behavior (§18), the Dashboard's own nine-KPI-card structure (§32), and every immutability guarantee (§27) are unchanged in substance — only in which of the two already-defined figures ("frozen snapshot" vs. "live ongoing calculation") the term "Current Business Worth" itself refers to.

### 41.6 Traceability

| BDR Decision(s) | POL-0010 Rule(s) | Amended Spec Section(s) | Amended FR(s)/AC(s) |
|---|---|---|---|
| 3 (Current Business Worth), 21 (Estimated Business Worth), 23 (baseline reset) | BW-2, BW-5, BW-7 | §6 (States 3–5, I-1), §7, §9 (cross-reference only) | FR-3, FR-8 (cross-reference), FR-51 (cross-reference), AC 9, AC 23 |
| 24 (Fecho) | FEC-1, FEC-2, FEC-4 | §18 (cross-reference only) | (no FR text changed, cross-reference only) |
| 11, 22 (reconciliation) | CON-8, FIN-2, OWN-5, BW-6 | §22 (footnote only) | (no FR text changed) |
| 27, 28 (Dashboard) | DASH-1, BW-3 | §32 (naming clarification only) | (no FR text changed) |
| 33 (Immutability) | REC-4, SYS-10 | §27 (clarifying sentence only) | (no FR text changed) |

No row above introduces a BDR decision, POL-0010 rule, FR, or AC number that did not already exist. All 35 source-BDR decisions remain represented in §28, unweakened, unremoved (§28's own new footnote confirms no row changed).

### 41.7 Technical Questions Newly Exposed (Not Resolved Here)

Added to §36 rather than decided in this section, per instruction not to invent a storage mechanism or field name to make this amendment "look complete":

- **§36 item 12:** whether `BusinessWorthSnapshot.estimatedBusinessWorthImmediatelyBefore` should be renamed, given it now captures what §7 calls Current Business Worth (not a Case-B-style estimate) whenever a prior snapshot already existed.
- **§36 item 13:** whether live Current Business Worth is purely derived-on-read (the default expectation, matching the existing `businessWorth`/Estimated Business Worth convention) or requires some maintained/cached mechanism — this Specification does not decide the latter is necessary and invents no such mechanism.

### 41.8 Confirmations

- No code, `firestore.rules`, `firestore.indexes.json`, or test file is touched by this amendment.
- The Implementation Plan and Implementation Authorization are not touched by this amendment itself — their consistency with the now-accepted amendment is addressed separately (see the Governance Reconciliation Report accompanying this acceptance).
- No Increment 2–9 functionality is implemented, started, or authorized by this amendment.
- The source BDR and POL-0010 are not modified.
- All 35 BDR decisions remain traceable and unweakened (§28's new footnote, §30a's new footnote, §41.6 above).
- No business decision is invented; no economic formula, ceiling, or non-double-counting rule is changed (§41.5).
- Nothing was committed or pushed to produce this amendment or its acceptance.

### 41.9 Product Architect Acceptance

**Status:** ✅ **Accepted (22 August 2026).**

> I have reviewed the §41 amendment correcting the Current Business Worth / Estimated Business Worth / Business Worth Snapshot terminology relationship in the Business Worth Evolution & Measurement Model Specification. I confirm it introduces no new business decision, changes no approved economic formula, ceiling, or non-double-counting rule, and accurately reflects my clarified intent. This amendment is **ACCEPTED and APPROVED**.

**Product Architect:** SABUSHIMIKE Masceni
**Date:** 22 August 2026

**Scope of this acceptance:** covers this §41 amendment's content in full, as it amends §6, §7, §9, §18, §22, §27, §28, §29, §30a, §32, §36, and §37 of this Specification — it does not reopen, amend, or re-approve the source BDR or POL-0010 themselves (both remain approved exactly as they already were), and it does not itself amend the Rule 8 Assessment, Implementation Plan, or Implementation Authorization, each of which remains a distinct, separately-gated artifact whose consistency with this now-accepted amendment is addressed by a separate Governance Reconciliation Report, not by this acceptance statement itself.

**Continued validity note:** This acceptance does not reopen, alter, or reinterpret §40's original Acceptance, or the two Rule-8-stage decisions recorded in §26/§30b — it is an additive governance event at a later stage of the same chain, exactly as those were additive to what preceded them.

## 42. Amendment — Business Worth First Establishment Lifecycle (23 August 2026)

**Status:** ✅ **ACCEPTED (23 August 2026).** This section records, as final, internally consistent Specification text, the Product Architect's already-approved and signed decisions from `docs/engineering/business-worth-evolution-first-establishment-decision.md` (committed `15767c3` on top of `a544406`), together with the Revision-3 corrections resolving the internal-consistency gaps identified after Revision 2. This section does not reopen, re-litigate, or ask for reconfirmation of any of those decisions. Every passage elsewhere in this document marked `[Corrected, §42]`, `[Amendment, §42]`, or `[new, §42]` is, as of this acceptance, accepted, authoritative Specification content — the bracketed marker text is left in place at each passage as an accurate historical record of what changed and why, following this document's own existing convention (§30a, §30b, §41).

### 42.1 Authoritative Terminology (fixed for the remainder of this document)

| Term | Meaning | Establishes Business Worth? | Verification Status |
|---|---|---|---|
| **Capital Inicial / Initial Investment** | Historical record of capital/stock present at business start; capital-history information only | **No — never** | N/A |
| **Startup Investment** | Governed record of spending to establish the business (labor, wages, transport, preparation, license, other) | **No — explicitly excluded, unchanged (Decision 6/FR-52)** | N/A |
| **Contagem** | A confirmed physical stock count | **Yes — Establishment Method 1** | **Measured/Verified** — the system's own independent physical measurement |
| **Owner-Declared Business Worth** | A confirmed, Owner-entered known value | **Yes — Establishment Method 2** | **Owner-Declared / Unverified** — a claim the Owner asserts, never independently measured or verified by SABUSH BPT (BDR Decision 36, as qualified 23 August 2026) |
| **Owner Investment** | A later cash injection by the Owner into an already-operating business | **No — does not itself establish Business Worth; it is a governed transaction that increases an already-established Business Worth** | N/A |
| **Business Worth (pre-establishment)** | The business's known operational information (stock, embedded profit, expenses, Startup Investment, etc.), displayed honestly as not-yet-measured | N/A — this state has no Business Worth figure at all (State 1) or an Estimated one only (State 1a) | N/A |
| **Current Business Worth** | The live figure computed from the latest genuine `BusinessWorthSnapshot` (either establishment method) plus every governed transaction since | The display term used once establishment has occurred (State 3) | **Corrected, 23 August 2026:** the underlying live-computed number and formula are identical regardless of establishment method (no calculation-layer distinction — see §42.9, below) — but the **display term itself is not uniform**. When the latest active snapshot's `establishmentMethod === 'contagem'`, the existing "Current Business Worth" / measured framing applies unchanged. When `establishmentMethod === 'owner-declared'`, the same live-computed figure must be presented under an explicit "Owner Declared / Unverified" framing (§42.9, FR-70) — never under the plain "Current Business Worth" label alone, and never in a way indistinguishable from a Contagem-measured figure. |

There are exactly two Business Worth establishment methods. No third exists, and none is introduced anywhere in this amendment: Contagem, and Owner-Declared Business Worth.

### 42.2 Corrections Made (Corrections 1–4)

- **Correction 1 (terminology consistency)** — resolved by §42.1 above, and applied consistently at §6 State 2, FR-2, §14/§15, §18/FR-25, and §32.
- **Correction 2 (Owner Investment's three-way distinction)** — resolved at new §43, below.
- **Correction 3 (snapshot drill-down consistency for Owner-Declared establishments)** — resolved by FR-69, below, and the amended FR-7 cross-reference at §8.
- **Correction 4 (Fecho baseline consistency across every referencing section)** — resolved at §18/FR-25 (corrected in place), with cross-references rather than restatement at §6, §32, §25–§26, and here.

### 42.3 Snapshot Drill-Down Consistency for Owner-Declared Snapshots (Correction 3)

FR-7 (§8) requires every snapshot to be drillable into all twelve content items. An Owner-Declared snapshot, by its own nature, never contains a physical count, a confirmed cash position, or a measured receivables/payables position **at the moment of establishment** — only the declared total and a date.

**Resolution — absence, never fabrication, exactly matching this codebase's own existing discipline:** the existing `BusinessWorthSnapshot` write path already follows an "omit entirely, never write a fabricated zero/undefined" rule for every optional field. This exact discipline is extended, unmodified in kind, to Owner-Declared snapshots:

For a snapshot with `establishmentMethod: 'owner-declared'`:
- `measuredBusinessWorth` is the Owner's declared figure — the one genuine, required fact this establishment method provides.
- `productValuationTotal`, `productValuationDetail`, `embeddedProfitTotal`, `embeddedProfitDetail`, `cashPosition`, `receivablesPosition`, `payablesPosition`, `expensesSinceLastSnapshot`, `breakagesSinceLastSnapshot`, `levantamentosSinceLastSnapshot`, and `ownerInvestmentSinceLastSnapshot` (§43) are all **omitted entirely** — never written as a fabricated zero, never written as `null` standing in for "measured as zero," and never inferred from any other data source.
- The drill-down UI, for an Owner-Declared snapshot, displays the declared total, its date, its `establishmentMethod` badge, and an explicit notice that no physical/financial breakdown exists for this snapshot because none was measured — never presenting a blank/zero field as though it meant "nothing existed," and never presenting the absence as an error or a defect in the snapshot.
- **FR-7 is not violated by this absence** — FR-7 requires that every *available* content item be drillable; it has never required a content item to be fabricated where the establishment method genuinely does not produce it.
- From the moment immediately after an Owner-Declared snapshot's `confirmedAt`, the live "since snapshot" calculation (`computeCaseALiveBusinessWorth`) behaves identically regardless of establishment method — embedded profit changes, expenses, withdrawals, Owner Investments, and receivable/payable payments all accrue against the declared `measuredBusinessWorth` baseline exactly as they would against a Contagem-measured one. No change to the live-calculation engine is required or introduced by this provision.

**FR-69 [new].** A `BusinessWorthSnapshot` with `establishmentMethod: 'owner-declared'` must omit every drill-down field this Specification defines except `measuredBusinessWorth`, `confirmedAt`, `establishmentMethod`, and the reconciliation fields (§8) where meaningfully computable — never fabricating a zero or inferred value for any omitted field. The Dashboard/history UI must display this absence explicitly and never as an error.

### 42.4 Rule 8 Assessment Correction

`docs/engineering/business-worth-evolution-rule8-assessment.md` Finding 6-A/8-A receives a dated correction addendum (applied directly in that file, appended not rewritten in place) stating that the Capital-Inicial Fecho-baseline fallback those findings previously documented as correct is superseded by §18/FR-25 as corrected above.

### 42.5 Confirmations

- No file under `docs/specs/` or `docs/engineering/` other than this Specification, the BDR, and the Rule 8 Assessment addendum was edited to produce this amendment.
- No code, test, `firestore.rules`, `firestore.indexes.json`, or `package.json` file is touched by this amendment.
- No Increment 10 is authorized by this amendment. Increments 1–9 are not reopened.
- All prior BDR decisions remain traceable and unweakened; this amendment adds Decision 36 (BDR) and Decisions 11–12 (this Specification, §8/§12) without reversing any other decision except the single, explicitly-flagged reversal of Gap 2's establishment-mechanism portion (BDR Decision 36).
- A separate, subsequent Implementation Authorization step remains required before any code is written — unchanged by this amendment.

### 42.6 Traceability

| Item | Section | Class | New FR(s) | Reverses a prior decision? |
|---|---|---|---|---|
| §6 State 2 / BDR Decision 1 false premise | §6; BDR §4 Decision 1 | Correction | none (textual) | No — corrects a factual error |
| Owner-Declared Business Worth | BDR Decision 36; this §42 | New Decision, approved | FR-61 | Yes — reverses Gap 2's establishment-mechanism choice; approved and signed |
| `establishmentMethod` field | §8 | New Decision, approved | FR-61 | No |
| Snapshot drill-down for Owner-Declared | §8/FR-7, §42.3 | New Decision, approved | FR-69 | No — resolves an internal-consistency gap, no reversal |
| Opening Payables/Liabilities | §12 | New Decision, approved | FR-62 | No — extends Decision 5, purchase case unchanged |
| Additional Owner Investment | §43 | New Decision, approved | FR-63, FR-64, FR-65, FR-66 | No — new territory |
| Deterministic cost-basis conversion | §15 | New Decision, approved | FR-67 | No — new territory |
| Fecho baseline correction | §18/FR-25 | Correction | FR-25 amended in place | No — corrects behavior contrary to stated intent |
| Fecho batch-level profit | §18 | New Decision, approved | FR-68 | No — scoped enhancement |
| Receivable reminder cadence | §22/FR-57 | New Decision, approved | FR-57 amended in place | No — fills a previously open question |
| FR-2 Path-B exception | §6/FR-2 | New Decision, approved | FR-2 amended in place | No — names Path B as a second permitted event |
| Dashboard/report terminology, 3 surfaces | §32 | New Decision, approved | none new | No — extends scope, executes BDR Decision 3 in full |
| Rule 8 Finding 6-A/8-A | Rule 8 Assessment | Correction addendum | N/A | No — corrects documentation of now-superseded behavior |
| Owner-Declared verification-status qualification | BDR Decision 36 (qualified); §42.8; Rule 8 Finding OD-2 (qualified) | Qualification, approved | FR-70 | No — narrows "same governance weight" to procedural scope only; no calculation, formula, or Fecho-baseline change |

### 42.7 Product Architect Acceptance

**Status:** ✅ **Accepted (23 August 2026).**

> I have reviewed the §42 amendment recording the Business Worth First Establishment Lifecycle decisions (BDR §4 Decision 36; this Specification's Decisions 11–12) and the Revision-3 corrections (Corrections 1–4) into final, internally consistent Specification text. This amendment is **ACCEPTED and APPROVED**.

**Product Architect:** SABUSHIMIKE Masceni
**Date:** 23 August 2026

**Scope of this acceptance:** covers this §42 amendment's content in full, as it amends §6, §8, §12, §14/§15, §18, §22, §32 of this Specification, adds new §43, and adds BDR Decision 36 and a Rule 8 Assessment correction addendum — it does not reopen, amend, or re-approve any other portion of the source BDR, POL-0010, or this Specification, and does not itself authorize Increment 10 or any Implementation Plan/Authorization step, each of which remains a distinct, separately-gated artifact.

### 42.8 Owner-Declared Verification Status — Qualification [Amendment, 23 August 2026, Product Architect Decision]

**This subsection qualifies §42.1's "same governance weight"/"full stop" language (and the corresponding BDR Decision 36 text, as qualified) — it does not reopen, reverse, or re-litigate BDR Decision 36 itself, and it does not reopen the earlier Option A/B/C decision process (Option A is approved and signed).**

**The qualification, stated exhaustively:**

- **Procedural equality, unchanged.** Correction eligibility (§25), SuperAdmin-authorized recovery (§26), auditability (§34), immutability (§27), and every snapshot-lifecycle mechanic (supersession, correction/recovery windows, idempotency) apply identically to a `BusinessWorthSnapshot` regardless of `establishmentMethod`. Nothing in this subsection changes any of these mechanics.
- **Calculation equality, unchanged (explicit, per Product Architect direction).** `getCurrentBusinessWorth`, `getEstimatedBusinessWorth`/`computeCaseALiveBusinessWorth`, and `resolveActiveBusinessWorthBaselineDate` continue to treat the latest active snapshot identically regardless of `establishmentMethod` — **no Contagem-only filter is introduced anywhere in the live calculation or Fecho-baseline resolution by this qualification.** An Owner-Declared snapshot remains a fully valid operational Business Worth baseline and a fully valid Fecho baseline, exactly as §42.1's original, unqualified text already established and as §18/FR-25's Capital-Inicial-fallback removal (unaffected, unchanged by this qualification) already requires in its place.
- **Display/provenance distinction, newly required.** What changes is presentation, not substance: a live-computed Business Worth figure sourced from the latest active snapshot must be presented under one of exactly two framings, decided solely by that snapshot's `establishmentMethod`:
  - `establishmentMethod === 'contagem'` → the existing "Current Business Worth" / measured framing, unchanged.
  - `establishmentMethod === 'owner-declared'` → an explicit "Owner Declared / Unverified" framing (or equivalent wording, localized) — the same underlying number, never presented as though SABUSH BPT independently measured or verified it.
- **The transition is automatic, not a new mechanic.** When a later Contagem is confirmed, its new `BusinessWorthSnapshot` becomes the latest active one through the existing, unmodified snapshot-selection logic (ordered by `confirmedAt`, `status === 'active'`) — the prior Owner-Declared snapshot simply ceases to be "the latest active snapshot" and the display framing changes as a direct consequence, with no new state-transition event, flag, or mechanic required.
- **History is preserved, not hidden.** A superseded Owner-Declared snapshot remains in the Business Worth history, visibly marked as Owner-Declared/Unverified for as long as it is displayed — never deleted, hidden, or presented as though it had never existed (§27 immutability, unaffected).
- **No new establishment method, no new field required by this qualification.** `establishmentMethod: 'contagem' | 'owner-declared'` remains the sole source of truth for this distinction — this qualification is a display/terminology correction, not a data-model change (Product Architect direction: prefer reusing `establishmentMethod`; do not add schema complexity unless proven necessary, which this qualification does not require).

**FR-70 [new, §42.8].** Every UI surface that presents a live Business Worth figure derived from the latest active `BusinessWorthSnapshot` — at minimum, the Dashboard's Business Worth headline presentation and the Owner-Declared entry screen's own pre-confirmation copy — must visibly and explicitly distinguish `establishmentMethod === 'owner-declared'` (an "Owner Declared / Unverified" framing) from `establishmentMethod === 'contagem'` (the existing measured framing), using the same underlying figure and formula in both cases. The entry screen must additionally state, before the Owner confirms a declaration, that: (a) the value is Owner-provided; (b) SABUSH BPT has not independently verified it; (c) a future Contagem will establish the measured Business Worth. This requirement governs presentation only — it introduces no change to FR-3 (Current Business Worth's own calculation), FR-25 (Fecho baseline resolution), or any correction/recovery FR.

### 42.9 Product Architect Acceptance — §42.8 Qualification

**Status:** ✅ **Accepted (23 August 2026).**

> I have reviewed §42.8, qualifying BDR Decision 36 and this Specification's §42.1 "same governance weight" language to distinguish procedural equality (unchanged) from numerical-verification equality (which was never intended and is corrected here). I confirm this introduces no calculation-layer change, no new establishment method, no new data-model field, and does not reopen the approved Option A decision. This qualification, and its new FR-70, are **ACCEPTED and APPROVED**.

**Product Architect:** SABUSHIMIKE Masceni
**Date:** 23 August 2026

## 43. Owner Investment

**(C) New record type, new collection — a genuinely new financial-position input, structurally and conceptually distinct from both Capital Inicial/Initial Investment (historical capital record, never re-entered, never affects Business Worth directly) and Startup Investment (§13, governed spending, permanently excluded from Business Worth, Decision 6/FR-52, unchanged). [Product Architect Decision, 23 August 2026 — SIGNED, §42.]**

**The three-way distinction, stated explicitly and exhaustively:**
- **Initial Investment / Capital Inicial** — a historical record of capital/stock present at business start. Never re-entered after the fact. Never affects Business Worth as a live transaction. Displayed under "Initial Investment / capital history," never under a Business Worth heading.
- **Startup Investment** — a governed record of what the Owner spent establishing the business (labor, wages, transport, preparation, license, other). Permanently excluded from Business Worth (Decision 6/FR-52, unaffected by this amendment). `startupInvestmentEntries`'s existing category enum and FR-17's scope restriction are unchanged and are never widened to cover Owner Investment.
- **Owner Investment (this section)** — money the Owner personally contributes to an **already-operating business, after Business Worth has been established** (by either method). It is a genuine, additive Business Worth transaction, not a historical record and not excluded spending.

**Proposed collection:** `businesses/{businessId}/ownerInvestments/{investmentId}`.

```
OwnerInvestment {
  id: string
  businessId: string
  amount: number
  date: string          // Owner-chosen, backdatable, mirroring Expense/Withdrawal precedent
  description?: string
  createdAt: Timestamp
  createdBy: string
}
```

Every `OwnerInvestment` produces exactly one linked `CashLedgerEntry` (`direction: 'inflow'`, `category: 'other-governed-movement'` — reusing the existing, previously-unused schema value). It is additive in the live Business Worth calculation, symmetric to how a Withdrawal is subtractive: `computeCaseALiveBusinessWorth` gains a new `+ ownerInvestmentsSinceSnapshot` term, computed and applied exactly once — never double-counted against its own linked `CashLedgerEntry`'s effect, following the identical non-double-counting discipline already governing Receivable/Payable payments. It is frozen onto each `BusinessWorthSnapshot`'s drill-down as `ownerInvestmentSinceLastSnapshot` (§8), present for a Contagem-sourced snapshot's *subsequent* activity and equally present for an Owner-Declared snapshot's subsequent activity (§42.3) — the omission rule in §42.3 applies only to a snapshot's own establishment-moment detail, never to governed activity that occurs *after* establishment, regardless of which method established the baseline. It is logged to the existing per-business Timeline (never `platform_audit_log`, reserved for platform/SuperAdmin events), following the same "log after successful batch commit" discipline every other governed financial event already uses.

**FR-63 [new].** Recording an `OwnerInvestment` must produce exactly one linked `CashLedgerEntry` (inflow, `other-governed-movement`) in the same atomic write.
**FR-64 [new].** `OwnerInvestment.amount` must be additive in the live "since snapshot" Business Worth calculation, symmetric to how `Withdrawal.amount` is subtractive, applied exactly once, with no double-counting against the linked `CashLedgerEntry`'s own effect.
**FR-65 [new].** `BusinessWorthSnapshot` must expose `ownerInvestmentSinceLastSnapshot` as a new drill-down field, present for post-establishment activity under either establishment method, following the "reference, don't duplicate" discipline §8 already establishes for its sibling fields.
**FR-66 [new].** `startupInvestmentEntries`'s existing category enum and FR-17's existing scope restriction remain completely unchanged. `OwnerInvestment` is a wholly separate mechanism and record type — never a reclassification, relabeling, or widening of Startup Investment, Capital Inicial, or any existing transaction type.

---

## 44. Amendment — Capital Inicial Retirement: Specification Clarification [DRAFT — PENDING PRODUCT ARCHITECT ACCEPTANCE, 31 August 2026]

**Status of this section only:** 🔶 **DRAFT.** Not yet Accepted. Addresses the Specification clarification required by the signed [Capital Inicial Retirement Decision Proposal](../engineering/capital-inicial-retirement-decision-proposal.md) §10(iii) and its governing [BDR Decision 39](../specs/BDR-pending-business-worth-evolution-measurement-model.md) — resolved separately from, and does not itself constitute, Rule 8 Assessment Finding GOV-1 (BDR) or GOV-2 (Architecture), each already addressed in their own governing documents. This section requires its own explicit Product Architect signature before an Implementation Plan may rely on it as settled, per the same discipline every other Rule-8-preceding Specification passage in this document already follows.

**(C) New Specification content — clarifies three items the original Business Worth Evolution Specification never addressed, because it was never scoped to "what if Capital Inicial creation is fully disabled," only to "what if it is no longer an establishment mechanism" (§1–§43 above, unamended by this section).**

### 44.1 Expected Current Stock Value — Terminology Correction Only

`10-expected-stock-value-amendment.md` Part 2's formula — `Confirmed Initial Capital + cost value of governed StockBatch inventory` — is **not amended by this section.** It already degrades correctly, and without error, to `0 + totalInvestmentValueAllTime` for a business with no Capital Inicial (documented in that amendment's own Part 2 as an intentional, non-error value). **What is clarified:** the user-facing explanatory copy currently shown alongside this comparison (`PeriodicStockCountView.tsx`) explicitly names "Capital Inicial" in its explanation. For any business retired from the Capital Inicial creation path (BDR Decision 39(a)) — which, going forward, is every business — this copy must not reference a concept that business will never have. The replacement copy must describe the comparison in terms that hold whether or not a historical Capital Inicial value happens to be part of it (e.g., referring to "purchase-cost inventory recorded to date" rather than naming Capital Inicial specifically), while a legacy business that *does* still have a historical Capital Inicial contributing to this figure continues to see it correctly reflected in the number itself — only the explanatory text changes, never the arithmetic.

**FR-70 [new].** The explanatory text accompanying the Expected Current Stock Value comparison must not name "Capital Inicial" for any business without a preserved historical Capital Inicial record, and must remain accurate (not merely silent) for any business that has one. No change is authorized to the underlying `expectedCurrentStockValue` formula itself.

### 44.2 Product Memory — Explicit Preservation Statement

`productMemoryPriceResolution.ts`'s existing treatment of a historical Capital Inicial confirmation as a valid "last remembered price" source, on equal footing with a periodic Contagem confirmation, is **preserved, unchanged, by BDR Decision 39(b)'s unconditional historical-preservation guarantee.** No code change is required or authorized by this section — this is a declarative confirmation, not a new functional requirement, recorded here only so the dependency is documented rather than silently assumed.

**FR-71 [new, declarative only].** No change may be made to `productMemoryPriceResolution.ts`'s treatment of historical `initial`-type `StockCount` confirmations as a valid price-memory source, as a consequence of Capital Inicial's retirement. This function's behavior is unaffected because no historical record it reads is ever deleted (BDR Decision 39(b)).

### 44.3 State 1a — Permanent Legacy Accommodation, Not Sunset

Case B of the shared Current/Estimated Business Worth calculation (§9, unamended by this section) — the pre-snapshot Estimated Business Worth formula for a business with a preserved historical Capital Inicial — **remains exactly as specified, permanently, for as long as any business remains in State 1a.** Per BDR Decision 39(e): no new business may enter State 1a after Capital Inicial's retirement (since no new Capital Inicial can be created), but no pre-existing State-1a business is force-migrated, auto-converted, or time-boxed out of it. Each such business exits State 1a only at its own first post-retirement Contagem or Owner-Declared Business Worth, whenever that occurs, or never, if it never occurs.

**FR-72 [new, declarative only].** `getEstimatedBusinessWorth`'s Case B branch must not be removed, time-boxed, or altered to force a transition, as a consequence of Capital Inicial's retirement. It remains fully specified and operative for its existing population indefinitely.

**Clarification, added 31 August 2026 [additive; does not alter the two paragraphs above, FR-72, or §9's arithmetic] — Case B reads historical data; it does not establish Business Worth with it.** This Specification uses "establish"/"establishment" with one fixed, authoritative meaning throughout — the production of a `BusinessWorthSnapshot` (§8; §14; BDR Decision 1 as corrected, Decision 36). Precisely:
- Case B's Estimated Business Worth figure is a **read** of historical Capital Inicial data as a starting term in a calculation — it is not, and does not produce, a `BusinessWorthSnapshot`, and therefore cannot be, and is not, a Business Worth establishment event under any circumstance.
- Case B exists **precisely because** a State 1a business's Business Worth has **not yet** been established under this model. It is the specified behavior for that pre-establishment state, not an alternate or lesser form of establishment, and not a third establishment method alongside Contagem and Owner-Declared Business Worth — BDR Decision 1 (as corrected) and FR-2 (as amended) each already fix the count of establishment methods at exactly two, and this clarification does not add a third.
- Per BDR Decision 39(a), Capital Inicial creation is disabled outright — there is no future event, historical-data-reading or otherwise, by which a Capital Inicial confirmation could establish Business Worth, even in principle, for any business.
- This clarification does not imply, authorize, or foreshadow removing Case B — it exists to prevent exactly that misreading. State 1a remains, per BDR Decision 39(e) and this section's own heading, a permanent, closed legacy accommodation.

**Acceptance of this §44.3 clarification — Recorded, 31 August 2026.** Recorded additively below, per this repository's established signature-recording convention — nothing above this line is altered.

> I ACCEPT THE CLARIFICATION.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ ACCEPTED AS CLARIFIED

This acceptance specifically confirms: (1) historical Capital Inicial data may continue to be read for legitimate legacy purposes; (2) reading it is not the same as establishing Business Worth with it; (3) Case B uses historical Capital Inicial only as a starting term for an Estimated Business Worth figure for the legacy State 1a population; (4) Case B does not produce a `BusinessWorthSnapshot`; (5) Case B is not a third Business Worth establishment method; (6) establishment remains exclusively confirmed Contagem or Owner-Declared Business Worth; (7) Capital Inicial remains retired as an active Business Worth establishment mechanism; (8) Case B remains a permanent, closed legacy accommodation; (9) the Case A and Case B arithmetic is unchanged. **This signature accepts this §44.3 clarification only. It does NOT authorize implementation, any code change, any test change, any `firestore.rules`/`firestore.indexes.json` change, an Implementation Plan, or an Implementation Authorization — each remains a separate, later, explicitly-gated step. §44's own overall Accepted/Draft status (see its header) is unaffected by this narrower acceptance of the clarification paragraph alone.**

### 44.4 What This Section Does Not Do

This section does not amend §9's formulas (Case A or Case B arithmetic), §14's Contagem mechanics, §10–§12's Cash/Receivables/Payables model, or §42/§43's Owner-Declared Business Worth/Owner Investment mechanics — all confirmed unaffected by Capital Inicial's retirement and out of this section's scope. It does not authorize any code, test, `firestore.rules`, or `firestore.indexes.json` change — per this Specification's own standing discipline, that remains reserved for a Rule 8 Assessment (already complete, `capital-inicial-retirement-rule8-assessment.md`) and a subsequent Implementation Plan (not yet drafted).

### 44.5 Product Architect Acceptance — Pending

> I have reviewed §44 (Capital Inicial Retirement: Specification Clarification), covering the Expected Current Stock Value terminology correction (44.1), the Product Memory preservation statement (44.2), and the State 1a permanent-legacy-accommodation clarification (44.3). I confirm this introduces no new Business Worth formula, ceiling, or double-counting rule beyond what BDR Decision 39 and the signed Decision Proposal already settled.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ ACCEPTED &nbsp;&nbsp; ☐ ACCEPTED WITH MODIFICATIONS (specify) &nbsp;&nbsp; ☐ NOT ACCEPTED
