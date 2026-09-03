# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 55 — Same-Row Concurrent Observation Conflict Semantics

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** The product-level "what must a same-row conflict-
resolution mechanism achieve" question that [Decision 47](./stock-count-data-loss-resilience-decision-47-amendment.md)
§5 explicitly left open ("the technical mechanism achieving either half
of this is explicitly NOT decided"), corresponding to Finding C (§IV.C,
"Same-Row Concurrent Legitimate Editing (Reinstated)") of the
[Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md),
reinstated as **FAIL — CRITICAL** under Decision 46. This amendment
additionally resolves, at the product-requirement level only, the
previously open finalization-interaction question: whether an
unresolved same-row conflict may block finalization.
**Builds on:** [Decision 44](./stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, shared live data / no-silent-loss), [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 47](./stock-count-data-loss-resilience-decision-47-amendment.md)
(✅ Accepted, Shared Live State & Conflict Preservation), [Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, Exactly-One Finalization), [Decision 52](./stock-count-data-loss-resilience-decision-52-amendment.md)
(✅ Accepted, Viewer Authorization), and [Decision 53](./stock-count-data-loss-resilience-decision-53-amendment.md)
(✅ Accepted, Finalizer Authorization) — this decision assumes and does
not restate, reinterpret, weaken, or expand any of their governance
content. It answers exactly one question those decisions left open:
**what the product must mean when two legitimately authorized editors
record different values for the same row**, and, derivatively, whether
an unresolved instance of that state may block finalization.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
or 54's own already-accepted content.
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

Decision 47 already prohibits blind last-write-wins and requires that a
genuine simultaneous collision be detected, with both legitimate
observations preserved/accounted for — but Decision 47 deliberately
left the technical mechanism open, and no prior decision has stated
**what the product itself must mean** when two legitimately authorized
editors record different values for the same row.

The Periodic Contagem Technical Verification & Architecture Report
(immediately preceding this decision) confirmed, by direct code
inspection, that the current implementation has no writer-identity
field, no revision field, and no conflict-detection mechanism on
`PeriodicStockDraftItem` at all — a same-row collision today is
silently resolved by whichever write physically arrives last at the
server, with no record that a second, differing, equally legitimate
observation ever existed. This is exactly the outcome Decision 47
prohibits.

Before any technical mechanism can be designed, the Product Architect
must decide the **business semantics** of a collision: whether the
system is permitted to auto-resolve it, what the active working
quantity means while it is unresolved, who may resolve it, what a
Viewer is shown, and whether resolving a conflict is itself a new
observation. Without this decision, any technical design would have to
guess at — or silently invent — product policy, which Decision 47 §5
already forbids.

---

# 2. Scenario

**Active Periodic Contagem, `Produto X`.**

- Owner/Admin is counting on Device A.
- The currently delegated Editor is counting on Device B.
- Both are legitimate active editors, per Decision 46 §1.
- They independently, physically observe the same product's stock and
  each enter a value:

```text
Owner/Admin:        Produto X = 12
Delegated Editor:   Produto X = 15
```

- Neither entry is erroneous, unauthorized, or stale — both editors
  were counting the same physical stock, in good faith, at
  approximately the same time, and neither has any way of knowing the
  other was also counting `Produto X` until the system detects the
  collision.
- The system detects that these are two conflicting, differing
  observations of the same product row within the same active
  Contagem.

---

# 3. Options Considered

**For whether the system may automatically choose one value:**

1. Owner/Admin's value automatically wins — rejected: silently
   discards the delegated Editor's equally legitimate observation,
   directly violating Decision 47's no-silent-loss requirement.
2. Latest value automatically wins — rejected: same problem, plus
   rewards network/typing latency, an arbitrary, non-substantive
   tiebreaker.
3. First durable value automatically wins — rejected: same problem in
   reverse, discourages the second-arriving legitimate observation.
4. Highest/lowest value automatically wins — rejected: has no basis in
   physical-observation semantics and would silently encode an
   unauthorized business rule.
