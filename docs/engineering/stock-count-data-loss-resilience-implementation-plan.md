Implementation Plan

# Implementation Plan — Contagem Draft Data-Durability and Interruption Resilience (Decision 38)

**Type:** Governance bridge document — translates a READY-FOR-IMPLEMENTATION
Rule 8 Assessment and its amended Implementation Task into a concrete,
file-by-file, dependency-ordered engineering execution plan, ready for
Implementation Authorization sign-off. Does not itself authorize
implementation and does not modify code.

**Status:** Draft — pending Implementation Authorization (separate,
not-yet-created document).

**Governing chain:** [Decision 38](../specs/BDR-pending-business-worth-evolution-measurement-model.md)
("Contagem Draft Data-Durability and Interruption Resilience —
Extension of Decision 29", APPROVED AND SIGNED) → [Stock Count
Data-Loss Resilience Specification](../specs/stock-count-data-loss-resilience-specification.md),
as amended (commit `781fbfc`, §5, §6, §12, §13, §14) → [Rule 8
Assessment](./stock-count-data-loss-resilience-rule8-assessment.md)
(✅ **READY FOR IMPLEMENTATION**, commit `570bb2b` — no remaining
Product Architect decision) → [Implementation Task](../specs/stock-count-data-loss-resilience-implementation-task.md),
as amended (commit `19c7fa7`, §4c, §5a, §5b, §5c, §6b, §7 items 7–15,
§8 extension, §10) → **THIS Implementation Plan** → *(next: a
supplementary Implementation Authorization — not this document)*.

**Repository state at this revision:** `main = origin/main =
19c7fa7443cdf6f450b0cdec539d5d941acd066b`, working tree clean. HEAD is
the Implementation Task Amendment commit itself. Nothing has been
modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or `tests/` to produce this
document.

**This document does not:** modify Decision 38, the amended
Specification, the Rule 8 Assessment, the amended Implementation Task,
`firestore.rules`, `firestore.indexes.json`, `package.json`, or any
application or test code. It does not itself constitute Implementation
Authorization — that is a separate, explicitly gated document, not yet
drafted, which itself would remain unsigned until Product Architect
sign-off. It does not redesign any part of the already-governed
mechanism; every element below is a direct translation of the amended
Implementation Task's §4c/§5a/§5b/§5c/§6b, not a new decision.

**No duplicate:** no existing Implementation Plan for this capability
was found in `docs/engineering/` prior to this document (confirmed by
directory listing, this session).

---

## 1. Purpose

This Plan converts the amended Implementation Task's five Decision-38
resolutions — §4c (interruption-durability flush joining the
resurrection-protection discipline), §5a (the combined flush +
Firestore-persistent-local-cache mechanism), §5b (durable
`newProductInfo` draft content), §5c (stale/out-of-order autosave-write
serialization), and §6b (the resulting file-by-file additions) — into
an exact map of which files change, in what order, and how each new
acceptance criterion (Implementation Task §7 items 7–15) is satisfied.
It introduces no new business decision, no new technical direction
beyond what the Rule 8 Assessment already adopted, and commits no
code.

## 2. Scope Enumeration

### 2.1 In Scope

1. **Firestore initialization change** (`apps/tenant/src/lib/firebase.ts`):
   replace `getFirestore(app)` / `getFirestore(app, databaseId)` with
   `initializeFirestore(app, { localCache: persistentLocalCache({
   tabManager: persistentMultipleTabManager() }) }, databaseId)`,
   preserving the existing conditional `databaseId` argument
   unchanged. App-wide by construction (Implementation Task §5a item
   3) — no other exported value from this file changes.
2. **Draft schema addition** (`apps/tenant/src/types.ts`):
   `PeriodicStockDraft` gains one new optional field,
   `newProductInfo?: Record<string, { purchaseUnit: string;
   purchaseCost: string; relationshipSteps: { unit: string; factor:
   string }[] }>` — structurally identical to
   `PeriodicStockCountView.tsx`'s existing in-memory `newProductInfo`
   `useState` shape (Implementation Task §5b). No change to
   `PeriodicStockDraftItem` or any other exported type in this file.
