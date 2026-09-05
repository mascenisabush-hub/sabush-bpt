Rule 8 Assessment — FINAL

# Rule 8 Assessment — Periodic Contagem Interruption/Re-Entry Recovery, Authoritative-State Synchronization, and False-Conflict Prevention (Decision 60)

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** This document does not authorize implementation. A separate Implementation Plan and a signed Implementation Authorization remain required, subsequent gates.

**Governing chain:** [Decision 60 Amendment](../specs/stock-count-data-loss-resilience-decision-60-amendment.md) (✅ **ACCEPTED AS PROPOSED** — SABUSHIMIKE MASCENI, Product Architect, 5 September 2026, §12) → **this assessment** → (next: Implementation Plan, then Implementation Authorization — neither exists yet).

**Repository state investigated:** `main` @ `f1b14b567a23fd35315fc94e99cb586c714931b3`, working tree clean, verified via `git fetch` immediately before this assessment was drafted. This is the exact commit that recorded Decision 60's own acceptance. Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `tests/`, or any Decision 38–60 governance artifact to produce this document.

**Confirmed commit history relevant to this assessment (verified fresh, not assumed):**
- Decision 58 (interruption-flush persistence/retry parity): implemented at `333d305`; last touch to `AppContext.tsx` prior to this assessment.
- Decision 59 (CONFLICT-backlog silent-edit-refusal fix): shipped at `4e56521`; governance recorded at `b0c1713`; ratified at `f6126f6`. Touches only `PeriodicStockCountView.tsx` (entry-guard functions and the unified list render) and one test file set. **Closed. Not reopened by this assessment.**
- Decision 60: committed and accepted at `f1b14b5`. No implementation exists yet.
- No commit after `f1b14b5` exists at assessment time.

---

# 1. Executive Determination

## **READY AFTER PRODUCT ARCHITECT DECISIONS**

This is not a rejection of Decision 60 and not a technical blocker. Direct investigation confirms most of Decision 60's requirements are already substantially satisfied by existing, live mechanisms (§3), and the remaining gaps are narrow and well understood (§4). However, two genuine **product-level** questions — not technical questions — must be answered by the Product Architect before an Implementation Plan can be correctly scoped, because the repository evidence shows the current behavior is a deliberate, signed design choice in one case, and a materially significant, previously-undisclosed friction point in the other:

1. **Whether the existing "Retomar Contagem" resume gate, which reappears on every single leave-and-return cycle, satisfies Decision 60 §0 item 1's "no forced restart" requirement, or whether it must be eliminated/streamlined.** This is a product decision about acceptable friction, not a technical unknown (§2.A, below) — this assessment did not know this gate re-triggered on every remount until traced directly in this session, and it materially changes what "already satisfied" means for the single largest requirement in Decision 60.
2. **Whether achieving Decision 60's timestamp-based "entry/edit time" sort mode requires a formal amendment to the already-signed Entry-Order Sort Mode decision (`periodic-contagem-entry-sequence-implementation-authorization.md`, ✅ Accepted and Authorized, 2 September 2026) — it does (§7) — and if so, whether the Product Architect wants that amendment drafted now, deferred, or wants a different sort-mode design that avoids the conflict entirely.**

Neither of these can be resolved by engineering judgment alone without either contradicting a signed decision or silently deciding how much UX friction is acceptable — both are Product Architect calls, exactly the kind Rule 8 is required to surface rather than resolve.

---

# 2. Requirement-by-Requirement Assessment

## 2.A — Requirement 1: Leave-and-return continuity (no forced restart)

**A. Current behavior, confirmed directly:**
`PeriodicStockCountView` is rendered by a plain conditional (`apps/tenant/src/App.tsx:139`, `{!isStaff && activeTab === 'stock-count' && (<PeriodicStockCountView .../>)}`) with no `key` prop or keep-alive wrapper. Switching away from the "stock-count" tab **fully unmounts** the component; switching back **fully remounts** a brand-new instance. Every local `useState`/`useRef` in the file (`catalogRows`, `manualRows`, `activeWorkspaceKey`, `draftBannerDismissed`, `validatedSortMode`, etc.) is wiped and reinitialized from scratch on every such cycle. A hard page refresh behaves identically for the same reason (fresh mount either way).

On mount, `catalogRows` starts empty; a separate effect (`PeriodicStockCountView.tsx`, the effect keyed on `[products]`, ~line 1543) auto-populates one **blank** working row per catalog product — it does **not** read the draft.

Separately, `draftDecisionPending` (`periodicStockCountView.tsx:5420`, `periodicStockDraftLoaded && draftHasMeaningfulContent(periodicStockDraft) && !draftBannerDismissed`) gates the **entire view**: when true, the component renders a full-screen "Descartar Contagem por Terminar?" decision card (~line 5564 onward) in place of the ordinary editing UI, with exactly three actions — "Cancelar", "Retomar Contagem" (`handleResumeDraft`), "Começar Nova Contagem" (`handleDiscardDraft`). **Only after the operator explicitly clicks "Retomar Contagem" does `handleResumeDraft` (line 3303) populate `catalogRows`/`manualRows` with the actual, authoritative draft content** (quantities, validated flags, everything). Because `draftBannerDismissed` is local, ephemeral `useState`, it resets to `false` on every remount — **this decision screen reappears on every single leave-and-return cycle**, not once per session.

