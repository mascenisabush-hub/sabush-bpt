Implementation Task — Derived from a Frozen Specification

# Stock Count Data-Loss Resilience — Implementation Task

**Status:** Frozen — Implementation Task → Implementation authorized.
Two review passes were run before freezing, matching the frozen spec's
own two-pass discipline: **Pass 1** (during drafting) surfaced a
substantive gap — the deterministic-id idempotency mechanism (§3) was
initially paired with a resurrection-protection design (§4) that
cancelled/discarded any unflushed draft write, including one carrying
the just-generated submission identity, right before the finalization
network call; a crash in the resulting ambiguous window would have
caused a retry to generate a fresh identity and create a second
logical count, defeating §8a's entire purpose. Fixed by splitting §4
into 4a (ordinary row content — safe to discard, since finalization
reads live component state, not the draft) and 4b (the submission
identity — written immediately and non-debounced via a dedicated
`establishSubmissionIdentity`, always awaited, never cancelled, before
finalization begins). **Pass 2** (after the fix) re-read the full
document against the frozen spec's §1–§14 and the actual source files
again, and additionally caught three citation-accuracy errors — an
inconsistent self-reference ("Section 5" used to mean the frozen
spec's §5 rather than this document's own Section 5) and two
off-by-a-few-lines source citations (`firestore.rules`'
`stockCountDrafts` block cited as lines 449–459, actually 450–464; the
periodic-create-rule citation given as line 439, actually line 441,
matching what the frozen spec itself cites) — all corrected. No further
contradiction, drift, or citation error found on this second pass.
**Amended by:** an Implementation Task Amendment, 24 August 2026,
operationalizing Decision 38 ("Contagem Draft Data-Durability and
Interruption Resilience — Extension of Decision 29"), the
Specification's own amendment (commit `781fbfc`, §5, §6, §12, §13,
§14), and the [Rule 8 Assessment](../engineering/stock-count-data-loss-resilience-rule8-assessment.md)
(verdict READY FOR IMPLEMENTATION, commit `570bb2b`) — adding §4c (the
interruption-durability flush as a third pending-write handle), §5a
(interruption-durability combined mechanism: navigation/unload flush +
Firestore persistent local cache), §5b (durable `newProductInfo` draft
content), §5c (stale/out-of-order autosave-write serialization), §6b
(file-by-file change-plan additions, including
`apps/tenant/src/lib/firebase.ts` entering this task's file scope for
the first time), §7 items 7–15 (additional acceptance criteria), an
additive extension to §8 (restating the multi-user/multi-device,
Initial Stock, and Business Worth boundaries unchanged, and recording
that Decision 38 supersedes — not removes — this document's prior
blanket exclusion of an app-wide navigation-guard mechanism and
IndexedDB, mirroring the Specification's own §12 supersession
technique), and §10 (traceability). **The Specification dependency
below now refers to its pre-Decision-38 commit (`2306c85`); this
amendment's own basis is the amended Specification at commit
`781fbfc`, stated here rather than by editing the historical citation
below.** This amendment does not reopen, alter, or reinterpret
anything already resolved in §0–§9: §1's doc-id/scoping decision, §2's
debounce interval, §3's idempotent-finalization mechanism, §4/§4a/§4b's
resurrection-protection design, §5's stale-draft UX pattern, and §9's
`timelineEvents` correction are all preserved exactly as before.
Sections not named here are unchanged by this amendment.
**Depends on:** the frozen [Stock Count Data-Loss Resilience
Specification](./stock-count-data-loss-resilience-specification.md)
(commit `2306c85`, confirmed present on `origin/main` with Status
"Frozen — Specification → Implementation authorized" as of this
drafting session); `apps/tenant/src/components/PeriodicStockCountView.tsx`;
`apps/tenant/src/components/InitialStockCountView.tsx` (read-only —
cited as prior art, not modified); `apps/tenant/src/context/AppContext.tsx`
(`recordStockCount`, `saveInitialStockDraft`, `logTimelineEvent`,
`triggerTrialActivation`); `firestore.rules`
(`stockCountDrafts/{draftId}`, lines 450–464); `tests/initial-stock-confirmation.test.ts`;
`tests/firestore-rules.test.ts`; `tests/stock-count-simplification.test.ts`.
**What this document is:** a concrete engineering resolution of the
frozen spec's §13 open decisions, plus a file-by-file change plan and
the literal, checkable exit conditions carried forward from §14. It does
not reopen anything the spec already settled in §1–§12; where this
document restates a spec requirement, it is restating, not
re-deciding.

---

## 0. Self-Review (contradiction check against the frozen spec)

Performed while drafting, before presenting this document:

- Re-read `stock-count-data-loss-resilience-specification.md` §1–§14 in
  full (not from summary) and cross-checked every factual claim in it
  against the actual current source: `PeriodicStockCountView.tsx` (all
  835 lines), `recordStockCount`/`logTimelineEvent`/`triggerTrialActivation`
  in `AppContext.tsx`, `InitialStockCountView.tsx`'s autosave effect,
  the `stockCountDrafts/{draftId}` rules block, and the two test-tier
  precedent files. All claims held — no drift between the frozen spec
  and the current repo state was found.
- Checked this document's own §13 resolutions below against §12's
  non-goals: none of them touch `InitialStockCountView.tsx`,
  `saveInitialStockDraft`, introduce IndexedDB, add a navigation guard,
  extract a shared draft hook, touch `addMultipleStockBatches`/
  `purchaseDrafts`, or invent a business rule beyond BDR-0009/the
  Simplification Amendment.
- Checked the doc-id/scoping decision (§13 bullet 1, resolved in §1
  below) against §11: it lands inside the existing generic
  `stockCountDrafts/{draftId}` rule, so §11's "no rules change
  required" branch applies, not the "divergence must be called out"
  branch.
- Checked the idempotency mechanism (§13 bullet 3, resolved in §3
  below) against §8a and §8b specifically: confirmed it produces the
  observable-outcome requirement in §8b without claiming
  cross-collection atomicity it doesn't need to claim.
- No remaining contradiction or unresolved specification-level decision
  found.

---

## 1. Resolved: Draft document id / scoping

**Decision:** a new, second per-business singleton document,
`stockCountDrafts/periodic`, sibling to the existing
`stockCountDrafts/initial`. Not per-user, not per-count.

