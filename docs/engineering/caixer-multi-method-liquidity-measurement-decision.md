Product Architect Decision Record

# CAIXER — Multi-Method Liquidity Measurement + Mandatory Contagem-Time Confirmation

**Status:** ✅ **ACCEPTED AND SIGNED.**
**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 11 September 2026

**Governing basis this decision sits on top of, without amending in place:**
`BDR-pending-business-worth-evolution-measurement-model.md` (specifically
Decision 3, cash-at-Contagem; Decision 34, the narrow architecture-boundary
override), `POL-pending-business-worth-evolution-policy.md` (`POL-0010`),
`business-worth-evolution-specification.md` (§8 snapshot data model, §10
Cash Ledger, §22 reconciliation signal, FR-55, §27 immutability, §43 Owner
Investment), `docs/engineering/business-worth-evolution-rule8-assessment.md`,
`docs/engineering/business-worth-evolution-implementation-authorization.md`
(Revision 3, §22–§23, Increment 10 Item 3).

**Relationship to that basis:** this decision does not reopen Decision 3's
own governing principle (cash is measured, physically, as of the Contagem
date) — it operationalizes it precisely, resolving the gap a prior
read-only investigation identified: FR-55 says Contagem confirmation "must
require" the Owner to record/confirm cash as of that date, but no
implementation enforces this, and no existing field distinguishes between
Mozambique's four real liquidity channels. This decision does not reopen,
amend, or redesign Specification §43 (Owner Investment) — that capability
remains exactly as already specified and authorized (§8, below).

**This decision does not itself authorize implementation.** Per this
repository's established sequence (`Business Philosophy → BDR → Policy →
Module Specifications → Rule 8 → Implementation`), this is the
business-decision-layer record. See §11 ("Recording Note — Governance
Follow-Up Required") for exactly what remains before any code,
`firestore.rules`, or formula change may be made.

---

## 1. Decision Summary

CAIXER becomes the mandatory, final financial-measurement stage of every
new-model Contagem. At every such Contagem, after the physical stock
count, the Owner must explicitly confirm the business's current position
in each of four liquidity methods — Cash, eMola, M-Pesa, Banco — before
the Contagem can be finally confirmed. This operationalizes, without
altering, Decision 3 and FR-55.

The governed flow:

```
CONTAGEM
  → Physical Stock Measurement
  → CAIXER Financial Position Measurement
  → Review
  → Confirm Contagem
  → Business Worth Snapshot
