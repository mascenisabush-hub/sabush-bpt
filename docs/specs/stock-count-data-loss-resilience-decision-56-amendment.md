# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 56 — Finalized Periodic Contagem Immutability & Clear-All Separation

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** The Product Architect question, first surfaced by the
[Periodic Contagem — Technical Design for Decisions 44–55](../engineering/periodic-contagem-decisions-44-55-technical-design.md)
§14/§22 ("Clear All Data vs. finalized-result immutability"), of
whether Decision 55's post-finalization immutability requirement
(Finding G, §IV.G of the [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md))
extends to, or is in tension with, the existing "Clear All Data"
wholesale-reset capability's ability to delete finalized periodic
`stockCounts` documents.
**Builds on:** [Decision 44](./stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, shared live data / no-silent-loss), [Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, Exactly-One Finalization), and [Decision 55](./stock-count-data-loss-resilience-decision-55-amendment.md)
(✅ Accepted, Same-Row Concurrent Observation Conflict Semantics) — this
decision assumes and does not restate, reinterpret, weaken, or expand
any of their governance content. It answers exactly one question those
decisions left open: **what "finalized is immutable" must mean at the
product level once a separate, already-existing wholesale reset
capability is also considered**, and, derivatively, that any future
intentional removal of finalized history must be its own explicitly
governed operation, never an incidental side effect of an unrelated
capability.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
54, or 55's own already-accepted content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

The Technical Design for Decisions 44–55 confirmed, by direct
`firestore.rules` inspection, that a finalized periodic `stockCounts`
document can currently be arbitrarily updated **or** deleted by the
Owner/Admin at any time, unconditionally — and that the delete half of
that same permissive rule is the mechanism the existing "Clear All
Data" wholesale-reset feature already depends on. That design document
correctly declined to resolve this tension unilaterally, naming it as
a genuine Product Architect question rather than a technical one (its
own §14/§22). This decision answers that question.

**This decision answers only the product-level immutability-versus-
reset question.** It does not select, alter, or invent any technical
mechanism for enforcing it (§10 below), does not reopen exactly-once
finalization (Decision 50) or the conflict-blocks-finalization rule
(Decision 55), and does not create any new role, authority, or
permission tier.

---

# 2. Scenario

A Periodic Contagem has been finalized: its authoritative result
exists as a `stockCounts` document, and every observation that
produced it (including any conflict that was resolved along the way,
per Decision 55) is durable history.

Two structurally different things can happen to that history today,
and the current implementation does not distinguish between them:

1. **An isolated, silent mutation or deletion** of that one finalized
   result, indistinguishable at the rules level from any other write —
   nothing marks this as touching immutable history rather than an
   ordinary editable record.
2. **An explicit, whole-business "Clear All Data" reset**, which
   happens to delete the same document as a side effect of clearing
   everything the business has ever recorded, not as a targeted act
   against that one finalized result specifically.

Decision 55/Finding G's immutability requirement is squarely about
case 1. Case 2 is a pre-existing, already-relied-upon capability with a
different purpose and a different (whole-business, explicit,
operator-initiated) shape. Conflating them — either by silently
narrowing Clear All Data's existing behavior with no governance
review, or by leaving case 1 open because case 2 exists — is the
problem this decision resolves.

---

# 3. Options Considered

**For whether finalized-result immutability and Clear All Data must be
treated as the same capability:**

1. **Treat them as one capability; whatever protects one automatically
   governs the other.** Rejected: this is exactly the conflation the
   Technical Design flagged — it would either leave finalized history
   silently mutable (if Clear All Data's permissive delete rule is left
   untouched and reused as the immutability mechanism) or silently
   break an existing, separately-relied-upon reset feature (if a
   blanket immutability rule is applied without carving out the reset
   path), with no explicit decision behind either outcome.
2. **Treat finalized-result immutability and whole-business reset as
   two distinct product concepts, each independently governed —
   selected.** Ordinary Contagem workflows (recording, editing a draft,
   finalizing, viewing history) must never be able to mutate or delete
   a finalized result. A wholesale reset of a business's entire
   recorded history is a different, already-existing, explicit,
   operator-initiated action that this decision does not disturb, but
   which must not be the *only* thing standing between a finalized
   result and deletion — going forward, any *intentional* removal of
   finalized history (whether as part of a reset or on its own) must be
   its own explicitly governed data-management operation, not a bare
   side effect of an unrelated capability's existing permissions.

