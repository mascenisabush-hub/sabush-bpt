Implementation Plan — DRAFT, NOT AUTHORIZED

# Periodic Contagem Validar Workflow — Guardar → Validar, Accumulated Review, Corrigir (Decision 40)

**Status:** 🟡 **DRAFT — NOT AUTHORIZED.** Does not authorize
implementation. Implementation Authorization remains a separate,
subsequent, signed document (not created here).

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 28 August 2026,
implemented on `main`) → [Decision 40 amendment](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 29 August 2026) →
[Rule 8 Assessment](./periodic-contagem-validar-decision-40-rule8-assessment.md)
(✅ READY) → **this Plan**.

**Baseline:** `main = origin/main = 679594a0f649b2c7a00f2f9b855a562703f13976`,
working tree clean, confirmed via `git fetch` immediately before this
Plan was drafted. This commit contains Decision 39 as shipped code
and both the signed Decision 40 amendment and its READY Rule 8
Assessment as governance text only — no application code implementing
Decision 40 exists yet.

**This document does not modify application code, tests, Firestore
rules, indexes, or schema.** It translates the READY Rule 8 Assessment
into a concrete, file-by-file map for the eventual Implementation
Authorization to reference.

---

## 1. Scope

**In scope — exactly the signed Decision 40 (FR-N5–FR-N12), confined
to:**
`apps/tenant/src/utils/stockCount.ts`,
`apps/tenant/src/types.ts`,
`apps/tenant/src/components/PeriodicStockCountView.tsx`.

No other application file is touched by this Plan.

### 1a. Data model — `validated?: boolean` (Decision 40 §2, FR-N6/FR-N7)

- **REQUIRED BY DECISION 40.** Add `validated?: boolean` to
  `PeriodicStockDraftItem` (`types.ts`) and to `StockCountWorkingRow`
  (`utils/stockCount.ts`), as an additive optional field, following
  the exact style already used for `removed?: boolean` on both types
  (comment block, placement, omit-when-absent semantics).
- **REQUIRED BY DECISION 40 / RULE 8 §B.** Extend
  `workingRowToDraftItem` to include
  `...(row.validated !== undefined ? { validated: row.validated } : {})`,
  mirroring its existing `removed` line exactly. Extend
  `draftItemToWorkingRow` to include `validated: item.validated`,
  mirroring its existing `removed: item.removed` line exactly. Both
  are explicit-literal additions — **no change to either function's
  existing spread-free discipline.**
- **OUT OF SCOPE (Decision 40 §4 / this task item 2).** No
  `validatedAt` timestamp, no audit array, no history of validation
  events. Only the single boolean.

### 1b. Guardar → Validar rename (Decision 40 §2, FR-N5)

- **REQUIRED BY DECISION 40.** `handleSaveCatalogRow` and
  `handleSaveManualRow` are retargeted to set `validated: true` on the
  row (via `updateCatalogRow`/`updateManualRow` — §1c below) in
  addition to (or in place of, per §1c's transition note) their
  existing `setConfirmedCatalogProductIds`/`setConfirmedManualRowIndices`
  calls. `handleEditCatalogRow`/`handleEditManualRow` are retargeted
  to set `validated: false` the same way.
- **REQUIRED BY DECISION 40 / this task item 1.** `validateWorkingRowForSave`
  and the existing zero-quantity `window.confirm` gate are **unchanged
  in every respect** — Decision 40 authorizes a semantic/UI rename
  only; it does not authorize any change to what counts as a valid,
  saveable/validatable row.
- **IMPLEMENTATION DETAIL.** Visible button text changes from
  "Guardar" to "Validar" (~line 3388 and its manual-row twin ~3769);
  the `title`/`aria-label` on the status dot (~3082, `'Guardar' /
  'Ainda não guardado'`-style strings) is updated to
  "Validado"/"Ainda não validado" for consistency, though Decision 40
  does not mandate exact wording beyond the rename itself — final
  copy is an implementation-task-level choice, not fixed here.
- **OUT OF SCOPE.** No change to autosave semantics as a *consequence*
  of the rename (this task item 1, explicit) — the rename and the
  persistence mechanism (§1a/§1c/§1d) are additive and independent;
  renaming the button alone would change nothing about persistence,
  and persisting `validated` does not depend on the button's label.

### 1c. Persisted validated state replaces the local-only Set (Rule 8 §C)

- **REQUIRED BY RULE 8 §C (safest implementation path).** Route every
  transition of validated status through the existing
  `updateCatalogRow(productId, { validated: true | false })` /
  `updateManualRow(index, { validated: true | false })` functions —
  the same functions every other field edit already uses. This
  requires **no new autosave trigger, no new ref, no new timer-key
  scheme**: both functions already call `scheduleRowDraftSave` with
  the row's existing, disjoint key (`catalog:${productId}` /
  `manual:${index}`).
