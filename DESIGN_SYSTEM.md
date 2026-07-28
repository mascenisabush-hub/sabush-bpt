# Sabush Design System v2.0

This is the single source of truth for how every screen, component, and
state in this product looks and behaves — not just color and spacing, but
every category listed in the table of contents below. It exists so a
design decision gets made **once**, here, instead of re-invented per
screen or per developer. **If a value or pattern isn't defined here, don't
invent one — add it here first, then use it everywhere.**

This is a **governance document**, not a style suggestion. It is Phase -1
of the Sabush BPT engineering program — written before Phase 0 of the
[Development Strategy](./docs/architecture/13-development-strategy.md)
begins, on the premise that a team that already knows Section 2.11
(Design System Discipline) requires every new surface to reconcile
against this file needs the file to actually *cover* every surface first.
SuperAdmin (Phase 2), Subscriptions/Notifications UI (Phase 1), and every
AI Insight card (Phase 3) all get built against what's below — not
invented fresh when each one arrives.

**v2.0 changes from v1.0:** adds Forms (beyond the base input), Dialogs,
Empty & Loading States, Notifications, Charts, Iconography, Mobile Rules,
and a formal Border Radius scale — every one of these either already
existed as an unwritten, inconsistently-applied convention in `src/`
(Dialogs, Empty States, Iconography, Radius) or doesn't exist in the
codebase yet and is defined here *before* the domain that needs it is
built (Notifications, Charts), per the same "don't invent it live" rule
this document has always enforced for color and spacing.

## Table of Contents

