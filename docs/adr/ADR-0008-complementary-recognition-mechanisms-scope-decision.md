# ADR-0008 — Complementary Recognition Mechanisms Scope Decision

**Status:** DRAFT (redrafted) — pending Product Architect decision.
**Not Approved.** Not implementation authorization. Nothing in this
document takes effect until explicitly accepted, in writing, by the
Product Architect. This redraft supersedes the prior draft of this
same document in its entirety; no other repository file is affected.
**Type:** Architecture Decision Record (scope decision only — mirrors
the role `ADR-0007` played for the unit-spelling-normalization
extension: a ruling on *what* is in scope and *which* existing
governance chain absorbs it, preceding any Policy/Specification
drafting).
**Decision authority:** Product Architect — SABUSHIMIKE MASCENI.
Decision **pending** — this document proposes a ruling for acceptance,
rejection, or amendment; it does not itself constitute one.
**Basis:** The Product Recognition Intelligence investigation (two
read-only reports), the governance classification report, and the
Product Architect's explicit redirection toward a duplicate-prevention-
centered objective, all produced this session.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `BDR-0013`, `POL-0007`, `POL-0011`,
`POL-0012`, `ADR-0007`, or any Specification/Rule 8/Implementation
Authorization artifact to produce this document.**

---

## Governing Principle

> **When the wording changes, the system should first ask whether the
> Product is already known — not assume that a new wording means a
> new Product.**

Every decision in this document exists in service of one business
objective: **preventing duplicate Products**, by making BPT
substantially better at recognizing that an incoming description may
refer to a Product that already exists, despite legitimate differences
in spelling, punctuation, abbreviation, language, or supplier-specific
wording. **Fuzzy matching, semantic/AI recognition, and every other
technique named below are mechanisms toward that objective — not the
objective itself.**

## 1. Proposed Decision

This ADR proposes authorizing an extension to the existing
`BDR-0013`/`POL-0007` recognition architecture, not a new capability
from zero. The extension adds recognition mechanisms as new Candidate
Grounds, operating strictly within the existing pipeline:

```
Incoming wording
   -> Existing exact / normalized recognition        (unchanged, BDR-0013/POL-0007)
   -> Deterministic linguistic recognition            (new, this ADR)
   -> Synonym / translation recognition                (new, this ADR)
   -> Semantic / AI recognition, if authorized          (new, this ADR — constrained)
   -> Historical / remembered evidence                  (existing, unchanged in scope)
   -> Contradiction / negative-evidence check            (new, this ADR)
   -> Candidate(s), each with a plain-language reason
   -> OWNER PRESENTATION
   -> Owner chooses: existing Product / another Product / genuinely new Product
   -> confirmed Product ID
   -> remember confirmed wording (existing mechanism, unchanged)
```

This is a **candidate-discovery pipeline, not an automatic-merge
pipeline** — every stage before "OWNER PRESENTATION" only ever
proposes; nothing before that line writes anything.

### In Scope

- Stronger deterministic linguistic recognition: spelling/typo
  recognition, token-level fuzzy recognition, abbreviation recognition
  where safely and narrowly defined, synonym/translation recognition
  via curated tables, phonetic/near-spelling recognition where
  technically justified.
- Semantic/AI/embedding recognition, as a complementary
  candidate-producing mechanism only (§4).
- Contradiction/negative-evidence checking, scoped to evidence
  recoverable from the compared wording strings themselves (no new
  schema) — see §5.
- Use of existing confirmed recognition memory (the current
  supplier-scoped `supplierWordings` mechanism) as evidence, unchanged
  in scope from today.
- Owner presentation and confirmation, reusing the existing mechanism.
- Remembering confirmed alternative wording, reusing the existing
  mechanism.
- Preserving canonical Product identity (§3).
- Revisiting whether "no plausible candidate" should mean "no
  candidate after every authorized mechanism has run," not merely
  "the exact-match check failed" (§6).

### Out of Scope (unless separately governed)

