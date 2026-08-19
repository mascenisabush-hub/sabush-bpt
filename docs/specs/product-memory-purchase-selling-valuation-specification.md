Business Domain Specification

# Product Memory, Purchase-to-Selling Conversion & Receipt Recognition Workflow — Consolidated Specification

**Status:** ✅ **Accepted.** See "Product Architect Acceptance" (§27, below).
This document is the governing Specification for the capability it describes. It does not, by itself, authorize implementation — see the companion Rule 8 Assessment (`product-memory-purchase-selling-valuation-rule8-assessment.md`) and Implementation Authorization (`product-memory-purchase-selling-valuation-implementation-authorization.md`, ✅ Signed) for that separate gate.

**Prepared by:** Independent governance/specification session, reconciling existing accepted governance (`BDR-0012`/`POL-0001`–`POL-0006`/UOM Specification; `BDR-0013`/`POL-0007`/Supplier-Wording Specification) with newly clarified Product Architect requirements, through an iterative review-and-correction process recorded in this repository's governance history for this capability.

**Repository baseline (verified by direct inspection at drafting time):**
`https://github.com/mascenisabush-hub/sabush-bpt`, branch `main`, HEAD commit `e6d16e3568f0ec140620b250fb192af8347b9a2d` at the time this Specification was drafted and accepted.

**This document does not:** modify, supersede, or reinterpret `BDR-0012`, `POL-0001`–`POL-0007`, `BDR-0013`, the accepted UOM Specification, the accepted Supplier-Wording Specification, `03-products.md`, `04-smart-stock-entry-amendment.md`, `BDR-0009`, `10-stock-counts.md`, `10-initial-stock-valuation-history-amendment.md`, or any other existing artifact. It is additive to, and consistent with, all of the above.

---

## 1. Status / Purpose

This document reconciles two already-accepted, cross-cutting Business Domain Specifications — the **Product Unit-of-Measure & Product Memory** lineage (`BDR-0012` → `POL-0001`–`POL-0006` → reconciliation amendment → accepted Specification, 2026-08-18) and the **Supplier-Wording Recognition / Product Identity** lineage (`BDR-0013` → `POL-0007` → accepted Specification, 2026-08-19, now substantially **implemented** in code) — against a further set of business requirements clarified directly by the Product Architect (reproduced in the source instructions for this session). It exists because those newly clarified requirements are **not fully satisfied by what is already accepted**: some are already-decided business rules that simply need to be stated more forcefully and unambiguously than the prior draft stated them; others are genuinely new business decisions that no existing artifact has made; and at least one directly conflicts with an existing, deliberately-designed rule and cannot be authorized here.

This document's purpose is to give the Product Architect **one clean, final artifact** to accept, reject, or amend — after which, if accepted, the ordinary sequence (further §5.A-style resolution where flagged → Policy work where needed → Rule 8 → Implementation Authorization → Implementation) would proceed exactly as it already has for the two lineages above.

Every requirement below is labeled:

- **[ESTABLISHED]** — already an accepted, binding business decision in this repository; this document only restates or sharpens it.
- **[IMPLEMENTED]** — established **and** already built and shipped in code, verified by direct inspection.
- **[ESTABLISHED]** — already an accepted, binding business decision in this repository; this document only restates or sharpens it.
- **[IMPLEMENTED]** — established **and** already built and shipped in code, verified by direct inspection.
- **[ACCEPTED]** — a business decision this document establishes; originally proposed for Product Architect review and now formally accepted as part of this Specification's acceptance (§27).
- **[SEPARATE GOVERNANCE REQUIRED]** — a requirement that conflicts with an existing, deliberately-made governance decision; this document does not, and cannot, silently authorize it.

---

## 2. Repository Baseline

**Governance chain — Product Memory / Unit-of-Measure:**

`BDR-0012` (Approved) → `POL-0001` Fractional Quantity Handling, `POL-0002` Rounding Behavior, `POL-0003` Similarity-Confirmation Threshold, `POL-0004` Purchase Cost Interpretation, `POL-0005` Minimum Product Configuration, `POL-0006` Temporary Product Memory Override (all Approved) → `product-unit-of-measure-reconciliation-amendment.md` (Accepted 2026-08-18) → `product-unit-of-measure-specification.md` (Accepted 2026-08-18).

**Verified current implementation state:** `Product` (`apps/tenant/src/types.ts`) has **no `unitRelationship` field today**. No Rule 8 Assessment or Implementation Authorization exists for this lineage. **This capability is accepted at the Specification level only — it is not yet built.**

**Governance chain — Product Identity / Supplier Wording:**

`BDR-0013` (Approved, all nine §5 items ACCEPT) → `POL-0007` (Approved) → `product-identity-alternative-name-specification.md` (Accepted 2026-08-19) → `product-identity-alternative-name-rule8-assessment.md` → `product-identity-alternative-name-implementation-authorization.md` (✅ Authorized, signed) → **implementation, verified in code**: `Product` now carries a supplier-wording relationship model (commit `3df6276`), candidate-detection/reuse functions exist standalone (`bf11ec6`), Add Stock integration is wired (`2d8dd91`), Smart Stock Entry integration is wired (`2dbdcbd`), the conflict/distinguishing-information gate is implemented (`c3331e9`), and the Rule 8 Assessment's full test boundary (including live-emulator concurrency and draft-abandonment) is closed as of HEAD.

**Key clarified point already resolved by the existing Rule 8 Assessment (Finding 10, corrected):** Initial Stock is an **identity-origin surface only** — it establishes `Product.name` and never captures supplier wording. Supplier-wording recognition operates exclusively within **Add Stock** and **Smart Stock Entry**, the two surfaces where a supplier's own wording is actually encountered. This document adopts that same distinction (§6, below) rather than re-litigating it.

