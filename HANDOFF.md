# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Architect has shifted process mode: from
spec-writing into **implementation preparation**. Standing direction:
keep strict BDS acceptance, tenant boundary reviews, lifecycle
vocabulary, and no-implementation-before-authorization; but stop
expanding BDS documents unless a real ambiguity exists, produce
**implementation readiness assessments** (Rule 8 feasibility passes)
before any coding, and look for opportunities to automate consistency
checks.

**Latest artifact (most recent):**
`docs/engineering/platform-infrastructure-readiness-assessment.md` —
produced at the Product Architect's explicit request, following the
Module #19 assessment below. Inventories the shared engineering
foundation Phase 4 modules (#19/#20/#18) depend on: Background Worker,
scheduling model, dedupe/watermark retry mechanism, audit integration,
security boundaries, shared-service extraction, Railway deployment
shape — explicitly distinguished from business-module scope.

**Headline finding:** Architecture's own §13.2/§13.3 already places
**Phase 0 (Foundation Hardening) before Phase 1 (Platform Backbone,
which includes the Background Worker)** — no new sequencing answer
needed to be invented, only a check on whether Phase 0 is actually
done. It is not: the `'owner'`→`'admin'` rename is outstanding
(`src/types.ts` and `firestore.rules` both still use `'owner'`), and
no CI secret-scan pipeline exists (no `.github/workflows/`).
Manager-tier migration (Phase 0 item 2) is confirmed done.
**Recommendation: complete outstanding Phase 0 items before Phase 1
begins, per Architecture as written, unless the Product Architect
deliberately grants a stated sequencing exception** — flagged as the
one genuinely Product-Architect-level decision in the document;
everything else in it is engineering-planning detail. Nothing was
built or changed to produce this finding — read-only analysis against
`src/`, `firestore.rules`, and `.github/`.

**Prior artifact (same session, earlier):**
`docs/engineering/19-subscriptions-implementation-readiness.md` (v2) —
restructured per the Product Architect's own template: scope split
into Core Subscription Domain vs. Commercial Integration, files/systems
affected, dependency analysis vs. #17/#20/#18 (net result: #19 is
upstream of all three, no conflicts), open decisions split
blocking/configurable, targeted risk assessment, and phase-only
proposed sequencing. Key findings carried forward: Background Worker
confirmed 0% built (elaborated on by the newer Platform Infrastructure
assessment above); Registration (`AuthView.tsx`) is a non-atomic
3-step client write today, a pre-existing gap Module #19's
never-null-subscription rule would make worse if not explicitly
addressed in planning.

**Neither assessment authorizes implementation of anything.** No
`src/`, `server/`, `firestore.rules`, `docs/specs/*`, or
`docs/architecture/*` file has been touched this session — confirmed
by diff. Both new documents live under `docs/engineering/` only.

**Module status (all confirmed unchanged this session — see
`docs/specs/README.md` for full detail, this is a pointer, not a
restatement):** Modules #17, #18, #19, and #20 are all
Accepted/Approved (docs & business rules) — none has implementation
authorization. Build order: `#19 → #20 → #18`; #18's own BDS
additionally gates its runtime implementation on #19/#20 holding real
data. Module #15 (AI Intelligence) remains drafted, not implemented.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Do not begin #17, #18, #19, or #20
implementation, schema, or `firestore.rules` work — not authorized.
Per this session's Platform Infrastructure finding, also hold off on
Background Worker implementation before Phase 0 completion (or an
explicit, stated Product Architect exception) — see above.

**Known gaps flagged but not yet scheduled:**
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `clearAllData` no longer removes Closings (they can no longer be
  deleted at all) — flagged for a product decision on whether its copy
  should change, not yet decided.
- The tenant-isolation audit findings document notes its own evidence
  is based on operator-reported terminal output/screenshot, not a
  full attached raw log file — a nice-to-have follow-up, not a
  blocker, per that document's own Section 6/Appendix A.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
