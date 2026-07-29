# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Two specs drafted, awaiting approval. No implementation
started on either.

**Last completed:** Module #16 (Staff & Roles) — spec approved and fully
implemented (types, firestore.rules, server/index.ts, AppContext.tsx,
SettingsModal.tsx, Header.tsx). Commit `bccbd1a`. Verified with
`tsc --noEmit` and a full `npm run build` before pushing.

**Next up:** Module #17 (Multi-Shop) — BDS spec drafted
(`docs/specs/17-multi-shop.md`), documenting the module's substantially
already-implemented state (`ShopSwitcher.tsx`, `addShop`/`switchShop` in
`AppContext.tsx`, `firestore.rules` enforcement) plus one flagged gap
(no shop-removal/archival flow) and one real i18n gap (`ShopSwitcher`'s
hardcoded Portuguese strings). Awaiting explicit approval before any
implementation begins.

Module #18 (SuperAdmin) — BDS spec now drafted (`docs/specs/18-superadmin.md`),
grounded in `docs/architecture/09-superadmin-architecture.md`. This is
genuinely greenfield — confirmed by search, zero SuperAdmin/platform-
scoped code exists anywhere in `src/`, `server/`, or `firestore.rules`.
**Awaiting architectural approval before any implementation begins** —
per explicit instruction, no code, Firestore Rules, or schema was
touched while drafting this spec.

**Flagged discrepancy (needs a PM decision, not an engineering one):**
a prior version of this file stated a "confirmed build order" of
`#17 → #18 (SuperAdmin) → #19 (Subscriptions) → #20 (Notifications)`.
That order directly contradicts Architecture Development Strategy
13.2 (rule 1) and 13.6, both of which state Phase 2 (SuperAdmin)
is *blocked on* Phase 1 (Subscriptions, Notifications) already holding
real data — specifically because SuperAdmin's own Subscriptions &
Billing (9.4) and platform-side Notifications (9.9) screens are
designed to read those collections, not mock them. The spec for #18 is
drafted regardless, since drafting a design document has no such
dependency — but **Phase 2 implementation of #18 should not begin
before #19 and #20 have real data**, regardless of numbering order.
This is noted in `docs/specs/18-superadmin.md` itself and repeated here
so it isn't missed in a quick read.

Module #15 (AI Intelligence) remains drafted but deliberately not
implemented — blocked on Background Worker, SuperAdmin Feature Flags,
Subscriptions, and Notifications, none of which exist yet.

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
