Decision Record

# POL-0012 — Similarity-Confirmation Threshold Policy Amendment: Unit-Spelling Normalization Signal

**Status:** Approved (operational policy amendment — not a Business
Decision Record, not a Specification, not an implementation
authorization).
**Type:** Policy amendment, per the category established in
[`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)
§2. Amends [`POL-0003`](./POL-0003-similarity-confirmation-threshold.md)
§"Candidate Signals" only — adds one new named signal; does not reopen
any other section of `POL-0003` (Purpose, Guiding Principle, Business
Requirements Now Settled, Confirmation Experience — Minimum Shape,
Technical Boundary, or Scope Exclusions), all of which remain exactly
as `POL-0003` already states.
**Sequencing note:** Recorded as `POL-0012`, explicitly assigned by
the Product Architect (`docs/adr/ADR-0007-additive-product-recognition-layer-scope.md`,
Addendum, Ruling 3) — not inferred from repository state, and recorded
consecutively with `POL-0011` per that same ruling.
**Location note:** Recorded in `docs/specs/`, unprefixed, under the
cross-cutting `POL-NNNN` namespace `POL-0003` itself already occupies
— consistent with the precedent `POL-19-013`/`POL-19-014` already
established: a policy amendment is recorded as its own new document
rather than by editing the original decision record in place,
preserving `POL-0003` as an intact historical record of what was
originally decided.
**Depends on:** [`POL-0003`](./POL-0003-similarity-confirmation-threshold.md)
(the record this amends), [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md)
(the source BDR `POL-0003` operationalizes — unaffected, not reopened),
[`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
and its Addendum (the Product Architect scope decision authorizing this
capability, and the specific rulings routing it to this amendment and
explicitly excluding the pre-existing conformance question from it).
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
catalog-wide half only — the Supplier-Wording Recognition half is
governed entirely separately, by `POL-0011`.

## Amendment — Candidate Signals

**`POL-0003`'s "Candidate Signals" section is extended with one
additional named signal.** Its existing two signals are unchanged and
remain fully in force:

- Name similarity, after normalization (case, spacing, punctuation,
  and accent differences) (unchanged).
- Shared barcode or SKU value between a newly entered/scanned product
  and an existing one (unchanged).

**New third signal:**

- **Unit-spelling equivalence.** Two product names that are otherwise
  similar under the existing name-similarity signal, above, may be
  treated as more similar where they differ only in how a unit of
  measurement is spelled — for example, `"2L"` and `"2 Lt"` may be
  treated as referring to the same unit for similarity-scoring
  purposes. Which specific spellings are treated as equivalent is
  **not decided by this amendment** — left to the later Specification,
  exactly as `POL-0003`'s own existing "Technical Boundary" section
  already defers "the normalization method used for name comparison"
  generally. **This signal applies to the unit token only.** The
  quantity digit itself is never folded, normalized, or treated as
  equivalent across different values: `"1L"` and `"2L"` remain
  distinct under this signal, exactly as they already are today —
  normalizing a unit's spelling is not, and must never become, a
  mechanism for treating two different quantities as more similar.

## What This Amendment Does Not Change

- **The two existing Candidate Signals** — unchanged, both still fully
  in force, unmodified in wording or effect.
- **The existing similarity threshold** — unchanged. This amendment
  adds one additional signal category; it does not touch the numeric
  threshold itself, how it is computed, or how signals are combined or
  weighted — all of that remains exactly as `POL-0003`'s own
  "Technical Boundary" section already defers to the later
  Specification.
- **Confirmation Experience — Minimum Shape — explicitly NOT reopened
  by this amendment.** This section, including its "offer exactly two
  resolutions — 'same product' or 'different product'" requirement,
  is entirely untouched by this amendment. See "Pre-Existing
  Conformance Matter — Not Addressed Here," below.
- **Guiding Principle** — unchanged.
- **Relationship to `BDR-0012` Decisions 10–11** — unchanged.
- **Exact matching** — `matchProductByExactName` and every client-side
  exact-match call site remain completely untouched and authoritative,
  exactly as `ADR-0007` §3 requires.
- **Structured attribute extraction** — not authorized by this
  amendment. The new signal compares unit *spelling* within an
  already-typed name; it does not extract, parse, or store any
  structured brand/size/packaging field, and does not authorize a
  future extraction capability to be built.
- **`POL-0007`** and its own separate, parallel amendment (`POL-0011`)
  — entirely unaffected; not reopened by this record.

## Pre-Existing Conformance Matter — Not Addressed Here

A separate, pre-existing question was identified during the
governance-route investigation preceding this amendment: whether the
current catalog-wide suggestion UI's confirmation interaction fully
conforms to this Policy's "Confirmation Experience — Minimum Shape"
section as already written. `ADR-0007`'s Addendum (Ruling 2) resolved,
by explicit Product Architect decision, that this question is
**recorded separately for later governance/remediation** — Option B of
the three options presented, not folded into this or any other
amendment.

**This amendment does not resolve, address, take a position on, or
otherwise touch that question in any way.** It does not modify the
"Confirmation Experience — Minimum Shape" section's wording; it does
not authorize, require, or imply any UI change; and it must not be
read as an acceptance, endorsement, or rejection of the current
interaction's conformance. That matter remains open, tracked
separately, pending its own future, independent decision.

## Non-Negotiable Constraints (Carried Forward From `ADR-0007`, Unaffected by This Amendment)

- Exact matching remains the authoritative baseline, unchanged.
- The existing similarity threshold remains unchanged.
- Unit spelling may be normalized; quantity is never normalized away.
  `"2L"`/`"2 Lt"` may become more similar; `"1L"`/`"2L"` remain
  distinct.
- All recognition under the new signal remains candidate/suggestion-only
  — no automatic or fuzzy silent resolution is authorized.
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
- **`POL-0003`'s own file is not edited in place** — its original text
  is preserved intact as the historical record of what was originally
  decided. A short, clearly-marked pointer to this amendment has been
  added at the top of `POL-0003-similarity-confirmation-threshold.md`,
  mirroring the exact precedent `POL-19-013` established for
  `POL-19-010`.
- This record does not resolve the pre-existing conformance question
  described above in any way — restated here for emphasis, not
  merely stated once, given how easily this could otherwise be
  misread as quietly settled by this amendment's own existence.
- This record does not modify `BDR-0012`, `POL-0007` (or its own
  amendment, `POL-0011`), `ADR-0007`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment,
  or Implementation Authorization.
- This record does not modify `19-governance-bdr-policy-framework.md`'s
  Numbering Ledger table — recording `POL-0012` (and `POL-0011`) in
  that Ledger's table remains a follow-on documentation step, not
  performed here, mirroring the same deferral `POL-0010`'s own
  Governance Notes recorded for its own number.

**Lifecycle:** Designed → **Approved** (operational policy amendment
only). Not Specified, not Implemented, not Executed, not Analyzed — no
engineering work is authorized by this record.
