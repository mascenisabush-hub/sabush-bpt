# Module #17 (Owner Portfolio) — v0.2 Addendum — Implementation Plan

**Type:** Engineering planning document. Translates the approved
addendum concept into a structured implementation roadmap. **Does not
authorize implementation.**
**Lifecycle status:** Designed → Accepted (base module) → Concept
Approved (this addendum, commit `115c94c`) → Planned (this document,
`8365236`) → Assessed (Rule 8, `READY AFTER DECISIONS`) → **Amended**
(this revision, incorporating the post-Rule-8 Product Architecture
decision — see the `[Stage 6 Amendment]`-marked blocks throughout §5.5,
§5.6, §5.8, §5.10, §5.11, §5.16 below). Not Authorized, not Implemented, not
Executed. **Reaching "Amended" is not itself authorization to begin
implementation** — that remains a separate, explicit Product Architect
decision, per Rule 8 and the Platform Engineering Governance Standard.
**Amendment note, stated for chronology:** every `[Stage 6 Amendment]`
block in this document is an *addition*, appended after the original
text it clarifies — the original text is preserved unedited in every
case, as the historical record of what this plan proposed before Rule
8 and the subsequent Product Architecture decision. Nothing below
implies the resolved architecture was known or decided at this
document's original drafting time (`8365236`).
**Basis:** [`17-owner-portfolio.md`](../specs/17-owner-portfolio.md)
(v1.0, ✅ Approved), [`17-multi-shop-addendum-owner-portfolio.md`](../specs/17-multi-shop-addendum-owner-portfolio.md)
(v0.2, ✅ Concept/Specification Approved, commit `115c94c` — implementation
NOT authorized by that approval), the [Rule 8 Assessment](./17-owner-portfolio-addendum-rule8-assessment.md)
(`READY AFTER DECISIONS`), the [Specification Amendment](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md)
(Drafted, not yet accepted) recording the Product Architecture
decision this revision incorporates, [Platform Engineering Governance
Standard](./platform-engineering-governance-standard.md).
**Repository state at original drafting:** addendum branch
`docs/spec-17-owner-portfolio-addendum` @ `115c94c`; `main` @ `c775503`,
confirmed unchanged and confirmed `115c94c` is not reachable from
`main`. All code findings below are drawn directly from `main`'s actual
current content (`git show origin/main:<path>`), not from this
addendum branch's own working tree, which is 226 commits behind `main`
and predates the repository's monorepo restructuring — a distinction
this document's own drafting process caught and corrected against
itself before relying on any file path.
**Repository state at this amendment:** same branch @ `8365236`,
re-verified unchanged and clean immediately before this revision.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `package.json`, or any
`docs/specs/*` file to produce this revision. This document still does
not alter the addendum's own live substantive content — the
Specification Amendment referenced above is a separate, not-yet-accepted
document; this plan revision anticipates its content without merging
it.**

---

## 5.1 Purpose

Deliver the Owner Portfolio screen the approved v0.2 addendum
describes: a presentation-only view, reachable by an Admin who owns
more than one shop, showing one independent row per owned shop with
that shop's Business Worth — without introducing any new authoritative
worth calculation, any cross-shop aggregation, or any change to how
Business Worth is computed, stored, or authorized anywhere else in the
system.

## 5.2 Governed Scope

Exactly what the approved addendum defines, no more:

- A presentation-layer screen, gated on `ownedBusinesses.length > 1`
  (the same condition `ShopSwitcher` already uses).
- One row per owned shop, each showing that shop's cached worth
  (`currentWorth`) and a way to tell how current that figure is.
- `currentWorth`: a per-shop, read-time, lazy cache — never itself an
  authoritative source, never computed by any formula other than the
  existing Business Worth Engine's output.
- Storage location/schema for `currentWorth` — explicitly deferred by
  the addendum to this planning stage; resolved provisionally below
  (§5.6), with the write-trigger mechanism itself left as an explicit
  open decision for Rule 8 (§5.16), per the addendum's own instruction
  not to fix what it deliberately left open.

## 5.3 Non-Goals

Preserved from the approved addendum, unchanged:

- No cross-business aggregation, summation, averaging, or
  consolidation of Business Worth, anywhere.
