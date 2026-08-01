Decision Record

# BDR-0004 — Customer Communication Architecture

**Status:** Approved (business decision — not a specification, not an
implementation authorization, not a module authorization).
**Type:** Business Decision Record. Unlike BDR-0001/0002/0003, this
record is **platform-wide**, not scoped to Module #19 — it establishes
an architectural principle intended to eventually apply across Trial,
Subscriptions, Business Worth, Inventory Health, Embedded Profit,
Capital Growth, AI Insights, Multi-Shop, and Staff & Roles alike.
**Location note:** Recorded in `docs/specs/`, **without** a module
number prefix — deliberately breaking from the `19-*` convention used
by BDR-0001/0002/0003, since this record is not Module #19-specific and
prefixing it `19-` would misrepresent its scope. Still no new top-level
documentation folder invented; this stays in `docs/specs/` alongside
the existing Decision Records, consistent with the general "Decision
Record sits in `docs/specs/`, not a separate folder" precedent. The
open question BDR-0001 originally flagged — whether a dedicated
top-level location (e.g. `docs/governance/` or `docs/business/`) should
eventually exist for BDR/Policy/CEG records generally — remains
undecided by this record; if anything, this record makes that question
more relevant, since it is the first BDR for which the `19-*`
convention genuinely does not fit.
**Depends on:** SABUSH BPT Product Vision (`docs/architecture/01-product-vision.md`),
Core Product Principles (`docs/architecture/02-core-product-principles.md`),
approved Architecture generally, BDR-0001 (Subscription Philosophy),
BDR-0002 (Value Realization Framework), BDR-0003 (Trial Experience
Framework), and the approved Module #19 operational policies
(POL-19-001 through POL-19-006).
**Followed by:** Not yet determined — this record explicitly does not
decide whether Customer Experience Guides become a module, a
cross-cutting capability, or another structure (see "Future
Architecture," below).

---

## Purpose

Establish the architectural principle that every major customer-facing
capability within SABUSH BPT should eventually have a corresponding
customer-friendly explanation derived from approved governance. The
purpose is to improve transparency, customer trust, product
understanding, and long-term consistency across the platform.

## Background

SABUSH BPT is a Business Worth Platform intended to help business
owners understand and increase the value of their businesses. This
objective extends beyond calculations and features — it also includes
helping owners understand how the platform itself behaves. Most
business software explains *how* to use features. SABUSH BPT should
also explain *why* important platform behaviors exist.

## Architectural Decision

**Every important business rule should eventually have an equivalent
customer explanation.** Customer-facing explanations are derived from
approved governance. They are never the source of truth.

## Governance Hierarchy

The following governance flow is approved:

```
Business Vision
        ↓
Architecture
        ↓
Business Decision Records (BDRs)
        ↓
Operational Policies (POL)
        ↓
Module Specifications
        ↓
Implementation
        ↓
Customer Experience Guides (CEGs)
```

Customer Experience Guides derive from the approved governance above
them.

## Customer Experience Guides

Customer Experience Guides are intended to explain approved platform
behavior using clear, business-focused language, designed for business
owners rather than engineers. Illustrative examples only — recording
these does not authorize future implementation of any of them:

- Trial experience
- Subscription lifecycle
- Business Worth
- Inventory Health
- Embedded Profit
- Capital Growth
- AI Insights
- Multi-Shop
- Staff & Roles

## Source of Truth

- BDRs remain the source of architectural intent.
- Operational Policies remain the source of business rules.
- Specifications remain the source of engineering requirements.
- Customer Experience Guides explain approved behavior but never
  replace governance documents.

## Product Principles

- Customers should understand why the platform behaves the way it
  does.
- Transparency builds trust.
- Business education is part of the product experience.
- Customer-facing explanations should use business language rather
  than engineering terminology.

## Future Architecture

The Customer Communication Architecture is a future architectural
capability. This Business Decision Record intentionally does not
determine whether it will eventually become a dedicated module, a
cross-cutting platform capability, or another architectural structure.
That decision remains future governance work.

## Scope Exclusions

This record explicitly does **not** define:

- Help Centre implementation.
- Documentation system.
- Customer portal.
- AI implementation.
- Notification content.
- Email templates.
- UI copy.
- Onboarding flows.
- Technical architecture.
- Runtime behavior.

These remain future design and specification work.

## Strategic Outcome

SABUSH BPT seeks to become a platform that not only helps owners
understand their businesses, but also helps them understand the
platform itself. The long-term objective is to create consistency
between governance, implementation, and customer communication.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not authorize, create, or reference "Module #21" or
  any new numbered module. Customer Experience Guides are explicitly
  left undetermined as to whether they become a module at all.
- This record does not modify `docs/specs/19-subscriptions.md`, any
  other Module specification, or Module #18/#19 implementation
  authorization. Build order (`#19 → #20 → #18`, per
  `docs/specs/README.md`) is unaffected and not reopened.
- **Relationship to the previously recorded governance hierarchy:**
  the [Governance Decision — BDR Phase Completion & Policy Document
  Framework](./19-governance-bdr-policy-framework.md) recorded
  `Business Philosophy → BDR → Policy → Module Specifications → Rule 8
  Assessment → Implementation`. This record's hierarchy — `Business
  Vision → Architecture → BDR → POL → Specifications → Implementation
  → CEGs` — is consistent with, and extends, that one: it makes
  Architecture explicit as the layer between Business Vision and BDRs
  (already true in practice, since BDR-0001/0002/0003 all cite
  Architecture sections), and appends Customer Experience Guides as a
  new layer *downstream of* Implementation. It does not restate Rule 8
  explicitly, but does not remove or contradict it either — Rule 8
  remains the governing assessment step between Specifications and
  Implementation per the earlier record, unchanged here. Flagged for
  transparency rather than silently treating the two hierarchy
  diagrams as identical.
- `docs/specs/README.md` does not yet reference this record, any prior
  BDR, the governance framework record, or any Policy — same
  cross-reference gap already flagged by every prior record in this
  series, left unaddressed here by design (not part of this task's
  scope).

**Lifecycle:** Designed → **Approved** (business decision only). Not
Implemented, Executed, or Analyzed — no engineering work, module
authorization, or specification work is authorized by this record.
