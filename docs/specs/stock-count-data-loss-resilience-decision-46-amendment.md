# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 46 — Dual Active Editor Authority (Owner/Admin + One Delegated Editor)

**Status:** DRAFTED — NOT ACCEPTED
**Amends:** Decision 44 Refinement — Single Active Editor + Live Read-Only Viewers (`stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`, ✅ Accepted, requirements only, 3 September 2026), specifically its core concurrency invariant (§2/§17, INV-44-S01/INV-44-S04)
**Does not reopen:** Decision 44 (`stock-count-data-loss-resilience-decision-44-amendment.md`) or Decision 45 (`stock-count-data-loss-resilience-decision-45-amendment.md`) beyond the one concurrency assumption named below
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose and Relationship to Decision 44's Refinement

This is a **material amendment to the concurrency model** the Decision
44 Refinement established, not a cosmetic clarification. The Decision
44 Refinement's governing invariant was:

> INV-44-S01 — At most one active editing authority may hold write
> access to a business's unfinished Periodic Contagem at any given
> time.

Decision 46 proposes to **replace** this invariant with:

> **At most two active editing authorities may exist for an unfinished
> Periodic Contagem: the permanent Owner/Admin authority and at most
> one explicitly delegated Editor authority.**

This is not an additive decision layered on top of an unchanged Single
Active Editor model — it changes what "single" meant. Everything in
the Decision 44 Refinement that assumed exactly one writer at a time
(its own §2–§11, and the corrected Rule 8 Reassessment's Part III,
§III.0/§III.14, which found general multi-writer conflict resolution
RESOLVED/eliminated specifically *because* only one legitimate writer
could ever exist) must be treated as **provisional, pending Rule 8
reconsideration**, not as settled fact this decision can silently build
on top of.

