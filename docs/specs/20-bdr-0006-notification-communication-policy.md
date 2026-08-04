Business Decision Record

# BDR-0006 — Notification Communication Policy

**Status:** ✅ Accepted. See "Product Architect Acceptance," below, for
the explicit scope of this acceptance. No engineering work is
authorized by this record.
**Module:** #20 — Notifications
**Record ID:** BDR-0006
**Type:** Business Decision Record — business communication policy
only. Does not authorize implementation.

---

## 1. Purpose

This Business Decision Record establishes the business policy governing
how SABUSH BPT determines whether a BusinessEvent should become a
notification.

This policy applies to every producer that emits BusinessEvents,
including: Background Worker jobs, Privileged server endpoints,
Payment webhooks, future AI producers, future SuperAdmin producers.

This Business Decision Record defines business communication policy
only. It does not authorize implementation.

## 2. Problem Statement

A BusinessEvent represents something that occurred within the platform.
Not every BusinessEvent should interrupt a human.

Without an explicit business policy, engineering would be forced to
determine: whether a notification should be created, whether
communication should be delayed, whether communication should be
suppressed, how urgent communication should be. These are Product
Architect decisions. They shall not emerge during implementation.

## 3. Core Principle

Business modules own business facts. The Notification Platform owns
communication.

Business modules determine what occurred. The Notification Platform
determines: whether communication occurs, when communication occurs,
how communication occurs, who receives communication. Business modules
never communicate directly with users.

## 4. Fact and Communication Principle

A BusinessEvent represents a business fact. A notification represents a
communication decision. These are intentionally separate concepts.
Changing communication behavior shall never change the recorded
business fact.

## 5. Communication Outcomes

Every BusinessEvent shall resolve to exactly one communication outcome.

- **Outcome 1 — Notify.** The Notification Platform creates a
  notification.
- **Outcome 2 — Batch.** The Notification Platform intentionally groups
  multiple BusinessEvents into a future notification. Batching is a
  valid communication strategy. It is not authorized for Version 1.
- **Outcome 3 — Suppress.** The Notification Platform intentionally
  records that a BusinessEvent was evaluated but produces no
  notification. Suppression is a valid communication strategy. It is
  not authorized for Version 1.

## 6. Communication Priorities

Communication priority represents urgency. It never changes the
underlying BusinessEvent. The platform recognizes four priorities:
Immediate, High, Normal, Low.

## 7. Producer Responsibilities

Business modules shall emit BusinessEvents. Business modules shall
never: render notification text, determine recipients, determine
language, choose delivery channels, determine communication timing,
determine batching, determine suppression.

## 8. Notification Platform Responsibilities

The Notification Platform determines: whether communication occurs,
communication priority, recipient resolution, language resolution
(BDR-0005), template selection, delivery timing, delivery channel
fan-out. The Notification Platform shall never modify the underlying
BusinessEvent.

## 9. Phase 3 Communication Policy

This section establishes the communication policy for the three
Version 1 Phase 3 producers.

**9.1 Closing Events.** Communication Outcome: **Notify**. Priority:
**Immediate**. Business Intent: business closing directly affects
operational continuity — the owner shall always be informed.

**9.2 Subscription Events.** Communication Outcome: **Notify**.
Priority: **Immediate**. Business Intent: subscription status directly
affects continued platform availability — the owner shall always be
informed.

**9.3 Inventory Risk Events.** Communication Outcome: **Notify**.
Priority: **High**. Business Intent: Inventory Risk affects business
value and stock health — the owner shall be informed whenever the
platform identifies an Inventory Risk event. Batching and suppression
are intentionally not authorized in Version 1; they are deferred until
sufficient operational evidence demonstrates that alternative
communication strategies would improve owner understanding without
reducing business visibility.

## 10. Future Policy Evolution

Future Business Decision Records may introduce batching, suppression,
adaptive communication, or usage-based communication strategies, once
supported by operational evidence. Those future decisions shall amend
this Business Decision Record. They are not authorized by this
document.

## 11. Relationship to BDR-0005

