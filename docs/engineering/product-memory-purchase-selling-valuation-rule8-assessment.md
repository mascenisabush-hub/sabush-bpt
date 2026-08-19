Rule 8 Assessment

# Rule 8 Assessment — Product Memory, Purchase-to-Selling Conversion & Receipt Recognition Workflow

**Governing chain:** `BDR-0012` (Approved) → `POL-0001`–`POL-0006` (Approved) → `product-unit-of-measure-reconciliation-amendment.md` (Accepted 2026-08-18) → `product-unit-of-measure-specification.md` (Accepted 2026-08-18); `BDR-0013` (Approved) → `POL-0007` (Approved) → `product-identity-alternative-name-specification.md` (Accepted 2026-08-19, implemented) → [`product-memory-purchase-selling-valuation-specification.md`](../specs/product-memory-purchase-selling-valuation-specification.md) (✅ **Accepted** — the "Consolidated Specification," below).

**Scope of this assessment:** the Consolidated Specification's §§8, 13, 14, 15, and 16 — the sections it marks `[ACCEPTED]` as newly-established business decisions carrying open technical questions into this Rule 8 stage. §§3–7, 9–12, 17–18, 20–24 restate already-implemented or already-accepted behavior and require no new technical assessment here beyond confirming they remain unaffected by what follows. **§19 (Initial Capital selling-basis display) is explicitly out of scope** — the Consolidated Specification itself marks it `[SEPARATE GOVERNANCE REQUIRED]` and states plainly that no Specification, Rule 8, or implementation work should proceed on it until a separate BDR/amendment authorizes it. This assessment does not touch it, resolve it, or assume any outcome for it.

**Lifecycle state:** Specification Accepted → Assessed → **Implementation Authorization Signed** (see [`product-memory-purchase-selling-valuation-implementation-authorization.md`](./product-memory-purchase-selling-valuation-implementation-authorization.md)). This document remains the governing Rule 8 Assessment for this work; it is filed here as final, not as a readiness opinion pending further review.

**Baseline verified fresh:** `main = origin/main = e6d16e3568f0ec140620b250fb192af8347b9a2d`, working tree clean, confirmed via `git fetch` immediately before this assessment began.

**Revision note:** This is the final, corrected revision. An earlier revision recommended storing the system-derived transaction valuation (§13 Concept C) in the existing `StockBatch.sellingPrice` field, disambiguated by a provenance tag. That recommendation was rejected on Product Architect review — a provenance flag does not resolve a field carrying two different meanings — and was withdrawn. Concept C has its own fully separate technical representation (`StockBatch.derivedSellingValuation`), and `StockBatch.sellingPrice` is confirmed unconditionally unchanged in meaning and usage. This revision is the one the signed Implementation Authorization relies on.

---

## 1. Objective

Determine whether the Consolidated Specification's newly-accepted requirements (§§8, 13–16) are technically safe and sufficiently bounded to proceed to the separate Implementation Authorization gate — validating feasibility, data-model impact, tenant isolation, historical-fact integrity, quebra compatibility, and failure behavior — without inventing new business requirements or silently resolving anything the Consolidated Specification itself left to this layer or to separate governance.

## 2. Governance Authority Consumed

- Consolidated Specification §5 (Purchase Facts — the four-fact boundary, purchase-unit-as-fixed rule).
- Consolidated Specification §8 (mandatory one-at-a-time unresolved-line resolution, before whole-receipt review).
- Consolidated Specification §13 (system-derived transaction valuation — Concepts A/B/C, exactly-one-selling-basis-per-line rule).
- Consolidated Specification §14 (frozen historical derived valuation — business requirement only, storage explicitly deferred here).
- Consolidated Specification §15 (quebra compatibility — rate-not-quantity business requirement, storage explicitly deferred here).
- Consolidated Specification §16–17 (count-specific mixed-unit/mixed-price-basis valuation, explicitly scoped away from purchase/receipt entry).
- `BDR-0012` Decisions 2–5, 15–16 (purchase facts never Product-Memory-derived; one authoritative Business Worth calculation; historical facts never silently rewritten).
- `POL-0001`/`POL-0002` (fractional handling, rounding — apply unchanged to any new derived figure).
- `platform-engineering-governance-standard.md` (Stage 7 process; Non-Negotiable Principles).

