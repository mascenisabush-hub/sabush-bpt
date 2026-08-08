# Module #19 (Subscriptions) — V1 Completion Review & Release Readiness Audit

**Type:** Project record — a review and audit, not a governance document.
Does not itself approve, authorize, or change any BDS, BDR, POL, ADR,
or plan. Produces a definitive list of genuine release blockers versus
already-solved ground, per explicit instruction: **no code changes**
in this document's production.
**Basis:** Direct inspection of the repository at `main` HEAD `3960768`
(fresh `git fetch`, confirmed clean, at the start of this audit) —
every claim below is grounded in a specific file, line, or test run
performed during this audit, not assumed from any prior session's own
summary of itself.

---

## 1. Module #19 Completion Review

### 1a. Phase and Engine Status

| Component | Status | Evidence |
|---|---|---|
| Phase 1 (Foundations) | ✅ Implemented & closed | `19-milestone-review-phases-1-2.md` |
| Phase 2 (Trial Engine) | ✅ Implemented & closed | Same |
| V1 Subscription Lifecycle Engine | ✅ Implemented & tested | `server/subscriptionEngine.ts`, `tests/subscription-engine.test.ts` — 27/27 passing, re-run fresh this audit |
| PaySuite Payment Adapter | ⏳ Not started, correctly blocked | No PaySuite reference anywhere in `server/` or `src/` — confirmed by direct grep, fresh this audit |

### 1b. All Seven Governed Transitions — Confirmed Tested

