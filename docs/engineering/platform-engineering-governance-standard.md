# Platform Engineering Governance Standard

**Type:** Reusable engineering-process standard. Not a specification,
not an architecture document, not itself an authorization for anything.
Codifies a sequence already independently followed twice (Module #19,
Module #20) so it is designed once and reused, rather than
rediscovered per module.
**Status:** ✅ Adopted. Applies to Module #21 onward and to any future
phase of Module #19 or #20 not already past a given stage.
**Basis:** Extracted directly from this repository's own history —
every stage below already exists as a real artifact for at least one
of the two modules that converged on it. Nothing here is aspirational
or untested against this codebase.

---

## 1. Why This Exists

Module #19 (Subscriptions) and Module #20 (Notifications) were built
independently, months apart, by different Rule 8 Assessments, under
different Product Architect decisions — and both arrived at the same
eleven-stage shape. That is not a coincidence; it is what the
underlying discipline (`docs/specs/README.md`'s "Architecture →
Standards → Specifications → Implementation," CLAUDE.md's Rule 8)
converges on whenever it is followed honestly. Writing it down once
means Module #21 starts from a known-good sequence instead of
re-deriving it, and means every future engineering session can be
checked against a fixed standard rather than an evolving memory of
"how we did it last time."

This document does not change what any of the eleven stages *require*
— each stage's own governing document (Rule 8's process, this
repository's own established conventions) still defines that. It fixes
the *sequence*, the *naming/location convention*, and the *lifecycle
vocabulary*, so those don't have to be re-decided per module.

## 2. The Eleven Stages

| # | Stage | Produces | Location convention | Who signs off |
|---|---|---|---|---|
| 1 | Specification | Business rules, user stories, functional/non-functional requirements for one module | `docs/specs/NN-module-name.md` | Product Architect (Accepted/Approved) |
| 2 | Specification Amendment(s) | Corrections or additions to an Accepted spec, when a gap is found post-acceptance | `docs/specs/NN-*-amendment.md` | Product Architect (Accepted) |
| 3 | Business Policies (POL) | Parameter-level decisions the spec deliberately left open (durations, thresholds, tiers) | `docs/specs/NN-pol-XXX-*.md` | Product Architect (Approved) |
| 4 | Engineering Readiness Assessment | A Rule 8-style check of whether the governance chain above is actually complete and consistent, before planning begins | `docs/engineering/NN-*-implementation-readiness.md` | Engineering, informational — surfaces open questions, does not resolve them |
| 5 | Architecture Decision Records (ADR) | A specific technical-architecture choice the spec/policies required but didn't make (e.g., which existing process owns a new background job) | `docs/adr/ADR-NNNN-*.md` | Product Architect (Approved) |
| 6 | Implementation Plan | The phase breakdown for the whole module — what each phase contains, its prerequisites, and its explicit non-scope | `docs/engineering/NN-*-implementation-plan.md` | Engineering, planning only — does not authorize coding |
| 7 | Rule 8 Assessment (per phase) | Current-state verification, affected-files list, engineering plan, risk table — for exactly one phase, confirmed fresh against the actual repository state, not assumed from an earlier turn | `docs/engineering/NN-phaseX-*-rule8-assessment.md`, or inline in the phase's own Implementation Plan section for small modules (Module #19 Phase 1 precedent) | Engineering, planning only — reaching "Assessed" is not authorization |
| 8 | Implementation Authorization | The explicit, signed go-ahead for exactly the scope the Rule 8 Assessment defined — nothing broader | `docs/engineering/NN-phaseX-implementation-authorization.md` for phases where a standalone record adds value (Module #20 Phase 1 precedent); a recorded Product Architect decision inline elsewhere is sufficient for smaller phases (Module #19 Phase 1 precedent) | **Product Architect signature required** — this is the one stage engineering cannot self-issue |
| 9 | Incremental Implementation | The actual code change(s), one commit per logical checkpoint within the authorized phase, each independently `tsc`/build-verified | `src/`, `server/`, `firestore.rules`, etc. per the authorization's own affected-files list | Engineering executes; each commit's message states which checkpoint it is and what remains |
| 10 | Phase Close-Out | A record that the phase's authorized scope was implemented and verified — governance compliance, what shipped, acceptance evidence, runtime/security/performance impact, explicit remaining-work boundary | `docs/engineering/NN-phaseX-closeout.md` | Engineering records; not itself a new authorization |
| 11 | Milestone Review | A cross-reference summary spanning multiple closed phases, read as a single checkpoint before the next major decision (e.g., before commercial features, before a new module's producers start writing to this one) | `docs/engineering/NN-milestone-review-phases-X-Y.md` | Engineering records; explicitly states it does not authorize what comes next |

## 2a. Stage 9 Detail — The Per-Checkpoint Loop

Stage 9 (Incremental Implementation, §2 above) says "one commit per
logical checkpoint within the authorized phase." This section fixes
*how* — extracted the same way the rest of this document was: from a
sequence already independently followed, checkpoint after checkpoint
(Module #20 Phase 3, Checkpoints 1–4), not designed in advance of using
it.

**This loop operates entirely inside Stage 9, on an already-Authorized
phase.** It never substitutes for, shortcuts, or reopens Stage 7 (Rule
8 Assessment) or Stage 8 (Implementation Authorization) — those remain
per-*phase*, Product-Architect-gated, and are not re-run per checkpoint.
What repeats per checkpoint is narrower: confirming the specific slice
of already-authorized scope is understood correctly today, building it,
and closing the loop before the next one opens.

| # | Step | What it means in practice |
|---|---|---|
| 1 | Repository Verification | Fresh `git clone`/`git fetch` against `origin/main`, not memory of an earlier turn (Non-Negotiable Principle 2, §4) — confirms the checkpoint's starting point is real. |
| 2 | Rule 8 Verification | Re-read the phase's Authorization and this checkpoint's own slice of its affected-files list — confirms the work about to happen is inside authorized scope, not a fresh Rule 8 Assessment. |
| 3 | Implementation | The actual code change, scoped to exactly this checkpoint — never spilling into the next checkpoint's files "while already in there." |
| 4 | Testing | Automated tests for the new code, plus a full existing-suite run (no regressions) and a typecheck/build pass — evidence, not an assertion that it works. |
| 5 | Internal Review | A code-review-only pass (technical debt, duplication, naming, reuse opportunities, complexity, missing comments, edge cases, ADR conformance, accidental coupling) before the checkpoint is considered done — same questions a human PR reviewer would ask, run explicitly rather than assumed satisfied by tests passing. |
| 6 | Rule 8 Completion Report | Summary / Files Changed / Database Impact / Security Impact / Performance Impact / Testing Checklist, per CLAUDE.md's own reporting requirement — states what shipped, doesn't imply what comes next is authorized (Non-Negotiable Principle 6, §4). |
| 7 | Merge | Commit and push, diff scope confirmed against the checkpoint's own affected-files list first (Non-Negotiable Principle 4, §4) — not assumed clean from intent. |
| 8 | Next Checkpoint | Stop. A completed checkpoint is not itself authorization to begin the next one's *design* work, but the next checkpoint inside an already-Authorized phase may begin its own Step 1 without a new Stage 7/8 — that gate was already cleared for the whole phase. |

**What this section does not change:** the eleven stages in §2, the
lifecycle vocabulary in §3, or any of the seven Non-Negotiable
Principles in §4 — this is a zoomed-in view of Stage 9 alone, using
vocabulary and principles all already fixed elsewhere in this document.

## 3. Lifecycle Vocabulary (fixed terms, used consistently)

A single document moves through a subset of these states, left to
right, never backward without an explicit, flagged reason:

**Designed → Proposed → Assessed → Authorized (signed) → Implemented →
Verified → Closed**

- **Proposed** — drafted, not yet reviewed/signed by the Product
  Architect.
- **Assessed** — a Rule 8 Assessment reached its conclusion (e.g.
  "Ready," "Ready after minor preparation," "Ready after decisions").
  This is a readiness *opinion*, not a go-ahead.
- **Authorized** — the Product Architect has signed. Only from this
  state can Stage 9 (Incremental Implementation) begin.
- **Closed** — Stage 10 exists and confirms the phase's scope was
  fully and only what was authorized.

Reaching any state through Assessed does not imply the next state
follows automatically. Every transition from Assessed to Authorized
requires an explicit, separate Product Architect decision — this
repository has never treated "the assessment looks ready" as
equivalent to "you may begin," and this standard does not change that.

## 4. Non-Negotiable Principles (already proven, now fixed)

1. **Scope discipline is absolute.** An Authorization covers exactly
   the affected-files list its own Rule 8 Assessment named. Discovering
   mid-implementation that the real scope is broader, narrower, or
   ambiguous returns to the Product Architect — it is never resolved by
   engineering judgment alone (Module #20 Phase 1 Authorization §4,
   verbatim: *"that finding returns to Product Architecture, not to
   engineering judgment"*).
2. **Every implementation session re-verifies fresh state.** A Rule 8
   Assessment or Close-Out is written against a `git fetch`-confirmed
   commit, not against memory of an earlier conversation turn (Module
   #19 Phase 2 Rule 8 Assessment §1 precedent).
3. **Environment limitations are reported, never worked around
   silently.** This sandbox cannot reach `storage.googleapis.com`
   (Firestore emulator) — every phase that touches `firestore.rules`
   says so explicitly and names the exact manual step still owed,
   rather than treating a typecheck pass as equivalent to a verified
   rule.
4. **Diff scope is confirmed, not assumed.** Before every commit,
   `git status`/`git diff --stat` is checked against the authorized
   file list — a clean match is stated as evidence, not inferred from
   intent.
5. **Documentation drift is flagged, not silently corrected inline
   with unrelated work.** `docs/specs/README.md`/`HANDOFF.md` going
   stale relative to real commit history is a known, recurring failure
   mode in this repository (found and flagged twice now, Module #19 and
   Module #20) — the fix is its own explicit, separate step, never
   folded into an implementation commit's diff.
6. **A governance artifact records; it does not decide.** Close-Outs
   and Milestone Reviews state explicitly, every time, that they do not
   authorize whatever comes next — this is not boilerplate, it is what
   prevents "we reached a checkpoint" from being read as "we may
   proceed."
7. **Numbering is not authorization.** A module or phase reaching the
   next sequential number (#21, Phase 2A, etc.) in a written plan is
   not itself a go-ahead — every phase still requires its own Stage 7
   and Stage 8 before Stage 9 begins, regardless of how far in advance
   it was named.

## 5. Applying This to an Existing Module's Later Phases

Module #19 and #20 both have phases beyond what's closed today, already
named in their own Implementation Plans. This standard does not
retroactively rename or renumber anything already Planned/Authorized —
if a future session proposes phase names or a phase breakdown that
differs from what an existing, already-Planned Implementation Plan
defines, that is a **Stage 6 amendment**, requiring the same explicit
Product Architect flagging as any other change to an approved planning
document — not a silent relabeling. (See the companion note in the
next Module #20 phase's own assessment, where exactly this situation is
surfaced.)

## 6. Applying This to Module #21 and Beyond

A new module starts at Stage 1 with no shortcuts assumed:

- No module skips straight to an Implementation Plan without an
  Accepted specification.
- No Rule 8 Assessment is drafted before its Implementation Plan
  exists (or, for a module's first phase, before the plan's own
  Rule 8 section is written — Module #19 Phase 1 precedent for small
  modules).
- No Authorization is drafted before its Rule 8 Assessment reaches
  "Assessed."
- Every stage's artifact lives at the location convention in §2, above,
  so a future session's `docs/specs/README.md`-first read (per this
  repository's own standing instruction) reliably finds it without a
  separate index.

---

## Governance Notes

- **Revision — Stage 9 detail added (this session).** §2a was added to
  fix the per-checkpoint loop's shape, extracted from Module #20 Phase
  3 Checkpoints 1–4's actual practice (repository verification, Rule 8
  verification, implementation, testing, internal review, completion
  report, merge, next checkpoint). Explicitly not a new stage, not a
  change to §2's eleven stages, §3's lifecycle vocabulary, or §4's
  Non-Negotiable Principles — a detailing of Stage 9 alone, per this
  document's own "Lifecycle of this document itself" note below
  (flagged and explicit, not silent).
- This document does not modify any existing spec, Amendment, POL, ADR,
  Implementation Plan, Rule 8 Assessment, Authorization, or Close-Out
  for Module #19 or Module #20 — it describes the pattern those
  documents already followed; it does not retroactively re-author them.
- This document does not authorize any implementation for Module #21 or
  any future phase of Module #19/#20. It is process infrastructure,
  Stage-agnostic, not itself any module's Stage 1–11.
- **Lifecycle of this document itself:** Designed → **Adopted**. Future
  revisions (a Stage 12 discovered later, a location convention that
  proves wrong in practice) are themselves subject to the same
  discipline — proposed, flagged, and explicitly decided, not silently
  edited.
