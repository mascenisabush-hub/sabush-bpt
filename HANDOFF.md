# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Catalog Phase 2 is **fully shipped — all five
checkpoints closed**. **Checkpoint 5 (full regression sweep) — executed
and CLOSED — CONFORMING** (authorization commit `abeeed3`; the sweep
itself produced zero functional diff, as its own definition requires).
**Nothing mid-flight; working tree clean.**

**Checkpoint 5 — what was verified (pure verification, zero product
change, per its own "Prohibited: any new functional change" boundary):**
- Touched-function inventory reconstructed from git history:
  Checkpoint 1 (`473e26f`) — `confirmProductUnitRelationship` (extended),
  `classifyUnitRelationshipChange`/`evaluateUnitRelationshipReplacement`
  (new, `lib/unitRelationship.ts`); Checkpoint 2 (`3f8676d`) —
  `registerCatalogProduct`, `EditProductModal.tsx`'s `handleSubmit`/new
  `unitRelationshipCandidateEqualsCurrent`, `ProductCatalogView.tsx`'s
  `buildUnitRelationshipPayload`/registration form; Checkpoint 3
  (`b55dff4`) — `recordStockCount` (both write branches); Checkpoint 4
  (`c43776a`) — new `AddStockProductCorrectionModal` +
  `unitRelationshipCandidateEqualsCurrent` (`AddStockView.tsx`).
- Ran the complete regression surface for all four checkpoints: both
  `product-catalog-phase-2-checkpoint-{1,2}-unit-relationship-
  reconfiguration` suites, `product-catalog-phase-1-checkpoint-{b,c,d,e}`,
  `decision-37-first-contagem-cost-removal-and-selling-price-memory`,
  `add-stock-product-correction`, every `add-stock-*`/Contagem-adjacent
  suite, `product-identity-existing-new-resolution`,
  `product-name-similarity`, `product-configuration-ux-render-order`,
  `product-memory-price-resolution`, and more — all passing, 0 failures,
  except the 2 already-known, already-documented, pre-existing failures
  in `periodic-contagem-concept-b-compaction.test.ts` (present since
  commit `8bb980d`, predating all of Checkpoints 1–4, unrelated to any
  file/function these checkpoints touched — same finding independently
  confirmed three times now, across the Checkpoint 3 closure audit, the
  Checkpoint 4 preflight, and this sweep).
- `npm run test:all`: 1168/1168 tests passing, 0 failures.
- `tsc --noEmit -p apps/tenant`: identical pre-existing 3-error baseline
  (2× `InfoHint` in `InitialStockCountView.tsx`, 1× `URL` type in
  `reportExport.ts`), 0 new errors.
- `vite build`: succeeds, same pre-existing CSS/chunk-size warnings, no
  new failures.
- Zero-diff confirmed throughout: `git status --short`/`git diff
  --name-only` empty before, during, and after the sweep. (One
  transient incident during execution: a `git checkout <commit> -- .`
  used to cross-check a pre-existing-failure baseline accidentally
  dirtied the working tree; caught immediately and reverted via `git
  checkout HEAD -- .` before proceeding — confirmed clean again, HEAD
  unchanged throughout, no commit ever touched by it.)

**Governance trail for Checkpoint 5** (all in
`docs/engineering/product-catalog-phase-2-implementation-authorization.md`):
1. Original Authorization (`69aaea9`) §4 item 5 — Checkpoint 5 defined
   as "full regression sweep... no new functional change."
2. Checkpoint 5 preflight/governance audit (chat-recorded) — confirmed
   the definition needs no amendment; the only outstanding gate was the
   Plan §X-required, checkpoint-specific review.
3. §15 — Checkpoint 5 explicit Product Architect authorization
   (`abeeed3`) — not a Plan/Authorization Amendment, a pure review-gate
   record: "CHECKPOINT 5 — AUTHORIZED TO PROCEED."
4. This regression sweep, executed per that authorization — zero
   functional diff, as required.

**What Checkpoints 1–4 shipped (condensed — see prior HANDOFF revisions
in git history, and each checkpoint's own governance trail in the Plan/
Authorization docs, for full detail):**
- **Checkpoint 1** (`473e26f`): `confirmProductUnitRelationship`
  extended with an old-state-aware replacement check (Decision 1),
  additive-only — `isValidUnitRelationship`/`confirmUnitRelationship`
  themselves untouched.
- **Checkpoint 2** (`3f8676d`): Catálogo creation (`registerCatalogProduct`)
  and edit (`EditProductModal.tsx`) — `sellingPrice` now optional,
  `unitRelationship` now capturable/editable, sellingPrice/sellingUnit
  pairing invariant enforced before every write.
- **Checkpoint 3** (`b55dff4`): Contagem's `recordStockCount` — both the
  existing-product and new-product branches now couple the sellingPrice
  write to a valid sellingUnit, closing the write-gate identified in
  Checkpoint 3's own preflight.
- **Checkpoint 4** (`c43776a`): Add Stock's new `AddStockProductCorrectionModal`
  — contextual canonical-Product correction (name/sellingPrice/
  sellingUnit/unitRelationship) for an already-matched product, reusing
  `confirmProductUnitRelationship`/`updateProduct` exactly as they exist
  (Family 2 architecture — `AppContext.tsx` untouched since Checkpoint 3),
  distinct explicit rename confirmation, relationship-before-price write
  ordering, authorization-denial handling reusing the existing
  `handleReactivateProduct` pattern.

**Not started:** none — Product Catalog Phase 2's authorized checkpoint
sequence (1–5) is complete. Any further work on this module requires a
fresh Specification/Plan/Authorization cycle, not an extension of this
one.

**Still open from before this work, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) — the Owner
was mid-decision on this (always-visible text vs. InfoHint) when the
Product Catalog Phase 2 work interrupted; still needs a final answer.
