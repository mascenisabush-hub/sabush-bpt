Business Decision Record

# BDR-0009 — Stock Count as a Physical Observation Event

**Status:** Drafted, awaiting Product Architect approval. Not yet
approved. Nothing in this document authorizes implementation.
**Type:** Business Decision Record — a strategic, long-lived decision
about why this capability exists and what boundary it may never cross,
per the category [19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md)
establishes. Not a Policy and not a Business Domain Specification — see
the companion [Stock Count Simplification Amendment](./10-stock-counts-simplification-amendment.md)
for the functional requirements and acceptance criteria this decision
authorizes.
**Location note:** Filed without a module prefix, following `BDR-0004`
and `BDR-0008`'s precedent — this decision is a boundary statement for
Module #10 (Stock Counts) but is written to also govern how any future
module may or may not introduce "expected quantity" reasoning anywhere
in the platform, per Part 5 below.
**Depends on:** [Stock Counts (spec #10)](./10-stock-counts.md) and its
existing amendments; [Products (spec #3)](./03-products.md), Functional
Requirements #3–#4 (autocomplete, price pre-fill — the pattern this
decision directs Stock Count to reuse); the [Discovery Report](./stock-count-simplification-discovery.md)
this BDR is grounded in, especially its Part 8.
**Followed by:** The [Stock Count Simplification Amendment](./10-stock-counts-simplification-amendment.md)
(spec #10) operationalizes this decision into functional requirements,
UX behavior, and acceptance criteria.

---

## 1. The Business Decision

**A Stock Count records what quantity of an existing catalog product
is physically present at the moment of counting. It is a physical
observation, not a reconciliation. SABUSH BPT does not record ordinary
sales, so it has no basis to state what quantity of any product
*should* remain on the shelf at item level, and this decision commits
Sabush to never presenting one anywhere in the Stock Count feature.**

This is the validated form of the business-level instruction that
originated this task, checked against — and found to require one
explicit exception carve-out from — the repository's existing
governing language. See Part 5.

**The central framing this decision protects:** the operator's
experience of Contagem must be "I am telling the system what's really
here" — never "the system is telling me what should be here and I'm
confirming or disputing it." Every design decision downstream of this
BDR is checked against this framing.

## 2. Decisions Formally Established

1. **Stock Count is a physical observation event.** It records the
   quantity an operator physically counted, at a point in time, for an
   existing catalog product. It is not a claim about what should have
   been there.
2. **No item-level expected quantity is calculated, stored, or
   displayed anywhere in the Stock Count feature.** No product row may
   ever show an "expected" figure alongside its counted quantity. No
   report may show a per-product variance framed as a difference from
   an expected value.
3. **No sales quantity is inferred, anywhere, from Stock Count data.**
   `expected = opening + purchases − sales` (or any structural
   equivalent) is never computed for any individual product, in code,
   in a report, or in UI copy — regardless of framing (e.g. "estimated
   movement," "possible shrinkage").
4. **Active, existing catalog products are presented to the operator
   automatically** when they open Contagem — the operator's job is to
   supply the physical quantity, not to reconstruct the product list
   from memory. "Active" is defined precisely in Part 3.
5. **Already-known product metadata is displayed automatically** —
   name, reference purchase price, reference selling price, unit —
   sourced from the existing `Product` catalog record, exactly as
   `AddStockView.tsx`'s existing autocomplete/pre-fill pattern already
   does for Stock Entry (spec #3, Functional Requirements #3–#4). The
   operator's primary and, for most rows, only required action is
   entering the physical quantity.
6. **Zero is a valid, explicit physical count, and is never the same
   as blank.** `0` means "counted and confirmed absent." Blank means
   "not yet counted." No code path may silently convert blank to zero
   at any point — draft state, save, or report generation.
7. **The system automatically calculates report values** (per-product
   and total physical purchase value, per-product and total physical
   selling value) from the counted quantity and the already-known
   prices, exactly as `StockCountItem.totalValue` already does today.
   No new financial figure beyond straightforward multiplication and
   summation is introduced by this decision.
8. **Historical counts remain historical.** A completed, saved
   `StockCountItem` is a frozen snapshot (`productName`, `quantity`,
   `unit`, `costPrice`, `sellingPrice`, `totalValue`) — never a live
   reference back to the current `Product` record. A later edit to a
   product's reference price must never alter what an already-recorded
   count reported. This is not a new rule — it is already true of the
   current data model (Discovery Report Part 3) and this decision
   commits to preserving it, not changing it.
9. **Stock Count does not modify Business Worth.** This restates,
   rather than changes, spec #10's existing, unambiguous rule: a Stock
   Count never creates or touches a `StockBatch`, and its `totalValue`
   is never folded into `calculateInventoryTotals` or the Business
   Worth formula (spec #2).
10. **No POS behavior is introduced.** This feature does not begin
    tracking sales, does not infer a sales quantity from a count, and
    does not treat SABUSH BPT as anything other than a Business Worth
    Platform performing a physical-verification function.
11. **No unit-of-measure conversion logic is introduced.** The
    simplified Stock Count screen displays each product's existing,
    already-recorded unit string unchanged — it neither converts
    between units nor invents a canonical unit representation.
12. **Multi-shop isolation is mandatory and unchanged.** The default
    product list, the count itself, and the resulting report are
    strictly scoped to the currently active business, using the
    existing `businesses/{businessId}/...` tenant-isolation pattern
    (`firestore.rules`) — never a new, parallel scoping mechanism.

## 3. "Active Product" — formally defined for this feature

Per the Discovery Report Part 4: the current data model has **no**
`active`, `archived`, or `deleted` field on `Product`. This decision
formally adopts the only definition the existing architecture actually
supports:

> **An "active product," for Stock Count purposes, is any `Product`
> document that currently exists in the business's `products`
> collection.** A product remains in this list indefinitely — including
> at zero physical stock — until an Owner explicitly and permanently
> deletes it via the existing `deleteProduct` flow (which already
> removes its batch and Quebra history, per spec #3's own Business
> Rules). There is no intermediate "hidden but not deleted" state.

This decision does **not** introduce an archive/soft-delete capability
for `Product`. If a future need for "stop showing this product in
Contagem without deleting its history" emerges, that is a separate,
not-yet-authorized product decision, out of scope here.

## 4. Zero vs. Blank — formally established as distinct states

- **Blank** = not yet counted. A blank row must never be included in
  any "Total Physical Units" or "Total Physical Purchase/Selling
  Value" sum, and must never silently default to `0` at save time.
- **Zero (`0`)** = the operator physically confirmed the product has
  no units currently present. A `0`-quantity row **is** included in
  count totals (`0 × price = 0`, which is a true and meaningful
  contribution to the total) and **is** counted as a "counted product"
  in any Counted vs. Not Counted breakdown.
- Whether a partial count (some products left blank) may be finalized,
  and exactly how the resulting report distinguishes counted from
  not-counted products, is a UX/functional-requirement decision — not
  a strategic "why" decision — and is therefore specified in the
  companion Amendment, not here. This BDR only fixes the *meaning* of
  the two states; it does not fix whether an incomplete count may be
  submitted.

## 5. The Necessary Exception — Expected Current Stock Value

**This is the one point where this BDR must explicitly reconcile,
rather than silently inherit, existing governed behavior.**

`docs/specs/10-expected-stock-value-amendment.md` (v1.0, ✅ Approved,
implemented) already established and shipped an **aggregate,
business-wide** "Expected Current Stock Value" figure
(`Confirmed Initial Capital + cost value of governed StockBatch
inventory`), which every periodic Contagem already compares its total
against, and persists as `expectedValueAtCount` on the `StockCount`
record. This is, by name, an "expected" figure — the exact word Part 2
of this decision says must never appear at item level.

**Decision: this existing aggregate comparison is not in conflict with
Part 2 of this BDR, and is explicitly permitted to continue,
unchanged, alongside the simplified Contagem screen this BDR
authorizes — subject to the following boundary, which this BDR treats
as binding going forward, not merely descriptive of current behavior:**

- The exception is **narrow and aggregate-only**. "Expected Current
  Stock Value" may continue to exist as one whole-business total
  compared against one whole-business physical count total. It may
  **never** be decomposed to a per-product row in any Stock Count UI
  or report — doing so would cross directly into the per-item
  "Expected: 100 / Counted: 72 / Sales/Loss: 28" pattern this BDR
  exists specifically to prevent.
- The variance remains **neutral diagnostic information**, exactly as
  the existing amendment already requires (its Part 4) — never
  labeled loss, shrinkage, theft, error, or any word implying a known
  cause.
- It is **not sales-inferred** — it nets only against recorded Quebra,
  never against an assumed sales figure, because no sales figure is
  ever recorded (Discovery Report Part 8).
- Any **future** proposal to add a *new* expected-value comparison
  (e.g., per-category, per-supplier, or any granularity finer than
  whole-business) is explicitly **not** pre-approved by this
  exception and requires its own separate BDR, per Part 2 of this
  decision.

This carve-out exists because reversing an already-approved,
already-shipped, already-tested capability is outside this task's
authorized scope (governance/specification only — see Part 22, Section
22 of the originating instruction) and because the existing figure, as
implemented, does not actually violate the Trust Test this BDR applies
to everything else (Part 6, below) — an aggregate "what the accounting
figures imply the business should hold in total" number, clearly
separated from the physical count and never labeled as loss, is
different in kind from a per-product "the system thinks you should
have X units of this specific product."

## 6. The Trust Test

Every design decision under this BDR and its companion Amendment is
checked against one question:

> **Would a normal SME owner, looking at the Stock Count screen or
> report, understand that this is what was physically counted — not
> what the system thinks should exist?**

If the answer is no, the wording or design changes. This applies at
the individual product-row level absolutely (Part 2) and at the
aggregate Expected Current Stock Value level with the specific
boundary Part 5 sets.

## 7. What This Decision Does Not Do

- Does not remove, rename, or modify Expected Current Stock Value —
  see Part 5's exception.
- Does not introduce a Product archive/soft-delete capability — see
  Part 3.
- Does not introduce unit-of-measure conversion.
- Does not change Business Worth, Capital Growth, or Embedded Profit.
- Does not authorize implementation — see Status, above, and the
  originating task's explicit Implementation Gate (its Part 22).
- Does not decide whether partial (some-products-blank) counts may be
  finalized — deferred to the companion Amendment as a functional, not
  strategic, decision.
