# Final Rule 8 Assessment — Product Recognition + Cost/Selling Unit Architecture

**GOVERNANCE GATE: FINAL RULE 8 ASSESSMENT**

**IMPLEMENTATION: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**
**SPECIFICATION AMENDMENT: NOT YET AUTHORIZED — needs identified below only**
**COMMIT/PUSH: NOT PERFORMED**

This is an assessment only. It reaches a final verdict and identifies
what must be resolved before implementation; it does not implement,
amend a specification, or authorize anything.

---

## 1. Scope

This is the final Rule 8 re-assessment for the Product Recognition +
Cost/Selling Unit Architecture question, performed now that all
previously unresolved Product Architect decisions have been explicitly
accepted. It supersedes the earlier assessment's "READY AFTER
DECISIONS" verdict — that assessment is preserved unchanged as the
historical record of what was still open at that time; this document
is the subsequent, final determination.

---

## 2. Accepted Decisions

Reproduced from the governance chain, treated here as authoritative
inputs, not re-opened for debate:

- **Decision A** (Product Recognition / Existing vs New) — unresolved
  identity must not silently create a new Product; owner retains
  explicit Existing/New resolution authority; resolving to Existing
  retrieves canonical Product Memory.
- **Decision A-Contagem** — the same principle applies to Contagem,
  without requiring Supplier-Wording Recognition; the mechanism must
  use only business-scoped Product identity information, must not
  require cross-business queries, and must not auto-select an
  ambiguous Product.
- **Decision B2, Reading 2** — purchase/cost unit and selling unit
  remain distinct business concepts, but B2 does **not** authorize
  independently-entered competing selling bases inside `StockBatch`;
  the existing `Product.unitRelationship` and the approved
  derived-selling-valuation mechanism (Concept C) are used within their
  defined boundaries instead; no competing source of truth may be
  introduced.
- **Decision C** (Concept C Authority) — Concept C remains a derived,
  frozen valuation snapshot; not an independent Product Memory source
  of truth; not an override of `Product.sellingPrice`/`sellingUnit`/
  `unitRelationship`; not a Business Worth authority. Any future move
  toward operational authority requires a separate, explicit decision.

---

## 3. Evidence Reviewed

All artifacts in the governance lineage
(`RECOGNITION_AND_SELLING_UNIT_EVIDENCE_FOLLOWUP.md` →
`product-recognition-and-cost-selling-unit-architecture-decision-proposal.md`
→ its acceptance →
`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md` →
`recognition-and-cost-selling-unit-rule8-decision-clarification-proposal.md`
→ its acceptance), plus a **targeted re-read this session** of:

- `docs/specs/product-identity-alternative-name-specification.md`
  **in full** (not previously read section-by-section in the earlier
  Rule 8 Assessment) — this produces this report's single most
  important new finding (§9, below).
- `docs/specs/product-memory-purchase-selling-valuation-specification.md`
  §12–15 (re-confirmed, not re-read from scratch — no change since the
  prior assessment).
- `apps/tenant/src/types.ts` (`Product`, `UnitRelationship`,
  `StockBatch`) and `apps/tenant/src/utils/calculations.ts`
  (`calculateBatch`) — re-confirmed unchanged since the prior
  assessment; no code was modified between assessments, so no
  re-verification of behavior was needed beyond confirming the files
  are identical to what the prior assessment already traced.

No dependency installation, test execution, or repository modification
of any kind was performed or needed for this assessment — it is a
governance-artifact and existing-code review only.

---

## 4. Decision A — Final Rule 8 Check

**Product identity integrity, Product Memory canonicality, tenant
isolation, historical data integrity, `Product.id` semantics,
authorization boundaries:** all confirmed **PASS**, unchanged from the
prior assessment (§A1–A3 of `RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_ASSESSMENT.md`)
— nothing in the subsequent clarifications altered any of this
reasoning, and this session's evidence review found nothing to
contradict it.

