# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 59 — CONFLICT-Backlog Rows No Longer Silently Refuse Ordinary Edits

**Status:** ✅ IMPLEMENTED — RATIFIED AS SHIPPED — 5 September 2026 (see §7a for the recorded signature; §7 preserved above it as the historical record of what was circulated for review). Code shipped and merged to `main` ahead of the normal gate sequence, at the Product Architect's own explicit, direct instruction, in response to a live production report from a real user. This document gives that already-shipped change the same governance record every other change in this chain receives — the deviation from the normal order is disclosed plainly in §6 rather than presented as though the normal sequence was followed.
**Resolves:** A live production report — an operator could not edit an already-validated product in an active Periodic Contagem; the edit appeared to simply "not be accepted."
**Builds on:** [Decision 39 Amendment](./stock-count-data-loss-resilience-decision-39-amendment.md) (per-row autosave), [Decision 41 Amendment](./stock-count-data-loss-resilience-decision-41-amendment.md) (bounded retry/error classification), [Decisions 44–56](../engineering/periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md) (shared live data, conflict semantics), [Decision 55 Amendment](./stock-count-data-loss-resilience-decision-55-amendment.md) (Same-Row Concurrent Observation Conflict Semantics — the no-automatic-winner principle this fix does not touch), [Decision 58 Amendment](./stock-count-data-loss-resilience-decision-58-amendment.md) (interruption-flush persistence/retry parity — the fix that stops NEW blank-placeholder conflicts, distinct from this fix, which only stops the EXISTING backlog from silently blocking edits). This decision assumes and does not restate, reinterpret, weaken, or expand any of their governance content.
**Does not reopen:** Decisions 38, 39, 40, 41, 44–58's own already-accepted content.
**Affected Area:** Periodic Contagem — the ordinary catalog/manual-row edit path (`handleEditCatalogRow`, `handleEditManualRow`, the unified product list) in `PeriodicStockCountView.tsx` only. Does not touch `savePeriodicStockDraftItem`, `resolvePeriodicConflict`, `firestore.rules`, or any conflict data itself.
**Decision Authority:** Product Architect
**Implementation Status:** ✅ IMPLEMENTED — commit `4e56521` on `main`, pushed to `origin/main` (`333d305..4e56521`).

---

# 1. What Was Reported

A real user (operator) reported directly to the Product Architect: attempting to edit an already-validated ("Editar") product in an active Periodic Contagem was not accepting the edit. This was reported as a live, in-production problem, not a hypothetical.

---

# 2. Root Cause, Confirmed Directly Against Repository State at the Time

This is a live symptom of the same historical backlog already named in the (separate, still-pending, broader) Decision 59/60 proposal's Root Cause #1 — the pre-Decision-58 blank-placeholder collisions — colliding with the ordinary editing UI in a way nothing had previously guarded against:

1. **A `CONFLICT`-state row never left the ordinary editable list.** `catalogRows`/`manualRows` hold one entry per product unconditionally. The existing live-adoption effect (`PeriodicStockCountView.tsx`, the effect keyed on `[periodicStockDraftItemsByKey, ...]`) already, correctly, never overwrites a `CONFLICT` row's local copy — but the side effect is that row keeps looking exactly like an ordinary, possibly-validated product in the main list, with nothing distinguishing it.
2. **Any attempt to save an edit to it was silently refused.** `savePeriodicStockDraftItem`'s own existing transaction (`AppContext.tsx`) already throws a plain `Error` when `currentState === 'CONFLICT'` — correct, pre-existing, intentional behavior, not touched by this fix.
3. **That refusal was invisible.** The thrown error carries no Firestore error code, so `classifyDraftSaveError` always routed it to the generic `'save-unknown'` bucket — surfaced only as a small, page-level, non-row-specific "Estado do rascunho desconhecido" indicator, with a "Tentar novamente" button that could never actually help (the row stays `CONFLICT` until resolved through the separate panel). From the operator's seat this was indistinguishable from the app simply not accepting the edit.

---

# 3. Fix Implemented

Scoped narrowly to the presentation/entry-point layer only — no change to conflict data, resolution logic, or the save transaction itself:

1. **`handleEditCatalogRow`/`handleEditManualRow`** (`PeriodicStockCountView.tsx`) now check the row's *authoritative server-side* state (`periodicStockDraftItemsByKey`) before opening it for editing. If it is `CONFLICT`, the operator sees a clear, specific alert ("Este produto tem um conflito por resolver...") and is scrolled directly to the existing "Conflitos por resolver" panel, instead of being let into an edit that was always going to be silently refused.
2. **The unified product list** now visually distinguishes a `CONFLICT` row (amber styling, warning icon, "Resolver conflito" label) instead of presenting it as an ordinary validated/unvalidated entry — proactive discoverability, not only a reactive block.
3. A small `conflictPanelRef`/`scrollToConflictPanel` helper backs both of the above.

