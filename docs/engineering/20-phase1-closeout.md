# Module #20 (Notifications) — Phase 1 (Foundations) Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any BDS,
Amendment, POL, ADR, or plan; it records that Phase 1's already-approved
scope has been implemented and verified.
**Phase:** #20 Phase 1 — Foundations, per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9, scoped by [`20-phase1-foundations-rule8-assessment.md`](./20-phase1-foundations-rule8-assessment.md),
authorized by [`20-phase1-implementation-authorization.md`](./20-phase1-implementation-authorization.md)
(signed, August 2, 2026).

---

## 1. Governance Compliance

The full chain this phase was required to sit downstream of, per the
Authorization document's own §1 table — verified complete and in order
at close-out, not assumed:

| Stage | Document | Status |
|---|---|---|
| Business Decision | `20-notifications.md` v1.1 + embedded Decision Record | ✅ Accepted |
| Business Decision (amendment) | Specification Enhancement Amendment | ✅ Accepted |
| Policy | POL-20-001 (Notification Retention Policy) | ✅ Approved |
| Readiness | Engineering Readiness Assessment | ✅ Assessed |
| Architecture | ADR-0002 (Platform Background Worker) | ✅ Approved |
| Implementation Plan | `20-notifications-implementation-plan.md` | ✅ Planned |
| Rule 8 | `20-phase1-foundations-rule8-assessment.md` | ✅ Assessed |
| Authorization | `20-phase1-implementation-authorization.md` | ✅ Signed |
| Implementation | Checkpoints 1–3, below | ✅ Complete |
| **Close-out** | **This document** | ✅ Recorded |

No specification, Amendment, POL, or ADR was reopened, reinterpreted, or
modified to produce Phase 1's implementation or this close-out. The one
scope-interpretation decision made during implementation — Checkpoint
3's border-color-by-priority mapping and the click-to-`markAsRead`
wiring — was flagged explicitly to the Product Architect at the time it
was made (Rule 8 Assessment for Checkpoint 3), not decided silently;
both were grounded in already-adopted engineering-planning proposals
(Implementation Plan §7, items 1–2) and the Authorization's own §3
confirmation that those five proposals form "Phase 1's working basis."
No new proposal was introduced.

## 2. What Was Implemented

Three checkpoints, each its own commit, executed as sequencing within
one authorized phase — not three separate authorizations:

