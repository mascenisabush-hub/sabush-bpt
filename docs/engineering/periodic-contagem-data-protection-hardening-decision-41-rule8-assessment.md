Rule 8 Assessment — FINAL

# Rule 8 Assessment — Data Protection Hardening (Decision 41)

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** Verdicts
confirmed following Decision 42's resolution of the two items
originally marked READY AFTER DECISION. This document does not
authorize implementation; a separate Implementation Plan and a signed
Implementation Authorization remain required, subsequent gates.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 40 amendment](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 41 amendment](../specs/stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted and Authorized — governance decision stage only —
SABUSHIMIKE MASCENI, Product Architect, 2 September 2026) → this
assessment (originally drafted with 41A/41C marked READY AFTER
DECISION) → [Decision 42 amendment](../specs/stock-count-data-loss-resilience-decision-42-amendment.md)
(✅ Accepted and Authorized — governance decision stage only —
SABUSHIMIKE MASCENI, Product Architect, 2 September 2026 — resolved
both open items) → **this finalization**.

**Repository baseline:** `main = origin/main = b242d34` (Decision 41,
this assessment's original draft, and Decision 42 all merged to
`main` in that single commit). No application code implementing any
part of Decision 41 or Decision 42 exists yet at this baseline —
both remain governance text only.

**Scope of this assessment:** exactly Decisions 41A–41E, as accepted.
41F (browser teardown verification) and 41G (same-row concurrent
editing) remain explicitly out of scope — both remain recorded,
non-blocking concerns per Decision 41's own text, unchanged and not
converted to implementation scope by Decision 42 or by this
finalization. This assessment does not reopen Decisions 38, 39, or
40; their existing mechanisms are the fixed baseline every finding
below is measured against.

**What changed in this finalization, precisely:** §B (41A) and §D
(41C) below are updated to reflect Decision 42's resolution of the
exact questions this assessment's own original §R raised. §C (41B),
§E (41D), and §F (41E) are unchanged from the original draft — none
of their findings, evidence, or verdicts are reopened or redesigned
here. §Q (verdict table) and §R are updated accordingly. No other
section's factual content is altered.

---

## A. Authority Reviewed

Read fresh from the repository this session:

- `docs/specs/stock-count-data-loss-resilience-decision-41-amendment.md` — the accepted Decision, in full, including its explicit non-goals (§4) and "what this does not change" (§5).
- `docs/specs/stock-count-data-loss-resilience-decision-39-amendment.md` and `-decision-40-amendment.md` — re-confirmed as unmodified baseline.
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — the shop-switch reset effect, the unmount-flush effect, `scheduleRowDraftSave`, `handleResumeDraft`, the auto-populate effect, the derived-list `useMemo`.
- `apps/tenant/src/components/InitialStockCountView.tsx` — the equivalent shop-switch reset effect, `latestFlushArgs`, `flushDraftNow`, the existing `visibilitychange`/`pagehide` effect and its cleanup.
- `apps/tenant/src/components/ShopSwitcher.tsx` — `handleSwitch`, the actual UI call site for `switchShop`.
- `apps/tenant/src/context/AppContext.tsx` — `switchShop`, `savePeriodicStockDraftItem`/`Meta`, `flushPeriodicStockDraftRows`, the periodic/initial draft `onSnapshot` listeners and their error callbacks, the `businesses/{id}` listener's existing `err.code === 'permission-denied'` handling (§C below), `subscriptionBlocksNewRecords`.
- `firestore.rules` — `isOwnerOf`, `subscriptionAllowsNewRecords`, the `stockCountDrafts/{draftId}` match block (read vs. create/update).
- `tests/firestore-rules.test.ts` — the `stockCountDrafts` describe block, including the existing subscription-blocked delete test.
- `tests/periodic-stock-shop-switch-guard.test.ts`, `tests/periodic-stock-interruption-durability.test.ts` — existing coverage inventory.

---

## B. Decision 41A — Business-Switch Protection: Fresh Trace

**Mechanism as currently implemented (both views), unmodified baseline:**

```javascript
useEffect(() => {
  const result = detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId);
  if (!result.shouldResetSelection) return;
  setLoadedForBusinessId(result.loadedForBusinessId);
  setCatalogRows({}); setManualRows([]);
  rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
  rowDebounceTimersRef.current.clear();
}, [activeBusinessId]);
```

This effect's dependency array is `[activeBusinessId]` — it runs **after** `activeBusinessId` has already changed to the new business. At the moment this effect body executes, `loadedForBusinessId` (React state, not yet updated) still holds the *old* business id; `activeBusinessId` (read live from `useApp()`) already holds the *new* one.

**Item 11/12 — CRITICAL FINDING: can a flush write to the wrong business?**

