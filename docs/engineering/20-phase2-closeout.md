# Module #20 (Notifications) — Phase 2 (Privileged-Server Creation Path) Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any BDS,
Amendment, POL, ADR, or plan; it records that Phase 2's already-approved
scope has been implemented and verified.
**Phase:** #20 Phase 2 — Privileged-Server Creation Path, per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9, scoped by [`20-phase2-privileged-server-rule8-assessment.md`](./20-phase2-privileged-server-rule8-assessment.md)
(original assessment + §12 re-run, concluding Ready), grounded in
[Specification Amendment v1.2](../specs/20-notifications-category-amendment.md)
(the `staff` category that resolved the original assessment's sole
blocker), authorized by
[`20-phase2-implementation-authorization.md`](./20-phase2-implementation-authorization.md)
(signed).
**Checkpoints:** Checkpoint 1 (`5a2d452`, runtime schema/validation
alignment), Checkpoint 2 (`6850f91`, staff endpoint notification
integration), Checkpoint 3 (this close-out — verification, testing).

---

## 1. Governance Compliance

Before any Checkpoint 3 work began, the current repository state was
independently verified — not assumed from any prior session's summary
or handoff description, per this repository's standing discipline:

- `main == origin/main`, working tree clean at the time verification
  began — confirmed via a fresh, independent clone.
- Checkpoint 2 commit `6850f91` present and is the current `main` tip.
- `writeNotification()` has **exactly five** callers — confirmed by
  direct grep, one per staff endpoint (`delete`, `suspend`,
  `reactivate`, `reset-pin`, `set-tier`).
- No additional notification producer exists — confirmed by mapping
  all five call sites to their enclosing route handlers, and by
  confirming Module #19's `runTrialLifecycleSweep()` (a separate,
  already-authorized function, unrelated to Module #20) does not call
  `writeNotification()`.
- Diffing `4a76879` (the original Rule 8 Assessment's own commit)
  against the pre-Checkpoint-3 tip, restricted to `src/`, `server/`,
  `firestore.rules`, `firestore.indexes.json`, showed the changes
  matched exactly what the signed Authorization scoped: `server/
  index.ts` and `src/types.ts` only.

**One out-of-scope discrepancy discovered during this verification, not
introduced by it:** the same fresh-repository check surfaced that
Module #19 Phase 2 (Trial Engine) was already implemented (commit
`0c92cad`) — and had been, in fact, before the very start of the
session that produced this Phase 2 work, before `docs/specs/README.md`
was even synced for Module #19/#20 Phase 1 status. That earlier sync
still left Module #19's row reading "Phase 2 (Trial Engine) ...
implementation not yet authorized," which is no longer accurate and,
on reflection, was already inaccurate at the moment it was written —
this was missed because that sync checked Phase 1 status specifically,
not whether Phase 2 had separately proceeded. This is flagged here for
visibility rather than corrected unilaterally as part of this Module
#20 close-out; it does not affect Module #20 Phase 2 in any way
(`runTrialLifecycleSweep` does not call `writeNotification` — confirmed
above), but the README row is now known to be stale in a second
respect, beyond the housekeeping already deferred once before.

## 2. Scope Implemented

**Checkpoint 1** (`5a2d452`): `NotificationCategory` extended with
`staff` in `src/types.ts` (client-side mirror of Specification
Amendment v1.2); `server/index.ts`'s `NOTIFICATION_CATEGORIES` runtime
array updated to match, so `validateNotificationPayload()` accepts the
new category rather than rejecting it.

**Checkpoint 2** (`6850f91`): each of the five `requireAuth`-protected
`/api/staff/*` endpoints extended with a new, independent "Stage D" —
a `writeNotification()` call producing a User-scoped `staff`-category
notification for the acted-upon staff member, following the exact
same staged, best-effort pattern already established for each
endpoint's existing timeline/audit stage:

| Endpoint | Notification `type` | Recipient |
|---|---|---|
| `/api/staff/delete` | `staff_removed` | the deleted staff member |
| `/api/staff/suspend` | `staff_suspended` | the suspended staff member |
| `/api/staff/reactivate` | `staff_reactivated` | the reactivated staff member |
| `/api/staff/reset-pin` | `staff_pin_reset` | the staff member whose PIN was reset |
| `/api/staff/set-tier` | `staff_tier_changed` | the staff member whose tier/permissions changed |

