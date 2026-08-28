Implementation Authorization

# Periodic Contagem "Começar de Novo" — Discard-Confirmation Safety Fix

**Status:** ✅ **ACCEPTED AND AUTHORIZED. Signed 28 August 2026 by
SABUSHIMIKE MASCENI, Product Architect.**

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
§6, §13 → [Governance Gate Determination + Rule 8 Assessment](./periodic-contagem-discard-confirmation-safety-rule8-assessment.md)
(READY) → [Implementation Plan](./periodic-contagem-discard-confirmation-safety-implementation-plan.md).

**Baseline:** `main = origin/main = a07b71802d34542fc327ba043edd91939b003314`.

---

## 1. What This Authorization Covers (once signed)

Exactly two changes, both confined to `apps/tenant/src/components/PeriodicStockCountView.tsx`:

1. A genuine second confirmation step inserted between the existing
   stale-draft banner and the actual discard — "Começar de Novo" no
   longer triggers `handleDiscardDraft` directly; it opens a
   confirmation state with **Cancelar** (returns to the banner, draft
   untouched) and **Começar Nova Contagem** (the deliberate trigger).
2. `handleDiscardDraft` reordered so `clearPeriodicStockDraft()` is
   fully awaited **before** `setDraftBannerDismissed(true)` runs,
   closing the identified autosave/delete race (F4), with a brief
   loading state covering the delete-in-flight window.

## 2. What This Authorization Does Not Cover

Any change to `handleResumeDraft`/"Retomar Contagem"; `scheduleDraftSave`;
`savePeriodicStockDraft`; `PeriodicStockDraft`'s schema;
`stockCountDrafts/periodic`'s document id or shape; any
`firestore.rules`/`firestore.indexes.json` file; Initial Stock in any
respect; finalization/`recordStockCount`; any multi-draft, second-
storage-location, or retention-policy mechanism.

## 3. Acceptance Criteria

1. A single click on "Começar de Novo" never calls
   `clearPeriodicStockDraft`.
2. "Cancelar" (from the new confirmation step) leaves the draft
   completely intact and never calls `clearPeriodicStockDraft`.
3. "Retomar Contagem" continues to work exactly as today, from both
   banner states.
4. Only the confirmation step's own "Começar Nova Contagem" action
   triggers discard — matching today's existing destructive outcome,
   just gated behind a deliberate second step.
5. `handleDiscardDraft` awaits the delete before revealing the blank
   form — closing F4 by construction, not by convention.
6. No schema, storage, retention-policy, or multi-draft mechanism is
   introduced.
7. All tests named in the Implementation Plan §3 pass; full regression
   on `periodic-stock-interruption-durability.test.ts` and
   `periodic-stock-finalization.test.ts`.

## 4. Governance Gates

No BDR. No Specification Amendment — this resolves an already-open item
in the governing Specification's own §13/§6 (per the Rule 8 Assessment's
Part 1 determination). This document is the final gate; once signed, it
authorizes exactly the two changes in §1, nothing more.

---

## 5. Product Architect Signature

**Status:** ✅ **ACCEPTED AND AUTHORIZED.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED
**Date:** 28 August 2026

This authorizes exactly the two changes in §1, nothing more. Implementation proceeds against this signed scope.