5. **No automatic winner — an explicit conflict state, resolved by an
   authorized human — selected.** Preserves both observations,
   introduces no arbitrary or unauthorized business rule, and keeps a
   human able to recount, ask, or otherwise determine which figure is
   correct.

**For what happens to the active working quantity:**

1. One value remains the active working quantity while the other is
   preserved as a side conflict record — rejected: risks an operator
   glancing at a settled-looking number and reasonably assuming it is
   correct, reintroducing a soft form of auto-resolution by
   presentation.
2. **The row enters an explicit `CONFLICT` state with no single
   authoritative working quantity until resolved — selected.** Honest:
   the working total for `Produto X` is genuinely undetermined until a
   human resolves it, and the working state must say so.

**For who resolves the conflict:**

1. Owner/Admin only — considered, not selected: would introduce an
   asymmetry Decision 46 does not currently draw for the counting/
   editing activity itself.
2. **Owner/Admin + the currently delegated Editor — selected.** Mirrors
   Decision 46's symmetric editing authority; resolving a conflict over
   an active row is a continuation of the counting/editing activity
   both roles are already equally entrusted with, not a higher-
   consequence, once-only act like finalization.
3. Some other already-authorized role — does not apply; no such role
   exists in the accepted governance chain (Viewer is explicitly
   non-editing, per Decision 52), and this decision introduces no new
   role.

---

# 4. Recommended and Adopted Product Decision

**Adopted: no automatic winner, explicit `CONFLICT` state, with no
single authoritative working quantity while unresolved; resolution
authority held jointly by Owner/Admin and the currently delegated
Editor.**

An automatic winner of any kind, by any rule, necessarily discards or
subordinates a legitimate physical observation without evidence that it
is actually wrong — this is precisely what Decision 47 was written to
prohibit. An explicit `CONFLICT` state costs a small amount of operator
convenience in the rare moment a genuine collision occurs, in exchange
for data integrity, auditability, and operator clarity. Restricting
resolution to Owner/Admin alone would introduce an asymmetry Decision
46 does not currently draw — Decision 46 treats Owner/Admin and the
delegated Editor as equally legitimate active editors for the counting
activity itself; only finalization is deliberately restricted to
Owner/Admin, by Decision 53, as a distinct, higher-consequence,
exactly-once act. Resolving a conflict over an actively-open row is
counting-adjacent work, not finalization-adjacent, so this decision
keeps it inside the same symmetric editing authority Decision 46
already grants both roles.

---

# 5. Exact Requirements

1. **Both observations are preserved.** Neither `12` nor `15` is
   discarded, hidden, or overwritten at any point — both remain
   durably associated with `Produto X` for this active Contagem for as
   long as the Contagem remains active and, if still relevant,
   referenceable after resolution (item 6 below).
2. **No automatic winner selection is permitted**, by any rule
   (role-based, recency-based, value-based, or otherwise). A conflict
   is never silently resolved by the system.
3. **Working state:** upon detection of a genuine collision, `Produto
   X`'s row enters an explicit **`CONFLICT`** state. There is no
   single authoritative working quantity for that row while it remains
   in this state — the working total for the Contagem overall must
   reflect that this row is unresolved, not silently substitute either
   candidate value as if it were settled.
4. **Conflict resolution authority:** either Owner/Admin or the
   currently delegated Editor (per Decision 46's existing symmetric
   editing authority) may resolve the conflict. A Viewer may never
   resolve a conflict, per Decision 52, unchanged.
5. **Viewer visibility:** a Viewer must be able to see (a) that the row
   is in a `CONFLICT` state, (b) both preserved observations (`12` and
   `15`, each attributable to the role/session that entered it,
   consistent with Decision 52's live-synchronization entitlement and
   its authoritative-state/stale-state/historical-observation
   distinctions), and (c) that the row has no currently-settled working
   value. A Viewer may not alter or resolve the conflict, per Decision
   52's existing, unchanged prohibition on Viewer edit authority.
