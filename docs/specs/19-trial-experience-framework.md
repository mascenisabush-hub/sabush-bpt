Decision Record

# BDR-0003 — Trial Experience Framework

**Status:** Approved (business decision — not a specification, not an
implementation authorization).
**Type:** Business Decision Record. Third in the Module #19 business
philosophy chain, following the same location and documentation
pattern as [BDR-0001 — Subscription Philosophy](./19-subscription-philosophy.md)
and [BDR-0002 — Value Realization Framework](./19-value-realization-framework.md).
**Operationalizes:** BDR-0001 (why the trial exists) and BDR-0002 (what
evidence proves its purpose was achieved). This record describes how
the owner experiences that journey — it does not add new philosophy of
its own, and does not yet turn it into operational policy.
**Depends on:** [BDR-0001](./19-subscription-philosophy.md),
[BDR-0002](./19-value-realization-framework.md).
**Followed by:** Trial Operational Policies (not yet produced) — Trial
Activation, Trial Duration, Trial Expiry, Grace Period, Subscription
State Model, Conversion, Recovery, Pricing, Payment providers,
Notification schedules. This record completes the strategic foundation
those policies will be derived from; it does not derive any of them
itself.
**Location note:** Same reasoning as BDR-0001/BDR-0002 — filed in
`docs/specs/`, module-prefixed, alongside the existing Decision Record
precedent, rather than a new top-level folder.

---

## Purpose

Define the Trial Experience Framework for Sabush BPT — how a business
owner should progress from first operational use of the platform to
the point where subscribing becomes the natural continuation of their
business journey. This framework operationalizes BDR-0001 (Subscription
Philosophy) and BDR-0002 (Value Realization Framework).

## Purpose of the Trial

The trial exists to guide every business owner through three stages:

1. **Discovery**
2. **Realization**
3. **Commitment**

The trial succeeds only when the owner reaches meaningful business
understanding and chooses to continue because the platform has
demonstrated value.

## Trial Principles

- Encourage genuine business operation.
- Reward consistent engagement.
- Reveal progressively deeper business understanding.
- Never rely on artificial urgency.
- Prepare the owner for long-term partnership rather than short-term
  evaluation.

## Trial Entry

The trial begins when a business becomes operational through genuine
business activity rather than simple account registration. The
platform should distinguish account creation from meaningful business
participation.

## Guided Journey

The platform should progressively guide owners through the approved
Value Journey (BDR-0002). The experience should teach owners about
their business rather than teach them software features.

## Progressive Value

Five approved value layers, each building naturally on the previous
one:

1. **Visibility**
2. **Movement**
3. **Performance**
4. **Improvement**
5. **Business Worth**

## Customer Responsibility

The owner remains responsible for maintaining accurate business
records. The platform should never fabricate confidence where
sufficient business data does not exist.

## Platform Responsibility

The platform should:

- Explain insights clearly.
- Highlight opportunities.
- Highlight risks.
- Celebrate meaningful milestones.
- Build confidence without overwhelming the owner.

## Trial Conclusion

The trial should conclude only after the owner has had a fair
opportunity to experience meaningful business value. The conclusion
should feel like the continuation of a successful partnership rather
than the termination of software access.

## Subscription Invitation

The subscription invitation should arise from demonstrated value. The
platform should communicate continuation of progress rather than
expiration of free access.

## Trial Completion Outcomes

Three approved outcomes:

**Outcome A — Value Realized.** The owner has experienced meaningful
business understanding and is ready to subscribe.

**Outcome B — Insufficient Business Activity.** The owner has not
generated enough operational data to reach meaningful insights.

**Outcome C — Value Not Yet Demonstrated.** The owner actively used the
platform but did not reach sufficient confidence in its value.
**Outcome C represents an opportunity for future product improvement,
not an assumption of customer unwillingness to subscribe.**

## Product Learning

Every completed trial should help Sabush BPT learn:

- Which experiences accelerate Value Realization.
- Where customers disengage.
- Which insights create confidence.
- Which barriers prevent successful progression through the Value
  Journey.

## Scope Exclusions

This Business Decision Record does **not** define:

- Trial Activation Policy
- Trial Duration Policy
- Trial Expiry Policy
- Grace Period Policy
- Subscription State Model
- Conversion Policy
- Recovery Policy
- Pricing
- Payment providers
- Notification schedules

These remain future **Trial Operational Policies**, derived from
BDR-0001, BDR-0002, and this record together — not from any one alone,
and not inferred ahead of them being explicitly produced.

## Product Principle

The trial should feel like the beginning of a long-term business
partnership rather than software counting down toward payment.

## Strategic Outcome

Trial success should be evaluated by progression through the Value
Journey rather than elapsed time alone.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not derive any Trial Operational Policy — no
  activation trigger, duration, expiry mechanism, grace period, or
  conversion rule is defined or implied here. Trial Entry ("becomes
  operational through genuine business activity") describes a
  philosophy, not a technical trigger condition (e.g., it does not
  specify which write, event, or threshold constitutes "operational" —
  that remains for the operational policy work that follows this
  record).
- `docs/specs/19-subscriptions.md` is unmodified. Module #18 and Module
  #19 implementation authorization are unchanged. Build order
  (`#19 → #20 → #18`, per `docs/specs/README.md`) is unaffected and not
  reopened.
- Cross-references remain unaddressed by design, consistent with
  BDR-0001/BDR-0002: `docs/specs/README.md`'s Module #19 note and
  `19-subscriptions.md` itself still do not cite any of the three BDRs.
  Flagged again as a recommended future documentation-sync step, not
  executed here.

**Lifecycle:** Designed → **Approved** (business decision only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
