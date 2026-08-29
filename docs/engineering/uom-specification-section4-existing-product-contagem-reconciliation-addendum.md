Reconciliation Addendum

# UOM Specification §4 / Existing-Product Periodic Contagem — Reference-Point Reconciliation Addendum

**Status:** ✅ **ACCEPTED / SIGNED (29 August 2026).** See "Signature
Gate — Formal Acceptance," §7, below, for the complete signed decision.
Not an Implementation Authorization; does not by itself authorize any
code change. Does not modify code. Does not modify any existing
governance document.

**Investigates and, if signed, would amend (narrowly, only the one
sentence identified in §2):**
[`product-unit-of-measure-specification.md`](../specs/product-unit-of-measure-specification.md)
§4, "Periodic Contagem" bullet — specifically its own fixed-reference-
point sentence for the mixed-unit combination step.

**Does not amend, and this document does not propose amending:**
`BDR-0012`, any POL document, any other section of the UOM Specification,
`business-worth-evolution-specification.md`, `business-worth-evolution-
implementation-authorization.md`, `business-worth-evolution-rule8-
assessment.md`, the signed [Decision 37 B.2 Selling Unit Capture
Extension Addendum](./decision-37-b2-selling-unit-capture-extension-addendum.md),
or either of its accepted Plan/Authorization
([`periodic-contagem-new-product-selling-unit-implementation-plan.md`](./periodic-contagem-new-product-selling-unit-implementation-plan.md),
[`periodic-contagem-new-product-selling-unit-implementation-authorization.md`](./periodic-contagem-new-product-selling-unit-implementation-authorization.md)).
None of these require amendment — see §3, below, for why the newer,
signed decision genuinely does not already cover the question this
addendum resolves.

**Does not rewrite history.** No existing document is edited by this
addendum. It records a **new, separate** Product Architect decision
extending/clarifying the UOM Specification's own §4 reference-point rule
for one specific, previously-unaddressed case — it does not claim §4 was
ever wrong as written, and it does not touch the two prior signed
documents' own historical accuracy.

---

## 1. What This Addendum Was Commissioned to Determine

A prior session drafted a Rule 8 Assessment and Implementation Plan
proposing that Periodic Contagem's existing-product path prefer a
product's confirmed `UnitRelationship.sellingUnit` — rather than
`units[0]` — as the reference point for (a) the auto-populated catalog
row's default unit/price, and (b) Mode A's own default reference
unit/price. That Rule 8 Assessment's own §0 flagged, rather than
silently resolved, a direct textual conflict with an existing, Accepted
Specification section, and returned a verdict of **CONDITIONALLY READY**
pending exactly the investigation this document now completes.

This session was commissioned to: (1) re-read the UOM Specification §4
exactly; (2) re-read the signed Decision 37 B.2 addendum exactly; (3)
re-read the accepted Plan/Authorization for new-product selling-unit
capture exactly; (4) determine whether that newer, signed decision
already supersedes or clarifies the older `units[0]` rule; and (5) if it
does not, draft a reconciliation addendum rather than edit the historical
Specification directly. Steps 1–4 are recorded in §2–§3, below. This
document itself is the output of step 5.

## 2. The Two Texts, Quoted Exactly

**`product-unit-of-measure-specification.md` §4, "Periodic Contagem"
bullet (✅ Accepted, unedited by this addendum):**

> "The mixed-unit combination step (Decisions 6–7) converts all entries
> for one product within one count to the confirmed chain's top-level
> unit, `units[0]`, for valuation purposes — the same single reference
> point Add Stock's default already uses (§5.A Item 4); **no separate,
> configurable, or per-count reference-unit choice is introduced.** The
> exact technical calculation mechanics remain a Rule 8/implementation
> concern; only the reference point itself (`units[0]`) is fixed here."

