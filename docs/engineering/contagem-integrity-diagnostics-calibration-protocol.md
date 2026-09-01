# SABUSH BPT — Contagem Integrity Diagnostics Calibration Data Protocol

**Type:** Preparation record — an evidence-collection and analysis
protocol, produced so Open Decisions 1 and 2 in
[`contagem-integrity-diagnostics-specification.md`](../specs/contagem-integrity-diagnostics-specification.md)
(§19, Calibration Requirement) can later be resolved objectively.
**Not a governance document.** Not a Business Decision Record, not a
Policy, not a Specification amendment, not a Rule 8 Assessment, not an
Implementation Authorization. Selects no threshold, multiplier, or
cutoff of any kind — see §8 for the explicit boundary this document
holds itself to.
**Status:** Protocol only. No calibration has been run. No dataset has
been assembled. No evidence exists yet as a result of this document —
check a future "Results" section (not present here) before assuming
this document contains anything beyond a plan.
**Authoritative basis:**
[`contagem-integrity-diagnostics-specification.md`](../specs/contagem-integrity-diagnostics-specification.md),
specifically §8 (Open Decision 1), §9 (Open Decision 2), and §19
(Calibration Requirement) — this protocol operationalizes exactly what
that section already named as required, and no more.
**No code changes were made to produce this document.** No test file
was modified. No implementation of any kind is authorized by this
protocol's existence.

---

## 1. Objective

**What this calibration exercise must establish:** enough evidence,
for each of the two Open Decisions below, that a specific numeric
parameter can be recommended to the Product Architect on the strength
of measured behavior against real and realistic data — not on the
strength of a generic statistical convention borrowed from an
unrelated domain.

1. **The IQR multiplier and minimum sample floor** for same-count
   `sellingValue`-distribution flagging (Specification §8, `FR-11`/
   `FR-12`).
2. **The near-duplicate product-name similarity cutoff**, using the
   already-recommended normalization + Jaro-Winkler direction
   (Specification §9, `FR-14`/`FR-16`/`FR-17`).

