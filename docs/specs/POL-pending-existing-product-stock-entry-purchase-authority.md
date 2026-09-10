Decision Record

# POL-pending-existing-product-stock-entry-purchase-authority — Existing-Product Stock Entry Purchase Authority Policy

**Status:** ACCEPTED. Explicitly unnumbered — no `POL-NNNN` identifier is assigned to this record.

**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an already-approved Business Decision Record (`BDR-0012` §3) for one specific, named surface — the Add Stock / Stock Entry purchase-cost and purchase-unit fields, existing-product case only. Does not decide new strategic philosophy; the philosophy this record operationalizes was already decided and approved before this record was drafted.

**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace `POL-0001`–`POL-0014` already occupy, following the same filing pattern `POL-0004`/`POL-0005` established for a Policy operationalizing `BDR-0012`.

**Sequencing note:** No `POL-NNNN` identifier is assigned by this record. Per the Numbering Ledger addendum's own assignment-authority rule (`19-governance-bdr-policy-framework.md`, restated verbatim in `POL-0010`'s header and `POL-0011`'s "Sequencing note," exercised again in `POL-pending-selling-price-unit-invariant-amendment.md`), assignment requires an explicit Product Architect decision, made each time, and is never inferred from repository state or the highest previously-assigned number. Direct inspection at drafting time confirmed `POL-0001`–`POL-0014` are all currently assigned with no gap, making `POL-0015` the next collision-free slot *by observation only* — this document does not claim that number. Filed under a descriptive working title, mirroring the precedent `POL-pending-business-worth-evolution-policy.md` and `POL-pending-selling-price-unit-invariant-amendment.md` already established in this repository for the same situation, pending a future, separate, explicit numbering decision.

