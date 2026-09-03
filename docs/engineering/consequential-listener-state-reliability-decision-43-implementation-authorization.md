Implementation Authorization

# Implementation Authorization — Consequential Listener State Reliability (Decision 43)

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation is authorized to
begin, per this signature. Does not itself modify code.

**Status:** ✅ **AUTHORIZED — SIGNED BY THE PRODUCT ARCHITECT.** See
§16 below. Implementation may begin only after this document exists
in this signed state; it did not exist in any state before this
session.

**Governing chain:** [`consequential-listener-state-reliability-decision-43.md`](../specs/consequential-listener-state-reliability-decision-43.md)
(✅ Accepted, governance decision stage — SABUSHIMIKE MASCENI, 3
September 2026, commit `130a5db`) → [Rule 8 Assessment](./consequential-listener-state-reliability-decision-43-rule8-assessment.md)
(✅ READY, both decision points resolved — SABUSHIMIKE MASCENI, 3
September 2026, commit `6047a7f`) → [Implementation Plan](./consequential-listener-state-reliability-decision-43-implementation-plan.md)
(✅ ACCEPTED BY THE PRODUCT ARCHITECT, §27 — SABUSHIMIKE MASCENI, 3
September 2026, commit `5575e46`) → **THIS Implementation
Authorization** → *(next: implementation, once this document exists in
this signed state — not itself performed by this document)*.

**Precedent note:** this document's structure follows the most
directly comparable precedent in this repository,
[`periodic-contagem-data-protection-hardening-decision-41-implementation-authorization.md`](./periodic-contagem-data-protection-hardening-decision-41-implementation-authorization.md)
(the Decision 41A–41E authorization, the immediately preceding
governance chain in this same investigative thread) — adapted to
Decision 43's own scope and governing chain, not copied verbatim.

**Repository state at drafting:** `main = origin/main = 5575e46`.
**Nothing has been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or `tests/` to produce this
document.**

**This document does not:** modify Decision 43, the Rule 8 Assessment,
the Implementation Plan, `firestore.rules`, `firestore.indexes.json`,
`package.json`, or any application or test code. It does not itself
perform any implementation — §16's signature is what authorizes a
*subsequent, separate* implementation step to begin, per this
project's standing discipline.

**No duplicate:** no existing Implementation Authorization for
Decision 43 was found in `docs/engineering/` prior to this document.

---

## 1. Governance Completeness — What This Record Confirms

| Stage | Document | Status |
|---|---|---|
| Decision 43 | `consequential-listener-state-reliability-decision-43.md` | ✅ Accepted — governance decision stage |
| Rule 8 Assessment | `consequential-listener-state-reliability-decision-43-rule8-assessment.md` | ✅ READY, both decision points resolved |
| Implementation Plan | `consequential-listener-state-reliability-decision-43-implementation-plan.md` | ✅ Accepted by the Product Architect (§27) |
| **Implementation Authorization** | **this document** | **✅ Authorized (§16)** |
| Implementation | — | Not yet begun |
| Verification | — | Not yet begun |

Decisions 41A–41E are not reopened or redesigned by this
authorization — they remain implemented, frozen, and unmodified, per
the accepted Rule 8 Assessment's own §11 (41A–41E compatibility) and
the Implementation Plan's own §19.

---

## 2. What This Authorization Covers

Implementation of exactly the accepted Implementation Plan's design
for the 10 consequential operations it specifies:

- **`addStockBatch`** (§4 of the Plan) — product create-vs-reuse via a
  document-keyed authoritative read; batch-supersession candidates via
  a bounded, product-scoped query; both folded into the function's own
  existing `runTransaction`.
- **`deleteProduct`** (§5) — batch/quebra cascade-delete scope via two
  bounded, `productId`-filtered fresh reads before the existing
  delete-chunk loop.
- **`recordClosing`** (§6) — financial totals and expense/withdrawal
  locking via date-range-bounded fresh reads mirroring the function's
  own existing `isDateInRange` pattern; the duplicate-period guard via
  a document-keyed existence check; an atomic mechanism (transaction
  extension or a new lock-document, per the Plan's own explicitly
  flagged open design question) protecting the read-write relationship
  for the permanent Closing record.
