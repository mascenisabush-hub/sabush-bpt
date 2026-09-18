# Rule 8 Assessment — Field Readability & Interaction (System-Wide Field Foundation)

**Governing chain:** Forensic investigation (system-wide field readability; Part 3 Superadmin) → [`field-readability-and-interaction-specification-amendment.md`](../specs/field-readability-and-interaction-specification-amendment.md) r2 (PAD-1 … PAD-21 **DECIDED** by the Product Architect) → **this assessment.**
**Scope:** The whole field-foundation program, phases **P0–P5** as fixed by PAD-19. This is a **program-level** assessment; it does **not** replace the per-phase Rule 8 checkpoints that PAD-19 requires.
**Lifecycle state:** Decided → **Assessed** (this document). Reaching "Assessed" is a readiness opinion, not authorization (`platform-engineering-governance-standard.md` §3, Principle 7).
**Baseline verified fresh:** HEAD `0394235` (`fix(add-stock): staff hitting "insufficient permission" saving a stock purchase`), working tree clean (`git status --short` empty) immediately before this work began; re-confirmed at the end (see §7).
**Implementation status: NOT AUTHORIZED.** No Implementation Authorization is issued or implied by this document.

---

## 1. Objective

Determine, against the current repository state and not against memory of earlier turns, whether the decided specification is sufficiently defined, safe in business/data terms, and architecturally coherent to allow a request for Implementation Authorization — and for which phases.

## 2. Method, and its limits

**Done (read-only):**
- Re-read `apps/tenant/src/index.css`, `apps/superadmin/src/index.css`, `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`-adjacent rules, both `vite.config.ts`, `package.json`/lockfile, and the field code in Contagem, Initial Stock Count, Add Stock, Auth (Login), Timeline, AvatarCropModal, Header.
- Repository-wide greps for field elements, `htmlFor`, `aria-invalid`/`aria-describedby`, `readOnly`, `!important`, `@layer`, autofill/`appearance` rules, semantic focus colors, and source-scan tests.
- Computed WCAG 2.x contrast ratios for every current and decided value (reproducible from the hex codes in the specification, H.0a).
- **An empirical Tailwind layering test**, run in a scratch directory **outside the repository** (`/tmp`), with `tailwindcss@4` = **4.3.3, the same version pinned in `package-lock.json`** (`tailwindcss`, `@tailwindcss/vite`: 4.3.3). See §8.7.

**Not done — and therefore not claimed:**
- **No build or typecheck was run.** `node_modules` is absent in this working copy. The typecheck baseline is taken from `HANDOFF.md` (tenant: 3 pre-existing unrelated errors; superadmin: 0; root/server: 15 pre-existing) and **must be re-run at the P0 checkpoint**.
- **No browser rendering, no pixel measurement, no screenshots.** Nothing below states that any screen "renders correctly." Rendered-width claims (e.g. the Contagem Qtd track) are derived from the grid template and padding arithmetic and are labelled as such.
- **The forensic census was not re-derived** (see §8.6 discrepancy).
- **The Firestore rules emulator was not run** (irrelevant to this work; see §8.3).

## 3. Result at a glance

| Rule | Subject | Verdict |
|---|---|---|
| 8.1 | Business/UX impact | **PASS** — no business/domain change expected; visible UX changes are intended and enumerated |
| 8.2 | Architecture | **PASS with conditions** — coherent; Tenant/Superadmin mechanism to be verified at P0 |
| 8.3 | Data | **PASS** — no data-layer change |
| 8.4 | Behavioral risk | **PASS with conditions** — real risks identified, incl. source-scan test coupling |
| 8.5 | Accessibility | **PASS** — decided values meet requirements; semantics deferred to P4 by design |
| 8.6 | Regression surface | **Identified, NOT validated** — by design; per-phase |
| 8.7 | CSS/layering | **PASS with one specification amendment** — a `.type-body` interaction was found and added to the spec |
| 8.8 | Mobile | **Risks identified; validation deferred** to implementation testing per PAD-9 |
| 8.9 | Governance readiness | **Ready to request authorization for P0 only, conditional** (see §8.9) |

---

## 8.1 Business / UX impact

