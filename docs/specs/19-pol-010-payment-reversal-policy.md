Decision Record

> **Superseded in part — see
> [POL-19-013](./19-pol-013-payment-reversal-grace-period-reset-amendment.md).**
> Edge Case A below (recalculating grace period on each repeat
> reversal) has been replaced by a simpler rule: a reversal arriving
> while already in Grace Period now has no additional effect — the
> subscription remains `grace_period` on its original, unchanged
> 7-day window. Edge Case B below is otherwise confirmed as the
> settled V1 rule by that same record. Everything else in this
> document — the Core Transition, Historical Data Preservation, and
> Scope Exclusions — remains unchanged and in effect. This document's
> own text below is preserved as the original historical record and is
> **not** edited to reflect the amendment; read POL-19-013 for the
> current rule.

# POL-19-010 — Payment Reversal Policy

**Status:** Approved (operational policy — not a Business Decision
Record, not a specification, not an implementation authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Operationalizes
approved BDRs and builds on POL-19-004/005/006/007; does not itself
define payment-processor mechanics, webhook payload shape, or retry/
idempotency handling.
**Sequencing note:** This is the sixth Policy document recorded, but
carries the number POL-19-010. **POL-19-009 was previously assigned,
conversationally, to "Early Renewal During Trial"** in a prior session
— confirmed, at the time this record was produced, to not exist as a
file anywhere in the repository. This record does not reuse, renumber,
or draft POL-19-009; that identifier remains reserved for its own topic
and out of scope here. POL-19-010 is the correct next sequential
identifier once POL-19-009's reservation is respected, per explicit
Product Architect instruction. See the [Governance Decision — BDR Phase
Completion & Policy Document Framework](./19-governance-bdr-policy-framework.md)'s
Numbering Ledger addendum for the full, canonical mapping.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by the
prior five Module #19 policy documents.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), POL-19-004 (Grace Period Policy — this policy
governs re-entry into the Grace Period state POL-19-004 defined, and
reuses its 7-day duration unchanged), POL-19-005 (Subscription State
Model), POL-19-007 (Subscription Recovery Policy — informs the boundary
between reversal handling defined here and recovery from Subscription
Expired, which remains POL-19-007's exclusive domain).
**Followed by:** None currently planned as a direct successor.
POL-19-009 (Early Renewal During Trial) remains a separate, future
record whenever the Product Architect returns to it. POL-19-012 remains
recommended-but-unassigned for the Business-Lifecycle/Subscription-
Status interaction question (`19-subscriptions.md`'s State Mapping
cross-reference, Explicitly Left Open item 7) — unaffected by this
record.

---

## Purpose

Define the business meaning and state-transition behavior of a Payment
Reversal event within Sabush BPT's subscription lifecycle.

## Guiding Principle

**A payment reversal is a commercial-relationship event. It must never
rewrite, delete, or recalculate historical Business Worth data.** This
is a direct application of the Business Lifecycle / Subscription
Lifecycle Separation Principle already established in POL-19-005.

## Core Transition

An Active Subscription that experiences a Payment Reversal event
transitions to **Grace Period**. This is not a new state — it is the
same Grace Period state POL-19-005 named and POL-19-004 defined,
reused for this entry path in addition to the interruption path
POL-19-004 already describes. The approved Grace Period duration
remains seven (7) consecutive calendar days, unchanged by this record.

## Historical Data Preservation

Business Worth history, inventory history, and all previously recorded
operational data are never rewritten, deleted, or recalculated as a
result of a reversal event. A reversal event has no retroactive effect
on any prior period.

## Edge Case A — Reversal Arriving During an Existing Grace Period

If a new reversal event arrives while the subscription is already in
Grace Period, the Grace Period end date is **recalculated as (new
reversal event timestamp + 7 days), replacing the previous end date in
full.** This is a fresh 7-day window measured from the most recent
reversal event — not additive, not stacked on top of whatever time
remained. A business that experiences repeated reversals while already
in Grace Period always has exactly 7 full days from its latest reversal
event, never more, never a partial/stale remainder from an earlier one.

## Edge Case B — Reversal Arriving After Subscription Expired

**Explicitly deferred for V1.** If a reversal event arrives after the
subscription has already reached Subscription Expired, this policy
defines no automatic state effect. The event may be logged for
record-keeping/audit purposes only; it does not reopen Grace Period and
does not otherwise alter subscription state. **Recovery (POL-19-007)
remains the sole approved pathway back to Active Subscription** for a
subscription that has reached Expired. This scenario remains open for a
dedicated future decision, should the Product Architect choose to
revisit it — silence on this point in a future session should not be
read as a decision either way; it stays explicitly open until ruled on.

## Scope Exclusions

This policy explicitly does **not** define:

- Payment-processor-specific webhook mechanics (endpoint shape, event
  names, payload structure, signature verification).
- Retry or idempotency handling for duplicate/out-of-order reversal
  events.
- Any technical implementation of "logged" in Edge Case B (audit
  collection, schema, retention).
- Renewal or recovery mechanics *out of* Grace Period — that remains
  POL-19-004 (successful renewal) and POL-19-007 (Recovery) territory,
  unchanged by this record.

Each remains Module #19 Phase 5 (Commercial Integration)
implementation-planning work, per
[`19-subscriptions-implementation-plan.md`](../engineering/19-subscriptions-implementation-plan.md)
§13, not fixed by this policy.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not introduce any payment-processor-specific
  technical detail. Vendor selection is recorded separately in
  [POL-19-011](./19-pol-011-v1-commercial-plan-processor-cancellation-decision.md); this
  record's Edge Cases A and B are business rules only, not tied to any
  particular processor's event model.
- This record resolves both edge cases the prior session left
  explicitly open (reversal-during-grace-period, reversal-after-expiry)
  by direct, explicit Product Architect decision — not by inference or
  default. Edge Case A is fully resolved (fresh 7-day window, replacing
  the prior end date). Edge Case B is explicitly deferred, not silently
  dropped — it remains open for a future record.
- This record does not modify `docs/specs/19-subscriptions.md`,
  POL-19-004, POL-19-005, or POL-19-007. Build order (`#19 → #20 →
  #18`, per `docs/specs/README.md`) is unaffected and not reopened.
- Does not authorize Module #19 Phase 3 (Subscription Lifecycle)
  implementation in full — only supplies the business rule a future,
  separately-authorized, dependency-specific Rule 8 Assessment may
  scope implementation against for the Active → Reversal → Grace Period
  slice specifically.

**Lifecycle:** Designed → **Approved** (operational policy only). Not
Implemented, Executed, or Analyzed — no engineering work is authorized
by this record.
