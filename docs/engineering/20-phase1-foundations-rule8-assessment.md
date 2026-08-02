# Module #20 (Notifications) — Phase 1 (Foundations) Rule 8 Assessment

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan, per `CLAUDE.md`'s Rule 8 process. Planning
only. **Does not authorize implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision.
**Phase:** Module #20, Phase 1 — Foundations, per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9. No prior Module #20 phase exists to follow — this is the module's
first phase, unlike Module #19 Phase 2's assessment, which followed a
closed-out Phase 1.
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) (v1.1,
Accepted) — Functional Requirements 20.1–20.5, Non-functional
Requirements, Business Rules 1–8; [Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md)
(Business Rules 9–10, 20.6–20.7 — noted but out of this phase's scope,
see §0 below); [POL-20-001](../specs/20-pol-001-notification-retention-policy.md)
(dismiss/read coupling, archival trigger, no auto-deletion,
immutability); [Module #20 Engineering Readiness Assessment](./20-notifications-implementation-readiness.md)
(Rule 8, Assessed); [Module #20 Implementation Plan](./20-notifications-implementation-plan.md)
(Phase 1 definition, §9); [ADR-0002](../adr/ADR-0002-platform-background-worker.md)
(Background Worker ownership — referenced for context; Phase 1 does not
touch the worker, see §0 below); Architecture §4.4, §4.9, §7.4, §8.13,
§12; current `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json` state as of commit `6348c36` (verified fresh
below, §1).

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 0. Scope Boundary for This Assessment

Per explicit instruction, this assessment covers **only** what the
Implementation Plan's Phase 1 (Foundations) defines:

**In scope:** notification data model, TypeScript types,
`NotificationContext` architecture, the `notifications` Firestore
collection, Firestore Security Rules, Firestore indexes, the Delivery
Channel Interface, `InAppChannel`, a basic server-side write helper,
`Header.tsx` integration, and unread-count support.

**Explicitly out of scope for this assessment** (deferred to Phase 2/3
per the Implementation Plan, or beyond V1 entirely):

- Subscription, Inventory, and Business Closing notification *content*
  or *producers* — Phase 1 builds the pipe, not what flows through it.
- Background Worker producer logic of any kind (Phase 3) — this phase
  does not extend `runTrialLifecycleSweep()` or register any new job
  type. ADR-0002 is cited above only because it establishes that
  *future* job types will extend the existing worker, not because
  Phase 1 touches it.
- Notification generation of any kind — Phase 1 ships a system capable
  of holding and displaying notifications; it does not create any real
  one.
- Priority-tiered behavior beyond the schema field itself — `priority`
  (20.7) is stored as a required field in this phase's data model, but
  priority-driven archival windows, grouping, or presentation logic
  (POL-20-001, Option C) are **not** built in Phase 1. Storing the
  field is infrastructure; acting on its value is not.
- Email, SMS, WhatsApp, push, or any other external delivery channel —
  Decision Gate 3, unchanged; the Delivery Channel Interface exists
  structurally with exactly one implementation (`InAppChannel`).

## 1. Fresh Repository Verification

Performed against a fresh `git fetch origin` immediately before writing
this document — not relying on any earlier conversation turn.

| Item | Verified state |
|---|---|
| **Current HEAD (`main`)** | `6348c36f3d03036c2176687ace6b7c9f431ed87d` — "docs(module-20): POL-20-001 - Approve Notification Retention Policy" |
| **Implementation Plan location** | **Discrepancy found** — see §1.1, below |
| **Header notification placeholder** | Unchanged since the Readiness Assessment: `src/components/Header.tsx` — `showNotifications` state (line 38), `notificationsRef` (line 41), a `Bell` icon button (line 145), a dropdown rendering only static `t('header.noNotifications')` copy (line 149). No collection, context, or trigger logic behind it. |
| **Firestore Rules** | `grep -n "notifications" firestore.rules` returns **zero matches**. No `notifications` match block, no supporting helper function, exists today. |
| **Server notification support** | `grep -n -i "notification" server/index.ts` returns exactly one hit — a comment at line 980 referencing future "processing (notifications, renewal evaluation, aggregation rollups...)". No notification-write helper, endpoint, or type exists. |
| **Background Worker implementation** | Unchanged: exactly one scheduled process, `runTrialLifecycleSweep()` (line 992) inside a single `setInterval` (line 1051) in `server/index.ts`. No second process, no job-type registration mechanism, no notification-related job of any kind. |
| **Notification-related types** | `grep -n -i "notification" src/types.ts` returns **zero matches**. No `Notification`, `NotificationCategory`, `NotificationPriority`, or related type exists today. |
| **Firestore indexes** | `grep -n -i "notification" firestore.indexes.json` returns **zero matches**. No composite index for any notification query exists. |
| **Engineering documents present on `main`** | `docs/engineering/` on `main` contains: `17-owner-portfolio-feasibility-note.md`, `19-milestone-review-phases-1-2.md`, `19-phase1-closeout.md`, `19-phase2-trial-engine-decisions.md`, `19-phase2-trial-engine-rule8-assessment.md`, `19-subscriptions-implementation-plan.md`, `19-subscriptions-implementation-readiness.md`, `20-notifications-implementation-readiness.md`, `phase0-owner-admin-migration-implementation-plan.md`, `phase0-stage3-backfill-migration-execution-plan.md`, `platform-infrastructure-readiness-assessment.md`, `registration-subscription-creation-architecture-decision.md`. |

### 1.1 Discrepancy Found — Report, Not Silently Continued

**`docs/engineering/20-notifications-implementation-plan.md` does not
exist on `main`.** It exists only on branch
`docs/module-20-implementation-plan` (commit `f2ef173`), pushed but not
yet merged. `main`'s HEAD is unchanged at `6348c36`, identical to
before that plan was drafted.

This matters because this Rule 8 Assessment cites the Implementation
Plan as part of its governance basis. Strictly, per this repository's
own "the repository is the authoritative source of truth" standard
established earlier in this process, a document that exists only on an
unmerged branch is not yet part of `main`'s authoritative state.

**Resolution applied for this assessment (stated, not silent):** the
content of the Implementation Plan on `docs/module-20-implementation-plan`
was read fresh from that branch (not from prior conversation memory) and
used as this assessment's basis, since its content is not in dispute —
only its merge status. This assessment does not merge that branch, and
does not treat its own existence as resolving that gap. **Before this
Rule 8 Assessment itself is treated as authoritative alongside the rest
of Module #20's governance trail, `docs/module-20-implementation-plan`
should be merged to `main` (or this assessment held on the same branch
until it is)** — flagged here for Product Architect decision, not
resolved unilaterally.

**No other discrepancy was found.** Every other repository-state claim
made by the Implementation Plan and Readiness Assessment (Header stub,
absent rules/types/indexes/server-helper, single-process worker) is
confirmed accurate against this fresh check.

## 2. Confirm Assumptions Still Valid

- **Spec v1.1 (Accepted), Amendment (Accepted), POL-20-001 (Approved):**
  all three remain on `main`, unchanged since the Implementation Plan
  was drafted (same HEAD, `6348c36`) — no re-verification needed beyond
  confirming HEAD is identical, which it is.
- **ADR-0002 (Approved):** unchanged, same HEAD. Its "extend, not
  introduce" resolution is cited for context only; Phase 1 does not
  depend on acting on it (see §0).
- **Readiness Assessment's blocking items (Background Worker ownership,
  retention):** both remain resolved (ADR-0002, POL-20-001
  respectively) — no regression found.
- **Implementation Plan's Phase 1 definition (§9 there):** confirmed
  unchanged on its branch; content matches what this assessment
  assesses.

All assumptions the Implementation Plan relied on remain valid, subject
to the single merge-status discrepancy in §1.1.

---

## 3. Affected Files (Phase 1 only)

Every runtime file expected to change, or be newly created, for Phase 1:

| File | Change type | Nature |
|---|---|---|
| `src/types.ts` | Modified (additive) | New `Notification`, `NotificationCategory`, `NotificationPriority` types (20.1 shape). No existing type altered. |
| `src/context/NotificationContext.tsx` | **New file** | Read-only live Firestore listener, scoped to caller's own Business-scoped + User-scoped feed. |
| `src/lib/notifications/deliveryChannel.ts` (or equivalent path under `src/lib/`) | **New file** | `DeliveryChannel` TypeScript interface + `InAppChannel` implementation (20.4). |
| `src/components/Header.tsx` | Modified | Bell dropdown rewired from static stub to `NotificationContext` data; adds unread-count badge. Scoped to the dropdown's content only — no layout/navigation change. |
| `firestore.rules` | Modified (new match block) | New `match /notifications/{notificationId}` block plus supporting helper function(s) for document-field-based tenant isolation (§7, below). No existing match block altered. |
| `firestore.indexes.json` | Modified (additive) | New composite indexes: `businessId` + `createdAt`; `userId` + `createdAt`; `businessId`/`userId` + `status` (unread-count queries). |
| `server/index.ts` | Modified (additive) | New shared notification-write helper function, mirroring the existing `newAuditEventRef()` pattern (line 872). Not called by any endpoint yet in Phase 1 — no producer exists until Phase 2/3. |
| `tests/firestore-rules.test.ts` | Modified (additive) | New `describe('notifications', ...)` block, following the file's existing convention (18 `describe` blocks today, e.g. `subscriptions` at line 690, `platform_audit_log` at line 835). |

**Not affected:** any Background Worker file/process (no job registered
this phase), any producer-side code in Closings/#11, Stock Counts/#10,
Breakages/#7, or Subscriptions/#19 (no event wired to a notification
yet), any payment webhook handler (does not exist yet, unrelated to
this phase).

