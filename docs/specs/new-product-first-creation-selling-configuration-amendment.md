Business Domain Specification — Amendment

# New-Product First-Creation Selling Configuration Amendment
## (Proposed §47 of the Business Worth Evolution Specification)

**Status:** ✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**

This document amends `decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`
("§45," ✅ Accepted and Signed, 30 August 2026) by a narrow, explicitly-scoped
exception — it does not rewrite §45's own text, and §45 remains accepted and
signed exactly as it stands. This amendment is governance-approved. It does
not, on its own, authorize implementation — a Rule 8 Assessment and
Implementation Authorization remain separate, subsequent gates.

---

## 1. Numbering / Filing (verified before drafting)

Verified directly against the repository at `HEAD f3f891d`, `main`, working
tree clean, before drafting began.

- The highest existing FR found anywhere in `docs/specs/` is **FR-94**
  (Persisted Selling-Price Basis Unit, FR-89–FR-94). This amendment's new
  FRs begin at **FR-95**, collision-free.
- The highest currently-claimed "Proposed §NN of the Business Worth
  Evolution Specification" slot is **§46**
  (`periodic-contagem-quantity-selling-unit-independence-amendment.md`).
  **§47** is the next collision-free slot in that specific numbering
  namespace — verified distinct from the unrelated `Decision 47`
  (`stock-count-data-loss-resilience-decision-47-amendment.md`), which
  belongs to a different, separately-numbered decision lineage entirely
  and does not collide with this document's own "§NN of the Business
  Worth Evolution Specification" claim.
- Filed as a **separate, standalone file**, consistent with this
  repository's own precedent (§44, §45) for amending an already-signed
  document without editing its text in place.

## 2. Purpose

This amendment authorizes one narrow exception to §45's Purchase
Cost/Selling Price separation: when Add Stock determines that a Stock
Entry line item is a **genuinely new Product** — one with no existing
canonical Product record — the same Stock Entry that creates that Product
may also establish its complete initial canonical selling configuration,
and that configuration must be usable immediately within the same Stock
Entry. This amendment changes **only** the first-creation moment. Every
other rule §45 establishes — including its treatment of an already-existing
Product — remains fully in force, unamended, and unaffected.

## 3. Scope

**In scope:** the single moment at which Add Stock creates a Product that
did not previously exist, and that same Stock Entry's own establishment of
that Product's initial canonical selling configuration.

