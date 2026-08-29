Business Decision Record — Amendment

# BDR-0013 Amendment — Owner-Controlled Correction of a Remembered Supplier-Wording Relationship

Version 1.0
**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See
"Product Architect Acceptance," below, for the complete signed
decision, including explicit resolution of every point flagged in §4.
**Implementation status:** Not started. This document is governance
only. It does not itself implement code, modify runtime behavior, or
change `firestore.rules`, `src/`, `apps/`, or `server/`. Acceptance of
this amendment authorizes a Rule 8 Assessment for this capability to
begin (see §8, Governance Sequencing) — it does not itself authorize
implementation, which remains gated behind that Rule 8 Assessment, an
Implementation Plan, and a separate, signed Implementation
Authorization, exactly as the completed Product Recognition
Intelligence chain was gated.
**Amends:** [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md)
item 3 (specifically its "Standalone/post-hoc correction" clause) and
item 7 (specifically its cross-reference to item 3 as the exclusive
post-finalization correction path) — narrowly, exactly the scope
identified in §3 below. No other item of `BDR-0013` is touched.
**Does not amend:** `POL-0007`, `POL-0011`, `POL-0012`, `ADR-0008`,
`POL-0013`, the Product Recognition Intelligence Rule 8 Assessment,
Implementation Plan, or Implementation Authorization — see §6 for the
complete preserved-boundary list. Does not amend `Product`,
`SupplierWordingRelationship`, or any other schema in `types.ts`.
**Origin:** Identified directly by a read-only Product Recognition
Intelligence follow-on investigation (this session), conducted against
verified commit `736bb9bf3df3361588a6b73646245b619efd7dfc`. Not a
Rule 8 finding — Rule 8 has not been opened for this capability. The
investigation found, by direct code trace, that no Owner-facing
mechanism exists anywhere in the application to inspect, remove, or
redirect an already-confirmed `SupplierWordingRelationship`, and — by
direct re-reading of `BDR-0013` and `POL-0007` — that this gap is not
an oversight but a deliberately narrow, already-closed decision (§3
of this document quotes the exact text).
**Depends on:** `BDR-0013` (Approved), `POL-0007` (Approved), and the
already-completed, already-verified Product Recognition Intelligence
governance chain (`ADR-0008`, `POL-0013`, its Rule 8 Assessment,
Implementation Plan, and signed Implementation Authorization) — this
amendment does not reopen or modify any of them; it exists because
their completion is what raises the practical stakes of the gap
described in §2, below.

---

## 1. Problem Statement

`BDR-0013` items 3 and 7, quoted verbatim from the current, Approved
document:

**Item 3, "Standalone/post-hoc correction" clause:**

> *"if an already-confirmed supplier-wording-to-product relationship
> later proves to be incorrect, the owner may correct the underlying
> product identity/name by correcting the product's Initial Stock
> name, which remains the primary/reference product name (item 2,
> above); the corrected Initial Stock name should match the correct
> supplier wording where appropriate, consistent with item 2's
> requirement that the Initial Stock name match at least one
> supplier's wording. This is an owner-controlled correction of the
> product's Initial Stock name — it is not a silent, automatic
> reassignment of a remembered supplier relationship. This closes
> only this residual standalone-correction gap; it does not alter
> item 7's separate rule that stock-entry products are editable
> before purchase/receipt confirmation and immutable after."*

**Item 7, "Lifecycle/correction":**

> *"Before a purchasing receipt/stock purchase is confirmed, each
> product entry remains editable... After the purchasing receipt is
> confirmed, there is no Edit option and no Delete option — the
> confirmed purchase is final/immutable... Whether, and how, an
> already-confirmed supplier-wording-to-product relationship could
> ever be corrected independent of any specific stock entry — i.e.,
> after the receipt containing it is already finalized — is resolved
> separately by item 3, above (via correction of the product's
> Initial Stock name); this item's own editable-before/immutable-after
> rule for a purchase receipt's product entries is unchanged and
> unaffected by that resolution."*

