# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Module #19 (Subscriptions) — **V1 Commercial Decision
Closure.** Four release-gating decisions (Plan/Pricing, Payment
Processor, Payment Reversal, Voluntary Cancellation) that were left
open at the end of the prior #19 session are now all recorded.
`main` == `origin/main` at `4110ebb` at session start (confirmed via
fresh `git clone` + `git fetch`, not assumed) — verify again before
continuing, this note does not update itself.

**What's true right now:**

1. **[POL-19-010 — Payment Reversal Policy](./docs/specs/19-pol-010-payment-reversal-policy.md)**
   is Approved. Core transition: `active → grace_period` on reversal,
   historical business data never rewritten. Both previously-open edge
   cases are resolved: a reversal arriving while already in
   `grace_period` recalculates the end date as a fresh 7 days from the
   new event (replacing, not stacking, the prior end date); a reversal
   arriving after `expired` is explicitly deferred for V1 (log-only, no
   state effect — Recovery/POL-19-007 remains the only path back).
2. **[POL-19-011 — V1 Commercial Plan, Payment Processor & Voluntary
   Cancellation Decision](./docs/specs/19-pol-011-v1-commercial-plan-processor-cancellation-decision.md)**
   is Approved: one paid plan, monthly, single business, 750 MZN/month;
   PaySuite selected as V1 processor (vendor decision only — no
   endpoint/webhook/signature/payload mechanics recorded or verified
   yet, that's still owed before any PaySuite-specific code is
   written); voluntary cancellation deferred from V1, handled
   operationally via the existing Support/SuperAdmin subscription
   override capability (Architecture §9.4/§6.7) — no new state, no new
   UI.
3. **The POL-19-009/010 identifier ambiguity is resolved.** A prior
   task prompt asserted "the existing POL-19-010 scaffold" as if it
   were already a repo file — confirmed false by direct inspection.
   POL-19-009 remains reserved (unassigned as a file) for "Early
   Renewal During Trial," a prior conversational assignment, untouched
   this session. See the Numbering Ledger addendum in
   [`19-governance-bdr-policy-framework.md`](./docs/specs/19-governance-bdr-policy-framework.md)
   for the canonical mapping — POL-19-012 remains recommended-only for
   the Business-Lifecycle/Subscription-Status question, also untouched.
4. **`docs/specs/README.md` updated** — Module #19's row and its
   "Update" notes now correctly reflect Phase 2 (Trial Engine) as
   implemented & closed (this was previously stale, still saying "not
   yet authorized"), plus references to POL-19-010/011.
5. **Nothing has been implemented.** No `src/`, `server/`,
   `firestore.rules`, or `docs/specs/19-subscriptions.md` file was
   touched this session — confirmed by diff. All new/changed files are
   `docs/specs/19-pol-010-*.md` (new), `docs/specs/19-pol-011-*.md`
   (new), `docs/specs/19-governance-bdr-policy-framework.md` (addendum
   only), `docs/specs/README.md`, and this file.
6. **Next step, not yet authorized:** a dependency-specific Rule 8
   Assessment scoped to the *minimum* V1 customer payment path only —
   `trial_completed → paid → processor confirms → verified webhook →
   active`, and `active → reversal → grace_period`. This explicitly
   does **not** mean full Phase 2 (already done), full Phase 3
   (Grace/Conversion/Recovery in general), or full Phase 5 (Commercial
   Integration in general) — see that assessment document's own scope
   section once produced. PaySuite's technical documentation must be
   verified before any processor-specific code is written, regardless
   of what this assessment authorizes.

**If the next session's task is Module #19 Phase 3/5 implementation:**
read [`19-v1-payment-path-rule8-assessment.md`](./docs/engineering/19-v1-payment-path-rule8-assessment.md)
first, and confirm its stated minimum-scope boundary before writing any
code. Do not treat "Phase 3 is required" or "Phase 5 is required" as
authorization to build the full phase — that document's own §2c lists,
by name, everything still excluded. It also flags two open items worth
carrying forward: (1) whether early payment during `trial_active`
(before natural trial completion) also converts to `active`, and (2) no
`grace_period → active` renewal path exists within the currently
authorized minimum scope — a real stopgap may be the existing
SuperAdmin manual override (Architecture §9.4/§6.7) until that's
designed properly.

**If the next session's task is something else entirely (e.g. Module
#20 Completion Review):** that work is still fully valid and unblocked
by anything above — see "Prior status" below for its own state, which
remains accurate as of `32bafbf`.

---

## Prior status (superseded above, kept for continuity)

**Status:** Module #20 (Notifications) **Phase 3 (Background Worker
Scheduled Triggers) is implemented, tested, and formally closed.**
`main` == `origin/main` at `32bafbf` (confirmed via fresh `git fetch`,
not assumed).

