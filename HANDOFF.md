# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Closing Integrity Amendment v1.0 implementation is complete,
typechecked (`tsc --noEmit`), and built (`npm run build`) successfully.
About to be committed and pushed. Modules #17 (Multi-Shop) and #18
(SuperAdmin) are unchanged from before — still drafted, awaiting
approval, not touched this session.

**Last completed:** Closing Integrity Amendment v1.0 (governs
Expense/Withdrawal integrity around Monthly/Yearly Closings — specs #8,
#9, #11). Three Rule 8 decisions were made and implemented: lock
mechanism = Option B (`closingId`/`lockedAt` fields + a `ClosedPeriod`
lock-index collection, since Firestore rules can't run range queries);
historical closings = backfill (`backfillClosingLocks()`, idempotent,
Owner-only, exposed in Settings); reopening = built now (Owner-only,
logged, supersedes the Closing in place rather than deleting it).
Full detail, including one gap found and fixed mid-implementation (a
Manager could previously delete/reopen any Closing — the `closings`
Firestore rule now splits create from update/delete) and one
product-facing behavior change flagged for a deliberate decision
(`clearAllData` no longer removes Closings, since they can no longer be
deleted at all) is in
`docs/specs/08-09-11-closing-integrity-amendment.md`'s "Implementation
status" section — read that before touching this area again.

**Files touched:** `src/types.ts`, `src/context/AppContext.tsx`,
`src/components/timeline/timelineHelpers.ts`, `src/components/ClosingView.tsx`,
`src/components/AddExpenseView.tsx`, `src/components/AddWithdrawalView.tsx`,
`src/components/reports/ExpenseReport.tsx`,
`src/components/reports/WithdrawalReport.tsx`,
`src/components/SettingsModal.tsx`, `firestore.rules`,
`src/i18n/locales/{en,fr,pt}.ts` (new `reports.common.locked` key),
`docs/specs/08-09-11-closing-integrity-amendment.md`.

**A real bug found and fixed along the way, not part of the original
plan:** `addExpense`/`addWithdrawal` were being called without `await`
in their respective Add*View forms — a rejected promise (e.g. the new
closed-period check) was silently swallowed and the UI showed "success"
regardless. Both views are now properly async/awaited/caught.

**Next up:** Module #17 (Multi-Shop) — BDS spec drafted
(`docs/specs/17-multi-shop.md`), documenting the module's substantially
already-implemented state (`ShopSwitcher.tsx`, `addShop`/`switchShop` in
`AppContext.tsx`, `firestore.rules` enforcement) plus one flagged gap
(no shop-removal/archival flow) and one real i18n gap (`ShopSwitcher`'s
hardcoded Portuguese strings). Awaiting explicit approval before any
implementation begins.

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

**Anything mid-flight / blocked:** Nothing once this session's commit
lands. No open PRs, no half-finished edits, no pending decisions waiting
on the PM beyond the `clearAllData` copy question flagged above.

**Known gaps flagged but not yet scheduled:**
- Rules-emulator verification for **both** the Module #16 firestore.rules
  changes and this session's Closing Integrity Amendment rules changes
  was flagged as a manual step (no Firestore emulator available in the
  sandbox that built either) — worth a real test pass before either
  matters in production. The amendment's rules are more consequential
  to verify given they gate financial-record deletion.
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `AddQuebraView.tsx`'s submit handler was not checked/fixed for the same
  missing-`await` bug found in `AddExpenseView`/`AddWithdrawalView` this
  session — Quebras aren't governed by the Closing Integrity Amendment,
  so this was out of scope here, but it's the same bug shape and worth a
  dedicated look.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
