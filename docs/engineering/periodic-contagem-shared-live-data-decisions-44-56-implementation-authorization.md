Implementation Authorization

# Implementation Authorization — Periodic Contagem Shared Live Data (Decisions 44–56, including the Finding K Mechanism)

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation is authorized to
begin, strictly within the scope defined below, once signed. Does not
itself perform implementation and does not modify code,
`firestore.rules`, schema, UI, or tests.

**Status:** ✅ **Authorized. Signed by the Product Architect** — see
§10, below. **Authorization is not evidence of implementation
completion** — see §9.

**Governing chain:**
[Decision 44](../specs/stock-count-data-loss-resilience-decision-44-amendment.md)
→ [Decision 45](../specs/stock-count-data-loss-resilience-decision-45-amendment.md)
→ [Decision 46](../specs/stock-count-data-loss-resilience-decision-46-amendment.md)
→ [Decision 47](../specs/stock-count-data-loss-resilience-decision-47-amendment.md)
→ [Decision 48](../specs/stock-count-data-loss-resilience-decision-48-amendment.md)
→ [Decision 49](../specs/stock-count-data-loss-resilience-decision-49-amendment.md)
→ [Decision 50](../specs/stock-count-data-loss-resilience-decision-50-amendment.md)
→ [Decision 51](../specs/stock-count-data-loss-resilience-decision-51-amendment.md)
→ [Decision 52](../specs/stock-count-data-loss-resilience-decision-52-amendment.md)
→ [Decision 53](../specs/stock-count-data-loss-resilience-decision-53-amendment.md)
→ [Decision 54](../specs/stock-count-data-loss-resilience-decision-54-amendment.md)
→ [Decision 55](../specs/stock-count-data-loss-resilience-decision-55-amendment.md)
→ [Decision 56](../specs/stock-count-data-loss-resilience-decision-56-amendment.md)
→ [Rule 8 Reassessment](./periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(✅ READY AFTER DECISIONS, commit `02cd599`) → [Technical Design for
Decisions 44–55](./periodic-contagem-decisions-44-55-technical-design.md)
(commit `96a28eb`) → [Finding K — Cache/Session Isolation Mechanism
Analysis](./finding-k-isolation-mechanism-analysis.md) (commit
`2e875b7`) → [Implementation Plan](./periodic-contagem-shared-live-data-decisions-44-56-implementation-plan.md)
(✅ ACCEPTED, commit `9ddd3e9`) → **THIS Implementation Authorization**
→ *(next: implementation, once signed — not this document)*.

**Precedent note:** this document's structure follows the most
directly comparable precedent in this repository,
[`initial-stock-accidental-confirmation-recovery-implementation-authorization.md`](./initial-stock-accidental-confirmation-recovery-implementation-authorization.md)
(signed and Authorized) and
[`stock-count-data-loss-resilience-implementation-authorization.md`](./stock-count-data-loss-resilience-implementation-authorization.md)
(same Contagem domain) — adapted to this scope's actual governing
chain, not copied verbatim.

**Repository state at drafting:** `main = origin/main = 9ddd3e9`,
working tree clean, confirmed immediately before this document was
drafted. **Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `package.json`, `tests/`,
Decisions 44–56, the Rule 8 Reassessment, the Technical Design, the
Finding K Mechanism Analysis, or the Implementation Plan to produce
this document.**

**This document does not:** modify Decisions 44–56, the Rule 8
Reassessment, the Technical Design, the Finding K Mechanism Analysis,
the Implementation Plan, `firestore.rules`, `firestore.indexes.json`,
`package.json`, or any application or test code. It does not silently
decide any question those artifacts left open (see §4). It authorizes
implementation strictly within §2's scope and §3's exclusions once
signed at §10.

**No duplicate:** no existing Implementation Authorization for this
scope (Decisions 44–56, Periodic Contagem shared live data / dual
editor authority / conflict semantics / finalization immutability /
cache isolation) was found in `docs/engineering/` prior to this
document. The two precedent documents cited above cover different,
already-completed scopes (Decision 38's autosave work and the
unrelated Void & Redo capability, respectively).

---

## 1. Governance Completeness — What This Record Confirms

**Product Architect Decisions → Rule 8 → Technical Design → Finding K
Mechanism → Implementation Plan → Authorization (this document) →
Implementation**

| Stage | Document | Status |
|---|---|---|
| Product Architect Decisions | Decisions 44–56 | ✅ All Accepted, SABUSHIMIKE MASCENI |
| Rule 8 | Rule 8 Reassessment | ✅ READY AFTER DECISIONS — zero open Product Architect questions (commit `02cd599`) |
| Technical Design | Technical Design for Decisions 44–55 | ✅ Complete (commit `96a28eb`) |
| Finding K Mechanism | Cache/Session Isolation Mechanism Analysis | ✅ Mechanism finalized (commit `2e875b7`) |
| Implementation Plan | Periodic Contagem Shared Live Data Implementation Plan | ✅ ACCEPTED (commit `9ddd3e9`) |
| **Authorization** | **This document** | ✅ **Signed and Authorized — see §10** |
| Implementation | *(not started)* | ⛔ Not yet begun as of this document |

---

## 2. Authorized Implementation Scope

Implementation is authorized **only** for the requirements and
mechanisms already established by Decisions 44–56, the Rule 8
Reassessment, the Technical Design, the Finding K Mechanism Analysis,
and the accepted Implementation Plan's Areas A–H. Every item below
traces to a specific Plan area (§4 of the Plan) and, through it, to a
specific Decision — see the Plan's own §10 Traceability table for the
full chain. Nothing below is newly introduced by this document.

1. **Shared active Periodic Contagem state** (Decision 44/46/47; Plan
   Area A) — one business-owned active state; genuine per-row live
   adoption; the `rowHasUnsavedLocalEdit` local-protection mechanism.
2. **Owner/Admin + one explicitly delegated Editor** (Decision 46/48;
   Plan Area B) — the new `businesses/{businessId}/contagemAuthority/current`
   document; `isCurrentDelegatedEditor`/`isActiveContagemEditor`
   `firestore.rules` helpers; the Owner/Admin-only assignment UI.
3. **Simultaneous legitimate editing authority** (Decision 46; Plan
   Area A/B) — both roles may write concurrently, per the concurrency
   mechanism in item 7 below.
4. **Authoritative delegation/reassignment, including offline/reconnect
   authority behavior** (Decision 48/49; Plan Area B) — live-read
   authority checks that never cache or restore revoked status; a
   former delegate's reconnecting write is evaluated against current,
   not queued-time, authority.
5. **Viewer authorization and server-enforced Viewer restrictions**
   (Decision 52; Plan Area C) — `stockCountDrafts` read widened from
   `isOwnerOf` to `isMemberOf`; every write rule gated on
   `isActiveContagemEditor`, never UI-only.
6. **Same-row concurrent observation conflict detection and
   preservation; explicit `CONFLICT` semantics and resolution**
   (Decision 47/55; Plan Area D) — the `rev`/`state`/`lastWriterUid`/
   `conflict` schema additions; the `runTransaction`-based
   read-compare-write mechanism; the conflict-transition and
   resolution `firestore.rules` branches; resolution restricted to
   selecting one of the two preserved values.
7. **Exactly-once finalization; Owner/Admin-only finalization;
   stale/pending-write protection** (Decision 50/53/55; Plan Area E) —
   the existing deterministic-id mechanism, reused unmodified; the new
   `openConflictCount == 0` precondition clause on the existing
   non-`initial` `stockCounts` `create` rule.
8. **Finalized Periodic Contagem immutability** (Decision 56; Plan Area
   E/F) — narrowing the existing `stockCounts` non-`initial` **`update`
   half only** of `allow update, delete: if isOwnerOf(businessId) &&
   resource.data.get('type', null) != 'initial'` to `if false`. **The
   `delete` half of this same rule is explicitly excluded from this
   authorization — see §4.**
9. **Separation of working-state clearing from finalized history**
   (Decision 56; Plan Area F) — no change to the existing "Começar de
   novo" draft-discard path; no change to any finalized `stockCounts`
   document's `delete` accessibility.
10. **Shared-device/session/business cache isolation — the Finding K
    fail-closed, authorization-aware listener mechanism** (Decision 51;
    Plan Area G) — gating listener attachment on already-known
    role/business state; treating a freshly-mounted listener's first
    `fromCache: true` emission as provisional and withholding it from
    rendered state until independently confirmed; extending the
    existing owner-vs-staff safe-reset-on-error pattern to every
    listener currently lacking it.
11. **Flush-gated opportunistic logout cleanup, only as specified**
    (Decision 51; Plan Area G item 4.e) — `logout()` attempts the
    existing `switchShop()`-style flush first; only on confirmed
    success does it proceed to `terminate()` →
    `clearIndexedDbPersistence()` → re-`initializeFirestore()`; on
    flush failure (genuinely offline), the clear is skipped and
    `signOut(auth)` proceeds directly. **An unconditional cache clear
    on every logout, regardless of flush outcome, is explicitly NOT
    authorized** — that would violate Decision 44's no-silent-loss
    principle, per the Plan's own Area G reasoning.
12. **Safe `terminate()` → `clearIndexedDbPersistence()` ordering**
    (Plan Area G item 4.e) — `clearIndexedDbPersistence()` may only be
    called after `terminate()` has completed, per the confirmed SDK
    precondition; the reverse order, or calling either without the
    flush-gate in item 11, is not authorized.
13. **Required verification/tests** (Plan §7) — the full Technical
    Design §18 failure-injection suite; the Finding K mechanism
    analysis's own §F verification plan; the `openConflictCount`
    consistency check (Technical Design §19); regression coverage for
    the existing, already-implemented Decision 38 autosave mechanism.
    **Implementation of items 1–12 above is not complete, and Finding
    K is not resolved, until this verification work is also done and
    passes — see §5.**

---

## 3. What This Authorization Does NOT Cover (Explicit Exclusions)

This authorization does **not** authorize:

- Unrelated product redesign, or any change to SABUSH BPT's business
  philosophy.
- Unrelated module work — nothing outside Periodic Contagem's shared
  live data, authority, conflict, finalization, and cache-isolation
  mechanisms as scoped in §2.
- Any change outside the file-by-file scope in Implementation Plan §5
  (`firestore.rules`; `apps/tenant/src/types.ts`;
  `apps/tenant/src/context/AppContext.tsx`;
  `apps/tenant/src/components/PeriodicStockCountView.tsx`; no change to
  `server/index.ts`, `firestore.indexes.json`, or `package.json`).
- Any new Product Architect decision, and any reinterpretation,
  reopening, narrowing, or expansion of Decisions 44–56's own
  already-accepted content.
- Any change to unrelated Contagem behavior not named in §2 — including
  Initial Stock Count, Decision 38's autosave mechanism (beyond the
  additive schema fields §2 item 6 requires on documents that
  mechanism already writes), and every other already-implemented
  Contagem feature.
