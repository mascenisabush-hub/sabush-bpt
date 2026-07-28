# Section 9 — SuperAdmin Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–8 — all approved
**Purpose:** Fully design the platform management layer Section 4.13 placed (a separate application) and Section 6 assigned roles to (Support, Developer, SuperAdmin) — Dashboard, Businesses, Subscriptions, Billing, Feature Flags, Audit Logs, Support, Platform Analytics, Notifications, Tenant Management, Impersonation, System Health. Architecture only — screens and data shape, not implementation.

Every design decision here resolves a question Sections 4, 6, or 7 explicitly deferred to this section. Where one of those sections already fixed the shape, Section 9 states the shape and completes it — it does not re-decide it.

---

## 9.1 Application Shell

**What Section 4.13 already fixed:** a physically separate application (separate build, separate deployment), sharing the same Firebase project and the same privileged server's `/api/superadmin/*` routes, never bundled into the tenant SPA — because SuperAdmin-capable code must never ship to a tenant's browser, gated or not.

**What Section 9 adds:** the shell's own navigation, scoped to exactly the permission tiers Section 6.8's matrix already defines:

| Screen | Support | Developer | SuperAdmin |
|---|---|---|---|
| Platform Dashboard (9.2) | ✅ | ✅ | ✅ |
| Businesses / Tenant Management (9.3) | Read-only, Support Session only | Read-only, Support Session only | Full |
| Subscriptions & Billing (9.4) | ❌ | Read-only | Full |
| Feature Flags (9.5) | ❌ | Full | Full |
| Audit Logs (9.6) | Partial (own actions) | Full | Full |
| Support (9.7 — Support Session management) | Can initiate | Can initiate | Can initiate |
| Platform Analytics (9.8) | ❌ | Full | Full |
| Notifications (9.9, platform-side) | ❌ | Full | Full |
| Impersonation (9.10) | Can initiate | Can initiate | Can initiate |
| System Health (9.11) | ❌ | Full | Full |
| Internal account management (9.12) | ❌ | ❌ | Full |

A screen a role cannot see is not rendered, not merely disabled — the shell reads `platform_operators/{uid}.platformRole` (7.4) once at load and builds the nav from it, consistent with 4.13's "SuperAdmin code is simply never present" principle applied one level down, inside the app itself.

---

## 9.2 Platform Dashboard

**Purpose:** The at-a-glance view every platform-operator role sees first — total active businesses, active subscriptions, platform health status, recent Audit Log entries.

**Data source:** `platform_aggregates/{period}` (7.4, 4.10) exclusively for any cross-tenant figure — never a live scan of `businesses/*`, per the aggregation-layer boundary Section 4.10 already fixed. System Health status (9.11) and the most recent N Audit Log entries (9.6) are the only two widgets that read from anywhere else, since neither is a cross-tenant financial aggregate.

**Business rule:** Every number on this dashboard must be traceable to a specific `platform_aggregates/{period}` document — a dashboard figure with no aggregate-layer source would be exactly the "raw cross-tenant read" Principle 2.8 forbids, dressed up as a summary card.

---

## 9.3 Businesses / Tenant Management

**Purpose:** Lets SuperAdmin (full) look up, suspend/reactivate, and manage any individual business; lets Support/Developer look up one business's raw data only through a Support Session (6.5).

**Full (SuperAdmin) capabilities:**
- **Search bar, front and center on this screen:** a single input a Support/Developer/SuperAdmin can type into, matching in this priority order: (1) exact `businessCode` (7.2's amendment — e.g. `SAB-000042`, the fast path for a support call where the caller reads their code off their own Settings screen), (2) Admin's registered email, (3) business name (fuzzy/prefix match, since names collide and this is a browse-to-narrow path, not a guaranteed single result). A `businessCode` match returns exactly one result and can jump straight to that business's detail view; the other two return a list. This is the one lookup path every platform-operator role (Support included) can use — it reads only `platform_aggregates`-derived list data (9.2's rule) for the results list itself; opening a specific business's *detail* view is what requires the Support Session (below).
- The business's own Settings screen (8.12, Business Profile) displays its `businessCode` prominently once assigned, precisely so an Admin can read it to a support agent without needing to know their Firestore ID exists at all.