**Question:** does the work change business rules, financial calculations, inventory calculations, permissions, authentication, workflows, persistence semantics, or product meaning?

**Evidence-based conclusion: No.**

- The change class is confined to CSS custom properties, one CSS class family (`.input-base` and modifiers), the global focus rule, `className` strings on field elements, and (P4) additive ARIA attributes/ids. No decided PAD alters a handler, state, hook, route, permission, calculation, or Firestore path.
- Calculation code is not in the change path: field appearance is expressed in `className`, whereas values flow through handlers such as `updateCatalogRow`, `sanitizeDecimalInput`, `handleQuantityKeyDown`, and the pure calculation modules exercised by `tests/calculations.test.ts` and the Business Worth tests.
- **Contagem "not counted" semantics:** PAD-11 (O-e) moves the *signalling* out of the placeholder. The underlying blank-row logic (`isBlank = row.quantity.trim() === ''`, with `q = isBlank ? 0 : …`, `PeriodicStockCountView.tsx:7729–7730`) is business logic and is **not** in scope; it must not be touched.
- **Visible UX changes that ARE intended** (so nobody mistakes them for regressions): stronger field borders (`#E5E7EB` → `#7C8695`), pure-black entered values, `#5F6B7A` placeholders, darker-gold focus with constant border width, disabled/locked fields without opacity, no tint or focus-fill on Contagem fields, field text ≥ 13px (Login and other 11–12px fields grow), and Contagem's blank-state cue changing form.

**Condition:** this conclusion is a plan-level statement. At each phase, any diff outside `className`/CSS/token/ARIA additions is a **stop condition**.

## 8.2 Architecture

| Element | Assessment |
|---|---|
| `.input-base` (PAD-13) | Exists in both apps **[V]**. Tenant has **0** `.tsx` uses; Superadmin **23**. Retaining the name avoids Superadmin churn. Sound. |
| Shared field foundation | Coherent with `DESIGN_SYSTEM.md` and Principle 2.11 ("no screen ships outside the design system without the system being updated first"). **Sequencing consequence:** `DESIGN_SYSTEM.md` must be updated **first** (spec H.15) — P0 includes it. |
| Tenant/Superadmin convergence (PAD-14) | The duplication is deliberate and documented (Superadmin `index.css` header; NFR-1). Feasibility indicators **[V]**: NFR-1's wording is about components/identifiers in built output, not CSS; a neutral shared module already exists as a pattern (`@sabush/shared-types` resolved by both `vite.config.ts`); both apps use `@tailwindcss/vite`. **Not empirically tested** (no build in this session). Verdict: the decided principle is achievable in principle; the concrete mechanism (neutral shared stylesheet + NFR-1-style built-output scan, fallback: duplicated blocks guarded by a sync test) is a **P0 checkpoint deliverable**, not an open decision. |
| Optional `Field` wrapper (PAD-18) | Correctly bounded: semantics only, P4, not the visual foundation. Highest DOM-regression risk of the program; deferring it to P4 is the right containment. Needs its own Rule 8 (id generation via `useId`, no added layout box). |
| Timeline exception (PAD-15) | Verified as the one non-layout-identical case **[F]**; the wrapper (`bg-white border border-gray-200 rounded-2xl`, `BusinessTimelineView.tsx:166`) is the visible component. Wrapper `:focus-within` is the sound mechanism. Note the wrapper's own border is `gray-200` ≈ 1.24:1 and must meet the boundary requirement (spec G5). |
| Native-control separation (PAD-17) | Confirmed by evidence: the 3 file inputs are `className="hidden"` (nothing to style); the range uses `accent-[#D4AF37]` (2.0:1); 7 checkboxes. Separate family is correct. Concrete rules are R-8 (P3). |
| CSS layering | See §8.7. |
| Repo rules (CLAUDE.md 1–8) | No new business rule; no ERP/POS; reuse over reinvention (`.input-base` reused, not replaced); tenant isolation untouched. **Rule 8 itself is satisfied only per phase** — hence per-phase checkpoints. |

## 8.3 Data

**Conclusion: no data-layer change of any kind.**

