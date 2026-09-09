# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Catalog Phase 2, Checkpoint 2 (Catálogo
creation/edit) — **NOT YET IMPLEMENTED.** A governance blocker was
found and resolved partway; implementation itself has not started.
**Nothing mid-flight in source code; working tree clean.**

**What happened this session:**
1. Investigated Checkpoint 2 (baseline `473e26f`, Spec/Plan/Authorization
   all re-verified fresh, current `registerCatalogProduct`/
   `ProductCatalogView.tsx`/`EditProductModal.tsx`/`unitRelationship.ts`
   inspected).
2. **Before writing any code**, found that the Plan's own authorized
   change to `ProductCatalogView.tsx` (add unit-relationship capture,
   make `sellingPrice` optional) would break two assertions in
   `tests/product-catalog-phase-1-checkpoint-c.test.ts` — a file **not**
   in the Implementation Authorization §5 file-scope list. Stopped and
   reported the conflict rather than resolving it (per Authorization §7).
3. Drafted a narrow Implementation Plan Amendment proposal (governance-
   only, no code). Product Architect (SABUSHIMIKE MASCENI) reviewed and
   **accepted** it 2026-09-09.
4. Recorded the accepted amendment into
   `docs/engineering/product-catalog-phase-2-implementation-plan.md`
   (§C test-debt note + §X Checkpoint 2 scope clarification + new
   "Product Architect Acceptance of Implementation Plan Amendment"
   section) — doc-only change, verified against every pre-commit check
   the Owner specified (Specification/Rule 8/Authorization/
   `checkpoint-c.test.ts`/all source/tests unchanged). Committed
   (`54ef1e0`) and pushed to `main`.

**Next required governance gate — NOT yet done:** a **separate**
Implementation Authorization Amendment, signed by the Product Architect,
adding exactly one line to Authorization §5's file list:
`tests/product-catalog-phase-1-checkpoint-c.test.ts` — authorized for
change **only** as to the same two assertions named in the Plan
amendment. Until that second signature exists:
- `checkpoint-c.test.ts` MUST NOT be modified.
- Checkpoint 2 implementation MUST NOT begin.

**Once both signatures exist**, Checkpoint 2 implementation plan (already
fully worked out this session, ready to execute):
- `AppContext.tsx`: `RegisterCatalogProductParams` — make `sellingPrice`
  optional, add `unitRelationship?: UnitRelationshipProposal`.
  `registerCatalogProduct` — remove the unconditional sellingPrice-
  required throw; validate the sellingPrice/sellingUnit pairing via
  `confirmUnitRelationship` before writing; conditionally include both
  fields in the write.
- `ProductCatalogView.tsx`: add a compact multi-level unit-chain input
  (rows of unit + factorFromPrevious, "add level" button) and a
  selling-unit `<select>` scoped to entered units; make sellingPrice
  input optional (remove `required`); update `validate()`/`buildPayload()`
  accordingly.
- `EditProductModal.tsx`: replace the read-only unit-relationship display
  with an editable version (prefilled from `product.unitRelationship`);
  route relationship changes through `confirmProductUnitRelationship`
  (reused from Checkpoint 1, unmodified) with a "did it actually change"
  check to avoid redundant writes; validate the sellingPrice/sellingUnit
  pairing before either write, using the *effective* post-write
  sellingUnit (candidate's if the relationship is being written, else
  the product's existing one if left untouched) — never silently discard
  an existing relationship if the owner clears the unit rows.
- Update `tests/product-catalog-phase-1-checkpoint-b.test.ts` (already
  authorized) for the new optional-sellingPrice/unitRelationship shape.
- Update exactly the two named assertions in `checkpoint-c.test.ts`
  (once the Authorization amendment is signed) — nothing else in that
  file.
- Add new Checkpoint 2 test file covering the 21 acceptance items listed
  in the Owner's own checkpoint brief (creation without stock/price,
  price-without-unit rejection, no auto-invented sellingUnit, edit
  invariant enforcement, costPrice/SupplierWordingRelationship/
  StockBatch boundaries, etc.) — source-inspection style, matching this
  repo's established no-DOM-harness convention.

**Still open from before this interrupt, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) — the Owner
was mid-decision on this (always-visible text vs. InfoHint) when the
Product Catalog Phase 2 work interrupted; still needs a final answer.
