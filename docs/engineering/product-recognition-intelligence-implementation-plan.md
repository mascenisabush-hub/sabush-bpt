Implementation Plan — DRAFT, NOT AUTHORIZED

# Product Recognition Intelligence — Complementary Deterministic & Semantic/AI Candidate Grounds

**Status:** 🟡 **DRAFT — NOT AUTHORIZED.** Does not authorize
implementation. Implementation Authorization remains a separate,
subsequent, signed document (not created here).

**Governing chain:**
[`BDR-0013`](../specs/BDR-0013-product-identity-alternative-name-memory.md)
(Approved) →
[`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(as amended by
[`POL-0011`](../specs/POL-0011-supplier-wording-recognition-unit-normalization-amendment.md)/
[`POL-0012`](../specs/POL-0012-similarity-confirmation-threshold-unit-normalization-amendment.md),
via [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md))
→
[`ADR-0008`](../adr/ADR-0008-complementary-recognition-mechanisms-scope-decision.md)
(✅ ACCEPTED/AUTHORIZED — SABUSHIMIKE MASCENI, 29 August 2026) →
[`POL-0013`](../specs/POL-0013-supplier-wording-recognition-complementary-evidence-amendment.md)
(✅ ACCEPTED/AUTHORIZED, concurrently) →
[Rule 8 Assessment](./product-recognition-intelligence-rule8-assessment.md)
(✅ **READY**, revised) → **this Plan**.

**Baseline:** `main = origin/main = e3989ed8c1bde405f8fe20ab588070cb93699a26`,
working tree containing exactly the three governance drafts above as
untracked files — no application code, test, or existing governance
file modified. Reconfirmed via `git status`/`git fetch` immediately
before drafting this Plan.

**This document does not modify application code, tests, Firestore
rules, indexes, or schema.** It translates the READY Rule 8 Assessment
into a concrete, phased, file-by-file map for the eventual
Implementation Authorization to reference. Where `ADR-0008`/`POL-0013`
deliberately left a technical choice open (specific algorithm, table
content, model/provider), this Plan proposes a **specific, reasoned
default** — marked explicitly as a Plan-level proposal, not a
governance re-decision — because that is exactly the kind of Category
2 (implementation-level) decision the Rule 8 Assessment found does not
require returning to the Product Architect gate. Any such proposal
remains open to Product Architect override at Authorization.

---

## 1. Scope

**In scope — every Candidate Ground and mechanism `ADR-0008`/`POL-0013`
authorize, phased across four checkpoints (§3):**

1. Character/token-level spelling variation (typo/OCR-adjacent,
   naming only).
2. Abbreviation recognition (curated table).
3. Curated synonym mapping (same-language).
4. Curated translation mapping (cross-language).
5. Schema-free Contradiction Check (numeric size/quantity/variant
   disagreement).
6. Semantic/AI-assisted candidate discovery, isolated and
   failure-bounded per `ADR-0008` §8/§5a of the Rule 8 Assessment.
7. `grounds`-array extension and UI surfacing for every new ground
   above, reusing the existing candidate-presentation panel.

**Out of scope — unchanged from `ADR-0008` §1:** structured product
attributes (new BDR required); cross-supplier candidate evidence
(`BDR-0013` amendment required); any automatic-resolution tier beyond
the existing byte-exact reuse path; any change to `Product.name`,
`Product.id`, `Product.unitRelationship`, `Product.sellingPrice`,
Business Worth, or Initial Stock beyond what recognition already
touches.

## 2. Insertion Point — Explicit Design Decision

`resolveSupplierWordingRecognition` (`supplierWordingRecognition.ts`)
remains the single composition point (Rule 8 §5 item 3). It becomes
**async**, returning a `Promise<SupplierWordingRecognitionOutcome>`
instead of a synchronous value, to accommodate the semantic/AI
mechanism (Checkpoint 4). Every deterministic mechanism inside it
remains synchronous internally; only the outer function and its
callers change shape.

**Aggregation contract (Rule 8 §6, §5a), stated precisely for this
Plan:**
- Every enabled mechanism is invoked for every recognition pass.
- Each mechanism returns either zero or more candidates, each carrying
  its own `ground`.
- A mechanism that throws, times out, or is disabled contributes an
  **empty result**, never an error that propagates to the caller —
  enforced by wrapping the semantic/AI call specifically in a
  try/catch that resolves to `[]` on any failure (mirroring
  `callVisionExtractionProvider`'s own existing isolation discipline).
- Candidates from all mechanisms are unioned by `productId`: if two
  mechanisms propose the same `productId`, their `grounds` arrays are
  merged onto one candidate (Rule 8 §5a, "same candidate" case); if
  they propose different `productId`s, both candidates are kept,
  unranked (Rule 8 §5a, "different candidates" case, `POL-0007`'s
  existing no-presumed-ranking rule).
- The Contradiction Check (§4 below) runs once per candidate, against
  that candidate's target product, after the union step — never once
  per mechanism.
- `'no-candidates'` is returned only after every enabled mechanism has
  been invoked and the union (post-contradiction) is empty.

**Caller propagation:** `AddStockView.tsx`'s row-change handlers
(currently synchronous calls into `resolveSupplierWordingRecognition`)
become `async`/awaited, with the row's UI showing its existing
"checking…" affordance (already present for the current synchronous
call's brief compute time) extended to cover genuine network latency
when the semantic/AI mechanism is enabled. **No new UI component is
introduced** — the existing pending/candidate/no-candidate row states
are reused unchanged.

## 3. Phased Checkpoints

Phasing is a Category 2 (implementation-level) decision per the Rule
8 Assessment (§15) — not a return to the Product Architect gate.
Ordering follows the same risk-ascending discipline
`ADR-0007`→`POL-0011` already established (deterministic, local,
zero-dependency first; the one async/external-dependency mechanism
last, isolated and additive).

**Checkpoint 1 — Character/token-level spelling variation + Contradiction Check**
- New pure function(s) in `productNameSimilarity.ts` or a sibling
  module: a bounded edit-distance (Damerau-Levenshtein) comparison
  applied **per-token**, not to the whole string (Rule 8's own
  investigation finding: whole-string edit distance penalizes
  extra/missing words the existing Jaccard mechanism already
  tolerates — per-token application composes with, rather than
  replaces, the existing tokenizer).
- **Plan-level proposal** (not governance-decided, open to
  Authorization override): a fixed per-token edit-distance ceiling
  (e.g. distance ≤ 2 for tokens of length ≥ 4) — small enough to
  catch "Pedasco"/"Pedaço"-class variation, conservative enough to
  avoid short-word collision risk the investigation flagged.
- New `ground: 'character-spelling-variation'` added to the closed
  `grounds` enum.
- Contradiction Check: new pure function comparing numeric
  tokens/variant-keywords extracted from the two compared wordings
  directly (no schema access) — e.g. differing digit sequences
  adjacent to a unit-like token, or a variant keyword present on one
  side only. Returns a suppress/demote signal, evaluated post-union
  (§2), never blended into any score.
- Files touched: `productNameSimilarity.ts` (new functions),
  `supplierWordingMatching.ts` (`detectSupplierWordingCandidates`
  composes the new ground + contradiction), `types.ts` (`grounds`
  enum extension; `SupplierWordingRecognitionOutcome` gains a
  `contradiction`-aware shape per Rule 8 §5 item 7 — additive, no
  existing variant altered).
- No async change yet — `resolveSupplierWordingRecognition` stays
  synchronous through this checkpoint.

**Checkpoint 2 — Abbreviation, curated synonym, curated translation**
- Three new fixed, auditable, module-level tables, mirroring
  `UNIT_SPELLING_EQUIVALENCE_TABLE`'s existing shape exactly — plain
  object literals, reviewable in a single PR diff, no runtime mutation.
- **Plan-level proposal:** ship each table intentionally small and
  empty-by-default at first merge (structure present, entries added
  incrementally per real supplier/receipt evidence encountered during
  testing with the business owner, rather than pre-populated
  speculatively) — consistent with the investigation's own finding
  that a wrong table entry is a reviewable data error, not a runtime
  risk, but an empty table is zero risk at all.
- New `ground` values: `'abbreviation-match'`,
  `'synonym-match'`, `'translation-match'`.
- Files touched: new `productNamingTables.ts` (or similar) for the
  three tables; `supplierWordingMatching.ts` composes them.

**Checkpoint 3 — UI surfacing for Checkpoints 1–2**
- Extend `AddStockView.tsx`'s existing candidate-explanation rendering
  to display the new `ground` values in plain language (Rule 8 §14's
  existing UI test coverage extended, not replaced) — e.g. "Spelling
  is similar" / "Known short form" / "Known alternate name" /
  "Known translation", following the exact copy pattern the existing
  three grounds already use.
- Extend the same rendering to surface a suppressed/demoted
  contradiction, when shown at all (weak-tier only, per Rule 8's
  carried-forward severity tiering note) — e.g. "Not shown: sizes
  differ."
- No new UI component; no new confirm/decline interaction — the
  existing panel and its existing three buttons (confirm / choose
  another / create new) are reused unchanged.

**Checkpoint 4 — Semantic/AI candidate discovery**
- New, isolated, async I/O-boundary function (a sibling to
  `callVisionExtractionProvider`'s existing pattern in
  `server/index.ts` or a new dedicated server route), invoked **only
  when Checkpoints 1–2 collectively produce zero candidates** for the
  wording being resolved (Rule 8 §5a: semantic/AI is proposed for the
  residual class deterministic mechanisms cannot reach — this
  ordering keeps the common case fast and network-free, and is a
  Plan-level proposal, not a governance requirement, open to
  Authorization override).
- **Model/provider/threshold selection is explicitly deferred to
  Authorization**, per the Rule 8 Assessment's own instruction not to
  choose these at the governance stage — this Plan defines the
  **contract** the mechanism must satisfy (input: the incoming wording
  string plus the current business's own product name list only,
  scoped per §5 below; output: zero or more `{productId, ground:
  'semantic-match'}` candidates; failure: empty result, never a thrown
  error reaching the caller; timeout: a hard-bounded ceiling, proposed
  at a few seconds, so a row's UI never blocks indefinitely), not the
  implementation of that contract.
- `resolveSupplierWordingRecognition` becomes `async` at this
  checkpoint (§2); `AddStockView.tsx`'s callers are updated to `await`
  it.
- Files touched: new server-side I/O function; `AppContext.tsx` or a
  new client-side wrapper to call it; `supplierWordingRecognition.ts`
  (aggregation becomes async); `AddStockView.tsx` (callers become
  async, existing pending-state UI extended to cover genuine latency).

## 4. Data / Schema Impact

**No Firestore schema change in any checkpoint.** `grounds` is already
an array field; extending its closed TypeScript union with new string
values is a type-level change only, fully backward-compatible with
every existing stored `SupplierWordingRelationship` (Rule 8 §13 item
2). The three new lookup tables (Checkpoint 2) and any contradiction
logic (Checkpoint 1) are pure, in-memory, non-persisted — no new
Firestore collection, document shape, index, or rule is required at
any checkpoint. `SupplierWordingRecognitionOutcome`'s contradiction-
aware shape (Checkpoint 1) is an additive TypeScript type change only.

**One optional, explicitly-deferred item, per Rule 8 §8:** persisting
which `ground`(s) led to a given confirmation, onto
`SupplierWordingRelationship` itself. **Not included in this Plan's
scope** — noted here only so Authorization can explicitly accept or
decline it; omitting it changes nothing about Checkpoints 1–4's own
correctness.

## 5. Security / Tenant Isolation (Checkpoint 4 specifically)

The semantic/AI I/O-boundary function's input is constructed
**exclusively** from the current business's own already-fetched,
business-scoped `products` array (the same array every deterministic
mechanism already reads, per Rule 8 §12) plus the single incoming
wording string — never a cross-business query, never a raw Firestore
read inside the I/O function itself. This is a hard constraint carried
from the Rule 8 Assessment, not a new decision: the function receives
already-scoped data as plain arguments, the same way
`callVisionExtractionProvider` already receives only the specific
image bytes it needs, nothing broader.

## 6. Explicit Exclusions (carried verbatim from `ADR-0008`/`POL-0013` and this Plan's own scope)

- No structured product attribute field of any kind.
- No cross-supplier candidate evidence or reuse.
- No automatic product selection, creation, or merge under any
  condition, at any checkpoint.
- No change to `findExistingSupplierWordingMatch`'s byte-exact
  strictness.
- No change to `matchProductByExactName`'s exactness.
- No confidence score surfaced anywhere in the UI.
- No AI model, provider, or prompt selected by this Plan — proposed as
  an open Authorization-time decision, with the contract in §3
  Checkpoint 4 binding whatever is chosen.

## 7. Testing Plan

Each checkpoint ships with its own test file(s), following the
existing per-mechanism pattern (Rule 8 §14):

- **Checkpoint 1:** new `tests/product-recognition-spelling-variation.test.ts`
  and `tests/product-recognition-contradiction.test.ts` — covering the
  five accepted acceptance examples (`ADR-0008` §7) directly: Coca
  Cola 2L/Coka Cola 2L → candidate; 2L/1L → contradiction suppressed;
  Pedaço/Pedasco Normale → candidate; unrelated products → no
  candidate. Plus negative tests: contradiction cannot be overridden
  by an accumulation of positive grounds; short-word collision cases
  stay below the proposed edit-distance ceiling.
- **Checkpoint 2:** new `tests/product-recognition-naming-tables.test.ts`
  — abbreviation/synonym/translation lookups, including the
  Lixívia/Bleach acceptance example once a translation entry exists,
  and a negative test confirming an empty table produces no false
  candidates.
- **Checkpoint 3:** extension of existing `AddStockView`-adjacent UI
  tests to assert the new `ground` values render their expected
  plain-language text.
- **Checkpoint 4:** new `tests/product-recognition-semantic-ai.test.ts`
  with the external call mocked — covering: candidate-only behavior;
  failure/timeout yields empty result, never blocks deterministic
  candidates; tenant-scoping (input contains only the current
  business's own data); no confidence score reaches the returned
  candidate shape; ordering (only invoked when Checkpoints 1–2 found
  nothing, per §3's proposed default).
- **Cross-cutting negative tests** (all checkpoints): no automatic
  selection; no automatic creation; no automatic merge; one
  mechanism's empty result never suppresses another's non-empty
  result; same-candidate agreement from multiple mechanisms merges
  `grounds` without triggering any different code path.

## 8. Rollback

Every checkpoint is additive and independently revertible: Checkpoint
1–3 are pure/synchronous additions with no schema footprint: reverting
is a plain code revert. Checkpoint 4 is the only checkpoint touching
the call signature of `resolveSupplierWordingRecognition`
(sync→async); if Checkpoint 4 is reverted, Checkpoints 1–3 remain
fully functional as synchronous-only, since the async change is scoped
to Checkpoint 4 alone under this Plan's phasing.

## 9. Governance Dependency

This Plan depends on, and does not modify, `ADR-0008` (Accepted) and
`POL-0013` (Accepted) and the Rule 8 Assessment (READY). No further
Specification, BDR, or POL amendment is required for anything in
scope (§1); anything requiring one is explicitly excluded (§6).

## 10. Next Governance Step

This Plan, once reviewed, requires its own signed **Implementation
Authorization** — a separate document, not created here — before any
line of application code, test, or schema is written. Per standing
instruction, that step is not taken in this turn.
