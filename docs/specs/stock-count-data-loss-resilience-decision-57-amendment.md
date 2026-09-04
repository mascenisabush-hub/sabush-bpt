# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 57 — Intentional Removal of Finalized Periodic Contagem History

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** [Decision 56](./stock-count-data-loss-resilience-decision-56-amendment.md)
§7/§5 item 5 — the one question Decision 56 explicitly declined to
decide: **if SABUSH BPT retains a capability to intentionally remove
finalized Periodic Contagem history, what shape must that capability
take** — the existing Clear-All-Data operation itself, re-reviewed and
re-authorized; a distinct, more restricted, separately-governed
operation, with Clear-All-Data narrowed to exclude finalized history;
or no such capability at all. This decision answers that question by
adopting the second of those three (Option B, per the accepted
Product Architect Decision Proposal this decision records).
**Builds on:** [Decision 44](./stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, shared live data / no-silent-loss), [Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, Exactly-One Finalization), [Decision 55](./stock-count-data-loss-resilience-decision-55-amendment.md)
(✅ Accepted, Same-Row Concurrent Observation Conflict Semantics), and
[Decision 56](./stock-count-data-loss-resilience-decision-56-amendment.md)
(✅ Accepted, Finalized Periodic Contagem Immutability & Clear-All
Separation) — this decision assumes and does not restate, reinterpret,
weaken, or expand any of their governance content. It answers exactly
the one question Decision 56 §7 left open.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
54, 55, or 56's own already-accepted content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decision 56 §5 item 5 established that *if* SABUSH BPT retains a
capability to intentionally remove finalized Periodic Contagem
history, that capability "must be an explicit, separately governed
data-management operation, not an incidental consequence of Clear All
Data" — but explicitly declined to decide *which* shape that
capability takes: Clear-All-Data itself (re-reviewed), a distinct
narrower operation, or none at all. This decision answers that
narrower question. It does not reopen, restate as if newly decided, or
weaken anything Decision 56 itself already settled.

---

# 2. Governance Question Resolved

**If SABUSH BPT retains a capability to intentionally remove finalized
Periodic Contagem history, what shape must that capability take?**

Three options were identified and evaluated:

1. Clear-All-Data itself, re-reviewed and explicitly re-authorized to
   continue covering finalized Periodic Contagem history.
2. A distinct, more restricted, separately-governed data-management
   operation, with Clear-All-Data narrowed to no longer touch
   finalized Periodic Contagem history — **adopted below**.
3. No intentional-removal capability at all — finalized Periodic
   Contagem history permanently undeletable through any in-app action.

---

# 3. Current Governed State (Inherited From Decision 56, Not Reopened)

- A finalized Periodic Contagem is immutable through normal Contagem
  operations (Decision 56 §5 items 1–2) — unaffected, unchanged.
- Clear-All-Data must not silently delete or mutate finalized Periodic
  Contagem history as an unreviewed, incidental side effect (Decision
  56 §5 item 3) — this decision is exactly the deliberate review that
  requirement anticipated.
- Working/draft state remains a distinct product concept from
  finalized historical records (Decision 56 §5 item 4) — unaffected.
- Decision 56 §5 item 5 left open which shape an intentional-removal
  capability, if retained, must take — **this decision closes that
  one open item, and only that item.**
- Decision 56 §5 items 6–9 (no new authorization model; Decision 50's
  exactly-once finalization; Decision 55's conflict-blocks-finalization
  rule; preservation of pre-finalization observations) remain entirely
  unaltered and are not restated in substance here beyond the
  cross-references in §6 below.

---

# 4. Adopted Product Decision — Option B

**Adopted: Clear-All-Data must not delete finalized Periodic Contagem
history. Finalized Periodic Contagem history is protected from the
ordinary Clear-All-Data/reset operation. If SABUSH BPT retains a
capability to intentionally remove finalized Periodic Contagem
history, that removal must be handled through a distinct, separately
governed data-management operation, rather than through Clear-All-Data.**

**The exact shape, authority, workflow, technical mechanism, and
implementation of any such future removal operation are NOT decided by
this decision and are not invented, designed, or implemented here.**

