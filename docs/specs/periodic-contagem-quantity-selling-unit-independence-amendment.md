Business Domain Specification — Amendment

# Periodic Contagem — Quantity-Unit / Selling-Unit Independence Amendment
## (Proposed §46 of the Business Worth Evolution Specification)

**Status:** ✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**

This document was drafted, then reviewed and formally accepted by the
Product Architect (§20, below): "I APPROVE AND SIGN," SABUSHIMIKE
MASCENI, 30 August 2026. It records an accepted clarification of, and
narrow addition to, already-signed governance (Business Worth
Evolution Specification §15/§16, the §45 amendment, and the
existing-product selling-unit reference-point reconciliation). This
amendment is governance-approved. It does not, on its own, authorize
implementation — a Rule 8 Assessment, an Implementation Plan, and a
signed Implementation Authorization remain separate, subsequent gates
(§17/§18, below), exactly as required for every sibling amendment in
this governance chain.

---

## 1. Governance Lineage

- **`docs/specs/business-worth-evolution-specification.md` §15 (Multi-
  Unit Valuation, Contagem-Specific)** — the original governing
  decision for Mode A/Mode B (source BDR Decision 7; POL-0010 CON-4).
  **FR-20**: *"Contagem entry must accept either a single selling-unit
  price applied uniformly, or multiple independently-entered
  selling-unit prices applied per physical portion, without forcing a
  choice the Owner has not made."* **FR-21**: *"Neither mode may alter
  how a physical quantity or its entered unit label is stored or
  displayed — internal conversion exists solely for the valuation
  calculation."* **FR-22**: *"+Stock's existing single-selling-unit-
  per-batch data model and entry flow must remain entirely unmodified
  by this capability."*
- **`business-worth-evolution-specification.md` §16 (Cost Price
  Preservation)** — **FR-23**: *"No Contagem entry or valuation
  calculation may overwrite an Owner-entered cost/selling price's unit
  label with a converted equivalent anywhere in stored data or default
  display."*
- **`business-worth-evolution-specification.md` §36, item 1 — an
  explicitly named, still-open Rule-8 technical question, never
  resolved by any subsequent artifact:** *"Whether and how Contagem's
  Mode B (multiple simultaneous selling-unit prices) interacts with
  the existing `units[0]`-reference-unit convention
  `product-unit-of-measure-specification.md` §4 already establishes
  for Periodic Contagem's mixed-unit combination (§15)."* Verified,
  this session: this item is not among the two items the Product
  Architect's 22 August 2026 review resolved (§36's own header note),
  is not addressed by the existing-product selling-unit reconciliation
  (§3, below — that document explicitly scoped itself to *default*
  values only), and is not addressed by the §45 amendment (which
  explicitly declared Mode A/B mechanics unaffected, §6, below). It
  remains open as of this draft.
- **`product-unit-of-measure-specification.md` §4** — the original
  "mixed-unit combination" description for Periodic Contagem: *"The
  mixed-unit combination step (Decisions 6–7) converts all entries for
  one product within one count to the confirmed chain's top-level
  unit, `units[0]`, for valuation purposes — the same single reference
  point Add Stock's default already uses... no separate, configurable,
  or per-count reference-unit choice is introduced."* This establishes
  that combining multiple physical-count units into one valuation
  reference point is not a new concept this amendment invents — it is
  the ORIGINAL model's own stated mechanism, later superseded in its
  specific reference-point choice (`units[0]` → confirmed `sellingUnit`
  where present) by the reconciliation below, and realized in code as
  Mode A.
- **`business-worth-evolution-specification.md` §15, the §42 Amendment
  (Cost-basis preservation across portions)** — **highly relevant
  precedent, already signed:** *"When a Contagem portion's unit differs
  from the product's original purchase unit, and a valid, confirmed
  `unitRelationship` exists covering that unit, the system
  **automatically and unconditionally** computes that portion's cost
  price via the existing `getConversionFactor` engine... never as an
  Owner-facing toggle, never opt-in per product, never requiring manual
  entry."* **FR-67 [original numbering, §42]**: *"For a multi-portion
  Contagem entry where a portion's unit differs from the product's most
  recent purchase unit, and a valid, confirmed `unitRelationship`
  exists covering that unit, the system MUST automatically and
  deterministically compute that portion's cost price via the existing
  unit-relationship conversion engine — never as an optional or
  Owner-configurable behavior."* **This confirms the exact automatic,
  no-toggle-required cross-unit conversion this amendment proposes for
  selling price already exists, is already signed, and is already
  implemented for cost.** This amendment's own core request is
  substantially a parity extension of an already-proven, already-
  accepted mechanism to the selling side.
