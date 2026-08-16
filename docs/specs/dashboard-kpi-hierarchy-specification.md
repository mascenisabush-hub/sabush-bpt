Specification — Design System / Dashboard Amendment

# Dashboard KPI Hierarchy Specification

**Status:** Frozen — Specification → Implementation authorized. Product
Architect decision recorded below (Section 3), made directly following
the Dashboard KPI Hierarchy Audit (this session, conversational — not
filed as a standalone document; its findings are incorporated directly
below since they are load-bearing, matching the precedent set by the
Typography Hierarchy Specification, `93da326`). This document itself
does not constitute the implementation task — per this project's
established discipline, a separate, formally-scoped implementation task
(with its own stop conditions and required report format) is the next
artifact, not code changes issued directly from this approval.
**Depends on:** [`01-dashboard.md`](./01-dashboard.md) (Functional
Requirement #1, which this specification amends — see Section 6);
[`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) (Cards section, which this
specification amends — Section 5; Typography hierarchy section, already
amended by the Typography Hierarchy Specification `93da326` — reused
here, not re-amended); [`COMPONENT_LIBRARY.md`](../../COMPONENT_LIBRARY.md)
(KPI Card section, which this specification amends — Section 7); the
Typography Hierarchy Specification (`93da326`) and its implementation
(`d163d15`), which this specification extends rather than duplicates —
the KPI-grid size context (24px desktop / 20px mobile) it locked for
financial reports is reused here unchanged, not redefined.
**Governing product decision (Product Architect, this session, restated
not re-litigated):** Business Worth is the Dashboard's single flagship
metric. Embedded Profit and all other Dashboard KPIs are supporting
metrics. No Dashboard layout/structural change is authorized by this
specification — see Section 8.

---

## 1. Purpose

Resolve a three-document contradiction the Typography Hierarchy
Specification's implementation surfaced but correctly did not attempt to
resolve itself (Phase 1's declared stop condition), and lock a single,
unambiguous Dashboard KPI hierarchy: one flagship metric, everything
else supporting — consistent with `DESIGN_SYSTEM.md`'s own non-negotiable
rule ("one dominant element per screen") and with the hero/KPI-grid
distinction Phase 1 already established for the financial-report family.

## 2. The Contradiction Found — Investigated, Not Assumed

**Confirmed by direct inspection of the actual committed repository, not
recalled from memory.** Three separate documents disagree with each
other, and the actual implementation matches the two documents that are
themselves in conflict:

1. **`DESIGN_SYSTEM.md` → Cards:** *"`.card-dark-gradient` — Navy
   gradient, white text, gold value — reserved for **the single
   flagship metric** on a screen (Business Worth, Embedded Profit).
   **Never more than one per screen.**"* The parenthetical names two
   metrics as examples while the rule beside it says "never more than
   one" — genuinely ambiguous as written, not merely misread.
2. **`COMPONENT_LIBRARY.md` → KPI Card → Variants:** *"`dark` —
   Reserved for the platform's flagship figures only — Business Worth,
   Embedded Profit. **Never more than 1–2 dark cards** on a single
   screen, per Cards's 'never more than one `.card-dark-gradient` per
   screen' rule..."* This is a direct internal contradiction within a
   single sentence — it states a "1–2" ceiling while citing a "never
   more than one" rule as its own justification.
3. **`01-dashboard.md` → Functional Requirements, item 1:** explicitly
   specifies **both** Embedded Profit (`variant="dark"`) **and**
   Business Worth (`variant="dark"`) in the same primary grid, on the
   same screen — confirmed by direct inspection of
   `apps/tenant/src/components/DashboardView.tsx`, which implements
   exactly this. **The two-dark-card Dashboard is not an implementation
   slip. It is what the current, frozen Dashboard specification itself
   calls for** — the ambiguity in documents 1–2 was carried directly
   into a concrete spec that resolved it the wrong way (both, not one).

**Consequence:** this is not a typography question the Typography
Hierarchy Specification's Phase 1 could have resolved in passing, and
not a new design decision invented by this specification either — it is
correcting three already-written, mutually-contradicting documents (one
of them a frozen module specification) back into agreement with the
non-negotiable rule (`DESIGN_SYSTEM.md`, Non-negotiable rules: *"one
dominant element per screen"*) all three were supposed to already be
following.

## 3. Decision — Product Architect, This Session

| Question | Decision |
|---|---|
| Dashboard flagship | **Business Worth** |
| `.card-dark-gradient` | **Business Worth only** |
| Embedded Profit | Supporting KPI (light card) |
| Supporting KPI size | **24px desktop / 20px mobile** (reuses the Typography Hierarchy Specification's existing KPI-grid context, `93da326`/`d163d15` — no new size defined) |
| Other four primary-grid KPIs (Initial Capital, Stock Cost, Market Value, Expenses) | Supporting KPI treatment — same 24/20px |
| "Other Indicators" secondary group (Withdrawals, Quebra Loss, Active Batches) | Supporting KPI treatment — same 24/20px, initially; not re-litigated separately from the primary-grid supporting KPIs |
| Dashboard layout/structure | **No change authorized** — see Section 8 |
| Mobile layout | Visual verification is a required post-implementation step, not an implementation assumption — see Section 9 |
| New typography classes | **None** — reuses `.type-number`'s existing KPI-grid context |

**Reasoning, restated from the Product Architect's own framing, not
re-derived:** Business Worth answers the Dashboard's highest-level
owner question ("what is my business worth right now") and already
carries the only growth-delta badge on the screen, the same hero role
it plays on the Business Worth Report. Embedded Profit answers a
narrower, component question ("how much profit is currently embedded")
and remains an important supporting figure — but visually competing
with Business Worth for flagship status inverts the hierarchy the
Business Worth Report family already establishes.

**Explicitly avoided:** giving the four other primary-grid KPIs (28/32px
today) a size larger than Embedded Profit's new 24/20px would itself
create a new, backwards hierarchy — the Product Architect's decision
resolves this by moving all supporting KPIs, primary-grid and secondary
group alike, to the same 24/20px context together, not by leaving some
at their old size.

## 4. The Governing Architectural Principle (Restated, Not Reinvented)

Same principle the Typography Hierarchy Specification established, now
extended across screens rather than only within the financial-report
family: **a semantic typography class communicates *what* the content
is; presentation context determines *how prominently* it's shown.**
Business Worth is `.type-number` in hero context on both the Business
Worth Report and the Dashboard. Every other recorded figure — on either
screen — is `.type-number` in KPI-grid context. The two surfaces now
communicate the same hierarchy through the same mechanism, not through
two independently-invented conventions.

## 5. `DESIGN_SYSTEM.md` Amendment — Cards Section

Replace the ambiguous `.card-dark-gradient` row with unambiguous
wording that resolves Section 2's contradiction without inventing a new
principle:

> `.card-dark-gradient` — Navy gradient, white text, gold value —
> reserved for the single flagship metric on a screen. **Business Worth
> is the Dashboard's flagship metric.** Embedded Profit may use this
> treatment only in a context where Business Worth is not present on
> the same screen. **Never more than one `.card-dark-gradient` card per
> screen.**

## 6. `01-dashboard.md` Amendment — Functional Requirement #1

Update the primary-grid card list so Embedded Profit no longer specifies
`variant="dark"` alongside Business Worth:

> **Primary grid (6 cards, always visible, top of screen):** Initial
> Capital, Stock Cost (total Investment Value), Market Value, Embedded
> Profit, Business Worth (`variant="dark"`, the Dashboard's sole
> flagship metric), Expenses.

The Mobile section's existing constraint — *"never a single-column
stack, which would push the Business Worth card below the fold"* — is
**unchanged and remains governing**; it already independently confirms
Business Worth's flagship status and already prohibits exactly the kind
of layout restructuring this specification also declines to authorize
(Section 8).

## 7. `COMPONENT_LIBRARY.md` Amendment — KPI Card

Replace the self-contradicting "1–2 dark cards" wording:

> `dark` | Reserved for the Dashboard's single flagship metric —
> Business Worth. Never more than one dark card per screen, per
> [Cards](./DESIGN_SYSTEM.md#cards). If a screen has no Business Worth
> figure present, a different single figure may take the dark
> treatment in that context — never two dark cards together.

And update the Examples list (currently *"Real figure, dark, flagship:
Business Worth, Embedded Profit"*) to name Business Worth only, with
Embedded Profit moved to the light-variant KPI-grid example alongside
the other supporting figures.

## 8. Scope — Phase 2, Narrow

**In scope:**
- `apps/tenant/src/components/DashboardView.tsx` — `Embedded Profit`'s
  `KpiCard` invocation: `variant="dark"` → default light variant.
  Supporting-KPI value sizing (all nine cards except Business Worth):
  `text-[28px] sm:text-[32px]` → the documented KPI-grid context,
  `text-[20px] sm:text-[24px]` (mobile-first, matching the Typography
  Hierarchy Specification's Tailwind convention — `93da326`/`d163d15`).
- `DESIGN_SYSTEM.md` — Cards section amendment (Section 5).
- `01-dashboard.md` — Functional Requirement #1 amendment (Section 6).
- `COMPONENT_LIBRARY.md` — KPI Card Variants/Examples amendment
  (Section 7).

**Explicitly out of scope:**
- Any layout/structural change — no full-width Business Worth card, no
  separating the flagship from the grid, no change to the 2/3/4/6-column
  responsive grid `01-dashboard.md`'s Mobile section already locks. If
  visual verification (Section 9) finds the font-size-only change
  insufficient for Business Worth to read as dominant, that becomes a
  **separate, later, explicitly-authorized layout decision** — not
  folded into this specification retroactively.
- Business Worth's own hero size (32–36px) — unchanged, already
  compliant with the Typography Hierarchy Specification's hero context.
- Any other screen, module, or SuperAdmin's visual system.
- Any change to which metrics exist, how they're calculated, or what
  they mean — this specification is presentation-only, per
  `01-dashboard.md`'s own existing non-functional requirement that
  Dashboard performs no calculation of its own.
- The `.card-premium.is-action` (Initial Capital, unset state) and
  `badge` (Business Worth growth indicator) treatments — unchanged,
  neither is a hierarchy question this specification addresses.

## 9. Acceptance Criteria

- [ ] `DashboardView.tsx`'s Embedded Profit card renders as a light
      card, no longer `.card-dark-gradient`.
- [ ] Exactly one `.card-dark-gradient` card renders on the Dashboard
      (Business Worth) — confirmed by inspection, not assumption.
- [ ] All eight supporting KPI cards (five other primary-grid cards plus
      the three "Other Indicators" cards) render their value at the
      documented KPI-grid size context: 24px desktop / 20px mobile.
- [ ] Business Worth's value size is unchanged (32–36px responsive).
- [ ] `DESIGN_SYSTEM.md`, `01-dashboard.md`, and `COMPONENT_LIBRARY.md`
      no longer contradict each other or themselves on the
      single-flagship-card rule — confirmed by direct re-reading of all
      three after the amendment, not assumed resolved by editing one.
- [ ] No Dashboard layout/grid/column structure is touched.
- [ ] **Mobile visual verification, explicit and required, not
      inferred from the desktop change:** on an actual narrow viewport,
      confirm Business Worth still reads as the dominant figure among
      nine cards in a 2-column grid. This is the specific open question
      Section 8 declines to pre-resolve — the acceptance criterion is
      that this gets *checked*, not that a particular outcome is
      assumed.
- [ ] Full existing test suite (580 tests, current baseline per
      `93da326`'s implementation) still passes — regression signal, not
      a substitute for the visual check above.
- [ ] TypeScript clean across Tenant, SuperAdmin, Server — SuperAdmin
      bundle isolation confirmed unaffected, matching every prior UI
      change's discipline in this project.

## 10. What This Specification Does Not Do

- Does not authorize any layout or grid-structure change to the
  Dashboard — see Section 8. If mobile verification (Section 9) finds
  the result insufficient, that is a new, separate decision.
- Does not introduce a new typography class or size context — reuses
  the Typography Hierarchy Specification's existing KPI-grid context
  unchanged.
- Does not change Business Worth's or Embedded Profit's calculation,
  meaning, or data source — presentation only.
- Does not resolve whether Embedded Profit could ever be a flagship
  metric in some other, Business-Worth-absent context — Section 5's
  amendment leaves that door open in wording only; no such screen
  exists today, and none is authorized by this specification.
- Does not touch SuperAdmin, any financial report, or any screen other
  than the Dashboard and the three governing documents named above.

## 11. Implementation Boundary (Locked, for the Implementation Task)

**Implement the approved Dashboard KPI hierarchy only.** Change
Embedded Profit from `variant="dark"` to the default light variant.
Resize the eight supporting KPI cards' values to the documented
KPI-grid context (24px desktop / 20px mobile). Amend the three
governing documents per Sections 5–7. **Do not**: restructure the
Dashboard grid or column layout; change Business Worth's size, badge,
or click behavior; change Embedded Profit's or any other card's
`onClick`, description, icon, or color-tone logic; introduce a new
typography or card class; touch any file outside
`DashboardView.tsx`, `DESIGN_SYSTEM.md`, `01-dashboard.md`, and
`COMPONENT_LIBRARY.md`. Perform the mobile visual verification named in
Section 9 explicitly, as a named step — not assumed satisfied by the
desktop change or by the existing test suite passing.

**This specification is now frozen.** The next artifact is a separate,
formally-scoped implementation task — this document does not itself
authorize any code change.
