Business Domain Specification

# Contagem Integrity Diagnostics Specification

**Status:** Drafted. Not yet reviewed or accepted by the Product
Architect. This document does not authorize implementation — a Rule 8
Assessment, an Implementation Plan, and a signed Implementation
Authorization remain separate, subsequent gates (§21, below), exactly
as required for every sibling specification in this governance chain.
**Governance placement:** ✅ **Resolved.** This is a freestanding
Business Domain Specification, filed unprefixed in `docs/specs/`,
alongside `business-worth-evolution-specification.md`,
`stock-count-data-loss-resilience-specification.md`,
`initial-stock-dual-valuation-basis-specification.md`, and
`product-memory-purchase-selling-valuation-specification.md` — the
existing convention for a specification whose subject matter does not
belong to, and must not be filed under, another lineage's own
different strategic name. Confirmed by explicit Product Architect
instruction, this session. See §1 for the full reasoning this
confirms.
**Requirement numbering:** A self-contained `FR-1`–`FR-31` sequence,
starting fresh at `FR-1` — matching the confirmed convention this
repository's other freestanding, not-yet-accepted specifications
already use (`initial-stock-dual-valuation-basis-specification.md`'s
own `FR-1`–`FR-10`, independently numbered, not continuing any other
document's sequence). This is final, not provisional — it does not
continue, and is not continued by, the Business Worth Evolution
lineage's `FR-1`–`FR-94` or the Stock Count Data-Loss Resilience
lineage's `FR-N1`–`FR-N12`; both remain untouched by this document
(§1). This amendment pass adds no new `FR-N` requirement — it clarifies
`FR-8`/`FR-11` and `FR-19`/`FR-20`'s relationship to each other in
prose, and expands the two Open Decisions' own recorded technical
direction, without changing what any existing `FR-1`–`FR-31` requires.
**Governed by:** [BDR-0017](./BDR-0017-contagem-integrity-diagnostics.md)
(Contagem Integrity Diagnostics — the strategic decision this
specification operationalizes) and
[POL-0014](./POL-0014-contagem-integrity-diagnostic-signals.md) (the
Policy layer between that BDR and this specification). Grounded in the
[Discovery Report](./contagem-integrity-discovery.md) these three
documents share.
**Inherits, does not reopen:**
[BDR-0009](./BDR-0009-stock-count-physical-observation.md)'s
item-level no-expected-quantity boundary (restated as a hard
constraint in §4, below);
[BDR-0012](./BDR-0012-product-unit-of-measure-product-memory.md)/
[POL-0003](./POL-0003-similarity-confirmation-threshold.md)'s
product-identity governance (explicitly not extended or modified — see
§17); the Business Worth Evolution lineage's valuation mechanics
(Mode A/B, cost-basis conversion) and the Stock Count Data-Loss
Resilience lineage's Decision 38→39→40 (draft durability, autosave,
`Validar`/`Corrigir` state) — neither is amended, extended, or
reinterpreted by this document (§1).

---

## 1. Governance Placement — Resolved

**Confirmed this session, by explicit Product Architect instruction:
Option B.** This specification is freestanding. It does not amend the
Stock Count Data-Loss Resilience lineage (Decision 38→39→40), the
Business Worth Evolution Specification, or any other existing
specification.

**Why freestanding is the correct classification**, restated from the
three-option trace this decision confirms (not merely asserted):

- The Decision 38→39→40 lineage's own named strategic subject is data-
  loss **resilience** — draft durability, autosave, and validation-
  state persistence across interruption. This specification's subject
  is diagnostic evidence for mistake-discovery, a categorically
  different question, even though both happen to render on the same
  screen (`pendingTally`, the review/confirm view). Filing this
  specification under that lineage's name would misdescribe its own
  governing purpose, regardless of the surface overlap.
- The Business Worth Evolution Specification's own named strategic
  subject is Contagem's **valuation mechanics** (Mode A/B, cost-basis
  conversion, multi-unit pricing). This specification introduces no
  valuation change of any kind (§3) — filing it into that lineage's own
  numbered sequence would be a closer strategic mismatch, not a closer
  fit.
