Rule 8 Assessment — FINAL

# Rule 8 Assessment — Periodic Contagem Interruption Persistence and Recovery Parity (Decision 58)

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** This document does
not authorize implementation. A separate Implementation Plan and a
signed Implementation Authorization remain required, subsequent gates.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 41 amendment](../specs/stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted and Authorized, implemented — Finding C: bounded
retry/classification for the per-row path) → [Decisions 44–56](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
(✅ Accepted and Authorized, implemented — shared live data, conflict
semantics) → [Decision 57 amendment](../specs/stock-count-data-loss-resilience-decision-57-amendment.md)
(✅ Accepted, governance requirements only) → [Decision 58 amendment](../specs/stock-count-data-loss-resilience-decision-58-amendment.md)
(✅ **ACCEPTED — GOVERNANCE REQUIREMENTS ONLY** — SABUSHIMIKE MASCENI,
Product Architect, 5 September 2026, acceptance commit `0c4e039cde432d859aef5cd75b4722911d9c1e57`)
→ **this assessment** → (next: Implementation Plan, then Implementation
Authorization — neither exists yet).

**Baseline:** `main = origin/main = 0c4e039cde432d859aef5cd75b4722911d9c1e57`,
working tree clean, confirmed via `git fetch` immediately before this
assessment began. No conflicting "Decision 58" reference exists
anywhere else in the repository. The Decision 41 and Decision 44 Rule 8
Assessments are confirmed unmodified at this baseline (`git log -1`
against each returns their pre-existing commits, unchanged by this
task).

**Scope of this assessment:** exactly the mechanism Decision 58
accepted — routing `flushPeriodicDraftNow`'s interruption-triggered
persistence through `performRowSaveAttempt`/`savePeriodicStockDraftItem`
for each currently-dirty row, in place of the current
`flushPeriodicStockDraftRows` `WriteBatch` call. Not in scope: any
change to the per-row mechanism itself, any change to
`firestore.rules`, any change to Decision 55's conflict semantics, any
change to Decision 57 or Finding K, and any implementation-detail
choice (exact loop structure, whether `flushPeriodicStockDraftRows` is
deleted or retained) — those remain for the Implementation Plan.

---

## A. Verification That the Assessed Text Matches the Signed Decision

Read fresh from the repository this session, not from memory of the
proposal. Confirmed directly against
`docs/specs/stock-count-data-loss-resilience-decision-58-amendment.md`:

- §4 ("Decision"): the accepted requirement is exactly *"invoke the
  existing, already-governed per-row save mechanism
  (`performRowSaveAttempt`, and therefore `savePeriodicStockDraftItem`)
  for each currently-dirty row, rather than issuing a separate
  `WriteBatch` through `flushPeriodicStockDraftRows`"* — Option A, as
  proposed, with no discrepancy against the copy this assessment was
  given.
- §3 records the corrected findings (Finding 1 confirmed; Finding 2
  corrected — `firestore.rules` already prevents the `CONFLICT`→
  `ACCEPTED` bypass; the poison-batch effect is the real adjacent
  issue) and §4 explicitly folds the poison-batch resolution into the
  same accepted mechanism, not as a separate fix.
- §9 ("Status"): ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY, signed
  SABUSHIMIKE MASCENI, 5 September 2026, and explicitly states Rule 8
  is "not yet assessed... a NEW Rule 8 Assessment is required."

**Verified: this assessment addresses exactly the accepted text, with
no discrepancy found.**

---

## B. Current Implementation, Re-Traced Fresh at This Baseline

Re-confirmed directly against `apps/tenant/src/components/PeriodicStockCountView.tsx`
and `apps/tenant/src/context/AppContext.tsx` at commit `0c4e039` (the
application code itself is unchanged since the acceptance commit, which
touched only the new decision file):

- **`performRowSaveAttempt`** (`PeriodicStockCountView.tsx:1734`):
  `runTransaction`-backed via `savePeriodicStockDraftItem`, gated by
  `belongsToCurrentGeneration()` both before and after awaiting
  `draftInFlightSaveRef.current`, routes failures through
  `classifyDraftSaveError`, schedules bounded retry via
  `nextRetryDelayMs` (1s/2s/4s), and registers exhausted/unknown
  failures in `manualRetryEligibleRowsRef`.
- **`flushPeriodicDraftNow`** (`PeriodicStockCountView.tsx:2373`):
  currently cancels every debounce timer and every pending retry
  (`cancelAllRowRetries()`), then issues one `flushPeriodicStockDraftRows`
  batch write of **every** row in `catalogRows`/`manualRows`, with a
  bare `.catch(() => setDraftSaveState('save-failed'))` — this is the
  exact code Decision 58 requires changed.
- **`rowRetryRef`, `draftInFlightSaveRef`, `manualRetryEligibleRowsRef`,
  `rowDebounceTimersRef`** (`PeriodicStockCountView.tsx:1189-1254`): all
  `useRef`. Confirmed: none are cleared by React on unmount — the only
  code that clears them today is `cancelAllRowRetries()`/the debounce
  loop inside `flushPeriodicDraftNow` itself, called explicitly from the
  unmount cleanup effect. A `setTimeout` scheduled against these refs
  (e.g. a pending 1s/2s/4s retry) is a plain runtime timer, not tied to
  React's component lifecycle, and continues to fire on schedule even
  after the owning component has unmounted, so long as nothing
  explicitly cancels it first.
- **`savePeriodicStockDraftItem`** (`AppContext.tsx:6588`):
  `runTransaction`, refuses to write over a server-side `CONFLICT` row
  (`AppContext.tsx:6624-6628`, throws before any write), gated by
  `isActiveContagemEditor`.
- **`flushPeriodicStockDraftRows`** (`AppContext.tsx:6857`): plain
  `WriteBatch`, no transaction, no per-row conflict check at the
  application layer — relies entirely on `firestore.rules`' own
  per-document rule evaluation for the protection described in §D
  below.
- **`firestore.rules`** (`firestore.rules:1448-1503`): the
  `stockCountDrafts/periodic/items/{rowKey}` `update` grant accepts
  exactly three branches (ACCEPTED→ACCEPTED with `rev+1` and
  `lastWriterUid == request.auth.uid`; ACCEPTED→CONFLICT with both
  observations present; CONFLICT→ACCEPTED only when the new `quantity`
  matches one of the two preserved observation values and
  `resolverUid`/`resolvedValue` are correctly populated). Re-confirmed
  unchanged at this baseline.
- **`tests/periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts:361-395`**:
  existing, passing emulator test directly proves a CONFLICT→ACCEPTED
  write with a non-matching value is rejected even when it *does*
  supply `resolverUid`/`resolvedValue` — a stricter payload shape than
  `flushPeriodicStockDraftRows` ever produces. Cited, not re-derived.
- **`handleConfirmSave`** (`PeriodicStockCountView.tsx:4407-4449`):
  before calling `recordStockCount`, explicitly clears every debounce
  timer, calls `cancelAllRowRetries()` (clears every pending retry timer
  **and** empties `rowRetryRef`, so any retry generation check
  afterward is unconditionally false), and awaits
  `draftInFlightSaveRef.current`, `identityWriteRef.current`, and
  `flushInFlightSaveRef.current` in sequence before finalization
  proceeds. This is unchanged by Decision 58 and is the mechanism that
  makes §H's finalization analysis below possible.
- **`recordStockCount`**'s periodic branch (`AppContext.tsx:5069`,
  draft-deletion at `AppContext.tsx:5991-5995`): takes `items` as an
  explicit parameter from live component state — **never reads the
  Firestore draft** — and deletes every `stockCountDrafts/periodic/items/*`
  document plus the meta document in the same atomic batch as the
  `stockCounts` write. Confirmed unchanged.