BDR-0005 determines which language communication uses. This Business
Decision Record determines whether communication occurs. The two
decisions are complementary; neither replaces the other.

## 12. Expected Architectural Consequences

The following are Informational Dependencies — they do not authorize
implementation:

- **Notification Template Resolution** — the Notification Platform
  will require a template-selection mechanism.
- **BusinessEvent Evaluation** — the Notification Platform will require
  an evaluation component capable of applying this communication policy
  consistently.
- **Delivery Channels** — existing `DeliveryChannel` implementations
  operate after communication policy evaluation. No new delivery
  mechanism is introduced by this Business Decision Record.

## 13. What This Decision Does Not Decide

This Business Decision Record intentionally does not define:
notification wording, template implementation, inventory thresholds,
closing thresholds, subscription timing rules, scheduling frequency,
retry strategy, storage schema, Firestore implementation, Background
Worker implementation, or DeliveryChannel implementation. These remain
implementation responsibilities or future governance decisions.

## 14. Governance Classification

This Business Decision Record establishes the business policy governing
notification communication. Implementation remains subject to: Rule 8
Assessment, Implementation Authorization, approved engineering
planning. This document does not authorize implementation.

---

## 15. Product Architect Acceptance

**Accepted.** Scope of this acceptance, as explicitly granted:

1. The Notify/Batch/Suppress outcome model (§5) and the four-level
   priority scale (§6) are adopted as the platform's communication-
   outcome framework.
2. The Version 1 policy for all three Phase 3 producers (§9) is fixed:
   Closing → Notify/Immediate, Subscription → Notify/Immediate,
   Inventory Risk → Notify/High. Batching and suppression are deferred
   platform-wide for Version 1, not just for these three producers.
3. The producer/platform responsibility split (§3, §7, §8) is adopted:
   business modules emit facts only; the Notification Platform owns
   every communication decision.

**Not included in this acceptance,** per §13, and unaffected by it: any
notification wording, template implementation, inventory/closing/
subscription-timing thresholds, scheduling frequency, retry strategy,
storage schema, or Background Worker/DeliveryChannel implementation.
None of those is decided here.

---

## Governance Notes

- This record does not modify `20-notifications.md`, any Decision Gate,
  any Business Rule, POL-20-001, ADR-0002/0003/0004, or any Phase
  close-out. `20-notifications.md` §20.1's own data model has not been
  amended to reflect the BusinessEvent-producer architecture this
  record assumes — that remains a separate, outstanding spec-amendment
  task.
- This record does not implement code, modify runtime behavior, or edit
  any `firestore.rules`, `src/`, or `server/` file. None were touched to
  produce it, and none is authorized by this acceptance.
- **Effect on the Module #20 Phase 3 Rule 8 Assessment**
  ([`20-phase3-rule8-assessment.md`](../engineering/20-phase3-rule8-assessment.md)):
  together with BDR-0005, this record resolves the *business-policy*
  half of that assessment's Contradiction 2 (ADR-0004 vs. the spec/
  Phase 2 precedent) — producers now have a deterministic answer for
  what happens once a BusinessEvent occurs. It does **not** resolve:
  - Contradiction 1 (ADR-0003's job-registration interface vs. the
    Implementation Plan's still-unamended Phase 3 wording) —
    untouched, per §13's explicit exclusion of Background Worker
    implementation.
  - The §4.8.1 dedupe/watermark mechanism — still doesn't exist in
    code, per §13's explicit exclusion of storage schema/Firestore
    implementation.
  - Detection thresholds (overdue-Closing days, Inventory-risk
    criteria, "trial ending soon") — per §13's explicit exclusion of
    all three.
  The Rule 8 Assessment's classification is not changed by this record
  alone; it should be explicitly re-run once the remaining items are
  addressed, not assumed resolved by extension.
- **Lifecycle:** Designed → Proposed → **Accepted**. Not Implemented,
  Executed, or further Analyzed — no engineering work is authorized by
  this acceptance; that remains a separate, explicit go-ahead per Rule
  8.