- A freestanding specification is exactly this repository's own
  existing pattern for a capability whose subject matter has no single
  correct existing home — the same reasoning `BDR-0017` itself was
  filed unprefixed for, and the same shape
  `initial-stock-dual-valuation-basis-specification.md` and
  `product-memory-purchase-selling-valuation-specification.md` already
  use as standalone documents with their own self-contained
  requirement numbering.

**Filename and identifier, confirmed against repository convention:**
freestanding specifications in this repository carry no numeric ID —
every example inspected (`similarity-confirmation-threshold-
specification.md`, `initial-stock-dual-valuation-basis-specification.md`,
`product-memory-purchase-selling-valuation-specification.md`,
`product-identity-alternative-name-specification.md`,
`superadmin-assisted-initial-stock-recovery-specification.md`) uses a
descriptive kebab-case filename ending `-specification.md`, with no
`SPEC-NNNN`-style ledger anywhere in this repository. This document's
filename, `contagem-integrity-diagnostics-specification.md`, already
matches that convention exactly — no rename is required.

## 2. Problem Statement

Restated from the Discovery Report §1: a Contagem of 500+ products
produces a correctly-calculated total the Owner has no efficient way
to investigate — locating which of several hundred already-correct-
per-its-own-formula rows deserves a second look currently requires an
unassisted manual scroll. This specification defines the minimum
functional requirements for a diagnostic layer that surfaces evidence
to shorten that search, without performing, or appearing to perform,
any correctness judgment.

## 3. Authoritative Data Boundary — Existing Valuation Is Observed, Never Modified

**FR-1.** Every diagnostic signal defined in this specification MUST
be derived exclusively from `pendingTally` — specifically
`pendingTally.countedItems` (each item already carrying `productName`,
`quantity`, `unit`, `sellingPrice`, `sellingValue`, `validated`, and
identity via `productId`/`manualRowIndex`) and
`pendingTally.totalSellingValue` — as already produced, unmodified, by
the existing `tallyStockCountRows` function
(`apps/tenant/src/utils/stockCount.ts`).

**FR-2.** No diagnostic signal may introduce a new valuation
calculation, a new persisted field, or any recomputation of
`sellingValue`, `totalSellingValue`, `costPrice`, or any other figure
`tallyStockCountRows`/`normalizeStockCountItems` already produce. This
specification's entire scope is read-only analysis of already-computed
output — existing valuation data is observed and presented; it is
never modified, and no requirement in this document authorizes writing
back to it.

**FR-3.** No diagnostic signal may read, require, or depend on any
data source beyond `pendingTally` and its own already-populated fields
— specifically, no `stockCounts` history, no `Product.category`, and
no Owner-entered value of any kind (§19 restates this as an explicit
non-goal).

## 4. Unit Boundary — Inherited Constraint, Not a New Rule

**FR-4.** Per the Discovery Report §4 and `BDR-0017` §3, raw
`quantity` and raw `sellingPrice` MUST NOT be compared against each
other across different products anywhere in this capability.
`getConversionFactor` (`purchaseToSellingConversion.ts`) — the only
existing engine capable of bridging units — composes a factor only
within one product's own confirmed `UnitRelationship`; it has no
defined behavior, and must not be given one by this specification, for
comparing quantities or prices belonging to different products. This
specification does not modify `UnitRelationship`, `getConversionFactor`,
or any function in `purchaseToSellingConversion.ts` in any way — it
only restates an existing constraint on their use.

**FR-5.** `sellingValue` (already denominated in currency,
regardless of what was counted or how) is the only field this
specification authorizes for any comparison spanning the full
`pendingTally.countedItems` set at once.

## 5. Top-Value Ranking (POL-0014, Candidate Signal 1)

**FR-6.** The system MUST be capable of producing an ordering of
`pendingTally.countedItems` by `sellingValue`, descending, using the
value each item already carries. This ordering MUST NOT alter
`pendingTally` itself, `countedItems`' array order as consumed by any
other existing function, or any persisted data — it is a presentation-
layer derivation only.

**FR-7.** The ordering MUST be computed fresh from the current
`pendingTally` each time it is displayed — never cached or persisted
across a session, since `pendingTally` itself is already a one-shot
snapshot (per the Discovery Report §9) and any correction discards and
rebuilds it via the existing, unmodified `handleRequestConfirmation`/
`handleCorrigirTallyItem` path.