**Why a threshold must be evidence-derived, not copied from a generic
convention:** a generic default (e.g. "1.5× IQR," the most commonly
cited value in general statistical practice) is evidence about
*general-purpose outlier detection*, not evidence about *this specific
data shape* — a Contagem's `sellingValue` distribution is a retail
inventory valuation, not a generic dataset, and this repository's own
standing discipline (`CLAUDE.md`: "Never invent new business rules...
flag as an open question") already treats "it's a common default
elsewhere" as an insufficient basis for a business-consequential
number here. The same reasoning applies to the near-duplicate
similarity cutoff — an untested threshold risks either missing real
duplicate entries or, the specifically named risk throughout this
governance chain, flagging legitimate variants like "Coca-Cola 350ml"
against "Coca-Cola 1L" as false positives. Both parameters directly
affect whether an Owner trusts or ignores the diagnostic layer this
whole capability exists to provide — that risk is exactly what this
protocol exists to retire with evidence before either number is fixed.

**This protocol does not choose a value for either parameter.** It
defines how the evidence needed to choose one will be collected,
organized, and analyzed. The actual selection remains a Product
Architect decision, informed by this protocol's output, per the
Specification's own §20/§21/§22 sequence.

## 2. Dataset Design

### 2.1 Minimum Composition

The calibration dataset MUST include Contagem-shaped data varying
along every dimension below — a dataset that varies only in size, or
only in product mix, cannot support a threshold recommendation that
generalizes across SABUSH's actual customer base:

- **Completed Contagems only.** Every dataset record MUST be a
  finalized (or realistically finalizable) `pendingTally.countedItems`
  equivalent — a set of rows each carrying `productName`, `quantity`,
  `unit`, `sellingPrice`, `sellingValue` — never a partial, mid-entry
  snapshot (consistent with Specification `FR-21`: diagnostics never
  evaluate an incomplete count, so calibration data must not either).
- **Different shop sizes.** At minimum: a small shop (roughly 20–50
  distinct products), a medium shop (roughly 100–300), and a large
  shop (500+, matching the scenario that originated this entire
  investigation).
- **Different product mixes.** At minimum: a mix dominated by many
  low-value, high-turnover items (e.g. a general grocery/kiosk
  profile); a mix with a genuinely dominant high-value item or small
  cluster of them (e.g. a shop carrying one or two large appliances
  alongside smaller stock); and a mix with heavy multi-unit/multi-
  portion structure (many products counted in more than one unit —
  Cx, Emb, Un — within the same Contagem).
- **Different `sellingValue` distribution shapes.** At minimum: a
  smoothly-declining distribution (no sharp outliers), a distribution
  with one or two genuine high-value outliers (Case 1, §16 of the
  Discovery Report), and a distribution containing at least one
  deliberately-injected error (§3, below) so detection can be measured
  directly, not merely inferred.
- **Multi-portion products**, explicitly present in more than one
  dataset record — not as an edge case tested once, but as a
  recurring structural feature, since `FR-15`/`FR-16`/`FR-24` all
  depend on this case being handled correctly across a range of real
  shapes, not just a single synthetic example.

### 2.2 Real vs. Synthetic Data

- **Real Contagem data, where available, is preferred** for
  establishing what a realistic, error-free `sellingValue` distribution
  actually looks like across genuinely different SABUSH businesses —
  this is the only source that can validate whether a candidate
  threshold produces an acceptable false-positive rate on real,
  legitimate variation the investigation cannot fully anticipate.
  Sourcing real data is explicitly out of this protocol's own scope
  to authorize — see §7 (Data Sourcing and Privacy, an explicit open
  question, not resolved here).
- **Synthetic data is used only where a controlled error case must be
  deliberately constructed** — a real, naturally-occurring Contagem
  data source cannot reliably supply, on demand, an example of "an
  Owner typed an extra zero in this exact row," because the error's
  presence and exact severity must be known with certainty to measure
  detection accurately. Every synthetic error case MUST be built by
  taking an otherwise-realistic base Contagem (real or realistically
  modeled) and injecting exactly one controlled, precisely-known
  deviation — never a wholly invented dataset disconnected from a
  realistic base.

### 2.3 Calibration Data vs. Validation/Holdout Data — Kept Strictly Separate

**This separation is a hard methodological requirement, not a
suggestion.** The dataset MUST be split, before any candidate parameter
is evaluated, into two disjoint parts:

- **Calibration data** — used to test candidate parameter values (§3,
  §4, §5, below) and narrow down a recommended value.
- **Validation/holdout data** — a separate set of Contagems (and
  separate injected-error cases, and separate name-similarity pairs),
  set aside and **not examined or used in any way while candidate
  parameters are being tested**, used only once to confirm the
  recommended parameter's performance on data it was never tuned
  against.

**The data used to select a threshold MUST NOT also be used as the
final evidence that the threshold generalizes.** A parameter that
performs well only on the exact data used to pick it provides no
assurance it will behave correctly on the next Owner's Contagem —
this is the single most important methodological safeguard this
protocol establishes, and no step in §3–§6 may substitute holdout
data for calibration data, or vice versa, at any point.

## 3. Value-Distribution Calibration (Open Decision 1 — Method)

### 3.1 Candidate Multipliers Under Test

This protocol does not select the IQR multiplier — it defines the
procedure for testing a **range** of candidate multipliers (e.g., a
small set spanning conservative to aggressive, such as candidates
around the commonly-cited default and both above and below it) against
the calibration data. The specific candidate set is a calibration-time
decision, not fixed here, precisely so the range tested is not itself
an unexamined assumption.

### 3.2 Procedure, Per Candidate Multiplier

For each candidate multiplier `k` under test, on each calibration-set
Contagem:

1. **Calculate the upper fence** — `Q3 + k × IQR`, computed over the
   `sellingValue` values of every item in that Contagem's
   `countedItems`, exactly as Specification `FR-11` scopes the
   underlying comparison (`sellingValue` only, never raw `quantity` or
   raw `sellingPrice` — `FR-4`/`FR-5` apply identically to calibration
   data as to production data).
2. **Identify flagged entries** — every item whose `sellingValue`
   exceeds that Contagem's own upper fence, under this candidate `k`.
3. **Measure detection of deliberately introduced errors** — for every
   Contagem in the calibration set that contains a synthetic injected
   error (§2.2), record whether the injected-error row is among the
   flagged entries. This produces a detection/recall measurement per
   candidate `k`: the proportion of known, deliberately-injected errors
   this candidate would have surfaced.
4. **Measure false-positive burden on legitimate entries** — for every
   flagged entry that is **not** a known injected error, record it as
   a false positive for that candidate `k`. This produces a
   false-positive count/rate per candidate `k`, per Contagem, and in
   aggregate across the calibration set.

### 3.3 Principal Scenarios to Be Represented in the Calibration Set

Every scenario below MUST appear at least once in the calibration
data, each independently traceable to a specific, precisely-known
injected condition (for the error scenarios) or a specific,
precisely-known legitimate condition (for the non-error scenarios) —
so that step 3.2's detection/false-positive measurement can be
computed unambiguously for each:

- **Extra zero in quantity** — a row's `quantity` deliberately
  inflated by a factor of 10 (or another precisely-recorded factor)
  against an otherwise-realistic base value.
- **Extra zero in selling price** — the same class of injection,
  applied to `sellingPrice` instead of `quantity`.
- **Wrong unit producing an inflated value** — a row's `unit` set to
  one inconsistent with its `sellingPrice`'s actual denomination (e.g.
  a price meant "per Un" applied to a quantity counted in "Cx"),
  producing a `sellingValue` inflated by the relevant conversion
  factor.
