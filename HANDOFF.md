# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

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

**Module status (all confirmed unchanged this session — see
`docs/specs/README.md` for full detail, this is a pointer, not a
restatement):** Modules #17, #18, #19, and #20 are all
Accepted/Approved (docs & business rules) — none has implementation
authorization. Build order: `#19 → #20 → #18`; #18's own BDS
additionally gates its runtime implementation on #19/#20 holding real
data. Module #15 (AI Intelligence) remains drafted, not implemented.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Do not begin #17, #18, #19, or #20
implementation, schema, or `firestore.rules` work — not authorized.
Per this session's Platform Infrastructure finding, also hold off on
Background Worker implementation before Phase 0 completion (or an
explicit, stated Product Architect exception) — see above.

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
