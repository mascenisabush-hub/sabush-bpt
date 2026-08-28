Implementation Authorization

# Periodic Contagem Validar Workflow — Guardar → Validar, Accumulated Review, Corrigir (Decision 40)

**Status:** ✅ **ACCEPTED AND AUTHORIZED. Signed 29 August 2026 by
SABUSHIMIKE MASCENI, Product Architect.**

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 28 August 2026,
implemented on `main`) → [Decision 40 amendment](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 29 August 2026) →
[Rule 8 Assessment](./periodic-contagem-validar-decision-40-rule8-assessment.md)
(✅ READY) → [Implementation Plan](./periodic-contagem-validar-decision-40-implementation-plan.md)
→ **this Authorization**.

**Baseline:** `main = origin/main = 5350b5c9afd7234a67c6f97b583134ca3a10d276`.

---

## 1. What This Authorization Covers (once signed)

Confined entirely to `apps/tenant/src/types.ts`,
`apps/tenant/src/utils/stockCount.ts`, and
`apps/tenant/src/components/PeriodicStockCountView.tsx`, per the
Plan's own §1–§3:

1. **Additive `validated?: boolean`** on `PeriodicStockDraftItem`
   (`types.ts`) and `StockCountWorkingRow` (`utils/stockCount.ts`),
   following the exact style already used for `removed?: boolean` on
   both types.
2. **Round-trip through `workingRowToDraftItem`/`draftItemToWorkingRow`**
   — one explicit-literal line added to each, mirroring their existing
   `removed` line exactly. No spread introduced in either function.