**For whether this decision should narrow, expand, or leave alone
Clear All Data's actual existing behavior:**

1. **Silently narrow Clear All Data so it can no longer delete
   finalized periodic counts, as an implicit side effect of this
   decision.** Rejected: this would be a substantive behavior change to
   an existing, already-relied-upon feature, decided as a side effect
   of an immutability decision rather than reviewed on its own terms —
   exactly the kind of incidental consequence §5 below prohibits, just
   in the opposite direction.
2. **Leave Clear All Data's own scope and behavior exactly as currently
   accepted, and instead state, as a product principle, that *if* a
   future intentional-removal capability is retained or built, it must
   be explicit and separately governed — selected.** This decision does
   not itself decide whether Clear All Data should be narrowed,
   replaced, restricted to a privileged operation, or left as-is; it
   only establishes that whichever shape intentional removal ultimately
   takes, it must be a deliberate, reviewed, separately-governed
   operation — never an incidental consequence discovered later.

---

# 4. Recommended and Adopted Product Decision

**Adopted: finalized Periodic Contagem history is immutable through
normal Contagem operations; any capability that can intentionally
remove finalized history must be explicit and separately governed;
clearing working/draft state is a distinct product concept from
altering finalized historical records; and this decision does not
itself decide Clear All Data's future shape, only that its interaction
with finalized history must be a deliberate governance choice, not an
accident of implementation.**

This keeps faith with Decision 55/Finding G's own immutability
requirement without unilaterally breaking or silently reinterpreting
an already-existing, separately-relied-upon capability. It also avoids
inventing a technical mechanism at the governance layer — the *product*
requirement (finalized history must not be silently mutable; any
intentional removal must be its own governed operation) is fully
decidable without yet knowing *how* Clear All Data, or any future
replacement for it, will be technically shaped.

---

# 5. Exact Requirements

1. **A finalized Periodic Contagem is immutable through normal Contagem
   operations.** No workflow that a Contagem operator (Owner/Admin,
   delegated Editor, or Viewer) exercises in the ordinary course of
   counting, editing a draft, resolving a conflict, or finalizing may
   edit, overwrite, or delete an already-finalized result.
2. **The authoritative historical result of a finalized Contagem must
   not be edited, overwritten, or deleted through normal Contagem
   workflows.** This restates item 1 as a direct constraint on the
   finalized document itself, independent of which workflow might
   attempt it.
3. **The existing Clear All Data capability must not silently delete or
   mutate finalized Periodic Contagem history as an unreviewed,
   incidental side effect.** This decision does not itself narrow,
   redesign, or disable Clear All Data — it establishes that Clear All
   Data's interaction with finalized history must be a deliberate,
   reviewed product decision, not an accident inherited from a rule
   written for a different purpose.
4. **Clearing working/draft Contagem state must remain distinct from
   altering finalized historical records.** These are two different
   product concepts — discarding an in-progress, not-yet-finalized
   draft (per the existing "Começar de novo" discard path, unaffected
   by this decision) is categorically different from touching a
   finalized result, and no future design may blur that distinction by
   treating them as the same operation.
5. **If SABUSH BPT retains a capability to intentionally remove
   finalized historical data, that must be an explicit, separately
   governed data-management operation, not an incidental consequence
   of Clear All Data.** Whether that capability is Clear All Data
   itself (narrowed and re-reviewed), a distinct, more restricted
   operation, or removed entirely, is **not decided here** — only that
   whichever shape it takes must be its own deliberate governance
   decision, reviewed on its own terms, before it ships in that shape.
6. **This decision does not create a new authorization model.** No new
   role, permission tier, or authority is introduced; whatever
   authority already governs Contagem finalization (Decision 53,
   Owner/Admin only) and whatever authority already governs Clear All
   Data continue to apply exactly as already accepted.
7. **Decision 50's exactly-one-finalization protection remains in
   force**, entirely unaltered — this decision does not touch how many
   times a Contagem may be finalized or how a retried finalization
   attempt is handled.
8. **Decision 55's unresolved-conflict-blocks-finalization rule remains
   in force**, entirely unaltered — this decision does not touch when a
   Contagem may be finalized, only what may happen to a result after
   it has been.
