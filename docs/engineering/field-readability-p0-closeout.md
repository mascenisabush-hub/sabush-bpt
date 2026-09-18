# Field Readability & Interaction — P0 (Canonical Field Foundation) — Implementation Evidence & Close-Out

**Type:** Stage 10 close-out / implementation-evidence record. Records what was implemented and verified; it is **not** a new authorization.
**Governing authorization:** [`field-readability-p0-implementation-authorization-request.md`](./field-readability-p0-implementation-authorization-request.md) — **Authorized, P0 only, September 18, 2026.**
**Authorization applies only to P0. It does not authorize P1, P2, P3, P4, or P5.** They remain unauthorized; nothing here is permission to begin them.
**Baseline (CP-0):** HEAD `02de2ef` at capture time, clean tree.
**Validation status in one line:** implemented; automated checks pass and equal the baseline; rendered validation was performed in **headless Chromium only, on fixtures built from the real class strings plus the two real sign-in pages** — authenticated Superadmin pages, dialogs, Safari/WebKit, Firefox and iOS were **not** validated (§5).

---

## 1. Commits (per the Product Architect's checkpoint structure)

| CP | Commit | Content |
|---|---|---|
| Authorization record | `d1b7d1e` | Authorization Record; S-1 resolution; checkpoint restructuring; CP-0 baseline |
| CP-0 | — (no commit) | Baseline capture |
| **CP-1** | `2247ffc` | Canonical `.input-base` foundation, field tokens, layering, global focus edit — `apps/tenant/src/index.css`, `apps/superadmin/src/index.css` |
| **CP-2** | `19b1a97` | `type-body` removed from the 23 Superadmin field elements (7 pages) |
| **CP-3** | `7d2991a` | `tests/field-foundation-p0.test.ts` + `package.json` (`test:field-foundation`, appended to `test:all`) |
| **CP-4** | *(this commit)* | `DESIGN_SYSTEM.md` v2.1 and this evidence record |

Push: attempted only after all validation passed; the outcome is reported in the session report, not in this file.

## 2. Files

**Changed by P0 implementation (CP-1…CP-4):** `apps/tenant/src/index.css`, `apps/superadmin/src/index.css`, `apps/superadmin/src/pages/{AuditTrail,BusinessDetail,BusinessDirectory,BusinessSearch,Operators,PaymentDetail,SignIn}.tsx`, `tests/field-foundation-p0.test.ts` (new), `package.json`, `DESIGN_SYSTEM.md`, and this record.
**Untouched (verified by `git diff --name-only`):** every tenant `.tsx`/component/lib/util file, `App.tsx`, all other Superadmin sources, `server/**`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `packages/**`, `public/**`, both `index.html`, both `vite.config.ts`, `package-lock.json`, `tsconfig.json`, and every pre-existing test.
**Not created (S-1, S-4):** no shared stylesheet (F-4) and no `vite.config.ts` comment edit (F-5); `--field-focus-amber` and `--gold-text` do not exist in CSS; `.input-base--compact` is defined and applied nowhere; no `aria-invalid` attribute was added anywhere.

## 3. What was built

- **`.input-base` foundation**, byte-identical in both apps inside a delimited `FIELD FOUNDATION` block, in `@layer components`. Owns surface, boundary, entered text, placeholder, default radius (10px, overridable), Inter 14px / 500 / 1.5 (Compact modifier 13px, unused), focus, disabled/locked, `aria-invalid` field error, explicit-property transition. Owns no layout.
- **Ratified tokens:** `--surface-page #FBF9F4`, `--border-strong #7C8695`, `--field-bg #FFFFFF`, `--field-text #000000`, `--field-placeholder #5F6B7A`, `--field-focus-border #8A6D1F`, `--field-focus-ring rgba(212,175,55,.30)`, `--field-error #B91C1C`, `--field-disabled-bg/-text/-border #F5F7FA / #4B5563 / #7C8695`. Unchanged: `--border`, `--error`, `--foreground`, `--gold`.
- **Global focus rule (S-2):** still unlayered; `border-radius: 4px` removed; `:not(:where(.input-base))` exclusion (specificity unchanged).
- Superadmin's `input, textarea, select { font-family: inherit }` moved into `@layer base`.

**One implementation detail not listed in the authorization's §3.2 token table:** `--field-error-ring: rgba(185,28,28,0.25)`, the decorative glow for the error state (a tint of the ratified `#B91C1C`, mirroring how the gold glow derives from brand gold). It introduces no new hue. Reported here for the Product Architect's awareness.

## 4. Automated verification (baseline vs after)

| Check | Baseline (CP-0) | After | Result |
|---|---|---|---|
| Typecheck tenant / superadmin / server | 3 / 0 / 15 errors | 3 / 0 / 15, **identical error lists** (tenant, server) | Equal |
| `npm run build` | pass | pass | Equal |
| `npm run build:superadmin` (run explicitly; CI does not) | pass | pass | Equal |
| Per-script test run (95 → 96 scripts) | 67 pass / 28 non-zero | 68 pass / 28 non-zero | Only difference: the **new** `test:field-foundation` (**44 pass, 0 fail**) |
| Tests passing / failing (totals) | 1264 / 2 | 1308 / 2 | +44 new; the same 2 failures |

