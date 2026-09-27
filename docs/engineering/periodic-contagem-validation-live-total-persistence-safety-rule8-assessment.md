Rule 8 Assessment — Periodic Contagem §48 + Accepted A/B/C Persistence Decisions

**Status:** Rule 8 mechanism question (§18.B / Phase 4 server-side gate) **RESOLVED**. Independent implementation-readiness items below remain as originally assessed.

**Governance note on this document's own history:** the original Rule 8 assessment for §48 and Decisions A/B/C, and the subsequent narrow investigation resolving its one open item (§18.B), were both produced in prior investigation sessions but were never written to a file — they existed only in conversation. This document is that record, written now, in full, rather than as a fragment referencing a file that does not exist. Nothing about the evidence or conclusions below is new; this is the first time it has been committed to the repository's own governance record.

---

## 1. Governing decisions under assessment

**§48** (`docs/specs/periodic-contagem-validation-live-total-persistence-safety-amendment.md`, committed `70d2cfc`): the governing Contagem integrity principle; Unit required (blank invalid); Selling Price required and strictly positive; the live-total principle (no silent exclusion or substitution); Cost Price reaffirmed outside the Contagem contract (§44 unaltered).

**Decisions A/B/C** (accepted, not yet committed to a standalone file prior to this document): progression requires both valid input and safe persistence state (A); finalization must not proceed with unresolved persistence states (B); recovery evidence is surfaced proactively on resume, Option 1 (C).

**Preserved Save-unknown findings:** genuinely uncertain, not equivalent to failure; the underlying write may have actually succeeded; existing recovery snapshot/reconciliation machinery can already distinguish the relevant cases; the live `onSnapshot` listener must never be treated as authoritative merely because an update arrives.

## 2. Affected files, traced

**Definitely affected (if implemented):** `PeriodicStockCountView.tsx` — `validateWorkingRowForSave`, `advanceAfterValidation`, the auto-close-workspace effect, `handleRequestConfirmation`, `handleConfirmSave`, `groupableUnifiedEntries`.

**Explicitly unaffected, confirmed by direct trace:** `stockCount.ts`'s cost-basis derivation (§44 untouched); `InitialStockCountView.tsx`; the Business Worth Engine; product identity, stable row identity, migration, and tombstone mechanisms.

## 3. Current validation flow, traced precisely from source

`validateWorkingRowForSave`: only quantity is currently required. Unit has zero validation logic anywhere — no check exists. Cost price and selling price are each validated only if non-blank, never required. This directly confirms §48's Unit and Selling Price decisions describe a genuine, currently-unclosed gap, not a misreading.

Both progression paths — `advanceAfterValidation` (Ctrl/Cmd+Enter) and the auto-close-workspace effect — key on `row.validated` alone, with no consultation of `persistenceState`, confirmed by direct trace of both call sites.

## 4. Live total, traced precisely

`tallyStockCountRows` excludes a row only when `productName` or `quantity` is blank/unparseable. `validated` is carried per tally item but never filters the sum. Blank Unit defaults silently to `'un'`; blank/invalid Selling Price defaults silently to `0`. The total can, today, contain a product that never passed validation at all.

## 5. Cost Price separation, reconfirmed

Zero owner-editable cost-price input exists anywhere in the live Contagem UI, confirmed by direct search. §44 remains fully implemented and untouched by anything in §48 or Decisions A/B/C.

## 6. Save-unknown, traced

Generated via `classifyDraftSaveError`'s four paths (readback-unconfirmed, checked first and unconditionally; unexplained permission-denied; unrecognized Firestore code; retry-exhaustion). The dedicated `getDocFromServer` readback exists specifically because a transaction can resolve successfully to the client before the write is confirmed reaching the server on a degraded connection — meaning the underlying write may genuinely have succeeded even when this state fires. The synchronous, unconditional recovery snapshot already carries the exact attempted `baseRev`/content needed to resolve this later. The live listener has no `hasPendingWrites` awareness and must not be trusted as confirmation on its own.

## 7. Finalization, traced

