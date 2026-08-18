Decision Record

# POL-0002 — Rounding Behavior

**Status:** DRAFT — proposed for Product Architect review. Not approved. Not authorized for implementation.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 2. Companion to [`POL-0001`](./POL-0001-fractional-quantity-handling.md) (Fractional Quantity Handling), which governs whether and how a fractional intermediate value is computed and carried; this Policy governs only its final treatment.
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`POL-0001` establishes that a fractional conversion result is preserved at full precision internally. At some point, that value must be shown to the owner or recorded as a final figure — this Policy governs what happens to it at that final point.

## Guiding Principle

This platform already has an established, working monetary-rounding convention, applied consistently across its existing valuation code — this Policy extends that same convention to unit-conversion-derived figures, rather than inventing a new, inconsistent one.

## Existing Convention, Confirmed and Extended

`apps/tenant/src/utils/stockCount.ts` already rounds every monetary total it produces to two decimal places via `Number(x.toFixed(2))` — confirmed directly at `normalizeStockCountItems` (lines 62, 75) and the periodic-count summary helpers (lines 167–168, 188–190). **This Policy extends that same two-decimal-place rounding convention to any final monetary value derived from a unit-conversion calculation** — no new rounding scheme is introduced for this capability specifically.

## Physical Quantity Display Is Not Automatically Rounded to Two Decimals

The two-decimal convention above applies to monetary/valuation figures. A converted *physical quantity* shown to the owner (e.g., "the equivalent of X Un") is not required to follow the same two-decimal rule merely because the monetary convention does — the appropriate precision for a physical-quantity display is not decided by this Policy and remains open for whoever designs that specific screen, within the bound that `POL-0001` already sets (the underlying value is never silently truncated before this display step).

## Rounding Never Silently Changes What Was Recorded

Rounding a computed, derived figure for display never rewrites, and is never confused with, an underlying batch's or count's own originally recorded quantity, unit, or price — those remain exactly as recorded, per `BDR-0012` Decisions 15–16. Rounding applies only to values computed *from* those records, never to the records themselves.

## Scope Exclusions

This Policy does **not** define:
- A rounding rule for anything outside monetary/valuation figures derived from unit conversion.
- The specific precision for physical-quantity display screens.
- A technical implementation of the rounding operation itself, beyond noting the existing `.toFixed(2)`-based convention this Policy extends.
- Any resolution of `BDR-0012` §5.A's still-open items.

## Governance Notes

- This record does not modify `BDR-0012`, `POL-0001`, `product-unit-of-measure-discovery.md`, `apps/tenant/src/utils/stockCount.ts`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve any of `BDR-0012`'s remaining open items.
