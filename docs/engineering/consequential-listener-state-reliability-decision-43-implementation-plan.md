Implementation Plan

# Implementation Plan — Consequential Listener State Reliability (Decision 43)

**Type:** Governance bridge document — translates the READY Rule 8
Assessment for Decision 43 into a concrete, per-operation,
file-and-function-level engineering execution plan, ready for Product
Architect Acceptance and a subsequent, separate Stage 8 Implementation
Authorization. **Does not itself authorize implementation and does
not modify code.**

**Status:** ✅ **ACCEPTED BY THE PRODUCT ARCHITECT.** See §27,
"Product Architect Acceptance," for the signed decision. Acceptance of
this Plan does not itself constitute Stage 8 Implementation
Authorization — that remains a separate, subsequent, not-yet-created
document/signature.

**Governing chain:** [`consequential-listener-state-reliability-decision-43.md`](../specs/consequential-listener-state-reliability-decision-43.md)
(✅ Accepted, governance decision stage — SABUSHIMIKE MASCENI, 3
September 2026, commit `130a5db`) → [Rule 8 Assessment for Decision 43](./consequential-listener-state-reliability-decision-43-rule8-assessment.md)
(✅ READY, both decision points resolved — SABUSHIMIKE MASCENI, 3
September 2026, commit `6047a7f`) → **THIS Implementation Plan** (✅
Accepted — SABUSHIMIKE MASCENI, 3 September 2026) → *(next: Stage 8
Implementation Authorization — separate, not-yet-created)*.

**Repository baseline:** `main = origin/main = 6047a7f`. Nothing in
`apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`,
`tests/`, or any configuration/package file has been modified to
produce this document.

**This document does not:** modify Decision 43, the Rule 8 Assessment,
`firestore.rules`, `firestore.indexes.json`, or any application or
test code. It does not itself constitute Implementation Authorization.
It does not redesign the Business Worth Engine, the Closing
architecture, the Initial Stock Void & Redo authorization, or any
Decision 41A–41E mechanism — every element below is a narrowly-scoped
addition, justified against a specific Rule 8 Assessment finding, not
a redesign of any of them.

---

## 1. Purpose

To specify, precisely enough for a Stage 8 Implementation Authorization
to be signed against it without further design ambiguity, exactly what
Decision 43's accepted boundary requires: which files, which
functions, which new read/transaction logic, and in what order — for
each of the 10 consequential operations the Rule 8 Assessment
identified, while leaving no operation's mechanism ambiguous and no
scope silently expanded beyond that Assessment's own trace.

---

## 2. Scope

Exactly the 10 consequential operations identified and classified by
the Rule 8 Assessment (`consequential-listener-state-reliability-decision-43-rule8-assessment.md`,
§3, §5, §6):

1. `addStockBatch` — product create-vs-reuse; batch supersession
2. `deleteProduct` — batch/quebra cascade-delete scope
3. `recordClosing` — financial totals; expense/withdrawal locking;
   duplicate-Closing detection
4. `reopenClosing` — Closing target lookup; expense/withdrawal unlock
   scope
5. `recordStockCount` finalization — `businessWorthSnapshots`
   supersession; `voidRecords`-derived state
6. `recordOwnerDeclaredBusinessWorth` — calculation inputs
   (`cashLedgerEntries`, `batches`, `quebras`, `expenses`,
   `withdrawals`, `payables`, `businessWorthSnapshots`)
7. Initial Stock authorized-recovery eligibility
   (`initialStockRecoveryAuthorization`)
8. Shared-device PIN-pad staff-state cache (`staffMembers`)
9. Subscription payment-status gate (`payments`)
10. `businessWorthRecoveryAuthorization` — the structurally symmetric
    counterpart to item 7, per the Rule 8 Assessment's own lower-
    confidence note on this specific item

No operation outside this list is in scope. This Plan does not extend
Decision 43's boundary to any additional listener merely because one
exists in the application.

---

## 3. Non-Goals

Restated directly from Decision 43 §6 and the Rule 8 Assessment §12,
carried into this Plan unmodified:

- No offline support or generalized local persistence beyond
  Firestore's existing `persistentLocalCache`.
- No conflict resolution, multi-device concurrency, or collaborative
  editing (Decision 41G, untouched).
- No background synchronization or scheduled jobs.
- No server-side architecture redesign.
- No `firestore.rules` or `firestore.indexes.json` change. If the
  per-operation design below is ever found, at implementation time, to
  genuinely require one, that finding must be raised as its own,
  separate governance decision before proceeding — not silently
  included here or later.
- No redesign of the Business Worth Engine's or Closing's own
  calculation formulas — only the reliability of the listener-derived
  inputs those formulas consume.
- No generalized recovery/backup architecture.
- No 41F (browser/OS teardown reliability) or 41G (concurrent editing)
  work.
- No extension of Decision 41D's four-state listener model to any
  listener in this Plan's scope — none of the mechanisms below adopt
  that specific state machine.
- No reopening of the Initial Stock Void & Redo authorization or the
  already-accepted batch-supersession residual risk (Rule 8
  Assessment §5, §12).

---

## 4. `addStockBatch` — Product Create-vs-Reuse and Batch Supersession