- **`reopenClosing`** (§7) — Closing target via a document-keyed fresh
  read; expense/withdrawal unlock scope via a bounded, filtered fresh
  read.
- **`recordStockCount` finalization** (§8) — `businessWorthSnapshots`
  supersession via a narrowly-filtered fresh read; `voidRecords`-derived
  state via a document-keyed existence check against the specific
  predecessor confirmation, without altering the existing Void & Redo
  eligibility computation or authorization semantics themselves.
- **`recordOwnerDeclaredBusinessWorth`** (§9) — calculation inputs
  protected via the function's own existing `runTransaction`, widened
  per the Plan's own explicitly flagged open design question regarding
  the non-date-bounded inputs.
- **Initial Stock authorized-recovery eligibility** (§10) — a
  document-keyed fresh read against the fixed-id
  `initialStockRecoveryAuthorization/current` document immediately
  before `voidInitialStockConfirmation`'s path-selection decision.
- **Shared-device PIN-pad staff-state cache** (§11) — a single,
  minimal "has this listener delivered at least one successful
  snapshot" flag for the `staffMembers` listener specifically,
  consulted by the existing auto-refresh effect before overwriting the
  cached, known-good `pairedDevice.staff` list.
- **Subscription payment-status gate** (§12) — a bounded, sorted,
  limited fresh query in place of the ambient `payments[0]`.
- **`businessWorthRecoveryAuthorization`** (§13) — the same
  document-keyed mechanism as Initial Stock recovery eligibility,
  subject to the Plan's own flagged requirement to re-confirm the
  exact consuming function at implementation time before applying the
  pattern.

**Approved file surface**, exactly as the Implementation Plan's §14
specifies and no wider:

- `apps/tenant/src/context/AppContext.tsx`
- `apps/tenant/src/components/SubscriptionContactModal.tsx`

**No other file is authorized for modification by this document.** In
particular, `firestore.rules` and `firestore.indexes.json` are **not**
authorized for modification — the Plan's own §14/§16/§18 identifies
both as possible, not confirmed, dependencies for `recordClosing`
(§6) and certain query shapes (§4, §12); per Stop Condition §15 below,
discovering either to be genuinely required requires stopping and
escalating as a separate governance matter, not silent inclusion here.

**Approved implementation order**, per the accepted Plan's §22,
preserved exactly: Phase 1 (§10, §13, §12, §11) → Phase 2 (§5, §7) →
Phase 3 (§4) → Phase 4 (§6, §9, and §8's own related atomicity
question).

---

## 3. What This Authorization Does Not Cover

- **41F (browser teardown verification)** — remains an open,
  non-blocking recorded concern. Not implemented, not expanded, not
  reinterpreted by this authorization.
- **41G (same-row concurrent editing)** — remains a documented,
  non-blocking future concern. No collaborative-editing, conflict-
  resolution, versioning, or multi-device-synchronization architecture
  is authorized.
- **The Initial Stock Void & Redo authorization itself** — this
  authorization permits protecting the *listener reliability* of the
  `voidRecords`/`initialStockRecoveryAuthorization` state that feeds
  Void & Redo's own eligibility checks (§2 above); it does not permit
  any change to the authorization's own conditions, its
  `firestore.rules` enforcement, or its governed 12-hour-window/
  chain-position semantics.
- Any change to `firestore.rules` or `firestore.indexes.json` **not**
  first escalated and separately authorized per Stop Conditions §15,
  items 2–3.
- Any redesign of the Business Worth Engine's or Closing's own
  calculation formulas, Dashboard, finalized `StockCount` records,
  timeline/audit structures, subscription policy or pricing, or the
  product catalog — this authorization covers the reliability of
  listener-derived *inputs* to these systems only.
- A generalized offline-first architecture, a new background job, a
  scheduled recomputation or sweep, or any new generalized
  persistent-storage layer.
