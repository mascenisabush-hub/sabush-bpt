# Field Readability & Interaction — P0 (Canonical Field Foundation) — Implementation Authorization

**Type:** Governance bridge document (Stage 8 *request*, per `platform-engineering-governance-standard.md` §2).
**Status:** ✅ **AUTHORIZED — P0 ONLY (recorded September 18, 2026).** See "Authorization Record" immediately below. *(History: this document was first issued as a PROPOSED request, unsigned, in commit `02de2ef`; that history and the request text below are preserved unchanged. Only this status line, the lifecycle line, the Authorization Record and §16 were updated to record the authorization.)*
**Phase requested / authorized:** **P0 only — the canonical field foundation.** P1, P2, P3, P4 and P5 remain **unauthorized**.
**Basis (strictly):**
1. [`field-readability-and-interaction-specification-amendment.md`](../specs/field-readability-and-interaction-specification-amendment.md) — revision 3 (finalized).
2. [`field-readability-and-interaction-rule8-assessment.md`](./field-readability-and-interaction-rule8-assessment.md) — Assessed, addendum r3.
3. PAD-1 … PAD-21 — all `DECIDED` (spec §W).
4. R-1 and R-6 — `RATIFIED` by the Product Architect.
**Repository state at drafting:** HEAD `ff30819` (docs) on top of `0394235`; working tree contained only governance documents.
**Lifecycle:** Designed → Proposed → Assessed → **Authorized (P0 only, 2026-09-18)** → Implementation (Stage 9) in progress under this record. Reaching "Assessed" was a readiness opinion; the transition to Authorized was made by the Product Architect's explicit decision (Governance Standard §3).

---

## Authorization Record

**Product Architect authorization: APPROVED.**
**Date of authorization (execution date):** **September 18, 2026.**
**Recorded from:** the Product Architect's explicit written instruction "P0 Implementation Authorization + Implementation + Push" of that date, which states that the Product Architect "has explicitly authorized implementation of P0 of the Field Readability & Interaction program." This record transcribes that decision; it does not create it.

> **Authorization applies only to P0. It does not authorize P1, P2, P3, P4, or P5.**

| Item | Status |
|---|---|
| Scope | **P0 only** |
| P1, P2, P3, P4, P5 | **NOT authorized** |
| PAD-1 … PAD-21 | **DECIDED** |
| R-1 (field error color scope) | **RATIFIED** |
| R-6 (disabled/locked field colors) | **RATIFIED** |
| S-1 (shared-stylesheet rule) | **APPROVED** |
| S-2 (phased global focus rule) | **APPROVED** |
| S-3 (accepted visible effects, §2.3) | **APPROVED** |
| S-4 (`.input-base--compact` defined-not-applied; `--field-focus-amber`, `--gold-text` not created) | **APPROVED** |
| Push to `origin` | Authorized by the Product Architect for the completed, validated P0 commits only; a `401 Bad credentials` response is a **stop** (no credential handling, no workaround) |

### Product Architect amendments to this document made at authorization (recorded, not silently applied)