- Redesigning Product identity or introducing any new structured
  Product schema (brand/size/type/variant/packaging) — even if such a
  schema could plausibly improve matching. Per `BDR-0013` Decision 1,
  this BDR (and this ADR, which extends it) does not redefine what a
  `Product` is; a schema change requires its own new BDR.
- Automatically changing `Product.name`.
- Automatic merging of Products.
- Silent fuzzy or semantic resolution of any kind.
- Cross-supplier candidate evidence — this would revise an
  already-ACCEPT'd `BDR-0013` §5 item 1 decision (supplier-scoped
  memory) and requires its own amendment to `BDR-0013` itself, not
  this ADR.
- Any change to Product Memory / `unitRelationship` behavior.
- Any change to Business Worth.
- Any change to Initial Stock, beyond what the existing recognition
  path already touches.
- Any unrelated catalog redesign.

## 2. The Three-Outcome Model — Reaffirmed, One Clarification Proposed

`BDR-0013`/`POL-0007`'s existing model is unchanged in shape:

- **KNOWN** — automatic reuse (byte-exact, single-supplier only — the
  sole automatic path, untouched by this ADR).
- **CANDIDATE** — presented to the owner, who decides.
- **NO PLAUSIBLE CANDIDATE** — treated as a new Product.

**Proposed clarification (§6, expanded below):** "no plausible
candidate" must mean genuinely no plausible evidence *after every
authorized recognition mechanism has run* — not merely that the
existing exact-match check failed. Today, effectively, exact-match
failure already leads straight to "no candidate" for any wording
outside the two existing narrow grounds. This ADR proposes that the
"no plausible candidate" outcome only be reached once deterministic,
synonym/translation, and (if authorized) semantic mechanisms have all
had the opportunity to propose a candidate and none did.

## 3. Canonical Product Name Principle — Non-Negotiable

The catalog's `Product.name` remains the sole canonical/reference
presentation name, always. Receipt or supplier wording is **evidence
about identity**, never **authority over the canonical catalog name**.

Worked example:

> Canonical: `"Pedaço"`. Receipt: `"Pedasco Normale"`. If the owner
> confirms these refer to the same Product: `Product.name` remains
> `"Pedaço"`. The system remembers `"Pedasco Normale"` as alternative
> wording associated with that Product's `id`. The Product is never
> renamed to `"Pedasco Normale"`.

This protects catalog readability and prevents supplier or OCR wording
from progressively corrupting the canonical catalog over time — a risk
that grows, not shrinks, as recognition becomes more capable of
finding matches despite wording differences.

## 4. Semantic/AI Recognition — Candidate Generation Only

Authorized for consideration, if accepted, strictly as one candidate-
producing mechanism among several — never as an identity-resolution
mechanism:

- **Semantic/AI suggestion ≠ confirmed Product ID.** A candidate
  produced by semantic/AI recognition requires the same owner
  confirmation as any other candidate, unless a future, separate,
  explicit Product Architect decision authorizes something stronger.
  This ADR does not authorize anything stronger.
- Must be evaluated (at Specification stage, not decided here) for:
  false positives, false negatives, explainability, multilingual
  behavior (Portuguese/English specifically), synonym and translation
  coverage, reproducibility, cost, latency, external dependency,
  privacy, model-version changes, and auditability.
- Carries no priority over a deterministic ground when both propose
  candidates for the same wording — governed identically to
  `POL-0007`'s existing "no presumed ranking" rule.
- Does not override contradiction evidence (§5) under any
  circumstance.

## 5. Contradiction / Negative-Evidence Check

A cross-cutting check, not a Candidate Ground — it never proposes a
candidate; it can only suppress or downgrade one that another
mechanism already proposed, and it is evaluated separately from,
never blended into, positive evidence. Scoped in this ADR to evidence
recoverable directly from the compared wording strings (differing
numeric size/volume/weight tokens; a variant keyword such as
"Zero"/"Diet"/"Light" present on one side only) — no new `Product`
schema required. A reliable contradiction always prevails over any
accumulation of positive signals, from any mechanism, deterministic or
semantic.

## 6. "No Plausible Candidate" — Proposed Clarification

