Discovery Report — Not a Business Domain Specification

# Product Identity, Name Correction & Alternative-Name Memory — Discovery Report

**Status:** Investigation only. No code, Firestore rule, calculation,
test, or governance document referenced here has been changed to
implement anything. This document is the evidence base a possible
future Product Identity / Alternative-Name BDR (`[TO BE ASSIGNED]`)
would be built from — no such BDR exists yet, and this report does not
create one.
**Investigated:** Repository as of commit `6fa5b55` (branch `main`),
consolidating two prior investigation sessions in the same governance
thread — an initial scenario investigation and a follow-up
evidence-verification pass — into one filed report, the same role
`product-unit-of-measure-discovery.md` played for `BDR-0012`.
**Depends on:** Nothing new — re-uses and re-verifies evidence already
gathered for the separate, already-approved `BDR-0012` (Product
Unit-of-Measure & Product Memory), while establishing that this is a
genuinely distinct capability, not an extension of it (see §9).
**Followed by:** A possible future Product Identity / Alternative-Name
BDR (business decision only; no artifact number assigned; not
authorized by this report).
**Scope of investigation:** `apps/tenant/src/types.ts`,
`apps/tenant/src/context/AppContext.tsx`,
`apps/tenant/src/components/AddStockView.tsx`,
`apps/tenant/src/components/InitialStockCountView.tsx`,
`server/smartStockEntry.ts`, `BDR-0012-product-unit-of-measure-product-memory.md`,
`POL-0003-similarity-confirmation-threshold.md`,
`product-unit-of-measure-discovery.md`, `03-products.md`.

---

## 1. The Business Scenario

Two examples motivate this investigation:

**Example 1 — captured name correction.** A product package physically
reads "Castle Lite 330ml." The business commonly calls this product
"Lite 330ml," and suppliers consistently write "Lite 330ml" on
receipts. If a future photo/OCR capture step produced "Castle Lite
330ml," the owner should be able to correct it to "Lite 330ml."

**Example 2 — alternative/supplier wording.** A business knows a
product as "Bela 400g" or "Cotovelos Gobbeti," while a supplier's
receipt says "Massa cotovelo" — a different string for the same
physical product. The business needs to avoid creating or confusing
multiple products merely because supplier wording differs from the
business's own remembered name.

## 2. Conceptual Vocabulary — Kept Deliberately Separate

Confirmed as genuinely distinct concepts, not to be conflated anywhere
in this report or any future artifact built from it:

1. **Product identity** — the stable fact that a physical/catalog
   product is the same product every time it is bought, sold, or
   counted.
2. **`Product.name`** — the single product name currently stored.
3. **Owner correction** — the owner changing a captured/extracted
   name before saving, once.
4. **Supplier wording** — the name a supplier happens to use on a
   given document.
5. **Alternative name / alias** — a distinct string the business
   confirms also refers to the same Product identity.
6. **Name normalization** — case/spacing/punctuation/accent
   normalization, already `POL-0003`'s subject.
