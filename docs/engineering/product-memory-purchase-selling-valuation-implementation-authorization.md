Implementation Authorization

# Implementation Authorization — Product Memory, Purchase-to-Selling Conversion & Receipt Recognition Workflow

**Status:** ✅ **Authorized. Signed by the Product Architect** — see §6, below.

**Governing chain:** [`product-memory-purchase-selling-valuation-specification.md`](../specs/product-memory-purchase-selling-valuation-specification.md) (✅ Accepted) → [`product-memory-purchase-selling-valuation-rule8-assessment.md`](./product-memory-purchase-selling-valuation-rule8-assessment.md) (Overall Verdict: feasible, all findings Rule-8-resolvable, no new Product Architect decision required).

---

## 1. What This Authorization Covers

Per Rule 8 Finding 5, this authorization is structured as **two sequenced increments**, since Increment B is technically dependent on Increment A's data model existing first.

### Increment A — UOM & Product Memory Data Model (prerequisite)

- Add `Product.unitRelationship` (ordered `{unit, factorFromPrevious}[]` chain, `sellingUnit`, `confirmedAt`) per the accepted UOM Specification's §2 "Model B."
- Build the Recognition proposal-then-confirm flow (UOM Specification §3).
- Wire Add Stock / Initial Stock / Periodic Contagem / Smart Stock Entry prefill and warn-not-block behavior per UOM Specification §4, §7, §9.
- **This increment is the accepted UOM Specification's own implementation** — it is not new business logic invented by the Consolidated Specification or this Rule 8 Assessment; it is the already-accepted-but-unbuilt prerequisite Finding 5 identified.

### Increment B — Consolidated Specification §§8, 13–17

- §8: client-side one-at-a-time unresolved-receipt-line sequencing, ahead of full-receipt review (Rule 8 Finding 6).
- §13: system-derived transaction valuation (Concept C) — automatic multi-hop conversion, computed once at batch-commit time, written to `StockBatch.derivedSellingValuation` (Rule 8 Finding 2, revised). **Concept C is never read by `calculateBatch`, the Embedded Profit Engine, Business Worth, or any Dashboard/Report KPI — it exists solely as a transaction-scoped, informational figure**, consistent with the Consolidated Specification's own §24 non-goal (no second, competing Business Worth calculation).
- §14: frozen historical derived valuation — a new, fully separate `StockBatch.derivedSellingValuation` structure (`ratePerPurchaseUnit`, `sellingUnit`, `sellingUnitPrice`, `unitRelationshipSnapshot`, `derivedAt`), governed by `costPrice`'s existing immutability discipline. **`StockBatch.sellingPrice` and `StockBatch.costPrice` are unconditionally unchanged in meaning and usage — neither is read, written, or interpreted differently by anything in this increment** (Rule 8 Finding 1, revised).
- §15: no change to `calculateBatch`, `groupQuebrasByBatch`, or any existing quebra-handling code — a new, separate `calculateDerivedTransactionValuation` function reuses the existing live remaining-quantity computation against the frozen `ratePerPurchaseUnit` (Rule 8 Finding 3, revised).
- §16–17: no schema change — confirmed already-supported by existing per-row Stock Count data model; UI-grouping work only, explicitly excluded from triggering `POL-0003`-style duplicate-product detection (Rule 8 Finding 4). **This capability is exclusive to Initial Stock and Periodic Contagem valuation. It does NOT apply to, and must NOT be implemented for, purchase receipt/Add Stock/Smart Stock Entry.** A purchase/receipt line for a product uses exactly one selling basis — the product's single confirmed Product Memory selling unit and remembered selling price (Consolidated Specification §13) — and never splits into multiple, differently-valued portions. Nothing in this increment authorizes multiple selling-unit or multiple-valuation-portion behavior on any purchase/receipt-entry surface.
- **§19 is explicitly excluded from this authorization**, exactly as the Consolidated Specification and Rule 8 Assessment both require. No work toward a selling-basis Initial Capital display may be performed under this authorization.

**Sequencing:** Increment B may not begin until Increment A is complete and merged, per Rule 8 Finding 5. **This authorization signs both increments together, with Increment B strictly gated on completion and merge of Increment A** — per the Product Architect's explicit signed decision (§6, below): *"Increment A and Increment B are authorized together, with Increment B gated on completion and merge of Increment A."*

