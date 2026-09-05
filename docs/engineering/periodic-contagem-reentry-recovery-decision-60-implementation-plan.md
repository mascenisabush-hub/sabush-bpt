Implementation Plan — RETROACTIVE RECORD (implementation already shipped)

# Periodic Contagem Interruption/Re-Entry Recovery, Authoritative-State Synchronization, and False-Conflict Prevention — Implementation Plan (Decision 60)

**Status:** ✅ **RETROACTIVE RECORD.** Unlike every prior Implementation Plan in this chain, this document was drafted **after** implementation, not before it — at the Product Architect's own explicit, direct instruction ("start implementation according to docs" → "Continue" ×2 → "go ahead"), mirroring the same retroactive-governance pattern already used and ratified for Decision 59 (`../specs/stock-count-data-loss-resilience-decision-59-amendment.md`). This document does not itself authorize anything further — it records what was actually planned and built, for the Implementation Authorization (this same governance action's second document) to formally, retroactively ratify.

**Governing chain:** [Decision 60 amendment](../specs/stock-count-data-loss-resilience-decision-60-amendment.md) (✅ Accepted, 5 September 2026; §13 records Decisions A/B/C) → [Rule 8 Assessment](./periodic-contagem-reentry-recovery-decision-60-rule8-assessment.md) (✅ FINAL, updated status **READY FOR IMPLEMENTATION PLANNING, ONCE FORMALLY AUTHORIZED TO PROCEED**) → the Entry-Order Sort Mode Amendment (`periodic-contagem-entry-sequence-implementation-authorization.md` §6) → **this Plan** → the accompanying Implementation Authorization (same governance action).

**Baseline at the moment implementation actually began:** `main @ 30cf20e23a430d4f5ffb04f069ec33b1ae8d3e4b` (the commit that recorded Decisions A/B/C), working tree clean.

**Final state after implementation:** `main @ e62bddb3c7f0b133a93fa20734ac94dc76da1d7e`, four commits, each independently typechecked and tested before the next began:

| Checkpoint | Commit | Decision 60 requirement(s) addressed |
|---|---|---|
| 1 | `5a4af67` | §2 (same-writer false-conflict prevention); §7 (existing backlog cleanup) |
| 2 | `2d439fe` | §5 (two new timestamp-based sort modes, per the Entry-Order Sort Mode Amendment) |
| 3 | `ea84a5c` | §13.B (sort-mode persistence); §13.A item 10 (working-position recovery) |
| 4 | `e62bddb` | §13.A (resume/re-entry no longer forces a decision) |

Requirements §0 items 2, 4, 7, 8, 9 (latest authoritative shared state, complete product list, existing authority model, stale-local-state protection, Decision 55 preservation) required **no implementation** — the Rule 8 Assessment (§2.B, §2.D, §2.G, §2.H, §2.J) confirmed each already fully satisfied by existing architecture, and this Plan does not revisit that finding.

---

## 1. Purpose

Translate the accepted Decision 60 requirements — as narrowed by the Product Architect's own Decisions A/B/C (§13 of the Decision 60 amendment) and the Entry-Order Sort Mode Amendment — into the four-checkpoint file-by-file shape actually built, so the Implementation Authorization has a concrete plan to ratify rather than only a list of commits.

## 2. Scope, By Checkpoint

### Checkpoint 1 — Same-writer false-conflict prevention + one-time backlog cleanup

**Files:** `apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/components/PeriodicStockCountView.tsx`.

**AppContext.tsx — `savePeriodicStockDraftItem`:** one new branch inserted between the existing same-value branch and the existing genuine-collision branch: `if (current.lastWriterUid === currentUser.uid)`, advancing rev/state/writer/timestamp exactly like the same-value branch — no `CONFLICT`, no observation recorded. Per Rule 8 Assessment §2.C, this was already fully specified with no open governance question; `firestore.rules`' existing `lastWriterUid == request.auth.uid` enforcement (unchanged, confirmed at rules lines ~1456/1469) makes this un-spoofable. Decision 55's genuine-collision branch is otherwise untouched.

**PeriodicStockCountView.tsx — bulk backlog cleanup (Decision 60 §7):** a new `autoResolvableConflictEntries` memo scans `periodicStockDraftItemsByKey` for rows in `CONFLICT` state qualifying under exactly the two categories §7 permits (same-writer, resolved to the later `at`; blank-vs-real, resolved to the non-blank value). A new "Resolver automaticamente os conflitos óbvios (N)" button, gated behind a confirmation naming exactly how many rows qualify and how many remain manual, calls `resolvePeriodicConflict` — completely unmodified — once per qualifying row, sequentially. Any row failing both categories is left untouched, exactly as Rule 8 §6 required.

### Checkpoint 2 — Two new timestamp-based sort modes

**Files:** `apps/tenant/src/components/PeriodicStockCountView.tsx`.

Extends `validatedSortMode`'s type with `'time-desc' | 'time-asc'`. `unifiedListEntries` now carries each entry's own `lastWriteAt`, read directly from `periodicStockDraftItemsByKey` (never local state). `sortByValidatedMode` gains a `getTimestamp` parameter and the two new cases, mirroring `'entry-order'`'s own missing-value/tie-break shape exactly, without sharing logic with it. The six-mode `<select>` now exposes all six Decision 60 §5 modes, plus `'entry-order'` preserved as a seventh option per the Entry-Order Sort Mode Amendment's explicit "not removed" requirement.

