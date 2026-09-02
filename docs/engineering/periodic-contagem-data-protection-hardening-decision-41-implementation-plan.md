Implementation Plan

# Implementation Plan — Data Protection Hardening (Decision 41A–41E)

**Type:** Governance bridge document — translates the FINAL, all-READY
Rule 8 Assessment for Decision 41 into a concrete, file-by-file,
dependency-ordered engineering execution plan, ready for Product
Architect Acceptance and a subsequent, separate Stage 8 Implementation
Authorization. **Does not itself authorize implementation and does
not modify code.**

**Status:** ✅ **ACCEPTED BY THE PRODUCT ARCHITECT.** See §22,
"Product Architect Acceptance," for the signed decision. Acceptance of
this Plan does not itself constitute Stage 8 Implementation
Authorization — that remains a separate, subsequent, not-yet-created
document/signature.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(implemented) → [Decision 40](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(implemented) → [Decision 41](../specs/stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted, governance decision stage — SABUSHIMIKE MASCENI, 2 Sept
2026) → [Rule 8 Assessment for Decision 41](./periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md)
(originally 41A/41C READY AFTER DECISION) → [Decision 42](../specs/stock-count-data-loss-resilience-decision-42-amendment.md)
(✅ Accepted, resolved both open items — SABUSHIMIKE MASCENI, 2 Sept
2026) → Rule 8 Assessment, **FINALIZED** (✅ 41A–41E all READY) →
**THIS Implementation Plan** → *(next: Product Architect Acceptance,
then a separate Stage 8 Implementation Authorization — neither is
this document)*.

**Repository baseline:** `main = origin/main = b242d34` (Decision 41,
the original Rule 8 draft, and Decision 42 merged in that commit). The
Rule 8 Assessment's finalization (updating 41A/41C to READY) exists as
a modified, uncommitted working-tree file at the time of this Plan —
noted for an accurate baseline record; this Plan does not depend on
that finalization being committed first, only on its content, which
this Plan re-reads directly. Nothing in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, or `tests/` has been
modified to produce this document.

**This document does not:** modify Decision 41, Decision 42, the Rule
8 Assessment, `firestore.rules`, `firestore.indexes.json`, or any
application or test code. It does not itself constitute Implementation
Authorization. It does not redesign any part of Decisions 38–40's
already-governed mechanisms — every element below is either a direct,
minimal extension of them or a new, narrowly-scoped addition justified
against a specific Decision 41/42 acceptance criterion.

---

## 1. Purpose

To specify, precisely enough for a Stage 8 Implementation Authorization
to be signed against it without further design ambiguity, exactly what
changes 41A–41E require: which files, which functions, which new state,
which invariants, which tests, and in what order — while leaving the
three items Decision 42 explicitly deferred (41A's exact lifecycle
edge case for a second switch's precise UI treatment beyond the
in-flight guard specified below, 41C's exact backoff values beyond
what this Plan fixes per its own instruction to do so, and 41E's
read-only-vs-safely-rejected UX choice) resolved only as far as
Decision 42 and this Plan's own scope require, without inventing new
product behavior beyond what Decisions 41/42 authorized.

---

## 2. Scope

Exactly: **41A, 41B, 41C, 41D, 41E.** Not: 41F (browser-teardown
verification — recorded, non-blocking, no implementation), 41G
(same-row concurrent editing — documented, non-blocking, no
implementation). Not: any redesign of Decisions 38–40's existing
mechanisms, ShopSwitcher's general UI, Contagem's workflow, Firestore
rules structure, or any module outside Periodic Contagem, Initial
Stock Count, and the minimum shared `AppContext`/`ShopSwitcher` surface
41A requires.

---

## 3. Non-Goals

Restated from Decision 41 §4 and Decision 42 §10, binding on this
Plan: no redesign of Contagem, ShopSwitcher, or either view's draft
architecture; no Firestore/Firebase replacement; no generalized
offline-first architecture; no collaborative/concurrent editing (41G);
no product catalog, subscription pricing/policy, Dashboard, Business
Worth, finalized `StockCount`, or timeline/audit changes; no extension
of 41E's accessibility principle beyond Periodic Contagem and Initial
Stock Count; no Firestore rules or index change (none is required, per
the Rule 8 Assessment's own direct trace); no new background jobs,
scheduled recomputation, or generalized persistent-storage layer; no
schema migration (none of 41A–41E requires one, per Rule 8 §J).

---

## 4. Decision 41A Implementation Plan — Business-Switch Protection

### 4.1 Coordination mechanism (minimum surface)

**Design:** a single new ref-based registration point, owned by
`AppContext.tsx` (the one module already shared by both `ShopSwitcher.tsx`
and the two Contagem views via `useApp()`), rather than new
prop-drilling or a new standalone module.

```
// AppContext.tsx — new, minimal addition
const pendingContagemFlushRef = useRef<(() => Promise<{ success: boolean }>) | null>(null);
const registerPendingContagemFlush = (fn: (() => Promise<{ success: boolean }>) | null) => {
  pendingContagemFlushRef.current = fn;
};
```

Exposed on the context value alongside `switchShop` and the rest of
the existing surface. Only one Contagem view can be mounted at a time
(Periodic and Initial Stock Count are mutually exclusive tabs in
`App.tsx`), so a single ref — not a list/registry — is sufficient; this
is the "minimum necessary communication surface" Decision 42A itself
anticipated, not a generalized event-bus or navigation-guard framework.

### 4.2 Registration lifecycle (both views)

Each of `PeriodicStockCountView.tsx` and `InitialStockCountView.tsx`
registers its own flush function on mount and clears it on unmount,
mirroring the existing unmount-cleanup pattern already proven for
Decision 39/41B:

```
useEffect(() => {
  registerPendingContagemFlush(flushForSwitchIfNeeded);
  return () => registerPendingContagemFlush(null);
}, []);
```

`flushForSwitchIfNeeded` (new, per view) is a stricter-await variant of
the existing best-effort flush, justified precisely because 41A needs
a definite success/failure result to gate the switch on, whereas the
existing `flushPeriodicDraftNow`/`flushDraftNow` are deliberately
fire-and-forget (correct for their own `pagehide`/unmount purpose,
wrong for this one):

```
// PeriodicStockCountView.tsx
const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {
  if (rowDebounceTimersRef.current.size === 0 && !draftInFlightSaveRef.current) {
    return { success: true }; // nothing pending — Decision 42A's own "no unnecessary flush" requirement
  }
  rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
  rowDebounceTimersRef.current.clear();
  try {
    if (draftInFlightSaveRef.current) await draftInFlightSaveRef.current;
    const { catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi } = latestFlushArgs.current;
    const rowsByKey = /* identical construction to flushPeriodicDraftNow's own existing rowsByKey build */;
    await flushPeriodicStockDraftRows(rowsByKey, t, l.trim() || undefined, d, submissionIdRef.current || undefined, npi);
    return { success: true };
  } catch {
    return { success: false };
  }
};
```

Initial Stock Count's equivalent (`flushForSwitchIfNeeded` built from
`latestFlushArgs`/`saveInitialStockDraft`, same shape) reuses its own
existing single-document write path unmodified in behavior, only newly
awaited-and-reported rather than fire-and-forget.

**Reused unmodified:** `flushPeriodicStockDraftRows`, `savePeriodicStockDraftItem`,
`savePeriodicStockDraftMeta`, `saveInitialStockDraft`,
`draftInFlightSaveRef`/`flushInFlightSaveRef` (Periodic),
`latestFlushArgs` (both). **New:** `flushForSwitchIfNeeded` per view,
`pendingContagemFlushRef`/`registerPendingContagemFlush` in
`AppContext.tsx`.

### 4.3 `switchShop` becomes the enforcement point

```
// AppContext.tsx
const switchShop = async (businessId: string) => {
  if (!currentUser || !isOwner) return;
  if (!ownedBusinessIds.includes(businessId)) throw new Error('Essa loja não pertence a esta conta.');
  if (switchInFlightRef.current) throw new Error('Uma mudança de loja já está em curso.');
  switchInFlightRef.current = true;
  try {
    const flush = pendingContagemFlushRef.current;
    if (flush) {
      const result = await flush();
      if (!result.success) {
        throw new Error('Não foi possível guardar as alterações da contagem antes de mudar de loja. Tente novamente.');
      }
    }
    await updateDoc(doc(db, 'users', currentUser.uid), { activeBusinessId: businessId });
  } finally {
    switchInFlightRef.current = false;
  }
};
```

**Proof of the required invariant (item 11):** `activeBusinessId` only
changes once the `updateDoc` above succeeds and the `userProfile`
listener delivers the update (existing, already-traced mechanism, Rule
8 §B). The flush is awaited to completion strictly *before* that
`updateDoc` is ever issued. Every write inside the flush path
(`savePeriodicStockDraftItem`/`Meta`, `saveInitialStockDraft`) resolves
its Firestore path from `activeBusinessId` read live at call time —
which, throughout the flush's entire execution, is still the old
business, by strict sequencing, not by any explicit parameter. This is
the exact proof Decision 42A required and the exact mechanism the Rule
8 Assessment identified as structurally safe (§B, item 10).

### 4.4 Item-by-item disposition

1. **How the active view exposes coordination:** §4.2, `registerPendingContagemFlush`.
2. **How ShopSwitcher requests/awaits it:** unchanged — `ShopSwitcher.tsx:45`'s existing `await switchShop(businessId)` already awaits the whole function; `switchShop` itself now internally awaits the flush before its own `updateDoc`. **No change to `ShopSwitcher.tsx` is required for this item.**
3. **How the switch is prevented from committing early:** by construction — `updateDoc` is the last line of `switchShop`, after the flush `await` resolves or throws.
4. **No pending work:** `flushForSwitchIfNeeded` returns `{ success: true }` immediately without any network call (§4.2).
5. **Flush succeeds:** switch proceeds normally, no user-visible change from today's experience.
6. **Flush fails:** `switchShop` throws before `updateDoc` runs — `activeBusinessId` never changes, the operator's pending edits remain exactly where they were (in memory, in the still-mounted view), and nothing was silently discarded.
7. **Operator-facing failure/choice:** `ShopSwitcher.tsx`'s existing `handleSwitch` (`try { await switchShop(...) } catch (err) { setError(err.message) }`) already surfaces the thrown message via its existing `error` state and UI — **no new UI component required**, only a specific, understandable message (already written into §4.3's `throw`). The operator's implicit choice is: retry the switch (the flush will be attempted again) or remain in the current business and continue working — nothing has been lost in either case, satisfying Decision 41A/42B's "explicit, understandable choice" without inventing a new confirmation dialog.
8. **Both views participate:** §4.2 covers both identically via the same registration contract.
9. **Existing serialization preserved:** `flushForSwitchIfNeeded` explicitly awaits `draftInFlightSaveRef.current` before issuing its own write (Periodic), and reuses Initial's own existing `latestFlushArgs`-sourced write path unmodified — no new competing write path is introduced.
10. **Second switch while first is pending:** `switchInFlightRef` (§4.3) makes a concurrent second call to `switchShop` throw immediately rather than double-flush or race; `ShopSwitcher.tsx` should additionally (recommended, minimal) disable its own shop-option buttons while `handleSwitch`'s own `await` is unresolved, via a local `isSwitching` state — a standard UI-level guard, not a new architectural mechanism.
11. **Proof old data can never target the new business:** §4.3, above.