7. **Semantic identity resolution** — confirming that two
   substantively different strings ("Massa cotovelo" vs. "Bela
   400g") name the same product.
8. **UOM Recognition** — `BDR-0012` Decision 17's existing capability,
   concerning unit-of-measure structure only, not product naming.

## 3. Current Data Model — Confirmed, Not Assumed

`apps/tenant/src/types.ts`, `Product` interface, re-checked fresh this
session: `id, name, createdAt, updatedAt?, category?, supplier?, sku?,
barcode?, costPrice?, sellingPrice?`. **No `alias`, `alternativeNames`,
`knownNames`, or `nameHistory` field exists.** `name` is a single
string; there is no concept of a name distinct from it anywhere in the
schema.

## 4. Existing Product-Name Matching — Confirmed Exact-Only, Three Independent Locations

- `AppContext.tsx:1572`, `:1877` — `p.name.toLowerCase() ===
  trimmedName.toLowerCase()`.
- `AddStockView.tsx:136` — the identical pattern, confirmed fresh this
  session: `products.find(p => p.name.toLowerCase() ===
  productName.toLowerCase())`.
- `server/smartStockEntry.ts`, `matchProductByExactName` (194–201) —
  exact-match only. Its own doc comment explicitly states: *"that
  bucket exists in the type only so a future Tier 4 fuzzy-matching
  capability has somewhere to report a genuine 'maybe'"* — the
  original authors already anticipated and explicitly deferred this
  exact class of capability as unbuilt future work.

**No fuzzy, normalized-beyond-case, semantic, or alias-based matching
exists anywhere in this codebase**, confirmed independently at all
three call sites.

## 5. The Described Photo/OCR Capture Flow Does Not Currently Exist

`InitialStockCountView.tsx` was searched for `photo`, `camera`,
`capture`, `OCR` — zero hits. **The specific capability Example 1
describes (photographing a product package during Initial Stock) does
not exist in any form in the inspected code.** `Product.name` in this
component is a plain, freely-editable text field (lines 16, 60, 210) —
ordinary field editing, nothing more.

## 6. Existing Governance — Confirmed, Decisive

Exhaustive term search (`alias`, `alternative name`, `supplier name`,
`known name`, `name history`, `canonical name`, `remembered name`)
across `BDR-0012`, `BDR-0009`, `04-smart-stock-entry-amendment.md`,
the original Discovery Report, `POL-0001`–`POL-0006`, and
`03-products.md` — two hits found, neither supports the scenario:

- `04-smart-stock-entry-amendment.md` line 164's "supplier name"
  refers to the supplier *entity's* name (who issued a receipt), not
  a supplier's own wording for a *product* name — confirmed by
  reading its full context.
- `product-unit-of-measure-discovery.md` line 83's "alias table" hit
  is itself the statement that **no** alias table exists: *"No fuzzy
  matching, alias table, or normalization... exists anywhere."*

`BDR-0012` Decision 13 enumerates Product Memory as exactly *"unit
relationship, selling unit, and reference prices"* — no name. `BDR-0012`
§3 explicitly separates Product identity ("already exists in BPT
today... unaffected by this decision") from Product Memory. `POL-0003`'s
signal is explicitly *"name similarity, after normalization (case,
spacing, punctuation, and accent differences)"* — a narrow, specific
boundary. Neither "Castle Lite 330ml" vs. "Lite 330ml" nor "Massa
cotovelo" vs. "Bela 400g" falls within that boundary.

## 7. Owner Correction — Existing Behavior for One Reading, Open for Another

Editing a name in a text field before saving is ordinary,
already-existing behavior (§5, above) — this requires no new decision
of any kind. **But Example 1's own text — that the correction should
be "remembered... for future use" — admits two distinct readings,
which this report deliberately does not choose between:**

**Reading A — one-time correction.** If the owner photographs a
package, the system captures "Castle Lite 330ml," the owner edits it
to "Lite 330ml," and "remembered" means only that the created `Product`
is thereafter named "Lite 330ml," then ordinary, already-existing
`Product.name` editing (§5, above) is fully sufficient — no separate
"remembered correction" concept, and no new decision, is needed for
this reading.

**Reading B — repeated future recognition.** If "remembered for future
use" instead means that a *future* photo/OCR capture of the same
physical package — which will presumably still read "Castle Lite
330ml" every time, since that is what is printed on it — or a future
supplier receipt using that same wording, should be automatically
recognized as referring to the already-corrected "Lite 330ml" product
*without the owner correcting it again each time*, then ordinary
`Product.name` editing is **not** sufficient. **This reading converges
with the alternative-name/alias-memory capability investigated in §8**
— "Castle Lite 330ml" would itself need to be remembered as an
alternate name mapping to the corrected canonical name, the same
underlying question Example 2 raises.

**Which reading the business actually intends is not established by
the scenario as given, and this report does not decide it.** This
distinction is carried forward as its own open business question in
§10, below.

## 8. Alternative-Name Memory — Confirmed Genuinely New

Remembering that "Massa cotovelo" and "Bela 400g" refer to one Product
identity is not supported by any field, matching logic, or governing
decision found in §§3–6. This is the actual, confirmed gap.

## 9. Interaction With `BDR-0012` / Accepted UOM Specification — Confirmed Unaffected

The accepted `product-unit-of-measure-specification.md` was re-read in
full as part of this investigation — its entire scope is
`unitRelationship`/Recognition-for-UOM-structure; it makes no claim
about product naming or identity anywhere. `BDR-0012` Decision 17,
`POL-0005`, and `POL-0006` are all scoped to unit-of-measure concerns
specifically. **This is a separate, adjacent governance domain, not an
extension of the UOM capability** — confirmed, not assumed.

## 10. Open Business Questions — Documented, Not Resolved

None of the following is answered by any existing governance or code
evidence; each is recorded here as a genuine open question for a
future BDR to resolve, not decided by this report:

- **What exactly should be remembered?** Canonical name only, general
  alternative names, supplier-specific names, multiple aliases,
  historical names, or OCR-correction history — evidence does not
  distinguish between these possibilities.
- **Supplier-specific or general?** Whether an alternative name is
  scoped to one supplier or general to the business — not addressed
  anywhere.
- **Confirmation discipline.** `POL-0003`'s propose→review→confirm
  pattern, and Decision 17's analogous Recognition pattern, exist as
  *precedent* a future decision could draw on — but neither
  *authorizes* this capability merely by existing; using either
  pattern here would itself be a new decision.
- **Multiple possible matches** (e.g., "Cerveja 330ml" could plausibly
  match several products) — no governance answers whether to suggest
  one, several, require selection, or refuse.
- **One alternative name claimed by two products** (a name already
  confirmed for Product A later appears to also correspond to Product
  B) — no governance answers this conflict.
- **Example 1's own reading is unresolved** (§7, above) — whether
  "remembered for future use" means only a one-time correction to
  `Product.name`, or repeated automatic recognition of the same
  package/supplier wording on future encounters — and, if the latter,
  this question is not separable from the alternative-name-memory
  question this report otherwise raises only through Example 2.
- **Lifecycle/correction of an already-confirmed alternative-name
  association.** If an owner later discovers that a previously
  confirmed association is wrong, or that it needs to change, no
  governance evidence addresses what happens next. Examples of the
  unresolved possibilities — mentioned only as examples, not as a
  decision — might include removing the alternative name, replacing
  or correcting it, disassociating it from the `Product` without
  deleting the historical fact that it once existed, or some other
  treatment entirely. This report does not decide which, if any, of
  these is correct, does not design a data model for it, and does not
  define a UI or implementation mechanism.
- **Surface scope.** Whether this capability should apply to Initial
  Stock, Add Stock, Periodic Contagem, Smart Stock Entry, and/or
  product catalog editing — the business requirement as described is
  general, but no evidence establishes it applies to all five
  surfaces equally; each would need independent confirmation.
- **Historical/pre-existing duplicate products.** Whether any product
  duplication that already exists today — created before this
  capability existed, due to past supplier-wording differences —
  should ever be addressed retroactively, and if so how, is not
  addressed by any governance evidence. This is a distinct question
  from whether the future alternative-name capability itself should
  exist: even if that capability is eventually authorized, whether
  today's already-existing duplicate products should ever be
  considered for reconciliation is a separate, standalone business
  question this report does not answer. **This is not an
  authorization to migrate** — §12's boundary that no migration,
  historical reinterpretation, or backfill is authorized by this
  Discovery Report remains fully intact and is not narrowed by
  raising this question. This report does not decide whether
  historical duplicates should be merged, whether aliases should be
  backfilled, whether historical data should be migrated, whether
  historical records should be reinterpreted, how duplicate products
  would be identified, or how any such migration would work.

## 11. Risks If Left Unresolved

Supported directly by the two motivating examples: duplicate products
created for the same physical item under different supplier wording;
repeated manual correction burden on the owner; inconsistent product
identity across purchases from different suppliers; owner uncertainty
about which of several similarly-named products a receipt actually
refers to.

## 12. Explicit Boundaries — What This Capability Must Not Silently Become

Consistent with `BDR-0012`'s own established discipline for its
adjacent capability, carried forward here as a boundary, not a
decision: no automatic product merging; no autonomous identity
decision made without explicit owner confirmation; no semantic
matching applied without review; no migration or reinterpretation of
historical records; no AI provider, matching algorithm, or confidence
threshold selection — all remain for a later BDR/Policy/Specification
to decide, if this capability is ever pursued.

## 13. Governance Notes

- No repository file other than this new report has been modified.
- `docs/specs/product-unit-of-measure-specification.md` (Accepted) is
  untouched.
- `BDR-0012`, `POL-0001`–`POL-0006`, `BDR-0009`,
  `04-smart-stock-entry-amendment.md`, and the reconciliation
  amendment are all untouched.
- No BDR, Policy, Specification, Rule 8 Assessment, or Implementation
  Authorization is created or implied by this report.

## 14. Artifact Classification — Verified, Not Merely Repeated

Independently re-derived from the evidence above, not assumed from
the prior investigation's own conclusion: **a new BDR is the
appropriate artifact, if this capability is pursued.** Reasoning:

- Not "no new decision" — §8 confirms a genuine, unauthorized gap.
- Not a Policy alone — `POL-0003`'s own precedent shows Policies
  operationalize an *already-approved* BDR-level decision
  (`BDR-0012` Decisions 10–11); no BDR-level decision authorizing
  alternative-name memory exists yet for a Policy to operationalize.
- Not an amendment folded into `BDR-0012` — §9 confirms this is a
  separate, adjacent domain; grafting it onto `BDR-0012` risks the
  exact concept-conflation §2 exists to prevent.
- A new BDR matches this repository's own established BDR/Policy
  split (`19-governance-bdr-policy-framework.md`) for a genuinely new
  "why/what" business question.

No Product Architect decision interface is offered here — per the
governing instruction for this report, one is included only where the
evidence shows an immediate decision is required, and this report's
own conclusion is that the next step is BDR-drafting, not an
immediate binary choice.

## 15. Governance Note — Findings Accepted as Basis for BDR Drafting

**This note does not change this document's own `Status` (above),
which remains `Investigation only`, consistent with the established
repository precedent that Discovery Reports are not themselves
formally accepted/approved artifacts — only the BDR built from one is.**

The Product Architect has reviewed this Discovery Report and
explicitly accepted its findings as sufficient grounds to proceed to
drafting the dedicated Business Decision Record for Product Identity
/ Alternative-Name Memory.

This note records that fact only. It does **not**:
- change this Discovery Report's artifact status;
- approve, or pre-approve any content of, the future BDR;
- resolve any of the nine open business questions in §10;
- authorize a Specification, Rule 8 Assessment, or Implementation
  Authorization;
- authorize application code changes of any kind.