`savePeriodicStockDraftItem`, `savePeriodicStockDraftMeta`, and `flushPeriodicStockDraftRows` (`AppContext.tsx`) each resolve their Firestore path from `activeBusinessId` read live from the enclosing `AppContext` closure at call time — none accept an explicit `businessId` parameter. **If a future implementation naively calls the existing `flushPeriodicDraftNow` (or the Initial equivalent) from inside this same reactive effect, after `activeBusinessId` has already changed, it will write the OLD business's pending row data into the NEW business's Firestore path** (`businesses/{NEW activeBusinessId}/stockCountDrafts/periodic/items/{rowKey}`), because that is the only `businessId` those functions can currently resolve. This is a genuine, confirmed, cross-tenant data-contamination risk in the naive implementation of exactly what Decision 41A's text describes ("flush... using the existing persistence mechanism") if that flush is triggered from this specific effect, at this specific point in its lifecycle, without further change.

**Item 10 — a safer integration point exists and is already architecturally supported.** `switchShop(businessId)` (`AppContext.tsx:2352`) is `async` and does `await updateDoc(doc(db, 'users', currentUser.uid), { activeBusinessId: businessId })` — it is the write that *eventually* propagates through the `userProfile` listener to change `activeBusinessId`. Its sole current call site, `ShopSwitcher.tsx:45` (`await switchShop(businessId)`), already awaits it. This means a flush issued **before** calling `switchShop()` — while `activeBusinessId` is still the old business — would resolve the correct Firestore path with no risk of cross-tenant writes, because the business identity hasn't changed yet at that point. This is evidence that a structurally safe implementation path exists; it is not evidence that Rule 8 is choosing it, per the instruction not to design the implementation.

**Item 13 — architectural tension this creates.** `ShopSwitcher.tsx` is a generic, decoupled component with no current knowledge of whether `PeriodicStockCountView`/`InitialStockCountView` is mounted or holds pending work. The "safe" integration point (before `switchShop()`'s write) is not co-located with the two views needing protection; the "currently planned" integration point (the reactive effect, already present in both views) is co-located but carries the contamination risk documented above. **Two structurally different candidate approaches exist, and choosing between them is a genuine design decision, not a detail:**

- **Approach 1 — pre-switch flush via coordination.** Introduce a mechanism (e.g., a ref/callback the active Contagem view registers, that `ShopSwitcher`'s `handleSwitch` consults and awaits before calling `switchShop()`). Avoids the contamination risk entirely by flushing while `activeBusinessId` is still correct. Requires new coordination surface between two currently-unrelated components.
- **Approach 2 — reactive in-effect flush with an explicit businessId.** Keep the flush inside each view's own reactive effect, but capture the *old* business id (already available as `loadedForBusinessId` at the top of the effect, before it's overwritten) and pass it explicitly to a save-path variant that writes to that captured id rather than reading `activeBusinessId` live. Requires the save functions (or a dedicated variant) to accept an explicit `businessId` parameter — a signature change `savePeriodicStockDraftItem`/`flushPeriodicStockDraftRows` do not currently have.

Both were, at the time of the original draft, legitimate, evidence-supported options between which this assessment did not recommend one.

**Item 13 — race conditions in `detectShopSwitch` itself.** `detectShopSwitch` (`shopSwitchGuard.ts`) is a pure function performing simple value equality (`activeBusinessId === loadedForBusinessId`); no race condition was found in the function itself. The risk identified above is not in this function but in what the *consuming* effect does once a switch is detected.

**Item 7 — concurrent business-switch behavior.** Not established from code: what happens if an operator triggers a second switch before a first switch's flush (once implemented) has completed. This remains a genuine open question for the Implementation Plan — Decision 42 did not resolve it and did not need to; it is recorded here as an implementation-planning question, not a Rule 8 blocker (per Decision 42A's own text: "the future Implementation Plan must determine the exact coordination mechanism and its lifecycle behavior").

**Item 14/15 — test coverage.** `tests/periodic-stock-shop-switch-guard.test.ts` exists but (confirmed in the prior forensic audit and re-confirmed here) contains no assertion about flush-before-reset — it tests the pure `detectShopSwitch`/`isBusinessDataReady` functions, not the reactive effect's write behavior. No equivalent test file exists for Initial Stock Count's shop-switch behavior at all. New tests required at minimum: (a) a flush issued before a switch writes to the *old* business's path, never the new one; (b) a failed flush surfaces the required operator-facing state rather than silently proceeding; (c) existing write serialization (`draftInFlightSaveRef`-equivalent) is respected by whatever new flush call is added; (d) coverage for both Periodic and Initial Stock Count. None of these tests are created by this finalization.

**Item 16/17 — performance/regression.** Negligible added latency in the successful case (one network round-trip, already an accepted cost for the identical unmount-flush mechanism under Decision 39). Regression risk, under the now-accepted direction, is low: Decision 42A commits to the coordinated pre-switch flush (Approach 1) specifically because it structurally avoids the cross-tenant-write scenario, rather than requiring a save-function signature change to avoid it defensively (Approach 2).

**Decision 42A resolution, applied.** Decision 42 (§2, "42A — Business-Switch Protection: Architectural Direction") accepted **pre-switch flush via coordination** as the architectural direction, and explicitly foreclosed the unsafe pattern this assessment identified. Restated exactly as Decision 42 requires:

