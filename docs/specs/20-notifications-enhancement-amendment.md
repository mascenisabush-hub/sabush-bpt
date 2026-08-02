Business Domain Specification — Amendment

# Module #20 Specification Enhancement Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below). Spec #20 has been
amended to incorporate these decisions — see
[`20-notifications.md`](./20-notifications.md)'s Business Rules 9–10,
UX Principles section, Functional Requirements 20.6–20.7, Data Model
(20.1), Acceptance Criteria, and "Product Architect Acceptance —
Amendment v1.1" for the `[Amendment v1.1]`-tagged additions. This
document remains the record of *why*; the specification itself remains
the source of truth for *what*.
**Implementation status:** Not yet built. This amendment is
documentation only — it does not implement code, modify runtime
behavior, or change `firestore.rules`, `src/`, `server/`, or UI.
**Amends:** [Notifications (spec #20)](./20-notifications.md) — v1.0 →
v1.1.
**Origin:** Product Architecture Review of the existing, Accepted
spec #20 (this session, prior turn) → Product Architect decision: not
to rename the module, replace the specification, or widen Decision
Gate 4, but to introduce exactly three owner-experience enhancements
that the review identified as genuine content gaps rather than mere
differences in wording.
**Does not amend:** any Business Decision Record, any Operational
Policy, `19-subscriptions.md`, ADR-0001, or any other Module
specification. Does not touch Decision Gates 1–4 of spec #20 — all four
remain unchanged and in force.

---

## Why This Document Exists

A request to draft Module #20 from scratch, framing it as a "Business
Event Communication Platform," was made without the existing accepted
specification in view. Rather than create a second, competing document
for the same module — the exact failure mode Module #19's own history
avoided — a Product Architecture Review was produced first, comparing
the proposed framing against the accepted spec's actual content.

That review found the accepted spec already functions as a business-
event-driven, channel-agnostic, Worth-anchored delivery layer in
substance — its architecture (recipient binding, creation-path
ownership, channel-agnosticism, tenant isolation) already matches what
the new framing was reaching for. But it also found three genuine
content gaps, not just wording: nothing in the spec required a
notification to explain itself, nothing distinguished urgent from
low-urgency communication, and nothing recorded a principle that
communication should build confidence rather than merely report
problems.

This amendment closes exactly those three gaps and no others. It
deliberately does not reopen Decision Gate 4 (V1's four-category
scope), which the Product Architect judged healthy as-is.

## Amendment A — Context-First Communication

**Approved rule:** every notification must explain three things: what
happened, why it matters to the business, and what action — if any —
is recommended. A notification that only states an event occurred,
without explaining its significance, does not satisfy this spec.

**Rationale:** the platform's core value is helping owners understand
and act on their business's state, not merely alerting them that
something changed. A bare event notice ("Closing overdue") leaves the
owner to work out significance and next steps themselves; a
Context-First notice ("Closing overdue — your March figures aren't
locked yet, which delays next month's comparison — close it from the
Closings screen") does that work for them.

**What this changes concretely:** spec #20's `20.1` Data Model gains a
required `context` object (`whatHappened`, `whyItMatters`,
`recommendedAction`); Business Rule 9 and new Functional Requirement
20.6 make this binding across all three creation paths, all four
categories. This affects presentation content, not scope — no new
category, recipient rule, or creation path is introduced.

## Amendment B — Communication Priority

**Approved rule:** every notification is assigned one of three
priority tiers — `immediate` (warrants interruption), `timeline`
(belongs in the Business Timeline/activity feed), or `daily_summary`
(belongs in a periodic digest) — independent of its category.

**Rationale:** not every business event deserves the same treatment. A
Closing going overdue and a routine inventory count both being
"notifications" in the same undifferentiated stream would either
under-alarm the urgent case or over-alarm the routine one. Explicit
tiers let the same four accepted categories (Decision Gate 4,
unchanged) be delivered with judgment rather than uniformly.

**What this changes concretely:** spec #20's `20.1` Data Model gains a
required `priority` field; Business Rule 10 and new Functional
Requirement 20.7 define the three-tier taxonomy and its purpose. This
changes delivery behavior, not business scope — it does not change
which events produce a notification. The specific default tier for
each notification `type` is deliberately **not** decided here — see
spec #20's "Explicitly Left Open" — that mapping is implementation-
planning work, not a scope decision this amendment should pre-empt.

## Amendment C — Owner Confidence Principle

**Approved rule:** communication should help the owner make decisions
and should reduce uncertainty rather than merely report events. Where
possible, communication should include guidance rather than reporting
a problem in isolation.

**Rationale:** this is the connective principle behind Amendments A and
B — it's the "why" that Context-First content should serve and the
judgment that Priority tiering should reflect. Recording it explicitly
means future content and presentation decisions (exact copy, exact
tier assignments) have a stated principle to be judged against, not
just a schema to satisfy.

**What this changes concretely:** a new "UX Principles" section in
spec #20, containing this principle alone. **Deliberately not** a
Business Rule, not a schema field, not an Acceptance Criterion — this
is recorded as qualitative guidance, not a technical requirement,
exactly as decided.

## What This Amendment Does Not Do

Per explicit Product Architect direction:

- Does not rename Module #20 or its specification.
- Does not replace `20-notifications.md` with a new document.
- Does not widen Decision Gate 4 — V1 remains exactly four categories
  (Business Closing, Inventory Risk, Subscription, Platform
  Announcements).
- Does not introduce AI-generated recommendation notifications (Module
  #15 dependency).
- Does not introduce Staff Activity notifications.
- Does not introduce Business Worth milestone notifications.
- Does not implement any code, modify `firestore.rules`, touch
  `Header.tsx`, or create `NotificationContext`.
- Does not modify Module #19, any BDR, any POL, or ADR-0001.

Each of the six excluded items above remains available as a future,
separate amendment or BDR, if and when a real implementation need
demonstrates it — not before.

## Lifecycle

**Designed → Executed review → Analyzed → Accepted.** This amendment
documents the Product Architect's direction as given following the
Product Architecture Review of spec #20 (prior turn, this session):
three specific, scoped enhancements accepted; renaming, replacement,
and Decision Gate 4 widening explicitly declined. Accepted through the
same explicit acceptance step every other module amendment in this
series has used (the Closing Integrity Amendment, the Module #19
Specification Alignment Amendment) — not by virtue of being written
down here.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  `firestore.rules`, or change any file other than
  `docs/specs/20-notifications.md` (amended in place, per this
  document) and itself.
- `docs/specs/README.md` does not yet reference this amendment —
  updating that index is a separate, subsequent documentation step, not
  performed here.
- The three amendments recorded here were verified against the actual
  current text of `20-notifications.md` (Decision Gates 1–4, Business
  Rules 1–8, Functional Requirements 20.1–20.5) as part of producing
  this record, via the Product Architecture Review that preceded it —
  not asserted without checking the source.