- **The single-business detail view is the one place in this entire app a platform operator reads one business's actual raw data** — and it is reached exactly the same way for a SuperAdmin as for a Support/Developer Support Session (6.5): a server-issued, time-boxed, audited grant, logged to the platform Audit Log (9.6) at issuance and expiry. SuperAdmin's "full" tier does not mean an unaudited backdoor — it means SuperAdmin can issue itself a session without another SuperAdmin's approval, not that it skips the session/audit mechanism entirely. This closes the same gap Section 6.5's amendment fixed for Support, applied consistently to every tier rather than only the lowest one.
- Suspend/reactivate a Business — via `/api/superadmin/business/suspend` (4.4's pattern, generalized per 4.4), which sets a Security-Rules-enforced flag denying that business's own Admin/Staff further writes immediately (4.6's "takes effect at the Security Rules layer, not next token refresh" pattern, applied at the business level rather than the staff level).
- Trigger the closure/purge flow (7.9) — soft-close (`status: 'closed'`) is a SuperAdmin action from this screen; the legal-deletion purge (7.9's second path) requires the same screen but is deliberately a separate, harder-to-reach confirmation flow, given its irreversibility.

**Support/Developer capabilities:** Request and hold a Support Session (6.5) against one business at a time; view that business's raw data read-only for the session's duration; no suspend/reactivate/purge action is reachable from this screen for these tiers, full stop — those buttons are not rendered, not merely disabled (9.1's rule).

**Business rule:** Every write this screen can trigger against a specific business (`suspend`, `reactivate`, `close`, `purge`) goes through the privileged server (4.4) and re-verifies the caller's `platform_operators/{uid}` role server-side — never trusts the client's rendered UI state as authorization, per Principle 2.9 applied to internal tooling exactly as strictly as to tenant-facing actions.

---

## 9.4 Subscriptions & Billing

**Purpose:** View and, for SuperAdmin, override a business's Subscription state (3.13) — the support/dispute-resolution path Section 6.7 already named.

**Data source:** `subscriptions/{id}` (7.4) directly — this is a platform-scoped collection Support/Developer/SuperAdmin are permitted to read without a Support Session, since it holds commercial/billing state, not a tenant's operational financial data (the distinction 7.4 already draws in its "Write path" column).

**SuperAdmin-only actions:** Change a subscription's plan/status directly, bypassing the normal payment-processor webhook path (4.12) — used only for support/billing-dispute resolution, per 6.7's original scope. Every such override writes a `subscriptions/{id}` change **and** a platform Audit Log entry (9.6) in the same server-side transaction — an override with no corresponding audit entry must be structurally impossible, not just discouraged.

**Developer (read-only):** Can view subscription state and billing-webhook delivery history (useful for diagnosing "why didn't this renewal apply") but cannot change plan/status — consistent with 6.6's least-privilege boundary (a Developer debugging a billing issue does not need billing-override authority to do so).

**Section 9's resolution of 7.4's open item:** Section 7.4 left Subscription's exact keying (owner `uid` vs. `businessId`) open. Section 9 resolves it: **keyed by `businessId`**, not `uid` — because every feature-gating check this collection feeds (3.13, "can this Admin add an 11th shop") is itself business-scoped, and an Admin who owns multiple Businesses (6.2) may reasonably want independent subscription states per shop rather than one plan covering all of them. An Admin-level "family plan" spanning several `businessId`s, if ever needed, is representable later as a `subscriptions` document with a `coveredBusinessIds[]` field — an additive change, not a rework of this keying decision (Principle 2.12).

---

## 9.5 Feature Flags

**Purpose:** Lets Developer/SuperAdmin roll out a feature (e.g., an AI insight card, 8.9's future extension) to a subset of businesses before a full release, or kill-switch a feature platform-wide without a redeploy.

**Data shape:** A new top-level collection, `feature_flags/{flagId}` — `{ enabled: boolean, rolloutPercentage?: number, enabledBusinessIds?: string[] }`. Read by the tenant SPA (4.3) as a small, cached, read-only fetch on load — never gating a Security Rule itself (a flag controls UI visibility/behavior, it must never become the thing standing between a client and unauthorized data access, which is what Security Rules are for, per 4.5).

**Write path:** Privileged server only (`/api/superadmin/flags/*`), Developer or SuperAdmin, logged to the platform Audit Log (9.6) on every change — a flag flip is exactly the kind of platform-operator action 6.6/6.7 already require to be audited.

**Business rule:** A feature flag must never be the sole gate on a genuinely privileged action (billing, tenant suspension) — those are already gated by role and Security Rules; flags are for feature rollout pacing, not authorization. Conflating the two would let a flag misconfiguration become a security hole, which is exactly the kind of "convenience over integrity" Principle 2.4 exists to prevent, applied here to authorization rather than financial data.

---

## 9.6 Audit Logs

**Purpose:** The permanent, append-only record of every platform-operator action — distinct from the per-business Timeline (8.10), which records tenant actions.

**Data source:** `platform_audit_log/{id}` (7.4) — append-only (`allow update: if false`, the identical pattern 7.2/8.10 already proved correct for the tenant Timeline), written by the privileged server on every action this section has named as audited: Support Session issuance/expiry (6.5, 9.3), impersonation issuance/expiry (4.6, 9.10), business suspend/reactivate/close/purge (9.3), subscription override (9.4), feature flag change (9.5).

**Schema (resolving Section 7.4's deferred item):**

| Field | Purpose |
|---|---|
| `actorUid` | The `platform_operators/{uid}` who performed the action |
| `actorRole` | `platformRole` at time of action (a later role change must not retroactively alter historical log meaning) |
| `actionType` | e.g. `support_session.issued`, `business.suspended`, `subscription.overridden`, `flag.changed` |
| `targetBusinessId` / `targetUid` | What the action affected, when applicable |
| `justification` | Free-text reason, required for Support Session/impersonation issuance and for the legal-deletion purge (7.9) |
| `timestamp` | Server timestamp, not client-supplied |

**View permissions:** Support sees only entries where `actorUid` is their own (6.8's "partial" tier); Developer and SuperAdmin see the full log. Filterable by business, actor, and action type — a support/legal inquiry ("who looked at this business's data, and when") must be answerable from this screen without a database console.

---

## 9.7 Support (Support Session Management)

**Purpose:** The operational surface for the Support Session mechanism Section 6.5 defined — where a Support/Developer/SuperAdmin actually requests and monitors one.

**Flow:**
1. Operator finds the business via the search bar (9.3, fastest path: `businessCode`) and enters a justification (required — 9.6's schema).
2. Request goes to the privileged server (`/api/superadmin/support-session/request`), which re-verifies the caller's `platform_operators/{uid}` role (Principle 2.9) and issues a short-lived, read-only, single-`businessId`-scoped credential (6.5's shape).
3. **Time-box:** 60 minutes, non-renewable without a fresh request (forces a fresh justification for continued access rather than an indefinite session quietly persisting) — a concrete number Section 6.5 deliberately left to Section 9.
4. Session issuance and expiry are both written to the platform Audit Log (9.6) — expiry is logged even though nothing "happens," because "access ended at time X" is itself part of the auditable record.
5. While active, the SuperAdmin app's tenant-detail view (9.3) reads that one business's raw collections directly, scoped by the session credential — this is the one sanctioned exception to "platform operators never read raw tenant data directly," and it is sanctioned only because it is time-boxed, single-tenant, read-only, and logged.

**Business rule:** A Support Session cannot be escalated to a write or to impersonation from within the same credential — obtaining write access requires a separate, explicitly logged impersonation request (9.10), never an implicit upgrade. Keeping these as two distinct credential types is what makes "who could have changed this business's data" a much smaller, auditable set than "who could have looked at it."

---

## 9.8 Platform Analytics

**Purpose:** Cross-tenant business intelligence for Sabush itself — growth trends, feature adoption, churn signals — distinct from AI's per-business insights (Section 10) and from the Platform Dashboard's (9.2) operational summary.

**Data source:** `platform_aggregates/{period}` exclusively (4.10's boundary, restated) — this screen is a deeper, more filterable view over the same collection the Dashboard (9.2) summarizes, never a separate cross-tenant computation path (Principle 2.6 — one aggregation layer, multiple consumers, as 4.10 already established).

**Permissions:** Developer and SuperAdmin only (6.8) — Support has no need for platform-wide trend data to do its job, per least-privilege (6.6).

**Business rule:** Any new analytics view this screen ever wants to add must be satisfiable from `platform_aggregates` as it stands, or from a *new field* the Background Worker's aggregation rollup (4.8, 4.10) is extended to compute — never from a bespoke direct query against tenant collections, which would silently reopen the tenant-isolation boundary this document series has repeatedly closed.

---

## 9.9 Notifications (Platform-Side)

**Purpose:** Distinct from the tenant-facing Notification feed (3.12, 4.9, 8.13's `NotificationContext`) — this is where Developer/SuperAdmin configure platform-level notification rules (e.g., "alert the on-call Developer if the Background Worker's aggregation job fails") and view delivery health for tenant-facing notifications in aggregate.

**Data source:** Reads `notifications` (7.4) in aggregate (counts/delivery-failure-rates, via `platform_aggregates`, never per-notification content — a platform operator has no operational reason to read the content of an individual tenant's notification feed, and doing so would be exactly the raw-tenant-read Principle 2.8 forbids for a use case that doesn't need it).

**Business rule:** Platform-level alerting (worker failures, delivery-rate anomalies) is itself delivered through the same `notifications` collection and delivery fan-out (4.9) already built — recipient is a `platform_operators/{uid}` rather than a tenant `uid`, but the mechanism is not duplicated for the platform-operator case (Principle 2.6).

---

## 9.10 Impersonation

**Purpose:** A full, read/write session acting *as* a specific Admin — used only when hands-on help requires actually performing an action on the Admin's behalf, not merely observing (which is what a Support Session, 9.7, is for).

**What Section 4.6 already fixed:** server-issued, time-boxed, logged — never a raw Firebase Auth identity swap.

**Section 9's completion of the design:**
- **Who can initiate:** Support, Developer, or SuperAdmin (6.8) — any tier, since the audit requirement (logging) is what makes it safe, not restricting it to the top tier alone.
- **Consent:** requires the Admin to have explicitly requested help (matching 6.5's "when an admin explicitly needs hands-on help" framing) — the request flow captures a reference to that request (a support ticket ID, or a simple in-app "I need help" flag the Admin sets) as part of the impersonation record, so an impersonation session issued with no corresponding Admin-initiated request is itself a visible anomaly in the Audit Log (9.6), not something that can happen silently.
- **Time-box:** 30 minutes, shorter than a Support Session (9.7), since impersonation carries write authority — the operator can request a fresh session if more time is genuinely needed, each request independently logged.
- **Scope:** exactly the Admin's own permissions (6.2) — impersonation never grants the operator's own platform-level authority *plus* the Admin's tenant authority simultaneously; while impersonating, the session is scoped down to what the Admin themself could do, nothing more.
- **Visibility to the Admin:** the tenant SPA (4.3) shows a persistent, unmissable banner during any active impersonation session against that Admin's account — an Admin must never be unaware that a platform operator is currently acting as them, which is a Principle 2.3 (Security First) requirement applied to transparency, not just access control.

---

## 9.11 System Health

**Purpose:** Operational visibility into the Background Worker (4.8), the privileged server, and Firestore itself — Developer/SuperAdmin only.

**Data source:** The Background Worker's own `platform_worker_state/{jobType}` documents (4.8.1's idempotency amendment) directly expose `lastRunCompletedAt` per job type — this screen is the first real consumer of that state, closing the loop on why 4.8.1 was designed as a readable document rather than an opaque internal counter. Failed-run signals (a job that didn't complete within its expected window) are computed by comparing `lastRunCompletedAt` against the expected interval — no new tracking mechanism is needed beyond what 4.8.1 already writes.

**Business rule:** This screen must never require a database console or server SSH to answer "is the Background Worker healthy right now" — if a future job type's health can't be answered from `platform_worker_state`, that job's design is incomplete, not this screen's.

---

## 9.12 Internal Account Management

**Purpose:** SuperAdmin-only screen for provisioning/revoking `platform_operators/{uid}` records (7.4) — the write path Section 7.4 already restricted to "provisioned by an existing SuperAdmin," given a concrete UI here.

**Flow:** A SuperAdmin invites a new internal account by email (must correspond to a real Firebase Auth account — self-service signup is never possible for this collection, per 7.4), assigns a `platformRole` (`support | developer | superadmin`), and that assignment is itself logged to the platform Audit Log (9.6) — granting platform authority is exactly the kind of action this document series has treated every other privileged grant as requiring.

**Business rule:** A SuperAdmin can revoke any `platform_operators/{uid}` record, including another SuperAdmin's — but cannot revoke their own if doing so would leave zero active SuperAdmin accounts (a structural safeguard against the platform locking itself out of its own management layer, checked server-side before the write is allowed).

---

## 9.13 Full Screen-to-Data Summary Table

| Screen | Reads | Writes | Roles |
|---|---|---|---|
| Dashboard (9.2) | `platform_aggregates`, `platform_audit_log` (recent) | — | All |
| Businesses (9.3) | `platform_aggregates`, one business's raw data (via session, 9.7) | Suspend/reactivate/close/purge (privileged server) | SuperAdmin full; Support/Developer via session |
| Subscriptions & Billing (9.4) | `subscriptions` | Plan/status override | SuperAdmin write; Developer read |
| Feature Flags (9.5) | `feature_flags` | Flag create/update | Developer, SuperAdmin |
| Audit Logs (9.6) | `platform_audit_log` | — (append-only, system-written) | Support (own), Developer/SuperAdmin (full) |
| Support (9.7) | `platform_operators` (self) | Support Session request | All |
| Platform Analytics (9.8) | `platform_aggregates` | — | Developer, SuperAdmin |
| Notifications, platform-side (9.9) | `notifications` (aggregate), `platform_operators` | Platform-alert rule config | Developer, SuperAdmin |
| Impersonation (9.10) | — | Impersonation session request | All |
| System Health (9.11) | `platform_worker_state` | — | Developer, SuperAdmin |
| Internal Accounts (9.12) | `platform_operators` | Provision/revoke | SuperAdmin only |

---

## What Sections 10–15 Will Build On This

- **Section 10 (AI Architecture)** will use the Feature Flags mechanism (9.5) to stage AI feature rollout, and the same audited-action pattern for any AI-triggered platform-level alert.
- **Section 11 (Scalability Strategy)** will give concrete thresholds for `platform_audit_log` and `platform_operators` query patterns as the platform-operator team itself grows.
- **Section 12 (Security Architecture)** will formalize the Support Session and impersonation time-boxes (9.7, 9.10), the Feature Flag write path (9.5), and the internal-account provisioning safeguard (9.12) into explicit, testable controls.
- **Section 13 (Development Strategy)** sequences building this entire application relative to the tenant-facing features it depends on (Notifications, Subscriptions must exist before 9.4/9.9 have real data to show).

**This section requires your explicit approval before Section 10 (AI Architecture) begins.**
