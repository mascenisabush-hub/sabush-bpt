Decision Record

# Governance Decision — BDR Phase Completion & Policy Document Framework

**Status:** Approved (governance decision — not a Business Decision
Record, not a Policy, not a specification, not an implementation
authorization).
**Type:** Governance Decision Record. Sits one level above Business
Decision Records in the hierarchy it defines below — it does not answer
a "why does this capability exist" question the way BDR-0001/0002/0003
do; it declares a phase complete and defines the document category and
governance relationship that phase's successor (Policy) will use.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same precedent BDR-0001 established and explicitly left
open for a future decision: a Decision Record sits next to its module's
spec rather than inventing a new top-level documentation folder. This
record makes no change to that convention — it neither creates a
`docs/governance/` (or similar) folder nor moves BDR-0001/0002/0003.
Whether a dedicated top-level location should eventually house
governance/BDR/Policy records generally remains an open documentation-
structure question for the Product Architect, same as BDR-0001 framed
it — see Deliverable 5 in the accompanying report for a recommendation.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework) — this
record exists because those three are complete, not the reverse.
**Followed by:** POL-19-001 through POL-19-008 (Planned Policy Series,
below) — none yet drafted, none yet approved.

---

## 1. BDR Phase Completion — Module #19

The Business Decision Record phase for Module #19 is declared
**complete**. The approved strategic foundation consists of exactly
three records:

- **BDR-0001** — [Subscription Philosophy](./19-subscription-philosophy.md)
- **BDR-0002** — [Value Realization Framework](./19-value-realization-framework.md)
- **BDR-0003** — [Trial Experience Framework](./19-trial-experience-framework.md)

No further BDRs are currently planned for Module #19. Business Decision
Records exist to capture long-lived strategic product decisions —
enduring questions about why a capability exists, what customer value
it creates, what principles govern future decisions, and what business
philosophy should remain stable over time. They are strategic and
should change infrequently. Declaring this phase complete does not
foreclose a future BDR-0004 if a genuinely new strategic question
arises later — it means the currently identified strategic foundation
is sufficient to proceed to Policy Design.

## 2. Policy Documents — A New Document Category

**Policy documents (`POL-NN-###`)** are established as a new category,
distinct from Business Decision Records and from Business Domain
Specifications:

- **Policies operationalize approved BDRs.** Where a BDR answers "why"
  and "what philosophy," a Policy answers "how, specifically" — the
  operational rule a BDS will later need to specify functionally (e.g.
  what triggers trial activation, how long a trial lasts, what happens
  at expiry).
- **Policies may evolve** as product learning increases, in a way BDRs
  are not expected to — a Policy can be revised without reopening the
  strategic question underneath it.
- **Policies must never contradict approved Business Decision
  Records.** A Policy that cannot be reconciled with BDR-0001/0002/0003
  is a signal to revisit the Policy, not the BDR, unless the Product
  Architect explicitly reopens the BDR itself.
- Policies are **not** specifications. A Policy defines the business
  rule; a BDS (e.g. `19-subscriptions.md`) is where that rule becomes a
  functional requirement with acceptance criteria, ready for Rule 8
  assessment.

### Planned Policy Series (Module #19)

The following sequence is recorded as the **intended governance
order only**. This list does not approve, draft, or derive the content
of any policy — each POL document remains entirely unwritten:

| # | Policy |
|---|---|
| POL-19-001 | Trial Activation Policy |
| POL-19-002 | Trial Duration Policy |
| POL-19-003 | Trial Expiry Policy |
| POL-19-004 | Grace Period Policy |
| POL-19-005 | Subscription State Model |
| POL-19-006 | Conversion Policy |
| POL-19-007 | Recovery Policy |
| POL-19-008 | Notification Policy |

### Numbering Ledger (Addendum — Post-Planned-Series Identifiers)

The Planned Policy Series above (POL-19-001 through 008) is complete,
per POL-19-008's own Governance Notes. Everything below POL-19-008 is
**not** part of that original planned series — each identifier below
was assigned individually, across separate sessions, as new policy
needs arose. This addendum exists solely to resolve an identifier
ambiguity that surfaced across sessions: a prior task prompt referred
to "the existing POL-19-010 scaffold" as if it were already a file in
this repository. It was not — confirmed by direct filesystem
inspection before this addendum was written. The table below is the
single canonical mapping; if any future prompt or session disagrees
with it, that prompt is wrong about repo state, not this table.

