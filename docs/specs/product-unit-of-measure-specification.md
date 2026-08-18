Business Domain Specification

# Product Unit-of-Measure, Product Memory & Recognition — Specification

**Status:** ✅ Accepted (2026-08-18). See "Product Architect Acceptance," below.
**Location note:** Filed in `docs/specs/`, unprefixed — this capability is cross-cutting (Products, Stock Batches, Stock Counts, Smart Stock Entry, Business Worth Engine), following the same unprefixed naming pattern already established for this exact capability by `BDR-0012`, the `POL-NNNN` namespace, and the accepted reconciliation amendment.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Approved, 17 decisions), `POL-0001` through `POL-0006` (all Approved), the [accepted reconciliation amendment](./product-unit-of-measure-reconciliation-amendment.md).
**Followed by:** Not yet drafted — Rule 8 Assessment, per `BDR-0012` §9's sequence, once this Specification is itself accepted.

---

## 1. Purpose

Formalizes, at the technical-architecture level, the capability `BDR-0012` and `POL-0001`–`POL-0006` already approved at the business level: an owner confirms a product's unit-of-measure relationship once — proposed by Recognition or entered manually — and that confirmed relationship (Product Memory) is thereafter reused automatically across Add Stock, Initial Stock, Periodic Contagem, and Smart Stock Entry, without asking the owner to reconfigure it on every routine interaction.

## 2. Data Model

**Chosen model: an ordered array of `{unit, factorFromPrevious}` pairs on the `Product` record — "Model B" from the preceding investigation.** This is a Specification-level technical decision, not itself a new business decision; it directly mirrors the strictly-ordered chain language `BDR-0012` already uses in every worked example (Decision 17; `1 Cx = 4 Emb = 24 Un`), with the first element serving as the top-level/default unit for §5.A Item 4's purposes.

```
Product.unitRelationship?: {
  units: Array<{ unit: string; factorFromPrevious: number }>;
  // units[0] = top-level/default unit, factorFromPrevious ignored for it
  // units[1].factorFromPrevious = how many units[1] make one units[0]
  sellingUnit?: string; // must be one of units[].unit, per POL-0005
  confirmedAt: string; // ISO string
}
```

Absence of `unitRelationship` means the product has no confirmed configuration — the exact condition `POL-0005` and §5.A Item 6 govern. No separate "family ID" or family-selector field is introduced, consistent with §5.A Item 3's explicit prohibition.

