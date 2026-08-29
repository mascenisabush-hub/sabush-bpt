# Product Recognition Intelligence — Implementation Authorization

**Status:** ✅ **ACCEPTED AND AUTHORIZED.** Signed by the Product
Architect, §7. Engineering implementation of the complete
Implementation Plan (all four checkpoints, as one authorized
capability) may proceed strictly within the scope, non-negotiables,
acceptance criteria, and exclusions recorded in this document.

**Governing chain (sole authority for this Authorization):**
[`ADR-0008`](../adr/ADR-0008-complementary-recognition-mechanisms-scope-decision.md)
(✅ Accepted/Authorized — SABUSHIMIKE MASCENI, 29 August 2026) →
[`POL-0013`](../specs/POL-0013-supplier-wording-recognition-complementary-evidence-amendment.md)
(✅ Accepted/Authorized, concurrently) →
[Rule 8 Assessment](./product-recognition-intelligence-rule8-assessment.md)
(✅ **READY**, revised) →
[Implementation Plan](./product-recognition-intelligence-implementation-plan.md)
(🟡 Draft) → **this Authorization**.

**Baseline:** `main = origin/main = e3989ed8c1bde405f8fe20ab588070cb93699a26`.
Working tree contains exactly the four preceding governance drafts as
untracked files (`ADR-0008`, `POL-0013`, the Rule 8 Assessment, the
Implementation Plan) — no application code, test, or existing
governance file modified.

**One capability, one business objective, stated once, governing
everything below:** prevent duplicate Product creation by recognizing
that incoming supplier/receipt wording plausibly refers to an existing
Product, through complementary deterministic and semantic/AI
candidate-producing mechanisms, while preserving Owner authority over
uncertain identity. This document authorizes that capability as one
whole — it does not authorize four separate features, and no
checkpoint below may be treated as its own separately-gated capability.

---

## 1. Governance Completeness — What This Record Confirms

- `ADR-0008` is signed and Accepted, scoping deterministic linguistic
  recognition and semantic/AI recognition as complementary Candidate
  Grounds under `BDR-0013`/`POL-0007`, explicitly excluding structured
  attributes and cross-supplier evidence.
- `POL-0013` is signed and Accepted, operationalizing `ADR-0008` into
  five new Candidate Grounds plus a schema-free Contradiction Check,
  with explicit Semantic/AI-Specific Constraints.
- The Rule 8 Assessment, re-opened and revised per explicit Product
  Architect instruction, evaluated deterministic and semantic/AI
  recognition **together as one capability** and reached a verdict of
  **READY**, with zero unresolved Category 3 (Product-Architect-
  decision-required) items.
- The Implementation Plan translates that READY verdict into four
  phased checkpoints, an aggregation contract, a security/tenant-
  isolation constraint for the semantic/AI mechanism, and an explicit
  deferral of model/provider/prompt selection to this Authorization
  stage — consistent with, not expanding, everything above.
- **No further Specification, BDR, or POL amendment is required** for
  anything within the scope defined in §2 below.

## 2. What Is Authorized

Upon signature, engineering implementation of the **complete
Implementation Plan**, all four checkpoints, as one authorized unit of
work (may still be delivered/merged incrementally per checkpoint —
that is an engineering sequencing choice, not a re-gating requirement):

**Checkpoint 1 — Character/typo spelling variation + Contradiction
Check.** New pure per-token edit-distance comparison function(s);
`ground: 'character-spelling-variation'`; a schema-free Contradiction
Check comparing numeric/variant tokens directly in the compared
wording strings, evaluated post-union, capable of suppressing or
demoting a candidate regardless of accumulated positive evidence.
Files: `productNameSimilarity.ts`, `supplierWordingMatching.ts`,
`types.ts` (additive `grounds` enum value;
`SupplierWordingRecognitionOutcome` contradiction-aware shape,
additive only).