1. **Checkpoint structure (supersedes §12's table).** The Product Architect's authorization instruction fixes the checkpoints as: **CP-0** baseline capture, no commit · **CP-1** foundation/tokens/layering · **CP-2** Superadmin field class migration · **CP-3** conformance test and its `package.json` script · **CP-4** governance/documentation finalization and implementation evidence (which carries the `DESIGN_SYSTEM.md` v2.1 update, formerly CP-1). A separate governance commit records this authorization **before** CP-1. §3.1's file list and every other section are unchanged; only the checkpoint each file lands in moves (F-1 → CP-4; F-2/F-3 → CP-1; F-6 → CP-2; F-7 → CP-3).
   *Sequencing note (Principle 2.11):* the design-system update now lands in CP-4, so **all checkpoint commits are pushed together only after every validation passes**; no published state contains the new CSS without its design-system documentation.
2. **S-1 resolved (mechanism).** The authorization instruction directs that a shared stylesheet be used only if it complies with the existing architectural boundary, and otherwise that no new cross-app dependency be forced. `apps/superadmin/vite.config.ts` documents that only `@sabush/shared-types` crosses the boundary (and F-5 would require rewriting that policy comment). **Mechanism B is therefore used:** byte-identical canonical foundation blocks in both `index.css` files, guarded by the CP-3 synchronization assertion. Files F-4 (shared stylesheet) and F-5 (`vite.config.ts` comment) are **not** used and remain out of scope.
3. **Conflict handling with the instruction's §12 (source-reading tests).** Any test that fails because of an intentional P0 field-class change is analysed individually; a test is updated only where this authorization or the specification explicitly requires the source representation to change, and never to hide a behavioral regression. The two failures already present at baseline (`test:staff-management-multishop-authorization`, `test:subscription-contact-modal-autoclose`) are pre-existing and are neither caused nor fixed by P0.

### CP-0 baseline recorded before implementation (HEAD `02de2ef`, clean tree)
- Typecheck: tenant **3** errors, superadmin **0**, server **15** (pre-existing; equals `HANDOFF.md`).
- `npm run build` and `npm run build:superadmin`: pass.
- Tests (each `test:*` script run individually, because the `test:all` chain aborts at its first failing script): 95 scripts — 67 exit 0; 28 non-zero, of which 26 are Firestore-emulator-dependent (blocked/cancelled in this sandbox — reported as blocked, never as passed) and **2 are genuine pre-existing failures**; 1264 tests pass / 2 fail.
- Rendered baseline (headless Chromium, computed styles, pixel samples, screenshots at 1440px and 390px) captured for the 23 Superadmin field elements, 62 distinct tenant field signatures, and the real Superadmin sign-in and tenant Login pages.

---

## 1. Governance chain and what it settles

| Stage | Artifact | Status |
|---|---|---|
| Forensic investigation | System-wide field readability; Part 3 Superadmin | ✅ Delivered |
| Specification | Field Readability & Interaction amendment r3 | ✅ Finalized; PAD-1…21 DECIDED |
| Ratifications | R-1 (field error color scope), R-6 (disabled/locked colors) | ✅ RATIFIED |
| Rule 8 Assessment | Program-level, P0–P5, addendum r3 | ✅ Assessed — P0 request ready; no PA decision blocker for P0 |
| **Implementation Authorization** | **This document (P0 only)** | ✅ **Authorized 2026-09-18** |
| Implementation, Close-out | — | Stage 9 begins under this record; close-out after CP-4 |

**Product Architect decisions this request relies on (values are binding for P0):**

| Layer | Token | Value |
|---|---|---|
| Page (unchanged) | `--surface-page` | `#FBF9F4` |
| Field surface | `--field-bg` | `#FFFFFF` |
| Entered value | `--field-text` | `#000000` |
| Placeholder | `--field-placeholder` | `#5F6B7A` |
| Field boundary | `--field-border` = `--border-strong` | `#7C8695` |
| Decorative hairline (unchanged) | `--border` | `#E5E7EB` |
| Focus (accessible gold) | `--field-focus-border` | `#8A6D1F` |
| Focus glow (decorative) | `--field-focus-ring` | `rgba(212,175,55,0.30)` (from brand gold `#D4AF37`) |
| Field error | `--field-error` | `#B91C1C` — **fields only (R-1); global `--error` `#DC2626` is NOT changed** |
| Disabled/locked (R-6) | `--field-disabled-bg` / `-text` / `-border` | `#F5F7FA` / `#4B5563` / `#7C8695`; **no opacity** |
| Typography | tiers | Standard 14px, Compact 13px, Inter, 500, line-height 1.5; minimum 13px |
| Class name | `.input-base` | retained (not renamed) |

---

## 2. Exact P0 scope

### 2.1 In scope (P0 **may** cover)

1. Field background, boundary, entered-value text and placeholder (as tokens + the foundation class).
2. Typography foundation: Standard 14px tier as the default; the Compact 13px tier **defined** as a modifier (`.input-base--compact`) but **applied to no element** (its membership is R-4, deferred to P1).
3. The canonical focus model (spec §K): border-color change, same-color 1px outer stroke, decorative gold glow, constant border width, forced-colors fallback.
4. Disabled/locked foundation (R-6 values; no opacity; `cursor: not-allowed`; Safari disabled-text rendering must resolve to `#4B5563`).
5. The error field state, keyed on `aria-invalid="true"` (`--field-error`, R-1). **The state is defined in CSS only.** P0 adds no `aria-invalid` attribute to any element (that is P4), so the state is dormant until then.
6. CSS layering foundation (§6 of this document).
7. `.input-base` (retained name) in **both** apps, converging on one canonical definition (PAD-14; mechanism per §3.3).
8. Removal of the conflicting `.type-body` class from the **23** Superadmin field elements that carry it (spec R.2 rule 8) — a class-string change only.
9. `DESIGN_SYSTEM.md` v2.1 documentation of the above (Principle 2.11 requires the design system to be updated **first**).
10. One new automated conformance test for P0 invariants (§8.2) and its `package.json` script entry.

### 2.2 Explicitly NOT P0 (must not be implemented)

Contagem migration · Initial Stock Count migration · any broad tenant migration · the semantic `Field` wrapper · native-control migration (checkbox/range/file) · Timeline migration beyond foundation compatibility · the Login (dark) variant · the Identity Search variant · the final Contagem "Não contado" placeholder/chip treatment · unrelated accessibility work (labels, `aria-*` wiring, keyboard changes) · unrelated button/touch-target work · any change to tenant `.tsx` files.

**Deferred items are not P0 work and are not P0 blockers:** R-2 (P3), R-3 (P3), R-4 (P1), R-5 (P1), R-7 (P2/P3), R-8 (P3).

### 2.3 What P0 changes for users (stated up front so nothing is a surprise)

| Surface | Effect |
|---|---|
| **Superadmin (23 field elements, 7 pages)** | **Visible change:** stronger `#7C8695` border, `#000000` entered value, `#5F6B7A` placeholder, `#8A6D1F` focus with constant width, muted disabled state |
| **Tenant fields** | **No change at rest** — no tenant `.tsx` file uses `.input-base` and none is edited |
| **All focusable elements in both apps** | The global focus outline no longer forces `border-radius: 4px`; a focused element keeps its authored radius (spec K.2 item 5). The outline itself is unchanged |
| Business data, calculations, workflows | **None** |

---

## 3. Exact files and classes expected to change

### 3.1 Files expected to change

| # | File | Change | Checkpoint |
|---|---|---|---|
| F-1 | `DESIGN_SYSTEM.md` | v2.1: color/token table (§H.0/H.14), Forms & inputs foundation, typography tiers, disabled/error model, brand-vs-accessible gold guidance (PAD-8, removes `#B8952F` as text guidance), layering note, field variants and exception register (documentation only), badge-text flag (FU-6, documentation only) | CP-1 |
| F-2 | `apps/tenant/src/index.css` | Field tokens; canonical `.input-base` (+`--compact`) in `@layer components`; global `:focus-visible` edits (§6.2); `--border-strong` redefined | CP-2 |
| F-3 | `apps/superadmin/src/index.css` | Same as F-2; its local unlayered `.input-base` copy removed or replaced per §3.3; `input, textarea, select { font-family: inherit }` moved into `@layer base`; same global-focus edits | CP-2 |
| F-4 | **Mechanism A only:** one new neutral shared stylesheet, proposed path `packages/field-foundation/field-foundation.css`, imported by F-2 and F-3 | CP-2 |
| F-5 | **Mechanism A only, comment-only:** `apps/superadmin/vite.config.ts` — update the boundary-policy comment (which currently names `@sabush/shared-types` as the only crossing) to record the second sanctioned neutral module. **No code change.** | CP-2 |
| F-6 | `apps/superadmin/src/pages/BusinessDirectory.tsx` (5), `SignIn.tsx` (2), `PaymentDetail.tsx` (1), `Operators.tsx` (2), `BusinessDetail.tsx` (7), `BusinessSearch.tsx` (1), `AuditTrail.tsx` (5) | Remove the `type-body` token from the `className` of exactly these 23 field elements. Nothing else on those lines or files | CP-3 |
| F-7 | `tests/field-foundation-p0.test.ts` (new) and `package.json` (add `test:field-foundation` and append it to `test:all`) | Conformance test (§8.2) | CP-4 |

Line-level anchors for F-6 (HEAD `0394235`): BusinessDirectory 119, 126, 139, 151, 162 · SignIn 99, 112 · PaymentDetail 214 · Operators 172, 174 · BusinessDetail 224, 345, 374, 441, 460, 556, 565 · BusinessSearch 44 · AuditTrail 84, 92, 99, 112, 120. The `font-mono` on `BusinessDetail.tsx:556` is **retained** (PAD-12).

### 3.2 Classes and tokens expected to be introduced or redefined

| Item | Change |
|---|---|
| `.input-base` | Redefined; lives in `@layer components` |
| `.input-base--compact` | New; defines the 13px tier via a custom property; applied nowhere in P0 |
| `.input-base::placeholder`, `:focus`, `:disabled`, `[aria-invalid="true"]` | New states inside the foundation |
| `--border-strong` | Redefined to `#7C8695` (no existing consumers — verified) |
| `--surface-page` | Declared (`#FBF9F4`); no CSS consumer in P0 |
| `--field-bg`, `--field-text`, `--field-placeholder`, `--field-border`, `--field-focus-border`, `--field-focus-ring`, `--field-error`, `--field-disabled-bg`, `--field-disabled-text`, `--field-disabled-border`, `--field-font-size` | New |
| **Not created in P0** | `--field-focus-amber` (P3 consumer), `--gold-text` (documented in `DESIGN_SYSTEM.md` only) |
| **Not changed** | `--error`, `--foreground`, `--border`, `--gold` and every other existing token |

### 3.3 Tenant/Superadmin convergence mechanism (PAD-14) — decided by evidence at CP-2

Two facts must both be respected. (1) PAD-14: one shared foundation *wherever the repository architecture permits it cleanly*. (2) `apps/superadmin/vite.config.ts` documents that **only `@sabush/shared-types` crosses the app boundary** and that no cross-app relative imports are permitted; NFR-1 requires the Superadmin bundle to contain **zero references to `apps/tenant`**.

**Mechanism A (preferred):** a neutral stylesheet outside both apps' `src/`, imported by both `index.css` files.
**Go/no-go criteria for A (all must hold, evidenced at CP-2):**
- both `npm run build` and `npm run build:superadmin` succeed;
- a built-output string scan of `dist-superadmin/` finds **zero** occurrences of `apps/tenant` (the NFR-1 method: built output, not source structure);
- the shared file resolves through a path that does **not** enter `apps/tenant/src`;
- the compiled CSS of both apps contains `.input-base` inside `@layer components`.

**Mechanism B (fallback, inside PAD-14's own wording):** keep the canonical block in both `index.css` files, byte-identical, guarded by the CP-4 test that asserts the two blocks and their token values are identical, so drift becomes a failing test.

If A's criteria are not all met, B is used **without returning to governance for a new decision** — but the switch and the failing criterion must be reported in the CP-2 completion report.

---

## 4. Files explicitly OUT of scope (must not be modified)

- **All tenant components and pages:** everything under `apps/tenant/src/components/**` (including `PeriodicStockCountView.tsx`, `InitialStockCountView.tsx`, `AddStockView.tsx`, `AuthView.tsx`, `QuickLoginScreen.tsx`, `timeline/**`, `AvatarCropModal.tsx`, `Header.tsx`, `SettingsModal.tsx`, …), `App.tsx`, `apps/tenant/src/lib/**`, `utils/**`, hooks and types.
- **Superadmin code other than F-6:** `apps/superadmin/src/components/**`, `lib/**`, and every `.tsx` outside the seven pages in §3.1 (and, in those seven, everything except the 23 `type-body` tokens).
- **Backend and data:** `server/**`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `firebase*.json`, `deployed-rules-live.txt`, `scripts/**`.
- **Shared types and assets:** `packages/shared-types/**`, `public/**`, both `index.html` files.
- **Build/dependency files:** `package-lock.json`, `bun.lock`, `tsconfig.json`, and `apps/tenant/vite.config.ts`. (`apps/superadmin/vite.config.ts` is in scope **only** for the comment-only edit F-5 under Mechanism A.)
- **All existing tests** — none may be edited, weakened or deleted to make anything pass.
- **Other governance records:** the specification, the Rule 8 Assessment, and every other `docs/` artifact, except through their own separate governance steps. (The P0 close-out record is a later, separate Stage 10 artifact.)
- `CLAUDE.md`, `HANDOFF.md`, `README.md`, `COMPONENT_LIBRARY.md`.

**Any diff touching a file not listed in §3.1 is a stop condition (§12).**

---

## 5. Invariants (binding for the whole of P0)

### 5.1 Behavioral invariants
- No handler, state, hook, prop, ref, route or event wiring changes anywhere.
- No `disabled`, `readOnly`, `required`, `type`, `inputMode`, `autoComplete`, `maxLength`, `name`, `id` or `value` attribute is added, removed or altered — P0 edits **class strings and stylesheets only**.
- Controlled-input behavior, form submission, validation timing and messages, keyboard handling (including Enter suppression and Tab order), autofill behavior, `<select>` behavior and file-input behavior are unchanged.
- Focus **movement** is unchanged; only focus **appearance** is in scope.
- Attribute order and JSX line structure in edited elements are preserved except for the removed `type-body` token, because source-scanning tests pin JSX shape (assessment §8.4).

### 5.2 Data invariants
- No Firestore schema, read, write, listener, query, index, rule or security change. No migration. No historical-data effect. No persistence semantics change (drafts/autosave store values, not presentation).
- `firestore.rules`, `firestore.indexes.json`, `storage.rules` and `server/**` are untouched.

### 5.3 Business-logic invariants
- No business rule, financial calculation, inventory calculation, Business Worth computation, stock valuation, subscription logic, permission, authentication or workflow changes.
- `isBlank`/quantity logic in Contagem and every calculation module are untouched (no file containing them is edited).
- The global `--error` token is untouched (R-1).

---

## 6. CSS layering requirements

### 6.1 Foundation (all four apply in both apps)
1. `.input-base`, `.input-base--compact` and their state rules are declared inside **`@layer components`**. Tailwind's own `@layer theme, base, components, utilities;` order is relied upon and **not redeclared or reordered**.
2. The foundation owns **appearance and state only**: background, text color, border (1px, color only varies by state), default `border-radius` (10px, overridable by utilities), font-family/size/weight/line-height (tier), placeholder color, focus indication, disabled appearance, error appearance, and an explicit-property transition (`border-color`, `box-shadow`, `background-color`; using the existing `--duration-fast`/`--ease-premium`). It does **not** set width, height, padding, margin, display, position or grid placement.
3. Required rendering details: `::placeholder` sets color **and `opacity: 1`** (Firefox default dims placeholders); disabled state sets `opacity: 1` and resolves text to `--field-disabled-text` in Safari (`-webkit-text-fill-color`); `appearance` is **not** set on `select`; focus state includes `outline: 2px solid transparent` so forced-colors mode still shows an outline.
4. Focus geometry: **border width is identical at rest and on focus.** Indication = `border-color` + `box-shadow: 0 0 0 1px var(--field-focus-border), 0 0 0 4px var(--field-focus-ring)`. Text fields use `:focus` (all input modes).
5. Variants and states override the foundation **only via custom properties or single-property state rules within the same layer**, never by re-declaring layout.

### 6.2 Global focus rule (phased — see §7 risk R-P0-3 and §10 attestation S-2)
- In **both** apps the existing global `:focus-visible` rule **stays unlayered in P0**, **loses `border-radius: 4px`**, and **excludes `.input-base`** (so `.input-base` fields never receive the global outline in addition to their own indicator).
- Reason (evidence, assessment §11.2 E-3/E-4): 124 tenant `focus:outline-none` occurrences are currently defeated by the unlayered global outline; layering the rule now would strip the extra indicator from every not-yet-migrated tenant field and leave only a 2.1:1 gold border plus a 20% ring — an interim accessibility regression. It moves to `@layer base` after tenant migration completes (P2 close-out; enforced by P5).

### 6.3 Prohibitions
- **No `!important`** in field CSS. (The existing `prefers-reduced-motion` block is unaffected.)
- **No unlayered rule may target `.input-base`.** The pre-existing unlayered `-webkit-tap-highlight-color` list naming `select`/checkbox/radio is an allow-listed exception (it sets one non-visual property).
- **No `@apply` of layout utilities** inside the foundation.
- **Fields must not carry `.type-body`** or another unlayered typography/colour class (spec R.2 rule 8).
- No new colors beyond the ratified values; no rename of `.input-base`.

---

## 7. Regression risks (P0-specific, with mitigations)

| ID | Risk | Likelihood | Mitigation / detection |
|---|---|---|---|
| R-P0-1 | Layering `.input-base` changes Superadmin rendering beyond the intended token/appearance changes (radius/padding overridden or not) | Medium | Utilities on the 23 elements (`px-*`, `py-*`, `p-*`, `w-full`, `pl-9`, `pr-3`, `mb-*`, `mt-*`, `font-mono`) must remain effective; CP-0 baseline vs CP-3 computed-style comparison of padding/width/margin/radius |
| R-P0-2 | After `type-body` is removed, Superadmin fields change text size/weight/line-height | Low–Medium | Standard tier (14px/500/1.5) equals `.type-body`'s metrics, so the size should be unchanged; assert by computed style |
| R-P0-3 | Layering the global focus rule early would weaken focus on ~120 unmigrated tenant fields | **High if done** | Phased per §6.2; conformance test asserts the global rule is unlayered and excludes `.input-base`; validated at CP-2 |
| R-P0-4 | Removing `border-radius: 4px` from the global rule visibly changes the focus shape of buttons/links | Low (intended) | Spot-check focused buttons/links in both apps at CP-2; this is the specified behavior (spec K.2.5), not a regression |
| R-P0-5 | Mechanism A breaks the Superadmin build or violates NFR-1 | Low–Medium | Go/no-go criteria §3.3; fallback B |
| R-P0-6 | Two source-scanning test families pin JSX shape (assessment §8.4) and fail after class-string edits | Low (only `type-body` tokens are removed) | Full suite before/after; if any fails, **stop** (never edit a test) |
| R-P0-7 | Focus glow (4px) clipped inside `overflow-hidden`/scrolling containers in Superadmin dialogs/modals | Medium | Check every Superadmin page containing a field, at desktop and 390px; report clipping, do not fix by widening scope |
| R-P0-8 | Disabled text renders dimmer in Safari (`-webkit-text-fill-color`/opacity defaults) | Medium | Explicit rendering rules §6.1.3; validate in Safari/WebKit if available, else record as **not run** |
| R-P0-9 | Placeholder appears dimmed in Firefox | Low | `opacity: 1` rule §6.1.3; validate |
| R-P0-10 | Dormant error state gives a false sense of completed accessibility | Low | Documentation states the state is dormant until P4; no `aria-invalid` is added in P0 |
| R-P0-11 | Type-check baseline shifts | Low | Compare to the CP-0 baseline (`HANDOFF.md` records tenant 3 / superadmin 0 / server 15 pre-existing errors); **no new errors** |
| R-P0-12 | `test:all` and CI do not run `build:superadmin` | Certain | Run it explicitly (§8.1) |

---

## 8. Test requirements

### 8.1 Existing suites (regression, no edits)
- **Baseline first (CP-0, before any change):** `npm run lint` (tenant, superadmin), `npm run lint:server`, `npm run test:all`, `npm run build`, `npm run build:superadmin` — record pass/fail counts and the pre-existing type-error counts.
- **After every checkpoint (CP-1…CP-4) and at completion:** the same commands; results must equal the baseline (**no new failures, no new type errors, no skipped tests newly appearing**).
- Suites that cannot run in the implementation environment (e.g. the Firestore emulator suites, previously blocked by sandbox egress) must be reported **exactly as blocked** — never as passed. They are irrelevant to P0's data invariants but must not be silently omitted.

### 8.2 New P0 conformance test — `tests/field-foundation-p0.test.ts`
Plain `tsx --test`, no browser, and it must **fail if the invariants regress**:
1. **Layering:** in both `index.css` (and the shared file under Mechanism A) every `.input-base*` rule is inside `@layer components`; no unlayered rule selects `.input-base`; **no `!important`** in field rules.
2. **Global focus rule:** unlayered in P0; contains no `border-radius`; excludes `.input-base`.
3. **Token values:** the field tokens equal the ratified values (§1 table); `--border` and `--error` are unchanged; `--border-strong` equals `--field-border`.
4. **Contrast assertions (computed from the token values):** value ≥ 4.5 on `--field-bg`; placeholder ≥ 4.5; boundary ≥ 3 against both `#FFFFFF` and `#FBF9F4`; focus border ≥ 3 against both; error text ≥ 4.5 and error border ≥ 3; disabled text ≥ 4.5 on `--field-disabled-bg`; disabled border ≥ 3 against `#FBF9F4`.
5. **No opacity:** the disabled rule sets no `opacity` other than `1`.
6. **Focus geometry:** the focus rule does not set `border-width`.
7. **Layout-neutrality:** the foundation block declares none of `width`, `height`, `padding*`, `margin*`, `display`, `position`, `grid*`.
8. **`type-body`:** no `className` containing `input-base` also contains `type-body` (Superadmin pages).
9. **Convergence:** Mechanism A → both apps import the shared file; Mechanism B → the two canonical blocks and token values are byte-identical.
10. **NFR-1:** a built-output scan of `dist-superadmin/` finds no `apps/tenant` string (skipped with a clear message if no build output exists, and then reported as **not run**).
Adding this test is in scope (F-7); the test is added to `test:all`.

### 8.3 Manual/visual validation (see §9). Automated tests do not substitute for it.

---

## 9. Desktop and mobile validation requirements

Validation needs a real browser. **If none is available in the implementation environment, the affected items must be reported as NOT RUN, and P0 may be closed only as "implemented, automated-verified; visual validation outstanding" — never as fully validated.** A missing browser is never reported as a pass.

**Widths:** desktop ≥ 1280px; mobile 390px. **CP-0 baseline captures (screenshots plus computed styles) are taken before any change** so before/after is comparable.

| Surface | Desktop ≥1280 | Mobile 390 | States |
|---|---|---|---|
| Superadmin — Business Directory, Business Search, Business Detail, Payment Detail, Operators, Audit Trail, Sign-in | Required (visible change expected) | Required | blank · populated · focus · disabled (where present) · hover (unchanged; none introduced) |
| Tenant regression sample — Login, Add Stock, Contagem, Initial Stock Count, Expenses, Cash Flow, Settings, Dashboard search, Timeline search | Required: **fields at rest unchanged** (computed-style equality); focused fields keep their own indicators; focused elements keep authored radius | Required (Contagem/Initial Stock at 390px: grid integrity, no clipping, no new wrapping) | rest · focus |
| Superadmin dialogs/modals with fields | Required | Required | focus (glow not clipped) |

**Technical checks (each with recorded evidence):**
- Computed contrast of value, placeholder, boundary, focus border, disabled text on the rendered pages meets §8.2 item 4.
- **Zero layout shift on focus:** `getBoundingClientRect()` of each Superadmin field and its neighbors is identical blurred vs focused.
- **No unintended radius override:** computed `border-radius` equals the authored/default value, blurred **and focused**.
- No clipping, no grid breakage, no unexpected text wrapping.
- Forced-colors (or Windows high contrast emulation): a focus outline is visible on `.input-base` fields.
- iOS/WebKit: 13px/14px fields' zoom-on-focus behavior recorded (existing behavior; PAD-9 does not force 16px) — recorded only.

---

## 10. Signature-time confirmations (what signing approves beyond the decided PADs)

These are **not new PADs**; they are engineering constraints derived from evidence that the signature accepts.

| ID | Confirmation |
|---|---|
| **S-1** | Mechanism A (shared neutral stylesheet, with the comment-only update to `apps/superadmin/vite.config.ts`) is permitted **only** if every §3.3 criterion is met; otherwise Mechanism B is used without a new decision. |
| **S-2** | The global `:focus-visible` rule stays **unlayered in P0** (radius removed; `.input-base` excluded) and is layered after P2 — a phasing refinement of spec R.2 rule 3, recorded in the spec r3. |
| **S-3** | The user-visible effects in §2.3 are accepted: Superadmin field appearance changes; focused elements in both apps keep their authored radius. |
| **S-4** | `.input-base--compact` is defined but applied nowhere in P0; `--field-focus-amber` and `--gold-text` are not created in P0. |

---

## 11. Rollback strategy

- **Nature of the change:** stylesheet, tokens, seven pages' class strings, documentation and one test. **No data, schema, rule or server change**, therefore nothing to migrate back.
- **Unit of rollback:** each checkpoint is one commit (§12); rollback is `git revert` of that commit (or of the range, newest first: CP-4 → CP-3 → CP-2 → CP-1). Checkpoints are independently revertable: CP-3 can be reverted alone (Superadmin fields regain `type-body`); CP-2 alone (foundation returns to the prior CSS); CP-4 alone (the test and script entry).
- **Intermediate states are safe by design:** after CP-2 and before CP-3, Superadmin fields still carry `.type-body` (its unlayered color/size wins), which is a benign, temporary state; each checkpoint builds and passes on its own.
- **Verification after any revert:** re-run §8.1 and confirm equality with the CP-0 baseline.
- **Deployment note:** the tenant app and server deploy from one build (`npm run build`); Superadmin builds separately (`build:superadmin`). A defect found after deployment is remedied by reverting the offending checkpoint commit and redeploying — no data repair is ever required.

---

## 12. Commit boundary and checkpoint plan

Stage 9 per-checkpoint loop (Governance Standard §2a) applies at every checkpoint: fresh repository verification → authorization re-read → implement only this slice → tests → internal review → completion report → commit (+ push per the standing repository instruction) after the diff scope is confirmed against §3.1 → stop.

| CP | Content | Files | Commit message prefix |
|---|---|---|---|
| **CP-0** | Baseline capture only — **no commit** | none | — |
| **CP-1** | Design system documentation first (Principle 2.11) | F-1 | `docs(design-system): field foundation v2.1 (field-readability P0 CP-1)` |
| **CP-2** | Foundation CSS, tokens, layering, convergence mechanism, global focus edit | F-2, F-3 (+ F-4, F-5 if Mechanism A) | `feat(fields): canonical .input-base foundation (field-readability P0 CP-2)` |
| **CP-3** | Remove `type-body` from the 23 Superadmin field elements | F-6 | `refactor(superadmin): drop .type-body from field elements (field-readability P0 CP-3)` |
| **CP-4** | Conformance test + script entry; full validation run | F-7 | `test(fields): P0 field-foundation conformance (field-readability P0 CP-4)` |
| Close-out | Stage 10 record (a separate governance artifact, after CP-4) | `docs/engineering/field-readability-p0-closeout.md` | `docs(governance): field-readability P0 close-out` |

- **One logical checkpoint per commit.** No checkpoint touches the next checkpoint's files "while already in there."
- Each commit's message states which checkpoint it is and what remains.
- Diff scope is confirmed against §3.1 **before** each commit (`git diff --stat` reviewed; any unlisted file = stop).
- P1 is not begun by completing P0.

---

## 13. Acceptance criteria (P0)

| ID | Criterion |
|---|---|
| **P0-AC-1** | The foundation exists in both apps with identical canonical content (Mechanism A: single shared source; Mechanism B: byte-identical blocks + passing sync assertion) |
| **P0-AC-2** | Every `.input-base*` rule is in `@layer components`; no unlayered rule targets `.input-base`; no `!important` in field rules |
| **P0-AC-3** | Field tokens equal the ratified values; `--error`, `--border`, `--foreground`, `--gold` are unchanged; `--border-strong` = `#7C8695` |
| **P0-AC-4** | Contrast assertions of §8.2 item 4 pass (computed from the tokens **and** confirmed on rendered pages) |
| **P0-AC-5** | Focus: constant border width; no background change on focus; border `#8A6D1F`; same-color stroke + gold glow; forced-colors outline present |
| **P0-AC-6** | Disabled/locked: bg `#F5F7FA`, text `#4B5563`, border `#7C8695`; **no opacity** other than 1 |
| **P0-AC-7** | Error state defined for `[aria-invalid="true"]` with `#B91C1C`; global `--error` unchanged; no `aria-invalid` attribute added anywhere |
| **P0-AC-8** | Exactly the 23 listed Superadmin field elements lost `type-body`; no `input-base` element carries `type-body`; `font-mono` at `BusinessDetail.tsx:556` retained |
| **P0-AC-9** | Global `:focus-visible` remains unlayered, has no `border-radius`, and excludes `.input-base` in both apps |
| **P0-AC-10** | **No tenant `.tsx` file, and no file outside §3.1, is modified**; `git diff --stat` per commit matches §3.1 |
| **P0-AC-11** | Tenant fields at rest are computed-style-identical to the CP-0 baseline; focused tenant elements differ from baseline **only** in the (intended) absence of the forced 4px radius |
| **P0-AC-12** | Superadmin fields: no layout shift on focus; radius/padding/width/margin utilities still effective; no clipping or wrapping regressions at ≥1280px and 390px |
| **P0-AC-13** | `lint` (tenant/superadmin/server), `test:all`, `build`, `build:superadmin` equal the CP-0 baseline — no new failures or type errors; no existing test edited |
| **P0-AC-14** | NFR-1: no `apps/tenant` reference in the Superadmin production bundle (built-output scan) |
| **P0-AC-15** | `DESIGN_SYSTEM.md` v2.1 reflects the foundation, tokens, tiers, states, gold guidance and layering note, and contains no value that contradicts the ratified decisions |
| **P0-AC-16** | Nothing outside P0's boundary (§2.2) was implemented |

---

## 14. Evidence required before completion

P0 may be recorded as complete only with **all** of the following, attached to the close-out record:
1. CP-0 baseline output (lint counts, `test:all`, both builds) and the after-each-checkpoint outputs, side by side.
2. Per-commit `git diff --stat` and `git log --oneline` showing the four checkpoint commits and that each diff matches §3.1.
3. The new conformance test's passing output (§8.2), including the computed contrast table.
4. The NFR-1 built-output scan result.
5. Compiled-CSS excerpts (from the built output) showing `.input-base` inside `@layer components` in both apps.
6. Baseline and after **computed-style captures** for the Superadmin fields and the tenant regression sample, with the focus-shift and radius measurements (§9).
7. Screenshots at ≥1280px and 390px for every surface in §9 — **or an explicit statement that the visual validation was not run** and why, in which case P0 is recorded as visual-validation-outstanding.
8. The mechanism decision (A/B) with the go/no-go evidence (§3.3).
9. An explicit list of anything not run (e.g. blocked Firestore-emulator suites, Safari/Firefox checks) — never reported as passed.
10. A statement that P1–P5 remain unauthorized.

---

## 15. Stop conditions (in force throughout)

Any of the following stops work and is reported — never resolved by engineering judgment (Governance Standard §4, Principle 1):
- a needed change to any file not listed in §3.1, or to any handler/state/hook/prop/route/data path;
- an existing test that fails and would only pass if edited;
- any Mechanism A go/no-go criterion failing (switch to B **and report**), or B also failing;
- a discrepancy between §3.1/§2.3 and the current source (e.g. a Superadmin field element not in the 23);
- a new type error relative to the baseline;
- an ambiguity requiring a decision on a deferred item (R-2, R-3, R-4, R-5, R-7, R-8) or on anything in §2.2;
- discovery that P0's real scope is broader, narrower or ambiguous.

---

## 16. Signature

**Status: ✅ AUTHORIZED — P0 ONLY.** *(Originally issued blank/unsigned; completed on September 18, 2026.)*

> _Product Architect decision, recorded from the written instruction of September 18, 2026:_
>
> _"The Product Architect has explicitly authorized implementation of P0 of the Field Readability & Interaction program."_
> _S-1, S-2, S-3, S-4: APPROVED. R-1, R-6: RATIFIED. PAD-1 through PAD-21: DECIDED._
> **Authorization applies only to P0. It does not authorize P1, P2, P3, P4, or P5.**

**Authorized by:** Product Architect (instruction of 2026-09-18) — recorded by Claude as instructed.
**Date:** September 18, 2026.
**Scope stated at authorization:** P0 exactly as scoped in §2, files as listed in §3.1 (with the S-1 resolution and checkpoint restructuring recorded in the Authorization Record), invariants §5, layering §6, tests §8, validation §9, confirmations §10, rollback §11, commit boundary §12 (as restructured), acceptance §13, evidence §14, stop conditions §15. **P1–P5 remain unauthorized regardless of P0's outcome, and a successful push is not permission to implement them.**

---

## Governance notes

- **(Original note, preserved.)** As first issued this document was a request and authorized nothing. It is now an authorization for **P0 only**, by the Authorization Record above; it authorizes no other phase.
- It does not modify the specification or the Rule 8 Assessment; it sits downstream of both.
- It introduces no new Product Architect decision: §10 lists engineering confirmations derived from recorded evidence, for the signature to accept or reject.
- Producing it changed only governance artifacts; no implementation file was touched.

**Lifecycle:** Designed → Proposed → Assessed → **Authorized (P0 only, 2026-09-18)**. Next: Implemented → Verified → Closed (Stage 10 record after CP-4).
