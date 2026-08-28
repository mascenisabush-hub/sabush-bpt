Specification Amendment — Proposed

# Decision 40 — Validated Row Workflow: Guardar → Validar, Accumulated Review Area, and Row Correction
## (Proposed amendment to `stock-count-data-loss-resilience-specification.md`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED.**

This document has been accepted from its own draft status — Decision
40 is accepted as proposed, in full, including: renaming Guardar to
Validar with persistent, row-owned validation state (§2, FR-N5–FR-N7);
filtering (never removing) validated rows out of the active workspace,
for both catalog and manual rows (§2, FR-N8–FR-N9); reliance on
Decision 39's existing autosave/flush mechanisms unmodified (§2,
FR-N10); the minimal "Corrigir" extension to `pendingTally` (§2,
FR-N11); and the explicit preservation of finalization/Business Worth
(§2, FR-N12; §3). It does not authorize implementation. It does not
itself constitute a Rule 8 Assessment or an Implementation
Authorization — both remain separate, subsequent gates.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](./stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38 applied) → [Decision 39 amendment](./stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented on `main`) → **this amendment
("Decision 40"), now accepted** → Rule 8 Assessment (not yet drafted;
this document is the prerequisite gate for it) → Implementation Plan →
Implementation Authorization.

**Baseline:** `main = origin/main = 56233c9e40f9cca47890f88097b0d7ca9414954c`,
confirmed clean (`git status --porcelain` empty) immediately before
drafting. This is the post-Decision-39 implementation baseline —
per-row 800ms autosave scheduling, live-state-at-fire-time sourcing,
global write serialization, and SPA/unmount flush are all already
live on this commit and are not reopened by this amendment.

**Numbering:** the parent Specification's own `Decision N` sequence
has Decision 39 (per-row autosave scheduling + in-app navigation
durability) as its highest accepted decision — confirmed by direct
inspection of `docs/specs/stock-count-data-loss-resilience-decision-39-amendment.md`
(✅ Accepted and Authorized, 28 August 2026) and of the parent
specification's own header, which records no higher number. No other
file in the repository references a "Decision 40" or higher. This
proposes **Decision 40** as the next collision-free number in that
same sequence; final confirmation is the Product Architect's to make
on acceptance.

**Source:** the read-only architectural investigation performed this
session against this exact baseline ("original intended Contagem
workflow" investigation, tracing `handleSaveCatalogRow`,
`handleSaveManualRow`, `confirmedCatalogProductIds`/
`confirmedManualRowIndices`, `visibleCatalogEntries`, the `removed`
row mechanism, `PeriodicStockDraftItem`, `workingRowToDraftItem`/
`draftItemToWorkingRow`, `pendingTally`, and the finalization path).
This amendment formalizes only the finding that requires an actual
governance decision before Rule 8 can proceed — it does not restate
the full investigation, and it does not add any requirement the
investigation did not support.

---

## 1. Problem Statement

The investigation established, by tracing the actual code, that the
per-row "Guardar" action (`handleSaveCatalogRow`, `handleSaveManualRow`)
is currently **only a local React-state lock**:

- `confirmedCatalogProductIds`/`confirmedManualRowIndices` are plain
  `useState<Set>` values, never written into `catalogRows`/`manualRows`,
  never passed through `workingRowToDraftItem`, never present in the
  persisted `PeriodicStockDraft` document.
- A "saved" row does not leave the active counting workspace; it stays
  in `visibleCatalogEntries`/the manual-rows list, with only a cosmetic
  dot-color and locked-field change.
- This state does not survive browser refresh, SPA navigation, browser
  close, or `Retomar Contagem` — `handleResumeDraft` never repopulates
  either Set from the resumed draft.
- The existing `pendingTally` review screen is read-only: it cannot
  distinguish a validated row from an unvalidated one, and offers no
  way to correct a specific product before `Confirmar Contagem` — only
  a blanket "Voltar" that discards the whole review and returns to the
  full, undifferentiated active workspace.

This does not match the originally intended workflow: a product,
once checked, should durably leave the active counting workspace,
join an accumulated/validated area that survives interruption, remain
correctable there, and only then feed `Confirmar Contagem`.

