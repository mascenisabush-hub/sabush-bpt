# Module #17 (Owner Portfolio) — v0.2 Addendum — `currentWorth` Mechanism — Rule 8 Assessment

**Type:** Rule 8 Assessment. Planning only. **Does not authorize
implementation.**
**Lifecycle status:** Designed → Concept Approved (`115c94c`) →
Planned (`8365236`) → **Assessed**. Not Authorized, not Implemented,
not Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision,
per this repository's own governance standard.
**Basis:** [`17-owner-portfolio.md`](../specs/17-owner-portfolio.md)
(v1.0, ✅ Approved), [`17-multi-shop-addendum-owner-portfolio.md`](../specs/17-multi-shop-addendum-owner-portfolio.md)
(v0.2, ✅ Concept/Specification Approved, `115c94c`), the Implementation
Plan (`8365236`) §5.5, §5.8, §5.16, [Platform Engineering Governance
Standard](./platform-engineering-governance-standard.md).
**Repository state at assessment time:** addendum branch
`docs/spec-17-owner-portfolio-addendum` @ `8365236`; `main` @
`c775503`, confirmed unchanged; `115c94c` and `8365236` both confirmed
present and correctly identified; no discrepancy found.

**Historical note on this artifact's own creation, stated plainly:**
this assessment was originally performed and delivered as a
conversational report, not committed as a repository file at the time.
It is being committed now, as its own artifact, to give the governance
chain a citable record independent of that conversation — a gap
surfaced by a later Governance Reconciliation Scope Determination. Its
substance below is transcribed faithfully from the assessment as it
was actually performed and concluded, at that time, against that
baseline. **Nothing below has been revised, improved, or rephrased in
light of the Product Architect decision that was made after this
assessment concluded.** Where this artifact's own creation date
postdates that decision, the assessment's *content* still reflects
only what was known and concluded at assessment time — see the
Historical Boundary at the end of this document.

**Nothing in `src/`, `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*` file was modified to
produce this document.**

---

## A. Baseline Verification

- Branch: `docs/spec-17-owner-portfolio-addendum`, `HEAD` = `8365236`
  (the Implementation Plan commit), working tree clean.
- `origin/main` = `c775503`, confirmed unchanged, confirmed `115c94c`
  and `8365236` both not reachable from `main`.
- All code findings below drawn directly from `main`'s actual current
  content (`git show origin/main:<path>`), not from this addendum
  branch's own working tree, which was 226 commits behind `main` and
  predated the repository's monorepo restructuring at assessment time
  — a distinction the assessment's own drafting process caught and
  corrected against itself before relying on any file path.

## B. Governing Documents Reviewed

`docs/specs/17-owner-portfolio.md`, `docs/specs/17-multi-shop-addendum-owner-portfolio.md`
(the current, corrected-and-concept-approved v0.2 text, specifically
the "Current Worth Cache Definition" and "Security Constraints"
sections), `docs/engineering/17-owner-portfolio-addendum-implementation-plan.md`
(§5.4–§5.9, §5.16), `docs/engineering/platform-engineering-governance-standard.md`.

## C. Current Codebase Findings

- `businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime`
  (`apps/tenant/src/context/AppContext.tsx`), derived from
  `calculateInventoryTotals(batches, quebras)`
  (`apps/tenant/src/utils/calculations.ts`) plus raw sums of `expenses`
  and `withdrawals`.
- All four contributing collections (`batches`, `quebras`, `expenses`,
  `withdrawals`) are loaded via `onSnapshot(collectionRef, ...)` with
  **no query, no filter, no limit** — the entire history of each, for
  the active business only. For a business with years of activity,
  this is a non-trivial document volume, directly relevant to §J.
- `ownedBusinesses` maintains one live per-document listener per owned
  business — the free read path for any new `Business` field.
- `businesses/{businessId}` `allow update` rule: owner may write any
  field except `suspended`, to any owned business, evaluated by
  `isOwnerOf` → `isMemberOf` → `businessId in ownedBusinessIds()` — not
  gated by "active" status.
- `currentWorth` did not exist anywhere in the codebase at assessment
  time — confirmed via a full `git grep` across `origin/main`, zero
  results. Clean slate, no conflict risk.
- `calculateInventoryTotals` is a pure function
  (`batches: StockBatch[], quebras: Quebra[]`) with no browser-only
  dependency — technically portable to a server context. **However**,
  cross-app code reuse from `apps/tenant/src/` into `server/` had
  exactly one existing precedent in the codebase at assessment time
  (`server/notificationPlatform.ts` importing i18n locale
  dictionaries) — and that precedent is **static data reuse, not
  business-logic-function reuse**. No server module imported and
  executed a tenant-side calculation function.
