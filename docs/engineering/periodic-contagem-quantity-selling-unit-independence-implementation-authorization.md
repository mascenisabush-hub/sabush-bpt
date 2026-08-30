Implementation Authorization

# Periodic Contagem — Quantity-Unit / Selling-Unit Independence
# (FR-89–FR-94) — Implementation Authorization

**Status: ✅ AUTHORIZED. ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**
**See "Product Architect Acceptance," §8, below, for the signed
decision. This signature authorizes implementation of exactly the scope
recorded in this document — §1–§4, below — sourced strictly from the
already-signed Specification amendment, the already-signed Rule 8
Assessment, and the already-accepted Implementation Plan.**

**Governing chain:**
[`docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md`](../specs/periodic-contagem-quantity-selling-unit-independence-amendment.md)
(proposed §46, FR-89–FR-94, ✅ **ACCEPTED AND SIGNED**, SABUSHIMIKE
MASCENI, 30 August 2026) →
[`docs/engineering/periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md`](./periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md)
(✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT**, SABUSHIMIKE
MASCENI, 30 August 2026; verdict READY AFTER IMPLEMENTATION PLAN) →
[`docs/engineering/periodic-contagem-quantity-selling-unit-independence-implementation-plan.md`](./periodic-contagem-quantity-selling-unit-independence-implementation-plan.md)
(✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT**, SABUSHIMIKE
MASCENI, 30 August 2026) → **this Authorization** (✅ **AUTHORIZED,
SABUSHIMIKE MASCENI, 30 August 2026**) → implementation (not yet
started — a separate, subsequent execution step; see §7).

**This document introduces no new scope, no new business decision, and
no technical detail not already specified by the accepted Implementation
Plan.** Its sole purpose is to record the Product Architect's formal
decision to authorize engineering work, populated strictly from the
three already-signed/accepted documents above.

---

## 0. Pre-Drafting Verification Performed

- `git status`: working tree clean, `nothing to commit`.
- `git log -1`: `HEAD = 1ece05860e1dcace1709583d15d9744f105a7f6e` (`main`
  = `origin/main`), the commit that carries the signed Implementation
  Plan, pushed in the immediately preceding governance step.
- **Signed FR-89–FR-94 amendment** — re-read in full. Status
  `✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT`; §20 signature block
  `SABUSHIMIKE MASCENI`, `Date: 30 August 2026`. MD5
  `6f66f6e36fab51d3cc2c3d263553c6e9`.
- **Signed Rule 8 Assessment** — re-read in full. Status
  `✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT`; verdict `READY AFTER
  IMPLEMENTATION PLAN`; "Product Architect Signature" section
  `SABUSHIMIKE MASCENI`, `Date: 30 August 2026`. MD5
  `3b0c1c7a294ae13a50dc84d09c113bb5`.
- **Signed Implementation Plan** — re-read in full, including both
  rounds of audit correction (`sellingPriceBasisUnit: row.unit` fix;
  corrected two-direction Test D; Tests Y/Z/AA; the unresolvable-unit
  clarification in §6.1 item 3; the explicit decision against a
  persisted `sellingConfigurationSource` field in §5.3). Status
  `✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT`; "Product Architect
  Signature" section `SABUSHIMIKE MASCENI`, `Date: 30 August 2026`. MD5
  `59c4be45c96de63010ae0ccdb2863548`.
- **Consistency check across all three documents:** confirmed no
  contradiction. The Specification (FR-89–FR-94, FR-90/FR-91/FR-93/FR-94)
  is carried forward unchanged by the Rule 8 Assessment's Appendix A
  terminology and Findings 1–10; the Rule 8 Assessment's Findings are
  carried forward unchanged by the Implementation Plan's §5–§13
  mechanism design; the Implementation Plan's own two audit-correction
  rounds changed only its own §5.3/§6.1/§14 content, never the
  Specification or the Rule 8 Assessment (both confirmed byte-identical
  to their pre-Plan-drafting state at every prior governance step, and
  reconfirmed unchanged again here).
- **Scope confirmation:** the Implementation Plan's own header records
  itself as the accepted, signed document — this is the same, single
  file at MD5 `59c4be45c96de63010ae0ccdb2863548`; there is no earlier
  draft of this Plan under any other name in the repository, and no
  other Implementation Plan file exists for FR-89–FR-94 (confirmed by
  repository search, this session). **The accepted Implementation Plan,
  in full and in its current, corrected, signed form, is the sole
  implementation scope this Authorization covers.**

---

## 1. What This Authorization Covers

**One capability, stated once:** implement FR-89–FR-94 exactly as
specified by the signed Specification amendment, exactly as resolved by
the signed Rule 8 Assessment, and exactly as designed by the signed
Implementation Plan — no more, no less.

### The three-concept model (Rule 8 Assessment Appendix A; Implementation Plan §4)

