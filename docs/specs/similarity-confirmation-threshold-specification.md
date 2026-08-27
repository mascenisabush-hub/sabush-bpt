Business Domain Specification

# Similarity-Confirmation Threshold & Experience — Specification

**Status:** ✅ Accepted (2026-08-27). See "Product Architect Acceptance,"
below.
**Type:** Business Domain Specification, per the category established
in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)
§2. Formalizes, at the technical-architecture level, the capability
`BDR-0012` Decisions 10–11 and `POL-0003` already approved at the
business/policy level, together with `POL-0012`'s approved extension
to it. This is the **first Specification ever written for this
capability** — `POL-0003` has existed, Approved, since before this
Specification, with no Specification of its own; confirmed by direct
inspection of every other Specification in this repository that cites
`POL-0003` (`product-unit-of-measure-specification.md` §12,
`product-memory-purchase-selling-valuation-specification.md`'s own
"Explicitly Out of Scope" section), each of which explicitly names
`POL-0003`'s similarity mechanism as outside its own scope.
**Location note:** Filed in `docs/specs/`, unprefixed, under the same
cross-cutting naming convention `POL-0003` and its sibling
Specifications already use — the stem of `POL-0003`'s own filename
(`similarity-confirmation-threshold`), with `-specification` appended,
mirroring exactly how `product-identity-alternative-name-memory.md`
(BDR-0013) relates to `product-identity-alternative-name-specification.md`,
and how `product-unit-of-measure-product-memory.md` (BDR-0012) relates
to `product-unit-of-measure-specification.md`.
**Authorizing chain:** [`POL-0012`](./POL-0012-similarity-confirmation-threshold-unit-normalization-amendment.md)
(Approved — the Policy amendment introducing the third signal this
Specification formalizes), [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
and its Addenda (the Product Architect scope decision and the
subsequent rulings routing this exact artifact — Addendum 2, Ruling 1).
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md)
(Approved — Decisions 10–11, the business authority `POL-0003` itself
operationalizes), [`POL-0003`](./POL-0003-similarity-confirmation-threshold.md)
(Approved — the Policy this Specification formalizes in full for the
first time), `POL-0012` (Approved — the Policy amendment adding the
third signal).
**Followed by:** Not yet drafted, not derived by this record. Rule 8
Assessment and Implementation Authorization both remain required,
separately, after this Specification's own acceptance.

---

## 1. Purpose

Formalizes, at the technical-architecture level, the capability
`BDR-0012` Decisions 10–11 and `POL-0003` already approved at the
business level: when the system has reason to believe a newly entered
or scanned product may already exist under a different name, spelling,
or formatting — anywhere in the business's product catalog, regardless
of supplier — it may suggest a possible match to the owner, who must
explicitly resolve it as "same product" or "different product" before
either outcome (use the existing product, or create a new one) takes
effect. Nothing may ever be silently merged, renamed, reinterpreted, or
otherwise resolved by the system on this basis (`BDR-0012` Decisions
10–11; `POL-0003` Business Requirements 5, 6, 8).

