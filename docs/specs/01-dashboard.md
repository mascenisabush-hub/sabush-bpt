Business Domain Specification

# Dashboard

Version 1.0
**Status:** ✅ Approved
**Module #1 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 1](../architecture/01-product-vision.md)
(Product Vision), [Section 3.1](../architecture/03-domain-architecture.md)
(Domain relationships), [Section 7.2](../architecture/07-data-architecture.md)
(`businessCode` amendment), [Section 8.2 & 8.14](../architecture/08-module-architecture.md)
(Calculation Engine, Dashboard module entry)
**Design references:** [Design System v2.0](../../DESIGN_SYSTEM.md) —
KPI Card treatment, Cards, Iconography · [Component Library](../../COMPONENT_LIBRARY.md) — [KPI Card](../../COMPONENT_LIBRARY.md#1-kpi-card)
**Implementation:** `src/components/DashboardView.tsx`

---

## Purpose

**Why does this module exist?**

Dashboard is the first thing an Admin sees, and the single view the
product's entire value proposition has to prove itself in. Architecture
Section 1.7 states the product's promise directly: an Admin understands
their business's financial health "in the time it takes to check
WhatsApp" — Dashboard is the screen that promise is actually made or
broken on. Every other module (Reports, Timeline, Products) exists to let
an Admin go deeper into a number; Dashboard's job is to make sure they
never *have* to, for the handful of numbers that matter most, most days.

## Business Problem

**What business problem does it solve?**

The target Admin (Architecture Section 1.4) — a small or micro business
owner in Mozambique, often without formal bookkeeping training — has no
existing fast, trustworthy answer to "is my business doing well right
now?" The realistic alternative is a mental estimate, a notebook, or
nothing. Dashboard replaces that gap with nine specific, always-current
figures the Admin doesn't have to calculate, ask an accountant for, or
wait until month-end to see.

## Users

| Role | Access |
|---|---|
| **Owner** (Admin) | Full access — every KPI card, product search, breakdown modals |
| **Manager** | Full read access, same view as Owner — a Manager is a delegated Admin-tier staff member (Architecture Section 6.3), not a restricted view |
| **Staff** | Access per their assigned permissions (Architecture Section 6.2) — Dashboard is not automatically hidden from Staff, but a Staff account with narrow permissions may see a subset of cards depending on what they're scoped to view |
| **SuperAdmin** | No direct access to a tenant's Dashboard — SuperAdmin only ever reads aggregated, cross-tenant figures via `platform_aggregates` (Architecture Section 9.2, 3.1), never a live view into one business's own Dashboard |

## User Stories

- As a **Business Owner**, I want to know today's Business Worth, so
  that I can understand whether my capital is growing.
- As a **Business Owner**, I want to see my Embedded Profit at a glance,
  so that I know how much value is sitting unsold in my stock right now.
- As a **Business Owner**, I want to be reminded to set my Initial
  Capital if I haven't yet, so that every figure the Dashboard shows me
  afterward is meaningful, not zero.
- As a **Manager**, I want the same Dashboard view as the Owner, so that
  I can make informed day-to-day decisions without needing the Owner
  present.
- As an **Owner with multiple shops**, I want to see which shop's data
  I'm currently looking at, so that I never mistake one shop's numbers
  for another's.
- As an **Owner**, I want to search and sort my products from the
  Dashboard, so that I can check on a specific product without
  navigating to a separate screen.
- As a **support agent (SuperAdmin/Support role)**, I want the Admin's
  `businessCode` visible on their own Dashboard, so that when they call
  support, they can read out one short code instead of trying to spell
  a business name.

## Business Rules

**Business Worth**
- Never editable directly.
- Calculated only — always derived via `calculateInventoryTotals`
  (Architecture Section 8.2), never a separately maintained number.
- Must never disagree with the same figure shown on a Report (Section
  8.9) or a Closing snapshot (Section 8.8) for the same underlying data —
  all three read the identical calculation functions by design, not by
  convention (Section 8.14, Section 15.8's validation).

**Embedded Profit**
- Same rule as Business Worth: calculated only, via the same engine.
- An open batch's contribution to Embedded Profit is an estimate
  (`isEstimate: true`, Section 8.2) — the Dashboard does not present an
  open batch's profit with the same visual certainty as a closed one; see
  Functional Requirements below for how this is currently and should be
  surfaced.
- Never implies a "sale" or "revenue" occurred — Embedded Profit is
  unsold inventory value (Section 8.2, Section 1.8's Worth-First scope
  test).

**Initial Capital**
- Until set, every dependent figure (Business Worth, capital growth
  percentage) is meaningless — the Dashboard must make the unset state
  impossible to miss, not a quiet zero.
- Once set via Initial Stock Count, becomes historical — not silently
  editable from the Dashboard itself.

**`businessCode` display**
- Always visible under the business/Admin name, no extra navigation
  required (Section 8.14's amendment).
- For a multi-shop Admin, always matches whichever business is currently
  selected in `ShopSwitcher` (Section 8.12) — never a stale value carried
  over from a previous shop selection.

**Data currency**
- Every figure reflects the live state of the business's data at render
  time — Dashboard is explicitly framed by Architecture Section 5.9 as
  "always-current," not a periodic or cached report (distinct from
  SuperAdmin's own Dashboard, which does read from a short-lived cache
  per Section 11.4 — that caching applies to platform-level aggregation,
  never to a tenant's own Dashboard).

## Functional Requirements

*Exactly what the module must do — reflects the real, current
implementation in `DashboardView.tsx`.*

1. **Render nine KPI cards**, via the [KPI Card](../../COMPONENT_LIBRARY.md#1-kpi-card)
   component, in two groups:
   - **Primary grid (6 cards, always visible, top of screen):** Initial
     Capital, Stock Cost (total Investment Value), Market Value, Embedded
     Profit (`variant="dark"`), Business Worth (`variant="dark"`),
     Expenses.
   - **Secondary grid (3 cards, grouped under an "Other Indicators"
     label):** Withdrawals, Quebra (Breakage) Loss, Active Batches count.
2. **Initial Capital card** must render in its unset state
   (`action={true}`, gold-tinted, clickable) until an Initial Stock Count
   exists, and switch to its normal state automatically the moment one is
   recorded — no manual refresh or separate "activate" step.
3. **Business Worth card** must show a capital-growth badge (percentage,
   up/down arrow) whenever Initial Capital is set and growth is non-zero
   — hidden entirely otherwise, never showing a misleading `0.0%`.
4. **Embedded Profit card**, on click, opens a breakdown modal — the
   Dashboard's summary figure must be traceable to its components without
   leaving the screen.
5. **Business Worth card**, on click, opens a worth breakdown modal —
   same traceability requirement as Embedded Profit.
6. Display the active business's `businessCode` under the business name,
   updating immediately on shop switch (`ShopSwitcher`, Section 8.12).
7. **Product search and sort**, below the KPI grid: search by product
   name; sort by name, cost, or embedded profit (highest first) —
   computed client-side from already-loaded data, not a separate query.
8. Every value shown is pre-formatted currency (`formatCurrency`) in the
   business's configured currency symbol — this module performs no
   currency conversion or formatting logic of its own beyond calling the
   shared formatter.
9. All labels and descriptions are sourced through the i18n layer
   (`t('dashboard.kpi....')`) — no hardcoded Portuguese, English, or
   French string is placed directly in this module.

## Non-functional Requirements

**Performance**
- Dashboard must render its full KPI grid without a visible layout shift
  once data has loaded — cards render in their final position immediately,
  never re-flowing as data arrives late.
- No calculation is performed inside this module — every figure is
  computed by the Calculation Engine (Section 8.2) beforehand; Dashboard
  is presentation-only, keeping its own render cost independent of how
  large the underlying data set grows (Architecture Section 11's scaling
  discipline applies here specifically: a Dashboard that recalculated
  totals client-side on every render would degrade first as batch/product
  counts grow).

**Security**
- Every figure rendered is already scoped to the active business by the
  Security Rules and data-fetch layer beneath `AppContext` (Section
  7.1) — Dashboard itself performs no additional tenant-scoping logic,
  and must never be the layer relied upon to enforce it.
- `businessCode` display does not create a new information-disclosure
  risk — it is designed by Section 7.2 to be safely readable and speakable
  precisely because it carries no sensitive information on its own.

**Accessibility**
- Every KPI card's numeric value uses tabular figures (`.type-number`,
  Design System) so figures remain legible and aligned regardless of
  digit count.
- Icon-only affordances (e.g., the capital-growth trend arrow) are always
  paired with a text value (the percentage) — never color or icon alone
  conveying the direction of change.
- Minimum 44×44px touch target on every interactive card, per
  [DESIGN_SYSTEM.md → Mobile Rules](../../DESIGN_SYSTEM.md#mobile-rules).

**Offline**
- **Not currently implemented.** There is no Firestore offline
  persistence layer and no service worker in this codebase today (unlike
  `sabush-pos`, which has PWA/service-worker infrastructure from prior
  work). This is a real, named gap, not an assumed capability — Dashboard
  currently requires a live connection to load or refresh. Flagged here
  so a future spec revision or Development Strategy phase addresses it
  deliberately rather than someone assuming it already works.

**Mobile**
- Grid collapses from 6 columns (desktop) down to 2 columns (mobile) —
  `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` — never a
  single-column stack, which would push the Business Worth card below the
  fold on a small screen, undermining the "understand health within 5
  seconds" KPI below.
- Bottom tab navigation (not Dashboard-specific, but Dashboard is the
  default landing tab) per [DESIGN_SYSTEM.md → Mobile Rules](../../DESIGN_SYSTEM.md#mobile-rules).

## KPIs

**How do we know this module succeeds?**

- Dashboard loads and renders its full KPI grid in under 2 seconds on a
  typical shared-device mobile connection.
- An Admin can state whether their business is growing or shrinking
  within 5 seconds of opening the app — the Business Worth card's
  growth badge is the concrete mechanism this depends on.
- Zero instances, in production, of a Dashboard figure disagreeing with
  the same figure on a Report or Closing snapshot for the same data (this
  is a data-integrity KPI, not a UX one — Section 15.8 already names a
  disagreement here as a failure, not a bug).
- Initial Capital unset-state click-through rate — a meaningful share of
  Admins who see the unset-state card should complete an Initial Stock
  Count within their first session, since every other figure depends on
  it.

## Future Enhancements

*Ideas — not implementation.*

- **AI Insight summary card** (Architecture Section 10.8) — an additive
  card once Phase 3 AI features ship, never a restructure of the existing
  grid. Must use the AI Insight badge treatment
  ([DESIGN_SYSTEM.md → Notifications](../../DESIGN_SYSTEM.md#notifications))
  so a prediction is never visually confused with the eight real,
  recorded figures around it.
- **Subscription-status banner** (Architecture Section 3.13) — once the
  Subscriptions domain ships (Development Strategy Phase 1), a small,
  dismissible banner for trial/renewal states, additive above the KPI
  grid.
- **Notification feed entry point** — once Notifications ships
  (Development Strategy Phase 1), a bell icon surfacing unread count,
  per the pattern in [DESIGN_SYSTEM.md → Notifications](../../DESIGN_SYSTEM.md#notifications).
- **Offline read access** — showing the last-synced KPI values with a
  visible "offline / last updated" indicator, rather than the module's
  current behavior of requiring a live connection. Explicitly not
  scoped for this version; named here so it isn't lost.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] All nine KPI cards render correctly for a business with data, and
      correctly for a brand-new business with no Initial Stock Count yet.
- [ ] Business Worth and Embedded Profit are provably identical to the
      same figures on the Business Worth Report and Capital Growth Report
      for the same data (Architecture 8.14's own stated rule).
- [ ] `businessCode` is visible and updates correctly across a shop
      switch for a multi-shop Owner.
- [ ] Product search and sort function correctly against the full loaded
      product set.
- [ ] Every string is sourced via the i18n layer and renders correctly in
      all three supported languages (pt/en/fr).
- [ ] Every interactive element meets the 44×44px minimum touch target on
      mobile.
- [ ] No calculation logic exists inside `DashboardView.tsx` itself —
      confirmed by code review against Section 8.2's "presentation only"
      rule, not just by visual testing.
