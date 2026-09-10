# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Track A — Existing-Product Stock Entry Purchase Authority —
implemented, verified, **ready to commit**. Working tree currently
holds the full implementation (not yet committed as of this HANDOFF
revision; commit this alongside it).

**Governance trail (full chain, all in `docs/specs/`/`docs/engineering/`):**
1. Policy — `docs/specs/POL-pending-existing-product-stock-entry-purchase-authority.md`
   (Accepted, Product Architect SABUSHIMIKE MASCENI, 2026-09-10), operationalizing
   `BDR-0012` §3 for Add Stock's existing-product screen.
2. Rule 8 Assessment — chat-recorded, result: `READY FOR IMPLEMENTATION PLANNING`.
3. Implementation Plan — `docs/engineering/track-a-existing-product-stock-entry-purchase-authority-implementation-plan.md`.
4. Implementation Authorization — `docs/engineering/track-a-existing-product-stock-entry-purchase-authority-implementation-authorization.md`
   (signed, `APPROVED FOR IMPLEMENTATION`, scope strictly `AddStockView.tsx`'s
   five named functions + the two previously-identified test files).
5. **This implementation**, executed strictly within that authorized scope.

**What changed (`apps/tenant/src/components/AddStockView.tsx` only):**
- `buildProductMemoryAutofill`, `createEmptyRow` (row-creation site): purchase
  unit/cost no longer default from `findLatestRememberedProductMemory` or
  `Product.costPrice` — both stay at the generic default/blank until the
  current purchase actually supplies them. Selling-price resolution
  (canonical Product Memory first, historical fallback otherwise) is
  byte-for-byte unchanged.
- `handleConfirmSupplierWordingCandidate`, `buildRowFromProposalLineItem`:
  same purchase-side defaulting removed; `buildRowFromProposalLineItem`'s
  OCR-silence unit fallback (defaulting to the latest StockBatch's own unit
  when OCR supplied none) also removed, per explicit Product Architect
  direction. OCR's own initial-value priority is untouched.
- `handleUnitChange`: the cost-conversion branch is removed entirely — a
  purchase cost is never re-derived on a unit change. This closes the
  specific fabrication risk identified in the Rule 8 Assessment (R8-E): an
  OCR-supplied, unconfirmed cost (e.g. `2 Un @ 1,000 MZN/Un`, unit corrected
  to `Cx`) previously got silently converted through the product's confirmed
  relationship into a fabricated new figure (`24,000`); it now stays exactly
  as OCR read it, visibly wrong, until the operator retypes it from the
  receipt. The selling-price re-derivation branch is untouched.

**Explicitly NOT touched** (per the Authorization's own boundary,
confirmed by `git diff --stat`): `purchaseToSellingConversion.ts`,
`productMemoryPriceResolution.ts` (only its consumption at the five
AddStockView sites changed, not its own implementation), `AppContext.tsx`
(`addMultipleStockBatches`, `StockBatch` persistence, and the FR-86
`Product.costPrice` forward-maintenance mechanism are all unmodified —
confirmed present and unchanged by a dedicated new test), `StockCountItem`,
Contagem, Catalog, Product Recognition, SupplierWordingRelationship,
Business Worth formulas, `firestore.rules`.

**Verification performed this session:**
- `npx tsc --noEmit -p apps/tenant`: identical pre-existing 3-error baseline
  (2× `InfoHint` in `InitialStockCountView.tsx`, 1× `URL` type in
  `reportExport.ts`), 0 new errors.
- Direct run of every relevant test file (`add-stock-cost-selling-unit-
  conflation-bugfix`, `add-stock-mobile-caption-and-candidate-price-fill`,
  `add-stock-similar-product-suggestions`, `add-stock-typing-and-autofill-
  bugfix`, `add-stock-unit-aware-price-rederivation`, `price-deviation-
  check`, `product-memory-price-resolution`, `supplier-wording-add-stock`):
  128/128 passing after updating four assertions in three files that
  directly encoded the now-removed purchase-side defaulting (Track A's own
  intended behavior change, not a regression).
- `price-deviation-warning-wiring.test.ts`: 2 failures, confirmed
  **pre-existing and unrelated** — reproduced identically via `git stash`
  against the unmodified baseline; both concern `PeriodicStockCountView.tsx`
  (Contagem), a file this change never touches.
- New dedicated suite added: `tests/track-a-existing-product-purchase-
  authority.test.ts` (10 tests) — proves purchase unit/cost are never
  sourced from historical memory/`Product.costPrice` at any of the five
  sites, `handleUnitChange` never re-derives cost, the selling-side
  conversion engine still produces the exact worked example (`2 Cx`,
  `1 Cx = 24 Un`, `65 MZN/Un` → `3,120 MZN` via the real `calculateBatch`),
  and FR-86's forward write is untouched while the reverse read is gone.
- `npm run test:all`: 63/63 suites, 0 failures.
- `npm run build`: succeeds, same pre-existing CSS/chunk-size warnings, no
  new failures.
- `git diff --stat` reviewed against the Authorization's file list: exactly
  `AddStockView.tsx` + three updated test files + one new test file — no
  unlisted file touched.

**Not started:** none for Track A — all twelve acceptance criteria from the
Implementation Authorization are satisfied by this implementation. Track B
(New Product / first-time Product creation, its own unresolved FR-85
question) remains a separate, not-yet-started track.

**Still open from before this work, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts`/`price-deviation-warning-
wiring.test.ts` `PeriodicStockCountView.tsx` pre-existing failures — the
Owner was mid-decision on this (always-visible text vs. `InfoHint`) before
this session; still needs a final answer, unrelated to Track A.
