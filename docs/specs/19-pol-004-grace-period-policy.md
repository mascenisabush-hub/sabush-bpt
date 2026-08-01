Decision Record

# POL-19-004 — Grace Period Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001/002/003/005; does not itself
define payment gateway behavior, retry logic, or technical timing.
**Sequencing note:** This policy is being recorded after POL-19-005,
completing the gap intentionally left open at that time (confirmed by
the Product Architect as deliberate, not an oversight — POL-19-005's
"Grace Period" state definition was written first, this document now
supplies the business meaning and duration that state referenced but
did not itself define).
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by the
prior Module #19 policy documents.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy), POL-19-002 (Trial Duration
Policy), POL-19-003 (Trial Expiry Policy), POL-19-005 (Subscription
State Model) — this policy defines the business meaning, eligibility,
and duration of the Grace Period state POL-19-005 named.
**Followed by:** POL-19-006 — Conversion Policy, POL-19-007 — Recovery
Policy, POL-19-008 — Notification Policy (none yet drafted, none
derived by this record).

---

## Purpose

Define the purpose, duration, and business meaning of the Grace Period.

## Guiding Principle

The Grace Period protects business continuity during temporary
subscription interruption. It is not a second trial. It is not a free
subscription.

## Business Meaning

Grace Period applies only after an Active Subscription ends. It exists
because temporary payment interruptions may occur without indicating
the customer's intention to leave.

## Eligibility

Only businesses transitioning from Active Subscription qualify. Trial
completion does not qualify.

## Duration

**The approved Grace Period duration is seven (7) consecutive calendar
days.**

## Operational Access

During the Grace Period, businesses retain full operational capability.

## Transition

Successful renewal returns the business to Active Subscription. Failure
to renew before the Grace Period ends transitions the business to
Subscription Expired, as defined by POL-19-005.

## Trust Principle

Sabush BPT values continuity for existing customers while preserving
the integrity of the subscription model.

## Product Principle

**Temporary payment interruption should not immediately interrupt
legitimate business operations.**

## Scope Exclusions

This policy explicitly does **not** define:

- Payment gateway behavior.
- Retry logic.
- Notifications.
- Billing implementation.
- Technical timing.
- Automatic suspension mechanisms.

Each remains future Policy work (POL-19-006 through POL-19-008) or
Module #19 specification work, per the governance hierarchy already
recorded.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce a technical implementation detail.
  "Seven consecutive calendar days," measured from what event and
  enforced how, is a business rule stated here; the technical timing,
  automatic suspension mechanism, and payment retry/gateway behavior
  are explicitly excluded and deferred to Module #19 specification
  work.
- This record does not derive Conversion (POL-19-006), Recovery
  (POL-19-007), or Notification (POL-19-008) policy — each is out of
  scope per the Scope Exclusions above and remains for its own
  POL-19-### record, per this task's explicit instruction.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance/Policy record — same gap already flagged by prior
  records, left unaddressed here by design (not part of this task's
  scope).
- With this record, POL-19-001 through POL-19-005 are all recorded;
  POL-19-006, POL-19-007, and POL-19-008 remain outstanding.

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
