Business Domain Specification — Amendment

# Owner Portfolio v0.2 Addendum — `currentWorth` Refresh Mechanism Amendment

Version 1.0
**Status:** ✅ Accepted — Product Architect acceptance recorded 2026-08-17
(see "Product Architect Acceptance" below). **Implementation status:
NOT AUTHORIZED.** Acceptance of this amendment does not constitute
Implementation Authorization — that remains a separate, later gate.
**Amends:** [`17-multi-shop-addendum-owner-portfolio.md`](./17-multi-shop-addendum-owner-portfolio.md)
(v0.2, ✅ Concept/Specification Approved, `115c94c`) — specifically its
"Current Worth Cache Definition" and "Acceptance Criteria" sections.
Does not amend [`17-owner-portfolio.md`](./17-owner-portfolio.md) (the
base module spec) — fresh repository evidence in the prior Governance
Reconciliation Scope Determination confirmed the decision below does
not touch anything that document covers, and this amendment does not
revisit that finding.
**Depends on:** the [Rule 8 Assessment](../engineering/17-owner-portfolio-addendum-rule8-assessment.md)
that concluded **READY AFTER DECISIONS**, and the subsequent Product
Architect decision this amendment records.
**Origin, stated precisely for chronology:** the addendum's own
"Current Worth Cache Definition" described `currentWorth`'s refresh
behavior as *"read-time and lazy... a stale or missing entry triggers
recalculation."* A Rule 8 Assessment, performed **after** the addendum's
concept/specification approval, found this language ambiguous enough
between an automatic, Portfolio-triggered reading and a genuinely
different, user-triggered reading to block a "Ready" conclusion
outright — concluding **READY AFTER DECISIONS** instead, and naming
the resolution of this ambiguity as the first of three required
decisions. The Product Architect subsequently resolved it. **This
amendment records that decision. It does not, and must not be read to,
imply the decision was already known or implicit at Rule 8 Assessment
time or at the original concept/specification approval (`115c94c`).**

---

## Product Architect Decision Being Recorded

> `currentWorth` remains a non-authoritative, point-in-time cache. The
> Owner Portfolio provides an explicit per-shop refresh mechanism.
> Refresh uses the existing Business Worth Engine rather than
> introducing a separate server-side worth calculation. The Portfolio
> visibly communicates the cache's `calculatedAt`/freshness. V1
> introduces no background job, scheduled recomputation, or
> write-triggered hook for `currentWorth`.

Made after, and in direct response to, the Rule 8 Assessment's three
named required decisions (its §L, items 1–2 specifically; item 3 —
whether a new cross-app business-logic-reuse precedent should be
authorized — is resolved as a consequence: since the server-side
candidate is not selected, that question does not arise for V1 and
remains unauthorized, not merely unaddressed).

---

## Amendment 1 — Current Worth Cache Definition (clarification)

**Existing text, unchanged elsewhere in the addendum, quoted for
context:**

> Behavior is read-time and lazy: a fresh cache entry may be used as
> the Portfolio display source. A stale or missing entry triggers
> recalculation through the approved Business Worth Engine path, which
> then updates the Current Worth Cache through the approved
> implementation path. Never a background job, scheduled recompute, or
> write-triggered hook.

**This sentence is clarified, not replaced, as follows** (the
prohibition on background jobs, scheduled recompute, and
write-triggered hooks is preserved verbatim and unweakened):

> Behavior is read-time and lazy: a fresh cache entry may be used as
> the Portfolio display source. A stale or missing entry is never
> recalculated automatically, by the act of viewing it, or by any
> background, scheduled, or write-triggered mechanism. Recalculation
> occurs only through an **explicit, per-shop refresh action the
> Admin takes on the Owner Portfolio screen itself** — never
> initiated by the Portfolio's own load/render, and never spanning
> more than one shop per action. That action invokes the existing
> Business Worth Engine calculation path for that one shop only, then
> updates the Current Worth Cache through the approved implementation
> path.

**Why this is a clarification, not a scope change:** the prohibited
mechanisms (background job, scheduled recompute, write-triggered hook)
are unchanged, word for word. What changes is which of the *remaining*,
never-prohibited mechanisms actually satisfies "triggers
recalculation" — resolved from an ambiguous reading to an explicit
one. Nothing about *what may compute* `currentWorth` changes; only
*what may trigger* that computation is now stated unambiguously.

## Amendment 2 — New Acceptance Criteria

**The following are added to the addendum's "Acceptance Criteria"
section — genuinely new requirements, not clarifications of existing
ones, since no existing criterion addressed refresh interaction or
freshness visibility at all:**

- [ ] The Owner Portfolio provides an explicit, per-shop refresh
      action — never a bulk or cross-shop refresh, never automatic.
- [ ] A refresh action invokes the existing Business Worth Engine
      calculation path for that one shop only — no alternate or
      duplicate formula, matching the addendum's own pre-existing
      Cache Definition requirement.
- [ ] `currentWorth` remains, at all times, explicitly non-authoritative
      — this amendment does not change that status, and no UI
      introduced by it may present the value as though it were.
- [ ] The Portfolio visibly communicates each entry's freshness (using
      `calculatedAt`) to the Admin — a stale or missing value must be
      distinguishable from a fresh one, never presented
      indistinguishably.
- [ ] A failed refresh (network failure, calculation failure, or
      persistence failure) does not corrupt the cache, does not block
      or corrupt the underlying business operation of any shop, and
      leaves the previously-cached value (if any) intact and still
      correctly labeled by its own prior `calculatedAt`.