## 3. Fresh Code Evidence Gathered

Directly re-verified this session:

- **`apps/tenant/src/types.ts`** — `StockBatch`: exactly `id, productId, dateEntered, quantity, unit?, costPrice, sellingPrice, status, createdAt, purchaseBatchId?, restockObservation?`. **No field exists today for any derived/converted valuation figure.** `costPrice`/`sellingPrice` are documented "per unit," where "unit" is whatever the batch's own `unit` field says (`POL-0004`'s confirmed convention).
- **`Product`** — `costPrice?`/`sellingPrice?` are explicitly documented as **"REFERENCE price... NOT used by any Investment/Market/Profit calculation. Every calculation always reads price from the actual StockBatch it belongs to."** This is the pre-existing field the accepted UOM Specification's own §2 data model implicitly reuses as Product Memory's remembered selling price once `Product.unitRelationship.sellingUnit` gives it meaning (the UOM Specification's data model defines `unitRelationship.sellingUnit` but deliberately does **not** duplicate a second selling-price field inside it — confirming `Product.sellingPrice` is the intended carrier). `Product.unitRelationship` itself does not exist in code yet — the UOM Specification remains unimplemented.
- **`Product.supplierWordingRelationships`** (or equivalent — Checkpoint 1, commit `3df6276`) is a live precedent for "array on `Product`, owner-confirmed, additive, never replacing an existing primary field" — the same shape pattern this assessment's Finding 1 (below) draws on for an analogous decision.
- **`apps/tenant/src/utils/calculations.ts`** — `calculateBatch`: `investmentValue = remainingQuantity * batch.costPrice`; `marketValue = remainingQuantity * batch.sellingPrice`; `embeddedProfit = marketValue - investmentValue`; `remainingQuantity = batch.quantity - totalQuebraQuantity` (quebra summed from `Quebra.quantityLost`, filtered by `batchId`). **This formula is already rate-times-live-quantity in shape** — `batch.sellingPrice` is already a per-purchase-unit rate, and `remainingQuantity` is already quebra-reduced and purchase-unit-denominated, before any of this assessment's recommendations are applied.
- **`apps/tenant/src/utils/stockCount.ts`** — `normalizeStockCountItems` iterates its input `items` array and sums each row's own `quantity * costPrice` into `totalValue`, with **no product-level grouping, deduplication, or merging of rows sharing the same `productName`.** Two rows with identical `productName` but different `unit`/`costPrice` are processed as two fully independent contributions to the same `totalValue` sum.
- **`InitialStockDraftItem`/`PeriodicStockDraftItem`/`StockCountItem`** (`types.ts`) — each is a single flat row: `productName, quantity, unit?, costPrice, sellingPrice?`. No sub-portion/multi-basis structure exists, and **none is required** by the evidence above — see Finding 4.
- **`apps/tenant/src/components/AddStockView.tsx`** — existing prefill logic (lines ~180–215, ~490–530, ~670–730) copies `costPrice`/`sellingPrice` **verbatim** from the latest matching `StockBatch` or from `Product.costPrice`/`Product.sellingPrice`, with **no unit-aware conversion of any kind today** — confirming the accepted UOM Specification's own "not yet built" status (§2 of this Rule 8 Assessment's Consolidated Specification baseline) and giving a concrete, existing integration point for this assessment's Finding 2.
- **`04-smart-stock-entry-amendment.md`**'s existing "prefilled from history, not extracted from this document" visual-distinction requirement — an already-specified pattern this assessment reuses (Finding 2) rather than inventing a new one.
- **`firestore.rules`** (`products`, `stockBatches`/`purchaseBatches`, `stockCounts` blocks) — all already `businesses/{businessId}/...`-scoped; no new cross-tenant path is introduced by anything recommended below.
- **`10-initial-stock-valuation-history-amendment.md`** Part 2 — confirms, independently of this assessment, that `initialCapitalValue` is frozen at the Security Rules layer — direct precedent this assessment's Finding 3 draws on for how "freeze a historical figure" is already solved elsewhere in this codebase.

