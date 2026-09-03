Phase 3 Mechanism Decision (Accepted Direction — Implementation Not Authorized)

# Decision 43 — Phase 3 Mechanism Decision

**Type:** Governance bridge document — records the **accepted mechanism
direction** for the two Phase 3 consequential operations (`recordClosing`,
`recordOwnerDeclaredBusinessWorth`). **Does not authorize implementation,
does not modify code, and does not itself constitute a Stage 8 amendment.**

**Status:** ✅ **MECHANISM DIRECTION ACCEPTED BY THE PRODUCT ARCHITECT — 
IMPLEMENTATION NOT AUTHORIZED.** See §11 for the signed acceptance. The
`recordClosing` acceptance is explicitly conditional on further
governance-level definition of the lock mechanism (§11.1); the
`recordOwnerDeclaredBusinessWorth` acceptance explicitly leaves six of
seven calculation inputs unresolved (§11.2). Neither acceptance authorizes
any code, test, rules, or index change (§11.3, §12).

**Governing chain:** [`consequential-listener-state-reliability-decision-43.md`](../specs/consequential-listener-state-reliability-decision-43.md)
(✅ Accepted, commit `130a5db`) → [Rule 8 Assessment](./consequential-listener-state-reliability-decision-43-rule8-assessment.md)
(✅ READY, both decision points resolved, commit `6047a7f`) → [Implementation Plan](./consequential-listener-state-reliability-decision-43-implementation-plan.md)
(✅ Accepted, commit `5575e46`) → [Stage 8 Implementation Authorization](./consequential-listener-state-reliability-decision-43-implementation-authorization.md)
(✅ Authorized, commit `8d94ae7`; §17 amendment, commit `7b5e3ed`) →
Phase 1 (✅ implemented, commit `07a938f`) → Phase 2 (✅ implemented,
commit `ff6243d`) → **THIS document** (✅ mechanism direction accepted,
§11 — implementation not authorized) → *(next: the Stage 8 amendment
this document itself identifies as required for the `recordClosing`
direction, §10 — not yet created; separately, the
`recordOwnerDeclaredBusinessWorth` technical investigation named in
§4/§11.2 — not yet performed; then, only after both, implementation)*.

**Repository baseline at drafting:** `main = origin/main = ff6243d`.
Working tree clean. Nothing in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `tests/`, or any configuration/package file has
been modified to produce this document — this artifact is the only
repository change made in this task.

**This document does not:** modify Decision 43, the Rule 8 Assessment, the
Implementation Plan, or the Stage 8 Authorization. It does not add any
file to the approved implementation file surface. It does not authorize
`firestore.rules`, `firestore.indexes.json`, application code, or test
changes. It does not create the lock-document collection it discusses. It
does not itself perform or constitute Phase 3 implementation.

---

## 1. Decision Context

Phase 1 and Phase 2 of Decision 43's approved Implementation Plan are
implemented and verified (commits `07a938f`, `ff6243d`). The two remaining
operations — `recordClosing` (Plan §6) and `recordOwnerDeclaredBusinessWorth`
(Plan §9) — were the two operations the Rule 8 Assessment's own §15
originally left as open technical questions, resolved at the governance
level by the Product Architect's §17.1/§17.2 resolution but **not** resolved
down to a specific implementation mechanism. A subsequent read-only Phase 3
preflight and a read-only mechanism-decision-preparation pass (both
conducted against this same `ff6243d` baseline, no code touched in either)
produced the evidence this document now organizes into a decision record.

This document exists solely to give that evidence a durable, citable form
and to record — once accepted — which mechanism direction the Product
Architect wants pursued, distinctly from authorizing anyone to pursue it
yet.

---

## 2. Evidence From the Phase 3 Preflight (Summary, Not Restated in Full)

- `recordClosing` (`AppContext.tsx:6651–6728`) has **no fresh authoritative
  read anywhere in the function** — the duplicate-period guard, the
  financial totals (`generateReportSummary`), and the expense/withdrawal
  locking lists are all ambient, listener-fed arrays. Writes go through
  `commitInChunks()` — a **plain, chunked `Firestore.batch()`**, not a
  transaction.
