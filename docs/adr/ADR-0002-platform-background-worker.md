# ADR-0002 — Platform Background Worker Architecture

**Status:** Approved (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record. Second entry in the formally
numbered ADR series (`docs/adr/`), following [ADR-0001](./ADR-0001-business-provisioning-orchestrator.md)
(Business Provisioning Orchestrator). Distinct from that record: ADR-0001
resolved a single fork inside Module #19 Phase 1's provisioning path;
this ADR establishes a platform-wide strategy for scheduled background
processing that applies across every present and future module, not
one module's implementation detail.
**Basis:** [Module #19 Phase 2 Trial Engine Decisions](../engineering/19-phase2-trial-engine-decisions.md)
(Decision 3 — the existing minimal Trial Lifecycle Worker, and its own
explicit deferral: *"When Phase 3... or #20 (Notifications) need
scheduled evaluation too, extending this into the fuller Architecture
§4.8 design is a separate, future decision — not pre-built now"*);
[Module #20 Engineering Readiness Assessment](../engineering/20-notifications-implementation-readiness.md)
§3, Engineering Decision 1 ("Background Worker ownership — the central
open question"), which named exactly this fork and left it unresolved
pending this ADR; Architecture §4.8 (Background Processing and
Scheduled Work).
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this
document.**

---

## Context

Module #19 Phase 2 already implemented a real, running scheduled
process — `runTrialLifecycleSweep()`, a `setInterval` inside
`server/index.ts`, deliberately scoped as **minimal**: its own decision
record states its "only responsibility is advancing subscriptions based
on elapsed time" and explicitly defers the question of whether future
scheduled needs (Grace Period/Conversion/Recovery in a later #19 phase,
Notification generation in Module #20) extend that same process or
introduce a new one.

Module #20's Engineering Readiness Assessment then hit that exact fork
directly: Closing-overdue detection, Inventory-risk detection, and
Subscription-notification companion writes all need scheduled
evaluation, and the assessment named "Background Worker ownership" as
the single most architecturally significant open decision blocking an
Implementation Plan — explicitly flagging it as a call for the Product
Architect, not something to resolve silently during implementation
planning.

This ADR answers that fork at the platform level, once, rather than
per-module.

---

## Decision

**SABUSH BPT adopts a single Platform Background Worker.**

The worker owns scheduling only. Business logic remains owned by the
originating module. The worker coordinates execution; it does not own
business rules.

Multiple module-specific workers are rejected as the platform's
long-term strategy.

---

## Architectural Principle

**Scheduling is platform infrastructure. Business logic is module
ownership.** These are different concerns and must not be merged into
one responsibility, regardless of how few modules need scheduling
today.

The worker may execute tasks such as:

- Trial lifecycle (Module #19).
- Subscription lifecycle (Module #19, future phases).
- Notification generation (Module #20).
- Future maintenance tasks.
- Future housekeeping.
- Other scheduled platform activities.

These are examples only — an illustrative, non-exhaustive list, not a
fixed catalog this ADR commits the platform to.

---

## Separation of Concerns

**Each module owns:**
- Business rules.
- Eligibility.
- Calculations.
- State transitions.

**The Platform Worker owns:**
- Scheduling.
- Orchestration.
- Execution timing.
- Retry coordination.
- Operational reliability.

A module's job registered with the worker contains that module's own
decision logic (e.g., "is this subscription's trial elapsed," "is this
Business's stock count overdue") — the worker itself never encodes or
evaluates any module's business rule. It calls, times, and retries;
it does not decide.

---

## Benefits

- One scheduling infrastructure, not one per module.
- Consistent monitoring — a single place to observe every scheduled
  job's health, not several.
- Reduced duplication — no module reimplements interval management,
  crash-recovery, or job coordination from scratch.
- Easier maintenance — one execution framework to patch, harden, and
  reason about.
- Predictable scaling — platform-wide scheduled load is visible and
  manageable in one place as tenant count grows, rather than several
  independently-scaled processes with no shared visibility.
- A reusable execution framework every future module can register
  against, rather than each deciding its own scheduling approach.

---

## Relationship to Existing Implementation

Module #19 Phase 2's `runTrialLifecycleSweep()` already exists, is
already running, and already does exactly what this ADR describes at
small scale: one process, one `setInterval`, scheduling only, business
logic (trial elapsed-time evaluation) owned by Module #19's own code
inside it. This ADR does not contradict or replace that implementation
— it recognizes it as the first, minimal instance of the single
Platform Background Worker this ADR now formally establishes as
platform strategy.

**Consequence for Module #20's own open question:** this ADR resolves
Engineering Decision 1 from the Module #20 Engineering Readiness
Assessment in favor of **extend, not introduce** — future scheduled
job types (Closing-overdue, Inventory-risk, Subscription-notification
companion writes) are added to the same shared worker process, not
built as a second, parallel scheduled process. This ADR does not
itself perform that extension — no code is changed by this document —
it establishes which direction implementation should take when that
work is actually assigned.

---

## Relationship to Existing Governance

This ADR:

- does **not** modify any Business Decision Record,
- does **not** modify any Operational Policy,
- does **not** modify the Module #19 or Module #20 specifications or
  the Module #20 Amendment,
- does **not** modify Architecture §4.8 directly — it resolves, at the
  platform-strategy level, the single-worker-vs-multiple-workers
  question that section's "Background Processing" framing left
  implicit,
- does **not** authorize implementation.

Its purpose is solely to settle, once, the scheduling-architecture fork
that both Module #19 Phase 2's own decision record and Module #20's
Engineering Readiness Assessment independently surfaced and deferred —
so that neither Module #20's eventual Implementation Plan nor any
future module needs to re-litigate it.

---

## Consequences

- Module #20's Implementation Plan (when drafted) can proceed on the
  settled assumption that its scheduled job types extend the existing
  worker process, rather than needing its own architectural decision
  first.
- Future modules requiring scheduled processing register against this
  same worker rather than each independently deciding whether to build
  their own.
- The existing worker process's scope will grow over time as more job
  types are added — this is the intended, accepted shape of "one
  shared worker," not scope creep to be resisted.
- Monitoring, alerting, and operational ownership of scheduled work
  consolidates to one place as the platform grows, rather than
  fragmenting per module.

---

## Future Considerations

As more job types are added to the worker, its internal structure
(how job types are registered, how one job type's failure is isolated
from another's, how execution is observed) will likely need its own
engineering design — **this ADR does not authorize or specify that
design**. It establishes that one worker is the destination; how it's
internally organized as it grows is future implementation-planning
work, addressed in a Rule 8 pass at the point that work is actually
assigned.

---

## Scope Exclusions

This ADR does **not** define:

- the worker's implementation,
- scheduling intervals,
- retry logic,
- notification retention or cleanup policies,
- job-registration mechanics,
- failure-isolation design between job types,
- monitoring/alerting implementation,
- authorize implementation of any kind.

These remain implementation-planning and engineering responsibilities,
to be addressed in a Rule 8 pass at the point implementation is
actually assigned — for Module #20, that Rule 8 pass is the
Implementation Plan its own Engineering Readiness Assessment
recommended before proceeding.
