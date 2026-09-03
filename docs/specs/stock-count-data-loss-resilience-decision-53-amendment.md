# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 53 — Finalizer Authorization Requirements

**Status:** DRAFTED — NOT ACCEPTED
**Resolves (proposed):** Decision 44-S-C — Finalizer Authorization, as
identified in the original [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(Part II §II.O, Part III §III.3-C, Part IV §IV.E/§IV.N summary table)
and carried forward, **OPEN (elevated priority) — Product Architect
decision required**, through every subsequent reassessment and
decision (Decisions 45 through 52) without being resolved by any of
them — including by Decision 52, which explicitly left it untouched
per its own §12/§8.
**Builds on:** [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md)
(✅ Accepted, authority-model governance requirements), [Decision 49](./stock-count-data-loss-resilience-decision-49-amendment.md)
(✅ Accepted, former-Editor reconnection governance requirements),
[Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, exactly-one finalization governance requirements),
[Decision 51](./stock-count-data-loss-resilience-decision-51-amendment.md)
(✅ Accepted, shared-device/cache isolation governance requirements),
and [Decision 52](./stock-count-data-loss-resilience-decision-52-amendment.md)
(✅ Accepted, Viewer authorization governance requirements) — this
decision assumes and does not restate, reinterpret, or weaken any of
their governance content. It answers exactly one question these six
decisions left open: **who is authorized to perform the finalization
act** — not what finalization must guarantee once attempted (Decision
50, unchanged), not who may edit (Decision 46/48/49, unchanged), and
not who may view (Decision 52, unchanged).
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, or 52's
own already-settled content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decision 50 already resolved, at the governance level, **what**
finalization must guarantee: at most one finalization may succeed; the
first successful finalization becomes the sole authoritative outcome;
stale local state and stale/pending writes may not finalize or mutate
an already-closed Contagem; no silent overwrite; legitimate durable
observations remain preserved. **Decision 53 does not revisit any of
that.** It answers the distinct, still-open question the Rule 8
Assessment has carried since before Decision 46 (Part II §II.O, Part
III §III.3-C): **who is authorized to attempt finalization in the
first place** — a question about *eligibility to act*, not about *what
happens once the act is attempted*.

The Rule 8 Assessment has repeatedly noted that finalization has
already been Owner-only at the rules layer since before Decision 44,
and has recommended confirming this explicitly rather than leaving it
open, without ever deciding it. This decision makes that confirmation,
exhaustively, across every scenario Decisions 46, 48, and 49 already
established for authority generally — so that no scenario is left to
inference at the technical design stage.

---

# 2. Who May Finalize — Required Determination

1. **Owner/Admin has inherent finalization authority.** This is not a
   new grant — it restates, for the finalization act specifically, the
   inherent authority Decision 46 §1 and Decision 48 §2 already
   establish for Owner/Admin generally. Owner/Admin's finalization
   authority requires no delegation, no explicit assignment, and no
   additional qualification beyond being the current Owner/Admin.
2. **The currently delegated Editor does not have finalization
   authority.** Editing authority and finalization authority are
   **not equivalent** — this decision makes the explicit determination
   §2 of the task context requires: holding the delegated Editor slot
   grants the ability to edit the active Contagem (per Decision 46),
   but does **not**, by itself or by implication, grant the ability to
   finalize it. This is a deliberate, explicit restriction, not an
   oversight or a gap.
3. **A Viewer does not have finalization authority.** This restates
   Decision 52 §4 item 11 and §8 item 2/3, not reopening either: a
   Viewer's ability to observe the active Contagem, including its
   finalization state, creates no finalization eligibility whatsoever.
4. **A former delegated Editor does not have finalization authority**
   — whether or not they retain Viewer eligibility per Decision 52 §6.
   A former delegated Editor never had finalization authority to begin
   with, per item 2 above, so reassignment away from the delegated
   Editor slot has no finalization-authority consequence to undo.
5. **An unauthorized user has no finalization authority**, consistent
   with having no authorization of any kind in relation to the
   business (Decision 52 §3).
6. **The permitted finalizer, under this decision, is Owner/Admin
   only.** This is the exhaustive answer to "who may finalize" — no
   other role, current or former, active or offline, gains
   finalization authority under any circumstance this decision or any
   decision it builds on anticipates.

---

# 3. Editing Authority Does Not Imply Finalization Authority

1. **This decision makes the explicit determination that editing
   authority and finalization authority are distinct governance
   concepts**, not an assumed equivalence. Decision 46's grant of
   simultaneous editing authority to Owner/Admin and the delegated
   Editor is a statement about *editing* only; it carries no implied
   statement about *finalizing*, and this decision does not read one
   into it.
2. **Finalization is restricted to a subset of those who may edit** —
   specifically, to Owner/Admin alone, per §2. The currently delegated
   Editor, despite holding full editing authority, is explicitly
   outside that subset.
3. **This restriction is a deliberate product decision, not a
   technical limitation being described.** It reflects that
   finalization is a materially different, higher-consequence action
   than an ordinary edit (it closes out the Contagem and produces the
   authoritative `stockCounts` record Decision 50 governs), and this
   decision determines that only Owner/Admin should be able to take
   that action.

---

# 4. Owner/Admin — Inherent Finalization Authority

1. **Owner/Admin's finalization authority is inherent, not derivative
   or delegated** — restating, for finalization specifically, the same
   inherent-authority principle Decision 46 §1 and Decision 48 §2
   already establish for Owner/Admin's authority generally.
2. **This decision does not weaken, narrow, or add any new condition
   to the already-accepted Owner/Admin authority model.** Owner/Admin's
   finalization authority holds under exactly the same conditions
   Owner/Admin's editing authority already holds under (current
   Owner/Admin status, evaluated at the moment of the action) — this
   decision adds nothing beyond confirming that finalization is among
   the actions that authority covers.

