# Implementation Plan — Module #4 Durable Multi-Product Purchase Capture and Reusable Suppliers

**Governed by:** [`04-durable-purchase-capture-and-suppliers-amendment.md`](../specs/04-durable-purchase-capture-and-suppliers-amendment.md),
[`04-durable-purchase-capture-and-suppliers-rule8-assessment.md`](./04-durable-purchase-capture-and-suppliers-rule8-assessment.md)
(Governance Readiness: Ready)

This document does not itself authorize starting Phase 1 — per this
task's own governance-only instruction, it is produced *alongside* the
Rule 8 Assessment as the missing artifact, not executed. A separate,
explicit go-ahead is required before Phase 1 begins.

## Phase 1 — Data / types

**Files:** `src/types.ts`

**Purpose:** Add the three new types and the one new optional field
identified in the Rule 8 Assessment, Section 6.

- `PurchaseDraftLineItem`, `PurchaseDraft`, `SupplierRecord` (new).
- `PurchaseBatch.supplierId?: string` (additive).

**Dependencies:** None — this is the foundation every later phase reads.

**Risks:** Naming collision with the existing `Supplier` value-object
type (`types.ts:160`) — mitigated by using the distinct name
`SupplierRecord`, documented inline (per the assessment, Section 6) so
a future reader isn't left to guess why two supplier-shaped types
coexist.

**Validation:** `npx tsc --noEmit -p .` stays clean; no other file
changes yet, so this phase alone should compile with zero new errors
(new types are unused until Phase 2+).

## Phase 2 — Supplier repository/service logic

**Files:** `src/context/AppContext.tsx`

**Purpose:** Add `suppliers` state + a business-scoped live listener
(mirroring the existing `products` listener); expose the list on
`AppContextType`. This phase adds read/list capability only — creation
is wired in Phase 5 (Finalization), per the Rule 8 Assessment's Section
13 decision that new Suppliers are created at finalization time, not
during draft entry.

**Dependencies:** Phase 1 (`SupplierRecord` type).

**Risks:** None beyond the standard "one more always-on listener" cost
already assessed as negligible (Rule 8 Assessment, Section 20).

**Validation:** `tsc --noEmit`; manual confirmation that `suppliers`
populates in `AppContext` state for a business with zero existing
Supplier documents (empty array, not an error) — same pattern already
proven for `products` on a fresh business.

## Phase 3 — Purchase Draft persistence

**Files:** `src/context/AppContext.tsx`

**Purpose:** Add `purchaseDraft` state, a live listener scoped to
`purchaseDrafts/{current user's uid}` (re-subscribed on business switch,
mirroring the existing `stockCountDrafts` listener's business-switch
handling), and `savePurchaseDraft(draft)` / `clearPurchaseDraft()`
functions — directly modeled on `saveInitialStockDraft`/
`clearInitialStockDraft` (Rule 8 Assessment, Section 5/12).

**Dependencies:** Phase 1 (`PurchaseDraft`/`PurchaseDraftLineItem`
types).

**Risks:** Re-subscription on business switch must clear stale draft
state immediately, not just on the next snapshot — this repository
already fixed this exact class of bug once for
`initialStockDraft`/`initialStockDraftLoaded` (`AppContext.tsx:657-672`,
"business-switch draft staleness"); this phase must apply the identical
fix for `purchaseDraft`, not re-introduce the bug it already solved
elsewhere.

**Validation:** `tsc --noEmit`; manual round-trip (save → reload →
confirm restored) once emulator/live Firestore access is available in
the target deploy environment (not this sandbox — Rule 8 Assessment,
Section 22).

## Phase 4 — Add Stock UI integration

**Files:** `src/components/AddStockView.tsx`

**Purpose:**

- On mount: if a `purchaseDraft` exists for the current business/user,
  restore its rows/supplier/date/notes into local state instead of
  starting from one empty row — mirroring
  `InitialStockCountView.tsx`'s own load-on-mount logic, including its
  "don't clobber in-progress typing" guard (Rule 8 Assessment, Section
  24, Risks).