**"NO-MATCH ≠ AUTOMATIC NEW PRODUCT unless the owner has explicitly
resolved the item as New Product" — can the existing architecture
support this?** Yes, architecturally (§A2–A4 of the prior assessment:
`Product.id` is already the uniform identity value regardless of
resolution path, and Product Memory retrieval is already
resolution-path-agnostic). **But this principle is not merely
unbuilt — it is currently explicitly contradicted by already-accepted
specification text**, found this session (§9, below). This does not
change the architectural feasibility finding; it changes the
governance-conformance finding, and is the reason this final
assessment's verdict differs in kind from a plain "READY."

---

## 5. A-Contagem — Final Rule 8 Check

**Compatibility with Contagem's existing architecture, Product identity
model, Product Memory, unit relationship, Initial Stock behavior,
Periodic Stock behavior, tenant isolation:** all **PASS** —
`recordStockCount`'s own product-resolution logic already keys on the
same `Product.id`/exact-name mechanism as every other path (confirmed
in the original evidence follow-up, Part A.5 and B.1); adding an
owner-resolution step ahead of silent creation changes *when* a
`Product.id` is chosen, not *what* it means, and does not touch
`Product.unitRelationship`, Product Memory retrieval, or tenant scoping
in any way A-Contagem's own text does not already bound.

**ARCHITECTURAL CONFLICT vs. SPECIFICATION GAP, explicitly
distinguished:** This is a **specification gap, not an architectural
conflict.** No code, data model, or existing runtime behavior in
Contagem prevents adding an owner-resolution step — the gap is purely
that no accepted specification currently authorizes or even addresses
such a step for Contagem. Confirmed directly this session: `product-identity-alternative-name-specification.md`
§7 states, in already-accepted text, **"Periodic Contagem: not in
scope"** (`BDR-0013` item 8's exclusion) — this is a deliberate,
reasoned exclusion (Contagem has no supplier concept, per Rule 8
Finding 10), not an oversight, and A-Contagem does not ask to reverse
the reason for that exclusion (Contagem still correctly has no
supplier-wording mechanism) — it asks for a **different**, new
mechanism the existing specification simply never addressed because
nothing before A-Contagem ever proposed one. **Classification:
SPECIFICATION GAP, requiring new specification coverage, not an
amendment that reverses any existing decision.**

---

## 6. B2 Reading 2 — Final Rule 8 Check

**Does B2 Reading 2 introduce competing selling bases?** No — traced
directly, unchanged since the prior assessment: `Product.sellingPrice`,
`Product.unitRelationship.sellingUnit` remain the sole product-level
selling configuration; `StockBatch.unit`/`costPrice`/`sellingPrice`
remain exactly what they already mean (an ordinary, per-purchase-unit
transaction fact, per the Consolidated Specification's own Repository
Baseline); `StockBatch.derivedSellingValuation` remains a frozen,
non-authoritative audit copy, read by nothing (`calculateBatch`
confirmed, this session, to still read only `batch.costPrice`/
`batch.sellingPrice` — unchanged). Every concept the task asks to be
traced (`Product.sellingPrice`, `Product.sellingUnit`,
`Product.unitRelationship`, `StockBatch.unit`, `costPrice`, Product
Memory, Concept C) remains internally coherent under Reading 2 because
Reading 2, by its own accepted wording, changes none of their existing
meanings — it only forecloses the alternative (Reading 1) that would
have.

**"Does B2 Reading 2 require a schema change?" — Explicit answer: NO.**
Every field B2 asks to be "explicitly preserved" — purchase/cost unit
(`StockBatch.unit`), selling unit (`Product.unitRelationship.sellingUnit`,
and, where Concept C fires, `derivedSellingValuation.sellingUnit`),
the conversion relationship (`Product.unitRelationship.units[]`, and,
where Concept C fires, `derivedSellingValuation.unitRelationshipSnapshot`),
and the applicable price basis for each unit (`StockBatch.costPrice`
for the purchase side; `Product.sellingPrice`/`derivedSellingValuation.sellingUnitPrice`
for the selling side) — **already exists in the current schema**,
confirmed by direct re-inspection of `types.ts` this session. B2
Reading 2 is a **usage-boundary decision** (which mechanism may and may
not be used, and for what) layered on an already-existing, unmodified
data model — not a request for new storage.

