Implementation Authorization

# Implementation Authorization — Contagem Draft Data-Durability and Interruption Resilience (Decision 38)

**Type:** Governance bridge document — the formal record that engineering
governance is complete and implementation would be authorized to
begin, once signed. Does not itself authorize implementation and does
not modify code.

**Status:** 🕓 **Drafted — pending Product Architect signature.** Not
yet authorized. Implementation must not begin until §10 below is
signed by the Product Architect.

**Governing chain:** [Decision 38](../specs/BDR-pending-business-worth-evolution-measurement-model.md)
("Contagem Draft Data-Durability and Interruption Resilience —
Extension of Decision 29", APPROVED AND SIGNED) → [Stock Count
Data-Loss Resilience Specification](../specs/stock-count-data-loss-resilience-specification.md),
as amended (commit `781fbfc`) → [Rule 8 Assessment](./stock-count-data-loss-resilience-rule8-assessment.md)
(✅ **READY FOR IMPLEMENTATION**, commit `570bb2b`) → [Implementation
Task](../specs/stock-count-data-loss-resilience-implementation-task.md),
as amended (commit `19c7fa7`) → [Implementation Plan](./stock-count-data-loss-resilience-implementation-plan.md)
(drafted, commit `6c66bc5`, companion document) → **THIS Implementation
Authorization** (drafted, unsigned) → *(next: implementation, once
signed — not this document)*.

**Precedent note:** this document's structure follows the most
directly comparable precedent in this repository,
[`initial-stock-accidental-confirmation-recovery-implementation-authorization.md`](./initial-stock-accidental-confirmation-recovery-implementation-authorization.md)
(same Contagem/Initial-Stock draft-durability domain, signed and
Authorized) — adapted to Decision 38's actual scope and governing
chain, not copied verbatim.

**Repository state at drafting:** `main = origin/main =
6c66bc55d9f101a57fdd9a6e77714808f238d0d5`, working tree clean,
confirmed immediately before this document was drafted. **Nothing has
been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, `tests/`, Decision 38, the
amended Specification, the Rule 8 Assessment, the amended
Implementation Task, or the Implementation Plan to produce this
document.**

**This document does not:** modify Decision 38, the amended
Specification, the Rule 8 Assessment, the amended Implementation Task,
the Implementation Plan, `firestore.rules`, `firestore.indexes.json`,
`package.json`, or any application or test code. It does not itself
constitute a signature — §10 below remains unsigned, and implementation
remains not authorized, until the Product Architect explicitly signs
it, separately from this drafting session.

**No duplicate:** no existing Implementation Authorization for this
capability was found in `docs/engineering/` prior to this document.

---

## 1. Governance Completeness — What This Record Confirms

**Business Decision → Specification → Rule 8 → Implementation Plan →
Authorization (this document) → Implementation**

| Stage | Document | Status |
|---|---|---|
| Business Decision | Decision 38 (`BDR-pending-business-worth-evolution-measurement-model.md`) | ✅ Approved and signed, SABUSHIMIKE MASCENI |
| Specification | Stock Count Data-Loss Resilience Specification, as amended | ✅ Frozen — Specification → Implementation authorized (commit `781fbfc`) |
| Rule 8 | Rule 8 Assessment | ✅ Assessed — **READY FOR IMPLEMENTATION**, no remaining Product Architect decision (commit `570bb2b`) |
| Implementation Task | Implementation Task, as amended | ✅ Amended (commit `19c7fa7`) |
| Implementation Plan | Implementation Plan (companion) | ✅ Drafted (commit `6c66bc5`) |
| **Authorization** | **This document** | 🕓 **Drafted — unsigned, not yet authorized** |
| Implementation | *(not started)* | ⛔ Not authorized to begin |

## 2. What This Authorization Would Cover (Once Signed)

Every item traces to a specific Decision 38 item, amended
Specification section, Rule 8 Assessment finding, and Implementation
Plan element — see §4 for the full traceability chain. Reproduced here
directly from the Implementation Plan's §2.1, unchanged:

1. **Firestore persistent local cache** (`apps/tenant/src/lib/firebase.ts`):
   replace `getFirestore(app)` / `getFirestore(app, databaseId)` with
   `initializeFirestore(app, { localCache: persistentLocalCache({
   tabManager: persistentMultipleTabManager() }) }, databaseId)`,
   preserving the existing conditional `databaseId` argument
   unchanged. **Explicitly app-wide by construction** — there is no
   SDK-level way to scope this to Periodic Contagem alone (Rule 8
   Finding A1, §8).
