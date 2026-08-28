Business Domain Specification — Amendment

# Periodic Contagem Cost-Price Removal Amendment
## (Proposed §44 of the Business Worth Evolution Specification)

**Status:** ✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**

The substantive §5/§6/§7 decision points this draft previously left open
were reviewed and accepted by the Product Architect (this session), this
document was rewritten accordingly as a coherent governance amendment,
and the complete, assembled amendment — FR-71 through FR-77 in full —
has now been formally **ACCEPTED AND SIGNED** (§19, below). This
amendment is governance-approved. It does not, on its own, authorize
implementation — it does not itself constitute a Rule 8 Assessment or an
Implementation Authorization, both of which remain separate, subsequent
gates (§17). The tracked parent Specification has not been edited by
this acceptance; this remains a standalone file pending its eventual
merge into `business-worth-evolution-specification.md` as §44.

---

## 1. Numbering / Filing (verified before finalizing)

Re-verified against `origin/main` immediately before this revision:
working tree clean, local `HEAD` identical to `origin/main` (commit
`fa86c88`), no new commits landed since the prior investigation passes.

- `business-worth-evolution-specification.md`'s highest existing
  in-document amendment section remains **§43** (no gap) — **§44**
  remains the next collision-free slot for this amendment, exactly as
  previously identified. Not renumbered.
- The highest existing FR in that Specification remains **FR-70** —
  **FR-71** and **FR-72** remain collision-free. Not renumbered.
- The `POL-NNNN` cross-cutting namespace's explicit-assignment
  requirement (`19-governance-bdr-policy-framework.md` Numbering Ledger)
  does not apply here — this amendment is not a `POL-NNNN` document, and
  does not touch `POL-0010`.
- **The §44 slot itself is proposed, not finalized** — it becomes
  authoritative only if and when the Product Architect formally accepts
  this document and it is merged into the tracked parent Specification.
  This draft continues to be filed as a **separate, standalone file**
  (unchanged filename:
  `docs/specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`),
  consistent with this repository's existing practice of housing several
  Specification amendments as standalone files rather than in-place
  edits (e.g. `10-expected-stock-value-amendment.md`).

---

## 2. Purpose

This amendment removes the Owner's Cost Price entry step from **Periodic
Contagem**, replacing it with governed, automatic cost derivation where
a reliable cost basis exists, and an explicit "not established" state
where it does not. It resolves the Owner-facing and diagnostic
consequences of that removal — which cost-related displays remain, which
are retired, and what happens to the one Cost-Price-dependent warning —
so that removing Owner input does not silently produce misleading data
anywhere downstream.

**Core governance principle established by this amendment:**

> In Periodic Contagem, the Owner observes quantities and establishes
> selling prices; the system derives cost information when a reliable
> governed cost basis exists. Cost information must never interfere
> with, obscure, or redefine selling-price business valuation.

**Preserved, restated Contagem principle (unchanged by this amendment,
stated here for context):**

> Periodic Contagem records physical observation. It does not become a
> manual cost-accounting exercise merely because governed cost
> information may be useful elsewhere.

**This amendment does not decide that Cost Price is useless.** Cost
information retains legitimate historical, diagnostic, reconciliation,
and audit value where it can be reliably known — this amendment changes
*who supplies it and how it is presented*, not whether it matters at
all. It likewise does not delete Cost Price from the system: it removes
Owner entry in one specific screen, while existing persisted schema and
history are explicitly preserved (§13).

---

## 3. Existing Governance Lineage

- [`business-worth-evolution-specification.md`](./business-worth-evolution-specification.md)
  §15 ("Multi-Unit Valuation (Contagem-Specific)"), FR-20–FR-23, and the
  §42 amendment's FR-67 ("Cost-basis preservation across portions —
  deterministic, always-on, never Owner-configurable") — the direct
  governing lineage for cost-basis derivation.
- `src/lib/fr67CostBasisConversion.ts` and
  `src/lib/contagemMultiUnitValuation.ts` — existing, unmodified
  implementation of FR-67 and Mode A respectively.
