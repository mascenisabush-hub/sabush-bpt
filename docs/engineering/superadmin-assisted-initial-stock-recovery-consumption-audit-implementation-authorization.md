# Supplementary Implementation Authorization — SuperAdmin-Assisted Initial Stock Recovery: Consumption & Audit Amendment

**Status:** ✅ **SIGNED AND AUTHORIZED.** See §10 for the recorded Product Architect signature. Implementation of the Consumption & Audit Amendment's scope — strictly within §2's coverage and §3/§8's exclusions — is authorized as of this signature. **No code, `firestore.rules`, `firestore.indexes.json`, or test file has yet been created, modified, or committed** — signature is the governance gate that permits that next, separate execution step; it does not itself perform it.
**Relationship to the original Implementation Authorization:** **Supplementary, not a replacement.** [`superadmin-assisted-initial-stock-recovery-implementation-authorization.md`](./superadmin-assisted-initial-stock-recovery-implementation-authorization.md), signed by SABUSHIMIKE MASCENI on 2026-08-21, **remains fully valid, unmodified, and untouched by this document** — for exactly the scope it originally enumerated (the SuperAdmin grant route, the Authorization data model, the `firestore.rules` eligibility helper and additive `voidRecords` branch, the `initial_stock_recovery.authorized` audit entry — all already implemented and tested). This document neither rewrites nor invalidates any part of it. It authorizes, once signed, exactly one additional increment: the scope described in [`superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md`](./superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md) — nothing else.
**Governing chain:** `BDR-0016` (Approved) → `POL-0009` (Approved) → Specification (FR-20, unchanged — already required consumption to be audited) → [Rule 8 Assessment](./superadmin-assisted-initial-stock-recovery-rule8-assessment.md) (READY) → [Consumption-Audit Rule 8 Re-Assessment](./superadmin-assisted-initial-stock-recovery-consumption-audit-rule8-reassessment.md) (READY) → [Implementation Plan Amendment](./superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md) (drafted) → **this supplementary Authorization (✅ Signed, §10)**.

---

## 1. Governance Completeness — What This Record Confirms

- The original Implementation Authorization's own scope (§2 of that document) did not include a second server route or a changed consumption write path — per this repository's own governance standard (Stage 8: an Implementation Authorization covers "exactly the scope the Rule 8 Assessment defined — nothing broader"), that gap is why this supplementary document exists rather than treating the amendment as already covered.
- Every technical question the amendment raises (transaction shape, authentication, idempotency, audit non-atomicity) was investigated in the Consumption-Audit Rule 8 Re-Assessment and resolved within Rule 8's own authority — no BDR-0016/POL-0009/Specification decision was reopened, and none is reopened by this document.
- The two small schema-shape additions the amendment introduces (`authorizationId` field; `actorRole` widened to accept `'owner'`) were identified and reasoned through in the amendment itself (§6) as implementation-detail choices, not business decisions — restated as acceptance criteria below, not re-litigated here.

## 2. What This Supplementary Authorization Would Cover (Once Signed)

Exactly, and only, the scope the Consumption-Audit Amendment defines:

