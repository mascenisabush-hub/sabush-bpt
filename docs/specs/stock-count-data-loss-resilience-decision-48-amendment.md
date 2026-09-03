# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 48 — Authority Model Governance Requirements (Resolves 44-S-D)

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY.** Resolves Decision 44-S-D at the
governance-requirement level. The technical mechanism satisfying these
requirements remains UNDECIDED. This acceptance is NOT Implementation
Authorization.
**Resolves:** Decision 44-S-D — Editing Authority Model, as left open by the [Decision 44 Refinement](./stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md) and reassessed under [Decision 46 — Dual Active Editor Authority](./stock-count-data-loss-resilience-decision-46-amendment.md) (✅ Accepted, 3 September 2026) and [Rule 8 Reassessment, Part IV](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md) (verdict READY AFTER DECISIONS)
**Builds on:** [Decision 47](./stock-count-data-loss-resilience-decision-47-amendment.md) (✅ Accepted, resolves 44-S-G's product-level conflict-handling requirement)
**Does not reopen:** Decisions 44, 45, 46, or 47 beyond what is explicitly stated below
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Accepted by:** SABUSHIMIKE MASCENI, 3 September 2026
**Implementation Authorization:** NOT GRANTED

---

# 1. Purpose

Decision 46 established **that** an unfinished Periodic Contagem may
have two legitimate Active Editors simultaneously (Owner/Admin + at
most one delegated Editor) and the governing rules for who may assign,
change, and lose that delegated role. It did not define **what the
system must be able to authoritatively distinguish** in order to
enforce those rules — i.e., what "authority" itself must formally mean
as a governed concept, independent of any technical mechanism.

This decision (proposed as **44-S-D**) closes that gap at the
governance-requirement level only. It answers *what must be true*, not
*how it is made true*.

---

# 2. Authority Ownership

### 2.1 Owner/Admin authority

An Owner/Admin's authority to edit the unfinished Periodic Contagem is
**inherent to their Owner/Admin role for the business** — it is not
assigned, not revocable by any other party, and does not depend on any
delegated-Editor state. It exists for as long as the account holds
Owner/Admin status for that business, per Decision 46 §1-A/§2-A.

### 2.2 Delegated Editor authority

A delegated Editor's authority to edit is **entirely derivative** — it
exists only for as long as, and only because, the Owner/Admin has
made and not since withdrawn an explicit assignment naming that
specific user as the current delegated Editor for that business's
unfinished Periodic Contagem. It has no independent basis; it cannot
be self-granted, inherited, or inferred from any other authorization a
user otherwise holds (e.g. Staff membership alone is necessary but not
sufficient — assignment is what makes it actual, per Decision 45 §2
requirement 1/4).

---

# 3. The Delegated Slot

1. At most one delegated Editor may be authoritative for a given
   business's unfinished Periodic Contagem at any moment — this is a
   **slot**, not a list; assigning a new delegated Editor replaces
   whoever currently occupies it, it does not add a second occupant.
2. Only the Owner/Admin may create, change, or clear this assignment
   (Decision 45 §2 requirement 1, restated, not reopened).
3. **For an assignment to be considered authoritative, it must be:**
   - **explicit** — never inferred from a user opening the Contagem,
     from Staff membership alone, or from any other action (Decision
     45 §2 requirement 3/4, restated);
   - **current** — the most recent assignment the Owner/Admin has made
     for that business's active, unfinished Periodic Contagem
     supersedes every prior one; there is never more than one
     "currently authoritative" assignment at a time;
   - **attributable** — it must be possible to identify, unambiguously,
     which specific user the assignment currently names, so that "is
     this session the currently-assigned delegated Editor" is always a
     well-defined question with exactly one correct answer at any given
     moment.
4. This decision does not require the assignment to be attributable to
   a specific *session* or *device* — only to a specific *user*. A user
   who is the currently-assigned delegated Editor may exercise that
   authority from any of their own authorized sessions/devices, exactly
   as the Owner/Admin's own authority is not device-bound (Decision 46
   §1-A already establishes this for Owner/Admin; this extends the same
   principle to the delegated slot for consistency, since Decision 46
   never suggested the two roles should differ on this point).

