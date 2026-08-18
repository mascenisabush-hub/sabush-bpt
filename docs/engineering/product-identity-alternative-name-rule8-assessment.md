Rule 8 Assessment

# Rule 8 Assessment — Supplier-Wording Recognition, Confirmation & Conflict

**Governing chain:** [`BDR-0013`](../specs/BDR-0013-product-identity-alternative-name-memory.md) (Approved, all nine §5 items ACCEPT) → [`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md) (Approved) → [`product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md) (✅ Accepted, 2026-08-19).
**Scope of this assessment:** BDR-0013 items 1, 3, 4, 5, 6, 7 only, exactly as the accepted Specification scopes them. Item 8 (surface scope: Initial Stock, Add Stock, Smart Stock Entry) is respected, not re-decided. **Item 9 (historical duplicates) is out of scope**, per the Specification's own §12.
**Lifecycle state:** Designed → Proposed → **Assessed** (this document). Reaching "Assessed" is a readiness opinion, not authorization — per `platform-engineering-governance-standard.md` §3.
**Baseline verified fresh:** `main = origin/main = f1b9e2d`, working tree clean, confirmed via `git fetch` immediately before this assessment began.

---

## 0. Terminology — Correction Applied This Revision

**This section records an explicit Product Architect clarification of BDR-0013's own already-approved meaning. It is a clarification, not a new business decision — it authorizes no new field, schema, algorithm, UI, or Implementation Authorization.**

- **"Initial Stock"** = the initial capital stock-count workflow: the owner counts the products already belonging to the business when establishing the business's starting inventory/capital, and records their names. `Product.name`, established here, becomes the primary/reference product name (`BDR-0013` item 2). **No supplier is selected, captured, or associated with a product during Initial Stock.**
- **"Supplier stock entry"** = a subsequent stock-receipt/purchase-entry workflow in which stock is actually received from a supplier — concretely, **Add Stock** and **Smart Stock Entry** in this repository's existing architecture. This is where a supplier's own wording for a product is encountered, and where `BDR-0013` item 3's confirmation interaction ("receiving/recording stock from a supplier and entering the supplier's receipt") actually occurs.

**"Initial Stock" must never be used to mean "the first supplier purchase entered after initial capital establishment."** These are two separate workflows. A product's participation in `BDR-0013`'s supplier-wording-recognition capability spans both: Initial Stock (or, equally, Add Stock/Smart Stock Entry for a genuinely new product) establishes the product's identity and primary/reference name; supplier stock entry is where that identity subsequently acquires confirmed, supplier-specific alternative wordings. `BDR-0013` item 8's inclusion of Initial Stock in this capability's surface scope refers to the former role (source of reference identity), not to Initial Stock itself running any candidate-detection, confirmation, or owner-declaration UI — see Finding 10, corrected below, which previously misread this distinction.



## 1. Objective

Determine whether the accepted Specification is technically safe and sufficiently bounded to proceed to the separate Implementation Authorization gate — validating feasibility, architecture, security, tenant isolation, lifecycle integrity, performance, failure behavior, and implementation risk, without inventing new business requirements or silently resolving anything the governing chain left open for a different layer.

## 2. Governance Authority Consumed

- `BDR-0013` §5 items 1–7 (all ACCEPT), Decisions 1–5.
- `POL-0007`'s Business Requirements 1–10, Candidate Grounds, Multiple Candidates, Conflicting Supplier Wording (mandatory distinguishing information), Owner-Initiated Declaration, Interaction With Item 7, Confirmation Experience, Reuse, Technical Boundary.
- The accepted Specification's §§1–12 in full, including its explicit deferrals to this Rule 8 stage.
- `platform-engineering-governance-standard.md` (Stage 7 process; Non-Negotiable Principles 1–7).

## 3. Fresh Code Evidence Gathered

Directly re-verified this session, not assumed from prior sessions:

- `apps/tenant/src/types.ts`: `Product` (no `unitRelationship`, no alternative-name field of any kind today — confirms the UOM Specification's own acceptance hasn't yet been implemented either, consistent precedent that Specification acceptance ≠ implementation); `Supplier` (embedded, immutable `PurchaseBatch` snapshot); `SupplierRecord` (reusable, `id`-keyed, tenant-scoped entity); `PurchaseBatch.supplierId` (optional forward reference to `SupplierRecord`); `InitialStockDraftItem`/`CountRowItem` (exactly `id, productName, quantity, unit, costPrice, sellingPrice` — **zero supplier field**).
- `apps/tenant/src/components/InitialStockCountView.tsx`: `grep -ci "supplier"` → **0**.
- `apps/tenant/src/components/AddStockView.tsx`: `grep -ci "supplier"` → **123**; exact-match product lookup at line 136 (`products.find(p => p.name.toLowerCase() === productName.toLowerCase())`), operating on an in-memory, already-loaded `products` array — not a Firestore query.
- `server/smartStockEntry.ts`: `grep -ci "supplier"` → **6**; `matchProductByExactName` (194–201), server-side, pure function, exact case-insensitive match only, operating on a caller-supplied `existingProducts` array; its own doc comment explicitly anticipates a future "Tier 4 fuzzy-matching capability" without building it.
- `apps/tenant/src/context/AppContext.tsx`: identical exact-match pattern at lines 1572/1877; `runTransaction` already used (line 1684) for a lock-document pattern protecting concurrent claims to a shared per-business resource (open-batch numbering) — direct, reusable precedent for this capability's own concurrency needs; Product writes (lines 1597, 2283, 3323, 3038, 3346) use plain `setDoc`/`writeBatch`/`updateDoc`, **not** transaction-protected against races.
- `firestore.rules` (319–335): `/products/{productId}` and `/suppliers/{supplierId}` — both `businesses/{businessId}/...`-scoped; member read/create, owner-only update/delete; no cross-tenant path exists in either rule.
- `firestore.indexes.json`: no existing index on `products` or `suppliers` fields — consistent with today's pure in-memory/exact-match query pattern (no compound query currently needs one).
- `04-smart-stock-entry-amendment.md` (215–222): an already-specified, three-option confirmation pattern (*"Confirm / Choose a different product / Create new — never AI → Product A → automatic attachment"*) for a structurally identical propose-never-silently-attach requirement in this same codebase.
- `apps/tenant/src/data/businessCategories.ts`: `normalize()` function exists (line 171) — already noted by `POL-0003` as existing-but-unevaluated for name-similarity purposes.
- `tests/delete-product-plan.test.ts` + `apps/tenant/src/utils/deleteProductPlan.ts`: product deletion is an atomic, all-or-nothing `writeBatch` cascade — currently aware of `batches`/`quebras` subcollections only, not any future alternative-name subcollection.
- `tests/open-batch-concurrency.test.ts`: existing precedent for testing exactly this class of concurrency problem in this codebase.

---

## 4. Findings

### Finding 1 — Data Model: Array-on-`Product` Is the Recommended Storage Structure

**Severity:** MINOR (Rule-8-resolvable; Specification explicitly delegates this decision here)

**Evidence:**
- Specification §2: storage structure "explicitly deferred to Rule 8."
- UOM Specification's own "Model B" precedent (array on `Product`) for a conceptually similar owner-confirmed, product-scoped configuration, already Accepted.
- `apps/tenant/src/utils/deleteProductPlan.ts` + its test suite: product deletion is currently an atomic cascade aware only of `batches`/`quebras`. A dedicated subcollection for alternative-name relationships would need this cascade explicitly extended to remain atomic; an inline array requires no such change, since it deletes automatically with the parent `Product` document.
- Firestore's 1 MiB per-document limit is generous relative to plausible relationship counts (a product realistically has, at most, low tens of distinct supplier wordings even for large multi-supplier catalogs).

**Technical assessment:** An inline array is safe, requires no new cascade-deletion engineering, and matches this repository's own established precedent for structurally similar owner-confirmed metadata. A dedicated subcollection remains technically viable but adds real, avoidable engineering surface (extending `planDeleteProduct`, a new Firestore rule block, a new index if queried independently) without a corresponding benefit at any realistic scale for this specific business domain (small/medium retail catalogs).

**Governance classification:** Rule 8-owned technical determination, per the Specification's own explicit deferral. Not a Product Architect or Specification-layer decision.

**Recommendation:** Inline array on `Product`, following the UOM Specification's Model B precedent. Revisit only if a future, evidenced scale concern arises (per Finding 15, below).

**Implementation impact:** A new optional array field on `Product`; `deleteProductPlan.ts` requires no change (array deletes with the parent document).

---

### Finding 2 — Supplier Identity: `SupplierRecord.id` Is the Correct, Evidenced Key

**Severity:** PASS

**Evidence:** `PurchaseBatch.supplier` (type `Supplier`) is an explicitly immutable historical snapshot (own code comment: editing a `SupplierRecord` "must never rewrite any existing `PurchaseBatch.supplier` snapshot"). `SupplierRecord` is the reusable, `id`-keyed, forward-looking entity `PurchaseBatch.supplierId` optionally references.

**Technical assessment:** A remembered relationship must persist and be looked up again on a future, separate purchase — the immutable snapshot is architecturally unsuitable for this (it would freeze the relationship at one historical moment); `SupplierRecord.id` is the only existing identity concept that fits. No new supplier-identity concept needs to be invented.

**Governance classification:** Confirmed technical fact, not a decision requiring any authorization layer.

**Recommendation:** Key all supplier-wording relationships to `SupplierRecord.id`.

**Implementation impact:** None beyond referencing an already-existing, already-tenant-scoped entity.

---

### Finding 3 — Tenant Isolation: Preserved, With Direct Rule Evidence

**Severity:** PASS

**Evidence:** `firestore.rules` 319–335: `/products/{productId}` — `allow read: if isMemberOf(businessId)`, `allow create: if isMemberOf(businessId)`, `allow update, delete: if isOwnerOf(businessId)`. `/suppliers/{supplierId}` — identical shape. Both paths are nested under `businesses/{businessId}/...`, with no collection-group query or cross-business read path defined anywhere in the file for either collection.

**Technical assessment:** Since any alternative-name relationship data lives inside the already-isolated `Product` document (Finding 1) and references an already-isolated `SupplierRecord`, no new cross-tenant read/write path is created. No superadmin/cross-business bypass rule exists for either collection (confirmed by absence, not merely unchecked).

