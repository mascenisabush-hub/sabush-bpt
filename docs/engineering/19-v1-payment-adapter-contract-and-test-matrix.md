# Module #19 (Subscriptions) — Payment Adapter Contract & Test Matrix (Prep)

**Type:** Preparation record — an interface-level contract and a test
matrix, produced so implementation can move quickly once PaySuite's
actual capabilities are verified. **Not an Implementation
Authorization.** Not a Rule 8 Assessment. Contains **no PaySuite-
specific technical detail** — every field below is a placeholder,
explicitly marked, pending real verification evidence.
**No code changes were made to produce this document**, per explicit
instruction — this is architecture-level preparation only.

---

## 1. The Contract — What the Adapter Must Do, Independent of Any Vendor

```
PaySuite webhook (or any future processor's webhook)
       │
       ▼
  1. Authenticate  ── verify the request actually came from the processor
       │
       ▼
  2. Validate event ── confirm the payload is a recognized, well-formed event
       │
       ▼
  3. Deduplicate   ── has this exact event already been processed?
       │
       ▼
  4. Translate     ── processor payload -> SubscriptionLifecycleEvent
       │
       ▼
  5. applyLifecycleEvent(businessId, event)  ◄── already built, tested, unchanged
       │
       ▼
  6. Respond       ── acknowledge to the processor (per its own retry semantics)
```

**Steps 1–4 and 6 are the Adapter's entire job.** Step 5 is the
existing, already-authorized `server/subscriptionEngine.ts` — this
contract's most important property is that **the Adapter does not
reach into or modify the Engine in any way.** It only ever calls
`applyLifecycleEvent()` with a correctly-shaped
`SubscriptionLifecycleEvent`.

### Step-by-step contract, in interface terms (not code)

**1. Authenticate**
- Input: the raw request (headers + body) from the processor.
- Output: pass / reject.
- Must reject before any business logic runs — an unauthenticated
  request must never reach step 2.
- **Placeholder, pending verification:** exact header name, signature
  algorithm (HMAC-SHA256 was seen in one unverified PaySuite doc source
  this session, not confirmed), secret provisioning mechanism.

**2. Validate event**
- Input: the authenticated payload.
- Output: a recognized event type, or reject as "unknown event."
- **An unknown/malformed event must be rejected safely — logged, not
  crashed on, and never passed to step 4 with a guessed shape.**
- **Placeholder, pending verification:** the processor's actual event
  taxonomy (event names for payment success and reversal specifically
  — neither confirmed to exist in PaySuite's public documentation as
  of this session's research).

**3. Deduplicate**
- Input: a validated event, plus whatever unique identifier the
  processor's payload carries.
- Output: proceed, or short-circuit as already-processed.
- **This is a genuinely separate concern from `applyLifecycleEvent()`'s
  own idempotency.** The Engine's idempotency (re-read status inside a
  transaction before writing) protects against a *duplicate event
  producing a wrong state transition*. Adapter-level deduplication
  protects against *doing redundant work at all* (re-authenticating,
  re-validating, re-translating, potentially re-triggering side
  effects like a second acknowledgment) — belt-and-suspenders, not
  redundant.
- **Placeholder, pending verification:** does the processor supply a
  stable, unique event/transaction ID at all? (Question 5 of the
  verification checklist.) If not, deduplication may need to fall back
  to a content hash or a narrower time-window heuristic — a real
  design decision that depends entirely on the verification answer.

**4. Translate**
- Input: a validated, deduplicated processor-specific payload.
- Output: exactly one `SubscriptionLifecycleEvent` —
  `{ type: 'payment_success' | 'payment_reversal', occurredAt: <ISO
  string> }` — the same shape `server/subscriptionEngine.ts` already
  defines and expects, unchanged.
- **This is the only place any processor-specific knowledge is allowed
  to exist in the entire system.** If a future engineering pass finds
  processor-specific logic anywhere outside this one translation step,
  that is a boundary violation, not an optimization.
- **Open design question, not yet resolved (flagged, not answered
  here):** if PaySuite has no distinct "subscription cycle payment"
  concept (a real possibility per this session's research — see the
  Completion Review's own finding that PaySuite's verified docs show
  only one-time payment links), this translation step is also where
  the **`active` + repeat-payment question** gets resolved — by
  inspecting the current subscription's own status alongside the
  incoming payment, not by anything the processor tells you directly.
  This remains explicitly unresolved pending the verification evidence
  table (§3, below).

**5. `applyLifecycleEvent(businessId, event)`**
- Already built. Already tested. Not touched by this document, and
  must not be touched by the eventual Adapter implementation either,
  per the Implementation Authorization's own §4 scope-discipline
  clause.