Read together, these two items settle a narrower question than they
might first appear to. Item 3's correction mechanism is a rename of
the misattributed product's own reference name (`Product.name`) — it
solves the case where a relationship correctly points at the right
underlying product, but that product's own Initial Stock name should
be adjusted to match the wording better. It does **not** solve the
case where a relationship points at the **wrong product entirely** —
two products, each already correctly named, where the relationship
was simply confirmed onto the wrong one. Item 3 says so explicitly:
*"This closes only this residual standalone-correction gap."* Item 7
then explicitly delegates all post-finalization correction to item 3's
mechanism and authorizes nothing else.

**Direct code trace confirms this is the actual, current behavior, not
a theoretical reading.** No file in `apps/tenant/src` or
`apps/superadmin/src` other than the recognition/confirmation library
files, `AppContext.tsx`, and `types.ts` references
`supplierWordings` at all. `EditProductModal.tsx` — the only
product-editing screen — edits `name`/`category`/`supplier`/`sku`/
`barcode`/`costPrice`/`sellingPrice` only. There is no view, no
removal, and no reassignment of a confirmed relationship anywhere in
the application today.

## 2. Why This Amendment Is Necessary Now

Product Recognition Intelligence (`ADR-0008`/`POL-0013`, verified
complete at `736bb9b`) substantially expanded the set of mechanisms
that can produce a candidate an Owner might confirm: character/typo
spelling variation, curated abbreviations, curated synonyms, curated
translations, and semantic/AI-assisted candidate discovery — in
addition to the original exact/normalization-level grounds `BDR-0013`
and `POL-0007` already governed. Every one of these mechanisms is,
by design and by the Product Architect's own prior acceptance,
suggestion-only — the Owner remains the sole decision-maker (`BDR-0013`
Decision 4). That discipline is sound and is not in question here.

What Product Recognition Intelligence changes is the **frequency and
plausibility** of a wrong Owner confirmation, not its possibility —
that possibility already existed under the original three grounds and
was already, correctly, left uncorrected-for-wrong-product by `BDR-0013`
item 3. A semantic/AI-sourced candidate, or a translation/synonym
match, is inherently more likely to be a plausible-but-wrong guess
than a normalization-level string match, simply because the signal it
fires on is weaker evidence of true identity. Once a wrong confirmation
of this kind is made, item 3's existing correction mechanism (rename
the product) does not help — the product the wording was wrongly
attached to already has a perfectly correct name; renaming it would
not un-attach the wording, and would incorrectly rename a product that
was never actually the problem. Today, an Owner in this situation has
no in-app recourse at all: the wrong relationship silently and
permanently reuses on every future occurrence of that wording from
that supplier, with no visibility and no correction path.

**This is a genuine new business decision, not an implementation gap
inside the already-authorized Product Recognition Intelligence work.**
Nothing in `ADR-0008`, `POL-0013`, the Rule 8 Assessment, the
Implementation Plan, or the Implementation Authorization mentions
correction, removal, or reassignment of a confirmed relationship —
that entire governance chain is scoped to what produces candidates,
never to what happens after REMEMBER. This amendment sits entirely
downstream of it and does not reopen any part of it.

## 3. Proposed Business Decision

**If accepted, `BDR-0013` item 3's "Standalone/post-hoc correction"
clause and item 7's cross-reference to it are extended — not
replaced — by the following additional, explicit business rule:**