6. **Conflict resolution does not itself create a new physical
   observation.** Resolving `12 vs 15` is an adjudication over the two
   already-preserved legitimate observations, not a fresh act of
   physical counting — the resolver selects (or otherwise determines,
   e.g. by confirming one of the two figures) which becomes the working
   value going forward. This decision does not authorize, and does not
   require, treating a resolution as a third, independent observation.
   (Whether a resolver may instead choose to trigger an entirely new
   physical recount, as a separate act distinct from resolving between
   the two existing figures, is not addressed by this decision and is
   not assumed either way.)
7. **An unresolved `CONFLICT` row prevents finalization.** A Periodic
   Contagem containing any unresolved `CONFLICT` row must not be
   finalized, by anyone, under any circumstance this decision
   anticipates.
8. **The Owner/Admin remains the sole finalizer**, exactly as Decision
   53 already establishes — this decision adds a *precondition* on
   when Owner/Admin's existing finalization authority may be exercised;
   it does not grant finalization authority to any other role, and does
   not touch Decision 53's own content.
9. **Finalization does not itself resolve conflicts.** An attempt to
   finalize while one or more `CONFLICT` rows remain unresolved must be
   rejected outright — finalization is never usable as an implicit,
   side-effect way of settling a conflict, and never silently picks a
   value on the resolver's behalf merely because finalization was
   attempted.
10. **All conflicts must be resolved before finalization can succeed.**
    There is no partial-finalization path that finalizes settled rows
    while leaving conflicted rows out, and no override that lets
    Owner/Admin finalize "around" an unresolved conflict — the entire
    Contagem remains ineligible for finalization until every `CONFLICT`
    row has been resolved per items 4–6 above.
11. **Counting/editing other rows continues normally while a conflict
    exists.** A `CONFLICT` on one row (e.g. `Produto C`) does not stop
    or restrict ordinary counting/editing activity on any other row
    (e.g. `Produto A`, `Produto B`, `Produto D`, `Produto E`) — only the
    finalization action itself is gated by the presence of any
    unresolved conflict, not the ongoing collaborative counting
    workflow Decision 46 already establishes.
12. **A failed/rejected finalization attempt does not discard either
    preserved observation.** Rejecting a finalization attempt because a
    conflict remains unresolved is itself subject to the same
    no-silent-loss principle as everything else in this decision — the
    rejection changes nothing about the two preserved observations;
    they remain exactly as durable and available for resolution as
    before the attempt.
13. **Once all conflicts are resolved, normal Decision 50 exactly-once
    finalization rules apply**, entirely unchanged — this decision adds
    a precondition that must be satisfied *before* Decision 50's own
    exactly-one-finalization guarantee is engaged; it does not alter,
    narrow, or duplicate anything Decision 50 already governs once that
    precondition is met.

---

# 6. Interaction With Existing Decisions

- **Decision 44** (shared live data, no-silent-loss): this decision is
  a direct, literal application of Decision 44's no-silent-loss
  principle to the specific case of a same-row collision — nothing
  here alters Decision 44's own content.
- **Decision 46** (Dual Active Editor Authority): unaffected and
  unaltered. This decision relies on, and is fully consistent with,
  Decision 46's existing grant of simultaneous, equally legitimate
  editing authority to Owner/Admin and the currently delegated Editor —
  §5 item 4's resolution-authority requirement is a direct extension of
  that same symmetric grant, not a new authority model.
- **Decision 47** (Shared Live State & Conflict Preservation):
  **unaltered.** This decision is the direct governance-level answer
  Decision 47 §5 left open. Every requirement in §5 above — including
  the new finalization-blocking requirement (items 7–13) — traces
  directly to Decision 47's own no-silent-loss and detect-and-preserve
  principles, extended to the finalization-attempt case; none of
  Decision 47's own content is reopened or altered.
- **Decision 50** (Exactly-One Finalization): **unaltered, and its own
  governing scope remains exactly as before.** Decision 50 continues to
  govern: exactly-one finalization (at most one attempt may succeed);
  rejection of stale finalization attempts; protection against a
  second, competing authoritative outcome; and post-finalization
  integrity/immutability. This decision (55) adds a *precondition* that
  must hold before Decision 50's own machinery is ever engaged for a
  given finalization attempt — it does not narrow, duplicate, or
  reinterpret anything Decision 50 already decides, and it does not
  decide *how* the no-unresolved-conflicts precondition is technically
  checked (that remains Technical Design).