## 6. Percentage of Total (POL-0014, Candidate Signal 1)

**FR-8.** For any item shown in a diagnostic context, the system MAY
display `item.sellingValue / pendingTally.totalSellingValue` as a
percentage. Division by a zero or otherwise non-positive
`totalSellingValue` MUST suppress this display entirely (no percentage
shown) rather than produce `NaN`, `Infinity`, or a fabricated `0%` —
mirroring `checkPriceDeviation`'s own established null-safety
discipline for exactly this class of edge case.

**FR-9.** Required phrasing pattern (Portuguese, matching `BDR-0017`
Part 7's Evidence Test and this specification's own governing
instruction exactly): *"Esta entrada representa 18,9% do valor da
Contagem"* (or the equivalent figure for the item shown). The system
MUST NEVER say *"Esta entrada está errada"* or any equivalent implying
correctness or error — this is the single non-negotiable phrasing rule
every requirement in this document is checked against.

## 7. Total Composition (POL-0014, Candidate Signal 1)

**FR-10.** The system MAY display a cumulative-contribution summary
(e.g., "top N products represent Y% of the total") derived from the
same sorted array `FR-6` already produces, at one or more rank
cut-offs. This specification does not fix which cut-offs (e.g., top
10/top 20) — left to implementation-level presentation judgment,
constrained only by `FR-6`'s underlying ordering being authoritative.

## 8. Same-Count Value-Distribution Diagnostics (POL-0014, Candidate Signal 2)

**FR-11.** The system MAY flag an item whose `sellingValue` is
unusual relative to the distribution of `sellingValue` across the rest
of `pendingTally.countedItems` in the same Contagem. Per `FR-4`/`FR-5`,
this signal operates on `sellingValue` only — never on raw `quantity`
or raw `sellingPrice`.

**Relationship between `FR-8` and `FR-11` — clarified, not merely
noted.** These are complementary signals answering two different
questions, and neither is a restatement or alternate presentation of
the other:

- **`FR-8` measures an entry's share of the entire Contagem total** —
  a plain ratio against the whole (`sellingValue /
  totalSellingValue`). It requires no minimum sample size and is
  meaningful even for a two-item Contagem.
- **`FR-11` measures whether an entry is unusual relative to peer
  `sellingValue` observations within the same Contagem** — a
  distributional comparison against the *other counted items*, not
  against the total. The two can genuinely diverge: an item can carry
  a large share of the total without being a statistical outlier among
  similarly large peers, and an item can be a clear outlier among its
  peers while representing only a small share of a large total. An
  implementer MUST treat these as two independently-computed signals,
  each surfaced on its own terms — `FR-11` is never satisfied merely by
  restating `FR-8`'s own figure in different words, and a diagnostic
  surface presenting both MUST make clear they are answering different
  questions (per `FR-22`'s own "separate, labeled piece of evidence"
  requirement).

> **OPEN PRODUCT ARCHITECT DECISION 1 — Statistical method and
> threshold. Recommended technical direction recorded below; numeric
> parameters remain OPEN.**
>
> **Recommended direction, offered for confirmation, not assumed
> decided:**
> - **Primary, always-available transparency signal: share-of-total**
>   (`FR-8`, already defined) — meaningful at any sample size, requires
>   no calibration.
> - **Peer-comparison signal: an IQR-based upper-fence methodology**
>   applied to `sellingValue` across `pendingTally.countedItems` in the
>   same completed Contagem — recommended over a z-score/standard-
>   deviation approach because Contagem value distributions are
>   inherently right-skewed (many low-value items, a few high-value
>   ones), and IQR does not assume a normal distribution the way a
>   z-score does.
>
> **Explicitly OPEN — not silently selected by this document:**
> - **The IQR multiplier** (commonly written as `k` in "flag values
>   above Q3 + k×IQR" — a generic default such as 1.5 exists in general
>   statistical practice, but that is a generic convention, not
>   evidence about Contagem data specifically, and is **not** adopted
>   here as if it were).
> - **The minimum `countedItems` sample size/floor** below which
>   `FR-12` requires this signal not to fire at all.
>
> **Why no number is chosen here:** both parameters are business-
> consequential (too sensitive produces noisy, distrust-inducing
> flags; too loose produces a diagnostic that misses the exact
> "435,000 vs 300,000" scenario this capability exists to help with)
> and neither this specification nor the investigation preceding it
> has representative Contagem data to calibrate against. Selecting a
> specific number without that evidence would repeat the exact mistake
> this governance chain has been built to avoid — inventing a
> business rule with no grounding (`CLAUDE.md`'s own standing rule:
> "Never invent new business rules... flag as an open question"). See
> §19 (Calibration Requirement) for what evidence is required before
> either parameter may be finalized.