9. **Historical observations that were validly made before finalization
   remain preserved/accounted for.** This decision does not authorize
   discarding, and does not itself discard, any observation Decision
   44/47/55 already requires to be preserved — it adds a further
   protection (immutability of the finalized result itself), it does
   not narrow the existing preservation requirements those decisions
   already established.
10. **The technical enforcement mechanism is not selected by this
    decision and remains an implementation/design matter.** No
    `firestore.rules` change, schema change, UI change, or Cloud
    Function is authorized, designed, or implied by this decision —
    see §10 below.

---

# 6. Interaction With Existing Decisions

- **Decision 44** (shared live data, no-silent-loss): this decision
  extends Decision 44's no-silent-loss principle to the post-
  finalization period specifically — a finalized result is exactly the
  kind of durable, authoritative state Decision 44 already protects
  against silent loss; nothing here alters Decision 44's own content.
- **Decision 50** (Exactly-One Finalization): **unaltered, and its own
  governing scope remains exactly as before.** Decision 50 continues to
  govern exactly-one finalization, rejection of stale attempts, and
  protection against a second competing outcome. This decision governs
  a different moment entirely — what happens to a result *after* it is
  already finalized — and does not narrow, duplicate, or reinterpret
  anything Decision 50 already decides.
- **Decision 53** (Finalizer Authorization): unaffected. This decision
  does not touch who may finalize, and does not grant anyone new
  authority over a finalized result — it restricts what may happen to
  that result under any authority, not who holds authority.
- **Decision 55** (Same-Row Concurrent Observation Conflict Semantics):
  **unaltered, and its own governing scope remains exactly as before.**
  Decision 55 continues to govern same-row conflict semantics and the
  precondition that unresolved conflicts block finalization. This
  decision is the direct governance-level answer to the immutability
  question Decision 55's own Finding G left open once the Technical
  Design phase (§14/§22 of the technical design document) surfaced the
  Clear All Data tension — it narrows *how "immutable" is scoped* (not
  a blanket claim divorced from the existing reset capability) without
  reopening or weakening Decision 55's own content in any way.

---

# 7. What This Decision Does NOT Decide

- **Whether Clear All Data itself must be technically narrowed,
  restricted, replaced, or left as-is.** This decision requires that
  *if* intentional removal of finalized history is retained, it must be
  explicit and separately governed — it does not itself perform that
  governance review or pick an outcome.
- **Any `firestore.rules` condition, schema field, UI flow, or Cloud
  Function** for enforcing finalized-result immutability, distinguishing
  a "reviewed, governed removal" from an "incidental one," or
  implementing any future separately-governed removal capability.
- **Any change to Decision 50's exactly-one-finalization mechanism** or
  **Decision 53's finalizer-authorization mechanism** (both still
  entirely open at the technical level, unaffected by this amendment).
- **Any change to Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  or 55's own already-accepted content.**
- **The Firestore SDK cache/session-isolation factual verification**
  named by the Technical Design for Decisions 44–55 §12/§22 — that
  question is entirely unrelated to finalized-result immutability and
  remains exactly as open as that document left it, unaffected by this
  decision in either direction.
- **Any Implementation Plan or Implementation Authorization.**

---

# 8. Explicit Non-Goals

This decision does not:

- Select or design any technical mechanism (see §7 above).
- Narrow, disable, or redesign the existing Clear All Data capability.
- Alter who may finalize (Decision 53), who may edit (Decision 46), or
  any Viewer permission (Decision 52).
- Resolve the cache/session-isolation technical verification (Technical
  Design §12/§22) — that question remains open, unrelated to this
  decision.
- Authorize any code, `firestore.rules`, schema, UI, or test change.
- Constitute an Implementation Plan amendment or Implementation
  Authorization.
- Reopen, reinterpret, weaken, or expand Decisions 44 through 55's own
  already-accepted content.
- Mark Rule 8 or the overall governance chain as implementation-ready.

---

# 9. Effect on Rule 8

This decision resolves, at the product-requirement level, the
Clear-All-Data-versus-finalized-immutability tension the Technical
Design for Decisions 44–55 surfaced (its own §14, §19, §22) as a
genuine Product Architect question rather than deciding it
unilaterally at the technical layer.

