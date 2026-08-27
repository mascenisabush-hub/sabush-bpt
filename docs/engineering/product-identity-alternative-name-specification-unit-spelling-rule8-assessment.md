Rule 8 Assessment

# Rule 8 Assessment A — Supplier-Wording Recognition Unit-Spelling Normalization

**Governing chain:** [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
(Approved) → [`ADR-0007` Addendum 1](../adr/ADR-0007-additive-product-recognition-layer-scope.md#addendum--governance-route-conformance-gap-handling--policy-numbering)
(Approved) → [`ADR-0007` Addendum 2](../adr/ADR-0007-additive-product-recognition-layer-scope.md#addendum-2--specification-readiness--drafting-route-pol-0011--pol-0012)
(Approved) → [`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(Approved) → [`POL-0011`](../specs/POL-0011-supplier-wording-recognition-unit-normalization-amendment.md)
(Approved) → [`product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md)
(✅ Accepted, 2026-08-19) → [`product-identity-alternative-name-specification-unit-spelling-amendment.md`](../specs/product-identity-alternative-name-specification-unit-spelling-amendment.md)
(✅ Accepted, 2026-08-27).
**Scope of this assessment:** The Specification Amendment only — §3
step 2's new ground (c), unit-spelling equivalence. **This assessment
does not reopen, re-verify, or re-decide anything the original Rule 8
Assessment** (`product-identity-alternative-name-rule8-assessment.md`,
Assessed READY) already settled for the base capability (storage
model, concurrency/idempotency, tenant isolation, confirmation-UI
pattern, failure modes, etc.) — those findings remain in force,
unmodified, and are incorporated by reference where directly relevant
below, not re-litigated.
**Lifecycle state:** Designed → Proposed → **Assessed** (this
document). Reaching "Assessed" is a readiness opinion, not
authorization — per `platform-engineering-governance-standard.md` §3.
**Baseline verified fresh:** `HEAD = 448623e`, working tree at time of
this assessment carries two uncommitted acceptance edits (the two
Specification acceptance recordings, already reflected in the
governing chain above) and no other changes — confirmed via `git
status`/`git log` immediately before this assessment began.

---

## 1. Objective

Determine whether the accepted Specification Amendment is technically
safe and sufficiently bounded to proceed to a separate future
Implementation Authorization — specifically for the one new capability
it adds (a third candidate-detection ground), without reopening the
base capability's already-Assessed-READY architecture, and without
silently resolving anything the governing chain left open for a
different layer.

## 2. Governance Authority Consumed

- `ADR-0007` §3 (Non-Negotiable Constraints), both Addenda.
- `POL-0011`'s Amendment (new ground), "What This Amendment Does Not
  Change" (§3), Non-Negotiable Constraints (§4).
- The Specification Amendment's §2 (Amendment), §3 (What This
  Amendment Does Not Change), §4 (Non-Negotiable Constraints), §5 (No
  Retroactive Compliance).
- `platform-engineering-governance-standard.md` (Stage 7 process;
  Non-Negotiable Principles 1–7).
- The original Rule 8 Assessment's Findings 1 (storage), 5
  (reuse-matching strictness), 13 (concurrency) — cited, not
  re-derived, where this amendment's own scope touches the same
  ground.

## 3. Fresh Code Evidence Gathered This Session

Directly re-verified against `HEAD = 448623e`, not assumed from an
earlier turn:

- `apps/tenant/src/lib/supplierWordingMatching.ts`:
  `normalizeForCandidateDetection` (line 39, case/accent fold +
  whitespace collapse only — no unit-spelling logic exists yet);
  `detectSupplierWordingCandidates` (line 73, exactly two grounds
  implemented today — `initial-stock-name`, `existing-alternative-wording`
  — matching the pre-amendment Specification, not yet the amended
  one); `findExistingSupplierWordingMatch` (line 127, byte-exact,
  `.trim()` only, no case/accent/unit normalization of any kind —
  confirmed unchanged since the original investigation this session's
  governance chain traces back to).
- `apps/tenant/src/lib/supplierWordingRecognition.ts`:
  `resolveSupplierWordingRecognition` composes the two functions above
  unchanged; no third ground implemented yet.
- `apps/tenant/src/context/AppContext.tsx`: `confirmSupplierWordingRelationship`
  defined once (line 2621), called from exactly one call site (line
  3024, inside `addMultipleStockBatches`) — confirmed via direct grep,
  no parallel writer exists anywhere in this file or
  `AddStockView.tsx`.
- `server/smartStockEntry.ts`: `matchProductByExactName` (line 194)
  unchanged — case-insensitive exact match only, no normalization
  logic of any kind.
- `apps/tenant/src/components/AddStockView.tsx`: `applySupplierWordingCheck`
  and `handleConfirmSupplierWordingCandidate`/`handleDeclineSupplierWordingCandidates`
  unchanged — confirmation UI still offers exactly the confirm/decline
  pair the Specification's §4 step 4 (unmodified by this amendment)
  requires.

**Conclusion of evidence gathering:** as expected and required by §5
of the amendment ("No Retroactive Compliance"), **no code implements
ground (c) today.** This is a pure documentation-to-code gap this
assessment must characterize, not a discrepancy requiring remediation
before Rule 8 can proceed — the amendment itself states this
explicitly.

---

## 4. Findings

### Finding A1 — Ground (c) Insertion Point Is Well-Defined and Low-Risk

**Severity:** PASS

**Evidence:** `detectSupplierWordingCandidates` (line 73) already
computes two grounds independently and pushes to a `grounds` array per
product; a third ground is additive to this exact same loop structure,
not a redesign. `normalizeForCandidateDetection`'s own header already
documents that whitespace-collapsing was added "locally" specifically
to avoid changing `normalize()`'s own unrelated behavior — the same
locality discipline a unit-spelling equivalence step would need to
follow (a new, separate normalization pass, not a modification to the
existing shared `normalize()` used elsewhere for category-name
detection).

**Technical assessment:** Adding ground (c) requires: (a) a small,
Rule-8-owned equivalence table (deferred by both `POL-0011` and the
Specification Amendment itself — see Finding A3, below) and (b) one
additional comparison branch inside the existing loop. No structural
change to the function's signature, return type, or calling
convention is required — `SupplierWordingCandidate`'s `grounds` field
is already typed as `Array<'initial-stock-name' | 'existing-alternative-wording'>`,
which would need exactly one new literal type member added
(`'unit-spelling-equivalence'`, or equivalent), a non-breaking,
additive type change.

**Governance classification:** Rule 8-owned implementation detail.

**Recommendation:** Implement ground (c) as a third branch in the
existing loop, gated behind its own small normalization helper,
mirroring `normalizeForCandidateDetection`'s own "separate, local pass,
never modifying a shared function's existing behavior for an unrelated
concern" discipline.

### Finding A2 — Quantity-Preservation Property Is Structurally Enforceable, Not Just a Stated Rule

**Severity:** PASS

**Evidence:** `ADR-0007` §3, `POL-0011` §"Amendment," and the
Specification Amendment §2 all independently state the same
constraint: unit spelling may be normalized, quantity may not.
Conceptually tested against the Specification's own worked example —
`"2L"` vs `"2 Lt"` (should become equivalent) and `"1L"` vs `"2L"`
(must remain distinct).

**Technical assessment:** This property is enforceable by construction,
not merely by discipline, provided the equivalence table Rule 8
ultimately defines operates on the **unit token only**, after the
quantity digit has already been separated from it — e.g. a
tokenization step that isolates a leading numeric run from a trailing
unit-spelling run before any equivalence lookup runs. This mirrors
`productNameSimilarity.ts`'s own existing tokenization approach
(`tokenize`, splitting on whitespace after normalization) — a proven,
already-reviewed pattern in this exact codebase for keeping distinct
tokens distinct. Provided the eventual implementation tokenizes before
equating, `"1L"` and `"2L"` cannot become equivalent by construction —
their leading numeric tokens (`1` vs `2`) are never compared for
equivalence at all, only their unit-spelling tokens are.

**Governance classification:** Rule 8-owned implementation guidance —
the *property* is fixed by the Specification (not Rule 8's to decide),
but *how* to structurally guarantee it is squarely Rule 8's own
territory.

**Recommendation:** Require, as an implementation constraint carried
into any future Implementation Authorization, that the equivalence
check operate on a tokenized unit-only value, never on the raw string
containing both quantity and unit together — this is the specific
mechanism that makes the "quantity never normalized away" constraint
verifiable in code review, not merely asserted in documentation.

### Finding A3 — Equivalence Table Deferral Is Correctly Scoped, Genuinely Rule-8-Owned

**Severity:** MINOR (Rule-8-resolvable in a future session; not
resolved by this assessment, and not required to be, for this
assessment to reach READY)

**Evidence:** `POL-0011` explicitly defers "the exact equivalence
table" to a later Specification/Rule 8 stage; the Specification
Amendment §2 restates the same deferral, citing the original
Specification's own identical deferral pattern for grounds (a)/(b)'s
normalization method.

**Technical assessment:** This is a real, still-open technical
decision (which spellings map to which canonical unit — `L`/`Lt`/
`Ltr`/`Liter`/`Litro`; `KG`/`Kilo`/`Quilo`; and how far that list
extends) — but it is explicitly, correctly delegated to Rule 8 by
every governing document in this chain, consistent with how the
original grounds' own normalization method was likewise deferred and
resolved without blocking the original assessment from reaching READY.
Nothing about leaving this table unresolved here blocks this
assessment's own verdict — it is squarely the kind of "explicitly
delegated to Rule 8" item the governance standard anticipates Rule 8
resolving, not a prerequisite Rule 8 itself must clear before reaching
a verdict.

**Governance classification:** Rule 8-owned technical determination,
not yet made. Does not require Product Architect input — `POL-0011`'s
own deferral already authorizes Rule 8 (this stage, or a future
continuation of it) to fix this table.

**Recommendation:** Defer the table's exact contents to Implementation
Authorization drafting or the incremental-implementation stage itself,
consistent with precedent (the original Specification's own grounds
(a)/(b) reached Implementation Authorization without their exact
normalization method being fixed at the Rule 8 stage either, per that
assessment's own Finding 4).

### Finding A4 — Silent-Reuse Path Is Structurally Isolated From This Amendment

**Severity:** PASS

**Evidence:** `findExistingSupplierWordingMatch` (line 127) is a
separate function from `detectSupplierWordingCandidates` (line 73);
`POL-0011`'s own "What This Amendment Does Not Change" section and the
Specification Amendment's §3 both state this explicitly; fresh code
inspection confirms `findExistingSupplierWordingMatch`'s own
implementation performs no normalization beyond `.trim()` today, and
nothing in `POL-0011`, the Specification Amendment, or this assessment
proposes changing that.

**Technical assessment:** Because these are two genuinely separate
functions with no shared normalization call, there is no code-level
mechanism by which implementing ground (c) inside
`detectSupplierWordingCandidates` could inadvertently leak
normalization into `findExistingSupplierWordingMatch`'s reuse path —
this is not merely a documentation promise but a structural fact about
the current function boundary, which any future implementation should
preserve by continuing to keep the two functions' normalization logic
entirely separate (no shared helper that both call, unless that helper
is parameterized to make each function's own strictness level
explicit and independently controlled).

**Governance classification:** Confirmed technical fact, PASS.

**Recommendation:** None required beyond preserving the existing
function boundary during implementation — flagged as an explicit
implementation constraint for the future Implementation Authorization
to restate, given how consequential a regression here would be (BDR-0013
Decision 4/5's entire rationale for reuse's strictness).

### Finding A5 — No Interaction With Multiple-Candidates, Conflict, or Confirmation-UI Findings

**Severity:** PASS

**Evidence:** The original Rule 8 Assessment's Findings 6
(multiple-candidates UI), 9 (conflict/distinguishing-information gate),
and the Specification's own §4 steps 3–7 (confirmation flow) are all
unmodified by `POL-0011` and the Specification Amendment, confirmed by
direct text comparison — neither document touches any of these
sections.

**Technical assessment:** A candidate surfaced via ground (c) is, by
construction, just another `SupplierWordingCandidate` flowing through
the exact same `supplierWordingCandidates` array, the exact same
confirmation banner (`AddStockView.tsx` lines ~3352–3396, unchanged),
and the exact same conflict-detection logic
(`handleDeclineSupplierWordingCandidates`, unchanged) as grounds (a)
and (b) already do today. No new UI branch, no new state field beyond
the type-level `grounds` array extension (Finding A1), and no new
confirmation interaction is required.

**Governance classification:** Confirmed technical fact, PASS.

**Recommendation:** None.

---

## 5. Rule 8 Self-Check Against Non-Negotiable Principles

- **Scope discipline (Principle 1):** This assessment covers exactly
  the Specification Amendment's own scope — one new candidate ground.
  It does not reopen the base capability's storage model, concurrency
  pattern, or any other already-Assessed-READY finding.
- **Fresh state verification (Principle 2):** All evidence in §3 was
  gathered this session against `HEAD = 448623e`, not carried forward
  from memory of an earlier turn.
- **No silent business/policy decision:** `ADR-0007`, `POL-0007`,
  `POL-0011`, and both Specifications remain exactly as they were
  before this assessment — none was modified to produce it.
- **No invented Rule 8 criteria:** Every finding above traces to
  either an explicit deferral in the governing chain (Findings A2, A3)
  or a fresh confirmation of a stated constraint against real code
  (Findings A1, A4, A5) — no new criterion was invented outside what
  the Specification Amendment itself flagged as Rule 8's territory.
- **No reopened accepted decision:** Nothing above proposes,
  implies, or requires reopening `ADR-0007`, `POL-0007`, `POL-0011`,
  or either Specification.

---

## 6. Summary Table

| # | Finding | Severity | Governance layer |
|---|---|---|---|
| A1 | Ground (c) insertion point | PASS | Confirmed low-risk |
| A2 | Quantity-preservation structural enforceability | PASS | Confirmed enforceable by construction |
| A3 | Equivalence table contents | MINOR | Rule 8-owned, deferred, non-blocking |
| A4 | Silent-reuse path isolation | PASS | Confirmed structural fact |
| A5 | Multiple-candidates/conflict/confirmation-UI interaction | PASS | Confirmed no interaction required |

---

# Rule 8 Verdict

## READY

The Specification Amendment is technically feasible, cleanly
additive, and introduces no risk to the base capability's
already-Assessed-READY architecture. Every finding is either a
confirmed PASS against fresh code evidence, or a deferral (Finding A3)
that is explicitly, correctly Rule 8's own territory to resolve later
— not a blocker to reaching a verdict now, exactly as the original
Rule 8 Assessment's own equivalent deferrals (its Findings 1, 4, 5, 15)
did not block that assessment from reaching READY either.

No unresolved technical or governance blocker remains. The accepted
Specification Amendment is safe to proceed to a separate,
independently-authorized future Implementation Authorization gate.

---

## Final Governance Boundary Statement

- Rule 8 Assessment A completed.
- The Specification Amendment is technically ready.
- No application code changed.
- No Firestore rules changed.
- No indexes changed.
- No tests changed.
- No UI changed.
- No Implementation Authorization created.
- No engineering authorized.
- No business/policy decision silently changed — `ADR-0007`,
  `POL-0007`, `POL-0011`, and both accepted Specifications remain
  exactly as they were before this assessment.
- This assessment is entirely independent of Rule 8 Assessment B
  (`similarity-confirmation-threshold-rule8-assessment.md`) — neither
  assessment's verdict implies, affects, or substitutes for the
  other's, per `ADR-0007` Addendum 2's requirement that the two
  surfaces remain separate through every governance stage.

**Stopping here, per instruction.** This Rule 8 Assessment is now
"Assessed" (READY). Per `platform-engineering-governance-standard.md`
§3, reaching "Assessed" is a readiness opinion, not a go-ahead —
Implementation Authorization remains a separate, required, explicit
Product Architect gate, not begun or implied by this assessment.
