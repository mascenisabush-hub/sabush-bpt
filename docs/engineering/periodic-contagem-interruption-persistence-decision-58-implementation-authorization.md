Implementation Authorization Proposal — DRAFT

# Implementation Authorization — Periodic Contagem Interruption Persistence and Recovery Parity (Decision 58)

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation would be
authorized to begin, strictly within the scope defined below, **once
signed**. Does not itself perform implementation and does not modify
code, `firestore.rules`, schema, UI, or tests.

## 1. Authorization Status

**DRAFT — AWAITING PRODUCT ARCHITECT ACCEPTANCE.**

This is not yet an authorization. No code change is permitted on the
basis of this document until §8's signature block is completed by the
Product Architect. Prior to that signature, no code, `firestore.rules`,
schema, UI, or test file has been created, modified, or committed to
produce this document.

**Repository state at drafting:** `main = origin/main = 483446d467b7bb91a510917d3e51290b1dd531d9`,
working tree clean, confirmed via `git fetch` immediately before this
document was drafted. Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `package.json`, `tests/`,
Decision 58, its Rule 8 Assessment, its Implementation Plan, Decision
55, Decision 57, or Finding K to produce this document.

**No duplicate:** a repository-wide search for existing Decision 58
Implementation Authorization artifacts (`find docs -iname
"*decision-58*authoriz*"`) returns nothing prior to this document, and
a search for "Decision 58" anywhere in `docs/` returns exactly the
Decision 58 amendment, its Rule 8 Assessment, and its Implementation
Plan — no conflicting or duplicate authorization exists.

## 2. Governance Basis

[Decision 58](../specs/stock-count-data-loss-resilience-decision-58-amendment.md)
(✅ Accepted, commit `0c4e039cde432d859aef5cd75b4722911d9c1e57`,
SABUSHIMIKE MASCENI, 5 September 2026, Option A) → [Rule 8 Assessment](./periodic-contagem-interruption-persistence-decision-58-rule8-assessment.md)
(✅ READY, unconditionally, commit `aa4a39b3429085406c22e5cf997728b2b30e0e43`)
→ [Implementation Plan](./periodic-contagem-interruption-persistence-decision-58-implementation-plan.md)
(✅ Accepted by the Product Architect, commit `483446d467b7bb91a510917d3e51290b1dd531d9`)
→ **THIS Implementation Authorization** → *(next, once signed:
implementation — not performed by this document)*.

**Governing chain for the underlying product requirement:** Decision 38
(interruption-durability requirement) → Decision 39a/39b (per-row
autosave scheduling; SPA/unmount treated as an interruption) →
Decision 41, Finding C (bounded retry/classification for the per-row
path) → Decisions 44–56 (shared live Contagem data; Decision 55
conflict semantics) → Decision 57 (finalized-history Clear-All
protection, separate and unaffected) → **Decision 58** (interruption
persistence must reach parity with the per-row path) → this
Authorization (implements exactly that requirement, nothing more).

**Precedent note:** this document's structure follows
[`decision-57-clear-all-data-finalized-history-implementation-authorization.md`](./decision-57-clear-all-data-finalized-history-implementation-authorization.md)
(the same repository convention for a draft authorization awaiting
signature, most directly comparable precedent), adapted to Decision
58's own governing chain and scope — not copied verbatim, and not a
modification of that document, which remains exactly as it stands for
its own, different scope.

## 3. Authorized Implementation

Implementation is authorized **only** for the change the accepted
Implementation Plan already specifies. Nothing below is newly
introduced by this document.

**1. `flushPeriodicDraftNow` body replacement
(`apps/tenant/src/components/PeriodicStockCountView.tsx`).** Replace
the current body — which cancels every debounce timer and every
pending retry (`cancelAllRowRetries()`), then issues one
`flushPeriodicStockDraftRows` `WriteBatch` covering **every** row in
`catalogRows`/`manualRows` regardless of dirty state, with a bare
`.catch(() => setDraftSaveState('save-failed'))` — with the sequencing
Implementation Plan §11 specifies:
- Clear only the debounce timer of a row that has not yet had even its
  first attempt (still within its initial 800ms window).
- Do **not** call `cancelAllRowRetries()` unconditionally — a row
  already mid-retry (from an ordinary edit) is left running, per
  Implementation Plan §11 step 3/§14/§20.