- **IMPLEMENTATION DETAIL.** Whether `confirmedCatalogProductIds`/
  `confirmedManualRowIndices` are removed outright in this same change
  or left in place temporarily and read as `row.validated` at the
  render sites (§1d) is an implementation-task sequencing choice. This
  Plan recommends **removing them outright** in the same change that
  introduces `validated`, since Rule 8 §C found no rendering use of
  either Set beyond the two call sites replaced here, and carrying
  both a Set and a row field forward would be a real, avoidable
  divergence risk (the two could disagree). **Recommended, not
  authorized as the only path** — final call belongs to the
  Implementation Authorization.

### 1d. Active-workspace filtering — never deletion (Decision 40 §2, FR-N8/FR-N9)

- **REQUIRED BY DECISION 40 / RULE 8 §C.** `visibleCatalogEntries`
  (`~1780`) gains a second filter predicate,
  `!row.validated`, alongside its existing `!row.removed` — i.e.
  `.filter(([, row]) => !row.removed && !row.validated)`. This follows
  the exact idiom already established by `removed`.
- **REQUIRED BY DECISION 40 / RULE 8 §B (backward compatibility).**
  The predicate must be falsy-safe (`!row.validated`), never require
  an explicit `=== false`, so a legacy row with `validated === undefined`
  resumes into the active view exactly like today.
- **REQUIRED BY DECISION 40 / this task item 3.** `catalogRows` and
  `manualRows` themselves are **never** mutated to remove a validated
  row. `allWorkingRows` (`~1798`, `[...Object.values(catalogRows), ...manualRows]`)
  is **not modified** — it continues to read directly from
  `catalogRows`/`manualRows`, bypassing any workspace filter, exactly
  as Rule 8 §C's load-bearing proof establishes. This is what
  guarantees autosave, resume, review, and finalization all continue
  to see every row regardless of validated status.
- **REQUIRED BY DECISION 40 / FR-N9 / RULE 8 §C.** A new derived view
  for manual rows — e.g. `visibleManualRows` (or an equivalent
  `useMemo` filtering `manualRows` by `!row.validated`) — is
  introduced for the active-workspace render loop. **`manualRows`
  itself is never spliced or reordered because of validated status.**
  This is the direct implementation of FR-N9 and closes the
  index-corruption risk Rule 8 §C names.
- **REQUIRED BY DECISION 40 / this task item 3.** A corresponding
  "accumulated" derived view is introduced for both catalog and manual
  rows — e.g. `validatedCatalogEntries`/`validatedManualRows` — mirroring
  `removedCatalogEntries`'s existing shape, to drive the discoverable/
  reopenable accumulated area (§1e).
- **OUT OF SCOPE.** No change to `removedCatalogEntries`'s own
  existing filter (`row.removed`) — the two concepts (`removed`,
  `validated`) remain orthogonal, independent booleans; a row can be
  `removed` without being `validated` and vice versa, and this Plan
  does not introduce any interaction rule between them beyond both
  independently excluding a row from the plain active-workspace view.

### 1e. Accumulated/validated area — discoverability and reopening (this task item 4)

- **REQUIRED BY DECISION 40 §2 (FR-N8) / this task item 4.** A visible
  section in the active screen — the smallest UI mechanism sufficient,
  per this task's own instruction not to redesign the Contagem UI —
  listing `validatedCatalogEntries`/`validatedManualRows`, structurally
  parallel to the existing "Removidos desta contagem" chip list
  (`~3408–3415`), i.e. a compact list/chip per validated row with a
  `Corrigir`-style reopen action (§1f) rather than a full second copy
  of the row-editing card. This keeps the accumulated area
  discoverable without duplicating the active-workspace row UI.