**The signed [Decision 37 B.2 Selling Unit Capture Extension
Addendum](./decision-37-b2-selling-unit-capture-extension-addendum.md)
§2, item 4 (✅ Signed, SABUSHIMIKE MASCENI, 29 August 2026, unedited by
this addendum):**

> "The selling unit must **not** be forced to equal the first/buying unit
> (`units[0]`) — this was already true of `isValidUnitRelationship`'s
> existing contract and remains unchanged; **this decision only concerns
> where the owner is given the opportunity to choose it, not the
> validation rule itself.**"

## 3. Determination: The Newer Signed Decision Does NOT Supersede or Clarify the Older Rule

Read exactly, in full context, and cross-checked against the accepted
Plan and signed Authorization that implement it — the newer decision and
the older rule govern **two different moments**, and the newer decision
says so about itself, explicitly:

- **The UOM Specification §4 sentence governs a READ-side / valuation-
  time question:** once a count contains multiple physical entries for
  one product, in possibly-different units, which single unit does the
  system convert everything *to*, for the purpose of computing one
  valuation figure? Its answer: `units[0]`, unconditionally, with no
  per-count override.
- **The Decision 37 B.2 Addendum item 4 governs a WRITE-side / setup-time
  question:** when a genuinely new product's relationship is first being
  established, in `NewProductInfoPanel`, which unit may the owner
  *designate* as `sellingUnit` on the `Product` document itself? Its
  answer: any chain member, not forced to `units[0]`. The addendum's own
  text is explicit that this is the full extent of its own scope: *"this
  decision only concerns where the owner is given the opportunity to
  choose it, not the validation rule itself."*

**Confirmed directly against the implementing Plan and Authorization,**
re-read in full this session:

- The Plan's §9 (Regression Boundaries) explicitly lists as **not**
  touched: *"Add Portion's transient persistence behavior (unrelated —
  this Plan touches only the new-product relationship candidate, never
  `modeAGroups` or per-portion `sellingPrice`)"* — i.e., Mode A/B's own
  existing-product read-time logic is explicitly named and explicitly
  excluded.
- The Authorization's §4 (Scope and Affected Files) explicitly lists
  `apps/tenant/src/lib/contagemMultiUnitValuation.ts` (Mode A/B) among
  the files **"explicitly excluded, confirmed untouched by this
  Authorization."**
- The Authorization's §3, point F ("Add Stock") states that for an
  *existing* product, "the established relationship and selected selling
  unit/price are remembered and reused automatically" — but this
  sentence is scoped, by its own heading, to **Add Stock**, not to
  Periodic Contagem's own existing-product valuation path. No point in
  §3 (A–H) makes any equivalent statement about Periodic Contagem's
  existing-product `buildCatalogRow`/Mode A default behavior.
- Neither the Plan nor the Authorization contains the string
  `buildCatalogRow`, `handleModeAToggle`, or any other reference to
  Periodic Contagem's existing-product prefill mechanism, anywhere.