## 2. What This Amendment Does

**[PROPOSED DECISION — REQUIRES PRODUCT ARCHITECT ACCEPTANCE]**

This amendment authorizes reframing "Guardar" as **"Validar"** with the
following durable, additive behavior, using the smallest architecture
the investigation found sufficient (its "Option A"):

- **FR-N5 [new, proposed].** The existing per-row "Guardar" action is
  renamed, in meaning and in the interface, to "Validar": *"I have
  finished checking/counting this product."* No other semantic change
  is made to what validating a row requires (the existing
  `validateWorkingRowForSave` checks, and the existing zero-quantity
  confirmation, are unchanged).

- **FR-N6 [new, proposed].** Validated state becomes **persistent**,
  stored **on the row itself** as an additive optional field (working
  name `validated?: boolean`, on both `StockCountWorkingRow` and
  `PeriodicStockDraftItem`) — never as a parallel React `Set`, never as
  a second Firestore collection or document, and never by converting
  `PeriodicStockDraft.items` into a keyed map or subcollection. The
  existing one-document draft (`businesses/{businessId}/stockCountDrafts/periodic`)
  is unchanged in identity and overall shape.

- **FR-N7 [new, proposed].** `workingRowToDraftItem` and
  `draftItemToWorkingRow` are extended to round-trip this field
  through the existing explicit-literal style both functions already
  use (mirroring exactly how `removed` is already round-tripped
  today) — so validated state is included in every ordinary autosave
  write and is restored automatically by `Retomar Contagem`.

- **FR-N8 [new, proposed].** A validated row is excluded from the
  active workspace by **filtering**, not by removing it from the
  underlying `catalogRows`/`manualRows` state or from the persisted
  `items` array — in the same spirit as, and following the same
  pattern already established by, the existing `removed`-row
  mechanism (`visibleCatalogEntries`'s `!row.removed` filter). The
  row's data remains fully present, fully recoverable, and fully
  eligible for finalization at all times.

- **FR-N9 [new, proposed].** Manual rows must not be physically
  spliced out of the `manualRows` array merely because they become
  validated. Their exclusion from the active workspace must be
  derived (a filtered view), never achieved by mutating the array
  itself — this is required specifically to avoid the index-corruption
  class of bug the existing `handleRemoveManualRow` re-indexing logic
  already has to guard against for row deletion.

- **FR-N10 [new, proposed].** Validating a row does not require any
  new autosave trigger, any immediate/non-debounced write path, or any
  cancellation of that row's own pending timer. It relies entirely on
  Decision 39's existing per-row 800ms scheduling, existing
  live-state-at-fire-time sourcing (`latestFlushArgs`), existing
  global write serialization (`draftInFlightSaveRef`), and existing
  SPA/unmount and browser-level flush (`flushPeriodicDraftNow`,
  `pagehide`/`visibilitychange`) to persist and to survive
  interruption — because the validated flag lives on the same row
  object those mechanisms already close over. **None of Decision 39's
  mechanisms are modified, replaced, or extended by this amendment**;
  they are relied upon exactly as they already exist.

- **FR-N11 [new, proposed].** The existing `pendingTally` review
  screen is minimally extended — not redesigned — to carry enough row
  identity (productId, or manual-row identity) and validated status
  for each reviewed item to support a single new "Corrigir" affordance
  per row. Activating it must: return the Owner to the active
  workspace; clear that one row's `validated` flag (via the existing
  update path, e.g. `updateCatalogRow`/`updateManualRow`); reopen that
  row for editing; and discard the now-stale `pendingTally` snapshot
  (consistent with how "Voltar" already discards it today), so the
  Owner re-enters `handleRequestConfirmation` afresh once corrections
  and re-validation are complete. No other change to the review
  screen's layout, data source, or the shape of `StockCountTallyItem`
  beyond what carrying this identity/status requires.

- **FR-N12 [new, proposed].** Finalization (`handleRequestConfirmation`
  → `pendingTally` → `handleConfirmSave` → `recordStockCount` →
  StockCount history → `BusinessWorthSnapshot` → Business Worth) is
  explicitly **not** re-scoped by this amendment. `tallyStockCountRows`
  continues to run over all working rows regardless of validated
  status (a validated row is still counted or not-counted purely by
  its `quantity`/`removed` state, exactly as today); the validated
  flag governs only which UI area a row renders in and how the review
  screen groups it, never what value it contributes.

