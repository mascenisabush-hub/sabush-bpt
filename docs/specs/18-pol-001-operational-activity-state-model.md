Decision Record

# POL-18-001 — Operational Activity State Model

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in
[19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md).
Operationalizes [BDR-0010](./BDR-0010-superadmin-business-directory.md)'s
Decisions 1, 2, and 3 (the four operational activity states, their
governing thresholds, and the activity data source) into one durable,
implementation-neutral record — mirroring
[POL-19-005](./19-pol-005-subscription-state-model.md)'s own shape
exactly, which combines its state definitions and their qualifying
conditions in one document rather than splitting closely-coupled facts
across several.
**Sequencing note:** This is the **first** Policy document recorded
for Module #18 (SuperAdmin) — no `POL-18-*` record existed before
this one, confirmed by direct repository search. Numbering restarts at
`001` because Policy numbering in this repository is module-scoped
(`POL-19-*` for Subscriptions, `POL-20-*` for Notifications), not a
single global sequence — confirmed against both existing series before
this record was assigned.
**Location note:** Recorded in `docs/specs/`, module-prefixed
(`18-`), following the exact `NN-pol-NNN-*.md` convention already
established by `19-pol-*` and `20-pol-001-*`.
**Depends on:** [BDR-0010](./BDR-0010-superadmin-business-directory.md)
(the governing decision this policy operationalizes);
[ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(the SuperAdmin Operational Control Plane this capability extends);
[POL-19-002 — Trial Duration Policy](./19-pol-002-trial-duration-policy.md)
(the direct precedent for recording a numeric business-rule threshold
as its own durable, auditable policy record, distinct from the BDR
that originated it — followed here for the same reason);
[POL-19-005 — Subscription State Model](./19-pol-005-subscription-state-model.md)
(the direct structural and separation-principle precedent this record
follows).
**Followed by:** a Module #18 specification amendment (Business
Directory) operationalizing this policy — alongside BDR-0010's other,
not-separately-policy-governed decisions — into functional
requirements and acceptance criteria, per BDR-0010 Part 14's governing
sequence.

---

## Purpose

Define the operational activity states through which a business's
day-to-day platform engagement is classified for SuperAdmin's Business
Directory, and the data source and thresholds that determine which
state applies. This policy establishes the business meaning of each
state while intentionally avoiding implementation details — exactly
the same discipline POL-19-005 already applies to subscription states.

## Separation Principle

**Operational Activity describes how recently and consistently a
business has used the platform. It does not describe the business's
commercial relationship with Sabush BPT (Subscription State), whether
a platform operator has restricted its access (Suspension), or which
commercial plan it holds (Plan).** These are four independent facts.
A business may be `Active` and in `Grace Period` simultaneously. A
business may be `Dormant` and hold an `Active` subscription
simultaneously. Neither combination is contradictory, and no future
specification may collapse them into one field. This restates, for
Operational Activity specifically, the same separation POL-19-005
already establishes between Business Lifecycle and Subscription
Lifecycle — applied here to a third, newly-introduced dimension rather
than superseding or duplicating that existing policy.

## Approved Operational Activity States

### New
A business is `New` for the first **thirty (30) consecutive calendar
days** from its `createdAt`. `New` is a statement about business age,
not activity level — a business that is already highly active within
this window remains `New` until the window closes. Purpose: prevent a
business still onboarding, which may not yet have recorded its first
qualifying activity, from being misclassified as `Dormant` the moment
it is created.

### Active
For a business outside its `New` window: qualifying activity (see
"Activity Source," below) occurred within the last **fourteen (14)
days**.

### Inactive
For a business outside its `New` window: no qualifying activity for
**fifteen (15) to forty-five (45) days**.

### Dormant
For a business outside its `New` window: no qualifying activity for
**more than forty-five (45) days**.

## Activity Source

Operational activity is derived exclusively from the business's
existing `timelineEvents` record — the append-only activity log
already implemented and in production use across this platform's
Phase 1 modules, reached through the platform's existing, single
shared activity-logging mechanism. No other signal — authentication
events, SuperAdmin-side actions, subscription lifecycle events, or any
administrative action — substitutes for or supplements this source.
This policy does not define how the resulting `lastActivityAt` signal
is technically maintained, kept trustworthy, or made queryable — that
constraint is governed by BDR-0010 Part 5 directly and remains, by
that decision's own explicit terms, an open specification-stage
question, not settled by this policy.

## Threshold Status — Explicitly Provisional

**The fourteen (14) day and forty-five (45) day figures above are
initial policy values — a business hypothesis grounded in the expected
operating cadence of this platform's SME customer base, not a claim of
empirically validated, industry-standard, or SABUSH-BPT-usage-derived
correctness.** No usage data existed to validate them at the time this
policy was recorded. They remain the governing, binding definition of
`Active`/`Inactive`/`Dormant` **until and unless** a future,
explicitly-authorized amendment to this policy revises them based on
real observed `timelineEvents` activity across a meaningful population
of real tenant businesses. **This policy does not authorize any
individual engineer, specification, or implementation to substitute
different threshold values on their own judgment** — revision requires
its own governance record, following this same policy's amendment
path, not a silent code-level change. The thirty (30) day `New` window
carries the same governing weight and the same revision constraint.

## Scope Exclusions

This policy explicitly does **not** define:

- The exact technical mechanism by which `lastActivityAt` is computed,
  stored, or kept trustworthy — governed by BDR-0010 Part 5, left open
  for specification-stage design.
- Subscription State, its values, or its transitions — governed
  entirely by POL-19-005 and its companion Module #19 policies; this
  policy neither duplicates nor amends that model.
- Suspension state or its write path — governed entirely by
  ADR-0006's already-implemented Phase C.
- Plan identifiers or commercial terms.
- Business Directory UI, columns, filters, search, sort, or
  pagination behavior — specification-level concerns per BDR-0010
  Part 7, not policy-level.
- Failure/resilience behavior for the activity-signal update
  mechanism — governed directly by BDR-0010 Part 6.
- Firestore query design, index design, or any other implementation
  detail.

## Strategic Outcome

Every future SuperAdmin capability that needs to reason about "how
recently has this business used the platform" should derive its
behavior from these approved states and this approved source, rather
than inventing a parallel activity definition.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `firestore.indexes.json`,
  `src/`, `apps/`, `server/`, or `tests/` file. None were touched to
  produce it.
- This record does not introduce any technical implementation detail.
  The state definitions and thresholds are business rules stated here;
  how they are computed, stored, or enforced at runtime is explicitly
  excluded and deferred to the Module #18 specification stage, per
  BDR-0010 Part 14's governing sequence.
- This record does not derive, duplicate, or amend Subscription State
  (POL-19-005), Suspension (ADR-0006 Phase C), or Plan — each remains
  governed entirely by its own existing record, cross-referenced above,
  not restated or reinterpreted here.
- This record does not decide the `lastActivityAt` maintenance
  mechanism — BDR-0010 Part 5 already fixes the binding constraints on
  whatever mechanism is eventually chosen; this policy adds no further
  constraint and makes no selection.
- This record does not modify `docs/specs/README.md`, `HANDOFF.md`,
  or any Module #19/#20 document.
