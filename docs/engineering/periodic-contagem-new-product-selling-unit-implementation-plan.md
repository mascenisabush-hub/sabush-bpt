Implementation Plan

# Periodic Contagem — New-Product `sellingUnit` Capture — Implementation Plan

**Type:** Governance bridge document. Per the originating instruction ("We need ONLY an Implementation Plan"), this document folds Current-State-Assessment and Gap-Analysis content inline (§1, §7, §10) rather than as a separate Rule 8 Assessment document — an already-established, permitted pattern in this repository for small-scope work (`platform-engineering-governance-standard.md` §2, Stage 7: "or inline in the phase's own Implementation Plan section for small modules (Module #19 Phase 1 precedent)"). Does not itself authorize implementation and does not modify code.

**Status:** **DRAFT — NOT YET ACCEPTED / NOT AUTHORIZED.** No Product Architect signature appears anywhere in this document. No code may be written on the strength of this Plan alone.

**Governing chain:** `BDR-0012` (Product Unit-of-Measure & Product Memory, Approved) → POL-0001–0006 → the UOM Specification → Business Worth Evolution's Decision 37 (Increment 4/B.1/B.2, Approved, already implemented) → the read-only UX/Data-Entry Door Audit (identifying the confirmed gap) → [`decision-37-b2-selling-unit-capture-extension-addendum.md`](./decision-37-b2-selling-unit-capture-extension-addendum.md) (✅ **SIGNED**, SABUSHIMIKE MASCENI, 29 August 2026) → **this Implementation Plan**.

**Baseline verified fresh, this session:** `main`, commit `d01fa8b`, working tree clean (`git status --short` empty), confirmed via `git fetch origin main` immediately before this Plan was drafted.

**This document does not:** modify any application file, test, or existing governance document. It does not create a BDR or Policy. It does not modify `UnitRelationship`'s schema, `getConversionFactor`, Business Worth calculations, `StockBatch`, Add Portion's persistence behavior, or anything in Add Stock, Smart Stock Entry, or Initial Stock.

---

## 1. Current State (Fresh Source Verification, This Session)

Re-read directly, not from a prior report's memory:

