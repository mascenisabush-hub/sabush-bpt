# ADR-0003 — Background Worker Job Registration Model

**Status:** Accepted (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record. Third entry in the formally
numbered ADR series (`docs/adr/`), following [ADR-0001](./ADR-0001-business-provisioning-orchestrator.md)
(Business Provisioning Orchestrator) and [ADR-0002](./ADR-0002-platform-background-worker.md)
(Platform Background Worker Architecture). Distinct from those: ADR-0002
established **that** SABUSH BPT has a single Platform Background Worker
and **that** the worker owns scheduling while modules own business
logic; it explicitly deferred the registration mechanics as future
work ("how job types are registered, how one job type's failure is
isolated from another's, how execution is observed... this ADR does
not authorize or specify that design"). This ADR answers exactly that
deferred question — nothing else.
**Basis:** [ADR-0002](./ADR-0002-platform-background-worker.md)'s own
"Future Considerations" section (the explicit gap this ADR closes);
Module #20 Phase 3 scoping discussion (Product Architect / Lead
Software Engineer Platform Review), which surfaced the need for a
concrete registration interface before Closing, Inventory, and
Subscription-companion job types can be added to the existing worker
process without each reinventing scheduling, retry, and isolation
independently.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this
document.**

---

## Context

ADR-0002 settled the platform-strategy question: one shared Background
Worker, not one per module. Module #19 Phase 2's `runTrialLifecycleSweep()`
is that worker's first, minimal instance today — a single `setInterval`
with one job type hardcoded inline.

Module #20 Phase 3 needs to add at least three more job types (Closing-
overdue detection, Inventory-risk detection, Subscription-notification
companion writes) to the same worker process. Adding each as another
hardcoded branch inside the same function is how a "single shared
worker" quietly becomes an unmaintainable monolith — exactly the
outcome ADR-0002's separation-of-concerns principle exists to prevent,
just not yet given a concrete mechanism.

This ADR defines that mechanism: a registration interface any module
uses to add a job type to the worker, without the worker needing to
know anything about that module's domain.

---

## Decision

**The Platform Background Worker exposes a job registration interface.
Each module registers its own job(s) against it; the worker remains
domain-ignorant.**

Conceptually:

```
Background Worker
    │
    ├── Registered Job — ClosingIntegrityJob      (Module #11 / amendment)
    ├── Registered Job — InventoryHealthJob        (Module #20 Phase 3)
    ├── Registered Job — SubscriptionLifecycleJob   (Module #19)
    └── Registered Job — <future module's job>
```

The worker owns only:
- **Schedule** — when a registered job's `execute` is invoked.
- **Execution** — invoking it and capturing its result.
- **Retry** — whether/how a failed execution is retried, per that job's
  own declared retry policy (not a single platform-wide policy assumed
  to fit every job type).
- **Watermark** — tracking each job's own `lastRunCompletedAt`, per
  ADR-0002/§4.8.1's existing model, keyed per registered job, not
  globally.
- **Isolation** — one job type's failure (thrown error, timeout) must
  not prevent another registered job's scheduled run from executing.
- **Logging/metrics** — that a job ran, how long it took, whether it
  succeeded — generic, job-agnostic observability, not job-specific
  interpretation of what the numbers mean.

The worker owns **nothing** about what a job actually does. It does not
know what "overdue" means for a Closing, what "at risk" means for
Inventory, or what "elapsed" means for a Subscription trial — that
logic lives entirely inside the registered job's own `execute`
implementation, owned by that job's originating module. This is
ADR-0002's separation of concerns, made concrete.

**Core principle: the Background Worker owns *when* work is evaluated,
never *what* the business decides.** This is stated explicitly because
it is the guard against a specific, predictable failure mode — the
slow accumulation of business rules inside the worker itself. Left
unstated, the natural drift is for each new job type to add "just one
more `if`" directly in the worker's execution path until the worker
quietly becomes a second home for business logic that duplicates or
diverges from the module that actually owns it. This ADR forecloses
that drift by name.

---

## Job Lifecycle (Conceptual)

Every registered job follows the same shape, regardless of domain:

```
register()
    │
    ▼
eligible()      — is there work to evaluate this tick?
    │
    ▼
execute()       — the module's own business logic runs
    │
    ▼
emit BusinessEvent(s)   — handed to the Notification Platform
                          (contract defined in ADR-0004, not here)
    │
    ▼
complete        — watermark advances, per §4.8.1
```

