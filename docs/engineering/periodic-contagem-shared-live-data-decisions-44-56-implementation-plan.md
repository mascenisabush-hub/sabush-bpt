Implementation Plan — ✅ ACCEPTED AS GOVERNING PLANNING ARTIFACT — IMPLEMENTATION AUTHORIZATION NOT GRANTED — NO CODE CHANGED

# Implementation Plan — Periodic Contagem Shared Live Data (Decisions 44–56, including the Finding K Mechanism)

**Type:** Governance bridge document — translates the accepted Decisions
44–56, the current Rule 8 reassessment, the Technical Design for
Decisions 44–55, and the Finding K mechanism analysis into a concrete,
file-by-file, dependency-ordered engineering execution plan, ready for
a future Implementation Authorization sign-off. Does not itself
authorize implementation, does not modify code, `firestore.rules`,
schema, UI, or tests, does not reopen or redesign Decisions 44–56, and
does not change the Rule 8 verdict.

**Status:** ✅ **ACCEPTED — GOVERNING PLANNING ARTIFACT FOR DECISIONS
44–56** — 4 September 2026. Acceptance means this Plan is confirmed as
the current, authoritative planning document for this scope (no
duplicate, no competing plan, content reviewed and diff confirmed
clean) — it does **not** mean implementation is authorized.
**Implementation Authorization: NOT GRANTED — remains a separate,
not-yet-created document.** Decision 56 §7's Clear-All-Data
`delete`-path reconciliation (Section 3.2/Area F) remains explicitly
unresolved, exactly as originally documented. Finding K remains
**CONFIRMED FAIL — HIGH, not resolved** (Area G/H), unaffected by this
Plan's acceptance.

**No duplicate found.** An existing
[`stock-count-data-loss-resilience-implementation-plan.md`](./stock-count-data-loss-resilience-implementation-plan.md)
was located in `docs/engineering/` — confirmed, by direct inspection of
its own governing chain, to be scoped exclusively to **Decision 38**
(the original autosave/data-durability work: per-row autosave,
interruption flush, persistent local cache, deterministic finalization
id), already implemented, and predating Decision 44 entirely. It does
not cover, and was never intended to cover, the dual-editor authority
model, conflict semantics, finalization immutability, or cache/session
isolation work Decisions 44–56 govern. **This is therefore a new
Implementation Plan artifact, not an amendment** — it does not
duplicate, does not contradict, and does not alter a single word of
the existing Decision-38 plan, which remains the historical record of
its own, already-completed scope.

