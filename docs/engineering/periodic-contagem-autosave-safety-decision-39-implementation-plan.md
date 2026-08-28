Implementation Plan — DRAFT, NOT AUTHORIZED

# Periodic Contagem Autosave Safety — Per-Row Scheduling + SPA Navigation Flush

**Status:** 🟡 **DRAFT — NOT AUTHORIZED.** Does not authorize
implementation. Implementation Authorization remains a separate,
subsequent, signed document (not created here).

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 28 August 2026) →
[Rule 8 Assessment](./periodic-contagem-autosave-safety-decision-39-rule8-assessment.md)
(✅ READY) → **this Plan**.

**Baseline:** `main = origin/main = 0720a033d80dd622902cd0226d05c1cdda52a5a5`,
working tree clean, confirmed via `git fetch` immediately before this
Plan was drafted.

**This document does not modify application code, tests, Firestore
rules, indexes, or schema.** It translates the READY Rule 8 Assessment
into a concrete, file-by-file map for the eventual Implementation
Authorization to reference.

---

## 1. Scope

**In scope — exactly the signed Decision 39a and 39b**, both confined
to `apps/tenant/src/components/PeriodicStockCountView.tsx`:

### 1a. Per-row autosave scheduling (Decision 39a)

- Replace the single `draftDebounceTimerRef` (one `useRef<Timeout | null>`)
  with a per-row timer structure — a `Map<string, ReturnType<typeof setTimeout>>`
  (or equivalent), keyed by a **stable row identifier** (§2, below).
  Editing Row A schedules/reschedules only Row A's own map entry;
  editing Row B never touches Row A's entry.
- Rapid edits to the *same* row continue to collapse into one timer,
  exactly as today's shared-timer debounce already does — this
  property is preserved by construction (each row's own timer is still
  cleared-and-rescheduled on every edit to that row).
- **Every timer's fire-time write is built from a live, current read of
  all rows — never from the arguments captured at the moment that
  timer was scheduled.** This is Rule 8 Finding §D's own required
  correctness property, satisfied by reusing the `latestFlushArgs`
  pattern (currently used only by `flushPeriodicDraftNow`) as the
  single source every autosave trigger reads from, row-timer-triggered
  or not. `scheduleDraftSave`'s current "argument captured at
  schedule-time" parameter style is retired in favor of this pattern
  for the write-payload construction step specifically.
- The Firestore write itself is unchanged in every other respect: still
  one `setDoc` full-document overwrite of
  `businesses/{businessId}/stockCountDrafts/periodic`, still followed
  by `getDocFromServer` for genuine server-confirmed persistence.
  `PeriodicStockDraft.items` remains the existing array — **no schema
  change, anywhere.**
- `draftInFlightSaveRef` remains a **single, global** ref — not
  per-row. Every row's timer, on firing, still awaits this same shared
  ref before issuing its own write, exactly as `scheduleDraftSave`'s
  existing await-then-issue discipline already does today (Rule 8 §D:
  "extended, not replaced, to more trigger points").
- `draftSaveState` (`'editing' | 'saving' | 'saved' | 'save-failed'`)
  remains a single, shared UI signal — Decision 39 does not require
  this become per-row (Rule 8 §C item 12), and this Plan does not
  introduce that either.

### 1b. Manual-row identity (§B of this task, Rule 8's own named finding)

- Manual rows are identified today by **array index**
  (`confirmedManualRowIndices: Set<number>`,
  `manualRowSaveError: Record<number, string>`), and
  `handleRemoveManualRow` already re-indexes both maps on removal
  (shifts every later index down by one) — established, working
  precedent, directly reused here.
- **The per-row timer map for manual rows uses this same index-based
  keying, with the identical re-indexing treatment applied to it on
  removal** — no new persistent row identity is introduced. This Plan
  finds no evidence such an identity is necessary: catalog rows already
  have a stable key (`productId`); manual rows' existing index-based
  identity, extended with the same re-indexing discipline already
  proven correct for `confirmedManualRowIndices`/`manualRowSaveError`,
  is sufficient and stays fully within Decision 39's authorized scope
  (no schema change, no new field).
- `handleRemoveManualRow`'s existing re-indexing block gains one more
  parallel structure to re-key (the manual-row timer map), following
  the exact same `i < index` / `i > index` pattern already written
  there for the two existing maps.

### 1c. SPA navigation flush (Decision 39b)

