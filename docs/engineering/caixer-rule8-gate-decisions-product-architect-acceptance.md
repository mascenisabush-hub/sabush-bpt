Acceptance Record

# Product Architect Acceptance — CAIXER Rule 8 Gate Decisions (CX-1, CX-2, CX-6, CX-13, CX-14)

**Status:** ✅ **ACCEPTED AND SIGNED.** See §6, below. Acceptance
covers all four `READY AFTER DECISIONS` gate items named by the CAIXER
Rule 8 Assessment Addendum (CX-1, CX-2, CX-6, CX-13) and the CX-14
Specification-gap flag named in that same addendum's Gate Status
section. This acceptance does **not** itself constitute an
Implementation Plan Amendment or a signed Implementation Authorization
item, does not amend `business-worth-evolution-specification.md`, and
does not authorize any code, test, `firestore.rules`, or
`firestore.indexes.json` change.

**Prepared by:** Claude (Lead Software Engineer role, this
repository), recording a decision the Product Architect delivered
directly, against repository state at this session's clone of `main`.

**Governs (originating gate, preserved unchanged as the historical
assessment artifact — not itself amended by this acceptance):**
- [`docs/engineering/business-worth-evolution-rule8-assessment.md`](./business-worth-evolution-rule8-assessment.md) — specifically the "Rule 8 Assessment Addendum — CAIXER: Multi-Method Liquidity Measurement" section, Gate Status subsection, verdict `READY AFTER DECISIONS`.

**Full governance lineage this acceptance sits atop, each preserved
unamended:**
1. [`caixer-multi-method-liquidity-measurement-decision.md`](./caixer-multi-method-liquidity-measurement-decision.md) — BDR Decision 40, the original signed CAIXER business decision (11 September 2026)
2. `business-worth-evolution-rule8-assessment.md`, CAIXER addendum — Rule 8 Assessment, verdict `READY AFTER DECISIONS`, naming CX-1, CX-2, CX-6, and CX-13 as required Product Architect decisions and CX-14 as a Specification gap
3. **This document** — Product Architect acceptance of those four decisions and the CX-14 gap

**This is a subsequent acceptance event.** Artifacts 1–2 above are not
rewritten, and neither is to be read as having anticipated or already
recorded this acceptance at the time each was originally created. This
document is the acceptance record for the gate decisions specifically,
dated to today.

---

## 1. What This Acceptance Covers

Signing this record accepts the following, delivered directly by the
Product Architect:

- **CX-1** — Aggregate consistency enforcement mechanism.
- **CX-2** — Mandatory-field enforcement mechanism, **with an explicit
  non-destructive validation/data-preservation requirement**.
- **CX-6** — Review-step component visibility.
- **CX-13** — Four-method reconciliation model.
- **CX-14** — Backward compatibility (Specification gap acknowledgment).

Signing this record does **not**:

- Perform, resume, or complete an Implementation Plan Amendment against
  these decisions — that remains the next, separate gate (§7, below).
- Amend `business-worth-evolution-specification.md` (including the
  small §45 clarification CX-14 itself names as still required at
  Specification-drafting time).
- Authorize implementation, a schema change, `firestore.rules` change,
  or an Implementation Authorization.
- Retroactively represent either prior artifact in this lineage as
  having anticipated this acceptance at the time it was written — each
  is preserved exactly as it stands.

## 2. CX-1 — Aggregate Consistency Enforcement Mechanism

**ACCEPTED.**

> The CAIXER liquidity aggregate must be system-derived and must never
> be independently entered or edited by the operator.
>
> The four authoritative CAIXER components are: Cash, eMola, M-Pesa,
> Banco.
>
> The system must calculate:
>
> `cashPosition = Cash + eMola + M-Pesa + Banco`
>
> The operator does NOT manually enter the total.
>
> At the authoritative submission/write boundary, the system must
> recompute and/or verify the aggregate rather than trusting a
> client-supplied aggregate value.
>
> The stored aggregate must therefore remain economically consistent
> with the four stored component values.
>
> Do not introduce a second independent source of truth for total
> liquidity.

