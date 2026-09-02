Implementation Authorization

# Periodic Contagem Entry-Order Sort Mode (`entrySequence`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED. Signed 2 September 2026 by
SABUSHIMIKE MASCENI, Product Architect, with one correction to §3
criterion 10 (see that criterion, and the changelog note below) made
before signature.**

**Governing chain:** Specification Addendum — "Periodic Contagem
Entry-Order Sort Mode (`entrySequence`)" (ACCEPTED — technical
direction accepted by the Product Architect) → Rule 8 Assessment —
"Periodic Contagem Entry-Order Sort Mode" (✅ READY) → Stage 6
Implementation Plan — "Periodic Contagem Entry-Order Sort Mode" (✅
COMPLETE / ACCEPTABLE) → **this Authorization**.

*Note on artifact location:* the three governing documents above were
produced and accepted during this governance session but have not yet
been committed to `docs/specs/` or `docs/engineering/` as their own
sibling files, unlike the fully-committed precedent chains this
document otherwise follows (e.g. Decision 40's own
`stock-count-data-loss-resilience-decision-40-amendment.md` →
`periodic-contagem-validar-decision-40-rule8-assessment.md` →
`periodic-contagem-validar-decision-40-implementation-plan.md` →
`periodic-contagem-validar-decision-40-implementation-authorization.md`
chain). This is disclosed here rather than represented as an
established committed chain; formalizing those three as committed
sibling documents (`periodic-contagem-entry-sequence-specification.md`,
`periodic-contagem-entry-sequence-rule8-assessment.md`,
`periodic-contagem-entry-sequence-implementation-plan.md`, following
this file's own naming pattern) is a reasonable housekeeping step but
was not requested as part of this task and is not performed here.

**Baseline:** `main = origin/main = 756c61ad966e49f83e4fd6da152357ab509285b0`.

---

## 1. What This Authorization Covers (once signed)

Confined entirely to `apps/tenant/src/utils/stockCount.ts` and
`apps/tenant/src/components/PeriodicStockCountView.tsx`, per the
Plan's own §1–§8:

1. **Additive `entrySequence?: number`** on `StockCountWorkingRow`
   (`utils/stockCount.ts`), following the exact style already used for
   `sellingPriceEditSequence?: number` on the same type.
2. **Round-trip through `workingRowToDraftItem`/`draftItemToWorkingRow`**
   — one explicit-literal, omit-when-absent line added to each,
   mirroring their existing `sellingPriceEditSequence` line exactly. No
   spread introduced in either function.
3. **New in-session counter.** `entrySequenceRef`/`nextEntrySequence()`,
   declared alongside the existing `sellingPriceEditSequenceRef`,
   following its exact shape (a plain `useRef<number>`, incremented
   synchronously, never a wall-clock timestamp).
4. **Atomic Validar requirement (governance-mandated acceptance
   criterion — see §3 item 3).** `handleSaveCatalogRow`/
   `handleSaveManualRow` each merge `entrySequence: row.entrySequence
   ?? nextEntrySequence()` into the SAME `updateCatalogRow`/
   `updateManualRow` call that already sets `validated: true`. No
   second call, no second write path.
5. **Immutability on re-edit/Voltar.** No new logic is required beyond
   item 4's guard: re-Validar short-circuits via `??`; Voltar-restore
   (`handleLeaveWorkspaceUnchanged`) preserves the value automatically
   via its existing `{ ...row, validated: true }` spread, since
   `entrySequence` already lives on `row`.
6. **Resume reseed.** `handleResumeDraft` gains one additional `reduce`
   over `allResumedRows`, identical in shape to the existing
   `sellingPriceEditSequenceRef` reseed block immediately above it,
   setting `entrySequenceRef.current` to `max(resumed entrySequence
   values) + 1`, ignoring `undefined` rows.
7. **New `entry-order` sort mode.** `validatedSortMode`'s (and
   `pickerSortMode`'s) type gains one new literal. `sortByValidatedMode`
   gains one new `case` and one new `getSequence` parameter: ascending
   by sequence, `undefined` sequence values sorted last, ties broken by
   the same `trim().toLowerCase().localeCompare` normalization the
   existing `name-asc` mode already uses. The three existing call sites
   (`sortedValidatedCatalogEntries`, `sortedValidatedManualRowEntries`,
   `sortedUnifiedListEntries`) each supply their own `getSequence`
   getter, mirroring how each already supplies its own `getName`/
   `getValue`.
8. **One new `<option>`** on the existing sort `<select>`, no other UI
   change.
9. **The required test suite**, per the Plan's own §9: the fourteen
   tests enumerated there (first-Validar assignment; second-product
   sequencing; re-edit/Voltar immutability; full draft round-trip
   including the legacy/absent case; resume restoration and reseed-to-
   max-plus-one; `entry-order` ascending/undefined-last/tie-break
   correctness; catalog+manual unified sorting; multi-portion row
   independence; and a regression check that the four existing sort
   modes remain unchanged), in a new file,
   `tests/periodic-contagem-entry-sequence.test.ts`.

**No `firestore.rules` or `firestore.indexes.json` change is authorized
or required** — confirmed by the Plan and the Rule 8 Assessment both:
the periodic draft's existing per-row document path and access rules
are entirely unchanged.

## 2. What This Authorization Does Not Cover

Exactly the Plan's own §10, carried verbatim in substance:

- Any Firestore schema migration or historical backfill of
  `entrySequence` onto rows or drafts that predate this feature.
- Any change to finalized `StockCount` records or to
  `recordStockCount`'s item-construction logic — `entrySequence` never
  reaches that shape, by construction, exactly as `validated` and
  `manualRowIndex` already do not.
- Any change to `firestore.rules` or `firestore.indexes.json`.
- Any concurrency lock, mutex, session claim, server-side/authoritative
  counter, Cloud Function sequence assignment, versioning field, or
  write-sequence identifier of any kind. In particular, no identifier
  matching `version`, `sequenceNumber`, or `writeSeq` may be introduced
  into `scheduleRowDraftSave` — enforced by the existing test
  `periodic-stock-interruption-durability.test.ts`, which must continue
  to pass unmodified.
- Any change to `scheduleRowDraftSave`'s debounce/serialization
  mechanism, `rowDebounceTimersRef`, `latestFlushArgs`,
  `draftInFlightSaveRef`, `flushInFlightSaveRef`, `identityWriteRef`,
  `flushPeriodicDraftNow`, or the `visibilitychange`/`pagehide`/unmount
  triggers.
- Any change to `AppContext.tsx`, including
  `savePeriodicStockDraftItem`, `savePeriodicStockDraftMeta`, the
  `periodicStockDraftMeta`/`periodicStockDraftItemsByKey` listeners, or
  `remoteDraftUpdateNotice`'s underlying data source.
- Any change to product creation or deduplication logic
  (`addStockBatch`, `recordStockCount`'s product-matching,
  `productNameSimilarity.ts`).
- Any change to the live-sync/listener architecture or to the remote
  draft merge behavior (there is none today, and none is introduced).
- Any redesign of the Periodic Contagem workflow, layout, or existing
  sort controls beyond the one new `<option>`; no new banner, no new
  column, no new screen/route/tab/modal.
- Any attempt to architecturally resolve the previously accepted
  concurrency limitation (two concurrent owner/admin sessions may
  independently allocate the same `entrySequence` value to different
  rows). This remains an explicitly disclosed and accepted limitation,
  resolved only by the deterministic name tie-break at display time —
  not by this authorization, and not to be revisited as part of this
  implementation.
- Opportunistic modification of unrelated existing test files,
  including any `sellingPriceEditSequence`-referencing test, beyond
  what the Plan's own §9 identifies as directly necessary for this
  feature's own regression coverage.

## 3. Precise Acceptance Criteria

1. `StockCountWorkingRow` gains exactly one new optional field,
   `entrySequence?: number`; no other field is added or removed from
   the type.
2. `workingRowToDraftItem`/`draftItemToWorkingRow` round-trip
   `entrySequence` faithfully, including the absent/legacy case
   (`undefined` in, omitted from the persisted write, `undefined` back
   out on resume) — proven by test, not merely asserted.
3. **`handleSaveCatalogRow` and `handleSaveManualRow` each set
   `entrySequence` and `validated: true` in the SAME
   `updateCatalogRow`/`updateManualRow` call — never two separate
   calls, never a second persistence mechanism.** This is the single
   most safety-critical acceptance criterion in this authorization: it
   is what the Rule 8 Assessment's durability finding depends on (the
   entire row, including `entrySequence`, is written atomically as one
   Firestore document via the existing per-row debounce), and it is
   verified by direct code inspection of both call sites, not merely by
   test behavior.
