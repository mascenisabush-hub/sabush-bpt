# Platform Infrastructure Readiness Assessment

**Type:** Rule 8 feasibility pass — documentation analysis only.
**Lifecycle status:** New artifact. Not a BDS, not a module spec, not
Accepted/Implemented/Executed/Analyzed — informational engineering
input only. Does not authorize any implementation.
**Requested by:** Product Architect, following the Module #19 Readiness
Assessment (v2) — this document is the bridge artifact requested there.
**Basis:** [Architecture §4.8](../architecture/04-system-architecture.md)
(Background Processing and Scheduled Work), [§4.9](../architecture/04-system-architecture.md)
(Notifications system shape), [§4.10](../architecture/04-system-architecture.md)
(shared aggregation layer), [§9.6](../architecture/09-superadmin-architecture.md)
(Audit Logs), [§13.2–13.4](../architecture/13-development-strategy.md)
(Sequencing Principles, Phase Sequence, Phase 0), cross-checked against
the current state of `src/`, `server/`, `firestore.rules`,
`package.json`, and `.github/` as of commit `96af354`.

**Nothing was modified to produce this document.** No code, collection,
rule, migration, context, worker process, or CI pipeline created.

---

## Purpose

Separate what Modules #19 and #20 each need to *build for themselves*
from what is genuinely **shared platform infrastructure** — engineering
foundation that exists once and every business-module implementation
after it consumes, rather than each module quietly reinventing its own
version. Per the prior assessment's finding: the Background Worker is
the clearest case, but it isn't the only one worth checking.

## Platform Infrastructure vs. Business Modules — the boundary

| | Platform Infrastructure | Business Modules |
|---|---|---|
| Owned by | No single module; a shared engineering foundation | #17, #18, #19, #20 individually |
| Examples | Background Worker process, scheduling model, dedupe/watermark mechanism, shared Firebase Admin bootstrap | Subscription state model, Notification delivery rules, SuperAdmin screens |
| Changes when | A new job type is added, or the execution model itself changes | That module's own business rules change |
| This assessment covers | Everything in this column | Nothing — covered by each module's own BDS |

---

## 1. Inventory

### 1.1 Background Worker — the process itself

**Status: does not exist.** Confirmed by direct inspection, not
inference: `package.json` defines exactly one runtime script
(`"start": "node server.js"`); no second entry point, no `Procfile`,
no `railway.json` defining multiple services, no worker source file
anywhere in `server/` or elsewhere. Architecture §4.8's own phrase "the
existing single-process worker on Railway is extended" (§13.5)
describes a target state the document is written as if already true —
it is not yet true in this repository.

**What §4.8 specifies once built:** a second lightweight process on the
same Railway project, using an in-process scheduler or Railway's own
cron trigger, fixed interval (example given: hourly), reading directly
via `firebase-admin` — the same SDK `server/index.ts` already uses.

### 1.2 Scheduling model

**Status: does not exist.** §4.8 explicitly rejects a job queue,
distributed lock, or exactly-once delivery system as unnecessary at
current tenant counts — the specified model is a single scheduled
process on a fixed interval. This is a deliberately simple choice
(§4.8: "the simplest mechanism that closes the gap"), not an
oversight — worth stating plainly so a future implementer doesn't
"improve" it into a queue system unprompted.

### 1.3 Shared job execution (three job types, per §4.8)

