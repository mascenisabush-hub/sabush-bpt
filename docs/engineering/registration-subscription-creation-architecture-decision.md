# Registration & Subscription Creation — Architecture Decision Record

**Type:** Engineering Decision Record. Not a Business Domain
Specification, not a replacement for Architecture — a durable record of
an architecture decision made in the course of Module #19 readiness
work, so it doesn't live only in conversation history.
**Status:** Approved.
**Lifecycle status:** Designed → Accepted → **Approved** (architecture
decision only). Not Implemented, not Executed, not Analyzed — no
engineering work is authorized by this record.
**Basis:** [Architecture §4.1](../architecture/04-system-architecture.md)
(no Cloud Functions / no Blaze plan constraint), [Architecture §4.8](../architecture/04-system-architecture.md)
(Background Worker design — second lightweight process on the same
Railway project), [Module #19 Implementation Readiness Assessment](./19-subscriptions-implementation-readiness.md)
(identified the Registration write-path as a risk, not caused by it),
and the Registration & Subscription Creation Architecture Assessment
produced this session (options comparison, superseded in full by the
decision recorded here — not repeated in duplicate).
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this document.**

---

## 1. Objective

Decide how Registration (and the parallel `addShop` second/third-shop
creation path) becomes reliable once Module #19 adds trial-subscription
creation as a required write — and record that decision so it survives
independently of this conversation.

## 2. Background

Module #19 (Subscriptions) Business Rule 4 requires that no Business
ever exist without a subscription document ("no null subscription
states, ever"). Readiness analysis for #19 found that Registration
today is not equipped to add a fourth required write safely: it is
already a non-atomic, three-step, client-side sequence with no
rollback. This was flagged as a pre-existing condition that #19's
implementation would make worse, not one #19 introduced — which is why
this decision is recorded on its own, separate from the #19 BDS itself.

## 3. Existing Architecture References

- **Architecture §4.1** — establishes, as a real and current operating
  constraint (not a technical limitation to casually override), that
  the system does not depend on Firebase Cloud Functions or the Blaze
  billing plan.
- **Architecture §4.8** — designs background/scheduled processing as a
  second lightweight process on the same Railway project as the
  existing privileged server, reading via `firebase-admin`, running on
  a fixed interval, with per-job dedupe keys for idempotency. Confirmed
  **Designed, not Implemented** — `package.json` runs exactly one
  process today.
- **[Module #19 Implementation Readiness Assessment](./19-subscriptions-implementation-readiness.md)**
  — first identified Registration's non-atomic write path as a risk
  Module #19's implementation would inherit, not resolve.

## 4. Problem Statement

`AuthView.tsx` has two registration entry points (email/password and
Google Sign-In), each performing the same uncoordinated sequence:

```
createUserWithEmailAndPassword (Firebase Auth)
        ↓
setDoc(users/{uid})        — Firestore, client SDK
        ↓
setDoc(businesses/{id})    — Firestore, client SDK
```

Each step has its own try/catch and its own error message, but there is
no rollback and no atomicity across the sequence. A failure after step
2 leaves an orphaned Auth account and user profile with no business
document, today, independent of Module #19. Adding a fourth write
(`subscriptions/{businessId}`) onto this sequence as-is would extend
this gap rather than close it.

**The key constraint:** Firebase Authentication account creation is not
part of Firestore and cannot be included in a Firestore transaction or
batched write. No amount of client-side Firestore batching can make the
full Auth-plus-Firestore sequence atomic on its own.

## 5. Options Considered

### Option 1 — Current sequential client writes, extended with a 4th step
No change to today's pattern; the subscription write is added as a
fifth uncoordinated step (fourth Firestore write). No rollback, no
reconciliation. **Rejected** — directly conflicts with Business Rule 4.

### Option 2a — Firebase Callable Cloud Function
Would move orchestration server-side via a Callable Function. **Rejected**
— requires Cloud Functions, which requires the Blaze plan, which
Architecture §4.1 establishes as a real constraint the system does not
depend on. Not viable without separately revisiting that constraint,
which is out of scope here.

### Option 2b — Existing Railway server orchestration
A new endpoint on the existing Express/Railway server (using
`firebase-admin`) performs Auth user creation, `users` doc, `businesses`
doc, and `subscriptions` doc in one server-side request, with
compensating rollback on failure. Matches the "one privileged server"
pattern §4.1 already establishes and the pattern already proven in
production by the five `/api/staff/*` endpoints. **Accepted** — as a
component of Option 5, below.

### Option 3 — Firestore transaction / batched write only
`runTransaction()`/`writeBatch()` can make the Firestore-side writes
(`users` + `businesses` + `subscriptions`) atomic relative to each
other, but cannot include Auth account creation. **Useful component,
insufficient alone** — does not close the Auth/Firestore boundary gap
by itself. Adopted as a technique used inside Option 5's server-side
orchestration, not as a standalone answer.

### Option 4 — Event-driven creation
A Firestore `onCreate` trigger would require Cloud Functions (ruled out
by §4.1). A non-trigger variant — the Background Worker polling for
`businesses` docs with no matching `subscriptions` doc — is technically
possible but introduces a latency window (up to one worker interval)
during which Business Rule 4's "never" is technically violated if used
as the *primary* mechanism. **Rejected as primary mechanism** — retained
only as the reconciliation role described in Option 5.

### Option 5 — Hybrid: server orchestration + Background Worker reconciliation
The primary path is a single server-side request (Option 2b) performing
Auth creation and an atomic Firestore batch/transaction (Option 3) for
`users` + `businesses` + `subscriptions`, with compensating rollback on
failure. The Background Worker (§4.8, already designed, not yet built)
separately runs a periodic reconciliation sweep for any `businesses` doc
still missing a `subscriptions` doc, as a genuine safety net — not the
primary mechanism. This reuses the staged partial-failure pattern
already shipped in production for the `/api/staff/*` endpoints
(authorize → mutate → isolate non-critical downstream failure, report
`partialFailure` rather than a misleading `500`). **Approved
architecture.**

## 6. Product Architecture Decision

**Approved.** Registration and equivalent multi-resource onboarding
operations are orchestrated as follows:

- The existing privileged Railway server owns the business transaction:
  create Auth user → create business → create user profile → create
  initial subscription → commit, or compensate on failure.
- The Background Worker (§4.8) owns reconciliation, repair, expiry, and
  scheduled maintenance — never the primary creation path.

This decision requires no new infrastructure category and no new
billing plan. It closes the Auth/Firestore atomicity gap that Options
1, 3, and 4 each leave partially open, without requiring the Cloud
Functions / Blaze dependency that Options 2a and the pure-trigger
variant of Option 4 would require.

## 7. Registration Architecture Principle

**The Worker must never become part of the happy path.** Its
responsibility is reconciliation, repair, expiry, cleanup, and scheduled
maintenance — never a required synchronous step in user registration.
The user receives a completed registration response before the Worker
is ever involved. The Worker exists because distributed systems
occasionally fail in ways that immediate rollback cannot fully resolve
— not as a substitute for the server doing its own job correctly.

## 8. Responsibilities

**Server (existing privileged Railway server):**
- Create the Auth user.
- Create the business document.
- Create the user profile document.
- Create the initial subscription document.
- Commit all of the above, or compensate (e.g., roll back the created
  Auth user) if a later step fails.

**Background Worker (Architecture §4.8, designed, not yet built):**
- Reconciliation — detect any business document missing a matching
  subscription document and repair it.
- Repair — general-purpose recovery for exceptional cases the server's
  own compensation could not fully resolve.
- Expiry — trial/renewal status transitions (Module #19, §19.4).
- Scheduled processing — any other periodic, idempotent maintenance
  job, per §4.8's existing per-job dedupe-key design.

## 9. What This Decision Does Not Decide

- The exact rollback mechanics inside the server endpoint (e.g.,
  whether an Auth-user-created-but-Firestore-failed case triggers
  immediate Auth-user deletion, is flagged for the Worker to also catch,
  or both) — an implementation-planning detail, not decided here.
- The Worker's exact poll interval — an infrastructure-tuning parameter,
  not a Product decision, and not fixed by this record.
- Trial duration or any other Module #19 business parameter — remains
  the one open Product/Business decision blocking Phase 1 Implementation
  Planning, tracked separately.
- Any change to `docs/architecture/*` — this record does not edit
  Architecture §4.1 or §4.8; it applies their existing, unmodified
  decisions to the Registration problem specifically.
- Background Worker ownership as a question — this record explicitly
  closes that question (see §3, above): it is already decided by
  Architecture §4.1/§4.8, and remaining work on it is implementation
  only.

## 10. Future Work

- Building the Background Worker itself (§4.8) — Designed, not yet
  Implemented; not authorized by this record.
- Building the server-side registration orchestration endpoint — not
  authorized by this record; requires its own Rule 8 affected-
  files/plan/risks review at the point implementation is assigned.
- Applying this same pattern to `addShop` (the second/third-Business
  creation entry point in `AppContext.tsx`), which has an equivalent,
  though smaller, version of the same atomicity gap.
- Extending this pattern to any future onboarding-adjacent feature that
  spans Authentication, Firestore, and additional domain resources (see
  Reusable Pattern, below).

## 11. Status

**Approved.** This is an architecture decision only. No code has been
written, no `firestore.rules` change has been made, and no
`docs/specs/*` file has been modified. Implementation of either the
server orchestration endpoint or the Background Worker requires its own
separate, explicit authorization per Rule 8, at the point that work is
actually assigned.

---

## Reusable Pattern

This decision establishes the standard orchestration pattern for future
multi-resource onboarding operations throughout Sabush BPT. The pattern
— **server owns the transaction and its compensation; the Worker owns
reconciliation, repair, and expiry; the Worker is never in the happy
path** — is not Subscription-specific and should be reused wherever a
user action spans Authentication, Firestore, and additional domain
resources. This is the most durable outcome of this assessment: a
platform architecture answer, not a Module #19-only one.
