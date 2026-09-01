# Module #17 (Owner Portfolio) — v0.2 Addendum — Implementation Authorization

**Type:** Governance bridge document — the formal record that
engineering governance is complete and Owner Portfolio v0.2 is
authorized to begin. Follows the pattern established by
[Module #20 Phase 3's Authorization](./20-phase3-implementation-authorization.md).
**Status:** ✅ Authorized (decision recorded 2026-08-17; signature
pending — see §5). Engineering may begin implementation strictly
within the scope defined by §2/§3, once §5's signature is complete.
**Basis:** [`17-owner-portfolio.md`](../specs/17-owner-portfolio.md)
(v1.0, ✅ Approved), [`17-multi-shop-addendum-owner-portfolio.md`](../specs/17-multi-shop-addendum-owner-portfolio.md)
(v0.2, ✅ Concept/Specification Approved `115c94c`, amendment merged),
[`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md)
(✅ Accepted 2026-08-17), [`17-owner-portfolio-addendum-rule8-assessment.md`](./17-owner-portfolio-addendum-rule8-assessment.md)
(Assessed — `READY AFTER DECISIONS`), [`17-owner-portfolio-addendum-implementation-plan.md`](./17-owner-portfolio-addendum-implementation-plan.md)
(Planned, Amended — §5.5, §5.6, §5.8, §5.10, §5.11, §5.16), and the
subsequent fresh Implementation Authorization Readiness Assessment
(conversational, this session — result: `READY FOR IMPLEMENTATION
AUTHORIZATION`) that this document formally records.
**Repository state at drafting:** branch
`docs/spec-17-owner-portfolio-addendum` @ `8365236` as `HEAD`, working
tree carrying the four uncommitted governance artifacts this
Authorization is based on (the merged live addendum, the amended
Implementation Plan, the Rule 8 Assessment, and the accepted
Specification Amendment); `main` @ `c775503`, confirmed unchanged.

**Nothing has been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `17-owner-portfolio.md`, or any other
existing governance document to produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

**Concept/Specification Approval → Implementation Plan → Rule 8
Assessment → Product Architecture Decision → Specification Amendment →
Implementation Plan Amendment → Amendment Acceptance → Live
Specification Merge → Authorization Readiness Assessment →
Authorization (this document) → Implementation → Verification →
Close-out**

| Stage | Document | Status |
|---|---|---|
| Concept/Specification Approval | `17-multi-shop-addendum-owner-portfolio.md` | ✅ Approved (`115c94c`) |
| Implementation Plan | `17-owner-portfolio-addendum-implementation-plan.md` | ✅ Planned (`8365236`) |
| Rule 8 Assessment | `17-owner-portfolio-addendum-rule8-assessment.md` | ✅ Assessed — `READY AFTER DECISIONS` |
| Product Architecture Decision | (recorded in the Specification Amendment) | ✅ Decided |
| Stage 2 Specification Amendment | `17-owner-portfolio-addendum-currentworth-refresh-amendment.md` | ✅ Accepted (2026-08-17) |
| Stage 6 Implementation Plan Amendment | same Implementation Plan, §5.5/§5.6/§5.8/§5.10/§5.11/§5.16 | ✅ Applied |
| Live Specification Merge | `17-multi-shop-addendum-owner-portfolio.md` | ✅ Merged |
| Authorization Readiness Assessment | (conversational, this session) | ✅ `READY FOR IMPLEMENTATION AUTHORIZATION` |
| **Authorization** | **This document** | ✅ Authorized, 2026-08-17 |
| Implementation | — | Not begun |
| Verification | — | Not begun |
| Close-out | — | Not begun |

---

## 2. What Is Authorized

**Only the Owner Portfolio v0.2 addendum's `currentWorth` feature**,
exactly as scoped by the merged specification and the amended
Implementation Plan, no broader:

**Feature behavior:**
- An Owner Portfolio screen, reachable only when
  `ownedBusinesses.length > 1`, showing one independent row per owned
  shop.
- **Explicit, per-shop Admin refresh** as the sole recalculation
  trigger — never automatic, never triggered by the Portfolio's own
  load/render, never spanning more than one shop per action.
- **No background job, scheduled recomputation, or write-triggered
  hook** of any kind for `currentWorth`.
- The **existing Business Worth Engine** as the sole calculation
  path — no alternate formula, no duplication.
- `currentWorth` stored at **`businesses/{businessId}.currentWorth`**,
  shape `{ value, calculatedAt, sourceRevision? }`.
- `calculatedAt` as a **client-supplied timestamp**
  (`new Date().toISOString()`), per the Implementation Plan §5.6
  Amendment's evidence-based resolution — not `serverTimestamp()`.
- **Visible freshness**, using `calculatedAt`, distinguishing fresh
  from stale/missing values — never presented indistinguishably.
- **Per-shop isolation**: every read and write scoped through the
  existing, unmodified `isOwnerOf`/`isMemberOf` functions; no new
  Security Rule concept, no new access path, no query spanning more
  than one `businessId` in a single call.
- **Failed refresh must preserve the previous cached value and its
  `calculatedAt`** — never corrupting the cache, never blocking or
  corrupting the underlying business operation of any shop.
- **The twelve accepted Acceptance Criteria**, in full, as the binding
  definition of correct behavior — the seven original criteria and the
  five added by the accepted Specification Amendment.

**Expected runtime files** (per the Implementation Plan §5.11's
checkpoint table — an inventory for scoping purposes, not itself an
exhaustive contract): `apps/tenant/src/types.ts` (the `currentWorth?`
field addition), `apps/tenant/src/context/AppContext.tsx` (the refresh
function), a new Owner Portfolio component under
`apps/tenant/src/components/`, and the navigation wiring to reach it.
**No server module, no new route, no `firestore.rules` change, no new
Firestore index** — confirmed not required by the Implementation
Plan's own evidence (§5.4, §5.9, §5.13).

**Explicitly-deferred implementation choices, remaining within their
already-approved boundaries** (Implementation Plan §5.16, items 3–5;
not reopened by this Authorization):
- Exact entry-point placement in the UI — engineering discretion
  within the existing design system, per the addendum's own Non-Goal
  against redesigning the product.
- The numeric freshness threshold value — already explicitly deferred
  by the addendum's own original text.
- Whether `sourceRevision` is included in an initial implementation —
  already explicitly permitted to be omitted by the addendum's own
  original text.

---

## 3. What Is Not Authorized

- **Any cross-business aggregation, summation, averaging, or
  consolidation** of worth figures, in any form.
- **Any new or alternate Business Worth formula, approximation, or
  parallel calculation** — `currentWorth` must always equal what the
  existing Business Worth Engine would compute live for that shop, at
  cache-write time.
- **`currentWorth` as an authoritative source, anywhere** — it remains
  explicitly non-authoritative; no UI introduced by this work may
  present it as though it were.
- **Any consumption of `currentWorth` by Dashboard, Reports, the
  Business Worth Engine, Closings, or any Module #3–13 screen** — all
  must remain byte-for-byte unaffected, per the accepted Acceptance
  Criteria.
- **Any background job, scheduled recompute, or write-triggered hook**
  for `currentWorth` — explicitly, repeatedly forbidden throughout the
  entire governance chain for this feature; this Authorization does
  not create an exception.
- **Any change to `ShopSwitcher`'s existing behavior or semantics.**
- **Any subscription-related behavior** (Module #19) of any kind.
- **Any change to `firestore.rules` or `firestore.indexes.json`** —
  the Implementation Plan's own evidence found neither necessary; if
  implementation discovers otherwise, that is a genuine governance
  contradiction requiring a stop, not a decision to make in code (§4).
- **Any new cross-app business-logic-reuse precedent** (e.g., server
  code importing and executing tenant-side calculation logic) — the
  server-side candidate was not selected; this Authorization does not
  revisit that.
- **Any platform-wide Business Worth caching architecture**, or
  precedent for one, serving Dashboard, Reports, AI Insights,
  forecasting, trend analysis, or historical comparison.
- **Any unrelated UI redesign, visual-system change, or modernization**
  outside this one feature's own screen.
- **Any change to `17-owner-portfolio.md`** (the base module
  specification) — confirmed, twice now, not touched by anything in
  this feature's governance chain.
- **Correcting the addendum's own stale `17-multi-shop.md` references**
  (the "Depends on:" line, Purpose's first sentence) — a separate,
  explicitly deferred documentation matter, not part of this
  Authorization's runtime scope, and not to be folded into an
  implementation commit's diff.

Any future extension of Owner Portfolio functionality beyond this
scope requires its own separate governance record, following this same
sequence from its own Stage 1.

---

## 4. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3. If,
during implementation, engineering discovers that the approved scope
is insufficient, ambiguous, or requires a business-facing tradeoff not
already settled by the merged specification, the accepted amendment,
or the Rule 8 Assessment — **that finding returns to Product
Architecture, not to engineering judgment**, per the Governance
Standard's Non-Negotiable Principle 1 and this project's own
established precedent (Module #20 Phase 3's Authorization §4,
matched in kind). This applies in particular to:

- Any detected need to compute `currentWorth` for a shop without the
  Admin having visited it — returns to Product Architecture as a
  scope question, not an in-flight mechanism change.
- Any case where the client-supplied `calculatedAt` timestamp is found
  to produce a materially misleading freshness signal in practice —
  this is a defect to fix within the authorized mechanism (e.g.,
  tightening the freshness-threshold value, itself already an open,
  engineering-level decision per §2), not license to introduce
  `serverTimestamp()` or a server-side write path without returning
  here first.
- Any discovery that `firestore.rules` or `firestore.indexes.json`
  actually requires a change contrary to the Implementation Plan's own
  finding — stop and report, do not modify either file under this
  Authorization alone.

---

## 5. Signature

**Status:** ✅ Authorized in substance (decision recorded 2026-08-17);
**signature pending completion below.**

> Having reviewed: `17-owner-portfolio.md`; the `17-multi-shop-addendum-owner-portfolio.md`
> addendum, as merged with the accepted Specification Amendment; the
> Rule 8 Assessment (`READY AFTER DECISIONS`); the amended
> Implementation Plan; and this Implementation Authorization —
>
> I confirm that the governance required for Owner Portfolio v0.2 has
> been completed, including a fresh Authorization Readiness Assessment
> performed against the current, post-merge repository state. I
> authorize engineering to begin implementation only within the scope
> defined by this Authorization document.
>
> This authorization specifically permits implementation of: the
> Owner Portfolio screen; the explicit per-shop refresh mechanism; the
> `currentWorth` field at `businesses/{businessId}.currentWorth`; the
> client-supplied `calculatedAt` timestamp; visible freshness
> indication; and the twelve accepted Acceptance Criteria in full.
>
> This authorization does not permit: any cross-business aggregation
> or new worth formula; any background/scheduled/write-triggered
> recalculation mechanism; any change to `ShopSwitcher`, subscriptions,
> `firestore.rules`, or `firestore.indexes.json`; any new cross-app
> business-logic-reuse precedent; or any scope beyond that explicitly
> described in this document.
>
> If implementation reveals a genuine governance contradiction,
> engineering shall immediately stop work on the affected area and
> return the matter for Product Architecture review rather than
> introducing new business behavior.

**Product Architect:** SABUSHIMIKE Masceni
**Date:** 2026-08-17

**Governance requirements attached to this authorization, once
signature is complete, in effect for the duration of implementation**
(carried forward from the Module #20 Phase 3 precedent, unchanged in
kind):
- Any newly discovered architectural ambiguity shall be reported
  immediately, not resolved silently.
- Any scope expansion — including any cross-business, server-side, or
  formula-level change, however small — shall return to Product
  Architect review before proceeding.
- No business rule may be changed during implementation.
- No specification, Rule 8 Assessment, Implementation Plan, or
  amendment may be modified unless separately authorized.
- The addendum's own deferred stale-reference correction (§3, above)
  remains outstanding and is not waived by this Authorization; it is
  simply not a precondition of it.

**Implementation of the runtime files listed in §2 begins only once
this document's signature (§5) is complete — not before.**

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `docs/specs/*`, or `docs/architecture/*`
  file. None were touched to produce it.
- This record does not modify `17-owner-portfolio.md`, the merged
  addendum, the accepted Specification Amendment, the Rule 8
  Assessment, or the amended Implementation Plan — it sits downstream
  of all of them, authorizing based on their settled content, not
  amending it.
- This record preserves the distinction between the authorization
  *decision* (made in conversation, 2026-08-17) and this document as
  its *repository record* — the same distinction maintained at every
  earlier stage in this chain (concept approval, Stage 2 amendment
  acceptance).
- This record does not pre-authorize any future extension of Owner
  Portfolio functionality — each requires its own governance record,
  per §3's closing note.

**Lifecycle:** Concept Approved → Planned → Assessed → Product
Architecture Decision → Specification Amendment Accepted → Live
Specification Merged → Authorization Readiness Assessed → **Authorized**
(2026-08-17, signature pending). Not yet Implemented, not yet
Verified, not yet Closed. Engineering work under this document begins
only once §5's signature is complete, strictly within §2/§3's
boundary.
