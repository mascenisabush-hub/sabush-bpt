Decision Record

# Product Recognition Intelligence — Rule 8 Assessment

**Status:** READ-ONLY assessment, **re-opened and revised** per
explicit Product Architect instruction (this session) to evaluate
deterministic/linguistic and semantic/AI recognition **together, as
complementary candidate-producing mechanisms under one duplicate-
prevention capability** — not as two separately-gated capabilities.
This revision supersedes §5, §15, §16, and §17 of the prior version of
this same document in full; §1–§14 (the factual code trace) are
carried forward unchanged, since re-tracing found no new facts that
alter them. **Not** an Implementation Plan, not an Implementation
Authorization. No code, test, or existing governance file was modified
to produce this document.
**Governs:** implementation readiness of
[`ADR-0008`](../adr/ADR-0008-complementary-recognition-mechanisms-scope-decision.md)
(Accepted 29 August 2026) and
[`POL-0013`](../specs/POL-0013-supplier-wording-recognition-complementary-evidence-amendment.md)
(Accepted 29 August 2026, concurrently with `ADR-0008`).
**Baseline commit:** `e3989ed8c1bde405f8fe20ab588070cb93699a26`
(`main`, 2026-08-28 23:53:59 +0000). Working tree at assessment time
contains exactly two untracked files beyond this commit: `ADR-0008`
and `POL-0013` themselves (governance artifacts under assessment) —
nothing else.

---

## 1. Governance Artifacts Inspected

`ADR-0008-complementary-recognition-mechanisms-scope-decision.md`
(full text, fresh read, including its Product Architect Acceptance
section), `POL-0013-supplier-wording-recognition-complementary-
evidence-amendment.md` (full text, fresh read, including its
Acceptance section), `BDR-0013-product-identity-alternative-name-
memory.md`, `POL-0007-supplier-wording-recognition-confirmation-
conflict-policy.md`, `POL-0011`, `POL-0012`, `ADR-0007`,
`product-identity-alternative-name-specification.md` and its
unit-spelling amendment, and the corresponding Rule 8/Implementation
Authorization pair for the original capability and for the
unit-spelling extension.

## 2. Implementation Files Inspected

`apps/tenant/src/lib/supplierWordingMatching.ts`,
`supplierWordingRecognition.ts`, `supplierWordingConfirmation.ts`,
`productNameSimilarity.ts`, `purchaseToSellingConversion.ts`,
`unitRelationship.ts`; `apps/tenant/src/components/AddStockView.tsx`;
`apps/tenant/src/context/AppContext.tsx` (`addStockBatch`,
`addMultipleStockBatches`, `confirmSupplierWordingRelationship`, the
`products` Firestore listener); `server/smartStockEntry.ts`,
`server/index.ts` (extraction route); `apps/tenant/src/types.ts`
(`Product`, `AddStockParams`, `SupplierWordingRelationship`);
`firestore.rules` (`/products/{productId}` rule); and every test file
under `tests/` matching `supplier-wording-*` and
`product-name-similarity`.

---

## 3. Current Recognition Architecture — Traced, Not Inferred

