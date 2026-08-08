# Module #19 (Subscriptions) — V1 Subscription Lifecycle Engine
Implementation Authorization

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation may begin.
Follows the pattern established by Module #20's Phase 1/2/3
Authorization records.
**Status:** ✅ Authorized. Engineering may begin implementation strictly
within the scope defined by §2/§3.
**Basis:** [BDR-0001](../specs/19-subscription-philosophy.md),
[BDR-0002](../specs/19-value-realization-framework.md),
[BDR-0003](../specs/19-trial-experience-framework.md) (all ✅ Accepted);
[POL-19-001](../specs/19-pol-001-trial-activation-policy.md) through
[POL-19-007](../specs/19-pol-007-subscription-recovery-policy.md) (all
✅ Approved); [POL-19-010](../specs/19-pol-010-payment-reversal-policy.md)
(Core Transition, Historical Data Preservation, Scope Exclusions);
[POL-19-013](../specs/19-pol-013-payment-reversal-grace-period-reset-amendment.md)
(Edge Cases A/B, superseding POL-19-010's originals);
[POL-19-011](../specs/19-pol-011-v1-commercial-plan-processor-cancellation-decision.md)
(V1 Commercial Plan, PaySuite selection, Voluntary Cancellation
deferral); [`19-v1-payment-path-rule8-assessment-v2.md`](./19-v1-payment-path-rule8-assessment-v2.md)
(Assessed); Architecture §4.12 (Payments and Subscriptions
Integration), §9.4/§6.7 (SuperAdmin override); current `src/types.ts`,
`firestore.rules`, `server/index.ts` state, re-verified fresh at
drafting time.
**Repository state at drafting:** `main` HEAD `b21b316` at drafting
time.

**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*` file to produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

| Stage | Document | Status |
|---|---|---|
| Business Decision | BDR-0001, BDR-0002, BDR-0003 | ✅ Accepted |
| Policy — Trial/State/Grace/Conversion/Recovery | POL-19-001 through POL-19-007 | ✅ Approved |
| Policy — Payment Reversal | POL-19-010 + POL-19-013 amendment | ✅ Approved |
| Policy — Commercial Plan/Processor/Cancellation | POL-19-011 | ✅ Approved |
| Rule 8 | `19-v1-payment-path-rule8-assessment-v2.md` | ✅ Assessed |
| **Authorization** | **This document** | ✅ Authorized |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

**Scope note — this Authorization is wider than Rule 8 v2's own
originally-assessed minimum slice, on explicit Product Architect
direction, and every widening below is traced to already-Approved
policy text, not invented:**

Rule 8 v2 scoped only `trial_completed → active` and
`active → grace_period` (via reversal), explicitly excluding
`grace_period → active` as "no path exists... within this
authorization's scope" (v2 §3 Risk 2). On review this session, that
transition — and the `expired → active` transition — are **already
fully governed**, not open questions:

- **POL-19-004, "Transition" section:** *"Successful renewal returns
  the business to Active Subscription."* — `grace_period → active`.
- **POL-19-006, "State Transitions" section:** explicitly approves
  three transitions into Active Subscription: *Trial Completed →
  Active Subscription*, **Grace Period → Active Subscription**,
  **Subscription Expired → Active Subscription**.
- **POL-19-007** defines the business meaning of the third of those —
  recovery specifically from `expired`.

This Authorization therefore covers the **complete** V1 subscription
lifecycle state machine — all five states, all seven governed
transitions — not only the reversal-triggered subset. This is a scope
correction (a Rule 8 finding returning to the Product Architect,
exactly as the Governance Standard's own discipline requires), not a
unilateral engineering expansion.

## 2. What Is Authorized

**A processor-independent Subscription Lifecycle Engine** — pure
business logic, deliberately decoupled from any specific payment
processor's webhook shape, event names, or signature scheme:

```
             (any processor's webhook, eventually)
                         │
                         │ normalized event
                         ▼
              Payment Adapter  ◄── NOT authorized by this document
                         │
                         ▼
         Subscription Lifecycle Engine  ◄── authorized here
                         │
        ┌────────┬───────┼────────┬─────────┐
        ▼        ▼       ▼        ▼         ▼
  trial_completed → ACTIVE → GRACE PERIOD → EXPIRED → (recovery) → ACTIVE
```

**The Engine must never import, reference, or depend on anything
PaySuite-specific.** It accepts only an internal, normalized event
shape (`{ type: 'payment_success' | 'payment_reversal', occurredAt }`)
— never a raw processor payload. This boundary is the load-bearing
design requirement of this Authorization, not an implementation
preference: it is what allows the processor to be verified, or even
changed, later without touching this code.

**Seven transitions, each traced to its own governing policy:**

| From | Event | To | Governed by |
|---|---|---|---|
| `trial_completed` | `payment_success` | `active` | POL-19-006 |
| `active` | `payment_reversal` | `grace_period` (+7 days, POL-19-004) | POL-19-010 Core Transition |
| `grace_period` | `payment_reversal` (repeat) | *(no change)* | POL-19-013 |
| `grace_period` | `payment_success` | `active` | POL-19-004 Transition, POL-19-006 |
| `grace_period` | *(7 days elapse, no event)* | `expired` | POL-19-004 Transition, POL-19-005 |
| `expired` | `payment_reversal` | *(no change, log only)* | POL-19-010/013 Edge Case B |
| `expired` | `payment_success` (recovery) | `active` | POL-19-007 |

**Idempotency and ordering:** achieved by re-reading current status
inside a Firestore transaction immediately before every write —
exactly the pattern `runTrialLifecycleSweep()` already establishes in
this codebase (`server/index.ts`) — not by external event-ID
deduplication (PaySuite's own event-ID scheme remains unverified; that
becomes the Payment Adapter's problem, not the Engine's).

**The time-based `grace_period → expired` transition** requires a
scheduled sweep, mirroring `runTrialLifecycleSweep()`'s exact shape:
query `status == 'grace_period' AND gracePeriodEndsAt <= now`,
transaction-guarded re-check, transition, audit log entry — registered
via the existing `backgroundWorker.registerJob()` abstraction (already
present in this codebase from Module #20's work), reusing
`TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS` or an equivalent interval, not
inventing a new scheduling mechanism.

**Audit logging:** every automatic transition writes one
`platform_audit_log` entry in the same transaction as the state
change, per this codebase's own existing Decision 4 pattern
(`newAuditEventRef()`), not a new audit mechanism.

**Explicitly out of scope for this transition (deferred, not silently
answered):** whether an early `payment_success` event during
`trial_active` (before natural trial completion) also converts to
`active` — Rule 8 v2's own flagged open boundary question, still
unresolved by any approved policy. The Engine must not silently handle
this case; a `trial_active` subscription receiving any lifecycle event
is a no-op, matching governance's own silence, not an assumed answer
either way.

**Expected files:** a new, processor-independent server module (e.g.
`server/subscriptionEngine.ts`) containing the pure transition function
and the scheduled sweep; wiring into `server/index.ts` to register the
new sweep job only (no new HTTP route); a corresponding test file.

## 3. What Is Not Authorized

- **Any PaySuite-specific code of any kind** — the `/api/billing/webhook`
  HTTP route, signature verification, event-payload parsing, or any
  translation from PaySuite's raw response shape into the Engine's
  normalized event type. Blocked pending vendor capability
  verification (recurring billing support, reversal webhook event
  existence, signature scheme, sandbox availability) — none of which
  is confirmed as of this Authorization, per this session's own
  research findings.
- **Wiring the Engine to any live, externally-reachable endpoint.** The
  Engine exists as tested, callable server-side infrastructure only —
  not reachable from the internet until a verified Payment Adapter is
  built and explicitly, separately authorized.
- **The `trial_active` early-payment boundary question** (§2, above) —
  remains open, returns to Product Architecture if it needs resolving,
  not resolved by engineering judgment here.
- **Any `firestore.rules` change.** Confirmed unnecessary this session:
  `subscriptionAllowsNewRecords()` already gates exactly
  `trial_completed` and `expired`, matching POL-19-003's Read-Only
  Preservation and `19-subscriptions.md` Business Rule 6 precisely;
  `grace_period` is already unrestricted, matching POL-19-004's "full
  operational capability." No rule needs to change for this Engine to
  work correctly the moment it starts writing real status transitions.
- **Any change to Phase 1/2's already-closed, already-shipped scope** —
  the five existing `/api/staff/*` endpoints, `activate-trial`,
  `provisioning/business`, and `runTrialLifecycleSweep()`'s own
  `trial_active → trial_completed` logic. Untouched, not retrofitted
  onto this Engine.
- **Full Phase 5 Commercial Integration beyond this state machine** —
  billing-cycle evaluation across multiple renewal periods, payment
  retry logic, refunds beyond the single reversal event type, plan
  upgrade/downgrade, any payment method beyond what this path needs.
- **Phase 4 (SuperAdmin Consumption) and Phase 6 (Notification
  Integration)** — not dependencies of this Engine, not authorized
  here.
- **Re-deciding any Business Rule, Decision Gate, BDR, POL, or ADR
  already fixed.** Engineering builds against these as given;
  discovering a genuine need to change one returns to Product
  Architecture, it is not resolved in code.

---

## 4. Scope Discipline

If implementation reveals the approved scope is insufficient,
ambiguous, or requires a business-facing tradeoff not already settled
by the policies named in §1 — **that finding returns to Product
Architecture, not engineering judgment**, per the Governance
Standard's Principle 1. This applies in particular to:

- Any detected need for the Engine to know about a specific payment
  processor, for any reason — a signal the Engine/Adapter boundary is
  being violated, to be corrected, not accepted.
- Any discovered gap in the seven-transition table above — returns to
  Product Architecture as a policy question, not filled in by
  engineering.
- Any temptation to build even a stub PaySuite webhook route "for
  later wiring" — explicitly not authorized; an unverified, reachable
  webhook endpoint is a real security exposure per Rule 8 v2's own
  Risk 1, not a convenience to defer safely.

---

## 5. Signature

**Status:** ✅ Authorized.

> Having reviewed: BDR-0001/0002/0003; POL-19-001 through POL-19-007;
> POL-19-010; POL-19-013; POL-19-011; the V1 Payment Path Rule 8
> Assessment v2; and this Implementation Authorization —
>
> I confirm that the governance required for the V1 Subscription
> Lifecycle Engine has been completed. I authorize engineering to begin
> implementation only within the scope defined by this Authorization
> document.
>
> This authorization specifically permits implementation of: the
> processor-independent Subscription Lifecycle Engine covering all
> seven governed state transitions in §2, the scheduled grace-period-
> expiry sweep, transaction-guarded idempotent writes, and audit
> logging — plus comprehensive tests of the same.
>
> This authorization does not permit: any PaySuite-specific code, any
> live/externally-reachable payment webhook endpoint, resolution of the
> `trial_active` early-payment open question, any `firestore.rules`
> change, or any scope beyond that explicitly described in this
> document.
>
> If implementation reveals a genuine governance contradiction,
> engineering shall immediately stop work on the affected area and
> return the matter for Product Architecture review rather than
> introducing new business behavior.

**Product Architect:** Sabushimike Masceni Dieudonne
**Date:** 2026-08-08
