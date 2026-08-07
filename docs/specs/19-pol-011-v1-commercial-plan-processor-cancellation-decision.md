Decision Record

# POL-19-011 — V1 Commercial Plan, Payment Processor & Voluntary
Cancellation Decision

**Status:** Approved (operational/commercial policy — not a Business
Decision Record, not a specification, not an implementation
authorization).
**Type:** Policy document, per the category established in the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md). Resolves three of
the four "Release-Critical" commercial decisions gating Module #19
Phase 5 (Payment Reversal, the fourth, is recorded separately in
[POL-19-010](./19-pol-010-payment-reversal-policy.md)).
**Sequencing note:** Recorded as POL-19-011, immediately following
POL-19-010 in the same session. Does not affect POL-19-009 (reserved,
"Early Renewal During Trial," unassigned as a file) or POL-19-012
(recommended-but-unassigned, Business-Lifecycle/Subscription-Status
question). See the [Governance Decision — BDR Phase Completion &
Policy Document Framework](./19-governance-bdr-policy-framework.md)'s
Numbering Ledger addendum for the canonical mapping.
**Location note:** Recorded in `docs/specs/`, module-prefixed (`19-`),
following the same `19-pol-NNN-*.md` convention established by the
prior Module #19 policy documents.
**Depends on:** BDR-0001 (Subscription Philosophy), BDR-0002 (Value
Realization Framework), POL-19-005 (Subscription State Model — six
approved states, unchanged by this record), POL-19-006 (Subscription
Conversion Policy — the business meaning of entering Active Subscription
this plan/price now attaches a real commercial figure to), Architecture
§4.12 (Payments and Subscriptions Integration — system-level webhook
boundary), Architecture §9.4/§6.7 (SuperAdmin Subscriptions & Billing
override capability, the mechanism Section 3 below relies on).
**Followed by:** A dependency-specific Rule 8 Assessment for the
minimum V1 payment path (Module #19 Phase 3 + Phase 5 slices), produced
separately from this record. This record unblocks that assessment; it
does not itself authorize implementation.

---

## 1. V1 Commercial Plan

- **One paid plan for V1. No tiers.**
- **Billing cadence:** Monthly.
- **Scope:** Single business per subscription — consistent with the
  already-Accepted Business-level subscription binding
  ([Ownership Resolution](./19-subscription-ownership-resolution.md)).
- **Price:** 750 MZN / month.
- Plan *name*, and any future tier expansion beyond this single V1
  plan, remain out of scope. This record resolves
  [`19-subscriptions.md`](./19-subscriptions.md)'s "Explicitly Left
  Open" items 1 (tier structure — resolved: none, single plan) and 2
  (pricing — resolved: 750 MZN/month) for V1 only; it does not resolve
  or foreclose a future multi-tier decision.

## 2. Payment Processor Selection

- **PaySuite is selected as the V1 payment processor.**
- This record establishes the **vendor decision only.** It does **not**
  define: endpoint URLs, webhook signature-verification mechanics,
  event/payload names or structure, recurring-billing behavior, or
  retry/idempotency handling. Those remain explicitly unresolved and
  **must be verified directly against PaySuite's own technical
  documentation before any processor-specific code is written** — that
  verification is Phase 5 implementation-planning work, not satisfied
  or shortcut by this record.
- Resolves [`19-subscriptions.md`](./19-subscriptions.md)'s "Explicitly
  Left Open" item 3 (vendor selection) for V1. Consistent with
  Architecture §4.12's boundary (`Payment Processor → Webhook →
  Subscription State Update`; no payment instrument is ever stored by
  Sabush BPT itself) and with §13.5's regional requirement note
  (M-Pesa/e-Mola support) — those capability requirements were already
  clear before this record; only the vendor identity was open.

## 3. Voluntary Cancellation — V1 Deferral

- **Voluntary, customer-facing cancellation is deferred from V1.** No
  customer-facing cancellation UI, no new customer-facing cancellation
  flow, and **no new subscription state** — the six approved states in
  POL-19-005 are unchanged; no `canceled` state is introduced.
- **Handled operationally.** Support/SuperAdmin uses the existing
  subscription override capability already granted by Architecture
  §9.4/§6.7: change a subscription's plan/status directly, bypassing
  the normal payment-processor webhook path, for support/billing-
  dispute resolution. Every such override already requires a platform
  Audit Log entry in the same server-side transaction, per §9.4/§9.6 —
  no new audit mechanism is required for this decision.
- This decision is **fully settled**; no open items remain within it.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not draft, invent, or verify any PaySuite-specific
  technical mechanics. Section 2's boundary is deliberate — recording
  the vendor decision is not blocked on documenting unverified API
  details, but no implementation may proceed against PaySuite without
  that verification happening first, separately.
- This record resolves `19-subscriptions.md`'s Explicitly Left Open
  items 1, 2, and 3 for V1 scope specifically. It does **not** resolve
  item 4 (technical activation trigger — already resolved separately
  during Phase 2 implementation, per
  [`19-milestone-review-phases-1-2.md`](../engineering/19-milestone-review-phases-1-2.md)),
  item 5 (exact enumerated restricted-operations list), item 6 (legacy
  migration mechanics), or item 7 (Business-Lifecycle/Subscription-
  Status interaction — POL-19-012 candidate). All four remain open,
  unaffected by this record.
- This record does not edit `19-subscriptions.md` itself. That
  document's own "Explicitly Left Open" section (items 1–3) is now
  superseded in substance by this record but not edited in place —
  consistent with how POL-19-004 and POL-19-008 handled the same kind
  of drift against the base specification. Flagged here rather than
  silently left inconsistent; updating `19-subscriptions.md` directly
  remains a separate, explicit editing task if wanted.
- Per `19-subscriptions-implementation-plan.md` §13, Module #19 Phase 5
  (Commercial Integration) was **"blocked until vendor selection,
  pricing, and plan catalogue are decided."** This record removes that
  blocker for V1 scope. It does **not** itself authorize Phase 5
  implementation — a separate, explicit Rule 8 Assessment and
  authorization remain required, per Rule 8 and per CLAUDE.md's
  pipeline.
- Build order (`#19 → #20 → #18`, per `docs/specs/README.md`) is
  unaffected and not reopened.

**Lifecycle:** Designed → **Approved** (operational/commercial policy
only). Not Implemented, Executed, or Analyzed — no engineering work is
authorized by this record.
