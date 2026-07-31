Business Domain Specification

# Notifications

Version 1.0
**Status:** Designed — draft complete, awaiting Product Architect
Acceptance
**Module #20 of 20 — Phase 4: Platform**
**Architecture references:** [Section 3.12](../architecture/03-domain-architecture.md)
(Notifications domain definition — channel-agnostic delivery, never a
source of truth, Worth-First scope test), [Section 4.8](../architecture/04-system-architecture.md)
(Background Processing and Scheduled Work — the shared worker this
module's trigger logic runs on, idempotency/dedupe-key mechanism),
[Section 4.9](../architecture/04-system-architecture.md) (Notifications
Architecture — `notifications` collection, trigger sources, delivery
fan-out), [Section 6.8](../architecture/06-user-architecture.md)
(Permission Matrix — the "Manager: view only" pattern this module's
visibility rule extends), [Section 7.4](../architecture/07-data-architecture.md)
(data model — left recipient binding open as `uid` or `businessId`),
[Section 8.13](../architecture/08-module-architecture.md) (`NotificationContext`
— frontend counterpart, scoped to the current user's live feed),
[Section 9.9](../architecture/09-superadmin-architecture.md) (SuperAdmin
platform-side Notifications — reads this module's data in aggregate
only, never per-notification content), [Section 13.5](../architecture/13-development-strategy.md)
(Development Strategy Phase 1 — build order, in-app-first channel
sequencing)
**Depends on:** [Module #19 (Subscriptions)](./19-subscriptions.md) —
category 3 notification types (trial ending, subscription expired,
entitlement restricted) reference Subscription domain events; this
module does not duplicate or recompute that state, only observes it ·
[Owner Portfolio (spec #17)](./17-owner-portfolio.md) — Business-scoped
notification visibility must respect existing tenant-isolation and
Manager-permission rules, unmodified by this module · the Background
Worker (Architecture §4.8) — a shared platform dependency this module
does not own (see Decision Record, Decision Gate 2, below)
**Implementation:** None yet, with one caveat. `src/components/Header.tsx`
has a bell-icon UI stub (`showNotifications`, `notificationsRef`,
static "no notifications" copy) — UI scaffolding only, not backed by any
collection, context, or trigger logic. No `notifications` collection, no
`NotificationContext`, no delivery abstraction, and no `firestore.rules`
entries exist today. This spec does not require touching `Header.tsx`
or creating `NotificationContext` — both are explicitly out of scope for
this drafting stage (see "What This BDS Does Not Do," below).

---

## Purpose

**Why does this module exist?**

Sabush BPT's core value — understanding and protecting Business Worth —
depends on owners acting on time-sensitive events even when they aren't
looking at the app: a Closing going overdue, a stock discrepancy needing
attention, a subscription trial about to lapse. Today, nothing surfaces
these events outside of an owner manually opening the app and noticing.
Module #20 is where that delivery mechanism is defined for the first
time in the codebase.

This module is deliberately a **pure delivery/observer layer**. It never
computes, stores, or is a source of truth for any financial fact — it
only references events already produced by other domains (Architecture
§3.12, §4.9). This boundary is as load-bearing here as the Worth-First
separation is for Module #19: Notifications must never become a second,
looser copy of data that Reports, Closings, or the Business Worth Engine
already own authoritatively.

## Business Problem

Without this module:

- Overdue Closings, inventory risk events, and subscription lifecycle
  changes (Module #19) have no delivery path outside the app being
  open — the exact gap Architecture §4.8 names directly.
- `Header.tsx`'s notification bell is a UI stub with nothing behind it,
  permanently showing "no notifications" regardless of real events.
- SuperAdmin's platform-side Notifications screen (Architecture §9.9)
  has no real `notifications` collection to aggregate over.
- The Background Worker (Architecture §4.8) has no notification-trigger
  job type to run, even once it exists for Module #19's purposes.

## Users

- **Admin** (Business owner) — receives Business-scoped notifications
  for their own Business(es); receives User-scoped notifications
  addressed to them personally.
- **Manager** (staff tier, Architecture §6.3/§6.8) — receives
  Business-scoped notifications for their Business, view-only, mirroring
  the existing "Own Subscription — view (only)" pattern already
  established for this tier in the Permission Matrix (§6.8). Does not
  receive another user's User-scoped notifications.
- **Staff** — no Business-scoped notification visibility in V1, unless a
  future rule explicitly grants it (mirrors the existing pattern where
  Staff has no Subscription visibility either). May still receive their
  own User-scoped notifications (e.g., a role-change confirmation
  affecting them personally).
- **SuperAdmin / Developer** (Architecture §9.9) — read platform-level
  aggregate delivery health (counts, delivery-failure rates) via
  `platform_aggregates`, never per-notification content for an
  individual tenant. This module supplies the collection §9.9 already
  specified as its aggregate data source; it does not redesign that
  screen's permissions.
- **Background Worker** (Architecture §4.8) — the system actor that
  scans for triggerable events and writes `notifications/{id}`
  documents; not a human user, but a contract this spec must define.

## User Stories

1. As an Admin, I receive a Business-scoped notification when my
   Business's Closing is overdue — visible to me and to any Manager on
   that Business, never leaking to a different Business's Admin.
2. As an Admin, I receive a Business-scoped notification when a stock
   count discrepancy or quebra needs attention.
3. As an Admin, I receive a Business-scoped notification when my
   Business's subscription (Module #19) changes state — trial ending,
   expired, or an entitlement becoming restricted.
4. As a user, I receive a User-scoped notification for events that
   belong to me personally — an account security event, a role change
   affecting my own access, a confirmation of an action I just took —
   visible only to me, never to anyone else on my Business.
5. As a Manager, I can see the same Business-scoped notifications my
   Business's Admin sees (view-only), consistent with how I already see
   Subscription state today.
6. As a Staff member, I do not see Business-scoped notifications unless
   a future rule grants it, but I do see any notification addressed to
   me personally.
7. As any authorized user, I never learn that a *different* Business has
   an overdue Closing or any other event, merely by the existence or
   absence of a notification — the domain must never become an
   information side-channel across tenant boundaries.
8. As the Background Worker, I scan for triggerable events on a
   schedule and write exactly one notification per real-world event —
   no duplicates on a crash-and-restart, per the existing dedupe-key
   mechanism (Architecture §4.8.1) this module reuses rather than
   reinvents.
9. As a Developer/SuperAdmin, I can see aggregate delivery health
   (volume, failure rate) for the platform's notifications, without
   ever reading an individual tenant's notification content.

## Business Rules

1. **Hybrid recipient binding — Business-scoped and User-scoped are
   both first-class, not one universal owner.** See Decision Record,
   Decision Gate 1, below, for the full resolution and reasoning.
2. **Tenant boundary is absolute.** A notification is visible only
   through the same authorized-access rules every other Business-scoped
   collection already uses (Architecture §12; `isOwnerOf`/
   `isOwnerOrGrantedManager` pattern, `firestore.rules`). No user may
   discover, directly or by inference, that a Business other than their
   own has any notification, event, or state — existence of a
   notification is itself tenant-scoped information.
3. **No accounting drift.** This module never calculates Business
   Worth, modifies Closing data, modifies Inventory, or replaces
   Reports. It only communicates events already produced by domains
   that own that data authoritatively (Business Worth Engine, spec #2;
   Closings, spec #11; Stock Counts, spec #10; Breakages, spec #7;
   Subscriptions, spec #19). A notification payload references the
   triggering record; it never duplicates the financial fact itself
   (Architecture §4.9, Principle 2.4).
4. **Background Worker is a shared platform dependency, not owned by
   this module.** Neither Module #19 nor Module #20 owns the worker's
   scheduling infrastructure. Each domain owns only its own trigger
   logic (which events to scan for, what payload to write); platform
   engineering owns the worker process itself. See Decision Record,
   Decision Gate 2.
5. **V1 channel scope is in-app only.** Email, WhatsApp, SMS, and any
   external messaging provider are deferred, not built, in V1 — but the
   domain is built behind a Delivery Channel Interface from the start,
   so adding a channel later is additive, not a redesign. See Decision
   Record, Decision Gate 3.
6. **V1 notification types are fixed to four categories:** Business
   Closing Notifications, Inventory Risk Notifications, Subscription
   Notifications (Module #19 dependency), and Platform Announcements.
   No other category — marketing, promotional, sales reminders, staff
   productivity scoring, or AI-generated recommendations (Module #15
   dependency) — is in scope for V1. See Decision Record, Decision
   Gate 4.
7. **Manager visibility mirrors existing Subscription-visibility
   pattern.** Manager sees Business-scoped notifications view-only,
   consistent with Architecture §6.8's existing "Own Subscription —
   view (only)" row; Staff sees none unless a future rule grants it.
   This is a direct extension of an already-approved pattern, not a new
   permission model invented for this module.
8. **Idempotent delivery.** Every notification the Background Worker
   would create is identified by a deterministic dedupe key
   (Architecture §4.8.1's existing mechanism) — a crash-and-restart must
   never produce a duplicate notification for the same real-world
   event.

## Functional Requirements

### 20.1 Data Model

```
notifications/{notificationId}
{
  scope: 'business' | 'user',
  businessId: string | null,   // required and non-null when scope='business'; null when scope='user'
  userId: string | null,       // required and non-null when scope='user'; null when scope='business'
  category: 'closing' | 'inventory_risk' | 'subscription' | 'platform_announcement',
  type: string,                 // specific event key within the category, e.g. 'closing_overdue'
  payloadRef: {
    collection: string,         // the source-of-truth collection this notification references
    documentId: string
  },
  channel: 'in_app',            // V1: always 'in_app'; the field exists so future channels are additive
  status: 'unread' | 'read',
  dedupeKey: string,            // deterministic, e.g. `{businessId|userId}:{type}:{period-or-eventId}`
  createdAt: timestamp
}
```

- Exactly one of `businessId`/`userId` is set, matching `scope` — never
  both, never neither (Business Rule 1/Decision Gate 1).
- `payloadRef` never duplicates the triggering record's financial data
  — it is a pointer only (Business Rule 3).
- `dedupeKey` is unique per real-world event; the Background Worker
  checks for its existence before writing a new document (Architecture
  §4.8.1's existing mechanism, reused here rather than reinvented).
- No `channel` value other than `'in_app'` is populated in V1 — the
  field exists now so Functional Requirement 20.4's channel interface
  doesn't require a schema migration later.

### 20.2 Recipient Scope Rules (Decision Gate 1 applied)

**Business-scoped** (`scope: 'business'`, `businessId` set):
- Closing overdue/approaching/requires-attention.
- Stock count discrepancy, quebra/loss requiring attention, significant
  inventory issue.
- Business-level subscription state changes (trial ending, expired,
  entitlement restricted) — sourced from Module #19.
- Visible to: the Business's Admin; a Manager on that Business, subject
  to the same "view only" boundary already established for Subscription
  visibility (Architecture §6.8); never Staff, unless a future,
  separately-decided rule grants it.

**User-scoped** (`scope: 'user'`, `userId` set):
- Account security events.
- Staff role/permission changes affecting that specific user.
- Personal action confirmations.
- Visible to: only that user — never surfaced to anyone else on the
  same Business, including the Admin, unless the event itself is also
  independently Business-scoped (in which case it is two separate
  notification documents, not one document read by two roles under
  different rules).

### 20.3 V1 Notification Categories (Decision Gate 4 applied)

1. **Business Closing Notifications** — closing approaching, overdue,
   requires attention. Sourced from Monthly Closings (spec #11).
2. **Inventory Risk Notifications** — stock count discrepancy, quebra/
   loss requiring attention, significant inventory issue. Sourced from
   Stock Counts (spec #10) and Breakages (spec #7).
3. **Subscription Notifications** — trial ending, subscription expired,
   entitlement restricted. Sourced from Module #19; this module observes
   Module #19's state transitions, it does not evaluate them itself.
4. **Platform Announcements** — Sabush BPT system notices, maintenance
   communication. Controlled separately from Business-scoped
   notifications (these are typically broadcast, not per-Business
   triggered) — exact broadcast mechanism is a Functional Requirement
   for implementation planning, not fixed by this BDS.

**Explicitly not V1:** marketing notifications, promotional campaigns,
sales reminders, staff productivity scoring, AI-generated recommendations
(Module #15 dependency), WhatsApp delivery, email delivery.

### 20.4 Delivery Channel Interface (Decision Gate 3 applied)

```
Notification Event
        |
   Delivery Channel Interface
        |
        +── In-App (V1 — implemented)
        +── Email (future — interface only, not built)
        +── WhatsApp (future — interface only, not built)
```

- V1 implements exactly one channel: in-app (a live Firestore listener,
  consistent with `NotificationContext`'s existing design intent in
  Architecture §8.13).
- The interface is defined now specifically so that adding Email or
  WhatsApp later is an additive new implementation of the same
  interface, not a redesign of the notification domain itself
  (Architecture §4.9's own reasoning, restated here as a hard V1
  constraint rather than a future aspiration).

### 20.5 Background Worker Trigger Contract (Decision Gate 2 applied)

- This module owns: which events to scan for (per category, 20.3), and
  the payload/dedupe-key shape for each (20.1).
- This module does not own: the worker's scheduling process, interval
  configuration, or crash-recovery mechanism — those belong to the
  shared Background Worker (Architecture §4.8), the same instance
  Module #19's subscription-lifecycle checks run on.
- Both modules' BDS documents state this explicitly so implementation
  never treats either module as the owner of worker infrastructure —
  neither #19 nor #20 should end up with its own competing scheduler.

## Non-functional Requirements

- **Tenant isolation.** Read access to a `notifications/{id}` document
  follows the same `isOwnerOf`/`isOwnerOrGrantedManager` pattern already
  proven in `firestore.rules` for other Business-scoped collections —
  no new access-control primitive invented for this module. A
  User-scoped document is readable only by the matching `userId`.
- **No side-channel leakage.** Query patterns must never allow a user to
  infer another Business's notification existence or count (e.g., no
  unscoped `notifications` collection query is ever exposed client-side;
  every read is filtered server-side or by Security Rule to the caller's
  own `businessId`/`uid`).
- **Idempotency.** Enforced via the dedupe-key mechanism (20.1, reusing
  Architecture §4.8.1) — no new distributed-lock or queue system
  introduced (Principle 2.6, already established for Module #19's
  identical need).
- **No financial computation.** Structurally enforced by the data model
  (20.1) containing only a `payloadRef` pointer, never a duplicated
  financial value.

## KPIs

- Zero notifications observed with both `businessId` and `userId` null,
  or both set, at any time (Business Rule 1/20.1 schema constraint).
- Zero cross-Business notification visibility incidents (Business
  Rule 2 / NFR "No side-channel leakage").
- Zero duplicate notifications for the same dedupe key, under normal
  operation and under a simulated worker crash-and-restart.

## Future Enhancements

- Email and WhatsApp channels, via the Delivery Channel Interface
  (20.4) — explicitly deferred, not built, in V1.
- Staff visibility into Business-scoped notifications, if a future rule
  explicitly grants it (Business Rule 7) — not decided by this BDS.
- Marketing/promotional notification categories, staff productivity
  scoring, and AI-generated recommendation notifications (Module #15
  dependency) — all explicitly out of scope for V1 and would each
  require their own Product Architect decision and BDS amendment.

## Acceptance Criteria

- [ ] Every `notifications/{id}` document has exactly one of
      `businessId`/`userId` set, consistent with its `scope`.
- [ ] A Business-scoped notification is visible to that Business's
      Admin and (view-only) Manager, and to no other Business's users.
- [ ] A User-scoped notification is visible only to its `userId`, never
      inferred or surfaced to another user on the same Business.
- [ ] No notification document duplicates a financial fact — every
      document's payload is a reference (`payloadRef`) only.
- [ ] A simulated Background Worker crash-and-restart produces no
      duplicate notification for the same real-world event.
- [ ] V1 ships exactly the four accepted categories (20.3); no
      marketing, promotional, staff-scoring, or AI-recommendation
      notification type exists in the schema or trigger logic.
- [ ] The Delivery Channel Interface (20.4) exists structurally even
      though only the in-app channel is implemented — adding Email or
      WhatsApp later requires no schema migration.

## What This BDS Does Not Do

Per explicit instruction for this drafting stage:

- Does not implement any code.
- Does not create Firestore schema beyond this BDS's design-stage
  definition (20.1) — no collection is created in `firestore.rules` or
  `src/` by this document.
- Does not touch `Header.tsx`.
- Does not create `NotificationContext`.

## Explicitly Left Open (Not Decided by This BDS)

- Exact grace-period/threshold tuning for each notification type (e.g.,
  how many days "approaching" means for a Closing) — an implementation
  parameter, not a scope decision.
- Platform Announcement broadcast mechanism (push-to-all vs. targeted)
  — a Functional Requirement to be settled at implementation planning,
  not fixed here.
- Whether/when Staff visibility into Business-scoped notifications is
  ever granted (Business Rule 7) — a future, separate Product Architect
  decision.

---

## Decision Record — Notifications Domain Resolution

**Resolves:** A genuine open question in Architecture §4.9/§7.4, which
left notification recipient binding unresolved (`uid` or `businessId`,
stated as an either/or with no section claiming to settle it — unlike
Module #19's binding, which at least had a conflicting-but-present
resolution in §9.4). Also fixes three additional Version 1 scope
questions (channel, notification types, worker ownership) raised during
Module #20 readiness analysis.

### Decision Gate 1 — Recipient Binding: Hybrid Model

**Accepted:** Notifications do not have one universal owner. Both
Business-scoped (`businessId`) and User-scoped (`userId`) recipients are
first-class, per Business Rule 1 / Functional Requirement 20.2.

**Rejected — all notifications → `userId` only.** Would force Business
events into artificial user ownership and create duplication problems
when multiple authorized people (Admin + Manager) need the same Business
alert.

**Rejected — all notifications → `businessId` only.** Cannot handle
personal/account events that belong to one specific user, not the
Business as a whole.

### Decision Gate 2 — Background Worker Dependency

**Accepted:** shared platform dependency. No separate Notifications-only
worker. Module #19 and Module #20 both state explicitly (Business
Rule 4/Functional Requirement 20.5, and Module #19's own existing
Non-functional Requirements) that: worker infrastructure is a
dependency neither module owns; trigger logic belongs to each domain;
scheduling infrastructure belongs to platform engineering.

### Decision Gate 3 — V1 Channel Scope

**Accepted:** in-app only for Version 1. Email, WhatsApp, SMS, and other
external providers are deferred. Reason: Sabush BPT's first
responsibility is Business Worth/performance intelligence — delivery
complexity should not delay that. Required constraint: a Delivery
Channel Interface (20.4) exists structurally from V1, so future channel
expansion is additive, never a domain redesign.

### Decision Gate 4 — V1 Notification Types

**Accepted:** four categories only — Business Closing Notifications,
Inventory Risk Notifications, Subscription Notifications (Module #19
dependency), Platform Announcements. Reason: Version 1 focuses on
Business health and platform continuity, consistent with the platform's
core identity. Explicitly excluded: marketing, promotional, sales
reminders, staff productivity scoring, AI-generated recommendations
(Module #15 dependency), WhatsApp delivery, email delivery.

### Lifecycle

**Designed.** This decision record and the BDS above document Product
Architect direction as communicated for Module #20 drafting. It becomes
**Accepted** only through the same explicit acceptance step every other
module in this series has used (Module #17, Module #19) — not by virtue
of being written down here.

---

## Product Architect Acceptance

**Not yet Accepted.** This BDS reflects Product Architect direction as
communicated for drafting (Decision Gates 1–4, above). Per the same
discipline used for Modules #17 and #19, this draft becomes
Designed → **Accepted** only through an explicit acceptance step — not
by virtue of having been written. Acceptance, when granted, should state
its scope explicitly — per Rule 8, an accepted BDS is still not itself
authorization to begin implementation; that remains a separate,
explicit go-ahead.