- The code-level "Decision 37" (Business Worth Evolution — Decision 37,
  B.4: Cost-Field Suppression on Non-Purchase-Unit Portions),
  referenced inline in `PeriodicStockCountView.tsx`. **Only the part of
  Decision 37 governing the purchase-unit portion's field
  visibility/editability is superseded by this amendment (§7, below).
  The part of Decision 37 governing suppression of the cost field for
  every non-purchase-unit portion is unchanged and remains in full
  force** — this amendment does not discard Decision 37 as a whole.
- `docs/specs/10-stock-counts.md` (BDS #10) — referenced for context
  (the `StockCountItem.costPrice` schema and the Expected Current Stock
  Value comparison it defines); **not amended by this draft** (§6, §13).
- `docs/specs/BDR-0009-stock-count-physical-observation.md` — the
  "physical observation, not reconciliation" framing this amendment is
  checked against and found consistent with, and arguably strengthened
  by (§4, below).
- `priceDeviationCheck.ts` (`checkPriceDeviation`,
  `PRICE_DEVIATION_WARNING_THRESHOLD`) — the shared manual-entry-typo
  check this amendment partially retires (§12, below).

**Does not amend:** `POL-0010`; the source BDR
(`BDR-pending-business-worth-evolution-measurement-model.md`);
`10-stock-counts.md` or its three existing amendments; `BDR-0012`;
`BDR-0014` or its companion amendments; `InitialStockCountView.tsx`'s
governed behavior; `02-business-worth-engine.md`; the Selling Price
deviation warning; any Firestore rule, schema, index, or application
code.

---

## 4. Problem / Real-User Evidence

Real-user testing of the live platform showed that Cost Price entry
during Periodic Contagem creates friction disproportionate to its value
for the Owner's actual task. Direct repository investigation (this
session, three prior passes) established, as fact:

1. Business Worth (`BusinessWorthSnapshot.measuredBusinessWorth`, via
   `productValuationTotal = normalizedTotalSellingValue`) is already
   computed entirely from selling price. Cost Price entry during
   Periodic Contagem has never affected Business Worth.
2. FR-67 already establishes, as signed principle, that cost is "a fact
   to compute, not a preference to set," and already derives it
   automatically for every portion except the purchase-unit portion.
3. The purchase-unit portion's field remains visible/editable today only
   because of Decision 37's own deliberate UI choice — not because any
   calculation depends on what is typed there. Where a governed basis
   exists, the typed value is already silently overridden.
4. Cost-basis figures remain actively rendered in three places today —
   this amendment does not pretend they are dormant; it makes an
   explicit decision about each (§9).
5. Periodic Contagem does not currently hard-require Cost Price — blank
   already silently coerces to `0`. This amendment does not remove a
   requirement; it removes an inconsistent input opportunity and
   replaces it with one consistent, honest rule (§8).

The underlying principle — *Cost Price is a fact to compute, not an
Owner-discretionary valuation input* — is already decided (FR-67). This
amendment completes that principle's reach to the one portion Decision
37 deliberately left open, and resolves the consequences of doing so.

---

## 5. Exact Scope

**This amendment applies to Periodic Contagem only.**

## 6. Explicit Non-Scope

This amendment explicitly does **not** change:

- **Initial Stock** (`InitialStockCountView.tsx`) — its hard-required
  Cost Price validation and its role in `initialCapitalValue`/
  `initialCapitalBasis` (`BDR-0014`) are completely untouched.
- **Product Memory** (`BDR-0012`) — remembered cost/selling price
  mechanics and pre-fill behavior are unchanged.
- **Purchase-entry (+Stock) behavior** — untouched, including its
  existing single-purchase-unit/single-cost-unit/single-selling-unit
  model (FR-22).
- **The Business Worth formula** — `productValuationTotal`,
  `normalizedTotalSellingValue`, `measuredBusinessWorth` (§14, below).
- **Unit Relationship** — `Product.unitRelationship`,
  `getConversionFactor`, and confirmed-chain conversion, in every
  respect.
- **Mode A** (reference-price conversion) and **Mode B** (multiple
  independently-priced portions) — mechanics unchanged.
- **Multiple portions** and **multiple selling prices** — unchanged.
- **The Selling Price deviation warning** — unaffected; continues to
  operate exactly as today (§12).
- Existing conversion and rounding discipline (`POL-0001`/`POL-0002`).
- Tenant/business isolation, atomic confirmation, and submission-identity
  idempotency (§15).

---

## 7. Product Architect Decision — Partial Supersession of Decision 37

