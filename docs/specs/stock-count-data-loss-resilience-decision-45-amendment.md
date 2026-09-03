Specification Amendment — Decision Recorded

# Decision 45 — Resolution of Decision 44 Refinement's 44-S-B and 44-S-E Findings
## (Amendment to `stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION — NOT
IMPLEMENTATION AUTHORIZATION.**

This document records the Product Architect's resolution of two of the
open decisions the accepted Decision 44 Refinement (Single Active
Editor + Live Read-Only Viewers) left explicitly unresolved: **44-S-B
(Editor Authorization)** and **44-S-E (Offline Active Editor)**. It does
not itself amend the refinement's other open items (44-S-A, 44-S-C,
44-S-D, 44-S-F, 44-S-G, 44-S-H), does not select a technical mechanism
for anything, and does not constitute an Implementation Plan or an
Implementation Authorization — all three remain separate, subsequent
gates.

**Governing chain:** [`stock-count-data-loss-resilience-decision-44-amendment.md`](./stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, requirements only, 3 Sept 2026) →
[Decision 44 Refinement — Single Active Editor + Live Read-Only Viewers](./stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md)
(✅ Accepted, requirements only, 3 Sept 2026) →
[Product Architect Acceptance of the Refinement](../engineering/periodic-contagem-decision-44-refinement-single-editor-viewers-product-architect-acceptance.md) →
[Rule 8 Reassessment — Part III (corrected)](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(verdict READY AFTER DECISIONS; identified 44-S-B, 44-S-D, 44-S-E,
44-S-F, 44-D, 44-F as the minimum blocking decision set) →
**this amendment ("Decision 45"), now accepted**.

**Repository baseline:** `main = origin/main`, unchanged. No application
code, `firestore.rules`, schema, or test implementing any part of
Decision 44, its refinement, or this Decision 45 exists anywhere in the
repository at this baseline.

**Numbering:** the parent chain's own `Decision N` sequence has Decision
44 (and its refinement, not separately numbered) as its highest
accepted decision. A repository-wide search confirms no file references
a "Decision 45" or higher prior to this document. This is recorded as
**Decision 45**, the next collision-free number in that same sequence,
following the same numbering discipline Decision 42 established when it
resolved specific open Rule 8 findings from Decision 41.

**Source:** the Rule 8 Reassessment (Part III, corrected) for the
Decision 44 Refinement, which identified 44-S-B and 44-S-E as part of
the minimum blocking decision set and stated precisely, without
inventing a resolution itself, what each open question was. This
document answers those two questions and no others.

---

## 1. Decision 45 Purpose

To resolve two of the open decisions the accepted Decision 44 Refinement
left unresolved — **44-S-B (Editor Authorization)** and **44-S-E
(Offline Active Editor)** — so that the Rule 8 assessment's blocking
decision list can be reduced accordingly. This Decision does not
authorize implementation of anything, does not reopen Decision 44 or
its Refinement's other provisions, and does not resolve 44-S-A, 44-S-C,
44-S-D, 44-S-F, 44-S-G, or 44-S-H, all of which remain exactly as the
Refinement and the Rule 8 Reassessment already left them.

---

## 2. Decision 45-B — Editor Authorization (resolves 44-S-B)

> **The Owner/Admin has exclusive authority to determine who may be the
> Active Editor for a Periodic Contagem.**

**Requirements, as accepted:**

1. The Owner/Admin explicitly assigns the Active Editor.
2. Only the assigned Active Editor may edit the active Periodic
   Contagem.
3. Other authorized users are Live Read-Only Viewers.
4. A user must not become Active Editor merely by opening the Contagem.
5. A second session/device must not automatically obtain Editor
   authority.
6. Editor authority must be business-scoped and must not cross
   tenant/business boundaries.
7. **The technical mechanism for enforcing this authority is NOT
   selected by this decision** and must be determined during the
   implementation planning/design stage.
8. This decision applies to Periodic Contagem only. Initial Stock Count
   remains separate (unchanged from Decision 44-S-H / Decision 44 §2,
   §25).

**What this resolves, precisely:** the governance-level question of
*who may decide who edits* — answered: the Owner/Admin, exclusively,
by explicit assignment, never by mere access or by a second session's
own initiative. This closes 44-S-B as a Product Architect decision.

**What this does not resolve:** *how* an assignment is technically
represented, checked, or enforced (schema, rules, or a server gate) —
explicitly deferred to implementation planning/design, per requirement
7. This distinction is load-bearing for how the Rule 8 assessment is
updated (§4 below) — the governance decision is closed; the technical
design question it feeds into (44-S-D) is not.

---

## 3. Decision 45-E — Offline Active Editor (resolves 44-S-E)

> **There is NO automatic Editor takeover when the Active Editor goes
> offline.**

**Requirements, as accepted:**

1. If the Active Editor becomes offline/unreachable, their editing
   authority does not automatically transfer to another user.
2. The Owner/Admin explicitly decides whether another authorized user
   should become the new Active Editor.
3. Until the Owner/Admin makes that decision, other users remain
   Viewers.
4. If the Owner/Admin themselves are the Active Editor and go offline,
   the Periodic Contagem editing process stops rather than
   automatically transferring authority.
5. No timeout-based, presence-based, or automatic takeover behavior is
   authorized by this decision.
6. The system must prevent an offline former Editor from silently
   regaining authority merely because their device reconnects.
7. **The technical mechanism for representing offline state, authority,
   and reassignment is NOT selected by this decision.**

**What this resolves, precisely:** the governance-level question of
*whether* takeover happens automatically — answered: never; every
transfer of Editor authority, including recovering from an
unreachable/offline Editor, requires an explicit Owner/Admin decision.
This closes 44-S-E as a Product Architect decision.

**What this does not resolve:** *how* offline/unreachable state is
detected or represented, *how* reassignment is technically carried out,
and *how* requirement 6 (preventing silent reacquisition on reconnect)
is technically enforced — all explicitly deferred, per requirement 7.

**Interaction with 44-S-D and 44-S-F, noted but not resolved here:**
this decision substantially narrows the governance shape of both
44-S-D (acquisition/release/takeover model — now: acquisition and
every reassignment are always explicit Owner/Admin actions, never
automatic) and 44-S-F (former Editor reconnection — now: a
reconnecting former Editor must never silently regain authority). It
does **not** resolve either — both still require a technical design
decision (the mechanism enforcing "explicit Owner/Admin action" and
"never silently regain," respectively) before implementation planning
can proceed on them. This is stated here explicitly so the Rule 8
update (§4) does not overclaim.

---

## 4. Effect on the Rule 8 Reassessment's Blocking Decision List

Per the Rule 8 Reassessment (Part III, corrected), the minimum blocking
decision set was: 44-S-B, 44-S-D, 44-S-E, 44-S-F, 44-D, 44-F.

**After this Decision 45:**

- **44-S-B — RESOLVED** (governance decision made; technical mechanism
  deferred to design, per §2 requirement 7).
- **44-S-E — RESOLVED** (governance decision made; technical mechanism
  deferred to design, per §3 requirement 7).
- **44-S-D — remains open**, narrowed in governance shape by §3's
  closing note, but not resolved — the technical design brief for
  "how acquisition/reassignment is enforced" is still undecided.
- **44-S-F — remains open**, narrowed in governance shape by §3's
  closing note, but not resolved — the technical mechanism preventing
  silent reacquisition on reconnect is still undecided.
- **44-D (cross-device finalization guard) and 44-F (shared-device
  cache isolation) — unaffected, remain fully open**, exactly as the
  Rule 8 Reassessment already established; both are orthogonal to
  Editor authorization and offline-takeover policy.

---

## 5. Explicit Non-Goals

Decision 45 does not authorize:

- Selecting or implementing any technical mechanism for authority
  assignment, offline detection, reassignment, or reconnect protection.
- Resolving 44-S-A, 44-S-C, 44-S-D, 44-S-F, 44-S-G, or 44-S-H.
- Any change to `firestore.rules`, application code, schemas, or tests.
- Any Implementation Plan or Implementation Authorization.
- Any change to Initial Stock Count's separate governance.

---

## 6. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED
**RULE 8:** Updated accordingly (see the Rule 8 Reassessment artifact's
own record of this decision)
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — 44-S-B (Editor Authorization) and 44-S-E
(Offline Active Editor) are resolved as governance requirements, exactly
as stated in §2 and §3 above. The technical mechanisms satisfying them
are explicitly NOT decided by this acceptance and remain open, folded
into the still-open 44-S-D/44-S-F design questions.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-03

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as requirements-level governance decisions
only. Implementation planning for the resulting technical design
(44-S-D, 44-S-F) remains a separate, subsequent, not-yet-authorized
gate, as do 44-D and 44-F, which this decision does not touch.