### 4.5 Files affected — 41A

| File | Change | Why | Invariant preserved |
|---|---|---|---|
| `apps/tenant/src/context/AppContext.tsx` | Add `pendingContagemFlushRef`, `registerPendingContagemFlush`, `switchInFlightRef`; modify `switchShop` to await the registered flush before its `updateDoc` | Decision 42A's coordinated pre-switch flush requires `switchShop` itself to be the enforcement point (Rule 8 §B, item 10) | `activeBusinessId` never changes before the flush resolves; existing `switchShop` authorization checks (`isOwner`, `ownedBusinessIds`) unchanged |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | Add `flushForSwitchIfNeeded`, register/unregister on mount/unmount | Decision 41A requires Periodic Contagem's participation | Reuses existing `flushPeriodicStockDraftRows`/`draftInFlightSaveRef`/`latestFlushArgs` unmodified |
| `apps/tenant/src/components/InitialStockCountView.tsx` | Add `flushForSwitchIfNeeded`, register/unregister on mount/unmount | Decision 41A requires Initial Stock Count's participation | Reuses existing `saveInitialStockDraft`/`latestFlushArgs` unmodified |
| `apps/tenant/src/components/ShopSwitcher.tsx` | No required change; recommended addition of a local `isSwitching` disabling guard (item 10) | Minimal UX hardening against a second concurrent switch attempt | Existing `handleSwitch`/`error` display reused unmodified |

---

## 5. Decision 41B Implementation Plan — Initial Stock Count Unmount Protection

**Verified in the Rule 8 Assessment (§C), re-confirmed here:**
`latestFlushArgs`/`flushDraftNow` already exist in
`InitialStockCountView.tsx` with the identical live-state-at-call-time
discipline Periodic Contagem's own Decision 39 mechanism uses — no
stale-closure risk. The only missing piece is the unmount-cleanup call
itself.

**Change:**

```
// InitialStockCountView.tsx — new effect, mirrors PeriodicStockCountView's
// existing, already-shipped equivalent exactly
useEffect(() => {
  return () => {
    flushDraftNow();
  };
}, []);
```

No change to `flushDraftNow`, `latestFlushArgs`, `saveInitialStockDraft`,
or the existing `visibilitychange`/`pagehide` effect — this is a
direct, minimal port of an already-proven, already-tested pattern.
`activeBusinessId` is unaffected by an in-app tab switch (confirmed,
Rule 8 §C), so 41A's cross-tenant consideration does not apply here.

