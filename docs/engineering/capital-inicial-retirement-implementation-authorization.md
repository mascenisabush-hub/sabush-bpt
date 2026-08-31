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

---

## Amendment 1 — Increment 3 File Scope (Narrow, Additive)

**Status: ✅ ACCEPTED WITH MODIFICATION (31 August 2026).** Recorded additively below, per this document's own established signature-recording convention (see the "Recorded" section above) — everything above this line, including §5's own text and the original signature block, is preserved completely unedited as the historical record of what was originally signed. This section is a separate, later, dated act.

**Context:** during Increment 3 implementation inspection (still pre-code, no file other than this one touched), a concrete integration gap was identified. §5's Increment 3 text authorizes exactly one file, `server/initialStockRecoveryAuthorization.ts`, for the new `retirement-cutover-reached` outcome `grantInitialStockRecoveryAuthorization()` is authorized to return after cutover. That outcome is consumed by the existing route in `server/index.ts` (`POST /api/superadmin/initial-stock-recovery/:businessId/authorize`), which currently handles every existing outcome explicitly and otherwise falls through to granted-success handling — accessing `result.businessId`, `result.targetStockCountId`, and `result.expiresAt.toMillis()`. None of these exist on the new outcome. Introducing the new outcome without a corresponding route branch would not fail to compile in this repository's current tsconfig (the route's `result` variable is untyped `let result;`, so this is not caught at build time) — it would instead surface as a real runtime defect: every post-cutover authorization request would hit a thrown exception outside the route's own try/catch, instead of the intended controlled denial.

**Amendment — Increment 3 file scope is widened by exactly one file, for exactly one purpose:**

`server/index.ts` is now additionally authorized, **solely** for adding the one necessary route branch that explicitly handles the `retirement-cutover-reached` outcome and returns an appropriate non-success HTTP response, following the route's own existing pattern for its other non-`granted` outcomes (e.g. the `409` pattern already used for `authorization-already-active`). This is the only authorized change to `server/index.ts` under this amendment.

**Not authorized by this amendment, under any reading:** any other change to `server/index.ts`; redesign of the route; changes to any existing outcome's handling; changes to `requirePlatformOperator` or `requireSuperAdmin`; changes to the 48-hour authorization window, the 12-hour Owner Void & Redo window, or the Confirmation #4 ceiling; changes to the cutover decision itself; any `firestore.rules` change; any change to `server/initialStockRecoveryConsumption.ts`; any UI change; any Business Worth calculation change; any change to historical Capital Inicial records; any new recovery mechanism; any cross-business query; any client-controlled cutover timestamp.

**Updated Increment 3 authorized file list:**
1. `server/initialStockRecoveryAuthorization.ts` (as already authorized in §5)
2. `server/index.ts` (newly authorized by this amendment, for the single named purpose above only)

No other file is authorized for Increment 3.

**Updated Increment 3 test requirements — additive to §5's original list:** because `server/index.ts` is now in scope for this one narrow purpose, minimum-necessary integration coverage proving (a) pre-cutover grant behaves exactly as before, (b) post-cutover grant returns the controlled retirement response rather than falling through to success handling, (c) no audit-log entry is written as though a grant occurred on the post-cutover path, and (d) an authorization granted before cutover remains consumable after cutover. No broader new API test coverage is authorized by this amendment.

**Not a redecision:** this amendment does not change the underlying Product Architect decision, the cutover policy itself, the recovery windows, historical-data preservation, or any other part of this Implementation Authorization. It closes an integration gap discovered while implementing already-authorized Increment 3 behavior — nothing more.

> I have reviewed the identified Increment 3 integration conflict and authorize the narrow amendment above. I specifically authorize `server/index.ts` solely to handle the `retirement-cutover-reached` outcome returned by `grantInitialStockRecoveryAuthorization()`. No other expansion of Increment 3 scope is authorized. This amendment does not change the underlying Product Architect decision, cutover policy, recovery windows, historical-data preservation, or any other part of the Implementation Authorization.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ACCEPTED WITH MODIFICATION

---

## Amendment 2 — Increment 7 Establishment-State Signal (Narrow, Additive)

**Status: 🔶 PENDING — NOT YET AUTHORIZED.** Drafted below per this document's own established additive-amendment convention (see Amendment 1, above) — everything above this line, including §5's own Increment 7 text and every prior signature block, is preserved completely unedited as the historical record. This section is a separate, later, pending act. **Signing the pending block at the end of this section is the sole act that would authorize it** — drafting it authorizes nothing by itself.

**Context:** during Increment 7 implementation inspection (pre-code — no file other than this one touched), a concrete scope conflict was identified, distinct in kind from Amendment 1's integration gap but requiring the same discipline. §5's Increment 7 text states that `CapitalGrowthReport.tsx` and `BusinessWorthReport.tsx` already have "existing `hasInitialStockCount`-driven display branches" for the Business Worth figure, needing only their labeling corrected, not their computation. Direct inspection of both files' current content contradicts this specific factual premise:

- Neither file references `businessWorthSnapshots`, `currentBusinessWorth`, `estimatedBusinessWorth`, or any equivalent Estimated/Current establishment-state signal — confirmed by direct search, zero matches in either file. Both still compute their headline Business Worth figure exclusively from the legacy, unconditional formula (`AppContext.tsx`: `businessWorth = totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`), which has no Estimated/Current concept of any kind.
- The `hasInitialStockCount`-driven branches that DO exist in both files govern a different KPI entirely — the separate "Capital Inicial" value display (showing "not defined" vs. a figure) — not the Business Worth label §5's Increment 7 text is actually about, which is currently unconditional (always the same label) in both files.

This is not a disagreement with §5's underlying requirement (AC-R3-7's substantive wording is not in question and is not reopened by this amendment) — it is a factual correction to the *mechanism* §5 describes for satisfying it. Mechanically implementing §5 exactly as worded — treating `hasInitialStockCount` as the pre/post-establishment proxy for these two files' Business Worth label — would produce an actual, ongoing defect: since Increment 4 (already shipped) retired Capital Inicial as an establishment path, every new business going forward has `hasInitialStockCount === false` permanently, regardless of whether it has fully established Business Worth via Contagem or Owner-Declared Business Worth. Such a business's genuinely current, established figure would be mislabeled "Estimated" forever — not a copy nuance, a standing inaccuracy AC-R3-7 itself would not consider correct ("Current Business Worth post-establishment (either method)").