This confirms, as the accepted direction, the enforcement mechanism the
Rule 8 Assessment Addendum's own Finding CX-1 already recommended as
its default (a `firestore.rules`-layer consistency check, mirroring
that file's `initialStockRecoveryAuthorizationActive()` precedent) —
the exact rule text and tolerance handling remain a Plan-stage
engineering task, not decided here.

## 3. CX-2 — Mandatory-Field Enforcement Mechanism

**ACCEPTED, WITH AN EXPLICIT NON-DESTRUCTIVE VALIDATION REQUIREMENT.**

> All four CAIXER component fields are mandatory at authoritative
> submission: Cash, eMola, M-Pesa, Banco.
>
> The value 0 MZN is valid and meaningful.
>
> Blank, null, undefined, or otherwise missing values are invalid.
>
> Validation must exist at both the UI and authoritative server/write
> boundary.

**CRITICAL PRODUCT ARCHITECT DECISION — carried forward as a formal
acceptance criterion, not merely implementation guidance:**

> A validation failure MUST NEVER cause data loss.
>
> If a required field is missing or invalid:
> - Do NOT clear the CAIXER form.
> - Do NOT reset already-entered CAIXER values.
> - Do NOT discard stock-count quantities.
> - Do NOT discard any other valid in-progress Contagem data.
> - Do NOT restart the workflow.
> - Do NOT create a partial or invalid BusinessWorthSnapshot.
> - Do NOT overwrite valid working data with an empty/default state.
>
> Instead:
> 1. Preserve the entire current working state.
> 2. Identify the exact field(s) containing the error.
> 3. Return/display a clear validation error.
> 4. Keep the operator on the relevant step.
> 5. Allow the operator to correct the field.
> 6. Allow the operator to continue/resubmit.
> 7. Only create the immutable final snapshot after validation
>    succeeds.
>
> Server-side rejection is therefore a NON-DESTRUCTIVE VALIDATION
> RESPONSE, not a destructive reset.
>
> The implementation must also be designed so that a
> transient/network/server validation failure cannot silently destroy
> the operator's in-progress Contagem or CAIXER work.

This confirms the Rule 8 Assessment Addendum's own Finding CX-2
direction (server-layer `is number` validation for all four fields,
the same tier `measuredBusinessWorth` already receives) and adds a
requirement beyond what that finding alone stated: the non-destructive,
data-preserving behavior above is now a required acceptance criterion
for the eventual Implementation Plan Amendment, not an optional
implementation nicety.

## 4. CX-6 — Review-Step Component Visibility

**ACCEPTED.**

> FR-81 is interpreted to require the final Review step to show the
> four CAIXER liquidity components individually, not merely the
> aggregate.
>
> Review must therefore visibly show: Cash, eMola, M-Pesa, Banco,
> Total Liquidity (system-calculated).
>
> It must also show the measured product valuation and the complete
> governed Business Worth calculation before final confirmation.
>
> The Review step is a verification point, not a new data-entry source
> for the aggregate.

This resolves the ambiguity the Rule 8 Assessment Addendum's Finding
CX-6 named and did not itself settle.

## 5. CX-13 — Four-Method Reconciliation Model

**ACCEPTED — TOTAL-ONLY RECONCILIATION.**

> For the current CAIXER architecture, the four methods are measurement
> channels, not four independent transaction ledgers.
>
> Therefore:
> - Do NOT introduce per-method transaction reconciliation.
> - Do NOT require separate transaction ledgers for Cash, eMola,
>   M-Pesa, and Banco.
> - The authoritative reconciliation is the system-calculated total:
>   `Total Liquidity = Cash + eMola + M-Pesa + Banco`.
>
> The four individual measurements remain preserved and visible.
>
> A future per-method transaction/reconciliation model would require
> separate governance and must not be introduced as part of this
> implementation.

This resolves Finding CX-13, which the Rule 8 Assessment Addendum
confirmed OPEN and explicitly undecidable from engineering evidence
alone, per BDR Decision 40 §11.3's own deferral.

## 6. CX-14 — Backward Compatibility

**ACCEPTED**, confirming the reading the Rule 8 Assessment Addendum's
own Finding CX-14 recommended.

> Pre-CAIXER historical BusinessWorthSnapshots remain valid immutable
> historical records.
>
> Their existing scalar cashPosition remains authoritative for those
> historical measurements.
>
> The four-method CAIXER breakdown applies only to new snapshots
> created under the CAIXER measurement model.
>
> Do NOT rewrite, migrate, or reconstruct historical snapshots merely
> to make them conform to the new four-method structure.

The small `business-worth-evolution-specification.md` §45 clarification
this acceptance's underlying finding named (stating this reading
explicitly in the Specification text) remains a separate,
Specification-drafting-stage task — **not performed by this
acceptance**, which records the Product Architect's decision only.