- **IMPLEMENTATION DETAIL.** Exact visual treatment (chip list vs.
  compact card list vs. a collapsed count-with-expand control) is left
  to the Implementation Authorization — Decision 40 requires the
  capability ("remain discoverable/reopenable"), not a specific
  layout.
- **OUT OF SCOPE.** No new screen, route, tab, or modal — the
  accumulated area renders within the existing single-screen
  `PeriodicStockCountView` layout, consistent with this task's "do not
  redesign the entire Contagem UI" instruction.

### 1f. Reopening a validated row from the active screen (this task item 4)

- **REQUIRED BY DECISION 40 / RULE 8 §C.** Reopening a validated row
  directly from the accumulated area (§1e) — distinct from, and in
  addition to, the `Corrigir` path reachable from the review screen
  (§1g) — sets `validated: false` via the same `updateCatalogRow`/
  `updateManualRow` path (§1c). This is the same underlying action as
  `Corrigir`, exposed at a second entry point (the always-visible
  accumulated area, not only the post-review tally). Both entry points
  converge on identical code.
- **IMPLEMENTATION DETAIL.** Whether this reopen action reuses the
  existing "queres editar?" `window.confirm` gate from
  `handleEditCatalogRow`/`handleEditManualRow` is left to the
  Implementation Authorization; Rule 8 did not find this gate
  load-bearing for correctness (only a deliberate-friction UX choice
  already present today), so its retention or removal here does not
  affect the safety of the underlying mechanism.

### 1g. Review screen — accumulated tally and `Corrigir` (Decision 40 §2, FR-N11; this task item 5)

- **REQUIRED BY THIS TASK ITEM 5 / DECISION 40 §3.** `handleRequestConfirmation`
  remains the sole entry point into review; the "Rever e Confirmar
  Contagem" button (~3849) and its existing validation checks
  (blank-count guard, negative-quantity/price guard) are **unchanged**.
- **REQUIRED BY THIS TASK ITEM 5.** `tallyStockCountRows(allWorkingRows, ...)`
  remains the sole source of `pendingTally` — **unchanged call site,
  unchanged inputs** — so the complete accumulated Contagem (every
  row, validated or not, corrected or not) continues to be represented
  in full, exactly as today. Validated rows do not disappear from the
  tally merely because they left the active-workspace view (§1d
  guarantees this by never touching `allWorkingRows`).
- **REQUIRED BY DECISION 40 / RULE 8 §D.** `StockCountTallyItem`
  (`utils/stockCount.ts`) gains two additive fields not written to
  Firestore and not passed to `recordStockCount` (§1h):
  - row identity — `productId?: string` for a catalog row; for a
    manual row, its index at tally-build time (§2, Row Identity table,
    below);
  - `validated: boolean`, read directly from the row
    `tallyStockCountRows` is already iterating — no second pass over
    `allWorkingRows`.
- **REQUIRED BY THIS TASK ITEM 5.** "Voltar" (`setPendingTally(null)`,
  ~2639) is **preserved unmodified** as the existing, unconditional
  "discard the whole review" path.
- **REQUIRED BY DECISION 40 §2 (FR-N11) / this task item 5.** `Corrigir`
  is added as a **new, additional** per-item affordance in the
  `pendingTally.countedItems` render list (~2575), alongside — not
  replacing — "Voltar". Activating it, in order:
  1. Resolves the row's identity from the extended `StockCountTallyItem`
     (productId, or manual index).
  2. Clears that one row's `validated` flag via `updateCatalogRow`/
     `updateManualRow` (§1c) — the same write path as §1c/§1f, reused
     for its inverse transition.
  3. Calls `setPendingTally(null)` — discarding the review snapshot,
     exactly as "Voltar" already does, so the Owner is never shown a
     stale tally against corrected live state (closing the
     review/working-state divergence risk Rule 8 §E and this task's
     own §I.8 both name explicitly).
- **OUT OF SCOPE.** No other change to the review screen's layout, its
  two summary tiles, its Not-Counted section, or its total figure —
  all explicitly excluded by Decision 40 §4's own non-goal ("Any
  redesign of the `pendingTally` review screen beyond the minimal
  identity/status carrying and the single `Corrigir` affordance").

### 1h. Finalization — unchanged (Decision 40 §2 FR-N12 / §3; this task item 6)

