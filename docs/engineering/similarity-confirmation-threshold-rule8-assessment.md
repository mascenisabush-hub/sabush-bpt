Rule 8 Assessment

# Rule 8 Assessment B — Catalog-Wide Similarity Suggestion Unit-Spelling Normalization

**Governing chain:** [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
(Approved) → [`ADR-0007` Addendum 1](../adr/ADR-0007-additive-product-recognition-layer-scope.md#addendum--governance-route-conformance-gap-handling--policy-numbering)
(Approved) → [`ADR-0007` Addendum 2](../adr/ADR-0007-additive-product-recognition-layer-scope.md#addendum-2--specification-readiness--drafting-route-pol-0011--pol-0012)
(Approved) → [`BDR-0012`](../specs/BDR-0012-product-unit-of-measure-product-memory.md)
(Approved, Decisions 10–11) → [`POL-0003`](../specs/POL-0003-similarity-confirmation-threshold.md)
(Approved) → [`POL-0012`](../specs/POL-0012-similarity-confirmation-threshold-unit-normalization-amendment.md)
(Approved) → [`similarity-confirmation-threshold-specification.md`](../specs/similarity-confirmation-threshold-specification.md)
(✅ Accepted, 2026-08-27).
**Scope of this assessment:** The full accepted Specification — this
is the **first Rule 8 Assessment ever performed for this capability**.
Unlike Assessment A (a narrow addition to an already-Assessed base),
this assessment must independently verify the base capability's own
feasibility (signals 1–2, candidate flow, catalog-wide scope,
confirmation shape) in addition to the new unit-spelling signal —
confirmed necessary by direct inspection: no prior Rule 8 Assessment
for `POL-0003` exists anywhere in `docs/engineering/`.
**Lifecycle state:** Designed → Proposed → **Assessed** (this
document). Reaching "Assessed" is a readiness opinion, not
authorization — per `platform-engineering-governance-standard.md` §3.
**Baseline verified fresh:** `HEAD = 448623e`, working tree carrying
only the two Specification-acceptance edits already reflected in the
governing chain above — confirmed via `git status`/`git log`
immediately before this assessment began.

---

## 1. Objective

Determine whether the accepted foundational Specification is
technically safe and sufficiently bounded to proceed to a separate
future Implementation Authorization — covering the full capability it
formalizes for the first time (signals 1–3, candidate flow, catalog
scope, confirmation shape) — while explicitly not resolving the
separately deferred confirmation-experience conformance question (§5,
below), and explicitly distinguishing intended governed behavior from
current implementation status throughout.

## 2. Governance Authority Consumed

- `ADR-0007` §3 (Non-Negotiable Constraints), both Addenda.
- `BDR-0012` Decisions 10–12 (suggest-never-silently-decide boundary,
  AI/recognition boundary).
- `POL-0003`'s Business Requirements 1–8, Candidate Signals,
  Confirmation Experience — Minimum Shape, Technical Boundary.
- `POL-0012`'s Amendment (new signal), Non-Negotiable Constraints.
- The Specification's §§1–12 in full, including its explicit
  deferrals to this Rule 8 stage and its §6 conformance-question
  exclusion.
- `platform-engineering-governance-standard.md` (Stage 7 process;
  Non-Negotiable Principles 1–7).

## 3. Fresh Code Evidence Gathered This Session

Directly re-verified against `HEAD = 448623e`, not assumed from an
earlier turn:

- `apps/tenant/src/lib/productNameSimilarity.ts`: `normalizeForSimilarity`
  (line 52, lowercase + accent-strip + `×`→`x` + non-alphanumeric-run
  collapse); `tokenize` (line 64); `computeNameSimilarity` (line 79,
  Jaccard token-set similarity); `findSimilarProducts` (line 111,
  `threshold ?? 0.5` confirmed unchanged — **the existing `0.5`
  threshold this Specification and `ADR-0007` §3 both require remain
  untouched is confirmed true today, not merely stated**).
- **Signal 2 (barcode/SKU) is approved by `POL-0003` but not
  implemented anywhere.** Direct grep for `.barcode`/`.sku` usage in
  `productNameSimilarity.ts` and `AddStockView.tsx`: zero matches.
  `POL-0003`'s own text ("confirmed unused for any matching purpose")
  remains accurate today, unchanged since that Policy's original
  approval — this is a genuine, pre-existing implementation gap for
  the *base* capability, independent of, and not caused by, this
  Specification's own new signal 3.
- `apps/tenant/src/components/AddStockView.tsx`: `exactMatchExists`/
  `similarProducts` computation (lines ~2683–2699) unchanged;
  `handleSelectProductForTool` (referenced, rewrites `row.productName`
  only — no direct product-identity mutation, no write to
  `Product.supplierWordings`); grep for `supplierWordings` in this
  file, excluding the separate supplier-wording feature's own distinct
  state fields (`supplierWordingCandidates`, `pendingSupplierWording`,
  etc.): zero hits — **confirms this capability never touches
  `Product.supplierWordings`, structurally, not merely by stated
  intent.**
- `matchProductByExactName` (`server/smartStockEntry.ts`, line 194)
  and every client-side exact-match call site: unchanged, confirmed
  unaffected by anything in this governing chain.
- **Confirmation UI (the known conformance gap, §5 below):** the
  suggestion banner (`AddStockView.tsx`, ~lines 3450–3471) offers one
  button per candidate (select it) with no separate "different
  product" / decline action — re-confirmed present and unchanged since
  the original governance-route investigation first identified it.
  This is restated here as fresh evidence, not resolved.
- Tests: `tests/product-name-similarity.test.ts` (143 lines) — direct
  unit coverage of the pure `computeNameSimilarity`/`findSimilarProducts`
  functions. `tests/add-stock-similar-product-suggestions.test.ts` —
  source-structure coverage of the `AddStockView.tsx` wiring (this
  repository has no DOM/React render harness; source-structure checks
  are the established, precedented pattern here, per that test file's
  own header, matching the identical limitation the original
  Supplier-Wording Recognition Rule 8 Assessment's own testability
  finding (Finding 20) already accepted for that capability).
- `firestore.rules`: `/products/{productId}` already scoped under
  `businesses/{businessId}/...`; `allow read` member-level — every
  product a candidate comparison reads is already tenant-isolated by
  the existing rule, unrelated to and unaffected by this Specification
  (candidate detection is a pure, client-side, in-memory computation
  over an already-fetched, already-isolated `products` array — no new
  Firestore read is introduced).

---

## 4. Findings

### Finding B1 — Signal 1 (Name Similarity) Is Already Implemented and Feasible

**Severity:** PASS

**Evidence:** `computeNameSimilarity`/`findSimilarProducts` already
exist, already power `AddStockView.tsx`'s suggestion banner today, and
already have direct unit test coverage (`tests/product-name-similarity.test.ts`).

**Technical assessment:** This is not a new capability to assess for
feasibility — it already runs in production. The only open question
this Specification raises about it is governance documentation (this
Specification is the first to formally tie `POL-0003` to this existing
code), not technical risk.

**Governance classification:** Confirmed existing fact, PASS.

**Recommendation:** None technical. See §5, below, for the related
governance-documentation implication.

### Finding B2 — Signal 2 (Barcode/SKU) Is Approved but Genuinely Unimplemented

**Severity:** MINOR (Rule-8-resolvable; implementation gap, not a
Specification defect)

**Evidence:** `POL-0003` approves this signal explicitly; `Product.barcode`/
`Product.sku` already exist as stored fields (confirmed in `types.ts`
by the original, adjacent Rule 8 Assessment's own Finding evidence,
and independently re-confirmed here via grep showing zero matching
usage); no code anywhere reads either field for similarity/duplicate
detection purposes.

**Technical assessment:** This is a real, but low-risk and
independently-implementable, gap — signal 2 can be added later,
entirely separately from signal 3 (this Specification's own subject),
without blocking either. Its absence today does not make the
Specification unsafe; it makes the *current implementation* partial
relative to what `POL-0003` already approved, years before this
session's own work began.

**Governance classification:** Pre-existing implementation gap,
independent of this Specification. Not this Specification's defect to
fix, and not a blocker to this assessment's own verdict.

**Recommendation:** Flagged for a future, separate Implementation
Authorization to close, whenever prioritized — explicitly not required
before, or as part of, closing the unit-spelling-equivalence work this
Specification actually authorizes.

### Finding B3 — Signal 3 (Unit-Spelling Equivalence): Same Structural Analysis as Assessment A

**Severity:** PASS, with one MINOR sub-item

**Evidence:** `POL-0012`'s new signal is described identically in
character to `POL-0011`'s own new ground — normalize the unit token
only, never the quantity digit; exact equivalence table deferred to
Rule 8.

**Technical assessment:** Identical reasoning to Rule 8 Assessment A's
Findings A1–A3 applies here, adapted to this capability's own
function: `normalizeForSimilarity`/`tokenize` already split a name
into individual word tokens (line 64) before Jaccard comparison — the
exact same "tokenize before equating" structural pattern Assessment A
recommended for the supplier-wording side is **already how this
capability's own existing code works**, making the quantity-preservation
property arguably *more* directly enforceable here than on the
supplier-wording side, since the tokenization infrastructure already
exists and is already proven (`tests/product-name-similarity.test.ts`).
A unit-spelling equivalence step would operate as a token-level
canonicalization applied before the Jaccard set comparison — e.g.
canonicalizing `"2l"` and `"2"`+`"lt"` (already two separate tokens
after existing normalization, since `"2 Lt"` contains a space) to a
comparable form, without ever merging the leading quantity digit
`"2"`/`"1"` into that canonicalization.

**Sub-item (MINOR):** The equivalence table's exact contents are
deferred, identically to Assessment A's Finding A3 — the same
non-blocking deferral applies.

**Governance classification:** Rule 8-owned technical determination,
correctly delegated by `POL-0012` and the Specification.

**Recommendation:** Implement as a token-canonicalization step
composed with the existing `tokenize` function, not a rewrite of
`computeNameSimilarity`'s own Jaccard logic — preserves the
already-tested core algorithm unchanged while adding the new signal
additively, mirroring this Specification's own "additive, not
redesigning" instruction (§7).

### Finding B4 — Candidate/Suggestion-Only Boundary Is Structurally Confirmed

**Severity:** PASS

**Evidence:** Fresh grep confirms zero references to
`Product.supplierWordings` anywhere in this capability's own code
path; `handleSelectProductForTool` only ever rewrites `row.productName`.

**Technical assessment:** This capability has no persistence writer of
any kind today — a suggestion, once selected, only ever changes local
component state, never a Firestore document directly. This is a
stronger, more structurally obvious guarantee against "silent
resolution" than even the supplier-wording side has, since there is no
writer function to accidentally misuse in the first place (unlike
`confirmSupplierWordingRelationship`, which exists and must be guarded
against parallel-writer risk — see Assessment A Finding A4). No
parallel writer risk exists here because no writer of any kind exists
here.

**Governance classification:** Confirmed structural fact, PASS.

**Recommendation:** Preserve this exact property during any future
implementation of signal 3 — a new normalization step must never grow
into a persistence write. Flagged explicitly as an implementation
constraint given how easy it would be, in an unrelated future change,
to accidentally start writing a "confirmed similar" result somewhere,
which this Specification's §7 and `ADR-0007` §3 both explicitly
prohibit.

### Finding B5 — Boundary With Supplier-Wording Recognition Is Structurally Confirmed, Not Merely Asserted

**Severity:** PASS

**Evidence:** Both capabilities' code paths were independently
inspected this session (Assessment A §3, this assessment §3) — no
shared writer, no shared persisted state, no function call from one
into the other's confirmation or persistence logic.

**Technical assessment:** The Specification's own §7 ("Boundary With
Supplier-Wording Recognition") describes this separation in prose;
this finding confirms the separation is real in code today, and that
implementing signal 3 (Finding B3) creates no new coupling between the
two capabilities, provided the token-canonicalization step recommended
in Finding B3 is implemented as its own local function (mirroring
Assessment A Finding A1's identical "separate, local pass" guidance
for the supplier-wording side) rather than a shared helper imported by
both capabilities without care.

**Governance classification:** Confirmed structural fact, PASS.

**Recommendation:** If a shared unit-spelling equivalence table
ultimately proves genuinely identical between both capabilities (a
plausible outcome, since the underlying real-world unit vocabulary is
the same), the *data* (the table itself) may reasonably be shared as a
constant, but the *comparison logic* consuming it must remain two
separate call sites, each preserving its own capability's existing
strictness/looseness characteristics — this distinction is worth
stating explicitly for whichever future Implementation Authorization
covers this, to prevent a well-intentioned refactor from accidentally
merging the two capabilities' logic.

### Finding B6 — Performance Is Unaffected at Realistic Scale

**Severity:** PASS

**Evidence:** `findSimilarProducts` already runs O(n) over the full
`products` array on every relevant keystroke, per the original
investigation this session's governance chain traces back to; this
remains true and unchanged today.

**Technical assessment:** Adding one more comparison step (signal 3)
to an already-O(n)-per-product computation does not change the
asymptotic behavior — it adds a constant-factor cost per product
(one additional token-canonicalization + comparison), not a new pass
over the catalog. For the realistic small/medium retail catalog sizes
this Specification's own §"Performance / Scalability" section (via
the original investigation) already characterized as trivial, this
remains trivial.

**Governance classification:** Confirmed technical fact, PASS.

**Recommendation:** None. Revisit only if a future, evidenced
catalog-scale concern arises — not anticipated by anything in this
governing chain.

---

## 5. POL-0003 Confirmation-Experience Conformance

**OPEN / OUT OF SCOPE.**

This question — whether the current suggestion banner's one-button
(select-or-ignore) interaction fully satisfies `POL-0003`'s own stated
minimum shape (exactly two resolutions, "same product" / "different
product") — was explicitly ruled OPEN and OUT OF SCOPE by the Product
Architect, twice: `ADR-0007` Addendum 1, Ruling 2 (Option B), and
reaffirmed in Addendum 2, Ruling 2, carried into the Specification's
own §6 without alteration, and restated again in that Specification's
own Product Architect Acceptance.

**This Rule 8 Assessment does not resolve it, narrow it, or treat it
as resolved by implication.** Specifically, this assessment:

- does **not** determine that the current UI is compliant;
- does **not** determine that the current UI must change;
- does **not** reinterpret `POL-0003`'s own "Confirmation Experience —
  Minimum Shape" wording;
- does **not** decide Option A, B, or C from the Decision Brief that
  first framed those options.

**Why this does not prevent this assessment from reaching a READY
verdict:** `platform-engineering-governance-standard.md` §3 defines
"Assessed" as a readiness *opinion* about the specific scope a Rule 8
Assessment covers — it does not require every conceivably-related
open question in the entire codebase to be resolved first, only that
the scope actually being assessed (here: the new unit-spelling signal,
and this capability's general feasibility) is itself sound. The
conformance question is explicitly, by Product Architect ruling,
**routed to its own, separate governance/remediation decision** — not
a prerequisite this Rule 8 Assessment is authorized, or required, to
clear. Treating it as a blocker here would functionally re-litigate a
decision already made at a higher governance layer (the Addenda cited
above), which Rule 8 has no authority to do.

**What this means concretely for a future Implementation
Authorization:** whoever authorizes implementation of signal 3 must
not, as a side effect of that work, either "fix" the confirmation UI
to add an explicit decline button, or declare the existing one-button
interaction newly "good enough" — either action would resolve the
deferred question through an unrelated implementation change, exactly
what the Product Architect's ruling forbids. Implementation of signal
3 should compose into the *existing* confirmation UI exactly as it
exists today, unchanged, leaving the conformance question exactly as
open as it is now.

---

## 6. Rule 8 Self-Check Against Non-Negotiable Principles

- **Scope discipline (Principle 1):** This assessment covers exactly
  what the accepted Specification authorizes — the full base
  capability's feasibility (never previously assessed) plus the new
  signal. It does not reopen `BDR-0012`, `POL-0003`, or any
  Supplier-Wording Recognition artifact.
- **Fresh state verification (Principle 2):** All evidence in §3 was
  gathered this session against `HEAD = 448623e`.
- **No silent business/policy decision:** `ADR-0007`, `BDR-0012`,
  `POL-0003`, `POL-0012`, and the Specification remain exactly as they
  were before this assessment.
- **No invented Rule 8 criteria:** Every finding traces to either an
  explicit deferral in the governing chain or a fresh confirmation
  against real code.
- **No reopened accepted decision, and no resolution of the
  Product-Architect-deferred conformance question** — §5, above,
  states this explicitly and by name, precisely to prevent this
  assessment's own existence from being misread as having settled it.
- **Retroactive compliance explicitly not performed:** Findings B1–B2
  distinguish, throughout, between what is approved (signals 1–2, both
  by `POL-0003`), what is implemented (signal 1 only), and what
  remains a gap (signal 2, and the separate §5 conformance question) —
  no finding treats "the Specification is now Accepted" as evidence
  that current code already fully conforms to it.

---

## 7. Summary Table

| # | Finding | Severity | Governance layer |
|---|---|---|---|
| B1 | Signal 1 (name similarity) — already implemented | PASS | Confirmed existing fact |
| B2 | Signal 2 (barcode/SKU) — approved, unimplemented | MINOR | Pre-existing gap, independent, non-blocking |
| B3 | Signal 3 (unit-spelling equivalence) — feasibility | PASS (+MINOR sub-item) | Rule 8-owned, deferred table non-blocking |
| B4 | Candidate/suggestion-only boundary | PASS | Confirmed structural fact |
| B5 | Boundary with Supplier-Wording Recognition | PASS | Confirmed structural fact |
| B6 | Performance at realistic scale | PASS | Confirmed technical fact |
| §5 | Confirmation-experience conformance | **OPEN / OUT OF SCOPE** | Product Architect-deferred, non-blocking for this assessment's own scope |

---

# Rule 8 Verdict

## READY

The foundational Specification is technically feasible. Signal 1
already runs in production with existing test coverage; signal 2 is a
pre-existing, independently-closeable implementation gap unrelated to
this Specification's own new work; signal 3 is structurally low-risk,
following the exact same tokenize-before-equate pattern this
capability's own existing code already uses. The
candidate/suggestion-only boundary and the separation from
Supplier-Wording Recognition are both confirmed as structural code
facts, not merely stated intentions. No performance concern exists at
realistic scale.

**The deferred confirmation-experience conformance question (§5) does
not block this verdict** — it is explicitly, correctly outside this
assessment's authority to resolve, per an already-made, twice-recorded
Product Architect ruling. This assessment reaches READY *for the scope
it actually covers*, while leaving that separate question exactly as
open as it already was.

No unresolved technical or governance blocker remains **within this
assessment's own scope**. The accepted Specification is safe to
proceed to a separate, independently-authorized future Implementation
Authorization gate — which must itself continue to respect §5's
boundary during implementation, per §5's own concluding guidance,
above.

---

## Final Governance Boundary Statement

- Rule 8 Assessment B completed.
- The Specification is technically ready, within its own scope.
- No application code changed.
- No Firestore rules changed.
- No indexes changed.
- No tests changed.
- No UI changed.
- No Implementation Authorization created.
- No engineering authorized.
- No business/policy decision silently changed — `ADR-0007`,
  `BDR-0012`, `POL-0003`, `POL-0012`, and the accepted Specification
  remain exactly as they were before this assessment.
- The confirmation-experience conformance question remains exactly
  OPEN / OUT OF SCOPE, unresolved, unreinterpreted, undecided in
  either direction — restated here for the final time in this
  document.
- This assessment is entirely independent of Rule 8 Assessment A
  (`product-identity-alternative-name-specification-unit-spelling-rule8-assessment.md`)
  — neither assessment's verdict implies, affects, or substitutes for
  the other's, per `ADR-0007` Addendum 2's requirement that the two
  surfaces remain separate through every governance stage.

**Stopping here, per instruction.** This Rule 8 Assessment is now
"Assessed" (READY). Per `platform-engineering-governance-standard.md`
§3, reaching "Assessed" is a readiness opinion, not a go-ahead —
Implementation Authorization remains a separate, required, explicit
Product Architect gate, not begun or implied by this assessment.