| Checkpoint | Commit | Scope |
|---|---|---|
| 1 — Foundation Layer | `ae7b36f` | `Notification`/`NotificationCategory`/`NotificationPriority` types (20.1); `NotificationContext` (read-only live listener, Business-scoped + User-scoped); `DeliveryChannel` interface + `InAppChannel` (20.4, no-op `send()`, no producer yet); `NotificationProvider` wired into `App.tsx`. |
| 2 — Backend & Security | `230b247` | `firestore.rules` new `/notifications/{notificationId}` match block + `isNotificationRecipient()` helper (first top-level, document-field-scoped collection in this file); two composite indexes (`scope`+`businessId`+`createdAt`, `scope`+`userId`+`createdAt`); server-side notification persistence helper in `server/index.ts` (Admin-SDK-only, unused — no producer wired); 15 new Firestore rules test cases + one query-leakage-block addition. |
| 3 — Tenant Experience | `60656d9` | `markAsRead(notificationId)` added to `NotificationContext` — the single client-direct write this domain permits (`status` field only, matching Checkpoint 2's rule exactly); `Header.tsx` bell dropdown rewired from the static `t('header.noNotifications')` stub to live data — unread-count badge, per-item left-border color keyed to `priority`, filled/hollow gold read/unread dot, `.type-label` timestamp, plain body text from `context.whatHappened`/`whyItMatters`/`recommendedAction` — following `DESIGN_SYSTEM.md`'s pre-existing (v2.0) Notifications feed spec. |

**Files changed across all three checkpoints (9, additive except
`Header.tsx`/`App.tsx`/`NotificationContext.tsx` which modify existing
files):**

```
firestore.indexes.json                   |  18 +++
firestore.rules                          |  86 +++++++++++++
server/index.ts                          | 134 +++++++++++++++++++
src/App.tsx                              |   5 +-
src/components/Header.tsx                |  64 +++++++++-
src/context/NotificationContext.tsx      | 173 +++++++++++++++++++++++++
src/lib/notifications/deliveryChannel.ts |  52 ++++++++
src/types.ts                             |  71 +++++++++++
tests/firestore-rules.test.ts            | 212 +++++++++++++++++++++++++++++++
9 files changed, 811 insertions(+), 4 deletions(-)
```

Every file above is either explicitly enumerated in the Rule 8
Assessment's §3 Affected Files table, or (`src/App.tsx`) is the direct,
unavoidable consequence of wiring the `NotificationContext` provider
that same table already called for — no file outside that set was
touched at any checkpoint.

**What was deliberately not built, per Phase 1's own boundary (Rule 8
Assessment §0, Authorization §3):**
- No notification producer of any kind — Subscriptions (#19), Business
  Closing (#11), Inventory Risk (#10/#5), Platform Announcements. Phase
  1 ships, in the Implementation Plan's own words, "a structurally real
  but empty system." Zero real `notifications` documents exist in this
  repository's history as of this close-out.
- No Background Worker change — `runTrialLifecycleSweep()` untouched;
  ADR-0002's "extend, not introduce" resolution is not acted on this
  phase.
- No priority-tiered archival-window filtering — the dropdown shows the
  full unfiltered feed both listeners return; "Archived" stays a
  proposal (Implementation Plan §7, item 3), not implemented.
- No mark-all-read, no standalone Notification Center / history view —
  explicitly named as Phase 4-and-beyond, out of this Authorization.
- No payment webhook creation path, no additional delivery channels
  (Email/WhatsApp/SMS/push) — outside V1 scope entirely (Decision Gate
  3), unaffected by this phase.

## 3. Acceptance Evidence

Verified this session, against the actual repository state:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Clean, zero errors (after `npm ci` — `node_modules` was not present at session start) |
| `npm run build` (`vite build` + `build:server`) | ✅ Succeeded. Only pre-existing, unrelated warnings (CSS `.lift` selector lint, chunk size, dynamic-import overlap) — no new ones introduced by Checkpoint 3 |
| `npm run test:calculations` | ✅ 12/12 pass — unaffected by this phase's scope, run as a regression check |
| Diff review — Checkpoint 3 | ✅ Exactly `src/components/Header.tsx` and `src/context/NotificationContext.tsx`, matching that checkpoint's own Rule 8 Assessment |
| `git log` / `git status` | ✅ `main` == `origin/main` at `60656d9`, working tree clean, nothing unpushed |
| **Emulator rules test** (`npm run test:rules:emulator`) | ❌ **Execution-blocked-by-environment** — this sandbox's network egress allowlist excludes `storage.googleapis.com`, the same documented limitation as every prior emulator-dependent change in this repository (Closing Integrity Amendment, owner→admin migration Stages 2/3, Module #19 Phase 1). Not a new failure, not a code defect. |

**Net acceptance status:** everything executable in this sandbox
(typecheck, build, calculations regression, static diff review against
the Rule 8 Assessments) passes across all three checkpoints. The one
gate this environment cannot clear — a live Firestore emulator run of
the 15 new `notifications` rules cases plus the query-leakage addition
— remains an outstanding **manual verification step for a local
environment**, consistent with every prior emulator-dependent change in
this repo's history. Treat a clean `npm run test:rules:emulator` run as
the actual acceptance gate before any production deploy involving this
phase's `firestore.rules` changes.

## 4. Runtime Impact

- **New read paths (2):** `NotificationContext`'s Business-scoped and
  User-scoped live listeners, now actually mounted (via `App.tsx`) and
  actually rendering (via `Header.tsx`) for every authenticated session.
  Both query an empty collection today — no existing user sees any
  notification, correctly, since none has ever been created.
- **New write path (1):** `markAsRead`, client-direct, guarded by
  `firestore.rules`' field-restricted `update`. Not called by anything
  except the dropdown's own item click — no automatic or background
  trigger invokes it.
- **No existing runtime path altered.** No other collection's query
  shape, no other component's render path, no existing server endpoint
  changed behavior. The bell icon existed before this phase (as a
  non-functional stub); its visible behavior changes, but nothing else
  in `Header.tsx`'s layout, profile menu, currency modal, or navigation
  does.

## 5. Security Impact

- **Tenant isolation — new mechanism, same trust model.** `notifications`
  is this repository's first top-level (non-path-scoped) collection;
  isolation is enforced via `resource.data.businessId`/`userId`
  matching rather than a path segment, but the underlying trust
  boundary (`isOwnerOf`/`isMemberOf`-equivalent) is unchanged — no new
  role, no new privilege tier introduced.
- **Write surface is narrower than any existing collection.** `create`
  and `delete` are unconditionally `false` for every client role,
  including Owner/Admin — stricter than most existing collections. The
  one permitted `update` is restricted to a single field (`status`,
  `unread`↔`read` only); every other field is enforced immutable via an
  explicit `.diff().affectedKeys()`-equivalent check tested against both
  a valid single-field update and a rejected multi-field/foreign-
  document attempt (Checkpoint 2's 15 test cases).
- **No client ever creates a real notification.** The server-side write
  helper (`server/index.ts`) is Admin-SDK-only and has zero callers in
  this phase — the same "structurally real but empty" guarantee Module
  #19 Phase 1 established for `subscriptions/{businessId}`.
- **Query-leakage surface: single, auditable call site.**
  `NotificationContext` is the only place client code issues a query
  against this collection — both queries are `where`-scoped, never
  unscoped, consistent with the query-safety-at-scale risk (Rule 8
  Assessment §6, Risk 2) this phase's design was built to close.
- **Suspended-member cutoff:** covered by the same test block (Checkpoint
  2) that covers every other tenant-scoped collection's suspended-member
  access-cutoff behavior — no gap introduced specific to notifications.

## 6. Performance Observations

- **No N+1 or unscoped-query risk introduced** — two `where`-filtered
  listeners per session (Business-scoped, User-scoped), each backed by
  a dedicated composite index (§2, above); no client-side full-collection
  scan.
- **Unread count is derived, not a separate read.** Computed client-side
  from the same two listeners' already-fetched documents
  (`notifications.filter(n => n.status === 'unread').length`) — no
  additional Firestore read, no additional index beyond the two created
  in Checkpoint 2.
- **Bundle impact not separately measured this session** — `npm run
  build`'s existing chunk-size warning (`index-*.js` > 500kB) predates
  this phase and was not newly triggered by it; Checkpoint 3's additions
  (a dropdown list, one context function) are small relative to that
  chunk and not expected to move it meaningfully, but this is an
  observation, not a measured delta.
- **Zero real documents in the collection today** means there is no
  current production read/write load from this phase — the performance
  question that actually matters (index behavior under real notification
  volume, once Phase 2+ producers exist) is deferred to those phases by
  construction, not overlooked here.

## 7. Remaining Work (Explicit Boundary — Phase 1 vs. Phase 2)

**Phase 1 (Foundations) is closed as of `60656d9`.** Everything above
is what exists. Nothing below exists yet, anywhere in this repository:

- No notification producer — Phase 2 (Privileged-Server Creation Path:
  staff-action notifications) has not been assessed, authorized, or
  built.
- No Background Worker producer logic — Phase 3 (scheduled/derived
  events: Closing-overdue, Inventory-risk, Subscription-notification
  companion writes) has not been assessed, authorized, or built.
- No Notification Center / history view beyond the bell dropdown itself
  — Phase 4, not assessed.
- No payment webhook creation path — Phase 5, additionally blocked on
  Module #19's own Commercial Integration phase.
- No additional delivery channels — Phase 6, outside V1 scope entirely.
- The emulator-run manual verification step (§3, above) is still owed
  before any production deploy touching this phase's `firestore.rules`.
- `docs/specs/README.md` and `HANDOFF.md` remain flagged, per the prior
  session, as documentation debt (README still shows Module #20 as
  "implementation is not authorized," which this phase's own
  Authorization record superseded) — explicitly **not** addressed by
  this close-out, per instruction that documentation synchronization is
  a separate, later step.

**Confirmation: no Phase 2+ work has begun.** No file under `src/`,
`server/`, `firestore.rules`, `docs/specs/`, or `docs/architecture/` was
modified to produce this close-out beyond the close-out document itself.
No staff-action notification call, no Background Worker job type, no
`archived`/priority-window filtering logic exists anywhere in the
repository as of `60656d9`. A Phase 2 Rule 8 Assessment has not yet been
drafted.

---

## Governance Notes

- This record does not modify `docs/specs/20-notifications.md`, its
  Enhancement Amendment, POL-20-001, ADR-0002, the Implementation Plan,
  the Phase 1 Rule 8 Assessment, or the Phase 1 Authorization.
- This record does not modify `docs/specs/README.md` or `HANDOFF.md` —
  both remain known-stale per the prior session's flagged finding,
  deferred to a separate documentation-synchronization step by explicit
  instruction, not silently left inconsistent by oversight.
- **Lifecycle:** Implemented → Verified → **Closed** (Phase 1 only).
  Phase 2 begins as its own, separate engineering milestone, gated on
  its own Rule 8 Assessment and its own explicit Product Architect
  authorization — following the same pattern this document itself now
  completes for Module #20, matching Module #19's precedent
  (`19-phase1-closeout.md`).
