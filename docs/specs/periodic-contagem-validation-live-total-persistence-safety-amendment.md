Business Domain Specification — Amendment

# Periodic Contagem — Validation, Live-Total Integrity & Persistence-Safety Decisions
## (Proposed §48 of the Business Worth Evolution Specification)

**Status:** ✅ **PRODUCT ARCHITECT DECISIONS RECORDED.**

This document records Product Architect decisions reached across a
multi-pass forensic investigation of Periodic Contagem's validation,
live-total, and persistence-safety behavior. It is governance-approved
documentation. **It does not, on its own, authorize implementation** —
a Rule 8 Assessment and a signed Implementation Authorization remain
separate, subsequent gates for every decision recorded here, exactly
as required for every sibling amendment in this governance chain
(§44, §45, §46, §47).

---

## 1. Baseline at the time of this record

`main` @ `6c96801756725281c6f778e1d47dcce1f52d84b1`, matching
`origin/main` exactly, working tree clean apart from one unrelated,
pre-existing, untracked document
(`docs/engineering/periodic-contagem-architect-summary-2026-09-26.md`),
preserved untouched by this commit.

---

## 2. Governing principle — recorded above every other Contagem decision

This principle governs PA-08 persistence states, recovery, grouping,
migration, and finalization behavior — none of those subordinate
decisions may be read as weakening it.

> No recorded data may silently disappear.
>
> Every product/stock entry that the owner records must contribute
> correctly to the live total.
>
> Any problem that prevents correct participation must be detected and
> addressed while the product is being recorded, before the owner can
> move on.
>
> "Rever e Confirmar Contagem" is the final verification step, not the
> first place where ordinary recording errors, missing information,
> persistence problems, or incorrect live-total participation are
> discovered.
>
> System-caused problems should be resolved silently where safe and
> possible. The owner should only be interrupted when an action is
> genuinely required.
>
> User-caused incomplete or invalid input must stop progression and
> clearly tell the owner what must be corrected.
>
> A product is not successfully counted merely because the owner
> entered a value. It is successfully counted when its required input
> is valid, it participates correctly in the live total, and its
> persistence state is safe enough for the owner to proceed.

---

## 3. Cost Price — existing signed decision reaffirmed, not reopened

`docs/specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
(§44, accepted and signed) remains fully authoritative and is not
amended, altered, or reopened by this document.

Reaffirmed, per that amendment's own FR-71 and this investigation's
own direct verification of the live code (zero `costPrice`-bound input
found anywhere in `PeriodicStockCountView.tsx`):

- Periodic Contagem must not, and does not, present an Owner-editable
  Cost Price input for any counted portion.
- Cost Price is not a required Owner input during Periodic Contagem.
- Periodic Contagem valuation is based on Selling Price.
- Purchase economics and embedded profit are established separately,
  from purchase records — confirmed directly: `embeddedProfit =
  marketValue - investmentValue`, computed from purchase batches
  (`AppContext.tsx`), entirely independent of Contagem's own draft
  items.

**Cost Price is confirmed outside the Periodic Contagem owner-input
contract.** No new requirement for Cost Price in Contagem is created
by this document.

---

## 4. New decision — Unit is required for Contagem validation

**Blank Unit = invalid for Contagem validation.**

- A row with a blank Unit cannot be validated.
- The Owner cannot advance from that product while Unit is missing.
- The UI must clearly tell the Owner that Unit is required and what
  must be entered.
- This must be addressed during recording, not deferred to "Rever e
  Confirmar."
- The current permissive fallback — silently treating a blank Unit as
  `'un'` for tally purposes (`tallyStockCountRows`, confirmed this
  investigation) — is not acceptable behavior for successful
  validation going forward.

This decision does not invent additional unit rules, does not change
Unit Relationship semantics, and does not require any unit string to
belong to a new enum.

---

## 5. New decision — Selling Price is required and must be positive

**A counted product cannot be successfully validated without a
positive Selling Price.**

Explicitly, distinctly:

- blank Selling Price = invalid;
- Selling Price = 0 = invalid;
- negative Selling Price = invalid;
- non-numeric Selling Price = invalid;
- positive numeric Selling Price = valid.

The Owner cannot advance from a product while Selling Price is
missing, zero, or invalid. The UI must clearly explain what is wrong
and what correction is required, during recording, not deferred to
"Rever e Confirmar." Explicit zero is not reinterpreted as a
legitimate selling value for Periodic Contagem under this decision.

---

## 6. Live-total principle

- The live total is based on counted quantity and Selling Price.
- A correctly recorded product must participate in the live total.
- An unresolved persistence problem must never become a silent
  disappearance from the total.
- The system must not silently remove an entered product from the
  live total merely because persistence is temporarily unresolved —
  unresolved persistence instead blocks unsafe progression until
  resolved, per the accepted PA-08/persistence decisions (§8, below).
- The live total must never silently substitute an invalid or missing
  Selling Price with zero and allow the Owner to proceed as though the
  product were correctly counted.
- The live total must never silently substitute a missing Unit and
  allow the Owner to proceed as though the product were correctly
  recorded.

No behavior described in this section is implemented by this
document.

---

## 7. Cost Price / embedded profit — economic separation, restated

```
Periodic Contagem:
    quantity × selling price = selling-value-based stock valuation

