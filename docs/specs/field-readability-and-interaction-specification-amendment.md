# SABUSH BPT — System-Wide Field Readability & Interaction
## Specification Amendment (Pre-Implementation)

**Repository:** `mascenisabush-hub/sabush-bpt` @ `0394235` (working tree clean at time of writing)
**Type:** Specification amendment (Governance Standard Stage 2). Not an architecture decision, not a Rule 8 Assessment, not an Implementation Authorization.
**Lifecycle state:** **Revision 3 — Product Architect decisions recorded (PAD-1 … PAD-21 = `DECIDED`; R-1 and R-6 = `RATIFIED`; see Section W).** Assessed by the companion Rule 8 Assessment. **NOT Authorized** — recording decisions and assessing readiness are not Implementation Authorization (Governance Standard §3).
**Revision history:** r1 = proposed amendment with PADs open. r2 = this revision: PADs recorded, values reconciled, residual items listed (W.2), design hierarchy added (H.0), `DESIGN_SYSTEM.md` update list added (H.15), dangling cross-reference fixed, R.2 rule 8 and FU-10 added from the Rule 8 layering finding. **r3 = R-1 and R-6 ratified by the Product Architect and recorded (H.7, H.9, W, W.2); the six remaining residual items are recorded as intentionally deferred to their phases; the P0 governance boundary is recorded (T.1); R.2 rule 3 is phased (found while drafting the P0 authorization request).**
**Companion:** `docs/engineering/field-readability-and-interaction-rule8-assessment.md`
**Mode:** Governance/specification only. No application source, React component, CSS implementation, Firestore, business-logic, calculation or authentication file is modified by this revision.

### Evidence provenance (how to read every claim below)

The forensic investigation reports themselves are **not in the repository**. The quantitative findings were supplied in the specification brief. This amendment uses tags so the reader can tell what is what:

| Tag | Meaning |
|---|---|
| **[F]** | Preserved from the completed forensic investigation as supplied in the brief. Not re-derived in this session. |
| **[V]** | Independently re-verified against the repository in this session (file and line cited). |
| **[C]** | Computed in this session (WCAG 2.x relative-luminance contrast ratios). Reproducible from the hex values. |
| **[P]** | Proposed by this amendment. Not an approved decision. |
| **[PAD-n]** | Product Architect decision. **All are `DECIDED`** in r2 (Section W). Residual details not covered by any PAD are listed as **R-n** in W.2. |

Where the brief and the repository agree, both tags are shown. Where they could not be reconciled, this is stated explicitly.

---

## A. Purpose

To convert the forensic findings into an implementation-ready specification for a **single, centrally governed field presentation architecture** covering every input, select, and textarea in the tenant application and Superadmin, with a small, closed set of documented variants. Its output is the basis for a subsequent Rule 8 Assessment and, if approved, an Implementation Authorization.

## B. Problem Statement

The defect is **not** "Contagem needs a different background." The defect is that Sabush BPT has no field architecture:

1. **No shared tenant field primitive.** `.input-base` exists in `apps/tenant/src/index.css:421` but has 0 tenant uses **[F]**; its only consumers are Superadmin pages **[V]**. Every tenant screen hand-writes its own Tailwind string (34 distinct non-checkbox signatures **[F]**).
2. **Fields do not meet contrast minimums.** The default border (`#E5E7EB`) is 1.18:1 against the real page background `#FBF9F4` **[C, V: `App.tsx:113`]**. Placeholders (`gray-400`) are 2.54:1 **[C]**. The Option C treatment introduced for Contagem improves visibility but still does not reach WCAG thresholds (Section I).
3. **The system has diverged.** Contagem's `fieldClass` (`PeriodicStockCountView.tsx:6794–6802`) carries the Option C treatment; Initial Stock Count's `fieldClass` (`InitialStockCountView.tsx:1749–1751`) still carries the old one, although Contagem's own comment says the two are "identical … so the two counting screens read as one consistent system" **[V]**. That comment is now false.
4. **Documentation has drifted from implementation.** `--border` and `--border-strong` are both `#E5E7EB` **[V]**; the design system's gold-text guidance includes a failing value **[C]**; the global focus rule interacts unintentionally with Tailwind layering **[V]**.
5. **Accessibility semantics are missing** at the field level (labels, names, errors, invalid state) **[F, V: 0 `aria-invalid`/`aria-describedby` in tenant source]**.

## C. Evidence Summary

**Preserved from the forensic investigation [F]:** 187 text-like fields (145 inputs, 33 selects, 9 textareas); 11 native controls (7 checkboxes, 1 range, 3 file inputs); 34 non-checkbox field style signatures; a layered `.input-base` conversion tested against all 187 fields produced 186/187 layout-identical results, the exception being the borderless inline Timeline field; Login requires a dark-surface variant; semantic focus colors exist (gold, rose, blue, amber); Option C fields change border width on focus (layout shift), the layered canonical behavior does not; placeholder contrast is insufficient in every examined family; only 4 of 159 labels use `htmlFor`; 94 fields have a placeholder as their only possible accessible name; Initial Stock Count and Contagem have diverged.

**Re-verified in this session [V]:**

| Fact | Location |
|---|---|
| `.input-base` is an **unlayered** rule (border, radius 10px, white bg, focus gold border + `0 0 0 2px rgba(212,175,55,.2)`) | `apps/tenant/src/index.css:421–431` |
| Superadmin carries a **byte-equivalent second copy** of `.input-base`, deliberately not imported | `apps/superadmin/src/index.css:231–238`; rationale in header comment lines 3–13 (NFR-1 bundle isolation) |
| Global unlayered `:focus-visible { outline: 2px solid gold; outline-offset: 2px; border-radius: 4px }` — an unlayered rule beats every Tailwind layer, so any focused element (including a `rounded-xl` input) is forced to 4px radius | `apps/tenant/src/index.css:58–62` |
| `--border` = `--border-strong` = `#E5E7EB`; `--border-strong` is **not referenced by any component** (defined only) | tenant `index.css:112–113`; superadmin `index.css:54`; repo-wide grep |
| Real page background is `#FBF9F4`, not the documented `--background: #FFFFFF` | `App.tsx:113` |
| Contagem field: `bg-[#E4E8ED] border-[1.5px] border-[#9AA6B5] placeholder-[#7C8695]`, focus `border-[2px]` (**1.5px → 2px: layout shift**), `focus:bg-[#F6EFD9]`, ring 3px gold/30 | `PeriodicStockCountView.tsx:6800–6802` |
| Initial Stock Count field: `bg-white border border-[#E5E7EB] placeholder-gray-400`, ring-2 gold/20 | `InitialStockCountView.tsx:1749–1751` |
| Contagem blank-state placeholder is `"Ainda não contado"` at 13px, with `placeholder:text-amber-500/70` when blank; confirmed rows use `disabled` + `opacity-60` | `PeriodicStockCountView.tsx:7952` (and 8594), 7958 |
| Contagem active-workspace row grid: `minmax(0,2fr)_84px_76px_112px_190px`; the Qtd track is **84px** | `PeriodicStockCountView.tsx:6818` |
| Login fields: `bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-400`, on page `#00020F` | `AuthView.tsx:368, 544–546` |
| Timeline search: borderless `<input>` (`bg-transparent border-none outline-none`) inside a bordered wrapper (`border-gray-200`) | `BusinessTimelineView.tsx:166–173` |
| Identity-search fields: `border-amber-200 … focus:border-amber-400 focus:ring-amber-200`, `rounded-lg`, `py-1.5` | `AddStockView.tsx:4798`, `PeriodicStockCountView.tsx:8352` |
| The 3 file inputs are `className="hidden"` (invisible; triggered by buttons) | `AddStockView.tsx:3453, 3471`; `Header.tsx:370` |
| The range input uses `accent-[#D4AF37]` | `AvatarCropModal.tsx:181–187` |
| `readOnly` is used **0 times** in tenant source | repo grep |
| `aria-invalid` / `aria-describedby`: **0** uses in tenant source | repo grep |
| Documented form values: `.type-body` 500 / **14px** | `DESIGN_SYSTEM.md:212` |
| Documented gold-text guidance: "`#B8952F`/`#8A6D1F` range" | `DESIGN_SYSTEM.md:125–128` |

**Not reconciled (r2, re-counted at Rule 8):** a plain source grep at HEAD `0394235` gives, for tenant: 149 `<input`, 29 `<select`, 3 `<textarea`, 154 `<label`, 5 `htmlFor`; for Superadmin: 11 / 6 / 6. These do **not** match the forensic totals (187 text-like + 11 native; 159 labels; 4 `htmlFor`) and the method difference (raw text match vs. the forensic method) is not established. The forensic figures are preserved as **[F]**; a method-controlled re-census is a P0/P1 Rule 8 checkpoint obligation before P2 (see the assessment §8.6).

**Not measured in this session:** rendered pixel widths (e.g. the Contagem placeholder), the 34-signature census, and the 186/187 layout-identity result. These are preserved from **[F]** and must be re-established at Rule 8 against the then-current tree.

## D. Scope

