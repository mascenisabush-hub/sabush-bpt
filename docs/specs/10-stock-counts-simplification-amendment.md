Business Domain Specification — Amendment

# Stock Count Simplification Amendment

Version 1.0 (Approved)
**Status:** Approved. See Implementation Status, below.
**Amends:** [Stock Counts (spec #10)](./10-stock-counts.md), further to
the [Expected Current Stock Value & Persistent Initial Stock
Amendment](./10-expected-stock-value-amendment.md) (v1.0, Approved) and
the [Initial Stock Valuation History Amendment](./10-initial-stock-valuation-history-amendment.md)
(v1.0, Approved) — both of which remain entirely unchanged by this
document.
**Authorized by:** [BDR-0009 — Stock Count as a Physical Observation
Event](./BDR-0009-stock-count-physical-observation.md), which this
amendment operationalizes into functional requirements and UX.
**Grounded in:** [Stock Count Simplification Discovery Report](./stock-count-simplification-discovery.md).
**Touches, without amending:** [Products (spec #3)](./03-products.md)
— reuses its existing autocomplete/pre-fill pattern
(`AddStockView.tsx`) verbatim; introduces no new Product field, no
archive/soft-delete state, and no new collection.
**Explicitly does not touch:** Business Worth Engine (spec #2),
Embedded Profit Engine (spec #6), Restock Observation Amendment (spec
#5), Expected Current Stock Value's own comparison mechanics (touched
only insofar as BDR-0009 Part 5 sets a boundary on it — the figure
itself, its formula, and its persistence are unchanged).

---

## Why this document exists

Spec #10's two existing entry screens (`InitialStockCountView.tsx`,
`PeriodicStockCountView.tsx`) require the operator to manually re-type
every product name, unit, purchase price, and selling price on every
count, for products that already exist in full in the catalog
(Discovery Report Part 1). This amendment specifies how Contagem
adopts the autocomplete/pre-fill pattern spec #3 already established
for Stock Entry (`AddStockView.tsx`), while adding a default
"pre-populate every active product" behavior Stock Entry itself does
not need (Stock Entry is inherently one-product-at-a-time; Stock Count
is inherently whole-catalog).

## Part 1 — Screen Behavior: Default Active-Product Population

**Decision: approved as specified, per BDR-0009 Part 2.4.**

When the operator opens a periodic Contagem, the screen pre-populates
one row per **active product** (BDR-0009 Part 3: every `Product`
document currently in the business's `products` collection), each row
showing:

```
Product name   |  Unit  |  Purchase price  |  Selling price  |  Quantity [ ]
```

- `Product name`, `Unit`, `Purchase price`, `Selling price` are
  pre-filled from the `Product` catalog record's reference metadata —
  read-only display text on the default row, not re-typed.
- `Quantity` is the one field the operator interacts with by default.
  It starts **blank** (not `0` — see Part 3).
- The pre-filled reference price is a **starting value**, not locked —
  the operator may still edit `Unit`/`Purchase price`/`Selling price`
  on a per-row basis if the physical reality at count time genuinely
  differs (e.g., a supplier price change not yet reflected in the
  catalog), mirroring `AddStockView.tsx`'s own "editable, never locked"
  rule (spec #3, Functional Requirement #4). Editing here updates only
  this `StockCountItem` snapshot — it never writes back to the
  `Product` catalog record.
- The operator may still add a row for a product not in the pre-filled
  list (a product genuinely new to the catalog, or a rare edge case
  the default list missed), using the existing autocomplete-or-create
  pattern from `AddStockView.tsx` — this is additive, not a
  replacement for the default population.
- The operator may remove a pre-filled row from the working list
  entirely (distinct from entering `0` — removing means "I am not
  counting this product in this session at all," not "I counted zero
  of it"). A removed row is treated identically to a row that was
  never in the default list — see Part 5 for how this interacts with
  partial-count reporting.

**Initial Stock Count is unaffected by this Part.** `InitialStockCountView.tsx`
inherently has no pre-existing catalog to draw from for a business's
very first count — this Part applies to periodic counts only. (A
business's *second* periodic count, however, benefits fully, since the
initial count's items already created `Product` catalog entries.)

## Part 2 — Product Metadata Display

**Decision: approved as specified, per BDR-0009 Part 2.5.**

Reference `costPrice`/`sellingPrice`/`unit` shown on each pre-filled
row are read directly from the live `Product` record via the existing
`AppContext.products` array — the same in-memory source
`AddStockView.tsx` already reads, introducing no new fetch pattern
(Discovery Report Part 1, Part 13's Non-functional Requirements
precedent). If a `Product` record has no reference price set
(`costPrice`/`sellingPrice` are optional on `Product`, `types.ts` line
274–285), the corresponding field is shown blank/empty on the
pre-filled row, and the operator may fill it in — this is not an
error state.

## Part 3 — Quantity Input: Zero vs. Blank

**Decision: approved as specified, per BDR-0009 Part 4.**

- Every pre-filled row's `Quantity` field starts **blank**.
- The operator may explicitly type `0` — recorded as "counted,
  confirmed absent."
- A blank `Quantity` field is never coerced to `0` at any point:
  not while the operator is filling the form, not in any local
  autosave/draft mechanism this amendment might introduce, and not at
  final save.
- UI must visually distinguish a `0`-quantity row from a blank one —
  e.g., a blank field shows placeholder text ("Ainda não contado" / "Not
  yet counted"), never a greyed-out `0`.

## Part 4 — Validation and Save/Finalization

**Decision: approved as specified.**

- A row with a blank `Quantity` is **not** included in
  `StockCount.items` at save time, and does not contribute to
  `totalValue`.
- A row with `Quantity = 0` **is** included, with `totalValue: 0` for
  that item (`0 × costPrice`), exactly as straightforward
  multiplication already produces today.
- Saving requires at least one product with a non-blank quantity
  (reuses the existing `recordStockCount` guard: "Adicione pelo menos
  um produto à contagem" — unchanged).
- No item-level expected-quantity field, comparison, or variance is
  computed, stored, or displayed for any individual row, at any point
  in this flow — per BDR-0009 Part 2.2/2.3, absolute, no exceptions.

## Part 5 — Partial Counts: Counted vs. Not Counted

**Decision: approved as specified.**

A periodic Contagem **may** be finalized while some pre-filled
products remain blank. This is a deliberate choice given the
Discovery Report's Part 13 finding that a business could have
hundreds of active products, and forcing every single one to be
touched before any count can be saved would make the simplification
counterproductive for exactly the businesses it's meant to help most.

- At finalization, the operator sees an explicit summary before
  confirming: **"N products counted, M products not counted"** — this
  is a required confirmation step, not a silent pass-through, so an
  incomplete count is never accidentally mistaken for a complete one.
- The resulting Stock Count report (Part 8) lists Counted and Not
  Counted products as clearly separate sections. Not Counted products
  are never included in any total, and are never rendered with an
  implied `0` — they are listed by name only, under their own heading.
- A product removed from the working list entirely (Part 1) is treated
  as Not Counted for this purpose — there is no third bucket.
- This does not change how many *periodic* counts a business may
  record, and does not touch the separate, existing `initial` count
  singleton rule (`hasInitialStockCount`) — unaffected by this Part.

## Part 6 — Product Not Yet in Catalog

**Decision: approved as specified.**

The existing find-or-create-by-case-insensitive-name pattern
(`recordStockCount`, `AppContext.tsx` lines 2015–2032) is unchanged and
continues to apply to any row — pre-filled or manually added — whose
`productName` doesn't match an existing `Product` exactly. This
amendment adds no new product-creation path; it only changes how the
*existing* catalog is surfaced before the operator starts typing.

## Part 7 — Report Generation

**Decision: approved as specified, per BDR-0009 Part 2.7.**

The Stock Count report structure:

```
STOCK COUNT REPORT

Business: [name]     Shop: [active business/shop]
Count date: [date]   Performed by: [operator name]

COUNTED PRODUCTS
--------------------------------------------------
Product | Unit | Purchase Price | Selling Price | Quantity | Purchase Value | Selling Value
--------------------------------------------------
...one row per StockCountItem with non-blank quantity...

Totals:
  Total Products Counted:        [count]
  Total Physical Units:          [sum of quantity]
  Total Physical Purchase Value: [sum of costPrice × quantity]
  Total Physical Selling Value:  [sum of sellingPrice × quantity, where sellingPrice present]

NOT COUNTED PRODUCTS (if any)
--------------------------------------------------
[product name list only — no price, no quantity, no implied value]
```

- `Purchase Value` / `Selling Value` per row and in totals are computed
  exactly as `StockCountItem.totalValue` and its sum already are today
  — no new calculation is introduced, only new UI/report surface for
  numbers the data model already produces.
- **The existing aggregate Expected Current Stock Value comparison
  (spec #10's Amendment v1.0) continues to appear on this report
  exactly as it does today** — as one whole-business total compared
  against the report's own "Total Physical Purchase Value," never
  decomposed per product — per BDR-0009 Part 5's explicit, bounded
  exception. No wording change to that existing comparison is proposed
  by this amendment.
- Forbidden terminology, absolute: "Expected Stock" (at item level),
  "Stock Difference" (at item level), "Estimated Sales," "Stock Loss,"
  or any per-product framing implying the system knows what should
  have been there. This restates BDR-0009 Part 2.2/2.3 at the report
  level specifically, since a report is the artifact most likely to be
  shared, printed, or scrutinized after the fact.

## Part 8 — Historical Record Behavior

**Decision: approved as specified — restates existing behavior, does
not change it.**

Per Discovery Report Part 3: `StockCountItem` is already a flat,
self-contained snapshot with no live reference back to `Product` or
`StockBatch`. This amendment's pre-fill behavior (Part 1–2) only
changes what value a field *starts at* when the operator opens the
form — it does not change what gets persisted or how. A completed
Stock Count, once saved, is exactly as immune to a later product-price
edit as it is today. No new field is added to `StockCountItem` or
`StockCount` by this amendment.

## Part 9 — Multi-Shop Behavior

**Decision: approved as specified — restates existing behavior, does
not change it.**

The pre-filled product list is read from `AppContext.products`, which
is already scoped to `activeBusinessId`. No new query, fetch, or
cross-business read is introduced. Switching the active business/shop
before opening Contagem naturally yields that shop's own product list
and its own Stock Count history, via the existing
`businesses/{businessId}/...` isolation — unchanged.

## Part 10 — Permissions

**Decision: approved as specified — restates existing behavior, does
not change it.**

Recording a periodic Stock Count remains Owner-only, per spec #10's
existing Users table and `firestore.rules`' `stockCounts` `create`
rule (`isOwnerOf(businessId)`). This amendment changes what the Owner
sees pre-filled on the form; it does not change who may submit it.

## Part 11 — Mobile Usability and Accessibility

**Decision: approved as specified.**

- The pre-filled product list must use the same mobile row-collapse
  pattern spec #10 already documents as a positive precedent
  (`rowGridClass`, both existing views — Non-functional Requirements,
  Mobile) — stacked, labeled pairs below the `sm` breakpoint, not
  simple truncation.
- Given the Discovery Report's Part 13 finding that a business could
  have hundreds of active products, the default list must support, at
  minimum, an in-page text filter (matching `AddStockView.tsx`'s
  existing per-keystroke, in-memory filter pattern — no new query
  pattern is introduced, spec #3's own Non-functional Requirement
  precedent applies directly). Category-based filtering and
  pagination/virtualized rendering are named as Future Enhancements
  (Part 13, below) rather than required for this amendment's initial
  scope, to avoid over-engineering ahead of a real usage signal.
- Numeric fields (`Quantity`, prices) use `.type-number`/tabular-nums,
  matching every other entry form in this series.
- The blank-vs-zero distinction (Part 3) must not rely on color alone
  — placeholder text is the primary signal, consistent with spec #10's
  existing accessibility pattern of pairing color with a non-color
  signal.

## Part 12 — Error Handling

**Decision: approved as specified.**

- If the `products` catalog fails to load (network/Firestore error),
  the screen must not silently present an empty list as if the
  business has no active products — it must show an explicit error
  state distinct from "zero active products," with a retry action.
- All existing `recordStockCount` error paths (no items, initial count
  already exists, etc.) are unchanged by this amendment.

## Part 13 — Future Enhancements

*Ideas — not implementation, not authorized by this amendment.*

- Category-based filtering of the default product list, for
  businesses whose catalog spans many categories.
- Virtualized/paginated rendering for catalogs in the hundreds/
  thousands of products (Discovery Report Part 13's named open risk).
- A "products not counted in the last N cycles" highlight, to help an
  Owner notice a product that keeps getting skipped — explicitly a UX
  nudge, not an expected-quantity calculation, and would need its own
  BDR-0009-compatibility check before being scoped.
- Photo attachment per count, mirroring spec #7's (Quebras) and spec
  #10's own already-named future idea.

## Part 14 — Implementation Status

**Approved for implementation.** Product Architect approval received
for the governance package (this document, the Discovery Report, and
BDR-0009). Implementation of Parts 1–12 above proceeds under a
separate, controlled implementation task, subject to that task's own
build/typecheck/test/scope-audit gates before anything is committed or
pushed.

## Part 15 — Explicit Non-Goals of This Amendment

Restated here so a future reader does not have to reconstruct scope
from the diff:

- Does not introduce any item-level expected quantity, expected value,
  or sales-inference calculation, anywhere (BDR-0009 Part 2.2/2.3,
  absolute).
- Does not modify, rename, or remove the existing aggregate Expected
  Current Stock Value comparison (BDR-0009 Part 5's bounded exception).
- Does not introduce a Product archive/soft-delete capability.
- Does not introduce unit-of-measure conversion logic.
- Does not change Business Worth, Capital Growth, or Embedded Profit.
- Does not change who may record a Stock Count (Owner-only, unchanged).
- Does not touch the `initial` Stock Count singleton rule, its
  immutability, or its Draft → Editable → Confirmed workflow
  (spec #10's Amendment v1.0) — this amendment applies to the
  *periodic* Contagem flow only, though a future business would
  naturally benefit from the same pre-fill pattern once the initial
  count has seeded the catalog.
- Does not localize the two Stock Count views — spec #10's own
  separately-named, still-open Functional Requirement #7 remains
  exactly that: open, and out of scope here.