- **`docs/engineering/periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md`**
  and **`docs/engineering/uom-specification-section4-existing-product-contagem-reconciliation-addendum.md`**
  (✅ SIGNED, 29 August 2026) — established that a confirmed
  `Product.unitRelationship.sellingUnit` is the reference point for
  selling-price valuation, superseding `units[0]` as the preferred
  reference. **Verified, this session, by direct re-reading: this
  reconciliation's own §4 explicitly scoped itself to "the *default*
  Mode A starts from, and the *default* `buildCatalogRow` uses before
  Mode A is even [activated]"** — i.e., it decided which value a row
  or Mode A's control *starts with*, not what happens once the Owner
  edits a row's `unit` field directly in Mode B, and not whether Mode A
  activation itself should be automatic. This amendment does not
  reopen that reconciliation's own determination in any way.
- **`docs/specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`**
  (proposed §45, ✅ ACCEPTED AND SIGNED, 30 August 2026, FR-78–FR-88) —
  established durable `Product.sellingPrice`/`unitRelationship.sellingUnit`
  memory and its automatic loading, but **explicitly declared Mode A/
  Mode B mechanics out of scope**: *"Mode A / Mode B selling-price
  mechanics, the Selling Price deviation warning, and existing
  conversion/rounding discipline (`POL-0001`/`POL-0002`) — unaffected"*
  (§6, Explicit Non-Scope). The signed Implementation Authorization for
  FR-78–FR-88 (§2, "What Is Authorized") likewise never touches the two
  `unit`-editing call sites (`updateCatalogRow`/`updateManualRow`) or
  `StockCountWorkingRow`'s schema.
- **Investigation performed this session** (repository at `HEAD
  8f789d8`, the commit landing the FR-78–FR-88 implementation) —
  confirmed by direct code inspection: `StockCountWorkingRow`
  (`apps/tenant/src/utils/stockCount.ts`) has exactly one `unit: string`
  field, used simultaneously as the physical-count denomination and the
  implicit denomination of that same row's `sellingPrice`. The two
  places a row's unit is edited (`PeriodicStockCountView.tsx`,
  `updateCatalogRow`/`updateManualRow` call sites) are plain field
  writes with no recalculation of `sellingPrice` in response. The only
  existing mechanism that decouples a physical-count unit from a
  different selling reference unit/price is Mode A, which requires an
  explicit Owner toggle (`handleModeAToggle`) and is not applied
  automatically.

**Does not amend:** FR-67's cost-basis conversion engine or its §42
automatic-conversion rule (restated, extended in spirit, not altered);
the existing-product selling-unit reference-point reconciliation's own
determination (which value is the *default*); the §45 amendment's own
FR-78–FR-88 scope; `getConversionFactor`, `resolveUnitAwarePrice`,
`deriveModeAPortionValuations` (reused, not modified); Business Worth
formulas; Initial Stock; Add Stock/Smart Stock Entry; the Product
Catalog's already-approved ownership model.

---

## 2. Problem Statement

An operator counting physical stock denominates the count in whatever
unit is physically convenient (e.g. counting full boxes: "12 Cx"). The
product's confirmed selling denomination may be a different unit in the
same relationship chain (e.g. "sold per Un, at 50 MZN/Un"). These are
two independent facts — how the stock was physically measured, and how
the product is sold/valued — but the current data model represents them
with a single shared field (`StockCountWorkingRow.unit`), and the only
existing mechanism that reconciles them (Mode A) requires an explicit,
manual Owner action for every count, every time, even when the
product's selling unit and price are already durably remembered
(per FR-78–FR-88).

## 3. Existing Behavior (verified, this session, against `HEAD 8f789d8`)

1. `buildCatalogRow` correctly pre-fills a fresh row's `unit`/
   `sellingPrice` from the confirmed `sellingUnit`/remembered price
   (already-signed reconciliation, §1 above) — **before** the Owner
   edits anything, the row is correct.
2. If the Owner edits "Unid" to reflect the physically-counted unit
   (e.g. "Cx"), `sellingPrice`'s numeric value is left unchanged by
   `updateCatalogRow`/`updateManualRow` — the row now means "50 MZN/Cx"
   unless the Owner separately, manually recalculates and retypes it.
