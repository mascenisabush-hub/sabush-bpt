Business Decision Record — Reconciliation Amendment

# Product Unit-of-Measure & Product Memory — Reconciliation Amendment

**Status:** ✅ Accepted (2026-08-18). See "Product Architect Acceptance," below.
**Amends:** [`BDR-0009`](./BDR-0009-stock-count-physical-observation.md) §2 Decision 11, §7; [`04-smart-stock-entry-amendment.md`](./04-smart-stock-entry-amendment.md) §F (Explicit Out-of-Scope List), §C ("Quantity/units" business rule) — narrowly, only to the extent §1 below identifies as directly superseded.
**Does not amend:** `BDR-0012`, `POL-0001` through `POL-0004`, the Discovery Report, or any part of `BDR-0009`/`04-smart-stock-entry-amendment.md` not explicitly named in §1 — see §3 for the complete preserved-boundary list.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Approved, §4's own reconciliation requirement; §9's own governance sequence, which places this reconciliation before Technical Architecture/Specification).
**Origin:** Identified directly by `BDR-0012` §4 at the time of its own approval — not a conflict discovered incidentally during implementation, but one named and explicitly deferred to this separate, subsequent action from the outset.

---

## 1. Problem Statement

`BDR-0009` and `04-smart-stock-entry-amendment.md` each contain an explicit, direct statement that unit-of-measure conversion does not exist and is out of scope. Both statements were correct and valid when written — no conversion capability existed to evaluate against them. `BDR-0012` has since been approved, explicitly authorizing exactly the capability those statements excluded. This reconciliation identifies precisely which statements are now superseded, and states clearly that nothing else in either document changes.

**Directly superseded statements, quoted exactly:**

1. **`BDR-0009` §2, Decision 11:** *"No unit-of-measure conversion logic is introduced. The simplified Stock Count screen displays each product's existing, already-recorded unit string unchanged — it neither converts between units nor invents a canonical unit representation."*
2. **`BDR-0009` §7:** *"Does not introduce unit-of-measure conversion."* (restates Decision 11)
3. **`04-smart-stock-entry-amendment.md` §F (Explicit Out-of-Scope List):** *"Unit-of-measure conversion (carton→bottle, sack→kilogram, etc.)."*
4. **`04-smart-stock-entry-amendment.md` §C ("Quantity/units"):** *"...never silently converted to an assumed bottle count. Unit-of-measure conversion is explicitly **not** part of this amendment... a future, separate capability if ever pursued."*

## 2. Why Reconciliation Is Required

`BDR-0012` §4 itself already states the reason precisely: *"This BDR does not silently supersede, retroactively rewrite, or quietly ignore either decision... If this BDR is approved, both would require formal, explicit amendment... before Stock Count or Smart Stock Entry could actually implement any unit-conversion behavior."* Proceeding to Specification without this reconciliation would leave two approved, currently-binding documents in direct textual contradiction with a third — exactly the ambiguity the `20-notifications-priority-reconciliation-amendment.md` precedent (§2) describes as forcing "a decision neither [document] actually made," left for whichever engineer happens to hit the collision first. `BDR-0012` §9's own governance sequence already places this reconciliation immediately before Specification, precisely to prevent that.

## 3. Proposed Reconciliation

### 3.1 What Is Superseded, and Precisely How Far

The four statements in §1 are superseded **only within the exact scope `BDR-0012` itself authorizes** — not conversion in general, not any capability broader than what was actually approved:

- A **single confirmed unit-relationship family per product** (`BDR-0012` §5.A Item 3) — not multiple independent families, not an arbitrary universal UOM system.
- Reached only through **Recognition proposing, and the owner explicitly confirming** (`BDR-0012` Decision 17) — never silently, never without confirmation, never automatically.
- Applied only once **Product Memory holds a confirmed configuration** (`BDR-0012` Decisions 13–14) — an unconfirmed Recognition proposal is not conversion capability being exercised; it is a proposal awaiting the same owner authority these source documents already protect.
- Governed, where the product's configuration is incomplete, by the **already-resolved warn-and-allow-entry rule** (`BDR-0012` §5.A Item 6) — never a silent fallback, never an invented conversion. Other causes of an uninterpretable quantity (a technical conversion failure, an invalid factor, a temporary relationship-factor override) are not decided by this reconciliation.