- **Physical quantity entry** — a quantity + the physical unit it was
  counted in, recorded exactly as the Owner counted it. Never
  automatically implies a selling configuration of any kind.
- **Product-level (product) selling configuration** — the
  remembered/default `Product.sellingPrice` + `unitRelationship.sellingUnit`.
  Automatically supplied wherever a physical quantity entry has not been
  given its own independent configuration. Never a constraint.
- **Deliberate selling portion** — created only when the Owner directly,
  explicitly gives part of the stock its own selling price/unit, distinct
  from the product-level default. Remains denominated in the Owner's own
  chosen unit, never reinterpreted into another.

### Authorized behavior (Implementation Plan §3–§13, in full)

1. **Multiple simultaneous physical-unit entries for one product**
   (Implementation Plan §7; Rule 8 Finding 8) — e.g. `3 Cx + 3 Emb + 5
   Un` for the same product, via one catalog row plus manual rows added
   through "+ Adicionar Porção," each recorded and preserved exactly as
   counted, never merged, never forced into a common unit.
2. **No automatic interpretation of a different physical unit as a
   deliberate selling portion** (Implementation Plan §6.1's
   deliberate-entry detection, §4) — the *only* thing that marks a row
   as deliberate is a direct Owner edit to `sellingPrice`, or a `unit`
   edit on a row already deliberate; a physical-unit-only change on an
   otherwise-untouched row never sets `sellingPriceAutoFilled: false`.
3. **Automatic default selling-configuration resolution, no Mode A
   required** (FR-89; Implementation Plan §6.1, §9) — a physical
   quantity entry whose unit differs from the confirmed selling unit
   automatically values against the product's remembered
   selling configuration via `deriveModeAPortionValuations` (reused,
   unmodified), without the Owner activating Mode A.
4. **Deliberate selling portions retain their own independently chosen
   selling price and selling unit** (FR-90–FR-92; Implementation Plan
   §6.1, §12) — e.g. `5 Cx @ 480 MZN/Cx` (deliberate) + `7 Cx @ 50
   MZN/Un` (default) = **`5 × 480 + 7 × 24 × 50 = 2,400 + 8,400 = 10,800
   MZN`**, with `480 MZN/Cx` never reinterpreted or relabeled as `480
   MZN/Un`.
