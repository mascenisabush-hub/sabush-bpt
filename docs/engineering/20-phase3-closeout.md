# Module #20 (Notifications) — Phase 3 (Background Worker Scheduled Triggers) Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any BDS,
Amendment, POL, ADR, or plan; it records that Phase 3's already-approved
scope has been implemented and verified. Stage 10 of the
[Platform Engineering Governance Standard](./platform-engineering-governance-standard.md).
**Phase:** #20 Phase 3 — Background Worker Scheduled Triggers, per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9, scoped by [`20-phase3-rule8-assessment-v2.md`](./20-phase3-rule8-assessment-v2.md)
(**Governance Readiness: Ready**), grounded in
[BDR-0007](../specs/20-bdr-0007-businessevent-creation-policy.md) and its
[Closing Cadence Amendment](../specs/20-bdr-0007-closing-cadence-amendment.md),
authorized by
[`20-phase3-implementation-authorization.md`](./20-phase3-implementation-authorization.md)
(signed 2026-08-05).
**Checkpoints:** Checkpoint 1 (`e18691b`, `registerJob()` abstraction),
Checkpoint 2 (`f96c2f4`, Platform Infrastructure), Checkpoint 3
(`d147106`, Trial Engine Producer), Checkpoint 4 (`6d77838`, Closing
Integrity Producer), Checkpoint 5 (`32bafbf`, Breakage Producer, this
close-out's own immediate predecessor commit).

---

## 1. Governance Compliance

The full chain this phase was required to sit downstream of, per the
Authorization document's own §1 table — independently re-verified
against the current repository state, not assumed:

| Stage | Document | Status |
|---|---|---|
| Business Decision | `20-notifications.md` v1.2 | ✅ Accepted |
| Architecture | ADR-0002, ADR-0003, ADR-0004 | ✅ Accepted |
| Business Decision (communication policy) | BDR-0005, BDR-0006 | ✅ Accepted |
| Business Decision (event creation policy) | BDR-0007 + Closing Cadence Amendment | ✅ Accepted |
| Implementation Plan | `20-notifications-implementation-plan.md` §9 | ✅ Planned |
| Rule 8 | `20-phase3-rule8-assessment-v2.md` | ✅ Assessed — Ready |
| Authorization | `20-phase3-implementation-authorization.md` | ✅ Signed (2026-08-05) |
| Implementation | Checkpoints 1–5 | ✅ Complete |
| **Close-out** | **This document** | ✅ Recorded |

**Fresh repository verification performed for this close-out** (not
reused from any prior session's own claim):

- `git fetch origin` confirmed `main == origin/main` at `32bafbf`,
  working tree clean, before any close-out work began.
- All five checkpoint commits (`e18691b`, `f96c2f4`, `d147106`,
  `6d77838`, `32bafbf`) confirmed present, in that order, on `main`.
- Every literal `eventType` string in `server/*.ts` enumerated by direct
  grep: `closing.approaching`, `closing.due`, `closing.overdue`,
  `trial.ending_soon`, `trial.ending_tomorrow`,
  `inventory.risk.breakage` — exactly the six BDR-0007 §4 defines, no
  more, no fewer.
- `registerCommunicationPolicy`/`registerTemplate` call counts (6 each,
  across `trialNotificationProducer.ts`, `closingNotificationProducer.ts`,
  `breakageNotificationProducer.ts`) confirmed to match the six
  eventTypes 1:1 — no eventType has a policy without a template or vice
  versa.
- `backgroundWorker.registerJob()` call sites in `server/index.ts`
  confirmed: `trial-lifecycle-sweep` (Module #19's own, pre-existing,
  unrelated), `trial-notification-sweep`, `closing-notification-sweep`,
  `breakage-notification-sweep` — three Phase 3 jobs, one per producer,
  none missing, none duplicated.
- Direct grep for any `inventory.risk.stock*`/discrepancy/variance
  eventType or Stock Counts detection logic: **zero matches** anywhere
  in `server/` or `src/utils/calculations.ts` — BDR-0007 §4.2's explicit
  Stock Counts deferral has not been silently exceeded.
- Full Phase 3 diff (`cede8c1..32bafbf`, restricted to `server/`,
  `firestore.indexes.json`, `firestore.rules`, `src/i18n/`) reviewed in
  full — see §2 for the file list; nothing outside the Authorization's
  §2 "Expected runtime files" list was touched.
- `firestore.rules`' one change in this range (`platform_event_dedupe`,
  `platform_worker_state`, both `allow read/write: if false`)
  independently confirmed to add **zero** new client-facing read/write
  surface — consistent with Authorization §3's explicit prohibition on
  exactly that, and with the Authorization §2's own naming of these two
  collections as in-scope platform mechanisms.

**No specification, Amendment, POL, or ADR was reopened, reinterpreted,
or modified to produce Phase 3's implementation or this close-out.**
Two scope-adjacent decisions were made during implementation, both
flagged at the time, neither a silent business-rule invention:

1. **The BDR-0007 Closing Cadence Amendment** (discovered mid-Checkpoint-4
   investigation: BDR-0007 §4.1 assumed a stored "current period"
   `endDate` that does not exist in the schema) — reported and
   implementation paused until the Amendment was Accepted, per this
   repository's own standing practice of returning genuine governance
   gaps to Product Architecture rather than resolving them in code.
2. **The priority/importance field split** (Checkpoint 5: an initial
   draft set `priority: 'high'` on the Breakage producer's communication
   policy, which does not exist on `NotificationPriority`) — caught by
   the test suite before commit, resolved by re-reading the
   [Priority Reconciliation Amendment](../specs/20-notifications-priority-reconciliation-amendment.md)
   §6, which exists for exactly this collision: `priority: 'immediate'`
   (delivery strategy, uniform across Phase 3) and `importance: 'high'`
   (BusinessEvent significance, BDR-0007 §5) are two different fields —
   not a new decision, a correct reading of an already-Accepted one.

## 2. What Was Implemented

Five checkpoints, each its own commit, executed as sequencing within
one authorized phase — not five separate authorizations:

| Checkpoint | Commit | Scope |
|---|---|---|
| 1 — Job Registration | `e18691b` | `server/backgroundWorker.ts` (new): `registerJob({ jobType, schedule, execute, ... })` per ADR-0003. `runTrialLifecycleSweep()` migrated onto it — pure scheduling-plumbing refactor, business logic byte-for-byte unchanged. |
| 2 — Platform Infrastructure | `f96c2f4` | `server/notificationPlatform.ts` (new): `BusinessEvent` contract (ADR-0004 Decision 1), `evaluateBusinessEvent()` pipeline (dedupe → communication-policy → template/localization → persistence), dedupe/watermark (`platform_event_dedupe`, `platform_worker_state`, both new `firestore.rules` collections, fully client-inaccessible). `writeNotification()` relocated unchanged from `server/index.ts`. No producer wired — infrastructure only, by explicit instruction. |
| 3 — Trial Engine Producer | `d147106` | `server/trialNotificationProducer.ts` (new): `trial.ending_soon` (T-7), `trial.ending_tomorrow` (T-1) — first real producer, proving the full Event → Platform → Notification pipeline end to end. |
| 4 — Closing Integrity Producer | `6d77838` | `server/closingNotificationProducer.ts` (new): `closing.approaching`, `closing.due`, `closing.overdue` — current period derived from the most recent active `Closing` (BDR-0007 Amendment), never stored. New `closings` collection-group index. |
| 5 — Breakage Producer | `32bafbf` | `server/breakageNotificationProducer.ts` (new): `inventory.risk.breakage` — adapts (not reuses) `isQuebraExceedingWarning`'s underlying condition from persisted `quebras`/`batches` collection-group scans. New `quebras`/`batches` collection-group indexes. |

**Combined diff, all five checkpoints (`cede8c1..32bafbf`):**

```
firestore.indexes.json                 |  23 ++
firestore.rules                        |  33 +++
server/backgroundWorker.ts             | 111 ++++++++
server/breakageNotificationProducer.ts | 304 ++++++++++++++++++++
server/closingNotificationProducer.ts  | 386 +++++++++++++++++++++++++
server/index.ts                        | 241 ++++++----------
server/notificationPlatform.ts         | 497 +++++++++++++++++++++++++++++++++
server/trialNotificationProducer.ts    | 221 +++++++++++++++
src/i18n/locales/en.ts                 |  38 +++
src/i18n/locales/fr.ts                 |  38 +++
src/i18n/locales/pt.ts                 |  83 ++++++
11 files changed, 1818 insertions(+), 157 deletions(-)
```

Every file above is either explicitly named in the Authorization's §2
"Expected runtime files" list, or is that list's direct, unavoidable
consequence (`src/i18n/locales/*` for template copy — ADR-0004 Decision
5 requires reusing the existing locale dictionaries, not a second
localization system; `server/index.ts`'s large diff is import/wiring
lines across five checkpoints' worth of registration calls, not new
business logic). No file outside that set was touched at any
checkpoint. `firestore.rules`' `/notifications/{id}` block — Phase
1/2's already-shipped scope — is unchanged, per Authorization §3.

**What was deliberately not built, per Phase 3's own boundary
(Authorization §3):**

- **Stock Counts inventory risk**, of any kind — BDR-0007 §4.2's
  explicit deferral. No `eventType`, no discrepancy/variance concept,
  confirmed absent by direct grep (§1, above).
- **Phase 2's five `/api/staff/*` endpoints** were not retrofitted onto
  the `BusinessEvent` contract — the Implementation Plan's own "Legacy
  Compatibility" decision explicitly retains them as a separate,
  supported direct-producer pattern. Untouched.
- **Phase 4** (Tenant User Experience beyond the existing bell
  dropdown), **Phase 5** (Payment Webhook Creation Path), **Phase 6**
  (Email/WhatsApp/future delivery channels) — none begun. No file under
  any of those phases' own eventual scope was touched.
- **Any change to Phase 1/2's already-closed, already-shipped scope** —
  `NotificationContext`, `Header.tsx`, `DeliveryChannel`/`InAppChannel`,
  the five existing `/api/staff/*` call sites, `firestore.rules`'s
  `/notifications/{id}` block — all unchanged, confirmed by the diff in
  §2.
- **Any change to `isQuebraExceedingWarning`, `AddQuebraView.tsx`, or
  the Dashboard's `hasExceededWarning` banner** — Checkpoint 5 adapts
  the same underlying condition into a new, separately-named
  BusinessEvent trigger; the existing UI-only data-quality signal is
  byte-for-byte unchanged.
- **Any `src/types.ts`, `Business`, `Closing`, or `ClosedPeriod` schema
  change** — the Closing Cadence Amendment explicitly introduces none,
  and none was added.

## 3. Acceptance Evidence

Verified fresh, this session, against the actual repository state at
`32bafbf`:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Clean, zero errors |
| `npm run build` (`vite build` + `build:server`) | ✅ Succeeded. Only pre-existing, unrelated warnings (CSS `.lift` selector lint, chunk size, dynamic-import overlap) — none newly introduced by Phase 3 |
| `npm run test:calculations` | ✅ 12/12 pass |
| `npm run test:notification-platform` | ✅ 20/20 pass (Checkpoint 2's own pipeline suite) |
| `npm run test:staff-notifications` | ✅ 58/58 pass (Phase 1/2 regression check — unaffected by Phase 3's scope) |
| `npm run test:trial-notification-producer` | ✅ 9/9 pass |
| `npm run test:closing-notification-producer` | ✅ 14/14 pass |
| `npm run test:breakage-notification-producer` | ✅ 13/13 pass |
| **Total across all seven executable suites** | **✅ 126/126 pass** |
| Diff review, all five checkpoints | ✅ Matches Authorization §2's expected-files list exactly (§1/§2, above) |
| `git log` / `git status` | ✅ `main == origin/main` at `32bafbf`, working tree clean, nothing unpushed as of this close-out's own starting point |
| **Emulator rules test** (`npm run test:rules:emulator`) | ❌ **Execution-blocked-by-environment** — this sandbox's network egress allowlist excludes `storage.googleapis.com`, the same standing, documented limitation as every prior emulator-dependent change in this repository (Phase 1/2 close-outs, Closing Integrity Amendment, Module #19 Phase 1). Not a new failure, not a code defect. |

**Net acceptance status:** everything executable in this sandbox
(typecheck, build, all 126 unit/integration tests, static diff review
against the Authorization) passes across all five checkpoints. The one
gate this environment cannot clear — a live Firestore emulator run
covering the two new client-inaccessible collections
(`platform_event_dedupe`, `platform_worker_state`) and the three new
collection-group indexes (`closings`, `quebras`, `batches`) — remains an
outstanding **manual verification step for a local environment**,
consistent with every prior emulator-dependent change in this repo's
history. Since none of Phase 3's `firestore.rules` additions grant any
new client access (§1, above), the risk profile of deploying without
that manual step is low, but it is not zero, and is not waived by this
close-out.

## 4. Runtime Impact

- **Four Background Worker jobs now registered** (up from one before
  Phase 1): `trial-lifecycle-sweep` (Module #19's own, pre-existing),
  `trial-notification-sweep`, `closing-notification-sweep`,
  `breakage-notification-sweep`. All four share
  `TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS` (hourly by default) and are
  isolated from one another by `backgroundWorker.ts`'s own failure
  isolation (ADR-0003) — one job's exception is caught, logged, and
  never blocks a sibling job's own scheduled tick.
- **New read paths:** each Phase 3 job performs its own Firestore
  read(s) every tick — `subscriptions` (Trial, pre-existing query,
  unchanged shape), `closings` (Closing, new collection-group scan),
  `quebras` + `batches` (Breakage, two new collection-group scans, run
  in parallel via `Promise.all`).
- **New write paths:** all three producers write exclusively through
  the existing, shared `evaluateBusinessEvent()` → `writeNotification()`
  pipeline (Checkpoint 2) — no producer writes to `notifications`
  directly, and no producer writes to any collection outside
  `notifications`, `platform_event_dedupe`, `platform_worker_state`.
- **No existing runtime path altered.** `runTrialLifecycleSweep()`'s own
  `trial_active → trial_completed` transition logic is unchanged;
  `recordClosing`/`reopenClosing`/`isPeriodClosed` in
  `AppContext.tsx` are unchanged; `isQuebraExceedingWarning` and its
  Dashboard banner are unchanged; the five Phase 2 staff-endpoint
  writers are unchanged.
- **Zero real Closing/Breakage notifications exist in this
  repository's history as of this close-out** — same "structurally
  real but exercised only by tests" starting position Phase 1
  established for the whole `notifications` collection, now true
  specifically for these two categories; only Trial (Checkpoint 3) has
  had any chance to fire against real data, and only if a real trial
  has actually crossed a threshold since that checkpoint shipped.

## 5. Security Impact

- **Tenant isolation preserved across all three producers.** Closing
  and Breakage both key their aggregation explicitly by `businessId`
  (via `docSnap.ref.parent.parent?.id`), never summing or comparing
  data across businesses — Breakage's own test suite includes an
  explicit same-`batchId`-different-`businessId` collision case,
  passing.
- **No new client-facing read/write surface.** The only `firestore.rules`
  change in this phase (`platform_event_dedupe`, `platform_worker_state`)
  is `allow read/write: if false` for both — stricter than every
  existing collection, matching `platform_audit_log`'s precedent.
  `/notifications/{id}`'s existing client rules are unchanged.
- **All three producers are server-side, Admin-SDK-only.** No producer
  is reachable from client code; the Background Worker itself is a
  server-process construct with no client trigger of any kind.
- **Recipient binding is Business-scoped for all three producers**
  (`scope: 'business'`, `userId: null`), matching the existing
  Owner/Manager visibility model `NotificationContext`'s own listener
  already enforces — no new recipient kind, no new access tier.
- **No secret, credential, or PII newly introduced.** `context` on
  every BusinessEvent is a pointer (`{ collection, documentId }`) per
  ADR-0004 Decision 1 — never a copy of financial data.

## 6. Performance Observations

- **Closing and Breakage both perform unfiltered collection-group
  scans** (`closings`; `quebras` + `batches`) on every tick, rather
  than a `where`-scoped query — a deliberate, documented choice (both
  producers' own file headers) to preserve `isPeriodClosed`'s and
  `isQuebraExceedingWarning`'s exact existing status/absence semantics,
  which a Firestore equality filter cannot safely replicate. This is a
  known, flagged scaling limitation, acceptable at this platform's
  current "notebook or nothing" SME scale, worth revisiting if either
  collection's total document count grows large enough to matter — not
  a defect, a stated tradeoff.
- **Breakage's two scans run in parallel** (`Promise.all`), not
  sequentially — halves this producer's own tick latency relative to a
  naive sequential implementation, at no correctness cost (the two
  collections are read-only inputs to an in-memory join, order
  irrelevant).
- **No N+1 query pattern in any producer.** Each producer performs a
  fixed, small number of Firestore round-trips per tick (Trial: 1;
  Closing: 1; Breakage: 2, parallel) regardless of how many businesses
  or events are ultimately evaluated — the fan-out happens in memory,
  not in additional queries.
- **Dedupe is O(1) per event** (`platform_event_dedupe/{dedupeKey}`
  document existence check), unchanged in shape since Checkpoint 2,
  regardless of which producer is calling it.
- **Bundle impact:** server-side only — no client bundle size change
  from Phase 3 (all five checkpoints touch only `server/` and
  `src/i18n/locales/*`, the latter being small string additions, not
  code).

## 7. Remaining Work (Explicit Boundary — Phase 3 vs. Phase 4+)

**Phase 3 (Background Worker Scheduled Triggers) is closed as of
`32bafbf`.** Everything above is what exists. Nothing below exists yet,
anywhere in this repository:

- **Phase 4** (Tenant User Experience beyond the existing bell
  dropdown) — not assessed, not authorized, not begun.
- **Phase 5** (Payment Webhook Creation Path) — not assessed, not
  authorized, not begun; additionally blocked on Module #19's own
  Commercial Integration phase, per the Implementation Plan.
- **Phase 6** (Email/WhatsApp/additional delivery channels) — outside
  V1 scope entirely (Decision Gate 3), not begun.
- **Stock Counts Inventory Risk** — remains a genuinely undefined
  concept in `10-stock-counts.md`; any future eventType for it requires
  its own BDR, not an extension of this phase's own scope.
- **Template copy across all six eventTypes** (`en`/`pt`/`fr`) is
  first-draft engineering wording, flagged at every checkpoint as **not**
  Product-Architect-approved — remains open for review, does not block
  functional correctness.
- **The emulator-run manual verification step** (§3, above) is still
  owed before any production deploy touching this phase's
  `firestore.rules` or `firestore.indexes.json` additions.
- **Documentation synchronization** (`docs/specs/README.md`,
  `HANDOFF.md`) — addressed by this close-out itself, in the same
  commit, as an explicit, separate step (§"Documentation
  Synchronization" note, Governance Notes below) — not deferred again.

**Confirmation: no Phase 4+ work has begun.** No file under `src/`
(beyond `src/i18n/locales/*`), `docs/specs/`, or `docs/architecture/`
was modified to produce this close-out beyond the close-out document
itself and the two documentation-synchronization files named above. No
Phase 4 Rule 8 Assessment has been drafted.

---

## Documentation Synchronization

Performed as part of this close-out, per the Governance Standard's own
Non-Negotiable Principle 5 ("documentation drift is flagged, not
silently corrected inline with unrelated work") — this is not unrelated
work, it is this close-out's own explicit scope, done in the same
commit as this document, not deferred a third time:

- **`docs/specs/README.md`** — Module #20's row updated from "Phase 2
  (Privileged-Server Creation Path) not yet authorized" (stale — Phase
  2 has been closed since `20-phase2-closeout.md`) to reflect Phase 1,
  2, and 3 all implemented and closed, Phase 4 not yet authorized.
- **`HANDOFF.md`** — the "Right now" section, which had accumulated
  multiple layered, partially-superseded updates spanning back to
  before BDR-0007 existed (describing four "still needing an explicit
  Product Architect decision" items that were all resolved sessions
  ago), fully rewritten — not appended to, per this file's own stated
  policy — to state Phase 3's actual closed status as the single source
  of truth for "what's true right now."

---

## Governance Notes

- This record does not modify `20-notifications.md`, any Decision Gate,
  ADR-0002/0003/0004, BDR-0005/0006/0007, the Closing Cadence Amendment,
  the Priority Reconciliation Amendment, the Implementation Plan, the
  Rule 8 Assessment, or the Phase 3 Authorization.
- This record does not authorize Phase 4, Phase 5, or Phase 6, or any
  Stock Counts work under any phase — each requires its own governance
  record, per the Authorization's own §3 and the Governance Standard's
  Non-Negotiable Principle 6 ("a governance artifact records; it does
  not decide").
- **Lifecycle:** Implemented → Verified → **Closed** (Phase 3 only).
  Phase 4 begins as its own, separate engineering milestone, gated on
  its own Rule 8 Assessment and its own explicit Product Architect
  authorization — following the same pattern this document itself now
  completes for Module #20 Phase 3, matching Phase 1's and Phase 2's own
  precedent (`20-phase1-closeout.md`, `20-phase2-closeout.md`).
