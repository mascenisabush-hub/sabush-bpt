# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Idle — nothing in progress. Safe to start any new module.

**Last completed:** Module #16 (Staff & Roles) — spec approved and fully
implemented (types, firestore.rules, server/index.ts, AppContext.tsx,
SettingsModal.tsx, Header.tsx). Commit `bccbd1a`. Verified with
`tsc --noEmit` and a full `npm run build` before pushing.

**Next up:** Module #17 (Multi-Shop) — status "Not started" in
`docs/specs/README.md`. No BDS spec exists yet; per the process in
`CLAUDE.md`, that has to be drafted and approved before any
implementation starts.

**Anything mid-flight / blocked:** Nothing. No open PRs, no half-finished
edits, no pending decisions waiting on the PM.

**Known gaps flagged but not yet scheduled:**
- Rules-emulator verification for the Module #16 firestore.rules changes
  was flagged as a manual step (no Firestore emulator available in the
  sandbox that built it) — worth a real test pass before this matters in
  production.
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
