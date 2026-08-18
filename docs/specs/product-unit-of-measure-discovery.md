Discovery Report — Not a Business Domain Specification

# Product Unit-of-Measure & Product Memory — Discovery Report

**Status:** Investigation only. No code, Firestore rule, calculation,
test, or governance document referenced here has been changed to
implement anything. This document is the evidence base the pending
Product Unit-of-Measure & Product Memory BDR (`[TO BE ASSIGNED]`) is
built from.
**Investigated:** Repository as of commit `10c6dfe` (branch `main`),
across two sessions in the same governance thread — an initial broad
architectural investigation, followed by a narrower, targeted
follow-up investigation this report's own Part I explicitly
recommended (Part I §10) and Part II performs.
**Depends on:** Nothing — this is the originating evidence for the
pending BDR, the same role `stock-count-simplification-discovery.md`
plays for `BDR-0009`.
**Followed by:** The pending Product Unit-of-Measure & Product Memory
BDR (business decision only, no artifact number yet assigned).
**Scope of investigation, Part I:** `docs/specs/03-products.md`,
`05-stock-batches.md`, `10-stock-counts.md`, `04-smart-stock-entry-amendment.md`,
`BDR-0009-stock-count-physical-observation.md`,
`stock-count-simplification-discovery.md`, `apps/tenant/src/types.ts`,
`apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/utils/calculations.ts`,
`apps/tenant/src/utils/stockCount.ts`, `apps/tenant/src/utils/purchaseBatchCalculations.ts`,
`apps/tenant/src/utils/deleteProductPlan.ts`, `apps/tenant/src/components/AddStockView.tsx`,
`apps/tenant/src/components/InitialStockCountView.tsx`,
`apps/tenant/src/components/PeriodicStockCountView.tsx`,
`apps/tenant/src/components/EditProductModal.tsx`,
`apps/tenant/src/components/DashboardView.tsx`,
`apps/tenant/src/components/reports/*.tsx`, `apps/tenant/src/components/ClosingView.tsx`,
`apps/tenant/src/data/businessCategories.ts`, `apps/tenant/src/data/sampleData.ts`,
`server/smartStockEntry.ts`, `firestore.rules`, `firebase.json`.
**Scope of investigation, Part II:** `docs/specs/02-business-worth-engine.md`
(read in full), `server/index.ts` and every Firebase-Admin-dependent
script in `scripts/`/`server/scripts/`, `apps/superadmin/src/`, this
sandbox's own network egress configuration, and
`docs/engineering/18-superadmin-business-directory-closeout.md` (as an
independent precedent for the identical class of environment
limitation).

---

# Part I — Unit of Measure & Product Memory Architecture

## 1. Current Data Model — confirmed, not assumed

`Product` (`types.ts:300–311`): `id`, `name`, `createdAt`, `updatedAt?`,
`category?`, `supplier?`, `sku?`, `barcode?`, `costPrice?`,
`sellingPrice?`. **No unit field. No conversion field.** Its own header
comment: these two prices are "a REFERENCE price... NOT used by any
Investment/Market/Profit calculation."

`StockBatch` (`types.ts:188–210`): `quantity` (number), `unit?` (free
optional string), `costPrice`/`sellingPrice` ("per unit," where "unit"
is whatever string is on the batch). Unit lives on the batch, never the
product. `StockCountItem`, `InitialStockDraftItem`,
`PeriodicStockDraftItem` (`types.ts:388–492`) each carry exactly one
`quantity` + one `unit` per row — structurally, one row can express
only one unit at a time.

**Products ARE persistent entities**, separate Firestore documents at
`businesses/{businessId}/products/{productId}` (`firestore.rules:319–323`),
referenced by batches via `productId` — not embedded in batches.

Same product, multiple batches, different units: structurally possible
today (nothing prevents it) but never linked or converted between —
each batch's `unit` is an independent, unvalidated string.

`EditProductModal.tsx` (the one place Product catalog metadata is
directly edited) has fields for Name, Category, Supplier, SKU,
Barcode, and the two reference prices — **no unit field anywhere in
this form.**

## 2. Product Creation, Naming, Matching — confirmed