- The `test:all` chain aborts at its first failing script at baseline (`staff-management-multishop-authorization`), so scripts were run individually to obtain a real comparison; per-script results are identical before and after.
- **Two failures are pre-existing and unrelated:** `test:staff-management-multishop-authorization` (9 pass / 1 fail) and `test:subscription-contact-modal-autoclose` (10 pass / 1 fail). Identical counts before and after. P0 neither caused nor fixed them and no test was edited.
- **26 scripts are Firestore-emulator-dependent** (`*:emulator`, rules suites, concurrency suites, two timeouts): **blocked by sandbox egress** (`403 … storage.googleapis.com`) at baseline and after — reported as **blocked, not passed**. One emulator script's exit code changed 1→2 in the concurrent run because parallel emulator launches collided on a port; re-run alone it fails with the same egress `403` as baseline.
- **Source-reading tests:** none failed because of P0's class changes. (No test references `index.css`, and every per-script result is identical to the baseline apart from the new suite.) No test was modified.
- **New test `tests/field-foundation-p0.test.ts`** — 44 static assertions: byte-identical blocks; `@layer components` placement; no `!important` outside reduced-motion; no unlayered field rule; global focus rule unlayered / radius-free / excluding `.input-base`; ratified token values; computed contrast; foundation behaviour (no layout properties, no opacity, constant focus border width, no fill change, forced-colours outline, `aria-invalid` state); no `type-body` on any field; no `opacity-50/60` with `.input-base`; no tenant `.input-base` use; NFR-1 bundle scan. **Mutation-checked:** deliberately breaking a token, adding `opacity` to disabled, and dropping the focus exclusion each made it fail; restored afterwards.

## 5. Rendered validation (what was and was not done)

**Method.** Headless Chromium 153 (via the `@sparticuz/chromium` npm binary, outside the repo), driving **production builds** of both apps made with dummy Firebase values. Two page types: (a) **fixtures** — plain pages linking each app's built CSS, populated with the **exact `className` strings extracted programmatically from the source** (23 Superadmin field elements; 62 distinct tenant field signatures), in four states (blank, filled, disabled, `aria-invalid`) with real keyboard Tab focus; (b) the **real Superadmin sign-in page and real tenant Login page**. Widths **1440px and 390px**. Baseline captured before any change; the same procedure after. Computed styles, in-page canvas colour conversion, and pixel samples at the focus edge were recorded.

**Results**

| Question | Result |
|---|---|
| Superadmin layout properties (padding, font size/weight/line-height, radius, border width, box width/height) base vs after | **No differences** at 1440 and 390 (23 elements × 3 states) |
| Focus layout shift (rect blurred → focused) | **0 of 92** measurements at each width; baseline also 0 |
| Border width change on focus | **0** |
| Radius change on focus | **0** (Superadmin) |
| Fill (background) change on focus | **0 of 92** |
| Tenant fields **at rest**, base vs after (62 signatures × 4 states × 2 widths) | **Computed styles identical** (0 differences) |
| Tenant fields **focused** | Only **radius** differs (122/124 at 1440, 120/122 at 390): the forced 4px is gone and each keeps its authored radius (10/12/8/6/0px) — the intended effect |
| Real Superadmin sign-in (email/password) | Layout identical; colour changes only (text, border) |
| Real tenant Login | **No layout or colour difference** |
| Focus, forced-colours emulation (CDP) | Box-shadow is dropped and a solid 2px system-colour outline appears — the fallback works |

**Rendered contrast (Chromium computed colours, all 23 Superadmin elements)**

| Pair | Ratio | Requirement | |
|---|---|---|---|
| Field surface vs card surface | 1.00 | (not a boundary carrier) | — |
| **Border `#7C8695` vs card surface** / vs field | **3.68** / 3.68 | ≥ 3 | Pass |
| **Entered value `#000000`** vs field | **21.00** | ≥ 4.5 | Pass |
| **Placeholder `#5F6B7A`** (effective, opacity 1) vs field | **5.43** | ≥ 4.5 | Pass |
| **Focus border `#8A6D1F`** vs card / field | **4.90** | ≥ 3 | Pass |
| **Disabled text `#4B5563`** vs `#F5F7FA` | **7.04** | ≥ 4.5 (product) | Pass |
| **Disabled border `#7C8695`** vs card / vs disabled fill | **3.68** / 3.43 | ≥ 3 | Pass |
| **Error border `#B91C1C`** vs card | **6.47** | ≥ 3 | Pass |
| *Baseline for comparison:* placeholder 3.41, border 1.24, focus 2.10 | | | Failed |

Focus pixel evidence (left edge, mid-height): white → glow `#F2E7C3` ×3 → `#8A6D1F` ×2 (same-colour stroke + border) → white — consistent with a constant 1px border plus a 1px same-colour stroke and the decorative glow. Disabled fields render with `opacity: 1` and `cursor: not-allowed`.