- The flush occurs **before** the business switch is committed — specifically, before `switchShop()`'s own `updateDoc` call, per this assessment's own tracing of that function (item 10, above) — not from inside the reactive `[activeBusinessId]` effect after the value has already changed.
- The old business id remains the active business id at the moment the flush's persistence operation resolves its Firestore target path — the exact invariant this assessment's item 11/12 finding required.
- The existing Decisions 38–40 persistence/serialization mechanisms (per-row draft documents, `draftInFlightSaveRef`/`flushInFlightSaveRef` write serialization) remain the foundation this coordination is built on, not around.
- This applies identically to Periodic Stock Count and Initial Stock Count.
- If no pending work exists at the moment of a switch, no unnecessary flush is performed; if pending work exists, persistence is attempted before the switch proceeds.
- A failed flush must not silently discard pending work or silently allow the switch to proceed as though the work were saved — Decision 41A's original hybrid failure behavior (operator informed, given an explicit, understandable choice) is preserved unchanged by Decision 42B.
- The exact coordination mechanism (the "minimum necessary communication surface between `ShopSwitcher` and the active Contagem view") is deliberately left to the Implementation Plan — Decision 42 resolves the architectural direction, not the mechanism's exact shape. This is consistent with, not a gap in, Decision 42's own stated intent.

The concurrent/second-switch question (item 7, above) remains open exactly as Decision 42 itself anticipated, and is carried forward as an Implementation Plan question, not converted into a blocker.

**Decision 41A verdict: READY.** The architectural ambiguity that previously blocked readiness — which of two structurally different approaches to take — has been resolved by Decision 42A's selection of the coordinated pre-switch flush, which this assessment's own tracing had already identified as the approach that structurally avoids the cross-tenant-write risk. No remaining Rule 8-level uncertainty exists; the exact coordination mechanism and second-switch handling are Implementation Plan questions, not Rule 8 concerns.

---

## C. Decision 41B — Initial Stock Count Navigation/Unmount Protection: Fresh Trace