3. **`savePeriodicStockDraft` extension** (`apps/tenant/src/context/AppContext.tsx`):
   accept an optional `newProductInfo` parameter, conditionally spread
   into the written `PeriodicStockDraft` document, never assigned the
   literal value `undefined` (matching this function's own existing
   conditional-spread discipline for `label`/`submissionId`).
4. **Stale/out-of-order autosave-write serialization**
   (`apps/tenant/src/components/PeriodicStockCountView.tsx`,
   `scheduleDraftSave`'s debounce-timer callback): before issuing its
   own `savePeriodicStockDraft` call, await
   `draftInFlightSaveRef.current` if set (Implementation Task §5c). No
   change to `savePeriodicStockDraft`'s own `setDoc` shape; no new
   schema field.
5. **`newProductInfo` plumbing through the ordinary autosave and
   resume paths** (`PeriodicStockCountView.tsx`): `scheduleDraftSave`'s
   signature and every one of its existing call sites
   (`updateCatalogRow`, `handleRemoveCatalogRow`,
   `handleRestoreCatalogRow`, `handleAddManualRow`,
   `handleRemoveManualRow`, the type/label/date change handlers) pass
   the current `newProductInfo` state through; `handleResumeDraft`
   additionally restores `newProductInfo` from
   `periodicStockDraft.newProductInfo` (defaulting to `{}` when
   absent) into component state on "Retomar" (Implementation Task
   §5b).
6. **Interruption-durability flush** (`PeriodicStockCountView.tsx`):
   a new `flushInFlightSaveRef` ref, a new `flushPeriodicDraftNow()`
   function (cancels any pending debounce, then issues an immediate
   `savePeriodicStockDraft` call carrying live catalog/manual rows and
   `newProductInfo`, tracked in `flushInFlightSaveRef`), and a new
   `useEffect` registering `visibilitychange` (fires on
   `document.visibilityState === 'hidden'`) and `pagehide` listeners
   that call it (Implementation Task §4c, §5a item 1).
7. **Finalization-safety integration** (`PeriodicStockCountView.tsx`,
   `handleConfirmSave`): extend the existing three-step cancel/await
   sequence with a fourth, ordered step — `if
   (flushInFlightSaveRef.current) await flushInFlightSaveRef.current`
   — appended after the existing three and before `recordStockCount`
   is called (Implementation Task §4c).
8. **Tests**: per §7 below, mapped 1:1 to the Implementation Task's
   own §7 items 7–15.

### 2.2 Explicit Exclusions

Carried forward verbatim from the amended Specification's §12
Non-Goals and the amended Implementation Task's §8 (including its own
Decision 38 extension) — none invented here:

- Any change to `InitialStockCountView.tsx` or `saveInitialStockDraft`
  — zero code changes; its existing `flushDraftNow`/`visibilitychange`/
  `pagehide` implementation remains design precedent only, never
  shared code.
- Any shared-hook or shared-utility extraction between the initial and
  periodic draft mechanisms.
- Any change to `firestore.rules` — the existing
  `stockCountDrafts/{draftId}` block (currently lines 1157–1165,
  re-verified fresh this session) already covers a document carrying
  the additional `newProductInfo` field with zero rule-text changes.
- Any change to `firestore.indexes.json` — no new query pattern is
  introduced; the periodic draft remains a single-document read/write
  by fixed id, exactly as today.
- Any change to `addMultipleStockBatches`/`purchaseDrafts`.
- Any change to `recordStockCount`'s semantics, confirmed `StockCount`
  semantics, Business Worth calculation, or FR-34's draft/confirmed
  valuation boundary — every mechanism in §2.1 above operates
  exclusively on the unconfirmed periodic draft.
- Any authorization of multi-user or multi-device collaborative
  editing of the same periodic draft — `persistentMultipleTabManager`
  coordinates Firestore's local cache across multiple tabs of the
  *same user's own browser/device only* (restated at §6 below).
- Any router-level or global "unsaved changes" navigation guard beyond
  the narrow Contagem-draft flush in §2.1 item 6.
