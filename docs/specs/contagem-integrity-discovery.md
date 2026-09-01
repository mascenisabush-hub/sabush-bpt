Discovery Report — Not a Business Domain Specification

# Contagem Integrity / Mistake-Discovery — Discovery Report

**Status:** Investigation only. No code, Firestore rule, calculation,
test, or governance document referenced here has been changed to
implement anything. This document is the evidence base the companion
[BDR-0017](./BDR-0017-contagem-integrity-diagnostics.md) and
[POL-0014](./POL-0014-contagem-integrity-diagnostic-signals.md) are
built from.
**Investigated:** Repository as of commit `7eaafc6887243bfec32491c510d438c9868c24d5`
(branch `main`).
**Scope of investigation:** `apps/tenant/src/utils/stockCount.ts`,
`apps/tenant/src/lib/contagemMultiUnitValuation.ts`,
`apps/tenant/src/lib/priceDeviationCheck.ts`,
`apps/tenant/src/lib/purchaseToSellingConversion.ts`,
`apps/tenant/src/components/PeriodicStockCountView.tsx`,
`apps/tenant/src/components/InitialStockCountView.tsx`,
`apps/tenant/src/utils/calculations.ts` (`getPossibleReconciliationCauses`),
`apps/tenant/src/components/DeclareBusinessWorthView.tsx`,
`apps/tenant/src/types.ts` (`Product`, `UnitRelationship`,
`StockCountTallyItem`).

---

## 1. The Real-World Problem

A live SABUSH Owner completed a 500+ product Contagem. The system
correctly summed every row's `quantity × sellingPrice` into a total
(the worked example used throughout this investigation: 435,000 MZN),
but the Owner's own practical business knowledge said the true figure
could not reasonably exceed roughly 300,000 MZN. The arithmetic was
never in question — every trace below confirms the sum is computed
correctly, consistently, from a single authoritative path. The gap is
entirely in **surfacing which of the 500 already-correctly-summed rows
is worth a second look**, which today requires an unassisted manual
scroll through the whole list.

## 2. Where Contagem Value Actually Comes From — traced, not assumed

`tallyStockCountRows` / `normalizeStockCountItems`
(`utils/stockCount.ts`) is the single place a counted row's value is
computed: `sellingValue = quantity × sellingPrice`, rounded once, per
row. `totalSellingValue` is a plain running sum of every row's
`sellingValue` — no averaging, no distribution logic, no cross-row
awareness anywhere in the calculation itself. This is confirmed to be
the exact figure the Owner sees as "Valor Total da Contagem," and the
exact figure that becomes `measuredBusinessWorth` the moment the count
is confirmed.

Periodic Contagem specifically no longer collects an Owner-typed Cost
Price at all (§44, prior correction) — cost is derived algorithmically.
So for this screen, every arithmetic input traces back to exactly two
Owner-typed fields per row: `quantity` and `sellingPrice` (plus which
`unit` each is denominated in).

## 3. Data Already In Memory At Review Time — confirmed present, no new reads required

`StockCountTallyItem` (`utils/stockCount.ts`), the shape backing
`pendingTally.countedItems` at the review/confirm step, already
carries, per row: `productName`, `quantity`, `unit`, `sellingPrice`,
`sellingValue`, `validated`, and identity (`productId` or
`manualRowIndex`). `totalSellingValue` is already computed alongside
it. None of this requires a new Firestore field, a new read, or a new
persisted value — it is the exact data already produced by the
existing, unmodified `tallyStockCountRows` call the review screen
already makes.

`stockCounts` (the full history of past confirmed counts, each
carrying its own `items[]` with `quantity` per product) is separately
confirmed already loaded into this same component — used today by
`findLatestRememberedProductMemory`.

## 4. The Central Technical Finding — why value, not quantity, is the safe cross-catalog signal

`getConversionFactor` (`purchaseToSellingConversion.ts`) is the
existing, tested, authoritative engine for converting a quantity
between units — but it composes a factor **only within one product's
own confirmed `UnitRelationship` chain** (e.g., Cx → Emb → Un for one
specific product). It has no concept of, and structurally cannot be
extended to, bridging a quantity of one product against a quantity of
an entirely different product — there is no shared reference frame
across unrelated products. A same-count catalog of 500 rows mixing Kg,
L, Un, Cx, and Emb has no common unit to normalize raw `quantity` into
as a batch.

`sellingValue`, by contrast, is already denominated in one common
unit — currency — regardless of what the product is or how it was
counted. This is the one field on `StockCountTallyItem` that is safe
to compare across the *entire* 500-row set at once. Raw `quantity` and
raw `sellingPrice`, examined in isolation across unrelated products,
are not.

This finding governs the shape of every viable same-count diagnostic
signal identified below.

## 5. Existing Precedent For "Evidence, Not Verdict" Phrasing

`getPossibleReconciliationCauses` (`utils/calculations.ts`) already
establishes, and already ships, the exact discipline a Contagem
Integrity capability needs: it returns a list of *facts already
present in the business's own records* (an outstanding Payable, a
recorded Breakage), never a determination of what actually happened.
Its own header comment states this explicitly: "never asserted as fact
unless the records already establish it."

`checkPriceDeviation` (`lib/priceDeviationCheck.ts`) is a second,
independent, already-shipped precedent for the same discipline, at
row level: it compares a freshly-typed selling price against a
product's own remembered price and shows a non-blocking warning
("confirme que não é um erro de digitação") — never a rejection, never
an assertion that the entry is wrong.