- One new `useEffect(() => { return () => { flushPeriodicDraftNow(); }; }, [])`-shaped
  unmount-cleanup effect, calling the **existing**
  `flushPeriodicDraftNow` function **unmodified**. No new write-
  construction logic — this function already reads `latestFlushArgs.current`
  (live state) and already cancels the pending debounce before writing.
- Under 1a, "cancels the pending debounce" must be understood as
  cancelling **every still-pending per-row timer**, not a single ref —
  `flushPeriodicDraftNow`'s own internal cancellation step is extended
  from "clear one ref" to "clear every entry in the per-row timer map,"
  the same structural change 1a itself makes to `scheduleDraftSave`.
- The existing `visibilitychange`/`pagehide` listeners (~1245–1256) are
  **not modified** — the unmount cleanup is a third, independent
  trigger for the same function, added alongside them, not replacing
  or altering either.
- `flushInFlightSaveRef` remains exactly as today — the unmount flush
  reuses it identically to how the browser-event-triggered flush
  already does.

## 2. Row Identity — Explicit Design Decision

| Row type | Key used for the per-row timer map | Precedent |
|---|---|---|
| Catalog row | `productId` (already stable, already used as the object key in `catalogRows: CatalogRowState`) | Direct reuse of existing identity |
| Manual row | Array index (matching `confirmedManualRowIndices`/`manualRowSaveError`) | Direct reuse of existing identity + existing re-indexing pattern |

No new identity scheme, no new field on `StockCountWorkingRow` or
`PeriodicStockDraftItem`, no schema change — confirmed within Decision
39's own explicit boundary (§4 of the amendment: no schema change of
any kind).

## 3. Exact Implementation Elements

- **New data structure(s):** two `useRef`-held maps (or one combined
  map keyed by a `'catalog:' + productId` / `'manual:' + index`-style
  discriminated key, an implementation-task-level choice, not fixed
  here) replacing the single `draftDebounceTimerRef`. Component-scoped
  local state only — no Firestore field, no new collection.
- **`scheduleDraftSave`'s replacement:** per-row scheduling function(s)
  that (a) clear/reset only the timer for the row that changed, (b)
  when a given row's timer fires, read the live current full state
  (via a `latestFlushArgs`-style ref, extended to cover this path) and
  issue the existing full-document `savePeriodicStockDraft` call,
  awaiting `draftInFlightSaveRef` first, exactly as today.
- **`flushPeriodicDraftNow`'s internal cancellation step:** extended to
  clear every pending per-row timer (iterate the map), not a single
  ref — its write-construction and write-issuing logic is otherwise
  **unmodified**.
- **`handleRemoveManualRow`:** gains one more re-indexing block
  (the manual-row timer map), following the existing two blocks'
  established shape exactly.
- **New unmount-cleanup effect:** calls `flushPeriodicDraftNow`
  unmodified, on unmount only.
- **`handleConfirmSave`/`handleRequestConfirmation`:** **no change** —
  both already await `draftInFlightSaveRef`/`identityWriteRef`/
  `flushInFlightSaveRef` (all remaining global, unchanged refs) before
  proceeding; nothing about per-row scheduling changes what they await
  or how.

## 4. Explicit Exclusions (carried verbatim from Decision 39 and this task's own instruction)

- No true per-row Firestore documents, maps, or subcollections.
- No change to `PeriodicStockDraft`/`PeriodicStockDraftItem`'s schema.
- No `firestore.rules` or `firestore.indexes.json` change.
- No multi-draft support of any kind (explicitly separate work, per
  this session's own earlier "Contagem Nova" investigation — not
  conflated here).
- No new BDR, no new business decision.
- No "Guardar" → "Validar" rename — `handleSaveCatalogRow`/
  `handleSaveManualRow` are not referenced anywhere in this Plan and
  remain untouched.
- No change to `handleResumeDraft`, `handleRequestConfirmation`,
  `handleConfirmSave`, `recordStockCount`, or `clearPeriodicStockDraft`.
- No change to Initial Stock, Business Worth, Unit Relationship, or
  Product Memory.
- No router introduced; `App.tsx`'s `activeTab` mechanism is unchanged
  in every other respect.

## 5. Testing Plan

Mapped 1:1 to this task's own list, and to Rule 8 §C item 13's
established no-DOM-harness, source-structure convention:

1. **Row A and Row B have independent 800ms timers** — structural test
   proving editing Row A schedules an entry keyed to Row A's own
   identity, editing Row B schedules a separate entry keyed to Row B's,
   and neither clears the other's.