5. **The `sellingPriceBasisUnit: row.unit` correction** (Implementation
   Plan §6.1, audit Finding 1) — `resolveDefaultSellingConfigurationForRow`
   must label an auto-derived price with the unit it is actually
   denominated in (the portion's own physical unit, per
   `deriveModeAPortionValuations`' own documented contract), never the
   product's reference selling unit.
6. **The unresolvable-unit edge case** (Implementation Plan §6.1 item 3,
   final acceptance-audit clarification) — when an auto-filled row's
   physical unit is changed to one outside the product's confirmed
   relationship, `sellingPrice` clears to blank and
   `sellingPriceAutoFilled` remains `true`; no price is fabricated, and
   the mere unit edit never implies deliberateness.
7. **"Last deliberately entered" memory rule** (confirmed Product
   Architect decision; Implementation Plan §6.2–§6.3) — when a Contagem
   contains more than one deliberate selling configuration for the same
   product, the configuration with the highest in-session
   `sellingPriceEditSequence` among rows with `sellingPriceAutoFilled ===
   false` becomes the new product-level remembered/default selling
   configuration, determined without reference to array order, row
   order, Map iteration order, or the pre-existing confirmed-selling-
   unit-match preference (which is removed from this tie-break
   entirely). Verified correct in both entry orders (Implementation Plan
   §14 Test D).
8. **Remembered configuration flows into Add Stock as the default, fully
   overridable** (Implementation Plan §8) — **explicitly verified as
   requiring NO IMPLEMENTATION CHANGE.** Add Stock's existing
   `findLatestRememberedProductMemory`/`resolveUnitAwarePrice` mechanism,
   and its existing `sellingPriceAutoFilled`/`sellingPriceBasisUnit`
   override tracking, already correctly serve this requirement end to
   end. No file under `AddStockView.tsx` or
   `productMemoryPriceResolution.ts` is touched by this Authorization.
9. **Initial Stock isolation** (Implementation Plan §13) — every write
   this Authorization covers is gated `type !== 'initial'`, mirroring
   §45's own existing guard exactly; Initial Stock's own deliberately
   cost-basis-only valuation is untouched.
10. **FR-67/§42 cost-side isolation** (Implementation Plan §13) — zero
    reads or writes of `fr67CostBasisConversion.ts` or any cost-basis
    conversion logic anywhere in the authorized scope.

---

## 2. Exact Authorized Changes (restated from Implementation Plan §5–§10,
## §16 — not modified, only enumerated here for authorization clarity)

1. **`StockCountWorkingRow`** (`apps/tenant/src/utils/stockCount.ts`) —
   add three optional, working-row-only fields: `sellingPriceAutoFilled?:
   boolean`, `sellingPriceBasisUnit?: string`,
   `sellingPriceEditSequence?: number` (Plan §5.1).
2. **`workingRowToDraftItem`/`draftItemToWorkingRow`** (same file) —
   extend the existing Firestore-safe-optional-field round-trip to carry
   the three new fields (Plan §5.2). No `firestore.rules`/
   `firestore.indexes.json` change.
3. **`contagemMultiUnitValuation.ts`** — add
   `resolveDefaultSellingConfigurationForRow`, a new pure function
   wrapping the existing, unmodified `deriveModeAPortionValuations` (Plan
   §6.1, with the corrected `sellingPriceBasisUnit: row.unit` return
   value).
4. **`PeriodicStockCountView.tsx`** — `buildCatalogRow` (add marker
   fields to its existing, unmodified resolution), `createManualRow`
   (extend default resolution for an existing product's additional
   physical-quantity rows, Plan §7), `updateCatalogRow`/`updateManualRow`
   (add deliberate-entry detection and re-resolution-on-unit-change, Plan
   §6.1 item 3, §6.2), a new per-session `useRef<number>` edit-sequence
   counter with resume re-seeding (Plan §6.2), and `handleModeAToggle`'s
   integration point (setting `sellingPriceAutoFilled: false` for
   Mode-A-affected rows, Plan §9).
5. **`AppContext.tsx`, `recordStockCount()`** — revise
   `sellingMemoryByProductName`'s construction to select by highest
   `sellingPriceEditSequence` among deliberate candidates, fed by a new,
   optional, **un-persisted** parameter (`workingRowDeliberateEntries`),
   mirroring the existing `costBasisByProductName` threading pattern
   (Plan §6.3, §10). Both existing write sites (new-product creation
   branch; existing-product post-loop update) remain unmodified — only
   what feeds the Map they read changes.
6. **No change** to `normalizeStockCountItems`, `tallyStockCountRows`,
   `deriveModeAPortionValuations`, `canApplyModeA`,
   `sumModeAPortionValuations`, `getConversionFactor`,
   `resolveUnitAwarePrice`, `findLatestRememberedProductMemory`, any
   `AddStockView.tsx` code, any `fr67CostBasisConversion.ts` code, the
   Business Worth calculation chain, `Product`'s schema, or
   `StockCountItem`/`StockCount.items`' persisted schema.

**Implementation sequence, restated from Plan §16 (informational —
engineering may sequence within this bound, not authorized to reorder
the sequencing constraint itself where one is stated, e.g. Mode A's
integration point depending on the deliberate-entry marker existing
first):**
1. Working-row schema + draft round-trip.
2. `resolveDefaultSellingConfigurationForRow` + `buildCatalogRow`/
   `createManualRow` wiring.
3. `updateCatalogRow`/`updateManualRow` deliberate-detection +
   re-resolution + edit-sequence counter.
4. `sellingMemoryByProductName` revision + `recordStockCount` new
   parameter.
5. Mode A integration point.
6. Full test suite (§3, below) + regression pass.

---

## 3. Test / Acceptance Scope (restated from Implementation Plan §14,
## §17, in full — the complete, sole test scope this Authorization covers)

**Every scenario A–AA in the Implementation Plan's §14 table must
pass**, including — restated here for visibility, not as new content —
the corrected Test D (two genuinely-deliberate configurations, both
directions: `480/Cx → 50/Un` ⇒ memory becomes `50/Un`; `50/Un → 480/Cx`
⇒ memory becomes `480/Cx`) and the three audit-added tests: Test Y
(`3 Cx + 3 Emb + 5 Un`, none deliberate, → `4,750 MZN`, no merging), Test
Z (cross-product edit-sequence isolation), and Test AA (draft-resume
edit-sequence continuity).

**Acceptance criteria, restated verbatim from Plan §17:**
- Every scenario in §14's table passes.
- Every existing regression test listed in §14 passes unmodified.
- No change to `StockCount.items`' persisted schema (verified by schema
  diff at implementation time).
- No change to `firestore.rules`/`firestore.indexes.json`.
- No change to any Business Worth calculation.
- No change to Add Stock code.
- No change to FR-67/§42 cost-basis code.
- No change to Initial Stock's own valuation behavior.
- Mode A's own existing UI/toggle unchanged in behavior for its original
  explicit-choice purpose.

**Existing regression suite (restated from Plan §14):**
`contagem-multi-unit-valuation.test.ts`,
`periodic-stock-mode-a-integration.test.ts`,
`periodic-stock-multi-portion-valuation.test.ts`,
`periodic-stock-add-portion.test.ts`,
`decision-37-first-contagem-cost-removal-and-selling-price-memory.test.ts`,
plus the full FR-78–FR-88 (§45) regression suite — all must pass with
unmodified expectations.

---

## 4. Explicit Exclusions / Non-Goals (restated verbatim from
## Implementation Plan §18, itself restated from FR-89–FR-94 §19 and the
## Rule 8 Assessment §10)

