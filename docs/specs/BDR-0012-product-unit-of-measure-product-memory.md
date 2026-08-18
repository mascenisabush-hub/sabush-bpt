Business Decision Record

# BDR-0012 — Product Unit-of-Measure & Product Memory

**Status:** Approved.

**Type:** Business Decision Record — a strategic, long-lived decision about why this capability exists and what boundary it may never cross, per the category `19-governance-bdr-policy-framework.md` establishes. Not a Policy (no "how, specifically" operational rule is fixed here) and not a Business Domain Specification (no functional requirement or acceptance criterion for implementation is fixed here).

**Location note:** Not yet filed. If approved, the repository's existing precedent (`BDR-0004`, `BDR-0008`, `BDR-0009` are all filed without a module prefix, in `docs/specs/`, because each is cross-cutting rather than belonging to a single existing module) suggests this decision — which touches Products (#3), Stock Batches (#5), Stock Counts (#10), Smart Stock Entry (amendment to #4/#5), and the Business Worth Engine (#2) — would follow the same unprefixed `docs/specs/` filing pattern. This document does not decide that placement; it only notes the applicable precedent.

**Depends on:** `docs/specs/product-unit-of-measure-discovery.md` — the committed, filed Discovery Report (commit `a32de3c`) covering the current data model, product matching, the Smart Stock Entry OCR pipeline's non-conversion boundary, Periodic Stock Count's one-quantity-one-unit shape, and the Business Worth calculation engine's unit-unawareness. This BDR is grounded in that report, consistent with the repository's existing precedent of a BDR citing a filed Discovery Report by name in its own `Depends on` field (e.g. `BDR-0009` citing `docs/specs/stock-count-simplification-discovery.md`).

**Followed by:** Per this document's own §9 ("Next Governance Step"), not a single named artifact — the repository's approved governance hierarchy (`Business Philosophy → BDR → Policy → Module Specifications → Rule 8 → Implementation`, `19-governance-bdr-policy-framework.md` §3) and this BDR's own §6 split require, in order: resolution of the remaining BDR-level decisions in §5.A; a future Policy artifact or series for the operational rules in §5.B (exact identifier not yet assignable — see §5.B); and formal reconciliation of the specific existing governance conflict named in §4. No specific filename or number is invented for any of these.

---

## 1. The Business Decision

**Sabush BPT may allow a business owner to define, once, how a product's units of measure relate to each other — and the platform's authoritative Business Worth calculation may use that confirmed relationship to correctly interpret quantities expressed in any of a product's related units, without ever becoming a second, independent notion of what the business is worth.**

This decision exists because a business owner who must manually convert between purchase, selling, and counting units in their head before entering data into BPT can make an error the platform has no way to catch — directly undermining BPT's central promise of being the one trustworthy answer to "what is my business worth." BPT remains, throughout this decision, exactly what it already is: a platform that records stock, purchase cost, and a remembered selling price used to calculate embedded profit and business worth — never a point-of-sale system, and never a record of individual sales.

## 2. Decisions Formally Established