- **Decision 52** (Viewer Authorization): unaffected. §5 items 4–5
  apply Decision 52's existing Viewer permissions/prohibitions and
  live-synchronization-entitlement requirements to the conflict case
  specifically, without altering them.
- **Decision 53** (Finalizer Authorization): **unaltered, and its own
  governing scope remains exactly as before.** Decision 53 continues to
  govern, and continues to be the sole source of, one fact: Owner/Admin
  is the only authorized finalizer. This decision (55) does not grant
  finalization authority to any other role, and does not change who may
  finalize — it only adds a condition on *when* the Owner/Admin's
  existing, unchanged finalization authority may be successfully
  exercised. An unresolved conflict does not transfer, suspend, or
  reassign finalizer authority to anyone.

---

# 7. What This Decision Does NOT Decide

**The product requirement is now decided: unresolved conflicts block
finalization.** This is no longer an open question at the product
level (§5 items 7–13 above). What remains explicitly undecided, and is
not selected or authorized by this decision, is the **technical
enforcement** of that requirement and everything else this decision has
never covered:

- How the "no unresolved conflicts" precondition is technically checked
  before a finalization attempt is accepted — any Firestore
  transaction, security-rule condition, schema field, or query used to
  detect an unresolved `CONFLICT` row at finalization time.
- Any Firestore transaction, schema, field name, or revision algorithm
  for the conflict mechanism generally.
- Any Cloud Function or security-rule implementation.
- Any UI component or interaction design for displaying or resolving a
  `CONFLICT`-state row, or for communicating a rejected finalization
  attempt to the Owner/Admin.
- Any IndexedDB or client-cache implementation detail.
- Any conflict-storage/data-model implementation (how the two preserved
  observations are technically represented).
- Any change to Decision 50's own exactly-one-finalization mechanism
  (still entirely open, unaffected by this amendment) or Decision 53's
  own finalizer-authorization mechanism (still entirely open, unaffected
  by this amendment).
- Any change to Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, or
  54's own already-accepted content.
- Any Implementation Plan or Implementation Authorization.

The distinction is exact: **what** must happen (unresolved conflicts
block finalization) is decided by this document; **how** the system
enforces it remains entirely for the subsequent Technical Design phase,
alongside every other technical mechanism this governance chain has
already left open (exactly-once finalization, conflict detection,
conflict preservation, finalization immutability — none of which is
resolved, narrowed, or removed by this amendment).

---

# 8. Explicit Non-Goals

This decision does not:

- Select or design any technical mechanism (see §7 above).
- Alter who may edit (Decision 46), who may finalize (Decision 53), who
  is eligible to be delegated (Decision 54), or Viewer permissions
  (Decision 52).
- Authorize any code, `firestore.rules`, schema, UI, or test change.
- Constitute an Implementation Plan amendment or Implementation
  Authorization.
- Reopen, reinterpret, weaken, or expand Decisions 44 through 54's own
  already-accepted content.

---

# 9. Effect on Rule 8

This decision resolves the **product-level "what must the mechanism
achieve" question** that Decision 47 §5 explicitly left open and that
the Rule 8 Assessment's own Finding C (§IV.C, same-row concurrent
legitimate editing, reinstated as CRITICAL under Decision 46) has been
waiting on. This decision additionally resolves, at the same
product-requirement level, the previously flagged remaining governance
question of the finalization-time interaction: **unresolved conflicts
block finalization is now a decided product requirement**, not an open
question.

- **Narrows, but does not resolve, Finding C (§IV.C) and the related
  conflict-preservation requirement (44-S-G/Decision 47).** Decision 47
  already resolved *that* a technical mechanism must achieve
  detect-and-preserve; this decision resolves *what "preserve" means as
  a product outcome* (an explicit `CONFLICT` state, dual-authority
  resolution, no auto-winner, and now: no finalization while any
  conflict is unresolved) — but the technical mechanism itself
  (precondition/transaction/conflict-record schema, and the
  finalization-time check that enforces §5 items 7–13) remains exactly
  as open as Decision 47 left it. **Finding C remains FAIL / OPEN —
  technical design required** even with this decision accepted.
