# Module #17 — Owner Portfolio: Technical Feasibility Note

**Status:** Engineering discovery only. No implementation, no rule
changes, no new components. This note exists to inform the upcoming BDS
(Business Domain Specification), not to replace it — per the standing
instruction, Module #17 does not get implemented until a separate,
explicitly accepted BDS is provided.

**Scope of this note:** review existing ownership model, map Business
Worth summary sources, identify read-only aggregation requirements, and
flag technical constraints/risks the BDS author should know about before
writing acceptance criteria.

---

## 1. Naming/scope discrepancy — flagged before anything else

This repo already has a **drafted, awaiting-approval** spec at
`docs/specs/17-multi-shop.md`, titled "Multi-Shop." The Product
Architect's current framing calls the same module number "Owner
Portfolio," with new constraints not present in the existing draft:

- Portfolio is a **logical ownership grouping, not a tenant**.
- Business remains the tenant boundary.
- Portfolio dashboards are **read-only aggregation views**.
- **No portfolio-level writes.**
- **No location/shop hierarchy included yet.**

The existing Multi-Shop draft already covers the ownership/switching
model (see Section 2 below) and explicitly states, in its own
Implementation notes, that **no cross-shop aggregate or "combined"
Business Worth view exists yet** — so "Owner Portfolio" as newly framed
reads as the missing aggregation layer on top of Multi-Shop's existing
ownership model, not a duplicate or a rename of the whole module. But
that's an inference, not a confirmed decision — this note flags it
rather than assuming it, since silently treating "Owner Portfolio" as
"a section of Multi-Shop" or vice versa would be inventing scope. Worth
a one-line confirmation in the BDS itself: does Owner Portfolio
**supersede** the Multi-Shop draft, **extend** it, or is Multi-Shop
being retired in favor of it?

---

## 2. Existing ownership model (as built, confirmed by direct code read)

Source: `src/types.ts`, `src/context/AppContext.tsx`.

- `UserProfile.businessId` — legacy single-shop field, still the source
  of truth for Staff (always exactly one business) and for owner
  accounts created before multi-shop existed. Immutable after creation.
- `UserProfile.businessIds?: string[]` and `activeBusinessId?: string` —
  multi-shop support, owners only. Optional/absent on older profiles and
  all staff profiles.
- `Business { id, name, ownerUid, category, currencySymbol, createdAt,
  contact?, location?, email? }` — no shop-hierarchy or grouping field
  exists on this type today.
- `MAX_SHOPS_PER_OWNER = 10` (hardcoded constant in `AppContext.tsx`,
  not a Subscription-tier read yet — confirmed absent).
- One Admin (owner) can own 1–10 Businesses; each Business is a fully
  separate tenant. There is currently no third entity ("Portfolio") in
  the data model — ownership grouping today is *implicit*, derived by
  querying `businessId → ownerUid` matches, not a first-class object.

**Implication for Owner Portfolio:** if the BDS wants a Portfolio as
something with its own identity (a name, settings, membership beyond
"owned by this uid"), that's new schema. If it's purely a computed view
over "all Businesses this owner owns," no new schema is needed — the
grouping already exists implicitly via `ownerUid`/`businessIds`. This is
a real fork in the design the BDS needs to resolve; this note doesn't
resolve it.

---

## 3. Business Worth summary sources (as built)

Source: `src/context/AppContext.tsx`, lines ~382–428.

Business Worth is computed **entirely client-side, per active business**,
from real Firestore reads — no server-side pre-aggregation exists today:

```
businessWorth = totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime
capitalGrowth = businessWorth − initialCapitalValue   // initialCapitalValue from the one 'initial' StockCount
```

Inputs, each a live `onSnapshot` listener scoped to exactly one
`businessId` (subcollections under `/businesses/{businessId}/...`):
`batches`, `quebras` (feed `calculateInventoryTotals` →
`totalInvestmentValue`, `totalMarketValue`, `totalEmbeddedProfit`),
`expenses`, `withdrawals`, `stockCounts` (latest one → current inventory
value; the one `type: 'initial'` one → permanent capital baseline).

This is the same computation Dashboard, Reports, and Closings already
reuse — there is exactly one source of truth for it today, which is
good: a Portfolio aggregation should reuse this function, not
reimplement the formula.