---

# 4. Concurrent Legitimate Authority

1. Owner/Admin and the current delegated Editor are **both fully
   legitimate editors simultaneously** — neither's authority is
   diminished, questioned, or rendered provisional merely because the
   other is also actively editing (Decision 46 §1-B/§7, restated).
2. Neither may be treated as "stale" or "conflicting" *solely* because
   the other holds authority at the same time — staleness is a property
   of a session's *own* revoked or superseded status (§5, §6 below),
   never a property of concurrent legitimate access by itself.
3. Both must be able to make legitimate live observations against the
   shared Contagem state — this restates, and does not reopen, Decision
   47's live-synchronization-as-primary-conflict-avoidance requirement.
4. This decision does not require the two roles to be *symmetric* in
   every respect (e.g., finalization authorization, per 44-S-C, may
   remain narrower than editing authorization) — "concurrent legitimate
   authority" here refers specifically to the authority to enter/modify
   quantities, not to every capability either role may or may not also
   hold.

---

# 5. Assignment Change (A → B)

When the Owner/Admin changes the delegated assignment from A to B, the
following governance state transition is required, as a single
logical event:

1. **A's delegated editing authority ends.** From the moment the
   reassignment is authoritative (§3.3), A is no longer the delegated
   Editor.
2. **A becomes a Viewer.** Not "no role" — A transitions directly into
   the Viewer state defined in §8, with everything that state implies.
3. **B becomes the delegated Editor**, per §2.2/§3.
4. **There is no valid intermediate state in which both A and B hold
   delegated Editor authority.** The transition is a replacement, not
   an overlap — restating Decision 46 §4's own "no period in which
   Editor A and Editor B both possess delegated-editor authority"
   requirement, not weakening it.
5. **A's previously persisted observations remain valid historical
   data.** Losing delegated authority is not retroactive — quantities A
   validly entered while A held authority are not invalidated,
   discarded, or treated differently from quantities entered by anyone
   else who validly held authority at the time of entry. This decision
   does not authorize purging, hiding, or discounting A's prior
   contributions merely because A is no longer the delegated Editor.
6. **A must not retain editing authority merely because an old session
   remains open or offline.** A session belonging to A that is still
   open, or that went offline before the reassignment and has not yet
   reconnected, does not preserve A's authority past the moment of
   reassignment — authority is a property of the current assignment
   state, never of a session's own belief about its standing (this is
   the governance basis for §6/§7 below, and is deliberately restated
   here because it is the single most consequential guarantee this
   decision establishes).

---

# 6. Stale Former Editor

1. **A former delegated Editor whose authority has been revoked must
   not be able to write to the Periodic Contagem, in any form, after
   that revocation.** This is an absolute governance requirement, not
   a best-effort one.
2. **This includes writes already queued locally or offline before the
   revocation occurred.** A write that was valid at the moment it was
   entered (while A still held authority) does not retroactively become
   invalid — but if it has not yet reached durable server persistence
   by the time authority is revoked, it must not be permitted to land
   afterward as though it still carried A's now-expired authority. The
   governance requirement is: **authority is evaluated at the moment a
   write is accepted as authoritative, not at the moment it was
   originally entered by the operator.**
3. This decision does **not** select the technical mechanism that
   enforces this (no transaction, precondition, rules check, or other
   implementation choice is made here) — it establishes only that such
   enforcement is a required governance property, to be satisfied by
   whatever mechanism the subsequent technical design stage selects.

---

# 7. Offline Behavior

1. **No automatic transfer of authority occurs because a session goes
   offline** — restating Decision 46 §5/§7 and Decision 45 §3 item 5,
   not reopening them.