**Governance classification:** Confirmed technical fact.

**Recommendation:** No new `firestore.rules` block is needed for the array-on-`Product` model (Finding 1). If a future engineering decision instead chooses a subcollection, that subcollection would need its own explicit rule block mirroring `/products/{productId}`'s existing shape — flagged for whichever future stage makes that call.

**Implementation impact:** None for the recommended array model; a new rule block only if the subcollection alternative is later chosen instead.

---

### Finding 4 — Candidate Detection: Normalization Approach Available, Not Committed

**Severity:** MINOR (Rule-8-resolvable)

**Evidence:** `apps/tenant/src/data/businessCategories.ts` line 171: an existing `normalize()` function, already flagged by `POL-0003` as existing-but-unevaluated for this exact purpose. `server/smartStockEntry.ts`'s `matchProductByExactName` doc comment explicitly anticipates, without building, a future fuzzy-matching tier.

**Technical assessment:** `POL-0007`'s Candidate Grounds are limited to normalization-level similarity only — this Rule 8 Assessment does not, and must not, broaden that into semantic/AI matching (explicitly out of both `POL-0007`'s and the Specification's scope). Adopting the existing `normalize()` function as a starting point is a reasonable, low-risk technical choice, consistent with reusing rather than duplicating existing capability — but `POL-0003` itself never asserted this function's suitability or validity for this purpose, and neither does this assessment; final validation belongs to implementation-time testing.

**Governance classification:** Rule 8-owned technical determination for *which* normalization mechanism to adopt as a starting point; the *boundary* (normalization-level only, never semantic) is already fixed by `POL-0007` and is not reopened here.

**Recommendation:** Adopt `normalize()` as the starting candidate-detection mechanism for both grounds POL-0007 authorizes (Initial Stock name similarity; existing alternative-name similarity), subject to implementation-time validation. Do not build any semantic-matching capability under this authorization.

**Implementation impact:** Reuse of an existing, already-tested function; no new algorithm design required at this stage.

---

### Finding 5 — Reuse Matching: Exact-Match Recommended, Not Normalized

**Severity:** MINOR (Rule-8-resolvable; Specification explicitly delegates this decision here)

**Evidence:** Specification §6: "explicitly left to Rule 8." `POL-0007`'s own Reuse section: same deferral. `BDR-0013` Decision 4's governing principle throughout the entire chain: never establish or act silently.