**Does B2 Reading 2 genuinely preserve "exactly one selling basis per
receipt line / no mixed bases"?** **Yes, confirmed directly.** This
rule is `product-memory-purchase-selling-valuation-specification.md`
§13's own accepted text ("Exactly one selling basis per purchase/
receipt line — no mixed bases at purchase entry... A given product's
purchase/receipt line is valued... using exactly **one** selling
basis"). Reading 2 introduces no second, independently-entered selling
basis at entry time — Concept C's snapshot is a **read-only, derived
restatement** of the single Product-Memory selling basis already
governing that line, frozen for audit purposes, never a second input
the owner (or AI) supplies. This is the same distinction §13 itself
already draws between concept (B) Product Memory and concept (C)
system-derived valuation — Reading 2 does not blur that line, it relies
on it.

---

## 7. Concept C — Final Rule 8 Check

**Is its existing write path harmless?** Yes — unchanged since the
prior assessment; it writes an optional, additive field, read by
nothing, per the original evidence follow-up's Part A.3 (re-confirmed
this session: `calculateBatch` still does not reference
`derivedSellingValuation` in any way).

**Does leaving it write-only create a governance problem?** **No —
Decision C resolves this explicitly.** The prior assessment's own
"Decision Needed 3" (should Concept C's read side ever become
operational?) is now answered: it shall not, absent a separate future
decision. A write-only, currently-unconsumed derived field is
consistent with, not a violation of, that decision — Decision C
describes a **bounded, permanently-available** capability, not a
temporary state Rule 8 must resolve toward "used" or "removed."