**Explicitly out of scope, unaffected by this amendment:**
- Any Product that already has a canonical Product record at the time the
  Stock Entry begins — governed exclusively by §45 and by
  `POL-pending-existing-product-stock-entry-purchase-authority.md` ("Track
  A"), both unchanged.
- Any later edit of a Product's selling configuration, for any Product,
  including one created under this amendment — remains exclusively
  governed by Contagem/selling-configuration surfaces and the Product
  Catalog's own edit affordance, per §45 §11/§13 and FR-83, unchanged.
- Purchase cost, purchase unit, and purchase quantity — for both a new and
  an existing Product — remain governed exactly as §45 §6/§12 and Track A
  already establish. Nothing in this amendment touches how purchase cost is
  captured, interpreted, or persisted.
- Product Recognition, Supplier Wording Recognition, Contagem, the Product
  Catalog's general editing surface, Business Worth formulas, and the
  purchase-to-selling conversion engine (`purchaseToSellingConversion.ts`)
  — all unaffected; this amendment authorizes a business rule only, not a
  mechanism, and prescribes no change to any of them.

## 4. FR-95 — New-Product First-Creation Selling Configuration Authority

**FR-95 [new, accepted].** When Add Stock creates a Product
that has no existing canonical Product record — the first Stock Entry that
ever establishes that Product's identity — that same Stock Entry may also
establish the Product's initial canonical selling configuration: complete
UnitRelationship, selling/reference unit, and selling price denominated in
that selling unit. This authority exists **only** at the moment of that
Product's first creation; it confers no authority over any Product that
already exists at the time the Stock Entry begins, and no authority to edit
a selling configuration on any later Stock Entry for the same Product.

## 5. FR-96 — No Expansion of General Add Stock Authority; Existing-Product Exclusion

**FR-96 [new, accepted].** FR-95 does not create a general
Add Stock capability to establish, edit, or overwrite canonical selling
price or selling unit. For any Product with an existing canonical Product
record, §45 §11's rule continues to apply without exception: selling
price/selling unit remain editable only through Contagem/selling-
configuration surfaces or the Product Catalog's own edit affordance, never
through Add Stock. §45 §6's reaffirmation of Add Stock as the venue for
capturing actual purchase cost is unchanged and continues to describe Add
Stock's ordinary role for every Product other than the single first-
creation moment FR-95 names. Existing Product Memory continues to be
established and read exactly as `BDR-0012`, §45, and Track A already
govern; FR-95 introduces no second, competing establishment path for an
already-existing Product.

## 6. FR-97 — Purchase/Selling Separation Preserved Within the Same Action

**FR-97 [new, accepted].** FR-95's authorization of both
purchase-side facts (quantity, purchase unit, purchase cost) and selling-
side facts (UnitRelationship, selling unit, selling price) within the same
Stock Entry action does not merge, blend, or derive one from the other.
The two remain independently supplied facts — purchase-side facts continue
to come exclusively from the current receipt/operator entry, per Track A;
selling-side facts continue to come exclusively from what the operator
explicitly establishes as the Product's canonical configuration. No formula
introduced by this amendment, or by any implementation of it, may compute a
purchase cost from a selling price, or a selling price from a purchase
cost, merely because both are captured in the same action. FR-85's
independent-write-authorities principle is not weakened by this amendment
for the existing-Product case; for the new-Product first-creation case,
FR-95 is the sole, explicitly-scoped exception to FR-85's "single Owner
action" language, limited exactly as FR-95 and FR-96 state.

## 7. FR-98 — Selling-Price/Selling-Unit Pairing Invariant Applies Unchanged

**FR-98 [new, accepted].** The selling configuration FR-95
authorizes Add Stock to establish is subject, without exception, to the
already-accepted pairing invariant (Product Catalog Phase 2 BDR §9,
`docs/engineering/product-catalog-phase-2-bdr.md`, Accepted 2026-09-09;
operationalized by `POL-pending-selling-price-unit-invariant-amendment.md`):
a canonical `Product.sellingPrice` may not be created without a valid,
accompanying `unitRelationship.sellingUnit` present on the same write. This
amendment does not restate that invariant's mechanics and does not modify
either source document — it confirms only that FR-95's new authority is
one more instance of "any of the three doors" that invariant already
governs, per that BDR's own §9 text, now that Add Stock is a door
authorized (narrowly, per FR-95/FR-96) to perform this specific write.

## 8. FR-99 — Immediate-Use Requirement

**FR-99 [new, accepted].** The selling configuration FR-95
authorizes must be usable within the same Stock Entry to compute that
Stock Entry's own selling-side result for the current purchase (worked
example: a purchase of `2 Cx` against a newly-established `1 Cx = 24 Un`,
selling unit `Un`, selling price `65 MZN/Un` must be computable, within
that same Stock Entry, as `48 Un` / `3,120 MZN`). This FR states the
required business behavior only. It does not prescribe, and explicitly
leaves to Rule 8/implementation design, any particular UI component, React
state shape, calculation function, synthetic Product representation, or
Firestore write sequence — none of those are decided, required,
recommended, or foreclosed by this FR.

## 9. Relationship to FR-85

FR-85 (§45) states that no code path or UI surface may write to both
Purchase Cost/Cost Unit and Selling Price/Selling Unit from a single Owner
action, or present them as one combined field. FR-95 is an explicit,
narrowly-scoped exception to FR-85's "single Owner action" clause, and
**only** to that clause — limited exactly to the moment a genuinely new
Product is being created for the first time. FR-85 continues to apply
without any exception to every existing Product, per FR-96. This amendment
does not reinterpret, broaden, or weaken FR-85 in any other respect;
FR-85's own text is unchanged, unedited, and remains binding exactly as
signed for every case this amendment does not name.

