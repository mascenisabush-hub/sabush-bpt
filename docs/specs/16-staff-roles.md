Business Domain Specification

# Staff & Roles

Version 1.0
**Status:** ✅ Approved
**Module #16 of 20 — Phase 4: Platform**
**Architecture references:** [Section 6.1–6.9](../architecture/06-user-architecture.md)
(full role model — Admin, Manager, Staff, Support, Developer, SuperAdmin;
current two-role state named honestly in 6.1; Manager defined as an
additive staff tier, not a new `UserRole`, in 6.3; Permission Matrix in
6.8; future-extensibility pattern in 6.9), [Section 7.3](../architecture/07-data-architecture.md)
(`staffTier`/`managerPermissions` field placement on `users/{uid}`),
[Section 12](../architecture/12-security-architecture.md) (the
server-controlled-field rule every Security Rule function must satisfy;
immediate-effect requirement for permission/suspension changes)
**Depends on:** [Withdrawals (spec #9)](./09-withdrawals.md) and
[Stock Counts (spec #10)](./10-stock-counts.md), both of which already
flagged the missing Manager tier as an open gap against Architecture
6.3/6.8 — this spec is where that gap gets resolved rather than
re-flagged a third time
**Implementation:** `src/types.ts` (`UserRole`, `UserProfile`,
`StaffMember` — lines 1–46), `src/components/SettingsModal.tsx` (existing
staff management UI: add/suspend/reactivate/delete/reset-PIN, all gated
on `isOwner` only), `src/context/AppContext.tsx` (`addStaffMember`,
`suspendStaffMember`, `reactivateStaffMember`, `deleteStaffMember`,
`resetStaffPin`, `isOwner`/`isStaff` derivation), `server/index.ts`
(`/api/staff/delete`, `/api/staff/suspend`, `/api/staff/reactivate`,
`/api/staff/reset-pin` — all privileged-server writes, all currently
verified via `verifyOwnerActionOnStaff`, an Admin-only check),
`firestore.rules` (`isOwnerOf(businessId)` — the single function gating
`staff`, `closings`, `withdrawals` and every other Admin-only collection
today)

---

## Purpose

**Why does this module exist?**

Every Sabush business today runs on a binary trust model: an Admin
(literally `role: 'owner'` in code, per Architecture 6.1's honest
naming note) and Staff, with no distinction between a shop assistant
recording a single Stock Entry and a trusted deputy who should be able
to close the books or manage other staff on the Admin's behalf. As
businesses grow toward the Mission's stated scale — multiple staff,
multiple shops — this module defines how Sabush represents that growing
trust hierarchy without inventing a parallel permission system or
touching the ~20 existing `isOwner`/`isStaff` call sites that already
work correctly for the two roles that exist today.

This module's scope is **tenant-side** roles only: Admin, Manager,
Staff (Architecture 6.2–6.4). Support, Developer, and SuperAdmin
(6.5–6.7) are platform-operator roles that exist only inside the
SuperAdmin app and are explicitly out of scope here — they belong to
module #18 (SuperAdmin) per the Architecture's own phase table.

## Business Problem

An Admin running more than one shop, or a shop with more than a
handful of staff, cannot delegate anything beyond raw data entry today.
Every Closing, every staff hire, every suspension has to go through the
Admin personally — even for a business that has an obviously trusted
senior employee. This is a real ceiling on Business Growth (Architecture
5.9): a business that needs to add its second or third shop is, by
construction, past the point where the Admin can personally perform
every Closing across every location. Staff & Roles removes that ceiling
by letting an Admin delegate specific, named responsibilities to a
specific staff member — without ever giving up final authority, and
without weakening the security model for the businesses that don't need
this yet (the default, for every existing account, changes nothing).

## Users

- **Admin** — grants and revokes Manager tier and its individual
  permissions; adds, suspends, reactivates, and removes Staff and
  Managers; retains every capability Managers gain, plus the
  Admin-exclusive actions (Business Growth, Subscription changes)
  Managers never receive regardless of what's granted.
- **Manager** — a Staff account with an elevated permission tier
  (Architecture 6.3). Gains the ability to perform a Periodic Closing
  and/or manage other Staff, **only** for whichever of those two
  permissions the Admin has explicitly toggled on. Never gains Business
  Growth or Subscription-change authority, and can never grant, revoke,
  suspend, or remove another Manager or the Admin.
- **Staff** — unchanged from today: day-to-day operational recording,
  scoped to exactly one `businessId`, no access to Closings, Subscription,
  or other staff accounts.

## User Stories

As a Business Admin,
I want to designate one of my staff as a Manager who can perform the
monthly Closing,
so that the business doesn't stall on my personal availability every
month.

As a Business Admin,
I want to choose exactly which responsibilities a Manager has — Closing,
staff management, or both — rather than an all-or-nothing upgrade,
so that I only delegate as much trust as I actually intend to.

As a Manager granted staff-management permission,
I want to add and suspend Staff on the Admin's behalf,
so that day-to-day hiring doesn't require the Admin personally, while
knowing I can never touch the Admin's own account or promote anyone to
Manager myself.

As a Staff member,
I want my day-to-day access to work exactly as it does today after this
change ships,
so that a platform capability I don't use doesn't disrupt work I already
rely on.

As a Business Admin,
I want a permission change (granting or revoking a Manager's Closing or
staff-management access) to take effect immediately,
so that revoking trust from someone doesn't leave a window where their
old access still works.

## Business Rules

**Manager is a tier, not a role**
Manager is **not** a third value of `UserRole` (Architecture 6.3). It is
an optional field on the existing staff account:
`staffTier: 'staff' | 'manager'`, defaulting to `'staff'`. A Manager
account is, structurally, a `role: 'staff'` account for every existing
Auth pattern and every Security Rule not explicitly amended by this
spec — this is what keeps the change additive rather than a rewrite.

**Permissions are individually granted, never bundled**
Reaching Manager tier grants no capability by itself. Each of the two
delegable capabilities — Periodic Closing, Staff management — is its own
boolean on `managerPermissions: { closings: bool, staffManagement: bool }`
(Architecture 7.3), defaulting to `false` for every account, including
every newly-promoted Manager. An Admin must explicitly toggle each one
on; promoting to Manager and granting a permission are two separate,
explicit actions.

**A Manager can never out-permission the Admin, or create another Manager**
A Manager with `staffManagement: true` may add, suspend, reactivate, and
remove Staff — but never promote a Staff member to Manager, never grant
or revoke another account's `managerPermissions`, never suspend or
demote another Manager, and never take any action against the Admin's
own account. Only the Admin can change `staffTier` or
`managerPermissions` for any account.

**Every permission-gated field is server-controlled**
`staffTier`, `managerPermissions`, and `suspended` are writable only by
the privileged server (`server/index.ts`, via Firebase Admin SDK),
never directly by the client — the same pattern already governing
`suspended` today. A rule that let a user influence their own
`managerPermissions` would be a self-granted-permission hole regardless
of how the UI presented it (Architecture 12).

**Permission changes take effect immediately, not at next token refresh**
Revoking `staffManagement` or `closings` from a Manager must deny the
very next write attempt at the Security Rules layer. This mirrors the
existing `suspended` behavior exactly (Architecture 4.6, restated in
Architecture 12) — the same mechanism, extended to two new fields
instead of invented fresh.

**Staff behavior is unchanged**
No existing Staff account's capability set, login flow, or PIN
quick-login behavior (Section 4.6) changes as a result of this module.
`staffTier` absent or `'staff'` on every current account is equivalent
to today's behavior exactly.

**Business Growth and Subscription changes remain Admin-exclusive**
Regardless of any `managerPermissions` granted, adding a shop (Business
Growth, 5.9) and changing a Subscription's plan/status (4.12) are never
delegable to a Manager. This is a hard boundary, not a third toggle.

**Deletion is included in the staffManagement permission — approved decision**
Architecture 6.3 names "add/suspend other Staff" as the delegable
capability without mentioning permanent removal; this spec resolved that
gap by decision rather than assumption: a Manager granted
`staffManagement: true` may also permanently delete a Staff account
(`/api/staff/delete`), on the same terms as add/suspend/reactivate — never
against another Manager, and never against the Admin. `staffManagement`
is therefore a single toggle covering the full add/suspend/reactivate/delete
lifecycle for Staff, not a split permission.

## Functional Requirements

1. Admin-only UI (extending the existing Staff section in
   `SettingsModal.tsx`) to promote a Staff member to Manager, demote a
   Manager back to Staff, and toggle each of `closings` and
   `staffManagement` independently — reusing the existing
   confirmation-modal pattern already used for suspend/delete, not a new
   pattern.
2. A new privileged-server endpoint, e.g. `/api/staff/set-tier`, that
   writes `staffTier` and/or `managerPermissions` on `users/{uid}` and
   mirrors `staffTier` to the `staff/{id}` display record — following
   the exact pattern `/api/staff/suspend` already uses (batch write,
   Timeline event, `verifyOwnerActionOnStaff`-style requester check).
   New Timeline event types: `manager-granted`, `manager-permissions-changed`,
   `manager-revoked`.
3. A new Security Rule function, `isOwnerOrGrantedManager(businessId, permission)`
   (Architecture 6.3's amendment), reading the caller's `users/{uid}`
   document and passing if `isOwnerOf(businessId)` is true, or
   (`staffTier == 'manager' AND businessId == <caller's businessId> AND
   managerPermissions[permission] == true`).
4. `firestore.rules` updated so the `closings` collection allows
   read/create/update/delete under `isOwnerOrGrantedManager(businessId, 'closings')`
   instead of `isOwnerOf(businessId)` alone; the `staff` collection's
   create/update/delete under `isOwnerOrGrantedManager(businessId, 'staffManagement')`
   in full — covering the add/suspend/reactivate/delete lifecycle, per
   the approved Business Rule above.
5. Client-side `isManager`, `canManagerCloseBooks`, and
   `canManagerManageStaff` derived booleans added to `AppContext`
   alongside the existing `isOwner`/`isStaff`, used to gate UI
   (Closing screen access, Staff section visibility for Managers)
   exactly the way `isOwner`/`isStaff` already gate the ~20 existing
   call sites — new checks additive, no existing check rewritten.
6. Existing endpoints a granted Manager should now be able to call
   (`/api/staff/suspend`, `/api/staff/reactivate`, `/api/staff/delete`,
   staff-add flow) have their server-side requester check widened from
   Admin-only to Admin-or-granted-Manager, mirroring the Security Rule
   change — with the existing guard that a Manager can never act on
   another Manager or the Admin preserved in `verifyOwnerActionOnStaff`'s
   widened equivalent.

## Non-functional Requirements

**Performance:** Tier/permission lookups add no additional read — they
ride on the `users/{uid}` document already fetched for every session
(Architecture 7.3); no new round-trip.

**Security:** Every requirement above is a direct application of
Architecture 12's stated control — access is granted only from a
server-controlled field the affected user cannot write themselves.
Revocation must be effective on the very next request, not deferred to
token expiry, matching the existing `suspended` guarantee.

**Accessibility:** New toggles in `SettingsModal.tsx` follow the existing
Design System components already used for the suspend/delete
confirmation modals — no new interaction pattern introduced.

**Offline:** Unaffected — tier/permission changes are server-authored,
same as `suspended` today, and are not something a client needs to
compute or cache offline.

**Mobile:** No new screen; extends the existing Settings modal, which
is already responsive.

## KPIs

- Zero regression: 100% of existing Staff accounts retain identical
  access after migration (staffTier absent/'staff' behaves exactly as
  today).
- A permission revoked by an Admin is denied at the very next write
  attempt in Security Rules — not merely at next login.
- An Admin can grant or revoke a specific Manager permission in under
  three taps from the existing Staff settings section.

## Future Enhancements

- Accountant tier (read-only Reports/Dashboard access for an external
  bookkeeper), following the exact additive-tier pattern this spec
  establishes (Architecture 6.9).
- Per-Manager audit trail of which Closings/staff actions they
  personally performed, surfaced in Business Timeline (spec #13).
- Multi-shop Manager scope (a Manager granted access across more than
  one of an Admin's shops) — out of scope here; today's model scopes a
  Manager to the single `businessId` their staff profile already carries,
  matching current Staff behavior exactly.

## Acceptance Criteria

This module is complete when:

- [ ] `staffTier` and `managerPermissions` exist on `users/{uid}`,
      optional/defaulting exactly as specified, with zero change to any
      existing account's effective access.
- [ ] An Admin can promote a Staff member to Manager and independently
      toggle `closings` and `staffManagement`, through the existing
      Settings UI.
- [ ] A Manager with `closings: true` can perform a Periodic Closing;
      one without cannot.
- [ ] A Manager with `staffManagement: true` can add/suspend/reactivate/delete
      Staff, but cannot promote to Manager, alter permissions, act on
      another Manager, or act on the Admin.
- [ ] Revoking a permission denies the very next write attempt (verified
      against a live session, not just next login).
- [ ] `firestore.rules` changes pass a full rules-emulator test suite
      covering: Admin (full access, unchanged), Manager-granted (new
      access confirmed), Manager-not-granted (denied, confirmed), Staff
      (unchanged), and cross-business isolation (a Manager of Business A
      cannot act on Business B).
- [ ] Business Growth and Subscription-change actions remain denied for
      every Manager regardless of granted permissions.

---

**Approved.** Delete is included in the `staffManagement` permission,
per explicit decision above. Implementation may proceed under this spec,
per Rule 8.
