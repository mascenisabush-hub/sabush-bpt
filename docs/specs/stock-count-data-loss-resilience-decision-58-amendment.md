# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 58 — Periodic Contagem Interruption Persistence and Recovery Parity

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 5 September 2026
**Resolves:** The Product Architect Decision Proposal *"Periodic
Contagem Interruption Persistence and Recovery Parity"* (technical
investigation and governance-stage proposal, this session; not
separately committed as its own artifact) — specifically the refined
governance question that investigation established: whether Periodic
Contagem's interruption-flush persistence path
(`flushPeriodicDraftNow`/`flushPeriodicStockDraftRows`) must be
required to provide the same bounded-retry, error-classification, and
manual-retry-eligibility guarantees the normal per-row save path
(`performRowSaveAttempt`/`savePeriodicStockDraftItem`) already
provides.
**Builds on:** [Decision 38 Amendment](./stock-count-data-loss-resilience-specification.md)
(interruption-durability requirement), [Decision 39 Amendment](./stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized — per-row autosave scheduling; SPA/unmount
treated as an interruption), [Decision 41 Amendment](./stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted and Authorized — Finding C: bounded retry/error
classification, for the per-row path), and [Decision 55 Amendment](./stock-count-data-loss-resilience-decision-55-amendment.md)
(✅ Accepted, Same-Row Concurrent Observation Conflict Semantics) — this
decision assumes and does not restate, reinterpret, weaken, or expand
any of their governance content.
**Does not reopen:** Decisions 38, 39, 40, 41, 44, 45, 46, 47, 48, 49,
50, 51, 52, 53, 54, 55, 56, or 57's own already-accepted content.
**Affected Area:** Periodic Contagem — active/in-progress draft
persistence (`stockCountDrafts/periodic`) only.
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

An operator-reported symptom (entered Contagem quantities not reliably
present after leaving and returning to the page) led to a read-only
technical investigation of the interruption-flush mechanism
(`flushPeriodicDraftNow` → `flushPeriodicStockDraftRows`), which fires
on `visibilitychange`, `pagehide`, and React unmount (Decision 38/39a/
39b). That investigation identified two claimed weaknesses. A
governance-stage review then independently re-verified both against
the full repository, **including `firestore.rules`**, before this
decision was drafted — this section and §2 record the corrected
findings that resulted.

---

# 2. Governance Question Resolved

**Should Periodic Contagem's interruption-flush persistence path be
required to provide the same bounded-retry, error-classification, and
manual-retry-eligibility guarantees that the normal per-row save path
already provides — so that a transient failure occurring during
navigation/interruption is recovered or, failing that, made visible and
actionable the next time the operator returns — rather than failing
once, silently, against a component that may already be gone?**

**Answered: YES.**

A second, narrower, previously unidentified question was surfaced by
the same verification and is resolved as part of the same decision:
**should a single row currently in `CONFLICT` be allowed to block the
interruption flush's atomic batch write for every other, unrelated
dirty row in the same Contagem session?** **Answered: NO** — this
"poison-batch" effect is an unwanted consequence of the current
mechanism, not a requirement to preserve.

---

# 3. Corrected Findings (Governance Record)

The originating investigation's two findings are recorded here exactly
as they were resolved at the governance-review stage, so this decision
is not later mistaken for endorsing the original, uncorrected framing:

1. **Finding 1 (failure recovery/visibility) — CONFIRMED, and is the
   substantive basis for this decision.** `flushPeriodicDraftNow`'s
   failure handling is a bare `.catch(() => setDraftSaveState('save-failed'))`
   — no `classifyDraftSaveError`, no bounded retry, no
   `manualRetryEligibleRowsRef` registration — and typically executes
   after the triggering component has unmounted, so the resulting state
   is set against nothing the operator can see. Confirmed not covered
   by Decision 41's own accepted scope (Finding C's retry/classification
   mechanism was accepted for the per-row path only).