2. **"Offline but still assigned" and "authority revoked while
   offline" are governed as two distinct, non-overlapping states:**
   - **Offline but still assigned:** the delegated Editor (or the
     Owner/Admin) is unreachable, but the Owner/Admin has not made any
     new assignment. The offline party **remains** authoritative for
     their role exactly as if they were online — their eventual
     reconnection is not a re-acquisition of authority, because they
     never lost it.
   - **Authority revoked while offline:** the Owner/Admin has made a
     new assignment (or, for the Owner/Admin's own authority — which
     per §2.1 cannot be revoked by anyone — this state does not apply
     to the Owner/Admin role at all) while the previously-assigned
     delegated Editor was offline. That former delegated Editor's
     reconnection is **not** a re-acquisition of authority — §6 governs
     this case, in full, regardless of whether the former Editor was
     online or offline at the moment of revocation.
3. **The Owner/Admin's own offline state never triggers any authority
   question at all** for the Owner/Admin's own role, per §2.1 — their
   authority is not assignable, and therefore not revocable, and
   therefore has nothing for "offline" to affect. Decision 46 §5/§6
   already establishes that the delegated Editor retains their own
   authority, unaffected, while the Owner/Admin is offline; this
   decision does not alter that.

---

# 8. Authority Changes vs. Legitimate Edits — the Governing Distinction

This decision requires these two cases to be **treated as categorically
different**, never conflated, at every layer of eventual design:

- **Case 1 — Two legitimate Editors making simultaneous
  observations.** Both Owner/Admin and the current delegated Editor
  hold valid, current authority. Neither is "wrong" to be editing.
  Governed by §4 above and by Decision 47 (live-sync-first,
  detect-and-preserve for genuine collisions — not reopened here).
- **Case 2 — A former Editor attempting to write after losing
  authority.** The writer's authority is no longer current, regardless
  of whether the writer's own session is aware of that fact. Governed
  by §5/§6 above. This is not a "conflict" in Decision 47's sense — it
  is an **unauthorized write attempt** by a party whose authority has
  expired, and must not be handled by the same mechanism (or the same
  UI framing) as a genuine two-legitimate-editor collision. Presenting
  Case 2 to an operator as if it were an ordinary Case 1 conflict would
  misrepresent what happened and is not authorized by this decision.

---

# 9. Viewer Boundary

1. **A Viewer has no editing authority** — not "reduced" authority, not
   "read-mostly" authority, none at all, for quantity data.
2. **Viewer status must be an authoritative governance state, not
   merely a UI presentation.** A user or session correctly determined
   to be a Viewer must be treated as having no valid basis to write,
   independent of whatever the user's own client happens to display or
   believe — restating, in general form, the same principle §5.6/§6
   already establish for the specific case of a former delegated
   Editor. This decision extends that principle to **every** Viewer
   state, including a user who was never assigned at all (per Decision
   44 Refinement §3, not reopened) and a user whose delegation has been
   revoked (per §5 above) — both are Viewers, governed identically once
   in that state.

---

# 10. Explicit Non-Goals

Decision 48 does not authorize, and does not select:

- Any technical mechanism (Firestore transactions, leases, locks,
  revision numbers, server timestamps, Cloud Functions, security-rule
  design, client-side design, or any other implementation approach) for
  representing, checking, or enforcing anything stated above.
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Resolution of 44-S-F as its own separate decision — though this
  decision's §5–§7 substantially inform what 44-S-F's eventual
  technical design must satisfy, 44-S-F itself (the specific mechanism
  question) remains open and is explicitly out of scope for this
  document, per this task's own instruction not to proceed to 44-S-F.
- Resolution of 44-D, 44-F, 44-S-A, 44-S-C, or the eligible-delegate-
  pool question (Part IV §IV.O) — all remain exactly as open as the
  Rule 8 Part IV reassessment left them.
