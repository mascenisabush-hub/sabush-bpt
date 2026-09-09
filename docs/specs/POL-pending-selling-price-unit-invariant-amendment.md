Decision Record

# POL-pending-selling-price-unit-invariant-amendment — Minimum Required Product Configuration Policy Amendment: Selling-Price / Selling-Unit Write-Time Invariant

**Status:** ACCEPTED. Explicitly unnumbered — no `POL-NNNN` identifier is assigned to this record.

**Type:** Policy amendment, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Amends [`POL-0005`](./POL-0005-minimum-product-configuration.md) §"What 'Confirmed Configuration' Requires, at Minimum" only — adds one write-time persistence invariant; does not reopen any other section of `POL-0005` (Purpose, Guiding Principle, What May Remain Optional or Deferred, Relationship to Purchase-Unit Flexibility, Relationship to Incomplete Configuration (Item 6), Product Identity/Unit Relationship/Confirmed Product Memory/Purchase Facts/Stock-Count Facts — Kept Distinct, or Scope Exclusions), all of which remain exactly as `POL-0005` already states.

**Sequencing note:** No `POL-NNNN` identifier is assigned by this record. Per the Numbering Ledger addendum's own assignment-authority rule (restated verbatim in `POL-0010`'s header, exercised again in `POL-0011`'s "Sequencing note"), assignment requires an explicit Product Architect decision, made each time, and is never inferred from repository state or the highest previously-assigned number. Direct inspection at drafting time confirmed `POL-0001`–`POL-0014` are all currently assigned with no gap, making `POL-0015` the next collision-free slot *by observation only* — this document does not claim that number. The Product Architect's acceptance of this amendment's substantive content (§20/Acceptance, below) is a separate act from a numbering decision, and does not itself assign one. Filed under a descriptive working title, mirroring the precedent `POL-pending-business-worth-evolution-policy.md` already established in this repository for the same situation, pending a future, separate, explicit numbering decision.

**Location note:** Recorded in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace `POL-0005` itself already occupies — consistent with the precedent `POL-0011`/`POL-0012`/`POL-0013` already established of recording a policy amendment as its own new document rather than editing the original decision record in place. Repository precedent is noted here as useful context only; this amendment does not itself decide how `POL-0005`'s document is to be treated upon filing.

