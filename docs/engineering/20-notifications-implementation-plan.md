# Module #20 (Notifications) — Implementation Plan

**Type:** Engineering planning document. Translates the approved
governance baseline into a structured, phased implementation roadmap.
**Does not authorize implementation.**
**Lifecycle status:** Designed → Accepted → Readiness Assessed →
**Planned**. Not Implemented, not Executed, not Analyzed. Reaching
"Planned" is not itself authorization to begin Phase 1 — that remains a
separate, explicit Product Architect decision, per Rule 8, requiring
its own Phase 1 Rule 8 Assessment first.
**Basis:**
- [`20-notifications.md`](../specs/20-notifications.md) (v1.2, ✅ Accepted)
- [Module #20 Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md) (✅ Accepted)
- [Module #20 Specification Category Amendment](../specs/20-notifications-category-amendment.md) (v1.2, ✅ Accepted)
- [POL-20-001 — Notification Retention Policy](../specs/20-pol-001-notification-retention-policy.md) (✅ Approved)
- [Module #20 Engineering Readiness Assessment](./20-notifications-implementation-readiness.md) (Rule 8, Assessed)
- [ADR-0002 — Platform Background Worker Architecture](../adr/ADR-0002-platform-background-worker.md) (✅ Accepted)
- [ADR-0003 — Background Worker Job Registration](../adr/ADR-0003-background-worker-job-registration.md) (✅ Accepted)
- [ADR-0004 — Notification Platform Architecture](../adr/ADR-0004-notification-platform-architecture.md) (✅ Accepted)
- [BDR-0005 — Notification Language Resolution Policy](../specs/20-bdr-0005-notification-language-resolution-policy.md) (✅ Accepted)
- [BDR-0006 — Notification Communication Policy](../specs/20-bdr-0006-notification-communication-policy.md) (✅ Accepted)
- Architecture §3.12, §4.4, §4.8, §4.9, §4.12, §6.8, §7.4, §8.13, §9.9, §13.5

**Reconciliation note:** this plan was originally drafted against
ADR-0002 and POL-20-001 only. ADR-0003, ADR-0004, BDR-0005, and
BDR-0006 were Accepted afterward. The sections below were amended
against
[`20-notifications-implementation-plan-reconciliation-review.md`](./20-notifications-implementation-plan-reconciliation-review.md)
(Product Architect-approved) to reflect them — see that document for
the full conflict-by-conflict record of what changed and why.

**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this document.**

---

## 0. Why This Plan Can Be Drafted Now

The Engineering Readiness Assessment classified Module #20 as **"Ready
after decisions"** and named three things to resolve before an
Implementation Plan should be drafted (§6 of that document). All three
are now resolved:

1. **Background Worker ownership (Engineering Decision 1).** Resolved
   by ADR-0002: **extend, not introduce** — Module #20's scheduled job
   types register on the same single Platform Background Worker
   instance that already runs `runTrialLifecycleSweep()` (Module #19),
   not a second, parallel process.
2. **Notification retention (Engineering Decision 4).** Resolved by
   POL-20-001: archival is priority-tiered (Option C), no automatic
   deletion in V1, dismissal marks a notification read (coupled), and
   notification immutability is an approved business rule. Specific
   per-tier day counts remain this plan's own work (§9, below), per
   POL-20-001's explicit deferral.
3. **Confirmation of a phase breakdown.** This plan adopts and expands
   the Readiness Assessment's proposed three-phase shape (§5 there)
   into the six-phase breakdown below, following the same granularity
   Module #19's own Implementation Plan used.

This plan does not reopen any Decision Gate, Business Rule, or Policy
parameter already settled by the documents above — it sequences their
consequences.

---

## 1. Purpose

This plan translates the approved Module #20 specification, its
Amendment, POL-20-001, and ADR-0002 into a sequenced,
engineering-actionable roadmap: what gets built, in what order, against
what existing components, with what risks and open questions made
explicit. It is the bridge between "the business rules and architecture
are settled" and "here is what Rule 8's affected-files/plan/risks
review looks like when a phase is actually assigned." It does not
perform that Rule 8 review itself — each phase still requires its own,
at the point it is authorized, per the "What This Plan Does Not
Authorize" section below.

## 2. Scope

**Included in this plan:** sequencing and dependency structure for the
full Module #20 domain as scoped by `20-notifications.md` v1.1 and its
Amendment — the `notifications` data model, all three creation paths
(Background Worker, privileged server, payment webhook), the four V1
categories, the Delivery Channel Interface, `NotificationContext`, and
the tenant-user-facing presentation layer.

**Excluded from this plan:** anything Decision Gate 4 or the spec's own
"Explicitly Left Open" section excludes — marketing/promotional
categories, staff productivity scoring, AI-generated recommendations
(Module #15 dependency), Email/WhatsApp/SMS delivery (Decision Gate 3),
SuperAdmin aggregate consumption implementation (Module #18, not yet
built — build order remains `#19 → #20 → #18`). Also excluded: exact
notification copy/wording per type (spec's "Explicitly Left Open"),
which is content work, not sequencing work.

**Future work, not this plan:** the spec's "Future Enhancements" items
(Email/WhatsApp channels, possible future Staff visibility grant,
marketing/AI-recommendation categories) remain tracked, not decided,
here.

## 3. Architectural Context

Module #20 sits downstream of Module #19 (observes Subscription state
changes; never recomputes them) and is itself upstream of nothing —
no other module reads from or depends on `notifications`. It is a pure
delivery/observer layer (Business Rule 3): it must never become a
second, looser copy of data Reports, Closings, or the Business Worth
Engine already own.

- **Module #19 (Subscriptions):** category-3 notifications ("trial
  ending," "subscription expired," "entitlement restricted") reference
  Module #19's state transitions. `runTrialLifecycleSweep()` already
  writes a `platform_audit_log` entry on `trial_active →
  trial_completed`; that collection is platform-operator-facing only
  (`allow read: if false` for every client role) and is not a
  substitute for an owner-facing notification. Where Module #20 wants
  an owner to see a Subscription transition, the worker writes **two**
  documents going forward (one `platform_audit_log` entry, already
  built; one `notifications` document, new) — not one document read by
  two audiences.
- **Background Worker (ADR-0002, ADR-0003):** Module #20's scheduled
  job types (Closing-overdue, Inventory-risk, Subscription-notification
  companion writes) extend the same shared worker process
  `runTrialLifecycleSweep()` already runs on, added via ADR-0003's
  `registerJob(...)` interface. This plan does not build a second
  scheduled process. Per the reconciliation review's approved Decision
  1, `runTrialLifecycleSweep()` itself is migrated onto this same
  interface as the first registered job, rather than remaining a
  separate legacy path — see "Legacy Compatibility," §6a below.
- **Inventory (Stock Counts #10, Breakages #7):** no existing
  discrepancy/risk detection logic exists anywhere in the codebase
  today — this is new Background Worker logic, not a wiring exercise
  onto something that already computes it.
- **Security/Staff actions (privileged server):** the most
  implementation-ready integration point. `/api/staff/suspend`,
  `/api/staff/reactivate`, `/api/staff/delete`, `/api/staff/set-tier`
  are real, existing, privileged-server transactions today (all behind
  `requireAuth`, `server/index.ts`). Adding a notification write to
  each is additive to an existing transaction, not new infrastructure.
- **SuperAdmin (Module #18):** Architecture §9.9 names this module's
  data as its aggregate source. Module #18 is not yet built (build
  order `#19 → #20 → #18`) — not a Phase in this plan; a future
  consuming surface, not a dependency of Module #20's own build-out.
- **Future Business Worth Engine:** not an integration point for V1 —
  Decision Gate 4 (unchanged by Amendment v1.1) fixes V1 to four
  categories that exclude Business Worth milestones.

## 4. Existing Components Likely Requiring Modification

Repository-evidence-based, spot-checked against current `main`
(commit `6348c36`) — not assumed:

- **`src/components/Header.tsx`** — a UI stub only today:
  `showNotifications` state, a `notificationsRef` click-outside
  handler, a bell button, and a dropdown that always renders static
  "no notifications" copy (`t('header.noNotifications')`). No
  collection, context, or trigger logic behind it. Phase 4 rewires this
  from the static stub to real `NotificationContext` data — scoped
  narrowly to the dropdown's content, not a redesign of the bell/header
  layout.
- **`src/types.ts`** — no `Notification`, `NotificationCategory`,
  `NotificationPriority`, or `NotificationContext`-adjacent type exists
  today (confirmed: the file's existing domain types — `Subscription`,
  `StaffMember`, `Closing`, etc. — have no notification-shaped
  sibling). A new type addition, mirroring the pattern Module #19
  Phase 1 used for `Subscription`/`SubscriptionStatus`.
- **`firestore.rules`** — no `notifications` match block exists today.
  Every existing tenant-isolation rule in this file
  (`isMemberOf(businessId)`, `isOwnerOf(businessId)`,
  `isOwnerOrGrantedManager(businessId, permission)`) scopes access via
  a **path segment** (`businesses/{businessId}/...`). `notifications`
  is a **top-level** collection per its own data model (20.1) —
  `notifications/{notificationId}`, not nested under a business path —
  so this is the first collection in this repository requiring
  tenant-isolation enforcement via **document-field** matching
  (`resource.data.businessId` / `resource.data.userId`) instead. See
  Risk 3 (§10, below).
- **`firestore.indexes.json`** — no composite index for a
  `notifications` query exists today. New indexes required at minimum:
  `businessId` + `createdAt`, `userId` + `createdAt` (live-feed
  queries), possibly `+ status` for unread-count queries.
- **`server/index.ts`** — no notification-write helper and no
  job-registration interface exist today. Per ADR-0003, new Background
  Worker job types are added through a `registerJob({ jobType,
  schedule, execute, dedupeKeyFn, retryPolicy })` interface — not as
  additional hardcoded branches inside `runTrialLifecycleSweep()`. This
  phase's scope includes building that registration interface for the
  first time. Per the reconciliation review's approved Decision 1,
  `runTrialLifecycleSweep()` (line ~992) is **migrated onto this
  interface as the first registered job**, becoming the reference
  implementation for ADR-0003, rather than continuing to run alongside
  it as a separate legacy path — see "Legacy Compatibility," §6a below.
  Per ADR-0004, no producer writes a final notification document
  directly:
  - The five existing `requireAuth`-protected staff endpoints
    (`/api/staff/suspend`, `/api/staff/reactivate`, `/api/staff/delete`,
    `/api/staff/set-tier`, `/api/staff/reset-pin`) remain exactly as
    shipped in Phase 2 — per the reconciliation review's approved
    Decision 2, these are **not** retrofitted onto the BusinessEvent
    contract (see "Legacy Compatibility," §6a below).
  - New Phase 3 Background Worker job types emit a `BusinessEvent` each,
    evaluated by the Notification Platform step (new — see §5, below)
    rather than writing a notification document themselves.

## 5. New Components (planning concepts only)

- **`Notification` / `NotificationCategory` / `NotificationPriority`
  types** (`src/types.ts`) — mirrors the schema fixed by 20.1, field for
  field: `scope`, `businessId`/`userId` (exactly one set), `category`,
  `type`, `payloadRef`, `channel`, `status`, `dedupeKey`, `createdAt`,
  `context` (`whatHappened`/`whyItMatters`/`recommendedAction`),
  `priority`. Per ADR-0004/BDR-0006, `context` and `priority` are
  written by the Notification Platform evaluation step (§5, below), not
  directly by the originating job or endpoint — for Phase 3's three
  producers specifically, `priority` is fixed and deterministic per
  BDR-0006 §9 (Closing/Subscription → Immediate, Inventory Risk →
  High), not computed per event. A separate `BusinessEvent` type (new,
  not part of 20.1, introduced by ADR-0004) is what Phase 3 producers
  actually emit.
- **`NotificationContext`** (`src/context/NotificationContext.tsx`,
  new) — Architecture §8.13's frontend counterpart: a live Firestore
  listener scoped to the current user's own feed (Business-scoped
  notifications for their active Business, plus their own User-scoped
  ones). Read-only — no client-direct write path except the narrowly-
  scoped read/dismiss action described in §7, below.
- **`BusinessEvent` emission** (`server/index.ts` and/or a new shared
  module) — per ADR-0004, Phase 3's three Background Worker producers
  construct a `BusinessEvent` (a fact, never rendered text) and hand it
  to the Notification Platform evaluation step below. Per the
  reconciliation review's approved Decision 2, Phase 2's five existing
  staff endpoints are **not** changed to emit `BusinessEvent`s — see
  "Legacy Compatibility," §6a below.
- **Notification Platform evaluation step** (`server/index.ts`, new) —
  the single choke point every Phase 3 `BusinessEvent` passes through.
  Applies BDR-0006's communication policy (Notify/Batch/Suppress +
  priority — fixed and deterministic for all three Phase 3 producers
  per BDR-0006 §9, not computed dynamically in V1), resolves language
  per BDR-0005's User → Business → Portuguese fallback chain, resolves
  a template into `context`, and only then writes the `notifications`
  document — `dedupeKey` construction happens here, once, not per
  producer.
- **Delivery Channel Interface** (20.4) — a lightweight TypeScript
  interface (e.g., `interface DeliveryChannel { send(notification):
  Promise<void> }`) with exactly one implementation in V1
  (`InAppChannel`, backed by the Firestore write itself). Concrete
  shape is this plan's own contribution — the *requirement* that it
  exist was already fixed by Decision Gate 3; only its shape was open
  per the Readiness Assessment (§3, item 3).
- **Background Worker job types** — Closing-overdue detection,
  Inventory-risk detection, Subscription-notification companion writes
  — each registered into the existing worker process via the ADR-0003
  `registerJob(...)` interface, per ADR-0002's "extend, not introduce"
  resolution (one process, not a new one).

## 6. What This Plan Does Not Authorize

Per your explicit instruction and consistent with every governance
document referenced above:

- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`,
  or test file is created or modified by this plan.
- No specification, BDR, ADR, or Policy is modified, reopened, or
  reinterpreted.
- No Decision Gate, Business Rule, or POL-20-001 parameter is changed.
- Reaching "Planned" status does not authorize Phase 1. A separate,
  explicit **Phase 1 Rule 8 Assessment** — its own affected-files/plan/
  risks review, performed at the point Phase 1 is actually assigned —
  is required first, per Rule 8 and consistent with how Module #19's
  own plan (§14–15 there) required the same before its Phase 1 began.

---

## 6a. Legacy Compatibility

ADR-0003 and ADR-0004 are architectural improvements, not retrospective
corrections. Existing completed implementations remain valid unless
explicitly identified for migration. This plan distinguishes three
categories, per the Product Architect's explicit decisions recorded in
[`20-notifications-implementation-plan-reconciliation-review.md`](./20-notifications-implementation-plan-reconciliation-review.md)
§4:

- **Existing implementation selected as reference migration:**
  `runTrialLifecycleSweep()` (Module #19's Trial Lifecycle Worker). It
  is migrated onto the ADR-0003 `registerJob(...)` interface as part of
  Phase 3, becoming the first registered job and the reference
  implementation for every job type after it — not left as a permanent
  legacy exception alongside newly registered ones. Chosen because it
  is already isolated, already has deterministic scheduling, already
  uses watermark/dedupe concepts, and is the only scheduled worker that
  exists today.
- **Existing implementation retained as a supported legacy pattern:**
  Phase 2's five `/api/staff/*` notification-producing endpoints. They
  remain a supported direct-producer implementation because they
  originate from synchronous, request/response, privileged-server
  operations — not scheduled BusinessEvent evaluation — which is the
  problem ADR-0004 was written to solve. Retrofitting them onto the
  BusinessEvent contract would add churn to already-closed Phase 2 work
  for no corresponding business value. Future privileged-server
  features may adopt the BusinessEvent contract where it genuinely
  fits, but existing Phase 2 Staff Notifications are not required to
  migrate.
- **New Phase 3 implementation requirements:** the three new Background
  Worker producers (Closing-overdue, Inventory-risk, Subscription-
  notification companion) are built against ADR-0003/ADR-0004/
  BDR-0005/BDR-0006 from the start — they have no legacy precedent to
  reconcile against.

This section exists so a future contributor reading ADR-0003/ADR-0004
does not assume every older implementation in this codebase is
"wrong" — only the two categories above that were explicitly evaluated
and placed into one bucket or the other.

---

## 7. Open Engineering-Planning Decisions (this plan's own contribution)

These were named by the Readiness Assessment (§3) as ordinary
engineering-planning detail, not Product Architect-level calls. This
plan resolves them at the planning level; a Phase 1 Rule 8 Assessment
should confirm them against the repository state at that time before
building.

1. **Read/unread write mechanism.** Proposed: a narrowly-scoped
   client-direct `update`, restricted by `firestore.rules` to only the
   `status` field, only on a document the caller already owns
   (`resource.data.businessId`/`userId` matches caller). Rationale:
   this is the one low-stakes, high-frequency action in the whole
   domain (a user opening their feed); routing it through a server
   endpoint for every read/dismiss would add latency and server load
   with no corresponding safety benefit, unlike the three creation
   paths, which do require server-side enforcement (Decision Gate 2).
2. **Dismiss mechanism.** Per POL-20-001, dismiss is coupled to marking
   read (Active → Archived, and `status` → `read`, in one client
   write) — implemented as the same restricted client-direct `update`
   as above, setting both an `archived`-equivalent marker and `status`
   in one call, not two separate writes.
3. **Archived representation.** Proposed: **derived at query-time**
   from `priority` + `createdAt` age + `status`, not a separate stored
   field — avoids a second write path and keeps the schema (20.1)
   unmodified. `NotificationContext`'s live-feed query simply excludes
   documents outside their priority tier's active window. A dedicated
   "history" view (if ever built) would query without that filter.
   This is a proposal for Phase 1 Rule 8 Assessment to confirm, not a
   decision this plan is authorized to finalize alone if it touches
   schema.
4. **Delivery Channel Interface shape.** A TypeScript interface, not a
   naming convention alone (§5, above) — chosen because it gives Phase
   5's future Email/WhatsApp channels a concrete contract to implement
   against, matching Decision Gate 3's stated intent that future
   channel addition be additive, not a redesign.
5. **Notification immutability enforcement mechanism.** POL-20-001
   decided the business rule (append-only); this plan proposes
   enforcing it via `firestore.rules` (`allow update: if false` on the
   `notifications` collection, no field-level exception once created)
   rather than application-level convention alone — the strongest
   guarantee, consistent with how this repository already treats
   `platform_audit_log`'s own immutability.

None of these five touch a Decision Gate, Business Rule, or POL
parameter — they are the kind of call the Readiness Assessment itself
said belonged at implementation-plan time, not Product Architect
review. Flagged here for visibility, not silently assumed.

---

## 8. Cross-Module Integration Summary

| Module | Relationship |
|---|---|
| **#19 — Subscriptions** | Source of category-3 event truth. #20 observes state transitions only; does not recompute or duplicate them. Shares one Background Worker instance (ADR-0002) as registered job types on the same `registerJob(...)` interface (ADR-0003) — including the migrated Trial Lifecycle job itself — not two workers. |
| **#16 — Staff & Roles** | Staff-action notifications (suspend/reactivate/delete/set-tier/reset-pin) are User-scoped, created via the privileged-server path, additive to existing endpoints. |
| **#17 — Multi-Shop / Owner Portfolio** | Notifications remain isolated per originating Business — no cross-Business aggregation for an Owner with multiple Businesses (Business Rule 2), mirroring #17's own "no aggregation across Businesses" boundary. |
| **#18 — SuperAdmin** | Future consumer of aggregate delivery-health data (§9.9) once #18 is built. Not a dependency of #20's own implementation; the `platform_operators/{uid}` recipient-binding question (Readiness Assessment §2) is deferred to #18's own work, not resolved here. |
| **Future Business Worth Engine, Future Inventory Health, Future AI recommendations** | Not integration points for V1 (Decision Gate 4 unchanged). Each would require its own Decision Gate reopening before becoming a notification-producing event source. |

Each module owns its own business events; Module #20 owns communication
delivery only, per Business Rule 3/4.

---

## 9. Proposed Phased Implementation

Expands the Readiness Assessment's three-phase proposal (§5 there) to
six phases, following Module #19's own plan granularity.

### Phase 1 — Foundations

**Objective:** stand up the domain's structural skeleton — schema,
rules, indexes, read-only context, write helper — with no producer
wired in yet. A structurally real but empty system, the same shape
Module #19 Phase 1 took before any Trial Engine logic existed.

| Item | Objective | Affected files | Engineering boundary | Deliverable |
|---|---|---|---|---|
| Notification types | Define `Notification`/`NotificationCategory`/`NotificationPriority` shapes per 20.1 | `src/types.ts` (additive) | No existing type modified | Compiling type definitions, unused until Phase 2 |
| Firestore data model | Establish `notifications/{notificationId}` shape in code/docs, not yet written to by any path | none (conceptual until Phase 2 writes) | Matches 20.1 exactly; no field added or removed | Documented shape referenced by rules/indexes below |
| Collection structure | Confirm top-level (not business-nested) placement | `firestore.rules`, `firestore.indexes.json` | Structural decision only — no data written yet | Rules/index scaffolding ready for Phase 2 writes |
| Firestore rules | Tenant-isolation-safe read rule via `resource.data.businessId`/`userId` matching (Risk 3, §10) | `firestore.rules` (new match block) | No existing match block modified; new document-field-based helper functions added alongside, not replacing, path-based ones | A rule that structurally rejects any unscoped or wrongly-scoped query, verified by emulator test |
| Composite indexes | `businessId`+`createdAt`, `userId`+`createdAt` (minimum) | `firestore.indexes.json` | Additive only | Indexes deployed to a test/emulator environment first |
| `NotificationContext` | Read-only live listener, current user's own feed | `src/context/NotificationContext.tsx` (new) | No write path beyond the restricted read/dismiss update (§7, item 1) | Context provider, not yet consumed by `Header.tsx` |
| Shared write helper | Single server-side choke point for all future creation paths | `server/index.ts` (new function, unused until Phase 2) | Not called by any endpoint yet | Function exists, unit-testable in isolation |

**Prerequisites:** none — this phase depends only on already-Accepted/
Approved governance (spec v1.1, Amendment, POL-20-001, ADR-0002), all
satisfied.

**Explicitly out of scope for Phase 1:** any producer (no staff-action
write, no Background Worker job, no webhook write), `Header.tsx`
rewiring (stays a static stub), any real notification document ever
created.

**Readiness classification: Ready** — pending its own Phase 1 Rule 8
Assessment (this plan's final requirement, §11 below), not blocked by
any open Product/Business decision.

---

### Phase 2 — Privileged-Server Creation Path

**Objective:** wire the lowest-risk, already-concrete integration
point — User-scoped notifications from existing staff-action endpoints.

- Extend the five `requireAuth`-protected `/api/staff/*` endpoints to
  call the Phase 1 write helper in the same transaction, producing
  User-scoped notifications (role/permission change, suspension/
  reactivation/deletion confirmation).
- No Background Worker dependency; no new detection logic — each event
  is already server-verified and synchronous.

**Prerequisites:** Phase 1 complete (types, rules, write helper must
exist).

**Explicitly out of scope:** Business-scoped categories (Closing,
Inventory, Subscription) — none of those originate from the privileged
server in V1 per 20.5's Path assignment.

**Readiness classification: Ready after Phase 1** — architecturally
resolved (Decision Gate 2 explicitly names this as a legitimate,
independent creation path); no open Product decision blocks it.

---

### Phase 3 — Background Worker Scheduled Triggers

**Objective:** Closing-overdue detection, Inventory-risk detection, and
Subscription-notification companion events, each registered as an
independent job type on the shared Background Worker per ADR-0002 and
ADR-0003, each emitting a `BusinessEvent` evaluated by the Notification
Platform step per ADR-0004/BDR-0006.

- Each job type is added via `registerJob(...)` (ADR-0003) — own
  schedule, own dedupe-key function, own retry policy — not as a branch
  inside `runTrialLifecycleSweep()`. Per the reconciliation review's
  approved Decision 1, `runTrialLifecycleSweep()` itself is migrated
  onto this same interface as part of this phase, becoming the
  reference implementation, not a fourth job type alongside three new
  ones running on a separate legacy path.
- No existing "overdue" or "discrepancy" detection logic exists
  anywhere today for any of the three (Closings/#11, Stock Counts/#10 +
  Breakages/#7, Subscriptions/#19's own state) — this is new detection
  code for all three, not a wiring exercise.
- Each detection produces a `BusinessEvent`, not a notification
  document directly. The Notification Platform evaluation step (§5,
  above) applies BDR-0006 §9's fixed Version 1 policy — Closing →
  Notify/Immediate, Subscription → Notify/Immediate, Inventory Risk →
  Notify/High — and resolves language per BDR-0005 before any
  `notifications` document is written.
- Subscription-notification: alongside the existing `platform_audit_log`
  entry `runTrialLifecycleSweep()` already writes, a `BusinessEvent` is
  emitted for the same transition, flowing through the same evaluation
  step as the other two producers — not a bespoke second write path.

**Prerequisites:** Phase 1 complete. ADR-0002 resolves worker
ownership; ADR-0003 resolves how job types are registered; ADR-0004/
BDR-0005/BDR-0006 resolve the BusinessEvent-to-notification path for
all three producers.

**Explicitly out of scope:** any detection threshold/grace-period
tuning beyond what's needed to ship (exact day-counts remain
implementation detail per the spec's "Explicitly Left Open," still an
open Product decision as of this amendment — see
[`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md)).

**Readiness classification: no current readiness determination** — see
[`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md) for
the authoritative record; this row is not it (§11, below). The
architectural questions this phase depended on are now resolved
(ADR-0002/0003/0004, BDR-0005/0006); the dedupe/watermark mechanism
(Risk 1, §10) still needs to be designed and built — including for the
migrated Trial Lifecycle job, which has never used a dedupe-key
mechanism itself and is not a proven example of one — and the three
detection thresholds still need an explicit Product decision or
deferral.

---

### Phase 4 — Tenant User Experience

**Objective:** replace `Header.tsx`'s static stub with real
`NotificationContext` data; build the presentation layer.

- Rewire the existing bell dropdown to render live notifications
  (context-first content per 20.6, priority-tiered grouping per 20.7).
- Read/dismiss workflow using the restricted client-direct `update`
  (§7, items 1–2).
- Archive visibility per POL-20-001's Option C windows (derived,
  §7 item 3) — an owner sees what's currently Active, not an unbounded
  history, consistent with the Owner Confidence Principle.
- Scoped narrowly: replacing the dropdown's content, not redesigning
  the bell/header layout (per the spec's own explicit non-scope note).

**Prerequisites:** Phase 1 (context must exist) and at least one of
Phase 2/3 (something must be producing real notifications to display
and test against).

**Explicitly out of scope:** any layout/navigation redesign of
`Header.tsx` beyond the notification dropdown itself; a standalone
"Notification Center" page (not named in the spec's V1 scope).

**Readiness classification: Ready after Phases 1–3** — no open
Product decision; depends only on upstream phases existing.

---

### Phase 5 — Payment Webhook Creation Path

**Objective:** wire the third and final creation path (Decision Gate
2, Path 3) — payment/subscription-provider-originated events.

- Add notification writes to the payment webhook handler (Architecture
  §4.12) for payment result and subscription state changes originating
  from the provider side, not from `runTrialLifecycleSweep()`'s own
  time-based evaluation.

**Prerequisites:** Phase 1 complete. This phase is also gated by
Module #19's own Commercial Integration phase (its Phase 5, per
`19-subscriptions-implementation-plan.md` §13) — no live payment
webhook handler exists in this repository until vendor selection,
pricing, and plan catalogue are decided there. This is a genuine
cross-module blocker, not this plan's to resolve.

**Explicitly out of scope:** any payment-processor vendor selection or
integration detail — that remains Module #19's own scope.

**Readiness classification: Not ready** — blocked on Module #19's own
Commercial Integration phase, which is itself blocked on vendor/pricing
decisions outside either module's control.

---

### Phase 6 — Future Delivery Channels

**Objective:** documented for completeness only, per Decision Gate 3.
Email, WhatsApp, SMS, and other providers, implemented against the
Delivery Channel Interface (§5) established in Phase 1.

**Prerequisites:** Phases 1–5 (a working in-app system to extend).

**Explicitly out of scope for V1 entirely** — this phase is not
authorized by any current governance document and would require its
own Decision Gate reopening before any work, including planning
work beyond this placeholder, begins.

**Readiness classification: Not ready — out of V1 scope entirely.**

---

## 10. Risks (carried forward from the Readiness Assessment, with phase mapping)

1. **Duplicate notifications** (Phase 3). The dedupe-key mechanism
   described conceptually at Architecture §4.8.1 does not exist in
   code today, for any job type — confirmed by repository review (see
   [`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md)
   §1, §7 Risk 1). This must be designed and built as part of this
   phase, not assumed proven from Module #19's example, which achieves
   idempotency by a different mechanism entirely (transaction-based
   state re-check on the subscription document itself, not a
   dedupe-key check). Mitigation: design the dedupe/watermark mechanism
   (one of Architecture §4.8.1's two candidate shapes) before any
   producer code is written, and verify it per registered job type,
   including the migrated Trial Lifecycle job.
2. **Event ordering** (Phase 4). Low risk — display order by
   `createdAt` handles simultaneous events adequately. Mitigation:
   a one-line sort-order decision during Phase 4, not a structural
   risk requiring design work.
3. **Multi-tenant isolation — the most significant risk** (Phase 1).
   `notifications` is this repository's first top-level (not
   business-nested) collection requiring tenant isolation via
   document-field matching rather than path-segment matching. Every
   existing rule in `firestore.rules` relies on the path itself scoping
   the query; this collection can't. Mitigation: dedicated rules design
   work in Phase 1 (§9 above) verified by emulator test before any
   client code queries this collection — this is the single most
   important thing Phase 1's Rule 8 Assessment must scrutinize.
4. **Performance** (Phase 1/4). A live listener at platform target
   scale (100k+ tenants) must always query with a proper `where`
   filter, never the full collection. Directly tied to Risk 3 — the
   same rules/index design resolves both.
5. **Offline behavior** (Phase 4). Not addressed anywhere in the spec.
   Likely resolved by Firestore's native listener catch-up behavior
   requiring no special handling — not yet verified against this
   specific access pattern. Mitigation: verify during Phase 4 manual
   testing, not assumed.
6. **Cross-module blocker propagation** (Phase 5). Phase 5's readiness
   is entirely inherited from Module #19's own unresolved Commercial
   Integration blocker — not a risk this plan can mitigate directly,
   only track.

---

## 11. Rule 8 Readiness Assessment (per phase)

| Phase | Classification | Basis |
|---|---|---|
| 1 — Foundations | **Ready** (pending its own Phase 1 Rule 8 Assessment) | All governance inputs (spec, Amendment, POL-20-001, ADR-0002) resolved; no open Product decision blocks it |
| 2 — Privileged-Server Path | Ready after Phase 1 | Decision Gate 2 already legitimizes this path; endpoints already exist |
| 3 — Background Worker Triggers | No current readiness determination — see [`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md) | ADR-0002/0003/0004 and BDR-0005/0006 collectively govern this phase; the Phase 3 Rule 8 Assessment is the authoritative readiness record, not this table |
| 4 — Tenant UX | Ready after Phases 1–3 | No open Product decision; purely sequential dependency |
| 5 — Payment Webhook Path | **Not ready** | Blocked on Module #19's own Commercial Integration phase (vendor/pricing) |
| 6 — Future Delivery Channels | **Not ready — out of V1 scope** | No governance authorizes work beyond the Delivery Channel Interface itself |

No phase is authorized to begin by this document. Per Rule 8, **Phase
1 specifically requires its own separate, explicit Rule 8 Assessment**
— a fresh affected-files/plan/risks pass performed at the point Phase
1 is actually assigned, since repository state may have changed between
this plan and that assignment (the same discipline Module #19's plan
required before its own Phase 1 began).

## 12. Scope Exclusions (explicit, per your instruction)

This Implementation Plan does not:
- authorize implementation of any kind,
- modify `20-notifications.md`, its Amendment, POL-20-001, or ADR-0002,
- introduce new Business Rules or reopen any Decision Gate,
- change the notification lifecycle POL-20-001 already fixed,
- change Business Worth philosophy,
- define runtime behavior,
- define scheduling intervals,
- define exact notification retention periods (per-tier day counts remain open, per POL-20-001's own deferral),
- define infrastructure deployment.

## 13. Completion Summary

Module #20 is ready to move into a **Phase 1 Rule 8 Assessment** now
that this Implementation Plan exists and both Engineering Decisions
the Readiness Assessment flagged as blocking (Background Worker
ownership, retention) are resolved by ADR-0002 and POL-20-001,
respectively. No additional governance gap was discovered during this
planning pass beyond the five ordinary engineering-planning decisions
already flagged in §7 (read/unread mechanism, dismiss mechanism,
Archived representation, Delivery Channel Interface shape, immutability
enforcement mechanism) — none of which rise to a Product Architect-
level decision, consistent with how the Readiness Assessment itself
characterized that category of open item.

---

## Deliverables

1. **File created:** `docs/engineering/20-notifications-implementation-plan.md`
   (this document). No other file modified.
2. **Location rationale:** matches existing repository convention —
   module-prefixed (`20-`), living alongside
   `20-notifications-implementation-readiness.md` in
   `docs/engineering/`, using the `-implementation-plan` suffix already
   established by `19-subscriptions-implementation-plan.md` and
   `phase0-owner-admin-migration-implementation-plan.md`.
3. **No implementation authorization changed.** This plan does not
   authorize Phase 1 or any other phase. It sequences already-Accepted/
   Approved governance; it does not grant new permission to write code.
4. **No runtime files modified.** `src/`, `server/`, `firestore.rules`,
   `firestore.indexes.json`, and all test files remain untouched.
5. **The next legitimate engineering artifact is a Phase 1 Rule 8
   Assessment** — `docs/engineering/20-phase1-foundations-rule8-assessment.md`
   — performed at the point Phase 1 is actually assigned, with its own
   fresh affected-files/plan/risks review against the repository state
   at that time.
6. **Waiting for Product Architect review before any further
   repository changes are made.**