**FR-12.** Whatever method Open Decision 1 eventually settles, it MUST
NOT fire on a `pendingTally.countedItems` set below a minimum size
sufficient for the chosen statistic to be meaningful (the Discovery
Report's own §12 progressive-detection finding — a same-count
distribution computed over too few points risks flagging a legitimate
item merely because nothing else exists yet for contrast). The exact
minimum count is part of Open Decision 1, not fixed here.

**FR-13.** This signal MUST be phrased as evidence, never a verdict —
e.g., *"Esta entrada está entre as maiores contribuintes do valor
contado"* or an equivalent framing naming the specific fact the
distribution establishes, never *"esta entrada está errada"* or any
equivalent (restated from `FR-9`'s own non-negotiable rule).

## 9. Near-Duplicate Product-Name Detection (POL-0014, Candidate Signal 3)

**FR-14.** The system MAY compare `productName` values across
`pendingTally.countedItems` and flag pairs (or groups) whose names are
similar enough to plausibly represent the same physical stock entered
more than once.

**FR-15.** Two items sharing an exact, non-empty `productId` MUST
NEVER be flagged as a candidate pair under this signal — they are the
system's own existing, legitimate multi-portion (Mode B) behavior,
unrelated to this capability, per `BDR-0017` Part 6.

**FR-16.** Two items whose `productName` values are identical after
the same normalization (`trim().toLowerCase()`) this codebase's
existing exact-match logic (`isGenuinelyNewProductName`,
`getRememberedPriceForRow`) already applies MUST NEVER be flagged under
this signal either — an exact name match, with or without a shared
`productId` (e.g. two manually-added portions of the same product,
matched by name rather than identity), is the same legitimate multi-
portion case `FR-15` excludes, not a "near" duplicate. This signal is
authorized only for names that are similar but **not** identical after
that same normalization.

> **OPEN PRODUCT ARCHITECT DECISION 2 — Similarity method and
> threshold. Recommended technical direction recorded below; numeric
> parameter remains OPEN.**
>
> **Recommended direction, offered for confirmation, not assumed
> decided:**
> - Normalize case.
> - Normalize spacing.
> - Normalize punctuation.
> - Normalize accents/diacritics.
> - **Retain** meaningful product attributes — size, volume, and
>   variant tokens — inside the compared string; normalization MUST
>   NOT strip these out (restated from `FR-17`, below).
> - **Candidate similarity metric: Jaro-Winkler**, recommended over
>   plain Levenshtein distance because it weights a shared prefix more
>   heavily, which better matches how real product-name duplicates
>   actually vary (e.g. "Coca-Cola 350ml" vs "Coca Cola 350 ML" share a
>   long common prefix — exactly the shape a real duplicate takes).
>
> **Explicitly OPEN — not silently selected by this document:**
> - **The similarity cutoff** — the numeric threshold above which two
>   names are flagged as candidates.
>
> **Why no number is chosen here:** an intuition-set threshold could
> either miss genuine duplicates or — the specifically named risk
> throughout this investigation (Discovery Report §16, Case 5) — flag
> "Coca-Cola 350ml" against "Coca-Cola 1L" as a false positive on the
> strength of their shared brand prefix alone. See §19 (Calibration
> Requirement) for what evidence is required before this parameter may
> be finalized.

**FR-17.** Whatever method Open Decision 2 settles, size/volume/unit
tokens within a product name MUST be included in the comparison, never
stripped out before comparing — per `BDR-0017` Part 6 and `POL-0014`'s
own explicit requirement, "Coca-Cola 350ml" and "Coca-Cola 1L" must not
be flagged as similar to each other on the strength of their shared
brand name alone.

**FR-18.** Required phrasing pattern, matching this specification's
own governing instruction exactly: *"Estas entradas parecem
referir-se a produtos semelhantes. Verifique se foram registadas duas
vezes."* This signal MUST always be phrased as a request for the Owner
to verify — it must never state or imply that the entries are
concluded to be duplicates. No automatic merge, deletion, or
modification of either entry may result from this signal, under any
circumstance (restated from `BDR-0017` Part 2 Decision 3).

## 10. Review-List Ordering (POL-0014, Candidate Signal "F")

**FR-19.** The item list rendered on the Contagem review/confirm
screen (the `pendingTally` non-null branch of
`PeriodicStockCountView.tsx` — i.e. the scrollable list showing every
counted item's own quantity, unit, and `sellingValue`, immediately
preceding the "Valor Total da Contagem" figure) MUST be ordered by
`sellingValue`, descending, reusing the same ordering `FR-6` already
defines. This is the single existing representation this specification
identifies as the correct, least-disruptive integration point — see
the reasoning below.

**FR-20.** This ordering change applies **only** to the review/
confirm screen's item list. It explicitly MUST NOT apply to: the
live-entry active-workspace section (rows not yet validated, currently
ordered alphabetically by product name for findability while actively
typing); the collapsed/accumulated validated section (per the recent
"Concept C — Validated Product Compaction" work); or any other
existing Contagem representation. Reordering either of the live-entry
sections by value would work against their own, different, unrelated
purpose (finding a specific product by name while entering data, not
reviewing a completed count) and is explicitly out of this
specification's scope.

**Scope of `FR-19`/`FR-20`, clarified — individual items, no new
grouping rule.** The value-descending ordering `FR-19` requires applies
to **individual counted items** in `pendingTally.countedItems`, exactly
as `FR-6` already defines it — each row is ordered strictly by its own
`sellingValue`. This clarification does not introduce a requirement to
group a product's multiple portions together in the ordered list, and
does not modify `FR-24`: a product counted in three portions (e.g. Cx,
Emb, Un) may appear at three different positions in the value-ordered
list, interleaved with other products' own rows, exactly as their
individual `sellingValue`s dictate. Grouping same-product portions
together in the review list is a distinct presentation question this
specification does not decide and does not require — left, like
`FR-10`'s own rank-cutoff choice, to implementation-level judgment, not
elevated to a new business rule absent a demonstrated need for one.

**Reasoning (traced, not assumed):** the review screen's item list is
the only existing representation that already shows every counted
item's final `sellingValue` together, all at once, in a form the Owner
reviews as a completed whole rather than edits incrementally — exactly
the moment a value-based ordering serves its purpose. The live-entry
screens serve an entry-in-progress workflow with a different, already-
settled ordering rationale (alphabetical, for findability) that this
specification has no basis to override.

## 11. When Diagnostics Become Available

**FR-21.** Every diagnostic signal defined in this specification MUST
be computed only from a fully-built `pendingTally` — i.e., only after
the Owner has taken the existing, unmodified "Rever e Confirmar
Contagem" action (`handleRequestConfirmation`). No diagnostic signal
may be computed, or shown, during active live entry, before
`pendingTally` exists.

**Reasoning (traced, not assumed):** `handleRequestConfirmation`
already refuses to build `pendingTally` at all when zero items are
counted (existing guard, unmodified) — so a fully-built `pendingTally`
is, by the existing code's own contract, never a genuinely empty set
beyond what `FR-12`'s minimum-size floor already governs. Computing
any same-count distributional signal earlier, mid-entry, would violate
the Discovery Report §12's own finding: a partial, still-growing set
of entries is not a stable enough sample for a distributional
comparison to mean anything, and could misleadingly flag an early,
ordinary entry as unusual for no reason but the absence of later
entries to contrast it against.

## 12. Presenting Multiple Signals Without a Composite Score

**FR-22.** When more than one signal (`FR-6`–`FR-18`) applies to the
same item, each MUST be shown as its own separate, labeled piece of
evidence, retaining its own source and wording. No numeric
combination, weighting, or single score derived from more than one
signal is authorized by this specification — restated from `BDR-0017`
Part 2 Decision 7, which this specification does not reopen. This is
the same discipline `FR-8`/`FR-11`'s own clarified relationship (§8,
above) already requires between those two signals specifically.