**RECOGNIZE** happens in exactly one place per row:
`resolveSupplierWordingRecognition` (`supplierWordingRecognition.ts`),
which composes two pure functions from `supplierWordingMatching.ts`:
`findExistingSupplierWordingMatch` (byte-exact, single-supplier reuse)
and `detectSupplierWordingCandidates` (normalization/unit-spelling
candidate grounds, via `productNameSimilarity.ts`'s tokenizer). A
parallel, server-side exact-name check
(`matchProductByExactName`, `server/smartStockEntry.ts`) runs for
Smart Stock Entry-extracted rows; its own `ProductMatchStatus` type
reserves an `'uncertain'` value that is **never emitted** — the code's
own comment states fuzzy matching is "Tier 4, deferred." This is a
concrete, already-marked insertion point for the mechanisms `ADR-0008`
authorizes, not a gap that needs to be discovered.

**Candidate generation** — `detectSupplierWordingCandidates` returns
`SupplierWordingCandidate[]`, each carrying a `productId`, the
matched product's name, and a `grounds` array drawn from a closed enum
(`'initial-stock-name' | 'existing-alternative-wording' |
'unit-spelling-equivalence'`).

**Candidate ranking/selection** — none exists today. All candidates
are returned in discovery order; nothing sorts, scores, or limits
them. `POL-0007`'s own "no presumed ranking" rule is enforced simply
by not ranking at all.

**Owner presentation** — `AddStockView.tsx`'s row-level confirm/decline
panel, shared identically by manually-typed and Smart-Stock-Entry-
scanned rows (verified: both paths converge on the same
`pendingSupplierWording`/`supplierWordingCandidates` row state and the
same UI).

**Owner decision** — the same panel; no code path resolves a candidate
without it, for anything above the byte-exact reuse tier (§7 below
proves this from the write layer, not just the UI layer).

**REMEMBER** — `confirmSupplierWordingRelationship`
(`AppContext.tsx`), a Firestore transaction that reads every
conflict-check product, runs `planSupplierWordingConfirmation`
(pure), and on success appends a `SupplierWordingRelationship` to the
**existing matched product's** `supplierWordings` array. `Product.name`
is never touched by this function — confirmed directly from its body.

**Product Memory involvement:** none. `confirmSupplierWordingRelationship`
never reads or writes `unitRelationship`, `sellingPrice`, or any other
Product Memory field. Product Memory resolution (`productMemoryPriceResolution.ts`,
already shipped per this session's own earlier finding) is a fully
separate mechanism, keyed off the resolved `productId` **after**
recognition/confirmation has already happened — exactly the boundary
`ADR-0008` §"Product Memory Boundary" requires, already true today,
unaffected by this ADR.

**UnitRelationship involvement:** none in recognition itself.
Contradiction-relevant unit/size comparison (§10 below) would be new.

**Deterministic-only today:** confirmed — no phonetic, edit-distance,
translation, synonym, or AI/embedding code exists anywhere in
`apps/tenant/src/lib/` or `server/`. The only external-AI/network call
in this codebase's product-related flow is Smart Stock Entry's own
OCR/vision extraction (`callVisionExtractionProvider`,
`server/index.ts`), which is architecturally isolated to a single I/O
boundary function specifically so the surrounding decision logic stays
pure and testable — a precedent pattern, not a mechanism reusable
as-is for semantic product matching (different provider call shape,
different input/output contract).

## 4. Duplicate-Prevention Findings

Today, a duplicate is created whenever **no** existing mechanism finds
a match: `addStockBatch`/`addMultipleStockBatches` resolve the target
product purely by `tempProducts.find(p => p.name.toLowerCase() ===
trimmedName.toLowerCase())` — confirmed directly in
`AppContext.tsx`. Any wording that clears none of today's three
Candidate Grounds and doesn't exact-match silently becomes a new
`Product` document, with no owner-facing signal that a near-duplicate
might exist. This is precisely the gap `ADR-0008`'s "no plausible
candidate" clarification (§2/§6) targets.

**Important existing safeguard, verified, that any new mechanism must
preserve:** when a candidate **is** confirmed, `AddStockParams
.productName` is rewritten **client-side, before submission**, to the
existing product's canonical name (confirmed via the `AddStockParams`
type's own documenting comment and cross-checked against the
write-layer's exact-name lookup) — the original wording travels
separately via `pendingSupplierWording.wording`, never overwriting
`Product.name`. **This is the exact mechanism any new Candidate Ground
must plug into** — the write layer needs no new plumbing for a new
ground; it only needs the UI layer to perform the same
rewrite-productName-before-submit step for whichever new ground the
owner confirms.

## 5. Complementary-Mechanism Findings

1. **Existing deterministic mechanisms that can participate:**
   `findExistingSupplierWordingMatch`, `detectSupplierWordingCandidates`
   — both pure, synchronous, already integrated at the one recognition
   call site (§3). Extending `detectSupplierWordingCandidates` with
   additional grounds (or composing it with sibling pure functions) is
   architecturally consistent with how `POL-0011`'s unit-spelling
   ground was added — verified by reading its own diff shape in
   `supplierWordingMatching.ts`'s existing structure.
2. **What semantic/AI recognition would require:** a new, isolated,
   asynchronous I/O boundary function (mirroring
   `callVisionExtractionProvider`'s existing isolation pattern) — this
   is a **new kind of dependency** for this specific recognition call
   site, since every existing function there is synchronous and pure.
   This is a real architectural change, not a drop-in addition.
3. **Appropriate insertion point exists:** yes —
   `resolveSupplierWordingRecognition` is the single composition point;
   a semantic/AI-sourced candidate list can be unioned with the
   deterministic candidate list there, **but** doing so turns a
   currently-synchronous function asynchronous, which propagates to
   every caller (`AddStockView.tsx`'s row-change handlers, currently
   synchronous). This propagation is a genuine implementation-design
   question, not decided by `ADR-0008`/`POL-0013` (which deliberately
   left "insertion point" as an implementation detail) — flagged in
   §14 as Category 2.
4. **Independent contribution confirmed feasible:** yes — nothing in
   the current `SupplierWordingCandidate` shape prevents multiple
   grounds from being attached to one candidate, or multiple
   candidates (from different sources) coexisting in one array.
5. **Combination without override confirmed feasible:** yes, by
   construction — `grounds` is already an array (not a single enum
   value), so combining evidence is additive by design, matching
   `POL-0013`'s explicit "candidates receive complementary evidence,
   never overridden by one mechanism" requirement.
6. **Contradiction authority:** **does not exist today at all** — no
   suppression/veto mechanism of any kind exists in
   `detectSupplierWordingCandidates` or `productNameSimilarity.ts`.
   This is a net-new concept, not an extension of an existing one.
7. **Four-way distinction (exact/strong, candidate, contradiction, no
   candidate):** the first, second, and fourth already exist as
   `SupplierWordingRecognitionOutcome`'s `'reused'` / `'candidates'` /
   `'no-candidates'` variants. **Contradiction has no representation
   in this type today** — `SupplierWordingRecognitionOutcome` would
   need a new variant, or `SupplierWordingCandidate` would need a
   suppression/demotion field, to represent it. This is an additive
   type change, not a redesign, but it is a concrete, currently-absent
   piece of schema (in the TypeScript-type sense, not Firestore
   schema) that implementation would need to add.

**No algorithm, threshold, or model was selected in reaching any of
the above** — every finding is about *where* and *how* mechanisms
would connect, never *which* mechanism.

### 5a. Unified Evaluation — Deterministic + Semantic/AI as One Capability

Per explicit Product Architect instruction (this session): this
capability has one business purpose — preventing duplicate Product
creation by recognizing that new wording plausibly refers to an
existing Product — and deterministic and semantic/AI recognition are
two complementary mechanisms serving it, not two capabilities. The
findings below assess them together, against the central architectural
question: **can they operate as complementary candidate-producing
grounds while preserving the existing Owner-decision boundary?**

- **Candidate-only behavior (both mechanisms):** confirmed structurally
  guaranteed, not merely intended — §7 already proved no code path
  resolves a candidate without an explicit owner action, for anything
  beyond the byte-exact reuse tier. This guarantee is a property of
  *where* a mechanism plugs in (§5 item 3), not of the mechanism
  itself — so it holds identically for a semantic/AI-sourced candidate
  as for a deterministic one, with no additional enforcement needed
  per mechanism.
- **No automatic selection / creation / merging:** same reasoning —
  these are properties of the write layer (§4, §11), which is
  mechanism-agnostic. A semantic/AI candidate reaches the write layer
  through the identical `pendingSupplierWording`/canonical-name-rewrite
  path (§4) as any other candidate; it cannot bypass it.
- **Contradiction handling:** §10 already establishes contradiction as
  a cross-cutting check over raw wording strings, independent of which
  mechanism(s) proposed the candidate being checked. This design
  — contradiction evaluated once, centrally, against the candidate's
  target product, not per-mechanism — is precisely what prevents
  either mechanism from being able to "vote around" a contradiction:
  there is only one contradiction check to pass, not one per source.
- **"No plausible candidate" semantics:** §6's aggregation-point
  contract already requires every authorized, enabled mechanism to run
  before this outcome is declared — this was written mechanism-
  agnostically, and applies to semantic/AI exactly as to any
  deterministic ground, with no separate rule needed.
- **Owner remains final authority:** §7's findings are about the
  pipeline shape (RECOGNIZE→PRESENT→OWNER DECIDES→REMEMBER), not about
  any specific mechanism — confirmed to hold regardless of which
  mechanism(s) contributed to a shown candidate.
- **Canonical naming / Product Memory / remember behavior:** §9 and §8
  are similarly mechanism-agnostic — `confirmSupplierWordingRelationship`
  writes the same way regardless of which ground(s) led to the
  confirmation.
- **Behavior when mechanisms produce the same candidate:** additive by
  construction (§5 item 5) — the `grounds` array accumulates evidence
  from both sources onto one `SupplierWordingCandidate`; this is
  presentation-strengthening only (a richer explanation shown to the
  owner), never a trigger for any different code path or automatic
  behavior.
- **Behavior when mechanisms produce different/conflicting candidates
  for the same wording:** already governed by `POL-0007`'s unamended
  "Multiple Candidates — No Presumed Ranking" rule (carried forward
  unchanged by `POL-0013`) — all are shown, none is presumed correct
  by virtue of its source. No new rule is needed; the existing one
  already covers a plural-source world, since it was never written
  assuming a single mechanism.
- **Behavior when one mechanism produces a candidate and another
  produces none:** already the union-of-candidates model (§5 item 4)
  — one mechanism's empty result cannot suppress another's non-empty
  result, since each contributes to the same array independently. This
  requires no new coordination logic beyond "aggregate all non-empty
  contributions," already implied by §6's contract.
- **Deterministic mechanism failure vs. AI mechanism failure:** here is
  a genuine, mechanism-specific asymmetry, correctly distinguished, not
  glossed over — deterministic grounds are pure/synchronous and, per
  §3's trace, have no failure mode beyond a programming defect (there
  is no I/O to fail). Semantic/AI introduces the *first* fallible,
  asynchronous dependency at this call site. This asymmetry does not
  block unified operation — it means the aggregation contract (§6)
  must specifically state that a semantic/AI failure yields an empty
  contribution from that mechanism, never an error that blocks or
  degrades the deterministic mechanisms' own results. This is a
  concrete, statable implementation contract, not an unresolved
  question — restated explicitly as a Non-Negotiable Constraint in the
  Implementation Boundary (§17).
- **Model uncertainty / confidence / threshold handling:** consistent
  with `ADR-0008`/`POL-0013`'s own explicit boundary — no threshold or
  confidence-score concept is authorized or needed at the governance
  level. A semantic/AI mechanism's output is treated as a binary
  contribution (produced a candidate with a `ground`, or did not) at
  the governance level, exactly like every deterministic ground. Any
  internal threshold the mechanism uses to decide *whether* to
  contribute a candidate at all is an implementation detail of that
  mechanism, invisible to and unconstrained by the rest of the
  pipeline — the pipeline itself needs no confidence-handling logic of
  its own, because it never sees a score, only a candidate-or-not
  outcome plus a human-readable `ground`.
- **Input/data boundaries, cost/performance:** addressed in §12,
  unchanged by this unified framing — a semantic/AI mechanism must be
  isolated to its own I/O-boundary function, tenant-scoped, and
  throttled/bounded the same way `callVisionExtractionProvider`'s own
  existing precedent already is in this codebase. No new finding here
  beyond what §12 already established; restated in §17 as a carried-
  forward constraint.

**Conclusion of this unified evaluation:** every dimension the Product
Architect listed is either (a) already structurally guaranteed by the
existing pipeline shape in a mechanism-agnostic way (candidate-only,
no auto-selection/creation/merge, owner authority, canonical naming,
Product Memory boundary, multi-candidate handling), or (b) a concrete,
statable implementation contract with no open question left unresolved
(semantic/AI failure isolation, absence of scoring at the pipeline
level, tenant-scoping requirement). No dimension was found where
semantic/AI recognition requires a materially different governance
treatment than any deterministic ground — its only genuine asymmetry
(fallibility/async-ness) is an implementation contract, not a business
decision.

## 6. "No Plausible Candidate" — Contract Required

Today, `SupplierWordingRecognitionOutcome`'s `'no-candidates'` is
reached the instant `detectSupplierWordingCandidates` returns an empty
array — i.e., after exactly the mechanisms that exist today have run.
`ADR-0008`'s clarification, translated into an implementation
contract: **`'no-candidates'` (or its successor variant) must not be
returned until every authorized, enabled mechanism has had the
opportunity to contribute** — meaning `resolveSupplierWordingRecognition`
(or its successor) becomes an aggregation point over N mechanism
calls, not one function call.

Explicitly unresolved, per instruction, and correctly so — these are
implementation decisions, not business decisions `ADR-0008`/`POL-0013`
made:

- What happens if one mechanism errors/times out while others
  succeed (relevant only once an async mechanism exists — §5 item 2).
- The exact ranking/ordering of multiple simultaneous candidates
  (`POL-0007`'s "no presumed ranking" rule already forbids treating
  order as meaning, but doesn't dictate array order).
- What "weak or ambiguous" means for a semantic/AI result — no
  threshold concept exists in governance, and none is invented here.
- Disagreement resolution when two mechanisms propose **different**
  productIds for the same wording — governance requires both be
  shown (no presumed ranking), but the exact UI grouping/rendering
  shape is unspecified.

## 7. Owner-Decision-Authority Findings

Verified directly in code, not inferred:

- **No automatic selection beyond byte-exact reuse:** confirmed —
  `SupplierWordingRecognitionOutcome`'s `'candidates'` branch never
  writes anything; only `AddStockView.tsx`'s explicit confirm handler,
  itself gated on an owner click, calls into the write path.
- **No automatic merge:** confirmed — no function anywhere in
  `AppContext.tsx` merges two `Product` documents; no such capability
  exists in this codebase at all, for any reason.
- **No automatic creation bypassing recognition:** confirmed — every
  product-creation call site (`addStockBatch`, `addMultipleStockBatches`,
  and `recordStockCount` per the Firestore rule's own comment) is
  reached only after the UI layer has already run recognition for that
  row; nothing creates a product without the row having passed through
  `resolveSupplierWordingRecognition` or its Smart-Stock-Entry
  equivalent first.
- **Contradiction cannot be overridden:** vacuously true today — no
  contradiction mechanism exists to override (§5 item 6). This becomes
  a real property to verify only once §5 item 6 is implemented.
- **No silent identity replacement:** confirmed — `confirmSupplierWordingRelationship`
  only appends to `supplierWordings`; nothing rewrites `Product.id` or
  reassigns an existing batch's `productId` after the fact.

**No current code path violates `RECOGNIZE → PRESENT → OWNER DECIDES →
REMEMBER`.** This is a clean baseline for the new mechanisms to extend
without first needing to fix a violation.

## 8. Remember / Product Memory Findings

`SupplierWordingRelationship` (`types.ts`) stores: `supplierRecordId`,
`wording`, `confirmedAt`, `provenance`, optional `confirmedByName`.
**Does not store which `grounds` led to the confirmation** — discarded
after the transient candidate-detection step. Canonical product
identity is remembered implicitly (the relationship lives inside that
`Product` document). UOM/`unitRelationship` is never touched by this
mechanism, confirmed in §3. The remembered relationship **does**
already influence future recognition — `findExistingSupplierWordingMatch`
reads `supplierWordings` on every subsequent resolution call, for the
same supplier.

**Whether the existing structure can support `ADR-0008`'s objective:**
yes, for candidate-only use — no schema change is required merely to
add new deterministic or semantic Candidate Grounds, since none of
them need to change what's stored on confirmation, only what's
evaluated to produce a candidate in the first place.

**One additive schema question, explicitly flagged, not decided:**
should `SupplierWordingRelationship` gain an optional field recording
which ground(s) led to a given confirmation (useful for future audit —
"why did the system suggest this")? Not required by `ADR-0008`/`POL-0013`
as written; noted as a candidate small addition, classified in §14 as
Category 2 (implementation-level), since it's additive, optional, and
backward-compatible with every existing record that lacks it.

## 9. Canonical Name Principle — Implementation Verification

Traced and confirmed exactly as `ADR-0008` §3 describes: recognition
mechanisms operate against a mix of canonical identity
(`Product.name`, via exact-match) and remembered supplier wording
(`Product.supplierWordings[].wording`, via
`findExistingSupplierWordingMatch`) and, for candidates, canonical
identity again (`detectSupplierWordingCandidates` compares the
incoming wording against each product's `name`, per
`productNameSimilarity.ts`). **No implementation gap found** — the
"Pedaço"/"Pedasco Normale" example is already representable in the
existing type shapes (a candidate pointing at Pedaço's `productId`,
with `wording: "Pedasco Normale"` stored on confirmation) — it is only
the **matching mechanism** (character/edit-distance similarity) that
is missing, not the surrounding identity/naming architecture.

## 10. Contradiction Handling — Implementation Verification

**No contradiction handling exists in any form today** — confirmed by
exhaustive read of `productNameSimilarity.ts` and
`supplierWordingMatching.ts`; neither file contains any negative/veto
logic. The specific accepted examples:

| Example | Representable today? |
|---|---|
| Coca Cola 2L / Coka Cola 2L → candidate | Not yet — no character-level ground exists; today's Jaccard/unit-spelling grounds alone do not reliably produce this candidate (verified: differs by more than unit spelling) |
| 2L vs 1L → contradiction | **Not representable at all** — no negative-evidence concept exists; today's system would, if a positive ground otherwise matched, propose this as an ordinary candidate with no warning |
| Pedaço / Pedasco Normale → candidate | Not yet — same gap as row 1, worse (larger edit distance, no shared tokens) |
| Lixívia / Bleach → candidate only if semantic/translation authorized | Correctly unreachable today — zero shared tokens/characters, confirmed by manually tracing `computeNameSimilarity`'s Jaccard logic against this pair |
| Unrelated products → no candidate | Already correct today, for the existing three grounds — no over-eager matching observed in current logic |

**UOM/UnitRelationship attention, as instructed:** the 2L-vs-1L
contradiction case is a **naming-string** comparison (the digits "2"
and "1" appear in the compared wording/name strings themselves), not
a `Product.unitRelationship` comparison — `unitRelationship` describes
purchase↔selling unit conversion for a *single* product, not a
cross-product size distinction. `POL-0013`'s schema-free contradiction
scope (comparing raw wording strings for numeric disagreement) is
therefore correctly scoped **not** to require touching
`unitRelationship` at all — confirmed consistent, no conflict found
between the accepted governance and this system's actual UOM model.

## 11. Product-Creation Safety Findings

The creation write (`addStockBatch`/`addMultipleStockBatches`, §4)
is reached only after the UI-layer recognition step has already run
for that row — confirmed structurally, not just by convention: there
is no code path from a typed/scanned row to `addStockBatch` that
skips `AddStockView.tsx`'s row-change handlers entirely. **All
currently-authorized candidate grounds can already reach this point**
(§4's rewrite-`productName`-before-submit mechanism). For *new*
grounds, the same mechanism applies without change, **provided** the
new grounds are integrated at the same `resolveSupplierWordingRecognition`
call site (§5 item 3) rather than a separate, parallel path — a
parallel path would be the one way this safety property could
silently break, which is why §14 flags "single aggregation point" as
a constraint to carry forward, not merely a convenience.

Owner decision remains explicit at this point today (§7). Product
Memory is not, and per `ADR-0008` should not be, consulted at the
recognition/creation decision point — it activates strictly after
`productId` is resolved.

## 12. Performance / Failure / Security Findings

- **Latency:** every existing mechanism is synchronous, in-memory,
  O(catalog size) per row — negligible at the realistic SME catalog
  sizes this repository targets (consistent with this session's
  earlier investigation finding). A semantic/AI mechanism would be the
  first asynchronous, network-latency-bound step in this specific flow.
- **Repeated recognition:** `AddStockView.tsx` re-runs recognition on
  every keystroke change to a row's `productName` (confirmed by the
  file's own header comment: "every time a row's typed productName
  changes"). An unthrottled async/network call on every keystroke
  would be a real, concrete implementation risk if a semantic/AI
  mechanism were wired in naively — flagged for the Specification
  stage, not solved here.
- **External dependency / failure / timeout:** no existing failure
  handling exists for this call site because no external dependency
  exists here today. `callVisionExtractionProvider`'s own error
  handling (a different call site) is the closest precedent for how
  this codebase already handles a similar failure mode, but is not
  automatically reusable — a new implementation would need its own
  explicit failure contract (e.g., "semantic/AI failure never blocks
  or degrades deterministic candidate presentation" — consistent with,
  but not yet stated as, an explicit requirement in `POL-0013`).
- **Tenant isolation:** structurally enforced today by
  `firestore.rules`'s `/businesses/{businessId}/products/{productId}`
  scoping (`isMemberOf(businessId)`) and by `AppContext.tsx`'s
  `products` state being populated from a single business-scoped
  listener — recognition only ever operates over that in-memory,
  already-tenant-scoped array. **Risk specific to semantic/AI:** if a
  future implementation sends product wording to an external
  provider, tenant isolation must be re-verified at that boundary
  specifically (the Firestore rule offers no protection once data
  leaves the client) — flagged for the Specification stage.
  `ADR-0008`/`POL-0013` do not yet address this, correctly left as an
  open implementation-security question rather than silently assumed
  safe.
- **AI output influencing writes without approval:** structurally
  prevented today by the RECOGNIZE→PRESENT→OWNER DECIDES→REMEMBER
  separation (§7) — as long as any new mechanism is integrated as a
  candidate-producing input to that same pipeline (§5 item 3), this
  protection is inherited automatically, not something that needs to
  be separately re-implemented per mechanism.

## 13. Data / Schema / Firestore Findings

1. **No schema change required:** deterministic grounds
   (character/typo, abbreviation, curated synonym/translation tables,
   schema-free contradiction) — all operate on data already present
   (`Product.name`, `Product.supplierWordings[].wording`, the incoming
   wording string) plus new, non-persisted lookup tables (module-level
   constants, mirroring `UNIT_SPELLING_EQUIVALENCE_TABLE`'s existing
   pattern — not a Firestore concept at all).
2. **Additive schema changes (optional, not required by accepted
   governance):** an optional `grounds` field on
   `SupplierWordingRelationship` (§8); a semantic/AI candidate's own
   `ground` value added to the existing closed enum (a TypeScript
   union extension, not a Firestore schema change — the field itself
   already exists and is already an array).
3. **Structural schema changes:** **none required** by anything
   `ADR-0008`/`POL-0013` authorize. Structured product attributes
   (brand/size/type) remain explicitly out of scope of both documents
   and are not needed for the schema-free contradiction check §10
   already confirmed is sufficient for the accepted example set.

`firestore.rules`'s `/products/{productId}` create rule (`name` must
be a non-empty string) is unaffected — no new write path is proposed
by governance that would need a rule change. No index changes are
implicated — every existing/proposed mechanism operates on an
already-fetched, client-side array, not a new Firestore query shape.

## 14. Existing Test Coverage

| Area | Existing coverage | Gap for new grounds |
|---|---|---|
| Exact recognition | `supplier-wording-matching.test.ts` (31 cases), `product-name-similarity.test.ts` (30 cases) | New grounds need their own dedicated test file(s), following this same pattern |
| Fuzzy/similarity (existing 3 grounds) | Covered | New grounds (typo, abbreviation, synonym, translation, semantic) — no coverage exists, none can exist yet since no code exists |
| Duplicate prevention | Implicit, via the above | No explicit "this should have been recognized as a duplicate and wasn't" regression suite exists yet |
| Product creation | `supplier-wording-add-stock.test.ts` (19 cases) | Covers existing grounds' write-path integration; would need extension for new grounds |
| Product Memory | Covered elsewhere (`product-memory-price-resolution.test.ts`, per this session's earlier verification) — untouched by this ADR, so no new coverage needed here |
| UnitRelationship | Covered elsewhere (`purchase-to-selling-conversion.test.ts` etc.) — untouched, confirmed §10, no new coverage needed |
| Contradiction handling | **None exists** — net-new test file required |
| Supplier wording | `supplier-wording-confirmation-concurrency.test.ts`, `-distinguishing-info.test.ts`, `-draft-abandonment.test.ts` | Reused mechanism — existing tests should continue to pass unmodified if new grounds are added additively |
| Recognition UI | Covered via `AddStockView`-adjacent tests | Would need extension once new grounds surface new `grounds` values in the UI |
| Owner confirmation | Covered | Existing coverage should remain valid — confirmation mechanism itself is unchanged |

**Required negative tests, none of which exist today** (all currently
vacuously "impossible to write" because no new mechanism exists yet):
no automatic selection by a new ground; no automatic creation bypassing
a new ground's candidate; no automatic merge; contradiction cannot be
overridden by accumulated positive grounds; unrelated products remain
non-candidates under new grounds; one mechanism's empty result does
not short-circuit the others; a semantic/AI failure does not degrade
or block deterministic candidate presentation; tenant isolation holds
if/when an external call is introduced.

## 15. Governance Classification of Every Open Item (revised)

| Item | Classification |
|---|---|
| Duplicate-prevention objective; RECOGNIZE→PRESENT→OWNER DECIDES→REMEMBER flow; complementary (not competing) mechanisms, **including semantic/AI evaluated under the same capability, not a separate lineage** (explicit Product Architect instruction, this session); candidate-only for every ground, deterministic or semantic/AI; contradiction precedence over accumulated positive evidence; canonical-name preservation; "no plausible candidate" requires all mechanisms to run; no separate Rule 8/governance cycle required for semantic/AI | **1 — Already decided by accepted governance, reaffirmed and clarified by explicit Product Architect instruction this session** |
| Insertion point / aggregation-point design (§5 item 3, §6); async propagation through `AddStockView.tsx`; candidate ranking/array order; **staging/sequencing of which grounds are built first within the Implementation Plan** (reclassified from Category 3 — this repository's own precedent, e.g. Increment A/B checkpoints in the original capability's Implementation Plan, already establishes that phased build-out is a normal Implementation Plan concern, not a governance gate); semantic/AI failure-isolation contract (§5a); tenant-scoping verification for any external call (§12); keystroke-level throttling (§12); the optional `grounds`-on-confirmation schema addition (§8); new `SupplierWordingRecognitionOutcome` variant or field for contradiction (§5 item 7); test suite structure; specific model/provider/threshold selection (explicitly left to implementation by `ADR-0008`/`POL-0013` themselves, never a Rule 8 or governance decision) | **2 — Implementation-level, resolvable in the Implementation Plan** |
| — | **3 — Requires Product Architect decision before implementation: none remaining.** The two items previously classified here (implementation-pass scope; whether semantic/AI is included at all) are resolved: the Product Architect's explicit instruction this session settles inclusion (evaluate together, one capability, no separate lineage), and re-examination shows implementation-pass staging was never a genuine Category 3 item — it is ordinary Implementation Plan sequencing, addressed above under Category 2. |
| Any contradiction evidence requiring structured attributes; cross-supplier candidate evidence; any expansion of the automatic-reuse tier beyond byte-exact | **4 — Requires Specification/ADR/POL amendment before implementation** (already excluded by `ADR-0008` itself) |
| Business Worth changes; Product Memory redesign; Initial Stock changes beyond what recognition already touches; any structured-attribute schema | **5 — Out of scope** |

No new BDR was manufactured. No implementation detail was silently
promoted into a business decision — every Category 1 item above is
traceable to an explicit sentence in `ADR-0008`/`POL-0013` or to the
Product Architect's explicit instruction this session. Category 3 is
empty; this is stated explicitly rather than simply omitted, so the
change from the prior assessment is auditable.

## 16. Rule 8 Verdict (revised)

# **READY**

Changed from the prior **READY AFTER DECISIONS**, on this evidence:

Both previously-open Category 3 items are resolved:

1. **Whether semantic/AI is evaluated within this same governance
   cycle, not a separate lineage:** resolved by explicit Product
   Architect instruction, this session — deterministic and semantic/AI
   recognition are confirmed as complementary mechanisms under one
   duplicate-prevention capability, not two capabilities requiring
   separate gates. §5a's unified evaluation, conducted against this
   instruction, found no dimension (candidate-only behavior, no
   automatic selection/creation/merge, contradiction handling, "no
   plausible candidate" semantics, owner authority, canonical naming,
   Product Memory boundary, multi-candidate/conflicting-candidate
   behavior, mechanism-failure isolation, absence of scoring at the
   pipeline level, tenant-scoping) where semantic/AI requires
   governance treatment materially different from any deterministic
   ground already authorized by `ADR-0008`/`POL-0013`.
2. **Staging of which grounds are built first:** re-examined and
   reclassified — this is ordinary Implementation Plan sequencing
   (Category 2), not a governance decision. Nothing in `ADR-0008`
   or `POL-0013` requires all authorized grounds to ship
   simultaneously, and this repository's own precedent (the original
   capability's own multi-checkpoint Implementation Plan) already
   establishes that phased delivery under one Implementation
   Authorization is normal, not a reason to withhold Rule 8 readiness.

No blocking governance or architectural conflict was found in §1–§14's
factual trace, and §5a's unified evaluation confirms the complementary-
grounds architecture holds — structurally, not merely by intent —
across both mechanism families. The central architectural question
(§8 of the Product Architect's instruction) is answered: **yes,
deterministic and semantic/AI recognition can operate together as
complementary candidate-producing grounds under one duplicate-
prevention capability while preserving the existing Owner-decision
boundary** — because that boundary is enforced at the write layer and
the single recognition composition point, both of which are
mechanism-agnostic by construction (§5a), not something each new
mechanism must separately re-implement or that could be individually
weakened.

**What READY does not mean:** it does not mean any algorithm, model,
provider, threshold, or scoring formula has been chosen — none has,
consistent with the standing instruction that Rule 8 must not select
these. It does not mean an Implementation Plan or Authorization
exists — neither does. It means the accepted governance is complete
and internally consistent enough that an Implementation Plan can now
be written without needing to return to this gate for a further
business decision.

## 17. Implementation Boundary for the Next Implementation Plan

Authorized, if/when a Product Architect decision on §16 items 1–2 is
made:

- New Candidate Grounds integrate at the single existing
  `resolveSupplierWordingRecognition` composition point (or its
  necessarily-async successor) — no parallel/second recognition path.
- The existing rewrite-`productName`-before-submit mechanism
  (`AddStockParams.pendingSupplierWording`) is reused unchanged for
  every new ground — no new write-path mechanism is authorized.
- `Product.name`, `Product.id`, `Product.unitRelationship`,
  `Product.sellingPrice` remain untouched by any new mechanism.
- `confirmSupplierWordingRelationship` remains the sole writer for
  confirmed relationships; its transaction/conflict-check shape is
  unchanged.
- Contradiction, once implemented, is a cross-cutting suppression
  check evaluated against raw wording strings only (no structured
  attributes) — never blended into a score, never overridable by
  accumulated positive evidence.
- No mechanism selects, merges, or creates a Product without an
  explicit owner action through the existing confirm/decline panel.
- No mechanism is added to Smart Stock Entry's server-side
  `matchProductByExactName` in a way that weakens its exactness — new
  grounds extend `resolveSupplierWordingRecognition`'s scope, not that
  function's.
- Any external network call (semantic/AI, included in this Implementation
  Plan's authorized scope per §16, not deferred) is isolated to its own
  I/O-boundary function, mirroring `callVisionExtractionProvider`'s
  existing isolation/bounding pattern; **must never block or degrade
  deterministic candidate presentation on failure or timeout** (§5a —
  a failed/timed-out semantic/AI call contributes an empty result to
  the aggregation point, never an error that halts recognition); and
  must be verified tenant-scoped (operating only on the current
  business's own product/wording data) before it is wired into the
  aggregation point.
- The recognition pipeline's aggregation point treats every
  mechanism's output uniformly as "contributed a candidate with a
  human-readable `ground`, or did not" — no confidence score is passed
  through, stored, or shown; this applies identically to semantic/AI
  and to every deterministic ground.
- No index, Firestore rule, or structural schema change is authorized
  — none is required by anything in scope.
- Test coverage for every new ground — deterministic and semantic/AI
  alike — follows the existing per-mechanism file pattern
  (`tests/supplier-wording-*`, `tests/product-name-similarity.test.ts`),
  plus a new dedicated contradiction-handling test file, plus the
  negative-test set in §14, plus mechanism-failure-isolation tests
  specific to the semantic/AI ground (§5a).

---

## 18. Repository / Change Control Confirmation

- **Files inspected:** listed in §1–2, all read-only; re-verified
  fresh at re-opening (§ header) with no change to baseline commit.
- **No application code was modified.** `git status --short` at the
  end of this assessment shows exactly three untracked files: the
  pre-existing `ADR-0008`, the pre-existing `POL-0013`, and this Rule
  8 Assessment document itself (now revised in place) — nothing else.
- **No test file was modified.**
- **No existing governance document was modified** — `ADR-0008` and
  `POL-0013` were re-read, not edited: this revision found no
  inconsistency in either requiring correction, so neither was
  touched, per instruction to prefer updating only this Rule 8
  Assessment. `BDR-0013`, `POL-0007`, `POL-0011`, `POL-0012`,
  `ADR-0007`, and every prior Specification/Rule 8/Authorization
  artifact remain byte-for-byte unchanged (verified: no `git diff`
  output against any tracked file).
- **No Implementation Plan or Implementation Authorization was
  created.**
- **Nothing was committed. Nothing was pushed.**

**Lifecycle:** Investigated → Rule 8 Assessed (READY AFTER DECISIONS)
→ **Re-opened and revised** (this session) → **Rule 8 Assessed: READY**.
Not Implemented, not Authorized for engineering work — those remain
separate, explicit, subsequent steps. No Product Architect decision
remains outstanding for the business/governance layer of this
capability; the next gate is an Implementation Plan, which itself
still requires its own Implementation Authorization before any code
is written.