**Depends on:**
- [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Approved) §3, "Product Identity vs Product Memory vs Historical Facts" — the governing rule this record operationalizes, quoted in full below.
- [`POL-0005`](./POL-0005-minimum-product-configuration.md) — "Product Identity, Unit Relationship, Confirmed Product Memory, Purchase Facts, and Stock-Count Facts — Kept Distinct," which already restates the same purchase-facts/Product-Memory separation for a different operational question (minimum configuration) and is not reopened by this record.
- [`POL-0004`](./POL-0004-purchase-cost-interpretation.md) — governs *what a stated purchase cost figure means* (per-unit vs. total); unaffected by and not reopened by this record, which governs *where the figure that populates the active field is allowed to come from*, a distinct question.
- [`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](./decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md) ("§45," ✅ Accepted and Signed, 30 August 2026) — §11/§12 ("Cost/Cost Unit remain purchase-workflow-owned"), FR-85 (independent write authorities), FR-86 (`Product.costPrice` forward-maintenance from purchase activity), FR-87/FR-88 (Product Catalog surface, Cost/Cost Unit read-only there). This record is consistent with, does not contradict, and does not reopen any of §45's FRs — see "Reconciliation," below.

**Followed by:** Not yet drafted, not derived by this record. A Rule 8 Assessment and Implementation Authorization remain required, separately, before any implementation.

---

## Why This Record Exists

`BDR-0012` §3 already states, as approved governance:

> **Purchase-side facts** (quantity purchased, purchase unit, purchase cost) are batch-specific facts, supplied at the moment of a specific purchase — from a receipt, OCR extraction, or direct owner entry — and are never derived from Product Memory. **Selling-side information** (selling unit, selling price) is the kind of knowledge that belongs in Product Memory once confirmed, automatically populating future stock-entry rows, always shown for owner review, always editable.

Direct code investigation (this project's own preceding investigation passes) found that the current Add Stock implementation does not fully honor this already-approved rule for an **existing product**: the active purchase-unit and purchase-cost fields are, by default, populated from historical StockBatch/StockCount records (via `findLatestRememberedProductMemory`) rather than left to the current purchase/receipt. This record exists to (a) confirm that `BDR-0012` §3 already settles the underlying business rule — this is a conformance question, not an open philosophical one — and (b) add the specific operational clarifications §3's own general statement does not by itself spell out for this one surface, so that a future Rule 8 Assessment has an unambiguous operational target.

**This record is Product Architect-accepted as follows:**

Product Architect: **SABUSHIMIKE MASCENI**
Decision date: **2026-09-10**

"I ACCEPT" — the Track A decision below, for **EXISTING PRODUCT, Stock Entry, purchase-side authority, and its separation from selling-side memory**, exactly as scoped in this record.

---

## The Decision — Restated as the Operative Rule

### A. Current purchase is the authority for purchase-side data

For an **existing product**, during Stock Entry, the current purchase/receipt is authoritative for:

- purchase quantity
- purchase unit
- purchase cost

These values belong to **this** purchase transaction. Historical Product/Stock memory must not automatically populate, overwrite, or become the active value for the current purchase unit or current purchase cost, regardless of how the current purchase values initially enter the system (manual entry or OCR).

This is `BDR-0012` §3's own rule ("never derived from Product Memory"), applied without exception to the active Stock Entry purchase-unit and purchase-cost fields specifically.

### B. OCR is an input mechanism, not an authority

OCR may initially supply purchase quantity, purchase unit, and purchase cost — `BDR-0012` §3 itself already names "OCR extraction" as one of the three equally valid ways a purchase fact may be *supplied*, alongside a receipt and direct owner entry. OCR is not, by that same sentence, itself the final authority. All three values must remain editable by the operator; if OCR reads any of them incorrectly, the operator must be able to correct the value before the Stock Entry is committed. The final operator-confirmed current-purchase value is the value that must be used for the Stock Entry.

### C. Historical purchase cost must not prefill the active Stock Entry field

Historical purchase cost must not appear as the value of the active Stock Entry purchase-cost field. This prohibition includes historical cost coming from:

- historical StockBatch memory
- historical StockCount memory
- `Product.costPrice`
- any equivalent historical purchase-cost source

Historical purchase cost may continue to exist elsewhere for legitimate reference/history purposes and may continue to be maintained by its existing governed mechanisms (see "Reconciliation with FR-86," below). Historical purchase cost ≠ current Stock Entry purchase cost. The current field must represent the current purchase only.

### D. Historical purchase unit must not become the active current unit

Historical purchase unit must not silently become the purchase unit for a new current purchase merely because that unit was used previously. The current Stock Entry purchase unit must represent the unit of *this* purchase. If OCR initially provides the unit, the operator can correct it; if the operator manually selects/enters the purchase unit, that current selection is authoritative for the transaction. The purchase unit of the current transaction is not to be confused with the selling unit stored in Product configuration — these remain, as they already are, two distinct concepts.

### E. Existing Product Memory remains the selling-side authority

For an existing product, established Product/Product Memory continues to supply the selling/conversion configuration:

- confirmed UnitRelationship
- selling unit
- selling price

This selling-side configuration remains separate from current purchase cost and purchase unit, exactly as `BDR-0012` §3 already establishes. The existing canonical selling-memory path (`resolveCanonicalProductSellingMemory` and its role at every existing autofill call site) is not redesigned, removed, or reopened by this record — it is explicitly preserved. The existing Product Memory continues to allow the current purchase to be immediately interpreted in the established selling configuration (worked example: `2 Cx` purchased against `1 Cx = 24 Un`, selling unit `Un`, selling price `65 MZN/Un` → `48 Un` → `3,120 MZN` selling value — the current purchase cost, e.g. `1,200 MZN/Cx`, remains exactly what the current purchase states, independent of that selling-side figure).

### F. Purchase cost must not be silently fabricated from a corrected OCR value

This is the one operational clarification not already implied by `BDR-0012` §3's general statement, and is the specific new content of this record: if OCR misreads a purchase line (e.g. reads `2 Un` at `1,000 MZN/Un` when the receipt actually states `2 Cx` at `1,200 MZN/Cx`) and the operator corrects the purchase **unit**, the system must not silently transform the unconfirmed, OCR-supplied cost figure into a new purchase cost by mechanically converting it through the product's confirmed unit relationship. Correcting the unit is not itself evidence that the previously-shown cost figure was correct for its stated basis — it may itself have been misread by the same OCR pass. The operator must remain able to correct the current purchase cost directly from the receipt, independent of, and not derived from, whatever figure OCR originally proposed. This record establishes the required authority boundary only; the implementation mechanism (e.g., how an OCR-sourced-but-unconfirmed value is distinguished from a Product-Memory-sourced one at the moment of a later unit correction) is explicitly left to Rule 8/implementation design, not fixed here.

### G. Historical price comparison is information only

A small, temporary, informational comparison to a previous purchase (e.g. "Previous purchase: 1,000 MZN/Cx · Current: 1,200 MZN/Cx · +20%") is permitted as a UX aid. This information must not autofill the current cost, must not modify the current cost, must not become an alternative input, and must not use wording that makes it appear to be the current value; it is informational only and should not persist once that product's active Stock Entry work is finished. This is recorded here as an explicit boundary on what this Policy allows, consistent with §C above — it is a UX/implementation detail, not itself a separate Product Architect governance decision, and no separate governance artifact is created for it.

---

## Reconciliation With Existing Accepted Governance

No existing accepted document was found to contain wording that directly conflicts with this decision. Specifically:

- **`BDR-0012` §3** — this record does not amend or reopen §3; it operationalizes its already-accepted rule for one specific surface (existing-product Add Stock's active purchase-unit/cost fields) that §3's own general statement does not itself spell out operationally.
- **`POL-0005`** — its own "Purchase facts... never derived from or blocked by this Policy's minimum-configuration threshold" language is consistent with, and not touched by, this record. `POL-0005` is not reopened.
- **`decision-37-...-amendment.md` ("§45") §11/§12** — "Add Stock continues to be where an actual purchase batch's cost is entered — by receipt... or manually," and "Cost/Cost Unit remain purchase-workflow-owned." This record is a tightening of the same principle, not a contradiction of it: §45 affirms Add Stock as the entry point but does not itself state whether a historical figure may be pre-filled into that entry point as a default — this record settles that remaining question. §45 is not amended or reopened.
- **FR-85 (independent write authorities)** — not implicated. This record does not authorize, and Track A's existing-product scope does not involve, any write to `Product.sellingPrice` or `Product.unitRelationship.sellingUnit` from Add Stock. FR-85, and the separate, unresolved new-product FR-85 question, are explicitly not reopened by this record.
- **FR-86 (`Product.costPrice` forward-maintenance)** — not implicated, and its existing write/maintenance mechanism is explicitly preserved, unmodified, and not reopened. FR-86 governs the *forward* direction — a new purchase's cost updating `Product.costPrice` for future reference — a different direction of data flow from what this record governs, which is whether `Product.costPrice` (or any other historical figure) may flow *backward* into the active current-entry field as a default. This record settles only the latter, and settles it as: it may not.
- **FR-87/FR-88 (Product Catalog surface)** — not implicated; unaffected, not reopened.

No amendment to any existing accepted document is required. This record stands as its own operationalizing Policy, exactly as `POL-0004` and `POL-0005` already stand as their own separate Policies operationalizing distinct `BDR-0012` questions without editing `BDR-0012` itself.

---

## Scope

**In scope:** Existing product, Stock Entry (Add Stock), purchase-side authority (quantity, purchase unit, purchase cost) versus selling-side Product Memory authority (UnitRelationship, selling unit, selling price), and OCR's role as an editable input mechanism for the purchase side.

**Explicitly not in scope, not reopened, not decided by this record:**

- New Product / first-time Product creation during Stock Entry — carries its own unresolved FR-85 question, to be handled separately.
- `FR-85` itself, in general.
- Product Catalog Phase 1 or Phase 2, generally.
- Contagem design.
- Product Recognition/OCR architecture, generally — only OCR's role as a purchase-fact input mechanism for this one surface is addressed.
- Product Merge.
- Product Memory architecture, generally.
- Business Worth formulas.
- Stock Count cost model (`costBasisEstablished`/§44, unaffected).
- UnitRelationship architecture.
- SupplierWordingRelationship.
- `Product.costPrice`'s existing write/maintenance mechanism (FR-86) — preserved exactly as is.
- Any Add Stock UX not directly implicated by the purchase-authority boundary stated above.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit application logic, or change any `firestore.rules`, `src/`, or `server/` file. None were touched to produce it.
- No other existing repository file was written, edited, or otherwise modified to produce or record this decision, including `BDR-0012`, `POL-0004`, `POL-0005`, or the §45 amendment.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization — all remain required, separately, before any implementation.
- This record does not assign, claim, or reserve a `POL-NNNN` identifier — see "Sequencing note," above.
- This record does not modify `19-governance-bdr-policy-framework.md`'s Numbering Ledger table.
- This record does not resolve, reopen, or touch the New Product / FR-85 question — recorded here as explicitly deferred, to be handled as a separate governance action.

**Lifecycle:** Designed → Approved → **ACCEPTED** (operational policy, unnumbered). Not Specified, not Implemented, not Executed, not Analyzed — no engineering work is authorized by this record.

---

## Signature

**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 2026-09-10
**Decision:** ACCEPTED, for Track A (Existing-Product Stock Entry Purchase Authority) exactly as stated above.