**6. Respond**
- Whatever acknowledgment shape the processor's own retry semantics
  require (per its documentation) — a placeholder pending verification,
  since an incorrect or missing acknowledgment could cause the
  processor to retry indefinitely or, worse, give up silently.

---

## 2. What Remains Explicitly Unresolved

Every one of these requires real PaySuite evidence, not engineering
judgment, per this session's own established discipline of returning
genuine gaps to Product Architecture rather than guessing:

1. Exact authentication/signature mechanism (header name, algorithm,
   secret rotation).
2. Exact event type names for payment success and reversal.
3. Exact payload shape for each event type (which fields exist, which
   are guaranteed present vs. optional).
4. Whether a stable unique event ID exists for deduplication.
5. Whether PaySuite's model is recurring/subscription-aware or
   one-off-payment-only — this single answer determines whether the
   `active` + repeat-payment question (Completion Review's own finding)
   needs new Engine behavior or is already correctly a no-op.
6. Expected acknowledgment/response shape and retry behavior.
7. Sandbox/test environment availability and how to exercise it.
8. Fee/settlement details (secondary — informs pricing math, not the
   technical contract).

---

## 3. Adapter Test Matrix (Documented, Not Implemented)

Every row below is derivable **today**, without any PaySuite evidence,
because it tests the Adapter's own logic (steps 1–4, 6) against the
already-known, already-tested Engine behavior — the PaySuite-specific
fields (exact header names, exact payloads) are placeholders to fill in
once verified, not blockers to writing the test *shapes* now.

| # | Incoming event (Adapter-level) | Expected outcome | Exercises |
|---|---|---|---|
| 1 | Valid signature, successful-payment event, business currently `trial_completed` | `trial_completed → active` | Full pipeline → Engine transition 1 |
| 2 | Valid signature, successful-payment event, business currently `grace_period` | `grace_period → active` | Full pipeline → Engine transition 4 |
| 3 | Valid signature, successful-payment event, business currently `expired` | `expired → active` (Recovery) | Full pipeline → Engine transition 7 |
| 4 | Valid signature, reversal event, business currently `active` | `active → grace_period` | Full pipeline → Engine transition 2 |
| 5 | Valid signature, reversal event, business currently `grace_period` | Remains `grace_period`, deadline unchanged | Full pipeline → Engine transition 3 |
| 6 | Valid signature, reversal event, business currently `expired` | Remains `expired`, no automatic effect | Full pipeline → Engine transition 6 |
| 7 | The exact same event delivered twice (processor retry) | Only one transition applied; second is a safe no-op | Adapter dedup (step 3) **and** Engine idempotency (step 5) — both layers, tested independently |
| 8 | **Invalid signature** | Rejected before any business logic runs; no Engine call made at all | Adapter step 1 only |
| 9 | **Valid signature, unrecognized event type** | Rejected safely, logged; no Engine call made | Adapter step 2 only |
| 10 | **Valid signature, malformed/incomplete payload** | Rejected safely, logged; no Engine call made | Adapter step 2 only |
| 11 | Valid event, but for a `businessId` with no existing subscription document | Safe no-op (Engine already handles this — confirmed by an existing test) | Full pipeline → Engine's own nonexistent-business handling |
| 12 | Two valid events for two different businesses in the same request batch (if the processor ever batches) | Each business's own state changes independently; no cross-tenant leakage | Full pipeline → Engine's own tenant isolation (already tested) |
| 13 | Event with `occurredAt` earlier than the subscription's current `updatedAt` (out-of-order delivery) | Engine still produces the correct state per its own current-status check, not per event ordering | Full pipeline → Engine's own out-of-order handling (already tested at the Engine layer; row exists here to confirm the Adapter doesn't reorder or drop it first) |

**Rows 1–7 and 11–13 exercise behavior the Engine has already proven**
(27/27 existing tests) — at the Adapter layer, they exist to prove the
*translation* is correct, not to re-prove the Engine's own logic.
**Rows 8–10 are pure Adapter-layer tests** with no Engine involvement
at all — these can be written and passed **before** PaySuite's real
payload shape is known, using any well-formed fake signature/payload,
since they test rejection paths that don't depend on PaySuite's
specifics.

---

## Stop Boundary

No code was written to produce this document. No test file, adapter
file, or webhook route exists as a result of this session. This is
preparation only — the contract and matrix above are meant to make the
eventual, separately-authorized implementation fast once real PaySuite
evidence exists, not to pre-authorize any part of it.
