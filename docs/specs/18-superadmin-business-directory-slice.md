Business Domain Specification — Slice

# SuperAdmin — Business Directory (Phase E)

**Version 1.2** — the two-field range query (§13, Resolution Log Item
2) has been confirmed against a real Firestore emulator: 6/6 tests
passed, including the critical combined-range shape and both the
14-day and 45-day POL-18-001 boundaries. This was the sole remaining
blocker on the prior Rule 8 Assessment's `ENVIRONMENT BLOCKED`
verdict.
**Status:** Drafted, Rule 8-ready (§24). No stored bucket field, no
fallback field, no remaining technical uncertainty in the query design.
A formal Rule 8 re-affirmation recording this result is the next
governance step, prior to implementation authorization.
**Governing decisions:** [BDR-0010](./BDR-0010-superadmin-business-directory.md)
(Approved), [POL-18-001](./18-pol-001-operational-activity-state-model.md)
(Approved), [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(Approved, implemented — the four phases this slice extends).
**Location note:** Filed as a new, separate slice document, not an
amendment to [`18-superadmin.md`](./18-superadmin.md) — following the
same precedent [`18-19-payment-operations-slice.md`](./18-19-payment-operations-slice.md)
(ADR-0005) and [`18-superadmin-v1-operational-control-plane-slice.md`](./18-superadmin-v1-operational-control-plane-slice.md)
(ADR-0006) already established: `18-superadmin.md` remains the
full-module vision document, not yet implementation-authorized as a
whole; each authorized vertical slice gets its own document rather
than editing that base file.
**Depends on:** Phase B's existing `server/businessVisibility.ts`
(`searchBusinesses()` — the exact reuse target for this slice's search
requirement); Phase C's `businesses/{businessId}.suspended` field;
[POL-19-005 — Subscription State Model](./19-pol-005-subscription-state-model.md)
(the six approved subscription-state values, read here, never
redefined); `server/subscriptionEngine.ts` and `server/index.ts`'s
existing, exclusively server-side writers of `subscriptions/{businessId}.status`.
**No new ADR is created by this specification.** Whether Phase E
requires its own ADR (parallel to ADR-0005/0006) or can proceed
directly to a Rule 8 Assessment under BDR-0010's existing authorization
is itself flagged as an open governance question — see §23.

---

## 1. Purpose

Give SuperAdmin operators a single, searchable, filterable, paginated
view of every business on the platform — answering "which businesses
exist, and what state is each one in" — without turning SuperAdmin
into a management console, analytics platform, or ERP. This slice
operationalizes BDR-0010 and POL-18-001 into functional requirements
precise enough for a Rule 8 Assessment.

## 2. Scope

In scope: a new `Negócios` directory list (distinct from, and feeding
into, the existing single-business search/detail views from Phase B),
server-side search/filter/sort/pagination, and the minimum data-model
changes required to make Operational Activity and Subscription State
genuinely server-side queryable alongside the already-queryable
Suspension field.

Out of scope: everything §21 names explicitly. This slice does not
redesign Phase B's `BusinessSearch.tsx`/`BusinessDetail.tsx` — it adds
a new, higher-level list view that a directory row can navigate into,
reusing those existing screens unchanged as the destination.

## 3. Governing Decisions (restated, not re-litigated)

- **BDR-0010** — four independent dimensions (Operational Activity,
  Subscription State, Suspension, Plan), never collapsed into one
  field; V1 UX boundaries; the `lastActivityAt` server-authoritative
  requirement (mechanism deliberately left open); the never-block
  failure requirement.
- **POL-18-001** — the four Operational Activity states (`New` /
  `Active` / `Inactive` / `Dormant`), their thresholds (14/45/30 days,
  explicitly provisional per that policy's own terms), and
  `timelineEvents` as the sole activity source.

This specification does not alter either document. Where a decision
in this specification touches a threshold or state definition, it
cites POL-18-001 rather than restating it independently.

## 4. Business Requirements (User Stories)

1. As a SuperAdmin, I can open a Business Directory and see every
   business on the platform, paginated, without loading the entire
   population into my browser.
2. As a SuperAdmin, I can search by business name or ID and get
   results without waiting for a full-collection scan.
3. As a SuperAdmin, I can filter by Operational Activity, Subscription
   State, and Suspension — independently and in any combination — and
   get results that satisfy all currently-selected filters at once.
4. As a SuperAdmin, I can sort by last activity, created date, or
   name.
5. As a SuperAdmin, I can see at a glance which dimension (activity,
   subscription, suspension) is driving a business's overall picture,
   because the four dimensions are always displayed and never merged.
6. As a SuperAdmin, clicking a row takes me to the existing Business
   Detail view — I never need a second, duplicate detail surface
   inside the directory itself.
7. As a SuperAdmin, a brand-new business with no activity yet does not
   appear as `Dormant` — it correctly shows as `New`, per POL-18-001.

## 5. Operational State Model (restated from POL-18-001, for reference only)

`New` (first 30 days from `createdAt`) → `Active` (`lastActivityAt`
within 14 days) → `Inactive` (15–45 days) → `Dormant` (more than 45
days). Authoritative definition remains POL-18-001; this section exists
only so this specification is self-contained enough for Rule 8
purposes without requiring the reader to cross-reference constantly.

## 6. Data Model

### 6.1 `businesses/{businessId}` — two new fields required

```
Business {
  ...existing fields, unchanged...
  lastActivityAt?: string;       // NEW — see §7
  subscriptionStatusCache?: string; // NEW — see §6.3
}
```

Both are optional, additive, non-breaking to any existing document or
consumer — matching this codebase's own established convention for
every prior optional-field addition (`suspended` in Phase C is the
direct precedent).

### 6.2 Owner data

No change. Already available via the existing Phase B pattern
(`users/{ownerUid}` lookup from `businesses/{businessId}.ownerUid`,
already implemented in `server/businessVisibility.ts`'s
`fetchBusinessDetail`). The directory's list view does **not** need
owner detail per row at list-query time — see §6.4 (display-only
fields) — it is fetched only when a row is expanded or clicked
through to Business Detail, exactly as today.

### 6.3 Subscription State — the second denormalization this slice requires, and why it is materially simpler than `lastActivityAt`

**Finding, confirmed by direct inspection, not assumed:** every write
to `subscriptions/{businessId}.status` already occurs exclusively in
`server/subscriptionEngine.ts` and `server/index.ts` — both
server-side, both already Admin-SDK-mediated. `firestore.rules`
already sets `allow write: if false` on this collection — **no client
write path to subscription status exists at all, today, for any
role.** This means the Staff-permission gap and the untrusted-client-clock
problem that made `lastActivityAt`'s mechanism a genuinely open
question (BDR-0010 Part 5) **do not apply here** — there is no
client-side actor to distrust, because none can write this field in
the first place.

**Recommendation (specification-level, not merely deferred as open):**
mirror `subscriptions/{businessId}.status` onto
`businesses/{businessId}.subscriptionStatusCache` at the same moment
the authoritative field is written, inside the same already-existing,
already-server-side write sites. This satisfies Architecture §7.1's
existing bar for acceptable denormalization ("display/filter
convenience... never a second source of financial truth," with the
live source record always winning) — `subscriptions/{businessId}.status`
remains the sole authoritative value for any financial/lifecycle
decision; `businesses/{businessId}.subscriptionStatusCache` exists
purely so the directory can filter/sort by it in one query, and is
never read by anything that makes a subscription-governing decision.

**Why this is necessary, not optional:** BDR-0010 requires Operational
Activity, Subscription State, and Suspension to be **independently
combinable, server-side** filters. Firestore cannot filter one
collection's query by a field that lives on a different collection —
`subscriptions/{businessId}` and `businesses/{businessId}` are
separate documents. Without this mirror, a combined query like
"Active AND Grace Period AND not-Suspended" is not expressible as one
Firestore query at all; it would require either N individual
subscription reads per page (defeating pagination's own purpose) or
client-side intersection of separately-fetched ID sets (the exact
anti-pattern BDR-0010 explicitly rules out).

**Consistency requirement:** `subscriptionStatusCache` must be updated
in the same logical operation as the authoritative write — not via a
separate, potentially-delayed background process — so it can never
diverge from `subscriptions/{businessId}.status` for longer than the
single write operation takes. Given both fields would be written from
the same already-existing server code path, this is a same-request
update, not an eventually-consistent one.

### 6.4 Field classification

| Field | Class | Notes |
|---|---|---|
| `businesses.name` | Queryable (existing) | Already used by Phase B's search |
| `businesses.id` (doc ID) | Queryable (existing) | Exact-match lookup, already implemented |
| `businesses.createdAt` | Queryable (existing) | Needed for sort and for the `New` window calculation |
| `businesses.suspended` | Queryable (existing, Phase C) | |
| `businesses.lastActivityAt` | **Queryable — new, §7** | |
| `businesses.subscriptionStatusCache` | **Queryable — new, §6.3** | Cache only, never authoritative |
| Operational Activity (`New`/`Active`/`Inactive`/`Dormant`) | **Derived, computed at query/response time — no stored field** | Resolved (see §23, Item 2): expressed as compound range queries on `createdAt` and `lastActivityAt` directly, computed fresh every time using a server-computed "now" reference. No background aging process, no stale bucket to go wrong — the "monitoring surface, not operational subsystem" principle applied directly. |
| `businesses.ownerUid` | Queryable (existing) | Not needed for list-query filtering, only for detail lookup |
| Owner name/email | Display-only | Fetched only on row expansion/detail click-through, never at list-query time, per §6.2 |
| Plan identifier | Display-only for V1 | No filter/sort requirement on Plan in BDR-0010's approved V1 scope; read directly from `subscriptions/{businessId}.planId` at detail time only, no denormalization needed since it's never filtered |

## 7. `lastActivityAt` — Architecture Requirements (mechanism deliberately not selected here, per BDR-0010 Part 5)

**Purpose:** a server-queryable representation of the most recent
`timelineEvents` entry for a business.

**Source:** `timelineEvents` exclusively (POL-18-001), reached through
the platform's existing, single shared activity-logging mechanism —
confirmed, this session's investigation, to already funnel fourteen
distinct client-triggered activity types through one function.

**Owner activity vs. Staff activity:** must be captured identically —
this is the entire reason the original "write it inside the
client-side function" approach was rejected (BDR-0010 Part 5, POL-18-001).
Whatever mechanism the Rule 8 Assessment selects must not create any
asymmetry between an Owner's and a Staff member's activity being
recorded.

**Server authority:** the timestamp recorded must originate from the
privileged server's own clock, never a client-supplied value — closing
both the permission gap and the trust gap in one requirement, per
BDR-0010 Part 5's four binding constraints (restated, not repeated
here in full).

**Failure behavior:** per BDR-0010 Part 6 and POL-18-001's own scope
boundary — an update failure never blocks, fails, or invalidates the
underlying business action. The directory may show temporarily stale
activity information; this is an accepted, explicit tradeoff, not a
defect to be engineered away with retry infrastructure this
specification does not authorize inventing.

**Businesses with no `timelineEvents` yet:** `lastActivityAt` remains
absent/undefined. Per POL-18-001's `New` rule, this is handled
correctly by precedence — see §8 — not by treating absence as
`Dormant`.

**Historical backfill — investigated, resolved (Open Item 1, §23
resolution log).** `lastActivityAt` does **not** exist on any business
document today (confirmed by direct repository search, this session).
**Resolution: a one-time backfill migration is required, not natural
population.** Without it, every business older than 30 days would show
`Dormant` on launch day regardless of real activity, undermining the
directory's own purpose on first use. The migration reads each
business's most recent existing `timelineEvents` entry (if any) and
writes the result once to `lastActivityAt`; businesses with genuinely
zero `timelineEvents` history remain correctly absent, not backfilled
to a synthetic value. This is a bounded, one-shot script — not ongoing
sync infrastructure, and does not conflict with the "monitoring
surface, not operational subsystem" principle.

## 8. Precedence: `createdAt` vs. `lastActivityAt`

Evaluated in this order, always:

1. **Is the business within 30 calendar days of `createdAt`?** If yes
   → `New`, regardless of whether `lastActivityAt` exists or what it
   contains. A highly active brand-new business is still `New` — this
   is a statement about age, not engagement (POL-18-001).
2. **Otherwise**, evaluate `lastActivityAt` against the 14/45-day
   thresholds. A business past its `New` window with no
   `lastActivityAt` at all (per §7's backfill question) is treated as
   `Dormant` — no activity ever recorded, past the onboarding grace
   period, is definitionally the `Dormant` case, not an error state.

### Worked examples

| Case | `createdAt` age | `lastActivityAt` | Result |
|---|---|---|---|
| Brand-new, zero events | 2 days | absent | `New` |
| New business, one early event | 10 days | 1 day ago | `New` (age rule wins outright) |
| Healthy, regular use | 200 days | 3 days ago | `Active` |
| Slowing down | 200 days | 20 days ago | `Inactive` |
| Gone quiet | 200 days | 60 days ago | `Dormant` |
| Old business, never used | 200 days | absent | `Dormant` (per §7's no-backfill consequence, if that option is chosen) |
| Subscription differs from activity | 200 days, `Active` operationally | — | `Active` **and** `Grace Period` simultaneously — both shown, never merged (BDR-0010 Part 1/3) |
| Suspended but recently active | 200 days, 1 day ago | — | `Active` **and** `Suspended` simultaneously — a real, valid, and specifically useful-to-see combination (a business someone suspended *while* it was clearly still in active use) |

## 9. Search

**Reuses `server/businessVisibility.ts`'s existing `searchBusinesses()`
pattern directly** — exact-ID match plus name-prefix range query,
already implemented, already proven (Phase B). No second search
architecture is introduced. The directory's search is this same
function, extended only insofar as its result rows now also carry the
new Operational Activity/Subscription/Suspension fields for display —
not a rewritten query.

## 10. Filters — Server-Side, Independently Combinable

Three filters, each optional, all combinable — with one precise
exception (resolved, Open Item 3, §23 resolution log: search cannot
combine with the Activity filter in one query; see below):

- **Operational Activity** — resolved (Open Item 2, §23 resolution
  log): expressed as a compound range query on `createdAt` and
  `lastActivityAt` directly, computed at query time from a
  server-computed "now" reference — no stored bucket field, no
  background aging process. **This specific combination (two
  different fields, both with inequality operators) has zero existing
  precedent anywhere in this codebase** — every existing range-query
  usage in this project (Phase D, Phase B's search, the trial/grace
  sweeps) is always a range on a single field. This must be
  empirically verified against a real Firestore engine before Rule 8
  finalizes the query design (§13) — the preferred, lightest-weight
  design, not yet a proven one.
- **Subscription State** — filters on `subscriptionStatusCache` (§6.3).
- **Suspension** — filters on the existing `suspended` field (Phase C,
  already proven queryable).

No client-side filtering of an unfiltered, fully-loaded business
population, at any scale — every filter combination that is a real
Firestore query is exactly that, per BDR-0010's own explicit
requirement. The one narrow exception (search + Activity, resolved
below) filters an already-small, already-fetched result set, not the
full population — a materially different, and explicitly permitted,
case.

## 11. Sorting

Exactly three options, per BDR-0010: `lastActivityAt` (descending, most
recent first, matching every other "recent activity" surface this
platform already has — Phase D's audit log, notably), `createdAt`,
`name`. No arbitrary sort-by-any-field capability.

## 12. Query Matrix

| Combination | Firestore shape | Index needed? |
|---|---|---|
| No filters, sort by name | `.orderBy('name').limit(100)` | No — single-field, automatic |
| No filters, sort by createdAt | `.orderBy('createdAt', 'desc').limit(100)` | No |
| No filters, sort by lastActivityAt | `.orderBy('lastActivityAt', 'desc').limit(100)` | No |
| Suspension only | `.where('suspended','==',x).orderBy(<sort field>).limit(100)` | **Yes** — one composite per sort-field choice (3 total: `suspended`+name, `suspended`+createdAt, `suspended`+lastActivityAt) |
| Subscription only | `.where('subscriptionStatusCache','==',x).orderBy(<sort field>)` | **Yes** — 3 composites, same pattern |
| Operational Activity only | `.where('createdAt','<',ageCutoff).where('lastActivityAt','>=',activityCutoff).orderBy(<sort>)` (or the equivalent bound pair for Inactive/Dormant) — resolved (Item 2), pending the empirical two-field-range verification above | **Yes, and shape unconfirmed** until that verification completes — likely a distinct composite per state × sort-field combination |
| Suspension + Subscription | `.where('suspended','==',x).where('subscriptionStatusCache','==',y).orderBy(<sort>)` | **Yes** — up to 3 more composites, standard equality+equality+sort shape, same pattern Phase D already proved |
| Suspension + Activity | Three fields needing range/equality together — depends on the same Item 2 verification | Depends |
| Subscription + Activity | Same | Depends |
| All three | Combines two range fields with two equality fields plus a sort — the most demanding shape in this matrix, entirely dependent on Item 2's verification outcome | Depends |
| Search + Suspension or Subscription (equality filters) | `.where('name','>=',q).where('name','<=',q+'\uf8ff').where('suspended','==',x)` — resolved (Open Item 3): standard equality+range shape, directly matching Phase D's already-proven `actionType == x AND timestamp range` pattern. **Combines in one server-side query.** | **Yes** — one composite per filter × sort combination, same well-precedented shape |
| Search + Operational Activity | **Resolved (Open Item 3): does not combine in one query.** Combining a `name` range with two more range fields (`createdAt`, `lastActivityAt`) goes well beyond even Item 2's already-untested two-range case. Instead: run the existing `searchBusinesses()` query unchanged (capped at `SEARCH_RESULT_LIMIT = 20`, confirmed in code), then apply the Activity filter as a small, bounded post-filter step on that already-fetched result set. Filtering 20 already-retrieved rows is not the full-population anti-pattern BDR-0010 prohibits. | No — no query-level index needed for this specific combination, since it's not expressed as one Firestore query |
| Pagination after filtering/sorting/search | Cursor-based (`startAfter`), not offset-based — matches Firestore's own recommended pattern; the last document of the current page becomes the cursor for the next | N/A |

**Total index count:** deliberately not finalized here — depends
entirely on Item 2's empirical verification outcome (§13). Following
Phase D's own lesson exactly: get the real query shapes confirmed
first, then enumerate indexes precisely, rather than guessing a number
now.

## 13. Firestore Index Strategy

No index currently exists on `businesses` for any of these query
shapes — confirmed, zero composite indexes on this collection today.
This is a clean design surface, not a legacy constraint. Per Phase D's
own hard-won lesson: **index requirements must be enumerated from the
final, settled query implementation, not guessed in advance.**

**The governing verification this specification required before Rule 8
could finalize any index list — CONFIRMED, real Firestore emulator,
this session:** a query combining inequality/range filters on two
different fields (`createdAt` and `lastActivityAt` together, Item 2 of
§23's resolution log) genuinely executes. Six tests, including the
exact combined-range shape and both the 14-day and 45-day boundary
values from POL-18-001, all passed against a real engine — not
analytical reasoning, not an in-memory fake. **The Operational
Activity filter needs no new stored field.** No fallback
(`businessAgeExpiresAt`) is required. The index list stays close to
what §12's matrix already sketches — exact enumeration remains a Rule
8 implementation-stage task, but the design uncertainty that
previously blocked it is resolved.

## 14. Authorization

No change to the existing authorization model. Same chain as every
`/api/superadmin/*` route since Payment Operations:
`requireAuth → requirePlatformOperator → requireSuperAdmin`. Tenant
users can never reach this capability — no tenant-facing route, no
tenant Firestore read path is introduced. Staff (tenant-side staff,
not platform operators) have no access, same as every other SuperAdmin
capability. SuperAdmin operators see exactly the fields §6.4
classifies as returned — no raw Firestore document passthrough, same
discipline every prior phase has held.

## 15. Business Detail Integration

Selecting a directory row navigates to the existing Business Detail
view (Phase B/C, unchanged). No duplicate detail rendering inside the
directory itself. No inline action of any kind is added to a directory
row beyond navigation.

## 16. Failure / Consistency Model

- **`lastActivityAt` update fails:** underlying business action
  unaffected (§7, BDR-0010 Part 6).
- **`subscriptionStatusCache` mirror write fails:** the authoritative
  `subscriptions/{businessId}.status` write is unaffected — same
  never-block principle applied symmetrically to this slice's second
  denormalized field, not just the first.
- **Subscription lookup fails at directory-query time:** not
  applicable under the recommended design (§6.3) — the cache is
  already on the document being queried, no live cross-collection
  lookup happens per row.
- **Owner lookup fails:** only relevant at detail-click-through time,
  already governed by Phase B's existing, unchanged behavior.
- **A business has no `timelineEvents`:** correctly handled by §8's
  precedence rule, not an error state.
- **Pagination cursor becomes invalid** (e.g., the underlying document
  was deleted mid-session): standard Firestore cursor behavior — the
  next page request simply returns from the next-valid position; no
  new handling this specification needs to invent.
- **Search returns no results:** an empty result set, not an error —
  matching every existing empty-state pattern in this codebase.
- **Business deletion/archival:** no such concept exists in this
  codebase today (`businesses/{businessId}` has `allow delete: if
  false`, confirmed, unconditional) — not a real case this
  specification needs to handle.

## 17. Performance / Scale

Designed for hundreds to low thousands of businesses, matching this
platform's actual stage — not hypothetical millions. Server-side
pagination (100-row cap, matching Phase D's precedent) bounds every
query's cost regardless of total collection size. The denormalization
in §6.3/§7 exists specifically to avoid the N+1 read pattern this
section would otherwise require — one query returns everything needed
for one page of results, no per-row subscription lookup, no per-row
`timelineEvents` scan.

## 18. Migration / Backfill

See §7's explicit, unresolved backfill question for `lastActivityAt`.
For `subscriptionStatusCache` (§6.3): every existing business already
has a `subscriptions/{businessId}` document (per this platform's
existing provisioning orchestrator, confirmed by ADR-0001) with a real
`status` value — a one-time backfill copying that existing, already-correct
value onto `businesses/{businessId}.subscriptionStatusCache` is
low-risk and mechanically simple, unlike `lastActivityAt`'s genuinely
open question. This specification recommends performing this backfill
migration as part of Phase E's implementation, not left open — flagged
as settled, not §23-open, precisely because the source data already
exists and is already trustworthy.

## 19. Internationalization

SuperAdmin (`apps/superadmin`) has no i18n system today — confirmed,
every existing screen (Payment Operations through Audit Center) uses
hardcoded Portuguese strings directly, unlike `apps/tenant`'s full
`TranslationDict`-based system. This specification does not introduce
i18n infrastructure into SuperAdmin — that would be a disproportionate
addition for one feature. It does, however, keep **internal values**
(the exact POL-18-001 identifiers: `new`/`active`/`inactive`/`dormant`)
strictly separate from **display labels** (Portuguese strings, matching
the existing SuperAdmin convention exactly, e.g. `AuditTrail.tsx`'s
own `ACTION_LABELS` lookup-with-fallback pattern) — so that if
SuperAdmin ever adopts the tenant app's i18n system later, these
labels are already cleanly separable, not entangled with logic.

## 20. Audit Behavior

**Investigated, not assumed:** Phase B's existing precedent is exact
and directly applicable — the *search/list* read (`searchBusinesses`)
is **not** audited (matches the existing tier already established for
the Operators list and the Business search list — a plain read, same
class as every other unaudited list view in this codebase). The
*single-business detail* read (`fetchBusinessDetail`) **is** audited
(`business.viewed`, justification-required). **This specification
proposes no new audit event.** Viewing or searching the directory list
itself remains unaudited, following the existing precedent exactly;
clicking through to a specific business's detail already triggers the
existing `business.viewed` audit entry, unchanged, since that's the
same existing Business Detail screen (§15) — no new audit surface is
introduced by this slice at all.

## 21. Out of Scope (V1)

Bulk actions of any kind; inline business editing; charts or analytics
dashboards; business financial analysis; subscription management or
mutation; plan management or mutation; tenant data editing; any
replacement of the existing Business Detail or Audit Trail screens;
any tenant-facing change; any unrelated refactoring. Every write path
an operator can reach remains exactly what Phases A–D already
authorize — this slice adds zero new mutation capability.

## 22. Acceptance Criteria

*Recorded now as a fixed target, per this repository's established
convention — verifiable only once implementation exists.*

- [ ] The directory shows every business on the platform, paginated at
      100 per page, server-side.
- [ ] Search by name or ID reuses Phase B's existing
      `searchBusinesses()` pattern, not a duplicate implementation.
- [ ] Operational Activity, Subscription State, and Suspension filters
      are each independently applicable and combinable in a single
      server-side query — never merged client-side from separate
      queries.
- [ ] Sorting by last activity, created date, and name each work
      correctly, including in combination with active filters.
- [ ] A business within its 30-day `New` window never shows as
      `Dormant`, regardless of its `timelineEvents` history — verified
      against §8's worked examples directly.
- [ ] `lastActivityAt` is updated by a trusted, server-authoritative
      mechanism that behaves identically for Owner- and
      Staff-triggered activity, per BDR-0010 Part 5's four binding
      constraints.
- [ ] A failure to update `lastActivityAt` or `subscriptionStatusCache`
      never blocks, fails, or alters the outcome of the underlying
      business action.
- [ ] `subscriptionStatusCache` never diverges from
      `subscriptions/{businessId}.status` for longer than the single
      write operation that sets both.
- [ ] No new audit event is introduced; existing `business.viewed`
      behavior on detail click-through is unchanged.
- [ ] Selecting a directory row navigates to the existing, unmodified
      Business Detail view.
- [ ] `apps/tenant`'s production build contains zero identifiers from
      this slice (same bundle-isolation standard as every prior phase).
- [ ] All new/changed `firestore.rules` (if any turn out to be
      required — not yet determined, see §23) are covered by
      emulator-verified tests before merge, matching the standard this
      project has already paid for the cost of skipping once (Phase C).

## 23. Resolution Log — Formerly Open Questions

All five items originally flagged as open have been reviewed and
resolved this session, prior to Rule 8. Recorded here as a permanent
log, not silently folded into the sections above without a trace.

1. **`lastActivityAt` backfill strategy — RESOLVED.** A one-time
   migration, not natural population. See §7 for the full reasoning:
   natural population would show every pre-existing business older
   than 30 days as `Dormant` on launch day, undermining the directory's
   purpose immediately; a one-time backfill script is bounded,
   proportionate, and consistent with the "monitoring surface, not
   operational subsystem" principle.
2. **Whether Operational Activity needs a denormalized bucket field —
   RESOLVED, CONFIRMED by real Firestore emulator this session.** No
   stored bucket field — the compound range query directly on
   `createdAt` and `lastActivityAt`, computed fresh at query time, with
   no background aging process required, genuinely works. Six tests
   run against a real engine, including the exact combined-range shape
   and both the 14-day and 45-day boundary values from POL-18-001, all
   passed. This specific query shape had zero precedent anywhere in
   this codebase before this verification — it is no longer merely a
   preferred, unproven design; it is a proven one.
3. **Whether search combines with filters — RESOLVED.** Search
   combines with Suspension and Subscription (equality) filters in one
   server-side query — a standard, already-precedented shape (Phase
   D's own `actionType == x AND timestamp range` pattern). Search does
   **not** combine with the Operational Activity filter in one query
   (three range-treated fields simultaneously is beyond even Item 2's
   already-untested two-field case) — instead, the Activity filter is
   applied as a small, bounded post-filter step on the already-fetched,
   already-capped (20-row) search result set, which is not the
   full-population client-side scan BDR-0010 prohibits.
4. **Whether Phase E needs its own ADR — RESOLVED: no.** Phase E
   introduces no new identity mechanism, no new security or mutation
   boundary, and no pattern beyond what ADR-0006 already established
   (server-mediated reads, additive server-written optional fields,
   the existing auth chain unchanged). It proceeds under BDR-0010 +
   POL-18-001 + the still-applicable, unmodified ADR-0006 — the same
   relationship Phase D itself already had to ADR-0006, without needing
   its own ADR either.
5. **Whether any `firestore.rules` change is required — RESOLVED,
   conditionally.** The directory's list/search query needs no rules
   change (Admin-SDK-mediated, matching Gap 2's existing precedent).
   `subscriptionStatusCache`'s write needs no rules change (Admin-SDK-only
   write path, mirroring the existing precedent exactly — confirmed by
   direct inspection that every current write to
   `subscriptions/{businessId}.status` is already server-side only).
   `lastActivityAt`'s write **remains coupled to its still-open
   mechanism choice** (BDR-0010 Part 5's own deliberate deferral,
   unchanged by this resolution pass) — a server endpoint needs no
   rules change; a rules-layer clause would, and would require the
   same real-emulator verification rigor this project has already
   twice proven necessary. **Separately noted, not a new risk:** both
   new fields would be readable by a business's own tenant team through
   the existing `allow read: if isMemberOf(businessId)` rule on
   `businesses/{businessId}` — the same category of exposure the
   already-accepted `suspended` field already has, not a new one this
   resolution introduces.

## 24. Rule 8 Readiness

**This specification is Rule 8-ready — all five originally-open items
are fully resolved, including the one empirical verification.** A Rule
8 Assessment was performed against this specification (this session);
its verdict was `ENVIRONMENT BLOCKED` pending exactly one real-Firestore
verification (the two-field range query, §13). That verification has
since been run against a real Firestore emulator, on a machine with
unrestricted network access: **6/6 tests passed**, including the
critical combined-range shape and both governing boundary values
(14/45 days). No open technical or product uncertainty remains. A
follow-up Rule 8 Assessment (or a documented re-affirmation of the
prior one) should record this result formally before implementation
begins — this specification alone does not constitute that
re-affirmation.

---

## Governance Notes

This specification does not implement code, modify runtime behavior,
edit application logic, or change any `firestore.rules`,
`firestore.indexes.json`, `src/`, `apps/`, `server/`, or `package.json`
file. A temporary, throwaway `tests/` file was created and used solely
to obtain the real-Firestore verification recorded in §13/§23 above,
then deleted — its creation and deletion are both recorded in this
repository's commit history, and no trace of it remains in the working
tree. This specification does not alter BDR-0010 or POL-18-001 — every
threshold, state, and requirement those documents establish is cited,
not restated with variation. The next controlled step is a formal Rule
8 re-affirmation recording this session's verification result, followed
by explicit implementation authorization — neither is granted by this
specification update alone.