This mirrors, deliberately, how this same tension was already resolved
for two directly comparable record types in this codebase: the
`initial` Stock Count and every recorded Closing are both immutable
without exception, including against deletion, and Clear-All-Data
already skips both rather than the reset button's existing permissions
silently deciding their immutability. This decision extends that same
established treatment to finalized Periodic Contagem history, closing
Decision 56's one remaining open item on the same basis, not a new one.

---

# 5. Exact Requirements

1. **Finalized Periodic Contagem remains immutable through normal
   Contagem operations.** This restates, and does not alter, Decision
   56 §5 items 1–2 — no workflow a Contagem operator exercises in the
   ordinary course of counting, editing a draft, resolving a conflict,
   or finalizing may edit, overwrite, or delete an already-finalized
   result.
2. **Clear-All-Data is an operational reset mechanism and must not
   delete finalized Periodic Contagem history, incidentally or
   otherwise.** Going forward, finalized Periodic Contagem history is
   excluded from whatever Clear-All-Data's own scope is or becomes —
   the same treatment already given to the `initial` Stock Count,
   Initial Stock Valuation History, and Closings/ClosedPeriods.
3. **Working/draft Periodic Contagem state remains distinct from
   finalized historical records.** The existing "Começar de novo"
   draft-discard path is unaffected by this decision and continues to
   operate on working/draft state only, never on a finalized result.
4. **Any future capability to intentionally remove finalized Periodic
   Contagem history is a separate governance question and a separate
   operation.** Its authority model, workflow, technical mechanism, and
   whether it should exist at all in some future form are explicitly
   **not decided here** and require their own future Product Architect
   decision, reviewed on its own terms, before any such capability may
   be designed or built.
5. **This decision does not itself authorize any technical change.**
   No `firestore.rules` condition, schema field, UI change, or code
   change is authorized, designed, selected, or implied by this
   decision. `clearAllData()`'s current implementation is not modified
   by this decision.
6. **The existing Implementation Authorization `67d60a7` is not
   expanded, retroactively or otherwise, by this decision.** That
   Authorization's own explicit exclusion of the `stockCounts` `delete`
   rule (its §3/§4) remains exactly as written; nothing here grants,
   implies, or backdates authorization for narrowing it.
7. **The existing Decisions 44–56 Implementation Plan is not amended,
   silently or otherwise, by this decision.** A future Implementation
   Plan amendment, covering specifically the `delete`-narrowing this
   decision's requirement 2 requires, would need to be authored and
   accepted separately before implementation.
8. **This decision creates no new role, authority, or permission
   tier**, exactly as Decision 56 §5 item 6 already established for
   itself — whatever authority already governs Contagem finalization,
   Contagem editing, and Clear-All-Data continues to apply exactly as
   already accepted, unless and until a future decision on the
   separate removal operation (requirement 4) says otherwise.
9. **Decision 50's exactly-one-finalization protection and Decision
   55's unresolved-conflict-blocks-finalization rule remain in force,
   entirely unaltered** — this decision does not touch when or how many
   times a Contagem may be finalized.

---

# 6. Interaction With Existing Decisions

- **Decision 44** (shared live data, no-silent-loss): this decision is
  a direct application of Decision 44's no-silent-loss principle to
  the specific mechanism (Clear-All-Data) Decision 56 identified as
  the residual risk to a finalized result's durability. Nothing here
  alters Decision 44's own content.
- **Decision 50** (Exactly-One Finalization): unaffected. This decision
  governs what may happen to a result well after it is finalized, via
  an unrelated whole-business operation — it does not touch
  finalization itself.
- **Decision 55** (Same-Row Concurrent Observation Conflict Semantics):
  unaffected. This decision does not touch conflict detection,
  preservation, or resolution.
- **Decision 56** (Finalized Periodic Contagem Immutability & Clear-All
  Separation): this decision is the direct, deliberate resolution of
  the single item (§5 item 5 / §7) Decision 56 explicitly left open.
  Every other requirement Decision 56 established (§5 items 1–4, 6–9)
  remains exactly as accepted, unchanged, and unrestated in substance
  by this decision beyond the cross-references above.

---

# 7. What This Decision Does NOT Decide

- **The exact shape, authority model, workflow, or technical mechanism
  of any future intentional-removal-of-finalized-history operation.**
  Whether such a capability is ever built, and if so how, is left
  entirely to a future, separate Product Architect decision.
- **Any `firestore.rules` condition, schema field, UI flow, or Cloud
  Function** for enforcing this decision's requirement 2, or for any
  future removal operation.
