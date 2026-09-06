# Implementation Plan Governance Review — Product Identity Existing/New Resolution

**GOVERNANCE GATE: IMPLEMENTATION PLAN GOVERNANCE REVIEW**

**IMPLEMENTATION: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED — not created by this document**
**COMMIT/PUSH: NOT PERFORMED**

This is a plan review only. No application code, test, schema, or
Firestore-rules file was modified to produce this review. The single
artifact edited was
[`product-identity-existing-new-resolution-implementation-plan.md`](./product-identity-existing-new-resolution-implementation-plan.md)
itself, corrected in the two places §6/§10 identify below — the plan
document, not the accepted architecture or specification.

---

## 1. Verdict

> **READY FOR PRODUCT ARCHITECT ACCEPTANCE**

The plan is architecturally sound, fully traceable to every accepted
decision, and introduces no scope creep. Two accuracy corrections were
required and have been made directly to the plan document (§10, below)
— neither reflects a governance conflict; both reflect the plan
becoming more precise about the actual codebase.

---

## 2. Decision A Compliance

**PASS.**

Evidence: the plan's §4.1 three-state model (automatic confident
recognition / unresolved / explicit owner-confirmed new product) is a
direct, unmodified restatement of Decision A's own accepted wording —
verified by side-by-side comparison against
[`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md)
§2. The plan's §4.2 mechanism (extend the existing
`supplierWordingCandidates`-style blocking pattern in
`handleSubmit`/`addMultipleStockBatches`) does not weaken, bypass, or
reinterpret any part of Decision A — automatic recognition "where
confidence is sufficient" remains untouched (state 1 requires no new
interaction, confirmed in §4.1), and only an explicit owner-confirmed
New Product may create a `Product` (state 3, the plan's own
safety-boundary assertion in §4.2/§6).

---

## 3. Contagem Compliance

**PASS.**

Evidence: the plan's §4.3 explicitly preserves Supplier-Wording
Recognition's exclusion from Contagem ("this must not use
Supplier-Wording Recognition"), scopes the new mechanism to Periodic
Contagem only (not Initial Stock, consistent with §7a's own scoping,
confirmed by direct re-read of §7a during this review), and requires
no supplier identity, no cross-business query, and no automatic
selection on ambiguity (§11 of the plan, §7a of the Specification).

**`findSimilarProducts` audit (specifically requested, item 4):**
verified consistent with all five required properties:

| Property | Verified? | Basis |
|---|---|---|
| Supplier-independent | ✅ | `findSimilarProducts`'s own signature and implementation take no supplier parameter — confirmed by direct inspection during the original evidence investigation and re-confirmed here; it operates on product names only |
| Business-scoped | ✅ | Operates only against the in-memory `products` array already subscribed per-business in `AppContext.tsx` — no new query of any kind |
| Tenant isolation | ✅ | Same basis — no cross-business reference is possible, since the array itself is business-scoped at the point it is fetched |
| Existing/New owner confirmation preserved | ✅, **clarified this review** | The plan's §4.3 (as corrected — see §10, below) now explicitly states that `findSimilarProducts` populates only the **candidate list within a new, blocking resolution control** — it never assigns a `productId` on its own, and finalization is gated by `recordStockCount`'s own new safety boundary, not by this function's output |
| No automatic selection on ambiguity | ✅, **clarified this review** | The correction adds an explicit statement that an owner must select one candidate (or confirm New) before a line resolves — multiple equally-plausible candidates are never auto-resolved |

**Determination:** the plan does not reject `findSimilarProducts` merely
for being a similarity mechanism (correctly, per this task's own
instruction) — it uses it only as a candidate-surfacing input to an
owner-authoritative, blocking gate. This is architecturally distinct
from, and does not reintroduce, Add Stock's own non-blocking "did you
mean" use of the identical function — the review's correction makes
this distinction explicit in the plan text, since the original wording
could have been read as proposing the same non-blocking treatment.

---

## 4. B2 Reading 2 Compliance

**PASS.**

Evidence: the plan's §16 explicit out-of-scope list names "any change
to `StockBatch`... schema" and "any change to Business Worth, Closing,
or B2/selling-basis semantics." No section of the plan's design (§4),
file list (§6), or test plan (§14) references `StockBatch.unit`,
`StockBatch.sellingPrice`, or any competing selling-basis field. The
new client-side resolution signal (§4.1) is explicitly not persisted
before finalization and does not touch any transaction-level pricing
field.

---

## 5. Concept C Compliance

**PASS.**

Evidence: the plan's §16 explicitly excludes "any change to Concept
C's reach, authority, or call sites." §14's own test-coverage row for
this requirement additionally proposes a **source-scan test** asserting
neither `addStockBatch` nor `recordStockCount` newly references
`buildDerivedSellingValuationSnapshot`/`derivedSellingValuation` — a
concrete, verifiable guard against the plan even *incidentally*
extending Concept C's reach, which no prior artifact in this chain
authorizes (Decision C reserves that as a separate, not-yet-made
decision). This is a stronger guarantee than a bare textual claim of
non-interference.

---

## 6. Single-item `addStockBatch` Call-Site

**Traced in full, this review, directly against the current repository
state:**

```
$ grep -rn "\.addStockBatch\b|addStockBatch\(" apps/tenant/src --include="*.tsx" --include="*.ts" | grep -v AppContext.tsx
(no matches)
```

**Finding: `addStockBatch` has no live caller anywhere in the current
codebase.**

- It is defined in `AppContext.tsx` (line 3206), typed on the context
  interface (line 669), and exposed on the context's provided value
  (line 8400) — but is invoked from no component.
- `AddStockView.tsx` — the only UI surface for adding stock, whether
  the owner enters one item or several — calls exclusively
  `addMultipleStockBatches` (confirmed: every reference to either
  function name in that file's source resolves to
  `addMultipleStockBatches`; `addStockBatch` appears there only inside
  a code comment, never as a call).
- Every other reference to `addStockBatch` anywhere in the repository
  (`openBatchSupersession.ts`, `unitRelationship.ts`, `types.ts`,
  `server/index.ts`, `InitialStockCountView.tsx`) is a code comment,
  not an invocation.

**Was the plan's file list complete?** The plan already listed
`addStockBatch` in its "exact files expected to change" table (§6) —
so no file was missing. **What was inaccurate** was the plan's implicit
premise that a live UI resolution step needed to be *built* for this
function's own caller (Checkpoint B originally read as a parallel,
smaller version of Checkpoint A's UI work).

**Where does unresolved identity currently become a new Product, for
this function specifically?** Inside `addStockBatch` itself — the
identical unconditional `!products.find(...)` → create-new-Product
pattern already traced in the evidence investigation. This remains
true regardless of the function currently having no live caller: if it
is ever called (a currently-undiscovered future consumer, or an
intended-but-not-yet-wired feature), the same silent-creation behavior
would occur today.

**Does the plan's proposed change cover that path?** Yes, and this
review's correction makes the coverage more precise rather than
removing it: the same safety-boundary assertion (reject an item with
no `productId` and no confirmed-new signal) is still added to
`addStockBatch` itself, defensively — but no new resolution UI is built
for it in this plan, since there is no live surface to build one into.
Should a future caller of `addStockBatch` be discovered or introduced,
that caller would need its own resolution UI at that time, following
the same pattern established in Checkpoint A — this is noted in the
corrected plan, not left as a silent gap.

**Plan correction applied:** yes — see §10, below.

---

## 7. File Scope Audit

**Correct files (verified, all genuinely belong to this
implementation):**

| File | Verified relevant? |
|---|---|
| `apps/tenant/src/components/AddStockView.tsx` | ✅ — the sole live UI for Add Stock/Smart Stock Entry rows; owns the existing `handleSubmit` blocking pattern this plan extends |
| `apps/tenant/src/context/AppContext.tsx` (`addMultipleStockBatches`) | ✅ — the sole live finalization function for Add Stock/Smart Stock Entry |
| `apps/tenant/src/context/AppContext.tsx` (`addStockBatch`) | ✅, scope corrected — still genuinely relevant as a defensive boundary, not as a live-UI checkpoint (§6, above) |
| `apps/tenant/src/context/AppContext.tsx` (`recordStockCount`) | ✅ — the sole finalization function for Periodic Contagem, confirmed unchanged from the original evidence investigation |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | ✅ — confirmed, this review, to import no candidate/similarity mechanism today (zero matches for `findSimilarProducts`/`supplierWording*`), making it the correct and only file needing the new resolution UI for Contagem |

**Missing files:** none identified. The five files above fully cover
every live code path this plan's own scope (§2) names.

**Incorrectly included files:** none identified. `InitialStockCountView.tsx`
is correctly and explicitly excluded (§4.3 of the plan states this
directly, consistent with §7a's own Contagem-only, not
Initial-Stock, scoping) — verified by re-reading §7a during this
review: it names "Periodic Contagem" only, at no point extending to
Initial Stock.

---

## 8. Test Plan Audit

| # | Required proof point | Planned test(s) | Sufficient? |
|---|---|---|---|
| A | Unresolved identity cannot silently create a Product | New safety-boundary unit test on all three finalization functions, asserting refusal with no `productId`/no confirmed-new signal | ✅ |
| B | Owner Existing selection resolves to the correct existing Product | **Added this review** (§10) — new test with multiple candidates, asserting the specific one clicked is the one resolved | ✅ (was a genuine gap; now closed) |
| C | Owner New selection explicitly creates a Product | New test: confirmed-new signal → creation, matching today's shape | ✅ |
| D | Product Memory is reused after Existing resolution | New test: resolved `productId` → same `findLatestRememberedProductMemory` call/result as the existing exact-match path | ✅ |
| E | Contagem follows Existing/New | New safety-boundary test mirroring (A), applied to `recordStockCount` | ✅ |
| F | Contagem does not use Supplier-Wording Recognition | New source-scan test, mirroring the existing `initial-stock-portion-grouping-wiring.test.ts`/`periodic-stock-portion-grouping-wiring.test.ts` pattern | ✅ |
| G | Tenant isolation remains intact | New source-scan/code-level test confirming the resolution UI's candidate source is the already-scoped `products` array and no new Firestore query is introduced | ✅ |
| H | Existing unit relationship/selling-price behavior remains intact | Full existing 195-test suite re-run unmodified (regression protection, §15 of the plan) | ✅ |
| I | B2 Reading 2 remains untouched | Re-run `derived-selling-valuation-snapshot.test.ts`/`derived-transaction-valuation-quebra.test.ts` unmodified + new source-scan assertion (§5, above) | ✅ |
| J | Concept C remains untouched | Same tests as (I) — the source-scan assertion is the decisive guard | ✅ |

**Determination:** every required proof point A–J has a corresponding,
sufficient planned test. One genuine gap was found (B, conflated with D
in the original plan text) and corrected — see §10.

---

## 9. Scope-Creep Audit

Checked against every prohibited redesign named in this review's own
governing instructions:

| Prohibited scope | Present in plan? |
|---|---|
| General fuzzy-search redesign | No — plan reuses `findSimilarProducts` unmodified; no new algorithm proposed |
| New AI recognition system | No — no AI/semantic mechanism is introduced or altered; §16 confirms |
| Barcode/SKU project | No — explicitly excluded, §16 |
| Product Memory redesign | No — retrieval functions reused unmodified (§4.4) |
| `StockBatch` schema redesign | No — explicitly excluded, §16; confirmed no field is proposed |
| Business Worth change | No — explicitly excluded, §16 |
| Concept C operationalization | No — explicitly excluded, §16, with a dedicated regression test guarding it (§5, above) |
| Supplier-Wording expansion into Contagem | No — explicitly, repeatedly prohibited in §4.3 and §7a, and reaffirmed by this review's own clarification |

**No prohibited redesign has entered the plan.**

---

## 10. Corrections Made

Two accuracy corrections were made directly to
`product-identity-existing-new-resolution-implementation-plan.md`
(no accepted architecture or specification was altered):

1. **§2 table, §4.2, §5 (Checkpoint B), §6 (file table), §16** —
   corrected to state plainly that `addStockBatch` has zero live
   callers anywhere in the current codebase (traced in full, §6 of
   this review). Checkpoint B is re-scoped from "a parallel, smaller
   UI checkpoint" to "a defensive safety-boundary addition only, no
   new resolution UI required," and the plan's own previously-flagged
   open question ("call site wasn't re-traced") is marked resolved
   rather than left open.
2. **§4.3, §14 (test table)** — clarified that `findSimilarProducts`'s
   role in the new Contagem resolution control is strictly to populate
   a candidate list within a **blocking** gate (owner must explicitly
   select or confirm-new), distinct from its existing **non-blocking**
   "did you mean" use in Add Stock — and a new, explicit test proof
   point was added (owner selection among multiple candidates resolves
   to the specific one chosen) to close a gap where the original test
   table conflated "resolves to the correct product" with "retrieves
   Product Memory" into a single row.

No other change was made. No accepted Product Architect decision,
specification section, or Rule 8 finding was reopened, reinterpreted,
or contradicted by either correction — both are plan-accuracy fixes
arising from this review's own direct code trace, not governance
changes.

---

## 11. Governance State

```
Targeted Rule 8 Re-check
        ↓
READY FOR IMPLEMENTATION PLANNING
        ↓
Implementation Plan
        ↓
Implementation Plan Governance Review
        ↓
READY FOR PRODUCT ARCHITECT ACCEPTANCE  ◄── this document
        ↓
Product Architect Acceptance — PENDING, not performed by this document
        ↓
Implementation Authorization — PENDING, not performed by this document
        ↓
Implementation — NOT AUTHORIZED
```

---

## 12. Stop Condition

This review stops here. No Implementation Authorization was created or
signed. No code, test, schema, or Firestore-rules file was modified.
The only file changed was the Implementation Plan itself, corrected as
described in §10.

**IMPLEMENTATION: NOT AUTHORIZED**

**COMMIT/PUSH: NOT PERFORMED**

**STOP.**
