Implementation Authorization

# Implementation Authorization — Retirement of Capital Inicial as an Active Sabush BPT Business Concept

**STATUS: 🔶 DRAFT — NOT AUTHORIZED.** This document, in its current form, authorizes NOTHING. It is a governance draft only. Signing the pending block at the end of this document is the sole act that would authorize implementation, and only within the exact scope this document itself defines — no broader authority is created by drafting it, and none is created by any statement within it prior to that signature.
**Governing chain:** [Decision Proposal](./capital-inicial-retirement-decision-proposal.md) (✅ Accepted) → [Rule 8 Assessment](./capital-inicial-retirement-rule8-assessment.md) (✅ Accepted, verdict READY AFTER DECISIONS) → GOV-1 resolved ([BDR Decision 1 corrected](../specs/BDR-pending-business-worth-evolution-measurement-model.md), [Decision 39](../specs/BDR-pending-business-worth-evolution-measurement-model.md)) → GOV-2 resolved ([Architecture §5.4](../architecture/05-business-lifecycle.md), [§8.6](../architecture/08-module-architecture.md)) → [Specification §44](../specs/business-worth-evolution-specification.md) (✅ fully Accepted, §44.1–§44.3) → [Implementation Plan](./capital-inicial-retirement-implementation-plan.md) (✅ Accepted as Planned) → **this Implementation Authorization (draft)**.
**Baseline re-verified at drafting time, directly against the repository, not from memory:** `main` @ `bb57f77`, working tree clean. No contradiction found between the Decision Proposal, Rule 8 Assessment, BDR Decision 39, either Architecture amendment, Specification §44, or the Implementation Plan — each document's own top-line status text still reading its original circulated wording (e.g., Specification §44's own header literally still says "DRAFT — PENDING") is the expected, by-design artifact of this repository's append-only signing convention, not a contradiction — each document's actual, binding acceptance lives in its own appended, dated signature section, independently verified present in every document this Authorization relies on.

---

## 1. Authorization Purpose

This Authorization converts the already-accepted Implementation Plan (`docs/engineering/capital-inicial-retirement-implementation-plan.md`) into an executable authorization boundary. It does not redesign the solution the Plan already specified; it does not reopen any Product Architect decision from the Decision Proposal, BDR Decision 39, Architecture §5.4/§8.6, or Specification §44; it does not add a feature, a business rule, or an opportunistic cleanup the Plan did not already name. Implementation may occur only within the exact scope this document authorizes.

## 2. Governing Documents (Sole Basis)

1. `docs/engineering/capital-inicial-retirement-decision-proposal.md`
2. `docs/engineering/capital-inicial-retirement-rule8-assessment.md`
3. `docs/specs/BDR-pending-business-worth-evolution-measurement-model.md` — Decision 1 (corrected), Decision 39(a)–(k)
4. `docs/architecture/05-business-lifecycle.md` §5.4
5. `docs/architecture/08-module-architecture.md` §8.6
6. `docs/specs/business-worth-evolution-specification.md` §44.1–§44.3
7. `docs/engineering/capital-inicial-retirement-implementation-plan.md` (✅ Accepted as Planned) — the direct, sole source of every increment's exact scope below
8. The pre-existing, already-signed Business Worth Evolution Implementation Authorization (`docs/engineering/business-worth-evolution-implementation-authorization.md`) — reused only where an increment below explicitly says so (Increment 1's §24 correction, and the shared Case A/B calculation functions, Contagem, Cash Ledger, Receivables, Payables, and Owner-Declared Business Worth mechanics every increment below is required to leave untouched).

## 3. Scope

**Authorized:** exactly the nine increments in §5, below, each bounded to the exact files, behavior, and tests the accepted Implementation Plan already specifies for it.

**Not authorized, under any reading of this document:**
- Business Worth formula redesign (Case A, Case B, `BusinessWorthSnapshot` semantics, `producesBusinessWorthSnapshot` semantics, baseline-reset behavior).
- Any redesign of Contagem, Cash Ledger, Receivables, Payables, or Owner-Declared Business Worth.
- Any new financial feature, onboarding system, pricing model, or stock-count model.
- Deletion of historical Capital Inicial records, historical recovery records, `InitialStockCountView.tsx`, or any recovery subsystem — none of these are authorized unless a future, separate authorization explicitly says so.
- Architecture redesign beyond the two amendments already accepted (§5.4, §8.6) — no further Architecture change of any kind.
- Unrelated refactoring, dependency upgrades, or performance work not named in an increment below.
- UI redesign beyond the specific terminology/navigation changes named in Increments 4, 6, 7, 8.

## 4. Critical Product Principle — Restated, Not Redecided

**Capital Inicial is RETIRED AS AN ACTIVE SABUSH BPT BUSINESS CONCEPT.** This Authorization restates, and does not redecide, the following, all already settled by BDR Decision 39:
- No new Capital Inicial confirmation may be created — by any business, new or existing.
- No new business may use Capital Inicial as an establishment path.
- Business Worth establishment occurs exclusively through (1) confirmed Contagem or (2) Owner-Declared Business Worth — never through Capital Inicial, historical or otherwise.
- Capital Inicial never establishes, and cannot establish, a `BusinessWorthSnapshot`, under any circumstance, including via Case B's read of historical data (BDR Decision 39(k); Specification §44.3's clarification).
- Historical Capital Inicial records remain preserved, permanently, unconditionally.
- Legitimate legacy reads of historical Capital Inicial data remain, exactly where already authorized (Case B/State 1a, Product Memory, Void & Redo/SuperAdmin recovery for already-existing records) — nowhere else.
- Reading historical Capital Inicial data is not, and must never be described or implemented as, establishing Business Worth.

