Specification Amendment — ACCEPTED

# Product Identity Alternative Name Specification — Amendment: No-Candidate Resolution & Periodic Contagem Coverage

**STATUS: ✅ ACCEPTED.** See "Product Architect Acceptance," below. This
amendment's substance has been applied to
[`product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md)
as new §4a and §7a, per this repository's established "amend
additively, never rewrite the source" convention (see
`product-unit-of-measure-reconciliation-amendment.md`) — the original
§4 and §7 text remains in that file, unmodified and historically
traceable; only new, clearly-labeled amendment sections were added.

**IMPLEMENTATION: NOT AUTHORIZED**
**RULE 8: TARGETED RE-CHECK IS NOW THE NEXT GATE — not performed by this document**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**
**COMMIT/PUSH: NOT AUTHORIZED**

**Would amend (upon acceptance):** [`docs/specs/product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md) §4 ("New-Product Path") and §7 ("Screen-by-Screen Behavior," the Periodic Contagem exclusion) — narrowly, only to the exact extent §3 below identifies.
**Does not amend:** any other section of that Specification; `product-memory-purchase-selling-valuation-specification.md`; Concept C (`StockBatchDerivedSellingValuation`/`buildDerivedSellingValuationSnapshot`); any `StockBatch`, Product Memory, Business Worth, or Closing governance; `BDR-0013`; `POL-0007`; the UOM lineage (`BDR-0012`, `POL-0001`–`POL-0006`) — none of these is touched, per the Final Rule 8 Assessment's own finding that they remain conformant.
**Origin:** [`docs/engineering/RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md) §9 and §16 — identified there as the exact two items required before the "READY AFTER SPECIFICATION AMENDMENT" verdict can resolve.

---

## Traceability

This amendment sits at the end of the following governance chain, each
artifact preserved unmodified by this document:

1. [`docs/engineering/RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md`](./RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md) — evidence investigation
2. [`docs/engineering/product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`](./product-recognition-and-cost-selling-unit-architecture-decision-proposal.md) — Decision A / Decision B proposal
3. [`docs/engineering/product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md) — acceptance of Decision A and Decision B (Option B2)
4. [`docs/engineering/RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md) — Rule 8 Assessment, verdict READY AFTER DECISIONS
5. [`docs/engineering/recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md) — A-Contagem / B2-Reading-2 / Concept C clarifications
6. [`docs/engineering/recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md) — acceptance of the three clarifications
7. [`docs/engineering/RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md) — Final Rule 8 Assessment, verdict READY AFTER SPECIFICATION AMENDMENT
8. **This document** — the specification amendment draft the Final Assessment's §16 called for

---

## 1. Problem Statement

The Final Rule 8 Assessment (§9, §16) found that two, and only two,
sections of `product-identity-alternative-name-specification.md`
require amendment before implementation of accepted Decision A and
Decision A-Contagem may proceed. Both statements being amended were
correct and valid when written — no "no silent creation" or Contagem
principle existed yet to evaluate them against. Decision A and
Decision A-Contagem have since been explicitly accepted by the Product
Architect, and this amendment identifies precisely what is now
superseded or newly covered — nothing else.

## 2. Exact Current Wording Being Addressed

**Quoted exactly, in full, from the current, unmodified specification
file:**

**§4, "New-Product Path" (in full):**

> Per `BDR-0013` item 3 and `POL-0007` Business Requirement 6: when the
> owner indicates a proposed candidate is not the same product (or
> declines to declare a relationship at all), the incoming item is
> treated as an ordinary new product — there is no "reject alias"
> concept, no separate blocking state, and the owner is never forced to
> select an existing product. Technically, this means: no
> supplier-wording relationship is established; the stock entry
> proceeds exactly as it would for any product with no candidate ever
> detected, using the wording entered as the new product's
> `Product.name`. This Specification does not decide the exact
> mechanism by which a "not the same product" response transitions the
> UI from candidate-review back to ordinary new-product entry — Rule
> 8/implementation concern; the business/Policy requirement is only
> that this transition must occur without extra friction or forced
> selection.

**§7, "Screen-by-Screen Behavior" (the relevant line):**

> **Periodic Contagem:** **not in scope** (`BDR-0013` item 8's
> exclusion).

## 3. Proposed Amendment

### 3.1 Amendment 1 — §4, "New-Product Path"

**Affected specification:** `product-identity-alternative-name-specification.md`
**Affected section:** §4 — New-Product Path
**Reason:** Conflict with accepted Product Architect Decision A —
identified precisely in the Final Rule 8 Assessment §9: §4's existing
text equates "owner declined a proposed candidate" with "no candidate
was ever detected at all," and routes **both** to silent, automatic
new-product creation with no distinct owner-facing confirmation moment.
Decision A requires that a genuinely unresolved identity — where
automatic recognition could not establish sufficient confidence, and no
candidate exists to decline — must not silently become a new Product;
the owner must explicitly resolve Existing Product vs. New Product.

**Required conceptual change** (business-level only — no algorithm,
threshold, or UI is specified):