**What this amendment does not touch:** Decision 44's own preserved
provisions (business ownership, durability, no-silent-loss, tenant
isolation, recovery — Decision 44 §4/§8/§9/§15/§17/§20, restated
unchanged by the Refinement's own §1) remain fully in force, unaffected
by whether one or two sessions may legitimately write. Decision 45's
resolution of 44-S-B (Editor Authorization) and 44-S-E (Offline Active
Editor) also remains substantively intact in spirit — the Owner/Admin
still exclusively controls who else may edit, and offline behavior is
still never automatic — but both are **narrowed in applicability**,
not overturned: Decision 45 was written assuming a single non-Owner
Editor role existed to assign; Decision 46 clarifies that the
Owner/Admin's own authority was never something Decision 45 was
describing as assignable or losable in the first place, and adds the
delegated-Editor-specific mechanics on top.

---

# 2. Core Authority Model

### A. Owner/Admin — permanent Active Editor

* The Owner/Admin is always an Active Editor.
* The Owner/Admin retains editing authority regardless of whether
  another Editor is assigned.
* The Contagem must never enter a "no active editor" state while the
  Owner/Admin is available as the business authority.

### B. One delegated Active Editor

* The Owner/Admin may designate one authorized user as the delegated
  Active Editor.
* The delegated Editor may edit the same Periodic Contagem.
* The maximum number of simultaneously authorized editing roles is:
  **Owner/Admin + one delegated Editor.**
* Two sessions may legitimately possess editing authority
  simultaneously when one is the Owner/Admin and the other is the
  currently assigned delegated Editor.

---

# 3. Delegated Editor Assignment

1. Only the Owner/Admin may assign the delegated Editor.
2. Assignment must be explicit.
3. Opening the Contagem does not grant delegated Editor authority.
4. A second user/device does not automatically become delegated Editor.
5. Only one delegated non-admin Editor may be assigned at a time.
6. The delegated Editor must be business-scoped.
7. Initial Stock Count remains outside this decision (unchanged from
   Decision 44 §2/§25, Decision 44-S-H/44-G).

---

# 4. Changing the Delegated Editor

The Owner/Admin may change the delegated Editor at any time.

```text
Owner/Admin + Editor A
        ↓
Owner/Admin changes assignment
        ↓
Owner/Admin + Editor B
```

When the assignment changes:

* Editor A immediately loses delegated editing authority.
* Editor A becomes a Viewer.
* Editor B becomes the delegated Active Editor.
* **There must be no period in which Editor A and Editor B both possess
  delegated-editor authority** — this is a strengthened, not relaxed,
  requirement relative to the single-editor model: where before there
  was only ever one authority to transfer, there are now two
  independent authority slots (Owner/Admin, delegated Editor), and this
  requirement applies specifically to the delegated slot, which is the
  one that changes hands.
* Editor A must not be able to continue writing merely because their
  local session still believes it is authorized.

---

# 5. Existing Delegated Editor Going Offline

If the delegated Editor goes offline:

* Their authority is NOT automatically transferred.
* The Owner/Admin remains an Active Editor (this was already true
  under §2-A regardless of the delegated Editor's connectivity).
* The delegated Editor remains the assigned delegated Editor
  unless/until the Owner/Admin changes the assignment.
* Reconnection does not require a new assignment if the Owner/Admin has
  not reassigned the role.
* No timeout-based takeover is authorized.

**This preserves Decision 45's governing rule** ("no automatic
takeover of any kind") for the delegated-editor slot specifically — 
Decision 46 does not weaken that rule, it applies it to a role that now
exists alongside a second, permanently-authoritative role.

---

# 6. Owner/Admin Going Offline

If the Owner/Admin goes offline:

* No automatic replacement of the Owner/Admin authority occurs.
* No other user becomes Owner/Admin merely because the Owner/Admin is
  offline.
* The delegated Editor, if already assigned, retains their delegated
  editing authority according to §5 above.
* The system must not silently transfer Owner/Admin authority to
  another user.

No additional behavior beyond this is authorized by this section.

---

# 7. Simultaneous Legitimate Editing — The Critical Architectural Change

Unlike the Decision 44 Refinement's Single Active Editor model, this
amendment explicitly permits:

```text
Owner/Admin      ───────► EDITOR
Delegated Editor ───────► EDITOR
Other users      ───────► VIEWER
```

Consequences, stated precisely:

* Owner/Admin and delegated Editor may legitimately edit the same
  unfinished Periodic Contagem **simultaneously**.
* **The previous governing assumption — "two simultaneously-valid
  writing sessions cannot occur" — is NO LONGER GOVERNING.**
* The corrected Rule 8 Reassessment's conclusion (Part III, §III.0/§III.14)
  that general multi-writer conflict resolution was **RESOLVED**
  specifically because the product no longer permitted two simultaneous
  legitimate writers **must be reconsidered** — that conclusion's own
  premise no longer holds once this decision is accepted.
* This amendment does **not** select a conflict-resolution mechanism.
  What stale-write protection, concurrent-row handling, conflict
  preservation, and finalization integrity now require is explicitly
  deferred to a fresh Rule 8 pass (§10 below).

---

# 8. Former Delegated Editor

```text
Before:                          After:
Owner/Admin + Editor A    →      Owner/Admin + Editor B
                                  A = Viewer
```

If A later reconnects:

* A does NOT automatically regain delegated Editor authority.
* A remains Viewer.
* Only the Owner/Admin can assign A again.

If the Owner/Admin has NOT reassigned the role:

* A remains the delegated Editor even if A temporarily goes offline.
* Reconnection does not constitute a new assignment.

---

# 9. Technical Mechanism NOT Selected

Decision 46 does not select, and does not authorize selecting:

* lease/lock;
* heartbeat;
* transaction;
* versioning;
* revision counters;
* server arbiter;
* deterministic identity;
* conflict-record architecture;
* any Firestore rule implementation;
* any schema;
* any application code.

All of the above remain technical design questions for the subsequent
Rule 8 / Implementation Planning stages, exactly as Decision 44's
Refinement and Decision 45 already established for the single-editor
case — this amendment does not change that discipline, only the
product-level authority model the eventual mechanism must satisfy.

---

# 10. Required Governance Correction

**The Decision 44 Refinement's own governing invariants must be marked
superseded where they conflict with this amendment, once accepted —
not silently preserved as if Decision 46 did not exist.**

Specifically, upon acceptance:

- **INV-44-S01** ("At most one active editing authority may hold write
  access... at any given time") is **superseded**, replaced by:

  > **At most two active editing authorities may exist for an
  > unfinished Periodic Contagem: the permanent Owner/Admin authority
  > and at most one explicitly delegated Editor authority.**

- **INV-44-S04** ("No Dual Editor" — "Two independent
  sessions/devices... cannot simultaneously hold valid editing
  authority") must be **narrowed, not deleted**: it continues to govern
  the *delegated* slot specifically (no two sessions may simultaneously
  hold the one delegated-Editor authority — §4 above), but it no longer
  prohibits the legitimate Owner/Admin + delegated Editor combination,
  which is now an intended, governed state, not a violation.

- Every other invariant in the Decision 44 Refinement's §17
  (INV-44-S02 Shared State, INV-44-S03 Viewer Read-Only, INV-44-S05
  Authority Transition Safety, INV-44-S06 Stale Former Editor
  Protection, INV-44-S07 Live Viewer Synchronization, INV-44-S08
  Finalization Uniqueness, INV-44-S09 No Draft Resurrection, INV-44-S10
  Existing Durability Preserved, INV-44-S11 Tenant Isolation, INV-44-S12
  Logout Isolation) **remains in force, unchanged** — none of them
  assumed exactly one writer as their own load-bearing premise the way
  INV-44-S01/S04 did; they concern shared state, Viewer restrictions,
  transition safety, durability, and isolation, all of which apply
  identically whether one or two sessions may legitimately edit.

**This correction takes effect only upon Product Architect acceptance
of this document (§11) — until then, the Decision 44 Refinement's
original INV-44-S01/S04 remain the accepted, governing invariants, and
this section describes what *would* change, not what has changed yet.**

---

# 11. Rule 8 Consequence — Mandatory Reassessment

Once accepted, this amendment requires a **fresh Rule 8 reassessment**,
not a patch to the existing one, for the same reason the previous
correction (Decision 44 Refinement's own Rule 8 Part III) was itself a
full re-derivation rather than a patch: the conceptual baseline changed.

**Why a fresh reassessment is mandatory, specifically:**

- The corrected Rule 8 Part III's central finding — that general
  same-row concurrent-write conflict is **RESOLVED** because no
  legitimate simultaneous-writer scenario exists — is **invalidated by
  its own stated premise** once two simultaneous legitimate writers
  (Owner/Admin + delegated Editor) are possible. That finding cannot be
  patched; it must be re-derived from the new premise.
- Every downstream classification in Part III's before/after matrix
  that depended on "only one legitimate writer" (draft resurrection,
  offline reconnect, multi-tab — all classified TRANSFORMED specifically
  *because* the legitimate-writer count was assumed to be one) needs
  re-evaluation against a legitimate-writer count of up to two.
- Decision 45's resolution of 44-S-E (Offline Active Editor) was
  reasoned entirely in terms of a single non-Owner Editor role; it must
  be re-checked against the now-separate Owner/Admin-offline case (§6
  above) and delegated-Editor-offline case (§5 above), which are no
  longer the same scenario.
- New questions this amendment itself introduces and does not answer —
  what happens when Owner/Admin and delegated Editor write to the
  *same row* at the *same time* (§7); whether finalization by either
  role is symmetric or whether one takes precedence; whether the
  cross-device finalization gap (Decision 44-D, still fully open and
  untouched by Decision 45) is made worse, unchanged, or differently
  shaped by having two legitimate finalizing identities instead of one
  — none of these were in scope for the existing Rule 8 artifact and
  cannot be answered by amending its conclusions in place.

**No Rule 8 reassessment is performed by this document.** This section
records that one is required, per this repository's own established
governance discipline (the same discipline that produced a full Part
III re-derivation, not a patch, when the Single Active Editor model was
first corrected).

---

# 12. Explicit Non-Goals

Decision 46 does not authorize:

- Selecting or implementing any technical mechanism for dual-authority
  enforcement, conflict detection, or finalization guarding.
- Any change to `firestore.rules`, application code, schemas, or tests.
- Any Implementation Plan or Implementation Authorization.
- Reopening Decision 44's own preserved provisions (business ownership,
  durability, no-silent-loss, tenant isolation, recovery).
- Reopening Decision 45's 44-S-B/44-S-E resolutions beyond the
  narrowing described in §1/§5/§6 above.
- Any change to Initial Stock Count's separate governance.
- Treating itself as accepted before §13's signature block is
  completed.

---

# 13. Product Architect Acceptance Boundary

Acceptance of this amendment would mean:

> The Product Architect accepts that Periodic Contagem editing
> authority may be held simultaneously by the Owner/Admin and one
> explicitly delegated Editor, replacing the Single Active Editor
> model's one-writer-at-a-time invariant with a two-authority model,
> subject to a mandatory fresh Rule 8 reassessment before any
> Implementation Plan or Implementation Authorization.

Acceptance would **not** mean:

- a specific conflict-resolution or authority-enforcement mechanism is
  approved;
- the Rule 8 reassessment is already performed or its outcome
  presumed;
- code, schema, or Firestore rules may be changed;
- implementation is authorized.

Those remain governed gates, exactly as they did for Decision 44 and
its Refinement.

---

# 14. Status

**SPECIFICATION AMENDMENT:** DRAFTED — NOT ACCEPTED
**PRODUCT ARCHITECT ACCEPTANCE:** PENDING
**RULE 8:** NOT PERFORMED — a fresh reassessment is mandatory once accepted, per §11
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