1. **BPT must be able to understand a business owner's confirmed configuration of how a product's units relate to each other**, and apply that configuration to correctly interpret a quantity of that product expressed in any of its related units.
2. **Purchase unit and selling/valuation unit may differ for the same product.** A product may legitimately be purchased in one unit and valued for selling purposes in a different unit (i.e., the unit its remembered selling price applies to — BPT does not record that a sale actually occurred).
3. **Product configuration ("Product Memory") is persistent, owner-confirmed knowledge about a product — including its unit relationships, its remembered selling unit, and its reference prices — and is never a second financial ledger.** It never independently calculates, stores, or presents a value for what the business is worth.
4. **The authoritative Business Worth calculation may draw on Product Memory's unit-relationship knowledge to correctly interpret a quantity before valuing it.** This is required, not merely permitted: a calculation that ignored this knowledge would misvalue any quantity expressed in a non-default unit. This does not create a second calculation — there remains exactly one authoritative Business Worth calculation, computed one way, everywhere it is asked (consistent with `02-business-worth-engine.md`'s existing purpose).
5. **BPT does not become a sales/point-of-sale system as a result of this capability.** No individual sale, sales quantity, or sales event is ever recorded, inferred, or reconstructed from a configured unit relationship, a receipt, or a physical count.
6. **A physical Stock Count may contain the same product entered across multiple different units within a single count**, and BPT must accept this without requiring the owner to first convert everything into one unit themselves.
7. **Quantities of the same product entered in different units within one count represent one coherent physical stock position for that product**, correctly valued under Stock Count's own existing, separately-governed valuation treatment (see §4's boundary statement) — not several unrelated quantities the owner must separately track or manually combine.
8. **A receipt or purchase batch containing both already-recognized and completely new products must be processed as one workflow**: recognized products are automatically populated from their confirmed Product Memory; new products are surfaced together and require only the information the platform genuinely could not already know; and the complete batch — recognized and newly-configured products together — is presented for one whole-batch review.
9. **Receipt/batch stock-entry commitment is a single, whole-batch action.** No subset of a batch may be committed on a partial or per-line basis.
10. **When the system has reason to believe a newly entered or scanned product may already exist under a different name, spelling, or formatting, it may suggest a possible match to the owner but may never silently decide product identity on that basis.** This applies regardless of how confident the similarity signal is — certainty is never a precondition for asking.
11. **While a flagged possible-duplicate match is unresolved, neither outcome (merge into the existing product, or create as a new separate product) may proceed silently.** The owner's explicit choice — "same product" or "different product" — is required before either outcome takes effect.
12. **AI (OCR extraction, and any future recognition capability) may read, propose, and suggest, but may never independently establish canonical product identity, invent or confirm a unit-conversion factor, invent or confirm a selling price, or reinterpret any historical financial record.** These four remain human (owner) decisions, made explicitly the first time each is established.
13. **Once an owner has confirmed a product's unit relationship, selling unit, and reference prices, the platform remembers and automatically reuses that configuration on future purchases, receipts, and counts.** The owner is not required to re-decide the same question on every routine future interaction.
14. **The owner may review or edit any remembered Product Memory configuration at any time**, with the edited configuration becoming what is remembered and reused going forward.
15. **A historical recorded fact — a batch's originally recorded quantity, unit, and price; a completed count's observed quantities; a historical selling-price-setting event — is never automatically rewritten or reinterpreted as a result of a product's configuration being newly confirmed or later changed.**
16. **Should a future, deliberate need ever arise to reinterpret historical records in light of a later configuration, that requires a separate, explicit business decision, made and documented on its own terms** — it is not authorized by default, implicitly, or as an automatic consequence of this decision.

## 3. Product Identity vs Product Memory vs Historical Facts

These remain three distinct things, per Decisions 3 and 15 above, and must not be collapsed into one:

- **Product identity** — the stable, permanent fact that "this thing" is the same product every time it is bought, sold, or counted. Already exists in BPT today (`03-products.md`) and is unaffected by this decision.
- **Product Memory (configuration)** — owner-confirmed knowledge about a product: its unit relationships, remembered selling unit, and reference prices. Informs interpretation of quantity (Decision 4); never itself a source of financial truth (Decision 3).
- **Batch-specific and transaction-specific facts** — what was actually recorded at a specific purchase, selling-price-setting, or count event. Protected historical facts (Decisions 15–16). Product Memory may inform how these are interpreted at the moment they are entered; it never retroactively changes what one already means.

**Purchase-side facts** (quantity purchased, purchase unit, purchase cost) are batch-specific facts, supplied at the moment of a specific purchase — from a receipt, OCR extraction, or direct owner entry — and are never derived from Product Memory. **Selling-side information** (selling unit, selling price) is the kind of knowledge that belongs in Product Memory once confirmed, automatically populating future stock-entry rows, always shown for owner review, always editable. *(Concretely, and without deciding how a receipt's stated cost figure should be interpreted — see §5.B — a receipt showing a purchase of* *`3 Cx`* *of a product with a confirmed configuration of* *`1 Cx = 4 Emb = 24 Un`**, a remembered selling unit of* *`Un`**, and a remembered selling price of* *`20 MZN/Un`* *would have the receipt supply the purchase quantity, unit, and stated cost, while Product Memory supplies the selling unit and price — both shown together for the owner's review, each independently editable.)*