- **Narrows, but does not resolve, Finding G (§IV.G, "Post-Finalization
  Immutability").** Finding G's own technical finding — that
  `firestore.rules` currently permits unconditional Owner update/delete
  on a finalized periodic `stockCounts` document — is unchanged by this
  decision: the rule itself is not modified here. What this decision
  resolves is the *product-level scope* of what "immutable" must mean
  once Clear All Data's own existing, legitimate use of that same
  permissive rule is taken into account — finalized history must be
  immutable through *normal Contagem operations*, and any *intentional*
  removal capability (Clear All Data or otherwise) must be explicit and
  separately governed, never an incidental side effect. **Finding G
  remains FAIL / OPEN — technical design required** even with this
  decision accepted; no `firestore.rules` change has been made.
- **Does not remove, weaken, or resolve any other existing technical
  finding.** The CRITICAL technical findings concerning delegated-
  Editor `firestore.rules` support (Finding A/B), same-row conflict
  detection/preservation (Finding C), exactly-once finalization
  (Finding E), and shared-device/cache isolation (Finding K, still
  UNVERIFIED) all remain exactly as classified — **FAIL / OPEN /
  UNVERIFIED — technical design required.** This amendment adds a
  further product-level clarification to the immutability requirement
  Finding G already named; it does not narrow the technical work
  already required, and does not move any finding toward RESOLVED.
- **Does not touch, narrow, or resolve any other Rule 8 finding**
  (44-S-A, 44-S-C, 44-S-D, 44-S-F, 44-S-G/same-row conflict semantics,
  44-D, 44-F, or the eligible-delegate-pool question — all already
  governance-resolved and unaffected).
- **The Rule 8 verdict remains READY AFTER DECISIONS** — a
  product-semantics decision is not a technical mechanism, exactly as
  every other accepted decision in this chain has maintained.
  Implementation remains NOT AUTHORIZED; this decision does not, by
  itself or in combination with Decisions 44–55, make the system
  implementation-ready.

---

# 10. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** The finalized-immutability-versus-Clear-All-Data product
question is now RESOLVED — GOVERNANCE REQUIREMENTS at the Product
Architect governance-requirement level. All technical
implementation/enforcement mechanisms remain OPEN, including Finding G
itself. The Firestore SDK cache/session-isolation factual verification
(Finding K) is unrelated to this decision and remains separately open.
Verdict remains READY AFTER DECISIONS — see the Rule 8 artifact's own
updated record of this decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED — this acceptance does not
constitute Implementation Authorization
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the finalized Periodic Contagem immutability
and Clear-All-Data separation governance requirements in §5–§9 above
are adopted, in particular: **a finalized Periodic Contagem is
immutable through normal Contagem operations**; **the authoritative
historical result must not be edited, overwritten, or deleted through
normal Contagem workflows**; **the existing Clear All Data capability
must not silently delete or mutate finalized history as an unreviewed
side effect**, though this decision does not itself narrow, redesign,
or disable that capability; **clearing working/draft state remains
distinct from altering finalized historical records**; **any future
capability to intentionally remove finalized historical data must be
an explicit, separately governed data-management operation**, never an
incidental consequence of Clear All Data; **no new authorization model
is created**; **Decision 50's exactly-one-finalization protection
remains in force, unaltered**; **Decision 55's unresolved-conflict-
blocks-finalization rule remains in force, unaltered**; and
**historical observations validly made before finalization remain
preserved/accounted for**, per Decisions 44/47/55 unchanged. The
technical enforcement mechanism — any `firestore.rules` change, schema
change, UI change, or Cloud Function, and any future decision about
Clear All Data's own shape — is explicitly NOT decided by this
acceptance and remains open, per §7 above. The Firestore SDK cache/
session-isolation factual verification named by the Technical Design
for Decisions 44–55 is unrelated to this decision and remains
separately, explicitly open.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52,
53, 54, and 55 were each accepted. This acceptance does not authorize
implementation, `firestore.rules` changes, schema changes, UI changes,
code changes, tests, a technical mechanism for finalized-result
immutability or for any future intentional-removal capability, an
Implementation Plan amendment, or an Implementation Authorization. The
Rule 8 verdict remains READY AFTER DECISIONS — every CRITICAL/HIGH
technical finding in §IV.P, including Finding G (post-finalization
immutability, still entirely unenforced) and Finding K (shared-device/
cache isolation, still UNVERIFIED), remains exactly as classified and
unaffected by this decision. All previously accepted decisions (44,
45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55) remain substantively
unchanged. Implementation remains NOT AUTHORIZED.
