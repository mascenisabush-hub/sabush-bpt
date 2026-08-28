Implementation Plan

# Implementation Plan — Periodic Contagem Cost-Price Removal (§44)

**Type:** Governance bridge document — translates a **READY** Rule 8
Assessment into a concrete, file-by-file implementation plan, ready for
Implementation Authorization sign-off. Does not itself authorize
implementation and does not modify code.

**Status:** Draft — pending Implementation Authorization (separate,
subsequent document, not created here).

**Governing chain:** [`business-worth-evolution-specification.md`](../specs/business-worth-evolution-specification.md)
§15/FR-67 (✅ Approved) → [Periodic Contagem Cost-Price Removal Amendment](../specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md)
(proposed §44, ✅ **ACCEPTED AND SIGNED**, FR-71–FR-77) →
[Rule 8 Assessment](./business-worth-evolution-periodic-contagem-cost-price-removal-rule8-assessment.md)
(✅ **READY** — Finding 4's flagged scope reading resolved and confirmed
by the Product Architect: FR-74 removes both the live cost total and its
"vs. Valor Esperado" trend indicator; no remaining ambiguity).

**Repository state at this revision:** `main = origin/main = a0316dc6c3ebd97d18812e9db3f855f366b95121`
(the commit that landed the signed amendment), working tree clean at the
start of this document. Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, or `tests/` to produce this
Plan; the Rule 8 Assessment itself remains an untracked, uncommitted
local file at this point in the sequence.

**This document does not:** modify the signed amendment, the Rule 8
Assessment, `firestore.rules`, `firestore.indexes.json`, or any
application code. It does not itself constitute Implementation
Authorization — that remains a separate, explicitly gated document,
unsigned until Product Architect sign-off.

---

## 1. Purpose