- **REQUIRED BY DECISION 40 / RULE 8 §H.** `handleConfirmSave`'s
  existing await ordering (cancel every pending per-row timer → await
  `draftInFlightSaveRef` → await `identityWriteRef` → await
  `flushInFlightSaveRef` → call `recordStockCount`) is **unchanged**.
  None of these steps branch on `validated`.
- **REQUIRED BY DECISION 40 / RULE 8 §H.** The object literal
  `handleConfirmSave` builds for `recordStockCount`'s `items` parameter
  (`pendingTally.countedItems.map((item) => ({ productName: ...,
  ... }))`, ~2149) is **extended with no new field** — `validated` and
  the new identity field on `StockCountTallyItem` (§1g) are
  **explicitly excluded** from this literal, preserving the same
  explicit-literal discipline `workingRowToDraftItem` already
  demonstrates (§1a). This is the concrete mechanism that satisfies
  this task's "the `validated` draft-only field must never leak into
  finalized StockCount item schema" requirement.
- **REQUIRED BY DECISION 40 §3 / this task item 6.** `recordStockCount`
  (`AppContext.tsx`), StockCount history creation, and
  `BusinessWorthSnapshot` construction are **not modified** — no file
  under `AppContext.tsx` is touched by this Plan.
- **REQUIRED BY THIS TASK ITEM 6.** Finalization continues to source
  its data from `pendingTally`/live component state, never from the
  Firestore draft — unchanged, already true today, re-confirmed by
  Rule 8 §H.
- **OUT OF SCOPE.** `clearPeriodicStockDraft`'s call site and the
  atomic-batch draft deletion inside `recordStockCount` (`AppContext.tsx`
  line 4718) are unchanged; the draft (including whatever `validated`
  flags it held) is deleted exactly when it already is today.

### 1i. Decision 39 preservation (Decision 40 §3; this task item 7)

- **REQUIRED BY DECISION 40 §3 / RULE 8 §F.** No change to
  `rowDebounceTimersRef`'s Map-of-timers structure, its `catalog:`/
  `manual:`/`__meta__` key scheme, `scheduleRowDraftSave`,
  `latestFlushArgs`, `draftInFlightSaveRef`, `flushPeriodicDraftNow`,
  the `visibilitychange`/`pagehide` listeners, or the SPA unmount
  effect. All are reused **exactly as implemented under Decision 39**,
  because `validated` lives on the same row object those mechanisms
  already close over (Rule 8 §F) — no new trigger, no new snapshot
  mechanism, no new serialization path is introduced anywhere in this
  Plan.
- **REQUIRED BY THIS TASK ITEM 7.** No reversion to a single global
  debounce timer; no per-row Firestore documents. Confirmed: nothing
  in §1a–§1h creates a new collection, subcollection, or per-row
  document — `PeriodicStockDraft.items` remains one array in one
  document.

### 1j. Explicitly out of scope (this task item 8; Decision 40 §4)

Initial Stock (`InitialStockCountView.tsx`, `InitialStockDraft`), Add
Stock (`AddStockView.tsx`, `PurchaseDraft*`), Business Worth
calculation, `BusinessWorthSnapshot`, existing StockCount history
schema, Product Memory, Unit Relationship, `firestore.rules`,
`firestore.indexes.json` — **none referenced, none touched, by any
element of this Plan.**

## 2. Row Identity — Explicit Design Decision

| Row type | Identity used for `validated` writes (§1c) | Identity used for `Corrigir`/tally (§1g) | Precedent |
|---|---|---|---|
| Catalog row | `productId` (already stable, already the `catalogRows` object key) | Same `productId`, carried onto the new `StockCountTallyItem.productId?` field | Direct reuse — identical to Decision 39's own catalog-row identity choice |
| Manual row | Array index (matching `updateManualRow`'s existing `manualRows.map((row, i) => ...)` keying) | Array index at the moment `tallyStockCountRows` builds `pendingTally` — safe because, per Rule 8 §E, `manualRows` cannot be reordered while `pendingTally` is non-null (the review screen's render branch fully replaces the active-workspace UI) | Direct reuse of Decision 39's own manual-row identity choice and its existing re-indexing precedent (`handleRemoveManualRow`) |

No new persistent row identity is introduced for either row type. The
manual-row index identity is **not** persisted to Firestore and is
**not** the same thing as `validated` itself — it is only how
`Corrigir` locates which in-memory row to update, exactly the same
role it already plays for `confirmedManualRowIndices`/
`manualRowSaveError` today.