```

## 2. Four Required Liquidity Methods

CAIXER must separately capture and separately preserve the business's
current position in:

1. **Cash**
2. **eMola**
3. **M-Pesa**
4. **Banco** (bank account balance belonging to the business)

These four values are preserved individually as part of the Contagem's
authoritative, immutable financial measurement — not merely summed and
discarded — so a historical snapshot can show how the total liquidity
position was composed. The Business Worth engine uses their governed
total.

**Explicitly rejected as a source for this concept:** the existing
`PaymentMethod` type (`'mpesa' | 'emola' | 'bim'`, `apps/tenant/src/types.ts:504`).
That type governs how a tenant Business Owner pays *SABUSH's own
subscription fee* (Module #19 Payment) — a structurally unrelated domain.
It must not be reused, repurposed, or widened for this capability merely
because it shares method names.

## 3. No Unfilled CAIXER Fields

Every one of the four methods is mandatory at every Contagem. Blank,
null, or undefined is never an acceptable measurement. An explicit `0`
is a valid and meaningful value, distinguishing "the business has zero
in this method" from "the Owner did not provide a measurement."

## 4. Measurement Date — Contagem-Time, Not Declaration-Time

The authoritative CAIXER measurement date is the date of the Contagem
being confirmed — never the date a standalone declaration happens to
have been made.

- A standalone Posição de Caixa declaration, made before or after that
  date, must never retroactively modify an already-confirmed
  `BusinessWorthSnapshot`.
- A previously submitted declaration may be used as reference or
  pre-fill/convenience information, but must never silently become the
  authoritative CAIXER measurement for a new Contagem without the
  Owner's own active confirmation at that Contagem.
- **There is no day-based grace period** (not 7, 14, or 30 days). A
  declaration made one day earlier can be stale; one made twenty-nine
  days earlier can also be stale — age alone is not the governing
  criterion. The single governing boundary is the Contagem measurement
  event itself, and the Owner's active confirmation at that event is
  the only thing that is ever authoritative.

## 5. Business Worth Calculation — No New Formula, No Incremental Model

The four CAIXER values together represent the measured liquidity
position at the Contagem measurement date; their total contributes to
`measuredBusinessWorth` via the existing formula shape.

The existing economic principle is explicitly preserved and must not be
altered by this decision: **a Contagem is a fresh physical
remeasurement, never an incremental addition to the previous snapshot.**
The system must not compute `previous Business Worth + previous cash +
new cash + stock...` — it must continue to measure the business's
current, actual position from scratch at every Contagem, exactly as
`computeMeasuredBusinessWorth` (`apps/tenant/src/utils/calculations.ts:904-930`)
already does for the single-scalar case today. The four-method model
must preserve this property, not reintroduce accumulation.

## 6. Cash → Stock Conversion — Governing Test Case

Accepted explicitly as a governing test case for any future
implementation, generalizing the finding from the prior read-only
investigation (confirmed against `tests/business-worth-measured-value.test.ts:84-110`):

```
Contagem #1:  Cash = 100,000 MZN   Stock = 500,000 MZN
              (Owner fails to declare the 100,000 MZN)

Later:        100,000 MZN Cash → converted into Stock

