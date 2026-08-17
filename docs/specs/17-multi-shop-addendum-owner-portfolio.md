Business Domain Specification — Addendum

# Multi-Shop Addendum: Owner Portfolio

Version 0.2
**Status:** ✅ Concept/Specification Approved — documentation and
business-rule content only. **Implementation is NOT authorized by this
status.** See "Addendum Concept Acceptance" at the end of this
document.
**Revision (v0.2):** Clarified Current Worth Cache boundaries (no
pre-committed storage schema; computation-path wording tightened;
stale/missing cache fallback made explicit). Added an acceptance
criterion confirming Owner Portfolio is unavailable to Staff/Manager
roles. No change to scope, security model, or Non-Goals.
**Addendum to:** [17-owner-portfolio.md](./17-owner-portfolio.md) (v1.0, ✅ Approved — documentation alignment & business rules; formerly `17-multi-shop.md`)
**Module #17 of 20 — Phase 4: Platform**
**Architecture references:** [Section 2.8](../architecture/02-core-product-principles.md)
(Tenant Isolation Is Non-Negotiable), [Section 3.2](../architecture/03-domain-architecture.md)
(Business domain — multi-shop, capped at 10)
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md),
[17-multi-shop.md](./17-multi-shop.md)

---

## Status Note

**Correction (documentation-only — does not alter this addendum's
substantive proposal below):** since this addendum was written, the
base Module #17 specification it targets was renamed from
`17-multi-shop.md` to `17-owner-portfolio.md` and was separately
accepted (documentation alignment & business rules only — see that
spec's own "Product Architect Acceptance" section) — independently of
this addendum, which was never reviewed, merged, or approved as part
of that acceptance. The recovery sequence below is updated to reflect
that the base module's own approval has already happened; this
addendum's own governance sequence is otherwise unchanged in intent.

This addendum is a proposal only. It is not merged into
`17-owner-portfolio.md`, not reflected in `docs/specs/README.md` as
approved, and confers no approval of its own content. Per the recovery
sequence agreed on, the order is:

1. This file exists and is reviewed on its own merits (current step).
2. If approved as an addendum, its content is merged into
   `17-owner-portfolio.md` as a new revision.
3. `README.md` / `HANDOFF.md` are updated to reflect the Owner
   Portfolio view/cache specifically, once that merge happens.
4. Only then does a Rule 8 implementation assessment begin.

Nothing in this file authorizes any code change.

## Purpose

`17-multi-shop.md` already allows one Admin to own multiple shops via
`ShopSwitcher`, but an Admin with several shops has no single place to see
how each is doing without switching into each one individually. This
addendum proposes a presentation-only "Owner Portfolio" view, backed by a
narrow read-time cache, to address that — without altering how Business
Worth is calculated, stored, or authorized anywhere else in the system.

## Owner Portfolio Definition

- A presentation-layer screen, not a domain entity and not a new
  collection of business data.
- Visible only to an Admin who owns more than one shop, using the same
  `ownedBusinesses.length > 1` gate `ShopSwitcher` already uses. A
  single-shop Admin sees no change.
- Has no `businessId` of its own. Is never written into
  `firestore.rules`' `isMemberOf`/`isOwnerOf` tenant model. Cannot be
  joined, staffed, or granted access to by anyone but the owning Admin.
- Read-only: does not define or require a new tenant model or operational
  write path. Any storage location or schema for `currentWorth` must be
  determined during implementation planning and approved before
  implementation — this addendum specifies behavior, not Firestore
  structure. Never computes worth itself — only displays what the
  Business Worth Engine (spec #2) already computed, per shop.
- Renders one independent row per shop. Performs no summation,
  averaging, or cross-shop combination of any figure — per Architecture
  2.8 and this module's existing Business Problem section.

## Current Worth Cache Definition

- Field: `currentWorth`, shape `{ value, calculatedAt, sourceRevision? }`,
  scoped one-per-shop.
- The value stored in `currentWorth` must be the output of the existing
  Business Worth Engine calculation path. No alternate formula,
  approximation, or parallel worth calculation is permitted.
- Read only by the Owner Portfolio, for the calling Admin's own owned
  shops. Not read by, and not exposed to, Dashboard, Reports, the
  Business Worth Engine, Closings, or any Module #3–13 screen — all of
  those continue reading live `businessWorth` exactly as today,
  unchanged.
- Behavior is read-time and lazy: a fresh cache entry may be used as the
  Portfolio display source. A stale or missing entry triggers
  recalculation through the approved Business Worth Engine path, which
  then updates the Current Worth Cache through the approved
  implementation path. Never a background job, scheduled recompute, or
  write-triggered hook.
- Freshness threshold is a configurable implementation parameter, to be
  set during a future implementation assessment — not fixed by this
  addendum.
- `sourceRevision` is metadata only, not a trigger. No reliable per-shop
  revision indicator exists in `src/types.ts` today, so this field may be
  omitted entirely in an initial implementation; it is reserved for a
  future spec that introduces one.
- Naming note: this is never referred to as a "snapshot." A snapshot
  implies a permanent historical record (see `businessWorthAtClose` in
  spec #11, Monthly Closings), and this cache is neither permanent nor
  historical.

## Security Constraints

- Inherits the existing `isOwnerOf` per-`businessId` check exactly as
  every other per-shop field. No new Security Rule concept, no new
  access path.
- No Staff or Manager account reads `currentWorth`, since the Portfolio
  itself is Admin/Owner-only.
- An Admin must never be able to read another Admin's `currentWorth`,
  verified the same way as every other per-shop field in
  `firestore.rules`.
- The Portfolio must never issue a query that reads operational data
  (Products, Stock Batches, Expenses, etc.) across more than one
  `businessId` in a single call.

## Non-Goals (explicit)

- This is **not** a platform-wide Business Worth caching architecture.
- `currentWorth` is **not** the authoritative Business Worth source for
  the platform — the Business Worth Engine (spec #2) remains sole
  authority.
- This addendum is **not** precedent for a broader, event-driven Business
  Worth State/Cache Architecture serving Dashboard, Reports, AI
  Insights, forecasting, trend analysis, or historical comparison. Any
  such architecture is future work requiring its own architecture
  review and specification — not an extension inferred from this
  addendum.
- Dashboard, Reports, the Business Worth Engine, and Modules #3–13 must
  behave identically before and after this addendum, if merged and
  implemented — none of them should reference `currentWorth` at all.
- No summed, averaged, or otherwise combined multi-shop worth figure is
  introduced anywhere.

## Acceptance Criteria (for this addendum, if approved and implemented)

- [ ] Owner Portfolio displays one entry per shop the calling Admin
      owns — never more, never fewer, never a combined/summary row —
      and is never shown to a single-shop Admin.
- [ ] Each Portfolio entry's worth figure is independently calculated
      per shop via the existing Business Worth Engine path — not a new
      formula.
- [ ] The Portfolio never issues a query that reads operational data
      across more than one `businessId` in a single call.
- [ ] `currentWorth` never diverges from what the Business Worth Engine
      would compute live for that shop at cache-write time.
- [ ] An Admin cannot read another Admin's `currentWorth`, verified the
      same way as every other per-shop field in `firestore.rules`.
- [ ] Dashboard, Reports, the Business Worth Engine, and Modules #3–13
      behave identically before and after this addendum ships —
      verified by confirming none of them reference `currentWorth`.
- [ ] Owner Portfolio access is unavailable to Staff and Manager roles,
      even when those users belong to shops owned by the Admin.

## Future Enhancements (explicitly out of scope here)

- **Business Worth State/Cache Architecture** — a broader, event-driven
  Business Worth caching layer serving Dashboard, Reports, AI Insights,
  forecasting, trend analysis, historical comparison, and calculation
  scheduling. Deliberately kept out of this addendum. If pursued, it
  requires its own architecture review and specification — not an
  extension inferred from this module.
- **Multi-shop Manager scope** — already flagged as future, out-of-scope
  work in spec #16; unaffected by this addendum.

---

## Addendum Concept Acceptance

**Accepted as concept/specification.** Scope of this acceptance, as
explicitly granted:

- The Owner Portfolio presentation-layer view and its `currentWorth`
  read-time cache concept, exactly as defined in "Owner Portfolio
  Definition" and "Current Worth Cache Definition" above.
- The Security Constraints, Non-Goals, and Acceptance Criteria above,
  unchanged from this document's own content — this acceptance does
  not alter, loosen, or reinterpret any of them.
- Confirmed by direct review against the current repository (`main`
  @ `c775503`, this addendum branch @ `864a3c4`), not assumed from the
  proposal's own wording alone: no cross-business aggregation, no
  consolidation of Business Worth, no new authoritative Business Worth
  calculation, no new tenant-isolation boundary, no change to
  `ShopSwitcher`'s existing behavior, and no subscription-related
  behavior are introduced by this addendum.
- The Business Worth Engine's actual calculated output (`businessWorth`
  in `AppContext.tsx`) is confirmed unchanged since this addendum was
  written — two amendments to `02-business-worth-engine.md` since then
  (Expected Current Stock Value; Initial Stock Valuation History) both
  explicitly state they do not modify `businessWorth` and are never fed
  back into its formula, and a separate performance optimization to
  `calculateInventoryTotals` is confirmed to change cost shape only,
  not output. This addendum's core assumption — that `currentWorth`
  would mirror "the existing Business Worth Engine calculation path" —
  remains accurate.

**This approval does not constitute implementation authorization.**
Per this repository's Platform Engineering Governance Standard, the
remaining sequence is:

```
Concept approved (this record)
        ↓
Implementation Plan required
        ↓
Rule 8 Assessment required
        ↓
Explicit, signed Implementation Authorization required
        ↓
Implementation may begin
```

**Not included in this acceptance:** any source code implementation;
any Firestore schema, collection, or field-storage commitment for
`currentWorth` (this addendum's own "Owner Portfolio Definition"
section explicitly defers that to implementation planning, and this
acceptance does not resolve it either); any change to
`firestore.rules` or `firestore.indexes.json`.

**One substantive technical question flagged for the Implementation
Plan / Rule 8 stage, not resolved by this acceptance:** today's
`businessWorth` is computed entirely client-side, in-memory, for the
currently *active* business only (`AppContext.tsx`) — no existing
mechanism computes or reads a worth figure for an Admin's *other*,
non-active shops. This addendum correctly defers `currentWorth`'s
storage/computation mechanism to implementation planning rather than
solving it here; this note records that the mechanism is a genuinely
open technical question the future Rule 8 Assessment must address as a
first-order concern, not a settled one this acceptance is silently
assuming away.

**Merge note:** per this document's own "Status Note" recovery
sequence (step 2), the next step — merging this content into
`17-owner-portfolio.md` as a new revision — is a separate, subsequent
action, not performed by this acceptance record.