- Extension of Decision 41D's four-state listener model to any
  listener beyond what §11's own narrow, single-flag mechanism already
  is (explicitly not a reintroduction of that model, per the
  Implementation Plan's own §27 acceptance note).
- Option C (fresh-read boundary) treated as a universal rule for every
  listener in the application — this authorization covers only the 10
  operations named in §2, exactly as Decision 43's own accepted
  boundary requires.
- Any file outside §2's approved file surface.

---

## 4. Decision 43 → Implementation Traceability

Every acceptance criterion this authorization covers is already
mapped, operation-by-operation and invariant-by-invariant, in the
accepted Implementation Plan's §4–§15, and re-confirmed against the
Rule 8 Assessment's own findings in the Plan's own citations
throughout. This authorization does not restate that mapping in full;
it incorporates it by reference and treats the accepted Plan as the
binding engineering specification for what "correct implementation"
means for each of the 10 operations in §2.

---

## 5. Implementation Checkpoints

Per the accepted Plan's §22, preserved exactly as the binding
sequence:

1. **Phase 1 — low-ambiguity operations:** Initial Stock recovery
   eligibility (§10), Business Worth recovery eligibility (§13,
   subject to its own consuming-function confirmation), subscription
   payment gate (§12), shared-device PIN-pad guard (§11).
2. **Phase 2 — bounded-query operations:** `deleteProduct` (§5),
   `reopenClosing` (§7).
3. **Phase 3 — transaction-extension operation:** `addStockBatch`
   (§4).
4. **Phase 4 — the operations carrying an open design question:**
   `recordClosing` (§6) and `recordOwnerDeclaredBusinessWorth` (§9),
   plus `recordStockCount`'s (§8) own related atomicity question — none
   of these three may proceed to a final implementation design until
   the specific open question the Plan itself flags for each has been
   resolved through implementation-time technical investigation, per
   §15's Stop Conditions below.

No phase may be skipped or reordered without returning to governance.

---

## 6. Required Acceptance Criteria

Restated from the accepted Plan's §15, binding on the implementation:

- A failed listener cannot cause any of the 10 operations in §2 to
  interpret a material dataset as safely empty/absent.
- Financial calculations (`recordClosing`, `recordOwnerDeclaredBusinessWorth`)
  do not silently use incomplete listener-derived state.
- Permanent historical records (the `Closing` document, the
  `businessWorthSnapshots`/`stockCounts` documents) are not created
  from unconfirmed material state.
- Integrity-sensitive create/reuse/cascade/supersession decisions
  (`addStockBatch`, `deleteProduct`, `recordStockCount`'s
  `businessWorthSnapshots` supersession) use authoritative state.
- Authorization/recovery decisions (§10, §13) do not fail merely
  because a listener failed.
- Business-period locking and reopening (`recordClosing`,
  `reopenClosing`) operate from authoritative state.
- Existing 41A–41E behavior is preserved, verified via full regression
  (§7 below).
- No global listener-hardening redesign is introduced.
- No cross-tenant read is introduced.
- No background job or scheduled sweep is introduced.
- No unrelated product redesign is introduced.

---

## 7. Required Verification / Testing Obligations

Mandatory, per the accepted Plan's §20/§21, not optional:

- `npm run lint`
- `npm run test:all` (full existing suite must remain green — this is
  a regression gate on Decisions 38–41E's own existing behavior, not
  only new coverage)
- `npm run test:rules:emulator`, if and only if a `firestore.rules`
  change is separately escalated and authorized per §15 — otherwise
  not applicable, since no rules change is authorized by this document
- Focused tests for every category the Plan's §20 enumerates:
  listener-failure-plus-consequential-operation, authoritative-read
  success, authoritative-read failure, genuinely-empty-authoritative-
  dataset, stale-listener-state-ignored (a regression guard against
  reintroducing the ambient-array pattern), transaction/atomicity
  behavior for the operations that need it, financial aggregate
  correctness, Closing permanent-record correctness, reopen
  correctness, product-deletion completeness, stock-count finalization
  correctness, recovery-authorization correctness, staff/PIN-pad state
  preservation, payment-gate correctness, and tenant isolation
- Full regression coverage for the existing 41A/41B/41C/41D/41E test
  suites — every one of these must continue passing unmodified

**Explicit instruction, binding on whoever performs verification:** if
the Firestore emulator's binary remains undownloadable in the
implementation environment because of the previously documented
`storage.googleapis.com` network-allowlist restriction, that must be
**reported honestly as an unverified/blocked check**, never
represented as a passing result — consistent with this governance
chain's own established discipline (Decision 41's own Implementation
Authorization, §8).

---