---

# 5. Delegated Editor — No Finalization Authority

1. **The currently delegated Editor may not finalize the active
   Periodic Contagem**, regardless of how current, how explicit, or how
   authoritative their delegated-Editor assignment is. This holds even
   while the delegation is fully current and unambiguous under
   Decisions 46/48/49 — currency of the delegation has no bearing on
   this restriction, because the restriction is not about whether the
   delegation is valid, but about what the delegation grants.
2. **This decision states clearly, per the task's own requirement,
   that the answer is "no."** No conditional, partial, or
   circumstance-dependent finalization authority is granted to the
   delegated Editor by this decision.
3. **This is not resolved through technical implementation** — it is a
   product/governance restriction, to be enforced authoritatively by
   whatever technical mechanism Decision 50's eventual technical design
   produces (consistent with Decision 50 §5's "no silent
   overwrite"/authoritative-enforcement principle, extended here to
   "no finalization attempt is even a legitimate candidate from a
   non-Owner/Admin role" rather than merely "a second attempt is
   rejected").

---

# 6. Viewer — No Finalization Authority

1. **Viewer authorization does not itself confer finalization
   authority, under any circumstance.** This restates and confirms
   Decision 52 §4 item 11/§8 item 2, not reopening either.
2. **A Viewer must not become a finalizer merely because they can
   observe the active Contagem**, its progress, or its finalization
   state. Observation and action remain categorically distinct, exactly
   as Decision 52 §8 item 2 already establishes.
3. **This decision adds no new Viewer capability and removes none** —
   it only confirms, from the finalizer-authorization side, what
   Decision 52 already established from the Viewer-authorization side.

---

# 7. Former Delegated Editor — No Finalization Authority

Applying Decisions 48 and 49 without changing either:

1. **If delegated Editor A is reassigned (A becomes Viewer, or ceases
   to be authorized at all), A must not retain finalization
   authority.** Since, per §2/§5 above, A never had finalization
   authority as delegated Editor in the first place, there is no
   finalization authority for reassignment to revoke — but this
   decision states the outcome explicitly so no design mistakenly
   infers that "losing Editor status" implies "losing a finalization
   right that existed," when no such right ever existed for a
   delegated Editor.
2. **A's reconnecting after reassignment must not restore any
   finalization authority** — restating Decision 49 §3.1/§3.7 for the
   finalization-specific case: reconnection is an event about
   connectivity, never about authority, and this holds identically
   whether the authority in question is editing authority (already
   covered by Decision 49) or finalization authority (covered here).
3. **A's stale local state must not permit a finalization attempt to
   be treated as legitimate** — restating Decision 49 §5 and Decision
   50 §4's stale-state principles, applied specifically to the
   finalization action: a stale client's belief that it still holds
   finalization-relevant authority (whether that belief is about
   editing authority or, incorrectly, about finalization authority it
   never had) carries no weight against the current authoritative
   state.
4. **This decision does not create any new authority-transfer model.**
   It relies entirely on Decisions 48 and 49's already-accepted
   authority-transition mechanics, applied to a role (delegated Editor)
   that, per this decision, never held finalization authority to
   transfer or lose.

---

# 8. Offline Finalizer

1. **Offline status does not remove Owner/Admin's finalization
   authority.** Restating, for finalization specifically, the same
   offline-neutrality principle Decision 46 §5/§7, Decision 48 §7, and
   Decision 49 §2 already establish: an offline Owner/Admin remains
   Owner/Admin, and remains the sole permitted finalizer, throughout
   the offline period.
2. **Offline status does not create finalization authority** for any
   role that does not otherwise hold it. An offline delegated Editor,
   Viewer, former delegated Editor, or unauthorized user gains no
   finalization eligibility merely by virtue of being offline, being
   the only participant currently active, or any other circumstance
   arising from another party's absence.
3. **A finalization attempt made after another device has already
   finalized must still be governed entirely by Decision 50** — this
   decision does not alter Decision 50's exactly-one-finalization
   guarantee in any way; it only narrows *who* may be the source of a
   legitimate attempt in the first place. An offline Owner/Admin
   session's finalization attempt, upon reconnection, remains subject
   to Decision 50 §3/§4's stale-working-state and first-successful-
   finalization rules exactly as any other Owner/Admin session's
   attempt would be.
4. **Stale local state must not override the current authoritative
   finalization state**, for the same reasons and to the same extent
   Decision 50 §4 and Decision 51 §6 already require — this decision
   adds no exception for Owner/Admin sessions specifically; an offline
   Owner/Admin device's stale belief that the Contagem is still open is
   governed by Decision 50, not by any special finalizer-authorization
   carve-out.
5. **This decision does not decide the technical mechanism** for any
   of the above (detection of staleness, technical rejection of a
   stale finalization attempt, or otherwise) — those remain governed by
   Decision 50's own §9 and this decision's own §11 below.

---

# 9. Authority Change During an Offline Period

**Scenario:** User A is authorized to finalize (i.e., A is Owner/Admin),
goes offline, and is then revoked/reassigned before reconnecting. (Note:
under §2 of this decision, only Owner/Admin ever holds finalization
authority — this scenario is analyzed for completeness and to establish
the governing principle, even though a change of Owner/Admin status is,
in the platform's existing authority model, itself a separate and rarer
event than delegated-Editor reassignment.)

1. **The current authoritative authorization at the moment of the
   finalization attempt controls — not the authorization A held when A
   went offline.** This restates, for finalization specifically, the
   same current-state-governs principle Decision 48 §9.2, Decision 49
   §5, and Decision 52 §9 already establish for their respective
   domains.
2. **If A's Owner/Admin status (or whatever underlying authorization
   grants finalization eligibility) is no longer current upon
   reconnection, A may not finalize** — reconnection does not restore
   an authorization that is no longer authoritative, restating Decision
   49 §3.1/§3.7 for the finalization-specific case.
