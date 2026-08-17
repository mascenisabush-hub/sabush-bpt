# Module #18 (SuperAdmin) — Business Directory (Phase E) — Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any BDR, POL,
specification, or this phase's retrospective acceptance decision; it
records that Phase E's implementation has been verified and the
retrospective governance decision already made is now given effect.
Stage 10 of the [Platform Engineering Governance Standard](./platform-engineering-governance-standard.md),
applied here to a phase whose Stage 7/8 did not precede Stage 9 — see
§2 below, which this document does not soften.
**Phase:** #18 Phase E — SuperAdmin Business Directory, grounded in
[BDR-0010](../specs/BDR-0010-superadmin-business-directory.md)
(✅ Approved) and [POL-18-001](../specs/18-pol-001-operational-activity-state-model.md)
(✅ Approved), specified by
[`18-superadmin-business-directory-slice.md`](../specs/18-superadmin-business-directory-slice.md)
(v1.2), retrospectively accepted by
[`18-superadmin-business-directory-retrospective-acceptance.md`](./18-superadmin-business-directory-retrospective-acceptance.md).
**Checkpoints:** `542d53f` (activity-touch mechanism + subscriptionStatusCache
mirror), `51ce959` (`businessDirectory.ts` query module), `314b842`
(`businessDirectory.ts` tests), `99ba55c` (backfill migration),
`40b17de` (Checkpoint 6, activity-touch tests), `c92dbd4` (Checkpoint 7,
real-Firestore verification), `186fa32` (Checkpoint 8, SuperAdmin API
route), `933ee85` (Checkpoint 9, SuperAdmin Business Directory UI — this
close-out's own predecessor checkpoint).

---

## 1. Closeout Status

**Status: CLOSED.**

**Phase E — SuperAdmin Business Directory.**

---

## 2. Historical Governance Record

**This section is preserved exactly as established by the retrospective
acceptance document — this close-out does not soften, reinterpret, or
walk back any part of it:**

- BDR-0010 was approved as a business decision (`87638b9`,
  2026-08-15 19:58).
- BDR-0010 itself did **not** authorize implementation — its own Part
  14 states this explicitly: *"This BDR authorizes the business
  decision only... Rule 8 is not skipped."*
- The specification (v1.2, `e1ab6a8`, 2026-08-15 20:27) explicitly
  stated that Rule 8 re-affirmation and implementation authorization
  had not yet been granted — its own §24 and Governance Notes, in
  writing: *"this specification alone does not constitute that
  re-affirmation"* and *"neither [re-affirmation nor authorization] is
  granted by this specification update alone."*
- Implementation nevertheless began at `542d53f` (2026-08-15 20:46),
  **19 minutes** after that specification text was committed.
- Phase E implementation continued through checkpoint 9, `933ee85`
  (2026-08-16 08:58).
- The required authorization sequence therefore occurred out of order —
  Stage 9 (Incremental Implementation) began before Stage 7 (Rule 8
  Assessment reaching a formally recorded "Ready") or Stage 8 (signed
  Implementation Authorization) completed, violating the Governance
  Standard's own Non-Negotiable Principle 7.

**This close-out does NOT rewrite that historical sequence.** It
records the retrospective acceptance already granted
(`18-superadmin-business-directory-retrospective-acceptance.md`, §2:
*"Accepted retrospectively into the governed baseline"*) and closes the
feature based on the technical and deployment evidence obtained since
that acceptance was recorded. Nothing in this document alters
BDR-0010, POL-18-001, the specification's v1.1/v1.2 text, or the
retrospective acceptance document itself.

---

## 3. Scope Fidelity

Re-verified fresh this session, against current repository state
(`main` HEAD `02e4d92` at drafting time), not reused from an earlier
session's claim:

| Governed requirement | Evidence | Result |
|---|---|---|
| POL-18-001 activity thresholds (14/45 days) | `server/businessDirectory.ts:123-124`: `ACTIVE_WINDOW_DAYS = 14`, `DORMANT_THRESHOLD_DAYS = 45`, used consistently at lines 161, 164, 292-293 | ✅ Exact match |
| Server-authoritative `activityTouch` mechanism | `server/activityTouch.ts`: server-generated timestamp (`new Date()`), Admin-SDK-backed, no client-suppliable timestamp | ✅ Matches BDR-0010 Part 5 |
| Correct SuperAdmin authorization chain | `server/index.ts:2146-2148`, the directory route: `requireAuth, requirePlatformOperator, requireSuperAdmin` — identical chain to every prior SuperAdmin phase | ✅ Confirmed |
| GET-only directory route | `server/index.ts:2145`: `expressApp.get(...)` — no corresponding POST/PUT/DELETE route for this path | ✅ Confirmed |
| No bulk/mass suspend/reactivate capability | Grepped `apps/superadmin/src/pages/BusinessDirectory.tsx` and `server/businessDirectory.ts` for `bulk`/`mass suspend`/`mass reactivat` | ✅ Zero matches |
| No deletion capability | Same search scope, `delete` | ✅ Zero matches |
| No new mutation capability | Directory route is read-only; every write path it can navigate to already existed from Phases A–D | ✅ Confirmed |
| No direct `subscriptions` collection dependency | Grepped `server/businessDirectory.ts` for `collection('subscriptions')` | ✅ Zero matches — reads only the `subscriptionStatusCache` mirror on `businesses/{businessId}`, never the canonical `subscriptions` document, matching BDR-0010's "never a second source of truth" requirement |

**No scope deviation identified.**

---

## 4. Implementation Delivered

Nine checkpoints, one authorized-in-retrospect phase — combined diff
`542d53f^..933ee85`:

```
apps/superadmin/src/App.tsx                          |  16 +-
apps/superadmin/src/lib/superadminApi.ts              |  63 +++
apps/superadmin/src/pages/BusinessDirectory.tsx       | 243 ++++++++++++
apps/tenant/src/context/AppContext.tsx                |  29 ++
apps/tenant/src/types.ts                              |  13 +-
package.json                                          |   9 +-
server/activityTouch.ts                               |  59 +++
server/backfillPhaseE.ts                              | 197 +++++++++
server/businessDirectory.ts                           | 335 ++++++++++++++++
server/index.ts                                       | 150 +++++++
server/scripts/backfillPhaseE.ts                      |  76 ++++
server/subscriptionEngine.ts                          |  25 +-
tests/staff-management-multishop-authorization.test.ts|  16 +-
tests/subscription-engine.test.ts                     | 118 +++++-
tests/superadmin-activity-touch.test.ts               | 215 ++++++++++
tests/superadmin-backfill-phase-e.test.ts             | 291 ++++++++++++++
tests/superadmin-business-directory-api.test.ts       | 110 ++++++
tests/superadmin-business-directory-firestore.test.ts | 374 ++++++++++++++++++
tests/superadmin-business-directory-ui.test.ts        | 123 ++++++
tests/superadmin-business-directory.test.ts           | 438 +++++++++++++++++++++
20 files changed, 2885 insertions(+), 15 deletions(-)
```

**No `firestore.rules` or `firestore.indexes.json` change anywhere in
this phase** — confirmed both by this diff (neither file appears in
it) and independently by `git log`, which shows both files' most
recent change predates Phase E entirely.

**What was built, by checkpoint:**

| Checkpoint | Commit | Delivered |
|---|---|---|
| 1 | `542d53f` | `server/activityTouch.ts` (new) — server-side `touchBusinessActivity()`. New tenant-facing route `POST /api/business/touch-activity`. `subscriptionStatusCache` mirror added to `subscriptionEngine.ts`'s existing transactional status writes (additive; existing lifecycle transitions unchanged — re-verified by this phase's own extension of `tests/subscription-engine.test.ts`, 27→32 tests, all passing). |
| 2 | `51ce959` | `server/businessDirectory.ts` (new) — the directory query module. |
| 3 | `314b842` | `tests/superadmin-business-directory.test.ts` (new). |
| 4 | `99ba55c` | `server/backfillPhaseE.ts` + `server/scripts/backfillPhaseE.ts` (new) — one-time backfill migration for `lastActivityAt`/`subscriptionStatusCache` on existing businesses. |
| 6 | `40b17de` | `tests/superadmin-activity-touch.test.ts` (new). |
| 7 | `c92dbd4` | Real-Firestore verification for `businessDirectory.ts`'s query shapes. |
| 8 | `186fa32` | SuperAdmin API route (`server/index.ts`) + client wrapper (`apps/superadmin/src/lib/superadminApi.ts`). |
| 9 | `933ee85` | `apps/superadmin/src/pages/BusinessDirectory.tsx` (new) — the Business Directory UI, wired into `App.tsx`'s navigation as "Directório". |

