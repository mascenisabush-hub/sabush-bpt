Governance Gate Determination + Rule 8 Assessment

# Periodic Contagem "Começar de Novo" — Discard-Confirmation Safety Fix

**Scope:** Periodic Contagem only (`PeriodicStockCountView.tsx`). Initial
Stock (`InitialStockCountView.tsx`) is not referenced anywhere in this
document and is not touched by anything it authorizes.

**Baseline:** `main = origin/main = a07b71802d34542fc327ba043edd91939b003314`,
working tree clean, confirmed via `git fetch` immediately before this
document was drafted.

---

## Part 1 — Governance Gate Determination

**Question:** what is the minimum governance gate this change requires,
before any code is written?

**Governing artifact already in force:**
[`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
— Frozen, Specification → Implementation authorized. §13 explicitly and
deliberately lists, as an open Implementation-Task-level item, not a
settled Product Architect decision:

> *"Exact stale-draft UI copy/resume-or-discard interaction pattern."*

§6 (the Decision 38 amendment) separately establishes, as an already-
accepted, general requirement:

> *"Protection against stale/out-of-order autosave writes within one
> active session... an older autosave write must never be permitted to
> silently overwrite newer entered content because of asynchronous or
> out-of-order completion between two ordinary, pre-finalization
> autosave writes."*

**Finding:** both halves of this change are already inside existing,
signed governance:
1. Adding a genuine confirmation step before "Começar de Novo" discards
   the draft is precisely the resume-or-discard interaction pattern §13
   left open for later resolution — not a new business rule, and not a
   reversal of anything already decided.
2. Sequencing the discard's delete safely against the next autosave
   (closing the F4 race identified in the prior investigation) is the
   *same class* of stale/out-of-order-write protection §6 already
   requires — this fix extends that already-accepted principle to a
   write path (`clearPeriodicStockDraft`) the original Decision 38 work
   did not itself track, rather than establishing a new principle.

**Explicitly not implicated:** the singleton `stockCountDrafts/periodic`
document shape (§13's *other* open item) is untouched — this change
keeps exactly one draft document, exactly as today. No storage location
is added. This is not the Goal-2/multi-draft direction the prior
investigation explicitly separated out and did not recommend.

**Determination:**
- **No new BDR** — no business decision is being made or reversed.
- **No Specification Amendment** — this resolves an already-open §13
  item using a mechanism (a confirmation step) and a protection
  (write-sequencing) both already anticipated by the existing
  Specification's own text; nothing in it needs to change.
- **A short Rule 8 Assessment** (this document, Part 2) — appropriate
  given the change touches a real, currently-unprotected write-race
  (F4), even though the UI portion alone would arguably not need one.
- **A short Implementation Plan** — proportionate to scope (Part 3).
- **A signed Implementation Authorization** — required before any code
  change, per this project's standing discipline for every code change,
  however small (Part 4 — not yet signed).

**Minimum gate: Rule 8 → Implementation Plan → Implementation
Authorization. No BDR, no Specification Amendment.**

---

## Part 2 — Rule 8 Assessment

### 2.1 Objective

Determine whether the two changes — (a) a genuine confirmation step
before discard, (b) safe sequencing of the delete against the next
autosave — are technically sound, fully bounded, and buildable against
the current codebase, without introducing new storage, schema, or
multi-draft support.

### 2.2 Current-System Evidence (re-verified fresh against `a07b718`)

- `handleDiscardDraft` (`PeriodicStockCountView.tsx` ~1651–1661):
  ```js
  const handleDiscardDraft = async () => {
    setDraftBannerDismissed(true);      // synchronous — blank form renders immediately
    submissionIdRef.current = null;
    try {
      await clearPeriodicStockDraft();  // async deleteDoc, still in flight
    } catch { /* best-effort */ }
  };
  ```
  `setDraftBannerDismissed(true)` fires **before** the delete is awaited
  — the blank form (and every input that can trigger a fresh autosave)
  is reachable while the delete is still in flight. This is F4's exact
  mechanism, confirmed unchanged at this baseline.
- `scheduleDraftSave` (~917–987) already awaits `draftInFlightSaveRef.current`
  — a prior *autosave* write — before issuing its own next write
  (Decision 38's existing stale-write protection). **It has no awareness
  of `clearPeriodicStockDraft`'s delete at all** — that operation is not
  tracked by `draftInFlightSaveRef`, `identityWriteRef`, or
  `flushInFlightSaveRef`, the three refs that exist today. This is a
  fourth, untracked async write path racing the other three.
- The stale-draft banner (~2580–2634) renders exactly two buttons today
  — **Retomar Contagem** (`handleResumeDraft`) and **Começar de Novo**
  (`handleDiscardDraft`) — with no intermediate confirmation state.
- `draftHasMeaningfulContent`/`draftDecisionPending` gate which screen
  renders; both are read-only checks, unaffected by anything in this
  fix.
- No test file references `handleDiscardDraft`, `clearPeriodicStockDraft`,
  or "Começar de Novo" today — confirmed by direct search across every
  `.test.ts` file. This is currently untested surface.

### 2.3 Findings

**Finding 1 — Confirmation step (Option B).** Introduce an explicit
second UI state between the existing banner and the actual discard:
clicking "Começar de Novo" transitions to a confirmation state with
exactly two actions — **Cancelar** (returns to the original two-button
banner, `handleDiscardDraft` never called, draft completely untouched)
and **Começar Nova Contagem** (the actual, now-deliberate trigger for
discard). `handleResumeDraft`/"Retomar Contagem" is untouched — it
remains reachable directly from the original banner at all times,
including from the new confirmation state (so a change of mind can
still resume instead of confirming discard). **Severity: MINOR,
Rule-8-resolvable.** Pure UI-state addition (one new boolean/enum local
state), no data-layer change.

**Finding 2 — Sequencing the delete before the next autosave can fire
(F4).** The minimal, correct fix: reorder `handleDiscardDraft` so the
delete is awaited **before** `setDraftBannerDismissed(true)` runs,
rather than after. This closes the race by construction — the blank
form (and therefore any input capable of scheduling a new autosave)
cannot render until the singleton document is confirmed gone. This
reuses the exact same "await, then reveal" pattern already established
by `!periodicStockDraftLoaded`'s own loading screen (~2588–2596) for the
analogous "we don't know yet" case — no new mechanism, no new ref, no
new write-tracking infrastructure. **Severity: MINOR, Rule-8-resolvable.**
A brief loading state ("A apagar contagem anterior..." or equivalent
copy) is needed for the — typically sub-second — window while the
delete is in flight, mirroring the existing loading-copy precedent
exactly.

**Finding 3 — No schema, storage, or singleton-shape change.**
Confirmed: neither Finding 1 nor Finding 2 touches `PeriodicStockDraft`,
`stockCountDrafts/periodic`'s document id, `savePeriodicStockDraft`,
`clearPeriodicStockDraft`'s own signature, or any Firestore rule/index.
The singleton model is fully preserved, exactly as instructed.

**Finding 4 — Retomar Contagem is unaffected.** `handleResumeDraft` is
not modified by either Finding — it remains reachable from both the
original banner and (per Finding 1) the new confirmation state, and its
own logic is untouched.

### 2.4 Data Model / Security / Index Impact

None. No field added, removed, or renamed anywhere. No `firestore.rules`
or `firestore.indexes.json` change — confirmed neither finding writes,
reads, or restructures anything beyond the existing single document
path and existing local component state.

### 2.5 Testing Requirements

- A test proving the discard path cannot be reached from a single click
  — i.e., that `handleDiscardDraft`/`clearPeriodicStockDraft` is only
  reachable after the new confirming action, not the first click.
- A test proving "Cancelar" returns to the original banner state without
  ever invoking `clearPeriodicStockDraft`.
- A test proving `handleResumeDraft`/"Retomar Contagem" remains callable
  and unmodified from both banner states.
- A test proving the reordered `handleDiscardDraft` awaits the delete
  before flipping `draftBannerDismissed` (closing F4) — a structural/
  source-order assertion, matching this repository's own established
  no-DOM-harness convention (e.g. `periodic-stock-interruption-durability.test.ts`'s
  own approach to proving await-ordering from source).
- Full regression pass: `periodic-stock-interruption-durability.test.ts`,
  `periodic-stock-finalization.test.ts`, and any other suite touching
  `scheduleDraftSave`/`draftInFlightSaveRef` must continue passing
  unmodified — none of their own logic is touched.

### 2.6 Risks

- The confirmation copy/wording itself is a small remaining product
  decision (not fixed by this assessment) — left to the Implementation
  Plan/task to phrase, consistent with §13's own "exact UI copy... left
  open" framing.
- The brief loading window during Finding 2's delete must be handled
  gracefully (no flash of blank content, no possibility of a second
  click re-triggering the delete mid-flight) — a normal, small
  implementation-care item, not a design risk.

### 2.7 Explicitly Out of Scope

Retomar Contagem's own logic; autosave debounce timing; finalization;
Initial Stock in any respect; any multi-draft, second-storage-location,
or retention-policy mechanism; any Firestore rule or index; any change
to `PeriodicStockDraft`'s schema.

### 2.8 Verdict

**READY.** Both findings are small, fully bounded, reuse only existing
patterns already present in this file, and require no new Product
Architect business decision — the governing Specification already
anticipated exactly this resolution at §13/§6.
