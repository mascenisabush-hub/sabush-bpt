Business Domain Specification

> **Amendment drafted (not yet accepted) — see
> [product-identity-alternative-name-specification-unit-spelling-amendment.md](./product-identity-alternative-name-specification-unit-spelling-amendment.md).**
> §3 step 2 below would gain a third candidate ground — unit-spelling
> equivalence (e.g. "2L" ≡ "2 Lt"), unit token only, quantity never
> normalized away — per POL-0011. Grounds (a) and (b) below are
> otherwise unchanged and remain fully in force, as is everything else
> in this document. This document's own text below is preserved as the
> original historical record and is **not** edited to reflect the
> amendment unless and until that amendment is itself separately
> accepted; read the amendment document for its current status.

> **Amendment ACCEPTED (2026-09-06) — see
> [product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md](../engineering/product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md).**
> Two corrections apply, added below as new §4a and §7a rather than by
> editing §4 or §7 in place: (1) §4's original text treats "no candidate
> was ever detected" the same as "owner declined a candidate," routing
> both to silent automatic new-product creation — §4a corrects this,
> per accepted Product Architect Decision A. (2) §7's "Periodic
> Contagem: not in scope" line remains true for Supplier-Wording
> Recognition specifically — §7a adds narrower, separate coverage
> bringing Periodic Contagem within the general Existing/New
> identity-resolution principle only, per accepted Decision A-Contagem.
> §4 and §7's own original text below is preserved unmodified as the
> historical record of what this Specification originally decided;
> §4a/§7a state what now additionally governs.

# Supplier-Wording Recognition, Confirmation & Conflict — Specification

