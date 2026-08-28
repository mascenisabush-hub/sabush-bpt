Rule 8 Assessment — DRAFT, READ-ONLY

# Rule 8 Assessment — Periodic Contagem Autosave Safety (Decision 39)

**Status:** 🟡 **DRAFT — READ-ONLY ASSESSMENT. NOT SIGNED. NOT AN
IMPLEMENTATION AUTHORIZATION.** This document does not authorize
implementation, and is not committed or pushed unless explicitly
instructed separately.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ **ACCEPTED AND AUTHORIZED** — SABUSHIMIKE MASCENI, Product
Architect, 28 August 2026) → **this assessment**.

**Baseline:** `main = origin/main = e8b0ee75672ef69b092f9ceeff05da7aad698da7`,
working tree clean, confirmed via `git fetch` immediately before this
assessment began.

**Scope of this assessment:** exactly Decision 39a (per-row autosave
scheduling, same single-document/array storage) and Decision 39b
(unmount-flush for SPA navigation), as signed. Not in scope: any
schema/storage-shape change (explicitly excluded by the amendment's own
§4), the Guardar→Validar rename (explicitly deferred by this task's own
instruction), Initial Stock, Business Worth, Unit Relationship, Product
Memory, `Retomar Contagem`'s own logic, or finalization's own logic.

---

## A. Verification That the Signed Text Authorizes Both 39a and 39b

Read fresh from the repository this session (not from memory of an
earlier draft). Confirmed directly:
- §7 (Product Architect Acceptance): *"This signature accepts Decision
  39a and Decision 39b as drafted, in full, including their explicit
  non-goals (§4) and what remains unchanged (§3)."* Signed, dated 28
  August 2026.
- §2a contains FR-N1, FR-N2, FR-N3 (per-row scheduling; live-state-at-
  fire-time payload requirement; global write serialization retained).
- §2b contains FR-N4 (unmount-triggered flush, mechanism left to Rule
  8/Implementation).
- §4 explicitly excludes any storage-shape change (array → map/
  subcollection) from this authorization.

**Verified: the signed text authorizes both 39a and 39b, exactly as
this task states, with no discrepancy found.**

## B. Current Implementation, Re-Traced Fresh at This Baseline

- **`scheduleDraftSave`** (~932–1000): single shared `draftDebounceTimerRef`.
  `nextCatalogRows`/`nextManualRows`/etc. are captured as **explicit
  function arguments at the moment `scheduleDraftSave` is called**
  (schedule-time), not read fresh when the timer fires. This is safe
  *today* only because there is one shared timer — every edit
  reschedules it, recapturing fresh arguments each time. **This is the
  exact pattern FR-N2 requires changing** for a per-row design, since
  under independent per-row timers, an early-scheduled row's timer
  would otherwise fire with a stale snapshot.
- **`latestFlushArgs`** (~1201–1202): a `useRef`, reassigned
  unconditionally on **every render** — the live-current-state pattern
  FR-N2 requires be extended to every autosave trigger. Already exists,
  already correct, already used by `flushPeriodicDraftNow`.
- **`draftInFlightSaveRef`** (~975–984, ~1000): the single, global
  in-flight-write tracking ref FR-N3 requires remain global. Confirmed:
  one ref, awaited before every new ordinary autosave write is issued.
- **`flushPeriodicDraftNow`** (~1215–1230): already uses
  `latestFlushArgs.current` (live state), already cancels the pending
  debounce, already writes the full current draft, already tracked via
  `flushInFlightSaveRef`. **This function is already fully compliant
  with FR-N2's own required pattern — it is the model to extend, not
  something needing correction itself.**
- **`visibilitychange`/`pagehide`** (~1245–1256): unchanged, confirmed
  still wired exactly as Decision 38 established. The effect's own
  cleanup (~1251–1254) only removes these two listeners — **confirmed:
  no unmount-triggered flush exists yet**, consistent with FR-N4 not
  yet being implemented (expected, pre-implementation).
- **`PeriodicStockCountView` unmount lifecycle**: re-confirmed via
  `App.tsx` — no router; `{activeTab === 'stock-count' && (<PeriodicStockCountView .../>)}`
  is the entire mechanism. A tab switch is a genuine, unconditional
  React unmount. No guard, no confirmation, anywhere in that
  transition.