4. Once assigned, `entrySequence` is never reassigned by any code path
   — proven by test for both the re-edit-then-re-Validar case and the
   Voltar-restore case.
5. `entrySequence` is never fabricated for a row that has not been
   validated in the current session — no default of `0`, no
   `Infinity` persisted to Firestore, `undefined` remains `undefined`
   through the full round-trip.
6. `handleResumeDraft` restores every resumed row's `entrySequence`
   exactly as persisted, and reseeds `entrySequenceRef.current` to
   `max(resumed entrySequence values) + 1`, ignoring rows with no
   `entrySequence` — proven by test.
7. The new `entry-order` sort mode sorts ascending by `entrySequence`;
   rows with no `entrySequence` sort after every sequenced row; two
   rows sharing the same `entrySequence` sort by
   `trim().toLowerCase().localeCompare` on product name — all three
   properties proven by test against a purpose-built fixture.
8. The four existing sort modes (`name-asc`, `name-desc`, `value-desc`,
   `value-asc`) produce behaviorally unchanged output — proven by test
   against the same fixture used for item 7, closing the pre-existing
   gap the Rule 8 Assessment flagged as a condition of its "Sorting
   correctness: PASS."
9. Catalog rows and manual rows sort correctly together in the unified
   list via `entry-order`, and multiple portions of one product
   (catalog + manual, or manual + manual) each retain independent,
   correctly-ordered `entrySequence` values, never collapsed — proven
   by test.
