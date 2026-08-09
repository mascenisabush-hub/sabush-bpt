# Implementation Plan — Module #10 Expected Current Stock Value & Persistent Initial Stock

**Governed by:** [`10-expected-stock-value-amendment.md`](../specs/10-expected-stock-value-amendment.md),
[`10-rule8-assessment.md`](./10-rule8-assessment.md) (Governance
Readiness: Ready)

## Sequence

1. `src/types.ts` — add `InitialStockDraftItem`, `InitialStockDraft`;
   add `StockCount.expectedValueAtCount?: number`.
2. `firestore.rules` — tighten `stockCounts` update/delete; add
   `stockCountDrafts` match block.
3. `src/context/AppContext.tsx`:
   - Firestore listener for `stockCountDrafts/initial`.
   - `expectedCurrentStockValue` derived value.
   - `saveInitialStockDraft(items)` — upsert the draft doc.
   - `recordStockCount` — accept optional `expectedValueAtCount`; when
     `type === 'initial'`, add the draft-doc delete to the same batch.
   - `clearAllData` — skip the `initial` `stockCounts` document,
     comment naming the Closing Integrity precedent.
   - Expose new state/functions on `AppContextType` + provider value.
4. `src/components/InitialStockCountView.tsx` — load draft on mount,
   autosave row changes (debounced) to the draft, confirm writes the
   permanent record and clears the draft.
5. `src/components/PeriodicStockCountView.tsx` — swap
   `comparisonBaseline` to `expectedCurrentStockValue`; pass
   `expectedValueAtCount` when recording; update copy; show
   `expectedValueAtCount` in history rows when present.
6. Tests: `tests/*.test.ts` additions for the new calculation and
   `recordStockCount` behavior (Node-runnable, no Firestore emulator
   needed for these). `firestore.rules` test additions written but not
   executable here (same standing gap).
7. Verify: `tsc --noEmit`, `npm run build`, run full test suite.
8. Inspect diff for scope creep against Part 7 (non-goals) of the
   amendment.
9. Update `HANDOFF.md` and this session's status.

## Explicit scope boundary (repeating the authorization's own Part G)

Touches only: draft workflow, confirmation flow, `stockCounts` /
`stockCountDrafts` security rules, Expected Current Stock Value
calculation, Contagem comparison baseline, `expectedValueAtCount`,
required tests, required docs. Does not touch: Business Worth formula,
Capital Growth formula, Embedded Profit calculation, Dashboard,
Module #18/#19/#20, unrelated `AppContext` refactoring.