**Proposed business rule:** the "no plausible candidate" / genuinely-
new-product outcome is reached only after every authorized recognition
mechanism (exact/normalization, deterministic linguistic, synonym/
translation, semantic/AI if authorized, and existing historical
memory) has had the opportunity to propose a candidate for the
incoming wording, and none did — or every candidate any of them
proposed was suppressed by the Contradiction Check. Failure of the
existing exact-match check alone is explicitly **not** sufficient
grounds to conclude "no plausible candidate."

## 7. Concrete Acceptance Examples (illustrative — not exhaustive, not a Specification)

| Incoming wording | Catalog Product | Expected outcome |
|---|---|---|
| "Coka cola 2L" | "Coca Cola 2L" | **Candidate** — deterministic spelling-variation ground, no contradiction |
| "Coca Cola 1L" | "Coca Cola 2L" | **Contradiction** — size disagreement; suppressed or heavily demoted, never treated as the same Product without an owner decision made with the disagreement stated plainly |
| "Pedasco Normale" | "Pedaço" | **Candidate** — deterministic character/edit-distance ground (Phase 2 investigation's own stress test: no single mechanism alone is fully sufficient, but the conjunction of similarity plus absence of contradiction is defensible as a candidate) |
| "Lixívia" | "Bleach" | **Candidate only if semantic/AI or a curated translation-table ground is separately authorized** — no deterministic mechanism in scope here reaches this pair, since the two share no tokens or characters |
| Genuinely unrelated products (e.g. "Arroz 5Kg" vs. "Coca Cola 2L") | — | **No candidate**, or, if any mechanism weakly proposes one, it is clearly separated/demoted rather than presented with the same weight as a strong candidate |

## 8. Non-Negotiable Constraints (binding on any future Policy, Specification, or implementation)

Carried forward and extended from `ADR-0007`'s own constraints, all
remaining in force:

- Exact matching remains the authoritative baseline, unchanged.
- `matchProductByExactName` (`server/smartStockEntry.ts`) remains
  untouched.
- `findExistingSupplierWordingMatch` remains byte-exact, trim-only —
  no normalization, fuzzy, or semantic matching of any kind.
- **No automatic/fuzzy resolution is authorized** — every new match,
  from any mechanism, remains candidate-only.
- **Recognition, Presentation, Owner Decision, and Memory remain four
  distinct stages, never collapsed or skipped:** RECOGNIZE → PRESENT →
  OWNER DECIDES → REMEMBER.
- Contradiction evidence, where reliable, always prevails over
  accumulated positive evidence, regardless of source.
- Semantic/AI evidence carries no special priority or override
  authority.
- `Product.name` is never rewritten by recognition, presentation, or
  memory.
- `Product.id` remains unchanged by any mechanism authorized here.
- Receipt/supplier wording is preserved verbatim, always.
- The existing Owner confirmation UI and mechanism remain the sole
  authoritative confirmation path — no new confirmation UI authorized.
- Confirmed relationships continue through the existing
  `confirmSupplierWordingRelationship` writer exclusively.
- Structured product attributes and cross-supplier candidate evidence
  remain explicitly out of scope.
- No specific algorithm, metric, phonetic technique, AI model,
  provider, prompt, confidence threshold, or scoring formula is
  selected by this ADR.
- Every new candidate ground must be explainable via the existing
  `grounds`-array pattern — never a bare score.
- No change to Product Memory/`unitRelationship`, Business Worth, or
  Initial Stock beyond what the existing recognition path already
  touches.

## 9. Explicitly Not Authorized By This ADR

- Any automatic/silent resolution beyond the existing byte-exact,
  single-supplier reuse path.
- Any structured product attribute schema or field.
- Any cross-supplier silent reuse or cross-supplier candidate
  evidence.
- Any specific algorithm, model, provider, threshold, or scoring
  formula.
- Any Specification, Rule 8 Assessment, Implementation Task/Plan, or
  Implementation Authorization — this ADR is a scope ruling only; the
  next step in this repository's established sequence (mirrored by
  `ADR-0007` → `POL-0011`/`POL-0012` →
  `product-identity-alternative-name-specification-unit-spelling-amendment.md`
  → Rule 8 → Implementation Authorization) is a Specification
  amendment, not drafted here.
