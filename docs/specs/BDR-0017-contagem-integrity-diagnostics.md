Business Decision Record

# BDR-0017 — Contagem Integrity Diagnostics: Evidence, Not Verdicts

**Status:** Approved.
**Type:** Business Decision Record — a strategic, long-lived decision
about why this capability exists and what boundary it may never cross,
per the category [19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md)
establishes. Not a Policy and not a Business Domain Specification —
see the companion [POL-0014](./POL-0014-contagem-integrity-diagnostic-signals.md)
for the operational rules this decision authorizes, and the
[Discovery Report](./contagem-integrity-discovery.md) this BDR is
grounded in.
**Location note:** Filed without a module prefix, following
`BDR-0004`, `BDR-0008`, `BDR-0009`, and `BDR-0012`'s precedent — this
decision's subject matter (Contagem data integrity) is written to
govern Periodic Contagem today and any future Contagem-adjacent
capability (e.g. Initial Stock Count) without being re-litigated per
module.
**Depends on:** [BDR-0009](./BDR-0009-stock-count-physical-observation.md)
(Stock Count as a Physical Observation Event) — this decision inherits
Part 2's item-level "no expected quantity" boundary as a hard
constraint, not an independently invented one (see Part 5, below);
[BDR-0012](./BDR-0012-product-unit-of-measure-product-memory.md) and
[POL-0003](./POL-0003-similarity-confirmation-threshold.md) — related
prior art for name-similarity suggestion, explicitly distinguished in
scope (see Part 6); the
[Discovery Report](./contagem-integrity-discovery.md) this BDR is
grounded in, especially its §4, §7, and §8.
**Followed by:** [POL-0014](./POL-0014-contagem-integrity-diagnostic-signals.md)
operationalizes this decision into specific candidate signals and a
minimum experience shape. A Module Specification, Rule 8 Assessment,
and Implementation Authorization remain undrafted and unauthorized —
see Part 8.

---

## 1. The Business Decision

**SABUSH BPT may help an Owner locate which entries in an already-
completed Contagem are most worth a second look, using only data the
Contagem itself already produced. It may never determine, assert, or
imply that a specific entry is wrong.**

The real-world event this decision responds to: an Owner completed a
500+ product Contagem, the system correctly totaled 435,000 MZN, and
the Owner's own business knowledge said the true figure could not
reasonably exceed roughly 300,000 MZN — but nothing in the product
gave the Owner an efficient way to find which of the hundreds of
entries might be responsible, short of an unassisted manual scroll.
The [Discovery Report](./contagem-integrity-discovery.md) confirms the
underlying arithmetic was never the problem — every total traced back
correctly to `quantity × sellingPrice`, summed. The problem is
entirely a *surfacing* problem, and this decision authorizes solving
exactly that, nothing more.

**The central framing this decision protects:** the Owner's experience
of any Contagem Integrity output must be "the system is helping me
find where to look" — never "the system has judged my entry to be
incorrect." Every design decision downstream of this BDR is checked
against this framing (see the Evidence Test, Part 7).

## 2. Decisions Formally Established

1. **Contagem Integrity is a diagnostic layer, strictly downstream of
   the existing valuation calculation.** It reads already-computed
   Contagem data (`pendingTally.countedItems`, `totalSellingValue`) and
   produces evidence for the Owner's own review. It never feeds back
   into, alters, or duplicates the valuation calculation itself.
