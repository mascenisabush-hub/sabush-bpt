# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Module #10 (Stock Counts) amended and implemented this
session — **Expected Current Stock Value & Persistent Initial Stock**
([`10-expected-stock-value-amendment.md`](./docs/specs/10-expected-stock-value-amendment.md),
✅ Approved). Explicit Product Architect authorization, following the
full governance sequence (amendment → spec update → Rule 8 → plan →
implementation → verification), not a shortcut. Origin: the Customer &
Commercial Validation gate (Module #19) cannot produce meaningful
evidence if customers can't safely complete Initial Stock — this is a
controlled validation-enablement exception, not a reopening of the
wider project. Modules #18, #19, and #20 are untouched and remain in
their previously closed/accepted state.

**What changed:**

1. **Initial Stock is now Draft → Editable → Confirmed**, not a
   single-shot form. Persistent per-business draft
   (`stockCountDrafts/initial`, Owner-only), autosaved, survives
   refresh/logout/device change. Confirmation is atomic with draft
   cleanup (same Firestore batch).
2. **New `stockCounts` immutability enforcement** — `initial` count
   `update`/`delete` now refused unconditionally at the Security Rules
   layer, closing spec #10's own named Functional Requirement #5 gap.
   **One flagged consequence:** `clearAllData` can no longer delete the
   `initial` `stockCounts` document either — fixed (skips it, continues
   deleting everything else), same pattern already established for
   Closings by the Closing Integrity Amendment.
3. **New Expected Current Stock Value** (`Confirmed Initial Capital +
   StockBatch cost value`, Quebra already netted via
   `remainingQuantity`) is now Contagem's comparison baseline,
   replacing "most recent count / Initial Capital fallback" —
   supersedes spec #10's prior stated rule outright, not in parallel.
   Persisted per-count as `expectedValueAtCount` going forward;
   historical counts unchanged, not backfilled.
4. **StockBatch/Initial Stock double-counting ambiguity resolved**,
   grounded in the actual data model, not inferred: the two have never
   had any field or write path linking them, so they're separate,
   non-overlapping value pools by construction — both are always
   included, unconditionally, regardless of creation order.
5. **6 new tests** (`tests/expected-stock-value.test.ts`) verify the
   composition against the real `calculateInventoryTotals` export —
   no reimplementation of the math. New `firestore.rules` coverage for
   both the tightened `stockCounts` rule and the new
   `stockCountDrafts` rule was written but **not executable here** —
   same standing `storage.googleapis.com` emulator-download gap as
   every prior session (confirmed again this session, not assumed).
6. **Verified:** `tsc --noEmit` clean, `npm run build` clean, `npm run
   test:all` — 166/166 passing (160 pre-existing + 6 new), zero
   regressions.
7. **Nothing has been committed yet this session** — see
   `docs/engineering/10-rule8-assessment.md` and
   `10-expected-stock-value-implementation-plan.md` for the full
   governed sequence and scope boundary before committing/pushing.
8. **Second-pass fixes, from Product Architect review before commit
   authorization:**
   - **Confirmation data-flow re-verified**: `recordStockCount` never
     read `initialStockDraft`; `handleSubmit` already passed the live,
     synchronously-read `rows` state explicitly. No defect there — but
     the review correctly pushed for re-inspection rather than trusting
     the first "clean" report at face value, which is how this next
     item was actually found:
   - **Real defect found and fixed: Initial Stock draft load race.**
     `initialStockDraft === null` (AppContext's default) was
     indistinguishable from "Firestore confirmed no draft exists" —
     since `onSnapshot`'s first callback is always asynchronous, a
     previously-saved draft would essentially never load back into the
     form on a fresh mount. Fixed with a new `initialStockDraftLoaded`
     flag that only becomes true after Firestore's real first answer.
   - **Real defect found and fixed: business-switch draft staleness.**
     `InitialStockCountView` is never remounted when an Owner switches
     shops (`ShopSwitcher` lives in a permanent `Header` sibling) — its
     local `draftLoaded` latch would never re-arm for the newly active
     business. Required a fix at **two layers**: `AppContext`'s own
     `initialStockDraft`/`initialStockDraftLoaded` only reset when
     `activeBusinessId` became falsy, never on a direct A→B switch
     (now reset unconditionally on every change); and the view now
     tracks `loadedForBusinessId` and resets all local state
     (rows/date/draftLoaded) the moment `activeBusinessId` diverges
     from it, which also cancels any in-flight autosave debounce for
     the old business via the existing cleanup mechanism.
   - **Doc fix:** the amendment document had two contradictory
     `**Implementation**` lines (one saying "implemented this session,"
     one saying "none yet, before any code was touched" — a leftover
     from when the document was first drafted). Now clearly
     distinguishes drafting-time state (historical) from current status.
   - **New regression tests:** `tests/initial-stock-confirmation.test.ts`
     — 7 tests total (normal confirmation; immediate confirmation
     before debounce; last-second edit; failed-confirmation-preserves-
     draft via batch-ordering guards; no-closure-over-draft guard;
     business-switch reset-ordering guard). All source-level guards are
     labeled honestly as such — this repo has no jsdom/testing-
     library/vitest, so true component-timing tests aren't achievable
     without introducing a new test harness, which would itself be
     scope creep beyond this fix.
   - **Re-verified after both fixes:** `tsc --noEmit` clean, `npm run
     build` clean, `npm run test:all` — **173/173 passing** (166 prior
     + 7 in the new confirmation suite — the expected-stock-value suite
     stayed at 6). Firestore rules emulator re-attempted — **still
     blocked** by the same standing `storage.googleapis.com` network
     gap; not claimed as passing.
   - **Still not committed.** Awaiting Product Architect commit
     authorization per the desired final state: implementation complete
     → defects resolved → verification clean → emulator limitation
     explicitly recorded → awaiting commit.

**If the next session's task touches Module #10:** read the amendment
document's Part 7 (explicit non-goals) first — localization and a
post-confirmation correction mechanism remain open items, deliberately
out of scope for this change.

**If the next session's task is something else entirely:** verify
`docs/specs/README.md` directly rather than trusting any summary,
including this one.

---

## Prior status — Module #19 V1 close-out (superseded above, kept for continuity)

**Status:** Module #19 (Subscriptions) V1 — **formally closed**
(`docs/specs/19-v1-formal-completion-closeout.md`, decision: CLOSED —
V1 COMPLETE). Independently re-verified in a dedicated closeout audit
— all seven Engine transitions, the Manual Payment Bridge, security
boundaries, and 164/164 tests re-confirmed against the actual
repository, not assumed from any prior session's own claim. The
project has shifted to Customer & Commercial Validation.
**No further engineering work is authorized until real customer
evidence justifies it** — see
[`19-v1-customer-validation-plan.md`](./docs/engineering/19-v1-customer-validation-plan.md)
for the test design and evidence-capture template; §5 of that document
is where results go once the test actually runs — **it is currently
empty, no test has been run yet.** Verify `main` == `origin/main`
yourself before trusting anything below — this note does not update
itself.

**What's true right now:**

1. **The V1 Subscription Lifecycle Engine is complete, tested, and
   unmodified since.** `server/subscriptionEngine.ts` — all seven
   governed state transitions (trial_completed→active,
   active→grace_period, grace_period repeat-reversal no-op,
   grace_period→active recovery, grace_period→expired on time-elapse,
   expired repeat-reversal no-op, expired→active recovery), 27 tests,
   processor-independent by construction. Confirmed unchanged this
   session — its only references to any payment processor are two
   comments explicitly stating it has none.
2. **PaySuite verification stalled on document/KYB friction.**
   Investigated directly (browser session, real dashboard access) —
   confirmed a real sandbox environment, real API keys, real webhook-
   secret infrastructure exist, but payment methods were never
   activated on the account (checkout showed no M-Pesa/e-Mola/card
   options at all) — an "Integração" screen showed a pending request,
   never resolved.
3. **PayTED was investigated as an alternative — also stalled**, same
   class of account-activation friction, confirmed via the same kind
   of direct dashboard access (sandbox exists, keys exist, checkout
   had no payment methods to select).
4. **Two "too-good-to-be-true" alternative processors (NetShop,
   Debito Pay) were researched and explicitly rejected** — both had
   suspiciously complete marketing sites answering every open
   technical question perfectly, zero independent corroboration
   anywhere (no news, no registry listing, no third-party review), and
   in Debito Pay's case, a real red flag (its own "investor relations"
   page hosted under an unrelated domain). Do not pursue either without
   independent verification first (Mozambique company registry, Banco
   de Moçambique's licensed-PSP list) — flagged clearly, not silently
   forgotten.
5. **Given both real processors stalled on the same activation
   friction, the V1 launch strategy pivoted to a Manual Payment Bridge**
   — implemented this session, per explicit Product Architect
   authorization. Customer submits a payment reference (M-Pesa/e-Mola/
   Millennium BIM, `src/data/subscriptionPlan.ts` holds the real
   destination numbers) via `SubscriptionContactModal.tsx`; this only
   ever writes a `'pending'` Payment record
   (`businesses/{businessId}/payments/{paymentId}`) — never touches
   subscription state directly. Confirmation happens exclusively via
   `server/scripts/confirmPayment.ts`, run by hand with
   `FIREBASE_SERVICE_ACCOUNT_BASE64` access — deliberately NOT an
   in-app role (Module #18/SuperAdmin has no `platformRole` mechanism
   built or authorized yet; inventing one was an explicit Stop
   Condition this session correctly avoided). Confirmation calls the
   unmodified `applyLifecycleEvent()` — the Engine remains the sole
   owner of subscription-state transitions, exactly as designed.
6. **11 new tests** (`tests/payment-confirmation.test.ts`) cover
   idempotency (including the specific partial-failure scenario where
   a payment is marked confirmed but the lifecycle call fails
   separately — always safe to retry, reasoned through explicitly in
   `server/paymentConfirmation.ts`'s own header), concurrent
   confirmation, reject/confirm conflicts, and tenant isolation. New
   `firestore.rules` coverage for `payments` written but **not yet
   run** — this sandbox's standing network limitation
   (`storage.googleapis.com` not allowlisted) blocks the emulator JAR
   download, same gap as every prior session.
7. **Also fixed this session, all independently verified:** the
   missing `subscriptions` composite index for the grace-period-expiry
   sweep (was silently non-functional in production); CI now runs all
   8 test suites (was 2 of 8); a documented backup/recovery procedure;
   in-app trial/subscription status visibility (a persistent banner);
   a business-meaningful message when a write is blocked by
   subscription status (was a raw Firebase error). Railway's earlier
   deploy failure was also independently confirmed resolved (screenshot
   showed "Active," not "Failed").
8. **Nothing has been committed yet this session.** Everything above
   is sitting in the working tree, verified (`tsc --noEmit` clean, 164
   tests passing across 8 suites, build clean) but not yet reviewed as
   a final diff, not committed, not pushed — per this task's own git
   discipline instruction to hold until explicitly told.

**If the next session's task is anything Module #19 payment-related:**
read `server/paymentConfirmation.ts`'s own header first — it explains
the deliberate two-step (not-atomic) design and exactly why re-running
confirmPayment() is always safe. Do not attempt to make the Payment
transition and the lifecycle transition one atomic operation — Firestore
doesn't support nested Admin SDK transactions, and the current design
already handles the partial-failure case correctly.

**If the next session's task is something else entirely:** this file
had drifted badly stale before this rewrite (Module #20's own work,
several sessions of Module #19 governance/engine work, and this
session's implementation had accumulated with zero HANDOFF.md updates
in between) — don't assume the next drift-check will be this thorough;
verify `docs/specs/README.md` directly rather than trusting any
summary, including this one.

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