Architecture assigns exactly three job types to one worker process:
1. **Notification triggers** (feeds #20's delivery abstraction).
2. **Subscription lifecycle checks** (feeds #19 — trial-expiry,
   renewal-due, payment-retry-window logic).
3. **Aggregation rollups** (feeds the shared Analytics/SuperAdmin/AI
   layer, §4.10 — relevant to #18's Platform Analytics, §9.8).

None of these three job types exist in code today. All three are
specified to share one worker process, not three separate workers.

### 1.4 Retry strategy / failure recovery

**Status: specified, not built.** §4.8.1 fixes two mechanisms, both
already fully designed at the architecture level:
- **Per-job dedupe key** — a deterministic key
  (`{businessId}:{eventType}:{period}`) checked before any write; if
  already recorded done, skipped. Prevents duplicate side effects
  (double-firing a notification, double-counting a rollup period) on
  worker restart.
- **Run-level watermark** — `platform_worker_state/{jobType}.lastRunCompletedAt`,
  an optimization to narrow the re-scan window after a crash, explicitly
  *not* the correctness mechanism itself (the dedupe key is).

Neither `platform_worker_state` nor any dedupe/watermark pattern exists
in the codebase today (confirmed by search — zero matches). This is
fully specified and low-ambiguity to build once the worker process
itself exists; it is not an open design question.

**Explicit non-goal, stated by Architecture itself:** no distributed
lock, no queue, no exactly-once delivery. §4.8's own escalation path
(move to Cloud Functions' scheduled-trigger model, or split job types
across multiple processes) is reserved for a *measured* future
threshold, not something to pre-build now.

### 1.5 Audit integration

**Status: partially applicable, needs explicit scoping.** The existing
Audit Log design (§9.6, `platform_audit_log/{id}`) is scoped to
**platform-operator actions** — Support Session issuance, impersonation,
business suspend/reactivate, subscription override, feature flag
change. It is written by the *privileged server* on named, discrete
operator actions.

The Background Worker is a different kind of actor: an automated
system process, not a human platform operator. Architecture does not
currently state whether routine worker-driven transitions (e.g.
`trial → active` firing automatically as a date passes) need an Audit
Log entry the way a human SuperAdmin override does (Business Rule 8 of
#19 already requires the override case specifically). This is worth
flagging as a genuine open question rather than assuming either answer:
logging every automated transition to the same append-only Audit Log
would be simple to add but changes that log's character from
"platform-operator actions" to "platform-operator actions plus every
automated state change," which is a larger stream. Left as an open
decision (§3, below) rather than resolved here.

### 1.6 Security boundaries

**Status: mostly inherited, one gap identified.** The worker, like
`server/index.ts` today, would authenticate to Firestore via the Admin
SDK and a service account key — the same trust boundary already
established and already governed by the existing
`FIREBASE_SERVICE_ACCOUNT_BASE64` env-var pattern (base64-encoded,
never in git, per `server/index.ts`'s own header comment). No new
identity model is needed; the worker inherits the privileged server's
existing bypass-of-`firestore.rules` trust level, since it writes as
Admin SDK the same way.

**Gap:** there is currently no CI secret-scan pipeline (`.github/` has
no workflow directory) — Architecture §13.4 (Phase 0, item 12 part 1)
names this explicitly as a control to have "before those keys are even
in heavy use," specifically citing the payment-processor webhook secret
as the motivating example. This is a Phase 0 item, not a Phase 1/worker
item — noted here because it directly protects the same class of
credential the worker would also depend on.

### 1.7 Dependency injection / shared services

**Status: does not exist as a pattern; not yet needed at current
scale.** `server/index.ts` is a single 566-line flat file — Firebase
Admin initialization, auth middleware, and all five `/api/staff/*`
routes live in one module with no service-layer abstraction. Introducing
a second process (the worker) that also needs Firebase Admin
initialization raises a concrete, small decision: duplicate the
init/credential-loading code in a second entry file, or extract a
shared module both processes import. Architecture does not mandate
either choice — this is a genuine engineering-planning decision, listed
in §3 below, not a design gap in Architecture itself.

### 1.8 Cloud deployment implications

**Status: not yet configured; low ambiguity once decided.** Railway
currently runs one service from one `package.json` (`npm start` →
`node server.js`). Running a second process on "the same Railway
project" (§4.8's own wording) requires either:
- a second Railway service pointed at the same repo with a different
  start command, or
- Railway's own cron-trigger feature invoking a script on a schedule
  instead of a long-running second process.

§4.8 names both as acceptable ("using a simple in-process scheduler or
Railway's own cron trigger") without picking one — this is a legitimate
open engineering decision (§3), not something Architecture left
ambiguous by mistake. Practical implication either way: a second env-var
set (or shared set) for `FIREBASE_SERVICE_ACCOUNT_BASE64` on whichever
Railway service ends up running the worker, and the known
`package.json`/`bun.lock` drift issue (already flagged in `HANDOFF.md`
as a recurring problem) becomes relevant to a second deployable
artifact, not just one.

### 1.9 Which Phase 4 modules depend on each capability

| Capability | #19 depends? | #20 depends? | #18 depends? |
|---|---|---|---|
| Worker process itself | Yes — trial/renewal checks | Yes — notification triggers | Indirectly — needs #19/#20 to hold real data first (own BDS's stated gate) |
| Dedupe/watermark mechanism | Yes | Yes | No direct dependency |
| Audit integration (worker-driven) | Open question (§1.5) | Not specified as needing it | No — #18's own audited actions are human SuperAdmin actions, already covered by §9.6 as designed |
| Aggregation rollup job type | No | No | Yes — §4.10/§9.8 Platform Analytics reads from this |
| CI secret-scan | Indirectly (payment webhook secret) | No | No |

---

## 2. Sequencing Finding — Architecture Already Answers This

Architecture's own [§13.2](../architecture/13-development-strategy.md)
Sequencing Principle 1 states plainly: **"A phase only starts once
every domain it reads from has real data, not a mock."** The Phase
Sequence (§13.3) places **Phase 0 — Foundation Hardening** strictly
before **Phase 1 — Platform Backbone (Subscriptions + Notifications +
Background Worker)**. This isn't a new sequencing question this
assessment needs to invent — Architecture already fixed the answer;
what's missing is confirmation Phase 0 is actually done.

**Phase 0 status, checked directly against code:**

| Phase 0 item (§13.4) | Status |
|---|---|
| `'owner'` → `'admin'` rename | **Not done** — `src/types.ts` still defines `UserRole = 'owner' \| 'staff'` |
| Manager-tier (`staffTier`) migration | **Done** — `staffTier` present on both `users` and staff records, per Module #16 |
| `AppContext` decomposition rule (rule only, not the contexts) | Unconfirmed by this pass — would need explicit team confirmation this convention is being followed, not just checkable by file search |
| Storage upload flow (product photos) | **Not built** — no `firebase/storage` usage found in `src/` |
| CI secret-scan pipeline | **Not built** — no `.github/workflows/` directory |
| RTO restore drill | **Not confirmed** — no drill record found in `docs/`; may exist outside the repo (ops runbook, ticket) and simply not be documented here |
| Legal-deletion basis decision | Decision-gate, not a build item — status not assessed by this pass (outside engineering scope) |

**This matters directly for the Background Worker specifically:**
Architecture frames Phase 0 as preparing Phase 1 by giving it "final
naming (no rework mid-Phase-1)" and "a context-splitting discipline
already in force" before Phase 1 creates `SubscriptionContext`/
`NotificationContext`. Building the worker (a Phase 1 item) while the
`'owner'`→`'admin'` rename (a Phase 0 item) is still outstanding is
exactly the scenario Architecture's own reasoning warns against: new
Phase 1 code would be written against `isOwnerOf`/`'owner'` naming that
Phase 0 already planned to retire, creating the avoidable rework
Architecture's sequencing principle exists to prevent.

**This assessment does not recommend a sequencing decision — Architecture's
own document already made it (Phase 0 before Phase 1).** What this
assessment adds is confirmation that Phase 0 is not yet complete, which
is new information not previously verified against the repository.

---

## 3. Open Decisions (engineering-planning level, not Product-level)

1. **Audit scope for worker-driven transitions** (§1.5) — does an
   automated `trial → active`/`→ past_due` transition need a
   `platform_audit_log` entry the way a human SuperAdmin override does?
   Genuinely undecided by Architecture; not a business-rule question.
2. **Shared-module extraction vs. duplication** (§1.7) — whether the
   worker and `server/index.ts` share a Firebase-Admin-init module or
   each carry their own copy. Low-stakes, but affects "affected files"
   scope whenever the worker is actually built.
3. **Railway deployment shape** (§1.8) — second service vs. Railway's
   native cron trigger. Architecture names both as valid; picking one
   is an infrastructure decision, not a product one.
4. **Phase 0 completion** — whether the outstanding Phase 0 items
   (`'owner'`→`'admin'` rename, CI secret-scan, confirmed RTO drill) are
   completed before Phase 1 begins, per Architecture's own sequencing,
   or explicitly deferred with a stated reason. This is the one item on
   this list closest to a Product Architect call, since it's a
   sequencing exception to an already-approved document, not a routine
   engineering-planning detail.

None of the above require a BDS amendment or touch #19/#20/#18's
business rules — they are all Platform Infrastructure questions.

---

## Findings

- The Background Worker, its scheduling model, and its retry/dedupe
  mechanism are **fully specified by Architecture §4.8/§4.8.1** and
  **entirely unbuilt** — this is a build gap, not a design gap.
- Audit integration for worker-driven (as opposed to human-operator)
  actions is a genuine open question Architecture doesn't currently
  answer — flagged, not resolved.
- Security boundaries carry over cleanly from the existing privileged
  server's Admin SDK trust model; the one adjacent gap is the missing
  CI secret-scan pipeline, itself a named Phase 0 item.
- **Architecture's own sequencing (§13.2/§13.3) already places Phase 0
  before the Background Worker's Phase 1** — and Phase 0 is confirmed
  incomplete (role rename and CI secret-scan both outstanding).

## Blockers

- Building the Background Worker before the `'owner'`→`'admin'` rename
  lands means writing new Phase 1 code against naming Architecture has
  already scheduled for retirement — an avoidable-rework risk, per
  Architecture's own stated reasoning for Phase 0's placement.
- The audit-scope question for worker-driven transitions (§3, item 1)
  should be settled before the worker's Subscription-lifecycle job type
  is built, to avoid retrofitting logging into a job that's already
  live.

## Recommendation for Product Architect

This assessment does not recommend building the Background Worker yet.
Architecture's own sequencing already answers the "what comes first"
question this document was asked to help with: **Phase 0 completion,
specifically the `'owner'`→`'admin'` rename and CI secret-scan pipeline,
before Phase 1 Platform Backbone (including the Background Worker)
begins.** Whether to follow that sequencing as written, or explicitly
and deliberately grant a sequencing exception with a stated reason, is
the one decision on this document that is genuinely yours to make
rather than an engineering-planning detail — everything else here (§3,
items 1–3) can be resolved at implementation-planning time without
further Product Architect input.