---

## 4. Findings

### Finding 1 — REVISED — Storage for the System-Derived Transaction Valuation (§13 Concept C) and Its Frozen Historical Form (§14)

**Severity:** MAJOR (Rule-8-resolvable; the Consolidated Specification explicitly delegates this decision here and explicitly rules out one candidate answer)

**Correction applied this revision:** the prior version of this Finding recommended writing Concept C into the existing `StockBatch.sellingPrice` field, disambiguated by a `sellingPriceSource` provenance tag. **This recommendation is withdrawn.** On further review, a provenance flag does not resolve the underlying semantic problem it was meant to solve: `sellingPrice` would still be one physical field carrying two different meanings depending on the flag's value — an owner-set, per-purchase-unit reference price in one case, and a Product-Memory-derived, cross-unit-converted figure in the other. Every piece of code, every report, and every future maintainer reading `batch.sellingPrice` would need to first check `sellingPriceSource` to know what the number *means* before using it — that is exactly the field-level conflation §13 exists to prohibit, a provenance tag notwithstanding. **`StockBatch.sellingPrice` must retain, unconditionally and without exception, exactly its current meaning: an owner-entered or owner-edited reference selling price, per the batch's own recorded unit, read by nothing but the existing `calculateBatch` formula.** This Finding is corrected accordingly.

**Revised architecture — Concept C as a fully separate, additive structure:**

A new, optional field is added to `StockBatch`, populated **only** when the batch's product has confirmed Product Memory at the moment the batch is recorded, and **never read, referenced, or consulted by `calculateBatch`, the Embedded Profit Engine, Business Worth, or any existing report**:

```
StockBatch.derivedSellingValuation?: {
  ratePerPurchaseUnit: number;        // MZN implied selling value per ONE unit of
                                       // this batch's own purchase unit — the frozen
                                       // rate itself (see below for why a rate, not
                                       // an absolute quantity)
  sellingUnit: string;                // Product Memory's selling unit AT THE TIME
                                       // of derivation — audit/display only
  sellingUnitPrice: number;           // Product Memory's remembered selling price
                                       // AT THE TIME of derivation, in sellingUnit's
                                       // own terms (e.g. 60, meaning "60 MZN/Un") —
                                       // audit/display only, preserved verbatim,
                                       // never itself recalculated
  unitRelationshipSnapshot: Array<{unit: string; factorFromPrevious: number}>;
                                       // frozen copy of the confirmed chain used for
                                       // this derivation — audit/display only
  derivedAt: string;                  // ISO timestamp
}
```

This satisfies every element of the correction requirement directly:

1. **Concept C has its own explicit technical representation**, entirely separate from purchase facts (`quantity`, `unit`, `costPrice` — untouched), Product Memory (`Product.unitRelationship`/`Product.sellingPrice` — untouched, never rewritten), and `StockBatch.sellingPrice` (untouched, unconditionally retains its current sole meaning).
2. **`StockBatch.sellingPrice`'s existing meaning is fully preserved** — no dual meaning, no provenance flag, no conditional interpretation required anywhere it is read.
3. **The structure contains what is technically necessary to:** represent the derived selling valuation for the transaction (`ratePerPurchaseUnit`); preserve the Product Memory inputs that produced it, for audit/display and to make the derivation traceable and explainable to the owner (`sellingUnit`, `sellingUnitPrice`, `unitRelationshipSnapshot`); remain historically frozen (once written, this entire object is governed by the same immutability discipline `costPrice` already has under `BDR-0012` Decisions 15–16 — never recalculated from current Product Memory at read/display/report time, exactly as §14 requires); and remain correct when a quebra reduces the live remaining quantity (Finding 3, revised below, since `ratePerPurchaseUnit` is a rate, not an absolute converted quantity).

