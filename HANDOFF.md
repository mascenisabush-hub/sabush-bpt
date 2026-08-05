# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**[Corrected — this section was 13 commits stale as of 2026-08-05;**
**see "Superseded note" below.]**

**Status:** Module #20 (Notifications) Phase 3 is **authorized and
in progress.** `main` == `origin/main` at `d147106` (confirmed via
fresh `git fetch`, not assumed).

**What's true right now, in order:**

1. Phase 1 and Phase 2 remain implemented, verified, and closed (unchanged).
2. The original Rule 8 Assessment's "Not Ready" verdict was
   **superseded** by
   [`20-phase3-rule8-assessment-v2.md`](./docs/engineering/20-phase3-rule8-assessment-v2.md)
   — **Governance Readiness: Ready** — after BDR-0006/BDR-0007
   acceptance and an Implementation Plan reconciliation resolved the
   four items the original assessment flagged as blocking.
3. [`20-phase3-implementation-authorization.md`](./docs/engineering/20-phase3-implementation-authorization.md)
   is **signed** (2026-08-05), authorizing exactly three
   `BusinessEvent` producers: `closing-integrity`, `breakage-tracking`,
   `trial-engine`.
4. **Three implementation checkpoints are shipped** against that
   authorization:
   - Checkpoint 1 (`e18691b`) — `server/backgroundWorker.ts`,
     `registerJob()` abstraction; `runTrialLifecycleSweep()` migrated
     onto it, business logic byte-for-byte unchanged.
   - Checkpoint 2 (`f96c2f4`) — `server/notificationPlatform.ts`:
     `BusinessEvent` contract, dedupe/watermark
     (`platform_event_dedupe`, `platform_worker_state`), template +
     BDR-0005/0006 localization/policy pipeline. No producer wired yet
     at this checkpoint, by design.
   - Checkpoint 3 (`d147106`, HEAD) — `server/trialNotificationProducer.ts`:
     first real producer (`trial.ending_soon`/`trial.ending_tomorrow`),
     end-to-end Event → Platform → Notification pipeline proven. 9/9
     new tests; 20/20 + 58/58 + 12/12 existing suites still passing.
     Template copy is a first draft, explicitly flagged as **not**
     Product-Architect-approved wording.