No change to Add Stock/Smart Stock Entry; no change to the Business
Worth formula; no change to Initial Stock; no redesign of the Product
Catalog's field set or ownership; no new schema on `StockCount.items`;
no new competing Product Memory mechanism; no timestamp-based ordering;
no second Business Worth calculation.

**Additionally, restated from the Implementation Plan's own §5.3 and
§13:**
- No persisted `sellingConfigurationSource`-style field on
  `StockCountItem` — explicitly considered and declined by the Product
  Architect; the working-row-only distinction is sufficient (Plan §5.3).
- No change to `Product.sellingPrice`'s scalar shape or
  `Product.unitRelationship`'s existing structure (Plan §5.4).
- No reopening, amendment, or reinterpretation of FR-78–FR-88 (§45)'s
  own signed text, Rule 8 Assessment, Implementation Plan, or
  Implementation Authorization. Only `sellingMemoryByProductName`'s own
  tie-break *implementation* (never itself signed FR text, per Rule 8
  Assessment Finding 7/§11, Product-Architect-confirmed) is revised.

---

## 5. Risk Acknowledgment

- The working-row/draft schema addition (§2 item 1–2, above) is
  additive and optional on every new field — a rollback requires no
  destructive migration of existing `PeriodicStockDraft` data, consistent
  with this codebase's established backward-compatibility pattern for
  every prior amendment in this lineage (Implementation Plan §5.2's own
  "absent means today's old behavior" discipline for every new field).
- The `sellingMemoryByProductName` tie-break revision (§2 item 5, above)
  changes which of several already-existing candidates wins the
  memory-write decision when more than one deliberate portion exists for
  one product in one Contagem — a behavior change acknowledged and
  explicitly authorized by the Product Architect's confirmed decision
  (Rule 8 Assessment §12), not a reopening of §45's own signed rule that
  a deliberate change becomes the remembered configuration.
- No other risk beyond what the Implementation Plan's own §5–§13 already
  documents is introduced by this Authorization.

---

## 6. Rollback / Reversibility

Every field this Authorization introduces is additive and optional
(`StockCountWorkingRow.sellingPriceAutoFilled?`,
`.sellingPriceBasisUnit?`, `.sellingPriceEditSequence?`) — consistent
with this codebase's established backward-compatibility pattern for
every prior amendment in this lineage (restates Implementation Plan
§5.1–§5.2). No destructive schema change, no `firestore.rules`/
`firestore.indexes.json` change, no irreversible data migration is
authorized or required.

---

## 7. Governance State (restated)

- FR-89–FR-94 Specification Amendment = **accepted, signed**.
- Rule 8 Assessment = **accepted, signed**, verdict READY AFTER
  IMPLEMENTATION PLAN.
- Implementation Plan = **accepted, signed**.
- **This Implementation Authorization = ✅ AUTHORIZED, ACCEPTED AND
  SIGNED — see §8, below.**
- Implementation = **authorized to begin, per the scope in §1–§4, above.
  Not yet started — a separate, subsequent execution step, distinct
  from this signature.**

---

## 8. Product Architect Acceptance

**Status:** ✅ **AUTHORIZED. ACCEPTED AND SIGNED.**

> I have reviewed this Implementation Authorization and confirm it
> covers exactly the scope already established and signed across the
> FR-89–FR-94 Specification Amendment, the FR-89–FR-94 Rule 8
> Assessment, and the FR-89–FR-94 Implementation Plan — including:
> physical quantity entries remaining independent and unmerged (`3 Cx +
> 3 Emb + 5 Un` for one product); a different physical quantity unit
> never automatically creating a deliberate selling portion; the
> remembered selling configuration remaining only a default, never a
> constraint; normal mixed-unit valuation requiring no Mode A;
> deliberate selling portions retaining their own independently chosen
> selling price and selling unit (`5 Cx @ 480 MZN/Cx + 7 Cx @ 50
> MZN/Un = 10,800 MZN`, with `480 MZN/Cx` never reinterpreted as `480
> MZN/Un`); the last deliberately entered configuration becoming the
> future product-level remembered default; that remembered
> configuration flowing into Add Stock as its default through the
> existing shared memory mechanism, with the Owner always free to
> change it; the corrected `sellingPriceBasisUnit: row.unit` behavior;
> the unresolvable-unit edge case leaving an auto-filled row
> non-deliberate with no fabricated price; Initial Stock and FR-67/cost
> isolation; and the explicit decision against a persisted
> `sellingConfigurationSource` field. I authorize implementation of
> exactly this scope.

**Decision:** I APPROVE AND SIGN THE IMPLEMENTATION AUTHORIZATION

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 30 August 2026

This signature authorizes implementation to begin, strictly bounded to
the scope recorded in §1–§4, above. It does not itself constitute the
start of implementation work — that remains a separate, subsequent
execution step.

---

