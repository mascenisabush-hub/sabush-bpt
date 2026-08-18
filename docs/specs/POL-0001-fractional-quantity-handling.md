Decision Record

# POL-0001 — Fractional Quantity Handling

**Status:** DRAFT — proposed for Product Architect review. Not approved. Not authorized for implementation.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum. This is the first document to be filed under that namespace — it establishes the `POL-NNNN` filing pattern in practice, the same way `POL-19-001` once established the module-prefixed pattern for its own series.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 1, and §2 Decision 1 (BPT must understand confirmed unit relationships) and the already-resolved §5.A item 2 (unit relationships are strictly-ordered chains, initial scope).
**Followed by:** Not yet drafted, not derived by this record — no Specification currently references or requires this Policy.

---

## Purpose

Once a product's unit relationship is confirmed (`BDR-0012` Decision 1), converting a quantity from one configured unit to another will not always divide evenly — for example, `5 Un` converted toward `Emb` where `1 Emb = 6 Un` does not resolve to a whole number of `Emb`. Today, no conversion of any kind exists in this codebase (`product-unit-of-measure-discovery.md` Part I §7), so there is no existing behavior to preserve here — this Policy establishes the first such rule from a clean slate.

## Guiding Principle

Consistent with this platform's existing "never fabricate precision, never silently discard information" discipline — already visible in Smart Stock Entry's refusal to invent a value it cannot verify (`04-smart-stock-entry-amendment.md`) and in Stock Count's "blank must never silently become zero" rule (`BDR-0009` §2 Decision 6) — a fractional conversion result must never be silently truncated, rounded away, or discarded before it reaches the point where it is actually used.

## Internal Precision Is Preserved

A quantity converted between a product's configured units is computed and carried at full arithmetic precision internally, for as long as it remains an intermediate value. No conversion step truncates, floors, or otherwise discards precision "for tidiness" before the value reaches its final use (a display, a valuation, or a stored record).

## Fractional Results Are Not an Error

A non-whole-number result from a unit conversion is not, by itself, invalid, blocked, or flagged as a data problem — it is an expected mathematical consequence of the configured relationship, and this Policy does not require any warning or confirmation step solely because a conversion produced a fraction. (This is distinct from `BDR-0012` §5.A item 6's still-open question about *incomplete* configuration, which this Policy does not address or resolve.)

## Relationship to Final Display and Valuation

What a fractional intermediate value is ultimately rounded to, for display or for a stored monetary figure, is governed separately by `POL-0002` (Rounding Behavior) — this Policy governs only whether and how the fractional value is computed and carried; it does not itself specify a final rounding rule.

## Scope Exclusions

This Policy does **not** define:
- The specific rounding algorithm or decimal precision for final display or storage (`POL-0002`).
- A technical data structure, arithmetic implementation, or programming-language numeric type for representing a fractional quantity.
- Whether a specific unit-relationship model (base unit, ordered hierarchy, or otherwise) is used — that remains an undecided technical-architecture question per `BDR-0012` §6.
- Any resolution of `BDR-0012` §5.A's still-open items (3, 4, 6's block-vs-warn question, or 7).

## Governance Notes

- This record does not modify `BDR-0012`, `product-unit-of-measure-discovery.md`, or any other existing governance artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization for this or any other capability.
- This record does not resolve any of `BDR-0012`'s remaining open §5.A or other §5.B items.
