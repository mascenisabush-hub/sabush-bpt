Specification — Proposed Design System Amendment

# Typography Hierarchy Specification (Business Worth / Financial Reports, Phase 1)

**Status:** Frozen — Specification → Implementation authorized. Direction
approved (prior review); internal-consistency check against
`DESIGN_SYSTEM.md` v2.0's full typography-relevant guidance completed
(Section 2a): no conflicts found, two independent confirmations
discovered (the 13px financial-figure floor and the `--muted-foreground`
empty-state standard both already existed in v2.0, unrelated to this
session's audit — this specification enforces existing policy, not a
new preference). This document itself does not constitute the
implementation task — per this project's established discipline, a
separate, formally-scoped implementation task (with its own stop
conditions and required report format) is the next artifact, not
code changes issued directly from this approval. Proposes an amendment to
[`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) (currently v2.0) — does not
edit that document. Does not authorize any code, CSS, or component
change.
**Depends on:** the system-wide UI readability audit and the Business
Worth/financial-screen deep-dive audit (both this session, not yet
filed as standalone documents — their findings are incorporated
directly below since they are load-bearing); [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md)
v2.0, particularly its existing "Typography hierarchy" and
"Non-negotiable rules" sections, which this specification amends
narrowly rather than supersedes.
**Governing product decision (already made, restated not re-litigated):**
Business Worth and its supporting reports are approved as Phase 1
scope. Dashboard KPI consistency is approved as an in-scope
consideration where it directly bears on the same shared primitives.
SuperAdmin's separate visual system is explicitly deferred — not part
of this specification.

---

## 1. Purpose

Lock an exact, approved typography scale for the Business Worth /
financial-report screen family, close two confirmed WCAG contrast
failures, and resolve — explicitly, not by omission — a real tension
this specification's own drafting surfaced between the approved
remediation direction and `DESIGN_SYSTEM.md` v2.0's own existing,
deliberate caution against typography-tier proliferation.

## 1a. The Governing Architectural Principle

Stated explicitly so it governs every decision below, and so a future
developer encountering a new financial-number size does not repeat the
mistake that caused this specification to be needed in the first
place:

**A semantic typography class communicates *what* the content is.
Component/screen context determines *how prominently* that content is
presented.**

Concretely: `.type-number` does not mean "a number rendered at 24px."
`.type-number` means "a financial or quantitative figure whose exact
size is determined by its presentation context" — a hero figure, a
KPI-grid figure, and an inline table figure are all still `.type-number`,
just at different, now-documented sizes (Section 3). The same
principle applies to `.type-body`: it names a semantic role (ordinary
business-readable content), not a single fixed size — its 14px and
13px variants (Section 3) are both still `.type-body`, distinguished
by context, not by a proliferating family of new class names.

**This is the single architectural correction this specification
makes** — not "add classes" and not "change pixel values" in
isolation, but establish that size is a contextual property applied
*to* a semantic role, never baked into the role's name itself. Every
other decision in this document follows from this one principle.

## 2. The Tension Found During Drafting, and Its Resolution

**`DESIGN_SYSTEM.md` v2.0 states, explicitly, under Typography
hierarchy:** *"Three tiers, used consistently... If a fourth tier
feels needed, that's a sign the layout needs simplifying, not a new
class."* The approved audit refinement calls for three new classes
(`.type-kpi-number`, `.type-body`, `.type-body-sm`). Taken at face
value, this would directly contradict v2.0's own stated design
philosophy — a contradiction this specification does not paper over.

**Investigated resolution, not a compromise chosen for its own sake:**
`server/`-adjacent inspection of the actual current CSS
(`apps/tenant/src/index.css`) confirms `.type-number` **already has no
fixed font-size defined** — it is, and always has been, a
weight-and-feature class (`font-weight: 800`, tabular figures),
relying on whatever size utility happens to be paired with it at each
use site. This means the "KPI values are too small" problem was never
actually a missing-tier problem — it is a **missing documented size
convention** problem. `.type-number` does not need a competing sibling
class; it needs its existing, already-contextual behavior made
explicit and standardized, rather than left to per-screen improvisation
(which is exactly how the Business Worth Report ended up smaller than
the Dashboard for conceptually identical figures).

**Resolution adopted by this specification:**
- **No `.type-kpi-number` class.** `.type-number` remains the single,
  unified class for every recorded financial figure, exactly as
  `DESIGN_SYSTEM.md` v2.0 already establishes ("reserved for facts,
  never predictions"). What's new is a **documented size-context
  table** (Section 3) specifying which pixel size accompanies
  `.type-number` in each context — hero, KPI-grid, and inline/table —
  eliminating the improvisation that caused the inconsistency, without
  adding a competing tier.
- **One new class, not three: `.type-body`.** This fills a genuine,
  confirmed absence — v2.0's typography hierarchy currently has *zero*
  coverage for ordinary paragraph/sentence-style content (the
  composition note, empty states, insight-banner prose). This is not
  "a fourth tier added to an already-covered category" — it is closing
  a gap that was never covered at all, which is a materially different
  situation than what v2.0's caution was written to prevent.
- **No `.type-body-sm` class.** The 13px "secondary readable content"
  size is expressed as a plain, documented Tailwind utility
  (`text-[13px]`) paired with `.type-body`'s same weight/color
  discipline — a size variant of one class's documented usage, not a
  second named class. This keeps the actual class-count addition to
  **one**, faithful to v2.0's minimalism, while still giving
  implementers a clear, non-improvised answer for secondary content.

**Net effect:** `DESIGN_SYSTEM.md`'s typography section goes from four
classes to five (adding only `.type-body`), plus a new documented
size-context table for `.type-number` and `.type-body`'s existing
sizes — not the three-class expansion originally floated, and not a
silent override of v2.0's own stated caution either.

## 2a. Full Internal-Consistency Check Against `DESIGN_SYSTEM.md` v2.0

Requested explicitly before implementation: confirm this proposal is
consistent with v2.0's *other* typography-relevant guidance, not only
the three-tier statement. Every section of v2.0 mentioning typography,
text color, or financial-figure treatment was checked directly.
Result: **no conflicts found — one additional confirming discovery
that materially strengthens this specification's own justification,
and one adjacent, non-typography finding worth recording.**

**The strongest confirmation — Mobile rules already states, verbatim,
pre-existing, unrelated to this session's audit:** *"Financial figures
never shrink below 13px on any breakpoint, including inside a dense
table on a small screen — the one place this product cannot trade
legibility for density, since the entire product exists to make a
number trustworthy and readable at a glance."* **This specification
does not introduce a new rule that financial figures need a size
floor — v2.0 already mandates one, at 13px, and the current
implementation (12px table figures, confirmed by direct inspection)
has been silently violating an already-approved rule.** This
specification's `.type-number` inline/table context (14px, Section 3)
both complies with and slightly exceeds this pre-existing floor —
worth stating explicitly as compliance with existing policy, not as
this specification's own invention.

**A second, independent confirmation — Empty & loading states already
specifies the correct color for exactly the content this
specification's Section 4 fixes:** *"below it, one line of
`--muted-foreground` body text explaining what's missing."*
`--muted-foreground` is `#6B7280` (~4.6:1, WCAG-passing) — not the
`text-gray-400` (~2.5:1, failing) actually found in
`BusinessWorthReport.tsx`'s empty states. **The accessibility fix in
Section 4 is not proposing a new color rule — it is correcting an
implementation that already deviates from a documented, correct v2.0
standard.** The same section's icon-color guidance
(`text-gray-300`, deliberately a step lighter than
`--muted-foreground`, justified specifically because an icon is
decorative rather than informational) independently confirms the same
decorative-vs-informational distinction this session's original audit
relied on to clear `gray-400`'s use on icons/placeholders while
flagging its use on real text.

**Every other typography-adjacent reference checked, confirmed
consistent, no changes required:** Tables ("numeric columns... use
`.type-number`" — no size specified, consistent with treating size as
a documented context rather than baked into the class); Forms & inputs
("help text: small, `--muted-foreground`" — the same
semantic-role-without-locked-size pattern this specification's whole
resolution is built on, left untouched as genuinely out of scope);
Charts ("`.type-number` (tabular figures) for any numeric axis or
data-point label" — consistent, charts remain out of scope per
Section 5).

**One adjacent, non-typography finding, recorded but not resolved by
this specification:** Cards states `.card-dark-gradient` (navy
gradient) is *"reserved for the single flagship metric on a screen...
never more than one per screen."* `BusinessWorthReport.tsx`'s actual
hero card does not use this class — it uses a hand-rolled gold-tint
gradient (`bg-gradient-to-br from-[#F6EFD9] to-white`) instead. This is
a real, confirmed deviation on the exact component this specification
already touches (Section 5), but it is a **card-treatment question,
not a typography question** — resolving it is explicitly out of this
specification's scope (Section 5's own boundary) and is named here so
it is not lost, not because this specification proposes to fix it.

