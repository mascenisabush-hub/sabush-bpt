# Module #20 (Notifications) — Engineering Readiness Assessment (Rule 8)

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Proposed Phasing → Readiness Classification, per `CLAUDE.md`'s
Rule 8 process. Planning only. **Does not authorize implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented,
Executed, or Analyzed beyond this document — no engineering work is
authorized by reaching this state, same as Module #19's own Rule 8
Assessments.
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) v1.1
(Accepted, all four Decision Gates + Amendment v1.1's Business Rules
9–10 and UX Principles), the [Specification Enhancement
Amendment](../specs/20-notifications-enhancement-amendment.md),
Architecture §3.12 (domain definition, Worth-First scope test), §4.4
(privileged server), §4.8 (Background Processing), §4.9 (Notifications
Architecture), §4.12 (Payments/Subscriptions webhook), §6.8 (Permission
Matrix), §7.4 (data model), §8.13 (`NotificationContext`), §9.9
(SuperAdmin platform-side Notifications), §13.5 (build-order); current
`src/`, `server/`, `firestore.rules` state as of commit `db25c9e`.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this
document.**

The objective here is the same one Module #19's readiness work used:
answer whether Module #20 is ready for implementation, not begin it.

---

## 1. Affected Files

### Existing notification-related code (verified against the actual repository, not assumed)

- **`src/components/Header.tsx`** — a UI stub only: `showNotifications`
  state, a `notificationsRef` click-outside handler, a bell button, and
  a dropdown that always renders static "no notifications" copy
  (`t('header.noNotifications')`). Not backed by any collection,
  context, or trigger logic. This is the only pre-existing notification
  code anywhere in the repository — confirmed by search; there is no
  `notifications` collection, no `NotificationContext`, and no
  `firestore.rules` entry for notifications today.

### New files/additions this module will eventually need

- **`src/types.ts`** — new `Notification`, `NotificationCategory`,
  `NotificationPriority`, `NotificationContext` (data shape, 20.1)
  types, mirroring the pattern Module #19 Phase 1 used for
  `Subscription`/`SubscriptionStatus`.
- **`src/context/NotificationContext.tsx`** (new) — Architecture
  §8.13's frontend counterpart: a live Firestore listener scoped to the
  current user's own feed (their Business-scoped notifications plus
  their own User-scoped ones). Does not exist in any form today.
- **`src/components/Header.tsx`** — eventual rewire from the static
  stub to real `NotificationContext` data. Scoped narrowly: replacing
  the dropdown's content, not redesigning the bell/header layout.
- **`firestore.rules`** — a new `match /notifications/{notificationId}`
  block. Structurally different from every other business-scoped
  collection in this file: `notifications` is a **top-level**
  collection (per 20.1's own path, `notifications/{notificationId}`,
  not nested under `businesses/{businessId}/...`), so the existing
  `isMemberOf(businessId)`/`isOwnerOf(businessId)` helpers (which take
  a path-segment `businessId`) need a variant that instead reads
  `resource.data.businessId`/`resource.data.userId` off the document
  itself. See Risk 3, below — this is the single largest structural
  difference from every collection this repo's `firestore.rules` has
  handled so far.
- **`firestore.indexes.json`** — new composite indexes for the live
  feed queries (at minimum: `businessId` + `createdAt`, `userId` +
  `createdAt`; possibly `+ status` for unread-count queries). Same
  category of manual-deploy step as Module #19 Phase 2's own index.
