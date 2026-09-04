Implementation Authorization Proposal — DRAFT

# Implementation Authorization — Decision 57 (Clear-All-Data / Finalized Periodic Contagem History Deletion Protection)

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation would be
authorized to begin, strictly within the scope defined below, **once
signed**. Does not itself perform implementation and does not modify
code, `firestore.rules`, schema, UI, or tests.

## 1. Authorization Status

**DRAFT — AWAITING PRODUCT ARCHITECT ACCEPTANCE.**

This is not yet an authorization. No code change is permitted on the
basis of this document until §8's signature block is completed by the
Product Architect. Prior to that signature, no code, `firestore.rules`,
schema, UI, or test file has been created, modified, or committed to
produce this document.

**Repository state at drafting:** `main = origin/main = e84d6c2`,
working tree clean, confirmed immediately before this document was
drafted. Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `package.json`, `tests/`,
Decisions 44–57, the Rule 8 Assessment, or either Implementation Plan
to produce this document.

**No duplicate:** no existing Implementation Authorization for this
exact scope (the `stockCounts` `delete` narrowing and the corresponding
`clearAllData()` change) was found in `docs/engineering/` prior to this
document. `67d60a7` covers a different, already-signed scope (Decisions
44–56's shared-live-data/authority/conflict/finalization/cache-
isolation mechanisms) and explicitly, by its own §3/§4, excludes the
`delete` narrowing this document proposes — this document does not
duplicate, amend, or supersede it.

## 2. Governance Basis