## 3. What This Amendment Does Not Change

- `PeriodicStockDraft`'s document identity (`stockCountDrafts/periodic`),
  its status as a single document holding a single `items` array, or
  any Firestore rule/index — explicitly unchanged.
- Decision 39's per-row autosave scheduling, live-state-at-fire-time
  sourcing, global `draftInFlightSaveRef` serialization, or SPA/unmount
  flush mechanisms — relied upon, not modified.
- `recordStockCount`, StockCount history creation, `BusinessWorthSnapshot`
  creation, or Business Worth integration — unaffected; finalization's
  inputs remain derived purely from `tallyStockCountRows` over
  quantity/removed state, never from validated status.
- The existing `removed` row mechanism itself — reused as a pattern,
  not modified.
- Initial Stock, Add Stock, Product Memory, Unit Relationship, or any
  valuation calculation — none referenced, none affected.
- The overall two-step `handleRequestConfirmation` →
  `handleConfirmSave` confirmation control structure — unaffected;
  this amendment adds a correction path that re-enters it, not a
  replacement for it.

## 4. Explicit Non-Goals

The following were considered by the investigation and are explicitly
**not** authorized by this amendment. Any of them would require their
own, separate governance decision:

- A new Firestore collection or a second draft document for
  validated/accumulated rows (investigation's "Option C").
- A separate in-memory collection for validated rows distinct from
  `catalogRows`/`manualRows` (investigation's "Option B").
- Converting `PeriodicStockDraft.items` into a keyed map or
  subcollection.
- Any new autosave architecture, timer model, or write-serialization
  change beyond what Decision 39 already established.
- Any change to Initial Stock, Add Stock, or their respective drafts.
- Any change to Business Worth calculation or `BusinessWorthSnapshot`
  shape.
- Any change to StockCount finalization semantics or the StockCount
  history schema.
- Any redesign of the `pendingTally` review screen beyond the minimal
  identity/status carrying and the single "Corrigir" affordance
  described in §2.
- Validation timestamps or audit history (e.g. "validated at" per
  row) — not required by the stated workflow and not authorized here.
- Any new business rule unrelated to this workflow.

## 5. Governance Classification

This amendment resolves a gap between the *originally intended*
Contagem workflow and its *current* implementation, entirely within
the existing Decision 38/39 Periodic Contagem data-loss-resilience
lineage: it extends the same one-document draft this lineage already
governs, adds one additive optional field alongside the existing
`removed`/`submissionId`/`newProductInfo` fields, and reuses Decision
39's existing autosave/flush guarantees without modifying them. It
does not reverse any settled Product Architect decision, does not
introduce a new business principle independent of the existing
Contagem/Business Worth chain, and does not touch finalization or
Business Worth semantics.

**This is a Specification Amendment, not a new BDR.** The
investigation found no evidence requiring a new Business Decision
Record — the underlying business principle ("a physical count,
reviewed, then finalized into Business Worth") is the same one
BDR-0009 and the Decision 38/39 lineage already record; what changes
is how the existing "Guardar" step's already-governed persistence
model is extended to durably reflect the Owner's own already-existing
"finished checking this product" intent. Should Rule 8 surface
evidence during its own review that this is materially larger or
riskier than this amendment describes, that would be grounds to
pause and revisit this classification — but no such evidence exists
in the investigation this amendment is based on.

## 6. Next Governance Step

Upon acceptance and signature: Rule 8 Assessment, then Implementation
Plan, then a signed Implementation Authorization — no code is written
before that full chain, per this project's standing discipline and
per Decision 39's own identical precedent.

---

## 7. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND AUTHORIZED.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED
**Date:** 29 August 2026

This signature accepts Decision 40 as drafted, in full, including its
explicit non-goals (§4) and what remains unchanged (§3). Next
governance gate: Rule 8 Assessment. No implementation may begin until
that full chain (Rule 8 Assessment → Implementation Plan →
Implementation Authorization) is completed, per this project's
standing discipline.