3. Mode A, if explicitly toggled on, correctly derives the converted
   per-portion price via `deriveModeAPortionValuations`
   (`contagemMultiUnitValuation.ts`, unmodified) using the confirmed
   `sellingUnit` as its default reference (already-signed
   reconciliation) — this already produces the mathematically correct
   result for the Txilar example (§9, below) — but only once activated.
4. No code path anywhere writes `sellingUnit = row.unit` or otherwise
   actively copies the physical-count unit into a selling-unit field —
   the coupling is structural (one shared field, no independent
   selling-unit representation on a Mode-B row), not an errant
   assignment.
5. FR-67/§42's cost-side conversion (§1, above) already performs the
   selling side's proposed behavior automatically, for cost, today —
   establishing direct, already-accepted precedent that automatic,
   no-toggle cross-unit conversion within Contagem is not a new kind of
   behavior for this system to have.

## 4. New Product Architect Decision

**[ACCEPTED]**

Periodic Contagem's physical-quantity denomination and selling
denomination are formally established as independent concepts, for
both existing and first-time products, with the confirmed/remembered
selling unit and price preserved as the selling reference regardless of
which unit the physical count is entered in — **without requiring the
Owner to manually activate Mode A** to obtain this behavior for a
single portion. This resolves Specification §36 item 1 (the long-open,
never-decided Rule-8 question on Mode B/`units[0]` interaction) in the
selling-unit-confirmed case, and extends FR-67/§42's already-accepted
automatic-cross-unit-conversion precedent from cost to selling price
under the same conditions and the same narrow exception (no valid
relationship covering the entered unit → manual entry, exactly as
today, never fabricated).

## 5. Scope

Applies to Periodic Contagem only — the physical-count-unit/selling-
unit relationship for a counted portion, whether recorded via a
catalog row (existing product) or a manual row (new portion of an
existing product, or a genuinely new product's first portion).

## 6. Explicit Non-Scope

Does not touch: Add Stock/Smart Stock Entry (FR-22, unaffected, single-
unit-per-batch model preserved); Initial Stock (§14, below); FR-67's
own cost-basis engine internals (reused, not modified — §42's rule
already exists exactly as needed); `getConversionFactor`,
`resolveUnitAwarePrice`, `deriveModeAPortionValuations` (reused
verbatim); the Business Worth formula; the already-approved Product
Catalog's field set or ownership model (§16, below — restated, not
redesigned); the existing-product selling-unit reference-point
reconciliation's own determination of *default* values; §45's own
FR-78–FR-88 scope (cost removal, selling-price/unit memory
establishment, purchase-cost memory, catalog extension — all preserved
exactly, §15 below); Mode A's/Mode B's own existing terminology, or the
Owner's ability to explicitly choose Mode B (independently-priced
portions) when that is genuinely what they intend (§12, below — this
amendment narrows *when* the automatic reference-unit behavior applies,
it does not remove Mode B or force Mode A universally).

---

## 7. Formal Requirements

**FR-89 [new, accepted].** For a counted portion of a
product with a confirmed, valid `unitRelationship.sellingUnit`, when
that portion's own physical-count unit differs from the confirmed
`sellingUnit`, and a valid conversion exists between the two via the
existing `getConversionFactor` engine, the system MUST automatically
compute and apply that portion's selling value using the product's
confirmed/remembered selling price and selling unit as the reference —
without requiring the Owner to explicitly activate Mode A first. This
extends FR-67/§42's identical automatic-conversion principle from cost
to selling price, under the identical narrow exception: when no valid,
confirmed relationship covers the entered unit, the Owner enters the
selling price manually, exactly as today (§42's own exception,
restated).

**FR-90 [new, accepted].** The physical-count quantity and
its entered unit label must never be altered, rewritten, or silently
replaced as a side effect of FR-89's automatic reference-unit
resolution — restates and applies FR-21 (unchanged, already signed) to
this specific mechanism.

**FR-91 [new, accepted].** The confirmed/remembered
selling unit and selling price must never be silently altered,
converted, or overwritten as a side effect of the Owner changing a
portion's physical-count unit. Changing the physical-count unit updates
only how that portion's quantity is denominated; it must never modify
`Product.sellingPrice`, `Product.unitRelationship.sellingUnit`, or any
in-progress row's own selling-price *reference* — restates and applies
FR-23 (unchanged, already signed) to this specific mechanism, and is
consistent with FR-85 (§45, two independent write authorities,
unaffected and unextended here — FR-91 concerns display/derivation
consistency within one Contagem entry, not the memory-write authority
question FR-85 already settles).