**No upstream contradiction found.** This amendment is confined to this Implementation Authorization. Direct inspection found no conflict with BDR Decision 39, the Architecture amendments (§5.4/§8.6), Specification §44 or §32, Rule 8, or the Implementation Plan's own governing requirement for Increment 7 — only with the Plan's and this Authorization's shared factual description of a mechanism that does not presently exist in the named files. AC-R3-7's substantive wording (Business Worth (Estimated) pre-establishment, Current Business Worth post-establishment) is restated, not redecided, by this amendment.

**Amendment — the state signal these two files are authorized to read, for label selection only:**

`CapitalGrowthReport.tsx` and `BusinessWorthReport.tsx` are authorized to destructure `businessWorthSnapshots` from `useApp()` (`AppContext.tsx` line 507 — already exported, already read by other components, no new context field, no new query) and derive, locally in each file, the identical one-line boolean `DashboardView.tsx` already computes and already relies on today (`DashboardView.tsx` line 200): `hasActiveBusinessWorthSnapshot = businessWorthSnapshots.some((s) => s.status === 'active')`. This exact derivation — not a new one, not a variant, not `displayedBusinessWorthIsEstimated`'s fuller value-selection logic, which remains DashboardView.tsx-only and is not required here — is the sole state signal these two files are authorized to read, and the sole purpose it may be read for is selecting which of the two label variants (Estimated / Current) to display. Everything else about how each file computes or displays its Business Worth figure is unchanged.