**Conclusion:** the newer, signed decision is real, binding, and
correctly implemented for exactly what it authorized — a new product's
*first-time* `sellingUnit` designation. It says nothing, one way or the
other, about which unit Periodic Contagem should default to when
**re-valuing an already-existing product's** mixed-unit physical count in
a **second or subsequent** Contagem. **The UOM Specification §4 sentence
therefore remains the only signed governance text that speaks directly
to that specific question, and it currently says `units[0]`,
unconditionally.** No conflict between two documents that both speak to
the same moment exists — rather, a real gap exists: the specific
question ("should a confirmed `sellingUnit` override `units[0]` as the
reference point once one exists?") has never been put to the Product
Architect at all, under any prior document. §4's own text was written
before `Product.unitRelationship.sellingUnit` could ever be set from
within Periodic Contagem itself (that capability did not exist until the
newer decision), so its drafters could not have been deciding this exact
question either way.

This is precisely the situation this session's own instruction
anticipated: since the newer decision does not supersede or clarify the
older rule, a reconciliation addendum — not a silent code change, and not
an edit to the historical Specification text — is the correct next step.

## 3a. One Additional Adjacent Rule Checked, Confirmed Not in Conflict — Reported, Not Silently Assumed

A broader search of every governance document referencing `units[0]` or
"reference unit" (`business-worth-evolution-implementation-plan.md`,
`business-worth-evolution-implementation-authorization.md`, and every
other file listed in this addendum's own header) found exactly one
additional rule that also anchors on `units[0]`, and it is confirmed
**not** to conflict with this addendum — but it is reported explicitly,
per this session's own instruction not to silently resolve or silently
pass over anything found, rather than left unmentioned:

**`business-worth-evolution-implementation-authorization.md` line 994**
(FR-67, cost-basis conversion, §44's own governing chain): *"The
authoritative original cost basis for FR-67 is `Product.costPrice` +
`Product.unitRelationship.units[0].unit`... `StockBatch.costPrice` is
never used as a substitute when its unit differs from the purchase
unit."* This is a **cost**-basis anchor, not a **selling**-valuation
reference point — a product's cost is, by definition, always
denominated in its original purchase unit (`units[0]`), regardless of
which unit it sells in; this is a different concept from the question
this addendum resolves, not a competing answer to the same question.
**This addendum does not touch, weaken, or reinterpret FR-67's own
`units[0]` cost-basis anchor in any way** — `buildProductCostBasisMap`
and `deriveCostContribution` (the functions that implement FR-67) are
not named anywhere in §4 of this proposal and are not affected by it.
This is stated explicitly here so that an engineer implementing this
addendum's decision, if signed, cannot conflate the two: **`units[0]`
remains, permanently and unconditionally, the cost-basis anchor; only
the *selling*-valuation reference point is what this addendum proposes
changing, and only for a product with a confirmed `sellingUnit`.**

## 3b. Distinguishing the Four Data Categories in Play

Required explicitly by this session's own instruction. These four
categories are never the same thing, and this addendum's proposed
decision (§4) touches only the first two, as noted:

1. **Permanent Product Memory** — `Product.unitRelationship` (`units[]`,
   `sellingUnit`) and, separately, `Product.costPrice`/`sellingPrice`
   (the manually-editable catalog reference fields, `EditProductModal.tsx`
   only). Established once, reused automatically, never re-collected
   during an existing product's Contagem. **This addendum's §4 decision
   changes how one already-confirmed field of this category
   (`sellingUnit`) is *consumed* at valuation time — it adds no new
   field here and changes no write path into this category.**
2. **Latest purchase selling-price memory** — the most recent
   `StockBatch.sellingPrice`/`.unit` for the product (read via
   `findMostRecentBatchForProduct`), independent of, and not itself part
   of, Product Memory proper. Remains the source of the *remembered
   figure*; this addendum's §4 decision changes only which **unit** that
   remembered figure is re-denominated into by default (the confirmed
   `sellingUnit` instead of `units[0]`/the batch's own raw unit) — it
   does not change which batch is consulted, and the resulting figure
   remains fully owner-editable in the current Contagem, exactly as
   today.
3. **Current Contagem physical quantities** — the flat, unmerged set of
   `{quantity, unit}` portions the owner enters for this specific count
   (catalog row + every "Adicionar Porção" row). Never touched by this
   addendum — physical entries remain freely multi-unit, never merged,
   never forced into any single unit, unchanged by §4's decision, which
   concerns only *valuation*, never *physical recording*.
4. **Temporary Add Portion decisions** — an owner's in-session choice to
   add an extra portion (e.g. "this quantity is wholesale"), valid only
   for the current Contagem, never Product Memory, never carried
   forward. Entirely untouched by this addendum — §4's decision changes
   only which unit/price a portion's Mode-A-derived value defaults to
   *if and when Mode A is separately activated by the owner*; it does
   not change Add Portion's own creation, temporariness, or
   non-inheritance in any way.

## 4. Proposed New Product Architect Decision

Recorded here as a **draft**, for review and signature — not yet
decided, not yet binding:

1. **When a product's `UnitRelationship` carries a confirmed
   `sellingUnit`** (validated exactly as today, via the unmodified
   `isValidUnitRelationship` — a chain member, optional, independent of
   `units[0]`): Periodic Contagem's mixed-unit valuation step — for an
   **existing** product, in a **second or subsequent** Contagem — should
   use that confirmed `sellingUnit`, not `units[0]`, as its reference
   point for silently converting/combining physical quantities entered
   in other chain units.
2. **When no `sellingUnit` is confirmed** (the field remains optional,
   unchanged): `units[0]` remains exactly the reference point UOM
   Specification §4 already fixes, entirely unchanged — this decision
   narrows the existing rule for one additional case, it does not remove
   or replace the existing rule's own fallback behavior.
3. **This decision does not reopen "no separate, configurable, or
   per-count reference-unit choice is introduced."** The reference point
   remains a single, non-owner-chosen-per-count value, derived
   automatically from Product Memory (`sellingUnit`, when confirmed, else
   `units[0]`) — never a new per-count selector the owner picks fresh
   each time. This preserves §4's own stated intent (a fixed, predictable
   reference point, not an ad hoc per-count choice) while correcting
   *which* fixed value that reference point resolves to once a more
   specific one has been confirmed.
4. **The already-existing Mode A mechanism's own owner-facing override**
   (the reference-unit dropdown inside `ModeAValuationControl`, which
   already lets the owner pick any chain unit, confirmed already shipped
   and unaffected by either the older §4 text or the newer B.2 addendum)
   is **not** touched by this decision — it remains exactly as already
   implemented; this decision concerns only the *default* Mode A starts
   from, and the *default* `buildCatalogRow` uses before Mode A is even
   considered.
5. **New-product setup (Case A) is entirely unaffected** — this decision
   concerns only how an *already-confirmed* `sellingUnit` is *reused*
   during a later Contagem for an *existing* product; it does not touch
   how or when `sellingUnit` is first captured, which remains exactly as
   the signed Decision 37 B.2 addendum and its Plan/Authorization already
   govern, unmodified.
6. **The existing conversion engine** (`getConversionFactor`,
   `resolveUnitAwarePrice`, `deriveModeAPortionValuations`) silently
   performs whatever conversion this reference-point change requires —
   unchanged, not reopened, no new conversion mechanism introduced.
7. **No new field, no new type, no new validation rule.** This decision
   concerns only which of two already-existing, already-valid values
   (`sellingUnit` or `units[0]`) a read-time default resolves to — not
   the data model itself.
8. **Add Portion, Cost Price, Initial Stock, Add Stock, and Smart Stock
   Entry are unaffected** — none of these is touched by this decision;
   each remains exactly as already, separately governed.

## 5. Why This Is a Narrow Clarification, Not a Redesign

- The **type** (`UnitRelationship.sellingUnit`) is unchanged — already
  declared, already optional, already validated correctly.
- The **conversion engine** is unchanged.
- The **only** thing this decision would authorize is a change to *which
  already-valid value* a read-time default resolves to, for the single,
  narrow case of an *existing* product that already has a *confirmed*
  `sellingUnit` — a case UOM Specification §4's own text could not have
  contemplated at the time it was written, since Periodic Contagem itself
  had no mechanism to set `sellingUnit` until the later, separately-
  signed Decision 37 B.2 addendum created one.
- Per §4's own text ("only the reference point itself, `units[0]`, is
  fixed here" — implying the *mechanics* were always meant to be a
  Rule 8/implementation concern), this decision is best read as
  completing that same deferral, for the one case its original drafting
  genuinely could not have addressed, rather than reopening a settled
  question.

## 6. Effect on the Prior Rule 8 Assessment and Implementation Plan

[`periodic-contagem-existing-product-selling-unit-memory-rule8-assessment.md`](./periodic-contagem-existing-product-selling-unit-memory-rule8-assessment.md)
(status: **CONDITIONALLY READY**) and its companion
[`periodic-contagem-existing-product-selling-unit-memory-implementation-plan.md`](./periodic-contagem-existing-product-selling-unit-memory-implementation-plan.md)
both explicitly flagged, in their own §12/§10 respectively, the exact
open item this addendum resolves. **Per the instruction under which this
addendum was drafted, neither of those two documents is edited by this
session.** If and when this addendum is signed, they will need a
follow-up pass (not performed here) to: (a) reference this addendum as
the closing governance basis for their own previously-open item; (b)
update the Rule 8 Assessment's verdict from **CONDITIONALLY READY** to
**READY**; and (c) remove the "pending" qualifier from the Implementation
Plan's own status line — all before either document may serve as the
basis for an Implementation Authorization. That follow-up pass is
explicitly **not** performed by this document, per this session's own
sequencing instruction ("we can sign that, then update the Rule 8
Assessment/Plan, and only then proceed to Implementation Authorization").

## 7. Signature Gate — Formal Acceptance

**Status: ✅ SIGNED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I, as Product Architect, formally accept and sign the UOM
> Specification §4 / Existing-Product Periodic Contagem Reference-Point
> Reconciliation Addendum, including the complete decision recorded in
> §4 above: for an existing product with a confirmed
> `UnitRelationship.sellingUnit`, Periodic Contagem's mixed-unit
> valuation step uses that confirmed selling unit — not `units[0]` — as
> its reference point, falling back to `units[0]` exactly as today
> whenever no `sellingUnit` is confirmed. No new field, no new
> conversion mechanism, no per-count owner-configurable reference choice
> is introduced. New-product setup, Add Portion, Cost Price, Initial
> Stock, Add Stock, and Smart Stock Entry are unaffected.
>
> This signature extends UOM Specification §4's own deferred technical
> mechanics for one previously-unaddressed case — it does not reopen,
> reverse, or reinterpret any other part of §4, or any other governance
> document named in this addendum's own header, all of which remain
> unedited and accurate as historical record.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: I APPROVE AND SIGN
> Date: 29 August 2026

**This addendum does not authorize implementation, even once signed.** A
further, separate follow-up pass to the Rule 8 Assessment/Implementation
Plan (§6, above), and a distinct, signed Implementation Authorization,
both remain required before any code is written.

---

## Governance Notes

- This document does not modify `BDR-0012`, any POL document, the UOM
  Specification, `business-worth-evolution-specification.md`, the signed
  Decision 37 B.2 addendum, or either of its Plan/Authorization
  documents — every one of these remains byte-for-byte unedited.
- This document does not implement code, modify runtime behavior, or
  edit any `src/`, `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `package.json`, or test file.
- This document does not create an Implementation Authorization and does
  not itself authorize coding.
- This document does not modify the prior Rule 8 Assessment or
  Implementation Plan it references — see §6 for the explicitly-deferred
  follow-up pass.
- No Product-level "selling portions" configuration is introduced or
  implied anywhere in this document.
- Initial Stock, Add Stock, Smart Stock Entry, Cost Price removal, and
  Add Portion's persistence semantics are confirmed out of scope and
  untouched.

**Lifecycle:** Governance conflict investigated → reconciliation
addendum drafted → **signed** (§7, 29 August 2026) → available as
governing basis for a follow-up pass updating the Rule 8
Assessment/Implementation Plan from **CONDITIONALLY READY**/pending to
**READY**. That follow-up pass has not been performed — this signature
alone does not update either of those two documents (§6, above, remains
accurate: they are unedited by this document). Not yet Authorized (for
implementation), not Implemented, not Verified, not Closed — no
engineering work is authorized by this signature.