**FR-92 [new, accepted].** When the Owner deliberately and
explicitly changes the selling price and/or selling unit during
Contagem — including by explicitly activating Mode A with a different
reference unit/price, or by explicitly editing an individual portion's
own selling price after acknowledging it no longer represents the
confirmed selling unit — that explicit entry becomes the new current
selling-price/selling-unit memory, exactly as FR-83/FR-84 (§45,
unchanged) already govern. FR-89's automatic reference-unit resolution
is a *default*, never a constraint that blocks or reverts a genuine
Owner-intended change.

**FR-93 [new, accepted].** FR-89's automatic resolution
applies identically to a genuinely new product's first Contagem, once
that product's selling unit and price have been established earlier in
the same Contagem session (`NewProductInfoPanel`'s existing selling-
unit selector, unaffected) — a physical count entered in a different
chain-member unit before or after that establishment must resolve
against the just-established selling unit/price, not force the Owner
to also count in the selling unit itself.

**FR-94 [new, accepted].** This amendment does not require
any change to `StockCountWorkingRow`'s persisted schema or to
`StockCount.items`' own shape — FR-89's resolution is a *derivation*
applied at valuation/display time from the portion's own already-stored
`unit` plus the product's already-confirmed `unitRelationship`/
remembered price, mirroring exactly how FR-67/§42's cost-side
conversion already operates without any schema change. Whether the
smallest correct implementation mechanism is a persistence-layer
change, a pure display/valuation-layer derivation, or some combination
is explicitly a Rule-8 question (§17, below) — this FR fixes only that
no schema change is presumed necessary, not the exact mechanism.

---

## 8. Invariants

- **Quantity/unit invariant:** a portion's physical quantity and its
  entered unit label are Owner-observation data — set only by direct
  Owner entry, never derived, never rewritten by any selling-side
  computation (FR-90/FR-21).
- **Selling price/unit invariant:** the selling price and selling unit
  used for valuation are the product's confirmed/remembered pair
  (FR-78–FR-88, unchanged) unless the Owner explicitly overrides them
  in this same Contagem (FR-92).
- **Unit relationship invariant:** the confirmed `unitRelationship`
  remains the sole conversion authority between any two units in the
  chain (unchanged, Decision 37 item (c); `getConversionFactor`
  unmodified).
- **Valuation invariant:** a portion's contribution to
  `normalizedTotalSellingValue` reflects the TRUE selling value implied
  by its physical quantity converted through the confirmed relationship
  to the confirmed selling unit and price — never a value computed by
  treating the physical-count unit as if it were the selling unit,
  unless the Owner has explicitly made that so (FR-92).
- **Memory invariant:** `Product.sellingPrice`/`unitRelationship.sellingUnit`
  memory (§45, unchanged) is written only from an Owner's explicit
  selling-price/unit entry — never inferred from, or influenced by,
  which unit the Owner happened to count the physical stock in.
- **Price-change invariant:** an Owner's deliberate, explicit selling-
  price change becomes the new remembered selling price immediately
  (FR-83, unchanged) — FR-89's automatic default behavior is never a
  reason to delay, block, or revert a genuine change.
- **First-Contagem invariant:** a genuinely new product's first
  physical count may use any chain-member unit; the selling unit/price
  established in the same session governs valuation identically to an
  existing product's confirmed memory (FR-93).
- **Subsequent-Contagem invariant:** every later Contagem automatically
  loads and applies the remembered selling unit/price as the valuation
  reference for every counted portion, regardless of which unit each
  portion is physically counted in (FR-89, extending FR-82/§45
  unchanged).

## 9. Txilar Acceptance Model

**Given:** `Txilar`, confirmed relationship `1 Cx = 4 Emb = 24 Un`,
confirmed `sellingUnit = Un`, remembered `sellingPrice = 50`.

**When:** the Owner counts the physical stock as `12 Cx` and enters
nothing further regarding selling price/unit for this portion.

**Then:**
- the portion's own displayed/stored quantity and unit remain exactly
  `12` / `Cx` (FR-90);
- the system automatically resolves this portion's selling
  contribution using the confirmed `sellingUnit`/`sellingPrice`
  reference — `12 Cx × 24 Un/Cx × 50 MZN/Un = 14,400 MZN` (FR-89);
