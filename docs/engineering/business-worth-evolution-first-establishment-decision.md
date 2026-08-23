# SABUSH BPT — Finalized Product Architect Decision Log
## Business Worth First Establishment, Opening Balances, Live Worth & Fecho

**Signed:** SABUSHIMIKE Masceni, 23 August 2026
**Status:** APPROVED — Product Architect decision, recorded as governance history.

**Governing chain position:** this record sits alongside `business-worth-evolution-specification.md`, `business-worth-evolution-rule8-assessment.md`, `business-worth-evolution-implementation-plan.md`, and `business-worth-evolution-implementation-authorization.md` as the decision basis for a future amendment pass to those documents. **This document is a decision record, not itself a Specification/Plan/Authorization amendment.** No Specification section, Rule 8 finding, Implementation Plan item, or Authorization increment has been edited by this commit. No code has been written. No new increment has begun. The formal amendments this decision requires (§6, §8, §12, §18/FR-25, §22, §25‑§26, §32, BDR Gap 2/FR-2, plus new sections for Owner Investment, opening liabilities, and Contagem cost-basis conversion) remain a separate, not-yet-drafted step.

This log consolidates Decisions A–J (from the prior brief) with the five sub-decisions resolved in this message, into one final, closed record.

---

## Decision 1 — Opening Payables / Liabilities

**Approved:** Extend the existing `Payable` model with an `origin` field distinguishing:
- `origin: 'purchase'` — created automatically via `+Stock`'s existing `supplierCredit` branch (unchanged).
- `origin: 'opening-balance'` (or equivalent) — created via a new, standalone creation path, used when a business first establishes Business Worth and needs to declare existing supplier/rent/salary/other obligations.

**Not approved:** a separate `Liability`/`Obligation` record type. One unified model, with provenance, as recommended.

**Consequence locked in:** existing `Payable` payment/settlement machinery (`PayablePayment`, `amountRemaining`, FIN-4/FIN-5 non-double-counting) is reused unchanged for both origins. General unpaid obligations (rent, salaries) now have a home under this same extended model rather than requiring an entirely separate mechanism.

---

## Decision 2 — Additional Owner Investment

**Approved:** A dedicated Owner Investment record, distinct from Startup Investment, Initial Investment, and Withdrawals.

- Own transaction/record type (mirroring `Withdrawal`'s shape as the natural inverse).
- Produces a real `CashLedgerEntry` (using the existing, currently-unused `'other-governed-movement'` category, as previously recommended, unless you'd prefer a new dedicated category — not yet specified either way, defaulting to reuse per the earlier recommendation).
- Additive in the live Business Worth formula, parallel in structure to how Withdrawals subtract.
- Auditable via the existing per-business Timeline pattern.

**Explicitly not approved:** any expansion of `startupInvestmentEntries`'s scope to cover this. Startup Investment remains exactly as governed (Decision 6/FR-52), spending-only, never netted against Business Worth.

---

## Decision 3 — Receivable Reminder Cadence

**Approved:** Recurring reminder every 30 days while any amount remains outstanding.
- Partial payment does **not** reset the 30-day clock — the cadence continues against the original outstanding fact.
- Reminders stop immediately and permanently once `status === 'paid'`.
- FIN-3 remains completely unchanged: unpaid receivables are never additive to Business Worth; payment affects cash/Business Worth correctly, exactly as already implemented.

---

## Decision 4 — Fecho Baseline

**Approved:** Remove the Capital Inicial (`initialStockCount.createdAt`) fallback from `resolveActiveBusinessWorthBaselineDate`. Fecho's baseline is exclusively the last established Business Worth (Contagem-sourced or, per Decision A/Path B, Owner-declared) — never Capital Inicial.

**Accepted consequence:** a business with only historical Capital Inicial and no established Business Worth yet will see custom-period Fecho disabled until it establishes one. This is a real, acknowledged behavior change for existing State-1a businesses, not a side effect to be smoothed over.

**UI message approved (Portuguese, as proposed):**
*"Estabeleça primeiro o Valor do Negócio através de uma Contagem para utilizar o Fecho."*
(If Path B is implemented, this should be extended to also mention the Owner-declared path — exact final copy to be confirmed at drafting time, since Path B's own UX naming isn't finalized yet.)

---

## Decision 5 — Owner Portfolio

**Approved:** Owner Portfolio is explicitly out of scope and remains completely untouched.
- Dashboard → live Business Worth (already correctly built, per the prior investigation).
- Owner Portfolio → the existing Module #17 v0.2 `currentWorth` cache, explicit-Admin-refresh-only, per its own separate Stage 8 Authorization.

No amendment to Module #17/Stage 8 is authorized or contemplated by any decision in this log.

---

## Complete, Consolidated Decision Set (A–J + 1–5, Final)

| Item | Decision | Status |
|---|---|---|
| A — Owner-Declared Business Worth (Path B) | Authorized — formal reversal of BDR Gap 2/FR-2 | **Approved** |
| B — Opening Payables/Liabilities | Extend `Payable` with `origin` field (Option 1) | **Approved** |
| C — Additional Owner Investment | Dedicated new record, separate from Startup Investment | **Approved** |
| D — Receivable notification cadence | 30-day recurring, no reset on partial payment | **Approved** |
| E — Fecho baseline fallback | Removed; Capital Inicial fallback eliminated; regression accepted | **Approved** |
| F — Live worth scope | Dashboard only; Owner Portfolio untouched | **Approved** |
| G — Terminology (Dashboard + both reports) | Full three-surface correction, including stale copy | **Approved** (exact wording pending drafting) |
| H — Ordinary Contagem + cash | Already governed — implementation only | **Confirmed, not reopened** |
| I — Composite first-establishment flow | Follows from A–H | **Confirmed** |
| J — Snapshot drill-down (FR-7) | Already governed, plus additive fields for A/B/C | **Confirmed, not reopened** |
| 7 — Contagem cost-basis conversion | Original purchase unit + price; conversion via existing engine for other units | **Approved** |
| 9 (Fecho) — Batch-level profit exposure | Fecho must expose profit by batch | **Approved** |

---

## What Happens Next

Per your proposed next step: I will prepare a **governance amendment draft** — a document, not a repository write — covering:

1. §6 State 2 factual correction (Capital Inicial ≠ first Contagem for a new business).
2. §8 — new `establishmentMethod` field on `BusinessWorthSnapshot`.
3. §12 — `Payable.origin` extension.
4. §18/FR-25 — Fecho baseline correction, removal of the Capital Inicial fallback.
5. §22 — receivable notification cadence (30-day recurring).
6. §25‑§26 — correction/recovery extension to Path B snapshots.
7. §32 — Dashboard + report terminology, full three-surface scope.
8. New section — Owner Investment (Decision C).
9. New/extended section — opening liabilities (Decision B).
10. New section or extension — Contagem cost-basis conversion (item 7).
11. New section or extension — Fecho batch-level profit attribution (item 9).
12. BDR Gap 2 / FR-2 — formal reversal record, with your signature/date as the authorizing event.

**This draft will be produced as a document for your review only. No `docs/specs/`, `docs/engineering/`, or any other repository file will be modified until you separately, explicitly authorize that write.**

Shall I proceed with the amendment draft now?