3. **This decision does not introduce any new mechanism for how
   Owner/Admin status itself changes hands** — that remains governed by
   whatever existing or future business-ownership/authorization
   concept the platform uses, entirely outside this decision's scope.
   This section only confirms that, whatever that mechanism is, its
   *current* state controls finalization eligibility, not a
   *previously held* state.

---

# 10. Finalization After Delegated-Editor Reassignment

**Scenario:** A is the delegated Editor. A goes offline. Owner/Admin
assigns B as the new delegated Editor. A reconnects and attempts to
finalize.

**Required outcome:**

1. **A's attempt must not succeed, and must not be treated as a
   legitimate finalization attempt at all** — not because A's
   delegated-Editor assignment was revoked (though it was, per Decision
   46/48/49), but because, per §2/§5 of this decision, **A never had
   finalization authority as delegated Editor in the first place,
   before or after B's assignment.** This scenario does not turn on
   Decision 49's reconnection-authority rules at all — it is resolved
   entirely by §2/§5 of this decision: A was never eligible to
   finalize.
2. **This decision does not introduce automatic takeover in either
   direction.** B's assignment as the new delegated Editor does not
   grant B finalization authority either — per §2/§5, no delegated
   Editor, current or former, ever holds finalization authority. Only
   Owner/Admin may finalize, unaffected by whichever delegated Editor
   currently holds the (non-finalizing) delegated Editor slot.
3. **This scenario, worked through explicitly, is one further
   confirmation of why §2's determination matters**: had this decision
   instead granted the delegated Editor finalization authority, this
   exact scenario would require the full reconnection/stale-authority
   analysis Decision 49 provides for editing authority. Because this
   decision withholds finalization authority from the delegated Editor
   role entirely, the scenario resolves at the eligibility level,
   without needing to reach the reconnection-timing question at all.

---

# 11. Exactly-One Finalization Remains Separate

1. **This decision does not redefine, narrow, expand, or otherwise
   touch Decision 50's exactly-one-finalization guarantee.** Decision
   50 governs what happens once a finalization is attempted (at most
   one may succeed, stale/pending writes may not land, no silent
   overwrite, durable observations are preserved) — this decision
   governs only who may legitimately be the source of an attempt.
2. **These three questions are kept explicitly separate, per the
   task's own requirement:**
   - **Who may attempt finalization?** — answered by this decision
     (Decision 53): Owner/Admin only.
   - **Whether more than one finalization may succeed** — answered by
     Decision 50: at most one, regardless of who attempts it.
   - **How the system technically enforces either** — not answered by
     either decision; remains open for later technical design.