In scope, system-wide: field surface, boundary, text, placeholder, typography, focus, disabled/locked, error-state foundation, variants, native-control treatment, label/name/error/helper association, CSS layering, design-system documentation corrections directly implicated, and the anti-divergence rule.

## E. Out of Scope

Listed as **follow-up findings**, deliberately not bundled:

| ID | Finding | Why separate |
|---|---|---|
| FU-1 | General button redesign | Different component family |
| FU-2 | Touch-target corrections beyond fields. Login fields are ~40px tall (`py-2.5` + `text-xs` line box + border) versus the documented 44px minimum **[C-approx, needs measurement]**; tenant grid fields are ~37px | Governed by `DESIGN_SYSTEM.md` Mobile rules; needs its own assessment. Field **height** is touched here only if PAD-9 says so |
| FU-3 | Clickable table-row accessibility | Not a field |
| FU-4 | Small-text cleanup outside fields | Not a field |
| FU-5 | Full accessibility audit | This amendment specifies only field semantics |
| FU-6 | Badge/Notification text on `--gold-soft` using `#8A6D1F` measures 4.26:1 (fails 4.5) — `DESIGN_SYSTEM.md:502` prescribes exactly this pairing **[C]** | Same root rule as PAD-8, but the affected components are not fields |
| FU-7 | Checked-state contrast for non-field gold fills | Only native controls are in scope (Section G6) |
| FU-8 | Visual redesign, new identity, workflow change | Prohibited |
| FU-9 | The existing Contagem row cue "Não contado" (value-cell badge) is `amber-600` on `amber-50` = 3.07:1 at 13px **[C]** (`PeriodicStockCountView.tsx:8112–8115`). PAD-11 relies on this cue; its remediation is item R-5, decided at the P1 checkpoint | Badge, not a field |
| FU-10 | All custom classes in both `index.css` files (`.type-*`, `.btn-*`, `.card-*`, `.badge-*`, `.table-clean`, …) are unlayered, so they defeat Tailwind utilities (e.g. `.type-body` + `text-[13px]`, which the DS documents as a size variant, cannot take effect). Latent, system-wide; not a field issue | Broader than fields; needs its own assessment |

---

## F. Canonical Field Architecture

### F.1 Principle

> **One field foundation, a closed set of variants, native controls governed separately. Layout belongs to utilities; appearance and state belong to the foundation.**

### F.2 What the foundation owns

For `input` (text-like types), `select`, and `textarea`:

| Concern | Owned by | Notes |
|---|---|---|
| Field surface (background) | Foundation | Token-driven (Section H) |
| Boundary (border color, resting width) | Foundation | Width is **constant** across all states |
| Text color | Foundation | |
| Placeholder color | Foundation | |
| Default radius | Foundation, **as a low-priority default** | Utilities such as `rounded-xl`/`rounded-lg` must still win (Section R). This is what makes the conversion layout-neutral for 186/187 fields **[F]** |
| Default font family / weight / line-height | Foundation | Size is tiered (Section J) |
| Focus indication | Foundation | One model (Section K) |
| Disabled / locked appearance | Foundation | One model (Section M) |
| Invalid appearance | Foundation, driven by `aria-invalid="true"` | Section N |
| Transition | Foundation | Explicit property list, not `all` |

### F.3 What the foundation does **not** own

