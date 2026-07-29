# Sabush Component Library

**Status:** Drafted — Phase -1 Governance, document #2 (follows
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md))
**Purpose:** Document every reusable component to the standard of
Props / Usage / Variants / Rules / Examples, so a screen is assembled
from named, governed components — never rebuilt from raw `div`s and
Tailwind classes copied from the nearest similar-looking screen.

**How this document was built:** every entry below was read directly out
of `src/` before being written down. Two categories emerged, and both are
labeled honestly rather than presented as equally "done":

- **Extracted** — a real, standalone component already exists (`KpiCard`,
  `ReportKpiCard`, `TimelineEventCard`). Documented as-is, its real props,
  real variants, real file location.
- **Inline pattern (not yet extracted)** — the visual pattern exists and
  is used consistently (a stock batch row, a business list row, a
  destructive-delete flow), but it's still hand-written inline inside a
  view file rather than living as its own component with props. These are
  documented with a **target spec** — the props/variants it should have
  once extracted — specifically so the *next* time one of these patterns
  is needed, it gets built as the named component below instead of copied
  and slightly modified again. This is Governance Document #2 doing for
  components what Section 15 (Architecture Validation) already did for
  architecture: naming the gap explicitly instead of letting it stay
  silent.

This document does not ask for every "inline pattern" to be extracted
today — extraction is implementation work, scheduled like any other
(Development Strategy, Section 13). What it does is guarantee that when
that extraction happens, or when a new screen needs one of these patterns
next, there's one correct shape to build against, not an invitation to
invent a fifth slightly-different card.

---

## Table of Contents