(Checkpoint 5 does not exist as a separate numbered commit — the
sequence's own commit messages number checkpoints 6 onward explicitly;
checkpoints 1–4 above are identified by content, not a self-declared
number, consistent with how the commits themselves are labeled.)

---

## 5. Verification Evidence

### Automated verification

**Non-emulator (source-level, executed and independently reproducible
in this environment):**

- `tests/superadmin-activity-touch.test.ts` — 12/12 pass
- `tests/superadmin-backfill-phase-e.test.ts` — 16/16 pass
- `tests/superadmin-business-directory.test.ts` — 31/31 pass
- `tests/superadmin-business-directory-api.test.ts` — 10/10 pass
- `tests/superadmin-business-directory-ui.test.ts` — 12/12 pass
- **Total: 81/81 passing**, re-run and confirmed multiple times across
  this session's work, most recently as part of this close-out's own
  verification pass.

**Emulator-dependent (Firestore emulator required — this sandbox's
network egress does not reach Google's emulator infrastructure, the
same standing, documented limitation as every prior emulator-dependent
verification in this repository):**

- `tests/superadmin-business-directory-firestore.test.ts` — **18
  tests, 6 suites, 18 passed, 0 failed.** This result was obtained and
  supplied by the Product Architect, running
  `npm run test:superadmin-business-directory-firestore:emulator` on a
  local machine with unrestricted network access — **not executed or
  independently reproduced within this Claude environment.** Recorded
  here as reported, external verification, consistent with how this
  repository has always treated results this sandbox cannot itself
  obtain.