**NOT validated (stated plainly, not claimed):**
- **Authenticated Superadmin pages** (Business Directory, Business Detail, Payment Detail, Operators, Audit Trail, Business Search) were **not rendered** — they require a real operator session. Their 23 fields were validated through class-string fixtures, not in their real page layouts.
- **Focus-glow clipping** inside real `overflow-hidden`/scrolling dialogs (risk R-P0-7) — **not tested**.
- **Tenant screens other than Login** (Contagem, Initial Stock, Add Stock, Expenses, Cash Flow, Settings, Dashboard, Timeline …) were **not rendered as real pages**; they were validated via their exact class strings as fixtures. Their source is unchanged.
- **Safari/WebKit (including the disabled-text `-webkit-text-fill-color` rendering), Firefox (placeholder opacity), and iOS zoom-on-focus** — **not run**; only Chromium was available.
- **Autofill** (Login) — not exercised.
- **Hover** — no hover styling was introduced; none tested.

## 6. Acceptance criteria (authorization §13)

| ID | Status | Evidence |
|---|---|---|
| P0-AC-1 | **Pass** | Byte-identical foundation blocks; conformance test |
| P0-AC-2 | **Pass** | Test; compiled CSS shows `.input-base` inside `@layer components` in both bundles; no `!important` outside reduced-motion |
| P0-AC-3 | **Pass** | Test; `--error`, `--border`, `--foreground`, `--gold` unchanged |
| P0-AC-4 | **Pass** | Computed from tokens (test) and rendered in Chromium (§5) |
| P0-AC-5 | **Pass** | 0 width/fill/layout changes on focus; border `#8A6D1F`; stroke + glow; forced-colours outline verified in emulation |
| P0-AC-6 | **Pass** | Rendered disabled: `#F5F7FA` / `#4B5563` / `#7C8695`, opacity 1 |
| P0-AC-7 | **Pass** | Rendered `aria-invalid` border `#B91C1C`; global `--error` unchanged; 0 `aria-invalid` attributes in source |
| P0-AC-8 | **Pass** | Exactly 23 line changes in 7 files; 0 `input-base` + `type-body` remain; `font-mono` at `BusinessDetail.tsx:556` retained |
| P0-AC-9 | **Pass** | Test; compiled CSS |
| P0-AC-10 | **Pass** | `git diff --name-only` lists only §2 files; no tenant `.tsx` |
| P0-AC-11 | **Pass** | Tenant rest computed styles identical; focus differs only by removal of forced 4px radius |
| P0-AC-12 | **Partial** | No layout shift/clipping/wrapping change in fixtures and real sign-in at 1440 and 390; authenticated pages and dialogs not rendered (§5) |
| P0-AC-13 | **Pass** | Typecheck error lists identical; builds pass; per-script tests equal baseline plus 44 new; no test edited |
| P0-AC-14 | **Pass** | Bundle scan (JS/CSS assets) finds no `apps/tenant`. *Finding, pre-existing:* `apps/superadmin/index.html` contains an HTML **comment** "Same type system as apps/tenant"; it is outside the bundle, predates P0, and `index.html` is out of P0 scope — reported, not edited |
| P0-AC-15 | **Pass** | `DESIGN_SYSTEM.md` v2.1: foundation, tokens, tiers, focus/disabled/error, gold guidance (`#B8952F` removed from text), layering. The v2.0 checkbox line still says `--border` for the unchecked outline — native-control values are R-8 (P3), deliberately unchanged |
| P0-AC-16 | **Pass** | Nothing in §2.2 implemented |

## 7. Deviations, findings and notes

1. **S-1 resolved to the byte-identical-blocks mechanism** (no new cross-app dependency), per the authorization instruction and the `vite.config.ts` boundary policy. The sync assertion is in the new test.
2. **Checkpoint restructuring** by the Product Architect (recorded in the Authorization Record); the design-system update landed in CP-4, so commits are pushed together only after validation.
3. `--field-error-ring` added (§3). No other token outside the authorized list.
4. **Superadmin's own `Field` label helper** in the pages is unrelated to the semantic `Field` wrapper (P4) and was untouched.
5. Superadmin's baseline placeholder was Tailwind's default (text colour at 50%, 3.41:1); the foundation replaces it with `#5F6B7A` at full opacity.

## 8. Remaining deferred (not part of P0)

P1 (Contagem + Initial Stock Count; R-4, R-5), P2 (remaining tenant families; R-7; global focus rule moves to `@layer base` here), P3 (Login dark variant R-3, Identity Search R-2, Timeline wrapper, native controls R-8, semantic focus colours), P4 (label association, `aria-invalid`/`aria-describedby` wiring, `Field` wrapper), P5 (anti-divergence guardrail). Each needs its own Rule 8 checkpoint and authorization.

**Lifecycle:** Authorized → **Implemented → Verified (automated; rendered validation partial as §5)** → Closed only as a P0 record. **P1–P5 remain unauthorized.**