| Question | Answer | Basis |
|---|---|---|
| Firestore schema | Unchanged | CSS/className/ARIA only |
| Reads | Unchanged | No listener/query file in change path |
| Writes / persistence | Unchanged | Autosave/draft persistence stores *values*, not presentation |
| Migrations | None | Nothing is stored about field appearance |
| Historical data | Unaffected | Presentation-only |
| Business calculations | Unaffected | See 8.1 |
| `firestore.rules` / `server/` | Not touched | Not a "capability that touches Firestore" (CLAUDE.md rule 7) |

Consequently the Firestore emulator limitation recorded in `HANDOFF.md` is **not a blocker** for this program.

## 8.4 Behavioral risk (class/style migration accidentally changing behavior)

| Area | Risk | Evidence / mitigation |
|---|---|---|
| Controlled inputs | Low | `value`/`onChange` are separate props from `className`; edits are to `className` only. Watch template literals that *interleave* logic and classes, e.g. `${fieldClass} font-mono tabular-nums ${isBlank ? 'placeholder:text-amber-500/70' : ''} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}` (`PeriodicStockCountView.tsx:7958`) — a careless edit could drop the conditional |
| Event handlers / refs | Low | Focus movement is ref-driven (`activeQuantityInputRef`, `handleQuantityKeyDown`), not class-driven |
| Validation / submission | Low | Untouched; P4 adds `aria-invalid`/`aria-describedby` as **additive** attributes driven by *existing* validation results — no new validation rules (PAD-6) |
| Disabled behavior | **Medium** | Moving from `opacity-60` to explicit tokens must keep the `disabled` attribute and `cursor-not-allowed`. ~103 disabled-pattern occurrences **[V]**. Visual perception of "locked" changes (spec U6) |
| Focus behavior | Medium | 124 `focus:outline-none` occurrences in tenant components **[V]** coexist with an **unlayered** global `:focus-visible` outline (§8.7). Replacing this with one model can change *which* indicator appears; needs per-family visual check. Also `box-shadow` glow can be clipped inside `overflow-hidden`/scrolling dialog containers |
| Select behavior | Medium | Native `<select>` rendering differs by browser/OS; the foundation must not set `appearance` in a way that hides the chevron the DS requires. ~29 tenant + 6 Superadmin selects (raw grep) |
| Autofill | **Medium (Login)** | No `:-webkit-autofill` styling exists in either stylesheet **[V]**. On the dark Login variant, browser autofill can force a light fill under white text. Pre-existing hazard that a dark variant must be validated against (P3) |
| File input | Low | 3 inputs are `hidden`, triggered by buttons; **not touched** (PAD-17). Preserve `accept`/`capture` untouched |
| **Source-scan tests** | **Medium — newly identified** | 138 test files use `readFileSync`; several assert JSX **structure/text** of the field code, e.g. a regex on `<input\s*\n\s*type="text"\s*\n\s*(placeholder="un"…` (`periodic-contagem-unidade-selector`), a regex requiring `ref={searchInputRef}` … `placeholder="Procurar um pr…` adjacency (`periodic-contagem-keyboard-shortcuts`), `rowGridClass.replace('sm:items-end'…` (`periodic-contagem-concept-b-compaction`), and the exact expression `{isBlank ? 'Não contado' : formatCurrency(rowSellingValue, currencySymbol)}` in **two** tests. Class-string/attribute-order edits can fail these tests **without any behavior change**. Mitigation: preserve attribute order and line structure; do not change the `rowGridClass` string (PAD-11 already forbids grid changes) or the chip expression's wording; run the full suite per checkpoint; never edit a test to make it pass |

## 8.5 Accessibility

