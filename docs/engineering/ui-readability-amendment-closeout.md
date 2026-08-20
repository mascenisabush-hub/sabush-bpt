# UI Readability Amendment — Close-Out

**Type:** Project record — a closure checkpoint, not a governance document.
Does not itself approve, redefine, or re-derive the Amendment, the Rule 8
Assessment, or the Authorization; it records that the already-authorized
scope has been implemented and verified.
**Scope:** The UI Readability Amendment, per
[`ui-readability-amendment.md`](./ui-readability-amendment.md) (✅ Approved),
assessed by [`ui-readability-amendment-rule8-assessment.md`](./ui-readability-amendment-rule8-assessment.md)
(✅ Assessed → Resolved), authorized by
[`ui-readability-amendment-implementation-authorization.md`](./ui-readability-amendment-implementation-authorization.md)
(✅ Signed, SABUSHIMIKE Masceni, Product Architect, August 19, 2026).

---

## 1. Governance Compliance

| Stage | Document | Status |
|---|---|---|
| Audit | System-wide UI Readability & Visual-Quality Audit | ✅ Delivered |
| Proposed Amendment | Sections A–C | ✅ Delivered |
| Approval | Stakeholder review | ✅ Approved |
| Amendment Record | `ui-readability-amendment.md` | ✅ Approved |
| Rule 8 | `ui-readability-amendment-rule8-assessment.md` | ✅ Assessed → Resolved |
| Authorization | `ui-readability-amendment-implementation-authorization.md` | ✅ Signed |
| Implementation | 23 items, below | ✅ Complete |
| Verification | §3, below | ✅ Passed |
| **Close-out** | **This document** | ✅ Recorded |

No specification, Amendment, Rule 8 Assessment, or Authorization was
reopened, reinterpreted, or modified during implementation. The one
scope-interpretation moment during implementation — item #6
(`DashboardView.tsx:671–686`) was cited as a line range but only line 671
actually contained the flagged `text-gray-400` pattern; lines 675/679/683
were already `text-gray-500` — was resolved by applying the fix to the one
matching line only, consistent with the Authorization's "no compensating
change, no scope expansion" constraint, and is disclosed here rather than
silently absorbed.

## 2. Implementation Summary

**23 of 23 authorized items implemented**, exactly as scoped by the
Authorization §2 (22 full items + Item #23 limited to
`BusinessDetail.tsx:108,165,177`). `BusinessDetail.tsx:264` was not modified.

**Files changed:** 15
**Lines changed:** 70 insertions / 70 deletions (git diff --stat)
**Governance docs added:** 4 (`ui-readability-amendment.md`,
`-rule8-assessment.md`, `-implementation-authorization.md`, this close-out)

| File | +/- |
|---|---|
| `apps/superadmin/src/pages/AuditTrail.tsx` | 2/2 |
| `apps/superadmin/src/pages/BusinessDetail.tsx` | 3/3 |
| `apps/superadmin/src/pages/BusinessDirectory.tsx` | 6/6 |
| `apps/tenant/src/components/AddStockView.tsx` | 4/4 |
| `apps/tenant/src/components/ClosingView.tsx` | 4/4 |
| `apps/tenant/src/components/DashboardView.tsx` | 6/6 |
| `apps/tenant/src/components/Header.tsx` | 2/2 |
| `apps/tenant/src/components/InitialStockCountView.tsx` | 6/6 |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | 9/9 |
| `apps/tenant/src/components/ProductDetailModal.tsx` | 3/3 |
| `apps/tenant/src/components/SettingsModal.tsx` | 4/4 |
| `apps/tenant/src/components/ShopSwitcher.tsx` | 2/2 |
| `apps/tenant/src/components/StocksView.tsx` | 16/16 |
| `apps/tenant/src/components/reports/ReportHome.tsx` | 2/2 |
| `apps/tenant/src/components/reports/charts/MiniCharts.tsx` | 1/1 |

Every change is a `className`/inline-`style` color-value or `font-size`
substitution, confirmed by direct inspection of `git diff`. No JSX
structure, prop, state, hook, handler, route, or business-logic line was
touched.

## 3. Verification Results

- **Typecheck — all three projects: ✅ pass, zero errors.**
  `npm run lint:tenant` (`tsc --noEmit -p apps/tenant`),
  `npm run lint:superadmin`, `npm run lint:server` all completed clean —
  re-confirmed fresh at final close-out.
- **Production build — both apps: ✅ pass.**
  `vite build` for `apps/tenant` (2,008 modules) and `apps/superadmin`
  (56 modules) both succeeded; compiled CSS confirmed to contain the new
  utility values (`text-gray-500`, `#8a6d1f`) with no purge issues.