- **Implementation of any unresolved governance question as if it were
  decided.** In particular: **Decision 56 §7's Clear-All-Data
  `delete`-path reconciliation remains explicitly unresolved** — see
  §4. No implementation may narrow, remove, gate, or otherwise alter
  the existing "Clear All Data" `delete` capability under cover of this
  authorization.
- Any feature, mechanism, or behavior not present in the accepted
  governing artifacts (Decisions 44–56, the Rule 8 Reassessment, the
  Technical Design, the Finding K Mechanism Analysis, and the
  Implementation Plan).
- Treating Finding K as resolved prior to the verification described in
  §5.

---

## 4. Decision 56 §7 — Preserved, Unresolved Boundary

Decision 56 §7 states explicitly that whether the existing "Clear All
Data" wholesale-reset capability's `delete` behavior must itself be
reshaped is **not decided** by Decision 56 — only that *if* an
intentional-removal capability is retained, it must be its own
explicit, separately governed operation.

**This authorization does not resolve that question.** The accepted
Implementation Plan (Area E/F) already identifies the specific portion
of Decision 56 that *is* implementable without resolving §7: narrowing
the `stockCounts` non-`initial` rule's **`update`** half to `if false`
(zero existing call sites depend on `update`, confirmed by the Plan).
**This authorization covers that `update`-narrowing only.** The
`delete` half of the same rule — the mechanism "Clear All Data"
actually depends on — is **excluded from this authorization** and
remains exactly as open as the Technical Design (§14, §22) and the Rule
8 Reassessment left it. No implementer may treat this authorization as
license to modify, narrow, or gate the `delete` rule; doing so would be
deciding a Product Architect question this authorization explicitly
declines to decide.