**What's true right now:**

1. **Phase 1, Phase 2, and Phase 3 are all implemented, verified, and
   closed.** [`20-phase1-closeout.md`](./docs/engineering/20-phase1-closeout.md),
   [`20-phase2-closeout.md`](./docs/engineering/20-phase2-closeout.md),
   [`20-phase3-closeout.md`](./docs/engineering/20-phase3-closeout.md).
2. **All six BDR-0007 `eventType`s exist and are wired**, across three
   producers: `trial-engine` (`trial.ending_soon`, `trial.ending_tomorrow`
   — Checkpoint 3), `closing-integrity` (`closing.approaching`,
   `closing.due`, `closing.overdue` — Checkpoint 4), `breakage-tracking`
   (`inventory.risk.breakage` — Checkpoint 5). Confirmed by direct grep
   at close-out, not assumed.
3. **ADR-0002, ADR-0003, ADR-0004 are all Accepted and now implemented
   in code** — `server/backgroundWorker.ts` (`registerJob()`),
   `server/notificationPlatform.ts` (`BusinessEvent` contract,
   `evaluateBusinessEvent()` pipeline), all three producers built
   against both.
4. **126/126 executable tests pass** (calculations, notification-platform,
   staff-notifications, trial/closing/breakage producers) — no
   regressions across any checkpoint. `tsc --noEmit` clean, `npm run
   build` clean. The Firestore emulator rules test remains
   execution-blocked by this sandbox's network egress allowlist (same
   standing limitation as every prior phase) — a manual local-environment
   verification step still owed before production deploy, not a code
   defect.
5. **Not yet started:** Module #20 Completion Review (module-level,
   distinct from this phase-level close-out), Phase 4 (Tenant User
   Experience beyond the existing bell dropdown), Phase 5 (Payment
   Webhook), Phase 6 (additional delivery channels), and Stock Counts
   Inventory Risk (BDR-0007 §4.2 explicit deferral — no eventType
   exists to build against). None assessed, none authorized, none
   begun.
6. **Template copy across all six eventTypes** (`en`/`pt`/`fr`) is
   first-draft engineering wording, flagged at every checkpoint as
   **not** Product-Architect-approved — open for review, doesn't block
   functional correctness.

**If the next session's task is "Module #20 Completion Review":** read
[`20-phase3-closeout.md`](./docs/engineering/20-phase3-closeout.md) and
the three phase close-outs it lists first — this review is module-wide,
not phase-scoped, and should independently re-verify ADR-0002/0003/0004
conformance and Notification Platform ownership boundaries across all
three phases, not just re-read this file's own summary of them.

**If the next session's task is something else entirely:** the two
items below are known, already-flagged debt that doesn't block
anything, but should be kept in mind — no other documentation drift is
currently known.

- Template copy (item 6, above) remains unreviewed by the Product
  Architect.
- The emulator-run manual verification step (item 4, above) is still
  owed before any production deploy touching `firestore.rules` or
  `firestore.indexes.json` changes from Phase 1–3.

