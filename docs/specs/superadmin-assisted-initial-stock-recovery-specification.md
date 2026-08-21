# SuperAdmin-Assisted Initial Stock Recovery Specification

**Status:** All functional-requirement-shaping Product Architect decisions are now resolved and recorded verbatim in `BDR-0016` §9 and `POL-0009` (authorization duration: 48 hours; single active Authorization per business; current-confirmation-only, technically enforced). The Product Architect has explicitly instructed that Rule 8 proceed on this basis. **This Specification is not, however, formally Accepted in the signed sense §23 of the Void & Redo Specification records** — no named Product Architect signature has been given for this document specifically, and none is fabricated here. Rule 8 proceeds per the Product Architect's explicit instruction to do so, recorded in this governance session; formal Specification sign-off, if this repository's convention requires a distinct step, remains open for the Product Architect to complete at any point.

---

## 1. Status / Purpose

This Specification converts `BDR-0016` (✅ Approved) and `POL-0009` (✅ Approved) into functional requirements and acceptance criteria for the SuperAdmin-Assisted Initial Stock Recovery capability — the governed gate that makes a legacy or expired-window Initial Stock confirmation eligible for the existing Void & Redo mechanism (`BDR-0015`/`POL-0008`), via a SuperAdmin-granted, Owner-consumed Authorization.

This Specification does not restate or re-derive any decision `BDR-0015`/`POL-0008` already settled for the Void & Redo flow itself. It specifies only the new surface: Authorization request, grant, consumption, expiry, and the ceiling/audit/subscription interactions `POL-0009` defines.

## 2. Scope

**In scope:** the Authorization artifact's lifecycle (request → grant → consume-or-expire); the SuperAdmin/Owner actor boundary for that lifecycle; the eligibility check that determines whether a confirmation may enter Void & Redo via this path; the audit trail for Authorization events; the chain-ceiling accounting for legacy confirmations; the inherited subscription-gating exemption.

**Out of scope:** any change to Void & Redo's own internal flow once a confirmation is eligible (draft restoration, basis reselection, reconfirmation, original-voiding) — all governed unmodified by `POL-0008`; any change to `BDR-0011`/`ADR-0005`'s SuperAdmin subscription/payment boundaries; any Firestore schema, security-rules, UI, or algorithm design (reserved for Rule 8/Implementation Authorization).

## 3. Terminology — Preserved, Not Redefined

**Initial Stock**, **Void & Redo**, **the original confirmation**, **the redo confirmation**, **chain position**, and the existing 3-cycle/4-confirmation ceiling all carry exactly the meaning `POL-0008` fixes. **Authorization** and **`authorizedAt`** carry exactly the meaning `POL-0009`'s Terminology section fixes. This Specification introduces no new business term.

## 4. Conceptual Vocabulary — Fixed Terms

- **Legacy confirmation** — an `initial` `StockCount` confirmed before the Void & Redo mechanism existed, carrying no `confirmedAt`/chain-position metadata for that mechanism to measure a window from.
- **Expired-window confirmation** — a non-legacy confirmation whose own `POL-0008` Rule B/J recovery window has already elapsed without recovery.
- **Eligible-by-window** — a confirmation currently inside its own ordinary `POL-0008` window; needs no Authorization.
- **Eligible-by-Authorization** — a legacy or expired-window confirmation for which a valid, unconsumed, unexpired Authorization currently exists.
- **Grant** — the SuperAdmin action creating a new Authorization for one named confirmation.
- **Consumption** — the Owner action of entering the Void & Redo flow using a valid Authorization; a one-way, atomic transition after which the Authorization is spent (`POL-0009` Rule Q).
- **Unconsumed expiry** — the Authorization's 48-hour window (final, per explicit Product Architect decision) elapsing without consumption; the Authorization becomes permanently unusable, no different in effect from `POL-0008` Rule F's hard expiry for an ordinary confirmation window.

## 5. Business Rules

Restated from `POL-0009` Rules M–Z for direct traceability (§19, below, maps each to its FR):

1. An Authorization is an eligibility gate only — never a second recovery mechanism (Rule M).
2. SuperAdmin grants; SuperAdmin never performs any Void & Redo step (Rule N).
3. One Authorization names exactly one confirmation (Rule O).
4. Authorizations never cross tenant boundaries (Rule P).
5. Only the Owner may consume; consumption is one-time (Rule Q).
6. An Authorization is valid for a fixed, non-renewable, non-extendable duration from its own `authorizedAt` (Rule R).
7. `confirmedAt` is never fabricated, backfilled, or derived from `authorizedAt` (Rule S).
8. At most one unconsumed, unexpired Authorization may exist per business at a time (Rule T).
9. Only the business's current (not-yet-superseded) confirmation is eligible to be named (Rule U).
10. Every grant requires a recorded, non-empty justification (Rule V).
11. A legacy confirmation's first authorized recovery is treated as Confirmation #1 for ceiling purposes (Rule W).
12. An expired-window (non-legacy) confirmation's real chain-position history, if any, is preserved and not reset (Rule X).
13. The Authorization-gated write path inherits the existing narrow subscription-gating exemption (Rule Y).
14. No mechanism introduced here may silently edit, delete, or reinterpret any historical fact (Rule Z).