> An Owner may explicitly correct a previously remembered
> supplier-wording-to-product relationship.
>
> The Owner may:
>
> **A. Remove** the incorrect remembered relationship, allowing the
> wording to become unremembered and go through the normal
> recognition/Owner-decision flow again on its next occurrence; and/or
>
> **B. Redirect** the remembered wording to another existing product,
> through an explicit Owner-controlled confirmation.
>
> The system must never automatically remove, reassign, merge, or
> correct a remembered relationship. Any correction must be an
> explicit Owner decision — consistent with `BDR-0013` Decision 4's
> existing "suggest, never decide silently" boundary and Decision 5's
> existing prohibition on silent merging, renaming, or historical
> reinterpretation, both of which this amendment extends to the
> correction lifecycle without altering their existing text or scope.
>
> After a correction is successfully persisted, future occurrences of
> that supplier wording must be resolved against the corrected state —
> no separate technical mechanism is authorized or required to make
> this true; it is the same reuse-matching behavior `BDR-0013` item 3
> and `POL-0007` Business Requirement 7 already establish, applied to
> whatever the remembered state currently is.
>
> The correction must not alter the canonical product name (except
> where the Owner separately invokes item 3's own existing, unchanged
> rename mechanism), Business Worth, Stock Count history, UOM/
> `unitRelationship`, or any product's data other than the specific
> relationship(s) being corrected. A redirect touches exactly two
> products — the one the relationship is removed from and the one it
> is established onto — and no other product's own remembered
> relationships.
>
> The correction must remain tenant-scoped and must require the same
> access tier already governing every other write to a `Product`
> document.
>
> Establishing the replacement relationship (part B) remains subject
> to the same protections `BDR-0013` item 3 (confirmation discipline)
> and item 5 (conflict handling) already require of establishing any
> supplier-wording relationship — this amendment does not create a
> lower-friction or differently-protected path to the same class of
> write.

## 4. Points Flagged for Explicit Product Architect Resolution — Now Resolved

The following three points were surfaced for explicit decision rather
than assumed. All three are now resolved by the Product Architect's
acceptance, below; each is recorded here alongside the original
flagging for a complete record of what was open and how it was
closed.

**4.1 — Access tier: Owner-only, matching the existing `Product` write
tier.** *Flagged because* the proposed decision text said
"Owner-authorized" without specifying whether this meant the Owner
specifically, or the broader Owner-tier including any staff permission
level, and current `firestore.rules` gates `update`/`delete` on a
`Product` document to `isOwnerOf(businessId)` exclusively.
**RESOLVED — Owner-only.** The Product Architect's acceptance states
plainly: *"Correction is Owner-only."* This confirms the recommended
reading exactly: this correction capability follows the same,
already-existing Owner-only tier every other `Product` write already
uses — Staff have no access to it, matching `EditProductModal.tsx`'s
own existing tier. Not a new restriction; the already-existing one,
now explicitly on the record for this capability.

**4.2 — Surface scope: supplier stock entry only, or also Product
Catalog / product-detail context?** *Flagged because* `POL-0007`
Business Requirement 3 explicitly and deliberately scopes the
*original* owner-initiated declaration to supplier stock entry only,
stating plainly that it "is not a general Product Catalog operation" —
a boundary this amendment could not assume automatically carried over
to a materially different action (correcting an existing relationship,
at a time unrelated to any specific stock receipt, rather than
declaring one while receiving stock).
**RESOLVED — Product Catalog/detail context, explicitly.** The Product
Architect's acceptance states: *"Correction may be initiated from the
Product Catalog/detail context."* This is a deliberate, explicit
Product Architect decision that the correction capability's surface
scope is **not** the same as `POL-0007` Business Requirement 3's
scope for the original declaration — declaration remains bounded to
supplier stock entry (unchanged, per §6); correction is authorized
from Product Catalog/detail context instead. This is recorded here
precisely so a later reader does not mistake this for an oversight or
silently assume the two capabilities share one surface rule — they do
not, by explicit decision.

**4.3 — Whether a correction action should produce a durable record of
what changed.** *Flagged because* the app already has an established
pattern (`buildProductCreatedTimelineEventContent`, `TimelineEvent`)
for recording significant, Owner-attributable actions, and the
proposed decision text did not address whether a correction should
leave an equivalent record.
**RESOLVED — Required.** The Product Architect's acceptance states:
*"the action must be recorded through the existing audit/timeline
mechanism."* A correction (removal or redirect) must produce a
`TimelineEvent` (or the equivalent existing audit mechanism already
governing comparable Owner actions in this capability area) —
extending the existing pattern already established for the adjacent
conflict-path new-product-creation case, not inventing a new one. The
specific technical shape of that record (event type, `details` field
contents) remains undecided by this amendment, consistent with §5's
"does not decide any technical mechanism" boundary — only that a
record is required, is settled here.

## 5. What This Amendment Does Not Decide