Contagem #2:  Cash = 0             Stock = 600,000 MZN
```

The system must not treat the 100,000 MZN as both cash and stock.
Contagem #2 measures the actual current state only (Cash = 0, Stock =
600,000) — never a phantom addition of the original 100,000 on top of
the now-increased stock figure. The identical principle applies without
exception to eMola → Stock, M-Pesa → Stock, and Banco → Stock. **The
liquidity method is a measurement dimension, not an additional source
of economic value** — a value expressed as 40,000 eMola instead of
40,000 Cash is not, by virtue of the method, worth more or less, and
converting between methods (or into stock) creates no new value and
destroys none.

## 7. Owner Investment / Capital Added — Explicitly Unaffected

Specification §43 "Owner Investment" (already signed, already
authorized as Increment 10 Item 3 of the Business Worth Evolution
Implementation Authorization, Revision 3) remains entirely separate
from CAIXER and is not reopened, redesigned, or reinterpreted by this
decision:

- Owner Investment is money the Owner deliberately introduces into an
  already-operating business — distinct from operating profit and from
  Startup Investment.
- It produces its own governed, immediate, live Business Worth effect,
  paired atomically with its own `CashLedgerEntry`
  (`category: 'other-governed-movement'`).
- CAIXER is a *measurement* mechanism (what liquidity the business
  currently holds, by method); Owner Investment is a *transaction*
  mechanism (money being introduced). The two must not be collapsed —
  the same money, once physically measured through CAIXER at a later
  Contagem, must not be counted a second time on top of the live effect
  Owner Investment already produced since the last snapshot. This is
  the same non-double-counting discipline the Specification's own §43
  text already requires for Owner Investment against its linked
  `CashLedgerEntry`, extended here to also cover CAIXER's own later
  physical remeasurement of the same funds.
- Implementation of §43 may proceed independently, according to its own
  existing authorization and one-item-at-a-time execution discipline,
  regardless of this decision's own implementation timeline.

## 8. Levantamento Symmetry — Unchanged

The existing Levantamento (Withdrawal) concept is unaffected. The three
concepts remain conceptually distinct and must not be collapsed into
one mechanism:

- **Owner Investment** → governed money/value entering the business (a
  transaction).
- **Levantamento** → governed money/value leaving the business (a
  transaction).
- **CAIXER** → the physical/current measurement of what liquidity
  remains in the business at Contagem time (a measurement, not a
  transaction).

## 9. Snapshot History and Standalone Posição de Caixa

- `BusinessWorthSnapshot` immutability (Specification §27) is
  unaffected and unweakened — CAIXER values captured for a confirmed
  Contagem become part of that Contagem's permanent historical record.
  A later CAIXER measurement creates a new measurement (via the next
  Contagem's own new snapshot); it never rewrites a previous one.
- The authoritative measurement for Business Worth is the CAIXER
  confirmation made *inside* Contagem. Standalone Posição de Caixa
  declarations (the existing `cashPositionDeclarations` mechanism,
  `apps/tenant/src/context/AppContext.tsx:4742-4763`) must therefore
  not be silently treated as the authoritative measurement for a future
  Contagem.
- Their future role — whether the existing standalone-declaration UI is
  retained as a reference/pre-fill convenience or eventually retired —
  is left open, to be resolved at Specification-amendment/implementation
  time, on the single condition that whatever is decided must not
  weaken the mandatory CAIXER confirmation requirement. No standalone
  declaration may ever bypass CAIXER confirmation.

## 10. Explicit Governance Boundaries — What This Decision Does NOT Authorize

This decision does not authorize:

- redesign of the Business Worth Engine or its existing formula shape;
- changing the fresh-remeasurement principle (§5, above);
- changing `BusinessWorthSnapshot` immutability;
- changing Levantamento semantics;
- changing Startup Investment semantics (Decision 6/FR-52, unaffected);
- reusing the subscription `PaymentMethod` type for tenant liquidity
  measurement (§2, above);
- treating CAIXER, or any of its four components, as profit;
- treating money converted from a liquidity method into stock as new
  economic value (§6, above);
- creating a day-based Posição de Caixa expiry/grace-period rule (§4,
  above — explicitly rejected, not merely undecided);
- background recomputation of any kind;
- retroactive modification of any confirmed `BusinessWorthSnapshot`;
- any unrelated product redesign.

The four-method CAIXER data-model expansion must be incorporated into
the appropriate Specification and Rule 8 governance artifacts (§11,
below) before its implementation begins.

---

## 11. Recording Note — Governance Follow-Up Required (This Decision Does Not Authorize Implementation)

Per this repository's established sequence, and mirroring exactly how
BDR Decisions 36–39 were each carried through their own downstream
governance before any implementation instruction was given, this
decision is the business-decision-layer record only. The following
remain required, in order, before any code, test, `firestore.rules`, or
`firestore.indexes.json` change may be made in furtherance of this
decision:

### 11.1 Specification sections requiring amendment

Traced directly against the current, signed text of
`business-worth-evolution-specification.md`:

1. **§8 — Business Worth History / Snapshot Data Model.** The single
   scalar `cashPosition: number` field must be amended to accommodate
   four individually-preserved, immutable liquidity-method fields
   (working names only, not authoritative until drafted at Specification
   stage: `cashPositionCash`, `cashPositionEmola`, `cashPositionMpesa`,
   `cashPositionBanco`, plus a derived/stored total). §8's "Immutable
   fields" list (currently naming `cashPosition` once) must name all
   four new fields explicitly.
2. **§10 — Cash Ledger** and **§22 — Contagem Reconciliation Signal.**
   `computeCashReconciliationDifference`
   (`apps/tenant/src/utils/calculations.ts:984-989`) currently compares
   one Owner-confirmed scalar against one ledger-derived balance; the
   Specification text describing this comparison needs to state whether
   reconciliation is performed against the four-method total only, or
   per-method — a genuine open question this decision does not resolve
   (§11.3, below).
3. **§27 — Immutability.** The frozen-fields list must be extended to
   name the four new CAIXER fields alongside the existing ones already
   listed.
4. **FR-55.** Currently states Contagem confirmation "must require" the
   Owner to record/confirm cash as of that date. Needs amendment to (a)
   name the four-method requirement explicitly, (b) state the "no field
   may be unfilled, zero is valid" rule (§3, above) as a formal
   requirement, and (c) require an active confirmation step structurally
   inside the Contagem flow — not merely a value being present somewhere
   in Firestore at confirmation time (closing the exact gap the prior
   investigation identified: `PeriodicStockCountView.tsx:5649-5651`
   currently silently reuses `cashPositionDeclarations[0]` with no
   gate).
5. **A new section** (next available number in sequence) formally
   defining CAIXER — its four-method schema, its relationship to
   standalone Posição de Caixa declarations (§9 of this document, above), and new FRs for
   the mandatory-confirmation requirement, mirroring how §43 formally
   defined Owner Investment.

**Not required to change:** §43 (Owner Investment, preserved unchanged
per §7, above); the fresh-remeasurement principle of
`computeMeasuredBusinessWorth`/`computeCaseALiveBusinessWorth`'s own
formula shape (§5, above, preserved); Levantamento, Startup Investment,
or any Specification section this decision does not name above.

### 11.2 Rule 8 impact

**A new Rule 8 Assessment Addendum is required before implementation
begins**, appended to the existing
`docs/engineering/business-worth-evolution-rule8-assessment.md`
following that document's own established "Addendum" convention (see
its existing "Rule 8 Assessment Addendum — Revision 3" and "Rule 8
Assessment Addendum — First-Time Contagem Product-Information Model"
sections). This decision's own scope is materially new — new immutable
snapshot fields, a new mandatory stage inserted into the Contagem
finalization critical path, and a UI/flow requirement (blocking
confirmation until all four fields are filled) — none of which the
existing, already-CLOSED Rule 8 Assessment (or its Revision 3 addendum,
which covered Owner Investment and Owner-Declared Business Worth, not
CAIXER) evaluated. **No Rule 8 Assessment Addendum for CAIXER exists in
this repository as of this decision's signature.** This recording note
identifies that requirement; it does not, and cannot, satisfy it.

### 11.3 Open technical questions explicitly left to Rule 8 (not decided here)

Named so they are not silently resolved by inference during a future
implementation pass:

- Whether the reconciliation signal (§22) compares the four-method
  total against the ledger-derived balance, or is computed per-method
  against some future per-method ledger breakdown (no such breakdown
  exists today — the Cash Ledger is a single, undifferentiated balance).
- Exact field names and storage shape for the four CAIXER values (this
  decision fixes the *business* requirement — four separate, mandatory,
  individually-preserved values — never the schema).
- Whether/how `firestore.rules`' `businessWorthSnapshots` create-branch
  validation should enforce "all four fields present, each a number"
  structurally, mirroring how it already enforces `cashPosition`'s
  presence/absence rules for the Owner-Declared branch today.
- The UI mechanism for blocking Contagem confirmation until all four
  CAIXER fields are filled (§3, above fixes the business rule; the
  mechanism is undecided).
- The future role of standalone Posição de Caixa declarations (§9,
  above, explicitly left open pending this Rule 8 pass).

### 11.4 What remains before implementation

Specification Amendment (§11.1) → its own Rule 8 Assessment Addendum
(§11.2–11.3) → an Implementation Plan Amendment → a signed Implementation
Authorization item — each a separate, explicitly-gated step, mirroring
exactly how Owner-Declared Business Worth (Decision 36) and Owner
Investment (§43) were each carried through this same sequence before
any implementation instruction was given. **This decision record alone
is not sufficient authorization to begin implementation of CAIXER, the
four-method liquidity model, or any Firestore/formula/UI change named
above.**
