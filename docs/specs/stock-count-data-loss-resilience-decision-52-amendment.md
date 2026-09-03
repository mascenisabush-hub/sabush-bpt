# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 52 — Viewer Authorization Requirements

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** Decision 44-S-A — Viewer Authorization, as
identified in the original [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(Part III §III.3, Part IV §IV.N summary table) and carried forward,
**OPEN — Product Architect decision required**, through every
subsequent reassessment and decision (Decisions 45, 46, 47, 48, 49, 50,
51) without being narrowed or answered by any of them.
**Builds on:** [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md)
(✅ Accepted, authority-model governance requirements), [Decision 49](./stock-count-data-loss-resilience-decision-49-amendment.md)
(✅ Accepted, former-Editor reconnection governance requirements),
[Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, exactly-one finalization governance requirements), and
[Decision 51](./stock-count-data-loss-resilience-decision-51-amendment.md)
(✅ Accepted, shared-device/cache isolation governance requirements) —
this decision assumes and does not restate any of their governance
content; it applies those already-settled principles to the distinct,
previously-unaddressed question of **who is authorized to be a Viewer
and what Viewer participation means**, not to Editor authority,
reconnection, finalization, or context isolation mechanics themselves,
which those five decisions already govern.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, or 51's own
already-settled content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decision 46 established that Owner/Admin is always an Active Editor,
that at most one delegated Editor may exist, and that a former
delegated Editor becomes a Viewer unless explicitly reassigned.
Decisions 48 and 49 established that authority is explicit, current,
attributable, and authoritative across offline/reconnection/
reassignment scenarios. Decision 50 established exactly-one
finalization protection. Decision 51 established shared-device/cache
isolation guarantees across business, user/session, and device
context boundaries. **None of these decisions defines who is
authorized to be a Viewer at all, or what Viewer participation
consists of** — the Rule 8 Assessment has carried 44-S-A as **OPEN**
since it was first identified, unnarrowed by anything decided since.

**This decision does not depend on, and does not restate, the Editor
authority model, the reconnection governance requirements, the
finalization-protection requirements, or the context-isolation
requirements.** It states, exhaustively, who may be a Viewer, what a
Viewer may and must not do, how a former delegated Editor's Viewer
status works, how offline/reconnection and authorization changes are
governed for a Viewer, and how live synchronization and finalization
visibility apply to a Viewer — so that no scenario is left to
inference at the technical design stage.

---

# 2. Who May Be a Viewer — Required Eligibility

1. **Viewer eligibility is a subset of business authorization, not a
   separate identity concept.** A person may be a Viewer of a
   business's active Periodic Contagem only if they are currently
   authorized in relation to that business — this decision does not
   define the technical mechanism for that underlying business
   authorization (an existing or future membership/staff concept), but
   requires that Viewer access be gated by it, not granted
   independently of it.
2. **Owner/Admin is always eligible to view** — this restates, for the
   viewing dimension specifically, Decision 46 §1's "Owner/Admin is
   always an Active Editor" principle: an Owner/Admin's viewing
   eligibility is never in question, since Owner/Admin already has full
   editing authority which necessarily includes the ability to view.
3. **The currently delegated Editor is always eligible to view** — for
   the same reason: current editing authority necessarily includes
   viewing eligibility. This decision does not add any separate Viewer
   qualification on top of holding current delegated Editor status.
4. **Other authorized users** (i.e., users who are authorized in
   relation to the business per item 1, but hold neither Owner/Admin
   nor the currently delegated Editor slot) **are eligible to be
   Viewers, not Editors.** This decision does not invent a new role
   hierarchy beyond the two already-accepted active-editing roles
   (Owner/Admin, delegated Editor) plus Viewer — it does not introduce
   tiers of Viewer, partial-Viewer, or any other intermediate category.
5. **Unauthorized users are not eligible to view at all.** A user with
   no current authorization in relation to the business has no Viewer
   eligibility, regardless of authentication state — restated
   explicitly in §3 below, since this is the crux of 44-S-A.
6. **A former delegated Editor's Viewer eligibility is governed by §6
   below**, not by this section independently — it flows from the same
   "other authorized users are eligible to be Viewers" principle in
   item 4, conditioned on the person remaining otherwise authorized in
   relation to the business.

---

# 3. Viewer Access Must Be Authorized — Required Guarantee

1. **Mere authentication is not sufficient to view a business's active
   Periodic Contagem.** Being a valid, authenticated user of the
   platform in general does not, by itself, grant Viewer eligibility
   for any particular business's Contagem.
2. **A specific, current relationship to the business is required** —
   this decision does not define what that relationship technically
   consists of (an existing or future staff/membership concept), but
   requires that whatever it is, it must be (a) specific to the
   business in question, and (b) current at the time of access, not
   merely held at some point in the past.
3. **This requirement preserves the tenant isolation Decision 51
   already establishes.** Viewer eligibility must never be a route
   around Decision 51's business-isolation guarantee (§2 of that
   decision) — a user authorized in relation to Business A gains no
   Viewer eligibility whatsoever for Business B's Contagem merely by
   virtue of being authenticated or being authorized elsewhere on the
   platform.