**A new, separate, dedicated calculation function is introduced** — `calculateDerivedTransactionValuation(batch, quebras)` — distinct from and never invoked by `calculateBatch`:

```
remainingQuantity        = batch.quantity - totalQuebraQuantity   // reuses the
                                                                    // existing,
                                                                    // unmodified
                                                                    // groupQuebrasByBatch
                                                                    // logic — not
                                                                    // duplicated
derivedSellingValue       = remainingQuantity * batch.derivedSellingValuation.ratePerPurchaseUnit
derivedCost                = remainingQuantity * batch.costPrice   // reuses the
                                                                    // existing,
                                                                    // untouched
                                                                    // costPrice field
derivedEmbeddedProfit      = derivedSellingValue - derivedCost
```

**Scope boundary, stated explicitly to reconcile with `BDR-0012` Decision 4 ("one authoritative Business Worth calculation," no second competing calculation):** `calculateDerivedTransactionValuation`'s output is **never** written into, summed with, or otherwise merged into `calculateBatch`'s `marketValue`/`embeddedProfit`, the Embedded Profit Engine's estimated/finalized split (spec #6), Business Worth, or any Dashboard/Report KPI. It exists solely as a **transaction-scoped, informational figure**, computed for display on that specific purchase's own review screen and — where the Consolidated Specification's other sections call for it — wherever that specific transaction's own valuation is being examined. The existing, single, authoritative Embedded Profit/Business Worth calculation (`calculateBatch`, unmodified, still reading only `costPrice`/`sellingPrice`) remains the sole figure feeding Business Worth, Dashboard, and Closing, exactly as today. This is not a new business decision — the Consolidated Specification's own §24 ("Explicit Non-Goals") already states this figure "is never a claim that a sale occurred" and that "no second, independent Business Worth calculation is created" — this Finding only makes the technical mechanism by which that non-goal is honored explicit and concrete.