Separately again, the live-adoption effect that keeps mounted rows in sync with remote changes (line ~1380) is itself gated on the identical `!draftBannerDismissed` condition — so until the operator dismisses the gate (by resuming or discarding), no live reconciliation happens at all.

**B. Existing mechanism(s):** the draft-resume decision gate (`draftDecisionPending`/`handleResumeDraft`/`handleDiscardDraft`), plus the always-on `catalogRows`/`manualRows` local-state model.

**C. Is the requirement already satisfied?** **Partially, and in a way this assessment can only characterize precisely, not resolve.** No data is ever lost — the underlying draft persists durably regardless of how many times the operator leaves and returns (this part is fully satisfied, and was already true before Decision 60, care of Decision 38/39/41/58). But "no forced restart," read as "the operator should not need to make an explicit decision merely to see their own current work again," is **not** satisfied today: every return requires one explicit click before the operator's own data becomes visible/editable again.

**D. Precise gap:** the resume/discard gate is per-mount, not per-Contagem-lifetime. There is no mechanism that distinguishes "returning after a few seconds' tab switch" from "returning after genuinely walking away" — both are treated identically, and both require the same explicit gate every time.

**E. Risks:** (1) UX friction risk if this gate must be eliminated carelessly — it exists specifically to prevent a silent auto-load from ever discarding an operator's own not-yet-saved in-flight typing without their explicit awareness (a real, previously-fixed failure mode this codebase has already paid for once, per the gate's own governing comments). Any change here must preserve that protection. (2) Product risk if the friction is judged unacceptable and no design is chosen carefully — a wrong fix could reintroduce the exact silent-overwrite risk this gate was built to prevent.

**F. Existing governance constraints:** the gate's own "never silently auto-loaded" discipline is stated explicitly in-line in the code as a deliberate design principle, not an oversight — any change here is a UX/behavior decision, not a pure bug fix.

