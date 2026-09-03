Specification Amendment — Decision Recorded

# Decision 43 — Consequential Listener State Reliability
## (New governance decision, arising from the post-Decision-41A–41E forensic audit)

**Status:** ✅ **ACCEPTED AS GOVERNANCE DECISION — NOT IMPLEMENTATION
AUTHORIZATION.** See §12, "Product Architect Decision Record," for the
signed acceptance. Acceptance of this proposal does not itself
authorize any code change, Firestore rule change, test change, or
Implementation Plan — those remain separate, subsequent, not-yet-created
gates (§11).

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](./stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → Decisions 39–42 (implemented/accepted; see
[Decision 41 amendment](./stock-count-data-loss-resilience-decision-41-amendment.md)
and [Decision 42 amendment](./stock-count-data-loss-resilience-decision-42-amendment.md))
→ Decisions 41A–41E implemented, verified, committed, pushed (commits
`bbfb4dc`, `d8e0ee3`, `2491d7a`, `de2972e`, `3e3b384`) → a full
post-implementation forensic data-protection audit, conducted across
four successive verification passes (complete listener inventory,
downstream-consequence tracing, resolution of provisional findings,
governance-proposal drafting) → **THIS Decision** → *(next: Rule 8
Assessment — not yet created; see §11)*.

**Scope note:** unlike Decisions 38–42, this Decision's subject matter
is **not confined to Stock Count/Contagem drafts.** The forensic audit
that produced it traced listener-derived state across the tenant
application broadly (Expenses, Withdrawals, Closings, Products,
Business Worth, Void & Redo, Payments, and more). It is filed within
this same specs directory and referenced against the Decision 38–42
chain because it is a direct continuation of that same investigative
thread (the Decision 41E forensic audit explicitly commissioned to
look beyond drafts once 41A–41E closed the draft-specific doors), not
because its scope is limited to Stock Count. It does not amend
`stock-count-data-loss-resilience-specification.md` itself.

---

## 1. Decision Context

Following the completed implementation of Decisions 41A–41E (Stock
Count draft data-loss and inaccessibility hardening), a broader
forensic audit was commissioned to determine whether equivalent
listener-reliability and write-uncertainty gaps exist elsewhere in
SABUSH BPT. That audit's Finding 7.1 — originally stated as "32
listeners can effectively turn a failed read into an apparent empty
dataset" — was subjected to three successive rounds of deeper forensic
verification:

1. A complete, line-cited inventory of every Firestore realtime
   listener in the tenant application (36 distinct registration call
   sites, 32 unique collection/document paths, confirmed via
   exhaustive source-tree search — no hidden wrappers or abstractions
   found).
2. A downstream-consequence trace of every listener whose error
   handling is "log only, no explicit state action" (27 of the 36),
   tracing each through its actual consuming calculations, write
   paths, and gating decisions rather than assuming uniform risk.
3. A closing pass resolving the remaining provisional/low-confidence
   collections, which surfaced a methodological correction: several
   collections (`cashLedgerEntries`, `payments`,
   `cashPositionDeclarations`) were initially mis-scored as low-risk
   because they are consumed via bare-argument passing or
   bracket-indexing rather than the `.filter()`/`.map()` dot-access
   pattern the initial search targeted.

The consistent conclusion across all three passes is that
**listener-failure risk in this codebase is not uniform** — it ranges
from genuine integrity/financial-record risk to pure display
staleness, and a small number of collections have **mixed risk
profiles depending on which specific write path consumes them.** This
Decision exists to give the Product Architect a precise,
evidence-scoped decision to make about which of these risk classes, if
any, warrant a governed protection requirement — before any
implementation work is planned.

---

## 2. Verified Evidence

All items below were confirmed by direct code citation during the
forensic passes; none are extrapolated from the Decision 41A–41E
incident alone.

- **36 listener registrations, 32 unique paths**, all in
  `AppContext.tsx` (34) and `NotificationContext.tsx` (2). All 36 have
  an explicit error callback; the differentiator is what each callback
  *does*, not whether one exists.
- **3 listeners** (Periodic/Initial draft doc/collection listeners)
  already carry Decision 41D's four-state model.
- **1 listener** (`products`) has a standalone error-state boolean
  (`productsError`), but it is consumed in only one of the two screens
  where a `products` listener failure has a traced integrity
  consequence.
- **1 listener** (`business` doc) has bespoke
  `err.code === 'permission-denied'`-specific handling, predating this
  investigation, for suspension detection.
- **2 listeners** (`notifications`, business- and user-scoped)
  deliberately fail closed to an empty list, by explicit design
  comment, in the context of a not-yet-fully-ruled-out Phase 1
  feature.
- **27 listeners** log the error and take no further state action —
  the group this Decision is centrally concerned with.
- Of those 27, forensic tracing found: a high-confidence
  material-risk cluster, a high-confidence action/gating cluster,
  several genuinely transaction-protected paths, several genuinely
  low-risk/UX-only paths, and one collection (`timelineEvents`) with
  no material production-path consequence.
- The Firestore SDK's local-cache-resolves-before-server-delivery
  behavior (the mechanism underlying Decision 41C's readback fix) was
  confirmed, by direct inspection of `lib/firebase.ts`, to be a
  property of the single shared `db` instance used by every write in
  the application — not a draft-specific quirk. Only 5 of roughly 40
  write functions have server-readback verification.

---

## 3. Architectural Problem

The precise problem, stated narrowly:

**A Firestore `onSnapshot` listener's error callback and its success
callback are, in this codebase's dominant pattern, observationally
indistinguishable from each other once collapsed into the same
default-valued state.** When a listener's error handler takes no
explicit action, the corresponding React state remains at whatever it
already held — which, for a listener that has never yet delivered a
successful snapshot (first load after sign-in, business switch, or
reconnect), is the type's initial default: an empty array, or `null`.

**This is only an architectural problem when that state is
subsequently treated as authoritative** — i.e., when application logic
reads "the array is empty" as "the dataset is confirmed empty" rather
than "the dataset's true contents are currently unknown," and that
misreading feeds a financial calculation, a permanent write, or an
authorization/gating decision. When the same collapsed-to-default
state is used only for on-screen display, the consequence is a stale
or blank UI element — undesirable, but not a data-integrity or
financial-correctness failure.

The forensic work below classifies every material listener strictly
by this test: **does its failure-collapsed state reach a consequential
calculation, write, or gating decision, and if so, through which
specific code path?**

---

## 4. Risk Classes

**Integrity risk** — a write can be created, modified, or omitted
incorrectly because the client acted on a falsely-empty dataset (e.g.,
a duplicate record created, or a real record silently
orphaned/unlinked).

**Incorrect business calculation** — a computed financial or
reconciliation figure is wrong because an input array was falsely
empty; the consequence ranges from a transient wrong on-screen number
to a **permanently stored** wrong number, depending on whether the
calculation feeds an immutable record.

**Action/gating error** — a legitimate action is wrongly blocked, or
an action that should be blocked is wrongly offered, because a
listener-derived boolean/lookup produced a false negative or false
positive. Distinct from integrity risk: no wrong data is written, but
a legitimate operation is denied or a process step is skipped.

**Protected paths** — the specific write function already performs a
fresh `runTransaction`/`tx.get()` read at write time, making the
*client listener's* staleness structurally irrelevant to that write's
correctness. Note precisely: protection is per-write-path, not
per-collection — several collections have both a protected write role
and an unprotected calculation-input role.

**UX-only** — the only traced consequence is a stale, blank, or
inaccurate display with no downstream write, calculation, or gating
dependency found.

---

## 5. Proposed Governance Boundary

The invariant offered for Product Architect evaluation:

> **A consequential operation must not treat an unconfirmed, failed-
> listener-derived state as authoritative evidence that a dataset is
> empty, absent, or safe to proceed against, when that dataset
> materially affects: (1) financial calculations, (2) permanent
> historical records, (3) integrity-sensitive write decisions, (4)
> authorization/recovery decisions, or (5) business-period
> locking/gating.**

This was offered as a **scope-defining principle**, not a
specification of mechanism. §7 evaluated several distinct mechanisms
that could satisfy it, without pre-selecting one. The principle
deliberately does **not** claim that every listener needs new
machinery — only that *consequential* listener-derived state needs
*some* protection against the specific failure mode traced in this
investigation, and the choice of protection should be fit to each risk
class rather than applied uniformly.

---

## 6. Explicitly Excluded Scope

This Decision does not govern, authorize, or imply any of the
following. Each would require its own separate governance decision if
ever pursued:

- Offline support or generalized local persistence beyond Firestore's
  existing `persistentLocalCache`.
- Conflict resolution, multi-device concurrency, or collaborative
  editing (remains Decision 41G's separate, recorded, non-blocking
  concern).
- Background synchronization or scheduled jobs.
- Server-side architecture redesign.
- Changes to Firestore security rules or indexes.
- Redesign of the Business Worth Engine or Closing architecture — this
  Decision concerns *listener-derived input reliability* to these
  systems, not their calculation logic or record model.
- A generalized recovery/backup architecture.
- Decision 41F's browser/OS teardown reliability question (remains
  separate, recorded, non-blocking).
- Extension of Decision 41D's specific four-state model to any
  listener by default.
- Any reopening of the already-accepted batch-supersession residual
  risk (§10) or the Void & Redo authorization (§10).

---

## 7. Decision Options

**Option A — Broad listener hardening.** Apply explicit,
distinguishable error/loading/confirmed-state semantics (a 41D-style
model or lighter variant) to every listener whose failure was
classified as material-risk or action/gating risk. Highest
correctness; largest implementation/governance scope; would likely
need multi-phase implementation given the number of distinct
collections and consumers involved.

**Option B — Consequential-operation boundary.** Protect only the
specific write/calculation/gating call sites identified as
material-risk or action/gating risk, leaving the listeners themselves
largely as-is; protection applied at the point of consumption rather
than as persistent listener-level state. Narrower, more targeted
scope than Option A; more naturally phased per operation, consistent
with this project's established preference for narrow increments.

**Option C — Fresh-read boundary.** Consequential operations obtain a
fresh, server-verified read (via `getDocFromServer`/`getDocs`/
`runTransaction`'s own `tx.get()`) at the moment the data is needed,
rather than relying on the ambient listener-fed array. Highest
per-operation correctness; cost/complexity varies sharply by target —
cheap and already-proven for document-keyed lookups (mirrors
`recordReceivablePayment`/`recordPayablePayment`/the three
supplier-wording functions), more expensive for full-collection
aggregate recalculation, not evaluated case-by-case in the forensic
pass.

**Option D — Case-by-case backlog, no generalized mechanism.** Record
every finding individually (as 41F/41G are recorded today) and defer
any protection-mechanism decision to whichever future increment
addresses each item. Lowest immediate governance complexity; leaves no
standing check against a newly-introduced instance of the same
vulnerability class in future code.

---

## 8. Recommended Direction (as proposed; see §12 for what was actually accepted)

The proposal recommended **Option B, informed by Option C where a
specific consequential operation can cheaply obtain a fresh read** —
reasoning that the risk is concentrated in a specific, identifiable,
comparatively small set of write/calculation paths, that Option A's
blanket approach would spend effort hardening listeners this
investigation found no consequential risk in, and that Option C's
uneven cost profile across identified paths makes it better suited as
a per-operation candidate mechanism (evaluated during Rule 8) than as
a universally-mandated approach.

---

## 9. Affected Collections / Paths

**Material-risk paths (integrity or permanently-stored incorrect
calculation):**

| Collection | Role | Consequence traced |
|---|---|---|
| `expenses` | Closing creation/locking, active-closing-period lookup, all-time totals | Permanently incorrect Closing totals; real records left unlocked |
| `withdrawals` | Same as expenses | Same as expenses |
| `closings` | Duplicate-period guard, deletion-lock check, reopen lookup | Duplicate closings possible; lock-protection can silently fail; reopen falsely denied |
| `closedPeriods` | Duplicate-period guard | Duplicate closings possible |
| `batches` | Supersession candidate selection, valuation, cascade-delete list | Orphaned open batches (one instance already accepted, see §10); zero/incorrect valuation; orphaned records on product delete |
| `quebras` | Cascade-delete list | Orphaned records on product delete |
| `products` | Create-vs-reuse lookup in Add Stock | Duplicate product creation; existing `productsError` flag does not reach this path |
| `cashLedgerEntries` | Business Worth calculation input (7 call sites) | Feeds permanently-stored Business Worth figures with a falsely-empty input |
| `businessWorthSnapshots` | *Contagem-triggered snapshot path only* — supersession lookup | Real active snapshot may not be correctly superseded |
| `payables` | *Business Worth calculation-input role only* — same functions as `cashLedgerEntries` | Same consequence, this role only |

**Action/gating paths (legitimate action wrongly blocked or offered;
no data corruption traced):**

| Collection | Role | Consequence traced |
|---|---|---|
| `voidRecords` | `hasInitialStockCount` void-exclusion filter | False "already confirmed" state blocks legitimate redo |
| `staffMembers` | Shared-device PIN pad cache refresh | Listener error can silently wipe a shared device's cached staff list |
| `payments` | Latest-payment-status gate in subscription contact flow | Risk of duplicate payment-proof submission |
| `initialStockRecoveryAuthorization` | Authorized-recovery eligibility check | A real, active recovery grant can be denied |
| `businessWorthRecoveryAuthorization` | Structurally symmetric eligibility check (not independently traced to its own consuming function — lower confidence than the item above) | Same pattern, lower confidence |

**Protected paths (transaction-shielded for the specific write role
cited — not a blanket collection-level guarantee):**

| Collection | Protected role |
|---|---|
| `receivables` / `receivablePayments` | `recordReceivablePayment`'s own idempotent write, via `tx.get()` |
| `payables` / `payablePayments` | `recordPayablePayment`'s own idempotent write, via `tx.get()` — **note: `payables` is simultaneously material-risk in its calculation-input role above** |
| `suppliers` | The three supplier-wording-relationship functions, via `runTransaction` |
| `businessWorthSnapshots` | *Declare-Business-Worth path's own idempotency check only* — **the same function's calculation inputs (including `cashLedgerEntries`/`payables`) are not protected by this same transaction** |

**UX-only / no material consequence paths:**

| Collection | Consequence traced |
|---|---|
| `purchaseBatches` | Display summary only (Stocks report) |
| `initialStockPriceChangeEvents` | Cosmetic sequence-numbering artifact (not independently re-verified to its exact fallback) |
| `subscription` | Fails open by design; `firestore.rules` is the actual enforcement boundary |
| `userProfile`, `ownedBusinesses` | Display/navigation only |
| `startupInvestmentEntries` | Feeds a displayed report total only; no write dependency found |
| `cashPositionDeclarations` | *StockCount finalization role*: omission-only (conditional field simply absent, not misreported) |
| `timelineEvents` | No material production-path consequence; sole dependency found is within the demo-gated `clearAllData` path |

---

## 10. Relationship to Existing Governance

- **Decisions 41A–41E remain frozen, implemented, and verified.**
  Nothing in this Decision reopens, reinterprets, or modifies any of
  them.
- **Decision 41D's four-state model is not automatically extended to
  any other listener by this Decision.** Whether and how to protect a
  given listener remains an open question to be resolved via the
  options in §7, informed by the specific risk each listener was
  found to carry, during the Rule 8 Assessment named in §11.
- **The existing Initial Stock Void & Redo authorization is unchanged
  and not reopened.** The `voidRecords` finding in §9 concerns the
  *listener* that reads void state for gating purposes, not the
  underlying authorization or its `firestore.rules` conditions, which
  were independently re-verified as unmodified during the Decision
  41E forensic work.
- **The previously accepted batch-supersession residual risk remains
  accepted, not reopened.** The forensic trace of `batches` in this
  Decision confirms and cites the existing, in-code acknowledgment of
  this exact risk (`AppContext.tsx`, the "Fix #10 report" comment)
  rather than presenting it as a new finding.
- **Decisions 41F (browser teardown reliability) and 41G (concurrent
  editing) remain separate, recorded, non-blocking matters**, untouched
  by this Decision.

---

## 11. Required Future Governance Gates

Per this project's standing discipline, identical in structure to
every prior decision in this series:

1. Product Architect acceptance of a specific direction (**this
   document — see §12, recorded**).
2. Rule 8 Assessment — evaluating the accepted direction against
   SABUSH BPT's full architecture, including the per-case cost
   evaluation the accepted direction's Option C component depends on.
3. Implementation Plan — file-by-file, phase-ordered, mirroring the
   structure used for Decision 41A–41E.
4. Stage 8 Implementation Authorization — signed, scoping exactly
   which files/functions may be touched.
5. Implementation.
6. Verification (lint, full test suite, focused tests, emulator).

No step in this chain may be skipped or collapsed. **This document
does not itself perform the Rule 8 Assessment** — that remains a
separate, subsequent, not-yet-created action.

---

## 12. Product Architect Decision Record

**Status:** ✅ **ACCEPTED AS GOVERNANCE DECISION — NOT IMPLEMENTATION
AUTHORIZATION.**

**Decision:**
**Option B — Consequential-operation boundary.**

**Clarification:**
**Option C — Fresh-read boundary** is accepted only as a candidate
mechanism to be evaluated per consequential operation during the Rule
8 Assessment. It is not mandated universally by this acceptance, and
no other option (A or D) was selected.

**Governance effect:**
Consequential operations — those whose outcome materially affects
financial calculations, permanent historical records,
integrity-sensitive writes, authorization/recovery decisions, or
business-period locking/gating (§5, §9) — may not rely on failed or
unconfirmed listener-derived state as authoritative evidence that the
underlying dataset is empty, absent, or safe to proceed against. The
specific protection mechanism for each affected operation (§9) is
deferred to the Rule 8 Assessment named in §11, which will evaluate
Option C (fresh-read) and any other narrowly-scoped mechanism against
each operation's own correctness, performance, and complexity
tradeoffs, per §7's own analysis.

**Implementation status:**
**NOT AUTHORIZED.** No code, test, Firestore rule, or index has been
written, modified, or authorized by this acceptance.

**Next governance gate:**
Rule 8 Assessment (separate, not-yet-created document).

**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 3 September 2026
**Signature:** SABUSHIMIKE MASCENI

This signature accepts Decision 43 as recorded above, in full,
including its explicit non-goals (§6) and its accepted direction's own
scope limits (this section). It does not itself constitute a Rule 8
Assessment, an Implementation Plan, or a Stage 8 Implementation
Authorization — all three remain separate, subsequent, not-yet-created
gates, per §11.