## 4. Engineering Plan (implementation sequence)

Proposed build order within Phase 1 — sequencing only, not itself
authorization:

1. **Types first** (`src/types.ts`). No dependency; unblocks everything
   else that references the shape.
2. **Firestore Rules + Indexes together**, before any client code
   queries the collection. This is deliberate ordering, not a default:
   Risk 1 (§6, below) means the rule must exist and be verified before
   `NotificationContext` is written against it, not after.
3. **Server-side write helper** (`server/index.ts`). Can be built in
   parallel with step 2 — it writes to the same schema but is not
   itself called by anything in Phase 1 (no producer exists yet).
   Building it now, unused, matches the Implementation Plan's own
   framing ("a structurally real but empty system").
4. **Delivery Channel Interface + `InAppChannel`.** Thin wrapper around
   the same write helper from step 3 — depends on step 3 existing.
5. **`NotificationContext`.** Depends on steps 1–2 (types + verified
   rules/indexes) being in place; this is the first thing that actually
   queries the collection.
6. **`Header.tsx` integration + unread-count support.** Last step —
   depends on `NotificationContext` (step 5) existing and being
   consumable. Unread count is a derived value from the context's own
   query (`status == 'unread'` count), not a separate write path.
7. **Tests** — written alongside steps 2 and 5–6, not deferred to the
   end: the Firestore Rules test block should exist before `Header.tsx`
   integration is considered complete, per this repository's own
   testing discipline (every other tenant-scoped collection has rules
   tests in place before being consumed by UI).

