Decision Record

# POL-19-006 — Subscription Conversion Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001/002/003/004/005; does not itself
define payment providers, billing workflow, or technical activation.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by the
prior five Module #19 policy documents.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy), POL-19-002 (Trial Duration
Policy), POL-19-003 (Trial Expiry Policy), POL-19-004 (Grace Period
Policy), POL-19-005 (Subscription State Model) — this policy defines
the business meaning of entering the Active Subscription state
POL-19-005 named, from each of the states POL-19-005/003/004 defined.
**Followed by:** POL-19-007 — Recovery Policy, POL-19-008 —
Notification Policy (not yet drafted, not derived by this record).

---

## Purpose

Define the business meaning of converting from a trial or inactive
subscription state into an Active Subscription.

## Guiding Principle

**Subscription conversion represents the customer's decision to
continue growing their business with Sabush BPT after experiencing its
value.** Payment enables continuation. Trust motivates the decision.

## Business Meaning

Conversion:

- is not the creation of a new business,
- is not a migration,
- is not a reset,
- preserves continuity of the existing business.

## Voluntary Commitment

Subscription conversion is always voluntary. The platform encourages
conversion through demonstrated value, transparency, and customer
trust — not through fear of losing customer-owned data.

## Continuity Principle

Successful conversion preserves:

- business identity,
- historical data,
- Business Worth history,
- inventory history,
- operational history,
- user relationships,
- business configuration.

Conversion changes only the subscription relationship.

## Immediate Effect

Once subscription activation is confirmed, the business immediately
receives the operational capabilities of an Active Subscription without
requiring additional onboarding or migration.

## State Transitions

The following business-level transitions are approved:

- Trial Completed → Active Subscription
- Grace Period → Active Subscription
- Subscription Expired → Active Subscription

Implementation mechanics remain outside the scope of this policy.

## Customer Trust

Subscription should feel like a seamless continuation of the customer's
business journey.

## Product Principle

**Customers subscribe to continue creating Business Worth — not to
recover access to their own business.**

## Scope Exclusions

This policy explicitly does **not** define:

- Payment providers.
- Billing workflow.
- Payment verification.
- Pricing plans.
- Discounts.
- Promotional campaigns.
- Taxation.
- Currency handling.
- Technical activation.
- Notification behavior.

Each remains future Policy work (POL-19-007, POL-19-008) or Module #19
specification work, per the governance hierarchy already recorded.

## Strategic Outcome

Subscription conversion should be experienced as a natural progression
resulting from demonstrated value rather than a forced payment
decision.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce any technical implementation detail.
  Which payment provider, how payment is verified, how activation is
  technically triggered, and how pricing/discounts/taxation/currency
  are handled are all explicitly excluded and deferred to Module #19
  specification work.
- This record does not derive Recovery (POL-19-007) or Notification
  (POL-19-008) policy — each is out of scope per the Scope Exclusions
  above and remains for its own POL-19-### record, per this task's
  explicit instruction.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance/Policy record — same gap already flagged by prior
  records, left unaddressed here by design (not part of this task's
  scope).
- With this record, POL-19-001 through POL-19-006 are all recorded;
  POL-19-007 and POL-19-008 remain outstanding.

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