**Governing chain:**
[Decision 44](../specs/stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted) → [Decision 44 Refinement](../specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md)
→ [Decision 45](../specs/stock-count-data-loss-resilience-decision-45-amendment.md)
→ [Decision 46](../specs/stock-count-data-loss-resilience-decision-46-amendment.md)
(Dual Active Editor Authority) → [Decision 47](../specs/stock-count-data-loss-resilience-decision-47-amendment.md)
(Shared Live State & Conflict Preservation) → [Decision 48](../specs/stock-count-data-loss-resilience-decision-48-amendment.md)
(Delegated Editor Authority) → [Decision 49](../specs/stock-count-data-loss-resilience-decision-49-amendment.md)
(Former Delegated Editor Reconnection) → [Decision 50](../specs/stock-count-data-loss-resilience-decision-50-amendment.md)
(Exactly-One Finalization) → [Decision 51](../specs/stock-count-data-loss-resilience-decision-51-amendment.md)
(Shared-Device / Cache Isolation Requirements) → [Decision 52](../specs/stock-count-data-loss-resilience-decision-52-amendment.md)
(Viewer Authorization) → [Decision 53](../specs/stock-count-data-loss-resilience-decision-53-amendment.md)
(Finalizer Authorization) → [Decision 54](../specs/stock-count-data-loss-resilience-decision-54-amendment.md)
(Delegated Editor Eligibility) → [Decision 55](../specs/stock-count-data-loss-resilience-decision-55-amendment.md)
(Same-Row Concurrent Observation Conflict Semantics) → [Decision 56](../specs/stock-count-data-loss-resilience-decision-56-amendment.md)
(Finalized Immutability & Clear-All Separation) → [Rule 8 Reassessment](./periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(✅ **READY AFTER DECISIONS**, commit `02cd599` — zero open Product
Architect questions; Finding K **CONFIRMED FAIL — HIGH, not resolved**)
→ [Technical Design for Decisions 44–55](./periodic-contagem-decisions-44-55-technical-design.md)
(commit `96a28eb`) → [Finding K — Cache/Session Isolation Mechanism
Analysis](./finding-k-isolation-mechanism-analysis.md) (commit
`2e875b7`) → **THIS Implementation Plan** → *(next: a separate
Implementation Authorization — not this document)*.

**Repository state at this revision:** `main = origin/main = 02cd599`,
working tree clean prior to this document's own addition. Nothing has
been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or `tests/` to produce this
document.

**This document does not:** modify Decisions 44–56, the Rule 8
reassessment, the Technical Design, the Finding K mechanism analysis,
`firestore.rules`, schema/types, UI, or test code. It does not
constitute Implementation Authorization. It introduces no technical
requirement not already established by the cited governance and design
artifacts — every requirement below is traced to a specific decision
section or Technical Design section, not invented here.

---

## 1. Purpose

This Plan converts the fully-settled governance requirements
(Decisions 44–56) and the finalized technical mechanisms (the
Technical Design for Decisions 44–55, and the Finding K mechanism
analysis) into an exact map of which files change, in what order, and
how each governance requirement is satisfied — so that, once a
separate Implementation Authorization is granted, an engineer can
execute this work without reopening any product decision. It
introduces no new business decision and no new technical direction
beyond what those artifacts already adopted.

---

## 2. Governing Requirements Summary

| Decision | Governs | Status |
|---|---|---|
| 44 | Shared live data, no-silent-loss | ✅ Accepted |
| 46 | Dual Active Editor Authority | ✅ Accepted |
| 47 | Shared Live State & Conflict Preservation | ✅ Accepted |
| 48 | Authority-model governance requirements | ✅ Accepted |
| 49 | Former-Editor reconnection | ✅ Accepted |
| 50 | Exactly-One Finalization | ✅ Accepted |
| 51 | Shared-device/cache isolation | ✅ Accepted |
| 52 | Viewer Authorization | ✅ Accepted |
| 53 | Finalizer Authorization | ✅ Accepted |
| 54 | Delegate Eligibility | ✅ Accepted |
| 55 | Same-Row Conflict Semantics | ✅ Accepted |
| 56 | Finalized Immutability & Clear-All Separation | ✅ Accepted |

**Rule 8 verdict:** READY AFTER DECISIONS (commit `02cd599`). **Finding
K: CONFIRMED FAIL — HIGH, not resolved** — mechanism finalized,
implementation not done. **Implementation Authorization: NOT GRANTED.**

---

## 3. Scope Enumeration

### 3.1 In Scope (planning only — no execution in this document)

Every file/mechanism named in Sections 4–6 below: the authority
document (`contagemAuthority/current`), the additive
`PeriodicStockDraftItem`/meta schema fields, the `firestore.rules`
branches for the delegated Editor / Viewer / conflict / finalization
precondition / finalized-immutability narrowing, the client-side
concurrency (`runTransaction`) rewrite of the draft-row write path, the
conflict-state UI, the authorization-aware listener gating and
fail-closed rendering for Finding K, and the flush-gated opportunistic
logout cache clean.

### 3.2 Out of Scope (explicitly, per the governing constraints)

- Any change to Decisions 44–56's own content.
- Any new Product Architect decision.
- Delegated-Editor revocation-while-offline (K6/K7) **implementation**
  beyond what the authority document's live-read design already
  provides — this Plan implements the mechanism; end-to-end revocation
  behavior verification against a real backend is a Section 7
  verification task, not a design task.
- Any change to Decision 38's already-implemented autosave mechanism,
  beyond the additive fields this Plan requires on the same documents.
- Clear All Data's own future reshaping (Decision 56 §7 leaves this
  open; this Plan implements only Decision 56's *immutability*
  requirement — narrowing `stockCounts` `update` to `false` — and does
  not touch the `delete` path Clear All Data depends on).

---

## 4. Implementation Areas (A–H)

Each area lists: **(1) governance requirement, (2) technical
mechanism/design, (3) affected files/components/rules, (4)
implementation task, (5) verification/test requirement, (6)
dependency/blocker.**

### A. Shared Active Periodic Contagem State