- **Legitimately dominant high-value product** — a Contagem
  deliberately constructed (or drawn from real data, if available)
  where one item genuinely and correctly represents a large share of
  the total, with no injected error — this is a **negative control**:
  a candidate multiplier that flags this item is not necessarily wrong
  to do so (Specification `FR-23` requires it be treated identically
  to any other flagged item, phrased as evidence, not suppressed), but
  the calibration must still record it as a flag on a legitimate entry
  so the false-positive-rate measurement in §3.2 step 4 accounts for it
  honestly, rather than being silently excluded as if it were an error
  case.
- **Legitimate bulk purchase** — a single item with a large, but
  entirely correct, quantity reflecting a genuine bulk buy — the same
  negative-control treatment as above applies.
- **Legitimate multi-portion entries** — a product counted in more
  than one unit within the same Contagem, each portion's own
  `sellingValue` evaluated independently (per `FR-24`), verifying no
  candidate multiplier's behavior depends on, or is confused by, the
  presence of sibling portions of the same product.
- **Multiple simultaneous errors** — a single Contagem containing more
  than one independent injected error (e.g. both an extra-zero
  quantity error on one row and a wrong-unit error on a different row),
  verifying detection and false-positive measurement remain accurate
  when errors are not isolated to a single-error-per-Contagem
  assumption.

### 3.4 Explicit Non-Selection

**No multiplier is selected by this protocol.** §3.2's procedure,
applied across every candidate `k` and every calibration-set Contagem,
produces a table of (detection rate, false-positive rate) pairs, one
per candidate — the recommendation of which candidate best balances
those two measurements against §19 of the Specification's own risk
framing (too sensitive = noisy/distrust-inducing; too loose = misses
the scenario this capability exists for) is a Product Architect
decision made from that table, not an automatic selection this
protocol performs.

## 4. Minimum Sample Floor Calibration (Open Decision 1 — Continued)

### 4.1 Objective of This Sub-Calibration

Determine, with evidence, the smallest number of counted items at
which the same-count value-distribution signal (§3, above) produces
stable, meaningful output — below which Specification `FR-12` already
requires the signal not to fire at all, precisely because a
distribution computed over too few points risks flagging a legitimate
item merely because nothing else exists yet for contrast (Discovery
Report §12).

### 4.2 Procedure