- **Existing test suite: ✅ 654/654 runnable tests pass, 0 failures — result
  reproduced on a second, independent fresh run at final close-out (same
  654/654/0).**
  36 of 41 test files executed (`node --test` via `tsx`). **5 files were
  not executed** — they are not reported as passed — because they require
  a live Firestore emulator (`@firebase/rules-unit-testing` /
  `firebase-admin` against `localhost:8080`):
  `firestore-rules.test.ts`, `superadmin-audit-log-firestore-query.test.ts`,
  `superadmin-business-directory-firestore.test.ts`,
  `open-batch-concurrency.test.ts`, `periodic-stock-finalization.test.ts`.

  **Emulator start attempted at final close-out, confirmed blocked, not
  just assumed:** `npx firebase-tools setup:emulators:firestore` was run;
  it failed with `Error: download failed, status 403: Host not in
  allowlist: storage.googleapis.com`. The Firestore emulator binary is
  fetched from Google Cloud Storage at first use, and `storage.googleapis.com`
  is not on this environment's allowed egress list (`npm`/`pypi`/`crates`/
  `github` registries only). This is a genuine, confirmed environment
  limitation — not a workaround-able gap — and remains unresolved at
  close-out.

  **Confirmed via `git diff --stat`: none of the 5 excluded test files,
  `firestore.rules`, or `server/` was modified by this amendment** — the
  untested code paths are exactly as they were before this amendment,
  carrying no new, unverified risk forward.
- **Contrast verification — ✅ all target values pass WCAG AA (4.5:1),
  recomputed against the exact final applied hex/opacity values:**

  | Change | Old | New |
  |---|---|---|
  | `text-gray-400`→`gray-500` on white | 2.54:1 (fail) | **4.83:1 (pass)** |
  | `#D4AF37`→`#8A6D1F` on white | 2.10:1 (fail) | **4.90:1 (pass)** |
  | `#64748b`→`#94a3b8` on `#0f172a` | 3.75:1 (fail) | **6.96:1 (pass)** |
  | `text-white/40`→`/65` on navy | 3.73:1 (fail) | **7.64:1 (pass)** |
  | `text-white/35`→`/60` on navy | 3.14:1 (fail) | **6.64:1 (pass)** |

- **Visual QA — ✅ desktop (1280px) and mobile (390px), rendered with the
  actual compiled Tailwind CSS output from the modified source** (headless
  Chromium, no live backend required since these are markup/CSS
  reproductions of the exact changed JSX): confirmed no wrapping,
  clipping, truncation, or overflow at either breakpoint for every
  size-changed region (items 7, 9, 10 — the 9px→10px changes), and
  confirmed the darkened-gold and gray-500 values render as clearly
  legible, on-brand, and visually consistent with surrounding UI.
- **Scope-discipline check — ✅ confirmed no blind/global replacement
  occurred.** `#64748b` remains present, untouched, in four superadmin
  files that were never part of the authorized scope
  (`BusinessSearch.tsx`, `Operators.tsx`, `PaymentDetail.tsx`,
  `PendingPaymentsQueue.tsx`) — direct evidence the fix was applied only
  at the 23 authorized locations, not pattern-matched across the codebase.
- **`BusinessDetail.tsx:264` — ✅ confirmed untouched**, still
  `color: '#94a3b8'`, absent from the file's `git diff` entirely (only 3
  hunks present, at lines 108/165/177), no edit of any kind, per the
  Rule 8 Resolution.
- **Section B exclusions — ✅ confirmed none were touched:**
  `StockVerificationReport.tsx` (semantic zero-variance state) — not in
  diff at all; `ClosingView.tsx`'s own zero-diff `text-gray-400` (line
  ~387, `Minus`-icon neutral state) — confirmed still present, untouched,
  distinct from the one label (line 223) that *was* in scope;
  `ExpenseReport.tsx`/`WithdrawalReport.tsx` (locked-record badge) — not
  in diff; `BusinessProfileSetupModal.tsx`, `AppLoadingScreen.tsx`,
  `QuickLoginScreen.tsx`, `TimelineEventCard.tsx`, `TimelineDetailModal.tsx`
  (placeholders/empty-states/timeline captions) — not in diff.
- **Full diff content check — ✅ every one of the 70 added lines matches
  one of the five authorized target patterns** (`text-gray-500`,
  `text-[10px]`, `text-[#8A6D1F]`, `#94a3b8`, `text-white/60`/`/65`); a
  search of the entire diff for any state/prop/handler/routing/Firestore-
  write token returned zero matches.

## 4. Outcome

The UI Readability Amendment is **implemented and verified** exactly
within its authorized scope. No workflow, business logic, state, props,
hooks, handlers, routing, or data flow changed anywhere in the codebase —
confirmed both by the nature of every edit (`git diff` inspection) and by
the unchanged pass/fail behavior of the existing test suite.

## 5. Final Governance Note

This close-out has itself been re-verified once, at the requesting
stakeholder's explicit instruction, against the working tree in its final
state — not re-derived from the earlier implementation-turn's report from
memory. All figures in §2 and §3 above were re-run or re-inspected fresh
during this final pass (typecheck ×3, full 36-file test subset, `git
diff`/`git status`, per-file diff inspection, and the Firestore-emulator
start attempt). No discrepancy was found between the implementation-turn
report and this close-out beyond the one already-disclosed Item #6
clarification (§1, above).

**Working tree state at close-out:** 15 runtime files modified (70
insertions / 70 deletions), 4 governance docs added under
`docs/engineering/` (this document included). Nothing has been committed;
the working tree remains uncommitted pending your review of this
close-out. **The previously paused implementation has not been resumed**
and will not be inferred or guessed — it awaits your separate, explicit
identification.