5. **Not yet started:** `closing-integrity` and `breakage-tracking`
   producers (Checkpoints 4–5). Before either is coded, the
   current-period boundary derivation (`periodType`/`startDate`/
   `endDate` source for a server-side sweep — `AppContext.tsx`'s
   `isPeriodClosed()` takes these as inputs, doesn't derive them) needs
   to be traced/confirmed, and the Breakage producer needs its
   collection-group query scoped. Flagged, not solved, as of this
   commit.

**Superseded note:** the "NOT READY" status, `be0f676` HEAD claim, and
"do not start Phase 3" instruction previously in this section were
stale — written at commit `d1d46d3` and never updated across the 13
commits since. Treat any HANDOFF.md snapshot with suspicion; always
`git fetch`/`git log` before trusting it, per this file's own repeated
prior warning about exactly this failure mode.

**What's true right now, in order:**

1. **Phase 1 (Foundations) and Phase 2 (Privileged-Server Creation
   Path) are both implemented, verified, and closed.**
   [`20-phase1-closeout.md`](./docs/engineering/20-phase1-closeout.md),
   [`20-phase2-closeout.md`](./docs/engineering/20-phase2-closeout.md),
   [`20-milestone-review-phases-1-2.md`](./docs/engineering/20-milestone-review-phases-1-2.md).
2. **ADR-0002, ADR-0003, ADR-0004 are all Accepted** (Background Worker
   ownership; job-registration interface; BusinessEvent/Notification
   Platform contract) — but **none of the three is implemented in code
   yet.** `runTrialLifecycleSweep()` in `server/index.ts` remains the
   only real worker instance, still a single hardcoded `setInterval`
   with no registration mechanism.
3. **BDR-0005 (Notification Language Resolution Policy) is Accepted**
   (`docs/specs/20-bdr-0005-notification-language-resolution-policy.md`,
   commit `7b90b2c`) — the deterministic User → Business → Portuguese
   fallback chain for server-generated notification language.
4. **BDR-0006 (Notification Communication Policy) does NOT exist in
   this repository.** It was shared as chat text only, never committed.
   If its content (Notify/Batch/Suppress outcomes + priority for the
   three Phase 3 producers) is still wanted, it needs to be re-authored
   and actually committed+pushed — do not treat anything from a prior
   chat transcript as real governance state without checking `git log`
   / `git fetch origin` yourself first. This exact mistake (a real,
   properly-committed BDR-0005 from an earlier session existing only in
   that session's local, unpushed clone, then being lost when the
   sandbox ended) already happened once this project — see the Rule 8
   Assessment's own §1.1 for the fuller story.

**The Phase 3 Rule 8 Assessment's conclusion (Not Ready) rests on four
things still needing an explicit Product Architect decision, unaffected
by BDR-0005's acceptance:**

1. **ADR-0003 vs. the Implementation Plan's own Phase 3 wording.**
   `20-notifications-implementation-plan.md` §9 still says "extend
   `runTrialLifecycleSweep()`'s process... not a second process" —
   written before ADR-0003 existed and describing the hardcoded-branch
   shape ADR-0003 exists to replace. Needs an explicit Stage 6
   Implementation Plan amendment, or an explicit decision that
   ADR-0003 doesn't apply here.
2. **ADR-0004 vs. the Accepted spec's own §20.1 schema / Phase 2's
   shipped code.** The spec still has producers populate `context`
   directly (which is exactly what Phase 2's five `/api/staff/*`
   endpoints do, in hardcoded Portuguese, bypassing `LanguageContext`/
   `t()` entirely). Whether Phase 3 producers must build the full
   BusinessEvent/template/policy layer ADR-0004 describes (much larger
   scope) or continue Phase 2's direct-write precedent is undecided —
   and either way, `20-notifications.md` §20.1 needs a formal amendment
   to say which.
3. **The §4.8.1 dedupe/watermark mechanism, cited everywhere as
   "existing," has never actually been built.** `writeNotification()`
   has zero duplicate-check logic. Low-risk for Phase 2's one-shot
   writes; a real gap for Phase 3's recurring scheduled sweep. Pick one
   of Architecture §4.8.1's two named mechanisms (dedupe key as
   document ID, vs. a separate `platform_worker_state/{jobType}`
   collection) before any producer code is written.
4. **Detection thresholds undecided:** overdue-Closing day-count,
   Inventory-risk criteria, and a new "trial ending soon" threshold for
   Subscriptions (distinct from the existing trial-expiry check) —
   explicitly out of scope for both BDR-0005 and BDR-0006, still open.

**If the next session's task is "resolve these and re-run the Rule 8
Assessment":** do exactly that — re-verify each of the four items
above against a fresh `git fetch`/`git log`, don't assume anything
described in a chat transcript is already in the repo, and don't start
writing Phase 3 code until all four have an explicit, committed
Product Architect decision behind them (a spec/plan amendment or a new
BDR/ADR, the same way every prior phase in this repo has done it).

**If the next session's task is something else entirely** (a different
module, a documentation fix, etc.): the two items below are known,
already-flagged debt that doesn't block anything, but should be kept in
mind:

- `docs/specs/README.md`'s Module #20 row still reads "Phase 2...
  not yet authorized" — stale; Phase 2 is closed. Not corrected yet,
  per this repo's practice of flagging rather than silently fixing
  drift mid-unrelated-task.
- The rest of this file, below this section, describes older sessions
  (Module #19 Phase 1/2, the owner→admin migration) and is historical
  context only — not current status.

---

## Prior status (superseded above, kept for continuity)

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