1. **Governance requirement:** Decision 44 (no-silent-loss); Decision
   46 §1 (one business-owned active state; Owner/Admin + at most one
   delegated Editor may edit simultaneously); Decision 47 (live sync is
   the primary conflict-avoidance mechanism).
2. **Technical mechanism:** Technical Design §4 (target architecture),
   §6 (shared live state — reuse the existing meta/items listener
   split; genuine per-row live adoption replacing the passive
   whole-draft notice, protected by a `rowHasUnsavedLocalEdit` flag).
3. **Affected files:** `apps/tenant/src/context/AppContext.tsx`
   (existing `periodicDraftMetaRef`/`periodicDraftItemsRef` listeners,
   ~lines 2194–2248); `apps/tenant/src/components/PeriodicStockCountView.tsx`
   (working-state reconciliation).
4. **Implementation task:** add per-row `rowHasUnsavedLocalEdit`
   local-only tracking; adopt a remote row snapshot immediately unless
   that flag is set for the exact row; reconcile a held-back remote
   candidate at the operator's own next save for that row (Technical
   Design §6).
5. **Verification/test requirement:** Technical Design §18 tests 1–3
   (different rows, same row, general dual-editor case).
6. **Dependency/blocker:** depends on Area B (authority document) and
   Area C (`firestore.rules` widening) existing first — there is no
   authorized second reader/writer to synchronize with until those
   ship.

### B. Authority

1. **Governance requirement:** Decision 46 §1 (Owner/Admin always
   Active Editor; at most one delegated Editor); Decision 48
   (explicit, non-automatic delegation; no automatic takeover; current
   authoritative assignment controls behavior); Decision 49 (a former
   delegate does not regain authority by reconnecting); Decision 54
   (eligibility = currently business-authorized, continuing check).
2. **Technical mechanism:** Technical Design §5 — one new document,
   `businesses/{businessId}/contagemAuthority/current`
   (`delegatedEditorUid`, `assignedByUid`, `assignedAt`), read by
   `isMemberOf`, written only by `isOwnerOf` with a named-uid
   eligibility check; `isCurrentDelegatedEditor(businessId)` /
   `isActiveContagemEditor(businessId)` rules helpers, following the
   existing `isOwnerOrGrantedManager` precedent.
3. **Affected files:** `firestore.rules` (new `match
   /contagemAuthority/current` block + two new helper functions,
   placed near the existing `isOwnerOrGrantedManager` definition);
   `apps/tenant/src/context/AppContext.tsx` (new listener + an
   assignment function, e.g. `assignDelegatedEditor(uid | null)`);
   `apps/tenant/src/types.ts` (new `ContagemAuthority` type).
4. **Implementation task:** create the document/rule/helpers; wire a
   listener into `AppContext` exposing `isCurrentDelegatedEditor`/
   `isActiveContagemEditor` booleans to the rest of the app; build the
   Owner/Admin-only UI affordance to assign/reassign/clear the
   delegate.
5. **Verification/test requirement:** Technical Design §18 tests 5–7
   (revoked while offline, reassigned while offline, A→B→C while
   offline) — client-side behavior testable now; server-side
   rules-rejection outcome needs the real-backend verification named
   in Section 7 below.
6. **Dependency/blocker:** none upstream — this is the foundation every
   other area depends on (Technical Design §20 step 1).

### C. Viewer Authorization

1. **Governance requirement:** Decision 52 (live read access; no write
   access; former delegate remains Viewer unless explicitly
   reassigned; restrictions server-enforced, not UI-only; no new
   role).
2. **Technical mechanism:** Technical Design §13 — Viewer is implicit
   (`isMemberOf(businessId) && !isActiveContagemEditor(businessId)`),
   never stored; read widened from today's `isOwnerOf`-only.
3. **Affected files:** `firestore.rules` (`stockCountDrafts` match
   block and its `items` subcollection — widen `allow read` from
   `isOwnerOf` to `isMemberOf`; every write rule keyed to
   `isActiveContagemEditor` instead of `isOwnerOf`).