**Verified current calculation-engine behavior** (`apps/tenant/src/utils/calculations.ts`, `apps/tenant/src/utils/stockCount.ts`), directly relevant to §13–15 below:

- `StockBatch.costPrice` and `StockBatch.sellingPrice` are both already **"per unit"** fields, where "unit" is whatever string is recorded in that batch's own `unit` field (`types.ts` lines 194–195; confirmed convention, `POL-0004`).
- `calculateBatch`: `investmentValue = remainingQuantity * batch.costPrice`; `marketValue = remainingQuantity * batch.sellingPrice`; `embeddedProfit = marketValue - investmentValue`.
- `remainingQuantity = batch.quantity - totalQuebraQuantity`, where `totalQuebraQuantity` is the sum of `Quebra.quantityLost` for that batch — **denominated in the batch's own purchase unit**, the same unit `batch.quantity` and `batch.costPrice`/`batch.sellingPrice` are already expressed in.
- `stockCount.ts`'s `normalizeStockCountItems`: Initial Stock's `totalValue` is computed as `quantity * costPrice` only — **explicitly and deliberately cost-basis**, with `sellingPrice` stored on each row but never entering `totalValue`, documented in-code as "matching Expected Current Stock Value's existing cost-based rule." `initialCapitalValue` (`initialStockCount.totalValue`) is then **frozen at confirmation** and never rewritten (`10-initial-stock-valuation-history-amendment.md` Part 2; enforced at the Security Rules layer).

