# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Product Architect authorized Phase 0 **Stage 1 only** of
`docs/engineering/phase0-owner-admin-migration-implementation-plan.md`.
Stage 1 has been implemented, verified where the environment allows,
and has reached lifecycle stage **Analyzed** — not Accepted. Execution
stopped here as instructed; Stage 2 has not begun and is not
authorized.

**Latest commit:** `699ab48` — "Phase 0 Stage 1: dual-read owner/admin
tolerance in firestore.rules". Widens every `role == 'owner'` check in
`firestore.rules` (`isOwnerOf`, the `users/{userId}` read/create rules,
and the `businessIds`-growth check) to also accept `'admin'`. No
identifier renamed, no write path changed, no backfill run, no
business rule or user-facing behavior change for any existing account.
Adds a purely additive test suite proving `'admin'`-valued profiles
pass identically to `'owner'`-valued ones. `tsc --noEmit` and
`npm run build` both clean; `npm run test:rules` could not run
end-to-end in this sandbox — the Firestore emulator binary download is
blocked by the network egress allowlist (`storage.googleapis.com` not
permitted), confirmed by a direct emulator-start attempt. This is an
environment limitation, not a validation failure — see the full report
delivered with this commit for details.

**One deviation flagged for Product Architect review:** the plan's own
Stage 1 text named only `isOwnerOf` and "the profile-read/create
rules" as in scope. A fourth `role == 'owner'` check exists inside the
`users/{userId}` update rule's `isValidBusinessIdsChange()` helper
(gates multi-shop growth) — it was included in this stage's tolerance
widening because leaving it `'owner'`-only would have reintroduced the
exact partial-migration lockout risk Stage 1 exists to prevent once an
account is actually backfilled to `'admin'` in Stage 3. Flagged, not
silently decided — awaiting explicit confirmation this reading is
correct before Stage 2 begins.

**Awaiting:** explicit Product Architect review and authorization
before Stage 2 (new-write path in `AuthView.tsx`) begins.

---

**Prior status (superseded above, kept for continuity):** Product
Architect had moved from implementation-readiness review into **Phase
0 execution planning**, specifically for the `owner`→`admin`
migration. Standing direction unchanged: strict BDS acceptance, tenant
boundary reviews, lifecycle vocabulary, and
no-implementation-before-authorization remain in force.

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