Products are created implicitly, as a byproduct of Stock Entry — no
standalone "Add Product" form (`03-products.md`'s own explicit design).
Matching is **exact, case-insensitive name comparison only**
(`p.name.toLowerCase() === trimmedName.toLowerCase()`), applied
identically in three independent code locations: `AppContext.tsx:1572`
(manual Add Stock), `server/smartStockEntry.ts:202` (OCR), and both
Stock Count views. **No fuzzy matching, alias table, or normalization
of spacing/punctuation/accents exists anywhere** — confirmed by
exhaustive grep for `levenshtein`, `fuzzy`, `similarity`, `Fuse`,
`jaro`, `normalize` across the repository (only unrelated hits:
currency formatting, business-category keyword detection).
`barcode`/`sku` fields exist on `Product` but are **never read by any
matching logic anywhere** — stored, editable, unused.

## 3. Initial Stock, Add Stock — confirmed

Both flows: free-text name (autocomplete against existing `products`),
free-text unit (defaulting to `suggestedUnits[0] || 'un'`, a
category-based *suggestion list* — `getSuggestedUnitsForCategory`,
`businessCategories.ts:308–393` — not a controlled vocabulary), and two
separate manual numeric price inputs. **No separate "sale unit" field
exists anywhere** — one `unit` field serves purchase, sale, and count
purposes undifferentiated. **No conversion is performed anywhere.**
Add Stock (`AddStockView.tsx:130–173`) inherits `unit`/`costPrice`/
`sellingPrice` from the product's most recent batch when an existing
product is matched — editable, never locked.

## 4. Smart Stock Entry (OCR/Receipt Pipeline) — confirmed, already implemented

A real, working Tier-1 pipeline exists: `server/smartStockEntry.ts`
(443 lines). Extracts per line item: `productName`, `quantity`, `unit`
(verbatim from the document — its own prompt explicitly instructs
"never convert or infer a different unit"), `costPrice`. **Selling
price is never extracted** (prompt explicitly forbids it). Matching:
identical exact-name rule as manual entry; a reserved-but-unused
`'uncertain'` bucket exists in the type specifically "so a future Tier
4 fuzzy-matching capability has somewhere to report a genuine 'maybe'"
— direct existing scaffolding for a future duplicate-confirmation flow.
Review/confirmation: full — every OCR-populated row is merged directly
into `AddStockView`'s existing editable table; nothing is written to
Firestore until the user finalizes the whole batch.
**Duplicate/spelling-variant detection does not exist** — two
differently-spelled OCR reads of the same real product would both
resolve `no_match` and, if both finalized, silently create two
unlinked `Product` records.

## 5. Periodic Stock Count — confirmed

One row = one `productName` + one `quantity` (raw string) + one `unit`
(raw string) + one `costPrice`. **Nothing prevents entering the same
product as multiple separate rows with different units — and nothing
combines them either.** Each row is valued fully independently
(`quantity × costPrice`); the system has no awareness that two rows
might represent the same physical item. Concretely: `5 Cx + 3 Emb + 4
Un` entered as three rows today produces three unrelated
`StockCountItem`s, summed arithmetically with no consistency check
across their manually-entered `costPrice` values. Draft/autosave
(`PeriodicStockDraft`, `types.ts:476–492`) is a mature,
crash-resilient, submission-id-idempotent mechanism, independently
verified this session at 5/5 passing (`periodic-stock-finalization.test.ts`,
externally executed and reviewed per this thread's own Stage 10
verification history) — **any future capability here must not regress
this mechanism.**

## 6. Business Worth / Calculation Engine — confirmed

`calculateBatch`/`calculateInventoryTotals` (`calculations.ts:10–88`)
never read `batch.unit` anywhere (zero matches on grep). Every
`quantity` is treated as a plain, dimensionless, summable number.
**Four independent quantity-summing paths were confirmed, not two:**
`calculateBatch`/`calculateInventoryTotals` (the two named in the
originating task), plus `calculatePurchaseBatchSummary`
(`purchaseBatchCalculations.ts:133–160`, sums `batch.quantity` across a
Purchase Batch's line items independently) and `normalizeStockCountItems`
(`stockCount.ts:47`, the separate Stock-Count valuation path). Beyond
`AppContext.tsx`'s own aggregate call, `calculateBatch` is independently
imported and called in **five separate UI files**:
`DashboardView.tsx`, `BusinessWorthReport.tsx`,
`InventoryValuationReport.tsx`, `ProductDetailModal.tsx`,
`AddQuebraView.tsx` — each would need review under any unit-aware
change to its contract.

**`Closing` snapshots are already structurally immune to any future
change in this calculation.** `recordClosing` (`AppContext.tsx:2818–2836`)
freezes `businessWorthAtClose`/`inventoryCostAtClose`/
`inventoryMarketValueAtClose` permanently at close time — a future
change to how `businessWorth` is computed cannot retroactively alter an
already-recorded `Closing`.

**Stock Count valuation and Business Worth are deliberately separate,
governed, non-merged paths** — `10-stock-counts.md:105–113`, citing a
specific past incident (an earlier version fabricated a cash figure by
assuming remaining batch units had sold) as the explicit reason this
separation exists and must not be reopened.

## 7. Existing Conversion Support — confirmed: none

Exhaustive grep across the entire non-`node_modules` codebase for
`conversion`, `UOM`, `measurement`, `packaging`, `base unit`,
`equivalent quantity`, `factor`, `multiplier` returns zero
implementation hits.

## 8. Existing Governance — confirmed, decisive

Unit-of-measure conversion has been **explicitly and repeatedly
excluded, in writing, at least three separate times**, before this
investigation began:

1. `04-smart-stock-entry-amendment.md:255–259,395` — *"Unit-of-measure
   conversion is explicitly **not** part of this amendment... a future,
   separate capability if ever pursued."* Listed again verbatim in its
   Non-Goals (line 395): *"Unit-of-measure conversion (carton→bottle,
   sack→kilogram, etc.)."*
2. `BDR-0009-stock-count-physical-observation.md`, §2 Decision 11:
   *"No unit-of-measure conversion logic is introduced. The simplified
   Stock Count screen displays each product's existing, already-recorded
   unit string unchanged — it neither converts between units nor
   invents a canonical unit representation."* Restated verbatim in §7.
3. `stock-count-simplification-discovery.md` §7 — an entirely
   independent, prior investigation reaching the identical conclusion:
   *"No conversion table or normalization logic exists anywhere in
   `calculations.ts` or `AppContext.tsx`."*

`03-products.md` (the authoritative Product spec) contains no unit
concept anywhere, and its own "Future Enhancements" list — photo
upload, replacing `window.confirm()`, AI repricing suggestions,
category browsing — **does not name unit conversion at all**, meaning
it hasn't even been informally proposed as a future direction in the
one document that would be expected to name it.

`firestore.rules:319–323` confirms `products` is fully tenant-scoped;
two businesses can have identically-named products with fully
independent records. `apps/superadmin/src/` contains zero references
to `products`/`stockBatches`/`batches` anywhere — no cross-tenant
product visibility exists at any privilege level.

## 9. Price Semantics — an open question surfaced, not resolved

What "selling price = 70 MZN/Un" means when the purchase was "1 Cx @
1,200 MZN" is **not answered by any existing code or governance
document** — this is genuinely new ground. The existing
`InitialStockPriceChangeEvent` mechanism (`types.ts:552–621`) is
directly relevant prior art: an append-only, immutable, dated-event
pattern that already solves an analogous "preserve history, apply a
newer confirmed value going forward" problem for price changes, without
ever rewriting the original record.

## 10. Recommended Next Investigation (as originally written — now performed in Part II)

This investigation's own original conclusion named exactly two
concrete gaps: (a) `02-business-worth-engine.md` had not been read in
full, and (b) no real production Firestore data had been queried to
assess historical mixed-unit prevalence. Both are addressed in Part II
below.

---

# Part II — Business Worth Engine Governance & Actual Data Access

## 11. Business Worth Engine Specification — read in full, confirmed

`02-business-worth-engine.md` (299 lines, all read). **Zero occurrences
of "unit" anywhere in the document** — confirmed by direct grep, not
inferred from silence alone. Every "product" occurrence is the generic
English word, never the `Product` entity. `Product` is never named in
the spec's Business Rules, Functional Requirements, or Implementation
section at all.

**Two constraints directly consequential for any future implementation:**
- Functional Requirement 5 / Acceptance Criterion (lines 189–195,
  293–295): *"`calculations.ts` has zero imports from anywhere else in
  `src/` — confirmed by code review... This is a functional requirement,
  not an implementation preference."* Any conversion logic implemented
  as a separate, imported utility inside `calculations.ts` would
  violate this as-written, tested Acceptance Criterion.
- Acceptance Criterion (lines 285–287): `calculateBatch`/
  `calculateInventoryTotals` must produce identical results wherever
  called — directly consequential given Part I §6's finding of five
  independent direct-call sites.

**Immutability, confirmed as an existing "no exceptions" tier, not a
new proposal:** `businessWorthAtClose` (frozen at Closing, line
98–103) and `initialCapitalValue` (frozen at first record, line
125–127) are both already governed under Architecture Section 7.6's
"truly immutable, no exceptions" tier — independent of anything this
future capability would introduce.

**The Expected Current Stock Value tension, resolved:** lines 141–149
confirm `Expected Current Stock Value` (a Contagem-only comparison
figure) directly reuses `calculateInventoryTotals`'s
`totalInvestmentValueAllTime` output, while remaining explicitly
excluded from feeding back into `businessWorth`/`capitalGrowth`
themselves. This is the exact tension `stock-count-simplification-discovery.md`
§8 flagged without resolving — now confirmed directly from the spec's
own text. It also demonstrates an existing, working "explicit non-goal
amendment" pattern (used twice in this spec already) for attaching a
new figure to this Engine's ecosystem without rewriting its core
formulas — a structurally lower-risk precedent for how a future
amendment here might be shaped.

**Reports, Owner Portfolio, Closings, Capital Growth — governance
coverage confirmed, with one gap found:** Reports and Closings are
named explicitly as consumers (lines 60–61); Capital Growth is defined
directly in this spec. **Owner Portfolio is named nowhere in this
spec** — a pre-existing documentation gap, unrelated to unit-of-measure,
surfaced as a byproduct of this reading, despite Owner Portfolio's
`currentWorth` (delivered earlier in this same governance thread)
directly reusing `calculateInventoryTotals`'s output per-shop.

## 12. Authorized Firestore/Data Access — exhaustively searched, confirmed absent

- **Firebase Admin SDK** (`server/index.ts:21,89–109` and all four
  scripts in `scripts/`/`server/scripts/`): all require
  `FIREBASE_SERVICE_ACCOUNT_BASE64` — confirmed absent from this
  sandbox's environment (`env | grep -i FIREBASE` returns nothing).
- **Network reachability, directly tested this session:**
  `curl https://firestore.googleapis.com` returns **HTTP 403**,
  `"Host not in allowlist: firestore.googleapis.com."` — the sandbox's
  own egress proxy, reproducing the identical restriction class a
  prior session in this repository already documented for a different
  production host (`18-superadmin-business-directory-closeout.md:200–204`:
  *"This Claude environment has no network access to production... `x-deny-reason: host_not_allowed`"*).
- **No read-only diagnostic/audit script exists anywhere** — all four
  found scripts are one-time, writable, operator-run migration/
  provisioning tools, none read-only, none general-purpose.
- **SuperAdmin app:** zero product/batch visibility, confirmed by
  direct grep (Part I §8).
- **No seed data, no emulator export, no fixture-loading mechanism**
  (`firebase.json`'s emulator config defines only ports and rules/
  indexes paths).
- **This repository's own hand-curated sample data
  (`sampleData.ts`, 172 lines, read in full) never sets a `unit` value
  on any sample `StockBatch`** — noted as a data point about this
  repository's own demo data, explicitly not generalized into any
  claim about real production data.

**Conclusion: no authorized mechanism to inspect representative
Firestore data exists anywhere in this repository or this sandbox** —
independently confirmed by (a) missing credentials, (b) a
directly-reproduced network-level block, (c) no read-only tooling of
any kind, and (d) a prior session's own independent documentation of
the identical restriction class for a different host.

## 13. Historical Mixed-Unit Risk — genuinely unmeasured

Per the above, **no real count, frequency, or distribution of mixed-unit
historical data can be produced.** The honest classification is
"genuinely unmeasured" — not "low," "moderate," or "high" risk, all of
which would require having actually observed data this environment
cannot reach. What can be said from code structure alone (Part I §1,
§5): nothing prevents mixed-unit historical batches from existing; this
is a structural *possibility*, not evidence of actual frequency.

## 14. Duplicate Product Evidence — genuinely unmeasured

Same limitation. Part I §2's finding that `barcode`/`sku` are stored
but never used for matching remains a **code-structural fact**; it says
nothing about how often real businesses populate those fields, or
whether real duplicate products already exist in production.

---

## 15. Source Attribution Discipline (preserved from both investigations)

**Directly confirmed by code/document evidence, cited above with exact
file/line references:** every claim in Parts I §1–§8 and Part II §11–12.

**Genuinely unknown, explicitly not inferred as either common or rare:**
real-world prevalence of historical mixed-unit data (§13); real
duplicate-product frequency (§14); whether `02-business-worth-engine.md`'s
Owner Portfolio gap (§11) has any downstream consequence beyond
documentation completeness.

**User-originated business requirements** (not investigation findings —
the worked examples, the desired receipt/count workflows, the AI-
suggests/owner-confirms principle) are **not restated in this report**;
this report is evidence about the *current system*, not a record of
what was requested. The pending BDR is the correct place those
requirements are recorded and reasoned about.

## 16. Governance Notes

- This report does not modify `02-business-worth-engine.md`,
  `03-products.md`, `04-smart-stock-entry-amendment.md`,
  `BDR-0009-stock-count-physical-observation.md`,
  `10-stock-counts.md`, or any other existing artifact.
- This report does not select a technical data model, schema,
  conversion algorithm, rounding rule, or migration mechanism.
- This report does not resolve any of the pending BDR's open business
  decisions (its §5.A or §5.B, however that document is ultimately
  numbered/filed).
- This report authorizes no implementation, Specification, Rule 8
  Assessment, or Implementation Authorization.
- This report makes no claim about real production data beyond what
  §12–§14 directly establish: that such data could not be inspected
  from this environment, and that no prevalence assumption is
  therefore made in either direction.