These facts matter for two different reasons below, and this document is careful not to conflate them: `remainingQuantity` already being quebra-aware and purchase-unit-denominated is directly relevant to §15's quebra-compatibility requirement. `StockBatch.sellingPrice` already existing as a per-purchase-unit field is cited only as **existing evidence of today's data shape** — this document does **not** propose reusing that field to store any newly-derived, cross-unit-converted valuation (see §14's explicit correction on this point). Initial Capital already being deliberately cost-basis-only is the load-bearing evidence for §19 below.

---

## 3. Product Identity Model — [ESTABLISHED]

Unchanged by this document. Product identity (`03-products.md`), `Product.name` as the stable primary/reference identity, and the correction-vs-alias distinction (`BDR-0013` §2) remain exactly as already accepted. This document does not redefine what a `Product` is.

---

## 4. Product Memory — [ESTABLISHED], restated for emphasis

Per `BDR-0012` Decisions 2–3, 13–14 and the accepted UOM Specification, **Product Memory** is persistent, owner-confirmed configuration for a product consisting of exactly:

1. A confirmed **unit relationship** — a single, strictly-ordered chain (e.g. `1 Cx = 4 Emb = 24 Un`). Exactly one relationship family per product (`BDR-0012` §5.A Item 3).
2. Exactly **one** confirmed **selling/valuation unit** — one of the chain's own units. Not multiple, not per-supplier, not per-count. (`BDR-0012` Decision 2, `POL-0005`.)
3. A remembered **selling price**, expressed against that one selling unit.
4. Where applicable, remembered **supplier-wording relationships** (a separate, adjacent memory — `BDR-0013`/`POL-0007` — associated with the product but not part of the unit-relationship/selling-price configuration itself; see §6).

**This document adds no new field or concept to Product Memory.** It sharpens how Product Memory is *used* (§13–15) and how it interacts with count-specific valuation (§16–17), but the definition above is unchanged.

**Worked example (canonical, used throughout this document):**

```
Product: Savanna
Unit relationship: 1 Cx = 4 Emb = 24 Un
Selling unit: Un
Selling price: 60 MZN/Un
```

---

## 5. Purchase Facts — [ESTABLISHED], strengthened

Per `BDR-0012` §3 and Decision 2, and `POL-0004`, a purchase/receipt line carries exactly four purchase facts, and no more:

- **Purchase quantity** — e.g. `3`.
- **Purchase unit** — e.g. `Cx`.
- **Purchase cost** — e.g. `1,250`.
- **Purchase cost unit** — the unit the stated cost is per (`POL-0004`: interpreted as the cost per the unit the purchase was actually recorded in — not a total, unless the owner explicitly indicates otherwise at entry time, a case `POL-0004` leaves open for the Specification/entry-time UI).

**These four facts are supplied by the receipt (or the owner's direct entry) and by nothing else.** They are **never derived from, converted by, rewritten by, or reinterpreted using Product Memory** — not at extraction time, not at confirmation time, and not later. `3 Cx @ 1,250 MZN/Cx` remains exactly `3 Cx @ 1,250 MZN/Cx` on the record, permanently, regardless of what Product Memory says about that product's selling unit or relationship.

**The purchase unit is never automatically changed to the selling unit, or to any other unit, merely because Product Memory uses a different one.** `Cx` does not become `Un`. `Cx` does not become `Emb`. The confirmed unit relationship (§4) exists so the system can **internally interpret** what `3 Cx` means for valuation purposes (§13) — it is never used to rewrite what the receipt actually says the purchase *was*. This applies with no exceptions, regardless of how confident a UOM Recognition proposal is, how established the product's Product Memory is, or how the receipt was captured (manual entry, Add Stock, or Smart Stock Entry/OCR).

**Purchase-unit editability, exactly as the Product Architect frames it:** the purchase unit is not architecturally hard-coded as read-only, but it is intended to behave as *effectively fixed by the receipt entry* — editable only to correct an extraction or input mistake (e.g., OCR misread `Cx` as `Ex`), never as a mechanism for the system, or an owner in the ordinary course of business, to reinterpret what a receipt actually said. **[ESTABLISHED, restated]** This is consistent with, not an addition to, `BDR-0012` §5.A Item 4 (purchase-unit default and flexibility governs *which* unit a purchase may be recorded in, from the product's own confirmed chain, at the moment of entry — it does not authorize converting an already-recorded purchase's unit after the fact) and `POL-0006` (a transaction-level override of a *value* is expected; overriding the confirmed *relationship factor* for one transaction remains the one genuinely open point `POL-0006` itself flags, unresolved here).

**This section is deliberately unaffected by §13's system-derived valuation, below.** §13 describes a separate, internally-computed figure that sits *alongside* these four purchase facts for the owner's review — it never writes back into, replaces, or is confused with any of the four facts listed above.

---

## 6. Supplier Wording Recognition & Persistent Identity Memory — [IMPLEMENTED]

Per `BDR-0013`, `POL-0007`, the accepted Specification, and the corrected Rule 8 Assessment, already built in code:

- **Trigger surfaces: Add Stock and Smart Stock Entry only.** Initial Stock establishes `Product.name` (the primary/reference identity) but captures no supplier wording and runs no candidate-detection UI (Rule 8 Finding 10, corrected). This document adopts this clarification as the operative business meaning for §8–9 below, exactly as the signed Implementation Authorization already does.
- When a supplier wording is entered that has no already-confirmed relationship for that supplier, BPT may propose a candidate existing product (normalization-level similarity to `Product.name` or to any already-confirmed alternative wording for that product) or the owner may declare the relationship themselves, without waiting for a proposal, while still inside the same stock-entry workflow.
- Exactly two resolutions: **"same product"** (confirms and remembers the supplier-wording → product relationship for automatic future reuse) or **"different product"** (the incoming item becomes a genuinely new product; there is no "reject alias" state).
- A relationship, once confirmed, is **automatically reused** on the next occurrence of that same wording from that same supplier — the owner is never asked again.
- **Conflict handling:** if a wording is already an established relationship for Product A but the owner determines the current occurrence is a different product, BPT must flag the conflict; if the owner proceeds to create a new product, **distinguishing information is mandatory** before that new product's creation completes (`POL-0007`, explicit Product Architect Decision A).
- **This memory is product-identity/supplier-wording memory. It is not, and does not participate in, unit-of-measure recognition or Product Memory's unit-relationship/selling-unit/selling-price configuration (§4).** Identifying a product does not confirm its unit relationship; confirming a unit relationship does not identify a product (`BDR-0013` §4).

---

## 7. UOM Recognition — [ESTABLISHED], not yet implemented

Per `BDR-0012` Decision 17 and the accepted UOM Specification §3:

- On a genuinely first-time product entry, BPT **may propose** a likely unit-of-measure structure ("Recognition") — a proposal only, held in transient state, never written to `Product` until the owner explicitly confirms it.
- If a product already has confirmed Product Memory, Recognition is **never** re-invoked — the existing configuration is retrieved and reused.
- Recognition is **UOM structure only** — it never proposes or confirms product identity, and it is a fully distinct mechanism from §6's supplier-wording recognition, even when both may fire during the same receipt workflow (`BDR-0012` §4 note; `BDR-0013` §4).
- **Not yet built:** `Product.unitRelationship` does not exist in code today (§2, above). Recognition itself, and every downstream behavior in §13–17 that depends on `Product.unitRelationship` existing, remains Specification-accepted, pre-Rule-8, pre-implementation.

---

## 8. New/Unrecognized Receipt Workflow — [ACCEPTED — sequencing established by this Specification], building on [ESTABLISHED] components

**What is already established, individually:** a receipt containing both recognized and new products is processed as one workflow, with recognized products auto-populated from Product Memory and new products surfaced together (`BDR-0012` Decision 8); a candidate supplier-wording match must be suggested, never silently decided (`BDR-0013` Decision 4, `POL-0007`); the whole batch commits atomically, with no partial commit (`BDR-0012` Decision 9, restated by `BDR-0013` item 7's editable-before/immutable-after rule).

**What is not yet established as a single, mandatory sequence, and is proposed here for the first time, per the Product Architect's explicit instruction that this is the intended business workflow, not an optional UX direction:**

> **Unresolved products must be surfaced and resolved before the owner is presented with the full receipt for final review.** They are processed **one at a time**, not simultaneously with the rest of the receipt. Only once every unresolved line has been explicitly resolved (§9 or §10, below) does the complete receipt — recognized and newly-resolved products together — appear for one final, whole-receipt review and one atomic confirmation (§11).

This sequencing constraint is new relative to what any existing accepted artifact locks down. The accepted Supplier-Wording Specification's §3 step 5 explicitly leaves "exact UI copy, layout, and interaction flow" to Rule 8/implementation; the accepted UOM Specification is silent on cross-product ordering entirely. Nothing in either document *contradicts* the sequence above — but nothing *requires* it, either, and a Rule 8/implementation team acting on the existing documents alone could reasonably build a single combined review screen with inline resolution prompts scattered across it, which is precisely the outcome the Product Architect's instructions rule out. This document therefore proposes the sequencing above as an explicit, binding business requirement, not merely a UI suggestion, subject to Product Architect acceptance.

**Step 1 — Extraction.** Every product line's receipt facts (wording, quantity, purchase unit, cost) are captured exactly as extracted, before any recognition/resolution step alters anything about how they are presented. [ESTABLISHED — `04-smart-stock-entry-amendment.md`'s existing non-conversion boundary.]

**Step 2 — Identify unresolved lines.** A line is "unresolved" if its wording has no already-confirmed supplier-wording relationship (§6) and no candidate was accepted. [ESTABLISHED mechanism, §6; NEW that this classification gates the review sequence, this section.]

**Step 3 — Resolve one at a time.** For each unresolved line, in turn, the owner sees exactly that one line's resolution choice (§9 or §10) — not the rest of the receipt. [NEW sequencing.]

Once every unresolved line is resolved, proceed to §11 (whole-receipt review).

---

## 9. Existing-Product Matching Workflow — [IMPLEMENTED] (mechanism) + [NEW] (mandatory sequencing per §8)

For each unresolved line, the owner is offered:

**"This is an existing product with a different name."** BPT shows similar catalog products (candidate grounds per `POL-0007`); the owner may pick a suggested match, search the catalog directly, or confirm a match found another way. On confirmation:

- The receipt line attaches to the existing product. **No duplicate product is created.**
- **The receipt's quantity, unit, and cost are never altered** by this attachment (§5).
- The specific relationship — this supplier's wording → this catalog product — **is remembered** (§6) for automatic recognition on the next occurrence, while remaining owner-correctable later (`BDR-0013` item 3's standalone-correction path).

**Example (from the Product Architect's own worked scenario):** receipt wording `"Savanna 330"`, owner confirms it is the existing catalog product `"Savanna Premium"`. The relationship is remembered; the next receipt showing `"Savanna 330"` is recognized automatically, without asking again. **[IMPLEMENTED]** — this exact mechanism is what Checkpoints 2–4 (commits `bf11ec6`, `2d8dd91`, `2dbdcbd`) already build.

---

## 10. New-Product Workflow — [ESTABLISHED] (information-reuse rule) + [IMPLEMENTED] (mechanism, per §6 New-Product Path)

**"This is a genuinely new product."** The receipt already supplies purchase quantity, purchase unit, and purchase cost — **the owner is never asked to re-enter these** (`BDR-0012` §3, restated explicitly here per the Product Architect's instruction not to leave this implicit). The owner provides only what the platform genuinely cannot already know:

- Product information (name/identity, confirmed as the primary/reference name — `BDR-0013` item 2).
- Unit relationship — UOM Recognition (§7) may propose one; the owner confirms or edits.
- Exactly one selling unit.
- Selling price.

Once resolved, the product is removed from the unresolved queue (§8 Step 3) and the workflow advances to the next unresolved line, per §8's mandated sequence.

**Example (Product Architect's own scenario):** receipt says `"Savana 330"`; it is actually new. Owner chooses "New product"; quantity/unit/cost are untouched; owner fills in only the missing configuration; the product becomes recognized and disappears from the unresolved queue. **[ESTABLISHED at the information-reuse level; §8's queue-disappearance sequencing is the NEW element this document adds.]**

---

## 11. Whole-Receipt Confirmation — [ESTABLISHED]

Only after every unresolved line is resolved (§8–10) does the complete receipt appear: resolved product identity, purchase quantity/unit/cost, remembered selling unit and price, the derived selling value and embedded profit (§13–14, once accepted), and any relevant warnings (§15's incomplete-configuration warning, `BDR-0012` §5.A Item 6). The owner confirms the **whole receipt** in one action; the entire batch commits atomically; **no partial/per-line commit is possible** (`BDR-0012` Decisions 8–9; `BDR-0013` item 7's editable-before/immutable-after rule). This document adds nothing to this rule beyond making explicit that the derived valuation figures in §13–14 belong on this same final-review screen, alongside the purchase facts, once §13–14 is itself accepted.

---

## 12. Purchase Unit vs. Selling Unit — [ESTABLISHED]

These remain, and must remain, distinct concepts throughout every surface (`BDR-0012` Decision 2; §5.A Item 5 already establishes selling unit and count unit need not coincide either). A product may legitimately be purchased in `Cx` while its Product Memory selling unit is `Un` — this is not a data-quality problem to reconcile; it is the ordinary case this entire capability exists to handle without owner arithmetic.

---

## 13. Automatic Purchase-to-Selling Conversion — [ACCEPTED]

**No existing accepted artifact establishes this.** `BDR-0012`, `POL-0001`–`POL-0006`, and the accepted UOM Specification are silent on computing a purchase batch's implied selling value/profit through the confirmed unit relationship. This document proposes filling that gap — **as a strictly separate, system-derived figure, not as a rewrite of any Product Memory or purchase fact.**

**Three concepts, kept strictly separate — this is the central correction this revision makes, and it governs everything below:**

**A. Purchase facts** (§5) — exactly what the receipt says, untouched: `3 Cx @ 1,250 MZN/Cx`.

**B. Product Memory** (§4) — permanent, owner-confirmed product configuration, untouched by any individual transaction: `1 Cx = 24 Un`; selling unit = `Un`; remembered selling price = `60 MZN/Un`. **The remembered selling price is, and remains, expressed in the remembered selling unit — `60 MZN/Un`, never anything else.** Recording a purchase in `Cx` does not change what Product Memory remembers, does not re-express `60 MZN/Un` as `1,440 MZN/Cx` and store *that* as the remembered price, and does not touch `Product.unitRelationship`, `Product`'s selling unit, or `Product`'s selling price in any way. Product Memory answers exactly one question — "what does this business normally sell this product for, per what unit?" — and a specific transaction's arithmetic never overwrites that answer.

**C. System-derived transaction valuation** — a new, third concept, computed internally, shown to the owner, and never entered or edited by hand: for **this specific purchase**, given its own recorded quantity and unit (A) and the product's confirmed relationship and remembered selling price (B), the system derives what that purchase implies in selling terms and in profit terms.

**Worked example, exactly as specified by the Product Architect:**

```
Purchase facts (A):        3 Cx @ 1,250 MZN/Cx           — unchanged, as recorded
Product Memory (B):        1 Cx = 24 Un; selling unit = Un; selling price = 60 MZN/Un
                            — unchanged, as remembered

System-derived valuation (C), computed for this transaction only:
    3 Cx × 24 Un/Cx × 60 MZN/Un  = 4,320 MZN implied selling value
    3 Cx × 1,250 MZN/Cx          = 3,750 MZN cost
    4,320 − 3,750                = 570 MZN embedded profit
```

The conversion must correctly compose across any number of hops and in either direction of the confirmed chain — `Cx → Emb`, `Cx → Un`, `Emb → Un`, and the reverse directions `Un → Emb`, `Un → Cx` — for any valid relationship. The owner never performs this arithmetic by hand, and never manually re-expresses Product Memory's remembered price in the purchase's own unit.

**Exactly one selling basis per purchase/receipt line — no mixed bases at purchase entry.** A given product's purchase/receipt line is valued, for concept (C) purposes, using exactly **one** selling basis: the product's confirmed Product Memory selling unit and remembered selling price (B), applied to that line's own full purchase quantity. **Different selling-price bases for different portions of the same product are not permitted during purchase/receipt entry** — a single receipt line for a product does not split into sub-quantities each valued differently. This is a purchase/receipt-entry-specific rule and is distinct from §16's count-specific mixed-portion valuation capability, which applies only to Initial Stock and Periodic Contagem and never to purchase/receipt entry (see §16's explicit scope boundary).

**Relationship to the existing calculation engine:** the existing Embedded Profit Engine (spec #6, dependent on spec #2's `calculateBatch`) already computes a per-batch `marketValue`/`embeddedProfit` from `batch.sellingPrice`. **This document does not propose that the system-derived figure (C) be written into `StockBatch.sellingPrice`, or into any other existing field, as though it were an ordinary, owner-set per-unit selling price.** Doing so would collapse concept (C) back into concept (A)/(B) and is exactly the error this revision corrects. Whether the existing `calculateBatch`/Embedded Profit Engine is extended to also surface the system-derived figure (C), whether (C) is computed and stored as an entirely separate value alongside the batch, or some other technical arrangement is used, is **explicitly left to Rule 8** (§14, below) — this document fixes only the business requirement that (C) must be computed and shown, and that it must never be confused with, or substitute for, (A) or (B).

**Scope note — what this section does not decide:** the exact moment the derivation runs (client-side at entry, or server-side at commit); how the derived figure (C) is visually presented alongside the purchase facts (A) and Product Memory (B) on the review screen, so the owner can see all three without them being conflated; and display precision for the derived figures (`POL-0002` already governs final monetary rounding once this rule is accepted). These are Rule 8/implementation concerns once this section is accepted.

---

## 14. Frozen Historical Derived Selling Valuation — [ACCEPTED] — business requirement; storage resolved by companion Rule 8 Assessment

**The business requirement, stated precisely and completely, and nothing more than this:**

> Once a transaction's system-derived selling valuation (§13, concept C) has been established from the Product Memory applicable at the time of that transaction, later changes to Product Memory must not silently recalculate that historical transaction's derived valuation.

If the owner later changes the confirmed relationship (`1 Cx = 24 Un` → `1 Cx = 20 Un`) or the remembered selling price (`60 → 65 MZN/Un`), an **already-recorded transaction's already-derived selling value and embedded profit must not change as a side effect.** A later change to Product Memory affects only **future** transactions' own derivation at the moment *they* are recorded — the same prospective-only principle `BDR-0012` §5.A Item 1 and Decisions 15–16 already establish for the unit relationship itself and for a batch's own recorded purchase-side facts, extended here explicitly to cover the derived selling-side figure too.

**Worked example (Product Architect's Example 6):**

```
Today, Product Memory changes: 1 Cx = 20 Un; selling price = 65 MZN/Un

An already-recorded transaction's system-derived selling value and
embedded profit — established under the OLD 1 Cx = 24 Un @ 60 MZN/Un
relationship — do not change. The new relationship and price apply
only to transactions recorded from this point forward.
```

**This document explicitly does not decide, and does not prematurely commit to, any technical storage mechanism for this requirement.** In particular, and correcting the prior draft:

- **This document does NOT decide that `StockBatch.sellingPrice` is the correct field, or any field, to hold the frozen derived value.** That would risk exactly the confusion §13 now explicitly rules out — a converted, cross-unit figure (e.g. `1,440 MZN/Cx`) being stored in a field that today means an owner-set, per-purchase-unit selling price, indistinguishable from an ordinary manually-entered value.
- Whether the frozen valuation is stored as a snapshot on the `StockBatch` itself, as a separate derived-valuation record referencing the batch and the Product Memory state at that moment, computed once and cached, or by some other mechanism, is **a Rule 8/technical-architecture question**, to be resolved only once this business requirement is accepted, and only by an already-accepted artifact or a subsequent Rule 8 Assessment — never inferred or assumed here.
- What **is** fixed, at the business level, by this section: whatever mechanism Rule 8 selects, it must satisfy the requirement stated above in full — the historical derived figure must not silently move when Product Memory changes.

---

## 15. Quebra Compatibility — [ACCEPTED] — business requirement; storage resolved by companion Rule 8 Assessment

**The risk this section exists to rule out:** if the technical mechanism Rule 8 eventually selects for §14 froze a *static equivalent selling quantity* (e.g., "72 Un" for "3 Cx") at the moment of the transaction, that figure would become wrong the moment a quebra reduces the batch's remaining purchase-unit quantity (`3 Cx → 2 Cx`) — the frozen "72 Un" would no longer correspond to what physically remains.

**The business requirement, stated precisely:**

> Whatever is frozen for §14's purposes must remain sufficient to correctly calculate the *current remaining* selling value against the *live*, purchase-unit-denominated remaining quantity — including after a quebra reduces that remaining quantity. A quebra is denominated in the purchase unit (already true today: `Quebra.quantityLost` reduces `StockBatch.quantity`, both in the batch's own purchase unit). Freezing an absolute converted selling-unit quantity, rather than a rate/relationship, would violate this requirement the moment a quebra occurs, and is therefore explicitly ruled out.

**What this means in practice, without prescribing the storage mechanism:** what must survive from the moment of the original transaction is something rate-like — the derived selling value *per unit of the batch's own purchase unit*, or an equivalent relationship from which that rate can be reconstructed — not a fixed total selling-unit quantity computed once and then left stale as quebras reduce what physically remains. **This document deliberately stops short of specifying whether that rate is stored explicitly, recomputed on demand from a frozen relationship-and-price snapshot, or represented some other way — that remains Rule 8's decision (§14), constrained only by this section's requirement that the result stay correct against a live, quebra-reduced remaining quantity.**

This is the direct, business-level answer to the Product Architect's instruction to "investigate exactly what needs to be frozen and why": **a rate/relationship must be frozen; the physical remaining quantity must remain live and quebra-aware; an absolute converted quantity must never be frozen.** The exact field, record, or calculation path that achieves this is not decided here.

---

## 16. Initial Stock Valuation — [ESTABLISHED] (business rule) + not yet implemented (mixed-unit portions)

**Scope boundary, stated explicitly:** the mixed-unit/mixed-price-basis valuation flexibility described in this section and §17 applies **only** to stock-count valuation — Initial Stock/Initial Capital and Periodic Contagem. **It does not apply to, and must never be read as extending to, purchase/receipt entry**, which is governed exclusively by §13's single-selling-basis rule. This section's flexibility does not modify Product Memory, does not create multiple permanent selling units, and does not change the single selling unit and selling price a purchase/receipt transaction uses under §13.

Initial Stock may be the first time a product exists in the system at all. If the owner establishes `1 Cx = 4 Emb = 24 Un` and a selling unit of `Un` during this workflow, those become the product's Product Memory (`BDR-0012` §17, restated). **But the valuation entered during Initial Stock itself is a separate, count-specific act and is never Product Memory** — restated explicitly here per the Product Architect's instruction not to leave this implicit.

**Mixed-unit, mixed-valuation portions within one product, one count — [ESTABLISHED at the business-decision level, `BDR-0012` Decisions 6–7; not yet built].** A physical count may contain the same product entered across multiple units, and — per this document's proposed extension, consistent with those Decisions' own spirit — **valued differently per portion**, without the owner first converting everything to one unit or one price basis.

**Worked example (Product Architect's own scenario, Pretinha):**

```
10 Cx physically present.
 6 Cx valued at 820 MZN/Cx
 4 Cx valued at  50 MZN/Un   (portion valued at the Un level instead)

The system uses the confirmed unit relationship to interpret the
physical quantities and computes the total automatically. Product
Memory still has exactly ONE selling unit — this per-portion valuation
choice is count-specific, not a Product Memory reconfiguration.
```

**What is new here relative to `BDR-0012` Decisions 6–7 as originally accepted:** those Decisions establish that a count may combine multiple *units* for one product into one coherent stock position. They do not, on their own text, explicitly address **differing price bases per portion** (`820 MZN/Cx` for one physical sub-quantity, `50 MZN/Un` for another sub-quantity of the *same* product, within the *same* count). This is a natural extension of the same underlying capability, made explicit and **accepted by this Specification**, to the extent it goes beyond unit-mixing into price-basis-mixing. **This extension is scoped, without exception, to Initial Stock and Periodic Contagem valuation — it does not apply to, and must never be read as applying to, purchase receipt/Add Stock/Smart Stock Entry, which remain governed exclusively by §13's single Product Memory selling-unit/selling-price rule.** The accepted UOM Specification's own §4 "Periodic Contagem" section already anticipates converting mixed-unit entries to a single top-level reference unit for valuation purposes — this Specification's accepted extension is that the *valuation price* for each portion, not only its unit, may be independently owner-specified, for stock-count valuation only.

**Distinct concepts, kept separate (per the Product Architect's explicit instruction):** purchase unit; permanent selling unit (Product Memory, singular); valuation unit/price basis (count-specific, may vary by portion); unit relationship (the confirmed conversion chain used to reconcile physical quantities across portions). None of these collapse into another.

---

## 17. Periodic Contagem Valuation — [ESTABLISHED]

The same count-specific, multi-portion valuation capability described in §16 applies identically to Periodic Contagem (`BDR-0012` Decisions 6–7, restated for this surface by the accepted UOM Specification §4). The owner is not selling during Periodic Contagem any more than during Initial Stock — these remain stock observation/valuation activities, and Product Memory's single selling unit is unaffected by any per-portion valuation choice made during a count. **This capability remains, per §16's scope boundary, exclusive to stock-count valuation and does not extend to purchase/receipt entry, which remains governed exclusively by §13's single-selling-basis rule.**

---

## 18. Cost vs. Selling Valuation (General) — [ESTABLISHED, cost-basis today]

Every count-level `totalValue` figure in the system today — Initial Stock's `initialCapitalValue`, and Expected Current Stock Value's own aggregate comparison (`BDR-0009` §5) — is **deliberately cost-basis only**, confirmed directly in `stockCount.ts`'s own in-code documentation ("matching Expected Current Stock Value's existing cost-based rule"). `sellingPrice` is captured per row today but is explicitly excluded from `totalValue`. This is not an oversight; it is a stated design choice this document does not alter.

---

## 19. Initial Capital Implications — [SEPARATE GOVERNANCE REQUIRED]

**The Product Architect's requirement, stated plainly:** during Initial Stock/Initial Capital, the owner may want the stock displayed on a **selling basis** (the minimum/expected value under the owner's chosen valuation approach) as an alternative to cost basis — explicitly **not** a claim that a sale will occur at those prices, and explicitly **not** POS behavior.

**Why this cannot be authorized by this document, or silently inferred as already permitted:**

1. `10-initial-stock-valuation-history-amendment.md` Part 2 establishes, as an accepted, binding rule, that **Initial Capital is historical truth** — `initialStockCount.totalValue`, computed once at confirmation, is never rewritten, recalculated, or reinterpreted "regardless of how many [price-change] events exist or what they record." This is enforced today at the Security Rules layer (`firestore.rules` refuses `update`/`delete` unconditionally for `type == 'initial'`).
2. `stockCount.ts`'s `normalizeStockCountItems` is **explicitly, deliberately cost-basis** — this is not an accidental omission of a selling-basis option; the in-code comment states the design intent directly ("the investment basis," matching Expected Current Stock Value's own cost-based rule).
3. Introducing a selling-basis *display* for Initial Capital — even one framed as a non-POS, non-transactional valuation lens, and even one that does not touch the frozen `totalValue` figure itself — is **a new business decision about what Initial Capital may represent or how it may be presented**, not a technical detail this document, or any existing accepted artifact, has authorized.

**This document does not invent that authorization.** Per the explicit instruction governing this session, it identifies precisely what conflicts (items 1–2, above) and states plainly: **a selling-basis Initial Capital display, in any form, requires its own separate BDR (or a formal amendment to `10-initial-stock-valuation-history-amendment.md` and/or `10-stock-counts.md`), explicitly reconciling it against the "Initial Capital is historical truth, cost-basis, frozen" rule those documents already establish.** Until that governance action occurs, no Specification, Rule 8, or implementation work should proceed on this specific requirement. (A parallel, *non-frozen*, count-specific display of what §16's mixed-valuation portions would total under a selling-price lens — shown alongside, not replacing, the frozen cost-basis `totalValue` — may be a narrower and less conflicting way to satisfy the underlying business need; this document flags that possibility only as a direction for the required separate governance action to consider, not as something it is itself authorizing.)

---

## 20. Historical-Data Behavior — [ESTABLISHED], extended by §14

A historical recorded fact — a batch's originally recorded quantity, unit, and cost; a completed count's observed quantities; a historical selling-price-setting event — is never automatically rewritten or reinterpreted as a result of Product Memory being newly confirmed or later changed (`BDR-0012` Decisions 15–16). §14 of this document extends this same discipline, for the first time explicitly, to the **derived** selling valuation/rate this document proposes — not merely to the batch's own directly-entered purchase-side fields.

---

## 21. Closing Compatibility — [ESTABLISHED]

Nothing in this document proposes any change to Monthly Closing's own governance (`08-09-11-closing-integrity-amendment.md`) or to the "truly immutable, no exceptions" tier `10-initial-stock-valuation-history-amendment.md` Part 2 already restates. §14's frozen-rate mechanism is, by design, an extension of the identical discipline Closing Integrity already applies elsewhere in this system (a recorded historical fact stays exactly as recorded) — not a new or competing immutability regime.

---

## 22. Backward Compatibility — [ESTABLISHED]

A product with no confirmed Product Memory (today's status quo for every existing product, since `unitRelationship` does not yet exist in code) is warned, not blocked, per `BDR-0012` §5.A Item 6/`POL-0005` — exactly the existing accepted rule. §13's automatic conversion simply does not fire for such a product; the owner enters cost/selling figures manually, exactly as today. No migration or backfill of any kind is proposed or implied anywhere in this document (consistent with `BDR-0012` §5.A Item 7 remaining explicitly open, and with `BDR-0013` item 9 remaining explicitly out of scope).

---

## 23. Tenant Isolation — [ESTABLISHED]

Every data element this document discusses — `Product.unitRelationship`, `Product`'s supplier-wording relationships, `StockBatch.sellingPrice`/`costPrice`, `StockCount` items — already lives under existing `businesses/{businessId}/...` Firestore scoping. No new isolation rule is introduced or required by anything in this document.

---

## 24. Explicit Non-Goals

- BPT does not become a point-of-sale system. No individual sale, sales quantity, or sales event is ever recorded, inferred, or reconstructed (`BDR-0012` Decision 5, unaffected).
- §13's derived selling value/embedded-profit figures are never a claim that a sale occurred, at that price or any price — identical in character to Embedded Profit's existing "never a realized figure" rule (spec #6).
- No second, independent Business Worth calculation is created anywhere in this document — §13–15 extend `calculateBatch`'s existing single formula, they do not add a parallel one (`BDR-0012` Decision 4).
- No historical migration, backfill, or bulk reinterpretation of any pre-existing `StockBatch` is proposed (§20, §22).
- No selling-basis Initial Capital figure is authorized by this document (§19).
- No multiple, independent unit-relationship families per product; no multiple permanent selling units per product (§4, `BDR-0012` §5.A Item 3, unaffected).
- No semantic (non-normalization-level) matching capability for either UOM Recognition or supplier-wording recognition is proposed (unaffected — `POL-0003`/`POL-0007`'s existing technical boundaries stand).

---

## 25. Implementation Boundaries / Rule 8 Handoff

**Not decided by this document, left for Rule 8 once the [NEW] sections above are accepted:**

- **The technical storage/representation mechanism for §13's system-derived transaction valuation and §14's frozen-historical requirement** — explicitly and deliberately not decided here (§13–14). This includes whether it lives on `StockBatch` as new field(s) distinct from `costPrice`/`sellingPrice`, as a separate linked record, as a computed-and-cached value, or otherwise. **This document explicitly does not decide, and Rule 8 must not assume, that `StockBatch.sellingPrice` is reused for this purpose** — that field's existing meaning (an owner-set, per-purchase-unit selling price) must remain undisturbed and unambiguous.
- The exact moment §13's derivation runs (client-side at entry vs. server-side at commit) and how the derived figure is visually presented alongside — never merged into — the purchase facts (§5) and Product Memory (§4) on the review screen.
- The exact technical mechanism for "one unresolved product at a time" (§8) — client-side queue state, a dedicated review-step component, or otherwise.
- Whether/how §16's per-portion valuation-price capability is represented in `StockCountItem`'s existing per-row shape, or requires a sub-row structure — an open technical question this document does not resolve, mirroring the identical kind of gap the accepted UOM Specification already flags for its own §2 data model.
- Precision/rounding for any newly-derived intermediate or display figure this document introduces — governed by the existing `POL-0001`/`POL-0002` convention, not a new rule.
- The exact form any §19 separate-governance action should eventually take (new BDR vs. formal amendment) — a decision for whoever initiates that governance action, not fixed here.

**Not authorized by this document, regardless of any of the above being resolved:** any Rule 8 Assessment, Implementation Authorization, code change, schema change, or `firestore.rules` change for anything newly proposed in §8, §13–15, or §16's price-basis extension.

---

## 26. Acceptance Criteria

If accepted, this document establishes that:

1. A confirmed unit relationship and confirmed selling unit/price, once set, are automatically reused on every future purchase for that product — no re-asking (§4, §7 — already established, restated).
2. Purchase quantity/unit/cost are never rewritten by Product Memory, on any surface (§5 — already established, restated).
3. A supplier-wording match, once confirmed, is remembered and reused automatically; product identity and unit relationship remain distinct memories (§6, §12 — already established/implemented, restated).
4. Unresolved receipt lines are resolved one at a time, before the full receipt is shown for final review; the full receipt then commits atomically (§8, §11 — §8's sequencing is the new element).
5. A purchase in a non-selling unit automatically derives, as a distinct system-derived figure, its implied selling value and embedded profit through the confirmed relationship, composed correctly across any number of hops and in either direction, with no owner arithmetic — without this figure ever being written back into, or confused with, the purchase facts (§5) or Product Memory's remembered selling price (§4) (§13 — new).
6. That system-derived valuation, once established for a given transaction, is never silently recalculated by a later change to Product Memory — the exact storage mechanism for this is a Rule 8 question, not decided here (§14 — new, business requirement only).
7. Whatever mechanism Rule 8 selects for §14 remains correct against a live, quebra-reduced remaining quantity — achieved by freezing a rate/relationship, never an absolute converted quantity (§15 — new, business requirement only).
8. Initial Stock and Periodic Contagem may value physically mixed-unit portions of the same product differently within one count, without creating a second permanent selling unit (§16–17 — extension of an already-established capability).
9. No selling-basis Initial Capital figure exists or is implied until a separate, explicit governance action authorizes it (§19 — explicitly gated, not authorized here).
10. No historical batch, count, or price-setting event is ever silently rewritten as a side effect of anything in this document (§20 — already established, restated and extended).

---

## 27. Product Architect Acceptance

**Status:** ✅ **Accepted.**

> This Consolidated Specification is accepted, including the explicit correction confirming that the mixed-unit/mixed-valuation-price-basis capability (§16–17) applies exclusively to Initial Stock and Periodic Contagem valuation, and does not apply to, and must never be read as applying to, purchase receipt/Add Stock/Smart Stock Entry — which remains governed exclusively by §13's single Product Memory selling-unit/selling-price rule. No other business decision in this document is altered by that correction. Acceptance of this Specification does not itself authorize implementation — see the companion Rule 8 Assessment and signed Implementation Authorization for that separate gate.

---

## Product Architect Review Summary

**Already established (this document only restates or sharpens):**
- Product Memory's definition and singular-selling-unit rule (§4).
- Purchase facts as batch-specific, never Product-Memory-derived, purchase-unit-as-effectively-fixed (§5).
- Supplier-wording recognition's suggest-then-confirm mechanism, now implemented in code (§6).
- UOM Recognition's proposal-then-confirm mechanism, accepted but not yet implemented (§7).
- Whole-batch atomic confirmation; historical-fact immutability; tenant isolation; backward-compatibility warn-not-block treatment (§11, §20, §22–23).

**Newly established by this Specification, now accepted:**
- Mandatory one-at-a-time unresolved-product resolution, strictly before full-receipt review (§8).
- Automatic multi-hop purchase-to-selling conversion and embedded-profit derivation at batch entry, as a strictly separate, system-derived figure (Concept C) that never overwrites purchase facts (§5) or Product Memory's remembered selling price (§4), and uses exactly one selling basis per purchase/receipt line (§13).
- The business requirement that a transaction's system-derived selling valuation, once established, must not silently recalculate when Product Memory later changes — with the technical storage mechanism resolved by the companion Rule 8 Assessment (§14).
- The business requirement that the mechanism Rule 8 selected for §14 must remain correct against a live, quebra-reduced remaining quantity, ruling out freezing an absolute converted quantity (§15).
- Per-portion, differing-price-basis valuation within a single mixed-unit count for one product — **exclusively for Initial Stock and Periodic Contagem, and explicitly not applicable to purchase receipt/Add Stock/Smart Stock Entry** (§16–17, as corrected and accepted).

**Genuinely requires separate governance, not authorized here:**
- A selling-basis Initial Capital display of any kind — conflicts directly with `10-initial-stock-valuation-history-amendment.md` Part 2's "historical truth, cost-basis, frozen" rule (§19).

**Resolved by the companion Rule 8 Assessment:**
- Storage/representation for §13's Concept C and §14's freeze requirement: `StockBatch.derivedSellingValuation`, a fully separate structure — `StockBatch.sellingPrice` and `StockBatch.costPrice` retain their existing meaning and usage, unconditionally.
- Client-vs-server timing for §13's derivation; the one-at-a-time queue mechanism for §8; confirmation that §16's per-portion price basis requires no schema change.
- §19's technical form remains undecided, pending the separate governance action §19 itself requires.

---

**ACCEPTED — GOVERNING SPECIFICATION. Implementation proceeds only under the separate, signed Implementation Authorization (`product-memory-purchase-selling-valuation-implementation-authorization.md`), per that document's own sequencing (Increment A, then Increment B gated on Increment A's completion and merge).
