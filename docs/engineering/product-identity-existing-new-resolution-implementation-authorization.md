# Implementation Authorization — Product Identity Existing/New Resolution

**STATUS: ✅ IMPLEMENTATION AUTHORIZED.** See "Product Architect
Authorization," below.

**PRODUCT ARCHITECT:** SABUSHIMIKE MASCENI
**DATE:** 2026-09-06

This authorization is limited **strictly** to the already-accepted
Implementation Plan identified in §1, below, and its own stated test/
regression requirements. It authorizes a subsequent implementation
task to write code against that plan — it does not itself implement
anything. No application code, test, schema, or Firestore-rules file
is modified by this document.

---

## 1. Authorized Artifact

**The sole implementation blueprint this authorization covers:**

[`docs/engineering/product-identity-existing-new-resolution-implementation-plan.md`](./product-identity-existing-new-resolution-implementation-plan.md)

— exactly as it stands after its own Governance Review
([`product-identity-existing-new-resolution-implementation-plan-governance-review.md`](./product-identity-existing-new-resolution-implementation-plan-governance-review.md),
verdict READY FOR PRODUCT ARCHITECT ACCEPTANCE) and its own Product
Architect Acceptance (recorded in the plan's own "Product Architect
Acceptance" section, 2026-09-06). **Verified, this session, not to have
drifted since that acceptance:** the plan file's own acceptance section
remains the last content added to it; no edit has occurred since.

## 2. Full Governance Chain This Authorization Sits Atop

Each artifact below is preserved unmodified by this document:

1. [`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md) — evidence investigation
2. [`product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md) — Decision A / Decision B proposal
3. [`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md) — Decision A / Decision B (B2) accepted
4. [`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md) — Rule 8, READY AFTER DECISIONS
5. [`recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md) — A-Contagem / B2 Reading 2 / Concept C clarifications
6. [`recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md) — clarifications accepted
7. [`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md) — Final Rule 8, READY AFTER SPECIFICATION AMENDMENT
8. [`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](./product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md) — amendment drafted and accepted
9. [`docs/specs/product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md) §4a/§7a — amendment applied
10. [`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_TARGETED_RECHECK.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_TARGETED_RECHECK.md) — READY FOR IMPLEMENTATION PLANNING
11. [`product-identity-existing-new-resolution-implementation-plan.md`](./product-identity-existing-new-resolution-implementation-plan.md) — the Implementation Plan
12. [`product-identity-existing-new-resolution-implementation-plan-governance-review.md`](./product-identity-existing-new-resolution-implementation-plan-governance-review.md) — plan reviewed, READY FOR PRODUCT ARCHITECT ACCEPTANCE
13. Product Architect Acceptance of the plan (recorded within artifact 11 itself, 2026-09-06)
14. **This document** — Implementation Authorization

**Prerequisite verification, this session:** all thirteen prior
artifacts exist, are internally consistent with one another (no
artifact contradicts an earlier one — confirmed by this session's own
direct re-inspection of the plan's acceptance section against the
governance review it responds to), and no artifact has been altered
since the step that produced it. This authorization is the only
document created in this task.

---

## 3. Authorized Implementation — Three Checkpoints

**Checkpoint A — Add Stock / Smart Stock Entry.** A blocking,
owner-authoritative Existing/New resolution flow for unresolved product
identity, extending the existing `supplierWordingCandidates`-style
gating pattern in `AddStockView.tsx` and `addMultipleStockBatches`
(`AppContext.tsx`). Valid automatic recognition (exact match, reused
relationship, accepted candidate) remains entirely unchanged. Where
identity remains unresolved: the owner is shown applicable candidate
information, may select an Existing Product, or may explicitly confirm
New Product — a Product is never silently created.

**Checkpoint B — `addStockBatch`.** Confirmed, by direct repository
trace (Governance Review §6), to have **no live callers** anywhere in
the current codebase. Authorized scope is limited to a defensive
safety-boundary addition only (reject an item with no `productId` and
no explicit confirmed-new signal) — **no new UI, and no new
product-entry flow, parallel or otherwise, is authorized for this
function.**

**Checkpoint C — Periodic Contagem.** The Existing/New resolution
principle extends to `PeriodicStockCountView.tsx`/`recordStockCount`
only — not Initial Stock. `findSimilarProducts` is authorized strictly
as a candidate-generation input to a blocking, owner-authoritative
resolution control. Supplier-Wording Recognition remains explicitly
out of scope for Contagem.

## 4. Required Behavioral Guarantees

This authorization is conditioned on the implementation satisfying
every one of the following, without exception:

1. **Unresolved product identity must never silently create a
   Product**, on any of the three authorized surfaces.
2. **Only an explicit owner-confirmed New Product action may create a
   Product** when identity was not automatically resolved.
3. **Existing Product resolution must retrieve the existing Product
   Memory** — remembered `sellingPrice`, `sellingUnit`, and
   `unitRelationship` where applicable — via the existing, unmodified
   `findLatestRememberedProductMemory`/`buildProductMemoryAutofill`
   mechanism. No new retrieval mechanism may be introduced.
4. **`findSimilarProducts`, as used in Contagem, is candidate
   generation only.** It must never independently assign a `productId`,
   never auto-resolve ambiguity among multiple candidates, and never
   bypass explicit owner confirmation.
5. **The owner remains authoritative** at every resolution point on
   every authorized surface — no automatic selection among ambiguous
   candidates, on any surface, under any condition.
6. **`addStockBatch` receives a defensive safety boundary only** —
   its treatment as having no live caller is accepted as fact for
   purposes of this authorization; should implementation discover a
   caller this governance chain did not anticipate, that discovery
   must return to governance review before proceeding, not be resolved
   silently mid-implementation.
7. **Contagem resolution must remain supplier-independent,
   business-scoped, and non-cross-tenant** — no supplier identity
   required, no cross-business Product query, ever.
8. **The existing, valid, already-signed automatic recognition
   behavior (exact match, Supplier-Wording reuse/candidate confirmation
   in Add Stock/Smart Stock Entry) must remain unchanged** — this
   authorization adds a new gate for the unresolved case; it does not
   touch the confident-match case.

## 5. Test / Regression Requirements — Binding

The implementation is authorized only if it satisfies every proof
point the accepted plan's own test coverage map (§14 of the
Implementation Plan) establishes, reproduced here as the binding
acceptance bar:

| # | Requirement |
|---|---|
| A | Unresolved identity cannot silently create a Product |
| B | Existing selection resolves to the correct existing Product among multiple candidates |
| C | Explicit New selection creates a Product |
| D | Existing selection retrieves Product Memory |
| E | Contagem follows the Existing/New principle |
| F | Contagem does not use Supplier-Wording Recognition |
| G | Tenant isolation remains intact |
| H | Remembered unit-relationship/selling-price behavior remains intact (full existing 195-test suite passes unmodified) |
| I | B2 Reading 2 remains untouched (including the source-scan regression assertion) |
| J | Concept C remains untouched (including the source-scan regression assertion) |

A pull request implementing this authorization is expected to include
test coverage for every row above before it may be considered complete
against this authorization — this document does not itself write those
tests.

## 6. Preserved Architecture — Explicitly Reaffirmed, Not Reopened

This authorization changes nothing about, and does not reopen:

- **Decision A** and **Decision A-Contagem** — restated, not amended, in §3–4 above.
- **Decision B, B2 Reading 2** — no independently competing purchase/selling basis is authorized inside `StockBatch`; the existing authoritative stock representation, `Product.unitRelationship`, and the existing derived-selling-valuation architecture (Concept C) remain the applicable mechanisms exactly as already accepted.
- **Concept C** — remains a Derived/Frozen Valuation Snapshot only; not Product Memory; does not override `Product.sellingPrice`/`sellingUnit`/`unitRelationship`; not a Business Worth authority. **Its operationalization is NOT authorized by this document.** No call site outside its existing, already-signed reach (`addMultipleStockBatches`) is authorized to be added by this implementation.
- **`StockBatch` representation** — no schema change of any kind is authorized.
- **Tenant isolation** — `businesses/{businessId}/products` scoping, unmodified, on every authorized surface.
- **Supplier-Wording Recognition's exclusion from Contagem** — remains fully in force; this authorization does not permit importing it there under any framing.

## 7. Explicitly Prohibited Scope

This authorization does **not** permit, and any of the following found
during implementation must halt and return to governance review rather
than proceed:

- General fuzzy-search redesign, beyond reusing `findSimilarProducts` exactly as it exists today.
- A new AI/semantic product-recognition system.
- A barcode/SKU recognition project.
- Product Memory redesign or a new retrieval mechanism.
- `StockBatch` schema redesign.
- Business Worth calculation changes.
- Concept C operationalization (any wiring into `calculateBatch` or any Business Worth/Dashboard/Report path).
- Supplier-Wording Recognition expansion into Contagem.
- Cross-tenant recognition of any kind.
- Unrelated UI redesign or unrelated refactoring bundled into this implementation's own pull request(s).

Any of the above, if it appears necessary during implementation, is a
**new governance question** requiring its own decision — not something
this authorization permits resolving unilaterally mid-build.

## 8. Distinction Preserved

**Product Architect Acceptance of the Plan** (recorded 2026-09-06,
within the plan document itself) and **this Implementation
Authorization** are two distinct governance events, per this
repository's established sequence — the former accepted the plan as
the correct engineering translation of already-accepted decisions; this
document is the separate, subsequent act that permits code to be
written against that accepted plan. This authorization would not exist,
and could not be granted, without that prior acceptance already having
occurred — but the two are not the same act, and are recorded in
separate artifacts accordingly.

## 9. Boundary of This Task

**No application code, test, schema, or Firestore-rules file was
modified to produce this authorization.** This document changes the
governance state to "Implementation Authorized" — it does not, itself,
implement any part of the authorized plan. A subsequent, separate task
is required to write the actual code, tests, and any resulting pull
request(s).

---

## Product Architect Authorization

**Status:** ✅ **IMPLEMENTATION AUTHORIZED (2026-09-06).**

> I authorize implementation of
> `product-identity-existing-new-resolution-implementation-plan.md`
> exactly as accepted, strictly bounded by §3–7 of this document. This
> authorization does not extend to any scope not named in the accepted
> plan, and any discovery during implementation that the accepted plan
> is incomplete or inaccurate in a way affecting Decision A,
> A-Contagem, B2 Reading 2, or Concept C requires a return to
> governance review before proceeding — it is not to be resolved
> silently during implementation.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-06

---

## Governance State After This Authorization

```
Architectural Decisions — ACCEPTED
        ↓
Specification Amendment — ACCEPTED/APPLIED
        ↓
Targeted Rule 8 Re-check — READY FOR IMPLEMENTATION PLANNING
        ↓
Implementation Plan — ACCEPTED
        ↓
Implementation Plan Governance Review — PASSED
        ↓
Product Architect Acceptance — ACCEPTED
        ↓
IMPLEMENTATION AUTHORIZATION — AUTHORIZED  ◄── this document
        ↓
Implementation — NEXT STEP, NOT PERFORMED BY THIS DOCUMENT
```