**Explicit gap:** the Specification does not yet establish the valid numeric domain, zero/negative-value handling, or precision requirements for `factorFromPrevious`. These validation boundaries must be resolved during Rule 8/technical validation before implementation — this is a data-model completeness gap, not a decision this Specification makes or defers to `POL-0001`/`POL-0002` (which govern fractional-quantity and rounding treatment of already-valid values, not this field's own valid range).

## 3. Recognition Flow (Decision 17)

1. On first-time product entry (no existing `Product` document matches by name), Recognition may be invoked. `POL-0003` remains the governing similarity-confirmation policy for duplicate/identity handling, and Recognition remains the Decision 17 capability for proposing a unit structure for a genuinely first-time product — this Specification does not decide the exact technical ordering or orchestration between similarity detection and Recognition; the eventual implementation must respect both policies, with their precise sequencing left as a later technical design concern.
2. Recognition returns a **proposal only** — held in transient UI state, never written to `Product`.
3. The owner reviews, may edit, and must take one explicit confirmation action.
4. Only that confirmation action writes `unitRelationship` to `Product`.
5. If a product already has `unitRelationship` set, Recognition is never invoked for it — the existing confirmed configuration is retrieved and reused directly (Decision 17's explicit "never re-run" clause).
6. **Smart Stock Entry integration — partially determined, partially an explicit gap.** Decision 17's trigger condition — *"when a product is entered for the first time in a business's catalog"* — is written generally and contains no restriction to any specific entry surface; it is not limited to manual Product Creation. `BDR-0012` Decision 8 already describes Smart Stock Entry's existing whole-batch flow, where *"new products are surfaced together and require only the information the platform genuinely could not already know."* On this basis, Recognition's general applicability to a first-time product surfaced through that flow is supported by Decision 17's own unrestricted wording — **this much is citable, not invented.** **What is not determined by any governing decision, and is explicitly left as a Specification/Rule 8 gap:** the precise integration mechanics — whether Recognition runs inline during OCR processing, only once the whole-batch review screen is reached, or through some other orchestration; how a Recognition proposal for a batch-surfaced product interacts with Decision 9's whole-batch, single-action confirmation requirement. No trigger mechanism, AI call pattern, or UI flow is decided here.

**Lifecycle, stated explicitly:** a Recognition proposal is not Product Memory, and has no independent authoritative write path — the only event that creates or updates confirmed Product Memory for a genuinely new configuration is the owner's explicit confirmation action (step 3–4, above). Where Product Memory already exists, it is reused, never re-recognized (step 5, above). A *permanent* change to an already-confirmed configuration remains Decision 14's explicit owner-reconfiguration action, distinct from this flow. A *temporary*, single-transaction field-value override remains `POL-0006`'s subject, not this section's. `POL-0006`'s open question — whether a transaction may temporarily substitute a different relationship *factor* — remains explicitly unresolved and is not addressed or narrowed by anything in this Specification.

### 3a. Existing Products Without a Confirmed Relationship

This capability distinguishes three cases, only the first of which §3 above directly addresses:

- **(A) Genuinely new `Product`, no existing record at all** — governed by §3's Recognition flow, above.
- **(B) Existing `Product` record, created before this capability existed or otherwise never confirmed, with no `unitRelationship`** — an entry against such a product is governed by `BDR-0012` §5.A Item 6: warned, not blocked, no invented conversion, no silent fallback, exactly as for any other incomplete configuration. **This Specification does not authorize, and no governing decision authorizes, any automatic migration, bulk backfill, or silent configuration for this case.** Whether the system should ever *proactively offer* Recognition or a configuration prompt to an owner encountering such a product — as opposed to the owner-initiated reconfiguration path Decision 14 always makes available regardless — is not addressed by any governing decision reviewed. **This is explicitly marked as an unresolved Specification/Rule 8 question**, not decided here. This does not touch, and is not a resolution of, `BDR-0012` §5.A Item 7.
- **(C) Existing `Product` with confirmed Product Memory** — governed by §3 step 5, above: retrieved and reused, never re-recognized.

## 4. Screen-by-Screen Behavior

- **Add Stock:** if `Product.unitRelationship` exists, the unit-entry field defaults to `units[0].unit` (top-level default, §5.A Item 4) and remains freely editable to any `units[].unit` in the chain. A chain-member unit saves without an unrelated-unit warning; a unit that is not part of the confirmed chain does not block the entry, but triggers Item 6's explicit warning-and-allow-entry treatment — the entry still saves once warned, no conversion is invented, and no silent fallback occurs. The exact warning UX remains a later implementation concern.
- **Initial Stock:** Product Memory prefill, editability, and persistence follow the same batch-independent pattern as Add Stock — `InitialStockDraftItem`/the confirmed `initial`-type `StockCount` record are independently editable rows, never derived from Product Memory except as a pre-fill default (`BDR-0012` §3). Where the confirmed relationship exists, a chain-member unit is accepted without warning; a non-member unit triggers Item 6's warn-and-allow treatment, identically to Add Stock — no evidence distinguishes Initial Stock's handling of this specific case from Add Stock's. **One point worth noting explicitly, not assumed:** for many products, Initial Stock may be the *first* time that product is ever entered into the system at all (typical of a new business's onboarding) — in that case, §3's general "first-time entry" trigger condition applies here too, under the same Decision 17 basis, not a new or different trigger.
- **Periodic Contagem:** by contrast, a periodic count necessarily concerns a product that already exists in the catalog — Recognition's first-time-entry trigger essentially never applies here; the relevant cases are always either an existing confirmed configuration (reused, never re-recognized) or an existing but unconfigured product (see the new §3a below). The mixed-unit combination step (Decisions 6–7) converts all entries for one product within one count to the confirmed chain's top-level unit, `units[0]`, for valuation purposes — the same single reference point Add Stock's default already uses (§5.A Item 4); no separate, configurable, or per-count reference-unit choice is introduced. The exact technical calculation mechanics remain a Rule 8/implementation concern; only the reference point itself (`units[0]`) is fixed here. A chain-member unit is accepted without warning; a non-member unit triggers Item 6's warn-and-allow treatment, exactly as for Add Stock and Initial Stock.

  **Expected Current Stock Value is explicitly preserved, untouched, by this mixed-unit combination.** `BDR-0009` §5 establishes a narrow, aggregate-only "Expected Current Stock Value" exception that may never be decomposed to a per-product row; the accepted [reconciliation amendment](./product-unit-of-measure-reconciliation-amendment.md) §3.4 already confirmed this boundary is unaffected by this capability. This Specification adds no new valuation behavior and does not redefine, decompose, or otherwise touch that separate, aggregate-only figure — the mixed-unit combination described above concerns only observed physical quantities being valued under Stock Count's own existing treatment (Decision 7), never the whole-business Expected Current Stock Value comparison.
- **Smart Stock Entry:** extraction behavior is unchanged — it continues to copy whatever unit a document literally states (per the now-cross-referenced but unmodified rule). Once extraction completes, the review screen pre-fills using `Product.unitRelationship` exactly as it already pre-fills `costPrice`/`sellingPrice` today, with the same "prefilled from history, not extracted from this document" visual distinction the existing amendment already requires.
- **Product Creation:** triggers the Recognition flow (§3) for a genuinely new product name; for an existing product, no Recognition step occurs.

## 5. Purchase Cost Interpretation (`POL-0004`)

A stated purchase cost is interpreted as the cost per the unit actually selected for that entry — unchanged from the existing `StockBatch.costPrice`/`sellingPrice` "per unit" semantics, now extended to whichever chain unit was used, per `POL-0004`.

## 6. Fractional Quantities and Rounding (`POL-0001`/`POL-0002`)

Any conversion along the chain (§2's `factorFromPrevious` arithmetic) preserves full precision internally; final monetary figures round to two decimal places, extending the existing `Number(x.toFixed(2))` convention already used in `stockCount.ts`. No new rounding scheme is introduced.

## 7. Incomplete/Unconvertible Configuration (§5.A Item 6, `POL-0005`)

A product missing `unitRelationship`, or missing a confirmed `sellingUnit` where a selling reference is being configured, is incompletely configured per `POL-0005`'s threshold. Any entry against such a product is warned, not blocked — the warning must be specific and visible, never a generic error, and never silently treated as a successful, fully-interpreted entry.

## 8. Temporary Override (`POL-0006`)

An owner may enter a different cost, quantity, or unit-of-entry for a single transaction without altering `Product.unitRelationship` — this is simply the existing "purchase-side facts are never derived from Product Memory" architecture, already true today, extended consistently. **Temporarily substituting a different `factorFromPrevious` value for one transaction is explicitly out of scope** — `POL-0006`'s open point remains unresolved and is not implemented by this Specification.

## 9. Minimum Configuration Validation (`POL-0005`)

A save/confirm action that would set `unitRelationship` must include at least `units[0]` (top-level unit) and, if any `sellingUnit` is being set, that value must be a member of `units[]`. `sellingPrice`, barcode, SKU, and category remain optional, unaffected by this validation.

## 10. Tenant Isolation

`unitRelationship` lives on the existing `Product` document, already scoped under `businesses/{businessId}/...` per existing `firestore.rules` — no new isolation rule is required.

## 11. Failure Modes

| Failure | Behavior |
|---|---|
| Recognition service unavailable/errors | Falls back to today's existing manual entry — no Recognition proposal shown, owner enters manually. |
| Owner abandons confirmation mid-flow | No partial or implicit configuration is saved. |
| Purchase/count unit outside confirmed chain | Warn, allow entry, no invented conversion (Item 6). |
| Product has no confirmed configuration at entry time | Warn, allow entry (Item 6), consistent with `POL-0005`'s threshold. |

## 12. Explicitly Out of Scope

- Multiple independent relationship families, any family selector/identifier (§5.A Item 3).
- Any AI provider/model selection or recognition algorithm internals.
- `POL-0003`'s similarity algorithm/threshold specifics.
- Historical backfill or migration of any kind (Item 7 remains open; no prevalence assumed).
- `POL-0006`'s relationship-factor substitution question.
- Rule 8 Assessment and Implementation Authorization — separate, later gates.

## Governance Notes

- This Specification does not modify `BDR-0012`, any Policy, or the reconciliation amendment.
- No application code, schema, or `firestore.rules` change is made by this document.
- Acceptance of this Specification does not itself authorize implementation — Rule 8 Assessment and Implementation Authorization remain separate, required gates per `BDR-0012` §9.

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-08-18).

> The current Specification is accepted exactly as currently drafted, applying to the corrected content exactly as reviewed by the adversarial governance review and its six targeted corrections. No further substantive change is made by this acceptance. This acceptance does not authorize Rule 8 Assessment, Rule 8 drafting, technical implementation, code changes, schema implementation, AI model/provider selection, algorithm implementation, UI implementation, database migration, historical-data backfill, or Implementation Authorization — all remain separate, required gates per `BDR-0012` §9.