- **Resolves, at the product-requirement level only, the
  finalization-interaction question.** What must happen (unresolved
  `CONFLICT` rows block finalization; Owner/Admin remains the sole
  finalizer; finalization never itself resolves a conflict) is now
  decided. How the system technically enforces that rule — the
  precondition check's mechanism, timing, and implementation — is not
  decided by this amendment and remains for the Technical Design phase.
- **Does not remove, weaken, or resolve any existing technical
  finding.** The CRITICAL technical findings concerning exactly-once
  finalization (Decision 50, Finding E), conflict detection (Finding
  C), conflict preservation (the same), and post-finalization
  immutability (Finding G) all remain exactly as classified — **FAIL /
  OPEN — technical design required.** This amendment adds a new
  product-level precondition those technical designs must additionally
  satisfy; it does not narrow the technical work already required, and
  does not move any of these findings toward RESOLVED.
- Does **not** touch, narrow, or resolve any other Rule 8 finding
  (44-S-D, 44-S-F, 44-D, 44-F, 44-S-A, 44-S-C, or the
  eligible-delegate-pool question — all already governance-resolved and
  unaffected) or any CRITICAL/HIGH technical finding in §IV.P.
- The Rule 8 verdict remains **READY AFTER DECISIONS** — a
  product-semantics decision is not a technical mechanism, exactly as
  every other accepted decision in this chain has maintained.

---

# 10. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** Same-row conflict semantics and the finalization-interaction
question are now RESOLVED — GOVERNANCE REQUIREMENTS at the Product
Architect governance-requirement level. All technical
implementation/enforcement mechanisms remain OPEN. Verdict remains
READY AFTER DECISIONS — see the Rule 8 artifact's own updated record of
this decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED — this acceptance does not
constitute Implementation Authorization
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the same-row concurrent observation
conflict semantics governance requirements in §5–§9 above are adopted,
in particular: **both legitimate conflicting observations must be
preserved**; **no automatic winner is permitted**, by any rule; **the
affected row enters an explicit `CONFLICT` state**, with no settled
working quantity while unresolved; **Owner/Admin and the currently
delegated Editor may resolve the conflict**, mirroring Decision 46's
symmetric editing authority; **Viewers may see the conflict and both
observations but cannot resolve it**, per Decision 52 unchanged;
**conflict resolution itself is not a new physical observation**; **an
unresolved `CONFLICT` row prevents finalization**; **Owner/Admin
remains the sole finalizer**, per Decision 53 unchanged; **finalization
never implicitly resolves a conflict**; **all conflicts must be
resolved before finalization succeeds**, with no partial-finalization
or override path; **other rows may continue to be counted while a
conflict exists**; **rejecting a finalization attempt must not discard
either observation**; and **once all conflicts are resolved, Decision
50's exactly-once finalization rules apply unchanged**. The technical
mechanism itself — schema, conflict-record representation, revision/
precondition algorithm, `firestore.rules` implementation, the
finalization-time precondition check, and UI — is explicitly NOT
decided by this acceptance and remains open, per §7 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52,
53, and 54 were each accepted. This acceptance does not authorize
implementation, `firestore.rules` changes, schema changes, UI changes,
code changes, tests, a technical mechanism for conflict representation
or enforcement, an Implementation Plan amendment, or an Implementation
Authorization. The Rule 8 verdict remains READY AFTER DECISIONS — every
CRITICAL/HIGH technical finding in §IV.P, including Finding C (same-row
conflict detection/preservation, still entirely unbuilt), Finding E
(finalization uniqueness), and Finding K (shared-device/cache
isolation, still UNVERIFIED), remains exactly as classified and
unaffected by this decision. All previously accepted decisions (44, 45,
46, 47, 48, 49, 50, 51, 52, 53, 54) remain substantively unchanged.