2. **Draft schema addition** (`apps/tenant/src/types.ts`):
   `PeriodicStockDraft` gains one new optional field,
   `newProductInfo?: Record<string, { purchaseUnit: string;
   purchaseCost: string; relationshipSteps: { unit: string; factor:
   string }[] }>`, structurally identical to the existing in-memory
   shape (Rule 8 Finding B1).
3. **`savePeriodicStockDraft` extension** (`apps/tenant/src/context/AppContext.tsx`):
   accept and conditionally spread the optional `newProductInfo`
   parameter, never assigned the literal value `undefined`.
4. **Stale/out-of-order autosave-write serialization**
   (`apps/tenant/src/components/PeriodicStockCountView.tsx`,
   `scheduleDraftSave`'s debounce-timer callback): await
   `draftInFlightSaveRef.current` before issuing its own write (Rule 8
   Finding D1) — no new schema field, no change to the existing
   full-document-overwrite write shape.
5. **`newProductInfo` plumbing** through `scheduleDraftSave`'s existing
   call sites and the `handleResumeDraft` ("Retomar") handler, so
   ordinary autosave and draft resume both carry this content
   alongside catalog/manual rows.
6. **Interruption-durability flush** (`PeriodicStockCountView.tsx`): a
   new `flushInFlightSaveRef` ref and `flushPeriodicDraftNow()`
   function, wired to `visibilitychange` (on
   `document.visibilityState === 'hidden'`) and `pagehide`, cancelling
   any pending debounce before issuing its own immediate write (Rule 8
   Finding A1, §7).
7. **Finalization-safety integration** (`handleConfirmSave`): a fourth
   step appended to the existing three-step cancel/await sequence —
   `await flushInFlightSaveRef.current` — run before `recordStockCount`
   is called, closing the exact resurrection-defect shape (Rule 8
   Finding C1) against this new write path.
8. **The required tests**, per the Implementation Plan's §7: four
   source-level regression guards (flush event wiring; flush
   cancel-before-write; `handleConfirmSave` awaits the flush ref;
   `scheduleDraftSave` awaits the in-flight ref), two
   Firestore-emulator-backed tests (`newProductInfo` round-trip;
   backward compatibility for a pre-existing draft without the field),
   one firebase-initialization verification, a full existing-suite
   regression run (both tiers, unmodified), and one manual
   private-browsing/IndexedDB-restricted verification.

**No `firestore.rules` change is expected** — the existing
`stockCountDrafts/{draftId}` block already covers the additional field
with zero rule-text changes (Rule 8 §8, Implementation Task §5b).

**No `firestore.indexes.json` change is expected** — `newProductInfo`
is never queried, filtered, or sorted on; the periodic draft remains a
single-document read/write by fixed id (Implementation Plan §5). To be
confirmed against the final implementation, not re-decided by this
authorization.

## 3. What This Authorization Would Not Cover

Every exclusion below is preserved exactly as the amended
Specification's §12 Non-Goals, the Rule 8 Assessment's §12 Scope
Boundaries, the amended Implementation Task's §8 (including its
Decision 38 extension), and the Implementation Plan's §2.2 already
establish — none invented here:

- **Any change to `InitialStockCountView.tsx` or `saveInitialStockDraft`** — zero code changes; its existing `flushDraftNow`/`visibilitychange`/`pagehide` implementation remains design precedent only, never shared code.
- **Any shared-hook or shared-utility extraction** between the initial and periodic draft mechanisms.
- **Any `firestore.rules` or `firestore.indexes.json` change.**
- **Any change to `addMultipleStockBatches`/`purchaseDrafts`.**
- **Any change to `recordStockCount`'s semantics, confirmed `StockCount` semantics, Business Worth calculation, or FR-34's draft/confirmed valuation boundary** — every mechanism in §2 above operates exclusively on the unconfirmed periodic draft.
- **Any authorization of multi-user or multi-device collaborative editing** of the same periodic draft — `persistentMultipleTabManager` coordinates Firestore's local cache across multiple tabs of the *same user's own browser/device only*.
- **Any router-level or global "unsaved changes" navigation guard** beyond the narrow Contagem-draft flush in §2 item 6.
- **Any new component-test harness** (jsdom/testing-library/React-DOM).
- **Any representation of the system as providing a mathematically absolute zero-data-loss guarantee** (§6 below).
- **Any new business rule** beyond BDR-0009, the Simplification Amendment, and Decisions 37/38 themselves.
- **Any migration or backfill** of any existing `stockCountDrafts/periodic` document.
- **Any unrelated schema change** — no field beyond the one named in §2 item 2 is authorized on any type.
- **Any additional Product Architect business decision** — none is needed; the Rule 8 Assessment found every question resolved, with no remaining Product Architect decision (§13 of that document).
- **Any expansion of this feature beyond Decision 38's items (a)–(f)** — this authorization's scope is exactly, and only, what §2 above lists.