2. **Editing B does not reset A** — same test, asserting Row A's timer
   handle is unchanged (not re-created) after a Row B edit.
3. **Rapid edits to A collapse into one save** — same per-row-timer
   clear-and-reschedule pattern already proven for the single shared
   timer, re-asserted per-row.
4. **Every timer uses live current state at fire-time** — a structural
   assertion that the per-row write-construction path reads from the
   same `latestFlushArgs`-style live ref `flushPeriodicDraftNow` already
   uses, not from schedule-time-captured function arguments.
5. **A stale Row A timer cannot revert Row B** — the direct proof test
   for Rule 8 §D's own central finding: construct a scenario matching
   the T0/T100/fires-later timeline and assert the resulting write
   payload includes Row B's edit regardless of firing order.
6. **Global Firestore write serialization remains intact** — structural
   test proving `draftInFlightSaveRef` remains a single ref (not a
   per-row map) and remains awaited before every write, regardless of
   which row's timer triggered it.
7. **Manual-row removal/re-indexing does not cause wrong-row
   persistence** — structural test on `handleRemoveManualRow`'s new
   third re-indexing block, mirroring the existing two.
8. **SPA unmount triggers a current-state flush** — structural test
   proving the new unmount-cleanup effect calls `flushPeriodicDraftNow`
   unmodified.
9. **Existing `pagehide`/`visibilitychange` behavior remains intact** —
   regression: `periodic-stock-interruption-durability.test.ts`'s
   existing §7 item 7 suite re-run unmodified.
10. **`Retomar Contagem` still reconstructs the correct draft** —
    regression: `handleResumeDraft`'s own existing behavior, unaffected
    by any change in this Plan, re-run unmodified.
11. **Finalization still awaits pending draft writes and clears the
    draft atomically** — regression:
    `periodic-stock-interruption-durability.test.ts`'s §7 items 8–10
    and `periodic-stock-draft-resurrection.test.ts`'s existing suites,
    re-run unmodified (both concern `draftInFlightSaveRef`/
    `identityWriteRef`/`flushInFlightSaveRef`, all unchanged in kind by
    this Plan).
12. **No regression to existing interruption-durability tests** — full
    re-run of `periodic-stock-interruption-durability.test.ts` (314
    lines, existing) and `periodic-stock-draft-resurrection.test.ts`
    (247 lines, existing), both confirmed present at this baseline,
    neither requiring rewrites — only the cancellation-step extension
    named in §3 might touch phrasing of one or two existing assertions
    that currently describe "the" debounce timer in the singular; this
    Plan flags that as a likely small wording adjustment, not a
    behavioral regression.

**Files expected to change/create:**
- `tests/periodic-stock-interruption-durability.test.ts` — existing
  file, likely small wording adjustments only (singular → per-row
  timer references), no behavioral rewrite.
- A new dedicated test file (naming left to the Implementation
  Authorization/task, matching this repository's per-feature file
  convention already used twice this session) covering items 1–8 and
  the §D race-proof (item 5) specifically.

## 6. Performance / Write-Amplification (analysis only, no pricing claims)

Per-row scheduling increases the *number* of debounce triggers relative
to the current shared-timer design — in the worst case (every row
touched once, no revisits, no natural pauses long enough to let a
shared timer catch multiple rows together), write frequency approaches
one write per row touched, rather than being paced purely by
system-wide typing pauses. **The underlying Firestore write itself is
unchanged in shape** — still one full-document `setDoc` of the entire
current `items` array, regardless of which row's timer triggered it;
per-row scheduling changes *when* that write fires, not *what* it
contains or *how large* it is. This Plan makes no claim about cost,
quota, or pricing impact — that is explicitly out of scope, per this
task's own instruction not to invent pricing assumptions.

## 7. Governance Dependency

This Plan implements only the signed Decision 39 amendment and the
READY Rule 8 Assessment referenced in its governing chain, above. No
conflict with either was discovered while drafting this Plan — every
element in §1–§3 traces directly to a specific FR (FR-N1 through FR-N4)
or a specific Rule 8 finding (§D's race proof, §E's SPA mechanism, the
manual-row-identity finding), with no addition, narrowing, or
reinterpretation of either. **No STOP condition triggered.**

## 8. Next Governance Step

This Plan does not authorize implementation. Per this project's
standing discipline: a separate, signed **Implementation
Authorization** is the next and final gate before any code is written
— not created by this document.
