Specification Amendment — Decision Recorded

# Decision 41 — Data Protection Hardening: Business-Switch Flush, Initial Stock Parity, Autosave Failure Classification, Draft-Listener Error Semantics, and Subscription-Blocked Contagem Accessibility
## (Amendment to `stock-count-data-loss-resilience-specification.md`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS A GOVERNANCE DECISION.**

This document records the Product Architect's acceptance of seven
findings and their associated governance decisions (A-G), produced
through a two-stage forensic investigation and a Governance Decision
Proposal, all completed prior to this signature. **This acceptance is
a governance decision only.** It does not itself constitute a Rule 8
Assessment or an Implementation Authorization — both remain separate,
subsequent gates, exactly as Decision 39 and Decision 40 each
required before any implementation began under this same
specification.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](./stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38 applied) → [Decision 39 amendment](./stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 40 amendment](./stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ Accepted and Authorized, implemented) → **this amendment
("Decision 41"), now accepted as a governance decision** → Rule 8
Assessment (not yet drafted; this document is the prerequisite gate
for it) → Implementation Plan → Implementation Authorization.

**Baseline:** `main = origin/main = 80ecd2d98b3bda4ca1287697a4809b06091bb30c`,
confirmed clean (`git status --porcelain` empty) immediately before
drafting this decision record. This baseline post-dates Decision 40
and also includes one unrelated, already-completed hardening fix from
this same session (surfacing a previously-silent Firestore
persistent-local-cache initialization failure in `lib/firebase.ts`,
committed separately and outside this Decision's own scope) — noted
here for an accurate baseline record, not as part of what this
Decision authorizes or covers.

**Numbering:** the parent Specification's own `Decision N` sequence
has Decision 40 (Validated Row Workflow) as its highest accepted
decision — confirmed by direct inspection of
`docs/specs/stock-count-data-loss-resilience-decision-40-amendment.md`
(✅ Accepted and Authorized, 29 August 2026) and by a repository-wide
search confirming no file references a "Decision 41" or higher prior
to this document. This is recorded as **Decision 41**, the next
collision-free number in that same sequence.

**Source:** two completed, read-only forensic investigations —
*"SABUSH BPT — System-Wide Data Safety Audit"* and *"SABUSH BPT — Data
Protection Hardening Forensic Audit"* — followed by a *"Data
Protection Hardening — Governance Decision Proposal"* synthesizing
both into the seven findings and decision options recorded below. No
code investigation was performed to produce this document; every
factual claim traces to those three prior documents.

---

## 1. Product Architect Principle for This Increment

> "Business data must be protected at all cost."

Interpreted, per explicit Product Architect instruction, as: the
application must not knowingly contain ordinary, silent
application-level paths that can cause user-entered business data to
be lost, discarded, overwritten, or made inaccessible without an
explicit and understandable user action or an explicitly documented
irreversible business operation. This is **not** a requirement for
impossible guarantees against hardware, operating-system, browser, or
infrastructure failure — the objective is eliminating known ordinary
application-level data-loss doors, consistent with how Decisions
38-40 already scoped their own equivalent commitments.

---

## 2. Accepted Decisions

### Decision 41A — Business-Switch Protection (Periodic Contagem + Initial Stock Count)

**ACCEPTED, hybrid approach:**

- **Primary:** flush pending Contagem work, using the existing
  persistence mechanism, before a business switch proceeds.
- **Fallback:** if the flush cannot be successfully completed, the
  application must not silently discard the pending work — the
  operator must be explicitly informed and given an understandable
  choice regarding the failed switch/data state.

Ordinary successful path: pending work → flush via existing
persistence mechanism → successful persistence → business switch
proceeds. The rejected failure path (cancel timers → reset working
state → switch business → silently lose data) must not remain the
behavior when a flush fails.

Applies to both Periodic Contagem and Initial Stock Count. The
implementation (when later authorized) must preserve existing write
serialization (`draftInFlightSaveRef`/`flushInFlightSaveRef`-equivalent
discipline already established by Decision 39) and must not introduce
stale/out-of-order writes. Does **not** authorize redesigning
ShopSwitcher, Contagem, Firestore persistence, or the draft
architecture.

### Decision 41B — Initial Stock Count Navigation/Unmount Protection

**ACCEPTED.** Initial Stock Count must receive protection equivalent
in effect to Periodic Contagem's existing unmount-triggered flush
(established under Decision 39's in-app navigation durability work).
When Initial Stock Count is unmounted through ordinary in-app
navigation, pending Contagem work must not be silently discarded. The
existing Initial Stock Count draft persistence mechanism
(`saveInitialStockDraft`) is to be reused, not replaced. Periodic
Contagem's existing unmount behavior is the reference behavior. Does
**not** authorize redesigning Initial Stock Count's draft
architecture.

### Decision 41C — Failed Autosave Recovery

**ACCEPTED, hybrid approach:**

1. Automatically retry transient autosave failures using a bounded
   retry/backoff strategy.
2. If automatic retries are exhausted, maintain a persistent, clearly
   visible failure state.
3. Provide an explicit manual retry/recovery action.
4. Keep the failure visible until the data is successfully persisted
   or the operator explicitly takes an understandable action
   concerning it.

**Critical rule, binding on the eventual specification:** the retry
mechanism must not blindly retry legitimate authorization/business-rule
rejections indefinitely — a Firestore rule rejection caused by a
legitimate restriction (e.g. a subscription block) is not equivalent
to a transient network failure. The specification produced under this
Decision must define a failure classification — **transient/retryable**
versus **legitimate/non-retryable** versus **unknown/requires user
attention** — before implementation. Where the application cannot
safely distinguish a failure's category, it must fail safely rather
than repeatedly retrying an operation that may legitimately be
forbidden. The operator must never be presented with an ambiguous
"saved" state when the application knows persistence failed. Does
**not** authorize a generalized offline-sync architecture.

### Decision 41D — Draft-Listener Error Distinction

**ACCEPTED.** The application must represent at least four distinct
draft-existence states: loading, confirmed no draft, draft exists,
and draft-load error. For Owner sessions, an unexpected Firestore
listener error must never be represented as though Firestore
confirmed that no draft exists. The existing staff-denial behavior —
an intentional and valid access-control result, structurally distinct
from an unexpected Owner-session listener failure — must remain
unchanged. This Decision does **not** authorize weakening Firestore
rules, staff restrictions, Owner authorization, or tenant isolation in
any way; it concerns client-side error-state semantics only.

### Decision 41E — Subscription-Blocked Contagem Data Accessibility

**ACCEPTED, scoped to Periodic Contagem and Initial Stock Count
only** for this increment. Explicitly **not** extended, in this
increment, to Add Stock, Add Quebra, Add Expense, Add Withdrawal,
Declare Business Worth, or any other subscription-gated view.

Principle: blocking new business activity must not unnecessarily make
already-persisted Contagem data inaccessible. When a subscription is
blocked, an operator must still be able to access legitimate,
previously saved Contagem data for viewing, recovery, or export where
the existing product flow already supports such access. A blocked
subscription must not gain any ability to create, modify, or finalize
new business records merely because the operator is viewing or
recovering existing data. Existing subscription enforcement
(client-side `subscriptionBlocksNewRecords` and the corresponding
`firestore.rules` gate) remains fully intact and unweakened. No
incidental autosave/write may occur merely because an existing draft
is being viewed or recovered while blocked.

**Incident boundary, restated:** subscription status is not
considered the cause of the data-loss incident that originally
prompted this investigation — all current users remain in trial. This
Decision is preventive hardening against a future accessibility
problem, and against its documented possible interaction with the
failed-autosave path (Decision 41C), not a response to an already-
observed subscription-triggered loss.

### Decision 41F — Browser Teardown Verification

**ACCEPTED AS A RECORDED OPEN RISK, NOT AN IMPLEMENTATION CHANGE.**
The current `pagehide`/`visibilitychange` protection (Decision 38/39)
remains in place, unmodified and unreplaced by this Decision. Whether
the underlying Firestore write reliably completes during actual
browser/OS teardown remains **NOT PROVEN** — the forensic
investigation's own attempt at emulator-based runtime validation was
blocked by this environment's network allowlist (`storage.googleapis.com`
not permitted), a limitation of the investigation environment, not a
finding about the mechanism itself. Future validation requires an
appropriate runtime/real-device environment. This open question does
**not** block implementation of Decisions 41A-41E.

### Decision 41G — Same-Row Concurrent Editing

**ACCEPTED AS A DOCUMENTED, NON-BLOCKING FUTURE CONCERN.** Current
last-write-wins behavior for two devices editing the identical
Contagem row concurrently is acknowledged and recorded. No
collaborative editing, conflict-resolution, versioning, or
multi-device synchronization architecture is authorized by this
Decision. This remains recorded for a future, separate product/
governance decision and does not expand this increment's scope.

---

## 3. Approved Scope

**P0 (deterministic data-loss prevention):**
- 41A — Business-switch protection (Periodic + Initial)
- 41B — Initial Stock Count navigation/unmount protection
- 41C — Failed autosave hybrid recovery

**P1 (data-inaccessibility prevention):**
- 41D — Draft-listener error distinction
- 41E — Subscription-blocked Contagem accessibility

**Recorded, not implementation scope:**
- 41F — Browser teardown runtime verification (future validation only)
- 41G — Same-row concurrent editing (future product decision only)

---

## 4. Explicit Non-Goals

This Decision does **not** authorize:

- redesigning Contagem, ShopSwitcher, or the draft architecture of
  either Periodic Contagem or Initial Stock Count
- replacing Firestore or Firebase's persistence layer
- a generalized offline-first architecture
- collaborative/concurrent editing, conflict resolution, or
  versioning (see 41G)
- product catalog redesign
- any change to subscription pricing or subscription policy itself
- weakening subscription enforcement, Firestore rules, staff
  restrictions, or tenant isolation in any respect
- any change to Business Worth, Dashboard, finalized `StockCount`
  records, or timeline/audit semantics
- extending the Decision 41E accessibility principle to any module
  outside Periodic Contagem and Initial Stock Count in this increment
- solving every possible browser/OS/hardware failure mode

Nothing in this Decision reopens or modifies Decisions 38, 39, or 40
— all mechanisms those decisions established (per-row draft
documents, 800ms autosave debounce, live-state-aware save behavior,
serialized draft writes, the interruption flush, the resume-draft
mechanism, stale-draft/remote-update awareness, atomic finalization,
idempotent submission, immutable timeline/audit behavior) are
preserved exactly as they exist today and are extended, not replaced,
by 41A/41B.

---

## 5. What This Decision Does Not Change

Restated explicitly, mirroring Decision 39/40's own precedent for
this section: no Firestore document shape, no `firestore.rules`
clause, no finalization/`recordStockCount` behavior, no timeline/audit
mechanism, and no existing Decision 38/39/40 mechanism is altered by
this Decision itself. This document authorizes no code change of any
kind.

---

## 6. Next Governance Step

Upon this signature: Rule 8 Assessment (covering 41A-41E; 41F/41G are
explicitly non-blocking and do not require Rule 8 clearance to leave
this document in their current "recorded, not implementation scope"
state), then an Implementation Plan, then a signed Implementation
Authorization — no code is written before that full chain, per this
project's standing discipline and per Decision 39/40's own identical
precedent. Two sub-decisions require further Product Architect input
before Rule 8 can fully clear them, per the Governance Decision
Proposal's own §14: 41C's precise transient/non-retryable failure
classification, and 41E's confirmation that no incidental write path
exists in the current resume/view code before that decision is
finalized as READY.

---

## 7. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS A GOVERNANCE DECISION.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED (governance decision stage only)
**Date:** 2 September 2026

This signature accepts Decision 41 (41A through 41G) as recorded
above, in full, including the approved scope (§3) and explicit
non-goals (§4). This signature does **not** constitute a Specification
Amendment in force, a Rule 8 Assessment, an Implementation Plan, or an
Implementation Authorization. No implementation may begin until the
full remaining chain (Rule 8 Assessment → Implementation Plan →
Implementation Authorization) is completed, per this project's
standing discipline. Next governance gate: Rule 8 Assessment.
