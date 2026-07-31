# Phase 0 Implementation Plan — `owner` → `admin` Terminology Migration

**Type:** Execution plan. Not code, not implementation, not authorization
to begin coding.
**Lifecycle status:** Designed → Accepted → Readiness Assessed →
Planned. **Stage 1: Designed → Implemented → Executed → Analyzed →
Accepted** (commit `699ab48`, Accepted by the Product Architect).
**Stage 2 onward: Planned only** — each remaining stage requires its
own separate, explicit authorization and reaches at most "Analyzed"
before stopping for review, per the project's stage-by-stage
governance.
**Basis:** Architecture §6.1, §13.4 (item 1); the prior readiness
assessment produced this session (superseded findings carried forward
below, not repeated in full); the Product Architect's scope decisions
recorded in this session (Decisions 1–4, and the dependency
qualification on Module #18), treated here as settled and not
re-opened.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this document.**

---

## 1. Objective

Turn the accepted migration strategy (dual-read rules → new-write path →
backfill → identifier rename → verification → close compatibility
window) into a sequence of concrete, independently-revertible
implementation stages with commit boundaries, verification checkpoints,
rollback points, and acceptance criteria — so engineering has a precise
roadmap once the Product Architect gives the separate, explicit
go-ahead to begin Phase 0A. **This plan does not grant that go-ahead.**

## 2. Scope, as Settled by the Product Architect

This plan treats the following as decided, not open:

- **In scope:** `UserRole`, all `role == 'owner'` / `role: 'owner'`
  literals, `isOwnerOf`, `isOwnerOrGrantedManager`, `ownedBusinessIds`,
  `isOwner` (and its client-side derivations), internal variable/prop
  names that encode the *technical role* (e.g. `MAX_SHOPS_PER_OWNER` →
  its renamed equivalent, `forceOwnerLogin`/`onUseOwnerLogin`),
  `ownerOnly` (the nav-tab role gate), test constants/descriptions in
  `tests/firestore-rules.test.ts`, and code comments referring to the
  role.
- **Out of scope, explicitly excluded:** `ownerUid` (business-ownership
  field — a different domain, per the Product Architect's Decision 2),
  all user-facing UI copy and i18n label *values* ("Owner", "Dono
  (Proprietário)", "Propriétaire", "Owner Withdrawals", "Owner
  Portfolio" — Decision 3), and any BDS/spec prose using "Owner" as the
  accepted product term.
- **i18n key names** (e.g. `roleOwner`, `ownerFallback`, `loginAsOwner`)
  sit at the boundary: they are code identifiers by form but carry only
  user-facing string values that are explicitly out of scope. This plan
  treats the **key names as in scope** for consistency (they are
  developer-facing, not user-facing) while leaving every translated
  **value** untouched. If this reading is wrong, it's a one-line
  correction to Stage 3 below, not a rework of the plan.

## 3. Stages

Each stage is a separate, independently-committable, independently-
revertible unit. No stage after Stage 1 removes a safety net — that
happens only at Stage 6.

### Stage 1 — Dual-read security rules

**Change:** `firestore.rules` — every check that compares the technical
role identifier against `'owner'` is updated to accept **either**
`'owner'` or `'admin'`. This applies to **every** such comparison in the
file, not only the two most prominent examples (`isOwnerOf` and the
profile-read/create rules) — it also includes
`isValidBusinessIdsChange()`'s `resource.data.role == 'owner'` check
(gates multi-shop `businessIds` growth), and any other present or future
`role == 'owner'` comparison in this file. Scoping this to "every
comparison" rather than an enumerated list is deliberate: an
enumeration risks silently missing a check and reintroducing the exact
partial-migration lockout risk this stage exists to prevent, once
Stage 3 backfills real accounts to `'admin'`. No other file changes.
**[Clarified — Product Architect, following Stage 1 Acceptance]** this
was the correct reading from the start; `isValidBusinessIdsChange()`'s
inclusion during Stage 1's implementation was consistent with intent,
not a scope expansion.
**Commit boundary:** this stage alone, nothing else. `firestore.rules`
only.
**Verification checkpoint:** `npm run test:rules` (and
`test:rules:emulator` if the Firebase emulator is available in the
target environment) — full existing suite must pass unmodified, since
every existing test still writes `role: 'owner'`.
**Rollback:** revert the single `firestore.rules` commit. No account,
new or existing, is affected either way — this stage only *widens*
acceptance.
**Acceptance criteria:** 100% of existing rules tests green; both
`'owner'`- and `'admin'`-valued profiles independently verified (via a
new, additive test) to pass every previously `isOwnerOf`-gated
operation.

### Stage 2 — New-write path

**Change:** `AuthView.tsx` — both registration write sites (currently
`role: 'owner'`) now write `role: 'admin'`. No other file changes yet;
`isOwnerOf` and `UserRole` remain untouched (rules already tolerate
both values from Stage 1).
**Commit boundary:** `AuthView.tsx` only.
**Verification checkpoint:** manual registration smoke test (new
account created, confirm `users/{uid}.role == 'admin'` in Firestore,
confirm full app functionality — dashboard, stock, closings — behaves
identically to a `'owner'`-valued account); `test:rules` still green.
**Rollback:** revert the single commit; new registrations resume
writing `'owner'`. Zero impact on any existing account either way.
**Acceptance criteria:** new accounts persist `role: 'admin'`; no
regression in any `isOwner`-gated UI path for a freshly-registered
account.

### Stage 3 — Backfill existing documents

**Change:** a one-time, idempotent script (location and invocation
mechanism to be decided at execution time — this plan doesn't specify
tooling) updates every existing `users/{uid}` document with
`role: 'owner'` to `role: 'admin'`. Idempotency requirement: running it
twice must be a no-op the second time (query only for `role == 'owner'`
documents; none should match after the first run).
**Commit boundary:** the backfill script itself, committed but not
necessarily merged into the app's runtime bundle — it's an operational
tool, not shipped code.
**Verification checkpoint:** post-run query for any remaining
`role == 'owner'` document must return zero results; spot-check a
sample of migrated accounts for full login + role-gated functionality.
**Rollback:** because Stage 1's dual-read tolerance is still in place,
a failed or partial backfill is not an outage — affected accounts
simply remain `'owner'`-valued and continue to work under the
still-active dual-read rules. Re-run is safe (idempotent). A true
rollback (reverting migrated documents back to `'owner'`) is only
needed if a downstream defect is found in Stage 3 output itself, and is
symmetric to the forward migration.
**Acceptance criteria:** zero `role == 'owner'` documents remain;
sampled accounts unaffected in behavior.

### Stage 4 — Identifier rename (the mechanical, compiler-checked step)

**Change:** `UserRole` type, `isOwnerOf` → renamed (e.g. `isAdminOf`),
`isOwnerOrGrantedManager` → renamed accordingly, `ownedBusinessIds`,
`isOwner`, `MAX_SHOPS_PER_OWNER`, `ownerOnly`, `forceOwnerLogin`/
`onUseOwnerLogin`, i18n **key names** only (not values, per §2), and all
component call sites (`Header.tsx`, `NavigationTabs.tsx`,
`SettingsModal.tsx`, `ShopSwitcher.tsx`, `StocksView.tsx`,
`ClosingView.tsx`, `QuickLoginScreen.tsx`, `DashboardView.tsx`,
`reports/BatchPerformanceReport.tsx`, `App.tsx`,
`src/data/navigationTabs.ts`), `server/index.ts`'s existing `isAdmin`
variable made to match its own name at the source-of-truth level, and
`tests/firestore-rules.test.ts` (constants, descriptions). This is the
largest-surface-area stage but the lowest-risk, since Stages 1–3 have
already made both values functionally equivalent everywhere that
matters.
**Commit boundary:** can be split further by sub-area if preferred
(rules/types first, then components, then tests) — each sub-commit
independently typechecked — but must all land before Stage 5 begins,
since a half-renamed codebase mixing `isOwnerOf`/`isAdminOf` call sites
is a maintainability risk even though not a functional one (both values
are still accepted by rules throughout this stage).
**Verification checkpoint:** `tsc --noEmit` returns to the current
zero-error baseline; `npm run build` succeeds; `test:rules` green
(tests updated to reference renamed constants/functions, still
asserting the same behavior).
**Rollback:** revert the rename commit(s); `firestore.rules` and data
are untouched by this stage (rules still say `'owner' || 'admin'` from
Stage 1; data is already `'admin'`-only after Stage 3) — this is a
pure code-identifier revert with zero data or security impact either
way.
**Acceptance criteria:** zero remaining `owner`-rooted identifiers in
the in-scope list (§2); `firebase-blueprint.json`'s `role` enum updated
to match, for consistency (confirmed not consumed by any code, so this
is a documentation-accuracy step, not a functional one).

### Stage 5 — Full-system verification

**Change:** none — this is a checkpoint stage, not a code stage.
**Verification checkpoint:** full regression pass per §9 of the prior
readiness assessment — `test:rules`, `tsc --noEmit`, `npm run build`,
manual walkthrough of every role-gated view for both a pre-migration-
style and post-migration account, Manager-tier delegation
(`isOwnerOrGrantedManager`'s renamed equivalent), and the Closing
Integrity Amendment's Owner-only reopen path.
**Rollback:** N/A (no change made at this stage); if any check fails,
return to the responsible stage above rather than proceeding.
**Acceptance criteria:** every item in this checkpoint passes with no
open discrepancy.

### Stage 6 — Close the compatibility window

**Change:** `firestore.rules` — remove the `'owner'` branch of every
dual-read check added in Stage 1, leaving `role == 'admin'` as the sole
accepted value.
**Commit boundary:** this stage alone, and only after Stage 5 passes
cleanly.
**Verification checkpoint:** `test:rules` full suite, plus a new
negative test confirming a `role: 'owner'`-valued profile (simulating a
missed backfill record) is now correctly rejected — this is the one
intentional behavior change in the entire migration, and it should be
asserted explicitly, not left implicit.
**Rollback:** revert this single commit to restore dual-read tolerance
if any `'owner'`-valued document is later discovered (e.g. an edge case
missed by Stage 3's query). This is the only stage where reverting
restores a safety net rather than merely undoing a naming change — flag
it accordingly in the PR/commit message.
**Acceptance criteria:** zero `'owner'`-valued documents confirmed
(re-verified, not assumed from Stage 3); rules suite green with the new
negative test included.

## 4. Dependency Notes (carried forward, with the Product Architect's qualification)

- **Platform Backbone / Module #19 / Module #20:** blocked/partially
  blocked as previously assessed — unchanged by this plan.
- **Background Worker:** unaffected directly; sequenced after Phase 0 as
  a whole, not by a functional dependency on this migration specifically.
- **Module #18 (SuperAdmin):** reclassified per the Product Architect's
  refinement from "unaffected" to **low dependency, not no dependency**
  — `platform_operators/{uid}` remains structurally separate from
  `users/{uid}` and unaffected today, but a future Support Session or
  impersonation feature that opens a tenant-scoped session may
  indirectly rely on the renamed role model. Not blocking; worth
  documenting accurately rather than closing the question.

## 5. What This Plan Does Not Do

- Does not begin Stage 1. Starting Phase 0A still requires a separate,
  explicit Product Architect go-ahead per Rule 8.
- Does not select backfill tooling/mechanism — an execution-time
  engineering decision within the already-approved strategy, not a
  product decision.
- Does not touch `ownerUid`, business-facing "Owner" terminology, or any
  translated UI string, per the Product Architect's Decisions 2 and 3.
- Does not alter `docs/architecture/*` or any BDS.

---

**Next step, if and when authorized:** Stage 1 only (`firestore.rules`
dual-read change), committed and verified in isolation before Stage 2
begins.
