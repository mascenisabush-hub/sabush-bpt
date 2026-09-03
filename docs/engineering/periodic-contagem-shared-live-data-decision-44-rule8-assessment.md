RULE 8 REASSESSMENT — ANALYSIS ONLY — NO IMPLEMENTATION AUTHORIZED

# Rule 8 Assessment — Periodic Contagem Shared Live Data (Decision 44) — Combined Record

**This document now contains four parts, preserved separately:**

- **Part IV (below, current):** **Fresh Rule 8 Reassessment — Decision
  46 Dual Active Editor Model.** This is the current, governing Rule 8
  artifact. It is a genuinely fresh analysis, not a patch — the
  accepted governing model changed from "at most one legitimate writer"
  to "Owner/Admin + at most one delegated Editor may legitimately write
  simultaneously," which invalidates the premise several Part III
  conclusions depended on.
- **Part III (further down, superseded):** the corrected reassessment
  against the accepted Single Active Editor + Live Read-Only Viewers
  model. Preserved exactly as originally written — **not deleted, not
  silently overwritten** — but superseded by Part IV wherever the two
  disagree, specifically regarding same-row concurrent editing and
  Editor authorization. See Part IV §IV.0 for exactly what changed and
  why.
- **Part II (further down, superseded):** the first reassessment
  against the refined model, produced before Part III's correction.
  Preserved exactly as originally written. Superseded by both Part III
  and Part IV wherever they disagree.
- **Part I (further down, historical):** the original Rule 8 Assessment
  against the pre-refinement, open-ended shared-editing model. Preserved
  exactly as originally written. Superseded by Parts II, III, and IV
  wherever they disagree.

**Overall STATUS:** 🟡 DRAFT — Part IV analysis complete, verdict
READY AFTER DECISIONS. **Updated 2026-09-03** to record Decision 47's
resolution of 44-S-G's product-level conflict-handling requirement and
Decision 48's resolution of 44-S-D's governance-requirement layer (see
Part IV §IV.O-a, §IV.O-b) — technical mechanisms remain undecided for
both. **Updated 2026-09-04** to record Decision 49's resolution of
44-S-F's governance-requirement layer (see Part IV §IV.O-c) — the
technical mechanism remains undecided. **Updated 2026-09-04** to record
Decision 50's resolution of 44-D's governance-requirement layer (see
Part IV §IV.O-d) — the technical mechanism remains undecided. **Updated
2026-09-04** to record Decision 51's resolution of 44-F's
governance-requirement layer (see Part IV §IV.O-e) — the technical
verification and mechanism remain undecided. **Updated 2026-09-04** to
record Decision 52's resolution of 44-S-A's governance-requirement
layer (see Part IV §IV.O-f) — the technical enforcement/mechanism
remains undecided. **Updated 2026-09-04** to record Decision 53's
resolution of 44-S-C's governance-requirement layer (see Part IV
§IV.O-g) — Owner/Admin is the only authorized finalizer; the technical
enforcement/mechanism remains undecided. **Updated 2026-09-04** to
record that [Decision 54 — Delegated Editor Eligibility & Selection
Requirements](../specs/stock-count-data-loss-resilience-decision-54-amendment.md)
has been drafted (STATUS: DRAFTED — NOT ACCEPTED) proposing the
governance-requirement layer for the eligible-delegate-pool question
(see Part IV §IV.O-h) — not yet accepted, and no Rule 8 finding or open
decision is reclassified by the draft. All other Part IV blockers
(the delegated-Editor rules branch) remain open.
No part authorizes implementation, amends the Implementation Plan, or
constitutes an Implementation Authorization. No code, `firestore.rules`,
schema, UI, or test file was modified to produce any part of this
document.

---

# PART IV — Fresh Rule 8 Reassessment — Decision 46 Dual Active Editor Model

**Current governing baseline, stated explicitly per the task's own
requirement:**

- [Decision 46 — Dual Active Editor Authority](../specs/stock-count-data-loss-resilience-decision-46-amendment.md):
  **✅ ACCEPTED — REQUIREMENTS ONLY**, SABUSHIMIKE MASCENI, 3 September
  2026.
- **Governing authority model:** Owner/Admin is always an Active
  Editor; Owner/Admin may designate at most one delegated Editor;
  Owner/Admin + one delegated Editor may legitimately edit
  simultaneously, including the same row; only Owner/Admin may
  assign/change the delegated Editor; reassignment A→B immediately
  removes A's delegated authority; no automatic takeover in either
  direction (delegated Editor offline, or Owner/Admin offline); former
  delegated Editors remain Viewers unless explicitly reassigned;
  technical mechanisms and implementation remain unauthorized.
- **Governing chain:** Decision 38 → Decisions 39–42 → Decision 44
  (✅ Accepted, 3 Sept 2026) → Decision 44 Refinement — Single Active
  Editor + Live Read-Only Viewers (✅ Accepted, 3 Sept 2026, now
  **partially superseded** — INV-44-S01 superseded, INV-44-S04
  narrowed, per Decision 46 §10) → Decision 45 (✅ Accepted, resolves
  44-S-B/44-S-E, now **reinterpreted** under Decision 46's two-role
  model, per Decision 46 §1) → Part I/II/III of this document (🟡, each
  superseded in turn) → **Decision 46 (✅ Accepted, 3 Sept 2026)** →
  **Part IV (this reassessment, current)** → **Decision 47 (✅ Accepted,
  3 Sept 2026, resolves 44-S-G at the product level, §IV.O-a)** →
  **Decision 48 (✅ Accepted, 3 Sept 2026, resolves 44-S-D at the
  governance-requirement level, §IV.O-b)** → **Decision 49 (✅ Accepted,
  4 Sept 2026, resolves 44-S-F at the governance-requirement level,
  §IV.O-c)** → **Decision 50 (✅ Accepted, 4 Sept 2026, resolves 44-D at
  the governance-requirement level, §IV.O-d)** → **Decision 51
  (✅ Accepted, 4 Sept 2026, resolves 44-F at the governance-requirement
  level, §IV.O-e)** → **Decision 52 (✅ Accepted, 4 Sept 2026, resolves
  44-S-A at the governance-requirement level, §IV.O-f)** → **Decision 53
  (✅ Accepted, 4 Sept 2026, resolves 44-S-C at the governance-requirement
  level, §IV.O-g)**. Technical mechanisms for 44-S-D, 44-S-F, 44-D,
  44-S-G, 44-F (including 44-F's own named technical verification),
  44-S-A, and 44-S-C remain undecided throughout this chain.

**Repository baseline:** `main = origin/main` = `5570a82`, working tree
clean. No application code, `firestore.rules`, schema, UI, or test
implementing any part of Decision 44, its Refinement, Decision 45, or
Decision 46 exists anywhere in the repository. Every finding below is
derived from the same, already-reviewed evidence Parts I–III
established (draft paths, rules text, listener wiring, `submissionId`
generation, schema field lists) — **no new code exists to inspect
since Part III**; what changed is the requirement the same evidence
must now be judged against.

---

## IV.0 — What Changed, and Why This Is a Fresh Analysis, Not a Patch

Part III's central, load-bearing finding was:

> General multi-writer conflict resolution is **RESOLVED** — the
> scenario of two simultaneously-valid writers is excluded by the
> accepted product requirement (INV-44-S01/S04).

**This premise no longer holds.** Decision 46 explicitly reintroduces
exactly the scenario Part III eliminated — two simultaneously-valid
writers (Owner/Admin + delegated Editor) — though **bounded to exactly
two known roles**, not the fully open-ended "any number of authorized
Staff" scenario Part I originally assessed. This is a materially
different problem from both prior states:

- **Not** the same as Part I/II's open-ended multi-user sharing
  (unbounded legitimate writers).
- **Not** the same as Part III's Single Active Editor model (exactly
  one legitimate writer, all conflicts reduce to staleness).
- **A new, third shape:** exactly two, individually-identifiable,
  simultaneously-legitimate roles, one of which is fixed (Owner/Admin)
  and one of which is assignable and revocable (delegated Editor).

Every classification below is re-derived against this specific shape —
not copied from Part III with labels flipped, and not reverted wholesale
to Part I/II's open-ended framing, which would overstate the problem
Decision 46 actually creates.

**The same axis discipline Part III established still applies and is
reused here:** Axis 1 (current code state) is unchanged since Part
III — nothing has been implemented. Axis 2 (target-model risk shape) is
what every classification below describes.

---

## IV.A — Business Ownership and Tenant Isolation

- **Business-owned active Periodic Contagem state:** unaffected by
  Decision 46 — the draft path
  (`businesses/{businessId}/stockCountDrafts/periodic(+/items/{rowKey})`)
  has no device/session/role identifier in it regardless of how many
  legitimate editing roles exist. **PASS.**
- **Cross-business isolation:** unaffected — `isOwnerOf`/`isMemberOf`
  resolve against `request.auth`-derived profile lookups, never a
  client-supplied field. **PASS.**
- **Owner/Admin authority boundaries:** the Owner/Admin's own authority
  is not newly at risk of crossing a business boundary — `isOwnerOf`
  is already business-scoped. **PASS.**
- **Do current Firestore rules enforce the required model?** **FAIL.**
  `firestore.rules`' `stockCountDrafts` block (both the parent doc and
  the `items/{rowKey}` sub-match) grants read/create/update/delete to
  `isOwnerOf(businessId)` **only** — there is no rule branch for a
  "delegated Editor" role at all. A delegated Editor, under the
  currently-deployed rules, **cannot read or write the draft at all**,
  regardless of any assignment the Owner/Admin makes at the application
  layer, because no such assignment concept exists in the rules or the
  schema. This is a **hard FAIL**, not a partial gap — the entire
  delegated-Editor half of Decision 46's model has zero rules-layer
  support today.

---

## IV.B — Editor Authorization

Answering the task's four explicit sub-questions directly:

- **Can the current system distinguish Owner/Admin from delegated
  Editor?** **FAIL.** `isOwnerOf` answers "is this the Owner/Admin
  account," and nothing else — there is no second role concept
  anywhere in `firestore.rules`, `types.ts`, or `AppContext.tsx`'s
  Contagem-related code.
- **Can it enforce at most one delegated Editor?** **FAIL.** There is
  no field to hold "who is currently the delegated Editor," so nothing
  can be enforced against it.
- **Can it prevent unauthorized users from becoming Editors?**
  **PARTIAL — accidentally, not by design.** Today, only `isOwnerOf`
  sessions can write to the draft at all, so a genuinely unauthorized
  (non-Owner, non-delegated) user cannot write — but this is because
  **no one except the Owner can write today**, not because a
  delegated-Editor concept correctly gates access. Once a delegated-
  Editor rule branch is added, this protection must be re-verified
  against the new branch specifically, not assumed to carry over.
- **Can it enforce immediate loss of delegated authority after
  reassignment?** **FAIL.** With no authority-state field, there is
  nothing to update on reassignment and nothing for a write path to
  check.

**Overall for §B: FAIL / OPEN — DECISION+DESIGN REQUIRED.** This is the
single largest implementation gap Decision 46 introduces relative to
Part III's world — Part III's gaps were about *enforcing* a
single-editor model that was at least conceptually simple; here, the
*basic access grant* for a second legitimate role doesn't exist yet.

---

## IV.C — Same-Row Concurrent Legitimate Editing (Reinstated)

This is confirmed, per the task's framing, as a **real, intended,
legitimate scenario now**, not a prohibited one.

- **What happens with simultaneous writes to the same row today?**
  Unchanged mechanism from every prior part: plain Firestore
  document write, last-physical-arrival-wins, on
  `stockCountDrafts/periodic/items/{rowKey}`. No transaction, no
  precondition, confirmed again by the same code paths
  (`savePeriodicStockDraftItem`/`flushPeriodicStockDraftRows`).
- **Does current last-write-wins behavior silently discard one
  observation?** **Yes — confirmed, and now via a *legitimate* second
  writer, not merely a stale one.** This is the material difference
  from Part III: Part III's residual risk was a stale former Editor
  (an edge case — offline, crash, or an explicit takeover). Under
  Decision 46, Owner/Admin and delegated Editor writing the same row
  moments apart is an **ordinary, expected, non-edge-case occurrence**
  the moment two people are counting stock together.
- **Is the accepted Decision 44 no-silent-loss requirement satisfied?**
  **No — FAIL.** Decision 44 §9/§21 and the refinement's own §16
  require no valid operator-entered value to be silently discarded.
  A last-write-wins overwrite between two now-legitimate writers is
  exactly the silent loss both documents prohibit.