## 8. Compatibility Obligations for 41A–41E

Restated as binding, per the Rule 8 Assessment's own §11 and the
Implementation Plan's own §19:

- **41A** (business-switch flush): the implementation must not touch
  `registerPendingContagemFlush`/`flushForSwitchIfNeeded` or any
  Periodic/Initial draft-flush mechanism.
- **41B** (Initial Stock unmount flush): must not be touched.
- **41C** (bounded draft-save retry/classification): the
  `draftSaveFailureClassification.ts` module and its consumers must
  not be modified; none of the 10 operations in §2 write to
  `stockCountDrafts`.
- **41D** (four-state draft listener model): must not be extended to
  any operation in this authorization's scope; §11's own new flag is
  explicitly a narrower, single-purpose mechanism, not a reintroduction
  of this model.
- **41E** (subscription-blocked read-only recovery): `ReadOnlyDraftRecovery.tsx`
  and its guards must not be touched; none of the 10 operations in §2
  are gated by `subscriptionBlocksNewRecords` in the current codebase,
  and this authorization does not add such gating.

---

## 9. Tenant-Isolation Obligations

Every read authorized by this document must remain scoped to the
existing `businesses/{businessId}/...` path convention (or, for
`payments`, the existing per-user/business scoping already established
by that collection's current listener). No cross-business query is
authorized. No `firestore.rules` change is authorized (§2, §15). The
client does not become a security authority in any operation covered
by this document — every fresh read authorized remains subject to the
exact same `allow read` rule its existing listener already operates
under; every write remains subject to its existing, unmodified
`firestore.rules` create/update/delete conditions.

---

## 10. Performance / Read-Cost Obligations

Per the accepted Plan's §16 (the Product Architect's own Rule 8
resolution, carried forward as binding):

- The implementation must evaluate actual data-volume and read-cost
  implications before finalizing the mechanism for `recordClosing`
  (§6) and `recordOwnerDeclaredBusinessWorth` (§9).
- A full, unbounded fresh-collection read is never authorized as an
  automatic default for either operation — the narrowest bounded/
  scoped authoritative read that completely satisfies the operation's
  correctness requirement must be used.
- If a bounded approach cannot be shown to guarantee correctness for a
  given input, that fact must be documented and the appropriate
  stronger atomic mechanism used instead — correctness may never be
  traded for a cheaper read.
- For every other operation in §2, the Plan's own cost assessment
  (negligible, single-document or narrowly-filtered reads, comparable
  to `recordReceivablePayment`/`recordPayablePayment`'s already-proven
  pattern) is adopted as the binding performance expectation.

---

## 11. Failure-Handling Obligations

Per the accepted Plan's §17, binding on the implementation: no
operation in §2 may silently proceed as though a failed authoritative
read confirmed an empty/absent/safe-to-proceed dataset. Where the
Plan's own §17 table left an operation's exact user-facing failure
treatment open (several operations, per that table), the
implementation may determine the specific UI/error-surfacing behavior,
but the underlying reliability requirement — never silently treat an
unconfirmed read as confirmed — is not optional for any of the 10
operations.

---

## 12. Explicitly Preserved Invariants

Restated, verbatim in substance, from the accepted Plan's §15 and this
authorization's own governance constraints, as binding on the
implementation:

- A product/batch/quebra/Closing/BusinessWorthSnapshot/recovery grant
  that genuinely exists is never treated as absent merely because its
  listener has not yet delivered, or has errored on, a snapshot.
- The already-accepted batch-supersession residual risk (legacy data
  only) is not reopened or expanded.
- The existing Void & Redo authorization's own conditions and
  `firestore.rules` enforcement are not altered.
- `firestore.rules` remains the sole actual security boundary for
  every one of the 10 operations; every client-side read introduced is
  either an authoritative-correctness mechanism (per Decision 43's own
  boundary) or defense-in-depth, never a substitute for server-side
  enforcement.
- No incidental Firestore write is introduced by any read-only
  authoritative-read mechanism in §2.

---

## 13. Rollback / Reversibility

Per the accepted Plan's §24, restated as a binding expectation of the
implementation: every change authorized above is additive at the read
layer (new fresh-read/transaction-widening logic, and — for §11 only —
one new minimal listener-confirmation flag), not a rewrite of any
existing write, document schema, or `firestore.rules` condition; no
Firestore document shape change is entailed, so no migration is
entailed by rollback in either direction; each of the 10 operations'
changes is independently revertible per the Plan's own §14 file-impact
table.