- No replacement of, or alternate formula for, the Business Worth
  Engine (spec #2) — `currentWorth` must always equal what that Engine
  would compute live for that shop.
- `currentWorth` is never the authoritative Business Worth source —
  the Engine remains sole authority.
- No new tenant-isolation boundary or model — inherits `isOwnerOf`
  exactly as every other per-shop field.
- No change to `ShopSwitcher`'s existing behavior or semantics.
- No subscription-related behavior of any kind (Module #19 untouched).
- No precedent for a broader, event-driven Business Worth
  caching/state architecture serving Dashboard, Reports, AI Insights,
  or historical comparison — any such architecture requires its own
  future review.
- Dashboard, Reports, the Business Worth Engine, and Modules #3–13
  must never reference `currentWorth`.

No new non-goals added — everything above is restated from the
addendum, not invented here.

## 5.4 Current-State Architecture

Traced directly against `main` @ `c775503`, not assumed:

**Active business selection** — `apps/tenant/src/context/AppContext.tsx`:
`activeBusinessId` is a derived value (not its own `useState`),
computed fresh each render from `userProfile.activeBusinessId`
(validated against `ownedBusinessIds`, falling back to the first owned
shop). `switchShop(businessId)` writes the new `activeBusinessId` to
`users/{uid}`; a live `onSnapshot` listener on that document propagates
the change.

**Owned-business discovery** — the SAME file already maintains
`ownedBusinesses: Business[]` via **one live `onSnapshot` listener per
owned shop** (`onSnapshot(doc(db, 'businesses', id), ...)`, one call
per id in `ownedBusinessIds`, up to 10) — **this already covers every
owned shop, not only the active one.** This is the single most
important existing mechanism for this plan: any field added to the
`Business` document is already live-synced to the client for every
owned shop, with zero new listener, zero new query, and zero new
Firestore index, the moment it exists on that document.

**Current worth calculation** — the same file: `const businessWorth =
totalMarketValueAllTime - totalExpensesAllTime -
totalWithdrawalsAllTime;` — computed **only** for the currently active
business, derived from that business's own live-synced operational
subcollections (products, batches, expenses, withdrawals, quebras,
closings). **No equivalent computation exists, or can exist without
additional data being loaded, for a non-active owned shop** — those
shops' operational subcollections are not subscribed to client-side
today. This is the exact gap the addendum's `currentWorth` cache exists
to bridge, and the reason its computation cannot simply be "read live"
for every shop the way `businessWorth` is for the active one.

**Firestore rules, `businesses/{businessId}`** —
```
allow read: if isMemberOf(businessId);
allow create: if isSignedIn() && request.auth.uid == request.resource.data.ownerUid;
allow update: if isOwnerOf(businessId) &&
  request.resource.data.get('suspended', false) == resource.data.get('suspended', false);
allow delete: if false;
```
`isOwnerOf(businessId)` resolves to `isMemberOf(businessId) &&
(role == 'owner' || role == 'admin')`, and `isMemberOf` checks
`businessId in ownedBusinessIds()` — **membership/ownership is
evaluated per-document against the caller's owned-business list, not
against which business is currently "active."** Concretely: **an Admin
can already write any field except `suspended` to any of their owned
`businesses/{businessId}` documents today, including one that is not
their active shop, under current rules, with no rules change.** This is
directly relevant to §5.8 below.

**Existing precedent for a mirrored, denormalized field on this same
document** — SuperAdmin Phase E (`server/subscriptionEngine.ts`,
`server/activityTouch.ts`) already added `lastActivityAt?` and
`subscriptionStatusCache?` to the `Business` interface
(`apps/tenant/src/types.ts`), both explicitly documented as "Set
exclusively by privileged server code (never client-writable)... never
a second source of truth." **This is the closest existing precedent in
this codebase for what `currentWorth` would be — a denormalized mirror
field on `businesses/{businessId}`** — but it is a **server-written**
precedent, for fields whose correctness other logic (rules,
SuperAdmin's own directory query) depends on. `currentWorth` is read
only by the Owner Portfolio itself, never by anything else — a
materially different risk profile, discussed in §5.8 and §5.16.

**Server-side architecture** — `server/index.ts` hosts every existing
privileged endpoint (`POST /api/subscriptions/activate-trial`, `POST
/api/business/touch-activity`, the SuperAdmin directory route) behind
`requireAuth` plus a server-side re-verification of the caller's actual
membership — never trusting a client-supplied `businessId` claim
alone. Any server-side mechanism this plan might propose would follow
this exact, already-proven pattern, not a new one.

**No existing Business Worth computation exists server-side.** The
formula lives entirely in `AppContext.tsx`, client-side, over
client-synced data. There is no server module that could compute
`businessWorth` for a shop today without a new implementation of that
formula against server-side data access — which the addendum's own
Non-Goals explicitly warn against ("No alternate formula,
approximation, or parallel worth calculation is permitted").

**Firestore indexes** — `firestore.indexes.json` (`main`) has no index
touching the `businesses` collection at all today. Since every read
this plan proposes is a **single-document read by known id** (via the
existing `ownedBusinesses` per-document listeners), not a filtered or
sorted **query**, no new index is required by anything in this plan —
confirmed by the nature of the access pattern itself, not merely
absence of evidence.

## 5.5 Target Architecture

**Owner Portfolio UI:** a new screen/route, reachable only when
`ownedBusinesses.length > 1` (reusing the exact condition
`ShopSwitcher.tsx` already evaluates — no new gating logic invented).
Renders one row per entry in the already-live `ownedBusinesses` array —
no new data-fetch is required to enumerate the shops themselves.

**`currentWorth` display:** each row reads `ownedBusinesses[i].currentWorth`
directly from the already-live per-document listener described in
§5.4 — this is the "free" read path the existing `ownedBusinesses`
mechanism provides once the field exists on the document.

**`currentWorth` population — the open question, addressed
explicitly, not assumed away:** see §5.8. The mechanism class most
consistent with §5.4's evidence (existing rules already permit an
owner to write any owned business's document; the Business Worth
formula is entirely client-side) is a **client-side mirror write,
occurring at the moment a shop's `businessWorth` is genuinely computed
(i.e., while/when that shop is or becomes the active shop)** — the same
*pattern* Phase E's mirror fields established (denormalize an
already-computed authoritative value onto `businesses/{businessId}`),
adapted to a **client-side writer** rather than Phase E's server-side
one, because the authoritative computation itself is client-side here,
unlike subscription status. This is presented as the leading candidate,
not a settled decision — see §5.16 for why it is not finalized at this
stage.

**[Stage 6 Amendment — post-Rule-8 Product Architecture Decision, not
part of this plan's original drafting]** The paragraph above is
preserved unedited as the historical record of what this plan proposed
at drafting time — a *leading candidate*, explicitly not a decision. A
Rule 8 Assessment subsequently found the addendum's own "stale entry
triggers recalculation" language ambiguous enough to block a "Ready"
conclusion, and the Product Architect resolved it afterward. **The
actual target architecture, as decided, is:**

- `currentWorth`'s value is still always the output of the existing,
  live-computed `businessWorth` for the shop in question — nothing
  about *how the number is computed* changes from the paragraph above.
- **What changes is the trigger:** recalculation is never automatic,
  never triggered by the Portfolio's own load/render, and never a
  background/scheduled/write-triggered mechanism (all three remained
  forbidden throughout — this was never in question). It occurs only
  when the Admin takes an **explicit, per-shop refresh action** on the
  Portfolio screen itself.
- This refresh action is client-side, reusing the exact mirror-write
  mechanism the original paragraph above already described (owner
  write permission on `businesses/{businessId}`, existing rules,
  no change needed) — the difference is *what invokes* that write, not
  *how* the write itself works. See the corresponding Specification
  Amendment,
  [`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md),
  for the normative text this architecture must satisfy.
- The server-side candidate (§5.8's Candidate B) is not selected for
  V1 — this Amendment does not authorize any new cross-app
  business-logic-reuse precedent.

**Freshness/failure handling:** since `currentWorth` can only be
refreshed when its shop was recently active, a shop not visited
recently will show a **stale** cached value, or **no value at all** if
never visited since this feature ships. The UI must render both states
explicitly (§5.10) rather than hide them — this is a direct,
unavoidable consequence of §5.4's finding, not a design preference.

## 5.6 Data Model (planning-level only — not a schema commitment)

Per the addendum's own explicit deferral, this section describes
shape and semantics, not a final, binding Firestore schema:

- **Location:** a candidate location is `businesses/{businessId}.currentWorth`
  (a field on the existing document, not a new collection) — this is
  the location the §5.4 evidence most directly supports (reuses the
  existing per-document listener with zero new reads), but remains a
  Rule 8-confirmed decision, not fixed here, per the addendum's
  instruction.
- **`value`** (number): the cached worth figure. Optional/absent when
  never yet computed for that shop.
- **`calculatedAt`** (ISO string, ideally server-generated per this
  codebase's own established convention — e.g. `runGracePeriodExpirySweep`,
  `touchBusinessActivity` — for whichever write path is ultimately
  chosen): when the cached value was produced. Optional/absent
  alongside `value`.
- **`sourceRevision`** (optional, per the addendum's own text): no
  reliable per-shop revision indicator exists in `apps/tenant/src/types.ts`
  today — confirmed unchanged since the addendum was written. May be
  omitted entirely in an initial implementation, exactly as the
  addendum already anticipates.
- **Business identifier / owner relationship:** implicit — the field
  lives on the `businesses/{businessId}` document itself, so no
  separate identifier or ownership pointer is needed; `isOwnerOf`
  already scopes access correctly (§5.4).
- **Optionality:** every field above must be optional, matching this
  codebase's own established "missing = not yet computed" convention
  (`suspended`, `lastActivityAt`, `subscriptionStatusCache` all follow
  this same shape) — never defaulted to a misleading zero or empty
  value that could be mistaken for a real, computed worth of 0.

**[Stage 6 Amendment — post-Rule-8 Product Architecture Decision]**
The two bullets above are preserved unedited as the historical record
of what this plan left open at drafting time. Both are now resolved,
consistent with — and required by consistency with — §5.5's and §5.8's
own already-amended, resolved architecture:

- **Location, resolved:** `businesses/{businessId}.currentWorth` is the
  settled location, not merely a candidate. §5.5's and §5.8's own
  amendment blocks already describe the resolved write mechanism as
  "the existing owner-write permission on `businesses/{businessId}`" —
  this bullet's earlier "not fixed here" language is superseded by
  that resolution; this document should not be read as leaving the
  location open anywhere.
- **`calculatedAt`, resolved:** a **client-supplied timestamp**
  (`new Date().toISOString()`), generated at the moment the explicit
  per-shop refresh action's write is issued — **not** Firestore's
  `serverTimestamp()` sentinel. This is not a convenience choice; it is
  the only mechanism consistent with the resolved architecture's own
  precedent. Confirmed by direct repository search: `serverTimestamp()`
  is not used anywhere in `apps/tenant/` — zero occurrences. Every
  existing client-side write of an analogous field in this exact
  codebase (`updatedAt: new Date().toISOString()`, five occurrences in
  `AppContext.tsx`, including this task's own earlier
  `savePeriodicStockDraft`/`saveInitialStockDraft` work this session)
  uses a client-supplied ISO timestamp, with no exception found. Since
  the resolved write mechanism for `currentWorth` is itself
  client-side (§5.5/§5.8), following this codebase's own
  exception-free convention for that class of write is the evidence-
  supported choice — server-side timestamp generation
  (`runGracePeriodExpirySweep`, `touchBusinessActivity`, both cited in
  the original bullet above) is a **server-side write** precedent, not
  applicable here, since `currentWorth`'s write path was resolved to
  be client-side, not server-side. **Known, accepted limitation, stated
  plainly rather than concealed:** a client-supplied timestamp is only
  as accurate as the device's local clock — a materially incorrect
  device clock could produce a misleading `calculatedAt` value. This
  is the same accepted risk profile as every other `updatedAt` field
  in this codebase already carries; nothing about `currentWorth`
  elevates it to requiring stronger guarantees than fields this
  codebase already trusts to client-supplied timestamps.

## 5.7 Read Path

- The Owner Portfolio screen reads `ownedBusinesses` directly from
  `AppContext` — the exact same array `ShopSwitcher` already consumes.
  No new listener, no new query, no new index (§5.4).
- Every owned shop, active or not, is already represented in this
  array — inactive shops require no special-case read logic.
- **Tenant isolation:** unchanged — the existing per-document
  `onSnapshot` calls are already scoped to `ownedBusinessIds`, itself
  derived from the caller's own `userProfile`, matching the addendum's
  Security Constraint that the Portfolio never issue a query spanning
  more than one `businessId` (it issues none at all — it reads an
  array already assembled by pre-existing, per-document listeners).
- **Ordering:** matches `ownedBusinessIds`' existing order (the same
  order `ShopSwitcher`'s own menu already uses) — no new sort
  requirement invented.
- **Loading / missing / stale values:** each row's `currentWorth` may
  be absent (never computed), present-but-stale (last computed while
  that shop was active, some time ago), or present-and-fresh. The read
  path itself does not distinguish these — it renders whatever is on
  the document, and the UI layer (§5.10) is responsible for
  distinguishing fresh from stale using `calculatedAt` against a
  freshness threshold (a configurable implementation parameter, per
  the addendum's own text — not fixed here).
- **Failed reads:** the existing `onSnapshot` error callback pattern
  (`(err) => console.error('Error fetching owned business', id, err)`)
  already exists per-shop; the Portfolio screen would surface a
  per-row "unavailable" state for any shop whose listener has errored,
  consistent with how the rest of this codebase already treats
  individual listener failures — no new error-handling pattern
  invented.

## 5.8 Write/Refresh Path

**This is the section the Product Architect's concept-approval
specifically asked this plan to resolve seriously. It is addressed
directly, with the genuine open tension named rather than concealed.**

**What triggers recalculation, grounded in what actually exists:**
today, `businessWorth` is computed as a byproduct of a shop being the
active business — every time `AppContext` has that shop's operational
subcollections live-synced, `businessWorth` is available. **The only
grounded, non-invented trigger for refreshing `currentWorth` is
therefore: when a shop is (or becomes) the active business, its
already-computed `businessWorth` may be mirrored into
`businesses/{businessId}.currentWorth`.** No other trigger exists in
the current codebase without inventing new data access this plan is
not authorized to assume.

**Who performs it:** per §5.4's rules evidence, the calling Admin
already has write permission to their own owned business documents
regardless of which is active — a **client-side write, from the
already-active session that legitimately computed the value**, is
technically permitted today with zero rules changes. This is presented
as the leading candidate (§5.5), not a final decision — see the
precedent-consistency question in §5.16.

**Synchronous or asynchronous / transactional:** if implemented
client-side, this would be a standalone `updateDoc` call, not
transactional with any other write (there is no other write it needs
to be atomic with — `currentWorth` is derived, informational data, not
part of any operation whose correctness depends on it landing
atomically with anything else). If implemented server-side instead
(the alternative discussed in §5.16), it would follow the existing
`touchBusinessActivity`-style pattern: best-effort, never blocking the
underlying action.

**Does failure block the underlying business operation:** **no, under
either candidate mechanism.** Per the addendum's own Non-Goals and this
codebase's own established principle (Phase E's `touchBusinessActivity`
never throws to its caller; `logTimelineEvent` swallows its own
failures) — a failed `currentWorth` write must never fail, block, or
even surface as an error on whatever action was actually in progress
when the write was attempted (viewing the Dashboard, switching shops,
etc.).

**Retries:** none proposed — a failed write simply means the next
opportunity to be active in that shop will attempt it again; there is
no user-facing action to retry against, matching the "lazy, read-time"
character the addendum itself specifies.

**The genuine open tension, named explicitly rather than resolved by
assumption:** the addendum's own "Current Worth Cache Definition"
states — *"A stale or missing entry triggers recalculation through the
approved Business Worth Engine path, which then updates the Current
Worth Cache."* Read literally, this could imply the recalculation is
triggered **by the act of viewing a stale entry on the Portfolio
screen itself.** But the addendum's own Security Constraints state —
*"The Portfolio must never issue a query that reads operational data...
across more than one `businessId` in a single call."* **A
Portfolio-triggered recalculation for a non-active shop would require
exactly that** — loading that other shop's operational subcollections
to compute its worth, from within the Portfolio's own context. **These
two statements, both from the approved addendum, are in tension for
any shop that is not currently active.** This plan does not resolve
that tension by assumption. The candidate mechanism above (§5.5,
mirror-on-active-visit) resolves it by having the Portfolio **never**
trigger any recalculation itself — it only ever displays whatever is
already cached, however stale — which is fully consistent with the
Security Constraint, but means "triggers recalculation" in the
addendum's own text can only be satisfied by the Admin naturally
visiting that shop for some other reason, not by an action taken from
the Portfolio screen. **Whether this reading is what the addendum's
authors intended, or whether a different mechanism (e.g., an explicit
"refresh this shop" action that switches context, or a server-side
computation this plan has found no existing precedent for) is required
instead, is the single most important item for Rule 8 to resolve — see
§5.16.**

**[Stage 6 Amendment — post-Rule-8 Product Architecture Decision]**
The tension above is preserved unedited as the historical record of
what this plan surfaced at drafting time. It has since been resolved,
after a Rule 8 Assessment that reached this exact tension and
concluded READY AFTER DECISIONS, by a subsequent, separate Product
Architect decision — recorded normatively in
[`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md).
**The resolved write/refresh path is:**

```
Owner Portfolio screen (already displaying cached, possibly stale
  or absent, currentWorth for every owned shop)
        ↓
Admin takes an explicit, per-shop refresh action
  (never automatic, never triggered by the screen's own load/render,
  never spanning more than one shop per action)
        ↓
Existing Business Worth Engine calculation path, for that one shop
  only — the same formula, the same live-computed businessWorth
  this plan's §5.4 already found, no duplication, no new formula
        ↓
currentWorth cache write (client-side, existing owner-write
  permission on businesses/{businessId} — see §5.5/§5.8's original
  paragraphs above for exactly why no rules change is needed)
        ↓
calculatedAt updated to the write's own timestamp
        ↓
Portfolio re-renders that one row with the fresh value and its
  updated freshness indicator
```

This resolves the tension precisely because the trigger is **never**
the Portfolio's own load/render — it is always a distinct, later,
single-shop user action — so the Security Constraint against a
cross-`businessId` read in a single call is never implicated. **Failure
behavior, restated for this resolved path specifically:** a failed
refresh (network, calculation, or persistence failure) leaves the
previously-cached value and its `calculatedAt` untouched and still
correctly labeled — it never corrupts the cache, and it never blocks or
affects the underlying business operations of any shop, matching the
"does failure block the underlying business operation: no" finding
above, which remains unchanged by this Amendment. Unlike the original
"no retry proposed" note above (written when the only trigger was
incidental active-visit), **the explicit refresh action does support a
user-facing retry** — the Admin may simply take the same action again;
no new retry mechanism beyond re-invoking the same action is needed or
proposed.

## 5.9 Security Model

- **Access to the Portfolio itself:** unchanged from the addendum —
  Admin/Owner only, gated on `ownedBusinesses.length > 1`, identical
  to `ShopSwitcher`'s own existing gate. Staff and Manager accounts
  have no path to this screen, since they have no `ownedBusinesses`
  concept at all (confirmed: `isMemberOf`'s Staff branch resolves
  purely via a single `businessId`, no `businessIds` array).
- **Ownership establishment:** unchanged — the existing
  `ownedBusinessIds` derivation from `userProfile`, already the sole
  mechanism every other owner-scoped feature in this codebase relies
  on.
- **Client/server boundary:** unresolved as a final decision (§5.8,
  §5.16) — either a client-side write under the existing `isOwnerOf`
  rule (no new server code) or a new privileged server endpoint
  matching `activityTouch.ts`'s shape (re-verifies caller membership
  server-side before writing). Both keep the write scoped to the
  caller's own owned businesses only; neither introduces a new access
  path to another Admin's data.
- **Firestore rules:** under the client-write candidate, **no rules
  change is required** — confirmed by direct reading of the current
  `allow update` clause (§5.4). Under the server-write candidate, no
  rules change is required either, since a privileged server write via
  the Admin SDK bypasses client-facing rules entirely, matching every
  existing privileged-write precedent in this codebase.
- **Admin/SuperAdmin relevance:** none. This feature has no SuperAdmin
  surface, no audit-log requirement beyond what already exists, and no
  interaction with any SuperAdmin capability.
- **Cross-tenant read prevention:** unchanged — every read and write
  this plan proposes is scoped by `isOwnerOf`/`isMemberOf`'s existing,
  unmodified per-`businessId` check. No new tenant-isolation mechanism
  is introduced, and none of the existing ones are altered.

## 5.10 UI/UX Scope

- **Entry point:** a new navigation affordance, reachable only when
  `ownedBusinesses.length > 1` — exact placement (e.g., alongside
  `ShopSwitcher`, or a new Settings entry) is an implementation detail
  for Rule 8/engineering to finalize against this codebase's existing
  design system, not fixed here.
- **One row/card per owned shop** — business name, `currentWorth.value`
  if present, and an explicit freshness indicator (e.g., "as of
  [date]" using `calculatedAt`, or "not yet calculated" when `value` is
  absent) — never a bare number presented as if guaranteed current,
  per §5.7's finding that staleness is a structural, not incidental,
  property of this design.
- **Unavailable/stale states:** both must be visually distinguishable
  from a fresh value — silently showing a stale figure as if current
  would misrepresent the addendum's own "never diverges from what the
  Engine would compute live" Acceptance Criterion to the Admin viewing
  it, even though the underlying data genuinely doesn't diverge once
  written, only lags in *when* it was last written.
- **Navigation into a selected business:** switching into a shop from
  the Portfolio (if included in v0.2) would reuse the existing
  `switchShop()` function unchanged — no new business-switching
  mechanism.
- **Responsive behavior:** follows this codebase's existing Design
  System components already used in Settings/`ShopSwitcher`, per the
  addendum's own Non-Goals ("Do not redesign the product").

**[Stage 6 Amendment — post-Rule-8 Product Architecture Decision]**
The bullets above already anticipated a generic freshness indicator;
this Amendment makes explicit what the resolved architecture (§5.8)
requires but the original drafting left implicit:

- **Refresh control:** each row/card includes an explicit, per-shop
  refresh affordance (e.g., a button or icon) — this is new scope
  relative to the original drafting, which described the Portfolio as
  a pure passive display. Exact visual treatment remains an
  implementation-level choice within the existing Design System, not
  fixed here, consistent with the "entry point" bullet's own existing
  latitude.
- **Loading state:** while a refresh action is in flight for a given
  row, that row must indicate a pending state distinct from both
  "fresh" and "stale/absent" — the Admin should not be able to
  mistake an in-progress refresh for either a completed one or an
  untouched one.
- **Failure/retry state:** per §5.8's resolved failure behavior, a
  failed refresh leaves the prior value and its `calculatedAt`
  visually intact — the row returns to its pre-refresh-attempt state
  (fresh or stale, whichever it was), optionally with a
  transient, non-blocking indication that the attempt failed. Retry is
  simply invoking the same refresh action again — no separate retry
  affordance is required.
- This Amendment does not change the "one row per shop, never
  combined" scope, the entry-point placement question (still open,
  §5.16), or anything about `Navigation into a selected business`
  above — all unaffected.

## 5.11 Implementation Phases / Checkpoints

Provisional — subject to revision once Rule 8 resolves §5.16's open
decisions, particularly the write-mechanism choice, which materially
changes Checkpoint 2's shape:

| # | Objective | Likely files | Prerequisite | Verification |
|---|---|---|---|---|
| 1 | Data model: add `currentWorth?` to `Business` interface, optional/additive only | `apps/tenant/src/types.ts` | Rule 8 has confirmed field location (§5.6) | Typecheck; confirm no existing consumer references the new field (mirrors Phase E's own `lastActivityAt` addition pattern) |
| 2 | Write mechanism: implement whichever candidate Rule 8 selects (§5.8/§5.16) | Either `AppContext.tsx` (client) or a new server module + route (server), per Rule 8's decision | Checkpoint 1; Rule 8's mechanism decision | Unit/integration tests proving the write never throws to its caller and never diverges from the live-computed value at write time |
| 3 | Read path: Owner Portfolio screen reads `ownedBusinesses`, renders rows | New component under `apps/tenant/src/components/` | Checkpoint 1 | Confirm zero new Firestore listeners/queries introduced beyond what already exists |
| 4 | UI: freshness/unavailable states, entry-point wiring | Same component; navigation wiring | Checkpoint 3 | Manual/UI-level verification against §5.10's explicit states |
| 5 | Regression proof | `tests/` (naming per Rule 8/engineering convention at that time) | Checkpoints 1–4 | Confirm Dashboard, Reports, Business Worth Engine, and Modules #3–13 behavior is byte-for-byte unchanged, per the addendum's own Acceptance Criteria |

Each checkpoint's own non-scope: no checkpoint above authorizes work
outside its stated files; a checkpoint discovering broader scope
returns to Rule 8/Product Architecture, per the Governance Standard's
Non-Negotiable Principle 1 — not resolved by engineering judgment
alone.

**[Stage 6 Amendment — post-Rule-8 Product Architecture Decision]**
Checkpoint 2's row above is preserved unedited as the historical
record of what this plan proposed at drafting time — its own text
already flagged that Rule 8 would materially change its shape. That
has now happened. **Checkpoint 2, as resolved:**

| # | Objective | Likely files | Prerequisite | Verification |
|---|---|---|---|---|
| 2 (resolved) | Client-side refresh mechanism: an explicit, per-shop refresh action invoking the existing Business Worth Engine for that one shop, writing `currentWorth`/`calculatedAt` to `businesses/{businessId}` | `AppContext.tsx` (the refresh function itself) and the new Portfolio component (the triggering UI control, per §5.10's Amendment) — no server module, no new route | Checkpoint 1 | Unit tests proving: (a) the write never throws to its caller; (b) the written value never diverges from the live-computed `businessWorth` for that shop at write time; (c) a failed write leaves the prior cached value and `calculatedAt` untouched; (d) the mechanism never reads more than one `businessId`'s operational data in a single call |

Checkpoint 4's "freshness/unavailable states" also now includes the
loading and failure/retry states §5.10's Amendment describes — no
separate checkpoint is added for this; it remains within Checkpoint
4's existing scope.

## 5.12 Testing Strategy (planned only — not performed by this document)

- **Unit tests** for whichever write function is chosen — proving it
  never throws, never diverges from the live-computed value, and
  (client-side candidate) correctly no-ops when the caller doesn't own
  the target business.
- **Integration/emulator tests** proving the `businesses/{businessId}`
  update rule behaves exactly as §5.4 describes for a `currentWorth`
  write — Owner succeeds for any owned shop, Staff/Manager/other-Admin
  fail — matching this repository's own established emulator-test
  tier for exactly this kind of claim.
- **Multi-business tests:** an Admin with 3+ shops sees exactly one
  row per shop, never a combined figure, matching the addendum's own
  Acceptance Criteria verbatim.
- **Cache freshness tests:** a shop not recently active shows a
  correctly-labeled stale/absent state, never silently presented as
  current.
- **Regression tests for existing Business Worth behavior:** confirm
  Dashboard, Reports, the Engine, and Modules #3–13 make zero
  reference to `currentWorth` — the addendum's own explicit Acceptance
  Criterion, directly testable via source-level grep, matching this
  repository's own established technique for this exact class of
  proof (e.g. the Phase 3 close-out's `eventType` enumeration check).
- **UI behavior tests:** source-level checks that the Portfolio's
  render logic never issues a cross-business operational-data read, if
  this codebase's existing test conventions at implementation time
  support that style of assertion (as they already do for several
  other components this session's own work has covered).

No test file is created, and no test is executed, by this planning
document.

## 5.13 Deployment / Migration Considerations

- **Migration/backfill:** none identified. `currentWorth` is
  additive/optional; existing businesses simply show "not yet
  calculated" until first computed under whichever mechanism Rule 8
  selects. No backfill script is proposed — unlike Phase E's
  `lastActivityAt`/`subscriptionStatusCache`, which needed a one-time
  backfill because SuperAdmin's directory needed every business to
  have *some* value immediately; the Owner Portfolio has no equivalent
  requirement, since an absent value is an explicitly-designed,
  first-class UI state (§5.10), not a gap to paper over.
- **New indexes:** none — confirmed in §5.4, this is a per-document
  read pattern, not a query.
- **Rules changes:** none, under either write-mechanism candidate
  (§5.9).
- **Server deployment:** required only if Rule 8 selects the
  server-write candidate (§5.16); not required under the client-write
  candidate.
- **Client deployment:** required under either candidate — a new
  screen and (for the client-write candidate) new write logic ship in
  the tenant app bundle.
- **Cache population:** none needed pre-launch — the lazy, read-time
  character the addendum specifies means the cache populates itself
  organically as Admins use the product, exactly as designed.

## 5.14 Failure and Recovery

- **Worth calculation fails:** unaffected — `currentWorth`'s mirror
  write simply doesn't happen for that cycle; the live `businessWorth`
  computation and its existing failure handling are entirely
  untouched by this feature.
- **Cache write fails:** swallowed, never surfaced to the underlying
  action in progress (§5.8) — matching `touchBusinessActivity`'s and
  `logTimelineEvent`'s own established "never block the real action"
  precedent in this exact codebase.
- **Cache read fails:** the existing per-shop `onSnapshot` error
  handling already in `AppContext.tsx` applies unchanged; that row
  shows an "unavailable" state (§5.7, §5.10).
- **A business has no worth yet:** the explicitly-designed
  "not yet calculated" state (§5.6, §5.10) — never defaulted to 0 or
  hidden.
- **Cache is stale:** shown explicitly, never silently presented as
  current (§5.10) — this is the expected, common case for a
  rarely-visited shop, not an error condition.
- **Ownership changes:** unaffected — `currentWorth` lives on the
  `businesses/{businessId}` document itself; ownership transfer (if
  it exists at all in this platform — not confirmed either way by
  this plan, and out of scope to investigate here) would carry the
  field along exactly as every other field on that document already
  does.
- **A business is inactive** (i.e., simply not the currently-selected
  shop): this is the normal, expected state for most of an Admin's
  owned shops most of the time — not a failure condition; it is
  exactly the case the addendum's stale/lazy design exists to handle
  gracefully.
- **A business is removed or becomes inaccessible:** the existing
  `ownedBusinesses` listener already stops including a shop once it
  leaves `ownedBusinessIds`; the Portfolio's row list already updates
  automatically, with no new logic required.

**No scenario above allows a `currentWorth` failure to corrupt or
block any core business operation** — consistent with the addendum's
own character as a "narrow read-time cache," not an operational
dependency of anything else in the product.

## 5.15 Rollback

- **Feature-level:** the Owner Portfolio screen and its entry point
  can be removed/hidden without any data-integrity consequence —
  `currentWorth` is purely additive, read by nothing else (per the
  addendum's own Non-Goals, independently re-confirmed possible in
  §5.4/§5.9), so its removal leaves the Business Worth Engine, every
  Dashboard/Report figure, and every other module completely
  unaffected.
- **Data-level:** `currentWorth` fields, once written, can be left in
  place harmlessly (dead data, never read by anything if the feature
  is disabled) or cleaned up via a simple field-removal script if
  desired — no migration is required either way, since nothing else
  in the system depends on the field's presence or absence.
- **No irreversible step exists anywhere in this plan** — no schema
  migration that can't be undone, no rules change to revert, no index
  to remove.

## 5.16 Decisions — Resolved and Still Open

**Items 1–2 below are preserved exactly as originally drafted, as the
historical record of what this plan left open at Stage 6 time — not
edited, not deleted.** Each is now marked with its resolution,
recorded separately and chronologically after this plan, per the
Amendment note following each.

1. **The `currentWorth` refresh-trigger mechanism (§5.8's central open
   tension).** Candidate A: client-side mirror write when a shop is/
   becomes active — lowest implementation complexity, zero rules
   change, zero new server code, but is a **client-side** write of a
   financial figure (lower risk than Phase E's fields since nothing
   else reads it, but a departure from this codebase's established
   "privileged fields are server-written" convention for
   `businesses/{businessId}` mirror fields). Candidate B: a new,
   server-side mechanism matching `activityTouch.ts`'s shape — more
   consistent with the existing Phase E precedent's *pattern*, but
   this plan found **no existing server-side Business Worth
   computation to reuse**, meaning Candidate B would still ultimately
   need the client to supply the already-computed value for the
   server to just persist (not meaningfully more secure against a
   malicious client than Candidate A, since the server still isn't
   independently verifying the number) — or would require genuinely
   reimplementing the formula server-side, which the addendum's own
   Non-Goals caution against. **This plan does not select between
   them.**

   **[RESOLVED — Stage 6 Amendment, post-Rule-8 Product Architecture
   Decision]** Neither Candidate A nor Candidate B alone, as originally
   framed. The Rule 8 Assessment that followed this plan surfaced a
   third option (an explicit, user-triggered per-shop refresh) which
   the Product Architect selected: client-side write mechanics as
   Candidate A already described, but triggered only by an explicit
   Admin action, never by a shop simply becoming active. Candidate B
   (server-side) is not selected for V1. See §5.5/§5.8's own Amendment
   blocks above for the full resolved architecture, and
   [`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md)
   for the normative specification text.

2. **Whether the Portfolio may ever trigger a recalculation itself**,
   or must always be a pure display of whatever's already cached,
   however stale — directly downstream of decision 1, and directly
   implicated by the tension named in §5.8.

   **[RESOLVED — Stage 6 Amendment, post-Rule-8 Product Architecture
   Decision]** No. The Portfolio's own load/render never triggers
   recalculation, under the resolved architecture — only an explicit,
   separate, single-shop Admin action does. This is the specific
   resolution to the tension named in §5.8's own Amendment block above.

**Items 3–5 remain genuinely open — unresolved by the Product
Architecture decision, not converted into assumptions:**

3. **Exact entry-point placement in the UI** — not fixed by this plan,
   left to Rule 8/engineering judgment within the addendum's own
   Non-Goal against redesigning the product.
4. **Freshness threshold value** — the addendum itself explicitly
   defers this ("a configurable implementation parameter... not fixed
   by this addendum"); this plan does not fix it either.
5. **Whether `sourceRevision` is included in an initial
   implementation at all**, given the addendum's own text already
   permits omitting it — a low-stakes decision, but listed for
   completeness.

---

## Governance Boundary

**This document is Stage 6 — Implementation Plan, now Amended.**

- **A Rule 8 Assessment has been performed** — see
  [`17-owner-portfolio-addendum-rule8-assessment.md`](./17-owner-portfolio-addendum-rule8-assessment.md),
  concluding `READY AFTER DECISIONS`. A subsequent Product Architecture
  decision resolved items 1–2 of what was §5.16's open-decisions list;
  this revision incorporates that resolution into §5.5, §5.8, §5.10,
  §5.11, and §5.16 via explicitly marked `[Stage 6 Amendment]` blocks.
  Items 3–5 remain genuinely open.
- **No Implementation Authorization has been granted.** Neither this
  Plan's original text nor this amendment grants it.
- **No implementation may begin on the basis of this document alone,
  even now that the central mechanism question is resolved.**
  Engineering may not treat this amended plan as a green light — the
  companion Specification Amendment must itself be accepted first (it
  is currently Drafted, not Accepted — see
  [`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md)),
  and only after that may an explicit, signed Implementation
  Authorization be considered — only then Stage 9 (Incremental
  Implementation).
- This document does not describe itself, anywhere, as "ready for
  implementation" or "approved for implementation" — every readiness
  claim in it is scoped explicitly to concept/specification approval
  (already granted, `115c94c`), Rule 8's own "Assessed" conclusion
  (`READY AFTER DECISIONS`, itself not a go-ahead), or planning-level
  analysis, never to implementation itself.

---

## Governance Notes

- This document's original text does not modify `17-owner-portfolio.md`
  or `17-multi-shop-addendum-owner-portfolio.md` — unchanged from the
  original drafting. This amendment additionally does not modify
  either of those files, or the Specification Amendment — it
  anticipates and cross-references that amendment's content without
  merging it.
- This document does not itself grant the Specification Amendment's
  acceptance, and does not itself constitute an Implementation
  Authorization record — both remain separate, future, explicitly-gated
  stages.
- Per the Governance Standard's Non-Negotiable Principle 1, any
  discovery during a future Implementation Authorization review that
  this plan's scope is broader, narrower, or ambiguous than described
  here returns to Product Architecture — it is not resolved by
  engineering judgment alone at that stage either.
- **Lifecycle:** Concept Approved → Planned → Assessed (`READY AFTER
  DECISIONS`) → Product Architecture Decision → **Amended** (this
  document) → *(pending)* Specification Amendment Accepted →
  *(pending)* Implementation Authorization → *(pending)* Implemented.