- Per the Product Architect's own account, this suite specifically
  exercised: dimension-independent filtering and combined real-Firestore
  queries; `subscriptionStatusCache` reads with direct confirmation
  that the `subscriptions/` collection itself is never touched by the
  directory query path; real Firestore `orderBy` behavior across all
  three supported sort keys (name, `createdAt`, `lastActivityAt`); and
  cursor-based pagination via `startAfter` across a 105-row dataset,
  with page 1 returning exactly 100 rows and page 2 confirmed to have
  zero overlap with page 1.

### Live behavioral verification

The Product Architect directly opened `https://adminbpt.sabushtech.com`
in a live browser session and supplied a screenshot showing: the
"Directório" navigation item present in the SuperAdmin app; the
"Directório de Negócios" page loaded; real business records displayed,
including operational-activity status, subscription status, suspension
status, and creation dates; a working search field; activity/
subscription/suspension filter controls; a sort/ordering control; and
Apply/Clear controls.

**This Claude environment has no network access to production** —
confirmed directly this session: a `curl` to
`https://adminbpt.sabushtech.com/api/health` returned `HTTP 403` with
header `x-deny-reason: host_not_allowed` (the sandbox's own egress
proxy, not a production response), and `web_fetch` on the same URL was
independently rejected for the same reason. The behavioral verification
above is therefore Product-Architect-supplied, direct evidence — not
something reproduced or independently re-confirmed from within this
environment.

**Exact deployed Git SHA was not established.** An earlier investigation
this session found that Railway's deploy panels display commit hashes
(`44fed52e` for the `sabush-bpt-superadmin` service, `0a3522d4` for the
`sabush-bpt` service) that do not resolve to any commit anywhere in
this repository's full history (391 commits, all ten branches, checked
via full 40-character hash to rule out an abbreviation-length false
negative). This discrepancy remains unexplained. It does not block this
close-out — deployment was verified **behaviorally**, through the
production UI itself, which is direct evidence of what is actually
running, independent of what commit hash Railway's dashboard displays
for it.

---

## 6. Known Limitations / Non-Blocking Notes

- **The Railway-displayed commit hash discrepancy (§5, above) remains
  unresolved.** It is recorded honestly, not converted into a closure
  blocker now that behavioral deployment evidence exists directly from
  the production UI. If a future session wants to resolve it, the
  smallest next step (not performed by this close-out, which does not
  deploy anything) would be triggering a fresh Railway redeploy and
  confirming the resulting hash resolves against `main`.
- **`tests/superadmin-business-directory-firestore.test.ts`'s 18/18
  result is externally supplied, not independently reproduced in this
  environment** — recorded as such in §5, not overstated as this
  session's own execution.
- No other limitations specific to Phase E were identified during this
  close-out beyond what §2 already records as permanent historical
  fact.

---

## 7. Closure Decision

**Phase E is CLOSED.**

The implementation is accepted into the governed baseline.

Closure is based on:
- Retrospective governance acceptance
  (`18-superadmin-business-directory-retrospective-acceptance.md`).
- Scope-fidelity verification (§3, above) — no deviation found.
- 81 passing non-emulator tests (§5).
- 18/18 passing emulator tests, Product-Architect-supplied (§5).
- Direct production behavioral verification (§5).

---

## 8. Historical Integrity Statement

**This close-out does not retroactively change the fact that
implementation began before formal authorization was granted.** The
specification's own §24 language, the retrospective acceptance
document's full account, and the exact commit timestamps establishing
a 19-minute gap between that language being committed and
implementation beginning all remain part of the permanent record,
unaltered by this document. Closure records that the outcome was
verified and accepted — it does not, and cannot, make the sequence
itself have happened differently than it did.

---

## 9. Post-Closeout Status

**Phase E requires no further engineering work for closure.** Any
future UI polish, layout redesign, color-system work, or UX improvement
to the Business Directory is a **new initiative** and must not reopen
Phase E's completed governance status unless explicitly authorized as
new, separately-scoped work, following the Governance Standard's
Stages 1–8 in their proper order this time.

---

## Governance Notes

- This record does not modify BDR-0010, POL-18-001, the specification,
  or the retrospective acceptance document — it sits downstream of all
  four, closing based on their already-settled content.
- This record does not authorize any future phase or extension of the
  Business Directory — each requires its own governance record, per
  the Governance Standard's Non-Negotiable Principle 6 ("a governance
  artifact records; it does not decide").
- This record does not modify `server/activityTouch.ts`,
  `server/businessDirectory.ts`, `server/index.ts`,
  `apps/superadmin/*`, `server/subscriptionEngine.ts`,
  `firestore.rules`, or `firestore.indexes.json`. None were touched to
  produce this close-out.
- **Lifecycle:** Implemented (out of sequence) → Retrospectively
  Accepted → Verified (§5) → **Closed** (this document). Any future
  extension of Business Directory functionality begins as its own,
  separate engineering milestone, gated on its own Rule 8 Assessment
  and its own explicit Product Architect authorization — this time in
  the order the Governance Standard actually prescribes.