1. **Select a candidate range of sample sizes to test** — spanning
   from very small (e.g. a handful of items) up to the largest
   Contagem sizes represented in the calibration dataset (§2.1),
   including intermediate points. The specific sizes tested are a
   calibration-time decision; this protocol requires the range to be
   wide enough to observe a clear transition from unstable to stable
   behavior, not a fixed list of sizes chosen here.
2. **For each candidate sample size, and for each candidate multiplier
   from §3**, draw (or construct) calibration-set Contagems at
   approximately that size and repeat §3.2's procedure.
3. **Measure stability, not just performance, at each size** —
   specifically: whether the same candidate multiplier's
   detection/false-positive behavior remains consistent across
   different Contagems of the same approximate size, or whether it
   varies erratically from one small Contagem to the next. A
   multiplier that performs well on one 10-item Contagem and produces
   a nonsensical result on another 10-item Contagem is evidence that
   10 items is below the stable floor, independent of whether either
   individual result looked acceptable in isolation.
4. **Identify the smallest sample size at which behavior stabilizes**
   across the calibration set — this becomes the evidence basis for
   recommending the minimum `countedItems` floor `FR-12` requires,
   without this protocol itself asserting a specific number.

### 4.3 Explicit Constraint This Sub-Calibration Must Enforce

**The system must never be permitted to make a strong distributional
claim on a sample size this calibration has not verified as stable.**
Concretely: any candidate floor recommended from this sub-calibration
must be the size at which step 4.3's stability measurement was
actually observed to hold across multiple independent calibration-set
Contagems of that size — never an assumed or extrapolated value below
the smallest size genuinely tested. If the calibration data does not
contain enough small-Contagem examples to establish stability with
confidence at the low end of the tested range, that gap is itself a
finding this protocol's results must report honestly, not paper over
with an untested assumption.

## 5. Near-Duplicate Similarity Calibration (Open Decision 2)

### 5.1 Candidate Cutoffs Under Test

Mirroring §3.1: this protocol does not select the similarity cutoff —
it defines the procedure for testing a range of candidate Jaro-Winkler
score thresholds (using the normalization already recommended in
Specification §9: case, spacing, punctuation, and accent
normalization, with size/volume/variant tokens explicitly retained,
never stripped, per `FR-17`) against the calibration data.

### 5.2 Required Pair Categories

The calibration dataset MUST include, at minimum, curated name pairs
in every category below — each pair labeled, in advance and with
certainty, as either a genuine duplicate or a legitimate distinct
product, so that detection and false-positive rates can be measured
unambiguously per candidate cutoff, exactly as §3.2 does for the
value-distribution signal:

- **Genuine duplicate-name variations** (should be flagged) — the same
  physical product entered twice with case, spacing, minor punctuation,
  or accent differences (e.g. "Coca-Cola 350ml" / "Coca Cola 350 ML").
