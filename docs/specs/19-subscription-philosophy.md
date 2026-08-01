Decision Record

# BDR-0001 — Subscription Philosophy for Sabush BPT

**Status:** Approved (business decision — not a specification, not an
implementation authorization).
**Type:** Business Decision Record. Precedes and will underlie the
Module #19 BDS's own eventual update — same role the [Subscription
Ownership Resolution](./19-subscription-ownership-resolution.md)
record already played for that module's original drafting.
**Location note:** Recorded in `docs/specs/` alongside
`19-subscriptions.md`, following the existing precedent set by the
Ownership Resolution record — a Decision Record that sits next to its
module's spec, module-prefixed, rather than inventing a new top-level
documentation folder for Business Decision Records. If a dedicated
`docs/business/` (or similar) location is ever wanted for BDRs
generally, that's a documentation-structure decision for you to make
separately — this record does not decide it.
**Depends on:** Nothing — this is the foundational business philosophy
Module #19's specification work will be measured against.
**Followed by:** BDR-0002 — Value Realization Framework (not yet
produced; see "Next Decision," below).

---

## Purpose

Sabush BPT subscriptions exist to sustain continued business value, not
simply to monetize software access. The trial exists to help business
owners realize measurable value from their own business data before
they are asked to subscribe.

## Core Philosophy

Sabush BPT does not primarily sell software features. It provides
business owners with answers that improve understanding of their
business, including:

- Business Worth
- Capital Growth
- Inventory Health
- Embedded Profit
- Financial Visibility
- Loss Prevention

The subscription purchases continued access to these insights rather
than merely access to software.

## Trial Philosophy

The trial is not:

- Free software
- A marketing gimmick
- A countdown timer
- A feature showcase

The trial exists so that a business owner can discover measurable value
within their own business.

## Behaviour the Trial Should Encourage

The trial should encourage:

- Recording genuine business activity
- Maintaining accurate inventory
- Reviewing Business Worth regularly
- Building confidence in the platform
- Developing sustainable management habits

The objective is business understanding rather than feature
exploration.

## Subscription Principles

1. Value before payment.
2. Business understanding before feature restriction.
3. Encourage habit formation.
4. Customer data remains the customer's property.
5. Renewal should preserve momentum rather than restore access.
6. The platform should support SMEs through normal cash-flow realities
   rather than punish temporary financial pressure.

## Trial Success

A successful trial is one in which the owner can answer questions such
as:

- What is my business worth?
- Is my capital growing?
- Which products create the most value?
- Where am I losing money?
- Is my inventory healthier than before?

Trial success is measured by business understanding rather than elapsed
time.

## Scope Exclusions

This decision does **not** define:

- Trial duration
- Pricing
- Grace periods
- Renewal cycles
- Payment providers
- Expiry behaviour
- Notification timing
- Feature restrictions

Those remain deferred to the Module #19 specification, to be decided
once BDR-0002 (below) is approved.

---

## Next Decision (Related Work, Not Yet Produced)

**BDR-0002 — Value Realization Framework.** This future decision will
define:

- What constitutes Value Realization.
- The milestones every new customer should achieve.
- The minimum business data required to generate meaningful insights.
- Which insights should be experienced before subscription is
  requested.

**The Trial Duration Policy will be derived from the approved Value
Realization Framework, not decided independently of it.** This is a
sequencing note for the record: Trial Duration is not the next decision
in queue — BDR-0002 is. No trial-length number should be treated as
pending on this document alone; it is pending on BDR-0002 first.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not begin Module #19 implementation and does not
  authorize Module #18 implementation. Both modules' implementation
  status is unchanged by this document (see below).
- The existing build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened by this
  record.
- This record does not itself amend `docs/specs/19-subscriptions.md` —
  it is the business-philosophy basis that future amendment will draw
  from, following the same sequencing the Ownership Resolution record
  used relative to the original BDS.

**Lifecycle:** Designed → **Approved** (business decision only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
