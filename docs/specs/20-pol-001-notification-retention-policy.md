Decision Record

# POL-20-001 — Notification Retention Policy

**Status:** ✅ Approved. All four parameters below have been decided by
Product Architect authorization: (1) dismissal marks a notification
read (coupled), (2) archival is priority-tiered (Option C — specific
windows deferred to engineering), (3) no automatic deletion in V1, and
(4) notification immutability (append-only) is adopted as an additional
approved business rule. See "Parameters Requiring Approval" below for
the full decision record. This record does not fix a specific retention
number — consistent with this repository's practice of not fixing a
specific business number until it's genuinely decided (Module #19's
POL-19-002 fixed "thirty days" because that figure had already been
decided; no equivalent figure has been decided for notification
retention — the priority-tiered *windows themselves* remain engineering
work, per Decision 2 below).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
Module #20's already-accepted philosophy — does not itself redefine the
module's scope, Decision Gates, or Data Model.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`20-`),
following the same `NN-pol-NNN-*.md` convention POL-19-001 through
POL-19-008 established.
**Depends on:** [`20-notifications.md`](./20-notifications.md) v1.1 —
Business Rule 3 ("No accounting drift" — a notification's `payloadRef`
is a pointer, never a duplicated fact) and the Amendment's Owner
Confidence Principle and Business Rule 10 (Communication Priority).
Module #20 has no BDR series of its own (unlike Module #19); this
policy operationalizes philosophy already embedded directly in the
accepted specification and its Amendment, rather than a separate BDR
layer.
**Followed by:** none yet — the first Policy document for Module #20.
**Explicitly does not define:** database cleanup jobs, storage
strategy, TTL/cron mechanics, or any other implementation detail —
those remain Module #20 specification and Engineering Plan work, per
your explicit instruction.

---

## Purpose

Define the business lifecycle of a notification once it's been created:
how long it remains part of the owner's active experience, what
happens to it afterward, and what a user's own actions (reading,
dismissing) mean for that lifecycle. This policy exists so
Module #20's eventual Implementation Plan has a settled business answer
to build against, rather than an engineering team choosing a retention
window or dismissal behavior by default.

## Guiding Principles