2. **No mechanism authorized by this decision may assert that a
   specific entry is an error.** Every output is phrased as a fact
   about the data ("this entry represents 18.9% of the Contagem's
   value," "these two entries have very similar names") — never as a
   conclusion about correctness. See Part 7 for the specific test this
   is checked against.
3. **The system never automatically modifies, merges, or deletes any
   entry, product, quantity, price, or unit as a result of this
   capability.** Every correction remains the Owner's own explicit
   action, through the existing edit path this decision does not
   change.
4. **No expected total, expected value, or "correct" figure is
   introduced, calculated, or compared against, by this decision.**
   This decision authorizes examining the *shape of the Contagem's own
   already-entered data* — not comparing it against any external or
   Owner-declared expectation. An Owner-entered expected range, a
   historical-count comparison, or any other externally-sourced
   expectation is explicitly out of scope for this decision (Part 6)
   and would require its own, separate governance.
5. **Raw quantity and raw selling price are never compared across
   unrelated products.** Per the Discovery Report §4, the only signal
   this decision authorizes as safely comparable across the *entire*
   Contagem at once is `sellingValue` (already currency-denominated).
   A same-product, same-unit-relationship comparison (e.g., two
   portions of one product) is a narrower, different case, not
   authorized by this decision to extend into a cross-catalog raw-
   quantity or raw-price statistic.
6. **Near-duplicate product-name detection operates within a single
   Contagem's own entries, and is distinct from, not a replacement
   for, existing product-identity governance.** See Part 6 for the
   explicit boundary against `BDR-0012`/`POL-0003`.
7. **No numeric composite "suspicion score" is authorized.** Combining
   independent, non-equally-reliable signals into one number would
   assert a precision this decision's own evidence does not support.
   Signals may be shown together, labeled by their own kind and source,
   never collapsed into one score.
8. **This decision does not authorize any guided, one-item-at-a-time
   correction workflow** (direct jump to a row, automatic advance to
   the next flagged item, or any new interaction pattern beyond
   presenting evidence). The existing edit path (`Corrigir`, and the
   existing live-entry screen) remains the sole correction mechanism
   this decision touches, unchanged.
9. **This capability may apply to any Contagem-producing screen** (today,
   Periodic Contagem; potentially, in the future, Initial Stock Count),
   without requiring a new BDR per screen — provided each application
   remains within the boundary this decision sets. A materially
   different boundary for a different screen would require revisiting
   this decision, not silently extending it.

## 3. Why Value, Not Quantity, Is the Governing Signal

The Discovery Report's central technical finding (§4) is adopted here
as a business-level constraint, not merely an implementation detail:
`getConversionFactor` — the existing, tested engine for converting a
quantity between units — only bridges units **within one product's own
confirmed relationship**, never across different products. A same-
count catalog mixing Kg, L, Un, Cx, and Emb across 500 unrelated
products has no common unit for raw `quantity` to be normalized into
as a batch. `sellingValue` is the one field already denominated in a
single common unit (currency) regardless of what was counted or how.
This decision authorizes value-based, same-count signals as the
general-purpose foundation specifically because of this finding — not
as an arbitrary preference for one field over another.

## 4. The Necessary Boundary — Inherited from BDR-0009

`BDR-0009` Part 2, Decision 2, already establishes and binds: **"No
item-level expected quantity is calculated, stored, or displayed
anywhere in the Stock Count feature."** This decision does not weaken,
reinterpret, or seek exception from that rule — it operates entirely
outside it. Every mechanism this decision authorizes (ranking,
percentage of an already-known total, same-count value distribution,
name similarity) is a fact about **already-entered, already-summed
data from this same Contagem** — none of them compute, display, or
imply what a product's quantity, price, or value *should* be. This is
categorically different from `BDR-0009`'s narrow, aggregate-only
"Expected Current Stock Value" exception (its Part 5) — this decision
introduces no new expected-value comparison of any kind, at any
granularity, and therefore does not need, and does not claim, an
exception under that Part 5 framework at all.

## 5. Explicit Exclusion — No Expectation Input, In Any Form

This decision does not authorize, in any form:

- An Owner-entered expected stock value or range.
- A comparison against a previous Contagem's total.
- A comparison against any historical range across multiple past
  counts.
- A business-category-based estimate.
- An AI-generated estimate.

Any of the above would require its own future BDR. This decision's
signals are derived exclusively from the current Contagem's own
already-entered rows — never from an external or historical
expectation. This is a deliberate, narrower scope than what a future
capability might eventually want, chosen because it is the
combination the Discovery Report found solvable with the least new
architecture and the lowest false-positive risk (Discovery Report §9),
not because a broader capability is rejected outright for the future.

## 6. Boundary Against Existing Product-Identity Governance

`BDR-0012` and `POL-0003` already govern, and this decision does not
reopen: whether a newly typed product name matches an **existing
catalog Product**, at product-creation/entry time. Their approved
answer — suggest a candidate match, never silently decide, let the
Owner resolve it as "same product" or "different product" — remains
entirely in force and unmodified.

This decision's near-duplicate detection (Part 2, Decision 6) governs
a different question, at a different moment: whether **two rows
already present within one single Contagem session** — which may
include two manually-typed names that never went through catalog
matching at all — resemble each other closely enough to be worth the
Owner's attention. This is evidence about a count's own internal
consistency, not a product-identity decision. Per the Discovery
Report §7, `BDR-0012`/`POL-0003`'s existing mechanism is confirmed not
wired into Contagem's manual-add path today — this decision fills a
genuinely open gap, not an overlapping one. Exact shared product
identity (`productId`) must never itself be treated as a "duplicate"
signal — two rows correctly sharing one product's identity are the
system's existing, legitimate multi-portion (Mode B) behavior,
unrelated to this decision.

## 7. The Evidence Test

Every design decision under this BDR and its companion Policy is
checked against one question:

> **Would a normal SME Owner, looking at any Contagem Integrity output,
> understand that this is a fact about their own already-entered data —
> not a claim from the system that something is wrong?**

If the answer is no, the wording or design changes. Concretely, output
phrased as *"Este produto representa 18,9% do valor da Contagem"* or
*"Estas entradas parecem referir-se a produtos semelhantes. Verifique
se foram registadas duas vezes"* passes this test. Output phrased as
*"Este produto está errado"* or any equivalent never does, regardless
of how the underlying signal was computed.

## 8. What This Decision Does Not Do

- Does not authorize a Module Specification, Rule 8 Assessment, or
  Implementation Authorization — those remain future, separate gates.
- Does not modify the valuation calculation, Mode A, Mode B, unit
  conversion, `Validar`/`Editar` semantics, draft/autosave, or Business
  Worth calculation in any way.
- Does not introduce, weaken, or reinterpret `BDR-0009`'s item-level
  "no expected quantity" boundary — see Part 4.
- Does not reopen, modify, or duplicate `BDR-0012`/`POL-0003`'s
  product-identity governance — see Part 6.
- Does not authorize any Owner-entered expected value, historical
  comparison, category-based estimate, or AI-generated estimate as a
  new capability — see Part 5.
- Does not authorize a numeric composite suspicion score — see Part 2,
  Decision 7.
- Does not authorize a guided, one-item-at-a-time correction workflow
  — see Part 2, Decision 8.
- Does not choose, or pre-approve, any specific threshold, algorithm,
  or numeric parameter — those are explicitly reserved for the
  companion Policy and any later Specification (see
  [POL-0014](./POL-0014-contagem-integrity-diagnostic-signals.md)'s own
  Technical Boundary).
