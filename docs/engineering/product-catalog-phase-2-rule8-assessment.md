Rule 8 Assessment — FINAL

# Rule 8 Assessment — Product Catalog Phase 2

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** This document does not authorize implementation. A separate Implementation Plan and a signed Implementation Authorization remain required, subsequent gates.

**Governing chain:** [Product Catalog Phase 2 BDR](../engineering/product-catalog-phase-2-bdr.md) (✅ Accepted, `e9e4297e7ba010619fd6ca81973fff07415711cf`) → [Selling Price/Unit Policy Amendment](../specs/POL-pending-selling-price-unit-invariant-amendment.md) (✅ Accepted, `d677c82329199e67c40159ec64e564bb79f38fd0`) → [Decision 1](../specs/product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md) (✅ Accepted, `cc09b5c9d718121023861973bd40edec6fb41ffa`) → [Decisions 2A/2B](../specs/product-catalog-phase-2-add-stock-correction-scope-and-name-confirmation-decision-amendment.md) (✅ Accepted, `7fe6ac9c54d157c4433f6dc6c29cf918fb69080b`) → [Product Catalog Phase 2 Specification](../specs/product-catalog-phase-2-canonical-product-information-multi-door-correction-and-selling-configuration-specification.md) (✅ Accepted, SABUSHIMIKE MASCENI, 2026-09-09, commit `a4880958a6f30c37e9aa76729ef2856b934c5c86`) → **this Rule 8 Assessment** → *(next: Implementation Planning, only if this assessment's verdict permits)*.

**Repository state investigated:** `main @ a488095` (the Specification's own acceptance commit), working tree clean, verified via `git fetch`/`git pull` immediately before this assessment. Every finding below was re-verified fresh against this exact commit.

**Scope of this assessment:** strictly the accepted Phase 2 Specification's own eighteen substantive sections (§1–§19, less §19 Out of Scope itself) — the 24 functional requirements at §17, and the field-level, invariant, extension/replacement, and name-confirmation rules those requirements formalize. This assessment does not reopen, redesign, or reinterpret any accepted Product Architect decision; it tests the Specification's internal coherence and its alignment with the governance chain that produced it.

---

# 1. Executive Determination

## **READY FOR IMPLEMENTATION PLANNING**

All sixteen assessed dimensions (§2.A–§2.P) pass. No contradiction was found between the Specification and any document in its governing chain. Two items are flagged as **implementation-planning-stage observations** (§2.L, §2.Q) — neither is a blocker; both must be explicitly addressed in the future Implementation Plan rather than assumed away. No governance-critical ambiguity requiring a further Product Architect decision was found (§4).

---

# 2. Dimension-by-Dimension Assessment

## 2.A — Specification ↔ Accepted BDR Alignment

**Confirmed fresh:** every field in the Specification's §4 Product Information Model (`name, unitRelationship, sellingPrice, category, supplier, sku, barcode`) matches the accepted Phase 2 BDR §5 list exactly, with no addition. §5's Three-Door Model restates BDR §4 Decisions 1–4 without narrowing or widening them. §9's alias-vs-rename distinction directly implements BDR §8's Recognition boundary.

**Finding: PASS.**

## 2.B — Specification ↔ Accepted Policy Alignment

**Confirmed fresh:** Specification §10's invariant wording — *"no reader of the canonical Product document may ever observe `sellingPrice` non-null while `sellingUnit` is absent or invalid"* — is a direct, non-narrowing restatement of the Policy Amendment's own operative rule and its four cases. The Policy Amendment's explicit deferral of enforcement mechanics to Specification (*"Enforcement mechanics... remain explicitly Policy-level, not decided here"* → Specification) is honored: §10 states outcome only, never a mechanism.

**Finding: PASS.**

## 2.C — Specification ↔ Decision 1 Alignment

**Confirmed fresh:** Specification §11 reproduces Decision 1's governing rule precisely — preserve until confirmed, validate, no-block-if-still-valid, block-and-require-new-selection-if-invalidated, no auto-select, no auto-clear. The Specification's own addition — the extension/replacement distinction (byte-identical prior units/factors = extension; any factor change or removal = replacement) — is a necessary elaboration of Decision 1's worked example, not a new rule; Decision 1 itself never distinguished extension from replacement mechanically, only illustratively.

**Finding: PASS.**

## 2.D — Specification ↔ Decisions 2A/2B Alignment

**Confirmed fresh:** Specification §7's field list (`name, sellingPrice, sellingUnit, unitRelationship` INCLUDED; `category, supplier, sku, barcode` EXCLUDED) matches Decision 2A's explicit inclusions/exclusions exactly, with the `category`/`supplier`/`sku`/`barcode` determination performed using Decision 2A's own delegated criterion against actual code evidence (zero references to any of the four fields found anywhere in `AddStockView.tsx`), not invented. Specification §9 matches Decision 2B's confirmation requirement verbatim in substance.

**Finding: PASS.**

## 2.E — Specification ↔ Phase 1 Reconciliation Alignment

**Confirmed fresh:** the Phase 1 reconciliation amendment identifies five specific superseded statements (Decision Proposal's unsigned Decision 9 second sentence; Rule 8 Assessment §2.4; Implementation Plan's "fields never written" line; Implementation Authorization's Scope §3.1(C) and "MUST NOT change" line). The Specification's §6 (Catálogo MUST allow correcting `unitRelationship`) and §10 (price requires unit) are exactly what that reconciliation anticipated superseding those statements *toward* — no new conflict introduced beyond what the reconciliation already named and resolved.

**Finding: PASS.**

## 2.F — Product Memory Boundary / BDR-0012 Preservation

**Confirmed fresh, re-reading `BDR-0012` §3 directly:** Specification §12's corrected wording — *"This Specification governs the canonical selling configuration represented by `sellingPrice` and `unitRelationship`; it does not redefine the broader Product Memory model governed by `BDR-0012`"* — accurately avoids the narrower, now-corrected earlier claim that these two fields are the *entirety* of Product Memory. `BDR-0012` §3's own "reference prices" (plural) language is left undisturbed; the Specification claims authority only over the selling-configuration slice.

**Finding: PASS.**

## 2.G — SupplierWordingRelationship / BDR-0013 / POL-0007 Boundary

**Confirmed fresh, re-reading `types.ts:376-382`:** `SupplierWordingRelationship.supplierRecordId` references `SupplierRecord.id` (the purchase-side supplier), never canonical `Product.supplier`. Specification §4 correctly excludes `supplierWordings` from its own generic field-correction model, and §9 correctly distinguishes the alias mechanism (governed separately, untouched) from the new deliberate name-correction capability. No redefinition of `BDR-0013`/`POL-0007` occurs anywhere in the Specification.

**Finding: PASS.**

## 2.H — FR-88 / costPrice Boundary

**Confirmed fresh:** `costPrice` is excluded in every one of the four places the Specification could plausibly have permitted it (§4, §6, §7, §17 item 2) — unconditional, no door-specific exception, matching FR-88 exactly as every prior governance stage in this chain has already preserved it.

**Finding: PASS.**

## 2.I — Canonical vs. Transaction-Specific Data

**Confirmed fresh:** Specification §4 and §15 both list the same transaction-specific set (purchase quantity, actual purchase unit, actual purchase cost, purchase date, `StockBatch`/`StockCountItem` fields, `SupplierRecord`) and both state it is never convertible into canonical Product Information "by any mechanism this Specification authorizes." §7's explicit `SupplierRecord`-vs-`Product.supplier` firewall is the specific, evidenced instance of this general rule the prior investigation flagged as needing explicit disambiguation.

**Finding: PASS.**

## 2.J — Three-Door Model (Catálogo / Add Stock / Contagem)

**Confirmed fresh:** §5 states the "one canonical record, no workflow-specific copies" principle; §6–§8 give each door a distinct, non-uniform field scope, correctly reflecting the accepted BDR §4 Decision 4 ("multi-door editing does not mean uniform, free-form editing of every field everywhere"). No door's scope was silently expanded or narrowed beyond what Decisions 2A/2B or the BDR itself already established.

**Finding: PASS.**

## 2.K — SellingPrice ↔ SellingUnit Invariant

**Confirmed fresh:** §10's seven MUST/MUST NOT statements, cross-checked against §17 items 10–14, cover every one of the four cases the Policy Amendment names (no price; unit-no-price; price-plus-valid-unit; price-without-valid-unit forbidden), plus the single-unit permission (`product-unit-of-measure-specification.md` §9, re-verified: *"must include at least `units[0]`... and, if any `sellingUnit` is being set, that value must be a member of `units[]`"* — no minimum length beyond one stated anywhere).

**Finding: PASS.**

## 2.L — UnitRelationship Extension vs. Replacement/Reconfiguration

**Confirmed fresh:** §11's definitions are mutually exclusive and jointly exhaustive over "any change to `units[]`" — every possible chain modification falls into exactly one of the two categories, with no gap. **One implementation-adequacy observation, not a contradiction:** the only existing relationship-write primitive, `confirmProductUnitRelationship` (`AppContext.tsx:8101`), validates a submitted candidate in isolation via `isValidUnitRelationship`, with no parameter for and no read of the Product's *prior* confirmed state — insufficient, as it exists today, to implement §11's replacement-blocking requirement (which needs the *old* `sellingUnit` compared against the *new* chain). This is not a Specification defect — §11 correctly leaves the mechanism open — but it is a concrete architecture-adequacy fact the Implementation Plan must account for as new logic, not assume as already covered by an existing, reusable function.

**Finding: NON-BLOCKING IMPLEMENTATION DETAIL — flagged for Implementation Planning, not a Rule 8 blocker.**

## 2.M — Explicit Owner-Confirmation Requirements

**Confirmed fresh:** §9 (name), §11 (replacement), and §13 (general advisory boundary, citing `BDR-0012` Decisions 10–12) together cover every consequential-change scenario named anywhere in the governing chain. No requirement permits a silent consequential change; §13 states the affirmative list of what the system *may* do (detect, validate, warn, present, explain, request confirmation) without ever including "decide."

**Finding: PASS.**

## 2.N — Existing Product vs. New Product Behavior

**Confirmed fresh:** §14.A–C draws the three-way distinction (new creation / adding stock / correcting information) explicitly, and §14's closing MUST ("Add Stock's new-product path MUST NOT bypass existing identity-resolution guards") correctly defers to the already-signed Product Identity Existing/New Resolution mechanism rather than restating or altering it.

**Finding: PASS.**

## 2.O — Recognition/Matching Must Not Silently Mutate Canonical Identity

**Confirmed fresh, re-checked against actual recognition code:** no write call (`updateProduct`, `confirmProductUnitRelationship`, or a literal `sellingPrice =`/`name =` assignment) exists anywhere in any recognition-related file — confirmed by direct grep, zero matches, consistent with the prior gap investigation's identical finding. §9's and §13's requirements match this existing, already-correct behavior; nothing in the Specification could regress it, since Recognition's write authority is not touched anywhere in this document.

**Finding: PASS.**

## 2.P — No Accidental Creation of Workflow-Specific Product Memory Stores

**Confirmed fresh:** §12's MUST NOT is explicit and unconditional across all three doors; no requirement anywhere in §6–§11 introduces a second field, collection, or document for storing selling configuration outside `Product.sellingPrice`/`unitRelationship` themselves.

**Finding: PASS.**

## 2.Q — Tenant / Ownership Authority Boundaries

**Confirmed fresh, re-read `firestore.rules:484-508`:** `products/{productId}` — `allow create: if isMemberOf(businessId)` (any tenant member); **`allow update, delete: if isOwnerOf(businessId)`** (Owner/Admin only, unconditional, already covers every canonical field this Specification names — no new field requires a rules change). No tenant-isolation gap exists; `isMemberOf`'s existing cross-business protection is untouched and sufficient.

**One observation, not a blocker, surfaced by cross-referencing `App.tsx`:** `AddStockView` (`activeTab === 'add-stock'`) is rendered with **no** `!isStaff` gate — confirmed by direct grep, unlike Dashboard/Stocks/Catálogo/Contagem, which are all explicitly Owner-only client-side. This means Add Stock is accessible to Staff today, while the underlying `products` collection's `update` rule restricts every canonical correction this Specification authorizes (§7) to Owner/Admin only. No accepted governance document in this chain (BDR, Decisions, Policy) states whether Add Stock's *correction* capability specifically must be Owner-only, Staff-usable, or role-gated some other way — the governing documents consistently speak of "the Owner" throughout without addressing a Staff-operated session. This does not block Rule 8: the existing rule already prevents any unauthorized write regardless of what UI is eventually built, so no data-integrity or security risk exists either way. It is, however, a concrete question the Implementation Plan must resolve explicitly (e.g., whether the correction UI is shown to Staff at all, queued for Owner approval, or otherwise handled) — silently assuming an answer during implementation would itself be the kind of "invented decision" this governance chain has consistently avoided.

**Finding: PASS on tenant isolation. NON-BLOCKING IMPLEMENTATION DETAIL — role-scoping of Add Stock's correction UI flagged for Implementation Planning.**

---

# 3. Contradictions Found

**None.** Every dimension in §2 above returned PASS or a non-blocking observation; no exact document/section pair was found in actual conflict.

# 4. Governance-Critical Unresolved Questions

**None found that require a further Product Architect decision before Implementation Planning.** The two items flagged in §2.L and §2.Q are implementation-adequacy and role-scoping questions respectively — both are the Implementation Plan's own job to resolve (per this repository's established Policy/Specification/Rule 8/Implementation Plan boundary), not gaps in accepted product decisions. Neither changes what the system must do; both concern how it will be built.

# 5. Reuse / Scope / Architecture Impact Assessment

The accepted Specification can be implemented within the existing architecture, with narrow, well-scoped additions — no unapproved product redesign is required:

- **Reusable as-is, no change needed:** `isValidUnitRelationship`/`confirmUnitRelationship` (validation primitives); `findLatestRememberedProductMemory`/`resolveUnitAwarePrice`/`resolveCanonicalProductSellingMemory` (Product Memory read layer, fully compliant with §12 already); `confirmSupplierWordingRelationship` (alias mechanism, untouched); existing identity-resolution guards (`confirmedNewProduct`); `firestore.rules`' existing `products` block (§2.Q, no rules change required).
- **Requires new logic, not merely a guard added to something existing:** Catálogo's `unitRelationship` write path (does not exist today); Add Stock's canonical correction path for `sellingPrice`/`sellingUnit`/`unitRelationship`/`name` on an existing product (does not exist today, per the prior gap investigation); the name-change confirmation mechanism (§9, entirely new); the replacement-blocking, old-state-aware validation §11 requires (§2.L, above).
- **Requires modification of existing behavior, already anticipated by the Phase 1 reconciliation:** `registerCatalogProduct`'s current unconditional `sellingPrice`-required/`unitRelationship`-never-written behavior; `recordStockCount`'s two independently-populated maps (§10 compliance).
- **Known, already-flagged test debt:** `product-catalog-phase-1-checkpoint-b.test.ts` currently asserts the now-superseded "never sets `unitRelationship`" behavior — will require updating once implementation changes `registerCatalogProduct`; this is a downstream implementation-stage consequence, not a Rule 8 blocker.

No schema change, no `firestore.rules` change, and no new collection were found necessary anywhere in this assessment.

# 6. Final Rule 8 Disposition

## **READY FOR IMPLEMENTATION PLANNING**

Zero blockers. Zero contradictions. Zero governance-critical unresolved questions. Two non-blocking implementation-planning-stage observations recorded (§2.L, §2.Q) for the Implementation Plan to explicitly address, not silently assume. The next governance gate is **Implementation Planning** — not authorized by this document, and not performed here.

---

## Governance Notes

- This document does not modify the accepted Phase 2 Specification, BDR, Policy Amendment, Decision 1, Decisions 2A/2B, the Phase 1 reconciliation, `BDR-0012`, `BDR-0013`, `POL-0005`, `POL-0007`, or any other existing governance artifact.
- No application code, test, schema, or `firestore.rules` file has been modified to produce this assessment.
- This document does not authorize an Implementation Plan or Implementation Authorization — both remain separate, required, subsequent gates.
