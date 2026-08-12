Discovery Report — Not a Business Domain Specification

# Stock Count Simplification — Discovery Report

**Status:** Investigation only. No code, Firestore rule, calculation,
test, or governance document referenced here has been changed to
implement anything. This document is the evidence base the companion
[BDR-0009](./BDR-0009-stock-count-physical-observation.md) and
[Amendment](./10-stock-counts-simplification-amendment.md) are built
from.
**Investigated:** Repository as of commit `4ac0c75` (branch `main`).
**Scope of investigation:** `docs/specs/10-stock-counts.md` and its two
existing amendments, `docs/specs/03-products.md`,
`docs/specs/05-stock-batches.md`,
`docs/specs/05-restock-observation-amendment.md`, `src/types.ts`,
`src/context/AppContext.tsx` (`recordStockCount`,
`deleteProduct`/`planDeleteProduct`), `src/components/
PeriodicStockCountView.tsx`, `src/components/InitialStockCountView.tsx`,
`src/components/AddStockView.tsx`, `firestore.rules`.

---

## 1. Current Stock Count UX — confirmed, not assumed

`PeriodicStockCountView.tsx` and `InitialStockCountView.tsx` are both
**fully manual, free-text entry forms**. Neither file reads the
`products` array from `AppContext` at all — a direct `grep` for
`products`, `datalist`, or `autocomplete` in
`PeriodicStockCountView.tsx` returns zero matches. Every row starts
empty (`createEmptyRow()`): `productName`, `quantity`, `unit`,
`costPrice`, `sellingPrice` are all typed from scratch by the operator,
every time, for every product, even for a product counted in every
prior cycle.

This is the exact pain point the governance task describes. It is not
a hypothesis — it is what the code does today.

## 2. The reusable pattern already exists elsewhere in this codebase

`AddStockView.tsx` (Stock Entry, spec #4/#5) already implements exactly
the UX Stock Count needs:

- An autocomplete input filters the existing `products` array as the
  operator types (`filteredProducts = products.filter(p =>
  p.name.toLowerCase().includes(searchLower))`, `AddStockView.tsx`
  ~line 1255).
- Selecting an existing product from the dropdown
  (`handleSelectProductForTool`) is visually distinguished from the
  "create new" option, which only appears when no exact
  case-insensitive match exists (~lines 1306, 1613).
- Spec #3 (Products) already documents this as an approved,
  implemented pattern: Functional Requirements #3–#4 — "Support
  product lookup/autocomplete during Stock Entry... On selecting an
  existing product... pre-fill that product's reference
  `costPrice`/`sellingPrice`."

**Implication for this task:** the governance task's core ask — "the
system remembers the product, the operator counts what's physically
there" — does not require inventing new UX. It requires **applying an
already-approved, already-implemented pattern to a second screen that
never adopted it.** This significantly lowers both the design risk and
the implementation cost of what's being asked for.

## 3. Data model — what a Stock Count actually records

`StockCountItem` (`src/types.ts` lines 379–398) is a **flat,
self-contained snapshot**, not a live reference:

```
productId, productName, quantity, unit, costPrice, sellingPrice?, totalValue
```

Every field is copied at count time. There is no `batchId` and no live
join back to `StockBatch` or the live `Product` record.
`recordStockCount` (`AppContext.tsx` lines 1991–2045) writes exactly
what its caller passed it — nothing is recalculated from current
product prices after the fact.

**This already satisfies the governance task's Part 8 (Historical
Integrity) requirement without any new work.** A completed Stock Count
is already immune to a later product price edit, because the price
was never a reference — it was copied. If the simplification feature
pre-fills `costPrice`/`sellingPrice` from the current `Product` record
at the moment the operator opens Contagem, that pre-filled value still
gets *copied* into `StockCountItem` at save time, same as it does
today for whatever the operator typed manually. No architecture
change is needed to preserve this guarantee — only care that the
pre-fill is a starting value, not a live-bound one, matching how
`AddStockView.tsx`'s own pre-fill already behaves (Products spec #3,
Functional Requirement #4: "pre-fill... as a starting point — editable,
never locked to the reference value").

## 4. Active / existing product — no explicit field exists