**The boundary is absolute:**
- ✅ Reading `businessWorthSnapshots` (already-exported context data) to derive `hasActiveBusinessWorthSnapshot`, solely to select a label, is authorized.
- ❌ Changing the `businessWorth` calculation, or any other figure, in either report is not authorized.
- ❌ Changing any financial figure anywhere is not authorized.
- ❌ Changing `BusinessWorthSnapshot` creation or semantics is not authorized.
- ❌ Changing Case A/B arithmetic is not authorized.
- ❌ Introducing a new query, a new financial calculation, or a new establishment mechanism is not authorized.
- ❌ Using `currentBusinessWorth`/`estimatedBusinessWorth` to change which *value* is displayed is not authorized by this amendment — only the *label* on the existing, unchanged `businessWorth` figure may be selected via the new signal. (If a future increment wants the displayed figure itself to switch to `currentBusinessWorth`/`estimatedBusinessWorth`, that requires its own separate authorization — not implied or pre-approved here.)

**Updated Increment 7 authorized file list — unchanged in count, clarified in mechanism:**
1. `DashboardView.tsx` (the Dashboard Business Worth summary modal only) — as already authorized in §5, no change by this amendment; the existing `displayedBusinessWorthIsEstimated` signal it already uses remains correct and is not touched.
2. `apps/tenant/src/components/reports/CapitalGrowthReport.tsx` — as already authorized in §5, mechanism clarified: label selection now reads `hasActiveBusinessWorthSnapshot` (derived as specified above), not `hasInitialStockCount`.
3. `apps/tenant/src/components/reports/BusinessWorthReport.tsx` — as already authorized in §5, mechanism clarified: label selection now reads `hasActiveBusinessWorthSnapshot` (derived as specified above), not `hasInitialStockCount`.

No other file is authorized for Increment 7 by this amendment. This amendment does not split Increment 7 into separate increments — all three surfaces remain one coherent increment, per §5's own framing, corrected only in how two of the three surfaces determine which label to show.

**Updated Increment 7 acceptance criteria — additive to §5's original list:**
- AC-R3-7 (restated, not redecided): labels match the already-approved wording exactly, on all three surfaces.
- **AC-R3-7-amend-1:** a business with no historical Capital Inicial record (`hasInitialStockCount === false`) but an active `BusinessWorthSnapshot` (`hasActiveBusinessWorthSnapshot === true`) receives the "Current Business Worth" label on all three surfaces — never the Estimated label. This is the specific defect this amendment exists to prevent, and must be verified by test, not visual inspection alone.
- **AC-R3-7-amend-2:** the `businessWorth` figure displayed alongside the label is numerically identical before and after this increment, on all three surfaces — verified by unit test, confirming the label-only nature of this correction.

**Updated Increment 7 test requirements — additive to §5's original list:** new tests proving, for both report files, that the label reads "Current Business Worth" when `hasActiveBusinessWorthSnapshot` is true regardless of `hasInitialStockCount`, and "Business Worth (Estimated)" when it is false, mirroring AC-R3-7-amend-1 directly. Existing report tests must continue passing unmodified in their numeric assertions, per §5's original requirement, unchanged by this amendment.

**Not a redecision:** this amendment does not change AC-R3-7's substantive wording, the underlying Product Architect decision behind the three-surface terminology correction, Capital Inicial's retirement status, or any figure, formula, or calculation anywhere in this Authorization or its governing chain. It corrects a factual description of an implementation mechanism, and authorizes the minimum read-only signal necessary to implement §5's own already-approved requirement correctly.

## Product Architect Authorization — Amendment 2 — Pending

