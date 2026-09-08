Product Architect Decision Proposal

# Owner Product Catalog — Phase 1: Product Identity Registration, Independent of Stock

**GOVERNANCE STATUS: DECISION PROPOSAL — PENDING PRODUCT ARCHITECT ACCEPTANCE.** None of the nine decisions below is accepted. Nothing in this document authorizes implementation, Rule 8, or an Implementation Authorization. This document does not itself amend any specification, schema, code, or `firestore.rules` file.

**IMPLEMENTATION: NOT AUTHORIZED**
**RULE 8: NOT YET PERFORMED**
**IMPLEMENTATION AUTHORIZATION: NOT YET GRANTED**
**COMMIT/PUSH: NOT AUTHORIZED (at the time this proposal was drafted)**

---

## 1. Title

Owner Product Catalog — Phase 1: Product Identity Registration, Independent of Stock

## 2. Status

Drafted from a preceding Product Architect Decision Brief, itself drawn from three prior repository investigations (Catalog architecture; registration fields/never-stocked derivation; Product Merge governance), conducted against `main` at commit `67bc58f34ecc8d92f9c50d162932417d0384fcaf`. Terminology, conclusions, and classifications from that Brief are preserved unmodified here, not reinterpreted.

## 3. Context / Problem

SABUSH BPT has no dedicated place for an Owner to register a product's identity before it is ever physically stocked. Today, a `Product` document is only ever created as a byproduct of an actual stock movement — a purchase (`addStockBatch`) or a Contagem count (`recordStockCount`) — confirmed as the only two write paths, by direct trace, in the prior investigation. An Owner who wants to establish "this is a product we sell" ahead of first buying it has no supported way to do so.

## 4. Existing Architecture and Governance Basis

Cited precisely, per instruction, rather than from memory:

- **`Product` type** (`apps/tenant/src/types.ts:405`) — the canonical identity record. Every field this proposal names (`name`, `sellingPrice`, `costPrice`, `category`, `supplier`, `sku`, `barcode`, `unitRelationship`) already exists on it.
- **`EditProductModal`** (`apps/tenant/src/components/EditProductModal.tsx`) — its own header comment already defines the exact "catalog metadata" boundary this proposal reuses: *"name, category, supplier, SKU, barcode, and a REFERENCE cost/selling price... never creates or touches a StockBatch."*
- **§45 Amendment FR-88** — the existing, signed governance boundary establishing that Cost/Cost Unit are purchase-workflow-owned and read-only from the Product Catalog, cited directly from `EditProductModal`'s own implementation comment.
- **`confirmProductUnitRelationship`** (`apps/tenant/src/context/AppContext.tsx:7943`) — BDR-0012 Decision 14's existing, signed, standalone unit-relationship reconfiguration function. Its own governing comment explicitly names *"a catalog 'confirm unit relationship' screen"* as an anticipated future caller.
- **Product Identity Existing/New Resolution** — Implementation Authorization signed 2026-09-06, implemented at commit `0f479f2` (`feat(products): Product Identity Existing/New Resolution — Checkpoints A/B/C`). Requirement 1 of that authorization: *"Unresolved product identity must never silently create a Product."*
- **`calculateInventoryTotals`** (`apps/tenant/src/utils/calculations.ts:71`) — confirmed to operate exclusively on `batches`/`quebras`; never reads `products`. This is the existing architectural basis for Decision 4's safety claim, not a new safeguard this proposal introduces.
- **`firestore.rules`, `products/{productId}`** (line 484) — confirmed: `allow create` requires only a non-empty `name` and `isMemberOf(businessId)`; no linkage to any batch or count is enforced at the rules layer.
- **`App.tsx:134`** — the existing `!isStaff && activeTab === 'stocks'` gate, the precedent this proposal's permission boundary reuses verbatim in shape.

## 5. Proposed Phase 1 Decisions

**Decision 1 — Dedicated Product Catalog.** Approve a dedicated Owner-only Catalog surface, separate from Dashboard and from Stocks (confirmed, by direct trace, to be structurally a purchase-batch history view, not a product list — it cannot serve this purpose without a rebuild). Not a POS, not a purchase-entry screen, not a stock-count screen, not a Contagem replacement, not a Business Worth surface.

**Decision 2 — Canonical Product Identity.** Approve reuse of the existing `Product` entity. No separate `CatalogProduct` entity is proposed — the prior investigation found no concrete blocker to reuse, and every field needed already exists on `Product`.

**Decision 3 — Phase 1 Registration Fields.** Approve: required `name`, `sellingPrice`; optional `category`, `supplier`, `sku`, `barcode`; **excluded `costPrice`**, explicitly preserving §45 Amendment FR-88's existing boundary rather than weakening it for convenience.

**Decision 4 — Stock and Business Worth Separation.** Approve that Catalog registration is identity-only: no `StockBatch`, no `StockCount`, no physical inventory, no Business Worth contribution merely from existing. Confirmed structurally true today (§4 above) — this decision ratifies relying on that existing separation, not building a new one.

**Decision 5 — Product Recognition.** Approve continued, unmodified reuse of the existing, already-signed Product Identity Existing/New Resolution mechanism for any Catalog-registered product later encountered in +Stock or Contagem. No second identity-resolution system is proposed.

**Decision 6 — UnitRelationship.** Approve that UnitRelationship configuration is **not** part of Phase 1 registration. `confirmProductUnitRelationship` remains available, unmodified, for a future explicit phase/screen — its own governance is neither weakened nor exercised by this proposal.