**Status:** ✅ Accepted (2026-08-19). See "Product Architect Acceptance," below. **Amended (2026-09-06) — see §4a, §7a, and "Product Architect Acceptance" (amendment), below.**
**Location note:** Filed in `docs/specs/`, unprefixed — this capability is cross-cutting (Product Catalog, Initial Stock, Add Stock, Smart Stock Entry), following the same unprefixed naming pattern already established for this exact governance lineage by `BDR-0013`, `POL-0007`, and the accepted UOM Specification.
**Depends on:** [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md) (Approved, all nine §5 items ACCEPT), [`POL-0007`](./POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md) (Approved).
**Amended by:** [`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](../engineering/product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md) (Accepted 2026-09-06) — see §4a, §7a.
**Scope:** BDR-0013 §5 items 1, 3, 4, 5, 6, 7 only. **Item 8 (surface scope) is respected, not re-decided** — this Specification covers only Initial Stock, Add Stock, and Smart Stock Entry, exactly as item 8 already establishes, **for Supplier-Wording Recognition specifically**. Periodic Contagem is separately, narrowly brought within the general Existing/New identity-resolution principle only (not Supplier-Wording Recognition itself) by the 2026-09-06 amendment — see §7a. **Item 9 (historical duplicates) is explicitly excluded from this Specification's scope** — see §12, below.
**Followed by:** Not yet drafted — Rule 8 Assessment, per this repository's established governance sequence, once explicitly authorized to begin (not authorized by this acceptance — see "Product Architect Acceptance," below). A **targeted** Rule 8 re-check of the 2026-09-06 amendment specifically is the next required gate for §4a/§7a — see that amendment document.

---

## 1. Purpose

Formalizes, at the technical-architecture level, the capability `BDR-0013` and `POL-0007` already approved at the business level: BPT may recognize that a supplier's own wording for a product differs from that product's Initial Stock name, propose (or let the owner directly declare) that the wording refers to an already-known product, and — once the owner explicitly confirms — remember that relationship for automatic reuse on future occurrences, all without ever silently establishing, merging, or reinterpreting product identity.

## 2. Data Model

**Conceptual model — a candidate representation, not a final storage architecture:** a supplier-scoped alternative-name relationship, associated with a reusable supplier identity, conceptually attached to the `Product` it refers to.

```
Product ←→ [one or more supplier-wording relationships]
  each relationship: { supplierRecordId, wording, confirmedAt }
```

**This illustrates the required concepts, not a committed schema.** Whether this is realized as an inline array on `Product` (mirroring the UOM Specification's own "Model B" precedent) or as a dedicated subcollection is a genuine open technical question this Specification does not resolve — **explicitly deferred to Rule 8**, which must weigh anticipated scale (many suppliers × many products) before committing to a final storage structure. What this Specification *does* fix, at the conceptual level: (a) a product may have more than one such relationship (`BDR-0013` item 1 — general/multiple alternative names), and (b) each relationship must reference a supplier identity (`BDR-0013` item 1's supplier-aware priority form) and the wording confirmed for it. Field names shown above (`supplierRecordId`, `wording`, `confirmedAt`) are illustrative of the required concepts, not a final schema — Rule 8 may rename, restructure, or relocate them, provided the underlying business concepts are preserved.

**Supplier-identity rationale, evidenced not invented:** `apps/tenant/src/types.ts` already distinguishes two different supplier concepts. `PurchaseBatch.supplier` (type `Supplier`) is an explicitly **immutable historical snapshot** — its own code comment states editing a `SupplierRecord` "must never rewrite any existing `PurchaseBatch.supplier` snapshot." `SupplierRecord` (with its own stable `id`) is the **reusable, forward-looking entity** `PurchaseBatch.supplierId` optionally references. Since a remembered relationship must persist and be looked up again on a future, separate purchase — not frozen at one point in time — `SupplierRecord.id` is the technically appropriate identity to key against. **This is a Specification-level technical judgment**, grounded in existing, unmodified data-model evidence — it is not a new business decision, and does not alter `SupplierRecord`, `Supplier`, or `PurchaseBatch` in any way. It remains open to Rule 8 to confirm or revisit this choice once the final storage structure is settled.

**Provenance — a business concept, not a committed field.** `POL-0007` Business Requirement 3 explicitly authorizes owner-initiated declaration as distinct from system-proposed confirmation, while stating both are governed identically once established (`POL-0007`, "Owner-Initiated Declaration — Scope and Boundaries": *"the relationship is governed identically... for every subsequent purpose"*). The system may therefore need to distinguish, at least at the moment of creation, whether a given relationship arose from a system-proposed confirmation or an owner-initiated declaration — but **whether, and how, this provenance is persisted (a stored field, an audit-log-only record, or not retained at all) is not decided by this Specification** and is left entirely to Rule 8.

**Absence of a confirmed relationship** for a given supplier-identity/wording pair means no relationship has yet been established for that combination — the exact condition triggering candidate detection (§3, below).

**Initial Stock name remains `Product.name`, unaffected.** This Specification does not introduce a second "name" field or rename `Product.name` — `Product.name` continues to be the single primary/reference name (`BDR-0013` item 2), and any supplier-wording relationship is strictly additive information pointing back to it, not a replacement for it. See §2a, below, for BDR-0013 item 2's matching requirement, which this Specification also acknowledges without deciding its validation mechanism.

## 2a. Initial Stock Name / Supplier-Wording Correspondence (`BDR-0013` Item 2)

`BDR-0013` item 2 establishes, as an already-accepted business rule, that: (1) the Initial Stock `Product.name` remains the primary/reference name for the product; (2) it should match at least one remembered supplier wording for that product; and (3) if the owner later discovers the Initial Stock name does not properly correspond to any remembered supplier wording, the owner should be able to correct the Initial Stock `Product.name` so that it does. This Specification restates this rule as still fully binding — nothing in §2's data-model discussion narrows, weakens, or supersedes it.

**This is a business requirement, not a technical validation rule, and this Specification does not decide whether or how it is actively enforced.** In particular, this Specification does not decide: whether the system checks this correspondence automatically at any point; what happens, technically, if no supplier wording exists yet for a newly-created product (since a genuinely new product may have zero remembered supplier wordings at Initial Stock time); or any validation, warning, or blocking mechanism. Correcting the Initial Stock name remains the same ordinary, already-existing field-editing behavior it already is today (`BDR-0013` Decision 2) — this Specification does not add a new correction mechanism, only confirms that the existing one remains how this rule is satisfied when the owner acts on it. **Whether any active, system-driven validation of this correspondence should ever be built is left entirely to Rule 8**, if pursued at all; the business requirement stands independent of whether such validation ever exists.

## 3. Candidate Recognition Flow

1. **Trigger:** during Initial Stock, Add Stock, or Smart Stock Entry (item 8's surface scope), when a supplier wording is entered or extracted that does not match an already-confirmed relationship for the current supplier. **The precise matching criterion used to determine whether an incoming wording counts as a repeat of an already-confirmed relationship — exact or normalization-tolerant — is not decided here and is explicitly deferred to Rule 8 (see §6, below).** This trigger definition intentionally makes no commitment on that question; if the incoming wording matches under whatever criterion Rule 8 eventually settles, §6's reuse behavior applies instead of this candidate-detection flow.
2. **Candidate detection — grounds only, mechanism deferred.** Per `POL-0007`'s "Candidate Grounds" section, BPT may propose a candidate where the incoming wording shows normalization-level similarity to (a) an existing product's `Product.name`, or (b) an existing product's already-confirmed supplier-wording relationship (any supplier). **This Specification does not select the normalization method, string-comparison logic, or any threshold** — flagged explicitly for Rule 8, consistent with `POL-0007`'s own Technical Boundary and the identical treatment `POL-0003`/the UOM Specification give their own normalization concepts.
3. **No candidate found:** per `POL-0007` Business Requirement 3, the owner may still directly declare a relationship themselves during the same stock-entry workflow, without any system-proposed candidate — see §3a, below. If the owner does not declare a relationship either, the wording is simply entered as-is (ordinary, already-existing behavior — `BDR-0013` Decision 2), with no relationship created.
4. **One or more candidates found:** all plausible candidates are presented together (`BDR-0013` item 4; `POL-0007` "Multiple Candidates — No Presumed Ranking"). **This Specification does not decide candidate ordering, scoring, or a maximum count** — flagged for Rule 8.
5. **Confirmation moment — minimum shape only.** Per `POL-0007`'s "Confirmation Experience — Minimum Shape": each candidate is presented with, at minimum, that product's current `Product.name` (Initial Stock name); exactly two resolutions are offered per candidate — "same product" (confirm) or "different product"; no default action is taken if unanswered. **Exact UI copy, layout, and interaction flow are explicitly out of scope for this Specification** — Rule 8/implementation concern.
6. **Confirmed (YES):** a new supplier-wording relationship is established, associating the confirmed wording, the current supplier's identity, and the product — conceptually per §2, with its exact persistence left to Rule 8.
7. **Not confirmed (NO) — no candidate is the same product:** see §4, New-Product Path, below.

### 3a. Owner-Initiated Declaration

Per `POL-0007`'s explicit authorization, the owner may, while within the Initial Stock, Add Stock, or Smart Stock Entry workflow specifically, directly identify that a supplier wording refers to a specific existing product **without** a system-proposed candidate first appearing. Mechanically, this Specification treats this as establishing the identical kind of relationship as §3 step 6 above — differing only in how the confirmation moment was reached (owner-initiated rather than system-proposed), not in its effect or any downstream treatment (see §2's Provenance discussion). **This is not available outside these three surfaces** (`BDR-0013` item 8; `POL-0007` Business Requirement 3) — specifically, **not** from Product Catalog Editing, which item 8 continues to exclude from this general capability (the item 9 exception is scoped to historical-duplicate review only, and is out of this Specification's scope entirely — §12, below). **The exact UI mechanism for initiating this declaration is explicitly left to Rule 8/implementation** — this Specification fixes only that the capability must exist on these three surfaces and nowhere else.

## 4. New-Product Path

Per `BDR-0013` item 3 and `POL-0007` Business Requirement 6: when the owner indicates a proposed candidate is not the same product (or declines to declare a relationship at all), the incoming item is treated as an ordinary new product — there is no "reject alias" concept, no separate blocking state, and the owner is never forced to select an existing product. Technically, this means: no supplier-wording relationship is established; the stock entry proceeds exactly as it would for any product with no candidate ever detected, using the wording entered as the new product's `Product.name`. **This Specification does not decide the exact mechanism by which a "not the same product" response transitions the UI from candidate-review back to ordinary new-product entry** — Rule 8/implementation concern; the business/Policy requirement is only that this transition must occur without extra friction or forced selection.

**Preserved above as the original historical record.** §4a, immediately below, is a 2026-09-06 accepted amendment narrowing part of this section — read both together.

## 4a. Amendment (Accepted 2026-09-06) — No-Candidate Result Requires Explicit Owner Resolution

Per accepted Product Architect Decision A (`docs/engineering/product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`) and the amendment recorded at [`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](../engineering/product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md):