**The constraint that matters:** every one of those listeners is
attached to a single active `businessId` at a time
(`collection(db, 'businesses', businessId, 'batches')`, etc.). There is
no existing code path that runs this computation for more than one
business simultaneously.

---

## 4. Read-only aggregation requirements — options identified

To show a Portfolio-level summary (e.g. total Business Worth across an
owner's businesses), the client needs Business Worth computed per
business, then summed/compared. Two structurally different ways to get
there, both consistent with "Portfolio dashboards are read-only
aggregation views, no portfolio-level writes":

**Option A — Client-side fan-out (no new backend).**
Attach the existing per-business listener set to every business in
`ownedBusinessIds` (up to 10, per the existing cap) instead of just
`activeBusinessId`, and run the existing Business Worth formula once per
business, then aggregate in memory. Reuses 100% of existing calculation
logic and `firestore.rules` (`isOwnerOf` already permits an owner to
read every business they own — no rule change needed for the read path
itself). Cost: up to 10× the current per-business listener count while
the Portfolio view is open; acceptable at the current 10-shop cap, but
worth flagging as the thing to revisit if the cap ever grows via
Subscription tiers (spec #17's own draft already notes the cap is a
hardcoded constant today, not Subscription-gated).

**Option B — Server-side pre-aggregation (new backend surface).**
A scheduled/triggered Cloud Function maintains a per-owner summary
document (e.g. `portfolioSummaries/{ownerUid}`) that the Portfolio view
reads directly — one read instead of N. Matches the
`platform_aggregates`-style pattern Architecture 9.8 already uses for
SuperAdmin's Platform Analytics, so it wouldn't be an unprecedented
pattern in this codebase, but it is new infrastructure (a Cloud
Function, a new collection, a write path that has to be reasoned about
for tenant-isolation just like everything else) that doesn't exist for
any tenant-facing feature today — `server/index.ts` currently only does
Admin-SDK request/response calls, not scheduled aggregation.

This note does not recommend one over the other — that's a BDS-level
tradeoff (freshness vs. new infrastructure vs. read cost), not an
implementation detail. Flagging both so the BDS can make that call
explicitly instead of it being decided implicitly by whichever engineer
happens to build it first.

---

## 5. Tenant isolation constraint (non-negotiable, per Architecture 2.8)

Whichever option is chosen, the read-only Portfolio view must not become
a second tenant boundary or a way to bypass `isOwnerOf`/`isMemberOf`:

- Option A already respects this by construction — it's N separate
  reads, each still gated by the existing per-business `isOwnerOf` rule.
  No rule change required.
- Option B would need its own `firestore.rules` entry for
  `portfolioSummaries/{ownerUid}` scoped to `request.auth.uid == ownerUid`
  only — i.e., an owner can only ever read their *own* portfolio
  summary, never another owner's, and the aggregation write path (Cloud
  Function, Admin SDK) must derive membership the same way `isOwnerOf`
  already does, not re-derive it independently and risk drift.

Either way: **no existing `isMemberOf`/`isOwnerOf` rule should be
loosened** to make aggregation easier. That would be exactly the
"temptation to weaken tenant isolation for aggregate reporting"
Architecture 2.8 names directly.

---

## 6. Explicitly out of scope for this note

- No component code, no `firestore.rules` changes, no new Firestore
  collections were created.
- No decision made on Option A vs. B — flagged as a BDS-level choice.
- No resolution of the Multi-Shop vs. Owner Portfolio naming/scope
  question (Section 1) — flagged, not resolved.
- Location/shop hierarchy is explicitly out of scope per the Product
  Architect's own framing; nothing here assumes or designs toward one.

## 7. Suggested inputs for the BDS author

1. Resolve Section 1 (supersede / extend / retire Multi-Shop draft).
2. Pick Option A or B from Section 4, or state the decision is deferred
   pending real usage data (10-shop cap makes Option A's cost bounded
   and known today).
3. Confirm whether "Portfolio" needs to be a first-class Firestore
   entity (new schema) or stays a computed view over existing
   `ownerUid`/`businessIds` data (Section 2).
4. Carry forward the Section 5 constraint verbatim into the BDS's
   Non-functional Requirements / Security section — this is the one
   requirement that shouldn't be left implicit.