**Decision 7 — Merge.** Approve that Product Merge is explicitly **out of scope** for Phase 1. This is not a redefinition of duplicate protection as a warning — Decision 5's blocking, owner-authoritative resolution already prevents silent duplicate creation going forward; merge is the separate, distinct capability for duplicates that already exist, and is deferred because the current architecture does not yet define: canonical/losing Product lifecycle, merge model, metadata conflict resolution, or post-merge recognition/alias behavior (confirmed, no existing mechanism covers any of these — see the prior Merge Governance investigation for the full reference map).

**Decision 8 — Never-Stocked vs. Out-of-Stock.** Approve deferring this distinction from Phase 1's visible UI. Confirmed technically derivable without a schema change (existing `where('productId','==',id)` query pattern against `batches`/`quebras`, already-loaded `stockCounts` listener) — but no Phase 1 user-facing requirement establishes a need to display it, so it is not built.

**Decision 9 — Product Memory.** Approve that the existing Product Memory lifecycle (`findLatestRememberedProductMemory`, `Product.sellingPrice`/`unitRelationship` as already-prioritized sources) remains fully authoritative and unmodified. Catalog registration establishes identity and current selling price; all transaction-specific information remains transaction-specific, exactly as today.

## 6. Explicit Scope Boundaries

Phase 1 does **not** authorize: Product Merge implementation; UnitRelationship configuration UI; Never-Stocked/Out-of-Stock UI; Product Memory redesign; a new Product identity model; a new `CatalogProduct` collection/entity; changes to Contagem calculation logic; changes to Business Worth formulas; changes to purchase-cost ownership; automatic duplicate creation; automatic merge; or any automatic identity decision made without explicit Owner authority.

## 7. Deferred Decisions

- Product Merge, in full (Decision 7) — requires its own future governance decision covering merge model, metadata-conflict resolution, and post-merge recognition, none of which existing governance defines.
- UnitRelationship configuration screen (Decision 6) — technically ready via `confirmProductUnitRelationship`, deferred as a scope choice.
- Never-Stocked/Out-of-Stock visible UI (Decision 8) — technically derivable, deferred as a scope choice.

## 8. Safety / Business-Worth Boundary

A Catalog Product may exist with zero stock and zero Business Worth impact — confirmed directly from `calculateInventoryTotals`'s own inputs (`batches`, `quebras` only, never `products`). No new architectural safeguard is required to guarantee this; it is the existing, natural behavior of not calling the batch-writing code path. This proposal relies on that existing behavior; it does not add a new guard.

## 9. Identity / Recognition Boundary

Every Catalog-registered product is subject to the same, already-signed Product Identity Existing/New Resolution mechanism as any product created via +Stock or Contagem — no exception, no bypass, no second mechanism. Unresolved identity must never silently create a Product, on any surface, including this one.

## 10. Permission / Tenant-Isolation Boundary

The Catalog surface is Owner-only, via the existing `!isStaff` client-side gating pattern already used for Dashboard/Stocks/Contagem (`App.tsx:134`) — no new permission tier, no `firestore.rules` change proposed. Tenant isolation is inherited unmodified from `isMemberOf(businessId)`'s existing definition; no cross-business Product lookup is introduced. One existing nuance recorded, not altered: `firestore.rules`' `allow create` on `products` is `isMemberOf` (Staff-inclusive) today, unchanged by this proposal — Owner-only enforcement for the new surface is achieved by Staff never being able to reach the screen, the same pattern already relied on for every other Owner-only tab.

## 11. Consequences / Expected Behavior

If accepted: Owners gain a dedicated place to register a product's name, selling price, and optional metadata ahead of ever stocking it. That product then behaves, in every other part of the system, exactly as any product does today at the moment before its first purchase or count — recognized correctly if encountered again, contributing nothing to valuation until real stock activity exists, and fully governed by every existing rule this proposal does not touch.

## 12. Non-Goals

Not a POS. Not a purchase-entry screen. Not a stock-count screen. Not a Business Worth surface. Not a Contagem redesign. Not a Product Memory redesign. Not a Merge implementation. Not a permissions expansion.

## 13. Acceptance Criteria for This Decision

Acceptance of this proposal means the Product Architect confirms Decisions 1–9 exactly as stated in §5, with the scope boundaries in §6 and deferrals in §7 explicitly acknowledged as not authorized by this acceptance. Acceptance does **not** authorize Rule 8, an Implementation Plan, or an Implementation Authorization — each remains its own, separate, subsequent gate.

## 14. Product Architect Acceptance / Signature

> I have reviewed this Decision Proposal for Owner Product Catalog Phase 1, covering Decisions 1–9 (§5), their explicit scope boundaries (§6), and the deferred decisions (§7). I understand this acceptance authorizes progression to a dedicated Rule 8 Assessment only, and does not itself authorize any code, `firestore.rules`, schema, or test change, and does not constitute Rule 8 approval or an Implementation Authorization.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ ACCEPTED AS PROPOSED &nbsp;&nbsp; ☐ ACCEPTED WITH MODIFICATIONS (specify) &nbsp;&nbsp; ☐ NOT ACCEPTED

**Note on this artifact's own recording:** this proposal document is committed to the repository as the historical record of what was drafted and proposed. Per this repository's own established convention (see `product-recognition-and-cost-selling-unit-architecture-decision-proposal.md` / `-product-architect-acceptance.md` as the precedent), acceptance — if and when it occurs — is recorded in a **separate** acceptance artifact, not by editing this proposal in place.