- **Can observations currently be distinguished and preserved/
  accounted for?** **No — FAIL, confirmed by schema inspection.**
  `PeriodicStockDraftItem` (re-checked this session, unchanged from
  Part I/II/III's own findings) has fields: `productId`, `productName`,
  `quantity`, `unit`, `costPrice`, `sellingPrice`, `removed`,
  `validated`. **No writer-identity field. No per-row timestamp or
  revision.** The only timestamp anywhere in the draft structure is the
  meta document's single, whole-draft `updatedAt` — which cannot say
  *which row* changed or *who* changed it. There is currently **no way
  even to detect**, let alone resolve, that Owner/Admin and delegated
  Editor entered different values for the same product — the data
  model itself is insufficient, independent of any conflict-resolution
  algorithm choice.
- **Is a technical conflict-resolution mechanism now required?**
  **Yes — confirmed as a requirement, mechanism explicitly not
  selected here**, per the task's own instruction.

**Overall for §C: FAIL — CRITICAL.** This is the most consequential
re-opened finding in this reassessment: Part III's RESOLVED
classification for general multi-writer conflict handling is **directly
invalidated** by Decision 46, and unlike Part III's narrower residual
concern (stale-former-editor only), this now covers routine,
expected-to-happen operation.

---

## IV.D — Stale Former-Editor Writes

Re-tracing Editor A losing authority to Editor B (now: delegated Editor
A replaced by delegated Editor B, with Owner/Admin as a constant third
party in every scenario, per Decision 46 §1-A/§4):

- **Can A's queued/local writes reach Firestore after reassignment?**
  **Yes — unchanged.** Same generation-token gap as every prior part:
  A's cancellation logic is scoped to A's own subsequent actions, not
  an externally-observed reassignment.
- **Can A overwrite B/Admin data?** **Yes — unchanged**, same
  last-write-wins semantics, now with a second possible legitimate
  victim (Admin's own concurrent edit) in addition to B's.
- **Can A resurrect a draft?** **Yes — unchanged**, same mechanism as
  Part I §L / Part III §III.1/§III.8.
- **Can A mutate finalized data?** **Yes — unchanged**, per
  `firestore.rules` L727's unconditional Owner update/delete on
  periodic-type `stockCounts` — though note: A, as a former **delegated
  Editor** (not Owner/Admin), would need `isOwnerOf` to be true for
  this specific rule to apply, which it is **not** for a non-Owner
  delegated Editor under current rules. **This means today, a former
  delegated Editor literally cannot mutate finalized data, only because
  delegated Editors have no write access to anything Contagem-related
  at all yet** (§B) — once delegated-Editor write access is built, this
  specific protection must be re-verified, not assumed to hold by
  accident the way it does today.

**Overall for §D: FAIL — CRITICAL, unchanged in kind from Part III,
now with two distinct "current legitimate holder" identities (Admin,
current delegated Editor) either of which a stale write could
target.**

---

## IV.E — Finalization Uniqueness (Decision 44-D, Reassessed)

Explicitly addressing the task's named scenarios:

- **Admin finalization vs. delegated Editor finalization:** Decision
  46 does not state that the delegated Editor may finalize — only that
  they may edit. Finalization authorization (44-S-C) remains open, and
  existing governance (the original specification's own note, reaffirmed
  in Part III §III.3-C) suggests Owner-only finalization is the likely
  baseline. **This reassessment does not assume delegated Editors can
  finalize** — but flags that Decision 46 makes confirming 44-S-C
  explicitly, rather than by default, more operationally important than
  before (two people are now actively contributing to a count only one
  of them may be able to close out).
- **Simultaneous finalization attempts:** if finalization remains
  Owner-only, this specific scenario (two *finalizers*) doesn't arise
  from Decision 46 directly — but **Owner/Admin on two devices** still
  can, exactly as in Part III §III.7, and Decision 46 does nothing to
  change that risk.
- **Offline queued finalization, retry after timeout, stale former
  Editor finalization, draft deletion/resurrection, duplicate
  `stockCounts`:** every one of these is **identical to Part III §III.7's
  findings, unaffected by Decision 46**, because the `submissionId`
  generation mechanism (`PeriodicStockCountView.tsx`'s
  `submissionIdRef`) has no concept of Editor role at all — it is
  generated per local session regardless of whether that session is
  Owner/Admin or a delegated Editor.
- **Does the current `submissionId` mechanism guarantee exactly one
  finalization of a physical Periodic Contagem?** **No — FAIL,
  unchanged from Part I/II/III.** Confirmed again this session against
  the same code: the deterministic `stockCounts` id is derived from a
  per-session `submissionId`, with no cross-session/cross-role
  uniqueness check.

**Overall for §E: FAIL — CRITICAL, unaffected in root cause by Decision
46, though its practical likelihood arguably increases slightly now
that two people are actively working the same count (more sessions
= more chances for an ambiguous network retry or a stale device to
independently reach the confirmation step).**

---

## IV.F — Draft Lifecycle and Resurrection

- **Draft creation, updates:** unaffected by Decision 46 at the
  mechanism level — same per-row/meta write functions, now needing
  (once built) to also accept delegated-Editor writes, which they
  cannot today (§B).
- **Deletion after finalization:** unchanged — atomic batch, per prior
  parts.
- **Stale/offline writes after deletion:** unchanged — same
  resurrection gap as §D.
- **Reassignment between Editors:** **entirely unimplemented.** There
  is no code path anywhere that represents "the delegated Editor was A,
  now it's B" — this doesn't yet exist as a data structure, let alone a
  guarded transition.
- **Can an old client recreate the active draft?** **Yes — unchanged**,
  same `create` rule gap as Part I §M / Part III §III.9 (no check for
  an already-finalized count before allowing a fresh `create`).

**Overall for §F: FAIL / OPEN — mechanism does not exist for the
reassignment half of this section; resurrection risk unchanged and
CRITICAL from prior parts.**

---

## IV.G — Post-Finalization Immutability

Re-verified this session, `firestore.rules` L727, byte-identical to
every prior citation: `allow update, delete: if isOwnerOf(businessId)
&& resource.data.get('type', null) != 'initial';` — **unconditional
Owner update/delete on finalized periodic `stockCounts`, independent of
draft behavior, exactly as the task requires assessing separately.**
**FAIL — unaffected by Decision 46**, since this rule is keyed to
`isOwnerOf` (i.e., Owner/Admin specifically), not to any
Editor/delegated-Editor concept — a delegated Editor cannot exploit this
today only because delegated Editors have no write access to anything
in this area yet (§B), which is an accident of current incompleteness,
not a designed protection.

---

## IV.H — Offline/Reconnect Safety

- **Durable local persistence, queued writes:** unaffected by Decision
  46 — `persistentLocalCache` operates identically regardless of how
  many legitimate writer roles exist. **PASS** (mechanism itself).
- **Reconnect ordering, stale writes:** **FAIL**, unchanged — no
  ordering/version check exists (§C/§D).
- **Authority changes while offline:** **FAIL/OPEN** — there is no
  authority state to change in the first place (§B/§F), so "what
  happens to an offline session when authority changes" cannot yet be
  answered by the current architecture; it's an unimplemented question,
  not merely an unsafe one.
- **Can local persistence replay writes after authority has changed?**
  **Yes, confirmed unsafe** — the SDK's offline queue has no
  application-level awareness of anything resembling authority, so a
  queued write from a since-reassigned former delegated Editor would
  replay exactly as if nothing had changed, once connectivity returns.

**Overall for §H: FAIL, unchanged in mechanism from Part III, now with
an additional "authority changed while offline" case that is
unimplemented rather than merely unsafe.**

---

## IV.I — Live Synchronization

Distinguishing transport-level delivery from actual safe state
adoption, as the task requires:

- **Firestore listeners:** unaffected, still live, still business-
  scoped, unchanged since Part I §E. **PASS** (transport only).
- **Does working state actually adopt remote changes?** **No — FAIL,
  unchanged.** The existing "safe interim fix" notice remains passive
  and whole-draft-level; it does not distinguish Owner/Admin's view
  from a delegated Editor's view, and does not adopt content
  automatically for either.
- **Viewer behavior:** unaffected — Viewers already only ever read via
  the same listeners; nothing about Decision 46 changes this half.
- **Admin + delegated Editor behavior:** **new territory, unimplemented.**
  Neither role has any way today to see, in real time, that the *other*
  legitimate Editor just changed a specific row — both would rely on
  the same manual-reload notice, which (per §C) cannot even tell them
  *which* row changed, only that *something* in the shared draft did.
- **Are legitimate concurrent changes visible?** **Only in the weakest
  sense** — a whole-draft "something changed" signal, not a row-level,
  attributable, real-time view of the other Editor's specific edit.
- **Can the UI silently replace or ignore another user's observation?**
  **Yes — confirmed** per §C: since nothing tracks per-row writer
  identity or version, a UI built naively on top of the existing notice
  mechanism could easily present whichever value happened to load last
  as if it were simply "the" value, with no visible indication a
  second legitimate Editor's differing entry ever existed.

**Overall for §I: FAIL for genuine dual-Editor live-adoption; PASS for
raw transport only.**

---

## IV.J — Multi-Tab / Multi-Session Authority

- **Can two tabs simultaneously act as Owner/Admin or delegated
  Editor?** **Yes, trivially** — same finding as Part III §III.11,
  now applying to two role-slots instead of one: two Owner/Admin tabs,
  two delegated-Editor tabs (if such access existed), or one of each in
  duplicate, are all indistinguishable from the rules layer's
  perspective, since no session-identity concept exists at all.
- **Is authority durable/shared or merely browser-local?** **Currently
  neither — it doesn't exist as a concept**, so the question is
  premature until §B/§F are built; once built, it must be durable/
  Firestore-visible, not browser-local, for the same reason Part III
  §III.11 already established (a browser-local signal is invisible to
  a different browser/tab entirely).
- **Can two sessions both believe they are the delegated Editor?**
  **Not currently testable** (no such state exists), but by
  construction of an eventual naive implementation, yes, unless the
  assignment mechanism itself is built with a single-writer-safe
  update pattern (e.g. a transaction) — flagged as a design
  requirement, not solved here.
- **Does same-user multi-tab behavior create additional concurrency/
  finalization risk?** **Yes — compounds §E.** If Owner/Admin has
  multiple tabs open, each could independently generate its own
  `submissionId` and attempt finalization, exactly as in Part III
  §III.7, entirely unaffected by whether a delegated Editor exists at
  all.

**Overall for §J: FAIL/OPEN, unchanged in root cause from Part III,
scope widened to two role-slots.**

---

## IV.K — Shared-Device / Logout / Cache Isolation

Re-verified this session: no cache-clear-on-auth-transition code found,
no explicit confirmation of Firestore SDK rules-re-evaluation-on-cached-
read behavior beyond what Parts I/II/III already stated. **Marked
UNVERIFIED, not PASS, exactly as the task requires** — unaffected by
Decision 46, since this question is orthogonal to how many legitimate
Editor roles exist. The specific verification required is unchanged
from Part III §III.12: whether Firestore's client SDK re-evaluates
`firestore.rules` against the current `request.auth` on every read
served from `persistentLocalCache`.

**Overall for §K: UNVERIFIED — unaffected by Decision 46.**

---

## IV.L — Scale / Performance

No new scale concern introduced specifically by the two-role model —
an authority-state field (whatever shape it eventually takes) remains,
at most, one additional small field per row or on the meta document,
not a new per-product cost multiplier. Two simultaneous writers instead
of one does not meaningfully change listener/write volume at the
scales already assessed (100–500+ products) in Part I §P/Part III
§III.14 — this reassessment finds no basis to revise that conclusion.
**PASS**, with the caveat (unchanged from every prior part) that this
is assessment only, not a scale redesign.

---

## IV.M — Decision 46-Specific Questions, Answered Directly

1. **Does allowing two legitimate Editors invalidate the previous
   resolution of general multi-writer conflict handling?** **Yes.**
   Part III's RESOLVED classification is invalidated for the bounded
   two-writer case; it is not reverted all the way to Part I/II's
   open-ended framing, since the writer count remains capped at two
   identifiable roles, not arbitrary Staff.
2. **Is same-row concurrent editing now a Rule 8 blocker?** **Yes —
   CRITICAL**, per §IV.C.
3. **What exactly must be preserved when Admin and delegated Editor
   enter different physical observations for the same stock row?**
   Per BDR-0009's physical-observation semantics and Decision 44 §9/
   §21's no-silent-loss invariant: **neither entry may silently
   disappear** — the losing value must remain visible/recoverable
   (e.g. via a conflict record or history), even though only one value
   can ultimately become the working/finalized quantity. Not an
   additive-merge case, consistent with every prior part's own
   reasoning on this point.
4. **Does the current data model contain enough information to
   distinguish those observations?** **No — confirmed FAIL**, per
   §IV.C's schema inspection: no writer-identity field, no per-row
   timestamp/revision.
5. **Can stale writes from a former delegated Editor be rejected
   safely?** **No, not today** — per §IV.D, the same generation-token
   gap applies; no authority-aware rejection exists.
6. **Can authority changes be made authoritative across devices/tabs?**
   **Not currently** — no authority-state concept exists at all (§IV.B/
   §IV.J); once built, it must be Firestore-durable, not browser-local,
   to be authoritative across devices.
7. **Can exactly-one finalization be guaranteed with two legitimate
   Editors?** **No** — per §IV.E, unaffected by Decision 46, the same
   `submissionId`-per-session gap governs regardless of role.
8. **Can a finalized Contagem be made immutable?** **Not currently** —
   per §IV.G, `firestore.rules` grants unconditional Owner update/
   delete on periodic-type `stockCounts`.
9. **Can offline clients safely reconnect after authority changes?**
   **No** — per §IV.H, queued writes replay with no authority
   awareness.
10. **Does the current architecture satisfy the no-silent-loss
    requirement under the Dual Active Editor model?** **No** — per
    §IV.C, a same-row overwrite between two now-legitimate writers is
    exactly the silent loss Decision 44/46 prohibit, and no mechanism
    exists to prevent or record it.

---

## IV.N — Findings Summary Table

| Area | Classification | Severity | Type |
|---|---|---|---|
| A — Business ownership / tenant isolation (storage shape) | PASS | — | Requirement satisfied |
| A — `firestore.rules` enforcing the dual-role model | FAIL | CRITICAL | Not satisfied — technical design + rules change required |
| B — Distinguish Owner/Admin vs. delegated Editor | FAIL | CRITICAL | Not satisfied — technical design required |
| B — Enforce at most one delegated Editor | FAIL | CRITICAL | Not satisfied — technical design required |
| B — Prevent unauthorized users from editing | PARTIAL (accidental) | HIGH | Must be re-verified once delegated-Editor access is built |
| B — Enforce immediate loss on reassignment | FAIL | CRITICAL | Not satisfied — technical design required |
| C — Same-row concurrent write handling | FAIL | **CRITICAL (reinstated)** | Product-level requirement + technical design required |
| C — Data model distinguishes observations | FAIL | CRITICAL | Schema addition required (writer id, per-row version) |
| D — Stale former-(delegated)-Editor protection | FAIL | CRITICAL | Technical design required |
| E — Finalization uniqueness (44-D) | FAIL | CRITICAL | Technical design required, unaffected by Decision 46 |
| F — Reassignment lifecycle | OPEN (unimplemented) | CRITICAL | Technical design required |
| F — Draft resurrection | FAIL | CRITICAL | Technical design required, unaffected |
| G — Post-finalization immutability | FAIL | CRITICAL | Technical design required, unaffected |
| H — Offline/reconnect safety | FAIL | CRITICAL | Technical design required |
| I — Live transport | PASS | — | Requirement satisfied |
| I — Safe live state adoption for dual Editors | FAIL | HIGH | Technical design required |
| J — Multi-tab authority | FAIL/OPEN | CRITICAL | Technical design required, unaffected in root cause |
| K — Shared-device/cache isolation | **UNVERIFIED** | HIGH | Verification required, unaffected by Decision 46 |
| L — Scale/performance | PASS | — | No new concern identified |
| 44-S-A — Viewer authorization | **✅ RESOLVED at governance-requirement level (Decision 52, 2026-09-04)** | — | Technical enforcement/mechanism still required — see §IV.O-f |
| 44-S-C — Finalizer authorization | **✅ RESOLVED at governance-requirement level (Decision 53, 2026-09-04) — Owner/Admin only** | — | Technical enforcement/mechanism still required — see §IV.O-g |
| 44-S-G — Conflict handling | **REOPENED, scope expanded** | CRITICAL | Product Architect decision + technical design required |
| Eligible-delegate pool (who may be assigned) | OPEN (new, narrow gap) | — | Product Architect decision — noted in §IV.O |

---

## IV.O — A Narrow Governance Gap Discovered, Not an Inconsistency

Decision 45/46 resolve **who decides** who may edit (Owner/Admin,
exclusively) but do not state **which pool of users is eligible to be
selected** as the delegated Editor — e.g., any Staff account, or only
an elevated `staffTier == 'manager'` tier (the same precedent pattern
Part III §III.3-A/B already discussed for the now-superseded single-
delegate case). This is not a contradiction between Decision 45 and
Decision 46 — both are silent on this specific point, consistently —
but it is a small residual scope question worth naming explicitly
rather than silently assuming an answer. **Not elevated to a blocker**,
since it can plausibly be answered alongside 44-S-A without holding up
the authority-mechanism design work.

---

## IV.P — Critical and High Blockers

**CRITICAL (prevents Implementation Authorization):**

1. No `firestore.rules` support for a delegated-Editor role at all
   (§IV.A/§IV.B).
2. No data-model support for distinguishing concurrent same-row
   observations (§IV.C) — a schema gap, not merely a missing algorithm.
3. Same-row concurrent-write conflict handling is required again and
   entirely unbuilt (§IV.C) — the single most consequential re-opened
   item relative to Part III.
4. Stale former-(delegated)-Editor write protection remains unbuilt
   (§IV.D), now covering two distinct "current legitimate holder"
   identities instead of one.
5. Cross-device/cross-role finalization uniqueness (44-D) remains
   unbuilt and unaffected by Decision 46 (§IV.E).
6. Draft-reassignment lifecycle does not exist as a mechanism at all
   (§IV.F).
7. Post-finalization immutability gap remains, unaffected (§IV.G).
8. Offline/reconnect replay of stale authority-unaware writes remains
   unbuilt (§IV.H).
9. Multi-tab authority race remains unbuilt, scope widened to two
   role-slots (§IV.J).

**HIGH:**

10. Shared-device/logout cache isolation remains UNVERIFIED (§IV.K).
11. Genuine row-level live-adoption for two simultaneous Editors is
    unbuilt beyond the existing whole-draft passive notice (§IV.I).
12. "Prevent unauthorized users from editing" currently passes only by
    accident (no delegated-Editor access exists yet at all) and must be
    re-verified, not assumed, once that access is built (§IV.B).

---

## IV.O-a — UPDATE (this session): 44-S-G Resolved at the Product Level

**What changed, precisely, and nothing else:** the Product Architect
has since accepted [Decision 47](../specs/stock-count-data-loss-resilience-decision-47-amendment.md)
(SABUSHIMIKE MASCENI, 3 September 2026), resolving **44-S-G's
product-level question**: what must same-row conflict handling
guarantee under the Dual Active Editor model?

**Governing answer, now in force:** live synchronization is the
**primary conflict-avoidance mechanism** — durable writes must
propagate to the other legitimate editor near-real-time, to minimize
the window in which two legitimate editors work from stale values. This
does **not** authorize blind last-write-wins. If a genuine simultaneous
collision still occurs despite live synchronization, the system must
**detect** it and **preserve/account for** the competing observation —
never silently discard it. The **technical mechanism** achieving either
half of this (the live-adoption mechanism; the detect-and-preserve
mechanism) is **explicitly NOT decided** — Decision 47 §5 states this
outright.

**What did NOT change — restated because this is the load-bearing
point of this update:** every technical blocker §IV.P/§IV.Q already
identified remains exactly as open as before. Decision 47 answers *what
conflict handling must achieve*, not *how*. Specifically still open,
unaffected in technical status:

- detecting stale/conflicting legitimate writes;
- preventing silent last-write-wins (now a confirmed product
  *requirement*, per Decision 47 §2.3 — not merely a risk finding
  anymore, but still technically unimplemented);
- preserving/accounting for competing observations;
- genuine live working-state adoption (beyond the existing passive
  whole-draft notice);
- delegated Editor authorization (the `firestore.rules` branch does not
  exist);
- authority/reassignment enforcement;
- former delegated Editor stale-write rejection;
- exact-one finalization (44-D);
- post-finalization immutability;
- offline/reconnect safety;
- multi-tab authority;
- shared-device/cache isolation (44-F, still UNVERIFIED).

**This does not move the Rule 8 verdict to READY.** §IV.Q and §IV.R
below are updated to reflect the resolution of 44-S-G's product-level
half only; the verdict itself is unchanged in tier.

---

## IV.O-b — UPDATE (this session): 44-S-D Resolved at the Governance-Requirement Level

[Decision 48 — Authority Model Governance Requirements](../specs/stock-count-data-loss-resilience-decision-48-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 3 September 2026), settling
what the authority model must guarantee: authority ownership (§2), the
delegated slot (§3), concurrent legitimate authority (§4), the
assignment-change state transition (§5), stale former-Editor protection
(§6), offline behavior (§7), the Case-1-vs-Case-2 distinction (§8), and
the Viewer boundary (§9).

**Two distinct claims, kept explicit and not conflated:**

- **44-S-D governance requirements: ✅ RESOLVED**, per Decision 48.
- **44-S-D technical mechanism/design: STILL OPEN.** Decision 48
  selects no mechanism (no Firestore transaction, lease, lock, revision
  counter, server timestamp, Cloud Function, security-rule design, or
  client-side design) — that remains a fully separate, not-yet-started
  gate.

**Findings B, D, F, H, and J below (§IV.B, §IV.D, §IV.F, §IV.H, §IV.J)
remain exactly as classified — FAIL / OPEN — technical design
required.** Decision 48 gives that design work a settled brief to build
against; it does not perform any of it. **None of the CRITICAL
technical findings concerning authority enforcement, delegated-Editor
authorization, reassignment enforcement, stale former-Editor
protection, offline authority handling, or multi-tab authority are
reclassified by this update** — every one of them requires the still-
undecided technical mechanism before it can move off FAIL/OPEN. §IV.Q
and §IV.R below are updated only to move 44-S-D from "technical design
decision, ungoverned" to "technical design decision, now governed by
Decision 48" — not to RESOLVED.

---

## IV.O-c — UPDATE (2026-09-04): 44-S-F Resolved at the Governance-Requirement Level

[Decision 49 — Former Delegated Editor Reconnection Governance
Requirements](../specs/stock-count-data-loss-resilience-decision-49-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 4 September 2026), settling
the required product-level outcome for every reconnection scenario Part
IV named: remaining assigned while offline (§2), being reassigned while
offline (§3), queued writes present at revocation (§4), stale local
client belief (§5), and sequential reassignment chains (§6) — built
directly on Decision 48's already-accepted authority-ownership and
assignment-transition principles, and keeping four concepts
categorically distinct throughout (offline-but-authorized,
offline-and-revoked, historical observation, stale queued write; §7 of
Decision 49).

**Two distinct claims, kept explicit and not conflated:**

- **44-S-F governance requirements: ✅ RESOLVED**, per Decision 49.
- **44-S-F technical mechanism/design: STILL OPEN.** Decision 49
  selects no mechanism (no Firestore transaction, lease, lock, revision
  counter, server timestamp, Cloud Function, security-rule design, or
  client-side design) — that remains a fully separate, not-yet-started
  gate, exactly as Decision 48 left 44-S-D's mechanism open.

**Findings D, F, and H below (§IV.D, §IV.F, §IV.H) remain exactly as
classified — FAIL / OPEN — technical design required, for their
reconnection-specific portions as well as their non-reconnection
portions.** Decision 49 gives that design work a settled brief to build
against; it does not perform any of it. **None of the CRITICAL
technical findings concerning stale former-Editor protection,
reassignment lifecycle, or offline/reconnect safety are reclassified by
this update** — every one of them requires the still-undecided
technical mechanism before it can move off FAIL/OPEN. §IV.Q and §IV.R
below are updated only to move 44-S-F from "technical design decision,
ungoverned" to "technical design decision, now governed by Decision
49" — not to RESOLVED.

---

## IV.O-d — UPDATE (2026-09-04): 44-D Resolved at the Governance-Requirement Level

[Decision 50 — Exactly-One Finalization Protection](../specs/stock-count-data-loss-resilience-decision-50-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 4 September 2026), settling
the required product-level outcome for exactly-one finalization: the
meaning of "exactly one" (§2), first-successful-finalization handling
(§3), stale working state at finalization time (§4), pending writes
arriving at or after finalization (§5), the required separation between
finalization protection and legitimate historical observations (§6),
no new authority model introduced (§7), and offline behavior at the
finalization moment (§8) — explicitly independent of, and without
reopening, the Owner/Admin + delegated Editor authority model already
governed by Decisions 46, 48, and 49.

**Two distinct claims, kept explicit and not conflated:**

- **44-D governance requirements: ✅ RESOLVED**, per Decision 50.
- **44-D technical mechanism/design: STILL OPEN.** Decision 50 selects
  no mechanism (no Firestore transaction, lease, lock, revision
  counter, compare-and-set, server timestamp, Cloud Function,
  security-rule design, schema change, or client-side design) — that
  remains a fully separate, not-yet-started gate, exactly as Decision
  48 left 44-S-D's mechanism open and Decision 49 left 44-S-F's
  mechanism open.

**Finding E below (§IV.E, "Finalization Uniqueness") remains exactly as
classified — FAIL / OPEN — technical design required, CRITICAL,
confirmed reachable in production today.** Decision 50 gives that
design work a settled brief to build against; it does not perform any
of it. **The CRITICAL technical finding concerning finalization
uniqueness is not reclassified by this update** — it requires the
still-undecided technical mechanism before it can move off FAIL/OPEN.
§IV.Q and §IV.R below are updated only to move 44-D from "technical
design decision, ungoverned" to "technical design decision, now
governed by Decision 50" — not to RESOLVED. **44-S-C (finalizer
authorization) is unaffected by this decision and remains a separate,
still-open Product Architect decision.**

---

## IV.O-e — UPDATE (2026-09-04): 44-F Resolved at the Governance-Requirement Level

[Decision 51 — Shared-Device / Cache Isolation Requirements](../specs/stock-count-data-loss-resilience-decision-51-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 4 September 2026), settling
the required product-level guarantee for business isolation, user/
session isolation, logout, business switching, offline state across
context changes, pending writes across context changes, the required
separation between context-isolation protection and legitimate
historical observations, no new authority model, safe recovery, and an
explicit six-point prohibition against cross-context leakage —
explicitly independent of, and without reopening, the Owner/Admin +
delegated Editor authority model (Decisions 46/48), the reconnection
governance requirements (Decision 49), or the finalization-protection
governance requirements (Decision 50).

**Two distinct claims, kept explicit and not conflated:**

- **44-F governance requirements: ✅ RESOLVED**, per Decision 51.
- **44-F technical verification/mechanism/design: STILL OPEN.**
  Decision 51 performs no technical verification and selects no
  mechanism (no IndexedDB schema, Firebase/Firestore persistence API
  usage, cache naming, storage keys, authentication listeners,
  Firestore queries, encryption, cleanup algorithm, logout
  implementation, service worker, or browser-specific mechanism) —
  including the specific, already-named Firestore SDK
  cache/`request.auth`-re-evaluation verification (§IV.K), which
  remains a fully separate, not-yet-performed step, exactly as
  Decisions 48, 49, and 50 left their own technical mechanisms open.

**Finding K below (§IV.K, "Shared-Device / Logout / Cache Isolation")
remains exactly as classified — UNVERIFIED — not PASS, HIGH, technical
verification and design required.** Decision 51 gives that verification
and design work a settled brief to build against; it does not perform
any of it. **The finding is not reclassified to PASS or RESOLVED by
this update** — it requires the still-outstanding technical
verification before it can move off UNVERIFIED. §IV.Q and §IV.R below
are updated only to move 44-F from "technical design decision,
ungoverned" to "technical design decision, now governed by Decision
51" — not to RESOLVED or PASS. **44-S-A (Viewer authorization), 44-S-C
(finalizer authorization), and the eligible-delegate-pool question are
unaffected by this decision and remain separate, still-open Product
Architect decisions.**

---

## IV.O-f — UPDATE (2026-09-04): 44-S-A Resolved at the Governance-Requirement Level

[Decision 52 — Viewer Authorization Requirements](../specs/stock-count-data-loss-resilience-decision-52-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 4 September 2026), settling
the governance-requirement layer for 44-S-A: who is eligible to be a
Viewer (business-authorized users other than Owner/Admin or the
currently delegated Editor, plus former delegated Editors who remain
otherwise business-authorized); the requirement that mere
authentication is insufficient and tenant isolation (Decision 51) must
be preserved; the full set of Viewer permissions and prohibitions,
including that edit-authority exclusion must be authoritative and not
merely UI-level; former-delegated-Editor Viewer eligibility, applying
Decisions 48/49 without changing them; Viewer entitlement to live
synchronization with authoritative-state/stale-state/historical-
observation kept distinguishable; Viewer visibility into finalization
state without any finalizer inference (44-S-C remains untouched);
Viewer-authorization-change handling online/offline/reconnecting with
no automatic role takeover; and shared-device isolation for Viewer
access per Decision 51 — explicitly independent of, and without
reopening, the Editor authority model (Decisions 46/48), the
reconnection governance requirements (Decision 49), the finalization-
protection governance requirements (Decision 50), or the context-
isolation governance requirements (Decision 51).

**Two distinct claims, kept explicit and not conflated:**

- **44-S-A governance requirements: ✅ RESOLVED**, per Decision 52.
- **44-S-A technical enforcement/mechanism: STILL OPEN.** Decision 52
  selects no Firestore rules, authentication implementation, role
  claims, database schema, query, index, security-rule expression, UI
  implementation, invitation mechanism, membership table, or cache
  mechanism — those remain a fully separate, not-yet-started gate,
  exactly as Decisions 48, 49, 50, and 51 left their own technical
  mechanisms open.

**The open item for 44-S-A in §IV.N's summary table is not
reclassified to PASS by this update** — it moves from "OPEN — Product
Architect decision required" to "governance-resolved — technical
enforcement required," which §IV.Q and §IV.R below record. **No
CRITICAL/HIGH technical finding in §IV.P — including Finding K
(shared-device/cache isolation, still UNVERIFIED) — is reclassified by
this update.** §IV.Q and §IV.R below are updated only to move 44-S-A
from "open Product Architect decision" to "resolved at the
governance-requirement level, technical enforcement now governed by
Decision 52" — not to RESOLVED at the technical level. **44-S-C
(finalizer authorization) and the eligible-delegate-pool question are
unaffected by this decision and remain separate, still-open Product
Architect decisions.**

---

## IV.O-g — UPDATE (2026-09-04): 44-S-C Resolved at the Governance-Requirement Level

[Decision 53 — Finalizer Authorization Requirements](../specs/stock-count-data-loss-resilience-decision-53-amendment.md)
has been **✅ ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY** (SABUSHIMIKE MASCENI, 4 September 2026), settling
the governance-requirement layer for 44-S-C: **Owner/Admin is the only
authorized finalizer**, holding inherent authority (restating Decision
46/48, not reopening either); editing authority does not imply
finalization authority — the currently delegated Editor may edit per
Decision 46 but **is not authorized to finalize**; a Viewer **is not
authorized to finalize**, restating Decision 52 §4/§8, not reopening
either; a former delegated Editor **is not authorized to finalize**,
since delegated Editors never held finalization authority to lose or
regain, applying Decisions 48/49 without changing either; an
unauthorized user **is not authorized to finalize**; offline status
neither removes Owner/Admin's finalization authority nor creates
finalization authority for any other role; a finalization attempt
following delegated-Editor reassignment resolves at the eligibility
level rather than the reconnection-timing level; and Decision 50's
exactly-one-finalization guarantee remains entirely untouched and
separate from the who-may-attempt question this decision answers —
explicitly independent of, and without reopening, the Editor authority
model (Decisions 46/48), the reconnection governance requirements
(Decision 49), the finalization-protection governance requirements
(Decision 50), the context-isolation governance requirements (Decision
51), or the Viewer-authorization governance requirements (Decision 52).

**Two distinct claims, kept explicit and not conflated:**

- **44-S-C governance requirements: ✅ RESOLVED**, per Decision 53.
  Owner/Admin only; delegated Editor, Viewer, former delegated Editor,
  and unauthorized users are all explicitly excluded from finalization
  eligibility.
- **44-S-C technical enforcement/mechanism: STILL OPEN.** Decision 53
  selects no Firestore authorization/enforcement mechanism, no
  finalization-guard mechanism (that remains Decision 50's own separate
  open item), no schema, no live-synchronization mechanism, no
  collision-detection mechanism, no cache-isolation mechanism, no
  Viewer-enforcement mechanism, and no delegated-Editor-enforcement
  mechanism — those remain a fully separate, not-yet-started gate,
  exactly as Decisions 48, 49, 50, 51, and 52 left their own technical
  mechanisms open.

**The open item for 44-S-C in §IV.N's summary table is not
reclassified to PASS by this update** — it moves from "OPEN (elevated
priority) — Product Architect decision required" to "governance-
resolved — technical enforcement required," which §IV.Q and §IV.R
below record. **No CRITICAL/HIGH technical finding in §IV.P — including
Finding E (finalization uniqueness) and Finding K (shared-device/cache
isolation, still UNVERIFIED) — is reclassified by this update.** §IV.Q
and §IV.R below are updated only to move 44-S-C from "open Product
Architect decision" to "resolved at the governance-requirement level,
technical enforcement now governed by Decision 53" — not to RESOLVED
at the technical level. **The eligible-delegate-pool question is
unaffected by this decision and remains a separate, still-open Product
Architect question.**