### Files affected — 41B

| File | Change | Why | Invariant preserved |
|---|---|---|---|
| `apps/tenant/src/components/InitialStockCountView.tsx` | Add one unmount-cleanup effect calling the existing `flushDraftNow` | Decision 41B requires unmount parity with Periodic Contagem | No change to the write path itself; mirrors an already-shipped, already-tested pattern exactly |

---

## 6. Decision 41C Implementation Plan — Failed Autosave Recovery

### 6.1 Four-state model, mapped to concrete UI states

Periodic Contagem's current `draftSaveState` type is
`'editing' | 'saving' | 'saved' | 'save-failed'`
(`PeriodicStockCountView.tsx`); Initial Stock Count's is
`'idle' | 'saving' | 'saved' | 'error'` (`InitialStockCountView.tsx`).
Both are extended, per view, to represent the four Decision 42D
categories distinctly:

- **WRITE CONFIRMED SUCCESS** → existing `'saved'` state, unchanged.
- **TRANSIENT WRITE FAILURE** (mid-retry) → new `'retrying'` state
  (both views), distinct from plain `'saving'` so the operator can see
  a retry is in progress rather than a fresh save.
- **LEGITIMATE / NON-RETRYABLE REJECTION** → new `'save-blocked'`
  state (both views) — distinct messaging from a genuine failure
  (e.g., "Assinatura bloqueada — as alterações não estão a ser
  guardadas" rather than "Falha ao guardar"), no retry button offered
  (retrying a known-legitimate rejection is pointless per Decision
  42C).
- **UNKNOWN / REQUIRES ATTENTION** → new `'save-unknown'` state (both
  views) — distinct from `'save-failed'`, since the write may have
  actually succeeded; messaging reflects genuine uncertainty (e.g.,
  "Não foi possível confirmar se isto foi guardado") with a manual
  retry offered (safe, since retrying an already-successful `setDoc`
  with identical content is idempotent).
- Terminal, retry-exhausted transient failure → existing `'save-failed'`
  /`'error'` state, retained with its existing meaning, now reached
  only after automatic retries are exhausted rather than immediately.

### 6.2 Classifying a failure — new, pure, testable function

New file `apps/tenant/src/lib/draftSaveFailureClassification.ts`,
mirroring the existing precedent of extracting pure logic into its own
testable module (`shopSwitchGuard.ts`):

```
export type DraftSaveFailureCategory = 'transient' | 'legitimate' | 'unknown';

const TRANSIENT_CODES = ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'internal', 'cancelled'];

export function classifyDraftSaveFailure(
  errCode: string | undefined,
  subscriptionBlocksNewRecords: boolean,
): DraftSaveFailureCategory {
  if (errCode && TRANSIENT_CODES.includes(errCode)) return 'transient';
  if (errCode === 'permission-denied' && subscriptionBlocksNewRecords) return 'legitimate';
  return 'unknown'; // includes: permission-denied while NOT blocked (possible race/bug,
                     // never assumed legitimate), unauthenticated, invalid-argument,
                     // failed-precondition, or any code not already verified in this
                     // codebase — fails safe, per Decision 42F's own instruction not
                     // to invent unverified classifications.
}
```

**Error-code justification (Decision 42F requirement):** `unavailable`
and `deadline-exceeded` are the standard Firestore/gRPC transient-
condition codes; `permission-denied` is the code already observed and
relied upon in this exact codebase for rules-layer rejections
(`AppContext.tsx`'s existing business-suspension detection, per the
Rule 8 Assessment's own §D trace). No other code is asserted a
category here beyond what that existing precedent supports — anything
else is deliberately routed to `unknown`, per Decision 42F.

**`permission-denied` while NOT currently subscription-blocked is
routed to `unknown`, not `legitimate`** — this is a deliberate,
conservative choice: if the client's own `subscriptionBlocksNewRecords`
signal disagrees with a live rules rejection, that disagreement itself
is the "unknown/requires attention" case (possibly a race, possibly a
genuine authorization bug), and must never be assumed safe to classify
as an ordinary, expected business rule.

### 6.3 Distinguishing `setDoc` failure from `getDocFromServer` readback failure

`savePeriodicStockDraftItem`/`Meta` and `saveInitialStockDraft`
(`AppContext.tsx`) are each modified to tag which half of the
write-then-verify sequence failed:

```
const savePeriodicStockDraftItem = async (rowKey, item) => {
  if (!activeBusinessId) throw new Error('Sem negócio associado.');
  const itemRef = doc(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic', 'items', rowKey);
  await setDoc(itemRef, item); // an error here is a genuine write failure — classify normally
  try {
    await getDocFromServer(itemRef);
  } catch (readbackErr: any) {
    readbackErr.isReadbackUnconfirmed = true; // tag, not a new Error subclass — minimal surface
    throw readbackErr;
  }
  return new Date().toISOString();
};
```

The caller (`scheduleRowDraftSave`'s retry-aware callback, §6.4) checks
`err?.isReadbackUnconfirmed === true` **before** calling
`classifyDraftSaveFailure` — a readback-unconfirmed error always routes
to `'save-unknown'` regardless of its own `err.code`, per Decision 42D,
never to `'transient'`/`'legitimate'`/`'save-failed'`.

### 6.4 Retry scheduling — per-row state, built on existing serialization

New ref, mirroring `rowDebounceTimersRef`'s existing shape:
`rowRetryStateRef = useRef<Map<string, { attempt: number; timer: ReturnType<typeof setTimeout> | null }>>(new Map())`.

Backoff, fixed by this Plan per its own instruction to select values
(Decision 42E deferred exact numbers to "the implementation-specification
stage" — this Plan is that stage for this specific parameter):
**1s → 2s → 4s** (simple, standard exponential doubling; 3 retries,
matching Decision 42E's fixed count exactly; capped, bounded, no tight
loop).

```
const scheduleAutosaveRetry = (rowKey: string, attempt: number, doSave: () => Promise<string>) => {
  if (attempt > 3) { setDraftSaveState('save-failed'); return; } // exhausted — terminal, visible, manual retry available
  const delayMs = [1000, 2000, 4000][attempt - 1];
  const timer = setTimeout(async () => {
    if (draftInFlightSaveRef.current) await draftInFlightSaveRef.current; // never bypass existing serialization
    setDraftSaveState('retrying');
    try {
      const updatedAt = await doSave();
      lastLocalDraftWriteRef.current = updatedAt;
      setDraftSaveState('saved');
      rowRetryStateRef.current.delete(rowKey);
    } catch (err: any) {
      handleSaveFailure(rowKey, err, attempt + 1, doSave); // recurse, or terminate per classification (§6.5)
    }
  }, delayMs);
  rowRetryStateRef.current.set(rowKey, { attempt, timer });
};
```

**Newer-edit protection (both directions):** `scheduleRowDraftSave`
(the ordinary per-keystroke debounce entry point) is extended to clear
any pending retry for that same `rowKey` at the very start, exactly as
it already clears any pending ordinary debounce timer for that row:

```
const existingRetry = rowRetryStateRef.current.get(rowKey);
if (existingRetry?.timer) clearTimeout(existingRetry.timer);
rowRetryStateRef.current.delete(rowKey);
```

This guarantees an older, still-pending retry can never fire after a
newer edit has already superseded it, and — because both the ordinary
save path and the retry path route through the same
`draftInFlightSaveRef`-serialized `doSave` — a retry can never land out
of order relative to a newer edit's own save either.

### 6.5 Classification-driven dispatch

```
const handleSaveFailure = (rowKey, err, nextAttempt, doSave) => {
  if (err?.isReadbackUnconfirmed) { setDraftSaveState('save-unknown'); return; } // §6.3 — never auto-retried further
  const category = classifyDraftSaveFailure(err?.code, subscriptionBlocksNewRecords);
  if (category === 'legitimate') { setDraftSaveState('save-blocked'); return; } // never retried, per Decision 42C
  if (category === 'unknown') { setDraftSaveState('save-unknown'); return; } // never auto-retried, manual only
  scheduleAutosaveRetry(rowKey, nextAttempt, doSave); // 'transient' — bounded auto-retry
};
```

### 6.6 Manual retry and unmount interaction

A manual retry action (button, shown for both `'save-failed'` and
`'save-unknown'`, never for `'save-blocked'`) calls `doSave()` directly,
routed through the identical `draftInFlightSaveRef` serialization, on
explicit operator action — no new write path.

On unmount (both the existing pagehide/visibilitychange/unmount flush
effects and 41B's new one), every pending entry in `rowRetryStateRef`
must have its `timer` cleared, exactly as `rowDebounceTimersRef` is
already cleared in the equivalent places — a component teardown must
never leave a dangling `setTimeout` attempting to call `setState` on an
unmounted component.

### 6.7 Files affected — 41C

| File | Change | Why | Invariant preserved |
|---|---|---|---|
| `apps/tenant/src/lib/draftSaveFailureClassification.ts` (new) | Pure classification function | Decision 42F requires a justified, verified-error-code classification, kept out of component code for direct testability (mirrors `shopSwitchGuard.ts` precedent) | No Firestore/React dependency; directly unit-testable |
| `apps/tenant/src/context/AppContext.tsx` | Tag readback failures (`isReadbackUnconfirmed`) in `savePeriodicStockDraftItem`/`Meta`, `flushPeriodicStockDraftRows`, `saveInitialStockDraft` | Decision 42D requires this distinction be preserved through to the caller | Underlying `setDoc`/`getDocFromServer` calls and document shapes unchanged |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | Extend `draftSaveState` type; add `rowRetryStateRef`, `scheduleAutosaveRetry`, `handleSaveFailure`, manual-retry action; extend `scheduleRowDraftSave` to clear pending retries on a newer edit; extend unmount/flush cleanups to clear retry timers | Core 41C mechanism | Never bypasses `draftInFlightSaveRef`/`flushInFlightSaveRef`; existing debounce/flush mechanisms unmodified in their own logic |
| `apps/tenant/src/components/InitialStockCountView.tsx` | Same shape as above, adapted to Initial's existing `latestFlushArgs`/single-document write path and its own `'idle'\|'saving'\|'saved'\|'error'` state type | Decision 41C applies to both views | Same as above, for Initial's own existing mechanisms |

---

## 7. Decision 41D Implementation Plan — Draft-Listener Error Distinction

### 7.1 New state, minimum shape

`AppContext.tsx`'s periodic-draft-meta, periodic-draft-items, and
initial-draft `onSnapshot` listeners each gain one new piece of state
per listener, e.g. for the periodic-meta listener:

```
const [periodicStockDraftMetaError, setPeriodicStockDraftMetaError] = useState<FirestoreError | null>(null);
```

(analogous `periodicStockDraftItemsError`, `initialStockDraftError`).

### 7.2 Preserving staff denial exactly, distinguishing the Owner case

```
const unsubPeriodicDraftMeta = onSnapshot(
  periodicDraftMetaRef,
  (snap) => {
    setPeriodicStockDraftMeta(snap.exists() ? (snap.data() as Omit<PeriodicStockDraft, 'items'>) : null);
    setPeriodicStockDraftMetaError(null); // clear any prior error on a genuine successful snapshot
    setPeriodicStockDraftMetaLoaded(true);
  },
  (err) => {
    if (!isOwner) {
      // Staff denial — expected, structural, unchanged behavior (Rule 8 §D; Decision 41D §preserve).
      setPeriodicStockDraftMeta(null);
      setPeriodicStockDraftMetaLoaded(true);
      return;
    }
    // Owner session, genuine unexpected error — the exact case Decision 41D exists to distinguish.
    setPeriodicStockDraftMetaError(err);
    setPeriodicStockDraftMetaLoaded(true); // "loaded" still means "we have an answer" — the answer is now "error," not "empty"
  }
);
```

Identical shape for the items listener and for the Initial Stock draft
listener (whose own existing comment already explains the staff-denial
case is expected — this Plan's change preserves that comment's own
reasoning exactly, only adding the Owner-side branch).

### 7.3 Four represented states, derived

```
type DraftAvailability = 'loading' | 'confirmed-no-draft' | 'draft-exists' | 'load-error';

const periodicDraftAvailability: DraftAvailability =
  !periodicStockDraftLoaded ? 'loading'
  : (periodicStockDraftMetaError || periodicStockDraftItemsError) ? 'load-error'
  : periodicStockDraftMeta ? 'draft-exists'
  : 'confirmed-no-draft';
```

### 7.4 Rendering change — minimal, non-blocking

`PeriodicStockCountView.tsx`'s existing gates (`!periodicStockDraftLoaded`,
`draftDecisionPending`) are extended with one new, narrow branch: when
`periodicDraftAvailability === 'load-error'`, render a small, dismissible,
**non-blocking** banner ("Não foi possível verificar contagens por
terminar — [Tentar novamente]") rather than silently falling through to
the ordinary fresh-count workspace. Critically, this does **not** block
the operator from proceeding to a fresh count if they choose to — it
only ensures they are never told, implicitly, that "no draft exists"
when the true answer is "unknown." A manual retry re-invokes the
listener subscription (or, minimally, re-attempts a one-time `getDoc`)
on demand.

### 7.5 Files affected — 41D

| File | Change | Why | Invariant preserved |
|---|---|---|---|
| `apps/tenant/src/context/AppContext.tsx` | Add error state per draft listener (periodic meta, periodic items, initial); branch each listener's error callback on `isOwner` | Decision 41D requires the Owner/staff distinction preserved exactly while adding the new Owner-error state | Staff-session behavior byte-for-byte unchanged; no Firestore rules touched |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | Derive `periodicDraftAvailability`; add one non-blocking error banner with manual retry | Surfaces the new state without blocking the operator | Existing `draftDecisionPending`/resume-banner logic unmodified for the other three states |
| `apps/tenant/src/components/InitialStockCountView.tsx` | Same shape, for Initial's own single listener | Decision 41D applies to both | Same |

---

## 8. Decision 41E Implementation Plan — Subscription-Blocked Contagem Accessibility

### 8.1 UX resolution (the item Rule 8 flagged as open)

**Decision, made by this Plan per its own instruction to resolve it:**
genuinely **read-only rendering**, not the editable-but-safely-rejected
alternative. Reasoning: Decision 41E's own wording ("viewing, recovery,
or export") describes read-only actions; presenting fully live, typable
inputs that silently fail on every keystroke while blocked would
contradict the "no incidental confusion" spirit of the Decision even
though it would remain secure. Read-only rendering is also the smaller
UI diff: it reuses the exact same resume/summary rendering path, only
adding a `disabled`/non-interactive treatment, rather than needing new
failure-toast wiring for an editable-but-doomed input.

### 8.2 Render-path change

`PeriodicStockCountView.tsx`'s existing gate order is changed from:

```
if (subscriptionBlocksNewRecords) return <SubscriptionBlockedNotice />;
if (!periodicStockDraftLoaded) return (...);
if (draftDecisionPending && periodicStockDraft) { ... }
```

to:

```
if (!periodicStockDraftLoaded) return (...); // unchanged — resolve loading state first, regardless of subscription
if (subscriptionBlocksNewRecords) {
  if (draftHasMeaningfulContent(periodicStockDraft)) {
    return <ReadOnlyDraftRecovery draft={periodicStockDraft} onExport={...} />; // new, minimal, read-only
  }
  return <SubscriptionBlockedNotice />; // unchanged — no draft to recover, existing behavior preserved exactly
}
if (draftDecisionPending && periodicStockDraft) { ... } // unchanged, for the unblocked case
```

`ReadOnlyDraftRecovery` (new, minimal component) reuses the existing
row-rendering logic used by the resume/review views, with every input
rendered `disabled`, no `scheduleRowDraftSave`/`handleSaveCatalogRow`/
`handleSaveManualRow` wiring attached to any control, and no
"Confirmar"/finalize action present at all — only a summary view and
(where the existing product flow already supports export, e.g. the
existing PDF/Excel export already used by the historical-review modal,
per the first forensic audit's own finding) an export action, reusing
that existing export function unmodified.

### 8.3 Proof of no incidental write

Confirmed directly by the Rule 8 Assessment (§F) and unchanged by this
Plan: `handleResumeDraft`'s equivalent read-only data population, the
auto-populate-from-`products` effect, and the derived unified-list
`useMemo` are all pure `setState`/read-only operations with no
`setDoc` call anywhere in that path. `ReadOnlyDraftRecovery` must be
built to preserve this property exactly — it must not call
`handleResumeDraft` itself if that function's own side effects (e.g.
`setDraftBannerDismissed(true)`, re-seeding sequence counters) are
themselves harmless in a read-only context (they are — none write to
Firestore) but, as a defensive measure, `scheduleRowDraftSave` and
`handleSaveCatalogRow`/`handleSaveManualRow` are each given an explicit
early return when `subscriptionBlocksNewRecords` is true, as
defense-in-depth beyond what disabled inputs alone provide, even
though `firestore.rules` already makes any such write impossible at
the server (Rule 8 §F, §N).

### 8.4 Firestore rules — confirmed, no change

Re-confirmed directly from `firestore.rules` (Rule 8 §F, unchanged by
this Plan): `stockCountDrafts/{draftId}` `allow read: if isOwnerOf(businessId);`
carries no subscription condition; `allow create, update` remains
gated by `subscriptionAllowsNewRecords(businessId)`; `allow delete`
remains ungated. **No rules change is proposed or required.**

### 8.5 Files affected — 41E

| File | Change | Why | Invariant preserved |
|---|---|---|---|
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | Reorder the subscription-block gate relative to the draft-loaded gate; add `ReadOnlyDraftRecovery` branch; add defense-in-depth early returns in save-triggering functions when blocked | Decision 41E requires existing draft accessibility while blocked, without weakening enforcement | `firestore.rules` remains the actual authority; client-side guard is defense-in-depth only, per Decision 42G |
| `apps/tenant/src/components/InitialStockCountView.tsx` | Same shape, for Initial's own resume/blocked gate at `1571` | Decision 41E applies to both | Same |
| `apps/tenant/src/components/ReadOnlyDraftRecovery.tsx` (new) | Minimal read-only rendering of an existing draft, reusing existing row-display and export logic | Isolates the new read-only path from the editable working-state components, keeping the diff small and the new component's own scope obviously bounded | No new Firestore write path introduced anywhere in this component |
| `firestore.rules` | **No change** | Confirmed already sufficient (§8.4) | N/A |

---

## 9. Architecture / File Impact Summary

| File | 41A | 41B | 41C | 41D | 41E |
|---|---|---|---|---|---|
| `AppContext.tsx` | ✅ (`switchShop`, flush registration) | — | ✅ (readback tagging) | ✅ (listener error state) | — |
| `PeriodicStockCountView.tsx` | ✅ | — | ✅ | ✅ | ✅ |
| `InitialStockCountView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ShopSwitcher.tsx` | Recommended, not required | — | — | — | — |
| `lib/draftSaveFailureClassification.ts` (new) | — | — | ✅ | — | — |
| `ReadOnlyDraftRecovery.tsx` (new) | — | — | — | — | ✅ |
| `firestore.rules` | **No change** | **No change** | **No change** | **No change** | **No change** |
| `firestore.indexes.json` | **No change** | **No change** | **No change** | **No change** | **No change** |

No file outside this table requires modification for 41A–41E, per the
Rule 8 Assessment's own trace (§I, §J) and this Plan's own design
above.

---

## 10. Data-Flow / Invariant Analysis

Restating the invariants each decision's design above is built to
preserve, for direct traceability to acceptance criteria:

- **41A:** old-business identity holds throughout the flush; no write
  ever targets a business the operator has already left, by strict
  sequencing (§4.3), not by parameter-passing.
- **41B:** live-state-at-unmount correctness, inherited unmodified
  from the already-proven `latestFlushArgs` pattern.
- **41C:** no retry ever bypasses `draftInFlightSaveRef`/
  `flushInFlightSaveRef`; no older retry ever overwrites a newer edit
  (§6.4, bidirectional cancellation); a legitimate rejection is never
  retried; an unknown outcome is never claimed as either confirmed
  success or confirmed failure.
- **41D:** staff-denial representation is byte-for-byte unchanged; an
  Owner-session error never collapses into "confirmed empty."
  Draft data itself is never deleted or overwritten by any error path
  (confirmed unchanged from the Rule 8 Assessment's own trace, §E).
- **41E:** `firestore.rules` remains the sole authority on writes;
  client-side disabling is defense-in-depth, never the security
  boundary itself, per Decision 42G.

---

## 11. Tenant Isolation / Security

Explicit proof, per the governance instruction, restated per decision:

- **No cross-business write:** 41A's entire design exists to prevent
  exactly this (§4.3); 41B/41C/41D/41E introduce no new Firestore path
  construction of any kind.
- **No cross-business read:** unaffected by any of 41A–41E; 41E's read
  path is scoped by the existing, unchanged `isOwnerOf(businessId)`.
- **No Owner/staff privilege escalation:** 41D explicitly preserves
  staff-denial; no other decision touches staff authorization in any
  way.
- **No subscription bypass:** 41C's `'legitimate'` classification and
  41E's read-only design both explicitly never attempt a write while
  blocked; `firestore.rules`' `subscriptionAllowsNewRecords` gate is
  untouched and remains the actual enforcement, per Decision 42C/42G.
- **Client-side classification never becomes authorization:** the
  `classifyDraftSaveFailure` function (§6.2) and the `isOwner` branch
  in §7.2 are both read-only interpretations of already-authorized
  data (the client already knows its own subscription/role state
  live) — neither function grants or checks any permission itself;
  `firestore.rules` alone continues to decide what succeeds.
- **Old-business data remains associated with the old business:**
  §4.3's proof.

---

## 12. Failure / Recovery Behavior

| Decision | Normal | Failure | Recovery | Terminal |
|---|---|---|---|---|
| 41A | Flush succeeds, switch proceeds | Flush fails | Operator retries the switch (nothing was lost) | Not applicable — a failed switch is not itself a terminal state, only a retryable one |
| 41B | Unmount flush succeeds | Best-effort, same residual profile as Decision 39 (41F territory, not reopened here) | Same as Decision 39's existing residual risk | Same |
| 41C | Write confirmed on first attempt | Transient → auto-retry (1s/2s/4s) | Manual retry (save-failed, save-unknown) | save-failed (retries exhausted), save-blocked (legitimate, no retry offered) |
| 41D | Snapshot delivered normally | Owner-session listener error | Manual retry re-subscribes/re-fetches | Non-blocking error banner, operator may still proceed to a fresh count |
| 41E | Operator views/recovers while blocked | N/A — read-only, no write attempted | N/A | N/A |

---

## 13. Concurrency

No new concurrency risk beyond what the Rule 8 Assessment already
found (§K), reaffirmed here with the concrete designs above:

- 41A's `switchInFlightRef` (§4.3) directly resolves the "second
  switch while first pending" question the Rule 8 Assessment left as
  an Implementation Plan item.
- 41C's retry mechanism is explicitly serialized through the existing
  `draftInFlightSaveRef`, and newer edits explicitly cancel pending
  retries in both directions (§6.4) — no new race is introduced.
- 41B, 41D, 41E introduce no new concurrent-write surface.
- 41G (same-row, cross-device concurrent editing) remains untouched
  and out of scope — nothing above interacts with or worsens it.

---

## 14. Performance

- 41A: one additional network round-trip only when pending work
  actually exists at switch time (§4.2, item 4); zero cost otherwise.
- 41B: identical, already-accepted cost as Decision 39's own unmount
  flush, now also paid by Initial Stock Count.
- 41C: bounded — at most 3 additional write attempts per row, only
  under genuine transient failure, with increasing backoff preventing
  any tight-loop load on Firestore.
- 41D: zero additional Firestore operations — pure client-side state
  addition.
- 41E: zero additional Firestore operations for the read-only path
  itself; the existing export mechanism (reused, not duplicated) has
  whatever cost it already has today.

No new background job, scheduled recomputation, or generalized
persistence layer is introduced anywhere above, per §3's non-goals.

---

## 15. Test Strategy (not created by this Plan)

**41A:** flush occurs and resolves before `updateDoc` fires (assert
ordering, not just outcome); the flushed write's Firestore path uses
the pre-switch `businessId` in every case, including when the flush is
artificially delayed past the point `activeBusinessId` would otherwise
have changed; the new business's path is never written to with the old
business's pending content; successful flush allows the switch;
failed flush prevents the switch and leaves `activeBusinessId`
unchanged; no-pending-work case makes zero Firestore calls; a second
`switchShop` call while the first is in flight throws immediately
(`switchInFlightRef`); Periodic and Initial both covered independently.

**41B:** unmount during a pending debounce flushes the latest typed
value, not a stale one; no regression to the existing
`visibilitychange`/`pagehide` behavior (assert those two listeners are
still wired exactly as before).

**41C:** first-attempt success; transient failure → retry 1 (1s) →
retry 2 (2s) → retry 3 (4s) → success; retry exhaustion after 3 →
`'save-failed'`; manual retry from `'save-failed'` and `'save-unknown'`
succeeds; subscription-blocked write never auto-retries and reaches
`'save-blocked'` immediately; a simulated `permission-denied` while
NOT blocked routes to `'save-unknown'`, never `'save-blocked'`; a
tagged readback failure routes to `'save-unknown'` regardless of the
underlying error code; a newer edit cancels a pending retry for the
same row and is never overwritten by that retry's stale content;
retries never bypass `draftInFlightSaveRef`.

**41D:** loading; confirmed-empty; draft-exists; simulated Owner
listener error reaches `'load-error'`, distinct from confirmed-empty;
staff-session denial reaches the existing, unchanged behavior exactly;
manual retry from the error banner re-establishes a normal snapshot.

**41E:** blocked Owner with a meaningful existing draft reaches
`ReadOnlyDraftRecovery`, not `SubscriptionBlockedNotice`; blocked Owner
with no meaningful draft still reaches the existing
`SubscriptionBlockedNotice` unchanged; no `setDoc` call occurs anywhere
in the read-only path (assert via a Firestore-write spy/mock reporting
zero calls); export (where supported) succeeds while blocked;
`create`/`update`/finalize remain blocked at the rules layer regardless
of client state (existing rules test pattern, extended); staff
behavior is unaffected by any of the above.

**Regression tests from Decisions 38–40 that must remain passing (not
modified, only re-run):** `periodic-stock-interruption-durability.test.ts`,
`periodic-contagem-autosave-safety-decision-39.test.ts`,
`periodic-contagem-validar-decision-40.test.ts`,
`draft-save-server-verification.test.ts`,
`periodic-stock-shop-switch-guard.test.ts`,
`tests/firestore-rules.test.ts`'s existing `stockCountDrafts` block.

---

## 16. Verification Strategy

At implementation time (not performed by this Plan): `npm run lint`
(typecheck), `npm run test:all` (full existing suite must remain
green), `npm run test:rules:emulator` (existing rules tests, plus any
new read-while-blocked assertion, must pass against the actual
Firestore emulator — noted per this session's own prior finding that
the emulator's binary download is blocked by this sandboxed
environment's network allowlist; verification of the rules-layer
tests specifically will require an environment with access to
`storage.googleapis.com`, an environment constraint, not a plan gap),
and a manual/scripted trace confirming the §4.3 ordering proof for
41A (flush resolves strictly before `updateDoc`) since that specific
ordering guarantee is best confirmed by a targeted unit test with a
mocked, deliberately-delayed flush function, per §15.

---

## 17. Implementation Order

**Phase 1 — 41A (business-switch coordination).**
*Objective:* eliminate the confirmed cross-tenant-write risk first,
since it is the only finding in this whole increment with actual
data-integrity stakes if implemented incorrectly.
*Files:* `AppContext.tsx`, `PeriodicStockCountView.tsx`,
`InitialStockCountView.tsx`, optionally `ShopSwitcher.tsx`.
*Invariants:* §4.3's ordering proof.
*Tests:* §15, 41A block.
*Verification:* `npm run lint`, `npm run test:shop-switch-guard`
(existing) plus new tests, manual ordering trace.
*Rollback:* revert the three/four files; no persisted data shape
changed, so rollback carries no migration concern.

**Phase 2 — 41B (Initial Stock unmount parity).**
*Objective:* smallest, lowest-risk change in the whole increment;
sequenced early to bank a quick, independent win before the more
involved 41C.
*Files:* `InitialStockCountView.tsx` only.
*Invariants:* live-state-at-unmount, inherited unmodified.
*Tests:* §15, 41B block.
*Verification:* `npm run lint`, targeted new test, existing Initial
Stock test suite re-run.
*Rollback:* revert one effect addition.

**Phase 3 — 41C (autosave failure classification/retry/recovery).**
*Objective:* the largest, most stateful change; sequenced after 41A/41B
so the simpler mechanisms are stable first, and because 41C's own
manual-retry action reuses the same underlying save functions 41A's
flush also calls — having 41A stable first reduces the surface 41C
needs to reason about.
*Files:* new `lib/draftSaveFailureClassification.ts`, `AppContext.tsx`,
both views.
*Invariants:* §6, all of them.
*Tests:* §15, 41C block (the largest test set in this increment).
*Verification:* `npm run lint`, `npm run test:all`, targeted new tests.
*Rollback:* revert the four files; `draftSaveState`/`draftSaveState`-
equivalent type widening is additive (new union members), so no other
code reading the old, narrower type is broken by rollback either
direction, provided the widening itself doesn't ship partially.

**Phase 4 — 41D (listener error distinction).**
*Objective:* independent of 41A–41C; sequenced after them only because
it is lower-stakes and benefits from the codebase being in a settled
state after the larger 41C change.
*Files:* `AppContext.tsx`, both views.
*Invariants:* staff-denial preservation (§7.2).
*Tests:* §15, 41D block, including the explicit staff-denial
regression assertion.
*Verification:* `npm run lint`, targeted new tests, `tests/firestore-rules.test.ts`
staff-denial cases re-run (unmodified, must still pass).
*Rollback:* revert the new error-state additions; existing
success/empty paths are untouched by rollback.

**Phase 5 — 41E (subscription-blocked accessibility).**
*Objective:* sequenced last because it depends on 41D's clean
loading/error-state distinction being in place first (the read-only
gate in §8.2 is inserted relative to `periodicStockDraftLoaded`, which
41D also touches) and benefits from 41C's failure-state vocabulary
being stable (the read-only view must never enter any of 41C's new
save states, which is easiest to guarantee once those states are
finalized).
*Files:* new `ReadOnlyDraftRecovery.tsx`, both views.
*Invariants:* §8.3, §8.4 (no write, no rules change).
*Tests:* §15, 41E block, including the explicit zero-write assertion.
*Verification:* `npm run lint`, targeted new tests, `tests/firestore-rules.test.ts`
subscription-blocked cases re-run and extended.
*Rollback:* revert the new component and the gate-reordering; the
unchanged `SubscriptionBlockedNotice` fallback path means a partial
rollback still leaves the pre-existing, safe behavior intact.

This order deviates from the originally suggested 41A→41B→41C→41D→41E
sequence in the request only in its justification (41B before 41C for
a quick independent win; 41D before 41E for a genuine dependency), not
in the ordering itself — the suggested order is confirmed, by this
analysis, to already be the safer dependency order.

---

## 18. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| 41A's coordination mechanism has a bug allowing a race between the flush and `updateDoc` | §4.3's ordering is enforced by plain sequential `await`, not a separate timing mechanism — the risk is implementation-bug-level, not design-level; the ordering-proof unit test (§16) is specifically aimed at catching this |
| 41C's retry logic accidentally creates a duplicate write | Every retry routes through the exact same `savePeriodicStockDraftItem`/`Meta` full-document `setDoc` already in use — a duplicate attempt with identical content is idempotent by construction, not merely by convention |
| 41C's four-state UI adds visual complexity operators find confusing | Scoped deliberately to distinct, short, plain-language labels per state (§6.1); no new modal/dialog introduced |
| 41D's new error banner becomes a second, competing "is my data safe" signal alongside 41C's save-state label | Kept deliberately separate in scope: 41D concerns *loading/resuming* a draft, 41C concerns *saving* one — the two banners describe different moments in the lifecycle and should not co-occur in practice (the error-loading banner only shows before `periodicStockDraftLoaded`'s resume decision is even made) |
| 41E's `ReadOnlyDraftRecovery` accidentally shares enough code with the editable workspace that a future edit to one silently un-disables the other | Isolated into its own component (§8.5) specifically to avoid this — not implemented as a prop flag deep inside the existing editable view's own render tree |
| Emulator-based rules verification is blocked in this development/investigation environment | Documented explicitly (§16) as an environment constraint; does not block Implementation Authorization, but must be resolved (an environment with `storage.googleapis.com` access) before Stage 8 verification can be completed end-to-end |

---

## 19. Rollback Considerations

Every file change proposed above is additive (new functions, new
optional state, new narrow branches) rather than a rewrite of existing
logic — confirmed per-decision in §4–§8's own "invariant preserved"
columns. No Firestore document shape changes, so no data migration is
entailed by rollback in either direction for any of 41A–41E. Rollback
of any single phase does not require rolling back any other phase,
since the five decisions' file changes, while sometimes touching the
same file, are additive and independently revertable (confirmed via
§9's file-impact table showing which decision touches which file).

---

## 20. Governance Gate Statement

**THIS IMPLEMENTATION PLAN DOES NOT AUTHORIZE IMPLEMENTATION.**

No code, test, Firestore rule, or index has been written, modified, or
authorized by this document. Decision 41, Decision 42, the Rule 8
Assessment, and Decisions 38–40 remain unmodified.

---

## 21. Next Gate

```
This Implementation Plan (draft)
  → Product Architect Acceptance of this Implementation Plan
  → Stage 8 Implementation Authorization (separate, signed document)
  → Implementation
  → Verification
```

No gate in this sequence may be skipped or collapsed.

---

## 22. Product Architect Acceptance

### Review performed against the 15-point acceptance test

1. **Implements only 41A–41E** — confirmed; §2/§3 scope this
   explicitly, and no section proposes work for 41F/41G.
2. **Preserves all Decision 41 non-goals** — confirmed against Decision
   41 §4: no Contagem/ShopSwitcher/draft-architecture redesign, no
   Firestore/Firebase replacement, no offline-first architecture, no
   collaborative editing, no product catalog/subscription/Dashboard/
   Business Worth/finalized-record/timeline changes, no extension of
   41E beyond Periodic and Initial.
3. **Preserves all Decision 42 decisions** — 42A's exact required/
   forbidden sequence is reproduced verbatim in §4.3's design and
   proven in §4.3's own proof; 42B's failure behavior is preserved
   unchanged in §4.4 item 7; 42C's subscription classification, 42D's
   readback-unknown classification, and 42E's 3-retry/4-total/
   increasing-backoff policy are each implemented exactly as specified
   in §6.2–§6.5; 42F's error-code discipline (no unverified
   classifications) is honored in §6.2's own commentary; 42G's
   no-security-change constraint is honored throughout §11.
4. **Respects the FINAL Rule 8 Assessment** — every item that
   assessment's §R left as an Implementation Plan question (41A's
   exact coordination mechanism and second-switch handling; 41C's
   exact backoff values and error-code table; 41E's read-only-vs-
   editable UX choice) is resolved in this Plan, and nowhere does this
   Plan reopen any of the assessment's own READY findings.
5. **Does not reopen Decisions 38–40** — confirmed; every mechanism
   from those decisions (`draftInFlightSaveRef`/`flushInFlightSaveRef`,
   `latestFlushArgs`, per-row documents, the resume banner, atomic
   finalization) is reused unmodified throughout §4–§8, never redesigned.
6. **No unauthorized product redesign** — confirmed by direct review;
   no change touches Contagem's workflow shape, ShopSwitcher's general
   UI beyond the recommended, non-required disabling guard, or any
   module outside the five decisions' own stated scope.
7. **Tenant isolation preserved** — §4.3's ordering proof and §11's
   explicit cross-business write/read analysis are both direct and
   sufficient.
8. **Owner/staff authorization preserved** — §7.2's staff-branch is
   byte-for-byte the existing behavior; no other section touches role
   checks.
9. **Subscription enforcement preserved** — §6.2/§8.4 both explicitly
   keep `firestore.rules`' `subscriptionAllowsNewRecords` as the sole
   authority; client-side signals are read-only interpretations, never
   a substitute enforcement.
10. **Existing draft persistence/serialization mechanisms preserved**
    — confirmed reused, not replaced, in every "invariant preserved"
    column of §4.5, §5, §6.7, §7.5, §8.5.
11. **No generalized offline architecture** — confirmed; §14 and §3
    explicitly rule this out, and no section introduces one.
12. **No unnecessary schema migration** — confirmed; §9's table marks
    every Firestore rules/index cell "No change," and no document shape
    is altered anywhere in §4–§8.
13. **41F not implemented** — confirmed absent from scope throughout.
14. **41G not implemented** — confirmed absent from scope throughout.
15. **Does not authorize implementation prematurely** — §20's governance
    gate statement is explicit and is honored by this review itself,
    which changes no code.

### Specific decisions validated

**41A:** the coordinated pre-switch flush design is confirmed to
preserve the required invariant — `switchShop`'s own `updateDoc` is
structurally the last statement in the function, reached only after
the registered flush's `await` resolves successfully, so the old
business remains active for the entire duration of every write the
flush performs. `switchInFlightRef` correctly prevents a second
concurrent `switchShop` call from racing the first (§4.3); its
declaration is implied by §4.5's file-impact table though not spelled
out as a standalone line in §4.3's code excerpt — noted as a trivial
documentation completeness observation, not a design defect, and not
required as a formal amendment. No cross-business write path exists in
this design. **Accepted as designed; no redesign required.**

**41B:** confirmed as a minimal, direct port of Periodic Contagem's
own already-proven unmount-flush mechanism, with no new risk
introduced. **Accepted as designed.**

**41C:** the four-state model, the 3-retries-after-initial/4-total
count, increasing backoff, subscription-blocked non-retry, readback-
failure-as-unknown, retry serialization via `draftInFlightSaveRef`, and
newer-edit cancellation are all confirmed present and correctly
specified in §6. **The 1s → 2s → 4s backoff parameterization is
ACCEPTED** as the implementation-plan-level fixing of Decision 42E's
deliberately deferred exact values — simple, standard exponential
doubling, bounded, matching the required count exactly.

**41D:** the four listener states (loading, confirmed-no-draft,
draft-exists, load-error) are confirmed correctly derived in §7.3;
staff denial is confirmed preserved exactly (§7.2's `!isOwner` branch
reproduces today's behavior verbatim); an Owner-session error is
confirmed to no longer collapse into "confirmed empty." **Accepted as
designed.**

**41E:** the resolution in favor of genuinely read-only existing-draft
recovery (§8.1) is **ACCEPTED**. Confirmed: existing legitimate drafts
remain readable (§8.2, §8.4); no incidental write occurs (§8.3, both
by inherited property and by added defense-in-depth); create/update
remains subscription-enforced and finalization remains blocked (no
"Confirmar" path exists in `ReadOnlyDraftRecovery` per §8.2); Firestore
rules remain unchanged (§8.4, confirmed by direct rule-text citation).

### Governance check — scope expansion

Reviewed specifically for accidental changes to business philosophy,
product positioning, Contagem workflow, subscription policy, Firestore
authorization, data model, finalized `StockCount` records, Business
Worth, Dashboard, or any other module. **None found.** Every change in
§4–§8 is confined to the five decisions' own stated scope, and §9's
file-impact table confirms no file outside that scope is touched.

### Verdict

**A. ACCEPT.**

**PRODUCT ARCHITECT ACCEPTANCE**

**Implementation Plan:** Data Protection Hardening — Decision 41A–41E
**Status:** ✅ **ACCEPTED**
**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 2 September 2026

> "I accept the Implementation Plan for Decision 41A–41E as the
> authorized engineering plan against the FINAL Rule 8 Assessment and
> Decisions 41–42. The Plan is accepted as written within its stated
> scope, constraints, invariants, and non-goals. This acceptance does
> not itself constitute Stage 8 Implementation Authorization."

**Plan Acceptance ≠ Implementation Authorization.** No code, test,
Firestore rule, or index has been written, modified, or authorized by
this acceptance. Decisions 38–42 and the Rule 8 Assessment remain
unmodified.

**Next gate: Stage 8 Implementation Authorization** (separate,
not-yet-created, signed document).
