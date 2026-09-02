Implementation Authorization

# Implementation Authorization — Data Protection Hardening (Decision 41A–41E)

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation is authorized to
begin, per this signature. Does not itself modify code.

**Status:** ✅ **AUTHORIZED — SIGNED BY THE PRODUCT ARCHITECT.** See
§10 below. Implementation may begin only after this document exists
in this signed state; it did not exist in any state before this
session.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](../specs/stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38) → [Decision 39](../specs/stock-count-data-loss-resilience-decision-39-amendment.md)
(implemented) → [Decision 40](../specs/stock-count-data-loss-resilience-decision-40-amendment.md)
(implemented) → [Decision 41](../specs/stock-count-data-loss-resilience-decision-41-amendment.md)
(✅ Accepted, governance decision stage — SABUSHIMIKE MASCENI, 2 Sept
2026) → [Decision 42](../specs/stock-count-data-loss-resilience-decision-42-amendment.md)
(✅ Accepted, resolved 41A/41C's open items — SABUSHIMIKE MASCENI, 2
Sept 2026) → [Rule 8 Assessment for Decision 41](./periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md)
(✅ **FINAL — 41A–41E all READY**) → [Implementation Plan](./periodic-contagem-data-protection-hardening-decision-41-implementation-plan.md)
(✅ **ACCEPTED BY THE PRODUCT ARCHITECT**, §22 — SABUSHIMIKE MASCENI, 2
Sept 2026) → **THIS Implementation Authorization** → *(next:
implementation, once this document exists in this signed state — not
itself performed by this document)*.

**Precedent note:** this document's structure follows the most
directly comparable precedent in this repository,
[`stock-count-data-loss-resilience-implementation-authorization.md`](./stock-count-data-loss-resilience-implementation-authorization.md)
(the Decision 38 authorization, same Contagem draft-durability domain,
signed) — adapted to Decision 41A–41E's own scope and governing chain,
not copied verbatim.

**Repository state at drafting:** `main = origin/main = b242d34`. The
Rule 8 Assessment's finalization and the Implementation Plan (with its
own §22 acceptance) exist as modified/new, uncommitted working-tree
files at the time of this authorization — an accurate baseline record,
not a gap: this document's authority rests on their *content*, which
this document re-reads directly, not on their commit status. **Nothing
has been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or `tests/` to produce this
document.**

**This document does not:** modify Decision 41, Decision 42, the Rule
8 Assessment, the Implementation Plan, `firestore.rules`,
`firestore.indexes.json`, `package.json`, or any application or test
code. It does not itself perform any implementation — §10's signature
is what authorizes a *subsequent, separate* implementation step to
begin, per this project's standing discipline.

**No duplicate:** no existing Implementation Authorization for
Decision 41A–41E was found in `docs/engineering/` prior to this
document.

---

## 1. Governance Completeness — What This Record Confirms

| Stage | Document | Status |
|---|---|---|
| Specification (frozen baseline) | `stock-count-data-loss-resilience-specification.md` | Frozen, Decision 38 applied |
| Decision 39 | `stock-count-data-loss-resilience-decision-39-amendment.md` | ✅ Accepted and Authorized, implemented |
| Decision 40 | `stock-count-data-loss-resilience-decision-40-amendment.md` | ✅ Accepted and Authorized, implemented |
| Decision 41 | `stock-count-data-loss-resilience-decision-41-amendment.md` | ✅ Accepted — governance decision stage |
| Decision 42 | `stock-count-data-loss-resilience-decision-42-amendment.md` | ✅ Accepted — governance decision stage, resolved 41A/41C |
| Rule 8 Assessment | `periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md` | ✅ FINAL, 41A–41E all READY |
| Implementation Plan | `periodic-contagem-data-protection-hardening-decision-41-implementation-plan.md` | ✅ Accepted by the Product Architect (§22) |
| **Implementation Authorization** | **this document** | **✅ Authorized (§10)** |
| Implementation | — | Not yet begun |
| Verification | — | Not yet begun |

Decisions 38, 39, and 40 are not reopened or redesigned by this
authorization — they remain the fixed baseline every element of
Decision 41A–41E's own design builds on, per the Rule 8 Assessment's
and Implementation Plan's own repeated confirmation.

---

## 2. What This Authorization Covers

Implementation of exactly the accepted Implementation Plan's design
for:

- **41A — Business-switch protection:** the `AppContext`-owned
  `pendingContagemFlushRef`/`registerPendingContagemFlush` mechanism;
  Periodic and Initial Stock Count each registering/unregistering
  their own `flushForSwitchIfNeeded` on mount/unmount; `switchShop`
  awaiting that registered flush before its own `updateDoc` changes
  `activeBusinessId`; `switchInFlightRef` preventing a concurrent
  second switch; a failed flush preventing the switch and leaving
  working state intact, surfaced via `ShopSwitcher`'s existing error
  display; no Firestore call at all when no work is pending.