- Does not decide any technical mechanism: not a specific Firestore
  operation, not a specific function, not a specific transaction
  shape, not whether "remove" and "redirect" are one operation or two
  composed operations. `BDR-0013` item 3's own closing sentence sets
  this precedent explicitly for the sibling capability it governs
  ("nor any data model, schema, alias-table design, matching
  algorithm... UI implementation, or migration rule") and this
  amendment follows the same discipline.
- Does not decide UI placement, beyond the scoping question flagged in
  §4.2, which is a business boundary, not a screen choice.
- Does not introduce, require, or preclude a new Firestore collection.
  Direct investigation found the existing `(supplierRecordId, wording)`
  compound key — already the unique identifier used throughout the
  existing matching, conflict-detection, and idempotency logic — is
  sufficient to identify a specific relationship for this purpose; this
  amendment records that finding as context, not as a technical
  commitment, since choosing the actual mechanism remains a later
  gate.
- Does not decide whether the existing `SupplierWordingRelationship`
  structure requires a new field. Investigation found no evidence that
  it does; this amendment does not itself add one.
- Does not reopen `BDR-0013` item 1, 2, 4, 5, 6, 8, or 9 — all remain
  exactly as previously Accepted.
- Does not reopen, modify, or require rework of `POL-0007`, `POL-0011`,
  `POL-0012`, `ADR-0008`, `POL-0013`, or any part of the completed
  Product Recognition Intelligence Rule 8 Assessment, Implementation
  Plan, or Implementation Authorization.
- Does not authorize implementation, a Rule 8 Assessment, a
  Specification, or an Implementation Authorization for this
  capability — all remain separate, later, required gates (see §7).

## 6. Preserved Boundaries — Explicitly Confirmed Unaffected

The following are unchanged and unaffected by this amendment, per
direct investigation against the committed state:

- **Owner authority** — unchanged; this amendment extends where Owner
  authority applies, never narrows or automates around it.
- **Existing supplier-specific memory semantics** — unchanged. Reuse
  remains scoped to the same supplier that established it
  (`findExistingSupplierWordingMatch`); this amendment does not alter
  that scoping for the ordinary (non-corrected) case, and a corrected
  relationship is governed by the same scoping once established.
- **Existing confirmation/conflict protection** — unchanged;
  explicitly re-affirmed as applying to the establishment half of a
  correction (§3, above).
- **Existing product creation path** (`addStockBatch`,
  `addMultipleStockBatches`, `recordStockCount`) — untouched; not
  referenced by this amendment.
- **Existing `SupplierWordingRelationship` storage model** — the
  inline array-on-`Product` model, not a subcollection — unchanged;
  investigation found no evidence requiring a schema change.
- **Existing Product identity** — `Product.id`/`Product.name` —
  unchanged; a correction never rewrites either, per §3's explicit
  "must not alter the canonical product name" clause.
- **`unitRelationship`** — unchanged; explicitly excluded by §3.
- **Product Memory pricing behavior** — unchanged; explicitly excluded
  by §3.
- **Business Worth** — unchanged; explicitly excluded by §3.
- **Stock Count / finalization** — unchanged; explicitly excluded by
  §3.
- **Tenant isolation** — unchanged; explicitly required by §3, and
  already structurally guaranteed by the existing `businesses/
  {businessId}/products/{productId}` path and `isOwnerOf(businessId)`
  rule this amendment relies on, not replaces.
- **No autonomous product creation** — unaffected; not referenced.
- **No autonomous product selection** — unaffected; explicitly
  re-affirmed by §3's "must never automatically... reassign" clause.
- **No autonomous merge** — unaffected; explicitly re-affirmed.

## 7. Explicitly Not Authorized By This Amendment

Recorded here for clarity, even where largely implied by §3/§5/§6
above:

- Automatic correction of a remembered relationship, by any mechanism.
- Automatic reassignment or redirection, by any mechanism.
- Automatic deletion of a remembered relationship, by any mechanism.
- Any AI or recognition mechanism (including the semantic/AI mechanism
  Product Recognition Intelligence already authorizes for candidate
  *discovery*) autonomously deciding that a remembered relationship is
  wrong, flagging one for removal, or acting on such a determination
  without explicit Owner action.
- Confidence-based autonomous correction of any kind.
- Any background job, scheduled process, or batch operation that
  corrects, removes, or reassigns relationships without a specific,
  contemporaneous Owner action.
- Any cross-tenant operation of any kind.
- Any change to Business Worth, Stock Count/finalization, UOM/
  `unitRelationship`, or Product Memory pricing behavior.
- Any redesign of Product Memory beyond the narrow correction
  capability described in §3.
- Automatic product merging.
- Any change to canonical product identity (`Product.id`,
  `Product.name`) without a separate, explicit Owner action (item 3's
  own existing rename mechanism, unchanged).

## 8. Governance Sequencing

This amendment authorizes the **business decision** only. It does not
itself authorize implementation. Per this repository's established
sequencing (directly mirrored from the completed Product Recognition
Intelligence chain: `ADR-0008` → `POL-0013` → Rule 8 Assessment →
Implementation Plan → Implementation Authorization), the next required
steps — now unblocked by acceptance, but not themselves performed by
it — are:

1. A Rule 8 Assessment for this capability specifically, evaluating
   the technical questions this amendment deliberately leaves open
   (§5): storage/identification mechanism, transaction shape,
   composition of "remove" and "redirect," and resolution of the §4
   flagged points if the Product Architect defers their resolution to
   Rule 8 rather than settling them here.
2. An Implementation Plan, translating the READY Rule 8 Assessment
   into concrete, phased engineering scope.
3. A signed Implementation Authorization, before any application code,
   test, or schema change is written.

This document does not create, imply, or pre-authorize any of the
above. It is the first, and only the first, of four required gates.

## Governance Notes

- No `src/`, `apps/`, `server/`, or `firestore.rules` file has been
  modified to produce this document.
- This amendment does not modify `BDR-0013`'s own file in place —
  consistent with this repository's established "amend additively,
  never rewrite" pattern (see `product-identity-alternative-name-
  terminology-amendment.md` and `20-bdr-0007-closing-cadence-
  amendment.md` for direct precedent). A reader must consult this
  amendment alongside `BDR-0013` itself; §3, above, is the
  authoritative additional text for item 3/item 7's correction
  lifecycle going forward, once and if accepted.
- Filed under `docs/specs/`, using a descriptive (not `BDR-0013-`
  prefixed) filename, matching the established naming convention for
  amendments to a standalone, unprefixed `BDR-NNNN-topic.md` document
  (direct precedent: `product-unit-of-measure-reconciliation-
  amendment.md`, which amends `BDR-0009` the same way).
- This document was produced by a read-only investigation followed by
  drafting only — no code, test, or other governance document was
  read-modified; only this new file was created.

---

## Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I authorize the proposed amendment to BDR-0013, establishing an
> explicit Owner-controlled correction capability for previously
> remembered supplier-wording-to-product relationships. Correction is
> Owner-only and may remove an incorrect relationship or explicitly
> redirect it to another existing product. The system must never
> automatically remove, reassign, merge, or correct a remembered
> relationship. Correction may be initiated from the Product
> Catalog/detail context, and the action must be recorded through the
> existing audit/timeline mechanism. All existing tenant-isolation,
> confirmation, conflict, canonical-product, Product Memory, Business
> Worth, Stock Count, UOM, and finalization boundaries remain
> unchanged.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026

This acceptance takes effect immediately: the business decision
recorded in §3 of this document is now authoritative, together with
the three explicit resolutions recorded in §4 (Owner-only access tier;
Product Catalog/detail-context surface scope, explicitly distinct from
`POL-0007` Business Requirement 3's supplier-stock-entry-only scope
for the original declaration; and a mandatory audit/timeline record
for every correction). Every boundary listed in §6 (preserved,
unaffected) and §7 (explicitly not authorized) remains exactly as
recorded, reaffirmed by this acceptance's own closing sentence.

This acceptance does **not** itself authorize Rule 8 work,
implementation, or a separate Implementation Authorization — each
remains its own, separate, required gate per §8. It authorizes a Rule
8 Assessment for this capability to **begin**; it does not itself
constitute one.
