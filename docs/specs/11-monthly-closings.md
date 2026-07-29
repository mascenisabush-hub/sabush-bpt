Business Domain Specification

# Monthly Closings

Version 1.0
**Status:** ✅ Approved
**Module #11 of 20 — Phase 2: Capital Protection**
**Architecture references:** [Section 3.8.4](../architecture/03-domain-architecture.md)
(Closings domain — "Permanently locks a month or year's figures and
snapshots Business Worth at that moment — immutable once recorded,"
Principle 2.10; dependency table: reads from Expenses, Withdrawals,
Stock Batches, Quebras), [Section 5.8](../architecture/05-business-lifecycle.md)
(Periodic Closing stage — "the point where Expenses, Withdrawals, Stock
Batches, and Breakages for a period are locked together into a single,
permanent figure"), [Section 6.3](../architecture/06-user-architecture.md)
(Manager tier — "if granted" access to Closings; the concrete
`isOwnerOrGrantedManager`/`managerPermissions.closings` design, not yet
implemented), [Section 7.2, 7.6](../architecture/07-data-architecture.md)
("Truly immutable, no exceptions" tier — Closings named explicitly
alongside the `initial` Stock Count and every Timeline Event; "Mutable
until locked, then frozen" tier for Expenses/Withdrawals, whose
enforcement Closing's own lock is architecturally responsible for),
[Section 8.8](../architecture/08-module-architecture.md) (Closing
module — "the one write in the entire app that simultaneously locks
records across four other modules... no other module should
independently decide when a period is closed")
**Depends on:** [Stock Counts (spec #10)](./10-stock-counts.md) for the
identical category of finding this spec confirms from the other side —
a "truly immutable, no exceptions" Architecture guarantee not actually
enforced at the Security Rules layer · [Expenses (spec #8)](./08-expenses.md)
and [Withdrawals (spec #9)](./09-withdrawals.md) for the "mutable until
locked, then frozen" gap those specs found (no `closingId` field, no
lock check) — this spec confirms the same gap from Closing's own side,
since Architecture 8.8 places responsibility for enforcing that lock
here, not there
**Implementation:** `src/components/ClosingView.tsx` (entry form,
history list, delete action), `src/context/AppContext.tsx`
(`recordClosing` lines 1250–1298, `deleteClosing` lines 1300–1303,
`isPeriodClosed` lines 1239–1243), `Closing`/`ClosingPeriodType` types
(`src/types.ts`, lines 207–227), `generateReportSummary`
(`src/utils/calculations.ts`, lines 86ff), `src/components/reports/CapitalGrowthReport.tsx`
(downstream consumer), Timeline handling (`src/components/timeline/timelineHelpers.ts`,
`monthly-closing`/`yearly-closing` types), nav gating
(`src/data/navigationTabs.ts` line 28, `ownerOnly: true`), `App.tsx`
(`!isStaff` routing guards, lines 40, 49, 149–150), Firestore rules
(`firestore.rules` lines 195–199)

---

## Purpose

**Why does this module exist?**

Closings is how the app converts a live, constantly-recalculating month
or year of activity into a permanent historical fact. Architecture 3.8.4
and Principle 2.10 are explicit: a Closing "permanently locks a month or
year's figures and snapshots Business Worth at that moment." Every other
module in this series computes its figures live, every render, from
whatever Expenses, Withdrawals, Stock Batches, and Quebras currently
exist — useful for "where do I stand right now," but useless for "how
did January actually turn out," since January's live numbers keep
moving every time a new record is added or an old one is corrected.
Closing exists to freeze one period's answer permanently, so an Admin
(or an investor doing diligence, per Architecture's own framing in
Section 15) can trust that a historical figure reflects what was true
at the moment it was recorded, not a number that silently drifts months
later.

## Business Problem

**What business problem does it solve?**

Without Closings, "how is my business trending month over month" has no
honest answer — Architecture 5.10 (Historical Analysis) states plainly
that a single point-in-time Worth number cannot answer whether the
business is growing or shrinking; only a series of locked snapshots can.
Closings solves this by giving the Admin a deliberate, one-way action —
"lock this period" — that takes Embedded Profit, Expenses, Withdrawals,
and a Business Worth snapshot as they stand today and writes them down
permanently, becoming the anchor every later Capital Growth comparison
(Architecture 5.10, `CapitalGrowthReport.tsx`) is measured against.
Without this deliberate lock, every "trend" the app could ever show
would really just be repeated live recalculations of the same
ever-changing raw data — not a comparison of two different points in
time at all.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — the only role gated in at every layer: nav tab (`ownerOnly: true`), `App.tsx` (`!isStaff && activeTab === 'closing'`), and Firestore rules (`allow read, create, update, delete: if isOwnerOf(businessId)`) |
| **Manager** | Architecture 6.3 names this explicitly and in more detail than any prior module in this series — a full rule-function design (`isOwnerOrGrantedManager(businessId, permission)`) and a concrete field (`managerPermissions.closings`) already spelled out in Architecture 7.3. None of it exists in code today: `UserRole` is still only `'owner' \| 'staff'` (Architecture 6.1), so this is the clearest case yet of an access tier that is architecturally designed down to the field name, but has no implementation path started |
| **Staff** | No access at any layer — matches Architecture 6.8's Permission Matrix (Periodic Closing: Staff ❌), gated consistently end-to-end exactly like Withdrawals (spec #9): nav, routing, and Firestore rule all agree |
| **SuperAdmin** | No direct access to an individual business's Closing records — aggregated patterns only (Architecture 3.1, 10.9); Architecture 6's Permission Matrix marks Periodic Closing as accessible only "via support session, not directly" for platform roles, which matches Closings having no SuperAdmin-specific code path today |

## User Stories

- As a **Business Owner**, I want to lock a month's figures permanently
  once I'm satisfied they're accurate, so that later corrections to
  other data never silently rewrite what I already reported as that
  month's result.
- As a **Business Owner**, I want to see a snapshot of Business Worth at
  the exact moment I close a period, so that I have a trustworthy series
  of points to compare, not just today's live number.
- As a **Business Owner**, I want to be warned if I try to close a
  period I've already closed, so that I don't accidentally create two
  conflicting "official" answers for the same month.
- As a **Business Owner who made a mistake before closing**, I want to
  undo a Closing if needed, so that I'm not permanently stuck with a
  wrong snapshot — while trusting that undoing it never silently rewrites
  the frozen figures themselves, only reopens the period.

## Business Rules

**What a Closing records, and what it deliberately locks together**
- A Closing is a period type (`monthly`/`yearly`), a label, a start/end
  date, and a frozen snapshot: `totalEmbeddedProfit`, `totalExpenses`,
  `totalWithdrawals` (all scoped to the period via `generateReportSummary`),
  plus `inventoryCostAtClose`, `inventoryMarketValueAtClose`, and
  `businessWorthAtClose` — these three read the *live, all-time* totals
  at the moment of closing (`totalInvestmentValueAllTime`,
  `totalMarketValueAllTime`, `businessWorth`), not period-scoped figures.
  This split is correct and intentional per Architecture 3.8.4's own
  wording ("snapshots Business Worth **at that moment**"): the profit/
  expense/withdrawal totals answer "what happened during this period,"
  while the Worth snapshot answers "where did the business stand at this
  instant" — two different, both-correct questions, not an
  inconsistency.
- `recordClosing` reads from Products, Stock Batches, Quebras, Expenses,
  and Withdrawals (`AppContext.tsx` line 1257) — matching Architecture
  3.8.4's dependency list exactly (Expenses, Withdrawals, Stock Batches,
  Breakages). Stock Counts are correctly never read here, consistent
  with spec #10's own finding that Stock Counts sit deliberately outside
  the Business Worth formula as a separate verification figure, not an
  input to it.
- `isPeriodClosed` prevents closing the exact same `periodType` +
  `startDate` + `endDate` combination twice (`AppContext.tsx` lines
  1239–1243) — a real, working guard against double-counting a period,
  surfaced in the UI as a disabled button and an amber warning banner.

**Owner-only, end-to-end — the same clean baseline as Withdrawals**
- Closing is gated identically at every layer: `navigationTabs.ts`
  (`ownerOnly: true`), `App.tsx` (`!isStaff && activeTab === 'closing'`),
  and Firestore rules (`isOwnerOf(businessId)` on all four actions,
  including read). Like spec #9 found for Withdrawals, there is no
  UI/rules mismatch here — Staff cannot reach the screen, so there is no
  button mis-gated against a stricter backend rule.

**The gap this spec names: "immutable once recorded" is not enforced
where Architecture says it must be**
- Architecture 7.2 and 7.6 place a recorded Closing in the *same*
  "truly immutable, no exceptions" tier as the `initial` Stock Count —
  the strictest tier in the entire data architecture, above even
  Expenses/Withdrawals' "mutable until locked." Architecture 8.8 states
  plainly: a Closing document is "immutable once recorded (7.6);"
  deleting one "re-opens the period; it never edits the frozen figures
  in place." Deletion is explicitly the *only* sanctioned mutation.
- **The Firestore rule does not draw that distinction.** `firestore.rules`
  lines 195–199 read: `allow read, create, update, delete: if
  isOwnerOf(businessId)` — `update` is granted with no restriction of
  any kind, not even a check that the document is unchanged. There is no
  `updateClosing` function anywhere in the client, so today's protection
  against editing a frozen Closing is UI omission only — the identical
  condition spec #10 named for the `initial` Stock Count, and the exact
  failure mode Architecture 8.6 (quoted in that spec) warned would not
  satisfy a "no exceptions" guarantee: an Owner using the Firebase
  console or a direct API call could silently rewrite a Closing's frozen
  `businessWorthAtClose` or any other snapshot field, and nothing at the
  Security Rules layer would stop them.

**The Closing-lock gap, confirmed from Closing's own side**
- Architecture 8.8 states Closing "is the one write in the entire app
  that simultaneously locks records across four other modules... no
  other module should independently decide when a period is closed."
  Specs #8 and #9 already found, from the Expense and Withdrawal side,
  that no `closingId` (or equivalent) field exists on either type, and
  neither has any check preventing an edit or delete once its period is
  closed. This spec confirms the same absence from Closing's own code:
  there is no `closingId` field anywhere in `types.ts`, and
  `isPeriodClosed` — the one function that could answer "is this date
  inside a locked period" — is called nowhere except inside
  `ClosingView.tsx` itself, to disable the "close again" button and show
  a warning banner. It is never checked by `addExpense`, `addWithdrawal`,
  `addQuebra`, `addStockBatch`, or any of their `delete`/edit
  counterparts. Concretely: an Owner can add a *new* Expense dated
  inside an already-closed January, or delete an existing one from
  closed January, and January's frozen `totalExpenses` snapshot will
  silently stop matching what `generateReportSummary` would compute for
  that same date range today. Architecture assigns Closing the
  responsibility for owning this lock; nothing in the codebase — on
  either side of the relationship — currently enforces it.

**No confirmation before deleting a Closing — the weakest safeguard on
the strongest-tier record in the app**
- `handleDelete` (`ClosingView.tsx` lines 108–115) calls `deleteClosing`
  directly from a single click on a hover-revealed trash icon
  (line 316–324) — there is no confirmation step of any kind. This
  stands in direct contrast to the *creation* side of the same screen,
  which requires an explicit two-step confirm ("Tem a certeza?", lines
  256–277) before `recordClosing` runs. Deleting a Closing is the more
  consequential of the two actions — it reopens a period Architecture
  places in the strictest immutability tier in the entire app, and
  every KPI, Report, and Timeline entry anchored to that Closing's
  snapshot is affected the instant it's gone — yet it is the one action
  in this flow with zero protection against a misclick. This is the
  same category of gap specs #7/#8/#9 named for their own delete flows,
  but at higher stakes, since those modules' records aren't in
  Architecture's strictest tier.

**Manager tier — architecturally the most fully-specified "if granted"
gap in this series so far**
- Unlike Withdrawals (spec #9) or Stock Counts (spec #10), where the
  Manager tier is named only in passing, Architecture 6.3 and 7.3
  specify Closings' Manager access down to the exact rule function
  (`isOwnerOrGrantedManager(businessId, permission)`) and the exact
  field it would read (`managerPermissions.closings` on `users/{uid}`).
  None of it is implemented — `UserRole` remains `'owner' \| 'staff'`
  only. This is architecturally intended and explicitly scheduled
  (Architecture 13's Development Strategy lists the Manager-tier
  migration as an available, non-blocking item), not a bug — restated
  here because Closings is the domain Architecture most explicitly
  designs this delegation around.

**Overdue-Closing reminders are architecturally planned, not yet
buildable**
- Architecture 4.8/4.9/5.8 describe a scheduled Background Worker
  producing an "approaching" and a distinct "overdue" Closing reminder,
  computed by scanning `isPeriodClosed` state across all businesses on
  a recurring schedule, independent of any user's browser being open.
  Nothing in this codebase runs scheduled server-side code today
  (Architecture 4.8's own stated gap), and Notifications (module #20)
  has not been started per this README. This is the same category of
  finding spec #9 named for the Manager tier: an access/feature path
  Architecture has already designed, with no implementation path yet,
  not an oversight in this module.

**A quieter localization gap than Stock Counts, in the opposite
direction**
- `ClosingView.tsx` has no `t()`/`useTranslation`/i18n call anywhere in
  the file — every label, button, and message is hardcoded Portuguese
  ("Fecho Mensal/Anual," "Tem a certeza?," all twelve KPI labels),
  identical in kind to the gap spec #10 named for both Stock Count
  views. The contrast worth naming here: `CapitalGrowthReport.tsx` — the
  downstream Report that reads this same `closings` data — *is* fully
  `t()`-driven. So a French- or English-language Owner can read their
  Capital Growth history correctly, but hits an entirely untranslated
  screen the moment they try to perform the action that produces that
  history in the first place.

## Functional Requirements

*Exactly what the module must do.*

1. Record a Monthly or Yearly Closing for a selected period, freezing
   Embedded Profit, Expenses, and Withdrawals for that date range plus a
   Business Worth snapshot at the moment of closing — currently
   implemented (`recordClosing`).
2. Prevent closing the same exact period twice, surfaced as a disabled
   action and a visible warning — currently implemented (`isPeriodClosed`).
3. Log a `TimelineEvent` (`monthly-closing`/`yearly-closing`) with the
   frozen figures as its financial impact — currently implemented
   (`recordClosing`, lines 1276–1295).
4. Show a running, expandable history of past Closings, each with a
   period-over-period Business Worth comparison against the prior
   Closing — currently implemented (`sortedClosings`, lines 85–87 and
   282–360).
5. Restrict every access path — recording, viewing, and deleting a
   Closing — to the Owner role only, at nav, routing, and Firestore-rule
   layers simultaneously — currently implemented and correctly
   consistent (Business Rules, above).
6. Feed Closing history into the Capital Growth Report for
   period-over-period trend analysis — currently implemented
   (`CapitalGrowthReport.tsx`).
7. **Not currently implemented:** enforcement, at the Security Rules
   layer, that a recorded Closing document can never be updated — today's
   Firestore rule permits `update` unconditionally to any Owner, with no
   distinction from `create`/`delete`, contradicting Architecture 7.6's
   "truly immutable, no exceptions" tier.
8. **Not currently implemented:** any `closingId` (or equivalent) field
   on Expense/Withdrawal (or, per Architecture 8.8's four-domain lock,
   Quebra/Stock Batch), and no check anywhere against `isPeriodClosed`
   before writing to a date inside an already-closed period — the same
   gap named by specs #8 and #9, confirmed unaddressed from this side.
9. **Not currently implemented:** a confirmation step before a Closing
   delete completes (`ClosingView.tsx` line 108–115 has no confirm
   dialog, unlike the creation flow on the same screen).
10. **Not currently implemented:** localization (`t()` calls) anywhere in
    `ClosingView.tsx` — entirely hardcoded Portuguese, unlike the
    downstream `CapitalGrowthReport.tsx` that consumes the same data.

## Non-functional Requirements

**Performance**
- Recording a Closing is one `setDoc` plus one `TimelineEvent` write —
  O(1). Computing the preview (`generateReportSummary`) is O(n) over
  products/batches/quebras/expenses/withdrawals — immaterial at current
  scale (Architecture Section 11), same order as every prior report-style
  computation in this series.

**Security**
- Tenant isolation via `isOwnerOf(businessId)` is present and consistent
  across read/create/update/delete, and every UI entry point agrees —
  but see Business Rules: the `update` permission itself is broader than
  Architecture's stated intent for this record type, and the
  cross-module lock Architecture assigns to this module is not enforced
  anywhere in the codebase today.

**Accessibility**
- Financial figures use `.type-number`/tabular-nums consistently; the
  period-over-period growth indicator pairs its color (emerald/rose/gray)
  with an icon (`TrendingUp`/`TrendingDown`/`Minus`), not color alone —
  same pattern as Stock Counts (spec #10) and Withdrawals (spec #9).

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named across every prior module in this series.

**Mobile**
- Period selector and preview grids collapse from 4 to 2 columns below
  the `sm` breakpoint; the primary action button is full-width — same
  standard pattern as every other entry form in this series, without
  Stock Counts' more elaborate row-collapse pattern (not needed here,
  since Closing has no per-line-item grid).

## KPIs

**How do we know this module succeeds?**

- A recorded Closing's frozen figures never silently disagree with a
  live recalculation for the same date range — currently unmet, per
  Functional Requirement #8 (nothing prevents a later write from
  invalidating an already-closed period's snapshot).
- The `update` path against a recorded Closing is refused at the
  Security Rules layer, not merely absent from the UI — currently
  unmet, per Functional Requirement #7, verified directly against the
  Firestore rule rather than only the app's own client.
- An Owner can complete a Closing in their own language — currently
  unmet in French or English, per Functional Requirement #10.
- Time-to-close: an Owner can review the preview and confirm a period
  close in under 30 seconds once the correct period is selected.

## Future Enhancements

*Ideas — not implementation.*

- **Close the Security Rules gap** on `closings/{closingId}` —
  distinguish `update` from `create`/`delete` and refuse it
  unconditionally once a document exists, satisfying Architecture 7.6's
  "no exceptions" requirement rather than relying on the absence of a
  client-side `updateClosing` function.
- **Implement the shared `closingId` field and lock check** across
  Expenses, Withdrawals, and (per Architecture 8.8's four-domain scope)
  Quebras and Stock Batches — one fix, four modules, closing the gap
  specs #7, #8, #9, and this spec have each independently confirmed from
  their own side.
- **Add a confirmation step** before a Closing delete completes,
  proportionate to the record's strictest-tier status — arguably a
  higher-priority version of the same gap specs #7/#8/#9 raised for
  their own delete flows.
- **Build the Manager tier**, using the field and rule-function design
  Architecture 6.3/7.3 already specify in full for Closings
  specifically (`isOwnerOrGrantedManager`, `managerPermissions.closings`).
- **Localize `ClosingView.tsx`** — the single remaining unlocalized
  entry-form screen this series has found besides Stock Counts (spec
  #10), and the more visible gap of the two given that its downstream
  Report is already fully localized.
- **Build the overdue-Closing reminder** once the Background Worker and
  Notifications domain (Architecture 4.8, 4.9; module #20 in this
  series) exist — architecturally planned, correctly out of scope until
  those foundations are built.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A recorded Closing document cannot be updated by any role through
      any path, verified directly against the Firestore rule, not only
      the app's own UI.
- [ ] Expense, Withdrawal, Quebra, and Stock Batch records gain a
      `closingId` (or equivalent) field, and writes to a date inside an
      already-closed period are blocked or flagged — the same fix specs
      #8 and #9 require, applied here as the module responsible for
      owning the lock.
- [ ] A confirmation step exists before a Closing delete completes.
- [ ] `ClosingView.tsx` is fully localized, matching every other entry
      form in this series and its own downstream Capital Growth Report.
- [ ] A product decision has been made on whether/when the Manager tier
      (Architecture 6.3/7.3) will be implemented for Closings
      specifically, so "if granted" access has a concrete path rather
      than remaining permanently aspirational.