**This capability is conceptually and architecturally distinct from
Supplier-Wording Recognition** (`BDR-0013`/`POL-0007`, formalized
separately by `product-identity-alternative-name-specification.md`).
`POL-0003` itself already draws this line explicitly (§"Relationship to
`POL-0003`" language mirrored in `POL-0007`): this capability is
catalog-wide (any product, regardless of supplier) and suggestion-only
— it never establishes a learned, remembered relationship the way a
confirmed supplier wording does, and it never writes to
`Product.supplierWordings`. This Specification preserves that
distinction throughout; see §7, below.

## 2. Data Model

**No new persisted data structure is introduced by this Specification.**
A candidate match is a transient, in-memory computation over the
business's existing `products` collection — not a stored record, not a
new field on `Product`, and not a new Firestore collection. This
mirrors the already-implemented shape of the capability (a pure,
client-side similarity function computed on demand) and introduces
nothing Rule 8 would need to reconcile against existing storage.

**Existing fields consulted, unchanged:** `Product.name`,
`Product.barcode`, `Product.sku` — all already exist and are already
stored today; `POL-0003`'s own text confirms `barcode`/`sku` were, at
the time of that Policy's approval, "confirmed unused for any matching
purpose" and that using them for this purpose is in scope. Whether
barcode/SKU matching has since been implemented, and if not, whether
this Specification's acceptance changes that, is addressed in §8
(Explicitly Out of Scope) and §10 (No Retroactive Compliance) — this
Specification does not itself determine current implementation status.

## 3. Candidate Signals

Per `POL-0003` Business Requirements 2–4 and `POL-0012`'s amendment,
the system may treat any of the following as grounds to suggest a
possible match, individually or together — combining/weighting
multiple signals is permitted but not decided here (`POL-0003`
Business Requirement 4; Technical Boundary):

1. **Name similarity, after normalization** (case, spacing,
   punctuation, and accent differences) — `POL-0003`'s original,
   approved signal.
2. **Shared barcode or SKU value** between a newly entered/scanned
   product and an existing one — `POL-0003`'s original, approved
   signal.
3. **Unit-spelling equivalence** (`POL-0012`) — two product names that
   are otherwise similar under signal 1 may be treated as more similar
   where they differ only in how a unit of measurement is spelled —
   e.g. `"2L"` and `"2 Lt"` may be treated as referring to the same
   unit. **This ground applies to the unit token only.** The quantity
   digit is never folded or treated as equivalent across different
   values — `"1L"` and `"2L"` remain distinct under this signal,
   exactly as under signal 1 alone.

**This Specification does not select the similarity algorithm,
string-distance metric, numeric confidence threshold, how multiple
signals are weighted or combined, or the normalization method for any
of the three signals above — including which specific unit spellings
signal 3 treats as equivalent** (e.g. whether `L`/`Lt`/`Ltr`/`Liter`/
`Litro` are all treated as one, or a narrower set) — all explicitly
left to Rule 8, exactly as `POL-0003`'s own Technical Boundary and
`POL-0012`'s own amendment both already defer this. The existing
numeric similarity threshold, wherever Rule 8 confirms or fixes it,
is not lowered, raised, or otherwise altered by this Specification —
`ADR-0007` §3 fixes it at `0.5` as a non-negotiable constraint (§9,
below).

## 4. Candidate Suggestion Flow

1. **Trigger:** when a product name is entered or extracted — via
   manual typing or Smart Stock Entry extraction — that does not
   exactly match an existing `Product.name` (ordinary exact matching,
   `matchProductByExactName` and equivalent client-side checks, remain
   completely unaffected and take priority; see §9). Catalog-wide in
   scope — every existing product in the business's catalog is a
   potential candidate, regardless of which supplier, if any, is
   associated with the current entry.
2. **Candidate detection:** the system may compute the signals in §3
   against the newly entered name and every existing product, and
   surface those clearing whatever threshold/algorithm Rule 8
   confirms. **This Specification does not decide candidate ordering,
   scoring, ranking, or a maximum count shown** — flagged for Rule 8,
   mirroring the identical deferral `product-identity-alternative-name-specification.md`
   §3 step 4 already makes for its own, separate candidate list.
3. **No candidate found:** the name is entered as-is — ordinary,
   already-existing behavior, no suggestion shown, no relationship of
   any kind created.
4. **One or more candidates found — confirmation moment.** Per
   `POL-0003`'s "Confirmation Experience — Minimum Shape": each
   candidate is presented with enough relevant information for the
   owner to understand why it was flagged — not a generic "possible
   duplicate" notice; exactly two resolutions are offered — "same
   product" or "different product"; no default action is taken if
   unanswered. **See §6, below, for this Specification's explicit,
   deliberate non-resolution of whether the current implementation's
   interaction already satisfies this minimum shape.**
5. **Confirmed "same product":** the newly entered name is treated as
   referring to the existing product. **This Specification does not
   decide how that treatment is technically realized** — e.g. whether
   the entered text is rewritten to the existing product's canonical
   name, or resolved by some other mechanism — left to Rule 8, subject
   to §7's binding constraint that no new persistence writer is
   introduced by this capability.
6. **Confirmed "different product":** the incoming item proceeds as a
   new product through the ordinary, already-existing product-creation
   path — this Specification introduces no new gate, requirement, or
   friction on that path beyond what already exists today.

## 5. Screen-by-Screen / Surface Scope

**Catalog-wide, not surface-restricted in the way Supplier-Wording
Recognition is.** `BDR-0013` item 8 scopes that separate capability to
Initial Stock, Add Stock, and Smart Stock Entry only; `POL-0003`
contains no equivalent surface restriction, and this Specification does
not invent one. Wherever a product name is entered or extracted
anywhere in the application, this capability may apply — the exact set
of screens it is actually wired into today, versus where it could
apply, is an implementation fact this Specification does not enumerate
or guarantee; see §10.

## 6. Confirmation-Experience Conformance — Explicitly Open, Out of Scope

**This section exists specifically to state, clearly and by name, what
this Specification does not do.**

`POL-0003` contains an existing, documented "Confirmation Experience —
Minimum Shape" requirement (§4 step 4, above, restates it): present the
candidate with context; offer exactly two resolutions, "same product"
or "different product"; take no default action if unanswered. A
separately identified question exists about whether the current
implementation's confirmation interaction fully satisfies that
requirement — first surfaced during the governance-route investigation
preceding `ADR-0007`, and explicitly ruled on by the Product Architect
(`ADR-0007` Addendum 1, Ruling 2, and reaffirmed in Addendum 2, Ruling
2): the question is recorded as **open**, routed for its **own, future,
separate governance/remediation decision** — Option B of three options
presented, not Option A (fold into this Specification/an amendment) or
Option C (clarify `POL-0003`'s own wording instead).

**This Specification does not resolve that question in any way.** It
does not determine whether the current UI must change to add an
explicit "different product" action. It does not determine whether the
current UI should be considered compliant as it stands. It does not
reinterpret, narrow, or restate `POL-0003`'s own "Confirmation
Experience — Minimum Shape" wording to make it match current behavior.
§4 step 4, above, states the requirement exactly as `POL-0003` already
states it — a restatement, not a reinterpretation — precisely so this
Specification's own existence cannot be read as having quietly settled
the open question by omission. Whoever undertakes Rule 8 for this
Specification must treat this question as still open and must not
resolve it as a side effect of a technical decision made there; it
requires its own, separate governance step, per the ruling cited above.

## 7. Boundary With Supplier-Wording Recognition — Preserved, Not Blurred

This capability and Supplier-Wording Recognition (`BDR-0013`/
`POL-0007`) share one technical concept — normalization-level/unit-
spelling similarity comparison — but remain two separate capabilities,
per `ADR-0007`'s own foundational instruction and `POL-0003`'s existing
"Relationship to `POL-0007`"-equivalent framing (mirrored the other
direction in `POL-0007`'s own "Relationship to `POL-0003`" section):

- This capability is **catalog-wide**; Supplier-Wording Recognition is
  **supplier-scoped**.
- This capability is **suggestion-only** and establishes nothing
  persistent; Supplier-Wording Recognition, once the owner confirms,
  **establishes a remembered relationship**, written to
  `Product.supplierWordings`.
- This capability **never writes to `Product.supplierWordings`, and
  never invokes `confirmSupplierWordingRelationship`** — that writer
  remains exclusively Supplier-Wording Recognition's own, per `ADR-0007`
  §3's non-negotiable constraint. **No parallel persistence writer is
  introduced or authorized by this Specification.**
- A shared normalization concept (e.g. unit-spelling equivalence) may
  be described identically in both this Specification and
  `product-identity-alternative-name-specification.md`'s own amendment,
  but each capability's own grounds, confirmation flow, and persistence
  remain entirely separate — implementing one must never be read as
  implicitly implementing, extending, or satisfying the other.

## 8. Explicitly Out of Scope

- The similarity algorithm, string-distance/token-comparison metric,
  and any numeric confidence threshold for any of the three signals in
  §3.
- How multiple signals are weighted, combined, or ranked when more
  than one applies.
- The normalization method for any signal, including the exact
  unit-spelling equivalence table for signal 3.
- Candidate ordering, scoring, or maximum-count limits (§4 step 2).
- The technical mechanism by which a confirmed "same product" result
  is realized (§4 step 5).
- Exact UI copy, layout, or interaction flow beyond the minimum shape
  restated in §4 step 4.
- **The confirmation-experience conformance question** (§6) — not
  addressed in any respect by this Specification.
- Any AI/OCR provider or model selection.
- API/endpoint design and implementation mechanics.
- Performance characteristics, indexing strategy, or scalability
  limits — explicitly deferred to Rule 8 in full, consistent with
  `product-identity-alternative-name-specification.md`'s own identical
  deferral.
- Structured brand/size/packaging extraction from `Product.name` — not
  proposed, not authorized, by this Specification or by `POL-0012`.
- Rule 8 Assessment and Implementation Authorization — separate, later
  gates.

## 9. Non-Negotiable Constraints (Carried Forward From `ADR-0007` and `POL-0012`)

- Exact matching remains the authoritative baseline, unchanged.
  `matchProductByExactName` and every client-side exact-match call
  site are untouched and take priority over any candidate suggestion.
- `findExistingSupplierWordingMatch` is unaffected — this capability
  has no relationship to it.
- The existing similarity threshold remains unchanged at `0.5`.
- Unit spelling may be normalized; quantity is never normalized away.
  `"2L"`/`"2 Lt"` may become more similar; `"1L"`/`"2L"` remain
  distinct.
- All recognition under any of the three signals remains
  candidate/suggestion-only. It must never silently resolve, silently
  attach, silently merge, silently rename, silently re-key, or bypass
  Owner confirmation.
- Existing `Product.id` values and product identity remain unchanged.
  No renaming, re-keying, or merging of existing Products is
  authorized by this Specification.
- This capability remains suggestion-only and never writes to
  `Product.supplierWordings`; `confirmSupplierWordingRelationship`
  remains the sole writer for the separate Supplier-Wording Recognition
  capability, unaffected by anything in this document.
- No structured brand/size/packaging Product field is introduced.
- Neither `ADR-0007`, `POL-0003`, `POL-0012`, nor this Specification
  authorizes implementation.

## 10. No Retroactive Compliance

**This Specification does not determine, and must not be read to
determine, that any existing implementation already conforms to it.**
This applies with particular force here: this is the first
Specification ever written for this capability, and a specific,
separately-identified conformance question already exists (§6). Writing
a Specification that describes intended, governed behavior is not
evidence that current code already satisfies it, does not constitute a
compliance audit, and does not "grandfather" any existing behavior as
approved merely by this Specification's existence. Whether current code
matches, partially matches, or does not match any section of this
Specification is a fact for Rule 8's own Current State Assessment to
establish — not assumed, asserted, or resolved here.

## 11. Tenant Isolation

Every product this capability compares against is already scoped under
`businesses/{businessId}/products/{productId}` per existing
`firestore.rules` — no new isolation rule is required, and no
cross-tenant comparison is introduced or possible, since candidate
detection only ever operates within one business's own `products`
collection at a time.

## 12. Failure Modes and False-Match Protections

| Failure/Case | Behavior |
|---|---|
| Candidate-detection mechanism unavailable/errors | Falls back to no candidate shown — the entered name proceeds through the ordinary, already-existing product path (§4 step 3), consistent with `product-identity-alternative-name-specification.md`'s own identical fallback for its separate capability. |
| Owner abandons confirmation mid-flow | No partial or implicit resolution occurs — neither "same product" nor "different product" takes effect until the owner explicitly answers. |
| Two products share a brand/name token but differ in a distinguishing quantity or variant (e.g. `"Coca Cola 2L"` vs. `"Coca Cola 1L"`; `"Coke 500ml"` vs. `"Coke Zero 500ml"`) | Signal 3's unit-spelling equivalence never folds the quantity digit — these remain distinct under signal 3. Signal 1 (general name similarity) may still surface such pairs as *candidates* for owner review (this is intended — a real, if imperfect, similarity exists), but presentation as a candidate is never itself a decision; the owner must still explicitly confirm or decline, per §4 step 4's minimum shape, and no automatic resolution follows from a high similarity score alone. |
| A supplier wording and a catalog-wide candidate signal fire for the same entry at the same time | Each capability's own confirmation moment applies independently, per §7 — this Specification does not decide UI sequencing or precedence between the two, left to Rule 8/implementation, provided neither capability's own confirmation requirement is skipped or merged into the other's. |

## Governance Notes

- This Specification does not implement code, modify runtime behavior,
  edit application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This Specification does not modify `BDR-0012`, `POL-0003`, `POL-0012`,
  `BDR-0013`, `POL-0007`, `POL-0011`,
  `product-identity-alternative-name-specification.md`, its own
  unit-spelling amendment, `ADR-0007`, or any other existing artifact.
- This Specification does not resolve the confirmation-experience
  conformance question (§6) — restated here for emphasis, given how
  easily a first-ever Specification for this capability could otherwise
  be misread as quietly having settled it.
- This Specification does not authorize a Rule 8 Assessment or
  Implementation Authorization.
- `POL-0003`'s own file is unmodified by this Specification's
  existence; it remains the governing Policy this Specification
  formalizes, unchanged.

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-08-27).

> This Specification is accepted exactly as drafted — the first-ever
> foundational Specification for the catalog-wide Similarity Suggestion
> capability, covering `POL-0003`'s original two signals together with
> `POL-0012`'s new unit-spelling-equivalence signal, and every
> constraint listed in §9 above. No substantive content was altered by
> this acceptance.
>
> **The confirmation-experience conformance question (§6) remains
> exactly as governed: OPEN — OUT OF SCOPE — routed for its own future,
> separate governance/remediation.** This acceptance does not declare
> the current UI compliant; does not require any UI change; does not
> reinterpret `POL-0003`'s own wording; and does not resolve Option A,
> B, or C from the Decision Brief that first framed those options.
> Nothing about accepting this Specification touches that question in
> any direction — it is accepted as still open, precisely as §6 and
> Governance Notes above already state.
>
> This acceptance is independent of, and does not constitute, accept,
> or in any way affect, the acceptance of
> `product-identity-alternative-name-specification-unit-spelling-amendment.md`
> ("Specification A") — the two remain separate acceptance gates, per
> `ADR-0007` Addendum 2, Ruling 3, and this acceptance covers this
> document alone. This acceptance does not authorize Rule 8 Assessment,
> Rule 8 drafting, technical implementation, code changes, schema
> implementation, algorithm implementation, UI implementation, database
> migration, historical-data backfill, or Implementation Authorization
> — all remain separate, required gates. Two separate Rule 8
> Assessments are required next, one for this Specification and one,
> independently, for Specification A.
>
> **Product Architect:** SABUSHIMIKE MASCENI.
> **Date:** 2026-08-27.

This Specification is now Accepted. Rule 8 Assessment and
Implementation Authorization remain separate, required, not-yet-begun
gates.
