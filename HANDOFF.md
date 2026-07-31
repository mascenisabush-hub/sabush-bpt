# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Architect Accepted Stage 2 is pending review (no
Acceptance recorded yet for Stage 2) and, before authorizing Stage 3
implementation, requested a dedicated migration execution plan for the
backfill step. Stage 3 implementation is explicitly **not** authorized
yet — this session produced only the planning document requested.

**Latest artifact:**
`docs/engineering/phase0-stage3-backfill-migration-execution-plan.md`
— expands Stage 3's one-paragraph description into: migration method
(standalone Admin SDK script reusing `server/index.ts`'s existing
service-account credential pattern, not Cloud Functions, not a new
batch framework), idempotency (query-shape-guaranteed — the migration
only ever selects `role == 'owner'` documents, so a second run is a
natural no-op), progress logging (operational script logging only —
explicitly recommends **against** writing to a platform audit-log
collection, since `platform_audit_log` doesn't exist in code yet and
Module #18 is docs-stage only; flagged as an open question for the
Product Architect rather than decided unilaterally), rollback strategy
(symmetric and safe throughout Stages 1–5, genuinely unsafe only after
Stage 6 closes the compatibility window), partial-failure handling
(idempotent re-run covers both batch-level and document-level
failures; no partial failure ever leaves an account non-functional
because Stage 1's dual-read tolerance covers every intermediate
state), post-migration verification queries (completeness check,
non-corruption spot-check, functional check), and a production
rollout procedure (dry run, pre-migration count, low-traffic window,
completeness gate before Stage 4, observation period before Stage 6).

**One open question flagged, not resolved:** whether a permanent
per-document platform audit-log entry is required for this migration,
beyond operational script logging. Raised for explicit Product
Architect decision before Stage 3 implementation, not assumed either
way.

**Nothing implemented.** No `src/`, `server/`, `firestore.rules`, or
`docs/specs/*` file touched — this document lives under
`docs/engineering/` only.

**Awaiting:** Product Architect review of this plan, and separately,
explicit authorization before Stage 3 implementation (the actual
migration script) begins.

---

**Prior status (superseded above, kept for continuity):** Product
Architect Accepted Stage 1 and authorized Stage 2 only. Stage 2
(`e10dede`) implemented and reached Analyzed — new self-registrations
now persist `role: 'admin'` in both write paths (`AuthView.tsx`); no
other file changed; `tsc --noEmit`/`npm run build` clean;
`npm run test:rules` and a live registration smoke test both
Execution-blocked-by-environment (Firestore emulator unreachable in
this sandbox — network egress allowlist excludes
`storage.googleapis.com`).

**Latest artifact (most recent):**
`docs/engineering/phase0-owner-admin-migration-implementation-plan.md`
— a Stage 1–6 execution plan for the `owner`→`admin` rename (dual-read
rules → new-write path → backfill → identifier rename → full
verification → close the compatibility window), each stage with its
own commit boundary, verification checkpoint, rollback path, and
acceptance criteria. This is a plan document, not code — it does not
begin Stage 1 and does not itself authorize starting Phase 0A.

**Scope decisions this session (Product Architect, now settled, not
open):** rename boundary is limited to technical-authorization
identifiers (`UserRole`, `isOwnerOf`, `isOwnerOrGrantedManager`,
`ownedBusinessIds`, `isOwner`, related internal identifiers, i18n
**key names** only, test constants) — explicitly **excludes**
`ownerUid` (business-ownership field, different domain) and all
user-facing "Owner" product terminology (Owner Withdrawals, Owner
Portfolio, translated label values). Dual-read migration strategy is
adopted as the required implementation approach. Module #18's
dependency on this rename reclassified from "unaffected" to **low
dependency** (a future Support Session/impersonation feature may rely
on the renamed role model; not blocking).

**Prior artifacts (same session, earlier, unchanged):**
`docs/engineering/platform-infrastructure-readiness-assessment.md` —
Background Worker confirmed 0% built; no CI secret-scan pipeline
exists; Manager-tier migration confirmed done.
`docs/engineering/19-subscriptions-implementation-readiness.md` (v2) —
scope split, dependency analysis, Registration's non-atomic write path
flagged.

**Nothing has been implemented.** No `src/`, `server/`,
`firestore.rules`, `docs/specs/*`, or `docs/architecture/*` file has
been touched this session — confirmed by diff. All new artifacts live
under `docs/engineering/` only. Starting Stage 1 of the plan above
still requires a separate, explicit Product Architect go-ahead.

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
