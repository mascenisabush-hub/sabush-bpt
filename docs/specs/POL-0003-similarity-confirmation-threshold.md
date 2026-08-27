Decision Record

> **Extended — see
> [POL-0012](./POL-0012-similarity-confirmation-threshold-unit-normalization-amendment.md).**
> A third Candidate Signal has been added: unit-spelling equivalence
> (e.g. "2L" and "2 Lt" may be treated as referring to the same unit),
> applied to the unit token only — quantity is never normalized away,
> so "1L" and "2L" remain distinct. The existing similarity threshold
> and the two Candidate Signals below are otherwise unchanged and
> remain fully in force, as is everything else in this document,
> including its "Confirmation Experience — Minimum Shape" section — a
> separately identified, pre-existing question about whether the
> current UI conforms to that section is tracked independently, not
> resolved by POL-0012. This document's own text below is preserved as
> the original historical record and is **not** edited to reflect the
> amendment; read POL-0012 for the current rule.

# POL-0003 — Similarity-Confirmation Threshold & Experience

**Status:** Approved.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 4, and §2 Decisions 10–11 (a possible match may be suggested but never silently decided; while unresolved, neither merge nor new-identity creation proceeds).
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0012` Decisions 10–11 already establish, as approved business decisions, that the system may suggest a possible existing-product match and must pause both outcomes (merge or new-identity creation) until the owner explicitly resolves it. Those decisions do not specify what should trigger a suggestion in the first place, or what the confirmation moment should look like — this Policy addresses that operational gap.

## Guiding Principle

Consistent with `BDR-0012` Decision 10's own text — *"certainty is never a precondition for asking"* — this Policy treats a plausible-but-uncertain signal as sufficient grounds to ask the owner, rather than requiring a high-confidence threshold before the system is "allowed" to raise the question.

## Business Requirements Now Settled

The following are settled by this Policy, operationalizing `BDR-0012`'s already-approved decisions:

1. BPT may identify and present possible duplicate products to the owner.
2. Product-name similarity may be used as a candidate signal.
3. Barcode/SKU agreement, when available, may also be used as a candidate signal.
4. Multiple available signals may be considered together — this Policy permits combining signals; it does not decide how they are combined or weighted (see Technical Boundary, below).
5. A candidate match is never an identity decision by the system (`BDR-0012` Decision 10).
6. The owner must explicitly confirm or reject the proposed match (`BDR-0012` Decision 11).
7. The system must show the owner enough relevant information about the candidate match to understand why it was presented.
8. The system must never silently merge, rename, reinterpret, or otherwise resolve product identity (`BDR-0012` Decisions 10–11).

## Candidate Signals

Per items 2–4 above, the system may treat any of the following as grounds to suggest a possible match, individually or together:
- **Name similarity**, after normalization (case, spacing, punctuation, and accent differences).
- **Shared barcode or SKU value** between a newly entered/scanned product and an existing one. `Product.barcode`/`Product.sku` already exist and are already stored today, but are confirmed unused for any matching purpose (`product-unit-of-measure-discovery.md` Part I §2, §14) — this Policy treats using them for this purpose as in scope.

**Evidence/context note, not a requirement:** `businessCategories.ts` contains an existing `normalize()` function (confirmed independently). The Discovery Report noted its existence only incidentally, as one of the "only unrelated hits" in an exhaustive grep for fuzzy-matching terms (`product-unit-of-measure-discovery.md` Part I §2) — it did not evaluate, and this Policy does not assert, that `normalize()` is suitable, sufficient, or validated for product-name similarity matching. It is cited here only to establish that *some* normalization capability already exists somewhere in this codebase, not to prescribe its reuse.

## Confirmation Experience — Minimum Shape

Whatever the eventual interaction design, it must, at minimum: present the specific candidate match to the owner, together with enough relevant information (per item 7, above) for the owner to understand why it was flagged — not a generic "possible duplicate" notice with no explanation; offer exactly two resolutions — "same product" or "different product" — matching `BDR-0012` Decision 11's own language; and take no default action if the owner has not yet responded, consistent with `BDR-0012` Decision 11's "neither outcome may proceed silently" rule.

## Technical Boundary

This Policy does not decide, and explicitly leaves to the later Specification:
- The similarity algorithm or string-distance metric.
- The numeric confidence threshold, if any.
- How multiple signals are weighted or combined when more than one is present.
- The normalization method used for name comparison (including whether `normalize()` above is reused, replaced, or extended).
- The underlying data model or storage mechanism for candidate-match evidence.
- The implementation mechanism (client-side, server-side, synchronous, or otherwise) for generating a candidate match.

`BDR-0012` §6 already excludes all of the above from BDR-level decision-making; this Policy, operationalizing that BDR, does not reach further into that territory than the BDR itself authorized.

## Scope Exclusions

This Policy does **not** define:
- A specific similarity algorithm, string-distance metric, numeric confidence threshold, or signal-weighting scheme.
- A normalization method, data model, or implementation mechanism (see Technical Boundary, above).
- Exact UI copy, layout, or interaction flow for the confirmation moment, beyond the minimum shape stated above.
- Any resolution of `BDR-0012` §5.A's still-open items.

## Governance Notes

- This record does not modify `BDR-0012`, `product-unit-of-measure-discovery.md`, `server/smartStockEntry.ts`, `businessCategories.ts`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve any of `BDR-0012`'s remaining open items.