- Any new component-test harness (jsdom/testing-library/React-DOM) —
  every test in §7 below uses either the existing
  source-level-regression tier or the existing Firestore-emulator
  tier.
- Any representation of the system as providing a mathematically
  absolute zero-data-loss guarantee (§8 below).
- Any new business rule beyond BDR-0009, the Simplification Amendment,
  and Decision 37/38 themselves.

## 3. File-by-File Plan

**Primary application files expected to change:**

| File | Change |
|---|---|
| `apps/tenant/src/lib/firebase.ts` | §2.1 item 1 — `initializeFirestore` + `persistentLocalCache` + `persistentMultipleTabManager` |
| `apps/tenant/src/types.ts` | §2.1 item 2 — `PeriodicStockDraft.newProductInfo?` addition |
| `apps/tenant/src/context/AppContext.tsx` | §2.1 item 3 — `savePeriodicStockDraft` signature extension |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | §2.1 items 4–7 — serialization, `newProductInfo` plumbing, flush mechanism, finalization-safety integration |

**Potentially affected test files** (identified separately, per §7
below — none of these are modified by this Plan; they are named here
as the expected implementation-stage targets):

| File | Expected role |
|---|---|
| `tests/periodic-stock-draft-resurrection.test.ts` (existing, from the original Task's §7 items 1–2) | Extended with new source-level assertions for §7 items 7–9 below |
| A new or extended source-level test file for `scheduleDraftSave`'s serialization (§7 item 10) — exact filename an implementation-stage choice, not fixed by this Plan | Source-level guard |
| `tests/periodic-stock-finalization.test.ts` or `tests/firestore-rules.test.ts` (existing) | Extended with emulator-backed round-trip/backward-compatibility assertions for `newProductInfo` (§7 items 11–12) |
| `tests/initial-stock-confirmation.test.ts` (existing) | Run unmodified as a regression gate (§7 item 15) |

**Files that MUST NOT be modified:**

- `apps/tenant/src/components/InitialStockCountView.tsx`
- `firestore.rules`
- `firestore.indexes.json`
- `package.json`
- Any Business Worth calculation file (`businessWorth`,
  `capitalGrowth`, `measuredBusinessWorth`,
  `productValuationTotal`, or equivalent)
- Any Contagem module unrelated to the periodic draft mechanism
  (e.g. `addMultipleStockBatches`, `purchaseDrafts`, cost-basis
  conversion, portion-grouping logic)

**No file beyond the four listed above was found necessary during
this Plan's fresh repository inspection.** The addition of
`apps/tenant/src/types.ts` to the file list — not separately named in
the Implementation Task's own §6/§6b file-by-file plan — is disclosed
explicitly here rather than silently assumed: the Task's §5b describes
the `PeriodicStockDraft` schema addition in prose but does not name
the type-definition file itself, because the Task's own scope (per its
§0) is engineering resolution and file-by-file change *description*,
not exhaustive TypeScript file enumeration. Direct inspection this
session confirms `PeriodicStockDraft` and `PeriodicStockDraftItem` are
declared in `apps/tenant/src/types.ts` (not inline in `AppContext.tsx`
or `PeriodicStockCountView.tsx`), so the interface change belongs
there. This is a file-location clarification, not a scope expansion —
the field being added and its semantics are unchanged from
Implementation Task §5b.

## 4. Acceptance Criterion → Implementation Mapping

| Implementation Task §7 Item | Implementation Element |
|---|---|
| 7. `visibilitychange`/`pagehide` wired to `flushPeriodicDraftNow` | New `useEffect` in `PeriodicStockCountView.tsx`, §2.1 item 6 |
| 8. Flush cancels pending debounce before its own write | `flushPeriodicDraftNow`'s own body clears `draftDebounceTimerRef.current` before calling `savePeriodicStockDraft`, §2.1 item 6 |
| 9. `handleConfirmSave` awaits `flushInFlightSaveRef.current` | Fourth step appended to the existing cancel/await sequence, §2.1 item 7 |
| 10. `scheduleDraftSave`'s timer callback awaits `draftInFlightSaveRef.current` before issuing its own write | §2.1 item 4 |
| 11. `newProductInfo` round-trips through Firestore-emulator write/read | §2.1 items 2–3 (schema + write path); emulator test, §7 below |
| 12. Pre-existing draft without `newProductInfo` reads back with the field absent/empty, no error | §2.1 item 2 (optional field); emulator test, §7 below |
| 13. `initializeFirestore` configured with `localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })`; full existing suite passes | §2.1 item 1; regression run, §7 below |
| 14. Manual private-browsing/IndexedDB-restricted verification | Documented manual step, §7 below — no code change satisfies this criterion by itself |
| 15. `tests/initial-stock-confirmation.test.ts` unaffected, re-confirmed for this amendment | Regression run, §7 below |

