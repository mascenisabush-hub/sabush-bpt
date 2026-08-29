Decision Record

# POL-0013 — Supplier-Wording Recognition Policy Amendment: Complementary Deterministic & Semantic/AI Candidate Grounds, and Contradiction Evidence

**Status:** DRAFT — pending Product Architect decision. **Not
Approved.** Not a Business Decision Record, not a Specification, not
an implementation authorization.
**Type:** Policy amendment, per the category established in
[`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)
§2. Amends [`POL-0007`](./POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
§"Candidate Grounds for a Proposed Match" only — adds new named
grounds and one new cross-cutting check; does not reopen any other
section of `POL-0007` (Purpose, Guiding Principle, Business
Requirements Now Settled, Multiple Candidates — No Presumed Ranking,
Conflicting Supplier Wording, Owner-Initiated Declaration — Scope and
Boundaries, Interaction With `BDR-0013` Item 7, Confirmation
Experience — Minimum Shape, Reuse of an Already-Confirmed
Relationship, Relationship to `POL-0003`, Technical Boundary, or Scope
Exclusions), all of which remain exactly as `POL-0007` already states,
as amended by `POL-0011`/`POL-0012` (unaffected by this document).
**Depends on:** [`ADR-0008`](../adr/ADR-0008-complementary-recognition-mechanisms-scope-decision.md)
(DRAFT, pending) — this amendment does not take effect unless and
until `ADR-0008` is accepted; this document is drafted alongside it
so the full proposed shape can be reviewed together, mirroring how
`ADR-0007` and `POL-0011`/`POL-0012` were drafted in the same
governance pass.
**Sequencing note:** Proposed as `POL-0013` — the next unassigned
number in the cross-cutting `POL-NNNN` namespace at the time of
drafting (`POL-0010` is already assigned to the Business Worth
Evolution & Measurement Model Policy; `POL-0011`/`POL-0012` are
already assigned to the unit-spelling-normalization amendment).
**This number is proposed, not yet confirmed collision-free at
acceptance time** — per this repository's own numbering discipline,
final assignment is an explicit Product Architect act, not inferred
from repository state at drafting time.
**Location note:** Proposed for `docs/specs/`, unprefixed, under the
same cross-cutting `POL-NNNN` namespace `POL-0007`/`POL-0011`/`POL-0012`
already occupy — a policy amendment recorded as its own new document
rather than by editing `POL-0007` directly, per that same precedent.

---

## Purpose

`POL-0007` (as amended by `POL-0011`/`POL-0012`) currently authorizes
exactly three Candidate Grounds: exact/normalization-level similarity
to a product's reference name, exact/normalization-level similarity to
an already-confirmed alternative name, and unit-spelling equivalence.
`POL-0007`'s own text names the gap this amendment addresses: *"This
Policy does not invent, require, or preclude any future
semantic-matching capability — that remains entirely undecided."* This
amendment, if accepted alongside `ADR-0008`, resolves that gap by
adding a bounded set of new Candidate Grounds and one new cross-cutting
safety check — without altering the confirmation discipline, the
three-outcome model, or any of `POL-0007`'s existing settled business
requirements.

## New Candidate Grounds (proposed)

Each ground below may, individually or together with any other, cause
BPT to propose that a newly-entered wording refers to an existing
product — subject to every existing `POL-0007` requirement (owner
confirmation, no presumed ranking, no silent resolution) and to the
Contradiction Check below.

- **Character/token-level spelling variation** — typo and
  OCR-adjacent character substitution, scoped strictly to product
  *naming*. Never applied to a quantity, price, or unit token — a
  numeral that appears corrupted (e.g. a lost decimal point, a
  digit/letter substitution) is surfaced as ordinary field-level
  uncertainty for owner review, exactly as today's existing
  `detected`/`review`/`not_found` field-status treatment already
  handles it — never silently "corrected" by this ground.
- **Abbreviation recognition**, via a curated, auditable table — the
  same fixed, enumerable, reviewable-in-a-single-PR shape
  `POL-0011`'s unit-spelling table already established as precedent.
- **Curated synonym mapping** (same-language, different word,
  identical specific product) — deliberately narrow: a table entry
  must map one specific product wording to another specific product
  wording, never a generic category term (e.g. "Refrigerante") to a
  specific brand — the latter is explicitly excluded, since it would
  conflate "same category" with "same product."
- **Curated translation mapping** (e.g. Portuguese ↔ English), same
  auditable-table shape as the synonym mapping above.
- **Semantic/AI-assisted candidate discovery** — proposed only for
  wordings where no ground above, and no existing `POL-0007` ground,
  produces a candidate. Subject to the additional constraints below,
  beyond every general constraint already stated in this Policy and in
  `ADR-0008`.

## Contradiction Check (new — cross-cutting, not a Candidate Ground)

**This is deliberately not itself a Candidate Ground** — it never
proposes a candidate, and it is evaluated separately from, not
blended into, the grounds above. Its sole function is to **suppress or
materially downgrade** a candidate that one or more grounds above
would otherwise have proposed, when the compared wordings contain
reliable evidence they refer to different products.

- **Scope of this amendment:** limited to **schema-free** contradiction
  evidence — disagreement detected directly in the compared wording
  strings themselves (e.g. differing numeric size/volume/weight
  tokens; a variant keyword such as "Zero"/"Diet"/"Light" present in
  one wording and absent from the other). This requires no new
  `Product` schema and no structured-attribute authorization.
  Contradiction evidence that would require a structured `Product`
  attribute (brand, SKU, barcode, packaging) is **explicitly out of
  scope for this amendment** — deferred to the separate structured-
  attributes BDR named in `ADR-0008` §1.
- **Effect:** when triggered, a contradiction suppresses the candidate
  entirely or demotes it below any un-contradicted candidate for the
  same wording — the exact severity tiering is left to the
  Specification stage, not decided here.
- **Precedence:** a reliable contradiction always prevails over any
  accumulation of positive grounds, regardless of how many grounds —
  deterministic or semantic — agree. This Policy does not authorize
  any scoring or weighting scheme that could let positive evidence
  outvote a contradiction.
- **Explainability:** when a candidate is suppressed by contradiction,
  and any weaker-tier contradiction is nonetheless still shown to the
  owner, the contradiction itself must be stated in plain language
  (e.g. "sizes differ") — never hidden behind a lower-looking score.

## Semantic/AI-Specific Constraints (in addition to every general constraint in `POL-0007` and `ADR-0008`)

- **Candidate-only, without exception** — never eligible for the
  existing byte-exact, single-supplier automatic-reuse path, and never
  eligible for any future automatic path unless a separate, explicit
  Product Architect decision says otherwise.
- **Must produce a human-readable ground** via the existing `grounds`
  pattern — a bare confidence score is never, by itself, sufficient
  explanation shown to the owner.
- **No presumed priority** over a deterministic ground — governed
  identically by `POL-0007`'s existing "Multiple Candidates — No
  Presumed Ranking" section, unamended by this document.
- **Does not override contradiction evidence** — the Contradiction
  Check above applies to a semantic/AI-sourced candidate exactly as it
  applies to a deterministically-sourced one.
- External model/provider dependency, cost, latency, reproducibility,
  and privacy implications are **not resolved by this Policy
  amendment** — they must be explicitly addressed in the Specification
  stage before any Rule 8 Assessment or Implementation Authorization
  is sought.

## Multiple Candidates — No Presumed Ranking (unchanged, reaffirmed)

`POL-0007`'s existing rule is unaffected and applies identically to
candidates produced by any ground added by this amendment: all
plausible candidates are presented together; being surfaced never
itself implies correctness; this amendment does not decide ordering,
scoring, or a limit on the number shown.

## Technical Boundary (extended, not replaced)

In addition to everything `POL-0007`'s existing Technical Boundary
already excludes, this amendment does not decide:

- Any specific edit-distance metric, phonetic algorithm, or
  character-level matching implementation.
- The content of any synonym/translation/abbreviation table.
- Any semantic/AI model, provider, prompt, or embedding technique.
- Any confidence threshold, scoring formula, or contradiction-severity
  tiering mechanism.
- Any schema for the Contradiction Check's own inputs beyond "the
  compared wording strings themselves."

All of the above remain for the Specification, and — if the Product
Architect determines it is warranted, given the qualitatively
different risk profile of the semantic/AI ground — a dedicated Rule 8
Assessment addressing that ground specifically.

## Scope Exclusions (extended, not replaced)

This amendment does **not** authorize, decide, or imply:

- Structured product attributes of any kind (see `ADR-0008` §1) —
  entirely out of scope.
- Cross-supplier candidate evidence of any kind (see `ADR-0008` §1) —
  entirely out of scope.
- Any change to `POL-0007`'s existing confirmation discipline,
  conflict/distinguishing-information mechanism, or owner-initiated
  declaration rule — all unamended.
- Any automatic resolution beyond the existing byte-exact reuse path.

## Product Architect Acceptance

**ACCEPTED / AUTHORIZED**, concurrently with `ADR-0008`, on which this
amendment depends and which recites the same signature:

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
> I, SABUSHIMIKE MASCENI, acting as Product Architect for SABUSH BPT,
> hereby ACCEPT and AUTHORIZE the business decisions recorded in
> ADR-0008 and the operational amendment recorded in POL-0013.
> Decision: ACCEPTED / AUTHORIZED
> This acceptance authorizes the duplicate-prevention-centered Product
> Recognition Intelligence approach described in the documents,
> including the RECOGNIZE → PRESENT → OWNER DECIDES → REMEMBER flow,
> complementary deterministic linguistic and semantic/AI
> candidate-producing mechanisms, and the requirement that all
> authorized recognition mechanisms be considered before declaring
> that there is no plausible candidate.
> The Owner remains the final decision-maker. Recognition mechanisms,
> including semantic/AI mechanisms, must not automatically override
> contradictions, select a product, merge products, or create
> products.
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED / AUTHORIZED
> Date: 29 August 2026

**Scope of this acceptance, as explicitly granted:** the five New
Candidate Grounds (character/token-level spelling variation,
abbreviation recognition, curated synonym mapping, curated translation
mapping, semantic/AI-assisted candidate discovery), the schema-free
Contradiction Check, and the Semantic/AI-Specific Constraints, exactly
as drafted above — none altered by this acceptance.

**Not included in this acceptance:** the content of any
synonym/translation/abbreviation table; any edit-distance metric,
phonetic algorithm, AI model, provider, or prompt; any confidence
threshold or scoring formula; any Rule 8 Assessment or Implementation
Authorization; any change to `src/`, `server/`, `firestore.rules`, or
`firestore.indexes.json`; any commit or push. All remain for the
Specification stage and, where warranted, a dedicated Rule 8
Assessment for the semantic/AI ground specifically, per this
document's own Technical Boundary section.

## Governance Notes

- This record does not modify `BDR-0013`, `POL-0007`, `POL-0011`,
  `POL-0012`, `ADR-0007`, the Discovery Report, or any other existing
  artifact.
- This record does not authorize a Specification, Rule 8 Assessment,
  or Implementation Authorization — acceptance of the business/policy
  decision is a separate act from authorizing engineering work.
- This record's acceptance is effective concurrently with `ADR-0008`'s
  acceptance, on which it depends.
- Every proposed Candidate Ground and the Contradiction Check remain,
  individually, subject to `POL-0007`'s unamended confirmation
  discipline — none of them, alone or combined, authorizes silent
  resolution.

**Lifecycle:** Drafted → Proposed → **Accepted**. Not Implemented, not
Rule 8 Assessed, not Authorized for engineering work — those remain
separate, explicit, subsequent steps.