- `Product.sellingPrice`/`sellingUnit` memory remains `50`/`Un`,
  unchanged by this count (FR-91);
- no explicit Mode A activation was required.

## 10. Selling-Price-Change Acceptance Model

**Given:** the same product, same prior memory (`sellingUnit = Un`,
`sellingPrice = 50`).

**When:** the Owner deliberately changes the actual selling price
during this Contagem to `55` (in `Un` terms, or via an explicit Mode A
reference-price change, or via an explicit per-portion override the
Owner acknowledges) and confirms the count.

**Then:**
- the physical quantity/unit entered for any portion remains exactly
  as the Owner entered it, untouched (FR-90);
- the new value, `55 MZN/Un`, becomes the current remembered
  selling-price memory (FR-92, restating FR-83);
- no rule in this amendment prevents, delays, or reverts this
  legitimate change;
- a subsequent Contagem automatically loads `55`, not the superseded
  `50` (FR-82, unchanged).

## 11. First vs. Subsequent Contagem

**First Contagem (genuinely new product):** the Owner establishes
identity, unit relationship, selling unit, and selling price via
`NewProductInfoPanel` (unaffected by this amendment); the physical
count for any portion may use any chain-member unit; FR-93 requires
that portion's valuation resolve against the just-established selling
unit/price exactly as FR-89 requires for an existing product's
remembered pair. No historical/original purchase-cost input is
reintroduced (§45, unaffected, restated).

**Subsequent Contagem (existing product):** the remembered selling
unit/price load automatically (§45 FR-82, unaffected); FR-89 applies
identically to every counted portion regardless of its own physical-
count unit; an Owner's explicit change (FR-92) supersedes the loaded
memory going forward.

## 12. Mode A / Mode B Relationship

This amendment does not remove, rename, or redefine Mode A or Mode B.
It changes *when* Mode A's own existing reference-unit/derived-price
mechanism (`deriveModeAPortionValuations`, unmodified) is applied:
today, only after explicit Owner toggle; under FR-89, automatically,
by default, whenever a confirmed `sellingUnit` and a valid conversion
exist — with Mode A (or an explicit per-portion override) remaining
available for the Owner to deliberately choose a *different* reference
unit/price or independently-priced portions (FR-20, unaffected: *"...
without forcing a choice the Owner has not made"* — FR-89 supplies a
sensible default, it does not remove the Owner's existing choice).
Whether the correct implementation realizes this as "Mode A activates
automatically whenever applicable" or as "a new, distinct default
valuation path that produces Mode A's identical output without
surfacing Mode A's own UI" is explicitly left to Rule 8 (§17, below) —
this amendment decides the required *behavior*, not the UI mechanism
that delivers it.

## 13. Business Worth Impact

**None to the formula itself.** `productValuationTotal`/
`normalizedTotalSellingValue`/`measuredBusinessWorth` remain unchanged
— FR-89 only ensures the VALUE fed into that already-existing,
unmodified formula correctly reflects the confirmed selling unit/price
rather than a value silently mis-denominated by an unrelated
physical-count unit change. This amendment *closes* a real valuation-
understatement risk identified during investigation (a portion counted
in a divergent unit, with an unretouched remembered price, previously
undervalues that portion's contribution by the chain's own conversion
factor) — it does not introduce a new valuation input or method.

## 14. FR-67 Impact

**None — FR-67/§42's cost-basis conversion engine, its automatic-
conversion rule, and its own narrow manual-entry exception are entirely
unmodified.** This amendment's FR-89 is explicitly modeled on, and
reuses the identical `getConversionFactor` engine as, FR-67/§42's
already-accepted cost-side precedent — it does not alter FR-67 itself
in any way, and cost and selling remain governed by their own,
independent conversion applications of the same shared, unmodified
engine.

## 15. Compatibility with FR-78–FR-88 (§45)

Fully preserved and unaffected:

- No historical/original purchase-cost input is reintroduced into
  Periodic Contagem (§45 §7/§8, FR-78/FR-80).
- Durable `Product.sellingPrice`/`unitRelationship.sellingUnit` memory
  establishment and its automatic loading (§45 §10, FR-81–FR-84)
  remain exactly as signed — FR-89 consumes that same remembered pair
  as its reference, it does not change how or when it is written.
- Purchase cost/cost-unit memory (§45 §12, FR-86) remains exclusively
  owned by Add Stock/Smart Stock Entry, untouched.
- The Product Catalog's six-field reviewable surface and ownership
  split (§45 §13, FR-87/FR-88) are unaffected — restated in §16, below.
- Initial Stock's exclusion (§45 §12, the verified `type !== 'initial'`
  guard) is unaffected — this amendment introduces no new persistence
  write of any kind, so no new Initial Stock guard is even needed;
  restated as a boundary in §6, above.

