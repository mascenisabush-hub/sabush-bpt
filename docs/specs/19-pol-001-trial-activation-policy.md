Decision Record

# POL-19-001 — Trial Activation Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs; does not itself decide strategic philosophy and does not
itself define a technical implementation trigger.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same convention established for the Module #19 BDRs and
the governance framework record — a Decision Record sits next to its
module's spec rather than in a separate top-level folder. This is the
first Policy document to follow that convention; it establishes the
`19-pol-NNN-*.md` naming pattern for the seven policies that follow it
in the Planned Policy Series.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework), and the
Governance Decision Record that authorized the Policy category.
**Followed by:** POL-19-002 — Trial Duration Policy (not yet drafted,
not derived by this record).

---

## Purpose

Define the business event that officially activates a Sabush BPT
trial.

## Guiding Principle

A trial begins when a business has genuinely started using Sabush BPT
to manage its operations. A trial does not begin simply because an
account has been created.

## Business Rationale

Registration demonstrates interest. Operational business activity
creates the opportunity for Sabush BPT to deliver measurable business
value. Beginning the trial before meaningful business activity would
conflict with the approved Subscription Philosophy (BDR-0001) and Value
Realization Framework (BDR-0002).

## Approved Policy

**The trial begins at the first meaningful business activity, rather
than at account creation.**

## Meaningful Business Activity

Defined conceptually only: meaningful business activity is the point
at which the owner has begun using Sabush BPT for genuine business
operations. This policy **intentionally does not define the technical
implementation trigger**. The precise activation event will be
determined later by the Module #19 specification.

### Illustrative Examples

The following are examples only, illustrating the concept — **not
implementation rules**, not an exhaustive list, and not a ranked or
prioritized set:

- Recording initial business inventory.
- Beginning genuine business operations.
- Recording the first real stock movement.
- Recording the first real business transaction.

The future specification will determine the actual implementation
trigger, which may or may not map directly onto any single example
above.

## Product Principle

**No customer should lose trial time before Sabush BPT has had a
genuine opportunity to demonstrate business value.**

## Scope Exclusions

This policy explicitly does **not** define:

- The technical activation trigger (which write, event, or field
  constitutes "activity" for engineering purposes).
- Trial duration.
- Trial expiry.
- Grace periods.
- Subscription state model.
- Conversion rules.
- Notification rules.

Each remains future Policy work (POL-19-002 through POL-19-008) or
Module #19 specification work, per the governance hierarchy already
recorded.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not derive a technical activation trigger. "First
  meaningful business activity" is a business concept here, not an
  engineering specification of which write/event/threshold satisfies
  it — that determination is explicitly deferred to Module #19's
  specification work.
- This record does not derive Trial Duration, Trial Expiry, Grace
  Period, Subscription State Model, Conversion, Recovery, or
  Notification policy — each is out of scope per the Scope Exclusions
  above and remains for its own POL-19-### record.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance record — same gap already flagged by prior records,
  left unaddressed here by design (not part of this task's scope).

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