## 2. What This Authorization Does Not Cover

- `BDR-0012` §5.A Item 7 (historical-data posture) remains explicitly open — no migration or backfill of any kind is authorized.
- `BDR-0013` item 9 (historical duplicate products) remains explicitly out of scope.
- §19 (Initial Capital selling-basis display) — requires its own separate BDR/amendment before any Specification, Rule 8, or implementation work.
- `POL-0006`'s open point (temporary relationship-factor substitution) remains unresolved and unauthorized.
- Any AI/OCR provider or model selection, similarity algorithm, or confidence threshold beyond what `POL-0003`/`POL-0007` already fix.
- **Multiple selling units, or multiple/mixed valuation price bases for the same product, on any purchase/receipt-entry surface (Add Stock, Smart Stock Entry).** This capability exists only for Initial Stock and Periodic Contagem (Consolidated Specification §16–17) and is not, under any interpretation, authorized for purchase/receipt entry, which remains governed exclusively by the single confirmed Product Memory selling unit and remembered selling price (§13). No implementation work under this authorization may introduce receipt-entry multi-portion or multi-selling-unit behavior of any kind.

## 3. Risk Acknowledgment

- Increment A carries the same, previously-acknowledged valuation risk for pre-existing stock that `BDR-0012` §5.A Item 1 already carries forward explicitly — this authorization does not reopen or re-litigate that risk, only proceeds with it as already accepted.
- Increment B's Finding 1 storage choice — introducing the separate `StockBatch.derivedSellingValuation` structure while leaving `StockBatch.sellingPrice` completely unchanged — is a deliberate technical boundary that preserves the existing meaning of `sellingPrice` and prevents Concept C from being conflated with ordinary batch selling-price data.

## 4. Testing Boundary (carried into Implementation Plan)

At minimum: derivation correctness across multi-hop chains and both directions (§13); freeze behavior under a subsequent Product Memory change (§14); quebra-then-valuation correctness against a live remaining quantity (§15); multi-row same-product Stock Count valuation summation (§16); and the one-at-a-time unresolved-line sequencing not permitting full-receipt review until the queue is empty (§8).

## 5. Rollback / Reversibility

Every field this authorization introduces is additive and optional (`StockBatch.derivedSellingValuation?`, `Product.unitRelationship?`) — a rollback requires no destructive migration of existing data, consistent with this codebase's established backward-compatibility pattern for every prior amendment in this lineage.

---

## 6. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Authorization decision (verbatim):**
> "Increment A and Increment B are authorized together, with Increment B gated on completion and merge of Increment A."

**Confirmed as part of this signature:**

- [x] **Increment A is authorized.** (UOM & Product Memory Data Model — the accepted UOM Specification's own implementation.)
- [x] **Increment B is authorized.** (Consolidated Specification §§8, 13–17, as resolved by the companion Rule 8 Assessment.)
- [x] **Increment B is strictly gated on completion and merge of Increment A** — Increment B implementation work may not begin until Increment A is complete and merged into `main`.
- [x] **§19 remains excluded**, exactly as stated in §2 above. No work toward a selling-basis Initial Capital display is authorized by this signature.
- [x] **No other scope change is required.** This authorization covers exactly what §1–§5 of this document describe, with the architectural corrections recorded in the governing Rule 8 Assessment (`StockBatch.derivedSellingValuation` as the separate Concept C structure; `StockBatch.sellingPrice` retains its existing meaning and usage, unconditionally; no `sellingPriceSource`/provenance-tag architecture; the §16–17 mixed-valuation capability is exclusive to Initial Stock/Periodic Contagem and does not apply to purchase receipt/Add Stock/Smart Stock Entry).

*(This signature grants implementation authority for Increment A immediately, and for Increment B only upon Increment A's completion and merge, per the sequencing above. It does not itself constitute the start of implementation work — see the governance-recording instructions under which this document was filed.)*

---

**This document, as signed, authorizes implementation strictly per the sequencing in §6. No code has been written, and no schema or `firestore.rules` change has been made, as of the filing of this signed authorization. A separate implementation execution step is required to actually begin Increment A.**
