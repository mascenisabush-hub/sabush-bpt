# Module #20 — Implementation Plan Reconciliation Review

**Type:** Governance review only. Identifies conflicts between
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
(drafted against ADR-0002/POL-20-001, before ADR-0003, ADR-0004,
BDR-0005, or BDR-0006 existed) and the governance baseline as it now
stands. Proposes replacement wording for each. **Does not amend the
Implementation Plan. Does not authorize implementation. Does not
perform a Rule 8 Assessment.** Per the agreed sequencing, the plan
itself is only edited after this review is explicitly approved.
**Basis:** fresh review of `docs/engineering/20-notifications-implementation-plan.md`
in full (not an excerpt) against ADR-0002, ADR-0003, ADR-0004,
BDR-0005, BDR-0006, `20-notifications.md` (current, v1.2), and the
repository-evidence findings already recorded in
[`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md).
Current `origin/main`, independently re-fetched immediately before this
review: `eebcf5c`.

**Nothing in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/adr/*` file —
including the Implementation Plan itself — was modified to produce this
document.**

---

## 0. Method

Every place in the Implementation Plan that describes (a) how new
Background Worker job types get added, (b) how a notification's content
gets constructed, or (c) how communication is decided, was checked
against ADR-0003, ADR-0004, and BDR-0005/0006. Six conflict sites were
found, plus two smaller staleness items. Each is listed with: the
plan's current text, which governance document it now conflicts with,
why the conflict exists (the plan predates the governance, not an
error at the time it was written), and proposed replacement wording.

---

## 1. Conflict Sites

### 1.1 Basis section (header, lines 11–20)

**Current text:** cites `20-notifications.md` as "(v1.1, ✅ Accepted)"
and lists only ADR-0002 among architecture decisions.

**Conflicts with:** the spec is now at v1.2 (Category Amendment
Accepted); ADR-0003, ADR-0004, BDR-0005, and BDR-0006 all now exist and
bear directly on this plan's content.

**Why:** this plan was drafted before any of the four post-dated the
spec or existed at all — not an error, just superseded by time.

**Proposed replacement:**

> **Basis:**
> - [`20-notifications.md`](../specs/20-notifications.md) (v1.2, ✅ Accepted)
> - [Module #20 Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md) (✅ Accepted)
> - [Module #20 Specification Category Amendment](../specs/20-notifications-category-amendment.md) (v1.2, ✅ Accepted)
> - [POL-20-001 — Notification Retention Policy](../specs/20-pol-001-notification-retention-policy.md) (✅ Approved)
> - [Module #20 Engineering Readiness Assessment](./20-notifications-implementation-readiness.md) (Rule 8, Assessed)
> - [ADR-0002 — Platform Background Worker Architecture](../adr/ADR-0002-platform-background-worker.md) (✅ Accepted)
> - [ADR-0003 — Background Worker Job Registration](../adr/ADR-0003-background-worker-job-registration.md) (✅ Accepted)
> - [ADR-0004 — Notification Platform Architecture](../adr/ADR-0004-notification-platform-architecture.md) (✅ Accepted)
> - [BDR-0005 — Notification Language Resolution Policy](../specs/20-bdr-0005-notification-language-resolution-policy.md) (✅ Accepted)
> - [BDR-0006 — Notification Communication Policy](../specs/20-bdr-0006-notification-communication-policy.md) (✅ Accepted)
> - Architecture §3.12, §4.4, §4.8, §4.9, §4.12, §6.8, §7.4, §8.13, §9.9, §13.5

---

### 1.2 §4, "Existing Components Likely Requiring Modification" — `server/index.ts` bullet (lines 165–175)

**Current text:**
> "A shared helper (mirroring the existing `newAuditEventRef()` pattern
> Module #19 Phase 2 established) is added... `runTrialLifecycleSweep()`
> (line ~992) — extended with new job types per ADR-0002's 'extend, not
> introduce' resolution, not replaced."

**Conflicts with:** ADR-0003, which requires new job types to be added
through a formal `registerJob({ jobType, schedule, execute,
dedupeKeyFn, retryPolicy })` interface — not informally "extended" as
growing branches inside one function. ADR-0002's "extend, not
introduce" resolved *which process* hosts new jobs (one, not two);
ADR-0003 separately resolved *how* jobs get added to it, and this
bullet only reflects the former.

**Why:** ADR-0003 didn't exist when this plan was written.

**Proposed replacement:**

> - **`server/index.ts`** — no notification-write helper and no
>   job-registration interface exist today. Per ADR-0003, new job types
>   are added through a `registerJob(...)` interface (schedule,
>   execute, dedupe-key function, retry policy) — not as additional
>   hardcoded branches inside `runTrialLifecycleSweep()`. This phase's
>   scope therefore includes building that registration interface for
>   the first time, and migrating `runTrialLifecycleSweep()`'s existing
>   job onto it (a reasonable, low-risk follow-up per ADR-0003's own
>   "Future Considerations," not a requirement) or leaving it as a
>   parallel legacy job until a later phase — this choice is proposed
>   for Product Architect confirmation, not decided by engineering
>   alone. Separately, per ADR-0004, no producer writes a final
>   notification document directly — each job type emits a
>   `BusinessEvent`; a Notification Platform evaluation step (new,
>   §1.4 below) turns that into a notification, applying BDR-0006's
>   communication policy and BDR-0005's language resolution.

---

### 1.3 §5, "New Components" — `Notification`/`NotificationCategory`/`NotificationPriority` types bullet (lines 179–183)

**Current text:**
> "mirrors the schema fixed by 20.1: `scope`, `businessId`/`userId`
> (exactly one set), `category`, `type`, `payloadRef`, `channel`,
> `status`, `dedupeKey`, `createdAt`, `context`
> (`whatHappened`/`whyItMatters`/`recommendedAction`), `priority`."

**Conflicts with:** ADR-0004 Decisions 1 and 7, and BDR-0006 §7–8. The
`context` and `priority` fields, as described here, are populated by
whichever code creates the document — which this plan elsewhere assigns
to the producer (§1.2, §1.4). ADR-0004 requires producers to emit only
a `BusinessEvent`; `context` (rendered from a template, per BDR-0005's
localization policy) and `priority` (per BDR-0006 §9's fixed table for
each Phase 3 producer) are Notification Platform outputs, not producer
inputs.

**Why:** `20-notifications.md` §20.1's own schema (unchanged) still
describes `context`/`priority` as plain fields on the document without
specifying who populates them — this plan reasonably assumed "the
producer" in the absence of ADR-0004/BDR-0006, which didn't exist yet.

**Proposed replacement:**

> - **`Notification`/`NotificationCategory`/`NotificationPriority`
>   types** (`src/types.ts`) — mirrors the schema fixed by 20.1, field
>   for field. Per ADR-0004/BDR-0006, `context` and `priority` are
>   written by the Notification Platform evaluation step, not directly
>   by the originating job/endpoint — no producer constructs these
>   values itself. A separate `BusinessEvent` type (new, not in 20.1,
>   introduced by ADR-0004) is what producers actually emit.

---

### 1.4 §5, "Shared server-side notification-write helper" bullet (lines 190–194)

**Current text:**
> "the single choke point all three creation paths (Background Worker,
> privileged server, payment webhook) call through, so schema shape,
> `dedupeKey` construction, and `context`/`priority` population are
> enforced once, not per call site."

**Conflicts with:** ADR-0004 Decisions 1, 4, 5, 7 and BDR-0006 §3, §7,
§8 — this is the clearest single conflict in the document. A "shared
write helper" that all producers call through, populating `context`/
`priority` themselves before the call, is structurally the
producer-owned-content pattern ADR-0004 exists to replace. ADR-0004
requires two distinct layers: producers emit `BusinessEvent`s; a
separate Notification Platform layer evaluates communication policy
(BDR-0006: Notify/Batch/Suppress + priority) and resolves language
(BDR-0005) before a notification document is ever written.

**Why:** ADR-0004 and BDR-0006 didn't exist when this plan was drafted;
this bullet reflects the same shared-helper shape Phase 2 actually
shipped with, extended forward by analogy — reasonable at the time, no
longer consistent with what's since been Accepted.

**Proposed replacement:**

> - **`BusinessEvent` emission (`server/index.ts` and/or a new shared
>   module)** — the three Phase 3 producers (and, going forward, Phase 2's
>   existing five staff endpoints, pending a separate decision on
>   whether to retrofit them) construct a `BusinessEvent` — a fact,
>   never rendered text — and hand it to the Notification Platform
>   evaluation step.
> - **Notification Platform evaluation step (new)** — the single choke
>   point every `BusinessEvent` passes through. Applies BDR-0006's
>   communication policy (Notify/Batch/Suppress + priority — for
>   Version 1's three Phase 3 producers, this is fixed and deterministic
>   per BDR-0006 §9, not computed dynamically), resolves language per
>   BDR-0005's fallback chain, resolves a template into `context`, and
>   only then writes the `notifications` document (`dedupeKey`
>   construction happens here too, not per producer).

---

### 1.5 §9, Phase 3 section (lines 353–382)

**Current text:**
> "Extend `runTrialLifecycleSweep()`'s process with new job types (not
> a second process) — each job type owns its own dedupe-key shape (Risk
> 1, §10) and its own detection logic... Subscription-notification
> companion write: alongside the existing `platform_audit_log` entry...
> add a second, owner-facing `notifications` document for the same
> transition."

**Conflicts with:** ADR-0003 (job-registration interface, not
"extend... with new job types" as informal branches) and ADR-0004/
BDR-0006 (the "second... notifications document" is written by the
Notification Platform after BusinessEvent evaluation, not directly by
the job/producer itself). This is the section the Phase 3 Rule 8
Assessment's Contradiction 1 and Contradiction 2 were both anchored on.

**Why:** same as §1.2/§1.4 — this section predates all three governance
documents that now bear on it.

**Proposed replacement:**

> **Objective:** Closing-overdue detection, Inventory-risk detection,
> and Subscription-notification companion events, registered as
> independent job types on the shared Background Worker per ADR-0002
> and ADR-0003, each emitting a `BusinessEvent` evaluated by the
> Notification Platform per ADR-0004/BDR-0006.
>
> - Each job type is added via `registerJob(...)` (ADR-0003) — own
>   schedule, own dedupe-key function, own retry policy — not as a
>   branch inside `runTrialLifecycleSweep()`. No existing "overdue" or
>   "discrepancy" detection logic exists anywhere today for any of the
>   three (Closings/#11, Stock Counts/#10 + Breakages/#7,
>   Subscriptions/#19) — this is new detection code for all three, not
>   a wiring exercise.
> - Each detection produces a `BusinessEvent`, not a notification
>   document directly. The Notification Platform evaluation step
>   (§1.4, above) applies BDR-0006 §9's fixed Version 1 policy —
>   Closing → Notify/Immediate, Subscription → Notify/Immediate,
>   Inventory Risk → Notify/High — and resolves language per BDR-0005
>   before any `notifications` document is written.
> - Subscription-notification: alongside the existing
>   `platform_audit_log` entry `runTrialLifecycleSweep()` already
>   writes, a `BusinessEvent` is emitted for the same transition,
>   flowing through the same evaluation step as the other two
>   producers — not a bespoke second write path.

---

### 1.6 §11, Rule 8 Readiness Assessment table — Phase 3 row (line 498)

**Current text:**
> "Ready after Phase 1 | ADR-0002 resolves the sole architectural
> blocker (worker ownership)"

**Conflicts with:** this claim is now false on its face — ADR-0003 and
ADR-0004 introduce two more architectural requirements (job
registration, BusinessEvent/Notification Platform layer) that this row
doesn't account for, because it was written before either existed.

**Why:** same as above — accurate when written, stale now.

**Proposed replacement:**

> | 3 — Background Worker Triggers | No current readiness determination — see [`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md) | ADR-0002/0003/0004 and BDR-0005/0006 collectively govern this phase; the Phase 3 Rule 8 Assessment is the authoritative readiness record, not this table |

---

## 2. Smaller Items (not governance conflicts, but found during this review)

### 2.1 §10, Risk 1 — miscited Business Rule

**Current text:** "Business Rule 8's `dedupeKey` mechanism is
conceptually sound (reuses Architecture §4.8.1) but unproven
per-job-type."

**Finding:** `20-notifications.md` has no "Business Rule 8" — its
Business Rules run through Business Rule 10 (Amendment v1.1), and none
is numbered 8 in a way that concerns `dedupeKey`. This appears to be a
carried-over reference to Module #19's own "Business Rule 8" (audit
guarantee), misapplied here. Separately, and more substantively: the
Phase 3 Rule 8 Assessment found the dedupe-key mechanism doesn't exist
in code **at all**, for any job type, not merely "unproven per-job-type"
for new ones — `writeNotification()` performs no duplicate-check of any
kind.

**Proposed replacement:**

> 1. **Duplicate notifications** (Phase 3). The dedupe-key mechanism
>    described conceptually at Architecture §4.8.1 does not exist in
>    code today, for any job type — confirmed by repository review
>    (see [`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md)
>    §1, §7 Risk 1). This must be designed and built as part of this
>    phase, not assumed proven from Module #19's example, which achieves
>    idempotency by a different mechanism (transaction-based state
>    re-check on the subscription document itself, not a dedupe-key
>    check).

### 2.2 §3 and §8 — informal ADR-0002 references without ADR-0003

Several bullets (§3's "Background Worker (ADR-0002)" item, §5's
"Background Worker job types" item, §8's Module #19 cross-reference row)
describe job types as simply "registered" or "extending" the shared
worker, citing only ADR-0002. None is individually as consequential as
§1.2/§1.5 above, but for consistency, each should have "per ADR-0002
and ADR-0003" added wherever "per ADR-0002" alone currently appears in
a job-registration context. Not written out individually here to avoid
repetition — the same correction as §1.2/§1.5 applies.

---

## 3. What This Review Does Not Do

- Does not edit `20-notifications-implementation-plan.md` itself.
- Does not decide whether Phase 2's five existing staff endpoints
  should be retrofitted onto the BusinessEvent/Notification Platform
  pattern (flagged at §1.4 as "a separate decision") — that's a real
  open question this review surfaces but doesn't resolve.
- Does not touch detection thresholds (Closing overdue, Inventory Risk,
  Trial-ending-soon) — Step 2 of the agreed sequence, not this step.
- Does not perform a Rule 8 Assessment — Step 3.
- Does not authorize any `src/`, `server/`, `firestore.rules`, or
  `firestore.indexes.json` change.

---

## 4. Requested Decision

Product Architect approval requested on the six proposed replacements
in §1 (and the two smaller corrections in §2) before they're applied to
`20-notifications-implementation-plan.md`. Two sub-decisions are
embedded in the proposed wording itself and need an explicit answer
rather than an implicit one:

1. **§1.2:** should `runTrialLifecycleSweep()`'s existing job be
   migrated onto the new `registerJob()` interface in this same phase,
   or left as a parallel legacy job for now? ADR-0003 permits either.
2. **§1.4:** should Phase 2's five already-shipped staff endpoints be
   retrofitted onto the BusinessEvent/Notification Platform pattern, or
   left as-is (a documented, permanent exception predating ADR-0004)?
   Neither ADR-0004 nor BDR-0006 decides this — both are silent on
   Phase 2's existing code.

---

## Deliverables

1. **File created:** `docs/engineering/20-notifications-implementation-plan-reconciliation-review.md`
   (this document). No other file created or modified — the
   Implementation Plan itself is unchanged.
2. **Six governance-conflict sites identified** (§1.1–§1.6), each with
   current text, the specific ADR/BDR it conflicts with, why the
   conflict exists, and proposed replacement wording.
3. **Two smaller, non-governance corrections found** (§2.1–§2.2) during
   the same pass.
4. **Two sub-decisions requiring explicit Product Architect input**
   (§4), not resolvable by engineering alone.
5. **Implementation Plan not yet amended.** Awaiting approval of the
   above before any edit is made to
   `docs/engineering/20-notifications-implementation-plan.md`.
