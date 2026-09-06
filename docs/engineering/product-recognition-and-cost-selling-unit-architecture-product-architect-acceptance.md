Acceptance Record

# Product Architect Acceptance — Product Recognition + Cost/Selling Unit Architecture

**Status:** ✅ **ACCEPTED AND SIGNED.** See §6, below. Acceptance
covers Decision A (Product Recognition and Existing/New Resolution) and
Decision B (Cost/Purchase Unit vs Selling Unit — **Option B2 selected**)
exactly as proposed in the Decision Proposal referenced below. This
acceptance does **not** authorize a Rule 8 Assessment, an
Implementation Plan, an Implementation Authorization, or any code,
schema, or specification change — all of these remain separate, later
gates.
**Prepared by:** Claude (Lead Software Engineer role, this repository),
recording an acceptance the Product Architect has already communicated,
against repository state at this session's clone of `main`.
**Governs (originating proposal, preserved unchanged as the historical
proposal artifact — not itself amended by this acceptance):**
- [`docs/engineering/product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md)

**Evidence base this proposal — and therefore this acceptance — sits
on top of, unamended:**
[`docs/engineering/RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md)

---

## 1. What This Acceptance Covers

Signing this record accepts:

- **Decision A**, exactly as stated in the Decision Proposal §4: when
  the system cannot establish product identity with sufficient
  confidence, it must not silently create a new Product; the owner
  must retain explicit Existing Product / New Product resolution
  authority.