**Why this satisfies the spec's constraint (§5, §11):** periodic
`stockCounts` creation is already Owner-only at the rules layer today
(confirmed: `firestore.rules` line 441, matching the frozen spec's
own citation of this same line in §5,
`allow create: if isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId)`,
no type-specific carve-out) — the spec explicitly notes this means the
draft does not need to support concurrent multi-user editing of the
same periodic count, so a single per-business slot is sufficient. A
singleton also means the existing `stockCountDrafts/{draftId}` rule
block (confirmed generic and Owner-only at read/create/update/delete
today, `firestore.rules` lines 450–464) already covers `periodic`
exactly as it already covers `initial`, with zero rule-text changes —
satisfying §11's stated preference and closing §13 bullet 1.

**Consequence, stated explicitly so it isn't silently assumed:** only
one in-progress periodic count can be drafted per business at a time.
Starting a new periodic count while a different one's draft is still
unresolved overwrites that slot. This matches the current UI reality
(one `PeriodicStockCountView` screen, one working list at a time) and
is not a behavior change from today — today there is no draft at all,
so there is nothing to conflict with.

## 2. Resolved: Debounce interval and document-size sizing check

**Decision:** 800ms debounce, matching the existing
`saveInitialStockDraft` precedent (the frozen spec's §5, "starting
point: the existing 800ms pattern") — whole-document overwrite,
coalesced by a single trailing timer per change, not per keystroke.

**Sizing check (performed here, not deferred):** a periodic draft row
carries `productId?`, `productName`, `quantity` (string), `unit`,
`costPrice` (string), `sellingPrice` (string), and `removed?` (bool) —
structurally identical in shape to the fields already persisted per
row in `InitialStockDraftItem`. A representative JSON-encoded row at
realistic field lengths (e.g. `productName: "Arroz Tio João 5kg"`,
numeric fields as decimal strings) serializes to roughly 180–260 bytes
including field-name overhead. At 300 rows that is ~54–78 KB; at a
generous 1,000 rows (well beyond this repo's stated "300+" scale) it is
~180–260 KB. Firestore's per-document ceiling is 1 MiB (1,048,576
bytes). This leaves more than 4x headroom even at the generous
estimate, so no chunking, no per-row subcollection, and no additional
size guard is required by this task.
**This estimate must still be confirmed empirically during
implementation** (e.g. logging `JSON.stringify(draft).length` against a
synthetic 300-row draft in dev), because an estimate is not the same as
a measurement — but no design decision here is contingent on that
number changing materially; it is a verification step, not an open
question.

## 3. Resolved: Idempotent finalization mechanism

**Decision:** deterministic document ids for both `stockCounts` and
`timelineEvents`, derived from the submission identity (§7) — the first
option the spec lists in §8a, and the same shape `recordStockCount`
already uses for `type === 'initial'` (a fixed id instead of a random
one), extended with a submission-identity suffix for the periodic case
since (unlike `initial`) more than one periodic count will exist over a
business's lifetime.

- `stockCounts` id: `'stockcount-periodic-' + submissionId` (submission
  identity is a client-generated UUID per §7, created once when the
  operator enters the `pendingTally` confirmation step, persisted as
  part of the draft, and reused on every retry).
- **Required, not optional: the submission identity must be durably
  written to `stockCountDrafts/periodic` at the moment it is generated,
  independently of the general row-content autosave, and that write
  must be confirmed complete before the finalization commit is issued.**
  This is a distinct requirement from "the draft persists row content"
  (§5) — without it, the entire deterministic-id mechanism above is
  defeated. Concretely: if the identity exists only in component state
  (a `useRef`/`useState`) and the debounced draft write that would have
  carried it to Firestore is discarded rather than flushed (see §4
  below for exactly this failure mode), then a crash occurring after
  the finalization network call has been sent but before the client
  observes a result leaves the persisted draft without the identity
  that attempt actually used. Resuming after such a crash would
  generate a *new* identity and retry under a *different* deterministic
  id — producing a second, genuinely distinct `stockCounts` document
  even though the mechanism's entire purpose is to prevent exactly
  that. §4 below specifies the concrete fix: an immediate, non-debounced,
  awaited write of the identity, issued at generation time and
  confirmed before finalization begins — never merely scheduled and
  potentially discarded like ordinary row-content autosave.
- `timelineEvents` id: `'tl-periodic-' + submissionId` (currently
  `logTimelineEvent` always generates a random `'tl-' + Date.now() + ...'`
  id — confirmed in `AppContext.tsx`; this task adds an optional
  explicit-id parameter to `logTimelineEvent`, used only by the
  periodic finalization call site, leaving every other caller
  unaffected and still randomly-id'd).
- `triggerTrialActivation`: **not gated**, called unconditionally on
  every successful periodic finalization attempt, exactly as it already
  is for every other call site today. This is a deliberate choice
  among the options §8b lists as non-exhaustive: the spec itself
  states the server-side transition (`trial_pending → trial_active`) is
  already a one-way, idempotent no-op on a second call. Since that
  guarantee already exists server-side, client-side gating would add
  complexity (tracking "was this the first commit") without changing
  the observable outcome §8a requires. If this assumption is wrong —
  i.e. if `triggerTrialActivation`'s server endpoint is not actually
  safe to call twice — that is a pre-existing condition of every other
  call site in this codebase, not something introduced by this task,
  and is out of scope to fix here.

**Why deterministic ids alone satisfy §8a without a transaction or
existence-check:** because the id is stable across retries of the same
submission, a retry's `fsBatch.set(...)` on `stockCounts` and the
`setDoc(...)` on `timelineEvents` land on the *same* document each
time. Firestore's `set()` (non-merge, full overwrite) on an existing
document with materially identical content is a no-op in effect — it
does not create a second document. This produces exactly the
"observable outcome" §8b requires (exactly one `stockCounts` document,
exactly one `timelineEvents` document per submission identity) without
claiming database-level atomicity across the two, which §8b explicitly
does not require.
**Batch-atomicity requirement carried forward unchanged:** per §8b, the
periodic `stockCounts` write and its draft-cleanup delete
(`stockCountDrafts/periodic`) are queued on the same `fsBatch` before a
single `commit()` — the same pattern `recordStockCount` already uses
for `type === 'initial'`, extended to the periodic branch (today the
periodic branch has no draft to delete at all, since no draft exists
yet).

## 4. Resolved: Resurrection protection (closing the Initial Count bug's exact shape, per §6)

**Root cause of the existing bug, confirmed by reading
`InitialStockCountView.tsx` directly:** the autosave `useEffect`'s
`setTimeout` handle is only ever cancelled by the effect's own React
cleanup, which only runs when the effect re-fires — and the effect's
dependency array (`[rows, date, draftLoaded, hasInitialStockCount]`)
omits `isSaving` and `savedMessage`. When `handleSubmit` sets
`isSaving`, the effect does not re-run, so a timer already pending from
the last keystroke before submission is never cancelled and can fire
`setDoc` after the confirmation batch has already deleted the draft.

**Design decision for the periodic draft, structurally different from
the buggy pattern (not merely "different code that looks different"):**
imperative timer/promise tracking held in `useRef`, not inside a
`useEffect` cleanup that depends on a dependency array being complete.
This task draws a hard distinction between two kinds of pending draft
write, because they fail differently if mishandled — collapsing them
into one "just cancel it" path is exactly the mistake §3 above warns
against:

### 4a. Ordinary row-content autosave — safe to discard on confirm

- `draftDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`
- `draftInFlightSaveRef = useRef<Promise<void> | null>(null)`
- `scheduleDraftSave()` (called from row-change handlers —
  `updateCatalogRow`, `updateManualRow`, `handleRemoveCatalogRow`,
  `handleRestoreCatalogRow`, `handleAddManualRow`,
  `handleRemoveManualRow` — never from a `useEffect`) clears any
  existing `draftDebounceTimerRef.current`, sets a new one; the timer
  callback issues the `setDoc(...)`, stores its promise in
  `draftInFlightSaveRef.current`, and clears that ref in `.finally()`.
- Discarding an unflushed row-content write here is safe **because
  `recordStockCount` never reads the Firestore draft for finalization
  content** — `handleRequestConfirmation` computes `pendingTally` from
  live `allWorkingRows` component state, and `handleConfirmSave` passes
  that same live-state tally to `recordStockCount`. This is the exact
  contract `tests/initial-stock-confirmation.test.ts` already proves
  for the Initial Count (`normalizeStockCountItems` has no parameter
  for draft state at all) — the periodic path is built the same way.
  A stale or missing draft on Firestore therefore cannot cause
  finalization to commit the wrong row content; worst case, the draft
  is one edit behind right up until finalization deletes it anyway.

### 4b. Submission identity write — never discarded, always flushed and awaited

The identity is not ordinary row content — per Section 3 above, it is
the one field a post-crash retry depends on, so it gets its own,
separate, non-debounced write path:

- `establishSubmissionIdentity(id: string)` — a new, dedicated
  function, distinct from `scheduleDraftSave`. Called exactly once, at
  the same moment the identity is generated (entry into `pendingTally`,
  i.e. inside the existing `handleRequestConfirmation`). Issues an
  immediate `setDoc` (merge: true) writing `{ submissionId: id }` into
  `stockCountDrafts/periodic` — no debounce, no coalescing.
- Its promise is stored in a separate
  `identityWriteRef = useRef<Promise<void> | null>(null)`.
- `handleConfirmSave`, before calling `recordStockCount`, does, in
  order:
  1. `if (draftDebounceTimerRef.current) clearTimeout(draftDebounceTimerRef.current)`
     — discard any pending ordinary row-content save (safe, per §4a).
  2. `if (draftInFlightSaveRef.current) await draftInFlightSaveRef.current`
     — let any already-in-flight ordinary row-content save finish
     (harmless either way, but avoids an unnecessary write-order
     conflict with the delete about to be queued).
  3. `await identityWriteRef.current` — **always awaited, never
     cancelled.** By the time this resolves, the submission identity is
     confirmed durable in Firestore. Only after this completes does
     `handleConfirmSave` call `recordStockCount`.

**Explicit ordering, carried forward from the frozen spec's Section 6
requirement that this be closed "by design, not by convention":**

```text
editing
  ↓
saving (debounced row-content autosave, cancellable — §4a)
  ↓
operator requests confirmation → pendingTally
  ↓
submission identity generated → establishSubmissionIdentity()
  fired immediately, NOT debounced
  ↓
operator clicks "Confirmar Contagem" → handleConfirmSave
  ↓
cancel/await any pending §4a row-content save (safe — draft content
  is never read by finalization)
  ↓
await identityWriteRef.current (never cancelled — must complete)
  ↓
finalization: recordStockCount()
  ↓
atomic fsBatch: stockCounts write (deterministic id) +
  stockCountDrafts/periodic delete, single commit()
  ↓
saved / finalized
```

**Why a late write cannot recreate `stockCountDrafts/periodic` after
finalization:** by the time `recordStockCount`'s `fsBatch.commit()` is
even queued, every draft-write promise this component could have in
flight has already either been cancelled-because-harmless (§4a) or
awaited-to-completion (§4b's identity write). No code path issues a new
`setDoc` to `stockCountDrafts/periodic` after that point — the
component's next render (on `recordStockCount` resolving) transitions
to the `savedMessage` screen, which renders none of the row-editing
inputs `scheduleDraftSave` is wired to, so no further draft-write can
even be triggered by user interaction. This is the same "structurally
impossible," not merely conventionally avoided, property §6 requires.

**Regression guard for this property is §14 item 1** — see Section 7
below, and note item 1 must now cover *two* orderings, not one: (a)
the §4a cancel/await sequence precedes `recordStockCount`, and (b) the
§4b identity-write await precedes it as well, with the identity write
itself sourced from `establishSubmissionIdentity`, not from
`scheduleDraftSave`.

## 4c. Resolved (Decision 38 Amendment): The interruption-durability flush — a third kind of pending draft write

Decision 38 item (a) and the amended Specification §6 require that
every entered product/portion — and, per §5b below, every associated
`newProductInfo` entry — survive normal interruption, including
accidental navigation away, tab/app closure, refresh/reload, and
connection loss, not only the two write paths §4a/§4b above already
track. This introduces a genuinely new pending-write path. Per Rule 8
Assessment Finding C1, it must join the exact same cancel/await
discipline §4a/§4b already enforce, not become an untracked third side
channel — doing otherwise would reopen the same resurrection defect
(Section 2's Initial Count bug) against this new write path
specifically.

**Design:**
- `flushInFlightSaveRef = useRef<Promise<void> | null>(null)` — a
  third ref, distinct from `draftDebounceTimerRef`/`draftInFlightSaveRef`
  (§4a) and `identityWriteRef` (§4b).
- `flushPeriodicDraftNow()` — a new function in
  `PeriodicStockCountView.tsx`, its own implementation, per the frozen
  spec's standing non-authorization of a shared hook with
  `InitialStockCountView.tsx`'s own `flushDraftNow` (restated unchanged
  at §8 below) — design precedent only, per §5a item 1 below.
- On firing, `flushPeriodicDraftNow()` first performs the same cancel
  step §4a already performs
  (`if (draftDebounceTimerRef.current) clearTimeout(...)`), then
  issues its own immediate `savePeriodicStockDraft(...)` call using
  the current live component state (not the possibly-stale
  last-scheduled values), and stores the resulting promise in
  `flushInFlightSaveRef.current`, cleared in `.finally()` — mirroring
  §4a's own promise-tracking shape exactly.
- **`handleConfirmSave`'s existing three-step cancel/await sequence
  (§4b) is extended with one further, ordered step, appended after the
  existing three:** `if (flushInFlightSaveRef.current) await
  flushInFlightSaveRef.current`. This runs after the §4a/§4b steps and
  before `recordStockCount` is called, for the same reason those steps
  already run in that position: by the time `recordStockCount`'s
  `fsBatch.commit()` is queued, every draft-write promise the
  component could have in flight — ordinary autosave, submission
  identity, and now the flush — has either been
  cancelled-because-harmless or awaited to completion. No code path
  issues a new write to `stockCountDrafts/periodic` after that point,
  extending §4's own "structurally impossible, not merely
  conventionally avoided" property to this third path.
- The flush write carries the same live-state content
  `scheduleDraftSave` would otherwise have written (catalog rows,
  manual rows, and, per §5b below, `newProductInfo`); it is as safe to
  discard on an ordinary confirm as §4a's ordinary autosave already
  is, for the identical reason — `recordStockCount` never reads the
  Firestore draft for finalization content, it reads live component
  state. The flush's own purpose is to reduce the interruption-loss
  window when the operator leaves without confirming, not to
  participate in the finalization data path.

**Traceability:** Decision 38 item (a); amended Specification §6
(interruption-durability required outcome); Rule 8 Assessment §5
Finding A1, §9 Finding C1, §11 items 1–2.

## 5. Resolved: Stale-draft UX pattern

**Decision:** an explicit, dismissible resume banner — never a silent
auto-load (§6's requirement).

- On mount, after the periodic draft listener's first snapshot resolves
  (mirroring the existing `initialStockDraftLoaded` gating pattern in
  `InitialStockCountView.tsx`, applied to a new
  `periodicStockDraftLoaded` flag), if a non-empty draft exists for the
  active business, a banner is shown above the count form: *"Existe uma
  contagem [tipo] por terminar de [data] — Retomar ou Começar de novo?"*
  with two explicit actions.
- **Retomar:** loads the draft's rows (catalog + manual + `removed`
  flags) and its persisted submission identity into working state, then
  dismisses the banner. The catalog-merge `useEffect` (existing,
  `[products]`-keyed) is unaffected — draft rows populate the same
  `catalogRows`/`manualRows` state the merge effect already reads from,
  so a product added to the catalog after the draft was saved still
  merges in correctly.
- **Começar de novo:** deletes `stockCountDrafts/periodic` outright and
  proceeds with the existing catalog-derived default state, discarding
  the stale submission identity (a fresh one is generated at the next
  `pendingTally` step, per §7).
- No action is taken automatically. The form does not render its normal
  editable state until one of the two actions is chosen, closing the
  same "operator unaware recovered data is being shown" risk §6 names.

## 5a. Resolved (Decision 38 Amendment): Interruption-durability combined mechanism

**Decision:** the Rule 8-approved combined mechanism — navigation/
unload flush (§4c above) plus Firestore's own persistent local cache —
layered onto the existing 800ms-debounce draft architecture (§2),
which is otherwise unchanged.

1. **Navigation/unload flush.** §4c above specifies the write-path
   integration; this item specifies the trigger wiring.
   `PeriodicStockCountView.tsx` adds a `useEffect` registering a
   `visibilitychange` listener (calling `flushPeriodicDraftNow()` when
   `document.visibilityState === 'hidden'`) and a `pagehide` listener
   (calling `flushPeriodicDraftNow()` unconditionally), cleaned up on
   unmount — the same two events, for the same documented reason
   (`beforeunload` is unreliable on some browsers, notably older
   mobile Safari), `InitialStockCountView.tsx` already uses. This is
   design precedent only: no code, hook, or utility is shared between
   the two views, per the frozen spec's own standing
   non-authorization of a shared draft mechanism (§8 below, unchanged).

2. **Firestore persistent local cache.** `apps/tenant/src/lib/firebase.ts`
   replaces its current `getFirestore(app)` / `getFirestore(app,
   databaseId)` construction of `db` with `initializeFirestore(app, {
   localCache: persistentLocalCache({ tabManager:
   persistentMultipleTabManager() }) }, databaseId)` — the `databaseId`
   argument passed only in the branch that already passes it today, no
   change to that existing conditional. All three APIs —
   `initializeFirestore`, `persistentLocalCache`,
   `persistentMultipleTabManager` — are confirmed present in the
   actually-installed `@firebase/firestore@4.16.0` (Rule 8 Assessment
   §1), and the settings field is `localCache`, not `cache` (the same
   correction the Rule 8 Assessment already made to the prior
   investigation).

3. **Explicit app-wide-scope disclosure (required, not optional).**
   `db`, exported from `lib/firebase.ts`, is the single shared
   Firestore instance every read/write in the tenant app uses —
   Periodic Contagem's draft included. Enabling `persistentLocalCache`
   on this instance is therefore an app-wide setting by construction;
   there is no SDK-level way to scope it to Periodic Contagem alone.
   This is a disclosed, accepted consequence of Decision 38 item (c)'s
   own authorization of "durable local/offline persistence... without
   limitation" (Rule 8 Assessment §8, §12) — not an unreviewed side
   effect. `persistentMultipleTabManager` (not
   `persistentSingleTabManager`) is used specifically because it
   avoids force-failing persistence in a second tab of the same user's
   own browser — restated at §8 below with its own explicit
   multi-device/multi-user caveat.

4. **Explicit residual physical limitation (required, not optional —
   must not be represented as an absolute zero-loss guarantee).** If
   an instantaneous power, battery, or blackout event occurs before
   JavaScript executes at all, and before the specific edit in
   question has been locally enqueued (i.e., neither the ordinary
   debounce nor the flush has yet fired for that edit), no client-side
   web mechanism — this one included — can guarantee recovery of that
   edit. This is a physical limitation of the browser/JavaScript
   execution model, not a design gap in this task's mechanism, and the
   combined mechanism above reduces the loss window to exactly this
   irreducible case (Rule 8 Assessment §7, §10) rather than closing it
   entirely. No UI text, log message, or documentation produced by
   this task may represent the system as providing a mathematically
   absolute zero-loss guarantee.

5. **New client-side storage surface, disclosed.**
   `persistentLocalCache` writes to the browser's IndexedDB — zero
   IndexedDB usage exists anywhere in this codebase today (Rule 8
   Assessment §8). Per §7 item 14 below, private-browsing/
   IndexedDB-restricted behavior (where the SDK's documented fallback
   is to fail open to memory/network-only operation, not to throw)
   must be manually verified during implementation, since no existing
   test tier in this repo can simulate that condition.

**Traceability:** Decision 38 items (a), (c); amended Specification §6
(interruption-durability outcome, "required outcome, not required
mechanism"), §12 (mechanism-exclusion bullets reframed), §13
(mechanism selection left to the Implementation Task); Rule 8
Assessment §1 (SDK API verification), §5 Finding A1, §7 (mechanism
assessment table), §8 (app-wide scope), §10 (failure-mode table).

## 5b. Resolved (Decision 38 Amendment): Durable `newProductInfo` draft content

**Decision:** the periodic draft schema (`PeriodicStockDraft`,
`apps/tenant/src/context/AppContext.tsx`) gains one new optional
field, `newProductInfo`, structurally identical — serialized as-is, no
restructuring — to the current in-memory shape already declared in
`PeriodicStockCountView.tsx`:

```text
newProductInfo?: Record<string, {
  purchaseUnit: string;
  purchaseCost: string;
  relationshipSteps: { unit: string; factor: string }[];
}>
```

- **Ordinary debounced draft writes include it:** `scheduleDraftSave`'s
  signature gains a `nextNewProductInfo` parameter, passed through to
  `savePeriodicStockDraft`, conditionally spread into the written
  document only when non-empty (matching this file's own existing
  conditional-spread discipline for `label`/`submissionId`, and
  `savePurchaseDraft`'s documented undefined-field-rejection fix) —
  never assigned the literal value `undefined`.
- **Interruption flush writes include it:** `flushPeriodicDraftNow()`
  (§4c) reads the same live `newProductInfo` state and includes it in
  its own `savePeriodicStockDraft` call, identically to how it
  includes catalog/manual rows — this is additive draft content, not a
  second content path.
- **Resume restores it:** the stale-draft resume banner's "Retomar"
  action (§5 above) loads `newProductInfo` from the draft into the
  component's `newProductInfo` state alongside catalog/manual rows and
  the submission identity, so a genuinely-new product's entered
  purchase unit, purchase cost, and unit-relationship chain survive
  interruption exactly as its portion rows already do.
- **Absence in old drafts remains backward-compatible:** a draft
  written before this amendment simply lacks the field; the resume
  path treats it as an empty `{}`, the same discipline this codebase
  already applies to every other optional draft field. No draft
  written before this amendment is rendered unreadable or requires
  reinterpretation.
- **No migration/backfill is required:** nothing about a pre-existing
  draft's absence of this field is itself invalid or requires
  correction.
- **No `firestore.rules` change is required:** the existing
  `stockCountDrafts/{draftId}` block (`firestore.rules`, currently
  lines 1157–1165, re-verified fresh this session — already Owner-only
  at read/create/update/delete, generic over `{draftId}`) authorizes
  the document, not an enumerated field set, and already covers a
  document carrying this additional field with zero rule-text
  changes — the same reasoning §11 of the frozen spec and §1 of this
  task already establish for every other draft field.
- **No restructuring of the existing in-memory shape:**
  `newProductInfo`'s current `useState` shape in
  `PeriodicStockCountView.tsx` is reused verbatim as the persisted
  shape; this task does not rename, flatten, or otherwise reshape it.
- **Sizing, restated from §2:** `newProductInfo` entries exist only
  for genuinely new products (Decision 37's first-time flow), a small
  subset of any count's rows, and are bounded in size the same way
  ordinary rows already are (§2's sizing check) — no separate
  size-ceiling risk is introduced.

**Traceability:** Decision 38 item (b); amended Specification §5
(draft content, Decision 38 addition), §14 item 7; Rule 8 Assessment
§5 Finding B1, §8 (data model assessment).

## 5c. Resolved (Decision 38 Amendment): Stale/out-of-order autosave-write serialization, single session

**Decision:** per Rule 8 Assessment Finding D1, `scheduleDraftSave`'s
write path is serialized — before issuing a new
`savePeriodicStockDraft` call, it awaits any prior in-flight
ordinary-autosave write, rather than firing overlapping writes whose
completion order the network does not guarantee.

- **Before an ordinary autosave issues its Firestore write, it awaits
  any prior in-flight periodic-draft write:** the debounce timer
  callback in `scheduleDraftSave` (§4a) is extended to, immediately
  before calling `savePeriodicStockDraft`, do
  `if (draftInFlightSaveRef.current) await draftInFlightSaveRef.current`
  — the same ref §4a already tracks, now also read (not only written)
  at the start of the timer callback, not only at `handleConfirmSave`.
- **Writes remain full-document overwrites:** no change to
  `savePeriodicStockDraft`'s own `setDoc` shape (§3, unchanged) —
  serialization is achieved purely by issue-order, not by any change
  to what each write contains.
- **No version/sequence field is required:** because writes are
  already whole-document overwrites and are now strictly
  issue-ordered, the later write's content is, by construction, the
  more current state; no monotonic counter or timestamp comparison is
  needed to determine which write should win.
- **The latest state therefore wins within the same active Contagem
  session,** per Decision 38 item (d) and amended Specification §6's
  stale/out-of-order requirement.

**Explicitly distinguished from:**
- **The existing finalization-vs-draft resurrection protection
  (§4/§4a/§4b/§4c):** that discipline governs an ordinary or flush
  autosave write racing against *finalization*; this section governs
  two ordinary autosave writes racing against *each other*, within the
  same still-unfinalized session. The two are separate properties with
  separate regression guards (§7 item 1 vs. item 10 below), per the
  amended Specification's own explicit distinction (§6).
- **Multi-tab/multi-device/user collaboration:** this serialization
  operates entirely within one mounted `PeriodicStockCountView`
  instance's own in-memory refs; it says nothing about, and provides
  no protection against, two different tabs, devices, or users writing
  to the same draft concurrently — that remains excluded exactly as §5
  of the frozen spec and Decision 38 item (f) already state, restated
  unchanged at §8 below.

**Traceability:** Decision 38 item (d); amended Specification §6
(stale/out-of-order single-session protection); Rule 8 Assessment §5
Finding D1, §6 (requirement traceability table).

---

## 6. File-by-file change plan

**`apps/tenant/src/context/AppContext.tsx`**
- Add `savePeriodicStockDraft(items, type, label, date, submissionId)`
  — new function, own code path, analogous in *shape* to
  `saveInitialStockDraft` but not shared code with it (per §5's
  explicit non-authorization of a shared hook). Writes
  `stockCountDrafts/periodic`. Used by §4a's debounced autosave.
- Add `establishSubmissionIdentity(submissionId)` — separate, smaller
  function, `setDoc(..., { merge: true })` writing only
  `{ submissionId }` immediately, no debounce. Used exclusively by §4b;
  never called from the debounced autosave path, so it can never be
  cancelled/coalesced away by `scheduleDraftSave`'s own timer logic.
- Add `clearPeriodicStockDraft()` — analogous to
  `clearInitialStockDraft`, own code path.
- Add a `periodicStockDraft` / `periodicStockDraftLoaded` listener pair
  in the existing business-subcollections listener effect, mirroring
  the existing `initialStockDraft` listener at line 1011 (new
  `onSnapshot` on `stockCountDrafts/periodic`, not a modification of
  the existing `initial` listener).
- Extend `recordStockCount`'s periodic branch only: deterministic id
  (Section 3 above), queue the `stockCountDrafts/periodic` delete on
  the same `fsBatch` as the `stockCounts` set (mirroring the existing
  `type === 'initial'` branch immediately above it), pass the
  deterministic id through to `logTimelineEvent`.
- Extend `logTimelineEvent`'s signature with an optional `id?: string`
  parameter, defaulting to the existing random-id behavior when
  omitted — every existing call site is unaffected; only the new
  periodic finalization call site passes an explicit id.
- No changes to `saveInitialStockDraft`, `clearInitialStockDraft`,
  the `initial` branch of `recordStockCount`, or `triggerTrialActivation`'s
  own body.

**`apps/tenant/src/components/PeriodicStockCountView.tsx`**
- Add the draft lifecycle state (§4's `editing`/`saving`/`saved`/
  `save-failed`), rendered distinctly from the existing
  `isSaving`/`savedMessage` finalization-status state — never the same
  UI signal (§1a).
- Add the submission-identity ref, generated once on first entry into
  `pendingTally` (existing `handleRequestConfirmation`), immediately
  and durably persisted via `establishSubmissionIdentity` at that same
  moment (§4b — not merely held in component state), regenerated only
  on the existing "back out and materially edit" path (§7) —
  `pendingTally`'s existing `setPendingTally(null)` back-out already
  exists at line 360; this task adds identity-regeneration (and a
  fresh `establishSubmissionIdentity` call) to that same handler only
  when rows have changed since the identity was generated.
- Add the imperative debounce/cancel machinery from §4a and the
  separate immediate identity-write path from §4b.
- Add the stale-draft resume banner from Section 5 above.
- No change to the catalog-merge effect, the tally computation, the
  Counted/Not Counted confirmation screen's structure, or any pricing/
  quantity business logic.

**`apps/tenant/src/components/InitialStockCountView.tsx`** — no
changes (§12).

**`firestore.rules`** — no changes (Section 1 above; confirmed the
existing `stockCountDrafts/{draftId}` block already covers `periodic`).

---

## 6a. Convergence guarantees, restated explicitly (not left implicit across Sections 3–4)

Four properties this task's mechanism must hold together, stated
plainly in one place so review doesn't have to reassemble them from
separate sections:

1. **`stockCounts` write and `stockCountDrafts/periodic` deletion
   remain in the same Firestore batch, single `commit()`** — §3's
   "batch-atomicity requirement carried forward unchanged," §6's
   `recordStockCount` extension.
2. **`timelineEvents` deduplication is independently guaranteed** — not
   via the same batch (§8b of the spec does not require that), but via
   its own deterministic id (`'tl-periodic-' + submissionId`) so a
   retry's write to it is a harmless overwrite, never a second
   document.
3. **`triggerTrialActivation` needs no client-side deduplication** —
   the server-side `trial_pending → trial_active` transition is already
   a one-way no-op on a second call (stated in the frozen spec's §2),
   so calling it unconditionally on every finalization attempt cannot
   produce a harmful duplicate effect; gating it would add complexity
   without changing the observable outcome §8a requires.
4. **A retry after an ambiguous result must not create a second
   logical count** — this is the composite property, and it holds only
   because of *both* §3 (deterministic ids make a retry's writes land
   on the same documents) *and* §4b (the identity those deterministic
   ids are derived from is itself durable before the ambiguous network
   call is even made). §3 alone is not sufficient — a retry that
   generates a *new* identity because the old one wasn't persisted
   would still be idempotent per-attempt while producing two distinct
   "logical" counts overall. Both halves are required simultaneously.

## 6b. File-by-file change-plan additions (Decision 38 Amendment)

Additive to §6 above — extends the same two files already in scope
and brings one new file into scope for the first time. No bullet in
§6's original list is removed or rewritten.

**`apps/tenant/src/lib/firebase.ts`** *(entering this task's file
scope for the first time)*
- Replace the current `getFirestore(app)` / `getFirestore(app,
  databaseId)` construction of `db` with `initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager:
  persistentMultipleTabManager() }) }, databaseId)`, preserving the
  existing conditional (`databaseId` passed only when
  `firebaseConfig.firestoreDatabaseId` is set, unchanged from today).
  No other exported value from this file changes (§5a item 2).

**`apps/tenant/src/context/AppContext.tsx`** *(additive to §6's
existing bullets)*
- Extend `savePeriodicStockDraft`'s parameters with an optional
  `newProductInfo` (§5b), conditionally spread into the written
  `PeriodicStockDraft`, never assigned `undefined`.
- No further changes to `saveInitialStockDraft`, `clearInitialStockDraft`,
  the `initial` branch of `recordStockCount`, `logTimelineEvent`, or
  `triggerTrialActivation` — unchanged by this amendment, exactly as
  §6's original text already states.

**`apps/tenant/src/components/PeriodicStockCountView.tsx`** *(additive
to §6's existing bullets)*
- Add `flushInFlightSaveRef` and `flushPeriodicDraftNow()` (§4c), and
  the `visibilitychange`/`pagehide` listener `useEffect` (§5a item 1).
- Extend `scheduleDraftSave`'s timer callback with the
  await-in-flight-write-before-issuing step (§5c).
- Extend `scheduleDraftSave`'s call sites and the resume ("Retomar")
  handler to read/write `newProductInfo` alongside catalog/manual rows
  (§5b).
- Extend `handleConfirmSave`'s existing cancel/await sequence with the
  fourth step named at §4c.
- No change to the catalog-merge effect, the tally computation, the
  Counted/Not Counted confirmation screen's structure, or any pricing/
  quantity business logic — restated unchanged from §6's original
  text.

**`apps/tenant/src/components/InitialStockCountView.tsx`** — no
changes (§8, §12 of the frozen spec, unchanged by this amendment).

**`firestore.rules`** — no changes (§5b above; the existing
`stockCountDrafts/{draftId}` block, currently lines 1157–1165, already
covers the additional field with zero rule-text changes).

**Traceability:** Decision 38 items (a)–(d); amended Specification §5,
§6, §11; Rule 8 Assessment §8 (data model assessment), §12 (scope
boundaries).

---

## 7. Acceptance criteria — carried forward from §14, literal and checkable

1. **Late draft write after finalization → draft remains deleted, and
   the submission identity is durable before finalization begins.**
   Source-level regression guard, matching
   `tests/initial-stock-confirmation.test.ts`'s tier and technique
   (source-inspection via `readFileSync` + string/regex assertions on
   `PeriodicStockCountView.tsx`, not a component-test harness). New
   file `tests/periodic-stock-draft-resurrection.test.ts` asserts, in
   source order, all of:
   - `handleConfirmSave` contains `clearTimeout(draftDebounceTimerRef...)`
     before the call to `recordStockCount` (§4a);
   - `handleConfirmSave` contains `await draftInFlightSaveRef.current`
     before the call to `recordStockCount` (§4a);
   - `handleConfirmSave` contains `await identityWriteRef.current`
     before the call to `recordStockCount` (§4b) — a separate
     assertion from the two above, since this guards a different
     failure mode (identity durability, not draft-content resurrection);
   - `establishSubmissionIdentity` is called from
     `handleRequestConfirmation` (where the identity is generated),
     never from `scheduleDraftSave` or its timer callback — guarding
     against a future edit accidentally folding the identity write back
     into the debounced/cancellable path this section exists to keep
     it out of.
2. **Ambiguous commit + retry → exactly one logical result.** Genuine
   Firestore-emulator-backed test, matching `tests/firestore-rules.test.ts`'s
   tier. New `describe` block in that file (or a new
   `tests/periodic-stock-finalization.test.ts` using the same emulator
   harness that file already sets up):
   - commit a periodic `stockCounts` document at the deterministic id
     for a fixed submission identity, then attempt the same write again
     under the same identity; assert exactly one document exists at
     that id and its content matches; repeat for the `timelineEvents`
     id (proves §3);
   - additionally: write `{ submissionId }` to `stockCountDrafts/periodic`
     via the emulator (simulating `establishSubmissionIdentity` having
     already completed), then simulate a client reload by reading the
     draft back and confirming the same `submissionId` is what a retry
     would reuse — proving §4b's contribution to the composite property
     in 6a item 4, not just §3's contribution in isolation.
3. **Draft persists and is recoverable across simulated reload/remount
   with 300+ rows,** including `removed` catalog rows and manual rows —
   Firestore-emulator-backed test: write a 300+-row
   `stockCountDrafts/periodic` document via the emulator, read it back,
   assert row count, `removed` flags, and manual rows all round-trip
   unchanged.
4. **Blank quantity never coerced to zero, and vice versa, anywhere in
   the draft-save/recovery path** — extends
   `tests/stock-count-simplification.test.ts` (currently in-memory-tally
   only) with cases that round-trip a blank-quantity row and a
   zero-quantity row through `savePeriodicStockDraft` → emulator read →
   back into working-row shape, asserting the distinction survives.
5. **Security-rules coverage for `stockCountDrafts/periodic`,** same
   pattern as the existing `stockCountDrafts/initial` block in
   `tests/firestore-rules.test.ts` (lines 649–666, 1142–1156): Owner
   read/create/update succeed, Staff/other-business reads and writes
   fail, delete succeeds for Owner regardless of subscription state.
6. **`tests/initial-stock-confirmation.test.ts` is unaffected** — run
   unchanged as part of this task's own verification; any diff in its
   output is a regression per §12 and blocks this task's completion.
7. **[Added by the Decision 38 amendment, 24 August 2026] Source-level
   verification that `PeriodicStockCountView.tsx` wires both
   `visibilitychange` and `pagehide` to `flushPeriodicDraftNow`.**
   Source-level regression guard (same `readFileSync` +
   string/regex-assertion technique as item 1), asserting both
   event-listener registrations exist and reference the flush function
   (§4c, §5a item 1).
8. **[Added by the Decision 38 amendment, 24 August 2026] Source-level
   verification that `flushPeriodicDraftNow` cancels the pending
   debounce before issuing its own write** — asserting
   `clearTimeout(draftDebounceTimerRef...)` precedes the
   `savePeriodicStockDraft(...)` call inside `flushPeriodicDraftNow`'s
   own body, distinct from item 1's assertions about
   `handleConfirmSave` (§4c).
9. **[Added by the Decision 38 amendment, 24 August 2026] Source-level
   verification that `handleConfirmSave` awaits
   `flushInFlightSaveRef.current` before calling `recordStockCount`,**
   extending item 1's existing ordering assertions with this fourth
   ref — a separate assertion from the three item 1 already checks
   (§4c).
10. **[Added by the Decision 38 amendment, 24 August 2026] Source-level
    verification that `scheduleDraftSave`'s timer callback awaits
    `draftInFlightSaveRef.current` before issuing its own next write**
    (§5c) — proving the stale/out-of-order single-session
    serialization property directly in source, the same technique
    item 1 uses for the distinct resurrection property.
11. **[Added by the Decision 38 amendment, 24 August 2026]
    Firestore-emulator-backed test: a draft including `newProductInfo`
    round-trips unchanged through write/read** (§5b) — extends item
    3's tier and technique to this additional field.
12. **[Added by the Decision 38 amendment, 24 August 2026]
    Firestore-emulator-backed test (or equivalent direct read
    assertion): a pre-existing draft written without `newProductInfo`
    is read back with the field correctly absent/empty, not
    erroring** — proves §5b's backward-compatibility requirement
    behaviorally, not merely by inspection.
13. **[Added by the Decision 38 amendment, 24 August 2026]
    `lib/firebase.ts` initialization verification:** confirm
    `initializeFirestore` is called with `localCache:
    persistentLocalCache({ tabManager: persistentMultipleTabManager()
    })`, and that the full existing test suite (both tiers, unmodified)
    still passes — a regression gate, not a new assertion about
    application behavior (§5a item 2).
14. **[Added by the Decision 38 amendment, 24 August 2026] Manual,
    documented verification (not automatable at either existing
    tier): private-browsing/IndexedDB-restricted behavior does not
    crash the app.** Flagged as a required verification step during
    implementation, per §5a item 5 above and Rule 8 Assessment §11
    item 7 — no new automated-test infrastructure is authorized or
    required to cover this.
15. **[Added by the Decision 38 amendment, 24 August 2026]
    `tests/initial-stock-confirmation.test.ts` remains unaffected,
    re-confirmed for this amendment specifically** — restated from
    item 6 above, because `lib/firebase.ts` (item 13) is now a shared
    file every existing test touches indirectly via `db`, making this
    an explicit, separately-named regression gate for this amendment's
    own changes rather than only a restatement of item 6's original
    scope.

---

## 8. What this document does not authorize

Same non-goals as the frozen spec's §12, restated for this task
specifically since they bound the file-by-file plan above: no
IndexedDB, no app-wide navigation guard, no change to
`InitialStockCountView.tsx` or `saveInitialStockDraft`, no shared-hook
extraction between the initial and periodic draft mechanisms, no change
to `addMultipleStockBatches`/`purchaseDrafts`, no new business rule
beyond BDR-0009 and the Simplification Amendment, and no new
component-test harness (jsdom/testing-library/React-DOM) — every test
above uses either the existing source-level-regression tier or the
existing Firestore-emulator tier.

**[Added by the Decision 38 amendment, 24 August 2026 — supersedes
only the two items named below, restated from the paragraph above;
does not touch any other item in that paragraph.]** The blanket "no
IndexedDB, no app-wide navigation guard" language above is superseded
in part, mirroring the frozen Specification's own §12 supersession:
Decision 38 item (c) and amended Specification §6/§12/§13 now
authorize both a navigation/unload flush mechanism (§4c, §5a item 1)
and Firestore's persistent local cache (§5a item 2) as the Rule
8-approved combined interruption-durability mechanism. Neither is
prescribed as a general-purpose app-wide "unsaved changes" guard
beyond the narrow Contagem-draft flush described at §4c/§5a — this
amendment does not introduce a router-level or global navigation
interceptor of any kind, only the two named, narrowly-scoped
mechanisms.

Restated unchanged by this amendment, per Decision 38 items (e)/(f)
and the Rule 8 Assessment's own explicit re-flagging:
- **Multi-user/multi-device exclusion:** `persistentMultipleTabManager`
  (§5a item 2) coordinates Firestore's local cache across multiple
  tabs of the *same user's own browser/device only* — it authorizes no
  multi-user editing, no multi-device collaborative editing, and no
  cross-device conflict resolution of any kind. This terminology
  caveat, per Rule 8 Assessment Finding E1, is carried into every
  place this mechanism is described in code or documentation.
- **Initial Stock exclusion:** `InitialStockCountView.tsx` receives
  zero code changes under this amendment. Its existing
  `flushDraftNow`/`visibilitychange`/`pagehide` implementation remains
  design precedent only, exactly as it already was before this
  amendment — never shared code, never modified.
- **Business Worth boundary:** nothing in this amendment touches
  `recordStockCount`'s semantics, confirmed `StockCount` semantics,
  Business Worth calculation, or FR-34's draft/confirmed valuation
  boundary. Every mechanism this amendment adds (§4c, §5a, §5b, §5c)
  operates exclusively on the unconfirmed periodic draft.

---

## 9. Post-Freeze Correction (found during Verification)

**This section is appended, not a silent edit of the frozen text
above** — §6a item 2's claim above ("a retry's write to it is a
harmless overwrite, never a second document") is factually wrong and is
preserved as-written for the historical record, corrected here instead.

**What was found:** running `npm run test:periodic-stock-finalization:emulator`
against a real Firestore emulator (Verification stage, not caught by
`tsc --noEmit` or any source-level test, since this is a genuine
Firestore-rules-level property) surfaced that `timelineEvents`' own
rule (`firestore.rules`, pre-existing, untouched by this task) is
`allow update: if false` — entries are unconditionally append-only.
Firestore classifies a write to a path that already holds a document as
an `update`, so a retry's write to the deterministic `tl-periodic-`
id — which the first successful attempt already created — is REJECTED
by this rule, not accepted as a no-op overwrite. §6a item 2 as
originally written assumed the same "overwrite is harmless" shape as
`stockCounts` (Item 1), without having checked `timelineEvents`' own
rule text first, which is exactly the kind of unverified assumption
this project's governance discipline exists to catch — it simply wasn't
caught until Verification instead of at this freeze, because it's a
Firestore-rules property no earlier stage's tooling (`tsc`, source
inspection) can see.

**Why this does not require reopening the specification or this task:**
the OBSERVABLE OUTCOME §8a/§8b actually require — exactly one
`timelineEvents` document per submission identity, ever — still holds,
just via a different mechanism than described. `logTimelineEvent`'s own
pre-existing try/catch (already in place for every call site in
`AppContext.tsx`, not added by this task) swallows the rejected
retry's error, so `recordStockCount` never throws because of it. Net
effect: exactly one document ever exists at the deterministic id —
whichever attempt's write reached Firestore first — which is §8a's
"an existence check preceding the write" option, enforced by the
pre-existing rule rather than by explicit application code. No code
change was required; only the misleading comment in
`AppContext.tsx`'s `recordStockCount` (periodic branch's
`logTimelineEvent` call) and the test's assertion (`assertFails`
instead of `assertSucceeds` on the retry, then asserting exactly one
document still exists) were corrected. See the corresponding commit for
the exact diff.

**Process note carried forward:** this is the reason
`npm run test:periodic-stock-finalization:emulator` and
`npm run test:rules:emulator` were called out as the actual acceptance
gate, not this document's freeze or a clean `tsc --noEmit` — a
Firestore-rules-level property can only be verified against Firestore
rules themselves.

---

## 10. Decision 38 Amendment — Traceability

| New requirement | Decision 38 item | Amended Specification | Rule 8 Assessment |
|---|---|---|---|
| Interruption-durability flush (mechanism, wiring) | (a), (c) | §6, §13 | §5 Finding A1, §7, §11 items 1–2 |
| Firestore persistent local cache (mechanism) | (a), (c) | §6, §12, §13 | §1, §5 Finding A1, §7, §8 |
| App-wide persistent-cache scope, disclosed | (c) | §12 | §8, §12 |
| Residual physical limitation, disclosed | (a) | §6 | §7, §10 |
| Flush joins §4a/§4b cancel/await discipline | (a), (e) | §6 | §5 Finding C1, §9 |
| `newProductInfo` durable draft content | (b) | §5, §14 item 7 | §5 Finding B1, §8 |
| Stale/out-of-order autosave-write serialization | (d) | §6, §14 item 8 | §5 Finding D1, §6 |
| Multi-user/multi-device exclusion, restated | (f) | §5 (unchanged) | §5 Finding E1, §9, §12 |
| Initial Stock exclusion, restated | — | §12 (unchanged) | §12 |
| Business Worth boundary, restated | (e) | §1a, §3 (unchanged) | §12 |
| Additional acceptance criteria (§7 items 7–15) | (a), (b), (d) | §14 items 7–8 | §11 |

No new requirement above lacks a Decision 38 item, an amended
Specification section, and a Rule 8 Assessment section/finding —
satisfying this document's own traceability discipline (§0) for the
amendment as a whole.

---

**This document is a frozen Implementation Task.** Per this project's
established discipline, it is committed and pushed next, then verified
on `origin/main` — only after that verification is actual
implementation (code, rules, or test files) authorized.
