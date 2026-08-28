Implementation Authorization

# Periodic Contagem Autosave Safety — Per-Row Scheduling + SPA Navigation Flush (Decision 39)

**Status:** ✅ **ACCEPTED AND AUTHORIZED. Signed 29 August 2026 by
SABUSHIMIKE MASCENI, Product Architect.**

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 28 August 2026) →
[Rule 8 Assessment](./periodic-contagem-autosave-safety-decision-39-rule8-assessment.md)
(✅ READY) → [Implementation Plan](./periodic-contagem-autosave-safety-decision-39-implementation-plan.md)
→ **this Authorization**.

**Baseline:** `main = origin/main = 0387c1b8d08305a84fea14df42e23a801b6cba37`.

---

## 1. What This Authorization Covers (once signed)

Confined entirely to `apps/tenant/src/components/PeriodicStockCountView.tsx`,
per the Plan's own §1–§3:

1. **Per-row autosave scheduling.** The single `draftDebounceTimerRef`
   replaced by a per-row timer structure — catalog rows keyed by their
   existing `productId`; manual rows keyed by their existing array
   index (§2 of the Plan). Editing one row's fields schedules or
   reschedules only that row's own timer entry; editing another row
   never touches it. Rapid edits to the same row continue to collapse
   into one timer, exactly as today.
2. **Live-state-at-fire-time write construction.** Every timer's write
   — regardless of which row's timer triggered it — is built from a
   live, current read of the complete row state at the moment it
   fires, via the same `latestFlushArgs`-style pattern
   `flushPeriodicDraftNow` already uses correctly today. `scheduleDraftSave`'s
   current schedule-time-argument-capture style is retired for this
   purpose specifically.
3. **`draftInFlightSaveRef` stays a single, global ref.** Every row's
   timer, on firing, awaits this same shared ref before issuing its
   own write — never a per-row write queue.
4. **`flushPeriodicDraftNow`'s internal cancellation step extended**
   to clear every pending per-row timer, not a single ref. Its
   write-construction and write-issuing logic is otherwise unmodified.
5. **`handleRemoveManualRow` gains one additional re-indexing block**
   (the manual-row timer map), following its existing two blocks'
   established `i < index` / `i > index` shape exactly.
6. **One new unmount-cleanup effect**, calling the existing
   `flushPeriodicDraftNow` function unmodified — no new
   write-construction logic, a third trigger alongside the untouched
   `visibilitychange`/`pagehide` listeners.
7. **The required test suite**, per the Plan's own §5: structural tests
   for independent per-row timer scheduling (items 1–3), live-state
   sourcing (item 4), the direct T0/T100 race-proof (item 5), global
   write serialization (item 6), manual-row re-indexing (item 7), the
   unmount-triggered flush (item 8); full, unmodified regression on
   `periodic-stock-interruption-durability.test.ts` (314 lines,
   existing) and `periodic-stock-draft-resurrection.test.ts` (247
   lines, existing) (items 9–12), plus whatever small wording
   adjustment the cancellation-step extension requires in the former
   file, flagged in the Plan as non-behavioral.

**No `firestore.rules` or `firestore.indexes.json` change is authorized
or required** — confirmed by the Plan and the Rule 8 Assessment both:
`PeriodicStockDraft.items` remains the existing array, one document,
same path, same rule.

## 2. What This Authorization Does Not Cover

Exactly the Plan's own §4, carried verbatim:

- Any true per-row Firestore document, map, or subcollection.
- Any change to `PeriodicStockDraft`/`PeriodicStockDraftItem`'s schema.
- Any `firestore.rules` or `firestore.indexes.json` change.
- Any multi-draft support of any kind.
- Any new BDR or business decision.
- The "Guardar" → "Validar" rename — `handleSaveCatalogRow`/
  `handleSaveManualRow` are not touched.
- Any change to `handleResumeDraft`, `handleRequestConfirmation`,
  `handleConfirmSave`, `recordStockCount`, or `clearPeriodicStockDraft`.
- Any change to Initial Stock, Business Worth, Unit Relationship, or
  Product Memory.
- Any router or navigation redesign — `App.tsx`'s `activeTab` mechanism
  is unchanged in every other respect.
- Any expansion of this authorization beyond the signed Decision 39's
  own FR-N1 through FR-N4 and this document's own §1.

## 3. Precise Acceptance Criteria

1. Editing Row A schedules or reschedules a timer entry keyed to Row
   A's own identity only; editing Row B never clears or reschedules
   Row A's entry.
2. Rapid successive edits to the same row continue to collapse into a
   single debounced write for that row's contribution to the draft.
3. When any row's timer fires, the write it issues is constructed from
   a live read of the complete current state of every row — never from
   a snapshot captured at that timer's own scheduling moment.
4. Given the T0/T100 scenario (Row A scheduled at T0, Row B edited at
   T100, Row A's timer fires after T100), the resulting write contains
   Row B's edit, regardless of which timer fires or completes first —
   proven by test, not merely asserted.
5. `draftInFlightSaveRef` remains a single, global ref; every autosave
   write, regardless of triggering row, is still awaited-then-issued
   through it, exactly as today's single-timer discipline already
   requires.
6. `handleRemoveManualRow`'s new third re-indexing block correctly
   re-keys the manual-row timer map on removal, matching its two
   existing blocks' behavior exactly — no pending timer attaches to the
   wrong row after a removal.
7. `PeriodicStockCountView`'s unmount (via `App.tsx`'s `activeTab`
   change) triggers `flushPeriodicDraftNow`, unmodified, flushing live
   current state — verified by test, not merely by code inspection.
8. The existing `visibilitychange`/`pagehide` listeners and their
   existing behavior are unmodified and continue to pass their existing
   regression suite.
9. `Retomar Contagem` (`handleResumeDraft`) continues to reconstruct
   the correct draft state, unmodified, from the same single document.
10. Finalization (`handleRequestConfirmation`/`handleConfirmSave`/
    `recordStockCount`) continues to await every pending draft write
    and atomically clear the draft on success, exactly as today —
    confirmed unaffected by any change in this authorization.
11. `PeriodicStockDraft.items` remains the existing array; no schema,
    rules, or index file is touched.
12. No reference to "Validar" is introduced anywhere; `handleSaveCatalogRow`/
    `handleSaveManualRow` are byte-for-byte unchanged.
13. All tests named in the Implementation Plan §5 pass; full regression
    on `periodic-stock-interruption-durability.test.ts` and
    `periodic-stock-draft-resurrection.test.ts`.

## 4. Governance Gates

No BDR. No new Specification Amendment beyond the already-signed
Decision 39 — this document implements exactly what Decision 39
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
