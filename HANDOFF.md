# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Catalog Phase 2, **Checkpoint 4 (Add Stock
correction — canonical Product Information) — implemented, tested,
typechecked, built, committed, and pushed** (commit `c43776a`).
**Nothing mid-flight; working tree clean.**

**What shipped (Checkpoint 4):**
- `AddStockView.tsx`: new `AddStockProductCorrectionModal` — a
  contextual correction affordance for an already-matched, active
  existing Product row, scoped to exactly the Specification §7-
  authorized fields (`name`, `sellingPrice`, `sellingUnit`,
  `unitRelationship`). Family 2 architecture (Product Architect's
  explicit selection): reuses `confirmProductUnitRelationship` and
  `updateProduct` exactly as they already exist — `AppContext.tsx`
  untouched, zero diff since Checkpoint 3.
- Distinct, explicit rename confirmation (Specification §9; Plan §K):
  a separate `pendingRename` state — changing the name never writes
  immediately; requires an explicit confirm naming old/new; cancel
  leaves the canonical name untouched; structurally distinct from
  `identityConfirmedNew` (never reused for it).
- sellingPrice/sellingUnit invariant (Specification §10; Plan §L):
  refuses to proceed, before any write, if a non-null sellingPrice
  would end up paired with an absent/invalid sellingUnit.
- Write ordering: `confirmProductUnitRelationship` first (only when the
  relationship changed), `updateProduct` second, for `name` +
  `sellingPrice` only — never `category`/`supplier`/`sku`/`barcode`/
  `costPrice`/`active`/`supplierWordings`. A thrown relationship-write
  error skips the Product update entirely.
- Authorization denial: reuses the existing `handleReactivateProduct`
  catch/rollback pattern — `onClose()` (the only success signal) is
  reachable only from the try block's success path.
- i18n: exactly five new `addStock.correction.*` keys (`editButton`,
  `nameChangeConfirmTitle`, `nameChangeConfirmBody`,
  `sellingUnitRequiredError`, `saveError`) in pt/en/fr — nothing else
  touched. **Known, disclosed deviation:** the governance text specified
  `{old}`/`{new}` single-brace placeholders for `nameChangeConfirmBody`;
  this codebase's actual `interpolate()` (`LanguageContext.tsx`) only
  substitutes `{{param}}` double braces — confirmed against the
  dominant, working convention used throughout both locale files. Used
  `{{old}}`/`{{new}}` so the key actually substitutes at runtime; the
  human-readable wording, key name, and key count are all unchanged —
  a syntax-level correctness fix, not a content or scope change. Does
  not require a further governance amendment (the Authorization's own
  binding text authorizes the five *key names*, not a byte-exact
  interpolation delimiter).
- Tests: new dedicated `tests/add-stock-product-correction.test.ts` (25
  tests, all passing) — source-text/structural technique, same
  established convention as every other checkpoint in this Phase (no
  DOM/React render harness exists in this repo) and at parity with its
  closest precedent (`product-catalog-phase-2-checkpoint-2-unit-
  relationship-reconfiguration.test.ts`, which is likewise 100%
  structural). Not runtime/DOM-execution behavioral coverage — genuinely
  equivalent in rigor to, not weaker than, this repo's own accepted
  standard for UI-component logic in untested-by-harness files. No
  existing test file modified.
- Verification: `tsc --noEmit -p apps/tenant` and `vite build` both
  clean (identical pre-existing 2-error/warning baseline, zero new).
  `npm run test:all` — 0 failures. Full regression sweep green across
  every AddStockView/Product-Catalog-adjacent suite, including the two
  files flagged as placement-sensitive watch items during the
  Checkpoint 4 preflight (`product-configuration-ux-render-order.test.ts`,
  `product-name-similarity.test.ts`) — confirmed unaffected.
- Scope: exactly the five Checkpoint-4-authorized paths changed —
  `AddStockView.tsx`, the three locale files, and the one new test
  file. `AppContext.tsx` and every other protected file untouched.

**Governance trail for Checkpoint 4** (all in
`docs/engineering/product-catalog-phase-2-implementation-plan.md` and
`...-implementation-authorization.md`):
1. Original Plan (`6d8bd5a`) + Authorization (`69aaea9`) — Checkpoint 4
   scoped to `AddStockView.tsx` only, per Plan §I/§K.
2. Checkpoint 4 preflight audit found a Plan §D-vs-§X file-scope
   ambiguity (did Add Stock's correction need a new `AppContext.tsx`
   helper?) plus a foreseeable locale-file gap.
3. Read-only architecture investigation found `EditProductModal.tsx`
   (Checkpoint 2) already demonstrates the safe, reuse-only resolution
   — no new helper needed.
4. Product Architect selected **Family 2 — reuse existing write
   functions**.
5. Fifth Plan Amendment (`2a30b11`) + Fifth Authorization Amendment
   (`e7a36ea`) — recorded that decision, explicitly excluded
   `AppContext.tsx` from Checkpoint 4 scope, extended scope to the
   three locale files (five named keys) and the one new test file.
6. Implementation commit `c43776a`.

**Not started:** Checkpoint 5 (full Phase 2 regression sweep — no new
functional change; run every existing test file referencing any file
touched by Checkpoints 1–4). Checkpoints 1–4 are all closed.

**Still open from before this work, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) — the Owner
was mid-decision on this (always-visible text vs. InfoHint) when the
Product Catalog Phase 2 work interrupted; still needs a final answer.
