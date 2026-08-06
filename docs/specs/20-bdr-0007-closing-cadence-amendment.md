Business Decision Record — Amendment

# BDR-0007 Amendment — Closing Cadence Is Not a Business Setting

Version 1.0
**Status:** ✅ Accepted (2026-08-06). Product Architect decision, this
session.
**Implementation status:** Not yet built. This amendment is
documentation only — it does not itself implement code, modify runtime
behavior, or change `firestore.rules`, `src/`, or `server/`. Checkpoint
4 (Closing Integrity producer) implementation may now proceed under the
already-signed Phase 3 Implementation Authorization.
**Amends:** [BDR-0007 — BusinessEvent Creation Policy](./20-bdr-0007-businessevent-creation-policy.md)
§4.1 (Closing triggers) — resolves an assumption that section made
without available supporting data.
**Does not amend:** the `Business`, `Closing`, or `ClosedPeriod` schema
(`src/types.ts`), `ClosingView.tsx`, `firestore.rules`, or any other
BDR/ADR. No new field is introduced anywhere in the system as a result
of this decision.
**Origin:** discovered during Checkpoint 4 Rule 8 investigation (this
session) — BDR-0007 §4.1's `closing.approaching`/`due`/`overdue`
triggers assume a business's "current period" `endDate` is available.
Investigation of `Business`, `Closing`, `ClosedPeriod`, and
`ClosingView.tsx` found no such field exists, or has ever existed.
Reported and implementation paused, not resolved by engineering
judgment.

---

## 1. Problem Statement

BDR-0007 §4.1 defines Closing notification triggers relative to "the
current period's `endDate`." Investigation found no business owns a
persisted closing cadence (`monthly`/`yearly`) or a "next period"
boundary anywhere in the schema. `ClosingView.tsx`'s `periodType` is
component-local UI state, re-chosen by the Owner every time the screen
opens — never saved. `Closing` and `ClosedPeriod` documents only ever
describe periods that have already been closed. BDR-0007's assumption
does not hold against the current data model.

## 2. Options Considered and Rejected

- **Monthly / yearly default** — rejected. Assigns every business an
  operating rhythm it never chose, contradicting Principle 2.4 (never
  approximate a real business distinction for implementation
  convenience) and risking inaccurate notifications for any business
  whose real cadence differs.
- **Owner chooses once at setup** — rejected, not on merit but on
  necessity: adds mandatory setup friction for the "notebook or
  nothing" SME target user (§1.8) to solve a problem this decision
  shows doesn't require solving.
- **Closing cadence becomes a Business Setting** — rejected for now.
  Same schema cost as above, plus an unresolved edge case (what happens
  to an in-flight period if cadence changes mid-stream) that would need
  its own decision. Not ruled out permanently — see §5.

## 3. Decision

**A business does not own a configurable Closing Cadence.** The
current period is derived, not stored: BDR-0007's Closing triggers are
redefined to key off the most recent **active** `Closing` document
(`status` absent or `'active'`, per the existing, already-implemented
semantics in `src/types.ts`) — its `periodType` and `endDate` project
forward to the next expected boundary. **A business with zero prior
Closings receives no Closing notifications.** This is the intended
behavior, not a gap: "you're overdue" is only a meaningful statement
once a business has demonstrated the rhythm being measured against.

## 4. Business Rationale

Consistent with Business Worth Platform philosophy (§1.8, Principle
2.4): this observes real business behavior instead of assigning
business behavior. It adds zero setup friction for the target SME
Owner, requires zero migration for existing businesses, and cannot
produce a false "overdue" notification for a cadence a business never
declared, since none is declared — the platform only ever reacts to
what an Owner has actually already done.

## 5. Business Invariant (flagged for future modules)

This decision establishes a durable modeling fact, not just a
Module #20 implementation choice: **SABUSH BPT has no concept of a
business's "closing cadence" as configuration — only as closing
history.** Any future module reasoning about periods (consolidated
reporting, dashboards, AI insights, financial timelines) must derive
the same way — from the most recent `Closing`, never from an assumed
or stored cadence. Recorded here, at BDR-0007-amendment scope, per the
Product Architect's direction to keep this lightweight; promote to a
standalone architecture-level principle if or when a second module
needs the same derivation, rather than now.

## 6. Implementation Implications

- Checkpoint 4's `closingNotificationProducer.ts` queries the
  `closings` collection group, filtered to active status, most recent
  `endDate` per business — no new field, no new persisted document
  type.
- One new collection-group index (`closings`, `status` ASC / `endDate`
  DESC) — the only new infrastructure this decision requires.
- No migration: every business's eligibility is already fully
  expressed in existing data the moment this ships.

## 7. Explicit Statement

**This is a product decision, not an implementation detail.** It
determines what SABUSH BPT understands a business's operating rhythm to
be — a Business Worth modeling question — not merely how a background
job is written. Recorded as a BDR-0007 amendment per this repository's
governance framework (`19-governance-bdr-policy-framework.md`): it
answers a "what does the platform assume about how a business operates"
question, the same category BDR-0007 itself exists to answer, not a
Policy-level "how, specifically" refinement of an otherwise-settled
strategic question.
