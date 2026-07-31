# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** PR-001/PR-002 remain closed. The Firestore tenant-isolation
test suite (16 `describe` blocks, added in `493c585`) has now actually
been **executed** against a real Firebase Rules Emulator — not just
typechecked — in a local environment with working Java + Firebase CLI:
47/47 tests passed, 0 failures, exit code 0. Results are written up in
`docs/security/firestore-tenant-isolation-audit-findings.md`
(commits `cfd1af6`, `5f161a5`, `bd5229b`), which the Product Architect
has reviewed and marked **Analyzed**. `Accepted` is a separate, explicit
decision the findings document itself does not self-grant — check that
file's own Section 5 lifecycle table for its current value rather than
assuming it here.

Separately, `docs/engineering/17-owner-portfolio-feasibility-note.md`
(`57ffea7`) is now on `main`: engineering discovery only, no
implementation. It confirms the existing multi-business ownership code
(`businessIds[]`, `activeBusinessId`, `addShop()`, `ShopSwitcher.tsx`)
is a working foundation, maps where Business Worth is currently
computed (live, per-active-business, in `AppContext.tsx` — no stored
"current worth" field exists), and flags the hardcoded
`MAX_SHOPS_PER_OWNER = 10` cap as something the BDS should address
explicitly rather than leave implicit.

**Module #17 naming:** the Product Architect has decided the direction
is **Owner Portfolio**, not the existing `docs/specs/17-multi-shop.md`
draft — Business stays the tenant boundary, Portfolio is a read-only
aggregation layer with no new writes and no rule changes. That
direction decision is made; **the actual BDS superseding the Multi-Shop
draft has not been written yet.** Module #17 remains Drafted until it
is.

**Files touched since `493c585`:** all documentation —
`docs/security/firestore-tenant-isolation-audit-findings.md`,
`docs/engineering/17-owner-portfolio-feasibility-note.md`. No source
code changed.

**Next up:** (1) Write the Owner Portfolio BDS (superseding
`docs/specs/17-multi-shop.md`), incorporating the feasibility note's
findings — in particular, an explicit decision on live vs. cached
aggregation for the portfolio dashboard, and whether
`MAX_SHOPS_PER_OWNER` needs to change. (2) Get that BDS to Accepted
before any implementation starts. Modules #18/#19/#20 unchanged, still
blocked as documented below.

Module #18 (SuperAdmin) — BDS spec drafted (`docs/specs/18-superadmin.md`),
grounded in `docs/architecture/09-superadmin-architecture.md`. Genuinely
greenfield — confirmed by search, zero SuperAdmin/platform-scoped code
exists anywhere in `src/`, `server/`, or `firestore.rules`. **Awaiting
architectural approval before any implementation begins.**

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

**Anything mid-flight / blocked:** Nothing blocked at the repository
level. The Owner Portfolio BDS has not been started as of this file's
last update.

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