**[ACCEPTED]**

The part of Decision 37 (B.4) that keeps the purchase-unit portion's
Cost Price field **visible and Owner-editable** in Periodic Contagem is
**superseded**. The part of Decision 37 governing suppression of the
cost field for **non-purchase-unit** portions is **unchanged and remains
in full force** — this amendment narrows one specific carve-out within
Decision 37; it does not discard Decision 37 as a whole.

**New principle:** During Periodic Contagem, Cost Price is never an
Owner-entered field, for any portion, regardless of unit.

**FR-71 [new, accepted].** Periodic Contagem's entry UI must not present
an Owner-editable Cost Price input for any counted portion, of any unit
— superseding the purchase-unit-portion carve-out in Decision 37 (B.4)
specifically. Quantity, unit, and Selling Price entry are unaffected.
This applies to Periodic Contagem only; Initial Stock is unaffected.

---

## 8. Cost-Basis Derivation

### 8a. Governed case — FR-72

**[ACCEPTED]**

Where a valid governed cost basis already exists for a product
(`Product.costPrice` valid and non-negative, `Product.unitRelationship`
confirmed and valid — the existing `hasValidBasis` condition
`deriveCostContribution` already implements), the system continues to
derive every portion's cost contribution — now including the
purchase-unit portion, without exception — from that basis, via the
existing, unmodified `getConversionFactor` engine. No new conversion
logic, rounding rule, or derivation authority is introduced; the
existing `Product.costPrice`, governed `StockBatch` cost basis, confirmed
Unit Relationship, `getConversionFactor`, and existing conversion/
rounding discipline are not redesigned. This closes the remaining
Owner-facing input; it does not change the underlying governed
calculation.

**FR-72 [new, accepted].** For a product with a valid governed cost
basis (as defined by FR-67/`deriveCostContribution`'s existing
`hasValidBasis` condition), `StockCountItem.costPrice` for every portion,
including the purchase-unit portion, is populated from that governed
basis at confirmation time — never from an Owner-typed value, since none
is collected. This is a continuation of FR-67's existing computational
behavior; it introduces no new arithmetic, and does not redesign
`Product.costPrice`, the governed `StockBatch` cost basis, the confirmed
Unit Relationship, or `getConversionFactor`.

### 8b. No-governed-cost-basis case

**[ACCEPTED — Option A]**

When no valid governed cost basis exists for a product (no confirmed
`Product.costPrice` + `unitRelationship` combination — e.g. a genuinely
new product counted for the first time with no prior purchase history),
the system must **not** fabricate a Cost Price of `0` and present it as
a real, observed fact. Quantity and Selling Price remain fully
recordable and fully usable for selling-price valuation and Business
Worth in this case — nothing about counting or valuing the product is
blocked or degraded by the absence of a known cost. The portion's cost
status is instead represented as **explicitly unknown/not established**,
distinct in every respect from a genuine zero/free-cost outcome, in
every surface that would otherwise display it.

**This governance decision fixes the business requirement only.** The
exact field/marker shape used to represent "unknown/not established"
(e.g. a boolean flag, an omitted field, a sentinel value, or some other
mechanism) is explicitly **not decided here** — that is left to Rule 8
and implementation design, constrained only by the requirement that
"unknown" and "genuine zero" must never be indistinguishable in stored
data or in any display.

**FR-73 [new, accepted].** When no valid governed cost basis exists for
a counted product, the system must not write or display a Cost Price
value that is indistinguishable from a genuinely observed zero/free
cost. Quantity and Selling Price for that portion are recorded and
valued normally, in full, independent of cost-basis availability. The
specific technical representation of "cost not established" is reserved
for Rule 8 / implementation design and is not fixed by this FR.

---

## 9. Cost-Basis Diagnostic Displays

Three currently-active Owner-facing surfaces read cost-basis figures.
Each is decided separately.