## 4. Explicit Reconciliation With Existing Approved Governance

**This section exists because this decision directly conflicts with two already-approved, currently-binding governance decisions, and that conflict is not silently ignored, resolved by inference, or treated as already settled.**

1. **`BDR-0009`** **(Stock Count as a Physical Observation Event), §2, Decision 11:** *"No unit-of-measure conversion logic is introduced. The simplified Stock Count screen displays each product's existing, already-recorded unit string unchanged — it neither converts between units nor invents a canonical unit representation."* Restated in `BDR-0009` §7: *"Does not introduce unit-of-measure conversion."*
2. **`docs/specs/04-smart-stock-entry-amendment.md`**, explicit Non-Goal (line 395): *"Unit-of-measure conversion (carton→bottle, sack→kilogram, etc.)"* — and Part 8's text: *"Unit-of-measure conversion is explicitly* ***not*** *part of this amendment... a future, separate capability if ever pursued."*

**Both decisions were correct and valid for the capabilities they governed, and remain fully binding today.** `BDR-0009`'s prohibition protected Stock Count's central "physical observation, not reconciliation" framing at the time no conversion capability existed to evaluate against that framing. The Smart Stock Entry amendment's non-goal correctly kept AI extraction narrowly scoped to what a document literally states, deferring exactly this capability by name as "a future, separate capability if ever pursued."

**This proposed BDR is that future, separate capability, arriving now.** It intentionally proposes changing the specific boundary both decisions drew — not because those decisions were wrong when made, but because a new business capability is now being proposed that they did not, and could not, anticipate.

**This BDR does not silently supersede, retroactively rewrite, or quietly ignore either decision.** Both remain the accurate record of what was decided and why, at the time they were decided. **Neither** **`BDR-0009`** **nor** **`04-smart-stock-entry-amendment.md`** **is modified by this document.** If this BDR is approved, both would require formal, explicit amendment — through this repository's own governance process, as a separate, subsequent action — before Stock Count or Smart Stock Entry could actually implement any unit-conversion behavior. **This BDR's approval alone does not authorize touching either artifact; it only establishes the business decision that such amendment would eventually need to implement.**

## 5. Open Decisions, Classified by Governance Layer

