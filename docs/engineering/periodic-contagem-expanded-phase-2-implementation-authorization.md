Implementation Authorization

# PERIODIC CONTAGEM — EXPANDED PHASE 2
## IMPLEMENTATION AUTHORIZATION

**Status:** ✅ **ACCEPTED AND AUTHORIZED.** Signed by the Product Architect,
delivered directly in conversation. Supersedes the original, narrower
Phase 2 Implementation Plan Amendment and its associated (unsigned)
draft authorization — that document does not cover any part of this
expanded scope.

**Prepared by:** Claude (Lead Software Engineer role, this repository),
recording a decision delivered directly in conversation, against
repository state `main` @ `43ed8864019c1603ccd739e92ca24235d2fb7fa5`
(matching `origin/main` exactly at the time of authorization).

**Governing chain:** PA Decision (Alternative C) → Rule 8 Assessment
(approved) → Expanded Rule 8 Assessment (completed, prepared for PA
review) → Expanded Implementation Plan Amendment → Final Architecture
Closure (no remaining Product Architect decisions identified) → **this
document**.

---

## 1. Authorized scope

1. Stable manual-row identity (deterministic keys for migrated legacy
   rows, `crypto.randomUUID()` for genuinely new rows).
2. Durable `orderIndex` (integer, independent of identity).
3. Transactional `nextOrderIndex` allocation.
4. Resumable, per-row-transactional, fail-closed legacy migration.
5. Tombstones (draft-lifecycle-scoped cleanup only, no time-based
   expiry).
6. D1 field-level write semantics for `savePeriodicStockDraftItem`.
7. `productId` retention and lifecycle for manual portions.
8. One-product-one-displayed-row grouping (`productId`-first, name
   fallback only for unresolved rows).
9. Per-row and group persistence-state UI (Saved / Saving /
   Occupied-target-rejected / Save-unknown / Conflict / Save-blocked).
10. Synchronous edit-time local recovery, per row.
11. Four-case recovery reconciliation.
12. Associated tests for all of the above.

## 2. Non-negotiables — binding on implementation

- No whole-product delete action.
- No new same-unit/same-price duplicate-prevention rule.
- No change to Decision 55's same-row conflict semantics.
- No automatic re-matching of a renamed row within the same rename
  operation — `productId` clears synchronously; any new assignment
  only occurs afterward, through the existing/new resolution mechanism
  being freshly re-evaluated.
- Explicit identity always outranks text matching — an
  already-established `productId` is never silently replaced merely
  because current text matches a different product's name.
- No visual grouping may alter `tallyStockCountRows` or cause
  double-counting.
- No automatic recovery action may silently choose between conflicting
  local and server states.
- No change to `InitialStockCountView.tsx`, catalog-row identity
  fundamentals (`catalog:{productId}` unchanged), or the Business
  Worth Engine.
- Any rollback involving an active local recovery snapshot must
  preserve or explicitly invalidate those snapshots under a controlled
  procedure — never silently discard recoverable editor work, and
  never interpret a snapshot under a schema the rolled-back code no
  longer understands.

## 3. Acceptance criteria

1–6. Full identity/ordering/migration/tombstone/D1/`productId`/grouping/
persistence-state/recovery behavior per the Expanded Implementation
Plan Amendment and Final Architecture Closure, verified against the
complete test matrix specified there.

7. **Authorization vs. completion, explicit:** this authorization
   permits implementation to begin once signed. Emulator-dependent
   items (concurrent `nextOrderIndex` allocation, the migration/
   deletion race, real `firestore.rules` enforcement) are
   **completion/acceptance gates for Phase 2, not prerequisites for
   this signature.** They must be executed and pass before Phase 2 is
   considered complete and eligible for deployment. Sequence: Sign →
   Implement → Test → Emulator verification → Acceptance → Commit →
   separate push authorization → deployment confirmation.

## 4. What is not authorized

Whole-product deletion as a feature; any new duplicate-prevention
rule; any change to Decision 55; any redesign of Initial Stock Count,
catalog identity, or Business Worth calculations; any schema or
architecture change beyond §1.

## 5. Rollback boundary

Phase 1 (separately authorized, narrow, defensive-only) remains safe
to roll back at any point. This expanded Phase 2 carries the same
migration-related rollback limitation previously established — not
safe once any draft has migrated, mitigated only by Phase 1's
defensive tolerance being live first. The recovery mechanism is
purely additive/local and introduces no new rollback risk of its own,
subject to §2's snapshot-preservation requirement.

## 6. Product Architect signature

**Status: ✅ ACCEPTED AND AUTHORIZED.** Signed, delivered directly in
conversation, recorded here per this repository's established
convention for recording a decision the Product Architect delivered
directly (precedent: every prior PA-series acceptance/amendment this
engagement, and the repository's own pre-existing
`product-identity-alternative-name-relationship-correction-implementation-authorization.md`).

---

## Governance notes

This authorization supersedes the original, narrower Phase 2
authorization entirely. Implementation now proceeds under the staged
sequence specified in the Expanded Implementation Plan Amendment.