> Automatic recognition remains permitted, and requires no owner
> interaction, wherever it establishes sufficient confidence (§3 of
> the existing Specification, unchanged) — this includes the case
> where the owner has already reviewed and explicitly declined a
> proposed candidate, per this section's own existing rule, which is
> **not** altered by this amendment (an owner who has already said "not
> the same product" has, by that very act, exercised exactly the
> explicit resolution Decision A requires — this is not a second,
> separate confirmation to add).
>
> What §4's existing wording additionally, and incorrectly, extends
> this same "proceed as ordinary new product" treatment to is the
> **different** case where **no candidate was ever proposed at all** —
> a plain automatic-recognition miss with nothing for the owner to
> review or decline. This amendment corrects that extension only: for
> this specific case, the incoming item must not silently finalize as a
> new Product. The owner must be given an explicit opportunity to
> resolve the item as an Existing Product (via a search/selection
> mechanism separate from, and not limited to, whatever candidate
> mechanism did or did not fire) or to explicitly confirm it as a New
> Product before finalization completes.
>
> The three states this Specification's governing text must keep
> distinct, per Decision A's own framing:
> 1. **Automatic confident recognition** — an exact match, a reused
>    confirmed relationship, or an owner-accepted candidate. No new
>    interaction required by this amendment.
> 2. **Unresolved identity** — no confident automatic match, and either
>    no candidate exists or every candidate was declined. Requires the
>    new explicit Existing/New resolution step this amendment
>    introduces.
> 3. **Explicit owner-confirmed New Product** — the outcome of state 2
>    when the owner selects "New Product." This is the only path that
>    may result in `Product` creation with no prior match — and it must
>    be distinguishable, in whatever record or signal Rule 8/
>    implementation later selects, from state 2 having simply never
>    been reached at all (i.e., from a hypothetical future regression
>    reintroducing silent creation).