## 5. The Nine Authorized Increments

### Increment 1 — Fecho Baseline Correction

**Purpose:** implement the already-signed Fecho baseline correction (base Implementation Authorization §24), removing the Capital Inicial fallback.
**Exact behavior authorized:** `resolveActiveBusinessWorthBaselineDate` (`apps/tenant/src/utils/calculations.ts`, lines 1489–1507) is authorized to be changed to drop its `initialStockCount` parameter and its `initialStockCount.createdAt` fallback entirely, returning `null` whenever no active `BusinessWorthSnapshot` exists, with no other behavior change. The two call sites in `apps/tenant/src/context/AppContext.tsx` (lines 1369, 6185) are authorized to be updated to match the new signature. `ClosingView.tsx`'s existing no-baseline Owner-guidance message (already specified, Specification §18) is authorized to be confirmed/wired at whatever exact call site implementation discovers it currently lives at.
**Files authorized to change:** `apps/tenant/src/utils/calculations.ts`, `apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/components/ClosingView.tsx` (message-wiring confirmation only).
**Explicitly excluded:** any change to Case A's or Case B's own arithmetic; any change to `computeMeasuredBusinessWorth`, `getCurrentBusinessWorth`, or `getEstimatedBusinessWorth`; any change to how a `BusinessWorthSnapshot` itself is created.
**Tests required:** `tests/fecho-baseline-anchored-closing.test.ts` — test 7 updated (new expectation: `null`, not the historical date), test 8 retired (tests the removed fallback's own internal field-choice, which no longer exists), test 9 updated in its setup only (its assertion — Case A priority — is unaffected and must continue passing); tests 1–6, 10 must continue passing unmodified.
**Acceptance criteria:** AC-1 (Fecho with an active snapshot uses that snapshot's `confirmedAt`, unchanged); AC-2 (Fecho with no active snapshot returns `null`, regardless of any historical `initial` StockCount's existence, verified by unit test); AC-3 (the Owner-facing no-baseline message displays exactly the already-approved text).
**Security/data-integrity constraints:** none — pure function and display-layer change, no Firestore write, no rules change.
**Rollback:** fully independent — revert the function/call sites; affects no persisted data.

### Increment 2 — Disable New Capital Inicial Creation

**Purpose:** close the `stockCounts` create path for new Capital Inicial confirmations, surgically.
**Exact behavior authorized:** in `firestore.rules`' `stockCounts` `allow create` rule (lines 657–724), remove only the two "original confirmation" sub-branches — the legacy shape (`stockCountId == 'initial'`, no `chainPosition`) and the new full shape (`stockCountId == 'initial'`, `chainPosition == 1`, `confirmedAt == request.time`). **The three redo sub-branches (`chainPosition` 2, 3, 4) and the non-`'initial'` (periodic Contagem) branch are explicitly NOT authorized to change in any way** — per the Implementation Plan's own finding, these remain the mechanism by which Increment 3's grandfathering is achieved, automatically, without any further rules edit.
**Files authorized to change:** `firestore.rules` (the two named sub-branches only — no other line in this file).
**Explicitly excluded:** any change to `isOwnerOf`, `subscriptionAllowsNewRecords`, the redo branches, the periodic-count branch, the `allow update, delete` rule immediately below it, or any other collection's rules.
**Tests required:** `tests/firestore-rules.test.ts` — new Firestore Rules Emulator tests proving both closed shapes are denied; existing periodic-Contagem-creation tests and existing redo-creation tests (`tests/initial-stock-void-redo.test.ts`) must continue passing unmodified, run against a real emulator, not source inspection alone.
**Acceptance criteria:** AC-1, AC-2, AC-3 (as defined in the Plan's own §7) — creation denied for both closed shapes, periodic creation unaffected, redo creation unaffected, all emulator-verified.
**Security constraints:** tenant isolation, `isOwnerOf`, and `subscriptionAllowsNewRecords` on every surviving branch must be verified byte-for-byte unchanged by direct diff before this increment is considered complete. No widening of any write permission anywhere in this file.
**Data-integrity constraints:** this is a rules-only change; it deletes, rewrites, or migrates no persisted document.
**Rollback:** independent — re-adding the two removed clauses restores prior behavior exactly; affects no existing data in either direction.

### Increment 3 — Grandfather Legitimate In-Flight Recovery Windows

**Purpose:** ensure a Void & Redo cycle or SuperAdmin-Assisted Recovery already open before cutover remains valid until its own natural expiry, while no new recovery window may be initiated after cutover.
**Exact behavior authorized, per the Implementation Plan's own finding — no `firestore.rules` change of any kind is authorized for this increment.** The `voidRecords` create rule and the `stockCounts` redo branches (preserved unmodified by Increment 2) already self-limit correctly, via each record's own real `confirmedAt + 12h` window or the Authorization document's own `expiresAt`, both already compared against `request.time`, never a client-supplied value. **The one authorized change is server-side:** `grantInitialStockRecoveryAuthorization()` (`server/initialStockRecoveryAuthorization.ts`, line 126) is authorized to gain one new precondition, checked before its existing validation sequence, refusing to grant any new authorization once a fixed cutover point (defined at implementation time as the moment Increment 2 ships, using this file's own existing injected `TimestampFactory`/server clock — never a client-supplied or Owner-editable value) has passed, returning a new `{ outcome: 'retirement-cutover-reached', message: ... }` result consistent with this function's own existing pattern.
**Files authorized to change:** `server/initialStockRecoveryAuthorization.ts` only. **`server/initialStockRecoveryConsumption.ts` is explicitly NOT authorized to change** — an authorization granted before cutover must remain fully consumable after cutover, within its own already-set `expiresAt`, unchanged.
**Explicitly excluded:** any `firestore.rules` change; any change to the 12-hour Owner window figure, the 48-hour SuperAdmin figure, or the Confirmation #4 ceiling; any new recovery mechanism of any kind — this increment implements the exact mechanism the Plan and Rule 8 Finding RS-1 already resolved, not a newly invented one.
**Tests required:** `tests/superadmin-initial-stock-recovery-authorization.test.ts` — new test proving a grant before cutover succeeds unchanged; new test proving a grant after cutover is denied with the new outcome. `tests/superadmin-initial-stock-recovery-consumption.test.ts` — regression-run, confirming a pre-cutover grant remains consumable after cutover, unmodified. `tests/initial-stock-void-redo.test.ts` — regression-run, confirming redo creation is unaffected.
**Acceptance criteria:** AC-5, AC-6, AC-7 (Plan §7) — new grants refused after cutover, unaffected before cutover, and consumption of a pre-cutover grant unaffected by cutover timing.
**Security constraints:** the cutover comparison must use only the server's own trusted clock (this file's existing `TimestampFactory` pattern) — no request-supplied or Owner-editable timestamp may participate in this decision, under any circumstance.
**Rollback:** independent — removing the new precondition restores prior behavior; affects no persisted data in either direction.

