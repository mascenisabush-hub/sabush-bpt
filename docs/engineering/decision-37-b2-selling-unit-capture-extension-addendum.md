Reconciliation Addendum

# Decision 37, Item B.2 — Selling-Unit Capture Extension

**Status:** ✅ **SIGNED (29 August 2026).** See "Signature Gate — Formal Acceptance," §5, below, for the complete signed decision. Not an Implementation Authorization; does not by itself authorize any code change.

**Amends (narrowly, only the one statement §1 identifies):** [`business-worth-evolution-implementation-authorization.md`](./business-worth-evolution-implementation-authorization.md) §38, "Execution Record — Decision 37, Item B.2 (Arbitrary-Length Unit-Relationship Entry)" — specifically its own recorded statement that no `sellingUnit` decision was introduced by that item.

**Does not amend:** `BDR-0012`, any POL document, the UOM Specification, any ADR, `BDR-pending-business-worth-evolution-measurement-model.md`, or any other part of `business-worth-evolution-implementation-authorization.md` — including §36's own scope list, §37 (B.1's Execution Record), or §39/§40 (B.3/B.4's Execution Records). None of these require amendment: the underlying business rule this addendum relies on (`UnitRelationship.sellingUnit` is optional, independent of `units[0]`, validated by the unmodified `isValidUnitRelationship`) is **already** fully approved by `BDR-0012`/the UOM Specification and was never in question.

**Does not rewrite history.** §38 of the authorization document is **not edited**. As a historical record of what B.2's own implementation actually did on 23 August 2026, §38's statement remains true and stays exactly as written — this addendum records a **new, later, separate** Product Architect decision to extend that item's originally-bounded scope, not a claim that the original record was ever wrong.

---

## 1. What Was Previously Decided (Quoted Exactly)

`business-worth-evolution-implementation-authorization.md` §38:

> *"No `sellingUnit` decision was introduced. The candidate `UnitRelationship` this item constructs leaves `sellingUnit` unset — `isValidUnitRelationship`'s own contract already treats this field as optional. Selling-unit/selling-price behavior (Mode A's reference-unit choice, Mode B's independent per-portion pricing) remains entirely under the existing, unmodified selling-valuation logic."*

This was a correct and complete description of B.2's implemented scope at the time: Decision 37 §36's own governing scope list authorized B.2 as "arbitrary-length unit-relationship entry" only — extending the *chain* (`units[]`), never the separate question of which unit is designated `sellingUnit`. Nothing about that original decision was mistaken; it simply did not, at the time, extend to the question this addendum now resolves.

## 2. New Product Architect Decision

Recorded here as directed, this session, by the Product Architect:

1. **Single-functional-unit products:** No `UnitRelationship` is required. The one functional unit is naturally the unit in which the product is valued/sold. No meaningless `1 unit = 1 unit` relationship is ever created. *(Unchanged from existing behavior and existing governance — restated here for completeness, not newly decided.)*
2. **Multi-functional-unit products (2+ units):** Once the owner has established the functional-unit chain during Periodic Contagem (B.2's existing mechanism, unmodified), the owner **must be able to** choose the selling/valuation unit from among those established functional units, **in that same screen**.
3. The chosen selling unit is stored in the **existing** `UnitRelationship.sellingUnit` field — no new field, no new type.
4. The selling unit must **not** be forced to equal the first/buying unit (`units[0]`) — this was already true of `isValidUnitRelationship`'s existing contract and remains unchanged; this decision only concerns *where the owner is given the opportunity to choose it*, not the validation rule itself.
5. Buying/acquisition unit and selling/valuation unit remain independent decisions — unchanged.
6. The owner separately provides the selling price associated with the selected selling unit, for the current valuation context — via the existing, unmodified Mode A/Mode B mechanism.
7. The existing conversion engine (`getConversionFactor`) silently handles valuation conversion — unchanged, not reopened.
8. **No new unit-conversion mechanism is introduced.**
9. **No Product-level "selling portions" configuration is introduced.** This decision concerns only the single, existing `sellingUnit` field — not a set/array of portions.
10. **Add Portion remains exactly as already governed:** optional, temporary, valid only within the current Contagem event, never Product Memory, never persisted as reusable selling configuration. Unchanged by this addendum.
11. If the owner uses Add Portion, each additional portion remains the owner's own valuation choice (retail, wholesale, discount, or any other meaning) — the system imposes no business interpretation. Unchanged.
12. Initial Stock remains out of scope (being discontinued as a data-entry door).
13. Add Stock and Smart Stock Entry remain out of scope for this specific change — their existing-product and new-product paths were independently verified (prior investigation sessions) to already handle selling-unit/relationship behavior correctly.
14. Business Worth, valuation formulas, Smart Stock Entry's extraction contract, Product Recognition Intelligence, and the conversion engine are not redesigned by this decision.

## 3. Why This Is an Extension, Not a Redesign

- The **type** (`UnitRelationship.sellingUnit`) is unchanged — already declared, already optional, already validated correctly by the unmodified `isValidUnitRelationship`.
- The **validation rule** is unchanged — `sellingUnit` must be a chain member, need not equal `units[0]`; this was already true before B.2 existed at all.
- The **conversion engine** (`getConversionFactor`) is unchanged.
- The **only** thing this decision authorizes extending is *which screen* can populate an already-approved, already-optional field — Periodic Contagem's own new-product flow gains the capability Add Stock's equivalent flow already has.
- Per §38's own text, B.2 deliberately left this specific field for "the existing, unmodified selling-valuation logic" to handle "entirely" — this decision does not contradict that; it clarifies that Periodic Contagem's *chain-construction* step is now also an appropriate place to *set* that field, still leaving Mode A/Mode B's own logic for consuming it completely untouched.

## 4. Effect on the Implementation Plan

[`periodic-contagem-new-product-selling-unit-implementation-plan.md`](./periodic-contagem-new-product-selling-unit-implementation-plan.md) — specifically its §10 (Governance Classification) — flagged this exact point as "the one point in this Plan worth an explicit sign-off on specifically." This addendum is that sign-off's substance. The Plan's §10 is updated (see accompanying edit) to reference this addendum and record that the flagged concern has been explicitly addressed by Product Architect decision, pending only the formal signature gate below. No other part of the Plan requires change — its approach, scope, UI behavior, persistence, validation, tests, and acceptance criteria (§1–§9, §11–§13) already anticipated and match exactly what this decision now authorizes.

## 5. Signature Gate — Formal Acceptance

**Status: ✅ SIGNED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I, as Product Architect, formally accept and sign the Decision 37 B.2
> Selling Unit Capture Extension Addendum, including the complete
> decision recorded in §2 above: Periodic Contagem's new-product
> relationship editor may capture `UnitRelationship.sellingUnit`, from
> among the established functional-unit chain, independent of the
> buying/acquisition unit, using the existing field, type, and
> validator only — no new data model, no new conversion mechanism, no
> Product-level selling-portions configuration. Add Portion, Initial
> Stock, Add Stock, and Smart Stock Entry all remain exactly as
> already governed, unaffected by this signature.
>
> This signature extends Decision 37, Item B.2's originally-bounded
> scope (§1, §3 above) — it does not reopen, reverse, or reinterpret
> the historical record at `business-worth-evolution-implementation-authorization.md`
> §38, which remains unedited and accurate as a record of what B.2
> actually implemented on 23 August 2026.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: I APPROVE AND SIGN
> Date: 29 August 2026

**This addendum does not authorize implementation.** Even now signed, per the Implementation Plan's own §16-equivalent gate (its own "DRAFT — NOT YET ACCEPTED / NOT AUTHORIZED" status, unchanged by this signature), a further, separate Plan acceptance and a distinct, signed Implementation Authorization remain required before any code is written — matching this document's own governing precedent (§36's "does not itself instruct implementation to begin" language) exactly. This signature clears the one governance point the Implementation Plan's §10 flagged as outstanding — it does not clear the Plan's own separate acceptance gate, which remains a distinct, subsequent step.

---

## Governance Notes

- This document does not modify `BDR-0012`, any POL document, the UOM Specification, any ADR, or `business-worth-evolution-implementation-authorization.md` itself (that document's §36–§40 remain byte-for-byte unchanged — confirmed by `git diff --quiet` in the accompanying report).
- This document does not implement code, modify runtime behavior, or edit any `src/`, `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, or test file.
- This document does not create an Implementation Authorization and does not itself authorize coding.
- No Product-level "selling portions" configuration is introduced or implied anywhere in this document.
- Initial Stock, Add Stock, and Smart Stock Entry are confirmed out of scope and untouched.

**Lifecycle:** Product Architect decision recorded → **signed** (§5, 29 August 2026) → available as governing basis for the Implementation Plan's own acceptance gate. Not itself an Implementation Authorization at any point in this lifecycle.