## 13. Legitimate High-Value Products and Multi-Portion Items

**FR-23.** A product that legitimately dominates a Contagem's total
value (the Discovery Report §16, Case 1) MUST be treated identically
to any other item by every signal in this specification — flagged,
where its value warrants it, using the exact same evidence-only
phrasing as any other item. No signal may special-case, suppress, or
alter its own wording based on any inference about whether a flagged
item is "probably fine" — the Owner's own judgment, informed by the
same evidence every item receives, is what distinguishes a legitimate
outlier from a mistake, not the system.

**FR-24.** Multiple portions of the same product (multiple rows
sharing a `productId`, or sharing an exact `productName` per `FR-16`)
are never, by that fact alone, evidence of anything under this
specification. Each portion's own `sellingValue` may still
independently qualify it for `FR-6`/`FR-8`/`FR-11` on its own merits,
exactly as any other row would. Unchanged by this amendment pass — see
§10's clarification of `FR-19`/`FR-20`, which confirms multi-portion
rows are ordered individually, consistent with this requirement, not
in tension with it.

## 14. Zero-Value and Blank Rows

**FR-25.** A row with an explicit `quantity` of `0` (a physically-
confirmed absence, per `BDR-0009` Part 4) carries `sellingValue = 0`
and remains present in `pendingTally.countedItems`. It participates in
every ranking/percentage calculation on exactly the same terms as any
other item — its `sellingValue` of `0` will, as a simple mathematical
consequence, never rank highly or show a meaningful percentage; no
special-case exclusion is needed or authorized.