- **41B — Initial Stock Count unmount protection:** one new
  unmount-cleanup effect in `InitialStockCountView.tsx` calling the
  existing `flushDraftNow`, mirroring Periodic Contagem's own
  already-shipped equivalent exactly.
- **41C — Failed autosave classification, bounded retry, and
  recovery:** the new `classifyDraftSaveFailure` function
  (`transient`/`legitimate`/`unknown`) using exactly the error codes
  the Plan justified (`unavailable`, `deadline-exceeded`,
  `resource-exhausted`, `internal`, `cancelled` as transient;
  `permission-denied` while subscription-blocked as legitimate;
  everything else, including `permission-denied` while NOT blocked, as
  unknown); the `isReadbackUnconfirmed` tag distinguishing a
  `getDocFromServer` failure from a `setDoc` failure and always routing
  to `unknown`; bounded automatic retry (3 retries after the initial
  attempt, 4 total, 1s → 2s → 4s increasing backoff); retry
  serialization through the existing `draftInFlightSaveRef`/
  `flushInFlightSaveRef`; per-row retry cancellation on a newer edit;
  manual retry for `save-failed`/`save-unknown`; retry-timer cleanup on
  unmount; the extended `draftSaveState` vocabulary in both views.
- **41D — Draft-listener error distinction:** the four-state
  `DraftAvailability` model (`loading`/`confirmed-no-draft`/
  `draft-exists`/`load-error`) for the periodic-meta, periodic-items,
  and initial-draft listeners; the `isOwner`-branched error callback
  that preserves staff-denial behavior exactly while giving an
  Owner-session error its own distinct, non-blocking state and manual
  recovery action.
- **41E — Subscription-blocked Contagem accessibility:** the
  reordered render gate (draft-loaded resolved before the subscription
  block is checked); the new `ReadOnlyDraftRecovery` component,
  genuinely read-only (disabled inputs, no save wiring, no finalize
  action), shown only when a blocked Owner has a meaningful existing
  draft, falling back to the existing, unchanged
  `SubscriptionBlockedNotice` otherwise; defense-in-depth early returns
  in the save-triggering functions when blocked, on top of
  `firestore.rules`' own unchanged, authoritative enforcement.

**Approved file surface**, exactly as the Implementation Plan
specifies and no wider:

- `apps/tenant/src/context/AppContext.tsx`
- `apps/tenant/src/components/PeriodicStockCountView.tsx`
- `apps/tenant/src/components/InitialStockCountView.tsx`
- `apps/tenant/src/lib/draftSaveFailureClassification.ts` (new file)
- `apps/tenant/src/components/ReadOnlyDraftRecovery.tsx` (new file)
- `apps/tenant/src/components/ShopSwitcher.tsx` — **optional, minimal**,
  only for the recommended (not required) local `isSwitching` UI guard
  named in the Plan's §4.4 item 10.

**Approved implementation order**, per the accepted Plan's §17,
preserved exactly: Phase 1 (41A) → Phase 2 (41B) → Phase 3 (41C) →
Phase 4 (41D) → Phase 5 (41E).

---

## 3. What This Authorization Does Not Cover

- **41F (browser teardown verification)** — remains an open,
  non-blocking recorded concern. Not implemented, not expanded, not
  reinterpreted by this authorization.
- **41G (same-row concurrent editing)** — remains a documented,
  non-blocking future concern. No collaborative-editing, conflict-
  resolution, versioning, or multi-device-synchronization architecture
  is authorized.
- Any change to `firestore.rules` or `firestore.indexes.json` — none
  is authorized; both the Rule 8 Assessment and the Implementation Plan
  independently confirmed none is required.
- Any redesign of Contagem's workflow, ShopSwitcher's general UI
  beyond the one named optional guard, Decisions 38–40's own
  mechanisms, Dashboard, Business Worth, finalized `StockCount`
  records, timeline/audit structures, subscription policy or pricing,
  or the product catalog.
- A generalized offline-first architecture, a new background job, a
  scheduled recomputation, or any new generalized persistent-storage
  layer.
- Any file outside §2's approved file surface.

---

## 4. Decision 41A–41E → Implementation Traceability

Every acceptance criterion this authorization covers is already
mapped, file-by-file and invariant-by-invariant, in the accepted
Implementation Plan's §4–§9 and re-confirmed against Decisions 41/42
in the Plan's own §22 acceptance review. This authorization does not
restate that mapping in full; it incorporates it by reference and
treats the accepted Plan as the binding engineering specification for
what "correct implementation" means for 41A–41E.

