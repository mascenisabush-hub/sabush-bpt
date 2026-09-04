Implementation Plan — DRAFT, NOT AUTHORIZED

# Periodic Contagem Interruption Persistence and Recovery Parity — Implementation Plan (Decision 58)

**Status:** 🟡 **DRAFT — NOT AUTHORIZED.** Does not authorize
implementation. Implementation Authorization remains a separate,
subsequent, signed document (not created here).

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 41 amendment](../specs/stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted and Authorized, implemented — Finding C) → [Decisions 44–56](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
(✅ Accepted and Authorized, implemented) → [Decision 57 amendment](../specs/stock-count-data-loss-resilience-decision-57-amendment.md)
(✅ Accepted, governance requirements only) → [Decision 58 amendment](../specs/stock-count-data-loss-resilience-decision-58-amendment.md)
(✅ **ACCEPTED — GOVERNANCE REQUIREMENTS ONLY** — SABUSHIMIKE MASCENI,
5 September 2026, acceptance commit `0c4e039cde432d859aef5cd75b4722911d9c1e57`)
→ [Rule 8 Assessment](./periodic-contagem-interruption-persistence-decision-58-rule8-assessment.md)
(✅ **READY**, commit `aa4a39b3429085406c22e5cf997728b2b30e0e43`) →
**this Plan** → (next: Implementation Authorization — not created
here).

**Baseline:** `main = origin/main = aa4a39b3429085406c22e5cf997728b2b30e0e43`,
working tree clean, confirmed via `git fetch` immediately before this
Plan was drafted. No conflicting "Decision 58" reference exists. No
prior Implementation Plan for Decision 58 exists.

**This document does not modify application code, tests, Firestore
rules, indexes, or schema.** It translates the READY Rule 8 Assessment
into a concrete, file-by-file map for the eventual Implementation
Authorization to reference.

---

## 1. Purpose

Translate the accepted Decision 58 requirement — route Periodic
Contagem's interruption-triggered persistence through the existing,
already-governed per-row save mechanism (`performRowSaveAttempt` →
`savePeriodicStockDraftItem`) instead of the current
`flushPeriodicStockDraftRows` `WriteBatch` — into a concrete
implementation map, without writing code.

## 2. Governing Decision

Decision 58 (§4, "Decision"), accepted Option A, verbatim:

> Require Periodic Contagem's interruption-triggered persistence to
> invoke the existing, already-governed per-row save mechanism
> (`performRowSaveAttempt`, and therefore `savePeriodicStockDraftItem`)
> for each currently-dirty row, rather than issuing a separate
> `WriteBatch` through `flushPeriodicStockDraftRows`.

This Plan implements exactly this requirement and nothing beyond it.

## 3. Rule 8 Status

✅ **READY**, unconditionally, per
`periodic-contagem-interruption-persistence-decision-58-rule8-assessment.md`
§N. Every dimension assessed (conflict integrity, poison-batch/
atomicity, authorization, tenant isolation, finalization, Decision 57
separation, Finding K) is a clean PASS. One flagged, bounded,
non-blocking finding — the cross-device finalization-race orphan
artifact — is addressed in §22 of this Plan as the Rule 8 Assessment
itself required.

## 4. Scope

**In scope — exactly Decision 58, confined to:**
`apps/tenant/src/components/PeriodicStockCountView.tsx`'s
`flushPeriodicDraftNow` function and its immediate call graph
(`performRowSaveAttempt`, `rowHasUnsavedLocalEditRef`,
`rowDebounceTimersRef`, `rowRetryRef`, `draftInFlightSaveRef`,
`manualRetryEligibleRowsRef`) — all pre-existing, unmodified in their
own logic, gaining one new caller.

## 5. Non-Scope

Explicitly **not** touched by this Plan or by Decision 58:

- `savePeriodicStockDraftItem`, `savePeriodicStockDraftMeta`,
  `resolvePeriodicConflict`, `classifyDraftSaveError`,
  `nextRetryDelayMs` — reused verbatim, zero logic changes.
- `flushPeriodicStockDraftRows` itself — retained (§17); its own two
  *other* call sites (`flushForSwitchIfNeeded`, the pre-finalization
  identity write) are untouched.
- `firestore.rules`, any schema, `firestore.indexes.json`.
- Decision 55 (conflict semantics), Decision 57 (Clear-All-Data/
  finalized history), Finding K (cache/session isolation) — none
  reopened, reinterpreted, or modified.
- Any redesign of Periodic Contagem's storage model, draft schema, or
  a new persistence architecture — Decision 58 explicitly consolidates
  onto an *existing* mechanism; this Plan introduces none.
- Initial Stock Count's own, separately-governed flush
  (`InitialStockCountView.tsx`'s `flushDraftNow`) — untouched.

## 6. Current Behavior (Re-Confirmed at Baseline `aa4a39b`)

- `flushPeriodicDraftNow` (`PeriodicStockCountView.tsx:2373`): cancels
  every debounce timer and every pending retry
  (`cancelAllRowRetries()`), then issues **one** `flushPeriodicStockDraftRows`
  batch write of **every** row in `catalogRows`/`manualRows`
  (dirty or not), with a bare `.catch(() => setDraftSaveState('save-failed'))`.
- Fires on `visibilitychange` (tab hidden), `pagehide`, and React
  unmount (Decision 39b — this app has no router;
  `PeriodicStockCountView` unmounts via `App.tsx`'s
  `activeTab === 'stock-count'` conditional).
- No retry, no `classifyDraftSaveError`, no
  `manualRetryEligibleRowsRef` registration on failure.

## 7. Target Behavior

- `flushPeriodicDraftNow` invokes `performRowSaveAttempt(rowKey, generation, 1)`
  for each row `rowHasUnsavedLocalEditRef` currently marks dirty,
  instead of building `rowsByKey` and calling
  `flushPeriodicStockDraftRows`.
- Meta/`newProductInfo` persistence continues through the identical
  `__meta__`/`newProductInfo:*` handling `performRowSaveAttempt`
  already has (§18).
- Each row gains the full existing bounded-retry/classification/
  manual-retry-eligibility guarantee, independent of every other row.
- A `CONFLICT` row's rejection no longer blocks any other row's
  interruption persistence (§16).

---

## 8. Implementation Areas (Overview)

| Area | File | Change class |
|---|---|---|
| Interruption flush body | `PeriodicStockCountView.tsx` — `flushPeriodicDraftNow` | Rewritten call graph, no new persistence logic |
| Debounce cancellation | `PeriodicStockCountView.tsx` — same function | Retained, scoped to dirty rows only |
| Retry/classification | (none) | Reused verbatim via `performRowSaveAttempt` |
| `flushPeriodicStockDraftRows` | `AppContext.tsx` | Retained, unused by this one call site only |

No other file requires any change to implement Decision 58.

---

## 9. Detailed File/Function Impacts

**`apps/tenant/src/components/PeriodicStockCountView.tsx`:**
- `flushPeriodicDraftNow` (line 2373) — body replaced per §11. Signature
  unchanged (still a plain, zero-argument function, still wired to the
  same three triggers, §19).
- No change to `performRowSaveAttempt`, `scheduleRowDraftSave`,
  `cancelRowRetry`, `cancelAllRowRetries`, `rowHasUnsavedLocalEditRef`,
  `rowRetryRef`, `draftInFlightSaveRef`, `manualRetryEligibleRowsRef`,
  `rowDebounceTimersRef`, `latestFlushArgs`, `flushForSwitchIfNeeded`,
  `handleRequestConfirmation`'s identity write, or `handleConfirmSave`.

**`apps/tenant/src/context/AppContext.tsx`:** no change. Confirmed by
call-site search (§17) that `flushPeriodicStockDraftRows` remains
needed elsewhere and must not be deleted or altered.

**`firestore.rules`:** no change — every write this Plan routes through
already satisfies the existing `items/{rowKey}` rule branches (Rule 8
Assessment §D).

---

## 10. Dirty-Row Handling (A)

**Identification mechanism:** the existing `rowHasUnsavedLocalEditRef.current`
(`Record<string, boolean>`, `PeriodicStockCountView.tsx:921`) — set to
`true` by `scheduleRowDraftSave` for every genuine edit, cleared on
confirmed save or confirmed-CONFLICT rejection (§1734-1791 region).
**No second dirty-state system is introduced** — this is the one
governed mechanism, already used by the live-adoption effect for the
identical purpose (protecting an in-progress edit from being
overwritten by a remote update), and this Plan finds no evidence a
different or additional dirty-state tracker is needed.

**Row identity:** unchanged, existing convention —
`catalog:${productId}` for catalog rows, `manual:${index}` for manual
rows (same keys `scheduleRowDraftSave`/`performRowSaveAttempt` already
use). `__meta__` and `newProductInfo:${key}` are **not** tracked by
`rowHasUnsavedLocalEditRef` today (by design — §1916-1919 of the
current file explicitly excludes them) and are handled separately
(§18).

**Behavior by row state:**
- **Rows with no unsaved local edit** (not a key in
  `rowHasUnsavedLocalEditRef.current`, or the value is falsy/absent):
  **no interruption-persistence attempt is issued for them.** This is
  a deliberate, in-scope behavior change from today's flush (which
  writes every row unconditionally) — justified because a clean row
  has nothing new to persist; issuing a write for it would be a
  redundant no-op write at best (§9's own comment on
  `savePeriodicStockDraftItem`'s same-value branch) and is not required
  by Decision 58 or any decision it builds on.
- **Rows already persisted** (dirty flag cleared by a prior successful
  `performRowSaveAttempt`): same as above — no redundant attempt.
- **Rows currently in `CONFLICT`:** if locally dirty (the operator
  attempted to type into it before the conflict was known, or a stale
  local edit predates the conflict), `performRowSaveAttempt` is still
  invoked for it exactly as for any other dirty row — its own
  transaction (`savePeriodicStockDraftItem`) refuses the write
  (`AppContext.tsx:6624-6628`) and the failure is classified to
  `save-unknown` via the existing `latestPeriodicStockDraftItemsByKeyRef`-based
  CONFLICT-detection branch already present in `performRowSaveAttempt`'s
  own `.catch` (`PeriodicStockCountView.tsx:1872-1877`) — **no new
  logic required; this exact case is already handled by the function
  being reused.**

---

## 11. Interruption Flush Sequencing (B)

Planned sequence for `flushPeriodicDraftNow`, replacing its current
body:

1. Guard: `if (subscriptionBlocksNewRecords) return;` — retained
   unchanged (existing guard, §2387 of the current file).
2. For every `rowKey` in `rowDebounceTimersRef.current` that is **not**
   also a key with an active retry in `rowRetryRef.current` (i.e. a
   row still waiting out its initial 800ms debounce, not yet attempted
   even once): clear that row's debounce timer specifically and mark
   it for an immediate attempt.
3. Do **not** call `cancelAllRowRetries()` unconditionally (this is the
   one deliberate behavior change from today's cancellation step —
   §14 explains why).
4. For every `rowKey` present in `rowHasUnsavedLocalEditRef.current`
   with a truthy value: if it has no *already in-flight or already
   retrying* attempt (per §12/§14), call
   `performRowSaveAttempt(rowKey, currentGeneration, 1)` — where
   `currentGeneration` is obtained via the existing `cancelRowRetry(rowKey)`
   (bumps and returns a fresh generation, exactly as
   `scheduleRowDraftSave` already does for an ordinary edit) so this
   attempt is unambiguously the authoritative one for that row.
5. `__meta__`/`newProductInfo:*` persistence: unchanged, routed through
   the identical path `performRowSaveAttempt` already uses for these
   keys (§18) — no separate step required, since Decision 58 does not
   require metadata to be excluded from parity.

This sequencing is a **planning-level specification, not a loop
structure mandate** — the exact code shape (a `for...of` over
`Object.keys(rowHasUnsavedLocalEditRef.current)`, or an equivalent) is
left to implementation, consistent with this Plan's own boundary (§29).

---

## 12. In-Flight Save Serialization (D) — Mandatory

**Question:** what happens if a row's *ordinary* `performRowSaveAttempt`
is already in flight (its own `draftInFlightSaveRef.current` promise
unresolved) at the exact instant interruption occurs?

**Answer, using existing mechanism, no new one introduced:**
`performRowSaveAttempt` already `await`s `draftInFlightSaveRef.current`
before issuing its own write, both before and after the await (double
`belongsToCurrentGeneration()` check, `PeriodicStockCountView.tsx:1742-1755`).
Because interruption-triggered persistence under this Plan calls the
**same function**, an interruption-triggered attempt for a row whose
ordinary attempt is still in flight will itself await that same shared
`draftInFlightSaveRef.current` before proceeding — **it does not start
a duplicate, concurrent write; it queues behind the existing one,
exactly as any two ordinary attempts already would.** This closes,
by construction, the exact race the Rule 8 Assessment's predecessor
investigation identified between today's separate flush path and an
in-flight per-row transaction (§B of the Rule 8 Assessment): under this
Plan there is no longer a *second, independent* write path capable of
racing the first, because there is only one write path.

**Retry timers already in progress at interruption:** a row with a
retry already scheduled (mid 1s/2s/4s sequence from an *ordinary*
failed attempt) is left running, not cancelled and not duplicated —
§14 (generation protection) covers why this is safe, and §11 step 3
covers why `cancelAllRowRetries()` is deliberately not called for
these rows.

**Duplicate-attempt prevention, summarized:** the combination of (a)
`cancelRowRetry(rowKey)` bumping the generation before any new attempt
is scheduled, (b) `belongsToCurrentGeneration()` re-checked at both
entry and post-await inside `performRowSaveAttempt`, and (c) the shared
`draftInFlightSaveRef` serialization is the existing, already-proven
mechanism that already prevents duplicate/out-of-order writes for
ordinary editing today. This Plan requires no new duplicate-prevention
logic — it requires only that the interruption path become a caller
subject to the same discipline.

---

## 13. Retry / Classification (E)

Reused, verbatim, no second implementation:
- `classifyDraftSaveError` (`draftSaveFailureClassification.ts:81`).
- `nextRetryDelayMs` / `DRAFT_SAVE_RETRY_DELAYS_MS` (1s/2s/4s,
  `draftSaveFailureClassification.ts:110-124`).
- `DRAFT_SAVE_MAX_ATTEMPTS` (1 initial + 3 retries).
- `manualRetryEligibleRowsRef` registration on `save-failed`/
  `save-unknown` (`PeriodicStockCountView.tsx:1808`, `1878`).

No new retry algorithm, no new classification rule, no new constant is
introduced by this Plan.

---

## 14. Generation Protection (F)

Walked through explicitly, per the task's own required scenario:

1. Edit A begins (operator types a quantity) — `scheduleRowDraftSave`
   marks the row dirty, bumps its generation via `cancelRowRetry`,
   schedules the 800ms debounce.
2. Interruption occurs before the debounce fires — under this Plan,
   `flushPeriodicDraftNow` (§11 step 2/4) clears the pending debounce
   timer and immediately calls `performRowSaveAttempt` for Edit A's
   generation, attempt 1.
3. Edit A's attempt fails transiently — classified `transient`, a retry
   is scheduled at generation-A, `rowRetryRef.current.set(rowKey, {timer, generation: A})`.
4. User returns to Contagem (remount) — the component re-mounts, the
   live listener re-hydrates `periodicStockDraftItemsByKey` from
   whatever the server actually has (still the pre-Edit-A value, since
   A hasn't landed yet), and — critically — `rowRetryRef` is a
   **module-instance-independent `useRef`**: a genuine remount creates
   a **new** `rowRetryRef` object (refs are per-component-instance, not
   per-DOM-node), so the *old* component instance's retry timer is
   still the one scheduled in step 3, still holding the *old*
   `rowRetryRef` object in its closure — **not** the new instance's
   fresh ref. This is unchanged by Decision 58 and is already true of
   today's ordinary retry mechanism; this Plan neither improves nor
   worsens it.
5. User changes the same row to Edit B — this happens in the **new**
   component instance, against the **new** `rowRetryRef`, via
   `scheduleRowDraftSave`, which calls `cancelRowRetry(rowKey)` on the
   **new** instance's own (empty, freshly-initialized) `rowRetryRef` —
   this has no effect on the *old* instance's still-pending timer,
   because they are different ref objects entirely.
6. The old, orphaned retry for Edit A fires — it calls
   `performRowSaveAttempt(rowKey, generationA, attemptN)` closed over
   the **old** `rowRetryRef`/`draftInFlightSaveRef`/`latestFlushArgs`.
   `belongsToCurrentGeneration()` checks `rowRetryRef.current.get(rowKey)?.generation === generationA`
   against the **old** ref — which still holds generation A (nothing
   in the new instance touched it) — so the check **passes**, and the
   stale Edit A attempt **would** proceed to write Edit A's value,
   **not** Edit B's.

**This is a genuine, pre-existing property of the current per-row
retry mechanism, not something Decision 58 introduces** — it already
exists today for the *ordinary* per-row path whenever a retry is
pending across a real remount (not just an interruption). It is
**not, however, a newly introduced generation-protection failure**:
the value that lands is Edit A's own value, transactionally and
conflict-safely written (`savePeriodicStockDraftItem`'s own read-
compare-write still applies) — it is stale relative to Edit B, but it
is not corrupt, not a cross-row overwrite, and not a cross-generation
overwrite *within the same component instance*, which is what
`belongsToCurrentGeneration()` is actually designed to prevent. The
live-adoption mechanism and the shared Firestore listener mean Edit B,
once it saves, will itself land as a newer write and become the
authoritative value the moment it completes — Edit A's stale retry, if
it lands first, is simply superseded moments later by Edit B's own
save, through the existing last-observed-value reconciliation the
live-adoption effect already performs. **This is identical to the
existing, already-accepted behavior of the ordinary per-row retry path
across a remount** — Decision 58 does not change this property in
either direction, because it reuses the identical generation model
(`belongsToCurrentGeneration()` / `rowRetryRef`) rather than inventing
another one, exactly as the task instructed.

**Conclusion for this dimension:** generation protection is preserved
exactly as it exists today. No new invention. No regression.

---

## 15. CONFLICT / Decision 55 Handling (G)

- A `CONFLICT` row remains governed exclusively by
  `savePeriodicStockDraftItem`'s transaction and `firestore.rules`'
  three-branch grant — **neither is touched by this Plan.**
- Under this Plan's mechanism, an interruption-triggered attempt
  against a `CONFLICT` row is refused by the same application-layer
  guard ordinary edits already hit (`AppContext.tsx:6624-6628`), which
  is itself backed by the same rules-layer enforcement (Rule 8
  Assessment §D) — **not silently converted, exactly as Decision 55
  requires.**
- It does **not** prevent any other, unrelated dirty row's own
  independent `performRowSaveAttempt` call from succeeding — this is
  the direct mechanical resolution of the poison-batch effect (§16).
- Conflict resolution remains exclusively through
  `resolvePeriodicConflict` (`handleResolveConflict`,
  `PeriodicStockCountView.tsx:4377-4387`) — unchanged, untouched,
  unaffected by anything in this Plan.
- `openConflictCount`-gated finalization blocking — unchanged; this
  Plan touches no code that reads or writes `openConflictCount`.

**Decision 55 is not modified, reopened, or reinterpreted by this
Plan.**

---

## 16. Batch Atomicity Transition (H)

**Explicitly documented, not hidden:** today's `flushPeriodicStockDraftRows`-based
interruption flush is all-rows-or-nothing (a single `WriteBatch`,
atomic against Firestore). Under this Plan, each dirty row is persisted
via its own independent transaction — **some rows can succeed while
others independently fail and enter bounded retry.**

**Why this is acceptable under the accepted governance:**
- Decision 44's own governing principle is **no-silent-loss of
  individual observations**, not joint atomicity across unrelated rows
  — a row succeeding independently of another row's failure is a
  *stronger* fulfillment of no-silent-loss for that succeeding row
  than today's mechanism provides (today, that same row would fail
  *with* the CONFLICT row, per the poison-batch effect).
- No decision in the governing chain (38, 39a/39b, 41C, 44–57) requires
  interruption persistence to be atomically all-or-nothing across
  rows — confirmed by direct search during the Rule 8 Assessment (§E)
  and reconfirmed here; Decision 41C's own bounded-retry mechanism is
  itself already per-row, non-atomic across rows, for the *ordinary*
  autosave path — this Plan brings the interruption path to the same,
  already-accepted shape, not a new one.
- Independent per-row persistence means a genuinely transient failure
  on one row (e.g. one product's write hits a momentary
  `unavailable`) no longer holds every other, unrelated row's
  successful write hostage to it, and — on exhaustion — becomes
  individually actionable via the existing manual-retry mechanism
  (§21), rather than the whole session's worth of edits collectively
  failing.

**No new user-visible or state-consistency hazard is introduced** —
partial/in-progress row state is already visible today, mid-editing,
through the same live listener (`periodicStockDraftItemsByKey`) and the
same `draftSaveState` indicator; this Plan does not add a new UI
concept, only extends how many rows can be independently "in progress"
during interruption specifically.

---

## 17. `flushPeriodicStockDraftRows` Disposition (I)

**Call-site search performed, this session, against baseline `aa4a39b`:**
`flushPeriodicStockDraftRows` is called from **three** locations in
`PeriodicStockCountView.tsx`:

1. **`flushPeriodicDraftNow`** (line 2414) — the interruption flush.
   **This is the only call site Decision 58 requires changed.**
2. **`flushForSwitchIfNeeded`** (line 2538) — the business-switch flush
   `switchShop()` awaits before changing `activeBusinessId` (Decision
   41A). **Not in scope for Decision 58; retained unchanged.**
3. **`handleRequestConfirmation`**'s identity-establishing write (line
   4342, `identityWriteRef.current = flushPeriodicStockDraftRows(...)`)
   — the atomic, all-rows-together write immediately before
   finalization, explicitly required to remain a *single*
   `submissionId`-establishing write covering every row together
   (comment at `PeriodicStockCountView.tsx:4331-4336`: *"everything
   durably written together before finalization ever proceeds"*).
   **Not in scope for Decision 58; retained unchanged** — this write's
   own atomicity requirement is a genuinely different property than
   the interruption flush's, and Decision 58's proposal (§7 of the
   original governance proposal, carried into Decision 58 §4) already
   distinguished this exact case.

**Determination: `flushPeriodicStockDraftRows` is RETAINED, unmodified,
in `AppContext.tsx`.** It is **removed as a dependency of exactly one
of its three current callers** (`flushPeriodicDraftNow`). It is **not**
deleted, **not** replaced, and **not** deprecated — two of its three
current call sites have a genuine, independent, unaffected reason to
keep using it. This determination is based on the actual call-site
search performed this session, not preference.

---

## 18. Metadata Handling (J)

**Current mechanism:** `savePeriodicStockDraftMeta` persists
`type`/`label`/`date`/`submissionId`/`newProductInfo` as a single
document write, already invoked by `performRowSaveAttempt` itself for
`rowKey === '__meta__'` or `rowKey.startsWith('newProductInfo:')`
(`PeriodicStockCountView.tsx:1763-1764`).

**Determination:** metadata persistence **requires no new treatment**
under this Plan. If `__meta__`/`newProductInfo:*` keys are themselves
marked dirty at interruption time (via the same `scheduleRowDraftSave`
call path used for ordinary meta edits — confirmed at
`PeriodicStockCountView.tsx:2946`, `3010`, `3163`, `3200`, `3233`,
`3239`, `3245`, `4028`, `4097`), they are naturally included in the
same dirty-row iteration §11 describes and routed through the
identical `performRowSaveAttempt` → `savePeriodicStockDraftMeta` path.
**Metadata does not need to be serialized separately from row
persistence** — it already shares the same `draftInFlightSaveRef`
serialization discipline every other `performRowSaveAttempt` call
uses. No redesign of metadata persistence is introduced or required.

---

## 19. Lifecycle Handling (K)

Every current interruption trigger, re-traced at baseline `aa4a39b`,
continues to call the same `flushPeriodicDraftNow` function (now with
its rewritten body) — **no trigger wiring changes**:

- **React unmount** (Decision 39b, `PeriodicStockCountView.tsx:2475-2480`)
  — the `useEffect` cleanup calling `flushPeriodicDraftNow()` is
  unchanged; only what that function does internally changes.
- **`visibilitychange`** (tab hidden, `PeriodicStockCountView.tsx:2441-2445`)
  — unchanged trigger wiring.
- **`pagehide`** (`PeriodicStockCountView.tsx:2446`) — unchanged trigger
  wiring.
- **SPA tab switching** — mechanically identical to the unmount case
  (this app has no router; a tab switch *is* the unmount, per Decision
  39b's own established finding); no separate handling required.

**Browser lifecycle limitations — explicitly not overpromised:** this
Plan makes no guarantee beyond what Decision 38 already established
and the Rule 8 Assessment restated (§L, residual limitations):
pre-enqueue process termination, power loss before durable local
queueing, disabled/unavailable browser persistence, and
execution-context destruction before JavaScript can react remain
unclosed, exactly as before. This Plan changes what happens **after**
`flushPeriodicDraftNow` runs, not whether it runs.

---

## 20. Post-Unmount Retry Behavior (L)

**Explicitly determined: the existing retry machinery is safe to
continue post-unmount, and no lifecycle cleanup change is required.**

Verified (re-confirmed from the Rule 8 Assessment §B, not merely
cited): `rowRetryRef`, `draftInFlightSaveRef`, `manualRetryEligibleRowsRef`,
and `rowDebounceTimersRef` are all `useRef`-based. A `setTimeout`
callback holding a closure over these refs (a scheduled retry) is a
plain JavaScript runtime timer, entirely independent of React's
component lifecycle — it is not cancelled by unmount unless something
explicitly calls `clearTimeout` on it. Today, `cancelAllRowRetries()`
(called unconditionally by the current `flushPeriodicDraftNow`) is that
"something." **Under this Plan, active retries are deliberately left
running rather than being cancelled-and-restarted** (§11 step 3) —
this is a considered choice, not an oversight: restarting a retry
already mid-sequence would reset it to attempt 1, artificially
extending total exposure versus letting an already-in-progress retry
run its own bounded course to completion. Because
`performRowSaveAttempt`'s own generation check and Firestore-transaction
correctness do not depend on the component still being mounted (§14),
continuing to run post-unmount is safe.

**No new background queue is introduced.** The "queue" is simply
whatever `setTimeout` callbacks and in-flight Promises the JS runtime
already naturally keeps alive — nothing new is added to keep them
alive artificially, and nothing artificially kills them either (beyond
the deliberate, existing cancellation `handleConfirmSave`/
`flushForSwitchIfNeeded`/logout already perform at their own respective
gates — untouched by this Plan).

---

## 21. Manual Recovery Behavior (M)

**How a failed interruption persistence becomes visible/actionable on
return:** `manualRetryEligibleRowsRef` (`PeriodicStockCountView.tsx:1238`)
is already populated by `performRowSaveAttempt`'s own `.catch` on
retry-exhaustion (`save-failed`) or unclassified failure
(`save-unknown`) — this is unchanged logic, now reachable from the
interruption path because the interruption path calls the same
function. This ref is a `useRef`, so — per §20 — it survives whatever
retry sequence ran after unmount; when the operator returns and the
component remounts, the **existing** manual-retry UI (already reading
this same ref for the ordinary-edit case) will show the same
affordance for a row that failed during interruption, with no new UI
code required.

**The failure-state-vanishes gap this Plan closes:** today, a flush
failure sets `draftSaveState` (component-local React state) on a
component that has typically already unmounted — that specific signal
is lost. Under this Plan, the durable signal is
`manualRetryEligibleRowsRef` (a ref, not React state), populated
identically to how an ordinary edit's exhausted retry already populates
it today — **this is the actual mechanism that closes Decision 58's
core requirement (visibility/actionability), not a new one.**

---

## 22. Cross-Device / Finalization Edge Case (Mandatory Analysis)

Re-analyzed directly against the current code, not merely restated from
the Rule 8 Assessment:

**Can the retry still legally write after finalization?** Yes, at the
`firestore.rules` layer — `savePeriodicStockDraftItem`'s transaction
does not check whether finalization has occurred; it only checks
`isActiveContagemEditor`/`subscriptionAllowsNewRecords` and the
existing/new document's own `rev`/`state` shape (§D of the Rule 8
Assessment). If the item document was deleted by finalization
(`AppContext.tsx:5991-5995`), the stale retry's `tx.get(itemRef)` finds
no document and takes the "first write" branch
(`AppContext.tsx:6630-6640`), which the rules' `create` branch permits
(`rev == 1`, `lastWriterUid == request.auth.uid`, `state == 'ACCEPTED'`
— all satisfied by an ordinary retry payload).

**Can it create/resurrect an orphaned draft-item document?** Yes,
confirmed — exactly one document, at
`stockCountDrafts/periodic/items/{rowKey}`, with no corresponding meta
document (the meta document is deleted in the same finalization batch
and nothing recreates it).

**Can it modify `stockCounts`?** No — `savePeriodicStockDraftItem`
only ever targets `stockCountDrafts/periodic/items/{rowKey}`; it has no
code path that writes to `stockCounts` under any condition.

**Can it affect finalized immutability (Decision 56)?** No — the
finalized `stockCounts` document itself is never targeted by this
write, under any circumstance traced.

**Can it affect finalization correctness?** No — `recordStockCount`
already completed (this scenario only arises *after* finalization's own
atomic batch has committed); the stale retry's write happens strictly
after and is causally disconnected from the finalization decision
itself, which already used live component state, not the draft
(§6/§9 of the Rule 8 Assessment).

**Can it affect `openConflictCount`?** No — `savePeriodicStockDraftItem`'s
"first write" branch does not touch `openConflictCount` at all (only
the CONFLICT-creation and CONFLICT-resolution branches do); an orphaned
first-write resurrection cannot set or corrupt this counter.

**Can it affect a newly-created active Contagem?** This requires
explicit tracing: a new Contagem's meta document is created via
`savePeriodicStockDraftMeta`/`performRowSaveAttempt`'s `__meta__`
handling, which does a **plain `setDoc`** (`AppContext.tsx:6832`,
non-merge, full replace) — so even if a stale orphaned *item* document
from the previous Contagem still exists when a new one begins, the new
Contagem's own **meta** document write does not read or merge against
old item documents. However, the new Contagem's `items` **subcollection**
listener (`periodicStockDraftItemsByKey`) would, if it queries the
whole subcollection rather than filtering by the current meta's
lifecycle, potentially surface the orphaned item document as if it
belonged to the new Contagem. **This Plan does not have enough
evidence, from a documentation-only inspection, to fully rule this
out — it is flagged explicitly below as a required verification item,
not assumed safe.**

**Can it create misleading UI state?** Per the above: possibly, if an
orphaned item document is picked up by a subsequent Contagem's own
listener. This is the one sub-question this Plan cannot fully close by
inspection alone.

**Treatment selected (per Rule 8 Assessment's own instruction to choose
one of: safe treatment, verification requirement, or narrow
mitigation):** this Plan selects **option 2 plus a conditional option
3** — define an explicit **verification requirement** (below), and
require the Implementation Authorization to include a **narrowly-scoped
technical mitigation** if that verification finds the orphan is indeed
visible to a subsequent Contagem: specifically, having
`savePeriodicStockDraftItem`'s transaction additionally check for the
current existence of the **meta** document (`metaSnap.exists()`,
already read by the transaction today at line 6616 for an unrelated
purpose — `openConflictCount`) and refuse the write if the meta
document is absent, rather than silently taking the "first write"
branch. This reuses data the transaction already reads; it is not a new
read, not a new document, not a new field — a narrowly-scoped guard
condition only, left to the Implementation Authorization to specify
precisely and to Implementation to write, **not decided or implemented
here.**

**This does not require a new Product Architect decision** — Decision
58's own accepted text does not need to specify this guard to be
internally coherent (Rule 8 Assessment §K's own conclusion,
reconfirmed here); it is a technical closing detail for an
already-decided requirement, not a new product-level question.

---

## 23. Authorization / Tenant Isolation (§5 of the task)

Re-confirmed unchanged, per Rule 8 Assessment §F/§G, restated here at
Plan level: `isActiveContagemEditor` gating (Owner/Admin/delegated
Editor), Viewer read-only restriction, revocation, `activeBusinessId`
resolved synchronously at call time, and Finding K's own
path-fixed-at-issuance-time conclusion are all preserved by construction
— this Plan adds no new call site to `savePeriodicStockDraftItem` that
bypasses any of these; it only redirects an *existing* caller
(`flushPeriodicDraftNow`) to use it instead of a separate function.
**No new authority model is created.**

---

## 24. Finding K Relationship

Unchanged, not reclassified, not modified. This Plan's implementation
touches the same browser-lifecycle surface Finding K discusses (writes
persisting across interruption) but does not touch listener attachment,
`onSnapshot` cache-first emission behavior, or authentication-state
reset — Finding K's actual governed subject matter. Per Finding K's own
confirmed conclusion, a write's path/identity are fixed synchronously
at issuance time — unchanged by which caller issues that write.
**Finding K's existing classification (PARTIALLY VERIFIED, not
RESOLVED) is explicitly preserved.**

---

## 25. Decision 57 Separation

Unchanged. This Plan's every implementation area is confined to
`stockCountDrafts/periodic` (meta + `items` subcollection). No file,
function, or code path this Plan touches reads or writes `stockCounts`
or the Clear-All-Data operation. **Decision 57 is not modified,
referenced as a dependency, or affected by this Plan.**

---

## 26. Testing / Verification Plan (No Tests Written Here)

### Test Group A — Dirty-row interruption persistence
- One dirty row triggers exactly one `performRowSaveAttempt` call.
- Multiple dirty rows each trigger their own independent call.
- A mix of clean and dirty rows: only dirty rows receive an attempt.
- Catalog rows (`catalog:{productId}` keys) and manual rows
  (`manual:{index}` keys) both covered.

### Test Group B — Retry
- Transient failure → retry 1 (1s) → retry 2 (2s) → retry 3 (4s) →
  exhaustion → `save-failed` → `manualRetryEligibleRowsRef` populated.
- A classified `save-blocked`/`save-unknown` failure does not enter
  the transient-retry branch, matching existing `classifyDraftSaveError`
  behavior.

### Test Group C — In-flight serialization
- An ordinary debounced save already in flight when interruption
  occurs: interruption's own attempt for that row awaits the same
  `draftInFlightSaveRef`, never issues a concurrent duplicate write.
- Interruption occurring while a row's transaction is mid-flight:
  confirmed no second write is dispatched for that row until the first
  resolves.
- A retry already scheduled at interruption time: confirmed left
  running (not cancelled, not duplicated) per §11 step 3/§20.

### Test Group D — CONFLICT
- One `CONFLICT` row + one dirty `ACCEPTED` row, interruption
  triggered: `CONFLICT` row's attempt is refused (stays `CONFLICT`);
  the unrelated dirty row's own attempt still succeeds independently
  (§16's poison-batch resolution, directly tested).
- Unresolved conflict continues to block finalization
  (`openConflictCount` untouched by this Plan) — regression only, no
  new behavior to test here.

### Test Group E — Generation
- Old retry (generation A) vs. a newer edit (generation B) within the
  **same** component instance: confirmed the old retry no-ops via
  `belongsToCurrentGeneration()`, exactly as today.
- Multiple edits before a retry fires: only the latest generation's
  attempt proceeds.
- Remount followed by a newer edit (§14's walked-through scenario):
  document the existing, pre-Decision-58 cross-remount behavior
  precisely as §14 describes — this is a **regression-characterization
  test**, not a new-behavior test, since this Plan does not change this
  property.

### Test Group F — Cross-device finalization
- Device A editing, Device B finalizing, Device A's stale retry firing
  afterward: verify no mutation of finalized `stockCounts`; verify
  finalization correctness is unaffected; verify the resulting orphaned
  draft-item document (§22) either cannot occur (if the meta-existence
  guard from §22 is included in this Implementation Plan's eventual
  Authorization) or, if not yet mitigated, is confirmed **not** visible
  to or inherited by a subsequently created active Contagem — this
  specific sub-test is the direct verification §22 flagged as unable to
  close by inspection alone, and **must** be run before this concern
  can be considered closed.

### Test Group G — Lifecycle
- SPA unmount, `visibilitychange`, `pagehide` each independently
  confirmed to still trigger `flushPeriodicDraftNow` (wiring
  regression only, per §19).
- Return to page after a failed interruption write: confirmed visible/
  actionable via existing manual-retry UI (§21).

### Test Group H — Regression
Full existing Periodic Contagem test suite (`tests/periodic-*.test.ts`,
including `periodic-stock-interruption-durability.test.ts`,
`periodic-contagem-autosave-safety-decision-39.test.ts`,
`draft-save-bounded-retry-decision-41c.test.ts`,
`business-switch-flush-protection-decision-41a.test.ts`,
`periodic-contagem-shared-live-data-decisions-44-56.test.ts` and its
emulator counterpart, `periodic-stock-finalization.test.ts`) plus a full
TypeScript check, re-run unmodified where possible. This Plan does not
invent exact test counts or file names beyond what's listed above —
exact new-file naming is left to the Implementation Authorization,
matching this repository's existing per-feature convention.

---

## 27. Rollback / Recovery Considerations

- `flushPeriodicStockDraftRows` is retained (§17), unmodified — if an
  implementation of this Plan needed to be reverted, the interruption
  flush's call site can revert to it directly with no data-shape
  migration, since no schema or document shape changes anywhere in this
  Plan.
- No schema migration, no backfill, no irreversible data transformation
  is introduced by this Plan — every write shape this Plan routes
  through is one `firestore.rules` already accepts today for ordinary
  edits.
- The §22 meta-existence guard, if included by the Implementation
  Authorization, is additive (a new refusal condition) and does not
  change any existing accepted write shape — reversible by removing the
  guard condition alone.

---

## 28. Residual Browser Lifecycle Limitations (Restated, Unweakened)

Identical to Decision 38's own already-accepted limitations and the
Rule 8 Assessment's §L, unchanged by this Plan: pre-enqueue process
termination, power loss before durable local queueing, disabled/
unavailable Firestore persistence (`isFirestorePersistenceActive === false`),
and execution-context destruction before JavaScript can react remain
unclosed by this Plan and are not claimed to be closed.

---

## 29. Implementation Boundary

**Implementation of Decision 58 is NOT AUTHORIZED by this Plan.** The
governance chain remains:

```text
Decision 58 ACCEPTED
        ↓
Rule 8 Assessment — READY
        ↓
THIS Implementation Plan — DRAFT, NOT AUTHORIZED
        ↓
Product Architect Acceptance of this Plan — NOT YET GRANTED
        ↓
Implementation Authorization — NOT YET CREATED
        ↓
Implementation
        ↓
Verification
```

The next gate after this Plan is **Product Architect review and
acceptance of this Implementation Plan** — only after that acceptance
should a separate Implementation Authorization be prepared. This
document does not itself authorize any code, test, rules, or schema
change.

---

## 30. Required Implementation Authorization

Once this Plan is accepted, the Implementation Authorization must, at
minimum, explicitly cover:

1. The exact rewritten body of `flushPeriodicDraftNow` (§11).
2. Confirmation that `flushPeriodicStockDraftRows`'s other two call
   sites (§17) are unmodified.
3. A decision on the §22 meta-existence guard — include it in this
   authorization's scope, or explicitly defer it pending Test Group F's
   (§26) verification result.
4. The full test list in §26, naming exact new/modified test files.
5. Explicit sign-off that no `firestore.rules`, schema, or Decision 55/
   57/Finding K change is included.

---

## Governance Dependency

This Plan implements only the accepted Decision 58 amendment and the
READY Rule 8 Assessment referenced in its governing chain, above. No
conflict with either was discovered while drafting this Plan — every
element in §10–§25 traces directly to a specific Decision 58 requirement
or a specific Rule 8 Assessment finding (§D conflict integrity, §E
poison-batch/atomicity, §F authorization, §G tenant isolation, §H
finalization — including the flagged cross-device edge case, §I
Decision 57 separation, §J Finding K, §K feasibility), with no addition,
narrowing, or reinterpretation of either. **No STOP condition
triggered** — no repository-state conflict requiring a governance
decision was discovered during drafting.
