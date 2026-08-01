Decision Record

# BDR-0002 — Value Realization Framework

**Status:** Approved (business decision — not a specification, not an
implementation authorization).
**Type:** Business Decision Record. Second in the Module #19 business
philosophy chain, following the same location and documentation
pattern as [BDR-0001 — Subscription Philosophy](./19-subscription-philosophy.md).
**Depends on:** [BDR-0001](./19-subscription-philosophy.md) — BDR-0001
answered *why* the trial exists; this record answers *what evidence
proves its purpose was achieved*. BDR-0001 explicitly named this
document ("Next Decision") as the required predecessor to Trial
Duration Policy — that sequencing is confirmed, not reopened, here.
**Followed by:** Trial Duration Policy (not yet produced) — to be
derived from this framework, not decided independently of it, per
BDR-0001's own sequencing note.
**Location note:** Same reasoning as BDR-0001 — no dedicated BDR
location exists in this repo beyond the `docs/specs/` Decision Record
precedent already established by
`19-subscription-ownership-resolution.md`. Filed alongside BDR-0001,
module-prefixed, rather than a new top-level folder.

---

## Purpose

Define the Value Realization Framework for Sabush BPT — how a business
owner progresses from *using* Sabush BPT to *understanding and trusting
their business* through Sabush BPT.

## Definition

**Value Realization** is the moment when a business owner gains a
measurable business insight that could not easily have been obtained
before using Sabush BPT.

Value Realization is **not**:

- Completing onboarding
- Entering transactions
- Exploring features
- Reaching a certain number of trial days

## Core Principle

A trial succeeds when the owner experiences business understanding.

**Time supports Value Realization. Time does not define it.**

## The Value Journey

Five approved stages:

1. **Data Foundation** — the owner has begun recording genuine business
   activity (inventory, purchases, sales-adjacent records) — the raw
   material every later stage depends on, not itself an insight.
2. **Business Visibility** — the owner can see their business's current
   state reflected back to them (inventory levels, recorded activity) —
   the platform is now a mirror, not yet an advisor.
3. **Business Insight** — the owner encounters a specific, concrete
   finding they could not have easily produced themselves (e.g., which
   products carry the most embedded profit, where capital is being
   lost) — the first genuine Value Realization moment.
4. **Business Confidence** — the owner begins trusting the platform's
   numbers enough to reference them when making a decision, rather than
   treating them as a novelty or a curiosity.
5. **Business Worth Awareness** — the owner understands Business Worth
   itself as an ongoing measure of their business's health, not a
   one-time report — the platform has become part of how they think
   about their business.

## Required Value Milestones

Every customer should experience:

- Visibility into inventory
- Understanding of capital movement
- Awareness of embedded profit
- Recognition of business growth
- Awareness of business risks
- Increased confidence in decision-making

**These are strategic outcomes, not implementation rules.** Which
screens, features, or mechanisms produce them is deferred to Module
#19 specification work and, per Business Rule 5 already established in
`19-subscriptions.md`, must never make Business Worth history itself a
subscription-gated feature.

## Minimum Data Principle

Strategic insights should only be produced when sufficient business
data exists. If adequate data is unavailable, the platform should
encourage continued business activity instead of presenting misleading
conclusions.

## Quality Principle

Prefer a small number of trusted insights over a large number of
superficial analytics. Business clarity is more valuable than feature
quantity.

## AI Principle

AI exists to accelerate Value Realization. Its role is to identify
patterns, opportunities, and risks that improve business understanding.
**AI supports business judgment; it does not replace it.**

## Trial Success

The trial succeeds when the owner can confidently answer questions
such as:

- What is my business worth?
- Is my capital growing?
- Which products create the most value?
- Which inventory is reducing business worth?
- Where am I losing profit?
- What should I improve next?

## Derived Policies (Not Defined Here)

This Business Decision Record does **not** define:

- Trial Duration
- Trial Activation
- Trial Expiry
- Grace Period
- Subscription Conversion
- Notifications
- Renewal
- Payment Rules

Those remain future Module #19 specification work, to be derived from
this framework once produced — not inferred or assumed ahead of it.

## Product Principle

Sabush BPT should never encourage payment before meaningful business
value has been demonstrated. Subscriptions represent continuation of a
successful Value Journey rather than payment for software access.

## Strategic Metric

**Value Realization Rate (VRR)** — the proportion of new businesses
that reach meaningful business understanding during the trial.

**VRR is currently a strategic concept, not an implementation metric.**
No collection, aggregation, dashboard, or Background Worker job is
authorized by naming it here. If VRR is ever operationalized, it would
most likely intersect with the Analytics domain (Architecture §3.16),
which `docs/specs/README.md` already confirms is out of scope until
scheduled alongside Module #18/SuperAdmin (§9.8) — that scheduling
question is not decided or reopened by this record.

## Owner Transformation

The approved long-term owner journey, recorded as a **Product
Principle**, not an implementation requirement:

1. I have data.
2. I can see my business.
3. I understand my business.
4. I trust my decisions.
5. I know how to increase my business worth.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not derive Trial Duration Policy, and does not
  update `19-subscriptions.md`'s business rules. Both remain future
  work, gated on this framework existing first — which it now does.
- Module #18 and Module #19 implementation authorization are unchanged.
  Build order (`#19 → #20 → #18`, per `docs/specs/README.md`) is
  unaffected and not reopened.
- **Cross-references not yet updated, flagged for later, not done
  now:** `docs/specs/README.md`'s Module #19 note does not yet point to
  BDR-0001 or BDR-0002; `19-subscriptions.md` itself does not yet cite
  either record. Per standing engineering discipline (no speculative
  edits without explicit instruction to touch that specific file), this
  record does not make those edits — they're listed here as a
  recommended future documentation-sync step, not executed.

**Lifecycle:** Designed → **Approved** (business decision only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
