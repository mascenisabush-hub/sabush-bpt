Decision Record

# POL-20-001 — Notification Retention Policy

**Status:** Proposed — structure, principles, and lifecycle model below
reflect the shape you asked for; the specific parameters (retention
duration, dismissal semantics, deletion vs. archival) are presented as
options for your decision in "Parameters Requiring Approval," below,
not invented here. This record becomes **Approved** once those
parameters are selected — consistent with this repository's practice
of not fixing a specific business number (Module #19's POL-19-002 fixed
"thirty days" because that figure had already been decided; no
equivalent figure has been decided for notification retention yet).
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

**Genuinely open, requiring your decision (see "Parameters Requiring
Approval," below):** whether dismissing a notification also
automatically marks it read, or whether "read" and "dismissed" remain
two independent user actions.

## Retention Duration and Deletion

**Genuinely open, requiring your decision:** how long an Active
notification remains Active before automatically moving to Archived,
and whether Archived notifications are ever automatically Deleted (and
if so, after how long). Three options, not a recommendation forced on
you:

- **Option A — Read-triggered archival.** A notification archives
  automatically once read; unread notifications remain Active
  indefinitely until read or manually dismissed. Simplest rule,
  closest to how the existing `status` field already behaves.
- **Option B — Fixed time window.** A notification archives
  automatically after a fixed number of days regardless of read status
  (e.g., mirroring POL-19-002's own "fixed and flat" pattern). Keeps the
  feed bounded even if an owner never opens the app.
- **Option C — Priority-tiered windows.** Different windows per
  Communication Priority tier (20.7) — e.g., `immediate` notifications
  stay Active longer since they're the ones most likely to still need
  action, `daily_summary` notifications archive fastest since they were
  never meant to demand attention in the first place.

This policy does not pick one — each is compatible with every principle
above; the choice is a business judgment about how the live feed should
feel, not an engineering constraint.

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

## Parameters Requiring Approval

For this record to move from Proposed to Approved:

1. **Dismiss/read coupling** — does dismissing a notification also mark
   it read, or are these independent actions?
2. **Archival trigger** — Option A (read-triggered), Option B (fixed
   window), Option C (priority-tiered window), or a different rule.
3. **Deletion** — are Archived notifications ever permanently deleted,
   and if so, after what additional period past archival?

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
  performed here, consistent with how POL-19-001 was first recorded.

**Lifecycle:** Designed → **Proposed**. Not yet Approved — the three
parameters above require your decision first. Not Implemented,
Executed, or Analyzed — no engineering work is authorized by this
record regardless of its eventual approval status.
