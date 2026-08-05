# Module #20 (Notifications) — Phase 3 (Background Worker Scheduled Triggers) Implementation Authorization

**Type:** Governance bridge document — the formal record that engineering
governance is complete and Phase 3 is authorized to begin. Follows the
pattern established by
[Phase 1](./20-phase1-implementation-authorization.md) and
[Phase 2](./20-phase2-implementation-authorization.md)'s Authorization
records.
**Status:** 🟡 Proposed, pending Product Architect signature. Not
Authorized. No engineering work may begin against this document until
§5 is signed.
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) (v1.2,
Accepted), [ADR-0002](../adr/ADR-0002-platform-background-worker.md),
[ADR-0003](../adr/ADR-0003-background-worker-job-registration.md),
[ADR-0004](../adr/ADR-0004-notification-platform-architecture.md)
(all ✅ Accepted), [BDR-0005](../specs/20-bdr-0005-notification-language-resolution-policy.md),
[BDR-0006](../specs/20-bdr-0006-notification-communication-policy.md),
[BDR-0007](../specs/20-bdr-0007-businessevent-creation-policy.md)
(all ✅ Accepted), [`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9 (Planned; two documentation-synchronization items outstanding
relative to BDR-0007, tracked as non-blocking per the Rule 8
Assessment v2 §13.2 — not a precondition of this Authorization),
[**Phase 3 Rule 8 Assessment v2**](./20-phase3-rule8-assessment-v2.md)
(Assessed — **Governance Readiness: Ready**, §13.1).
**Repository state at drafting:** `main` HEAD `2842c74`, plus two
locally-created, not-yet-pushed documents this Authorization depends
on: BDR-0007 (Accepted) and the Phase 3 Rule 8 Assessment v2 (Ready).
Both must be committed and pushed to `main` before or alongside this
document, so that `main` reflects a self-consistent governance chain
at the moment this Authorization takes effect — not before.

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `20-notifications.md`, any ADR, or any BDR to
produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

**Business Decision → Policy → Architecture → Implementation Plan →
Rule 8 → Authorization (this document) → Implementation → Close-out**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `20-notifications.md` v1.2 | ✅ Accepted |
| Architecture | ADR-0002, ADR-0003, ADR-0004 | ✅ Accepted |
| Business Decision (communication policy) | BDR-0005, BDR-0006 | ✅ Accepted |
| Business Decision (event creation policy) | **BDR-0007** | ✅ Accepted |
| Implementation Plan | `20-notifications-implementation-plan.md` §9 | ✅ Planned (two non-blocking documentation-sync items outstanding, §13.2 of the Rule 8 Assessment v2) |
| Rule 8 | `20-phase3-rule8-assessment-v2.md` | ✅ Assessed — **Governance Readiness: Ready** |
| **Authorization** | **This document** | 🟡 Proposed, pending signature |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

This chain supersedes the original `20-phase3-rule8-assessment.md`
(Not Ready), which is not deleted or edited, but is no longer the
governing readiness record for this phase — the Rule 8 Assessment v2
is, per its own explicit "Relationship to the original assessment"
section.

---

## 2. What Is Authorized

**Only Phase 3 — Background Worker Scheduled Triggers**, exactly as
scoped by the Implementation Plan §9 and BDR-0007's six defined
`eventType`s, no broader:

**BusinessEvent producers (BDR-0007 §4, §5):**
- `closing.approaching`, `closing.due`, `closing.overdue` — producer
  `closing-integrity`
- `inventory.risk.breakage` — producer `breakage-tracking`
  (illustrative identifier per BDR-0007's own caveat; the real producer
  identifier is engineering's to finalize at implementation time, not
  a re-opened governance question)
- `trial.ending_soon`, `trial.ending_tomorrow` — producer `trial-engine`

**Foundational platform mechanisms this phase builds for the first
time (ADR-0002/0003/0004, none of which is a re-opened design
question — each is fully specified, only unbuilt):**
- The `registerJob({ jobType, schedule, execute, dedupeKeyFn,
  retryPolicy })` interface (ADR-0003), and migration of
  `runTrialLifecycleSweep()` onto it as the first registered job, per
  the Implementation Plan's "Legacy Compatibility" decision (§6a).
- The dedupe/watermark mechanism (Architecture §4.8.1) — a
  `platform_worker_state` collection or equivalent, using either of
  Architecture §4.8.1's two named candidate shapes; the choice between
  them is an engineering decision, not a Product Architect one (per
  the Remaining Product Decisions Review §2.4).
- A `BusinessEvent` type/contract (ADR-0004 Decision 1) and a
  Notification Platform evaluation step that applies BDR-0006's
  communication policy and BDR-0005's language resolution before any
  `notifications` document is written (ADR-0004 Decisions 4–5).
- Any new Firestore composite/collection-group indexes required to
  detect Closing and Breakage events across per-business
  subcollections.

**Expected runtime files** (per Rule 8 Assessment v2 §11 — an
inventory for scoping purposes, not itself an exhaustive contract):
`server/index.ts`, possibly a new `server/backgroundWorker.ts` or
equivalent module, `firestore.indexes.json`, possibly new type
definitions for `BusinessEvent` in `src/types.ts` or a server-only type
file, and the new `platform_worker_state` collection.

---

## 3. What Is Not Authorized

- **Stock Counts inventory risk detection**, of any kind. BDR-0007
  §4.2 explicitly defers this — no `eventType` exists to build
  against. Its appearance in a Phase 3 diff would exceed both
  BDR-0007's and this Authorization's scope, regardless of how small
  it might appear to engineering.
- **Retrofitting Phase 2's five `/api/staff/*` endpoints** onto the
  `BusinessEvent` contract. The Implementation Plan's "Legacy
  Compatibility" section explicitly retains them as a supported
  direct-producer pattern; this Authorization does not reopen that.
- **Phase 4** (Tenant User Experience beyond the existing bell
  dropdown), **Phase 5** (Payment Webhook Creation Path), **Phase 6**
  (Email/WhatsApp/future channels). Not authorized by this document.
- **Any change to Phase 1/2's already-closed, already-shipped scope** —
  `NotificationContext`, `Header.tsx`, `DeliveryChannel`/`InAppChannel`,
  the five existing `/api/staff/*` call sites, `firestore.rules`'s
  `/notifications/{id}` block (Phase 3 adds server-side writers only,
  no new client read/write surface).
- **Re-deciding Decision Gates 1–4, any Business Rule in
  `20-notifications.md`, or any parameter already fixed by BDR-0005,
  BDR-0006, or BDR-0007.** Engineering builds against these as given;
  discovering a need to change one returns to Product Architecture
  (§4, below), it is not resolved in code.
- **The documentation-synchronization items themselves** (Implementation
  Plan §9's stale threshold/Stock-Counts wording, `README.md`,
  `HANDOFF.md`) are not part of this Authorization's runtime scope.
  They may be corrected as ordinary maintenance, per the Rule 8
  Assessment v2 §13.2/§13.3 step 6 — a separate, explicit, non-blocking
  step, not folded into an implementation commit's diff (Governance
  Standard, Principle 5).

Each later phase requires its own separate Authorization, following
this document's pattern, once its own Rule 8 Assessment is complete.

---

## 4. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3, and by
the Rule 8 Assessment v2's own §0 scope boundary. If, during Phase 3
implementation, engineering discovers that the approved scope is
insufficient, ambiguous, or requires a business-facing tradeoff not
already settled by BDR-0007, BDR-0006, BDR-0005, or the three ADRs —
**that finding returns to Product Architecture, not to engineering
judgment**, per the Governance Standard's Principle 1 and this
project's own established precedent (Phase 1 Authorization §4,
verbatim). This applies in particular to:

- Any detected need to define a Stock Counts risk model — returns to
  Product Architecture as a new BDR, not an in-flight addition.
- Any detected ambiguity in `breakage-tracking`'s producer identity
  beyond what BDR-0007 already flagged as illustrative — engineering
  may finalize the literal string, but may not use that latitude to
  change what triggers the event or what it communicates.
- Any case where the chosen dedupe/watermark shape (§2) turns out to
  have a business-visible consequence (e.g., a duplicate notification
  reaching an Owner) — this is a defect to fix within the authorized
  mechanism, not license to alter BDR-0006/BDR-0007's outcomes.

---

## 5. Signature

**Unsigned.** This section is a placeholder for the Product Architect's
explicit authorization and is intentionally left blank pending review.

> "I have reviewed: Module #20 Specification v1.2; ADR-0002/0003/0004;
> BDR-0005/0006/0007; the Implementation Plan; the Phase 3 Rule 8
> Assessment v2; and this Phase 3 Implementation Authorization
> (Proposed). I confirm that the governance process for Module #20
> Phase 3 has been completed satisfactorily. As Product Architect, I
> formally authorize Module #20 – Phase 3 (Background Worker Scheduled
> Triggers) implementation, scoped exactly as described in §2 of this
> document."

**Date:** _pending_.

**Governance requirements attached to this authorization, once signed,
in effect for the duration of implementation** (carried forward from
Phase 1/2 precedent, unchanged in kind):
- Any newly discovered architectural ambiguity shall be reported
  immediately, not resolved silently.
- Any scope expansion — including any Stock Counts work, however
  small — shall return to Product Architect review before proceeding.
- No business rule may be changed during implementation.
- No specification, policy, ADR, or BDR may be modified unless
  separately authorized.
- Documentation-synchronization items named in §3 remain outstanding
  and are not waived by this Authorization; they are simply not a
  precondition of it.

Implementation of the runtime files listed in §2 begins only once this
document is signed and merged to `main` — not before.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `docs/specs/*`, `docs/architecture/*`, or
  `docs/adr/*` file. None were touched to produce it.
- This record does not modify any prior governance document in the
  chain (§1) — it sits downstream of all of them, authorizing based on
  their settled content, not amending it.
- This record does not pre-authorize Phase 4 or later, and does not
  authorize Stock Counts work under any phase — each requires its own
  governance record.
- This record, BDR-0007, and the Rule 8 Assessment v2 are all
  currently local-only, not yet committed or pushed (no token
  available this session). They should be committed together, in that
  dependency order, so `main` never reflects an Authorization whose
  cited basis documents aren't themselves present.

**Lifecycle:** Designed → **Proposed**, pending Product Architect
signature. Not Authorized, not Implemented, not Executed — no
engineering work is permitted under this document in its current
status.