- `recordOwnerDeclaredBusinessWorth` (`AppContext.tsx:4480–4609`) has a
  **real, transactional idempotency read** (`tx.get(snapshotRef)`) but its
  seven calculation inputs (`businessWorthSnapshots`, `batches`, `quebras`,
  `expenses`, `withdrawals`, `payables`, `cashLedgerEntries`) are consumed
  as closure-captured ambient arrays inside the transaction callback, not
  as `tx.get()` reads — syntactic nesting inside `runTransaction` does not
  make them transactionally consistent.
- A real Firestore SDK constraint, already documented in this codebase's
  own `addStockBatch` transaction (`AppContext.tsx:2912–2921`):
  `Transaction.get()` accepts only a single `DocumentReference`, with no
  query overload. A date-range-bounded read of `expenses`/`withdrawals`
  cannot be performed transactionally as a query; it would require a
  pre-transaction `getDocs()` query followed by per-document `tx.get()`
  confirmation — structurally the same pattern `addStockBatch` already uses
  for `openBatchLocks`, including that pattern's own documented residual
  gap (a document outside the pre-transaction candidate list is invisible
  to the transaction's conflict detection).
- `commitInChunks`'s own in-code comment (`AppContext.tsx:6625–6628`)
  states its 498-per-chunk ceiling exists because a single Closing's
  combined expense/withdrawal count can exceed Firestore's shared
  500-mutation limit for both batches and transactions — a limit that would
  bind a converted `recordClosing` transaction identically, and a
  transaction, unlike a batch, cannot itself be chunked without losing
  atomicity across the split.
- No `closingLocks`-equivalent collection exists today, in either
  `AppContext.tsx` or `firestore.rules`. The only existing precedent for
  this class of mechanism is `openBatchLocks` (`AppContext.tsx:2960`,
  `firestore.rules` match block at line 536).

None of this is re-derived here; it is carried forward as the evidence
base per this task's own instruction.

---

## 3. `recordClosing` — Mechanism Decision (Proposed)

**Preferred mechanism (proposed, not yet authorized):** a new, explicit
lock-document mechanism, modeled on the existing `openBatchLocks`
precedent, closing the read-write race that bounded reads alone cannot
close.

**Reasoning, restated from the preparation evidence:**
- Bounded authoritative reads (date-range-filtered `getDocs()` for
  `expenses`/`withdrawals`, a document-keyed existence check for the
  duplicate-period guard) are feasible and low-cost, but **on their own
  they only make the read authoritative — they do not protect the
  subsequent write against a concurrent change**, which is the specific
  requirement §17.1 of the accepted Rule 8 resolution imposes wherever a
  race is identified.
- A straightforward transaction conversion is not established as feasible
  — see §2 above — because of the query-inside-transaction limitation and
  the possibility (not confirmed, see §5) that real closing periods exceed
  the transaction/batch mutation ceiling.
- §17.1 of the accepted Rule 8 Assessment resolution explicitly names "an
  equivalent lock-document mechanism (per the existing `openBatchLocks`
  precedent)" as an acceptable shape when a race exists and a transaction
  extension is not the chosen route. This proposal exercises exactly that
  already-anticipated option — it does not introduce a mechanism category
  Decision 43's own governance chain has not already contemplated.

**What remains to be formally defined before this can move toward
implementation** (per this task's own instruction — this decision does not
yet define these; it identifies that they must be defined, at the
governance level, before Stage 8 authorization can be amended to permit
building this):

- **Scope:** what the lock document actually anchors — most plausibly one
  lock per closing-period key (mirroring `closedPeriodKey`), but the
  existing code's own comment (`AppContext.tsx:6677–6679`) notes `custom`
  (Fecho) closings have no calendar-derived `periodKey` today, unlike
  monthly/yearly — this gap must be resolved as part of defining the
  lock's own keying scheme, not assumed to inherit `closedPeriodKey`
  automatically.
- **Lifecycle:** when the lock is acquired, when and how it is released
  (on success, on failure, on abandonment/crash mid-operation), and
  whether a stale lock can ever block a legitimate future closing
  indefinitely.
- **Failure behavior:** what a caller sees when the lock is already held
  (a genuine concurrent closing attempt) versus when the authoritative
  read itself fails — these are different failure modes and, per the
  accepted Plan §17, neither may silently proceed as though the operation
  is safe.
- **Tenant isolation:** the lock must remain scoped under
  `businesses/{businessId}/...`, matching every other mechanism in this
  Decision's scope — no cross-business lock or shared lock namespace.
  This proposal does not identify any reason this would differ from the
  `openBatchLocks` precedent's own scoping, but it is stated here as a
  requirement, not assumed silently.
- **Interaction with concurrent consequential writers:** specifically,
  whether an Expense/Withdrawal write that would land inside a
  currently-being-locked period should itself be blocked (a
  `firestore.rules` condition analogous to the existing `closedPeriods`
  backdating check) or merely lose the race harmlessly — this is a real
  design question this document does not resolve.

**This proposal does not select a final keying scheme, release policy, or
rules condition.** Those are exactly what "formally defined at the
governance level" (this task's own §2 instruction) means, and are left
for the amendment named in §10, not decided here.

---

## 4. `recordOwnerDeclaredBusinessWorth` — Mechanism Decision (Proposed)

**Preferred mechanism (proposed, not yet authorized):** do **not**
introduce the lock-document mechanism for this operation. Instead,
determine whether the existing `runTransaction` (already present at
`AppContext.tsx:4500` for the idempotency check) can be widened to bring
its calculation inputs inside the transaction's own read set, bounded
where possible.

**Per-input assessment, as far as this evidence base establishes:**

| Input | Assessment |
|---|---|
| `businessWorthSnapshots` (active snapshot) | Cheapest case — resolves to a single filtered read (`status == 'active'`), matching the "at most one active" invariant already established elsewhere in this codebase (per the Plan §8's own citation). Folding this into the existing transaction is straightforward and does not require the lock mechanism. |
| `batches`, `quebras`, `expenses`, `withdrawals`, `payables`, `cashLedgerEntries` | The preflight identified that `getCurrentBusinessWorth`/`getEstimatedBusinessWorth` (`calculations.ts:421`) are structurally a **delta since the last active snapshot's `confirmedAt`**, not a full-history aggregate — this is a genuine, narrower candidate bound than "the entire collection," but whether that delta window is itself always small enough to read transactionally (via the same pre-transaction-query-then-`tx.get()`-confirm pattern discussed in §3) is **not established by this or the prior evidence pass**. |

**Decision as proposed:** pursue the bounded-transaction-widening
direction for `businessWorthSnapshots` now-clearly-defined; treat the
"since-last-snapshot" delta bound for the remaining six inputs as
**requiring further technical investigation before a final mechanism is
chosen for them** — this document does not resolve that investigation,
consistent with this task's own instruction not to pretend unknowns are
resolved.

**If the since-last-snapshot delta cannot be bounded sufficiently:** the
smallest additional mechanism this evidence base points to is the same
query-then-`tx.get()`-confirm pattern proposed for `recordClosing`'s
date-range inputs (§3) — **not** the lock-document mechanism, since
`recordOwnerDeclaredBusinessWorth` already has a transaction and a
race-closing mechanism (the idempotency guard) that `recordClosing` lacks;
the open question here is read completeness inside that transaction, not
write-race protection, which is a materially different problem than
`recordClosing`'s.

---

## 5. Atomicity Requirements (Restated as Binding on Whatever Mechanism Is Eventually Authorized)

- No permanent record (`Closing`, `businessWorthSnapshots` entry) may be
  produced from a read that was not authoritative at the moment of write,
  per §17.1 of the accepted Rule 8 resolution — unchanged by this document.
- Where a race between an authoritative read and the resulting write can
  affect correctness, the eventual mechanism must close that race, not
  merely make the read itself authoritative — restated from §17.1,
  carried forward as the binding test both §3 and §4 above are evaluated
  against.
- Correctness may never be traded for a cheaper or simpler mechanism —
  restated from §17.2, unchanged.

---

## 6. Authoritative-Read Requirements

- `recordClosing`: date-range-bounded fresh reads for `expenses`/
  `withdrawals` (mirroring the function's own existing `isDateInRange`
  pattern); a document-keyed existence check for the duplicate-period
  guard; the inventory-side inputs (`products`, `batches`, `quebras`)
  remain an **open bound-shape question**, carried forward unresolved from
  the Phase 3 preflight — this document does not resolve it.
- `recordOwnerDeclaredBusinessWorth`: a narrowly-filtered read for
  `businessWorthSnapshots`; the remaining six inputs' bound shape is the
  open question named in §4.

---

## 7. Tenant-Isolation Requirements

Every mechanism discussed in this document — bounded reads, transaction
widening, and the proposed lock document alike — must remain scoped under
the existing `businesses/{businessId}/...` path convention, identical to
every other mechanism already implemented in Phase 1/Phase 2 and to the
`openBatchLocks` precedent. No cross-business query, lock, or aggregation
is proposed or would be acceptable under Decision 43's own accepted
boundary (§9 of the Decision 43 artifact).

---

## 8. Failure Behavior

Restated as a requirement, not yet a specified implementation, per the
accepted Plan §17's own pattern of leaving exact UI/error-surfacing
behavior to implementation time while making the underlying reliability
requirement non-optional:

- `recordClosing`: an authoritative-read failure, or a failure to acquire
  the proposed lock (once and if it is authorized and defined), must not
  allow the Closing to be recorded from unconfirmed state — the operation
  must abort and surface a distinguishable error, not silently retry into
  an inconsistent result.
- `recordOwnerDeclaredBusinessWorth`: an authoritative-read failure inside
  the widened transaction must not allow the snapshot's reconciliation
  fields to be written from unconfirmed state; the existing idempotency
  behavior (safe retry on a genuine resubmission) must remain unchanged.

---

## 9. Scope Impact

- **Files that would be touched, if this direction is eventually
  authorized:** `AppContext.tsx` (both operations); **`firestore.rules`**
  (only if the `recordClosing` lock-document direction proceeds — to
  define the lock document's own access rules and, if the interaction
  question in §3 is resolved toward blocking concurrent writers, a
  condition on `expenses`/`withdrawals` creation). No change to
  `firestore.indexes.json` is currently anticipated by any option
  discussed here.
- **Tests:** new coverage only (per the accepted Plan §20) — no existing
  test requires modification by anything decided in this document.
- **New architecture:** one new, narrowly-scoped lock-document collection
  for `recordClosing`, if authorized — not a redesign of the Closing or
  Business Worth calculation logic themselves. No new architecture is
  proposed for `recordOwnerDeclaredBusinessWorth`.

---

## 10. Stage 8 Amendment Requirement

**Yes, an amendment to the Stage 8 Implementation Authorization is
required before implementation of the `recordClosing` lock-document
direction may begin**, for the same reason the DashboardView.tsx addition
(§17 of the Authorization) required one: the current Authorization's §2
approved file surface names only `AppContext.tsx`, `SubscriptionContactModal.tsx`,
and `DashboardView.tsx` (limited scope). `firestore.rules` is explicitly
listed in the Authorization's §3 ("What This Authorization Does Not
Cover") and its §15 Stop Conditions (item 2) as requiring separate
escalation and authorization — not silently includable. **This document
does not perform that amendment.** It records that one will be needed,
once — and only if — the lock-document direction is accepted and its
scope/lifecycle/failure-behavior/rules-condition design (§3) is itself
completed at the governance level.

No amendment is anticipated for the `recordOwnerDeclaredBusinessWorth`
direction as currently proposed (§4), since it stays within the already-
authorized `AppContext.tsx` surface and does not touch `firestore.rules`
— **unless** the "since-last-snapshot" investigation in §4 concludes a
mechanism outside that surface is required, which this document does not
determine.

---

## 11. Product Architect Decision

**Status:** ✅ **ACCEPTED — MECHANISM DIRECTION ONLY. IMPLEMENTATION NOT
AUTHORIZED.**

### 11.1 `recordClosing`

**Accepted:** pursuing an explicit lock-document mechanism for
`recordClosing`, rather than a transaction conversion, as the preferred
mechanism direction.

**This acceptance is CONDITIONAL** on the lock mechanism's:

- scope,
- lifecycle,
- acquisition/release behavior,
- failure behavior,
- stale-lock handling,
- tenant isolation,
- concurrent-writer interaction,
- and exact enforcement model

being formally defined and reviewed before implementation. §3 of this
document identifies that these remain undefined; this acceptance does not
supply that definition — it accepts only the direction, not a completed
design.

**This acceptance does NOT authorize** creation of the lock collection,
changes to `firestore.rules`, or any application-code implementation. A
Stage 8 amendment remains required (§10) before any implementation that
expands the authorized file surface or introduces the required rules
changes.

### 11.2 `recordOwnerDeclaredBusinessWorth`

**Accepted:** widening the existing transaction for
`recordOwnerDeclaredBusinessWorth` where authoritative
`businessWorthSnapshots` reads can be incorporated safely.

**The remaining six calculation inputs are NOT considered resolved:**

- `batches`
- `quebras`
- `expenses`
- `withdrawals`
- `payables`
- `cashLedgerEntries`

Their authoritative mechanism/bound shape remains an **open technical
investigation**. The "since-last-snapshot" delta approach identified in
§4 may be evaluated as part of that investigation, but it is **not**
accepted as a final mechanism at this point.

**No implementation is authorized on the basis of this statement alone.**

### 11.3 Implementation Gate

It is explicitly confirmed that §11.1 and §11.2 do **not** constitute
Phase 3 implementation authorization. Therefore:

- no application code changes are authorized;
- no tests are authorized to be implemented;
- no `firestore.rules` changes are authorized;
- no indexes are authorized;
- no new lock collection is authorized;
- no implementation commit is authorized.

The existing Stage 8 Implementation Authorization (`8d94ae7`, amended
`7b5e3ed`) remains the implementation gate for everything already within
its scope. Any required expansion of the authorized surface — including,
but not limited to, the `recordClosing` lock-document work — must go
through the appropriate governance amendment before implementation.

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED
**Scope:** Decision 43 Phase 3 Mechanism Direction
**Implementation Authorization:** NOT GRANTED
**Date:** 2026-09-03
**Signature:** SABUSHIMIKE MASCENI

This signature accepts the mechanism direction recorded in §11.1 and
§11.2 above, in full, including their explicit conditions and unresolved
items. It does not accept, define, or finalize the `recordClosing` lock
mechanism's own design (§3), and it does not resolve the
`recordOwnerDeclaredBusinessWorth` six-input investigation (§4). It grants
no implementation authorization of any kind (§11.3).

---

## 12. Explicit Non-Authorization of Implementation

This document, in its entirety, **does not authorize**:

- any modification to `AppContext.tsx`, `SubscriptionContactModal.tsx`,
  `DashboardView.tsx`, `firestore.rules`, or `firestore.indexes.json`;
- creation of any lock-document collection;
- any test creation or modification;
- any commit or push of implementation work;
- any expansion of the Stage 8 Implementation Authorization's approved
  file surface.

The Stage 8 Implementation Authorization (`8d94ae7`, amended `7b5e3ed`)
remains the sole implementation gate for everything already within its
scope. This document records an accepted mechanism *direction* (§11) and
identifies what governance step (§10) would be required before that gate
could be widened to cover the `recordClosing` lock-document work
specifically. §11 being signed does not itself perform that widening:
until a resulting Stage 8 amendment is separately drafted and signed, and
until the `recordClosing` lock design (§3) and the
`recordOwnerDeclaredBusinessWorth` six-input investigation (§4) are
separately completed, no Phase 3 implementation is authorized by anything
in this document.