- **`server/index.ts`** — a shared notification-write helper (mirroring
  `newAuditEventRef()`'s pattern from Module #19 Phase 2), called from:
  - The existing staff endpoints (`/api/staff/suspend`,
    `/api/staff/reactivate`, `/api/staff/delete`, `/api/staff/set-tier`)
    — each already a privileged-server transaction (Architecture §4.4,
    20.5 Path 2) that could write a User-scoped notification in the
    same transaction with no new endpoint needed.
  - The existing `runTrialLifecycleSweep()` (Module #19 Phase 2) — see
    Integration Points, below, for why this is the central open
    question, not a settled affected-file.
  - New Background Worker job types for Closing-overdue and
    Inventory-risk detection, which do not exist in any form today
    (confirmed: no "overdue" logic anywhere in `src/` or `server/`).

---

## 2. Integration Points

- **Module #19 (Subscriptions).** The cleanest and most concrete
  integration point that already exists in code:
  `runTrialLifecycleSweep()` already transitions
  `trial_active → trial_completed` and writes a `platform_audit_log`
  entry in the same transaction. A Subscription-category owner-facing
  notification (20.3, category 3) is a **separate concern from that
  audit entry** — `platform_audit_log` (Module #19 Phase 2, Decision 4)
  is deliberately platform-operator-facing only (`allow read: if false`
  for every client role); it is not a substitute for an owner-facing
  notification, and building #20 does not mean touching or reusing that
  collection. If Module #20 wants "trial completed" to reach the
  owner, the worker would need to write **two** documents per
  transition going forward — one `platform_audit_log` entry (already
  built, #19's) and one `notifications` document (#20's, new) — not one
  document read by two audiences.
- **Inventory (Stock Counts #10, Breakages #7).** No existing
  "discrepancy" or "risk" detection logic anywhere in the codebase —
  this is entirely new Background Worker logic, not a wiring exercise
  onto something that already computes it.
- **Security (staff actions).** The most implementation-ready
  integration point: `/api/staff/suspend`/`reactivate`/`delete`/
  `set-tier` are real, existing, privileged-server transactions today.
  Adding a notification write to each is additive to an existing
  transaction, not new infrastructure.
- **Future Business Worth engine.** Not an integration point for V1 —
  Decision Gate 4 (unchanged, per the recent amendment) fixes V1 to
  four categories that do not include Business Worth milestones. Any
  future integration here requires its own Decision Gate reopening,
  not assumed by this assessment.
- **SuperAdmin (Module #18).** Architecture §9.9 states platform-level
  alerting is delivered through "the same `notifications` collection...
  recipient is a `platform_operators/{uid}` rather than a tenant `uid`,
  but the mechanism is not duplicated." This is a genuine, newly-
  surfaced ambiguity, not previously flagged anywhere: Decision Gate 1's
  hybrid model (`businessId`/`userId`) does not explicitly say whether
  a platform operator's uid can populate the `userId` field. Mechanically
  it likely can — a `userId`-scope rule keyed on
  `request.auth.uid == resource.data.userId` doesn't require a
  `users/{uid}` document to exist, and `platform_operators/{uid}` is a
  separate collection from `users/{uid}` (confirmed, §9.9/§7.4) — but
  this hasn't been written down anywhere as a decision. Low urgency:
  Module #18 isn't built (build order is `#19 → #20 → #18`), so this
  doesn't block #20's own implementation, but it should be resolved
  before or during #18's work, not assumed silently then.

---

## 3. Engineering Decisions (open, not resolved by this assessment)

1. **Background Worker ownership — the central open question.**
   Module #19 Phase 2's own decision record explicitly deferred this:
   *"When Phase 3 (Grace Period...) or #20 (Notifications) need
   scheduled evaluation too, extending this into the fuller Architecture
   §4.8 design is a separate, future decision — not pre-built now."*
   That decision is now squarely due. Two options, not decided here:
   - **Extend** the existing `runTrialLifecycleSweep`'s `setInterval`
     process with additional job types (Closing-overdue scan,
     Inventory-risk scan, Subscription-notification companion writes) —
     reuses the one existing scheduled process, but grows what was
     explicitly built "minimal" and "nothing else lives here yet."
   - **Introduce** a second, separate scheduled process for #20's own
     job types — keeps #19's worker untouched, but is the first step
     toward the "general-purpose scheduled processing" both #19 Phase 2
     and this assessment have so far deliberately avoided building.
   This is a genuine architectural decision, not implementation-planning
   detail — it determines whether Module #20 grows shared
   infrastructure or duplicates it, exactly the kind of call this
   repository's governance has consistently routed through the Product
   Architect rather than assumed.
2. **Read/unread model.** `status: 'unread' | 'read'` exists in the
   schema (20.1), but *how* a client marks a notification read is
   undecided: a narrowly-scoped client-direct `update` (restricted by
   `firestore.rules` to only the `status` field, only on a document the
   caller already owns), or a server endpoint. Client-direct is simpler
   and lower-latency for something this low-stakes; a server endpoint
   would match the pattern every other write in this module uses (no
   client write path at all, per Decision Gate 2's three server-side
   creation paths). This is genuine engineering-planning work, not a
   Product Architect-level call — resolvable at implementation-plan
   time.
3. **Delivery Channel Interface (20.4).** Structurally required by
   Decision Gate 3, but no concrete shape (a TypeScript interface? a
   naming convention on the shared write helper?) exists yet. Purely
   conceptual today — needs a concrete design at implementation-plan
   time, not a Product Architect decision (the *requirement* that it
   exist is already settled; only its shape is open).
4. **Notification cleanup/retention.** Not addressed anywhere in
   `20-notifications.md`, its Amendment, or its own "Explicitly Left
   Open" section — this is a **newly-surfaced gap** from this Rule 8
   pass, not a previously-tracked open item. Unlike #2/#3 above, this
   touches a product question (how long should a read notification
   remain visible/queryable before it's pruned?) as much as an
   engineering one, and is closer in kind to Module #19's POL-level
   decisions (e.g., POL-19-002's fixed 30-day trial duration) than to
   pure implementation detail. Recommend Product Architect input before
   this is finalized, not an engineering default assumed silently.
5. **`notifications` collection query-safety design.** Directly related
   to Risk 3, below — the concrete rules/index design that makes an
   unscoped client query structurally impossible (not just
   discouraged), needed before any client code is written against this
   collection.

---

## 4. Risks

1. **Duplicate notifications.** Mitigated conceptually — Business Rule
   8 (Module #19 pattern, reused per 20.1's `dedupeKey` field and
   Architecture §4.8.1) — but not implemented anywhere yet. Real risk
   surface: once a second Background Worker job type exists (Decision
   1, above), each job type needs its own dedupe-key shape; getting one
   right doesn't guarantee the others are, this needs verifying
   per-job-type, not assumed from Module #19's single working example.
2. **Event ordering.** Low risk in practice — display order by
   `createdAt` handles simultaneous events adequately — but not
   explicitly addressed anywhere in the spec. Worth a one-line decision
   at implementation-plan time, not a structural risk.
3. **Multi-tenant isolation — the most significant risk.** `20.1`'s own
   Non-functional Requirements already name this exact concern ("no
   unscoped `notifications` collection query is ever exposed
   client-side"), but as a top-level (not business-nested) collection,
   this is the first time this repository's `firestore.rules` has had
   to enforce tenant isolation via document-field matching
   (`resource.data.businessId`) rather than path-segment matching
   (`businesses/{businessId}/...`). Every existing tenant-isolation
   rule in this file relies on the path itself scoping the query; this
   collection can't. Getting the rule and the required composite
   indexes right together — such that an unscoped or wrongly-scoped
   query is rejected outright rather than silently filtered — needs
   careful, dedicated design work before any client code queries this
   collection, not a routine extension of the existing pattern.
4. **Performance.** A live listener (`NotificationContext`, Architecture
   §8.13) on a top-level collection at the platform's target scale
   (100k+ tenants) needs the client to always query with a proper
   `where` filter — never open the full collection. Tied directly to
   Risk 3; the same design work resolves both.
5. **Offline behavior.** Not addressed anywhere in the spec or its
   amendment. A live-listener client's behavior on reconnect (does a
   missed window of notifications simply arrive via Firestore's own
   listener catch-up, or does anything need an explicit
   "since-last-seen" query?) is a genuinely open, newly-surfaced
   question — likely resolved by Firestore's native listener behavior
   requiring no special handling, but not yet verified against this
   specific access pattern.

---

## 5. Proposed Implementation Phases (proposal only — not a decision)

Mirrors Module #19's own phasing discipline: start with the narrowest,
clearest-mapped slice, defer the highest-uncertainty work.

- **Phase 1 — Foundations.** `notifications` collection schema,
  `firestore.rules` (tenant-isolation-safe per Risk 3), composite
  indexes, `NotificationContext` (read-only live listener), and the
  shared server-side write helper. No producer wired in yet — a
  structurally real but empty system, the same shape Module #19 Phase 1
  took before any Trial Engine logic existed.
- **Phase 2 — Privileged-server creation path.** Wire the lowest-risk,
  already-concrete integration point: staff-action notifications
  (suspend/reactivate/delete/set-tier), each additive to an existing
  transaction. No Background Worker dependency, no new detection logic.
- **Phase 3 — Background Worker scheduled triggers.** Closing-overdue
  detection, Inventory-risk detection, and Subscription-notification
  companion writes alongside Module #19's worker. Cannot begin until
  Engineering Decision 1 (Background Worker ownership) is resolved —
  this phase's own shape depends directly on that answer.

**Deferred beyond these three, consistent with the spec's own scope:**
Email/WhatsApp channels, cleanup/retention (pending Engineering
Decision 4), SuperAdmin aggregate consumption (pending Module #18).

---

## 6. Readiness Classification

**Ready after decisions.** Not "Ready" — five open engineering items
(§3) remain, at least two of which (Background Worker ownership,
retention) are architectural/product-facing enough to warrant Product
Architect attention rather than being silently resolved during
implementation planning. Not "Not ready" either — the specification
and its amendment are otherwise solid, every other open item is
ordinary implementation-planning detail, and Phase 1/Phase 2 above
could begin with no further Product Architect input beyond confirming
this phasing.

**Recommended before an Implementation Plan is drafted:**
1. A decision on Background Worker ownership (Engineering Decision 1).
2. A decision (or explicit deferral) on notification retention
   (Engineering Decision 4).
3. Confirmation of the proposed three-phase breakdown, or a different
   one.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  `firestore.rules`, or change any `src/`, `server/`,
  `docs/specs/*`, or `docs/architecture/*` file. None were touched to
  produce it.
- This record does not modify any BDR, POL, ADR, the Module #20
  specification, or its Amendment.
- This record does not decide Background Worker ownership, the
  read/unread mechanism, the Delivery Channel Interface's concrete
  shape, notification retention, or the `platform_operators` recipient
  question — each is presented for further decision, not resolved
  here.

**Lifecycle:** Designed → **Assessed**. Not Implemented, Executed, or
Analyzed — no engineering work is authorized by this record.