| Item | Current | Decided / specified | Assessment |
|---|---|---|---|
| Field boundary contrast | `#E5E7EB` = 1.24 white / 1.18 page | `#7C8695` = 3.68 / 3.50 (PAD-2) | Meets 3:1 |
| Placeholder contrast | `gray-400` 2.54; Option C 2.99–3.68 | `#5F6B7A` = 5.43 (PAD-3) | Meets 4.5:1 |
| Entered-value contrast | `#111827` 17.7 | `#000000` = 21.0 (PAD-21) | Meets |
| Focus visibility | gold `#D4AF37` = 2.10 / 2.00; Option C width shift | `#8A6D1F` = 4.90 / 4.65, constant width, 1px same-colour stroke + decorative glow, forced-colours fallback (PAD-5) | Meets 3:1; forced-colours handled |
| Programmatic names | 5 `htmlFor` lines in tenant source (forensic: 4 of 159 labels); 94 placeholder-only fields **[F]** | P4 via `Field` wrapper/manual association (PAD-18) | **Deferred to P4 by design.** Until P4 the field-name defect persists; appearance phases do not worsen it |
| `aria-invalid` / `aria-describedby` | **0** uses **[V]** | P4; error styling keyed on `aria-invalid` | Deferred to P4 |
| Required semantics | Many `required` attributes (loose grep ≈77 matches); asterisk convention in DS | Programmatic `required`/`aria-required`; asterisk `aria-hidden` | P4 |
| Dense-grid labeling | Per-cell labels `sm:hidden`; desktop relies on column headers | `aria-labelledby` = column header + row/product context (PAD-20) | Sound; needs a header-id scheme in P4 |
| Native controls | Unchecked outline `#E5E7EB` 1.18; checked gold fill 2.0; range accent gold 2.0 | Separate family (PAD-17); values R-8 | **Not yet specified to value** — P3 |
| Disabled/locked | `opacity-60` (unpredictable) | Explicit tokens; product floor 4.5:1 (R-6 values) | Direction decided |
| Semantic focus colors | `blue-400` ×1 and `rose-400` ×1 on light surfaces below 3:1 **[C]**; identity amber `amber-200`/`amber-400` fail | PAD-7 amber `#B45309`; others per R-2/R-7 | Partly decided |

Interpretive note carried from the spec: applying WCAG 1.4.11 to field borders is the conservative reading; it is the adopted standard for this program.

## 8.6 Regression surface

Counts below are **lines containing `<input`/`<select`/`<textarea`** from a plain grep at HEAD `0394235` — a size indicator, **not** a field census.

| Screen | Primary file(s) | Lines | Field families involved | Validation status |
|---|---|---|---|---|
| Contagem | `PeriodicStockCountView.tsx` | 31 | Option C grid fields, selects, identity-search (amber), search | **Not validated** |
| Stock Entry | `AddStockView.tsx` | 30 | Grid fields, identity-search, scan/file (hidden) | **Not validated** |
| Initial Stock Count | `InitialStockCountView.tsx` (+ `InitialStockPriceChangeModal.tsx` 5) | 11 (+5) | Old-style grid fields, checkbox | **Not validated** |
| Expenses / Withdrawals / Owner Investment | `AddExpenseView`, `AddWithdrawalView`, `AddOwnerInvestmentView` | 4 / 4 / 3 | Standard | **Not validated** |
| Cash Flow | `CashFlowView.tsx` | 10 | Standard, filters | **Not validated** |
| Settings | `SettingsModal.tsx` | 12 | Standard, checkboxes | **Not validated** |
| Dashboard search | `DashboardView.tsx` | 3 | Search | **Not validated** |
| Subscription | `SubscriptionContactModal.tsx` (+ banners) | 2 | Standard | **Not validated** |
| Login | `AuthView.tsx` | 7 | Dark variant, `blue-400` focus | **Not validated** |
| Timeline | `timeline/BusinessTimelineView.tsx` | 2 | Borderless-inline exception | **Not validated** |
| Other tenant | Catalog 10, EditProduct 9, Stocks 6, ProfileSetup 6, Closing 5, Quebra 5, Startup 4, ShopSwitcher 3, others ≤2 | — | Mixed | **Not validated** |
| Superadmin | `BusinessDetail` 7, `BusinessDirectory` 5, `AuditTrail` 5, `SignIn` 2, `Operators` 2, `PaymentDetail` 1, `BusinessSearch` 1 | 23 | `.input-base` today (23 uses), local copy of the CSS | **Not validated** |

**Discrepancy to be resolved (not a finding against the forensic work).** A plain grep gives tenant 149 `<input` / 29 `<select` / 3 `<textarea` (181) and Superadmin 11 / 6 / 6 (23); the forensic totals are 187 text-like + 11 native, 34 style signatures, 159 labels, 4 `htmlFor`. The raw-text method differs from whatever produced the forensic figures (comments, multi-line JSX, mapped elements and per-app scope all change a text count). The forensic values remain **[F]**. **Action:** before P2, re-run the census with a **method-controlled (AST-based) counter** and re-establish the "186/187 layout-identical" conversion result against the tree as it then stands.