### 3.2 Seven Distinct Concepts — Not to Be Conflated

This reconciliation, and any Specification that follows it, must keep these seven concepts distinct, per `BDR-0012`'s own careful separation of them:

1. **Recognition** of a first-time product (`BDR-0012` Decision 17) — a proposal only, never authoritative.
2. **Owner confirmation** (`BDR-0012` Decisions 13, 17) — the sole act that converts a proposal into fact.
3. **Product Memory** (`BDR-0012` Decision 3) — this business's own confirmed configuration, not a universal truth.
4. **Unit relationship interpretation/conversion** (`BDR-0012` Decisions 1, 4) — the arithmetic of applying a confirmed relationship, distinct from how that relationship was established.
5. **Purchase-unit flexibility** (`BDR-0012` §5.A Item 4) — which unit a specific purchase is recorded in, governed independently of how Product Memory itself was confirmed.
6. **Stock Count interpretation** (`BDR-0012` Decisions 6–7) — combining mixed-unit physical observations into one coherent position, under Stock Count's own separate valuation treatment.
7. **Smart Stock Entry extraction** (`04-smart-stock-entry-amendment.md` §C, unchanged) — reading what a specific document literally states, never inferring or converting a unit from it. Recognition is not extraction: extraction reads one document; Recognition proposes from general knowledge, independent of any document.

### 3.3 `BDR-0009` §2 Decision 5 and Decision 7 — Potentially Affected, Not Contradictory

- **Decision 5** (*"Already-known product metadata is displayed automatically — name, reference purchase price, reference selling price, unit — sourced from the existing `Product` catalog record"*): not contradicted. Decision 5's existing "unit" reference remains valid within the scope in which Decision 5 was originally made. Any future expansion of what the catalog's unit field represents is left to the subsequent Specification — this reconciliation does not decide how the existing `Product` record changes.
- **Decision 7** (*"The system automatically calculates report values... from the counted quantity and the already-known prices"*): not contradicted. The underlying principle — value computed from quantity × price — is unaffected. What "the counted quantity" refers to may, once a future Specification implements mixed-unit combination for Contagem, be a combined figure rather than a single raw number; this reconciliation notes that forward-compatibility point without deciding it, since the Specification, not this reconciliation, is where that mechanism is defined.

### 3.4 `BDR-0009` §5 (Expected Current Stock Value Exception) — Explicitly Confirmed Unaffected

The narrow, aggregate-only, never-per-product-decomposed exception `BDR-0009` §5 establishes is **not widened, narrowed, or otherwise touched** by this reconciliation. A future combined/converted *observed* physical quantity (Stock Count interpretation, §3.2 item 6 above) is not an *expected* figure in the sense `BDR-0009` §5 protects against — it remains what the owner actually reported, per Item 6's own warn-and-allow-entry rule, never a system-computed expectation. Any Specification implementing this must independently confirm it does not decompose Expected Current Stock Value to a per-product row; this reconciliation does not perform that confirmation itself.

### 3.5 `04-smart-stock-entry-amendment.md` §C, Selling Price / Product Memory Language — Clarified, Not Changed

The existing wording uses the term "Product Memory" in a prefill context, before `BDR-0012` formalized it. `BDR-0012` subsequently establishes the governed meaning of Product Memory. This reconciliation does not determine whether every prior informal use of that term has identical semantics — the future Specification must apply the approved `BDR-0012` meaning where relevant. No change to this passage's actual instruction (that prefilled-from-history values must remain visually distinct from extracted-from-document values) is made or implied.

## 4. Migration Statement

