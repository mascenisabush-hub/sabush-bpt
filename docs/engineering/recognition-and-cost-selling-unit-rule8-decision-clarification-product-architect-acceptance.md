Acceptance Record

# Product Architect Acceptance — Rule 8 Decision Clarifications (A-Contagem / B2-Clarification / Concept C)

**Status:** ✅ **ACCEPTED AND SIGNED.** See §5, below. Acceptance covers
all three clarifications proposed in the Decision Clarification
Proposal referenced below, exactly as proposed. This acceptance does
**not** perform, resume, or complete Rule 8, does not authorize
implementation, and does not amend any specification.
**Prepared by:** Claude (Lead Software Engineer role, this repository),
recording an acceptance the Product Architect has already
communicated.
**Governs (originating proposal, preserved unchanged as the historical
proposal artifact — not itself amended by this acceptance):**
- [`docs/engineering/recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md)

**Full governance lineage this acceptance sits atop, each preserved
unamended:**
1. [`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md) — evidence investigation
2. [`product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md) — original Decision A / Decision B proposal
3. [`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md) — acceptance of Decision A and Decision B (Option B2)
4. [`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md) — Rule 8 Assessment, verdict READY AFTER DECISIONS
5. [`recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md) — the three clarifications this document accepts
6. **This document** — Product Architect acceptance of those three clarifications

**This is a subsequent acceptance event.** Artifacts 1–5 above are not
rewritten, and none is to be read as having anticipated or already
recorded this acceptance at the time each was originally created. This
document is the acceptance record for the clarifications specifically,
dated to today.

---

## 1. What This Acceptance Covers

Signing this record accepts, verbatim from the Decision Clarification
Proposal:

- **Decision A-Contagem** (Proposal §3) — the Product Recognition /
  Existing vs New principle extends to Contagem, without importing
  Supplier-Wording Recognition.
- **Decision B2-Clarification** (Proposal §4) — the accepted B2
  decision is interpreted according to **Reading 2**: no
  independently-entered competing selling bases in `StockBatch`; the
  existing `Product.unitRelationship` and approved derived-valuation
  mechanism are used within their defined boundaries instead.
- **Decision C** (Proposal §5) — Concept C remains a derived, frozen
  valuation snapshot, not an independent source of truth, not a
  Business Worth authority.

Signing this record does **not**:

- Perform, resume, or complete the Rule 8 Assessment against these
  clarifications — that remains the next, separate gate (§6, below).
- Authorize implementation, a schema change, a specification amendment,
  or an Implementation Plan/Authorization.
- Retroactively represent any of the five prior artifacts in this
  lineage as having been accepted, or as having anticipated this
  acceptance, at the time each was originally written — each is
  preserved exactly as it stands.

## 2. Decision A-Contagem — Accepted Wording

**ACCEPTED**, verbatim from the Decision Clarification Proposal §3.2:

> The Product Recognition / Existing vs New principle applies to
> Contagem.
>
> When Contagem cannot establish Product identity with sufficient
> confidence, the system must NOT silently create a new Product.
>
> The owner must retain explicit authority to resolve:
> - Existing Product, OR
> - New Product.
>
> Contagem SHALL NOT be required to use Supplier-Wording Recognition,
> because Contagem does not have the supplier context required by that
> mechanism.
>
> An appropriate owner-resolution mechanism may use Product identity
> information available within the owner's own business. It must:
> - not require supplier identity;
> - not require cross-business queries;
> - not automatically select an ambiguous Product.
>
> When the owner selects Existing Product:
> → resolve to that Product ID
> → retrieve applicable canonical Product Memory
> → continue using that Product's existing information
>
> When the owner selects New Product:
> → proceed with explicit new-product creation.

This establishes the architectural principle only. It does **not**
authorize fuzzy matching, AI matching, similarity thresholds,
barcode/SKU implementation, a particular UI, or a particular
candidate-ranking algorithm (Proposal §3.3, carried forward unchanged).

## 3. Decision B2-Clarification — Accepted Wording (Reading 2)

**ACCEPTED — SELECTED INTERPRETATION: READING 2**, verbatim from the
Decision Clarification Proposal §4.2:

> Purchase/cost unit and selling unit remain distinct business
> concepts.
>
> However, B2 does NOT authorize adding independently-entered
> competing selling bases directly to StockBatch.
>
> The existing canonical stock transaction representation shall be
> preserved.
>
> The architecture shall use the existing Product.unitRelationship and
> the approved derived-selling-valuation mechanism where appropriate to
> preserve the distinction between:
> - purchase/cost unit;
> - selling unit;
> - conversion relationship;
> - applicable price basis.
>
> The implementation must preserve:
> 1. purchase/cost unit semantics;
> 2. selling unit semantics;
> 3. conversion relationship;
> 4. applicable price basis;
> 5. historical interpretability.
>
> No competing source of truth may be introduced.