| # | Policy | Status |
|---|---|---|
| POL-19-009 | Early Renewal During Trial | **Reserved** — assigned to this topic conversationally in a prior session; not yet drafted as a file; out of scope for the session that produced POL-19-010/011 below. |
| POL-19-010 | [Payment Reversal Policy](./19-pol-010-payment-reversal-policy.md) | Approved |
| POL-19-011 | [V1 Commercial Plan, Payment Processor & Voluntary Cancellation Decision](./19-pol-011-v1-commercial-plan-processor-cancellation-decision.md) | Approved |
| POL-19-012 | Business-Lifecycle / Subscription-Status Interaction (candidate topic — per `19-subscriptions.md`'s State Mapping cross-reference and its Explicitly Left Open item 7) | **Recommended, not assigned.** No file exists. Do not use this number for any other topic without an explicit Product Architect decision. |
| POL-19-013 | [Payment Reversal Policy Amendment — Grace Period Reversal Simplification](./19-pol-013-payment-reversal-grace-period-reset-amendment.md) | Approved |
| POL-19-014 | [Commercial Policy Amendment — V1 Subscription Price Change](./19-pol-014-commercial-price-amendment.md) | Approved |

No identifier above POL-19-008 may be renumbered or reused for a
different topic than the one recorded in this ledger without an
explicit Product Architect decision — the same discipline that governs
the original Planned Policy Series applies here.

### Cross-Cutting Policy Namespace (`POL-NNNN`)

The Numbering Ledger above governs module-scoped `POL-19-NNN`
identifiers only. It does not, and was never intended to, cover a
Policy whose subject matter is genuinely cross-cutting — spanning
multiple modules with no single home — the same situation that led
`BDR-0004`, `BDR-0008`, `BDR-0009`, and `BDR-0012` to be filed
unprefixed rather than under any one module's numbering.

**A separate, independent identifier space, `POL-NNNN` (unprefixed,
filed directly in `docs/specs/`), is established for exactly this
case.** It is distinct from, and not derived from, any module-scoped
`POL-NN-NNN` sequence — starting a new sequence at 1 mirrors how the
unprefixed BDR sequence itself began at `BDR-0001` rather than
borrowing a number from any module-scoped source.

This namespace begins at **`POL-0001`**, confirmed collision-free
against repository files, filenames, git history, branches, and tags
at the time of this addendum.

**Assignment authority:** until a more formal, repository-wide
numbering rule is established, assigning a `POL-NNNN` number requires
an explicit Product Architect decision, made each time — the same
discipline `BDR-0012`'s own numbering required, and the same
discipline this Ledger's own module-scoped entries above already
apply (see the `POL-19-012` row: "Do not use this number for any
other topic without an explicit Product Architect decision"). No
`POL-NNNN` number may be inferred from repository state, from the
highest previously-assigned number, or from any other document's
convention.

**Origin:** this namespace was established for the cross-cutting
Policy work operationalizing `BDR-0012` (Product Unit-of-Measure &
Product Memory) — specifically its §5.B items — the first Policy-
adjacent capability in this repository's history without a single
module home.

## 3. Governance Relationship

The following hierarchy is recorded as approved. Each level must derive
from the level above it; implementation must remain traceable back to
an approved Business Decision Record.

```
Business Philosophy
        ↓
Business Decision Records (BDRs)
        ↓
Policy Documents (POL)
        ↓
Module Specifications
        ↓
Rule 8 Assessment
        ↓
Implementation
```

This does not change the pipeline already documented in `CLAUDE.md`
(Architecture → Standards → Specifications → Implementation) or the
Rule 8 process (Current State Assessment → Gap Analysis → Risks →
Implementation Plan → approval gate → implementation). It inserts BDR
and Policy as the business-side layers that precede a module's BDS,
specifically for modules — like #19 — where the specification work
depends on settled business philosophy and operational rules that
didn't previously have a named home in the existing pipeline.

## 4. Current Project Status

- The strategic foundation for Module #19 (BDR-0001/0002/0003) is
  complete.
- The project now enters the **Policy Design phase** for Module #19.
  No POL document has been drafted.
- **No operational policy has yet been approved.** Trial activation
  triggers, duration, expiry mechanics, grace periods, state model,
  conversion rules, recovery rules, and notification rules remain
  entirely undefined by this record and by BDR-0001/0002/0003, which
  each explicitly disclaimed deriving them.
- **Module #19 remains unauthorized for implementation** — unchanged by
  this record. `docs/specs/19-subscriptions.md` is unmodified.
- **Module #18 authorization is unchanged** — unaffected by this
  record. Build order (`#19 → #20 → #18`, per `docs/specs/README.md`)
  is unaffected and not reopened.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not derive any operational policy — Section 2's
  Planned Policy Series is a naming/sequencing list only, not content.
- This record does not modify `docs/specs/19-subscriptions.md`,
  Module #18 authorization, or Module #19 authorization.
- `docs/specs/README.md` does not yet reference BDR-0001/0002/0003 or
  this record (confirmed unmodified — same gap BDR-0002/0003 already
  flagged). Left unaddressed by design, per this task's explicit
  instruction not to edit `docs/specs/README.md`.

**Lifecycle:** Designed → **Approved** (governance decision only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.

---

## Addendum — Scope Boundary: Standards-Conformance Corrections

**Type:** Non-normative clarifying addendum to this Governance Decision
Record. Not a Business Decision Record, not a Policy, not a
specification, not an implementation authorization. Does not reopen,
reverse, or reinterpret Sections 1–4 above.
**Approved by:** SABUSHIMIKE Masceni, Product Architect.
**Date:** August 20, 2026.

Business Decision Records exist, per Section 1 above, to answer
"enduring questions about why a capability exists, what customer value
it creates, what principles govern future decisions, and what business
philosophy should remain stable over time." A change that answers none
of those questions — because the business philosophy, principle, or
Standard it follows was already decided and already approved — does not
enter this hierarchy at the BDR/Policy layer at all.

Concretely: a correction that brings existing implementation into
compliance with an already-approved Standard (e.g. `DESIGN_SYSTEM.md`)
or an already-approved Architecture Principle (e.g.
`docs/architecture/02-core-product-principles.md` §2.11, Design System
Discipline) introduces no new capability, business philosophy,
operational policy, or business-domain decision. It does not require a
Business Decision Record or a Policy document, regardless of how many
modules or applications it touches.

This is distinct from the existing cross-cutting BDR namespace
(`BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`) — those are BDRs whose
*strategic subject matter* has no single module home, so they are filed
unprefixed rather than skipped. Crossing module boundaries is never
itself the BDR trigger, in either direction: it doesn't require a BDR
(the cross-cutting BDR case) and it doesn't exempt one (this addendum's
case) on its own. What determines the trigger, always, is whether a new
strategic or business-philosophy question is actually being answered.

Such a correction instead follows the applicable Standards/Architecture
governance and this repository's engineering-governance path directly
(Rule 8 Assessment → Implementation Authorization, per
`docs/engineering/platform-engineering-governance-standard.md`), the
same as it would for any other engineering change whose upstream
business decision is already settled.

**Precedent:** the UI Readability Amendment
(`docs/engineering/ui-readability-amendment.md`) — a cross-cutting
contrast/typography correction against `DESIGN_SYSTEM.md` and Principle
2.11, spanning the tenant and superadmin apps, implemented and closed
out (`docs/engineering/ui-readability-amendment-closeout.md`, commit
`c71bfa0`) without a BDR, on exactly this reasoning.

**Governance Notes**
- This addendum does not reopen, reverse, or reinterpret Sections 1–4
  above. It states a boundary already implied by Section 1's own
  definition of a Business Decision Record.
- This addendum does not authorize any future implementation. It only
  clarifies which governance gate a future change of this shape enters
  at.
- This addendum does not modify `ui-readability-amendment.md`, its
  Rule 8 Assessment, its Implementation Authorization, or its Close-Out
  — those remain as recorded, and commit `c71bfa0` is unaffected.
- This addendum does not modify
  `docs/engineering/platform-engineering-governance-standard.md` or
  `CLAUDE.md`.

**Lifecycle:** Designed → **Approved** (non-normative addendum). Not a
new governance gate; clarifies an existing one.
