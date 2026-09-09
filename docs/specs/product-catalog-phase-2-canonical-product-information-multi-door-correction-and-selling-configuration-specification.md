Business Domain Specification

# Product Catalog Phase 2 — Canonical Product Information, Multi-Door Correction, and Selling Configuration Specification

**Status:** ✅ Accepted (2026-09-09). See "Product Architect Acceptance," below.
**Type:** Business Domain Specification, per `19-governance-bdr-policy-framework.md` §2 — translates already-accepted Product Architect decisions into precise, testable functional requirements. Decides no new business philosophy or product-architect-level product decision.
**Depends on:** [`docs/engineering/product-catalog-phase-2-bdr.md`](../engineering/product-catalog-phase-2-bdr.md) (Accepted, `e9e4297e7ba010619fd6ca81973fff07415711cf`); [`POL-pending-selling-price-unit-invariant-amendment.md`](./POL-pending-selling-price-unit-invariant-amendment.md) (Accepted, `d677c82329199e67c40159ec64e564bb79f38fd0`); [`product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md`](./product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md) (Decision 1, Accepted, `cc09b5c9d718121023861973bd40edec6fb41ffa`); [`product-catalog-phase-2-add-stock-correction-scope-and-name-confirmation-decision-amendment.md`](./product-catalog-phase-2-add-stock-correction-scope-and-name-confirmation-decision-amendment.md) (Decisions 2A/2B, Accepted, `7fe6ac9c54d157c4433f6dc6c29cf918fb69080b`); [`../engineering/product-catalog-phase-1-selling-price-unit-reconciliation-amendment.md`](../engineering/product-catalog-phase-1-selling-price-unit-reconciliation-amendment.md); [`POL-0005`](./POL-0005-minimum-product-configuration.md); [`product-unit-of-measure-specification.md`](./product-unit-of-measure-specification.md); [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md); [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md).
**Followed by:** Rule 8 Assessment (not performed by this document), Implementation Plan, Implementation Authorization — each a separate, later gate.

---

## 1. Purpose

Translates the accepted Product Catalog Phase 2 governance chain — the BDR, the selling-price/unit invariant Policy Amendment, and Decisions 1, 2A, and 2B — into functional requirements precise enough to serve as implementation checkpoint acceptance criteria, without deciding anything those documents did not already decide.

## 2. Governing Documents / Authority

Listed in "Depends on," above, plus FR-88 (cost-price boundary, `decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`). Every requirement below is traceable to one of these.

## 3. Scope

In scope: canonical Product Information's field-level correction surface across Catálogo, Add Stock, and Contagem; the selling-price/selling-unit write-time invariant expressed as functional requirements; UnitRelationship reconfiguration behavior (ordinary change, extension, replacement); Product Identity/name correction from Add Stock. Out of scope: §19.

## 4. Product Information Model

**Canonical, generic-field-correction scope this Specification governs:** `name`, `unitRelationship` (`units[]`, `sellingUnit`, `confirmedAt`), `sellingPrice`, `category`, `supplier`, `sku`, `barcode` — exactly the accepted Phase 2 BDR §5 list, no more.