**Must it be wired into additional paths for the accepted decisions to
be implementable?** **No — not required by any of the four accepted
decisions.** Re-checked directly: Decision A/A-Contagem's own
owner-resolution and Product Memory retrieval never depend on Concept
C (they depend on `findLatestRememberedProductMemory`/
`buildProductMemoryAutofill`, which read `Product`-level data only,
confirmed in the original evidence follow-up Part B.4). Decision B2
Reading 2's own text ("the approved derived-selling-valuation mechanism
**where appropriate**") explicitly does not mandate extending Concept
C's reach — "where appropriate" leaves that as a future, separate,
implementation-level choice, not a present requirement. **This
assessment does not assume Concept C must be used merely because it
exists** (per this task's own explicit instruction) — it finds,
independently, that none of the four accepted decisions requires it.

**Would wiring it (if ever pursued) contradict Decision C?** Only if
the wiring made it operationally authoritative or fed Business Worth —
Decision C explicitly permits Concept C to continue existing and even
to be extended in reach (e.g., to more entry paths) as long as it
remains a non-authoritative, frozen, audit-only figure. Extending
*reach* and elevating *authority* are the two separate questions
Decision C keeps apart; only the latter is foreclosed without a new
decision.

**Does it affect Business Worth?** No — confirmed again, directly:
`calculateBatch` (the sole stock-valuation input to Business Worth,
per the Consolidated Specification's own Repository Baseline) reads
only `batch.costPrice`/`batch.sellingPrice`, never
`derivedSellingValuation`, and the signed Implementation Authorization
explicitly and permanently forbids that connection outside a separate
governance process — Decision C reaffirms, not merely repeats, this
boundary.

---

## 8. Specification Conformance

| Area | Governing artifact | Classification | Basis |
|---|---|---|---|
| Product recognition, general principle | `BDR-0012` Decisions 10–12 | CONFORMING | Already establishes "never silently decide identity" for a flagged-candidate scenario; Decision A is a compatible extension |
| **No-match-with-no-candidate → automatic new product** (Add Stock / Smart Stock Entry) | `product-identity-alternative-name-specification.md` §4 | **CONFLICTING — see §9, below** | Existing accepted text explicitly authorizes exactly the silent-creation behavior Decision A now prohibits, for the specific case where no candidate was ever detected |
| Contagem product resolution | `product-identity-alternative-name-specification.md` §7 ("Periodic Contagem: not in scope") | **SPECIFICATION GAP** | No conflict — the existing exclusion is reasoned and stands; A-Contagem asks for new coverage this document never provided |
| Selling-unit semantics | `product-memory-purchase-selling-valuation-specification.md` §4, §12–13 | CONFORMING | B2 Reading 2 relies on, does not alter, this text |
| Cost-unit semantics | Same, §5, §12 | CONFORMING | Unaffected |
| `unitRelationship` | `BDR-0012`, UOM Specification | CONFORMING | Unaffected by any of the four decisions |
| Product Memory | `BDR-0012` §2–3 | CONFORMING | Retrieval mechanism unchanged; only *when* it is invoked changes |
| Concept C | `product-memory-purchase-selling-valuation-specification.md` §13–15, signed Implementation Authorization | CONFORMING | Decision C reaffirms the existing signed boundary; no amendment needed |
| Receipt-line selling basis ("exactly one basis, no mixed bases") | Same, §13 | CONFORMING | §6, above — Reading 2 explicitly preserves this |
| Historical records | `BDR-0012` Decisions 15–16 | CONFORMING | Unaffected — no proposal here rewrites or reinterprets a historical fact |

### Exact amendment required — Decision A vs. `product-identity-alternative-name-specification.md` §4

- **Artifact:** `docs/specs/product-identity-alternative-name-specification.md`
- **Section:** §4, "New-Product Path"
- **Existing wording (accepted):** "when the owner indicates a proposed
  candidate is not the same product (**or declines to declare a
  relationship at all**), the incoming item is treated as an ordinary
  new product... the stock entry proceeds **exactly as it would for
  any product with no candidate ever detected**, using the wording
  entered as the new product's `Product.name`."
- **Accepted decision it now sits against:** Decision A — "when the
  system cannot establish product identity with sufficient confidence,
  it must NOT silently create a new Product... the owner must retain
  explicit authority to resolve" Existing vs. New.
- **Reason amendment is required:** §4's own text treats "no candidate
  ever detected" as functionally identical to "owner explicitly
  declined a candidate" — both proceed to silent, automatic new-product
  creation with no distinct owner-facing "this will be a new product"
  moment. Decision A requires exactly this distinction to exist (its
  own A4: "recognition failed" must remain distinguishable from
  "owner confirmed genuinely new"). This is not a gap this Specification
  merely never addressed — it is existing, accepted text whose plain
  meaning permits precisely the behavior Decision A now prohibits.
  **Classification: CONFLICTING, requiring formal amendment of §4**
  (and, for consistency, a corresponding review of §10's "Failure
  Modes" table, which currently describes the same no-candidate case
  without an owner-confirmation gate) before implementation may
  proceed for Add Stock / Smart Stock Entry.

**No amendment is required for B2 Reading 2 or Decision C** — both are
already conformant with existing accepted specifications, as shown
above.

---

## 9. Financial Integrity

**Stock valuation, Business Worth, Closing, historical stock, Product
Memory, selling-price calculations — do the accepted decisions alter
any governing meaning?** **No, confirmed directly, unchanged since the
prior assessment.** `calculateBatch` (re-inspected this session) still
computes `investmentValue`/`marketValue`/`embeddedProfit` from
`batch.costPrice`/`batch.sellingPrice` and `remainingQuantity` alone —
none of the four accepted decisions touches this function, its inputs,
or anything upstream of its inputs in a way that changes a single
existing financial figure for any already-recorded transaction.

**Does Decision C prevent Concept C from becoming an unintended
Business Worth source?** **Yes, explicitly and directly** — Decision
C's own text ("It SHALL NOT independently redefine the Business Worth
calculation... SHALL NOT be used to introduce a second financial
valuation authority") is precisely this guarantee, layered on top of
the pre-existing, signed Implementation Authorization boundary that
already made the same guarantee technically true in code (Concept C is
called from nowhere `calculateBatch` or any Business Worth path
reaches).

**Would any financial behavior need to change?** No financial behavior
change is required by any of the four accepted decisions, at any
confidence or implementation level considered in this assessment.

---

## 10. Tenant Isolation

Re-confirmed, unchanged since the prior assessment: every product
read/write remains scoped to `businesses/{businessId}/products`
(`AppContext.tsx`, re-spot-checked); `product-identity-alternative-name-specification.md`
§9 independently confirms the same for supplier-wording data
(`businesses/{businessId}/suppliers/{supplierId}`). A-Contagem's own
text explicitly requires "must not require cross-business queries" and
"must use Product identity information available within the owner's
own business" — this is not a new constraint this assessment invents;
it is A-Contagem restating the boundary the existing architecture
already, unconditionally enforces. **No security-rule expansion is
implied or required by accepting any of the four decisions.**

---

## 11. Backward Compatibility

Unchanged since the prior assessment, and unaffected by the
clarifications (which narrowed scope rather than widening it):

| Data category | Compatible? | Migration? |
|---|---|---|
| Existing Products | Yes | NOT REQUIRED |
| Existing Product Memory | Yes | NOT REQUIRED |
| Existing StockBatch records | Yes | NOT REQUIRED |
| Existing Contagem records | Yes | NOT REQUIRED |
| Records lacking `sellingUnit` | Yes — already handled as "ordinary, fully anticipated" today | NOT REQUIRED |
| Records lacking complete `unitRelationship` | Yes | NOT REQUIRED |
| Historical valuation | Unaffected | NOT REQUIRED |

**MIGRATION: NOT REQUIRED.** B2 Reading 2's confirmation that no schema
change is needed (§6, above) removes even the conditional migration
language the prior assessment carried for a hypothetical Reading 1 —
that reading is now foreclosed, so its migration considerations no
longer apply.

---

## 12. Implementation Scope Boundary

| Surface | Classification |
|---|---|
| Product recognition (exact-match, candidate detection) | **POSSIBLY AFFECTED** — existing mechanisms are reused, not replaced; a new "no-candidate-at-all" gate is additive |
| Owner resolution (Existing/New UI step) | **REQUIRED** — the one genuinely new user-facing mechanism across Add Stock, Smart Stock Entry, and (in a form yet to be specified) Contagem |
| Product Memory retrieval | **NOT AFFECTED** — existing functions reused unchanged (§A3 of the prior assessment) |
| Smart Stock Entry | **REQUIRED** (in scope of the new owner-resolution gate, per §4's amendment) |
| Manual Stock Entry | **REQUIRED** (same) |
| Contagem | **REQUIRED**, pending new specification coverage (§5, §8) |
| `StockBatch` schema | **NOT AFFECTED** — confirmed §6, above |
| `Product.sellingUnit` / `unitRelationship` | **NOT AFFECTED** |
| Unit conversion (`purchaseToSellingConversion.ts`) | **NOT AFFECTED** unless a future, separate decision extends Concept C's reach (§7 — not required by anything accepted so far) |
| Concept C | **NOT AFFECTED** — remains exactly as signed |
| Business Worth | **NOT AFFECTED** |
| Closing | **NOT AFFECTED** — no evidence of impact found; not exhaustively re-traced this session either (carried forward from the prior assessment's own evidence limitation) |
| Reports | **NOT AFFECTED** |
| Tests | **REQUIRED** — new tests for the owner-resolution gate and its "recognition failed vs. confirmed new" signal, once specified |
| Historical compatibility | **NOT AFFECTED** — §11, above |

---

## 13. Rule 8 Invariant Matrix

| # | Invariant | STATUS | Evidence |
|---|---|---|---|
| 1 | Product identity integrity | **PASS** | `Product.id` uniform across every path, unaffected by any accepted decision |
| 2 | Existing/New owner control | **PASS WITH CONDITIONS** | Sound in principle (§4–5, above); condition is that §4's amendment (§9, above) is actually made — the principle is accepted but not yet reflected in governing specification text |
| 3 | Product Memory canonicality | **PASS** | Unchanged; retrieval mechanism reused as-is |
| 4 | Unit relationship integrity | **PASS** | Untouched by any of the four decisions |
| 5 | Cost-unit semantics | **PASS** | `StockBatch.unit`/`costPrice` meaning unchanged, confirmed §6 |
| 6 | Selling-unit semantics | **PASS** | `Product.unitRelationship.sellingUnit` remains the sole product-level selling unit; Reading 2 does not introduce a competing one |
| 7 | Price-basis integrity | **PASS** | `StockBatch.sellingPrice`'s existing meaning is not repurposed (§6) |
| 8 | No competing sources of truth | **PASS** | Reading 2 selected specifically to avoid this; Concept C remains explicitly non-authoritative (Decision C) |
| 9 | No silent duplicate creation | **PASS WITH CONDITIONS** | This is exactly what Decision A targets; condition is the same as Invariant 2 — the specification amendment (§9) must actually happen before the principle is enforceable as governance, not merely as intent |
| 10 | Historical data integrity | **PASS** | §11, above |
| 11 | Business Worth integrity | **PASS** | §9 (Financial Integrity), above |
| 12 | Closing integrity | **NOT DETERMINABLE** | Not directly re-traced this session, consistent with the prior assessment's own flagged limitation; no evidence of impact found either |
| 13 | Tenant isolation | **PASS** | §10, above |
| 14 | Auditability | **PASS** | Owner-resolution step is a natural extension of already-audited flows (`logTimelineEvent`); Concept C's own frozen, timestamped snapshot is unaffected |
| 15 | Determinism | **PASS** | Every mechanism involved remains deterministic given its inputs; an owner's explicit choice is deterministic-given-the-choice |
| 16 | Backward compatibility | **PASS** | §11, above — no migration required |
| 17 | Performance/scale | **PASS WITH CONDITIONS** | No blocking constraint found; extending candidate/similarity detection to Contagem carries the same O(products) cost profile Add Stock already accepts today — an Implementation Plan attention point, not a blocker |
| 18 | Security/authorization | **PASS** | §10, above — no rule expansion implied |

---

## 14. Remaining Issues

1. **The §4 specification conflict (§9, above)** is the one genuine,
   named, unresolved governance item this final assessment surfaces
   that did not exist in the same form before this session's full
   re-read of `product-identity-alternative-name-specification.md`.
   It is newly identified evidence, not a re-statement of the prior
   assessment's own B2 fork (which is now fully resolved by Reading 2).
2. **Contagem's specification gap (§5, §8, above)** remains open at the
   specification-text level, though fully resolved at the
   decision-principle level by A-Contagem.
3. **Closing integrity** remains formally NOT DETERMINABLE, carried
   forward from the prior assessment, since no dedicated trace of
   Closing's own code path has yet been performed in either
   assessment.

No other unresolved architectural question was found. B2 Reading 2 and
Decision C are both fully conformant with existing governance and
require no further Product Architect decision or specification work.

---

## 15. Final Rule 8 Verdict

> **READY AFTER SPECIFICATION AMENDMENT**

**Rationale:** All four accepted decisions are architecturally sound
and, for B2/Concept C, already fully conformant with existing governing
specifications — no further Product Architect decision is required for
either. Decision A and Decision A-Contagem, however, cannot proceed to
an Implementation Plan as governance currently stands, because:

- Decision A's core "no silent creation without owner resolution"
  principle is **directly contradicted** by already-accepted text in
  `product-identity-alternative-name-specification.md` §4, for the
  specific, common case where no candidate was ever detected at all.
  This is not an ambiguity Rule 8 can resolve on its own technical
  authority (the way, e.g., §4's own "exact UI mechanism" question was
  correctly left to Rule 8) — it is a reversal of an already-decided
  business rule, which this repository's own established governance
  chain (BDR → Policy → Specification → Rule 8 → Authorization)
  requires to happen through formal specification amendment, not
  through Rule 8 silently overriding accepted text.
- Decision A-Contagem requires genuinely new specification coverage
  (not an amendment reversing anything, but new text) before any
  Contagem-facing mechanism can be authorized, since
  `product-identity-alternative-name-specification.md` §7 currently,
  correctly, and deliberately excludes Contagem from this capability
  entirely.

This is **not** "NOT READY" — no fundamental, unresolvable conflict
exists; the required amendments are narrow, precisely located, and do
not require reopening any decision already made (B2/Concept C in
particular are untouched). It is **not** "READY AFTER DECISIONS" —
every substantive Product Architect decision has now been made; what
remains is documentation work reflecting decisions already accepted,
not a new decision to seek. It is **not** plain "READY" — proceeding to
an Implementation Plan today would mean building against specification
text that still says the opposite of what was just decided, which is
exactly the kind of ambiguity this task's own governing instruction
warns against assuming away.

---

## 16. If Specification Amendment Is Required — What Must Be Amended

**Not performed here. Identified only:**

1. **`docs/specs/product-identity-alternative-name-specification.md`
   §4 ("New-Product Path")** — must be amended to remove the
   "proceeds exactly as it would for any product with no candidate
   ever detected" equivalence, and to require an explicit
   owner-facing Existing/New resolution step (or an equivalent,
   Product-Architect-acceptable minimum confirmation) before
   finalization completes as a new product, consistent with Decision
   A. A corresponding review of §10's "Failure Modes" table is likely
   needed for consistency, though §10 does not itself state the
   conflicting rule — only §4 does.
2. **New specification coverage for Contagem's own product-identity
   resolution mechanism**, consistent with Decision A-Contagem —
   whether as an amendment to `product-identity-alternative-name-specification.md`
   §7 (converting "Periodic Contagem: not in scope" into an explicit,
   bounded in-scope provision for this narrower mechanism) or as a
   new, separate specification document is itself an open drafting
   choice, not decided here.

**No amendment is required for B2 Reading 2 or Decision C.**

---

## Next Governance Gate

**Specification amendment and acceptance** — targeting the two items
in §16, above — is the next gate. Only once that amendment is drafted
and formally accepted should Rule 8 be revisited a third time (a short,
targeted re-check that the amended text now conforms, not a full
re-assessment) before any Implementation Plan may be produced.

---

## Evidence Limitations

- **Closing integrity** was not directly re-traced in either this or
  the prior assessment — no evidence of impact was found, but no
  dedicated inspection of Closing's own code path was performed.
- **Whether §8's signed "one-at-a-time unresolved-line sequencing"**
  is actually built in `AddStockView.tsx` remains
  NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE within this
  assessment's own scope, carried forward unchanged from the prior
  assessment.
- **`Product.sellingPrice`'s exact relationship to
  `Product.unitRelationship.sellingUnit`** when both are present
  remains flagged, unresolved, and unchanged from the prior assessment
  — not newly investigated this session.
- This assessment's new evidence this session is limited to a full
  read of `product-identity-alternative-name-specification.md` and a
  re-confirmation (not re-discovery) of the Consolidated Specification
  and current code state; it does not claim to have discovered any
  other new conflict beyond the one reported in §9.

---

## Final Verification

```
$ git status --short
```
Confirmed (session record): only this report file is newly created;
no other file in the working tree changed.

- [x] No implementation files changed.
- [x] No specification files changed.
- [x] No governance artifact was silently rewritten.
- [x] No migration occurred.
- [x] No Rule 8 conclusion was converted into implementation.
- [x] No Implementation Authorization was created.
- [x] No commit occurred.
- [x] No push occurred.

---

**RULE 8 FINAL VERDICT:**
READY AFTER SPECIFICATION AMENDMENT

**DECISION A:**
Architecturally sound; conflicts with already-accepted specification
text (`product-identity-alternative-name-specification.md` §4) that
must be formally amended before implementation.

**A-CONTAGEM:**
Architecturally sound; requires new specification coverage (currently
explicitly out of scope in `product-identity-alternative-name-specification.md` §7).

**B2 — READING 2:**
Fully conformant with existing governance; no schema change, no
specification amendment required.

**CONCEPT C:**
Fully conformant; Decision C reaffirms the existing signed boundary; no
amendment required.

**SPECIFICATION AMENDMENT REQUIRED:**
YES — two items, both identified in §16.

**ADDITIONAL PRODUCT ARCHITECT DECISIONS:**
None. Every substantive decision has been made; what remains is
specification drafting reflecting decisions already accepted.

**MIGRATION:**
NOT REQUIRED

**NEXT GOVERNANCE GATE:**
Specification amendment (the two items in §16) and its own Product
Architect acceptance — followed by a short, targeted Rule 8 re-check,
not a full re-assessment.

**IMPLEMENTATION:**
NOT AUTHORIZED

**COMMIT/PUSH:**
NOT PERFORMED

**STOP.**