- Any Implementation Plan or Implementation Authorization.
- Any reopening of Decisions 44, 45, 46, or 47's own already-settled
  content.

---

# 11. What Remains Deliberately Undecided

This decision is a **governance/requirements specification for the
authority model**, not its design. The following are explicitly left
for the subsequent technical design stage, informed by — but not
answered by — this document:

- How "current assignment" is represented and persisted (a field, a
  document, a subcollection, or another shape).
- How a write is checked against the current assignment before being
  accepted (a rules-layer precondition, a transaction, a server-side
  gate, or another approach).
- How the "moment a write is accepted as authoritative" (§6.2) is
  determined technically — e.g., relative to a version/precondition
  check, a timestamp comparison, or another mechanism.
- How offline/queued writes are technically prevented from landing
  after revocation, versus merely detected and rejected after the fact.
- How the distinction between Case 1 and Case 2 (§8) is technically
  surfaced to the operator, if at all, beyond what Decision 47 already
  established for genuine collisions.
- Any UI/UX treatment of authority state, assignment, or Viewer status.

---

# 12. Effect on Rule 8 (Part IV)

Per the Rule 8 Reassessment, Part IV (§IV.P, §IV.Q, §IV.R), 44-S-D was
identified as a required technical design decision, dependent on
44-S-G's product-level resolution (Decision 47, now accepted). This
document proposes the **governance-requirement layer** 44-S-D's
eventual technical design must satisfy — it does **not** resolve the
technical design question itself, and does **not** move any Part IV
CRITICAL/HIGH finding to RESOLVED. Specifically:

- **Findings B (Editor authorization), D (stale former-Editor writes),
  F (draft lifecycle/reassignment), H (offline/reconnect safety), and
  J (multi-tab authority)** in Part IV now have a settled governance
  brief to be designed against (this document), but remain **FAIL /
  OPEN — technical design required**, exactly as Part IV classified
  them. No technical mechanism has been chosen.
- **44-S-F** remains fully open and unaddressed by this document, per
  §10 above and this task's own explicit instruction not to proceed to
  it.
- **44-D, 44-F, 44-S-A, 44-S-C, and the eligible-delegate-pool
  question** are entirely unaffected.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY —
  this document, once accepted, would narrow what the technical design
  stage must produce; it would not complete that stage.

**This document itself does not modify the Rule 8 assessment artifact.**
Per this task's instruction, only a pointer/status note identifying
44-S-D as the current governance decision under consideration is added
there (see the accompanying update to
`docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`),
not a reclassification of any finding.

---

# 13. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 3 September 2026
**RULE 8:** 44-S-D now RESOLVED at the governance-requirement level;
the technical mechanism/design remains OPEN. Verdict remains READY
AFTER DECISIONS — see the Rule 8 artifact's own updated record of this
decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the authority-model governance requirements
in §2–§9 above (authority ownership, the delegated slot, concurrent
legitimate authority, the assignment-change state transition, stale
former-Editor protection, offline behavior, the Case-1-vs-Case-2
distinction, and the Viewer boundary) are adopted as the governing
requirements 44-S-D's eventual technical design must satisfy. The
technical mechanism itself is explicitly NOT decided by this
acceptance and remains open, per §10/§11 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-03

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, and 47 were each
accepted. This acceptance does not authorize implementation, Firestore
rule changes, schema changes, UI changes, code changes, tests, a
technical mechanism for authority representation/enforcement, an
Implementation Plan amendment, or an Implementation Authorization. The
Rule 8 verdict remains READY AFTER DECISIONS — the CRITICAL technical
findings concerning authority enforcement, delegated-Editor
authorization, reassignment enforcement, stale former-Editor
protection, offline authority handling, and multi-tab authority remain
unresolved until technical design is completed. Decision 44-S-F and all
other remaining open items are unaffected by this decision.