Purchase recording:
    purchase cost + selling/market value
    → embedded profit = market value − investment value
```

Embedded Profit belongs to purchase economics and the Business Worth
calculation. It does not require asking the Owner for Cost Price
during Periodic Contagem. The Business Worth Engine and its formulas
are not modified, reopened, or reinterpreted by this document.

---

## 8. Preserved — the previously accepted persistence decisions (A/B/C)

Recorded here for completeness; not altered by §4–§7 above, which
govern user-input validation and the live total's own display
contract, a distinct concern from persistence safety.

**Decision A — Validation + Persistence Before Progression.** A
product cannot safely progress merely because local validation says it
is valid. Its persistence state must also be safe to permit
progression.

**Decision B — Persistence Integrity Before Final Confirmation.**
Finalization must not allow an unresolved persistence state to be
included as though safely recorded.

**Decision C — Proactive Recovery Evidence on Resume (Option 1).**
Recovery evidence requiring attention is surfaced immediately upon
draft resume, not deferred until finalization is attempted.

**Preserved SAVE_UNKNOWN investigation outcome**, unaltered by this
document:

- Save-unknown means the outcome is genuinely uncertain — not
  equivalent to "the write failed." The underlying write may have
  actually succeeded (confirmed by direct trace of the readback
  mechanism, `AppContext.tsx`).
- The existing recovery snapshot/reconciliation machinery is already
  capable of distinguishing "never landed" from "landed, acknowledgement
  lost."
- The live Firestore listener must not be treated as authoritative
  confirmation merely because an `onSnapshot` update arrived — it does
  not check `hasPendingWrites`, and a future implementation connecting
  it to reconciliation must preserve the existing revision/content
  safety semantics already governing the save path.
- No implementation of this connection is authorized by this document.

---

## 9. Explicit non-decisions — not decided or authorized by this document

- Implementation details of any kind.
- Exact UI copy or component changes.
- Firestore rule changes.
- Save-unknown implementation, including the listener-reconciliation
  connection investigated but not authorized.
- Live-total code changes.
- Any new aggregate persistence counter or manifest architecture.
- Cost-price collection during Contagem (remains excluded, §3).
- Changes to purchase-entry economics.
- Changes to Business Worth Engine formulas.
- Changes to product identity, stable row identity, migration, or
  tombstones.
- Changes to PA-08 state definitions beyond what Decisions A/B/C
  already accepted.

These remain Rule 8 / Implementation Authorization matters, gated
separately from this record.

---

## 10. Numbering

Re-verified immediately before filing: the parent specification's
highest in-document section remains **§46**; §47 is claimed
(signed, not yet merged) by
`new-product-first-creation-selling-configuration-amendment.md`; no
other amendment claims §48. **§48 is the next collision-free slot**,
proposed here, not finalized — authoritative only once formally
merged into the tracked parent specification. This draft is filed as a
standalone file, consistent with this repository's existing practice
for several other specification amendments.

---

## 11. Next gates

Implementation of §4–§8 requires its own Rule 8 Assessment and signed
Implementation Authorization, addressing at minimum: the exact
validation-error UI copy for Unit and Selling Price; where in the
progression/finalization code path each check is enforced; and the
live-total/persistence-state connection points already investigated
but not yet authorized for implementation.
