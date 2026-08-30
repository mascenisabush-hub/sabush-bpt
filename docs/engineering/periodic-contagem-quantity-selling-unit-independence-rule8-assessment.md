Rule 8 Assessment

# Rule 8 Assessment — Periodic Contagem, Quantity-Unit / Selling-Unit
# Independence (FR-89–FR-94)

**Status: ✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**
**See "Product Architect Signature," immediately below §14, for the
signed decision. Authorizes progression to the next governance gate —
the Implementation Plan — per FR-89–FR-94's own §18 sequence. Does not,
by itself, authorize implementation; a separate Implementation Plan and
a signed Implementation Authorization remain required, subsequent
gates.**

**Governing chain:**
[`docs/specs/business-worth-evolution-specification.md`](../specs/business-worth-evolution-specification.md)
§15/§16 (FR-20–FR-23, FR-67/§42, ✅ Accepted) →
[`docs/specs/BDR-pending-business-worth-evolution-measurement-model.md`](../specs/BDR-pending-business-worth-evolution-measurement-model.md)
§37 (Decision 37, items a–j, ✅ Approved and Signed, 23 August 2026) →
[`docs/specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md)
(proposed §45, FR-78–FR-88, ✅ Accepted and Signed, 30 August 2026;
implemented, Rule 8/Plan/Authorization complete) →
[`docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md`](../specs/periodic-contagem-quantity-selling-unit-independence-amendment.md)
(proposed §46, FR-89–FR-94, ✅ **ACCEPTED AND SIGNED**, SABUSHIMIKE
MASCENI, 30 August 2026) → **this document** (Rule 8 Assessment for
FR-89–FR-94's own scope, per that amendment's own §18) → Implementation
Plan (not yet created) → Implementation Authorization (not yet created)
→ implementation (not yet started).

**Baseline verified fresh, this session:** `main = origin/main =
0cbfffe2af26673cd354fdc0c5e86e04b914af3b`, working tree clean, confirmed
via `git status`/`git log` immediately before drafting. This is the same
commit that carries the signed FR-89–FR-94 amendment.

**This document does NOT modify:** the signed FR-89–FR-94 amendment; the
signed §45/FR-78–FR-88 amendment or its own Rule 8 Assessment,
Implementation Plan, or Implementation Authorization; Decision 37; any
other signed governance artifact; any application code; any test. All of
those are read-only inputs to this Assessment.

**Product Architect confirmation, this revision.** The single point this
Assessment's original draft flagged (§11/§12: whether revising
`sellingMemoryByProductName`'s tie-break rule is ordinary Rule 8 work or
requires its own formal §45 amendment) has been **explicitly confirmed
by the Product Architect** as ordinary Rule 8/mechanism work, on the
following basis, restated here verbatim in substance: only a
deliberately-entered-or-changed selling configuration participates in
determining the new remembered configuration; an automatically-populated
default never counts as deliberate; when multiple deliberate
configurations exist for one product in one Contagem, the **last
deliberately entered** one becomes the new remembered default; this
determination must never be inferred from array position, row order, or
the pre-existing confirmed-selling-unit-match preference, and that
preference must never override it; every deliberate portion is preserved
and valued independently in the current Contagem regardless of which one
becomes the future default; the remembered configuration remains a
default, never a constraint, in Add Stock, via the existing shared
memory mechanism. **This confirmation is explicitly not a reopening of
FR-83's own fundamental rule** (a deliberate current-Contagem change
becomes the remembered configuration) — it is the mechanism-level
resolution of the specific case FR-83's own signed text left unaddressed:
more than one deliberate change to the same product within a single
Contagem. §11 and §12, below, are updated to record this as settled,
confirmed input rather than an open flag. **This was, at the time of
that revision, still one step short of full acceptance of this
Assessment as a whole — that full acceptance has since been recorded;
see "Product Architect Signature," below §14.**

---

## 0. What This Assessment Is For, and What It Is Not

FR-89–FR-94 (signed) resolves Specification §36 item 1 in principle: a
physical quantity counted in a unit different from the product's
confirmed selling unit must value automatically against the remembered
selling configuration, without requiring the Owner to toggle Mode A. The
signed amendment left its own exact mechanism explicitly to Rule 8 (§17
of that document).

Two further investigation rounds, conducted directly with the Product
Architect between the amendment's signature and this Assessment,
produced a materially more complete statement of the intended model than
the amendment's own text spells out on its face — specifically, a formal
three-way distinction (physical quantity / product-level default selling
configuration / deliberate portion-level selling configuration) and an
explicit, settled resolution rule for the case where a single Contagem
contains more than one deliberately-priced portion of the same product.
**This governing clarification is treated, for the purposes of this
Assessment, as the authoritative statement of what FR-89–FR-94 means —
not as a new Specification amendment, and not as a reopening of
FR-89–FR-94's own text.** §1, below, explains why this Assessment
concludes the signed text already supports the clarified model without
requiring rewording.

This Assessment's job is exactly what Rule 8 exists to do: turn a signed
business decision into a concrete, safe implementation design, while
surfacing — rather than silently resolving — anything that turns out to
still be a business question rather than a mechanism question. §12
records the one place this Assessment found a genuine boundary between
the two.

---

## 1. Does the Signed FR-89–FR-94 Text Support the Clarified Model?

**Yes — verified by direct re-reading, this session, against the
governing clarification's three numbered concepts.**

| Governing clarification concept | Signed FR-89–FR-94 text that already covers it |
|---|---|
| Physical quantity — recorded exactly as counted, never automatically a selling portion | FR-90 (restates FR-21); §8 "Quantity/unit invariant" |
| Product-level default selling configuration — automatic, resolved from remembered `unitRelationship.sellingUnit`/`sellingPrice`, without Mode A | FR-89 itself, verbatim: "the system MUST automatically compute and apply that portion's selling value... without requiring the Owner to explicitly activate Mode A first" |
| Deliberate portion-level selling configuration — created only by an explicit Owner act, remains in its own unit | FR-92 ("that explicit entry becomes the new current selling-price/selling-unit memory"); §12 ("Mode A... or an explicit per-portion override... FR-89 supplies a sensible default, it does not remove the Owner's existing choice") |
| Multiple simultaneous deliberate configurations, correctly summed, never forced into one label | §9 Txilar Acceptance Model's own math; Mode B's existing, unmodified per-portion independence (FR-20, restated §12) |

**One genuine terminology point, not a contradiction.** FR-89's and
Decision 37(a)'s own text use "portion" to mean *any* physically-distinct
counted quantity, not — as the governing clarification now makes
explicit — *only* a deliberately-priced one. This Assessment treats
"portion" in FR-89's own text as shorthand for "counted physical entry,"
and reserves "deliberate portion" (or "pricing portion") for the
narrower, clarified sense throughout the remainder of this document,
exactly as the governing clarification itself does. **This is a reading
clarification, not a textual change to the signed amendment** — no word
of FR-89–FR-94 is altered by adopting it, and Decision 37(a)/(f) require
no amendment or reopening (Decision 37(f)'s own "may set different
selling units/prices per portion" language is fully consistent with the
clarified model: it says "may," never "must," and never claims that a
different physical unit alone constitutes that choice).

**Conclusion: the signed FR-89–FR-94 amendment is sufficient as written.
No further Specification amendment is required or proposed by this
Assessment.**

---

## 2. Scope

Applies to Periodic Contagem's own physical-count-unit / selling-
configuration relationship, exactly as FR-89–FR-94 (§5) already scopes
it: catalog rows (existing products) and manual rows ("+ Adicionar
Porção," including a genuinely new product's first portion). Explicitly
includes, as a scope clarification within FR-89–FR-94's own boundary
(not an expansion of it): the write-back of a deliberately-changed
selling configuration into `Product.sellingPrice`/
`unitRelationship.sellingUnit` when a Contagem contains more than one
deliberately-priced portion of the same product (§45/FR-83's own
mechanism, whose *tie-break ordering rule* — never itself a signed FR
text, only an implementation choice made when §45 was built — is what
this Assessment's §7 finding revises; §45's own signed text is untouched,
see §11).

Explicitly out of scope, restated from FR-89–FR-94 §6 and verified
unaffected by this Assessment's own findings: Add Stock/Smart Stock
Entry's *purchase*-side single-selling-basis rule (Product Memory
Specification §13; this Assessment's §9 confirms Add Stock's existing
*read* of Product Memory needs no change, only continues working exactly
as it does today); FR-67/§42's cost-basis engine; the Business Worth
formula; Initial Stock; the Product Catalog's field set/ownership.

---

## 3. Current-System Evidence (verified by direct code inspection, this
## session, at `HEAD 0cbfffe2a`)

**A. `StockCountWorkingRow` (`apps/tenant/src/utils/stockCount.ts`).**
Exactly `productId?`, `productName`, `quantity`, `unit`, `costPrice`,
`sellingPrice`, `removed?`, `validated?`. **No field distinguishes an
auto-resolved default `sellingPrice`/`unit` from a deliberately-entered
one, and no field records entry order.**

**B. `buildCatalogRow` (`PeriodicStockCountView.tsx`).** For an existing
product, already resolves a fresh row's `unit`/`sellingPrice` from the
confirmed `sellingUnit`/remembered price via
`resolveUnitAwarePrice`/`findLatestRememberedProductMemory` — this is
the pre-existing, already-correct *first-row* default. It writes no
marker recording that the value is a default rather than an Owner entry.

**C. `createManualRow` (`PeriodicStockCountView.tsx`, line 621).**
Creates a row with `unit: suggestedUnits[0] || 'un'`, `sellingPrice:
''` — **completely disconnected from product memory**, unlike
`buildCatalogRow`. Used both for "+ Adicionar Porção" on an existing
product and for a genuinely new product's first portion. Confirmed this
is the exact gap the governing clarification's "manual row must not
automatically become a deliberate portion" instruction addresses (§6,
below).

**D. `updateCatalogRow`/`updateManualRow`.** Plain field writes, `{
...row, ...fields }`. No distinction today between a write caused by
FR-89's own future automatic resolution and a write caused by the Owner
typing into the field — because FR-89's automatic resolution does not
yet exist in code at all.

**E. `contagemMultiUnitValuation.ts` (`deriveModeAPortionValuations`,
`canApplyModeA`, `sumModeAPortionValuations`).** Confirmed unmodified,
confirmed mathematically correct (traced by hand against Scenarios B/C/D,
§8 below) and confirmed reusable verbatim — this file's own header
comment already documents the exact "reference price ÷ conversion
factor" arithmetic FR-89 needs, applied today only when Mode A is
explicitly toggled via `handleModeAToggle`.

**F. `normalizeStockCountItems`/`tallyStockCountRows`
(`stockCount.ts`).** Confirmed: `sellingPrice` is read directly from
each row/item, summed via `quantity * sellingPrice`, with **zero
awareness of Mode A/B or of how that `sellingPrice` value was arrived
at** — exactly the "one authoritative valuation path" design already
established for FR-67/§42 and reused, unmodified, by Mode A. This is
important: whatever mechanism resolves FR-89's automatic default must
resolve it into the row's own `sellingPrice` field *before* these
functions run — they do not, and per the existing Implementation
Discipline should not, gain a second calculation path.

**G. `sellingMemoryByProductName` (`AppContext.tsx`,
`recordStockCount()`, lines ~4400–4599).** The actual, already-shipped
mechanism (§45/FR-83's own implementation) that decides what gets
written to `Product.sellingPrice` when an existing product's Contagem is
confirmed. Verified rule, by direct inspection: for each submitted
portion with a valid `sellingPrice`, **the first-encountered portion
wins by default; any later portion whose own unit matches the product's
already-confirmed `sellingUnit` overrides it.** This is **not** "last
entered" in any sense — it is "first, unless a later one happens to
match the confirmed unit." Confirmed this iterates `items` in row-array
order, not edit order, and confirmed there is no timestamp or sequence
information anywhere in the submitted payload today.

**H. `findLatestRememberedProductMemory`/`resolveUnitAwarePrice`
(`productMemoryPriceResolution.ts`).** The shared **read**-side memory
mechanism — confirmed identical usage in both `buildCatalogRow`
(Contagem) and `AddStockView.tsx` (Add Stock). Searches both
`StockBatch` history and confirmed `StockCount` history, newest wins by
date, with an existing, narrower tie-break ("prefer the confirmed
selling unit among a single count's own matching portions") used only to
choose *which portion of the single winning historical count* to read,
never which count wins. **Confirmed this mechanism requires no change**
— it already correctly serves Add Stock, and the governing
clarification's §"Add Stock Requirement" is already satisfied by it
(§9, below).

**I. `AddStockView.tsx` — `sellingPriceAutoFilled`/
`sellingPriceBasisUnit`.** Confirmed present on `AddStockView`'s own
working-row type (not on `StockCountWorkingRow`). `sellingPriceAutoFilled:
boolean` marks whether the current value is still the system-supplied
default; `sellingPriceBasisUnit: string` tracks which unit that value is
*currently* expressed in, independently of the row's own count/purchase
unit. When the Owner changes the row's unit, an auto-filled price is
silently re-derived into the new unit (`resolveUnitAwarePrice`); an
Owner-overridden one (`sellingPriceAutoFilled === false`) is left
untouched. **This is a directly reusable, already-proven precedent for
exactly the distinction FR-89–FR-94's clarified model requires in
Contagem** — see Findings 1–2, below.

**J. `StockCountItem.valuationMode` (`types.ts`).** Confirmed
display-only, "never a second source of truth," marking whether a
persisted portion's price was Mode-A-derived ('A') or Mode-B-entered
('B'). **Confirmed this is an orthogonal concept to "auto-filled vs.
deliberately entered"** — under FR-89's new automatic-default behavior,
most rows will be priced via the same conversion arithmetic Mode A uses,
but without the Owner ever toggling Mode A, and a row may equally be
"deliberately entered, but its price happens to equal what the default
would have produced" (Scenario E-equal-value case). `valuationMode`
cannot be reused as the deliberateness marker; it answers a different
question (§4, Finding 3, below).

**K. Tests read: `contagem-multi-unit-valuation.test.ts`,
`periodic-stock-mode-a-integration.test.ts`,
`periodic-stock-multi-portion-valuation.test.ts`,
`periodic-stock-add-portion.test.ts`,
`decision-37-first-contagem-cost-removal-and-selling-price-memory.test.ts`.**
Confirmed: existing coverage exercises Mode A/B correctness and
multi-portion summation, but **no existing test asserts "quantity unit ≠
selling unit values correctly without a Mode A toggle"** (the exact gap
FR-89–FR-94 §17(d) itself already flagged) and **no existing test
covers the multi-deliberate-portion memory-write ordering question** at
all — `sellingMemoryByProductName`'s own tie-break behavior is untested
by name anywhere in the suite.

---

## 4. Design Question A/B/D — Distinguishing Physical Quantity, Default,
## and Deliberate Configuration

**Finding 1 (mechanism, Rule 8 — not a business decision).** The
distinction the governing clarification requires — a row's
`sellingPrice`/`unit` is either (i) still following the product-level
default, or (ii) has been deliberately set by the Owner for this portion
— **does not exist today anywhere in `StockCountWorkingRow`**, and
cannot be reliably inferred from `sellingPrice`'s mere presence (a
blank-then-auto-resolved row and a deliberately-typed row that happens
to produce the same displayed number are otherwise indistinguishable).

**Finding 2 (mechanism, Rule 8).** `AddStockView.tsx`'s
`sellingPriceAutoFilled`/`sellingPriceBasisUnit` pattern (Evidence I) is
the correct, directly reusable precedent. This Assessment recommends
extending `StockCountWorkingRow` with the equivalent pair:

- `sellingPriceAutoFilled?: boolean` — `true` while the row's
  `sellingPrice`/`unit` still reflect FR-89's own automatic resolution;
  flipped to `false` the moment the Owner directly edits either field
  (mirrors `AddStockView`'s own existing flip-on-edit behavior exactly).
- `sellingPriceBasisUnit?: string` — the unit the current `sellingPrice`
  value is expressed in, independent of the row's own physical-count
  `unit` (needed so a deliberate portion price, e.g. "480 MZN/Cx" on a
  row physically counted in "Cx" but which could later have its
  *physical* unit relabeled, is never silently reinterpreted — restates
  FR-91 mechanically).

**Finding 3 (mechanism, Rule 8).** A third field is additionally
necessary to answer Design Question C ("last deliberately entered,
without assuming row order = edit order"):

- `sellingPriceEditSequence?: number` — a monotonically increasing
  counter, incremented in client-side working-row state each time
  `updateCatalogRow`/`updateManualRow` is called with a field change that
  sets `sellingPriceAutoFilled` to `false` (i.e., a genuine Owner edit,
  never FR-89's own automatic write). A single per-Contagem-session
  counter (e.g. a `useRef` in `PeriodicStockCountView.tsx`, not a
  Firestore-level sequence) is sufficient — this only needs to establish
  a strict, monotonic order among edits *within one active Contagem
  session*, matching the governing clarification's own scenario framing
  (Scenarios F/G, §8 below, are both single-session examples). It must
  be included in the row's draft autosave round-trip
  (`workingRowToDraftItem`/`draftItemToWorkingRow`) so that resuming an
  interrupted Contagem preserves correct ordering — the same treatment
  already given to `validated` (Decision 40, FR-N7) when that field was
  added to this exact round-trip pair.

**Why a sequence counter, not a timestamp.** A wall-clock timestamp
(`Date.now()`/`new Date().toISOString()`) was considered and rejected:
this codebase's own existing autosave/draft-durability mechanism
(`scheduleRowDraftSave`, Decision 39) already writes on a per-row debounce
timer, so two edits to different rows within the same debounce window can
resolve out of order if compared by wall-clock time captured at write time
rather than at the moment of the Owner's own action; a simple in-session
integer counter, incremented synchronously inside the same event handler
that flips `sellingPriceAutoFilled` to `false`, has no such race and needs
no new time-source dependency. This mirrors this codebase's own explicit
caution elsewhere against out-of-order autosave writes (Decision 38(d),
BDR §37) rather than introducing a new one. No existing part of this
codebase's Contagem draft model uses a persisted edit-timestamp for
ordering purposes today, so a counter is both the minimal-footprint choice
and the one consistent with existing architecture, not a new pattern
introduced casually.

**Finding 4 (mechanism, Rule 8 — schema question, Design Question F).**
This is a **narrow, additive extension of `StockCountWorkingRow`'s
schema** (three new optional fields, all backward-compatible, all
following this codebase's existing "absent means today's old behavior"
discipline — mirrors exactly how `validated?: boolean` was added under
Decision 40). **This is not a contradiction of FR-94.** FR-94's own text
states only that "no schema change is presumed necessary," and explicitly
reserves the exact mechanism to Rule 8 ("Whether the smallest correct
implementation mechanism is a persistence-layer change... is explicitly
a Rule-8 question"). This Assessment exercises that reserved discretion:
**a schema change to `StockCountWorkingRow`'s working/draft shape is
found necessary; no schema change to the final, confirmed
`StockCount.items` shape is found necessary** (§5, Finding 5, below) —
so FR-90's own restated invariant (physical quantity/unit never
rewritten) and FR-94's underlying intent (minimal footprint) are both
preserved; only the *draft* working-row shape grows, in the same low-risk
way `validated` already did.

---

## 5. Design Questions E/G/H — Automatic Default Resolution, and
## Whether the Confirmed `StockCount.items` Schema Must Change

**Finding 5 (mechanism, Rule 8).** FR-89's automatic resolution is a
**derivation applied before `normalizeStockCountItems`/
`tallyStockCountRows` run**, not a change to those functions themselves
(consistent with FR-94, and with Evidence F's "one authoritative
valuation path" finding). Concretely: for every row whose
`sellingPriceAutoFilled` is `true` (or absent, for backward
compatibility with any row created before this mechanism ships) at the
moment the row is built or its physical-count `unit` changes,
`deriveModeAPortionValuations` (Evidence E, unmodified) is called with
that row's own quantity/unit against the product's confirmed
`sellingUnit`/remembered price as the single reference — exactly Mode
A's existing arithmetic, applied automatically rather than only after
`handleModeAToggle`. The derived price is written into the row's own
`sellingPrice` field (mirroring how a Mode A toggle already writes
derived prices back onto working rows today), so `sellingPrice` remains
the *only* field `normalizeStockCountItems`/`tallyStockCountRows` need
to read — no second valuation path is introduced.

**Finding 6 (mechanism, Rule 8 — confirms FR-94's "no persisted-schema-
change" claim holds for the confirmed count).** Because
`sellingMemoryByProductName`'s multi-portion-ordering computation
(Finding 7, below) only needs to run once, client-side, immediately
before `recordStockCount()` submits the Contagem, the "which portion was
last deliberately entered" determination can be threaded into
`recordStockCount()`/`normalizeStockCountItems()` as an **additional,
optional, un-persisted parameter** — exactly the precedent already set by
`costBasisByProductName` (Evidence F; `fr67CostBasisConversion.ts`'s own
threading pattern, reused verbatim, not reinvented). **The final,
persisted `StockCountItem`/`StockCount.items` shape requires no new
field** — `sellingPriceAutoFilled`/`sellingPriceBasisUnit`/
`sellingPriceEditSequence` are working-row/draft-only concepts, consumed
entirely before the confirmed count is written, never appearing in the
signed schema FR-90/FR-94 govern.

**Finding 7 (mechanism, Rule 8 — implements the governing clarification's
settled §5 "last deliberately entered" business rule).**
`sellingMemoryByProductName`'s tie-break logic (Evidence G) is revised
from "prefer confirmed-selling-unit match" to: among the submitted
portions for one product, select whichever has the **highest
`sellingPriceEditSequence`** among those with `sellingPriceAutoFilled ===
false` (i.e., genuinely deliberate entries only); if no portion was
deliberately entered (every portion for this product is still
`sellingPriceAutoFilled === true`), **no write occurs at all** — the
remembered configuration is left exactly as it already was, since
nothing was deliberately changed (restates FR-91/FR-84 directly: no
silent overwrite as a side effect of an ordinary, all-default count).
**This revises only the pre-existing tie-break *implementation* inside
`AppContext.tsx`; it does not reopen, reword, or resubmit
`docs/specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`'s
own signed text** — FR-83's signed text never specified a multi-portion
tie-break rule at all (verified, §11, below); the rule being revised was
always an implementation choice made when §45 was built, not a decided,
numbered FR.

---

## 6. Design Question — the Manual "+ Adicionar Porção" Path

**Finding 8 (mechanism, Rule 8, closes the gap Evidence C identifies).**
`createManualRow` must be extended so that a newly-added manual row for
an *existing* product (resolved the same way `getRememberedPriceForRow`
already resolves an existing product for a manual row — by `productId`
when present, falling back to case-insensitive name match, Evidence
already confirmed this dual-resolution exists) is initialized exactly
like `buildCatalogRow` initializes its own row: `unit`/`sellingPrice`
default from the confirmed `sellingUnit`/remembered price,
`sellingPriceAutoFilled: true`. **A manually-added physical-quantity row
never becomes a deliberate portion merely by existing** — it only becomes
one the moment the Owner directly edits its `sellingPrice`/`unit`
(`sellingPriceAutoFilled` flips to `false`), at which point it
participates in Finding 7's tie-break exactly like any other
deliberately-priced row. For a genuinely new product's *first* portion
(no existing product to read memory from), the row remains blank until
`NewProductInfoPanel`'s own selling-unit/price establishment completes —
unaffected, exactly as FR-93 already governs.

---

## 7. Design Question — Add Stock / the Shared Memory Mechanism

**Finding 9 (verification only — no change required).** Traced
end-to-end this session: a deliberate Contagem selling-price change →
Finding 7's revised `sellingMemoryByProductName` write → confirmed
directly against `AppContext.tsx` → `Product.sellingPrice`/
`unitRelationship.sellingUnit` updated → `findLatestRememberedProductMemory`
(Evidence H, unmodified) already searches confirmed `StockCount` history
alongside `StockBatch` history, newest-by-date wins → `AddStockView.tsx`
already calls this exact function for its own prefill, already marks the
result `sellingPriceAutoFilled: true`, already lets the Owner change unit
and/or price freely (flipping the flag), already never treats the
remembered value as a constraint. **The governing clarification's entire
"Add Stock Requirement" section is already correctly implemented, with
zero changes required.** No second, competing memory mechanism is
proposed or needed anywhere in this Assessment.

---

## 8. Worked Scenarios (traced by hand against the mechanism above)

**A. `12 Un @ 50 MZN/Un` (same unit).** `sellingPriceAutoFilled` stays
`true` if unedited (default resolves trivially, factor 1, matching
`resolveUnitAwarePrice`'s own identity case) or becomes an
Owner-confirmed deliberate `50` if explicitly re-entered. Either way,
valuation = `12 × 50 = 600 MZN`. Correct.

**B. `12 Cx`, remembered `50 MZN/Un`, `1 Cx = 24 Un`.** Finding 5 fires:
`deriveModeAPortionValuations` derives `50 / (1/24) = 1,200 MZN/Cx`
equivalently `12 × 24 × 50 = 14,400 MZN`. Quantity/unit remain exactly
`12`/`Cx` (FR-90). No Mode A toggle required. Matches the governing
clarification's own worked figure exactly.

**C. `5 Emb + 3 Pacotes`, `1 Emb = 10 Pacotes`, remembered `50
MZN/Pacote`.** Two rows, both `sellingPriceAutoFilled: true`. Finding 5
resolves each independently against the same reference: `5 Emb → 50
Pacote-equivalent × 50 = 2,500`; `3 Pacotes × 50 = 150`; summed by the
unmodified `normalizeStockCountItems` = `2,650 MZN`. Neither row's
quantity/unit is rewritten. Matches exactly.

**D. `5 Cx @ 480 MZN/Cx` (deliberate) + `7 Cx @ 50 MZN/Un` (default or
deliberate).** Two rows. The first: Owner types `480`, unit stays `Cx`
→ `sellingPriceAutoFilled: false`, `sellingPriceBasisUnit: 'Cx'`,
`sellingPriceEditSequence: 1`. The second, left at its resolved default
(`50 MZN/Un` via Finding 5) or independently confirmed by the Owner as
exactly `50 MZN/Un` — either way its own `sellingPrice`/`unit` are
unaffected by the first row's edit (FR-91). Valuation: `5 × 480 =
2,400`; `7 × 50 = 350`; summed = `2,750 MZN`. Neither price is
reinterpreted into the other's unit. Correct.

**E. Same-unit deliberate change, `50 → 60`.** Owner edits the row;
`sellingPriceAutoFilled: false`, `sellingPriceEditSequence` set. Current
Contagem values at `60`. Finding 7: this product has exactly one
deliberately-entered portion, so it wins the tie-break trivially — `60`
becomes the new remembered default (restates FR-83/FR-92 exactly, no
new behavior).

**F. `5 Cx @ 480` then `7 Cx @ 50 MZN/Un`, both deliberate, in that
order.** `sellingPriceEditSequence`: 1 then 2. Current Contagem: both
values preserved and correctly summed, exactly as Scenario D. Finding
7's tie-break: portion with sequence `2` (`50 MZN/Un`) wins →
`Product.sellingPrice = 50`, `unitRelationship.sellingUnit = 'Un'`
becomes the new remembered default. Matches the governing clarification's
stated expected result exactly.

**G. Reverse order — `7 Cx @ 50 MZN/Un` then `5 Cx @ 480 MZN/Cx`.**
Sequence 1 then 2. Tie-break selects sequence `2` (`480 MZN/Cx`) →
remembered default becomes `480 MZN/Cx`. Matches the governing
clarification's stated reverse-order expectation exactly — confirms
Finding 7's rule is genuinely order-sensitive, not defaulting to any
fixed preference.

**H. `5 Emb + 3 Pacotes`, neither deliberately priced.** Both rows
`sellingPriceAutoFilled: true` throughout. Both value via Finding 5
against the same single remembered configuration (identical to Scenario
C). Finding 7: no deliberately-entered portion exists for this product →
no memory write occurs at all — the remembered configuration is left
exactly as it was before this Contagem (restates FR-84/FR-91).

**I. Add Stock reads a Contagem-established `50 MZN/Un`.** Traced,
Finding 9: already works, unmodified, today.

**J. Initial Stock.** `type === 'initial'` guard (Evidence G; §45's own
already-verified guard, FR-91's restated boundary) is untouched by every
Finding above — Finding 5's automatic resolution and Finding 7's
tie-break write are both gated the same way §45's existing
`sellingMemoryByProductName` write already is (`type !== 'initial'`),
and Finding 5's own display/valuation-only derivation applies equally to
Initial Stock's own multi-portion valuation capability (Product Memory
Specification §16) without introducing any new behavior there —
Initial Stock's `totalValue` remains deliberately cost-basis-only,
completely unread by any Finding in this Assessment (Evidence F,
restated).

**K. Business Worth.** `normalizedTotalSellingValue` →
`productValuationTotal` → `measuredBusinessWorth`
(`AppContext.tsx`, confirmed lines ~4494/4829/4179) reads only the
final, already-summed `sellingPrice`/`quantity` values on each
persisted item — completely unaware of Mode A/B, `sellingPriceAutoFilled`,
or any Finding in this Assessment. Since Finding 5 writes its derived
default into the same `sellingPrice` field Mode B already writes
deliberate entries into, and Finding 6 confirms no persisted-schema
change, **Business Worth requires zero changes** and receives the
correct, fully-resolved valuation in every scenario above without any
awareness that a value was auto-resolved vs. deliberately entered.

**L. No relationship / no valid conversion.** `deriveModeAPortionValuations`
already returns `null` for `derivedSellingPrice`/`sellingValue` when no
valid, confirmed relationship covers a portion's unit (Evidence E,
unmodified null-contract). Finding 5's caller must treat a `null` result
exactly as `getConversionFactor`'s own existing convention already
requires elsewhere: leave `sellingPrice` blank, `sellingPriceAutoFilled`
remains `true` but unresolved, Owner enters manually — this is
FR-89's own stated narrow exception, restated, not new behavior.

---

## 9. Interaction with Mode A / Mode B (Design Question — "does Mode A
## remain available without becoming mandatory")

**Finding 10.** Mode A's own explicit toggle (`handleModeAToggle`)
remains fully available, unmodified, for its original purpose: choosing
a *different* reference unit/price than the confirmed default, or
converting an entire product's mixed portions to one reference
uniformly by explicit Owner choice. Finding 5's automatic default
resolution and Mode A's explicit mechanism are the same underlying
arithmetic (`deriveModeAPortionValuations`) invoked under two different
triggers — automatic-by-default (Finding 5) vs. explicit-toggle
(existing `handleModeAToggle`) — never in conflict, since Finding 5 only
ever applies while `sellingPriceAutoFilled` is `true`; an explicit Mode A
toggle for a product is itself a deliberate act and should set
`sellingPriceAutoFilled: false` for the portions it affects, entering
Finding 7's tie-break exactly like any other deliberate entry. This is
an implementation detail for the companion Implementation Plan, not a
further business decision — FR-89–FR-94 §12 already anticipates exactly
this relationship ("Whether the correct implementation realizes this as
'Mode A activates automatically'... or as a new, distinct default
valuation path... is explicitly left to Rule 8"). **This Assessment's
recommendation: the "new, distinct default valuation path" framing** —
Finding 5 runs independently of Mode A's own UI/toggle state, producing
Mode A's identical numeric output without surfacing Mode A's own UI,
exactly as §12 contemplated as one of its two options.

---

## 10. Explicitly Out of Scope / Unaffected (restated, verified this
## session)

- FR-67/§42's cost-basis conversion engine and its own automatic rule —
  entirely unread by any Finding above.
- Add Stock/Smart Stock Entry's single-selling-basis-per-purchase rule
  (Product Memory Specification §13) — Finding 9 confirms Add Stock's
  own *read* of memory needs no change; nothing in this Assessment
  authorizes multiple selling bases on a purchase/receipt line.
- The Business Worth formula itself (Scenario K).
- Initial Stock's cost-basis-only `totalValue` (Scenario J).
- The Product Catalog's six-field surface/ownership split (§45 §13,
  unaffected — this Assessment writes to the same `Product.sellingPrice`/
  `unitRelationship.sellingUnit` fields §45 already owns, via the same
  write authority, never a new one).
- `firestore.rules`/`firestore.indexes.json` — no new collection, no new
  top-level field on any server-validated document; the three new
  working-row fields (Finding 2–3) live only in client-side draft state
  and the existing `PeriodicStockDraft` autosave document, whose schema
  is already Owner-only, already unvalidated at the field-shape level
  (confirmed by the precedent Rule 8 Assessment for the existing-product
  selling-unit correction, §6 "R. Server validation," restated here).

---

## 11. Governance Boundary Scan

- Signed FR-89–FR-94 amendment: **not modified.** Read only.
- Signed §45/FR-78–FR-88 amendment: **its text is not modified.** One of
  its own already-implemented mechanisms (`sellingMemoryByProductName`'s
  tie-break) is revised — Finding 7 verifies directly, by re-reading
  FR-83's signed text in full, that the tie-break rule being changed was
  never itself part of the signed FR text; it was an implementation
  choice made at build time. Revising an implementation choice to
  correctly serve a business rule the original FR text never addressed
  is ordinary Rule 8/Implementation Plan work, not a reopening of signed
  governance. **Confirmed by the Product Architect** (this revision's
  preamble note, above): this revision does not reopen or change FR-83's
  own fundamental rule (a deliberate current-Contagem change becomes the
  remembered configuration) — it is the mechanism-level resolution of the
  specific multi-deliberate-configuration case FR-83's signed text left
  unaddressed. No formal amendment to §45 is required.
- §45's own Rule 8 Assessment, Implementation Plan, Implementation
  Authorization: **not modified, not reopened.**
- Decision 37 (a)/(c)/(d)/(f)/(g): **not modified.** §1, above, records
  why no reopening is needed.
- Existing-product selling-unit reference-point reconciliation and its
  own Implementation Authorization: **not modified, not reopened** — its
  own §4 scoping (defaults only) is unaffected; Finding 5 extends when
  the automatic default fires, never what the default itself resolves
  to (that remains `buildCatalogRow`'s/`findLatestRememberedProductMemory`'s
  own already-settled resolution).
- No application code, test, or `firestore.rules`/`firestore.indexes.json`
  file was modified in the course of producing this Assessment.

---

## 12. What Remains a Business Decision (none — confirmed)

Every design question the governing clarification posed (Design
Questions A–N) is resolved above as a mechanism/implementation question,
building directly on business rules the Product Architect has already
settled — either in the signed FR-89–FR-94 text itself, or explicitly in
this session's governing clarification (most importantly, the
"last-deliberately-entered-wins" rule, which this Assessment did not
invent and treats as settled input, not as something Rule 8 decided on
its own). **This Assessment identifies no further open business
decision.** §11's single flagged point (whether revising
`sellingMemoryByProductName`'s tie-break requires its own formal §45
amendment) has been **explicitly confirmed by the Product Architect**
(this document's revision preamble, above) as ordinary Rule 8/mechanism
work, not requiring a formal §45 amendment, and specifically not a
reopening of FR-83's own fundamental rule. No further open business
decision remains in this Assessment's scope.

**Confirmed business rule, restated for completeness (input, not
decided by this Assessment):**
1. Only a deliberately-entered-or-changed selling configuration
   participates in determining the new remembered/default configuration.
2. An automatically-populated/default configuration never counts as a
   deliberate entry (Finding 2's `sellingPriceAutoFilled` marker is the
   mechanism this business rule requires).
3. Where multiple deliberate configurations exist for one product in one
   Contagem, the last deliberately entered one becomes the new
   remembered/default configuration for future Contagem and Add Stock.
4. "Last deliberately entered" is never inferred from array position,
   row order, or the pre-existing confirmed-selling-unit-match
   preference (Finding 3's `sellingPriceEditSequence` marker is the
   mechanism this business rule requires).
5. The confirmed-selling-unit-match preference never overrides rule 3
   (Finding 7 removes that preference from the tie-break entirely).
6. Every deliberate portion in the current Contagem is preserved and
   valued independently, regardless of which one becomes the future
   default (Scenarios D/F/G, §8, confirm this by hand).
7. The remembered configuration remains a default, never a constraint,
   in Add Stock, via the existing shared memory mechanism, with the
   Owner always free to change unit and/or price (Finding 9 confirms
   this is already fully implemented, unchanged).
8. This is a mechanism-level clarification for the multi-deliberate-
   configuration case only — it does not reopen or change FR-83's own
   fundamental rule that a deliberate current-Contagem change becomes
   the remembered selling configuration.

---

## 13. Testing Strategy (feeds the companion Implementation Plan)

At minimum, the companion Implementation Plan's Test Plan must cover:
Scenarios A–L above, each as a direct unit-test fixture against the
revised `deriveModeAPortionValuations`-invocation path (Finding 5) and
the revised `sellingMemoryByProductName` tie-break (Finding 7);
`createManualRow`'s new default-resolution behavior for an existing
product (Finding 8) alongside its existing untouched behavior for a
genuinely new product; the draft round-trip
(`workingRowToDraftItem`/`draftItemToWorkingRow`) for all three new
working-row fields, mirroring the existing `validated`-field round-trip
tests; and a regression pass confirming
`periodic-stock-mode-a-integration.test.ts` and
`periodic-stock-multi-portion-valuation.test.ts`'s existing assertions
remain valid (Evidence K found no existing assertion that this
Assessment's Findings would break, but this must be re-verified against
the actual diff at Implementation Plan time, not assumed here).

---

## 14. Final Rule 8 Verdict

**READY AFTER IMPLEMENTATION PLAN.**

Every Finding in this Assessment is a resolved mechanism/design question
building on already-settled business decisions (the signed FR-89–FR-94
amendment, and this session's governing clarification, treated as
authoritative input per §0). No further Specification amendment is
proposed or found necessary (§1). The one point this Assessment's
original draft flagged (§11/§12) was explicitly confirmed by the Product
Architect in an earlier revision — no blocker remained at that point.
**This Assessment as a whole has now been reviewed and formally
accepted by the Product Architect — see "Product Architect Signature,"
immediately below.** No code, test, or governance artifact has been
modified in producing or accepting this Assessment. The next governance
step is the companion Implementation Plan — not yet created — followed
by a signed Implementation Authorization, per FR-89–FR-94's own §18
sequence. **This acceptance does not, by itself, authorize
implementation.**

---

## Product Architect Signature

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed this Rule 8 Assessment's conclusions for the complete
> FR-89–FR-94 Contagem selling-configuration scope, including: physical
> quantity entries recorded exactly as physically counted, independent of
> selling unit; different physical quantity units never automatically
> creating deliberate selling portions; the product-level selling
> configuration as the remembered/default selling price and selling
> unit; a deliberate selling portion existing only when the Owner
> deliberately assigns an independent selling price/unit to part of the
> stock, retaining its own selling price and selling unit; the
> remembered configuration remaining a default, never a constraint,
> including as it flows into Add Stock through the existing shared
> memory mechanism, with the Owner always free to change selling unit
> and/or selling price there; automatically populated/default
> configurations never counting as deliberate Owner entries; the rule
> that when multiple deliberate selling configurations are created for
> the same product in one Contagem, the LAST DELIBERATELY ENTERED
> configuration becomes the remembered/default configuration for future
> Contagem and Add Stock, determined without reference to array order,
> row order, confirmed-selling-unit matching, or arbitrary Map iteration
> order; current Contagem valuation preserving each deliberate portion's
> own selling configuration and correctly summing all contributions;
> automatic cross-unit valuation never rewriting the physical
> quantity/unit; Mode A never being required merely to count stock in a
> physical unit different from the selling unit; and the existing
> cost-side/FR-67 behavior, Initial Stock, the Business Worth formula,
> and every other explicitly out-of-scope area remaining untouched. I
> accept this Rule 8 Assessment's conclusions.

**Decision:** I APPROVE AND SIGN THE RULE 8 ASSESSMENT

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 30 August 2026

This signature authorizes progression to the next governance gate — the
Implementation Plan — per FR-89–FR-94's own §18 sequence. **It does not,
on its own, authorize any code change.** A separate Implementation Plan
and a signed Implementation Authorization remain required, subsequent
gates, exactly as §18 of the signed FR-89–FR-94 amendment requires.

---

## Appendix A — Terminology (locked for this Assessment)

To prevent the three concepts from collapsing back into each other
anywhere in this document or its companion Implementation Plan, this
Assessment uses exactly these three terms, exactly as the governing
clarification defines them, throughout:

- **"physical quantity entry"** = a quantity + the physical unit it was
  counted in (`StockCountWorkingRow.quantity`/`.unit` as counted by the
  Owner — e.g. "12 Cx," "5 Emb," "3 Pacotes"). Never, by itself, implies
  anything about how that quantity is sold or priced.
- **"product selling configuration"** = the remembered/default selling
  price + selling unit for the product as a whole (`Product.sellingPrice`/
  `unitRelationship.sellingUnit`). Automatically supplied as a default
  wherever a physical quantity entry has not been given its own
  independent configuration (Finding 5). Never a constraint (FR-84/FR-91,
  restated; Finding 9).
- **"deliberate selling portion"** = the part of a product's stock the
  Owner has explicitly, deliberately given its own independent selling
  price/unit, distinct from the product selling configuration
  (`sellingPriceAutoFilled === false` on that row/entry, Finding 2). Only
  ever created by a direct Owner act — never by the mere existence of a
  physical quantity entry in a different unit (Finding 1, Finding 8).

**Explicit non-equivalences, stated to prevent drift:** a physical
quantity entry in a unit different from the confirmed selling unit is
**not**, by itself, a deliberate selling portion (Scenarios B, C, H, §8).
Two physical quantity entries for the same product in different units are
**not** automatically two deliberate selling portions (Scenario C/H). A
"portion" in Decision 37(a)/FR-89's own older textual sense (any
physically-distinct counted quantity) is **not** the same thing as a
"deliberate selling portion" in this Assessment's sense — §1 above
records this reading explicitly; every use of "portion" without the word
"deliberate" attached elsewhere in signed governance should be read as
"physical quantity entry" for purposes of implementing this Assessment,
never silently read as "deliberate selling portion."

---

## Appendix B — Governance Questions, Answered Directly

Direct, one-line answers to each numbered governance question, each
pointing to the section/Finding that supports it in full:

1. **Is the signed FR-89–FR-94 amendment sufficient for this complete
   model?** Yes — §1.
2. **Does any wording in signed governance contradict the clarified
   model?** No contradiction found — §1, §11.
3. **How should "portion" be interpreted consistently without reopening
   Decision 37?** As "physical quantity entry" in Decision 37(a)/FR-89's
   own older usage, distinct from "deliberate selling portion" — §1,
   Appendix A.
4. **How should physical quantity entries be distinguished from
   deliberate selling portions?** By the `sellingPriceAutoFilled` marker
   on the row/entry — Finding 1, Finding 2.
5. **How should automatic/default values be distinguished from deliberate
   Owner input?** Same marker, `sellingPriceAutoFilled` — Finding 2.
6. **How should "last deliberately entered" be determined reliably?** A
   client-side, per-session `sellingPriceEditSequence` counter, never row
   order or array position — Finding 3.
7. **Can the existing Add Stock override-tracking mechanism be reused?**
   Yes, directly — `sellingPriceAutoFilled`/`sellingPriceBasisUnit` are
   extended verbatim from `AddStockView.tsx`'s own precedent — Evidence
   I, Finding 2.
8. **Does `StockCountWorkingRow` need additional working-state fields?**
   Yes, three: `sellingPriceAutoFilled`, `sellingPriceBasisUnit`,
   `sellingPriceEditSequence` — Finding 2, Finding 3, Finding 4.
9. **Can confirmed/persisted `StockCount.items` remain unchanged?** Yes —
   Finding 6, reusing the `costBasisByProductName` un-persisted-parameter
   precedent.
10. **How does automatic cross-unit valuation work without rewriting
    physical quantities?** `deriveModeAPortionValuations` (unmodified)
    writes only the derived `sellingPrice`, never `quantity`/`unit` —
    Finding 5, restating FR-90/FR-21.
11. **How do deliberate portions retain their own native selling
    units/prices?** `sellingPriceBasisUnit` plus Mode B's existing,
    unmodified independent-row storage — Finding 2, §8 Scenario D.
12. **How does the system prevent double conversion?** The derived price
    is written once into the row's own `sellingPrice` field before
    `normalizeStockCountItems`/`tallyStockCountRows` run; those functions
    read `sellingPrice` only, with no awareness of how it was derived —
    Evidence F, Finding 5.
13. **How does Mode A interact with this model?** Remains available,
    unmodified, for explicit Owner-chosen reference-unit changes; an
    explicit Mode A toggle is itself a deliberate act and sets
    `sellingPriceAutoFilled: false` for the rows it touches — Finding 10.
14. **How does Mode B interact with this model?** Unchanged — every
    deliberately-priced row already behaves as an independent Mode B
    entry today; this Assessment adds no new arithmetic to Mode B itself,
    only the marker fields that let memory-write logic know which rows
    are deliberate — Finding 2, §8 Scenario D.
15. **How does the remembered configuration flow into Add Stock?**
    Unchanged, already correct — `findLatestRememberedProductMemory` +
    `resolveUnitAwarePrice`, verified end-to-end — Finding 9.
16. **How does multiple-deliberate-configuration memory selection work?**
    Highest `sellingPriceEditSequence` among rows with
    `sellingPriceAutoFilled === false` for that product wins; no
    deliberate rows means no write at all — Finding 7.
17. **What happens when a physical quantity unit changes but the Owner
    does not deliberately change selling configuration?** The row's
    `sellingPriceAutoFilled` remains `true`; Finding 5's automatic
    resolution re-derives the price against the new unit exactly as
    `AddStockView.tsx`'s own existing re-derivation-on-unit-change already
    does (Evidence I) — no deliberate portion is created.
18. **What happens when a deliberate price/unit happens to equal the
    remembered/default configuration?** It is still recorded as
    deliberate (`sellingPriceAutoFilled: false`, a real
    `sellingPriceEditSequence` value) and still participates in Finding
    7's tie-break as a genuine candidate — equality of value never
    demotes an explicit Owner action back to "default." Confirmed
    consistent with Scenario E.
19. **What happens when only one row is deliberately priced?** Finding 7's
    tie-break selects it trivially (no comparison needed) — Scenario E.
20. **What happens when several rows are deliberately priced?** Finding
    7's tie-break selects strictly by `sellingPriceEditSequence` recency —
    Scenarios F/G, proving the rule is genuinely order-sensitive in both
    directions.

---

## Verification Performed for This Assessment

- `git status`/`git log` confirmed clean working tree at
  `0cbfffe2af26673cd354fdc0c5e86e04b914af3b` before and no writes to
  application code, tests, or any other governance file during
  drafting.
- Signed FR-89–FR-94 amendment (full text), Decision 37 §37 items (a),
  (c), (d), (f), (g) (full text), FR-20–FR-23/FR-67/§42 (full text),
  §45/FR-78–FR-88 (relevant sections, FR-83–FR-85 in full) — all
  re-read directly from the repository, this session.
- Code inspected directly: `stockCount.ts` (full),
  `contagemMultiUnitValuation.ts` (full),
  `productMemoryPriceResolution.ts` (full), relevant sections of
  `PeriodicStockCountView.tsx`, `AddStockView.tsx`, `AppContext.tsx`
  (`recordStockCount`, `sellingMemoryByProductName` construction and
  both write sites), `types.ts` (`Product`, `StockCountItem`,
  `StockCountWorkingRow`-equivalent fields).
- Tests inventoried: `contagem-multi-unit-valuation.test.ts`,
  `periodic-stock-mode-a-integration.test.ts`,
  `periodic-stock-multi-portion-valuation.test.ts`,
  `periodic-stock-add-portion.test.ts`,
  `decision-37-first-contagem-cost-removal-and-selling-price-memory.test.ts`.

---

## 15. Addendum — Persisted Selling-Price Basis Unit (Option C)

**Status: ✅ ACCEPTED BY THE PRODUCT ARCHITECT, SABUSHIMIKE MASCENI, 30
August 2026.**

Appended per this repository's own established "append, don't rewrite"
pattern for a post-signature Product Architect decision against an
already-signed governance document — matching the exact precedent set
by this Assessment's own §14/Product Architect Signature block
remaining untouched above, and by the Implementation Authorization's
own §9. Nothing above this line is altered by this addendum.

**Background.** Post-implementation audit work (conducted after this
Assessment's own original signing) discovered that `StockCountItem.unit`
is already, in two separately-shipped, currently-live consumers, relied
upon as the selling price's own denominator when reading history —
`ProductDetailModal.tsx`'s own historical price display
(`formatCurrency(item.sellingPrice)/{item.unit}`), and
`findLatestRememberedProductMemory`'s own historical-record reading (its
own header comment: *"e.g. some Cx, some Un, each independently
priced"*). Neither consumer was designed with the possibility that a
deliberate portion's physical unit could later diverge from its own
price's true basis (Rule 2, `applySellingConfigurationEditRules`) — a
possibility FR-89–FR-94 itself introduced.

**Finding (revises this Assessment's own original Finding 4/6
conclusion).** §4/§5 of this Assessment (above) concluded no
persisted-`StockCount.items`-schema change was necessary, based on the
working-row/draft layer alone satisfying every requirement then under
consideration. Fresh audit work has since shown this conclusion does
not extend to *historical reconstruction* of a diverged portion once
the working session ends — the persisted `StockCountItem` record itself
loses the distinction, exactly where the two already-shipped consumers
named above need it.

**Governance basis for revisiting this conclusion, without reopening
the Specification.** FR-94 (signed, `periodic-contagem-quantity-selling-unit-independence-amendment.md`)
states directly: *"Whether the smallest correct implementation
mechanism is a persistence-layer change, a pure display/valuation-layer
derivation, or some combination is explicitly a Rule-8 question... this
FR fixes only that no schema change is presumed necessary, not the
exact mechanism."* This addendum exercises that same reserved
authority a second time — the first time having produced the
working-row schema growth in §4/Finding 4 above; this time, the
confirmed-record layer.

**Mechanism decision.** A new, optional field is added to
`StockCountItem`: `sellingPriceBasisUnit?: string` — the unit the
item's own `sellingPrice` is actually denominated in at confirmation
time. Mirrors `valuationMode`'s own already-established, already-shipped
pattern exactly: display/audit-only, never read by any valuation
calculation (`sellingValue`/`totalSellingValue` remain computed
identically, `quantity × sellingPrice`, regardless of this field's
presence or value), never backfilled onto pre-existing records,
absent-safe for every consumer.

**Backward compatibility, stated precisely per the Product Architect's
own explicit instruction:** a record written *after* this field exists
carries `sellingPriceBasisUnit`; a record written *before* it existed
simply lacks the field and is never modified to add it — every
consumer's own fallback (`item.sellingPriceBasisUnit ?? item.unit`)
means an old record continues to be read exactly as it is read today,
via `item.unit` alone. No migration, no backfill, no reprocessing of
historical data is required or authorized by this addendum.

**Source.** `normalizeStockCountItems`/`tallyStockCountRows` populate
it from `row.sellingPriceBasisUnit ?? row.unit` — the exact same source
expression this Assessment's own Finding 1 (via the Implementation
Plan's own realization of it) already established for the working-row/
memory-write layer, now extended to the persisted layer too.

**Consumers to update, non-breaking in every case:**
- `ProductDetailModal.tsx` — reads `item.sellingPriceBasisUnit ??
  item.unit` for its own selling-price display line only; its own
  quantity display line (`{item.quantity} {item.unit}`) is unaffected
  and untouched.
- `findLatestRememberedProductMemory` — prefers
  `item.sellingPriceBasisUnit` when present, falls back to `item.unit`
  for any record predating this field.

**What does NOT change:** `StockCountItem.unit`'s own meaning
(physical/counting unit, unambiguous, unchanged); `quantity`/`unit`'s
own invariant (FR-90); the current-Contagem valuation arithmetic
(already correct, untouched); `Product.sellingPrice`/
`unitRelationship.sellingUnit` (this Assessment's own Finding 7,
unaffected); the Contagem UI's own caption fix (separately identified,
not part of this addendum's own scope, not authorized by it).

**Verdict: READY AFTER IMPLEMENTATION PLAN AMENDMENT.**

**Product Architect acceptance, recorded 30 August 2026.** The Product
Architect has accepted this §15 addendum, in the same act as accepting
Implementation Authorization §10 (the corresponding, final governance
gate for Option C) — see that document's own §10 signature block for
the full, verbatim decision text. This §15 addendum's own analysis,
findings, and mechanism decision (above) are unaltered by this
acceptance record; nothing above this line is rewritten.