## 5. Firestore Rule / Schema / Data-Model Change Inventory

**Schema (additive only):**
- `PeriodicStockDraft.newProductInfo?` (new, optional) —
  `apps/tenant/src/types.ts`. No existing field's shape, meaning, or
  presence requirement changes. No new field on
  `PeriodicStockDraftItem`.

**`firestore.rules`:** no change. The existing
`stockCountDrafts/{draftId}` block (Owner-only at
read/create/update/delete, generic over `{draftId}`) authorizes the
document, not an enumerated field set, and already covers a document
carrying the additional field with zero rule-text changes — the same
reasoning already established for every other optional draft field
(`label`, `submissionId`).

**`firestore.indexes.json`:** no change expected. The periodic draft
remains a single-document read (`stockCountDrafts/periodic`) by fixed
id; `newProductInfo` is never queried, filtered, or sorted on — it is
read and written only as part of the whole-document overwrite/read
this mechanism already performs. To be confirmed against the final
implementation at build time, not re-decided here.

**Firestore client initialization (app-wide, not a schema change but
disclosed here for completeness):** `db`'s construction in
`apps/tenant/src/lib/firebase.ts` changes from `getFirestore(...)` to
`initializeFirestore(...)` with `persistentLocalCache`/
`persistentMultipleTabManager` configured. This affects every
read/write in the tenant app through the same shared `db` instance —
disclosed explicitly, not silently absorbed (§6 below).

## 6. Tenant Isolation, Authorization Boundary, and Multi-User/Multi-Device Verification

- Every schema addition remains scoped under the existing
  `businesses/{businessId}/stockCountDrafts/periodic` path — no new
  top-level or cross-tenant-readable collection is introduced.
- The Owner-only authorization tier (`isOwnerOf`) enforced by the
  existing `stockCountDrafts/{draftId}` rule block is unchanged and
  unaffected by this Plan's schema addition — no plan element grants
  Manager or Staff any new read or write path.
- **`persistentMultipleTabManager` does not authorize multi-user or
  multi-device collaboration.** It coordinates Firestore's local
  cache across multiple tabs of the *same user's own browser/device
  only*. This terminology caveat (Rule 8 Assessment Finding E1,
  Implementation Task §8 extension) is carried into every place this
  mechanism is implemented, commented, or documented at implementation
  time.
- **App-wide Firestore-instance configuration, explicitly disclosed
  again here:** enabling `persistentLocalCache` on the single shared
  `db` instance is, by the nature of the Firestore Web SDK's
  initialization API, an app-wide setting — there is no SDK-level way
  to scope it to Periodic Contagem alone. This is a disclosed,
  accepted consequence of Decision 38 item (c)'s own authorization,
  not an unreviewed side effect, and is why §7 item 8 below (full
  existing regression suite, both tiers, unmodified) is a required
  gate rather than an optional check.
- No plan element weakens the existing unconditional Owner-only tier
  anywhere in `firestore.rules`; the entire mechanism is additive
  alongside it.

## 7. Testing Requirements

Directly carried from the Implementation Task's own §7 items 7–15,
made concrete and explicitly tiered — no new test harness is
introduced at any tier:

**Source-level regression guards** (same `readFileSync` +
string/regex-assertion technique as the existing
`tests/periodic-stock-draft-resurrection.test.ts`):
1. `PeriodicStockCountView.tsx` registers both a `visibilitychange`
   listener (gated on `document.visibilityState === 'hidden'`) and a
   `pagehide` listener, both calling `flushPeriodicDraftNow` (item 7).