**FR-26.** A blank-quantity row is, per the existing, unmodified
`tallyStockCountRows` contract, never present in `countedItems` at all
(it contributes only to `notCountedProductNames`) — it is therefore
already structurally excluded from every signal in this specification,
requiring no additional handling.

## 15. Scale — 500, 1,000, and Larger Counts

**FR-27.** Every computation this specification authorizes (sorting
an array by `sellingValue`, computing a percentage per item, computing
a same-count distribution statistic, comparing `productName` strings
pairwise) operates on `pendingTally.countedItems` — an array already
fully in memory at the moment `pendingTally` is built, at whatever size
the Contagem produced. No new Firestore read, and no new per-row
network round-trip, is introduced at any scale.

**FR-28.** Any UI surface built against this specification MUST render
only a bounded subset (e.g., the top-N ranked items, or a fixed number
of flagged candidates) rather than the entirety of
`pendingTally.countedItems` with a signal attached to every row — this
specification does not authorize a design that would render 500+ rows
simultaneously with diagnostic annotations, independent of whether the
underlying computation itself would be inexpensive at that size (per
the Discovery Report §18's confirmation that this codebase has no
virtualization anywhere today).

## 16. Owner Authority and the Existing Correction Path

**FR-29.** No signal defined in this specification may trigger any
automatic change to any row, product, quantity, price, or unit, under
any circumstance. No signal may merge products, delete products, or
estimate a quantity on the Owner's behalf. This restates, and does not
narrow or extend, `BDR-0017` Part 2 Decision 3.

**FR-30.** When an Owner acts on a flagged item, the only correction
mechanism this specification authorizes invoking is the existing,
unmodified `Corrigir` action (`handleCorrigirTallyItem`) — which
clears that item's `validated` flag and returns the Owner to live
editing, exactly as it already does today, with `Validar`/`Editar`
semantics entirely unchanged. This specification does not add a
jump-to-row, a highlight, a preserved review queue, or an automatic
advance to the next flagged item (`BDR-0017` Part 2 Decision 8) — a
diagnostic surface built against this specification presents evidence
and, where the Owner chooses to act on it, hands off to the existing
`Corrigir` action unchanged.