> I have reviewed the identified Increment 7 mechanism conflict and the proposed narrow amendment above. I understand that signing below authorizes, exactly and only, `CapitalGrowthReport.tsx` and `BusinessWorthReport.tsx` to read `businessWorthSnapshots` (already-exported context data) to derive `hasActiveBusinessWorthSnapshot`, solely for Business Worth label selection, with every other boundary in this amendment remaining absolute. I understand this does not change AC-R3-7's wording, does not authorize any figure/formula/calculation change, and does not split Increment 7.
>
> **Product Architect:** ______________________________
> **Date:** __________________________________________
> **Decision:**
> ☐ AUTHORIZED FOR IMPLEMENTATION
> ☐ AUTHORIZED WITH MODIFICATIONS (specify)
> ☐ NOT AUTHORIZED

---

## Product Architect Authorization — Amendment 2 — Recorded

**Status: ✅ ACCEPTED WITH MODIFICATION (31 August 2026).** Recorded additively below, per this document's own established signature-recording convention (see the base "Recorded" section and Amendment 1's own "Recorded" acceptance, above) — the pending block immediately above is preserved unedited, blank lines and unchecked boxes included, as the historical record of what was circulated for review; this section is the actual, dated act of signature.

> I have reviewed the identified Increment 7 mechanism conflict and ACCEPT the narrow amendment above, exactly as drafted. I authorize, exactly and only, `CapitalGrowthReport.tsx` and `BusinessWorthReport.tsx` to read `businessWorthSnapshots` (already-exported context data) to derive `hasActiveBusinessWorthSnapshot`, solely for Business Worth label selection, with every other boundary in this amendment remaining absolute. This does not change AC-R3-7's wording, does not authorize any figure/formula/calculation change, and does not split Increment 7.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ACCEPTED WITH MODIFICATION

**This signature authorizes implementation of exactly, and only, Amendment 2's defined scope, above — the updated Increment 7 authorized file list (3 files, mechanism clarified for two of them) and the two additive acceptance criteria (AC-R3-7-amend-1, AC-R3-7-amend-2). No other expansion of Increment 7, or any other increment, is authorized by this signature.**

---

## Increment 9 Verification Record — 31 August 2026

**Status: 🔶 INCREMENT 9 — CONDITIONALLY COMPLETE / EMULATOR VERIFICATION OUTSTANDING.** Recorded additively below, per this document's own established convention (see Amendment 1 and Amendment 2, above) — everything above this line is preserved completely unedited as the historical record. This section records the result of executing §5 Increment 9 and §12 sequencing step 7 ("Record the result") against the Plan's own §2/§7 Increment 9 matrix. It is a verification record, not an amendment — it authorizes no new scope, changes no acceptance criterion, and reopens no prior decision.

**Governing basis re-read directly from this repository before recording, per §12 sequencing step 1:** this document's own §5 Increment 9, §10 (Test Requirements — Consolidated), and the Implementation Plan's own Increment 9 matrix (`capital-inicial-retirement-implementation-plan.md`, "Increment 9 — Test and Regression Matrix").

**Non-emulator matrix — executed:**
- 899 tests executed across the Plan's own §2 Increment 9 table (every named file, classified and run exactly as that table classifies each), plus Increment 7's own required suite.
- **895 passed. 4 pre-existing failures** — none introduced by Increment 7, 8, or 9: `tests/stock-count-label-undefined-fix.test.ts`, `tests/stock-count-row-grouping.test.ts`, `tests/periodic-stock-multi-portion-valuation.test.ts`, `tests/periodic-stock-shop-switch-guard.test.ts`. Each was independently reproduced at baseline commit `2dc9b7c` (the commit immediately preceding Increment 7) via a temporary `git worktree`, confirming all 4 predate Increments 7–9 and are unrelated to Capital Inicial Retirement. **Per §5 Increment 9's own "explicitly excluded" clause (no blind deletion or fix to make a suite pass) and this record's own governing instruction, none of these 4 were modified, fixed, or reclassified under this Authorization.** They remain open, named here so they are not silently lost, for separate triage outside this Authorization's scope.
- `npx tsc --noEmit -p apps/tenant`: clean.
- Increment 7's own regression suite (`tests/increment-7-report-terminology.test.ts`): 26/26 pass, re-confirmed.
- Increment 8 remains implemented and pushed (commit `f9470fc`), unaffected.
- Working tree confirmed clean throughout; no worktree, branch, or file residue remains from this verification pass.