## What This Amendment Does Not Change

- The existing prohibition on background jobs, scheduled recompute,
  and write-triggered hooks — preserved verbatim (Amendment 1, above).
- The existing Security Constraints — unchanged; an explicit per-shop
  refresh action is inherently single-`businessId`-per-call, already
  consistent with, not requiring any change to, the existing
  constraint against a query spanning more than one `businessId`.
- The existing Non-Goals — no cross-business aggregation, no new
  authoritative worth source, no platform-wide caching precedent; none
  are touched.
- The `{ value, calculatedAt, sourceRevision? }` data shape — unchanged;
  `sourceRevision`'s optional/deferred status is unaffected.
- The freshness *threshold value* — still explicitly deferred to
  implementation planning, exactly as the original addendum states;
  this amendment resolves the *trigger mechanism*, not the *threshold
  number*.
- The base module specification, `17-owner-portfolio.md` — not touched,
  per the header above.

---

## Chronology, Stated Explicitly

```text
115c94c — Concept/Specification Approval (addendum v0.2)
        ↓
8365236 — Implementation Plan
        ↓
Rule 8 Assessment — READY AFTER DECISIONS
  (ambiguity identified; not resolved by the assessment itself)
        ↓
Product Architect Decision
  (made after, and in response to, the assessment above)
        ↓
This Amendment
  (records that decision against the addendum's own text)
```

This amendment does not, and must not be read to, imply that the
decision it records existed at any earlier point in this chronology.

---

## Product Architect Acceptance

**Status: ✅ Accepted, 2026-08-17.**

Accepted only after direct comparison against the live addendum's
actual current text (its "Current Worth Cache Definition" and
"Acceptance Criteria" sections, read in full, side by side with this
amendment's proposed before/after language) — not accepted from this
document's own summary of itself.

The review's findings, recorded here as the basis for acceptance:

1. **The amendment correctly changes only the decided behavior.** The
   original addendum allowed a stale/missing cache entry to trigger
   recalculation as a consequence of reading the Portfolio; the
   amendment removes that implicit recalculation, replacing it with an
   explicit, per-shop, Admin-initiated refresh — still through the
   existing Business Worth Engine path, still updating the existing
   cache through the approved implementation path. No second
   worth-calculation mechanism is introduced.
2. **The surrounding approved specification remains intact.**
   Confirmed unchanged: `currentWorth`'s shape and scope; the Business
   Worth Engine as sole calculation authority; Portfolio-only read
   access; the prohibition on other modules consuming `currentWorth`;
   freshness-threshold deferral; `sourceRevision` semantics; the
   cache/snapshot distinction; the existing seven Acceptance Criteria,
   unaltered.
3. **The five new Acceptance Criteria are within the amendment's
   legitimate scope** — appropriate consequences of the decision
   (explicit per-shop refresh; visible `calculatedAt` so cached data is
   never indistinguishable from freshly calculated data; a
   failure-handling criterion bounded to cache integrity and the
   underlying shop operation, not the worth model itself) rather than
   hidden feature expansion.
4. **The apparent overlap between the existing "worth figure is
   calculated via the existing engine" criterion and the new "refresh
   action invokes that engine for exactly one shop" criterion is not a
   defect.** They establish different guarantees — one concerns the
   worth calculation itself, the other constrains the new refresh
   action's behavior — and are judged not to warrant a wording change;
   tightening either could make the relationship between them less
   explicit, not more.

**What this acceptance means:** the amendment is accepted as the
authoritative amendment to the addendum's specification, incorporating
the explicit per-shop refresh and visible-freshness decision while
preserving the remainder of the previously accepted specification
(`115c94c`) unaltered.

**What this acceptance does not mean:**

- Implementation Authorization has not been granted.
- Implementation may not begin.
- The Stage 6 Implementation Plan amendment is not being reconsidered
  by this acceptance.
- No code has been, or should be, changed as a result of this
  acceptance.
- No requirement beyond what this amendment's own text states has been
  implicitly approved.

**`115c94c` remains the valid approval for everything the original
addendum already covered — this acceptance does not reopen or
diminish that approval; it adds to it.**

**This acceptance does not, by itself, merge this amendment's content
into the live addendum document**
(`17-multi-shop-addendum-owner-portfolio.md`) — that remains a
separate, explicitly-instructed action, not performed as part of
recording this acceptance.

---

## Governance Notes

- This amendment does not modify `17-multi-shop-addendum-owner-portfolio.md`
  itself — the live addendum's text remains unchanged by this document,
  even now that this amendment is Accepted; the changes above describe
  what *would* be merged into it, pending a separate, explicit
  instruction to do so.
- This amendment does not modify `17-owner-portfolio.md`, BDR-0010,
  POL-18-001, or any other governance document.
- This amendment's acceptance does not authorize implementation —
  Implementation Authorization remains a separate, later gate,
  contingent on this amendment's acceptance (now recorded), the
  companion Implementation Plan amendment, and a determination — made
  separately, not inferred from this acceptance — of whether
  Authorization's own requirements are satisfied.
- **Lifecycle:** Concept Approved → Planned → Assessed (READY AFTER
  DECISIONS) → Product Architecture Decision → Amendment Drafted →
  **Amendment Accepted** (this document, 2026-08-17) → *(pending)*
  Merge into live addendum → *(pending)* Implementation Authorization
  determination → *(pending)* Implemented.