**This document, as signed, authorizes implementation strictly per the
scope in §1–§4, above. No code, test, `firestore.rules`, or
`firestore.indexes.json` change has been made in the course of producing
or signing this Authorization. A separate implementation execution step
is required to actually begin work.**

---

## 9. Post-Implementation Record — Selling-Memory Selection Extraction
## (Accepted)

**Status: ✅ ACCEPTED BY THE PRODUCT ARCHITECT, SABUSHIMIKE MASCENI, 30
August 2026.**

Appended per this repository's own established pattern for recording a
Product Architect decision against an already-signed Implementation
Authorization without rewriting its original, signed content — one
umbrella Authorization, extended, not replaced (see, for precedent,
`business-worth-evolution-implementation-authorization.md`'s own §16,
§24–§25, and §41, which append dated Post-Implementation Correction and
Execution Record sections in exactly this way). §1–§8, above, remain
byte-for-byte as originally signed; nothing in them is altered by this
section.

**Background.** During implementation of the scope authorized in §1–§4,
above, the "last deliberately entered wins" selling-memory tie-break
(§1 item 7; §2 item 5) was extracted from `AppContext.tsx`'s
`recordStockCount()` into a new, separate, pure function,
`selectSellingMemoryByProductName`, in a new file,
`apps/tenant/src/lib/sellingMemorySelection.ts` — rather than remaining
inline in `AppContext.tsx` as §2 item 5's own literal text describes.
This was disclosed to the Product Architect at the time, in full, before
any request to accept it.

**Product Architect decision, recorded verbatim:**

> Product Architect accepts the extraction of the selling-memory
> selection/tie-break logic from AppContext.tsx into
> sellingMemorySelection.ts as an internal, behavior-preserving
> refactoring within the authorized FR-89–FR-94 implementation scope.
> The extraction introduces no new business behavior, persistence
> behavior, data-model change, Firestore read/write, tenant-isolation
> boundary, or product-scope expansion. Its purpose is to make the
> authorized "last deliberately entered configuration wins" behavior
> directly testable as a pure function. The existing repository pattern
> of extracting critical pure logic into independently testable modules
> supports this approach.

**Explicitly also recorded, per the Product Architect's own instruction:**

- This extraction does **NOT** reopen or amend the signed Specification
  (`docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md`).
- It does **NOT** reopen or amend the signed Rule 8 Assessment
  (`docs/engineering/periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md`).
- It does **NOT** change the authorized business behavior.
- It does **NOT** constitute a product redesign.
- It does **NOT** authorize any additional functionality outside
  FR-89–FR-94.
- The pre-existing failing test identified during implementation
  (`tests/periodic-stock-multi-portion-valuation.test.ts` — confirmed,
  via `git stash` against the untouched pre-implementation baseline, to
  already fail identically before any FR-89–FR-94 work began) remains
  **outside this implementation's scope** and **must NOT** be changed
  merely to make the suite appear fully green.

**Governance boundary, restated:** the signed Specification amendment,
the signed Rule 8 Assessment, and §1–§8 of this Implementation
Authorization (above) are unmodified by this section — confirmed by
checksum immediately before and after this section was added. This §9
is the sole content added by this acceptance.

---

## 10. Addendum — Authorization to Extend `StockCountItem`'s Persisted
## Schema (Option C)

**Status: ✅ AUTHORIZED. ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT,
SABUSHIMIKE MASCENI, 30 August 2026.**

Appended per this repository's own established pattern for recording a
Product Architect decision against an already-signed Implementation
Authorization without rewriting its original, signed content — the same
pattern §9, above, already established. §1–§9, above, remain
byte-for-byte as originally signed; nothing in them is altered by this
section.

**Background.** Rule 8 Assessment §15 addendum and Implementation Plan
§20 addendum (this same governance chain) together specify a narrow,
additive extension to `StockCountItem`'s persisted schema — a
`sellingPriceBasisUnit?: string` field, mirroring `valuationMode`'s own
already-established, display/audit-only pattern — to correctly preserve
the historical denomination of a deliberately-priced portion's selling
price, for two already-shipped consumers (`ProductDetailModal.tsx`,
`findLatestRememberedProductMemory`) that were never designed for the
possibility of that denomination diverging from the row's own physical
unit.

**Extends §2's "Exact Authorized Changes" to additionally authorize:**

7. **`StockCountItem`** (`types.ts`) — add
   `sellingPriceBasisUnit?: string`, display/audit-only, mirroring
   `valuationMode`'s own established pattern exactly. **This is the
   one, narrow exception to §2's own prior statement that no change to
   `StockCount.items`' persisted schema was authorized** — that
   statement is superseded only to this exact extent, per Rule 8
   Assessment §15 addendum and Implementation Plan §20 addendum, both
   referenced above.
8. **`normalizeStockCountItems`/`tallyStockCountRows`** (`stockCount.ts`)
   — populate the new field from `row.sellingPriceBasisUnit ??
   row.unit`.