**Emulator-gated matrix — outstanding, not verified:**
This environment cannot reach the Firestore Rules Emulator — `firebase emulators:exec` fails directly with `Error: download failed, status 403: Host not in allowlist: storage.googleapis.com`, a network egress restriction of this sandbox, not a code or governance defect. Per §5 Increment 9's own acceptance criterion ("verified against a real Firestore Rules Emulator for every rules-touching assertion, **not source inspection alone**") and §10's restatement of the same bar, source-level regression coverage is **not** treated as a substitute here, and none is recorded as satisfying these items:
- **AC-1** — creation denial for both closed `stockCounts/initial` branches, real-emulator verification outstanding.
- **AC-2** — non-`'initial'` creation continuing to succeed unchanged, real-emulator verification outstanding.
- **AC-3** — redo creation (`initial-2`/`initial-3`/`initial-4`) continuing to succeed unchanged, real-emulator verification outstanding.
- **AC-12** — before/after data-snapshot comparison proving zero historical document is deleted, rewritten, or altered, real-emulator verification outstanding.

`tests/firestore-rules.test.ts` (180 tests) and `tests/periodic-stock-finalization.test.ts` (9 tests) were run and directly confirmed cancelled — 0 pass, 0 fail, cancelled at `initializeTestEnvironment` — not silently skipped or assumed.

**Recorded conclusion:** Increment 9 is **CONDITIONALLY COMPLETE** on everything this environment can verify. It is **not** recorded as fully complete, and this Authorization's overall scope (§14) is **not** declared complete by this record. **Final closure of Increment 9 — and of this Authorization — requires running the emulator-dependent tests named above (at minimum `tests/firestore-rules.test.ts` and `tests/periodic-stock-finalization.test.ts`, covering AC-1, AC-2, AC-3, and AC-12) in a network-unrestricted environment (local development machine or CI) and recording their results in a future dated addition to this section, following this same additive convention.**

No code, test, `firestore.rules`, `firestore.indexes.json`, or governance-scope file was changed by this record.

---

## Increment 9 Verification Record — Update — 31 August 2026

**Status: 🔶 INCREMENT 9 — AC-1/AC-2/AC-3 VERIFIED; AC-12 OUTSTANDING (MISSING TEST, NOT AN ENVIRONMENT LIMITATION).** Recorded additively, per this document's own established convention. Nothing above this line is edited — this entry both records new results and corrects an imprecision in the entry immediately above it, additively, in the open, rather than by silent edit.

**Emulator results supplied by the Product Architect,** run outside this sandbox against a real Firestore Rules Emulator via this repository's own `npm run test:rules:emulator` and `npm run test:periodic-stock-finalization:emulator` scripts (screenshot evidence, both commands exiting with code 0):

- **`npm run test:rules:emulator`** (`tests/firestore-rules.test.ts`): **179 tests, 32 suites, 179 passed, 0 failed, 0 cancelled.**
- **`npm run test:periodic-stock-finalization:emulator`** (`tests/periodic-stock-finalization.test.ts`): **9 tests, 3 suites, 9 passed, 0 failed, 0 cancelled.**

