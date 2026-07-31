# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Architect has shifted process mode this session:
from spec-writing into **implementation preparation**. Standing
direction going forward: keep strict BDS acceptance, tenant boundary
reviews, lifecycle vocabulary, and no-implementation-before-
authorization; but stop expanding BDS documents unless a real ambiguity
exists, produce **implementation readiness assessments** (Rule 8
feasibility passes) before any coding, and look for opportunities to
automate consistency checks.

First action under this new mode: a documentation-analysis-only Rule 8
feasibility pass for **Module #19 (Subscriptions)**, since restructured
(same session) to the Product Architect's own explicit template —
scope split into Core Subscription Domain (A) vs. Commercial
Integration (B), files/systems affected, a dependency analysis against
#17/#20/#18, open decisions split into blocking vs. configurable, a
targeted risk assessment (tenant isolation, ownership boundaries, trial
migration, entitlement mistakes, payment boundary, auditability), and
proposed phase-only sequencing (no dates, no authorization implied).
Written up as `docs/engineering/19-subscriptions-implementation-readiness.md`
(v2 supersedes v1 in place — same file, following the precedent set by
`17-owner-portfolio-feasibility-note.md`). Key findings unchanged from
v1 and confirmed again: the Background Worker (Architecture §4.8) is
0% built — no second process, no cron, no Procfile exist in the repo;
it is shared infrastructure across #19 and #20, not #19-exclusive.
Registration (`AuthView.tsx`) is a non-atomic 3-step client write
today — a pre-existing gap this module's Business Rule 4 would make
worse if not explicitly addressed in planning. Dependency analysis:
#19 is upstream of #17, #18, and #20 — all three only read/react to
#19's state, none redefine it; no conflicts found. Core Subscription
Domain (data model, trial-at-Registration, entitlement framework,
SuperAdmin override) has no payment-provider dependency and is
technically sequenceable as Phase 1 independent of the four open
items; Commercial Integration (Phases 3) remains genuinely blocked.
**This assessment is informational only — it does not authorize
implementation of Module #19 or any part of it, and explicitly
recommends none at this time.**

**Prior status (unchanged this session):** Module #18 (SuperAdmin)
received Product Architect **Acceptance** last session.
`docs/specs/18-superadmin.md` is now **✅ Accepted — documentation &
business rules; implementation not authorized**, matching the pattern
of Module #17, Module #19, and Module #20. This followed a
documentation-analysis readiness review that checked the BDS against
Module #17's, #19's, and #20's Accepted rules, the SuperAdmin
architecture sections, the tenant isolation principle, audit
requirements, and the platform-aggregate boundary, and found no
contradictions.

Acceptance scope, per the BDS's own "Product Architect Acceptance"
section: business specification (the twelve 9.1–9.12 screens/
capabilities), domain rules (the three never-conflated access
patterns; feature flags as rollout pacing only; soft-suspend vs.
hard-purge as separate paths), security boundaries
(`platform_operators/{uid}` structurally separate from `users/{uid}`,
every privileged write server-verified), dependency definitions
(`businessId`-keyed subscription integration matching Module #19;
aggregate-only notification consumption matching Module #20), and
audit requirements (every privileged write logged; a subscription
override structurally incapable of writing without a same-transaction
audit entry).

**Documentation synchronization performed this session (docs only):**
- `docs/specs/18-superadmin.md` — status line flipped to Accepted;
  obsolete "⚠️ Sequencing note for the record" (the old `#17→#18→#19→
  #20` vs. `#19→#20→#18` tension, already resolved before this session)
  replaced with this module's own settled dependency statement: **#19
  and #20 must be implemented and provide real data before #18 runtime
  implementation begins**; matching reference removed from "Out of
  Scope"; a full "Product Architect Acceptance" section added,
  replacing the old "Awaiting approval" closing line.
- `docs/specs/README.md` — Phase 4 table flips #18 to Accepted; a new
  Module #18 note added; the build-order note updated to state all
  four Phase 4 modules (#17, #18, #19, #20) are now Accepted/Approved
  at the documentation stage, none with implementation authorization.
- `HANDOFF.md` — this section.

**Not done this session, per explicit instruction:** no implementation,
no code, no `firestore.rules`, no schema, no migration, no collection
created. `src/`, `server/`, `firestore.rules`, and `docs/architecture/*`
were not touched — confirmed untouched by this session's diff.

**Build order (confirmed, unchanged):**

```
#19 Subscriptions → #20 Notifications → #18 SuperAdmin
```

Module numbering is not dependency ordering. **Module #17, #19, #20,
and #18 are now all Accepted/Approved** at the documentation &
business-rules stage. None has implementation authorization. #18's
own BDS additionally states its runtime implementation cannot begin
until #19 and #20 are themselves implemented and hold real data
(Architecture §13.2/13.6) — Acceptance of all three specs does not
change that sequencing, and does not by itself authorize implementation
planning for any of them; each remains a separate, explicit Product
Architect go-ahead per Rule 8.

**Prior status (unchanged this session):** PR-001/PR-002 remain closed.
The Firestore tenant-isolation test suite (16 `describe` blocks, added
in `493c585`) has been **executed** against a real Firebase Rules
Emulator: 47/47 tests passed, 0 failures, exit code 0. Results in
`docs/security/firestore-tenant-isolation-audit-findings.md` (commits
`cfd1af6`, `5f161a5`, `bd5229b`), reviewed and marked **Analyzed** by
the Product Architect — `Accepted` is a separate, explicit decision not
granted by this note; check that file's own Section 5 lifecycle table.

Module #17 (Owner Portfolio) remains **Accepted (docs & business
rules)** — unchanged, implementation not authorized.

Module #18 (SuperAdmin) — BDS spec (`docs/specs/18-superadmin.md`) is
now **Accepted (docs & business rules)**, per this session's recording
above. Still genuinely greenfield in code — no implementation, no
`firestore.rules`, no schema exists for it, and none is authorized by
this Acceptance. Its runtime implementation remains gated on #19 and
#20 holding real data (Architecture §13.2/13.6), independent of any
module's own Acceptance status.

Module #15 (AI Intelligence) remains drafted but deliberately not
implemented — blocked on Background Worker, SuperAdmin Feature Flags,
Subscriptions, and Notifications, none of which exist in code yet.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Modules #17, #18, #19, and #20 are all
Accepted/Approved (docs & business rules) — none has implementation
authorization. Do not begin #17, #18, #19, or #20 implementation,
schema, or `firestore.rules` work in the meantime; that authorization
has not been given for any of them.

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
