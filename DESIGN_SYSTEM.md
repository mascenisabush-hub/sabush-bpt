# Sabush Design System v1.0

This is the single source of truth for how every screen in this app looks
and behaves. It exists so design decisions get made **once** — in
`src/index.css` — instead of re-invented per screen. If a value isn't
defined here, don't invent one; add it here first, then use it everywhere.

## Non-negotiable rules

**Never:**
- Mix random spacing — every gap/padding/margin comes from the spacing
  scale below, not a one-off `px` value picked to make something look right.
- Overuse colors — navy, gold, and orange each have exactly one job (see
  Color System). Don't reach for a color because it's available; reach for
  it because its job is what's needed here.
- Make everything bold — bold is for the thing that matters most on the
  screen. If every label and value is bold, nothing is.
- Add unnecessary borders — a card doesn't need a border *and* a shadow
  *and* a background tint to read as separate from the page. Pick the
  minimum that creates the separation.

**Always:**
- Create hierarchy — one dominant element per screen (usually a KPI or a
  primary action), everything else recedes.
- Use whitespace — spacing does the separating; borders are the exception,
  not the default.
- Highlight only important things — gold and orange are for what the user
  should notice first, not decoration.
- Keep it clean — white is ~60-70% of any surface. Structure and accent
  colors are the minority.

## How to invoke this

When asking Claude (or any future session) to update a screen, say:

```
Apply the Sabush Design System to this screen.

Follow strictly:
- color system
- spacing scale
- typography hierarchy
- card structure
- shadow levels

Do not invent styles outside the system.

Ensure the UI feels premium, minimal, and consistent.
```

That's a request to reconcile the screen against this document — not to
restyle it from scratch. Preserve every existing feature, action, and menu;
only bring the visual treatment in line with what's below.

---

## Color system

One job per color. If you're reaching for a color, know which job you're
hiring it for before you pick it.

| Token | Value | Job |
|---|---|---|
| `--navy` / `--title` | `#0B1F3A` | Structure: headings, nav, dark surfaces, primary text emphasis |
| `--navy-soft` | `#14294A` | Navy hover/pressed state |
| `--gold` | `#D4AF37` | The accent for money and primary actions — CTAs, key numbers, focus states |
| `--gold-hover` | `#B8952F` | Gold pressed/darker state |
| `--gold-bright` | `#E8C65C` | Gold hover state (brightens, doesn't darken) |
| `--gold-soft` | `#F6EFD9` | Gold background tint (badges, subtle highlight fills) |
| `--orange` | `#FF8C42` | Secondary accent: alerts, attention, warnings only |
| `--background` | `#FFFFFF` | Base surface — the dominant color of every screen |
| `--foreground` | `#111827` | Body text |
| `--muted` | `#F5F7FA` | Muted backgrounds (disabled states, subtle panels) |
| `--muted-foreground` | `#6B7280` | Secondary/label text |
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

## Typography hierarchy

Inter everywhere (`--font-sans`). Fraunces (`--font-display`,
`.font-display`) is reserved for exactly two places: the business name and
hero KPI figures — the one deliberate flourish, not a general-purpose
heading font.

| Class | Use | Weight / size |
|---|---|---|
| `.type-title-lg` | Screen-level headings | 800 / 22px |
| `.type-title` | Section/card/modal headings | 700 / 17px |
| `.type-number` | Any data figure — KPIs, table cells, totals | 800, tabular figures |
| `.type-label` | Captions/field labels | 600 / 10px, uppercase, tracked |

Three tiers, used consistently, instead of hand-rolled `text-lg font-bold`
combinations repeated per file. If a fourth tier feels needed, that's a
sign the layout needs simplifying, not a new class.

## Card structure

| Class | Use |
|---|---|
| `.card-premium` | Default: white bg, `--shadow-1`, light border, 16px radius |
| `.card-premium.is-interactive` | Adds hover lift + gold border tint (see Interaction System) |
| `.card-premium.is-action` | Light gold-tint background — an action the user needs to notice |
| `.card-dark-gradient` | Navy gradient, white text, gold value — reserved for **the single flagship metric** on a screen (Business Worth, Embedded Profit). Never more than one per screen. |

## Shadow levels

Three tiers, used everywhere instead of hand-written box-shadow values.

| Token | Use |
|---|---|
| `--shadow-1` | Resting/light cards (KPI cards, list rows) |
| `--shadow-2` | Hover/raised state, dropdowns |
| `--shadow-3` | Action cards, highlight cards, modals/popovers above the page |

## Interaction system

What makes it feel expensive instead of static — every clickable surface
lifts slightly on hover and presses down instantly on click.

- Hover: `translateY(-2px)`, `0.2s ease`
- Press: `translateY(0) scale(0.97)`, `80ms` — deliberately faster than the
  hover transition so a click never feels like it's catching up
- `.btn-primary` / `.btn-dark` / `.btn-secondary` / `.btn-ghost` all get
  this automatically
- `.lift` — drop this on anything else (icon buttons, nav pills, list
  rows) that needs the same language without adopting a full button/card
  variant
- Dense controls (PIN keypads, etc.) get a press-only scale-down, no
  hover-lift — a numpad shouldn't float

## Button system

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

## Input & table system

**Inputs** (`.input-base`, or the equivalent inline treatment used
throughout): `1px solid #E5E7EB` border, `10px` radius, white background.
Focus: `border-color: #D4AF37` + `box-shadow: 0 0 0 2px rgba(212,175,55,0.2)`.

Exception: fields inside a danger/warning context (e.g. a delete-reason
field under a rose banner) use that context's color for focus instead of
gold — semantic state beats default styling.

**Tables** (`.table-clean`): no heavy borders. Only a hairline under the
header row. Row separation comes from padding, not per-row borders. Rows
get a light background tint on hover.

---

## What "applying the system" means in practice

Before → design screen by screen, re-deciding spacing/color/weight each
time.
Now → reconcile against this document. A new screen should require zero
new decisions — every spacing value, color, shadow, and type tier already
exists above.

When reviewing a screen against the rules at the top of this doc, look
for:
- Padding/gap values that aren't on the 8px scale
- More than 2-3 distinct colors doing decorative (non-semantic) work
- Multiple `font-bold` elements competing for attention in the same view
- Borders on elements that would read as separate with shadow/spacing alone