---

# 4. Viewer Permissions — Required Definition

A Viewer, once eligible per §2–§3, **may**:

1. **See the active Periodic Contagem** — its existence and current
   state, per §7's live-synchronization requirements.
2. **See live updates** to the active Contagem as Owner/Admin and the
   delegated Editor make them, subject to §7.
3. **See quantities entered by editors**, at the same level of detail
   and timeliness the product's live-synchronization design provides
   to Editors themselves (this decision does not decide whether that
   level is technically identical or intentionally reduced — only that
   whatever is shown must be authoritative or clearly marked otherwise,
   per §7 item 3).
4. **See product rows** that make up the active Contagem.
5. **Observe progress** of the count (e.g., how much of the Contagem
   has been entered) to whatever extent the product surfaces this to
   any participant.
6. **Observe finalization state** — whether the Contagem has been
   finalized, and by extension its finalized outcome once available —
   governed specifically by §8 below.
7. **Refresh/reconnect** and continue viewing without any special
   re-authorization step beyond the ordinary re-evaluation of current
   authorization already required by §9/§10.
8. **Recover the view of an active Contagem after interruption** (a
   dropped connection, a browser restart, or similar), subject to the
   same current-authorization re-evaluation as any other access, and
   subject to Decision 51's context-isolation guarantees governing what
   locally persisted state may or may not resurface.

A Viewer **must not**:

9. Alter any quantity or product-row value.
10. Create or edit any observation.
11. Finalize the Contagem, or take any action that could be mistaken
    for a finalization attempt.
12. Assign, reassign, or otherwise change who holds the delegated
    Editor slot.
13. Change any authority state (Owner/Admin status, delegated Editor
    assignment, or Viewer status of any user).
14. Override, block, or otherwise interfere with an Editor's edit.
15. Exercise any form of Editor authority, however indirectly.

**This decision does not decide the technical mechanism for enforcing
items 9–15** (rules layer, schema-level write restriction, or any
other approach) — only that the enforcement must be authoritative, not
merely a UI-level restriction. §5 states this explicitly.

---

# 5. Viewer Must Not Gain Edit Authority — Required Guarantee

1. **A Viewer's inability to alter quantities, create/edit
   observations, finalize the Contagem, assign another Editor, change
   authority, or override an Editor must be an authoritative,
   server-enforced guarantee — not a UI-only restriction.** A design
   that merely hides edit controls from a Viewer's interface while
   leaving the underlying write path open to a Viewer's session does
   not satisfy this decision.
2. **This applies uniformly to every prohibited action named in §4
   items 9–15**, without exception for convenience, urgency, or any
   claimed special circumstance.
3. **This decision does not decide the technical enforcement
   mechanism** — only that whatever mechanism is chosen must be
   authoritative and must not rely on client-side/UI-only restriction
   as its sole protection, consistent with the same authoritative-
   state-over-client-belief principle Decision 48 §9.2 and Decision 49
   §5 already establish for authority generally.

---

# 6. Former Delegated Editor — Viewer Eligibility

This section applies Decisions 48 and 49's already-accepted principles
to the specific question of Viewer eligibility, without changing either
decision.