9. **`ProductDetailModal.tsx`** — read `item.sellingPriceBasisUnit ??
   item.unit` for the selling-price display line only.
10. **`findLatestRememberedProductMemory`**
    (`productMemoryPriceResolution.ts`) — prefer
    `item.sellingPriceBasisUnit`, fall back to `item.unit`.

**Backward compatibility, authorized exactly as specified and no other
way:** new records carry the new field; old records without it are
never modified, never backfilled, and continue to be read via
`item.unit` alone by every consumer's own fallback. No migration is
authorized or required.

**Explicitly NOT authorized by this addendum — restated with maximum
precision, per the Product Architect's own explicit instruction:**
- No change to `Product`'s schema, in any respect.
- No change to `StockCountWorkingRow` beyond what §2 item 1 already
  authorized.
- No change to Add Stock (`AddStockView.tsx`) in any respect.
- No change to Initial Stock (`InitialStockCountView.tsx`) in any
  respect.
- No change to FR-67/cost-basis logic
  (`fr67CostBasisConversion.ts`) in any respect.
- No change to the Contagem UI caption
  (`PeriodicStockCountView.tsx:3851, 4287`) — a separate,
  already-identified, not-yet-authorized correction, not part of this
  addendum's own scope.
- No other Contagem redesign, restructuring, or behavior change of any
  kind beyond the four items enumerated above.

**This addendum, once signed, authorizes implementation of exactly this
narrow schema extension and its four named consumer updates — nothing
else. Implementation may not begin until this addendum is explicitly
accepted and signed, separately from its drafting here.**

**Product Architect decision, recorded verbatim:**

> Product Architect accepts Implementation Authorization §10 — the
> narrow extension of `StockCountItem`'s persisted schema to add
> `sellingPriceBasisUnit?: string`, and the four specifically named
> consumer updates (`normalizeStockCountItems`/`tallyStockCountRows`,
> `ProductDetailModal.tsx`, `findLatestRememberedProductMemory`) —
> exactly as specified above, and exactly as specified in the
> corresponding Rule 8 Assessment §15 addendum and Implementation Plan
> §20 addendum. `StockCountItem.unit` remains the physical counting
> unit, unchanged. The new field records the unit in which
> `sellingPrice` is actually denominated, for historical/audit purposes
> only — no valuation calculation may depend on it. Backward
> compatibility is preserved exactly as specified: new records carry
> the field; old records without it continue being read via
> `item.sellingPriceBasisUnit ?? item.unit`, with no migration or
> backfill. This acceptance authorizes no change to Product's schema,
> no change to Add Stock, no change to Initial Stock, no change to
> FR-67, no change to the Contagem UI caption, and no other Contagem
> redesign or scope expansion beyond the four named consumer updates.

**Decision:** I APPROVE AND SIGN IMPLEMENTATION AUTHORIZATION §10
(OPTION C — PERSISTED SELLING-PRICE BASIS UNIT)

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 30 August 2026

This signature authorizes implementation of exactly the narrow scope
recorded in this §10 addendum — the `sellingPriceBasisUnit?: string`
field and its four named consumer updates — and nothing beyond it. It
does not reopen, alter, or reinterpret §1–§9 above, the signed Rule 8
Assessment, the signed Implementation Plan, or the signed Specification
amendment, all of which remain byte-for-byte as they were before this
signature.

**Governance boundary, restated:** the signed Specification amendment,
the signed Rule 8 Assessment's own §1–§14 and Product Architect
Signature, the signed Implementation Plan's own §1–§19 and Product
Architect Signature, and §1–§9 of this Implementation Authorization are
all unmodified by this section — confirmed by checksum immediately
before and after this signature was recorded. This signature block is
the sole content added to §10 by this acceptance.

---

## 11. Post-Implementation Record — Option C Implemented

**Status: implementation complete, not yet committed/pushed at the time
of this record.**

Appended per this repository's own established "append, don't rewrite"
pattern. §1–§10 above are unaltered by this record.

**What was implemented, exactly per §10's own authorized scope:**
1. `StockCountItem.sellingPriceBasisUnit?: string` added (`types.ts`).
2. `normalizeStockCountItems`/`tallyStockCountRows` (`stockCount.ts`)
   populate it from `row.sellingPriceBasisUnit ?? row.unit` (working-row
   layer) and `raw.sellingPriceBasisUnit ?? unit` (input-item layer) —
   threaded through the full chain: `StockCountTallyItem` →
   `StockCountInputItem` → `NormalizedStockCountItem`, and the confirm
   handler (`PeriodicStockCountView.tsx`) and the final Firestore write
   (`AppContext.tsx`) both pass it through unmodified.
3. `ProductDetailModal.tsx`'s selling-price display line reads
   `item.sellingPriceBasisUnit || item.unit || 'un'`; its quantity and
   cost-price display lines are untouched, still `item.unit` only.
