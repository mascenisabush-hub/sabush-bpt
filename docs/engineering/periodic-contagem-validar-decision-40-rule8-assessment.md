Rule 8 Assessment — DRAFT, READ-ONLY

# Rule 8 Assessment — Periodic Contagem Validar Workflow (Decision 40)

**STATUS:** 🟡 **DRAFT — RULE 8 ASSESSMENT.** NOT SIGNED. NOT AN
IMPLEMENTATION AUTHORIZATION. This document does not authorize
implementation, and is not committed or pushed unless explicitly
instructed separately.

**VERDICT: READY**

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented on `main`) → [Decision 40
amendment](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ **ACCEPTED AND AUTHORIZED** — SABUSHIMIKE MASCENI, Product
Architect, 29 August 2026) → **this assessment**.

**Repository baseline:** `main = origin/main = bdcace8840f159c0dc5709f9eadae1c202b2dd2a`,
working tree clean, confirmed via `git fetch` immediately before this
assessment began. This commit already contains Decision 39
(per-row 800ms autosave scheduling, live-state-at-fire-time sourcing,
global write serialization, SPA/unmount flush) as shipped code, and
the signed Decision 40 amendment as governance text only — no
application code implementing Decision 40 exists yet at this baseline.

**Scope of this assessment:** exactly what Decision 40 authorizes —
Guardar→Validar renaming, persisted row-owned `validated?: boolean`,
active-workspace filtering (never deletion), the accumulated/review
area, the `Corrigir` correction path, and their interaction with
Decision 39's existing autosave mechanisms. Not in scope: any
schema/storage-shape change beyond the single additive field
(explicitly excluded by the amendment's own §4), Initial Stock, Add
Stock, Business Worth calculation, StockCount history schema, or any
change to finalization's own control structure.

---

## A. Authority Reviewed

Read fresh from the repository this session (not from memory of
prior drafting):

- `docs/specs/stock-count-data-loss-resilience-specification.md`
  (parent spec, Frozen, Decision 38 applied; §13's open-items list and
  §6's interruption-durability requirement re-read in full).
- `docs/specs/stock-count-data-loss-resilience-decision-39-amendment.md`
  (✅ Accepted and Authorized, 28 August 2026) — re-read in full,
  including its §3 ("What This Amendment Does Not Change," which
  explicitly states Guardar/Validar's semantics are unaffected by
  Decision 39) and its §4 non-goals (no storage-shape change).
- `docs/specs/stock-count-data-loss-resilience-decision-40-amendment.md`
  (✅ Accepted and Authorized, 29 August 2026) — re-read in full: §2
  (FR-N5–FR-N12), §3 (unchanged items), §4 (explicit non-goals), §5
  (governance classification: Specification Amendment, no new BDR),
  §7 (signature, confirmed present and dated).
- `apps/tenant/src/components/PeriodicStockCountView.tsx` (current
  implementation, re-traced fresh at this baseline — §B/C/D/E below).
- `apps/tenant/src/context/AppContext.tsx` (`recordStockCount`,
  `savePeriodicStockDraft`, `clearPeriodicStockDraft` — §H below).
- `apps/tenant/src/utils/stockCount.ts` (`StockCountWorkingRow`,
  `StockCountTallyItem`, `tallyStockCountRows`, `workingRowToDraftItem`,
  `draftItemToWorkingRow` — §B below).
- `apps/tenant/src/types.ts` (`PeriodicStockDraft`,
  `PeriodicStockDraftItem` — §B below).
- `firestore.rules` (`stockCountDrafts/{draftId}` — re-confirmed no
  field-shape validation exists; §B below).
- Existing test files covering this surface (§K below).

**Verified: Decision 40's signed text authorizes FR-N5 through FR-N12
exactly as stated in this task's own summary, with no discrepancy
found between the task's restatement and the signed amendment.**

## B. Data Model — Fresh Trace at This Baseline

- **`PeriodicStockDraftItem`** (`types.ts` ~1365–1377): flat fields —
  `productId?, productName, quantity, unit, costPrice, sellingPrice,
  removed?`. Optional fields are omitted entirely when absent (never
  written as literal `undefined`), per the type's own governing
  comment, which explicitly cites this as matching
  `savePurchaseDraft`'s documented fix "for this exact class of bug."
  **Adding `validated?: boolean` here is the same shape of change as
  the existing `removed?: boolean` field — additive, optional, no
  restructuring of the type.**
- **`PeriodicStockDraft`** (~1379–1410): `{ items: PeriodicStockDraftItem[],
  type, label?, date, submissionId?, newProductInfo?, updatedAt }`.
  One document, one array. Decision 40 (§4 of its amendment) forbids
  converting this into a map/subcollection — confirmed nothing in the
  current structure requires that conversion for `validated` to work;
  the array-of-flat-objects shape already carries `removed` as a
  precedent for exactly this kind of per-row boolean.
- **`StockCountWorkingRow`** (`utils/stockCount.ts` ~192–236): the
  in-memory mirror of the persisted item shape, same fields plus a
  documented exclusion list (UI-only fields deliberately NOT persisted,
  e.g. `newProductSellingUnit` — moved out under Decision 37/B.1).
  **`validated?: boolean` belongs on this type as a normal persisted
  field, not on the UI-only exclusion list** — it is exactly the kind
  of field `removed` already is: persisted, per-row, read by rendering
  logic.
- **`workingRowToDraftItem`** (~376–394) and **`draftItemToWorkingRow`**
  (~402–420): both build **explicit field-by-field literals**, never
  `{ ...row }` spreads. This is a deliberate, already-documented
  discipline (the type's own comment: "deliberately NOT referenced...
  both build explicit, field-by-field object literals rather than
  spreading `row`"). **Consequence: `validated` will NOT silently
  round-trip by accident — it requires one explicit added line in
  each of these two functions, exactly mirroring the existing
  `...(row.removed !== undefined ? { removed: row.removed } : {})`
  pattern already present in `workingRowToDraftItem`, and the existing
  `removed: item.removed` pass-through already present in
  `draftItemToWorkingRow`.** This is a feature, not friction: it is
  the reason a change here is provably scoped to exactly the fields
  named, with no risk of accidentally leaking a UI-only field into
  Firestore.
- **Autosave serialization**: `scheduleRowDraftSave` (~966–1015)
  reads `latestFlightArgs.current` — actually `latestFlushArgs.current`
  — at fire time and builds `allRows = [...Object.values(cr), ...mr].map(workingRowToDraftItem)`,
  i.e. a **full-document overwrite of every row's current in-memory
  state**, every time any single row's timer fires. Confirmed
  identical in `flushPeriodicDraftNow` (~1230–1250). **This means:
  once `validated` is added to `StockCountWorkingRow` and threaded
  through `workingRowToDraftItem`, it is automatically included in
  every autosave write with no additional wiring** — the existing
  full-overwrite design is exactly what makes this additive.
- **Draft resume** (`handleResumeDraft`, ~1712–1744): rebuilds
  `catalogRows`/`manualRows` via `draftItemToWorkingRow(item)` for
  every stored item, then merges in any product missing from the
  resumed set via `buildCatalogRow`. **Confirmed: this function
  currently does NOT restore `confirmedCatalogProductIds`/
  `confirmedManualRowIndices`** (nothing populates those Sets from
  resumed data) — this is precisely the gap Decision 40 exists to
  close, and it closes automatically once `validated` lives on the
  row object restored by `draftItemToWorkingRow`, requiring no
  separate Set-restoration logic at all.

**Backward compatibility — old drafts without `validated`:**

- `draftItemToWorkingRow`'s existing discipline for `removed` (a
  plain field copy, `removed: item.removed`, which is `undefined` for
  a document written before that field existed) is the exact and only
  precedent needed. Extending this identically for `validated` means
  a legacy item without the field resumes with `row.validated ===
  undefined`.
- `visibleCatalogEntries`-style filtering must treat `undefined` as
  "not validated" (`!row.validated`, matching the existing `!row.removed`
  pattern) — never require the field to be explicitly `false`. This
  is a direct requirement carried into the Implementation Plan (see
  §Implementation Constraints, below), not an assumption; the existing
  `!row.removed` filter already establishes this exact idiom in the
  same file.
- `tallyStockCountRows` (utils/stockCount.ts ~276–351) builds an
  explicit `StockCountTallyItem` literal per row and does not need to
  read `validated` at all for its existing Counted/Not-Counted logic
  — confirmed this function's behavior is untouched by Decision 40
  (per the amendment's own FR-N12), so no backward-compatibility
  concern arises there.
- **No migration is required or should be invented.** No repository
  evidence (existing migration scripts, existing "backfill" patterns
  for `removed` when it was introduced, or any Firestore Cloud
  Function touching this collection) suggests one was ever performed
  for `removed`, and none is needed for `validated` for the identical
  reason: an absent optional field on a flat, unvalidated-by-rules
  document resumes safely as "falsy" by construction.

## C. Validar Workflow — Safest Implementation Path

- **`handleSaveCatalogRow`** (~1057–1081) / **`handleSaveManualRow`**
  (~1603–1623): both currently end with `setConfirmedCatalogProductIds(...)`
  / `setConfirmedManualRowIndices(...)` — pure `useState<Set>`
  mutation, no interaction with `catalogRows`/`manualRows` at all.
  **The safest replacement path, given B above, is: instead of (or in
  addition to, during a transition) updating a separate Set, call the
  existing `updateCatalogRow(productId, { validated: true })` /
  `updateManualRow(index, { validated: true })` — the exact same
  functions every other field edit already uses.** This is safest
  because it requires no new autosave trigger, no new ref, and no new
  timer-key scheme: `updateCatalogRow`/`updateManualRow` already call
  `scheduleRowDraftSave` with the row's existing, disjoint key
  (`catalog:${productId}` / `manual:${index}`), which is exactly the
  mechanism FR-N10 requires be reused unmodified.
- **`confirmedCatalogProductIds`/`confirmedManualRowIndices`
  rendering uses**: confirmed exactly two call sites each — the dot
  color/label at ~3071/3080 (catalog) and its manual-row twin at
  ~3619, and the Guardar/Editar button branch further down each row's
  markup. **None of these currently gate row visibility** — confirmed
  by inspection of `visibleCatalogEntries` (§below), which filters
  only on `!row.removed`, never on confirmed status. This proves the
  current "confirmed" concept and the "leaves the active workspace"
  requirement are, today, two entirely separate axes — Decision 40
  is what unifies them, not something that already half-exists and
  needs untangling.
- **Active-row filtering — proof that filtering, not deletion, keeps
  rows available:** `visibleCatalogEntries` (~1780–1786) filters
  `Object.entries(catalogRows)` — it does not touch `catalogRows`
  itself. `allWorkingRows` (~1798–1801), which is what
  `tallyStockCountRows`/finalization actually consume, is built from
  `Object.values(catalogRows)` and `manualRows` **directly, bypassing
  `visibleCatalogEntries` entirely**. This is the load-bearing proof
  required by this task's instruction not to assume filtering is
  safe: **a row filtered out of the active-workspace view by a new
  `validated`-aware predicate remains in `catalogRows`/`manualRows`,
  therefore remains in `allWorkingRows`, therefore remains fully
  visible to `tallyStockCountRows`, `scheduleRowDraftSave`'s
  full-overwrite payload, and `recordStockCount`'s eventual input —
  at every single point in the pipeline, with no additional code
  needed to "keep" it there, because nothing in the proposed change
  touches `catalogRows`/`manualRows`/`allWorkingRows`'s own
  construction.**
- **Manual-row identity/reindexing**: `manualRows` is a plain array;
  `handleRemoveManualRow` (~1534–1597) already re-indexes
  `rowDebounceTimersRef`, `confirmedManualRowIndices`, and
  `manualRowSaveError` in lockstep on removal, with an explicit
  comment explaining why. **Because Decision 40 stores `validated` on
  the row object itself (`manualRows[index].validated`) rather than
  in a separate index-keyed Set, this specific re-indexing hazard
  does not apply to validated state at all** — `.filter()`-based
  removal or reordering carries each row's own `validated` flag with
  it automatically, exactly like it already carries `quantity`/
  `costPrice`/etc. This is confirmed as the most significant technical
  simplification Decision 40's own FR-N9 requires versus a naive
  Set-based port of the current confirmed-state mechanism.
- **Editing/reopening**: `handleEditCatalogRow`/`handleEditManualRow`
  (~1088–1096, ~1625–1633) already implement the "queres editar?"
  gate and already clear the relevant Set entry. **The direct
  replacement is: clear `validated` via the same `updateCatalogRow`/
  `updateManualRow` path** (`{ validated: false }`), which
  simultaneously (a) makes the row editable again by definition (the
  new active-workspace filter predicate keys off this exact field)
  and (b) schedules the correction's own persistence through the
  existing per-row timer, with no separate step required.

## D. Accumulated/Review Area — Minimum Change

- **`pendingTally`** is built once, in `handleRequestConfirmation`
  (~1973), via `tallyStockCountRows(allWorkingRows, ...)` — **all**
  rows, validated or not; `StockCountTallyItem` (utils/stockCount.ts
  ~238–255) carries `productName, quantity, unit, costPrice,
  sellingPrice, purchaseValue, sellingValue, costBasisEstablished` —
  no row identity (no `productId`, no manual index) and no validated
  flag today.
- **Rendering** (~2514–2653): a read-only `.map()` over
  `pendingTally.countedItems`, keyed by `${productName}-${unit}-${index}`
  purely for React's own sibling-key uniqueness (documented as
  deliberately NOT a stable row identity — "StockCountTallyItem
  carries no row id of its own; index is safe here since this list
  is always freshly rebuilt from scratch"). **"Voltar" is exactly
  `setPendingTally(null)`** — confirmed, no partial/targeted return
  path exists today.
- **Minimum change required, and no more:**
  1. Add row identity to `StockCountTallyItem` (a `productId?: string`
     for catalog rows, or a manual-row identity — see the open
     product-architect note in §L below on exact shape) — additive
     field on an already-internal, non-persisted type (confirmed:
     `StockCountTallyItem` is never written to Firestore; it exists
     only to drive this screen and the totals).
  2. Add `validated: boolean` to the same type, sourced directly from
     the row `tallyStockCountRows` is already iterating — no new data
     source, no second pass over `allWorkingRows`.
  3. Render a single `Corrigir` control per item, wired per §E below.
  4. **No other change** to this screen's layout, its two summary
     tiles, its Not-Counted section, or its total figure — all of
     which are explicitly out of Decision 40's scope (its own §4
     non-goal: "Any redesign of the `pendingTally` review screen
     beyond the minimal identity/status carrying and the single
     'Corrigir' affordance").
- This satisfies every one of Decision 40's §2/FR-N11 requirements
  (show accumulated validated products, distinguish validated from
  active, preserve correction capability, identify the exact row) with
  no restructuring of the screen's existing data flow.

## E. Corrigir — Safest Mechanism, Proven Step by Step

1. **Exact row identification**: for a catalog row, `productId`
   (already stable and already the map key of `catalogRows` — no new
   identity scheme needed). For a manual row, the existing convention
   throughout this file is **array index** — confirmed used
   identically by `confirmedManualRowIndices`, `manualRowSaveError`,
   and `handleRemoveManualRow`'s own re-indexing. **Because
   `pendingTally` is rebuilt fresh from `allWorkingRows` on every
   confirmation attempt (never persisted across renders, confirmed
   §D), a manual row's index at the moment `Corrigir` is clicked is
   guaranteed to still match its current position in `manualRows`** —
   there is no interleaving window where the array could have been
   reordered between `tallyStockCountRows` running and the Owner
   clicking `Corrigir` on its output, since both happen synchronously
   within the same static screen (no autosave-triggered reordering of
   `manualRows` exists anywhere in this file — only content updates
   and explicit add/remove, both of which are direct Owner actions
   that would already dismiss `pendingTally` first, per current
   behavior traced in §D).
2. **Becomes active again**: the active-workspace filter predicate
   (§C) keys off `validated`; once that flag is cleared for this one
   row, it is picked up by the *existing* `visibleCatalogEntries`-
   style `useMemo` on its next recompute — no imperative "move it
   back" step is needed, only a state update the memo already reacts
   to.
3. **`validated` becomes false**: via `updateCatalogRow(productId,
   { validated: false })` / `updateManualRow(index, { validated: false })`
   — the same functions §C already establishes as the single write
   path for this field, reused here for the inverse transition.
4. **Editing re-enabled**: automatic, by construction — the row's
   locked/unlocked rendering already branches on the same kind of
   flag today (`isConfirmed`); replacing that condition's source with
   `row.validated` makes "not validated" and "editable" the same fact
   by definition, with no separate enable/disable step.
5. **Autosave persists the correction**: `updateCatalogRow`/
   `updateManualRow` already call `scheduleRowDraftSave` with that
   row's own key — the `validated: false` write and every subsequent
   content edit to that same row share the same 800ms debounce
   window and the same eventual full-document overwrite, exactly as
   Decision 39 already guarantees for any other field.
6. **Re-validation afterward**: identical to the original Validar
   action (§C) — `handleSaveCatalogRow`/`handleSaveManualRow` run
   again, setting `validated: true` again, through the same code
   path, with no special-casing for "this was previously validated."
7. **`pendingTally` discarding**: `Corrigir` must call
   `setPendingTally(null)` in addition to clearing `validated` for
   that one row — otherwise the Owner would be looking at a stale
   snapshot while editing live state, which is exactly the
   review/working-state divergence class of bug this task's §I
   explicitly asks to be ruled out (see §I.8 below). This mirrors
   "Voltar"'s own existing behavior exactly, plus the one additional
   targeted field-clear.

**Manual-row identity — explicit risk closed:** the one scenario that
would break index-based identity is a manual row being removed by a
concurrent action between `pendingTally` being built and `Corrigir`
being clicked. Traced and ruled out in point 1 above: no code path
mutates `manualRows`' order or length while `pendingTally` is
non-null, since every add/remove handler is only reachable from the
active-workspace UI, which `pendingTally`'s own render branch
(`if (pendingTally) { return (...) }`, ~2514) replaces entirely while
it is showing.

## F. Autosave Integration — Decision 39 Compatibility, Proven

Point-by-point, per this task's explicit requirements:

- **Validating a row schedules persistence correctly**: yes —
  `updateCatalogRow`/`updateManualRow` unconditionally call
  `scheduleRowDraftSave(rowKey)` on every invocation, and setting
  `validated` goes through no other path (§C). No new scheduling
  logic is introduced; the existing call is simply invoked with a
  different field in its `fields` argument.
- **Validated state is included in the autosaved payload**: yes,
  once `workingRowToDraftItem` is extended (§B) — `scheduleRowDraftSave`'s
  timer body (~997–998) always maps `Object.values(cr)` /
  `manualRows` through `workingRowToDraftItem` at fire time, so any
  field that function knows how to serialize is included in every
  write, unconditionally.
- **Another row's timer cannot revert validation state**: this is
  exactly the T0/T100 property Decision 39's FR-N2 already
  establishes and the existing test suite
  (`periodic-contagem-autosave-safety-decision-39.test.ts`, describe
  block C) already proves for ordinary field edits. Because
  `validated` is read from `latestFlushArgs.current` at fire time
  identically to every other field on the row (§B — it is not a
  separate ref, not a separate snapshot), **the identical proof
  applies without modification**: whichever row's timer fires,
  it reads the live, current value of every row's `validated` flag,
  including one set by a different row's own more-recent action.
- **Live-state-at-fire-time remains intact**: unmodified — Decision
  40 introduces no second state-sourcing mechanism; it adds one field
  to the same `catalogRows`/`manualRows` objects `latestFlushArgs`
  already closes over.
- **Global write serialization remains intact**: unmodified —
  `draftInFlightSaveRef` is untouched by anything in Decision 40;
  validating triggers the same single, shared "await in-flight, then
  write" discipline every other field edit already uses.
- **Interruption flush includes validation state**: yes, automatically
  — `flushPeriodicDraftNow` (~1230) builds its payload the same way
  (`[...Object.values(cr), ...mr].map(workingRowToDraftItem)`), so
  once that function serializes `validated`, every trigger of the
  flush (visibilitychange, pagehide, and Decision 39's SPA unmount)
  includes it with no per-trigger change needed.
- **SPA unmount flush includes validation state**: same proof as
  above — the unmount-triggered call and the browser-level calls
  invoke the identical `flushPeriodicDraftNow` function.
- **No stale snapshot can resurrect a previously validated row**:
  traced directly — there is no code path in this file that captures
  a `catalogRows`/`manualRows` snapshot at any point other than (a)
  `latestFlushArgs.current`, reassigned unconditionally every render,
  or (b) the one-time build of `pendingTally` at
  `handleRequestConfirmation` time, which is explicitly discarded
  (§E point 7) before any correction is allowed to proceed. There is
  no third snapshot mechanism that could hold a stale, pre-validation
  or pre-correction value and later overwrite a newer one.

## G. Resume / Recovery — Lifecycle Trace

**Scenario as specified:** A→Validar, B→Validar, C→active,
interruption, Retomar Contagem.

- At the moment of interruption (refresh, SPA nav, or close), the
  most recent flush (§F) has already written `validated: true` for A
  and B, and `validated` absent/false for C, into the single
  `stockCountDrafts/periodic` document, via the exact same full-array
  overwrite mechanism proven in §B/§F.
- `handleResumeDraft` (§B) rebuilds `catalogRows`/`manualRows` via
  `draftItemToWorkingRow` for every stored item — once that function
  copies `validated` through (a one-line addition mirroring its
  existing `removed: item.removed` line), **A and B resume with
  `validated: true`, C resumes with `validated: undefined`/`false`**,
  with no additional restoration logic required (confirmed: this is
  exactly why FR-N7's round-trip requirement is sufficient by itself
  — nothing else needs to change in `handleResumeDraft`).
- **A and B return as validated/accumulated**: yes — the
  active-workspace filter (§C) excludes them from the active view the
  moment `catalogRows`/`manualRows` are set from the resumed data,
  since the filter predicate is evaluated fresh on every render,
  including the first render after resume.
- **C returns as active/unvalidated**: yes — same mechanism, inverse
  outcome.
- **No validated product is lost**: proven in §C — filtering never
  removes a row from `catalogRows`/`manualRows`, and resume populates
  those from the persisted array in full, one entry per persisted
  item.
- **No validated product becomes duplicated**: the catalog-merge
  effect (~828–837) only adds a product missing from the resumed set
  (`prev[product.id] || buildCatalogRow(product)`) — it cannot
  duplicate an entry the resumed draft already provided, since it is
  keyed by `product.id` in an object, not appended to an array.
  Manual rows are read 1:1 from `periodicStockDraft.items` with no
  merge step at all for the non-catalog branch (~1718–1723).
- **No validation state is silently reset**: proven by the same
  round-trip argument — nothing in `handleResumeDraft` initializes
  `validated` to any value other than what `draftItemToWorkingRow`
  returns for that item.

**Legacy/edge drafts:**
- *Legacy draft without `validated` anywhere*: every item resumes
  with `validated: undefined`, uniformly treated as "not validated"
  by the filter (§B's backward-compatibility finding) — the entire
  draft resumes into the active workspace, matching current behavior
  exactly (today, nothing is ever pre-validated on resume either,
  since confirmed state isn't persisted at all).
- *All-unvalidated draft*: identical to current resume behavior,
  unchanged.
- *All-validated draft*: every row resumes filtered into the
  accumulated view; the active workspace shows zero rows — this is a
  valid, expected state (the Owner had validated everything before
  the interruption) and requires no special-casing, since the filter
  is a pure per-row predicate, not a "there must be at least one
  active row" invariant anywhere in the traced code.
- *Partially validated draft*: the general case already proven above.

## H. Finalization — Traced, Confirmed Unmodified

- **`handleRequestConfirmation`** (~1964–2053): builds
  `tallyStockCountRows(allWorkingRows, ...)` — confirmed (§C) that
  `allWorkingRows` is sourced directly from `catalogRows`/`manualRows`,
  never from the filtered `visibleCatalogEntries` view, so **every
  row, validated or not, corrected or not, is included in the
  finalization tally with its current, live values** — a corrected
  row's latest edit is exactly what this reads, since it reads
  component state, never the draft, at the exact moment of
  confirmation.
- **`handleConfirmSave`** (~2065–2150+): cancels every pending per-row
  timer, awaits any in-flight ordinary autosave, awaits the identity
  write, awaits the interruption-flush write (§4a/§4b/§4c, Decision
  38/39's own established ordering) — **entirely unaffected by
  `validated`'s existence**, since none of these steps branch on it;
  they operate on the same `allRows`/`pendingTally` data Decision 40
  does not restructure.
- **`recordStockCount`** (`AppContext.tsx` ~3954 onward): receives
  `items: pendingTally.countedItems.map(...)` — confirmed by direct
  inspection that its parameter list and body never reference the
  Firestore draft document at all, only the explicit `items` array
  the caller supplies. **`validated` cannot reach this function even
  indirectly**, because `StockCountTallyItem`'s new `validated` field
  (§D) is never included in the object literal `handleConfirmSave`
  builds for `recordStockCount`'s `items` parameter — confirmed this
  mapping (~2149) already builds an explicit, named literal (`productName`,
  `quantity`, etc.), the same explicit-literal discipline as
  `workingRowToDraftItem` (§B), so a new field on the source type
  does not leak into the finalized StockCount by accident.
- **Draft deletion**: confirmed at `AppContext.tsx` line 4718 —
  `fsBatch.delete(doc(db, 'businesses', businessId, 'stockCountDrafts', 'periodic'))`
  — inside `recordStockCount`'s own atomic Firestore batch, the same
  batch that writes the StockCount. **This is the existing
  finalization path Decision 40 §9 requires remain authoritative, and
  it is untouched by this amendment**; the draft (including any
  `validated` flags it held) is deleted exactly when it already is
  today, by the exact same code, regardless of whether any row was
  ever validated.
- **BusinessWorthSnapshot**: created downstream of `recordStockCount`
  from the same `items`/tally figures already proven untouched above
  — no new input, no new branch, no reference to `validated` anywhere
  in that path.

## I. Failure Scenarios — Explicit Assessment

1. **Validate A → autosave succeeds → validate B.** Two independent
   per-row timers (`catalog:A`, `catalog:B`), each firing
   independently, each writing the full live state including both
   flags once both are set. **Satisfied.**
2. **Validate A → immediately validate B.** Same as above; no shared
   timer to collide on (§F's disjoint-key proof, already established
   by Decision 39 and unmodified here). **Satisfied.**
3. **Validate A → browser closes.** `pagehide` fires
   `flushPeriodicDraftNow`, which reads live state including A's
   `validated: true` (§F). **Satisfied.**
4. **Validate A → SPA navigation.** Unmount-cleanup flush, same
   function, same guarantee. **Satisfied.**
5. **Validate A/B → refresh → Retomar.** Traced fully in §G.
   **Satisfied.**
6. **Validate A → Corrigir A → modify → validate A again.** Traced in
   §E: `validated` toggles false then true again through the same
   write path each time; each toggle and each content edit schedules
   through A's own timer key, each write is a full live-state
   overwrite. No special-casing required, none introduced.
   **Satisfied.**
7. **Validate many products → one active product remains.** Covered
   by §G's "all-validated except one" case — a pure per-row filter
   predicate with no minimum-active-row invariant anywhere in the
   traced code. **Satisfied.**
8. **Correct a product during final review.** This is exactly the
   `Corrigir` flow (§E) — `pendingTally` is explicitly discarded
   before the row reopens, closing the review/working-state
   divergence risk this task's own §I explicitly asks to be ruled
   out. **Satisfied**, contingent on the Implementation Plan
   preserving the `setPendingTally(null)` step as part of `Corrigir`
   (carried into constraints below).
9. **Legacy draft has no `validated` field.** Traced in §B/§G:
   resumes as `undefined`, uniformly treated as not-validated.
   **Satisfied.**
10. **Autosave fires while another row is being validated.** Both
    are, at most, a `setState` call followed by that row's own
    `scheduleRowDraftSave` — React state updates are synchronous
    within a single event handler and batched; there is no code path
    where two rows' timers fire inside the same JS tick such that one
    could read a torn/partial state. Both ultimately read from the
    same `latestFlushArgs.current`, updated unconditionally on every
    render (§F). **Satisfied.**
11. **A manual row is corrected/reopened.** Traced in §E point 1 —
    index-based identity holds for the reasons given (no reordering
    possible while `pendingTally` is showing). **Satisfied.**
12. **A manual row is removed while other manual rows remain.**
    Unaffected by Decision 40: `handleRemoveManualRow`'s existing
    re-indexing (§C) already re-keys `rowDebounceTimersRef`,
    `confirmedManualRowIndices` (or its `validated`-based
    replacement, which needs no separate re-indexing since it lives
    on the row itself — §C), and `manualRowSaveError`; a validated
    manual row being removed carries its own `validated: true`
    forward with it via the array `.filter()`, same as every other
    field. **Satisfied.**
13. **Final confirmation immediately after validation.** §H proves
    `handleConfirmSave` already awaits every in-flight/pending write
    (ordinary autosave, identity, interruption flush) before calling
    `recordStockCount` — this ordering is unmodified by Decision 40,
    so a validation's own pending 800ms write is included in that
    same await chain, not raced against. **Satisfied.**
14. **Accidental navigation during partially validated work.**
    Identical proof to scenarios 3/4 — flush is unconditional and
    reads live state. **Satisfied.**

**No scenario in this list identifies an unresolved technical risk.**

## J. Performance / Scale

- **Keeping all rows in underlying state**: no change in row count or
  object shape versus today — `catalogRows`/`manualRows` already hold
  every row (including `removed` ones) for the lifetime of the
  session; Decision 40 adds one boolean field per row, not new rows.
- **Filtering validated rows from the active UI**: an additional
  `useMemo` predicate of the same cost class as the existing
  `!row.removed` filter already running every render — no evidence
  of a distinct performance concern.
- **Accumulating many validated rows**: bounded by the same product
  catalog size that already bounds `catalogRows` today; no new
  unbounded growth is introduced (manual rows already grow only by
  explicit Owner action, unchanged).
- **Existing per-row autosave / single-document draft**: unaffected
  in kind — Decision 40 adds one field to the payload every existing
  write already sends in full; this is not a new write-amplification
  source distinct from what Decision 39's own Rule 8 Assessment
  already accepted as a tradeoff (§10 of that document, unchanged
  here).
- **No performance risk is invented beyond what the repository already
  evidences** — the parent Specification's own §13 "sizing check" for
  document-size (already flagged under Decision 38, unchanged by
  Decision 39, and equally unchanged by Decision 40, since one
  boolean per row is a negligible size delta) remains the only
  document-size consideration on record, and it is not re-triggered
  by this amendment.

## K. Test Coverage

**Already covers (directly relevant, re-confirmed this session):**
- `periodic-contagem-autosave-safety-decision-39.test.ts` — per-row
  timer independence, live-state sourcing, global serialization
  (§F's proofs above rely on this file's already-established
  correctness, unmodified by Decision 40).
- `periodic-stock-interruption-durability.test.ts` — `visibilitychange`/
  `pagehide`/unmount → `flushPeriodicDraftNow`, and
  `flushInFlightSaveRef` being awaited before `recordStockCount`.
- `periodic-stock-draft-resurrection.test.ts` — timer
  cancellation/awaiting ordering ahead of `recordStockCount`,
  submission-identity durability.
- `periodic-stock-finalization.test.ts` — draft round-trip at scale
  (300 rows, mixed catalog/removed/manual), idempotent finalization.
- `periodic-stock-review-screen-price.test.ts` — existing
  `pendingTally` rendering assertions (row keying, sellingValue
  display) that any `Corrigir`-related change must not regress.

**Must be added** (carried into the Implementation Plan as required
test coverage, per this task's own list, all confirmed relevant by
the tracing above):
1. Validar behavior: `handleSaveCatalogRow`/`handleSaveManualRow` now
   set `validated: true` via `updateCatalogRow`/`updateManualRow`
   (not only a local Set) — source-structure assertions matching this
   repository's established no-DOM-harness convention.
2. Persistence: `workingRowToDraftItem`/`draftItemToWorkingRow` both
   round-trip `validated`, including the `undefined`-when-absent case
   (mirroring existing `removed` round-trip tests in
   `periodic-stock-finalization.test.ts`'s emulator-backed style).
3. Active-workspace filtering: the new filter predicate excludes
   `validated === true` rows from the active view while leaving them
   in `allWorkingRows`/`catalogRows`/`manualRows` — a direct assertion
   that filtering and underlying-state removal are provably distinct
   (this is the single most safety-critical test given this task's
   own emphasis on proving, not assuming, that filtering is safe).
4. Accumulated/review rendering: `pendingTally`'s extended
   `StockCountTallyItem` correctly carries identity + `validated`
   status per item.
5. `Corrigir`: clears `validated`, discards `pendingTally`, reopens
   the correct row (catalog by `productId`, manual by index) —
   including a regression test for the "no reordering while
   `pendingTally` is showing" invariant §E relies on.
6. Resume with partially validated drafts: A/B validated, C not,
   round-trips correctly through `handleResumeDraft` (extending
   `periodic-stock-draft-resurrection.test.ts`'s existing style).
7. Decision 39 autosave interaction: a T0/T100-style proof
   specifically for `validated` (mirroring the existing
   describe-block-C test in
   `periodic-contagem-autosave-safety-decision-39.test.ts`, applied
   to the new field) — confirms no row's timer can revert another
   row's validation state.
8. Manual-row correction: re-validate the existing
   `handleRemoveManualRow` re-indexing tests still pass unmodified
   when a removed row carries `validated: true`.
9. Finalization regression: `recordStockCount`'s `items` payload is
   unaffected by any row's `validated` status — an explicit assertion
   that `StockCountTallyItem.validated` is never present in the
   object literal passed to `recordStockCount`.

**No test file should be modified during this Rule 8 gate** — this
list is scoped for the Implementation Plan / Implementation
Authorization stage only, per this task's own instruction.

## L. Governance Classification

- **Is Decision 40 sufficient authority?** Yes. Every technical
  question this assessment needed to close (data-model additivity,
  filtering safety, manual-row identity, autosave compatibility,
  resume correctness, finalization non-interference) was closeable
  using patterns already proven correct elsewhere in this exact
  codebase (`removed`, `latestFlushArgs`, `draftInFlightSaveRef`,
  the existing manual-row re-indexing precedent) — none required a
  new business-level decision.
- **Is another specification amendment required?** No new amendment
  is required to proceed to the Implementation Plan. One open,
  narrow, **implementation-detail-level** question remains and is
  listed below — it does not rise to the level of reopening Decision
  40 or requiring a new amendment, because Decision 40's own text
  already commits to the answer's *shape* ("enough row identity to
  identify the exact product") without mandating its *exact
  representation*, exactly mirroring how Decision 38/39 already left
  comparable mechanism-level choices ("which exact event/hook") to
  Rule 8/Implementation.
- **Is a new BDR required?** No — re-confirmed independently this
  session, not merely inherited from Decision 40's own §5: the
  underlying business principle (a physical count, reviewed, then
  finalized into Business Worth) is unchanged; nothing in this
  assessment surfaced a new business rule, a reversal of any settled
  decision, or a scope expansion beyond what Decision 40 already
  authorizes.
- **Can Rule 8 reach READY?** Yes — see verdict below.

**One implementation-detail question, not blocking:** the exact
identity representation `StockCountTallyItem` should carry for a
manual row (§D/§E) — e.g., a literal array index at tally-build time,
versus some other disambiguator — is left to the Implementation Plan
to specify concretely, using the existing index-based convention
already established throughout this file (`confirmedManualRowIndices`,
`manualRowSaveError`, `handleRemoveManualRow`) as its required
precedent. This is a mechanism choice within an already-authorized
shape, not an open Product Architect decision.

## Rule 8 Verdict

**READY.**

Every dimension this task required (§A–§L) is either a clean,
evidence-based PASS or a provably closeable technical requirement,
using patterns that already exist and are already correct in this
codebase:

1. **Governance consistency (§A, §L):** Decision 40's signed text is
   verified consistent with the parent Specification and with
   Decision 38/39; no contradiction found anywhere in this session's
   fresh re-reading of all three governing documents.
2. **Data model (§B):** `validated?: boolean` is additive, follows
   the exact precedent `removed?: boolean` already establishes, and
   requires no storage restructuring, no migration, and no Firestore
   rules change.
3. **Validar workflow (§C):** replacing the local-only Set with a
   row-owned, `updateCatalogRow`/`updateManualRow`-mediated field
   reuses existing autosave wiring with no new trigger; filtering is
   proven safe by tracing that `allWorkingRows` never depends on the
   active-workspace filter.
4. **Accumulated/review area (§D) and Corrigir (§E):** both are
   minimal, additive extensions to `pendingTally`/`StockCountTallyItem`
   with no redesign of the screen's existing layout or data flow.
5. **Autosave integration (§F):** every one of Decision 39's
   guarantees (per-row scheduling, live-state-at-fire-time, global
   serialization, interruption/unmount flush) is proven to extend to
   `validated` automatically, because it is read from the same state
   object those mechanisms already close over — no modification to
   Decision 39's own mechanisms is required or introduced.
6. **Resume/recovery (§G) and finalization (§H):** both traced
   end-to-end with no gap found; finalization is proven structurally
   incapable of ever reading `validated`, since `StockCountTallyItem`'s
   new field is never included in the explicit literal passed to
   `recordStockCount`.
7. **Failure scenarios (§I):** all fourteen specified scenarios are
   satisfied by the same small set of already-proven mechanisms, with
   no scenario surfacing a new, unresolved risk.
8. **Performance (§J):** no risk beyond what Decision 39's own,
   already-accepted Rule 8 Assessment already named as a tradeoff.
9. **Governance classification (§L):** Decision 40 remains sufficient
   authority; no new BDR or amendment is required.

**No new Product Architect decision is required to proceed.**

### Implementation Constraints to Carry Into the Implementation Plan

1. `validated?: boolean` is added to `StockCountWorkingRow` and
   `PeriodicStockDraftItem`, and threaded through `workingRowToDraftItem`/
   `draftItemToWorkingRow` as an explicit field (never a spread),
   mirroring `removed`'s existing pattern exactly.
2. `handleSaveCatalogRow`/`handleSaveManualRow` set `validated: true`
   via `updateCatalogRow`/`updateManualRow` (not a standalone Set);
   `handleEditCatalogRow`/`handleEditManualRow` (and `Corrigir`, §E)
   set `validated: false` via the same functions.
3. The active-workspace filter (`visibleCatalogEntries` and its
   manual-row equivalent) must treat `row.validated` as falsy-safe
   (`!row.validated`, matching `!row.removed`'s existing idiom) —
   never require an explicit `false`.
4. `manualRows` must never be physically spliced to reflect validated
   status — only filtered in a derived view, per FR-N9.
5. `StockCountTallyItem` gains row identity (catalog `productId`, or
   manual-row index per the existing convention) and `validated`,
   both excluded from the explicit literal `handleConfirmSave` builds
   for `recordStockCount`'s `items` parameter.
6. `Corrigir` must, in order: clear the target row's `validated` flag
   via the existing update path; discard `pendingTally`
   (`setPendingTally(null)`) — never leave a stale snapshot visible
   after a correction begins.
7. No change to `draftInFlightSaveRef`, `flushInFlightSaveRef`,
   `identityWriteRef`, `rowDebounceTimersRef`'s own key scheme,
   `flushPeriodicDraftNow`, or the `handleConfirmSave` await ordering
   (§4a/§4b/§4c) — all reused unmodified.
8. No change to `recordStockCount`'s signature, `StockCount` history
   schema, or `BusinessWorthSnapshot` construction.

### Required Tests (carried into the Implementation Plan, per §K)

Validar-sets-persisted-field; full round-trip of `validated` through
`workingRowToDraftItem`/`draftItemToWorkingRow` including the
absent/legacy case; active-workspace filtering excludes validated
rows from the visible view while proving they remain in
`allWorkingRows`; extended `pendingTally`/`StockCountTallyItem`
carries identity + validated status; `Corrigir` clears validated,
discards `pendingTally`, and reopens the correct row (catalog and
manual); partially-validated-draft resume; a T0/T100-style proof for
`validated` specifically; manual-row removal/re-indexing with a
validated row involved; and an explicit finalization-regression
assertion that `validated` never reaches `recordStockCount`'s `items`
payload.

**Next gate: the Implementation Plan**, per this project's standing
discipline (Specification Amendment → Rule 8 Assessment →
Implementation Plan → Implementation Authorization → code).

---

## Verification Performed for This Assessment

- The signed Decision 40 amendment read completely and fresh from the
  repository (§A), cross-checked against the parent Specification and
  the signed Decision 39 amendment for contradictions — none found.
- `PeriodicStockCountView.tsx`: `confirmedCatalogProductIds`/
  `confirmedManualRowIndices` and every rendering/handler use of both;
  `handleSaveCatalogRow`, `handleSaveManualRow`, `handleEditCatalogRow`,
  `handleEditManualRow`; `updateCatalogRow`, `updateManualRow`;
  `visibleCatalogEntries`, `removedCatalogEntries`, `allWorkingRows`;
  `handleRemoveManualRow`'s re-indexing block; `scheduleRowDraftSave`,
  `latestFlushArgs`, `flushPeriodicDraftNow`, `draftInFlightSaveRef`,
  `flushInFlightSaveRef`, `identityWriteRef`; `handleResumeDraft`; the
  catalog-merge `useEffect`; `handleRequestConfirmation`,
  `handleConfirmSave`, `pendingTally`'s full render block — all read
  directly, this session, at this exact commit.
- `utils/stockCount.ts`: `StockCountWorkingRow`, `StockCountTallyItem`,
  `StockCountTallyResult`, `tallyStockCountRows`, `workingRowToDraftItem`,
  `draftItemToWorkingRow` — read in full.
- `types.ts`: `PeriodicStockDraftItem`, `PeriodicStockDraft` — read in
  full, including governing comments.
- `AppContext.tsx`: `recordStockCount`'s parameter list and body
  (confirmed no draft read, confirmed the periodic-draft delete inside
  its own atomic batch at line 4718), `savePeriodicStockDraft`,
  `clearPeriodicStockDraft`.
- `firestore.rules`: `stockCountDrafts/{draftId}` re-confirmed no
  field-shape validation.
- Existing test files listed in §K opened and their `describe`/`it`
  coverage reviewed to determine what already exists versus what must
  be added.
- `git fetch` run immediately before this assessment began; confirmed
  `main = origin/main = bdcace8`, working tree clean.
- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`,
  or `tests/` file was modified to produce this assessment.
- No Specification or amendment artifact was modified.
- No Implementation Plan or Implementation Authorization was created.
- This document itself was not committed or pushed.