1. **When delegated Editor A is reassigned to B, A becomes a Viewer**
   — restating Decision 46 §5.2/§9 and Decision 49 §3.2, not reopening
   either. A's Viewer eligibility is governed by §2 item 4/6 above,
   conditioned on A remaining otherwise authorized in relation to the
   business (§2 item 1/§3).
2. **A does not retain any editing authority as a Viewer** — restating
   Decision 48 §5/§9 and Decision 49 §3, not reopening either. A's
   Viewer status carries none of the permissions §4 reserves to Editors
   and explicitly withholds from Viewers.
3. **A may not regain editing authority merely by reconnecting** —
   restating Decision 49 §3.1/§3.7, not reopening it. A's Viewer
   eligibility and status are unaffected by connectivity events of any
   kind.
4. **A's previously valid historical observations remain valid
   historical data** where already authoritative before reassignment —
   restating Decision 48 §5.5 and Decision 49 §3.5, not reopening
   either. A's current Viewer status has no bearing on the legitimacy
   of A's own past, already-durable contributions.
5. **This decision adds no new eligibility condition beyond "remains
   otherwise authorized in relation to the business."** If A's
   underlying business authorization is itself later revoked (a
   separate event from A's delegated-Editor reassignment), A's Viewer
   eligibility ends per §9 below — but reassignment away from the
   delegated Editor slot, by itself, never removes A's Viewer
   eligibility; it only removes A's Editor authority.

---

# 7. Viewer and Live Synchronization — Required Definition

1. **An authorized Viewer is entitled to receive the current active
   Contagem state and live updates to it**, consistent with Decision
   44's shared-live-data requirement and Decision 47's live-
   synchronization-as-primary-avoidance principle — a Viewer is not a
   second-class participant excluded from the live view merely because
   Viewers cannot edit.
2. **What a Viewer receives must be distinguishable, at the governance
   level, between:**
   - **authoritative current state** — the durable, currently-accepted
     state of the active Contagem, which a Viewer may rely on as
     accurate as of the moment received;
   - **stale local state** — state the Viewer's own client may be
     holding that no longer reflects the authoritative current state
     (e.g., after a dropped connection), which must not be presented to
     the Viewer as though it were still current, consistent with the
     same stale-state principles Decision 49 §5 and Decision 51 §6
     already establish;
   - **historical observations** — the durable record of what was
     entered over the course of the Contagem, which remains valid
     regardless of the Contagem's current live state or the Viewer's
     own connectivity history.
3. **This decision does not prescribe how synchronization is
   technically implemented** (listener design, polling, push
   mechanism, or any other approach) — only that a Viewer's access to
   live state is required at the governance level, and that the three
   concepts in item 2 must remain distinguishable in whatever design is
   eventually chosen.

---

# 8. Viewer and Finalization — Required Definition

Using Decision 50's already-accepted finalization-protection
requirements:

1. **A Viewer may observe that another authorized participant
   (Owner/Admin or the delegated Editor, subject to whatever 44-S-C
   eventually decides about who may finalize) has finalized the
   Contagem**, and may observe the finalized state/outcome once
   available — this is a viewing permission, not a finalization
   permission, and is already covered by §4 items 6 and 3
   respectively.
2. **A Viewer must not be treated as a finalizer merely because they
   can see the Contagem.** Viewing eligibility and finalization
   authority are categorically distinct — a Viewer's ability to observe
   finalization state creates no inference, presumption, or pathway
   toward finalization authority.
3. **A Viewer must not be able to attempt finalization at all** — this
   restates §4 item 11/§5 above, applied specifically to the
   finalization action Decision 50 governs: whatever mechanism Decision
   50's eventual technical design uses to enforce "at most one
   finalization may succeed," a Viewer must never be a party capable of
   making a finalization attempt in the first place, not merely a party
   whose attempt would be rejected.
4. **A Viewer's stale local state after finalization must be governed
   consistently with Decision 50 §4's stale-working-state principle**
   applied to viewing rather than editing: a Viewer whose local state
   has not yet learned that finalization occurred elsewhere must not be
   shown that stale state as though it were still the current,
   unfinalized Contagem — this decision does not decide the technical
   mechanism for detecting or correcting this, per §7 item 3 above.
5. **This decision does not resolve 44-S-C (finalizer authorization)
   — which of Owner/Admin or the delegated Editor may finalize at
   all.** That question remains entirely separate and open; this
   decision only establishes that a Viewer is categorically excluded
   from being a candidate finalizer, regardless of how 44-S-C is
   eventually decided.

---

# 9. Viewer Authorization Changes — Required Guarantee

1. **If a person's underlying authorization to access the business
   changes, the current authoritative authorization controls all
   future access** — whether the person is online, offline, actively
   viewing, or in the process of reconnecting at the moment the change
   occurs.
2. **A revoked Viewer must lose Viewer access** — this decision does
   not decide the technical timing or mechanism of how quickly that
   takes effect, but requires that once the change is authoritative,
   continued access on the strength of the prior authorization is not
   permitted, consistent with the same current-state-governs principle
   Decision 48 §9.2, Decision 49 §5, and Decision 51 §6/§9 already
   establish for their respective domains.
3. **A newly-authorized person gains Viewer access** according to §2's
   eligibility rule, once their authorization is current — no
   additional Viewer-specific qualification is introduced by this
   decision beyond current business authorization.
4. **No automatic role takeover or new authority-transfer behavior is
   introduced by this decision.** A change in Viewer authorization
   never, by itself, grants or removes Editor authority (governed
   exclusively by Decisions 46/48/49) or finalizer authority (governed
   by Decision 50, pending 44-S-C) — those remain entirely separate
   questions, evaluated by their own governing decisions, not inferred
   from a Viewer-authorization change.
5. **Offline status does not change this outcome** — restating, for
   Viewer authorization specifically, the same offline-neutrality
   principle Decision 46 §5/§7, Decision 48 §7, Decision 49 §2, and
   Decision 50 §8 already establish: an offline Viewer whose
   authorization is revoked while offline has no Viewer access upon
   reconnection, and an offline Viewer whose authorization remains
   current is not required to be "re-granted" access merely for having
   been offline.

---

# 10. Shared-Device Isolation — Required Guarantee

1. **A Viewer must never see Contagem state merely because it exists
   in local persistence on a shared device.** This restates and applies
   Decision 51's already-accepted context-isolation guarantees (in
   particular §2, §3, and §6 of that decision) to the Viewer-access
   question specifically: local persistence is never itself a source
   of Viewer authorization.