This Plan converts the Rule 8 Assessment's Findings 1–7 into a concrete
map of exactly which files change, what each change is, and how each of
FR-71 through FR-77 is satisfied. It introduces no new business decision
and no new technical direction beyond what the Rule 8 Assessment already
adopted (in particular, Finding 3's `costBasisEstablished` field shape
and Finding 4's now-confirmed full-block removal), and commits no code.

## 2. Scope Enumeration

### 2.1 In Scope

1. **Schema addition** (additive/optional only, per this codebase's
   established backward-compatibility pattern):
   - `StockCountItem.costBasisEstablished?: boolean` (Rule 8 Finding 3)
     — `true` when a portion's cost was derived from a valid governed
     basis (including the purchase-unit portion), `false` when no basis
     existed and `costPrice` is `0`/not established, absent on every
     item persisted before this ships. Display/audit-only — never read
     by any valuation calculation, mirroring `valuationMode`'s existing,
     identical discipline on the same type.
2. **Cost-basis capture at both call sites** (Finding 3): both
   `normalizeStockCountItems` (persistence, `stockCount.ts`) and
   `tallyStockCountRows` (Owner-facing preview, same file) are updated
   to capture `deriveCostContribution`'s existing `derived` return value
   — currently computed and discarded by both — and thread it into their
   respective output items as `costBasisEstablished`. **No change to
   `deriveCostContribution` itself** — its signature, its logic, its
   `getConversionFactor` dependency are all reused unmodified (Finding
   2: already correct, already tested for the purchase-unit portion).
3. **UI — remove the two remaining Owner-editable Cost Price inputs**
   (`PeriodicStockCountView.tsx`, Finding 1): the purchase-unit-portion
   cost field in both the catalog-row render path (~2978–2989) and the
   manual-row render path (~3412 region) is removed, mirroring exactly
   how `isCostFieldSuppressed` already removes the equivalent field for
   non-purchase-unit portions today. `isCostFieldSuppressed` and its
   underlying `getCostBasisForSuppression` are **not modified** — they
   become vestigial for the purchase-unit case (no longer gating
   anything, since no cost field remains to suppress there) but are left
   in place rather than deleted, since non-purchase-unit suppression
   logic is unchanged and reuses the same functions.
4. **UI — remove the live secondary cost-total/trend block**
   (`PeriodicStockCountView.tsx` ~3607–3654, Finding 4, now unambiguous):
   the cost-value secondary line (`liveTally.totalPurchaseValue`) and
   its `comparisonBaseline`-driven trend indicator (`diff`/`diffPct`)
   are both removed. The selling-value hero figure's markup, position,
   and underlying calculation are untouched — it becomes the sole
   element remaining in that card.
5. **UI — re-anchor the post-confirmation headline** (`PeriodicStockCountView.tsx`
   ~2164–2250, Finding 5): the on-screen headline binds to
   `savedSellingTotal` (already captured in component state today, at
   confirmation time, currently rendered only inside the optional
   downloadable receipt) in place of `savedTotal`. A cost-basis figure,
   if retained on this screen at all, is demoted to secondary
   presentation and explicitly labelled to reflect `costBasisEstablished`
   (uniformly derived, uniformly not-established, or mixed across the
   count's items) — exact copy/label wording is an implementation-task
   decision, not fixed by this Plan, consistent with the Rule 8
   Assessment's own deferral.
6. **UI — remove the 2 cost-side price-deviation warning call sites**
   (`PeriodicStockCountView.tsx` ~3014–3021 catalog rows, ~3447 manual
   rows, Finding 7): both the `getRememberedPriceForRow(row, 'cost')`
   call and its associated amber warning JSX block are removed. The 2
   selling-side call sites, `checkPriceDeviation`, and
   `PRICE_DEVIATION_WARNING_THRESHOLD` (`priceDeviationCheck.ts`) are
   **not modified**.
7. **No change** to the history list (`PeriodicStockCountView.tsx`
   ~3696–3706) or the §22 reconciliation note (`savedReconciliation`
   rendering, ~2199–2250) — Finding 6 confirmed both already satisfy
   FR-76 structurally, with no code change required.
8. **Tests**: per §6 below, mapped 1:1 to the Rule 8 Assessment's own
   Testing Strategy (§15 of that document).

### 2.2 Explicit Exclusions

Carried forward verbatim from the signed amendment's §6/§16 and the Rule
8 Assessment's own §17 scope discipline — none invented here:

- Any change to Initial Stock, in any respect (`InitialStockCountView.tsx`
  is not touched by this Plan).
- Any change to Product Memory (`BDR-0012`) or its pre-fill mechanics.
- Any change to purchase-entry (+Stock) behavior (`AddStockView.tsx` is
  not touched by this Plan).
- Any change to `productValuationTotal`, `normalizedTotalSellingValue`,
  `measuredBusinessWorth`, or any `BusinessWorthSnapshot` field.
- Any change to `Product.unitRelationship`, `getConversionFactor`, or
  any conversion/rounding rule.
- Any change to Mode A (`contagemMultiUnitValuation.ts`) or Mode B
  mechanics.
- Any change to multiple-portion or multiple-selling-price behavior.
- Any change to the Selling Price invocation of the deviation warning,
  or to `checkPriceDeviation`/`PRICE_DEVIATION_WARNING_THRESHOLD`
  themselves.
- Any new cost-anomaly-detection mechanism (explicitly forbidden by
  FR-77).
- Any change to `recordStockCount`'s atomic batch-write, submission-
  identity idempotency, or `BusinessWorthSnapshot` construction logic.
- Any `firestore.rules` change (Rule 8 Finding: none required — no
  per-item field validation exists today for periodic creates).
- Any `firestore.indexes.json` change (Rule 8 Finding: none required).
- Any migration or backfill of any existing `StockCountItem`/`StockCount`
  document.
- Any change to `StockCountWorkingRow`'s schema — `costPrice: string`
  remains, simply never populated by Owner interaction going forward.
- Any Policy (`POL-NNNN`) document — none is drafted or assigned by this
  Plan.

## 3. Acceptance Criterion → Implementation Mapping

Mapped against the signed amendment's §15 Acceptance Criteria:

| Amendment Acceptance Criterion | Implementation Element |
|---|---|
| No Owner-editable Cost Price input, any portion, any unit (FR-71) | Two remaining render sites removed, `PeriodicStockCountView.tsx` (§2.1 item 3) |
| Governed-basis derivation for purchase-unit portion, no Owner-typed value (FR-72) | Already implemented (`deriveCostContribution`); no code change — verified by existing test, extended per §2.1 item 2 |
| No fabricated zero when no basis exists; quantity/Selling Price fully usable (FR-73) | `costBasisEstablished` field (§2.1 item 1), threaded from the existing `derived` flag (§2.1 item 2) |
| No secondary cost total on live entry; Selling Value sole live total (FR-74) | Entire cost-total/trend block removed (§2.1 item 4) |
| Post-confirmation headline is Selling Value; cost figure, if retained, secondary/labelled (FR-75) | Headline binding swapped; secondary label reads `costBasisEstablished` (§2.1 item 5) |
| History comparison remains, unmerged, not elevated above §22 (FR-76) | No change — already satisfied structurally (§2.1 item 7) |
| No Cost Price deviation warning; Selling Price warning unaffected (FR-77) | 2 cost-side call sites + JSX removed (§2.1 item 6) |
| `productValuationTotal`/`normalizedTotalSellingValue`/`measuredBusinessWorth` unchanged | No code in this Plan touches `recordStockCount`'s selling-basis path, Mode A/B, or any `BusinessWorthSnapshot` field |
| `StockCountItem.costPrice`/`StockCount.totalValue`/`expectedValueAtCount` unchanged in name/type/optionality; no historical document altered | Only additive field is `costBasisEstablished?`; every other field untouched; no migration (§2.2) |
| Initial Stock unchanged in every respect | `InitialStockCountView.tsx` not referenced anywhere in §2.1 |

## 4. Schema / Read-Path Change Inventory

**Schema (additive only):**
- `StockCountItem.costBasisEstablished?: boolean` — new, optional, on
  every counted item going forward; absent on all historical items.

**No other type changes.** `StockCount`, `StockCountWorkingRow`,
`StockCountTallyItem`, `NormalizedStockCountItem` all gain the same
field additively where they carry cost information
(`StockCountTallyItem.costBasisEstablished?`,
`NormalizedStockCountItem.costBasisEstablished?`), for internal
consistency across the shared preview/persistence path — no new type,
no renamed field, no removed field anywhere.

**`firestore.rules`:** no change. Confirmed by Rule 8 §4/§11: no
per-item field-shape validation exists today for periodic `StockCount`
creates; an additive optional boolean requires none.

**`firestore.indexes.json`:** no change. Confirmed by Rule 8 §4/§9: no
`stockCounts`-item-level index exists; none is introduced by any query
pattern in this Plan (no new query is introduced at all — this Plan adds
no read path, only a write-time field capture and UI removals).

**Read path:** no existing read-path derivation (`AppContext.tsx` or
elsewhere) is changed by this Plan — `costBasisEstablished` is a new,
purely additive, display-only field with no existing consumer to update.

## 5. Tenant Isolation and Authorization Boundary Verification

- The new field lives on `StockCountItem`, nested under the existing
  `businesses/{businessId}/stockCounts/{stockCountId}` document
  structure — no new collection, no new top-level path, no change to
  any tenant-isolation boundary.
- No authorization tier changes: Owner-only write access to
  `stockCounts` is unchanged (no `firestore.rules` modification, §4).
  Tenant-wide read access (`isMemberOf`) is unchanged.
- No new write path, no new create/update/delete permission of any kind
  is introduced — this Plan is UI-removal, one additive field, and two
  existing-function call-site updates only.

## 6. Testing Requirements

Directly carried from the Rule 8 Assessment's own §15 Testing Strategy,
made concrete:

1. **Known required update** — `tests/price-deviation-warning-wiring.test.ts`:
   change `assert.equal(callCount, 4)` to `assert.equal(callCount, 2)`;
   add an assertion that both remaining call sites pass `'selling'`,
   never `'cost'`, as their second argument.
2. **New — `costBasisEstablished` derivation**
   (`tests/contagem-cost-basis-conversion.test.ts`, extending existing
   coverage): assert `true` for a governed-basis portion including the
   purchase-unit portion specifically (extending the existing line-163
   case); assert `false` for a no-basis portion with `costPrice === 0`;
   assert the field is absent when `costBasisByProductName` is omitted
   entirely (mirroring the file's own existing "absent a cost basis
   map... behavior is byte-for-byte unchanged" test).
3. **New — structural, no-DOM-harness pattern** (matching
   `periodic-stock-cost-field-suppression.test.ts`'s established
   approach): assert no Cost Price `<input>` render path remains for
   the purchase-unit portion in either the catalog-row or manual-row
   section of `PeriodicStockCountView.tsx`'s source.
4. **New — structural**: assert the live-entry cost-total/trend block
   (the `liveTally.totalPurchaseValue` line and its `comparisonBaseline`
   diff/trend rendering) is absent from the component source, while the
   selling-value hero figure's rendering remains present and unchanged.
5. **New — structural**: assert the post-confirmation headline binds to
   `savedSellingTotal`, not `savedTotal`.
6. **Recommended (Rule 8 Finding 6, not required — nothing currently
   violates it)**: a structural test asserting the history list's cost
   comparison and the §22 reconciliation note remain rendered by
   separate, non-nested component regions, to guard the already-true
   property against a future refactor.
7. **Regression — must continue passing unmodified**: every existing
   assertion in `contagem-cost-basis-conversion.test.ts` (the new
   assertions in item 2 are additive, none replace or alter an existing
   one); `periodic-stock-cost-field-suppression.test.ts` in full
   (non-purchase-unit suppression logic is unchanged); every Selling
   Price-path regression test in any file; every Initial Stock test in
   any file (out of scope, untouched).
8. **Regression — Business Worth**: existing
   `business-worth-snapshot-*.test.ts` and
   `business-worth-current-read-path.test.ts` suites pass unmodified,
   confirming no selling-basis calculation path was disturbed.

## 7. Risks Carried Forward From Rule 8

- **Purely additive field threading (Finding 3):** low risk — the
  `derived` value already exists and is already correctly computed by
  tested code; this Plan only stops discarding it. The risk surface is
  limited to correctly wiring the same already-correct value through two
  call sites, not to any new derivation logic.
- **UI removal correctness (Findings 1, 4, 6):** the structural tests in
  §6 items 3–4 are treated as required, not optional, specifically
  because this repository has no DOM render harness — a removed element
  that silently leaves dead, unreachable code behind (rather than being
  fully removed) would not be caught by any existing test category
  without an explicit structural assertion naming it.
- **Post-confirmation label wording (Finding 5):** the exact secondary-
  label copy for a mixed-`costBasisEstablished` count (some items
  derived, some not-established) is left to implementation-task
  judgment; this Plan does not prescribe wording, only the underlying
  binding (`costBasisEstablished` per item, headline reads
  `savedSellingTotal`).

## 8. Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3 and the Rule 8 process
(Current State Assessment → Gap Analysis → Risks → Implementation Plan
→ approval gate → implementation): this Plan is the Implementation Plan
stage. The next step is a companion Implementation Authorization
document, presented for Product Architect signature. **No code,
`firestore.rules`, `firestore.indexes.json`, or test file has been
created, modified, or committed to produce this Plan.**

**Lifecycle:** Rule 8 Assessment (READY) → Implementation Plan (this
document) → Implementation Authorization (not yet drafted, pending
signature) → Product Architect sign-off → Implementation. Not yet
authorized. Not implemented.