---

## 5. Risk Acknowledgment

Restated from the accepted Plan's §18, carried forward as authorized
risks with their already-specified mitigations, not reopened here:

- 41A's coordination sequencing is enforced by plain sequential
  `await`, not a separate timing mechanism — residual risk is
  implementation-bug-level, mitigated by the ordering-proof test the
  Plan's §15/§16 specifies.
- 41C's retry logic reuses the existing full-document `setDoc` path,
  making a duplicate retry idempotent by construction.
- 41D's new error banner and 41C's save-state label are confirmed, by
  the Plan's own analysis, to describe different lifecycle moments and
  are not expected to co-occur confusingly.
- 41E's `ReadOnlyDraftRecovery` is isolated into its own component
  specifically to prevent a future edit to the editable workspace from
  silently affecting the read-only path.
- The Firestore emulator's binary download remains blocked in this
  development/investigation environment by its network allowlist
  (`storage.googleapis.com` not permitted) — this is an environment
  constraint on *verification*, not a defect in the design, and is
  addressed explicitly in §8 and §12 below rather than being permitted
  to silently pass.

---

## 6. Explicitly Preserved Invariants

Restated, verbatim in substance, from the authorization request and
the accepted Plan, as binding constraints on the implementation this
authorization permits:

- `activeBusinessId` remains the old business for the entire duration
  of any 41A flush; no write may ever target the new business with old
  pending content.
- No retry may bypass `draftInFlightSaveRef`/`flushInFlightSaveRef`;
  no older retry may overwrite a newer edit, in either direction.
- A legitimate (subscription-blocked) rejection is never retried
  automatically, ever.
- An unknown outcome (readback failure, or any unverified error code)
  is never represented as confirmed success or confirmed failure.
- Staff-denial behavior for draft listeners is preserved exactly,
  unweakened, unaltered.
- `firestore.rules` remains the sole actual security boundary for
  every one of 41A–41E; every client-side check introduced is
  defense-in-depth or UX only, never a substitute for server-side
  enforcement.
- No incidental Firestore write may occur anywhere in 41E's read-only
  recovery path.

---

## 7. Rollback / Reversibility

Per the accepted Plan's §19, restated as a binding expectation of the
implementation: every file change authorized above is additive (new
functions, new optional state, new narrow branches), not a rewrite of
existing logic; no Firestore document shape changes, so no migration
is entailed by rollback in either direction; the five decisions' file
changes are independently revertable per phase, per the Plan's own
file-impact table (§9 of that document).

---

## 8. Verification Required Before This Increment Is Considered Complete

Mandatory, per the accepted Plan's §15/§16 and this authorization
request, not optional:

- `npm run lint`
- `npm run test:all` (full existing suite must remain green — this is
  a regression gate on Decisions 38–40's own existing behavior, not
  only new coverage)
- `npm run test:rules:emulator`, plus the full per-decision test list
  the accepted Plan's §15 specifies for 41A–41E
- The explicit ordering-proof test for 41A (flush resolves strictly
  before `updateDoc`)

**Explicit instruction, binding on whoever performs verification:** if
the Firestore emulator's binary remains undownloadable in the
implementation environment because of the `storage.googleapis.com`
network-allowlist restriction already documented in this governance
chain, that must be **reported honestly as an unverified/blocked
check**, never represented as a passing result. This authorization
does not consider `test:rules:emulator` satisfied by any means other
than an actual, successful emulator run.

---

## 9. Explicit Gate Statement

This document authorizes implementation of Decision 41A–41E, exactly
as designed in the accepted Implementation Plan, within the approved
file surface (§2), excluding 41F/41G and everything listed in §3, and
subject to the invariants in §6 and the mandatory verification in §8.
**Implementation may now begin, in a step separate from this
document's own creation.** This document itself contains no code
change and authorizes no commit or push of its own.

---

## 10. Product Architect Signature

**PRODUCT ARCHITECT**
**SABUSHIMIKE MASCENI**

**Decision:** AUTHORIZED
**Date:** 2 September 2026

> I confirm: the Implementation Plan for Decision 41A–41E was accepted
> by me; the FINAL Rule 8 Assessment found 41A–41E READY; Decisions 41
> and 42 are accepted and remain authoritative and unmodified by this
> authorization. I authorize implementation of 41A–41E strictly
> against the accepted Implementation Plan, within the approved file
> surface stated in §2, excluding 41F and 41G, authorizing no redesign,
> no Firestore rules or index change, no generalized offline
> architecture, and no collaboration/concurrency architecture. The
> approved file surface and the invariants in §6 must be preserved.
> Verification per §8 is mandatory before this increment is considered
> complete. Rollback remains available as specified in the accepted
> Implementation Plan.