**With this update, all seven of 44-S-A/44-S-C/44-S-D/44-S-F/44-S-G/
44-D/44-F now have settled governance-requirement answers.** Only the
eligible-delegate-pool question (§IV.O) remains as a fully open Product
Architect decision. Every corresponding technical mechanism — and, for
44-F, the named technical verification — remains separately required
before Rule 8 can move toward READY.

---

## IV.O-h — ELIGIBLE-DELEGATE-POOL QUESTION UNDER CONSIDERATION — NOT YET RESOLVED

[Decision 54 — Delegated Editor Eligibility & Selection Requirements](../specs/stock-count-data-loss-resilience-decision-54-amendment.md)
has been **drafted (STATUS: DRAFTED — NOT ACCEPTED)**, proposing the
governance-requirement layer for the eligible-delegate-pool question
first named in §IV.O above: any user currently business-authorized in
relation to the specific business is eligible for the Owner/Admin to
select as delegated Editor, with no additional eligibility tier
introduced by this decision (any further technical subdivision, e.g.
Decision 44-A's staff-tier question, remains separate and unaddressed);
eligibility is tied to the specific business, preserving Decision 51's
tenant isolation; the Owner/Admin's exclusive, explicit selection
authority, at-most-one-delegate rule, and non-automatic delegation are
all restated from Decisions 46/48, not reopened; the existing
"Owner/Admin" terminology is preserved exactly as used throughout the
accepted governance chain, with no silent expansion to a separately
defined "Admin" role; loss of underlying business authorization ends
delegate eligibility on a continuing basis, not merely at the moment of
selection; a former delegated Editor's eligibility, reselection, and
Viewer status all apply Decisions 48/49/52 unchanged; offline status
neither preserves nor blocks a new Owner/Admin selection; and being
eligible, being currently selected, being currently delegated, being a
Viewer, and being Owner/Admin are kept as five categorically distinct
concepts — explicitly independent of, and without reopening, the
Editor authority model (Decisions 46/48), the reconnection governance
requirements (Decision 49), the context-isolation governance
requirements (Decision 51), or the Viewer-authorization governance
requirements (Decision 52).

**It does not select a technical mechanism and is not yet accepted.**
**The eligible-delegate-pool question is now being addressed at the
governance-requirement level only — not resolved.** The open item in
§IV.O above, and in §IV.Q and §IV.R below, remains exactly as
classified — **OPEN — narrow, non-blocking** — unchanged by this draft.
No finding or open decision is marked resolved by this notice. §IV.Q
and §IV.R are **not** updated by this notice — the eligible-delegate-
pool question remains listed there as open until (and unless) Decision
54 is formally accepted. **Decision 44-A (Staff Access) is explicitly
not addressed by Decision 54 and remains separately open.** This notice
exists so a reader does not mistake a drafted governance proposal for a
resolved Rule 8 open decision.

---

## IV.Q — Decisions Still Required, Separated by Type (updated this session)

**Product Architect decisions:**

- **44-S-A — ✅ RESOLVED at the Product Architect governance-requirement
  level by Decision 52, 2026-09-04.** See §IV.O-f. The technical
  enforcement/mechanism remains open — folded into the technical design
  items immediately below, now built against a settled governance
  brief rather than an open one.
- **44-S-C — ✅ RESOLVED at the Product Architect governance-requirement
  level by Decision 53, 2026-09-04.** See §IV.O-g. **Owner/Admin is the
  only authorized finalizer** — the delegated Editor, Viewer, former
  delegated Editor, and unauthorized users are all explicitly excluded.
  The technical enforcement/mechanism remains open — folded into the
  technical design items immediately below, now built against a
  settled governance brief rather than an open one.
- **44-S-D — ✅ RESOLVED at the governance-requirement level by
  Decision 48, 2026-09-03.** See §IV.O-b. The technical mechanism
  remains open — folded into the technical design items immediately
  below, now built against a settled governance brief rather than an
  open one.
- **44-S-F — ✅ RESOLVED at the governance-requirement level by
  Decision 49, 2026-09-04.** See §IV.O-c. The technical mechanism
  remains open — folded into the technical design items immediately
  below, now built against a settled governance brief rather than an
  open one.
- **44-D — ✅ RESOLVED at the governance-requirement level by
  Decision 50, 2026-09-04.** See §IV.O-d. The technical mechanism
  remains open — folded into the technical design items immediately
  below, now built against a settled governance brief rather than an
  open one.
- **44-F — ✅ RESOLVED at the Product Architect governance-requirement
  level by Decision 51, 2026-09-04.** See §IV.O-e. The technical
  verification/mechanism remains open — folded into the technical
  design items immediately below, now built against a settled
  governance brief rather than an open one.
- **44-S-G** — **✅ RESOLVED at the product level by Decision 47,
  2026-09-03.** Live synchronization is the primary conflict-avoidance
  mechanism; detect-and-preserve is required for any genuine collision;
  no blind last-write-wins. **The technical mechanism remains open** —
  folded into the two technical items immediately below, which are
  themselves unaffected in status by this resolution.
- **Eligible-delegate pool** (§IV.O) — narrow, non-blocking, still
  open. **The only remaining fully open Product Architect decision.**

**Technical design decisions (mechanism, not policy) — all unaffected in RESOLUTION status by Decisions 47/48/49/50/51/52/53, now governed by settled briefs:**

- **44-S-D mechanism** (how authority is represented, checked, and
  enforced) — still open; must satisfy Decision 48's governance
  requirements and support two concurrent role-slots (Owner/Admin fixed
  + one revocable delegate). **Not resolved — a governance brief is not
  a design.**
- **44-S-F mechanism** (former-Editor reconnection mechanism) — still
  open; must satisfy Decision 49's governance requirements and
  distinguish "reassigned-away delegated Editor" from "Owner/Admin,"
  now informed by Decision 48 §6/§7's and Decision 49's governance
  requirements. **Not resolved — a governance brief is not a design.**
- **44-D mechanism** (finalization guard mechanism) — still open; must
  satisfy Decision 50's governance requirements (exactly-one
  finalization; rejection, not silent success, for any later attempt;
  no discarding of durable historical observations; no new authority
  model), unaffected in shape by Decision 46, 47, 48, or 49. **Not
  resolved — a governance brief is not a design.**
- **44-S-C mechanism** (finalizer-eligibility enforcement mechanism) —
  still open; must satisfy Decision 53's governance requirements
  (Owner/Admin-only finalization, enforced authoritatively, not
  UI-only) and compose with 44-D's own finalization-guard mechanism —
  the two are separate mechanisms answering separate questions (who
  may attempt vs. whether more than one may succeed), both still
  required. **Not resolved — a governance brief is not a design.**
- **44-F mechanism** (shared-device/cache isolation mechanism,
  including the named Firestore SDK cache/`request.auth`-re-evaluation
  technical verification) — still open; must satisfy Decision 51's
  governance requirements (business isolation; user/session isolation;
  logout; business switching; offline-state/pending-write handling
  across context changes; no discarding of durable historical
  observations; no new authority model; the six-point cross-context-
  leakage prohibition), and the technical verification named in §IV.K
  still has not been performed. **Not resolved — a governance brief is
  not a design, and is not itself the verification.**
- **44-S-A mechanism** (Viewer-eligibility and Viewer-restriction
  enforcement mechanism) — still open; must satisfy Decision 52's
  governance requirements (eligibility limited to business-authorized
  users; edit-authority exclusion authoritative and server-enforced,
  not UI-only; former-delegated-Editor Viewer eligibility per Decisions
  48/49; live-synchronization entitlement with state-distinguishability;
  finalization-visibility without finalizer inference; shared-device
  isolation per Decision 51), unaffected in shape by any prior
  decision. **Not resolved — a governance brief is not a design.**
- **Same-row conflict-detection/live-adoption mechanism** — still open;
  has a settled product-level brief, per Decision 47 (live-sync-first,
  detect-and-preserve, no blind last-write-wins) — the mechanism
  itself (version/precondition check, conflict record, transaction, or
  another approach) is still not selected.
- **Delegated-Editor `firestore.rules` branch** — still open, required
  before any of the above can be exercised at all.

---


## IV.R — Final Rule 8 Verdict (updated this session)

# READY AFTER DECISIONS

**Verdict tier unchanged after Decision 47, Decision 48, Decision 49,
Decision 50, Decision 51, Decision 52, and Decision 53.** 44-S-G's
product-level question, 44-S-D's governance-requirement question,
44-S-F's governance-requirement question, 44-D's governance-requirement
question, 44-F's governance-requirement question, 44-S-A's
governance-requirement question, and 44-S-C's governance-requirement
question are now all resolved (§IV.O-a, §IV.O-b, §IV.O-c, §IV.O-d,
§IV.O-e, §IV.O-f, §IV.O-g) — real, meaningful progress: seven of the
eight open decisions Part IV originally identified now have settled
governance briefs for the technical design/verification stage to build
against, leaving only the eligible-delegate-pool question fully open.
It does **not** reduce the CRITICAL/HIGH blocker count in §IV.P, all of
which remain open exactly as stated, because none of Decision 47,
Decision 48, Decision 49, Decision 50, Decision 51, Decision 52, or
Decision 53 selected or performed a technical mechanism/verification —
Decision 48 §10/§11, Decision 49 §8/§9, Decision 50 §9/§10, Decision 51
§12/§13, Decision 52 §11/§12, and Decision 53 §12/§13 all state this
outright, and every one of §IV.P's nine CRITICAL findings plus §IV.P
item 10's HIGH finding requires a mechanism decision or technical
verification, not a governance-requirement decision, before it can move
off FAIL/OPEN or UNVERIFIED.

**Not forced, independently re-derived** — nothing found is a
fundamental architectural or security impossibility. The dual-role
model remains buildable as an extension of the existing business-owned-
draft, listener-based architecture: it requires a new `firestore.rules`
branch (a precedented pattern — the existing `staffTier == 'manager'`
carve-out elsewhere in the same file is structurally similar), an
additive schema field or two (writer identity, per-row version), and a
genuinely new conflict-detection/live-adoption mechanism, authority
mechanism, finalization-guard mechanism, finalizer-eligibility
enforcement mechanism, shared-device/cache-isolation mechanism (pending
its own named technical verification), and Viewer-eligibility-
enforcement mechanism, all now built against settled governance
briefs — all additive extensions, not a redesign of what already works
(business-owned storage, live listeners, durable local persistence,
atomic finalization-batch cleanup).

**The minimum decisions required before Implementation Planning can
begin, updated:**

1. ~~44-S-G, reopened/expanded~~ **✅ RESOLVED — Decision 47,
   2026-09-03.**
2. ~~44-S-D governance requirements~~ **✅ RESOLVED — Decision 48,
   2026-09-03.** **44-S-D technical mechanism — still open.**
3. ~~44-S-F governance requirements~~ **✅ RESOLVED — Decision 49,
   2026-09-04.** **44-S-F technical mechanism (former-delegate
   reconnection mechanism) — still open**, now informed by Decision 48
   §6/§7 and Decision 49 §2–§7.
4. ~~44-D governance requirements~~ **✅ RESOLVED — Decision 50,
   2026-09-04.** **44-D technical mechanism (finalization guard
   mechanism) — still open**, now informed by Decision 50 §2–§8.
5. ~~44-F governance requirements~~ **✅ RESOLVED — Decision 51,
   2026-09-04.** **44-F technical verification/mechanism (shared-device/
   cache isolation, including the named Firestore SDK cache/
   `request.auth`-re-evaluation verification) — still open**, now
   informed by Decision 51 §2–§11.
6. ~~44-S-A governance requirements~~ **✅ RESOLVED — Decision 52,
   2026-09-04.** **44-S-A technical enforcement/mechanism (Viewer
   eligibility and Viewer restriction) — still open**, now informed by
   Decision 52 §2–§10.
7. ~~44-S-C governance requirements~~ **✅ RESOLVED — Decision 53,
   2026-09-04.** **44-S-C technical enforcement/mechanism (finalizer-
   eligibility restriction to Owner/Admin only) — still open**, now
   informed by Decision 53 §2–§11, and composing with — not replacing —
   Decision 50's own finalization-guard mechanism.
8. **The new delegated-Editor `firestore.rules` branch** and the
   **same-row conflict-detection/live-adoption mechanism** and the
   **authority-enforcement mechanism** and the **finalization-guard
   mechanism** and the **finalizer-eligibility enforcement mechanism**
   and the **shared-device/cache-isolation mechanism** and the
   **Viewer-eligibility-enforcement mechanism** (all now scoped by
   Decisions 47, 48, 49, 50, 51, 52, and 53's settled governance
   briefs, none yet selected or, for 44-F, verified) — technical
   design, dependent on 2–7 above.

**Not required to begin design work, though still open:** the
eligible-delegate-pool question (§IV.O) — the only fully open Product
Architect decision remaining after this session.

---


## IV.S — Reporting Summary (Part IV, original)

> **Addendum, this session:** item 6 below (decisions still required)
> is superseded by §IV.O-a/§IV.O-b/§IV.O-c/§IV.O-d/§IV.O-e/§IV.O-f/
> §IV.O-g/§IV.Q's updates — 44-S-G is now resolved at the product level
> by Decision 47, 44-S-D's governance-requirement layer is resolved by
> Decision 48, 44-S-F's governance-requirement layer is resolved by
> Decision 49, 44-D's governance-requirement layer is resolved by
> Decision 50, 44-F's governance-requirement layer is resolved by
> Decision 51, 44-S-A's governance-requirement layer is resolved by
> Decision 52, and 44-S-C's governance-requirement layer is resolved by
> Decision 53 (Owner/Admin only). Item 7 (verdict) is unchanged in
> tier. Items 1–5 and 8 are otherwise still accurate. See §IV.O-a,
> §IV.O-b, §IV.O-c, §IV.O-d, §IV.O-e, §IV.O-f, and §IV.O-g for the
> current, authoritative statements.

1. **File(s) changed:** exactly one —
   `docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`
   (this file), with Part IV inserted above the preserved, unmodified
   Parts III, II, and I.
2. **Current governing baseline used:** Decision 46 — ACCEPTED,
   REQUIREMENTS ONLY; Owner/Admin + at most one delegated Editor.
3. **Major PASS findings:** business-owned storage shape (§IV.A); live
   listener transport (§IV.I, transport-only); scale/performance at
   existing product-count ranges (§IV.L).
4. **Major FAIL/PARTIAL/UNVERIFIED findings:** no `firestore.rules`
   support for a delegated-Editor role at all (§IV.A/§IV.B); no
   data-model support for distinguishing concurrent observations
   (§IV.C); same-row conflict handling reopened as CRITICAL (§IV.C);
   stale former-Editor protection unchanged/unbuilt (§IV.D);
   finalization uniqueness unbuilt, unaffected (§IV.E); reassignment
   lifecycle unimplemented (§IV.F); post-finalization immutability gap
   unaffected (§IV.G); offline/reconnect replay risk (§IV.H); genuine
   dual-Editor live adoption unbuilt (§IV.I); multi-tab authority race
   unbuilt (§IV.J); shared-device/cache isolation **UNVERIFIED**
   (§IV.K).
5. **Critical/High blockers:** nine CRITICAL, three HIGH — full list in
   §IV.P.
6. **Decisions still required:** four Product Architect decisions
   (44-S-A, 44-S-C, 44-S-G reopened, eligible-delegate pool) and six
   technical design decisions (44-S-D, 44-S-F, 44-D, 44-F, new
   conflict-detection mechanism, new delegated-Editor rules branch) —
   full list in §IV.Q.
7. **Final Rule 8 verdict:** **READY AFTER DECISIONS** — not forced,
   decision set materially larger than Part III's.
8. **Confirmation:** no application code, `firestore.rules`, schema,
   UI, or test file was changed to produce this reassessment — only
   this one governance markdown file, and only by insertion; Parts
   I/II/III were not deleted, edited, or rewritten.

---

# PART III — Corrected Rule 8 Reassessment — Decision 44 Refinement: Single Active Editor + Live Read-Only Viewers

## ⚠️ SUPERSEDED — see Part IV above

*(This Part III reassessment is preserved exactly as originally
written, for audit-history purposes. **Its central finding — that
general same-row multi-writer conflict resolution is RESOLVED because
no legitimate simultaneous-writer scenario can occur — has been
superseded by [Decision 46 — Dual Active Editor Authority](../specs/stock-count-data-loss-resilience-decision-46-amendment.md),
accepted 3 September 2026, and Part IV's fresh reassessment above.**
Decision 46 reintroduces a legitimate simultaneous-writer scenario
(Owner/Admin + one delegated Editor), so Part III's elimination of the
same-row conflict problem no longer holds. Where Part III and Part IV
disagree, Part IV governs. Nothing below this notice was edited.)*