- **`savePeriodicStockDraft`** (`AppContext.tsx` ~5250–5283): unchanged,
  full-document `setDoc` + `getDocFromServer`. Confirmed: this
  function's own signature and behavior need no change under 39a — it
  already accepts the full row array as an argument regardless of what
  triggers the call.
- **`handleRequestConfirmation`**/**`handleConfirmSave`** (~1881, ~1983):
  unchanged, re-confirmed. Neither reads any per-row structure this
  amendment would introduce; both operate on `allWorkingRows`/
  `pendingTally`, entirely independent of autosave's internal
  scheduling mechanism.
- **`recordStockCount`**: unaffected — confirmed (again) that
  finalization never reads the Firestore draft at all, only live
  component state. Nothing about 39a/39b touches this path.
- **`Retomar Contagem`** (`handleResumeDraft`, ~1629): unaffected —
  reads the same single document, unchanged shape, regardless of what
  scheduling mechanism produced it.
- **Finalization/delete behavior** (`recordStockCount`'s atomic batch,
  `clearPeriodicStockDraft`): unaffected by 39a/39b; both concern only
  how/when the draft gets *written*, never how it's *deleted* or
  finalized.

## C. Rule 8 Dimensions

1. **Business-rule compliance.** No business rule changes — 39a/39b are
   both mechanism-level, per the signed amendment's own §5
   classification (no new BDR). **PASS.**
2. **Governance compliance.** Fully authorized by the signed Decision
   39 amendment, verified in §A above. **PASS.**
3. **Data integrity.** Contingent on FR-N2's correctness property being
   implemented exactly as specified (§D, below) — this is the one
   dimension requiring careful implementation-task discipline, not
   merely "PASS by default."
4. **Tenant isolation/security.** No change — same document path, same
   `firestore.rules` rule (`isOwnerOf(businessId)`, no field-shape
   validation, confirmed unchanged). **PASS.**
5. **Concurrency/race conditions.** The central technical question of
   this assessment — see §D.
6. **Stale-write protection.** Existing `draftInFlightSaveRef`
   discipline must be extended, not replaced, to cover N possible
   trigger points feeding one still-global queue — traced in §D.
7. **Interruption durability.** Existing `visibilitychange`/`pagehide`
   mechanism unaffected; extended by FR-N4's unmount case — traced in
   §E.
8. **Recovery/resume correctness.** Unaffected — `handleResumeDraft`
   reads the same single document, unchanged shape (§B). **PASS.**
9. **Finalization compatibility.** Unaffected — confirmed, finalization
   never reads the draft (§B). **PASS.**
10. **Performance/write amplification.** Real, expected tradeoff — more
    frequent full-document writes (approaching one per row touched, in
    the worst case of no revisits), in exchange for a much smaller
    per-row exposure window. Not a defect; an accepted consequence of
    the signed amendment's own explicit direction, already named in the
    prior investigation this amendment formalizes.
11. **Firestore document-size constraints.** Unaffected by 39a/39b —
    document size is a function of row count, not of scheduling
    granularity; the existing 1 MiB ceiling consideration (already
    flagged in the parent Specification's own §13 as a "sizing check")
    is unchanged by this work.
12. **Failure handling.** `save-failed` state, existing catch/retry-on-
    next-edit behavior, unchanged in kind; now needs to be reasoned
    about per-row-trigger rather than per-shared-timer, but the
    underlying mechanism (`draftSaveState`) is a single, shared UI
    signal today and nothing in Decision 39 requires it become
    per-row — worth an explicit implementation-task note, not a
    blocker.
13. **Testability.** This repository's existing no-DOM-harness,
    source-structure-assertion convention (established throughout this
    session's other work) applies cleanly here — timer scheduling,
    live-state sourcing, and serialization discipline are all provable
    from source structure, matching precedent.
14. **Regression risk.** Contained — every existing test file covering
    `scheduleDraftSave`/`draftInFlightSaveRef`/`flushPeriodicDraftNow`/
    `visibilitychange`/`pagehide` continues to describe behavior that
    remains true under 39a/39b (the shared-timer tests would need
    updating to reflect per-row timers specifically, not deleting).
15. **Scope containment.** No drift found — nothing in this assessment
    touches Guardar/Validar, Initial Stock, Business Worth, Unit
    Relationship, Product Memory, or the storage schema, matching the
    amendment's own §3/§4 boundaries exactly.

## D. The Critical Race — Proof, Not Assertion

**Scenario, as specified:** Row A scheduled at T0; Row B changes at
T100; Row A's timer fires later. Prove Row A's write cannot use a T0
snapshot and revert Row B.

**Why this is a real risk under a naive implementation:** if Row A's
own timer, when scheduled at T0, captured `nextCatalogRows`/etc. as an
**argument** (exactly the current `scheduleDraftSave` pattern, §B) and
nothing re-touches Row A's own timer afterward, then when it fires, its
closure still holds the **T0 snapshot** — which does not include Row
B's T100 edit, since that edit only touched Row B's own, independent
timer. If Row A's write completes with that stale snapshot, it would
overwrite the single Firestore document with data that reverts Row B's
already-newer edit.

**Why FR-N2 closes this, provably:** FR-N2 requires every write —
regardless of which row's timer triggered it — be built from a live
read of current state **at the moment the write is issued**, not at
whatever moment that timer was originally scheduled. `latestFlushArgs`
(§B) already proves this pattern works and is already implemented
correctly for the interruption-flush path. **The required design:**
each row's timer, on firing, reads from that same kind of
continuously-updated ref — not from arguments captured when
`setTimeout` was called. Under that discipline, Row A's timer firing at
any point after T100 reads state that **already includes** Row B's
edit (since `latestFlushArgs`-style refs update on every render,
independent of which row changed), making the reversion scenario
**structurally impossible**, regardless of which row's timer physically
fires first or which write physically completes first.

**Does the global write-serialization discipline (`draftInFlightSaveRef`)
remain correct under this design?** Yes, and it must be **extended, not
replaced**: since every write (regardless of trigger) still targets the
exact same one document, the existing "await any prior in-flight write
before issuing the next one" discipline continues to be the correct
and sufficient protection against two *writes* completing out of order
— it needs to be reachable from N possible trigger points (N row
timers, plus the existing flush/confirm paths) instead of just one, but
its own logic (await-then-issue) does not need to change in kind, only
in how many places call into it. **This is exactly FR-N3's own
requirement, and it is satisfiable without modification to the
serialization logic itself** — only to how many call sites feed it.

**One additional, concrete implementation-task-level finding, not a
blocker:** manual rows are identified today by **array index**, not a
stable id (confirmed, `confirmedManualRowIndices`/`manualRowSaveError`
are both `index`-keyed, and `handleRemoveManualRow` (~1481–1518)
already re-indexes both maps on removal, with an explicit comment
explaining why — "removing a row shifts every LATER index down by one").
**A per-row timer map for manual rows would need this exact same
re-indexing treatment applied to it** — this is not a new problem
Decision 39 introduces; it is the same, already-solved problem, with
established precedent to follow, not invent.

## E. SPA Navigation — Proof, Not Assertion

**What happens when `PeriodicStockCountView` unmounts (tab switch)?**
Confirmed (§B): unconditional React unmount via `App.tsx`'s
`activeTab`-gated conditional render. No router, no guard.

**How should the flush be triggered?** The natural, minimal-risk
mechanism, reusing existing precedent rather than inventing one: a
`useEffect(() => () => { flushPeriodicDraftNow(); }, [])`-shaped
unmount-cleanup, calling the **existing** `flushPeriodicDraftNow`
function unmodified — the same function `visibilitychange`/`pagehide`
already call. This introduces no new write-construction logic; it only
adds a third trigger for an already-correct function.

**Does this introduce stale state?** No — `flushPeriodicDraftNow`
already reads `latestFlushArgs.current` (§B), which is current at the
moment of any call, including one fired from an unmount cleanup.

**Interaction with pending debounce timers and in-flight writes?**
`flushPeriodicDraftNow` already cancels the pending debounce
(`draftDebounceTimerRef`, single-shared today; would become
per-row-plural under 39a — the unmount flush would need to cancel
*every* still-pending per-row timer, not just one, extending this
cancellation logic from singular to plural) and tracks its own write in
`flushInFlightSaveRef`, independent of `draftInFlightSaveRef`. No
conflict identified — this mirrors exactly how the existing
browser-level flush already coexists with the existing single debounce
timer today.

**Is finalization accidentally affected?** No — confirmed again (§B),
finalization never reads the draft. An unmount-triggered flush firing
moments before or after a confirm has no bearing on `recordStockCount`'s
own data source.

**Does browser-level `pagehide`/`visibilitychange` behavior remain
intact?** Yes — nothing about adding a third, unmount-based trigger
requires touching the existing two browser-event listeners at all; they
remain wired exactly as today, calling the exact same function.

## F. Governance Conflict Check

Checked directly: does anything in Decision 39 contradict or reopen any
other existing, signed governance artifact on `main`? **No conflict
found.** Specifically checked against: the discard-confirmation safety
fix (`e7dc197`) — entirely different code paths (`handleDiscardDraft`/
`discardConfirmState` vs. `scheduleDraftSave`/`flushPeriodicDraftNow`),
no overlap, no contradiction. The §44 Cost-Price-Removal governance
chain — unrelated subsystem (`costBasisEstablished`, Cost Price UI),
no overlap. `BDR-0009`, the parent Data-Loss-Resilience Specification's
own Decision 38 — Decision 39 explicitly extends both without
contradicting either (verified in the amendment's own §1/§5, re-checked
directly against the parent Specification's current text in this
session). **No STOP condition triggered.**

## G. Formal Artifact

This document itself is that formal Rule 8 Assessment artifact,
per this repository's established convention (used identically for
the §44 chain and the discard-confirmation fix earlier this session).
Marked DRAFT, unsigned, not committed or pushed per instruction.

## H. Final Verdict

**READY.**

Every Rule 8 dimension in §C is either a clean PASS (governance,
tenant isolation, recovery, finalization, document-size, scope
containment) or a **provably closeable** design requirement (data
integrity, concurrency, stale-write protection, interruption
durability) — §D and §E give the exact, concrete technical shape that
closes each one, using patterns (`latestFlushArgs`, the existing
`draftInFlightSaveRef` discipline, the existing manual-row
re-indexing precedent, the existing `flushPeriodicDraftNow` function
itself) that already exist and are already correct in this codebase.
**No new Product Architect decision is required** — the signed Decision
39 amendment already fixed every business-level question this
assessment needed; this document only confirms the technical path is
sound and names the exact patterns an Implementation Plan should
specify.

**Implementation can proceed to the next governance gate — an
Implementation Plan — without reopening business authority**, because:
(1) the storage model is explicitly unchanged (§4 of the amendment,
re-verified §B); (2) the correctness property required to make per-row
timers safe (§D) is not a new invention but a direct extension of a
pattern already proven correct elsewhere in this exact file
(`latestFlushArgs`); (3) the unmount-flush mechanism (§E) reuses an
existing function verbatim, adding only a new trigger; (4) no existing
signed governance is contradicted (§F).

---

## Verification Performed for This Assessment

- The signed Decision 39 amendment read completely and fresh from the
  repository (§A).
- `PeriodicStockCountView.tsx`: `scheduleDraftSave`, `draftDebounceTimerRef`,
  `latestFlushArgs`, `draftInFlightSaveRef`, `identityWriteRef`,
  `flushInFlightSaveRef`, `flushPeriodicDraftNow`, the
  `visibilitychange`/`pagehide` effect, `handleRequestConfirmation`,
  `handleConfirmSave`, `handleResumeDraft`, `handleRemoveManualRow`,
  `confirmedManualRowIndices`/`manualRowSaveError`'s re-indexing
  pattern — all read directly, this session, at this exact commit.
- `AppContext.tsx`: `savePeriodicStockDraft`, `recordStockCount`'s own
  data-sourcing (re-confirmed: never reads the draft).
- `App.tsx`: confirmed no router; confirmed the exact `activeTab`-gated
  unmount mechanism.
- `firestore.rules`: `stockCountDrafts/{draftId}` re-confirmed
  unchanged, no field-shape validation.
- `git fetch` run immediately before this assessment began; confirmed
  `main = origin/main = e8b0ee7`, working tree clean.
- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or
  `tests/` file was modified to produce this assessment.
- No Specification or amendment artifact was modified.
- No Implementation Plan or Implementation Authorization was created.
- This document itself was not committed or pushed.
