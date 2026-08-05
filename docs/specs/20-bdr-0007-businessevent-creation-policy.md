Business Decision Record

# BDR-0007 — BusinessEvent Creation Policy

**Status:** ✅ Accepted. See "Product Architect Acceptance," §8 below,
for the explicit scope of this acceptance. No engineering work is
authorized by this record.
**Module:** #20 — Notifications (defines inputs used by Module #19 and
Module #7/#10/#11 producers)
**Record ID:** BDR-0007
**Type:** Business Decision Record — business fact definition only.
Does not authorize implementation.
**Precedes:** a fresh Module #20 Phase 3 Rule 8 Assessment (new
document, not an edit to `20-phase3-rule8-assessment.md`), which itself
would precede any Phase 3 Implementation Authorization.
**Basis:** [ADR-0004](../adr/ADR-0004-notification-platform-architecture.md)
(BusinessEvent contract and terminology — Decision 1), [BDR-0006](./20-bdr-0006-notification-communication-policy.md)
(communication policy this record maps into but does not redefine),
[`20-phase3-remaining-product-decisions-review.md`](../engineering/20-phase3-remaining-product-decisions-review.md)
§3 (the three Required Future Governance items this record resolves),
[`11-monthly-closings.md`](./11-monthly-closings.md) (`endDate`,
`periodType`, `isPeriodClosed`), [`07-breakages.md`](./07-breakages.md)
(`isQuebraExceedingWarning` — existing data-quality signal),
[POL-19-002](./19-pol-002-trial-duration-policy.md) (30-day trial from
Trial Activation), [POL-19-004](./19-pol-004-grace-period-policy.md)
(7-day post-expiry Grace Period — a distinct, non-overlapping concept),
[POL-19-008](./19-pol-008-subscription-notification-policy.md)
(explicitly excludes notification timing/scheduling from its own
scope, naming it as future Module #20 work — this record is that
work, for the BusinessEvent side only).

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `docs/specs/20-notifications.md`, any ADR, or
any prior BDR/POL to produce this document.**

---

## 1. Purpose

This Business Decision Record answers exactly one question: **when
does a BusinessEvent come into existence?**

ADR-0004 established that producers emit `BusinessEvent`s, never
notification text, and defined the `BusinessEvent` contract's shape
(§"BusinessEvent contract" — `producer`, `eventType`, `dedupeKey`,
`occurredAt`, `priority`, `context`, `payload`, `recommendedAction`).
It deliberately left *when a given eventType fires* undecided, as a
Product Architect question. BDR-0006 then established what happens
*after* a BusinessEvent exists (Notify/Batch/Suppress, priority) — also
deliberately leaving *when* undecided. Both documents point at this
gap without filling it. This record fills it, and only it.

## 2. Scope

**In scope:** the trigger condition for each Phase 3 `eventType` —
the objective business fact that must be true for a `BusinessEvent` to
be emitted.

**Explicitly out of scope, unaffected by this record:**

- Notification language — [BDR-0005](./20-bdr-0005-notification-language-resolution-policy.md).
- Communication policy (Notify/Batch/Suppress, priority) —
  [BDR-0006](./20-bdr-0006-notification-communication-policy.md), §9
  of which already fixes the outcome for all three Phase 3 producers.
  This record does not reopen it — see §5 (Mapping) below.
- Delivery channels — ADR-0004 Decision 8, `DeliveryChannel`/
  `InAppChannel`.
- Implementation of any kind — job registration (ADR-0003), worker
  scheduling, dedupe/watermark mechanism (Architecture §4.8.1 — already
  fully specified, per the Remaining Product Decisions Review §2.4;
  not reopened here), persistence, `platform_worker_state`.

## 3. Core Principle

**BusinessEvents are created from objective business facts, never from
assumed operating schedules.**

