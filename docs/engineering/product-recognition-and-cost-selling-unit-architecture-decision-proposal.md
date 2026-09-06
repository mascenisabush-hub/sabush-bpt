Product Architect Decision Proposal

# Product Recognition + Cost/Selling Unit Architecture

**GOVERNANCE STATUS: DECISION PROPOSAL — PENDING PRODUCT ARCHITECT ACCEPTANCE.**
Neither Decision A nor Decision B below is accepted. Nothing in this
document authorizes implementation, Rule 8, or Implementation
Authorization. This document does not itself amend any specification,
schema, or code.

**IMPLEMENTATION: NOT AUTHORIZED**
**RULE 8: NOT YET PERFORMED**
**IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED**
**COMMIT/PUSH: NOT AUTHORIZED**

---

## 1. Purpose

We have completed two investigation stages concerning a specific
SABUSH BPT product-integrity problem:

A. Product recognition and Product Memory retrieval
B. Cost/purchase unit versus selling unit representation

The investigations established evidence about the current system.

This document is **not** an implementation plan. It is a Product
Architect Decision Proposal intended to resolve the architectural
questions identified by the investigations.

Do not implement anything as part of this task.

---

## 2. Evidence Base

The decision must be based on the completed investigation evidence,
including the follow-up investigation:

`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`

Key verified findings:

1. Product Memory is not generally being lost from Product records.
   Existing sellingPrice, sellingUnit and unitRelationship information
   can be retrieved when the relevant Product is successfully recognized.
2. Automatic product recognition remains narrow. The general automatic
   recognition path is exact-name based.
3. Supplier-Wording Recognition and Product Name Similarity exist, but
   they do not constitute a universal existing-product resolution
   mechanism.
4. Contagem does not currently have the same owner-reviewed candidate
   recognition mechanism used by Add Stock.
5. When recognition fails, finalization can create a new Product rather
   than requiring the owner to explicitly distinguish an existing
   product from a genuinely new product.
6. Consequently, an existing Product's remembered selling-unit,
   selling-price and unit-relationship information can remain intact
   while being inaccessible because the incoming item was not matched
   to that Product.
7. Concept C (`StockBatchDerivedSellingValuation` /
   `buildDerivedSellingValuationSnapshot`) is currently reachable only
   through `addMultipleStockBatches`.
8. Concept C is not currently reached by single-item `addStockBatch` or
   `recordStockCount`.
9. Concept C's calculation is covered by existing tests, but the
   resulting derived valuation is not currently consumed by the
   application as an operational input to the relevant recognition,
   pricing, or editing path.
10. The investigation did **not** establish real-world recognition
    failure frequency. Static repository evidence can establish
    possible behavior, but not actual usage frequency without
    telemetry, logs, or equivalent empirical evidence.
11. The investigation also did **not** authorize a solution for the
    cost-unit/selling-unit representation question.

Use these findings as evidence, not as assumptions to be expanded.

---

## 3. Governing Principle

The objective is **not** to redesign SABUSH BPT.

The objective is to eliminate ambiguity in two specific areas while
preserving the existing Business Philosophy, Business Worth model,
Product Memory model, and established governance chain.

The system must favor:

- product identity integrity;
- preservation and reuse of remembered product information;
- explicit owner control when identity is uncertain;
- prevention of silent duplicate products;
- deterministic unit/price behavior;
- auditability;
- tenant isolation;
- compatibility with existing architecture;
- minimal necessary change.

Do not solve one decision by silently changing the other.

**Decision A and Decision B are independent.**

---

## 4. Decision A — Product Recognition and Existing/New Resolution

### Problem Statement

The current system can fail to recognize an incoming item that
corresponds to an existing Product.

When this occurs, Product Memory is not available through the
recognized-product path.

More importantly, the finalization flow can create a new Product
without first requiring the owner to explicitly confirm whether the
item represents:

1. an existing Product, or
2. a genuinely new Product.

This creates a product-identity integrity risk.

### Proposed Product Architect Decision A

Adopt the following principle:

> WHEN THE SYSTEM CANNOT ESTABLISH PRODUCT IDENTITY WITH SUFFICIENT
> CONFIDENCE, IT MUST NOT SILENTLY CREATE A NEW PRODUCT.

Instead, the owner must retain explicit authority to resolve the
identity.

The intended conceptual resolution is:

```
INCOMING ITEM
    ↓
AUTOMATIC RECOGNITION
    ↓
IF CONFIDENT MATCH
    → EXISTING PRODUCT
    → retrieve/apply Product Memory

IF NOT CONFIDENT
    ↓
OWNER RESOLUTION
    ↓
    EXISTING PRODUCT
       OR
    NEW PRODUCT
```

The owner-resolution mechanism must not be interpreted as requiring the
system to ask the owner for every product on every entry.

Automatic recognition should continue where confidence is sufficient.

The owner intervention exists specifically for unresolved identity.

### Decision A Questions for Acceptance

The Product Architect is asked to decide:

**A1.** Should unresolved product identity be prevented from silently
creating a new Product?
**PROPOSED ANSWER: YES.**

**A2.** Should the owner be given an explicit Existing Product / New
Product resolution when automatic recognition cannot establish
identity?
**PROPOSED ANSWER: YES.**

**A3.** Should the principle apply to:
- Smart Stock Entry
- Manual Stock Entry
- Contagem

**PROPOSED ANSWER: YES, as a product-integrity principle.**
However, the exact UI and workflow may differ by module where
necessary. This decision establishes the behavior principle, not the
final UI design.

**A4.** When an existing Product is selected/resolved, should the
system then retrieve the canonical Product Memory already associated
with that Product, including applicable:
- sellingPrice
- sellingUnit
- unitRelationship

**PROPOSED ANSWER: YES.**
The system should not require the owner to manually re-enter
information that already exists on the resolved Product unless an
explicit product update is being performed.

**A5.** Should Product Name Similarity or Supplier-Wording candidates
become authoritative automatic identity decisions?
**PROPOSED ANSWER: NO.**
They may continue to assist recognition and owner resolution, but a
candidate mechanism must not silently convert uncertainty into a new
Product or an incorrect Product identity.

**A6.** Should the system preserve explicit owner control when
multiple plausible existing Products exist?
**PROPOSED ANSWER: YES.**
The system should not arbitrarily choose among ambiguous Products.

### Decision A Boundary

This decision does **not** yet prescribe:

- exact similarity algorithms;
- fuzzy matching thresholds;
- AI model behavior;
- exact UI layout;
- barcode implementation;
- SKU implementation;
- database migration;
- duplicate-merging behavior.

Those are implementation/specification questions that must be
addressed after this architectural decision and through the subsequent
governance gates.

---

## 5. Decision B — Cost/Purchase Unit vs Selling Unit

### Problem Statement

The investigation established that the current stock representation
has a structural limitation around unit representation.

The relevant stock-entry path can operate with a stock-batch unit while
selling information may conceptually belong to another unit.

Concept C exists and calculates a derived selling valuation, but the
investigation established that it is currently not an operational
consumer of the relevant pricing/editing path.

Therefore, the existence of Concept C must **not** be interpreted as
proof that the system already resolves the architectural question.

### Proposed Product Architect Decision B

Before implementation, explicitly establish that:

> COST/PURCHASE UNIT AND SELLING UNIT ARE DISTINCT BUSINESS CONCEPTS,
> EVEN WHEN THEY CAN BE REPRESENTED THROUGH A UNIT RELATIONSHIP.

The Product's canonical unit relationship remains the source of truth
for conversion between related units.

The architecture must preserve enough information to answer both:

1. "What unit was this stock acquired/entered in?"
2. "What unit is this product sold in?"

without losing the relationship between them.

The Product Architect must now decide which of the following
architectural models is the governing model.

### Option B1 — Canonical Stock Unit + Derived Selling Value

Stock remains represented using one canonical stock unit.

The Product's `unitRelationship` converts between stock unit and
selling unit.

Selling valuation can be derived from that relationship.

Concept C could remain a frozen derived valuation/audit snapshot rather
than becoming the operational source of truth.

