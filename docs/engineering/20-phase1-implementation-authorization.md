# Module #20 (Notifications) — Phase 1 (Foundations) Implementation Authorization

**Type:** Governance bridge document — the formal record that engineering
governance is complete and Phase 1 is authorized to begin. New artifact
type for this repository: no Module #19 precedent exists for a
standalone authorization document of this kind (Module #19's own Phase
1 proceeded directly from its Implementation Plan's embedded Rule 8
Assessment, §14–15 there, with no separate authorization record). This
document establishes that step explicitly for Module #20, per your
instruction, and is available as a template for future modules/phases
going forward.
**Status:** 🟡 **Proposed — awaiting Product Architect signature.** This
document is drafted by engineering (Claude, Lead Software Engineer) but,
consistent with every other governance artifact in this chain (spec
Acceptance, POL-20-001's Proposed→Approved transition, ADR-0002's
Approval), **authorization is a Product Architect act, not an
engineering one.** Drafting this record is not the same as signing it —
see "Signature," below. No runtime file will be touched on the basis of
this document alone, in its current status.
**Basis:** [`20-notifications.md`](../specs/20-notifications.md) (v1.1,
Accepted), [Specification Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md)
(Accepted), [POL-20-001](../specs/20-pol-001-notification-retention-policy.md)
(Approved), [Engineering Readiness Assessment](./20-notifications-implementation-readiness.md)
(Assessed), [ADR-0002](../adr/ADR-0002-platform-background-worker.md)
(Approved), [Implementation Plan](./20-notifications-implementation-plan.md)
(Planned), [Phase 1 Rule 8 Assessment](./20-phase1-foundations-rule8-assessment.md)
("Ready after minor preparation" — the preparation being the branch/merge
synchronization completed prior to this document; see that assessment's
§11).
**Repository state at drafting:** `main` HEAD `9c6daff8c8d6bd38399b5e7c641b4dec3fe1eea2`
— the full governance trail (spec, Amendment, POL-20-001, Readiness
Assessment, ADR-0002, Implementation Plan, Rule 8 Assessment) confirmed
present and synchronized as of this commit.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

The following chain is complete on `main` as of the commit above, per
direct verification (Phase 1 Rule 8 Assessment §1, itself re-verified
fresh, not by reference to an earlier conversation turn):

**Business Decision → Policy → Readiness → ADR → Implementation Plan →
Rule 8 → Authorization (this document) → Implementation → Close-out**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `20-notifications.md` v1.1 + embedded Decision Record | ✅ Accepted |
| Business Decision (amendment) | Specification Enhancement Amendment | ✅ Accepted |
| Policy | POL-20-001 (Notification Retention Policy) | ✅ Approved |
| Readiness | Engineering Readiness Assessment | ✅ Assessed |
| Architecture | ADR-0002 (Platform Background Worker) | ✅ Approved |
| Implementation Plan | `20-notifications-implementation-plan.md` | ✅ Planned |
| Rule 8 | `20-phase1-foundations-rule8-assessment.md` | ✅ Assessed — Ready after minor preparation (preparation now complete) |
| **Authorization** | **This document** | 🟡 Proposed, pending signature |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

## 2. What Is Authorized

**Only Phase 1 — Foundations**, exactly as scoped by the Implementation
Plan (§9) and assessed by the Phase 1 Rule 8 Assessment (§0, §3):

- Notification data model and TypeScript types (20.1)
- `NotificationContext` (read-only live listener)
- `notifications` Firestore collection, Security Rules, and composite
  indexes
- Delivery Channel Interface + `InAppChannel` (20.4)
- Basic server-side notification-write helper (unused by any producer
  in this phase)
- `Header.tsx` bell-dropdown integration and unread-count support

This authorization covers exactly the runtime files enumerated in the
Rule 8 Assessment §3/Deliverables §6: `src/types.ts`,
`src/context/NotificationContext.tsx` (new), a Delivery Channel
Interface file under `src/lib/` (new), `src/components/Header.tsx`,
`firestore.rules`, `firestore.indexes.json`, `server/index.ts`,
`tests/firestore-rules.test.ts`.

## 3. What Is Not Authorized

- **Phase 2 (Privileged-Server Creation Path)** — staff-action
  notification writes. Not authorized by this document.
- **Phase 3 (Background Worker Scheduled Triggers)** — Closing-overdue,
  Inventory-risk, Subscription-notification companion writes. Not
  authorized. ADR-0002's "extend, not introduce" resolution is not
  acted upon in Phase 1 regardless.
- **Phase 4 (Tenant User Experience beyond the Phase 1 dropdown wiring)**
  — any Notification Center, standalone history view, or presentation
  work beyond the bell dropdown itself. Not authorized.
- **Phase 5 (Payment Webhook Creation Path)** — not authorized, and
  separately blocked on Module #19's own Commercial Integration phase
  regardless.
- **Phase 6 (Future Delivery Channels)** — Email, WhatsApp, SMS, push.
  Not authorized, and outside V1 scope entirely per Decision Gate 3.
- **Any real notification document, of any category, ever being
  created.** Phase 1 produces a structurally real but empty system —
  no producer is authorized to write a live document in this phase.
- **Any of the five engineering-planning proposals from the
  Implementation Plan §7** (read/unread mechanism, dismiss mechanism,
  Archived representation, Delivery Channel Interface shape, immutability
  enforcement mechanism) being reopened as anything other than what's
  already documented there — this authorization adopts those proposals
  as Phase 1's working basis, not as a re-invitation to redesign them
  mid-implementation.

Each later phase requires its own separate authorization record,
following this same document's pattern, once its own Rule 8 Assessment
is complete.

## 4. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3, above,
and by the Rule 8 Assessment's own §0 scope boundary. If, during
Phase 1 implementation, engineering discovers that the approved scope
is insufficient, ambiguous, or requires a business-facing tradeoff not
already settled by the spec, its Amendment, POL-20-001, or ADR-0002 —
**that finding returns to Product Architecture, not to engineering
judgment.** This mirrors every prior instance in this project where an
engineering-facing document (Readiness Assessment, Rule 8 Assessments)
surfaced a genuine open question rather than resolving it unilaterally.
Any scope change, however small it appears from an engineering
perspective, requires a new or amended governance record before
implementation proceeds on the changed basis.

## 5. Signature

**This document is not yet in effect.** Per the same discipline this
project has used for every prior Accepted/Approved artifact — drafting
is engineering's work; acceptance is the Product Architect's — this
record moves from **Proposed** to **Authorized** only on your explicit
confirmation. A draft recommending authorization (however clearly
reasoned) is not itself the signature.

Once you confirm, this section will be updated to record: the explicit
authorization statement, the date, and this document's status changed
to **✅ Authorized**. Only at that point will Claude begin changing any
runtime file listed in §2.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `docs/specs/*`, `docs/architecture/*`, or
  `docs/adr/*` file. None were touched to produce it.
- This record does not modify any prior governance document in the
  chain (§1) — it sits downstream of all of them, authorizing based on
  their settled content, not amending it.
- This record does not pre-authorize Phase 2 or later — each requires
  its own Rule 8 Assessment and its own Authorization record, per §3.

**Lifecycle:** Designed → **Proposed**, pending Product Architect
signature. Not Implemented, not Executed — no engineering work is
authorized by this document in its current status.