At the time this BDR was originally filed, none of the following was answered by this document. Following formal Product Architect review and explicit ratification (recorded in §5.A's Resolution Log below), a subset of the §5.A items has since been resolved. Every remaining item — including the retained open sub-questions within partially-resolved §5.A items, and all of §5.B — remains genuinely undecided; none should be inferred as answered beyond what the Resolution Log explicitly states.

### 5.A — Business/Philosophy Decisions

*(Questions affecting the business meaning or scope of this capability — must be resolved at the BDR/business-decision level before technical architecture proceeds. Status shown per item; resolved items are recorded decisions of this BDR, not merely recommendations.)*

1. **Reconfiguration/historical application — RESOLVED.** Once a product's unit-relationship configuration is confirmed, it applies prospectively: from the moment of confirmation, all current and future interpretation of quantities for that product — including stock still on hand from batches recorded before the configuration existed — uses the confirmed configuration. The historical record of each batch (its originally recorded quantity, unit, and price) is never rewritten, consistent with Decisions 15–16. The Product Architect has explicitly reviewed and accepted the valuation risk this mechanism carries for pre-existing stock, notwithstanding that real-world historical mixed-unit prevalence remains genuinely unmeasured (Discovery Report §13) — this risk is knowingly and explicitly carried forward, not resolved by evidence.
2. **Arbitrary/non-linear unit relationships — RESOLVED.** Initial business scope is strictly-ordered unit-relationship chains only (as in every worked example evidenced to date). This is scope-as-evidenced, not a permanent ceiling: no non-linear scenario has been documented, and this decision should be revisited if one is.
3. **Multiple independent unit-relationship families — REMAINS OPEN.** No evidence exists in either direction; no real business scenario requiring this has been documented. Requires further business input before any decision.
4. **Purchase-unit level restriction — REMAINS OPEN.** The only evidence available is a single illustrative worked example (§3), which is not a business rule. Whether real receipts this business processes ever state a purchase at a non-top unit is unresolved and requires either direct business input or further targeted discovery.
5. **Selling unit vs. count unit — RESOLVED.** Selling unit and count unit are not required to be the same value; they may genuinely differ for the same product. This follows directly from already-established Decisions 6–7, which require the system to interpret and combine multiple different units within a single count for one product — a capability that only coheres if unit interpretation is decoupled from which unit is the selling unit.
6. **Incomplete product configuration — PARTIALLY RESOLVED.** Silent fallback to unconverted behavior is ruled out, for consistency with the "never resolve ambiguity silently" pattern already established by Decisions 10–12. Whether an incomplete configuration should block entry entirely or allow entry with a warning **remains open** — both are consistent with the silent-fallback prohibition, and no evidence distinguishes between them.
7. **Historical-data posture — REMAINS OPEN.** Discovery Report §12–13 confirm both that real production data cannot be inspected from this environment and that historical mixed-unit prevalence is genuinely unmeasured — not classifiable as low/moderate/high risk. Choosing between proceeding on a conservative assumption and commissioning a data-access mechanism first is a risk-tolerance decision that has not yet been made, and is explicitly not inferred from the evidence's absence.
8. **Governance treatment — RESOLVED.** No additional business-level governance decision is required beyond the sequence already established in §9 (BDR approval → §5.A → §5.B → formal reconciliation of `BDR-0009` and `04-smart-stock-entry-amendment.md` → Specification → Rule 8 → Implementation Authorization → Implementation). The narrower question of reconciliation document mechanics (one combined amendment vs. several; which specs receive companion amendments) is deferred to when that reconciliation work is actually undertaken, and is not a live §5.A item.

**§5.A Resolution Log** — Decisions on items 1, 2, 5, 6 (silent-fallback prohibition only), and 8 above were made via formal Product Architect review and explicit ratification in this project's governance thread. Items 3, 4, 6 (block-vs-warn sub-question), and 7 remain genuinely open and are carried forward as this BDR's live open items.

### 5.B — Deferred Operational/Policy Decisions

*(Operational "how, specifically" rules that, per* *`19-governance-bdr-policy-framework.md`* *§2's own BDR/Policy distinction, are more evolvable than this BDR's strategic content and belong in a future Policy artifact — following the same pattern* *`BDR-0001`* *used to defer trial duration, pricing, and grace periods to the later Policy series, rather than deciding them itself.)*

1. **Fractional quantity handling** — what happens, and what the owner sees, when a physical quantity doesn't convert evenly between configured units.
2. **Rounding behavior** — the specific treatment of a final valued/displayed number when rounding is unavoidable.
3. **Minimum required configuration for a new product** — exactly what must be supplied before a new product is usable, versus what may remain optional.
4. **Similarity-confirmation threshold and experience** — how confident a possible-duplicate signal must be before interrupting the owner, and what that confirmation moment looks like.
5. **Whether an owner can temporarily override Product Memory for a single purchase or count** without altering the saved configuration going forward.
6. **Purchase cost interpretation** — whether a stated purchase cost is understood as a total for the purchased quantity, a per-purchase-unit figure, or something the owner must explicitly specify.

**These operational questions are deferred to** **`[Future Product Unit & Memory Policy — exact artifact identifier to be assigned]`****, following approval of this BDR and resolution of §5.A.** No policy number or filename is fabricated here — per `19-governance-bdr-policy-framework.md`'s own precedent (its Numbering Ledger addendum, which explicitly documents that policy numbers are sometimes reserved conversationally before a file exists), this document only names the *category* of artifact expected to eventually resolve these questions, not a specific identifier.

## 6. What This BDR Decides, and What It Does Not

**This BDR decides:**

- Why this capability exists and what business problem it solves (§1).
- What business meaning "Product Memory," "unit relationship," and "one authoritative Business Worth calculation" have, and how they relate (§2, §3).
- What authority belongs to the owner versus what AI may do (§2, Decisions 10–14).
- What historical and financial-truth boundaries apply, and must continue to apply (§2, Decisions 3–5, 15–16).
- That existing approved governance decisions directly conflict with this capability, and that this conflict requires formal reconciliation before implementation, not silent supersession (§4).

**This BDR does not decide:**

- A technical data model (base unit, ordered hierarchy, graph, or any other representation).
- A database or Firestore schema.
- Conversion arithmetic, rounding algorithms, or fractional-quantity treatment.
- A similarity/duplicate-detection algorithm or confidence threshold.
- Any UI or interaction design.
- A migration strategy or mechanism for historical data.
- Any of the items listed in §5.A or §5.B.

## 7. Business Acceptance Criteria

*(Concise, checkable business outcomes — corresponding directly to §2's numbered decisions, not technical implementation criteria.)*

1. A confirmed product unit relationship is remembered and automatically reused on future entries for that product (Decision 13).
2. Purchase-side facts (quantity, unit, cost) remain batch-specific, purchase-event facts, never derived from Product Memory (§3, Decision 2).
3. Selling/valuation unit and price can be sourced from Product Memory to inform the authoritative Business Worth calculation, without BPT recording that any sale occurred (Decisions 2, 4, 5).
4. A configured mixed-unit quantity — entered in whatever unit(s) the owner actually observed — is understood correctly without the owner pre-converting it (Decisions 6–7).
5. Mixed-unit physical counts of one product are treated and valued as one coherent stock position, under Stock Count's own existing, separately-governed valuation treatment (Decision 7).
6. A receipt batch containing both recognized and new products reaches exactly one whole-batch confirmation, with no partial commitment (Decisions 8–9).
7. A flagged possible-duplicate-product case cannot resolve silently in either direction — the owner's explicit choice is always required (Decisions 10–11).
8. AI cannot independently establish canonical product identity, a conversion factor, a selling price, or a historical reinterpretation, under any confidence level (Decision 12).
9. A historical recorded fact is not automatically rewritten or reinterpreted as a side effect of a product's configuration being confirmed or changed (Decisions 15–16).
10. Business Worth remains exactly one authoritative calculation; no independent Product-level or Stock-Count-level financial truth is created (Decisions 3–4, 7).

## 8. Governance Notes

- This record does not modify, supersede, or retroactively reinterpret `BDR-0009`, `04-smart-stock-entry-amendment.md`, `02-business-worth-engine.md`, `03-products.md`, `10-stock-counts.md`, or any other existing governance artifact. It establishes a business decision that, if approved, would require each of these to be formally amended before implementation — that amendment is not performed here.
- This record does not authorize implementation, a Specification, a Rule 8 Assessment, or an Implementation Authorization for this capability.
- This record does not invent, assume, or imply any finding about real production data beyond what the underlying investigations directly confirmed (i.e., that real production data was not accessible for inspection, and that no claim about the prevalence of historical mixed-unit records is made in either direction).

## 9. Next Governance Step

If this BDR is approved, the governance sequence is, in order:

BDR approval
        ↓
Resolution of remaining BDR-level business decisions (§5.A)
        ↓
Policy artifact(s) for operational rules (§5.B) — exact identifier not yet assigned
        ↓
Formal reconciliation/amendment of BDR-0009 and
04-smart-stock-entry-amendment.md (§4) — and any other artifact
identified during that reconciliation work
        ↓
Technical architecture / Specification
        ↓
Rule 8 Assessment
        ↓
Implementation Authorization
        ↓
Implementation

**Current status:** BDR approval has occurred (see Status, above). §5.A is now partially resolved — items 1, 2, 5, 6 (silent-fallback prohibition only), and 8 are resolved per the Resolution Log in §5.A; items 3, 4, 6 (block-vs-warn), and 7 remain open. No §5.B Policy artifact, reconciliation/amendment of `BDR-0009` or `04-smart-stock-entry-amendment.md`, technical architecture, Specification, Rule 8 Assessment, or Implementation Authorization has occurred.

---