## 4. Decision 38 → Implementation Traceability

| Decision 38 item | Amended Specification | Rule 8 Finding | Authorized Implementation Consequence |
|---|---|---|---|
| (a) Interruption-durability outcome | §6 | Finding A1 | Combined flush + Firestore persistent local cache mechanism, §2 items 1, 6 |
| (b) `newProductInfo` in durable draft | §5 | Finding B1 | Additive optional field, §2 items 2–3, 5 |
| (c) Mechanism left to engineering | §6, §12, §13 | Finding A1, §7 mechanism assessment | Navigation/unload flush + persistent local cache selected as the strongest achievable combination with this stack |
| (d) Stale/out-of-order write protection | §6 | Finding D1 | Await-in-flight-before-issuing serialization, §2 item 4 |
| (e) Draft-vs-confirmed distinction preserved | §1a, §3 (unchanged) | §12 | No change to `recordStockCount`, Business Worth, or finalization semantics |
| (f) Multi-user/multi-device exclusion preserved | §5 (unchanged) | Finding E1 | `persistentMultipleTabManager` restated as same-user/multi-tab only, never multi-device |
| App-wide persistent-cache scope | §12 | §8, §12 | Explicitly disclosed, not silently absorbed, §2 item 1 |
| Resurrection-shaped defect against the new flush path | §6 | Finding C1 | Flush joins the existing §4a/§4b cancel/await discipline, §2 item 7 |
| Residual physical limitation | §6 | §7, §10 | Explicitly preserved, never claimed away, §6 below |

## 5. Risk Acknowledgment

Carried forward from the Rule 8 Assessment and the Implementation
Plan's §9, restated as the sign-off checklist for this authorization:

- **App-wide Firestore-initialization blast radius is the single
  highest-leverage change in this authorization** — every read/write
  in the tenant app runs through the same shared `db` instance once
  reconfigured. Mitigated by requiring the full existing regression
  suite (both tiers, unmodified) to pass against this change in
  isolation before any feature-specific code is layered on top
  (Implementation Plan §10, Step 1/10).
- **The interruption-durability flush introduces a genuinely new
  pending-write handle** — if not joined to the existing §4a/§4b
  cancel/await discipline, the same class of resurrection defect the
  Initial Count workflow already has could recur against this new
  path. This authorization requires the dedicated finalization-safety
  integration (§2 item 7) and its own source-level regression guard
  (Implementation Plan §7, item 3) as a condition of considering this
  item complete, not merely desirable.
- **Browser-lifecycle-event reliability is not uniform across
  browsers** — `visibilitychange`/`pagehide` are preferred over
  `beforeunload` precisely because some browsers do not reliably fire
  the latter, but even the preferred pair is not universally
  guaranteed. This authorization does not require, and implementation
  must not claim, a stronger guarantee than the browser/SDK can
  actually provide (§6 below).
- **Firestore local cache unavailable/restricted in private browsing**
  — the SDK's documented behavior is to fail open (memory/
  network-only), not to throw, but this authorization requires this to
  be directly, manually observed during implementation (Implementation
  Plan §7, item 10), not merely assumed from SDK documentation.

## 6. Residual Physical Limitation — Preserved, Not Weakened

**This authorization does not permit any claim of mathematically
absolute zero data loss.** If an instantaneous power, battery, or
blackout event occurs before JavaScript executes at all, and before
the specific edit in question has been locally enqueued — i.e.,
neither the ordinary debounce nor the interruption flush has yet fired
for that edit — no client-side web mechanism, including the one this
authorization would enable, can guarantee recovery of that edit. This
is a physical limitation of the browser/JavaScript execution model,
not an engineering shortfall. The engineering goal this authorization
covers is to minimize the loss window and protect every interruption
scenario the browser/SDK can technically protect — not to close the
irreducible case above. No implementation produced under this
authorization may represent the system otherwise, in code comments,
UI text, or user-facing documentation.

## 7. Rollback / Reversibility

Every change this authorization would cover is additive and
independently reversible, with no destructive migration required in
either direction:

- **`newProductInfo`** is a new, optional schema field — reverting the
  code that writes/reads it leaves any already-persisted values inert
  (harmlessly present, simply unread) in existing drafts; no data loss
  or migration is required to roll forward or back.