**B2 is therefore not interpreted as permission to reopen the
already-accepted governance rule concerning multiple selling bases at
purchase/receipt entry** (the Consolidated Specification's §4/§12/§13
and its signed Implementation Authorization, both identified by the
Rule 8 Assessment — neither is reopened or amended by this
acceptance). B2 is **not** reinterpreted as: independently-entered
competing selling bases in `StockBatch`; a UI-only preference; or
authorization to override existing signed governance (Proposal §4.3,
carried forward unchanged — this clarification does not make Concept C
the Product's universal operational pricing source; that remains
Decision C's own separate question, §4 below).

## 4. Decision C — Accepted Wording (Concept C Authority)

**ACCEPTED**, verbatim from the Decision Clarification Proposal §5.2:

> Concept C shall remain a derived, frozen valuation snapshot.
>
> It shall NOT become an independent Product Memory source of truth.
>
> It shall NOT override:
> - Product.sellingPrice;
> - Product.sellingUnit;
> - Product.unitRelationship;
>
> where those remain the canonical Product-level values.
>
> It shall NOT independently redefine the Business Worth calculation.
>
> It shall NOT be used to introduce a second financial valuation
> authority.
>
> Its purpose remains bounded to preserving the derived selling
> valuation associated with the transaction context for which the
> snapshot is calculated.
>
> Any future proposal to make Concept C operationally authoritative, or
> to make it influence Business Worth, must be a separate, explicit
> Product Architect decision and governance process.

**This acceptance does not authorize wiring Concept C into additional
application paths.** Any extension of Concept C's reach (e.g. to
`addStockBatch` or `recordStockCount`, as the Rule 8 Assessment noted
would be architecturally straightforward under Reading 2) remains a
separate implementation question, gated behind Rule 8 re-assessment
and, if needed, an Implementation Plan/Authorization — none of which
this document performs.

## 5. Product Architect Signature

> I accept all three decision clarifications proposed in the Rule 8
> Follow-Up Decision Clarification Proposal
> (`docs/engineering/recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`):
> Decision A-Contagem, exactly as proposed in that document's §3.2;
> Decision B2-Clarification, with **Reading 2** selected as proposed in
> §4.2; and Decision C, exactly as proposed in §5.2. This acceptance
> does not itself perform or complete Rule 8, and does not authorize
> implementation, a schema change, or a specification amendment. Rule 8
> must now be returned to and updated/re-performed against these
> clarified decisions before any further governance gate may be
> reached.

| Decision | Status | Detail |
|---|---|---|
| **A-Contagem** | ✅ **ACCEPTED** | Existing/New resolution principle applies to Contagem; Supplier-Wording Recognition not required |
| **B2-Clarification** | ✅ **ACCEPTED** | Selected interpretation: **READING 2** |
| **C (Concept C Authority)** | ✅ **ACCEPTED** | Concept C Authority: **DERIVED / FROZEN VALUATION SNAPSHOT ONLY** |

**Product Architect:** SABUSHIMIKE MASCENI

**Acceptance Date:** 2026-09-06

(Recorded identically for all three decisions, per the Decision
Clarification Proposal's own §9 acceptance-record structure.)

---

## 6. Governance Relationship

This acceptance does not stand alone — it is the sixth artifact in a
six-step lineage, each preserved exactly as written at the time of its
own creation:

1. Evidence Investigation (`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`)
2. Original Decision Proposal (Decision A / Decision B)
3. Product Architect Acceptance of Decision A and Decision B (Option B2)
4. Rule 8 Assessment — verdict READY AFTER DECISIONS
5. Rule 8 Decision Clarification Proposal
6. **This Product Architect Acceptance of the three clarifications**

None of artifacts 1–5 is rewritten, backdated, or reinterpreted as
having already recorded this acceptance. This is a subsequent
acceptance event, dated 2026-09-06, layered on top of an unmodified
prior record.

---

## 7. Governance Status After This Acceptance

```
Evidence Investigation
        ↓
Decision Proposal
        ↓
Product Architect Acceptance
        ↓
Rule 8 Assessment
        ↓
READY AFTER DECISIONS
        ↓
Decision Clarification Proposal
        ↓
PRODUCT ARCHITECT ACCEPTANCE — COMPLETE  ◄── this document
        ↓
RETURN TO RULE 8
        ↓
Implementation Planning — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**The acceptance of these three clarifications does not itself
authorize implementation.** Rule 8 must now be updated/re-performed
against the accepted clarifications — that re-assessment is not
performed by this document, and no Implementation Plan or
Implementation Authorization may be produced until it is complete.
