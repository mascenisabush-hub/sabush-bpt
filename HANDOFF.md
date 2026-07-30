# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Firestore rules-unit-testing suite for the Closing Integrity
Amendment written, typechecked, and smoke-tested (harness runs cleanly;
actual rule assertions require a live emulator — see below). About to be
committed and pushed. Modules #17 (Multi-Shop) and #18 (SuperAdmin)
unchanged — still drafted, awaiting approval.

**Last completed:** `tests/firestore-rules.test.ts` — covers every
scenario the Product Architect review asked to verify: Owner/Manager/
Staff × create/edit/delete × open/closed period on `expenses` and
`withdrawals`; the `closings`/`closedPeriods` create-vs-reopen permission
split; tenant isolation on the touched collections; and the full
historical workflow (Closing A → reopen → new Expense → Closing B),
asserting Closing A's frozen totals survive untouched and a
still-active period can't be double-locked. Uses Node's built-in test
runner (`node:test`) + `@firebase/rules-unit-testing`, both added as
devDependencies, plus `firebase-tools` for emulator orchestration.
`npm run test:rules:emulator` runs it end-to-end (starts the emulator via
`firebase-tools`, runs the suite, tears down).

**This could not be executed end-to-end from this sandbox** — network
egress here is allow-listed (npm/github/pypi/crates.io/ubuntu archives
only) and doesn't reach Google's emulator-binary infrastructure. What
*was* verified here: the suite typechecks cleanly (`tsc --noEmit -p .`),
and a smoke run (`npx tsx --test tests/firestore-rules.test.ts`) confirms
the harness itself loads and runs without any syntax/import errors — it
fails only at the expected point (`initializeTestEnvironment`'s fetch to
`localhost:8080`, "fetch failed" — no emulator listening), which is
exactly the missing-emulator symptom, not a bug. **Running
`npm run test:rules:emulator` for real, in an environment with open
network access, is still the actual acceptance gate before deploying
these rules to production — this has not yet happened.**

**Files touched:** `tests/firestore-rules.test.ts` (new), `firebase.json`
(added `emulators.firestore.port: 8080`), `package.json` (new
devDependencies `@firebase/rules-unit-testing` + `firebase-tools`, new
scripts `test:rules`/`test:rules:emulator`).

**Next up:** Run `npm run test:rules:emulator` somewhere with real network
access and fix whatever it finds — treat a clean pass as the actual
signal the Closing Integrity Amendment's rules are production-ready, not
this suite's mere existence. After that, the Product Architect's
remaining suggested priorities were: audit `addQuebra` and similar async
paths for the same missing-`await` bug found in `addExpense`/
`addWithdrawal`; a broader Firestore tenant-isolation/security audit
beyond Closing Integrity; then return to Module #17 (spec currently
titled "Multi-Shop" in this repo — flagged a naming discrepancy with the
Architect's "Owner Portfolio," unresolved) only once its spec is
approved.

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
- `AddQuebraView.tsx`'s submit handler was not checked/fixed for the same
  missing-`await` bug found in `AddExpenseView`/`AddWithdrawalView` last
  session — Quebras aren't governed by the Closing Integrity Amendment,
  so this was out of scope there. The Product Architect explicitly named
  this as the next follow-up item.
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
