# Targeted Rule 8 Re-Check — §4a / §7a Amendment

**GOVERNANCE GATE: TARGETED RULE 8 RE-CHECK**

**SCOPE: NARROW.** This is not a full Rule 8 re-assessment. It verifies
only that the two conflicts identified in
[`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_FINAL_ASSESSMENT.md)
§9/§16 are now resolved by the accepted amendment
([`product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md`](./product-identity-alternative-name-specification-no-candidate-and-contagem-amendment-draft.md),
Accepted 2026-09-06), and that nothing else has drifted since that
assessment.

**IMPLEMENTATION: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**
**COMMIT/PUSH: NOT PERFORMED**

---

## 1. §4 / §4a — No-Candidate / Unresolved Identity

**Verified directly against the live specification text
(`docs/specs/product-identity-alternative-name-specification.md`
§4a):**

| Requirement | Verified in §4a? |
|---|---|
| No-candidate/unresolved identity can no longer silently create a Product | ✅ Yes — §4a states plainly: "This case must **not** silently proceed to automatic new-product creation," correcting §4's original equivalence between "owner declined a candidate" and "no candidate ever detected." |
| Explicit Existing/New owner resolution is required | ✅ Yes — "the owner must be given an explicit opportunity to resolve it as either an **Existing Product**... or an explicitly-confirmed **New Product**." |
| Only owner-confirmed New Product can create a new Product | ✅ Yes — §4a's own three-state model names state 3 ("Explicit owner-confirmed New Product") as "the **only** path that may result in `Product` creation with no prior match," and requires it be recorded as distinct from state 2 (unresolved) "merely never having been reached." |

**Consistency check against the prior conflict:** the exact wording the
Final Rule 8 Assessment flagged as conflicting — "the stock entry
proceeds exactly as it would for any product with no candidate ever
detected" — remains in §4's original text (preserved as historical
record, per governance convention) but is now explicitly narrowed by
§4a to apply only to the already-distinguished "owner declined a
candidate" case, not to the "no candidate at all" case. **The conflict
is resolved — the live specification's *governing* text (§4 read
together with §4a) no longer permits what Decision A prohibits.**

**Boundary check:** §4a explicitly does not touch already-valid
automatic recognition (§3, §6) or the conflict-handling/distinguishing-
information gate (§5) — confirmed by direct re-read; no unintended
narrowing of those sections was introduced.

---

## 2. §7 / §7a — Periodic Contagem

**Verified directly against the live specification text (§7a):**

| Requirement | Verified in §7a? |
|---|---|
| Periodic Contagem is covered by the general Existing/New principle | ✅ Yes — "Periodic Contagem is now within scope of the **general Existing/New identity-resolution principle** established by Decision A and §4a." |
| Supplier-Wording Recognition remains excluded from Contagem | ✅ Yes — "§7's exclusion of Periodic Contagem... is **not reversed** with respect to Supplier-Wording Recognition. Periodic Contagem continues to have no supplier concept, and continues not to run this Specification's own candidate-detection or reuse-matching mechanism (§3, §6)." |
| Resolution remains business-scoped and non-cross-tenant | ✅ Yes — §7a's own mechanism constraints state explicitly: "must **not** require supplier identity, in any form; must **not** require a cross-business Product query; must **not** automatically select among multiple plausible existing Products." |

**Consistency check against the prior gap:** the Final Rule 8
Assessment found §7's original "Periodic Contagem: not in scope" line
left A-Contagem entirely uncovered by any specification text. §7a now
provides that coverage, narrowly, without reopening or reversing the
original Supplier-Wording exclusion — confirmed by direct comparison:
§7's original line is preserved verbatim, and §7a's own opening
sentence explicitly reaffirms rather than contradicts it.

---

## 3. Confirmations

**Decision A remains intact:** ✅ Confirmed. §4a's text is a direct,
unmodified restatement of Decision A's own accepted wording — no
narrowing, no expansion, no reinterpretation. Automatic recognition
"where confidence is sufficient" remains fully permitted and
untouched, per §4a's own "no new interaction required" statement for
state 1.

**B2 Reading 2 remains intact:** ✅ Confirmed. Neither §4a nor §7a
references `StockBatch`, `unitRelationship`, `sellingPrice`,
`sellingUnit`, or Concept C in any way that alters their governing
meaning — both sections deal exclusively with product-identity
resolution mechanics. §7a explicitly names B2 as one of the areas
"unaffected" by its own addition. No file governing B2 (`product-memory-purchase-selling-valuation-specification.md`,
`purchaseToSellingConversion.ts`, `StockBatch`'s type definition) was
touched by the amendment — confirmed via `git diff --stat` (§5, below):
only `product-identity-alternative-name-specification.md` was modified.

**Concept C remains Derived/Frozen only:** ✅ Confirmed. Same basis as
above — Concept C is named explicitly in §7a's own "not altered by this
amendment" list, and is not referenced anywhere in §4a. No code file
(`purchaseToSellingConversion.ts`, `AppContext.tsx`) was touched.

**No additional Product Architect decisions have appeared:** ✅
Confirmed. Both §4a and §7a restate decisions already accepted
(Decision A, Decision A-Contagem) without introducing any new open
question requiring Product Architect input. The "not decided by this
amendment" lists in both sections (algorithm, threshold, UI, ranking,
exact flag mechanism) restate items the *original* specification and
the *amendment draft* already, correctly, left to Rule 8/implementation
— none of these rises to a business-level decision the Product
Architect has not already made the relevant surrounding principle for.

**No schema amendment is required:** ✅ Confirmed. Neither §4a nor §7a
introduces, references, or implies a new field on `Product`,
`StockBatch`, `StockCount`/`StockCountItem`, or any other type. Both
are business-behavior requirements only (an owner-resolution step must
exist; it must retrieve existing Product Memory through the existing,
unmodified retrieval mechanism). This matches the Final Rule 8
Assessment's own §12 finding that the underlying decisions require no
migration and, per the amendment draft's own §4, no schema change.

**No implementation has occurred:** ✅ Confirmed — §5, below.

---

## 4. Anything Else Drifted Since the Final Assessment?

Re-checked against the Final Assessment's own two flagged evidence
limitations (Closing integrity NOT DETERMINABLE; §8 sequencing
NOT ESTABLISHABLE) — neither is touched or newly implicated by this
amendment; both remain exactly as previously flagged, carried forward
unchanged, and out of scope for this targeted re-check (they do not
concern §4/§4a or §7/§7a).

No other governance artifact, code file, or schema was found to have
changed since the Final Rule 8 Assessment other than the amendment
draft's own acceptance and its application to the live specification —
confirmed by the git status/diff check below.

---

## 5. Final Verification

```
$ git diff --stat
 docs/specs/product-identity-alternative-name-specification.md | 92 +++++++++++++++++++++-
 1 file changed, 88 insertions(+), 4 deletions(-)
```

Only the specification file is modified (tracked), and the
modification is confined to §4a, §7a, four header-line augmentations,
and one new acceptance section — all additive, none deleting original
governing text. No implementation, schema, Firestore-rules, or test
file appears in the diff.

- [x] §4/§4a verified — no-candidate silent creation is now prohibited.
- [x] §7/§7a verified — Contagem is covered; Supplier-Wording remains excluded; resolution remains business-scoped.
- [x] Decision A intact.
- [x] B2 Reading 2 intact.
- [x] Concept C intact (Derived/Frozen only).
- [x] No additional Product Architect decisions found.
- [x] No schema amendment required.
- [x] No implementation performed.
- [x] No commit performed.
- [x] No push performed.

---

## Verdict

> **READY FOR IMPLEMENTATION PLANNING**

Both previously identified specification conflicts (§4 vs. Decision A;
§7 vs. Decision A-Contagem) are resolved in the live specification text
via §4a and §7a. B2 Reading 2 and Concept C remain fully conformant and
untouched. No new Product Architect decision, schema change, or
migration has been introduced by the amendment. The architecture is now
internally consistent and implementation-ready **at the governance
level** — an Implementation Plan may next be produced, followed by
Implementation Authorization, before any code is written. This
document does not itself produce that plan or authorize implementation.

**NEXT GOVERNANCE GATE:** Implementation Plan.

**IMPLEMENTATION:** NOT AUTHORIZED

**COMMIT/PUSH:** NOT PERFORMED

**STOP.**