10. The object literal `handleConfirmSave`/`recordStockCount` builds
    for the finalized `StockCount`'s `items` contains no
    `entrySequence` key. This is guaranteed by construction — that
    literal is built field-by-field and never spreads
    `StockCountWorkingRow`, exactly as it already excludes `validated`
    and `manualRowIndex` today — and requires no code change and no
    new dedicated test. (Correction: the prior draft of this criterion
    called for "an explicit test asserting its absence." That test is
    not among the fourteen tests in the accepted Stage 6 Implementation
    Plan §9, and is removed here as an unauthorized scope expansion,
    per Product Architect direction on acceptance, 2 September 2026.
    Implementation must not add it.)
11. `scheduleRowDraftSave`, `rowDebounceTimersRef`,
    `draftInFlightSaveRef`, `latestFlushArgs`, and every other Decision
    39/39a mechanism are byte-for-byte unchanged; in particular,
    `periodic-stock-interruption-durability.test.ts`'s existing
    assertion that no `version`/`sequenceNumber`/`writeSeq` identifier
    exists in `scheduleRowDraftSave` continues to pass unmodified.
12. `firestore.rules` and `firestore.indexes.json` are untouched; no
    new document path, subcollection, or query is introduced.
13. All fourteen tests named in the Implementation Plan's §9 are
    present and passing in the new
    `tests/periodic-contagem-entry-sequence.test.ts`; full, unmodified
    regression passes on
    `periodic-contagem-validar-decision-40.test.ts`,
    `periodic-contagem-voltar-reopen-restore-fix.test.ts`,
    `periodic-contagem-existing-product-edit-confirm-workflow.test.ts`,
    `periodic-contagem-autosave-safety-decision-39.test.ts`,
    `periodic-stock-interruption-durability.test.ts`,
    `periodic-stock-multi-portion-valuation.test.ts`,
    `periodic-contagem-quantity-selling-unit-independence.test.ts`,
    `periodic-contagem-single-product-workspace.test.ts`, and
    `periodic-stock-draft-resurrection.test.ts`.
14. TypeScript compiles with no new `any`/type-widening; the production
    build succeeds; `git status --porcelain` at completion shows changes
    confined to exactly the files named in this document's §1 (plus the
    one new test file), nothing else.

## 4. Governance Gates

No BDR. No new Specification beyond the already-accepted Specification
Addendum — this document authorizes exactly what that Addendum
specified and the Rule 8 Assessment found ready, nothing more. This
document is the final gate; once signed, it authorizes exactly the
scope in §1, nothing beyond it.

---

## 5. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED
**Date:** 2 September 2026

This authorizes exactly the scope in §1, nothing more, as corrected by
the changelog note in §3 criterion 10. Implementation proceeds against
this signed scope.

### Changelog (pre-signature correction)

- §3 criterion 10 originally required "an explicit test asserting
  [`entrySequence`'s] absence" from the finalized `StockCount` item
  shape. This was identified, on review at acceptance, as inconsistent
  with the accepted Stage 6 Implementation Plan §9, whose fourteen-test
  list does not include such a test. Corrected in place, before
  signature, to state the guarantee as structural (exclusion by
  construction, unchanged code) rather than as an additional test
  requirement. No other section was affected. Implementation must
  follow the corrected criterion — no such test is to be added.
