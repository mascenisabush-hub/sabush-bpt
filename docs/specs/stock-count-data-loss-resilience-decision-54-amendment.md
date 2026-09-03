# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 54 — Delegated Editor Eligibility & Selection Requirements

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** The eligible-delegate-pool question, as
identified in the original [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(Part IV §IV.O, "A Narrow Governance Gap Discovered, Not an
Inconsistency") and carried forward, **OPEN — narrow, non-blocking,
still open**, through every subsequent decision (Decisions 45 through
53) as the last remaining fully open Product Architect question, per
Decision 53's own §14/§IV.O-g.
**Builds on:** [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md)
(✅ Accepted, authority-model governance requirements), [Decision 49](./stock-count-data-loss-resilience-decision-49-amendment.md)
(✅ Accepted, former-Editor reconnection governance requirements),
[Decision 51](./stock-count-data-loss-resilience-decision-51-amendment.md)
(✅ Accepted, shared-device/cache isolation governance requirements),
and [Decision 52](./stock-count-data-loss-resilience-decision-52-amendment.md)
(✅ Accepted, Viewer authorization governance requirements) — this
decision assumes and does not restate, reinterpret, or modify any of
their governance content. It answers exactly one question those
decisions left open: **who is eligible for the Owner/Admin to select as
the single delegated Editor** — not who decides (already settled: only
Owner/Admin, per Decision 46 §1), not how many delegated Editors may
exist at once (already settled: at most one, per Decision 46/48), and
not what happens once someone is selected or reassigned (already
settled: Decisions 46/48/49).
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, or
53's own already-settled content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decisions 45 and 46 resolve **who decides** who may edit — Owner/Admin,
exclusively — but neither states **which pool of users is eligible to
be selected** as the delegated Editor. The Rule 8 Assessment named this
narrow, non-blocking gap in Part IV §IV.O and it has remained open
through every subsequent decision. Now that Decisions 46 through 53
have settled every other governance-requirement question, this is the
sole remaining fully open Product Architect decision.

**This decision answers only the eligibility question.** It does not
touch who selects (Owner/Admin, unchanged), how the selection is
exercised technically, or any of the authority-transition mechanics
Decisions 46, 48, and 49 already govern. Per its own core principle,
this decision deliberately avoids introducing a complicated
delegate-pool model — it establishes the single eligibility
requirement the existing governance context actually calls for, and no
more.

---

# 2. Who the Owner/Admin May Select — Required Eligibility

1. **The Owner/Admin may select, as the delegated Editor, any user who
   is currently authorized in relation to the same business** — the
   same category of "business-authorized user" Decision 52 §2 item 1
   already establishes for Viewer eligibility, not a new or separate
   concept invented by this decision.
2. **This decision does not introduce a narrower eligibility tier
   than "currently business-authorized."** The Owner/Admin's selection
   authority is not restricted to a subset of business-authorized users
   defined by role, title, or any other distinguishing factor beyond
   current business authorization itself. Per this decision's own core
   principle (avoid unnecessary eligibility tiers), no such narrower
   tier is created here.
3. **Mere platform authentication is not sufficient eligibility** —
   restating, for delegate eligibility specifically, the same principle
   Decision 52 §3 item 1 already establishes for Viewer eligibility: a
   person must be authorized in relation to the specific business, not
   merely an authenticated platform user in general.
4. **This decision does not decide, narrow, or expand any existing or
   future technical tiering of "business-authorized"** (for example,
   any staff-tier concept referenced elsewhere in the Rule 8
   Assessment). Whether "business-authorized" is technically
   implemented as a single flat category or further subdivided by tier
   is a separate, already-identified open question (Decision 44-A,
   Staff Access) that this decision neither resolves nor depends on
   resolving — this decision's eligibility requirement is stated at the
   governance level ("currently business-authorized"), and applies
   however that category is technically defined.

---

# 3. Business Scope — Required Guarantee

1. **Delegated Editor eligibility is tied to the specific business.**
   A person's authorization in relation to Business A does not, by
   itself or automatically, make them eligible for delegation in
   Business B.
2. **This restates and applies Decision 51's tenant-isolation
   guarantee to the delegation-eligibility question specifically** —
   not reopening Decision 51, but confirming that delegate eligibility
   is never a route around it. An Owner/Admin of Business B may not
   select, as Business B's delegated Editor, a person whose only
   business authorization is in relation to Business A.
3. **A person authorized in relation to multiple businesses is
   eligible for delegation independently in each business they are
   authorized in relation to** — eligibility is evaluated per business,
   not globally across the platform.

---

# 4. Owner/Admin's Selection Authority — Explicit Confirmation

1. **The Owner/Admin selects the delegated Editor** — restating
   Decision 46 §1's "only Owner/Admin may assign/change the delegated
   Editor" principle, not reopening it. This decision adds no second
   selecting authority.
2. **The Owner/Admin may replace the delegated Editor** — restating
   Decision 46 §5's reassignment mechanics, not reopening them.
3. **There is at most one delegated Editor at a time** — restating
   Decision 46 §1/Decision 48 §3's "at most one delegated Editor slot"
   principle, not reopening it. This decision does not introduce any
   concept of multiple simultaneous delegates.
4. **Delegation is explicit, never automatic.** No user becomes the
   delegated Editor by any means other than an explicit Owner/Admin
   selection — restating Decision 46/48's "assignment must be explicit
   and current" principle, not reopening it. This decision does not
   introduce automatic delegation, automatic takeover, or any
   selection mechanism other than an explicit Owner/Admin act.

---

# 5. Terminology — Preserving the Existing Owner/Admin Model

1. **This decision uses "Owner/Admin" exactly as every prior accepted
   decision in this chain (44, 45, 46, 48, 49, 50, 51, 52, 53) uses
   it** — as a single combined authority, not as two separately defined
   roles. Nowhere in the accepted governance record is "Owner" defined
   as distinct from "Admin" with separately scoped authority; the
   governance chain has consistently treated "Owner/Admin" as one
   inherent-authority concept.
2. **This decision does not silently expand delegated-Editor selection
   authority to a separately defined "Admin" role**, because no such
   separately defined role exists anywhere in the accepted governance
   record for this decision to expand into. If the term "Owner" is used
   informally elsewhere (including in this decision's own title, which
   follows the task's framing) to refer to the selecting authority, it
   refers to the same "Owner/Admin" inherent authority Decision 46 §1
   and Decision 48 §2 already establish — not a narrower or different
   concept.
3. **Should the accepted governance record ever distinguish Owner from
   Admin as separately scoped authorities in the future, this
   decision's selection-authority requirement would need to be
   explicitly revisited** — this decision does not anticipate or
   pre-decide that outcome; it simply preserves the existing, unified
   Owner/Admin model exactly as accepted.

---

# 6. Loss of Current Authorization — Required Guarantee

1. **If the selected delegated Editor is no longer authorized within
   the business, this decision does not treat the delegation itself as
   an independent source of continued business membership or
   authorization.** The delegated-Editor assignment is derivative of,
   and dependent on, the person's underlying business authorization —
   restating, for eligibility specifically, the same
   derivative-authority principle Decision 48 §2 already establishes
   for delegated authority generally.
2. **A delegated Editor whose underlying business authorization ends
   does not remain eligible to hold the delegated Editor slot merely
   because they were previously selected.** The governance requirement
   is that current business authorization is a continuing condition of
   delegated-Editor eligibility, not a one-time gate checked only at
   the moment of selection.
3. **This decision does not decide the technical mechanism** for
   detecting or acting on a loss of underlying business authorization
   (whether the delegated-Editor assignment is technically
   auto-revoked, flagged, or handled some other way) — it states only
   the governance requirement that a person who is no longer
   business-authorized is no longer delegate-eligible, and that the
   delegation itself confers no independent authorization that would
   allow them to remain so.

---

# 7. Former Delegated Editor — Applying Decisions 48/49 Unchanged

When A is replaced by B as the delegated Editor:

1. **A ceases to be the delegated Editor** — restating Decision 46
   §5.1, not reopening it.
2. **A becomes a Viewer, if A remains otherwise business-authorized**
   — restating Decision 46 §5.2 and Decision 52 §6, not reopening
   either.
3. **A cannot regain delegated authority merely by reconnecting** —
   restating Decision 49 §3.1/§3.7, not reopening it.
4. **Only a new, explicit Owner/Admin selection can make A the
   delegate again.** A's prior history of having held the delegated
   Editor slot creates no standing eligibility advantage, priority, or
   automatic path back to delegation — restating this decision's own
   §4 item 4 (delegation is always explicit), applied to the specific
   case of a former delegate.

---

# 8. Offline Eligibility

**Scenario A:** Owner/Admin selects A as delegated Editor. A goes
offline.

1. **A remains the delegated Editor while the assignment remains
   current** — restating Decision 46 §7/Decision 48 §7/Decision 49 §2's
   offline-neutrality principle, not reopening any of them. Offline
   status, by itself, has no bearing on A's continued eligibility or
   continued delegated status.

**Scenario B:** A is offline. The Owner/Admin selects B.

2. **A's old assignment ends immediately; B becomes the current
   delegated Editor** — restating Decision 46 §5/Decision 49 §3, not
   reopening either. A's offline status does not delay, block, or
   otherwise affect the Owner/Admin's ability to make a new selection.
3. **No automatic takeover is introduced by either scenario** —
   restating Decision 46 §7 item 5, not reopening it. A's going offline
   never itself causes B (or anyone else) to acquire delegated
   authority, and the Owner/Admin's new selection of B is never itself
   triggered or required by A's offline status — it remains an
   independent, explicit Owner/Admin act under §4 above.

---

# 9. Re-Selection of a Former Delegate

1. **The Owner/Admin may later select a former delegated Editor
   again**, provided that person remains (or is again) currently
   business-authorized per §2/§6 above. Having previously held the
   delegated Editor slot creates no ineligibility, exactly as it
   creates no standing advantage (§7 item 4).
2. **This re-selection is permitted only through a new, explicit
   Owner/Admin action** — restating §4 item 4 and §7 item 4: no
   automatic restoration of a former delegate's status occurs under any
   circumstance this decision anticipates, including reconnection,
   passage of time, or the departure of the person who replaced them.
3. **A re-selection is governed identically to any other selection** —
   this decision does not create a special "returning delegate"
   category with different rules from a first-time selection.

---

# 10. Multiple Candidates — At Most One Actually Delegated

1. **Multiple business-authorized users may simultaneously be eligible
   for delegation.** This decision does not require, and does not
   create, a constraint that only one person may ever be eligible to be
   selected — eligibility (§2) may be held by any number of
   business-authorized users at once.
2. **At most one person is actually delegated at any given time** —
   restating Decision 46 §1/Decision 48 §3, not reopening either. The
   Owner/Admin's explicit selection determines which one eligible
   person currently occupies the single delegated Editor slot; it does
   not narrow who else remains eligible to be selected in the future.
3. **Being eligible and being currently delegated are categorically
   distinct** — restating and applying the separation named in this
   decision's own required conceptual separation (§11 below).

---

# 11. Viewer Versus Delegate Eligibility — Required Separation

The following remain categorically distinct at every layer of eventual
design, and none may be collapsed into another:

1. **Eligible to be selected** — any user currently business-authorized
   in relation to the business (§2), independent of whether they are
   ever actually selected.
2. **Currently selected** — the specific person the Owner/Admin has
   most recently and explicitly designated as delegated Editor,
   evaluated at the moment in question.
3. **Currently delegated** — the same concept as "currently selected"
   from the delegate's own side: the one person, at any given moment,
   who holds active delegated-Editor authority per Decision 46/48.
4. **Viewer** — the authorization status (Decision 52) held by every
   business-authorized user who is not currently Owner/Admin or the
   currently delegated Editor, including every eligible-but-not-selected
   candidate and every former delegate who remains business-authorized.
5. **Owner/Admin** — the inherent, non-derivative authority (Decision
   46/48) that both selects the delegated Editor and is never itself
   subject to this decision's eligibility requirement (Owner/Admin's
   own authority does not depend on being "selected" by anyone).

**Being a Viewer never itself means someone is currently the delegated
Editor**, and being eligible for delegation never itself means someone
is currently delegated, selected, or entitled to be selected next. Each
of the five concepts above is evaluated independently, at the moment in
question, against the current authoritative state.

---

# 12. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage or separate-governance-stage
questions:

- Any technical implementation of delegation (schema, data model, or
  otherwise).
- Any Firestore security-rule implementation of the eligibility or
  selection requirements this decision establishes.
- Any authentication-claims design.
- Any membership-schema design for representing business authorization
  itself (the underlying concept §2/§3 require but do not define).
- Any invitation mechanism.
- Any UI implementation of how the Owner/Admin selects, replaces, or
  views eligible candidates.
- Any cache-isolation mechanism (Decision 51, unaffected).
- Any live-synchronization mechanism (Decision 47, unaffected).
- Any same-row conflict-detection mechanism (Decision 47, unaffected).
- Any finalization-authorization question (Decision 53, unaffected) or
  finalization mechanism, including the exactly-one-finalization
  mechanism (Decision 50, unaffected).
- **Decision 44-A (Staff Access)** — whether "business-authorized" is
  further technically subdivided by tier (e.g., an elevated
  `staffTier` concept) remains a separate, already-identified open
  question this decision does not resolve or depend on.

---

# 13. Explicit Non-Goals

Decision 54 does not authorize, and does not resolve:

- Any technical implementation of delegation.
- Any `firestore.rules` change.
- Any authentication-claims design.
- Any membership-schema design.
- Any invitation mechanism.
- Any UI implementation.
- Any cache-isolation mechanism.
- Any live-synchronization mechanism.
- Any conflict-detection mechanism.
- Any finalization-authorization question or finalization mechanism.
- **Decision 44-A (Staff Access) / any staff-tier design.**
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, or 53's own
  already-settled content.
- Any Implementation Plan or Implementation Authorization.

---

# 14. Effect on Rule 8

Per the Rule 8 Assessment (Part IV §IV.O), the eligible-delegate-pool
question was identified as a **narrow, non-blocking governance gap —
OPEN**, distinct from and never elevated to the status of a Rule 8
CRITICAL/HIGH technical finding. It remained the sole fully open
Product Architect question since Decision 53's acceptance (per Decision
53 §14/§IV.O-g). This document resolves that question at the
governance level — it does **not** introduce any new technical
mechanism, and does **not** move any Part IV CRITICAL/HIGH technical
finding to RESOLVED, since the eligible-delegate-pool question was
never itself classified as one. Now that this decision is accepted:

- **The eligible-delegate-pool question is RESOLVED — GOVERNANCE
  REQUIREMENTS, at the Product Architect governance-requirement
  level.** The open item in the Rule 8 Assessment (§IV.O, and its
  carrying-forward through §IV.Q/§IV.R) now has a settled governance
  answer: any currently business-authorized user, in relation to the
  specific business, is eligible; the Owner/Admin selects explicitly;
  at most one delegate at a time. **All technical
  implementation/enforcement mechanisms remain STILL OPEN** — this
  decision selects no schema, `firestore.rules` implementation,
  authentication-claims design, membership-schema design, invitation
  mechanism, or UI implementation.
- **Every CRITICAL/HIGH technical finding in §IV.P** — including
  Finding A/B (delegated-Editor `firestore.rules` support, still
  entirely absent), Finding E (finalization uniqueness), and Finding K
  (cache isolation, still UNVERIFIED) — is entirely unaffected: none of
  them is resolved, narrowed, or reclassified by this decision.
  Governance acceptance does not turn any technical finding into PASS.
- **Decision 44-A (Staff Access)** remains entirely separate and
  unaffected — this decision does not resolve, narrow, merge into, or
  depend on it. Any other separate staff-tier question in the Rule 8
  artifact remains distinct.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY.
- **This document leaves zero fully open Product Architect governance
  questions** among everything Part IV originally identified as
  requiring one (44-S-A, 44-S-C, 44-S-D, 44-S-F, 44-S-G, 44-D, 44-F,
  and the eligible-delegate-pool question) — all eight now have settled
  governance answers. Every corresponding technical mechanism (and, for
  44-F, the named technical verification, and for the delegated-Editor
  role generally, the entirely-absent `firestore.rules` branch) remains
  separately required before Rule 8 can move toward READY.
- **This acceptance does not constitute Implementation Authorization**
  and does not amend the Implementation Plan.
- **All previously accepted decisions (44, 46, 47, 48, 49, 50, 51, 52,
  53) remain substantively unchanged** — this acceptance does not
  reopen, reinterpret, weaken, or expand any of them; it only confirms
  the Owner/Admin terminology and authority model exactly as those
  decisions already established.

**This document itself does not modify the Rule 8 assessment's
classification of any finding or open decision.** Per this task's
instruction, only a pointer/status note identifying Decision 54 as
accepted for the eligible-delegate-pool question is added to the Rule 8
artifact, not a reclassification of any finding or decision.

---

# 15. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** The eligible-delegate-pool question is now RESOLVED —
GOVERNANCE REQUIREMENTS at the Product Architect governance-requirement
level. All technical implementation/enforcement mechanisms remain
OPEN. Verdict remains READY AFTER DECISIONS — see the Rule 8 artifact's
own updated record of this decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED — this acceptance does
not constitute Implementation Authorization
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the delegated-Editor eligibility and
selection governance requirements in §2–§11 above are adopted, in
particular: **the Owner/Admin is the authority who explicitly selects
the delegated Editor**, consistent with the existing accepted authority
model (Decisions 46/48), and this decision introduces no second
selecting authority; **the selected person must be currently
business-authorized for that specific business** — mere platform
authentication is insufficient, and authorization in one business does
not create delegation eligibility in another business, preserving
Decision 51's tenant isolation; **at most one person is actually
delegated at a time**; **delegation is explicit, never automatic**;
**reassignment/re-selection requires a new, explicit Owner/Admin
action**; **a former delegate does not regain delegation merely by
reconnecting** (restating Decision 49, not reopening it); **a former
delegate may be selected again only through a new explicit delegation
action**, with no standing advantage from having held the role before;
**offline status does not create or transfer delegation authority**,
in either direction; and **no unnecessary eligibility tier is
introduced** — eligibility is exactly "currently business-authorized,"
with any further technical subdivision (e.g. Decision 44-A's
staff-tier question) left entirely separate and unresolved. The
"Owner/Admin" terminology and substance already accepted in Decisions
46 and 48 is preserved exactly, with no silent expansion of selection
authority to a separately defined "Admin" role. The technical mechanism
itself — schema, `firestore.rules` implementation, authentication
claims, membership design, invitation mechanism, and UI — is explicitly
NOT decided by this acceptance and remains open, per §12/§13 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52,
and 53 were each accepted. This acceptance does not authorize
implementation, `firestore.rules` changes, schema changes, UI changes,
code changes, tests, a technical mechanism for delegation
representation or enforcement, an Implementation Plan amendment, or an
Implementation Authorization. The Rule 8 verdict remains READY AFTER
DECISIONS — every CRITICAL/HIGH technical finding in §IV.P, including
Finding A/B (delegated-Editor `firestore.rules` support, still entirely
absent), Finding E (finalization uniqueness), and Finding K
(shared-device/cache isolation, still UNVERIFIED), remains exactly as
classified and unaffected by this decision. Decision 44-A (Staff
Access) is unaffected by this decision and remains exactly as open and
separate as before. All previously accepted decisions (44, 46, 47, 48,
49, 50, 51, 52, 53) remain substantively unchanged.