3. **Guardar → Validar rename.** `handleSaveCatalogRow`/
   `handleSaveManualRow` retargeted to set `validated: true` via
   `updateCatalogRow`/`updateManualRow`; `handleEditCatalogRow`/
   `handleEditManualRow` retargeted to set `validated: false` the same
   way. `validateWorkingRowForSave` and the zero-quantity confirmation
   gate are unchanged in every respect. Visible button text updated
   from "Guardar" to "Validar" (exact copy for the status-dot
   title/aria-label left to implementation, per the Plan's §1b).
4. **Active-workspace filtering, never deletion.**
   `visibleCatalogEntries` gains a second, falsy-safe filter term
   (`!row.validated`, alongside the existing `!row.removed`); a new
   `visibleManualRows`-style derived view is introduced for manual
   rows. `catalogRows`, `manualRows`, and `allWorkingRows` are never
   mutated or spliced to remove a validated row.
5. **Accumulated/validated area.** New derived views
   (`validatedCatalogEntries`/`validatedManualRows`, or equivalently
   named) drive a compact, discoverable list of validated rows,
   structurally parallel to the existing "Removidos desta contagem"
   list — not a full duplicate row-editing card, not a new
   screen/route/tab/modal.
6. **Reopening a validated row** (from the accumulated area or via
   `Corrigir`, below) sets `validated: false` via the same
   `updateCatalogRow`/`updateManualRow` path, making the row editable
   again and returning it to the active workspace on next render.
7. **`Corrigir` on the review screen.** `StockCountTallyItem`
   (`utils/stockCount.ts`) gains additive, UI-only fields — row
   identity (`productId?` for catalog rows; array index for manual
   rows, per the Plan's §2) and `validated: boolean` — sourced
   directly from the row `tallyStockCountRows` already iterates.
   `Corrigir`, added alongside "Voltar" (not replacing it), clears the
   selected row's `validated` flag and calls `setPendingTally(null)`,
   in that order. `handleRequestConfirmation`'s existing guards,
   `tallyStockCountRows`'s call site and inputs, and "Voltar" itself
   are unchanged.
8. **Finalization untouched.** The explicit-literal `items` mapping
   `handleConfirmSave` builds for `recordStockCount` excludes
   `validated` and the tally-only identity field. No change to
   `recordStockCount`, StockCount history creation,
   `BusinessWorthSnapshot` construction, or `clearPeriodicStockDraft`'s
   call site.
9. **Decision 39 preserved exactly.** No change to
   `rowDebounceTimersRef`, `scheduleRowDraftSave`, `latestFlushArgs`,
   `draftInFlightSaveRef`, `flushInFlightSaveRef`, `identityWriteRef`,
   `flushPeriodicDraftNow`, or the `visibilitychange`/`pagehide`/
   unmount triggers. `validated` is persisted exclusively by riding
   these existing mechanisms unmodified, because it lives on the same
   row object they already close over.
10. **The required test suite**, per the Plan's own §5: the twelve
    tests to add (Validar sets persisted state; full round-trip
    including the legacy/absent case; active-workspace filtering
    proven safe against `allWorkingRows`; accumulated-area rendering;
    extended `StockCountTallyItem`; `Corrigir`'s clear-then-discard
    behavior; partially validated resume; the T0/T100 proof for
    `validated`; manual-row removal/re-indexing with a validated row;
    the finalization-regression assertion; legacy-draft resume;
    all-validated resume); full, unmodified regression on
    `periodic-contagem-autosave-safety-decision-39.test.ts`,
    `periodic-stock-interruption-durability.test.ts`,
    `periodic-stock-draft-resurrection.test.ts`,
    `periodic-stock-finalization.test.ts`,
    `periodic-stock-review-screen-price.test.ts`, and
    `periodic-stock-portion-grouping-wiring.test.ts`; and the seven
    explicit negative/out-of-scope tests named in the Plan's §5
    (Initial Stock, Add Stock, Business Worth calculation, finalized
    StockCount schema, Decision 39 autosave architecture, Firestore
    rules/indexes, Guardar semantics beyond the authorized rename).

**No `firestore.rules` or `firestore.indexes.json` change is authorized
or required** — confirmed by the Plan and the Rule 8 Assessment both:
`PeriodicStockDraft.items` remains the existing array, one document,
same path, same rule.

## 2. What This Authorization Does Not Cover

Exactly the Plan's own §4, carried verbatim:

- Any new Firestore collection, subcollection, or second draft
  document; any conversion of `PeriodicStockDraft.items` into a map.
- Any change to `PeriodicStockDraft`'s document identity or to
  `firestore.rules`/`firestore.indexes.json`.
- Any validation timestamp, audit array, or history of validation
  events — only the single `validated` boolean.
- Any change to `validateWorkingRowForSave`, the zero-quantity
  confirmation gate, or any other existing Guardar-era validation
  rule.
- Any change to `rowDebounceTimersRef`, `scheduleRowDraftSave`,
  `latestFlushArgs`, `draftInFlightSaveRef`, `flushInFlightSaveRef`,
  `identityWriteRef`, `flushPeriodicDraftNow`, the
  `visibilitychange`/`pagehide` listeners, or the SPA unmount effect.
- Any change to `handleRequestConfirmation`'s existing guards, to
  "Voltar," to `handleConfirmSave`'s await ordering, to
  `recordStockCount`'s signature, or to `clearPeriodicStockDraft`.
- Any change to Initial Stock, Add Stock, Business Worth calculation,
  Unit Relationship, or Product Memory.
- Any new screen, route, tab, or modal for the accumulated area.
- Any expansion of this authorization beyond the signed Decision 40's
  own FR-N5 through FR-N12 and this document's own §1.

## 3. Precise Acceptance Criteria

1. `PeriodicStockDraftItem` and `StockCountWorkingRow` each gain
   exactly one new optional field, `validated?: boolean`; no other
   field is added or removed from either type.
2. `workingRowToDraftItem`/`draftItemToWorkingRow` round-trip
   `validated` faithfully, including the absent/legacy case
   (`undefined` in, omitted from the persisted write, `undefined` back
   out on resume) — proven by test, not merely asserted.
3. `handleSaveCatalogRow`/`handleSaveManualRow` set `validated: true`
   through `updateCatalogRow`/`updateManualRow`; no `useState<Set>`
   remains as the source of truth for validated status.
4. A validated row is excluded from `visibleCatalogEntries`/
   `visibleManualRows` while remaining present, unchanged, in
   `catalogRows`/`manualRows`/`allWorkingRows` — proven by a test that
   inspects both the filtered view and the underlying state in the
   same assertion.
5. Neither `catalogRows` nor `manualRows` is spliced, reordered, or
   otherwise mutated in shape as a consequence of a row becoming
   validated.
6. `tallyStockCountRows(allWorkingRows, ...)`'s call site and inputs
   in `handleRequestConfirmation` are unchanged; the complete tally
   continues to include every row regardless of validated status.
7. `Corrigir` clears the selected row's `validated` flag and calls
   `setPendingTally(null)`, in that order, before the row becomes
   editable again in the active workspace — verified by test.
8. Manual-row identity for `Corrigir`/the accumulated area remains
   array-index-based, consistent with `updateManualRow`'s existing
   keying and `handleRemoveManualRow`'s existing re-indexing
   discipline; no new persistent identity field is introduced for
   manual rows.
9. The object literal `handleConfirmSave` builds for
   `recordStockCount`'s `items` parameter contains no `validated` key
   and no tally-only row-identity key — verified by an explicit test
   asserting their absence.
10. `recordStockCount`'s signature, StockCount history creation, and
    `BusinessWorthSnapshot` construction are byte-for-byte unchanged.
11. Given the T0/T100 scenario applied to `validated` (Row A's
    `validated` change scheduled at T0, Row B's own change at T100,
    Row A's timer fires after T100), the resulting write contains Row
    B's edit, regardless of which timer fires or completes first —
    proven by test.
12. `draftInFlightSaveRef` remains a single, global ref;
    `rowDebounceTimersRef` remains a single `Map`; no per-row or
    per-flag Firestore document or write queue is introduced.
13. A partially validated draft (some rows validated, some not)
    resumes via `handleResumeDraft` with each row's validated status
    exactly as persisted, and with no duplication or loss of any row
    — proven by test.
14. `PeriodicStockDraft.items` remains the existing array; no schema,
    rules, or index file is touched.
15. All tests named in the Implementation Plan §5 pass; full
    regression on `periodic-contagem-autosave-safety-decision-39.test.ts`,
    `periodic-stock-interruption-durability.test.ts`,
    `periodic-stock-draft-resurrection.test.ts`,
    `periodic-stock-finalization.test.ts`,
    `periodic-stock-review-screen-price.test.ts`, and
    `periodic-stock-portion-grouping-wiring.test.ts`.

## 4. Governance Gates

No BDR. No new Specification Amendment beyond the already-signed
Decision 40 — this document implements exactly what Decision 40
authorized and the Rule 8 Assessment found technically closeable,
nothing more. This document is the final gate; once signed, it
authorizes exactly the scope in §1, nothing beyond it.

---

## 5. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED
**Date:** 29 August 2026

This authorizes exactly the scope in §1, nothing more. Implementation
proceeds against this signed scope.
