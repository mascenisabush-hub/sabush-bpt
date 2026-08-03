# Module #20 (Notifications) — Phase 2 (Privileged-Server Creation Path) Implementation Authorization

**Type:** Governance bridge document — the formal record that
engineering governance is complete and Phase 2 is ready to be
authorized to begin. Follows the same pattern established by
[`20-phase1-implementation-authorization.md`](./20-phase1-implementation-authorization.md)
(Module #20's own precedent for this artifact type), per Stage 8 of the
[Platform Engineering Governance Standard](./platform-engineering-governance-standard.md).
**Status:** ✅ **Authorized.** Signed by the Product Architect — see
§8 "Product Architect Signature," below. Phase 2 (Privileged-Server
Creation Path) implementation, exactly as scoped by this document, is
authorized to begin.
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) (v1.2,
Accepted), [Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md)
(v1.1, Accepted), [Module #20 Category Amendment](../specs/20-notifications-category-amendment.md)
(v1.2, Accepted), [POL-20-001](../specs/20-pol-001-notification-retention-policy.md)
(Approved), [ADR-0002](../adr/ADR-0002-platform-background-worker.md)
(Approved), [Implementation Plan](./20-notifications-implementation-plan.md)
(Planned, §9), [`20-phase1-closeout.md`](./20-phase1-closeout.md)
(Closed), [Phase 2 Rule 8 Assessment](./20-phase2-privileged-server-rule8-assessment.md)
("Ready after minor preparation"), [Phase 2 Rule 8 Re-Assessment](./20-phase2-privileged-server-rule8-reassessment.md)
("Ready" — upgraded after Amendment v1.2 closed the one open item),
[Platform Engineering Governance Standard](./platform-engineering-governance-standard.md)
(Adopted).
**Repository state at drafting:** `main` HEAD `9f39737a2d39d7173c865f4b1a1ef35e939ede52`
— confirmed via fresh `git fetch origin` immediately before drafting
this document (§2, below), not assumed from any prior conversation
turn or from the Re-Assessment's own claim of its commit.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 1. Governance Verification

The following chain is complete on `main` as of the commit above, per
direct re-verification of each document's own status line — not by
reference to an earlier conversation turn's summary of them:

**Business Decision → Amendment → Policy → ADR → Implementation Plan →
Rule 8 Assessment → Rule 8 Re-Assessment → Authorization (this
document) → Implementation → Close-out**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `20-notifications.md` | ✅ Accepted (v1.2) |
| Business Decision (amendment) | Specification Enhancement Amendment | ✅ Accepted (v1.1) |
| Business Decision (amendment) | Module #20 Category Amendment | ✅ Accepted (v1.2) |
| Policy | POL-20-001 (Notification Retention Policy) | ✅ Approved, unchanged since Phase 1 |
| Architecture | ADR-0002 (Platform Background Worker) | ✅ Approved, not implicated by Phase 2 |
| Implementation Plan | `20-notifications-implementation-plan.md` | ✅ Planned (Phase 2 defined at §9) |
| Prior Phase | Phase 1 (Foundations) | ✅ Implemented, verified, **Closed** (`20-phase1-closeout.md`) |
| Rule 8 Assessment | `20-phase2-privileged-server-rule8-assessment.md` | ✅ Assessed — Ready after minor preparation |
| Rule 8 Re-Assessment | `20-phase2-privileged-server-rule8-reassessment.md` | ✅ Re-Assessed — **Ready** |
| **Authorization** | **This document** | ✅ Authorized, signed August 3, 2026 |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

No stage above was skipped, and no stage's own re-verification was
taken on the prior stage's word alone: the Re-Assessment (§4 there)
independently re-checked that Risk 1 was actually closed by Amendment
v1.2 rather than assuming the amendment's own claim, and this document
independently re-verifies repository state again below (§2) rather than
inheriting the Re-Assessment's commit reference uncritically.

## 2. Repository Verification

Performed fresh, immediately before drafting this document:

- `git fetch origin`; `main` and `origin/main` both resolve to
  `9f39737a2d39d7173c865f4b1a1ef35e939ede52`. Working tree clean.
- `grep -n "writeNotification(" server/index.ts` → exactly one match,
  the function's own definition (line 1169). **Zero callers**,
  independently re-confirmed — not inherited from either Rule 8
  document's own claim of the same fact.
- All five `/api/staff/*` endpoints (`delete`, `suspend`, `reactivate`,
  `reset-pin`, `set-tier`) confirmed present in `server/index.ts` by
  fresh grep, unchanged in signature.
- No commit exists on `origin/main` after `9f39737` touching any
  `docs/specs/20-*`, `docs/engineering/20-*`, `src/types.ts`,
  `src/context/NotificationContext.tsx`, `server/index.ts`, or
  `firestore.rules` path — confirmed by `git log 9f39737..origin/main`
  against those paths, returning no results.

**One implementation-alignment item found during verification — not a
governance blocker, recorded here rather than left implicit:**

`src/types.ts`'s `NotificationCategory` type still reads exactly
`'closing' | 'inventory_risk' | 'subscription' | 'platform_announcement'`
— **`'staff'` does not yet exist in code**, confirmed by direct
inspection. `server/index.ts` carries its own separate literal copy of
the same type (by this repository's established convention of not
importing `src/` types into `server/`, per Phase 1 Checkpoint 2's own
commit message) — that copy is likewise still the original four
values. This is expected, not a gap: Amendment v1.2 changed the
specification first, deliberately deferring the corresponding runtime
change to the phase that actually needs it — Phase 2 is exactly that
phase. **Specification says what the system should become; this
authorization says what Phase 2 is allowed to change; Phase 2
implementation performs that change.** The original Phase 2 Rule 8
Assessment's §3 statement, "no `src/` file is touched by Phase 2 as
scoped," predates Amendment v1.2 and is superseded by it, not
contradicted by it — bringing `NotificationCategory` into alignment
with the now-Accepted specification is one of Phase 2's first
implementation tasks. **This authorization's own §5 file list, below,
reflects that directly, as Implementation Alignment (§6) rather than a
risk.**

## 3. Scope Authorized (Phase 2 Only)

**Only Phase 2 — Privileged-Server Creation Path**, exactly as scoped
by the Implementation Plan (§9) and the Rule 8 Assessment (§0, §3),
re-confirmed unchanged by the Re-Assessment (§0):

- Extending each of the five existing `requireAuth`-protected
  `/api/staff/*` endpoints (`delete`, `suspend`, `reactivate`,
  `reset-pin`, `set-tier`) to call the already-existing
  `writeNotification()` helper once, inside that endpoint's existing
  transaction/staged-write flow, after its primary staff-action
  mutation succeeds.
- Constructing one `NotificationPayload` per endpoint: `scope: 'user'`,
  `userId` set to the acted-upon staff member, `businessId: null`,
  `category: 'staff'` (Amendment v1.2), a distinct `type` string per
  action, a `dedupeKey` matching 20.1's deterministic shape, and
  genuinely populated `context`/`priority` fields per Amendment v1.1's
  Business Rules 9–10 — not placeholder copy.
- Wiring the new notification write into each endpoint's existing
  staged partial-failure pattern (`HANDOFF.md`, "Backend reliability")
  — a failure writing the notification must not fail or roll back an
  otherwise-successful staff action.
- New test coverage for the five endpoints' new notification side
  effect, additive to their existing test suites.

This authorization does **not** cover any Background Worker producer,
any Subscription/Closing/Inventory-Risk/Platform-Announcement producer,
or any new `DeliveryChannel` implementation — Phase 2 is a new
*producer* using the existing in-app channel, not a new channel, per
Decision Gate 3 (unchanged).

## 4. Explicitly Excluded Work

- **Phase 3 (Background Worker Scheduled Triggers)** — Closing-overdue,
  Inventory-Risk, Subscription-companion notifications. Not authorized.
  `runTrialLifecycleSweep()` is not touched.
- **Subscription producers** — Module #19 state-transition
  notifications. Not authorized; a Phase 3 concern per the
  Implementation Plan.
- **Closing producers, Inventory Risk producers, Platform Announcement
  producers.** Not authorized. Platform Announcement broadcast
  mechanism remains unassigned to any phase, unresolved by this
  document.
- **Email, SMS, WhatsApp, or push delivery.** Not authorized — outside
  V1 scope entirely, Decision Gate 3 unchanged.
- **Any new `DeliveryChannel` implementation.** Not required or
  authorized by Phase 2.
- **Any redesign of `NotificationContext`, `Header.tsx`, or the Phase 1
  Firestore Rules.** Phase 2 causes real documents to exist for the
  first time; it does not change how they are read, rendered, or
  updated. `NotificationContext` and `Header.tsx` require no code
  change under this authorization.
- **Any Phase 4, 5, or 6 work of any kind.**
- **Reopening Decision Gates 1–3**, or any `[Amendment v1.1]`- or
  `[Amendment v1.2]`-tagged content, as anything other than the
  already-Accepted basis for this phase's implementation.

Each later phase requires its own separate Rule 8 Assessment and its
own Authorization record, following this same document's pattern.

## 5. Files Expected to Change

| File | Change | Note |
|---|---|---|
| `src/types.ts` | Add `'staff'` to `NotificationCategory`. | Implementation alignment with Specification v1.2 — see §6, below. Not listed in either Rule 8 document; Amendment v1.2 changed the specification first and deliberately deferred this runtime change to Phase 2. |
| `server/index.ts` | Add `'staff'` to its own literal `NotificationCategory` copy (~line 1077) and its `NOTIFICATION_CATEGORIES` array (~line 1097); add the five per-endpoint `NotificationPayload` constructions and their `writeNotification()` calls, each inside its existing staged-write flow. | Core of Phase 2. |
| `tests/` | New assertions on the five existing staff-endpoint test suites (or a new adjacent test file, engineering's choice at implementation time) confirming a correctly-shaped `notifications` document exists after each successful action, and that a rejected/failed action produces none. | Per Rule 8 Assessment §9. |

No `src/context/NotificationContext.tsx`, no `src/components/Header.tsx`,
no `firestore.rules`, no `firestore.indexes.json` change is authorized
or expected — all already correctly handle any document that exists in
`notifications/{notificationId}` for the current recipient, regardless
of which phase produced it (Rule 8 Assessment §3).

## 6. Risks Already Accepted Through Rule 8

| # | Risk | Status | Accepted disposition |
|---|---|---|---|
| 1 | Category gap for staff-action notifications | **Closed** by Amendment v1.2, independently re-verified in the Re-Assessment §2 | No longer a risk to accept — resolved before this authorization. |
| 2 | Partial-failure handling for the new write | Open, accepted | Must follow the existing staged `partialFailure`/`auditLogged` pattern exactly (Rule 8 Assessment §10) — a notification-write failure is a non-critical downstream failure, never a reason to fail or roll back the primary staff action. |
| 3 | `context`/`priority` content quality | Open, accepted | Schema validity alone does not guarantee good copy; the five payloads' `context` text requires content review against Business Rule 9's intent before merge, not assumed correct because `validateNotificationPayload()` accepted it. |
| 4 | `dedupeKey` construction correctness | Open, accepted | Each of the five endpoints' `dedupeKey` must match 20.1's deterministic shape (`{businessId\|userId}:{type}:{period-or-eventId}`), verified per-endpoint during implementation. |

No risk in this table requires reopening a Decision Gate, Business
Rule, or POL parameter.

## 6.1. Implementation Alignment

Phase 2 introduces the `staff` `NotificationCategory` value into
runtime code. This is an intentional implementation alignment with
Specification v1.2, not a design uncertainty and not a risk: the
specification changed first (Amendment v1.2, Accepted), deliberately
deferring the corresponding runtime change to the phase that actually
needs it, per that amendment's own "documentation only, implementation
not yet built" status. Phase 2 is exactly that phase.

**Expected runtime updates:**
- `src/types.ts` — add `'staff'` to `NotificationCategory`.
- `server/index.ts` — add `'staff'` to its own literal
  `NotificationCategory` copy and `NOTIFICATION_CATEGORIES` array.

This is not considered a governance blocker, because Specification
Amendment v1.2 explicitly deferred runtime implementation to Phase 2.
It is treated as the natural first implementation step of this phase —
performed before any of the five endpoint changes, since they depend
on `'staff'` existing as a valid enum value — not as a separate,
open-ended risk requiring its own ongoing mitigation.

## 7. Preconditions Before Coding

1. This document must be signed (§8, below) before any runtime file
   listed in §5 is touched — no work begins from an "Assessed"/"Ready"
   state alone, per the Governance Standard's Non-Negotiable Principle
   #7 ("numbering is not authorization") and the Phase 1 authorization's
   own precedent.
2. The `NotificationCategory` implementation alignment (§6.1, this
   document) should be completed first, as its own clearly-identified
   sub-step, before any of the five endpoint changes are written, since
   every subsequent change in §5 depends on `'staff'` existing as a
   valid enum value.
3. The five `context`/`priority` payloads should be drafted and
   reviewed for genuine Business-Rule-9 quality (Risk 3) before merge,
   not written once and assumed sufficient because they pass validation.
4. The existing staged partial-failure pattern (`HANDOFF.md`, "Backend
   reliability") must be read and matched exactly for the new
   notification-write step (Risk 2) — not a new error-handling
   convention invented for this one addition.
5. The Firestore emulator test debt already outstanding since Phase 1
   (this sandbox's `storage.googleapis.com` egress block) remains
   unresolved and is not newly created by Phase 2 — the Rule 8
   Assessment (§9) is explicit that Phase 2 requires no *new* rule
   coverage, since it writes exclusively server-side via the Admin SDK.
   Still owed as a manual local step, unchanged in status.
6. Per governance discipline already established twice in this
   project: any scope ambiguity discovered mid-implementation returns
   to Product Architecture, it is not resolved unilaterally by
   engineering judgment (Governance Standard, Non-Negotiable Principle
   #1).

## 8. Product Architect Signature

**Status: ✅ Signed. Authorized.**

> I have reviewed the Module #20 Phase 2 Implementation Authorization
> together with: Specification v1.2; Specification Amendment v1.2;
> Phase 2 Rule 8 Assessment; Phase 2 Re-Assessment; ADR-0002;
> POL-20-001. I confirm that all identified governance blockers have
> been resolved and that the repository is consistent with the
> approved governance state. I authorize implementation of Module #20
> — Phase 2 (Privileged-Server Creation Path) exactly as defined by
> this authorization document. This authorization applies only to
> Phase 2. It does not authorize: Phase 3 (Background Worker Scheduled
> Triggers); Phase 4 (User Experience Enhancements); Phase 5
> (Commercial Integration); Phase 6 (Future Enhancements); any work
> outside the explicitly authorized Phase 2 scope. Any additional
> scope discovered during implementation must return to Product
> Architecture for review before implementation proceeds.

**Decision:** ✅ Authorized
**Date:** August 3, 2026

**Authorization scope, upon signature:** applies only to the
implementation scope defined in §3/§5 of this document (which itself
implements the Phase 2 Rule 8 Assessment and Re-Assessment, plus the
Implementation Alignment identified in §2/§6.1). Implementation shall
remain strictly within these boundaries. No additional functionality,
architectural redesign, feature expansion, or implementation of Phase
3 or later is authorized by a signature here.

**Governance requirements attached to this authorization, in effect for
the duration of implementation, unchanged from the Phase 1 precedent:**
- Any newly discovered architectural ambiguity shall be reported
  immediately, not resolved silently.
- Any scope expansion shall return to Product Architect review before
  proceeding.
- No business rule may be changed during implementation.
- No specification, policy, or ADR may be modified unless separately
  authorized.

Implementation of the runtime files listed in §5 begins following this
signature, once this document is merged to `main` — starting with
Checkpoint 1 (§6.1's Implementation Alignment), per the same
incremental-checkpoint discipline used for Phase 1.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `docs/specs/*`, `docs/architecture/*`, or
  `docs/adr/*` file. None were touched to produce it.
- This record does not modify the Phase 2 Rule 8 Assessment, the Phase
  2 Rule 8 Re-Assessment, Amendment v1.2, or any other prior governance
  document in the chain (§1) — it sits downstream of all of them,
  authorizing based on their settled content, and separately identifies
  (§2, §5, §6.1) one runtime-alignment item those documents' own file
  lists predate, without rewriting them to retrofit that finding.
- This record does not pre-authorize Phase 3 or later — each requires
  its own Rule 8 Assessment and its own Authorization record, per §4.

**Lifecycle:** Designed → Proposed → **Authorized** (signed August 3,
2026). Implementation may now begin, strictly within §3/§5/§6.1's
boundaries.