`InitialStockCountView.tsx` already has `latestFlushArgs` (`useRef`, updated on every render, mirroring Periodic Contagem's own identical pattern) and an existing `flushDraftNow` function that reads from it — **the stale-closure risk Decision 39 was built to prevent for Periodic Contagem does not apply here, because Initial Stock Count already uses the same live-state-at-call-time discipline.** This directly answers the assessment's own question ("whether current refs/closures contain the latest rows," "whether stale closures are possible"): no additional risk found.

The only missing piece, confirmed by direct comparison against Periodic Contagem's own mechanism, is the unmount-cleanup effect itself:

```javascript
// Periodic Contagem (present):
useEffect(() => { return () => { flushPeriodicDraftNow(); }; }, []);

// Initial Stock Count (absent — only listener cleanup exists):
useEffect(() => {
  // ...
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', flushDraftNow);
  };
}, []);
```

Adding an equivalent unmount-cleanup call to `flushDraftNow()` mirrors an already-proven, already-tested (for Periodic) pattern, using a write function that already reads live state correctly.

**Cross-tenant risk (per 41A's finding) does not apply to this transition.** 41B concerns unmounting due to `activeTab` changing in `App.tsx` — confirmed by direct inspection that `switchShop`/business-switching never touches `activeTab`, so `activeBusinessId` is unchanged at the moment of this specific unmount. The contamination risk identified for 41A is specific to the business-switch transition and does not recur here.

**Race with business switching:** not applicable, per the above — the two transitions (business switch, in-app tab navigation) are confirmed mutually exclusive triggers by the second forensic audit and re-confirmed here; no code path was found where both occur atomically in a way that could interact.

**Test coverage:** no test currently exists for Initial Stock Count's unmount behavior (confirmed absent). `tests/periodic-stock-interruption-durability.test.ts` establishes the exact pattern to mirror for Periodic's own unmount-cleanup assertion (§7 item 8 in that file, per the earlier forensic audit) — an equivalent test for Initial Stock Count is a direct, low-risk port of that existing pattern.

**Decision 41B verdict: READY.** No open design question remains; the mechanism to add is a direct, evidence-supported extension of an already-proven pattern, using an already-safe (live-state) write function, with no cross-tenant risk applicable to this specific transition.

---

## D. Decision 41C — Failed Autosave Recovery: Fresh Trace

**Item 1/2 — can transient vs. legitimate failures be safely identified?**

Direct precedent already exists and is already shipped: `AppContext.tsx`'s `businesses/{id}` listener error callback (line ~1690) explicitly distinguishes `err.code === 'permission-denied'` from other Firestore error codes (its own comment: *"Firestore's permission-denied error code is 'permission-denied' for every rules-layer rejection; a network/offline error uses a different code ('unavailable', etc.)"*). This confirms, by shipped precedent rather than assumption, that Firestore's client SDK error codes reliably distinguish the **coarse** category "rules-layer rejection" from the coarse category "network/transient failure." This directly answers the assessment's caution against assuming every `permission-denied` has the same meaning: **it does not** — the same error code (`permission-denied`) is Firestore's answer for *every* rules clause evaluating false in an `allow` statement, and cannot by itself distinguish which clause failed. The `stockCountDrafts/{draftId}` rule is `allow create, update: if isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId);` — a `permission-denied` on this path could mean either clause failed, and the error code alone cannot tell them apart.

**However, a critical piece of context closes most of this gap for the specific case Decision 41C calls out:** `subscriptionBlocksNewRecords` (`AppContext.tsx:1302`) is already computed **client-side, live**, from the same `subscriptions/{businessId}` document the rule itself reads — its own comment states it *"mirrors firestore.rules' subscriptionAllowsNewRecords() exactly."* This means the application does not need to infer the subscription-block case from an after-the-fact error code at all: **it can know, before ever attempting or retrying a draft write, whether that write would be rejected for the subscription reason**, by checking `subscriptionBlocksNewRecords` directly. This is the same technique (context narrows an otherwise-ambiguous `permission-denied`) already proven for business-suspension detection, applied proactively rather than reactively.

**Item 3 — what happens when classification is uncertain?** For the one legitimate-rejection cause Decision 41C explicitly names (subscription block), classification does not need to be uncertain — it can be checked directly and proactively as above. For any *other* cause of an `isOwnerOf` failure (e.g., a genuine authorization bug, or a race during a business switch), the application has no equivalent proactive signal, and Decision 41C's own text already specifies the correct behavior for this remaining case: fail safely rather than retry.

**Item 4 — can the application safely fail closed?** Yes, in the sense that "fail closed" here means "do not retry, surface the failure persistently" — this is a client-side UI-state decision, not a security-enforcement one; the security enforcement itself is unconditionally guaranteed by `firestore.rules` regardless of what the client attempts (item 10 below).

**Items 5-9 — could retry cause harm?** Retrying a genuinely network-transient failure (`unavailable`, `deadline-exceeded`) a bounded number of times with backoff is a standard, low-risk pattern and does not interact adversely with any existing mechanism found in this codebase, **provided** any such retry is built on top of, not around, the existing `draftInFlightSaveRef`/`flushInFlightSaveRef` serialization (Decision 39) — bypassing that serialization is what could reintroduce stale-write-ordering or duplicate-write risk; using it is what prevents that, per the same mechanism already proven for the existing debounce/flush interaction.

**Items 10/11 — `getDocFromServer` failure vs. `setDoc` failure.** Confirmed, per the prior forensic audit and re-confirmed here: the current `.catch()` treats a `setDoc` failure and a post-`setDoc` `getDocFromServer` readback failure identically — both produce `save-failed`, and the function cannot currently distinguish "the write did not happen" from "the write may have happened but acknowledgement could not be confirmed." **This is a genuine open question requiring a specification-level answer, not something this assessment resolves**: should a readback failure be treated the same as a write failure (safe but potentially redundant — a retry might re-send data that already arrived), or should it be classified as its own third state? Decision 41C's own text already anticipates something like this ("unknown/requires user attention" as a third category) — this finding is evidence that this third category is not merely theoretical but maps onto a real, already-identified code path.

**Item 12 — how should this affect the specification?** At the time of the original draft, the specification produced under Decision 41C was flagged as needing to decide the readback-failure question above.

**Decision 42C–42F resolution, applied.** Decision 42 resolved all three items this assessment's original §R raised for 41C:

- **Subscription-blocked draft write (Decision 42C):** confirmed **LEGITIMATE / NON-RETRYABLE**. The proactive `subscriptionBlocksNewRecords` pre-check identified in item 3/§156 above is the accepted classification mechanism for this specific case — exactly the mechanism this assessment found already de-risked the central concern. Decision 42C is explicit, and this assessment restates it without qualification: this client-side signal does not replace Firestore's own enforcement, `firestore.rules` remains authoritative regardless of client behavior, and no security decision is ever delegated to it — it governs retry/recovery UX only.
- **`getDocFromServer` readback failure (Decision 42D):** confirmed as its own distinct **UNKNOWN / REQUIRES ATTENTION** category — not treated as a confirmed write failure, and not treated as confirmed persistence either, exactly resolving the open question item 10/11 above raised. Decision 42D's own stated reason is adopted here unchanged: a successful `setDoc()` followed by a failed readback does not prove the write failed, so representing it as a definite failure would misrepresent an uncertain outcome as certain.
- **Bounded transient retry (Decision 42E):** a maximum of 3 automatic retries after the initial attempt (4 total), with increasing backoff, is now the accepted policy — resolving the "specific bounded retry count/backoff parameters" item this assessment's original §R left open. Exact delay values remain, by Decision 42E's own deliberate choice, a later implementation-specification detail — this assessment does not invent them, consistent with Decision 42's own instruction not to.

The four-state model this assessment's item 10/11 finding anticipated is now confirmed as governance-accepted, not merely this assessment's own speculation: **write confirmed success / transient write failure / legitimate non-retryable rejection / unknown requires-attention** (Decision 42D). Decision 42F further confirms the non-retryable category list (subscription-blocked; authorization/ownership rejection; other legitimate rule rejection; invalid request/data errors; unknown/requires-attention outcomes) and explicitly defers the full Firestore-error-code-to-category mapping table to the specification stage, using only error codes already verified in this codebase (per the `permission-denied`/`unavailable` precedent this assessment traced in item 1/2 above) — this assessment does not invent that table, and neither does Decision 42.

**Decision 41C verdict: READY.** Every item this assessment's original §R identified as remaining for 41C has been explicitly resolved by Decision 42C–42F. No Rule 8-level uncertainty remains; the exact backoff delay values and the full error-code classification table are confirmed, by Decision 42 itself, as deliberately deferred implementation-specification details, not open Rule 8 questions.

---

## E. Decision 41D — Listener Error Distinction: Fresh Trace

Re-confirms the forensic audits' own finding, with no new contradicting evidence: both periodic-draft listeners and the initial-draft listener collapse "error" and "confirmed empty" into identical application state. The Initial Stock listener's own comment (*"Expected for a Staff session (rules deny read)... Still counts as 'loaded'"*) confirms this shape was a deliberate, correct choice for the staff-denial case specifically.

**Item 4 — does any rules change become necessary?** No. This finding and Decision 41D's own remedy are entirely about client-side state representation — distinguishing four states (loading / confirmed-no-draft / draft-exists / draft-load-error) in local React/context state. Nothing about `firestore.rules` needs to change for the client to make this distinction; the client already receives enough information (a snapshot vs. an error callback) to represent it — it simply currently discards that distinction.

**Item 5/6 — could an error state accidentally trigger new-draft initialization or discard existing work?** Traced directly: the error branches only ever set `periodicStockDraftMeta`/`periodicStockDraftItemsByKey` to null/empty and mark `*Loaded = true`. Nothing in that branch calls `clearPeriodicStockDraft()` or any other destructive Firestore operation, and no `submissionId` is generated at this point (that happens later, only at `handleRequestConfirmation`). **Confirmed: the error state causes a misleading empty *display*, never an actual deletion or overwrite of Firestore data.** This is consistent with the forensic audits' own classification of this finding as Data Inaccessibility, not Data Loss, and this assessment finds no evidence to revise that classification.

**Item 7 — could an error state prevent legitimate recovery?** Yes, precisely as already established: the resume-draft banner is never offered when the error branch fires, even though the underlying Firestore data may be fully intact. This is the finding Decision 41D exists to correct.

**Item 8 — required tests.** A test asserting the staff-denial case is unaffected (still resolves to a distinct, expected "denied" or equivalent state, not conflated with a new fourth "unknown Owner error" state) is essential and explicitly required by Decision 41D's own text; a test asserting a simulated Owner-session listener error produces a state distinct from both "confirmed empty" and "draft exists" is the direct, minimal proof of the fix.

**Decision 41D verdict: READY.** No rules change required, no destructive side effect found in the current error path, and the fix is confirmed to be a client-side state-representation change only, consistent with what Decision 41D already specifies.

---

## F. Decision 41E — Subscription-Blocked Contagem Accessibility: Fresh Trace

**Items 1-4 — where things currently execute.** `subscriptionBlocksNewRecords` is checked at `PeriodicStockCountView.tsx:4720` as the very first conditional in the component's main render path — before `periodicStockDraftLoaded`'s own gate and before `draftDecisionPending` (the resume-banner condition) are ever evaluated. This confirms the forensic audit's own finding: currently, the resume/view path is **entirely unreachable** while blocked, not merely restricted.

**Item 5/6/7/8 — does merely viewing/resuming cause any write?** Traced directly and confirmed by this assessment, not merely inferred:

- `handleResumeDraft` (`PeriodicStockCountView.tsx`) performs only `setCatalogRows`/`setManualRows`/other plain `setState` calls — **no `setDoc`, no call to any draft-save function, of any kind.**
- The auto-populate effect (`useEffect(..., [products])`) that seeds `catalogRows` from the product catalog performs only a `setCatalogRows` state update — no write.
- The derived unified-list computation (`useMemo(..., [catalogRows, manualRows])`) is a pure, read-only derivation — no write.
- Autosave is confirmed, by direct inspection, to be scheduled **only** via explicit `scheduleRowDraftSave(...)` calls at specific handler call sites (row edit handlers, `handleSaveCatalogRow`, etc.) — there is no generic `useEffect` watching `catalogRows`/`manualRows` broadly that would fire a save merely because those values changed for any reason, including a resume.

**Conclusion: mounting the view and resuming a draft, in the current architecture, triggers no Firestore write of any kind.** This is the exact confirmation the Governance Decision Proposal flagged as pending (§8, Decision E, item 9) — it has now been performed as part of this Rule 8 assessment, not merely assumed.

**Items 10-13 — do Firestore rules already distinguish read from create/update?** Yes, confirmed directly from `firestore.rules`:

```
match /stockCountDrafts/{draftId} {
  allow read: if isOwnerOf(businessId);
  allow create, update: if isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId);
  allow delete: if isOwnerOf(businessId);
}
```

`read` carries no subscription condition at all — it is already, structurally, always available to the Owner regardless of subscription status. `create`/`update` are the only operations gated by `subscriptionAllowsNewRecords`. This is not a new rule needed for Decision 41E — **the rules already support exactly the read/write split Decision 41E requires, with zero rules change.** `tests/firestore-rules.test.ts` already contains a directly analogous, passing precedent: *"Owner can delete their own periodic draft even when the business subscription blocks new records"* — proving the codebase already relies on, and already tests, the principle that not every operation on this document is subscription-gated. No equivalent explicit test currently asserts `getDoc` succeeds under a blocked subscription for the periodic draft specifically, though the rule text itself makes this unambiguous, and the pattern is a trivial, low-risk addition mirroring the existing delete test.

**Item 14 — is a specification amendment sufficient, or is a rules decision required?** A specification amendment is sufficient. No Firestore rules change is required or proposed by this assessment.

**A UX-completeness nuance surfaced by this trace, not previously identified in either forensic audit:** if the specification implements "resume while blocked" by calling the existing `handleResumeDraft` unmodified — loading the draft into the same editable `catalogRows`/`manualRows` state, with the same interactive input fields — the operator would be able to *attempt* to type into those fields. Any such attempt would correctly and safely be rejected at the `firestore.rules` layer (no security gap), but would surface as an immediate `save-failed` state for anything typed, which is a confusing experience inconsistent with the spirit of "view/resume/export" as a read-only accommodation. **This assessment recommends the specification explicitly address whether "view/resume" under Decision 41E means a genuinely read-only rendering (inputs disabled) or the full existing editable resume flow with writes simply failing safely at the rules layer** — both are secure, but only the former matches the apparent intent of the Decision's own wording. This is flagged as a specification-completeness question, not a security concern.

**Decision 41E verdict: READY.** The central technical uncertainty (does viewing/resuming trigger any incidental write) has been directly traced and confirmed negative; the rules already cleanly separate read from create/update with no change required. The one open item (read-only vs. editable-but-safely-rejected UX) is a specification detail to resolve during drafting, not a blocker to proceeding to that stage.

---

## G. Tenant Isolation

Traced `businessId → Firestore path → authorization check → operation` for every decision:

- **41A:** the sole confirmed tenant-isolation risk in this entire assessment (§B above) — a naive implementation could write one business's data under another's path. Not a rules gap (the rules would still correctly scope the write to whichever `businessId` the path names — this is a client-side path-construction risk, not an authorization bypass), but a data-integrity/tenant-isolation risk nonetheless, since the *content* written would belong to the wrong business.
- **41B, 41D:** no tenant-isolation surface — both are client-side state-representation/timing changes with no new Firestore path construction.
- **41C:** no new tenant-isolation risk provided any retry logic reuses the existing `businessId`-scoped write functions unmodified in that respect; the classification logic itself (transient vs. legitimate) does not touch business identity.
- **41E:** no tenant-isolation risk — confirmed via `isOwnerOf(businessId)`'s unconditional presence on the `read` rule; viewing a draft can never cross into another business's data, since the read path is scoped by `businessId` exactly as every other operation on this collection already is.

---

## H. Authorization

No decision proposes any change to `isOwnerOf`, staff role checks, or the Owner/staff distinction. 41D explicitly preserves the staff-denial case as a distinct, correct outcome. 41E explicitly preserves `subscriptionAllowsNewRecords` as the unconditional gate on `create`/`update`. No authorization weakening was found necessary for, or introduced by, any of 41A-41E as traced.

---

## I. Data Integrity

- **41A:** integrity risk is the cross-tenant write scenario already documented (§B) — this is the assessment's primary integrity finding.
- **41B, 41D:** no integrity risk found — both reuse existing, already-correct write/read paths without modification to document shape or content.
- **41C:** integrity risk only if retry logic bypasses existing write serialization (addressed by requiring it not to, per Decision 41C's own text and this assessment's §D).
- **41E:** no integrity risk — confirmed no write path exists in the traced view/resume flow.

---

## J. Persistence / Data-Model Implications

None of 41A-41E require new Firestore document fields, new documents, migrations, new indexes, or new local (non-Firestore) persistence, as traced. 41C's eventual retry mechanism may require new *ephemeral* client-side state (e.g., a retry counter/timer per row) but this does not touch any persisted document shape. This directly satisfies Decision 41's own non-goals (§4: no schema/storage-shape change implied).

---

## K. Concurrency

- **Multiple tabs / multiple devices:** unaffected by 41A-41E; Decision 38/39's existing `persistentMultipleTabManager` and per-row document isolation remain the operative mechanisms, unmodified.
- **Business switching during a save (41A):** the specific scenario this assessment's §B addresses directly — the open question is which approach (coordination vs. explicit-businessId) correctly sequences a switch against an in-flight save; both candidate approaches are compatible with the existing `draftInFlightSaveRef` serialization if built on top of it.
- **Subscription change during a save:** covered by 41C's classification requirement — a rejection arriving mid-save due to a subscription change is exactly the "legitimate/non-retryable" case Decision 41C's specification must classify correctly.
- **Retry during a newer edit:** addressed by the existing requirement (41C) that any retry logic sit on top of the existing in-flight-write serialization, exactly as the ordinary debounced-save path already does.
- **Unmount during an in-flight write (41B):** Periodic Contagem's existing pattern already handles this (the unmount effect calls the flush function; any already-in-flight write is a separate concern already governed by the existing `flushInFlightSaveRef`/`draftInFlightSaveRef` refs) — porting the identical pattern to Initial Stock Count carries the same, already-accepted risk profile, not a new one.
- **41G (same-row concurrent editing) remains explicitly out of scope**, per instruction, and none of 41A-41E's traced mechanisms interact with or worsen that existing, separately-recorded behavior.

**No new concurrency risk was found to be introduced by 41B, 41D, or 41E.** 41A and 41C each carry one identified, already-documented concurrency consideration (sequencing against a switch; sequencing against serialized writes, respectively), both resolvable through the existing serialization primitives rather than new ones.

---

## L. Performance

Negligible across all five decisions. 41A/41B add at most one additional network round-trip in the case where a flush is actually needed (mirroring an already-accepted cost under Decision 39). 41C's bounded retry adds bounded additional write attempts only under genuine transient failure, not in the ordinary path. 41D and 41E involve no additional Firestore operations at all — both are read/state-representation changes. No decision introduces a performance concern material to normal SME usage patterns.

---

## M. Backward Compatibility

- Existing drafts (Periodic and Initial), existing finalized `StockCount` records, and all Decision 38/39/40 data are unaffected — none of 41A-41E change document shape.
- Existing staff sessions: unaffected; 41D explicitly preserves current staff-denial behavior; no change traced that would alter staff read/write outcomes.
- Businesses currently in trial, in grace, or already blocked: 41C and 41E both directly concern these states, but neither changes what `subscriptionAllowsNewRecords`/`subscriptionBlocksNewRecords` themselves compute — both build additional client-side behavior *around* the existing, unchanged computation.
- **No migration is necessary for any of 41A-41E**, as traced.

---

## N. Security / Privacy

- No cross-business reads or writes are authorized by any of 41A-41E as specified; the one identified risk (41A's naive-implementation cross-tenant write) is a data-integrity concern this assessment flags precisely so it is designed around, not a security-rule bypass — the rules would still correctly restrict the erroneous write to whatever `businessId` the (wrongly-targeted) path names; the harm would be data ending up in the wrong tenant's records, not unauthorized access.
- No staff escalation: 41D explicitly preserves staff-denial; no other decision touches staff authorization.
- No subscription bypass: 41E explicitly and by direct rules trace preserves `create`/`update` gating; 41C explicitly requires never retrying a legitimately-denied write indefinitely.
- No new exposure of business data to unauthorized users: 41E's read path is already scoped by `isOwnerOf(businessId)` exactly as today; nothing about viewing while blocked changes who can read what.

---

## O. Failure Recovery

| Decision | Normal path | Failure path | Recovery path | Terminal path |
|---|---|---|---|---|
| 41A | Switch triggers flush, flush succeeds, switch proceeds | Flush fails | Operator informed, given explicit choice (per Decision text) | Not yet specified — flagged for specification stage |
| 41B | Tab navigation triggers unmount flush, succeeds | Flush fails (network) | Same best-effort characteristics as Decision 39's existing mechanism — no new terminal state beyond what Periodic already has | Same as Periodic's existing, already-accepted residual risk |
| 41C | Write succeeds first try | Transient failure → bounded retry → success | Manual retry action if automatic retries exhausted | Persistent, visible failure state until resolved or explicitly acknowledged |
| 41D | Listener delivers real snapshot | Listener errors | UI reflects "draft-load error," distinct from "no draft" — recovery mechanism (e.g. manual refresh/retry) is a specification detail | Not yet specified — flagged for specification stage |
| 41E | Operator views/resumes while blocked | N/A — no write is attempted in this path | N/A | N/A (read-only path has no failure mode beyond ordinary read failure, already covered by 41D) |

---

## P. Test Coverage

**Already exists and directly supports these decisions:**
- `tests/firestore-rules.test.ts` — `stockCountDrafts` describe block: Owner/staff/cross-business read-write-delete coverage; the subscription-blocked delete-still-succeeds test (directly supports 41E's rules-layer claim).
- `tests/periodic-stock-interruption-durability.test.ts` — the exact unmount-cleanup pattern 41B should mirror for Initial Stock Count.
- `tests/periodic-contagem-autosave-safety-decision-39.test.ts`, `draft-save-server-verification.test.ts` — existing serialization/acknowledgement coverage that any 41A/41C implementation must not regress.

**Confirmed absent, required for implementation (not created by this assessment):**
- Any test asserting flush-before-switch writes to the *old* business's path (41A) — none exists.
- Any test for Initial Stock Count's shop-switch or unmount behavior specifically (41A, 41B) — none exists for either.
- Any test for retry/backoff behavior of any kind (41C) — none exists.
- Any test distinguishing a listener error state from confirmed-empty (41D) — none exists.
- A `getDoc`-succeeds-while-blocked test for the periodic/initial draft specifically (41E) — the closely analogous delete-test exists; this specific read assertion does not yet.

---

## Q. Rule 8 Verdict — FINAL

| Decision | Final Rule 8 Verdict | Basis |
|---|---|---|
| **41A — Business-switch protection** | **READY** | The cross-tenant-write risk this assessment identified is resolved by Decision 42A's acceptance of the coordinated pre-switch flush — the approach this assessment's own tracing had already shown structurally avoids that risk. Exact coordination mechanism and second-switch handling are confirmed Implementation Plan questions, not Rule 8 concerns. |
| **41B — Initial Stock unmount protection** | **READY** | Unchanged from the original draft. Existing `latestFlushArgs` already provides live-state correctness; no cross-tenant risk applies to this transition; the required change is a direct, low-risk port of Periodic Contagem's own already-proven, already-tested mechanism. |
| **41C — Failed autosave recovery** | **READY** | Every item this assessment's original §R raised is resolved by Decision 42C–42F: subscription-block classified legitimate/non-retryable via the proactive `subscriptionBlocksNewRecords` signal; readback failure classified as its own unknown/requires-attention state; bounded retry policy (3 retries, 4 total attempts, increasing backoff) set. Exact delay values and the full error-code table remain deliberately deferred to specification, per Decision 42's own instruction, not open Rule 8 questions. |
| **41D — Listener error distinction** | **READY** | Unchanged from the original draft. No rules change required; confirmed no destructive side effect in the current error path; fix is a client-side state-representation change consistent with the Decision as written. |
| **41E — Subscription-blocked accessibility** | **READY** | Unchanged from the original draft. Directly traced and confirmed: no incidental write exists in the view/resume path; `firestore.rules` already cleanly separates read from create/update with zero rules change required. One UX-completeness detail (read-only rendering vs. editable-but-safely-rejected) remains recorded as a specification-stage question, not a Rule 8 blocker. |

**No Decision 41A–41E item remains CONCERN, BLOCKED, or READY AFTER DECISION.**

Confirmed, globally, across all five: tenant isolation remains preserved (41A's risk was a client-side path-construction concern, resolved architecturally by Decision 42A, never an authorization gap); Owner/staff authorization is unchanged (41D explicitly preserves staff-denial); subscription enforcement is unchanged (41C/41E both explicitly preserve `firestore.rules` as authoritative, per Decision 42C/42G); no Firestore rules change is required by any of the five; no schema migration is required; no new persistent storage architecture is required (41C's retry state is ephemeral client-side state only, per Decision 42's own non-goals); the existing Decisions 38–40 mechanisms remain the fixed baseline throughout; and no non-goal recorded in Decision 41 or Decision 42 has been converted into implementation scope by this finalization.

---

## R. Required Product Architect Decisions

**None remaining.** Both items this assessment's original §R raised — the 41A approach choice, and 41C's three sub-items (subscription pre-check confirmation, readback-failure classification, retry parameters) — have been resolved by Decision 42 (§2–§7 of that document). No further Product Architect input is required before proceeding to the Implementation Plan for 41A–41E.

The following remain as **Implementation Plan questions**, carried forward without conversion into Rule 8 concerns or Product Architect decisions, per Decision 42's own deliberate deferrals:

- 41A: the exact coordination mechanism between `ShopSwitcher` and the active Contagem view, and behavior under a second switch attempted before a first switch's flush resolves.
- 41C: exact backoff delay values, and the full Firestore-error-code-to-category classification table (to be built from error codes already verified in this codebase, per Decision 42F).
- 41E: whether "view/resume while blocked" renders as genuinely read-only (inputs disabled) or as the existing editable resume flow with writes safely rejected at the rules layer.

---

## S. Exact Next Governance Gate

Per the standing sequence, Decision 41's own §6, and Decision 42's own §13:

```
Decision 41 (accepted) → this Rule 8 Assessment (originally draft, 41A/41C
  READY AFTER DECISION) → Decision 42 (accepted, resolved both open items)
  → this Rule 8 Assessment, FINALIZED (41A-41E all READY)
  → IMPLEMENTATION PLAN (covering 41A-41E)
  → Product Architect Acceptance
  → Stage 8 Implementation Authorization
  → Implementation
  → Verification
```

**NEXT GATE: IMPLEMENTATION PLAN — covering Decision 41A–41E against this finalized Rule 8 Assessment.**

This finalized assessment does not itself constitute Product Architect sign-off on an Implementation Plan, an Implementation Plan, or an Implementation Authorization. A FINAL/READY Rule 8 Assessment does not authorize implementation — no gate beyond this Rule 8 Assessment has been entered.

---

## FINAL STATUS

**RULE 8 ASSESSMENT — FINAL, ALL VERDICTS READY (41A–41E)**
**41F AND 41G REMAIN NON-BLOCKING RECORDED CONCERNS, OUT OF SCOPE, NOT IMPLEMENTATION-AUTHORIZED**
**IMPLEMENTATION NOT AUTHORIZED**
**NO CODE MODIFIED**
**NO TESTS MODIFIED**
**NO FIRESTORE RULES/INDEXES MODIFIED**
**NO IMPLEMENTATION PLAN CREATED**
**NO IMPLEMENTATION AUTHORIZATION CREATED**
**DECISION 41 NOT MODIFIED**
**DECISION 42 NOT MODIFIED**
**DECISIONS 38–40 NOT MODIFIED**
**NO COMMIT/PUSH**
