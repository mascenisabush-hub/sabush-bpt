Specification Amendment — Decision Recorded

# Decision 42 — Data Protection Hardening: Resolution of Decision 41's Rule 8 Ready-After-Decision Findings
## (Amendment to `stock-count-data-loss-resilience-specification.md`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION — NOT IMPLEMENTATION AUTHORIZATION.**

This document records the Product Architect's resolution of the two
findings the Rule 8 Assessment for Decision 41 marked READY AFTER
DECISION (41A and 41C). It does not itself constitute a Specification
Amendment in force beyond what it records here, does not update or
re-sign the Rule 8 Assessment document, and does not constitute an
Implementation Plan or an Implementation Authorization — all three
remain separate, subsequent gates.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](./stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39 amendment](./stock-count-data-loss-resilience-decision-39-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 40 amendment](./stock-count-data-loss-resilience-decision-40-amendment.md)
(✅ Accepted and Authorized, implemented) → [Decision 41 amendment](./stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted and Authorized as governance decision — SABUSHIMIKE
MASCENI, 2 September 2026) → [Rule 8 Assessment — Data Protection
Hardening (Decision 41)](../engineering/periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md)
(🟡 Draft/unsigned; 41A and 41C marked READY AFTER DECISION, 41B/41D/41E
marked READY) → **this amendment ("Decision 42"), now accepted**.

**Repository baseline:** `main = origin/main = 80ecd2d98b3bda4ca1287697a4809b06091bb30c`,
working tree otherwise clean apart from the two prior, still-uncommitted
governance documents this same chain already produced (the Decision 41
amendment and its Rule 8 Assessment). No application code implementing
any part of Decision 41 or Decision 42 exists yet at this baseline.

**Numbering:** the parent Specification's own `Decision N` sequence has
Decision 41 (Data Protection Hardening) as its highest accepted
decision, recorded at `stock-count-data-loss-resilience-decision-41-amendment.md`.
A repository-wide search confirms no file references a "Decision 42"
or higher prior to this document. This is recorded as **Decision 42**,
the next collision-free number in that same sequence.

**Source:** the Rule 8 Assessment for Decision 41 (§B, §D, §Q, §R of
that document), which identified 41A and 41C as READY AFTER DECISION
and stated precisely, without inventing a resolution itself, what each
open question was. This document answers those exact questions and no
others.

---

## 1. Decision 42 Purpose

To resolve the two Rule 8 READY-AFTER-DECISION findings from the
Decision 41 Rule 8 Assessment — 41A (Business-Switch Protection) and
41C (Failed Autosave Recovery) — so that assessment can subsequently
be finalized and the governance chain can proceed to an Implementation
Plan. This Decision does not authorize implementation of anything,
does not reopen Decisions 38, 39, or 40, and does not reopen 41B, 41D,
41E, 41F, or 41G, all of which remain exactly as Decision 41 and its
Rule 8 Assessment already left them.

---

## 2. Decision 42A — Business-Switch Protection: Architectural Direction

