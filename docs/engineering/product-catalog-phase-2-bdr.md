# Product Catalog Phase 2 — BDR (Amended)
## Canonical Product Information + Multi-Door Configuration

**Proposed filing location:** `docs/engineering/product-catalog-phase-2-bdr.md`, per Phase 1's own `docs/engineering/product-catalog-phase-1-*.md` precedent. **Flagged, not resolved:** whether this instead warrants a numbered `docs/specs/BDR-NNNN` cross-cutting identifier is left to explicit Product Architect decision.

**Status:** ACCEPTED.

**Type:** Business Decision Record.

**Depends on:** `BDR-0012` (Product Unit-of-Measure & Product Memory) — extended, not modified. Product Catalog Phase 1 Decision Proposal — Decision 6 activated, Decision 9 flagged as requiring amendment (§14). `POL-0005` — specific wording flagged as requiring amendment (§15).

**Followed by:** Policy artifact(s) per §15, then Specification, Rule 8, Implementation Authorization — none authorized by this document.

---

## 1. Problem Statement

Unchanged from the previous draft: canonical Product Information (unit relationship, selling/reference unit, selling price) currently has no dedicated entry point independent of a stock event, and where it *is* writable today (Catálogo's creation form, `EditProductModal`), a selling price can be recorded with no selling-unit context at all. This amendment does not change the problem being solved — it corrects how the solution distributes editing authority across the platform's existing workflows.

## 2. Business Context

Sabush BPT's central promise (per `BDR-0012` §1) is being the one trustworthy answer to "what is my business worth." That promise depends on Product Memory being unambiguous wherever it is read — Add Stock, Contagem, and valuation. A selling price recorded with no unit context is not merely incomplete; it is a latent source of the same class of error `9544a1e` (the Add Stock cost/selling unit conflation fix) already corrected one layer downstream. This BDR addresses the same failure mode at its true origin: the point where the number is first recorded, not only the points where it is later consumed.

## 3. Existing Governed Foundation

Nothing here is new plumbing; this BDR governs how existing, already-approved machinery may be entered from multiple doors:

- **Data model:** `Product.unitRelationship` (`UnitRelationship`: `units[]`, `sellingUnit`, `confirmedAt`), `Product.sellingPrice` — both defined in `types.ts`, governed by `BDR-0012`.
- **Validation/write:** `isValidUnitRelationship`, `confirmUnitRelationship` (`lib/unitRelationship.ts`), `confirmProductUnitRelationship` (`AppContext.tsx`) — the single, already-tested path that may change the structure of a product's confirmed relationship.
- **Price resolution:** `resolveUnitAwarePrice`, `resolveCanonicalProductSellingMemory` (`lib/productMemoryPriceResolution.ts`) — reads `Product.sellingPrice`/`unitRelationship` directly; unaffected by which door wrote them.
- **Minimum configuration policy:** `POL-0005` — unit relationship + (if a selling reference is configured at all) selling unit are minimum; selling price itself is never required; incompleteness is warned, never blocked (`BDR-0012` §5.A Item 6).
- **Existing UI precedent (capture only, not editing):** Contagem's `NewProductInfoPanel`/`UnitRelationshipChainEditor`/`ModeAValuationControl`; Add Stock's `UnitRelationshipRow`.
- **Existing cost boundary:** `§45` Amendment (`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`), FR-88 — Cost/Cost Unit are purchase-workflow-owned and read-only from the Product Catalog.
- **Existing historical-fallback mechanism:** `findLatestRememberedProductMemory` — derives a *non-canonical*, display-only remembered (unit, cost, selling price) triple from historical batches/counts when `Product.sellingPrice` is unset, already used by `EditProductModal` today for display purposes only, never written back to `Product`.

## 4. Product Architect Decisions

1. **Exactly one canonical Product record is authoritative for Product Information for each canonical Product identity.** Product Information may be gathered, and corrected, through multiple operational workflows — Catálogo, Contagem, Add Stock — but no workflow may create a parallel or competing information store: all three operate against, and update, that same single canonical Product record. **Product Memory remains governed by `BDR-0012` and is not replaced, redefined, or duplicated by any workflow-specific information store** — this BDR extends how the canonical Product record may be reached and corrected; it does not alter the distinction `BDR-0012` §3 already establishes between Product identity, Product Memory (configuration), and batch/transaction-specific facts.
2. **Catálogo is the dedicated Product Information management surface and the only door through which a Product may be created without stock.** It is *not* the exclusive place canonical Product Information may subsequently be edited.
3. **Canonicality and editing location are distinct questions, and must not be conflated.** *Canonicality* answers "which information is authoritative" — always the single canonical Product record. *Editing location* answers "where may the Owner change it" — Catálogo, Contagem, or Add Stock, according to each workflow's own authorized Product Information capability. Multiple editing doors do not create multiple Product Memories.
4. **Multi-door editing does not mean uniform, free-form editing of every field everywhere.** Each workflow retains exactly the Product Information editing capability it is already governed to have today (e.g., Contagem's existing selling-unit/selling-price mechanism, Add Stock's existing unit-relationship capture). This BDR authorizes *which doors* may correct canonical Product Information in-context; it does not itself expand, enumerate, or redesign *which specific fields* any workflow may touch — that remains a later Policy/Specification question.
5. **Catálogo may create a Product with no stock and no purchase.** Creating or configuring a Product in Catálogo — and correcting canonical Product Information from any authorized door — has zero direct Business Worth effect and creates no stock, batch, or count (§13).
6. **Product Recognition connects to this same canonical Product Information model**, regardless of which door it fires within, and gains no new authority to silently establish or overwrite canonical configuration.
7. **A selling price may never be canonically recorded without an accompanying selling/reference unit — in any of the three doors** (§9).
8. **Product existence and commercial configuration completeness are distinct** (§10).

## 5. Canonical Product Information Model

**Canonical Product Information** (one record per Product, correctable via any authorized door per §4 Decisions 2–4):
- Name
- Purchase/default unit (`unitRelationship.units[0]`)
- UnitRelationship (the confirmed chain)
- Selling/reference unit (`unitRelationship.sellingUnit`)
- Selling price for that selling/reference unit (`Product.sellingPrice`, only once a selling unit exists — §9)
- Category, supplier, SKU, barcode
- Existing governed Recognition/identity information (`supplierWordings`, per `BDR-0013`)

**Transaction-specific data** (never canonical, never editable as "Product Information" from any door):
- Quantity purchased, the actual unit used for a specific purchase, actual purchase cost, purchase date, stock batch data
- Count quantity, count-specific valuation, portion-level pricing

No field is invented beyond what `types.ts` and the governing documents above already define.

## 6. Three Information-Gathering-and-Correction Doors

**A. Catálogo** — the dedicated management surface. May create a Product with no stock; may establish or correct purchase unit, UnitRelationship, selling unit, selling price, and other canonical fields directly; is the only place to view the catalog as a whole independent of any transaction.

**B. Contagem** — may encounter an existing Product or identify a new one; may establish missing configuration where the existing Contagem workflow already permits it (`NewProductInfoPanel`, `ModeAValuationControl`, unchanged); **may also correct existing canonical Product Information the Owner discovers is wrong** (e.g., a wrong selling unit), in-context, without navigating to Catálogo — within Contagem's own existing governed boundary (§4 Decision 4). Count-specific quantity, count-specific valuation, and historical count records remain distinct from, and are never rewritten by, such a correction.

**C. Add Stock** — same treatment: may establish missing configuration where its existing workflow permits it (`UnitRelationshipRow`, unchanged); **may also correct existing canonical Product Information in-context**, within Add Stock's own existing governed boundary. Transaction-specific facts (purchase quantity, actual purchase unit, actual purchase cost, purchase date, stock batch data) are never treated as canonical configuration regardless of this correction capability.

## 7. Canonicality vs. Editing Location — Catálogo's Role

**These are two different questions, and this BDR keeps them explicitly separate:**

- **Canonicality:** which Product Information is authoritative? Always the single canonical Product record — never a Contagem-specific, Add-Stock-specific, or Catálogo-specific version.
- **Editing location:** where may the Owner change it? Catálogo, Contagem, or Add Stock — according to each workflow's own authorized capability (§6).

Four cases, matching the corrected model exactly:

- **Contagem correction:** Owner is counting stock, notices the selling unit is wrong, corrects it from within Contagem. The correction updates the canonical Product directly. The Owner does not need to leave Contagem, open Catálogo, find the Product, edit it, and return — unless a future UX decision explicitly requires that friction, which this BDR does not impose.
- **Add Stock correction:** Owner is recording a purchase, notices Product Information is incomplete or incorrect, corrects the applicable canonical field directly from Add Stock. The correction updates the canonical Product; the purchase transaction remains its own separate historical record.
- **Catálogo creation:** Owner creates "Arroz X" with no stock. Catálogo allows establishing name, purchase/default unit, UnitRelationship, selling unit, selling price, and other authorized fields. No stock is created; no Business Worth is created.
- **Single-Product information origin:** information first established in Contagem, later corrected in Add Stock — Catálogo, opened at any point, shows the one current canonical state. There is no "Contagem version," "Add Stock version," or "Catálogo version" — one Product, one record, regardless of which door most recently touched it.

## 8. Product Recognition Relationship

Recognition connects to the same canonical Product Information model, proposes rather than decides, never silently overwrites canonical configuration, and Owner confirmation remains required per existing Recognition/identity governance (`BDR-0013` and the existing Product Identity Existing/New Resolution work, neither redesigned here). If Recognition fires while the Owner is in Contagem or Add Stock, the Owner may correct/configure the relevant Product Information within that same workflow (per §6), rather than being forced out to Catálogo to complete it.

## 9. Selling Price + Selling Unit Rule

**A selling price may never exist as canonical Product Memory without an accompanying selling/reference unit** — in Catálogo, in Contagem, or in Add Stock, without exception.

1. Product with no selling price → allowed.
2. Product with unit configuration but no selling price → allowed.
3. Product with selling price **and** explicit selling/reference unit → allowed.
4. Product with canonical selling price but **no** selling/reference unit → **not allowed, regardless of which door the price was entered through.**

**Enforcement mechanics** (hard block vs. same-action requirement vs. other mechanism, and how each of the three doors' own UI presents this) remain explicitly Policy-level, not decided here — the business rule belongs in this BDR; its operational mechanics do not (§15).

Two conflicts are flagged, not silently reconciled: `POL-0005`'s current wording states this only as a conceptual condition ("if and when... configured"), not a write-time enforcement rule — a Policy amendment is required (§15). Phase 1 Decision 9 ("Catalog registration establishes... current selling price," with no unit precondition) is superseded by this section and requires formal amendment (§14).

## 10. Incomplete Product Information

A Product may exist before any or all of unit configuration, selling/reference unit, or selling price are known — regardless of which door is used to view or complete it. Per `BDR-0012` §5.A Item 6 and `POL-0005`, incompleteness is never a creation blocker in any of the three doors; only §9's rule (selling price requires selling unit) is a hard constraint, and only at the moment a selling price is itself being set.

## 11. Historical Protection

Correcting canonical Product Information from **any** of the three doors — Catálogo, Contagem, or Add Stock — affects future interpretation only, per `BDR-0012` Decisions 14–16. Historical stock batches, completed counts, and Business Worth snapshots are never rewritten as a side effect of a correction made anywhere. `BDR-0012` §5.A Item 7 (historical-data posture — REMAINS OPEN) is inherited unchanged; nothing here resolves it.

## 12. Cost Price Boundary

Cost Price remains purchase-workflow-owned everywhere, including under this BDR's multi-door editing principle. None of the three doors' Product Information editing capability extends to canonical cost price. FR-88's boundary is not reversed or narrowed.

## 13. Business Worth Boundary

Correcting canonical Product Information — from Catálogo, Contagem, or Add Stock — has zero *direct* Business Worth effect by itself. A Contagem or Add Stock transaction's own quantity/cost data continues to drive Business Worth exactly as today, unaffected by whether a Product Information correction also occurred in the same session; the correction itself creates no stock, batch, or count.

## 14. Explicit Relationship to Phase 1 Decision 6

Product Catalog Phase 1's Decision Proposal (`docs/engineering/product-catalog-phase-1-decision-proposal.md`) explicitly deferred this exact capability: *"Decision 6 — UnitRelationship. Approve that UnitRelationship configuration is not part of Phase 1 registration... `confirmProductUnitRelationship` remains available, unmodified, for a future explicit phase/screen."* Its §6 Scope Boundaries likewise names "UnitRelationship configuration UI" as not authorized in Phase 1.

**This Phase 2 BDR is that deferred capability, arriving now**, in the same relationship `BDR-0012` §4 already models for its own reconciliation with `BDR-0009`: Phase 1 Decision 6 was correct and valid for the scope it governed at the time; it is not silently ignored or retroactively rewritten. Phase 1 Decision 6's deferral is understood as resolved by this document — and, per the corrected model, extends equivalent in-context correction capability to Contagem and Add Stock as well, which Phase 1 never addressed at all (Phase 1's scope was Catálogo registration only). Phase 1 Decision 9's bare-selling-price wording remains flagged as requiring formal amendment, per §9.

## 15. Required Policy/Specification Follow-Up

Not decided here; named so the sequence is traceable:

- A Policy artifact (new, or an amendment to `POL-0005`) operationalizing §9's write-time rule across all three doors — what a UI/write path must actually do when a selling price is supplied with no selling unit (block the save entirely? require the unit in the same action? something else) — this BDR decides the rule exists, not its exact operational mechanics.
- Formal amendment of Product Catalog Phase 1 Decision 9's wording, per §14.
- A Specification for how each door's UI presents in-context correction — entirely out of scope here.

## 16. Open Questions (Explicit — Not Guessed)

Previous Open Question 1 ("should Contagem/Add Stock retain the ability to change an already-confirmed configuration") is **resolved as Decision 4** (§4) and removed from this list. The following remain open:

1. **How does the non-canonical, display-only historical fallback (`findLatestRememberedProductMemory`) relate to the corrected multi-door model?** Is historical-derived data (shown today only when `Product.sellingPrice` is unset) something any of the three doors may now let the Owner promote into canonical configuration with one action, or does it remain informational-only context alongside a separate, explicit canonical-configuration control, in every door? Not decided here.
2. **Enforcement mechanics of §9's rule** — explicitly deferred to Policy (§15), not decided in this BDR.
3. Whether this document should receive a numbered `docs/specs/BDR-NNNN` identifier under the cross-cutting namespace, per the filing-location note.

## 17. Non-Goals

This BDR does not decide a technical/UI design for any door's correction interface; does not change a database/Firestore schema; does not decide a shared-component extraction; does not redesign Recognition; does not introduce multiple unit-relationship families or multiple independently-remembered selling prices; does not change Cost Price ownership; does not change historical-record protection beyond restating `BDR-0012` Decisions 14–16; does not enumerate, expand, or redesign the exact field-level editing boundary any individual door (Contagem, Add Stock) already has — per §4 Decision 4, each retains exactly its existing governed scope.

## 18. Governing Chain

`BDR-0012` → `POL-0005` → Product Catalog Phase 1 Decision Proposal (Decisions 6 & 9) → **this document** → [Policy amendment, §15] → Specification → Rule 8 → Implementation Authorization → Implementation.

## 19. Governance Notes

- Does not modify `BDR-0012`'s Decisions 1–17 or §5.A resolutions.
- Does not modify `POL-0005` itself — identifies wording requiring future amendment (§9, §15).
- Does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- Makes no technical architecture, schema, or UI decision (§17).
- No `BDR-NNNN`/`POL-NNNN` identifier assigned to this document or any follow-up artifact.
- This document was drafted in two amendment passes before acceptance: the first corrected an over-restrictive reading of Catálogo's role into the multi-door model recorded here; the second reworded Decision 1 to explicitly preserve the Product/Product Memory distinction without changing its substantive meaning. Neither prior draft is itself a governance artifact of record (neither was accepted); no separate supersession record is filed beyond this note.

## 20. Acceptance

> I have reviewed this Amended Draft BDR — Product Catalog Phase 2 — including the corrected multi-door editing principle and the Product/Product Memory distinction (Decisions 1–4), the Canonical Product Information Model (§5), the Three Doors (§6), the Canonicality vs. Editing Location distinction and its four examples (§7), the Recognition relationship (§8), the Selling Price + Selling Unit rule generalized across all doors (§9), Incomplete Product Information (§10), Historical Protection (§11), the Cost Price and Business Worth boundaries (§12–13), the Phase 1 relationship (§14), the remaining Open Questions (§16), and the Non-Goals (§17). I understand acceptance authorizes progression to §15's follow-up only, and authorizes no code, schema, or UI change, and does not constitute Rule 8 approval.

**Signature:** SABUSHIMIKE MASCENI
**Date:** 2026-09-09
