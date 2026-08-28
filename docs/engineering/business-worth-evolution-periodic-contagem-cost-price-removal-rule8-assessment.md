Rule 8 Assessment

# Rule 8 Assessment — Periodic Contagem Cost-Price Removal (§44)

**Governing chain:** [`business-worth-evolution-specification.md`](../specs/business-worth-evolution-specification.md)
§15/FR-67 (✅ Approved) → [`business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`](../specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md)
(proposed §44, ✅ **ACCEPTED AND SIGNED by the Product Architect**, this
project — FR-71 through FR-77 in full, including the resolved §5/§6/§7
decision points).

**Scope of this assessment:** the signed amendment's FR-71 through FR-77,
translating its accepted business decisions into a concrete technical
direction — nothing more, nothing less. **Initial Stock, Product Memory,
the Business Worth formula, Unit Relationship, Mode A/Mode B, multiple
portions, multiple selling prices, and the Selling Price deviation
warning remain explicitly out of scope**, per the amendment's own §6/§16
— this assessment does not touch, resolve, or assume any outcome for any
of them.

**Lifecycle state:** Amendment Accepted & Signed → **Assessed (this
document)** → Implementation Plan NOT YET CREATED → Implementation
Authorization NOT YET CREATED → Implementation NOT YET AUTHORIZED.

**Baseline verified fresh:** `main = origin/main = a0316dc6c3ebd97d18812e9db3f855f366b95121`
(the commit that landed the signed amendment itself), working tree
clean, confirmed via `git fetch` immediately before this assessment
began. The amendment document was read completely and fresh from the
repository as part of this session.

---

## 1. Objective

Determine whether the signed amendment's seven Functional Requirements
are technically safe, fully bounded, and buildable against the actual
current codebase — without inventing new business requirements, without
silently resolving anything the amendment itself left to Rule 8 (the
exact technical shape of "not established," per FR-73), and without
smuggling implementation detail into what should remain a governance
artifact. This assessment identifies exactly what must change, what must
not change, where risk exists, and how that risk is controlled.

## 2. Governance Inputs

Read completely and fresh, in this session:

- `business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
  — full document, all 19 sections, including the signed §19 acceptance.
- `business-worth-evolution-specification.md` §15/FR-20–FR-23 and the
  §42 FR-67 amendment — re-read to confirm the amendment's own citations
  against the actual current text, not from memory of prior sessions.

No documentation-sync discrepancy found: the amendment's own header
already reads "✅ ACCEPTED AND SIGNED," consistent with the governing
instruction under which this assessment was commissioned.

## 3. Accepted Business Constraints (restated, not re-decided)

Every Finding below cites back to one of these:

1. Periodic Contagem's entry UI presents no Owner-editable Cost Price
   input, for any portion, of any unit (FR-71).
2. Where a valid governed cost basis exists, every portion's cost,
   including the purchase-unit portion, derives from that basis — never
   from a typed value (FR-72).
3. Where no valid governed cost basis exists, the system never writes or
   displays a cost figure indistinguishable from a genuine observed
   zero; quantity and Selling Price remain fully recordable and valued
   regardless (FR-73). The exact technical representation is Rule 8's to
   select (amendment §8b, explicit).
4. The live entry screen's secondary cost-total display is removed; the
   Selling Value total remains the sole live total (FR-74).
5. The post-confirmation screen's headline valuation is the counted
   Selling Value; any retained cost figure is secondary and explicitly
   labelled as derived/not-established (FR-75).
6. The history view's cost-basis comparison remains, fed by its existing
   governed basis, not merged with and not elevated above the §22
   reconciliation signal (FR-76).
7. The Cost Price invocation of the price-deviation warning is retired;
   the Selling Price invocation is unaffected; no replacement anomaly
   detector is introduced (FR-77).
8. `StockCountItem.costPrice`, `StockCount.totalValue`, and
   `expectedValueAtCount` are not renamed, removed, or restructured; no
   historical `StockCount` document is altered (amendment §11).
9. `productValuationTotal`, `normalizedTotalSellingValue`,
   `measuredBusinessWorth` are unaffected (FR-71–77 collectively;
   amendment §12).
10. Initial Stock is unaffected in every respect (amendment §6).

## 4. Current-System Evidence

All of the following was verified directly against
`main = a0316dc` in this session.

- **`apps/tenant/src/lib/fr67CostBasisConversion.ts`**,
  `deriveCostContribution` — **already** derives the purchase-unit
  portion's cost from the governed basis when one exists (line ~157–165:
  `hasValidBasis && trimmedUnit` branch applies uniformly, with no
  purchase-unit exception in the derivation itself — only Decision 37's
  own UI layer treated that portion differently). Returns
  `{ value: number, derived: boolean }`. **`derived` is computed and
  returned today, but discarded by every current call site.**
- **`apps/tenant/src/utils/stockCount.ts`**, `normalizeStockCountItems`
  (line 130) and `tallyStockCountRows` (line 301) — both call
  `deriveCostContribution` and destructure only `{ value: costContribution }`,
  discarding `.derived` in both places. Both are the shared,
  single-source functions for persisted (`normalizeStockCountItems`) and
  live-preview (`tallyStockCountRows`) totals respectively — confirmed,
  matching this file's own stated guarantee ("the Owner-facing preview
  and persisted Contagem can never disagree").
- **`tests/contagem-cost-basis-conversion.test.ts:163`** — an existing,
  passing test titled *"the CX portion is derived from the basis, not
  from its own raw entered cost"* — **directly confirms FR-72's
  computational requirement is already fully implemented and already
  covered by regression test today.** FR-72 requires no new calculation
  code.
- **`apps/tenant/src/types.ts`** — `StockCountItem.costPrice: number`
  (required, no `?`). `StockCountItem.sellingPrice?: number` (optional,
  pre-existing). `StockCountItem.valuationMode?: ContagemValuationMode`
  (optional, pre-existing — the established pattern for a
  display-only, non-calculation-affecting marker on this exact type).
  **No field exists today for distinguishing "derived from a governed
  basis" vs. "no basis available, defaulted."**
- **`apps/tenant/src/utils/stockCount.ts`**,
  `StockCountWorkingRow.costPrice: string`, `StockCountTallyItem.costPrice: number`,
  `NormalizedStockCountItem.costPrice: number` — all currently required,
  string- or number-typed, all populated today from either a typed value
  or a governed derivation. None require a type change; a blank/absent
  Owner entry already coerces to `0` in every one of these today (`Number(x) || 0`).
- **`apps/tenant/src/components/PeriodicStockCountView.tsx`**:
  - Purchase-unit portion's cost input: catalog rows, ~2978–2989;
    manual rows, ~3412 region (mirrored). These are the **only two**
    remaining Owner-editable Cost Price render sites in the file — every
    non-purchase-unit portion is already suppressed via
    `isCostFieldSuppressed` (unchanged by this amendment).
  - Live secondary cost total + "vs. Valor Esperado" trend block:
    ~3607–3654, one contiguous `card-dark-gradient` block containing the
    selling-value hero figure (unaffected), the cost-value secondary
    line (`liveTally.totalPurchaseValue`, FR-74 target), and the
    `comparisonBaseline`-driven trend indicator (`diff`/`diffPct`,
    derived from the same `totalPurchaseValue`).
  - Post-confirmation success screen: ~2164–2250. Headline today is
    `savedTotal` (cost, `StockCount.totalValue`) at ~2172–2176 — the
    FR-75 target. `savedSellingTotal` exists today but is **not**
    rendered unconditionally on this screen (only in the optional
    downloadable receipt, `buildReceiptContent`, ~2105).
  - Cost-side deviation warning call sites: ~3014–3021 (catalog rows)
    and ~3447 (manual rows) — exactly 2 of the 4 total
    `getRememberedPriceForRow(row, ...)` call sites the existing test
    suite counts (§4, below).
  - History list: ~3696–3706 — `count.totalValue` and
    `count.expectedValueAtCount`, in a section entirely separate from
    the post-confirmation success screen and the live entry screen.
    Confirmed structurally distinct from, never rendered adjacent to or
    merged with, the §22 reconciliation note (`savedReconciliation`,
    ~2199–2250, which only ever appears on the immediately-following
    success screen, not in history).
- **`apps/tenant/src/lib/priceDeviationCheck.ts`** — `checkPriceDeviation`
  is a pure function, shared across Cost and Selling Price call sites in
  both this file and `AddStockView.tsx`. No change to this function
  itself is implied by FR-77 — only its cost-side *call sites* in
  Periodic Contagem are removed.
- **`tests/price-deviation-warning-wiring.test.ts`** — line ~40 contains
  an explicit, exact assertion: *"is called from both the catalog-row
  and manual-row price fields — 4 call sites total (cost + selling, each
  in both row types)"*, with `assert.equal(callCount, 4)`. **This test
  will fail once the 2 cost-side call sites are removed** and must be
  updated to `assert.equal(callCount, 2)` as a direct, known consequence
  of FR-77 — not a surprise regression.
- **`firestore.rules`**, `stockCounts` `create` rule (line ~647 onward)
  — checks only `type`/`subscriptionAllowsNewRecords`/chain-position
  constraints for `'initial'`-type creates; **no per-item field-shape
  validation exists for periodic (non-`'initial'`) creates.** Adding an
  optional field to `StockCountItem` requires no `firestore.rules`
  change.
- **`firestore.indexes.json`** — no `stockCounts`-item-level index
  exists; confirmed no index implication from any field addition
  considered below.
- **`apps/tenant/src/utils/stockCount.ts`**,
  `workingRowToDraftItem`/`draftItemToWorkingRow` — both round-trip
  `costPrice: string` verbatim, with no parsing/coercion. Confirmed:
  these require **no change** — a permanently-blank `costPrice: ''`
  round-trips exactly as any other blank value already does today.

## 5. Technical Findings

### Finding 1 — Removing the Owner-Editable Cost Price Input (FR-71)

**Severity:** MINOR (Rule-8-resolvable)

**Current state vs. requirement:** exactly two remaining render sites
(catalog-row purchase-unit portion, manual-row purchase-unit portion)
present an editable Cost Price input; every other portion is already
suppressed (Decision 37, unchanged).

**What must change:** both render sites are removed — mirroring exactly
how `isCostFieldSuppressed` already removes the equivalent input for
non-purchase-unit portions today (same conditional-render pattern,
applied unconditionally instead of conditionally). `StockCountWorkingRow.costPrice`
itself is **not** removed from the type — it remains a required `string`
field, simply never populated by user interaction going forward,
functionally identical to how a Not-Counted row's `quantity` field can
also sit permanently blank today without requiring a schema change.

**What must NOT change:** the Selling Price input, at either render
site, in any respect. `isCostFieldSuppressed`'s own logic for
non-purchase-unit portions, unchanged.

**Governance classification:** Fully Rule-8-resolvable. FR-71 is
unambiguous; no Product Architect decision required.

### Finding 2 — Cost Derivation for the Purchase-Unit Portion Is Already Implemented (FR-72)

**Severity:** — (Verification)

**Current state vs. requirement:** `deriveCostContribution` already
derives the purchase-unit portion's cost from the governed basis
whenever `hasValidBasis` is true, with **no purchase-unit exception in
the calculation itself** — confirmed directly (§4, above) and confirmed
by an existing, already-passing regression test
(`contagem-cost-basis-conversion.test.ts:163`). **FR-72 requires zero
new calculation code.** The only thing FR-72 changes, mechanically, is
that this already-correct derivation is no longer occasionally
*overridden for display purposes* by a typed value the Owner can no
longer enter (Finding 1 already removes the only remaining input that
could have done so).

**Governance classification:** Verification. PASS — already
implemented, already tested. No implementation work required for FR-72
beyond Finding 1's own UI removal.

### Finding 3 — Representing "Not Established" (FR-73)

**Severity:** MAJOR (Rule-8-resolvable)

**Current state vs. requirement:** no field exists today distinguishing
a governed-basis-derived cost, a genuinely-zero governed cost, and a
no-basis-available default. `deriveCostContribution`'s own `derived:
boolean` return value already carries exactly this distinction today,
for free, and is currently discarded at both call sites.

**Technical assessment:** the minimal, correct fix threads the
already-existing `derived` flag through to persistence, rather than
inventing new derivation logic. Proposed additive field:

```
StockCountItem.costBasisEstablished?: boolean
```

- `true` — this portion's `costPrice` was derived from a valid governed
  basis (`derived === true` from `deriveCostContribution`), including
  the purchase-unit portion (Finding 2).
- `false` — no valid governed basis existed for this product; `costPrice`
  is `0` and must be treated as **not established**, never as a genuine
  observed/derived zero.
- **Absent** — every `StockCountItem` persisted before this amendment
  ships, exactly matching this codebase's own established convention
  for every prior optional-field addition to this type
  (`sellingPrice?`, `valuationMode?`, `expectedValueAtCount?` on the
  parent `StockCount`).

This satisfies FR-73's business requirement (distinguishable from a
genuine zero) using the narrowest possible schema change — one optional
boolean, sourced from a value the codebase already computes today and
currently throws away, on a type that already has precedent for exactly
this kind of display-only marker (`valuationMode`'s own header comment:
*"NEVER read by any valuation calculation... purely so the Owner... can
see HOW a price was arrived at"* — the identical shape of guarantee this
new field needs).

**What must NOT change:** `costPrice` itself remains a required
`number`, always `0` in the not-established case — never `null`, never
optional — preserving every existing consumer's type expectations
without modification. No change to `deriveCostContribution`'s own
signature or logic; `.derived` is exposed by its callers, not recomputed.

**Governance classification:** Rule-8-resolvable. The amendment's §8b
explicitly reserved the technical shape for Rule 8; this Finding selects
it. No new Product Architect decision required — the business
requirement (distinguishable from zero) was already fixed by FR-73
itself.

### Finding 4 — Live Secondary Cost Total and Trend Indicator (FR-74)

**Severity:** MINOR (Rule-8-resolvable)

**Status: RESOLVED — confirmed by explicit Product Architect
clarification, this project.** One contiguous block
(`PeriodicStockCountView.tsx` ~3607–3654) contains three elements: the
selling-value hero figure (unaffected), the cost-value secondary line,
and a `comparisonBaseline`-driven trend indicator computed from the same
`totalPurchaseValue` the secondary line displays. This assessment
originally flagged, rather than assumed, whether FR-74's "sole live
total" language was intended to cover the trend indicator as well as the
raw total line. **The Product Architect has confirmed explicitly: FR-74
means the live Periodic Contagem screen shows Selling Value as the sole
live total, and the live cost total and its "vs. Valor Esperado" trend
indicator are both removed.** No ambiguity remains.

**What must change:** the entire block from the cost-value secondary
line through its trend indicator is removed. The selling-value hero
figure's own markup, position, and calculation are untouched.

**Governance classification:** Rule-8-resolvable, confirmation received.
No further Product Architect input required for this Finding.

### Finding 5 — Post-Confirmation Headline Re-Anchoring (FR-75)

**Severity:** MINOR (Rule-8-resolvable)

**Current state vs. requirement:** `savedTotal` (cost) is the
unconditional headline (~2172–2176); `savedSellingTotal` exists in
component state already (populated at confirmation time, ~2044) but is
currently rendered only inside the optional downloadable receipt, never
on-screen.

**What must change:** the on-screen headline swaps to render
`savedSellingTotal` in the position/prominence `savedTotal` currently
occupies. A cost-basis figure, if retained at all, is demoted to
secondary presentation, explicitly labelled to reflect §8b's
derived/not-established distinction (Finding 3) — e.g. reading whether
every counted item's `costBasisEstablished` is uniformly `true`,
uniformly `false`, or mixed, to select an accurate label; the exact
copy/label wording is a UI-content detail this assessment does not
prescribe.

**What must NOT change:** the optional downloadable receipt
(`buildReceiptContent`) already shows both totals side by side today
and requires no change under this amendment — it was never the
"headline" FR-75 concerns.

**Governance classification:** Rule-8-resolvable. FR-75 is explicit
about which figure becomes the headline; exact secondary-label wording
is implementation detail, not decided here.

### Finding 6 — History / Expected-Value Comparison (FR-76)

**Severity:** — (Verification, with one minor confirmation)

**Current state vs. requirement:** the history list (~3696–3706) is
structurally separate from the post-confirmation success screen and
from the §22 reconciliation note — confirmed directly, they are
different components of the render tree, never rendered together, never
merged. FR-76 requires the comparison remain available, unmerged, and
not elevated above §22's signal.

**Assessment:** **already true today, structurally** — the two were
never adjacent or competing to begin with (§22's note only ever appears
transiently on the confirmation screen; history is a separate,
persistent, on-demand section). No code change is required to satisfy
FR-76's "not merged"/"not elevated" requirements; they are already
satisfied by the existing layout. **This Finding recommends explicit
confirmation (a small regression test asserting the two remain
structurally distinct) rather than a code change**, since there is
nothing currently violating the requirement.

**Governance classification:** Verification, PASS, with a recommended
(not required) regression test named in §15, below.

### Finding 7 — Cost Price Deviation Warning Retirement (FR-77)

**Severity:** MINOR (Rule-8-resolvable)

**Current state vs. requirement:** exactly 2 of the 4 existing
`getRememberedPriceForRow(row, ...)` call sites are cost-side (one per
row type); the other 2 are selling-side. `priceDeviationCheck.ts`
(`checkPriceDeviation`) itself is unmodified — it is a shared pure
function also used by `AddStockView.tsx`, entirely outside this
amendment's scope.

**What must change:** the 2 cost-side call sites, and their associated
warning-rendering JSX (the amber deviation message blocks at ~3014–3021
and ~3447), are removed. This is a direct, mechanical consequence of
Finding 1 removing the input those warnings were attached to — a warning
cannot fire against a field that no longer accepts typed input.

**What must NOT change:** `checkPriceDeviation`,
`PRICE_DEVIATION_WARNING_THRESHOLD`, and both selling-side call sites,
in any respect. `AddStockView.tsx` is entirely untouched.

**Known, expected test impact:** `tests/price-deviation-warning-wiring.test.ts`'s
existing `assert.equal(callCount, 4)` assertion must become
`assert.equal(callCount, 2)` (§4/§15).

**Governance classification:** Rule-8-resolvable. FR-77 explicitly
forbids inventing a replacement — this Finding proposes none.

## 6. Finding-by-Finding Rule 8 Decisions

| # | Finding | Severity | Classification | Decision |
|---|---|---|---|---|
| 1 | Remove Owner-editable Cost Price input | MINOR | Rule-8-resolvable | Remove 2 remaining render sites; no `StockCountWorkingRow` schema change |
| 2 | Purchase-unit portion derivation | — | Verification | PASS — already implemented, already tested |
| 3 | "Not established" representation | MAJOR | Rule-8-resolvable | New `StockCountItem.costBasisEstablished?: boolean`, sourced from the already-computed, currently-discarded `derived` flag |
| 4 | Live secondary cost total + trend | MINOR | Rule-8-resolvable | Remove entire cost-comparison block (total + trend indicator) — confirmed by Product Architect |
| 5 | Post-confirmation headline | MINOR | Rule-8-resolvable | Swap headline to `savedSellingTotal`; demote/label cost figure per Finding 3 |
| 6 | History comparison vs. §22 | — | Verification | PASS — already structurally separate |
| 7 | Cost deviation warning retirement | MINOR | Rule-8-resolvable | Remove 2 cost-side call sites + their JSX; selling-side untouched |
| 8 | Tenant isolation / security rules | — | Verification | PASS — no `firestore.rules` change |
| 9 | Firestore indexes | — | Verification | PASS — no index change |
| 10 | Concurrency / atomicity | — | Verification | PASS — existing single-batch commit suffices |
| 11 | Backward compatibility | — | Verification | PASS — optional-field pattern, no migration |
| 12 | Business Worth impact | — | Verification | PASS — confirmed unaffected |
| 13 | Testing strategy | MINOR | Rule-8-resolvable | Test plan named (§15) |

## 7. Data Model Assessment

**Additive only, on one existing type**, consistent with this
codebase's own established optional-field pattern:

```
StockCountItem {
  ...unchanged...
  costBasisEstablished?: boolean;  // Finding 3 — true when costPrice was derived
                                    // from a valid governed basis (incl. the
                                    // purchase-unit portion); false when no
                                    // basis existed and costPrice is 0/not
                                    // established; absent on every item
                                    // persisted before this amendment ships.
                                    // NEVER read by any valuation calculation
                                    // (mirrors valuationMode's own existing
                                    // discipline) — display/audit-only.
}
```

No change to `StockCount`, `StockCountWorkingRow`,
`InitialStockDraft`/`InitialStockDraftItem`, `Product`, `StockBatch`, or
any other type. No change to any collection's document-id scheme.

## 8. Lifecycle/Confirmation Assessment

Owner opens Periodic Contagem → catalog/manual rows render with no cost
input for any portion (Finding 1) → Owner enters quantity + selling
price only → on submit, `tallyStockCountRows`/`normalizeStockCountItems`
resolve each portion's cost via the existing, unmodified
`deriveCostContribution` (Finding 2) → each function's caller now
captures `.derived` alongside `.value` and writes
`costBasisEstablished` accordingly (Finding 3) → confirmation proceeds
through the existing, unmodified atomic `recordStockCount` write — no
change to its batch-write, submission-identity, or
`BusinessWorthSnapshot` construction logic in any respect → success
screen renders the Selling Value headline (Finding 5) → history, when
later viewed, shows the unaffected cost comparison (Finding 6).

## 9. Business Worth Impact Assessment

**PASS, confirmed unaffected.** `productValuationTotal`,
`normalizedTotalSellingValue`, and `measuredBusinessWorth` are computed
identically to today — none of Findings 1–7 touch
`recordStockCount`'s selling-basis computation path, `Mode A`/`Mode B`,
or any `BusinessWorthSnapshot` field. `costBasisEstablished` (Finding 3)
is explicitly display/audit-only, mirroring `valuationMode`'s own
existing "never read by any valuation calculation" guarantee.

## 10. Backward Compatibility

Every historical `StockCountItem` — of any age — is unaffected. The new
`costBasisEstablished` field is optional and absent on all of them,
exactly matching this codebase's own established pattern for every
prior optional field added to this type. No migration, no backfill.

## 11. Tenant Isolation/Security

PASS. No `firestore.rules` change required — confirmed no per-item field
validation exists today for periodic `StockCount` creates, and none is
proposed.

## 12. Concurrency/Atomicity

PASS. `recordStockCount`'s existing single-Firestore-batch-write
discipline for `StockCount` + `BusinessWorthSnapshot` is entirely
untouched by any Finding above.

## 13. Performance

Negligible. One boolean field addition per item; two render-site
removals; no new query, no new read, no new computation beyond what
`deriveCostContribution` already performs today.

## 14. Failure/Recovery

Unaffected. A failed or ambiguous confirmation attempt behaves exactly
as today — the removed input fields have no bearing on the existing
submission-identity idempotency mechanism.

## 15. Testing Strategy

**Known, required update (not new coverage — an existing assertion made
false by FR-77):**
- `tests/price-deviation-warning-wiring.test.ts` — update
  `assert.equal(callCount, 4)` to `assert.equal(callCount, 2)`; add an
  explicit assertion that the 2 remaining call sites are both
  `'selling'`, never `'cost'`.

**New coverage needed:**
- `costBasisEstablished` — assert `true` for a governed-basis portion
  (including the purchase-unit portion specifically, extending
  `contagem-cost-basis-conversion.test.ts`'s existing line-163 case),
  `false` for a no-basis portion, and absent when the parameter is
  omitted entirely (mirrors this file's own existing
  "absent a cost basis map... behavior is byte-for-byte unchanged" test
  at line 236).
- A structural/source-check test (matching this repository's established
  no-DOM-harness pattern, e.g. `periodic-stock-cost-field-suppression.test.ts`'s
  own approach) confirming no Cost Price `<input>` render path remains
  for the purchase-unit portion in `PeriodicStockCountView.tsx`.
- A structural test confirming the live-entry cost-total/trend block
  (Finding 4) is absent from the component source.
- A structural test confirming the post-confirmation headline binding
  reads `savedSellingTotal`, not `savedTotal` (Finding 5).
- **Recommended, not required (Finding 6):** a structural test asserting
  the history list's cost comparison and the §22 reconciliation note
  remain rendered by separate, non-nested component regions — codifying
  the already-true "not merged/not elevated" property, so a future
  refactor cannot silently violate FR-76.

**Existing tests confirmed unaffected, not requiring changes:**
`contagem-cost-basis-conversion.test.ts` (all current assertions remain
true; new assertions are additive, per above);
`periodic-stock-cost-field-suppression.test.ts` (non-purchase-unit
suppression logic, unchanged by this amendment); every Selling-Price
regression test in any file (untouched calculation path); every Initial
Stock test (out of scope entirely).

## 16. Migration/Backfill Assessment

None required, none proposed. `costBasisEstablished`'s absence on every
historical item is itself the correct, permanent, accurate historical
state — matching this codebase's established "absence is the default"
convention for this exact class of field.

## 17. Explicitly Out of Scope

Consistent with the amendment's own §6/§16:

- Initial Stock, in every respect.
- Product Memory (`BDR-0012`).
- Purchase-entry (+Stock) behavior.
- The Business Worth formula, `productValuationTotal`,
  `normalizedTotalSellingValue`, `measuredBusinessWorth`.
- Unit Relationship, `getConversionFactor`.
- Mode A / Mode B mechanics.
- Multiple portions, multiple selling prices.
- The Selling Price deviation warning, and `checkPriceDeviation` itself.
- Any new cost-anomaly-detection mechanism.
- Any Policy (`POL-NNNN`) document — none is drafted or assigned here.
- Exact UI copy, layout, or typography for any retained/redesigned
  display — Findings 4/5 fix the governing principle, not pixel-level
  detail.

## 18. Governance Boundary Violation Scan

Explicit check, performed against every Finding above:

- **Finding 3** (schema shape for "not established") — the amendment's
  own §8b explicitly reserved this for Rule 8; not a new business
  decision, since the underlying requirement (distinguishable from zero)
  was already fixed by FR-73 itself. Reasoning given in-Finding for
  auditability.
- **Finding 4** (scope of "sole live total") — originally flagged as a
  textual interpretation rather than silently assumed; now resolved by
  explicit Product Architect confirmation (§19, below), not by Rule 8
  overriding or narrowing the amendment's own text.
- **No Finding proposes new business logic, a new warning mechanism, a
  new valuation formula, or any change to Business Worth, Unit
  Relationship, Mode A/B, or Initial Stock.**
- **No Finding reopens, reinterprets, or narrows any of FR-71 through
  FR-77's own accepted text.**

**No item remains flagged for Product Architect confirmation.** Every
Finding, including Finding 4, is resolved.

## 19. Final Rule 8 Verdict

**READY. No remaining flagged ambiguity.**

Every Finding is either a **PASS** (existing architecture already
satisfies the requirement — Findings 2, 6, 8–12) or **fully
Rule-8-resolvable** (a technical shape selected from what the signed
amendment already fixes, with no open business question — Findings 1, 3,
4, 5, 7, Finding 4 now confirmed rather than flagged). **No Finding
requires further Product Architect decision.** The signed amendment
already fixed every business-level question this assessment needed; this
document only selects technical shapes among already-conforming options,
confirms existing architecture already satisfies several requirements
outright, and — for the one item that required it — carries an explicit
Product Architect confirmation rather than an assumption.

**"READY" means technically ready for the next governance gate — an
Implementation Plan, followed by a signed Implementation Authorization.
It does not mean implementation is authorized.** No code, `firestore.rules`,
index, or test file has been created or modified to produce this
assessment.

---

## Verification Performed for This Assessment

- The signed amendment document read completely and fresh from the
  repository.
- `business-worth-evolution-specification.md` §15/FR-20–FR-23/FR-67
  re-read directly.
- `apps/tenant/src/lib/fr67CostBasisConversion.ts` read in full,
  including its `derived` return field and header comment.
- `apps/tenant/src/utils/stockCount.ts` — `normalizeStockCountItems`,
  `tallyStockCountRows`, `workingRowToDraftItem`, `draftItemToWorkingRow`,
  and all four relevant type definitions read directly.
- `apps/tenant/src/types.ts` — `StockCountItem` read directly to confirm
  exact current field shapes and optionality.
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — every cited
  line range (cost input render sites, live entry hero block,
  post-confirmation success screen, history list, deviation-warning call
  sites) read directly, not inferred.
- `apps/tenant/src/lib/priceDeviationCheck.ts` read in full.
- `firestore.rules` — `stockCounts` `create`/`update`/`delete` block
  read directly; confirmed no per-item field validation exists.
- `firestore.indexes.json` — grepped for any `stockCounts`-related
  entry (none found).
- `tests/contagem-cost-basis-conversion.test.ts`,
  `tests/periodic-stock-cost-field-suppression.test.ts`,
  `tests/price-deviation-warning-wiring.test.ts` — test names and
  relevant assertion bodies read directly to confirm existing coverage
  and identify the one known required test update (Finding 7).
- `git fetch` run immediately before this assessment began; confirmed
  `main = origin/main = a0316dc`, working tree clean.
- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or
  `tests/` file was modified to produce this assessment.
- No Specification or amendment artifact was modified to produce this
  assessment.
- No Implementation Plan or Implementation Authorization was created.

**This document does not itself authorize implementation.** It is a
readiness opinion only, per this repository's established Rule 8
discipline — an Implementation Plan and a separate, signed
Implementation Authorization remain the required next gates.

---

## 20. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed this Rule 8 Assessment in full, including Finding 3's
> proposed `costBasisEstablished` field shape and Finding 4's scope
> reading. I confirm: FR-74 means the live Periodic Contagem screen
> shows Selling Value as the sole live total, and the live cost total
> and its "vs. Valor Esperado" trend indicator are both removed. Finding
> 4 is resolved with no remaining ambiguity. This Rule 8 Assessment is
> **READY**, and I accept its verdict in full. **ACCEPTED and SIGNED**,
> effective this session. Next governance gate: Implementation Plan.

This acceptance authorizes proceeding to the Implementation Plan stage.
It does not, on its own, authorize any code change — a signed
Implementation Authorization remains required after the Implementation
Plan.