**Current location:** `AppContext.tsx:2788` (function start), product
lookup at `AppContext.tsx:2794` (`products.find((p) => p.name...)`),
existing `runTransaction` at `AppContext.tsx:2938`, supersession
candidate list at `AppContext.tsx:2914`
(`candidateOpenBatchIds`), existing `openBatchLocks/{productId}` lock
document at `AppContext.tsx:2911`.

**Per-operation strategy:**

- **Create-vs-reuse decision:** the product-existence check currently
  reads the ambient `products` array. The narrowest authoritative
  mechanism is a **document-keyed fresh read** — a targeted query for
  a product by its normalized name, performed either immediately
  before the existing `runTransaction` begins, or (preferably, per the
  atomicity discussion below) as an additional `tx.get()`-backed read
  inside the same transaction that already exists two lines later in
  this function, since Firestore transactions require all reads before
  any write and this function already satisfies that discipline for
  its batch-lock read.
- **Batch supersession candidates:** the existing `candidateOpenBatchIds`
  computation already documents (per its own in-code comment, cited
  in the Rule 8 Assessment §5) that a stale/empty client list can
  leave a legacy batch un-superseded, as an accepted residual risk.
  This Plan does **not** propose closing that specific residual risk
  — it remains accepted, per §3 above. What this Plan **does** propose
  is upgrading the *ordinary* (non-legacy) path's candidate-list
  source from the ambient `batches` array to an authoritative,
  product-scoped fresh read, narrowing the residual risk's own
  applicability going forward to genuinely-legacy data only, exactly
  as its own comment already anticipates.

**Data-read strategy:** a single, product-scoped query
(`where('name','==',normalizedName)` equivalent, or the existing
product-id-keyed document read if the product id is already known at
call time) for create-vs-reuse; a `where('productId','==',id) &&
where('status','==','open')` bounded query for supersession
candidates — both narrower than a full `products`/`batches` collection
read.

**Transaction/atomicity strategy:** extend the existing
`runTransaction` (line 2938) to include both reads, rather than
performing them as separate, non-atomic fresh reads before the
transaction begins — this closes the race between "read fresh" and
"write" that a plain pre-transaction fresh read would still leave
open, and reuses infrastructure this function already has rather than
adding new transaction scaffolding.

**Performance:** both reads are single-document or narrowly-filtered,
matching the cost profile already proven by `recordReceivablePayment`/
`recordPayablePayment`. Whether the existing single-field-filter query
shape requires a new composite index depends on the exact final query
construction — **to be confirmed at implementation time**; a single
`where()` clause alone does not require one per current Firestore
behavior, but this must be re-checked against the actual query as
written, not assumed here.

**Files:** `AppContext.tsx` (function `addStockBatch`).

---

## 5. `deleteProduct` — Batch/Quebra Cascade-Delete Scope

**Current location:** `AppContext.tsx:6842–6858`. Cascade lists at
lines 6846 (`batches.filter`) and 6847 (`quebras.filter`, per the Rule
8 Assessment's citation).

**Per-operation strategy:** replace both ambient-array `.filter()`
calls with a fresh, bounded query for each collection, scoped by
`where('productId','==',id)`, executed immediately before the existing
`planDeleteProduct`/chunked-delete loop.

**Data-read strategy:** two bounded, single-field-filtered fresh
reads (`getDocs`), one per collection — not a full-collection read of
either `batches` or `quebras`.

**Transaction/atomicity strategy:** no transaction identified as
necessary. The Rule 8 Assessment (§6, §8) found no race scenario
specific to this operation requiring atomicity between the read and
the subsequent chunked deletes — a plain read-then-delete is
sufficient, since the risk being closed is "the client's ambient list
was wrong," not "another operation is concurrently racing this
specific delete." This determination should be re-confirmed at
implementation time against the actual `planDeleteProduct` chunking
logic, not assumed permanently settled by this Plan alone.

**Performance:** two bounded reads, cost proportional to the number of
batches/quebras that genuinely belong to the product being deleted —
inherently small relative to a full-collection read.

**Files:** `AppContext.tsx` (function `deleteProduct`).

---

## 6. `recordClosing` — Financial Totals, Locking, and Duplicate Detection

**Current location:** `AppContext.tsx:6504–6556`. Totals computation
at line 6511 (`generateReportSummary(...)`); locking lists at lines
6538–6539 (`expensesToLock`/`withdrawalsToLock`); duplicate-period
guard implied by the existing `closedPeriodKey`/`periodKey` computation
in the same function.

This is one of the two operations the Product Architect's Rule 8
resolution (§17.1–§17.2 of the Rule 8 Assessment) specifically
constrained. Per that resolution:

**Per-operation strategy:**

- **Financial totals** (`generateReportSummary`'s own inputs —
  `products`, `batches`, `quebras`, `expenses`, `withdrawals`): the
  narrowest authoritative mechanism that completely supplies these
  inputs is a **date-range-bounded fresh read**, mirroring the
  function's own existing `isDateInRange` filtering logic (already
  used at lines 6538–6539 for the locking lists) — i.e., fetch
  `expenses`/`withdrawals` filtered to `[startDate, endDate]` freshly
  at closing time, rather than either continuing to rely on the
  ambient full-history arrays or fetching the entire collections
  unbounded. Whether `products`/`batches`/`quebras` (which feed
  `totalEmbeddedProfit` via inventory valuation, not a date range) can
  be similarly bounded, or genuinely require a full authoritative
  collection read because the calculation is a point-in-time inventory
  snapshot rather than a period-bounded one, **is an open technical
  question this Plan flags for implementation-time confirmation** —
  the Rule 8 Assessment's own resolution requires that if a bounded
  approach cannot be shown to guarantee correctness for this specific
  sub-calculation, that must be documented and a stronger mechanism
  used instead of weakening correctness; this Plan does not
  pre-decide which of those two outcomes applies to the inventory-side
  inputs specifically.