**Explicitly not decided by this amendment** (carried forward,
unchanged, from the existing Specification's own discipline): a
particular fuzzy-matching algorithm; an AI model; a similarity
threshold; the exact UI for the new resolution step; candidate ranking
or maximum count; barcode/SKU behavior; the exact mechanism (flag,
field, or otherwise) by which state 3 is recorded as distinct from
state 2. All of these remain Rule 8/implementation matters, exactly as
§4's own existing text already reserves its comparable open questions.

### 3.2 Amendment 2 — §7, Periodic Contagem Coverage

**Affected specification:** `product-identity-alternative-name-specification.md`
**Affected section:** §7 — Screen-by-Screen Behavior / Periodic Contagem
**Reason:** Decision A-Contagem was subsequently accepted by the
Product Architect, establishing that the same Product Identity
Existing/New resolution principle applies to Periodic Contagem —
territory this Specification's existing text explicitly and, at the
time, correctly placed out of scope.

**Required conceptual change** (minimum necessary only):

> The existing exclusion — "Periodic Contagem: not in scope
> (`BDR-0013` item 8's exclusion)" — is **not reversed** with respect to
> Supplier-Wording Recognition specifically: Periodic Contagem
> continues to have no supplier concept, and continues not to run
> Supplier-Wording Recognition's own candidate-detection or
> reuse-matching mechanism (§2, §6 of the existing Specification), for
> exactly the reason already established (Rule 8 Finding 10, corrected:
> no supplier identity exists to associate a wording with).
>
> What this amendment adds is narrower and separate: Periodic Contagem
> is now within scope of the **general Product Identity Existing/New
> resolution principle** (Decision A, as amended by §3.1 above), applied
> through a mechanism that does not depend on supplier identity. When
> Periodic Contagem cannot establish Product identity with sufficient
> confidence from information already available within the owner's own
> business:
> - the system must not silently create a new Product;
> - the owner must be given an explicit Existing Product / New Product
>   resolution, before that count line finalizes as a new Product.
>
> This mechanism:
> - must not require supplier identity, in any form;
> - must not require a cross-business Product query;
> - must not automatically select among multiple plausible existing
>   Products — an ambiguous case still requires explicit owner choice.
>
> When the owner resolves to an Existing Product, applicable canonical
> Product Memory (`sellingPrice`, `sellingUnit`, `unitRelationship`)
> is retrieved for that Product exactly as it already is for every
> other resolution path (§4 of `product-memory-purchase-selling-valuation-specification.md`,
> unaffected by this amendment) — no new retrieval mechanism is
> introduced.

**Explicitly not decided by this amendment:** which existing or new
mechanism (e.g., the already-existing, supplier-agnostic Product Name
Similarity capability, or some other design) implements this
resolution for Periodic Contagem; the UI; ranking; candidate count;
any recognition algorithm or threshold. These remain Rule 8/
implementation matters, to be resolved without reopening this
amendment's own business-level requirement.

## 4. What This Amendment Does Not Decide

Carried forward, unmodified, from the existing Specification's own
explicit-non-goals discipline (§11 of the current Specification) and
extended only to the two items above:

- Exact similarity/matching algorithm, model, or confidence threshold
  for either amendment.
- UI design, layout, copy, or interaction flow for the new resolution
  step, in either Add Stock/Smart Stock Entry or Periodic Contagem.
- The technical mechanism for recording "explicit owner-confirmed new
  product" as distinct from "unresolved" (§3.1's state 2 vs. state 3).
- Any change to Initial Stock, which remains explicitly out of scope
  for Supplier-Wording Recognition specifically (§7's existing text,
  unaffected) and is not itself named by Decision A-Contagem (which
  addresses Periodic Contagem).
- Any schema change to `Product`, `StockBatch`, or `StockCount`/
  `StockCountItem` — none is required by either amendment; both are
  business-level behavior requirements only.
- Any change to Concept C, B2, `StockBatch` selling-basis semantics,
  Business Worth, or Closing — the Final Rule 8 Assessment found these
  conformant, and this amendment does not reopen them.
- Rule 8's own targeted re-check of this amendment, or any
  Implementation Plan/Authorization — all remain separate, later,
  not-yet-reached gates.

## 5. Preserved Boundaries — Explicitly Confirmed Unaffected

The following remain entirely intact, unmodified, and binding — none is
touched by this amendment:

- Every other section of `product-identity-alternative-name-specification.md`
  not named in §3, above — including §2 (Data Model), §3 (Candidate
  Recognition Flow) for Add Stock/Smart Stock Entry, §5 (Conflict
  Handling), §6 (Reuse of an Already-Confirmed Relationship), §8
  (Lifecycle), §9 (Tenant Isolation), §10 (Failure Modes, subject only
  to the consistency note in §3.1 above about the "no candidate"
  scenario it describes), and §12 (Item 9 exclusion).
- Initial Stock's own continued exclusion from Supplier-Wording
  Recognition (§7's existing text) — unaffected; Decision A-Contagem
  addresses Periodic Contagem, not Initial Stock.
- `BDR-0012`, `POL-0001`–`POL-0006`, the UOM Specification, and the
  Consolidated Specification (`product-memory-purchase-selling-valuation-specification.md`)
  in their entirety — the Final Rule 8 Assessment found B2 Reading 2
  and Concept C fully conformant with all of these; nothing here
  reopens that finding.
- `BDR-0013` and `POL-0007` in their entirety — this amendment operates
  within the Existing/New resolution principle they and Decision A
  already establish; it does not amend either document.

## 6. Migration Statement

This amendment does not itself authorize or require any migration,
backfill, or reinterpretation of historical data. Every existing
`Product`, `StockBatch`, and `StockCount`/`StockCountItem` record
remains valid exactly as recorded. The Existing/New resolution step
this amendment requires applies only to identity resolution at the
moment of a **new** entry, going forward from whenever it is
implemented — it does not revisit or reclassify any product created
before that point, silently-created or otherwise.

## Governance Notes

- No `src/`, `apps/`, `server/`, or `firestore.rules` file has been
  modified to produce this document.
- `product-identity-alternative-name-specification.md` is **not**
  edited in place by this document, consistent with this repository's
  established "amend additively, never rewrite the source" pattern
  (`product-unit-of-measure-reconciliation-amendment.md` precedent).
  The original §4 and §7 wording remains, unmodified and historically
  traceable, in that file until and unless a separate, accepted
  amendment actually edits it.
- This document does not modify `BDR-0012`, `BDR-0013`, `POL-0001`–
  `POL-0007`, the UOM Specification, the Consolidated Specification,
  or any of the seven governance artifacts listed under Traceability,
  above.
- Once accepted, `product-identity-alternative-name-specification.md`
  would, per this repository's established mechanical-follow-up
  pattern, receive a short cross-reference note pointing to this
  amendment — that follow-up edit is not performed here and requires
  its own, separate, explicit authorization after acceptance.

---

## Product Architect Acceptance

**Status:** ✅ **Accepted (2026-09-06).**

> Both amendments are accepted exactly as drafted in §3 above:
> Amendment 1 (§4 correction — a plain no-candidate result must route
> through explicit owner Existing/New resolution, never silently
> finalize as a new Product) and Amendment 2 (§7 — Periodic Contagem is
> now covered by the general Existing/New identity-resolution
> principle, via a supplier-independent, business-scoped mechanism,
> with Supplier-Wording Recognition itself remaining out of scope for
> Contagem). No content beyond what §3 specifies is accepted — in
> particular, this acceptance does not touch B2, Concept C, `StockBatch`
> selling-basis semantics, Business Worth, Closing, or any other
> section of `product-identity-alternative-name-specification.md` not
> named in §3. This acceptance does not authorize Rule 8's own targeted
> re-check (a separate, next gate), an Implementation Plan, or an
> Implementation Authorization.

Decision (Amendment 1 — §4 correction): **ACCEPT**

Decision (Amendment 2 — §7 Periodic Contagem coverage): **ACCEPT**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-06

This amendment is now Accepted and has been applied to
`product-identity-alternative-name-specification.md` as new §4a and
§7a (see that file). The next required gate is Rule 8's own targeted
re-check, confirming the two previously identified conflicts are now
resolved — not performed by this document. No Implementation Plan or
Implementation Authorization may be produced until that re-check is
complete.
