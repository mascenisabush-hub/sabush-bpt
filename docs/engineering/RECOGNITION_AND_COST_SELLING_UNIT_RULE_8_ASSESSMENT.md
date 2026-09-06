# Rule 8 Assessment — Product Recognition + Cost/Selling Unit Architecture

**GOVERNANCE GATE: RULE 8 ASSESSMENT**

**IMPLEMENTATION: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**
**CODE CHANGES: NOT PERFORMED**
**SPECIFICATION AMENDMENT: NOT PERFORMED — needs identified below only**
**COMMIT/PUSH: NOT PERFORMED**

This is an assessment only. It reaches a verdict and identifies what
must be resolved before implementation; it does not implement, amend a
specification, or authorize anything.

---

## 1. Scope and Governing Decisions

This Rule 8 Assessment evaluates the two decisions accepted in
[`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md):

- **Decision A** — unresolved product identity must not silently create
  a new Product; the owner retains explicit Existing Product / New
  Product resolution authority; resolving to an Existing Product
  retrieves canonical Product Memory (`sellingPrice`, `sellingUnit`,
  `unitRelationship`).
- **Decision B, Option B2** — purchase/cost unit and selling unit are
  distinct **transaction** concepts; the transaction architecture must
  explicitly preserve purchase/cost unit, selling unit, the conversion
  relationship between them, and the applicable price basis for each
  unit.

Both decisions trace back through
[`product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md)
to
[`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md).

## 2. Evidence Reviewed

**Governance artifacts (read this session):**
`docs/specs/BDR-0012-product-unit-of-measure-product-memory.md`,
`docs/specs/product-unit-of-measure-specification.md`,
`docs/specs/product-unit-of-measure-discovery.md`,
`docs/specs/product-unit-of-measure-reconciliation-amendment.md`,
`docs/specs/POL-0006-temporary-product-memory-override.md`,
`docs/specs/product-memory-purchase-selling-valuation-specification.md`
(the "Consolidated Specification," full text),
`docs/engineering/product-memory-purchase-selling-valuation-rule8-assessment.md`,
`docs/engineering/product-memory-purchase-selling-valuation-implementation-authorization.md`,
`docs/engineering/product-identity-alternative-name-rule8-assessment.md`
(Finding 10 and its correction), the Decision Proposal, and the
Product Architect Acceptance record.

**Code (read or re-confirmed this session, not merely assumed from the
prior investigation):** `apps/tenant/src/types.ts` (`Product`,
`UnitRelationship`, `StockBatch` interfaces), `apps/tenant/src/utils/calculations.ts`
(`calculateBatch`), `apps/tenant/src/context/AppContext.tsx` (product
collection paths, confirming every product read/write is scoped to
`businesses/{businessId}/products` with no cross-business query
anywhere in the file).

**This follow-up does not re-litigate** the prior investigation's own
already-verified code findings (recognition mechanisms, Concept C
reachability, entry-path behavior) — those are treated as established
evidence per this task's own instruction, and re-confirmed spot-checks
above found nothing contradicting them. Governance-artifact evidence
(the specs, BDRs, and signed authorizations above) is new to this
assessment and is the primary addition.

---

## 3. Decision A — Rule 8 Assessment

### A1. Current Product identity authority

**What currently establishes Product identity, per path:**

| Path | Authoritative mechanism |
|---|---|
| Manual Add Stock, Smart Stock Entry, Contagem — automatic match | `Product.id`, resolved via case-insensitive equality on `Product.name` |
| Add Stock / Smart Stock Entry — Supplier-Wording reuse | `Product.id`, resolved via a confirmed `(supplierRecordId, wording)` entry in `Product.supplierWordings[]` |
| Add Stock / Smart Stock Entry — owner-confirmed candidate | `Product.id`, selected by the owner from a suggestion list; identity itself is still `Product.id`, only the path to it differs |
| Contagem | `Product.id` (by exact name only) or, once a row is already resolved in the current session, `Product.id` directly |

**`Product.id` is the single authoritative identity value across every
path** — every recognition mechanism differs only in *how* it arrives
at a `Product.id`, never in what identity itself means. This is
unchanged by Decision A, which is a recognition-authority decision
("must the owner confirm identity when uncertain"), not an
identity-representation decision.

### A2. Existing Product resolution

**Yes — the existing data model already fully supports this.** No new
relationship needs to be invented: `StockBatch.productId`,
`StockCountItem.productId`, and every other transaction-side reference
already point at `Product.id` by design (`types.ts`). An owner
explicitly picking an existing product from a resolution UI produces
exactly the same `Product.id` reference an automatic exact match would
have produced — this is evidenced today by the Supplier-Wording
candidate-confirmation path (`handleConfirmSupplierWordingCandidate`),
which already does precisely this for its own scope. Decision A's
"owner resolution" step is a **UI/workflow gap, not a data-model gap.**

### A3. Product Memory retrieval

**Yes, without a second source of truth — this is not new
mechanism, it is the existing mechanism, applied earlier.**
`findLatestRememberedProductMemory` / `buildProductMemoryAutofill`
already retrieve `sellingPrice`/`sellingUnit`/`unitRelationship` purely
from whichever `productId` is supplied to them — they carry no
awareness of *how* that `productId` was resolved (exact match, reuse,
or owner-confirmed candidate). Wiring Decision A's owner-resolution
step to call this same function with the owner's chosen `productId` is
architecturally identical to what the `'reused'` outcome already does
today (`AddStockView.tsx`'s `applySupplierWordingCheck`,
`case 'reused'`). **No second, competing memory-retrieval path is
required or implied.**

### A4. New Product creation — preserving "recognition failed" vs "confirmed new"

**This is the one genuine functional gap Decision A introduces**,
confirmed directly against the evidence follow-up (Part B.5): today,
`addMultipleStockBatches`/`addStockBatch`/`recordStockCount` all decide
"new product" by the **same test** used to decide "no match" —
`!products.find(...)`. There is no independent signal recording
"the owner was asked and explicitly said new" versus "no one was ever
asked." Enforcing Decision A requires introducing exactly that signal
— at minimum, a boolean/flag on the outgoing item (mirroring the
existing `pendingSupplierWording`/`supplierWordingConflictPending`
pattern already used for the analogous supplier-wording conflict case)
so the finalization code can distinguish "no candidate ever existed to
resolve" from "a candidate existed and the owner explicitly rejected
it in favor of a genuinely new product." **This is an architecturally
small, additive change, closely following an existing pattern in the
same file** — it is not a data-model change, but it is a genuine,
not-yet-existing behavior.

### A5. Duplicate prevention — new risks Decision A introduces

Considered per the task's own list:

- **Concurrent entry:** no new risk beyond what already exists —
  `Product` creation is not currently transaction-protected against a
  duplicate name (confirmed: `addMultipleStockBatches`'s product-creation
  branch is a plain `fsBatch.set`, not inside a `runTransaction`, unlike
  the batch-lock mechanism `addStockBatch` uses for open-batch
  supersession). Decision A does not fix or worsen this — it is an
  existing, orthogonal gap the evidence follow-up did not surface and
  this Rule 8 does not resolve. **Flagged as a pre-existing condition,
  not a Decision-A-introduced risk.**
- **Repeated imports / Smart Entry:** Decision A reduces this risk (it
  is the risk Decision A exists to close) — no new risk identified.
- **Manual Entry:** same — risk reduction, not introduction.
- **Contagem:** see A6 below — the more significant open question.
- **Supplier wording / similarity / ambiguous candidates:** Decision A6
  (below) requires the owner to disambiguate when multiple candidates
  exist; the existing `SupplierWordingCandidate[]`/`findSimilarProducts`
  shapes already return arrays, so "multiple plausible candidates" is
  already a representable state — no new data shape is required, only
  a UI/workflow requirement to actually block on it (which
  `supplierWordingCandidates.length > 0` already partially does at
  Add Stock finalization, per the evidence follow-up's Part B.5 — this
  existing check would need to become the norm across every path
  Decision A A3 names, not remain unique to Add Stock).

### A6. Contagem compatibility

**This is the assessment's most significant finding for Decision A.**

The Consolidated Specification (`product-memory-purchase-selling-valuation-specification.md`
§6) explicitly, and recently, records a **signed, corrected governance
decision** on this exact boundary:

> "**Trigger surfaces: Add Stock and Smart Stock Entry only.** Initial
> Stock establishes `Product.name` (the primary/reference identity) but
> captures no supplier wording and runs no candidate-detection UI
> (Rule 8 Finding 10, corrected)."

This is quoted from a section marked `[IMPLEMENTED]` in an **Accepted**
Specification with a **signed** Implementation Authorization — it is
not a stale draft. The underlying Rule 8 Finding (`product-identity-alternative-name-rule8-assessment.md`,
Finding 10, "corrected") explains this is deliberate: **Initial Stock
has no supplier concept**, so supplier-wording candidate detection is
architecturally inapplicable there, not merely unbuilt.

**Is this a hard conflict with Decision A?** No — narrowly. Finding 10's
scope is specifically *supplier-wording* recognition, which is
supplier-scoped by construction. Decision A's principle does not
require supplier-wording recognition specifically in Contagem; it
requires *some* existing/new resolution mechanism there. `findSimilarProducts`
(Product Name Similarity) is catalog-wide and carries no supplier
dependency — it is not currently wired into Contagem (confirmed,
evidence follow-up Part B.1/B.6), but nothing in Finding 10 or §6
prohibits wiring it there; Finding 10 only ever addressed
*supplier*-wording.

**However, this is a genuine, currently-uncovered gap, not a solved
problem:** no accepted specification anywhere in this repository
establishes that Contagem should gain *any* candidate/similarity
mechanism. Decision A's A3 ("apply to Contagem") is therefore **new
territory** relative to existing governance — not a reversal of
Finding 10, but not something Finding 10 or any other accepted artifact
already authorizes either. **Classification: NOT COVERED by existing
governance — requires new specification work, not a conflict
resolution.** (See §14, Specification Conformance, below, and §18 for
the additional decision this implies.)

### A7. Governance conflict check

| Artifact | Rule/decision | Relationship to Decision A |
|---|---|---|
| `BDR-0012` Decisions 10–12 | "May suggest a possible match... may never silently decide product identity"; "while a flagged possible-duplicate match is unresolved, neither outcome may proceed silently" | **Consistent, narrower predecessor.** BDR-0012 already establishes this exact principle for the case where a similarity signal *has* fired. Decision A extends it to also cover the case where *no* signal fires at all (a plain, below-threshold miss) — this is an extension in scope, not a contradiction, since BDR-0012 never claimed to be exhaustive of every non-match scenario. |
| `product-memory-purchase-selling-valuation-specification.md` §6, Rule 8 Finding 10 (corrected) | Supplier-wording candidate detection is Add-Stock/Smart-Stock-Entry-only, deliberately excluding Initial Stock | **No direct conflict** (A6, above) — Decision A does not require *this* mechanism to extend to Contagem, only *some* mechanism. Requires new specification work to name which. |
| `product-memory-purchase-selling-valuation-implementation-authorization.md` §1, Increment B §8 | "Unresolved products must be surfaced and resolved before the owner is presented with the full receipt for final review... processed one at a time" | **Directly relevant precedent, not yet confirmed built.** This signed authorization already establishes a one-at-a-time resolution *sequencing* requirement for Add Stock/Smart Stock Entry unresolved supplier-wording lines — extremely close in spirit to Decision A's own conceptual diagram. Whether this specific sequencing is actually implemented in code was outside the evidence follow-up's own traced call paths (it audited the *existence* of the blocking check at submit time, not a per-line sequential UI) and is **NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE without a dedicated re-inspection of `AddStockView.tsx`'s render-ordering logic**, which this Rule 8 did not perform in full. Flagged as a verification gap, not a conflict. |
| `BDR-0013`/`POL-0007` | Supplier-Wording Recognition's own conflict-handling rule (mandatory distinguishing information before a conflicting new product completes) | **Consistent, complementary** — this is exactly the kind of "explicit owner control when identity is uncertain" Decision A's A6 generalizes; no conflict. |

**No CONFLICTING classification found for Decision A.** The one
NOT COVERED item (Contagem's own resolution mechanism) is a governance
gap requiring new specification work, not a reversal of any existing
decision.

---

## 4. Decision B2 — Rule 8 Assessment

**This is the assessment's central finding, and it is a genuine,
named conflict — not a gap.**

### The already-accepted, already-signed model this conflicts with

The Consolidated Specification (Accepted) and its signed Implementation
Authorization together establish, as already-decided governance — not
as a proposal being newly evaluated — the following model for exactly
the question B2 addresses:

1. **§12 [ESTABLISHED]:** "Purchase unit and selling unit... remain,
   and must remain, distinct concepts throughout every surface" — this
   much B2 and the existing governance **agree on completely.**
2. **§4 [ESTABLISHED]:** selling unit and selling price are **Product
   Memory** — i.e. **product-level**, singular, confirmed-once,
   reused-automatically knowledge — "Exactly **one** confirmed
   selling/valuation unit... Not multiple, not per-supplier, not
   per-count."
3. **§5 [ESTABLISHED]:** a purchase/receipt line carries **exactly
   four purchase facts** (quantity, purchase unit, cost, cost unit) —
   "supplied by the receipt... and by nothing else." Selling
   information is explicitly *not* one of the four facts a transaction
   itself carries.
4. **§13 [ACCEPTED]:** "Exactly one selling basis per
   purchase/receipt line — no mixed bases at purchase entry... A given
   product's purchase/receipt line is valued... using exactly **one**
   selling basis: the product's confirmed Product Memory selling unit
   and remembered selling price."
5. **Implementation Authorization §2 [signed, binding]:**
   "**Multiple selling units, or multiple/mixed valuation price bases
   for the same product, on any purchase/receipt-entry surface (Add
   Stock, Smart Stock Entry)**... is not, under any interpretation,
   authorized for purchase/receipt entry."

**B2, read literally** — "the transaction architecture must explicitly
preserve... selling unit... [and] the applicable price basis for
[the selling] unit" as a property of the **transaction** — describes
exactly the thing item 5 above says is "not, under any interpretation,
authorized." If "the transaction" in B2 means `StockBatch` gaining its
own independent, per-transaction `sellingUnit`/`sellingPrice` fields
(populated at entry time, alongside `unit`/`costPrice`), this
**directly reopens an already-signed Implementation Authorization**
and **directly narrows an already-Accepted Specification's §4/§13
"Product Memory, not per-transaction" framing** — neither of which
this Rule 8 Assessment, nor the Decision Proposal that led here, is
authorized to silently override (per the Decision Proposal's own §8
non-decisions: "changing Concept C," and BDR-0012's own §8 requirement
that reconciling an existing decision "requires formal, explicit
amendment... as a separate, subsequent action").

**A materially different, and fully compatible, reading of B2 exists.**
Concept C's already-implemented, already-signed
`StockBatchDerivedSellingValuation` snapshot (§13–14) **already, today,
for the subset of batches where it fires, stores exactly the four
things B2 lists** — purchase unit (implicitly, via `batch.unit`),
selling unit (`derivedSellingValuation.sellingUnit`), the conversion
relationship (`derivedSellingValuation.unitRelationshipSnapshot`), and
the applicable price basis for the selling unit
(`derivedSellingValuation.sellingUnitPrice`, alongside the batch's own
`costPrice` for the purchase-side basis) — as a **frozen, derived,
audit-scoped record of the transaction**, not as independently-entered,
competing input fields. Under this reading, **B2 does not require any
new field or schema change at all** — it requires only that Concept C's
existing write path be extended to reach every entry path (Part A.4/A.5
of the evidence follow-up: today it fires only in
`addMultipleStockBatches`), and, separately, a decision on whether its
read side should become operational (§9, below) — neither of which
requires reopening the already-signed authorization's "single selling
basis at entry" rule, because nothing about that reading asks the
**transaction's own entered facts** to carry a second selling unit —
only its **derived record** does, which is exactly what was already
authorized.

**These two readings are not reconcilable by this Rule 8 Assessment.**
They lead to materially different implementation scopes (a schema
change to `StockBatch` reopening a signed authorization, versus an
extension of an already-signed mechanism's *reach* with no schema
change at all). **This is the single most significant open item this
assessment surfaces — see §18, Required New Decisions.**

### B2.1 — Can the current Product model represent the canonical selling unit and conversion relationship?

**Yes, already, unconditionally.** `Product.unitRelationship: UnitRelationship`
(`types.ts:439`, referencing `UnitRelationship` at `types.ts:399-403`)
already carries `units[]` (the ordered chain) and `sellingUnit`
(required to be a member of `units[]`, per `POL-0005`, enforced by
`isValidUnitRelationship`). Nothing about B2 requires a Product-level
schema change.

### B2.2 — Can the current StockBatch represent purchase/cost unit AND selling unit simultaneously?

**Not as two independent, directly-entered fields — this is exactly
the fork identified above.** `StockBatch` (`types.ts:233-260`) has
exactly one `unit` field, used for the purchase/cost side, plus
`sellingPrice: number` (an ordinary per-that-same-unit price, per
`calculateBatch`'s own usage — see §7 below), plus the **optional**
`derivedSellingValuation?: StockBatchDerivedSellingValuation` which
*does* carry a `sellingUnit` string — but only as a frozen, derived,
conditionally-present audit field, not as a first-class, always-present
transaction attribute equal in status to `unit`.

### B2.3 — Can both price bases be represented without ambiguity?

**Today: only for the subset of batches where Concept C fires**
(existing product, valid Product Memory, multi-item Add Stock —
evidence follow-up Part A.6). For every other batch (a product's first
batch, single-item Add Stock, any Contagem entry), only one price basis
(the purchase-side `costPrice`/`sellingPrice` pair, both in the batch's
own `unit`) exists at all — there is no ambiguity because there is
simply no second basis present, not because the single basis present
is unambiguous relative to a genuinely different selling unit.

### B2.4 — What would implementing B2 require?

Depends entirely on which reading (above) governs:

- **Reading 1 (new transaction-level fields):** new fields on
  `StockBatch` (and, for parity, `StockCountItem`) for an
  independently-entered selling unit/price; **changed** meaning or
  additional fields on the entry-time UI across every path; a decision
  on whether these new fields participate in `calculateBatch` (a
  Business Worth Engine change — see §10 below); **compatibility
  handling** for every historical `StockBatch`/`StockCountItem` that
  has no such fields; **no migration is strictly required** if the new
  fields are optional and historical records are read as
  "selling unit/basis unknown, fall back to today's single-basis
  behavior" — but this is an implementation choice, not yet decided.
- **Reading 2 (extend Concept C's reach only):** **no new field** —
  `buildDerivedSellingValuationSnapshot` already exists and is already
  signed off; the only required change is calling it from
  `addStockBatch` and `recordStockCount` as well (mirroring its
  existing call site in `addMultipleStockBatches`), which the evidence
  follow-up's Part A.1 already confirms is architecturally
  straightforward (same function, same conditions, different call
  site) — no embedded object, no new document, no migration, no
  backfill.

**Both readings agree: no destructive migration is required either
way** — every field involved (`derivedSellingValuation` today; any
hypothetical new field under Reading 1) is optional and additive,
consistent with this codebase's established backward-compatibility
pattern (confirmed directly: `StockBatch.derivedSellingValuation?`,
`Product.unitRelationship?` are both already optional).

### B2.5 — Do existing historical StockBatch records remain interpretable under B2?

**Yes, under either reading.** A historical batch with no
`derivedSellingValuation` and (under Reading 1) no new selling-unit
field is read exactly as it is today — `unit`/`costPrice`/`sellingPrice`
mean exactly what they already mean, per `calculateBatch`'s own
unchanged logic. Nothing in B2, under either reading, requires
reinterpreting a historical record's existing fields.

### B2.6 — Can old records coexist with new B2 records?

**Yes.** Confirmed by the `derivedSellingValuation?` field's own
existing coexistence today: some `StockBatch` documents already have
it, some don't (evidence follow-up A.2), and `calculateBatch` treats
both identically (it never reads that field at all — confirmed,
evidence follow-up A.3). The same coexistence pattern extends cleanly
to either B2 reading.

### B2.7 — Do existing fields already partially represent B2? Would using them create competing sources of truth?

**Yes to both, and this is the crux of the Reading-1-vs-Reading-2
fork above.** `StockBatch.sellingPrice` already exists and is already
consumed by `calculateBatch` — but it means "an ordinary, owner-entered
selling price **in the batch's own purchase unit**" (confirmed,
`product-memory-purchase-selling-valuation-specification.md`'s own
Repository Baseline: "`StockBatch.costPrice` and `StockBatch.sellingPrice`
are both already 'per unit' fields, where 'unit' is whatever string is
recorded in that batch's own `unit` field"). **§14 of the already-
Accepted Specification explicitly rules out reusing this same field
for a cross-unit-converted figure**, precisely because doing so "would
risk exactly the confusion §13 now explicitly rules out." **This
already-decided reasoning applies with equal force to any literal
Reading-1 implementation of B2** that attempted to reuse
`StockBatch.sellingPrice` for a second, differently-denominated selling
figure — it would create the exact competing-source-of-truth risk this
codebase's own governance history already identified and closed off.
A genuinely new, separate field would be required under Reading 1; it
could not reuse `sellingPrice`.

---

## 5. Data-Model Compatibility (Summary)

| Question | Answer |
|---|---|
| Does `Product` need a schema change? | **No** — `unitRelationship`/`sellingUnit` already exist and already satisfy B2's "canonical selling unit + conversion relationship" requirement at the product level. |
| Does `StockBatch` need a schema change? | **Depends on which B2 reading governs** (§4, above) — no change under Reading 2; a new field under Reading 1. |
| Is migration required? | **No, under either reading** — every relevant field, existing or hypothetical, is additive/optional. |
| Can old and new records coexist? | **Yes**, confirmed by the existing `derivedSellingValuation?` precedent. |
| Do existing fields already partially satisfy B2? | **Yes** — Concept C's snapshot, for the subset of batches where it fires. |
| Would using an existing field for B2's "applicable price basis" create a competing source of truth? | **Yes, specifically `StockBatch.sellingPrice`** — already explicitly ruled out by the Accepted Specification's own §14 reasoning, which pre-dates and directly bears on this question. |

---

## 6. Unit/Price Semantic Map

| FIELD / CONCEPT | CURRENT MEANING | CURRENT UNIT BASIS | SOURCE OF TRUTH | CURRENT CONSUMERS | B2 COMPATIBILITY |
|---|---|---|---|---|---|
| `StockBatch.unit` | The unit this specific batch was purchased/counted in | Itself (a free string, e.g. `Cx`, `Un`) | The batch document itself, entered at the time of purchase | `calculateBatch` (implicitly, as the denominator both `costPrice`/`sellingPrice` are "per"); `buildDerivedSellingValuationSnapshot`'s `purchaseUnit` input | Directly satisfies B2's "purchase/cost unit" requirement, unchanged either way |
| `StockBatch.costPrice` | Cost per one unit of `StockBatch.unit` | Same as `StockBatch.unit` | The batch document, entered at purchase time (`POL-0004`) | `calculateBatch.investmentValue` | Satisfies B2's "applicable price basis" for the purchase side, unchanged |
| `StockBatch.sellingPrice` | An ordinary, owner-entered selling price **per one unit of `StockBatch.unit`** — NOT Product Memory's remembered selling price, and NOT denominated in `Product.unitRelationship.sellingUnit` unless the two units happen to coincide | Same as `StockBatch.unit` | The batch document, entered/prefilled at purchase time | `calculateBatch.marketValue` (feeds Business Worth) | **Explicitly excluded, by the already-Accepted Specification §14, from ever being repurposed to hold a cross-unit-converted figure.** Any B2 implementation must not write a differently-denominated value here. |
| `Product.sellingPrice` | A catalog-level "reference price only" (per its own code comment) | Ambiguous/unit-unaware at this field alone — the comment does not tie it to a specific unit independent of `Product.unitRelationship.sellingUnit` | `Product` document | `findLatestRememberedProductMemory` (as one candidate source, alongside batch/count history) | Pre-existing; not itself a B2 concern, but its exact relationship to `Product.unitRelationship.sellingUnit` when both are present is **NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE within this assessment's scope** — flagged, not resolved. |
| `Product.unitRelationship.sellingUnit` | The single confirmed unit this product's remembered selling price is denominated in | Itself (one of `unitRelationship.units[].unit`) | `Product` document, owner-confirmed once, reused automatically (`BDR-0012` Decision 13) | `buildDerivedSellingValuationSnapshot`, `findLatestRememberedProductMemory`'s tie-break, `resolveUnitAwarePrice` | This **is** B2's "selling unit," already represented — at the product level, not the transaction level (the exact fork in §4, above) |
| `StockBatch.derivedSellingValuation.sellingUnit`/`.sellingUnitPrice` | A **frozen, point-in-time copy** of `Product.unitRelationship.sellingUnit`/`Product.sellingPrice`, as they stood at this batch's own commit — audit/display only, "never re-read from current Product Memory after this write" (own code comment) | The value copied is itself denominated in whatever `Product.unitRelationship.sellingUnit` was at that moment | The `StockBatch` document, written once, never updated | Nothing today (evidence follow-up A.3 — no consumer exists) | This **is** exactly what B2, under Reading 2, would rely on |
| `StockBatchDerivedSellingValuation.ratePerPurchaseUnit` (Concept C's core figure) | The frozen, implied selling value of ONE unit of `StockBatch.unit`, computed once at commit time via the confirmed relationship | Rate is `sellingUnitPrice`-per-`StockBatch.unit` — a cross-unit rate, not itself expressed in either unit alone | The `StockBatch` document | `calculateDerivedTransactionValuation` (itself unconsumed — evidence follow-up A.3) | Directly satisfies B2's "conversion relationship" + "applicable price basis" requirement, if Reading 2 governs |
| `StockCountItem.sellingPrice`/`.sellingPriceBasisUnit` | The expected selling price per unit at the time of a Contagem count, and the unit that price is actually denominated in (may differ from the row's own physical counting `unit`) | `sellingPriceBasisUnit ?? unit` | The `StockCount` document | Display/audit only per its own code comment — "does NOT feed Expected Current Stock Value or the Investment Value calculation" | Interesting existing precedent for "distinct price basis from physical unit," but confined to Contagem and explicitly non-authoritative for valuation — its relationship to a possible future B2 implementation is **NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE** without a dedicated design exercise, not performed here |
| Concept C generally | See evidence follow-up Part A | See above | See above | See above | See §7, immediately below |

---

## 7. Concept C Assessment

**C1. Does Concept C already satisfy any part of B2?**
Yes — for the subset of batches where it fires (existing product, one
of three entry paths), it already stores all four things B2 asks for
(§4/§6, above), as a frozen snapshot.

**C2. Does Concept C conflict with B2?**
No — under either reading. Under Reading 2, it *is* the mechanism.
Under Reading 1 (new independent fields), Concept C is simply a
separate, already-existing, already-authorized capability that would
continue to coexist unchanged — nothing about adding new
independently-entered fields requires removing or altering Concept C.

**C3. Could Concept C remain an audit/frozen derived snapshot under
B2?**
Yes, under either reading — nothing in B2's own wording requires
Concept C specifically to become operational; B2 is a data-preservation
requirement, not a consumption requirement.

**C4. Would B2 require Concept C to change?**
Under Reading 2: yes, its *reach* would need to extend to the two
currently-unreached entry paths (single-item Add Stock, Contagem) —
confirmed architecturally straightforward per §4/B2.4, above, since the
same pure function already exists and is already signed off; only new
call sites are needed, not new logic. Under Reading 1: no change to
Concept C itself is required at all.

**C5. Would making Concept C operational (i.e., actually consumed
somewhere) create a second source of truth?**
**Yes, specifically if it were wired into `calculateBatch`/Business
Worth** — this is exactly what the signed Implementation Authorization
already explicitly forbids ("Concept C is never read by `calculateBatch`,
the Embedded Profit Engine, Business Worth, or any Dashboard/Report
KPI"). Wiring it into a **new, separate, clearly-labeled display or
report** (not into the existing Business Worth calculation) would not
create a competing source of truth in the same sense — but this
distinction is itself a decision this Rule 8 Assessment does not make
(per §20's own instruction not to silently decide "whether Concept C
becomes operational").

**C6. Does any existing specification define Concept C as
authoritative?**
No — the opposite: the Accepted Specification and its signed
Authorization both explicitly and repeatedly describe it as
"a strictly separate, system-derived figure," "never... a rewrite of
any Product Memory or purchase fact," and "a transaction-scoped,
informational figure" only.

---

## 8. Downstream Financial Impact

**Traced directly (`apps/tenant/src/utils/calculations.ts`):**
`calculateBatch` computes `investmentValue = remainingQuantity * batch.costPrice`
and `marketValue = remainingQuantity * batch.sellingPrice` — both read
`StockBatch`'s own **purchase-unit-denominated** fields, never
`Product.unitRelationship`, never `Product.sellingPrice`, and never
`StockBatch.derivedSellingValuation`. This is the sole function feeding
Business Worth's stock-valuation component (per the Consolidated
Specification's own Repository Baseline, confirmed independently here).

**Can B2 be introduced without changing the meaning of existing
financial outputs?**

- **Under Reading 2 (extend Concept C's reach only): yes, with zero
  risk to existing financial outputs**, because Concept C is
  architecturally guaranteed, by both code (nothing calls
  `calculateDerivedTransactionValuation` from `calculateBatch` or any
  Business Worth path) and by the signed Authorization's own explicit
  prohibition, to never feed `calculateBatch`. Extending its reach to
  more entry paths adds more frozen snapshots that remain equally
  unconsumed by Business Worth.
- **Under Reading 1 (new transaction-level selling fields): only if
  those new fields are, by the same explicit discipline, never wired
  into `calculateBatch`.** Nothing in B2's own wording requires wiring
  them in — but nothing rules it out either, and the Decision Proposal
  itself is silent on this question. **If a future Implementation Plan
  ever proposed feeding a new selling-unit-aware figure into
  `calculateBatch`, that would be a Business Worth Engine change
  requiring its own, separate, explicit governance decision** — this
  Rule 8 does not authorize that, and flags it as a boundary a future
  Implementation Plan must not cross without first returning to the
  Product Architect.

**Exact existing dependency on one `StockBatch.unit`:** `calculateBatch`'s
`marketValue`/`investmentValue` are both scaled by `remainingQuantity`,
which is itself denominated in `StockBatch.unit` (via `batch.quantity`
minus `Quebra.quantityLost`, both in that same unit, per the Accepted
Specification's own confirmed baseline) — so both financial figures
are, today, entirely and only a function of quantities/prices expressed
in the batch's own single unit. This is the exact dependency B2 must
not silently disturb.

---

## 9. Tenant Isolation

**No new cross-tenant surface is implied by either decision.**
Confirmed directly: every product read/write path in `AppContext.tsx`
is scoped to `businesses/{businessId}/products` (spot-checked ~10
call sites, zero exceptions found). Decision A's owner-resolution and
candidate mechanisms (existing `findSimilarProducts`,
`detectSupplierWordingCandidates`) already operate purely against the
in-memory `products` array for the active business — extending them to
Contagem, or adding a new resolution UI, does not require a new query
shape, only a new UI surface over data already fetched per-business.
Decision B2, under either reading, adds fields to existing
per-business documents (`StockBatch`, or `Product`) — no new
cross-business read is implied by any option considered.

---

## 10. Performance / Scale

Architectural implications only, not optimized here:

- **Decision A:** an owner-resolution step, wherever added, is a
  client-side/UI-time cost against data already loaded (the `products`
  array is already subscribed to live in `AppContext.tsx`) — no new
  Firestore read pattern is implied for recognition itself. Extending
  candidate detection to Contagem means running `findSimilarProducts`
  (an O(products × query-tokens) client-side computation, per its own
  implementation) against Contagem's own product list — for a business
  with "hundreds/thousands of Products" (per this task's own
  framing), this is the same cost profile Add Stock already accepts
  today for the identical function, applied to a second surface — a
  scale question worth Implementation Plan attention, not a new
  category of concern.
- **Decision B2, Reading 2:** identical cost profile to Concept C's
  existing write path today — one pure-function call per line item,
  already proven at the existing call site.
- **Decision B2, Reading 1:** a new field means additional entry-time
  UI, not additional reads — no new Firestore query pattern implied.

No constraint was found that implementation "cannot" respect; this
section identifies attention points for the Implementation Plan, not
blockers.

---

## 11. Backward Compatibility

| Data category | Compatible with Decision A? | Compatible with Decision B2? | Migration? |
|---|---|---|---|
| Existing Products | Yes — `Product.id` unaffected | Yes — no schema change under Reading 2; additive under Reading 1 | **NOT REQUIRED** |
| Existing Product Memory | Yes | Yes | **NOT REQUIRED** |
| Existing StockBatch records | Yes | Yes, under either reading (§B2.5–B2.6) | **NOT REQUIRED** |
| Existing Contagem records | Yes (Decision A extension is additive UI, not a record-shape change) | Yes | **NOT REQUIRED** |
| Historical valuation | Unaffected — Decision A/B2 do not touch `calculateBatch`'s existing inputs | Unaffected, **provided** no future Implementation Plan wires a new field into `calculateBatch` (§8, above) | **NOT REQUIRED**, conditional as stated |
| Old records without `sellingUnit` | Already handled today (`isValidUnitRelationship` treats absence as "ordinary, fully anticipated," per existing code comments) | Same | **NOT REQUIRED** |
| Old records without complete `unitRelationship` | Same | Same | **NOT REQUIRED** |
| Records predating any future B2 field | N/A (doesn't exist yet) | Read as "no selling-basis info," falling back to today's single-basis behavior — an implementation choice, not a migration | **NOT REQUIRED**, provided the new field (if any) is optional |

**Overall backward-compatibility determination: NOT REQUIRED**, for
both decisions, under every reading considered — consistent with this
codebase's own established pattern of additive-only schema evolution.

---

## 12. Specification Conformance

| Specification / artifact | Decision A | Decision B2 |
|---|---|---|
| `BDR-0012` | CONFORMING (Decisions 10–12 already establish the core principle; A4/A5/A6 are compatible extensions) | CONFORMING at the Product-Memory level (§2 Decision 2 already establishes purchase/selling unit as distinct concepts) |
| `product-unit-of-measure-specification.md` | CONFORMING (no conflict found) | CONFORMING (unaffected — this spec governs `Product.unitRelationship`, not per-transaction fields) |
| `product-memory-purchase-selling-valuation-specification.md` §4–5, §13 | Not directly engaged | **CONFLICTING under Reading 1** (an independent per-transaction selling unit/price directly contradicts §4's "Product Memory, not per-transaction" framing and §13's "exactly one selling basis per receipt line, no mixed bases" rule); **CONFORMING under Reading 2** |
| `product-memory-purchase-selling-valuation-specification.md` §6 (Rule 8 Finding 10, corrected) | NOT COVERED for the Contagem-extension question (§A6, above) — new specification work needed, not a conflict | Not directly engaged |
| `product-memory-purchase-selling-valuation-implementation-authorization.md` §2 (signed exclusion of "multiple selling units... on any purchase/receipt-entry surface") | Not directly engaged | **CONFLICTING under Reading 1** (§4, above) — reopens a signed authorization; **CONFORMING under Reading 2** |
| `POL-0005` (minimum product configuration), `POL-0006` (temporary override) | CONFORMING (unaffected) | CONFORMING (unaffected — neither policy speaks to per-transaction selling-unit fields) |

**No specification is silently amended by this assessment.** Where
CONFLICTING is found (Reading 1 only), the required response is a
formal specification amendment to the Consolidated Specification's §4/
§13 and a reopening of its signed Implementation Authorization — not
performed here, and not to be inferred as pre-approved by this report.

---

## 13. Rule 8 Invariant Matrix

| # | Invariant | STATUS | Evidence |
|---|---|---|---|
| 1 | Product identity integrity | **PASS** | `Product.id` remains the single identity value under every recognition path and under Decision A's owner-resolution extension (§A1–A2) |
| 2 | Product Memory canonicality | **PASS WITH CONDITIONS** | Holds under Reading 2 of B2 unconditionally; under Reading 1, holds only if a new per-transaction field is never treated as superseding `Product.unitRelationship.sellingUnit`'s own canonical status — a condition, not a given, per §4/§B2.7 |
| 3 | Unit relationship integrity | **PASS** | `Product.unitRelationship` is unaffected by either decision; no proposal touches its own confirm/edit lifecycle (`BDR-0012` Decisions 13–14) |
| 4 | Price-basis integrity | **PASS WITH CONDITIONS** | `StockBatch.sellingPrice`'s existing per-purchase-unit meaning must never be repurposed (§B2.7) — already an explicit, pre-existing governance rule (§14 of the Accepted Specification), not a new condition this assessment invents, but one a Reading-1 implementation must actively respect |
| 5 | Historical data integrity | **PASS** | No historical field's meaning changes under either decision (§B2.5, §11) |
| 6 | Business Worth integrity | **PASS WITH CONDITIONS** | Holds unconditionally under Reading 2 (Concept C is architecturally barred from `calculateBatch`); under Reading 1, holds only if any new field is likewise never wired into `calculateBatch` without separate, explicit governance (§8) |
| 7 | Closing integrity | **NOT YET DETERMINABLE** | Closing was not directly traced in this assessment's own inspection; no evidence was found suggesting impact, but no dedicated trace was performed either — flagged rather than assumed |
| 8 | Tenant isolation | **PASS** | Confirmed directly, §9 above — no cross-business read/write implied by either decision |
| 9 | Auditability | **PASS** | Decision A's owner-resolution step is a natural extension of already-audited flows (Timeline events already exist for product creation, `logTimelineEvent`); Concept C's own frozen, timestamped (`derivedAt`) snapshot already satisfies B2's audit angle under Reading 2 |
| 10 | Backward compatibility | **PASS** | §11, above — no migration required under any reading considered |
| 11 | Determinism | **PASS** | Every recognition mechanism traced (evidence follow-up) is deterministic given its inputs; Decision A adds an owner-choice step, which is deterministic-given-the-choice, not a source of nondeterminism; Concept C's own computation is already proven deterministic (32/32 passing tests) |
| 12 | No silent duplicate creation | **PASS WITH CONDITIONS** | Decision A directly targets this; condition is that A4's "recognition failed vs. confirmed new" flag (§A4, above) is actually implemented — without it, Decision A's own intent is not fully realized even though nothing architecturally blocks it |
| 13 | No competing sources of truth | **FAIL, under Reading 1 of B2, unless a new field is introduced and never conflated with `StockBatch.sellingPrice` or `Product.unitRelationship.sellingUnit`** | This is the central risk §4/§B2.7 identify — the Accepted Specification's own §14 reasoning already establishes exactly this failure mode for the closely analogous case of reusing `sellingPrice`; **PASS under Reading 2**, since Concept C's snapshot is explicitly, by design, a non-authoritative audit copy |
| 14 | No unauthorized cross-business reads | **PASS** | §9, above |

---

## 14. Architectural Implementation Boundary

Without designing the implementation, a later Implementation Plan would
necessarily touch:

- **Product Memory retrieval call sites** (`findLatestRememberedProductMemory`,
  `buildProductMemoryAutofill`) — to be invoked from a new
  owner-resolution UI step, not to be reimplemented.
- **Finalization logic** in `addStockBatch`, `addMultipleStockBatches`,
  and `recordStockCount` (`AppContext.tsx`) — to receive and honor a
  new "confirmed new product" signal (Decision A A4).
- **Contagem UI** (`PeriodicStockCountView.tsx`, `InitialStockCountView.tsx`)
  — to gain some form of candidate/resolution mechanism where none
  exists today (Decision A A6 — mechanism itself is an open decision,
  §18).
- **`purchaseToSellingConversion.ts`'s call sites** — to extend Concept
  C's reach to `addStockBatch`/`recordStockCount`, if Reading 2 of B2
  is selected.
- **`StockBatch` (and possibly `StockCountItem`) schema** — only if
  Reading 1 of B2 is selected.
- **Tests** — the existing recognition and Concept C test suites
  (evidence follow-up Part C) would need new tests for whichever
  reading/mechanism is eventually authorized; none of the existing 195
  tests currently exercise Decision A's owner-resolution step or either
  B2 reading, since neither exists in code yet.

No code, schema, test, or specification file was touched to produce
this boundary list.

---

## 15. Additional Decisions Required

### Decision Needed 1 — Which reading of Decision B2 governs?

**DECISION NEEDED:** Does "the transaction architecture must explicitly
preserve... selling unit... [and] the applicable price basis for [the
selling] unit" (B2) mean (a) `StockBatch` (and/or `StockCountItem`)
must gain new, independently-entered fields for selling unit/price at
the point of entry, distinct from and equal in status to the purchase
unit/cost fields already there; or (b) the existing, already-signed
Concept C mechanism (frozen derived snapshot, sourced from Product
Memory) already satisfies this requirement once its reach is extended
to every entry path, with no new transaction-level input field
required?

**WHY IT MATTERS:** Reading (a) directly reopens an already-signed
Implementation Authorization and narrows an Accepted Specification's
explicit "exactly one selling basis per receipt line" rule (§4, above)
— it cannot proceed without a formal specification amendment and very
likely a fresh Rule 8 pass on that amendment specifically. Reading (b)
requires no schema change and no specification amendment, only a
straightforward extension of an existing, already-tested function's
call sites.

**CURRENT EVIDENCE:** The Decision Proposal's own wording (`docs/engineering/product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`
§5) is compatible with either reading — it never says "new field" nor
"reuse Concept C" explicitly. The Product Architect's acceptance
record adopts B2's wording verbatim without resolving this ambiguity.

**OPTIONS IF ALREADY ESTABLISHED BY THE REPOSITORY:** Not established
either way — this is a genuine gap, not an oversight in this
assessment.

**WHY PRODUCT ARCHITECT INPUT IS REQUIRED:** Choosing between these two
readings is exactly the kind of "whether Concept C becomes operational"
/ "exact B2 field names" decision this Rule 8's own governing
instructions (§18 header) explicitly reserve for the Product Architect,
not for Rule 8 to decide unilaterally.

### Decision Needed 2 — What mechanism extends Decision A to Contagem?

**DECISION NEEDED:** Should Contagem's existing/new resolution
mechanism be (a) the same Supplier-Wording-style owner-reviewed
candidate UI already used in Add Stock, adapted to drop its
supplier-scoping (since Contagem has no supplier concept); (b) the
already-existing, catalog-wide `findSimilarProducts` mechanism, wired
into Contagem for the first time; or (c) some other, Contagem-specific
mechanism not yet designed?

**WHY IT MATTERS:** Rule 8 Finding 10 (corrected) deliberately excluded
Initial Stock from supplier-wording-specific candidate detection for a
sound, already-accepted reason (no supplier concept). Extending
Decision A to Contagem must not be read as silently reversing that
finding — but it does require *a* mechanism, and none is currently
authorized for that surface.

**CURRENT EVIDENCE:** Evidence follow-up Part B.1 confirms Contagem has
zero recognition mechanisms today beyond exact match. `findSimilarProducts`
is already supplier-agnostic and catalog-wide, making it a structurally
plausible fit — but this Rule 8 Assessment does not select it, per its
own governing instruction not to silently decide UI/mechanism choices.

**OPTIONS IF ALREADY ESTABLISHED:** Not established.

**WHY PRODUCT ARCHITECT INPUT IS REQUIRED:** This is a genuine
architectural/UX choice affecting a surface (Contagem) that a prior,
signed Rule 8 Assessment already reasoned carefully about (Finding 10)
— reopening that reasoning's neighborhood deserves explicit sign-off,
not inference.

### Decision Needed 3 — Should Concept C's read side ever become operational, and if so, where?

**DECISION NEEDED:** Should `calculateDerivedTransactionValuation`
(currently called from nowhere but its own test) ever be surfaced —
e.g., as a new, separately-labeled display field or report — and if
so, is it acceptable that it remains architecturally barred from ever
feeding `calculateBatch`/Business Worth (per the existing signed
Authorization), or does Decision B2 imply it should now inform Business
Worth in some way?

**WHY IT MATTERS:** This determines whether the "operational" half of
the evidence follow-up's Concept C finding (write-only, currently
unread) is a defect Decision B2 is meant to fix, or an intentional,
still-correct design this Rule 8 should leave undisturbed.

**CURRENT EVIDENCE:** The Decision Proposal's own §2 evidence item 9
states Concept C's derived valuation "is not currently consumed by the
application as an operational input" as a neutral fact, not as a
problem to solve — but Decision B2's own wording ("the transaction
architecture must explicitly preserve") is at least readable as
implying consumption matters, which is exactly Decision Needed 1's own
fork.

**WHY PRODUCT ARCHITECT INPUT IS REQUIRED:** This Rule 8's own §20
governing instruction explicitly names "whether Concept C becomes
operational" as a question this assessment must not silently decide.

---

## 16. Final Rule 8 Verdict

> **READY AFTER DECISIONS**

**Rationale:** Decision A is architecturally sound and requires no
specification amendment for its core mechanism (§A1–A5, A7) — its one
open item (Contagem's specific mechanism, Decision Needed 2) is a
scoping decision, not a conflict. Decision B2 cannot proceed to an
Implementation Plan as currently worded because it admits two
materially different readings, one of which (Reading 1) directly
conflicts with an already-Accepted Specification and an already-signed
Implementation Authorization (§4, §12, §13), and the other of which
(Reading 2) requires no specification amendment at all. **This is not
a "NOT READY" fundamental conflict** — Reading 2 is fully compatible
with existing governance today, with no invariant failing outright —
but it is also not "READY," because implementation cannot proceed
without first knowing which reading governs, and choosing wrong risks
exactly the competing-source-of-truth failure Invariant 13 identifies.
Nor is it "READY AFTER SPECIFICATION AMENDMENT" outright, because no
amendment is needed *if* Reading 2 is selected — the amendment is only
needed *if* Reading 1 is selected, which is itself the undecided
question.

---

## 17. Evidence Limitations

- **Invariant 7 (Closing integrity)** was not directly traced in this
  assessment — no evidence of impact was found, but no dedicated
  inspection of Closing's own code path was performed either. Marked
  NOT YET DETERMINABLE rather than assumed PASS.
- **Whether Increment B's §8 "one-at-a-time unresolved-line sequencing"**
  (signed, per the Implementation Authorization) is actually built in
  `AddStockView.tsx`'s render logic was not re-verified line-by-line in
  this session — the evidence follow-up traced the submit-time blocking
  check (`supplierWordingCandidates.length > 0`) but not a full
  per-line sequential-reveal UI trace. **NOT ESTABLISHABLE FROM CURRENT
  REPOSITORY EVIDENCE within this assessment's own scope** without a
  dedicated re-inspection.
- **`Product.sellingPrice`'s exact relationship to `Product.unitRelationship.sellingUnit`** when both are present on the same Product (do they refer to the same price, potentially in different units, or can they diverge?) is **NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE** — flagged in the semantic map (§6) rather than guessed.
- **No empirical/production evidence** of any kind was consulted or
  exists in this repository (consistent with the evidence follow-up's
  own Part C finding) — every conclusion above is architectural/code-
  level, not usage-frequency-based.
- This assessment reviewed the governance artifacts it identified as
  relevant via targeted search (`BDR-0012` and its full lineage, the
  Consolidated Specification and its signed Authorization, the
  Supplier-Wording Rule 8 Assessment's Finding 10). It does not claim
  to have read every governance document in `docs/specs/` or
  `docs/engineering/` in full — a targeted, evidence-driven search was
  used, consistent with the scale of this task, not an exhaustive
  line-by-line audit of the entire governance corpus.

---

## Final Verification

```
$ git status --short
```
Confirmed (session record): only this report file is newly created;
no other file in the working tree changed.

- [x] No implementation files changed.
- [x] No specification was amended (conflicts identified, not resolved
      or silently authorized).
- [x] No Rule 8 decision was silently converted into implementation.
- [x] No commit performed.
- [x] No push performed.

---

**RULE 8 VERDICT:**
READY AFTER DECISIONS

**DECISION A:**
Architecturally sound; no specification conflict found; one scoping
decision required (Decision Needed 2 — Contagem mechanism) before the
implementation boundary is final.

**DECISION B2:**
Admits two materially different readings; Reading 1 CONFLICTS with the
Accepted Consolidated Specification (§4, §12, §13) and its signed
Implementation Authorization; Reading 2 CONFORMS with no amendment
needed. Cannot proceed until Decision Needed 1 is resolved.

**SPECIFICATION AMENDMENT REQUIRED:**
UNKNOWN — required if and only if Reading 1 of Decision B2 is selected;
not required if Reading 2 is selected; not required for Decision A's
core mechanism; likely required (new, not amended, provisions) for
Decision A's Contagem extension regardless of which mechanism is
chosen (Decision Needed 2).

**ADDITIONAL PRODUCT ARCHITECT DECISIONS REQUIRED:**
1. Which reading of Decision B2 governs (§15, Decision Needed 1).
2. Which mechanism extends Decision A to Contagem (§15, Decision
   Needed 2).
3. Whether Concept C's read side should ever become operational, and
   under what boundary relative to Business Worth (§15, Decision
   Needed 3).

**IMPLEMENTATION:**
NOT AUTHORIZED

**COMMIT/PUSH:**
NOT PERFORMED

**STOP.**