## 7. Additional Product Architect Principle — Correction-Friendly, Non-Destructive Workflow

Recorded alongside the five decisions above, governing how CX-2 in
particular must be carried into implementation:

> The CAIXER workflow must be correction-friendly and non-destructive.
>
> The intended operator experience is:
>
> Stock Count → CAIXER → Review → Final Business Worth Confirmation →
> Immutable Snapshot
>
> Before final confirmation, the operator must be able to go backward
> and correct errors.
>
> Validation must therefore support correction rather than interrupting
> or destroying the workflow.
>
> The system must never make an operator re-enter an entire Contagem
> merely because one CAIXER field failed validation.

This principle does not introduce a new mechanism beyond CX-2 and the
Rule 8 Assessment Addendum's already-inherited Finding CX-5 (Go-Back
safety, guaranteed by construction since no `BusinessWorthSnapshot`
exists before final confirmation) — it states the governing intent
those two findings must jointly satisfy at Plan/implementation stage.

## 8. Product Architect Signature

> I, SABUSHIMIKE MASCENI, Product Architect, ACCEPT AND SIGN the
> following decisions: CX-1 (Aggregate Consistency), CX-2
> (Mandatory-Field Enforcement, with the non-destructive validation
> requirement stated in full above), CX-6 (Review-Step Component
> Visibility), CX-13 (Four-Method Reconciliation — Total-Only), and
> CX-14 (Backward Compatibility). This acceptance does not itself
> authorize an Implementation Plan Amendment or Implementation
> Authorization item; both remain separate, subsequent governance
> steps, per BDR Decision 40's own recording note (§11.4 of the signed
> decision record).

| Decision | Status | Detail |
|---|---|---|
| **CX-1** | ✅ **ACCEPTED** | System-derived aggregate; recompute/verify at write boundary; no second source of truth |
| **CX-2** | ✅ **ACCEPTED** | Mandatory four fields, `0` valid; **non-destructive validation is a formal acceptance criterion** |
| **CX-6** | ✅ **ACCEPTED** | Review shows all four components individually plus system-calculated total |
| **CX-13** | ✅ **ACCEPTED** | **Total-only** reconciliation; no per-method ledgers |
| **CX-14** | ✅ **ACCEPTED** | Historical snapshots preserved unmigrated; four-method breakdown applies to new snapshots only |

**Product Architect:** SABUSHIMIKE MASCENI

**Acceptance Date:** 11 September 2026

---

## 9. Governance Relationship

This acceptance does not stand alone — it is the third artifact in a
three-step lineage, each preserved exactly as written at the time of
its own creation:

1. BDR Decision 40 — signed CAIXER business decision (`caixer-multi-method-liquidity-measurement-decision.md`)
2. CAIXER Rule 8 Assessment Addendum — verdict `READY AFTER DECISIONS` (`business-worth-evolution-rule8-assessment.md`)
3. **This Product Architect Acceptance of CX-1, CX-2, CX-6, CX-13, and CX-14**

Neither artifact 1 nor 2 is rewritten, backdated, or reinterpreted as
having already recorded this acceptance. This is a subsequent
acceptance event, dated 11 September 2026, layered on top of an
unmodified prior record.

---

## 10. Governance Status After This Acceptance

```
BDR Decision 40 (CAIXER — signed)
        ↓
CAIXER Rule 8 Assessment Addendum
        ↓
READY AFTER DECISIONS
        ↓
PRODUCT ARCHITECT ACCEPTANCE — COMPLETE  ◄── this document
        ↓
Implementation Plan Amendment — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**The acceptance of these five decisions does not itself authorize
implementation.** An Implementation Plan Amendment may now be drafted
against the CAIXER Rule 8 Assessment Addendum's own "Issues the
Implementation Plan Amendment Must Address" checklist, incorporating
CX-2's non-destructive validation requirement as an explicit acceptance
criterion — that Plan is not drafted by this document, and no
Implementation Authorization may be produced until it is complete.
**No application code, test, schema, or `firestore.rules` file was
modified to produce this acceptance record.**
