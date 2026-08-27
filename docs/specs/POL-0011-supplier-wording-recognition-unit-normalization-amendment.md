Decision Record

# POL-0011 — Supplier-Wording Recognition Policy Amendment: Unit-Spelling Normalization Candidate Ground

**Status:** Approved (operational policy amendment — not a Business
Decision Record, not a Specification, not an implementation
authorization).
**Type:** Policy amendment, per the category established in
[`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)
§2. Amends [`POL-0007`](./POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
§"Candidate Grounds for a Proposed Match" only — adds one new named
ground; does not reopen any other section of `POL-0007` (Purpose,
Guiding Principle, Business Requirements Now Settled, Multiple
Candidates — No Presumed Ranking, Conflicting Supplier Wording,
Owner-Initiated Declaration — Scope and Boundaries, Interaction With
`BDR-0013` Item 7, Confirmation Experience — Minimum Shape, Reuse of
an Already-Confirmed Relationship, Relationship to `POL-0003`,
Technical Boundary, or Scope Exclusions), all of which remain exactly
as `POL-0007` already states.
**Sequencing note:** Recorded as `POL-0011`, explicitly assigned by
the Product Architect (`docs/adr/ADR-0007-additive-product-recognition-layer-scope.md`,
Addendum, Ruling 3) — not inferred from repository state. `POL-0010`
was confirmed already assigned, to an unrelated policy (Business Worth
Evolution & Measurement Model Policy), before this number was chosen;
`POL-0011` was confirmed collision-free at assignment.
**Location note:** Recorded in `docs/specs/`, unprefixed, under the
cross-cutting `POL-NNNN` namespace `POL-0007` itself already occupies
— consistent with the precedent `POL-19-013`/`POL-19-014` already
established for Module #19's own numbering space: a policy amendment
is recorded as its own new document rather than by editing the
original decision record in place, preserving `POL-0007` as an intact
historical record of what was originally decided.
**Depends on:** [`POL-0007`](./POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(the record this amends), [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md)
(the source BDR `POL-0007` operationalizes — unaffected, not reopened),
[`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
and its Addendum (the Product Architect scope decision authorizing this
capability, and the specific ruling routing it to this amendment).
**Followed by:** Not yet drafted, not derived by this record. A
Specification, Rule 8 Assessment, and Implementation Authorization all
remain required, separately, before any implementation.

---

## Why This Amendment Exists

`ADR-0007` (Approved) authorized a new unit-spelling normalization
capability — e.g. recognizing `"2L"` and `"2 Lt"` as referring to the
same unit despite differing surface spelling — to operate in **two**
separate existing recognition surfaces, kept as two separate additions:
Supplier-Wording Recognition (`BDR-0013`/`POL-0007`) and catalog-wide
Similarity Suggestion (`BDR-0012`/`POL-0003`). `ADR-0007`'s own
Addendum (Ruling 1) settled that this proceeds via two separate Policy
amendments, neither BDR reopened. This amendment operationalizes the
Supplier-Wording Recognition half only — the catalog-wide half is
governed entirely separately, by `POL-0012`.

## Amendment — Candidate Grounds for a Proposed Match

**`POL-0007`'s "Candidate Grounds for a Proposed Match" section is
extended with one additional named ground.** Its existing two grounds
are unchanged and remain fully in force:

- Exact or normalization-level similarity to the product's Initial
  Stock name (unchanged).
- Exact or normalization-level similarity to another already-confirmed
  alternative name recorded for the same product (unchanged).

**New third ground:**

- **Unit-spelling equivalence.** A newly-entered supplier wording may
  be treated as a plausible candidate for an existing product where
  the two names are otherwise normalization-level similar and differ
  only in how a unit of measurement is spelled — for example, `"2L"`
  and `"2 Lt"` may be treated as referring to the same unit for
  candidate-detection purposes. Which specific spellings are treated
  as equivalent (e.g. `L`/`Lt`/`Ltr`/`Liter`/`Litro`; `KG`/`Kilo`/
  `Quilo`) is **not decided by this amendment** — left to the later
  Specification, exactly as `POL-0007`'s own existing "Technical
  Boundary" section already defers "the normalization method used for
  any similarity comparison" generally. **This ground applies to the
  unit token only.** The quantity digit itself is never folded,
  normalized, or treated as equivalent across different values:
  `"1L"` and `"2L"` remain distinct under this ground, exactly as they
  already are under the two existing grounds — normalizing a unit's
  spelling is not, and must never become, a mechanism for treating two
  different quantities as the same candidate.

## What This Amendment Does Not Change

- **The two existing Candidate Grounds** — unchanged, both still fully
  in force, unmodified in wording or effect.
- **`findExistingSupplierWordingMatch` (silent reuse)** — untouched by
  this amendment. This amendment adds a *candidate* ground only; it
  does not touch, loosen, extend, or apply to reuse matching in any
  way. Reuse remains byte-exact, trim-only, exactly as `POL-0007`
  Business Requirement 7 and the underlying function already establish
  (`ADR-0007` §3, item 3).
- **Multiple Candidates — No Presumed Ranking** — unchanged. A
  candidate surfaced via the new unit-spelling ground is presented
  exactly like any other candidate; being surfaced never itself implies
  correctness, and no ranking or ordering is decided by this amendment.
- **Conflicting Supplier Wording — Distinguishing Information,
  Mandatory** — unchanged. A conflict arising from the new ground is
  governed by the same mandatory-distinguishing-information rule as any
  other conflict; this amendment does not weaken, narrow, or bypass it.
- **Confirmation Experience — Minimum Shape** — unchanged. A candidate
  surfaced via the new ground is presented through the existing "same
  product" / "different product" confirmation moment, with no default
  action if the owner has not yet responded — never auto-resolved,
  never silently decided.
- **Relationship to `POL-0003`** — unchanged. This amendment does not
  broaden, rely on, or reference `POL-0003` as authority, and has no
  effect on `POL-0003`'s own separate, parallel amendment (`POL-0012`).
- **Exact matching** — `matchProductByExactName` and every client-side
  exact-match call site remain completely untouched and authoritative,
  exactly as `ADR-0007` §3 requires.
- **The single persistence writer** — any candidate confirmed under
  the new ground, exactly like any other confirmed candidate, is
  written through `confirmSupplierWordingRelationship` only. No
  parallel persistence mechanism is introduced or authorized.
- **Structured attribute extraction** — not authorized by this
  amendment. The new ground compares unit *spelling* within an
  already-typed name; it does not extract, parse, or store any
  structured brand/size/packaging field, and does not authorize a
  future extraction capability to be built.

## Non-Negotiable Constraints (Carried Forward From `ADR-0007`, Unaffected by This Amendment)

- Exact matching remains the authoritative baseline, unchanged.
- `findExistingSupplierWordingMatch` remains byte-exact, trim-only —
  receives no normalization of any kind from this amendment.
- Unit spelling may be normalized; quantity is never normalized away.
  `"2L"`/`"2 Lt"` may become equivalent candidates; `"1L"`/`"2L"`
  remain distinct.
- All recognition under the new ground remains candidate-only — no
  automatic or fuzzy silent resolution is authorized.
- Existing Owner confirmation (the existing candidate-confirmation UI)
  remains the sole authority.
- Confirmed relationships continue through `confirmSupplierWordingRelationship`
  exclusively.
- No structured brand/size/packaging extraction is authorized.
- Existing `Product.id` values and product identity remain unchanged.
  No renaming, re-keying, or merging of existing Products is
  authorized.
- `ADR-0007` itself does not authorize implementation; neither does
  this amendment.

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- **`POL-0007`'s own file is not edited in place** — its original text
  is preserved intact as the historical record of what was originally
  decided. A short, clearly-marked pointer to this amendment has been
  added at the top of `POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md`,
  mirroring the exact precedent `POL-19-013` established for
  `POL-19-010`.
- This record does not resolve, address, or take any position on the
  pre-existing `POL-0003` conformance question identified during the
  governance-route investigation preceding this amendment
  (`ADR-0007`'s Addendum, Ruling 2 — Option B, handled separately,
  later). That question concerns the catalog-wide suggestion surface
  entirely, not this amendment's subject, and remains open.
- This record does not modify `BDR-0013`, `POL-0003`, `ADR-0007`, or
  any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment,
  or Implementation Authorization.
- This record does not modify `19-governance-bdr-policy-framework.md`'s
  Numbering Ledger table — recording `POL-0011` (and `POL-0012`) in
  that Ledger's table remains a follow-on documentation step, not
  performed here, mirroring the same deferral `POL-0010`'s own
  Governance Notes recorded for its own number.

**Lifecycle:** Designed → **Approved** (operational policy amendment
only). Not Specified, not Implemented, not Executed, not Analyzed — no
engineering work is authorized by this record.
