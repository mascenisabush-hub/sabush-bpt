Business Domain Specification

# Stock Counts

Version 1.0
**Status:** ✅ Approved
**Module #10 of 20 — Phase 2: Capital Protection**
**Architecture references:** [Section 3.8.3](../architecture/03-domain-architecture.md)
(Stock Counts domain — the `initial` count as "the permanent, immutable
capital baseline," Principle 2.10), [Section 8.6](../architecture/08-module-architecture.md)
(Stock Counts module — explicit "enforced at the Security Rules layer,
not merely by UI omission" requirement), [Section 7.6](../architecture/07-data-architecture.md)
("Truly immutable, no exceptions" tier, which the `initial` Stock Count
belongs to — a stricter tier than Expenses/Withdrawals' "mutable until
locked")
**Depends on:** [Products (spec #3)](./03-products.md) for the
case-insensitive find-or-create-by-name pattern this module reuses
exactly · [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
— Stock Counts deliberately sit *outside* that formula, as a separate,
honest verification figure, not an input to it
**Implementation:** `src/components/InitialStockCountView.tsx`,
`src/components/PeriodicStockCountView.tsx`, `src/context/AppContext.tsx`
(`recordStockCount` lines 1138–1200ish, `initialStockCount`/
`hasInitialStockCount`/`initialCapitalValue` lines 349–351,
`currentInventoryValue` lines 366–369, `clearAllData` as the only bulk
removal path), `StockCount`/`StockCountItem` types (`src/types.ts`, lines
170–197), Firestore rules (`firestore.rules` lines 183–187), nav gating
(`navigationTabs.ts`: `initial-stock` and `stock-count`, both
`ownerOnly: true`)

---

## Purpose

**Why does this module exist?**

Stock Counts is how a business establishes and then periodically
verifies its capital baseline by physically counting what's actually on
the shelf, independent of what the Stock Entry/Quebra flow (specs #5,
#7) has recorded. The very first count a business ever performs — type
`initial` — becomes the permanent Initial Business Capital baseline
(Architecture 3.8.3, Principle 2.10): the fixed point every later
Capital Growth figure is measured against. Every count after that
(weekly, monthly, quarterly, yearly, or custom) exists to catch drift —
the gap between what the system thinks is on the shelf and what's
physically there — that the Stock Entry/Quebra flow alone wouldn't
surface (Architecture 8.6).

## Business Problem

**What business problem does it solve?**

Batch-derived figures (Investment Value, Market Value, Embedded Profit —
spec #2) are only ever as accurate as every Stock Entry and Quebra ever
recorded. Theft, miscounts, unrecorded losses, and simple human error
accumulate silently between physical counts. Without a periodic,
independent, physical verification step, an Admin has no way to know
whether the numbers on their Dashboard still reflect reality. Stock
Counts solves this two ways: it gives the business a permanent,
unmovable starting line (the `initial` count) to measure all growth
against, and it gives the Admin a recurring, honest "what's actually
here right now" figure to compare against their most recent prior count
— entirely separate from, and never folded into, the calculated
Business Worth figure (spec #2).

## Users

| Role | Access |
|---|---|
| **Owner** | Full access to record both the initial and every periodic count — the only role gated in at every layer (`navigationTabs.ts`: `initial-stock`/`stock-count`, both `ownerOnly: true`; `App.tsx`: `!isStaff` routing guards), matching Architecture 6.8's placement of Stock Counts alongside Withdrawals/Closings as Staff ❌ |
| **Manager** | Same "if granted" caveat spec #9 already named for Withdrawals — Architecture intends this tier, but it isn't implemented in code today (`UserRole` is still only `'owner' \| 'staff'`, Architecture 6.1) |
| **Staff** | No access at any layer — cannot even read `stockCounts` at the UI level, though Firestore's own read rule is `isMemberOf` (broader than the UI currently uses) — see Business Rules |
| **SuperAdmin** | No direct access to an individual business's Stock Count records — aggregated patterns only, consistent with every other tenant-financial domain (Architecture 3.1, 10.9) |

## User Stories

- As a **Business Owner just starting on Sabush**, I want to record
  everything I already own as my starting point, so that all future
  growth is measured from where I actually am, not from zero.
- As a **Business Owner**, I want to periodically re-count my physical
  stock and see it compared against my last count, so that I catch
  shrinkage or error before it compounds silently for months.
- As a **Business Owner**, I want absolute confidence that my Initial
  Capital figure can never be altered — accidentally or otherwise —
  once set, so that every growth figure I ever look at rests on solid
  ground.
- As a **Business Owner who made a data-entry mistake on their very
  first count**, I want *some* way to correct it that doesn't require
  destroying every other record in my business (currently unmet — see
  Business Rules and Future Enhancements).

## Business Rules

**What a Stock Count records, and what it deliberately does not touch**
- A count is a date, a type, and a list of counted items (product name,
  quantity, unit, cost per unit at count time) — `StockCount`/
  `StockCountItem` types, `types.ts` lines 170–197.
- A Stock Count **never creates or touches a `StockBatch`**
  (`recordStockCount`'s own header comment, `AppContext.tsx` line
  1130–1132) — its counted quantities never feed
  `calculateInventoryTotals` (spec #2), and its `totalValue` is kept as
  a structurally separate figure, deliberately never folded into
  Business Worth. The code's own comment names the reason precisely: an
  earlier version of the app fabricated a cash figure by assuming every
  remaining batch unit had sold, and this separation exists specifically
  so that mistake is never repeated.
- A count *can* silently create new `Product` catalog entries via
  case-insensitive name matching, identical to the pattern spec #3
  already documented for Stock Entry (`p.name.toLowerCase() ===
  trimmedName.toLowerCase()`) — reused here exactly, not reinvented.

**The `initial` count — Architecture's strictest immutability tier, and
a real gap in how it's enforced**
- Architecture 7.6 places the `initial` Stock Count in the "truly
  immutable, no exceptions" tier — the *same* tier as a recorded Closing
  or a Timeline Event, stricter than Expenses/Withdrawals' "mutable
  until locked." Architecture 8.6 states this explicitly and pointedly:
  *"The `initial` Stock Count, once written, can never be edited or
  deleted by any role, including Admin — this is enforced at the
  Security Rules layer (7.6), not merely by UI omission, since a
  UI-only restriction would not actually satisfy Principle 2.10."*
- **What's actually implemented does not meet that bar.** There is no
  `updateStockCount` or `deleteStockCount` function anywhere in the
  client — today's protection genuinely is UI omission only, the exact
  condition Architecture 8.6 said would not be sufficient. The Firestore
  rule itself (`firestore.rules` lines 183–187) is: `allow create: if
  isOwnerOf(businessId)`, `allow update, delete: if isOwnerOf(businessId)`
  — with no distinction anywhere in the rule between an `initial` count
  and any other type. An Owner using any tool other than this app's own
  UI (the Firebase console, a direct API call) could update or delete
  the one record every Capital Growth figure in the business is
  permanently measured against, and the Security Rules layer would not
  stop them.
- This is the same category of finding spec #7 and #8 named (a rule that
  doesn't match a stated intent), but the direction and stakes are
  different: those were UI-gating gaps around a role permission; this
  is a genuine hole in the one *"no exceptions"* immutability guarantee
  Architecture places above every other rule in the app.

**No correction path exists today if the `initial` count is wrong**
- Because nothing distinguishes an `initial` count from any other at
  the data layer, and because there is no scoped way to correct or
  replace a single Stock Count of any type, the only recovery path
  visible in the product today if an Owner enters the wrong Initial
  Capital is Settings' "Limpar Todos os Dados" ("Clear All Data")
  action (`SettingsModal.tsx`, gated `isOwner`, behind a `confirm()`
  dialog) — which deletes every Product, Stock Batch, Purchase Batch,
  Quebra, Expense, Withdrawal, Stock Count, and Closing the business has
  ever recorded, not just the one wrong figure. There is no
  proportionate fix for a proportionately small mistake.

**A localization gap, cross-cutting and worth naming plainly**
- Both `InitialStockCountView.tsx` and `PeriodicStockCountView.tsx` use
  hardcoded Portuguese strings throughout ("Contagem de Stock Inicial,"
  "Adicione pelo menos um produto," every label, every error message) —
  neither file imports or calls `t()` at all, unlike every other entry
  form this series has covered (`AddQuebraView.tsx`, `AddExpenseView.tsx`,
  `AddWithdrawalView.tsx`, all fully i18n-driven). Given the platform's
  stated PT/FR/EN localization (Architecture Section 1.4, `src/i18n/locales/`
  containing `en.ts`, `fr.ts`, `pt.ts`), a French- or English-language
  business owner hits fully untranslated Portuguese the moment they try
  to establish their Initial Capital — arguably the single most
  consequential screen in the entire product, since Architecture 3.8.3
  calls it the permanent baseline everything else is measured against.

**Periodic counts compare against the most recent count, not always the
initial one**
- `comparisonBaseline` is the most recent non-`initial` count if one
  exists, falling back to `initialCapitalValue` only if no periodic
  count has ever been recorded (`PeriodicStockCountView.tsx` lines
  84–85) — each new count is compared against the one immediately
  before it, not against the permanent baseline every time. This is a
  reasonable, intentional design (it answers "did stock move since my
  *last* check," not "since day one"), stated here so it's an explicit
  product decision rather than an implicit one a future reader has to
  reverse-engineer from the code.

## Functional Requirements

*Exactly what the module must do.*

1. Record a one-time `initial` Stock Count establishing the permanent
   Initial Business Capital baseline — currently implemented
   (`InitialStockCountView.tsx`), blocked from a second attempt by
   `recordStockCount`'s own check (`hasInitialStockCount`).
2. Record a periodic count (weekly/monthly/quarterly/yearly/custom),
   showing its total value compared against the most recent prior count
   (or the initial baseline if none exists) — currently implemented
   (`PeriodicStockCountView.tsx`).
3. Find-or-create a Product by case-insensitive name match for any
   counted item that doesn't already exist in the catalog — currently
   implemented, identical to spec #3's Stock Entry pattern.
4. Show a running history of past periodic counts, expandable/
   collapsible — currently implemented (`showHistory` state, lines
   407–443).
5. **Not currently implemented, and the most consequential gap this
   spec names:** enforce the `initial` Stock Count's immutability at the
   Security Rules layer, per Architecture 8.6's explicit requirement —
   today's Firestore rule permits update/delete of any Stock Count,
   `initial` included, to any Owner.
6. **Not currently implemented:** any scoped correction path for a
   mistaken Stock Count (of any type) short of "Clear All Data,"
   which removes every record in the business.
7. **Not currently implemented:** localization (`t()` calls) in either
   Stock Count entry form — both currently hardcoded Portuguese.

## Non-functional Requirements

**Performance**
- Recording a count is a single Firestore batch write (products +
  the count document) — O(n) in item count, immaterial at current
  scale.

**Security**
- Tenant isolation via `isMemberOf`/`isOwnerOf` is present, but see
  Business Rules — the `initial` count's stricter, "no exceptions"
  immutability tier is not actually enforced at this layer today, the
  one place Architecture is most explicit that UI omission is
  insufficient.

**Accessibility**
- Numeric fields use `.type-number`/tabular-nums and `font-mono`
  consistently; the growth-comparison indicator pairs its color
  (emerald/rose) with an icon (`TrendingUp`/`TrendingDown`/`Minus`), not
  color alone.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named across every prior module in this series.

**Mobile**
- The product-row grid collapses to stacked, labeled pairs below the
  `sm` breakpoint (`rowGridClass`, both views) — the one entry form in
  this series with an explicit mobile-collapse pattern beyond simple
  full-width stacking, worth noting as a positive precedent for any
  future multi-row entry screen (e.g., a future bulk Purchase Batch
  line-item editor).

## KPIs

**How do we know this module succeeds?**

- The `initial` Stock Count is never editable or deletable by any role
  through any path, verified by test against the Security Rules layer
  directly (not just the UI) — currently unmet, per Functional
  Requirement #5.
- An Admin can complete their Initial Capital count in their own
  language — currently unmet in French or English, per Functional
  Requirement #7.
- Time-to-count: recording a periodic count with 10–20 items takes under
  2 minutes for a business owner already familiar with their stock.

## Future Enhancements

*Ideas — not implementation.*

- **Close the Security Rules gap** for the `initial` count specifically
  — the rule should distinguish `resource.data.type == 'initial'` (or
  equivalent) and refuse update/delete unconditionally, satisfying
  Architecture 8.6's stated requirement rather than relying on UI
  omission.
- **A scoped correction mechanism** — even a single, Owner-only,
  time-boxed "I made a mistake on my very first count" flow (recording
  what it corrects, per Architecture 7.6's general correction pattern)
  would close the current all-or-nothing gap between "live with the
  error" and "delete everything."
- **Localize both Stock Count views** — the single highest-priority item
  in this spec given how early in a business's lifecycle these screens
  are hit.
- **Photo attachment** for a physical count (e.g., a shelf photo as
  supporting evidence) — mirrors the same idea spec #7 raised for
  Quebras.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] The `initial` Stock Count cannot be updated or deleted by any
      role through any path, verified directly against the Firestore
      rule, not only the app's own UI.
- [ ] Both Stock Count entry forms are fully localized, matching every
      other entry form in this series.
- [ ] A product decision has been made on whether a scoped correction
      mechanism will be built, or whether "Clear All Data" remains the
      only recourse — not left as an unreviewed gap.
- [ ] A periodic count's comparison-baseline behavior (most recent
      count, not always the permanent initial one) has been confirmed
      as intentional by product ownership, per the Business Rules note
      above.