- For every `rowKey` present in `rowHasUnsavedLocalEditRef.current`
  with a truthy value and no attempt already in flight or already
  retrying, call `performRowSaveAttempt(rowKey, generation, 1)`, where
  `generation` is obtained via the existing `cancelRowRetry(rowKey)`.
- `__meta__`/`newProductInfo:*` keys, if dirty, are included in the
  same iteration and continue to route through
  `performRowSaveAttempt`'s own existing handling for those keys — no
  separate step.

**No new function, ref, timer, retry algorithm, error-classification
rule, or Firestore write shape is introduced.** This is a rewrite of
one function's internal call graph, replacing one existing caller
(`flushPeriodicStockDraftRows`) with another existing function
(`performRowSaveAttempt`) as the target for dirty rows at interruption
time.

**Explicitly not touched by this authorized change:**
`performRowSaveAttempt`, `scheduleRowDraftSave`, `cancelRowRetry`,
`cancelAllRowRetries`, `rowHasUnsavedLocalEditRef`, `rowRetryRef`,
`draftInFlightSaveRef`, `manualRetryEligibleRowsRef`,
`rowDebounceTimersRef`, `latestFlushArgs`, `flushForSwitchIfNeeded`,
`handleRequestConfirmation`'s identity write, `handleConfirmSave`,
`savePeriodicStockDraftItem`, `savePeriodicStockDraftMeta`,
`resolvePeriodicConflict`, `classifyDraftSaveError`,
`nextRetryDelayMs`, `flushPeriodicStockDraftRows` itself, and
`firestore.rules` in their entirety — all reused or retained exactly
as they exist today.

**2. Conditional item — cross-device meta-existence guard
(`apps/tenant/src/context/AppContext.tsx`, `savePeriodicStockDraftItem`).**
Implementation Plan §22 identifies a narrowly-scoped, **conditional**
technical mitigation for the cross-device finalization edge case (§5,
below): having `savePeriodicStockDraftItem`'s transaction additionally
check the already-read `metaSnap.exists()` and refuse the "first write"
branch if the meta document is absent. **This item is authorized only
if Test Group F (§4, below) demonstrates the underlying orphan-visibility
concern is real** — i.e., that an orphaned item document can be
observed by a subsequently created active Contagem. If Test Group F's
verification instead demonstrates the orphan is never inherited by a
new Contagem (harmless in every traced respect), this guard is **not**
required and is **not** authorized to be added speculatively. This
conditional structure is preserved from the Implementation Plan exactly
as it left it — this Authorization does not resolve the underlying
question in either direction.

## 4. Tests / Verification

Before implementation of §3 may be declared complete, the following
must all pass. Test commands below are the repository's actual
existing `package.json` scripts, or the direct `tsx --test` invocation
this repository's own test-file header comments already document for
files without a dedicated script — none is invented.

**Test Group A — Dirty-row interruption persistence:** one dirty
catalog row, one dirty manual row, multiple dirty rows, and a mix of
clean + dirty rows (clean rows receive no attempt) — new assertions,
file naming left to the implementer per this repository's existing
per-feature test-file convention.

**Test Group B — Retry:** transient failure → retry 1/2/3 → exhaustion
→ `save-failed` → `manualRetryEligibleRowsRef` populated; a
`save-blocked`/`save-unknown` classification does not enter the
transient-retry branch. Reuses `classifyDraftSaveError`/
`nextRetryDelayMs` — no new constants to verify.

**Test Group C — In-flight serialization:** an ordinary debounced save
already in flight when interruption occurs (no concurrent duplicate
write is dispatched for that row); interruption while a row's
transaction is mid-flight; a retry already scheduled at interruption
time (confirmed left running, not restarted, not duplicated).

**Test Group D — CONFLICT:** one `CONFLICT` row plus one unrelated
dirty `ACCEPTED` row, interruption triggered — the `CONFLICT` row's
attempt is refused and it remains `CONFLICT`; the unrelated row's own
attempt still succeeds independently (poison-batch elimination,
directly tested); `openConflictCount`-gated finalization blocking
unaffected (regression only).