1. A new tenant-facing route, **`POST /api/initial-stock-recovery/consume`**, gated by `requireAuth` plus a server-side check (mirroring the existing `/api/staff/delete` pattern) that the caller resolves, via `users/{uid}`, to the actual Owner of the target `businessId`.
2. A new server module (mirroring `server/initialStockRecoveryAuthorization.ts`'s own existing structure) implementing the consumption transaction described in §3 of the amendment.
3. One Firestore Admin SDK transaction per consumption attempt, writing exactly two documents: `voidRecords/{targetStockCountId}` (create) and `initialStockRecoveryAuthorization/current` (partial update: `status`, `consumedAt` only).
4. A new `initial_stock_recovery.consumed` audit entry, written via the existing `writeAuditLogEntry` primitive, immediately after the transaction commits — never inside it.
5. Two additive, minimal schema changes: `PlatformAuditLogEntry.authorizationId?: string` (new field) and widening `PlatformAuditLogEntry.actorRole` to accept `'owner'` in addition to the existing `PlatformRole` values.
6. Removal of the client-reachable `firestore.rules` `allow update` path on `initialStockRecoveryAuthorization/{docId}` for the consumption transition (the amendment's §8: a strict narrowing of client-reachable surface, not a widening) — the `voidRecords` create rule's own additive `initialStockRecoveryAuthorizationActive(...)` branch may remain defined, unused by this specific flow, as a defense-in-depth backstop, per the amendment's own reasoning.
7. New tests: transaction validation-order tests (all seven steps, each independently), idempotency tests (retry after partial audit failure), a test proving the audit write's failure never rolls back or blocks the underlying recovery, and a test proving server-side and rules-layer eligibility logic remain equivalent (Implementation Plan Amendment §9's named maintenance obligation).

## 3. What This Supplementary Authorization Would Not Cover

Restated explicitly, per instruction, as its own scope boundary — not merely implied by §2:

- **A general SuperAdmin database-editing capability.** SuperAdmin's own write surface is completely unchanged by this amendment — SuperAdmin still only grants; this amendment concerns exclusively how the Owner's own consumption is executed and audited.
- **General subscription overrides.** The existing narrow Void & Redo subscription exemption is unchanged in scope; this amendment introduces no new exemption and does not widen the existing one.
- **Arbitrary Initial Stock editing.** The consumption transaction's write surface is exactly `voidRecords` (create) and the Authorization document (partial update) — never `stockCounts` in any form.
- **SuperAdmin performing Owner recovery.** The new route is explicitly Owner-authenticated (`requireAuth` + Owner-of-business check); no platform-operator credential can reach it, and SuperAdmin never becomes a valid actor for consumption under any condition.
- **Bypassing Confirmation #4.** The transaction independently re-validates `chainPosition != 4` (§3 step 7 of the amendment) — this is a re-verification of an existing, unchanged ceiling, not a relaxation of it.
- **Creating Confirmation #5.** Nothing in this amendment touches the redo-confirmation branches (`chainPosition` 2/3/4) or introduces any new confirmation-creation path.
- **Migration or backfill of historical records.** No document predating this capability is read for the purpose of being modified; the transaction only ever writes the two documents named in §2 item 3, for the specific confirmation being recovered right now.
- **Any unrelated workflow-recovery capability.** This authorization is scoped exclusively to Initial Stock recovery consumption — it establishes no general pattern or reusable "server-mediated consumption" capability for any other workflow.
- **Manager or Staff consumption.** The Owner-of-business check in §2 item 1 structurally excludes every role but Owner — a Manager or Staff credential resolves to a `users/{uid}` profile that fails the check, regardless of business membership.
- Anything the original, already-signed Implementation Authorization already covers — this document adds to that scope, it does not restate, re-authorize, or duplicate it.

## 4. Rule 8 Re-Assessment → Amendment Traceability (Re-Verified)

Every item this supplementary Authorization would cover traces to a specific finding or direction, per the amendment's own §11 table:

- Authentication/ownership verification → Re-Assessment §3 (direct precedent: `/api/staff/delete`).
- Transaction shape and validation order → Re-Assessment §6, §9; amendment §3.
- Non-atomic, idempotent audit write → Product Architect direction (explicit); Re-Assessment §4; amendment §4–§5.
- Audit event shapes, actor identity, justification reuse → Product Architect direction (verbatim, this session); amendment §6–§7.
- Schema-shape additions (`authorizationId`, `actorRole` widening) → amendment §6, explicitly flagged as Rule 8/Plan-authority technical choices.
- Dual-eligibility-logic maintenance cost → Re-Assessment §6; amendment §9; carried into acceptance criteria (§7, below) as a required test obligation, not merely a note.

No item in this chain required a new Product Architect business decision beyond what was already given (this session's explicit direction on audit shape, actor identity, and non-atomicity).

## 5. Risk Acknowledgment

- **The audit write's non-atomicity is a real, accepted limitation**, not a design flaw glossed over: a narrow window can exist where a legitimate recovery has completed but is not yet reflected in `platform_audit_log`. This is the same limitation this codebase already accepts for `payment.confirmed`/`business.suspended`/`business.reactivated`, extended here rather than invented fresh — mitigated by the idempotent-retry design (amendment §5), never by claiming a guarantee the architecture doesn't provide.
- **Dual eligibility logic (rules-layer helper + server-side transaction check) is a new, ongoing maintenance cost** this amendment introduces and does not eliminate — any future change to eligibility rules must be applied in both places, verified by the required equivalence test (§7 item 8, below).
- **A new tenant-facing route authenticated only by `requireAuth` + a server-side Owner check** is a new attack surface, structurally identical in shape to the existing `/api/staff/delete`-style routes this codebase already trusts, but new nonetheless — the acceptance criteria (§7) require the ownership check to fail closed and to be independently tested, not merely assumed correct by analogy.

## 6. Testing Boundary (Carried Into Implementation)

At minimum, per the amendment's §9 and the Consumption-Audit Re-Assessment's §6: unit tests for each of the seven transaction validation steps (independently, mirroring `superadmin-initial-stock-recovery-authorization.test.ts`'s own existing style for the grant route); an idempotency test (retry after simulated audit-write failure produces no duplicate void-record, no duplicate consumption, and a successful retried audit write); an ownership-check test (a non-Owner caller, and an Owner of a *different* business, both rejected); a Confirmation #4 exclusion test; a rules/server eligibility-equivalence test; full regression of the existing Void & Redo, Initial Stock confirmation, and SuperAdmin-Assisted Initial Stock Recovery grant-route suites, proving zero behavior change to any already-implemented path. None of these tests exist yet — none is written by this document.

## 7. Acceptance Criteria (Would Govern Implementation Completion)

1. **Tenant-facing consumption endpoint.** `POST /api/initial-stock-recovery/consume` exists, is gated by `requireAuth`, and is never reachable via any `requirePlatformOperator`/`requireSuperAdmin`-gated path.
2. **Owner-only authentication.** The route independently verifies, server-side, that the authenticated caller's `users/{uid}` profile resolves to the Owner of the exact target `businessId` — a Manager, Staff, or Owner-of-a-different-business caller is rejected before any recovery-specific read occurs.
3. **SuperAdmin never executes consumption.** No code path allows a `platform_operators/{uid}` credential to reach or trigger this route or its underlying transaction.
4. **Complete server-side validation sequence**, in order, each independently verifiable: authenticated Owner; business ownership; current confirmation (target exists, `type == 'initial'`, no existing `voidRecords` entry); valid, unconsumed Authorization naming this exact target; unexpired (48-hour) Authorization; one-time consumption (an already-`'consumed'` Authorization is never re-consumed); `chainPosition != 4`.
5. **Transactional integrity.** `voidRecords/{targetStockCountId}` creation and the Authorization's `status: 'consumed'`/`consumedAt` transition occur in one Firestore transaction — both succeed or neither does; no partial state is ever observable.
6. **Original StockCount immutability preserved.** No field of `stockCounts/{targetStockCountId}` is ever written by this transaction or this route, under any code path.
7. **No fabricated or backfilled metadata.** `confirmedAt` and `chainPosition` are never written, derived, or inferred by this route for any target, legacy or otherwise.
8. **Dual-eligibility equivalence.** A dedicated test proves the server-side transaction's eligibility logic and the `firestore.rules` `initialStockRecoveryAuthorizationActive()` helper agree on every tested case — required as a condition of considering this item complete, not merely desirable.
9. **`initial_stock_recovery.authorized` audit entry unchanged** — this amendment does not alter the grant-side audit entry in any way.
10. **`initial_stock_recovery.consumed` audit entry** is written after the transaction commits (never inside it), with `actorUid` set to the consuming Owner's own uid (never the granting SuperAdmin's), `actorRole` set to `'owner'`, `targetBusinessId`, `targetStockCountId` (the confirmation voided), `authorizationId` (the consumed Authorization's own `authorizedAt`), `justification` copied verbatim from the Authorization's own grant-time value, and a server-set `timestamp`.
11. **No new Owner-entered reason field exists anywhere in this flow** — the request body accepted by the consumption route carries no justification/reason parameter.
12. **The consumption event is never presented, stored, or interpretable as a second authorization decision** — no code path treats a `.consumed` entry as itself granting or re-granting anything.
13. **Audit-write failure never rolls back a legitimate recovery.** A transaction that commits successfully is never undone, and the recovery's success response is never downgraded to a failure, solely because the subsequent audit write fails.
14. **Audit-write failure is surfaced explicitly**, never silently swallowed — the response reports `auditLogged: false` and the server logs the failure for follow-up, matching this codebase's own existing convention for every other audited action.
15. **Audit logging is idempotent/retry-safe.** Re-invoking the route after a partial failure (transaction succeeded, audit write did not) produces no duplicate void-record, no duplicate consumption, and a renewed attempt at the audit write — never a second, distinct `.consumed` entry for the same underlying consumption.
16. **One active Authorization per business, 48-hour expiry, current-confirmation-only, one-time consumption, the 3-cycle/4-confirmation ceiling, and the narrow existing subscription exemption** are all independently preserved and re-verified by this amendment's own code — none is weakened, widened, or bypassed by moving consumption server-side.
17. **Void & Redo remains the sole recovery mechanism.** This amendment introduces no second recovery system — every step after a successful transaction (draft restoration, Owner edits, basis selection, reconfirmation) remains the existing, unmodified client-side Void & Redo flow.
18. **Full regression** of every existing test suite this capability touches (`initial-stock-void-redo`, `initial-stock-confirmation`, `initial-stock-dual-valuation-basis`, `superadmin-initial-stock-recovery-authorization`, `superadmin-assisted-initial-stock-recovery`) passes unchanged.

## 8. Explicit Scope Boundary (Restated, Per Instruction, as Its Own Section)

This supplementary Authorization, once signed, would **not** authorize:

- A general SuperAdmin database-editing capability.
- General subscription overrides, beyond the existing narrow, unchanged exemption.
- Arbitrary Initial Stock editing of any kind.
- SuperAdmin performing Owner recovery on the Owner's behalf.
- Any bypass of the Confirmation #4 ceiling.
- Creation of a Confirmation #5, under any circumstance.
- Migration or backfill of any historical record.
- Any recovery/consumption capability for any workflow other than SuperAdmin-Assisted Initial Stock Recovery specifically.

## 9. Explicit Gate Statement

**As of §10's signature below, implementation of the Consumption & Audit Amendment's scope, strictly within §2's coverage and §3/§8's exclusions, is authorized.** Prior to this signature, no code, `firestore.rules`, `firestore.indexes.json`, or test file had been created, modified, or committed to produce this document or the Implementation Plan Amendment it supplements — that remains true as of the signature itself; implementation is the next, separate execution step this signature enables, not something this signature itself performs, and not something performed in this same governance step. **The original, separately-signed Implementation Authorization is unaffected by this statement and remains valid for its own scope, exactly as it was before this signature.**

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** August 21, 2026

**Authorization decision (verbatim):**
> "I accept and authorize the Supplementary Implementation Authorization for the SuperAdmin-Assisted Initial Stock Recovery Consumption & Audit Amendment."

**Confirmed as part of this signature:**

- [x] This supplementary authorization's scope (§2) is approved as stated.
- [x] This supplementary authorization's exclusions (§3, §8) are approved as stated.
- [x] The relationship to the original, already-signed Implementation Authorization (unaffected, not replaced) is confirmed.
- [x] The audit-write non-atomicity limitation (§5) is explicitly acknowledged.
- [x] The dual-eligibility-logic maintenance cost (§5) is explicitly acknowledged.
- [x] The two schema-shape additions (`authorizationId`; `actorRole` widened to include `'owner'`) are approved as implementation-detail choices, not business decisions.
- [x] No additional scope change is required beyond what §1–§7 of this document describe.

---

**This document, as signed, authorizes implementation strictly per §2's coverage and §3/§8's exclusions — nothing broader.** No code has been written and no schema, `firestore.rules`, `firestore.indexes.json`, or test change has been made as of the filing of this signed authorization — implementation is the next, separate execution step this signature enables, not performed in this same governance step. The original Implementation Authorization (2026-08-21) remains separately valid, unmodified, and unaffected by this signature, for exactly and only its own originally-enumerated scope.