**Verdict: internally consistent.** No part of this proposal
contradicts any other section of `DESIGN_SYSTEM.md` v2.0. Two
sections independently confirm the direction was already correct
before this session's audit began; one unrelated card-treatment
deviation was found and is recorded as a separate, future
consideration.

## 3. Locked Typography Scale

Extends `DESIGN_SYSTEM.md` v2.0's existing table — new/changed rows
marked; unchanged rows restated for completeness, not altered.

| Class | Use | Weight / size | Status |
|---|---|---|---|
| `.type-title-lg` | Screen-level headings | 800 / 22px | **Unchanged** |
| `.type-title` | Section/card/modal headings | 700 / 17px | **Unchanged** |
| `.type-number` (hero context) | The single dominant figure on a screen (Business Worth hero, Dashboard's flagship metric) | 800, tabular, **32–36px responsive** | **Size context newly documented** — matches current Dashboard/hero practice exactly, not a change |
| `.type-number` (KPI-grid context) | A recorded figure shown alongside others in a grid (Business Worth Report's 8 KPI cards, and any equivalent elsewhere) | 800, tabular, **24px desktop / 20px mobile** | **Size context newly documented — the corrective change** (was 18–20px, undocumented and inconsistent with the Dashboard's own hero treatment) |
| `.type-number` (inline/table context) | A figure inside a table cell or inline sentence | 800, tabular, **14px** | **Size context newly documented** (was 12px, inherited from ambient table text) |
| `.type-label` | Captions/field labels, eyebrow text | 600 / 10–12px, uppercase, tracked | **Unchanged** — the one legitimate small-text exception, per the audit's own findings (weight + case + tracking compensate for size) |
| `.type-body` *(NEW)* | Normal business-readable content: table cells (non-numeric), form values, descriptions, insight-banner prose, an important supporting statement (e.g. the growth-delta sentence) | 500 / **14px** / ~1.5 line-height / `var(--foreground)` | **New class — closes the confirmed gap** |
| `.type-body` (secondary size variant) | Secondary readable content: composition notes, empty states, less-critical captions that are still full sentences, not eyebrow labels | 500 / **13px** / ~1.45 line-height / `var(--foreground)` or a confirmed-passing gray | **Documented size variant of `.type-body`, not a new class** |
| Important supporting statement (growth-delta line) | A single sentence conveying a real business fact, more prominent than ordinary body text but not a KPI figure itself | 700 / **16px** | **New, explicit tier — sits between `.type-body` and the KPI-grid size, per the approved refinement** |

**Explicit threshold rule, replacing the earlier "14px absolute floor"
framing per the approved refinement:** 14px is the minimum for
**primary business-readable content** — not a universal floor. The
full ladder: 32–36px (dominant figure) → 24px (KPI-grid figure) → 16px
(important supporting statement) → 14px (normal business content) →
13px (secondary readable content) → 10–12px (deliberately-designed
metadata/eyebrow/status only, per `.type-label`'s existing, unchanged
treatment). Anything smaller than 10px requires explicit,
case-by-case justification — none is anticipated by this
specification.

## 4. Accessibility Corrections (Not a Size Question)

Two confirmed WCAG AA contrast failures, found on real content (not
placeholders or icons, which remain unaffected):

1. `apps/tenant/src/components/reports/BusinessWorthReport.tsx` —
   composition/donut-chart caption, currently `text-[11px] text-gray-400`
   (~2.5:1). Must move to a confirmed-passing color — `text-gray-600`
   (~7:1) or `var(--foreground)` — as part of adopting the `.type-body`
   secondary-size treatment (Section 3), not as a separate, unrelated
   color-only patch.
2. Empty-state text in the same file (`text-xs text-gray-400`, both
   the expenses and withdrawals empty states) — same fix, same
   reasoning.

**Explicit governing rule, restated from the approved refinement:** do
not solve accessibility by indiscriminately darkening or enlarging
every element. These two fixes are corrected by adopting the semantic
`.type-body` treatment where this content already belongs by role —
not a separate, ad hoc accessibility pass layered on top.

## 5. Scope — Phase 1, Narrow

**In scope for the eventual implementation this specification
authorizes planning toward:**
- `apps/tenant/src/components/reports/shared/ReportUI.tsx` — the
  shared primitive layer (`ReportKpiCard`, `InsightBanner`,
  `ReportHeader`, `ReportSection`, `ReportEmptyState`) every financial
  report consumes. This is the single highest-leverage file — fixing
  it here propagates correctly to every report that already reuses
  these primitives, confirmed by direct inspection this session
  (`CapitalGrowthReport.tsx` was checked directly and found to inherit
  essentially all of its typography from `ReportUI.tsx` rather than
  declaring its own).
- `apps/tenant/src/components/reports/BusinessWorthReport.tsx` — the
  specific hero card, growth-delta line, and the two confirmed
  accessibility fixes (Section 4), none of which route through
  `ReportUI.tsx`.
- `DESIGN_SYSTEM.md` itself — the proposed amendment (Section 2/3),
  once approved, becomes the actual edit target — not `index.css`
  directly and not each component independently.
- `apps/tenant/src/index.css` — where `.type-body` and the documented
  size-context conventions actually get defined, following
  `DESIGN_SYSTEM.md`'s own established pattern of "the CSS file
  implements what the design-system document specifies."
- The Dashboard's own KPI treatment (`DashboardView.tsx`), **only**
  insofar as reconciling it with the new documented `.type-number`
  size contexts requires it — not a general Dashboard redesign.

**Explicitly out of scope for Phase 1:**
- Every other report (`InventoryValuationReport.tsx`,
  `CapitalGrowthReport.tsx`, `ExpenseReport.tsx`,
  `WithdrawalReport.tsx`, `BatchPerformanceReport.tsx`,
  `StockVerificationReport.tsx`, `InventoryLossReport.tsx`) — expected
  to inherit the fix automatically via `ReportUI.tsx`, per the
  "smallest number of changes, largest improvement" principle the
  original audit established; verification (Section 7) confirms this
  inheritance actually holds, it does not re-implement each report
  individually.
- Any screen outside the Business Worth/financial-report family
  (Products, Settings, Staff/Roles, Multi-Shop, etc.) — a real,
  separately-scoped future decision, not silently expanded into here.
- SuperAdmin's visual system — explicitly deferred, per the original
  audit's own recommendation, unchanged by this specification.
- Any mechanical, screen-by-screen replacement of the ~505 sub-14px
  declarations the original system-wide audit counted — explicitly
  rejected as a strategy by the approved refinement; this
  specification's whole premise is that fixing the shared primitive
  corrects the family of screens that matters most, without touching
  the other ~490 declarations elsewhere in the app that remain
  entirely outside this specification's scope.

## 6. Acceptance Criteria

*Recorded now as a fixed target, per this repository's established
convention — verifiable only once implementation exists.*

- [ ] `DESIGN_SYSTEM.md`'s Typography hierarchy section reflects
      exactly the table in Section 3 above — one new class
      (`.type-body`), zero new competing number/emphasis tiers,
      `.type-number`'s existing single-class status preserved.
- [ ] `ReportKpiCard` (`ReportUI.tsx`) renders its value at 24px
      desktop / 20px mobile, using `.type-number` with the documented
      KPI-grid size context — not a new, separately-named class.
- [ ] The Business Worth hero figure remains 32–36px, unchanged.
- [ ] The growth-delta line renders at 16px, 700 weight.
- [ ] `InsightBanner` prose renders using `.type-body` (14px).
- [ ] The composition-note caption and both empty states
      (`BusinessWorthReport.tsx`) no longer use `text-gray-400` on real
      content — both now pass WCAG AA, confirmed by calculation, not
      assumption.
- [ ] Table amount cells across the affected reports render at 14px
      via `.type-number`'s inline/table size context.
- [ ] `CapitalGrowthReport.tsx` and at least one other `ReportUI.tsx`
      consumer are confirmed, by direct inspection after
      implementation, to have inherited the fix automatically — not
      independently re-styled.
- [ ] Dashboard KPI treatment and the new KPI-grid context size are
      confirmed consistent with each other where they represent
      conceptually similar figures — the specific hierarchy-inversion
      finding (Section 6 of the deep-dive audit) is resolved, not
      merely reduced.
- [ ] Mobile layout confirmed not to regress — the responsive step-down
      (24px → 20px for KPI values) is verified on an actual narrow
      viewport, not assumed safe from the desktop change alone.
- [ ] **Enforceable, not merely descriptive:** search the resulting
      rendered/component styles for any financial figure (any
      `.type-number`-styled content) below 13px at any breakpoint.
      Treat any occurrence found without an explicit, documented
      exception as a failure — not a pre-existing rule from
      `DESIGN_SYSTEM.md` v2.0's own Mobile rules section (Section 2a),
      restated here as a concrete, checkable gate rather than
      documentation that can silently drift again.
- [ ] No unrelated screen, component, or the ~490 out-of-scope sub-14px
      declarations elsewhere in the app are touched.
- [ ] `.card-dark-gradient` and `BusinessWorthReport.tsx`'s hero-card
      treatment are **not** modified by this implementation — the
      Section 2a card-treatment finding remains explicitly parked as a
      separate, future consideration, not folded in.

## 6a. Verification List for the Implementation Task

To be performed explicitly, not assumed satisfied by unrelated
signals (Section 7):

1. Business Worth — desktop
2. Business Worth — mobile
3. Capital Growth Report
4. Inventory Valuation Report
5. Other `ReportUI.tsx` consumers (spot-checked, not necessarily all)
6. Dashboard KPI consistency with the new KPI-grid context
7. Empty states (both `BusinessWorthReport.tsx` instances)
8. Tables (amount cells, other columns)
9. Financial figures at every breakpoint, against the enforceable
   13px-floor check above
10. TypeScript × 3, full build, existing 580-test suite (regression
    signal only — not a substitute for visual confirmation, per
    Section 7)
11. Visual regression review — an explicit, named step, not implied by
    "tests still pass"

## 7. Rule 8 / Implementation-Readiness Considerations

This is a CSS/component-level change, not a data/query/security
change — the Rule 8 discipline this project has applied to
Firestore-facing work does not translate directly, but the equivalent
verification burden for this kind of change is:

- **No real-Firestore-style empirical gate exists here** — the closest
  analog is confirming, after implementation, that the inheritance
  claim in Section 5 actually holds (every `ReportUI.tsx` consumer
  genuinely inherits the fix, not just the two reports directly
  inspected this session). This should be a concrete verification
  step in the implementation task, not assumed.
- **Bundle isolation** remains a real, standing verification
  requirement — `apps/tenant`'s CSS/component change must not leak
  into `apps/superadmin`'s separate bundle, matching this project's
  existing discipline for every prior UI change.
- **No backend, no Firestore, no server route, no test-suite regression
  risk** — this is the first UI-focused specification in this
  project's history where the existing 580-test suite is not the
  primary verification signal; visual confirmation (desktop and
  mobile, populated and empty states) is the real gate, and should be
  named as such explicitly in the implementation task rather than
  substituted with "tests still pass."

**This specification is Rule-8-adjacent-ready** — the scope is narrow,
the class-count resolution (Section 2) closes the one real open
architectural question this drafting surfaced, and the acceptance
criteria (Section 6) are concrete. The one item requiring explicit
Product Architect sign-off before an implementation prompt is issued:
**approval of the Section 2 resolution itself** — specifically,
confirming that documenting `.type-number`'s size contexts (rather
than adding `.type-kpi-number`) is an acceptable reading of
`DESIGN_SYSTEM.md` v2.0's own intent, not a unilateral reinterpretation
of it.

