Specification Amendment — Decision Recorded

# Decision 47 — Resolution of 44-S-G: Live Synchronization as Primary Conflict Avoidance
## (Amendment to `stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`, applicable under the accepted Decision 46 Dual Active Editor model)

**Status:** ✅ **ACCEPTED AND AUTHORIZED AS GOVERNANCE DECISION —
REQUIREMENTS ONLY. NOT IMPLEMENTATION AUTHORIZATION.**

This document records the Product Architect's resolution of **44-S-G
(Conflict Handling)** — reopened and scope-expanded by [Decision 46 —
Dual Active Editor Authority](./stock-count-data-loss-resilience-decision-46-amendment.md)
and by [Part IV of the Rule 8 Reassessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(§IV.M item 3/4, §IV.P finding 3, §IV.Q). It resolves the **product-level**
question of what conflict handling must achieve under the Dual Active
Editor model. It does **not** select a technical mechanism, does not
resolve any other open item from Part IV's decision list (44-S-D,
44-S-F, 44-D, 44-F, the new delegated-Editor rules branch, or the new
conflict-detection schema/mechanism), and does not constitute an
Implementation Plan or an Implementation Authorization.

**Governing chain:** [`stock-count-data-loss-resilience-decision-44-amendment.md`](./stock-count-data-loss-resilience-decision-44-amendment.md)
(✅ Accepted, 3 Sept 2026) →
[Decision 44 Refinement — Single Active Editor + Live Read-Only Viewers](./stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md)
(✅ Accepted, 3 Sept 2026) →
[Decision 45](./stock-count-data-loss-resilience-decision-45-amendment.md)
(✅ Accepted, resolves 44-S-B/44-S-E) →
[Decision 46 — Dual Active Editor Authority](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, 3 Sept 2026) →
[Rule 8 Reassessment, Part IV](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(verdict READY AFTER DECISIONS; reopened 44-S-G, scope-expanded, as a
CRITICAL Product Architect decision) → **this amendment ("Decision
47"), now accepted**.

**Repository baseline:** `main = origin/main`, unchanged. No
application code, `firestore.rules`, schema, UI, or test implementing
any part of Decision 44, its Refinement, Decision 45, Decision 46, or
this Decision 47 exists anywhere in the repository at this baseline.

**Numbering:** the parent chain's highest accepted decision prior to
this document is Decision 46. A repository-wide search confirms no
file references a "Decision 47" or higher prior to this document. This
is recorded as **Decision 47**, the next collision-free number,
following the same discipline Decisions 42 and 45 already established
when resolving specific open Rule 8 findings.

**Source:** Part IV of the Rule 8 Reassessment, §IV.M (items 3–4),
§IV.C, §IV.N, §IV.P (finding 3), and §IV.Q, which identified 44-S-G as
reopened, scope-expanded, and CRITICAL, and stated precisely, without
inventing a resolution itself, what the open question was. This
document answers that question and no others.

---

## 1. Decision 47 Purpose

To resolve the **product-level** portion of 44-S-G — what conflict
handling must achieve when Owner/Admin and a delegated Editor are both
legitimately editing the same Periodic Contagem — so that the Rule 8
decision list can be reduced accordingly. This Decision does not
authorize implementation of anything, does not reopen Decision 44, its
Refinement, Decision 45, or Decision 46, and does not resolve any other
item Part IV left open.

---

## 2. Decision 47 — Live Synchronization as Primary Conflict Avoidance (resolves the product-level portion of 44-S-G)

### 2.1 Durable writes must be synchronized live

A legitimate editor's persisted quantity change must propagate to the
other legitimate editor in near real time. The shared Contagem state
must remain continuously synchronized rather than relying on manual
reloads as the primary mechanism.

### 2.2 Live synchronization is the primary conflict-avoidance mechanism

Its purpose is to minimize the period in which two legitimate editors
can unknowingly work from stale values. The system should expose the
latest durable shared state to both legitimate editors as changes
occur.

### 2.3 No blind last-write-wins policy is authorized

Live synchronization does not authorize silently discarding one
legitimate physical observation. This restates, and does not weaken,
Decision 44 §9/§21's no-silent-loss invariant and the refinement's own
§16.

### 2.4 Genuine simultaneous collisions must still be detected and preserved

If a genuine simultaneous collision nevertheless occurs — despite live
synchronization minimizing the window for it — the system must:

- detect that the competing legitimate observations were made against
  conflicting/stale state;
- never silently discard either observation;
- preserve/account for the competing observation, according to
  whatever technical conflict-handling mechanism the subsequent
  technical design stage selects.

### 2.5 This is product-level behavior, not a mechanism selection

This decision does **not** choose Firestore transactions, revisions,
timestamps, locks, version vectors, conflict documents, UI dialogs, or
any other implementation mechanism. Those remain open technical design
questions.

---

## 3. The Correct Conceptual Framing (restated, not weakened)

This decision does **not** claim to eliminate all possible conflicts.
The precise, governing principle is:

> **Live synchronization is the primary mechanism for preventing and
> minimizing conflicting edits; genuine simultaneous collisions must
> still be detected and must not result in silent data loss.**

This directly answers Part IV §IV.M items 3–4 at the product level:
what must be preserved when Admin and delegated Editor enter different
observations for the same row (neither may silently disappear), while
explicitly declining to answer whether the current data model contains
enough information to do so (§IV.M item 4's FAIL finding is **not**
resolved by this decision — see §5 below).

---

## 4. What This Resolves, Precisely

**44-S-G's product-level question — what must same-row conflict
handling guarantee under the Dual Active Editor model — is now
answered:** live synchronization first, as the primary avoidance
mechanism; detect-and-preserve (never silently discard) for whatever
genuine collisions still occur despite that. This closes 44-S-G as a
Product Architect decision.

---

## 5. What This Does NOT Resolve

- **The technical mechanism achieving §2.1's "near real time"
  propagation** (extending the existing passive whole-draft notice
  into genuine row-level live adoption, or another approach) —
  undecided.
- **The technical mechanism achieving §2.4's detect-and-preserve
  requirement** (version/precondition check, conflict record, edit
  history, or another approach, per the candidate comparison already
  catalogued in Part I §F / Part III §III.2) — undecided.
- **The data-model gap Part IV §IV.C/§IV.M item 4 identified as a
  FAIL** — `PeriodicStockDraftItem` still has no writer-identity or
  per-row version/timestamp field. This decision states the product
  requirement the eventual schema must support; it does not add the
  field.
- Every other item Part IV left open: 44-S-D (authority model
  mechanism), 44-S-F (former-delegate reconnection mechanism), 44-D
  (finalization guard), 44-F (cache isolation verification), the new
  delegated-Editor `firestore.rules` branch, 44-S-A (Viewer
  authorization), 44-S-C (Finalizer authorization), and the
  eligible-delegate-pool question (Part IV §IV.O).

**This decision does not make the Rule 8 verdict READY.** The technical
blockers Part IV identified as CRITICAL/HIGH remain exactly that —
listed in full in §7 below.

---

## 6. Explicit Non-Goals

Decision 47 does not authorize:

- Selecting or implementing any technical mechanism for live adoption,
  conflict detection, or conflict preservation.
- Resolving 44-S-A, 44-S-C, 44-S-D, 44-S-F, 44-D, 44-F, the
  eligible-delegate-pool question, or the delegated-Editor rules
  branch.
- Any change to `firestore.rules`, application code, schemas, UI, or
  tests.
- Any Implementation Plan or Implementation Authorization.
- Any claim that Rule 8's verdict has moved to READY.

---

## 7. Effect on the Rule 8 Reassessment's Blocking/Decision List (Part IV)

Per Part IV (§IV.P, §IV.Q), 44-S-G was reopened and scope-expanded as a
CRITICAL Product Architect decision, logically first in the dependency
order Part IV §IV.R established.

**After this Decision 47:**

- **44-S-G — product-level portion RESOLVED.** What conflict handling
  must guarantee is now settled (live-sync-first, detect-and-preserve).
  The technical mechanism achieving it remains open — folded into the
  still-open "same-row conflict-detection mechanism" and "genuine
  dual-Editor live adoption" technical design items Part IV already
  named.
- **All twelve technical blockers Part IV listed remain open,
  unaffected in technical status by this decision:** detecting
  stale/conflicting legitimate writes; preventing silent last-write-
  wins (now a confirmed *requirement*, not merely a risk, per §2.3);
  preserving/accounting for competing observations; live working-state
  adoption; delegated Editor authorization; authority/reassignment
  enforcement; former delegated Editor stale-write rejection;
  exact-one finalization; post-finalization immutability;
  offline/reconnect safety; multi-tab authority; shared-device/cache
  isolation.
- **44-S-D, 44-S-F, 44-D, 44-F** — unaffected, untouched by this
  decision.
- **44-S-A, 44-S-C, eligible-delegate pool** — unaffected, remain open,
  non-blocking.

---

## 8. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 3 September 2026
**RULE 8:** Updated accordingly (see the Rule 8 Reassessment artifact's
own record of this decision) — verdict remains READY AFTER DECISIONS,
NOT READY FOR IMPLEMENTATION
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the product-level conflict-handling
requirement for the Dual Active Editor model (§2–§3 above) is adopted:
live synchronization as the primary conflict-avoidance mechanism,
combined with a mandatory detect-and-preserve requirement for any
genuine simultaneous collision that still occurs. No blind
last-write-wins policy is authorized. The technical mechanism achieving
either half of this requirement is explicitly NOT decided by this
acceptance and remains open, per §5 and §7 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 3 September 2026

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, and 46 were each accepted.
This acceptance does not authorize implementation, Firestore rule
changes, schema changes, UI changes, code changes, a conflict-detection
mechanism, a live-adoption mechanism, an Implementation Plan amendment,
or an Implementation Authorization. The Rule 8 verdict remains READY
AFTER DECISIONS, not READY — the technical blockers listed in §7 are
unaffected by this decision and require their own subsequent
resolution.