**Checkpoint 2 — Abbreviation + curated synonym + curated translation
recognition.** Three new fixed, auditable, module-level lookup tables
(mirroring `UNIT_SPELLING_EQUIVALENCE_TABLE`'s existing shape),
shipped structurally present but empty-by-default, populated
incrementally against real evidence; `ground` values
`'abbreviation-match'`, `'synonym-match'`, `'translation-match'`.
Files: new `productNamingTables.ts` (or equivalently named module),
`supplierWordingMatching.ts`.

**Checkpoint 3 — Owner-facing presentation of candidates through the
existing confirmation flow.** Extension of `AddStockView.tsx`'s
existing candidate-explanation rendering to display every new `ground`
value in plain language, and to state a shown weak-tier contradiction
explicitly. **No new UI component, no new confirm/decline interaction**
— the existing panel and its existing three actions (confirm / choose
another / create new) are reused unchanged, for every checkpoint.

**Checkpoint 4 — Semantic/AI candidate discovery.** One new, isolated,
asynchronous I/O-boundary function, invoked only when Checkpoints 1–2
together produce zero candidates for the wording being resolved;
`resolveSupplierWordingRecognition` becomes `async` to accommodate it;
`AddStockView.tsx`'s callers become `await`-based, reusing the
existing pending-state UI. `ground: 'semantic-match'`.

**Model/provider/prompt boundary for Checkpoint 4 (implementation
detail, not a governance re-decision):** no specific AI model,
embedding technique, provider, or prompt is selected by this
Authorization — none was selected by `ADR-0008`, `POL-0013`, the Rule
8 Assessment, or the Implementation Plan, and this Authorization does
not invent one now. The following **contract** is authorized in its
place, and whatever is selected during implementation must satisfy it
without further governance return:

- **Input boundary:** the function receives only the current, already
  business-scoped `products` array (name + `id` only — no other
  field) already held client-side, plus the single incoming wording
  string. It performs no independent Firestore query, and receives no
  data belonging to any other business.
- **Output boundary:** zero or more `{ productId, ground:
  'semantic-match' }` values. No confidence score, raw model output,
  or free-text model explanation is persisted or surfaced to the
  Owner — only the fixed `ground` label, consistent with every other
  mechanism.
- **Failure boundary:** any error, non-2xx response, or malformed
  output from the underlying provider resolves to an empty result
  `[]` inside this function's own try/catch — it never throws outward,
  never blocks, and never degrades the deterministic candidates
  already gathered in the same recognition pass.
- **Latency boundary:** a hard timeout, proposed at a small number of
  seconds (exact figure an implementation choice, not fixed here),
  after which the call is treated as a failure per the failure
  boundary above — the Owner's row is never left in an indefinite
  pending state.
- **Determinism note:** reproducibility across model/provider versions
  is explicitly **not** guaranteed or required by this Authorization —
  consistent with `ADR-0008`'s own acknowledgment that this is an
  inherent property of this mechanism, not a defect to engineer away.

## 3. Non-Negotiables — Preserved, Verified Against the Rule 8 Assessment, Binding on Implementation

Every item below is already structurally guaranteed by the existing
pipeline shape (per the Rule 8 Assessment's §5a finding) or is a
concrete implementation contract stated in the Plan — none is a new
decision introduced by this Authorization; each is restated here as a
binding acceptance-testable requirement:

- Every mechanism — Checkpoints 1, 2, and 4 alike — produces
  candidates only; none writes anything.
- No mechanism may automatically select an existing Product.
- No mechanism may automatically create a Product.
- No mechanism may automatically merge Products (no merge capability
  exists in this codebase at all, for any reason — unchanged).
- The Owner remains the final authority for every outcome beyond the
  existing byte-exact, single-supplier automatic-reuse path — itself
  unchanged by this Authorization.
- A triggered contradiction remains blocking (suppress or demote),
  regardless of how many positive grounds — from any mechanism, or
  combination — agree; accumulated positive evidence may never
  override it.
- `'no-candidates'` is returned only once every enabled, applicable
  mechanism (Checkpoints 1, 2, and 4, when reached per Checkpoint 4's
  gating) has been invoked for that wording.
- Multiple mechanisms proposing the **same** `productId` aggregate
  their `grounds` onto one candidate entry — never duplicate entries
  for the same product.
- Mechanisms proposing **different** `productId`s are all presented,
  unranked, per `POL-0007`'s unamended "no presumed ranking" rule —
  the system never silently picks one.
- A deterministic candidate is never discarded because the semantic/AI
  mechanism (when invoked) returns nothing, and — per Checkpoint 4's
  gating rule — is typically never even reached once a deterministic
  candidate already exists.
- Semantic/AI failure (§2's failure boundary) is isolated and never
  erases, blocks, or degrades deterministic candidates already found
  in the same pass.
- Semantic/AI operates strictly within the tenant-scoped input
  boundary (§2) — no cross-business data of any kind reaches or
  leaves that function.
- No unrelated redesign of Product Memory, UOM/`unitRelationship`,
  Business Worth, Stock Count, or any finalization/closing mechanism —
  none is touched by any checkpoint, confirmed in the Rule 8 Assessment
  and unchanged here.
- No automatic behavior, in any checkpoint, may bypass the Owner
  decision boundary — enforced structurally, since every new mechanism
  is a candidate-contributing input to the existing single write path
  (`AddStockParams.pendingSupplierWording` → `confirmSupplierWordingRelationship`),
  never a new write path of its own.
- Canonical Product naming is preserved absolutely — `Product.name` is
  never rewritten by any mechanism or by confirmation; the existing
  client-side rewrite-`productName`-to-canonical-before-submit
  mechanism (unchanged) continues to carry every confirmed candidate,
  from any ground, through the existing write path unchanged.
- Product Memory / "remember" behavior is unchanged —
  `confirmSupplierWordingRelationship` continues to write only
  `supplierWordings`; `unitRelationship`/`sellingPrice` remain
  untouched by recognition, confirmed and unaffected by every
  checkpoint.
- The existing Product-creation write path
  (`addStockBatch`/`addMultipleStockBatches`) is unchanged — new
  candidates reach it exactly as existing ones do today, through the
  same canonical-name-rewrite mechanism, never a new or parallel path.

## 4. Acceptance Criteria — Precise and Testable

Implementation is complete and acceptable only when every criterion
below holds, verified by the test suites named in the Implementation
Plan §7:

1. **Checkpoint 1:** `"Coka Cola 2L"` against a catalog containing
   `"Coca Cola 2L"` produces a candidate with
   `ground: 'character-spelling-variation'`. `"Pedasco Normale"`
   against a catalog containing `"Pedaço"` produces a candidate with
   the same ground. A wording sharing no meaningful token/character
   overlap with any catalog product produces no candidate from this
   ground.
2. **Contradiction:** `"Coca Cola 2L"` against a catalog containing
   only `"Coca Cola 1L"` does **not** produce an un-flagged candidate
   — the size disagreement suppresses or demotes it, and this holds
   even when a positive ground (e.g. spelling similarity) would
   otherwise have proposed it.
3. **Checkpoint 2:** with a translation-table entry present mapping
   "Lixívia" ↔ "Bleach", a receipt wording "Lixívia 1L" against a
   catalog product "Bleach 1L" produces a candidate with
   `ground: 'translation-match'`. With an empty table, no such
   candidate is produced, and no false candidate is introduced by an
   empty table under any input.
4. **Checkpoint 3:** every new `ground` value renders a plain-language
   explanation in the existing candidate panel; a suppressed
   weak-tier contradiction, when shown at all, states the
   contradiction in plain language; no new UI component or
   confirm/decline control is introduced.
5. **Candidate aggregation:** when two mechanisms (e.g. Checkpoint 1
   and Checkpoint 4) both propose the same `productId` for one
   wording, exactly one candidate entry is produced for that product,
   with a `grounds` array containing both.
6. **Conflicting candidates:** when two mechanisms propose different
   `productId`s for one wording, both candidates are presented to the
   Owner, with no default selection and no implicit ranking.
7. **No-candidate behavior:** `'no-candidates'` is returned only after
   Checkpoints 1, 2, and (per its gating) 4 have all had the
   opportunity to contribute — verified by a test asserting the
   semantic/AI mechanism is invoked before a no-candidate result is
   returned, when Checkpoints 1–2 alone find nothing.
8. **Deterministic + AI interaction:** when Checkpoint 1 or 2 already
   produces a candidate, the semantic/AI mechanism is not required to
   run for that wording (per the Checkpoint 4 gating default) — and
   if it is nonetheless invoked and returns nothing, the deterministic
   candidate is unaffected and still presented.
9. **AI failure isolation:** simulated provider error, non-2xx
   response, and malformed output each resolve to an empty semantic/AI
   contribution; in every case, any deterministic candidate already
   found in the same pass is still presented, unaffected.
10. **AI latency/timeout:** a simulated hang past the implemented
    timeout resolves to an empty semantic/AI contribution within the
    bounded time, never leaving the Owner's row pending indefinitely.
11. **Tenant isolation:** the semantic/AI function's constructed input
    is asserted, in tests, to contain only the current business's own
    product names/ids — never another business's data, under any
    simulated multi-tenant test fixture.
12. **Owner presentation:** every candidate from every mechanism is
    shown through the existing panel only; no candidate is
    auto-selected, auto-confirmed, or hidden without an explicit
    contradiction reason.
13. **Owner confirmation/decline:** confirming any candidate — from
    any single mechanism or combination — routes through the existing,
    unmodified `confirmSupplierWordingRelationship`; declining behaves
    exactly as it does today for the existing three grounds, with no
    new special-casing per new ground.
14. **Canonical naming:** confirming a candidate from any new ground
    never alters `Product.name`; the confirmed wording is stored only
    as remembered supplier wording, exactly as today.
15. **Product Memory / remember behavior:** confirming a candidate
    from any new ground writes only to `supplierWordings`;
    `unitRelationship` and `sellingPrice` are read, not written, by
    recognition/confirmation, and remain governed exclusively by the
    existing, separate Product Memory mechanism.
16. **Existing product-creation path:** creating a genuinely new
    Product (Owner selects "create new" despite a candidate, or no
    candidate exists) behaves exactly as it does today — no checkpoint
    alters `addStockBatch`/`addMultipleStockBatches`'s own logic.
17. **Regression protection:** every existing test in
    `tests/supplier-wording-*.test.ts` and
    `tests/product-name-similarity.test.ts` continues to pass
    unmodified after all four checkpoints are implemented.
18. **No automatic creation/merge/selection:** a dedicated negative
    test suite asserts, for every new ground individually and in
    combination, that no candidate is ever written to Firestore
    without a preceding, explicit, simulated Owner confirm action.
19. **Test coverage:** each checkpoint ships with the test file(s)
    named in the Implementation Plan §7, before that checkpoint is
    considered complete.
20. **Rollback/scope boundary:** Checkpoints 1–3 remain fully
    functional with Checkpoint 4 disabled/reverted (per the
    Implementation Plan §8); no checkpoint introduces a Firestore
    schema, rule, or index change; no file outside the list in §2 of
    this Authorization is modified without returning through
    governance first.

## 5. What Is Not Authorized

- Structured product attributes of any kind (brand/size/type/
  variant/packaging as persisted fields) — requires its own new BDR.
- Cross-supplier candidate evidence or reuse — requires its own
  `BDR-0013` amendment.
- Any automatic-resolution tier beyond the existing byte-exact,
  single-supplier reuse path.
- Any specific AI model, embedding technique, provider, or prompt
  beyond satisfying the contract in §2 — selection happens during
  implementation, within that contract, without returning to this
  gate, but is not itself pre-selected here.
- Any confidence score or threshold surfaced to the Owner, stored, or
  used to rank candidates.
- Any change to Product Memory, `unitRelationship`, Business Worth,
  Stock Count, or any finalization/closing mechanism.
- Any new UI component or confirm/decline interaction beyond
  extending the existing panel's explanatory text.
- Any Firestore schema, rule, or index change.
- Any persistence of which `ground`(s) led to a confirmation (the
  Implementation Plan's §4 "optional, explicitly deferred" item) —
  not included unless separately authorized.

## 6. Governance Dependencies

This Authorization depends on, and does not modify, `ADR-0008`
(Accepted), `POL-0013` (Accepted), the Rule 8 Assessment (READY), and
the Implementation Plan (Draft, becomes final upon this signature). No
further Specification, BDR, or POL amendment is required for the scope
in §2. Any discovered need to exceed §2/§3/§5's boundaries during
implementation returns to Product Architect review before proceeding
— not resolved silently, per this repository's own standing
discipline.

## 7. Product Architect Acceptance / Signature

**Status: ACCEPTED AND AUTHORIZED.**

> PRODUCT ARCHITECT ACCEPTANCE
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026
>
> I accept and authorize the complete Product Recognition Intelligence
> implementation defined by the Implementation Plan and covered by the
> READY Rule 8 Assessment.
>
> This authorization covers the complete capability as ONE
> implementation:
> 1. Character/typo spelling variation + contradiction check.
> 2. Abbreviation, curated synonym, and curated translation
>    recognition.
> 3. Owner-facing candidate presentation through the existing
>    recognition confirmation flow.
> 4. Semantic/AI candidate discovery.
>
> The business objective remains duplicate-product prevention.
>
> All recognition mechanisms remain complementary candidate-producing
> grounds under:
> RECOGNIZE → PRESENT → OWNER DECIDES → REMEMBER
>
> No mechanism is authorized to:
> - automatically select an existing product;
> - automatically create a product;
> - automatically merge products;
> - override a contradiction;
> - bypass the Owner decision.
>
> Semantic/AI recognition is explicitly authorized as part of this
> same capability and same governance chain. It must remain subject to
> the mechanism-specific constraints and acceptance criteria already
> established by Rule 8 and the Implementation Plan. Do not create a
> separate governance lineage or separate Rule 8 assessment for
> Semantic/AI.

**Effective upon this signature:** this Authorization is now in
force. Engineering implementation of the complete Implementation Plan
— all four checkpoints, as one authorized capability, not four
separately-gated ones — may proceed, strictly within the scope defined
in §2, the non-negotiables in §3, the acceptance criteria in §4, and
the exclusions in §5 (reaffirmed below, unchanged, per this
acceptance):

- No structured-attribute recognition.
- No cross-supplier evidence.
- No automatic-resolution tier beyond the authorized existing
  behavior (byte-exact, single-supplier reuse).
- No unauthorized model/provider/prompt selection — Checkpoint 4's
  §2 contract governs; no specific choice is pre-selected here.
- No unauthorized confidence/threshold policy — none is surfaced,
  stored, or used to rank candidates.
- No changes to Product Memory, UOM/`unitRelationship`, Business
  Worth, Stock Count, or any finalization/closing mechanism.
- No new UI component beyond what the Plan already authorizes
  (extension of the existing candidate-explanation panel only).
- No unauthorized Firestore schema, rule, or index changes.
- No `grounds`-on-confirmation field — not included in this
  Authorization.

Any discovered need to exceed these boundaries during implementation
returns to Product Architect review before proceeding, per §6.

---

## Governance Notes

- This document does not modify `ADR-0008`, `POL-0013`, the Rule 8
  Assessment, or the Implementation Plan — all remain byte-for-byte
  unchanged.
- This document does not itself constitute authorization — §7 governs.
- Upon signature, engineering may begin strictly within §2/§3/§4,
  checkpoint by checkpoint, per the Implementation Plan's own phasing.
