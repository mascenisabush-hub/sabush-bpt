Decision Record

# POL-19-007 — Subscription Recovery Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001/002/003/004/005/006; does not
itself define payment verification, billing providers, or technical
activation workflow.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by the
prior six Module #19 policy documents.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy), POL-19-002 (Trial Duration
Policy), POL-19-003 (Trial Expiry Policy), POL-19-004 (Grace Period
Policy), POL-19-005 (Subscription State Model), POL-19-006
(Subscription Conversion Policy) — this policy defines recovery
specifically from the Subscription Expired state POL-19-005 named,
distinct from POL-19-006's broader conversion transitions (Trial
Completed/Grace Period/Subscription Expired → Active Subscription).
**Followed by:** POL-19-008 — Notification Policy (not yet drafted, not
derived by this record).

---

## Purpose

Define the business principles governing subscription recovery after a
business has entered the **Subscription Expired** state. Recovery
restores operational participation while preserving business
continuity and customer trust.

## Guiding Principle

**Recovery restores business continuity. It does not recreate the
business.** The purpose of recovery is to allow a business to continue
its existing journey after a temporary interruption in its subscription
relationship.

## Business Meaning

Recovery represents the resumption of an existing customer
relationship. It is not:

- a new registration,
- a new trial,
- a new business,
- a migration, or
- a reset.

The existing business continues with its identity, history, and
accumulated Business Worth.

## Eligibility

Recovery applies to businesses currently in the **Subscription
Expired** state. Businesses in an Active Subscription or Grace Period
do not require recovery because operational continuity has already
been preserved.

## Continuity Principle

Successful recovery preserves:

- Business identity.
- Historical transactions.
- Business Worth history.
- Inventory history.
- Financial history.
- User accounts and roles.
- Business configuration.
- Reporting continuity.

No historical information is recreated or duplicated.

## Immediate Restoration

Once subscription recovery is confirmed, the business immediately
returns to the **Active Subscription** state. Operational recording
resumes without additional onboarding, migration, or data restoration.

## Customer Trust

Recovery should reassure customers that returning to Sabush BPT is
straightforward. Businesses should never feel that a temporary
interruption has permanently diminished the value they previously
created.

## Product Principle

**Returning customers continue their Business Worth journey — they do
not start over.**

## Relationship Principle

Sabush BPT treats former subscribers as returning business partners
rather than new customers. The platform should recognise the
continuity of the relationship.

## Scope Exclusions

This policy explicitly does **not** define:

- Payment verification.
- Billing providers.
- Pricing.
- Subscription plans.
- Discounts.
- Promotional campaigns.
- Technical activation workflow.
- Notification scheduling.
- Account deletion.
- Archival rules.
- Implementation details.

Each remains future Policy work (POL-19-008) or Module #19
specification work, per the governance hierarchy already recorded.

## Strategic Outcome

Recovery should encourage former subscribers to return with confidence.
The recovery experience should reinforce Sabush BPT's long-term
philosophy of trust, continuity, transparency, and respect for customer
ownership.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce any technical implementation detail.
  How recovery is technically triggered, verified, or activated is
  explicitly excluded and deferred to Module #19 specification work.
- This record does not derive Notification Policy (POL-19-008) — it
  is out of scope per the Scope Exclusions above and remains for its
  own POL-19-### record, per this task's explicit instruction.
- This record does not modify `docs/specs/19-subscriptions.md`, and
  does not modify Module #18 or Module #19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- `docs/specs/README.md` does not yet reference this record or any
  BDR/governance/Policy record — same gap already flagged by prior
  records, left unaddressed here by design (not part of this task's
  scope).
- With this record, POL-19-001 through POL-19-007 are all recorded;
  only POL-19-008 (Notification Policy) remains outstanding to
  complete the Planned Policy Series.

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