**Technical assessment:** Candidate-proposal (Finding 4) and reuse-matching (this finding) carry materially different risk profiles: a candidate proposal is always owner-reviewed before anything is established, so an imperfect normalization match there merely risks an unnecessary prompt — low cost. Reuse, by contrast, **silently** reattaches an incoming wording to a product without any owner review at all (`BDR-0013` item 3's own "automatically recognizes/reuses... without asking the owner to reconfirm"). A normalized reuse-match risks two distinct supplier wordings — genuinely different products the supplier happens to name similarly — silently colliding onto the same `Product`, which is exactly the silent-misattribution risk `BDR-0013` Decision 4/5 exist to prevent. Byte-exact matching (optionally trimmed of leading/trailing whitespace only, not full normalization) eliminates this collision risk entirely, at the cost of occasionally re-prompting the owner for a trivial wording variant — a materially safer failure mode than a silent, wrong reattachment.

**Governance classification:** Rule 8-owned technical determination, per the Specification's own explicit deferral. This is a technical conclusion serving the already-accepted "never silently establish" principle, not a new business decision.

**Recommendation:** Byte-exact matching (whitespace-trimmed) for reuse-matching specifically. This is deliberately more conservative than candidate-detection's own normalization-level similarity (Finding 4) — the two need not, and per this recommendation should not, use the same technical approach, exactly as the Specification's §6 already anticipated as a possibility.

**Implementation impact:** Simple string comparison; no additional algorithm needed beyond what candidate detection already requires.

---

### Finding 6 — Multiple Candidates: Existing Three-Option UI Pattern Is Directly Reusable

**Severity:** PASS

**Evidence:** `04-smart-stock-entry-amendment.md` 215–222 already specifies, for a structurally identical propose-never-silently-attach requirement: *"AI: 'I think this is [Product A]' → User: Confirm / Choose a different product / Create new — never AI → Product A → automatic attachment."*

**Technical assessment:** This existing, already-governance-specified pattern extends naturally to multiple candidates (present each with its own Confirm/Not-this-one affordance, plus a single "Create new" escape hatch) without inventing new UI behavior or a ranking scheme. A stable presentation order (e.g., by confirmation recency or alphabetical) does not, by itself, imply a "presumed winner" — `POL-0007`'s neutrality requirement concerns forced selection, not the mere existence of a display order.

**Governance classification:** Rule 8-owned technical determination (deterministic ordering does not touch business/Policy territory, since POL-0007 explicitly disclaims deciding ordering while permitting it to exist for display purposes).

**Recommendation:** Reuse the existing three-option interaction shape; use a simple, deterministic, non-implying ordering (e.g., alphabetical by `Product.name`) purely for stable rendering, not ranking by confidence/likelihood.

**Implementation impact:** UI composition reusing an established pattern; no new interaction paradigm.

---

### Finding 7 — Confirmation Discipline: Technically Guaranteeable

**Severity:** PASS

**Evidence:** `POL-0007`'s Confirmation Experience — Minimum Shape; `BDR-0013` item 3's full YES/NO framing; Decision 4's never-silent boundary.

**Technical assessment:** Every required guarantee (proposal-only until explicit confirmation; exactly two resolutions; no default action on non-response; trigger confined to supplier stock entry) maps to ordinary, already-demonstrated UI/state patterns in this codebase (e.g., the Smart Stock Entry review screen's own existing "nothing written until confirmation" discipline, confirmed by the UOM Specification's own citation of it). No technical obstacle prevents guaranteeing these boundaries.

**Governance classification:** Confirmed technically feasible; no open question.

**Recommendation:** No pending write of any kind occurs before the owner's explicit confirming action, mirroring the Recognition flow's own "proposal held in transient state" pattern the UOM Specification already established as proven in this codebase.

**Implementation impact:** Standard confirm-before-write UI/state discipline, no new pattern needed.

---

### Finding 8 — Owner-Initiated Declaration: Scoping Is Enforceable

**Severity:** PASS

**Evidence:** `POL-0007`'s Owner-Initiated Declaration — Scope and Boundaries section; Specification §3a; §0's terminology clarification.

**Technical assessment:** **Corrected this revision.** Owner-initiated declaration is meaningful only during **supplier stock entry** (Add Stock, Smart Stock Entry) — the workflow where a supplier's own wording is actually encountered. Initial Stock never involves a supplier wording at all (§0), so there is nothing for the owner to declare a relationship *about* during Initial Stock — the capability is not merely restricted from Initial Stock as a precaution, it has no applicable subject matter there. Because this capability is only ever reachable from within the Add Stock/Smart Stock Entry components' own code paths (never from Initial Stock's or Product Catalog Editing's own separate components), scope containment is a straightforward matter of which UI surface exposes the entry point. Confirmed identical downstream treatment to a system-proposed relationship (per Finding 1's storage model, no separate code path is needed post-creation).

**Governance classification:** Confirmed technically feasible.

**Recommendation:** Implement the entry point as component-local to the two supplier-stock-entry surfaces (Add Stock, Smart Stock Entry) only; do not factor it into Initial Stock's or Product Catalog Editing's own components.

**Implementation impact:** Standard component-scoping discipline.

---

### Finding 9 — Conflict Path: Distinguishing-Information Shape Correctly Left Open

**Severity:** PASS

**Evidence:** Specification §5: field/format/storage explicitly left to a later stage, deliberately not invented in the Specification.

**Technical assessment:** The *requirement* (mandatory, gates new-product creation) is fully specified and technically enforceable as an ordinary form-validation/creation-gate pattern — no different in kind from any other required-field validation already present throughout this codebase (e.g., minimum product configuration per `POL-0005`). The exact field shape is ordinary data-modeling judgment appropriately left to the Implementation Plan, not a matter requiring Product Architect or Specification-layer input — this is qualitatively the same class of decision as "what type is `Product.category`," not a new business rule.

**Governance classification:** Rule 8-resolvable as a *requirement enforcement pattern*; the *specific field shape* is ordinary implementation-time engineering judgment, not requiring further authorization at any governance layer.

**Recommendation:** Defer the specific field/format to the Implementation Plan; enforce only the gate (creation blocked until non-empty distinguishing information is provided) at this stage.

**Implementation impact:** A required-field validation pattern, consistent with existing product-creation validation elsewhere in this codebase.

---

### Finding 10 — Initial Stock's Role: Correctly Requires No Supplier Context **[CORRECTED THIS REVISION]**

**Severity:** PASS *(previously misclassified as MAJOR/blocker in the prior revision of this assessment — see correction note below)*

**Correction note:** The prior revision of this finding treated the absence of any supplier concept in `InitialStockCountView.tsx` as a gap requiring a UI change to Initial Stock (or a decision to defer Initial Stock's participation). This was based on a misreading of `BDR-0013` item 8's inclusion of Initial Stock, corrected by the Product Architect's explicit clarification recorded in §0, above: Initial Stock establishes a product's primary/reference identity (`Product.name`, per `BDR-0013` item 2); it does not, and was never intended to, capture supplier-specific wording. That happens later, during supplier stock entry (Add Stock, Smart Stock Entry). The evidence below is unchanged from the prior revision — only its interpretation is corrected.

**Evidence:** `InitialStockCountView.tsx`: zero supplier references (direct `grep` confirmation, re-verified this revision). `InitialStockDraftItem`/`CountRowItem` (`types.ts`): no supplier field of any kind. `AddStockView.tsx` (123 references) and `server/smartStockEntry.ts` (6 references) already carry substantial supplier context — these are the two "supplier stock entry" surfaces per §0. `BDR-0013` item 3's trigger text — "receiving/recording stock from a supplier and entering the supplier's receipt" — describes Add Stock/Smart Stock Entry, not Initial Stock, confirming the terminology distinction is already implicit in BDR-0013's own accepted text, not a new reading invented for this correction.

**Technical assessment:** The recognition mechanism (candidate detection, confirmation, reuse — Findings 1–9) needs to operate only where a supplier wording is actually encountered: Add Stock and Smart Stock Entry. A product's *origin* (whether first created via Initial Stock, Add Stock, or Smart Stock Entry) is irrelevant to whether it can later become the target of a confirmed supplier-wording relationship — what matters is only that the product exists and has a `Product.name` to serve as the reference identity (`BDR-0013` item 2), which Initial Stock already fully provides today, unchanged. A product created during Initial Stock is therefore already a fully eligible target for a supplier-wording relationship established later during Add Stock or Smart Stock Entry — no special wiring is needed to make this work, because the recognition mechanism (Findings 1–9) matches against `Product.name`/already-confirmed alternative wordings regardless of which surface originally created the `Product` document.

**What this correction does *not* change:** it does not add any capability to Initial Stock itself. Initial Stock remains exactly as it is today — a plain, freely-editable product-name/quantity/price entry screen, with zero supplier-related UI, zero new fields, zero new validation. `BDR-0013` item 8's inclusion of Initial Stock in this capability's surface scope is satisfied entirely by Initial Stock's existing, unchanged role as an identity-origin surface — not by anything new being built there.

**Flagged documentation inconsistency, not fixed by this assessment:** the accepted Specification's own §3 step 1 ("during Initial Stock, Add Stock, or Smart Stock Entry... when a supplier wording is entered or extracted") and §3a ("while within the Initial Stock, Add Stock, or Smart Stock Entry workflow specifically") both literally list Initial Stock as a surface where a supplier wording is entered or where owner-initiated declaration is available — this is inconsistent with the now-clarified business meaning and should be corrected via a future Specification amendment (Stage 2, per `platform-engineering-governance-standard.md` §2). **This Rule 8 Assessment does not edit the Specification** (out of scope for this stage, and explicitly instructed against); it instead interprets and applies the corrected, more authoritative business meaning directly, consistent with how a Product Architect clarification of an already-accepted BDR's meaning outranks imprecise downstream wording in an operationalizing document. Engineering, when eventually authorized, must build against the corrected meaning (Initial Stock = identity-origin only), not against the Specification's literal but imprecise §3/§3a text.

**Governance classification:** Fully Rule 8-resolvable. No Product Architect decision is required — the clarification itself was the decision, and it resolves cleanly to "no Initial Stock change needed" without requiring a choice between options.

**Recommendation:** Build candidate-detection, confirmation, and owner-initiated declaration exclusively into Add Stock and Smart Stock Entry. Initial Stock requires zero changes of any kind for this capability. Flag the Specification's §3/§3a wording for a future Stage 2 amendment to remove the ambiguity at its source, independent of and not blocking this capability's implementation.

**Implementation impact:** None for Initial Stock. Add Stock and Smart Stock Entry integration proceeds exactly as described in Finding 11, below.

---

### Finding 11 — Add Stock / Smart Stock Entry: Low Regression Risk, Clear Integration Points

**Severity:** PASS

**Evidence:** `AddStockView.tsx` line 136 (exact-match lookup, in-memory); `server/smartStockEntry.ts` 194–201 (`matchProductByExactName`, server-side, pure, already extensible per its own doc comment); `04-smart-stock-entry-amendment.md`'s existing draft/finalize discipline.

**Technical assessment:** Both surfaces already have an established, working exact-match lookup this capability's candidate-detection and reuse logic can sit alongside without replacing — the existing exact-match behavior is unaffected by design (§3 step 1 of the Specification: "a supplier wording is entered... that does not match an already-confirmed relationship" only fires the *new* flow; an ordinary exact `Product.name` match continues to behave exactly as it does today, unchanged). Regression risk is low because the new logic is additive, not a replacement of existing matching.

**Governance classification:** Confirmed technically feasible, low risk.

**Recommendation:** Integrate candidate-detection/reuse as an additional check alongside (not replacing) each surface's existing exact-match logic. For Smart Stock Entry specifically, the precise orchestration point (inline during OCR vs. only at review-screen load) remains an open implementation-sequencing question — explicitly already flagged as such by the Specification (§7) and not resolved further here, since it doesn't affect safety or correctness, only sequencing.

**Implementation impact:** Additive integration into two already-understood code paths.

---

### Finding 12 — Draft/Finalization Lifecycle: Existing Pattern Directly Supports the Accepted Boundary

**Severity:** PASS

**Evidence:** `saveInitialStockDraft` (`AppContext.tsx` 2564–2574): single-document, full-overwrite draft persistence, `setDoc` only on explicit save, `deleteDoc` on explicit discard. `04-smart-stock-entry-amendment.md`'s own "nothing written until confirmation" discipline (already cited and relied upon by the accepted UOM Specification).

**Technical assessment:** A pending/unconfirmed supplier-wording relationship can safely live inside the same draft document/component state that already holds the rest of an unconfirmed entry's data — no separate persistence mechanism is needed. Because the draft document is a full overwrite on each save and a full delete on discard, an abandoned draft cannot leave orphaned "half-established" relationship data — there is nothing to orphan, since nothing is written to `Product` until the entry's own existing finalization step. A finalization failure (network drop mid-write, etc.) cannot partially establish memory for the same reason: the `Product` mutation and the draft's clearing are not two independent steps racing each other in the current architecture pattern — finalization already writes the authoritative records and clears the draft as part of one flow (per the existing `recordStockCount`/equivalent finalization functions).

**Governance classification:** Confirmed technically feasible using an already-proven pattern; the accepted editable-before/immutable-after boundary is not weakened by this design.

**Recommendation:** Store any pending relationship as ordinary component/draft state, written to `Product` only as part of the entry's own existing finalization commit — no new lifecycle state introduced, consistent with the Specification's own §8.

**Implementation impact:** No new persistence mechanism; reuse of existing draft/finalize wiring.

---

### Finding 13 — Concurrency / Idempotency: Existing Transaction Pattern Is Directly Reusable, But Not Yet Applied to Products

**Severity:** MAJOR

**Evidence:** `AppContext.tsx` line 1684: `runTransaction` already protects a lock-document pattern against concurrent claims to a shared resource (open-batch numbering) — a proven, existing pattern for exactly this class of problem. By contrast, Product writes (creation, update) at lines 1597, 2283, 3038, 3323, 3346 use plain `setDoc`/`writeBatch`/`updateDoc` with **no transaction protection** — the existing exact-match "avoid duplicate products" check (AppContext.tsx:1572/1877) already runs against a client-side, in-memory snapshot before the write, which is inherently racy if two users act on stale snapshots simultaneously. This is a pre-existing architectural characteristic, not introduced by this capability — but this capability's own new race conditions (two users confirming the same candidate onto different products; two products racing to claim the same supplier wording) would inherit the identical underlying weakness unless explicitly addressed.

**Technical assessment:** Confirming a supplier-wording relationship, and resolving a conflict (Finding 9), are exactly the kind of "claim a shared resource" operation the existing lock-document + `runTransaction` pattern was built to protect. Without adapting that pattern here, two users could plausibly: (a) simultaneously confirm the same wording onto two different products, silently creating the exact "two products claim one wording" conflict state `BDR-0013` item 5 exists to prevent the system from causing on its own; or (b) create two nearly-simultaneous new products in response to the same unmatched wording, a duplicate-creation race this capability's own purpose is meant to reduce, not reproduce.

**Governance classification:** Rule 8-owned technical determination — this is squarely an implementation-safety question, not a new business decision; the *business* rule (no silent conflict, no silent duplicate) is already fixed by `BDR-0013`/`POL-0007`. Rule 8 must ensure the technical mechanism actually delivers that already-accepted guarantee under concurrent access, since the accepted Specification is silent on the mechanism (correctly — that's exactly what Rule 8 is for).

**Recommendation:** Wrap the "establish a supplier-wording relationship" write in a Firestore transaction, reading the current state of that `(supplierRecordId, wording)` pair immediately before writing, mirroring the existing open-batch lock pattern's own read-before-write discipline. This closes the race without inventing a new architectural pattern — it directly reuses one already proven in this codebase.

**Implementation impact:** A `runTransaction`-wrapped write for relationship establishment, following the existing lock-document precedent's shape.

---

### Finding 14 — Failure Modes: Consistent With "Never Silently Establish"

**Severity:** PASS

**Evidence:** Specification §10 (Failure Modes table); Finding 12's draft/finalize evidence; Finding 13's transaction recommendation.

**Technical assessment:** Every failure mode the Specification lists (candidate-detection unavailable, owner abandons mid-flow, missing distinguishing information, entry edited/deleted pre-confirmation, multiple matching products) resolves safely under the existing draft/finalize + (recommended) transaction pattern — none of them can result in a silently-created or silently-mutated relationship, because nothing is written to `Product` outside the transaction-protected confirmation/finalization step. Two failure modes the Specification's own table does not explicitly enumerate, surfaced here: **Product deleted before confirmation completes** — the existing atomic `deleteProductPlan.ts` cascade would need no change under the recommended array model (Finding 1), since a deleted `Product` document simply no longer exists for the pending write to target, and the write would fail cleanly (transaction read would find no target document). **`SupplierRecord` deleted/changed concurrently** — since `SupplierRecord` deletion is a separate existing operation this capability doesn't currently intercept, a relationship referencing a since-deleted `SupplierRecord.id` would become an orphaned reference; this is analogous to `PurchaseBatch.supplierId`'s own existing optional-reference pattern (already tolerant of a stale/absent reference by design) and is not a new class of risk this capability introduces.

**Governance classification:** Confirmed technically resolvable with the recommendations already given in Findings 1, 12, 13.

**Recommendation:** No additional mechanism beyond what Findings 1/12/13 already establish; the two additional failure modes identified above should be included in the Implementation Plan's test boundary (Finding 20).

**Implementation impact:** Covered by prior findings; no independent new work.

---

### Finding 15 — Performance / Indexing / Scale: No Unacceptable Risk Identified

**Severity:** MINOR

**Evidence:** `AddStockView.tsx`'s existing exact-match pattern already operates against an in-memory, fully-loaded `products` array for the whole business (confirmed architecture, not assumed) — this capability's candidate-detection would extend that same already-loaded in-memory set, not introduce a new Firestore query pattern. `firestore.indexes.json` has no index for `products`/`suppliers` today, consistent with this in-memory-only pattern. Firestore's 1 MiB document limit (Finding 1) provides substantial headroom for a realistic count of alternative-name relationships per product.

**Technical assessment:** Since candidate detection operates on data already loaded into memory for the existing exact-match check, this capability adds computational cost (string comparisons across an already-in-memory list) but no new network/read cost, and no new Firestore index. For a small/medium retail business's realistic catalog size (the platform's evidenced target market, per this repository's own business-domain framing throughout), this is not expected to create a meaningful performance risk. A business with an unusually large catalog (many thousands of products) could see linear-scan cost grow — the same scaling characteristic the existing exact-match check already has today, not a new one this capability introduces.

**Governance classification:** Rule 8-owned technical assessment; no index creation is authorized or performed by this document (per the task's explicit instruction).

**Recommendation:** No index needed at this stage. If a future business's catalog size makes the existing in-memory linear-scan pattern (already present today, for the pre-existing exact-match check) a genuine problem, that is a pre-existing architectural characteristic to address holistically, not specific to this capability.

**Implementation impact:** None beyond ordinary code review for computational cost at implementation time.

---

### Finding 16 — Historical Duplicates / Item 9: Correctly Excluded, No Leakage Found

**Severity:** PASS

**Evidence:** Specification §12; this assessment's own scope statement.

**Technical assessment:** No finding in this assessment proposes, implies, or requires any migration, backfill, historical reinterpretation, automatic merge/rename, or catalog-wide duplicate scanning. Every recommendation above operates strictly on new, forward-looking, owner-confirmed relationships.

**Governance classification:** Confirmed clean; no boundary violation.

**Recommendation:** None needed; flagged here only to explicitly confirm the absence of leakage, per the task's own instruction.

**Implementation impact:** None.

---

### Finding 17 — Migration / Existing Data: Not Required, Not Proposed

**Severity:** PASS

**Evidence:** Every finding above concerns only newly-established relationships going forward; no finding touches any existing `Product`, `StockBatch`, or `PurchaseBatch` record.

**Technical assessment:** Implementation can begin with new confirmed relationships only — no existing data needs to be read, interpreted, or transformed for this capability to function as specified.

**Governance classification:** Confirmed; no blocker.

**Recommendation:** None needed.

**Implementation impact:** None.

---

### Finding 18 — API / Server / Client Boundaries: Existing Split Is Sufficient

**Severity:** PASS

**Evidence:** `matchProductByExactName` (server-side, pure function, already reusable); `AddStockView.tsx`'s client-side exact-match (client-side, in-memory).

**Technical assessment:** The existing architecture already splits matching logic between client (Add Stock) and server (Smart Stock Entry, since OCR extraction is itself server-mediated) — the two supplier-stock-entry surfaces per §0's clarification. Initial Stock requires no matching logic of any kind (Finding 10). This capability's candidate-detection and reuse-matching logic can follow the same existing client/server split — implemented as a pure, shared function (mirroring `matchProductByExactName`'s own existing shape) callable from both contexts, rather than a new architectural layer.

**Governance classification:** Confirmed technically feasible using existing architecture; no new layer required.

**Recommendation:** A shared, pure matching function, callable identically from client and server contexts, following `matchProductByExactName`'s existing precedent.

**Implementation impact:** New pure function(s), reusing the existing client/server split rather than introducing a new one.

---

### Finding 19 — Observability / Auditability: Minimal, Correctness-Driven Metadata Only

**Severity:** MINOR

**Evidence:** Specification §2's Provenance discussion (conceptual, not committed); `BDR-0013` item 3's "one confirmation is sufficient" claim, which implies *some* record of when/that confirmation occurred, for correctness (distinguishing "never confirmed" from "confirmed").

**Technical assessment:** A confirmation timestamp is required for correctness (§6's reuse logic needs to know a relationship exists and was actually confirmed, not merely proposed). Provenance (system-proposed vs. owner-initiated) is technically useful for future debugging/support but not required for correctness or security — `POL-0007` itself states both are governed identically. Actor identity (which staff member confirmed) is technically useful, matching this codebase's general pattern of `createdByName`-style display fields elsewhere, but is not required by any accepted business rule for this specific capability.

**Governance classification:** Rule 8-owned technical assessment, correctly distinguishing required-for-correctness from merely-useful, per the task's own instruction not to invent new business requirements.

**Recommendation:** Persist a confirmation timestamp (required). Persisting provenance and/or actor identity is optional, low-cost, and left to the Implementation Plan's own judgment — not required by this assessment.

**Implementation impact:** One required timestamp field; optional additional fields at implementation-time discretion.

---

### Finding 20 — Regression / Testability: Full Coverage Boundary Is Achievable

**Severity:** PASS

**Evidence:** `tests/open-batch-concurrency.test.ts`, `tests/initial-stock-confirmation.test.ts`, `tests/delete-product-plan.test.ts`, `tests/smart-stock-entry.test.ts` — this codebase already has direct precedent for testing every category of behavior this capability requires (concurrency, confirmation flows, deletion-plan atomicity, Smart Stock Entry matching).

**Technical assessment:** Every scenario in the task's required test boundary (first encounter, candidate proposal, confirmation, NO/new-product path, repeated wording, multiple candidates, conflict + distinguishing information, owner-initiated declaration, all three surfaces, draft abandonment, finalization, concurrent confirmation, cross-tenant isolation, failure/retry) maps to an existing testing pattern already proven in this codebase for structurally similar behavior. No new testing infrastructure is required.

**Governance classification:** Confirmed technically feasible; no blocker. Tests are not written or modified by this assessment, per instruction.

**Recommendation:** The Implementation Plan should enumerate these scenarios explicitly against the concrete functions/components chosen, following the existing test-file naming and structure conventions.

**Implementation impact:** Test authorship deferred entirely to the implementation stage.

---

## 5. Governance Boundary Violation Scan

Explicitly re-checked every finding above against the four "must not" categories:

- **Invented new business requirement:** None found. Finding 10's original (pre-correction) recommendation risked implying a new Initial Stock field; the correction removed that risk entirely — no finding in this revision proposes any user-facing change beyond backend mechanics.
- **Silently changed the Specification:** None. Every recommendation operates strictly within territory the Specification itself already delegated to Rule 8 (Findings 1, 4, 5, 6, 9, 13, 15, 18, 19) or confirms pre-existing feasibility without altering any accepted text (Findings 2, 3, 7, 8, 11, 12, 14, 16, 17, 20).
- **Treated a technical recommendation as an accepted decision:** None — every "Recommendation" is explicitly labeled as such. Finding 10, following this revision's correction, no longer requires a Product Architect decision — the clarification itself resolved it.
- **Reopened an accepted business decision:** None. `BDR-0013`, `POL-0007`, and the Specification are unmodified by this assessment.

---

## 6. Summary Table

| # | Finding | Severity | Governance layer |
|---|---|---|---|
| 1 | Storage: array-on-Product | MINOR | Rule 8 (resolved) |
| 2 | Supplier identity: `SupplierRecord.id` | PASS | Confirmed fact |
| 3 | Tenant isolation | PASS | Confirmed fact |
| 4 | Candidate-detection normalization | MINOR | Rule 8 (resolved) |
| 5 | Reuse-matching: exact-match | MINOR | Rule 8 (resolved) |
| 6 | Multiple candidates: existing UI pattern | PASS | Rule 8 (resolved) |
| 7 | Confirmation discipline | PASS | Confirmed feasible |
| 8 | Owner-initiated declaration scoping | PASS | Confirmed feasible |
| 9 | Conflict path / distinguishing info gate | PASS | Rule 8 (resolved) |
| **10** | **Initial Stock's role — corrected this revision** | **PASS** | **Clarification resolved it; no PA decision needed** |
| 11 | Add Stock / Smart Stock Entry integration | PASS | Confirmed feasible |
| 12 | Draft/finalization lifecycle | PASS | Confirmed feasible |
| 13 | Concurrency/idempotency | MAJOR | Rule 8 (resolved — transaction pattern) |
| 14 | Failure modes | PASS | Confirmed resolvable |
| 15 | Performance/indexing/scale | MINOR | Rule 8 (resolved) |
| 16 | Item 9 leakage check | PASS | Confirmed clean |
| 17 | Migration/existing data | PASS | Not required |
| 18 | API/server/client boundaries | PASS | Confirmed feasible |
| 19 | Observability/auditability | MINOR | Rule 8 (resolved) |
| 20 | Regression/testability | PASS | Confirmed feasible |

---

# Rule 8 Verdict

## READY

The architecture is feasible. Every finding is resolvable within Rule 8's own authority, using evidence-grounded technical recommendations that reuse this codebase's own existing, proven patterns (transaction-protected concurrency, draft/finalize lifecycle, exact-match extension points, array-on-Product precedent). **Finding 10, the sole item previously requiring Product Architect input, is resolved by the terminology clarification recorded in §0** — Initial Stock requires no technical change of any kind; the recognition mechanism operates entirely within Add Stock and Smart Stock Entry, matching against `Product.name`/already-confirmed alternative wordings regardless of a product's origin surface.

**One item is flagged for future governance housekeeping, not blocking:** the accepted Specification's own §3 step 1 and §3a wording literally lists Initial Stock as a surface where supplier wording is entered — inconsistent with the now-clarified meaning. This does not block Implementation Authorization; it is recorded here as a candidate for a future Stage 2 Specification amendment (per `platform-engineering-governance-standard.md` §2), separate from and not gating this capability's implementation.

No unresolved technical or governance blocker remains. The accepted Specification is safe to proceed to the separate Implementation Authorization gate.

---

## Final Governance Boundary Statement

- Rule 8 Assessment completed.
- The Specification is technically ready.
- No application code changed.
- No Firestore rules changed.
- No indexes changed.
- No tests changed.
- No UI changed.
- No Implementation Authorization created.
- No engineering authorized.
- No business/policy decision silently changed — `BDR-0013`, `POL-0007`, and the accepted Specification remain exactly as they were before this assessment.

**Stopping here, per instruction.** This Rule 8 Assessment is now unconditionally "Assessed" (READY). Per `platform-engineering-governance-standard.md` §3, reaching "Assessed" is a readiness opinion, not a go-ahead — Implementation Authorization remains a separate, required, explicit Product Architect gate, not begun or implied by this assessment.