- Any change to `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or any test file.
- Any commit or push.

## 10. Governance Traceability

Extends: `BDR-0013-product-identity-alternative-name-memory.md`
(business authorization for alternative-name memory in principle) via
`POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md`
(operational candidate-grounds policy), as already amended once by
`POL-0011`/`POL-0012` (unit-spelling equivalence) — this ADR proposes
the same shape of extension again, for a materially larger set of
mechanisms, following the same `ADR-0007`-first sequencing precedent.
Does not amend `BDR-0012`, `POL-0001`–`POL-0006`, the accepted UOM
Specification, `BDR-0009`, or any Business Worth artifact. Existing
Specification/Rule 8/Implementation Authorization artifacts for the
original supplier-wording capability
(`product-identity-alternative-name-specification.md`,
`product-identity-alternative-name-rule8-assessment.md`,
`product-identity-alternative-name-implementation-authorization.md`)
and for the unit-spelling amendment
(`product-identity-alternative-name-specification-unit-spelling-amendment.md`,
`product-identity-alternative-name-specification-unit-spelling-rule8-assessment.md`,
`product-identity-alternative-name-specification-unit-spelling-implementation-authorization.md`)
remain unmodified and are the direct precedent for what a future
Specification/Rule 8/Authorization for this ADR would need to look
like, if this ADR is accepted.

## 11. Product Architect Acceptance

**ACCEPTED / AUTHORIZED.**

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

**Scope of this acceptance, as explicitly granted:**

1. **The business objective (§0)** — duplicate prevention as the
   headline goal, with fuzzy matching and every other technique as
   mechanisms toward it, not the goal itself — is adopted as settled
   business policy.
2. **The RECOGNIZE → PRESENT → OWNER DECIDES → REMEMBER flow (§0, §1)**
   is adopted as the governing shape for this capability.
3. **The two complementary mechanism families (§1, §4)** —
   deterministic linguistic recognition and semantic/AI recognition —
   are authorized for consideration as new Candidate Grounds, subject
   to every constraint in §8 and to `POL-0013`.
4. **The Contradiction/Negative-Evidence Check (§5)**, scoped to
   schema-free evidence only, is authorized as a cross-cutting
   suppression mechanism.
5. **The "no plausible candidate" clarification (§2, §6)** — that
   outcome now requires every authorized recognition mechanism to have
   had the opportunity to propose a candidate, not merely that the
   exact-match check failed.
6. **The canonical-name principle (§3)** and **every Non-Negotiable
   Constraint in §8** are adopted as binding, without exception, on
   any future Policy, Specification, Rule 8 Assessment, or
   implementation.

**Not included in this acceptance:** any source code implementation;
any change to `src/`, `server/`, `firestore.rules`, or
`firestore.indexes.json`; any Rule 8 Assessment; any Implementation
Task, Plan, or Authorization; any commit or push. Per §9 (unchanged by
this acceptance), the next step in this repository's established
sequence is a Specification amendment, followed by its own Rule 8
Assessment and Implementation Authorization — none of which is
authorized or implied by this acceptance. Structured product
attributes and cross-supplier candidate evidence remain outside this
acceptance's scope entirely (§1, "Out of Scope").

## 12. Governance Notes

- This document does not modify any existing repository artifact.
- This redraft supersedes the prior draft version of this same file;
  the acceptance above applies to this redrafted version.
- This document does not itself authorize a Specification, Rule 8
  Assessment, or Implementation Authorization — acceptance of the
  business decision is a separate act from authorizing engineering
  work, exactly as `POL-0013`'s own Governance Notes state for the
  amendment it operationalizes.

**Lifecycle:** Drafted (redrafted) → Proposed → **Accepted**. Not
Implemented, not Rule 8 Assessed, not Authorized for engineering work
— those remain separate, explicit, subsequent steps.