**AC-1, AC-2, AC-3 — now VERIFIED, confirmed by direct inspection of the executed test names, not assumed from the pass count alone.** `tests/firestore-rules.test.ts` contains tests literally titled `'AC-1: a NEW original Capital Inicial confirmation, legacy shape (no chainPosition field), is DENIED'` and `'AC-2: a NEW original Capital Inicial confirmation, full shape (chainPosition 1, server confirmedAt), is DENIED'`, both within the 179 passing. AC-3 (redo creation continuing to succeed given a valid predecessor `voidRecords` document) is covered by the same file's `'Void & Redo — voidRecords create + chain-slot stockCounts create'` describe block, explicitly documented in that file as "the dedicated rules-emulator coverage required by the signed Implementation Authorization §6/§8" — also within the 179 passing. This satisfies §5 Increment 9's and §10's own bar ("verified against a real Firestore Rules Emulator... not source inspection alone") for these three items.

**Correction to the entry immediately above:** that entry named `tests/periodic-stock-finalization.test.ts` as covering part of AC-1/AC-2/AC-3/AC-12 alongside `tests/firestore-rules.test.ts`. On direct inspection of that file's own header, this was imprecise: `tests/periodic-stock-finalization.test.ts` is explicitly documented, in its own source, as belonging to a separate governing task — "Stock Count Data-Loss Resilience — Implementation Task, §14 items 2 & 3" — not this Authorization. Its 9/9 pass is a real, valid result, but it does not verify anything this Authorization's own AC-1 through AC-12 requires, and is not further relied on by this record.

**AC-12 — recorded as OUTSTANDING, and the reason corrected.** The Plan's own §7 defines AC-12 as: "Zero historical `stockCounts`, `voidRecords`, `initialStockRecoveryAuthorization`, or Timeline document is deleted, rewritten, or its field values altered, verified by a before/after data snapshot comparison in the emulator test suite." A direct search of the full test suite (`tests/*.test.ts`, all files, not only the two named above) found **no test implementing this specific before/after comparison** — the AC-1/AC-2 tests assert only that a new create attempt is denied; neither they nor any other test reads a pre-existing historical document, records its state, performs an operation, and asserts the state is unchanged afterward. **AC-12 was not blocked by this sandbox's network restriction, and is not resolved by running the emulator successfully** — the previous entry's grouping of AC-12 with "run these two scripts" was incorrect and is corrected here, in the open, rather than silently. Closing AC-12 requires either: (a) a new test implementing this exact assertion, which is new test-writing scope requiring its own explicit authorization before being written — not authorized by this record; or (b) the Product Architect's own decision on an alternative acceptable form of verification for this item.

**Recorded conclusion:** AC-1, AC-2, and AC-3 are now genuinely closed, verified against a real Firestore Rules Emulator. **AC-12 remains open**, for the reason stated above, and Increment 9 therefore remains **not fully complete**. This Authorization's overall scope (§14) is still **not** declared complete by this record. No code, test, `firestore.rules`, `firestore.indexes.json`, or governance-scope file is changed by this record.

---

## Amendment 3 — Post-Retirement UI Nudge Correction (Narrow, Additive)

**Status: 🔶 PENDING — NOT YET AUTHORIZED.** Drafted below per this document's own established additive-amendment convention (see Amendment 1 and Amendment 2, above) — everything above this line, including both Increment 9 Verification Records and every prior signature block, is preserved completely unedited as the historical record. This section is a separate, later, pending act. **Signing the pending block at the end of this section is the sole act that would authorize it** — drafting it authorizes nothing by itself.

**Governing basis:** this is a narrow addendum to the signed [Capital Inicial Retirement Decision Proposal](../engineering/capital-inicial-retirement-decision-proposal.md) §11 ("Remove Capital Inicial from Active Navigation/UI"), identifying two active-workflow prompts §11's original table did not name, discovered during post-Increment-9 review of Increments 1–8's shipped surfaces. It relies on, and does not reopen, BDR Decision 39 (all items), Architecture §5.4/§8.6, and Specification §44 — all already signed.

