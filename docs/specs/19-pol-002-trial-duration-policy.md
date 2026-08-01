Decision Record

# POL-19-002 — Trial Duration Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001; does not itself decide
strategic philosophy and does not itself define technical time
calculation, time zone handling, or renewal mechanics.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by
POL-19-001.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy) — this policy measures its 30-day
period from the activation event POL-19-001 defines conceptually, not
from account creation.
**Followed by:** POL-19-003 — Trial Expiry Policy (not yet drafted, not
derived by this record).

---

## Purpose

Define how long a Sabush BPT trial remains available to a new business.
This policy exists to provide every business with a fair opportunity to
achieve Value Realization before a subscription decision is required.

## Guiding Principle

Trial duration exists to provide sufficient opportunity for Value
Realization. Time supports business understanding. Time is not the
value being offered.

## Fair Opportunity Principle

Every business should receive sufficient opportunity to:

- Build meaningful operational data.
- Experience progressively deeper business insights.
- Gain confidence in Sabush BPT.
- Understand how the platform improves Business Worth.

## Simplicity Principle

The trial duration should be simple, predictable, and easy to
communicate. Operational simplicity is preferred over unnecessary
complexity.

## Standard Trial

Sabush BPT adopts one standard trial period for all new businesses. The
duration does not vary by business size, industry, customer category,
or subscription plan.

## Approved Duration

**The standard trial duration is thirty (30) consecutive calendar days,
measured from Trial Activation as defined in POL-19-001.**

## Business Rationale

Thirty days is intended to provide a fair opportunity for most SMEs to
complete an initial operating cycle and experience meaningful business
insight. The duration is derived from the approved business philosophy
rather than industry convention.

## No Automatic Extension

Low business activity does not automatically extend the trial. Future
extension mechanisms, if any, require separate approved policy.

## Relationship to Value Realization

Thirty days provides the opportunity for Value Realization but does not
guarantee it. Value Realization remains dependent upon genuine business
activity and sufficient operational data.

## Product Principle

**Sabush BPT promises a fair opportunity to experience business
value — not guaranteed business success.**

## Scope Exclusions

This policy explicitly does **not** define:

- Trial Expiry Policy.
- Grace Period Policy.
- Subscription State Model.
- Conversion Policy.
- Notification Policy.
- Technical time calculations.
- Time zone handling.
- Renewal behavior.

Each remains future Policy work (POL-19-003 through POL-19-008) or
Module #19 specification work, per the governance hierarchy already
recorded.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce any technical implementation detail.
  "Thirty consecutive calendar days" is a business rule stated here;
  how it is computed, stored, timezone-handled, or enforced at runtime
  is explicitly excluded and deferred to Module #19 specification work.
- This record does not derive Trial Expiry, Grace Period, Subscription
  State Model, Conversion, Recovery, or Notification policy — each is
  out of scope per the Scope Exclusions above and remains for its own
  POL-19-### record.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance/Policy record — same gap already flagged by prior
  records, left unaddressed here by design (not part of this task's
  scope).

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