## 3. Exact Data-Flow Changes

1. **Validar (catalog):** click → `handleSaveCatalogRow(productId)` →
   validation checks (unchanged) → `updateCatalogRow(productId, { validated: true })`
   → `catalogRows` state updated → `scheduleRowDraftSave('catalog:' + productId)`
   → (≤800ms later, or on interruption flush) → timer/flush reads
   `latestFlushArgs.current` → `workingRowToDraftItem` serializes
   `validated: true` → full-document `savePeriodicStockDraft` write.
2. **Active-workspace render:** `visibleCatalogEntries`/
   `visibleManualRows` re-derive on every render from `catalogRows`/
   `manualRows`, excluding any row with `validated === true`. The
   underlying objects are unchanged; only the rendered subset shifts.
3. **Accumulated-area render:** `validatedCatalogEntries`/
   `validatedManualRows` re-derive the complementary subset for
   display in §1e's accumulated list.
4. **Corrigir/reopen (either entry point, §1f/§1g):** click →
   resolve identity → `updateCatalogRow`/`updateManualRow(..., { validated: false })`
   → (if from review) `setPendingTally(null)` → row reappears in the
   active workspace on next render (§2) → row becomes editable because
   the same field now gates the lock/unlock rendering branch that
   today reads `confirmedCatalogProductIds`/`confirmedManualRowIndices`.
5. **Resume (`handleResumeDraft`):** `draftItemToWorkingRow(item)`
   restores `validated` for every item exactly as stored → `catalogRows`/
   `manualRows` set from the resumed data → active/accumulated views
   recompute automatically on first render post-resume, no separate
   restoration step required.
6. **Review → Corrigir → re-validate:** identical to step 1, run again
   for the same row after step 4 — no special-casing for "this row was
   previously validated."
7. **Finalization:** `handleRequestConfirmation` → `tallyStockCountRows(allWorkingRows, ...)`
   (unchanged inputs) → `pendingTally` (now carrying identity +
   `validated` for UI purposes only) → `handleConfirmSave` →
   explicit-literal `items` mapping (§1h, `validated` excluded) →
   `recordStockCount` → StockCount history / `BusinessWorthSnapshot`
   (both unchanged) → atomic batch deletes `stockCountDrafts/periodic`
   (unchanged call site).

## 4. Explicit Exclusions (carried verbatim from Decision 40, Rule 8, and this task's own instruction)

- No new Firestore collection, subcollection, or second draft document.
- No conversion of `PeriodicStockDraft.items` into a map.
- No change to `PeriodicStockDraft`'s document identity or
  `firestore.rules`/`firestore.indexes.json`.
- No validation timestamp, audit array, or history of validation
  events.
- No change to `validateWorkingRowForSave`, the zero-quantity
  confirmation gate, or any other existing Guardar-era validation
  rule.
- No change to `rowDebounceTimersRef`, `scheduleRowDraftSave`,
  `latestFlushArgs`, `draftInFlightSaveRef`, `flushInFlightSaveRef`,
  `identityWriteRef`, `flushPeriodicDraftNow`, the `visibilitychange`/
  `pagehide` listeners, or the SPA unmount effect — all Decision 39
  mechanisms reused exactly as implemented.
- No change to `handleRequestConfirmation`'s existing guards, to
  "Voltar," to `handleConfirmSave`'s await ordering, to
  `recordStockCount`'s signature, or to `clearPeriodicStockDraft`.
- No change to Initial Stock, Add Stock, Business Worth calculation,
  Unit Relationship, or Product Memory.
- No new BDR, no reopening of Decision 40, no reopening of the READY
  Rule 8 Assessment.

## 5. Testing Plan

Mapped 1:1 to this task's own list and to Rule 8 §K's required-tests
list, following this repository's established no-DOM-harness,
source-structure-assertion convention (the same style already used by
`periodic-contagem-autosave-safety-decision-39.test.ts` and its
siblings).

**Tests to add:**

1. **Validar sets persisted state, not only local UI state** —
   structural assertion that `handleSaveCatalogRow`/`handleSaveManualRow`
   call `updateCatalogRow`/`updateManualRow` with `{ validated: true }`
   (or an equivalent state-setting call reaching `catalogRows`/
   `manualRows`), not merely a `useState<Set>` setter in isolation.
