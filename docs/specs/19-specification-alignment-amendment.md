Decision Record

# Module #19 Specification Alignment Amendment

**Status:** Approved (governance decision — not a Business Decision
Record, not a Policy, not a specification revision, not an
implementation authorization).
**Type:** Governance Decision Record. Sits above the specification it
concerns, at the same level as the [Governance Decision — BDR Phase
Completion & Policy Document Framework](./19-governance-bdr-policy-framework.md).
It does not answer a "why does this capability exist" question (that is
BDR-0001/0002/0003) or an operational "how does this behave" question
(that is POL-19-001–008). It resolves which document wins where the
older specification and the newer governance stack disagree, and
authorizes nothing beyond that resolution.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same precedent established by BDR-0001 and the Governance
Decision & Policy Document Framework record — a decision record sits
next to its module's spec rather than inventing a new top-level
documentation folder. No `docs/governance/` (or similar) folder is
created by this record.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 through POL-19-008 (Trial Activation, Trial Duration, Trial
Expiry, Grace Period, Subscription State Model, Conversion, Recovery,
Notification Policies) — this record exists because that governance
stack is now complete and internally consistent, and because
`docs/specs/19-subscriptions.md` predates all of it.
**Followed by:** Controlled revision of `docs/specs/19-subscriptions.md`
itself (Decision 7, below) — not performed by this record.
**Does not amend:** `docs/specs/19-subscriptions.md` is unchanged by
this document. Compare to the [Closing Integrity
Amendment](./08-09-11-closing-integrity-amendment.md), which amended
specs #8/#9/#11 in place — this record deliberately does not follow
that pattern yet. It establishes *authority* to revise; the revision
itself is separate, future, documentation-only work per Decision 7.

---

## Purpose

This amendment exists to preserve repository integrity while Module #19
transitions from its original specification (`19-subscriptions.md`,
written before the governance stack existed) to the now-approved
governance model (BDR-0001–0004, POL-19-001–008).

The amendment establishes authority. It does not perform implementation,
and it does not itself revise the specification.

---

## Governance Context

The Module #19 Governance Consolidation Review found:

- The governance stack (BDRs + POLs) is internally consistent with
  itself.
- The existing `19-subscriptions.md` specification predates every BDR
  and POL document — it was written before this governance category
  existed.
- Two direct business-rule conflicts now exist between the
  specification and the approved governance stack (Decisions 2 and 5,
  below).
- Specification updates should occur only after governance authority is
  formally established — which is what this record does, and all it
  does.

---

## Decision 1 — Governance Authority

Approved Business Decision Records and Operational Policies are now the
authoritative expression of Module #19 business intent.

Where the current specification (`19-subscriptions.md`) predates and
conflicts with those approved governance documents, the specification
shall be revised to align with governance.

This amendment authorizes specification alignment. It does **not**
authorize implementation.

---

## Decision 2 — Trial Expiry Model

The approved governance model (POL-19-003, "Read-Only Preservation") is:

After trial completion, the business enters a **Read-Only operational
state**. Business owners retain access to historical information.
Creation of new operational business records is suspended until an
appropriate subscription state is restored.

This replaces the specification's current wording (`19-subscriptions.md`
§19, "Expiry behavior — Restricted features model," which states "Login
blocking, full read-only mode, and any data-hostage model are not
accepted") as the governing business model for trial expiry.
Implementation details remain future specification work.

---

## Decision 3 — Grace Period

During the approved Grace Period (POL-19-004), businesses retain full
operational capability. The purpose of the Grace Period is to preserve
uninterrupted business operation while allowing reasonable time for
subscription renewal.

Future specification updates shall align with this approved business
rule.

---

## Decision 4 — State Mapping

Business lifecycle states (POL-19-005: e.g. Active, Archived, Closed)
and technical subscription statuses are separate concepts.

The Module #19 specification shall introduce an explicit mapping
between them.

This amendment intentionally does **not** define that mapping.

---

## Decision 5 — Trial Duration

The approved business rule (POL-19-002) is a standard trial duration of
thirty (30) consecutive calendar days, and that duration does not vary
by business size, industry, customer category, or subscription plan.

This supersedes the specification's current wording (`19-subscriptions.md`
§19, "Trial duration is a Plan-level setting, read at
subscription-creation") implying plan-specific variation, unless a
future approved Business Decision Record explicitly changes this
policy.

---

## Decision 6 — Historical Integrity

The earlier Module #19 specification reflected the best available
architectural understanding at the time it was written.

The subsequent approval of Business Decision Records and Operational
Policies represents the natural evolution of the product rather than an
error. This amendment preserves that historical context and does not
characterize the original specification as a mistake.

---

## Decision 7 — Specification Work

Following this amendment, the next governance activity shall be
controlled revision of `docs/specs/19-subscriptions.md` so that it
aligns completely with approved governance.

Specification revision remains documentation work. Implementation
remains unauthorized.

---

## Scope Exclusions

This amendment does **not**:

- modify the Module #19 specification (`19-subscriptions.md`),
- authorize runtime behavior,
- authorize implementation,
- authorize database changes,
- authorize UI changes,
- authorize Firestore changes,
- authorize server changes,
- authorize subscription logic.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  `firestore.rules`, or change `docs/specs/19-subscriptions.md`.
- `docs/specs/README.md` does not yet reference this record — updating
  that index is a separate, subsequent documentation step, not
  performed here.
- The two conflicts resolved by Decisions 2 and 5 were verified
  directly against the current text of `19-subscriptions.md` (§19,
  "Expiry behavior" and "Trial duration is a Plan-level setting") as
  part of producing this record — not asserted without checking the
  source.