**Checkpoint 3** (this close-out): no new functionality. `tests/
staff-notifications.test.ts` added (58 assertions); one stale source
comment corrected (§6); `package.json` gained a matching
`test:staff-notifications` script, consistent with the repository's
existing `test:calculations`/`test:rules` convention.

**Confirmed unchanged, as required:** `NotificationContext`,
`Header.tsx`, `DeliveryChannel`/`InAppChannel`, `firestore.rules`,
`firestore.indexes.json`, and every other module's own producer
surface (Background Worker, Subscription, Closing, Inventory Risk,
Platform Announcement) — none touched by any of the three checkpoints.

## 3. Runtime Impact

Matches what the Rule 8 Assessment (§8) and signed Authorization
already projected, now confirmed against the actual implementation
rather than a plan:

- **Write volume:** one additional `notifications` document per staff
  action — bounded by human-initiated staff-management frequency, not
  a high-throughput path.
- **Duplicate-write risk:** low, as assessed — each endpoint fires
  exactly once per already-server-verified HTTP request; no retry/
  re-scan mechanism exists on this path. `dedupeKey` is populated on
  every call site (`${staffUid}:${type}:${eventId}`, confirmed by
  `tests/staff-notifications.test.ts`), giving crash-recovery
  protection even though the practical collision risk here is low.
- **Idempotency / partial failure:** each notification write is wrapped
  in its own `try`/`catch`, independent of the endpoint's primary
  mutation and independent of its existing timeline/audit stage — a
  notification-write failure can never roll back or fail an
  already-succeeded staff action. Confirmed structurally for all five
  endpoints, not just observed by inspection of one (§6).
- **Transactions:** no new distributed-transaction requirement — each
  write is a single additional staged Firestore document write, exactly
  as planned.

## 4. Security Impact

- **Tenant isolation:** unchanged. Every Phase 2 notification is
  User-scoped (`scope: 'user'`, `businessId: null`), not
  Business-scoped — no cross-tenant read surface introduced.
- **Recipient binding:** confirmed correct for all five endpoints —
  `userId: staffUid` (the acted-upon staff member), never
  `requesterUid` (the acting admin/manager). This was explicitly
  asserted in `tests/staff-notifications.test.ts`, not merely assumed
  from the endpoint's own comments.
- **Creation privilege:** unchanged — all five calls go through the
  same `writeNotification()` helper, which writes via the Admin SDK;
  `firestore.rules`'s unconditional `allow create: if false` on
  `/notifications/{notificationId}` is untouched and still the only
  thing a client-side write would ever hit.
- **Immutability / update restrictions:** unchanged — no new update
  path introduced; the recipient's own `markAsRead()` (Phase 1)
  remains the only mutation path for any notification document,
  Phase-2-created or otherwise.

## 5. Performance Impact

No measurable change beyond §3's bounded, low-frequency write volume.
No new index requirement — the existing Phase 1 `notifications`
composite indexes already cover User-scoped queries by `userId` and
`status`; Phase 2 does not introduce a new query shape, only new
documents matching the existing shape.

## 6. Testing Completed

**Added:** `tests/staff-notifications.test.ts` — 58 assertions across:
producer-count regression guard (exactly five callers, no additional
producer); per-endpoint payload-shape verification for all five
endpoints (`category: 'staff'`, `scope: 'user'`, `businessId: null`,
correct `userId`/recipient, correct `type`, correct `payloadRef`,
`dedupeKey` shape, populated `context`, `priority: 'immediate'`); and
partial-failure control-flow verification for all five endpoints
(notification write independently wrapped, failure sets
`notificationLogged = false` and logs via `console.error` rather than
failing the request, and the response only surfaces the flag
conditionally). **All 58 pass.**

**Verified, not merely asserted:** the test suite was actually executed
in this sandbox (`npx tsx --test tests/staff-notifications.test.ts`),
not just written — unlike `tests/firestore-rules.test.ts`, which
remains blocked from running here. `npx tsc --noEmit` was also run
after installing dependencies fresh in this sandbox, confirming zero
new type errors from any of this checkpoint's changes.