2. **Finding 2 (claimed conflict-integrity bypass) — NOT ACCEPTED AS
   STATED; CORRECTED.** The original claim — that the interruption
   flush could silently write a `CONFLICT` row back to `ACCEPTED` — is
   **not accurate against the current governed state**.
   `firestore.rules`' `stockCountDrafts/periodic/items/{rowKey}`
   `update` grant accepts exactly three write shapes (ACCEPTED→ACCEPTED,
   ACCEPTED→CONFLICT, and CONFLICT→ACCEPTED only when the new quantity
   matches one of the two already-preserved observations and the
   resolver fields are correctly populated), enforced by Firestore on
   every write regardless of which client function issues it. The
   interruption flush's payload satisfies none of the three branches
   against a `CONFLICT` row, so **the write is rejected, not silently
   accepted** — confirmed both by direct rule inspection and by an
   existing, already-passing emulator test
   (`tests/periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts`)
   that proves an even more complete attempted write of this shape
   already fails. **Decision 55 is not, and was not, bypassed by the
   current code.**
3. **The real adjacent issue, in place of Finding 2 as originally
   stated:** because a Firestore `WriteBatch.commit()` is atomic against
   rules evaluation, a `CONFLICT` row present anywhere in the current
   flush's row set causes the **entire batch to fail**, blocking every
   other, unrelated dirty row's persistence attempt until that conflict
   is resolved. This is a durability/availability consequence, not an
   integrity violation, and it is addressed by this decision as part of
   the same accepted mechanism (§4), not as a separate conflict-safety
   fix.

---

# 4. Decision

**Periodic Contagem's interruption-triggered persistence is required to
invoke the existing, already-governed per-row save mechanism
(`performRowSaveAttempt`, and therefore `savePeriodicStockDraftItem`)
for each currently-dirty row, rather than issuing a separate
`WriteBatch` through `flushPeriodicStockDraftRows`.**

This establishes parity between normal per-row persistence and
interruption persistence for:

- bounded retry;
- error classification;
- failure recovery;
- manual-retry eligibility / actionable recovery;
- generation protection;
- the existing transaction/conflict protection (already correct per §3
  item 2 — this decision extends the *same* mechanism to the
  interruption path rather than introducing a new one).

**This decision also accepts the poison-batch consequence identified in
§3 item 3 as part of its rationale:** an unrelated `CONFLICT` row must
not prevent other, independently-dirty rows from receiving their own
interruption-persistence attempt. Routing interruption persistence
through per-row `performRowSaveAttempt` calls resolves this as a direct
consequence of the same mechanism, not as a separately engineered fix.

This corresponds to **Option A**, as evaluated against Option B (keep
the batch flush but duplicate retry/classification/conflict-handling
logic into it — rejected: would create two subtly different save
systems maintaining the same logic twice) and Option C (block
navigation until writes are acknowledged — rejected: does not address
real browser-level close/reload, and is unnecessary given the write is
already durably locally queued the instant it is issued, per Decision
38's existing persistent-local-cache basis).

---

# 5. Decision 55 Compatibility

**No interruption-persistence mechanism, current or under this
decision, bypasses Decision 55.** §3 item 2 establishes this for the
current code via `firestore.rules`' independent enforcement. Under this
decision's accepted mechanism, the same conclusion holds even more
directly, since interruption persistence now goes through the identical
transactional function (`savePeriodicStockDraftItem`) the per-row path
already uses, which additionally refuses to write over a `CONFLICT` row
at the application layer. **This decision does not reopen, reinterpret,
or modify Decision 55.** It relies on Decision 55's existing accepted
content unchanged, and — per §3 item 3 — additionally resolves the
poison-batch effect as a byproduct of the same mechanism.

---

# 6. Decisions 44–57 Compatibility

No decision in the range 44–57 is reopened, reinterpreted, or expanded
by this decision:

- **Decision 44** (shared live data, no-silent-loss) — unaffected;
  this decision serves the same principle for the interruption path.
- **Decisions 45–54** (authority, dual editor, live sync, reconnection,
  finalization, cache isolation, Viewer/Finalizer/delegate authorization) —
  unaffected; the accepted mechanism reuses `isActiveContagemEditor`-gated
  functions unchanged, with no change to authority, listener, or
  finalization behavior.
- **Decision 55** — addressed directly in §5; not reopened.
- **Decision 56** (finalized immutability) — unaffected; this decision
  concerns `stockCountDrafts/periodic` only, never `stockCounts`.
- **Decision 57** (finalized-history Clear-All protection) — addressed
  in §7; unaffected and not combined with this decision.

---

# 7. Relationship to Finding K and Decision 57

**Finding K** (cache/session isolation) is not reclassified by this
decision. This decision touches the same browser-lifecycle surface
(interruption-triggered writes) but does not affect listener-attachment
behavior or write-path business/identity targeting, both of which are
Finding K's actual subject matter and remain governed exactly as Finding
K already established. Related surface, separate concern.

**Decision 57** governs `stockCounts` — finalized Periodic Contagem
history — and its protection from Clear-All-Data. **This decision
governs `stockCountDrafts/periodic`** — active, not-yet-finalized
Contagem data. Different collections, different lifecycle stages,
different code paths. They are not combined by this decision, and this
decision requires no change to Decision 57 or its implementation.

---

# 8. Governance Consequences

Following this repository's established convention (every decision in
this chain — Decisions 38 through 57 — proceeds through Specification
Amendment → Rule 8 Assessment → Implementation Plan → Implementation
Authorization as separate, sequential, signed gates):

