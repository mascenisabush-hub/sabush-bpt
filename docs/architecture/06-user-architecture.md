# Section 6 — User Architecture

**Status:** ✅ Approved (amended — see 6.5 Support Session, and 7.4/7.5 for the platform-operator identity fix)
**Depends on:** Section 1 (Product Vision) — approved · Section 2 (Core Product Principles) — approved · Section 3 (Domain Architecture) — approved · Section 4 (System Architecture) — approved · Section 5 (Business Lifecycle) — approved
**Purpose:** Define every user type in Sabush BPT — Admin, Manager, Staff, Support, Developer, SuperAdmin — their responsibilities, permissions, relationships, and how the model extends without rework, building on the Auth/session model already fixed in Section 4.6 and the role-gated actions already scattered through the codebase.

---

## 6.1 Current State, Named Honestly

The audit-confirmed implementation today has exactly **two** roles: `UserRole = 'owner' | 'staff'`, stored on a `users/{uid}` profile document. There is no `Manager` role, no per-staff permission granularity, no `Support` or `Developer` role, and no `SuperAdmin` role — every staff member has identical capabilities, and role-gating throughout the SPA is a binary `isOwner` / `isStaff` check repeated across roughly twenty call sites (Header, NavigationTabs, StocksView, SettingsModal, ShopSwitcher, AddStockView).

**Naming note:** from this section onward, this document series refers to that role as **Admin** rather than Owner (a terminology decision, applied retroactively to Sections 1, 3, and 5 as well). The underlying code today still uses the literal value `'owner'` (in `UserRole`, `role: 'owner'`, and function names like `isOwnerOf`/`ownedBusinessIds` in `firestore.rules` and `AppContext`) — renaming those identifiers is an implementation task for Section 13 (Development Strategy), not something this document changes by itself. Until that renaming lands in code, "Admin" in this document and `'owner'` in the codebase refer to the exact same role.

This section does not pretend a richer permission model already exists. It defines the **target** user architecture the Mission's scale requires (Manager tier, platform-operator roles, SuperAdmin), and — just as importantly — specifies how to get from today's binary model to that target **without breaking any existing Admin or staff account**, per Principle 2.5 (Scalable by Default) and 2.12 (Build for the Next Order of Magnitude).

---

## 6.2 Role: Admin

**Responsibilities:** Full control of one or more Businesses (up to the 10-shop cap, Section 3.2/5.9). Creates and manages Staff, records every domain action, performs Closings, manages the business's own Subscription (3.13), and is the only tenant-side role that can add a shop (Business Growth, 5.9).

**Permissions:** Full read/write across every domain scoped to their own `businessId`/`businessIds` — Products, Stock, Financial (Expenses/Withdrawals), Stock Counts, Closings, Timeline (read), Staff management, Subscription/billing (read + initiate change), Notification preferences.

**Relationships:** One admin may own multiple Businesses (3.2). An admin is never a member of another admin's business. An admin's Subscription (4.12) attaches to them, and gates their own Business Growth actions.

**Kept as-is:** The existing pattern of deriving an admin's shop list from `businessIds` (with `businessId` as the always-present legacy fallback for pre-multi-shop accounts) is correct and must remain the source of truth Security Rules check directly — Section 4.5 already fixed this as the general pattern.

---

## 6.3 Role: Manager — New, a Staff Tier, Not a New Firebase Role

**The problem this solves:** Today, every staff member (a shop assistant recording a single Stock Entry) has exactly the same capability as a trusted deputy who should be able to perform a Closing or manage other staff on the admin's behalf. As multi-staff, multi-shop businesses grow (Mission's scale target), this binary model under-serves any business with more than one tier of trusted employee.