- **`isFirestorePersistenceActive`** (`firebase.ts`): confirmed active
  via `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
  Unchanged.

---

## C. Purpose-Aligned Findings (per task §3)

**A. Can Option A reuse the existing per-row mechanism without violating
existing governance?** Yes. `performRowSaveAttempt` and
`savePeriodicStockDraftItem` are both already-authorized, already-
implemented functions (Decision 41C, Decisions 44–56). Routing the
flush through them adds a new **caller**, not new logic — no new
authorization surface, no new write shape, no new rule branch is
required.

**B. Does routing through `performRowSaveAttempt` preserve Decisions
38–57?** Yes, assessed individually in §F–§I below and §E for the one
genuine trade-off (batch atomicity).

**C. Does the mechanism create any new risk category?** No new
authorization bypass, tenant-isolation risk, or cache/session leakage
is created (§F, §G). No new conflict-integrity risk is created (§D) —
if anything, the application-layer refusal in
`savePeriodicStockDraftItem` becomes an *additional*, redundant
safeguard alongside the existing rules-layer one. **One genuine,
narrow, bounded finalization-race consideration is newly surfaced by
this assessment** (§H) — not present in the current one-shot flush,
because the current flush has no delayed-retry window for a stale write
to survive in. This is analyzed in full in §H and is not, on its own,
a governance blocker (§H's own conclusion).

**D. Does the loss of batch atomicity introduce a governance problem?**
No — analyzed explicitly and exhaustively in §E. No accepted decision
in this chain requires all-rows-atomicity for the interruption flush
specifically.

---

## D. Conflict Integrity (Decision 55)

Re-verified directly, independent of the prior investigation's
corrected finding, using the rule text and the existing emulator test
cited in §B:

- **Preserved observations, `CONFLICT` creation, `CONFLICT` resolution,
  `openConflictCount`, finalization blocking** — all governed
  exclusively by `savePeriodicStockDraftItem`/`resolvePeriodicConflict`
  and `firestore.rules`, none of which Decision 58 modifies. Routing
  the flush through `performRowSaveAttempt` means interruption-triggered
  writes now go through the **same** transaction that already enforces
  every one of these properties for ordinary edits — this is not a new
  code path being asked to preserve Decision 55, it is the *existing,
  already-verified* code path being used one call site further.
- **Confirmed: Decision 58 does not alter, weaken, or reinterpret
  Decision 55 in any way.** The corrected finding in Decision 58 §3
  item 2 (rules already prevent the bypass) is reconfirmed here as
  still accurate at this baseline — no rule, schema, or transaction
  logic has changed since it was established.

**Verdict for this dimension: PASS.**

---

## E. Poison-Batch Availability and Batch-Atomicity Trade-Off

**Current condition, reconfirmed:** because `WriteBatch.commit()` is
atomic against `firestore.rules` evaluation, one `CONFLICT` row present
in `flushPeriodicStockDraftRows`'s row set today causes the **entire**
batch — every other, unrelated dirty row included — to be rejected.
This is the poison-batch effect Decision 58 §3 item 3 identified.

**Does Option A safely remove this coupling?** Yes. Under Option A,
each dirty row is persisted via its own independent
`performRowSaveAttempt(rowKey, generation, 1)` call and its own
independent transaction. A `CONFLICT` row's transaction throwing
(`AppContext.tsx:6624-6628`) affects only that row's own generation/
retry state (routed to `save-unknown` via `classifyDraftSaveError`,
since the thrown error is a plain `Error`, no Firestore code — matching
the existing documented behavior for this exact case in
`performRowSaveAttempt`'s own `.catch`, `PeriodicStockCountView.tsx:1822-1877`).
No other row's write is coupled to it in any way.

**Does any accepted governance requirement require the interruption
flush to be atomically all-or-nothing?** Searched directly: Decision 38
requires durability of *each* edit, not joint atomicity across edits.
Decision 39a/39b require the interruption mechanism exist and cover
SPA unmount; neither specifies atomicity. Decision 41C's retry/
classification mechanism is itself already per-row, non-atomic across
rows, for the *ordinary* autosave path — Decision 58 asks only that the
interruption path match that existing, already-accepted shape. **No
existing accepted decision requires all-rows-atomicity for the
interruption flush. None is invented here.**

**Does partial persistence introduce a new user-visible or state-
consistency hazard?** Considered explicitly: a scenario where 4 of 5
dirty rows persist immediately and the 5th enters bounded retry (e.g.
transient network blip) is user-visible only through the existing
`draftSaveState` indicator (`saving`/`retrying`/`save-failed`), which
already communicates partial/in-progress state today for the ordinary
per-row path — no new UI concept is required. Firestore's live listener
(`periodicStockDraftItemsByKey`) already reflects rows independently as
each one's write lands, which is the *existing* shared-live-data model
Decision 44 already established — Option A does not change how
partial/in-progress row state is displayed to a second concurrent
viewer, it only changes how many rows can be "in progress" at once
during an interruption specifically, which was already possible during
ordinary editing before this decision.

**Verdict for this dimension: PASS.** The loss of batch atomicity is a
real, named behavior change (correctly flagged as a trade-off in the
Decision 58 proposal this assessment reviewed) but is not a governance
violation, is not user-visible in any new way, and directly resolves
the poison-batch effect as intended.

---

## F. Authorization

- **Owner/Admin authority, delegated Editor authority, Viewer
  restrictions:** all enforced by `isActiveContagemEditor` inside
  `savePeriodicStockDraftItem` (`AppContext.tsx:6595-6597`) and by the
  identical gate in `firestore.rules`' `items/{rowKey}` block. Option A
  introduces no new call site that bypasses this gate — it *removes*
  the one call site (`flushPeriodicStockDraftRows`) that, per the
  original Decision 44 Rule 8 Assessment (§II.2, cited in Decision 58
  §3 background), was flagged years earlier in this project's history
  as "a direct, unconditional write" with no authority check of its
  own beyond `isOwnerOf` at the time that finding was written — Option
  A strictly *tightens* authorization consistency for this call path.
- **Revocation behavior, current business authorization, offline/
  reconnect rules:** unchanged — governed identically to the ordinary
  per-row path today, which this mechanism now literally is.

**Verdict for this dimension: PASS.**

---

## G. Tenant / Business Isolation

- **`businessId` targeting:** `performRowSaveAttempt`/
  `savePeriodicStockDraftItem` read `activeBusinessId` from the
  `AppContext` closure synchronously at call time, exactly as they do
  today for ordinary edits — this is unchanged by routing the flush
  through the same function.
- **Queued-write identity/path behavior:** per Finding K's own
  confirmed conclusion (§B of `finding-k-isolation-mechanism-analysis.md`,
  cited directly, not re-derived): a queued write's path and payload
  are fixed synchronously at issuance time, before any network
  activity — true of `performRowSaveAttempt` today, unchanged by
  Decision 58.
- **Business-switch-specific flush (`flushForSwitchIfNeeded`,
  `PeriodicStockCountView.tsx:2493`) and logout flush-then-clear:**
  confirmed unaffected — these are separate call paths, governed by
  Decision 41A and the Decisions 44–56 Implementation Plan's own
  logout-cleanup item respectively, neither of which Decision 58
  touches or reroutes.

**Verdict for this dimension: PASS.**

---

## H. Finalization

- **Decision 50 exactly-once finalization, finalized immutability
  (Decision 56):** unaffected — `recordStockCount` never reads the
  draft (§B), and the periodic draft's deletion remains atomic with
  the `stockCounts` write (`AppContext.tsx:5991-5997`), unchanged.
- **Stale retry cancellation on finalization, same-device:** confirmed
  fully closed by existing, unmodified code. `handleConfirmSave`
  (§B) calls `cancelAllRowRetries()` — which clears every pending retry
  **timer** and empties `rowRetryRef` — before awaiting every in-flight
  write and only then calling `recordStockCount`. No retry scheduled by
  *this* tab/session can survive past the start of its own
  finalization. This property is unchanged by Decision 58 and already
  fully protects the ordinary per-row retry path; extending the same
  mechanism to the interruption-triggered flush inherits this
  protection identically, for the same-device case.

- **Newly surfaced, genuine, bounded consideration — cross-device stale
  retry after finalization.** This is a real finding this assessment
  is not aware of appearing in any prior document, so it is recorded in
  full rather than summarized away:

  Today, `flushPeriodicDraftNow` is one-shot — an interruption-time
  write either succeeds or fails immediately; there is no delayed retry
  window for a stale write to survive in. Under Decision 58, a
  transient failure occurring *at the moment of interruption* now
  enters the same 1s/2s/4s bounded-retry sequence as an ordinary edit,
  which can remain pending in the tab's memory for up to ~7 seconds —
  and, because `cancelAllRowRetries()` only clears the *local* tab's
  own `rowRetryRef`, this pending retry has no way to learn that a
  **different device or session**, holding valid delegated-Editor or
  Owner/Admin authority (Decision 46/54's own dual-active-editor
  model), finalized the same Contagem in the interim. If that
  finalization's atomic delete (`AppContext.tsx:5991-5995`) completes
  before the stale retry fires, `savePeriodicStockDraftItem`'s
  `tx.get(itemRef)` finds no document, takes the "first write for this
  row" branch (`AppContext.tsx:6630-6640`), and silently recreates an
  orphaned `stockCountDrafts/periodic/items/{rowKey}` document with no
  corresponding meta document.

  **Severity assessment:** this does **not** corrupt the finalized
  `stockCounts` record (finalization never reads the draft, §B) and
  does **not** violate Decision 56's immutability (the finalized
  document itself is never touched). It produces an orphaned,
  storage-only artifact under a deleted draft's path — a data-hygiene
  concern, not a business-correctness or integrity violation. The
  window is bounded (≤7 seconds from the moment of interruption) and
  requires two independently rare events to intersect (a transient
  write failure at the exact moment of navigation, and a
  cross-device finalization within that same narrow window). **This is
  judged an implementation-detail question for the Implementation Plan
  to address (e.g. having the retry path check for the meta document's
  continued existence before resurrecting a row, or accepting the
  orphan as a harmless, cleanable artifact), not a governance
  blocker** — consistent with this task's own instruction not to
  manufacture blockers for implementation-stage questions. It is
  **not** a pre-existing risk this investigation can find already
  documented elsewhere in the repository for the *ordinary* per-row
  retry path at this same magnitude, because ordinary edits don't
  typically have a live retry pending at the exact instant a user
  walks away from the page — interruption is specifically when this
  window opens. **Flagged explicitly as a required verification item**
  (§K).

**Verdict for this dimension: PASS, with one flagged, bounded,
non-blocking finding requiring explicit treatment in the Implementation
Plan (see §K).**

---

## I. Decision 57 Separation

Re-confirmed: Decision 57 governs `stockCounts` (finalized history) and
Clear-All-Data. Decision 58 governs `stockCountDrafts/periodic` only.
No code path this assessment traced touches `stockCounts` or the
Clear-All-Data operation. **Confirmed: fully separate; Decision 57 is
unaffected and unmodified by this assessment or by Decision 58.**

---

## J. Finding K Relationship

**Finding K's own status is preserved exactly as it currently stands —
not reclassified, not reinterpreted, by this assessment.** Decision 58's
mechanism intersects the same browser-lifecycle surface Finding K
discusses (writes and listeners that persist across interruption/
context changes), but does not touch listener attachment, cache-first
`onSnapshot` emission behavior, or authentication-state reset — Finding
K's actual subject matter. Per Finding K's own confirmed conclusion
(§B, cited in §G above): a write's path and identity are fixed at
issuance time, which remains true for every write `performRowSaveAttempt`
issues, interruption-triggered or not. **No new Finding-K-specific risk
is created. Finding K's existing classification (PARTIALLY VERIFIED, not
RESOLVED, per the Decision 57 Status section's own restatement) is
explicitly preserved unchanged.**

---

## K. Implementation Feasibility (Assessment Only — No Code Written)

- **Can `performRowSaveAttempt` safely be invoked for dirty rows during
  interruption?** Yes — confirmed technically sound in §B: its
  generation-protection and retry state are `useRef`-based, not
  React-state-based, and are confirmed not cleared by React on unmount.
- **Are existing refs/timers/generation handling sufficient?** Yes — no
  new ref, timer, or state field is required; `rowRetryRef`,
  `draftInFlightSaveRef`, `manualRetryEligibleRowsRef` already exist and
  already do exactly what this mechanism needs.
- **Must an in-flight save be serialized with interruption flushing?**
  Already true today for the *ordinary* per-row path
  (`performRowSaveAttempt` awaits `draftInFlightSaveRef.current` before
  writing) — under Option A this becomes automatically true for the
  interruption path too, since it would be calling the same function,
  closing the serialization gap this assessment's predecessor
  investigation identified between the current flush and an in-flight
  per-row transaction.
- **Must pending debounce timers be cancelled?** Yes — an edit not yet
  attempted (still within its 800ms debounce) should have its debounce
  timer cancelled and be attempted immediately at the interruption
  point, consistent with the flush's existing "immediate" intent.
- **Should active retries remain alive?** This is the one substantive
  implementation-shape question the Implementation Plan must decide
  explicitly: whether an *already-retrying* row (mid 1s/2s/4s sequence
  from an ordinary edit, not yet exhausted) should be left running
  undisturbed by an interruption, versus restarted at attempt 1. Both
  are technically feasible with existing mechanisms; this assessment
  does not decide between them, per its own scope boundary.
- **Can `flushPeriodicStockDraftRows` be removed, retained, or must it
  be changed?** Not decided here. Recommend retaining it, unused, at
  least through the Implementation Plan stage, since deleting working,
  tested code is its own decision, not an incidental cleanup, per this
  repository's own established discipline elsewhere.
- **Does metadata persistence (`__meta__`) require separate treatment?**
  No — `performRowSaveAttempt` already routes `__meta__`/
  `newProductInfo:*` keys through `savePeriodicStockDraftMeta`
  identically to ordinary edits; no new logic is needed.
- **Is any additional Product Architect decision actually necessary?**
  No — every question this section raises is an implementation-detail
  question answerable at the Implementation Plan stage, not a
  product-level requirements question. The one finding in §H is
  likewise an implementation/verification matter, not a decision-level
  question, because Decision 58's own accepted text does not need to
  specify retry-cancellation-on-cross-device-finalization behavior to
  be internally coherent — that is exactly the class of question this
  repository's convention (per Decision 39's own Rule 8 Assessment
  precedent) resolves at Rule 8/Implementation Plan, not by reopening
  the decision.

---

## L. Residual Limitations (Restated, Not Weakened)

Unchanged by this decision or this assessment, and not claimed to be
closed by either:

1. Pre-enqueue process termination or power loss before any persistence
   call executes.
2. Firestore persistence inactive this session
   (`isFirestorePersistenceActive === false`) — Private/Incognito
   browsing, storage-restricted WebViews, IndexedDB quota/corruption.
3. Permanent server-side rejection of a durably-queued write (now
   visible and manually retryable under Decision 58, where today it is
   silent — this is the improvement Decision 58 provides, not a new
   limitation).
4. Cross-device/cross-profile loss if the device/profile is abandoned
   before reconnecting.
5. The newly flagged, bounded, cross-device finalization-race orphan
   artifact (§H) — non-blocking, flagged for the Implementation Plan.

No browser-close or instantaneous-process-termination guarantee is
claimed anywhere in this assessment beyond what Decision 38's own
already-accepted, already-documented limitation already states.

---

## M. Required Verification (for the Implementation Plan / its own
verification stage, not performed here)

1. Confirm, via the existing source-inspection test methodology this
   repository already uses for `PeriodicStockCountView.tsx` (per
   `tests/periodic-stock-interruption-durability.test.ts`'s own stated
   approach — no runtime component harness exists in this repo), that
   the implemented flush correctly iterates `rowHasUnsavedLocalEditRef`
   and calls `performRowSaveAttempt` for exactly those rows.
2. Add a regression test proving an in-flight per-row write and an
   interruption-triggered attempt for the same row cannot both fire
   concurrently (closing the serialization gap named in §K).
3. Add a regression test for the `CONFLICT`-row poison-batch scenario
   (§E), proving one `CONFLICT` row no longer blocks other rows'
   interruption persistence — currently has no coverage in either
   direction.
4. Explicitly decide and test the §H cross-device finalization-race
   question — either verify the orphan-artifact outcome is acceptable
   as documented, or verify whatever mitigation the Implementation Plan
   selects actually closes it.
5. Full existing Periodic Contagem test suite re-run before
   Implementation Authorization, per this repository's standing
   practice.

---

## N. Final Verdict

**READY.**

Every Rule 8 dimension assessed (§D Conflict Integrity, §E Poison-Batch/
Atomicity, §F Authorization, §G Tenant Isolation, §H Finalization, §I
Decision 57 Separation, §J Finding K) is a clean **PASS**, with exactly
one flagged, bounded, non-blocking finding (§H's cross-device
finalization-race orphan artifact) that is an implementation/
verification matter, not a governance blocker, per this assessment's
own explicit severity analysis. **No new Product Architect decision is
required** — Decision 58 already resolved every product-level question
this mechanism raises; this assessment confirms the technical path is
sound and names the exact patterns (existing `performRowSaveAttempt`,
existing `rowRetryRef`/`draftInFlightSaveRef`/`manualRetryEligibleRowsRef`,
existing `cancelAllRowRetries()`) an Implementation Plan should specify.

**Implementation can proceed to the next governance gate — an
Implementation Plan — without reopening Decision 58 or any decision it
builds on**, because: (1) the mechanism reuses existing, already-
authorized functions verbatim, adding only a new caller (§B, §C); (2)
Decision 55's conflict semantics are unaffected, already enforced
independently of caller (§D); (3) the batch-atomicity trade-off is
real but matches no existing governance requirement to the contrary,
and resolves the poison-batch effect as intended (§E); (4) authorization
and tenant isolation are unchanged or strictly tightened (§F, §G); (5)
finalization is protected for the same-device case by existing,
unmodified code, with one bounded cross-device edge case flagged for
the Implementation Plan rather than left silent (§H); (6) Finding K and
Decision 57 are both confirmed unaffected and unmodified (§I, §J).

---

## Verification Performed for This Assessment

- The accepted Decision 58 text read completely and fresh from the
  repository (§A), at commit `0c4e039cde432d859aef5cd75b4722911d9c1e57`.
- `PeriodicStockCountView.tsx`: `performRowSaveAttempt`,
  `scheduleRowDraftSave`, `flushPeriodicDraftNow`, `rowRetryRef`,
  `draftInFlightSaveRef`, `manualRetryEligibleRowsRef`,
  `rowDebounceTimersRef`, `cancelRowRetry`/`cancelAllRowRetries`,
  `flushForSwitchIfNeeded`, `handleConfirmSave` — all read directly,
  this session, at this exact commit.
- `AppContext.tsx`: `savePeriodicStockDraftItem`,
  `savePeriodicStockDraftMeta`, `flushPeriodicStockDraftRows`,
  `resolvePeriodicConflict`, `recordStockCount`'s periodic branch and
  its draft-deletion batch — all read directly, this session.
- `firestore.rules`: `stockCountDrafts/periodic` and its `items/{rowKey}`
  block (lines 1432-1503) re-read directly, this session; confirmed
  unchanged since the prior investigation's own verification.
- `tests/periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts`
  (lines 342-395) read directly and cited for its existing, passing
  proof of the CONFLICT-write rejection this assessment's §D relies on.
- `finding-k-isolation-mechanism-analysis.md` §B re-read and cited, not
  reclassified.
- `git fetch` run immediately before this assessment began; confirmed
  `main = origin/main = 0c4e039`, working tree clean.
- No `src/`/`apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`,
  or `tests/` file was modified to produce this assessment.
- No Specification or amendment artifact, including Decision 55, 57, or
  58 itself, was modified.
- Finding K's own document was not modified.
- No Implementation Plan or Implementation Authorization was created.