2. **Full round-trip of `validated` through `workingRowToDraftItem`/
   `draftItemToWorkingRow`**, including the absent/legacy case
   (`validated: undefined` in → omitted from the persisted literal →
   `undefined` back out) — mirroring existing `removed` round-trip
   coverage in `periodic-stock-finalization.test.ts`'s emulator-backed
   style.
3. **Active-workspace filtering excludes validated rows while proving
   they remain in `allWorkingRows`/`catalogRows`/`manualRows`** — the
   single most safety-critical test per Rule 8 §C/§I: assert a
   validated row is absent from `visibleCatalogEntries`/
   `visibleManualRows` but present, unchanged, in `allWorkingRows`.
4. **Accumulated-area rendering** — `validatedCatalogEntries`/
   `validatedManualRows` contain exactly the rows `visibleCatalogEntries`/
   `visibleManualRows` exclude (the two views are complementary
   partitions of `catalogRows`/`manualRows`, modulo `removed`).
5. **Extended `StockCountTallyItem` carries identity + `validated`
   status** correctly per item, sourced from the same row
   `tallyStockCountRows` already iterates.
6. **`Corrigir` clears `validated`, discards `pendingTally`, and
   reopens the correct row** — both catalog (by `productId`) and
   manual (by index) — including an explicit assertion that
   `setPendingTally(null)` is called as part of `Corrigir`, not only
   the field-clear.
7. **Resume with a partially validated draft** (A validated, B
   validated, C not) — extends `periodic-stock-draft-resurrection.test.ts`'s
   existing style: A/B resume `validated: true` and excluded from the
   active view; C resumes unvalidated and active.
8. **T0/T100-style proof for `validated` specifically** — mirroring
   `periodic-contagem-autosave-safety-decision-39.test.ts`'s existing
   describe-block-C race proof, applied to the new field: a stale
   row's timer cannot revert another row's more recent `validated`
   change.
9. **Manual-row removal/re-indexing with a validated row involved** —
   confirms `handleRemoveManualRow`'s existing re-indexing block
   correctly carries a removed row's own `validated: true` forward via
   the array `.filter()`, with no separate re-indexing structure
   needed for `validated` itself (since it lives on the row, not in a
   parallel Set — Rule 8 §C, FR-N9).
10. **Finalization-regression: `validated` never reaches `recordStockCount`'s
    `items` payload** — explicit assertion that the object literal
    `handleConfirmSave` builds contains no `validated` (or tally-only
    identity) key.
11. **Legacy draft without `validated` anywhere resumes with every row
    treated as not-validated** (falsy-safe filter, §1d).
12. **All-validated draft resumes with zero rows in the active
    workspace** and no error/invariant violation.

**Regression tests that must remain passing, unmodified in behavior:**

- `periodic-contagem-autosave-safety-decision-39.test.ts` — full
  suite; nothing in this Plan changes per-row scheduling, live-state
  sourcing, or global serialization.
- `periodic-stock-interruption-durability.test.ts` — full suite;
  `flushPeriodicDraftNow`'s trigger wiring is unmodified.
- `periodic-stock-draft-resurrection.test.ts` — full suite; the
  cancel/await ordering ahead of `recordStockCount` is unmodified
  (extended only by test #7, above, for the new field's own resume
  behavior).
- `periodic-stock-finalization.test.ts` — full suite, including the
  300-row round-trip test; `removed`'s own existing round-trip
  behavior must remain byte-for-byte identical alongside the new
  `validated` round-trip.
- `periodic-stock-review-screen-price.test.ts` — full suite; the
  existing `sellingValue` rendering, row-keying
  (`${productName}-${unit}-${index}`), and total-figure assertions
  must remain unaffected by the additive identity/`validated` fields
  and the new `Corrigir` control.
- `periodic-stock-portion-grouping-wiring.test.ts` — full suite;
  `visibleCatalogEntries`'s existing role in portion-label computation
  is unaffected by the additional `!row.validated` filter term (a
  validated row was never a "portion to label" for grouping purposes
  in the first place, matching the same reasoning already applied to
  `removed` rows there).

**Explicit negative/out-of-scope tests (proving no unintended change):**

1. **Initial Stock** — `InitialStockCountView.tsx`/`InitialStockDraft`
   are not imported, referenced, or modified by any change this Plan
   describes; existing Initial Stock test files require zero changes.