## 17. Boundary Against Existing Product-Identity Governance

**FR-31.** Restated from `BDR-0017` Part 6 and `POL-0014`'s own
Boundary Against POL-0003 section: this specification's near-duplicate
signal (§9) does not extend, modify, or substitute for `POL-0003`'s
own governed product-identity confirmation flow. A flag raised under
`FR-14` never triggers, and must never be presented as, a `POL-0003`
"same product / different product" resolution.

## 18. Explicit Non-Goals

Restated from `BDR-0017`/`POL-0014`, in specification terms, and
re-verified this session against the full requirement list above —
none of the following are authorized by this document, and no
requirement `FR-1`–`FR-31` expands into any of them:

- **No historical quantity/price comparison of any kind** — no
  `stockCounts` read, no previous-Contagem comparison, no historical
  range (`FR-3`).
- **No guided, one-item-at-a-time correction workflow** — no direct
  row-jump, no automatic advance, no isolated correction screen
  (`FR-30`).
- **No AI, machine learning, or LLM-driven judgment of any kind.**
- **No expected-total blocking** — no mandatory or automatic expected
  stock value, no hard maximum, no confirmation-blocking behavior, no
  implication of a "correct" total anywhere in this document.
- **No automatic correction of any entry**, under any circumstance
  (`FR-29`).
- **No product merging**, automatic or otherwise (`FR-18`, `FR-29`).
- **No quantity estimation on the Owner's behalf**, by any signal, at
  any confidence level (`FR-29`).
- **No change to the valuation calculation** — `sellingValue`,
  `totalSellingValue`, `costPrice`, or any other already-computed
  figure (`FR-1`, `FR-2`).
- **No change to `UnitRelationship`, `getConversionFactor`, or any
  unit-conversion mechanism** (`FR-4`).
- **No change to `Validar`/`Editar` semantics**, or to draft/autosave
  mechanics (`FR-30`).
- No cross-product comparison of raw `quantity` or raw `sellingPrice`
  (`FR-4`).
- No numeric composite suspicion score (`FR-22`).
- No change to Mode A, Mode B, or the Business Worth calculation.

Unchanged by this amendment pass — every item above was re-verified
against the clarifications and expanded Open Decisions in §8/§9/§10
and remains fully intact; none is weakened, narrowed, or reinterpreted
by this session's edits.

## 19. Calibration Requirement

**This section is new, added by this amendment pass.** It exists
because the two Open Decisions (§8, §9) are not arbitrary
implementation details left to an engineer's preference — each carries
a real, named false-positive risk this entire investigation has
repeatedly identified, and neither may be resolved by intuition alone.

**FR-1 through FR-31 remain unaffected — this section imposes no new
functional requirement on the diagnostic capability itself. It governs
what evidence must exist before Open Decisions 1 and 2 may be
finalized, not what the capability does once they are.**

**Parameters this calibration must produce sufficient evidence to
select:**

1. The IQR multiplier for same-count value-distribution flagging
   (Open Decision 1, §8).
2. The minimum `countedItems` sample size/floor below which that same
   signal does not fire (`FR-12`, Open Decision 1).
3. The near-duplicate product-name similarity cutoff (Open Decision 2,
   §9).

**The calibration must specifically test for false positives against
the following legitimate cases** — each one directly identified in the
Discovery Report (§16) as a real pattern this capability must not
misjudge:

- **Legitimate dominant-value products** — a single product that
  genuinely represents a large share of a business's stock value (e.g.
  a freezer, a large equipment item), which `FR-23` already requires
  be treated identically to any other item, never suppressed — the
  calibration must confirm the chosen IQR multiplier does not produce
  wording or behavior that contradicts `FR-23`.
- **Legitimate size/volume variants** — e.g. "Coca-Cola 350ml" vs.
  "Coca-Cola 1L" — the calibration must confirm the chosen near-
  duplicate similarity cutoff does not flag these as candidates,
  consistent with `FR-17`.
- **Legitimate flavor/variant differences** — e.g. "Coca-Cola" vs.
  "Coca-Cola Zero" — a distinct case from size/volume, since the
  differing token is not a number, and must be separately confirmed
  against whatever cutoff Open Decision 2 settles.