## 16. Product Catalog Relationship

**Restated, not redesigned, per the originating instruction.** The
already-approved ownership model is unaffected: Cost/Cost Unit remain
purchase-side memory (Add Stock/Smart Stock Entry); Selling Price/
Selling Unit remain Contagem/product-memory-owned; Unit Relationship
remains the shared conversion/reference structure; Periodic Contagem's
physical quantity/unit is explicitly confirmed, by this amendment, to
be measurement input only — never itself a definition of the selling
unit, and never displayed or stored in the Catalog as if it were one.

---

## 17. Implementation Implications for Rule 8

Explicitly deferred to Rule 8, not decided here: (a) the exact
mechanism realizing FR-89 — extending `buildCatalogRow`'s/
`handleModeAToggle`'s existing resolution pattern, a new derivation
step at valuation time, or reuse of `deriveModeAPortionValuations`
called automatically rather than only after toggle; (b) whether any
UI change is needed to make the automatic resolution visible/legible to
the Owner (e.g. showing the derived per-Cx or total value alongside the
confirmed Un-denominated reference, so the Owner is never misled about
what "50" means once entered under a different physical-count unit);
(c) interaction with the existing Selling Price deviation warning
(`getRememberedPriceForRow`, unaffected in principle but requiring
Rule-8 confirmation it still fires correctly under FR-89's new default
path); (d) exact test coverage required, building on the coverage gap
identified during investigation (no existing test asserts "quantity
unit ≠ selling unit, values correctly, without Mode A toggle").

## 18. Required Downstream Governance Gates

Unchanged sequence, per this repository's established convention: (1)
Product Architect acceptance of this amendment (§20, below — currently
unsigned); (2) a new Rule 8 Assessment for this amendment's own scope
(FR-89–FR-94), addressing §17's deferred questions; (3) an
Implementation Plan; (4) a signed Implementation Authorization; (5)
implementation. **No existing Rule 8 Assessment, Implementation Plan,
or Implementation Authorization for FR-78–FR-88 requires reopening or
amendment** — this is additive, new governance for a distinct,
previously-unaddressed gap (§36 item 1), not a correction to anything
FR-78–FR-88 itself decided. The existing-product selling-unit
reference-point reconciliation and its own Implementation Authorization
likewise require no reopening — restated, not superseded (§1, above).

## 19. Explicit Non-Goals

Not decided here: the exact UI/implementation mechanism (§17); whether
Mode A's own visible toggle/UI changes at all, or only its default
activation condition; any change to `StockCountWorkingRow`'s schema
(FR-94 presumes none is needed, subject to Rule 8 confirmation); any
change to the Selling Price deviation warning's own logic; any change
to FR-67/§42's cost-side behavior; any change to Add Stock, Smart Stock
Entry, Initial Stock, or the Business Worth formula; any redesign of
the Product Catalog's field set or ownership.

---

## 20. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed the complete amendment draft as written and confirm
> this introduces no change beyond what is recorded above — the
> formal independence of Periodic Contagem's physical-quantity
> denomination from its selling denomination (§4), FR-89 through
> FR-94, the automatic-by-default reference-unit resolution extending
> FR-67/§42's already-accepted cost-side precedent to selling price
> (§7), the Txilar and selling-price-change acceptance models (§9,
> §10), and the explicit preservation of Mode A/Mode B's own
> terminology and the Owner's ability to make a genuinely different
> choice (§12) — with no change to FR-67 itself, the Business Worth
> formula, Initial Stock, Add Stock/Smart Stock Entry, the existing
> selling-unit reference-point reconciliation's own determination, or
> any part of the already-signed FR-78–FR-88 scope. This amendment is
> **ACCEPTED and SIGNED**, effective this session.

Decision: I APPROVE AND SIGN

**Product Architect:** SABUSHIMIKE MASCENI

Date: 30 August 2026

This acceptance authorizes proceeding to a new Rule 8 Assessment for
FR-89–FR-94's own scope. It does not, on its own, authorize any code
change — an Implementation Plan and a signed Implementation
Authorization remain required, separate gates after Rule 8 (§18).