**This reconciliation does not itself authorize or perform historical reinterpretation.** The treatment of historical records remains subject to `BDR-0012` §5.A Item 7 (still open) and any subsequent approved governance decision. Consistent with `BDR-0012` Decisions 15–16, every existing Stock Count report and every existing Smart Stock Entry extraction remains valid exactly as recorded — this reconciliation changes only what becomes possible *going forward*, for a product whose owner has explicitly confirmed a unit relationship after this capability exists. No backfill, no reinterpretation, no migration of any prior document is required or authorized by this reconciliation.

## 5. What This Reconciliation Does Not Decide

- Does not decide a technical data model, database schema, or Firestore structure for unit relationships.
- Does not decide a conversion algorithm, rounding treatment beyond what `POL-0001`/`POL-0002` already establish, or a similarity/matching algorithm beyond what `POL-0003` already establishes.
- Does not decide how mixed-unit combination is technically implemented in Stock Count, Add Stock, or Initial Stock — that remains for the eventual Specification.
- Does not decide an AI provider, model, or recognition mechanism for Decision 17's Recognition capability.
- Does not resolve `BDR-0012` §5.A Item 7 (historical-data posture, still open) or §5.B items 3/5 (addressed separately, in `POL-0005`/`POL-0006`).
- Does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization — those remain later, separate governance gates per `BDR-0012` §9's own sequence.
- Does not reopen, narrow, or widen any part of `BDR-0009` or `04-smart-stock-entry-amendment.md` not explicitly named in §1.

## 6. Preserved Boundaries — Explicitly Confirmed Unaffected

The following remain entirely intact, unmodified, and binding — none is touched by this reconciliation:

**From `BDR-0009`:** the "physical observation, not reconciliation" central framing (§1); the Trust Test (§6); the zero-vs-blank distinction (§2 Decision 6, §4); multi-shop isolation (§2 Decision 12); "no POS behavior" (§2 Decision 10); "does not modify Business Worth" (§2 Decision 9); the "Active Product" definition (§3); the Expected Current Stock Value exception's own narrow, aggregate-only boundary (§5, reconfirmed unaffected in §3.4 above).

**From `04-smart-stock-entry-amendment.md`:** the entire AI-advisory boundary (`BDR-0008`); every other Explicit Out-of-Scope item — autonomous posting without confirmation, automatic Product merging without confirmation, automatic selling-price invention, automatic Restock Observation inference, sales tracking/POS-adjacent capability, automatic accounting, any change to Business Worth/Embedded Profit/Stock Value calculations, any change to Restock Observation semantics, any edit to a historical `StockBatch`, persistent document storage, confidence-percentage UI, subscription-tier gating specifics; the entire Failure Modes table (§G); the whole-batch confirmation flow.

## Governance Notes

- No `src/`, `apps/`, `server/`, or `firestore.rules` file has been modified to produce this document.
- `BDR-0009` and `04-smart-stock-entry-amendment.md` are not edited in place by this document — consistent with this repository's established, exhaustively-verified "amend additively, never rewrite" pattern (confirmed across 15 existing amendment documents, none of which edits its source in place).
- This document does not modify `BDR-0012`, `POL-0001` through `POL-0004`, or the Discovery Report.
- Now that this reconciliation is Accepted, `BDR-0009` and `04-smart-stock-entry-amendment.md` would each receive a short cross-reference note pointing to this reconciliation, following the same mechanical-follow-up pattern the `20-notifications-priority-reconciliation-amendment.md` precedent describes (its own Governance Notes). **This is mechanical post-acceptance follow-up, requiring no new business decision but requiring separate repository changes** — that follow-up edit is not performed here, and is not itself a new decision, only a pointer. It requires separate, explicit authorization before either source file is touched.

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-08-18).

> The reconciliation scope is accepted exactly as drafted. It supersedes only the explicitly identified historical unit-conversion exclusions in `BDR-0009` §2 Decision 11/§7 and `04-smart-stock-entry-amendment.md` §F/§C — nothing broader. All preserved boundaries listed in §6 remain intact. This acceptance does not resolve `BDR-0012` §5.A Item 7, and does not authorize Specification, Rule 8 Assessment, or Implementation Authorization.