**Design decision:** Manager is **not** a third value on `UserRole` (that would require rewriting every `role === 'staff'` check across the codebase and every Security Rule derived from it — a needless, high-risk change per Principle 2.6). Instead, it is a **permission-tier field added to the existing staff record** (`StaffMember` / the staff's `users/{uid}` profile): e.g., `staffTier: 'staff' | 'manager'`, optional and defaulting to `'staff'` for every existing account, so no existing staff member's access changes on migration.

**Responsibilities beyond base Staff:** Can perform a Periodic Closing (5.8) on the admin's behalf; can view (not necessarily change) the business's Subscription state; can be granted the ability to add/suspend *other* Staff (never other Managers, and never able to touch the Admin account) — this last capability should itself be a documented, admin-toggleable permission, not an automatic Manager privilege, since not every business wants to delegate staff management even to a trusted Manager.

**Relationships:** A Manager is still, structurally, a `staff`-role account for every existing Security Rule and Auth pattern — it inherits everything Section 6.4 (Staff) already has, plus the additions above. This is what makes the tier additive rather than a parallel system.

**Security Rules mechanism — Amendment:** Being additive at the `UserRole` level does not make Manager free at the Security Rules level. Collections this tier needs to unlock — `closings`, `withdrawals`, `staff` — are gated today by `isOwnerOf(businessId)` alone; an admin-only check with no notion of a delegated staff member. Granting Manager access to these requires a genuinely new rule function, not a reinterpretation of the existing one: something in the shape of `isOwnerOrGrantedManager(businessId, permission)`, which reads the caller's `users/{uid}` document (7.3) and passes only if either `isOwnerOf(businessId)` is true, or `staffTier == 'manager' AND businessId == <caller's businessId> AND managerPermissions[permission] == true`. The per-permission map (`managerPermissions: { closings: bool, staffManagement: bool }`) is what makes "if granted" (6.3, 6.8) a real, checkable field rather than a documented intention — Section 7.3 fixes exactly where this field lives.

**Worth-First scope test:** Passes — Manager exists to let a growing business (Section 5.9's Business Growth) delegate Worth-relevant operational work (Closings, Stock oversight) without diluting the admin-only actions (Business Growth itself, Subscription changes) that carry real financial/commercial consequence.

---

## 6.4 Role: Staff

**Responsibilities:** Day-to-day operational recording — Stock Entry, Products catalog updates, viewing Reports/Dashboard for their own business — exactly as today.

**Permissions:** Read/write scoped to exactly one `businessId` (staff never have multi-shop access, per the existing `businessId`-only profile shape). No access to Closings (unless granted Manager tier, 6.3), no access to Subscription/billing, no access to other Staff's accounts.

**Relationships:** Belongs to exactly one Business. Authenticated via full Firebase Auth login or the PIN-based quick-login on a shared device (Section 4.6) — the PIN flow is a convenience layer over the same underlying Auth session, not a separate, weaker identity system.

**Kept as-is:** The existing `suspended` flag — settable only by the privileged server (4.4), never the client, and enforced immediately at the Security Rules layer (4.6) rather than waiting for token expiry — is the correct mechanism and needs no change for this tier.

---

## 6.5 Role: Support — New, Platform-Level

**Responsibilities:** Sabush company employees who assist admins directly — investigating a reported issue, viewing (never editing) a business's data for troubleshooting, initiating a time-boxed impersonation session (Section 4.6) when an admin explicitly needs hands-on help.

**Permissions — Amendment, closing a gap the self-audit found:** The aggregation layer (4.10) contains only already-anonymized, cross-tenant figures — it structurally cannot serve "look at this one business's raw records," which is what troubleshooting actually requires. Support's read access is therefore **not** the aggregation layer. It is a third, distinct access pattern, separate from both 4.10 (anonymized/aggregate) and impersonation (4.6, full session-as-admin):

**Support Session** — a server-issued (privileged server, 4.4), time-boxed, single-`businessId`-scoped, **read-only** credential. Requesting one requires stating which business and (for the audit trail) why; the privileged server verifies the requester actually holds Support/Developer/SuperAdmin standing (7.4) before issuing it, exactly as it re-verifies any privileged action (Principle 2.9). While active, it grants read access to that one business's raw collections (7.2) — and only that one — through the SuperAdmin app; it grants no write access at all, which is what distinguishes it from impersonation (4.6, which is a full read/write session acting *as* the admin). Every Support Session's issuance, scope, and expiry is logged to the platform Audit Log (3.14), the same as impersonation. Full session-token mechanics remain Section 9's job; this section fixes that it exists as its own access pattern with its own shape, so Section 9 isn't left to invent the concept from scratch.

**Relationships:** Exists only inside the SuperAdmin app (4.13), never the tenant SPA. Reports to / is a subset of the SuperAdmin role for permission purposes (6.7) — Support is the most restricted tier of platform-operator access, not a separate system.

**Worth-First scope test:** Passes as an operational-support role, same justification Section 3.14 already gives SuperAdmin generally — it exists to run the platform responsibly, not to add a tenant-facing feature.

---

## 6.6 Role: Developer — New, Platform-Level

**Responsibilities:** Sabush engineers who need deeper platform visibility than Support (feature flag changes, viewing platform-level Audit Logs and Analytics aggregates, diagnosing system health) but who — critically — **do not need, and must not default to having, standing raw access to tenant financial data** any more than Support does.

**Permissions:** Everything Support has, plus: feature flag management (3.14), platform health/monitoring visibility, read access to the shared aggregation layer's full detail (4.10) rather than only the SuperAdmin-dashboard-level rollups Support sees. Still bound by the same Principle 2.8 boundary — a Developer debugging a production issue for one specific business goes through the same audited, logged access path Support does (an explicit "support session" against that one business, logged), not an unaudited direct database console habit.

**Relationships:** A superset of Support's permissions; a subset of SuperAdmin's (6.7). Exists only in the SuperAdmin app.

**Why this role exists separately from SuperAdmin rather than folded in:** Not every engineer who needs to ship a feature flag change should also hold billing-override or business-suspension authority. Separating Developer from full SuperAdmin is a direct application of least-privilege, which is the practical implementation of Principle 2.3 (Security First) applied to Sabush's own internal team, not just to tenants.

---

## 6.7 Role: SuperAdmin (Full)

**Responsibilities:** Full platform-operator authority as scoped in Section 3.14 — tenant suspension/reactivation, subscription/billing operations, feature flags, platform-level audit log access, platform analytics, and impersonation — all through the separate SuperAdmin app fixed in Section 4.13.

**Permissions:** Everything Developer (6.6) has, plus the privileged, server-verified actions that carry real commercial or account-level consequence: suspending a Business (not just a single staff member — the existing `/api/staff/suspend` pattern generalized per Section 4.4 to `/api/superadmin/*`), changing a Subscription's plan/status directly (bypassing the normal payment-processor webhook path, for support/billing-dispute resolution), and granting/revoking Support or Developer access to other internal accounts.

**Relationships:** The top of the platform-operator hierarchy (Support ⊂ Developer ⊂ SuperAdmin, in permission terms — each tier's actions are a superset of the one below). Every SuperAdmin action that matches the shape Section 2.9 requires (server-verified, re-checked against real data) is logged to the platform Audit Log (3.14), distinct from the per-business Timeline (3.10).

**Worth-First scope test:** Passes per Section 3.14 — this role doesn't add a tenant-facing feature; it's the authority required to run the platform responsibly at the Mission's stated scale.

---

## 6.8 Permission Matrix (Summary)

| Domain / Action | Admin | Manager | Staff | Support | Developer | SuperAdmin |
|---|---|---|---|---|---|---|
| Stock Entry, Products, Reports (own business) | ✅ | ✅ | ✅ | Read-only, audited | Read-only, audited | Read-only, audited |
| Periodic Closing | ✅ | ✅ (if granted) | ❌ | ❌ | ❌ | ❌ (operates via support session, not directly) |
| Add/suspend Staff | ✅ | ✅ (if granted) | ❌ | ❌ | ❌ | ❌ (business-scoped action, not a platform one) |
| Business Growth (add shop) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Own Subscription — view | ✅ | ✅ (view only) | ❌ | Via support session | Via support session | ✅ |
| Own Subscription — change plan | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (support/dispute path only) |
| Impersonate an admin | ❌ | ❌ | ❌ | ✅ (time-boxed, logged) | ✅ (time-boxed, logged) | ✅ (time-boxed, logged) |
| Suspend/reactivate a Business | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Feature flags | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Platform Audit Log | ❌ | ❌ | ❌ | Partial (own actions) | ✅ | ✅ |
| Platform Analytics (aggregate) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

Every ✅ in the Support/Developer/SuperAdmin columns for tenant data is an **audited, aggregation-or-session-bounded** access, never a direct raw read — the recurring distinction Sections 4.10 and 4.6 already established and this matrix does not weaken.

---

## 6.9 Future Extensibility

The Manager-as-tier pattern (6.3) is the template for any future role refinement: **add an optional, defaulted field to an existing role rather than introducing a new `UserRole` value**, whenever the new capability is a subset/superset relationship with an existing role (an Accountant read-only tier under Admin, for instance, would follow the same pattern). A genuinely new *category* of user — one that doesn't fit as a tier under Admin/Staff or Support/Developer/SuperAdmin — is the only case that would justify a new top-level `UserRole`, and any such addition must be checked against every Security Rule function (`isMemberOf`, `isOwnerOf`, and their future equivalents) rather than assumed to slot in for free.

---

## What Sections 7–15 Will Build On This

- **Section 7 (Data Architecture)** will turn the Manager permission-tier field and the Support/Developer/SuperAdmin platform-level access model into concrete schema and Security Rule design.
- **Section 9 (SuperAdmin Architecture)** will fully specify the impersonation session mechanics, the internal Support/Developer/SuperAdmin account-management flow, and the exact Audit Log schema referenced here.
- **Section 12 (Security Architecture)** will formalize the least-privilege boundary between Support, Developer, and SuperAdmin (6.5–6.7) into explicit controls.
- **Section 13 (Development Strategy)** will sequence the Manager-tier migration (additive, non-breaking per 6.3) relative to other implementation priorities.

**This section requires your explicit approval before Section 7 (Data Architecture) begins.**
