# Module #20 (Notifications) — Phase 2 (Privileged-Server Creation Path) Rule 8 Assessment

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan, per `CLAUDE.md`'s Rule 8 process. Planning
only. **Does not authorize implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision.
**Phase:** Module #20, Phase 2 — Privileged-Server Creation Path, per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9. Follows a closed-out Phase 1 — the module's second phase, comparable
in shape to Module #19 Phase 2's own assessment (which likewise followed
a closed-out Phase 1).
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) (v1.1,
Accepted) — Functional Requirement 20.5 (Notification Creation Path
Contract, Path 2), Decision Gate 2, Business Rules 1–8;
[Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md)
(Business Rules 9–10, 20.6–20.7 — `context`/`priority` population,
directly relevant here since Phase 2 is the first phase with a real
producer); [POL-20-001](../specs/20-pol-001-notification-retention-policy.md)
(dismiss/read coupling, immutability — unchanged by this phase, only
exercised by it); [ADR-0002](../adr/ADR-0002-platform-background-worker.md)
(Background Worker ownership — not touched by this phase; cited only to
confirm Phase 2 does not overlap Phase 3's territory);
[Module #20 Engineering Readiness Assessment](./20-notifications-implementation-readiness.md);
[Module #20 Implementation Plan](./20-notifications-implementation-plan.md)
(Phase 2 definition, §9, §4, §8); [`20-phase1-closeout.md`](./20-phase1-closeout.md)
(what Phase 1 actually shipped, §2, §7); [Platform Engineering
Priorities](./platform-engineering-priorities.md) (Priority 1 — this
phase is the recommended next engineering work); current `src/`,
`server/`, `firestore.rules` state as of commit `e2e75b9` (verified
fresh below, §1).

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 0. Scope Boundary for This Assessment

Per explicit instruction, this assessment covers **only** the
Privileged-Server Creation Path as the Implementation Plan's Phase 2
defines it:

**In scope:** extending the five existing `requireAuth`-protected
`/api/staff/*` endpoints to call the already-existing `writeNotification()`
helper (built, unused, in Phase 1) within their existing transaction,
producing User-scoped notifications for staff-action events.

**Explicitly out of scope for this assessment** (deferred to later
phases, or beyond V1 entirely — not redesigned or broadened here):

- **Background Worker producers** (Phase 3) — Closing-overdue,
  Inventory-risk, and Subscription-companion notifications. This
  assessment does not touch `runTrialLifecycleSweep()` or register any
  job type.
- **Subscription producers** — Module #19 state-transition notifications
  are a Phase 3 concern (sourced from the Background Worker sweep, not
  the privileged-server path).
- **Closing producers** — Phase 3.
- **Inventory Risk producers** — Phase 3.
- **Platform Announcement producers** — not assigned to any single
  phase by the Implementation Plan; broadcast mechanism remains
  implementation-planning work not yet scoped to a phase.
- **Email, SMS, WhatsApp, or push delivery** — Decision Gate 3,
  unchanged. Phase 2 writes exclusively through the existing
  `InAppChannel`; no new `DeliveryChannel` implementation is required
  or introduced.
- **Phase 3, 4, 5, or 6 work of any kind** — this assessment evaluates
  Phase 2 only.

## 1. Fresh Repository Verification

Performed against a fresh `git fetch origin` / `git log -1` immediately
before writing this assessment — current `main` tip: `e2e75b9`.

Confirmed present (Phase 1, closed, verified to actually exist —
not assumed from the close-out document alone):

| Component | Location | State |
|---|---|---|
| `Notification` type + `NotificationCategory`/`NotificationPriority`/`NotificationScope`/`NotificationChannel`/`NotificationStatus` | `src/types.ts` (~line 452–503) | Matches 20.1 field-for-field |
| `NotificationContext` | `src/context/NotificationContext.tsx` | Exists, read-only live listener |
| Delivery Channel Interface + `InAppChannel` | `src/lib/notifications/deliveryChannel.ts` | Exists, exactly one implementation, per Decision Gate 3 |
| `notifications` Firestore rules block | `firestore.rules` (~line 486) | `allow create: if false` unconditional; `allow update` restricted to the single `status` field via explicit field-by-field equality checks; `allow delete: if false` |
| Server-side write helper | `server/index.ts` — `validateNotificationPayload()` (~line 1112), `writeNotification()` (~line 1169) | Exists, validates all of 20.1's required fields including `context`/`priority` (Amendment v1.1), writes via Admin SDK |
| Header bell dropdown wiring | `src/components/Header.tsx`, `markAsRead()` in `NotificationContext` | Live, per Phase 1 Checkpoint 3 |

Confirmed absent (correctly — nothing in Phase 2's scope exists yet):

- `writeNotification()` has **zero callers** in `server/index.ts` —
  verified by direct grep; the function exists only as unit-testable,
  unused infrastructure, exactly as the Phase 1 close-out (§7) states.
- No `/api/staff/*` endpoint references `writeNotification`,
  `NotificationPayload`, or any notification-shaped write.
- No Background Worker job type, no payment webhook notification write.

### 1.1 Governance Contradiction Check

Checked explicitly, per instruction, whether any contradiction has
appeared since Phase 1 closed:

- **Phase-numbering scope question.** Phase 1's own close-out (§1,
  Governance Compliance) records that Checkpoint 3 pulled `Header.tsx`
  wiring forward into Phase 1, where the Implementation Plan's original
  phase breakdown (§9) had labeled that work "Phase 4 — Tenant User
  Experience." This was flagged and resolved *at the time* — the
  close-out documents it as a scope-interpretation decision grounded in
  already-adopted Implementation Plan proposals (§7, items 1–2), given
  its own Rule 8 review at Checkpoint 3, not a silent relabeling. It
  does not touch Phase 2's own scope (staff-action producer wiring) —
  the two are independent. **Not a live contradiction; already
  resolved through governance, re-confirmed here, not reopened.**
- **`docs/specs/README.md` / `HANDOFF.md` staleness**, flagged by the
  Phase 1 close-out as deferred documentation debt — **resolved** in
  the interim by a separate documentation-synchronization commit
  (`ec02580`) prior to this assessment. No longer an open item.
- **No other contradiction found** across the Spec v1.1, Amendment,
  POL-20-001, ADR-0002, Readiness Assessment, Implementation Plan, or
  Phase 1 close-out. All remain internally consistent with each other
  and with the verified repository state above.

**Conclusion: no unresolved governance contradiction exists. Proceeding
with the assessment.**

## 2. Confirm Assumptions Still Valid

- Decision Gate 2 (privileged server is a legitimate, independent
  creation path, not subordinate to the Background Worker) —
  unchanged, re-confirmed against the spec text (20.5, Path 2).
- The five staff endpoints — `/api/staff/delete`, `/api/staff/suspend`,
  `/api/staff/reactivate`, `/api/staff/set-tier`, `/api/staff/reset-pin`
  — all still exist, unchanged in signature, all still
  `requireAuth`-protected, confirmed by fresh grep against `server/index.ts`
  (§1, above). The Implementation Plan's §4/§8 both name all five; §9's
  Phase 2 objective text names four illustrative event types
  (role/permission change, suspension, reactivation, deletion
  confirmation) without separately naming reset-pin — a wording gap
  internal to the plan's own prose, not a scope conflict, since §4 and
  §8 are unambiguous that all five endpoints are in scope. Flagged here
  for visibility; does not require a Product Architect decision to
  resolve — reset-pin is included.
- POL-20-001's immutability and dismiss/read coupling — unchanged,
  already enforced in `firestore.rules` (§1, above), exercised but not
  altered by this phase.
- ADR-0002's worker-ownership resolution — unchanged, not implicated by
  this phase (Phase 2 does not touch the worker).

## 3. Affected Files (Phase 2 only)

| File | Change |
|---|---|
| `server/index.ts` | Each of the five `/api/staff/*` handlers gains one additional call to `writeNotification()`, inside the handler's existing transaction/flow, after the primary staff-action mutation succeeds. No existing logic in those handlers is removed or restructured. |
| `server/index.ts` | New, small per-endpoint mapping from staff-action outcome → `NotificationPayload` (category `undefined`/not applicable — these are User-scoped, not one of the four V1 *categories*, see §4 note below — `type`, `dedupeKey`, `context`, `priority`). Additive only. |
| `tests/` | New unit/integration test coverage for the five extended endpoints producing a correctly-shaped notification; existing endpoint tests remain otherwise unmodified. |

No `src/`, `firestore.rules`, `firestore.indexes.json`, specification,
ADR, or policy file is touched by Phase 2 as scoped. `NotificationContext`
and `Header.tsx` (already live since Phase 1) require no change — they
already render whatever exists in `notifications/{notificationId}` for
the current user; Phase 2 simply causes real documents to exist for the
first time.

**Note on "category":** 20.3's four V1 categories (`closing`,
`inventory_risk`, `subscription`, `platform_announcement`) do not
include a "staff" category. Staff-action notifications are User-scoped
(20.2) — the spec's Users section and Cross-Module Integration Summary
(Implementation Plan §8) describe them as User-scoped events, not
placed within one of the four category enum values. **This is a real
gap the Rule 8 process is designed to catch — not a Product Architect
decision this assessment is authorized to resolve.** It requires a
decision: either (a) staff-action notifications get their own event
`type` string under an existing category, or (b) `NotificationCategory`
needs a value Decision Gate 4 didn't enumerate. Flagged in §11 below as
the one item preventing an outright "Ready" classification.

## 4. Notification Ownership

Confirmed against 20.5 and the Cross-Module Integration Summary
(Implementation Plan §8):

- **Business logic remains owned by the originating module.** Staff
  suspension/reactivation/deletion/tier-change/reset-pin business rules
  live entirely in `/api/staff/*`'s existing handlers (Module #16,
  Staff & Roles) — Phase 2 adds a notification *side effect* after the
  authoritative action succeeds, it does not move or duplicate any
  staff-management rule into Module #20.
- **Module #20 only records notifications.** The new code added in
  each handler is limited to constructing a `NotificationPayload` and
  calling `writeNotification()` — no staff-action authorization,
  validation, or state-transition logic is added to or read from the
  notification path.
- **No endpoint becomes responsible for notification business rules.**
  `validateNotificationPayload()` already enforces schema shape
  (scope/businessId/userId exclusivity, category enum, required
  `context`/`priority`) inside the Phase 1 helper — the five endpoints
  call the helper, they do not reimplement its validation.

## 5. DeliveryChannel Integration

- Phase 2 writes to Firestore through the existing `writeNotification()`
  helper, which writes directly to the `notifications` collection via
  the Admin SDK — the same mechanism `InAppChannel` (Phase 1) already
  represents structurally (`channel: 'in_app'` is fixed, not
  caller-supplied, inside `writeNotification()` itself).
- **No additional `DeliveryChannel` implementation is required in
  Phase 2.** Decision Gate 3 (in-app only for V1) is unchanged; Phase 2
  is a new *producer*, not a new *channel*. Email/WhatsApp remain
  Phase 6, out of V1 scope entirely.

## 6. Notification Persistence

Confirmed against `server/index.ts` (§1) and Decision Gate 2:

- **Client creation remains prohibited.** `firestore.rules`'s
  `allow create: if false` on `/notifications/{notificationId}` is
  unconditional and untouched by this phase — Phase 2 writes exclusively
  server-side via the Admin SDK, which bypasses Security Rules by
  design (the same guarantee `subscriptions/{businessId}` already
  relies on, Module #19 Phase 1 precedent).
- **All notification creation remains privileged.** Phase 2 adds a
  second *caller* of the same privileged, server-only write path
  (`writeNotification()`) — it does not add a new creation mechanism or
  weaken the existing one.
- **Phase 2 does not bypass Phase 1's rules.** Every field
  `writeNotification()` requires (`scope`, exactly one of
  `businessId`/`userId`, `category`, `type`, `payloadRef`, `dedupeKey`,
  `context`, `priority`) must still be supplied by each of the five
  call sites — the helper's own `validateNotificationPayload()` throws
  on a missing or malformed field, so Phase 2 cannot silently produce
  an invalid document even in a bug scenario; it fails loudly instead.

## 7. Security Review

- **Tenant isolation — unchanged.** Phase 2 produces User-scoped
  documents (`scope: 'user'`, `userId` set, `businessId` null) for the
  acting-upon staff member — the existing `isNotificationRecipient()`
  read rule (§1, unmodified) already correctly scopes these to that
  one user, no different from how Phase 1 already handles any
  User-scoped document.
- **Recipient binding — unchanged.** Each of the five staff endpoints
  already knows the target user's `uid` (it's the staff member being
  acted upon) — Phase 2 uses that same, already-authenticated/verified
  identity as `userId`, introducing no new identity-resolution logic.
- **Immutability policy — satisfied.** Phase 2 documents are created
  once via `writeNotification()` and never updated by the creating
  endpoint — the existing `firestore.rules` update restriction (single
  `status` field, client-only) is unaffected and continues to apply
  identically to Phase-2-created documents as to any other.
- **Update restrictions — satisfied.** No new update path is
  introduced; the recipient's own `markAsRead()` (Phase 1, unchanged)
  remains the only way any Phase-2-created document is ever modified.

## 8. Runtime Impact

- **Expected write volume.** Bounded by staff-management action
  frequency — suspend/reactivate/delete/set-tier/reset-pin are
  low-frequency, human-initiated administrative actions, not
  high-throughput events. One notification document per staff action,
  additive to each endpoint's existing single-transaction write cost.
- **Duplicate-write risk.** Low. Unlike Phase 3's Background Worker
  triggers (which need `dedupeKey`-based crash-recovery protection
  because a scheduled sweep can re-run), each Phase 2 call site fires
  exactly once per already-idempotent, already-server-verified HTTP
  request — there is no retry/re-scan mechanism on this path that could
  produce a second write for the same event. `dedupeKey` is still
  populated (schema requires it, 20.1) but its practical collision risk
  here is materially lower than Phase 3's.
- **Idempotency.** Each endpoint's existing request-handling already
  treats the underlying staff action as a single, non-retried operation
  (per the staged partial-failure pattern already established for these
  five endpoints — `HANDOFF.md`, "Backend reliability" section). The
  notification write should follow the same staged pattern: if it fails
  after the primary staff-action mutation already succeeded, that's a
  `partialFailure`/`auditLogged`-style non-critical downstream failure,
  not a reason to fail or retry the whole request.
- **Transaction requirements.** No new distributed-transaction
  requirement — `writeNotification()` is a single-document Firestore
  write, addable to each endpoint's existing flow as one more staged
  operation, consistent with how these five endpoints already structure
  primary-mutation-then-downstream-writes.

## 9. Testing Readiness

- **Runtime tests required.** Per-endpoint test asserting: after a
  successful staff action, exactly one `notifications` document exists
  with the correct `userId`, `type`, `context`, and `priority` for that
  action; a failed/rejected staff action produces no notification
  document.
- **Firestore emulator tests required.** None new — Phase 1's rules
  (§1, above) are unchanged by Phase 2; Phase 2 exercises those
  existing rules (via server-side Admin SDK writes, which bypass rules
  entirely, and via the unchanged client read/update path) rather than
  requiring new rule coverage. The existing Phase 1 emulator-verification
  debt (noted in the close-out, still outstanding, blocked by this
  sandbox's egress) remains unchanged by Phase 2 and is not this
  phase's own new obligation.
- **Regression tests affected.** The five existing staff-endpoint test
  suites (delete/suspend/reactivate/set-tier/reset-pin) must continue
  to pass unmodified in their existing assertions, with new assertions
  *added* for the notification side effect — not a rewrite of existing
  test coverage. The staged partial-failure pattern's existing tests
  (`HANDOFF.md`, "Backend reliability") should be extended, not
  replaced, to cover the new staged notification-write step.

## 10. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Category gap (§3 note).** The four V1 `NotificationCategory` values don't include a "staff"/account-event category; staff-action notifications are User-scoped but need a `type` value that doesn't map cleanly onto any of the four category buckets as currently enumerated. | Medium — could produce inconsistent `category` values across the five endpoints if resolved ad hoc, or block clean implementation entirely if `category` is read as the wrong kind of field for this use case. | Requires a Product Architect decision before coding (see §11) — resolve whether staff-action `type` values sit under an existing category or the schema/spec needs a documented addition. Not resolved by this assessment. |
| 2 | **Partial-failure handling for the new write.** Adding a sixth staged step to five already-staged endpoints risks inconsistent error-handling if the notification write isn't wired into the existing `partialFailure`/`auditLogged` pattern the same way the other staged steps are. | Medium — a notification-write failure could either incorrectly fail an otherwise-successful staff action, or silently produce no notification with no visibility. | Follow the existing staged pattern exactly (per `HANDOFF.md`'s "Backend reliability" section) — notification write failure reported as `partialFailure`, primary action's success is never blocked by it. |
| 3 | **`context`/`priority` content quality.** Amendment v1.1 requires both populated meaningfully, not just present — five different event types (delete/suspend/reactivate/set-tier/reset-pin) each need distinct, accurate `whatHappened`/`whyItMatters`/`recommendedAction` text. | Low — a schema-valid but low-quality `context` value would pass `validateNotificationPayload()` without catching poor copy. | Content review of the five `context` payloads against Business Rule 9's intent before merge, not assumed to be correct just because it's schema-valid. |
| 4 | **`dedupeKey` construction correctness.** Even though duplicate-write risk is low (§8), a malformed `dedupeKey` shape at this phase would still be inconsistent with the deterministic shape 20.1 specifies (`{businessId\|userId}:{type}:{period-or-eventId}`), creating a bad precedent Phase 3's higher-stakes producers might copy. | Low | `dedupeKey` shape verified against 20.1 for each of the five endpoints during implementation, using each request's own unique event context (e.g., action timestamp or request ID) as the eventId component. |

No risk in this table requires reopening a Decision Gate, Business
Rule, or POL parameter — Risk 1 requires a Product Architect decision,
but that decision is a schema/category clarification, not a governance
reversal.

## 11. Readiness Classification

**Ready after minor preparation.**

**Why not "Ready" outright:** Risk 1 (§10) — the category-mapping gap
for staff-action notifications — is a genuine open question the
approved spec does not answer. 20.3 fixes exactly four categories;
none is "staff" or "account." The Implementation Plan's Phase 2
description (§9 there) assumes this mapping is obvious enough not to
need its own decision, but a fresh reading of 20.1/20.3 side-by-side
with the five staff endpoints shows it isn't — this is exactly the
kind of gap Rule 8 review exists to surface before coding starts, not
after.

**Why not "Not Ready":** every other input is resolved. Decision Gate
2 already legitimizes this creation path; the write helper, types, and
rules it depends on already exist and are verified working (§1); no
architectural blocker exists (unlike Phase 5, which is blocked on
Module #19's own Commercial Integration phase). Once Risk 1 is
resolved, this phase is a small, additive, low-risk extension of five
already-existing, already-privileged endpoints — not a redesign of
anything.

**Recommended preparation:** a single Product Architect decision on how
staff-action notifications map onto `NotificationCategory` (or whether
the enum needs a documented value the Enhancement Amendment process
would need to formally add) — not an engineering-planning detail, and
not resolved by this assessment.

---

## Deliverables

1. **File created:** `docs/engineering/20-phase2-privileged-server-rule8-assessment.md`
   (this document). No other file created or modified.
2. **Filename convention:** matches the module-prefixed
   (`20-`), phase-numbered, `-rule8-assessment` suffix pattern already
   established by `20-phase1-foundations-rule8-assessment.md` and
   `19-phase2-trial-engine-rule8-assessment.md` — the closest direct
   precedent, since both are a Phase 2 assessment following a
   closed-out Phase 1 for their respective modules.
3. **Governance documents reviewed:** `20-notifications.md` (v1.1),
   the Specification Enhancement Amendment, POL-20-001, ADR-0002, the
   Engineering Readiness Assessment, the Implementation Plan,
   `20-phase1-closeout.md`, and `platform-engineering-priorities.md`.
4. **Existing server endpoints identified for Phase 2:**
   `/api/staff/delete`, `/api/staff/suspend`, `/api/staff/reactivate`,
   `/api/staff/set-tier`, `/api/staff/reset-pin` — all five, confirmed
   present and unchanged by fresh grep against `server/index.ts` (§1).
5. **New Product Architect decisions required:** **one** — the
   category-mapping gap for staff-action notifications (§10, Risk 1;
   §11). No other open item requires Product Architect input.
6. **Risks identified:** four (§10) — category mapping (Medium, blocks
   "Ready"), partial-failure wiring (Medium), context/priority content
   quality (Low), `dedupeKey` construction (Low).
7. **Readiness classification: Ready after minor preparation** (§11) —
   pending the single category-mapping decision above.
8. **No runtime files modified.** `src/`, `server/`, `firestore.rules`,
   `firestore.indexes.json`, and all test files remain exactly as
   verified in §1 — nothing in this repository's runtime surface was
   touched to produce this assessment.
9. **Implementation has not begun.** This document does not authorize
   Module #20 Phase 2, Module #19 Phase 2, Background Worker producers,
   Subscription producers, Closing producers, Inventory Risk producers,
   Platform Announcement producers, Email, SMS, WhatsApp, push
   notifications, or any Phase 3-or-later work. Per Rule 8, actual
   coding still requires its own separate, explicit Product Architect
   go-ahead beyond reaching this assessed state — and, specifically for
   this phase, resolution of the one open decision in §11 first.