4. **Implementation task:** widen the read rule; gate every write rule
   (ordinary row update, conflict transition, resolution, meta write)
   on `isActiveContagemEditor`; no client-side-only restriction is
   sufficient by itself (Decision 52's own explicit requirement).
5. **Verification/test requirement:** Technical Design §18 tests 16,
   23 (Viewer attempts direct write / conflict resolution — both must
   be rejected).
6. **Dependency/blocker:** depends on Area B (the `isActiveContagemEditor`
   helper) existing first.

### D. Concurrent Observation Semantics

1. **Governance requirement:** Decision 47 (no blind last-write-wins;
   detect-and-preserve); Decision 55 (no automatic winner; explicit
   `CONFLICT` state; no settled working quantity while unresolved;
   Owner/Admin or delegated Editor may resolve; Viewer cannot;
   resolution is not a new observation; unresolved conflict blocks
   finalization).
2. **Technical mechanism:** Technical Design §7 (concurrency —
   rules-enforced monotonic `rev` + client-side `runTransaction`
   read-compare-write), §8 (conflict fields embedded on the row
   document, scoped to `quantity` only), §9 (resolution restricted to
   selecting one of the two preserved values).
3. **Affected files:** `apps/tenant/src/types.ts`
   (`PeriodicStockDraftItem` gains `rev?`, `state?`,
   `lastWriterUid?/Role?/At?`, `conflict?`); `apps/tenant/src/context/AppContext.tsx`
   (`savePeriodicStockDraftItem` rewritten from plain `setDoc` to a
   `runTransaction`-based read-compare-write); `firestore.rules`
   (`items/{rowKey}` — ordinary-write branch requiring `rev ==
   resource.rev + 1` and `lastWriterUid == request.auth.uid`; a
   separate conflict-transition branch; a separate resolution branch);
   `apps/tenant/src/components/PeriodicStockCountView.tsx` (render
   `CONFLICT` state and both preserved observations; resolution UI).
4. **Implementation task:** schema fields → rules branches →
   transaction-based write path → UI rendering, in that order
   (Technical Design §20 steps 2–5).
5. **Verification/test requirement:** Technical Design §18 tests 2, 20,
   21, 22, 24 (same-row collision, stale reconnect with no real
   disagreement, resolution by Owner/Admin, resolution by delegate,
   finalization-with-unresolved-conflict rejection); a dedicated
   consistency test that `openConflictCount` always equals the true
   count of `state == 'CONFLICT'` rows (Technical Design §19).
6. **Dependency/blocker:** depends on Area B (authority) and Area C
   (Viewer read access) for the dual-role/Viewer-visibility halves of
   this requirement.

### E. Finalization

1. **Governance requirement:** Decision 50 (Owner/Admin sole finalizer
   restated by Decision 53; exactly one finalization may succeed;
   stale attempts rejected; no draft resurrection); Decision 55 §5
   items 7–10 (unresolved conflict blocks finalization; finalization
   never resolves a conflict; no partial finalization); Decision 56
   (finalized result immutable through normal operations).
2. **Technical mechanism:** Technical Design §11 (reuse the existing
   deterministic `'stockcount-periodic-' + submissionId` id and
   Owner-only create rule, unmodified; add one `&&` clause to the
   `create` rule: `openConflictCount == 0`, read from the meta
   document); §14 (narrow `stockCounts` non-`initial` `update` to
   `false`; leave `delete` as-is pending the Section 3.2/Decision 56 §7
   reconciliation, which this Plan does not decide).
3. **Affected files:** `firestore.rules` (`stockCounts` match block —
   add the `openConflictCount` clause to the existing non-`initial`
   `create` branch; narrow the `update` half of the existing
   `allow update, delete` line, leaving `delete` unchanged).
4. **Implementation task:** add the meta-document `openConflictCount`
   read to the finalization `create` rule; split the existing
   `update, delete` rule into a `update: if false` / `delete:
   unchanged` pair; surface a clear rejection message in
   `PeriodicStockCountView.tsx` when finalization is rejected for this
   reason.
5. **Verification/test requirement:** Technical Design §18 tests 8, 9,
   17, 19, 24 (idempotent retry, pending-write-races-finalization,
   delegate-attempts-finalization rejection, already-finalized
   mutation attempt rejection, unresolved-conflict rejection).
6. **Dependency/blocker:** depends on Area D (the `openConflictCount`
   counter must exist and be transactionally correct before this
   rule can reference it).

### F. Clear-All Separation

1. **Governance requirement:** Decision 56 §5 items 3–5 (Clear All Data
   must not silently delete/mutate finalized history as an unreviewed
   side effect; clearing working/draft state is a distinct concept
   from altering finalized records; any future intentional-removal
   capability must be its own explicit, separately governed
   operation).
2. **Technical mechanism:** Technical Design §14 — the `update: if
   false` narrowing (Area E, item 3 above) already satisfies "not
   editable through normal operations." Decision 56 §7 **explicitly
   does not decide** whether Clear All Data's existing `delete`
   capability must itself be reshaped — this Plan implements only the
   `update` narrowing and leaves `delete` exactly as it is today,
   consistent with that open question.
3. **Affected files:** none beyond the `update`-narrowing already
   listed under Area E — no change to the "Clear All Data" call site
   (`AppContext.tsx` ~line 7372) is planned or authorized by this
   document.
4. **Implementation task:** none beyond Area E's rule change. **No
   implementation task exists in this Plan for reshaping Clear All
   Data's `delete` behavior** — that remains an open question this
   Plan deliberately does not resolve (see Section 3.2).
5. **Verification/test requirement:** confirm the existing "Clear All
   Data" test coverage (if any — `tests/` should be checked for a
   corresponding test at implementation time) still passes unmodified
   after the `update`-only narrowing, since `delete` is untouched.