The rest of this file, below this section, describes older sessions
(Module #19 Phase 1/2, the owner→admin migration) and is historical
context only — not current status.

---

## Prior status — owner→admin migration history (superseded, kept for continuity)

**Status:** Stage 2 Compatibility Gap Correction implemented, validated,
and **committed** as `2006cd6`. (Previously noted here as "not yet
committed" — that was stale; corrected on this update.)

**What this fixed:** Stage 2 (`e10dede`) started writing `role: 'admin'`
for new self-registrations, and `firestore.rules`' `isOwnerOf()` already
treated `'owner'`/`'admin'` as equivalent (Stage 1). But two application-
layer checks were never updated to match: `AppContext.tsx`'s `isOwner`
derivation (client — caused every post-Stage-2 admin account to lose all
owner-level UI capability, though the account's own single shop still
loaded via a fallback) and `server/index.ts`'s `verifyStaffManagementAction`
(server — caused `403 permission-denied` on all 5 privileged staff
endpoints: delete, suspend, reactivate, reset-pin, set-tier). This was a
functional gap, not a security issue — the failure mode was denying
access that should have been granted, never granting access that
shouldn't have been. Classified and authorized as a **Stage 2 completion
correction**, not a new migration stage, not a role redesign.

**Files changed (exactly 3, as authorized):**
- `src/types.ts` — `UserRole` widened from `'owner' | 'staff'` to
  `'owner' | 'admin' | 'staff'`.
- `src/context/AppContext.tsx` — `isOwner` now
  `role === 'owner' || role === 'admin'`.
- `server/index.ts` — `verifyStaffManagementAction`'s `isAdmin` now
  checks both values.

**Explicitly not touched, per the authorized boundary:** `AuthView.tsx`
(its separate `roleMode` login-tab UI state was investigated and
confirmed unrelated to `users/{uid}.role` — no change needed),
`firestore.rules` (already correct since Stage 1), `scripts/migrate-owner-to-admin.ts`
(Stage 3, untouched), any database document, any SaaS module (#17–#20).

**Validation completed:**
- `tsc --noEmit` — clean.
- `npm run build` (`vite build` + `build:server`) — succeeded; only
  pre-existing, unrelated warnings (CSS lint, chunk size, dynamic
  import) — no new errors.
- Diff reviewed — exactly the 3 authorized files, no unrelated changes.
- Regression check — confirmed `isStaff`/`role === 'staff'` branches
  (unaffected by the rename) remain unchanged in both files.
- **Not run at runtime** — same sandbox limitation as Stage 3: no
  Firebase network egress here, so an actual affected-account login/
  action flow has not been exercised end-to-end. That remains a manual
  verification step.

**Stage 3 (backfill) and Stage 4 (compatibility removal): unchanged by
this correction, still not executed/not authorized.**
`scripts/migrate-owner-to-admin.ts` (Analyzed, commit `0f7a4e5`) is
untouched. Per this correction's own authorization terms, no Stage 3
execution or further migration work proceeds until this checkpoint is
reviewed.

---

## Backend reliability — staff endpoints (current)

**Status:** Working tree clean, branch up to date with `origin/main`.
`f39b80f` is pushed (previously noted here as "local only, not pushed" —
that was stale; corrected on this update).

- `de328e6` (pushed) — staged partial-failure handling for
  `/api/staff/suspend` and `/api/staff/reactivate`.
- `f39b80f` (pushed) — staged partial-failure handling for
  `/api/staff/delete` and `/api/staff/set-tier`, completing the same
  pattern for the remaining two endpoints.
- `8a1e6ee` (pushed, docs-only) — aligned this file and
  `docs/architecture/04-system-architecture.md` §4.4 with the shipped
  staff-reliability pattern; no code changes.
- `480dafe`, `b394ace` (pushed, CI-only) — added a GitHub Actions
  workflow running `firestore.rules` emulator validation, plus the Java
  21 setup step the emulator requires. No application code touched; not
  previously recorded in this file.

All four privileged staff endpoints now follow the same staged pattern
(authorize → effective mutation → non-critical downstream stages
isolated so a Firestore-sync or timeline/audit failure after the
primary action already succeeded is reported as
`partialFailure`/`auditLogged: false`, not a misleading `500`):
- `/api/staff/delete`
- `/api/staff/suspend`
- `/api/staff/reactivate`
- `/api/staff/set-tier`

**`/api/staff/reset-pin` was explicitly not included** — remains on its
original error-handling shape, unchanged, out of scope for this pass.

**Nothing awaiting push.** This section is fully landed.

---

**Prior status (superseded above, kept for continuity):** Product
Architect Accepted Stage 1 and authorized Stage 2 only. Stage 2
(`e10dede`) implemented and reached Analyzed — new self-registrations
now persist `role: 'admin'` in both write paths (`AuthView.tsx`); no
other file changed; `tsc --noEmit`/`npm run build` clean;
`npm run test:rules` and a live registration smoke test both
Execution-blocked-by-environment (Firestore emulator unreachable in
this sandbox — network egress allowlist excludes
`storage.googleapis.com`).

**Latest artifact (most recent):**
`docs/engineering/phase0-owner-admin-migration-implementation-plan.md`
— a Stage 1–6 execution plan for the `owner`→`admin` rename (dual-read
rules → new-write path → backfill → identifier rename → full
verification → close the compatibility window), each stage with its
own commit boundary, verification checkpoint, rollback path, and
acceptance criteria. This is a plan document, not code — it does not
begin Stage 1 and does not itself authorize starting Phase 0A.

**Scope decisions this session (Product Architect, now settled, not
open):** rename boundary is limited to technical-authorization
identifiers (`UserRole`, `isOwnerOf`, `isOwnerOrGrantedManager`,
`ownedBusinessIds`, `isOwner`, related internal identifiers, i18n
**key names** only, test constants) — explicitly **excludes**
`ownerUid` (business-ownership field, different domain) and all
user-facing "Owner" product terminology (Owner Withdrawals, Owner
Portfolio, translated label values). Dual-read migration strategy is
adopted as the required implementation approach. Module #18's
dependency on this rename reclassified from "unaffected" to **low
dependency** (a future Support Session/impersonation feature may rely
on the renamed role model; not blocking).

**Prior artifacts (same session, earlier, unchanged):**
`docs/engineering/platform-infrastructure-readiness-assessment.md` —
Background Worker confirmed 0% built; no CI secret-scan pipeline
exists; Manager-tier migration confirmed done.
`docs/engineering/19-subscriptions-implementation-readiness.md` (v2) —
scope split, dependency analysis, Registration's non-atomic write path
flagged.

**Nothing has been implemented.** No `src/`, `server/`,
`firestore.rules`, `docs/specs/*`, or `docs/architecture/*` file has
been touched this session — confirmed by diff. All new artifacts live
under `docs/engineering/` only. Starting Stage 1 of the plan above
still requires a separate, explicit Product Architect go-ahead.

**Module status (superseded for #19 by the "Right now" section at the
top of this file — Phase 1 is implemented and closed; the note below is
stale for #19, kept for #17/#18/#20 accuracy):** Modules #17, #18, and
#20 remain Accepted/Approved (docs & business rules) — none has
implementation authorization. Build order: `#19 → #20 → #18`; #18's own
BDS additionally gates its runtime implementation on #19/#20 holding
real data. Module #15 (AI Intelligence) remains drafted, not
implemented.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Do not begin #17, #18, or #20
implementation, schema, or `firestore.rules` work — not authorized.
#19 Phase 1 is closed; #19 Phase 2 (Trial Engine) is not authorized and
has not begun — requires its own Rule 8 Assessment first (see "Right
now," top of file). Per this session's Platform Infrastructure finding,
also hold off on Background Worker implementation before Phase 0
completion (or an explicit, stated Product Architect exception) — see
above.

**Known gaps flagged but not yet scheduled:**
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `clearAllData` no longer removes Closings (they can no longer be
  deleted at all) — flagged for a product decision on whether its copy
  should change, not yet decided.
- The tenant-isolation audit findings document notes its own evidence
  is based on operator-reported terminal output/screenshot, not a
  full attached raw log file — a nice-to-have follow-up, not a
  blocker, per that document's own Section 6/Appendix A.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