## 6. Invariants

- **I-1.** An Authorization, once granted, names exactly one confirmation for its entire lifetime — reassignment to a different confirmation is never possible.
- **I-2.** An Authorization's `authorizedAt` is a server-recorded, immutable fact once written.
- **I-3.** `confirmedAt` (where it exists) and `authorizedAt` are structurally distinct fields with no code path deriving one from the other.
- **I-4.** No more than one unconsumed, unexpired Authorization exists for a given business at any instant.
- **I-5.** Consumption is atomic and one-way: an Authorization is either unconsumed-and-valid, unconsumed-and-expired, or consumed — never any other state, and never reversible from consumed back to unconsumed.
- **I-6.** The 3-cycle/4-confirmation ceiling (`POL-0008` Rule J) is never exceeded through this path, including for legacy confirmations entering at Confirmation #1 (Rule W).
- **I-7.** SuperAdmin's write surface under this capability never includes a write to any `StockCount` field, any void-record, or any redo confirmation — only to the Authorization artifact itself.
- **I-8.** Every grant, consumption, and unconsumed-expiry event is a permanent, append-only audit fact.

## 7. Functional Requirements — Authorization Request and Grant

**FR-1.** SuperAdmin must be able to request an Authorization for a specific business's specific confirmation, supplying a non-empty justification (Rule V).

**FR-2.** The system must reject a grant request naming a confirmation that is not the business's current confirmation (Rule U).

**FR-3.** The system must reject a grant request if an unconsumed, unexpired Authorization already exists for that business (Rule T).

**FR-4.** The system must reject a grant request naming a confirmation that is already at Confirmation #4 chain position (or would already be ineligible for a further recovery cycle under `POL-0008` Rule J), consistent with the unchanged ceiling (`BDR-0016` §2; Invariant I-6).

**FR-5.** On a successful grant, the system must record `authorizedAt` as a server timestamp, never client-supplied.

**FR-6.** A grant must never write any field to the named confirmation's own `StockCount` record.

## 8. Functional Requirements — Authorization Consumption

**FR-7.** Only the Owner of the business named in a valid, unexpired, unconsumed Authorization may consume it.

**FR-8.** Consumption must be the sole and exclusive trigger that makes the named confirmation eligible to enter the Void & Redo flow via this path; no other action may substitute for consumption.

**FR-9.** Upon consumption, the Authorization must irreversibly transition to "consumed" before, or atomically with, the first Void-&-Redo-flow write (the void-record creation) — preventing a race where the same Authorization could be consumed twice.

**FR-10.** Once consumption begins, every subsequent step (draft restoration, Owner edit, basis selection, reconfirmation, original-voiding) must follow `POL-0008` Rules C–I exactly as for any ordinary Void & Redo — no alternate or abbreviated flow.

## 9. Functional Requirements — Expiry Behavior

**FR-11.** An unconsumed Authorization must become permanently unusable once its validity window elapses, measured from its own `authorizedAt`, per Rule R.

**FR-12.** Expiry must not restart or extend under any action (the Owner viewing it, SuperAdmin re-requesting justification, or any other interaction) — identical in spirit to `POL-0008` Rule B's "no restart, no extension" discipline.

**FR-13.** Once expired, a new Authorization for the same confirmation requires an entirely new SuperAdmin grant (a fresh `authorizedAt`, a fresh justification) — never a renewal of the expired one.

## 10. Functional Requirements — Ceiling Accounting

**FR-14.** For a legacy confirmation, the system must treat its first authorized recovery as consuming recovery cycle 1 of the existing 3-cycle ceiling, and the resulting redo confirmation as Confirmation #2 (Rule W).

**FR-15.** For an expired-window, non-legacy confirmation, the system must preserve and continue its real, existing chain-position count — never resetting it to Confirmation #1 (Rule X).

**FR-16.** No path under this Specification may produce a 5th confirmation event under any circumstance, consistent with `POL-0008` Rule J's unmodified ceiling.

## 11. Functional Requirements — Timestamp Integrity

**FR-17.** `authorizedAt` must never be written to the original `StockCount` document.

**FR-18.** No code path may copy, derive, infer, or backfill a `confirmedAt` value from `authorizedAt`, for legacy confirmations or any other.