4. `findLatestRememberedProductMemory`
   (`productMemoryPriceResolution.ts`) — both the within-count tie-break
   and the final candidate's own `unit` now prefer
   `item.sellingPriceBasisUnit`, falling back to `item.unit`.

**Files changed:** `apps/tenant/src/types.ts`,
`apps/tenant/src/utils/stockCount.ts`,
`apps/tenant/src/components/PeriodicStockCountView.tsx`,
`apps/tenant/src/context/AppContext.tsx`,
`apps/tenant/src/components/ProductDetailModal.tsx`,
`apps/tenant/src/lib/productMemoryPriceResolution.ts`,
`tests/initial-stock-confirmation.test.ts` (regression fix — see
below), `tests/stockcount-selling-price-basis-unit.test.ts` (new).

**One genuine regression found and fixed, disclosed precisely:**
`tests/initial-stock-confirmation.test.ts` failed after implementation
— confirmed via `git stash` against the untouched baseline (11/11 pass
there) that this was newly introduced, not pre-existing. Root cause: a
hardcoded expected-literal assertion against `normalizeStockCountItems`'
own output shape, which that same test file's own pre-existing comment
already documents as "the single choke point `recordStockCount()` uses
to build BOTH Initial Stock and Periodic Contagem items." Extending
that genuinely shared function's output exactly as §10 item B
authorizes necessarily, mechanically added the new field to Initial
Stock's own persisted items too — harmlessly, since it is optional,
display-only, and never read by any valuation calculation, exactly like
`valuationMode`/`costBasisEstablished` already do for Initial Stock
today. The test's own literal was updated to include
`sellingPriceBasisUnit: 'kg'`, matching what the authorized code change
correctly, unavoidably produces. This was judged the direct, in-scope
consequence of implementing exactly what §10 authorized — not a
separate discovered issue requiring a stop-and-report, since it
introduces no new behavior, only correctly reflects the authorized
change already made.

**Tests run:**
- New suite (`tests/stockcount-selling-price-basis-unit.test.ts`):
  20/20 pass, covering TEST 1–7, the full unit-communication-chain
  trace, and a governance-boundary structural check.
- `tests/initial-stock-confirmation.test.ts`: 11/11 pass (after the fix
  above).
- Full regression sweep across 82 test files referencing every touched
  module: 1,304 pass, 5 fail — all 5 independently re-confirmed via
  direct source inspection as the exact same pre-existing failures
  already documented in prior sessions of this governance chain, in
  files this implementation never touches.
- `tsc --noEmit`: clean.

**Confirmations:**
- `StockCountItem.unit` remains, unambiguously, the physical/counting
  unit — confirmed unmodified in every consumer.
- `sellingPriceBasisUnit` correctly preserves the selling-price's own
  true denomination, including through the "dangerous sequence" (TEST
  3) and historical memory reconstruction (TEST 6).
- Legacy records (no `sellingPriceBasisUnit` field at all) fall back to
  `item.unit` exactly as authorized (TEST 5) — no migration, no
  backfill, none performed or required.
- Valuation calculations (`totalValue`, `totalSellingValue`,
  `sellingValue`, `purchaseValue`) are byte-for-byte unaffected (TEST 7)
  — confirmed by direct comparison against an identical call omitting
  the new field entirely.
- `Product` schema, Add Stock, Initial Stock's own dedicated file, and
  FR-67 cost-basis logic are all confirmed untouched — none appear in
  this implementation's diff.

**Not committed, not pushed** — awaiting separate authorization, per
the Product Architect's own explicit instruction.

## 12. Addendum — Authorization to Correct the Contagem UI Selling-Price
## Denomination Caption

**Status: ✅ AUTHORIZED. ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**

Appended per this repository's own established "append, don't rewrite"
pattern. §1–§11 above, including every existing signature and
Post-Implementation Record, are unaltered by this addendum. No prior
signed content is revised, reinterpreted, or superseded.

**Why this addendum exists.** §10 above, and its corresponding Rule 8
Assessment §15 / Implementation Plan §20 addenda, explicitly excluded
"the Contagem UI caption (`PeriodicStockCountView.tsx:3851, 4287`)" by
name, describing it as "a separate, already-identified,
not-yet-authorized correction, not part of this addendum's own scope."
This §12 addendum is that separate authorization. It is not
pre-authorized by §10, and is not implied by any prior signature in
this document.

**Statement of purpose.** This authorization exists only to make the
Owner-facing selling-price denomination match the already-correct
internal `sellingPriceBasisUnit` value. It authorizes no other change
of any kind.

**This addendum authorizes ONLY the following three items, once
signed:**

1. Change the catalog-row selling-price caption in
   `PeriodicStockCountView.tsx` (currently line 3857) from:
   ```tsx
   {currencySymbol} por {row.unit.trim() || 'un'}
   ```
   to:
   ```tsx
   {currencySymbol} por {(row.sellingPriceBasisUnit ?? row.unit).trim() || 'un'}
   ```