**Explicitly not done, and not needed:** no change to `resolvePeriodicConflict`, `savePeriodicStockDraftItem`'s transaction, `firestore.rules`, or the conflict data model. The existing backlog-cleanup proposal (the separate, broader, still-pending Decision 59/60 draft, §7 there) remains the correct mechanism for actually clearing the backlog; this fix only stops that backlog from silently blocking ordinary edits in the meantime.

---

# 4. Verification Performed

- `tsc --noEmit -p apps/tenant` — clean.
- Every directly relevant existing structural test suite re-run and passing after this change: `periodic-contagem-existing-product-edit-confirm-workflow.test.ts` (33/33), `periodic-contagem-single-product-workspace.test.ts` (45/45), `periodic-contagem-concept-c-validated-compaction.test.ts` (33/33). Three assertions in these suites had encoded the prior, literal click-wiring shape (`if (!disabled) handleUnifiedEntryClick(entry);`, a two-way `Editar`/`Abrir` ternary, a two-way `sr-only` label) — each was updated to assert the new, still-equivalently-safe shape (same `disabled` guard checked first, same accessible text, same single shared click path — now via one `handleEntryActivation` wrapper — with an added, distinct `CONFLICT` branch), never loosened.
- Confirmed, by stashing this change and re-running, that the small number of remaining test failures elsewhere in the suite (`periodic-contagem-validar-decision-40.test.ts` — 2; `periodic-stock-shop-switch-guard.test.ts` — 1) **pre-exist on `main` before this change** and are unrelated to it — left untouched, not silently absorbed into this fix's own scope.

---

# 5. Confirmations Required by This Repository's Own Discipline

- **Decision 55's no-automatic-winner principle is untouched.** This fix does not resolve any conflict, automatically or otherwise — it only stops the *ordinary* edit path from being offered against a row that was always going to be refused, and points the operator at the one place (the existing conflict panel) where a human still makes that choice, exactly as Decision 55 requires.
- **Decision 58 is not reopened.** Its own scope (the interruption-flush path) is untouched; this fix touches only the ordinary edit-entry functions and the unified list's render.
- **Finding K / tenant and shared-device isolation are unaffected** — no overlapping file touched.
- **The separate, broader, still-pending Decision 59/60 proposal (leave/return recovery, same-writer prevention, sorting, etc.) is not superseded or answered by this fix.** That proposal's own §7 (existing-backlog bulk cleanup) remains open and undecided; this fix only addresses the *symptom* of the backlog blocking ordinary edits, not the backlog itself.

---

# 6. Disclosure — Why This Was Implemented Ahead of Authorization

This repository's own governance discipline requires Decision → Rule 8 Assessment → Implementation Plan → Implementation Authorization → Implementation, in that order, for every change, however small — and every prior decision in this chain, including Decision 58, followed it. This one did not: the Product Architect, on learning that a real user had already been personally affected in production, explicitly instructed implementation first, with governance documentation to follow retroactively. This document is that retroactive record, not a claim that the normal sequence was actually followed. The Product Architect's own signature in §7, below, is the explicit act that ratifies this specific deviation, for this specific change, and does not itself relax the requirement for every other change in this chain.

---

# 7. Signature — Retroactive Ratification

> I confirm that I directed this fix to be implemented ahead of the normal Decision → Rule 8 → Plan → Authorization sequence, in direct response to a live user-reported production issue, and that the fix as shipped (commit `4e56521`) matches what I authorized. I ratify this specific deviation for this specific change; it does not change the required gate sequence for any other change in this repository.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ RATIFIED AS SHIPPED &nbsp;&nbsp; ☐ RATIFIED WITH NOTED CONCERNS (specify) &nbsp;&nbsp; ☐ NOT RATIFIED — FURTHER ACTION REQUIRED

---

# 7a. Signature — Recorded

**Status: ✅ RATIFIED AS SHIPPED — SIGNED (5 September 2026).** Recorded additively below, per this repository's established signature-recording convention — the pending signature block immediately above (§7) is preserved unedited as the historical record of what was circulated for review; this section is the actual, dated act of ratification.

> I confirm that I directed this fix to be implemented ahead of the normal Decision → Rule 8 → Plan → Authorization sequence, in direct response to a live user-reported production issue, and that the fix as shipped (commit `4e56521`) matches what I authorized. I ratify this specific deviation for this specific change; it does not change the required gate sequence for any other change in this repository.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 2026-09-05
> **Decision:** ✅ RATIFIED AS SHIPPED

**What this signature ratifies:** the disclosed governance-sequence deviation (§6, above) for this one specific, already-shipped change — commit `4e56521` on `main` (governance record itself committed as `b0c1713`). It confirms the fix as shipped matches what the Product Architect directed.

**What this signature does NOT authorize:** any new implementation; any additional change to this decision's own technical scope; any relaxation of the normal Decision → Rule 8 → Plan → Authorization sequence for any other change in this repository, including the separate, broader Decision 60.