- **A NEW Rule 8 Assessment is required.** No existing Rule 8 Assessment
  addresses retry/classification/failure-recovery requirements for the
  interruption-flush path — the existing Decision 44 and Decision 41
  Rule 8 Assessments discuss `flushPeriodicStockDraftRows` only in the
  context of authority bypass and cross-tenant business-switch
  contamination, both unrelated to and unaffected by this decision.
  **Existing Rule 8 assessments must not be silently stretched to cover
  this decision.**
- **An Implementation Plan must be created or formally amended** through
  the appropriate governance step (new plan, or a formal amendment to
  the Decision 41 Implementation Plan — the Product Architect's call at
  that gate, not decided here) — no existing plan anticipated this
  mechanism.
- **A NEW Implementation Authorization will be required** after Rule 8
  and the Implementation Plan are each separately completed and signed.
  No existing Authorization (Decision 39's, Decision 41's, or the
  44–56 series') covers this mechanism, and none is stretched to do so
  by this decision.
- **This decision does not itself authorize implementation.**
  Implementation remains **NOT AUTHORIZED** until Rule 8, the
  Implementation Plan, and a new Implementation Authorization are each
  separately completed and signed, exactly as every prior decision in
  this chain has required of itself.

---

# 9. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 5 September 2026
**ACCEPTED OPTION:** Option A — consolidate interruption persistence
onto the existing per-row save mechanism.
**RULE 8:** Not yet assessed for this decision. A NEW Rule 8 Assessment
is required (§8) — no existing Rule 8 material may be treated as
already covering it. No `firestore.rules`, schema, UI, or code change
has been made by this decision.
**IMPLEMENTATION PLAN:** Not yet created or amended for this decision.
**IMPLEMENTATION AUTHORIZATION:** None exists for this decision. A NEW
Implementation Authorization will be required after Rule 8 and the
Implementation Plan are each completed.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-05

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance decision
only, exactly as Decisions 38 through 57 were each accepted. This
acceptance does not authorize implementation, `firestore.rules` changes,
schema changes, UI changes, code changes, tests, an Implementation Plan
amendment, or an Implementation Authorization. It does not deprecate,
delete, or otherwise modify `flushPeriodicStockDraftRows` — that remains
a subsequent implementation-stage question, not decided here. It does
not change Decision 55, Decision 57, or Finding K. All previously
accepted decisions (38 through 57) remain substantively unchanged. The
governing chain from this point is: Decision 58 Acceptance (this
record) → NEW Rule 8 Assessment → Implementation Plan → NEW
Implementation Authorization → Implementation → Verification. No gate
may be skipped.
