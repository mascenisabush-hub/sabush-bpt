# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 50 — Exactly-One Finalization Protection

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** Decision 44-D — Finalization Guard / Exactly-One
Finalization, as identified in the original [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(Part I §L, Part III §III.7, Part IV §IV.E) and carried forward,
unresolved, through every subsequent reassessment and decision
(Decisions 45, 46, 47, 48, 49) as "orthogonal to the Editor/authority
model" and "highest remaining priority, unreduced."
**Builds on:** [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 47](./stock-count-data-loss-resilience-decision-47-amendment.md)
(✅ Accepted, live-sync-as-primary-avoidance), [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md)
(✅ Accepted, authority-model governance requirements), and
[Decision 49](./stock-count-data-loss-resilience-decision-49-amendment.md)
(✅ Accepted, former-Editor reconnection governance requirements) — this
decision assumes and does not restate any of their governance content;
it applies to the distinct, previously-unaddressed question of what the
system must guarantee at the **finalization** moment specifically, not
at the ongoing-editing moment those four decisions govern.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, or 49's own
already-settled content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decision 44's own §9/§21 no-silent-loss requirement, and the Rule 8
Assessment's own findings (Part I §L, Part III §III.7, Part IV §IV.E),
identify a gap that is **independent of the Editor/authority model**
Decisions 46, 48, and 49 govern: even a single, correctly-authorized
editor can, across multiple devices or sessions, independently
generate two different finalization identities (`submissionId`) for
the same active Periodic Contagem, and nothing in the current
architecture — nor in Decisions 46–49 — prevents two such attempts from
each producing a separate, competing "finalized" result.

**This decision does not depend on, and does not restate, the
Owner/Admin + delegated Editor authority model.** Whether one person
finalizes twice from two devices, or Owner/Admin and the delegated
Editor each attempt to finalize once, the required product guarantee is
the same: **at most one finalization may succeed for a given active
Periodic Contagem.** This decision states that guarantee, and the
required treatment of every scenario around it, exhaustively — so that
no scenario is left to inference at the technical design stage.

---

# 2. Exactly-One Finalization — Required Meaning

1. **A given active Periodic Contagem may be successfully finalized
   at most once.** "Active" here means the specific physical count
   cycle the draft represents — not a per-device, per-session, or
   per-`submissionId` unit. Two devices working the *same* active
   Contagem are working the *same* thing to be finalized, not two
   finalizable things.
2. **"Successfully finalized" means the authoritative finalized
   record (the `stockCounts` entry this Contagem produces) has been
   durably created and is recognized as the authoritative outcome of
   that Contagem.** Once that has occurred, the active Contagem is no
   longer open to further finalization attempts, by any editor, on any
   device.
3. **A second, third, or Nth finalization attempt against the same
   already-finalized Contagem is not a second legitimate finalization.**
   It is an attempt against something that is no longer open to being
   finalized, regardless of which authorized editor makes the attempt,
   how the attempt is technically structured, or how soon after the
   first finalization it occurs.
4. **This requirement does not depend on how many devices, sessions,
   or authorized editors exist.** It holds identically whether the
   second attempt comes from the same person's second device, from the
   Owner/Admin, or from the currently delegated Editor.

---

# 3. First Successful Finalization — Required Outcome

1. **Once one authorized editor's finalization attempt succeeds, the
   resulting finalized record is the sole authoritative outcome of that
   Contagem.** No other finalization attempt against the same Contagem
   may produce a second authoritative record.
2. **Any editor who subsequently attempts to finalize the same
   Contagem must be prevented from producing a second finalized
   record.** The required product behavior is rejection or equivalent
   safe non-effect on the authoritative state — not silent success, not
   silent overwrite, and not the creation of a second, competing
   `stockCounts` entry.
3. **The editor whose later attempt is prevented must not be left
   believing their attempt silently succeeded.** Whatever technical
   form this takes (an error, a redirect to the now-finalized result, a
   notice), the governing requirement is only that the editor's own
   local state must not remain, uncorrected, at odds with the true
   authoritative outcome. The technical form of that communication is
   not decided here.
4. **The active Contagem draft itself, once finalized, is no longer
   the "current active Contagem" for any subsequent editing or
   finalization purpose** — restating Decision 44's own draft-lifecycle
   intent, applied specifically to the moment finalization succeeds,
   not deciding the technical mechanism (deletion, archival, a status
   flag, or otherwise) by which that is represented.

---

# 4. Stale Working State — Required Outcome

Device A has stale local working state (it has not yet learned that
Device B — or a different session of the same editor — has already
finalized the Contagem).

1. **A's stale local working state has no authority to finalize.** The
   fact that A's own screen still shows the Contagem as open and
   editable does not make it so; authority to finalize is determined by
   the current authoritative state, not by what any one client's local
   state currently displays — the same principle Decision 48 §9.2 and
   Decision 49 §5 already establish for ongoing-editing authority,
   applied here to the finalization action specifically.
2. **A's stale local state must be rejected as a basis for
   finalization, not treated as current.** An attempt to finalize made
   from stale local state is governed identically to §3 item 2 above:
   it must not be allowed to produce a second finalized record.
3. **This holds regardless of why A's state is stale** — offline,
   slow network, a backgrounded tab, or any other cause. The required
   outcome does not vary by cause; only the eventual technical
   detection mechanism (not decided here) may vary by cause.

---

# 5. Pending Writes — Required Outcome

An editor has pending autosave/write activity (locally queued,
not-yet-durable observations) at the moment another editor's
finalization succeeds.

1. **Pending writes that have not yet become durable/authoritative
   before finalization succeeds must not be able to recreate, mutate,
   or finalize the already-finalized Contagem after the fact.** This is
   the finalization-specific application of the same principle Decision
   49 §3.6/§4 already establishes for ongoing-authority writes: a write
   attempting to land after the state it targets is no longer open must
   not be accepted as though nothing had changed.
2. **This applies independently of whether the pending write is a
   routine observation autosave or a finalization attempt itself.**
   Neither may succeed against an already-finalized Contagem.
3. **A pending write that had already become durable/authoritative
   *before* the finalization moment is not affected by this section** —
   it is governed by §6 below, not discarded or treated as suspect
   merely because it was still "pending" from the submitting editor's
   own local perspective.
4. **This decision does not decide the technical mechanism** for
   determining "already durable before finalization" versus "pending
   at the moment of finalization" — that boundary must be well-defined
   and checkable at the technical design stage, per §9 below, exactly
   as Decision 49 §4 left the analogous boundary open for reconnection.

---

# 6. Finalization Versus Historical Observations — Required Separation

Finalization protection exists to prevent a second, competing
finalized record — **it must never be used as a justification for
discarding or discounting legitimate historical observation data.**

1. **Observations durably accepted before finalization** — quantities
   any authorized editor validly entered and that had already become
   durable/authoritative state before the finalization moment — are
   part of the legitimate record of that Contagem and must be reflected
   in (not excluded from) the finalized result. Finalization protection
   governs *which finalization attempt succeeds*, never *which
   already-durable observations are included* in the one that does.
2. **Stale local state** (§4) has no authority over finalization and
   must not be permitted to produce a second finalized record — but
   this is a statement about finalization authority, not a statement
   that observations previously and validly entered from that same
   device are invalid; those observations, if already durable, are
   governed by item 1, not discounted merely because the device's
   *current* local state is stale.
3. **Pending/not-yet-authoritative writes** (§5) must not be able to
   land as part of, or trigger, a finalization after the authoritative
   finalization has already occurred — this is a statement about
   timing and authority, not a judgment on the legitimacy of what those
   writes contained.
4. **A finalization attempt** (successful or rejected) is a distinct
   event from both of the above — it is the act of attempting to close
   out the Contagem, evaluated against the current authoritative state,
   not a data-entry event in itself.

**These four — durable observation, stale local state, pending write,
and finalization attempt — must never be conflated.** A design that
excludes a legitimately-durable observation from the finalized record
because the submitting device later went stale would violate item 1. A
design that allows a late pending write to silently reopen or mutate an
already-finalized Contagem would violate item 3. Both are explicitly
prohibited by this decision.

---

# 7. Authorization — No New Model Introduced

1. **This decision does not introduce, modify, or reinterpret the
   authority model established by Decision 46 and governed by Decision
   48 (and, for reconnection, Decision 49).** Owner/Admin and the
   currently delegated Editor remain the only two roles that may be
   legitimate active editors; nothing in this decision expands,
   narrows, or restates who may hold those roles or how authority
   transitions between them.
2. **Both Owner/Admin and the currently delegated Editor are
   contemplated as potential finalizers by this decision's scenarios**
   — this decision does not decide **which** of the two roles is
   permitted to finalize at all (that question is 44-S-C, explicitly
   out of scope here, per §10) — it decides only what must happen when
   more than one finalization attempt occurs, whoever is permitted to
   make them.
3. **Every requirement in §2–§6 applies uniformly regardless of which
   authorized role makes which attempt** — this decision does not
   create a scenario where Owner/Admin's finalization attempt is
   treated more or less authoritatively than the delegated Editor's
   merely because of role, beyond whatever 44-S-C eventually decides
   about who may attempt finalization at all.

---

# 8. Offline Behavior — Required Outcome

1. **An editor may be offline at any point before, during, or after
   another device's finalization succeeds. Offline status alone does
   not transfer, remove, suspend, or grant finalization authority** —
   restating the same offline-neutrality principle Decision 46 §5/§7,
   Decision 48 §7, and Decision 49 §2 already establish for ongoing
   editing authority, applied here to finalization specifically.
2. **An offline editor who later reconnects and attempts to finalize a
   Contagem that was finalized by another device while they were
   offline must be treated exactly as §3 item 2 and §4 require** — the
   attempt must not succeed in producing a second finalized record, and
   reconnection itself has no bearing on this outcome, consistent with
   Decision 49 §3.7's "reconnection is an event about connectivity,
   never about authority" principle, extended here to finalization
   authority specifically.
3. **This decision does not decide how or when an offline client
   learns that finalization has already occurred elsewhere** — the
   detection mechanism and its timing are technical design questions,
   per §9 below. The governing requirement is only the outcome: the
   offline-turned-reconnecting client's finalization attempt must not
   succeed against an already-finalized Contagem, however and whenever
   that fact becomes known to the client.

---

# 9. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage questions:

- Any Firestore transaction, security-rule implementation, revision
  number, lease, lock, compare-and-set, timestamp, or Cloud Function
  mechanism for guaranteeing exactly-one finalization.
- The technical definition of, and mechanism for determining, when an
  observation or write has "already become durable/authoritative"
  relative to a finalization moment (§5, §6).
- Any client-side mechanism for detecting that another device has
  already finalized, or for how soon after finalization that must be
  detected.
- Any schema structure representing finalization state, finalization
  identity, or the authoritative `stockCounts` record's relationship to
  the draft it closes out.
- Any UI/UX implementation of how a rejected finalization attempt, or
  a stale finalization attempt, is communicated to the editor who made
  it.
- Whether the mechanism reuses, replaces, or extends the existing
  `submissionId` pattern.
- **44-S-C (finalizer authorization)** — which of Owner/Admin or the
  delegated Editor may finalize at all is a separate, still-open
  Product Architect decision, not resolved or assumed by this document.

---

# 10. Explicit Non-Goals

Decision 50 does not authorize:

- Any technical mechanism for anything stated above.
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, 48, or 49's own already-settled
  content.
- Resolution of 44-S-C (finalizer authorization), 44-F (cache
  isolation), 44-S-A (Viewer authorization), or the eligible-delegate-
  pool question — all remain exactly as open as the Rule 8 Assessment
  left them.
- Any Implementation Plan or Implementation Authorization.

---

# 11. Effect on Rule 8

Per the Rule 8 Assessment (Part IV §IV.E, §IV.P item 5, §IV.Q, §IV.R),
44-D (finalization uniqueness) was identified as a CRITICAL, still-open
technical design decision, confirmed reachable in the current
production system today under the same-Owner-multi-device scenario, and
explicitly unaffected in root cause by Decisions 46, 47, 48, or 49.
This document establishes the **governance-requirement layer** 44-D's
eventual technical design must satisfy — it does **not** resolve the
technical design question itself, and does **not** move the
corresponding Part IV CRITICAL finding (§IV.E, "Finalization uniqueness
(44-D)") to RESOLVED. Specifically, now that this decision is accepted:

- **44-D is RESOLVED at the governance-requirement level.** Finding E
  (§IV.E) and the related items in §IV.P (item 5) and §IV.Q now have a
  settled governance brief to be designed against — but they remain
  **FAIL / OPEN — technical design required**, exactly as Part IV
  classified them. No technical mechanism is chosen by this document.
- **44-S-C, 44-F, 44-S-A, and the eligible-delegate-pool question**
  are entirely unaffected.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY.

**This document itself does not modify the Rule 8 assessment artifact.**
Per this task's instruction, only a pointer/status note identifying
Decision 50 as accepted for 44-D's governance-requirement layer is
added there, not a reclassification of Finding E or any other finding.

---

# 12. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** 44-D now RESOLVED at the governance-requirement level; the
technical mechanism/design remains OPEN. Verdict remains READY AFTER
DECISIONS — see the Rule 8 artifact's own updated record of this
decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the finalization-protection governance
requirements in §2–§8 above (exactly-one finalization; first-successful-
finalization outcome; stale working state has no authority to
finalize; pending writes not yet durable before finalization must not
later recreate, mutate, or finalize the closed Contagem; finalization
protection must never discard legitimate durable historical
observations; no new authority model introduced; offline status has no
bearing on finalization authority; no silent overwrite of the
authoritative finalized result) are adopted as the governing
requirements 44-D's eventual technical design must satisfy. The
technical mechanism itself is explicitly NOT decided by this acceptance
and remains open, per §9/§10 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, and 49 were
each accepted. This acceptance does not authorize implementation,
Firestore rule changes, schema changes, UI changes, code changes,
tests, a technical mechanism for finalization-uniqueness
representation/enforcement, an Implementation Plan amendment, or an
Implementation Authorization. The Rule 8 verdict remains READY AFTER
DECISIONS — the CRITICAL technical finding concerning finalization
uniqueness (§IV.E), confirmed reachable in production today, remains
unresolved until technical design is completed. 44-S-C (finalizer
authorization), 44-F, 44-S-A, and the eligible-delegate-pool question
are unaffected by this decision and remain exactly as open as before.