Width, padding, margin, height, grid placement, `font-mono`/tabular choice, per-screen icon padding (e.g. Login's `pl-9`). These remain utilities on the element. This boundary is the reason 186/187 fields convert without layout change **[F]** and must be preserved.

### F.4 Names — PAD-13 **DECIDED**

The foundation retains the existing class name **`.input-base`** (already documented in `DESIGN_SYSTEM.md` and used by Superadmin) and is **not** renamed `.field`. Variants are modifier classes on the same element (`input-base input-base--dark`). Rationale: zero churn for Superadmin's existing usage; no second name for the same job.

### F.5 Field component vs class-only — PAD-18 **DECIDED**

The absence of a shared tenant `Field`/`Input`/`Select` component **[F]** is why divergence happened. Two independent needs exist:

- **Appearance** needs only the class foundation (no new component).
- **Semantics** (label association, error/helper `id` wiring, `aria-invalid`) needs unique ids per field. Doing this by hand at 187 call sites reproduces the divergence problem in a different dimension.

**Decided position:** Appearance is class-only (`.input-base`). A lightweight `Field` wrapper **may** be introduced for semantics/accessibility (label association, `useId`-generated ids, helper/error wiring) **in the semantics phase (P4)**, and is **not** responsible for visual architecture. It must not be forced around every field immediately, because the DOM/layout regression risk is highest there. Appearance migration (P0–P3) does not depend on it.

## G. Field Variants

Six variants were requested for evaluation. Evidence supports the following. **No variant beyond these is proposed.**

| # | Variant | Verdict | Evidence / reason |
|---|---|---|---|
| G1 | **Standard** | Required | Every tenant screen on `#FBF9F4`/white surfaces |
| G2 | **Dark (Login)** | Required | Login is dark (`#00020F`); light tokens are unusable there **[V]** |
| G3 | **Error** | Required — but as a **state**, not a permanent look: applied via `aria-invalid="true"`, so appearance and semantics cannot drift apart | No `aria-invalid` exists today **[V]**; DS already specifies error styling (`DESIGN_SYSTEM.md` Forms) but no field implements it **[F]** |
| G4 | **Identity Search** | Required as a documented variant | Amber-bordered fields exist in ≥2 screens **[V]**. Existing amber values fail non-text contrast (Section I) |
| G5 | **Borderless Inline** | Required — PAD-15 **DECIDED**: documented exception with wrapper-owned focus (see G5 below) | The 1 of 187 non-layout-identical field **[F]** |
| G6 | **Native controls** | Governed separately — PAD-17 **DECIDED**: own canonical family, **not** through `.input-base` | Checkbox, range are visible; file inputs are `hidden` and therefore have **no field appearance to govern** **[V]** |

### G5 — Borderless Inline

The Timeline input has no border of its own; its **wrapper** is the visible component. The foundation must not be applied to the inner `<input>` (it would add a second border inside the wrapper). Instead:

- The **wrapper** carries the boundary. Its resting border must meet the same non-text contrast requirement as a standard field (its current `border-gray-200` ≈ 1.24:1 does not) **[C]**.
- The wrapper shows the standard focus indication via `:focus-within`.
- The inner input keeps `outline: none` **only because** the wrapper provides the indicator. This is the *only* sanctioned suppression of a field's own focus outline (Section S).

**Decided (PAD-15):** the Timeline field stays a borderless inline exception; it is **not** converted to a bordered field.

### G6 — Native controls

| Control | Treatment | Notes |
|---|---|---|
| Checkbox (7) | Unchecked outline uses the strong field border (≥3:1). Checked uses gold fill per `DESIGN_SYSTEM.md` with a boundary that reaches 3:1 | Checked gold fill is 2.0:1 against page **[C]**; the fill alone does not identify the control. Concrete rules: R-8 |
| Range (1) | `accent-color` is currently raw gold (2.0:1 track/thumb vs page) **[C]** | Single instance (`AvatarCropModal`); R-8 |
| File (3) | **No visual specification.** They are `hidden`; the visible trigger is a button governed by the button system | Confirmed **[V]** |

---

## H. Color & Token Specification *(values DECIDED by the Product Architect unless tagged [Proposed])*

Every value below is evaluated against both `#FFFFFF` and the real page surface `#FBF9F4`. "**Decided**" means recorded in the PAD Decision Register (Section W). Contrast figures are **[C]**.

### H.0 Design hierarchy (Product Architect decision, binding)

| Layer | Token | Value | Origin |
|---|---|---|---|
| Page | `--surface-page` | `#FBF9F4` | Existing shipped value (`App.tsx:113`); now documented (H.1) |
| Field surface | `--field-bg` | `#FFFFFF` | PAD-1 |
| **Actual entered value** | `--field-text` | **`#000000` (pure black)** | PAD-21 (additional explicit decision) |
| Placeholder | `--field-placeholder` | `#5F6B7A` | PAD-3 |
| Field boundary | `--field-border` (= `--border-strong`) | `#7C8695` | PAD-2 |
| Decorative hairline | `--border` | `#E5E7EB` (unchanged) | PAD-2 |
| Focus (accessible gold) | `--field-focus-border` | `#8A6D1F` | PAD-5 |
| Focus glow (decorative) | `--field-focus-ring` | `rgba(212,175,55,0.30)` derived from brand gold | PAD-5 |
| Brand / decorative gold | `--gold` | `#D4AF37` | Unchanged; fill/decoration only |
| Accessible gold text | `--gold-text` | `#8A6D1F` on white/page; `#7A5F17` on `--gold-soft` | PAD-8 |
| Error | `--field-error` | `#B91C1C` | PAD-6 (scope: R-1) |
| Amber semantic focus | `--field-focus-amber` | `#B45309` | PAD-7 |

> **Brand color vs accessible interface color is an intentional distinction.** `#D4AF37` is a brand/fill/decorative color. It is never used as a thin border, as focus border, or as text. `#8A6D1F` / `#7A5F17` are the accessible counterparts used wherever gold must carry information.

### H.0a Verification of the decided values **[C]**

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| `#000000` on `#FFFFFF` (entered value) | 21.00 | ≥ 4.5 | Pass |
| `#5F6B7A` on `#FFFFFF` (placeholder; field stays white on focus, so no other fill applies) | 5.43 | ≥ 4.5 | Pass |
| `#7C8695` vs `#FFFFFF` (boundary) | 3.68 | ≥ 3 | Pass |
| `#7C8695` vs `#FBF9F4` (boundary vs page) | 3.50 | ≥ 3 | Pass |
| `#8A6D1F` vs `#FFFFFF` (focus border) | 4.90 | ≥ 3 | Pass |
| `#8A6D1F` vs `#FBF9F4` | 4.65 | ≥ 3 | Pass |
| `#8A6D1F` vs Login field (≈`#0D1425`) | 3.75 | ≥ 3 | Pass *(approximate fill; measure at Rule 8)* |
| `#8A6D1F` vs Login page `#00020F` | 4.22 | ≥ 3 | Pass |
| `#B91C1C` on `#FFFFFF` / `#FBF9F4` (error text and border) | 6.47 / 6.15 | text ≥ 4.5; border ≥ 3 | Pass |
| `#B45309` on `#FFFFFF` / `#FBF9F4` (amber focus) | 5.02 / 4.77 | ≥ 3 | Pass |
| `#7A5F17` on `#F6EFD9` (gold text on gold-soft) | 5.25 | ≥ 4.5 | Pass |
| `#8A6D1F` on `#F6EFD9` | 4.26 | ≥ 4.5 | **Fails — must not be used for text on gold-soft** |
| `#D4AF37` vs white / page (brand gold as thin border or text) | 2.10 / 2.00 | ≥ 3 / 4.5 | **Fails — decorative only** |
| `#000000` vs `#5F6B7A` (value vs placeholder separation) | 3.87 | informational | Values remain clearly primary over placeholders |

Every decided value meets its requirement. Two approved values are pairings to watch, not defects: `#8A6D1F` is not valid as text on gold-soft (PAD-8 already routes that case to `#7A5F17`), and the Login focus ratio depends on the composite fill.

### H.1 Page background
`#FBF9F4`, registered as the documented `--surface-page`. `DESIGN_SYSTEM.md` currently documents `--background: #FFFFFF` as the base surface, while the shipped page surface is `#FBF9F4`. *Documentation-only; no rendering change.* Supersedes: the documentation claim. Risk: none. **Decided (PAD-1 confirms the page stays `#FBF9F4`).**

### H.2 Field background — PAD-1 **DECIDED**
`#FFFFFF`. Role: field surface. Retires Option C's `#E4E8ED` tint (Contagem). Contrast requirement: none for the fill itself (1.05 vs page); the **border** carries the boundary. Affected: Contagem, all tenant fields. Risk: Low (Contagem loses its tint; Initial Stock is already white).

### H.3 Standard border — PAD-2 **DECIDED**
`#7C8695`. Role: canonical field boundary. Requirement ≥ 3:1 vs `#FFFFFF` and `#FBF9F4` (WCAG 1.4.11): **3.68 / 3.50, pass**. Supersedes: `#E5E7EB` on fields and Option C `#9AA6B5` (2.47/2.35, fails). Affected: every `.input-base` field. Risk: fields become more prominent everywhere; re-inspect dense Contagem grid at 390 and ≥1280 (Rule 8.6/8.8). Resting border width remains **1px in every state**.

### H.4 `--border` vs `--border-strong` — PAD-2 **DECIDED**
- `--border` **stays `#E5E7EB`**, redefined in documentation as the decorative hairline (table rules, card edges).
- `--border-strong` becomes **`#7C8695`**, the component-boundary token. `--field-border` aliases it.
- `--border-strong` has **no consumers** today **[V]**; changing its value changes nothing until fields adopt it. Applies identically to both apps.

### H.5 Entered-value text — PAD-21 **DECIDED**
`--field-text: #000000` (21.00:1 on white). Field-scoped. It does **not** change `--foreground` (`#111827`), `.type-body`, or any non-field text. Because the foundation sets the field's `color`, `.type-body`'s `color: var(--foreground)` must **not** be applied to field elements (it would fight the foundation); fields take the foundation for color and the type tier (Section J) for size/weight/line-height. Supersedes: `#111827` on fields. Risk: Low; pure black is a stronger value on white and also applies to `<select>` value text.

### H.6 Placeholder — PAD-3 **DECIDED**
`--field-placeholder: #5F6B7A` (5.43:1 on white). With PAD-4 (no focus-fill change) the placeholder is always on white, so one value covers every state. Supersedes: `gray-400 #9CA3AF` (2.54), Option C `#7C8695` (3.68 on white; 2.99 on its tint), Login `slate-500` on the Login field (3.86, fails), and Contagem's blank-state `amber-500/70` (≈1.75). Placeholder remains visually secondary to the value (`#000000`, 3.87 between them).

### H.6a Focus fill — PAD-4 **DECIDED**
**No background change on focus.** The field stays `#FFFFFF`. Retires Option C's `focus:bg-[#F6EFD9]`. Rationale: avoids visual movement and preserves dense-grid stability.

### H.7 Disabled / locked — PAD-16 **DECIDED**; values **R-6 RATIFIED**
Ratified by the Product Architect:

| Property | Value | Contrast **[C]** |
|---|---|---|
| Background `--field-disabled-bg` | `#F5F7FA` (existing `--muted`, already documented for disabled states) | — |
| Text `--field-disabled-text` | `#4B5563` | **7.04:1** on `#F5F7FA` (product floor 4.5:1 met) |
| Border `--field-disabled-border` | `#7C8695` (the same value as `--field-border`; alias) | 3.43:1 vs `#F5F7FA`; 3.50:1 vs page `#FBF9F4` (≥ 3:1 met) |
| Opacity | **None.** `opacity-50` / `opacity-60` are **not** to be used as the mechanism for disabled/locked readability | — |

The boundary therefore stays visible on a disabled field; the state is communicated by the muted fill, the `#4B5563` text and `cursor: not-allowed`. WCAG exempts inactive controls from contrast rules; the ≥ 4.5:1 text floor is a **product** rule. **Existing row-level confirmation/locked cues remain unchanged** (PAD-16). Supersedes: `opacity-60` / `opacity-50` on fields and the earlier proposal to use the decorative `--border` for disabled fields.

### H.8 Focus — PAD-5 **DECIDED**
- Focus border: **`#8A6D1F`** (4.90 / 4.65). **Not** `#D4AF37`.
- Same-color 1px outer stroke (`0 0 0 1px #8A6D1F`) so the perimeter reads as 2px **without any width change**.
- Decorative gold ring (`0 0 0 4px rgba(212,175,55,0.30)`). Decorative; never counted toward compliance.
- Constant border dimensions; forced-colors fallback `outline: 2px solid transparent` (Section K).
Supersedes: `#D4AF37` as sole indicator, Option C's `border-[2px]` and `ring-[3px]`. Affected: 111 tenant fields currently using `focus:border-[#D4AF37]` **[V, grep]** plus all others. Risk: low visual change (gold → darker gold); layout risk removed.

### H.9 Error — PAD-6 **DECIDED** (scope note R-1)
`--field-error: #B91C1C` for error text and error border (6.47 / 6.15). No new validation rules. **R-1 RATIFIED:** `#B91C1C` applies to SABUSH BPT **field error states only**. The global `--error` token (`#DC2626`) is **not changed** by this program, so unrelated error presentation elsewhere in the product is unaffected. The two values intentionally coexist: `--field-error` (fields) and `--error` (everything else).

### H.10 Selected state
Native checkbox/radio/range: separate canonical family — PAD-17 (Section G6). Not passed through `.input-base`.

### H.11 Brand gold vs accessible gold — PAD-8 **DECIDED**

| Role | Value | Rule |
|---|---|---|
| Brand / fill / decorative (buttons, badges, icons, glow, selection) | `#D4AF37` | Never normal text; never a thin border or sole focus indicator |
| Gold hover fill | `#B8952F` (`--gold-hover`) | Fill/hover only. **Removed from text guidance** — 2.85:1 on white fails |
| Accessible gold text / focus (light surfaces) | `#8A6D1F` | 4.90 / 4.65; valid on white and `#FBF9F4` |
| Accessible gold text on gold-soft | `#7A5F17` | 5.25 on `#F6EFD9`; `#8A6D1F` measures 4.26 there and is not valid |

### H.12 Semantic focus colors — PAD-7 **DECIDED** (gaps R-2, R-7)

| Variant | Decided | Notes |
|---|---|---|
| Amber (identity/warning) focus | **`#B45309`** | 5.02 / 4.77 |
| Blue | Remains an **accessible blue** where blue is semantically meaningful. Requirement: ≥ 3:1 vs adjacent surface. Currently 6 uses on the Login dark surface (`blue-400`, 5.9:1 — valid there) and **1 on a light surface** (`AddStockView.tsx:4698`, `blue-400` = 2.54:1 — below the requirement) **[V,C]** | Only the failing light-surface instance needs a darker blue (anchor: `blue-600 #2563EB` = 5.17 white); blue is **not** homogenized. R-7 |
| Rose (danger) focus | Retained; 7 uses of `rose-500` (3.67:1 — passes as a border) and 1 use of `rose-400` (2.69:1 — below the requirement) **[V,C]** | Use `rose-500` minimum; as text use `#B91C1C`. Not homogenized |
| Login | May use accessible gold `#8A6D1F` (3.75 vs field, 4.22 vs page) | Permissive: blue-400 remains valid on the dark surface. Choice recorded at P3 |
| Identity Search **resting** border | **Not decided.** `amber-200` (1.25:1) fails 3:1 | **R-2** |

Semantic colors are preserved where they carry meaning and changed only where they fail the stated ≥3:1 requirement.

### H.13 Dark (Login) tokens — focus **DECIDED**; resting values **[Proposed — R-3]**
Text white (≈15:1). Focus per H.12. The approved PAD-2/PAD-3 values are for light surfaces. For the dark variant, resting placeholder and border remain **proposals**: placeholder `#94A3B8` (7.16), border `#64748B` (3.86). Login field fill is a computed composite (≈`#0D1425`) and must be measured at Rule 8.

### H.14 Token changes summary (for Rule 8)
Redefined: `--border-strong`. Documented: `--surface-page`. **Not changed: `--error`, `--foreground`, `--border`, `--gold`.** New (aliases to existing tokens wherever they suffice): `--field-bg`, `--field-text`, `--field-placeholder`, `--field-border`, `--field-focus-border`, `--field-focus-ring`, `--field-focus-amber` *(P3 consumer)*, `--field-error`, `--field-disabled-bg`, `--field-disabled-text`, `--field-disabled-border`, `--gold-text` *(documentation-level in P0)*; Login-scoped dark equivalents. Retired from field class strings: `#E4E8ED`, `#9AA6B5`, `#7C8695` (as placeholder), `gray-400` placeholders, `amber-500/70` placeholder, `#E5E7EB` as field border, raw `#D4AF37` as focus border, `opacity-60`/`opacity-50` on fields.

### H.15 Required `DESIGN_SYSTEM.md` updates (closes the original brief §16 requirement)

| Area | Update |
|---|---|
| Color system table | Add `--surface-page`; redefine `--border`(decorative) vs `--border-strong`(field boundary); add `--field-*` and `--gold-text` rows; state brand gold vs accessible gold |
| Contrast rule (lines ~123–128) | Replace "`#B8952F`/`#8A6D1F` range" with the PAD-8 table (H.11) |
| Forms & inputs | Replace base treatment with the H.0 hierarchy; focus model (K); error uses `--field-error`; disabled model (M); native controls family |
| Typography | Field tiers (J); `.type-body` colour note for fields; helper/error minimum sizes |
| Notifications badge text (line ~502) | Flag that `#8A6D1F` on gold-soft fails; use `#7A5F17` (follow-up FU-6) |
| New: Field variants & Exception register | G and S.3 |
| New: CSS layering note | Section R |
| Version | Bump to v2.1 with a change log entry |

---

## I. Contrast Requirements

| Element | Class | Requirement | Basis | Status today |
|---|---|---|---|---|
| Field value text | Text | ≥ 4.5:1 vs field fill | WCAG 1.4.3 | Passes (17.7) |
| **Placeholder text** | Text | ≥ 4.5:1 vs field fill, in **all visible states** | 1.4.3 (placeholder is text) | **Fails** everywhere examined **[C]** |
| Field label (`.type-label`, 10px) | Text | ≥ 4.5:1 | 1.4.3 | Verify at Rule 8 (`gray-400` labels were addressed by the UI Readability Amendment) |
| Helper text | Text | ≥ 4.5:1 | 1.4.3 | `--muted-foreground` on page = 4.59 — passes narrowly |
| Error text | Text | ≥ 4.5:1 | 1.4.3 | Proposed passes |
| **Field boundary** | Non-text | ≥ 3:1 vs adjacent surface, at rest | 1.4.11 | **Fails** (1.18) |
| **Focus indicator** | Non-text | ≥ 3:1 vs adjacent, and a perimeter of ≥2 CSS px | 1.4.11 / 2.4.7; the 2px rule is a **product** rule (2.4.13 is AAA) | **Fails** with gold-only (2.0) |
| Error border | Non-text | ≥ 3:1 | 1.4.11 | Passes (4.59) |
| Checkbox/radio boundary and checked mark | Non-text | ≥ 3:1 | 1.4.11 | **Fails** (unchecked `#E5E7EB` 1.18; gold fill 2.0) |
| Icons that convey meaning (e.g. a field's leading icon, validation glyph) | Non-text | ≥ 3:1 | 1.4.11 | Login icons `slate-500` 3.86 — passes; tenant search icon `gray-400` 2.54 — decorative unless it is the only cue |
| Disabled/locked value | Product rule | ≥ 4.5:1 (WCAG exempts) | Brief §12 | `opacity-60` — unpredictable |
| Decorative (card edges, table hairlines, ring glow, scrollbar) | Decorative | None | 1.4.11 exempts | n/a |

**Decided-value verification:** see H.0a — every Product Architect–decided value meets its requirement in this table.

**Method rule:** compliance is claimed only from computed ratios against the field's actual fill and the actual adjacent surface (white **and** `#FBF9F4`), never from a color "looking darker." The ratios in this document are the acceptance evidence for the values; Rule 8 must recompute against the final chosen values.

**Interpretive note (must be disclosed):** applying 1.4.11 to text-field borders is the conservative reading, because the border is the only cue identifying the control. Some auditors consider a field with a visible label adequately identified without it. This amendment adopts the conservative reading because the brief's core finding is boundary weakness, and because the product is used on shared devices by untrained staff (Architecture §1.4).

---

## J. Typography Specification

Family: **Inter** (`--font-sans`). **Fraunces is not permitted in fields** (existing DS rule: business name and hero KPI figures only).

| Element | Specification | Basis |
|---|---|---|
| Field value (Standard tier) — PAD-9 | Inter, 14px / weight 500 / line-height 1.5 (`.type-body` metrics) | `DESIGN_SYSTEM.md:212` |
| Field value (Compact tier) — PAD-9 | Inter, 13px / 500 / 1.5 | 13px is an existing ladder step and the financial-figure floor (DS Mobile rules) |
| Below 13px | **Not permitted** for field value text (PAD-9). Applies to Login (`text-xs` 12px) and every other 11–12px field | |
| Placeholder | Same size and family as the value; weight 400; color per H.6 | Prevents size jump on typing |
| Label — PAD-10 **DECIDED** | `.type-label` as documented (10px / 600 / uppercase / tracked), unchanged | Supporting metadata, not the entered value |
| Helper text | 12px minimum, `--muted-foreground` | New: DS specifies helper text as "small" without a size |
| Error text | 12px minimum, semibold not required, `--error`; replaces helper text in the same slot | `DESIGN_SYSTEM.md` Forms |
| Numeric entry — PAD-12 **DECIDED** | `font-mono` / tabular numerics are kept where they are an intentional existing exception (e.g. Contagem quantity). The foundation must not remove numeric alignment; it does not itself choose `font-mono` (layout/typography utility). Size/weight/line-height tiers still apply | Recorded as exception E7 (S.3) |

### J.1 Existing finding: fields below documented minimum

Many tenant fields use `text-[13px]`, `text-xs` (12px) or smaller **[F]**; Login uses `text-xs` **[V]**. Documented value size is 14px.

**Decided rule (PAD-9):** Standard field = 14px; Compact field = 13px; **no field text below 13px**. Compact use is confined to an explicit list of dense data-entry grids enumerated in `DESIGN_SYSTEM.md` (initial list: Contagem row grid, Initial Stock Count row grid, Add Stock row grid — membership to be confirmed, R-4). No other screen uses Compact without adding itself to the list with a reason.

**Mobile (PAD-9):** mobile fields are **not** automatically forced to 16px. Note the existing viewport meta is `width=device-width, initial-scale=1.0` with no `maximum-scale` **[V]**, so iOS Safari's zoom-on-focus for sub-16px inputs is **existing** behavior that this work neither introduces nor removes. Mobile behavior, especially dense Contagem, is **validated during Rule 8 implementation testing** (Rule 8.8).

### J.2 Size and layout note

Field **height/padding** are not owned by the foundation (F.3). If PAD-9 changes value size, padding must be re-verified per grid (Section U).

---

## K. Focus Specification

### K.1 One model

> **Focus is expressed by a border-color change plus an equal-thickness outer stroke and a decorative glow, using only `border-color` and `box-shadow`. Border width never changes.**

| Layer | Property | Purpose |
|---|---|---|
| Boundary | `border-color: var(--field-focus-border)` | Compliant indicator (≥3:1) |
| Thickness | `box-shadow: 0 0 0 1px var(--field-focus-border)` | Makes the perimeter read as 2px **without** changing layout (box-shadow is out of flow) |
| Glow | `0 0 0 4px var(--field-focus-ring)` (gold @30%) | Decorative; brand continuity with Option C |
| Forced-colors / high-contrast | `outline: 2px solid transparent` | `box-shadow` is removed in forced-colors mode; a transparent outline becomes a visible system-color outline. **This is required** so the indicator does not disappear |

### K.2 Requirements

1. No dimension change on focus. Border width is identical at rest and on focus. **This corrects Option C**, which goes `border-[1.5px]` → `border-[2px]` **[V]**.
2. Visible on keyboard, mouse and touch. Text fields use `:focus` (all input modes). Non-text controls follow the global rule.
3. Not dependent on browser default appearance.
4. Semantic variants change only `--field-focus-border` (and its ring), not the model.
5. The global `:focus-visible { border-radius: 4px }` must stop forcing a radius onto fields (Section R).
6. Timeline inline: `:focus-within` on the wrapper (G5).

### K.3 The shift, quantified

Contagem: 1.5px → 2px is 0.5px per side, so ~1px total on width and height of every focused field, inside a dense CSS grid where sub-pixel changes can re-wrap neighbors. **[F]** established that the canonical layered focus avoids this; K.1 is that behavior.

---

## L. Label & Accessibility Semantics

Scope: **only** what the field system needs.

| Requirement | Specification |
|---|---|
| **L1 Accessible name** | Every field has a programmatic name from **one** of: a `<label>` associated via `for`/`id` or by wrapping; `aria-labelledby` pointing to a visible label or column header; `aria-label` **only** where a visible label is provably not possible. A placeholder is **never** the sole name (brief §11) |
| **L2 Placeholder role** | Example value only (`DESIGN_SYSTEM.md` Forms: "never a placeholder standing in for a label"). This rule already exists in the DS; the code does not follow it (94 fields **[F]**) |
| **L3 Dense-grid rows** | Contagem/Initial Stock rows show per-field labels only on mobile (`sm:hidden`) and use column headers on desktop **[V]**. Where the desktop name is the column header, `aria-labelledby` to that header is the compliant pattern. **PAD-20 DECIDED:** the sanctioned dense-grid pattern is `aria-labelledby` combining the column header with row/product context; the compact visual grid is preserved; no large visible labels are added to every cell |
| **L4 Error association** | Error message element has an `id`; the field has `aria-describedby` referencing it; `aria-invalid="true"` is set while invalid. The error appearance (Section N) keys off `aria-invalid`, so semantics and looks cannot diverge |
| **L5 Helper association** | Helper text element has an `id`, referenced by `aria-describedby`. When both helper and error exist, only the error is shown (DS: error replaces help text) and `aria-describedby` points at the visible one |
| **L6 Required** | The DS asterisk (`*` in `--error` color) is visual only. Programmatic requirement uses `required` / `aria-required`. Asterisk is `aria-hidden` to avoid double announcement |
| **L7 Keyboard focus** | Visible per Section K; no keyboard trap; tab order unchanged (this amendment does not reorder DOM) |
| **L8 Unique ids** | Ids must be unique across simultaneously mounted forms (multi-row grids). Generated (e.g. `useId`), never hand-numbered |

**Not in scope:** live-region error announcements, form-level error summaries, focus management on submit, full WCAG audit (FU-5).

**Decision link:** L1/L4/L5/L8 are what the `Field` wrapper (PAD-18) would automate.

---

## M. Disabled / Read-Only Specification

Only states actually present are specified.

| State | Present in product? | Specification |
|---|---|---|
| **Disabled** | Yes (~103 occurrences of `disabled:opacity-*` / `opacity-60|50 cursor-not-allowed` patterns **[V, grep count]**) | One appearance (ratified R-6): background `#F5F7FA`, text `#4B5563`, border `#7C8695`, `cursor: not-allowed`, **no opacity** (H.7) |
| **Confirmed / locked** (Contagem, Initial Stock confirmed rows) | Yes; implemented via `disabled` + `opacity-60` **[V]** | Same appearance as Disabled. The *meaning* ("counted and confirmed") is carried by existing row UI, not by the field. **PAD-16 DECIDED:** keep the existing row-level confirmation/locked cue; no additional icon/ornament is required |
| **Unavailable** (disabled because a prerequisite is missing) | Plausibly yes (e.g. unit select before product resolves) — **not verified** | Same appearance as Disabled. Rule 8 must confirm whether it has any distinct requirement |
| **Read-only** | **No.** `readOnly` has 0 uses in tenant source **[V]** | **Not specified.** A token slot is reserved in documentation only, to be defined when a real use appears. Single-editor "viewer" behavior (Decision 44 refinement) should be checked at Rule 8 for whether it uses `disabled` |

**Why remove opacity:** `opacity: 0.6` multiplies text, fill and border together, so the effective contrast depends on whatever sits behind the field. Explicit disabled tokens make contrast **deterministic and testable**.

**Do not make disabled faint:** value text floor 4.5:1 (product rule, H.7).

---

## N. Error-State Specification

| Aspect | Specification |
|---|---|
| Trigger | `aria-invalid="true"` on the field (single source of truth) |
| Border | `--field-error` (`#B91C1C`, PAD-6), constant width |
| Focus while invalid | Border stays error color; ring uses error tint; same geometry as K.1 |
| Message | Directly below the field, `--field-error`, ≥12px, replaces helper text, wired by `aria-describedby` (L4) |
| Non-color cue | Message text is required (color alone is insufficient); an icon is optional and not mandated |
| Scope | This is the **foundation** only. No new validation rules and no change to when validation runs |

Existing rose/red danger contexts (delete-reason fields) remain **semantic focus variants** (H.12), not error state.

---

## O. Contagem Requirements

Contagem receives the shared foundation; its layout and behavior are preserved.

### O.1 Adoption

`fieldClass` (`PeriodicStockCountView.tsx:6800`) is replaced by the foundation plus Compact tier and Contagem-specific **layout** utilities only. Option C's `bg/border/placeholder/focus` colors are retired in favor of Section H tokens; Option C's dimensional behavior (`border-[2px]` on focus) is retired (Section K). Initial Stock Count adopts the **same** foundation in the same change, resolving the divergence — the anti-divergence rule (Section S) makes this a requirement rather than a courtesy.

### O.2 "Ainda não contado" — the blank-state problem

Facts **[V]**: placeholder `"Ainda não contado"` (17 characters), 13px, on a field with `font-mono tabular-nums`; blank state colors it `amber-500/70` (≈1.75:1 **[C]** — fails). The Qtd track is **84px**; after `px-2.5` (20px) and borders, content width is ~61px. The placeholder **cannot fit** on one line in that column, in either the default or monospace font; exact overflow must be **measured at Rule 8** (not measured here).

**Decided (PAD-11): option O-e.** The "not counted" *state meaning* moves outside the placeholder. Constraints recorded by the Product Architect: preserve the existing Contagem layout, grid and behavior; do **not** reduce text below the approved 13px minimum (options O-a/O-d rejected); do **not** widen the grid (O-c rejected); do not solve it by rewording the placeholder into a smaller cue as the primary mechanism (O-b not selected).

**Evidence relevant to implementing O-e [V]:** a row-level cue **already exists** — the Valor cell renders a "Não contado" chip when the row is blank (`PeriodicStockCountView.tsx:8112–8115`, second render ~8719). O-e can therefore rest on an existing element and does not require a new row state. Two details are **not** specified by PAD-11 and are carried as **R-5** to the P1 Rule 8 checkpoint: (1) what the Qtd placeholder becomes once "Ainda não contado" leaves it; (2) that existing chip is `amber-600` on `amber-50` = **3.07:1** at 13px **[C]** and would need remediation to serve as the primary cue (anchor: `#B45309` on `#FFFBEB` = 4.84:1). In every case the blank-state color leaves `amber-500/70`.

**Note (mobile, from the grid math):** the width problem exists at `sm` (≥640px), where the Qtd track is 84px. Below `sm` the grid is two columns and a cell is roughly 170px at 390px viewport, so the placeholder is not width-starved there (to be confirmed by measurement).

### O.3 Other Contagem requirements

- **Confirmed rows:** Disabled appearance per Section M; `opacity-60` removed; confirmed values remain readable.
- **Dense grid:** No change to grid templates, gaps, or `col-span-5` conventions. The foundation must not add padding or min-width to fields.
- **Responsive:** `grid-cols-2` mobile / five-track `sm:` layout unchanged.
- **Truncation:** Numeric values in Qtd must not clip at the longest realistic value; verified in acceptance (Section V).
- **Selects in the row** (unit selector) adopt the same foundation, including a visible chevron per DS.
- **No behavior change:** keyboard handling (`handleQuantityKeyDown`), `suppressEnterSubmit`, sanitizers, autosave, single-editor viewer mode — untouched.

---

## P. Login Requirements

- Login uses the shared foundation with the **Dark variant** (G2, H.13).
- Preserve: layout, icon-in-field positioning (`pl-9`), `rounded-xl`, authentication behavior, branding, flow.
- Radius and padding remain utilities (F.3), so `rounded-xl` and `py-2.5` survive.
- Value text moves from `text-xs` (12px) to **at least 13px** (PAD-9 minimum); the default tier is Standard 14px. Holding 12px on Login is **no longer permitted**. The exact tier (14 vs 13) and its effect on `py-2.5`/icon padding is measured at the P3 checkpoint.
- Focus may use accessible gold `#8A6D1F` (PAD-7); resting placeholder/border values on the dark surface are R-3.
- Browser **autofill** on the dark variant is a validation item (Rule 8.4): the repo has no autofill styling at HEAD, and browser autofill can override fill/text colors.
- **Separately identified (FU-2):** Login field height is roughly 40px, under the documented 44px touch target. This is outside the field-system scope and is not fixed here.
- Not in scope: Login redesign.

---

## Q. Superadmin Requirements

**Evidence [V]:** Superadmin uses `.input-base` (BusinessDirectory, SignIn, PaymentDetail, Operators, BusinessDetail, BusinessSearch, AuditTrail) but holds an **independent unlayered copy** of the CSS (identical values), and inherits the same weak border/placeholder defaults.

**Specification:**

1. **What becomes shared:** the field tokens (H.14), the `.input-base` foundation and its variants, the focus model (K), the state model (M, N), and the typography defaults.
2. **What remains Superadmin-specific:** its color theme where it already differs from tenant (its text palette uses `slate`), any dense operational layout utilities, and page-level styles. Superadmin's product functionality is unchanged.
3. **How Superadmin avoids a separate copy — PAD-14 principle DECIDED.** The Product Architect decided: **one shared canonical field foundation wherever the repository architecture permits it cleanly; no duplicate styling merely for historical reasons.** The current duplication is *deliberate* — the Superadmin header comment ties it to NFR-1 **[V]** — so the mechanism must be verified rather than assumed. Evidence bearing on feasibility **[V]**:
   - NFR-1's wording concerns **components/identifiers/`apps/tenant` references in the built output**, not CSS (`18-19-payment-operations-slice.md:204`; `18-superadmin-v1-…-slice.md:270`).
   - There is **precedent for a neutral shared module** consumed by both apps through an alias: `@sabush/shared-types` → `packages/shared-types/index.ts` (both `vite.config.ts`; "neither app imports the other's src/ directly").
   - Both apps already build with `@tailwindcss/vite` and `@import "tailwindcss"`.

   **Mechanism (to be confirmed at the P0 checkpoint, not here):** a neutral shared stylesheet outside both apps' `src/` (e.g. under `packages/`), imported by both `index.css` files, with a built-output scan proving no `apps/tenant` identifier enters the Superadmin bundle (the NFR-1 method). **Fallback if the scan or architecture objects:** keep two copies with an automated sync test so drift fails a check. Whether the clean shared option is available is a **P0 Rule 8 checkpoint finding**, not an open Product Architect decision.

---

## R. CSS Layering Architecture

### R.1 Facts **[V]**

- `@import "tailwindcss"` (v4) emits the layer order **theme → base → components → utilities**.
- `.input-base` and the global `:focus-visible` rule are **unlayered**. Unlayered CSS beats every layer regardless of specificity or source order. Consequences: `.input-base { border-radius: 10px }` beats `rounded-xl`/`rounded-lg`; `:focus-visible { border-radius: 4px }` beats them on focus.
- Result **[F]**: moving `.input-base` into the appropriate layer made 186/187 fields layout-identical.

### R.2 Required architecture

```
@layer theme, base, components, utilities;   (Tailwind-defined order; not redeclared unless required)

@layer base        →  tokens (:root), global focus-visible for NON-field elements
@layer components  →  .input-base foundation, then variants (dark, identity, inline wrapper), native-control rules
                      Order INSIDE the layer: foundation first, variants after
@layer utilities   →  Tailwind utilities (width, padding, radius, font-mono, grid…) — always able to override components
(unlayered)        →  NOTHING that styles fields
```

Rules:

1. **Foundation and variants live in `@layer components`.** Utilities may override radius, padding, font-size, etc. — this is the intended composability.
2. **No unlayered CSS may target field elements.** A CI-checkable rule.
3. **Global `:focus-visible`** **loses `border-radius: 4px`** (radius belongs to the element) and is excluded for `.input-base` fields, which define their own indicator inside the component layer (K.1, including the transparent-outline fallback). Non-field elements (buttons, links, checkbox) keep the existing global behavior. **Phasing (r3, found while drafting the P0 authorization request):** the rule remains **unlayered in P0** and moves to `@layer base` only after tenant field migration is complete (P2 close-out, enforced by P5). Reason: 124 tenant occurrences of `focus:outline-none` **[V]** are currently defeated by the unlayered global outline (cascade fact, reproduced in the assessment §8.7); layering the global rule early would let those utilities win and would **weaken the focus indication of every not-yet-migrated tenant field** (whose own indicator is a 2.1:1 gold border plus a 20% ring). Until then AC-15 is evaluated for `.input-base` and its variants only; after P2 it applies to all field elements.
4. **Variants override the foundation only through tokens** (custom properties), not by re-declaring properties, so a variant cannot silently change layout.
5. **`!important` is prohibited** in field CSS. (The existing `prefers-reduced-motion` block uses `!important` intentionally and is unaffected.)
6. **Do not use `@apply` to bake Tailwind utilities into the foundation** — layout utilities in the foundation would defeat F.3.
7. Both apps use the same structure (Q).
8. **Fields must not carry unlayered typography/colour classes.** *(Added in r2 from the Rule 8 finding, §8.7 of the assessment.)* Every custom class in both `index.css` files is unlayered **[V]** — including `.type-body` (`color: var(--foreground); font-weight: 500; font-size: 14px; line-height: 1.5`) and `.type-label`. An unlayered class beats a layered foundation and layered utilities alike. Superadmin currently writes `input-base type-body …` (23 `input-base` uses), so after the foundation moves to `@layer components`, `.type-body` would silently override `--field-text` (`#000000`) and any `text-[13px]` Compact utility. Therefore fields take their colour/size/weight/line-height from the foundation and its tiers (Section J), **not** from `.type-body`; the P0 checkpoint must remove `.type-body` from Superadmin field class strings (a class-string change only). Layering the existing `.type-*`/`.btn-*`/`.card-*` classes is a broader change that is **out of scope** here and is recorded as a follow-up (FU-10).

### R.3 Tradeoff that must be understood

Placing the foundation **below** utilities means a screen can still defeat it with a utility (`border-[#E5E7EB]`). That is the desired composability (radius, width) but also a leak path for color. The mitigation is governance (Section S) plus an automated conformance check (Section T, P5), not a stronger layer.

---

## S. Exception Policy

### S.1 Architectural rule

> **New tenant fields must use the canonical field foundation unless an approved variant or a documented exception exists. No screen may introduce another independent field signature without a recorded reason.**

### S.2 Enforcement

A tenant field element (`<input>` other than checkbox/radio/range/file/hidden, `<select>`, `<textarea>`) whose `className` does not include the foundation class is a violation unless it appears on the exception register. The check should be automated (Section T, P5) — a governance rule without a check is the situation that produced Contagem ≠ Initial Stock.

### S.3 Initial exception register

| # | Exception | Reason | Permitted deviation |
|---|---|---|---|
| E1 | Timeline borderless inline field | Wrapper is the visible component; foundation border would double-box | Inner input no border/outline; wrapper meets boundary + `:focus-within` (G5) |
| E2 | Login dark fields | Dark surface | Dark variant tokens (H.13) only |
| E3 | Native controls (checkbox, range) | Different rendering model | G6 rules only |
| E4 | Semantic focus colors | Danger/identity/warning contexts | `--field-focus-border` swap only, per H.12 |
| E5 | Compact 13px tier | Dense data-entry grids | Only on the enumerated screens (J.1) |
| E6 | Hidden file inputs | No visual appearance | None needed |
| E7 | Numeric `font-mono` / tabular treatment (e.g. Contagem quantity) | Dense numeric alignment (PAD-12) | Font-family utility only; size/weight/line-height tiers still apply |

### S.4 Adding an exception

Requires: (1) the reason; (2) proof no variant fits; (3) the deviation stated as *which tokens differ*, not new raw colors; (4) Product Architect approval; (5) entry in this register in `DESIGN_SYSTEM.md`. Raw hex values in a field `className` are not an acceptable exception mechanism.

---

## T. Migration Strategy

**Principle:** converge onto one foundation with the smallest reviewable steps; never patch screens individually. Use the forensic result (186/187 layout-identical) as the safety argument, and **re-establish it at Rule 8**.

| Phase | Content | Screens touched | Risk |
|---|---|---|---|
| **P0 — Foundations** | Layering fix (R.2): move `.input-base` into `@layer components`; scope global `:focus-visible` (drop 4px radius from fields); add/redefine tokens (H); apply identically in both apps. `DESIGN_SYSTEM.md` update (H.15) | Superadmin (uses `.input-base` today) — visible change limited to token values + layering; **tenant fields unaffected** until adopted | Low. Verifies R without touching tenant screens |
| **P1 — Counting screens together** | Contagem + Initial Stock Count adopt the foundation in **one** change (ends the divergence) | Two | Medium: dense grid, PAD-11 |
| **P2 — Family convergence** | Remaining tenant families adopt `.input-base`: Stock Entry, Expenses, Withdrawals, Owner Investment, Cash Flow, Settings, Dashboard search, Subscription, product/edit modals | Many | Medium, but mechanically similar; batch by family with visual diff per family |
| **P3 — Variants** | Error, Identity Search, Dark (Login), Inline wrapper, native controls | Login, identity fields, Timeline, checkboxes | Medium (Login) |
| **P4 — Semantics** | Label association, `aria-describedby`, `aria-invalid` wired to error state; the lightweight `Field` wrapper (PAD-18) may be introduced here, used for semantics only | All | Medium; **separable** from P0–P3 — appearance can ship first |
| **P5 — Guardrail** | Automated conformance check (S.2) | Repo | Low |

Order is fixed by PAD-19 (P0→P5). **Every phase requires its own Rule 8 scope and governance checkpoint; no phase is authorized by this document.** Superadmin convergence follows PAD-14 and is verified at the P0 checkpoint. Each phase should be its own Rule 8 scope and its own commits; **one commit per checkpoint** (Governance Standard §2a).

Anti-duplication: after P2, the 34 signatures should collapse to the foundation + variants + the enumerated exceptions. Any leftover raw `bg-/border-/placeholder-` color utilities on fields are findings.

### T.1 P0 governance boundary (recorded from the Product Architect's ratification)

**P0 is ONLY the canonical field foundation.** P0 **may** cover: field background, field boundary, field text, placeholder, typography foundation, the canonical focus model, disabled/locked foundation, the error field state, CSS layering foundation, `.input-base`, and removal of a conflicting `.type-body` usage from fields where the specification requires it.
P0 **must not** implement: Contagem migration; Initial Stock Count migration; broad tenant migration; the semantic `Field` wrapper; native-control migration; Timeline migration beyond foundation compatibility; the Login variant; the Identity Search variant; the final Contagem "Não contado" treatment; unrelated accessibility work; unrelated button/touch-target work.
**P0 is not authorized by this document.** See `docs/engineering/field-readability-p0-implementation-authorization-request.md` (a *request*, pending Product Architect signature).

---

## U. Regression Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| U1 | Layering change alters something that silently depended on unlayered precedence (Superadmin `.input-base`, the global focus radius) | Medium | P0 first, isolated; visual diff Superadmin; repo grep for `.input-base` |
| U2 | Stronger borders (3:1) make dense grids feel heavy or crowd | Medium | `#7C8695` decided (PAD-2); inspect Contagem at 390px and ≥1280px, 1.0× and 1.25× zoom |
| U3 | Field text 14px (from 12–13) breaks width-sensitive fields, esp. Login and the 84/76px tracks | Medium–High | Compact tier (PAD-9, J.1); measure at the relevant phase checkpoint |
| U4 | Placeholder no longer fits ("Ainda não contado") → truncated/misread | **Certain today at ≥`sm`** | O-e (PAD-11); details R-5 |
| U5 | `:focus` on text fields (not `:focus-visible`) shows the indicator on mouse focus | Low (matches current behavior of gold ring) | Accepted |
| U6 | Removing `opacity-60` changes how "locked" reads; users may perceive locked rows as editable | Medium | PAD-16 keeps the existing row cue; keep `cursor-not-allowed`; explicit tokens (R-6) |
| U7 | Forced-colors mode loses indicator | Low if K.1 fallback implemented | Acceptance test (V) |
| U8 | `Field` wrapper (PAD-18, P4 only) alters DOM structure/wrapping and breaks layout | Medium | Introduced only in P4 and only for semantics; must add no wrapper element styling |
| U9 | Superadmin/tenant token drift recurs | Medium | PAD-14 mechanism, verified at the P0 checkpoint |
| U10 | Selects: native appearance/chevron vary by browser; `appearance` rules could affect rendering | Medium | Test 33 selects; treat chevron per DS |
| U11 | Autofill styling (browser) can override field fill/text | Low–Medium | Verify on Login (password managers); flagged for the P3 checkpoint |
| U12 | Accidental change to behavior: className refactors touching handlers | Low | Section 21 protections; test suite (`tests/`) run per checkpoint |
| U13 | Placeholder/Timeline wrapper boundary change alters search-bar look | Low | PAD-15 |

**Data/logic safety (brief §21):** this amendment authorizes **no change** to form submission, validation logic, Firestore reads/writes, business calculations (Business Worth, stock value), Stock Entry, Contagem behavior, authentication, subscription logic, permissions, or routing. It is a visual/interaction change; any diff touching a handler, hook, state, or `firestore.rules` is out of scope and a stop condition.

---

## V. Acceptance Criteria

### V.1 Screens

**Desktop and mobile widths (≥ 390px and ≥ 1280px, plus the `sm:` breakpoint boundary at 640px), each screen:** Login · Stock Entry (Add Stock) · Contagem (Periodic Stock Count) · Initial Stock Count · Expenses · Withdrawals · Owner Investment · Cash Flow · Settings · Dashboard search · Subscription · Superadmin (Business Directory, Business Search, Payment Detail, Operators, Business Detail, Audit Trail).

### V.2 States (where applicable per field)

blank · populated · focus · disabled · locked/confirmed · error · selected (checkbox/select) · hover *(only where a hover style exists — none is introduced by this amendment)* · autofill (Login).

### V.3 Criteria

| ID | Criterion | Method |
|---|---|---|
| AC-1 | Placeholder ≥ 4.5:1 vs field fill in every visible state incl. focus | Compute from rendered computed styles |
| AC-2 | Field boundary ≥ 3:1 vs page and vs white | Computed |
| AC-3 | Focus indicator ≥ 3:1 vs adjacent; perimeter ≥ 2px | Computed + measured |
| AC-4 | **Zero layout shift on focus:** `getBoundingClientRect()` of the field and of its row neighbors is identical blurred vs focused | Automated measurement on Contagem, Initial Stock, Add Stock |
| AC-5 | No unintended radius change: computed `border-radius` equals the authored utility (e.g. `rounded-xl` = 12px, `rounded-lg` = 8px, `rounded-[10px]`) both blurred **and focused** | Computed, incl. focused |
| AC-6 | No clipping of values/borders; ring not clipped by `overflow:hidden` parents beyond current behavior | Visual + measured |
| AC-7 | Grid integrity: Contagem five-track and unified-list grids retain identical track sizes | Compare `getComputedStyle(grid).gridTemplateColumns` |
| AC-8 | No unexpected wrapping of labels/values; longest realistic quantity/currency fits | Visual + measured |
| AC-9 | Disabled/locked value ≥ 4.5:1 (product rule) and no `opacity` on fields | Computed |
| AC-10 | Every field has a programmatic name **not** derived solely from placeholder | Automated a11y query over the 187 fields |
| AC-11 | Invalid fields have `aria-invalid="true"` and `aria-describedby` → an existing element id | Automated |
| AC-12 | Forced-colors mode shows a focus outline | Manual (Windows high contrast / emulated) |
| AC-13 | Layout parity vs baseline: ≥ 186/187 fields layout-identical **(the one exception is the Timeline inline field, handled per G5)** | Re-run the forensic conversion method |
| AC-14 | Superadmin: no `apps/tenant` identifier in its production bundle | Built-output string scan (NFR-1) |
| AC-15 | Zero unlayered CSS rules targeting field elements | Static check |
| AC-16 | Conformance check: zero field elements outside foundation/exception register | Automated (P5) |
| AC-17 | Typecheck/build unchanged from baseline (the repo has known pre-existing type errors; **no new ones**) | `tsc` / `npm run build` |
| AC-18 | Existing tests pass unchanged; no test edited to make it pass | Test run |
| AC-19 | Behavior smoke: submit, validation, Contagem confirm/edit, login, subscription gating behave as before | Manual/automated regression per screen |

| AC-20 | Value/placeholder hierarchy: entered value renders `#000000`, placeholder `#5F6B7A`, boundary `#7C8695`, on `#FFFFFF` fields over `#FBF9F4` (computed styles) | Computed |
| AC-21 | Focus: computed border-width unchanged; border-color `#8A6D1F` (or approved semantic variant); no background-color change on focus | Computed |
| AC-22 | Mobile at 390px: Contagem/Initial Stock rows keep grid integrity, no clipping of the focus ring in scroll/`overflow-hidden` containers (dialogs), no unexpected wrapping | Visual + measured |

**Verification-environment caveat (from `HANDOFF.md`):** the last recorded session could not run the Firestore emulator (sandbox egress block). The field work touches no rules, but any acceptance step that requires a real browser must state honestly if it could not be run, never report it as passed.

---

## W. PAD Decision Register

Recorded from the Product Architect's review. **Status of every entry below = `DECIDED`.** ("Recorded by" means the decision text was transcribed from the Product Architect's instruction; nothing was chosen on the Product Architect's behalf.)

| PAD | Decision | Approved value / direction | Rationale (as stated by the Product Architect) | Status |
|---|---|---|---|---|
| PAD-1 | Field background | `#FFFFFF`; page stays `#FBF9F4` | Clear field/page separation without another surface color | **DECIDED** |
| PAD-2 | Field border | `#7C8695` canonical boundary; `--border #E5E7EB` retained for decorative hairlines; the two are distinct tokens | `#E5E7EB` too weak; `#7C8695` visible yet compatible with SABUSH design | **DECIDED** |
| PAD-3 | Placeholder | `#5F6B7A`; secondary to value; not `gray-400` | Secondary to values while meeting readability | **DECIDED** |
| PAD-4 | Focus background | No background change on focus; field stays white; focus via border/ring system | Avoid visual movement; preserve dense Contagem stability | **DECIDED** |
| PAD-5 | Focus border | `#8A6D1F`; not `#D4AF37` as a thin border; no width change; border-color change + subtle same-color shadow + decorative gold ring + constant dimensions + forced-colors fallback | Preserve gold identity with distinguishable interaction | **DECIDED** |
| PAD-6 | Error color | `#B91C1C` for error text/border where appropriate; no new validation rules | — | **DECIDED** *(scope ratified: R-1 — fields only; global `--error` unchanged)* |
| PAD-7 | Semantic focus colors | Amber `#B45309`; blue stays an accessible blue where semantically meaningful; Login may use `#8A6D1F`; no arbitrary replacement | Do not homogenize semantic color | **DECIDED** |
| PAD-8 | Gold text | Brand `#D4AF37` for brand/decorative/fill; `#8A6D1F` accessible gold text on light; `#7A5F17` on gold-soft; not `#D4AF37` as universal text; `#B8952F` not retained as text guidance | Separate brand gold from accessible gold | **DECIDED** |
| PAD-9 | Field typography | Standard 14px Inter 500 / lh 1.5; Compact 13px Inter 500 / lh 1.5; minimum 13px; nothing below; **not** auto-16px on mobile; mobile validated at Rule 8 implementation testing, esp. dense Contagem | Validate rather than assume | **DECIDED** |
| PAD-10 | Labels | Keep documented label treatment (10px / 600 / uppercase / tracked) | Supporting metadata; global change would disturb dense layouts | **DECIDED** |
| PAD-11 | "Ainda não contado" | Option **O-e**: move the not-counted meaning outside the placeholder; preserve Contagem layout, grid, behavior; do not shrink below minimum; do not widen the grid | Solve without typography/truncation/grid changes | **DECIDED** |
| PAD-12 | Numeric/tabular | Keep `font-mono`/tabular treatment where it is an intentional existing exception; foundation must not remove useful numeric alignment | Dense numeric presentation | **DECIDED** |
| PAD-13 | Class name | Retain `.input-base`; do not rename to `.field` | Already exists and used in Superadmin; avoid migration | **DECIDED** |
| PAD-14 | Tenant + Superadmin foundation | One shared canonical foundation wherever repository architecture permits it cleanly; no duplicate styling for historical reasons if it can be avoided without architectural damage | Prevent independent drift | **DECIDED** *(principle; mechanism per Section Q, verified at the P0 checkpoint)* |
| PAD-15 | Timeline | Borderless inline field is a documented exception; not converted to a bordered field; wrapper provides focus/`:focus-within` while preserving design | Preserve existing design | **DECIDED** |
| PAD-16 | Locked/confirmed rows | Keep the existing row-level confirmation/locked cue; remove opacity-based degradation from the field; explicit disabled/locked styling; no extra icon/ornament | Standardization only | **DECIDED** *(values ratified: R-6 — bg `#F5F7FA`, text `#4B5563`, border `#7C8695`, no opacity)* |
| PAD-17 | Native controls | Separate canonical family; **not** forced through `.input-base`; own accessible rules; file-input implementation stays as architected | Different rendering model | **DECIDED** |
| PAD-18 | `Field` wrapper | A lightweight `Field` wrapper **may** be introduced for semantics/accessibility, in the semantics phase; `.input-base` remains the visual foundation; wrapper not responsible for visual architecture | Avoid DOM/layout regression risk of wrapping every field immediately | **DECIDED** |
| PAD-19 | Migration order | P0 Foundation · P1 Contagem + Initial Stock Count · P2 remaining tenant families · P3 special variants · P4 semantic/accessibility wiring · P5 anti-divergence guardrail; each phase gets its own Rule 8 scope and governance checkpoint; **no phase is authorized by this document** | Controlled rollout | **DECIDED** |
| PAD-20 | Dense-grid semantics | Documented dense-grid pattern: `aria-labelledby` using column header plus row/product context; preserve compact visual grid; no large visible labels on every cell | Accessibility without breaking density | **DECIDED** |
| PAD-21 | Entered value color *(additional explicit decision; ID assigned by this record)* | `#000000` (pure black) for actual entered values | Strong value/placeholder hierarchy | **DECIDED** |

### W.1 Reconciliation of the previous draft to the decisions

| Previous draft said | Now |
|---|---|
| Field fill: `#FFFFFF` proposed, Option C tint alternative | `#FFFFFF` decided (PAD-1) |
| Border: three candidates | `#7C8695` decided (PAD-2) |
| Text `#111827` | `#000000` decided (PAD-21); `--foreground` untouched |
| Placeholder `#6B7280` proposed, `#5F6B7A` if gold-soft focus fill | `#5F6B7A` decided (PAD-3); focus fill unchanged (PAD-4) |
| Focus: `#8A6D1F`/navy options | `#8A6D1F` decided (PAD-5) |
| Error `#DC2626` proposed, `#B91C1C` alternative | `#B91C1C` decided (PAD-6), field scope (R-1) |
| Identity Search amber values open | Focus `#B45309` decided (PAD-7); **resting border still open (R-2)** |
| Gold text: `#8A6D1F` alone vs plus `#7A5F17` | Both, by surface (PAD-8) |
| Text tiers with iOS 16px open | 14/13, min 13, no forced 16px (PAD-9) |
| Login value text could stay 12px as an exception | **No longer permitted** — below the 13px minimum (Section P) |
| O-a…O-e for "Ainda não contado" | O-e decided (PAD-11) |
| Superadmin: 14a shared stylesheet vs 14b sync check | Principle decided (PAD-14); mechanism at P0 checkpoint |
| Dangling reference to a "Section 16-equivalent" in Section T | Corrected: `DESIGN_SYSTEM.md` updates are now H.15 |

### W.2 Residual items (not PADs — gaps discovered while reconciling)

These are **not** PADs. They are details the approved decisions did not specify. Nothing is silently decided.

| ID | Item | Status | Phase |
|---|---|---|---|
| **R-1** | Scope of `#B91C1C` | **RATIFIED** — fields only; global `--error` unchanged (H.9) | P0 |
| **R-6** | Disabled/locked field colors | **RATIFIED** — bg `#F5F7FA`, text `#4B5563`, border `#7C8695`, no opacity; row-level cues unchanged (H.7) | P0 |
| R-2 | Identity Search resting border (PAD-7 fixes focus only; `amber-200` fails 3:1) | **DEFERRED** by the Product Architect to its phase | P3 |
| R-3 | Login dark-surface resting values (placeholder, border) | **DEFERRED** | P3 |
| R-4 | Exact screens permitted to use Compact 13px (initial list: Contagem, Initial Stock Count, Add Stock row grids) | **DEFERRED** | P1 |
| R-5 | Final Contagem quantity placeholder / "Não contado" chip treatment (chip is 3.07:1 today) | **DEFERRED** | P1 |
| R-7 | Darker blue/rose semantic focus colors on light surfaces (`blue-400` ×1, `rose-400` ×1 below 3:1) | **DEFERRED** | P2/P3 |
| R-8 | Native-control values (checkbox outline/checked edge, range accent) | **DEFERRED** | P3 |

**The six deferred items are not blockers for P0.** They belong to later phases and must not be pulled into P0.

---

## X. Rule 8 Inputs

*(Superseded in detail by the companion Rule 8 Assessment, `docs/engineering/field-readability-and-interaction-rule8-assessment.md`. Summarized here.)*

1. **Existing behavior being changed:** field appearance, focus geometry, disabled/locked appearance, text size on fields currently below 13px, Contagem's blank-state signalling. **No** business, data, permission or workflow behavior.
2. **Design-system rules changed:** H.15.
3. **Tokens changed:** H.14.
4. **Shared components/styles affected:** both `index.css` files (`.input-base`, global focus rule, tokens), a possible neutral shared stylesheet (Q), a possible `Field` wrapper (P4), the two `fieldClass` constants (Contagem, Initial Stock Count), per-screen field class strings.
5. **Product surfaces affected:** Login, Add Stock, Contagem, Initial Stock Count, Expenses, Withdrawals, Owner Investment, Cash Flow, Settings, Dashboard search, Subscription, Timeline search, product/edit modals, Superadmin (six pages).
6. **Risks:** Section U and Rule 8.4–8.8 of the assessment.
7. **Product Architect status:** PAD-1 … PAD-21 `DECIDED`; R-1 and R-6 `RATIFIED`; R-2, R-3, R-4, R-5, R-7, R-8 intentionally deferred to P3, P3, P1, P1, P2/P3, P3 respectively. **No Product Architect decision blocker remains for P0.**
8. **Deterministic from evidence:** the layering defect and its fix — now also **reproduced empirically** in the Rule 8 Assessment; `--border-strong` has no consumers; gold-as-text/focus failures; Option C focus shift; file inputs are `hidden`; `readOnly` unused.

---

*End of amendment. Recording decisions is not Implementation Authorization (Governance Standard §3). Implementation remains NOT authorized.*