- **Legitimate size/volume variants** (must NOT be flagged) — the same
  brand with a genuinely different size/volume token (e.g. "Coca-Cola
  350ml" / "Coca-Cola 1L").
- **Legitimate flavor/variant differences** (must NOT be flagged) — the
  same brand with a genuinely different, non-numeric variant token
  (e.g. "Coca-Cola" / "Coca-Cola Zero") — a distinct false-positive
  risk from the size/volume case, since the differing token here is
  not a number a size-aware rule can key off of the same way.
- **Legitimate multi-portion entries** (must NOT be flagged, but for a
  different, prior reason) — two rows for the same product sharing an
  exact `productId` or exact normalized name (`FR-15`/`FR-16`) — these
  MUST be excluded from candidate-pair consideration entirely, before
  any similarity score is even computed, exactly as the Specification
  already requires; the calibration must confirm this exclusion holds
  correctly across the dataset, independent of whatever cutoff is
  eventually chosen.
- **Unrelated products with coincidentally similar short names** (must
  NOT be flagged) — a category not explicitly named in the
  Specification's own five cases but a real risk for short, generic
  product names; included here so the calibration set is not
  exclusively composed of "obviously related" negative examples.

### 5.3 Procedure, Per Candidate Cutoff

For each candidate cutoff under test:

1. Compute the normalized Jaro-Winkler score for every eligible pair
   in the calibration set (excluding, per §5.2, any pair already
   excluded by `FR-15`/`FR-16`'s identity/exact-match rules).
2. Flag every pair whose score meets or exceeds the candidate cutoff.
3. **Measure detection** — the proportion of labeled genuine-duplicate
   pairs (§5.2, first category) that were correctly flagged.
4. **Measure false-positive rate** — the proportion of labeled
   legitimate-distinct pairs (§5.2, remaining categories) that were
   incorrectly flagged, reported per category so a cutoff that fails
   specifically on, say, flavor variants but not size variants is
   visible as such, not averaged away into a single aggregate number.

### 5.4 Explicit Non-Selection

**No cutoff is selected by this protocol.** As with §3.4, the output
is a table of (detection rate, per-category false-positive rate) pairs
across candidate cutoffs — the Product Architect selects from that
table, informed by which failure mode (missed duplicates vs. false
alarms on legitimate variants) is judged more costly, a business
judgment this protocol does not make on its own.

## 6. Metrics and Decision-Support Reporting

This protocol does not define a formula for automatically selecting a
"best" parameter from the tables §3–§5 produce — doing so would
reintroduce exactly the "arbitrary threshold" risk this whole exercise
exists to avoid, one level removed (an arbitrarily-chosen scoring
formula in place of an arbitrarily-chosen threshold). Instead, the
calibration's output MUST be reported as:

- A table of candidate values against measured detection rate and
  false-positive rate (per relevant category), for both Open Decisions.
- The evidence and reasoning behind the recommended minimum sample
  floor (§4), including any honestly-reported gap in low-end coverage.
- Every individual case where a candidate value's behavior on a
  **negative control** (a legitimate dominant-value product, a
  legitimate bulk purchase, a legitimate size/volume or flavor variant)
  diverged from what Specification `FR-23`/`FR-17` require — reported
  explicitly, not summarized away.

The Product Architect's eventual selection, informed by this reporting,
is recorded as the resolution of Open Decisions 1 and 2 in a future
update to the Specification (§20/§22), not by this protocol.

## 7. Data Sourcing and Privacy — Explicit Open Question, Not Resolved Here

This protocol assumes real Contagem data is a preferred, but not
mandatory, calibration input (§2.2). It does not resolve, and
explicitly leaves open:

- Whether, and how, real Contagem data from existing SABUSH businesses
  may be used for this purpose, and what anonymization or consent
  requirement applies.
- Who is responsible for sourcing or constructing the dataset described
  in §2.
- Whether synthetic-only calibration (no real data at all) is an
  acceptable substitute if real data cannot be sourced, and if so, what
  additional scrutiny that would require before the Product Architect
  accepts the resulting parameters.

These are explicitly Product Architect decisions, not resolved by this
protocol, and not assumed one way or the other by any procedure in
§3–§6 above.

## 8. What This Protocol Does Not Do

- Does not select the IQR multiplier, the minimum sample floor, or the
  near-duplicate similarity cutoff — all three remain OPEN, exactly as
  the Specification's §20 already states, until the procedures above
  are actually executed and their results accepted by the Product
  Architect.
- Does not modify `contagem-integrity-diagnostics-specification.md`,
  `BDR-0017`, `POL-0014`, or the Discovery Report.
- Does not modify any application source file or test file — no code
  was written or changed to produce this document.
- Does not constitute, and does not authorize skipping, a Rule 8
  Assessment or an Implementation Authorization — both remain required,
  separate, subsequent gates, unaffected by this protocol's existence.
- Does not source, construct, or analyze any actual dataset — this
  document is the plan for that work, not the work itself.

## 9. Next Step

Execution of §2's dataset assembly, followed by §3–§5's calibration
procedures, is the next concrete task — owned by whoever the Product
Architect designates (this protocol does not assume it is this
session, per §7). Its output (§6's reporting) becomes the evidence
base for a future, focused Product Architect decision resolving Open
Decisions 1 and 2, after which the Specification (§20/§22) is updated
to record the accepted parameters, and only then does Rule 8 proceed
on a fixed technical basis.