[Decision 57](../specs/stock-count-data-loss-resilience-decision-57-amendment.md)
(✅ Accepted, commit `ecab8fe`, SABUSHIMIKE MASCENI, 4 September 2026)
→ [Rule 8 Reassessment §IV.O-n](./periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(technical mechanism proposed and assessed as ready for a future
Implementation Plan amendment and Implementation Authorization; Finding
G's `delete`-half explicitly **not** reclassified to PASS/RESOLVED) →
[Implementation Plan Section 14](./periodic-contagem-shared-live-data-decisions-44-56-implementation-plan.md)
(commit `e84d6c2`, narrow amendment scoping exactly the two application
changes below) → **THIS Implementation Authorization** → *(next, once
signed: implementation — not performed by this document)*.

**Governing chain for the underlying product requirement:** [Decision
56](../specs/stock-count-data-loss-resilience-decision-56-amendment.md)
§7 (left the shape of any future intentional-removal capability
undecided) → Decision 57 (adopted Option B — Clear-All-Data must not
delete finalized Periodic Contagem history) → this Authorization
(implements exactly that requirement, nothing more).

**Precedent note:** this document's structure follows
[`periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md`](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
(the same Contagem domain, most directly comparable precedent),
adapted to this scope's own, much narrower governing chain — not
copied verbatim, and not a modification of that document, which
remains exactly as signed for its own, different scope.

## 3. Authorized Implementation

Implementation is authorized **only** for the two application changes
Implementation Plan Section 14 already specifies. Nothing below is
newly introduced by this document.

**1. Firestore deletion protection (`firestore.rules`).** In the
`stockCounts/{stockCountId}` match block, narrow the `allow delete`
condition from its current form —
`if isOwnerOf(businessId) && resource.data.get('type', null) != 'initial'`
— to unconditional `if false`. This is the identical treatment the
`allow update` rule in the same block already has. The resulting rule
denies ordinary deletion of every `stockCounts` document, `initial`
and non-`initial` alike — since (per Rule 8 §IV.O-n §D, freshly
verified against `apps/tenant/src/types.ts`'s current
`StockCountType = 'initial' | 'weekly' | 'monthly' | 'quarterly' |
'yearly' | 'custom'`) every non-`initial` value names a finalized
Periodic Contagem result and none names an unrelated record category.
**No new authority model, role, or deletion pathway is introduced —
this change only removes a permission.**

**2. Clear-All-Data separation (`apps/tenant/src/context/AppContext.tsx`).**
Remove the `stockCounts` deletion loop from `clearAllData()` in its
entirety — the loop currently reading `for (const s of stockCounts) {
if (s.type === 'initial') continue; await deleteDoc(...); }`. Once no
`stockCounts` document of any type is deletable, this loop is
unreachable and must be removed, not merely re-guarded, matching how
the Closings-deletion loop was previously removed in full for the
identical prior tension (Closing Integrity Amendment). **Every other
category `clearAllData()` deletes — `products`, `batches`,
`purchaseBatches`, `quebras`, `expenses`, the
`stockCountDrafts/initial` working draft, `withdrawals`,
`timelineEvents` — is explicitly unchanged.**

## 4. Tests / Verification

Before implementation of §3 may be declared complete, the following
must all pass. Test commands below are the repository's actual
existing `package.json` scripts — none is invented.

**Targeted rules verification:**
- `npm run test:periodic-contagem-44-56-rules:emulator` (or, if
  unavailable in the executing environment, `npm run
  test:periodic-contagem-44-56-rules` against a reachable Firestore
  emulator) — the existing `stockCounts update/delete — Decision 56
  immutability (update-only narrowing)` describe block's `delete`
  assertion, currently `assertSucceeds`, must be updated to
  `assertFails` and pass, confirming: Owner cannot delete finalized
  Periodic Contagem; ordinary client deletion of a finalized result
  fails; no authorization expansion occurs elsewhere in the same
  emulator run (the existing 26-test suite's other 25 assertions must
  continue to pass unchanged).
- Source-text regression, in
  `tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts`:
  the two tests currently asserting the pre-narrowing rule text and
  its own "Decision 56 §7 not decided here" framing must be updated to
  assert the new unconditional-`false` shape.

**Targeted Clear-All-Data verification (new, source-text or
integration-level, per the repository's existing convention for
`clearAllData()`-adjacent behavior):**
- `clearAllData()`'s own source contains no `stockCounts` deletion call
  site.
- Finalized Periodic Contagem history is confirmed to remain after
  `clearAllData()` runs (a regression assertion, not merely the
  absence of a call site).
- Every other `clearAllData()` category named in §3 item 2 continues to
  behave exactly as governed today — an explicit regression check, not
  an assumption.

**Regression protection (existing behavior, must remain unchanged and
re-verified, not merely assumed):**
- `initial` Stock Count's existing `update`/`delete` protection
  (`if false`, unconditional).
- Closings/ClosedPeriods' existing `delete: if false` protection.
- Tenant isolation: a user from a different business still cannot
  read, create, update, or delete this business's `stockCounts`
  documents.

**General verification, every time:**
- `npx tsc --noEmit -p apps/tenant` — clean.
- `npm run test:all` — 0 failures, every suite.

**Explicitly not required by this Authorization, and not to be
silently folded in:** repairing the two pre-existing, already-broken
test assertions identified in Rule 8 §IV.O-n §H
(`tests/firestore-rules.test.ts`'s stale `assertSucceeds(updateDoc(...))`
predating this work back to commit `d3b8d9b`; `tests/superadmin-assisted-initial-stock-recovery.test.ts`'s
stale combined-rule-line regression guard). Both pin text this
implementation will also touch, but neither is a Decision 57
regression, and this Authorization does not require, forbid, or decide
whether an implementer separately repairs them — that is left to
whoever implements, exercising ordinary engineering judgment, and
should not be reported as evidence of a Decision 57 defect either way.

## 5. Safety / Invariants

Implementation of §3 must preserve, unmodified:

- Finalized Periodic Contagem history — the entire purpose of this
  Authorization is to protect it further, never to touch its content.
- Initial Stock's existing protection.
- Closing/ClosedPeriod's existing protection.
- Tenant isolation (`isOwnerOf(businessId)` and equivalent checks) on
  `stockCounts` and every other collection.
- Existing authority boundaries (Decisions 45, 46, 48, 49, 53, 54) —
  unaffected; this change only removes a delete permission, granting
  nothing to anyone.
- Existing synchronization/concurrency behavior (Decisions 44, 47, 55)
  and Finding K's cache-isolation mechanism (Decision 51) — no
  `onSnapshot` listener, transaction, or logout path is touched.
- Every unrelated `clearAllData()` category (§3 item 2's list) —
  unchanged.

## 6. Explicit Exclusions

This Authorization does **not** authorize:

- **Any future intentional historical-removal capability** — no
  historical-deletion UI, SuperAdmin deletion workflow, special API,
  data-management screen, legal/compliance-purge modification, or any
  alternate deletion mechanism. Decision 57 §4/§7 leaves that
  capability's shape, authority, workflow, and technical mechanism to
  a future, separate Product Architect decision; this document does
  not design, imply, or move toward one.
- Any change to shared live synchronization, authority/delegation,
  dual active editors, conflict semantics, exactly-once finalization,
  Viewer authorization, finalizer authorization, Finding K's isolation
  mechanism, or finalized Contagem `update` immutability — all remain
  exactly as Implementation Authorization `67d60a7` already implements
  and governs.
- **Any amendment to Implementation Authorization `67d60a7`** — that
  document remains exactly as signed, for exactly its own scope; this
  is a new, distinct, separate authorization.
- Any redesign, cleanup, or unrelated behavior change to Clear-All-Data
  beyond removing the one `stockCounts` loop named in §3 item 2 — the
  still-open "should the reset button's own copy/promise be updated"
  question (flagged, unresolved, since the analogous Closings case) is
  **not** addressed, decided, or authorized here.
- Repairing the two pre-existing stale tests named in §4, as anything
  other than an optional, separately-judged engineering choice — this
  Authorization neither requires nor forbids it.
- Any new Product Architect decision, and any reinterpretation,
  reopening, narrowing, or expansion of Decisions 44 through 57's own
  already-accepted content.
- Any feature, mechanism, or behavior not present in Decision 57, the
  Rule 8 Reassessment (§IV.O-n), and Implementation Plan Section 14.

## 7. Completion Criteria

Implementation of this Authorization's scope is complete **only when
all of the following are simultaneously true** — no partial subset
constitutes completion:

1. `firestore.rules`'s `stockCounts/{stockCountId}` `allow delete` is
   unconditionally `false`, and no other rule in the file changed.
2. `clearAllData()` no longer references `stockCounts` for deletion,
   and every other category it deletes is unchanged.
3. Every test named in §4 exists, is updated where §4 specifies, and
   passes — including a full, fresh `npm run test:all` run and a clean
   `npx tsc --noEmit -p apps/tenant`.
4. The regression checks in §4/§5 (Initial Stock, Closings, tenant
   isolation, every unrelated `clearAllData()` category) are
   specifically, freshly re-verified, not assumed from a prior session.
5. No file outside `firestore.rules`,
   `apps/tenant/src/context/AppContext.tsx`, and the specific test
   files named in §4 was modified.
6. Nothing above is asserted as already true by this document — these
   are the conditions a future implementation session must satisfy and
   report against; none is satisfied as of this draft's own writing.

**This document does not claim any of the above is already
implemented, verified, or complete.**

## 8. Acceptance

**No implementation may begin until the Product Architect accepts and
signs this authorization.**

> I accept this Implementation Authorization and authorize
> implementation within the exact scope defined above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** *[to be recorded upon acceptance]*
