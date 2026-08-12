Business Domain Specification — Amendment

# Restock Observation Amendment

Version 1.0
**Status:** ✅ Approved (per explicit Technical Architect / Product
authorization in this session — see the task's own "Controlled
Implementation Authorization" instructions, Part 3/23).
**Amends:** [Stock Batches (spec #5)](./05-stock-batches.md) —
additively. Spec #5's existing rules (price freezing, one-open-batch-
per-product, immutability) are entirely unchanged by this amendment;
see Part 5 below for the exact, single additive field.
**Touches, without amending:** [Products (spec #3)](./03-products.md)
— no change to Product Memory behavior (autocomplete, price prefill,
zero-stock persistence), all of which is already implemented and
already covered by that spec. This amendment adds no new Product
field and creates no new collection.
**Explicitly does not touch:** Business Worth Engine (spec #2),
Embedded Profit Engine (spec #6), Stock Counts (spec #10), Quebras
(spec #7), Initial Stock Count. See Part 6.

---

## Why this document exists

`docs/specs/03-products.md` and `docs/specs/05-stock-batches.md`
already establish that a Product's identity and reference price
survive independently of stock quantity, and that Stock Batch entry
already prefills the latest known cost/sell price for an existing
product. What neither spec authorizes is a mechanism to record a
physical observation — "how much was left right before this new
purchase arrived" — and derive a neutral movement figure from it. This
amendment authorizes exactly that, and nothing else.

## Part 1 — Purpose

Let the operator optionally record, at the moment of restocking an
**existing** product, how much of it physically remained immediately
before the new Stock Batch arrived. Where both the previous cycle's
quantity and this new observation are known, the system computes a
neutral **Observed Stock Movement** figure. This is evidence about
inventory behavior, not a sales record.

## Part 2 — Business Problem

SABUSH BPT deliberately records no sales/POS ledger (Architecture's
own non-goal, referenced throughout `types.ts`). This means there is
currently no way for an owner to get even an approximate signal of
"how fast is this actually moving" between two purchases of the same
product — the only two facts on record are the quantities of each
purchase itself. A physical count taken at restock time closes part of
that gap without requiring the platform to become a POS.

## Part 3 — Business Rules

**Optional, physical-observation input, never inferred**
- The operator provides `previousRemainingQuantity` directly, or
  declines ("I don't know" / left blank). The system never defaults
  this to `0` or any other value — unknown remains unknown, exactly as
  Architecture's existing quantity-semantics discipline already
  requires for `InitialStockPriceChangeEvent.quantityRemaining`
  (`types.ts`'s own governing comment on that field applies here by
  direct analogy).

**Movement is neutral, never a sales figure**
- `movement = previousCycleQuantity − previousRemainingQuantity`,
  computed only when both operands are known non-negative numbers.
- The UI-facing and code-facing term is always **"Observed Stock
  Movement"** (or the exact Portuguese equivalent used in the
  translations, e.g. "Movimento de Stock Observado"). It is never
  labelled sales, units sold, revenue, or profit, anywhere — comments,
  variable names, translation strings, or UI copy.
- Movement may reflect sales, spoilage, internal use, theft, transfer,
  or counting error. The system never attributes it to any single
  cause.

**Existing-product-only**
- The field is offered only when the operator has selected/typed an
  exact match against an existing Product. A brand-new product never
  shows or requires this field, and never receives a
  `restockObservation` — there is no previous cycle for it to compare
  against.
- Per the task's explicit instruction (Part 8): the field's
  availability is **not** gated on the product's current stock being
  zero. It is available for any existing-product restock, whether or
  not the product currently has remaining stock — no additional
  gating beyond "this is an existing product" is introduced.

**Historical immutability preserved**
- `restockObservation` is written once, at the same moment as the new
  Stock Batch's other fields, and is never edited afterward — same
  immutability posture as `costPrice`/`sellingPrice` on that same
  batch (spec #5's own Business Rules).

**No financial impact**
- `restockObservation` is never read by `calculations.ts`, never a
  Business Worth/Embedded Profit/Stock Value input, and never
  reconciled against Stock Counts. See Part 6.

## Part 4 — User Stories

- As a **Business Owner restocking a product I've sold before**, I
  want to note how much was physically left before this delivery
  arrived, so I get a rough signal of how that product is moving,
  without SABUSH pretending to track my actual sales.
- As a **Business Owner who doesn't know or didn't count**, I want to
  skip this entirely without being blocked or nagged, so the core Add
  Stock flow stays exactly as fast as it already is.

## Part 5 — Data Model

No new collection. One new **optional** field on the existing
`StockBatch` (`src/types.ts`):

```ts
export interface StockBatchRestockObservation {
  previousRemainingQuantity: number;
  movement: number;
  observedAt: string; // ISO string, same convention as StockBatch.createdAt
}

export interface StockBatch {
  // ...existing fields, entirely unchanged...
  restockObservation?: StockBatchRestockObservation;
}
```

Absent on every batch created before this amendment and on any batch
where the operator declined to provide the observation — never
backfilled, matching this repository's existing convention for every
other optional/additive field (`purchaseBatchId`, `supplierId`,
`sellingPrice` on `StockCountItem`, etc.).

## Part 6 — Explicitly Out of Scope / Unaffected

- **Business Worth, Capital Growth, Embedded Profit, Expected Current
  Stock Value** (`calculations.ts`): zero references to
  `restockObservation` anywhere in these functions. This amendment
  adds no calculation input.
- **Stock Counts / Initial Stock Count**: no previous cycle exists for
  an initial baseline; this amendment does not touch
  `InitialStockCountView`, `InitialStockDraft`, or `StockCount`.
- **Quebra**: `restockObservation` is never converted into, or
  reconciled against, a Quebra record. A Quebra remains the only
  mechanism for explicitly recorded loss.
- **Fix #10 concurrency (`openBatchLocks`)**: this amendment adds a
  field to the same document `addStockBatch`'s existing transaction
  already writes (the new batch itself) — it introduces no new read,
  no new write target, and no change to `computeBatchIdsToCheck` /
  `computeBatchesToClose`. The transaction's read-then-write structure
  is unchanged.
- **`addMultipleStockBatches`**: extended additively (each line item
  may carry its own `restockObservation`), using the exact same
  plain-`WriteBatch` write pattern it already uses for every other
  per-item field. This does not add, remove, or alter any
  transactional guarantee this function has or lacks today — see that
  function's own implementation report for its pre-existing
  concurrency posture, which this amendment does not change.

## Part 7 — Functional Requirements

1. `AddStockView` shows an optional "Stock remaining before this
   restock" input, with an explicit "I don't know" affordance, only
   when the typed/selected product name exactly (case-insensitively)
   matches an existing Product.
2. Leaving the field blank or choosing "I don't know" allows the
   restock to proceed normally and persists no `restockObservation`.
3. `addStockBatch` and `addMultipleStockBatches` compute
   `movement` and attach `restockObservation` to the new batch only
   when a valid `previousRemainingQuantity` was supplied.
4. The "previous cycle quantity" used in the movement calculation is
   the most recent prior batch's `quantity` for that product (the same
   batch whose price already prefills the form) — never invented, and
   never used if no prior batch exists (i.e. never applicable to a
   brand-new product).
5. No UI surface, report, or calculation ever labels this figure as
   sales, units sold, revenue, or profit.

## Part 8 — Acceptance Criteria

- [ ] A brand-new product's Add Stock flow shows no
      previous-remaining-quantity field and never persists a
      `restockObservation`.
- [ ] An existing product's Add Stock flow shows the optional field,
      regardless of current stock level.
- [ ] Declining the field never blocks the restock and never persists
      `0` or any other inferred value.
- [ ] A known previous remaining quantity produces a correctly
      computed, neutrally-labelled `restockObservation` on the new
      batch only.
- [ ] No existing batch is ever mutated by this feature.
- [ ] Business Worth, Embedded Profit, and Stock Value figures are
      byte-for-byte unchanged before and after this amendment for any
      existing data (verified: no code path added to
      `calculations.ts`).
- [ ] Fix #10's existing test suite passes unmodified.

## Part 9 — Future Enhancements

*Ideas — not implementation, not authorized by this amendment.*

- Surfacing `restockObservation` history on Product Detail or a
  dedicated report (explicitly deferred — see the implementation
  report's Part 18/"scope decision" flag).
- Any fast/slow-moving classification or ranking derived from
  accumulated movement observations (explicitly out of scope, per the
  originating task's own "do not over-implement" instruction).