A `BusinessEvent`'s trigger condition must be checkable against data
that already exists and is already true or false at evaluation time —
never against an inferred or assumed cadence (e.g., "businesses
usually close by the 5th") that the platform does not actually enforce
or record.

**Where an existing domain object already defines time — such as
Closing's `endDate` — BusinessEvents shall use that domain fact rather
than introducing a new, parallel scheduling concept.** This record
introduces no new date fields, no new "expected closing date" concept,
and no scheduling infrastructure of its own; every trigger below reads
an existing field or an existing computed state.

**BusinessEvents exist independently of notification delivery.** A
BusinessEvent may exist even if no notification is ultimately
delivered. Communication policy (BDR-0006) determines whether and how
humans are informed; it never determines whether the BusinessEvent
occurred. This record defines only the latter. Whether any given
occurrence of `closing.overdue`, `inventory.risk.breakage`, or
`trial.ending_soon` ends up as a notification, a batched notification,
or a suppressed one remains entirely BDR-0006's decision, made after
the fact already exists.

## 4. Decisions

### 4.1 Decision 1 — Closing BusinessEvents

Three distinct `eventType`s are defined, each representing a separate
business fact about a Closing period's relationship to its own
`endDate` (`11-monthly-closings.md`) and `isPeriodClosed` state:

| eventType | Business meaning | Trigger |
|---|---|---|
| `closing.approaching` | The current period's deadline is close enough that the Owner should be aware a Closing is coming, while there is still comfortable time to act. | `endDate` is 3 days away AND `isPeriodClosed` is false for that `periodType`/`startDate`/`endDate` combination. |
| `closing.due` | The period has reached its deadline. This is a neutral statement of fact — it does not imply anything went wrong. | `endDate` is today AND `isPeriodClosed` is false. |
| `closing.overdue` | The deadline has passed and the period remains open. This is the fact that operational continuity is now at risk — the reason Closing events are Notify/Immediate under BDR-0006 §9.1. | `endDate` was 3 days ago AND `isPeriodClosed` is still false for that period. |

These are **objective business facts about the state of a Closing
period**, not notification timings — whether, when, and how urgently
each becomes a communication to the Owner is BDR-0006's decision, not
this record's. This record only says the fact exists.

**Each Closing BusinessEvent represents an independent business fact.
The existence of one BusinessEvent does not replace or invalidate
another.** `closing.approaching`, `closing.due`, and `closing.overdue`
are three separate facts, each emitted at its own trigger point for
the same period, not three values of a single status field. A period
that reaches `closing.overdue` does not retract or supersede its
earlier `closing.approaching` or `closing.due` events — all three
remain true, independently, for as long as their trigger condition was
met at the time they were evaluated. Producers and any future
consumer must not collapse these into a single "closing status"
concept.

No scheduled "expected closing date" is invented. All three triggers
read `endDate`, an already-existing field, plus `isPeriodClosed`, an
already-existing computed state (`11-monthly-closings.md`, referenced
directly in the Phase 3 Rule 8 Assessment and the Remaining Product
Decisions Review §2.1).

### 4.2 Decision 2 — Inventory Risk BusinessEvents

**Breakages (#7):** one `eventType`, `inventory.risk.breakage`, is
defined. This record makes an explicit Product decision to **adapt**
the existing `isQuebraExceedingWarning` signal into a BusinessEvent
trigger — not to reuse it unexamined, and not to reject it.

The distinction is deliberate and load-bearing:

- **`isQuebraExceedingWarning` (existing)** is a data-quality signal.
  Per `07-breakages.md` (citing Architecture §8.5), it exists to flag a
  probable miscount on a batch — it answers "does this batch's data
  look wrong?" It remains exactly what it was: a Dashboard warning
  banner, UI-only, unchanged by this record.
- **`inventory.risk.breakage` (new BusinessEvent)** is a business-value
  communication trigger. It answers a different question — "should the
  Owner be told their business value is at risk?" — and is evaluated
  the moment `isQuebraExceedingWarning` becomes true for a batch, using
  that same underlying condition (cumulative losses exceeding the
  batch's original quantity) as its trigger, but as a *new*, separately
  named fact, not a silent rename or reuse of the existing flag.

This record does not modify `isQuebraExceedingWarning`, its
calculation, or its existing Dashboard usage in any way.

**Guiding principle: BusinessEvents communicate business significance,
not internal validation logic.** A signal built to catch a probable
data-entry error is not automatically fit to become an owner-facing
notification, and a business-significant fact is not automatically a
data-quality problem. This distinction is why Breakages required an
explicit adapt decision rather than a reflexive reuse of
`isQuebraExceedingWarning`, and it is the test any future producer
should apply before proposing a new `inventory.risk.*` or similar
eventType: does this represent something the Owner should know about
their business, or only something the system should flag to itself.

**Stock Counts (#10):** **explicitly deferred.** `10-stock-counts.md`
contains no discrepancy, variance, threshold, or risk concept today —
confirmed by direct search in the Remaining Product Decisions Review
§2.2, "a genuinely blank slate." This record does not invent one. No
`inventory.risk.*` eventType is defined for Stock Counts. A Stock
Counts Inventory Risk BusinessEvent remains a future, separate Product
Architect decision, requiring its own discrepancy/variance definition
in `10-stock-counts.md` (or an amendment to it) before any
corresponding eventType can be named here.

### 4.3 Decision 3 — Trial Lifecycle BusinessEvents

Two `eventType`s are defined, both grounded in the fixed, already-
Approved 30-day trial window (POL-19-002: `trialEndsAt` =
`trialActivatedAt` + 30 days):

| eventType | Business meaning | Trigger |
|---|---|---|
| `trial.ending_soon` | The trial has entered its final week. The Owner still has meaningful time to convert or take action. | 7 days before `trialEndsAt` (T-7). |
| `trial.ending_tomorrow` | The trial is about to end. This is the last advance-warning opportunity before expiry. | 1 day before `trialEndsAt` (T-1). |

No additional reminders are defined. This record deliberately supplies
only the two thresholds requested — it does not add a T-14, a T-3, or
any other intermediate point, consistent with POL-19-002's own stated
preference for operational simplicity over unnecessary complexity.

These two events are triggered by `trialEndsAt`, a fixed point already
defined by an Approved policy — they are **not** the same concept as
POL-19-004's 7-day Grace Period, which is a distinct, post-expiry
continuation window that begins only *after* `trialEndsAt` has already
passed. Nothing in POL-19-004 is amended, referenced as a trigger
source, or reinterpreted by this record.

This record is the future specification work POL-19-008 named and
explicitly declined to define itself (§"Scope Exclusions": "Notification
timing... Reminder frequency... Scheduling" are out of its scope,
"including Module #20's own eventual implementation of its
'Subscription Notifications' category"). POL-19-008's own communication
rules (recipient, tone, content boundaries) are unaffected and are not
revisited here.

## 5. Mapping to BDR-0006 (reference only — not redefined)

This record does not decide, and does not repeat, any communication
outcome or priority. The table below maps each newly defined
`eventType` to its producer and to the outcome BDR-0006 already fixed:

| eventType | Producer | Communication Policy (Outcome / Priority) | BDR-0006 basis |
|---|---|---|---|
| `closing.approaching` | `closing-integrity` | Notify / Immediate | §9.1 (Closing Events) |
| `closing.due` | `closing-integrity` | Notify / Immediate | §9.1 (Closing Events) |
| `closing.overdue` | `closing-integrity` | Notify / Immediate | §9.1 (Closing Events) |
| `inventory.risk.breakage` | `breakage-tracking` | Notify / High | §9.3 (Inventory Risk Events) |
| `trial.ending_soon` | `trial-engine` | Notify / Immediate | §9.2 (Subscription Events) |
| `trial.ending_tomorrow` | `trial-engine` | Notify / Immediate | §9.2 (Subscription Events) |

**A precision note on the Producer column, in the interest of not
silently presenting invented values as settled:** `closing-integrity`
is not this record's invention — it is ADR-0004's own literal example
value (Decision 6: `producer: "closing-integrity"`), and its
companion phrase "Closing Integrity's call" appears earlier in the
same ADR when discussing `dedupeKey` ownership. `trial-engine` follows
the same evidenced naming — ADR-0004 refers to "the Trial Engine's
call" in identical phrasing, though not as a literal code string. Both
are adopted here as-is, not renamed. `breakage-tracking`, by contrast,
has **no precedent anywhere in the repository** — it is this record's
own placeholder, offered only so the table has a complete producer
column, not a governance decision about the Breakages module's actual
job/producer identity. The real value is an implementation detail
belonging to ADR-0003's job-registration work, not to this BDR; treat
`breakage-tracking` as illustrative only.

BDR-0006 §5's Batch and Suppress outcomes remain unauthorized for
Version 1 platform-wide; nothing above changes that.

## 6. What This Decision Does Not Decide

This Business Decision Record intentionally does not define: the
`BusinessEvent` contract's implementation, `dedupeKey` construction,
the dedupe/watermark mechanism, job registration or scheduling
(ADR-0003), notification wording or templates, delivery channels,
recipient resolution, language (BDR-0005), communication outcome or
priority beyond the reference mapping in §5, a Stock Counts Inventory
Risk definition, or any threshold beyond the six named in §4. None of
these is decided here.

## 7. Governance Classification

This record establishes business-fact trigger definitions only.
Reaching Acceptance (§8, once granted) resolves the three "Required
Future Governance" items identified in
`20-phase3-remaining-product-decisions-review.md` §3/§5. It does not
itself constitute a Phase 3 Rule 8 Assessment, and does not authorize
any implementation. Per that review's own §7 recommendation, the next
legitimate step after this record is Accepted is a **fresh** Phase 3
Rule 8 Assessment, run as a new document.

---

## 8. Product Architect Acceptance

**Accepted.** Scope of this acceptance, as explicitly granted:

1. The six `eventType`s defined in §4 — `closing.approaching`,
   `closing.due`, `closing.overdue`, `inventory.risk.breakage`,
   `trial.ending_soon`, `trial.ending_tomorrow` — and their trigger
   conditions are adopted as the Phase 3 BusinessEvent trigger
   definitions.
2. The three Core Principles in §3 (facts over assumed schedules;
   reuse of existing domain time fields over new scheduling concepts;
   BusinessEvent existence as independent of notification delivery)
   are adopted as platform-wide BusinessEvent-creation principles, not
   scoped to Module #20 alone.
3. The explicit deferral of a Stock Counts Inventory Risk BusinessEvent
   (§4.2) is adopted — no discrepancy/variance concept is authorized
   for Stock Counts by this or any prior record.
4. The Producer column of §5's mapping table is adopted with the
   precision distinction stated there intact: `closing-integrity` and
   `trial-engine` are evidenced identifiers from ADR-0004;
   `breakage-tracking` is explicitly illustrative only, and its real
   value remains ADR-0003 job-registration's decision to make, not
   fixed by this acceptance.

**Not included in this acceptance,** per §6, and unaffected by it: the
`BusinessEvent` contract's implementation, `dedupeKey` construction,
the dedupe/watermark mechanism, job registration or scheduling,
notification wording or templates, delivery channels, recipient
resolution, language, or any communication outcome/priority beyond the
reference mapping in §5. None of those is decided here.

---

## Governance Notes

- This record does not modify `20-notifications.md`, any Decision
  Gate, ADR-0002/0003/0004, BDR-0005, BDR-0006, POL-19-002,
  POL-19-004, POL-19-008, `11-monthly-closings.md`, or `07-breakages.md`.
- This record does not implement code, modify runtime behavior, or
  edit any `firestore.rules`, `src/`, or `server/` file. None were
  touched to produce it, and none is authorized by it, at any status.
- This record is **not committed or pushed**. It exists only as a
  proposed document pending review, per the task instruction that
  produced it.
- `README.md` and `HANDOFF.md` are not updated by this record, per
  standing instruction that they remain intentionally stale until
  Module #20 governance reaches a stable point.
- **Lifecycle:** Designed → **Proposed**. Not Accepted, not
  Implemented, not Executed. Acceptance is a separate, explicit
  Product Architect decision; implementation remains further gated by
  Rule 8 after that.
