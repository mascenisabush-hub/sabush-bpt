# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Catalog Phase 2, **Checkpoint 2 (Catálogo
creation/edit) — implemented, tested, typechecked, built, committed, and
pushed** (commit `3f8676d`). **Nothing mid-flight; working tree clean.**

**What shipped:**
- `registerCatalogProduct` (`AppContext.tsx`): `sellingPrice` now
  optional (Specification §10); new optional `unitRelationship`
  candidate, validated via `confirmUnitRelationship`; enforces the
  sellingPrice/sellingUnit pairing invariant before any write; never
  auto-invents a sellingUnit or auto-clears sellingPrice.
- `ProductCatalogView.tsx`: new unit-relationship capture UI in the
  creation form (chain of units + per-level factors + selling-unit
  select); sellingPrice now optional; client-side pairing validation
  before submit.
- `EditProductModal.tsx`: unit-relationship display is now editable
  (was read-only), routed through Checkpoint 1's
  `confirmProductUnitRelationship` — never a second confirmation
  mechanism, never a write when the candidate is unchanged, never
  silently discards an existing relationship if the owner clears all
  rows. Same pairing invariant enforced before any write.
- i18n keys added (pt/en/fr) for the new UI; nothing removed.
- Tests: `checkpoint-b.test.ts` updated for the new interface/write
  shape (fully authorized, unrestricted); `checkpoint-c.test.ts` updated
  in **exactly** the three assertion areas authorized across two
  governance amendment rounds (input count, UnitRelationship UI
  presence, `buildPayload` shape) — nothing else in that file touched;
  new dedicated file
  `product-catalog-phase-2-checkpoint-2-unit-relationship-reconfiguration.test.ts`
  covers `EditProductModal`'s new logic + cross-cutting boundaries
  (costPrice, SupplierWordingRelationship, StockBatch, Product Memory).
- Verification: `tsc --noEmit` and `npm run build` both clean (only the
  same 15 pre-existing, unrelated errors remain — confirmed via
  baseline comparison). Full regression sweep green across
  checkpoint-b/c/d/e, the new Checkpoint 2 file, and every directly
  relevant UnitRelationship/Product Memory suite.

**Governance trail for this checkpoint** (all in
`docs/engineering/product-catalog-phase-2-implementation-plan.md` and
`...-implementation-authorization.md`, each with its own signed
Product Architect acceptance record):
1. Original Plan (`6d8bd5a`) + Authorization (`69aaea9`).
2. First Plan Amendment (`54ef1e0`) + Authorization Amendment
   (`194d46d`) — checkpoint-c.test.ts's six→eight-input and
   UnitRelationship-UI-absence→presence assertions.
3. Second Plan Amendment (`df91535`) + Authorization Amendment
   (`02a2fb9`) — checkpoint-c.test.ts's `buildPayload` shape
   assertions (found only once the actual implementation existed to
   compare against).
4. Implementation commit `3f8676d`.

**Not started:** Checkpoint 3 (Contagem coupling fix), Checkpoint 4 (Add
Stock correction capability), Checkpoint 5 (full Phase 2 regression
sweep). `AddStockView.tsx`/`PeriodicStockCountView.tsx` untouched, per
Checkpoint 2's own explicit boundary — do not start Checkpoint 3 without
a fresh go-ahead.

**Still open from before this work, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) — the Owner
was mid-decision on this (always-visible text vs. InfoHint) when the
Product Catalog Phase 2 work interrupted; still needs a final answer.