- No offline-persistence configuration
  (`enableIndexedDbPersistence` or equivalent) existed in
  `apps/tenant/src/lib/firebase.ts` at assessment time.

## D. `currentWorth` Definition

From the approved addendum's own text, as it read at assessment time:

- A per-shop snapshot of what the Business Worth Engine would report
  for that shop, at some point in time.
- Technically: `{ value, calculatedAt, sourceRevision? }`, explicitly
  **not** the authoritative source — a cache of an authoritative
  computation happening elsewhere.
- Explicitly point-in-time and lazy, by the addendum's own words — not
  continuously maintained.
- Contributing records identical to `businessWorth`'s own inputs — the
  addendum required zero formula divergence.
- The addendum's own Acceptance Criteria required `currentWorth` to
  "never diverge from what the Business Worth Engine would compute
  live for that shop **at cache-write time**" — an explicit,
  deliberate acceptance of point-in-time correctness, not live
  correctness. Staleness was already designed-in at assessment time,
  not a defect this assessment needed to eliminate.

## E. Candidate Evaluation

Three candidates were considered at assessment time. **This assessment
did not select between them — it is recorded here as it stood at
assessment time, including the fact that no selection had yet been
made.**

### Candidate A — Client-side, active-visit-triggered mirror write

Worth already computed live, client-side, whenever a shop is the
active business; mirror that value into
`businesses/{businessId}.currentWorth` at that moment, using the
existing owner-write permission.

- Correctness: high — reuses the exact, unmodified formula, zero
  duplication.
- Freshness: bounded by how recently the Admin actually visited that
  shop — for a rarely-visited shop, this could mean weeks-old or
  entirely absent data. Identified at assessment time as this
  mechanism's central weakness.
- Tenant isolation: clean — the write only ever targets the caller's
  own currently-active business, via the existing, unmodified
  `isOwnerOf` check.
- No new read/write data volume beyond what the active business
  session already incurs today.

### Candidate B — Server-side calculation/maintenance

Two sub-variants, evaluated separately at assessment time because they
carried materially different risk profiles:

- **B1 — Background/scheduled sweep.** Identified at assessment time
  as **explicitly forbidden by the approved addendum's own text**:
  *"Never a background job, scheduled recompute, or write-triggered
  hook."* Not treated as a live option — recorded as considered and
  ruled out by prior, already-approved governance.