2. **Add Stock** — `AddStockView.tsx`/`PurchaseDraft*` untouched;
   existing Add Stock test files require zero changes.
3. **Business Worth calculation** — `BusinessWorthSnapshot`
   construction and `measuredBusinessWorth` inputs are unchanged;
   assert `recordStockCount`'s call signature in
   `handleConfirmSave` is unchanged (same named parameters, no new
   `validated`-derived argument).
4. **Finalized StockCount schema** — assert no new field appears on a
   persisted `StockCount`/`stockCounts` document as a result of this
   work (extends test #10 above into an explicit schema-shape
   assertion).
5. **Decision 39 autosave architecture** — assert
   `rowDebounceTimersRef` remains a single `Map` (not restructured
   into per-field or per-flag maps), `draftInFlightSaveRef` remains a
   single ref, and no new debounce/flush function is introduced
   alongside `scheduleRowDraftSave`/`flushPeriodicDraftNow`.
6. **Firestore rules/indexes** — assert `firestore.rules` and
   `firestore.indexes.json` are byte-identical to this Plan's baseline
   commit (a pure file-diff assertion, not a rules-emulator test).
7. **Guardar semantics beyond the authorized rename** — assert
   `validateWorkingRowForSave` and the zero-quantity `window.confirm`
   gate are unchanged in source (same conditions, same messages),
   proving the rename introduced no new validation rule.

**Files expected to change/add for tests:**
- `tests/periodic-contagem-autosave-safety-decision-39.test.ts` — no
  change expected (regression only).
- `tests/periodic-stock-draft-resurrection.test.ts` — extended with
  test #7 (partially validated resume).
- `tests/periodic-stock-finalization.test.ts` — extended with test #2
  (validated round-trip) and test #10 (finalization-regression
  assertion), alongside its existing `removed`-focused round-trip
  coverage.
- `tests/periodic-stock-review-screen-price.test.ts` — extended with
  test #5/#6 (extended `StockCountTallyItem`, `Corrigir`), or a new
  sibling file if the Implementation Authorization judges the existing
  file's scope too narrow for the added `Corrigir` coverage —
  left as an implementation-task-level choice, not fixed here.
- A new dedicated test file (naming left to the Implementation
  Authorization, matching this repository's per-feature convention)
  covering tests #1, #3, #4, #8, #9, #11, #12, and the negative/
  out-of-scope tests #1–#7 above.

## 6. Governance Dependency

This Plan implements only the signed Decision 40 amendment and the
READY Rule 8 Assessment referenced in its governing chain, above.
Every element in §1–§5 traces directly to a specific FR (FR-N5 through
FR-N12) or a specific Rule 8 finding (§B's additivity proof, §C's
filtering-safety proof, §D/§E's review/Corrigir design, §F's
autosave-compatibility proof, §G's resume proof, §H's finalization
proof), with no addition, narrowing, or reinterpretation of either. No
conflict with the parent Specification, Decision 38, or Decision 39
was discovered while drafting this Plan. **No STOP condition
triggered. No new Product Architect decision required** — the one
open item Rule 8 §L named (exact manual-row identity representation
in `StockCountTallyItem`) is resolved within this Plan's §2 using the
existing, already-governed array-index convention, with no
implementation-detail choice here rising to the level of a governance
question.

## 7. Scope Audit

Confirmed at the time of drafting this Plan:

- No `apps/`, `src/`, `server/`, `firestore.rules`, or
  `firestore.indexes.json` file was modified.
- No `tests/` file was modified.
- No unrelated governance artifact (Decision 38, Decision 39 and its
  own Rule 8/Plan/Authorization, any BDR, any POL) was modified.
- The signed Decision 40 amendment and the READY Rule 8 Assessment
  were read, not reopened, altered, or reinterpreted — every
  requirement traced in §1–§5 above cites the specific FR or Rule 8
  section it implements, with no new requirement invented beyond
  those two documents' own text.
- No schema restructuring (`PeriodicStockDraft.items` remains one
  array in one document; `validated` is the only new field, additive,
  optional).
- No Firestore rules or index change of any kind.
- Nothing in this Plan was committed.
- Nothing in this Plan was pushed.

## 8. Next Governance Step

This Plan does not authorize implementation. Per this project's
standing discipline: a separate, signed **Implementation
Authorization** is the next and final gate before any code is written
— not created by this document.