- **Legitimate multi-portion entries** — two or more rows for the same
  product in different units (`FR-15`, `FR-16`, `FR-24`) — the
  calibration must confirm these continue to be correctly excluded by
  the `productId`/exact-name-match rules already fixed in this
  specification, independent of whatever similarity threshold is
  chosen.
- **Genuine duplicate-name variations** — e.g. case, spacing, or minor
  punctuation differences referring to the same physical stock — the
  calibration must confirm the chosen cutoff does flag these, not only
  that it avoids the false-positive cases above; a threshold that
  produces zero false positives by never flagging anything is not a
  successful calibration.

**Evidence source:** representative Contagem data (anonymized, if
drawn from real usage) or a deliberately constructed calibration
dataset covering, at minimum, every case listed above. Neither this
specification nor the investigation preceding it (the Discovery
Report) constitutes that evidence — both provide the reasoning for
*which method* to use (§8, §9's own recommended technical direction),
not the data needed to *tune* it.

**This calibration is a prerequisite for finalizing Open Decisions 1
and 2 — it is not itself a governance gate this specification
authorizes skipping, and it does not replace Product Architect
acceptance of the resulting numeric parameters (§20).**

## 20. Open Decisions Requiring Product Architect Input

Consolidated from the sections above, for a single point of reference.
**Governance placement (formerly listed here) is now resolved — see
§1** and is not repeated below. **Both items below remain OPEN — a
recommended technical direction is recorded in §8/§9, but neither
Open Decision is converted into an approved business rule by this
document.** Each requires the calibration evidence §19 defines, and
formal Product Architect acceptance of the resulting parameters, before
either may be treated as settled.

1. **Open Product Architect Decision 1 (§8, `FR-11`/`FR-12`)** — the
   IQR multiplier and minimum `countedItems` sample floor for
   same-count value-distribution flagging. Recommended method (share-
   of-total primary, IQR-based upper fence secondary) is recorded in
   §8; the numeric parameters are not.
2. **Open Product Architect Decision 2 (§9, `FR-14`/`FR-16`/`FR-17`)**
   — the near-duplicate similarity cutoff. Recommended method
   (normalize case/spacing/punctuation/accents, retain size/volume/
   variant tokens, Jaro-Winkler as the candidate metric) is recorded in
   §9; the numeric cutoff is not.
3. Exact UI copy, layout, and visual treatment beyond the required
   phrasing patterns fixed in `FR-9`/`FR-13`/`FR-18` — left to
   implementation-level design, not this specification.
4. Whether, and how, this specification's scope extends to Initial
   Stock Count (`BDR-0017` Part 2 Decision 9 permits this in
   principle; this specification, matching the Discovery Report's own
   scope, addresses Periodic Contagem's `pendingTally` only).

## 21. Required Downstream Governance Gates

Unchanged sequence, per this repository's established convention: (1)
Product Architect acceptance of this specification's content; (2) the
§19 calibration exercise, producing evidence sufficient to resolve
Open Decisions 1 and 2; (3) Product Architect acceptance of the
resulting numeric parameters — until this step, both Open Decisions
remain open, not approved business rules; (4) a Rule 8 Assessment; (5)
an Implementation Plan; (6) a signed Implementation Authorization; (7)
implementation. No existing Rule 8 Assessment, Implementation Plan, or
Implementation Authorization for `BDR-0009`, `BDR-0012`/`POL-0003`, the
Business Worth Evolution lineage, or the Stock Count Data-Loss
Resilience/Decision 39/40 lineage requires reopening or amendment by
this specification — every boundary against those existing, already-
authorized capabilities (§4, §17) is additive and restating, never
altering.

---

## 22. Product Architect Acceptance

**Status:** Drafted — awaiting review. Not yet accepted or signed.

This section is intentionally left unsigned. Acceptance of this
specification's content does not, by itself, resolve Open Decisions 1
or 2 (§20) — those require the §19 calibration exercise and a separate
subsequent acceptance of the resulting numeric parameters. Acceptance
of this specification does not, on its own, authorize any code change
— an Implementation Plan and a signed Implementation Authorization
remain required, separate gates after Rule 8 (§21).