6. **Dependency/blocker:** depends on Area E's rule change; otherwise
   independent.

### G. Shared-Device / Cache Isolation (Finding K)

1. **Governance requirement:** Decision 51 (business isolation;
   user/session isolation; logout; business switching; offline-state/
   pending-write handling; no discarding of durable historical
   observations; no new authority model; six-point cross-context-
   leakage prohibition).
2. **Technical mechanism (finalized, per the Finding K mechanism
   analysis and Technical Design §12):**
   - Authorization-aware listener attachment — never attach a listener
     for a collection the current session's already-known role/
     business state says it has no standing to read.
   - **Fail-closed, binding requirement:** an authorization-unknown or
     potentially-stale first cache-only (`fromCache === true`)
     emission from a freshly-mounted listener is never rendered —
     rendering is committed only once server-confirmed
     (`fromCache === false`) or the session's own already-known
     role/business state independently establishes entitlement.
   - Extend the existing owner-vs-staff safe-reset-on-error pattern
     (already used by the two Contagem draft listeners) to every
     remaining listener lacking it.
   - `firestore.rules` remains the unchanged authoritative backstop.
   - Opportunistic, flush-gated deep clean on `logout()`: attempt the
     existing `switchShop()`-style flush first; only if it confirms
     durable, follow with `terminate()` → `clearIndexedDbPersistence()`
     → re-`initializeFirestore()`; never run unconditionally.