`handleRequestConfirmation`/`handleConfirmSave` currently have exactly two gates (`migrationStatus`, `unresolvedRecoveryEvidence`); neither checks Save-unknown. `hasUnresolvedConflicts` reads genuine server state (`periodicStockDraft.items`) and correctly blocks for Conflict specifically.

---

## 8. §18.B — the previously open question, now resolved

### A. Previous open question

The original assessment identified server-side finalization protection for `save-blocked` and `occupied-target-rejected` as the one item preventing a full "ready" verdict — specifically, whether a new aggregate-counter mechanism (generalizing `openConflictCount`'s own proven shape) was required, and if so, its exact design.

### B. Resolution

**No new aggregate counter is required or authorized at this time for either state.** This is not "a counter design was selected" — it is that direct tracing found no counter is currently needed.

### C. Save-blocked evidence

`save-blocked` derives from `subscriptionBlocksNewRecords`, a real, subscription-status-sourced condition, not a client-invented judgment. The existing `stockCounts` create rule already calls `subscriptionAllowsNewRecords(businessId)` as one of its existing conditions (`firestore.rules`, confirmed directly this investigation). A business whose subscription genuinely blocks new records cannot create `stockCounts` at all, through the same mechanism that would have caused Save-blocked on the row. **No new draft-level counter is necessary for this state.**

This does not establish that every possible client-side save failure is server-protected — only that this specific, subscription-based root cause of Save-blocked already is.

### D. Occupied-target-rejected evidence

Exhaustive search confirms `isOccupiedTargetRejection` is declared in the persistence-state model's own input shape and correctly handled by the derivation function, but is never set to `true` anywhere in the codebase. There is currently no producer, no actual lifecycle, and therefore nothing to design a counter against. Designing one now would be speculative. If this state is ever given a real trigger, that is a separate, future decision requiring its own design work at that time.

### E. Conflict remains separately, fully protected — unchanged

`openConflictCount` remains the sole authoritative server-side aggregate for Conflict. Its transactional increment (atomic with the item's own `state: 'CONFLICT'` write), its idempotency-guarded decrement (atomic with resolution, precondition-checked against a stale/duplicate attempt), its drift-correction self-heal (recomputing from real per-row ground truth, since a corrupted counter has no "more correct" cached value to recover to), its resurrection-race protections (every full-document meta writer reading the counter fresh, server-side, inside its own transaction rather than trusting a possibly-stale local mirror), and its Firestore Rules check (`get(...).data.get('openConflictCount', 0) == 0`, one `exists()` + one `get()`, within the confirmed 10-call budget for a single-document create) are all unaltered by this resolution.

### F. Future architectural constraint, recorded as a constraint, not a current requirement

If Occupied-target-rejected, or any future persistence-blocking state, later receives a real producer and requires server-side finalization protection, its aggregate mechanism must be designed from the start with: atomic same-transaction state-and-counter transition; an explicit idempotent-decrement precondition; a ground-truth self-healing mechanism, not retrofitted after a drift incident; an audit of every full-document meta writer for the resurrection-race pattern, specifically, not assumed safe by default; and authoritative server-side Rules evaluation, never trusting client-reported state. These are lessons `openConflictCount`'s own real bug-fix history already teaches — not new invention required at the time a future state needs them, but not to be skipped either.

---

## 9. Revised Rule 8 verdict

The prior "not ready" conclusion was conditioned specifically on the §18.B mechanism question above. **That question is now closed.** Phase 1 (input validation/progression), Phase 2 (live-total correctness), and Phase 4's client-side gate remain independently ready, as originally assessed — every mechanism traced, risks named, no unresolved decision blocking them. Phase 4's server-side gate, previously the one blocking item, is now resolved: Conflict's existing protection stands unchanged; Save-blocked needs no new mechanism; Occupied-target-rejected is correctly deferred, not implemented speculatively. Phase 3 (Save-unknown listener reconciliation) remains explicitly out of scope, per §48's own non-decision — **not authorized by this document.**

### READY FOR IMPLEMENTATION AUTHORIZATION

for Phases 1, 2, and 4, as scoped in the original assessment. This Rule 8 Assessment does not itself constitute an Implementation Authorization — that remains a separate, subsequent gate.