Notice what does **not** appear anywhere in this lifecycle: a
notification. The worker never constructs, evaluates, or persists a
notification — a job's `execute` step, at most, produces one or more
`BusinessEvent`s and hands them off. What happens after that hand-off
is entirely ADR-0004's concern, not this ADR's.

---

## Registration Interface (Conceptual Shape)

```
registerJob({
  jobType,          // stable string identity, e.g. "closing-integrity"
  schedule,         // e.g. hourly — consistent with §4.8's cadence
  execute,          // the module's own business logic; returns a result
  dedupeKeyFn,       // (per §4.8.1) how this job computes its own
                     // deterministic per-unit-of-work key
  retryPolicy,      // optional; defaults to a sane platform default
})
```

This ADR fixes the **shape** of that contract, not its final TypeScript
signature — the exact types, file location, and whether registration
happens at worker-startup or via a manifest are engineering-planning
detail for Module #20 Phase 3's own Implementation Plan / Rule 8
Assessment, not this ADR.

---

## Failure Isolation

A single registered job throwing, timing out, or otherwise failing
must not stop the worker's scheduler from running the next scheduled
tick for *other* registered jobs. Per-job failures are caught, logged,
and retried according to that job's own retry policy; they do not
propagate to crash the worker process or block sibling jobs. This is
the concrete mechanism behind ADR-0002's "worker coordinates execution;
it does not own business rules" — a business-logic failure inside one
module's job is that module's concern, not a platform-wide outage.

---

## Relationship to Existing Implementation

Module #19 Phase 2's `runTrialLifecycleSweep()` remains the worker's
first job. This ADR does not require it be rewritten immediately as
part of adopting this ADR — but any *new* job type (starting with
Module #20 Phase 3's producers) is added through this registration
interface, not as another hardcoded branch alongside it. Migrating the
existing Trial Lifecycle job onto the same interface is a reasonable,
low-risk follow-up, but is Module #19/#20 Phase 3 implementation-planning
work, not something this ADR mandates a deadline for.

---

## Relationship to Existing Governance

This ADR:

- does **not** modify any Business Decision Record,
- does **not** modify any Operational Policy,
- does **not** modify the Module #19 or Module #20 specifications,
- does **not** modify Architecture §4.8 — it implements the mechanism
  §4.8 assumes exists ("performs three job types") without itself
  specifying, and closes the registration-mechanics gap ADR-0002
  explicitly deferred,
- does **not** authorize implementation.

Module #20 Phase 3's Rule 8 Assessment remains a separate, subsequent
governance step, to be written only after this ADR (and ADR-0004) are
accepted.

---

## Consequences

- Closing, Inventory, and Subscription-companion job types (Module #20
  Phase 3) can each be implemented as an independent registered job,
  reviewable and testable in isolation, rather than as edits to a
  shared function.
- Future modules (Analytics rollups, AI scheduled evaluation, SuperAdmin
  housekeeping) register against the same interface rather than each
  deciding independently whether/how to hook into scheduling.
- A failing job type is contained to itself; it cannot silently disable
  unrelated scheduled work (e.g., a bug in Inventory-risk detection
  cannot prevent Closing-overdue reminders from firing).
- The worker process's internal structure grows in a disciplined way —
  new jobs are additions to a registry, not new control flow woven
  through existing code.

---

## Future Considerations

This ADR does not specify: how registration is wired at process
startup (static import list vs. dynamic manifest), whether retry
policy needs to differ meaningfully across job types in practice, or
whether/when per-job metrics need a dashboard beyond logs. These
remain implementation-planning and engineering responsibilities, to be
addressed in Module #20 Phase 3's own Rule 8 Assessment at the point
implementation is actually assigned.

---

## Scope Exclusions

This ADR does **not** define:

- the registration interface's final TypeScript signature,
- specific retry counts, backoff intervals, or timeout values,
- how job execution is monitored/alerted in production,
- the notification content or business logic of any specific job type
  (Closing, Inventory, Subscription — see each module's own spec),
- the BusinessEvent contract or Notification Platform architecture
  (see ADR-0004),
- authorize implementation of any kind.
