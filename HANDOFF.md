# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Fixed the missing-`await` bug in `AddQuebraView.tsx` (same
class of bug previously found/fixed in `AddExpenseView`/
`AddWithdrawalView`) — this was the Product Architect's top-named
follow-up item from last session. Typechecks cleanly. About to be
committed and pushed. Modules #17 (Multi-Shop) and #18 (SuperAdmin)
unchanged — still drafted, awaiting approval. The Firestore
rules-unit-testing suite from the prior session (`tests/firestore-rules.test.ts`)
is committed but **still not run against a live emulator** — that remains
open, see below.

**Last completed:** `AddQuebraView.tsx`'s `handleSubmit` was calling
`addQuebra(...)` (an async function that can reject — missing
`activeBusinessId`, or a Firestore `setDoc`/timeline-log failure) without
`await`, so a rejected write was silently swallowed and the UI showed
"Quebra registered" success even when nothing was saved. Fixed to match
the established `AddExpenseView`/`AddWithdrawalView` pattern: `handleSubmit`
is now `async`, awaits `addQuebra`, wraps it in `try/catch/finally`, shows
a user-visible `alert` on failure, and adds an `isSaving` state that
disables the submit button mid-flight. No business-rule change — Quebras
remain explicitly out of scope for the Closing Integrity Amendment
(no closed-period check was added). Grounds: BDS #07 (Breakages) already
requires "no silent-failure" writes/deletes and a user-visible error on
backend rejection.

**Files touched:** `src/components/AddQuebraView.tsx` only.

**Next up:** (1) Run `npm run test:rules:emulator` somewhere with real
network access and fix whatever it finds — treat a clean pass as the
actual signal the Closing Integrity Amendment's rules are
production-ready; this still hasn't happened (blocked in this sandbox —
egress is allow-listed to npm/github/pypi/crates.io/ubuntu archives only,
doesn't reach Google's emulator-binary infra). (2) A broader Firestore
tenant-isolation/security audit beyond Closing Integrity. (3) Return to
Module #17 (spec currently titled "Multi-Shop" in this repo — flagged
naming discrepancy with the Architect's "Owner Portfolio," unresolved)
only once its spec is approved.

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

**Anything mid-flight / blocked:** The emulator test run itself is
blocked on network access this sandbox doesn't have — everything else is
clean. No open PRs, no half-finished edits.

**Known gaps flagged but not yet scheduled:**
- Actually running `npm run test:rules:emulator` (see above) — the single
  highest-priority item right now.
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `clearAllData` no longer removes Closings (they can no longer be
  deleted at all) — flagged for a product decision on whether its copy
  should change, not yet decided.
- Module #17's name: this repo's spec/README call it "Multi-Shop"; the
  Product Architect's review referred to it as "Owner Portfolio." Not
  reconciled — worth a quick confirmation before that module is next.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
