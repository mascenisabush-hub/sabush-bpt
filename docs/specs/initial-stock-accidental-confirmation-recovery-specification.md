Business Domain Specification

# Initial Stock Accidental Confirmation Recovery Specification ("Void & Redo")

Version 0.1 (Draft)
**Status:** ✅ **Accepted** by the Product Architect (SABUSHIMIKE MASCENI) — see §23 for the recorded acceptance. **Implementation status: NOT AUTHORIZED.** Acceptance of this Specification is a governance action, not an Implementation Authorization — a Rule 8 Assessment and a signed Implementation Authorization remain the required next gates, in that order, per `19-governance-bdr-policy-framework.md` §3, neither of which this document performs or authorizes.
**Governed by:** [`BDR-0015`](./BDR-0015-initial-stock-accidental-confirmation-recovery.md) (Approved, Decisions A–H recorded verbatim in its §9) and [`POL-0008`](./POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) (Approved, Rules A–L, including the 3-recovery-cycle/4-confirmation-event ceiling recorded as Decision 5). **This Specification does not re-decide anything those two documents already resolved** — it translates their accepted business/policy decisions into functional requirements and acceptance criteria, ready for Rule 8 assessment, per `19-governance-bdr-policy-framework.md` §3's governing hierarchy (`BDR → Policy → Module Specifications → Rule 8 → Implementation`).
**Depends on:** [Stock Counts (spec #10)](./10-stock-counts.md) — this Specification extends Initial Stock's existing Draft → Editable → Confirmed workflow and directly closes the gap that spec's own Functional Requirement 6 already named as "not implemented — unchanged, still open" (a post-confirmation correction path for a mistaken Stock Count); [`BDR-0014`](./BDR-0014-initial-stock-dual-valuation-basis.md) and its accepted Specification and companion amendments ([`10-initial-stock-dual-valuation-basis-amendment.md`](./10-initial-stock-dual-valuation-basis-amendment.md), [`02-capital-growth-dual-basis-amendment.md`](./02-capital-growth-dual-basis-amendment.md), [`initial-stock-dual-valuation-basis-specification.md`](./initial-stock-dual-valuation-basis-specification.md)) — this Specification reuses that dual-valuation mechanism unmodified for both the original and every redo confirmation; [Business Worth Engine (spec #2)](./02-business-worth-engine.md) — for the unchanged `businessWorth` formula and the `capitalGrowth` read-path this Specification's Recovery flow ultimately affects.
**This document does not:** modify or reinterpret `BDR-0015`, `POL-0008`, `BDR-0014`, either of `BDR-0014`'s companion amendments, its accepted Specification, `02-core-product-principles.md` (Principle 2.10), `10-stock-counts.md`, `10-initial-stock-valuation-history-amendment.md`, `02-business-worth-engine.md`, or any other existing artifact. It is additive to, and consistent with, all of the above.
**Location note:** Filed in `docs/specs/`, unprefixed — cross-cutting between Module #10 (Stock Counts) and Module #2 (Business Worth Engine), following the same pattern `initial-stock-dual-valuation-basis-specification.md` and `product-memory-purchase-selling-valuation-specification.md` already established for a cross-cutting Specification tied to its own BDR/Policy lineage.

> **⚠️ Amendment Notice:** this document's recovery-window figure — **30
> minutes** — has been amended to **12 hours** by the
> [Recovery Window Amendment](./initial-stock-accidental-confirmation-recovery-window-amendment.md).
> This affects the Recovery Window glossary entry, Business Rules 2/6/10,
> Invariant I-3, FR-2/FR-8/FR-16, the Acceptance Criteria, and the §21
> Confirmation #4 Clarification. Measurement, no-restart, and no-extension
> are unchanged. Every other functional requirement and acceptance
> criterion remains exactly as originally accepted. The original text below
> is preserved unedited as the historical record of the original decision.

---

## 1. Status / Purpose

This Specification translates `BDR-0015`'s approved business decision (Void & Redo, Decisions A–H) and `POL-0008`'s approved operational rules (Rules A–L, including the 3-recovery-cycle ceiling) into functional requirements ready for Rule 8 assessment. It resolves nothing either document did not already resolve; every requirement below traces directly to a named Decision or Rule.

**Business context this Specification exists to serve** (restated from `BDR-0015` §1, not re-decided): confirming Initial Stock is a one-time, high-stakes action — `10-stock-counts.md`'s own Functional Requirement 6 already documents that "a post-confirmation correction path for a mistaken Stock Count of any type... remains not implemented — unchanged, still open." An Owner who accidentally confirms before the draft is correct today has no recovery path at all; the confirmed record is immediately and permanently frozen, exactly as Principle 2.10 requires, with no distinction between "correct and final" and "accidental." This Specification exists to close exactly that gap, within the narrow, time-boxed, Owner-only exception `BDR-0015` authorizes — nothing broader.

Every requirement below is labeled, following the convention `initial-stock-dual-valuation-basis-specification.md` established:

- **[ESTABLISHED]** — already an accepted, binding business decision elsewhere in this repository (`BDR-0014`, `10-stock-counts.md`); this Specification only restates or extends it.
- **[ACCEPTED]** — a business/policy decision `BDR-0015` or `POL-0008` establishes; this Specification turns it into a functional requirement.
- **[SPECIFICATION-LEVEL]** — a requirement this document itself introduces to make an accepted decision concretely testable, without introducing any new business decision of its own.

## 2. Scope

**In scope:** the functional behavior of recovering an accidental Initial Stock confirmation via Void & Redo, for the `initial` Stock Count only, within `BDR-0015`/`POL-0008`'s approved boundaries — recovery flow, confirmation/redo lifecycle states, history/audit visibility, calculation read-path switching, Owner-only permissions, expiry behavior, the 3-recovery-cycle ceiling, and accidental-confirmation-prevention functional requirements.

**Out of scope** (see §18 for the full list): any technical implementation (schema, timestamps, security rules, transactions, draft-storage mechanism, UI layout, API design, algorithms, migration); any change to Periodic Contagem, Add Stock, Product Memory, or `businessWorth`'s own formula; any change to the dual-valuation-basis mechanism itself (reused, not redesigned).

## 3. Terminology — Preserved, Not Redefined

Restated verbatim in substance from `POL-0008`'s own Terminology section, because this distinction is load-bearing throughout this Specification:

**Initial Stock** means the products physically counted when a business establishes its Initial Capital baseline — the confirmed `type: 'initial'` `StockCount` (`10-stock-counts.md` Purpose; Architecture §3.8.3, §8.6; Principle 2.10). **Initial Stock is not, and this Specification does not treat it as, the first supplier stock batch (`StockBatch`) entered via Add Stock after Initial Capital has already been established.** Every functional requirement below applies exclusively to the `initial` Stock Count and its confirmation event(s) — never to an ordinary purchase/restock event, regardless of how early in a business's lifecycle that purchase occurs. Void & Redo has no bearing on, and this Specification creates no analogous recovery mechanism for, any `StockBatch` entry.

## 4. Conceptual Vocabulary — Fixed Terms

None of these definitions is new; each traces to already-accepted `BDR-0015`/`POL-0008` governance, made concrete for this Specification's own functional requirements.

- **Confirmation event [ESTABLISHED, extended]** — a single act of confirming an `initial` Stock Count. Prior to this capability, a business could have at most one, ever. Under this capability, a business may have between one and four confirmation events over its lifetime, in a strict sequence (§9, Chain-Ceiling Behavior).
- **Original confirmation** — Confirmation #1: the first confirmation event for a business's Initial Stock.
- **Redo confirmation** — any confirmation event (#2, #3, or #4) produced by a Void & Redo recovery of the immediately preceding confirmation event.
- **Recovery cycle [ACCEPTED — `POL-0008` Decision 5]** — one completed act of voiding a confirmation event and producing its replacement. A single Initial Stock setup permits at most 3 recovery cycles, hence at most 4 confirmation events.
- **Recovery window [ACCEPTED — `BDR-0015` Decision B; `POL-0008` Rule B, Rule J]** — the 30-minute period, beginning at a given confirmation event's own frozen confirmation timestamp, during which that specific confirmation event may be voided and redone. Every confirmation event — original or redo — has exactly one recovery window of its own.
- **Voided confirmation [ACCEPTED — `BDR-0015` Decision D; `POL-0008` Rule D]** — a confirmation event that has been recovered via Void & Redo. Permanently preserved, never edited or deleted, explicitly and permanently marked as voided.
- **Active confirmation** — the most recent confirmation event in a business's chain that has not (yet, or ever) been voided. At most one confirmation event is active at any time.
- **Pre-confirmation draft state [ACCEPTED — `BDR-0015` Decision C; `POL-0008` Rule C]** — the exact set of products, portions, quantities, units, cost prices, and selling prices the Initial Stock draft (`10-stock-counts.md`'s existing `stockCountDrafts/initial` mechanism) contained immediately before a given confirmation event.
- **Selected Initial Capital basis [ESTABLISHED — `BDR-0014` Decision 2]** — the per-confirmation-event, frozen cost/selling pointer `BDR-0014` already governs. This Specification does not alter what this term means; it only requires (§15, FR-23) that every confirmation event, including every redo, makes its own independent instance of this same, unmodified choice.

## 5. Business Rules

*(Each traces to a named `BDR-0015` Decision or `POL-0008` Rule; none introduces a new business decision beyond what those two documents already resolved.)*

1. **[ACCEPTED — `BDR-0015` Decision A; `POL-0008` Rule A]** Void & Redo is the only recovery mechanism for an accidental Initial Stock confirmation. No other recovery path exists.
2. **[ACCEPTED — `BDR-0015` Decision B; `POL-0008` Rule B]** Each confirmation event's own recovery window is exactly 30 minutes, measured from that confirmation event's own frozen timestamp — not restartable, not extendable, by any actor or mechanism.
3. **[ACCEPTED — `BDR-0015` Decision C; `POL-0008` Rule C]** Recovering a confirmation event restores the Owner to the exact pre-confirmation draft state for that event — nothing added, removed, or altered by the recovery action itself.
4. **[ACCEPTED — `BDR-0015` Decision D; `POL-0008` Rule D]** A voided confirmation event is never edited or deleted. It remains permanently visible in audit/history, explicitly and permanently marked voided.
5. **[ACCEPTED — `BDR-0015` Decision E; `POL-0008` Rule E]** Triggering Void & Redo is Owner-only. Manager and Staff cannot trigger or initiate it, regardless of any future Manager-tier permission grants elsewhere.
6. **[ACCEPTED — `BDR-0015` Decision F; `POL-0008` Rule F]** Once a confirmation event's own 30-minute window elapses, that confirmation event is permanently final with respect to this mechanism — no recovery path exists after that point, under any circumstance.
7. **[ACCEPTED — `BDR-0015` Decision G; `POL-0008` Rule G]** Once a redo confirmation exists, it — and only it — is the Initial Stock confirmation that Capital Growth and current business-state calculations read. A voided confirmation is never read by any live calculation.
8. **[ACCEPTED — `BDR-0015` Decision H; `POL-0008` Rule H]** A confirmation event's own Selected Initial Capital basis is permanently unchangeable, including during its own recovery window. Each redo confirmation makes its own independent, freshly-chosen basis selection, governed by the unmodified `BDR-0014` mechanism — never inherited, defaulted, or carried over from the voided confirmation it replaces.
9. **[ACCEPTED — `POL-0008` Rule I]** No mechanism satisfying Rules 1–8 above may, as a side effect, edit, delete, or silently reinterpret any historical fact of a voided confirmation, including its voided marker once set.
10. **[ACCEPTED — `POL-0008` Rule J; Decision 5]** Every confirmation event — original or redo — independently receives its own recovery window (Business Rule 2), **but a single Initial Stock setup permits at most 3 recovery cycles, and therefore at most 4 confirmation events.** The 4th confirmation event, if reached, still receives its own independent 30-minute recovery window like every confirmation before it, for accurate lifecycle/visibility semantics (Business Rule 11) — **but Void & Redo is not available against it: the Owner cannot void it through this mechanism, under any circumstance, and it therefore remains active and unchanged unless and until its window simply expires (Business Rule 6).** This is a clarification of `POL-0008` Decision 5's own text ("Confirmation #4 may not itself be voided and redone") — the ceiling forecloses the entire Void & Redo operation against Confirmation #4, not merely the creation of a 5th confirmation event. It does not change the independent-window rule for Confirmations #1–#3, does not change the 3-cycle/4-confirmation-event ceiling itself, does not create an additional recovery cycle, and does not authorize any new recovery mechanism.
11. **[ACCEPTED — `POL-0008` Rule K]** The Owner must be clearly informed that a recovery window exists and, while open, that it is currently active — a business/functional requirement only.
12. **[ACCEPTED — `POL-0008` Rule L]** Once a confirmation event's own recovery window elapses without recovery, its associated pre-confirmation draft state has no continuing recovery purpose — a business fact only; retention/deletion mechanism is not decided here.
13. **[ESTABLISHED, restated — `BDR-0014` Decisions 1–2, 5–6]** Every confirmation event, original or redo alike, preserves both a cost valuation and a selling valuation, and requires the Owner to select which is treated as Initial Capital for that event — the identical, unmodified mechanism `BDR-0014` already governs for any Initial Stock confirmation, applied independently to each confirmation event in the chain.
14. **[ESTABLISHED, restated — `10-stock-counts.md`]** The existing pre-confirmation draft mechanism (`stockCountDrafts/initial`) is not itself Initial Capital, is not read by `initialCapitalValue`, and does not participate in Business Worth, Capital Growth, or Expected Current Stock Value while unconfirmed. This Specification does not alter that boundary — it only adds a functional requirement (FR-3) that a draft-equivalent state must be reconstructible after a confirmation event is voided.

## 6. Invariants

These must hold at every point in time, for every business, without exception. Rule 8 assessment must demonstrate each is enforceable by the eventual technical design, not merely true by convention.

- **I-1 (At most one active confirmation).** At any given moment, a business has at most one active `initial` Stock Count confirmation — the most recent non-voided one. Every calculation consumer (§11) reads that one, and only that one.
- **I-2 (Voided is permanent and one-way).** Once a confirmation event is marked voided, it can never become active again, never be un-voided, and never be edited. This applies identically to Confirmation #1, #2, and #3 — the only confirmation events that can ever become voided (I-5) — a voided confirmation's status is final the moment it is set, independent of the overall chain's later outcome.
- **I-3 (Each confirmation event's window is independent).** A confirmation event's own 30-minute recovery window is a property of that specific confirmation event alone — never shared, pooled, averaged, or transferred across confirmation events in the same chain.
- **I-4 (The ceiling counts recovery cycles, not confirmation events, but bounds both — and blocks the entire operation, not merely the next confirmation).** The Owner may complete at most 3 successful recoveries (recovery cycles) for a single Initial Stock setup. Because each recovery cycle produces exactly one new confirmation event, this necessarily bounds the chain at exactly 4 confirmation events maximum (1 original + at most 3 redos). A technical design that (a) permits a 4th recovery cycle, (b) permits a 5th confirmation event through this mechanism, or (c) permits Confirmation #4 to become voided at all through this mechanism (see I-5), violates this invariant regardless of how it is framed. The ceiling blocks the entire Void & Redo operation against Confirmation #4 — not merely the creation of a 5th confirmation.
- **I-5 (The 4th confirmation's own window exists for visibility/measurement only; Void & Redo cannot succeed against it at all).** The ceiling in I-4 does not mean the 4th confirmation event has no recovery window — Business Rule 10 is explicit that it does, per the ordinary per-confirmation-event rule (Business Rule 2), and FR-21's visibility requirement still applies to it. **What the ceiling forecloses is the entire Void & Redo action against Confirmation #4 — not merely its ability to produce a 5th confirmation.** Confirmation #4 can never become voided through this mechanism, under any circumstance; every attempt against it is a failed attempt (FR-25), never a successful void (FR-26 cannot apply to it). A technical design must not describe or implement this as "the 4th confirmation has no recovery window" (that would contradict `POL-0008` Rule J/FR-21), and must equally not describe or implement it as "the void step can succeed but the redo cannot" (that would contradict `POL-0008` Decision 5's own text — "Confirmation #4 may not itself be voided and redone" — and this Specification's FR-8).
- **I-6 (No basis inheritance across the chain).** No confirmation event's Selected Initial Capital basis is ever copied, defaulted, or inherited from any earlier confirmation event in the same chain — including from the immediately preceding voided confirmation it replaces. Each confirmation event's basis selection is independently made, per the unmodified `BDR-0014` mechanism.
- **I-7 (`businessWorth` is untouched).** No requirement in this Specification adds, removes, or modifies any term in `businessWorth`'s formula. This Specification's read-path effect is scoped entirely to which confirmation event `initialCapitalValue` resolves from — never to `businessWorth` itself.
- **I-8 (Historical facts of every voided confirmation remain frozen).** For every voided confirmation in a chain (there may be up to 3 in a fully-consumed chain), its raw per-portion facts, both valuation totals, its Selected Initial Capital basis, its own confirmation timestamp, and its voided marker are all permanently frozen from the moment each respective fact is set — with the same immutability discipline `BDR-0014`/`10-stock-counts.md` already apply to a single, never-voided confirmation.

## 7. Functional Requirements — Recovery Flow

**FR-1 — Void & Redo is the sole recovery path.** The system must expose exactly one recovery mechanism for an accidental Initial Stock confirmation — Void & Redo — and must not expose or permit any alternate correction path (direct edit, administrative override, or otherwise) for a confirmed `initial` Stock Count. *(Business Rule 1)*

**FR-2 — Recovery is available only within the active confirmation's own window, and only if the 3-recovery-cycle ceiling has not yet been reached.** The system must permit a Void & Redo attempt only against the current active confirmation, only while that confirmation's own 30-minute recovery window (measured from its own confirmation timestamp) has not yet elapsed, and only if fewer than 3 recovery cycles have already been completed for that Initial Stock setup. **If the ceiling has already been reached (i.e., the active confirmation is Confirmation #4), no attempt can succeed, regardless of whether its window is still open (FR-8).** *(Business Rule 2, 10; I-1, I-3, I-4, I-5)*

**FR-3 — Recovery restores the exact pre-confirmation draft state.** Triggering a successful Void & Redo must present the Owner with a draft state functionally identical to what the Initial Stock draft contained immediately before the confirmation being voided — same products, portions, quantities, units, cost prices, and selling prices, with nothing silently added, removed, or altered. *(Business Rule 3)*

**FR-4 — The Owner may edit the restored draft before reconfirming.** After a successful Void & Redo, the Owner must be able to freely add to, edit, and remove from the restored draft — exactly as the existing pre-confirmation draft workflow (`10-stock-counts.md`) already permits for a first-time, never-confirmed draft — before choosing to confirm again. *(Business Rule 3, restated `10-stock-counts.md` existing draft behavior)*

## 8. Functional Requirements — Confirmation and Reconfirmation Behavior

**FR-5 — A redo confirmation is a full, independent confirmation event.** Reconfirming after a Void & Redo must produce a new confirmation event, subject to every functional requirement that applies to any Initial Stock confirmation — including its own recovery window (FR-2), its own independent dual-valuation-basis selection (FR-23), and its own status as the new active confirmation (I-1, FR-12). It must not be treated as a partial, provisional, or lesser confirmation. *(Business Rule 10; I-6)*

**FR-6 — No basis, or other prior selection, is inherited by a redo confirmation.** A redo confirmation's Selected Initial Capital basis, and any other confirmation-time choice this or future capability introduces, must be freshly made by the Owner at that confirmation event's own moment of confirmation — never pre-filled from, defaulted to, or silently copied from the voided confirmation it replaces. *(Business Rule 8; I-6)*

## 9. Functional Requirements — Chain-Ceiling Behavior

**FR-7 — At most 3 recovery cycles per Initial Stock setup.** The system must track, per business, how many recovery cycles have been completed for its Initial Stock setup, and must prevent a 4th recovery cycle from occurring once 3 have been completed. *(Business Rule 10; I-4)*

**FR-8 — Once the ceiling is reached, Void & Redo is entirely unavailable for the resulting confirmation event — not merely incapable of producing a replacement.** If a business reaches its 4th confirmation event (having completed 3 recovery cycles), that confirmation event must still receive its own 30-minute recovery window, measured from its own timestamp, exactly as every confirmation event before it, for accurate lifecycle/visibility semantics (Business Rule 11, FR-21) — **but Void & Redo is not available for that confirmation event: the Owner cannot void it through this mechanism, under any circumstance, while the window is open or otherwise.** The confirmation event remains active and completely unchanged. **The system must not represent or behave as though the 4th confirmation event has no recovery window** — Business Rule 10/FR-21's visibility requirement still applies to it — **but the window's function for that confirmation event is display/measurement only: no attempt to invoke Void & Redo against it can succeed, and none can cause it to become voided.** This is a clarification of the ceiling `POL-0008` Decision 5 already establishes ("Confirmation #4 may not itself be voided and redone") — not a new rule and not a narrowing of the independent-window guarantee (Business Rule 2, 10) that still governs Confirmations #1–#3. *(Business Rule 10; I-4, I-5)*

## 10. Functional Requirements — History and Audit Behavior

**FR-9 — Every confirmation event in a chain remains permanently visible.** The system must retain and permanently display, in audit/history, every confirmation event a business's Initial Stock setup has ever had — up to 4 in a fully-consumed chain — including every voided one. *(Business Rule 4, 9; I-8)*

**FR-10 — Voided confirmations are unambiguously distinguishable from the active confirmation.** Any consumer capable of displaying Initial Stock history (audit views, reports, SuperAdmin diligence views) must be able to distinguish, for every confirmation event in a chain, whether it is voided or active — without ambiguity, and without requiring the viewer to infer status from timestamps or other indirect evidence. *(Business Rule 4)*

**FR-11 — Historical facts of a voided confirmation are never rewritten.** No functional pathway introduced to satisfy FR-1 through FR-8 may cause any historical fact of a voided confirmation event — its raw per-portion facts, either valuation total, its Selected Initial Capital basis, its confirmation timestamp, or its voided marker — to be altered after that fact is first set. *(Business Rule 9; I-8)*

## 11. Functional Requirements — Calculation / Current-State Read Behavior

**FR-12 — Capital Growth and current-business-state calculations read only the active confirmation.** Every existing consumer of `initialCapitalValue`/the confirmed Initial Stock record — as already enumerated by `BDR-0014` §4 item 4 and `02-capital-growth-dual-basis-amendment.md` (`capitalGrowth`/`capitalGrowthPct`, Dashboard, Reports) — must, once a redo confirmation exists, resolve to that redo confirmation and never to any voided confirmation in the same chain. This Specification does not introduce, and does not need to introduce, any new consumer beyond this already-established set. *(Business Rule 7; I-1)*

**FR-13 — A voided confirmation is never read by any live calculation.** No functional pathway may cause `initialCapitalValue`, `capitalGrowth`, or any other current-business-state figure to read from a voided confirmation once a later, active confirmation exists for that business. *(Business Rule 7; I-1, I-8)*

## 12. Functional Requirements — Permissions / Actor Behavior

**FR-14 — Void & Redo is Owner-only, at every layer.** The system must permit only the Owner to trigger, view as an available action, or otherwise initiate any part of Void & Redo — matching the authorization tier every other capital-affecting action in this schema already requires (Initial Stock confirmation itself, Withdrawals, Closings) — regardless of any future Manager-tier permission grants elsewhere in the system. *(Business Rule 5)*

**FR-15 — Manager and Staff have no visibility into Void & Redo as an available action.** Consistent with FR-14, the system must not present the recovery flow as an available or discoverable action to Manager or Staff roles. *(Business Rule 5)*

## 13. Functional Requirements — Expiry Behavior

**FR-16 — Expiry is unconditional and permanent, per confirmation event.** Once a confirmation event's own 30-minute window elapses, the system must treat that confirmation event as completely and permanently final with respect to this mechanism — no soft warning state, no grace period, no manual override, regardless of Owner request or any future support escalation short of a new Product Architect decision reopening this question at the BDR level. *(Business Rule 6)*

**FR-17 — An expired, unused pre-confirmation draft state has no continuing recovery purpose.** Once a confirmation event's own window elapses without recovery, the system must treat the draft state associated with that window (FR-3's subject) as functionally irrelevant to any future recovery for that confirmation event. *(Business Rule 12 — retention/deletion mechanism explicitly deferred to Rule 8, §17)*

## 14. Functional Requirements — Accidental-Confirmation Prevention

*(Functional requirements only, per `BDR-0015`'s own stated motivation of reducing accidental confirmation in the first place — none of these decides visual design, wording, or component architecture.)*

**FR-18 — The Confirm action must be deliberately positioned to reduce accidental activation.** The Initial Stock confirmation flow's functional design must treat the Confirm action as a deliberate, distinguishable step from ordinary draft-editing actions — not a place where an ordinary editing tap or click could plausibly trigger it by mistake. *(Exact placement, sizing, and visual treatment are Rule 8/UI-design questions, §17.)*

**FR-19 — Confirmation requires an explicit secondary confirmation step.** The system must require the Owner to explicitly acknowledge, in a distinct step or dialog, that they are about to confirm Initial Stock, before the confirmation becomes final. *(Exact wording, component, and interaction design are Rule 8/UI-design questions, §17.)*

**FR-20 — The Owner must be informed that confirmation is consequential.** At the point of confirmation, the system must communicate to the Owner that this action establishes their Initial Capital baseline and is subject only to the narrow, time-boxed Void & Redo exception — not that it is freely reversible. *(Exact wording is a Rule 8/UI-design question, §17.)*

**FR-21 — The recovery window's existence and active status must be discoverable throughout its duration.** Consistent with Business Rule 11, the system must make it possible for the Owner to become aware, at any point during an active recovery window, that recovery is currently available for that confirmation event — the Owner must not be required to already know the capability exists and separately seek it out with no system-provided cue. *(Exact notification channel, wording, and countdown mechanism are Rule 8/UI-design questions, §17.)*

## 15. Functional Requirements — Dual-Valuation Integration

**FR-22 — Every confirmation event preserves both valuation totals.** Every confirmation event in a chain — original or redo — must compute and preserve both a cost valuation and a selling valuation, exactly as the unmodified `BDR-0014`/`initial-stock-dual-valuation-basis-specification.md` mechanism already requires for any single Initial Stock confirmation. *(Business Rule 13; `BDR-0014` Decision 1)*

**FR-23 — Every confirmation event requires its own basis selection.** Before each confirmation event becomes final — the original and every redo alike — the Owner must be presented with the same cost/selling basis choice `BDR-0014` FR-2 already requires, for that confirmation event specifically. *(Business Rule 8, 13; `BDR-0014` Decision 2)*

**FR-24 — A confirmation event's basis, once set, is frozen exactly as `BDR-0014` already requires.** No requirement in this Specification weakens, bypasses, or creates any exception to `BDR-0014` FR-4's existing freeze-at-confirmation guarantee, for any confirmation event in a chain. *(Business Rule 8; `BDR-0014` Decision 4)*

## 16. Failure / Edge Cases

**FR-25 — A failed recovery attempt leaves the active confirmation unchanged.** If a Void & Redo attempt fails for any reason (window already expired, ceiling already reached, non-Owner actor, or any technical failure), the currently active confirmation must remain exactly as it was — never partially voided, never left in an ambiguous state. **This is the governing requirement for any Void & Redo attempt against Confirmation #4 once the 3-recovery-cycle ceiling is reached (FR-8): such an attempt is a failed attempt under this requirement, full stop — it never reaches, and can never satisfy, FR-26's "successfully triggers Void & Redo" premise.** *(Business Rule 1, 6, 10; I-2, I-4, I-5)*

**FR-26 — A failed reconfirmation after a successful void (Confirmations #1–#3 only) leaves the business without an active Initial Stock confirmation, not with a reverted void.** For a recovery cycle that is permitted to begin (voiding Confirmation #1, #2, or #3, per FR-7's ceiling not yet being reached), if the Owner successfully triggers Void & Redo — voiding the prior confirmation — but does not complete reconfirmation before some other, unrelated failure occurs (e.g. a technical failure interrupting the flow), the voided confirmation must not be un-voided or restored to active status as a fallback — Invariant I-2 (voided is permanent and one-way) applies regardless of whether a replacement is ever produced. **This scenario cannot occur for Confirmation #4: per FR-8, Confirmation #4 can never be successfully voided in the first place, so this requirement's premise — "successfully triggers Void & Redo, voiding the prior confirmation" — is never satisfied once the 3-recovery-cycle ceiling has been reached. An attempt against Confirmation #4 is governed by FR-25 (failed attempt, active confirmation unchanged), never by this requirement.** The precise operational consequence for a business left without an active Initial Stock confirmation following an interrupted recovery of #1–#3 (e.g., what a business "looks like" in that state) requires Rule 8 clarification — not decided here. *(Business Rule 4, 10; I-2)*

**FR-27 — Concurrent or near-simultaneous recovery/confirmation attempts must not produce more than one active confirmation, or more than 4 total confirmation events, and must never leave the business with zero active Initial Stock as a consequence of a ceiling-blocked attempt.** This is stated as a business requirement (Invariants I-1, I-4, I-5 must hold even under concurrent access) — in particular, no concurrency scenario may cause Confirmation #4 to become voided (FR-8's guarantee must hold even under a race), since that is the specific mechanism by which a business could otherwise be left without an active confirmation. The exact concurrency-safety mechanism achieving this is explicitly a Rule 8 question (§17).

## 17. Explicit Rule-8 Technical Questions

*(Consistent with `BDR-0015` §5 and `POL-0008`'s own Scope Exclusions — this Specification identifies these as required future Rule 8 questions; it does not answer them, and no answer should be inferred from how a functional requirement above is phrased.)*

- Exact Firestore schema, document structure, and field names for a confirmation event, its voided marker, and its recovery-cycle count.
- How the original/redo linkage between confirmation events in a chain is represented.
- The authoritative timestamp mechanism for "a confirmation event's own timestamp" (server timestamp vs. client-submitted vs. any other mechanism) (Business Rule 2).
- Security Rules implementation of Owner-only, time-boxed recovery authorization, and of the 3-recovery-cycle ceiling's enforcement (FR-7, FR-14).
- Transaction design for the void-and-create-redo operation, including how FR-25/FR-27's failure/concurrency guarantees are technically achieved.
- The exact draft-storage mechanism achieving FR-3's exactness requirement — in particular, how a pre-confirmation draft state is made available for restoration given that today's existing `stockCountDrafts/initial` mechanism is deleted atomically with confirmation (`10-stock-counts.md`); this requires the technical design to either retain a recoverable copy at each confirmation event, reconstruct one from the confirmation event's own stored data, or some other mechanism — not decided here.
- Retention/deletion/archival mechanism for an expired, unused draft state (FR-17; `POL-0008` Rule L).
- API/server boundary design for triggering Void & Redo and for reconfirmation.
- The exact query/read-path mechanism by which FR-12's consumers locate "the active confirmation" for a business.
- Indexing requirements, if any, introduced by tracking multiple confirmation events per business.
- Migration/backfill strategy, if any is needed, for businesses whose Initial Stock predates this capability (expected: none, consistent with `BDR-0014`'s own prospective-only precedent, but not decided here).
- Exact UI component, layout, wording, visual treatment, countdown implementation, and notification channel for FR-18 through FR-21.
- FR-26's precise operational handling of an interrupted void-without-reconfirmation state.

## 18. Non-Goals / Explicit Exclusions

The following are deliberately **not** introduced, specified, or authorized by this document:

- Any recovery mechanism other than Void & Redo (contradicts FR-1).
- Any recovery path for Periodic Contagem, Add Stock, or any `StockBatch` entry (contradicts §3's Terminology boundary).
- Manager- or Staff-tier access to Void & Redo, under any circumstance (contradicts FR-14–FR-15).
- A 4th recovery cycle, or a 5th confirmation event produced through this mechanism, under any circumstance (contradicts FR-7, I-4).
- Any inheritance, default, or carry-over of a voided confirmation's Selected Initial Capital basis to its replacement (contradicts FR-6, I-6).
- Any redesign of the dual-valuation-basis mechanism itself — this Specification reuses `BDR-0014`'s existing mechanism unmodified, per confirmation event (contradicts FR-22–FR-24).
- Any change to `businessWorth`'s own formula (contradicts I-7).
- Any un-voiding, restoration-to-active, or editing of a voided confirmation (contradicts FR-11, I-2, I-8).
- Any Firestore schema, field name, `firestore.rules` change, timestamp implementation, transaction design, draft-storage mechanism, API design, or UI design — all remain Rule 8/Implementation Authorization questions (§14/§17), not decided here.
- Any change to Periodic Contagem's date/period model, comparison mechanism, or the `expectedCurrentStockValue` figure.
- Any change to `10-stock-counts.md`'s existing pre-confirmation draft behavior for a first-time (never-confirmed) Initial Stock draft, beyond what FR-3/FR-4 require for a post-void restoration.

## 19. Traceability Matrix

| Source | Item | Addressed by |
|---|---|---|
| `BDR-0015` §9 | Decision A (sole recovery path) | FR-1, Business Rule 1 |
| `BDR-0015` §9 | Decision B (30-min window, own timestamp, no restart/extend) | FR-2, Business Rule 2 |
| `BDR-0015` §9 | Decision C (exact pre-confirmation draft state) | FR-3, FR-4, Business Rule 3 |
| `BDR-0015` §9 | Decision D (original preserved, marked voided) | FR-9, FR-10, FR-11, Business Rule 4 |
| `BDR-0015` §9 | Decision E (Owner-only) | FR-14, FR-15, Business Rule 5 |
| `BDR-0015` §9 | Decision F (hard expiry, no exception) | FR-16, Business Rule 6 |
| `BDR-0015` §9 | Decision G (redo is sole read path) | FR-12, FR-13, Business Rule 7 |
| `BDR-0015` §9 | Decision H (original basis frozen; redo independent) | FR-6, FR-22–FR-24, Business Rule 8 |
| `POL-0008` | Rule A (sole recovery path) | FR-1 |
| `POL-0008` | Rule B (window measurement) | FR-2 |
| `POL-0008` | Rule C (draft exactness) | FR-3 |
| `POL-0008` | Rule D (voided marker) | FR-9, FR-10 |
| `POL-0008` | Rule E (Owner-only authorization) | FR-14, FR-15 |
| `POL-0008` | Rule F (hard expiry) | FR-16 |
| `POL-0008` | Rule G (sole read path) | FR-12, FR-13 |
| `POL-0008` | Rule H (independent frozen bases) | FR-6, FR-22–FR-24 |
| `POL-0008` | Rule I (no silent rewriting) | FR-11 |
| `POL-0008` | Rule J (independent windows; 3-cycle ceiling) | FR-7, FR-8, Business Rule 10 |
| `POL-0008` | Rule K (visibility) | FR-21 |
| `POL-0008` | Rule L (expired draft) | FR-17 |
| `POL-0008` | Decision 5 (chain ceiling: 3 cycles / 4 confirmations; Confirmation #4 not voidable) | FR-2, FR-7, FR-8, FR-25, FR-26, FR-27, I-4, I-5 |
| `BDR-0014` | Decisions 1–2, 5–6 (dual valuation, per-confirmation basis) | FR-22–FR-24, Business Rule 13 |
| `10-stock-counts.md` | FR-6 (post-confirmation correction — "still open") | This entire Specification |

## 20. Acceptance Criteria

1. Void & Redo is the only functional recovery path presented or permitted for an accidental Initial Stock confirmation (FR-1).
2. A recovery attempt succeeds only within the active confirmation's own, unexpired, unelapsed 30-minute window (FR-2).
3. A successful recovery presents the Owner with a draft state provably identical to the pre-confirmation state of the confirmation being voided (FR-3).
4. The Owner can freely edit the restored draft before reconfirming, identically to a first-time draft (FR-4).
5. A redo confirmation is functionally indistinguishable, in every requirement this Specification imposes, from any other confirmation event — it is never treated as partial or provisional (FR-5).
6. No confirmation event's basis selection is ever pre-filled, defaulted, or copied from another confirmation event (FR-6).
7. A business can complete at most 3 recovery cycles for its Initial Stock setup, and therefore have at most 4 confirmation events (FR-7).
8. The 4th confirmation event, if reached, still receives and functionally exhibits its own 30-minute recovery window for visibility/measurement purposes — but Void & Redo is entirely unavailable against it: it can never become voided through this mechanism, and it remains active and unchanged unless its window simply expires (FR-8, FR-25).
9. Every confirmation event a business has ever had, up to 4, remains permanently visible in history, with voided status unambiguous for each (FR-9, FR-10).
10. No historical fact of any voided confirmation is ever altered after being set (FR-11).
11. Once a redo confirmation exists, Capital Growth and every other identified current-business-state consumer reads exclusively from it, never from a voided confirmation (FR-12, FR-13).
12. Only the Owner can trigger, or see as available, any part of Void & Redo (FR-14, FR-15).
13. A confirmation event's expiry is unconditional, permanent, and admits no override (FR-16).
14. An expired, unused draft state is treated as having no further recovery purpose, without this Specification deciding its retention mechanism (FR-17).
15. The Confirm action, a secondary confirmation step, and consequence-messaging are all functionally required, without any visual/technical design being fixed here (FR-18–FR-20).
16. The active recovery window's existence is discoverable by the Owner throughout its duration, without this Specification deciding the notification mechanism (FR-21).
17. Every confirmation event preserves both valuation totals and requires its own basis selection, exactly per the unmodified `BDR-0014` mechanism (FR-22–FR-24).
18. Failure and concurrency edge cases (FR-25–FR-27) are named as business requirements, each with its precise technical resolution explicitly deferred to Rule 8 — including the explicit guarantee that the business must never be left with zero active Initial Stock as a consequence of a ceiling-blocked Void & Redo attempt against Confirmation #4 (FR-8, FR-25, FR-27), since such an attempt can never succeed in voiding it.
19. Every item in §17's Rule-8 Technical Questions list is genuinely undecided by this document — no implicit technical commitment can be found anywhere else in this Specification.
20. "Initial Stock" is never conflated with a `StockBatch`/Add Stock entry anywhere in this document (§3).

## 21. Product Architect Clarification — Confirmation #4 Ceiling Case (Recorded Verbatim)

**Status:** ✅ **Recorded**, following a governance-only contradiction review of this Specification's original FR-8/FR-26 drafting against `POL-0008` Decision 5's own text. **This is a clarification of the already-approved 3-recovery-cycle ceiling, not a new business decision, not an amendment to `POL-0008`, and not a new BDR.** It was verified, before recording, that `POL-0008` Decision 5's existing text — *"Confirmation #4 may not itself be voided and redone"* — already establishes this outcome; this record makes explicit what that text already states, correcting this Specification's own imprecise translation of it (§ prior FR-8/FR-26 wording).

> When the 3-recovery-cycle ceiling has already been reached and the business is on Confirmation #4:
> 1. Confirmation #4 still has its own independent 30-minute recovery window.
> 2. The existence and visibility of that window remain exactly as `POL-0008` requires.
> 3. However, Void & Redo is NOT available for Confirmation #4.
> 4. The Owner cannot void Confirmation #4 through the Void & Redo mechanism.
> 5. Therefore Confirmation #4 remains active and unchanged.
> 6. No Confirmation #5 may ever be created through this mechanism.
> 7. The business must never be left with zero active Initial Stock as a consequence of attempting Void & Redo after the 3-cycle ceiling has been reached.
> 8. The ceiling blocks the entire Void & Redo operation, not merely the creation of the next confirmation.
> 9. The 30-minute window on Confirmation #4 therefore exists for accurate lifecycle/visibility semantics, but it cannot result in a successful recovery because the recovery-cycle ceiling has already been consumed.
> 10. This decision does NOT change the independent 30-minute-window rule for Confirmations #1–#3.
> 11. It does NOT change the 3-cycle / 4-confirmation-event ceiling.
> 12. It does NOT create an additional recovery cycle.
> 13. It does NOT authorize any new recovery mechanism.

**Incorporated into:** FR-2, FR-8, FR-25, FR-26, FR-27, Business Rule 10, Invariants I-2, I-4, I-5, Acceptance Criteria 8 and 18, and the Traceability Matrix's Decision 5 row. `POL-0008` and `BDR-0015` are unmodified — this clarification only corrects this Specification's own prior imprecision in translating `POL-0008` Decision 5's already-approved text.

## 22. Governance Notes

- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` file is touched by this document.
- This Specification does not itself authorize implementation. A Rule 8 Assessment and a signed Implementation Authorization remain the required next gates, in that order, per `19-governance-bdr-policy-framework.md` §3.
- `BDR-0015`, `POL-0008`, `BDR-0014`, both of its companion amendments, and its accepted Specification are unmodified by this document.
- `docs/specs/README.md` is not modified by this document, consistent with prior artifacts in this lineage.
- This Specification is a functional-requirements document, not a Rule 8 Assessment and not an Implementation Authorization — it states *what* the system must do; Rule 8 will determine *how* it safely does so.

## 23. Product Architect Acceptance

**Status:** ✅ **Accepted.** The Product Architect has reviewed this Specification in full, including §21's Product Architect Clarification on the Confirmation #4 ceiling case, and confirms the following as accurately reflected by this document:

> I have reviewed the corrected Initial Stock Accidental Confirmation Recovery Specification in full, including the Product Architect Clarification regarding Confirmation #4 and the 3-recovery-cycle ceiling.
>
> I ACCEPT the Specification as written.
>
> I confirm that:
> - Void & Redo is the sole recovery mechanism.
> - Each confirmation event has its own 30-minute window.
> - Maximum recovery cycles are 3, producing at most 4 confirmation events.
> - Confirmation #4 retains its own visible 30-minute window, but Void & Redo is completely unavailable against it.
> - Confirmation #4 cannot be voided through this mechanism and no Confirmation #5 can be created.
> - A ceiling-blocked recovery attempt can never leave the business without an active Initial Stock confirmation.
> - Every redo has an independent Cost/Selling basis selection.
> - Voided confirmations remain permanently preserved and immutable.
> - Capital Growth/current-state calculations read only the active confirmation.
> - The accidental-confirmation safeguards (safe Confirm placement, explicit secondary confirmation, and consequence messaging) are included.
> - No change to Business Worth itself is authorized.

**Signed:** SABUSHIMIKE MASCENI, Product Architect

**This acceptance authorizes exactly what §1–§21 of this document describe — nothing more.** It does not authorize a Rule 8 Assessment, an Implementation Authorization, or any application code, `firestore.rules`, or `firestore.indexes.json` change — each remains its own, separately-gated future step, per `19-governance-bdr-policy-framework.md` §3.

---

**Lifecycle:** Drafted → Product Architect review → **Accepted** (this step). Not yet assessed under Rule 8, not Authorized, not Implemented.