- **Any change to Decision 50's exactly-one-finalization mechanism** or
  any finalizer-authorization mechanism (Decision 53) — both remain
  exactly as previously governed.
- **Any change to Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, or 56's own already-accepted content.**
- **The Firestore SDK cache/session-isolation factual verification**
  (Finding K) — entirely unrelated to this decision, unaffected in
  either direction.
- **Any Implementation Plan amendment or Implementation Authorization.**
  Both remain exactly as they were before this decision; a future
  Implementation Plan amendment and a future, separate Implementation
  Authorization would each be required before this decision's
  requirement 2 may be implemented.

---

# 8. Explicit Non-Goals

This decision does not:

- Select or design any technical mechanism (see §7 above).
- Modify `firestore.rules`, `clearAllData()`, or any other application
  code.
- Modify, expand, or retroactively broaden Implementation Authorization
  `67d60a7`.
- Modify or silently amend the Decisions 44–56 Implementation Plan.
- Modify Rule 8's verdict or reclassify any existing technical finding.
- Alter who may finalize (Decision 53), who may edit (Decision 46), or
  any Viewer permission (Decision 52).
- Design, authorize, or implement any future intentional-removal
  operation.
- Constitute an Implementation Plan amendment or Implementation
  Authorization in itself.
- Reopen, reinterpret, weaken, or expand Decisions 44 through 56's own
  already-accepted content.
- Mark Rule 8 or the overall governance chain as implementation-ready
  for this item.

---

# 9. Effect on Rule 8

This decision resolves, at the product-requirement level, the one item
Decision 56 §9 identified as still open within Finding G (§IV.G,
"Post-Finalization Immutability"): what shape an intentional-removal
capability must take, if retained. It does not itself reclassify
Finding G, reassess Rule 8, or touch any other technical finding.

- **Finding G's own technical status is unchanged by this decision.**
  `firestore.rules` is not modified here; the `stockCounts` `delete`
  rule remains exactly as it was immediately before this decision.
  Finding G remains **FAIL / OPEN — technical design and a future
  Implementation Plan amendment plus Implementation Authorization
  required** before requirement 2 above can be implemented.
- **Does not remove, weaken, or resolve any other existing technical
  finding**, including Finding K (shared-device/cache isolation), which
  remains classified exactly as the Rule 8 Assessment's own most recent
  reassessment (PARTIALLY VERIFIED, not RESOLVED) — unaffected in
  either direction by this decision.
- **Does not touch, narrow, or resolve any other Rule 8 finding** not
  named above.
- **The Rule 8 verdict remains READY AFTER DECISIONS** — a
  product-semantics decision is not a technical mechanism, exactly as
  every other accepted decision in this chain, including Decision 56
  itself, has maintained. Implementation of this decision's requirement
  2 remains NOT AUTHORIZED until a separate Implementation Plan
  amendment and Implementation Authorization are each accepted and
  signed in their own right.

---

# 10. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** Finding G's residual open item (intentional-removal-capability
shape) is now product-level resolved (Option B); Finding G's technical
status, and every other technical finding, remain exactly as classified
before this decision. No `firestore.rules`, schema, UI, or code change
has been made. Implementation Authorization `67d60a7` is unexpanded.
The Decisions 44–56 Implementation Plan is unamended. A future,
separate Implementation Plan amendment and Implementation Authorization
would each be required before requirement 2 of this decision is
implemented.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44 through 56 were each accepted.
This acceptance does not authorize implementation, `firestore.rules`
changes, schema changes, UI changes, code changes, tests, a technical
mechanism for the Clear-All-Data narrowing this decision requires, or
for any future intentional-removal capability, an Implementation Plan
amendment, or an Implementation Authorization. The Rule 8 verdict
remains READY AFTER DECISIONS — every CRITICAL/HIGH technical finding,
including Finding G (post-finalization immutability — the
Clear-All-Data-narrowing half of which is now product-decided but not
yet technically implemented or authorized) and Finding K
(shared-device/cache isolation, PARTIALLY VERIFIED, not RESOLVED),
remains exactly as classified and unaffected by this decision. All
previously accepted decisions (44 through 56) remain substantively
unchanged. Implementation of this decision's requirement 2 remains NOT
AUTHORIZED.