### Checkpoint 3 — Sort-mode + working-position persistence

**Files:** `firestore.rules`, `apps/tenant/src/types.ts`, `apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/components/PeriodicStockCountView.tsx`.

New collection `businesses/{businessId}/periodicContagemUserPrefs/{uid}`, scoped identically to the existing `purchaseDrafts/{draftId}` pattern (`request.auth.uid == uid`, `isMemberOf` gated, never subscription-gated) — satisfying the Rule 8 Assessment's own Finding K review requirement (§2.E, §8 item 18) by construction: a different authenticated user has a different document path, so no cross-user leakage is possible. New `PeriodicContagemUserPrefs` type (`sortMode`, `lastWorkspaceProductKey`, `updatedAt`) — display/navigation state only, never a source of truth for quantity/state, per Decision 60's own explicit requirement. New isolated per-`(businessId, uid)` listener effect in `AppContext.tsx` (same pattern and reasoning as the existing `purchaseDraft` effect) plus `savePeriodicContagemUserPrefs`, a partial-merge write deliberately **not** wrapped in the heavier readback-uncertain-error discipline every durable business-data write uses — this is low-stakes UI preference, never Contagem data.

In `PeriodicStockCountView.tsx`: sort mode is restored once per mount (guarded so it never fights a later in-session change) and persisted on every subsequent change. The working-position pointer (`activeWorkspaceProductKey`) is persisted whenever a workspace opens for a real product. A new "Continuar de onde ficou: {product}" hint resolves the persisted pointer against the live unified list and, if still valid, offers one click back via the existing `handleUnifiedEntryClick` — no new activation mechanism. A stale pointer renders nothing, degrading gracefully per Rule 8 §4's own requirement.

### Checkpoint 4 — Resume/re-entry no longer forces a decision

**Files:** `apps/tenant/src/components/PeriodicStockCountView.tsx`.

Implements Decision 60 §13.A precisely. A new `autoResumedRef`-guarded effect auto-invokes the existing, unmodified `handleResumeDraft()` exactly once per mount, the moment a meaningful existing draft is confirmed loaded — never repeatedly, never overwriting an in-session edit (guarded exactly as §13.A item 5 requires: the system must never overwrite authoritative shared quantities with stale local state — this effect only decides *whether* to call an already-safe function, never touches data itself). The full-screen `draftDecisionPending` gate (both its idle and confirming states) is removed entirely. Per §13.A item 4 ("must NOT silently discard the active Contagem"), the discard action is not removed — it is relocated into an always-reachable toolbar entry point, preserving the exact same two-step safety chain the removed gate used (idle click opens confirmation; a distinctly-labeled "Começar Nova Contagem" is the only remaining path to `handleDiscardDraft`). `handleDiscardDraft`'s own internal ordering (await-before-dismiss) and disabled-during-discarding guards are completely unchanged.

## 3. What This Plan Confirms Was NOT Done

- No change to `resolvePeriodicConflict`'s own transaction semantics, the same-value branch, or the genuine-collision branch's preservation behavior (Decision 55 untouched).
- No change to Decisions 38–58's own scope, or to Decision 59's shipped fix/ratification.
- No automatic editor takeover of any kind.
- No silent redefinition of `entrySequence` as a timestamp; `'entry-order'` remains available, unconverted.
- No new permanent/scheduled background process for the backlog cleanup — it remains exactly the one-time, operator-triggered action Decision 60 §7 specified.
- No client-local time used as a substitute for the authoritative `lastWriteAt`.

## 4. Verification Performed

- `tsc --noEmit -p apps/tenant` — clean after every one of the four checkpoints.
- Every directly relevant test suite run after each checkpoint; where a suite's own assertions encoded the prior architecture's literal shape (click-wiring patterns, boundary-marker strings, button counts), those assertions were updated to match the new, still-equivalently-safe shape — never loosened. Full detail and pass counts are in each checkpoint's own commit message (`5a4af67`, `2d439fe`, `ea84a5c`, `e62bddb`).
- A full sweep across every periodic/contagem/stock/draft-related test file was run after Checkpoint 4. Every remaining failure was individually confirmed, via `git stash` comparison against the immediately-preceding checkpoint's own baseline, to be pre-existing test debt unrelated to this work — not a regression it introduced. `periodic-stock-finalization.test.ts` requires the Firestore emulator, unreachable in this sandbox (a pre-existing, documented constraint, not new).

## 5. Product Architect Acceptance

> I have reviewed this retroactive Implementation Plan for Decision 60, covering all four checkpoints actually built (commits `5a4af67`, `2d439fe`, `ea84a5c`, `e62bddb`). I confirm this matches what I directed by instructing implementation to proceed ahead of the normal Plan-before-Authorization sequence. My acceptance here is recorded together with, and ratified by, the accompanying Implementation Authorization (same governance action).
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 2026-09-05
> **Decision:** ✅ ACCEPTED AS A RECORD OF WHAT WAS BUILT
