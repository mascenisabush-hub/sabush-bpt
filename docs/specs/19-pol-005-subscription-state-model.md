Decision Record

# POL-19-005 — Subscription State Model

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001/002/003; does not itself define
transition mechanics, timing, or a technical state machine.
**Sequencing note:** This is the fourth Policy document recorded, but
carries the number POL-19-005 per the Planned Policy Series order
recorded in the governance framework. **POL-19-004 (Grace Period
Policy) has not yet been recorded** — this document refers to it below
as a named future policy (consistent with its own Scope Exclusions,
which explicitly exclude Grace Period duration and behavior), not as an
existing, approved document. Flagged here rather than left implicit,
since this is the first policy approved out of its planned numeric
sequence.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by
POL-19-001/002/003.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy), POL-19-002 (Trial Duration
Policy), POL-19-003 (Trial Expiry Policy).
**Followed by:** POL-19-004 — Grace Period Policy, POL-19-006 —
Conversion Policy, POL-19-007 — Recovery Policy, POL-19-008 —
Notification Policy (none yet drafted, none derived by this record).

---

## Purpose

Define the business lifecycle states through which a business
progresses within Sabush BPT's subscription system. This policy
establishes the business meaning of each subscription state while
intentionally avoiding implementation details.

## Guiding Principle

**Subscription states describe the commercial relationship between the
business and Sabush BPT.** They do not describe the existence,
ownership, or value of the business itself. A business continues to
exist regardless of its subscription state.

## Separation Principle

Sabush BPT explicitly separates:

- **Business Lifecycle** — e.g. Active, Archived, Closed.
- **Subscription Lifecycle** — e.g. Trial Pending, Trial Active, Trial
  Completed, Active Subscription, Grace Period, Subscription Expired.

The two lifecycles are independent. Subscription changes must never
redefine the business itself.

## Approved Subscription States

### Trial Pending
Business exists. Trial has not yet started. Trial duration has not
begun. Purpose: allow setup before meaningful business activity.

### Trial Active
Trial officially running. Full operational capability available.
Purpose: provide fair opportunity for Value Realization.

### Trial Completed
Trial has ended. Operational recording suspended. Historical
information remains visible. Read-only access preserved. Purpose:
preserve trust while inviting subscription.

### Active Subscription
Paid subscription active. Full operational capability available.
Purpose: support continuous Business Worth growth.

### Grace Period
Temporary state between subscription interruption and expiry. State
behavior defined separately by POL-19-004. Purpose: provide continuity
during temporary interruption.

### Subscription Expired
No active subscription. No active grace period. Historical information
remains available. Operational recording remains suspended. Purpose:
preserve ownership while allowing future return.

## State Transitions

Movement between subscription states is governed by approved
operational policies. This policy intentionally does not define
transition mechanics.

## Data Ownership

Subscription state changes never affect ownership of business data.
Ownership remains with the customer.

## Business Continuity

Whenever practical: dashboards remain visible, Business Worth remains
visible, historical insights remain available. Operational recording is
the primary capability governed by subscription.

## Trust Principle

Owners should always understand: their current state, why they are in
that state, what capabilities remain available, and how to progress to
another state.

## Product Principle

**Subscription status governs operational participation — not business
ownership.**

## Scope Exclusions

This policy explicitly does **not** define:

- Transition timing.
- Grace Period duration.
- Payment success rules.
- Failed payment handling.
- Renewal behavior.
- Notifications.
- Billing provider integration.
- Technical state machine implementation.

## Strategic Outcome

Every future subscription feature should derive its behavior from these
approved states rather than inventing new commercial conditions.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce a technical state machine, database
  schema, enum, or field. The six named states are business concepts;
  how they are represented, persisted, or transitioned at runtime is
  explicitly excluded and deferred to Module #19 specification work.
- This record does not derive Grace Period (POL-19-004), Conversion
  (POL-19-006), Recovery (POL-19-007), or Notification (POL-19-008)
  policy — each is out of scope per the Scope Exclusions above and
  remains for its own POL-19-### record, per this task's explicit
  instruction.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance/Policy record — same gap already flagged by prior
  records, left unaddressed here by design (not part of this task's
  scope).
- POL-19-004 remains unrecorded — see Sequencing note above.

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