**G. Is a new mechanism necessary?** Only if the Product Architect decides the per-return gate is unacceptable friction. If the gate itself is judged acceptable (i.e., "no forced restart" is satisfied by "no data loss + one click to resume," which is a defensible reading of Decision 60's own text), **no new mechanism is needed at all for this requirement** — it is already fully built and already safe.

**H. What must happen before implementation:** the Product Architect must decide which reading of "no forced restart" governs. This assessment recommends surfacing this explicitly rather than either engineering silently building a new auto-resume mechanism (risking the exact silent-overwrite problem the current gate prevents) or silently treating the current gate as sufficient (which may not match the Product Architect's actual intent).

## 2.B — Requirement 2: Latest authoritative shared state on return

**A. Current behavior:** the Firestore listeners backing `periodicStockDraftMeta` and `periodicStockDraftItemsByKey` (`AppContext.tsx`, the `onSnapshot` calls at ~lines 2361/2386) live inside one large `useEffect` scoped to `[activeBusinessId]` only (confirmed at `AppContext.tsx:2646`) — **not** to whether `PeriodicStockCountView` is mounted. The same is true of the `contagemAuthority` listener (`AppContext.tsx:2424`, same effect scope). These subscriptions remain live and current for as long as a business is active, regardless of which tab/view is currently rendered.

**B. Existing mechanism(s):** the always-on, business-scoped context-level Firestore listeners; `handleResumeDraft`'s direct read of `periodicStockDraft`/`periodicStockDraftItemsByKey` at the moment it runs.

**C. Is the requirement already satisfied?** **Yes, once the operator dismisses the return-gate in 2.A.** Because the listener never stopped running while the operator was away, `periodicStockDraft` already reflects every other editor's changes made in the interim by the time `handleResumeDraft` reads it. There is no additional reload needed and no staleness window beyond ordinary Firestore listener latency.

**D. Precise gap:** none, given 2.A's gate is dismissed. The only interaction with 2.A is that this freshness is only *visible* to the operator once they click through the gate — the data itself was never stale.

**E–H:** no new mechanism needed. This requirement is already fully satisfied by existing architecture.

## 2.C — Requirement 3: Same-writer correction must never become a conflict

**A. Current behavior, re-confirmed at current `HEAD` (line numbers unchanged since Decision 58 — `AppContext.tsx` has not been touched since):** `savePeriodicStockDraftItem` (`AppContext.tsx:6588`) reads `current` inside its transaction; the "same value" branch (line 6670) advances with no conflict; the very next branch (~line 6686, "Genuine collision") creates a `CONFLICT` on **any** value mismatch — it reads `current.lastWriterUid` only later, to *label* `observationA`, never to *decide* whether a conflict exists at all. This is exactly the same code Decision 59's assessment already found, unchanged.

**B. Existing mechanism(s):** none yet — this is a genuine, confirmed, unaddressed gap.

**C. Is the requirement already satisfied?** **No.**

**D. Precise gap:** the collision branch needs one additional condition — `current.lastWriterUid === currentUser.uid` — checked before treating a value mismatch as a genuine collision.

**E. Risks:** identity spoofing (see F) — none, given the Rules enforcement below. Misclassifying a role change as a same-writer correction — not a risk, since UID (not role) is the correct identity key; a different delegated Editor has a different UID regardless of shared role label.

**F. Existing governance constraints — confirmed, not assumed:** `firestore.rules` (lines 1456, 1469, unchanged since Decision 57, confirmed via `git log`) already enforces `request.resource.data.get('lastWriterUid', null) == request.auth.uid` server-side, against Firebase Auth's own verified UID, for every write to this collection. A client cannot claim a UID that is not its own. A same-writer check keyed on `lastWriterUid` is therefore **not spoofable** — this reasoning is now confirmed twice (once in the prior Decision 59/60 draft, once again fresh in this assessment), not merely assumed.

**G. Is a new mechanism necessary?** Yes — a small, additive one: one new condition in one existing branch.

**H. What must happen before implementation:** Rule 8 concludes this specific piece is fully specified and ready for an Implementation Plan once other Decision 60 items are resolved — no further investigation needed for this piece alone. It must apply identically whether triggered by an ordinary immediate second save or by whatever re-entry/reconciliation mechanism 2.A ultimately uses — since both paths funnel through the same `savePeriodicStockDraftItem` transaction, this is automatic, not something requiring separate wiring.

**Decision 55 impact:** none. This only prevents a false collision from being created in the first place; it does not touch the "genuine collision" branch's own behavior once a *real* two-writer mismatch is detected (unchanged: both observations preserved, `CONFLICT` state, no automatic winner).

## 2.D — Requirement 4: Complete product list must remain visible on return

**A. Current behavior:** the catalog-populate effect (`PeriodicStockCountView.tsx`, keyed on `[products]`, ~line 1543) builds one working row per **every** currently-active product in the catalog (`product.active !== false`), unconditionally, merge-only (an existing row is never dropped, only a hard-deleted/deactivated product is excluded). `unifiedListEntries` (~line 3845) is built from `Object.entries(catalogRows)` filtered only by `!row.removed` — no pagination, no virtualization, no "recently touched only" filter of any kind exists anywhere in this file.

**B. Existing mechanism(s):** the catalog-populate effect; the unfiltered unified-list construction.

**C. Is the requirement already satisfied?** **Yes, already fully satisfied**, both before and after Decision 60. There is nothing in the current architecture that would ever show a partial product list.

**D. Precise gap:** none found.

**E–H:** no new mechanism needed.

## 2.E — Requirement 5: Working position must be recoverable, never a second source of truth

**A. Current behavior:** `activeWorkspaceKey` (`PeriodicStockCountView.tsx:1002`) is a plain, non-persisted `useState<string | null>`, explicitly documented in-line as ephemeral, matching `activeNewManualRowIndex`/`reopenedExistingProductKey`'s own identical pattern. It is wiped on every unmount, exactly like every other local state discussed in 2.A.

**B. Existing mechanism(s):** none for persistence; the pointer concept itself (a `productKeyFor(...)`-keyed string) already exists and is proven safe as a pure navigation pointer — it is never read as a source of quantity/state anywhere in this file; every quantity/state read goes through `catalogRows`/`manualRows`/`periodicStockDraftItemsByKey`.

**C. Is the requirement already satisfied?** **No — confirmed gap.** The pointer exists but does not survive a leave-and-return cycle.

**D. Precise gap:** no durable storage of "which product was last being worked on."

**E. Risks:** if a future mechanism stores this pointer in a way that could be read as authoritative (e.g., inferring quantity from it, or trusting it across a business/device boundary without validation), it would violate Decision 60's own explicit "never a second source of truth" requirement and risk Finding K-adjacent cross-context leakage (§2.K, below). None of that risk exists in the *current* code — it is a risk only for whatever Rule 8/Plan eventually proposes.

**F. Existing governance constraints:** none directly block this; Finding K's own isolation boundary (§2.K) must gate whatever mechanism is eventually chosen.

**G. Is a new mechanism necessary?** Yes, if this requirement is to be satisfied at all — today there is nothing to build on beyond the ephemeral pointer itself.

**H. What must happen before implementation:** Rule 8 does not select the mechanism (per Decision 60's own explicit instruction). This assessment's conclusion is narrower: whatever mechanism is chosen must (a) store only the pointer, never a value, (b) be validated against current `catalogRows`/`periodicStockDraftItemsByKey` on read (a stale pointer to a since-removed/since-finalized product must degrade gracefully, never error), and (c) be evaluated against Finding K's isolation boundary before authorization.

## 2.F — Requirement 6: User-controlled sorting (six modes)

**A. Current behavior:** `validatedSortMode` (`PeriodicStockCountView.tsx:1061`) supports five modes today — `'name-asc' | 'name-desc' | 'value-desc' | 'value-asc' | 'entry-order'` — not six, and not the six Decision 60 names. It is a plain, non-persisted `useState`, explicitly documented as ephemeral ("never persisted... a pure display-order preference"). `'entry-order'` sorts by `entrySequence` (`utils/stockCount.ts:346`), a **session-local integer counter** (`entrySequenceRef`, a plain `useRef<number>`, reset to 0 on every fresh mount) — **not** a timestamp. It is persisted per-row in the draft item (round-tripped through `workingRowToDraftItem`/`draftItemToWorkingRow`), and is re-seeded, on `handleResumeDraft` only, to one past the highest value found among resumed rows (`PeriodicStockCountView.tsx:3345`) — so it survives *if and only if* the operator explicitly resumes (see 2.A); it does **not** reset silently to a wrong value in that case, but it also provides no "oldest/newest" **direction** semantic on its own beyond insertion order.

Separately, every row already carries `lastWriteAt` (`AppContext.tsx`, set on every `savePeriodicStockDraftItem` write, both the "same value" and "genuine collision" branches) — a genuine, server-assigned, per-row wall-clock timestamp, persisted, and already present in the schema today for an entirely different purpose (conflict-observation timestamps).

**B. Existing mechanism(s):** `validatedSortMode` UI/state; `entrySequence` (ordinal, not temporal); `lastWriteAt` (temporal, already in schema, currently used only for conflict bookkeeping).

**C. Is the requirement already satisfied?** **No, on two independent counts:** (1) only five of six modes exist, and the existing "entry-order" mode is ordinal, not the newest/oldest **timestamp** semantic Decision 60 asks for; (2) sort-mode choice itself does not persist across a leave/return.

**D. Precise gaps:**
- No "entry/edit time newest→oldest / oldest→newest" pair as Decision 60 literally describes it (a genuine timestamp ordering).
- Sort-mode preference is not durable across mount cycles.

**E. Risks:** conflating `entrySequence` and `lastWriteAt` carelessly would produce different, occasionally contradictory orderings (a row entered first but edited later would rank differently under each) — the two are not interchangeable, and Decision 60 (§8 item 33 of the governing task) explicitly forbids silently replacing one with the other.

**F. Existing governance constraints — the central finding of this section, §7 below:** the existing Entry-Order Sort Mode decision (`periodic-contagem-entry-sequence-implementation-authorization.md`, ✅ Accepted and Authorized, 2 September 2026) explicitly and deliberately chose `entrySequence` **"never a wall-clock timestamp"** for this exact sorting purpose, as a signed, considered decision — not an oversight. Introducing a genuine timestamp-based newest/oldest mode does not contradict that decision's *existing* mode, but it does add a *new* mode built on the exact mechanism (a wall-clock timestamp) that decision explicitly excluded from the sorting feature it authorized. See §7 for the full analysis.

**G. Is a new mechanism necessary?** For the timestamp-based pair specifically: not a *new* field — `lastWriteAt` already exists — but its use *as a sort key* for this purpose is new, and is gated on the governance question in F. For sort-mode persistence: yes, a small persistence mechanism is needed if the Product Architect requires it (open item, not resolved by this assessment — see §10).

**H. What must happen before implementation:** the Entry-Order Sort Mode question (§7) must be resolved by the Product Architect before an Implementation Plan can correctly scope the sorting requirement. Everything else about sorting (the other four modes, wiring the six-way control, applying it consistently) is otherwise straightforward and blocked only by this one governance question plus the persistence-across-return open item.

## 2.G — Requirement 7: Existing shared editing authority (Decisions 45/46/48/54) remains governed

**A. Current behavior:** `isActiveContagemEditor` (`AppContext.tsx:1302`, `isOwner || isCurrentDelegatedEditor`) is derived fresh on every render from `contagemAuthority` (line 2424's listener — same always-on, business-scoped effect as §2.B, not view-scoped). `assignDelegatedEditor` (`AppContext.tsx:2903`) requires `isOwner` and is the **only** write path to this document; no other code path in the repository writes to `contagemAuthority/current` (confirmed by grep — no automatic/queued reassignment exists anywhere).

**B. Existing mechanism(s):** the live authority listener; the Owner-gated, single-write-path assignment function; `firestore.rules`' own Owner-only enforcement on this document (unchanged since Decision 46/48, not reinvestigated line-by-line in this pass since no code path touches it and none is proposed to).

**C. Is the requirement already satisfied?** **Yes, already fully satisfied.** Because the listener is always-on and `isActiveContagemEditor` is recomputed on every render (never cached at mount), a delegation change made while the operator was away is already reflected the instant they return — with no new mechanism required.

**D. Precise gap:** none for the authority model itself. The only remaining question is a UX/timing one (§2.G continued, below), not an authority-model gap.

**E. Risks:** none identified in the authority model itself.

**F. Existing governance constraints:** Decisions 45/46/48/54 are unaffected — confirmed, this assessment touched none of their own code paths.

**G. Is a new mechanism necessary?** No, for the authority model. Possibly, for the specific UX of what happens to an *already-open* workspace the instant authority is lost mid-session — this is a presentation question (does the workspace close automatically, or only block the next save attempt?), not an authority question, and is an explicit open item (§10).

**H. What must happen:** Rule 8 recommends the simplest safe default — the existing save-time `isActiveContagemEditor` check (already present in `savePeriodicStockDraftItem`/`resolvePeriodicConflict`) already prevents any actual unauthorized write regardless of what the UI shows; a Plan may choose to additionally close/disable an open workspace proactively for polish, but this is not required for correctness and should not block Planning.

## 2.H — Requirement 8: Stale local state must never be treated as newer merely because it is local

**A. Current behavior:** the per-row live-adoption effect (`PeriodicStockCountView.tsx`, ~line 1380) already implements exactly this principle for the **mounted, dismissed-gate** case: an unsaved local edit is protected (never silently overwritten); a `CONFLICT` row is left to the conflict panel; everything else is adopted directly from the server. `savePeriodicStockDraftItem`'s own transaction re-reads the true server value at save time regardless of what the client believed locally, so even a maximally-stale client cannot silently win against a genuine, differing, already-durable server value — a mismatch there is exactly what produces `CONFLICT` in the first place.

**B. Existing mechanism(s):** the live-adoption effect; the transaction's own re-read-at-write-time behavior.

**C. Is the requirement already satisfied?** **Yes, for every case that already exists in the mounted lifecycle.** The only open question is whether a *new* re-entry mechanism (§2.A) introduces a *new* kind of "local state" (e.g., a persisted working-position pointer, or a persisted sort-mode) that could be wrongly treated as authoritative — which is exactly why §2.E and §2.F both explicitly require validation-on-read rather than blind trust.

**D. Precise gap:** none in existing code; a forward-looking constraint on whatever new mechanism Planning proposes.

**E–H:** no new mechanism needed for what exists today; this requirement instead becomes a **design constraint** on the mechanisms chosen for §2.A/§2.E/§2.F.

## 2.J — Requirement 9 (Decision 55 preservation) — assessed together with the conflict-model trace

**A. Current behavior, traced end-to-end:** `savePeriodicStockDraftItem`'s "genuine collision" branch (`AppContext.tsx` ~line 6686) is unchanged since Decision 55/58: on a value mismatch from a **different** writer, both `observationA`/`observationB` are preserved, the row moves to `CONFLICT`, `quantity` itself is left untouched, and `resolvePeriodicConflict` (line 6743) is the sole resolution path, requiring the resolved value to match one of the two preserved observations exactly, gated on `isActiveContagemEditor`.

**B–C.** Fully satisfied today; Decision 60 does not propose changing any of it.

**D. Precise gap:** none — this is a preservation requirement, not a build requirement. The only risk surface is whether the *new* same-writer check (§2.C) or the *proposed* backlog-cleanup action (§2.7-cleanup) could ever be reached for a genuine two-writer case. Both are checked explicitly below (§2.C already confirms the same-writer check is additive and cannot suppress a genuine mismatch since it requires an actual UID match; the backlog cleanup is assessed next).

## Requirement Matrix

| Requirement | Existing Support | Gap | Risk | Governance Impact | Rule 8 Finding |
|---|---|---|---|---|---|
| 1. Leave/return continuity | Partial — draft never lost, but full-screen resume gate reappears every mount | The gate is per-mount, not per-Contagem-lifetime | Low technically; friction risk if "fixed" carelessly | None directly, but any fix must preserve the gate's own "never silent auto-load" principle | Product Architect decision required — is the current gate acceptable? |
| 2. Latest authoritative state on return | Already sufficient — always-on business-scoped listeners | None, once gate dismissed | None | None | Already satisfied |
| 3. Same-writer correction | Insufficient — `lastWriterUid` never checked in collision branch | One additive condition needed | None (Rules prevent UID spoofing) | None — does not touch Decision 55's genuine-conflict branch | Ready for Plan |
| 4. Complete product list | Already sufficient — unfiltered catalog-populate + unified list | None found | None | None | Already satisfied |
| 5. Working position recovery | Insufficient — pointer exists but is ephemeral | No durable storage | Must never become 2nd source of truth; Finding K exposure if mechanism chosen carelessly | Finding K review needed at Plan stage | Ready for Plan, with explicit constraints |
| 6. Six-mode sorting | Partial — 5 modes exist, ordinal not temporal, non-persisted | Timestamp-based pair; sort-mode persistence | Conflating `entrySequence`/`lastWriteAt` | **Prior Entry-Order Sort Mode decision requires formal amendment** (§7) | Product Architect decision required |
| 7. Existing authority model | Already sufficient — always-on listener, single Owner-gated write path | UX-only question (open workspace at authority-loss moment) | None material | None — Decisions 45/46/48/54 unaffected | Already satisfied; minor UX open item |
| 8. Stale-local-state protection | Already sufficient for existing mounted lifecycle | Forward-looking constraint only | Governs future mechanism choices | None | Already satisfied; becomes a design constraint on new mechanisms |
| 9. Decision 55 preservation | Already sufficient — unchanged conflict branch | None | Same-writer check and backlog cleanup must not leak into genuine-conflict cases (confirmed they cannot) | None | Already satisfied |

---

# 3. Existing Mechanisms — Sufficiency Summary

- **Already sufficient:** always-on business-scoped Firestore listeners (draft meta/items, contagem authority); the per-row live-adoption effect; the catalog-populate effect (complete list); the existing authority model; `savePeriodicStockDraftItem`'s genuine-collision preservation logic; `resolvePeriodicConflict`; `firestore.rules`' UID enforcement.
- **Partially sufficient:** the draft-resume gate (solves data-loss, not necessarily UX friction); `entrySequence`-based sorting (solves ordinal sorting, not the newest/oldest timestamp requirement); `lastWriteAt` (exists and is a strong candidate, but its adoption as a sort key is a new, governance-gated use).
- **Insufficient / does not exist yet:** the same-writer UID check in the collision branch; durable working-position persistence; sort-mode persistence; the six-mode sort control itself; the backlog bulk-cleanup action.
- **Unknown, requiring evidence at Plan stage:** the exact mechanism (and its Finding K exposure) for whichever persistence choice Planning makes for working-position/sort-mode — deliberately left open by both Decision 60 and this assessment.

---

# 4. Gaps (confirmed only, none manufactured)

1. `savePeriodicStockDraftItem`'s collision branch does not check `current.lastWriterUid === currentUser.uid`.
2. `activeWorkspaceKey` (and its siblings) do not survive an unmount/remount cycle.
3. `validatedSortMode` does not survive an unmount/remount cycle, and has no timestamp-based mode.
4. No bulk conflict-backlog cleanup action exists (Decision 60 §7 — addressed in §6, below).
5. The draft-resume gate reappears on every leave-and-return, which may or may not be acceptable — genuinely unresolved by evidence alone (a product judgment call, not a missing fact).

No other gaps were found; in particular, requirements 2, 4, 7, 8, and 9 are already fully satisfied by existing architecture and require no new code.

---

# 5. Technical Mechanism Recommendation

Per Decision 60's own explicit instruction, this assessment does not select a persistence mechanism for working-position or sort-mode durability, and does not select how (or whether) the resume-gate friction should be reduced. Where the minimum necessary mechanism *is* clear from the evidence, it is stated:

- **Same-writer fix (gap 1):** the minimum mechanism is exactly what it appears to be — one additional boolean condition in one existing branch, keyed on `lastWriterUid`, mirroring the existing same-value branch's own write shape. No new field, no schema change, no new transaction.
- **Complete product list, authoritative-state sync, authority model, stale-state protection (already satisfied):** no mechanism recommendation needed — existing architecture already provides these.
- **Working-position/sort-mode persistence, resume-gate UX, and timestamp sorting (gaps 2, 3, 5):** correctly left to Implementation Planning, informed by the Product Architect decisions this assessment identifies as prerequisite (§1, §10).

---

# 6. Existing Backlog Cleanup (Decision 60 §7) — Assessed As Written

- **Same-writer backlog rows resolving to the later observation:** safe. `conflict.observationA`/`observationB` each already carry their own `at` timestamp (set at the moment the collision was created); comparing them and picking the later one requires no new data.
- **Blank-vs-real backlog rows resolving to the non-blank observation:** safe. Both observations' `value` fields are already present and directly comparable for emptiness.
- **Genuine two-writer, differing, non-blank observations remaining manual:** confirmed as the correct, and only, residual case — any row failing both of the above criteria is, by construction, a real disagreement between two different people, and Decision 55 requires it stay manual.
- **`resolvePeriodicConflict` reusable without changing its transaction semantics:** confirmed. The function already accepts an arbitrary `resolvedValue` that must match one of the two preserved observations exactly (`AppContext.tsx:6743`, `if (resolvedValue !== observationA.value && resolvedValue !== observationB.value) throw ...`) — a bulk-cleanup caller simply supplies the already-determined correct value (the later timestamp's value, or the non-blank value) as that same parameter, once per qualifying row. No change to the function itself.
- **One-time, operator-triggered cleanup is safe and can remain one-time rather than a background process:** confirmed. Once the same-writer fix (gap 1) and Decision 58's own flush fix are both live, no *new* row can ever enter either backlog category again — the backlog can only shrink, never regrow, so a permanent/scheduled mechanism would have decreasing value over time for increasing complexity, exactly as Decision 60 §7's own reasoning already states.

No implementation of this cleanup is performed here, per instruction.

---

# 7. Prior Sort-Mode Decision — The Critical Governance Point

**7.1 — Exact prior artifact located:** `docs/engineering/periodic-contagem-entry-sequence-implementation-authorization.md` — **"Periodic Contagem Entry-Order Sort Mode (`entrySequence`)."** Status: ✅ **ACCEPTED AND AUTHORIZED. Signed 2 September 2026 by SABUSHIMIKE MASCENI, Product Architect** (one minor correction to an unrelated test-requirement criterion, noted in its own changelog, does not affect this analysis).

**7.2 — Exactly what was previously decided:** an in-session integer counter (`entrySequence`/`entrySequenceRef`), incremented synchronously on each row's first Validar, persisted per-row, re-seeded on resume to one past the highest resumed value — chosen **explicitly and deliberately** "never a wall-clock timestamp" (the document's own words, §1 item 3). This was a considered choice among alternatives, not an oversight: an earlier note in the same lineage (quoted in-line in the current component's own comments) had originally rejected entry-time sorting altogether for lack of "a genuine per-row timestamp," and this authorization is what introduced the ordinal counter specifically as a way to get *an* entry-order signal *without* introducing a timestamp.

**7.3 — Comparison with Decision 60's requirement:** Decision 60 asks for "time of entry/edit... based on the appropriate authoritative timestamp representing the product's latest valid edit" (Decision 60 §5) — a genuine wall-clock ordering, explicitly contemplating `lastWriteAt` as the candidate. This is not the same signal as `entrySequence`, and the two can disagree: a product entered first but edited again later would sort differently under a pure entry-order counter than under a last-edit timestamp.

**7.4 — Can the two coexist?** **Yes, as separate modes — but the *timestamp* mode itself was not authorized by the prior decision, and adding it uses a mechanism (a wall-clock timestamp) that decision explicitly excluded from its own scope.** The prior decision does not forbid *other* modes existing; it specifically constrains what `entrySequence`'s own mode may be built from. Decision 60's timestamp-based pair is additive to, not a replacement of, the existing `entrySequence` mode — but it introduces exactly the mechanism the prior decision's own considered reasoning avoided, for the same general purpose (entry/edit-time ordering).

**7.5 — What formal amendment would be required:** a signed amendment to `periodic-contagem-entry-sequence-implementation-authorization.md` (or a new, small decision that explicitly extends its scope) is needed before Implementation Planning may adopt `lastWriteAt` as a sort key for this purpose — recording that a *second*, timestamp-based mode is now authorized alongside (not instead of) the existing ordinal `entrySequence` mode, and confirming this does not reopen or reverse the original "never a wall-clock timestamp" reasoning for `entrySequence` itself.

**7.6 — Per instruction, this assessment does not draft or sign that amendment, and does not implement a timestamp replacement now.**

---

# 8. Governance Dependencies

- **Entry-Order Sort Mode decision:** requires formal amendment before timestamp-based sorting may be implemented (§7). **Blocking** for Requirement 6 only.
- **Decision 55:** not reopened; every finding above confirms the genuine-conflict branch, no-automatic-winner principle, and manual resolution requirement are all preserved unchanged.
- **Decision 58:** not reopened; its own scope (interruption-flush persistence/retry parity) is confirmed distinct from every function this assessment examined. Decision 58 already fully satisfies the finalization-safety question (§2.J-adjacent, "metaSnap-existence guard") and the flush-side blank-placeholder prevention — Decision 60 does not need to, and must not, duplicate either.
- **Decisions 44–56:** unaffected; the shared-live-data model and conflict semantics are read, not modified, throughout this assessment.
- **Decision 57/Finding K:** not reopened. Finding K's own isolation-mechanism analysis (`docs/engineering/finding-k-isolation-mechanism-analysis.md`) remains a separate, still-unimplemented, design-only artifact — Decision 60 does not solve it and is not required to, but §2.E's working-position mechanism and §2.F's sort-mode-persistence mechanism must each be checked against Finding K's boundary once a specific implementation is proposed, since either could introduce a new cross-session/cross-device state-leak vector if implemented carelessly (e.g., in shared browser storage without per-user/per-business scoping).

---

# 9. Implementation Boundary

**A future Implementation Plan may address:**
- The same-writer `lastWriterUid` check (§2.C) — fully specified, no open governance question.
- The six-mode sort control's UI/wiring for the four already-uncontested modes (name/value, both directions).
- The one-time backlog-cleanup action (§6), once its confirmation-copy question (§10) is resolved.
- A working-position persistence mechanism, subject to the constraints in §2.E and a Finding K review at Plan stage.

**A future Implementation Plan must NOT:**
- Implement timestamp-based entry/edit sorting until the Entry-Order Sort Mode amendment (§7) is signed.
- Modify `resolvePeriodicConflict`'s own transaction semantics.
- Modify the "genuine collision" branch's preservation behavior.
- Modify `firestore.rules`' existing UID enforcement.
- Introduce any automatic authority takeover.
- Assume an answer to the resume-gate friction question (§1) without an explicit Product Architect decision.
- Reopen Decisions 38–58 or Decision 59.

---

# 10. Decision 60 Open Items — Resolved Where Possible

1. **Whether sort-mode choice must persist across return:** **not resolvable from repository evidence alone** — Decision 60's own text does not state this, and no existing precedent settles it either way. Marked for explicit Product Architect decision, not assumed.
2. **Whether the exact §7 bulk-cleanup confirmation copy is a governance blocker:** **no** — this is confirmed as an Implementation-Plan-stage UX detail, not a governance blocker, since Decision 60 §7 itself already specifies exactly which categories may auto-resolve and which must remain manual; only the wording of the confirmation dialog is open.
3. **Exact UX when editing authority is lost:** **not a blocker** — the underlying authorization is already safely enforced at save time regardless of what the UI shows (§2.G); the specific proactive-close-vs-block-on-save UX choice is a Plan-stage polish decision, not a Rule 8 blocker.
4. **Whether `lastWriteAt` is authoritative enough for timestamp sorting:** **conditionally yes** — it is set on every genuine save (`savePeriodicStockDraftItem`, both its same-value and genuine-collision branches) and is not touched by the same-writer fix's own additive branch in any way that would misrepresent it; however, this determination is only meaningful once the governance question in item 5, immediately below, is resolved, since adopting it as a sort key is what requires the amendment.
5. **Whether a formal amendment to the prior Entry-Order Sort Mode decision is required:** **yes, confirmed** (§7). This is the one item in this list that is a genuine blocker, not merely open.

---

# 11. Testing Requirements for a Future Implementation

At minimum, a future Implementation Plan's test suite must cover:
- Leave/return continuity (whatever mechanism the Product Architect approves for the resume-gate question).
- Same-writer correction never producing a `CONFLICT` (and confirming a genuine two-writer mismatch still does).
- Two-editor interleaved changes surfacing correctly to a returning operator.
- Genuine-conflict preservation under every code path touched by this decision (same-writer check, backlog cleanup) — confirming neither can ever auto-resolve a real two-writer, non-blank, differing pair.
- Full catalog restoration on return (regression-guarding the already-satisfied requirement, not merely trusting it stays satisfied).
- Working-position recovery, explicitly including the case where the pointed-to product no longer exists/is finalized.
- All six sorting modes, independently, including a case that would order differently under `entrySequence` vs. `lastWriteAt` (to catch any accidental conflation).
- Cross-device behavior (the always-on-listener model should already generalize, but this must be exercised, not assumed).
- Authority revocation and reassignment while an operator is away.
- Offline/reconnect behavior for both leaving and returning.
- An in-flight retry (Decision 58's own bounded-retry mechanism) still pending at the exact moment of interruption or re-entry.
- Finalization interaction — a returning operator must never be able to resurrect or mutate an already-finalized Contagem (regression-guarding Decision 58's own `metaSnap`-existence guard under this decision's new code paths).
- Shared-device isolation — whatever mechanism is chosen for working-position/sort-mode persistence must not leak across businesses, users, sessions, or shared devices (Finding K boundary).
- The one-time backlog-cleanup action, including confirming it becomes a no-op once the same-writer fix and Decision 58 are both live and no new qualifying rows can be created.

Test design itself is not performed here, per instruction — this is the obligations list only.

---

# 12. Repository Changes Performed By This Assessment

None to application code, `firestore.rules`, `firestore.indexes.json`, or tests. This document itself is the one artifact this Rule 8 stage produces, per this repository's own established convention (e.g., Decision 58's own committed Rule 8 Assessment).

---

RULE 8 DECISION 60 — FINAL STATUS:
READY AFTER PRODUCT ARCHITECT DECISIONS

DECISIONS 38–59:
UNCHANGED / CLOSED

DECISION 60:
ACCEPTED — accepted requirements (§0 items 1–9 of the governing decision) remain unchanged by this assessment; nothing in Decision 60's own text was reinterpreted, narrowed, or expanded.

IMPLEMENTATION:
NOT AUTHORIZED

NEXT GOVERNANCE GATE:
Product Architect decision on the two items in §1 (the resume-gate friction question, and the Entry-Order Sort Mode amendment question) — only after which an Implementation Plan may be correctly scoped. This is not a rejection of Decision 60; every other requirement in it is either already satisfied or fully specified and ready to plan.

REPOSITORY CHANGES:
None to application code, `firestore.rules`, `firestore.indexes.json`, or tests. One new documentary artifact: this Rule 8 Assessment.

COMMITS:
None yet for this assessment document itself — to be committed as a single governance-recording commit, consistent with every prior Rule 8 Assessment in this chain.
