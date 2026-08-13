Decision Record

# POL-19-014 — Commercial Policy Amendment: V1 Subscription Price Change

**Status:** Approved (operational/commercial policy amendment — not a
Business Decision Record, not a specification, not an implementation
authorization).
**Type:** Policy amendment, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Amends
[POL-19-011](./19-pol-011-v1-commercial-plan-processor-cancellation-decision.md)
§1 "V1 Commercial Plan" only — does not reopen POL-19-011 §2 (Payment
Processor Selection) or §3 (Voluntary Cancellation — V1 Deferral),
both of which remain unchanged.
**Sequencing note:** Recorded as POL-19-014, the correct next
sequential identifier per the [Numbering
Ledger](./19-governance-bdr-policy-framework.md#numbering-ledger-addendum---post-planned-series-identifiers)
— POL-19-012 remains reserved for its own, unrelated topic and is
deliberately not reused here.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention every prior Module #19
policy document uses. Consistent with the precedent already set by
[POL-19-013](./19-pol-013-payment-reversal-grace-period-reset-amendment.md):
a policy amendment is recorded as its own new document rather than by
editing the original decision record in place, preserving POL-19-011
as an intact historical record of the original approved decision.
**Depends on:** [POL-19-011](./19-pol-011-v1-commercial-plan-processor-cancellation-decision.md)
(the record this amends).
**Followed by:** Nothing at this time.

---

## Why This Amendment Exists

A commercial decision was made to reduce the V1 monthly subscription
price. This is a pricing change only — not a reconsideration of the
subscription model, the trial philosophy, or any other business rule
established elsewhere in Module #19.

## Amendment — V1 Commercial Plan Price

**POL-19-011 §1's price line is replaced in full by the following:**

- **Price:** 699 MZN / month (previously 750 MZN / month, per
  POL-19-011, superseded by this amendment).

## Explicitly Unchanged

Everything else in POL-19-011 remains in force, unmodified by this
amendment:

- One paid plan for V1. No tiers.
- Billing cadence: Monthly.
- Scope: Single business per subscription.
- Payment processor selection (PaySuite).
- Voluntary cancellation deferral (handled operationally; no new
  subscription state).

This amendment also does not touch, and does not reopen:

- Trial activation (POL-19-001).
- Trial duration (POL-19-002).
- Trial expiry (POL-19-003).
- Grace period (POL-19-004).
- Subscription state model (POL-19-005).
- Conversion policy (POL-19-006).
- Recovery policy (POL-19-007).
- Notification policy (POL-19-008).
- Payment reversal policy (POL-19-010, as amended by POL-19-013).

No new plans, tiers, discounts, or promotional pricing are introduced
by this amendment.

## Implementation Note

Per POL-19-011's own dependency on the "Do not scatter these values
throughout the UI/code" instruction (Module #19 V1 Manual Payment
Bridge Implementation Authorization §9), the commercial price exists
in exactly one place in the codebase:
`src/data/subscriptionPlan.ts`'s `SUBSCRIPTION_PLAN_PRICE_MZN`
constant. Updating that single constant is sufficient to update the
commercial price everywhere it is displayed or recorded at runtime;
this amendment does not authorize or require any other implementation
change.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it. (The corresponding
  code change is recorded separately, in the same session, against
  `src/data/subscriptionPlan.ts` and `src/types.ts`'s documentation
  comment.)
- This record does not modify POL-19-011 in place. POL-19-011 remains
  an intact historical record of the original 750 MZN/month decision;
  this amendment is the current authoritative source for the V1
  commercial price going forward.
- This record does not derive or reopen Trial Activation, Trial
  Duration, Trial Expiry, Grace Period, Subscription State Model,
  Conversion, Recovery, Notification, or Payment Reversal policy —
  each is out of scope and unaffected.
- This record does not introduce a new plan, tier, discount,
  promotional price, annual plan, or freemium model.

**Lifecycle:** Designed → **Approved** (operational policy amendment
only). Not Implemented, Executed, or Analyzed by this record itself —
the corresponding code change is tracked separately.