**This is explicitly a UI workflow/copy correction, not a Business Worth redesign.** No formula, ceiling, or calculation changes.
**No historical Capital Inicial data is deleted or altered.** Both messages are read-only display copy; neither is wired to any write path.
**Case B / State 1a remains unchanged.** Nothing here touches `getEstimatedBusinessWorth`, its Case B branch, or State 1a's permanent-legacy status (BDR Decision 39(e); Spec §44.3).
**Contagem and Owner-Declared Business Worth remain the sole establishment mechanisms**, unchanged (BDR Decision 1 as corrected; Decision 36).

**Findings, confirmed by direct code inspection (not assumed):**
- `dashboard.worthModal.defineInitialCapital` (`DashboardView.tsx:737`; i18n key present in `en.ts:189`, `pt.ts:1345`, `fr.ts:189`) renders only inside the Business Worth summary modal, itself only reachable once Business Worth is already established or estimated (`displayedBusinessWorthValue !== null`), gated by `{!hasInitialStockCount && ...}` with no other condition.
- The hardcoded Portuguese banner in `PeriodicStockCountView.tsx:3622–3629` ("Ainda não definiu o Capital Inicial...") is a *separate* string on a *separate* screen (the Periodic Contagem entry screen, not the Dashboard) — not an i18n key (this file has no `t()`/`useTranslation` calls at all, a pre-existing structural fact unrelated to this amendment). Gated by `{!hasInitialStockCount && ...}` alone, with no establishment-state check — it renders on every periodic Contagem for the affected population, including the Contagem that itself establishes their Business Worth.
- Both messages' addressable audience is, by their own gating condition, always exactly "no historical Capital Inicial" — and per BDR Decision 39(a), that population can never create one. Neither message is clickable, navigational, or wired to any creation/write path — confirmed by direct inspection (no `onClick`, no `Link`).
- Neither message can render for a business with `hasInitialStockCount === true` — both are already unreachable for that population today, unaffected by this amendment either way.

**Amendment — authorized scope, exactly:**
1. `apps/tenant/src/i18n/locales/en.ts:189`, `pt.ts:1345`, `fr.ts:189` — the `dashboard.worthModal.defineInitialCapital` key — and its rendering clause, `DashboardView.tsx:737` (`{!hasInitialStockCount && t('dashboard.worthModal.defineInitialCapital')}`).
2. `apps/tenant/src/components/PeriodicStockCountView.tsx:3622–3629` — the hardcoded Capital Inicial banner block (direct JSX edit, not a locale-key change).

**Intended behavior — business without historical Capital Inicial (`hasInitialStockCount === false`):** neither message renders. Message 1: the modal's caption reverts to showing only `basedOnCount`, with no trailing clause. Message 2: the amber info banner is removed entirely from the Contagem screen for this population; the already-correct, Increment-6/FR-70-fixed "Valor Esperado de Stock" comparison copy immediately below it is untouched.
**Distinguished from businesses with preserved historical Capital Inicial (`hasInitialStockCount === true`): no change.** Both messages are already unreachable for this population today — this amendment does not alter that population's experience in any way.

**The boundary is absolute:**
- ✅ Removing/gating away both messages, for `hasInitialStockCount === false` only, is authorized.
- ❌ Any change to `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, or `expectedCurrentStockValue` is not authorized.
- ❌ Any change to Case A/B arithmetic, State 1a, Product Memory, recovery (Void & Redo / SuperAdmin-Assisted Recovery), historical data, Contagem, Owner-Declared Business Worth, or `BusinessWorthSnapshot` creation/semantics is not authorized.
- ❌ Any `firestore.rules` or `firestore.indexes.json` change is not authorized.
- ❌ The separately-discovered `startupInvestment.reportSection.noBaselineYet` finding (`StartupInvestmentView.tsx:135–137`) is explicitly **not** included in this amendment's scope and is not authorized for change by it — it requires its own, later, separate governance treatment if addressed at all.

**Acceptance criteria:**
- AC-A1: `dashboard.worthModal.defineInitialCapital` is never rendered for any business with `hasInitialStockCount === false`, in all three locales.
- AC-A2: The Contagem-screen amber banner never renders for any business with `hasInitialStockCount === false`, including on that business's Business-Worth-establishing Contagem.
- AC-A3: Neither change alters `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, `expectedCurrentStockValue`, or any other calculation output, verified by unit test (before/after numeric equality).
- AC-A4: A business with `hasInitialStockCount === true` sees byte-identical behavior on both screens before and after, verified by regression test.
- AC-A5: No `firestore.rules`, `firestore.indexes.json`, write-path, or `BusinessWorthSnapshot`/State-1a/Case-B code is touched — confirmed by diff scope.