- **The interruption-durability flush** is purely additive event
  listeners and a new function — removing them returns the component
  to its pre-amendment, debounce-only behavior. No persisted state
  depends on the flush having existed.
- **The autosave-write serialization** is an ordering change inside an
  existing function — reverting it returns to the previously-shipped
  issue-order behavior, a strict subset of current behavior, with no
  change to what is written.
- **The Firestore persistent local cache** is a one-line change to
  `db`'s construction in `lib/firebase.ts` — reverting to
  `getFirestore(...)` requires no data migration; the IndexedDB cache
  is purely client-side and is simply unused (not corrupted or
  orphaned in any way that affects server data) if the setting is
  reverted.

No `firestore.rules` or `firestore.indexes.json` change is introduced
in either direction, so rollback carries zero security-rules risk.

## 8. Acceptance Criteria (Would Govern Implementation Completion)

Extracted directly from the amended Implementation Task's §7 items
7–15 — none invented beyond what that document and the Rule 8
Assessment already support. See the Implementation Plan's §4 for the
full mapping; restated here as the sign-off checklist:

1. `PeriodicStockCountView.tsx` wires both `visibilitychange` and
   `pagehide` to `flushPeriodicDraftNow` (Task §7 item 7).
2. `flushPeriodicDraftNow` cancels the pending debounce before issuing
   its own write (Task §7 item 8).
3. `handleConfirmSave` awaits `flushInFlightSaveRef.current` before
   calling `recordStockCount` (Task §7 item 9) — the single most
   safety-critical criterion in this authorization.
4. `scheduleDraftSave`'s timer callback awaits
   `draftInFlightSaveRef.current` before issuing its own next write
   (Task §7 item 10).
5. A draft including `newProductInfo` round-trips unchanged through a
   Firestore-emulator-backed write/read (Task §7 item 11).
6. A pre-existing draft written without `newProductInfo` reads back
   with the field correctly absent/empty, not erroring (Task §7 item
   12).
7. `initializeFirestore` is confirmed called with `localCache:
   persistentLocalCache({ tabManager: persistentMultipleTabManager()
   })`, and the full existing test suite (both tiers, unmodified)
   passes (Task §7 item 13).
8. Private-browsing/IndexedDB-restricted behavior does not crash the
   application, confirmed by direct manual verification (Task §7 item
   14).
9. `tests/initial-stock-confirmation.test.ts` remains unaffected,
   re-confirmed specifically for this amendment given `lib/firebase.ts`
   is now a shared file every existing test touches indirectly (Task
   §7 item 15).
10. **Every acceptance criterion already governing this capability's
    original mechanism (Implementation Task §7 items 1–6) continues to
    pass unmodified** — this authorization extends, and does not
    reopen or relax, the finalization-integrity and resurrection-
    protection guarantees already implemented and tested.
11. No `firestore.rules` or `firestore.indexes.json` change is present
    in the implementation diff.
12. `InitialStockCountView.tsx` shows zero code changes in the
    implementation diff.
13. No Business Worth calculation file shows any change in the
    implementation diff.

---

## 9. Explicit Gate Statement

**Only as of §10's signature below would implementation of this
feature, strictly within §2's scope and §3's exclusions, be
authorized.** As of this drafting, no code, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or test file has been
created, modified, or committed to produce this document or its
companion Implementation Plan — that remains true as of this
document's filing; implementation is the next, separate execution step
a signature would enable, not something this document itself performs.

## 10. Product Architect Signature

**Status:** 🕓 **Not signed. Not authorized.**

**Product Architect:** *(pending — no signature has been provided in
this session)*

**Date:** *(pending)*

**Authorization decision:** *(pending — no verbatim authorization
statement has been given)*

**To be confirmed as part of signature, once given:**

- [ ] This authorization's scope (§2) is approved as stated.
- [ ] This authorization's exclusions (§3) are approved as stated.
- [ ] The app-wide Firestore-persistent-local-cache consequence (§2
      item 1, §5) is acknowledged as a disclosed, unavoidable
      consequence of the authorized mechanism, not an oversight.
- [ ] The residual physical limitation (§6) is acknowledged and will
      not be represented otherwise in any implementation artifact.
- [ ] No additional scope change is required beyond what §1–§8 of this
      document describe.

---

**This document, unsigned, does not authorize implementation.** No
code has been written and no schema, `firestore.rules`, or
`firestore.indexes.json` change has been made as of this filing.
Implementation must not begin until §10 above is completed by the
Product Architect.

**Lifecycle:** Drafted (this document) → Product Architect review →
Signature (not yet given) → Authorized (not yet reached) →
Implementation (not started). **Coding must not begin under this
document as currently filed.**
