Decision Record

# POL-19-013 — Payment Reversal Policy Amendment: Grace Period Reversal
Simplification

**Status:** Approved (operational policy amendment — not a Business
Decision Record, not a specification, not an implementation
authorization).
**Type:** Policy amendment, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Amends
[POL-19-010](./19-pol-010-payment-reversal-policy.md) §"Edge Case A"
and finalizes §"Edge Case B" — does not reopen POL-19-010's Core
Transition, Historical Data Preservation section, or Scope Exclusions,
all of which remain unchanged.
**Sequencing note:** Recorded as POL-19-013, the correct next
sequential identifier per the [Numbering
Ledger](./19-governance-bdr-policy-framework.md#numbering-ledger-addendum---post-planned-series-identifiers)
— POL-19-012 remains reserved for its own, unrelated topic
(Business-Lifecycle/Subscription-Status interaction) and is
deliberately not reused here, per the Ledger's own rule against
reassigning an identifier above POL-19-008 without explicit Product
Architect decision.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention every prior Module #19
policy document uses.
**Depends on:** [POL-19-010](./19-pol-010-payment-reversal-policy.md)
(the record this amends), POL-19-004 (Grace Period Policy — the 7-day
duration this amendment leaves unchanged), POL-19-005 (Subscription
State Model — no new state introduced), POL-19-007 (Subscription
Recovery Policy — remains the sole path back to Active from Expired,
unaffected by this amendment).
**Followed by:** A superseding Rule 8 re-assessment,
[`19-v1-payment-path-rule8-assessment-v2.md`](../engineering/19-v1-payment-path-rule8-assessment-v2.md),
produced in the same session as this record, reflecting the simplified
behavior below. This record does not itself authorize implementation.

---

## Why This Amendment Exists

POL-19-010's original Edge Case A defined a **recalculating** grace
period: every reversal event arriving while a subscription was already
in Grace Period reset `gracePeriodEndsAt` to a fresh 7 days from that
latest event, unbounded — a business experiencing repeated reversals
could have its grace period extended indefinitely, one 7-day window at
a time, for as long as reversals kept arriving.

On review, this was judged unnecessarily sophisticated for a V1 release
whose explicit priority is shipping a minimum, well-understood payment
path quickly and safely — not building a payment-event reconciliation
engine. An indefinitely-extendable grace period is exactly that kind of
sophistication: it requires the state machine to track and act on
*which* reversal produced the current grace window, and it creates a
business scenario (a subscription that can remain in Grace Period
indefinitely via repeated reversals) that was never a deliberate design
goal — it was a side effect of choosing "always recalculate" as the
default rule.

## Amendment — Edge Case A (Reversal Arriving During an Existing Grace
Period)

**POL-19-010's original Edge Case A is replaced in full by the
following rule:**

A reversal event arriving while a subscription is already in Grace
Period has **no additional effect on subscription state.** The
subscription **remains** `grace_period`. Its existing
`gracePeriodEndsAt` value is **not** recalculated, extended, or
otherwise altered by this second (or any subsequent) reversal event
while already in that state.

This produces the simplest possible rule, stated once:

```
ACTIVE
  │
  │ payment reversal
  ▼
GRACE PERIOD  (7 days, fixed at first entry — never reset by a later
              │        reversal while already here)
  │
  │ grace period expires (no successful payment received)
  ▼
EXPIRED
```

A subscription enters Grace Period exactly once per grace-period
episode, on the *first* reversal event that puts it there (whether from
`active` directly, per the Core Transition POL-19-010 already defines,
unchanged by this amendment). From that point, the 7-day clock set at
entry runs to completion regardless of how many further reversal events
arrive during it. This is a **strictly simpler** rule than the one it
replaces — it removes a stateful recalculation step from the
implementation, not adds one.

## Confirmation — Edge Case B (Reversal Arriving After Subscription
Expired)

POL-19-010's original Edge Case B — no automatic state effect,
Recovery (POL-19-007) as the sole approved pathway back to Active — is
**confirmed as the settled V1 rule**, not merely a default posture
pending a future decision. The behavior itself is unchanged from what
POL-19-010 already specified; what changes is its status: from
"explicitly deferred... stays explicitly open until ruled on" to
**explicitly ruled on, as of this record.** A late-arriving reversal
event, once a subscription has reached `expired`, never moves that
subscription backward. It may be logged for record-keeping/audit
purposes only (mechanics of "logged" remain unspecified by this record,
same as POL-19-010's original scope exclusion). The subscription
requires the normal Recovery mechanism (POL-19-007) — never an
automatic resurrection triggered by a late financial event.

## What This Amendment Does Not Change

- **The Core Transition** (`active` → reversal → `grace_period`) —
  unchanged, per POL-19-010.
- **Historical Data Preservation** — unchanged. A reversal event still
  never rewrites, deletes, or recalculates any prior Business Worth,
  inventory, or operational data.
- **The 7-day Grace Period duration itself** — unchanged, per
  POL-19-004.
- **No new subscription state is introduced** — the six approved
  states in POL-19-005 remain unchanged.
- **POL-19-010's Scope Exclusions** — payment-processor-specific
  webhook mechanics, retry/idempotency handling, and Grace-Period-exit
  mechanics (POL-19-004 renewal, POL-19-007 recovery) all remain out of
  scope here, exactly as POL-19-010 originally stated.
- **POL-19-011** (V1 Commercial Plan, Payment Processor selection,
  Voluntary Cancellation deferral) — entirely unaffected; not reopened
  by this record.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it — confirmed, no
  implementation exists yet for any part of the V1 payment path (per
  `19-v1-payment-path-rule8-assessment.md`'s own Current State section,
  §1: no webhook route, no PaySuite reference anywhere in the
  repository).
- **POL-19-010's own file is not edited by this record** — its original
  text is preserved intact as the historical record of what was first
  decided and why the recalculating rule was initially chosen. A short,
  clearly-marked pointer to this amendment has been added at the top of
  `19-pol-010-payment-reversal-policy.md` so a future reader is never
  misled by reading Edge Case A's original text in isolation — the same
  "flagged, not silently left inconsistent" discipline this repository
  applies elsewhere (e.g. how `19-subscriptions.md`'s "Explicitly Left
  Open" items were handled by POL-19-011 rather than edited in place).
- This record supersedes `19-v1-payment-path-rule8-assessment.md`'s
  §2b and §4 (implementation plan step 3's `grace_period` + reversal
  row), which described the now-replaced recalculating behavior. A new
  Rule 8 Assessment (`19-v1-payment-path-rule8-assessment-v2.md`) is
  produced in the same session, reflecting this amendment. The original
  v1 assessment is left in place, unedited, marked superseded — same
  non-destructive precedent as every other `-v2` document in this
  repository's history (e.g. `20-phase3-rule8-assessment-v2.md`).
- This record does not authorize Module #19 Phase 3 or Phase 5
  implementation, in whole or in part. It amends a business rule; a
  separate, explicit Rule 8 re-assessment and a separate, explicit
  Implementation Authorization remain required before any code is
  written — neither is produced by this record.
- Build order (`#19 → #20 → #18`, per `docs/specs/README.md`) is
  unaffected and not reopened.

**Lifecycle:** Designed → **Approved** (operational policy amendment
only). Not Implemented, Executed, or Analyzed — no engineering work is
authorized by this record.