**FR-19.** Where a legacy confirmation has no `confirmedAt`, the system must continue to represent that absence accurately — never substituting `authorizedAt` or any other value in its place.

## 12. Functional Requirements — Audit Behavior

**FR-20.** Every grant, consumption, and unconsumed-expiry event must be recorded as a permanent, append-only audit fact, consistent with the existing platform Audit Log convention (`09-superadmin-architecture.md` §9.6).

**FR-21.** The audit record for a grant must include the justification text (Rule V), the granting SuperAdmin's identity, the named confirmation, `authorizedAt`, and the computed expiry.

**FR-22.** Any view capable of displaying Initial Stock or SuperAdmin audit history must be able to distinguish an authorized recovery from an ordinary, unauthorized one — without this Specification deciding the visual treatment.

## 13. Functional Requirements — Actor / Permission Behavior

**FR-23.** SuperAdmin-tier credentials must be structurally incapable of performing any Owner-tier write in this flow (void-record creation, redo confirmation creation, basis selection) — enforced at the same layer that already enforces `POL-0008` Rule E, not by UI omission alone.

**FR-24.** Owner-, Manager-, and Staff-tier credentials must be structurally incapable of creating, granting, or altering an Authorization.

**FR-25.** No role may consume an Authorization on behalf of, or in place of, the named business's actual Owner.

## 14. Functional Requirements — Subscription-Gating Interaction

**FR-26.** The Authorization-gated Void & Redo write path (void-record creation, redo confirmation creation performed via a consumed Authorization) must be exempt from `subscriptionAllowsNewRecords(businessId)`, identically in narrowness of scope to the existing Finding K1/Option A exemption for ordinary Void & Redo (Rule Y).

**FR-27.** This exemption must not be implemented as, or become reachable through, any shared "skip subscription check" mechanism usable by an unrelated write path.

## 15. Failure / Edge Cases