§4's own text above, read literally, treats two different situations identically — "the owner reviewed a proposed candidate and said 'not the same product'" and "no candidate was ever proposed at all" — routing both to the same silent, automatic new-product creation. **This equivalence is corrected, for the second situation only:**

- **Owner-declined candidate** (§4's original text, first situation): **unchanged.** An owner who has reviewed and explicitly declined a proposed candidate has, by that very act, already exercised the explicit resolution Decision A requires. No additional confirmation step is introduced for this case.
- **No candidate ever detected** (§4's original text, second situation): **corrected.** This case must **not** silently proceed to automatic new-product creation. Before the incoming item finalizes as a new Product, the owner must be given an explicit opportunity to resolve it as either an **Existing Product** (via a search/selection mechanism, not limited to whatever candidate mechanism did or did not fire) or an explicitly-confirmed **New Product**.

Three states govern going forward, and must remain distinguishable in whatever mechanism Rule 8/implementation selects:

1. **Automatic confident recognition** — an exact match, a reused confirmed relationship, or an owner-accepted candidate. No new interaction required.
2. **Unresolved identity** — no confident automatic match, and either no candidate exists or every candidate was declined. Requires the explicit Existing/New resolution step this amendment adds.
3. **Explicit owner-confirmed New Product** — the outcome of state 2 when the owner selects "New Product." This is the only path that may result in `Product` creation with no prior match, and must be recorded as distinct from state 2 merely never having been reached.

**When the owner resolves to an Existing Product:** applicable canonical Product Memory (`sellingPrice`, `sellingUnit`, `unitRelationship`) is retrieved for that Product exactly as it already is for every other resolution path in this Specification (§4 of `product-memory-purchase-selling-valuation-specification.md`, unaffected) — no new retrieval mechanism is introduced.

**Not decided by this amendment** (left to Rule 8/implementation, per this Specification's own existing discipline in §11): the exact similarity/matching algorithm, model, or confidence threshold; UI design, layout, or interaction flow for the new resolution step; candidate ranking or maximum count; the exact technical mechanism (flag, field, or otherwise) recording state 3 as distinct from state 2. **Not altered by this amendment:** any already-valid automatic recognition path (§3, §6); the conflict-handling/distinguishing-information gate (§5); barcode/SKU behavior (not addressed by this Specification at all).

## 5. Conflict Handling & Mandatory Distinguishing Information

Per `BDR-0013` item 5 and `POL-0007`'s "Conflicting Supplier Wording — Distinguishing Information: ACCEPT, Mandatory": when a supplier's wording already has a confirmed relationship pointing to Product A, but the owner determines the current occurrence is a genuinely different product:

1. BPT must warn/flag that this wording is already associated with Product A (`BDR-0013` item 5).
2. The owner may choose to use Product A anyway (no new product, no distinguishing information required — this is the ordinary confirmation path, §3 step 6, applied to an already-confirmed candidate).
3. **If the owner instead creates a new, different product, distinguishing information must be captured and the new product's creation does not complete until it is provided** (`POL-0007`, explicit Product Architect Decision A).

**What this Specification does not decide:** the field(s), format, or minimum content of "distinguishing information"; how it is captured, validated, or stored; any data model, schema, or database structure for it; any UI/validation mechanism. **All of the above are explicitly flagged for Rule 8** — `POL-0007` itself withholds these, and no other governing artifact supplies them. This Specification fixes only the *requirement gate* (distinguishing information must exist before the new product's creation is considered complete), not its shape, content, or persistence mechanism.

## 6. Reuse of an Already-Confirmed Relationship

Per `BDR-0013` item 3 and `POL-0007`'s "Reuse of an Already-Confirmed Relationship": once a relationship has been confirmed for a given supplier identity and wording, a future occurrence of that same wording from that same supplier is automatically recognized and reused — the relationship's target product is retrieved directly, without re-asking the owner to confirm. **Whether "the same wording" requires byte-exact matching, or tolerates normalization-level variation (case, spacing, punctuation, accent) before being treated as a repeat, is explicitly left to Rule 8** — `POL-0007` itself defers this, and this Specification does not resolve it either; §3 step 1's trigger definition is written to depend on, not pre-empt, this same determination. Both the initial-candidate-detection normalization method (§3) and this reuse-matching question may, but need not, use the same technical approach — that equivalence, if any, is a Rule 8/implementation decision, not fixed here.

## 7. Screen-by-Screen Behavior

- **Initial Stock:** `Product.name` (the Initial Stock name) remains a freely editable text field, unchanged (`BDR-0013` item 2; already-existing behavior per the Discovery Report §5). `BDR-0013` item 8 explicitly includes Initial Stock in this capability's surface scope, and this Specification preserves that scope in full — Initial Stock is **not** removed or narrowed here. **However, unlike Add Stock and Smart Stock Entry, direct code inspection confirms `InitialStockCountView.tsx` currently contains no supplier concept whatsoever** (zero references to any supplier entity or field), in contrast to `AddStockView.tsx` and `server/smartStockEntry.ts`, both of which already carry rich supplier context. Since this capability's recognition mechanism depends on associating a wording with a supplier identity (§2), **this Specification explicitly flags, as an open technical/design question for Rule 8, how supplier context is established for the Initial Stock workflow** — if a supplier identity is required for a given Initial Stock entry to participate in this capability at all, and if so, by what mechanism it would be captured, given none exists in the surface today. This Specification does not invent that mechanism, and does not assume Initial Stock behaves identically to the other two surfaces merely because item 8 includes it — item 8's *business* inclusion of Initial Stock stands; *how* the technical mechanism applies there is left open.
- **Add Stock:** the candidate-recognition flow (§3) applies when a supplier wording is entered for a product being added to existing stock. Owner-initiated declaration (§3a) is available on this surface. Confirmed via code inspection: `AddStockView.tsx` already carries substantial supplier context, consistent with this capability applying here without the open question flagged for Initial Stock, above.
- **Smart Stock Entry:** extraction behavior is unchanged — OCR continues to extract whatever wording a receipt literally states, per `04-smart-stock-entry-amendment.md`'s existing, unmodified governance. Once extraction completes, the review screen is where candidate-recognition (§3) and owner-initiated declaration (§3a) apply, consistent with `BDR-0013` item 3's trigger ("entering the supplier's receipt"). **The precise integration mechanics — whether candidate detection runs inline during OCR processing or only once the review screen is reached — are not determined by any governing decision and are explicitly left as a Rule 8 gap**, mirroring the identical unresolved question the UOM Specification itself flagged (§3, step 6) for Recognition's own Smart Stock Entry integration.
- **Product Catalog Editing:** **not in scope for this capability** (`BDR-0013` item 8's exclusion, unaffected by this Specification). The item 9 exception (historical-duplicate review) is a separate capability, explicitly out of this Specification's scope (§12, below).
- **Periodic Contagem:** **not in scope** (`BDR-0013` item 8's exclusion). **Preserved above as the original historical record — this exclusion remains true for Supplier-Wording Recognition specifically. See §7a, immediately below, for a 2026-09-06 accepted amendment adding narrower, separate coverage.**

## 7a. Amendment (Accepted 2026-09-06) — Periodic Contagem Existing/New Identity Resolution

Per accepted Product Architect Decision A-Contagem (`docs/engineering/recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md`) and the amendment recorded at [`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](../engineering/product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md):

**§7's exclusion of Periodic Contagem, above, is not reversed with respect to Supplier-Wording Recognition.** Periodic Contagem continues to have no supplier concept, and continues not to run this Specification's own candidate-detection or reuse-matching mechanism (§3, §6) — unchanged, for the same reason already established (Rule 8 Finding 10, corrected: no supplier identity exists there to associate a wording with).

**What this amendment adds is narrower and separate.** Periodic Contagem is now within scope of the **general Existing/New identity-resolution principle** established by Decision A and §4a, above, applied through a mechanism that does not depend on supplier identity. When Periodic Contagem cannot establish Product identity with sufficient confidence from information already available within the owner's own business:

- the system must **not** silently create a new Product;
- the owner must be given an explicit Existing Product / New Product resolution before that count line finalizes as a new Product.

This mechanism:

- must **not** require supplier identity, in any form;
- must **not** require a cross-business Product query;
- must **not** automatically select among multiple plausible existing Products — an ambiguous case still requires explicit owner choice.

When the owner resolves to an Existing Product, applicable canonical Product Memory (`sellingPrice`, `sellingUnit`, `unitRelationship`) is retrieved for that Product exactly as it already is for every other resolution path (§4 of `product-memory-purchase-selling-valuation-specification.md`, unaffected) — no new retrieval mechanism is introduced.

**Not decided by this amendment:** which existing or new mechanism (e.g. the already-existing, supplier-agnostic Product Name Similarity capability, or some other design) implements this resolution for Periodic Contagem; the UI; ranking; candidate count; any recognition algorithm or threshold. **Not altered by this amendment:** Initial Stock, which remains outside this addition entirely (Decision A-Contagem addresses Periodic Contagem only); B2, Concept C, `StockBatch` selling-basis semantics, Business Worth, or Closing, all of which the governing Rule 8 assessments found conformant and unaffected.

## 8. Lifecycle — Pre-Confirmation Editability, Post-Confirmation Immutability

Per `BDR-0013` item 7 and `POL-0007`'s explicit acknowledgment (not redecision) of it: a supplier-wording candidate or owner-initiated declaration that is pending or newly-confirmed within a not-yet-finalized purchase receipt/stock entry is part of that same product entry, and therefore follows the existing draft/finalize architecture already governing `StockBatch`/`PurchaseBatch` line items (`04-smart-stock-entry-amendment.md`; confirmed via `types.ts`) — editable or removable, along with the rest of the entry, until the receipt is confirmed; immutable once it is. **This Specification does not introduce any new lifecycle state** — it specifies only that establishing any supplier-wording relationship during a not-yet-confirmed entry must not be persisted as a durable `Product` mutation until that entry's own existing finalization step occurs, consistent with the UOM Specification's own "proposal held in transient state, never written until confirmation" pattern for Recognition (§3, steps 2–4). **The exact technical mechanism for holding this pending state (client-side draft state vs. a server-side pending write) is explicitly left to Rule 8.**

## 9. Tenant Isolation

Whatever storage structure Rule 8 selects (§2), any supplier-wording relationship data will be associated with a `Product` document already scoped under `businesses/{businessId}/products/{productId}` per existing `firestore.rules` (member read/create, owner-only update/delete) — no new isolation rule is required. Any reference to a supplier identity will point to a `SupplierRecord` document under the identical `businesses/{businessId}/suppliers/{supplierId}` scope, already isolated the same way — no cross-tenant reference is introduced or possible under the existing rule structure.

## 10. Failure Modes

| Failure | Behavior |
|---|---|
| Candidate-detection mechanism unavailable/errors | Falls back to no candidate shown — owner may still declare a relationship themselves (§3a) or enter as a new product (§4), consistent with the UOM Specification's own Recognition-unavailable fallback. |
| Owner abandons confirmation mid-flow | No partial or implicit supplier-wording relationship is saved — mirrors §8's pre-confirmation transience. |
| Owner chooses "different product" in a conflict without providing distinguishing information | New-product creation does not complete (§5) — exact blocking mechanism left to Rule 8. |
| Stock entry is edited/deleted before receipt confirmation | Any pending supplier-wording relationship embedded in that entry is discarded along with it, consistent with item 7's existing rule (§8). |
| Supplier wording matches multiple products | All plausible candidates shown; owner must choose one or declare new (§3, step 4) — no default/silent resolution. |

## 11. Explicitly Out of Scope

- Normalization method, string-comparison/similarity algorithm, and any confidence threshold for candidate detection (§3) or reuse-matching (§6).
- Candidate ranking, ordering, or maximum-count limits (§3).
- The final storage architecture — inline array, dedicated subcollection, or otherwise — for supplier-wording relationships, and whether/how provenance (system-proposed vs. owner-initiated) is persisted (§2).
- **Performance characteristics, indexing strategy, scalability limits, query design, and any related optimization decisions** — not addressed anywhere in this Specification and explicitly deferred to Rule 8 in full.
- Distinguishing-information field(s), format, validation, and storage mechanism (§5).
- Any AI/OCR provider or model selection.
- UI design, layout, copy, or exact interaction flow, beyond the minimum shape stated in §3 step 5.
- API/endpoint design and implementation mechanics.
- The precise Smart Stock Entry integration/orchestration point (§7).
- Any resolution of `BDR-0013` item 9 (historical duplicates) — see §12, below; item 9 is not addressed by this Specification in any respect.
- Rule 8 Assessment and Implementation Authorization — separate, later gates.

## 12. Item 9 (Historical Duplicates) — Explicitly Excluded

`BDR-0013` item 9 (historical/pre-existing duplicate products, including its Product Catalog Editing exception for duplicate surfacing/review) is **not addressed by this Specification in any respect**. It is a temporally and conceptually distinct capability from items 1–7's forward-looking recognition flow: item 9 concerns already-existing catalog data with no defined trigger mechanism, and `POL-0007` itself does not cover it (its own "Depends on" line cites only `BDR-0013` items 1, 3, 4, and 5). Item 9 requires its own dedicated Policy (analogous to `POL-0007`, addressing its own candidate-signal/trigger question) before any Specification work can begin for it. This exclusion was flagged in the preceding Specification Readiness investigation and is carried forward here exactly as recommended, per your explicit instruction to treat item 9 as out of scope for this Specification.

## Governance Notes

- This Specification does not modify `BDR-0013`, `POL-0007`, `POL-0003`, `BDR-0012`, the accepted UOM Specification, `03-products.md`, `04-smart-stock-entry-amendment.md`, or any other existing artifact.
- No application code, schema, or `firestore.rules` change is made by this document.
- No new Product Architect business decision is made or implied by this Specification — every business/Policy-level statement above is a restatement of, or direct technical derivation from, `BDR-0013`'s and `POL-0007`'s already-approved text.
- Acceptance of this Specification does not itself authorize implementation, a Rule 8 Assessment, or an Implementation Authorization — both remain separate, required gates, consistent with the UOM Specification's own precedent.
- `BDR-0013` item 9 is not addressed by this Specification and requires separate governance work before any Specification exists for it (§12).

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-08-19).

> This Specification is accepted exactly as corrected following the adversarial governance review and its five MAJOR and two MINOR corrections (array-vs-subcollection reframed as a conceptual model deferred to Rule 8; `confirmedVia` removed from any committed schema and reframed as a conceptual provenance question; §3 step 1's "exactly match" trigger language corrected to no longer pre-decide the reuse-matching question §6 defers to Rule 8; the Initial Stock "applies identically" claim corrected with direct code evidence and reframed as an open technical question, with Initial Stock's BDR-0013 item 8 business inclusion fully preserved; `BDR-0013` item 2's must-match/owner-correction rule explicitly added as new §2a; the illustrative `distinguishingNote?` field removed; and an explicit performance/indexing exclusion added to §11). No further substantive change is made by this acceptance. This acceptance does not authorize Rule 8 Assessment, Rule 8 drafting, technical implementation, code changes, schema implementation, storage-architecture selection, AI/OCR provider or model selection, algorithm implementation, UI implementation, database migration, historical-data backfill, or Implementation Authorization — all remain separate, required gates, per this repository's established governance sequence (`19-governance-bdr-policy-framework.md`).

---

## Product Architect Acceptance — Amendment (2026-09-06)

**Status:** ✅ Accepted (2026-09-06). Covers §4a and §7a, above, only.

> Two amendments to this Specification are accepted: (1) §4a — a plain
> no-candidate recognition result must route through explicit owner
> Existing/New resolution before finalizing as a new Product, correcting
> §4's original equivalence between "owner declined a candidate" and
> "no candidate ever detected"; and (2) §7a — Periodic Contagem is
> brought within the general Existing/New identity-resolution principle
> via a supplier-independent, business-scoped mechanism, with
> Supplier-Wording Recognition itself remaining out of scope for
> Contagem per §7's original, unmodified exclusion. Full detail,
> rationale, and traceability recorded at
> [`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](../engineering/product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md).
> This acceptance does not touch B2, Concept C, `StockBatch`
> selling-basis semantics, Business Worth, Closing, or any section of
> this Specification other than §4a/§7a. This acceptance does not
> authorize Rule 8's own targeted re-check (the next required gate), an
> Implementation Plan, or an Implementation Authorization.
>
> **Product Architect:** SABUSHIMIKE MASCENI.
> **Date:** 2026-09-06.