`DeclareBusinessWorthView.tsx`'s `DEVIATION_WARNING_THRESHOLD` (30%,
inline constant) is a third precedent, of a "type a number → review
step surfaces a deviation → Owner confirms or goes back" interaction
shape — applied today only to a single manually-typed override figure,
never to a Contagem's aggregate total.

## 6. Confirmed Gaps

- `InitialStockCountView.tsx` — the true first-time-count screen —
  contains zero occurrences of `checkPriceDeviation`. No per-row
  protection of any kind exists there today, because the check is
  memory-dependent and a genuine first count has no memory to compare
  against.
- No quantity-side check of any kind exists anywhere in this
  repository, for any screen (confirmed by exhaustive search).
- The review screen's item list is not sorted by value — the only two
  `.sort()` calls in the whole Contagem path sort drafts by date and
  the live-entry catalog list alphabetically.
- Product matching, everywhere it was checked
  (`isGenuinelyNewProductName`, `getRememberedPriceForRow`, the
  catalog lookup), is exact-string-equality only
  (`trim().toLowerCase()`) — no normalization of spacing, hyphenation,
  or diacritics. "Coca-Cola 350ml" and "Coca Cola 350 ML" are two
  unrelated products to every part of this system today.
- `Product.category` is free-text, optional, edited only in
  `EditProductModal.tsx`, and never surfaced anywhere in the Contagem
  flow — not a reliable grouping key today.
- `pendingTally` is a one-shot snapshot built by
  `handleRequestConfirmation`. `handleCorrigirTallyItem` discards it
  entirely and returns the Owner to full live editing; there is no
  jump-to-row, highlight, preserved review queue, or automatic
  re-review after a correction.
- The existing Supplier Wording Recognition / candidate-match system
  (`BDR-0012`, `POL-0003`) is confirmed **not** wired into
  `PeriodicStockCountView.tsx`'s manual-add path at all (zero
  occurrences of "Recognition" or "candidateMatch" outside a single
  comment noting it doesn't apply to catalog rows). Near-duplicate
  detection within a single Contagem's own rows is a genuine, currently
  unfilled gap — not an overlap with an already-active mechanism. See
  §7 for how this differs in kind from what `BDR-0012`/`POL-0003`
  already govern.

## 7. Relationship To Existing Product-Identity Governance (BDR-0012 / POL-0003)

`BDR-0012` and `POL-0003` govern a different moment and a different
question: whether a **newly typed product name matches an existing
catalog Product**, at product-creation/entry time — "is this a new
product, or one we already have?" Their answer, already approved and
shipped elsewhere in this codebase: suggest, never silently decide,
and always let the owner resolve it explicitly ("same product" /
"different product").

The gap this Discovery Report identifies is different in kind: two
**rows already present within one single Contagem session** whose
product names closely resemble each other — which may include two
manually-typed rows that never went anywhere near catalog matching at
all. This is a data-quality signal about *this count's own internal
consistency*, not a product-identity decision about the catalog. The
underlying "compare two names for similarity" building block may
eventually be shared, but the trigger moment, the question being
asked, and the governing decision are both distinct from what
`BDR-0012`/`POL-0003` already settled — this Discovery Report does not
propose reopening either.

## 8. Relationship To Existing Stock-Count Governance (BDR-0009)

`BDR-0009` (Stock Count as a Physical Observation Event) establishes,
as an approved and binding boundary, that no item-level *expected*
quantity may ever be calculated, stored, or displayed anywhere in the
Stock Count feature (its Part 2, Decision 2) — the Contagem experience
must always read as "I am telling the system what's really here,"
never "the system is telling me what should be here."

Every mechanism identified in this investigation operates strictly on
**already-entered, already-calculated data from this same Contagem**
(a rank, a percentage of an already-known total, a same-count value
outlier, a name-similarity fact) — none of them compute, store, or
display an expected quantity, an expected price, or an expected total
for any individual product. `BDR-0017` treats this as a hard
constraint inherited from `BDR-0009`, not a boundary it independently
invents.

## 9. What The Investigation Found Feasible With Zero New Data

- **Top-value ranking** and **% of total** — a sort and a division over
  `pendingTally.countedItems`, already fully populated. No new field,
  no new computation beyond what's already produced today.
- **Same-count value-distribution flagging** — the same already-present
  `sellingValue` array, examined as a distribution (share of total,
  relative position among peers) — safe across the whole catalog per
  §4, above.
- **Near-duplicate product-name detection within one Contagem** — the
  same already-present `productName` strings, compared to each other.
  No new data; a comparison pass is the only missing piece.
- **Review-screen sort by value** — a presentation change over data the
  screen already renders; falls out of the ranking calculation for
  free.

## 10. What The Investigation Found Requires New Judgment Calls Explicitly Out Of Scope Here

- Any numeric threshold (percentage cut-off, similarity-score cut-off)
  — deliberately left to a later Policy/Specification decision, not
  this Discovery Report.
- Any historical (cross-count) quantity or price comparison as a *new*
  capability beyond what `checkPriceDeviation` already does — real
  value for a returning business, but does not address the first-time-
  Contagem scenario this investigation was grounded in, and introduces
  the "legitimate growth vs. error" ambiguity a same-count signal
  avoids.
- Any single composite "suspicion score" — rejected as manufacturing
  false precision the underlying signals, which are not independent
  and not equally reliable, do not support.
- Any guided, one-item-at-a-time correction workflow (direct jump,
  auto-advance) — confirmed, by tracing `handleCorrigirTallyItem`
  directly, to be a genuine new interaction, not a small extension of
  what exists today.