**Governance classification:** Fully Rule-8-resolvable. No Product Architect decision required — the Consolidated Specification already fixed the business requirements (§13's non-conflation rule, §14's freeze rule, §24's single-calculation non-goal); this Finding, as corrected, selects a technical shape that satisfies all three without qualification.

**Recommendation:** Add `StockBatch.derivedSellingValuation?` as specified above. Leave `StockBatch.sellingPrice`, `StockBatch.costPrice`, `calculateBatch`, and the Embedded Profit Engine completely unmodified. Introduce `calculateDerivedTransactionValuation` as a new, separate, additive function.

---

### Finding 2 — Computation Point and Multi-Hop Conversion (§13)

**Severity:** MINOR (Rule-8-resolvable; UI/timing detail, arithmetic itself already fully specified)

**Evidence:** `AddStockView.tsx`'s existing prefill logic is the natural integration point for Add Stock; Smart Stock Entry's review screen (server-mediated extraction, client-side review, per `04-smart-stock-entry-amendment.md`) is the natural point for that surface; Initial Stock's role is identity-establishment only and does not participate in this derivation for an *existing* product's Add Stock/Smart Stock Entry line (Consolidated Specification §16/§17's scope boundary; consistent with the corrected Finding 10 of the Supplier-Wording Rule 8 Assessment, which drew the identical Initial-Stock-vs-supplier-stock-entry line for a structurally similar reason).

**Technical assessment:** The multi-hop composition itself (`Cx → Emb → Un` and reverse) is pure arithmetic over `Product.unitRelationship.units[]`'s `factorFromPrevious` chain — no new data structure is needed beyond what the accepted UOM Specification's §2 already defines (once that Specification is itself implemented; see Finding 5). The derivation should run **once, at the moment the batch is about to be recorded** (client-side, immediately before submit, or server-side at commit for Smart Stock Entry) — not continuously/reactively — since a continuously-recomputing display risks visually suggesting a live, non-frozen figure, undermining §14's freeze requirement before the record is even written.

**Recommendation:** Compute Concept C once, at batch-commit time, on whichever side (client for Add Stock, server for Smart Stock Entry) already owns that commit today, writing the result into the new `StockBatch.derivedSellingValuation` structure (Finding 1, revised); display it on the review screen adjacent to, and visually distinguished from, purchase facts (A) and Product Memory (B), consistent with the existing prefill-distinction pattern. Exact component/function boundaries are an implementation-time detail, not fixed here.

---

### Finding 3 — REVISED — Quebra Compatibility Requires No Change to Existing Calculation Code (§15)

**Severity:** MINOR (confirms the revised Finding 1 architecture already satisfies the requirement; no design risk found)

**Evidence:** `groupQuebrasByBatch`/`totalQuebraQuantity` (`calculations.ts`) already computes a live, purchase-unit-denominated remaining quantity for any batch, independent of `calculateBatch` itself. Finding 1's new `calculateDerivedTransactionValuation` function reuses this same existing logic rather than duplicating it.

**Technical assessment:** Because `StockBatch.derivedSellingValuation.ratePerPurchaseUnit` (Finding 1, revised) is a **rate** — MZN implied selling value per one unit of the batch's own purchase unit — and not an absolute converted selling-unit quantity, `calculateDerivedTransactionValuation`'s `remainingQuantity * ratePerPurchaseUnit` computation automatically and correctly reflects any quebra recorded against that batch, at any point after the original transaction. The frozen rate never needs updating; only `remainingQuantity` — already live, already correctly maintained by existing, unmodified code — changes as quebras are recorded. **No change to `calculateBatch`, `groupQuebrasByBatch`, or any existing quebra-handling code is required or proposed.** This directly confirms the Consolidated Specification's own §15 business requirement is satisfiable under the revised Finding 1 architecture, and rules out the risk scenario (a frozen absolute selling-unit quantity going stale after a quebra) without introducing any new mechanism beyond the one new function Finding 1 already introduces.

**Governance classification:** Fully Rule-8-resolvable; no Product Architect decision required — this Finding is a verification, not a new design choice.

**Recommendation:** No change to `calculateBatch`, `groupQuebrasByBatch`, or any existing quebra-handling code. `calculateDerivedTransactionValuation` (Finding 1, revised) is the only new calculation logic, and it already satisfies this requirement by construction.

---

### Finding 4 — Mixed-Unit/Mixed-Price-Basis Stock-Count Valuation Requires No Schema Change (§16–17)

**Severity:** MINOR (Rule-8-resolvable; confirms existing data model already supports the accepted business requirement)

**Evidence:** `normalizeStockCountItems` (and the equivalent Initial Stock/Periodic Contagem draft-processing logic) already treats every row in its input array independently — summing each row's own `quantity * costPrice` into `totalValue` with no `productName`-based grouping, deduplication, or merge step of any kind.

**Technical assessment:** The Product Architect's worked example (Pretinha: `6 Cx @ 820 MZN/Cx` + `4 Cx valued at 50 MZN/Un`) is **already directly expressible** as two separate rows sharing the same `productName` (or, once the UOM Specification is implemented, the same `productId`) — each with its own `unit` and `costPrice`/`sellingPrice` — and the existing summation logic already combines their `totalValue` contributions correctly with zero code change. **No new field, sub-row structure, or "portions" array is required by anything the Consolidated Specification's §16–17 actually demands.** What is genuinely new, and does require implementation work, is presentation-layer only: the owner-facing UI must make clear that two rows sharing a product name are being treated as **portions of one physical count for that product**, not flagged as an accidental duplicate entry — a UI/interaction-design concern, not a data-model change. This is analogous to how `POL-0003`'s duplicate-product detection already exists as a *separate* concern from ordinary intentional multi-row entry, and this assessment does not conflate the two: duplicate-product detection (`POL-0003`) operates across different `Product` documents; this Finding concerns multiple rows *for the same already-identified product* within one count, which is a different situation entirely and must not trigger any duplicate-product warning.

**Governance classification:** Fully Rule-8-resolvable; no Product Architect decision required — the existing data model already accommodates the accepted business requirement.

**Recommendation:** No `StockCountItem`/`InitialStockDraftItem`/`PeriodicStockDraftItem` schema change. Implementation work is limited to: (a) UI grouping/labeling so multiple rows for one product read clearly as portions of one count, not as duplicates; (b) ensuring `POL-0003`-style duplicate-detection logic, if and when the UOM Specification's own catalog-matching work reaches Stock Count surfaces, is not triggered by this same-product, multi-row pattern.

---

### Finding 5 — Dependency on the UOM Specification's Own Unimplemented Data Model

**Severity:** MAJOR (blocking sequencing note, not a design risk)

**Evidence:** `Product.unitRelationship` does not exist in code today (§3, above; also confirmed independently by the Supplier-Wording Rule 8 Assessment's own fresh evidence). Every Finding above (1–4) assumes `Product.unitRelationship` and its `sellingUnit`/`Product.sellingPrice` pairing already exist and are populated.

**Technical assessment:** This assessment's Findings do not, and cannot, resolve the UOM Specification's own outstanding Rule 8 Assessment and Implementation Authorization — that remains a separate, prior gate in the same governance sequence (`BDR-0012` §9). **Implementation of anything in the Consolidated Specification's §§13–17 is technically blocked on the UOM Specification's own data model existing in code first** — `Product.unitRelationship` must be built (its own Rule 8/Implementation Authorization) before a batch's derivation (Finding 1–2) has anything to read from.

**Governance classification:** Not a Product Architect decision — a sequencing dependency already implied by the two lineages' own chronology, stated explicitly here so it is not silently assumed away.

**Recommendation:** Any Implementation Authorization arising from this assessment must be explicitly sequenced **after** (or bundled with, as a combined authorization covering both) the UOM Specification's own Rule 8 Assessment and Implementation Authorization — the two cannot be implemented independently in either order and still function, since §§13–17 of the Consolidated Specification are additive on top of the UOM Specification's data model, not a substitute for it.

---

### Finding 6 — Sequencing Mechanism for §8 (One-at-a-Time Unresolved-Line Resolution)

**Severity:** MINOR (Rule-8-resolvable; UI-architecture detail)

**Evidence:** The Supplier-Wording capability's existing candidate-confirmation UI (Add Stock/Smart Stock Entry, Checkpoints 2–4) already implements a per-line confirmation interaction; no existing surface currently sequences *across* lines (i.e., forces resolution of line 1 before line 2 becomes visible).

**Technical assessment:** This is a new, client-side-only sequencing/queue-state requirement layered on top of the already-implemented per-line confirmation mechanism — it does not require any change to the confirmed-relationship storage, matching logic, or conflict-handling logic already shipped for supplier wording (§6/§9 of the Consolidated Specification, unaffected). A straightforward implementation classifies receipt lines into "resolved" / "unresolved" at extraction time, presents unresolved lines one at a time (reusing the existing per-line confirmation UI unchanged), and only renders the full-receipt review screen (§11) once the unresolved set is empty.

**Governance classification:** Fully Rule-8-resolvable; no Product Architect decision required.

**Recommendation:** Implement as client-side queue/step state around the existing, unmodified per-line confirmation component; no schema change; no change to already-implemented supplier-wording matching/conflict logic.

---

### Finding 7 — Tenant Isolation

**Severity:** PASS

**Evidence:** The new field this assessment recommends (Finding 1, revised: `StockBatch.derivedSellingValuation`) lives on the existing `StockBatch` document, already scoped under `businesses/{businessId}/...`. No new top-level collection, cross-tenant reference, or Security Rules change is required.

**Recommendation:** No `firestore.rules` change required for anything in this assessment's scope.

---

### Finding 8 — REVISED — Backward Compatibility and Failure Modes

**Severity:** PASS

| Scenario | Behavior |
|---|---|
| Product has no confirmed Product Memory (today's status quo for every product) | `StockBatch.derivedSellingValuation` is simply absent; §13's derivation never fires; owner enters `costPrice`/`sellingPrice` manually, exactly as today — both fields fully unaffected, always. |
| Product Memory changes after a batch was already recorded | Finding 1's freeze (immutability discipline identical to `costPrice`) applies — the already-recorded batch's `derivedSellingValuation` object does not change, in whole or in part. |
| Owner corrects the purchase unit before the batch is actually committed (extraction mistake, §5) | Since `derivedSellingValuation` is only written at the moment of commit (Finding 2), a pre-commit correction simply changes what gets derived and frozen at that later moment — nothing is frozen prematurely. |
| Owner wants to override `costPrice`/`sellingPrice` for this transaction | Fully unaffected — ordinary, already-existing prefill-but-editable behavior (`POL-0006`) for those two fields continues exactly as today; `derivedSellingValuation` is a separate, system-only, non-editable figure that coexists alongside, never overwritten by or overwriting, any manual `costPrice`/`sellingPrice` entry. |
| Quebra reduces remaining quantity after the batch is recorded | No change needed — Finding 3, revised. |
| Same product entered as multiple rows in one Stock Count with different units/prices | Already supported — Finding 4. |
| Derivation service/logic unavailable at entry time | Falls back to today's manual entry — mirrors the UOM Specification's own existing Recognition-unavailable fallback pattern; `derivedSellingValuation` is simply left absent for that batch; no partial/implicit derivation is ever saved. |

---

## 5. Summary Table

| Finding | Topic | Severity | Governance Classification | Verdict |
|---|---|---|---|---|
| 1 | Concept C storage / §14 freezing | MAJOR | Fully Rule-8-resolvable | Resolved this document |
| 2 | Computation point / multi-hop arithmetic | MINOR | Fully Rule-8-resolvable | Resolved this document |
| 3 | Quebra compatibility | MINOR | Verification only | PASS — no change needed |
| 4 | Mixed-unit/mixed-price count valuation | MINOR | Fully Rule-8-resolvable | PASS — no schema change needed |
| 5 | Dependency on unimplemented UOM data model | MAJOR (sequencing) | Not a PA decision | Blocking sequencing note |
| 6 | §8 one-at-a-time sequencing | MINOR | Fully Rule-8-resolvable | Resolved this document |
| 7 | Tenant isolation | — | — | PASS |
| 8 | Backward compatibility / failure modes | — | — | PASS |

---

## 6. Overall Verdict

**The architecture is feasible and every finding is resolvable within Rule 8's own authority.** No finding in this assessment requires a new Product Architect business decision — the Consolidated Specification's §§8, 13–16 already fixed every business-level question this assessment needed; this document only selects among already-conforming technical shapes (Findings 1, 2, 6) or confirms existing architecture already satisfies an accepted requirement (Findings 3, 4). **The one item requiring explicit handling before implementation is not a design risk but a sequencing dependency (Finding 5):** this capability is additive on top of the UOM Specification's own data model, which is not yet implemented, and the two cannot be sequenced independently.

**§19 (Initial Capital selling-basis display) remains untouched, unresolved, and out of scope, exactly as the Consolidated Specification itself requires.** Nothing in this assessment should be read as authorizing, designing toward, or assuming any outcome for it.

## 7. Recommendation

This Rule 8 Assessment recommends proceeding to Implementation Authorization, **explicitly scoped and sequenced as follows**:

1. Implementation Authorization must cover, as one coordinated program (per Finding 5), both (a) the UOM Specification's own already-accepted-but-unimplemented data model (`Product.unitRelationship`) and Recognition flow, and (b) this assessment's Findings 1–2, 6 (derivation, freezing, and sequencing) — **or** must explicitly authorize (a) first, as a self-contained increment, with (b) as a clearly labeled follow-on increment blocked on (a)'s completion. Either sequencing is technically sound; an Implementation Authorization that authorizes (b) alone, without (a), would authorize something not yet buildable.
2. §19 is not, and must not be treated as, in scope for any Implementation Authorization arising from this assessment.
3. No code is written, and no schema/`firestore.rules` change is made, as a result of this document. Implementation Authorization remains a separate, required, explicit gate.

---

**This document does not itself authorize implementation.** It is a readiness opinion only, per `platform-engineering-governance-standard.md` §3.