Re-verified by running `tests/subscription-engine.test.ts` fresh during
this audit (not assumed from the prior session's own claim):

```
# tests 27
# suites 8
# pass 27
# fail 0
```

Every transition in the Implementation Authorization's own table has
at least one direct test, plus explicit coverage of every
**explicitly-unhandled** case (trial_pending/trial_active + any event),
duplicate/out-of-order events, tenant isolation, and historical-data
preservation (a reversal touches only
`status`/`gracePeriodEndsAt`/`renewalDate`/`updatedAt`, nothing else).

### 1c. Governance Internal Consistency — POL-19-001 through POL-19-013

All eleven existing POL-19-* files confirmed `Approved` (direct grep,
fresh):

```
POL-19-001 through POL-19-008 — Approved
POL-19-010 — Approved (Edge Case A superseded by POL-19-013, pointer present)
POL-19-011 — Approved
POL-19-013 — Approved
```

POL-19-009 (Early Renewal During Trial) and POL-19-012
(Business-Lifecycle/Subscription-Status Interaction) remain correctly
**reserved, not drafted** — confirmed absent as files, matching the
Numbering Ledger's own canonical mapping. No contradiction found across
any pair of these documents during this review — POL-19-013's
supersession of POL-19-010's Edge Case A is the only case where two
documents govern overlapping ground, and it is explicitly, cleanly
resolved (a pointer in POL-19-010 directs to POL-19-013, POL-19-010's
own text is preserved unedited).

### 1d. The Remaining V1 Blocker, Stated Precisely

**Confirmed: the only remaining piece of engineering work required to
reach a working V1 payment path is connecting a verified payment
event to `applyLifecycleEvent()`.** The lifecycle logic itself is
complete and tested. This is not a re-statement of the prior session's
own conclusion — it is independently re-confirmed here by direct
inspection of the actual code and test results.

However, this review found **the payment adapter is not the only thing
standing between the current state and real customers** — see §2 and
§3 below, which surface genuine gaps outside the Engine/Adapter
boundary entirely.

---

## 2. Customer-Facing Release Experience Audit

Walked the exact sequence a real business owner would experience, per
instruction, checking actual code at each step — not assumed from
design intent.

| Step | Status | Finding |
|---|---|---|
| Signup / business creation | ✅ Works | `AppContext.tsx`'s registration path atomically creates the user profile, business, and initial `trial_pending` subscription (Business Rule 4) |
| Trial activation | ✅ Works | `POST /api/subscriptions/activate-trial`, fires on first value-creating write |
| Dashboard / daily operations | ✅ Works | Unrelated to subscription state; extensively covered by Module #1-#10's own closed specs |
| **Trial status visibility** | ❌ **Does not exist** | See §2a below |
| **What the owner sees approaching expiry** | ❌ **Does not exist in-app**; ⚠️ exists as a notification, but see §2b | See §2a/§2b |
| **What happens when trial expires** | ⚠️ **Works, but confusingly** | See §2c |
| **How they are instructed to pay** | ❌ **Does not exist** | See §2d |
| **What happens after payment** | ⏳ Blocked on Adapter | Correctly deferred |
| **What happens during grace** | ⚠️ **Same confusion as §2c** | See §2c |
| **What happens after expiry** | ⚠️ **Same confusion as §2c** | See §2c |

### 2a. There is no client-side visibility of subscription status at all

Confirmed by direct inspection of `src/context/AppContext.tsx`: **the
client never reads the `subscriptions/{businessId}` document.** No
`onSnapshot` listener, no state variable, nothing exposed via the
context. Confirmed by grep: no component (`Header.tsx`,
`DashboardView.tsx`, `App.tsx`) references `trialEndsAt`,
`gracePeriodEndsAt`, or subscription status in any form — the one
match found (`AuthView.tsx`) is a comment about atomic creation during
signup, not a rendered UI element.

**This is not a Security Rules gap** — `firestore.rules`'
`/subscriptions/{subscriptionId}` block already permits Owner and
Manager-tier Staff to read it (`allow read: if isOwnerOf(...) ||
(isMemberOf(...) && staffTier == 'manager')`). The data is readable
today; nothing renders it.

**Consequence:** an Owner currently has **no way, anywhere in the
product, to see how many days remain in their trial**, whether they've
entered Grace Period, or that they're `expired` — except by noticing
that a write silently fails (§2c).

### 2b. Trial-ending notifications exist; nothing else in the subscription lifecycle does

Module #20 Phase 3 implements exactly two subscription-related
eventTypes: `trial.ending_soon` (T-7) and `trial.ending_tomorrow`
(T-1) — confirmed by direct grep across `server/*.ts`. **No
notification exists for:** payment confirmed/activated, entering Grace
Period, Grace Period ending soon, or Subscription Expired. POL-19-008
(Subscription Notification Policy) sets business principles for the
*entire* subscription lifecycle ("Communication should be timely...
understandable by non-technical business owners") — the actual
implemented coverage is narrower than the policy it's meant to satisfy.
This is a real gap between an Approved policy's scope and what
Module #20 actually built, not a contradiction between two governance
documents — Module #20's own Phase 3 Authorization correctly scoped
only the three BDR-0007 producers that existed when it was written;
subscription-lifecycle notifications beyond trial were never in that
authorization's scope to begin with.

### 2c. A blocked write shows a raw, unexplained technical error

Confirmed in `src/components/AddStockView.tsx` (and, by the same
pattern, every other entry-form component in this codebase): a
`Firestore permission-denied` error from `subscriptionAllowsNewRecords()`
returning `false` (trial_completed or expired) is caught generically
and shown via `alert(err?.message || 'Erro ao registar...')` — the
raw Firebase SDK error message (something like "Missing or
insufficient permissions"), not a business-meaningful explanation.

**A real shop owner whose trial just ended would see a confusing,
unexplained technical error with zero guidance**, the first time they
try to record a sale after their trial's silent expiry — no mention of
subscription status, no next step, no link to resolve it.

### 2d. There is no subscribe/payment entry point anywhere in the product

Confirmed by grep across every component for "subscribe," "pagar,"
"assinatura," and equivalents: **zero matches.** There is currently no
button, screen, or link anywhere in the client for an Owner to
initiate a subscription payment. This is architecturally consistent
with the Payment Adapter not existing yet (there's nothing to link to)
— but it means **the client-side entry point is itself unbuilt work,
separate from and in addition to the server-side webhook**, worth
scoping explicitly once PaySuite's actual payment-initiation flow
(hosted checkout link vs. in-app form) is known.

### Genuine release blockers found in this section

1. **A minimal trial/subscription-status indicator** (even a simple
   "X days left in your trial" line) — currently zero visibility.
2. **A business-meaningful message when a write is blocked by
   subscription status** — currently a raw technical error.
3. **A subscribe/payment entry point** in the client, whatever form
   PaySuite's actual flow takes.

None of these are Payment Adapter work — all three are pure client-side
UI, buildable entirely independent of PaySuite verification, and named
here precisely because they are genuine release blockers the "Engine is
done" framing does not cover.

---

## 3. Production / Deployment Readiness Audit

| Area | Status | Finding |
|---|---|---|
| Server env vars | ✅ Documented, fails loud | `FIREBASE_SERVICE_ACCOUNT_BASE64` (required, throws clearly if missing), `PORT` (defaults 8080), `ALLOWED_ORIGIN` (defaults permissive — same-origin serving makes this safe by design), `TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS` (optional, defaults 1hr) |
| Firebase/Firestore init | ✅ Fails loudly, not silently | `loadServiceAccount()` throws a clear, actionable error if the env var is missing — matches the exact symptom pattern in the Railway deploy failure shared this session |
| Authentication | ✅ Implemented | `requireAuth` middleware verifies Firebase ID tokens on every server route |
| Scheduled workers | ⚠️ **One is silently broken — see below** | |
| Notification worker | ✅ Registered, functional (Module #20) | |
| Production build | ✅ Clean | `npm run build` succeeds, re-verified this audit |
| Database rules | ✅ Correct for what exists | No gaps found relative to what's actually implemented |
| **Firestore composite indexes** | ❌ **One required index is missing** | See below |
| CI pipeline | ❌ **Covers a small fraction of the actual test suite** | See below |
| Backup/recovery | ✅ Designed, ⏳ operational verification owed | Architecture §12.6: Firestore point-in-time recovery, GCP-project-level feature — designed correctly, but whether it's actually **enabled** on the real production Firestore project is unverified from the repository alone |
| Error logging | ⚠️ Basic, acceptable for V1 | `console.error` throughout, no structured/searchable logging, no request IDs — a real but not release-blocking gap |

### 3a. A required Firestore composite index is missing — a real, concrete bug

`server/subscriptionEngine.ts`'s `runGracePeriodExpirySweep()` queries:

```
.where('status', '==', 'grace_period')
.where('gracePeriodEndsAt', '<=', now)
```

`firestore.indexes.json` contains an index for `subscriptions` on
`status` + `trialEndsAt` (used by the pre-existing trial sweep) but
**no index for `status` + `gracePeriodEndsAt`.** Firestore requires a
distinct composite index per distinct field combination — the existing
index does not cover this query.

**Consequence: as currently deployed, the grace-period-expiry sweep
will fail on every tick**, hitting the defensive
`catch`/`console.error('...composite index missing?')` branch already
built into the function — meaning it fails *safely* (logs, does
nothing, never crashes the server) but **the `grace_period → expired`
transition — one of the seven governed transitions — does not actually
run in production today**, despite being fully implemented and passing
27/27 tests. The tests didn't catch this because the fake Firestore in
`tests/subscription-engine.test.ts` doesn't require real composite
indexes — a real, worth-naming limitation of that test suite's own
coverage.

**This is a concrete, fixable gap** (add one entry to
`firestore.indexes.json`, matching the shape already used for the
existing `trialEndsAt` index) — not fixed in this document, per the
explicit "no code changes" instruction for this audit, but named here
as the single most concrete release blocker this audit found.

### 3b. CI does not run most of this session's test suites

`.github/workflows/ci.yml` runs exactly: `test:calculations`,
`test:rules:emulator`, and `build`. It does **not** run
`test:staff-notifications`, `test:notification-platform`,
`test:trial-notification-producer`, `test:closing-notification-producer`,
`test:breakage-notification-producer`, or `test:subscription-engine` —
six suites, 141 of the 153 tests currently in this repository, run in
**no automated pipeline at all.** Every verification this session
(and the prior Module #20 sessions) has performed has been manual,
run by hand in a sandbox — a real, correctable gap before scaling past
manual verification is sustainable.

No `test:all` aggregate script exists in `package.json` either — worth
adding alongside the CI fix.

### 3c. No deploy step for `firestore.rules`/`firestore.indexes.json` is visible in this repository

CI validates only (lint, test, build) — there is no `firebase deploy
--only firestore:rules,firestore:indexes` step anywhere in this
repository's CI or scripts. This means rules/index deployment to the
live Firestore project happens via some process outside this
repository (manual CLI, a separate pipeline) — worth confirming
explicitly what that process is and that it's actually been run
recently, since §3a's finding (a missing index) is exactly the kind of
drift this gap would allow to go unnoticed.

### 3d. The Railway deployment failure from earlier this session remains unresolved

Not re-investigated in this audit (outside this repository's own
scope, and unchanged since it was last discussed) — the most likely
cause identified earlier was a missing/misconfigured
`FIREBASE_SERVICE_ACCOUNT_BASE64` in the Railway `production`
environment specifically, based on the Build Logs showing a successful
image push with no corresponding successful Deploy. Still needs
Railway's own Deploy Logs or Diagnose output to confirm — carried
forward here as an open item, not resolved.

---

## 4. Consolidated Release-Blocker List

Everything found in this audit that is a genuine blocker to a first
real customer, in one place:

| # | Blocker | Area | Engine/Adapter work? |
|---|---|---|---|
| 1 | Missing `subscriptions` composite index (`status`+`gracePeriodEndsAt`) | Production readiness | No — infrastructure config |
| 2 | No client-side trial/subscription status visibility | Customer experience | No — client UI |
| 3 | Blocked writes show a raw technical error, not a business message | Customer experience | No — client UI |
| 4 | No subscribe/payment entry point in the client | Customer experience | Partially — depends on PaySuite's flow shape |
| 5 | CI doesn't run 6 of 7 test suites | Production readiness | No — CI config |
| 6 | Railway deploy failure (likely env var) | Production readiness | No — deployment config, unresolved |
| 7 | Point-in-time recovery enablement unverified on real project | Production readiness | No — operational verification |
| 8 | PaySuite Payment Adapter itself | Core blocker | Yes — the one everyone already knew about |

**Seven of these eight blockers require zero PaySuite verification and
zero Engine/Adapter work** — they can all be resolved in parallel with
the PaySuite verification step, exactly matching the "processor-
independent work" strategy already agreed this session. None of them
was addressed by this audit itself, per the explicit "no code changes"
instruction — this is a findings list, not a fix list.

---

## Stop Boundary

This audit made no code changes, per instruction. No file in `src/`,
`server/`, `firestore.rules`, `firestore.indexes.json`, or
`.github/workflows/` was modified to produce it — every finding above
is read-only inspection. This document does not authorize any of the
eight items in §4 to be fixed; each remains a distinct, explicit
decision for whoever picks up this list next.