**Advantages:**
- minimal structural change;
- preserves the current stock model;
- leverages existing `unitRelationship`;
- avoids duplicating authoritative unit information.

**Risk:**
- UI and operational logic must consistently resolve selling-unit
  values from the canonical stock representation.

### Option B2 — Explicit Separation of Cost/Purchase Unit and Selling Unit

A stock transaction explicitly records:

- purchase/cost unit;
- selling unit;
- relationship/conversion between them;
- applicable prices.

This would allow both dimensions to be represented directly.

**Advantages:**
- clearer transaction semantics;
- eliminates ambiguity when purchase and selling units differ;
- potentially easier for users to understand.

**Risk:**
- larger data-model and implementation impact;
- migration/backward-compatibility implications;
- requires careful governance to avoid conflicting sources of truth.

### Option B3 — Other

If the Product Architect determines that neither B1 nor B2 correctly
represents SABUSH BPT's business philosophy, another architecture may
be proposed.

It must explicitly define:

- authoritative source of truth;
- cost unit;
- selling unit;
- conversion relationship;
- price basis;
- historical behavior;
- interaction with Product Memory;
- interaction with stock batches;
- interaction with Contagem;
- interaction with Business Worth.

---

## 6. Proposed Product Architect Position

The proposed position is:

**DECISION A:** ACCEPT the explicit Existing Product / New Product
resolution principle.

**DECISION B:** DO NOT yet authorize implementation of either B1 or B2
until the Product Architect explicitly selects the governing
representation.

For Decision B, the recommended default to evaluate first is B1
because it is the smaller architectural change and preserves the
existing `Product.unitRelationship` model.

However: **THIS IS A PROPOSAL, NOT AN ACCEPTED DECISION.**

Do not treat B1 as approved until the Product Architect explicitly
accepts it.

---

## 7. Governance Consequences

After Product Architect acceptance:

Decision A and Decision B must be incorporated into the appropriate
governance artifacts.

Then perform a Rule 8 Assessment specifically against the accepted
decisions.

The Rule 8 Assessment must determine:

- whether existing specifications permit the decisions;
- whether specification amendments are required;
- whether the implementation remains bounded;
- whether tenant isolation remains intact;
- whether Product Memory remains canonical;
- whether historical stock data remains valid;
- whether existing valuation/business-worth behavior is preserved;
- whether migration is required;
- whether backward compatibility is preserved;
- whether implementation can proceed without redesign.

Only after Rule 8 is resolved should an Implementation Plan and
Implementation Authorization be produced/updated as required.

---

## 8. Important Non-Decisions

This proposal does **not** authorize:

- coding;
- changing recognition algorithms;
- fuzzy matching;
- AI matching expansion;
- barcode/SKU implementation;
- changing Product Memory schema;
- changing StockBatch schema;
- changing Contagem;
- changing Smart Stock Entry;
- changing Manual Stock Entry;
- changing Concept C;
- changing Business Worth calculations;
- changing Product unit relationships;
- migrations;
- duplicate merging;
- UI implementation.

These remain downstream work.

---

## 9. Acceptance Record

**PRODUCT ARCHITECT DECISION A:**

`[ PENDING ACCEPTANCE ]`

Decision: Unresolved product identity must not silently create a new
Product. The owner must retain explicit Existing Product / New Product
resolution.

Product Architect: SABUSHIMIKE MASCENI
Date: `[ PENDING ]`

**PRODUCT ARCHITECT DECISION B:**

`[ PENDING ACCEPTANCE ]`

Selected architecture: `[ B1 / B2 / B3 / PENDING ]`

Decision: `[ To be completed by Product Architect ]`

Product Architect: SABUSHIMIKE MASCENI
Date: `[ PENDING ]`

---

## 10. Governance Status

```
CURRENT STATUS:

PRODUCT ARCHITECT DECISION PROPOSAL
    ↓
PENDING ACCEPTANCE
    ↓
RULE 8 — NOT YET AUTHORIZED
    ↓
IMPLEMENTATION — NOT AUTHORIZED
```

Do not proceed beyond this gate until explicit Product Architect
acceptance is recorded.