1. [Non-negotiable rules](#non-negotiable-rules)
2. [Color system](#color-system)
3. [Spacing scale](#spacing-scale)
4. [Border radius scale](#border-radius-scale)
5. [Shadow / elevation levels](#shadow--elevation-levels)
6. [Typography hierarchy](#typography-hierarchy)
7. [Iconography](#iconography)
8. [Interaction system](#interaction-system)
9. [Buttons](#buttons)
10. [Cards](#cards)
11. [Forms & inputs](#forms--inputs)
12. [Tables](#tables)
13. [Dialogs & modals](#dialogs--modals)
14. [Empty & loading states](#empty--loading-states)
15. [Notifications](#notifications)
16. [Charts](#charts)
17. [Mobile rules](#mobile-rules)
18. [How to invoke this](#how-to-invoke-this)

---

## Non-negotiable rules

**Never:**
- Mix random spacing, radius, or shadow values — every gap/padding/margin
  comes from the spacing scale, every rounded corner from the radius
  scale, every drop shadow from the elevation levels. Not a one-off `px`
  or hex value picked to make something look right in the moment.
- Overuse colors — navy, gold, and orange each have exactly one job (see
  Color System). Don't reach for a color because it's available; reach
  for it because its job is what's needed here. This applies as much to a
  chart's second data series as it does to a button.
- Make everything bold — bold is for the thing that matters most on the
  screen. If every label and value is bold, nothing is.
- Add unnecessary borders — a card doesn't need a border *and* a shadow
  *and* a background tint to read as separate from the page. Pick the
  minimum that creates the separation.
- Invent a new icon library, chart library, or toast library without
  updating this document first — "everything comes from the Design
  System" includes the *tools* a screen is built with, not only the
  values inside them.

**Always:**
- Create hierarchy — one dominant element per screen (usually a KPI or a
  primary action), everything else recedes.
- Use whitespace — spacing does the separating; borders are the
  exception, not the default.
- Highlight only important things — gold and orange are for what the
  user should notice first, not decoration.
- Keep it clean — white is ~60-70% of any surface. Structure and accent
  colors are the minority.
- Label a prediction as a prediction. Any AI-derived figure or insight
  (Business Worth Prediction, Dead Stock flag, Risk Detection signal —
  Architecture Section 10.1) uses the AI Insight badge treatment defined
  in [Notifications](#notifications) and never the plain `.type-number`
  treatment reserved for real, recorded figures. This is a product-trust
  rule (Architecture Principle 2.4), not a styling preference — get it
  wrong here and the UI itself becomes the thing that violates 2.4, not
  just the underlying data model.

---

## Color system

One job per color. If you're reaching for a color, know which job you're
hiring it for before you pick it. This applies identically whether you're
styling a button or picking a chart's second data series — a chart is not
an exception to "one job per color" just because it has more surface area
to fill.

| Token | Value | Job |
|---|---|---|
| `--navy` / `--title` | `#0B1F3A` | Structure: headings, nav, dark surfaces, primary text emphasis, primary chart series |
| `--navy-soft` | `#14294A` | Navy hover/pressed state |
| `--gold` | `#D4AF37` | The accent for money and primary actions — CTAs, key numbers, focus states, the *one* thing on a screen that should draw the eye first |
| `--gold-hover` | `#B8952F` | Gold pressed/darker state |
| `--gold-bright` | `#E8C65C` | Gold hover state (brightens, doesn't darken) |
| `--gold-soft` | `#F6EFD9` | Gold background tint (badges, subtle highlight fills, AI Insight badge background) |
| `--orange` | `#FF8C42` | Secondary accent: alerts, attention, warnings only |
| `--background` | `#FFFFFF` | Base surface — the dominant color of every screen |
| `--foreground` | `#111827` | Body text |
| `--muted` | `#F5F7FA` | Muted backgrounds (disabled states, subtle panels) |
| `--muted-foreground` | `#6B7280` | Secondary/label text, neutral icon color |
| `--border` | `#E5E7EB` | The only border color — used sparingly |
| `--success` | `#059669` | Success states only |
| `--warning` | `#D97706` | Warning states only |
| `--error` | `#DC2626` | Error/destructive states only |

Rose (`rose-500`/`rose-600`) is used for destructive actions and danger
banners — it's a fourth semantic color reserved strictly for "this
deletes/removes something," never decorative.

**Contrast rule:** gold (`#D4AF37`) on white fails text-contrast at normal
weight/size — it's a *fill* color (buttons, badges, borders, icons), never
a body-text color. Where gold-family text is needed against white (links,
active nav labels, accent numbers), use a darkened gold
(`#B8952F`/`#8A6D1F` range), not the raw token. Gold-filled buttons use
navy text (`#0B1F3A`), never white — white-on-gold also fails contrast.

**Chart-specific extension of this rule** (new in v2.0, see
[Charts](#charts) for the full spec): a multi-series chart never reaches
for an arbitrary rainbow palette to distinguish series. This is the same
discipline the codebase's own recent brand-color-audit work already
enforced for UI screens (eliminating off-brand colors and multi-color
gradients project-wide) — it applies to data visualization with equal
force, not as a separate, looser standard.

---

## Spacing scale

8px system. Every gap, padding, and margin is one of these — no arbitrary
`13px` or `22px` picked by eye.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 16px |
| `--space-4` | 24px |
| `--space-5` | 32px |
| `--space-6` | 48px |
| `--space-7` | 64px |

---

## Border radius scale

**New in v2.0 — formalized from what `src/` already does, inconsistently,
as literal Tailwind classes rather than named tokens.** A radius value has
never been an explicit token in this system before; it's been "whatever
Tailwind class looked right," which is exactly the drift this document
exists to prevent everywhere else. Five tiers, matched to what's already
in use, with one clarifying rule added where the codebase currently has
two different values doing the same job:

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | Small controls: option chips, compact icon buttons |
| `--radius-md` | 10px | The default control radius — inputs, buttons, small dialog form fields (already `.input-base`/`.btn-*`'s value) |
| `--radius-lg` | 16px | Cards (`.card-premium`'s existing 16px), standard single-purpose dialogs |
| `--radius-xl` | 24px | Large, multi-section dialogs (tabs, multiple stacked panels — e.g. Settings) |
| `--radius-full` | 9999px | Pills, badges, avatar circles, scrollbar thumb |

**The dialog-radius rule this resolves:** `src/` currently mixes
`rounded-2xl` (16px) and `rounded-3xl` (24px) across different modals with
no stated reason. Going forward this is not "pick either" — it's tiered by
complexity: a single-purpose dialog (one form, one action —
`EditProductModal`, `ProductDetailModal`) uses `--radius-lg` (16px); a
multi-section dialog with its own internal tabs or several stacked panels
(`SettingsModal`) uses `--radius-xl` (24px). Existing modals already sort
cleanly into this rule without needing to change which radius they use —
what changes is that the choice is now a stated rule, not an unstated
habit, so the next dialog built doesn't have to guess.

---

## Shadow / elevation levels

Three tiers, used everywhere instead of hand-written box-shadow values.

| Token | Use |
|---|---|
| `--shadow-1` | Resting/light cards (KPI cards, list rows) |
| `--shadow-2` | Hover/raised state, dropdowns |
| `--shadow-3` | Action cards, highlight cards, modals/popovers above the page |

---

## Typography hierarchy

Inter everywhere (`--font-sans`). Fraunces (`--font-display`,
`.font-display`) is reserved for exactly two places: the business name and
hero KPI figures — the one deliberate flourish, not a general-purpose
heading font.

| Class | Use | Weight / size |
|---|---|---|
| `.type-title-lg` | Screen-level headings | 800 / 22px |
| `.type-title` | Section/card/modal headings | 700 / 17px |
| `.type-number` | Any *recorded* data figure — KPIs, table cells, totals | 800, tabular figures |
| `.type-label` | Captions/field labels | 600 / 10px, uppercase, tracked |

Three tiers, used consistently, instead of hand-rolled `text-lg font-bold`
combinations repeated per file. If a fourth tier feels needed, that's a
sign the layout needs simplifying, not a new class.

**`.type-number` is reserved for facts, never predictions.** A Capital
Forecasting range or a Business Worth Prediction (Architecture Section
10.1) is never rendered in `.type-number` styled identically to a real
Closing figure — see [Notifications](#notifications) for the distinct AI
Insight treatment this requires. This is the typography-level enforcement
of the same rule stated under Non-negotiable Rules above.

---

## Iconography

**New in v2.0 — formalized from consistent, if previously unwritten,
existing practice.** `lucide-react` is the only icon library used or
permitted in this product. Do not introduce a second icon set, an inline
SVG one-off, or an emoji standing in for an icon — consistency here is
what makes every screen feel like the same product.

| Context | Size | `strokeWidth` |
|---|---|---|
| Default (buttons, nav, inline with text, table rows) | `w-4 h-4` (16px) | `2.25` |
| Section headers, slightly emphasized inline icons | `w-5 h-5` (20px) | `2.25` or `2` |
| Empty-state / large decorative icon | `w-8 h-8` to `w-10 h-10` | `1.75` (deliberately lighter — a large icon at full stroke weight reads as heavy/aggressive, not calm) |
| Avatar-scale / onboarding illustration icon | `w-12 h-12` and above | `1.5`–`1.75` |

**Color:** an icon inherits `currentColor` or uses `--muted-foreground`
when it's neutral/decorative (the default case — a nav icon, a table-row
icon). An icon only takes `--gold` when the icon itself *is* the call to
action (a primary button's leading icon) — the same "gold has one job"
discipline from the Color System applies here, not a looser standard for
icons specifically.

---

## Interaction system

What makes it feel expensive instead of static — every clickable surface
lifts slightly on hover and presses down instantly on click.

- Hover: `translateY(-2px)`, `0.2s ease`
- Press: `translateY(0) scale(0.97)`, `80ms` — deliberately faster than
  the hover transition so a click never feels like it's catching up
- `.btn-primary` / `.btn-dark` / `.btn-secondary` / `.btn-ghost` all get
  this automatically
- `.lift` — drop this on anything else (icon buttons, nav pills, list
  rows) that needs the same language without adopting a full button/card
  variant
- Dense controls (PIN keypads, etc.) get a press-only scale-down, no
  hover-lift — a numpad shouldn't float

---

## Buttons

| Class | Use |
|---|---|
| `.btn-primary` | Most important action on screen: gold bg, navy text |
| `.btn-dark` | Navy alternative — rare, used only where gold would compete with an adjacent primary |
| `.btn-secondary` | Outline: gray border, fills light on hover |
| `.btn-ghost` | No border, minimal — top nav / low-emphasis actions |

Small tertiary actions (a row-level "delete" text link, a subtle icon
button) don't need any of these — a plain color-change hover is correct
for anything that isn't a primary or secondary action. Not every clickable
thing needs to compete for attention.

**Minimum touch target:** every button and icon-button, regardless of
visual size, has a minimum **44×44px** hit area (padding, not necessarily
visible size) — see [Mobile Rules](#mobile-rules) for why this is
non-negotiable rather than a nice-to-have on this product specifically.

---

## Cards

| Class | Use |
|---|---|
| `.card-premium` | Default: white bg, `--shadow-1`, light border, 16px radius (`--radius-lg`) |
| `.card-premium.is-interactive` | Adds hover lift + gold border tint (see Interaction System) |
| `.card-premium.is-action` | Light gold-tint background — an action the user needs to notice |
| `.card-dark-gradient` | Navy gradient, white text, gold value — reserved for **the single flagship metric** on a screen (Business Worth, Embedded Profit). Never more than one per screen. |

---

## Forms & inputs

**Base treatment** (`.input-base`, applied to every text/number/date input
and select): `1px solid #E5E7EB` border, `--radius-md` (10px), white
background. Focus: `border-color: #D4AF37` + `box-shadow: 0 0 0 2px
rgba(212,175,55,0.2)`.

Exception: fields inside a danger/warning context (e.g. a delete-reason
field under a rose banner) use that context's color for focus instead of
gold — semantic state beats default styling.

**New in v2.0 — the rules around the base input that were previously
undocumented:**

- **Labels:** `.type-label` above the field, always — never a placeholder
  standing in for a label. Placeholder text is for an example value, not
  the field's identity.
- **Required fields:** a single `*` immediately after the label text in
  `--error` color — no separate "required" badge, no asterisk-plus-legend
  pattern.
- **Help text:** small, `--muted-foreground`, directly below the field,
  never a tooltip-only explanation for anything financially meaningful (a
  cost-price field's rule about being frozen at time of purchase,
  Architecture Section 8.5, is exactly the kind of thing that must be
  visible text, not something the admin has to discover by hovering).
- **Error state:** border and focus ring switch to `--error`; the message
  appears directly below the field in `--error` text, same position help
  text would occupy (never both at once — an error replaces help text, it
  doesn't stack above it).
- **Checkboxes / radios / toggles:** use `--gold` for the checked/active
  fill state (money-adjacent product, so the "on" state gets the accent
  color, consistent with gold's job across the rest of the system),
  `--border` for the unchecked outline.
- **Select fields:** same `.input-base` treatment as text inputs — no
  separate visual language for a dropdown versus a text field; the
  dropdown chevron is the only differentiator, styled as a neutral,
  `--muted-foreground` icon per [Iconography](#iconography).

---

## Tables

`.table-clean`: no heavy borders. Only a hairline under the header row.
Row separation comes from padding, not per-row borders. Rows get a light
background tint on hover.

**New in v2.0:**
- **Numeric columns** are right-aligned and use `.type-number` (tabular
  figures — digits never jitter column width as values change).
- **Row-level actions** (edit/delete icons) are `--muted-foreground` by
  default, only taking on their semantic color (`--error` for delete) on
  hover — an idle row shouldn't visually shout "delete me" at rest.
- **Sortable column headers** use `.type-label` styling with a small
  neutral sort-direction icon (`w-3 h-3`, per Iconography's smallest
  documented tier) — never a colored indicator for "currently sorted,"
  weight/position is enough.

---

## Dialogs & modals

**New in v2.0 — formalized from real, consistent structural practice
already in `src/` (`EditProductModal`, `SettingsModal`,
`BusinessProfileSetupModal`), with the one real inconsistency (radius)
resolved by the tiered rule in [Border Radius](#border-radius-scale).**

**Structure, every dialog:**
- Backdrop: `fixed inset-0`, `bg-black/80`, `backdrop-blur-sm` — one
  blur value, not the `blur-sm`/`blur-xs` mix currently scattered across
  `src/`; `backdrop-blur-sm` is the value to standardize on going forward,
  since it's already the more common of the two.
- Container: white background, `--shadow-3` (the elevation tier already
  reserved for exactly this — modals/popovers above the page), radius per
  the tiered rule above, `max-h-[90vh]` with internal scroll — a dialog
  never grows taller than the viewport and pushes its own close button
  off-screen.
- Header: `.type-title`, with a close (`X`) icon-button top-right, always
  present — a dialog is never dismissible only by clicking the backdrop
  with no visible close affordance, since a small-screen, shared-device
  user (Architecture Section 1.4) shouldn't have to know an unwritten
  gesture.
- Footer actions: primary action right-aligned using `.btn-primary` (or
  `.btn-dark` if the action is destructive-adjacent but not itself a
  delete — see rose-banner pattern below), secondary/cancel to its left
  using `.btn-secondary` or `.btn-ghost`.
- Destructive confirmation (delete actions): a rose-tinted banner
  (`bg-rose-500/10`, `border-rose-500/30`, `text-rose-700`) inside the
  dialog body stating what will be permanently affected — never a
  same-styled primary button as a non-destructive confirm; a destructive
  confirm button uses rose, not gold or navy.

**Mobile sizing:** `p-3 sm:p-4` outer padding (already consistent
practice) so the dialog never touches the viewport edge even on the
smallest supported screen.

---

## Empty & loading states

**New in v2.0 — formalized from real, consistent practice already in
`src/` (`StocksView`'s empty batch list is the reference implementation).**

**Empty state, standard pattern:**
```
White card, --radius-lg, generous padding (--space-6, ~48px)
  → centered muted icon, w-8 h-8 to w-10 h-10, strokeWidth 1.75,
    text-gray-300 (a step lighter than --muted-foreground, since this
    icon is decorative, not informational)
  → below it, one line of --muted-foreground body text explaining
    what's missing and, where relevant, what action would fill it
```
An empty state is never just a blank area with no explanation — every
screen that can legitimately have zero items (no Stock Batches yet, no
Notifications yet, no Reports for this period) uses this exact structure,
not a bespoke one-off per screen.

**Loading state, standard pattern:** a skeleton silhouette of the content
about to appear (card outlines, table-row bars) in `--muted` background
with a subtle shimmer, matching the shape of the real content — never a
centered spinner replacing the whole screen for anything that has a known
shape in advance (a Dashboard's KPI cards, a Report's table). A full-screen
spinner is reserved for the initial app boot only (already the product's
existing boot-splash → app-load handoff), not for in-app data fetches.

---

## Notifications

**New in v2.0 — this domain does not exist in `src/` yet** (Architecture
Section 3.12 scopes it as "New — proposed," scheduled for Phase 1 of the
[Development Strategy](./docs/architecture/13-development-strategy.md)).
This section exists specifically so Phase 1 is built against a governed
pattern from day one, rather than someone reaching for the nearest toast
library and inventing a visual language that doesn't match anything else
in the product — exactly the failure mode this whole document exists to
prevent, applied pre-emptively to a domain that hasn't shipped yet.

**Two distinct surfaces, not one:**

1. **In-app banner/toast** — transient, appears for an operational event
   (overdue Closing reminder, low-stock alert). White card, `--radius-md`,
   `--shadow-2`, a colored left border (4px) indicating type:
   `--navy` for informational, `--warning` for something needing
   attention soon, `--error` for something needing attention now. Icon
   (per [Iconography](#iconography)) matches the same semantic color.
   Dismissible, auto-dismisses after a reasonable delay for informational
   type only — a warning or error type stays until dismissed by the user.
2. **Notification feed / inbox** — a persistent list (the bell-icon
   destination), each entry using the same left-border-color convention
   as the toast, `.type-label` for the timestamp, plain body text for the
   message, read/unread indicated by a filled vs. hollow `--gold` dot
   (small, `w-2 h-2`) — never by a background-color change on the whole
   row, which would compete with the type-color left border for
   attention.

**AI Insight badge — the mandatory distinct treatment (Architecture
Section 10.1):** any AI-derived output (a prediction, a Dead Stock flag,
a Risk Detection signal) that surfaces as a notification or inline badge
uses `--gold-soft` background with darkened-gold text (`#8A6D1F` range,
per the Color System's contrast rule) and a small "AI Insight" or
"Prediction" label — visually and unambiguously distinct from every
operational notification type above. This is not a style choice; it's
the concrete UI implementation of the rule that an AI output must never
be presented in a way indistinguishable from a real, recorded fact.

---

## Charts

**New in v2.0 — no chart library is currently a dependency of this
project** (`package.json` has none). This section is deliberately written
as a *visual specification independent of implementation library* so
whichever charting approach Reports or AI Insights eventually adopts
(Architecture Sections 8.9, 10.8) is built against these rules from its
first commit, rather than the library's own default theme.

**Rules, regardless of chart type (line, bar, area):**
- **One primary series gets `--navy`.** If there's a second series
  worth comparing against (e.g., this period vs. last period), it gets a
  muted, desaturated variant — never a second fully-saturated brand color
  competing with the first.
- **`--gold` is reserved for the one thing on the chart that should draw
  the eye first** — a highlighted data point, the current period's bar
  in a historical comparison, a threshold line. Not a decorative palette
  choice for "series #2."
- **Never a rainbow / arbitrary-hue palette for multi-series data.** If a
  chart genuinely needs more than two or three distinguishable series
  (e.g., inventory value broken out by many product categories), use
  varying *lightness* of navy rather than varying *hue* — this keeps the
  chart legible without importing colors that have no job in the rest of
  the system. This is the direct data-visualization extension of the
  brand-color-elimination work already done project-wide for UI screens —
  the same discipline, applied to the one surface area (charts) that
  hasn't been built yet to test it against.
- **Semantic colors (`--success`/`--warning`/`--error`) are reserved for
  exactly what they mean** — a chart showing loss/breakage trend can use
  `--error` for the loss line specifically, but never as a generic
  "third series" color when nothing about that series is actually bad.
- **Gridlines and axes:** hairline `--border` color, `.type-label` styling
  for axis labels, `.type-number` (tabular figures) for any numeric axis
  or data-point label — a chart's numbers must look like every other
  number in the product, not like a separate visualization tool's export.
- **AI-generated chart content** (a Capital Forecasting range, Section
  10.2) follows the [Notifications](#notifications) AI Insight treatment
  for its labeling, and additionally renders its uncertainty visually —
  a shaded confidence band in `--gold-soft` at low opacity around the
  projected line, never a single solid line indistinguishable from a
  chart of real historical data.

---

## Mobile rules

**New in v2.0 — formalized from real, consistent existing practice**
(`NavigationTabs`'s `md:hidden fixed bottom-0` pattern), stated explicitly
because this product's primary usage context is a shared retail-counter
phone or tablet (Architecture Section 1.4), not a desktop admin panel that
happens to also work on mobile.

- **Bottom tab navigation** below the `md` breakpoint, replacing whatever
  top/side navigation desktop uses — `fixed bottom-0`, `--navy`
  background, and `padding-bottom: max(0.375rem, env(safe-area-inset-bottom))`
  on every fixed-bottom element, without exception, so content is never
  obscured behind a phone's home-indicator area.
- **Minimum touch target: 44×44px** on every interactive element, not
  just buttons — a table row's edit icon, a checkbox, a nav tab. This
  product is used on a shared device, often quickly, often by a staff
  member who isn't formally trained on it (Architecture Section 1.4) —
  a missed tap has a real cost here that it wouldn't on a mouse-driven
  desktop admin tool.
- **Financial figures never shrink below 13px** on any breakpoint,
  including inside a dense table on a small screen — the one place this
  product cannot trade legibility for density, since the entire product
  exists to make a number trustworthy and readable at a glance (Section
  1.7's own "in the time it takes to check WhatsApp" promise).
- **Dialogs on mobile** use the full sizing rules from
  [Dialogs & modals](#dialogs--modals) as-is — `p-3` outer padding,
  `max-h-[90vh]` internal scroll — never a different, mobile-specific
  dialog pattern (e.g., a full-screen takeover) unless a specific screen's
  content genuinely requires it and that exception is documented here
  first, not invented in the component.
- **PIN keypad and other dense, repeated-tap controls** (Architecture
  Section 8.11's quick-login flow) use the press-only feedback already
  defined in [Interaction System](#interaction-system) — no hover-lift,
  since there is no hover on a touch device and a numpad shouldn't float.

---

## How to invoke this

When asking Claude (or any future session) to build or update a screen,
say:

```
Apply the Sabush Design System (v2.0) to this screen.

Follow strictly:
- color system
- spacing scale
- border radius scale
- typography hierarchy
- card / dialog / form / table / notification / chart structure
  (whichever apply)
- iconography rules
- mobile rules

Do not invent styles, icons, or chart colors outside the system.

Ensure the UI feels premium, minimal, and consistent.
```

That's a request to reconcile the screen against this document — not to
restyle it from scratch. Preserve every existing feature, action, and
menu; only bring the visual treatment in line with what's above.

**What "applying the system" means in practice:** before, design
screen-by-screen, re-deciding spacing/color/weight/radius/icon-size each
time. Now, reconcile against this document — a new screen, dialog,
notification, or chart should require zero new visual decisions, because
every value and pattern it needs already exists above.

When reviewing a screen against the rules at the top of this doc, look
for:
- Padding/gap values that aren't on the 8px scale
- Radius values that aren't one of the five documented tiers
- More than 2-3 distinct colors doing decorative (non-semantic) work,
  including in a chart's data series
- Multiple `font-bold` elements competing for attention in the same view
- Borders on elements that would read as separate with shadow/spacing
  alone
- An icon that isn't from `lucide-react`, or sized/stroked outside the
  documented tiers
- An AI-derived figure rendered without the AI Insight badge treatment
- A touch target smaller than 44×44px on any mobile-visible control
