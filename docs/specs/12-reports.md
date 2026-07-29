Business Domain Specification

# Reports

Version 1.0
**Status:** ✅ Approved
**Module #12 of 20 — Phase 3: Insight & Decision Support**
**Architecture references:** [Section 3.9](../architecture/03-domain-architecture.md)
(Reports domain — "Derived, read-only views... Aggregation and
presentation only — never a source of truth, never mutates underlying
domains... intentionally a leaf/terminal domain"), [Section 6.4, 6.8](../architecture/06-user-architecture.md)
(Staff responsibilities explicitly include "viewing Reports/Dashboard
for their own business — exactly as today"; Permission Matrix: "Stock
Entry, Products, Reports (own business)" — Admin ✅, Manager ✅, **Staff
✅**), [Section 8.9](../architecture/08-module-architecture.md) (Reports
module — "this module has no calculation logic of its own, only
presentation and filtering"; "No report may compute a figure
independently of [the Calculation Engine] — a report showing a
different Embedded Profit number than the Dashboard for the same data
would itself be a data-integrity failure, not a display bug")
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the shared Calculation Engine every report must read from
exclusively · [Withdrawals (spec #9)](./09-withdrawals.md) and
[Monthly Closings (spec #11)](./11-monthly-closings.md) for the
Owner-only Firestore rules on `withdrawals`/`closings` that this spec
finds in direct tension with Architecture's stated Staff access to
Reports · [Dashboard (spec #1)](./01-dashboard.md), whose own Users
section states "Dashboard is not automatically hidden from Staff" — a
claim this spec finds does not match the current `ownerOnly: true` nav
gate shared by both Dashboard and Reports
**Implementation:** `src/components/ReportsView.tsx` (router/print
styles), `src/components/reports/ReportHome.tsx` (menu), eight report
views (`BusinessWorthReport.tsx`, `InventoryValuationReport.tsx`,
`BatchPerformanceReport.tsx`, `CapitalGrowthReport.tsx`,
`ExpenseReport.tsx`, `WithdrawalReport.tsx`, `InventoryLossReport.tsx`,
`StockVerificationReport.tsx`), `src/components/reports/shared/`
(`reportTypes.ts`, `reportInsights.ts`, `reportExport.ts`,
`ReportFilterBar.tsx`, `ReportUI.tsx`), `src/utils/batchPdfExport.ts`,
nav gating (`navigationTabs.ts` line 29, `ownerOnly: true`), `App.tsx`
(lines 40, 49, 153 — `!isStaff` guard plus a forced tab redirect for
any Staff session that lands on `'reports'`)

---

## Purpose

**Why does this module exist?**

Every prior module in this series (Products through Closings) answers
"what do I need to record right now." Reports answers a different
question: "now that I've recorded all of it, what does it mean." It is,
per Architecture 3.9, deliberately a leaf/terminal domain — it reads
from every Inventory and Financial domain that came before it, computes
nothing of its own, and nothing downstream depends on it. That
constraint is what makes it safe: because Reports can only ever
reflect what the Calculation Engine (spec #2) and each domain's own
records already say, a report can never become a second, competing
source of truth for a number the Dashboard or a Closing already
reports differently.

## Business Problem

**What business problem does it solve?**

An Admin's day-to-day recording (Stock Entry, Quebras, Expenses,
Withdrawals) produces a lot of individual facts, but no single record
answers "how is Product X actually performing," "where did last
month's losses concentrate," or "is my capital actually growing."
Reports solves this by aggregating, filtering, and narrating those
existing facts into eight purpose-built views — Business Worth,
Inventory Valuation, Batch Performance, Capital Growth, Expenses,
Withdrawals, Inventory Losses, and Stock Verification — each exportable
to PDF or Excel for the Admin's own records or to share with an
accountant or investor, without ever introducing a second calculation
path that could drift from what Dashboard or a Closing already say.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access to all eight reports — the only role gated in today: nav tab (`ownerOnly: true`), `App.tsx` (`!isStaff && activeTab === 'reports'`) |
| **Manager** | Same "if granted" pattern named throughout this series (Architecture 6.3) — not implemented (`UserRole` is still `'owner' \| 'staff'` only) |
| **Staff** | **No access at any layer today — a real, direct contradiction with Architecture's own stated intent.** Architecture 6.4 lists "viewing Reports/Dashboard for their own business" as a core Staff responsibility, worded "exactly as today" — implying the architecture document itself believed this already worked. Architecture 6.8's Permission Matrix confirms it explicitly: "Stock Entry, Products, Reports (own business)" is marked ✅ for Staff, identically to Admin and Manager. The actual code contradicts both statements: `navigationTabs.ts` marks the `reports` tab `ownerOnly: true`, and `App.tsx` (lines 40, 49) actively force-redirects any Staff session that lands on `activeTab === 'reports'` back to `'add-stock'` — Staff cannot reach a single report, let alone their own business's data, through any UI path |
| **SuperAdmin/Support/Developer** | Architecture 6.8 specifies "Read-only, audited" access to Reports for all three platform-operator tiers, via the Support Session mechanism (Architecture 6.5). None of this exists yet — the SuperAdmin app (module #18 in this series) has not been started, so this is architecturally intended and explicitly scheduled, not a gap in this module specifically |

## User Stories

- As a **Business Owner**, I want a dedicated report for each major
  question I have about my business (worth, valuation, performance,
  growth, expenses, withdrawals, losses, verification), so that I don't
  have to reconstruct an answer from raw records myself.
- As a **Business Owner**, I want every figure in a report to exactly
  match what Dashboard already shows me for the same data, so that I
  never have to wonder which number is the "real" one.
- As a **Business Owner**, I want to export any report to PDF or Excel,
  so that I can hand it to an accountant or keep an offline record.
- As a **Staff member who records day-to-day Stock Entries**, I want to
  see how the products I handle are performing, so that I understand
  the impact of my own work — an ability the product I use today
  doesn't actually give me, despite Architecture describing it as
  something I should already have.

## Business Rules

**Reports never compute independently — verified, not just claimed**
- Every report that touches batch-derived figures imports
  `calculateBatch` or `calculatePurchaseBatchSummary` directly from the
  Calculation Engine (`BusinessWorthReport.tsx`,
  `InventoryValuationReport.tsx`, `BatchPerformanceReport.tsx`) rather
  than reimplementing the math — confirmed by direct inspection of each
  file's imports, not assumed from the architecture's own description.
  The remaining reports (`CapitalGrowthReport.tsx`,
  `StockVerificationReport.tsx`, `ExpenseReport.tsx`,
  `WithdrawalReport.tsx`, `InventoryLossReport.tsx`) read pre-computed
  totals straight from `AppContext` (`businessWorth`, `closings`,
  `stockCounts`) or do pure arithmetic over records that are themselves
  already-computed facts (a `StockCount`'s stored `totalValue`, an
  `Expense`'s stored `amount`) — never re-deriving a batch-level figure
  from scratch. This matches Architecture 8.9's explicit requirement
  with no exception found.
- `reportInsights.ts`'s own header comment states its functions "turn
  numbers the caller already computed... into a plain-language
  sentence. Nothing is inferred beyond arithmetic on those numbers" —
  confirmed true by inspection: every exported function (`pctChange`,
  `trendInsight`, `concentrationInsight`, `shareInsight`) takes
  already-computed numbers as parameters and only formats/compares them.

**The Staff access gap — Reports' most consequential finding**
- See Users, above. This is not a minor omission: Architecture states
  Staff access to Reports twice, independently (6.4's responsibilities
  list and 6.8's Permission Matrix), in language that assumes it's
  already true ("exactly as today"). The actual code blocks it entirely
  at two separate layers (`ownerOnly: true` in nav config, and an
  active `useEffect` redirect in `App.tsx` that overrides even a direct
  URL/state change to `'reports'`). Whatever caused this mismatch —
  whether Reports access for Staff was removed after Architecture was
  written, or Architecture described an intent that was never actually
  built — the two documents disagree today, and Architecture is the
  one this series treats as ground truth per the brief.

**Why fixing this isn't simply removing `ownerOnly` — a second, more
subtle gap underneath the first**
- Even if Staff were granted UI access to the `reports` tab, two of the
  eight reports would not work correctly for them today, because their
  underlying Firestore collections are deliberately Owner-only:
  - `WithdrawalReport.tsx` reads the `withdrawals` collection directly;
    the Firestore rule (spec #9) is `allow read, create, update,
    delete: if isOwnerOf(businessId)` — no Staff read access at all.
  - `CapitalGrowthReport.tsx` reads the `closings` collection; the
    Firestore rule (spec #11) is identically `isOwnerOf(businessId)`
    only.
  - `BusinessWorthReport.tsx` also reads `withdrawals` directly (its
    "Withdrawals in Period" section, lines 40–41, 229) — so even this
    report, which Architecture's own Permission Matrix names by example
    ("Reports (own business)"), would silently show an incomplete
    figure for a Staff session: `AppContext`'s `withdrawals` listener
    (`AppContext.tsx` line 576) subscribes unconditionally regardless
    of role, and a Staff session's read would simply be denied by the
    Firestore rule — caught only by a `console.error`, never surfaced
    to the user — leaving `withdrawals` silently empty and any figure
    derived from it silently wrong, not visibly blocked.
  - The remaining five reports (Batch Performance, Inventory Valuation,
    Expense, Inventory Loss, Stock Verification) read only from
    `products`, `batches`, `quebras`, `expenses`, and `stockCounts` —
    every one of which already carries `isMemberOf(businessId)` read
    access at the Firestore layer (specs #7, #8, #10), so these five
    would work correctly for Staff today if the UI gate were lifted.
  - This means the correct fix Architecture implies is **per-report**,
    not a single flag: five of eight reports could safely open to
    Staff immediately; the other three (Business Worth, Withdrawals,
    Capital Growth) either need their Owner-only figures scoped out of
    the Staff-facing view, or need the underlying Security Rules
    changed — the latter being a materially bigger decision, since it
    would mean Staff gaining read access to money the Owner has
    personally withdrawn, which spec #9's own Business Rules describe
    as something the product deliberately keeps "private even from
    someone I trust to run day-to-day stock and sales recording."

**A smaller robustness note, not a gap**
- The `'all-time'` date preset (`ReportFilterBar.tsx`,
  `useDateRange`/`applyPreset`) is implemented as a hardcoded
  `2020-01-01` to `2030-12-31` range rather than a true open-ended
  filter — functionally correct for any business operating within that
  window, but worth naming now rather than after 2030, since nothing
  else in the file computes it dynamically.

## Functional Requirements

*Exactly what the module must do.*

1. Provide eight report views — Business Worth, Inventory Valuation,
   Batch Performance, Capital Growth, Expenses, Withdrawals, Inventory
   Losses, Stock Verification — matching Architecture 3.9's named list
   exactly — currently implemented.
2. Compute every figure exclusively via the existing Calculation Engine
   or already-computed `AppContext` totals, never independently —
   currently implemented and verified by direct inspection (Business
   Rules, above).
3. Support date-range filtering (this month, this week, last 30 days,
   all-time, custom) via a shared `ReportFilterBar`/`useDateRange` hook
   — currently implemented.
4. Generate plain-language, translated insight sentences (trend,
   concentration, share-of-total) from already-computed figures —
   currently implemented (`reportInsights.ts`).
5. Export any report to PDF (via `reportExport.ts`, using `jspdf`/
   `jspdf-autotable`) and to a real `.xlsx` workbook (via `xlsx`) —
   currently implemented, both formats confirmed working from source.
6. Support browser-native print of the active report only, hiding
   navigation and interactive controls — currently implemented
   (`ReportsView.tsx`'s `@media print` block).
7. Restrict every report to the Owner role only — currently
   implemented, but **contradicts Architecture's explicit statement**
   that Staff should have ✅ access to "Reports (own business)"
   (Architecture 6.4, 6.8).
8. **Not currently implemented:** any per-report distinction that would
   let Staff view the five reports whose underlying data they already
   have Firestore read access to (Batch Performance, Inventory
   Valuation, Expenses, Inventory Losses, Stock Verification) while
   correctly continuing to exclude the three that touch Owner-only data
   (Business Worth, Withdrawals, Capital Growth) — see Business Rules.
9. **Not currently implemented:** any guard against a report silently
   showing an incomplete figure when a permission-denied read fails
   quietly (currently only `console.error`) rather than surfacing that
   the underlying data couldn't be fetched.

## Non-functional Requirements

**Performance**
- Every report recomputes its figures client-side from already-fetched,
  live-subscribed collections (`onSnapshot`) — O(n) over each domain's
  record count, immaterial at current scale (Architecture Section 11),
  consistent with every other report-style computation in this series
  (`generateReportSummary`, spec #11).
- PDF/Excel export libraries (`jspdf`, `jspdf-autotable`, `xlsx`) are
  loaded via dynamic `import()`, kept out of the main bundle until a
  report is actually exported — a deliberate, correctly-implemented
  performance choice, not something this spec needs to require as a
  future fix.

**Security**
- See Business Rules: the current Owner-only gate is broader than
  Architecture specifies for five of the eight reports, and the
  three reports it correctly excludes Staff from today do so almost by
  accident (as a side effect of the blanket tab gate) rather than by a
  deliberate, documented per-report decision.
- Underlying Firestore rules for `withdrawals`/`closings` (specs #9,
  #11) are correctly restrictive on their own terms — this spec finds
  no gap in those rules themselves, only in how Reports' own UI gate
  relates to them.

**Accessibility**
- Every report inspected uses `.type-number`/tabular-nums for financial
  figures and pairs trend indicators with icons, not color alone —
  consistent with every prior module's accessibility baseline.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named across every prior module in this series.

**Mobile**
- Report KPI grids and tables follow the same responsive collapse
  patterns established elsewhere in the product (`DESIGN_SYSTEM.md`);
  the print stylesheet is desktop/print-oriented, which is standard and
  not itself a gap.

**Localization**
- All eight report views plus `ReportHome.tsx` are fully `t()`-driven —
  confirmed by direct count across every file (40–74 `t()` calls each,
  zero hardcoded user-facing strings found) — the strongest
  localization compliance of any module in this series so far, in
  direct contrast to Stock Counts (spec #10) and Monthly Closings
  (spec #11), which this series found entirely unlocalized.

## KPIs

**How do we know this module succeeds?**

- Every figure shown in any report is byte-for-byte identical to the
  same figure shown on Dashboard for the same underlying data — an
  invariant already true today per Business Rules, and one this KPI
  exists to keep true as new reports are added.
- Staff access to Reports matches Architecture's stated intent — currently
  unmet (Functional Requirements #7–8): zero of eight reports are
  reachable by a Staff session today, versus the five Architecture's
  own Permission Matrix implies should be.
- Zero silently-incomplete figures caused by a quietly-denied Firestore
  read — currently unmet (Functional Requirement #9); today's only
  signal is a browser console error no user will ever see.

## Future Enhancements

*Ideas — not implementation.*

- **Resolve the Staff/Reports access gap as an explicit product
  decision** — either (a) open the five Staff-safe reports (Batch
  Performance, Inventory Valuation, Expenses, Inventory Losses, Stock
  Verification) to Staff per Architecture's stated intent, while
  keeping Business Worth, Withdrawals, and Capital Growth Owner-only by
  a documented, deliberate per-report rule rather than an incidental
  side effect of one blanket tab gate; or (b) update Architecture 6.4/6.8
  to reflect that Reports is intentionally Owner-only today. Either is
  a legitimate outcome — what shouldn't continue is the current silent
  disagreement between the two documents.
- **Surface a visible warning** when a report's underlying data fetch
  is denied or fails, instead of only logging to the console — closing
  Functional Requirement #9.
- **Compute the `'all-time'` date preset dynamically** (e.g., from the
  business's actual earliest record) rather than a hardcoded
  2020–2030 window.
- **Build the Support Session read-only path** into Reports once the
  SuperAdmin app (module #18) exists, per Architecture 6.5/6.8.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A product decision has been made and implemented on Staff access
      to Reports — either matching Architecture's stated Permission
      Matrix (with the three Owner-only-data reports correctly excluded
      by a deliberate rule) or Architecture has been updated to state
      Reports is intentionally Owner-only — not left as an unreviewed
      disagreement between the two documents.
- [ ] If Staff access is implemented, a failed/denied data fetch for
      any report surfaces a visible message rather than silently
      showing an incomplete figure.
- [ ] Every report figure continues to match Dashboard exactly for the
      same underlying data, verified as new reports or figures are
      added, not just at this snapshot in time.
- [ ] The `'all-time'` preset's fixed date range has been confirmed as
      acceptable for the foreseeable future, or replaced with a dynamic
      calculation.