**Depends on:** [`POL-0005`](./POL-0005-minimum-product-configuration.md) (the record this amends), [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (the source BDR `POL-0005` operationalizes — unaffected, not reopened), `docs/engineering/product-catalog-phase-2-bdr.md` (the accepted Product Catalog Phase 2 BDR, commit `e9e4297e7ba010619fd6ca81973fff07415711cf` — the specific business decision this amendment operationalizes, per its own §9 and §15).

**Followed by:** Not yet drafted, not derived by this record. A Specification, Rule 8 Assessment, and Implementation Authorization all remain required, separately, before any implementation. The Phase 1 Decision 9 amendment (Product Catalog Phase 2 BDR §14) is a separate, distinct governance artifact — not derived from, folded into, or a prerequisite of this record.

---

## Why This Amendment Exists

The accepted Product Catalog Phase 2 BDR establishes, as a business decision: *"A selling price may never be canonically recorded without an accompanying selling/reference unit — in Catálogo, Contagem, or Add Stock, without exception."* Its own §9 explicitly defers the operational rule needed to enforce this to Policy, and its own §15 names amending `POL-0005` as the required follow-up. `POL-0005`'s current text treats the selling-unit/selling-price relationship as a conceptual condition only — *"if and when such a reference is configured, it is expressed against one of the chain's own confirmed units"* — without stating what must happen at the moment of write if that condition would otherwise be violated. This amendment closes exactly that gap, as a Policy-level operational rule, without deciding how any door's UI or write mechanism achieves it.

## Amendment — The Write-Time Canonical Persistence Invariant

**`POL-0005`'s "What 'Confirmed Configuration' Requires, at Minimum" section is extended with one additional operational rule, governing persistence rather than configuration completeness:**

**A canonical `Product.sellingPrice` may not be created or updated to a non-null, non-empty value unless that same write results in a valid `unitRelationship.sellingUnit` being present on the Product.** This is a rule about what may reach canonical persisted state — it governs the write, not the sequence of user interaction that precedes it.

This applies identically to:
- **Creation** of a canonical Product record that includes a selling price.
- **Any update** that sets or changes canonical `Product.sellingPrice`.

This applies **uniformly, without exception, regardless of which operational door performs the write** — Catálogo, Contagem, or Add Stock. No door is exempt, and no door receives a different version of the invariant.

### The Four Cases, Restated as the Operative Rule

1. **Product with no selling price** — allowed. This invariant does not fire; `POL-0005`'s existing "a selling price itself is not required" position is unchanged and fully preserved.
2. **Product with a confirmed unit relationship but no selling price** — allowed. Unchanged from `POL-0005`'s existing position.
3. **Product with a selling price and a valid, accompanying `unitRelationship.sellingUnit`** — allowed. This is the only state in which a non-null canonical selling price may be persisted.
4. **A write that would result in a canonical selling price with no valid `unitRelationship.sellingUnit`** — **not allowed, regardless of which door originates the write.** The write must not reach persistence in that state.

## What This Amendment Does Not Change

- **`POL-0005`'s "A selling price itself is not required" position** — unchanged, fully preserved. This amendment does not make a selling price mandatory for any Product, at any door, at any point.
- **`POL-0005`'s "selling/valuation unit... where a selling/valuation reference is being configured" conditional language** — unchanged in what it describes; this amendment only adds that the condition must now hold at the moment of write, not merely be true in the abstract once configuration is "considered."
- **`POL-0005`'s "What May Remain Optional or Deferred" section** — unchanged. Barcode, SKU, category, supplier metadata, and "any purchase having yet occurred" remain exactly as optional as `POL-0005` already states. This amendment does not enlarge what is required to create a Product.
- **`POL-0005`'s "Relationship to Purchase-Unit Flexibility" section** — unchanged. The top-level unit remains a default only, freely overridable within the confirmed chain at the moment of each purchase; this amendment does not touch purchase-unit semantics at all.
- **`POL-0005`'s "Relationship to Incomplete Configuration (Item 6)" section** — unchanged in its general form: a product not meeting the minimum threshold remains warned, not blocked, per `BDR-0012` §5.A Item 6. This amendment narrows that general principle in exactly one specific, already-BDR-decided way: a selling price with no selling unit is not treated as "incomplete but enterable with a warning" — it is a state that may not be canonically persisted at all, per the accepted BDR's own explicit "NOT ALLOWED" classification of Case D. Every other incomplete-configuration scenario `POL-0005` already describes remains warn-and-allow, unaffected.
- **The five-way distinction in `POL-0005`'s "Product Identity, Unit Relationship, Confirmed Product Memory, Purchase Facts, and Stock-Count Facts"** — unchanged and explicitly reaffirmed by this amendment, not narrowed: canonical `Product.sellingPrice` remains distinct from `unitRelationship.sellingUnit` (a different field, on the same record, both required together only under Case 4 above); both remain distinct from transaction-specific purchase/count pricing (`StockBatch.sellingPrice`, `StockCountItem.sellingPrice`), which this amendment does not touch and does not constrain in any way; and both remain distinct from the non-canonical, display-only historical fallback (`findLatestRememberedProductMemory`), which this amendment does not authorize promoting into canonical state by any mechanism.
- **`POL-0005`'s Scope Exclusions** — unchanged and reaffirmed: this amendment continues to exclude "a database schema, Firestore document structure, or technical representation," "React state, UI implementation, or the specific warning copy/experience," and any recognition/confidence-threshold mechanism. This amendment adds one more explicit exclusion of its own (below).

## Enforcement / UI Boundary — Explicitly Out of Scope

This amendment states the invariant that must hold in canonical persisted state. It does **not** prescribe, and explicitly leaves to a future Specification:

- Whether any door blocks a save outright, requires the unit in the same action/modal as the price, or uses some other mechanism.
- The specific warning or error experience, in any door.
- Whether Catálogo, Contagem, and Add Stock use the same enforcement interaction or door-appropriate variants of their own.
- Any particular UI field order — an Owner may type a price before selecting a unit; this amendment governs what may be persisted, not what may be typed or in what sequence.
- Any particular React component, shared or otherwise.
- Any particular function, write path, or Firestore transaction/document structure — including, specifically, whether `confirmProductUnitRelationship` is used, extended, or bypassed by whatever mechanism eventually enforces this invariant. This amendment does not require, recommend, or reference that function as a solution; it is named nowhere in this amendment's operative rule.

## Preserved Boundaries (Unaffected by This Amendment)

- **Product Recognition** does not gain any authority to silently establish or overwrite canonical selling configuration as a result of this amendment. Recognition remains candidate-only, per `BDR-0012` Decisions 10–12 and 17, unmodified.
- **Cost Price** remains purchase-workflow-owned, per FR-88. This amendment concerns the selling side exclusively and does not touch cost price in any way.
- **Historical protection** is unaffected. This amendment governs future canonical writes only; it creates no new rule about, and does not authorize any rewriting of, historical batches, counts, or Business Worth snapshots (`BDR-0012` Decisions 14–16, unchanged).
- **`BDR-0012`'s own Product Memory governance** is unaffected in full — this amendment operationalizes one already-decided rule from the accepted Phase 2 BDR; it does not reopen, narrow, or extend anything `BDR-0012` itself decided.
- **Business Worth** is unaffected. This amendment governs canonical Product Information persistence only; it creates, changes, or authorizes no stock, batch, count, or valuation effect of any kind.

## Relationship to the Accepted Product Catalog Phase 2 BDR

This amendment operationalizes exactly one business rule from the accepted BDR (`docs/engineering/product-catalog-phase-2-bdr.md`, accepted `e9e4297e7ba010619fd6ca81973fff07415711cf`) — its §9 Selling Price + Selling Unit Rule — per that BDR's own §15 instruction. It does not operationalize, and does not attempt to operationalize, any other decision from that BDR (the multi-door editing principle, the Product/Product Memory distinction, the Catálogo-as-dedicated-surface role, or any of the three remaining BDR §16 Open Questions, all of which remain untouched and unresolved by this amendment).

## Relationship to Phase 1 Decision 9

Product Catalog Phase 1's Decision 9 ("Catalog registration establishes identity and current selling price," with no selling-unit precondition) is factually superseded by the rule this amendment states, exactly as the accepted Phase 2 BDR's own §9 and §14 already identify. **Formally amending Decision 9's own wording is a separate, distinct governance action, in a different artifact (the Product Catalog Phase 1 Decision Proposal), and is explicitly not performed by this Policy amendment.** This mirrors the accepted BDR's own governing chain (§18), which lists the Decision 9 amendment and the Policy amendment as two separate items under §15, not one.

## Governance Notes

- This record does not implement code, modify runtime behavior, edit application logic, or change any `firestore.rules`, `src/`, or `server/` file. None were touched to produce it.
- No other existing repository file was written, edited, or otherwise modified to produce or record this amendment, including `POL-0005` itself.
- This record does not modify `BDR-0012`, the accepted Product Catalog Phase 2 BDR, or any other existing artifact.
- This record does not resolve any of the three Open Questions recorded in the accepted Phase 2 BDR's §16.
- This record does not amend Product Catalog Phase 1 Decision 9 — see "Relationship to Phase 1 Decision 9," above.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not assign, claim, or reserve a `POL-NNNN` identifier — see "Sequencing note," above.
- This record does not modify `19-governance-bdr-policy-framework.md`'s Numbering Ledger table.

**Lifecycle:** Designed → Approved → **ACCEPTED** (operational policy amendment, unnumbered). Not Specified, not Implemented, not Executed, not Analyzed — no engineering work is authorized by this record.

---

## Acceptance

> I have reviewed this Policy Amendment to `POL-0005`, covering the write-time canonical persistence invariant for selling price and selling/reference unit (the operative rule and its four restated cases), its explicit non-scope (enforcement mechanics, UI, schema, and any specific function or component), its preserved boundaries (Recognition, Cost Price, historical protection, Business Worth, `BDR-0012`), and its relationship to both the accepted Product Catalog Phase 2 BDR and the separately-required Phase 1 Decision 9 amendment. I confirm this acceptance authorizes progression to a Specification only, and does not itself authorize any code, schema, or UI change, and does not constitute Rule 8 approval.

**Signature:** SABUSHIMIKE MASCENI
**Date:** 2026-09-09