---

## 14. Risk Acknowledgment

Restated from the accepted Plan's §23, carried forward as authorized
risks with their already-specified mitigations, not reopened here:

- §6/§9's open atomicity-shape question, if resolved incorrectly,
  could introduce a new race — mitigated by the explicit requirement
  (§15 below, Stop Condition) that this question be resolved through
  investigation before either operation's final design is written, not
  guessed at during implementation.
- A proposed query shape may require a new Firestore index not
  anticipated by the Plan — mitigated by Stop Condition §15, item 3:
  any newly-required index must be escalated, not silently added.
- §11's minimal new listener-confirmation flag could be misread as
  license for a broader listener-state redesign — mitigated by this
  document's own explicit scope limitation (§3) and the Plan's own
  §27 acceptance note confining it to `staffMembers` specifically.
- Performance of §6/§9's non-date-bounded inputs at real data volume
  is unmeasured — mitigated by §10's own binding requirement that this
  be evaluated before the mechanism is finalized, with a designed-in
  escape to a stronger mechanism if a bounded approach cannot be shown
  sufficient.

---

## 15. Stop / Escalation Conditions

The implementation must stop and return to governance — this
authorization does not cover proceeding past any of the following
without a separate governance decision:

1. A requirement for a broader architecture change beyond the 10
   operations named in §2.
2. A required `firestore.rules` change not already authorized by this
   document (none is authorized here).
3. A required Firestore index change not already authorized by this
   document (none is authorized here).
4. A need for cross-business querying of any kind.
5. A need for background or scheduled processing of any kind.
6. A contradiction discovered between Decision 43, the Rule 8
   Assessment, or the accepted Implementation Plan and what
   implementation-time investigation finds in the actual codebase.
7. A mechanism that, upon closer implementation-time investigation,
   cannot satisfy Decision 43's own accepted correctness boundary
   (§5 of the Decision 43 artifact) for a given operation.
8. A performance/read-cost problem for `recordClosing` (§6) or
   `recordOwnerDeclaredBusinessWorth` (§9) that appears to require
   weakening the accepted correctness requirement rather than
   accepting a documented, stronger mechanism (§10 above).
9. Any perceived need to reopen Decision 43, the Rule 8 Assessment, or
   the accepted Implementation Plan.

Any of these discovered during implementation must be reported as an
open governance question, exactly as the Rule 8 Assessment and
Implementation Plan themselves did for the two questions already
flagged (§6, §9's own atomicity/data-volume questions) — not resolved
unilaterally during coding.

---

## 16. Product Architect Signature

**PRODUCT ARCHITECT**
**SABUSHIMIKE MASCENI**

**Status:** AUTHORIZED FOR IMPLEMENTATION
**Decision:** ACCEPTED
**Implementation Authorization:** GRANTED
**Date:** 3 September 2026

**Authorization Scope:** Decision 43 — Consequential Listener State
Reliability, strictly according to the accepted Implementation Plan
(commit `5575e46`).

> I confirm: the Implementation Plan for Decision 43 was accepted by
> me; the Rule 8 Assessment found Decision 43 READY, with both of its
> open decision points resolved by my own prior acceptance; Decision
> 43 itself remains accepted and authoritative and unmodified by this
> authorization. I authorize implementation of Decision 43 strictly
> against the accepted Implementation Plan, within the approved file
> surface stated in §2, excluding 41F and 41G, authorizing no
> redesign, no Firestore rules or index change unless separately
> escalated and authorized, no generalized offline architecture, no
> collaboration/concurrency architecture, and no reinterpretation of
> Option C as a universal listener-hardening rule. The approved file
> surface, the invariants in §12, and the Stop Conditions in §15 must
> be preserved. Verification per §7 is mandatory before this increment
> is considered complete. Rollback remains available as specified in
> the accepted Implementation Plan. This authorization is not
> permission to redesign the product — it authorizes only the
> implementation defined by the accepted Decision 43 Implementation
> Plan.

**Implementation is now authorized, but only within the accepted
Plan.**
