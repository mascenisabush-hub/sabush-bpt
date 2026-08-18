Decision Record

# POL-0003 — Similarity-Confirmation Threshold & Experience

**Status:** DRAFT — proposed for Product Architect review. Not approved. Not authorized for implementation.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 4, and §2 Decisions 10–11 (a possible match may be suggested but never silently decided; while unresolved, neither merge nor new-identity creation proceeds).
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0012` Decisions 10–11 already establish, as approved business decisions, that the system may suggest a possible existing-product match and must pause both outcomes (merge or new-identity creation) until the owner explicitly resolves it. Those decisions do not specify what should trigger a suggestion in the first place, or what the confirmation moment should look like — this Policy addresses that operational gap.

## Guiding Principle

Consistent with `BDR-0012` Decision 10's own text — *"certainty is never a precondition for asking"* — this Policy treats a plausible-but-uncertain signal as sufficient grounds to ask the owner, rather than requiring a high-confidence threshold before the system is "allowed" to raise the question.

## Candidate Signals

The system may treat any of the following as grounds to suggest a possible match, without requiring all of them simultaneously:
- Name similarity after normalization (case, spacing, punctuation, and accent differences) — building on the normalization pattern already proven elsewhere in this codebase (`businessCategories.ts`'s existing `normalize()` function, confirmed in `product-unit-of-measure-discovery.md` Part I §14, though not currently applied to product names).
- A shared barcode or SKU value between a newly entered/scanned product and an existing one — `Product.barcode`/`Product.sku` already exist and are already stored today, but are confirmed unused for any matching purpose (`product-unit-of-measure-discovery.md` Part I §2, §14) — this Policy treats using them for this purpose as in scope, without specifying the matching logic itself.

This Policy does not require, rank, or weight these signals relative to each other — that remains a technical-design question for the eventual Specification and implementation.

## Confirmation Experience — Minimum Shape

Whatever the eventual interaction design, it must, at minimum: present the specific candidate match to the owner (not a generic "possible duplicate" notice); offer exactly two resolutions — "same product" or "different product" — matching `BDR-0012` Decision 11's own language; and take no default action if the owner has not yet responded, consistent with `BDR-0012` Decision 11's "neither outcome may proceed silently" rule.

## What This Policy Does Not Set

A specific numeric similarity threshold, confidence score, or matching algorithm is not set here — `BDR-0012` §6 already excludes any such algorithm from BDR-level decision-making, and this Policy, operationalizing that BDR, does not reach further into that territory than the BDR itself authorized. The candidate signals above name *categories* of evidence the system may use, not a formula for combining them.

## Scope Exclusions

This Policy does **not** define:
- A specific similarity algorithm, string-distance metric, or numeric confidence threshold.
- Exact UI copy, layout, or interaction flow for the confirmation moment.
- Whether barcode/SKU matching is prioritized over name-similarity matching, or how conflicting signals are reconciled.
- Any resolution of `BDR-0012` §5.A's still-open items.

## Governance Notes

- This record does not modify `BDR-0012`, `product-unit-of-measure-discovery.md`, `server/smartStockEntry.ts`, `businessCategories.ts`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve any of `BDR-0012`'s remaining open items.