---

## 5. Finding K Status

**Finding K is CONFIRMED FAIL — HIGH as of this authorization.** It is
**not** described as resolved, and this authorization does not resolve
it.

- The technical mechanism (authorization-aware listener gating,
  binding fail-closed handling of authorization-unknown/stale
  cache-first emissions, flush-gated opportunistic logout clean) is
  **finalized in design** — see the Finding K Mechanism Analysis and
  Technical Design §12.
- **This authorization authorizes implementation of that finalized
  mechanism** — §2 items 10–12 above.
- **Finding K becomes resolved only after implementation and
  successful verification establish the required behavior** — not
  merely upon this authorization being signed, and not merely upon the
  code being written. The Rule 8 Reassessment (`02cd599`) is the
  governing assessment that would need to be updated to reflect
  RESOLVED status, and that update is a separate, future governance
  step this authorization does not perform.
- **Any remaining backend/emulator verification** (both prior Finding K
  verification passes ran against an isolated, out-of-repository
  harness with no reachable Firebase backend — confirmed in both
  verification reports) **must be completed as part of the authorized
  implementation/verification work**, per §2 item 13. Implementation is
  not complete, and Finding K is not resolved, without it.

---

## 6. Acceptance Criteria (Govern Implementation Completion)

Carried forward from the Technical Design §23/§24 and Implementation
Plan §7, unchanged:

- **Data integrity:** no legitimate observation silently lost; no
  blind last-write-wins; conflicts preserved; stale writes cannot
  overwrite newer state.
- **Authority:** Owner/Admin retains inherent authority; exactly one
  delegated Editor; delegation explicit; revocation works via live-read,
  not caching; reconnect cannot restore revoked authority.
- **Viewer:** live read access; no authoritative write access,
  server-enforced.
- **Finalization:** Owner/Admin only; unresolved conflicts block
  finalization; exactly one finalization succeeds; no draft
  resurrection; finalized result immutable to ordinary `update`
  (`delete` unaffected, per §4).
- **Security:** business isolation; user/session isolation; cache
  isolation via the fail-closed mechanism, verified against a real or
  emulated backend, not merely reasoned about; stale context cannot
  become authoritative.
- **Recovery:** durable local observations survive interruptions;
  recovery never bypasses authority or revision checks.
- **Performance:** bounded, O(1) additional checks per Technical Design
  §17; no cross-business or historical-dataset reads introduced.
- **Governance:** Rule 8 remains the governing assessment throughout
  implementation; Finding K's status in Rule 8 is updated only via a
  separate, future governance step, not by this authorization or by
  code being merged.

**Authorization scope is considered fully implemented only when every
criterion above is met and verified** — partial implementation against
this list does not constitute completion of this authorization's
scope.