**Explicitly not covered, and why — flagged, not silently accepted as
equivalent:** true end-to-end execution of the five endpoints against
a live (or emulated) Firebase Auth + Firestore is **not** performed by
this suite. `server/index.ts` performs Firebase Admin initialization
and `expressApp.listen()` as import-time side effects, and this sandbox
has no Firestore/Auth emulator access (the same network-egress
limitation already documented for `tests/firestore-rules.test.ts`).
`tests/staff-notifications.test.ts` is therefore structural/static —
it reads the committed source and asserts the required literals and
control-flow shape are present, which is real verification of what's
actually committed, but is not a substitute for an actual run. This
mirrors, and is subject to the same caveat as, Phase 1's own
outstanding emulator-verification debt (`20-phase1-closeout.md`, §3):
**a genuine end-to-end run against `npm run test:rules:emulator`-style
tooling (or a real staging deploy) remains the actual acceptance gate
before this is treated as fully proven, and is still outstanding.**

**Regression:** the five existing staff-endpoint behaviors (the
primary Auth/Firestore mutation and the existing timeline/audit stage)
were not modified by any of the three checkpoints and were not
re-tested here, since no code path affecting them changed — confirmed
by the `server/index.ts` diff being comment-only for this checkpoint
(§ Deliverables) and functionally additive-only for Checkpoints 1–2
(new stage appended, nothing existing removed or restructured).

## 7. Remaining Phase 3 Boundary

Explicitly **not** touched, authorized, or implied ready by this
close-out — each remains its own, separate future phase requiring its
own Rule 8 Assessment and Authorization:

- **Background Worker producers** — Closing-overdue, Inventory-risk,
  and Subscription-companion notifications sourced from a scheduled
  sweep (Phase 3).
- **Subscription producers**, **Closing producers**, **Inventory Risk
  producers**, **Platform Announcement producers** — none exist; none
  authorized by this document.
- **Email, SMS, WhatsApp, push delivery** — Decision Gate 3 unchanged;
  `InAppChannel` remains the only implementation.
- **Phase 3, 4, 5, or 6 of any kind.**

## 8. Lessons Learned

- The append-only convention this project has used for README/spec
  updates (preserve original text, append a dated "Update" block)
  proved directly reusable for the Rule 8 re-run itself (§12 of the
  assessment) — the same discipline applies equally well to
  re-opening a governance *conclusion*, not just a governance
  *decision record*.
- A structural/static test suite is a legitimate, real interim
  verification tool when a repository has an established precedent for
  it (this repo already had one, for `firestore-rules.test.ts`) — but
  it must say so plainly, with the same "not a substitute for an actual
  run" caveat, rather than let a passing static suite read as
  equivalent to integration coverage.
- Verifying "the current repository state" ahead of a checkpoint should
  mean the *whole* repository, not just the module in front of you —
  the Module #19 Phase 2 discrepancy (§1) was sitting in plain sight
  the entire time this Module #20 work was happening, and turned up
  only because this checkpoint's own producer-count check happened to
  brush against Module #19's function by name.

## 9. Final Readiness Statement

**Module #20 Phase 2 (Privileged-Server Creation Path) is implemented,
tested (to the extent this sandbox allows — see §6), and closed.** All
five staff endpoints produce correctly-shaped, correctly-scoped,
correctly-recipiented `staff`-category notifications, with verified
partial-failure handling that never turns a notification failure into
a reported staff-action failure. No runtime file outside the
Authorization's declared scope was touched. No Phase 3 work of any
kind has begun or is implied ready by this document.

---

## Governance Notes

- This close-out does not authorize Phase 3. A separate Rule 8
  Assessment and Authorization remain required before any Background
  Worker, Subscription, Closing, Inventory Risk, or Platform
  Announcement producer is built.
- The Module #19 Phase 2 / `README.md` discrepancy noted in §1 is
  flagged, not resolved, here — consistent with this repository's
  practice of surfacing conflicts rather than resolving them
  unilaterally. It remains the Product Architect's call whether and
  when to correct it.
- The emulator-verification gap noted in §6 is flagged, not resolved,
  here, for the same reason it was flagged and left open in Phase 1's
  own close-out — the underlying sandbox limitation is unchanged.