2. Change the manual-row selling-price caption in
   `PeriodicStockCountView.tsx` (currently line 4293) from the same
   current expression to the same corrected expression.

3. Add or update the narrowly required tests specified in Rule 8
   Assessment §16 addendum and Implementation Plan §21 addendum
   (same-unit, divergent, reverse-divergent, legacy fallback, Mode A
   unchanged, catalog/manual parity) — test-file changes only, scoped
   exclusively to verifying these two display expressions.

**This addendum explicitly prohibits, and does not authorize:**
- Any change to the `StockCount` data model or any of its persisted
  fields.
- Any change to `Product`'s schema.
- Any change to Add Stock (`AddStockView.tsx`).
- Any change to Initial Stock (`InitialStockCountView.tsx`).
- Any change to Smart Stock Entry, or any other product-recognition
  flow.
- Any change to Mode A/B logic, eligibility, or Mode A's own
  reference-unit caption (line 308).
- Any change to conversion mathematics or unit-relationship resolution.
- Any change to Product memory
  (`findLatestRememberedProductMemory`/`productMemoryPriceResolution.ts`).
- Any change to persistence (`recordStockCount`, `AppContext.tsx`'s own
  write sequence).
- Any change to Business Worth / valuation totals
  (`totalValue`/`totalSellingValue`/`sellingValue`).
- Any change to FR-67 cost-basis logic
  (`fr67CostBasisConversion.ts`).
- Any other Contagem UI redesign, restructuring, or copy change beyond
  the two named caption expressions.
- Any new feature.
- Any refactoring outside the two named caption lines and their
  directly corresponding tests.

**Test / Acceptance scope for this addendum (restated from Rule 8
Assessment §16 and Implementation Plan §21, in full — the complete,
sole test scope this addendum covers once signed):**
1. `quantity=7, unit=Cx, sellingPrice=50, sellingPriceBasisUnit=Un` →
   caption resolves to "50 MZN por Un".
2. `quantity=7, unit=Cx, sellingPrice=480, sellingPriceBasisUnit=Cx` →
   caption resolves to "480 MZN por Cx".
3. `quantity=7, unit=Un, sellingPrice=480, sellingPriceBasisUnit=Cx` →
   caption resolves to "480 MZN por Cx" (reverse-divergent case).
4. `sellingPriceBasisUnit` absent → caption falls back to the physical
   `unit`, exactly as rendered today.
5. Mode A's own reference-unit caption (line 308) is verified
   unchanged, still sourced from `referenceUnit`.
6. Catalog-row and manual-row captions are verified to behave
   identically, independently of each other.

All six items verify display-source semantics only — none alter or
depend on any business-logic behavior, and none are satisfied by a
change to arithmetic, persistence, or any field other than the two
named caption expressions.

**Risk:** minimal. Blast radius is exactly two single-line JSX
expressions in one file, both already covered by an existing,
already-tested fallback pattern (`sellingPriceBasisUnit ?? unit`)
shipped elsewhere in this same codebase under §10 above.

**Rollback:** trivial — reverting either or both lines to `row.unit`
restores today's exact behavior; no data migration is involved in
either direction, since no persisted field or schema is touched.

**Governance state:** Rule 8 Assessment §16 addendum — ✅ accepted by the
Product Architect, 30 August 2026. Implementation Plan §21 addendum —
✅ accepted by the Product Architect, 30 August 2026. This §12 addendum
— ✅ accepted and signed by the Product Architect, below.

---

**Product Architect Acceptance**

> I have reviewed this §12 addendum and confirm it authorizes exactly
> the scope recorded above: the catalog-row selling-price caption and
> the manual-row selling-price caption in `PeriodicStockCountView.tsx`,
> each changed from `row.unit` to `row.sellingPriceBasisUnit ??
> row.unit`, plus the six narrowly corresponding tests (same-unit,
> divergent, reverse-divergent, legacy fallback, Mode A unchanged,
> catalog/manual parity) — nothing else. I confirm this authorization
> does not extend to the StockCount data model, Product schema, Add
> Stock, Initial Stock, Smart Stock Entry, Mode A/B logic, conversion
> mathematics, Product memory, persistence, Business Worth, FR-67, any
> other Contagem UI redesign, any new feature, or any refactoring
> outside the two named caption lines and their tests, exactly as this
> addendum's own exclusion list states. I authorize implementation of
> exactly this scope.

**Decision:** I APPROVE AND SIGN IMPLEMENTATION AUTHORIZATION §12

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 30 August 2026

This signature authorizes implementation to begin, strictly bounded to
the scope recorded above in this §12 addendum. It does not itself
constitute the start of implementation work — that remains a separate,
subsequent execution step.

---

**This document, as signed, authorizes implementation strictly per the
scope in this §12 addendum. No code, test, `firestore.rules`, or
`firestore.indexes.json` change has been made in the course of producing
or signing this addendum. A separate implementation execution step is
required to actually begin work.**