### Increment 4 — Remove Capital Inicial from Active Establishment / Navigation Paths

**Purpose:** remove the three confirmed creation-entry points from normal navigation, repointing to the already-built, already-governed Contagem/Owner-Declared Business Worth choice.
**Exact behavior authorized:**
1. `DashboardView.tsx`'s primary Business Worth KPI card (`displayedBusinessWorthValue === null`) — `onClick` repointed from `onNavigateToInitialStockCount` to a chooser between the existing `stock-count` (Contagem) and `declare-worth` (Owner-Declared) nav destinations. No new establishment mechanism is authorized — only these two, already-built, already-governed screens.
2. `DashboardView.tsx`'s Business Worth Modal "Capital Inicial" row — authorized to stop offering `onNavigateToInitialStockCount` for a business with no historical record; the row itself does not render in that case.
3. `InitialStockPriceChangeModal.tsx`'s no-record fallback — authorized to remove the "create one now" offer.
4. `apps/tenant/src/i18n/locales/{en,pt,fr}.ts`, key `dashboard.kpi.initialCapital.descUnset` — copy update only, to describe the Contagem/Declare choice instead of Capital Inicial.
**Files authorized to change:** `apps/tenant/src/App.tsx` (`handleNavigateToInitialStockCount`), `apps/tenant/src/components/DashboardView.tsx`, `apps/tenant/src/components/InitialStockPriceChangeModal.tsx`, the three locale files (one key only).
**Explicitly excluded:** `InitialStockCountView.tsx` itself is NOT authorized to be deleted by this increment — it remains reachable for historical viewing/correction (Increment 5). `ProductDetailModal.tsx`'s read-only count-history display is NOT touched by this increment.
**Tests required:** a new test confirming the null-state KPI card no longer navigates to `initial-stock`.
**Acceptance criteria:** AC-8 (Plan §7) — the Dashboard CTA no longer routes to Capital Inicial creation, verified by test, not visual inspection alone.
**Data-integrity constraints:** these are navigation/display changes only — no Firestore write path is touched.
**Rollback:** independent — reverting the four `onClick`/copy changes restores prior UI behavior; affects no data.