3. **Affected files:** `apps/tenant/src/context/AppContext.tsx` (every
   `onSnapshot` call site — `unsubWithdrawals` and the other
   Tier-1-style listeners named in the two Finding K verification
   reports, plus the two Contagem draft listeners' existing pattern
   applied consistently; the new `logout()` flush-then-clear
   sequencing); `apps/tenant/src/lib/firebase.ts` (no change to the
   initial `persistentLocalCache` configuration itself — only
   `logout()`'s own sequencing changes).
4. **Implementation task, in dependency order:**
   a. Add a small helper (e.g. `isEntitled(collection, role,
      businessId)`) reusable across every listener call site.
   b. Gate each Tier-1 listener's attachment on that helper.
   c. Add fail-closed first-emission handling: hold a freshly-mounted
      listener's `fromCache === true` first snapshot in a local
      variable rather than committing it to React state until either
      a server-confirmed emission arrives or the helper in (a)
      independently confirms entitlement.
   d. Extend the existing safe-reset-on-permission-error pattern to
      every listener that currently lacks it.
   e. Rewrite `logout()`: attempt flush (reuse
      `pendingContagemFlushRef`-style logic from `switchShop()`) →
      on success, `terminate()` → `clearIndexedDbPersistence()` →
      re-`initializeFirestore()` → `signOut(auth)`; on flush failure
      (genuinely offline), skip the clear and proceed directly to
      `signOut(auth)`.
5. **Verification/test requirement:** see Section H below in full —
   this area's implementation is not complete until Section H's
   real-backend verification passes.
6. **Dependency/blocker:** independent of Areas A–F at the
   authorization-gating level (item 4.a–4.d can proceed immediately);
   item 4.e (the logout flush) depends on the existing
   `pendingContagemFlushRef` mechanism already in `AppContext.tsx`,
   unmodified.

### H. Finding K — Remaining Verification (explicitly not yet done)

Per the Rule 8 reassessment (`02cd599`) and the mechanism analysis's
own §F, the following are **implementation and verification tasks
still required**, listed with their governance/technical basis:

| Item | Governance basis | What must be verified | Status |
|---|---|---|---|
| Shared Contagem visibility with an actual delegated Editor | Decision 46/54 | The fail-closed gate (Area G) introduces no false negative for a genuinely authorized co-editor | Not yet testable — Area B/C not implemented |
| Privileged-data cache isolation | Decision 51 | A privileged collection genuinely never renders to an unauthorized session once Area G ships | Mechanism designed, not implemented |
| Business/session/identity isolation | Decision 51 | Same mechanism as above, varied by business membership and by two real distinct Auth identities | Mechanism designed, not implemented |
| Server-side stale/pending write rejection | Decision 51, Technical Design §10 | What `firestore.rules` actually does with a stale-identity write at send time | UNVERIFIED — no reachable backend in any verification pass to date |
| Delegated Editor revocation | Decision 49 | K6/K7 end-to-end | NOT YET TESTABLE — no delegated-Editor mechanism (Area B) implemented yet |
| Reconnect behavior | Decision 47/49/51 | Client-side confirmed (harness); server-side unconfirmed | Split — see Technical Design §10 |
| Logout/context-switch behavior | Decision 51 | Flush-then-clear sequencing under real network-flakiness, not just the two clean cases reasoned about | Mechanism designed, not implemented |
| Cross-device finalization | Decision 50/53 | Real multi-device finalization race | Existing mechanism (deterministic id), unaffected by this Plan, not independently re-verified this session |
| Conflict behavior | Decision 55 | Full failure-injection suite (Technical Design §18) | Not yet implemented |
| Finalized-state immutability | Decision 56 | `update: if false` narrowing behaves as intended; `delete` reconciliation question remains open | Rule change designed (Area E/F), not implemented |

**None of these items are resolved by this Plan.** This table exists so
that, once implementation begins, none of these verification
obligations can be silently dropped or assumed satisfied by code
review alone.

---

## 5. File-by-File Plan (consolidated from Section 4)

| File | Change | Areas |
|---|---|---|
| `firestore.rules` | New `contagemAuthority/current` match block + 2 helper functions; `stockCountDrafts` read widened to `isMemberOf`; every `stockCountDrafts`/`items` write rule keyed to `isActiveContagemEditor`; new conflict-transition and resolution rule branches; `stockCounts` non-`initial` `create` gains `openConflictCount == 0` clause; `stockCounts` non-`initial` `update` narrowed to `false` (`delete` unchanged) | B, C, D, E, F |
| `apps/tenant/src/types.ts` | New `ContagemAuthority` type; `PeriodicStockDraftItem` gains `rev?`, `state?`, `lastWriterUid?/Role?/At?`, `conflict?`; meta gains `openConflictCount?` | B, D, E |
| `apps/tenant/src/context/AppContext.tsx` | New `contagemAuthority` listener + assignment function; `savePeriodicStockDraftItem` rewritten to `runTransaction`; every `onSnapshot` call site reviewed for Area G gating; `logout()` rewritten with flush-then-clear sequencing | A, B, D, G |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | Per-row `rowHasUnsavedLocalEdit` tracking + remote-candidate reconciliation; `CONFLICT` state rendering; resolution UI; finalization-rejection message for `openConflictCount > 0` | A, D, E |
| `apps/tenant/src/lib/firebase.ts` | No change to initialization; referenced only for the `logout()` sequencing's use of `terminate()`/`clearIndexedDbPersistence()` | G |

**No change is planned to:** `server/index.ts`, `firestore.indexes.json`,
`package.json`, or any file outside `apps/tenant/src/`.

---

## 6. Firestore Rule / Schema / Data-Model Change Inventory

Consolidated from Technical Design §15/§16 — see those sections for
full field-by-field justification. Every field is additive and
backward-compatible (absence defaults to a safe value, matching this
schema's existing `removed`/`validated` discipline). No existing field
changes type, writer, or meaning.

---

## 7. Verification/Test Requirements (consolidated)

- The full 24-scenario failure-injection suite, Technical Design §18.
- The Finding K mechanism analysis's own §F verification plan (7
  items), in particular the real-backend confirmation that the
  fail-closed gate introduces no false negative for legitimate shared
  Contagem access — this is the single test most likely to reveal a
  design flaw if the gate is implemented too aggressively.
- The `openConflictCount` consistency check named in Technical Design
  §19.
- Regression coverage for the existing, already-implemented Decision
  38 autosave/data-durability mechanism (`tests/periodic-*`,
  `tests/business-worth-*`, and related existing suites) — this Plan
  adds fields to documents those tests already exercise; existing
  tests must continue passing unmodified in shape, only extended where
  the new fields are directly relevant.
- **A real (or emulated) Firebase backend is required** for the
  server-side halves of Areas D, E, and G — every verification pass to
  date has run against an isolated, out-of-repository harness with no
  reachable backend (confirmed in both Finding K verification reports).
  This is named here as a concrete environment/tooling prerequisite for
  implementation sign-off, not assumed available.

---

## 8. Implementation Order

Reproduced and consolidated from Technical Design §20, cross-referenced
to Areas A–H:

1. **Authority foundation (Area B)** — `contagemAuthority/current` +
   rules helpers. Blocks everything else.
2. **Data model (Area D, E)** — additive schema fields.
3. **Security rules (Area B, C, D, E, F)** — all `firestore.rules`
   changes, built together since they reference each other's helpers.
4. **Concurrency (Area D)** — the `runTransaction` write path.
5. **Conflict state UI (Area D)**.
6. **Live synchronization (Area A)**.
7. **Offline/reconnect verification (Area D, G)** — testing step, not
   new mechanism.
8. **Finalization (Area E, F)** — UI wiring for the rejection message;
   the Section 3.2/Decision 56 §7 `delete`-path question must be
   reconciled (by whoever holds that decision, not invented here)
   before this step ships.
9. **Cache isolation (Area G)** — independent of steps 1–8 at the
   listener-gating level; can proceed in parallel once Area B exists
   (needed for the "already-known role" check the gate relies on).
10. **Tests (Section 7)** — run throughout, not only at the end;
    the real-backend verification items cannot be signed off without
    an actual reachable backend.

---

## 9. Risks Carried Forward (from the Technical Design and mechanism analysis, not newly identified here)

- Denormalized `openConflictCount` drift risk (Technical Design §19).
- `runTransaction` retry-under-contention (Technical Design §19).
- The fail-closed gate's own dependency on the client's already-known
  role/business state, which can briefly lag a server-side change —
  backstopped by, not replacing, `firestore.rules` (mechanism analysis
  §D).
- The unresolved Decision 56 §7 / Clear-All-Data `delete`-path question
  (Section 3.2/Area F above) — this Plan does not resolve it and flags
  it as a prerequisite for Area E/F's own sign-off, not something an
  engineer should decide unilaterally during implementation.
- No real-backend verification has occurred for any server-side
  behavior this Plan depends on (Section 7).

---

## 10. Traceability

| Decision | Plan Area(s) |
|---|---|
| 44 | A |
| 46 | A, B |
| 47 | A, D |
| 48 | B |
| 49 | B, H |
| 50 | E |
| 51 | G, H |
| 52 | C |
| 53 | E |
| 54 | B |
| 55 | D, E |
| 56 | E, F |

---

## 11. What Remains NOT Authorized

- **Implementation Authorization** — not granted; a separate,
  not-yet-created document.
- **Any code, `firestore.rules`, schema, UI, or test change** — none
  has been made to produce this Plan.
- **The Decision 56 §7 / Clear-All-Data `delete`-path reconciliation**
  — Area F implements only the `update` narrowing; the `delete`
  question remains exactly as open as the Technical Design and Rule 8
  left it.
- **Finding K resolution** — Section 4 Area G/H describe a finalized
  design and a concrete task list; Finding K remains CONFIRMED FAIL
  until implemented and verified per Section 7.
- **Any new Product Architect decision** — none was created; Decisions
  44–56 remain the complete and unaltered governing set.

---

## 12. Next Governance Step

A separate Implementation Authorization document, scoped to this Plan,
signed by the Product Architect, would be the next gate — not created
by, and not implied by, this document. Until then, implementation of
any item in Section 4 remains unauthorized.

**IMPLEMENTATION REMAINS NOT AUTHORIZED.**
