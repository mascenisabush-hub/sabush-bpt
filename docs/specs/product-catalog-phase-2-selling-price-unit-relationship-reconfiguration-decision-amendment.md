SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 1 — Product Catalog Phase 2: UnitRelationship Reconfiguration Safeguard

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 9 September 2026
**Resolves:** The genuine Product Architect decision identified during the Product Catalog Phase 2 Pre-Specification Decision Investigation — specifically, what must happen when an owner explicitly proposes replacing or extending a Product's confirmed `UnitRelationship` in a way that would remove its currently-confirmed `sellingUnit` from membership, given a Product that already has a non-null `sellingPrice`.
**Builds on:** [`docs/engineering/product-catalog-phase-2-bdr.md`](../engineering/product-catalog-phase-2-bdr.md) (Accepted, `e9e4297e7ba010619fd6ca81973fff07415711cf`), specifically §9's write-time selling-price/selling-unit rule; [`POL-pending-selling-price-unit-invariant-amendment.md`](./POL-pending-selling-price-unit-invariant-amendment.md) (Accepted, `d677c82329199e67c40159ec64e564bb79f38fd0`), the operative write-time invariant this decision extends to the relationship-change case; [`product-unit-of-measure-specification.md`](./product-unit-of-measure-specification.md) (Accepted), §2's data model and `BDR-0012` Decision 14 (owner may reconfigure Product Memory at any time), which this decision assumes and does not restate, reinterpret, weaken, or narrow.
**Does not reopen:** `BDR-0012`'s own Decisions 1–17 or §5.A resolutions; `POL-0005`; the accepted Phase 2 BDR's own Decisions 1–8; the accepted Policy Amendment's four cases; `product-unit-of-measure-specification.md`'s §§1–11 (none is edited by this decision — see §3 below).
**Affected Area:** Confirmation of a proposed `UnitRelationship` replacement or extension for a Product that already has a confirmed `sellingUnit` and, optionally, a non-null `sellingPrice` — across all doors (Catálogo, Contagem, Add Stock) authorized to perform this action, wherever that capability is eventually built.
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

## 1. Purpose

The Product Catalog Phase 2 Pre-Specification Decision Investigation identified a genuine gap: the accepted selling-price/selling-unit invariant (Policy Amendment, `d677c82`) is framed around writes that set or change `Product.sellingPrice`. It does not, in its own text, address a *relationship*-changing write that leaves `sellingPrice` unchanged but silently invalidates the `sellingUnit` it depends on — since `confirmProductUnitRelationship`'s existing, already-signed contract validates only the submitted candidate in isolation, with no awareness of the Product's prior confirmed state. This decision closes that gap as a governance rule, before any Specification or implementation addresses the mechanism.

## 2. Governance Question Resolved

**Should SABUSH be permitted to confirm a proposed `UnitRelationship` change that would remove the Product's current `sellingUnit` from membership, when the Product already has confirmed selling configuration — and if not, what must happen instead?**

**Answered: SABUSH must refuse to confirm such a change until the owner also supplies a valid selling unit from the proposed relationship's own members, in the same confirmation action.**

**Final governing rule, stated precisely:**

> When an owner explicitly proposes replacing or extending a Product's confirmed `UnitRelationship`, and the Product currently has a confirmed `unitRelationship.sellingUnit` that would no longer be a member of the proposed relationship's `units[]`, SABUSH must refuse to confirm the proposed relationship until the owner also supplies a valid selling unit from the proposed relationship's own members — in the same confirmation action.
>
> SABUSH must never, as an automatic side effect of confirming a relationship change:
> - silently drop the existing `sellingUnit`;
> - silently select a replacement `sellingUnit`;
> - silently clear `Product.sellingPrice`;
> - silently delete, weaken, or alter the existing confirmed `UnitRelationship`.
>
> If the current `sellingUnit` remains a member of the proposed relationship, no special intervention is required, and the change proceeds as an ordinary owner-authorized reconfiguration under `BDR-0012` Decision 14.
>
> The resulting canonical state, once confirmed, must satisfy the accepted selling-price/selling-unit invariant.

**Worked example, for clarity, not as a new rule:** a Product confirmed at `1 Cx = 24 Un` with `sellingUnit = Cx` may be extended by the owner to `1 Cx = 4 Emb = 24 Un` — `Cx` remains a member, so this proceeds as an ordinary reconfiguration, no special intervention required. If the owner instead proposes a replacement relationship that does not contain `Cx` at all, confirmation is refused until the owner also selects a valid selling unit from the new relationship's own members.

## 3. Consistency Confirmation

This decision was investigated against every artifact in its `Builds on` list, per the preceding Decision 1 investigation, and found **conforming, with no conflict**, in each case:

- **Accepted Phase 2 BDR §9** — the "any update" scope of the existing invariant already covers this case in principle; this decision is a direct application, not an exception.
- **`POL-0005`** — unaffected; the minimum-configuration threshold itself is untouched.
- **Accepted Policy Amendment** — unaffected; its own explicit deferral of enforcement mechanics to Specification already anticipated exactly this kind of downstream elaboration.
- **`product-unit-of-measure-specification.md`** — silent on this specific scenario, not contradicted by it; this decision fills that silence without editing the document.
- **`BDR-0012` Product Memory governance** — unaffected; Decisions 14–16 (owner may reconfigure at any time; history never rewritten) remain fully intact and are the basis this decision extends, not narrows.

No existing, currently-shipped code path was found capable of violating this rule today — `confirmProductUnitRelationship` (the one function built for relationship replacement) has zero callers anywhere in the codebase, so no currently-shipped behavior contradicts this decision. This is forward-looking governance for a capability not yet built, not a correction to a live defect.

## 4. Scope Boundaries — What This Decision Does Not Do

- Does not decide a technical mechanism (blocking modal, inline validation, a specific function signature, or any other implementation detail).
- Does not amend `BDR-0012`, `POL-0005`, the accepted Phase 2 BDR, the accepted Policy Amendment, or `product-unit-of-measure-specification.md` — each remains exactly as accepted; this decision only fills a gap none of them addressed.
- Does not decide whether all three doors must share one write function, or how `confirmProductUnitRelationship`'s existing contract should technically change to become state-aware — both remain Specification/implementation questions.
- Does not resolve Decision 2 (Add Stock's exact correctable-field scope) or any of the Phase 2 BDR's three §16 Open Questions.
- Does not authorize a Rule 8 Assessment, Implementation Plan, or Implementation Authorization.
- Does not modify, deprecate, or otherwise touch `confirmProductUnitRelationship`, `isValidUnitRelationship`, or any other existing code.

## 5. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 9 September 2026
**RULE 8:** Not yet assessed for this decision. A future Rule 8 Assessment, once the Product Catalog Phase 2 Specification reaches that gate, must treat this decision as a governing requirement, not an implementation detail already resolved.
**IMPLEMENTATION PLAN:** Not yet created.
**IMPLEMENTATION AUTHORIZATION:** None exists for this decision.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-09

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance decision only. This acceptance does not authorize implementation, `firestore.rules` changes, schema changes, UI changes, code changes, tests, a Specification, a Rule 8 Assessment, or an Implementation Authorization. It does not modify `confirmProductUnitRelationship` or any other existing function. The governing chain from this point is: Decision 1 Acceptance (this record) → Product Catalog Phase 2 Specification (incorporating this decision as a settled requirement) → Rule 8 Assessment → Implementation Plan → Implementation Authorization → Implementation. No gate may be skipped.
