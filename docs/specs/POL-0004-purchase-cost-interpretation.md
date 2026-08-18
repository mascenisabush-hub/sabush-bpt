Decision Record

# POL-0004 — Purchase Cost Interpretation

**Status:** Approved.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 6, and §3's worked example, which explicitly declined to resolve this question itself.
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0012` §3's worked example (a receipt showing `3 Cx` purchased at a stated cost) explicitly left open what that stated cost figure represents — a total for the purchase, a per-purchase-unit figure, or something the owner must specify. This Policy resolves that operational question.

## Guiding Principle

This Policy does not introduce a new interpretation where an existing, working one already exists — it extends the platform's current behavior rather than replacing it.

## Existing Convention, Confirmed

`StockBatch.costPrice` and `StockBatch.sellingPrice` are already documented, in the current data model, as **"per unit"** (`apps/tenant/src/types.ts`, lines 194–195) — where "unit" is whatever string is recorded in that batch's own `unit` field. This is the interpretation every existing batch in this system has always used, confirmed directly from the type definition itself, not inferred.

## Purchase Cost Is Interpreted Per Purchase Unit

**A stated purchase cost is interpreted as the cost per the unit the purchase was recorded in** — consistent with, and not a change from, `StockBatch`'s existing "per unit" semantics. A purchase of `3 Cx` at a stated cost of `400 MZN` means `400 MZN` is the cost of **one `Cx`**, not the total for all three — matching today's existing behavior for every batch already in this system, extended without modification to a product with a confirmed unit relationship.

## Deriving Cost at Other Configured Units

Once a purchase-unit cost is recorded under this interpretation, deriving what that implies at another configured unit (e.g., cost per `Un` given `1 Cx = 24 Un`) is a straightforward computation from the confirmed relationship — this Policy states that such a derived figure is meaningful and may be shown to the owner, but does not itself specify the display format, precision (governed by `POL-0002`), or technical calculation path.

## What Happens If a Receipt States a Total Instead

Some receipts may state a total cost for a purchased quantity rather than a per-unit figure. This Policy does not resolve how such a case is detected, disambiguated, or corrected — that remains for the eventual Specification and, if needed, direct owner input at entry time. This Policy fixes only the *default interpretation* when a single cost figure is presented per line, consistent with existing `StockBatch` semantics.

## Scope Exclusions

This Policy does **not** define:
- How Smart Stock Entry (OCR) should detect whether a receipt's stated figure is per-unit or total — that remains a Specification/technical question.
- A UI mechanism for the owner to override or clarify the interpretation for a specific purchase.
- The display precision or rounding of a derived cost-at-another-unit figure (`POL-0002`).
- Any resolution of `BDR-0012` §5.A's still-open items.

## Governance Notes

- This record does not modify `BDR-0012`, `product-unit-of-measure-discovery.md`, `apps/tenant/src/types.ts`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve any of `BDR-0012`'s remaining open items.
