Business Domain Specification

# SuperAdmin

Version 1.0
**Status:** Drafted, awaiting approval
**Module #18 of 20 — Phase 4: Platform**
**Architecture references:** [Section 9](../architecture/09-superadmin-architecture.md)
(full design — Application Shell 9.1, Platform Dashboard 9.2,
Businesses/Tenant Management 9.3, Subscriptions & Billing 9.4, Feature
Flags 9.5, Audit Logs 9.6, Support/Support Session Management 9.7,
Platform Analytics 9.8, Notifications platform-side 9.9, Impersonation
9.10, System Health 9.11, Internal Account Management 9.12,
Screen-to-Data Summary Table 9.13), [Section 3.14](../architecture/03-domain-architecture.md)
(SuperAdmin domain definition — "the platform-operator layer... without
direct database console access"; Worth-First scope test), [Section 4.6](../architecture/04-system-architecture.md)
(Authentication and Session Architecture — server-issued, time-boxed,
audit-logged impersonation credential; the `isSuspended()`-at-the-Rules-layer
pattern generalized to business-level suspension), [Section 4.10](../architecture/04-system-architecture.md)
(the shared aggregation layer — `platform_aggregates/{period}`, the
single boundary SuperAdmin's Dashboard/Analytics/Businesses-list reads
must never bypass), [Section 4.12](../architecture/04-system-architecture.md)
(Payments and Subscriptions Integration — system-level webhook shape;
Section 9 owns billing design), [Section 4.13](../architecture/04-system-architecture.md)
(SuperAdmin Integration Point — the separate-application decision this
entire spec is built on: "SuperAdmin code is simply never present in a
tenant's browser"), [Section 6.5–6.8](../architecture/06-user-architecture.md)
(Roles: Support, Developer, SuperAdmin (Full); the Support Session access
pattern — server-issued, time-boxed, single-`businessId`-scoped,
read-only, distinct from both the aggregation layer and impersonation;
the Permission Matrix), [Section 7.4](../architecture/07-data-architecture.md)
(New Top-Level Platform-Scoped Entities — `platform_operators/{uid}`,
`subscriptions/{id}`, `notifications/{id}`, `platform_aggregates/{period}`,
`platform_audit_log/{id}`, and the write-path column for each), [Section 7.9](../architecture/07-data-architecture.md)
(Data Retention and Deletion — the two-path closure/purge design 9.3
triggers), [Section 8's](../architecture/08-module-architecture.md)
line 29 ("Notifications, Subscriptions, SuperAdmin, AI, and Analytics
have no module yet... out of scope for Section 8"), [Section 13.2](../architecture/13-development-strategy.md)
(rule 1 — "a phase only starts once every domain it reads from has real
data, not a mock... the single reason SuperAdmin (Phase 2) cannot come
before Subscriptions/Notifications (Phase 1)") and [Section 13.6](../architecture/13-development-strategy.md)
(Phase 2 — SuperAdmin Application, its exact scope and its own stated
blocking dependency on Phase 1)
**Depends on:** This spec documents design only and has no code
dependency of its own yet, but per Architecture 13.2/13.6, **the
*implementation* this spec eventually authorizes cannot begin until
Subscriptions (Module #19) and Notifications (Module #20) hold real
data** — 9.4 (Subscriptions & Billing) and 9.9 (platform-side
Notifications) are both designed against those collections already
existing and populated, not against a mock. [Staff & Roles (spec #16)](./16-staff-roles.md)
established the `isOwnerOf`/`suspended`-at-the-Rules-layer pattern this
spec's business-suspension design (9.3) generalizes one level up, from
staff to business. [Owner Portfolio (spec #17)](./17-owner-portfolio.md) is the
first spec to name a concrete, real SuperAdmin touchpoint
(`businessCode` display, Architecture 8.14) that this module will
eventually consume.
**Implementation:** None. Confirmed by direct search of `src/`,
`server/`, and `firestore.rules`: no directory, route, collection
reference, or identifier anywhere in the codebase matches
`superadmin`, `platform_operators`, `platform_aggregates`,
`platform_audit_log`, `feature_flags`, `platform_worker_state`, or
`subscriptions`. There is no separate SuperAdmin application build in
this repository, no `/api/superadmin/*` route on the privileged server
(`server/index.ts` exposes only four staff-management routes plus a
health check, per spec #16), and no platform-scoped Firestore rule of
any kind. This is consistent with Architecture: Development Strategy
(13.6) places the full SuperAdmin application build in Phase 2, itself
gated behind Phase 1 (Subscriptions, Notifications, the generalized
Background Worker), none of which exist in this codebase either.
**This spec is deliberately design-only** — it documents what Module
#18 must do once Phase 1 is real, per the explicit instruction under
which it was drafted. No code, Firestore Rules, or schema is touched by
this document.

---

## ⚠️ Sequencing note for the record

`HANDOFF.md`'s prior "confirmed build order" line (`#17 → #18
(SuperAdmin) → #19 (Subscriptions) → #20 (Notifications)`) is in direct
tension with Architecture 13.2's rule 1 and 13.6, both of which state
Phase 2 (SuperAdmin) is *blocked on* Phase 1 (Subscriptions,
Notifications) having real data — specifically because 9.4 (Subscriptions
& Billing) and 9.9 (platform-side Notifications) are designed to read
those collections, not mock them. This spec does not resolve that
discrepancy — resequencing HANDOFF's build order is a PM decision, not
an engineering one — but it is flagged here explicitly, per this
project's own discipline ("a process gap worth flagging when it's
noticed, not a shortcut to take quietly," `docs/specs/README.md`),
rather than silently drafted around. `HANDOFF.md` is updated below to
carry this flag forward instead of repeating the contradicted order.

---

## Purpose

Establish the business specification for SuperAdmin — the
platform-operator layer Architecture Section 3.14 and Section 9 fully
designed as a physically separate application (Architecture 4.13) that
lets Sabush (the company) run the platform responsibly across thousands
of tenants: tenant visibility and management, subscription/billing
operations, feature-flag rollout control, platform-level audit logging,
platform analytics, and time-boxed, logged impersonation — all without
direct database console access and without ever weakening tenant
isolation (Principle 2.8). This spec turns Section 9's twelve
subsections into one settled contract so that when Phase 2 build work
begins, engineering has a single citable source of business rules
rather than re-deriving scope from architecture text module by module.

## Business Problem

Every prior module in this series (#1–#17) solves a problem the
tenant — the shop owner — has. SuperAdmin solves a different problem:
Sabush's own inability to run its own platform safely once it has more
tenants than any one person can hold in their head. Concretely, three
problems Architecture names directly: (1) a support agent needs to help
a business owner without either being handed the owner's password or
being granted an unaudited backdoor into every business's raw data;
(2) the company needs to suspend, reactivate, or legally delete a
business's account without a database console session, and needs that
suspension to take effect immediately, not at the next token refresh
(Architecture 4.6); (3) the company needs cross-tenant visibility
(growth, churn, feature adoption) to run the business, but Principle 2.8
forbids getting it through a raw scan of `businesses/*`. SuperAdmin is
the one coherent answer to all three, built once rather than as three
separate ad hoc tools.

## Users

- **Support:** Sabush employees who assist admins directly —
  investigating a reported issue, viewing (never editing) a business's
  data via a time-boxed Support Session, initiating impersonation only
  when an admin has explicitly asked for hands-on help (Architecture
  6.5). The most restricted platform-operator tier — no billing,
  feature-flag, suspension, or internal-account authority.
- **Developer:** Sabush engineers who need feature-flag control,
  platform Audit Log/Analytics visibility, and System Health diagnosis,
  but who must not default to standing raw access to tenant financial
  data any more than Support does (Architecture 6.6). A Developer
  debugging one specific business's issue goes through the same
  audited Support Session path Support does.
- **SuperAdmin (Full):** the top of the platform-operator hierarchy —
  everything Developer has, plus business suspension/reactivation/
  closure/purge, subscription/billing overrides, and granting/revoking
  Support or Developer access to other internal accounts (Architecture
  6.7).
- **Tenant Admin/Staff/Manager (indirect users):** never log into this
  application — its existence is felt only as: an unmissable banner
  during an active impersonation session (9.10), a `businessCode`
  visible on their own Dashboard for reading to a support agent
  (Architecture 8.14), and a suspension flag that, if ever set, denies
  further writes immediately.

## User Stories

- As Support, I want to look up a business by its `businessCode` (the
  fast path a caller can read off their own Dashboard) so I can start
  helping them within seconds of a support call beginning.
- As Support, I want to open a time-boxed, read-only view of one
  business's data with a stated justification, so I can diagnose an
  issue without needing write access or an unaudited database session.
- As SuperAdmin, I want to suspend a business immediately when Sabush's
  billing or trust-and-safety process requires it, so the business's own
  Admin/Staff can no longer write new data from the moment the decision
  is made, not from their next login.
- As SuperAdmin, I want to override a subscription's plan or status
  directly for support/dispute resolution, with that override
  automatically and permanently logged, so a billing dispute can be
  resolved without bypassing the audit trail entirely.
- As Developer, I want to roll a new feature out to a subset of
  businesses or kill-switch it platform-wide without a redeploy, so a
  bad rollout can be contained in minutes, not a deploy cycle.
- As any platform operator, I want every privileged action I take
  logged automatically — who, what, when, why — so "who looked at this
  business's data, and when" is always answerable from this app, never
  from a database console.
- As a tenant Admin, I want to be unmistakably aware if a platform
  operator is ever acting as me (impersonation), so I'm never surprised
  by an action I didn't personally take.
- As SuperAdmin, I want to provision or revoke another internal
  account's platform role, so the internal team can grow without ever
  falling back to shared credentials or manual Firestore edits.

## Scope

**In scope for this spec (and, once approved, for Phase 2
implementation):** the twelve screens/capabilities Architecture 9.1–9.12
name — Application Shell/role-gated nav, Platform Dashboard, Businesses/
Tenant Management (search, suspend/reactivate/close/purge, Support
Session-gated detail view), Subscriptions & Billing (view + SuperAdmin
override), Feature Flags, Audit Logs, Support Session request/monitor
flow, Platform Analytics, platform-side Notifications configuration,
Impersonation, System Health, and Internal Account Management. All as a
physically separate application per Architecture 4.13, sharing the
tenant SPA's Firebase project, privileged server, and Design System —
never bundled into the tenant SPA's browser bundle.

**Explicitly not in scope for this spec:** any implementation
(code, Firestore Rules, schema, or deployment); resolving the
HANDOFF.md sequencing discrepancy noted above; specifying the payment
processor vendor (Architecture 4.12 leaves that to whoever builds
Subscriptions, Module #19); the tenant-facing Notification feed itself
(Module #20's concern — this spec covers only the platform-side
configuration/aggregate-health screen, 9.9); AI's rollout mechanics
beyond naming Feature Flags as the mechanism Section 10 will use
(Module #15's concern); Analytics as a tenant-facing module (already
resolved as never existing, per `docs/specs/README.md`'s note on
Module #14 — its BDS content is folded into this spec's 9.8 section
instead, as that note anticipated).

## Business Rules

**SuperAdmin is a separate application, not a gated view — no
exceptions**
- Architecture 4.13's decision is absolute: SuperAdmin-capable code must
  never ship to a tenant's browser, gated or not. This spec does not
  reopen that decision or propose a "quick" in-SPA admin route for any
  screen, even a seemingly low-risk one like Feature Flags.
- The separate app still consumes the same `DESIGN_SYSTEM.md` tokens
  (Principle 2.11, restated in 4.13) — visually consistent, structurally
  isolated.

**Three distinct access patterns to tenant/cross-tenant data — never
conflated**
- **Aggregated (9.2, 9.8):** reads `platform_aggregates/{period}`
  exclusively for any cross-tenant figure. A dashboard or analytics
  number with no traceable `platform_aggregates` source is exactly the
  "raw cross-tenant read dressed up as a summary card" Principle 2.8
  forbids (9.2's own business rule).
- **Support Session (9.3, 9.7):** a server-issued, time-boxed (60
  minutes, non-renewable without a fresh request), single-`businessId`-
  scoped, **read-only** credential, requiring a stated justification,
  logged to the platform Audit Log at both issuance and expiry
  (Architecture 6.5, 9.7). This is the one sanctioned exception to
  "platform operators never read raw tenant data directly" — sanctioned
  only because it is time-boxed, single-tenant, read-only, and logged.
- **Impersonation (9.10):** a full read/write session acting *as* a
  specific Admin, requiring a reference to an Admin-initiated help
  request, time-boxed at 30 minutes (shorter than a Support Session,
  since it carries write authority), scoped to exactly that Admin's own
  permissions — never the operator's platform authority *plus* the
  Admin's tenant authority simultaneously. An active impersonation
  session must show a persistent, unmissable banner in the tenant SPA
  to the impersonated Admin (Principle 2.3 applied to transparency).
- A Support Session can never be silently escalated to impersonation
  from within the same credential — obtaining write access always
  requires a separate, independently logged impersonation request
  (9.7's business rule).

**Every privileged write is server-verified and audit-logged, in the
same transaction where applicable**
- Every write this application can trigger (`suspend`, `reactivate`,
  `close`, `purge`, subscription override, feature flag change, Support
  Session/impersonation issuance, internal account provisioning/
  revocation) goes through the privileged server's `/api/superadmin/*`
  routes (Architecture 4.4/4.13) and re-verifies the caller's
  `platform_operators/{uid}.platformRole` server-side — the rendered UI
  state is never trusted as authorization (Principle 2.9, restated in
  9.3, applied to internal tooling as strictly as to tenant-facing
  actions).
- A subscription override writes the `subscriptions/{id}` change and a
  platform Audit Log entry in the same server-side transaction — an
  override with no corresponding audit entry must be structurally
  impossible, not merely discouraged (9.4).

**A screen a role cannot see is not rendered — least privilege by
construction**
- The shell reads `platform_operators/{uid}.platformRole` once at load
  and builds navigation from Architecture 6.8's permission matrix
  (restated in 9.1's table). A role without access to a screen does not
  see a disabled button for it; the screen does not exist in that
  session at all.

**Feature flags are for rollout pacing, never for authorization**
- A flag must never be the sole gate on a genuinely privileged action
  (billing, suspension) — those are already gated by role and Security
  Rules. Conflating the two would let a flag misconfiguration become a
  security hole (9.5's business rule, Principle 2.4 applied to
  authorization).

**Platform identity is structurally separate from tenant identity**
- `platform_operators/{uid}` is a distinct top-level collection from
  `users/{uid}` (Architecture 7.4) — the SuperAdmin app's own auth check
  reads only `platform_operators/{uid}`, never `users/{uid}`, so a
  tenant account cannot accidentally gain platform authority (or vice
  versa) through a shared document.
- Only an existing SuperAdmin can provision a new `platform_operators`
  record; there is no self-service signup for this collection (7.4,
  9.12). A SuperAdmin cannot revoke their own record if doing so would
  leave zero active SuperAdmin accounts platform-wide (9.12's structural
  safeguard, checked server-side before the write is allowed).

**Business closure is soft by default; hard deletion is a separate,
deliberately harder path**
- Suspending a business sets a Security-Rules-enforced flag denying
  further tenant writes immediately (Architecture 4.6's pattern,
  generalized from staff-level to business-level). Closing a business
  sets `status: 'closed'` and retains every subcollection, per
  Architecture 7.9's path 1 — never a hard delete. Legal/compliance
  purge (7.9's path 2) is a separate, harder-to-reach confirmation flow
  on the same screen, given its irreversibility, and requires a logged
  justification *before* the deletion executes, not after.

**Analytics and SuperAdmin's dashboard read the same layer, never a
second computation path**
- Platform Analytics (9.8) is a deeper, filterable view over the exact
  same `platform_aggregates` collection the Dashboard (9.2) summarizes —
  never a separate cross-tenant computation path (Principle 2.6). Any
  future analytics view must be satisfiable from `platform_aggregates`
  as it stands or from a new field the Background Worker's rollup is
  extended to compute — never a bespoke direct query against tenant
  collections.

## Functional Requirements

*None of the following is implemented yet (see Implementation, above).
Every requirement below is grounded directly in Architecture 9.1–9.13 —
nothing here is invented beyond what Architecture already specified.*

1. **Application Shell & role-gated navigation (9.1):** On load, read
   the caller's `platform_operators/{uid}.platformRole` and render only
   the nav entries that role can access, per the 9.1/6.8 permission
   matrix. No entry for an inaccessible screen is rendered in any form.
2. **Platform Dashboard (9.2):** Show total active businesses, active
   subscriptions, platform health status, and the most recent N Audit
   Log entries. Every cross-tenant figure traces to a
   `platform_aggregates/{period}` document; System Health status and
   recent Audit Log entries are the only two widgets reading elsewhere.
3. **Businesses / Tenant Management (9.3):** A single search bar
   (priority order: exact `businessCode` → Admin email → business name,
   fuzzy/prefix) available to all three roles, reading only
   `platform_aggregates`-derived list data for results. Opening a
   specific business's raw detail view requires a Support Session for
   Support/Developer, or a self-issued (but still logged) session for
   SuperAdmin. SuperAdmin (full) can suspend/reactivate a business and
   trigger closure or the separate, harder-to-reach purge flow.
4. **Subscriptions & Billing (9.4):** View a business's `subscriptions/{id}`
   record (keyed by `businessId`, per Architecture 9.4's resolution of
   7.4's open item). SuperAdmin can override plan/status directly, with
   the override and its Audit Log entry written in the same server
   transaction. Developer has read-only access, including
   billing-webhook delivery history. Support has no access to this
   screen at all.
5. **Feature Flags (9.5):** Developer/SuperAdmin can create/update a
   `feature_flags/{flagId}` document (`enabled`, optional
   `rolloutPercentage`, optional `enabledBusinessIds[]`). Every change is
   logged to the platform Audit Log. The tenant SPA reads flags as a
   small, cached, read-only fetch on load — never as a Security Rules
   gate.
6. **Audit Logs (9.6):** An append-only, filterable (by business, actor,
   action type) log of every platform-operator action named in this
   spec. Support sees only entries where `actorUid` is their own;
   Developer and SuperAdmin see the full log.
7. **Support (Support Session management, 9.7):** Any role can find a
   business (via 9.3's search), enter a required justification, and
   request a session from `/api/superadmin/support-session/request`.
   The server re-verifies the caller's role, issues a 60-minute,
   non-renewable, single-`businessId`, read-only credential, and logs
   both issuance and expiry.
8. **Platform Analytics (9.8):** Developer/SuperAdmin-only, deeper
   filterable view over `platform_aggregates`, never a new cross-tenant
   query path.
9. **Notifications, platform-side (9.9):** Developer/SuperAdmin can
   configure platform-level alert rules (e.g., Background Worker job
   failure) and view tenant-facing notification delivery health in
   aggregate — never per-notification content.
10. **Impersonation (9.10):** Any role can initiate, provided the
    request captures a reference to an Admin-initiated help request.
    30-minute time-box, scoped to exactly the impersonated Admin's own
    permissions, with a persistent banner shown to that Admin in the
    tenant SPA for the session's duration. Issuance and expiry logged.
11. **System Health (9.11):** Developer/SuperAdmin-only view of
    `platform_worker_state/{jobType}` documents' `lastRunCompletedAt`,
    with failed-run signals computed by comparing that watermark
    against each job's expected interval — no new tracking mechanism
    beyond what Architecture 4.8.1 already defines.
12. **Internal Account Management (9.12):** SuperAdmin-only. Invite an
    internal account by email (must correspond to a real Firebase Auth
    account; no self-service signup), assign a `platformRole`, log the
    assignment. Revoke any `platform_operators/{uid}` record, including
    another SuperAdmin's, blocked server-side if it would leave zero
    active SuperAdmin accounts.

## Non-Functional Requirements

**Localization**
- Architecture does not name a specific locale requirement for the
  SuperAdmin app distinct from the rest of the product's i18n discipline
  (pt/en/fr, per every prior module's Acceptance Criteria). This spec
  does not invent one; the internal-tooling audience may reasonably
  justify a narrower locale set, but that is a product decision for
  whoever scopes Phase 2 implementation, not one this spec makes.

**Performance**
- Dashboard and Analytics reads are bounded by design — they read only
  `platform_aggregates/{period}` documents, never a live scan of
  `businesses/*` (9.2's business rule) — so this screen's performance
  does not degrade as tenant count grows, by construction rather than by
  later optimization.
- Audit Log filtering (by business/actor/action type) at scale is named
  by Architecture 11 (Scalability Strategy) as needing concrete
  pagination/index thresholds once real volume exists; this spec defers
  the specific numbers to that section rather than inventing them.

**Accessibility / Design System**
- Every screen consumes existing `DESIGN_SYSTEM.md` tokens and, where
  applicable, `COMPONENT_LIBRARY.md` components — "separate application"
  does not mean "separate design language" (Architecture 4.13,
  Principle 2.11).

## Security Requirements

- **Tenant isolation is the central requirement.** No code path in this
  application may let one business's data be read, written, or derived
  outside the three sanctioned access patterns (aggregated,
  Support-Session, impersonation) named in Business Rules above.
  Principle 2.8 applies to this application exactly as strictly as to
  the tenant SPA — arguably more so, since this app's entire purpose is
  cross-tenant visibility.
- **Every privileged write is re-verified server-side**, never trusted
  from client-rendered role state (Principle 2.9). This applies
  identically across all three roles — Support's more limited UI is a
  convenience, not the actual security boundary; the actual boundary is
  the privileged server's own role check on every `/api/superadmin/*`
  route.
- **Suspension takes effect at the Security Rules layer immediately**,
  not at the suspended business's next token refresh (Architecture
  4.6's pattern, generalized from staff-level to business-level).
- **A feature flag is never the sole gate on a privileged action**
  (Business Rules, above) — this is a security requirement, not only a
  design-cleanliness one, since conflating the two would let a
  misconfigured flag become an authorization bypass.
- **Impersonation visibility to the impersonated Admin is a security
  requirement, not just a UX nicety** — an Admin must never be unaware
  that a platform operator is currently acting as them (Architecture
  9.10, Principle 2.3 applied to transparency).
- **Internal account provisioning is SuperAdmin-only and never
  self-service** (7.4, 9.12) — this closes the specific risk of an
  unauthorized party granting themselves platform authority.
- **No payment instrument data is ever stored by Sabush BPT itself**
  (Architecture 4.12) — the payment processor remains the system of
  record for card/mobile-money credentials; this application stores and
  displays only the resulting `subscriptions/{id}` state.
- **Rules-emulator verification is required before any of this ships**,
  consistent with the still-open gap `HANDOFF.md` already flags for
  Module #16's rules changes — this spec does not relax that
  requirement for a module with a materially larger cross-tenant blast
  radius than #16 had.

## User Flows

**Flow 1 — Support looks up a business and requests a Support Session**
1. Support opens Businesses / Tenant Management and types a
   `businessCode` (or email, or business name) into the search bar.
2. A `businessCode` match returns exactly one result; the other two
   inputs return a list to narrow from.
3. Support selects the business and enters a required justification.
4. Request goes to `/api/superadmin/support-session/request`; the
   server re-verifies Support's `platform_operators` role and issues a
   60-minute, read-only, single-business credential.
5. Issuance is logged to the platform Audit Log. Support views the
   business's raw data, read-only, for up to 60 minutes.
6. At expiry, the session ends automatically; expiry is logged even
   though "nothing happens" — the end of access is itself part of the
   record.

**Flow 2 — SuperAdmin suspends a business**
1. SuperAdmin finds the business via the same search bar.
2. SuperAdmin selects "Suspend" from the business detail view (rendered
   only for the SuperAdmin role, per 9.1's not-merely-disabled rule).
3. Request goes to `/api/superadmin/business/suspend`; the server
   re-verifies SuperAdmin's role and writes the suspension flag.
4. The flag takes effect at the Security Rules layer immediately — the
   business's own Admin/Staff cannot complete a further write from that
   moment, regardless of their current session's token freshness.
5. The action is logged to the platform Audit Log.

**Flow 3 — SuperAdmin overrides a subscription for a billing dispute**
1. SuperAdmin opens Subscriptions & Billing for the business in
   question (found via 9.3's search).
2. SuperAdmin changes plan/status directly, with a required
   justification.
3. The server writes the `subscriptions/{id}` change and a platform
   Audit Log entry in the same transaction — one cannot occur without
   the other.

**Flow 4 — Developer stages a feature flag rollout**
1. Developer opens Feature Flags and creates or edits a
   `feature_flags/{flagId}` document — global toggle, percentage
   rollout, or an explicit `enabledBusinessIds[]` list.
2. The write goes through `/api/superadmin/flags/*`; the change is
   logged to the platform Audit Log.
3. The tenant SPA's next load picks up the change via its small, cached
   flag fetch — no redeploy required.

**Flow 5 — An operator impersonates an Admin who requested help**
1. The Admin has already signaled they need hands-on help (a support
   ticket reference or an in-app "I need help" flag).
2. Any platform-operator role requests impersonation, providing the
   reference to that request.
3. The server issues a 30-minute, write-scoped-to-that-Admin's-own-
   permissions credential; issuance is logged.
4. The tenant SPA shows a persistent, unmissable banner to the Admin for
   the session's duration.
5. At expiry (or earlier, if ended manually), expiry is logged.

**Flow 6 — SuperAdmin provisions a new internal account**
1. SuperAdmin opens Internal Account Management and invites a new
   internal user by email (must already exist as a Firebase Auth
   account).
2. SuperAdmin assigns a `platformRole` (`support | developer |
   superadmin`).
3. The server writes the `platform_operators/{uid}` record and logs the
   grant to the platform Audit Log.

## Data Model Impacts

*Design only — no schema change is made by this spec. The following
collections are the ones Architecture 7.4/9.5/4.8.1 already name as
required for Phase 2 implementation; restated here so this spec is a
complete, self-contained contract.*

| Collection | Purpose | Write path |
|---|---|---|
| `platform_operators/{uid}` | Platform-operator identity (`platformRole: support\|developer\|superadmin`) — structurally separate from `users/{uid}` | Privileged server only, provisioned by an existing SuperAdmin (9.12) |
| `subscriptions/{id}` | Commercial/billing state, keyed by `businessId` (9.4's resolution) | Privileged server: webhook handler (4.12) or SuperAdmin override (9.4) |
| `platform_aggregates/{period}` | Anonymized, already-aggregated cross-tenant figures — the exclusive source for any Dashboard/Analytics/Businesses-list cross-tenant figure | Background Worker only (4.8, 4.10); read-only for this application |
| `platform_audit_log/{id}` | Append-only record of every platform-operator action named in this spec | Privileged server only, on every audited action |
| `feature_flags/{flagId}` | Feature rollout pacing/kill-switch, never an authorization gate | Privileged server only, Developer or SuperAdmin |
| `platform_worker_state/{jobType}` | Background Worker's own idempotency/watermark state (already defined by Architecture 4.8.1) — this app is its first real consumer | Background Worker only; read-only for System Health (9.11) |

No existing tenant-scoped collection (`businesses/*` and its
subcollections) changes shape because of this spec — the one addition
this spec's Businesses screen (9.3) implies against an existing
document is the `status: 'closed'` flag on `businesses/{businessId}`,
which Architecture 7.9 already specified as a *future extension*
independent of this spec.

## API/Backend Impacts

*Design only. All routes below are `/api/superadmin/*` additions to the
existing privileged server (Architecture 4.4), generalizing the pattern
already proven by `server/index.ts`'s four `/api/staff/*` routes (spec
#16). None exist yet.*

- `POST /api/superadmin/business/suspend` — SuperAdmin only (9.3, 4.4).
- `POST /api/superadmin/business/reactivate` — SuperAdmin only (9.3).
- `POST /api/superadmin/business/close` — SuperAdmin only (9.3, 7.9 path 1).
- `POST /api/superadmin/business/purge` — SuperAdmin only, requires a
  logged legal-basis justification before acting (9.3, 7.9 path 2).
- `POST /api/superadmin/support-session/request` — Support, Developer,
  or SuperAdmin (9.7).
- `POST /api/superadmin/impersonation/request` — Support, Developer, or
  SuperAdmin (9.10).
- `POST /api/superadmin/subscription/override` — SuperAdmin only (9.4).
- `POST /api/superadmin/flags/create`, `POST /api/superadmin/flags/update`
  — Developer or SuperAdmin (9.5).
- `POST /api/superadmin/operators/invite`, `POST
  /api/superadmin/operators/revoke` — SuperAdmin only (9.12).
- `POST /api/billing/webhook` — already named at the system level by
  Architecture 4.12; this spec does not add to it beyond what 4.12
  already specifies (signature verification, `subscriptions/{id}`
  update).

Every route above re-verifies the caller's `platform_operators/{uid}.platformRole`
server-side on every call — the specific mechanism named repeatedly in
Business Rules and Security Requirements, above, restated here as a
concrete implication for whoever builds it.

## Firestore Rules Impacts

*Design only — no rule is written or modified by this spec.* Phase 2
implementation will need, at minimum:

- Read/write rules for `platform_operators/{uid}` restricting all writes
  to the privileged server (no client write path at all — provisioning
  is server-only per 7.4/9.12).
- Read rules for `platform_aggregates/{period}` scoped to
  `platform_operators` with `platformRole` in the set each screen's
  permission matrix (9.13) allows — never a client-writable collection.
- Append-only rules for `platform_audit_log/{id}` (`allow update: if
  false`), the identical pattern already proven correct for the tenant
  Timeline (Architecture 7.2/8.10, spec #13) and named explicitly as the
  template to reuse in 9.6.
- Read rules for `subscriptions/{id}` scoped per 9.4's permission table
  (SuperAdmin write, Developer read-only, Support no access), plus the
  business's own Admin's existing read-your-own-subscription path
  (Permission Matrix 6.8).
- Read/write rules for `feature_flags/{flagId}`: Developer/SuperAdmin
  write via privileged server only; a small, cached, read-only fetch
  path for the tenant SPA (never a Security Rules authorization gate,
  per 9.5's business rule).
- A `status == 'closed'` check added to every existing
  `businesses/{businessId}` subcollection rule that currently allows
  tenant writes, denying new writes to a closed business while
  preserving read access for its own Admin (Architecture 7.9 path 1).
- A suspension-flag check generalizing the existing staff-level
  `isSuspended()` pattern (Architecture 4.6, spec #16) to the business
  level.

Whoever implements Phase 2 must verify every rule above in the
rules-emulator before shipping, per the Security Requirements section's
restatement of the still-open gap `HANDOFF.md` already flags for Module
#16.

## KPIs

*Architecture does not define KPIs for this domain specifically —
listed here are the outcome-level signals the Business Problem section
implies:*
- Every cross-tenant Dashboard/Analytics figure traces to a
  `platform_aggregates` document — zero instances of a raw
  `businesses/*` scan anywhere in this application's code, verified by
  code review at implementation time.
- Time from "support call begins" to "Support Session active and
  business data visible" is under three interactions from the search
  bar, per the same UX bar spec #17 set for `ShopSwitcher`.
- Every platform-operator write action this spec names produces exactly
  one corresponding `platform_audit_log` entry — zero writes with no
  audit trail, verified against the Audit Logs screen itself.
- Zero unaudited impersonation or Support Session issuances — every
  active session is visible on the Audit Logs screen at the moment it
  is active, not only after the fact.

## Future Enhancements

- **Concrete Audit Log/`platform_operators` scaling thresholds** —
  Architecture 11 (Scalability Strategy) names this as its own job once
  real volume exists; not resolved by this spec.
- **Formal, testable controls for the Support Session/impersonation
  time-boxes and the internal-account safeguard** — Architecture 12
  (Security Architecture) names this as its own job.
- **`businessCode` search integration with the tenant Dashboard's
  display** (Architecture 8.14's forward note) — the tenant-side half
  already exists per spec #17's citation; this spec's search bar (9.3)
  is the consuming half, to be built together at Phase 2
  implementation time.
- **Payment processor selection** (Architecture 4.12) — a Module #19
  decision this spec deliberately does not make.

## Out of Scope

- Any implementation: code, Firestore Rules, database schema, or
  deployment of any kind. This spec is a design contract only.
- Resolving the `HANDOFF.md` build-order discrepancy flagged above —
  that is a PM sequencing decision, not something this spec can settle.
- The tenant-facing Notification feed (Module #20) and the
  Subscriptions domain's own tenant-facing entitlement checks (Module
  #19) — this spec covers only SuperAdmin's platform-side view into
  those domains, not their own BDS, which belong to their own future
  spec numbers.
- AI feature design (Module #15/Architecture Section 10) beyond noting
  Feature Flags (9.5) as its rollout mechanism.
- Analytics as an independent tenant-facing module — already resolved
  as not existing, per `docs/specs/README.md`'s Module #14 note; its
  content is Platform Analytics (9.8), covered above.
- Specific legal bases that trigger the purge flow (7.9's own explicit
  non-responsibility) — a product/legal decision, not an engineering
  one, and not this spec's to invent.
- A data-export format for a closing business (7.9's own explicit
  non-responsibility).

## Acceptance Criteria

*These become verifiable only once Phase 2 implementation exists; they
are recorded now so implementation has a fixed target rather than a
target re-negotiated after the fact.*

- [ ] The SuperAdmin application is a physically separate build/deploy
      from the tenant SPA, with zero SuperAdmin-related identifiers
      present in the tenant SPA's shipped bundle — verified by bundle
      inspection.
- [ ] No screen this spec names is rendered for a role Architecture
      9.1/9.13's matrix excludes — verified per-role, not merely
      disabled-but-present.
- [ ] Every cross-tenant figure on the Dashboard and Analytics screens
      traces to a `platform_aggregates/{period}` document — zero direct
      `businesses/*` scans anywhere in this application, verified by
      code review.
- [ ] A Support Session is read-only, single-`businessId`-scoped,
      expires at 60 minutes without renewal, and both its issuance and
      expiry appear in the Audit Log — verified end-to-end.
- [ ] An impersonation session is write-scoped to exactly the
      impersonated Admin's own permissions, expires at 30 minutes, shows
      a persistent banner to that Admin in the tenant SPA for its full
      duration, and both issuance and expiry appear in the Audit Log.
- [ ] A business suspension takes effect at the Security Rules layer
      immediately — verified by attempting a write from that business's
      own session immediately after suspension, with no token-refresh
      delay.
- [ ] A subscription override cannot be written without a corresponding
      Audit Log entry in the same transaction — verified by a
      rules/server test that a partial write (override with no log, or
      vice versa) is impossible.
- [ ] A feature flag change never gates a billing or suspension action
      by itself — verified by code review that no privileged-action
      code path checks a `feature_flags` document as its sole
      authorization condition.
- [ ] `platform_operators/{uid}` has no client-reachable write path —
      verified against `firestore.rules` directly.
- [ ] A SuperAdmin cannot revoke their own account if doing so would
      leave zero active SuperAdmin accounts — verified server-side, not
      only in the UI.
- [ ] Every route under `/api/superadmin/*` re-verifies the caller's
      `platform_operators/{uid}.platformRole` server-side on every call,
      independent of any client-supplied role claim — verified by a
      test that forges a client-side role and confirms the server
      rejects it.
- [ ] All Firestore Rules changes this module requires are verified in
      the rules-emulator before merge, closing the same gap flagged as
      outstanding for Module #16.

---

**Awaiting approval.** Per process, implementation does not begin until
this spec is explicitly approved — and, per Architecture 13.2/13.6,
even once approved, implementation additionally waits on Subscriptions
(Module #19) and Notifications (Module #20) holding real data before
Phase 2 build work can meaningfully begin on 9.4 and 9.9 specifically.