- **A grant request for a business with no eligible confirmation at all** (e.g., no Initial Stock confirmed yet) must be rejected before any Authorization is created.
- **A grant request racing a Owner-triggered ordinary Void & Redo** that independently makes the named confirmation ineligible (e.g., the Owner separately reaches Confirmation #4 through some other already-open window) must be resolved so that the ceiling (Invariant I-6) is never exceeded — the later of the two operations to attempt a write must fail cleanly.
- **Two simultaneous consumption attempts** against the same Authorization must resolve so that exactly one succeeds (Invariant I-5, optimistic-concurrency discipline consistent with `POL-0008`'s existing void-record precondition pattern).
- **An Authorization expiring mid-consumption** (the Owner begins the flow just before expiry) — the Specification requires that the eligibility check and the first Void-&-Redo write be evaluated atomically against the same "still valid" condition, so a flow cannot begin, appear to succeed, and later be discovered invalid.
- **A legacy confirmation with genuinely ambiguous or missing identifying data** (no stable identifier for the Authorization to name) is a data-quality condition this Specification does not resolve — flagged for Rule 8 to assess whether every legacy confirmation actually has a sufficient identifier, or whether some subset is not reachable by this mechanism at all.

## 16. Explicit Rule-8 Technical Questions

1. What stable identifier does a legacy confirmation actually have today, and is it sufficient for FR-1/I-1's "one exact confirmation" requirement for every legacy record, or only some?
2. What is the precise Firestore schema/collection for the Authorization artifact, and how is its single-active-per-business constraint (FR-3, Invariant I-4) enforced atomically at the Security Rules layer versus needing a transaction?
3. What is the precise `firestore.rules` expression for SuperAdmin-grant / Owner-consume tiers, and does it require a new custom claim or role check beyond what `platform_operators/{uid}` already provides?
4. How is FR-9's "irreversible transition before or atomically with the first Void-&-Redo write" implemented — a single transaction, or a precondition check with acceptable race tolerance?
5. Where precisely does the Authorization audit entry live relative to `platform_audit_log/{id}` (09-superadmin-architecture.md §9.6) — the same collection, or a dedicated one cross-referenced from it?
6. ~~Confirm the exact 48-hour figure (Rule R) with the Product Architect~~ — **resolved**: 48 hours is final, per `BDR-0016` §9/`POL-0009`. Retained here only so Rule 8/implementation code treats it as a single, named constant (not a magic number re-derived in multiple places) when the time comes.

## 17. Non-Goals / Explicit Exclusions

- Does not change any Void & Redo internal mechanic once a confirmation is eligible (`POL-0008` Rules C–I unmodified).
- Does not create a second SuperAdmin subscription/platform-access capability (`BDR-0011` unaffected).
- Does not extend `ADR-0005`'s Payment Operations boundary.
- Does not decide UI, schema, security-rules text, or algorithms (reserved for Rule 8/Implementation Authorization).
- Does not authorize any general subscription-enforcement bypass beyond this one write path (FR-27).
- Does not create a path to a 5th confirmation event under any circumstance (FR-16, Invariant I-6).

## 18. Dual-Valuation Integration

No change. The redo confirmation produced via an authorized recovery undergoes the identical, unmodified `BDR-0014`/dual-valuation-basis mechanism `POL-0008` Rule H already requires of any redo confirmation — its own independent, separately-chosen Cost/Selling basis, with no inheritance from the voided original.

## 19. Traceability Matrix

| Business Rule (§5) | Policy Rule | FR(s) |
|---|---|---|
| 1 | Rule M | FR-8, FR-10 |
| 2 | Rule N | FR-6, FR-23 |
| 3 | Rule O | FR-1, I-1 |
| 4 | Rule P | (tenant scope, all FRs implicitly) |
| 5 | Rule Q | FR-7, FR-9, I-5 |
| 6 | Rule R | FR-11, FR-12 |
| 7 | Rule S | FR-17, FR-18, FR-19 |
| 8 | Rule T | FR-3, I-4 |
| 9 | Rule U | FR-2 |
| 10 | Rule V | FR-1, FR-21 |
| 11 | Rule W | FR-14 |
| 12 | Rule X | FR-15 |
| 13 | Rule Y | FR-26, FR-27 |
| 14 | Rule Z | FR-20, I-8 |

## 20. Acceptance Criteria

1. An Authorization exists only for exactly one named, current confirmation of one business (FR-1, FR-2, I-1).
2. At most one unconsumed, unexpired Authorization exists per business at any time (FR-3, I-4).
3. A confirmation already at the ceiling cannot receive a new Authorization (FR-4, I-6).
4. `authorizedAt` is server-recorded and never written to the original `StockCount` (FR-5, FR-17).
5. Only the named business's Owner may consume; consumption is atomic and one-way (FR-7, FR-9, I-5).
6. Once consumed, the flow is identical to ordinary Void & Redo in every subsequent step (FR-10).
7. An unconsumed Authorization becomes permanently unusable after its window, with no restart/extension (FR-11, FR-12).
8. A legacy confirmation's first authorized recovery is Confirmation #1 for ceiling purposes; an expired-window confirmation's real history is preserved (FR-14, FR-15).
9. No path here ever produces a 5th confirmation event (FR-16, I-6).
10. `confirmedAt` is never fabricated or derived from `authorizedAt`, for legacy or any other confirmation (FR-18, FR-19).
11. Every grant/consumption/expiry is a permanent, auditable, justification-carrying record (FR-20, FR-21, I-8).
12. SuperAdmin's write surface never includes a confirmation-affecting write (FR-23, I-7).
13. No role but the named Owner may consume; no role may create/alter an Authorization except SuperAdmin's grant (FR-24, FR-25).
14. The subscription exemption applies only to this write path, never generally (FR-26, FR-27).
15. The redo confirmation's valuation basis selection is independent and unmodified from `BDR-0014`/`POL-0008` Rule H (§18).

## 21. Product Architect Decisions — Resolved

Per `POL-0009`'s "Numbering and Product Architect Decisions" section, all items this Specification previously carried forward as open are now resolved by explicit, final Product Architect decision:

1. **Authorization duration: 48 hours**, final (Rule R; FR-11). `authorizedAt` is the server-recorded grant time; expiry is 48 hours after `authorizedAt`; no extension or automatic renewal; entirely separate from the normal 12-hour `confirmedAt` window.
2. **Single active Authorization per business**, final (Rule T; FR-3, Invariant I-4) — an operational safety constraint, not a new recovery mechanism.
3. **Current-confirmation-only**, final (Rule U; FR-2) — technically enforced, not a UI convention.

No Specification-level open item remains blocking Rule 8.

## 22. Governance Notes

- This is a Specification document only. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document.
- This Specification does not modify `POL-0008`, `BDR-0015`, `BDR-0014`, `BDR-0011`, `ADR-0005`, or Architecture Principle 2.10.
- This Specification is **not** Accepted. No Product Architect signature is recorded here, none is implied, and none has been fabricated.
- `docs/specs/README.md` is not modified by this document.

## 23. Next Governance Step

Per this repository's governance chain, the next step — **not performed here** — is Product Architect review of this Specification (including explicit resolution of the two open items in §21), followed only then by a Rule 8 Assessment. No Rule 8 Assessment, Implementation Plan, or Implementation Authorization is drafted, started, or implied by this document.

**Lifecycle:** Drafted → **Product Architect review (this step)** → Not yet Accepted. Not yet assessed under Rule 8. Not Implemented.
