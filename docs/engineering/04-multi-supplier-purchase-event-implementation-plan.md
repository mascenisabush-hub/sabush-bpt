# Implementation Plan — Multi-Supplier Purchase Event

**Governed by:** [`04-multi-supplier-purchase-event-amendment.md`](../specs/04-multi-supplier-purchase-event-amendment.md),
[`04-multi-supplier-purchase-event-rule8-assessment.md`](./04-multi-supplier-purchase-event-rule8-assessment.md)
(Governance Readiness: Ready)

This document does not itself authorize starting Phase 1 — produced
alongside the Rule 8 Assessment as the missing artifact, not executed.
A separate, explicit go-ahead is required before Phase 1 begins.

## Phase 1 — Types

**Files:** `src/types.ts`

**Purpose:** Add `PurchaseBatch.purchaseEventId?: string` and
`PurchaseDraft.purchaseEventId?: string`, both additive.

**Dependencies:** None.

**Risks:** None — identical shape to the already-shipped `supplierId`
addition.

## Phase 2 — Finalization: retroactive tagging + carry-forward

**Files:** `src/context/AppContext.tsx`

**Purpose:**

- Extend `addMultipleStockBatches` to accept and write an optional
  `purchaseEventId` on the new `PurchaseBatch`, using the same
  conditional-spread, undefined-safe construction already proven for
  every other optional field on this document (`0c71631`'s fix).
- Add a small function (name suggestion: `attachPurchaseEventId`) that
  performs the retroactive `updateDoc` onto an already-finalized
  `PurchaseBatch` — a single-field, single-document update, using the
  existing, unmodified `purchaseBatches` `update` rule.
- Extend `savePurchaseDraft` with the same conditionally-spread
  `purchaseEventId` field.

**Dependencies:** Phase 1.

**Risks:** None beyond the standard undefined-field discipline, already
well-understood and tested in this exact function from the recent bug
fix.

## Phase 3 — Add Stock UI: the "Add Another Supplier" action

**Files:** `src/components/AddStockView.tsx`

**Purpose:** On the success screen, add the "Adicionar Outro Fornecedor
a Esta Compra" action described in the amendment's Part 7/8. **Required
review point, explicitly flagged by the Rule 8 Assessment (Section 15):**
this action must perform a true in-place local reset (clear
`submittedMessage`, rows, supplier fields directly) and must NOT call
`onComplete()` or rely on tab navigation — re-read the amendment's Part
7 before implementing this specific button.

**Dependencies:** Phase 2.

**Risks:** The one named in the Rule 8 Assessment — mitigated by this
plan calling it out explicitly, twice, rather than leaving it to be
rediscovered.

## Phase 4 — Investment Ledger grouping view

**Files:** `src/components/StocksView.tsx`, possibly a small pure
helper in `src/utils/purchaseBatchCalculations.ts` if the grouping
logic is non-trivial enough to warrant extraction for testability
(mirroring `resolveSupplierForPurchase`'s own precedent).

**Purpose:** Add the opt-in "group by Purchase Event" view described in
the amendment's Part 10 — a `useMemo` over the existing `allSummaries`,
grouping by `purchaseBatch.purchaseEventId`, falling back to today's
ungrouped display where absent.

**Dependencies:** Phase 1 (Phase 2/3 not required for this view to
exist, but there's nothing to group without them).

**Risks:** None identified — purely additive display logic over
already-correct, already-computed data.

## Phase 5 — Firestore security rules

**Files:** `firestore.rules`

**Purpose:** Add the additive `purchaseEventId` shape check to
`purchaseBatches`' `create` rule, per the Rule 8 Assessment Section 5.

**Dependencies:** Phase 1.

**Risks:** Same standing sandbox emulator-verification limitation as
every prior `firestore.rules` change in this repository.

## Phase 6 — Tests

**Files:** `tests/purchase-draft-and-suppliers.test.ts` (extended), a
new focused test file for the Investment Ledger grouping logic if
Phase 4 extracts a pure function.

**Purpose:** Implement the Rule 8 Assessment's Section 12 test list in
full.

**Dependencies:** Phases 1–4.

## Phase 7 — Build / regression verification

**Files:** None new.

**Purpose:**

- `npx tsc --noEmit -p .` — clean.
- `npm run test:all` — 100% passing, zero regressions in any
  pre-existing suite.
- `npm run build` — clean.
- `git diff` reviewed against this plan's own file list — no unlisted
  file touched.
- `HANDOFF.md` updated; commit named with the module/spec; push only
  when explicitly told to.

## Explicit scope boundary

**Touches only:** `types.ts`, `AppContext.tsx`, `AddStockView.tsx`,
`StocksView.tsx`, `purchaseBatchCalculations.ts` (only if a helper is
extracted), `firestore.rules`, test files, plus `docs/specs/*` and
`HANDOFF.md` for the governance/handoff trail.

**Does not touch:** any payment/cash/credit/supplier-debt/accounts-
payable concept; `calculateBatch`, `calculateInventoryTotals`,
`calculatePurchaseBatchSummary`, or any Business Worth figure; the
pre-existing "Save N Batches" terminology (deliberately separate); any
historical `PurchaseBatch`/`StockBatch`/`Supplier`/`SupplierRecord`
document; the existing draft ownership/concurrency model
(`purchaseDrafts/{uid}`); `Product.supplier`; Module #16/#17/#18/#19/#20.
