Business Domain Specification — Amendment

# Supplier-Wording Recognition, Confirmation & Conflict — Specification Amendment: Unit-Spelling Equivalence Candidate Ground

**Status:** ✅ Accepted (2026-08-27). See "Product Architect Acceptance,"
below.
**Type:** Specification amendment, filed as its own document per this
repository's established "amend additively, never rewrite" pattern
(confirmed across every existing amendment in `docs/specs/`, including
`product-unit-of-measure-reconciliation-amendment.md`, none of which
edits its source document in place). Amends
[`product-identity-alternative-name-specification.md`](./product-identity-alternative-name-specification.md)
§3 step 2 only — adds one item to an existing enumerated list; does not
reopen §1, §2, §2a, the remainder of §3 (steps 1, 3–7), §3a, §4–§12,
or the Governance Notes, all of which remain exactly as that
Specification already states.
**Authorizing chain:** [`POL-0011`](./POL-0011-supplier-wording-recognition-unit-normalization-amendment.md)
(Approved — the Policy amendment this Specification amendment
technically operationalizes), [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
and its Addenda (the Product Architect scope decision and the two
subsequent rulings routing this exact artifact — Addendum 2, Ruling 1).
**Depends on:** [`product-identity-alternative-name-specification.md`](./product-identity-alternative-name-specification.md)
(Accepted 2026-08-19 — the Specification this amends), `POL-0011`
(Approved — the Policy this Specification amendment technically
derives from, exactly as the original Specification derives from
`POL-0007`).
**Followed by:** Not yet drafted, not derived by this record. Rule 8
Assessment and Implementation Authorization both remain required,
separately, after this amendment's own acceptance.

---

## 1. Why This Amendment Exists

`POL-0011` (Approved) added a third named Candidate Ground to
`POL-0007`'s "Candidate Grounds for a Proposed Match" section: unit-
spelling equivalence — e.g. `"2L"` and `"2 Lt"` may be treated as
referring to the same unit despite differing surface spelling, applied
to the unit token only, never the quantity digit. The accepted
Specification technically operationalizing `POL-0007`
(`product-identity-alternative-name-specification.md`) enumerates the
two grounds that existed at its own drafting time, by name, in §3 step
2. This amendment brings that enumeration into alignment with
`POL-0011`'s now-approved third ground, at the same conceptual level
the original Specification already uses — mechanism deferred to Rule
8, exactly as the original already defers grounds (a) and (b)'s own
mechanism.

## 2. Amendment — §3 Step 2, Candidate Detection

**§3 step 2 of `product-identity-alternative-name-specification.md` is
extended with one additional item.** Grounds (a) and (b), and every
word of surrounding text framing them, are unchanged and remain fully
in force:

> Per `POL-0007`'s "Candidate Grounds" section, BPT may propose a
> candidate where the incoming wording shows normalization-level
> similarity to (a) an existing product's `Product.name`, or (b) an
> existing product's already-confirmed supplier-wording relationship
> (any supplier). [unchanged]

**New item (c), added to this same step:**

> ...or (c) an existing product's `Product.name` or already-confirmed
> supplier-wording relationship, where the incoming wording and the
> compared name differ only in unit spelling (`POL-0011`) — e.g.
> `"2L"` treated as equivalent to `"2 Lt"`. **This Specification does
> not select which specific spellings are treated as equivalent** —
> left to Rule 8, exactly as `POL-0011` itself defers "the exact
> equivalence table" to a later Specification, and exactly as this
> same Specification already defers grounds (a) and (b)'s own
> normalization method. **This ground applies to the unit token only.**
> The quantity digit is never folded or treated as equivalent across
> different values — `"1L"` and `"2L"` remain distinct under this
> ground, exactly as they already are under (a) and (b).

The sentence immediately following the three grounds — *"This
Specification does not select the normalization method, string-
comparison logic, or any threshold — flagged explicitly for Rule 8,
consistent with `POL-0007`'s own Technical Boundary..."* — is
unchanged and now applies to all three grounds identically, not only
(a) and (b).

## 3. What This Amendment Does Not Change

- **§3 step 1 (Trigger)** — unchanged. The trigger condition, and its
  own explicit deferral of the reuse-matching criterion to Rule 8
  (§6), are untouched.
- **§3 steps 3–7** (no-candidate path, multiple-candidates handling,
  confirmation minimum shape, confirmed/not-confirmed outcomes) —
  unchanged in every respect. A candidate surfaced via the new ground
  (c) is presented, confirmed, or declined through exactly the same
  mechanism as any candidate surfaced via (a) or (b) — no new UI
  concept, no new confirmation shape, no different treatment.
- **§3a (Owner-Initiated Declaration)** — unchanged; unaffected by
  which ground, if any, prompted the moment.
- **§2 (Data Model), §2a (Initial Stock Name Correspondence)** —
  unchanged. This amendment adds a detection ground; it introduces no
  new field, no new persisted concept, and no change to how a
  confirmed relationship is stored.
- **§6 (Reuse of an Already-Confirmed Relationship, referenced by §3
  step 1)** — unchanged. `findExistingSupplierWordingMatch`'s
  byte-exact, trim-only strictness is untouched; this amendment adds a
  *candidate* ground only and has no bearing on reuse matching.
- **§9 (Tenant Isolation), §10 (Failure Modes)** — unchanged; nothing
  about this amendment introduces a new failure mode or touches
  isolation.
- **§11 (Explicitly Out of Scope)** — unchanged in substance; the
  normalization-method deferral already listed there now covers all
  three grounds, not a narrower set.
- **§12 (Item 9 — Historical Duplicates, Explicitly Excluded)** —
  unchanged and unaffected; this amendment has no relationship to
  historical-duplicate handling.
- **Exact matching** — `matchProductByExactName` and every client-side
  exact-match call site remain completely untouched and authoritative.
- **The single persistence writer** — a candidate confirmed under
  ground (c), exactly like any confirmed under (a) or (b), is written
  through `confirmSupplierWordingRelationship` only. No parallel
  persistence mechanism is introduced.
- **Structured attribute extraction** — not authorized by this
  amendment. Ground (c) compares unit spelling within an already-typed
  name; it extracts, parses, or stores no structured brand/size/
  packaging field.
- **Product identity** — `Product.id` values and product identity are
  unaffected. No renaming, re-keying, or merging of existing Products
  is authorized by this amendment.

## 4. Non-Negotiable Constraints (Carried Forward From `ADR-0007` and `POL-0011`, Unaffected by This Amendment)

- Exact matching remains the authoritative baseline, unchanged.
- `findExistingSupplierWordingMatch` remains byte-exact, trim-only.
- Unit spelling may be normalized; quantity is never normalized away.
  `"2L"`/`"2 Lt"` may become equivalent candidates; `"1L"`/`"2L"`
  remain distinct.
- All recognition under ground (c) remains candidate-only — no
  automatic or fuzzy silent resolution.
- Existing Owner confirmation remains the sole authority.
- Confirmed relationships continue through
  `confirmSupplierWordingRelationship` exclusively.
- No structured brand/size/packaging extraction is authorized.
- Existing `Product.id` values and product identity remain unchanged.
  No renaming, re-keying, or merging of existing Products is
  authorized.
- Neither `ADR-0007`, `POL-0011`, nor this amendment authorizes
  implementation.

## 5. No Retroactive Compliance

**Drafting this amendment does not establish that any existing
implementation already reflects it.** As of this amendment, no code
implements ground (c) — it does not yet exist in `supplierWordingMatching.ts`
or anywhere else. This amendment describes an intended future technical
capability at the Specification level; it is not, and must not be read
as, a finding that current code already conforms to it.

## Governance Notes

- This amendment does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- **`product-identity-alternative-name-specification.md` is not edited
  in place** — its accepted text is preserved intact. A short pointer
  to this amendment is added at its top, mirroring exactly the
  precedent `POL-19-013`/`POL-19-014` established for their own parent
  documents, and this repository's own "confirmed across 15 existing
  amendment documents, none of which edits its source in place" rule
  (`product-unit-of-measure-reconciliation-amendment.md`'s own
  Governance Notes).
- This amendment does not resolve, address, or take any position on
  the pre-existing `POL-0003` conformance question — that concerns the
  catalog-wide surface entirely, governed by the separate, foundational
  Specification `POL-0012` authorizes, not this document.
- This amendment does not modify `BDR-0013`, `POL-0007`, `POL-0011`,
  `ADR-0007`, or any other existing artifact.
- This amendment does not authorize a Rule 8 Assessment or
  Implementation Authorization.

---

## Product Architect Acceptance

**Status:** ✅ Accepted (2026-08-27).

> This Specification amendment is accepted exactly as drafted — the
> single addition of ground (c), unit-spelling equivalence per
> `POL-0011`, to §3 step 2 of `product-identity-alternative-name-specification.md`,
> with every other section of that Specification, and every constraint
> listed in §4 above, unchanged. No substantive content was altered by
> this acceptance. This acceptance is independent of, and does not
> constitute, accept, or in any way affect, the acceptance of
> `similarity-confirmation-threshold-specification.md` ("Specification
> B") — the two remain separate acceptance gates, per `ADR-0007`
> Addendum 2, Ruling 3, and this acceptance covers this document alone.
> This acceptance does not authorize Rule 8 Assessment, Rule 8 drafting,
> technical implementation, code changes, schema implementation,
> algorithm implementation, UI implementation, database migration,
> historical-data backfill, or Implementation Authorization — all
> remain separate, required gates. Two separate Rule 8 Assessments are
> required next, one for this Specification amendment and one,
> independently, for Specification B.
>
> **Product Architect:** SABUSHIMIKE MASCENI.
> **Date:** 2026-08-27.

This amendment is now Accepted. Rule 8 Assessment and Implementation
Authorization remain separate, required, not-yet-begun gates.