## 8. What This Specification Does Not Do

- Does not edit `DESIGN_SYSTEM.md`, `index.css`, or any component —
  proposes the amendment, does not apply it.
- Does not authorize a mechanical, app-wide font-size replacement pass
  — explicitly rejected, per Section 5.
- Does not touch SuperAdmin's visual system.
- Does not add more than one new named typography class.
- Does not solve the two confirmed accessibility failures with a
  standalone color patch disconnected from the semantic `.type-body`
  treatment they belong under.
- Does not claim the existing 580-test suite is sufficient
  verification for this kind of change — visual confirmation is the
  real gate, named explicitly rather than assumed satisfied by
  unrelated test coverage.

## 9. Implementation Boundary (Locked, for the Implementation Task)

Restated here explicitly, per Product Architect direction, so it is
recorded in the specification itself rather than living only in
conversation history:

**Implement the approved typography specification only.** Use the
existing design system and semantic typography primitives. Prioritize
`ReportUI.tsx` as the shared financial-report layer. Correct affected
financial screens where they have direct violations. **Do not**:
mechanically replace all small font declarations; redesign cards;
change the navy/gold visual identity; modify SuperAdmin; introduce new
number-tier classes; introduce `.type-body-sm`; modify the
`.card-dark-gradient` treatment or `BusinessWorthReport.tsx`'s hero
card (Section 2a's parked finding) in this task. Preserve existing
layout, information architecture, functionality, calculations, and
responsive behavior except where the approved typography changes
necessarily affect dimensions.

**This specification is now frozen.** The next artifact is a separate,
formally-scoped implementation task — this document does not itself
authorize any code change.