### Increment 5 — Preserve Legacy Capital Inicial Data and Legitimate Legacy Functionality

**Purpose:** verify — not newly implement — that every mechanism BDR Decision 39(b)/(e)/(h) requires preserved remains intact after Increments 1–4 ship.
**Exact behavior authorized:** this increment authorizes no code change by default. It authorizes a regression-verification pass against: `tests/business-worth-estimated-and-dashboard.test.ts` (Case B/State 1a), `tests/product-memory-price-resolution.test.ts` (Product Memory), `tests/product-detail-modal-stock-count-history.test.ts` (historical display), `tests/initial-stock-void-redo.test.ts` (correction/recovery). **If, and only if, this regression pass surfaces an actual defect introduced by Increments 1–4, a narrowly-scoped fix confined to undoing that specific regression is authorized — no broader change.**
**Explicitly excluded:** any code change to `getEstimatedBusinessWorth`'s Case B branch, `productMemoryPriceResolution.ts`, or `InitialStockCountView.tsx`'s own internal viewing/correction logic, absent a regression actually found.
**Data-integrity constraints, restated from §7 below:** no historical `stockCounts`, `voidRecords`, `initialStockRecoveryAuthorization`, or Timeline record may be deleted, rewritten, migrated, or have its field values altered by any action taken under this increment or any other in this Authorization.
**Acceptance criteria:** AC-10 (Plan §7) — no regression in any of the four named test files.
**Rollback:** not applicable in the default case (no change made); if a narrow fix is made, it is independently revertible by definition of being narrowly scoped.

### Increment 6 — Expected Current Stock Value Terminology Correction