- `UnitRelationshipChainEditor` (`PeriodicStockCountView.tsx:135-254`) — an arbitrary-length chain editor. `steps: {unit, factor}[]` represents every level **after** the purchase unit. Collapsed by default, labeled `"Configurar relação de unidades (opcional)"` / `"Relação de unidades (opcional)"`, with helper text `"Deixe em branco se não quiser configurar agora — pode fazê-lo mais tarde na ficha do produto."` It has **no `sellingUnit` input of any kind.**
- `NewProductInfoPanel` (`PeriodicStockCountView.tsx:366-428`) — the product-level panel that hosts `UnitRelationshipChainEditor`, plus purchase-unit/purchase-cost fields. Owns `newProductInfo` state, keyed by `productKeyFor(name)` (Decision 37 B.1's product-level, not row-level, ownership model — deliberate, fixing an earlier data-loss bug).
- **Two** candidate-`UnitRelationship`-construction sites exist, both confirmed to never set `sellingUnit`:
  1. `getEffectiveUnitRelationshipForProductName` (`PeriodicStockCountView.tsx:1353-1376`) — a read-time preview builder (feeds Mode A's live UI).
  2. The submit-time `unitRelationshipByProductName` correlation loop (`PeriodicStockCountView.tsx:2210-2229`) — the one that actually reaches `recordStockCount` and gets persisted to a genuinely new `Product` document.
- **Critical finding, not previously surfaced this precisely:** the submit-time site's own code comment states the omission is **deliberate, scoped history, not an oversight**:
  > *"`sellingUnit` is deliberately left unset — B.2's own scope is the relationship chain only, never a selling-price/reference-unit decision (that remains Mode A/B's own, separately-authorized, unmodified mechanism, which already lets the Owner pick any unit from the full chain as its reference unit — Product.unitRelationship.sellingUnit is optional per isValidUnitRelationship's own contract, unchanged here)."* (`PeriodicStockCountView.tsx:2202-2209`)

  This Plan therefore **extends** a previously and explicitly bounded scope decision (Decision 37 B.2), not merely "fills in a blank nobody thought about." §10 addresses why this is still ordinary Category 2 engineering, not a reason to reopen governance — but it is recorded honestly here, not glossed over.
- `Product.unitRelationship.sellingUnit` (`types.ts:399-403`) already exists, is already optional, and `isValidUnitRelationship` (`unitRelationship.ts:49-91`) already validates it correctly (must be a member of `units[]`, need not equal `units[0]`) — confirmed unchanged.
- Add Stock's `UnitRelationshipRow` (`AddStockView.tsx:273-335`) — re-read fresh. **Structurally different from Contagem's editor**: it is a **fixed two-level** component (`purchaseUnit`, one `sellingUnit` free-text field, one `factor`) — it has no concept of an arbitrary-length chain with an intermediate level (e.g., it cannot express `Cx → Emb → Un` at all; only a direct `Cx → Un`-shaped pair). This matters for §4's reuse recommendation.
- Existing tests: `tests/periodic-stock-arbitrary-length-relationship.test.ts` (15 tests, confirmed by fresh grep) covers `units[]`/chain-construction exhaustively — **zero occurrences of `sellingUnit` anywhere in that file**, confirming it is genuinely untested here today, consistent with never being set.

## 2. Desired State

```
Existing:  units[] → confirmedAt
Desired:   units[] → sellingUnit → confirmedAt
```

Only when the relationship has **2 or more** total units (`units.length >= 2`, i.e. at least one completed `relationshipSteps` entry beyond the purchase unit) — for a single-functional-unit product, no relationship (and therefore no `sellingUnit`) is ever required or offered, unchanged.

## 3. Scope

**Files expected to change:**
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — the only application file.
- A new or extended test file (see §8) — likely `tests/periodic-stock-arbitrary-length-relationship.test.ts` (extended) or a new, narrowly-scoped sibling test file.

**Explicitly must remain untouched** (confirmed nothing in the approach below requires touching any of these):
- `apps/tenant/src/types.ts` (`UnitRelationship`'s own shape is already sufficient).
- `apps/tenant/src/lib/unitRelationship.ts` (`isValidUnitRelationship` already accepts `sellingUnit` correctly).
- `apps/tenant/src/lib/purchaseToSellingConversion.ts` (`getConversionFactor` and everything built on it).
- `apps/tenant/src/lib/contagemMultiUnitValuation.ts` (Mode A/B).
- `apps/tenant/src/context/AppContext.tsx` (`recordStockCount`'s own contract — it already accepts an optional `unitRelationship` per item and writes it verbatim to a new `Product`; no change needed there since this Plan only changes what value Contagem *constructs* before calling it).
- `apps/tenant/src/components/AddStockView.tsx`.
- `apps/tenant/src/components/InitialStockCountView.tsx`.
- Any server file, `firestore.rules`, `firestore.indexes.json`.
- Any Smart Stock Entry file.

## 4. Implementation Approach (Smallest, Reuse-First)

**Do not reuse Add Stock's `UnitRelationshipRow` literally** — it is structurally the wrong shape for this door, since it only ever handles a flat two-unit pair, while Contagem's chain is arbitrary-length (the Impala example alone has 3 units: Cx, Emb, Un). Copying its free-text `sellingUnit` input would let the owner type a unit that isn't actually a member of the chain they just built — exactly the kind of fabricated/uncheckable input this codebase's own discipline avoids elsewhere.

**The closer, already-present precedent in this same file is `ModeAValuationControl`'s own reference-unit `<select>`** (`PeriodicStockCountView.tsx:294-305`): `referenceUnitOptions = relationship.units.map(u => u.unit)`, a dropdown populated from the chain that already exists, defaulting to but not forced to `units[0]`. The smallest correct addition is the same pattern, applied inside `NewProductInfoPanel`/`UnitRelationshipChainEditor`'s own area:

1. Extend `newProductInfo`'s per-product state shape (`PeriodicStockCountView.tsx:1220-1222`) with one new field, e.g. `sellingUnit: string` (default `''`).
2. Render one new `<select>` — visible only once `relationshipSteps` contains at least one complete step (i.e., only once the chain actually has 2+ units) — populated from `[purchaseUnit, ...completeSteps.map(s => s.unit)]`, mirroring `ModeAValuationControl`'s own `referenceUnitOptions` construction exactly.
3. Thread the selected value into **both** existing candidate-construction sites (§1's two locations) as `sellingUnit: info.sellingUnit || undefined`, changing only the object literal each already builds — no new construction path, no second source of truth.
4. For a single-unit product, the new selector never renders — no behavior change from today.

No new component is introduced; no existing component's existing behavior changes for the cases it already handles correctly.

## 5. UI Behavior

- **Where it appears:** inside `NewProductInfoPanel`, directly below `UnitRelationshipChainEditor`'s own rendered chain — only when the panel is expanded **and** at least one complete step exists (2+ total units).
- **Which units are available:** exactly the units currently defined in the in-progress chain — the purchase unit plus every completed step's unit, live-updated as the owner edits the chain (matching Mode A's own dropdown behavior).
- **One-unit products:** the selector never renders — identical to today's behavior, no forced choice, no `1 Saco = 1 Saco`.
- **2+ units:** the selector renders, defaulting to blank or to the purchase unit (implementation detail, to be decided at build time — either is consistent with "not forced," since `sellingUnit` remains optional even when the chain exists — `isValidUnitRelationship` never requires it).
- **Incomplete relationship (owner started but didn't finish a step):** the selector's option list simply reflects only the currently-complete units — matching `UnitRelationshipChainEditor`'s own existing "only the last step can be incomplete" invariant; no new validation state is needed.
- **Owner edits the chain after selecting a selling unit:** if the owner removes a step whose unit was the selected `sellingUnit` (via `removeFromStep`'s existing truncate-from-index behavior), the selected value would no longer be a member of the remaining chain. **Resolution:** the selling-unit state is reset to blank whenever the current selection is no longer among the live option list — a pure derived-value check, not new validation logic, mirroring `effectiveReferenceUnit`'s own existing `config?.referenceUnit || referenceUnitOptions[0] || ''` fallback pattern in `ModeAValuationControl`'s call site.
- **Remains valid after editing:** yes, by construction — the selector always reflects the live chain; an invalid stale selection cannot survive a re-render given the reset rule above.

## 6. Data / Persistence

The selected value threads into the **existing** `UnitRelationship` object literal at both of §1's construction sites — e.g.:
```ts
const candidate: UnitRelationship = {
  units: [ ... ],           // unchanged
  ...(info.sellingUnit ? { sellingUnit: info.sellingUnit } : {}),  // new
  confirmedAt: new Date().toISOString(),  // unchanged
};
```
This flows into `recordStockCount`'s existing, unmodified `items[].unitRelationship` parameter, written to the new `Product` document exactly as `unitRelationship` already is today (`AppContext.tsx`'s existing `if (!product)` branch — **no change to that function**). No new field, no new collection, no new write path — the exact same field the type already declares, populated for the first time from this specific screen.

## 7. Validation

- `isValidUnitRelationship` is reused **unmodified**. Direct re-read confirms it already: requires `sellingUnit` (when present) to be a member of `units[]` (case/whitespace-insensitive) — satisfied automatically here, since the dropdown's own options are derived from the same `units[]` being constructed, making an invalid selection structurally unreachable rather than needing a runtime check.
- Buying unit is not forced to equal `sellingUnit` — confirmed: the dropdown includes the purchase unit as one option among several, never pre-selected as the only choice, and every other unit remains selectable.
- Single-unit products: confirmed, no relationship object is constructed at all when `relationshipSteps` has zero complete entries (existing `if (completeSteps.length === 0) continue;` / `return undefined` guards, unchanged) — so `sellingUnit` is moot and never rendered.
- No fabricated conversion: this change touches no arithmetic; `getConversionFactor` and every valuation function remain byte-for-byte unchanged.

## 8. Tests

| # | Test | Where |
|---|---|---|
| 1 | Multi-unit relationship candidate can contain a non-empty `sellingUnit` | New test, extending `tests/periodic-stock-arbitrary-length-relationship.test.ts`'s existing candidate-construction assertions |
| 2 | Selected `sellingUnit` is always one of the chain's own units | New test — construct a candidate with a selection outside the chain and confirm `isValidUnitRelationship` correctly rejects it (proves the existing validator, unmodified, already guards this) |
| 3 | `sellingUnit` can differ from the purchase/acquisition unit (`units[0]`) | New test — mirrors Requirement/Example numbers already used throughout this investigation (`1 Cx = 12 Un`, `sellingUnit = 'Un'`) |
| 4 | Single-unit product never constructs a relationship or a `sellingUnit` | **Already covered** — existing test `"zero complete steps produces no candidate at all for that product"` (`periodic-stock-arbitrary-length-relationship.test.ts:271`) already proves this; no new test needed, only confirm it still passes unmodified |
| 5 | Existing Contagem chain-construction behavior (all 15 current tests) remains intact | Re-run `tests/periodic-stock-arbitrary-length-relationship.test.ts` unmodified after the change — must still be 15/15 |
| 6 | Existing Add Stock behavior remains intact | Not touched by this Plan at all (§3) — re-run existing Add Stock test suites as a pure regression check, no new test needed |
| 7 | Existing conversion/valuation tests remain intact | `tests/unit-relationship.test.ts`, `tests/purchase-to-selling-conversion.test.ts`, `tests/periodic-stock-mode-a-integration.test.ts`, `tests/periodic-stock-multi-portion-valuation.test.ts` — none call the changed construction sites' new field, so none require modification; re-run as regression |

## 9. Regression Boundaries

Explicitly confirmed **not** changed by this Plan's approach: `UnitRelationship` type; `isValidUnitRelationship`'s logic (only its existing, already-correct handling of `sellingUnit` is exercised, not modified); `getConversionFactor`; Business Worth (`calculations.ts`); `StockBatch`; Smart Stock Entry extraction; Add Stock's conversion mechanism; Add Portion's transient persistence behavior (unrelated — this Plan touches only the new-product relationship candidate, never `modeAGroups` or per-portion `sellingPrice`); any Product-level "selling portions" concept (none introduced); Initial Stock (untouched, out of scope).

## 10. Governance Classification

**Category 2 — engineering/UX correction within already-approved architecture**, per the same Addendum precedent this repository has already used for comparable work (`19-governance-bdr-policy-framework.md`'s "Scope Boundary: Standards-Conformance Corrections"). Reasoning:
- The business decision this touches — that a `UnitRelationship` may optionally carry a `sellingUnit`, independent of the purchase unit — is **already approved** (`BDR-0012`, the UOM Specification, `isValidUnitRelationship`'s own existing contract).
- What changes is **only** which screen can populate an already-approved, already-optional field of an already-approved type — no new business rule, no new data concept, no new validation rule.
- The one nuance worth stating plainly (§1): Decision 37 B.2 explicitly scoped itself to exclude this exact field at the time it was built. Extending that scope is not itself invalidating B.2's own decision — B.2 built the chain-editing mechanism; this Plan adds one more thing that mechanism can also capture, using the same already-approved type. It does not reverse, weaken, or contradict anything B.2 decided.

**No new BDR or Policy is required.** The point flagged in the prior draft of this Plan — whether B.2's explicit scope exclusion should be reopened via ordinary engineering discretion — has since been resolved: [`decision-37-b2-selling-unit-capture-extension-addendum.md`](./decision-37-b2-selling-unit-capture-extension-addendum.md) records an explicit Product Architect decision extending Decision 37 B.2's scope to cover exactly this capability, **now formally signed** (SABUSHIMIKE MASCENI, 29 August 2026). This Plan's own governance-classification point is therefore fully cleared; the Plan's separate acceptance gate (a distinct step from that signature) remains outstanding, per its own header status.

## 11. Acceptance Criteria

- [ ] A new multi-unit product's relationship, established via Periodic Contagem's `NewProductInfoPanel`, can have its `sellingUnit` set in the same screen, without leaving Contagem.
- [ ] The selling-unit selector only ever offers units that are actually part of the in-progress chain.
- [ ] The selector does not render for a single-functional-unit product.
- [ ] The persisted `Product.unitRelationship.sellingUnit` (when set) matches exactly what the owner selected.
- [ ] `isValidUnitRelationship` continues to gate persistence unmodified — an invalid combination (structurally unreachable via the UI, per §7) is never persisted.
- [ ] All 15 existing tests in `tests/periodic-stock-arbitrary-length-relationship.test.ts` continue to pass unmodified.
- [ ] `npm run lint:tenant` is clean for the affected scope.
- [ ] No change to `Add Stock`, `Smart Stock Entry`, `Initial Stock`, Business Worth, or Add Portion behavior, confirmed by full regression suite.

## 12. Manual QA

**Scenario 1 (multi-unit):** In Periodic Contagem, add a genuinely new product "Impala." Expand "Configurar relação de unidades," enter `1 Cx = 4 Emb`, then `1 Emb = 6 Un` (producing the chain `Cx → Emb → Un`). Confirm the new selling-unit selector appears, offering `Cx`, `Emb`, `Un`. Select `Un`. Confirm the count. Verify (via the product's own detail view or a direct Firestore read, whichever is available at implementation time) that `Product.unitRelationship.sellingUnit === 'Un'`, and that this is independent of the purchase unit (`units[0]`, `Cx`).

**Scenario 2 (single-unit):** Add a genuinely new product "Arroz 25kg." Do not expand the relationship panel at all. Confirm the count with a plain quantity in unit "Saco." Verify no `unitRelationship` field is written to the new `Product` document at all — confirming no relationship, and therefore no `sellingUnit`, is ever forced.

## 13. Change Control

```
$ git status --short
(empty)
$ git diff --quiet && echo clean
clean
```
No code changed, no test changed, no governance file changed, no commit, no push. Working tree remains clean throughout the drafting of this Plan.

---

## Governance Notes

- This document does not implement code, modify runtime behavior, or edit any `src/`, `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, or test file. None were touched to produce it.
- This document does not modify `BDR-0012`, any POL document, the UOM Specification, or any Business Worth Evolution governance artifact — confirmed unchanged, this session.
- This document does not create, and should not be treated as, an Implementation Authorization.
- §10 flags, rather than silently resolves, the one point (extending Decision 37 B.2's explicit scope exclusion) that deserves explicit Product Architect attention rather than being assumed uncontroversial.

**Lifecycle:** **Plan drafted** (this document). Not Accepted, not Authorized, not Implemented, not Verified, not Closed — no engineering work is authorized by this record.