**Why this correction exists:** Part II, produced in the immediately
preceding session, restated the general concurrent-multi-writer
conflict findings from Part I (CRITICAL-1, "same-row concurrent-write
silent overwrite") largely intact, using the label "TRANSFORMED" — but
its own prose and its own before/after matrix continued to describe the
*combined* problem ("stale-write protection... same-row concurrent
edits... conflict preservation") as a single, still-CRITICAL,
still-largely-unreduced item, and its final verdict (§II.19) listed
"44-S-B → 44-S-D → 44-S-E/44-S-F" without first establishing, plainly
and separately, that **the specific scenario of two simultaneously
active, both-legitimately-writing sessions on the same row is no longer
a scenario the accepted model permits at all** — that scenario is not
"reduced," it is **eliminated from the set of scenarios the product
requirements describe**, because the accepted model does not allow two
sessions to simultaneously hold valid editing authority in the first
place (INV-44-S01/INV-44-S04). Part II conflated this eliminated
scenario with the genuinely-still-open stale-former-editor scenario
under one heading, which reads as "the CRITICAL blocker is basically
still there, just relabeled." **This part corrects that.**

**Governing chain:** unchanged from Part II — Decision 38 → Decisions
39–42 → Decision 44 (✅ Accepted, 3 Sept 2026) → Part I (🟡 original Rule
8, READY AFTER DECISIONS) → Decision 44 Refinement (✅ Accepted, 3 Sept
2026) → Part II (🟡 first reassessment, now superseded by this
correction) → **Part III (this correction, current)**.

**Repository baseline:** unchanged — `main = origin/main`, still no
application code, `firestore.rules`, schema, or test implementing any
part of Decision 44 or its refinement exists anywhere in the
repository. Every finding below is re-derived from the same,
unchanged, already-reviewed evidence (Part I §A/§B, Part II §II.1–§II.15)
— **no new code inspection was required to correct the classification
error**; the error was in how existing evidence was labeled and framed,
not in what evidence was gathered.

---

## III.0 — The Conceptual Correction, Stated Precisely

The accepted product requirement is:

> At most one active editing authority may modify an unfinished
> Periodic Contagem at any given time... Two independent sessions must
> NOT simultaneously have valid editing authority, even when they
> belong to the same user.

This requirement means the product **no longer needs, and no longer
should have, any capability that reconciles two simultaneously-valid,
concurrently-written observations of the same product**. That
capability — a collaborative conflict-resolution/merge/preservation
system for genuinely simultaneous legitimate editors — is not merely
lower-priority under the new model. **It is not a requirement at all
under the accepted model**, because the scenario it would exist to
handle (two authorized sessions both legitimately writing at once) is
excluded by definition, not merely discouraged.

**What remains a requirement is a narrower, different thing:**
protection against a **stale former Editor** — a session that once
held authority, no longer does, and attempts to write anyway. This is
not "the same conflict problem, smaller." It is a **different problem
in kind**: not reconciling two valid observations, but **rejecting one
invalid write from a session that is no longer authoritative.** The two
problems have different correct solutions (a merge/preservation system
vs. a staleness/authority check) and different severity profiles under
normal operation (the first was a routine, expected-to-happen scenario
under open sharing; the second is an edge case — connectivity loss,
device failure, or an explicit takeover — not a normal-operation
occurrence).

**Corrected classification of the two, separated:**

| Item | Corrected classification | Why |
|---|---|---|
| General multi-writer conflict resolution / conflict preservation for simultaneous valid editors | **RESOLVED** | The scenario itself is excluded by the accepted product requirement (INV-44-S01/S04) — there is no longer a legitimate case of two sessions validly writing at once for a conflict-preservation system to serve. Nothing needs to be built to handle a case the product no longer permits. |
| Stale former-Editor write overwriting the current Editor's/Viewer-derived authoritative state | **TRANSFORMED** (still required, not eliminated) | A materially narrower, differently-shaped protection requirement — authority/staleness detection, not conflict merging — remains necessary, per §III.1 below. |

Part II's error was reporting these as one line item. They are two, with
two different verdicts, and this part treats them as such throughout.

---

## III.1 — Authority Transition: The Scenario That Actually Matters

Tracing the exact scenario the corrective task specifies, against the
same code already reviewed in Part I/Part II (no new files needed —
citations point back to the prior parts' own evidence):

1. Session A is the active Editor.
2. Session B is a Viewer.
3. A loses connectivity, closes, becomes inactive, or otherwise loses
   editing authority.
4. B explicitly becomes the new Editor.
5. A later reconnects, with stale local state and/or queued autosaves.
6. A attempts to write.

**Can A still write?** **Yes, today** — because no authority concept
exists anywhere in the schema or rules (Part II §II.1, re-confirmed,
not re-derived from new evidence). `isOwnerOf(businessId)` is the only
gate on any draft write, and it is true for A regardless of whether A
currently holds "authority" in the product sense, because that concept
doesn't exist at the rules layer.

**Can A overwrite B's newer state?** **Yes** — same-document,
last-physical-write-wins semantics on `stockCountDrafts/periodic/items/{rowKey}`
(Part I §E/§N, Part II §II.4, re-confirmed).

**Can A's queued offline writes arrive after B's edits?** **Yes** — the
Firestore SDK's offline queue applies queued writes in order once
connectivity returns, with no awareness of anything happening on B's
session in the interim (Part I §G, unchanged).

**Can A recreate a draft that B finalized/deleted?** **Yes** — A's
existing generation-token cancellation logic is scoped to cancel
against **A's own** subsequent actions, not an externally-observed
authority change or an externally-observed finalization by a *different*
session (Part I §L, Part II §II.7, re-confirmed, not re-derived).

**Can A mutate a finalized `stockCounts` record?** **Yes** —
`firestore.rules` L727 grants unconditional Owner update/delete on
periodic-type `stockCounts`, with no submission-identity or authority
check (Part I §M, Part II §II.8, unchanged).

**Can Firestore rules currently distinguish the former Editor from the
current Editor?** **No.** This is the single fact underlying every
"yes" above — there is no field, claim, or rule condition anywhere in
`firestore.rules` that encodes "session X currently holds editing
authority." `isOwnerOf` answers "is this account the Owner," never
"is this the currently-authoritative session."

**What mechanism would be required to prevent stale former-editor
writes?** Not selected here, per the task's explicit instruction — but
the requirement is now stated precisely: some durable, server-readable
signal of current authority (holder identity + a way to detect
staleness — timestamp, generation counter, or explicit release) that
every draft write can be checked against, either at the rules layer or
via a server-side gate. This is the same technical shape Part II
already named (§II.5); this correction does not change *what* is
needed, only clarifies that it is scoped to **this specific
scenario**, not to general concurrent editing.

---

## III.2 — Decision 44-B, Correctly Reassessed

**Direct answer to the task's key question:**

> If only one session is permitted to edit at a time, do we still need
> a general collaborative conflict-resolution system, or do we only
> need protection against stale writes from sessions that no longer
> possess editing authority?

**The latter is correct, and this is now stated as a finding, not left
ambiguous as Part II left it.** Decision 44-B, in its original form —
a general mechanism for reconciling two simultaneously-valid,
concurrently-entered physical observations of the same product,
compared across six candidate architectures in Part I §F (optimistic
version check, transactional compare-and-set, per-row revision,
explicit conflict record, versioned history, append-only observation
records) — **is no longer required in that original form.** The
scenario those six candidates were built to reconcile does not occur
under a correctly-enforced single-editor model.

**Decision 44-B is not deleted. It is replaced, in scope, by a narrower
requirement:** stale-former-editor / authority-transition write
protection (§III.1). Of the six original candidates, the ones that
remain relevant are exactly the ones that detect staleness against a
*single* prior state (optimistic version check, per-row revision,
transactional compare-and-set) — because there is now only ever one
"prior legitimate writer" to check staleness against, never two
concurrent ones. The candidates aimed at *preserving both sides of a
genuine conflict* (explicit conflict records, versioned history,
append-only observation records) are **no longer well-motivated** —
there is no second valid observation to preserve; a stale former
Editor's write is not a competing valid observation, it is simply
invalid and should be rejected, not archived as an alternative reading.

**This is the corrected verdict: Decision 44-B, in its original
six-candidate, conflict-preservation framing, is RESOLVED as
originally scoped — it does not need to be decided in that form. What
remains open is a materially smaller technical question, now properly
identified as part of Decision 44-S-D/44-S-F (the authority model and
former-editor reconnection behavior), not as an independent
conflict-resolution decision.**

---

## III.3 — A, B, C: Viewer / Editor / Finalizer Authorization

**A. Viewer authorization.** Who may view an unfinished Periodic
Contagem remains genuinely undecided — `stockCountDrafts` is Owner-only
today for every verb (Part I §O, unchanged), so there is no existing
answer to inherit. **Kept open**, matching Decision 44-S-A. No Staff
access is assumed.

**B. Editor authorization.** Who may acquire editing authority remains
genuinely undecided. **Not assumed from existing governance** —
nothing in the repository currently distinguishes "may view" from "may
become Editor" since neither concept exists in code yet. **Kept open**,
matching Decision 44-S-B, and — as in Part II — this remains the
single most load-bearing open decision, since every enforcement design
question depends on it.

**C. Finalizer authorization.** Three options were named in the task:
the active Editor, Owner, or another existing tier/combination.
**Existing governance already substantially answers this**, independent
of anything in Decision 44 or its refinement: periodic `stockCounts`
creation has been Owner-only at the rules layer since before Decision
44 (the original specification's own §5 explicitly notes this; Part I
confirmed it unchanged). This reassessment does **not** silently decide
that this remains the answer going forward — the Product Architect
could choose to restrict finalization further (e.g., to the active
Editor specifically, which is a strictly narrower set than "Owner," if
the Owner is not always the Editor) — but it correctly notes that
**"Owner-only" is not a new decision Decision 44-S-C needs to invent
from nothing; it is an existing baseline the Product Architect may
choose to keep, narrow, or otherwise revisit.**

---

## III.4 — D, E, F: Authority Model, Offline Takeover, Reconnection

**D. Editing authority model.** The product requirement is already
accepted (one active editing session at a time). What must be
guaranteed, stated without selecting a mechanism:

- Exactly one session can be recognized, at the data layer, as
  currently authoritative, at any moment.
- That recognition must be checkable by a write path (rules or a
  server gate) before a write is accepted.
- Acquisition of authority must be atomic enough that two sessions
  attempting to acquire it "simultaneously" cannot both succeed (the
  authority-acquisition race named in Part II §II.17, still a live open
  risk, unresolved by this correction).
- Release/loss of authority must be detectable by other sessions in a
  way that does not depend on the departing session's own cooperation
  (since the departing session may be offline, crashed, or otherwise
  unable to signal release) — this is precisely why §III.1 concludes a
  purely client-side/UI notion of authority cannot work.

**No lease/lock/heartbeat/takeover/deterministic-identity/server-
arbiter choice is made here**, per the task's explicit instruction —
these are candidate answers to the "how," not restatements of the
"what," which is all that is asserted above.

**E. Offline Editor takeover.** Can another session safely become
Editor while the first may still have queued writes? **Only if the new
authority-check mechanism (§III.4-D) is checked at write time, not just
at authority-acquisition time** — otherwise B's takeover would succeed
at the "who is Editor" layer while A's stale writes still succeed at
the "who may write to this row" layer, because today those are the
same, single, unconditional `isOwnerOf` gate. **What protection is
required:** the write-time check named in §III.1's closing paragraph.
**Is an explicit Product Architect decision still needed?** **Yes** —
specifically, how long an Editor may be unreachable before takeover is
considered safe, and whether takeover requires an explicit action by
the new Editor or can be automatic — both genuinely open, matching
Decision 44-S-E, not narrowed by this correction (the underlying
technical necessity is unchanged from Part II §II.5's conclusion; only
the framing around it is corrected).

**F. Former Editor reconnection.** This is confirmed, per §III.1, as
one of the two central remaining Rule 8 questions (alongside 44-D). Not
resolved by anything in this correction — the correction narrows *what
kind* of problem this is (authority-staleness, not conflict-merging),
it does not solve it.

---

## III.5 — G: Conflict Handling, Correctly Scoped

**What does "conflict" mean under the single-editor model?** Per
§III.0/§III.2: **not** two valid observations disagreeing. **A stale
former Editor attempting to write is an authority-violation/stale-write
event, exactly as the task itself frames it — not a normal two-person
simultaneous-editing conflict.** This reassessment adopts that framing
explicitly, correcting Part II's more hedged treatment.

**Minimum product-level requirement:** when a stale write is detected
(once the mechanism in §III.4-D exists), the write must be **rejected,
not silently applied, and not silently discarded without any trace** —
the stale session's operator should be able to learn their attempted
edit did not take effect (matching INV-44-S06's spirit and the
refinement's own §12 candidate UI states, e.g. "EDITING AUTHORITY
LOST"). **A full collaborative conflict UI is not required** — this
reassessment finds no basis for one, since there is no second valid
observation to visually reconcile, only a rejected stale action to
surface. This directly answers, and narrows, Decision 44-S-G/44-S-C
(Part II §12/§I).

---

## III.6 — H: Initial Stock Count

Unchanged, reaffirmed a third time: remains separately governed. No
contrary decision exists anywhere in the repository. Not touched by
this correction.

---

## III.7 — Cross-Device Finalization (Decision 44-D), Correctly Reassessed

**Does the Single Active Editor model, by itself, guarantee exactly one
finalization?** **No — confirmed, explicitly, not left ambiguous.**

Walking every scenario the task lists, against the same code evidence
already gathered (Part I §H, re-confirmed, not re-derived):

- **Active Editor finalizes:** succeeds, generates a `stockCounts`
  document with an id deterministic from *that session's own*
  `submissionId`.
- **Viewer exists on another device:** no risk from the Viewer directly
  — Viewers don't finalize, by requirement.
- **Former Editor has stale local state:** if the former Editor's
  session still holds an *earlier* `submissionId` (generated back when
  it was the Editor) and attempts its own finalization — whether because
  it never learned authority moved, or because a queued offline action
  finally fires — it generates its **own**, different deterministic id.
  **Two `stockCounts` documents result.** This is the exact mechanism
  Part I §H first identified, and it is completely untouched by the
  editor/viewer distinction, because `submissionId` generation
  (`PeriodicStockCountView.tsx`'s `submissionIdRef` assignment) has no
  awareness of authority state at all — it fires whenever *that
  session's own* confirmation flow begins.
- **Offline session reconnects, finalization occurs while queued writes
  exist:** same duplicate-id risk, timing-dependent.
- **Duplicate finalization attempts, deterministic `submissionId`
  generation:** the deterministic-id mechanism only deduplicates
  *retries of the same session's own attempt* (Part I §H, "same-session
  retries are idempotent") — it was never designed to deduplicate two
  *different* sessions' independently-generated identities, and nothing
  about adopting Single Active Editor changes that design, because the
  id-generation code path is unaware the product now intends only one
  session to ever legitimately reach this code at a time.

**Stated clearly, as the task requires:** the current architecture
still allows two finalized records for one logical physical count, via
a stale former Editor's own delayed or unaware finalization attempt.
**This is UNCHANGED from Part I/Part II — not reduced, not
transformed, not resolved by the accepted model.** Decision 44-D
remains open and remains, in this reassessment's judgment, the single
highest-priority unresolved item, precisely because — unlike the
same-row conflict problem — adopting Single Active Editor does **not**
by itself narrow or simplify it at all. It is orthogonal to the editor
model in exactly the way the refinement's own §10 already predicted.

**Decision 44-D remains a separate, undecided Product Architect
decision**, not folded into 44-S-D/44-S-F — while a correctly-built
authority mechanism (§III.4) would likely also close most of this gap
as a side effect (if a stale former Editor cannot write to the draft at
all, its finalization attempt would fail earlier, at the draft-read/
tally stage, before it could ever reach the `stockCounts` write) — 
**this reassessment does not assume that side effect without the
mechanism being designed and verified to actually produce it**, and
therefore does not downgrade 44-D's status on that basis alone.

---

## III.8 — Draft Resurrection, Correctly Classified

Re-stating §III.1's finding in the task's own requested framing: **the
Single Active Editor model does not, by itself, prevent this.** The
remaining issue is correctly classified as a **stale former-editor /
authority-transition protection problem**, not generic collaborative
multi-writer conflict — exactly the distinction §III.0 establishes.
Classification: **TRANSFORMED**, not UNCHANGED and not RESOLVED — the
underlying code gap is identical to Part I/Part II, but the *kind* of
problem it now represents, and therefore the kind of fix it needs, is
narrower and different (an authority check at write time, not a
conflict-merge system).

---

## III.9 — Post-Finalization Mutation, Correctly Scoped

- **Can a former Editor recreate the periodic draft?** Yes —
  `create` on `stockCountDrafts/periodic` requires only `isOwnerOf` +
  subscription-allowed, no check for an already-finalized count for
  that date/type (Part I §M, unchanged).
- **Can a former Editor update a finalized periodic `stockCounts`
  record?** Yes — unconditional Owner update per `firestore.rules`
  L727 (unchanged).
- **Can a former Editor delete a finalized periodic `stockCounts`
  record?** Yes — same rule, `update, delete` both unconditional for
  Owner (unchanged).
- **Distinguishing legitimate correction from stale-session
  corruption:** unchanged from Part I §M — the existing Business Worth
  correction workflow is a real, intentional use of this same rule.
  **This reassessment does not redesign that workflow.** The governance
  requirement, stated precisely: whatever mechanism eventually resolves
  44-S-D/44-D should be evaluated, during design, for whether it also
  needs to gate this specific post-finalization mutation path —
  restated as a requirement to consider, not solved here, and not
  changed by this correction.

---

## III.10 — Live Viewer Behavior, Correctly Separated From Editor Conflict

- **Do the current listeners provide live data?** Yes — unchanged,
  confirmed in Part I §E and Part II §II.3: `onSnapshot` listeners on
  the draft meta doc and items subcollection are already live and
  already business-scoped.
- **Does Viewer working state update automatically?** No — the
  existing "safe interim fix" notice pattern requires a manual reload
  to adopt remote content, for *any* session, Editor or Viewer alike,
  because the mechanism predates the Editor/Viewer distinction and does
  not yet differentiate between them.
- **Can Viewer safely display changes?** Yes, trivially safer than the
  Editor case — since a Viewer never has locally-typed, unsaved input
  that a remote update could conflict with, there is no "protect
  actively-edited rows" complexity to solve for a Viewer specifically.
  This was already noted in Part II §II.3 and is reaffirmed, not
  changed, by this correction.
- **Is manual reload still required today?** Yes, unchanged.
- **Is manual reload merely a usability gap, or does it violate the
  accepted requirement?** **This is a genuine, correctly-scoped open
  question this correction surfaces explicitly, which neither Part I
  nor Part II stated plainly:** the refinement's own §7/§8 requires
  "live synchronization" and Viewers "receive authoritative updates
  live" (INV-44-S07) — a requirement that arguably means more than
  "the data reaches the client's listener live but the screen doesn't
  update without a manual reload." **This reassessment does not decide
  whether manual-reload-for-Viewers satisfies INV-44-S07 or falls short
  of it** — that is a product-level reading of "live" the Product
  Architect should confirm, not something Rule 8 should silently
  interpret either way. Recorded as a new, narrow open point (not
  elevated to a blocking decision, since Viewer-side auto-update
  carries essentially no data-integrity risk — only a usability/
  requirement-conformance question).

---

## III.11 — Multi-Tab, Correctly Scoped

- **Can two tabs both believe they are Editor?** Yes, today — trivially,
  since no authority concept exists for either tab to check against
  (unchanged from Part II §II.11).
- **Does current Firestore persistence coordination prevent this?**
  **No** — `persistentMultipleTabManager` coordinates the local
  IndexedDB cache (avoiding corruption/lock contention between tabs
  writing to the same local store); it has no application-level concept
  of "editing authority" and provides no help toward this requirement.
  This reassessment does not claim otherwise, per the task's explicit
  caution, and finds no repository evidence to the contrary.
- **Is application-level authority enforcement absent?** Yes, entirely
  — confirmed again, no new evidence needed since Part II already
  established this and nothing has changed.
- **What requirement remains?** Identical to §III.4-D: whatever
  authority mechanism is eventually designed must be enforced via a
  channel two tabs of the same browser both observe consistently (i.e.
  the shared Firestore document, not any browser-local-only signal) —
  restated here as a design constraint on the eventual mechanism, not a
  new decision.

---

## III.12 — Shared-Device / Logout Isolation (Decision 44-F), Unchanged

No new evidence gathered or needed — this question is orthogonal to the
editor/viewer conceptual correction entirely. **Reaffirmed: UNVERIFIED**,
exactly as Part I §J and Part II §II.10 left it. **No cache-clearing
strategy is recommended or selected.** The specific verification
required is unchanged from Part II §II.10: whether Firestore's client
SDK re-evaluates `firestore.rules` against the current `request.auth`
on every read served from `persistentLocalCache`.

---

## III.13 — Durability, Reaffirmed Unweakened

Confirmed, no new evidence needed: debounced autosave, interruption
flush, IndexedDB persistence, offline queue, recovery, bounded retry,
and same-session generation-token protection are all untouched by
either the refinement or this correction (Part I §Q, Part II §II.13,
reaffirmed).

**Does an authority transition introduce any new durability risk?**
One design consideration, not a currently-existing risk (since nothing
is implemented): whatever mechanism eventually enforces authority must
be designed so that a session correctly *losing* authority (e.g. an
intentional handoff, not a stale reconnect) does not itself trigger
loss of that session's own not-yet-synced local durable work — i.e.,
"you are no longer the Editor" must not be conflated with "discard your
local drafts." This is a design-time caution for whichever mechanism
44-S-D eventually selects, not a new blocker.

---

## III.14 — Corrected Before/After Matrix

| # | Previous Decision 44 finding | Status under Single Active Editor model | Why | Remaining requirement |
|---|---|---|---|---|
| 1 | Same-row concurrent editing between two simultaneously-valid writers | **RESOLVED** | The scenario is excluded by the accepted product requirement (INV-44-S01/S04) — no legitimate case of two sessions validly writing at once remains for this to apply to (§III.0) | None — no collaborative merge/reconciliation system is required |
| 2 | Silent last-write-wins overwrite | **TRANSFORMED** | No longer a risk between two *legitimate* writers (per #1); remains a risk specifically from a **stale former Editor** writing after authority moved (§III.1) | An authority/staleness check on writes (§III.4-D), mechanism not selected |
| 3 | Conflict preservation (competing valid observations must not silently disappear) | **RESOLVED**, replaced by a narrower requirement | There is no longer a second *valid* competing observation to preserve — a stale write is invalid, not a competing truth (§III.2, §III.5) | Reject-and-signal, not preserve-and-reconcile — per §III.5 |
| 4 | Cross-device finalization (Decision 44-D) | **UNCHANGED** | `submissionId` generation is entirely independent of authority state; two independently-generated ids still produce two `stockCounts` documents (§III.7) | Fully open, highest remaining priority — orthogonal to the editor model |
| 5 | Draft resurrection | **TRANSFORMED** | Same underlying code gap as Part I/II, now correctly framed as authority-transition-specific, not general multi-writer (§III.8) | Same authority/staleness check as #2 would also close this, once designed |
| 6 | Post-finalization mutation | **UNCHANGED** | Orthogonal to editor/viewer question; `firestore.rules` L727 untouched (§III.9) | Consider gating during 44-D/44-S-D design; not solved here |
| 7 | Offline reconnect (stale device silently overwrites newer state) | **TRANSFORMED** | Narrows from "any two writers reconnecting" to "the specific former-Editor-reconnects-after-losing-authority case" (§III.1) | Same authority/staleness check as #2 |
| 8 | Multi-tab (two tabs, one believing itself Editor) | **UNCHANGED** | No authority concept exists for either tab to check; `persistentMultipleTabManager` does not help (§III.11) | Same mechanism as #2/#7, must work cross-tab via the shared Firestore doc |
| 9 | Staff authorization (44-A) | **UNCHANGED** | No new evidence; still fully open, now split into 44-S-A/44-S-B (§III.3) | Product Architect decision, not narrowed by this correction |
| 10 | Live adoption (manual-reload-only) | **MATERIALLY REDUCED** in risk, **open in requirement-conformance** | Zero data-integrity risk for Viewers (they never have unsaved input to protect); but whether manual reload actually satisfies "live" (INV-44-S07) is a genuinely open reading question (§III.10) | Product Architect confirmation of what "live" means for Viewers specifically |
| 11 | Cache isolation (44-F) | **UNCHANGED** | Orthogonal to the editor/viewer correction entirely; still UNVERIFIED (§III.12) | Dedicated Firestore-SDK-behavior verification, independent of everything else here |
| 12 | Tenant isolation | **UNCHANGED (PASS)** | Never at risk from anything in Decision 44 or its refinement (§III.0–§III.13 collectively) | None |
| 13 | Durability / no-silent-loss (general) | **UNCHANGED (PASS)**, one new design caution noted | All existing mechanisms untouched; one caution about not conflating authority loss with discard-local-work during eventual mechanism design (§III.13) | Design-time caution for 44-S-D, not a blocker |

---

## III.14a — UPDATE (this session): Decisions 44-S-B and 44-S-E Resolved

**What changed, precisely, and nothing else:** the Product Architect
has since accepted [Decision 45](../specs/stock-count-data-loss-resilience-decision-45-amendment.md)
(SABUSHIMIKE MASCENI, 2026-09-03), formally resolving two of the six
items §III.15 originally listed as blocking:

- **44-S-B (Editor Authorization) — now RESOLVED.** Governance
  decision: the Owner/Admin has exclusive authority to explicitly
  assign the Active Editor; no user becomes Editor merely by opening
  the Contagem or from a second session. **The technical enforcement
  mechanism is explicitly NOT resolved by this decision** — Decision 45
  §2 requirement 7 states this outright, and this update does not
  overclaim otherwise.
- **44-S-E (Offline Active Editor) — now RESOLVED.** Governance
  decision: no automatic takeover of any kind (timeout/presence/other)
  when the Active Editor goes offline; every reassignment requires an
  explicit Owner/Admin decision; a reconnecting former Editor must
  never silently regain authority. **The technical mechanism for
  detecting offline state and enforcing reassignment is explicitly NOT
  resolved by this decision** — Decision 45 §3 requirement 7 states
  this outright.

**What did NOT change:** the corrected conclusion that general
multi-writer conflict resolution is RESOLVED/TRANSFORMED by the Single
Active Editor model (§III.0, §III.14) is untouched by Decision 45 —
that conclusion was already independent of who specifically may become
Editor. **44-S-D and 44-S-F are not marked resolved** — both are
narrowed in governance shape by Decision 45 (acquisition/reassignment
must always be explicit; reconnect must never silently restore
authority) but each still requires its own technical design decision
before it can be closed, exactly as Decision 45 §4 itself states. **44-D
and 44-F are entirely untouched** — both remain fully open, exactly as
before, since neither is about who may edit or how offline is handled;
they are about finalization-identity uniqueness and cache/auth
behavior, respectively.

§III.15's table and §III.16's verdict, below, are updated accordingly
— the surrounding analysis in §III.0–§III.13 is otherwise unchanged
from the original Part III text.

---

## III.15 — Product Architect Decision List — Minimum Set (updated this session)

| Decision ID | Exact question | Status | Why | Rule 8 blocker? | Implementation requirement depending on it |
|---|---|---|---|---|---|
| 44-S-B | Who may acquire editing authority? | **✅ RESOLVED — Decision 45, 2026-09-03.** Owner/Admin exclusively, by explicit assignment. | Formal Product Architect decision now on file (§III.14a) | **No longer a blocker** — governance question closed; technical mechanism folded into 44-S-D | The authority-check mechanism (44-S-D) can now be scoped against a known population (Owner/Admin-assigned) |
| 44-S-D | What governance-level behavior must acquisition/release/takeover satisfy, and what technical mechanism enforces it? | **Open — narrowed, not resolved.** Decision 45 establishes acquisition/reassignment are always explicit Owner/Admin actions, never automatic; the enforcement mechanism remains undecided. | Technical design brief still pending (§III.4-D, Decision 45 §2 req. 7) | **Yes** | Directly determines the design brief for the write-time authority check that resolves findings #2/#5/#7/#8 in §III.14 |
| 44-S-E | How long may an Editor be unreachable before takeover is considered safe, and is takeover automatic or explicit? | **✅ RESOLVED — Decision 45, 2026-09-03.** Never automatic; always an explicit Owner/Admin decision; offline Owner/Admin Editor simply stops the count rather than transferring. | Formal Product Architect decision now on file (§III.14a) | **No longer a blocker** — governance question closed; technical mechanism folded into 44-S-D/44-S-F | Removes "when is takeover safe" as an open design question — replaced by "how is an explicit Owner/Admin reassignment technically carried out," which 44-S-D/44-S-F must still answer |
| 44-S-F | What should happen when a former Editor reconnects after authority has moved? | **Open — narrowed, not resolved.** Decision 45 §3 requirement 6 establishes the required outcome (must never silently regain authority); the enforcement mechanism remains undecided. | Technical design brief still pending (§III.1, §III.4-F, Decision 45 §3 req. 7) | **Yes** | Determines the exact user-facing/technical response to a detected stale write |
| 44-D | What guarantees exactly one finalization across independent sessions? | **Open, untouched by Decision 45.** | Confirmed orthogonal to Editor authorization/offline policy, not narrowed by either (§III.7) | **Yes — highest priority, unreduced** | A finalization-identity/guard mechanism, independent of whatever 44-S-D produces |
| 44-F | Can persistent local cache expose one user's data to a different subsequently-authenticated user? | **Open, untouched by Decision 45.** | Orthogonal question, requires SDK-behavior verification, not a design decision (§III.12) | **Yes — HIGH, unreduced** | Precedes, not follows, any cache-related design choice |

**44-S-A (Viewer authorization) and 44-S-C (Finalizer authorization)**
remain open but are **not** classified as blockers to *beginning*
design work on the four remaining blocking items above — 44-S-C in
particular is likely already substantially answered by existing
Owner-only finalization governance (§III.3-C), pending explicit
confirmation rather than fresh deliberation. **44-S-G (conflict
handling)** is, per §III.5, now answered in substance by this
reassessment (reject-and-signal, not preserve-and-reconcile) and does
not need a separate open decision beyond confirming that framing.

**Decision 44-B is explicitly not carried forward as an independent
decision in this list.** Per §III.2, it is resolved in its original
form and absorbed into the 44-S-D/44-S-F cluster in its narrower form.

---

## III.16 — Final Rule 8 Verdict (Part III, updated this session)

# READY AFTER DECISIONS

**Verdict unchanged in tier, updated in scope.** Two of the original
six blocking decisions (44-S-B, 44-S-E) are now resolved by Decision
45, but the remaining four — **44-S-D, 44-S-F, 44-D, 44-F** — are
untouched or only narrowed, not closed, and at least two of them (44-D,
44-F) are entirely unaffected by anything decided so far. The verdict
therefore remains **READY AFTER DECISIONS**, not **READY** — resolving
two of six blockers is real, meaningful progress, not completion.

**After Decision 45, the exact Product Architect/design decisions
remaining necessary before Implementation Planning can begin are:**
**44-S-D** (the technical design brief for enforcing explicit-only
Editor assignment and reassignment) and **44-S-F** (the technical
mechanism preventing a reconnecting former Editor from silently
regaining authority) — both now considerably narrower in governance
scope than before Decision 45, per §III.14a — plus the two entirely
unaffected, editor-model-independent items **44-D (finalization
guard)** and **44-F (cache isolation)**.

---

## III.17 — Reporting Summary (Part III, updated this session)

1. **File(s) changed:** exactly one —
   `docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`
   (this file), updated in place at §III.14a/§III.15/§III.16/§III.17
   to record Decision 45's resolution of 44-S-B and 44-S-E. §III.0–§III.13
   are unchanged from the original Part III text. Also:
   `docs/specs/stock-count-data-loss-resilience-decision-45-amendment.md`
   (new — the formal decision record) and
   `docs/specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`
   (§19 updated to mark 44-S-B/44-S-E resolved).
2. **Final Rule 8 verdict:** **READY AFTER DECISIONS** (unchanged tier;
   scope reduced from six to four blocking decisions).
3. **Previous findings, corrected classification:** unchanged from the
   original Part III (§III.14) — general multi-writer conflict and
   conflict preservation remain **RESOLVED**; silent last-write-wins,
   draft resurrection, offline reconnect, multi-tab remain
   **TRANSFORMED**; cross-device finalization, post-finalization
   mutation, cache isolation, Staff authorization remain **UNCHANGED**;
   tenant isolation and durability remain **UNCHANGED (PASS)**; live
   adoption remains **MATERIALLY REDUCED**. Decision 45 does not alter
   any of these classifications — it resolves two Product Architect
   decisions, not a Rule 8 risk-classification finding.
4. **Minimum remaining Product Architect/design decisions:** 44-S-D,
   44-S-F, 44-D, 44-F — four, down from six. 44-S-B and 44-S-E resolved.
   44-S-A/44-S-C remain open but non-blocking; 44-S-G substantially
   pre-answered.
5. **New risks:** none newly discovered by this update.
6. **`git diff --stat` / `git status --short`:** reported in the
   top-level turn accompanying this artifact.
7. **Confirmation:** no application code, `firestore.rules`, schema, or
   test file was changed — only governance markdown files, and the
   original Part III analysis (§III.0–§III.13) was not deleted or
   rewritten, only its decision table/verdict/summary updated to
   reflect Decision 45.
8. **Stopping after Rule 8, per instruction.**

---

# PART II — Rule 8 Reassessment — Decision 44 Refinement: Single Active Editor + Live Read-Only Viewers

## ⚠️ SUPERSEDED — see Part III above

*(This Part II reassessment is preserved exactly as originally written,
for audit-history purposes, per this repository's governance
discipline of not silently erasing prior conclusions. **Its
classification of the same-row concurrent-editing findings has been
corrected in Part III, §III.0 and §III.14** — Part II treated the
now-eliminated "general multi-writer conflict" scenario and the
still-open "stale former-editor" scenario as one combined,
still-largely-CRITICAL item; Part III separates them and finds the
former RESOLVED. Where Part II and Part III disagree, Part III
governs. Nothing below this notice was edited.)*

**Governing chain:** `stock-count-data-loss-resilience-specification.md`
(Frozen, Decision 38) → Decisions 39–42 (implemented) →
[Decision 44 amendment](../specs/stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, requirements only, 3 Sept 2026) → Part I of this document
(🟡 original Rule 8 assessment, verdict READY AFTER DECISIONS) →
[Decision 44 Refinement — Single Active Editor + Live Read-Only Viewers](../specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md)
→ [Product Architect Acceptance of the Refinement](./periodic-contagem-decision-44-refinement-single-editor-viewers-product-architect-acceptance.md)
(✅ Accepted, requirements only, SABUSHIMIKE MASCENI, 3 Sept 2026) →
**this reassessment (Part II)**.

**Repository baseline:** `main = origin/main`, unchanged since Part I —
**no application code, `firestore.rules`, schema, or test has changed
between Part I and this reassessment.** This is the load-bearing fact
for how every classification below is derived: nothing in the running
system is different today than it was when Part I was written. What
changed is the *governing requirement* the code must eventually satisfy
— this reassessment evaluates how that requirement change reshapes the
risk picture, not a claim that any risk has been newly closed in
production.

**Scope:** Decisions 44-S-A through 44-S-H, as left open by the accepted
refinement. Does not reopen Decisions 38–43 or the refinement's own
explicit preservation of Decision 44 §4, §8, §9, §15, §17, §20 (all
restated unchanged in the refinement's own §1).

---

## II.0 — Method and a Necessary Caveat

Two distinct axes must not be conflated, and the task's own five-way
classification (RESOLVED / MATERIALLY REDUCED / UNCHANGED / TRANSFORMED
/ NEW RISK) is applied strictly to **axis 2**:

- **Axis 1 — current code state:** identical to Part I. Every gap Part
  I found by reading the repository is still physically present in the
  repository, because nothing has been implemented. No classification
  below should be read as "this is now fixed in production."
- **Axis 2 — target-model risk shape:** how the *accepted requirement*
  changes what a future, correctly-built implementation would need to
  solve, and how much smaller/different that problem is than the one
  Part I described. **This is what is classified below.**

A finding classified RESOLVED or MATERIALLY REDUCED under axis 2 is
still, today, exactly as exploitable in the running app as it was in
Part I — no code changed. The classification only means: once the
refined model is correctly implemented, that finding's underlying
exposure would be smaller/gone. This distinction is restated at the top
of the before/after matrix (§II.16) as well, so it cannot be missed by
reading the matrix in isolation.

---

## II.1 — Single Active Editing Authority

- **Can exactly one session hold editing authority?** Not today — no
  mechanism exists anywhere in the repository (schema, rules, or
  application code) that models "editing authority" as a concept at
  all. `PeriodicStockDraft`/`PeriodicStockDraftItem` (per fresh
  re-check of `apps/tenant/src/types.ts`) have no authority/lease/claim
  field. This is expected — the refinement is a requirement, not yet an
  implementation — but it must be stated plainly: **the single-editor
  invariant (INV-44-S01) is currently unenforced, in any form.**
- **Can two sessions/devices simultaneously modify Periodic Contagem
  today?** **Yes**, exactly as in Part I — any two `isOwnerOf` sessions
  can both call the same per-row write functions
  (`savePeriodicStockDraftItem`/`flushPeriodicStockDraftRows`)
  concurrently; nothing rejects the second writer.
- **Is editing authority actually enforceable, or merely a UI
  convention, once built?** This is the central open technical question
  the refinement itself defers (refinement §6, §18) — and this
  reassessment confirms it is **not a question this repository's
  existing patterns answer for free.** Genuine enforcement requires
  either (a) a `firestore.rules` precondition that checks a
  server-readable authority-claim field before allowing a write — a
  rules change, not authorized here — or (b) a server-side gate
  (callable function) — a new architectural element not present
  anywhere else in this codebase's Contagem write paths, which are
  uniformly direct client → Firestore writes gated by `isOwnerOf`. A
  UI-only convention (hiding the input fields for Viewer-mode sessions)
  would **not** be genuine enforcement — a modified/stale client, or
  simply the existing write functions called directly, would bypass it
  entirely, since the rules layer would still permit the write.
- **Same user, multiple devices:** the refinement's §4 requirement
  (second device defaults to Viewer) has the same enforcement gap — 
  nothing today distinguishes "this session" from "another session of
  the same authorized user" at the rules layer; `isOwnerOf` resolves to
  the same true/false answer for every session of the same account.

---

## II.2 — Read-Only Viewer Safety

- **Can Viewers truly observe live state without writing?** The
  observation half is already well-supported — the existing
  `onSnapshot` listeners (confirmed present in Part I §E, unchanged)
  deliver live read access to any `isOwnerOf` session regardless of
  Editor/Viewer status, since the rules layer does not yet distinguish
  the two.
- **Is the Viewer/Editor distinction enforceable at the
  authorization/data layer today?** **No.** `firestore.rules`'
  `stockCountDrafts` block grants read **and** write identically to
  every `isOwnerOf(businessId)` caller — there is no rules-level concept
  of "this specific session is currently the Editor." Confirmed by
  fresh re-read of the same rule block reviewed in Part I §O — nothing
  about it has changed.
- **Existing write paths that would bypass the intended model:**
  every existing per-row/meta draft-write function
  (`savePeriodicStockDraftItem`, `savePeriodicStockDraftMeta`,
  `flushPeriodicStockDraftRows`) is a direct, unconditional write once
  `isOwnerOf` passes — **all of them would bypass a UI-only Viewer
  restriction**, because none of them check anything resembling
  authority. This is the concrete answer to the task's explicit
  question: the bypass path is *every current write call site*, not a
  hypothetical edge case.

---

## II.3 — Live Synchronization

- The existing listener architecture (Part I §E, unchanged) already
  provides the live shared-state delivery the refined model needs for
  Viewers — this part of Decision 44's infrastructure requirement was
  already satisfied before the refinement and remains satisfied.
- **What currently happens when remote data changes while an Editor is
  actively editing?** Unchanged from Part I: the passive, whole-draft
  "safe interim fix" notice (`remoteDraftUpdateNotice`) fires; local
  working state is never auto-patched. Under the refined model this
  behavior is actually a **better fit** than it was under open
  multi-editor sharing — since Viewers are not supposed to be editing
  at all, a Viewer session receiving a live update and simply seeing it
  reflected (rather than needing careful "protect actively-edited rows"
  logic) becomes a substantially simpler design target. This is a
  genuine, if still unimplemented, simplification.
- **Does the single-editor model eliminate the previous same-row
  concurrent-writer problem, or merely change its form?** **Change its
  form — confirmed, not eliminated.** Under *intended, correctly-
  enforced* operation, only one session ever writes, so the "two
  simultaneous legitimate writers" case genuinely stops applying. But
  the underlying technical problem — a write arriving from a session
  that should not currently be authoritative — persists in a narrower
  form: a stale former Editor, or (per the new risk in §II.17) a race
  during authority acquisition. The problem is **TRANSFORMED**, not
  removed.

---

## II.4 — Stale Former Editor

Tracing Editor A losing authority to Editor B, using the exact
mechanisms confirmed present in the repository (Part I §L, re-confirmed
unchanged this session):

- **What happens when A reconnects or has pending local autosaves?**
  Identical to Part I's finding: A's own generation-token/cancellation
  logic is scoped to cancel a write against **A's own** subsequent
  local action (e.g. A's own finalization, A's own newer edit) — it has
  no awareness of an externally-established "B is now the Editor"
  state, because no such state exists in the schema. A's pending write,
  once it fires, is indistinguishable at the Firestore layer from any
  other legitimate write.
- **Can A overwrite B's newer state?** **Yes, unchanged from Part I** —
  same last-physical-arrival-wins semantics, same absence of any
  version/precondition check on the per-row write path.
- **Can A recreate a deleted/finalized draft?** **Yes, unchanged** —
  same resurrection risk as Part I §L; the refined model does not add
  any new protection here because none of A's generation tokens are
  aware that authority itself moved, only that *A's own* finalization
  might have happened.
- **Is the current generation-token protection sufficient across
  authority transitions?** **No, confirmed insufficient.** It was
  designed and tested (Decision 38/41C) for a single session's own
  internal race, not for a cross-session authority handoff. This is the
  precise, evidence-based answer to the refinement's own §9
  (INV-44-S06) requirement — it names a real, currently-unmet
  protection gap, not a hypothetical one.

---

## II.5 — Offline Editor

- **What happens if the sole Editor goes offline?** Today: nothing
  special — the existing offline-queue/local-cache durability (Part I
  §B row 5/6, unaffected by the refinement) continues to protect the
  Editor's own local work exactly as it does for any session. Nothing
  in the current architecture has any concept of "this is *the*
  Editor," so there is no existing behavior to lose here — the gap is
  purely that a *second, authorized* session has no way to determine
  "the Editor appears to be offline, may I take over?" because no
  authority state is tracked anywhere for it to observe.
- **Can the accepted requirements currently be satisfied without a
  technical authority mechanism?** **No.** This reassessment finds, as
  a direct technical conclusion (not a mechanism choice): **some
  durable, queryable representation of "who currently holds editing
  authority, and since when" is unavoidable** for Scenario D/F of the
  refinement (§6) to be resolvable at all — a purely client-side/UI
  notion of authority cannot be reconciled with an offline Editor,
  because a UI-only signal disappears exactly when it's needed (the
  Editor's own client is unreachable). This is stated as a
  **governance/technical blocker requiring Product Architect
  resolution** — specifically, Decision 44-S-D and 44-S-E — **without**
  selecting lease/lock/heartbeat/timeout as the mechanism, per the
  task's explicit instruction.

---

## II.6 — Cross-Device Finalization

- **Does restricting editing authority actually prevent duplicate
  finalization?** **No — confirmed, not merely suspected.** Fresh
  re-check of `AppContext.tsx`'s periodic finalization branch: the
  deterministic `stockCounts` document id is still derived from
  `submissionId`, and `submissionId` generation
  (`PeriodicStockCountView.tsx`'s `submissionIdRef` assignment) is
  **entirely independent of any editor/viewer/authority concept** — it
  fires whenever *that session's own* confirmation flow begins,
  regardless of whether that session is supposed to be the sole Editor.
  **Nothing about the refined model touches this code path or this
  risk.** This directly confirms the refinement's own §10 statement
  ("one Editor does NOT automatically solve finalization races") with
  actual code evidence, not just the refinement's own prose reasoning.
- **Stale/finalizing former Editor vs. current Editor:** if A (former
  Editor, now stale) still holds a `submissionId` from before authority
  moved to B, and A's client attempts to finalize (e.g. a queued
  offline action, or A simply never learned authority moved), A's
  finalize would generate its own deterministic id under its own
  `submissionId` — a second `stockCounts` document, exactly as in Part
  I's CRITICAL-2 finding. **Unaffected by the refinement.**
- **Finalization while another device is Viewer:** no risk from the
  Viewer itself (Viewers, by requirement, don't write or finalize) —
  but this does not close the A/B former-Editor race above, which
  involves two sessions that were *both*, at some point, legitimately
  the Editor, not a Viewer overstepping its role.
- **Is a unique business/date/count identity or another authoritative
  guard still required?** **Yes, unambiguously required, mechanism not
  selected here** — this reassessment reaffirms Decision 44-D exactly
  as Part I left it: **CRITICAL, open, unreduced by the refinement.**

---

## II.7 — Draft Resurrection

Re-tracing the exact race from Part I §L under the refined model's own
terms (former Editor A, current Editor B):

- A's pending debounced write, offline-queued write, or
  unmount/pagehide flush — all three, individually re-checked this
  session against the same code paths as Part I — fire based on A's
  local timers/state, with **no check against any authority signal**,
  because none exists.
- If B finalizes (deleting the shared draft) while A's write is still
  pending in any of those three forms, A's write recreates the deleted
  draft path exactly as in Part I. **Unchanged, confirmed again this
  session with the refined model's own vocabulary applied** — this is
  precisely INV-44-S09 ("No Draft Resurrection") from the refinement,
  and it is not yet satisfied.

---

## II.8 — Post-Finalization Mutation

- Fresh re-check of `firestore.rules` L727 (`allow update, delete: if
  isOwnerOf(businessId) && resource.data.get('type', null) !=
  'initial';`) — **unchanged from Part I.** Periodic-type `stockCounts`
  documents remain unconditionally Owner-mutable/deletable after
  finalization, with no submission-identity check, no immutability
  window, and — now newly relevant — **no authority check either**: a
  stale former-Editor session, still `isOwnerOf`, could mutate a
  finalized count exactly as freely as the current Editor could.
- **Distinguishing legitimate correction from unsafe stale-session
  mutation:** the existing Business Worth correction workflow (Part I
  §M) is a real, intentional use of this same unconditional-update
  rule. This reassessment does **not** propose redesigning that
  workflow. The governance requirement this surfaces is narrow and
  precise: **whatever mechanism eventually enforces editing authority
  (44-S-D) and finalization uniqueness (44-D) should be evaluated,
  during design, for whether it also needs to gate this specific
  post-finalization mutation surface** — stated here as a requirement
  to consider, not a design decision.

---

## II.9 — Conflict Handling

- **Which previous row-level conflict requirements are now
  eliminated?** Under *correctly-enforced* single-editor operation: the
  general "two simultaneously-active, both-legitimately-writing
  sessions on the same row" case (Part I's CRITICAL-1 core scenario)
  stops applying, because only one session is ever supposed to hold
  write access. This is a genuine simplification of the **target**
  design space (axis 2, §II.0) — the original six-way mechanism
  comparison in Part I §F (optimistic version check vs. transaction vs.
  history vs. append-only, etc.) can now be evaluated against a smaller
  problem: staleness detection for a *single* prior writer, not
  reconciliation between *multiple concurrent* writers.
- **Conflicts that still exist:** exactly the four named in the
  refinement §11/§18 and reconfirmed here with code evidence —
  authority-transition timing (§II.5/§II.6), stale reconnect (§II.4),
  offline recovery interacting with a moved authority (§II.5), and
  finalization (§II.6). None of these are eliminated; all four still
  need **some** staleness/version-detection mechanism — the same class
  of technical primitive Part I §F already catalogued, just applied to
  a narrower trigger condition.
- **This reassessment does not invent a collaborative merge system** —
  none is required under the accepted model, consistent with the
  refinement's own §25/§11 framing, and consistent with BDR-0009's
  physical-observation semantics (a stale write should be *rejected or
  flagged*, not merged).

---

## II.10 — Shared-Device / Logout Isolation

- **Reassessed, not newly resolved.** Fresh review this session found
  no cache-clear-on-auth-transition code and no explicit
  rules-re-evaluation-on-cached-read behavior confirmation beyond what
  Part I §J already stated — this remains **exactly as unverified as
  Part I left it.**
- The refinement's own §14 explicitly states the Editor/Viewer split
  does not address this, and this reassessment finds no basis to
  disagree or to claim any narrowing.
- **Marked, per the task's own instruction: UNVERIFIED.** The exact
  verification required, restated precisely: whether Firestore's
  client SDK re-evaluates `firestore.rules` against the *current*
  `request.auth` on every read served from `persistentLocalCache` — 
  which would make a second, differently-authenticated user's read of
  a previously-cached document either (a) safe by construction, because
  the rules re-check fails for the new user's own auth context even
  though bytes may transiently exist in IndexedDB, or (b) unsafe, if
  any code path serves cached data before/without a fresh rules
  evaluation. This is a specific, answerable question about Firestore
  SDK behavior — not a design decision — and it precedes, not follows,
  any sound Decision 44-F choice, exactly as Part I already concluded.

---

## II.11 — Multi-Tab

- **Can two tabs both believe they are the Editor?** **Yes, today —
  trivially, since neither tab has any way to know about the other at
  all** (Part I §I, unchanged: `persistentMultipleTabManager`
  coordinates the local IndexedDB cache only; each tab is an
  independent component instance with its own `submissionIdRef` and,
  once built, would have its own independent belief about authority
  unless the authority mechanism itself is built to be cross-tab-aware
  via the shared Firestore document, not local component state).
- **This is not equated with IndexedDB multi-tab cache coordination**
  — that mechanism solves a different problem (avoiding local cache
  corruption/lock contention between tabs) and provides no help
  whatsoever for the application-level "which tab is the Editor"
  question, which must be answered via the same durable,
  Firestore-visible authority state named in §II.5, not via
  browser-local tab coordination.
- Two tabs of the same account are, for every purpose in this
  reassessment, identical to "two devices" — no separate risk class.

---

## II.12 — Tenant Isolation

Re-verified this session, no change found: `businessId` scoping via
Firestore path structure, `isOwnerOf`/`isMemberOf` resolving against
`request.auth`-derived profile lookups, never a client-supplied field.
**Nothing about the refined model — Editor/Viewer distinction,
authority claims, or any candidate mechanism discussed above —
plausibly touches this boundary.** No weakening found or anticipated.

---

## II.13 — Durability / No Silent Loss

- Every durability mechanism named in Decision 44 §8 and re-confirmed
  in Part I §Q remains present and untouched: debounced autosave,
  interruption flush, offline persistence, draft recovery, classified
  retry, same-session finalization idempotency.
- **Does the single-editor model materially improve the no-silent-loss
  guarantee?** **Not by itself, today** — since nothing is implemented.
  **At the target-model level:** it improves the guarantee's
  *achievability*, because the hardest sub-problem (simultaneous
  legitimate multi-writer conflict) is designed away, leaving a smaller
  set of remaining risks (§II.4, §II.6, §II.7) that all reduce to one
  well-understood technical primitive — staleness/version detection —
  rather than requiring both that primitive *and* a genuine
  multi-writer merge/preservation strategy. This is a real, if
  unimplemented, improvement in tractability, distinct from an
  improvement in the current running system.
- **Remaining paths where durable data can be silently lost, unchanged
  from Part I:** same-row overwrite by a stale former Editor (§II.4);
  a rejected/superseded finalization racing a legitimate one (§II.6);
  draft resurrection (§II.7).

---

## II.14 — Scale

No new scale concern introduced by the refined model. An
authority-state field (whatever form it eventually takes) would be, at
most, one additional small field on the existing meta document
(`stockCountDrafts/periodic`), not a new per-row cost — consistent with
Part I §P's conclusion that the existing per-row write/read cost
profile already scales to 300–500+ products, and nothing evaluated in
this reassessment changes that document's shape materially. This
remains assessment only, per the task's instruction not to redesign for
scale here.

---

## II.15 — Initial Stock Count

Unchanged. Confirmed again this session: `InitialStockCountView.tsx`
was not touched by, and is not implicated by, anything in the
refinement or this reassessment. Decision 44-S-H is reaffirmed exactly
as the refinement itself already stated it — Initial Stock Count
remains separately governed. No contrary decision exists anywhere in
the repository's governance trail.

---

## II.16 — Before/After Matrix

*(Reminder, restated from §II.0: "Refined-model status" describes the
target-requirement risk shape, not a claim that the current running
code has changed. No code changed between Part I and this
reassessment.)*

| Previous Decision 44 finding (Part I) | Refined-model status | Evidence | Remaining implication |
|---|---|---|---|
| CRITICAL-1 — Same-row concurrent-write silent overwrite, no stale-write protection | **TRANSFORMED** | §II.1, §II.3, §II.9 — problem narrows from "any two legitimate writers" to "current Editor vs. stale former Editor"; same technical primitive (staleness detection) still required | A version/precondition mechanism is still required; scope is smaller, not solved |
| CRITICAL-2 — Cross-device duplicate finalization (`submissionId` per-session) | **UNCHANGED** | §II.6 — `submissionId` generation logic is entirely independent of authority; refined model's own §10 explicitly disclaims solving this | Decision 44-D remains fully open, still CRITICAL |
| CRITICAL-3 — Cross-device draft resurrection | **TRANSFORMED** | §II.4, §II.7 — same generation-token gap, now specifically framed as former-Editor-vs-current-Editor rather than general multi-device race | Same technical gap, narrower named trigger (INV-44-S09) |
| CRITICAL-4 — Unconditional post-finalization mutability of periodic `stockCounts` | **UNCHANGED** | §II.8 — `firestore.rules` L727 untouched; orthogonal to editor/viewer question | Requirement to consider during future design of 44-D's mechanism, not solved by the refinement |
| HIGH-5 — Shared-device/logout cache isolation | **UNCHANGED** | §II.10 — refinement §14 explicitly disclaims solving this; still UNVERIFIED | Needs its own dedicated SDK-behavior verification, independent of everything else in this reassessment |
| HIGH-6 — Offline-reconnect ordering exploitable today, same-Owner-multi-device | **TRANSFORMED** | §II.1, §II.5 — this specific scenario (same Owner, second device) is exactly what INV-44-S01/S04 target; once correctly enforced, the second device would default to Viewer and this instance of the risk would close | Currently still exploitable (nothing implemented); would be materially reduced once the authority mechanism (44-S-D) exists |
| MEDIUM-7 — Manual-reload-only live adoption | **MATERIALLY REDUCED** (target-model) | §II.3 — Viewer-only sessions no longer need "protect actively-edited rows" logic, a real simplification of what live adoption needs to handle | Still unimplemented; design complexity for Viewers specifically is now lower |
| MEDIUM-8 — No row-level conflict UI | **MATERIALLY REDUCED** (target-model) | §II.9, refinement §12 — conflict UI narrows toward an authority-status indicator; the residual stale-former-editor case still needs some signal | Full row-level collaborative UI less clearly necessary; not yet built |
| LOW-9 — Stale device could recreate a fresh draft post-finalization | **UNCHANGED** | §II.8 — orthogonal to editor/viewer split | Still a hygiene concern, not elevated or reduced |
| *(new, this reassessment)* — Authority-acquisition race when no Editor currently exists | **NEW RISK** | §II.1, §II.17 — requiring exclusive acquisition introduces a new race (two sessions both attempting to become Editor simultaneously) that the open multi-editor model never needed to solve, since it didn't care who initiated | Must be addressed by whatever mechanism resolves 44-S-D; not present in Part I because the problem it belongs to didn't exist before the refinement |

---

## II.17 — New Risks Discovered By This Reassessment

Beyond the "authority-acquisition race" entry in the matrix above:

- **Silent-Viewer-writes-anyway risk:** because no rules-layer
  distinction between Editor and Viewer exists yet, any implementation
  that enforces Viewer-read-only *only* in the UI (rather than at
  `firestore.rules`) would create a **false sense of safety** — the
  refinement's own model would appear satisfied in normal use while
  remaining exactly as writable by any `isOwnerOf` session as before.
  This is a design-discipline risk worth naming explicitly for the next
  design phase, not a currently-exploited defect.
- **Authority-state itself becoming a new stale-cache-exposure
  surface:** if editing-authority is eventually represented as a
  Firestore field (the most likely shape, per §II.5's own reasoning),
  that field inherits the same shared-device/cache-isolation question
  as the draft content itself (§II.10) — a second point of exposure to
  verify, not just the quantity data.

---

## II.18 — Product Architect Decisions Reassessed

### 44-S-A — Viewer Authorization
**Remains required.** Not narrowed by this reassessment — no existing
governance answers it (§II.2 confirms `stockCountDrafts` today is
Owner-only for everyone, so there is no existing "who else may view"
answer to inherit). Exact decision needed: which tier(s) may open the
shared Contagem in Viewer mode.

### 44-S-B — Editor Authorization
**Remains required, and is now the most load-bearing of the eight** —
§II.1 and §II.5 both depend on knowing who is even eligible to acquire
authority before any enforcement mechanism can be meaningfully
designed. Not narrowed; if anything, sharpened in priority by this
reassessment.

### 44-S-C — Finalizer Authorization
**Likely already substantially answered by existing governance, not by
this refinement.** Finalization has been Owner-only at the rules layer
since before Decision 44 (Part I §B row "finalization," unchanged, and
the original specification §5's own note that "periodic `stockCounts`
creation is already Owner-only at the rules layer today"). This
reassessment recommends confirming this explicitly as the answer to
44-S-C during the Product Architect's decision pass, rather than
treating it as fully open — but does not decide it here, since the
Product Architect could still choose to broaden it.

### 44-S-D — Editing Authority Model
**Remains required, and confirmed as a genuine technical necessity, not
merely a nice-to-have** — §II.5 concludes some durable, cross-session-
visible authority representation is unavoidable for the offline-Editor
case to be resolvable at all. Not narrowed in scope by this
reassessment; if anything, its necessity is more firmly established.

### 44-S-E — Offline Editor Takeover
**Remains required.** §II.5 explicitly declines to select a mechanism
and instead confirms this is a genuine open governance/design question,
not a solved one.

### 44-S-F — Former Editor Reconnection
**Remains required.** §II.4/§II.6/§II.7 all converge on the same
unresolved need: some way to reject or flag a write from a session that
has lost authority. Not narrowed to a smaller question by this
reassessment — if anything, shown to be the common root cause behind
three of the four CRITICAL/TRANSFORMED matrix entries.

### 44-S-G — Conflict Handling
**Narrowed, per §II.9** — from "general multi-writer conflict
resolution" to "stale-former-editor / authority-transition detection,"
consistent with the refinement's own §11 framing. Still requires a
decision (which technical primitive, from the same candidate family
Part I §F already catalogued, applied to the narrower trigger).

### 44-S-H — Initial Stock Count
**Unchanged, reaffirmed.** Remains separately governed. No contrary
decision found anywhere in the repository.

---

## II.19 — Final Rule 8 Verdict (Part II)

# READY AFTER DECISIONS

Using this repository's own established verdict vocabulary
(`READY` / `READY AFTER DECISIONS` / `NOT READY`, per Part I §Verdict
and the Decision 41/42 Rule 8 precedent's own terminology) — **not** a
new status, and **not** the more severe "NOT READY"/blocked category,
because nothing found in this reassessment is a fundamental
architectural or security impossibility. The refined model is
technically buildable on top of the existing architecture; what remains
is Product Architect decision-making, not a redesign.

**Can SABUSH BPT proceed to Implementation Planning?** **Not yet.** The
minimum exact decisions required before an Implementation Plan can be
soundly drafted, per §II.18 above, ordered by dependency:

1. **44-S-B (Editor Authorization)** — must be answered first; every
   enforcement design question depends on knowing who may hold
   authority.
2. **44-S-D (Editing Authority Model)** — the governance-level shape of
   acquisition/release/takeover (not the technical mechanism) must be
   settled before Rule 8 can meaningfully re-evaluate a specific
   candidate mechanism in a later pass.
3. **44-S-E (Offline Editor Takeover)** and **44-S-F (Former Editor
   Reconnection)** — both follow directly from 44-S-D and are, in
   effect, its two hardest edge cases; likely decided together with it.
4. **Decision 44-D (Finalization Guard)** and **Decision 44-F (Cache
   Isolation)**, carried over unresolved from the original Decision 44
   Rule 8 Assessment (Part I) — **explicitly reaffirmed here as still
   CRITICAL/HIGH and untouched by the refinement.** These are not new
   decisions created by this reassessment; they are pre-existing
   blockers this reassessment confirms remain exactly as open as Part I
   left them.

**Decisions not required to unblock Implementation Planning, though
still open and worth resolving:** 44-S-A (Viewer Authorization) and
44-S-G (Conflict Handling, narrowed) can plausibly be decided in
parallel with, or shortly after, the four above without blocking the
start of design work on the authority mechanism itself. 44-S-C
(Finalizer Authorization) is likely already answered by existing
governance (§II.18) and mainly needs explicit confirmation, not fresh
deliberation.

**This document does not expand scope beyond what the task requested.**
No mechanism was chosen for authority, conflict resolution, or cache
isolation. No code, `firestore.rules`, schema, or test was modified.

---

## II.20 — Reporting Summary (Part II)

1. **File(s) changed:** exactly one —
   `docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`
   (this file), restructured to add Part II above the preserved,
   unmodified Part I.
2. **Final Rule 8 verdict:** **READY AFTER DECISIONS.**
3. **Previous blockers, reclassified:** two **UNCHANGED** (cross-device
   duplicate finalization — Decision 44-D; unconditional post-
   finalization mutability), two **TRANSFORMED** (same-row overwrite;
   draft resurrection — both narrowed to a former-Editor-specific
   trigger, neither solved), one **UNCHANGED** (shared-device cache
   isolation — Decision 44-F), one **TRANSFORMED** (offline-reconnect
   ordering — now squarely addressed by INV-44-S01/S04 once
   implemented), two **MATERIALLY REDUCED** at the target-model level
   (manual-reload-only adoption; lack of row-level conflict UI), one
   **UNCHANGED** (stale draft recreation after finalization). Full
   detail and evidence in §II.16.
4. **Remaining Product Architect decisions:** 44-S-A through 44-S-H, all
   reassessed individually in §II.18; none decided by this document.
5. **New risks discovered:** the authority-acquisition race (no prior
   analog under open multi-editor sharing), and the "Viewer restriction
   enforced only in the UI, not at the rules layer" false-safety risk —
   both detailed in §II.17.
6. **`git diff --stat`:** see the top-level turn report accompanying
   this artifact (this document itself does not embed shell output).
7. **`git status --short`:** see the same top-level turn report.
8. **Confirmation:** no implementation code, `firestore.rules`, schema,
   or test file was changed to produce this reassessment — only this
   one governance markdown file.
9. **Stopping after Rule 8, per instruction.** No Implementation Plan,
   Implementation Authorization, or further governance step is taken by
   this document.

---

# PART I — Original Rule 8 Assessment (Decision 44, pre-refinement) — HISTORICAL, PRESERVED UNCHANGED

*(Everything from here through the end of this document is preserved
exactly as originally written, evaluated against the pre-refinement,
open-ended shared-editing model Decision 44 §6 originally stated. It is
superseded, not deleted, by Part II above wherever the two differ — see
Part II's own before/after matrix, §II.16, for the authoritative
reconciliation between the two. Nothing below this line was edited in
this session.)*

---

## A. Authority Reviewed

Read fresh from the repository this session, in addition to everything
already traced in the two prior investigations:

- `docs/specs/stock-count-data-loss-resilience-decision-44-amendment.md` — the accepted amendment, in full, including its Acceptance Note.
- `docs/specs/stock-count-data-loss-resilience-specification.md` §5 (the superseded assumption), §11 (security rules), §13 (mechanism-open finalization invariant).
- `docs/engineering/periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md` — format precedent and the existing 41F/41G non-blocking-concern precedent for same-row concurrent editing.
- `apps/tenant/src/context/AppContext.tsx` — `recordStockCount`'s periodic branch (deterministic-id derivation from `submissionId`, confirmed by fresh trace — see §8/§12 below), the periodic draft `onSnapshot` listeners (meta + `items` subcollection), `savePeriodicStockDraftItem`/`Meta`, `flushPeriodicStockDraftRows`.
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — the Cross-Device Live-Update Notice effect (`remoteDraftUpdateNotice`), `submissionIdRef` generation, the generation-token/cancel-before-finalize logic.
- `apps/tenant/src/types.ts` — `PeriodicStockDraftItem` / `PeriodicStockDraft` field shape (confirmed: no per-row version/revision/writer-identity field exists today).
- `apps/tenant/src/lib/firebase.ts` — `persistentLocalCache` / `persistentMultipleTabManager` init, `isFirestorePersistenceActive`.
- `firestore.rules` — `isMemberOf`, `isOwnerOf`, the `staffTier == 'manager'` elevated-tier pattern used elsewhere in the file, `stockCountDrafts/{draftId}` (and its `items/{rowKey}` sub-match), `purchaseDrafts/{draftId}` (the per-user-scoped prior art), `stockCounts/{stockCountId}` create/update/delete rules for non-`'initial'` types.
- `tests/` directory listing — confirmed no existing test exercises two independent Firestore-client instances against the same draft/finalization path; the multi-device/multi-user scenario has no current automated coverage of any kind.

---

## B. Current-State Matrix

| # | Requirement | Current implementation | Evidence | Satisfies? | Gap/Risk |
|---|---|---|---|---|---|
| 1 | Business ownership | Draft path is `businesses/{businessId}/stockCountDrafts/periodic(+/items/{rowKey})` — no device/session/user id in path | `AppContext.tsx` doc/collection refs | **PASS** | None — this is already correct |
| 2 | Same-user multi-device state | `onSnapshot` listeners on the meta doc and items subcollection, scoped by `businessId`, live for the session's lifetime | `AppContext.tsx` listener setup | **PARTIAL** | Data reaches other devices live, but is never auto-applied to working state — requires manual reload to adopt (§5 below) |
| 3 | Multi-user same-business state | `stockCountDrafts` rules require `isOwnerOf`, not `isMemberOf` | `firestore.rules` L1247 | **FAIL** | Staff cannot read or write the draft at all today — architecturally blocked, not merely unoptimized |
| 4 | Live synchronization | Firestore push listeners, no polling | `AppContext.tsx` | **PASS** (mechanism) / **PARTIAL** (adoption) | Delivery is live; adoption into working UI state is manual |
| 5 | Durable local persistence | `persistentLocalCache` + debounce/flush, per prior investigation | `firebase.ts`, `PeriodicStockCountView.tsx` | **PASS** | Unaffected by Decision 44; must remain unaffected by any candidate solution |
| 6 | Offline recovery | SDK-level offline queue, syncs on reconnect | `firebase.ts` | **PASS** (single-writer case) | Multi-writer offline reconnect has no conflict handling (see #8) |
| 7 | Stale-write protection | None found | No version/precondition check on per-row draft writes | **FAIL** | Confirmed: `PeriodicStockDraftItem` has no revision, `updatedAt`, or writer-identity field; a stale write is indistinguishable from a fresh one at the write layer |
| 8 | Same-row concurrent edits | Plain Firestore document write, last physical arrival wins | Same as #7 | **FAIL** | Silent overwrite at the field level, confirmed by absence of any guard |
| 9 | Conflict preservation | None — the losing write leaves no trace | Same as #7/#8 | **FAIL** | No conflict record, no history, no notice targeted at the specific overwritten row |
| 10 | Cross-device finalization uniqueness | `stockCounts` doc id is deterministic from `submissionId` — but `submissionId` is generated **per local session** (`useRef`, `Date.now()+Math.random()`), independently on each device | `AppContext.tsx` (id derivation), `PeriodicStockCountView.tsx` (`submissionIdRef` generation) | **FAIL** | **Confirmed, not merely suspected:** two devices independently confirming the same physical count generate two different `submissionId`s → two different deterministic doc ids → two `stockCounts` documents, both created successfully under the current `create` rule (`isOwnerOf && subscriptionAllowsNewRecords`, no existence-of-another-periodic-count-for-this-date check) |
| 11 | Duplicate finalization prevention | Same-`submissionId` retries are idempotent (update, not create, on retry) | `AppContext.tsx` comment, confirmed | **PARTIAL** | Protects retries of *one* device's own attempt; does not protect two *different* devices' independent attempts (see #10) |
| 12 | Draft resurrection prevention | Generation-token cancellation, built and tested for **same-session** timer-vs-own-finalization race | Prior investigation, `submissionIdRef` nulling call sites | **PARTIAL** | Not confirmed to detect a **different** session's finalization deleting the draft out from under this device's still-pending write (see §12 below) |
| 13 | Post-finalization write prevention | **None found** for periodic-type `stockCounts` | `firestore.rules` L727: `allow update, delete: if isOwnerOf(businessId) && resource.data.get('type', null) != 'initial';` | **FAIL** | Periodic-type `stockCounts` documents are Owner-updatable/deletable **unconditionally** — no submission-identity check, no immutability window. (This exists intentionally to support the Business Worth correction/"Está a corrigir a última Contagem" workflow — but it means nothing at the rules layer distinguishes a legitimate correction from a stale device blindly overwriting with reconstructed old data.) |
| 14 | Tenant isolation | `businessId` scoping throughout, `isOwnerOf`/`isMemberOf` resolve against the caller's own profile, never a client-supplied field | `firestore.rules` | **PASS** | Unaffected by anything Decision 44 requires; must remain unaffected by any candidate solution (§3 below) |
| 15 | Staff authorization | Owner-only today | `firestore.rules` `stockCountDrafts` block | **FAIL** (relative to Decision 44's requirement) | Correct today relative to the *pre-Decision-44* spec; now a gap relative to the accepted requirement — this is Decision 44-A, not yet resolved |
| 16 | Shared-device/logout isolation | Not confirmed either way | No cache-clear-on-logout call found in either prior pass or this one | **UNVERIFIED** | Genuinely open — see §10 below |
| 17 | Multi-tab behavior | `persistentMultipleTabManager` coordinates the local cache only; each tab is an independent component instance with its own listeners, its own `submissionIdRef` | `firebase.ts`, `PeriodicStockCountView.tsx` | **PASS** (cache coordination) / **FAIL** (application-level collaboration) | Two tabs = two devices for every purpose in this table; not a separate risk class |
| 18 | Recovery after interruption | Unaffected by Decision 44; prior investigation confirmed this is solid for the single-device case | Prior investigation | **PASS** | No new risk introduced |
| 19 | 300+ product scale | Per-row draft writes (not one giant document) already established as viable | Prior investigation | **PASS** (current architecture) | Any conflict-detection addition (per-row version field) adds one field per row, not a new document — scale-neutral, but not yet load-tested at scale (see §16 below) |
| 20 | Initial Stock Count separation | Confirmed still excluded — Decision 44 §2/§25 explicitly scope it out; no code inspected in this pass touches `InitialStockCountView.tsx` | `firestore.rules`, code | **PASS** | Correctly separated; Decision 44-G remains open only as a *future* question, not a current gap |

**Do not read "PASS" on rows 1/4/5/6/14/17/18/19/20 as "Decision 44 is
satisfied" — those rows measure the pre-existing, unaffected mechanisms
Decision 44 explicitly requires be preserved (§8 of the amendment), not
the new requirements themselves.** The rows that matter for Decision
44's actual, new content are 2, 3, 7, 8, 9, 10, 11, 12, 13, 15, 16 — of
those, **7, 8, 9, 10, 13, 15, and 16 are currently failing or
unverified.**

---

## C. Tenant Isolation (§3 of the task)

**Conceptual test — User from Business A attempts to read/write
Business B's Periodic Contagem draft:** blocked today, and nothing a
Decision 44-compliant implementation plausibly requires would change
this. Every rule reviewed resolves `isOwnerOf`/`isMemberOf` against
`request.auth`-derived profile lookups, never against a client-supplied
`businessId` field, and the draft path itself is namespaced under
`businesses/{businessId}/...` at the Firestore path level, which rules
enforce structurally. **No weakening found, and none of Decision 44-A
through 44-F's viable option sets require touching this boundary.**

**Would expanding draft access from Owner to another tier require a
rule change?** **Yes, confirmed.** The `stockCountDrafts` match block's
`allow read/create/update/delete` conditions are literally
`isOwnerOf(businessId)` at every verb, for both the parent doc and the
`items/{rowKey}` sub-match. Any tier broader than Owner requires editing
this rule. **No such edit has been made; none is authorized by this
document.**

---

## D. Decision 44-A — Staff Authorization

| Option | Security | Tenant isolation | Consistency with existing architecture | Complexity | Rules impact | Risk of unauthorized editing | Compatibility with shared Contagem |
|---|---|---|---|---|---|---|---|
| A — All authorized Staff | Broadest exposure surface within the business | Unaffected (still `isMemberOf`-bounded) | Matches `stockCounts`' own *read* tier (`isMemberOf`) but not its Owner-only *finalize* boundary | Lowest | One-line change (`isOwnerOf` → `isMemberOf`) for read/write; finalization itself would still need its own, narrower gate | Highest — any Staff account, any tier, could alter draft quantities | Fully compatible, simplest |
| B — Elevated Staff (`staffTier == 'manager'`) | Narrower, matches an existing precedent tier | Unaffected | **Directly reuses an existing pattern** already present in `firestore.rules` (`myProfile().get('staffTier', 'staff') == 'manager'`, used for the analogous elevated-Staff carve-out elsewhere in the file) | Low — same shape as an existing rule, not a novel pattern | Small, precedented change | Lower — matches the trust tier the codebase already treats as elevated | Compatible; narrows who can *edit*, not who can *see* a finalized count (which is already `isMemberOf`) |
| C — Another existing category | Not identified — no third tier exists in `firestore.rules` beyond `owner`/`admin` (`isOwnerOf`) and plain `staff` vs. `staffTier == 'manager'` | N/A | N/A | N/A | N/A | No evidence a third category exists to select |

**Recommended option (not a Product Architect decision — offered as
evidence-based input only):** **Option B**, because it is the only
option that reuses an *already-existing, already-reviewed* authorization
pattern in this exact file rather than introducing the widest possible
exposure (Option A) or inventing a new category with no precedent
(Option C). This recommendation is not binding.

> **Decision 44-A — READY FOR PRODUCT ARCHITECT DECISION**

---

## E. Multi-Device / Multi-User Synchronization (§5 of the task)

Confirmed, precisely, by fresh code trace (not assumption):

- **Same user, two devices:** both receive live listener pushes for the
  meta doc and every row's item doc. Neither device's working `rows`
  state is ever patched by the listener. A passive notice
  (`remoteDraftUpdateNotice`) appears, explicitly self-documented in
  its own code comment as a **"safe interim fix,"** requiring a manual
  full-page reload to adopt the remote state.
- **Two authorized users, two devices:** not reachable today — blocked
  by `stockCountDrafts`'s Owner-only rule (§B row 3/15). Cannot be
  observed until Decision 44-A is resolved and implemented.
- **Two tabs:** identical to "two devices" in every respect checked —
  each tab is its own component instance with its own listeners, its
  own `submissionIdRef`, its own notice logic.
- **Simultaneous edits to different products:** no conflict — different
  Firestore documents (`items/{rowKey}` is unique per product/portion),
  both writes succeed independently, both are eventually visible via the
  listener.
- **Simultaneous edits to the *same* product:** plain Firestore
  last-physical-arrival-wins at that one row's document. **Confirmed:
  no transaction, no precondition, no version check exists on this
  write path** (`savePeriodicStockDraftItem`/`flushPeriodicStockDraftRows`
  both issue direct `setDoc`/batch `.set()` calls with the row's plain
  content, no `runTransaction`, no `updateTime`/precondition argument).
- **Offline edits followed by reconnect:** the reconnecting device's
  queued write applies exactly like any other write once it reaches the
  server — no special handling distinguishes "this write is based on
  data that is now hours stale" from "this write just happened."

**Exact data-loss risk, stated precisely:** any two authorized sessions
(today: two devices/tabs under the same Owner identity; after Decision
44-A: potentially two different Staff identities too) that write to the
same product row within the same debounce/flush window, or where one
was offline while the other wrote, will have one write silently and
permanently overwrite the other, with no record that a conflict
occurred and no notice targeted at the operator whose value was
discarded (the existing notice is whole-draft-level, not row-level, and
is only seen by whichever device happens to still be mounted).

---

## F. Decision 44-B — Conflict Resolution

| Mechanism | Correctness (stale-write) | Concurrent same-row | Offline behavior | Transaction reqs. | Reads/writes cost | Storage growth | Complexity | Recovery | Conflict visibility | 300+ product perf. | Migration | Failure modes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Optimistic version check (compare client's last-read version against server's current before write) | Correct — detects staleness deterministically | Correct — second writer's stale version is rejected/flagged | Works with SDK's offline queue if the check is a transaction (transactions replay against server state on reconnect) | Requires `runTransaction` per row write, or a precondition read-then-write | +1 read per debounced write (not per keystroke) | None (one small field added per row) | Medium — touches every draft-write call site | Rejected write can be surfaced and re-applied by the operator | Good, if paired with a UI surfacing which row conflicted | Fine — cost scales per-row, not per-document | Additive field (`revision`/`updatedAt`), no data migration needed | If the transaction itself fails offline, the SDK's own retry/queue semantics apply — needs explicit testing |
| 2. Transactional compare-and-set (Firestore transaction, explicit precondition) | Correct | Correct | Same caveat as #1 — transactions and long offline queues need explicit verification | Yes, by definition | Similar to #1 | None | Medium-high — transactions interact with the existing debounce/generation-token logic and must be reconciled with it | Same as #1 | Same as #1 | Fine | Same as #1 | Largely the same mechanism as #1, described at the Firestore-primitive level rather than the application level |
| 3. Per-row revision (a monotonic counter or timestamp field, checked but not necessarily inside a transaction) | Correct if checked before every write; **weaker if only checked "best-effort" without a transaction/precondition**, since a race remains between the check-read and the write itself | Same caveat | Works | Optional — can be done via `update()` preconditions instead of a full transaction | Similar to #1 | None | Low-medium — simplest to bolt onto the existing per-row write functions | Same as #1 | Same as #1 | Fine | Same as #1 | Without a true precondition/transaction, a narrow race window remains between two near-simultaneous writers |
| 4. Explicit conflict records (write the "losing" value to a side document/field instead of discarding it, still let one value become current) | Correct for *preservation*; does not by itself prevent the overwrite, only makes it non-silent | Both values survive, one is marked current | Works | Not required | +1 write for the conflict record when a conflict is detected | Grows with conflict frequency — bounded by how often two operators actually hit the same row concurrently, expected to be low | Low-medium | Excellent — nothing is ever truly lost | Excellent — directly satisfies §10/§21 of the amendment | Fine | Additive, no migration | Simpler failure surface than a transaction-based approach, but still needs *some* detection mechanism (e.g. #1 or #3) to know a conflict happened at all |
| 5. Versioned edit history (append-only log of every value a row has held) | Correct for preservation | Both survive | Works | Not required for the append itself | +1 write per edit (already happening via debounce — this is not a new write, just a shape change from overwrite to append) | Grows unbounded with edit count — needs pruning/derivation-of-current-value logic | Medium-high — changes the fundamental read model (current value = derived from latest history entry, not a field) | Excellent | Excellent | Needs a "current value" query/derivation step at read time — more read complexity | Larger migration — every consumer of `PeriodicStockDraftItem.quantity` would need to resolve "current" from history |
| 6. Append-only observation records (each operator's entry is its own immutable document, "current" is a derived/latest-wins projection) | Correct | Correct, and preserves both | Works | Not required | Similar to #5 | Similar to #5 | Similar to #5, slightly lower than full history since there's no update-in-place at all | Excellent | Excellent | Similar to #5 | Larger — changes storage shape entirely | Similar to #5 |

**Additive merging is explicitly not evaluated as a candidate** — per
Decision 44 §10 and the task's own instruction, a Contagem quantity is a
physical observation (BDR-0009), and two different observations of the
same product are not summable facts; none of the six mechanisms above
treat them as such.

**Observation, not a recommendation:** mechanisms 1/2/3 (some form of
version/precondition check) are what's needed to satisfy **stale-write
protection** (§11 of the amendment); mechanism 4 (explicit conflict
record) is the smallest addition that independently satisfies
**conflict preservation** (§10/§21). They are not mutually exclusive —
a version check that *rejects* a stale write and *simultaneously* writes
the rejected value to a small conflict record would satisfy both
requirements without adopting the heavier history-based options (5/6).
This is offered as evidence, not as the Decision 44-B selection.

> **Decision 44-B — READY FOR PRODUCT ARCHITECT DECISION**

---

## G. Decision 44-C — Conflict UI

The existing "safe interim fix" notice (§E above) is direct evidence of
what a minimal, already-shipped answer to part of this question looks
like: whole-draft-level, passive, dismissable, requiring a manual
reload. It satisfies "the operator is told something changed" but not
"the operator is told *which row* conflicted, with *what* value, and
what happened to their own entry" — none of which the current
implementation attempts, because no per-row conflict detection exists
yet to inform such a UI (§F).

Options, evaluated for a real stock-count workflow (an operator moving
quickly through possibly hundreds of rows, often on a phone):

- **Automatic adoption for untouched rows:** low friction, but requires
  the client to know reliably which rows are "untouched" (never typed
  into this session) vs. merely not yet re-rendered — feasible given the
  existing row-keyed data shape, but adds new state-tracking complexity.
- **Explicit conflict banner (extends the existing mechanism):** lowest
  implementation delta, since the notice component and its detection
  logic already exist and would only need to become row-aware.
- **Row-level conflict state (e.g. a small badge/highlight on the
  specific conflicting row):** most legible to an operator mid-count,
  moderate complexity, pairs naturally with mechanism 4 from §F.
- **Explicit choose/retry action:** most correct in principle, highest
  complexity, closest to "a full collaborative editor" — which the
  amendment's own §25 non-goals caution against building unless Rule 8
  demonstrates necessity. **This assessment does not find that
  necessity demonstrated** — a stock count is a fast, largely
  non-collaborative-in-the-same-instant workflow in practice (per
  BDR-0009's own physical-observation framing), so a lighter notice/
  badge approach is plausible without a full editor, but this is a
  product judgment call, not a technical finding.

> **Decision 44-C — READY FOR PRODUCT ARCHITECT DECISION**

---

## H. Decision 44-D — Cross-Device Finalization Guard (HIGH-PRIORITY)

**This is the single most concrete, confirmed-by-code gap in this
entire assessment.**

Fresh trace, `AppContext.tsx`, periodic finalization branch:

- The `stockCounts` document id for a periodic count is now
  deterministic, derived from `submissionId` — this closed the
  *same-session-retry* duplication risk the original specification
  (Decision 38) named.
- `submissionId` itself, however, is generated **locally, per
  component-instance session** (`PeriodicStockCountView.tsx`:
  `submissionIdRef.current = 'submission-' + Date.now() + '-' +
  Math.random().toString(36).substr(2, 8)`), the moment that device's
  own operator reaches the confirmation step. **Two different devices
  editing what is, at the data layer, the same shared draft each
  generate their own, different `submissionId` independently.**
- The `stockCounts` `create` rule for non-`'initial'` types requires
  only `isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId)`
  — **no check that another periodic count for the same logical draft/
  date/submission lineage doesn't already exist.**

**Consequence, confirmed by rules+code reading, not merely
hypothesized:** Device A and Device B, both legitimately authorized
(today: both the Owner, on two devices), both editing the same shared
draft, can each independently reach "Confirmar Contagem" and each
successfully `create` their own, differently-`id`'d `stockCounts`
document. **Both succeed. Two finalized records exist for one physical
count.** This is exactly the failure Decision 44 §13-A names, and it is
open today, not merely theoretically possible.

**Also confirmed:** the atomic-batch draft-cleanup (deleting
`stockCountDrafts/periodic` + all its `items`) happens as part of
*whichever* device's batch commits — the second device to attempt
finalization would, depending on timing, either find the draft already
gone (and finalize from whatever local state it still holds — which may
already be stale) or race to delete an already-deleted draft
(Firestore's delete is idempotent, so this itself doesn't error, making
the duplication *silent* at the UI level unless the deterministic-id
`create` happens to fail for an unrelated reason).

**Candidate guard mechanisms** (not selected here):

- An authoritative "finalization in progress / finalized" marker field
  on the shared draft's meta document, set via a transaction the moment
  any device begins its confirmation flow — every other device's own
  confirmation attempt checks this marker first.
- A Firestore transaction wrapping the entire finalization: read the
  draft meta, verify no `finalizedAt`/`finalizingBy` marker is already
  set, then write the marker + the `stockCounts` doc + delete the draft,
  all inside one transaction.
- A deterministic count identity derived from something business-owned
  and date-scoped (e.g. `businessId + type + date`) rather than from a
  per-session-generated `submissionId` — so two devices finalizing "the
  same" count would collide at the `create` rule itself (Firestore's own
  create-if-absent semantics doing the deduplication, mirroring exactly
  how the `'initial'` count's own singleton-by-fixed-id trick already
  works elsewhere in this same file).
- A server-side finalization gate (a callable function or similar)
  rather than a pure-client Firestore write, trading client simplicity
  for a single authoritative arbiter.

Each candidate needs its own scrutiny against offline finalization
(§ below) before selection — deferred to the Product Architect decision
and a subsequent, narrower Rule 8 pass on the selected mechanism if
needed.

> **Decision 44-D — READY FOR PRODUCT ARCHITECT DECISION**
> **This assessment flags 44-D as a Rule 8 BLOCKER (see §S, Risk Classification) — Implementation Authorization should not proceed while this gap remains open, once multi-device finalization becomes reachable in practice.**

---

## I. Decision 44-E — Live Adoption

| Option | Accidental-overwrite risk | Operator confusion | Counting speed | Collaboration quality | Offline recovery interaction | Complexity |
|---|---|---|---|---|---|---|
| 1. Auto-update untouched rows, protect actively-edited rows | Low, if "actively edited" is tracked correctly (e.g. any row this session has ever written to, not just the currently-focused input) | Low-medium — some rows change under the operator without action | Fastest — no manual reload needed for most of the count | Best of the four | Needs care: what does "protect" mean for a row this device edited locally then went offline for hours? | Highest of the four — most new state to track correctly |
| 2. Require explicit adoption (current "safe interim fix," extended) | Lowest — nothing changes without the operator choosing it | Low — predictable, if slower | Slower — operator must act to see updates | Weakest live-collaboration feel, but matches how the existing mechanism already behaves and is already understood/shipped | Cleanest interaction with offline/reconnect — no ambiguity about what to auto-merge | Lowest — closest to zero new work beyond what already exists |
| 3. Show conflicts only (silently adopt non-conflicting remote changes, surface only genuine same-row conflicts) | Low for non-conflicting rows; same as option 1 for conflicting ones | Low — operator only sees signal when it matters | Fast for the common case (different rows) | Good | Depends entirely on §F's conflict-detection mechanism being in place first | Medium — depends on 44-B being resolved and implemented before this is even meaningful |
| 4. Another controlled mechanism | — | — | — | — | — | Not evaluated — no specific alternative was identified as clearly superior to 1–3 during this pass |

**Observation:** Option 3 is the most natural long-term target given
Decision 44-B likely lands on some conflict-detection mechanism anyway
(§F) — but it is **sequenced after**, not independent of, 44-B. Option 2
is the lowest-risk immediate step and is already substantially built.
Neither is selected here.

> **Decision 44-E — READY FOR PRODUCT ARCHITECT DECISION**

---

## J. Decision 44-F — Shared-Device Cache Isolation (HIGH-PRIORITY)

**Not resolved by this pass — genuinely unverified, carried forward
from both prior investigations, now examined more specifically:**

- No code was found in `firebase.ts`, the auth-state-change handler, or
  the logout flow (not fully traced in this pass — see limitation
  below) that explicitly clears or scopes `persistentLocalCache` by
  authenticated user.
- Firestore's `persistentLocalCache` is a single IndexedDB store per
  browser origin, **not** inherently partitioned per Firebase Auth uid.
  Whether the SDK itself isolates cached documents by the security
  rules that were in effect when they were cached (i.e., whether
  Operator B's *listener re-attachment* under Operator B's own auth
  token would even be permitted to read Operator A's previously-cached
  documents from the local store, given the rules re-evaluate on every
  read) was **not independently confirmed by this pass** — this is a
  Firestore-SDK-behavior question that needs either targeted testing
  against the emulator/real SDK or a direct check of the exact
  `logout`/`switchShop`/auth-transition code path, not something
  that can be safely asserted from the pieces already read.
- **What the amendment itself explicitly warns against — recommending a
  blanket `clearPersistence()`/cache-wipe on every logout — is
  correctly not recommended here**, since that would directly undermine
  INV-44-04/44-05 (durable local protection, offline protection) for
  the *next* legitimate session on that same device.

**This is the correct honest answer at this stage: unresolved, and
flagged as needing a dedicated, narrow investigation** (does the SDK's
own rules-re-evaluation-on-read already make this safe by construction,
or does stale cached data remain readable to a newly-authenticated
different user until the next server round-trip evicts it) **before**
Decision 44-F can be soundly made, let alone implemented.

> **Decision 44-F — READY FOR PRODUCT ARCHITECT DECISION, WITH A NOTED PRECONDITION: a targeted technical verification of Firestore SDK cache/auth-transition behavior should precede or accompany the decision, not follow it — this is not yet a decision between clean options, it may be a decision made blind without that verification.**

---

## K. Decision 44-G — Initial Stock Count

- Initial Stock Count's existing architecture (single whole-document
  draft, Owner-only, same debounce/flush/generation-token pattern) does
  **not** currently have equivalent multi-device live-notice tooling —
  the Cross-Device Live-Update Notice mechanism (§E) was found only in
  `PeriodicStockCountView.tsx`, not `InitialStockCountView.tsx`, in this
  pass.
- Its semantics are materially similar (also a physical observation,
  per BDR-0009, applying equally to the opening count), so the same
  conflict/staleness class of risk would apply *if* Initial Stock Count
  were ever made multi-device/multi-user — but it is explicitly a
  **one-time, singleton** event per business (per the existing
  `'initial'`-type immutability tier already reviewed in §B row 13's
  adjacent rule text), which is a materially different usage pattern
  from a **recurring** Periodic count — lower concurrency exposure in
  practice (it happens once), but not zero.
- **This assessment finds no evidence that Initial Stock Count should
  automatically inherit Decision 44** — it should remain separately
  governed, exactly as Decision 44 §2/§25 already state, with a future,
  separate amendment as the correct path if the Product Architect later
  wants equivalent treatment.

> **Decision 44-G — READY FOR PRODUCT ARCHITECT DECISION**

---

## L. Draft Resurrection Analysis (§12 of the task)

Tracing the exact race specified:

```
Device A → has pending autosave (debounce timer armed, or in-flight write)
Device B → finalizes → stockCounts created, draft deleted
Device A → pending write arrives
```

- Device A's `items`/meta listeners **will** receive the delete
  (Device B's batch removes the meta doc and every item doc) — A's
  `periodicStockDraftListenerState` will move toward
  `'confirmed-no-draft'`.
- A's own generation-token cancellation logic (`cancelDraftRetry`-
  equivalent, per the per-row ownership model already documented for
  Decision 41C) was built and tested to cancel a stale write **against
  A's own subsequent local finalization** — its trigger is A's own
  confirmation flow beginning, not an externally-observed draft
  deletion. **No code was found in this pass that cancels A's pending
  write specifically because the listener reported the draft no longer
  exists.**
- **Conclusion: the resurrection risk is open for the cross-device
  case.** If A's pending debounced write fires after B's delete, it
  will `set()`/`update()` a document at a path B just removed —
  Firestore recreates it. This reproduces the exact defect class
  Decision 38 closed for the single-session case, now open again
  one layer up. This is not a new invention of this assessment; it
  restates and confirms, with the specific code paths checked, what
  the prior investigation flagged as an open question.

---

## M. Post-Finalization Mutation (§13 of the task)

- `stockCountDrafts` writes after finalization: **prevented only in the
  sense that the draft no longer exists** to write *new content into* in
  the normal per-row-update sense — but nothing in the rules prevents a
  stale device from **creating a brand-new draft** at the same fixed
  path (`stockCountDrafts/periodic`) after finalization, since `create`
  is allowed unconditionally for `isOwnerOf` + subscription-allowed,
  with no check for "is there already a finalized count for this
  date/type." A stale device beginning a *fresh* local edit unaware
  finalization already happened would recreate a draft that looks
  identical in shape to a legitimate new count — this is a **UX/data-
  hygiene risk**, not literally a rules violation, but worth naming.
- `stockCounts` (the finalized record) itself: **confirmed unconditionally
  mutable/deletable by any Owner-authenticated session**
  (`firestore.rules` L727, quoted in §B row 13). This is intentional —
  it is what the existing Business Worth correction workflow relies on
  — but it means **nothing distinguishes a legitimate, informed
  correction from a stale device blindly overwriting a finalized count
  with reconstructed old local data.** This is the second concrete,
  code-confirmed gap this assessment surfaces (alongside 44-D), and it
  interacts directly with 44-D's finalization guard: whatever mechanism
  is chosen for 44-D should be evaluated for whether it also needs to
  extend to this post-finalization mutation surface, not treat
  finalization-uniqueness and finalization-immutability as unrelated
  questions.

---

## N. Conflict Preservation (§14 of the task)

Walking `A observes 20 / B observes 25` through the required scenarios:

| Scenario | Outcome today |
|---|---|
| Both online, near-simultaneous | Whichever write reaches Firestore's server last silently wins; the other is gone, no trace |
| A offline, B online | B's write lands normally; A's write queues; on A's reconnect, A's write lands *after* and silently overwrites B's — order-dependent, not value-aware |
| B offline, A online | Symmetric to above |
| A reconnects first | A's (possibly older) value may still overwrite B's newer server value if B hasn't yet written when A's queued write flushes — genuinely order-dependent, confirmed no protection exists |
| B reconnects first | Symmetric |
| Both reconnect simultaneously | Same underlying single-document last-write-wins semantics — no additional risk beyond the above, but no additional protection either |
| One finalizes mid-conflict | Whichever value was present in that device's own `pendingTally`/working state at confirmation time becomes the recorded quantity — the other device's differing entry, if it never made it into the finalizing device's own tally, is never represented in the finalized `stockCounts` at all, silently |

**In every scenario, one observation can disappear without being
accounted for.** This is the direct, confirmed evidence behind marking
row 9 of the Current-State Matrix (§B) as **FAIL**.

---

## O. Firestore Rules Assessment (§15 of the task)

| Requirement | Rule support today |
|---|---|
| Owner-only draft access | Present (`isOwnerOf` at every verb, `stockCountDrafts` + `items`) |
| Possible Staff access | **Not present** — would require a rules edit (§C, §D) |
| businessId enforcement | Present, structural (path-based) + `isOwnerOf`/`isMemberOf` |
| Document ownership | Present at the business level; no per-row writer-identity field exists to enforce anything finer |
| Revision/version validation | **Not present** — no rule references any version/revision field, because no such field exists in the schema yet |
| Finalization state transitions | **Not present** for periodic type — `create`/`update`/`delete` are each single unconditional boolean checks, no state-machine/precondition logic (contrast with the much more elaborate `'initial'`-type chain-position rules in the same block, which *do* enforce a state machine) |
| Draft deletion | Present, unconditional for Owner, never subscription-gated |
| Prevention of post-finalization writes | **Not present**, per §M |
| Prevention of cross-business access | Present and solid (§C) |

**No rules were modified to produce this table.** Any change to any row
marked "Not present" requires its own reviewed rules edit, not made
here.

---

## P. Performance / Scale (§16 of the task)

Qualitative estimate, using the actual architecture:

- **100–300 products, current mechanism:** unaffected by anything
  Decision 44 requires — per-row writes, per-row listener documents,
  already established as scale-appropriate by the prior investigation.
- **Adding a version/precondition check (44-B, mechanisms 1–3):** one
  extra read per debounced write. At 300 rows with independent 800ms-
  debounced writes, this is at most one extra read per row-edit event,
  not per keystroke — bounded, proportional to genuine edits, not
  typing speed. Not expected to be materially different in cost profile
  from the existing per-row write pattern.
- **Adding conflict records (44-B, mechanism 4):** additional writes
  only on actual detected conflicts, which — given this is a
  single-business, typically small-team workflow — are expected to be
  rare relative to total row count, not a scale concern at 300–500+
  products.
- **Staff access (44-A):** adds listener/read load proportional to how
  many Staff devices are actively viewing the count, not to product
  count — same conclusion as the prior investigation.
- **No candidate mechanism examined in §F becomes unsafe or
  impractical at 300–500+ products** — the versioned-history options
  (5/6) are the closest to a scale concern (unbounded growth), which is
  exactly why they are not the leaning recommendation in §F.

---

## Q. Existing Durability Regression Analysis (§17 of the task)

Every mechanism named in Decision 44 §8 as "remains required" was
independently re-confirmed present and untouched in this pass (debounced
autosave, interruption-triggered flush, offline persistence,
`ReadOnlyDraftRecovery`/resume flow, classified bounded retry via
`draftSaveFailureClassification.ts`, same-session `submissionId`
idempotency, same-session stale-timer/generation-token protection). **No
candidate mechanism evaluated in §F, §H, or §I requires removing or
weakening any of these** — a version/precondition check is additive to
the existing write call sites, not a replacement of the debounce/flush
scheduling around them; a finalization guard (§H) is additive to the
existing atomic-batch pattern, not a replacement of it.

---

## R. Recovery Matrix (§18 of the task)

| Failure scenario | Current behavior | Required behavior (per Decision 44) | Gap | Severity |
|---|---|---|---|---|
| Refresh during edit | Recovered from durable draft | Same | None | — |
| Navigation | Flushed, recovered | Same | None | — |
| Browser close | Flushed, recovered | Same | None | — |
| Browser crash | Recovered from last durable write | Same | None | — |
| Battery death | Recovered from last durable write | Same | None | — |
| Network loss | Local cache durable, syncs on reconnect | Same | None | — |
| Offline edit | Durable locally, queues | Same for single writer; must not silently overwrite a concurrent writer's newer value | Stale-write protection missing | **HIGH** |
| Reconnect | Queued write applies | Must detect staleness against concurrent edits | Same gap | **HIGH** |
| Second device opens | Receives live listener data | Must present a safe path to the same authoritative state | Present (notice), but manual-reload-only | **MEDIUM** |
| Second user opens | Blocked entirely (Owner-only rule) | Must be possible for the decided authorization tier | Blocked by rules — Decision 44-A | **BLOCKING (pending decision)** |
| Same-row concurrent edit | Silent last-write-wins | Must preserve/account for the conflict | Confirmed missing | **CRITICAL** |
| Stale write | Applies blindly if it arrives last | Must be detected/rejected | Confirmed missing | **CRITICAL** |
| Finalization race (cross-device) | Two devices can each successfully finalize under different `submissionId`s | Exactly one logical finalization | **Confirmed possible today** | **CRITICAL** |
| Late autosave (cross-device) | Not confirmed prevented — generation-token logic is same-session-scoped | Must not resurrect a finalized/deleted draft | Confirmed open | **CRITICAL** |
| Logout/login on same device | Not confirmed either way | Must not expose prior user's protected data | Unverified | **HIGH (unresolved, not confirmed unsafe)** |
| Business switch | Prior investigation found this handled (existing shop-switch guard, Decision 41A) | Unaffected by Decision 44 | None found | — |
| Two-tab conflict | Identical to two-device case | Same requirements apply | Same gaps as above | **CRITICAL** (inherits same-row/finalization gaps) |

---

## S. Rule 8 Risk Classification

**CRITICAL** (can cause silent loss, duplicate finalization, or
corruption):

1. Same-row concurrent-write silent overwrite (§E, §N) — no stale-write
   protection, no conflict preservation.
2. Cross-device duplicate finalization — **confirmed reachable today**,
   not hypothetical (§H).
3. Cross-device draft resurrection after a different device's
   finalization — open, not verified closed (§L).
4. Unconditional post-finalization mutability of periodic `stockCounts`
   with no distinction from a stale-device blind overwrite (§M).

**HIGH** (significant integrity/recovery risk):

5. Shared-device/logout cache-isolation behavior — genuinely unverified,
   not confirmed safe (§J).
6. Offline-reconnect ordering can silently apply a stale value even in
   the *current*, single-Owner-multi-device world already in production
   today (§E, §N) — this is not gated behind Decision 44-A being
   resolved; it is reachable right now, by the same Owner on two
   devices.

**MEDIUM** (material usability/operational risk):

7. Manual-reload-only live adoption (§E, §I) — not unsafe, but does not
   meet the "as live as reasonably possible" spirit of Decision 44 §7.
8. No conflict UI beyond a whole-draft notice — operators have no way to
   know *which* row was affected (§G).

**LOW** (non-blocking):

9. A stale device could recreate a fresh draft at the fixed
   `stockCountDrafts/periodic` path after finalization without realizing
   a count was already finalized (§M) — a UX/hygiene concern, not a
   data-integrity one, since it would simply become a *new*, distinct
   count attempt, not a mutation of the finalized record.

### Rule 8 Blockers (must be resolved before Implementation Authorization)

- **Decision 44-D (finalization guard)** — CRITICAL, confirmed reachable
  today in the same-Owner-multi-device case already in production.
- **Decision 44-B (conflict resolution mechanism)** — CRITICAL, root
  cause of findings 1 and 3.
- **Decision 44-F (cache isolation)** — HIGH, and specifically flagged
  as needing technical verification *before* a sound decision can even
  be made, not merely before implementation.
- **Decision 44-A (Staff tier)** — BLOCKING for §6/multi-user scope
  specifically, though not a data-integrity risk by itself (today's
  Owner-only rule is itself safe; it simply doesn't yet satisfy the
  accepted requirement).

---

# PRODUCT ARCHITECT DECISIONS REQUIRED

### Decision 44-A — Staff Access
1. **Question:** Which existing authorization tier may read/write an unfinished Periodic Contagem draft?
2. **Current evidence:** `stockCountDrafts` is `isOwnerOf`-only today, at every verb.
3. **Viable options:** (A) all authorized Staff — `isMemberOf`; (B) elevated `staffTier == 'manager'` — an existing precedented pattern in `firestore.rules`; (C) no third existing category was found.
4. **Risks:** (A) broadest edit-exposure surface; (B) narrower, precedented; (C) not evaluable, no evidence.
5. **Recommended option:** B, on precedent grounds only.
6. **Reason:** reuses an already-reviewed pattern rather than the widest possible surface or an unprecedented new one.
7. **Blocking:** Yes, for any multi-user (not just multi-device) scope of Decision 44.

### Decision 44-B — Conflict Resolution
1. **Question:** Which mechanism protects competing same-row observations?
2. **Current evidence:** no version/revision/writer-identity field exists on `PeriodicStockDraftItem`; no transaction/precondition on any draft write path.
3. **Viable options:** optimistic version check, transactional compare-and-set, per-row revision, explicit conflict record, versioned history, append-only observation records — full comparison in §F.
4. **Risks:** without this, findings CRITICAL-1 and CRITICAL-3 remain open indefinitely.
5. **Recommended option:** a version/precondition check (mechanism 1 or 3) combined with an explicit conflict record (mechanism 4), as the smallest combination satisfying both stale-write protection and conflict preservation.
6. **Reason:** avoids the storage-growth/read-complexity cost of full history (5/6) while still closing both named gaps.
7. **Blocking:** Yes — CRITICAL.

### Decision 44-C — Conflict UI
1. **Question:** How is the operator informed of a conflict?
2. **Current evidence:** a whole-draft-level passive notice exists today; no row-level mechanism exists.
3. **Viable options:** automatic adoption of untouched rows, explicit conflict banner (extends existing), row-level conflict state, explicit choose/retry — §G.
4. **Risks:** over-building a full collaborative editor is explicitly discouraged by Decision 44 §25 unless demonstrated necessary — not demonstrated here.
5. **Recommended option:** extend the existing notice mechanism to be row-aware, paired with whatever 44-B produces.
6. **Reason:** lowest implementation delta from what is already shipped and understood.
7. **Blocking:** Not independently blocking; sequenced after 44-B.

### Decision 44-D — Finalization Guard
1. **Question:** What guarantees exactly one logical finalization across independent devices?
2. **Current evidence:** **confirmed, reachable today** — deterministic `stockCounts` id is derived from a per-session `submissionId`; two devices generate two different ids and can each successfully finalize.
3. **Viable options:** authoritative finalization marker (transaction-gated), business/date-scoped deterministic identity (mirroring the existing `'initial'`-type singleton trick), server-side finalization gate — §H.
4. **Risks:** duplicate business records, corrupted downstream Business Worth calculations.
5. **Recommended option:** not selected here given the HIGH-PRIORITY/needs-its-own-scrutiny framing in §H; a business/date-scoped deterministic identity is the closest existing-pattern analog and worth weighing first.
6. **Reason:** the codebase already has one working precedent for exactly this shape of problem (the `'initial'` count's fixed-id singleton).
7. **Blocking:** Yes — CRITICAL, and reachable in production today, not merely after future implementation.

### Decision 44-E — Live Adoption
1. **Question:** What happens in the UI when a remote authoritative change arrives?
2. **Current evidence:** today, nothing happens automatically — a passive notice only, "safe interim fix" by its own code comment.
3. **Viable options:** auto-update untouched rows + protect active ones; require explicit adoption (current); show conflicts only; another mechanism — §I.
4. **Risks:** auto-adoption without correct "actively edited" tracking risks exactly the silent-overwrite failure Decision 44 §7 forbids.
5. **Recommended option:** keep explicit adoption as the near-term state; "show conflicts only" as the likely longer-term target once 44-B lands.
6. **Reason:** avoids introducing new overwrite risk before the conflict-detection foundation (44-B) exists.
7. **Blocking:** Not independently blocking; sequenced after 44-B.

### Decision 44-F — Shared-Device Cache Isolation
1. **Question:** Can persistent local cache expose one user's Contagem data to a subsequently authenticated different user on the same device?
2. **Current evidence:** unverified — no explicit cache-clear-on-logout found, and whether Firestore's own rules-re-evaluation-on-read makes this safe by construction was not independently confirmed in this pass.
3. **Viable options:** not yet meaningfully comparable without the technical verification named in §J.
4. **Risks:** potential cross-user data exposure on shared devices if unsafe; degraded offline durability if a blanket cache-clear is wrongly chosen without understanding the interaction.
5. **Recommended option:** none — recommend the technical verification precede or accompany this decision, not follow it.
6. **Reason:** deciding blind risks either an unaddressed security gap or an over-broad fix that regresses INV-44-04/44-05.
7. **Blocking:** Yes — HIGH, and specifically flagged as needing its own narrow investigation.

### Decision 44-G — Initial Stock Count
1. **Question:** Should Initial Stock Count receive an equivalent multi-device/multi-operator model?
2. **Current evidence:** materially similar physical-observation semantics, but a singleton (once-per-business) event, not recurring — lower concurrency exposure; no cross-device notice mechanism currently exists there at all.
3. **Viable options:** leave excluded (current Decision 44 scope); evaluate a future, separate amendment.
4. **Risks:** none from leaving it excluded now; a future amendment is the correct path if this changes.
5. **Recommended option:** leave excluded, per Decision 44's own explicit scope.
6. **Reason:** no evidence found that the singleton usage pattern creates comparable urgency to the recurring Periodic case.
7. **Blocking:** No.

---

## Final Rule 8 Verdict

# READY AFTER DECISIONS

The requirements Decision 44 establishes can plausibly be satisfied by
extending — not replacing — the current architecture: the business-owned
storage shape, the live-listener infrastructure, and the non-destructive
notice pattern are all already in place and none need to be torn out.
**However, this assessment does not issue a bare READY**, because:

1. Two CRITICAL gaps (cross-device duplicate finalization, §H; same-row
   silent overwrite / no conflict preservation, §E–§F–§N) are confirmed
   present in the code today, not merely theoretical, and one of them
   (offline-reconnect ordering silently overwriting a newer value) is
   reachable **in the current production system right now**, under the
   same-Owner-multi-device scenario that requires no rule change at all.
2. Decisions 44-A, 44-B, 44-D, and 44-F are each individually blocking
   for at least part of Decision 44's scope, per §S.
3. No implementation should proceed — and none has been made — until
   those decisions are resolved and, per this repository's own
   established discipline, a subsequent Implementation Plan and signed
   Implementation Authorization are produced.

---

## Reporting Summary (per task §22)

1. **Artifact path:** `docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`
2. **Current git status:** two untracked files (this assessment, plus the previously-recorded Decision 44 amendment); no staged or committed changes; `main` unchanged and up to date with `origin/main`.
3. **Code/rule/schema files changed:** **none.** No `.ts`/`.tsx` file, no `firestore.rules`, and no schema/type file was modified to produce this assessment — every finding above was obtained by reading the existing repository state only.
4. **Rule 8 verdict:** **READY AFTER DECISIONS.**
5. **Critical/High findings:** four CRITICAL (cross-device same-row silent overwrite; cross-device duplicate finalization — confirmed reachable today; cross-device draft resurrection — open, not confirmed closed; unconditional post-finalization mutability of periodic `stockCounts`) and two HIGH (shared-device/logout cache isolation — unverified; offline-reconnect ordering already exploitable in the current same-Owner-multi-device production system).
6. **Decisions 44-A through 44-G:** all seven presented above with question, evidence, options, risks, a non-binding recommendation where the evidence supports one, and a blocking determination — none decided or recorded as accepted by this document. The Product Architect must make each of these separately, per Decision 44's own §27/§28 boundary.
