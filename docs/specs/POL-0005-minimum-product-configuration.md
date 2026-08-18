Decision Record

# POL-0005 — Minimum Required Product Configuration

**Status:** Approved. Approved exactly as drafted; the optional Minor wording-consistency observation identified during independent review (the "Confirmed Product Memory" bullet's selling-unit phrasing) was not applied.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 3, Decision 17 (Recognition), Decision 13 (Product Memory), Decision 14 (owner reconfiguration), §5.A Item 3 (single confirmed relationship family), §5.A Item 4 (purchase-unit default/flexibility), and §5.A Item 6 (incomplete configuration — warn, allow entry).
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0012` §5.A Item 6 already establishes that an *incomplete* configuration warns the owner and allows entry rather than blocking it — but it does not define what "incomplete" means. This Policy answers that operational question: what must actually be supplied and confirmed before a new product's configuration is considered sufficiently established for normal use, versus what may remain optional or deferred.

## Guiding Principle

Consistent with `BDR-0012`'s own careful separation of concepts (its reconciliation amendment §3.2), this Policy distinguishes exactly what a Recognition *proposal* contains from what owner *confirmation* actually establishes — a proposal is never treated as if it already satisfied this Policy's minimum, no matter how complete it looks.

## What "Confirmed Configuration" Requires, at Minimum

The minimum confirmed configuration must establish the product's confirmed unit relationship, and — where a selling/valuation reference is being configured — the unit against which that remembered selling/valuation reference is expressed:

1. **The unit relationship** — the single confirmed chain (`BDR-0012` §5.A Item 3), whether proposed by Recognition and accepted, or entered directly by the owner without Recognition ever firing.
2. **A selling/valuation unit, where a selling/valuation reference is being configured** — which of the chain's units the remembered selling price would apply to (`BDR-0012` Decision 2). **A selling price itself is not required.** This Policy does not mandate that a selling-unit concept be established for a product that has not yet configured any selling/valuation reference at all — only that, if and when such a reference is configured, it is expressed against one of the chain's own confirmed units.

A **Recognition proposal, by itself, satisfies neither of these** — per `BDR-0012` Decision 17, a proposal is never authoritative; only explicit owner confirmation converts it into the confirmed configuration this Policy describes.

## What May Remain Optional or Deferred

The following are not required for a product's configuration to be considered minimally usable, and their absence does not, by itself, constitute the "incomplete configuration" condition `BDR-0012` §5.A Item 6 addresses:

- A remembered selling *price* (distinct from the selling *unit* above) — a product can have a confirmed unit relationship and selling unit while its price is still being determined or updated, consistent with `03-products.md`'s existing treatment of reference prices as editable, non-blocking metadata.
- Barcode, SKU, category, or supplier metadata — already optional today (`03-products.md`), unaffected by this Policy.
- Any purchase having yet occurred — a product's configuration can be confirmed before its first purchase is recorded, consistent with the Recognition → confirmation → Product Memory sequence (`BDR-0012` §17) occurring at first-time entry, potentially ahead of the first Add Stock transaction.

## Relationship to Purchase-Unit Flexibility

This Policy does not require that a purchase's specific unit be known or fixed at the moment configuration is confirmed. `BDR-0012` §5.A Item 4 already establishes that the top-level unit is only a *default*, freely overridable to any unit within the confirmed chain, at the moment of each individual purchase. Minimum configuration, per this Policy, concerns the *relationship itself* being confirmed — not any specific future purchase's unit.

## Relationship to Incomplete Configuration (Item 6)

A product not meeting the minimum threshold above is considered incompletely configured for purposes of this Policy. The business response to incomplete configuration remains the warn-and-allow-entry rule already established by `BDR-0012` §5.A Item 6 — this Policy does not weaken that rule: an owner may still proceed with an entry against an unconfirmed or partially-confirmed product, warned accordingly, exactly as Item 6 already establishes. This Policy only defines the threshold Item 6's warning is measured against; it does not classify every other possible configuration state.

## Product Identity, Unit Relationship, Confirmed Product Memory, Purchase Facts, and Stock-Count Facts — Kept Distinct

Consistent with `BDR-0012` §3's own three-way distinction, extended here to five related concepts this Policy touches:

- **Product identity** — the stable catalog record (`03-products.md`), unaffected by whether configuration is minimally complete.
- **Unit relationship** — the confirmed chain itself, the first minimum element above.
- **Confirmed Product Memory** — the full owner-confirmed configuration (unit relationship, selling unit, and, once set, selling price), per `BDR-0012` Decision 13.
- **Purchase facts** — batch-specific, recorded at the moment of a specific purchase (`BDR-0012` §3), never derived from or blocked by this Policy's minimum-configuration threshold.
- **Stock-count facts** — physically observed quantities, likewise batch-specific and independent of this Policy's threshold, subject instead to Item 6's warn-and-allow-entry rule when the product's configuration is incomplete.

## Scope Exclusions

This Policy does **not** define:
- A database schema, Firestore document structure, or technical representation of "confirmed" versus "unconfirmed" configuration.
- React state, UI implementation, or the specific warning copy/experience for an incomplete-configuration entry.
- A recognition algorithm, confidence threshold, or AI mechanism (`POL-0003`'s domain, where relevant to duplicate detection, not to minimum configuration).
- Any resolution of `BDR-0012` §5.A Item 7 or any other still-open item.

## Governance Notes

- This record does not modify `BDR-0012`, the Discovery Report, `POL-0001` through `POL-0004`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve `BDR-0012` §5.A Item 7 or any other remaining open item.