**Excluded from this Specification's scope, governed separately, unaffected:** `active` (a pre-existing product reactivation feature, not named by the accepted Phase 2 BDR §5's Product Information Model and not redecided here); `supplierWordings` (governed by `BDR-0013`/`POL-0007`, written solely via `confirmSupplierWordingRelationship`, keyed to the purchase-side `SupplierRecord` — a separately governed relationship, not this Specification's generic field-correction model).

**Excluded from canonical editing everywhere:** `costPrice` (FR-88, purchase-workflow-owned, no exception, in any door).

**Transaction-specific, never canonical:** purchase quantity, actual purchase unit for a transaction, actual purchase cost, purchase date, `StockBatch` fields, count quantity, count-specific valuation, `StockCountItem` fields, `SupplierRecord` (the purchase-side supplier).

## 5. Three-Door Model

Catálogo, Add Stock, and Contagem are three legitimate doors into **one** canonical Product record — never three Product Memories, never workflow-specific copies. A correction made through any authorized door is immediately the canonical state seen through every other door, since all write the same `Product` document. No door computes or caches an independent version of any canonical field.

## 6. Catálogo Responsibilities

- **MUST** remain the only door that creates a Product with no stock, no batch, no count, and zero Business Worth effect.
- **MUST** allow creating and correcting: `name`, `unitRelationship` (full chain, `sellingUnit`), `sellingPrice`, `category`, `supplier`, `sku`, `barcode`.
- **MUST NOT** allow creating or editing `costPrice`.
- **MUST NOT** persist a non-null `sellingPrice` without a resulting valid `unitRelationship.sellingUnit` (§10).

## 7. Add Stock Responsibilities

- **MUST** allow in-context correction of: `name` (§9), `sellingPrice`, `sellingUnit`, `unitRelationship`.
- **MUST NOT** expose `category`, canonical `supplier`, `sku`, or `barcode` for correction — no evidence ties any of them to Add Stock's identification/configuration purpose; `supplier` is additionally confirmed excluded because Add Stock's own recognition mechanism (`SupplierWordingRelationship`) keys on the transaction-side `SupplierRecord`, never canonical `Product.supplier`.
- **MUST NOT** touch `costPrice`, `active`, or `supplierWordings` — the first per FR-88; the latter two out of this Specification's scope entirely (§4).
- **MUST** keep transaction-specific fields (quantity, actual purchase unit, actual cost, purchase date, batch data) entirely separate from any canonical correction performed in the same session.
- **MUST** keep the purchase `SupplierRecord` UI entirely distinct from canonical `Product.supplier` — since canonical `supplier` is excluded from Add Stock's scope entirely, no code path may write `Product.supplier` from Add Stock's purchase-supplier UI under any circumstance.
- **MUST NOT** persist a non-null `sellingPrice` without a resulting valid `unitRelationship.sellingUnit` (§10).

## 8. Contagem Responsibilities

- **MUST** retain its existing, already-governed capability to establish configuration for a genuinely new product and to reassign `sellingUnit` among an existing relationship's own already-confirmed members.
- **MUST NOT** persist a non-null `sellingPrice` without a resulting valid `unitRelationship.sellingUnit` — for both the new-product and existing-product write branches (§10).
- Field-level correction scope beyond selling configuration is unchanged by this Specification — nothing in the accepted governance chain expands Contagem's scope beyond what it already has.

## 9. Product Identity / Name Correction

- **MUST**: correcting an existing Product's canonical `name` from Add Stock requires a distinct, explicit owner confirmation action — separate from ordinary field entry, separate from batch/transaction confirmation.
- **MUST NOT**: Product Recognition, matching, or transaction recording may never write `Product.name` as a side effect, under any confidence level or matching outcome.
- **Already-governed, unaffected mechanism, restated for clarity, not redefined:** when a scanned/entered name differs from a Product's canonical name, the existing `BDR-0013`/`POL-0007` alias mechanism (`SupplierWordingRelationship`, written solely via `confirmSupplierWordingRelationship`) is what governs that case today — recording an **alternative name**, never renaming the canonical `Product.name`. This Specification's name-correction requirement is a **separate, additional, deliberately owner-initiated capability** — it does not replace, feed from, or get triggered by the alias mechanism, and the alias mechanism is not touched by this Specification.
- The exact confirmation UI (modal, wording, sequence) is explicitly not specified here — Decision 2B and the accepted BDR both defer this to implementation-stage UX design.

## 10. Selling Configuration — Invariant as Testable Requirements

- **MUST**: as a result of confirming any single logical write action (creation or update, in any door), no reader of the canonical Product document may ever observe `Product.sellingPrice` as non-null/non-empty while `unitRelationship.sellingUnit` is absent or not a valid member of `unitRelationship.units[]` — regardless of how many underlying write operations the implementation uses internally to reach that outcome. This governs the required persisted/observable outcome only; it does not prescribe a transaction mechanism, a shared function, or any other implementation architecture.
- **MUST**: this applies to Product creation and every subsequent update, uniformly, in Catálogo, Add Stock, and Contagem — no door-specific exception.
- **MUST**: a Product MAY exist with no `sellingPrice` (with or without a confirmed `unitRelationship`).
- **MUST**: a Product MAY have a confirmed `unitRelationship`/`sellingUnit` with no `sellingPrice` set.
- **MUST**: a Product MAY have a valid **single-unit** `unitRelationship` (`units.length === 1`) with `sellingUnit = units[0].unit` — per `product-unit-of-measure-specification.md` §9, no minimum chain length beyond one is required anywhere in accepted governance.
- **MUST**: changing `sellingPrice` alone, with `sellingUnit`/`unitRelationship` unchanged and still valid, never alters or removes `unitRelationship`.
- **MUST**: changing `sellingUnit` alone, to another already-confirmed member of the existing `unitRelationship`, never alters `units[]` or `confirmedAt`, and never touches `sellingPrice`.

## 11. UnitRelationship — Extension vs. Replacement (Decision 1)

**Ordinary sellingUnit change:** reassigning `sellingUnit` to another member of the *same, unchanged* `units[]` chain. MUST validate the candidate is a chain member; MUST NOT alter `units[]` or `confirmedAt`; MUST NOT touch `sellingPrice` except where §10's invariant requires evaluating it.

**Extension:** a proposed candidate in which **every previously-confirmed unit token and its factor remains byte-identical**, with at least one new unit added (e.g., `1 Cx = 24 Un` + adding `Emb` → `1 Cx = 4 Emb = 24 Un`, where `Cx`'s and `Un`'s own factors are unchanged). MUST preserve every prior unit and factor exactly. MUST treat the existing `sellingUnit`, if still present in the extended chain, as still valid with no special intervention.

**Replacement/reconfiguration:** any other change to `units[]` — including changing an already-confirmed unit's own factor (e.g., `1 Cx = 24 Un` → `1 Cx = 20 Un`), removing a unit, or full restructuring. This is not extension, even where it may appear only incrementally different — a changed factor for an existing unit is a reconfiguration of already-confirmed knowledge, not an addition to it.

For replacement/reconfiguration:
- **MUST** preserve the existing confirmed `unitRelationship` unchanged and fully intact until the owner's replacement is explicitly confirmed — no intermediate, partial, or speculative write of the proposed relationship before confirmation.
- **MUST** validate the proposed relationship before it can be confirmed.
- **MUST**: if the current `sellingUnit` remains a member of the proposed relationship, confirmation proceeds as an ordinary reconfiguration, no additional blocking condition.
- **MUST**: if the current `sellingUnit` is not a member of the proposed relationship, confirmation of the new relationship MUST be refused until the owner also supplies a valid `sellingUnit` from the proposed relationship's own members, in the same confirmation action.
- **MUST NOT** automatically select a replacement `sellingUnit` under any circumstance.
- **MUST NOT** automatically clear `sellingPrice` under any circumstance.
- **MUST NOT** leave the canonical Product, after confirmation completes, in a state where `sellingPrice` is non-null and `sellingUnit` is invalid or absent (§10).
- **MUST**: the currently-existing narrow `sellingUnit`-only reassignment capability described above (Contagem) remains valid and unaffected — it is not "replacement," and none of the replacement-specific blocking requirements apply to it.

## 12. Product Memory Relationship

This Specification governs the canonical selling configuration represented by `sellingPrice` and `unitRelationship`; it does not redefine the broader Product Memory model governed by `BDR-0012`.

- **MUST NOT:** no correction made through any door may create a second, workflow-specific Product Memory store.
- **MUST:** `findLatestRememberedProductMemory` and all related read/prefill functions continue to read historical batch/count data for display/autofill purposes only.
- **MUST NOT:** no historical fallback value may be silently written back to canonical Product state.
- **MUST:** a canonical correction made through any door immediately becomes what Product Memory's existing prioritized-source resolution (which already prioritizes confirmed `Product.sellingPrice`/`unitRelationship` over historical batch/count fallback, per `resolveCanonicalProductSellingMemory`) reflects on its next read — this Specification does not redefine that resolution logic or the broader Product Memory model it operates within (`BDR-0012`).

## 13. Owner Confirmation / Advisory Boundaries

- **MUST NOT**: the system may never silently make a consequential Product Identity or Product Information decision — an automatic rename, an automatic relationship replacement, an automatic `sellingUnit` selection, or an automatic `sellingPrice` clear are all explicitly forbidden, per §9–§11.
- **MUST**: the system may detect, validate, warn, present candidates, explain a conflict, and request confirmation — never decide silently on the owner's behalf, per `BDR-0012` Decisions 10–12 and the accepted Phase 2 BDR's advisory framing.
- **MUST**: Product Recognition remains candidate-only in every path this Specification touches — no requirement in this document grants Recognition new write authority.

## 14. Existing vs. New Product

- **A. Brand-new Product creation** — governed identically to today's existing identity-resolution discipline (`confirmedNewProduct` guards, "unresolved identity never silently creates a Product") in every door; unaffected by this Specification beyond the field-scope/invariant requirements above.
- **B. Adding stock to an existing Product** — a transaction-specific action; MUST NOT, by itself, trigger any canonical field write beyond what §7/§10 explicitly authorizes as in-context correction.
- **C. Correcting canonical Product Information on an existing Product** — governed entirely by §7–§11; MUST be clearly distinguishable, at the point of action, from B.
- **MUST**: Add Stock's new-product path MUST NOT become a duplicate-creation mechanism for an already-existing identity — the existing `confirmedNewProduct`/existing-match guards remain fully in force, unmodified, unweakened by anything in this Specification.

## 15. Transaction-Specific Boundaries

Restated, unconditional, across every door: purchase quantity, the actual unit used for a specific purchase, actual purchase cost, purchase date, stock batch data, count quantity, count-specific valuation, and the purchase `SupplierRecord` are never canonical Product Information and are never convertible into it by any mechanism this Specification authorizes.

## 16. Validation / Invariants

Restated as the single governing rule this entire Specification exists to make testable: **a canonical Product document must never, as an observable outcome of any single logical write action, contain a non-null `sellingPrice` without a valid, chain-member `unitRelationship.sellingUnit`.** Every requirement in §10–§11 is an application of this one rule to a specific scenario (ordinary price change, ordinary unit change, extension, replacement). No scenario is exempt.

## 17. Functional Requirements — Consolidated, Testable

1. Catálogo MUST allow creating/correcting `name`, `unitRelationship`, `sellingUnit`, `sellingPrice`, `category`, `supplier`, `sku`, `barcode` (§6).
2. Catálogo/Add Stock/Contagem MUST NOT allow `costPrice` editing (§6–§8).
3. Add Stock MUST allow in-context correction of `name`, `sellingPrice`, `sellingUnit`, `unitRelationship` only (§7).
4. Add Stock MUST NOT expose `category`/`supplier`/`sku`/`barcode` for correction (§7).
5. Add Stock's purchase `SupplierRecord` MUST NOT write canonical `Product.supplier` (§7).
6. Contagem MUST NOT persist `sellingPrice` without valid `sellingUnit`, in both its new-product and existing-product write branches (§8, §10).
7. Add Stock name correction MUST require a distinct explicit confirmation action (§9).
8. Recognition/matching/transaction recording MUST NOT write `Product.name` (§9).
9. The existing alias mechanism (`SupplierWordingRelationship`) remains the governing mechanism for name-variant matching and is unaffected (§9).
10. `sellingPrice` non-null without valid `sellingUnit` MUST NOT be an observable outcome, in any door, on creation or update (§10).
11. Single-unit `unitRelationship` with `sellingUnit = units[0].unit` MUST be valid (§10).
12. `sellingPrice`-only changes MUST NOT alter `unitRelationship` (§10).
13. `sellingUnit`-only changes (within existing chain) MUST NOT alter `units[]`/`confirmedAt` or `sellingPrice` (§10).
14. No write sequence's observable outcome may be invalid — the invariant must hold as the result of each single logical write (§10, §16).
15. Relationship extension MUST preserve all previously-confirmed units and factors exactly (§11).
16. Relationship replacement MUST preserve the existing relationship until explicit confirmation (§11).
17. Replacement confirmation with an already-valid `sellingUnit` MUST proceed without extra blocking (§11).
18. Replacement confirmation with an invalidated `sellingUnit` MUST be refused until the owner supplies a new valid one, in the same action (§11).
19. No automatic `sellingUnit` selection under any circumstance (§11).
20. No automatic `sellingPrice` clearing under any circumstance (§11).
21. No workflow-specific Product Memory store may be created (§12).
22. Historical fallback MUST NOT silently become canonical state (§12).
23. No silent consequential Product Identity/Information decision, anywhere (§13).
24. Add Stock's new-product path MUST NOT bypass existing identity-resolution guards (§14).

## 18. Acceptance Criteria

Each numbered requirement in §17 is independently verifiable — implementation is acceptable only when every one is demonstrably true, with positive cases (allowed states persist correctly) and negative cases (forbidden states are refused, never partially committed) both covered.

## 19. Out of Scope

Exact enforcement UI/UX for any requirement above; whether all three doors share one write function versus independent door-specific logic; database/Firestore schema changes (none identified as necessary); a shared-component extraction decision; Product Merge; Never-Stocked/Out-of-Stock UI; any of the accepted Phase 2 BDR's three §16 Open Questions; `BDR-0012` §5.A Item 7 (historical-data posture); any resolution of `POL-0006`'s open temporary-override point; `active` and `supplierWordings` (§4).

## Governance Notes

- This Specification does not modify `BDR-0012`, `BDR-0013`, `POL-0005`, `POL-0007`, the accepted Phase 2 BDR, the accepted Policy Amendment, Decision 1, Decisions 2A/2B, or the Phase 1 reconciliation amendment.
- No application code, schema, or `firestore.rules` change is made by this document.
- Acceptance of this Specification does not itself authorize implementation — Rule 8 Assessment and Implementation Authorization remain separate, required gates.

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-09-09).

> This Specification is accepted exactly as currently drafted, incorporating the completed Precision Audit (field-level Add Stock scope; extension-vs-replacement distinction; outcome-focused invariant wording; and the final Product Memory terminology correction confirming this Specification governs the canonical selling configuration represented by `sellingPrice` and `unitRelationship` without redefining the broader Product Memory model governed by `BDR-0012`). No further substantive change is made by this acceptance. This acceptance establishes this document as the governing Phase 2 Specification for the implementation-planning gate. This acceptance does not authorize Rule 8 Assessment, Rule 8 drafting, technical implementation, code changes, schema implementation, UI implementation, database migration, or Implementation Authorization — all remain separate, required gates.

**Product Architect:** SABUSHIMIKE MASCENI

**Decision:** ACCEPTED

**Date:** 2026-09-09