- **Locking lists:** the same date-range-bounded fresh read already
  proposed above for `expenses`/`withdrawals` directly supplies these
  lists too — no separate mechanism needed; the totals and locking
  computations can share one fresh read per collection.
- **Duplicate-period guard:** a **document-keyed fresh read** against
  the deterministic `closedPeriodKey`-derived document id (already
  computed by the existing code) is the narrowest authoritative check
  — existence of one specific document, not a collection scan.

**Data-read strategy:** two date-range-bounded fresh reads
(`expenses`, `withdrawals`), one authoritative-inventory read whose
exact bound is an open question (see above), and one document-keyed
existence check (`closedPeriods`/`closings` duplicate guard).

**Transaction/atomicity strategy:** the Rule 8 Assessment (§8)
identified a genuine read-write race for this operation and found no
existing transaction or lock-document mechanism covering it (unlike
`addStockBatch`, `recordClosing` currently uses a plain `fsBatch`, and
no `closingLocks`-equivalent to `openBatchLocks` exists). Per the
Product Architect's resolution, this race **must** be closed by an
atomic mechanism — either converting the relevant portion of
`recordClosing` to a `runTransaction` that performs its authoritative
reads and the resulting Closing/lock writes atomically, or introducing
a new lock-document collection mirroring the existing `openBatchLocks`
pattern. **Which of these two shapes is preferable is an open
implementation-design question this Plan does not resolve** — a full
`runTransaction` covering a date-range query may be architecturally
heavier than Firestore transactions are typically used for (Firestore
transactions are optimized for small, targeted read sets, not
open-ended range queries), which may argue for the lock-document
approach instead; this determination requires implementation-time
technical investigation beyond what this Plan can establish from
static analysis alone.

**Performance:** the date-range-bounded reads are proportional to
the closing period's own duration, not the business's entire history —
this is very likely a bounded, acceptable cost for a business with
years of data, in contrast to a full-collection read, but **the exact
cost cannot be measured from this repository** (no per-business record
volume data is available in static analysis) and must be evaluated
against real data during implementation, per the Product Architect's
own resolution.

**Files:** `AppContext.tsx` (function `recordClosing`); possibly a new
lock-document collection definition in `firestore.rules` **if** the
lock-document mechanism is the shape ultimately chosen — this would be
a rules change and, per §3 of this Plan, must be raised as its own
governance step if it becomes necessary, not silently added.

---

## 7. `reopenClosing` — Authoritative Target and Unlock Scope

**Current location:** `AppContext.tsx:6638–6665`. Target lookup at
line 6642 (`closings.find`); unlock scope at lines 6657–6658
(`lockedExpenses`/`lockedWithdrawals`).

**Per-operation strategy:**

- **Target lookup:** a **document-keyed fresh read**
  (`getDoc(doc(db, 'businesses', businessId, 'closings', id))`) in
  place of the ambient-array `.find()`.
- **Unlock scope:** a **bounded, filtered fresh read**
  (`where('closingId','==',id)`) against `expenses` and `withdrawals`,
  in place of the ambient-array `.filter()` calls.

**Data-read strategy:** one document-keyed read, two
single-field-filtered bounded reads.

**Transaction/atomicity strategy:** the target lookup and the unlock
writes that follow it should be evaluated for whether they need to be
atomic with each other (i.e., could the Closing's own status change
between the fresh read and the unlock writes in a way that matters) —
**this Plan flags this as requiring the same implementation-time
technical confirmation as `recordClosing`'s own atomicity question**,
since both operate on the same `closings` collection and share
structural similarity; a preliminary assessment suggests the risk
profile is narrower here (updating existing records' `closingId` field
to unlock them, not creating a new permanent record), but this
determination is not finalized by this Plan.

**Performance:** all three reads are bounded; cost proportional to the
records genuinely belonging to the target Closing.

**Files:** `AppContext.tsx` (function `reopenClosing`).

---

## 8. `recordStockCount` Finalization

**Current location:** `AppContext.tsx:4641` (function start).
`businessWorthSnapshots` supersession lookup at line 5288
(`previousSnapshots = businessWorthSnapshots.filter(status==='active')`,
per the Rule 8 Assessment §3, §5); `voidRecords`-derived state consumed
via `hasInitialStockCount`/`voidedConfirmationIds` (`AppContext.tsx:1387`,
computed outside this function but consumed within its Void & Redo
branch logic).

**Per-operation strategy:**