2. `flushPeriodicDraftNow`'s own body contains
   `clearTimeout(draftDebounceTimerRef...)` before its
   `savePeriodicStockDraft(...)` call (item 8).
3. `handleConfirmSave` contains `await
   flushInFlightSaveRef.current` before the call to
   `recordStockCount`, as a fourth, distinct assertion alongside the
   three the existing resurrection test already checks for §4a/§4b
   (item 9).
4. `scheduleDraftSave`'s debounce-timer callback contains `await
   draftInFlightSaveRef.current` before its own
   `savePeriodicStockDraft(...)` call (item 10).

**Firestore-emulator-backed tests** (same emulator harness as
`tests/firestore-rules.test.ts` / `tests/periodic-stock-finalization.test.ts`):
5. A draft written with a populated `newProductInfo` reads back with
   that field unchanged, byte-for-byte (item 11).
6. A draft written *without* `newProductInfo` (simulating a
   pre-amendment draft) reads back with the field correctly
   absent/empty, not erroring, and is fully resumable (item 12).

**Firebase initialization verification** (source inspection +
regression run):
7. `apps/tenant/src/lib/firebase.ts` calls `initializeFirestore` with
   `localCache: persistentLocalCache({ tabManager:
   persistentMultipleTabManager() })` (item 13, source half).

**Full regression sweep** (both existing tiers, unmodified):
8. The complete existing test suite — every source-level-regression
   file and every Firestore-emulator-backed file — passes unmodified
   after the `lib/firebase.ts` change, since every existing test
   exercises the same shared `db` instance (item 13, regression half;
   item 15).
9. `tests/initial-stock-confirmation.test.ts` specifically confirmed
   unaffected, named separately per item 15's own reasoning: it is now
   exercised against a `db` instance configured differently than when
   it was originally written.

**Manual/documented verification** (not automatable at either existing
tier, per the Implementation Task's own standing constraint against
new test infrastructure):
10. Private-browsing/IndexedDB-restricted behavior does not crash the
    application — the SDK's documented fallback (fail open to
    memory/network-only operation) is directly observed, not merely
    assumed (item 14).

## 8. Residual Physical Limitation

**Preserved unweakened, exactly as the Rule 8 Assessment and the
amended Implementation Task (§5a item 4) state it:** if an
instantaneous power, battery, or blackout event occurs before
JavaScript executes at all, and before the specific edit in question
has been locally enqueued — i.e., neither the ordinary debounce nor
the interruption flush has yet fired for that edit — no client-side
web mechanism, including the combined mechanism this Plan implements,
can guarantee recovery of that edit. This is a physical limitation of
the browser/JavaScript execution model, not an engineering shortfall
of this Plan. **No code, UI text, log message, or documentation
produced under this Plan may represent the system as providing a
mathematically absolute zero-data-loss guarantee.** The engineering
goal, stated precisely, is to minimize the loss window and to protect
every interruption scenario the browser/SDK can technically protect —
accidental navigation, tab/app closure, refresh/reload, and
connection loss via the flush; content already locally enqueued before
a crash, including most hard-power-loss cases where the device itself
survives and reopens the app, via the persistent local cache — not to
close the irreducible case above.

## 9. Risks Carried Forward From the Rule 8 Assessment

- **App-wide Firestore-initialization blast radius** (Rule 8 Finding
  A1, §8/§12): the single highest-blast-radius change in this Plan.
  Mitigated by sequencing it first in §10 below and gating every
  subsequent step on a clean full-regression run against it in
  isolation, before any feature-specific code is layered on top of the
  same shared `db` instance.
- **Resurrection-shaped defect against the new flush write path**
  (Rule 8 Finding C1): the flush introduces a genuinely new
  pending-write handle; if it is not joined to the existing §4a/§4b
  cancel/await discipline, the same class of bug the Initial Count
  workflow already has (Specification §2) could recur against this new
  path. Mitigated by making the finalization-safety integration
  (§2.1 item 7) an explicit, separately-tested step (§7 item 9), not
  an assumed consequence of adding the flush.
- **Browser-lifecycle-event reliability, not uniform across browsers**
  (Rule 8 Assessment §10 failure-mode table): `visibilitychange`/
  `pagehide` are preferred over `beforeunload` precisely because some
  browsers (notably older mobile Safari) do not reliably fire the
  latter — but even the preferred pair is not universally guaranteed
  by every browser in every circumstance. The combined mechanism's
  floor is never worse than today; its ceiling depends on browser
  reliability, stated honestly per §8 above rather than assumed
  uniform.
- **Firestore local cache unavailable/restricted (private browsing)**
  (Rule 8 Assessment §10): the SDK's documented behavior is to fail
  open (memory/network-only), not to throw — but this must be directly
  observed during implementation (§7 item 10), not assumed from SDK
  documentation alone, since no existing test tier in this repo can
  simulate that browser condition.

## 10. Implementation Order

Determined from the actual current code state (re-verified fresh this
session against `origin/main` at `19c7fa7`) and the dependency
relationships among the changes in §2.1 — not a generic template
ordering. The single highest-blast-radius, most isolated change is
sequenced first so it can be fully regression-verified in isolation
before any feature-specific code is layered onto the same shared `db`
instance; content-schema work precedes the write paths that need to
carry it; the flush mechanism is built only once the content it must
carry already exists, so it is correct from its first version rather
than requiring rework.

| Step | File | Function/Area | Purpose | Depends on | Invariant Protected | Verification |
|---|---|---|---|---|---|---|
| 1 | `apps/tenant/src/lib/firebase.ts` | `db` construction | Enable `persistentLocalCache`/`persistentMultipleTabManager` via `initializeFirestore` | Nothing (isolated, app-wide) | None yet introduced — this step is itself the highest-risk, most isolated change | §7 item 7 (source); §7 item 8 (full existing regression suite, run immediately, before any further step) |
| 2 | `apps/tenant/src/types.ts` | `PeriodicStockDraft` interface | Add optional `newProductInfo` field | Step 1 complete and regression-clean (sequencing only — no functional coupling) | Backward compatibility (absent field on old drafts) | Type-check (`tsc --noEmit`); no runtime test yet, content is unused until Step 3 |
| 3 | `apps/tenant/src/context/AppContext.tsx` | `savePeriodicStockDraft` | Accept and conditionally spread `newProductInfo` | Step 2 (field must exist on the type) | Never write literal `undefined` (Firestore rejects it) | §7 item 5 (emulator round-trip), item 6 (backward compatibility) |
| 4 | `apps/tenant/src/components/PeriodicStockCountView.tsx` | `scheduleDraftSave` call sites; `handleResumeDraft` | Pass `newProductInfo` through ordinary autosave; restore it on Retomar | Step 3 (signature must accept it) | Draft content is additive, not a second content path (Implementation Task §5b) | §7 item 5, item 6 |
| 5 | `PeriodicStockCountView.tsx` | `scheduleDraftSave`'s debounce-timer callback | Await `draftInFlightSaveRef.current` before issuing the next write (stale/out-of-order serialization) | Existing `draftInFlightSaveRef` (already present); independent of Steps 2–4's content but touches the same function, sequenced immediately after to consolidate edits | Latest state wins within one session, without a version field | §7 item 4 (source-level guard) |
| 6 | `PeriodicStockCountView.tsx` | New: `flushInFlightSaveRef`, `flushPeriodicDraftNow()` | Implement the immediate, cancel-then-write flush, carrying live catalog/manual rows and `newProductInfo` | Steps 3–4 (flush must carry `newProductInfo` from its first version, not be reworked later) | Flush write is safe to discard on ordinary confirm (finalization never reads the Firestore draft) | §7 item 2 (source-level guard: cancel-before-write) |
| 7 | `PeriodicStockCountView.tsx` | New `useEffect` | Wire `visibilitychange`/`pagehide` to `flushPeriodicDraftNow()` | Step 6 (function must exist) | Flush actually fires on the interruption scenarios Decision 38 item (a) names | §7 item 1 (source-level guard) |
| 8 | `PeriodicStockCountView.tsx` | `handleConfirmSave` | Extend the existing three-step cancel/await sequence with a fourth step awaiting `flushInFlightSaveRef.current` | Step 6 (ref must exist) — this is the critical finalization-safety integration, Implementation Task §4c | No draft-write path can recreate `stockCountDrafts/periodic` after finalization (the exact resurrection defect, Specification §2) | §7 item 3 (source-level guard) — the single most safety-critical test in this Plan |
| 9 | Tests (per §7 table above) | New/extended source-level and emulator test files | Add/extend the seven automated checks (§7 items 1–4 source-level, items 5–6 emulator) | Steps 1–8 (code under test must exist) | Every acceptance criterion in Implementation Task §7 items 7–13 is proven, not merely asserted | Full targeted test run |
| 10 | N/A — process step | N/A | Run the full existing regression suite (both tiers) a second time, now against the completed feature | Step 9 | No regression anywhere in the existing suite, including `tests/initial-stock-confirmation.test.ts` | §7 items 8–9 |
| 11 | N/A — process step | N/A | Manual private-browsing/IndexedDB-restricted verification | Step 1 (the mechanism being verified must exist) | App does not crash under a restricted-storage condition | §7 item 10 |
| 12 | N/A — process step | N/A | Final scope audit: confirm `InitialStockCountView.tsx`, `firestore.rules`, `firestore.indexes.json`, `package.json`, and every Business Worth file remain untouched | Steps 1–11 | Every §2.2 exclusion held throughout implementation | `git diff --stat` against the full working tree |

## 11. Traceability

| New requirement | Decision 38 | Amended Specification | Rule 8 Assessment | Amended Implementation Task | This Plan |
|---|---|---|---|---|---|
| Firestore persistent local cache | (a), (c) | §6, §12, §13 | §1, §5 Finding A1, §7, §8 | §5a item 2 | §2.1 item 1, §10 step 1 |
| App-wide scope, disclosed | (c) | §12 | §8, §12 | §5a item 3 | §5, §6, §9 |
| Residual physical limitation, disclosed | (a) | §6 | §7, §10 | §5a item 4 | §8 |
| Interruption-durability flush (mechanism, wiring) | (a), (c) | §6, §13 | §5 Finding A1, §7, §11 | §4c, §5a item 1 | §2.1 items 6–7, §10 steps 6–7 |
| Flush joins §4a/§4b cancel/await discipline | (a), (e) | §6 | §5 Finding C1, §9 | §4c | §2.1 item 7, §10 step 8, §9 |
| `newProductInfo` durable draft content | (b) | §5, §14 item 7 | §5 Finding B1, §8 | §5b | §2.1 items 2–5, §10 steps 2–4 |
| Stale/out-of-order autosave-write serialization | (d) | §6, §14 item 8 | §5 Finding D1, §6 | §5c | §2.1 item 4, §10 step 5 |
| Multi-user/multi-device exclusion, restated | (f) | §5 (unchanged) | §5 Finding E1, §9, §12 | §8 extension | §6 |
| Initial Stock exclusion, restated | — | §12 (unchanged) | §12 | §8 extension | §2.2, §3 |
| Business Worth boundary, restated | (e) | §1a, §3 (unchanged) | §12 | §8 extension | §2.2 |
| Additional acceptance criteria | (a), (b), (d) | §14 items 7–8 | §11 | §7 items 7–15 | §4, §7 |

No new requirement above lacks a Decision 38 item, an amended
Specification section, a Rule 8 Assessment section/finding, an
amended Implementation Task section, and a corresponding element of
this Plan.

## 12. Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3 and this repository's
established Rule 8 process: this Plan is the Implementation Plan
stage. The next step is a separate Implementation Authorization
document, presented for Product Architect signature. **No code,
`firestore.rules`, `firestore.indexes.json`, `package.json`, or test
file has been created, modified, or committed to produce this Plan.**

**Lifecycle:** Drafted (this document) → Implementation Authorization
(not yet drafted) → Product Architect sign-off → Implementation. Not
yet authorized. Not implemented.