- Debounced autosave (same ~800ms interval as Module #10) on
  row/supplier/date/notes change, calling `savePurchaseDraft`.
- Replace the three plain-text supplier inputs
  (`AddStockView.tsx:264-296`) with an autocomplete against `suppliers`,
  built on the same pattern as the existing Product autocomplete a few
  lines below in the same file (`AddStockView.tsx:356-397`) — search,
  select-existing, or fall through to "create new: [name]" exactly like
  Product's own dropdown.
- Selecting an existing supplier sets `supplierId` in local
  state/draft; typing a new one sets the free-text
  `supplierName`/`supplierPhone`/`supplierNotes` fields instead (Rule 8
  Assessment, Section 13).

**Dependencies:** Phases 2 and 3.

**Risks:** This is the largest single-file diff in the plan — mitigated
by copying two already-shipped patterns (Product autocomplete,
Module #10's autosave/restore) rather than designing new interaction
logic. Kept to Add Stock's existing recognizable shape, per the
amendment's own Part 3 instruction not to introduce wizard complexity.

**Validation:** `tsc --noEmit`; manual walkthrough of the full
EMPTY → DRAFT CREATED → AUTOSAVED → USER RETURNS → DRAFT RESTORED →
USER CONTINUES lifecycle (Rule 8 Assessment, Section 12).

## Phase 5 — Finalization/discard lifecycle

**Files:** `src/context/AppContext.tsx`

**Purpose:** Extend `addMultipleStockBatches` with the Supplier
find-or-create step (Rule 8 Assessment, Section 13) and add the
draft-delete call to the same `WriteBatch` that already creates
Product/StockBatch/PurchaseBatch documents (Section 12/16). Add a
`discardPurchaseDraft()` path (thin wrapper over `clearPurchaseDraft`
from Phase 3, exposed to the UI's explicit "discard" action).

**Dependencies:** Phases 1–4.

**Risks:** The single highest-discipline phase in this plan — the
existing `addMultipleStockBatches` function (`AppContext.tsx:1217-1353`)
must gain exactly one new find-or-create block and one new `fsBatch.delete()`
call, with **zero** changes to its existing Product-creation,
StockBatch-creation, PurchaseBatch-creation, batch-numbering, or
Timeline Event logic. A diff review against this exact boundary is a
required step before this phase is considered complete (see Phase 9).

**Validation:** `tsc --noEmit`; targeted tests (Phase 8) confirming
identical `addMultipleStockBatches` output whether input came from a
restored draft or fresh rows (Rule 8 Assessment, Section 22).

## Phase 6 — Firestore security rules

**Files:** `firestore.rules`

**Purpose:** Add the `purchaseDrafts` and `suppliers` match blocks and
the one additive `purchaseBatches` create-rule field-shape check, exactly
as specified in the Rule 8 Assessment, Section 8.

**Dependencies:** None (rules can be written in parallel with earlier
phases, but should be validated against the final field names Phase 1
settles).

**Risks:** Same standing sandbox limitation as every prior
`firestore.rules` change in this repository (Rule 8 Assessment, Section
22) — written and typecheck-reviewed, not emulator-verified here.

**Validation:** Manual rules review against Section 8's exact rule text;
emulator run in an environment with `storage.googleapis.com` egress,
before production deploy.

## Phase 7 — Backward compatibility

**Files:** None new — this phase is a verification pass, not a code
change.

**Purpose:** Confirm every claim in the Rule 8 Assessment's Section 14
holds against the actual diff: no existing `PurchaseBatch` document is
touched, `StocksView.tsx` needs no change, no business without any
Purchase Draft or Supplier data behaves differently than it does today.

**Dependencies:** Phases 1–6 complete.

**Risks:** None if Phases 1–6 were scoped correctly — this phase exists
specifically to catch it if they weren't.

**Validation:** Diff review; manual check of `StocksView.tsx` rendering
a pre-existing `PurchaseBatch` (no `supplierId`) unchanged.

## Phase 8 — Tests

**Files:** New test file(s) under `tests/` (exact filename to follow
this repo's existing `test:<feature-name>` `package.json` script
convention, e.g. `tests/purchase-draft-and-suppliers.test.ts`);
`tests/firestore-rules.test.ts` extended.

**Purpose:** Implement the full test list in the Rule 8 Assessment,
Section 22.

**Dependencies:** Phases 1–6.

**Risks:** None beyond the standing, already-flagged
`firestore.rules`-emulator sandbox gap.

**Validation:** New test file(s) pass in isolation
(`npx tsx --test tests/<new-file>.test.ts`); added to `package.json`'s
`test:all` script.

## Phase 9 — Build / regression verification

**Files:** None new.

**Purpose:** Final gate before this work is considered complete.

- `npx tsc --noEmit -p .` — clean.
- `npm run test:all` — 100% passing, zero regressions in any
  pre-existing suite.
- `npm run build` — clean (same pre-existing non-blocking warnings this
  repository has always had: CSS lint, chunk size, dynamic-import
  overlap — no new ones).
- `git diff` reviewed against this plan's own file list (Rule 8
  Assessment, Section 23) — no unlisted file touched.
- `HANDOFF.md` updated with the true state.
- Commit named with the module/spec; push only when explicitly told to.

## Explicit scope boundary (restating the amendment's own Part 13)

**Touches only:** the files listed in Sections 1–8 above — `types.ts`,
`AppContext.tsx`, `AddStockView.tsx`, `firestore.rules`, new test
file(s), `docs/specs/*` and `HANDOFF.md` for the governance/handoff
trail.

**Does not touch:** any payment/cash/credit/supplier-debt/
accounts-payable field or concept (amendment Part 11); `calculateBatch`,
`calculateInventoryTotals`, `calculatePurchaseBatchSummary`,
`expectedCurrentStockValue`, `businessWorth`, `capitalGrowth`,
`capitalGrowthPct`, `initialCapitalValue` (amendment Part 10); `Product.supplier`
(amendment Part 8); Module #17/#18/#19/#20; `server/index.ts` (no
privileged-server action needed, Rule 8 Assessment Section 23); any
unrelated `AppContext` refactoring, redesign of `StockBatch`/`Product`/
Staff & Roles, or migration of unrelated data.
