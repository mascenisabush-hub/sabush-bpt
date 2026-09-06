Product Architect Decision Clarification Proposal

# Rule 8 Follow-Up: Decision A / B2 / Concept C

**GOVERNANCE STATUS: DECISION CLARIFICATION PROPOSAL — PENDING PRODUCT
ARCHITECT ACCEPTANCE.**
None of the three clarifications below is accepted. Nothing in this
document authorizes implementation, resumes or performs Rule 8, or
amends any specification.

**IMPLEMENTATION: NOT AUTHORIZED**
**RULE 8: PAUSED PENDING THESE DECISIONS**
**SPECIFICATION AMENDMENT: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**
**COMMIT/PUSH: NOT AUTHORIZED**

---

## 1. Purpose

The Rule 8 Assessment —
[`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md)
— returned:

> RULE 8 VERDICT: READY AFTER DECISIONS

Three unresolved architectural questions must now be resolved by the
Product Architect before Rule 8 can be finalized:

1. The precise interpretation of accepted Decision B2.
2. The mechanism by which Decision A applies to Contagem.
3. The authority and permitted downstream use of Concept C.

This document is a **decision proposal only**. Do not implement
anything.

---

## 2. Governing Evidence

The following artifacts are authoritative inputs:

- [`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md)
- [`product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md)
- [`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md)
- [`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md)
- All previously accepted/signed specifications and governance
  artifacts identified by the Rule 8 Assessment.

The Rule 8 Assessment established:

A. Decision A is architecturally sound in its core principle.
B. Extending Decision A to Contagem is not fully specified, because
   Contagem does not have the supplier concept used by the existing
   Supplier-Wording Recognition mechanism.
C. Decision B2 admits two materially different interpretations.
D. One interpretation would conflict with already-accepted governance
   that prohibits multiple selling bases at purchase/receipt entry.
E. The existing Concept C mechanism already calculates and stores a
   derived selling valuation and is already tested.
F. Concept C currently has no operational application consumer in the
   relevant application paths.
G. Tenant isolation is currently business-scoped through
   `businesses/{businessId}/products`.
H. The Rule 8 Assessment did not authorize any implementation.

---

## 3. Decision Clarification A — Product Recognition in Contagem

### 3.1 Problem

Decision A established: when product identity cannot be established
with sufficient confidence, the system must not silently create a new
Product. The owner must be able to resolve Existing Product or New
Product.

The question is how this principle should apply to Contagem. Contagem
does not have the supplier context required by Supplier-Wording
Recognition. Therefore, importing the existing supplier-wording
mechanism into Contagem would be architecturally inappropriate unless
separately authorized.

### 3.2 Proposed Decision

**DECISION A-CONTAGEM:**

Decision A shall apply to Contagem as a **product identity principle**,
but Contagem shall not be required to use Supplier-Wording Recognition.

Where Contagem cannot establish the Product identity from its existing
authoritative information, the owner must receive an explicit Existing
Product / New Product resolution path.

The mechanism used to present candidate existing Products may use only
Product identity information available within the owner's own
business. It must not require supplier identity. It must not require
cross-business queries. It must not automatically select an ambiguous
Product.

If the owner selects Existing Product:
- resolve to that Product ID;
- retrieve applicable canonical Product Memory;
- continue using that Product's existing information.

If the owner selects New Product:
- proceed with explicit new-product creation.

### 3.3 Boundary

This decision does **not** specify:

- fuzzy matching algorithm;
- AI model;
- similarity threshold;
- UI design;
- search ranking;
- exact candidate count;
- barcode/SKU behavior.

Those remain downstream specification/implementation questions.

### 3.4 Proposed Acceptance

**PRODUCT ARCHITECT DECISION A-CONTAGEM: ACCEPT.**

---

## 4. Decision Clarification B — Interpretation of Accepted B2

### 4.1 Problem

Decision B2 was accepted as: "Purchase/cost unit and selling unit are
distinct transaction concepts."

The Rule 8 Assessment established that this wording can be interpreted
in two different ways.

**Reading 1:** Add independently entered purchase-unit and
selling-unit fields directly to the transaction/`StockBatch`. This
conflicts with already-accepted governance prohibiting multiple
selling bases at purchase/receipt entry. Therefore Reading 1 must not
be adopted unless the existing signed governance is deliberately
reopened through a separate formal process.

**Reading 2:** Preserve the existing canonical stock transaction
representation while using the existing unit relationship and Concept
C derived selling valuation to preserve the distinction between
purchase/cost unit, selling unit, conversion relationship, and price
basis. This does not require creating a second, competing
selling-basis authority inside `StockBatch`.

### 4.2 Proposed Decision

The accepted B2 decision shall be interpreted according to **Reading
2**.

Therefore: B2 does **not** authorize adding independently-entered
competing selling bases directly to `StockBatch`. Instead, the
architecture shall preserve the conceptual distinction between
purchase/cost unit and selling unit through the existing
`Product.unitRelationship` and the approved derived-selling-valuation
mechanism where appropriate.

The implementation must preserve:

1. purchase/cost unit semantics;
2. selling unit semantics;
3. conversion relationship;
4. applicable price basis;
5. historical interpretability.

No competing source of truth may be introduced.

### 4.3 Important

This clarification does **not** mean that Concept C automatically
becomes the Product's universal operational pricing source. Concept
C's authority is separately resolved in Decision Clarification C.

### 4.4 Proposed Acceptance

**PRODUCT ARCHITECT DECISION B2-CLARIFICATION: ACCEPT.**

---

## 5. Decision Clarification C — Concept C Authority

### 5.1 Problem

Concept C (`StockBatchDerivedSellingValuation` /
`buildDerivedSellingValuationSnapshot`) already exists. The Rule 8
Assessment established that its calculation is tested, it is reached
in one existing stock-entry path, and it is not currently consumed
operationally by the relevant application paths.

Therefore the architecture must explicitly establish whether Concept C
is: (A) purely derived/audit information; (B) an operational selling
valuation source; or (C) both, under carefully defined conditions.

### 5.2 Proposed Decision

**Concept C shall remain a derived, frozen valuation snapshot.**

It shall **not** become an independent Product Memory source of truth.

It shall **not** override:
- `Product.sellingPrice`;
- `Product.sellingUnit`;
- `Product.unitRelationship`;

where those remain the canonical Product-level values.

It shall **not** independently redefine the Business Worth calculation.

It shall **not** be used to introduce a second financial valuation
authority.

Its purpose remains bounded to preserving the derived selling valuation
associated with the transaction context for which the snapshot is
calculated.

Any future proposal to make Concept C operationally authoritative, or
to make it influence Business Worth, must be a separate, explicit
Product Architect decision and governance process.

### 5.3 Proposed Acceptance

**PRODUCT ARCHITECT DECISION C: ACCEPT.**

---

## 6. Combined Architectural Position

If all three proposals are accepted, the governing position becomes:

**Product Identity:** Automatic recognition remains permitted. When
identity is unresolved, the owner chooses Existing Product or New
Product. No silent duplicate creation.

**Contagem:** The same identity-integrity principle applies.
Supplier-Wording Recognition is not imported merely because Decision A
applies to Contagem.

**B2:** Purchase/cost unit and selling unit remain distinct business
concepts. B2 does not authorize competing independent selling bases
inside `StockBatch`. The existing unit relationship and approved
derived valuation mechanism are used within their defined
architectural boundaries.

**Concept C:** Derived/frozen snapshot only. Not a competing Product
Memory source of truth. Not an independent Business Worth authority.

---

## 7. What These Decisions Do Not Authorize

Even if accepted, these decisions do **not** authorize implementation.
They do not authorize:

- schema changes;
- recognition changes;
- Contagem UI changes;
- Smart Stock Entry changes;
- Manual Stock Entry changes;
- Product Memory changes;
- Concept C wiring;
- Business Worth changes;
- migrations;
- fuzzy matching;
- AI matching;
- barcode/SKU matching;
- specification amendments.

Those require subsequent governance stages.

---

## 8. Next Governance Gate

If the Product Architect accepts all three clarifications:

Return to the Rule 8 Assessment. The Rule 8 Assessment must be
updated/re-performed against the clarified decisions. The updated
Rule 8 must determine:

- whether the architecture is now internally consistent;
- whether any specification amendment is actually required;
- whether historical data remains safe;
- whether implementation scope is bounded;
- whether tenant isolation remains intact;
- whether there are remaining Product Architect decisions.

Only after Rule 8 reaches an appropriate final state may the process
advance to Implementation Planning.

---

## 9. Acceptance Record

**PRODUCT ARCHITECT DECISION A-CONTAGEM:**

`[ PENDING ACCEPTANCE ]`

Product Architect: SABUSHIMIKE MASCENI
Date: `[ PENDING ]`

**PRODUCT ARCHITECT DECISION B2-CLARIFICATION:**

`[ PENDING ACCEPTANCE ]`

Selected interpretation: READING 2

Product Architect: SABUSHIMIKE MASCENI
Date: `[ PENDING ]`

**PRODUCT ARCHITECT DECISION C:**

`[ PENDING ACCEPTANCE ]`

Concept C status: DERIVED / FROZEN VALUATION SNAPSHOT ONLY

Product Architect: SABUSHIMIKE MASCENI
Date: `[ PENDING ]`

---

## 10. Governance Status

```
Rule 8 Assessment — READY AFTER DECISIONS
        ↓
DECISION CLARIFICATION PROPOSAL — PENDING ACCEPTANCE  ◄── this document
        ↓
Rule 8 — PAUSED, to be updated/re-performed once clarifications are accepted
        ↓
Implementation Planning — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

Do not proceed beyond this gate until explicit Product Architect
acceptance of all three clarifications is recorded.
