Decision Record

# POL-19-003 — Trial Expiry Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-001/POL-19-002; does not itself
define technical enforcement of read-only state, export mechanics, data
retention, or account deletion.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by
POL-19-001/POL-19-002.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), BDR-0003 (Trial Experience Framework),
POL-19-001 (Trial Activation Policy), POL-19-002 (Trial Duration
Policy) — this policy defines what happens once POL-19-002's 30-day
period, measured from POL-19-001's activation event, elapses.
**Followed by:** POL-19-004 — Grace Period Policy (not yet drafted, not
derived by this record).

---

## Purpose

Define the business meaning of trial completion and establish how
Sabush BPT should behave when the standard trial period ends.

## Guiding Principle

**The end of the trial marks the end of unrestricted business
operation — not the end of the customer's relationship with Sabush
BPT.** The platform continues to respect the customer's business data
and the value already created.

## Business Meaning of Trial Completion

Trial completion means the owner has received the agreed opportunity to
experience Sabush BPT. It does **not** imply:

- account deletion,
- loss of ownership,
- loss of historical records, or
- loss of trust.

The business remains part of the platform.

## Data Ownership Principle

Business data always belongs to the business owner. Trial expiry must
never be used to pressure customers through fear of losing their own
information. Sabush BPT earns subscriptions through demonstrated value
rather than by withholding customer-owned data.

## Read-Only Preservation

After trial expiry, the business enters a **read-only** state. Owners
may continue to:

- Sign in.
- View dashboards.
- Review historical reports.
- View Business Worth.
- Review inventory history.
- Review historical transactions.
- Export their own business data (subject to future export policy).

Owners may not continue operational activities that create new business
records.

## Operational Restrictions

Operational data creation is suspended until an active subscription
exists. Illustrative examples only — not an exhaustive or binding list:

- creating new sales,
- creating purchases,
- receiving stock,
- adjusting inventory,
- recording expenses.

The exact list of restricted operations will be defined by the
Module #19 specification.

## Continued Visibility

Historical business insights remain visible after expiry. Business
Worth remains visible. Historical performance remains visible. The
platform should continue demonstrating value rather than creating
artificial scarcity.

## Subscription Invitation

The platform should invite the owner to continue growing the business
rather than threaten loss of access.

## Trust Principle

Transparency, continuity, and respect for customer ownership take
precedence over short-term conversion pressure.

## Product Principle

**Customers should never feel punished for evaluating Sabush BPT.**

## Strategic Outcome

A customer who does not subscribe immediately should still leave
believing:

- their data is respected,
- their business remains theirs,
- Sabush BPT acted fairly,
- returning later is easy,
- subscribing later remains attractive.

## Scope Exclusions

This policy explicitly does **not** define:

- Grace Period Policy.
- Subscription State Model.
- Conversion Policy.
- Recovery Policy.
- Notification Policy.
- Export implementation.
- Data retention periods.
- Account deletion rules.
- Technical enforcement.

Each remains future Policy work (POL-19-004 through POL-19-008) or
Module #19 specification work, per the governance hierarchy already
recorded.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce any technical enforcement detail. How
  read-only state is enforced (client gating, `firestore.rules`
  changes, server-side checks), how export is implemented, and how the
  restricted-operations list is finalized are all explicitly excluded
  and deferred to Module #19 specification work.
- This record does not derive Grace Period, Subscription State Model,
  Conversion, Recovery, or Notification policy — each is out of scope
  per the Scope Exclusions above and remains for its own POL-19-###
  record.
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
