# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 49 — Former Delegated Editor Reconnection Governance Requirements

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** Decision 44-S-F — Former Editor Reconnection, as left open by the [Decision 44 Refinement](./stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md), reassessed under [Decision 46 — Dual Active Editor Authority](./stock-count-data-loss-resilience-decision-46-amendment.md), and closed at the governance-requirement level for the authority model generally by [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md) (✅ Accepted, 3 September 2026)
**Builds on:** [Decision 47](./stock-count-data-loss-resilience-decision-47-amendment.md) (✅ Accepted, live-sync-as-primary-avoidance) and [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md) (✅ Accepted, authority ownership/delegated-slot/assignment-transition/offline-behavior governance requirements — §5–§7 of that document in particular)
**Does not reopen:** Decisions 44, 45, 46, 47, or 48 beyond what is explicitly stated below
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose and Relationship to Decision 48

Decision 48 §5–§7 already established the general governance
principles this decision applies: assignment is authoritative-current-
attributable (§3), a reassignment ends the former Editor's authority
immediately with no overlap (§5), a former Editor's own open/offline
session does not preserve authority (§5.6), and offline-but-still-
assigned is governed distinctly from authority-revoked-while-offline
(§7).

**This decision does not reopen or restate those principles as new
content.** It applies them specifically and exhaustively to the
**reconnection moment** — the point at which a delegated Editor's
client, having been offline or otherwise disconnected, re-establishes
connectivity and must determine its own current standing. Decision 48
established the general rule; this decision (resolves **44-S-F**)
walks every reconnection scenario Rule 8 Part IV identified as a gap
and states the required outcome for each, so that no scenario is left
to inference.

---

# 2. Scenario A — Delegated Editor Remains Assigned While Offline

A is the current delegated Editor. A goes offline. The Owner/Admin does
**not** change the assignment. A reconnects.

**Required outcome:**

1. A **remains** the delegated Editor. Nothing about this scenario
   requires or permits a reassignment.
2. A does **not** need to be reassigned by the Owner/Admin merely to
   resume — the assignment was never revoked, only A's connectivity was
   interrupted.
3. A does **not** become a Viewer merely because of having been
   offline. Offline status, by itself, carries no authority
   consequence (restating Decision 46 §5/§7 and Decision 48 §7's
   "offline but still assigned" state, not reopening either).