**Purpose:** correct the explanatory copy that currently names "Capital Inicial" for a business that no longer has, or never had, one — governed by Specification §44.1/FR-70, now fully accepted.
**Exact behavior authorized:** the hardcoded JSX copy at `apps/tenant/src/components/PeriodicStockCountView.tsx`, lines 3635–3636 (confirmed, by direct inspection, to be a hardcoded string, not an i18n key, in Portuguese only, with no `en.ts`/`fr.ts` equivalent) is authorized to change so it does not name "Capital Inicial" for a business without a preserved historical record, while remaining accurate for a business that has one. The exact replacement wording (conditional-copy vs. single-generic-copy, per the Plan's own two named options) is an implementation-time copy-writing choice, not decided by this Authorization.
**Files authorized to change:** `apps/tenant/src/components/PeriodicStockCountView.tsx` (lines 3635–3636 only).
**Explicitly excluded, absolutely:** the `expectedCurrentStockValue` formula itself (`AppContext.tsx` line 1450, `initialCapitalValue + totalInvestmentValueAllTime`) — no change of any kind is authorized to this arithmetic. This increment is copy-only. **Explicitly, this increment does NOT authorize replacing this baseline with Business Worth, Cash, Receivables, Payables, or `BusinessWorthSnapshot` in any form.**
**Tests required:** a new test asserting the explanatory copy does not contain the literal string "Capital Inicial" when `hasInitialStockCount` is false.
**Acceptance criteria:** AC-9 (Plan §7) — `expectedCurrentStockValue`'s numeric output provably identical before and after this increment, verified by unit test.
**Rollback:** independent — a single JSX text revert; affects no data.

### Increment 7 — Reports Terminology Correction

**Purpose:** implement the pre-existing, already-authorized "three-surface terminology correction" (base Implementation Authorization, Increment 10 item 7; Specification §32) — not a new item this Authorization introduces, but one this Authorization confirms remains outstanding and is now authorized to ship as part of this sequence.
**Exact behavior authorized:** the Dashboard Business Worth summary modal, `apps/tenant/src/components/reports/CapitalGrowthReport.tsx`, and `apps/tenant/src/components/reports/BusinessWorthReport.tsx` are authorized to display "Business Worth" (Estimated, where applicable) pre-establishment and "Current Business Worth" post-establishment, with historical Capital Inicial data relocated to display only, never deleted — exactly per that prior Authorization's own AC-R3-7.
**Files authorized to change:** the three files named above — labels/copy only.
**Explicitly excluded:** any change to any figure, formula, or calculation in either report — this is a label-only correction; the existing `hasInitialStockCount`-driven display branches in both report files are corrected in their labeling, not their computation.
**Tests required:** existing report tests must continue passing unmodified in their numeric assertions; new/updated assertions only for label text.
**Acceptance criteria:** labels match the already-approved AC-R3-7 wording exactly, on all three surfaces.
**Rollback:** independent — label reverts only; affects no data or calculation.

### Increment 8 — "Produtos" → "Dashboard"

**Purpose:** correct the misleading nav-tab label, per BDR Decision 39(j).
**Exact behavior authorized:** exactly the 3-string change to `nav.tabs.dashboard.label`/`.shortLabel` in `apps/tenant/src/i18n/locales/en.ts` (line 235), `pt.ts` (line 1387), `fr.ts` (line 235).
**Explicitly excluded:** the tab's `id: 'dashboard'` (`navigationTabs.ts`), its icon (`LayoutDashboard`), and its route are NOT authorized to change under any reading of this increment — no evidence in any governing document supports changing any of them, and this increment is confirmed fully independent of every other increment in this Authorization.
**Files authorized to change:** the three locale files, one key each.
**Tests required:** none — confirmed by investigation that no existing test asserts this literal string.
**Acceptance criteria:** the three strings render as intended in all three locales; `id`, route, and icon confirmed unchanged by direct code diff.
**Rollback:** trivial — three string reverts.

### Increment 9 — Regression / Test Matrix

**Purpose:** ensure the complete acceptance-level test matrix the Plan defines (§7, §2 Increment 9 table) is satisfied before this Authorization's scope is considered complete.
**Exact behavior authorized:** classification and execution of every test file the Plan's own Increment 9 table names, exactly as that table classifies each — "must remain unmodified," "must be updated," or "must be retired" — with the explicit instruction that `tests/initial-stock-confirmation.test.ts`'s exact internal reclassification (which specific test cases within it are retired vs. rewritten) remains an implementation-time task the Plan itself flagged as not fully resolved in advance, to be performed by direct inspection at that time, not guessed here or then.
**Explicitly excluded:** blind deletion of any test to make a suite pass. Every retirement must be justified by name, tied to a specific retired behavior (per the Plan's own reasoning for test 8 of `fecho-baseline-anchored-closing.test.ts`, as the model every other retirement decision must follow).
**Tests required:** the full matrix in Plan §2 Increment 9 and §7 — all twenty items the source instruction itself enumerates (Fecho with/without snapshot, creation rejected, periodic Contagem functional, Contagem/Owner-Declared establishment functional, historical readability, Case B functional and non-establishing, in-flight recovery valid, new recovery rejected, Expected Current Stock Value arithmetic unchanged, terminology correct, Product Memory functional, Dashboard navigation functional, tenant isolation intact, existing Contagem behavior non-regressed, full regression pass).
**Acceptance criteria:** every item in the above list passes, verified against a real Firestore Rules Emulator for every rules-touching assertion, not source inspection alone.
**Rollback:** not applicable — this increment is verification, not a code change in itself.

## 6. Business Worth Protection — Explicit, Absolute

**None of the following may change, under any increment in this Authorization, for any reason, including as an unintended side effect of any other increment:** Case A arithmetic; Case B arithmetic; `BusinessWorthSnapshot` semantics; Contagem's selling-price valuation; Owner-Declared Business Worth; the Cash Ledger; Receivables; Payables; baseline-reset behavior; `producesBusinessWorthSnapshot` semantics. If any increment's implementation appears to require touching any of these to succeed, implementation must **stop** and return to governance review — this is not a judgment call left to implementation.

## 7. Case B / State 1a — Explicit, Absolute

A pre-existing business already possessing historical Capital Inicial and not yet having established Business Worth through the new model **may remain in State 1a**, indefinitely, at its own pace. Case B may continue reading historical Capital Inicial to compute the already-governed Estimated Business Worth. **This is a legacy read, never a Business Worth establishment event.** It must not create a `BusinessWorthSnapshot`. No increment in this Authorization may fabricate a snapshot from historical Capital Inicial, automatically convert a historical record into a snapshot, or force any business out of State 1a.

## 8. Historical Data — Explicit Prohibitions

The following are prohibited across every increment in this Authorization, without exception:
- Deletion of any historical `stockCounts/initial*`, `voidRecords`, or `initialStockRecoveryAuthorization` record, or any related Timeline record.
- Rewriting any such record's field values.
- Any destructive migration of any kind.
- Fabrication of historical data of any kind.
- Backfilling `producesBusinessWorthSnapshot` onto any historical record.
- Rewriting Timeline history.
- Altering historical price-memory evidence read by `productMemoryPriceResolution.ts`.
- Any change to the existing immutable-historical-record rules (the unconditional `allow update, delete: if false`-equivalent protection already governing these collections).

## 9. Security Requirements

- Tenant isolation must remain structurally intact across every touched rule — verified by direct diff against the pre-change rule text, not by behavioral testing alone.
- Every `isOwnerOf` check on a surviving branch must remain byte-for-byte unchanged.
- SuperAdmin authorization boundaries (`requirePlatformOperator`, `requireSuperAdmin`) in `server/initialStockRecoveryAuthorization.ts` must remain unchanged except for the one new precondition Increment 3 authorizes.
- No cross-business query of any kind may be introduced by any increment in this Authorization.
- No client-controlled authorization state, and no client-controlled or Owner-editable cutover timestamp, may be introduced anywhere — Increment 3's cutover check must use only a server-side clock/constant.
- No `firestore.rules` change beyond the two named sub-branches in Increment 2 is authorized — no broad rewrite of this file.
- No write permission may be widened anywhere, in any increment.

## 10. Test Requirements — Consolidated

Every item the source instruction's own twenty-point list enumerates is required, mapped to the increment that produces it (§5, above, and the Plan's own §7/§2 Increment 9 table). No increment is complete until its own named tests pass against a real Firestore Rules Emulator wherever rules are touched, not source inspection alone. Existing tests currently exercising retired creation behavior must be explicitly reclassified (remain / rewrite / retire) with a stated reason per test, mirroring the reasoning already modeled for `fecho-baseline-anchored-closing.test.ts` test 8 — never silently deleted to make a suite pass.

## 11. Failure Safety

- No partial migration, no destructive migration, no fabricated snapshot, and no silent data conversion is authorized under any increment, at any time.
- No increment may be considered complete while leaving `firestore.rules` and application behavior in an inconsistent authorization state (e.g., a rules change shipped without its corresponding UI change, or vice versa, within the same increment's own scope).
- Each increment must be verified independently before the next begins.
- Where a change could affect an existing business (Increments 2, 3 specifically), the rollback procedure named in the Plan's own §8 table applies without modification.
- **If any increment cannot be implemented without violating an acceptance criterion already fixed by this Authorization or the governing chain behind it, implementation must stop and return to governance review — this is not resolvable by implementation-time judgment.**

## 12. Implementation Sequencing

The nine increments in §5 must be implemented in the exact order given, one at a time:
1. Read the increment's own scope in this document (not the Plan directly, though the Plan remains the record of *why*) before writing anything.
2. Verify the increment's own prerequisites are actually complete and verified — not merely started — before beginning.
3. Implement only that increment's own authorized scope — no increment may implement any later increment's functionality, even incidentally.
4. Run every test this document's §5 names for that increment, including any newly-required regression check.
5. Inspect the diff — confirm no file outside that increment's own authorized file list was touched.
6. Verify compliance against the specific acceptance criteria this document names for that increment.
7. Record the result.
8. Only then proceed to the next increment.

**No increment may be skipped ahead of an earlier, unverified one. No two increments may be combined for convenience. This Authorization does not permit implementing all nine increments in one pass.**

## 13. Scope Protection — Explicit, Exhaustive

**Not authorized by this document, under any circumstance:** Business Worth formula redesign; any new financial feature; a new onboarding system; a new pricing model; a new stock-count model; redesign of Contagem, the Cash Ledger, Receivables, or Payables; deletion of historical Capital Inicial data; deletion of historical recovery records; deletion of `InitialStockCountView.tsx` (unless separately authorized in the future); deletion of any recovery subsystem (unless separately authorized in the future); any Architecture change beyond the two amendments already accepted (§5.4, §8.6); unrelated refactoring; dependency upgrades; performance work unrelated to the nine increments above; any UI redesign beyond the specific terminology/navigation changes named in Increments 4, 6, 7, 8.

## 14. Final Authorization Boundary

**Acceptance of this Implementation Authorization will authorize implementation.** It authorizes, exactly and only, the nine increments and exact scope defined in §5–§13 above. Anything outside that scope — including anything that might seem like a natural or convenient extension of it — requires its own, new, separate governance decision and/or authorization. The Product Architect's signature below is the final gate before any code, test, `firestore.rules`, or `firestore.indexes.json` file may be touched in furtherance of this capability.

---

## Product Architect Authorization — Pending

> I have reviewed this Implementation Authorization for the Retirement of Capital Inicial, covering all nine increments (§5), the Business Worth protection boundary (§6), the Case B/State 1a preservation requirement (§7), the historical-data prohibitions (§8), the security requirements (§9), the test requirements (§10), failure safety (§11), implementation sequencing (§12), and scope protection (§13). I understand that signing below authorizes implementation of exactly, and only, this document's defined scope — one increment at a time, per §12's own discipline — and that anything outside this scope requires a separate, future governance decision.
>
> **Product Architect:** ______________________________
> **Date:** __________________________________________
> **Decision:**
> ☐ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

---

## Product Architect Authorization — Recorded

**Status: ✅ AUTHORIZED FOR IMPLEMENTATION — SIGNED (31 August 2026).** Recorded additively below, per this repository's established signature-recording convention — the pending block immediately above is preserved unedited, blank lines and unchecked boxes included, as the historical record of what was circulated for review; this section is the actual, dated act of signature.

> I have reviewed and ACCEPT this Implementation Authorization for the Retirement of Capital Inicial, in full, as drafted — all nine increments (§5), the Business Worth protection boundary (§6), the Case B/State 1a preservation requirement (§7), the historical-data prohibitions (§8), the security requirements (§9), the test requirements (§10), failure safety (§11), implementation sequencing (§12), and scope protection (§13).
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ AUTHORIZED FOR IMPLEMENTATION

**This signature authorizes implementation of exactly, and only, this document's defined scope (§3, §5, §13) — one increment at a time, per §12's own execution discipline. No increment may begin ahead of an earlier, unverified one. Anything outside this document's defined scope, including any wording adjustment discussed but not incorporated into this signed text (see the open item below), requires its own separate governance action before it applies.**

**Open item, not resolved by this signature:** during the Rule 8-adjacent review preceding this signature, a narrower internal framing for Increment 3 was discussed (splitting its content into "3a — Owner-side grandfathering, verification only, no code" and "3b — SuperAdmin grant-side cutover enforcement, the one required server change") as a wording clarification, not a scope change. **That wording change was not incorporated into the text being signed here** — this signature authorizes Increment 3 exactly as it reads in §5 above, unmodified. If the Product Architect wants that clarification reflected in the authorized text, it requires its own separate, explicit instruction and its own additive record, mirroring how every other change in this governance chain has been made.