---

## 7. Risk Acknowledgment (Carried Forward, Not Newly Identified)

- Denormalized `openConflictCount` drift risk (Technical Design §19).
- `runTransaction` retry-under-contention (Technical Design §19).
- The fail-closed gate's dependency on the client's already-known
  role/business state, which can briefly lag a server-side change —
  backstopped by, not replacing, `firestore.rules` (Mechanism Analysis
  §D).
- No real-backend verification has occurred for any server-side
  behavior this scope depends on prior to this authorization (Plan §7,
  §9) — this is a known, acknowledged gap in the evidence base, not a
  reason to withhold authorization for the client-side/design work,
  but a hard prerequisite for declaring Finding K resolved (§5).
- The Decision 56 §7 boundary (§4) — an implementer who is unclear on
  this boundary must stop and seek clarification rather than assume
  either outcome.

---

## 8. Rollback / Reversibility

Every schema addition in §2 is additive and optional (absence defaults
to a safe value, per the existing `removed`/`validated` discipline
already used on the same documents) — a rollback of the client code
alone leaves existing data readable by the pre-authorization code path
unchanged. The new `contagemAuthority/current` document and the
`firestore.rules` branches referencing it can be removed without
affecting any other collection. The `stockCounts` `update: if false`
narrowing (§2 item 8) can be reverted to its prior text without data
loss, since no data is deleted by imposing it. No migration of existing
data is required or proposed anywhere in this scope (Technical Design
§21).

---

## 9. Explicit Gate Statement

**As of §10's signature below, implementation of this feature, strictly
within §2's scope and §3's exclusions, and subject to §4's preserved
Decision 56 §7 boundary, is authorized.** Prior to this signature, no
code, `firestore.rules`, schema, UI, or test file had been created,
modified, or committed to produce this document or its companion
Implementation Plan — that remains true as of the signature itself.
**This signature does not constitute, and must not be read as,
evidence that implementation has occurred or that Finding K is
resolved** — those are separate, future facts this document does not
assert. Implementation is the next, separate execution step this
signature enables, not something this signature itself performs.

---

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 4 September 2026

**Authorization decision (verbatim):**
> "I approve and authorize implementation of the Periodic Contagem
> Shared Live Data capability — covering Decisions 44 through 56 and
> the finalized Finding K cache/session isolation mechanism — exactly
> within the scope, constraints, and acceptance criteria defined in
> this Implementation Authorization."

**Confirmed as part of this signature:**

- [x] This authorization's scope (§2) is approved as stated.
- [x] This authorization's exclusions (§3) are approved as stated.
- [x] Decision 56 §7's Clear-All-Data `delete`-path reconciliation
  (§4) is acknowledged as explicitly unresolved and excluded from this
  authorization.
- [x] Finding K's CONFIRMED FAIL — HIGH status (§5) is acknowledged;
  this signature authorizes implementing the finalized mechanism, and
  does not itself resolve the finding.
- [x] The acceptance criteria (§6) will govern whether this
  authorization's scope is considered complete.
- [x] Rule 8 remains the governing assessment; updating Finding K's
  Rule 8 classification to RESOLVED is a separate, future governance
  step, not performed by this signature.
- [x] No additional scope change is required beyond what §1–§8 of this
  document describe.

---

**This document, as signed, authorizes implementation strictly per
§2's scope, §3's exclusions, and §4's preserved boundary.** No code has
been written and no schema, `firestore.rules`, UI, or test change has
been made as of the filing of this signed authorization —
implementation is the next, separate execution step this signature
enables.

**Lifecycle:** Drafted → Product Architect review → **Authorized**
(this step, signed). Implementation may now begin, strictly within
§2/§3, subject to §4's preserved boundary and §5's Finding K
non-resolution.

**IMPLEMENTATION AUTHORIZED — WITHIN DEFINED SCOPE.**