Consistent with this repository's own precedent for excepting an
already-signed document's rule from a separate, later amendment
(`POL-pending-selling-price-unit-invariant-amendment.md`'s treatment of
Product Catalog Phase 1 Decision 9), no edit to §45's own file is required
to give this exception effect — §45 remains the accurate record of what was
decided and signed on 30 August 2026, and this document is the accurate
record of the one narrow exception accepted afterward.

## 10. Relationship to the Product Catalog Phase 2 BDR

This amendment does not reopen, narrow, or extend the Phase 2 BDR's own
"multi-door editing does not mean uniform, free-form editing of every
field everywhere" principle (§4 item 4). FR-95 is precisely the kind of
explicit, field-specific authorization that BDR item 4 itself says is
required before any door's authority is treated as expanded — this
amendment is that explicit authorization, scoped to exactly one door
(Add Stock), exactly one moment (first creation), exactly three fields
(UnitRelationship, selling unit, selling price).

## 11. What This Amendment Does Not Change

- Track A (`POL-pending-existing-product-stock-entry-purchase-authority.md`)
  — untouched, unaffected, not reopened. Existing-Product purchase-side
  authority (quantity, purchase unit, purchase cost from the current
  receipt only) is unchanged in every respect.
- `BDR-0012` — unaffected; this amendment operationalizes one narrow
  question within its existing Product-Memory/Purchase-Facts distinction,
  it does not amend that distinction itself.
- §45's own text — not edited; every FR, restated principle, and Non-Scope
  bullet in that document remains exactly as signed, except where FR-96/
  FR-97/§9 above make explicit that FR-85's "single Owner action" language
  has one narrow, named exception (FR-95) that §45's own text, read alone,
  does not itself contain.
- The Product Catalog Phase 2 BDR — not edited; this amendment is the kind
  of field-specific authorization that BDR's own §4 item 4 anticipates as
  a separate, later decision.
- `purchaseToSellingConversion.ts`, `resolveUnitAwarePrice`,
  `getConversionFactor`, Business Worth formulas, Contagem, Product
  Recognition, Supplier Wording Recognition — no change authorized,
  required, or implied.

## 12. Governance Notes

- This record does not implement code, modify runtime behavior, or change
  any `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or
  other existing `docs/specs/*`/`docs/engineering/*` file. None were
  touched to produce it.
- This record does not modify §45, `BDR-0012`, the Product Catalog Phase 2
  BDR, `POL-pending-selling-price-unit-invariant-amendment.md`, or
  `POL-pending-existing-product-stock-entry-purchase-authority.md`
  ("Track A") — it sits downstream of all of them, authorizing based on
  their settled content, not amending it.
- This record does not authorize a Specification, Rule 8 Assessment, or
  Implementation Authorization — all remain required, separately, before
  any implementation.

**Lifecycle:** Designed → Reviewed (Governance Consistency Review, this
session — READY FOR PRODUCT ARCHITECT ACCEPTANCE) → **ACCEPTED** (proposed
§47, pending merge into the tracked parent Specification). Not yet
Specified, not yet Rule-8-Assessed, not yet Implementation-Authorized, not
yet Implemented.

## 13. Acceptance

**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 2026-09-10
**Decision:** ACCEPTED

"I ACCEPT" the complete §47 amendment as drafted above — FR-95 through
FR-99 in full, including the amendment's explicit preservation of FR-85
protections for existing Products, FR-81, FR-83, the Product Catalog
Phase 2 BDR, the selling-price/selling-unit pairing invariant, Track A
existing-Product purchase authority, and purchase/selling separation. This
acceptance is governance-approved only; it does not itself authorize a
Rule 8 Assessment, Implementation Plan, or Implementation Authorization,
each of which remains a separate, subsequent gate.