**Transience.** A notification is a communication artifact about an
event — it is not the business record of that event. Module #20's own
Business Rule 3 already establishes this for content (`payloadRef`
never duplicates a financial fact); this policy extends the same
principle to lifecycle: a notification is allowed to age out and
eventually disappear, because the fact it referenced does not disappear
with it — the Business Timeline (spec #13), Closings (spec #11), and
Reports (spec #12) remain the permanent record regardless of what
happens to the notification that once pointed at them.

**Historical Integrity Preserved Elsewhere.** Removing, archiving, or
deleting a notification must never be confused with removing,
archiving, or deleting the underlying business record. These are
independent lifecycles. This policy governs only the former.

**Owner Confidence, Not Clutter.** Per the Owner Confidence Principle
(Module #20 Amendment v1.1), a stale, ever-growing notification feed
undermines confidence rather than building it. Retention exists to keep
the live feed relevant — an owner should see what currently needs their
attention, not an unbounded archive of everything that ever happened.

**Simplicity.** Mirroring Module #19's own Simplicity Principle
(POL-19-002): retention rules should be uniform and predictable, not
varying by category, plan, or business size, unless a genuine reason
requires it.

## Notification Lifecycle States

Three states, building on the `status: 'unread' | 'read'` field
`20-notifications.md` already defines:

1. **Active** — appears in the live feed (`NotificationContext`,
   Architecture §8.13); `read`/`unread` (existing field) is independent
   of Active/Archived — a notification can be read and still Active.
2. **Archived** — no longer shown in the live feed or counted toward
   any unread badge; the underlying document may still exist and be
   queryable (e.g., from a "notification history" view, if one is ever
   built) — Archived is not the same as Deleted.
3. **Deleted** — the document itself no longer exists.

This is a conceptual lifecycle only. Whether "Archived" needs its own
schema field, or is instead derived at query-time from age + read
status, is Module #20 specification/engineering work, not decided here.

## Dismissal

**A user dismissing a notification is an acknowledgment action, not a
data-deletion action.** Dismissing:

- Removes the item from the owner's active/live feed (Active →
  Archived, at minimum).
- Never deletes, alters, or hides the underlying business record the
  notification's `payloadRef` points to.
- Is a per-user, per-notification action — dismissing a Business-scoped
  notification as a Manager does not dismiss it for that Business's
  Admin, and vice versa, consistent with Module #20's existing
  recipient-visibility model (20.2).

**Decided (Parameters Requiring Approval, Decision 1):** dismissing a
notification automatically marks it read. The two actions are coupled,
not independent — dismissal represents acknowledgment that the
notification has been seen and removed from the active workspace.

## Retention Duration and Deletion

**Decided (Parameters Requiring Approval, Decisions 2 and 3):** the
active lifetime of a notification is determined by its Communication
Priority (Option C, below), aligning with the Context-First and
Communication Priority principles introduced by Amendment v1.1. Archived
notifications are never automatically deleted in V1 — they remain part
of the business communication history unless a future, separately
approved governance decision establishes a retention or
legal-compliance policy. Specific per-tier retention windows are not
fixed by this business policy — they remain implementation detail for
Module #20's engineering specification.

Options considered (Option C selected):

- **Option A — Read-triggered archival.** A notification archives
  automatically once read; unread notifications remain Active
  indefinitely until read or manually dismissed. Simplest rule,
  closest to how the existing `status` field already behaves.
- **Option B — Fixed time window.** A notification archives
  automatically after a fixed number of days regardless of read status
  (e.g., mirroring POL-19-002's own "fixed and flat" pattern). Keeps the
  feed bounded even if an owner never opens the app.
- **Option C — Priority-tiered windows. Selected.** Different windows
  per Communication Priority tier (20.7) — e.g., `immediate`
  notifications stay Active longer since they're the ones most likely
  to still need action, `daily_summary` notifications archive fastest
  since they were never meant to demand attention in the first place.

Option C is adopted as business policy. The specific per-tier windows
(how many days for `immediate` vs. `daily_summary`, etc.) are not fixed
here — they remain Module #20 engineering specification work.

## Notification Immutability

**Decided (Parameters Requiring Approval, Decision 4 — a new business
rule, intentionally introduced now, not previously covered elsewhere in
`20-notifications.md` or this policy):**

Once a notification has been created, its business meaning shall remain
historically accurate. Notifications are not rewritten to reflect later
events. If additional communication is required, a new notification
shall be created rather than modifying the original notification.

This preserves historical integrity in the same spirit that SABUSH
preserves financial and business history. This is a business principle,
not an implementation requirement — it does not prescribe database
mechanics, storage strategy, or whether "no rewriting" is enforced via
`firestore.rules`, application logic, or another mechanism. That remains
Module #20 engineering specification work.

## What This Policy Does Not Affect

- The Business Timeline (spec #13), Closings (spec #11), Reports (spec
  #12), or any other collection a notification's `payloadRef` points
  to. Retention, archival, or deletion of a notification document never
  touches the record it referenced.
- `platform_audit_log` (Module #19 Phase 2) — a structurally separate
  collection with its own, already-settled retention posture (permanent,
  append-only, no deletion mechanism exists or is implied). This policy
  governs `notifications` only.
- Tenant isolation, recipient-scope rules (20.2), or any other Business
  Rule already accepted in `20-notifications.md` — none are reopened by
  this policy.

## Scope Exclusions

This policy explicitly does **not** define:

- Database cleanup jobs, scheduled deletion mechanics, or which
  Background Worker job type performs them (ADR-0002 governs worker
  ownership generally; this policy does not assign it specific work).
- Storage strategy, indexing, or query implementation.
- Whether "Archived" is a schema field, a derived query condition, or
  something else.
- Exact retention-window figures — pending selection among the options
  above (or a different figure you specify).

Each remains Module #20 specification/Engineering Plan work, per your
explicit instruction, once the business parameters below are decided.

---

## Parameters Requiring Approval — Decision Record

Approved by Product Architect. This record moved from Proposed to
Approved on the basis of these four decisions:

1. **Dismiss/read coupling — Approved.** Dismissing a notification
   automatically marks it read. Coupled, not independent.
2. **Archival trigger — Approved.** Option C (priority-tiered windows).
   Specific windows remain engineering specification work.
3. **Deletion — Approved.** No automatic deletion in V1. Archived
   notifications remain part of business communication history unless a
   future, separately approved governance decision changes this.
4. **Notification immutability — Approved.** A new business rule (see
   "Notification Immutability," above): notifications are never
   rewritten after creation; a new notification is created instead.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not modify `20-notifications.md`, its Amendment, any
  Decision Gate, any BDR, or any other POL.
- This record does not modify Module #19's `platform_audit_log`
  retention posture (already settled, separately, as permanent and
  append-only) or ADR-0002's Background Worker scope.
- `docs/specs/README.md` does not yet reference this record — updating
  that index is a separate, subsequent documentation step, not
  performed as part of this Approval, consistent with how POL-19-001
  was first recorded.
- This Approval is a business-policy decision only. It does not
  authorize implementation — no `firestore.rules`, `src/`, or `server/`
  file has been touched to produce it, and none is authorized by it.

**Lifecycle:** Designed → Proposed → **Approved**. All four business
parameters (dismiss/read coupling, archival trigger, deletion,
immutability) are now decided. Not Implemented, Executed, or Analyzed —
no engineering work is authorized by this record; that remains a
separate, explicit go-ahead.
