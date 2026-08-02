Business Domain Specification

# Notifications

Version 1.1
**Status:** Accepted — business specification and architectural
decisions accepted; implementation not yet authorized
**Module #20 of 20 — Phase 4: Platform**
**Amended by:** [Module #20 Specification Enhancement Amendment](./20-notifications-enhancement-amendment.md)
(v1.1) — three owner-experience enhancements (Context-First
Communication, Communication Priority, Owner Confidence Principle).
All four Decision Gates below remain unchanged; V1 scope (Decision
Gate 4) was explicitly not widened. `[Amendment v1.1]`-tagged additions
throughout this document mark what changed; everything else is
unchanged v1.0 content.
**Architecture references:** [Section 3.12](../architecture/03-domain-architecture.md)
(Notifications domain definition — channel-agnostic delivery, never a
source of truth, Worth-First scope test), [Section 4.4](../architecture/04-system-architecture.md)
(Backend Architecture — The Privileged Server — one of three
notification-creation paths, per Decision Gate 2), [Section 4.8](../architecture/04-system-architecture.md)
(Background Processing and Scheduled Work — the shared worker for
scheduled/derived trigger logic, idempotency/dedupe-key mechanism),
[Section 4.9](../architecture/04-system-architecture.md) (Notifications
Architecture — `notifications` collection, all three trigger sources,
delivery fan-out), [Section 4.12](../architecture/04-system-architecture.md)
(Payments and Subscriptions Integration — the payment webhook handler,
the third notification-creation path, per Decision Gate 2), [Section 6.8](../architecture/06-user-architecture.md)
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
Worker (Architecture §4.8), the privileged server (§4.4), and the
payment webhook handler (§4.12) — three shared platform creation paths
this module does not own the infrastructure of, only its own trigger/
creation logic on each (see Decision Record, Decision Gate 2, below)
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
   notification is itself tenant-scoped information. An Owner with
   multiple Businesses (Module #17) does not receive a combined
   notification stream across Businesses — notifications remain
   isolated by their originating Business and are only visible through
   the active authorized Business context, mirroring #17's own "no
   aggregation across Businesses" boundary for financial data.
3. **No accounting drift.** This module never calculates Business
   Worth, modifies Closing data, modifies Inventory, or replaces
   Reports. It only communicates events already produced by domains
   that own that data authoritatively (Business Worth Engine, spec #2;
   Closings, spec #11; Stock Counts, spec #10; Breakages, spec #7;
   Subscriptions, spec #19). A notification payload references the
   triggering record; it never duplicates the financial fact itself
   (Architecture §4.9, Principle 2.4).
4. **The Background Worker is shared notification infrastructure for
   scheduled and derived events — it does not exclusively own
   notification creation.** Architecture §4.9/§7.4 name three
   legitimate creation paths into the `notifications` collection: the
   Background Worker (§4.8 — scheduled/threshold-based checks: overdue
   Closings, subscription expiry/trial-ending checks, inventory risk
   scans), the privileged server (§4.4 — immediate transactional
   events: staff suspension confirmation, security/account actions),
   and the payment webhook handler (§4.12 — payment/subscription
   provider events: payment result, subscription state change). No
   module or path owns the shared infrastructure itself (worker
   process, privileged server, webhook handler) — platform engineering
   does. Each domain/path owns only its own trigger/creation logic
   (which events produce a notification, what payload to write). All
   three creation paths must enforce the same tenant isolation,
   recipient binding (20.2), auditability, and notification rules this
   BDS defines — no creation path is exempt. See Decision Record,
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
9. **[Amendment v1.1] Context-First Communication.** Every notification
   must explain what happened, why it matters, and what action (if any)
   is recommended — not just that an event occurred. This affects
   presentation content, not scope: it does not add a new category, a
   new recipient rule, or a new creation path: it requires every
   existing category's payload to carry this explanation. See
   Functional Requirement 20.6.
10. **[Amendment v1.1] Communication Priority.** Not every notification
    deserves interruption. Every notification is assigned one of three
    priority tiers — immediate alert, activity timeline, or daily
    summary — reflecting how urgently it needs the owner's attention,
    independent of its category. This changes delivery behavior, not
    business scope: it does not change which events produce a
    notification (Decision Gate 4, unchanged), only how each one is
    surfaced. See Functional Requirement 20.7.

## UX Principles [Amendment v1.1]

**Owner Confidence Principle** (Amendment C). Communication should help
the owner make decisions, not just report that something happened. It
should reduce uncertainty rather than merely generate alerts, and
should include guidance where possible rather than reporting a problem
in isolation. This is a UX principle guiding how Context-First content
(Business Rule 9) is written and how the four accepted categories
present themselves — it is not a technical requirement and has no
corresponding schema field or Acceptance Criterion of its own. It is
recorded here so implementation and future content decisions are
judged against it, the same way Business Rules are judged against
tenant isolation.

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
  createdAt: timestamp,

  // [Amendment v1.1] Context-First Communication (Business Rule 9, 20.6)
  context: {
    whatHappened: string,        // plain-language description of the event
    whyItMatters: string,        // why this matters for the business, not just that it occurred
    recommendedAction: string | null  // null only when no action is possible/needed
  },

  // [Amendment v1.1] Communication Priority (Business Rule 10, 20.7)
  priority: 'immediate' | 'timeline' | 'daily_summary'
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
- **[Amendment v1.1]** `context` and `priority` are both required,
  non-null on every notification document, regardless of category —
  a document missing either is not valid under this spec. This applies
  uniformly across all three creation paths (20.5); no path is exempt.

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

### 20.5 Notification Creation Path Contract (Decision Gate 2 applied)

- This module owns: which events produce a notification (per category,
  20.3), and the payload/dedupe-key shape for each (20.1) — regardless
  of which of the three paths below creates the document.
- **Path 1 — Background Worker (Architecture §4.8).** Scheduled/
  threshold-based checks: Closing approaching/overdue, subscription
  expiry/trial-ending state (Module #19), inventory/stock-count risk
  scans. This module does not own the worker's scheduling process,
  interval configuration, or crash-recovery mechanism — those belong
  to the shared Background Worker, the same instance Module #19's
  subscription-lifecycle checks run on.
- **Path 2 — Privileged server (Architecture §4.4).** Immediate
  transactional events produced synchronously with a server-verified
  action — e.g., a staff-suspension confirmation, a security/account
  event, a role-change confirmation (one of 20.2's User-scoped
  examples). This module does not own the privileged-server
  request-handling infrastructure, only the notification payload/type
  produced when such an action occurs.
- **Path 3 — Payment webhook handler (Architecture §4.12).** Payment
  or subscription-provider-originated events — payment result,
  subscription state change — a Module #19 dependency. This module
  does not own the webhook handler or payment processor integration,
  only the notification payload/type produced when such an event
  arrives.
- All three paths write into the same `notifications` collection using
  the same schema (20.1) and the same recipient-scope rules (20.2) —
  there is no separate schema, access path, or rule set per creation
  source.
- No module — #19, #20, nor any future one — owns the Background
  Worker, privileged server, or webhook handler infrastructure itself;
  those remain platform engineering's shared infrastructure. This
  module owns only its own trigger/creation logic across all three
  paths, and states this explicitly so implementation never treats any
  single path as the sole owner of notification creation.

### 20.6 Context-First Communication [Amendment v1.1] (Business Rule 9 applied)

- Every notification's `context` (20.1) must be populated with three
  pieces, regardless of category: what happened, why it matters to the
  business, and what action — if any — is recommended.
  `recommendedAction` is `null` only when no action is genuinely
  possible or needed (e.g., a Platform Announcement), never merely
  because the specific wording hasn't been written yet.
- This is a presentation/content requirement, not a scope change: it
  does not add a category, a recipient rule, or a creation path. Each
  of the three existing trigger sources (Background Worker, privileged
  server, payment webhook — 20.5) is responsible for populating
  `context` for the notifications it creates, using language
  appropriate to that event.
- Exact wording/copy for each notification `type` is implementation-
  planning work, not fixed by this amendment (see "Explicitly Left
  Open," below) — this requirement fixes that the three pieces must
  exist and be populated, not their specific phrasing.

### 20.7 Communication Priority Tiers [Amendment v1.1] (Business Rule 10 applied)

- Every notification is assigned one `priority` (20.1) at creation:
  - **`immediate`** — warrants interruption; the owner should see this
    without needing to open the app and look.
  - **`timeline`** — belongs in the Business Timeline / activity feed
    (spec #13); worth recording and seeing on a normal visit, not worth
    interrupting for.
  - **`daily_summary`** — belongs in a periodic digest rather than a
    standalone alert; individually low-urgency, but useful in
    aggregate.
- This governs delivery behavior within the existing in-app channel
  (Decision Gate 3, unchanged) — it does not introduce a new channel,
  and it does not change which events produce a notification (Decision
  Gate 4, unchanged).
- Which specific `type` within each of the four accepted categories
  (20.3) defaults to which tier is **not decided by this amendment** —
  see "Explicitly Left Open," below. This section fixes the taxonomy
  (three tiers, one required field) and its purpose, not the mapping.
- A `daily_summary`-tier notification is not exempt from any Business
  Rule in this spec (tenant isolation, dedupe, recipient scope,
  Context-First content) merely because it isn't `immediate` — priority
  affects delivery timing/grouping only, never which rules apply.

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
- [ ] **[Amendment v1.1]** Every `notifications/{id}` document has a
      populated `context` (20.6) — `whatHappened` and `whyItMatters` are
      always non-empty; `recommendedAction` is `null` only when no
      action is genuinely possible or needed.
- [ ] **[Amendment v1.1]** Every `notifications/{id}` document has a
      `priority` (20.7) of exactly one of `immediate`, `timeline`, or
      `daily_summary` — never absent, never any other value.

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
- **[Amendment v1.1]** Exact `context` wording/copy for each specific
  notification `type` — 20.6 fixes that the three pieces must exist and
  be populated, not their phrasing.
- **[Amendment v1.1]** The default `priority` tier for each specific
  notification `type` within the four accepted categories — 20.7 fixes
  the three-tier taxonomy and its purpose, not the mapping. Implementation
  planning assigns each `type` to a tier before Module #20 is built.

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

### Decision Gate 2 — Notification Creation Path Ownership

**Accepted:** notification creation is not exclusive to the Background
Worker. Architecture §4.9/§7.4 name three legitimate creation paths —
Background Worker (§4.8, scheduled/derived events), privileged server
(§4.4, immediate transactional events), and payment webhook handler
(§4.12, payment/subscription-provider events) — and this BDS's original
drafting language (Business Rule 4/Functional Requirement 20.5)
understated that by naming only the Background Worker. Corrected prior
to Acceptance: the Background Worker is shared notification
infrastructure for scheduled and derived events; it does not
exclusively own notification creation. Privileged-server and
payment-webhook creation paths are equally legitimate for immediate
transactional or external-state events. No module owns any of the
three pieces of shared infrastructure (worker, privileged server,
webhook handler) themselves; each domain owns only its own trigger/
creation logic. All creation paths must enforce the same tenant
isolation, recipient binding, auditability, and notification rules
this BDS defines — no path is exempt from those rules.

**Rejected — Background Worker as sole/exclusive creation path.** This
was the BDS's original implicit framing (Business Rule 4/FR 20.5 named
only the worker) and would have contradicted Architecture §4.9/§7.4,
which already name privileged-server and payment-webhook creation as
legitimate paths. Corrected before Acceptance rather than carrying the
narrower framing into implementation.

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

**Designed → Executed review → Analyzed → Accepted.** This decision
record and the BDS above documented Product Architect direction as
communicated for Module #20 drafting; a subsequent documentation review
against Module #17's and Module #19's Accepted rules, Architecture's
tenant isolation principle, and the SuperAdmin dependency chain
surfaced the Decision Gate 2 correction above (analyzed findings), which
was then applied to this document. Accepted through the same explicit
acceptance step every other module in this series has used (Module #17,
Module #19) — not by virtue of being written down here.

---

## Product Architect Acceptance

**Accepted.** Scope of this acceptance, as explicitly granted:

1. **Recipient binding — hybrid model** (Decision Gate 1). Both
   Business-scoped (`businessId`) and User-scoped (`userId`)
   notifications are first-class; neither is a universal owner.
2. **Notification creation path ownership** (Decision Gate 2, corrected
   pre-Acceptance). The Background Worker is shared notification
   infrastructure for scheduled and derived events; it does not
   exclusively own notification creation. Notifications may also be
   created by privileged-server workflows (§4.4) and payment webhook
   handlers (§4.12) where immediate transactional or external-state
   events require it. All creation paths enforce the same tenant
   isolation, recipient binding, auditability, and notification rules
   this BDS defines.
3. **V1 channel scope — in-app only** (Decision Gate 3). Email and
   WhatsApp deferred, behind a Delivery Channel Interface (20.4) built
   from V1 so later channel addition is additive, not a redesign.
4. **V1 notification types — four categories only** (Decision Gate 4).
   Business Closing, Inventory Risk, Subscription (Module #19
   dependency), Platform Announcements. Marketing, promotional,
   staff-scoring, and AI-recommendation (Module #15 dependency)
   categories remain explicitly excluded.
5. **Tenant isolation, including the Module #17 boundary.** Business
   Rule 2's multi-Business clarification is accepted: an Owner with
   multiple Businesses does not receive a combined notification stream
   across Businesses — notifications remain isolated per originating
   Business, mirroring #17's "no aggregation across Businesses"
   boundary for financial data.

**Not included in this acceptance:** any source code implementation,
`firestore.rules` changes, `Header.tsx` changes, or `NotificationContext`
creation. This acceptance clears the BDS's business specification,
architectural decisions, and the Decision Gate 2 correction — it is not,
by itself, authorization to begin implementation. Per Rule 8,
implementation still requires its own affected-files/plan/risks review
at the point it's actually assigned. Lifecycle: **Designed → Executed
review → Analyzed → Accepted.** Not Implemented, Executed (as code), or
further Analyzed beyond this review — no engineering work is authorized
by this Acceptance.

---

## Product Architect Acceptance — Amendment v1.1

**Accepted.** Full detail and rationale in the [Module #20
Specification Enhancement Amendment](./20-notifications-enhancement-amendment.md).
Scope of this acceptance:

1. **Context-First Communication** (Amendment A, Business Rule 9,
   20.6). Every notification's payload must carry `context`: what
   happened, why it matters, and a recommended action (or an explicit
   `null` where none applies).
2. **Communication Priority** (Amendment B, Business Rule 10, 20.7).
   Every notification carries a `priority` of `immediate`, `timeline`,
   or `daily_summary`, independent of category.
3. **Owner Confidence Principle** (Amendment C, UX Principles section).
   Recorded as a UX principle guiding Context-First content and future
   presentation decisions — explicitly not a technical requirement, with
   no schema field or Acceptance Criterion of its own.

**Decision Gates 1–4 are unchanged and remain fully in force** —
this amendment does not reopen, widen, or reinterpret any of them.
Decision Gate 4 in particular was explicitly considered and left as-is:
V1 remains exactly four categories.

**Not included in this acceptance:**
- Renaming the module or replacing this specification.
- Widening Decision Gate 4 (no AI-recommendation, Staff Activity, or
  Business Worth milestone notification category is introduced).
- Any source code implementation, `firestore.rules` changes,
  `Header.tsx` changes, or `NotificationContext` creation — this
  amendment is documentation only, same as the v1.0 acceptance above.

**Lifecycle:** Designed → Executed review → Analyzed → **Accepted**.
Not Implemented, Executed (as code), or further Analyzed beyond this
review — no engineering work is authorized by this amendment.