**ACCEPTED: Pre-switch flush via coordination** (the Rule 8
Assessment's "Approach 1"), not the reactive-effect-with-explicit-
businessId alternative ("Approach 2").

**The critical invariant, stated exactly as it must hold:** the old
business id must still be the active business id at the moment the
flush's persistence operation resolves its target Firestore path.

Therefore, binding on the eventual Implementation Plan:

- The flush must **not** be implemented by calling the existing flush
  function from inside the current `[activeBusinessId]` reactive reset
  effect, after `activeBusinessId` has already changed — this is the
  exact unsafe pattern the Rule 8 Assessment identified and this
  Decision explicitly forecloses.
- Old-business pending data must never be written using the new
  business's `activeBusinessId`.
- The reactive reset effect must not be relied upon as the primary
  persistence boundary for this protection.
- The business-switch operation must coordinate with the currently
  active Contagem view **before** the switch is actually committed
  (before `switchShop()`'s own Firestore write, per the Rule 8
  Assessment's own tracing of that function).
- The existing persistence/serialization mechanisms established by
  Decisions 38–40 (per-row draft documents, write serialization refs,
  the interruption flush) remain the foundation this coordination is
  built on top of, not around.
- The coordination mechanism may introduce the minimum necessary
  communication surface between `ShopSwitcher` and the active Contagem
  view — its exact shape is an Implementation Plan decision, not fixed
  by this Decision.
- This applies identically to Periodic Stock Count and Initial Stock
  Count.
- If no pending work exists at the moment of a switch, the switch must
  proceed normally, without unnecessary persistence work.
- If pending work exists, persistence must be attempted before the
  switch proceeds.

**Required sequence, exactly:**

```
Old business pending data
  → flush while old business is still active
  → flush success / accepted recovery state
  → business switch
  → new business
```

**Explicitly forbidden sequence:**

```
Old business pending data
  → active business changes
  → flush resolves new business path
```

This Decision establishes architectural direction only. The
Implementation Plan must determine the exact coordination mechanism
and its full lifecycle behavior (e.g., what happens if the operator
triggers a second switch while a first switch's flush is still
resolving — flagged as not established by the Rule 8 Assessment and
not resolved by this Decision either).

---

## 3. Decision 42B — Business-Switch Failure Behavior

Decision 41A's accepted hybrid protection is preserved unchanged:

- If the pre-switch flush succeeds, the business switch proceeds.
- If the flush fails: pending work must not be silently discarded, the
  application must not silently continue as though the work were
  saved, an understandable operator-facing state must be surfaced, and
  an explicit, understandable choice must be offered — consistent with
  Decision 41A as originally accepted.

The exact UI wording and precise interaction are explicitly deferred
to the specification/Implementation Plan stage. No additional business
behavior is invented at this stage.

---

## 4. Decision 42C — Autosave Failure Classification: Subscription Case

**ACCEPTED:** a subscription-blocked draft write is classified as
**LEGITIMATE / NON-RETRYABLE**.

The application may use the existing, live, client-side
`subscriptionBlocksNewRecords` signal as the proactive classification
mechanism for this specific case — accepted because the Rule 8
Assessment confirmed this signal already mirrors
`firestore.rules`' own `subscriptionAllowsNewRecords()` exactly.

**Binding limits:** this client-side signal does not replace, and must
never be treated as replacing, Firestore security enforcement.
`firestore.rules` remains authoritative regardless of what the client
believes. A legitimate subscription rejection must never enter an
unbounded automatic retry loop.

---

## 5. Decision 42D — Firestore Readback Failure Classification

**ACCEPTED:** a failure of `getDocFromServer()` occurring after a
`setDoc()` call must be classified as **UNKNOWN / REQUIRES ATTENTION**,
not as a confirmed write failure.

**Reason, stated exactly:** a successful `setDoc()` followed by a
failed server readback does not prove the write itself failed —
treating it as a definite failure would misrepresent an uncertain
outcome as a certain one.

The future specification must preserve, as four distinct states:

1. WRITE CONFIRMED SUCCESS
2. TRANSIENT WRITE FAILURE
3. LEGITIMATE / NON-RETRYABLE REJECTION
4. UNKNOWN / REQUIRES ATTENTION

For the UNKNOWN state specifically, binding on the specification:

- Do not assume the write definitely failed.
- Do not claim the data is definitely persisted.
- Do not create an unbounded automatic retry loop.
- Keep the failure/recovery state visible to the operator.
- Provide an explicit recovery path, defined at the specification
  stage.
- Any retry behavior for this state must preserve existing write
  serialization and ordering guarantees (Decisions 38–40).

Exact UI wording and recovery interaction are deferred to the
specification stage.

---

## 6. Decision 42E — Transient Autosave Retry Policy

**ACCEPTED:** bounded automatic retry for clearly transient failures,
under the following policy:

- Maximum automatic retries: **3**, after the initial failed attempt
  (maximum 4 total attempts for one failed save operation).
- Retries must use increasing backoff, never an immediate tight loop.
- Exact delay values are deferred to the implementation-specification
  stage, provided they remain bounded and reasonable.
- Automatic retries must respect the existing in-flight write
  serialization established by Decisions 38–40; a retry must never
  bypass or create a competing write path around that serialization.
- A newer edit must never be overwritten by an older retry.
- Retry state must be cleared once the operation is confirmed
  successful.

After automatic retry exhaustion: the failure remains visibly
represented, pending work is never silently discarded, an explicit
manual retry/recovery action is provided, and the failure state
persists until successful recovery or explicit operator action —
consistent with Decision 41C as originally accepted.

---

## 7. Decision 42F — Non-Retryable / Unknown Failure Categories

The following are confirmed as never indefinitely retryable:

- subscription-blocked rejection (§4 above);
- authorization/ownership rejection;
- other clearly legitimate Firestore rule rejection;
- invalid request/data errors;
- unknown/requires-attention failures where success cannot be
  established (§5 above).

For unknown failures, the system must fail safely and surface the
condition rather than guessing. **The future specification must define
the precise classification table using the actual Firestore error
codes already observed in this codebase** (e.g., `permission-denied`
vs. `unavailable`, per the precedent the Rule 8 Assessment traced in
`AppContext.tsx`'s existing business-suspension detection) — this
Decision does not invent classifications for error codes not already
verified in the codebase, and none are invented here.

---

## 8. Decision 42G — No Security or Authorization Change

Decision 42 changes none of the following: `isOwnerOf()`, Owner/staff
authorization, `subscriptionAllowsNewRecords()`, Firestore security
rules, tenant boundaries, staff-denial behavior, or subscription
enforcement. No client-side classification introduced or referenced by
this Decision may be used as a security decision — client-side
classification (§4, §5) controls retry/recovery UX only. Firestore
remains the final authority in every case, exactly as Decision 41
already required.

---

## 9. Decision 42H — Scope

Decision 42 resolves only the two Rule 8 READY-AFTER-DECISION findings
identified for Decision 41: **41A** and **41C**. It does not reopen
41B, 41D, or 41E — all three remain exactly as the Rule 8 Assessment
already found them (READY). It does not reopen 41F (browser-teardown
verification, still an open, non-blocking recorded concern) or 41G
(same-row concurrent editing, still a documented, non-blocking future
concern) — neither is authorized for implementation by this Decision.
It does not reopen Decisions 38, 39, or 40.

---

## 10. Explicit Non-Goals

This Decision does **not** authorize:

- any application code change, of any kind;
- any test change;
- any Firestore rules or index change;
- an Implementation Plan;
- an Implementation Authorization;
- a specific coordination-mechanism design for 42A beyond the
  architectural direction stated (the exact mechanism is an
  Implementation Plan question);
- specific retry delay values beyond the bounded-count policy stated
  in §6 (exact backoff timings are an Implementation Plan/specification
  question);
- a specific error-code classification table beyond the categories and
  the one concrete example (subscription-block, §4) already resolved —
  the full table is deferred to the specification stage, per §7;
- any change to Decisions 38, 39, 40, or 41, or to 41B/41D/41E/41F/41G
  as the Rule 8 Assessment already left them.

---

## 11. Implementation Prohibition

This Decision is a governance decision only. No code, test, Firestore
rule, or index may be written, modified, or authorized on the basis of
this document. The Rule 8 Assessment for Decision 41 remains, as of
this document, in its existing draft/unsigned state — this Decision
supplies the resolution its own §R called for, but updating that
assessment's own verdicts to READY is a separate, subsequent step, not
performed by this document.

---

## 12. Decision 42I — Governance Status and Signature

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION — NOT
IMPLEMENTATION AUTHORIZATION.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED (governance decision stage only)
**Date:** 2 September 2026

This signature accepts Decision 42 (42A through 42H) as recorded
above, in full, including its explicit non-goals (§10) and
implementation prohibition (§11). No implementation may begin on the
basis of this document.

---

## 13. Next Governance Gate

```
Decision 42 (this document, accepted)
  → finalize/update the Rule 8 Assessment for Decision 41
    (41A and 41C's verdicts to be revised from READY AFTER DECISION
    to READY, on the basis of §2–§7 above; 41B/41D/41E unchanged)
  → Implementation Plan (covering 41A–41E)
  → Product Architect Acceptance
  → Stage 8 Implementation Authorization
  → Implementation
  → Verification
```

No gate in this sequence may be skipped or collapsed. This document
does not itself perform the Rule 8 Assessment update named as the
first step above — that remains a separate, subsequent action.
