Decision Record

# POL-0014 — Contagem Integrity Diagnostic Signals Policy

**Status:** Proposed — the `POL-NNNN` cross-cutting namespace requires
an explicit Product Architect decision to assign each identifier
(`19-governance-bdr-policy-framework.md`, Numbering Ledger addendum).
`POL-0014` is the next collision-free number in that sequence at the
time of drafting, used here as the working identifier; treat as
provisional until the Product Architect confirms the assignment.
**Type:** Policy document, per the category established in
[`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)
§2. Operationalizes an approved Business Decision Record; does not
itself decide strategic philosophy and does not itself define a
technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the
cross-cutting `POL-NNNN` namespace `POL-0003` and `POL-0012` already
use.
**Depends on:** [`BDR-0017`](./BDR-0017-contagem-integrity-diagnostics.md)
(Contagem Integrity Diagnostics) — specifically Part 2's nine formally
established decisions, Part 3's value-signal rationale, and Part 7's
Evidence Test. Also informed by, and explicitly scoped apart from,
[`POL-0003`](./POL-0003-similarity-confirmation-threshold.md) (see
Boundary Against POL-0003, below).
**Followed by:** Not yet drafted, not derived by this record. A Module
Specification (translating these settled business requirements into
functional requirements and acceptance criteria), a Rule 8 Assessment,
and an Implementation Authorization all remain future, separate,
unauthorized gates.

---

## Purpose

`BDR-0017` already establishes, as an approved business decision, that
SABUSH may surface evidence about a Contagem's own already-entered
data to help an Owner locate entries worth a second look, and that it
may never assert an entry is wrong. That decision does not specify
which signals qualify, what evidence must accompany each, or what the
minimum shape of presenting them must be — this Policy addresses that
operational gap, for exactly the six mechanisms `BDR-0017` Part 2
authorizes and no others.

## Guiding Principle

Consistent with `BDR-0017`'s own Evidence Test (Part 7) and the
existing precedent `getPossibleReconciliationCauses` already
establishes in this codebase — evidence already present in the
Owner's own data is sufficient grounds to surface a signal; this
Policy does not require the system to first determine that an entry is
actually incorrect before it may be shown. The bar is "is this a true,
checkable fact about the data," never "is this confirmed to be a
mistake."

## Business Requirements Now Settled

The following are settled by this Policy, operationalizing `BDR-0017`'s
already-approved decisions:

1. Counted Contagem entries may be ranked by `sellingValue`, descending,
   using the value the existing calculation already produces.
2. Each entry's share of the Contagem's total value
   (`sellingValue / totalSellingValue`) may be shown as a plain fact.
3. A summary of where the Contagem's total value is concentrated (e.g.,
   what share the largest contributors represent) may be shown.
4. Entries whose value is unusual relative to the *value distribution
   of this same Contagem's own other entries* may be flagged as worth
   review — never against any external or historical expectation (per
   `BDR-0017` Part 5).
5. Two or more entries within the same Contagem whose product names
   closely resemble each other may be flagged as possibly referring to
   the same physical stock, counted more than once.
6. The review representation of a Contagem may be ordered by value
   instead of entry order, so higher-value contributors are easier to
   find.
7. Every signal above must be shown as evidence, with enough
   supporting detail for the Owner to understand why it was surfaced —
   never a bare, unexplained flag.
8. The Owner is always the party who decides whether a flagged entry
   is correct. No signal in this Policy triggers any automatic change
   to any entry.

## Candidate Signals

Per items 1–6 above, the system may treat any of the following as
grounds to surface a Contagem Integrity signal, individually or
together:

- **Value rank / share of total** — `sellingValue`, and
  `sellingValue / totalSellingValue`, both already produced by the
  existing, unmodified valuation calculation. Requires no new data.
- **Same-count value-distribution position** — an entry's `sellingValue`
  examined against the distribution of `sellingValue` across the rest
  of the same Contagem's already-counted entries. Per `BDR-0017` Part
  3, this is the only field authorized for a comparison spanning the
  *entire* Contagem at once — raw `quantity` and raw `sellingPrice`
  are explicitly not authorized for this same cross-catalog use (see
  Scope Exclusions, below).
- **Product-name similarity, within the same Contagem's own entries** —
  after normalization (case, spacing, punctuation, and accent
  differences, mirroring `POL-0003`'s own existing normalization
  language for the same underlying kind of comparison). Two rows
  sharing an exact product identity (`productId`) are never a match
  candidate under this signal — see Boundary Against POL-0003, below.

**Evidence/context note, not a requirement:** `POL-0003` (§ Candidate
Signals) already documents an existing `normalize()` function
(`businessCategories.ts`) and explicitly declines to assert it is
suitable, sufficient, or validated for name-similarity comparison. This
Policy inherits that same non-assertion — it is cited only to note
that *some* normalization capability already exists somewhere in this
codebase, not to prescribe its reuse here.

## Boundary Against POL-0003

`POL-0003` governs whether a newly typed product name matches an
**existing catalog Product**, at product-creation/entry time, and
requires the Owner to resolve it as "same product" or "different
product" before either outcome (merge or new-identity creation)
proceeds. This Policy's product-name-similarity signal (Candidate
Signals, above) governs a different moment and question entirely:
whether **two rows already present within one Contagem session**
resemble each other, which may include two manually-typed rows neither
of which has been matched to any catalog product at all. This Policy
does not extend, modify, or substitute for `POL-0003`'s own governed
confirmation flow, its candidate signals, or its threshold — a
Contagem-internal name-similarity flag under this Policy never
triggers, and is never treated as, a `POL-0003` product-identity
resolution. The two may eventually share an underlying comparison
mechanism at the implementation layer; that is explicitly left to a
later Specification, not decided here.

## Confirmation / Presentation Experience — Minimum Shape

Whatever the eventual interaction design, it must, at minimum: present
each signal together with enough supporting detail (per item 7, above)
for the Owner to understand why it was surfaced — never a generic,
unexplained badge; phrase every signal as a fact about the data,
consistent with `BDR-0017`'s Evidence Test (its Part 7) — e.g. "this
entry represents 18.9% of the Contagem's value," never "this entry is
wrong"; and take no automatic action on any entry — the Owner's own
existing edit path remains the only way any entry changes, unchanged
by this Policy.

## Technical Boundary

This Policy does not decide, and explicitly leaves to a later
Specification:

- The specific statistical method for same-count value-distribution
  flagging (e.g. percentile, IQR, MAD, or share-of-total alone) —
  `BDR-0017` Part 3 fixes *which field* is safe to use this way, not
  *how* the distribution is characterized.
- The specific string-similarity algorithm or normalization method for
  product-name comparison.
- Any numeric threshold, for any signal (value-share cut-off,
  distributional-outlier cut-off, or name-similarity cut-off).
- How multiple signals are weighted, ordered, or combined when more
  than one applies to the same entry — subject always to `BDR-0017`
  Part 2 Decision 7's prohibition on collapsing them into one
  composite score.
- The exact UI copy, layout, or interaction flow, beyond the minimum
  shape stated above.
- The underlying data model, storage mechanism, or computation
  location (client-side, server-side, or otherwise) for any signal.
- Whether, or how, this capability extends to Initial Stock Count —
  `BDR-0017` Part 2 Decision 9 permits it in principle; this Policy
  does not itself extend it.

`BDR-0017` does not reach into any of the above; this Policy,
operationalizing that BDR, does not reach further into that territory
than the BDR itself authorized.

## Scope Exclusions

This Policy does **not** authorize, and any of the following would
require a separate, future decision:

- Raw quantity or raw selling price compared across unrelated products
  in the same Contagem (`BDR-0017` Part 3 and Part 2 Decision 5).
- Any comparison against a previous Contagem, a historical range, an
  Owner-entered expected value, a category estimate, or an AI estimate
  (`BDR-0017` Part 5).
- A numeric composite suspicion score (`BDR-0017` Part 2 Decision 7).
- A guided, one-item-at-a-time correction workflow, direct row-jump, or
  automatic advance (`BDR-0017` Part 2 Decision 8).
- Any automatic merge, deletion, or modification of any entry, product,
  quantity, price, or unit (`BDR-0017` Part 2 Decision 3).
- Any resolution of `POL-0003`'s own remaining scope — see Boundary
  Against POL-0003, above.

## Governance Notes

- This record does not modify `BDR-0017`, `BDR-0009`, `BDR-0012`,
  `POL-0003`, `POL-0012`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or
  Implementation Authorization.
- This record does not modify any `src/`, `server/`, `firestore.rules`,
  or test file. None were touched to produce it.
- The `Status: Proposed` marking above is deliberate — unlike the
  sequential, unprefixed BDR namespace, the governance framework
  document requires an explicit Product Architect decision to confirm
  a `POL-NNNN` assignment each time. This document's content is
  complete and ready for that confirmation; only the numbering is
  provisional.
