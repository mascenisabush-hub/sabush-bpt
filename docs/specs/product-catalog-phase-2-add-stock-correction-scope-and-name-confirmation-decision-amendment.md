SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 2 — Product Catalog Phase 2: Add Stock Canonical Correction Scope (2A) and Product Name Confirmation (2B)

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 9 September 2026
**Resolves:** The two genuine Product Architect decisions identified during the Product Catalog Phase 2 Decision 2 Investigation — (2A) what canonical Product Information Add Stock's in-context correction capability may reach, and (2B) whether correcting an existing Product's canonical `name` from Add Stock requires special confirmation treatment.
**Builds on:** [`docs/engineering/product-catalog-phase-2-bdr.md`](../engineering/product-catalog-phase-2-bdr.md) (Accepted, `e9e4297e7ba010619fd6ca81973fff07415711cf`) — specifically §4 Decisions 2–4 (multi-door editing, each door's own governed scope) and §5 (Canonical Product Information Model); [`POL-pending-selling-price-unit-invariant-amendment.md`](./POL-pending-selling-price-unit-invariant-amendment.md) (Accepted, `d677c82329199e67c40159ec64e564bb79f38fd0`); [`product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md`](./product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md) (Decision 1, Accepted, `cc09b5c9d718121023861973bd40edec6fb41ffa`) — this decision assumes and does not restate, reinterpret, weaken, or expand Decision 1's own content.
**Does not reopen:** `BDR-0012`; `POL-0005`; the accepted Phase 2 BDR's Decisions 1–8; the accepted Policy Amendment's four cases; the Phase 1 selling-price/unit reconciliation; Decision 1's own governing rule.
**Affected Area:** Add Stock's canonical Product Information correction capability, wherever it is eventually built — field-level scope (2A) and the confirmation treatment required for canonical `name` corrections specifically (2B).
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

## 1. Purpose

The Product Catalog Phase 2 Decision 2 Investigation traced every canonical Product field against Add Stock's current behavior and found two genuinely open questions: how far Add Stock's authorized-in-principle correction capability (accepted BDR §4 Decision 4) should actually reach field-by-field, and whether `name` — identity-adjacent, used in Product Identity/Recognition matching — warrants different treatment than an ordinary metadata field. This decision resolves both, as governance principles, before any Specification defines their exact mechanics.

## 2. Decision 2A — Add Stock Canonical Correction Scope

**Governing rule, stated precisely:**

> Add Stock's in-context canonical Product Information correction capability is scoped to information that is materially relevant to identifying and properly configuring the product while adding stock — not to the entire Product Catalog editing surface duplicated for parity.
>
> This capability **must include** the canonical selling configuration governed by the accepted selling-price/selling-unit invariant (`unitRelationship`, `sellingUnit`, `sellingPrice`) and canonical `name` (per Decision 2B's confirmation requirement, below).
>
> This capability **excludes** `costPrice` unconditionally — cost price remains purchase-workflow-owned and governed separately (FR-88), never part of canonical Product Information editing from any door.
>
> Transaction-specific purchase data (quantity, actual purchase unit for the transaction, actual purchase cost, purchase date, batch data) remains transaction-specific and is never converted into canonical Product Information by this capability.
>
> Add Stock's existing purchase-supplier concept (`SupplierRecord` — who a specific batch was bought from) remains entirely distinct from canonical `Product.supplier`; this decision does not merge, rename, or conflate the two.
>
> **The exact field-level status of `category`, `supplier` (canonical `Product.supplier`), `sku`, and `barcode` within Add Stock's correction scope is not decided by this record.** Per the Product Architect's own framing, determining this is explicitly assigned to the future Specification, which must apply the "materially relevant to identifying and properly configuring the product while adding stock" criterion to each field using the governing Product Information model and Add Stock's actual purpose — not decided here, and not to be silently inferred by this record.

**Basis for what this record does decide:** `sellingPrice`/`unitRelationship`/`sellingUnit` inclusion and `costPrice` exclusion are both explicit in the Product Architect's own instruction, not derived. `name`'s inclusion is established by Decision 2B, below. No other field's inclusion or exclusion is stated explicitly enough to record as decided — attempting to do so here would be inventing a rule the Architect's own instruction did not state, contrary to this investigation's governing discipline throughout this chain.

## 3. Decision 2B — Product Name Correction Confirmation

**Governing rule, stated precisely:**

> Canonical Product `name` is identity-adjacent, participating directly in Product Identity/Recognition matching. Correcting an existing Product's canonical `name` from Add Stock is authorized (§2A above) but must require explicit owner confirmation appropriate to a consequential, identity-adjacent change — SABUSH must never silently rename an existing canonical Product as a side effect of Add Stock data entry, recognition, matching, or transaction recording.
>
> This is not a prohibition on name correction — the owner may correct it. The requirement is that the system must make the consequential nature of the change explicit and obtain the owner's explicit confirmation before committing it.
>
> The exact confirmation mechanism (modal, wording, button sequence, or any other UI detail) is explicitly not decided here — a Specification/UX-stage question, not a governance one.

## 4. Consistency Confirmation

Reviewed against every artifact in this record's `Builds on` list:

- **Accepted Phase 2 BDR §4 Decisions 2–4** — conforming; this record is a direct instance of "each door retains exactly the capability it is governed to have," now naming what Add Stock's governed capability specifically includes and excludes.
- **Accepted Phase 2 BDR §5 (Canonical Product Information Model)** — conforming; no field is invented here beyond what §5 already lists.
- **Accepted Policy Amendment** — conforming; §2A's mandatory inclusion of the selling configuration is a direct instance of the invariant's own uniform, door-agnostic application.
- **Decision 1 (relationship reconfiguration safeguard)** — unaffected and not reopened; this record does not touch relationship-replacement behavior at all.
- **FR-88 (cost-price boundary)** — conforming, restated, not narrowed or widened.
- **`BDR-0012`, `POL-0005`, Product Memory governance** — unaffected; this record concerns only which door may correct which canonical field, not Product Memory's own lifecycle.

No conflict found. No prior accepted decision is reopened, narrowed, or silently rewritten by this record.

## 5. Scope Boundaries — What This Decision Does Not Do

- Does not decide `category`/`supplier`/`sku`/`barcode`'s inclusion in Add Stock's scope — explicitly and deliberately left to the future Specification (§2A above).
- Does not decide any UI, confirmation mechanism, modal, or wording for the name-change confirmation (§2B above).
- Does not amend `BDR-0012`, `POL-0005`, the accepted Phase 2 BDR, the accepted Policy Amendment, the Phase 1 reconciliation, or Decision 1.
- Does not authorize a Rule 8 Assessment, Implementation Plan, or Implementation Authorization.
- Does not modify any existing code, test, or schema.

## 6. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 9 September 2026
**RULE 8:** Not yet assessed for either sub-decision.
**IMPLEMENTATION PLAN:** Not yet created.
**IMPLEMENTATION AUTHORIZATION:** None exists for this decision.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-09

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance decision only. This acceptance does not authorize implementation, `firestore.rules` changes, schema changes, UI changes, code changes, tests, a Specification, a Rule 8 Assessment, or an Implementation Authorization. The `category`/`supplier`/`sku`/`barcode` field-level determination named in §2A is explicitly delegated to the Specification stage, applying this decision's own stated criterion — this is not an unresolved Product Architect gate; it is deliberate delegation, recorded as such. The governing chain from this point is: Decision 2 Acceptance (this record) → Product Catalog Phase 2 Specification (incorporating Decisions 1 and 2 as settled requirements, and applying §2A's criterion to the remaining metadata fields) → Rule 8 Assessment → Implementation Plan → Implementation Authorization → Implementation. No gate may be skipped.