- **Decision B**, with **Option B2 selected** (not B1, the Decision
  Proposal's own recommended-default-to-evaluate-first) — an explicit
  architectural commitment that purchase/cost unit and selling unit are
  distinct transaction concepts, to be represented as such.

Signing this record does **not**:

- Perform a Rule 8 Assessment against either decision.
- Produce or amend an Implementation Plan or Implementation
  Authorization.
- Change any Product, StockBatch, StockCount, or other schema.
- Change any recognition logic, Smart Stock Entry, Manual Stock Entry,
  Contagem, Product Memory, Concept C, Business Worth, or pricing
  behavior.
- Retroactively represent the original Decision Proposal as having
  been accepted at the time it was written — the proposal document
  itself is left unmodified and remains identifiable as a proposal,
  dated to its own original recording.

## 2. Decision A — Accepted Wording

**ACCEPTED**, verbatim from the Decision Proposal:

> When the system cannot establish product identity with sufficient
> confidence, it must NOT silently create a new Product.
>
> The owner must retain explicit authority to resolve the identity as:
> - Existing Product, OR
> - New Product.
>
> When an Existing Product is selected/resolved, the system must
> retrieve the applicable canonical Product Memory associated with that
> Product, including:
> - sellingPrice
> - sellingUnit
> - unitRelationship
>
> Automatic recognition remains permitted where confidence is
> sufficient.
>
> Supplier-Wording Recognition, Product Name Similarity, or other
> candidate mechanisms must not silently convert uncertainty into an
> incorrect Product identity.
>
> Ambiguous existing-product candidates remain subject to explicit
> owner resolution.

This restates the Decision Proposal's §4 principle and its answers to
Questions A1–A6 (all proposed as YES/NO exactly as there stated) as now
accepted, without expanding, narrowing, or reinterpreting any of them.
The Decision Proposal's own §4 boundary — that this does **not**
prescribe similarity algorithms, fuzzy-matching thresholds, AI model
behavior, UI layout, barcode/SKU implementation, migration, or
duplicate-merging behavior — remains exactly as stated and is carried
forward unchanged into this acceptance.

## 3. Decision B — Accepted Wording (Option B2)

**ACCEPTED — OPTION B2**, verbatim from the Decision Proposal:

> Purchase/cost unit and selling unit are distinct transaction
> concepts.
>
> The transaction architecture must explicitly preserve:
> - purchase/cost unit;
> - selling unit;
> - the conversion relationship between them;
> - the applicable price basis for each unit.
>
> This decision is intended to prevent loss or ambiguity when a
> product is purchased in one unit and sold in another.

This is an explicit selection of **Option B2** (Decision Proposal §5)
over Option B1 (the proposal's own recommended default to evaluate
first, §6) and over Option B3. B1 is **not** substituted for B2 in this
acceptance, Decision B is **not** left pending, and B2 is **not**
reinterpreted here as a UI preference — it is accepted as an
architectural commitment governing the transaction data model.

The Decision Proposal's governing principle (§5) — that the Product's
canonical `unitRelationship` remains the source of truth for conversion
between related units, and that the architecture must preserve enough
information to answer both "what unit was this stock acquired/entered
in?" and "what unit is this product sold in?" without losing the
relationship between them — is carried forward unchanged as the
framing this B2 selection operates within.

## 4. What Happens Immediately After Signing

Per the Decision Proposal §7: Decision A and Decision B (as accepted,
with B2 selected) must be incorporated into the appropriate governance
artifacts, and a **Rule 8 Assessment specifically against the accepted
decisions** must then be performed — determining whether existing
specifications permit the decisions, whether specification amendments
are required, whether the implementation remains bounded, and every
other item the Decision Proposal's §7 lists. Only after Rule 8 is
resolved should an Implementation Plan and Implementation Authorization
be produced or updated.

**This acceptance does not itself perform, begin, or authorize Rule 8.**
Rule 8 remains a separate, later, explicitly-triggered step.

## 5. Repository Safety Confirmation

Performed before and after recording this acceptance:

| Check | Result |
|---|---|
| Original Decision Proposal document read and left unmodified | ✅ Confirmed |
| No Product, StockBatch, StockCount, or other schema file touched | ✅ Confirmed |
| No recognition, Smart Stock Entry, Manual Stock Entry, Contagem, Product Memory, Concept C, Business Worth, or pricing source file touched | ✅ Confirmed |
| No specification silently amended | ✅ Confirmed — no file under `docs/specs/` was created or modified by this acceptance |
| No Rule 8 Assessment performed or created | ✅ Confirmed |
| No Implementation Plan or Implementation Authorization created | ✅ Confirmed |
| Only this new acceptance-record file created under `docs/engineering/` | ✅ Confirmed — see `git status --short` in the session record |

## 6. Product Architect Signature

> I accept both decisions from the Product Recognition + Cost/Selling
> Unit Architecture Decision Proposal
> (`docs/engineering/product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`).
> I accept Decision A exactly as proposed in that document's §4. For
> Decision B, I select **Option B2** (§5) — purchase/cost unit and
> selling unit are distinct transaction concepts, to be explicitly
> preserved as such, together with their conversion relationship and
> applicable price basis for each unit — not Option B1 or Option B3.
> This acceptance does not authorize Rule 8, an Implementation Plan,
> an Implementation Authorization, or any code, schema, or
> specification change; those remain separate, later governance gates.

Decision A: I ACCEPT

Decision B: I ACCEPT — **B2**

**Product Architect:** SABUSHIMIKE MASCENI

Date: 2026-09-06

This acceptance closes the Product Architect Decision Proposal gate for
both decisions. It authorizes proceeding to a Rule 8 Assessment against
the accepted decisions as a next, separate step — it does not perform
that Rule 8 Assessment itself, and no further governance or
implementation step may proceed until that Rule 8 Assessment is
separately requested and completed.

---

## 7. Governance Status After This Acceptance

```
Evidence Investigation
        ↓
Product Architect Decision Proposal
        ↓
PRODUCT ARCHITECT ACCEPTANCE — COMPLETE  ◄── this document
        ↓
RULE 8 ASSESSMENT — PENDING
        ↓
Specification Amendment — ONLY IF RULE 8 REQUIRES IT
        ↓
Implementation Planning — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**Implementation remains NOT authorized by this document.**
**Rule 8 remains PENDING and is not performed by this document.**