## 5. Dependencies (confirmed)

- **No dependency on Phase 2 or Phase 3.** Phase 1 is buildable with
  zero real notification documents in existence — every governance
  document (Implementation Plan §9, Readiness Assessment §5) describes
  this phase as "structurally real but empty."
- **No dependency on Module #19 beyond what already exists.** The
  `requireAuth` middleware pattern Phase 1's server helper would sit
  alongside already exists (five `/api/staff/*` endpoints); no new
  auth mechanism needed.
- **No dependency on ADR-0002 being acted upon.** ADR-0002 matters to
  Phase 3, not Phase 1 — Phase 1 does not touch the Background Worker.
- **Dependency on `docs/module-20-implementation-plan` branch status**
  (§1.1) — an administrative/governance dependency, not a technical
  one. Does not block writing this assessment; should be resolved
  before treating Module #20's governance trail as fully consolidated
  on `main`.

No dependency in this phase is blocked by an unresolved Product
Architect decision.

---

## 6. Risks

| # | Risk | Classification | Mitigation |
|---|---|---|---|
| 1 | **Multi-tenant isolation via document-field matching.** `notifications` is this repository's first top-level (not business-nested) collection. Every existing `firestore.rules` block (`isMemberOf(businessId)`, `isOwnerOf(businessId)`) scopes via **path segment**; this collection requires scoping via **`resource.data.businessId`/`userId`** instead — a genuinely new rule shape, not a routine extension. | **High** | Dedicated rule design, written and verified against the emulator *before* any client code (`NotificationContext`) queries the collection (Engineering Plan §4, step 2 precedes step 5). New rule must structurally reject any unscoped or wrongly-scoped query — not merely discourage one. |
| 2 | **Query-safety at scale.** A live listener on a top-level collection, at target scale (100k+ tenants), must never be exposed without a `where` filter. Directly tied to Risk 1. | **High** | Same rule + required composite indexes (§8, below) together make an unscoped query structurally reject, not just slow. `NotificationContext` itself is the only place a query is issued from client code in this phase — a single, auditable call site. |
| 3 | **Schema drift from 20.1.** Hand-writing the `Notification` type risks a subtle mismatch with the spec's exact field set (`scope`, `businessId`/`userId`, `category`, `type`, `payloadRef`, `channel`, `status`, `dedupeKey`, `createdAt`, `context`, `priority`). | **Medium** | Type authored directly against 20.1's schema block, field-by-field, with a code comment linking back to the spec section — same discipline `Subscription`'s type used against Module #19's spec. |
| 4 | **`context`/`priority` required-but-unused fields.** Both are required, non-null per Business Rule 9/10 and 20.1's schema note — but Phase 1 has no producer to populate them meaningfully. | **Low** | Not a blocker: the type marks both as required; nothing in Phase 1 creates a document, so no invalid document can exist yet. Producers (Phase 2/3) inherit the obligation to populate both correctly — flagged for those phases, not solved here. |
| 5 | **Read/dismiss write path scope creep.** The restricted client-direct `update` (Implementation Plan §7, item 1) must be narrowly scoped in `firestore.rules` to only the `status` field on a document the caller already owns — a broad `allow update` here would be a real isolation gap, not a convenience. | **Medium** | Rule written with an explicit field-level restriction (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])` or equivalent), tested with both a valid single-field update and a rejected multi-field/foreign-document attempt. |
| 6 | **Immutability enforcement gap.** POL-20-001's append-only rule needs enforcement, but Phase 1's own read/dismiss path (Risk 5) technically *is* a permitted update (to `status`) — the rule must allow that one narrow case while rejecting all other post-creation writes. | **Medium** | Same rule block handles both: `allow update` permitted only for the single-field `status` transition; everything else on an existing document is denied, consistent with how `platform_audit_log`'s own immutability is already enforced elsewhere in this file. |
| 7 | **Unused write helper (server/index.ts).** Building a helper with no caller in this phase risks dead code drifting from the schema by the time Phase 2 actually calls it. | **Low** | Covered by a direct unit test against 20.1's schema in this phase, not deferred — keeps the helper verified even while unused. |

No risk in this table is classified as blocking a Product Architect
decision — all seven are engineering-execution risks with a concrete
mitigation, consistent with how the Readiness Assessment characterized
this category of item.

---

## 7. Security

- **Tenant isolation.** The core of Risk 1/2 above. Read access must
  follow the same trust boundary every other collection already
  enforces (`isMemberOf`/`isOwnerOf`/`isOwnerOrGrantedManager`), just
  re-expressed via document fields instead of path segments, since
  `notifications` is top-level per its own data model (20.1). No new
  *trust* model is introduced — only a new *mechanism* to express the
  same one.
- **Privileged writes.** Per Decision Gate 2 (spec, unchanged), no
  client ever creates a `notifications` document directly in any
  phase, including this one. Phase 1's server-side write helper exists
  but is Admin-SDK-only, matching the same guarantee
  `subscriptions/{businessId}` already has (`allow write: if false`
  for clients, Module #19 Phase 1 precedent). `firestore.rules` for
  this collection should mirror that: `allow create: if false` (or
  equivalent) at the client layer, full stop.
- **Client restrictions.** The one permitted client-side write in this
  phase is the narrowly-scoped `status`-only update on a document the
  caller already owns (Risk 5) — everything else (`create`, `delete`,
  and `update` of any other field) must be denied to every client role,
  including Admin. This is stricter than most existing collections
  (which allow Admin broader `update`/`delete`) because POL-20-001's
  immutability rule applies platform-wide, not per-role.
- **No side-channel leakage.** Consistent with the spec's own
  Non-functional Requirements: no client-exposed query pattern may
  allow inferring another Business's notification existence or count.
  `NotificationContext` is the single client call site (§6, Risk 2) —
  auditable and narrow by construction.

## 8. Performance

- **Expected read cost.** One live listener per authenticated session
  (`NotificationContext`), filtered by the caller's active
  `businessId` and `uid` — bounded, predictable per-user cost,
  consistent with every other live-listener pattern already in
  `AppContext.tsx`.
- **Expected write cost (Phase 1).** Effectively zero in production —
  no producer exists yet. The server-side write helper is exercised
  only by its own unit test in this phase.
- **Indexes required** (confirmed against 20.1's query needs):
  - `businessId` (ascending) + `createdAt` (descending) — Business-
    scoped live feed.
  - `userId` (ascending) + `createdAt` (descending) — User-scoped live
    feed.
  - `businessId`/`userId` + `status` — unread-count queries, to avoid
    pulling full documents just to count unread items.
  All three are additive to `firestore.indexes.json`; none replace or
  modify an existing index.
- **Scale consideration.** At 100k+ tenants (the platform's stated
  target), an unindexed or unscoped query against a top-level
  collection would be the single worst-case performance failure mode
  in this module — which is exactly why Risk 1/2 are classified High
  rather than Medium, despite being "just a rules file" in isolation.

## 9. Firestore Rules — New Blocks Required

1. **`match /notifications/{notificationId}`** — the primary block.
   - `allow read:` if `resource.data.businessId != null` and caller
     `isMemberOf(resource.data.businessId)` (Business-scoped, Manager
     view-only per existing Permission Matrix pattern — no new
     permission tier), **or** `resource.data.userId == request.auth.uid`
     (User-scoped).
   - `allow create:` `if false` — no client creation path in any
     phase, including this one (Decision Gate 2).
   - `allow update:` permitted **only** for the single-field `status`
     transition, only by a caller who already satisfies the read
     condition above (dismiss/read coupling, POL-20-001) —
     `hasOnly(['status'])` or equivalent field-diff restriction.
   - `allow delete:` `if false` — no automatic or client-initiated
     deletion in V1 (POL-20-001, Decision 3).
2. **New helper function(s)**, alongside the existing
   `isMemberOf`/`isOwnerOf`/`isOwnerOrGrantedManager` functions —
   something like `isNotificationRecipient(resource)` — encapsulating
   the document-field-based check so the match block itself stays
   readable, matching this file's existing style of extracting
   repeated logic into named functions.

No existing match block or helper function is modified — this is
additive only, consistent with the plan's own affected-files claim.

## 10. Testing — Required Before Phase 1 Can Be Accepted

- **Firestore Rules emulator tests** (new `describe('notifications', ...)`
  block in `tests/firestore-rules.test.ts`):
  - Business-scoped document readable by that Business's Admin and
    Manager; denied to a different Business's Admin/Manager.
  - User-scoped document readable only by the matching `uid`; denied
    to every other authenticated user, including that user's own
    Business's Admin.
  - Client `create` denied in every case (Admin, Manager, Staff, no
    exception).
  - Client `update` permitted only as a single-field `status` change on
    a document the caller already has read access to; denied when
    attempting to change any other field, and denied entirely on a
    document the caller doesn't own.
  - Client `delete` denied in every case.
  - **Query-based leakage test** (mirroring the file's existing
    `describe('query-based leakage', ...)` pattern, line 871): an
    unscoped or wrongly-scoped query against the collection must be
    rejected by the rules themselves, not merely return an empty result
    set.
- **Unit tests** for the server-side write helper: given a valid
  20.1-shaped payload, produces a correctly-shaped document; given a
  payload missing `context` or `priority`, is rejected (or, if
  validation is rules-only rather than helper-level, this test
  confirms the helper's own type-safety at minimum).
- **Type-check.** `Notification`/`NotificationCategory`/
  `NotificationPriority` compile cleanly against 20.1's schema; no
  `any` types introduced.
- **Manual verification.** `Header.tsx`'s bell dropdown renders
  correctly with zero notifications (today's exact behavior preserved
  as the empty-state case) and does not regress any existing
  click-outside/dropdown behavior already in that component.
- **Regression check.** Existing `tests/firestore-rules.test.ts` suite
  (18 `describe` blocks today) continues to pass unmodified — this
  phase adds a block, it does not touch any existing one.

---

## 11. Readiness Classification

**Ready after minor preparation.**

**Why not "Ready" outright:** the single governance-administrative gap
in §1.1 — the Implementation Plan this assessment is built on exists
only on an unmerged branch, not on `main`. This is not an engineering
blocker (the plan's content is settled and was read fresh for this
assessment), but it means Module #20's documentation trail on `main`
is not yet internally consistent: `main` currently jumps from the
Readiness Assessment straight to this Rule 8 Assessment, with the
Implementation Plan itself absent. Recommend merging
`docs/module-20-implementation-plan` before treating Phase 1 as fully
governance-clean, or explicitly deciding to hold this document on the
same branch until both merge together.

**Why not "Not Ready":** every other input is resolved. No open
Product Architect decision blocks Phase 1 specifically — unlike Module
#19 Phase 2's own assessment, which found three genuine outstanding
business decisions (activation trigger, restricted-operations list,
Worker sequencing), this Phase 1 assessment finds **zero** Product-
level open items. All seven risks (§6) are engineering-execution risks
with concrete mitigations; none requires reopening a Decision Gate,
Business Rule, or POL parameter.

---

## Deliverables

1. **File created:** `docs/engineering/20-phase1-foundations-rule8-assessment.md`
   (this document). No other file created or modified.
2. **No runtime implementation occurred.** `src/`, `server/`,
   `firestore.rules`, and `firestore.indexes.json` remain exactly as
   verified in §1 — nothing in this repository's runtime surface was
   touched to produce this assessment.
3. **No specifications changed.** `20-notifications.md` and its
   Amendment are unmodified.
4. **No policies changed.** POL-20-001 is unmodified.
5. **No architecture changed.** No `docs/architecture/*` file or
   ADR-0002 was modified.
6. **Complete list of runtime files expected for Phase 1** (§3, above):
   `src/types.ts` (modified), `src/context/NotificationContext.tsx`
   (new), a Delivery Channel Interface + `InAppChannel` file under
   `src/lib/` (new), `src/components/Header.tsx` (modified),
   `firestore.rules` (modified), `firestore.indexes.json` (modified),
   `server/index.ts` (modified), `tests/firestore-rules.test.ts`
   (modified).
7. **New Product Architect decisions required: none**, for Phase 1
   specifically. The one open item (§1.1, merge status of the
   Implementation Plan) is administrative/governance housekeeping, not
   a business or architectural decision — flagged for your awareness,
   not blocking on a decision from you beyond confirming how you'd
   like it handled.
8. **Phase 1 is not yet authorized to begin, even from an engineering
   perspective, by this document alone.** This assessment classifies
   Phase 1 as **Ready after minor preparation** (§11) — the
   preparation being the branch/merge housekeeping in §1.1, not further
   engineering analysis. Per Rule 8, actual coding still requires its
   own separate, explicit Product Architect go-ahead beyond reaching
   this assessed state.
9. **Waiting for Product Architect review before any implementation
   work begins.**
