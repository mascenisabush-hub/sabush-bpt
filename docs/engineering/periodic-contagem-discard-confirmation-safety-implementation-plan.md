Implementation Plan

# Periodic Contagem "Começar de Novo" — Discard-Confirmation Safety Fix

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
§6, §13 → [Governance Gate Determination + Rule 8 Assessment](./periodic-contagem-discard-confirmation-safety-rule8-assessment.md)
(READY).

**Baseline:** `main = origin/main = a07b71802d34542fc327ba043edd91939b003314`,
working tree clean.

**Does not authorize implementation.** Implementation Authorization
remains a separate, signed document (drafted next, not yet signed).

---

## 1. Scope

**In scope — exactly two changes, both in `PeriodicStockCountView.tsx`:**

1. **Confirmation step (Rule 8 Finding 1).** A new local UI state
   (e.g. a boolean or small enum, scoped to this component) inserted
   between the existing stale-draft banner and `handleDiscardDraft`
   itself. "Começar de Novo" no longer calls `handleDiscardDraft`
   directly — it transitions to a confirmation view with exactly two
   actions:
   - **Cancelar** — returns to the original banner. Calls neither
     `handleDiscardDraft` nor `clearPeriodicStockDraft`. The draft is
     completely untouched.
   - **Começar Nova Contagem** — the actual, now-deliberate trigger.
     Calls the (Finding 2-corrected) `handleDiscardDraft`.
   "Retomar Contagem" (`handleResumeDraft`) remains reachable and
   unmodified, from both the original banner and the new confirmation
   state.

2. **Safe delete sequencing (Rule 8 Finding 2).** `handleDiscardDraft`
   reordered so `await clearPeriodicStockDraft()` completes **before**
   `setDraftBannerDismissed(true)` runs — not after, as today. A brief
   loading state covers the (typically sub-second) window while the
   delete is in flight, reusing the existing `!periodicStockDraftLoaded`
   loading-screen pattern/copy style already established in this file.
   The confirming button is disabled/inert for the duration of this
   window, so a second click cannot re-trigger the delete mid-flight.

**Explicitly not in scope:** any change to `handleResumeDraft`,
`scheduleDraftSave`, `savePeriodicStockDraft`, `PeriodicStockDraft`'s
schema, `stockCountDrafts/periodic`'s document id/shape, any
`firestore.rules`/`firestore.indexes.json` file, Initial Stock in any
respect, finalization (`recordStockCount`), or any multi-draft/
second-storage-location mechanism.

## 2. Exact Implementation Elements

- New local state (component-scoped): distinguishes "showing the
  original banner," "showing the discard-confirmation step," and
  "discard in progress" (the Finding 2 loading window). No Firestore
  field, no new ref beyond ordinary component state.
- `handleDiscardDraft`'s own body reordered per Finding 2 — its
  signature and its call to `clearPeriodicStockDraft()` are otherwise
  unchanged.
- New copy for the confirmation step and the brief "discarding" loading
  state — exact wording is an implementation-task-level detail (per
  Rule 8 §2.6), not fixed here; must read as a genuine, deliberate
  choice (not restate the same warning prose the current banner already
  shows) and must clearly distinguish itself from Retomar Contagem's own
  copy.

## 3. Testing Plan

Per Rule 8 §2.5:
1. A test proving `clearPeriodicStockDraft`/`handleDiscardDraft` is
   unreachable from the banner's first-level "Começar de Novo" click
   alone — only from the confirmation step's own second action.
2. A test proving "Cancelar" returns to the original banner without
   ever calling `clearPeriodicStockDraft`.
3. A test proving `handleResumeDraft`/"Retomar Contagem" remains
   callable, unmodified, from both banner states.
4. A structural/source-order test proving `handleDiscardDraft` awaits
   `clearPeriodicStockDraft()` before `setDraftBannerDismissed(true)` —
   closing F4, matching this repository's established no-DOM-harness,
   source-order-assertion convention.
5. Full regression: `periodic-stock-interruption-durability.test.ts`,
   `periodic-stock-finalization.test.ts`, and any other suite touching
   `scheduleDraftSave`/the three existing write-tracking refs, re-run
   unmodified.

## 4. Risks (carried from Rule 8 §2.6)

Confirmation copy is a small remaining implementation-task decision.
The brief delete-in-flight loading window must disable the confirming
action to prevent a rapid double-click from issuing a second
`clearPeriodicStockDraft()` call — a normal implementation-care item.

## 5. Governance Dependencies

This Plan does not authorize implementation. Per Part 1 of the
governing Rule 8 Assessment: no BDR, no Specification Amendment
required. Next and final gate: a signed Implementation Authorization.