**Test Group E — Generation protection:** a stale retry (generation A)
versus a newer edit (generation B) within the same component instance
— the stale retry no-ops via `belongsToCurrentGeneration()`. The
cross-remount characterization documented in Implementation Plan §14
(a genuinely orphaned retry closure from a *prior* component instance
is unaffected by a *new* instance's own `cancelRowRetry` calls) is a
**regression-characterization test** — it documents existing,
pre-Decision-58 behavior this Authorization does not change, not new
behavior to verify.

**Test Group F — Cross-device finalization edge case (mandatory,
gates §3 item 2):** Device A holds a dirty row with a pending/retrying
interruption-triggered save; Device B finalizes the same Contagem;
Device A's stale retry then executes. Verify, freshly, all of:
- Finalized `stockCounts` is unchanged by the stale retry (it targets
  only `stockCountDrafts/periodic/items/{rowKey}`, never `stockCounts`).
- Finalization correctness is unaffected (the stale write is causally
  after and disconnected from the already-completed `recordStockCount`
  call).
- `openConflictCount` is unaffected (the "first write" branch this
  scenario reaches does not touch it).
- Any resulting orphaned draft-item document is confirmed **either**
  impossible (if §3 item 2's guard is authorized and implemented)
  **or** confirmed harmless and not inherited by a subsequently created
  active Contagem (if §3 item 2's guard is not required per the
  verification's own result) — this is the specific test that decides
  which of those two outcomes applies, and must be run and its result
  recorded before §3 item 2's own disposition is considered settled.

**Test Group G — Lifecycle:** React unmount, `visibilitychange`,
`pagehide` each still trigger the (internally rewritten)
`flushPeriodicDraftNow` — wiring regression only, per Implementation
Plan §19; return to Contagem after a failed interruption write shows
the existing manual-retry affordance (§21).

**Test Group H — Regression:**
- `npm run test:periodic-contagem-shared-live-data-decisions-44-56`
- `npm run test:periodic-contagem-44-56-rules` (or
  `npm run test:periodic-contagem-44-56-rules:emulator` against a
  reachable Firestore emulator)
- `npm run test:periodic-stock-finalization`
- `npx tsx --test tests/periodic-stock-interruption-durability.test.ts`
- `npx tsx --test tests/periodic-contagem-autosave-safety-decision-39.test.ts`
- `npx tsx --test tests/draft-save-bounded-retry-decision-41c.test.ts`
- `npx tsx --test tests/business-switch-flush-protection-decision-41a.test.ts`
- `npx tsx --test tests/periodic-stock-draft-resurrection.test.ts`
- `npx tsc --noEmit -p apps/tenant` — clean.
- `npm run test:all` — 0 failures, every suite.

Exact test counts are not specified — none is invented by this
Authorization.

## 5. Safety / Invariants

Implementation of §3 must preserve, unmodified:

- **Normal Periodic Contagem autosave remains per-row** — one row's
  edit autosaves that row alone; this Authorization does not convert
  Periodic Contagem into a whole-form or whole-Contagem autosave
  system, at interruption or otherwise.
- Decision 55 conflict semantics — `CONFLICT` remains explicit, no
  automatic winner, no silent resolution, unresolved conflicts continue
  to block finalization — enforced identically by the same,
  unmodified `savePeriodicStockDraftItem` transaction and
  `firestore.rules` grant this change routes through, not around.
- Decision 50 exactly-once finalization and Decision 56 finalized
  immutability — `recordStockCount` and its atomic draft-deletion batch
  are untouched; no interruption retry may mutate finalized
  `stockCounts` under any traced condition (§4, Test Group F).
- Decision 57's Clear-All-Data protection — untouched; this
  Authorization's every change is confined to
  `stockCountDrafts/periodic`.
- Existing authorization model — `isActiveContagemEditor` gating
  (Owner/Admin, delegated Editor), Viewer read-only restriction,
  revocation behavior — all preserved by construction, since this
  change adds no new call site that bypasses `savePeriodicStockDraftItem`'s
  or `firestore.rules`' existing gate.
- Tenant/business isolation — `activeBusinessId` resolved synchronously
  at call time, unchanged; Finding K's own confirmed conclusion
  (write path/identity fixed at issuance time) is unaffected.
- Finding K's own classification (PARTIALLY VERIFIED, not RESOLVED) —
  unaffected in either direction; no listener attachment or cache-first
  emission behavior is touched.
- The existing Firestore persistent local cache
  (`persistentLocalCache`/`persistentMultipleTabManager`,
  `firebase.ts`) — unmodified; no custom durable queue is introduced.
- `flushPeriodicStockDraftRows`'s two other, legitimate call sites
  (`flushForSwitchIfNeeded`; `handleRequestConfirmation`'s
  pre-finalization identity write) — unmodified, unaffected, continue
  to use that function exactly as today.

## 6. Explicit Exclusions

This Authorization does **not** authorize:

- Any change to Decision 55, Decision 57, or Finding K's own governed
  content, mechanism, or classification.
- Any change to `firestore.rules` — every write this Authorization's
  §3 item 1 routes through already satisfies the existing
  `stockCountDrafts/periodic/items/{rowKey}` rule branches (Rule 8
  Assessment §D); no rule change is required or authorized. §3 item
  2's conditional guard, if it becomes necessary, is an application-
  layer (transaction) check only, not a rules change.
- Any change to `flushPeriodicStockDraftRows` itself, or to either of
  its two other call paths (`flushForSwitchIfNeeded`, the
  pre-finalization identity write) — retained exactly as they exist,
  per Implementation Plan §17's own disposition.
- Any change to Initial Stock Count (`InitialStockCountView.tsx`'s own
  `flushDraftNow`) — a separately governed mechanism, not touched by
  Decision 58 or this Authorization.
- Any new persistence architecture, custom offline/durable queue, or
  redesign of the Periodic Contagem draft storage model (single meta
  document + `items` subcollection) — unchanged.
- Any whole-form or whole-Contagem autosave behavior — explicitly
  excluded per §5's own restated distinction.
- Any new authority tier, role, or authorization model — this change
  adds no new call site that isn't already gated by the existing
  `isActiveContagemEditor` check.
- §3 item 2's cross-device meta-existence guard, **unless** Test Group
  F's verification demonstrates it is necessary — it is not
  pre-authorized to be added speculatively or "for extra safety."
- Any new Product Architect decision, and any reinterpretation,
  reopening, narrowing, or expansion of Decision 58 or any decision it
  builds on (38, 39a/39b, 41/Finding C, 44–57).
- Any feature, mechanism, or behavior not present in Decision 58, its
  Rule 8 Assessment, and its accepted Implementation Plan.
- Any unrelated performance or UI redesign.

## 7. Completion Criteria

Implementation of this Authorization's scope is complete **only when
all of the following are simultaneously true** — no partial subset
constitutes completion:

1. `flushPeriodicDraftNow`'s body is rewritten exactly per §3 item 1,
   and no other function in `PeriodicStockCountView.tsx` is modified.
2. §3 item 2's guard is either (a) added to
   `savePeriodicStockDraftItem`, strictly as described, with Test Group
   F's verification result recorded as the basis for adding it, or (b)
   confirmed not required, with Test Group F's verification result
   recorded as the basis for that conclusion — one of the two, not
   left undecided.
3. `flushPeriodicStockDraftRows` remains present, unmodified, in
   `AppContext.tsx`, and its two other call sites are confirmed
   unmodified.
4. No `firestore.rules`, schema, or `firestore.indexes.json` change is
   made.
5. Every test named in §4 exists (where new) or is re-run (where
   existing) and passes — including a full, fresh `npm run test:all`
   and a clean `npx tsc --noEmit -p apps/tenant`.
6. The safety/invariant checks in §5 are specifically, freshly
   re-verified against the actual implemented code, not assumed from
   this document.
7. No file outside `apps/tenant/src/components/PeriodicStockCountView.tsx`,
   optionally `apps/tenant/src/context/AppContext.tsx` (only if §3 item
   2 is triggered), and the specific test files named in §4 is
   modified.
8. Nothing above is asserted as already true by this document — these
   are the conditions a future implementation session must satisfy and
   report against; none is satisfied as of this draft's own writing.

**This document does not claim any of the above is already
implemented, verified, or complete.**

## 8. Acceptance

**No implementation may begin until the Product Architect accepts and
signs this authorization.**

> I accept this Implementation Authorization and authorize
> implementation within the exact scope defined above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** *[to be recorded upon acceptance]*