## 8.7 CSS / layering

**Empirical result (scratch dir, Tailwind 4.3.3 = lockfile version).** A stylesheet `@import "tailwindcss"` followed by unlayered `.input-base { border-radius:10px … }` and `:focus-visible { border-radius:4px … }` compiles, in Tailwind's output, to `@layer theme, base, components, utilities;` … `@layer utilities { .rounded-xl … .focus\:border-… }` **followed by the unlayered rules** — and unlayered rules beat every layer regardless of specificity. Placing the same rules in `@layer components` / `@layer base` compiles them **inside** the layers, beneath utilities. This **reproduces** the mechanism the forensic work reported and confirms the required architecture (spec R.2). It is a compile-level confirmation of cascade order, **not** a rendering test.

| Check | Finding |
|---|---|
| Tailwind v4 layers | Confirmed: `theme < base < components < utilities`; unlayered wins over all |
| `@layer components` for `.input-base` + variants | Correct: lets utilities (`rounded-xl`, `rounded-lg`, padding, `text-[13px]`) still compose |
| `@layer base` for global focus | Correct; and the `border-radius: 4px` must be dropped from it |
| Global `:focus-visible` today | **Unlayered** (`index.css:58`), therefore defeats utility radii on focus. **Inference (needs visual confirmation):** it likely also defeats the 124 `focus:outline-none` utilities, producing the gold 2px outline *in addition to* each field's ring |
| `!important` | Present **only** in the `prefers-reduced-motion` block (4 declarations per file) — not field CSS; the "no `!important` in field CSS" rule is currently satisfied |
| Unlayered CSS targeting fields | Tenant: only the `.input-base` rules and the global `:focus-visible`; the `-webkit-tap-highlight-color` rule lists `select`/checkbox/radio (harmless). Superadmin: `input, textarea, select { font-family: inherit }` (unlayered, harmless; move to `@layer base` at P0) |
| **New finding — `.type-body` (and every custom class) is unlayered** | `@layer` appears **nowhere** in either `index.css` **[V]**: every custom class (`.type-*`, `.btn-*`, `.card-*`, …) is unlayered. `.type-body` sets `color: var(--foreground)`, `font-size: 14px`, `font-weight: 500`, `line-height: 1.5`. Superadmin writes `input-base type-body …` on fields. Once `.input-base` is layered, `.type-body` will **override the foundation's `--field-text: #000000`** and any `text-[13px]` Compact utility. The same latent defect already makes the DS's documented "`.type-body` + `text-[13px]`" size variant ineffective (3 such usages **[V]**) |
| Resolution | Added to the specification as **R.2 rule 8**: fields do not carry `.type-body`/unlayered typography classes; the foundation and its tiers supply colour/size/weight/line-height. Layering all other custom classes is out of scope (**FU-10**) |
| Superadmin convergence | See 8.2; Superadmin's 23 `input-base` uses need a class-string cleanup (`type-body` removal) at P0 |

## 8.8 Mobile

**Not validated in a browser; analysis from code and the decided PAD-9.**

- **390px:** Contagem's row grid is `grid-cols-2` below `sm` with per-field labels shown (`sm:hidden` labels) — cells are roughly 170px wide. The "Ainda não contado" width problem is a **≥640px** condition (Qtd track 84px; ≈61px content width after `px-2.5` and borders — arithmetic, not measured). Below `sm` it is likely not width-starved (to be confirmed).
- **Field wrapping/clipping/grid integrity:** foundation owns no width/padding (spec F.3), so grid tracks should be unchanged; asserted by AC-7 (computed `gridTemplateColumns` before/after) and by the source-scan test that pins `rowGridClass` (`periodic-contagem-concept-b-compaction`).
- **Typography:** 13px minimum (PAD-9). At 390px, 13px inputs remain below 16px.
- **iOS zoom:** both `index.html` viewport metas are `width=device-width, initial-scale=1.0` (no `maximum-scale`) **[V]**, so iOS Safari's zoom-on-focus for sub-16px inputs is **existing behavior**. PAD-9 decided **not** to force 16px; it must be **validated at implementation testing**, especially dense Contagem.
- **Focus on touch:** the same `:focus` model applies; a 4px glow may clip inside dialogs with internal scroll (`max-h-[90vh]`) — AC-22.
- **Out of scope but adjacent:** Login fields ≈40px and tenant grid fields ≈37px versus the documented 44px target (FU-2).