- **`businessWorthSnapshots` supersession:** a **document-keyed or
  narrowly-filtered fresh read** (`where('status','==','active')`,
  which per the existing code appears to resolve to at most one
  active snapshot at a time, matching this codebase's own established
  "at most one active" invariant pattern used elsewhere for
  `voidRecords`/`initialStockRecoveryAuthorization`) in place of the
  ambient-array filter.
- **`voidRecords`-derived state:** this Plan explicitly does **not**
  propose changing the Void & Redo eligibility computation itself
  (`AppContext.tsx:1387`) or its own authorization semantics — per
  Decision 43's own explicit instruction and this Plan's §3, the
  existing Void & Redo authorization is not reopened. What this Plan
  scopes narrowly is protecting `hasInitialStockCount`'s own
  reliability against a `voidRecords`/`stockCounts` listener failure
  at the moment `recordStockCount` itself runs — a **document-keyed
  fresh existence check** against the specific predecessor
  confirmation's own `voidRecords` document (already identifiable by
  id, per the existing `redoesConfirmationId`/slot-mapping logic
  cited in the Rule 8 Assessment §3) is the narrowest mechanism, and
  notably mirrors what `firestore.rules`' own redo-branch create rule
  already independently verifies server-side — this fresh read would
  be a client-side pre-check for a better error message, not a new
  authorization decision.

**Data-read strategy:** one narrowly-filtered read
(`businessWorthSnapshots`), one document-keyed existence check
(`voidRecords`, specific predecessor id).