2. **Access must depend on current authoritative authorization/
   context, evaluated at the moment of access** — not on what a given
   device happens to be holding in durable local storage, and not on
   what business/session/user context was active when that data was
   persisted.
3. **This decision does not decide the technical mechanism** for
   achieving this (storage keying, cache clearing, or any other
   approach named as open in Decision 51 §12) — it only requires that
   whatever mechanism Decision 51's eventual technical design produces
   also correctly governs the Viewer-access case, not only the Editor-
   access case.

---

# 11. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage or separate-governance-stage
questions:

- Any Firestore rules, authentication implementation, role claims,
  database schema, query, index, or security-rule expression for
  determining or enforcing Viewer eligibility or restrictions.
- Any UI implementation of what a Viewer sees, how it differs
  presentationally from an Editor's view, or how a stale-state/
  finalization notice is communicated to a Viewer.
- Any invitation mechanism or membership-table design for the
  underlying business authorization §2/§3 require but do not define.
- Any technical live-synchronization mechanism (§7).
- Any technical mechanism for the same-row conflict detection Decision
  47 governs at the product level (unaffected by this decision).
- Any technical finalization-protection mechanism (Decision 50,
  unaffected by this decision).
- Any technical cache-isolation mechanism (Decision 51, unaffected by
  this decision).
- Any technical authority-enforcement mechanism (Decisions 46/48/49,
  unaffected by this decision).

---

# 12. Explicit Non-Goals

Decision 52 does not authorize, and does not resolve:

- **44-S-C — Finalizer Authorization** — which of Owner/Admin or the
  delegated Editor may finalize at all remains entirely open and
  separate.
- **The eligible-delegate pool question** (§IV.O of the Rule 8
  Assessment) — who may be assigned as delegated Editor remains open
  and separate.