- **B2 — Request-triggered, single-business, server-side
  compute-and-cache**, called once per owned shop from the Portfolio
  screen. Assessed at that time as requiring either duplicating the
  worth formula server-side (formula-drift risk, against the
  addendum's own Non-Goal) or a genuinely new, unprecedented cross-app
  reuse of `calculateInventoryTotals`. A genuinely new server-side read
  cost was identified — reading the same unfiltered collections for
  each non-active shop, on-demand, per Portfolio view.

### Candidate C — Explicit, per-shop, user-triggered refresh action

Surfaced during this assessment as a possibility genuinely worth
naming, **not selected by this assessment** — recorded as an option for
a future decision, per §L. A UI affordance on each Portfolio row that,
when the Admin explicitly acts on it, computes and writes
`currentWorth` for that one specific shop. At assessment time, this was
identified as directly addressing Candidate A's central weakness
(staleness for rarely-visited shops) without violating the addendum's
explicit constraints, but its inclusion in scope, and its exact backing
mechanism, were both left as open questions for a subsequent decision.

## F. Tenant Isolation Analysis

For every candidate: the write and read surfaces were all found to be
scoped through the existing, unmodified `isOwnerOf`/`isMemberOf`
functions, resolving per-document against the caller's own
`ownedBusinessIds` — not against session state like "active business."
No candidate proposed any new aggregation query, any new cross-tenant
read path, or any mechanism by which Owner A could read Owner B's
data.

## G. Freshness / Consistency Analysis

- The addendum's own Acceptance Criteria already accepted
  eventual/point-in-time consistency explicitly — a settled,
  already-approved requirement at assessment time, not open for this
  assessment to reinterpret.
- **Under Candidate A alone, a shop was found capable of becoming
  permanently stale if never revisited** — identified as a real,
  structural property, not a transient edge case, and the single most
  important input to §L's required decisions.
- No candidate was found to risk two users seeing genuinely *different*
  values for the same cache-write moment.

## H. Failure / Recovery Analysis

- Under Candidate A: a failed mirror write simply doesn't happen for
  that visit — consistent with this codebase's own established
  best-effort write precedent (`touchBusinessActivity`,
  `logTimelineEvent`).
- No candidate was found to couple the underlying business operation's
  success to the cache write's success — confirmed structurally, not
  merely asserted.
- Retry, duplicate execution, and partial failure were all assessed as
  low-risk under every candidate, since none involve an operation whose
  repetition could corrupt state (overwrite-with-latest only, no
  increment or append).

## I. Security / Trust Analysis

`currentWorth` was confirmed, by the addendum's own explicit Non-Goals
and Security Constraints, to be **read only by the Owner Portfolio
itself** — never by Dashboard, Reports, the Business Worth Engine,
Closings, or any Module #3–13 screen, and never by any server-side
decision logic. Given that, a client-side write (Candidate A) was
assessed as carrying meaningfully lower risk than a field like
`subscriptionStatusCache` (Phase E's own precedent, chosen server-side
specifically because other logic depends on it) — a malicious or buggy
client could only corrupt what that same Owner sees about their own
shop's cached worth, on a screen nothing else reads.

## J. Performance / Scalability Analysis

- Candidate A: zero new reads (reuses `ownedBusinesses`); zero new
  writes beyond what the active-business session already does today.
- Candidate B2: genuinely new server-side reads — the full, unfiltered
  contributing collections, per non-active shop, per Portfolio view.
  For an Admin with several established, high-activity shops, this was
  identified as a meaningful new read cost this codebase doesn't incur
  anywhere else for a summary screen.
- No numerical read/write budgets existed anywhere in the repository
  to check candidates against at assessment time — this was a
  qualitative comparison only, as the evidence at that time permitted.

## K. Comparative Decision

The addendum's own text — "Never a background job, scheduled
recompute, or write-triggered hook," combined with "never a query...
across more than one `businessId` in a single call" — was found at
assessment time to narrow the viable mechanism space more than the
Implementation Plan's own framing had suggested. B1 was found not to
be a live option at all. B2 was found to survive only under a specific
reading of "single call" this assessment was not certain the
addendum's authors had intended.

## L. Required Decisions

This assessment concluded that the remaining question was not purely
technical — it identified three questions requiring a **product
decision**, not something this assessment was positioned to resolve
itself:

1. Whether permanent or long-duration staleness for rarely-visited
   shops is acceptable, given it could undermine the Owner Portfolio's
   own stated purpose.
2. Whether an explicit per-shop refresh action (Candidate C) should be
   added to the approved scope, and if so, via which backing
   mechanism.
3. Whether, if Candidate B2 is ever considered, establishing a new
   precedent for cross-app business-logic reuse should be authorized.

**None of these were resolved by this assessment.** They were recorded
as open, for the Product Architect to decide.

## M. Rule 8 Conclusion

## **READY AFTER DECISIONS**

Not "Not Ready" — no technical, architectural, or tenant-isolation
obstacle was found that blocked proceeding; every candidate was
grounded, buildable, and consistent with the codebase's existing
patterns to varying degrees, at assessment time. Not "Ready" or "Ready
after minor preparation" — because the mechanism choice was found to
be entangled with a real product question (§L.1) materially affecting
whether the shipped feature would actually deliver the value the
addendum's own Purpose section describes.

---

## Historical Boundary — What This Assessment Did and Did Not Know

**This assessment did not know, and did not assume:**

- that explicit per-shop refresh would be selected;
- that visible `calculatedAt` would become a required UX behavior;
- that the client-side Business Worth Engine would definitely be
  retained as the sole calculation source going forward;
- that the Product Architect would decline the server-side
  alternative;
- how, or whether, the specification would subsequently be amended.

Those were all resolved **after** this assessment, by a separate,
subsequent Product Architect decision. This artifact records the
assessment exactly as it was performed and concluded — it does not
incorporate, anticipate, or retroactively align itself with that later
decision.

**The assessment did not authorize implementation and did not select a
final mechanism. Subsequent Product Architect decisions are outside
the scope and chronology of this assessment.**

---

## Governance Notes

- This artifact does not modify `115c94c`, `8365236`, or any other
  existing governance document — it is a faithful, later transcription
  of an assessment that already occurred, not a new assessment.
- The Product Architecture decision that followed this assessment, and
  its incorporation into the governing specification and Implementation
  Plan, are recorded separately — see the corresponding Stage 2
  Specification Amendment and Stage 6 Implementation Plan amendment.
  This document does not describe or anticipate their content.
- **Lifecycle:** Concept Approved → Planned → **Assessed** (this
  document) → *(subsequently, recorded elsewhere)* Product Architecture
  Decision → *(pending)* Amendment Acceptance → *(pending)*
  Implementation Authorization → *(pending)* Implemented.