4. A may continue editing once safely synchronized with the current
   authoritative state — "safely synchronized" is a requirement on the
   eventual technical design (A must reconcile against whatever
   happened on the shared Contagem while A was offline, per Decision
   47's live-sync/detect-and-preserve principle), not a new invariant
   this decision adds.
5. **No automatic takeover is introduced or implied by this scenario.**
   Nothing here permits any other party to acquire delegated authority
   merely because A was temporarily offline — restating Decision 46
   §7/§5 item 5, not reopening it.

---

# 3. Scenario B — Delegated Editor Is Reassigned While Offline

A is delegated Editor. A goes offline. The Owner/Admin changes the
assignment A → B. A reconnects later.

**Required outcome, stated exhaustively:**

1. **A does not regain delegated authority by reconnecting.**
   Reconnection is never, by itself, a re-acquisition event.
2. **A is a Viewer** — not "no role," not "pending," a Viewer, exactly
   as Decision 48 §5.2/§9 already requires for anyone who is not the
   current Owner/Admin or the current delegated Editor.
3. **B remains the current delegated Editor**, unaffected by A's
   reconnection.
4. **A's old local belief that they are Editor has no authority.** A
   client-side belief, however confidently held or however recently
   true, is never itself a source of authority — restating Decision 48
   §9.2's "authoritative governance state, not merely a UI
   presentation" principle, applied specifically to the reconnection
   moment.
5. **A's previously valid historical observations remain valid
   historical data.** Quantities A validly entered while A held
   authority are not invalidated, hidden, or discounted merely because
   A's role later changed — restating Decision 48 §5.5, not reopening
   it, and stated again here because reconnection is precisely the
   moment a naive implementation might be tempted to conflate "A is no
   longer Editor" with "A's past contributions don't count," which this
   decision explicitly forbids.
6. **Any local/queued writes that have not already become authoritative
   must not be accepted as current-authority writes after revocation.**
   This is Decision 48 §6.2's "authority is evaluated at the moment a
   write is accepted as authoritative, not at the moment it was
   originally entered" principle, restated for the specific case where
   the write was queued *before* reconnection and attempts to land
   *at or after* reconnection.
7. **Reconnection must not silently restore or resurrect A's editing
   authority.** This is the governing prohibition this entire section
   exists to state plainly: whatever technical form reconnection takes,
   its effect on A's authority must be exactly zero — reconnection is
   an event about connectivity, never about authority.

---

# 4. Scenario C — A Has Queued Writes When Authority Is Revoked

1. A enters valid observations while authorized.
2. Those writes remain locally queued/offline.
3. Admin reassigns A → B.
4. A reconnects.

**Required distinction, stated precisely, restating Decision 48 §6.2
applied to this exact sequence:**

- **The historical fact that A entered the observation while
  authorized** is permanent and unaffected by anything that happens
  afterward — this is a fact about what occurred at entry time, not a
  claim about current authority.
- **Whether that observation had already become durable authoritative
  state** (i.e., reached the point Decision 48 §6.2 calls "accepted as
  authoritative") **before** the reassignment is the deciding factor:
  if it had, it stands as legitimately-entered data, exactly like any
  other valid entry made while authority was current. If it had **not**
  yet reached that point at the moment of reassignment, it is governed
  by the next bullet.
- **A queued write attempting to arrive after A's authority has
  expired must NOT silently land as though A were still the current
  Editor.** This is the required outcome for exactly this case — not a
  new principle, but the specific application of Decision 48 §6 to a
  write that was legitimately entered but had not yet become
  authoritative before authority moved.

**This decision does not decide the technical mechanism for achieving
this distinction** — not the moment-of-acceptance definition's
technical implementation, not how a queued write is technically
prevented or rejected, not how "already durable" is technically
determined. Those remain open, per §8 below.

---

# 5. Scenario D — A Reconnects With Stale Local UI/State

**Required outcome:**

1. **The client's previous local belief ("I am Editor") is not
   authoritative.** A client's own cached/remembered state about its
   own role carries no weight against the current authoritative
   assignment — restating Decision 48 §9.2, applied specifically to
   the case where the staleness is in the *client's own self-belief*,
   not merely in queued data.
2. **If the authoritative assignment says A is now Viewer, A must be
   treated as Viewer**, regardless of what A's own local session
   currently displays or assumes.
3. **The client must not silently continue editing as though A were
   still Editor.** This is a required outcome — the client's behavior
   must reflect the authoritative state, not its own stale belief —
   without this decision specifying *how* the client comes to learn the
   authoritative state or *how soon* after reconnection that must
   happen (both are technical design questions, §8).
4. **The old local state must not override the current authoritative
   authority state**, under any circumstance this decision anticipates.

---

# 6. Scenario E — Sequential Reassignment While A Remains Offline

A → B → C, all occurring while A remains offline throughout. A
reconnects.

**Required outcome:**

1. **A must remain Viewer.** Every reassignment after A's own removal
   from the delegated slot is irrelevant to A's own status — A was
   already a Viewer the moment A → B occurred (§3), and nothing about
   B → C changes that.
2. **A must not regain authority because of an old assignment** — 
   including A's own prior assignment, and including any assignment
   that has since itself been superseded (B's own now-former
   authority).
3. **Only the current authoritative assignment determines delegated
   Editor status**, at the moment that status is evaluated — never any
   prior link in the chain, however recent.
4. **This governance language must support any number of sequential
   replacements without introducing ambiguity.** The required outcome
   for A after A → B → C → ... → N (any finite chain length) is
   identical to the required outcome after a single A → B replacement:
   A is a Viewer, full stop. This decision does not require, and does
   not authorize, any different treatment based on how many
   reassignments occurred, how long A was offline, or how many
   intermediate delegated Editors existed in between.

---

# 7. The Four Concepts, Kept Explicitly Separate

This decision requires these four concepts to be treated as
categorically distinct at every layer of eventual design, restating and
consolidating the distinction Decision 48 §7/§8 already introduced,
applied specifically to reconnection:

1. **Offline but still authorized** — the user remains the current
   delegated Editor; offline status alone does not revoke authority
   (§2).
2. **Offline and subsequently revoked** — the user was previously
   authorized but is no longer the current delegated Editor;
   reconnection does not restore authority (§3, §6).
3. **Historical observation** — a valid observation entered while the
   user was authorized is not retroactively invalidated merely because
   their role later changed (§3.5, §4).
4. **Stale queued write** — a locally queued operation attempting to
   become authoritative after the user's authority has expired must not
   be accepted as though the old authority still existed (§3.6, §4,
   §5).

**These four must never be conflated, in governance language, in
eventual technical design, or in any UI/UX treatment built on top of
either.** A design that treats a former Editor's *historical entries*
as suspect because their *authority* was later revoked would violate
concept 3. A design that allows a *queued write* to land because the
*historical fact of entry* was legitimate would violate concept 4. Both
are explicitly prohibited by this decision.

---

# 8. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage questions:

- Any Firestore transaction, security-rule implementation, revision
  number, lease, lock, timestamp, or Cloud Function mechanism.
- Any client-side mechanism or synchronization algorithm for detecting
  reconnection, determining current authoritative state, or reconciling
  a stale local belief against it.
- Any schema structure representing current assignment, authority
  history, or write-acceptance ordering.
- Any UI/UX implementation of how A is informed of their Viewer status,
  how the transition is presented, or how "safely synchronized"
  (§2 item 4) is achieved or displayed.
- The precise technical definition of "already become durable
  authoritative state" referenced in §4 — this decision states the
  requirement that such a moment must be well-defined and checkable;
  it does not define it technically.

---

# 9. Explicit Non-Goals

Decision 49 does not authorize:

- Any technical mechanism for anything stated above.
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, or 48's own already-settled
  content.
- Resolution of 44-D, 44-F, 44-S-A, 44-S-C, or the eligible-delegate-
  pool question — all remain exactly as open as the Rule 8 Part IV
  reassessment left them, per this task's own explicit instruction not
  to proceed to 44-D or 44-F.
- Any Implementation Plan or Implementation Authorization.

---

# 10. Effect on Rule 8 (Part IV)

Per the Rule 8 Reassessment, Part IV (§IV.P, §IV.Q, §IV.R), 44-S-F was
identified as a required technical design decision, closely coupled to
44-S-D and informed by whatever governance requirements Decision 48
established. This document establishes the **governance-requirement
layer** 44-S-F's eventual technical design must satisfy for the
specific reconnection scenarios named above — it does **not** resolve
the technical design question itself, and does **not** move any Part
IV CRITICAL finding to RESOLVED. Specifically, now that this decision
is accepted:

- **44-S-F is RESOLVED at the governance-requirement level.** The
  reconnection-specific portions of Finding D (stale former-Editor
  writes) and Findings F (draft lifecycle) and H (offline/reconnect
  safety) in Part IV now have a settled governance brief to be designed
  against — but they remain **FAIL / OPEN — technical design
  required**, exactly as Part IV classified them. No technical
  mechanism is chosen by this document.
- **44-D, 44-F (non-reconnection portions), 44-S-A, 44-S-C, and the
  eligible-delegate-pool question** are entirely unaffected and remain
  open, exactly as before.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY.

**This document itself does not modify the Rule 8 assessment artifact.**
Per this task's instruction, only a pointer/status note identifying
Decision 49 as accepted for 44-S-F's governance-requirement layer is
added there, not a reclassification of any CRITICAL technical finding.

---

# 11. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** 44-S-F now RESOLVED at the governance-requirement level;
the technical mechanism/design remains OPEN. Verdict remains READY
AFTER DECISIONS — see the Rule 8 artifact's own updated record of this
decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the reconnection-moment governance
requirements in §2–§7 above (offline-but-still-assigned preserves
authority; offline reassignment does not preserve former authority;
reconnection is never itself a re-acquisition event; historical
observations remain distinguishable from and unaffected by later
authority changes; stale queued writes must not silently become
authoritative after authority expires; stale local client belief
cannot override the current authoritative assignment; sequential
reassignment chains of any length resolve to the current authoritative
assignment only) are adopted as the governing requirements 44-S-F's
eventual technical design must satisfy. The technical mechanism itself
is explicitly NOT decided by this acceptance and remains open, per
§8/§9 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, and 48 were each
accepted. This acceptance does not authorize implementation, Firestore
rule changes, schema changes, UI changes, code changes, tests, a
technical mechanism for reconnection/authority-state determination, an
Implementation Plan amendment, or an Implementation Authorization. The
Rule 8 verdict remains READY AFTER DECISIONS — the CRITICAL technical
findings concerning authority enforcement, delegated-Editor
authorization, reassignment enforcement, stale former-Editor
protection, offline/reconnect authority handling, and multi-tab
authority remain unresolved until technical design is completed.
Decision 44-D, 44-F (non-reconnection portions), 44-S-A, 44-S-C, and
the eligible-delegate-pool question are unaffected by this decision and
remain exactly as open as before.