## 8.9 Governance readiness

**1. Is the specification sufficiently defined?**
**Yes, for authorizing P0.** All 21 decisions are `DECIDED`; every decided value meets its stated requirement (spec H.0a). For P1–P5 it is defined to *direction and value* level, with the residual items below closed at each phase's own Rule 8 checkpoint.

**2. Does any unresolved architectural/product decision remain?**
**No PAD is unresolved.** Eight **residual items** (spec W.2) were found while reconciling; they are gaps in what the decided PADs specified, not open PADs:

| Item | Needed from | Needed by |
|---|---|---|
| R-1 `#B91C1C` scope (field-only vs global `--error`) | Product Architect — one-line ratification | **Before P0 sign-off** |
| R-6 Disabled/locked token **values** | Product Architect — one-line ratification | **Before P0 sign-off** |
| R-4 Compact-tier membership list | Product Architect confirmation | Before P1 |
| R-5 Contagem placeholder replacement + "Não contado" chip contrast (3.07:1) | P1 checkpoint (Product Architect input) | P1 |
| R-7 Light-surface `blue-400`/`rose-400` values | P2/P3 checkpoint | P2/P3 |
| R-2 Identity Search resting border | Product Architect | P3 |
| R-3 Login dark-variant resting values | Product Architect | P3 |
| R-8 Native-control concrete values | P3 checkpoint | P3 |

**3. Phases requiring additional Rule 8 checkpoints:** **all of P0–P5** (PAD-19). Specific must-verify items:

| Phase | Checkpoint must establish |
|---|---|
| P0 Foundation | Shared-stylesheet mechanism vs sync-test fallback and NFR-1 built-output scan; layering move; global-focus scope; `type-body` removal from Superadmin fields; typecheck/build baseline re-run; `DESIGN_SYSTEM.md` v2.1 update sequenced first |
| P1 Contagem + Initial Stock | Method-controlled census; R-5; Compact list (R-4); measured 390px/≥1280px grid integrity; source-scan tests still green; focus ring not clipped |
| P2 Remaining families | AST-based field census; family-by-family visual diff; R-7 |
| P3 Variants | Login (dark values, autofill), Identity (R-2), Timeline wrapper, native controls (R-8) |
| P4 Semantics | `Field` wrapper design (no added layout box), id generation, dense-grid header-id scheme, `aria-invalid` wiring to existing validation |
| P5 Guardrail | Conformance-check mechanism and exception register |

**4. Can Implementation Authorization now be requested?**
**Yes — for P0 (Foundation) only, and only after the Product Architect ratifies R-1 and R-6.** Authorization for P1–P5 **cannot** be requested from this assessment; each needs its own Rule 8 checkpoint and signature. A single blanket authorization for the program would contradict PAD-19 and Governance Standard §2 (Stage 8: "exactly the scope the Rule 8 Assessment defined — nothing broader").

**Rule 8 conclusion: ASSESSED — READY to request Implementation Authorization for P0 (conditional on R-1/R-6 ratification). Program-wide authorization: NOT requestable. Implementation: NOT AUTHORIZED.**

---

## 9. Changes this assessment caused to the specification (r2)

- Added **R.2 rule 8** (fields must not carry unlayered typography classes) and **FU-10** (all custom classes are unlayered).
- Added **FU-9** and **R-5** (the existing "Não contado" chip is 3.07:1).
- Recorded the raw-count/forensic-count discrepancy (C, 8.6 here).
- Corrected a dangling cross-reference (the "Section 16-equivalent" note now points to H.15).

## 10. What this document does not do

It does not authorize Stage 9 for any phase, does not modify any source/CSS/component/Firestore file, does not approve any residual item, and does not claim any screen has been validated.