**9a. Live entry — secondary cost-total line ("Valor Físico (Custo)
Contado até Agora") and its "vs. Valor Esperado" trend indicator.**

**[ACCEPTED FOR RETIREMENT — total line only; see 9b for the comparison
figure's disposition elsewhere]** The live secondary cost-total display
is retired. It offered no interaction the Owner could act on while
counting, and its cost basis is no longer something the Owner observes
in the moment. The live selling-value total remains the sole live total
shown during entry — this amendment does not remove or alter the
selling-price calculation or its display in any way.

**FR-74 [new, accepted].** The Periodic Contagem live entry screen's
secondary cost-total display is removed. The selling-value total remains
the sole live total shown during entry, unmodified.

**9b. Post-confirmation display.**

**[ACCEPTED]** The post-confirmation screen's headline valuation
becomes the **Selling Value counted**, aligning the confirmation screen
with the live entry experience and with selling price's role as the
basis driving Business Worth. If cost-basis information remains visible
on this screen at all, it is secondary, and explicitly labelled as
derived (or "not established," per §8b, where applicable) — never
presented as though the Owner personally observed or entered it during
this Contagem. Exact layout/typography is not prescribed here.

**FR-75 [new, accepted].** The Periodic Contagem post-confirmation
screen's headline valuation figure is the counted Selling Value. Any
cost-basis figure retained on this screen is secondary in presentation
and explicitly labelled to reflect its derived or not-established
provenance, never presented as an Owner-observed figure.

**9c. History / expected-value cost comparison
(`totalValue`/`expectedValueAtCount`).**

**[ACCEPTED]** This diagnostic remains available. It continues to use
its existing governed cost basis (`Confirmed Initial Capital + cost
value of governed StockBatch inventory`, `10-expected-stock-value-
amendment.md` Part 2) and was never dependent on Owner-entered Cost
Price during Contagem — it is unaffected computationally by this
amendment. It is not silently deleted, and it is not merged into the
Business Worth Evolution reconciliation signal (§22 of the parent
Specification). However, it must not be elevated above §22's signal, and
must not be presented as a competing Business Worth valuation — it
retains its own governed meaning, distinct from and subordinate in
presentation prominence to §22's.

**FR-76 [new, accepted].** The Periodic Contagem history view's cost-
basis "vs. Valor Esperado" comparison remains available, fed by its
existing governed cost basis, unaffected by the removal of Owner-entered
Cost Price. It is not merged with, and must not be presented with equal
or greater prominence than, the Business Worth Evolution reconciliation
signal (§22 of the parent Specification).

---

## 10. Cost Price Deviation Warning

**[ACCEPTED FOR RETIREMENT — cost side only]**

The existing warning (`checkPriceDeviation`, shared by both Cost Price
and Selling Price fields) exists to catch manual data-entry mistakes —
"a freshly-typed cost or selling price... compared against the
product's own remembered price" to flag a fat-finger typo
(`priceDeviationCheck.ts`, header comment). Its entire precondition is a
freshly-typed value to check. With FR-71 removing Owner Cost Price entry
entirely, no such value exists to check for cost. The warning's
cost-side invocation therefore loses its purpose and is retired.

**No replacement anomaly detector is introduced by this amendment.** A
check comparing a *derived* cost value against a remembered one would be
a fundamentally different mechanism (a data-integrity/anomaly check, not
a typo-catcher) with no existing specification, threshold philosophy, or
justification in this repository — inventing one here would exceed this
amendment's scope.

**The Selling Price deviation warning is entirely unaffected** and
continues to operate exactly as today, since Selling Price remains
Owner-typed.

**FR-77 [new, accepted].** The Cost Price invocation of the price-
deviation warning (`checkPriceDeviation`) is retired in Periodic
Contagem. The Selling Price invocation of the same shared function is
unaffected and continues to operate unchanged. This amendment does not
introduce any replacement cost-anomaly-detection mechanism.

---

## 11. Data / History Compatibility

Four distinct things must not be conflated, and this amendment addresses
each separately:

- **Owner input removal** (§7, FR-71) — a UI-layer change only.
- **Computational cost derivation** (§8, FR-72/FR-73) — an extension of
  already-governed FR-67 logic, not a new calculation engine.
- **Stored historical/persisted cost fields** — `StockCountItem.costPrice`,
  `StockCount.totalValue`, and `expectedValueAtCount` retain their
  existing names, types, and optionality exactly as currently defined in
  `types.ts` and BDS #10. **This amendment does not rename, remove, or
  restructure any existing persisted field.** Every historical
  `StockCount` document, of any age, is unaffected — this amendment only
  concerns how a *future* Periodic Contagem's `costPrice` values are
  populated going forward.
- **Cost display** (§9) — decided independently per surface, above.
- **Business Worth selling valuation** (§14) — entirely unaffected by
  any of the above.

**What changes:** what is Owner-observable during entry (no cost input,
per FR-71); the *source* of `StockCountItem.costPrice` going forward
(governed-basis-derived, or explicitly not-established, per FR-72/FR-73,
rather than Owner-typed or silently zeroed); which diagnostic surfaces
render it (§9).

**What does not change:** field names, types, schema shape; every
downstream consumer not named in this amendment (e.g. the selling-basis
valuation path, which never read `costPrice` and remains untouched);
any already-confirmed historical `StockCount`.

**Audit note, not resolved by this amendment:** a `StockCountItem.
costPrice` value on a post-amendment count represents a system-derived
(or explicitly not-established) figure rather than an Owner-observed
one — a change in epistemic status, though not in schema position.
Whether this warrants an additional field distinguishing pre- and
post-amendment records, or whether it is sufficient that every count
confirmed after this amendment ships is understood platform-wide to
carry derived cost, is left to Rule 8 (§8b already establishes that
"unknown" and "zero" must be distinguishable in whatever form Rule 8
selects).

---

## 12. Business Worth Invariant

**[Restated, not newly established]**

This amendment does **not** change `productValuationTotal`,
`normalizedTotalSellingValue`, `measuredBusinessWorth`, or their
selling-price basis, in any respect. None of these read
`StockCountItem.costPrice` today, and nothing in this amendment
introduces such a dependency. The selling-price valuation path — Mode
A/B, `deriveModeAPortionValuations`, `sumModeAPortionValuations`, and
their write-back into each portion's `sellingPrice` field — is entirely
untouched by this amendment.

---

## 13. Safety / Integrity Boundaries Preserved

- **Physical observation nature of Contagem** (`BDR-0009`) — Quantity
  remains a pure Owner physical observation, untouched. This amendment
  concerns price, never quantity, and arguably strengthens BDR-0009's
  own framing by removing a price-entry step that was never itself a
  physical observation to begin with.
- **Unit conversion authority** — `getConversionFactor` remains the sole
  conversion engine for both cost and selling derivation, unmodified.
- **Rounding rules** — unchanged (`POL-0001`/`POL-0002`).
- **Tenant/business isolation** — unaffected.
- **Atomic confirmation behavior** — `recordStockCount`'s existing
  single-batch-write discipline is untouched.
- **Multi-portion behavior** — Mode B's unconditional multi-portion
  support is unaffected in every respect other than cost-field
  visibility.

---

## 14. Acceptance Examples (corrected figures)

**Example 1 — Mode A, single reference selling price:**

Product: Lite 330ml. Unit Relationship: `1 cx = 4 emb = 24 un` ⟹
`1 emb = 6 un`. Counted: `4 cx + 3 emb + 3 un`.

```
4 cx  = 4 × 24 = 96 un
3 emb = 3 × 6  = 18 un
3 un  = 3 × 1  =  3 un
                 -------
Total          = 117 un-equivalent
```

At a single reference selling price of `75 MZN/un` (Mode A):
```
117 × 75 = 8,775 MZN
```
No Cost Price entry is required or shown for any of the three portions.
This figure is entirely unaffected by this amendment, since Mode A never
read Cost Price.

**Example 2 — Mode B, multiple independently-set selling prices:**

Counted: `3 cx` at `1,350 MZN/cx`, `3 emb` at `360 MZN/emb`, `5 un` at
`75 MZN/un`.

```
3 cx  × 1,350 = 4,050 MZN
3 emb ×   360 = 1,080 MZN
5 un  ×    75 =   375 MZN
                --------
Total          = 5,505 MZN
```
Mode B's existing, unconditional summation, unaffected by this amendment
for the same reason.

---

## 15. Acceptance Criteria

Stated at governance level — testable without prescribing implementation:

- [ ] Periodic Contagem's entry screen presents no Owner-editable Cost
      Price input, for any portion, of any product, of any unit (FR-71).
- [ ] For a product with a valid governed cost basis, every counted
      portion's cost contribution — including the purchase-unit portion
      — is derivable from that basis without any Owner-typed cost value
      (FR-72).
- [ ] For a product with no valid governed cost basis, the system never
      presents a cost figure indistinguishable from a genuinely observed
      zero; quantity and Selling Price remain fully recordable and fully
      valued regardless (FR-73).
- [ ] The live entry screen shows no secondary cost total; the Selling
      Value total remains the sole live total (FR-74).
- [ ] The post-confirmation screen's headline valuation is the counted
      Selling Value; any retained cost figure is secondary and
      explicitly labelled as derived/not-established (FR-75).
- [ ] The history view's cost-basis comparison remains present, fed by
      its existing governed basis, and is not presented with equal or
      greater prominence than the §22 reconciliation signal (FR-76).
- [ ] No Cost Price deviation warning fires in Periodic Contagem; the
      Selling Price deviation warning is unaffected (FR-77).
- [ ] `productValuationTotal`, `normalizedTotalSellingValue`, and
      `measuredBusinessWorth` are computed identically to their current,
      unamended behavior.
- [ ] `StockCountItem.costPrice`, `StockCount.totalValue`, and
      `expectedValueAtCount` retain their existing names, types, and
      optionality; no historical `StockCount` document is altered.
- [ ] Initial Stock's Cost Price behavior is unchanged in every respect.

---

## 16. Explicit Non-Goals (restated)

Not decided here: the exact "not established" field/marker shape (§8b);
exact UI layout, typography, or copy for any retained/redesigned display
(§9); Rule 8's own technical findings. Not in scope at all: Initial
Stock; Product Memory redesign; the Business Worth formula; Unit
Relationship; Mode A/Mode B mechanics; the Selling Price deviation
warning; any new cost-anomaly-detection mechanism; any new BDR.

---

## 17. Governance Dependencies / Next Gates

**This amendment does not authorize implementation.**

- Final acceptance/signature of this complete, assembled document — as a
  single governance artifact, not merely its individual component
  decisions already accepted above — is the immediate next gate.
- After that formal acceptance:
  1. **Rule 8 Assessment** — required, to resolve the "not established"
     representation's exact technical shape (§8b), the precise
     component-level treatment of each display decision (§9), and to
     surface any technical questions this amendment has not anticipated.
  2. **Implementation Plan**, as governance requires.
  3. **Implementation Authorization**, signed, before any code is
     written.
  4. **Implementation** itself, only after the above.
- None of Rule 8, an Implementation Plan, or an Implementation
  Authorization has been created by this document. This document remains
  a governance-stage artifact only.

---

## 18. Traceability

| Item | Source | Disposition |
|---|---|---|
| Cost Price is a fact to compute, not an Owner preference | FR-67, §15 (existing, accepted) | Extended (FR-72) |
| Purchase-unit portion field stays visible/editable | Decision 37 (B.4) | Superseded in part (FR-71) |
| Non-purchase-unit portion field suppression | Decision 37 (B.4) | Unchanged |
| Business Worth = selling-basis only | `recordStockCount`, verified by direct code trace | Restated, unchanged (§12) |
| No-basis fallback (silent zero) | `fr67CostBasisConversion.ts` §25 (existing) | Superseded by FR-73 |
| Live cost total | `PeriodicStockCountView.tsx` (existing) | Retired (FR-74) |
| Post-confirmation headline | `PeriodicStockCountView.tsx` (existing) | Re-anchored to selling value (FR-75) |
| History cost comparison | `10-expected-stock-value-amendment.md` (existing) | Retained, demoted relative to §22 (FR-76) |
| Cost deviation warning | `priceDeviationCheck.ts` (existing) | Retired, cost side only (FR-77) |

---

## 19. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed this complete amendment — FR-71 through FR-77, the
> partial supersession of Decision 37 (§7), the no-cost-known governance
> principle (§8b), the disposition of all three cost-basis diagnostic
> displays (§9a–c), and the retirement of the Cost Price deviation
> warning (§10) — and confirm this introduces no change to Initial
> Stock, Product Memory, the Business Worth formula, Unit Relationship,
> Mode A/Mode B mechanics, or the Selling Price deviation warning. This
> amendment is **ACCEPTED and SIGNED**, effective this session. Next
> governance gate: Rule 8 Assessment.

This acceptance authorizes proceeding to Rule 8 Assessment. It does not,
on its own, authorize any code change — an Implementation Plan and a
signed Implementation Authorization remain required, separate gates
after Rule 8 (§17).