- **The delegated-Editor `firestore.rules` authorization mechanism** —
  a technical design question, unaffected by this decision.
- **Any technical live-synchronization mechanism.**
- **Any technical same-row conflict-detection mechanism.**
- **Any technical finalization-protection mechanism.**
- **Any technical cache-isolation mechanism.**
- **Any technical authority-enforcement mechanism.**
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, 48, 49, 50, or 51's own
  already-settled content.
- Any Implementation Plan or Implementation Authorization.

---

# 13. Effect on Rule 8

Per the Rule 8 Assessment (Part IV §IV.N summary table, and its
carrying-forward through §IV.O, §IV.Q, §IV.R across every subsequent
part), 44-S-A (Viewer authorization) was identified as **OPEN —
Product Architect decision required**, and remained unnarrowed by
Decisions 45 through 51. This document establishes the
**governance-requirement layer** 44-S-A requires — it does **not**
introduce any new technical mechanism, and does **not** move any Part
IV CRITICAL/HIGH technical finding to RESOLVED, since 44-S-A was never
itself classified as a CRITICAL/HIGH technical finding — it was a
distinct, open Product Architect decision. Now that this decision is
accepted:

- **44-S-A is RESOLVED at the Product Architect governance-requirement
  level.** The open item in the Rule 8 Assessment's summary table and
  decision lists (§IV.N, §IV.Q, §IV.R) now has a settled governance
  answer. **The technical enforcement/mechanism for Viewer eligibility
  and restriction remains STILL OPEN** — this decision selects no
  Firestore rules, authentication mechanism, schema, UI, cache
  mechanism, or live-sync mechanism.
- **44-S-C, the eligible-delegate-pool question, and every CRITICAL/
  HIGH technical finding in §IV.P** are entirely unaffected — none of
  them is a Viewer-authorization question, and none is resolved,
  narrowed, or reclassified by this decision.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY.
- **This acceptance does not constitute Implementation Authorization**
  and does not amend the Implementation Plan.

**This document itself does not modify the Rule 8 assessment's
classification of any finding or open decision.** Per this task's
instruction, only a pointer/status note identifying Decision 52 as
accepted for 44-S-A's governance-requirement layer is added to the Rule
8 artifact, not a reclassification of any finding or decision.

---

# 14. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** 44-S-A now RESOLVED at the Product Architect
governance-requirement level; the technical enforcement/mechanism
remains OPEN. Verdict remains READY AFTER DECISIONS — see the Rule 8
artifact's own updated record of this decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED — this acceptance does
not constitute Implementation Authorization
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the Viewer-authorization governance
requirements in §2–§10 above (Viewer eligibility limited to
business-authorized users, with Owner/Admin and the currently delegated
Editor always eligible and unauthorized users never eligible; mere
authentication insufficient, tenant isolation per Decision 51
preserved; the full Viewer permission/prohibition set, with
edit-authority exclusion required to be authoritative and
server-enforced, never UI-only; former-delegated-Editor Viewer
eligibility applying Decisions 48/49 unchanged; Viewer entitlement to
live synchronization with authoritative state, stale local state, and
historical observations kept distinguishable; Viewer visibility into
finalization state with no finalizer inference and 44-S-C untouched;
Viewer-authorization-change handling online/offline/reconnecting with
no automatic role takeover; shared-device isolation applied to Viewer
access per Decision 51) are adopted as the governing requirements
44-S-A's eventual technical enforcement/design must satisfy. The
technical mechanism itself is explicitly NOT decided by this acceptance
and remains open, per §11/§12 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, 49, 50, and 51
were each accepted. This acceptance does not authorize implementation,
`firestore.rules` changes, schema changes, UI changes, code changes,
tests, a technical mechanism for Viewer-eligibility representation or
enforcement, an Implementation Plan amendment, or an Implementation
Authorization. The Rule 8 verdict remains READY AFTER DECISIONS — every
CRITICAL/HIGH technical finding in §IV.P, including Finding K
(shared-device/cache isolation, still UNVERIFIED), remains exactly as
classified and unaffected by this decision. 44-S-C (finalizer
authorization) and the eligible-delegate-pool question are unaffected
by this decision and remain exactly as open as before.
