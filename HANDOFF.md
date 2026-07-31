# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Architect has reviewed and approved the Stage 3
execution plan document (method, idempotency, partial-failure
handling, rollback, verification, and rollout procedure all approved
as written). Two outcomes from that review, both now incorporated into
the plan: the audit-log open question is resolved (no platform
audit-log dependency for this one-time migration — operational logging
only, with a specified minimum field set), and a required addition
(dry-run mode, `--dry-run`) has been designed and wired into the
rollout procedure. **Stage 3 implementation is still explicitly not
authorized** — the review approved the plan document, not the start of
coding, per the reviewer's own explicit statement.

**Latest artifact (updated this session):**
`docs/engineering/phase0-stage3-backfill-migration-execution-plan.md`
— now includes §11 (Dry-Run Mode: `--dry-run` performs the read query
and reports count/sample ids with zero writes; a second invocation
performs the real migration), an updated §4 recording the Product
Architect's audit-log decision and the specific fields the operational
log must capture (timestamp, script Git commit, operator, scanned/
migrated/failed counts, rerun count), and an updated §9 rollout
procedure with the dry-run step inserted immediately before the write
run.

**Nothing implemented.** No `src/`, `server/`, `firestore.rules`, or
`docs/specs/*` file touched this session — only the Stage 3 plan
document and this file, both under docs.

**Awaiting:** explicit, separate Product Architect authorization before
Stage 3 implementation (the actual migration script, including
`--dry-run`) begins.

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