3. **A technical design that implements this decision's
   who-may-finalize restriction still must independently satisfy
   Decision 50's exactly-one-finalization guarantee** — restricting the
   set of eligible finalizers to Owner/Admin alone does not, by itself,
   prevent two Owner/Admin sessions (e.g., two devices) from each
   attempting finalization; Decision 50's protections remain fully
   necessary and are entirely unaffected by this decision.

---

# 12. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage or separate-governance-stage
questions:

- Decision 50's own technical finalization mechanism (Firestore
  transactions, locks, revisions, compare-and-set, or any other
  approach) — entirely unaffected by this decision.
- Any schema design for representing finalizer eligibility or
  recording who finalized.
- Any Firestore security-rule implementation of the Owner-only
  finalization restriction this decision establishes.
- The delegated-Editor `firestore.rules` authorization mechanism
  (Decision 46/48's own open technical question) — unaffected by this
  decision.
- Any technical live-synchronization mechanism (Decision 47,
  unaffected).
- Any technical same-row collision-detection mechanism (Decision 47,
  unaffected).
- Any technical cache-isolation mechanism (Decision 51, unaffected).
- Any technical Viewer-enforcement mechanism (Decision 52, unaffected).
- **The eligible-delegate-pool question** (§IV.O of the Rule 8
  Assessment) — who may be assigned as delegated Editor at all remains
  entirely separate and is not addressed by this decision.

---

# 13. Explicit Non-Goals

Decision 53 does not authorize, and does not resolve:

- Decision 50's technical finalization mechanism.
- Any Firestore transaction/lock/revision/compare-and-set design.
- Any schema design.
- Any Firestore security-rule implementation.
- The delegated-Editor Firestore authorization mechanism.
- Any technical live-synchronization mechanism.
- Any technical same-row collision-detection mechanism.
- Any technical cache-isolation mechanism.
- Any technical Viewer-enforcement mechanism.
- **The eligible-delegate-pool question.**
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, 48, 49, 50, 51, or 52's own
  already-settled content.
- Any Implementation Plan or Implementation Authorization.

---

# 14. Effect on Rule 8

Per the Rule 8 Assessment (Part II §II.O, Part III §III.3-C, Part IV
§IV.E/§IV.N summary table), 44-S-C (finalizer authorization) was
identified as **OPEN (elevated priority) — Product Architect decision
required**, with the assessment repeatedly noting that Owner-only
finalization is "likely already substantially answered by existing
governance" (the `firestore.rules` finalization path having been
Owner-only since before Decision 44) but recommending explicit
confirmation rather than treating it as decided. This document, **once
accepted**, would provide that explicit confirmation at the
governance-requirement level — it does **not** introduce any new
technical mechanism, and does **not** move any Part IV CRITICAL/HIGH
technical finding (including Finding E, finalization uniqueness) to
RESOLVED, since 44-S-C was never itself classified as a CRITICAL/HIGH
technical finding — it was a distinct, open Product Architect decision
about eligibility, not about mechanism. Upon acceptance:

- **44-S-C would be RESOLVED at the Product Architect
  governance-requirement level.** The open item in the Rule 8
  Assessment's summary table and decision lists (§IV.N, §IV.Q, §IV.R)
  would have a settled governance answer: Owner/Admin only.
- **The eligible-delegate-pool question and every CRITICAL/HIGH
  technical finding in §IV.P (including Finding E, finalization
  uniqueness, and Finding K, cache isolation)** are entirely
  unaffected — none of them is resolved, narrowed, or reclassified by
  this decision.
- The Rule 8 verdict would **remain READY AFTER DECISIONS**, not
  READY.
- **This document, once accepted, would leave zero fully-open Product
  Architect decisions among 44-S-A/44-S-C/44-S-D/44-S-F/44-S-G/44-D/
  44-F** — all seven would then have settled governance answers, with
  every corresponding technical mechanism (and, for 44-F, the named
  technical verification) still separately required before Rule 8 can
  move toward READY. Only the eligible-delegate-pool question (a
  narrow, non-blocking item) would remain as an open Product Architect
  question.

**This document, while DRAFTED — NOT ACCEPTED, does not modify the
Rule 8 assessment's classification of any finding or open decision.**
Per this task's instruction, only a pointer/status note identifying
Decision 53 as drafted for 44-S-C is added to the Rule 8 artifact, not
a reclassification of any finding or decision.

---

# 15. Status

**SPECIFICATION AMENDMENT:** DRAFTED — NOT ACCEPTED
**PRODUCT ARCHITECT ACCEPTANCE:** PENDING
**RULE 8:** Unaffected in verdict (remains READY AFTER DECISIONS) while
this document is in DRAFTED status; Rule 8 artifact updated only to
note this document's drafted status, per §14
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** PENDING

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** __________________

**Acceptance Signature:** __________________

**Decision Notes:** __________________