**Tests required:** new tests proving AC-A1 and AC-A2 directly (both messages absent for `hasInitialStockCount === false`, present/unaffected for `hasInitialStockCount === true`), plus regression coverage proving AC-A3 and AC-A4 — not yet written, pending acceptance.

**Not a redecision:** this amendment does not change BDR Decision 39, Architecture §5.4/§8.6, Specification §44, Case A/B arithmetic, Capital Inicial's retirement status, or any figure, formula, or calculation anywhere in this Authorization or its governing chain. It authorizes the removal of two obsolete, non-interactive, read-only UI prompts, for exactly the population that can never satisfy the action either one instructs.

## Product Architect Authorization — Amendment 3 — Pending

> I have reviewed the proposed narrow amendment above, covering `dashboard.worthModal.defineInitialCapital` (`DashboardView.tsx`) and the hardcoded Capital Inicial banner in `PeriodicStockCountView.tsx`. I understand that signing below authorizes, exactly and only, removal of these two prompts for businesses with `hasInitialStockCount === false`, with no change for businesses with `hasInitialStockCount === true`, and no change to `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, `expectedCurrentStockValue`, Case B, State 1a, Product Memory, recovery, historical data, Contagem, Owner-Declared Business Worth, `BusinessWorthSnapshot`, `firestore.rules`, or `firestore.indexes.json`. I understand this does not authorize the separately-discovered `startupInvestment.reportSection.noBaselineYet` finding, which remains outside this amendment.
>
> **Product Architect:** ______________________________
> **Date:** __________________________________________
> **Decision:**
> ☐ ACCEPTED AS PROPOSED
> ☐ ACCEPTED WITH MODIFICATIONS (specify)
> ☐ NOT ACCEPTED

---

## Product Architect Authorization — Amendment 3 — Recorded

**Status: ✅ ACCEPTED AS PROPOSED (31 August 2026).** Recorded additively below, per this document's own established signature-recording convention (see the base "Recorded" section, Amendment 1's, and Amendment 2's own "Recorded" acceptances, above) — the pending block immediately above is preserved unedited, blank lines and unchecked boxes included, as the historical record of what was circulated for review; this section is the actual, dated act of signature.

> I have reviewed and accepted the proposed narrow amendment above, exactly as drafted, covering: (1) `dashboard.worthModal.defineInitialCapital` and its rendering clause in `DashboardView.tsx`; (2) the hardcoded Capital Inicial banner in `PeriodicStockCountView.tsx`; (3) removal of those prompts only for businesses with `hasInitialStockCount === false`; (4) no change for businesses with preserved historical Capital Inicial (`hasInitialStockCount === true`); (5) no change to `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, `expectedCurrentStockValue`, Case B, State 1a, Product Memory, recovery, historical data, Contagem, Owner-Declared Business Worth, or `BusinessWorthSnapshot`; (6) no `firestore.rules` or `firestore.indexes.json` changes.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ ACCEPTED AS PROPOSED

**This signature authorizes implementation of exactly, and only, Amendment 3's defined scope, above — removal of both named prompts for `hasInitialStockCount === false`, with no other change. It does NOT authorize the separately-discovered `startupInvestment.reportSection.noBaselineYet` finding (`StartupInvestmentView.tsx:135–137`) — that item remains outside this amendment and requires its own, separate governance treatment if it is addressed at all. No other expansion of this or any other increment is authorized by this signature.**