**Transaction/atomicity strategy:** `recordStockCount` already uses a
single `fsBatch.commit()` (line 5556, per the Rule 8 Assessment §5)
covering the `stockCounts` write, product writes, the
`businessWorthSnapshots` write, and draft deletion. Whether the
`businessWorthSnapshots` supersession read and the `voidRecords`
existence check should be folded into a `runTransaction` (converting
this function's existing plain batch) or can remain pre-batch fresh
reads is an open implementation-time question — the existing atomic
batch already correctly protects against the "batch rejected" failure
mode (per its own in-code comment, cited in an earlier forensic pass
of this investigation); whether the two new reads need to be *inside*
that same atomicity boundary, or are acceptable as informational
pre-checks, requires the same category of technical judgment flagged
for `recordClosing` above and is not resolved by this Plan.

**Performance:** both reads are narrow; no full-collection read
proposed.

**Files:** `AppContext.tsx` (function `recordStockCount`).

---

## 9. `recordOwnerDeclaredBusinessWorth` — Calculation Inputs

**Current location:** `AppContext.tsx:4451` (existing
`runTransaction`), calculation calls at lines 4474–4501
(`getCurrentBusinessWorth`/`getEstimatedBusinessWorth`, fed
`businessWorthSnapshots`, `batches`, `quebras`, `expenses`,
`withdrawals`, `payables`, `cashLedgerEntries`).

This is the second operation the Product Architect's Rule 8 resolution
specifically constrained.

**Per-operation strategy:** per the Rule 8 Assessment's own finding
(§4), this function's existing `runTransaction` already correctly
protects its idempotency check (`tx.get(snapshotRef)`) but does **not**
protect its calculation inputs, which remain ambient client arrays.
The narrowest authoritative mechanism that completely supplies these
seven inputs is the same class of question as `recordClosing`'s
inventory-side inputs (§6 above) — some (e.g., `businessWorthSnapshots`,
narrowly filterable to the active snapshot) are cheaply bounded;
others (`batches`, `quebras`, a full "as of date" reconstruction of
`expenses`/`withdrawals`/`cashLedgerEntries`/`payables`) may require
either a broader authoritative read or a fundamentally different
approach (e.g., reading only the delta since the last snapshot, if
the existing calculation functions support that shape — **not
established by this Plan, requires source inspection of
`getCurrentBusinessWorth`/`getEstimatedBusinessWorth` beyond what this
Plan's own scope covers**).

**Data-read strategy:** at minimum, a narrowly-filtered fresh read for
`businessWorthSnapshots` (mirroring §8's own approach); the remaining
six inputs' exact bounded-read strategy is **flagged as requiring
implementation-time technical investigation**, consistent with the
Product Architect's own resolution that a bounded approach must be
proven sufficient before being adopted, and that a stronger mechanism
must be used and documented if it cannot be.

**Transaction/atomicity strategy:** the existing `runTransaction`
(line 4451) is the natural place to extend, since this function
already pays the cost of transaction infrastructure for its own
idempotency check — widening its own read set to also cover the
calculation inputs (or at least the subset that can be bounded) is
architecturally consistent with what this function already does,
rather than introducing a second, separate mechanism alongside it.

**Performance:** unmeasured for the full-input case, per the same
reasoning as `recordClosing` — **explicitly flagged, not estimated.**

**Files:** `AppContext.tsx` (function `recordOwnerDeclaredBusinessWorth`).

---

## 10. Initial Stock Authorized-Recovery Eligibility

**Current location:** `AppContext.tsx:1428`
(`initialStockAuthorizedRecoveryEligibility =
computeInitialStockAuthorizedRecoveryEligibility(...)`), consumed by
`voidInitialStockConfirmation` (`AppContext.tsx:5800`) to select
between its ordinary and SuperAdmin-authorized void paths.

**Per-operation strategy:** a **document-keyed fresh read**
(`getDoc(doc(db, 'businesses', businessId,
'initialStockRecoveryAuthorization', 'current'))`) immediately before
`voidInitialStockConfirmation` makes its `usingAuthorizedRecovery`
path-selection decision, in place of relying on the ambient
`initialStockRecoveryAuthorization` state. This directly closes the
Rule 8 Assessment's own finding (§5) that a legitimate, active
recovery grant could otherwise be denied by nothing more than a
transient listener error.

**Data-read strategy:** single document, fixed id (`'current'`) —
the simplest case in this Plan's entire scope.

**Transaction/atomicity strategy:** no transaction identified as
necessary — this is a read used to select which of two already-
independently-guarded write paths to take; the actual write path
chosen (ordinary batch, or the SuperAdmin-authorized server endpoint)
retains its own existing correctness mechanism unchanged.

**Performance:** negligible — one document read, comparable to
`reopenClosing`'s own target lookup.

**Files:** `AppContext.tsx` (function `voidInitialStockConfirmation`,
specifically the `usingAuthorizedRecovery` determination).

---

## 11. Shared-Device PIN-Pad Staff-State Cache

**Current location:** `AppContext.tsx:1318–1349` (`pairDevice`, and
the auto-refresh `useEffect` that diffs live `staffMembers` against
the cached `pairedDevice.staff` and overwrites it on any difference).

**Per-operation strategy:** this operation writes to `localStorage`,
not Firestore — the mechanism categories evaluated for every other
operation in this Plan (fresh read, transaction) do not directly
apply. The correct mechanism, per the Rule 8 Assessment's own
classification (Finding, §6: "E — operation-level guard"), is a guard
at the point of the cache-overwrite decision itself: the auto-refresh
effect must not overwrite the cached, previously-good
`pairedDevice.staff` list with a freshly-empty `staffMembers` array
unless the `staffMembers` listener has itself confirmed at least one
successful snapshot since mount (i.e., the failure being guarded
against is "the listener errored and `staffMembers` reverted to its
default `[]`," not "the business genuinely now has zero staff," and
the effect currently cannot distinguish the two). This requires
knowing, at the point this effect runs, whether the current
`staffMembers` value reflects a confirmed snapshot or an unconfirmed
default — **a piece of state this Plan does not currently have
available from any existing mechanism** (no listener-state tracking
exists for `staffMembers` today), so implementing this specific guard
requires introducing a minimal signal for exactly this one listener
(e.g., a boolean "has this listener delivered at least one successful
snapshot" flag) — narrower in scope than Decision 41D's full four-state
model, and explicitly not a re-adoption of that model (per §3 of this
Plan), but a new, small piece of state nonetheless. **This is flagged
for Product Architect attention** as the one item in this Plan's scope
that requires adding new listener-adjacent state, however minimal,
rather than only changing how an operation reads existing data.

**Data-read strategy:** not applicable — this operation does not read
from Firestore at the point of the risk; it reads from React state
already populated by the existing `staffMembers` listener.

**Transaction/atomicity strategy:** not applicable — `localStorage`
writes are not part of Firestore's transaction model.

**Performance:** not applicable.

**Files:** `AppContext.tsx` (the `staffMembers` listener registration,
to add the minimal confirmed-snapshot flag, and the `pairDevice`
auto-refresh effect, to consult it).

---

## 12. Subscription Payment-Status Gate

**Current location:** `SubscriptionContactModal.tsx:69`
(`latestPayment = payments[0] ?? null`, gating
`showPendingView`/`showRejectedView`).

**Per-operation strategy:** a **bounded, sorted fresh read**
(`query(collection(db,...,'payments'), orderBy('submittedAt','desc'),
limit(1))`) in place of the ambient `payments[0]`, performed when the
modal opens (or immediately before `handleSubmit` is enabled), so a
listener failure cannot cause an existing pending/rejected payment
submission to appear absent and permit a duplicate submission.

**Data-read strategy:** a single, sorted, limited query — one
document read, not a collection scan. The existing composite index
confirmed present in `firestore.indexes.json`
(`payments: ['status','submittedAt']`) may already support a query
shape close to this one; the exact final query construction should be
checked against it at implementation time rather than assumed to
require a new index or assumed to be already covered.

**Transaction/atomicity strategy:** no transaction identified as
necessary — this is a pre-submission check, not a write requiring
atomicity with anything else.

**Performance:** negligible — a single, limited, sorted query.

**Files:** `SubscriptionContactModal.tsx`.

---

## 13. `businessWorthRecoveryAuthorization`

**Current location:** `AppContext.tsx:1458` (per the Rule 8
Assessment §3, §5's own citation), structurally symmetric to §10
above.

**Per-operation strategy:** the same document-keyed fresh-read
mechanism as §10, applied to the corresponding Business Worth
recovery/correction eligibility check. The Rule 8 Assessment itself
noted this item's classification rests on structural symmetry with
`initialStockRecoveryAuthorization` rather than an equally deep,
independently traced consuming function — **this Plan flags that the
exact consuming function and call site for this specific check should
be re-confirmed at implementation time** before applying the §10
pattern, rather than assuming the symmetry holds in every structural
detail.

**Data-read strategy:** single document, fixed id (`'current'`),
matching §10 — pending the confirmation above.

**Transaction/atomicity strategy:** matching §10, pending
confirmation of the exact consuming write path.

**Performance:** negligible, matching §10.

**Files:** `AppContext.tsx` — exact function requires implementation-
time confirmation per the note above; not fabricated here.

---

## 14. Architecture / File Impact Summary

| File | Operations touched | Nature of change |
|---|---|---|
| `AppContext.tsx` | All of §4–§11, §13 | Per-function: replace ambient-array reads with document-keyed or bounded fresh reads; extend 2 existing transactions (`addStockBatch`, `recordOwnerDeclaredBusinessWorth`); possibly convert `recordClosing`/`reopenClosing` from plain batch to transaction, or add a new lock-document mechanism (open question, §6) |
| `SubscriptionContactModal.tsx` | §12 | Replace ambient `payments[0]` with a bounded, sorted, limited fresh query |
| `firestore.rules` | Possibly §6, only if the lock-document shape is chosen | **No change proposed by this Plan itself** — flagged as a possible, separate, future governance item if implementation-time investigation makes it necessary |
| `firestore.indexes.json` | Possibly §4, §12 | **No change proposed by this Plan itself** — exact query shapes to be confirmed against existing indexes at implementation time |

No file outside this table is touched by this Plan's scope.

---

## 15. Data-Flow / Invariant Analysis

Restating the invariant each operation's design above is built to
preserve:

- **§4 (`addStockBatch`):** a product/batch that genuinely exists is
  never treated as absent merely because its listener has not yet
  delivered (or has errored on) a snapshot; the existing, accepted
  legacy-data residual risk (Rule 8 Assessment §5) is not reopened.
- **§5 (`deleteProduct`):** every batch/quebra genuinely belonging to
  a deleted product is included in the cascade, regardless of listener
  state.
- **§6/§9 (`recordClosing`, `recordOwnerDeclaredBusinessWorth`):** a
  permanent financial record is never created from an input the
  system cannot authoritatively confirm — per the Product Architect's
  own resolution, correctness is never traded for read-cost
  convenience.
- **§7 (`reopenClosing`):** a genuine Closing and its genuinely-locked
  records are always found and correctly unlocked, regardless of
  listener state.
- **§8 (`recordStockCount`):** the existing Void & Redo authorization
  boundary and Business Worth supersession logic are both preserved
  exactly as currently governed — only their listener-derived input
  reliability changes.
- **§10/§13 (recovery authorizations):** a genuine, active recovery
  grant is never denied merely because its listener has not yet
  delivered a snapshot.
- **§11 (staff PIN pad):** a shared device's cached staff list is
  never wiped by an unconfirmed empty listener state.
- **§12 (payment gate):** an existing pending/rejected payment
  submission is never presented as absent.

---

## 16. Tenant Isolation / Security

Every read proposed in §4–§13 remains scoped to the existing
`businesses/{businessId}/...` path convention (or, for `payments`, the
existing per-user/business scoping already established by that
collection's own current listener) — no cross-business query is
introduced anywhere in this Plan. No `firestore.rules` change is
proposed by this Plan itself (§3, §14); if implementation-time
investigation of §6/§4/§12 determines one is genuinely required, that
must be raised as a separate governance decision, not silently
included in the eventual Implementation Authorization. The client does
not become a security authority in any operation above — every fresh
read proposed is subject to the exact same `allow read` rule the
existing listener for that collection already operates under; every
write remains subject to its existing, unmodified `firestore.rules`
create/update/delete conditions.

---

## 17. Failure / Recovery Behavior

| Operation | Normal | Fresh-read failure | Recovery |
|---|---|---|---|
| §4 `addStockBatch` | Transaction commits | Transaction fails to read → surfaced as an error, consistent with this function's existing error handling | Operator retries the Add Stock action |
| §5 `deleteProduct` | Cascade delete completes | Fresh read fails → operation should not proceed with an incomplete cascade (exact behavior — abort vs. retry — is an implementation-time decision, not specified by this Plan) | Operator retries |
| §6 `recordClosing` | Closing recorded with authoritative totals | Authoritative read/transaction fails → Closing must not be created with unconfirmed totals; exact user-facing behavior is implementation-time detail | Operator retries closing |
| §7 `reopenClosing` | Closing reopened, records unlocked | Fresh read fails → reopen should not proceed with an unconfirmed target/scope | Operator retries |
| §8 `recordStockCount` | Finalization succeeds | Fresh read fails → existing error handling already covers batch-commit failure; new reads should surface equivalently | Operator retries |
| §9 `recordOwnerDeclaredBusinessWorth` | Declaration recorded | Same as §6 | Operator retries |
| §10/§13 Recovery eligibility | Correct path selected | Fresh read fails → should not silently default to "not eligible"; exact fallback (block vs. retry-prompt) is implementation-time detail | Operator retries |
| §11 PIN pad | Cache stays current | Unconfirmed listener state → cache is left unchanged, not wiped | Self-resolves once the listener recovers |
| §12 Payment gate | Correct view shown | Fresh read fails → should not default to "no pending payment"; exact fallback is implementation-time detail | Operator retries opening the modal |

Several "exact behavior" cells above are explicitly left open — this
Plan establishes the *reliability requirement* (never treat an
unconfirmed read as a confirmed empty/safe state) but does not
prescribe every UI-level failure treatment, consistent with Decision
43's own instruction not to mandate a specific UI.

---

## 18. Performance / Read-Cost Considerations

Summarized from §4–§13: the majority of operations (§4, §5, §7, §10,
§11, §12, §13) involve single-document or narrowly-filtered bounded
reads, with a cost profile this Plan assesses as low and consistent
with mechanisms already proven in production (`recordReceivablePayment`/
`recordPayablePayment`). Two operations (§6 `recordClosing`, §9
`recordOwnerDeclaredBusinessWorth`) have a genuinely open cost
question for their non-date-bounded calculation inputs (inventory-side
figures) — **this Plan does not estimate that cost**, consistent with
the Rule 8 Assessment's own refusal to fabricate a number, and
explicitly requires implementation-time investigation against real
data volume before a final mechanism is chosen for those two specific
sub-cases, per the Product Architect's own resolution.

No new Firestore index is created by this Plan. Where a proposed query
shape's index requirement is uncertain (§4, §12), this Plan flags it
for implementation-time confirmation against the existing
`firestore.indexes.json` rather than asserting an index is or is not
needed.

---

## 19. Compatibility with 41A–41E

- **41A** (business-switch flush): none of §4–§13 touch the Periodic/
  Initial draft autosave-flush mechanism; no interaction identified.
- **41B** (Initial Stock unmount flush): same, no interaction.
- **41C** (bounded draft-save retry/classification): `recordStockCount`
  (§8) is a different write path from the draft-save system 41C
  governs; the `draftSaveFailureClassification.ts` module is not
  reused or duplicated by this Plan, since none of §4–§13's operations
  are draft autosaves.
- **41D** (four-state draft listener model): explicitly not extended
  to any operation in this Plan's scope (§3, §11's own note on this
  point).
- **41E** (subscription-blocked read-only recovery): no interaction —
  none of §4–§13's operations are gated by `subscriptionBlocksNewRecords`
  in the current codebase, and this Plan does not add such gating.

No override, duplication, or reinterpretation of any 41A–41E mechanism
is introduced by this Plan.

---

## 20. Test Strategy (not created by this Plan)

For each operation, the eventual Implementation Plan's own test suite
should cover, at minimum:

- **Listener failure + consequential operation:** the operation is
  attempted while the relevant listener is in a failed/error state;
  assert the operation does not proceed as though the dataset were
  confirmed empty.
- **Authoritative fresh-read success:** the operation's new read
  succeeds and the operation proceeds correctly using the
  authoritative result, not the (possibly different) ambient listener
  state.
- **Authoritative read failure:** the fresh read itself fails (e.g.,
  network error at read time); assert the operation fails safely
  rather than silently proceeding with no data.
- **Empty authoritative dataset, genuinely empty:** confirm the
  operation still behaves correctly when the authoritative read
  confirms genuine absence (e.g., a genuinely new product, a genuinely
  first-ever Closing) — the new mechanism must not become
  over-cautious and block legitimate empty-state operations.
- **Stale/unconfirmed listener state ignored:** for each operation,
  confirm the new mechanism does not read from the ambient listener
  array at all for its consequential decision (a regression test
  against reintroducing the old ambient-read pattern).
- **Transaction/atomicity behavior** for §4, §9, and whichever of
  §6/§7/§8 is determined at implementation time to need it.
- **Financial aggregate correctness** for §6, §9 — the new
  authoritative-read totals must match what the existing ambient-array
  calculation would have produced under normal (non-failed-listener)
  conditions, proving the mechanism change is not itself a formula
  change.
- **Closing permanent-record correctness** (§6) and **reopen
  correctness** (§7).
- **Product deletion completeness** (§5) — no orphaned batch/quebra
  after a delete, under both normal and listener-failure conditions.
- **Stock-count finalization correctness** (§8).
- **Recovery authorization correctness** (§10, §13) — a genuine grant
  is never denied by a listener failure.
- **Staff/PIN-pad state preservation** (§11) — the cache is not wiped
  by an unconfirmed empty `staffMembers` state.
- **Payment gate correctness** (§12).
- **Tenant isolation** — every new read remains scoped to the correct
  `businessId`; no cross-business read is possible even under test
  manipulation.
- **Regression coverage for 41A–41E** — the full existing 41A–41E test
  suites (§19's own citation) must continue passing unmodified.

This Plan does not write these tests — they belong to the
Implementation Plan/Authorization stage that follows Product Architect
Acceptance of this document.

---

## 21. Verification Strategy

Once implemented (a separate, future stage), verification must
include, at minimum: `npm run lint`; the full `npm run test:all`;
every focused test file for §20's coverage; the full 41A/41B/41C/41D/
41E regression suites named in §19; and `npm run test:rules:emulator`
if any `firestore.rules`/`firestore.indexes.json` change is ultimately
found necessary (§3, §16) — none is proposed by this Plan itself.

---

## 22. Implementation Order / Checkpoints (proposed, not authorized)

Given §14's scope and the two genuinely open technical questions in
§6/§9, a phased order is recommended, mirroring the Decision 41A–41E
series' own established practice of ordering by risk/confidence rather
than by file:

1. **Phase 1 — low-ambiguity operations:** §10 (Initial Stock recovery
   eligibility), §13 (Business Worth recovery eligibility, pending its
   own confirmation), §12 (payment gate), §11 (PIN-pad guard) — all
   have a clear, single mechanism with no open design question.
2. **Phase 2 — bounded-query operations:** §5 (`deleteProduct`), §7
   (`reopenClosing`) — clear mechanism, no open atomicity question
   beyond a confirmation step already flagged as low-risk.
3. **Phase 3 — transaction-extension operations:** §4 (`addStockBatch`)
   — extends existing, proven transaction infrastructure.
4. **Phase 4 — the two open-design operations:** §6 (`recordClosing`)
   and §9 (`recordOwnerDeclaredBusinessWorth`) — requires the
   implementation-time technical investigation flagged throughout §6/
   §9 (data-volume evaluation, atomicity-shape decision) before a
   final per-operation design can even be written, let alone
   implemented. §8 (`recordStockCount`)'s own atomicity question is of
   the same character and belongs in this phase too.

This ordering is a recommendation for the Implementation Plan/
Authorization stage to adopt or revise — it is not itself an
authorization to begin any phase.

---

## 23. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| §6/§9's open atomicity-shape question is resolved incorrectly, introducing a new race | Explicit implementation-time technical investigation required before either operation's final design is written (§6, §9, §22 Phase 4) — not resolved by this Plan |
| A proposed query shape requires a new Firestore index not anticipated here | Explicitly flagged wherever uncertain (§4, §12); to be confirmed against `firestore.indexes.json` at implementation time; if a new index is genuinely required, it is an ordinary Implementation Authorization-scope index addition, not a rules-weakening change |
| §11's minimal new listener-confirmation flag creeps into a broader listener-state redesign | Explicitly scoped to `staffMembers` only in this Plan (§11); Decision 43 §6 and this Plan §3 both prohibit extending it further without a separate governance step |
| Performance of §6/§9's non-date-bounded inputs turns out to be unacceptable at real data volume | Per the Product Architect's own resolution, a bounded approach that cannot guarantee correctness must be documented and a stronger mechanism used instead — this is a designed-in escape valve, not a risk left unaddressed |

---

## 24. Rollback Considerations

Every mechanism proposed in §4–§13 is additive at the read layer — it
changes what data an operation reads before acting, not the shape of
any write, any document schema, or any `firestore.rules` condition
(barring the flagged, not-yet-decided possible exception in §6). A
rollback of any single operation's change is therefore expected to be
a contained, single-function reversion, without any data-migration
concern, consistent with 41A–41E's own established rollback profile
(cited in that series' own Implementation Plan, §19, as requiring no
special rollback entailment in either direction).

---

## 25. Governance Gate Statement

This document is an Implementation Plan **draft**. It does not
authorize any code, test, Firestore rule, or index change. Acceptance
of this Plan by the Product Architect (§27) does not itself constitute
Stage 8 Implementation Authorization — that remains a separate,
subsequent, not-yet-created document.

---

## 26. Next Gate

```
This Implementation Plan (drafted, not yet accepted)
  → Product Architect Acceptance of this Plan
  → Stage 8 Implementation Authorization (separate, signed)
  → Implementation
  → Verification
```

No gate in this sequence may be skipped or collapsed.

---

## 27. Product Architect Acceptance

**Status:** ✅ **ACCEPTED BY THE PRODUCT ARCHITECT.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED
**Date:** 3 September 2026
**Signature:** SABUSHIMIKE MASCENI

This signature accepts the Implementation Plan as written, in full,
including its defined scope (§2), explicit exclusions (§3), every
per-operation strategy (§4–§13), architecture/file impact summary
(§14), data-flow/invariant analysis (§15), tenant isolation/security
(§16), failure/recovery behavior (§17), performance/read-cost
considerations (§18), 41A–41E compatibility (§19), test strategy
(§20), verification strategy (§21), proposed implementation order
(§22), risks and mitigations (§23), and rollback considerations (§24).

**Specific acceptance — §11 (Shared-Device PIN-Pad Staff-State):** the
Product Architect explicitly accepts the approach described in §11,
including the narrowly-scoped, per-listener "has delivered at least
one successful snapshot" state it introduces to prevent an
unconfirmed, failed-listener state from overwriting the known-good
local staff pairing cache. This acceptance is confined to the §11
mechanism as written — a single, minimal confirmation flag for the
`staffMembers` listener specifically — and does **not** authorize
extending it into a broader listener-hardening redesign, a
reintroduction of Decision 41D's four-state model, or any change to
any other listener not already named in this Plan's own scope (§2).

Acceptance of this Plan does **not** itself constitute Stage 8
Implementation Authorization — that remains a separate, subsequent,
not-yet-created document/signature (§26). No code, test, Firestore
rule, index, or configuration file has been written, modified, or
authorized by this acceptance.

**Next governance gate:** Stage 8 Implementation Authorization
(separate, not-yet-created document).