`Product` (`src/types.ts` lines 274–285) has **no `active`,
`archived`, or `deleted` field of any kind.** Confirmed by direct
inspection of the interface and by `grep` across `AppContext.tsx` and
`types.ts` — the only `archived` field in the entire schema belongs to
`PurchaseBatch` (spec #4's own archive/unarchive action), which is
unrelated to `Product`.

`deleteProduct` (`AppContext.tsx` line 2684, planned by
`src/utils/deleteProductPlan.ts`) is a **hard delete**: it removes the
`Product` document and, in the same operation, every `StockBatch` and
Quebra ever recorded against it. There is no soft-delete, archive, or
"hide from lists" state for a product anywhere in the current system.

**Conclusion, not invented:** "active product," for the purpose of
this feature, can only mean **"currently exists in the business's
`products` collection."** There is no second signal to layer on top
of that — a product either exists (and should appear in the default
Stock Count list) or it has been permanently deleted (and cannot
appear, because it no longer exists anywhere). This matches the
governance task's own Part 9 instruction: "If the current architecture
has no explicit 'active' field, document what the current system
actually uses."

## 5. Zero-stock products remain in the catalog — confirmed

Because `Product` records are catalog identity, not stock quantity
(spec #3's central rule: "Products... explicitly *not* becoming a
place where financial figures live"), a product whose `StockBatch`
`remainingQuantity` has reached zero is untouched — it remains in the
`products` collection exactly as before. It only disappears from the
catalog if an Owner explicitly runs the destructive `deleteProduct`
flow. This confirms the governance task's Part 10 assumption is
already true of the existing data model — no design change is needed
to make zero-stock products "stick around."

## 6. Multi-shop / tenant isolation — already comprehensive, reusable as-is

Every collection relevant to this feature (`products`, `stockCounts`,
`stockCountDrafts`) is scoped
`businesses/{businessId}/{collection}/{docId}` in Firestore, gated by
`isMemberOf(businessId)` / `isOwnerOf(businessId)`
(`firestore.rules` lines 261–265, 378–400). `AppContext`'s in-memory
`products` and `stockCounts` arrays are already loaded scoped to
`activeBusinessId`. A Stock Count simplification screen that reads
`products` from the existing context, as `AddStockView.tsx` already
does, inherits this isolation automatically — there is no new
cross-shop leak surface to design against, provided the new UI is
built the same way the existing Add Stock screen already is (reading
from `AppContext`, never a second, parallel product fetch).

## 7. Unit of measure — no conversion logic exists; none is implied

`StockBatch.unit` and `StockCountItem.unit` are both free-form optional
strings (`un`, `cx`, `kg`, `saco`, etc. — `getSuggestedUnitsForCategory`
supplies category-appropriate suggestions, not a fixed enum). No
conversion table or normalization logic exists anywhere in
`calculations.ts` or `AppContext.tsx`. A simplified Stock Count screen
that pre-fills `unit` from the Product's own most recent `StockBatch`
or reference record introduces no new unit-conversion surface — it
displays existing free-text unit strings unchanged, exactly as
`AddStockView.tsx` already does.

## 8. Critical finding — a real tension with the task's "no Expected Quantity" instruction

This is the single most consequential finding in this investigation
and is reported, not resolved, per the governance task's own
instruction to stop and report conflicts rather than deciding them
unilaterally.

**`docs/specs/10-expected-stock-value-amendment.md` (v1.0, ✅ Approved,
implemented) already introduced an "Expected Current Stock Value"
figure that every periodic Stock Count compares against**, persisted
per-count as `expectedValueAtCount` (`StockCount.expectedValueAtCount`,
`types.ts` line 415). Concretely:

```
Expected Current Stock Value =
  Confirmed Initial Capital
  + cost value of governed StockBatch inventory (at current remaining quantity)
```

`PeriodicStockCountView.tsx` reads this directly
(`expectedCurrentStockValue` from `useApp()`) and computes `diff =
totalValue - comparisonBaseline` — a real, currently-shipping "what
the system thinks should be here" figure, shown against the physical
count, on the exact screen this task is asking to simplify.

**Why this is not necessarily a violation of the new instruction, but
needs an explicit decision:**

- It is **not item-level**. It never says "Product X: expected 100,
  counted 72, difference −28." It is one aggregate number
  (total cost value across the whole business) compared to one other
  aggregate number (total physical count value). The governance task's
  Part 6 example that must never appear (`Expected: 100 / Counted: 72
  / Sales/Loss: 28`) is a per-product, sales-inferring calculation —
  this figure is neither per-product nor sales-inferring.
- It is **not sales-inferred**. `totalInvestmentValueAllTime` is
  purchase-cost value netted only against recorded Quebra
  (`remainingQuantity = quantity − totalQuebraQuantity`,
  `calculations.ts`) — it does **not** subtract any sales figure,
  because none is ever recorded. In practice this means Expected
  Current Stock Value will typically *overstate* true physical stock
  (it assumes nothing has sold), which is the opposite failure mode of
  a POS-style "expected remaining after sales" figure — but it is
  still, definitionally, a system-calculated "what should be here"
  number sitting next to a physical count on the same screen.
- The existing amendment is explicit that this variance is "neutral
  diagnostic information... never labeled loss, shrinkage, theft, or
  error anywhere in the UI or the data model" (Part 4) — which is
  consistent in spirit with this task's Part 21 Trust Test, but was
  decided under a different, earlier governance pass that did not have
  this task's explicit "no Expected Quantity, ever, unless separately
  approved" instruction in front of it.

**This investigation does not recommend removing, renaming, or
otherwise touching Expected Current Stock Value** — it is a separate,
already-approved, already-shipped capability, out of this task's
authorized scope (the task authorizes investigation and specification
of the *simplification workflow* only). But the Product Architect
should make an explicit call, recorded in BDR-0009, on exactly one
question: **does the simplified Contagem screen continue to display
the existing aggregate Expected Current Stock Value comparison exactly
as it does today, unchanged, alongside the new pre-filled product
list?** The draft BDR takes the position that it should — on the
grounds that it is aggregate, neutral, and already-approved, not a new
per-item expected-quantity feature — but flags this explicitly as a
decision point rather than assuming it.

## 9. Compatibility with Restock Observation (spec #5 amendment)

The Restock Observation Amendment computes a per-product "Observed
Stock Movement" figure (`previousCycleQuantity −
previousRemainingQuantity`) at the moment of a *new purchase*, not at
Stock Count time, and explicitly states it "Explicitly does not touch...
Stock Counts (spec #10)." No overlap or conflict exists — Stock Count
simplification and Restock Observation read/write entirely disjoint
data (`StockBatch.restockObservation` vs. `StockCount.items`). No
compatibility work is required.

## 10. Compatibility with Product Memory

There is no separately named "Product Memory" module or spec file in
this repository — `docs/specs/03-products.md` (Products, spec #3) is
the closest match, and its Functional Requirements #3–#4 (autocomplete,
price pre-fill) are exactly the pattern this task's Part 15 refers to
as "Product Memory." Treated as equivalent in the BDR and amendment
that follow this report.

## 11. Compatibility with Business Worth

Confirmed unchanged by anything discovered here: `calculateInventoryTotals`
and the Business Worth formula (spec #2) have no awareness that
`stockCounts` exists at all (per the existing Expected Current Stock
Value amendment's own "Existing StockBatch ambiguity — resolved"
section, Part 2). A simplified Contagem UI that only changes how the
operator populates `StockCountItem` rows introduces no new read or
write path into Business Worth.

## 12. Governance-numbering check (task Part 20, items 11–12)

`docs/specs/` currently contains `BDR-0004` and `BDR-0008` as the only
two BDR-numbered documents. **`BDR-0009` does not exist** — no
conflict. The `10-` prefix is already shared by three files
(`10-stock-counts.md`, `10-expected-stock-value-amendment.md`,
`10-initial-stock-valuation-history-amendment.md`), confirming that a
descriptive-slug convention (not a strict sequential sub-number) is
what's actually in use for amendments to spec #10 — the requested
filename `10-stock-counts-simplification-amendment.md` matches this
existing convention exactly.

## 13. Scale / performance — not yet a concern, but worth naming

No current SABUSH BPT business's product catalog size is visible from
this repository (no seed data, no production metrics file in scope).
`AddStockView.tsx`'s existing per-keystroke `products.filter(...)`
autocomplete is in-memory and unindexed — spec #3's own Non-functional
Requirements already accept this ("must filter the in-memory product
list without a network round-trip per keystroke... must not introduce
a new per-character query pattern"). A default "list every active
product" behavior for Stock Count (rather than a per-keystroke filter)
is a different access pattern — rendering N rows on screen load, not
filtering per keystroke — and its performance characteristics at
100/500/1000+ products are not something this repository's existing
code has ever had to handle, since no current screen renders "every
product" as a form. This is named as an open risk for the amendment
to address (pagination/search/category filtering), not resolved here.