1. [KPI Card](#1-kpi-card) — Extracted
2. [Metric Card](#2-metric-card) — Extracted
3. [Timeline Item](#3-timeline-item) — Extracted
4. [Business Card](#4-business-card) — Inline pattern, target spec
5. [Stock Card](#5-stock-card) — Inline pattern, target spec
6. [Report Table](#6-report-table) — Inline pattern, target spec
7. [Confirmation Dialog](#7-confirmation-dialog) — **Does not exist — governance gap**
8. [Supporting components already extracted](#8-supporting-components-already-extracted)

---

## 1. KPI Card

**Status:** Extracted — `KpiCard`, defined in
`src/components/DashboardView.tsx` (lines 43–130).

**Purpose:** The large, primary metric card used on the Dashboard — one
number the admin needs to see and understand in a glance, with an icon,
label, and one line of plain-language explanation underneath. This is
the component most directly serving the product's core promise (Business
Worth, Capital, Embedded Profit "in the time it takes to check WhatsApp"
— Architecture Section 1.7).

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `icon` | `React.ComponentType<{ className?: string }>` | Yes | A `lucide-react` icon component, per [Iconography](./DESIGN_SYSTEM.md#iconography) |
| `iconBgClass` | `string` | Yes (light variant) | Icon circle background class — ignored in `variant="dark"` |
| `iconTextClass` | `string` | Yes (light variant) | Icon color class — ignored in `variant="dark"` |
| `label` | `string` | Yes | Short caption above the number |
| `value` | `string` | Yes | Pre-formatted display value — this component does no calculation or currency formatting itself (Architecture Principle 2.9: only the Calculation Engine computes financial figures) |
| `valueClass` | `string` | No | Override the value's color — used for semantic tone (e.g. red for a negative capital growth figure) |
| `description` | `string` | Yes | One line of plain-language context below the number |
| `onClick` | `() => void` | No | Card becomes interactive (hover-lift, cursor pointer) only if provided |
| `badge` | `React.ReactNode` | No | Optional element rendered top-right, next to the icon/label row |
| `action` | `boolean` | No | Renders the gold-tint "Action Card" treatment (`.card-premium.is-action`) — for a card demanding attention, e.g. "set your Initial Capital" |
| `variant` | `'light' \| 'dark'` | No, defaults `'light'` | `'dark'` renders the navy `.card-dark-gradient` "Highlight Card" treatment |

### Usage

```tsx
<KpiCard
  icon={Landmark}
  iconBgClass="bg-[#0B1F3A]/[0.06]"
  iconTextClass="text-[#0B1F3A]"
  label="Valor do Negócio"
  value={formatCurrency(businessWorth, currencySymbol)}
  description="Capital investido + lucro embutido em stock"
  variant="dark"
/>
```

### Variants

| Variant | When to use |
|---|---|
| `light` (default) | The default for all standard dashboard metrics — inventory count, expenses, withdrawals |
| `light` + `action={true}` | A metric that also demands an action from the admin (gold-tint background) |
| `dark` | Reserved for the platform's flagship figures only — Business Worth, Embedded Profit. Never more than 1–2 dark cards on a single screen, per [Cards](./DESIGN_SYSTEM.md#cards)'s "never more than one `.card-dark-gradient` per screen" rule — if a third metric feels like it deserves the dark treatment, that's a sign one of the existing dark cards should move to light, not that the rule should bend. |

### Rules

- `value` is always pre-formatted by the caller (via `formatCurrency` or
  equivalent) — this component never formats currency itself.
- `onClick` absence must visually read as non-interactive (`cursor-default`,
  no hover-lift) — a KPI Card is not a de facto button unless it's wired
  to navigate somewhere specific.
- An AI-derived value (a Business Worth *Prediction*, Architecture Section
  10.3) is never rendered through this component as-is — it must carry
  the AI Insight badge treatment from
  [DESIGN_SYSTEM.md → Notifications](./DESIGN_SYSTEM.md#notifications)
  via the `badge` prop, so a forecast is never visually indistinguishable
  from a real, recorded Dashboard figure.

### Examples

- Real figure, light, non-interactive: current Stock Value.
- Real figure, light, interactive: "Add Stock" action card
  (`action={true}`, `onClick` navigates to Add Stock).
- Real figure, dark, flagship: Business Worth, Embedded Profit.
- **Not yet built, but the exact case this component needs to support
  without modification once Phase 3 AI features ship (Development
  Strategy, Section 13.7):** Business Worth *Prediction*, light variant,
  `badge={<AIInsightBadge />}` — no new prop needed, the existing `badge`
  slot already covers it.

---

## 2. Metric Card

**Status:** Extracted — `ReportKpiCard`, defined in
`src/components/reports/shared/ReportUI.tsx` (lines 11–46).

**Purpose:** The smaller, denser stat card used inside Reports — several
sit in a grid at the top of a report, unlike the KPI Card which stands
alone or in a 2–3 card dashboard row. **Do not confuse this with KPI
Card** — they look similar but solve different layout problems (one
flagship number vs. a grid of related figures) and are genuinely
different components, not a missed opportunity to merge into one. Merging
them would mean either the Dashboard loses its large, single-figure
emphasis or Reports lose the density they need to show 4-6 related
figures without scrolling — worth stating explicitly since "why are there
two card components that look alike" is the natural question this
document should answer, not leave open.

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `icon` | `React.ComponentType<{ className?: string }>` | Yes | `lucide-react` icon |
| `label` | `string` | Yes | Caption above the value |
| `value` | `string` | Yes | Pre-formatted display value |
| `tone` | `'default' \| 'positive' \| 'negative' \| 'accent'` | No, defaults `'default'` | Drives both text color and icon-background color together — never set independently |
| `sub` | `string` | No | Optional smaller line below the value, for extra context that doesn't fit in `label` |

### Usage

```tsx
<ReportKpiCard
  icon={TrendingUp}
  label="Crescimento de Capital"
  value={formatCurrency(growth, currencySymbol)}
  tone={growth >= 0 ? 'positive' : 'negative'}
  sub="Comparado ao período anterior"
/>
```

### Variants

| Tone | Use |
|---|---|
| `default` | Neutral figures — a count, a date-range total with no inherent good/bad direction |
| `positive` | A figure that's good news at its current sign (profit, growth) |
| `negative` | A figure that's concerning at its current sign (loss, shrinkage) |
| `accent` | The one figure in a report grid that should read as the headline of that specific report — gold, used exactly as sparingly here as everywhere else in the system |

### Rules

- Always used in a grid (typically `grid-cols-2 sm:grid-cols-3` or
  similar) — never as a single standalone card, which is precisely the
  KPI Card's job instead.
- `tone` is the *only* place color enters this component — never override
  the value's color with an ad hoc class the way `KpiCard.valueClass`
  allows, since Metric Card's whole reason to exist is a denser, more
  uniform grid; a one-off color override defeats that uniformity.

### Examples

Every Report screen's top row (Business Worth Report, Capital Growth
Report, Stock Verification Report) — 3-4 `ReportKpiCard`s in a grid, each
`tone`d to whether that figure is good, bad, or neutral news.

---

## 3. Timeline Item

**Status:** Extracted — `TimelineEventCard`, defined in
`src/components/timeline/TimelineEventCard.tsx`.

**Purpose:** A single entry in the Business Timeline (Architecture
Section 3, Domain: Timeline) — one recorded event (a Closing, a Quebra, a
Stock entry) rendered as a tappable card that opens its full detail.

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `event` | `TimelineEvent` | Yes | The full event object — icon, color, and financial-impact rows are all derived from `event.type` via `ACTIVITY_ICON`/`ACTIVITY_COLOR` (`timelineHelpers.ts`), never passed in separately |
| `currencySymbol` | `string` | Yes | For formatting `financialImpact` amounts |
| `onSelect` | `() => void` | Yes | Opens the event's detail modal |
| `align` | `'left' \| 'right'` | No, defaults `'left'` | Desktop-only alternating layout (a classic timeline visual rhythm) — explicitly ignored on mobile, where every card is full-width regardless of `align` |

### Usage

```tsx
<TimelineEventCard
  event={event}
  currencySymbol={currencySymbol}
  onSelect={() => setSelectedEvent(event)}
  align={index % 2 === 0 ? 'left' : 'right'}
/>
```

### Variants

Variants come entirely from `event.type` via the shared
`ACTIVITY_ICON`/`ACTIVITY_COLOR` maps in `timelineHelpers.ts`, not from a
`variant` prop on this component — this is intentional: it guarantees a
Closing always looks like a Closing everywhere it appears in the Timeline,
rather than each call site choosing its own icon/color per event type.

The one prop-driven variant is the financial-impact tone, per event:

| `financialImpact[].tone` | Color |
|---|---|
| `positive` | `text-emerald-600` |
| `negative` | `text-rose-600` |
| `neutral` | `text-gray-700` |

### Rules

- Never render an event's icon or color outside this component's own
  `ACTIVITY_ICON`/`ACTIVITY_COLOR` lookup — if a new event type needs a
  new icon/color, it's added to `timelineHelpers.ts`, not hardcoded at
  the call site.
- `financialImpact` rows only render if present and non-empty — an event
  with no financial impact (e.g., a Business Growth milestone) is a valid,
  normal case, not a broken one.

### Examples

The Business Timeline's main scrolling list (`BusinessTimelineView.tsx`)
is this component's only real consumer today — one card per recorded
event, alternating `align` on desktop.

---

## 4. Business Card

**Status:** Inline pattern (not yet extracted) — currently lives as a
per-row `<button>` inside `ShopSwitcher.tsx` (lines 86–101), styled as a
dropdown menu row, not a standalone card component.

**Why this belongs in the library even though it isn't extracted yet:**
this exact visual unit — business name, category, active/selected state —
is about to be needed in a second place. SuperAdmin's Tenant Management
screen (Architecture Section 9.3, Development Strategy Phase 2) needs to
render a list of businesses too, at platform-operator scale rather than
the 1-10 shops a single owner has. Building that screen without this
entry existing first means SuperAdmin invents its own, slightly different
business-row styling — exactly the drift this whole document series
exists to prevent. This entry is the target spec so that when either
ShopSwitcher gets refactored or SuperAdmin gets built, both draw from one
component.

### Target Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | Business name |
| `category` | `string` | No | Business category, shown as a muted secondary line if present |
| `businessCode` | `string` | No | Shown only in contexts where the code matters (SuperAdmin's Tenant Management; not needed in the owner-facing ShopSwitcher, since the owner already knows which shop is which by name) |
| `isActive` | `boolean` | No, defaults `false` | Renders the gold check-mark / selected treatment |
| `onSelect` | `() => void` | No | Card becomes clickable if provided |
| `size` | `'compact' \| 'default'` | No, defaults `'default'` | `compact` is the current ShopSwitcher dropdown-row density; `default` is a full `.card-premium`-wrapped card for a grid/list context like SuperAdmin's Tenant Management |

### Target Variants

| Variant | Use |
|---|---|
| `compact`, no card wrapper | ShopSwitcher's dropdown list — current real usage, unchanged |
| `default`, `.card-premium` wrapped | SuperAdmin Tenant Management list, or any future owner-facing "all my shops" grid view beyond the dropdown |

### Rules

- The icon is always a neutral `Store` icon (`lucide-react`) in a
  `--muted`-tinted circle — a business doesn't get a custom icon or logo
  in this component; that's out of scope for both current usage sites.
- `isActive` uses the gold check mark exclusively (per the existing
  ShopSwitcher pattern) — never a background-color change on the whole
  row, consistent with the same "state indicator, not background change"
  rule already established for the Notification feed's read/unread dot
  in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#notifications).

### Examples

- Current: `ShopSwitcher`'s dropdown, one row per owned business.
- Target, not yet built: SuperAdmin's Businesses/Tenant Management screen
  (Section 9.3) — same component, `size="default"`, `businessCode` shown,
  `onSelect` opens that business's admin detail view instead of switching
  the active shop.

---

## 5. Stock Card

**Status:** Inline pattern (not yet extracted) — currently lives inline
in `StocksView.tsx` (lines 294–358), one per Purchase Batch summary.

### Target Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `batchNumber` | `string` | Yes | Rendered `.type-number` (tabular figures) |
| `status` | `'active' \| 'partially_remaining' \| 'fully_consumed' \| 'archived'` | Yes | Drives the status badge color, see Variants |
| `isLegacy` | `boolean` | No | Shows the neutral "legacy" badge for pre-migration batches |
| `date` | `string` | Yes | Pre-formatted |
| `supplierName` | `string` | Yes | |
| `productCount` | `number` | Yes | Pluralization handled by the caller via i18n, not this component |
| `investedValue` | `string` | Yes | Pre-formatted currency |
| `marketValue` | `string` | Yes | Pre-formatted currency |
| `embeddedProfit` | `string` | Yes | Pre-formatted currency |
| `embeddedProfitTone` | `'positive' \| 'negative'` | Yes | Derived by the caller from the sign of the raw value — this component only applies the color, per the same "no calculation inside a presentational component" rule as KPI Card |
| `onSelect` | `() => void` | Yes | Opens the Batch Detail view |

### Target Variants (status badge)

| `status` | Style |
|---|---|
| `active` | `bg-emerald-50 text-emerald-700 border-emerald-500/30` |
| `partially_remaining` | `bg-amber-50 text-amber-700 border-amber-500/30` |
| `fully_consumed` | `bg-gray-100 text-gray-600 border-gray-300` |
| `archived` | `bg-gray-100 text-gray-500 border-gray-300` |

These four map directly to `PurchaseBatchStatus` (Architecture Section
7) — the badge's job is to make the Investment Ledger's batch lifecycle
(Architecture Section 8.3) legible at a glance, not to introduce a
separate visual vocabulary for batch state.

### Rules

- The three trailing figures (`investedValue`, `marketValue`,
  `embeddedProfit`) always appear together, in that fixed order, right-
  aligned, `.type-number` — never a subset, since the whole point of this
  card is showing capital-invested vs. current-market vs. embedded-profit
  side by side at a glance (Mission's own "Embedded Profit" scale target).
- This card is always the collapsed/summary state; tapping it opens the
  full Batch Detail modal — this component itself never expands in place.

### Examples

`StocksView.tsx`'s main batch list — the only current consumer. A future
consumer once extracted: any screen needing a compact batch reference
(e.g., a "select a batch" step inside another flow) without duplicating
this markup a second time.

---

## 6. Report Table

**Status:** Inline pattern (not yet extracted) — every report
(`BusinessWorthReport.tsx`, `BatchPerformanceReport.tsx`,
`CapitalGrowthReport.tsx`, `InventoryValuationReport.tsx`,
`StockVerificationReport.tsx`) builds its own `<table>` directly, sharing
only the `.table-clean` CSS class from
[DESIGN_SYSTEM.md → Tables](./DESIGN_SYSTEM.md#tables) — not a shared
component with columns/rows as props.

**Why this is worth a target spec even though `.table-clean` already
guarantees visual consistency:** the CSS class keeps every report table
looking the same, but five separate hand-written `<table>` structures
still mean five separate places to apply the [Tables](./DESIGN_SYSTEM.md#tables)
rules added in Design System v2.0 — right-aligned numeric columns,
`.type-number` formatting, neutral row-action icons, sortable-header
styling. A shared `ReportTable` component would apply all four
automatically instead of relying on five files staying manually in sync.

### Target Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `columns` | `{ key: string; label: string; align?: 'left' \| 'right'; sortable?: boolean }[]` | Yes | `align="right"` columns automatically get `.type-number` styling per [Tables](./DESIGN_SYSTEM.md#tables) |
| `rows` | `Record<string, React.ReactNode>[]` | Yes | |
| `sortKey` / `onSort` | `string` / `(key: string) => void` | No | Only needed if any column is `sortable` |
| `emptyMessage` | `string` | No | Falls back to `ReportEmptyState` (already extracted, `ReportUI.tsx`) if `rows` is empty — this component reuses that existing piece rather than duplicating an empty-state pattern |
| `rowActions` | `(row) => React.ReactNode` | No | Rendered as a trailing, unlabeled column — icons only, per [Tables](./DESIGN_SYSTEM.md#tables)'s neutral-until-hover rule |

### Rules

- A numeric column is never left-aligned "because it looked fine in this
  report" — `align="right"` plus `.type-number` is not optional for any
  currency or count column, per the Design System's own Tables section.
- This component wraps `.table-clean` — it does not introduce a
  competing table styling approach.

### Examples

Not yet built. Once extracted, every one of the five report files listed
above becomes this component's consumer — replacing five independent
`<table>` implementations with one.

---

## 7. Confirmation Dialog

**Status: does not exist. This is a governance gap, named directly.**

Every destructive action found in `src/` today (`ProductDetailModal.tsx`'s
delete-product flow, and others matching the same pattern) uses the
browser's native `window.confirm()` — a plain, unstyled OS dialog with no
navy, no gold, no `--radius` tokens, no Sabush branding at all. This is
the one place in the entire product where the brand-color-elimination
discipline already applied everywhere else (Design System v1.0's original
purpose) simply doesn't reach, because `window.confirm()` isn't a Sabush
component — it's the browser's own UI, rendered outside the app entirely.

**This is exactly the kind of gap Phase -1 Governance exists to catch
before Phase 0 implementation starts** — not a style nitpick, but the one
interaction in the product where an admin about to permanently delete a
product, a batch, or (once built) a whole Business (Architecture Section
7.9's `status: 'closed'`) sees a jarring, off-brand system dialog at the
single highest-stakes moment in the interface.

### Target Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | |
| `title` | `string` | Yes | e.g. "Eliminar Produto?" |
| `message` | `string` | Yes | States plainly what will be permanently affected — matching the specificity `ProductDetailModal`'s current `window.confirm()` message already gets right ("...e todos os lotes e perdas associados"), just rendered in-brand instead of in a browser alert |
| `confirmLabel` | `string` | No, defaults `"Eliminar"` | |
| `cancelLabel` | `string` | No, defaults `"Cancelar"` | |
| `onConfirm` | `() => void` | Yes | |
| `onCancel` | `() => void` | Yes | |
| `isDestructive` | `boolean` | No, defaults `true` | Non-destructive confirmations (e.g., "discard unsaved changes?") set this `false` to use navy instead of rose for the confirm button |

### Target Structure

Exactly the pattern already specified in
[DESIGN_SYSTEM.md → Dialogs & modals](./DESIGN_SYSTEM.md#dialogs--modals):
a rose-tinted banner (`bg-rose-500/10`, `border-rose-500/30`,
`text-rose-700`) inside a small (`--radius-lg`, single-purpose)
dialog, confirm button in rose (not gold, not navy) for destructive
actions, cancel to its left in `.btn-ghost`.

### Rules

- **No destructive action anywhere in the product calls
  `window.confirm()` once this component exists.** This is the one
  component in this entire library where "extract it eventually" isn't
  the right framing — a native browser dialog at a delete action is a
  brand and trust gap every day it isn't replaced, not a cosmetic
  nice-to-have.
- The message always names what's specifically affected (product name,
  count of associated batches/records) — never a generic "Are you sure?"
  with no specifics, matching the standard the current `window.confirm()`
  call already (correctly) sets.

### Examples

Not yet built. Immediate real consumers once it exists:
`ProductDetailModal`'s delete-product action, and every future
destructive action this product adds — most notably the Business
`status: 'closed'` action (Architecture Section 7.9/8.12), which is
exactly the kind of high-stakes, irreversible-feeling action this
component was designed for.

---

## 8. Supporting components already extracted

Documented briefly — real, working, no gap to flag — so this library is a
complete map of `src/components/reports/shared/ReportUI.tsx`, not a
partial one:

| Component | Purpose |
|---|---|
| `InsightBanner` | Auto-generated, plain-language summary line(s) inside a report, derived strictly from numbers already shown in that report — gold-tinted, `Lightbulb` icon. Note for Phase 3 (AI Features): this is the correct home for AI-derived Recommendations (Architecture 10.7) once built, but only once the AI Insight badge treatment ([DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#notifications)) is added to it — today `InsightBanner` implies "derived from the numbers you're already looking at," not "a model's prediction," and those are different trust claims that shouldn't share one visual treatment without the distinction being explicit. |
| `ReportHeader` | Back button, title, description, and export actions (PDF/Excel/Print) — every report screen's top bar |
| `ReportSection` | White-card wrapper for a titled sub-section within a report |
| `PillToggle` | Sort/group toggle control — gold-filled active pill, gray inactive |
| `ReportEmptyState` | The report-context empty state — reused by [Report Table](#6-report-table)'s target spec above rather than duplicated |
| `ExpandChevron` | Up/down chevron for expandable table rows |

---

## What This Document Enables

Any future screen — SuperAdmin's Businesses list (needs Business Card),
a future batch-picker flow (needs Stock Card), the Notifications domain's
own list view (needs a Report-Table-style structured list) — now has a
named target to build against instead of inventing its own card or table
shape. And the one true gap this pass surfaced, [Confirmation
Dialog](#7-confirmation-dialog), is now a named, scoped, ready-to-build
item rather than an unnoticed inconsistency living in a `window.confirm()`
call.
