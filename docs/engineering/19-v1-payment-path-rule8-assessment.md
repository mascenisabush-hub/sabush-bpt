# Module #19 (Subscriptions) — V1 Payment Path Rule 8 Assessment
## (Minimum Slice: Phase 2 dependency, Phase 3 slice, Phase 5 slice)

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan, per `CLAUDE.md`'s Rule 8 process. Planning
only. **Does not authorize implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision.
**Scope — read this before anything else below:** This assessment is
**deliberately narrower** than "Phase 2," "Phase 3," or "Phase 5" as a
whole. It exists to authorize, if and when separately approved, exactly
this minimum path and nothing beyond it:

```
Trial → Trial Completed → Customer pays → Processor confirms payment →
Verified webhook → Subscription becomes Active

Active → Payment reversal → Grace Period
```

Nothing more. In particular: **"Phase 3 is a dependency" does not mean
the full Grace/Conversion/Recovery lifecycle is in scope**, and
**"Phase 5 is a dependency" does not mean full Commercial Integration
(billing-cycle evaluation, payment-failure retry, refunds, plan
changes) is in scope.** Section 2c below lists what is explicitly
excluded, by name, so this cannot be misread later as broader
authorization than it is.

**Basis:** [`19-subscriptions.md`](../specs/19-subscriptions.md) (v2.0,
Accepted); [POL-19-004](../specs/19-pol-004-grace-period-policy.md)
(Grace Period), [POL-19-005](../specs/19-pol-005-subscription-state-model.md)
(State Model), [POL-19-006](../specs/19-pol-006-subscription-conversion-policy.md)
(Conversion), [POL-19-007](../specs/19-pol-007-subscription-recovery-policy.md)
(Recovery), [POL-19-010](../specs/19-pol-010-payment-reversal-policy.md)
(Payment Reversal — new this session), [POL-19-011](../specs/19-pol-011-v1-commercial-plan-processor-cancellation-decision.md)
(V1 Commercial Plan, Processor & Cancellation — new this session);
Architecture §4.12 (Payments and Subscriptions Integration), §9.4/§6.7
(SuperAdmin override); [`19-subscriptions-implementation-plan.md`](./19-subscriptions-implementation-plan.md)
§13 (Phase numbering: Phase 2 Trial Management, Phase 3 Subscription
Lifecycle, Phase 5 Commercial Integration); current `src/types.ts`,
`firestore.rules`, `server/index.ts` state as of commit `4110ebb`.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*` file to produce this document.**

---

## 1. Current State (grounded in actual code, not assumed)

- `SubscriptionStatus` (`src/types.ts`) already defines all six approved
  states (`trial_pending`, `trial_active`, `trial_completed`, `active`,
  `grace_period`, `expired`). No `canceled` state exists — consistent
  with POL-19-011 §3's V1 deferral decision.
- `gracePeriodEndsAt: string | null` already exists on the `Subscription`
  interface, commented as "set on entry to grace_period; +7 days
  (POL-19-004)" — a Phase 1 forward-declaration, never wired to any
  transition logic. This is exactly the field POL-19-010's Edge Case A
  (fresh 7-day recalculation) needs to write to.
- `firestore.rules`' `subscriptionAllowsNewRecords()` already restricts
  new operational-record creation only on `trial_completed` and
  `expired` — `grace_period` is already treated as unrestricted, which
  is correct per POL-19-004's "full operational capability" language
  and requires **no rule change** for a reversal-driven entry into
  `grace_period`, since the gate reads only the `status` field, not how
  the business arrived at that status.
- `server/index.ts` has exactly two subscription-mutating endpoints:
  `POST /api/provisioning/business` (Phase 1, creates the initial
  `trial_pending` doc) and `POST /api/subscriptions/activate-trial`
  (Phase 2, `trial_pending → trial_active`). **No `/api/billing/webhook`
  route exists.** Confirmed by direct grep — no occurrence of `webhook`
  anywhere in `server/`.
- **No PaySuite reference of any kind exists anywhere in the
  repository** — confirmed by direct grep across `src/`, `server/`,
  `firestore.rules`. POL-19-011 records the vendor decision only; zero
  processor-specific code exists to build against yet.
- `planId` is currently documented in-code as "Phase 1: a single
  placeholder V1 plan id; Plan catalogue is out of scope" — POL-19-011
  §1 now attaches a real price (750 MZN/month) and cadence (monthly) to
  that single plan, but the actual `planId` string value remains an
  implementation-planning detail, not fixed by this assessment.

## 2. Minimum-Slice Gap Analysis

### 2a. Trial Completed → Active (payment confirmed)

**Business meaning already governed by:** POL-19-006 (Conversion
Policy, Approved) — "payment enables continuation," continuity of
business identity/history preserved. No new business-rule gap here.

**Technical gap:** no trigger exists. Requires a webhook endpoint
(Architecture §4.12: `/api/billing/webhook`) that, once it verifies a
payment-success event's authenticity, transitions the relevant
`subscriptions/{businessId}` document from `trial_completed` to
`active` and sets `renewalDate`.

**Open boundary question, not resolved here:** the minimum target as
stated only describes payment arriving *after* `trial_completed`. Does
an early payment during `trial_active` (before the trial naturally
ends) also convert immediately to `active`? Governance is silent on
this specific timing. Flagged in Risks (§3) rather than assumed either
way.

### 2b. Active → Reversal → Grace Period

**Business meaning already governed by:** POL-19-010 (Payment Reversal
Policy, Approved this session).

**Technical gap:** no trigger exists. The same webhook endpoint, on a
verified reversal event, must:
- for a business currently `active`: transition to `grace_period`, set
  `gracePeriodEndsAt = event_timestamp + 7 days`.
- for a business already `grace_period`: recalculate
  `gracePeriodEndsAt = event_timestamp + 7 days`, **replacing** the
  prior value (POL-19-010 Edge Case A — fresh window, not additive).
- for a business already `expired`: **no state change.** Per
  POL-19-010 Edge Case B, this is explicitly deferred for V1 — at most
  a log entry, never a state write.

### 2c. Explicitly excluded from this authorization

The following are **not** in scope for whatever implementation this
assessment eventually authorizes, even though they technically sit
inside "Phase 3" or "Phase 5" as named in the implementation plan:

- **Grace Period → Active (renewal-during-grace).** Not part of the
  minimum target as literally stated — the target stops at reaching
  `grace_period`. See Risk 2 below; this is flagged as a likely product
  gap, not silently included.
- Recovery (POL-19-007) mechanics for exiting `expired` — untouched,
  unauthorized here.
- Any Conversion-policy work beyond the single mechanical
  `trial_completed → active` trigger in §2a.
- Full Phase 3 Subscription State Manager completeness "across all six
  states" (the implementation plan's own Phase 3 description) — only
  the one transition in §2b is authorized here.
- Full Phase 5 Commercial Integration: billing-cycle renewal-date
  evaluation across multiple cycles, payment-failure retry logic beyond
  the single reversal event type, refunds, plan upgrade/downgrade, any
  additional payment method beyond what's needed for this single path.
- Phase 4 (SuperAdmin Consumption) and Phase 6 (Notification
  Integration) — entirely out of scope, not dependencies of the minimum
  path.
- Any PaySuite-specific technical mechanics — endpoint URL, signature
  scheme, event/payload names, sandbox credentials, recurring-billing
  configuration. **Must be verified against PaySuite's own
  documentation before implementation of the authenticity-verification
  step specifically** — this assessment does not and cannot resolve
  that step.

## 3. Risks

1. **Authenticity verification is an unresolved hard prerequisite, not
   a fillable TODO.** The webhook handler cannot be safely deployed
   with a stubbed or deferred signature-verification step — an
   unverified webhook lets any caller POST fake payment/reversal events
   and move a business's subscription state. Implementation planning
   should treat PaySuite documentation verification as a blocking gate
   before this endpoint is written, not an item to backfill after.
2. **No path exists from `grace_period` back to `active` within this
   authorization's scope.** A real customer who pays during their
   7-day grace period has no automatic state transition defined by the
   minimum target as stated. A stopgap (SuperAdmin manual override,
   already available per Architecture §9.4/§6.7) may cover this in
   practice, but that is a workaround, not a designed path. Surfacing
   this now rather than letting it surface as a production incident.
3. **Event-type discrimination is entirely PaySuite-payload-dependent
   and unverified.** The webhook needs to tell a payment-success event
   apart from a reversal event; the shape of that discrimination cannot
   be designed before PaySuite's documentation is reviewed.
4. **Ordering/idempotency is explicitly out of POL-19-010's scope**,
   but the transition table in §2a/§2b has different preconditions per
   current status — a duplicate or out-of-order webhook delivery could
   apply the wrong transition if the handler isn't built as a single
   guarded state-transition table (current status + event type → next
   status) rather than independent unguarded writes. This assessment
   surfaces the design requirement; it does not resolve the mechanics.
5. **No emulator/live verification is possible in this sandbox**, for
   this endpoint or any other — standing network-egress limitation
   consistent with every prior phase in this repository's history, not
   a new problem this assessment introduces. Manual verification
   against a real PaySuite sandbox remains owed before production
   deploy.

## 4. Minimum Implementation Plan (once separately authorized — not authorized by this document)

1. Verify PaySuite's technical documentation — endpoint format,
   signature scheme, event names/payload shape for payment-success and
   payment-reversed events, sandbox environment availability. **Hard
   prerequisite; blocks everything below.**
2. Add `POST /api/billing/webhook` (Architecture §4.12), with
   authenticity verification per step 1.
3. Implement exactly this state-transition table, and no other
   transition:
   - `trial_completed` + payment-success → `active` (§2a)
   - `active` + reversal → `grace_period`, `gracePeriodEndsAt` = event
     time + 7 days (§2b)
   - `grace_period` + reversal → `grace_period`, `gracePeriodEndsAt`
     recalculated fresh (§2b, Edge Case A)
   - `expired` + reversal → no state change, log only (§2b, Edge Case B)
4. No `firestore.rules` change is anticipated —
   `subscriptionAllowsNewRecords()` already handles `grace_period`
   correctly (§1); confirm this holds once the webhook path is live as
   a regression check, not a new rule to write.
5. Manual verification against a real PaySuite sandbox integration
   before production deploy — cannot be executed in this sandbox
   (Risk 5).
6. **Explicitly not built in this pass:** grace_period → active
   renewal (Risk 2), any Phase 4/6 work, any notification-template
   wiring beyond whatever Module #20's existing generic background-
   worker infrastructure already triggers automatically on a
   subscription-document write (needs its own check at implementation
   time, not assumed here).

---

## Deliverables Summary

1. **File created:** `docs/engineering/19-v1-payment-path-rule8-assessment.md`
   (this document). No other file modified to produce it.
2. **No implementation has begun.** No `src/`, `server/`,
   `firestore.rules`, or `docs/specs/*` file was touched.
3. **This assessment authorizes nothing by itself.** Per Rule 8, actual
   implementation still requires a separate, explicit Product Architect
   go-ahead — including a fresh affected-files/plan/risks pass at the
   point it's actually assigned, since code may have changed between
   this assessment and that assignment.
4. **Scope discipline, restated:** this document does not assess or
   authorize full Phase 2 (already implemented and closed), full
   Phase 3, full Phase 5, Phase 4, or Phase 6 — only the two specific
   state-transition slices in §2a/§2b, bounded by the minimum V1 target
   stated at the top of this document.
5. **Blockers found:** PaySuite technical-documentation verification
   (hard prerequisite, §3 Risk 1); the grace_period → active gap is a
   product-design question, not a blocker to what's authorized here,
   but is unresolved (§3 Risk 2).

**Lifecycle:** Designed → **Assessed**. Not Implemented, not Executed,
not Authorized.
