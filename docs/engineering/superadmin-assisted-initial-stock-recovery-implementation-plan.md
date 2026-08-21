# Implementation Plan — SuperAdmin-Assisted Initial Stock Recovery

**Status:** DRAFT. This is a plan document only — no code, `firestore.rules`, `firestore.indexes.json`, or test file is written or modified here. **Implementation is NOT authorized by this document.**
**Governing chain:** [`BDR-0016`](../specs/BDR-0016-superadmin-assisted-initial-stock-recovery.md) (✅ Approved) → [`POL-0009`](../specs/POL-0009-superadmin-assisted-initial-stock-recovery-policy.md) (✅ Approved) → [Specification](../specs/superadmin-assisted-initial-stock-recovery-specification.md) (decisions resolved) → [Rule 8 Assessment](./superadmin-assisted-initial-stock-recovery-rule8-assessment.md) (✅ **READY**, Findings A–L). This Plan introduces no new business decision beyond what those four documents already settled — every item below cites the specific Decision/Rule/FR/Finding it implements.
**Method:** Every design choice below either (a) directly implements a named Decision/Rule/FR/Finding, or (b) is an implementation-detail choice within Rule 8's own resolved direction (e.g., exact field names) — never a new business judgment. §23 re-verifies this traceability explicitly.

> **⚠️ Amendment Notice:** §9 and §16, below, describing Owner
> consumption as a client-side `firestore.rules` write, have been
> superseded by the
> [Consumption-Audit Amendment](./superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md) —
> consumption now happens via a small, authenticated, server-mediated
> path (Owner remains the sole actor) so that the consumption event can
> be audited, which a pure client-side write structurally cannot be.
> Every other section of this Plan — the grant route (§9's SuperAdmin
> portion), the data model (§2), scoping (§3), expiry (§4),
> single-active enforcement (§5), legacy/expired-window handling (§6–8),
> immutability (§13), ceiling protection (§14), subscription exemption
> (§15), and everything else — is unaffected and remains exactly as
> originally planned. The original text below is preserved unedited as
> the historical record of the original plan.

---

## 1. Purpose

Converts the Rule 8 Assessment's Findings A–L into a concrete map of exactly which files would change, what each change is, and how each requirement traces back through `POL-0009` to `BDR-0016`. Commits no code.

## 2. Authorization Document / Data Model (item 1)

**Collection:** `businesses/{businessId}/initialStockRecoveryAuthorization/{docId}` — nested under the business, matching where `voidRecords` already lives (tenant-scoped, not a top-level collection), per Rule 8 Finding A.

**Fixed id, per Finding F:** the document id is fixed to a single constant (e.g. `'current'`) — **one document per business, always at the same id, overwritten on each new grant.** This is the same create-if-absent/fixed-slot discipline `voidRecords` and the `'initial'` stock-count slot already use elsewhere in this file, chosen specifically so "at most one active Authorization per business" (Rule T) is a structural property of the collection, not a query-then-check race.

**Proposed fields** (names illustrative, finalized at implementation time, not a business decision):

| Field | Purpose | Governing Rule/FR |
|---|---|---|
| `targetStockCountId` | The exact `stockCounts/{id}` this Authorization names (e.g. `'initial'`) | Rule O, FR-1 |
| `authorizedAt` | Server timestamp, set only by the privileged server via Admin SDK | Rule R, Rule S, FR-5, FR-17 |
| `expiresAt` | `authorizedAt + 48h`, computed server-side at write time (not client-supplied, not re-derived elsewhere) | Rule R, FR-11 |
| `status` | `'unconsumed'` \| `'consumed'` \| `'expired'` — written `'unconsumed'` at grant; transitions are one-way | Rule Q, I-5 |
| `grantedByUid` | The `platform_operators/{uid}` who granted it | Rule N, FR-6, audit parity with `platform_audit_log` |
| `justification` | Required, non-empty free text | Rule V, FR-1, FR-21 |
| `consumedAt` | Server timestamp set only at the moment of consumption (distinct from `authorizedAt`/`confirmedAt`) | Rule S (distinctness), I-3 |

**Explicitly never included:** any field that duplicates or could be confused with `confirmedAt` on the target `StockCount`. No field here is ever copied onto `stockCounts/{targetStockCountId}` (Rule S, FR-17).

## 3. Exact Business / Confirmation Scoping (item 2)

- The Authorization document lives under `businesses/{businessId}/...` — tenant isolation is structural (path-scoped), identical to how `voidRecords` and `stockCounts` already isolate by business, per Rule 8's Finding on tenant isolation and `12-security-architecture.md`.
- `targetStockCountId` names exactly one confirmation (Rule O). The grant endpoint (§8) validates this server-side before writing — never trusting a client-asserted "this is the current confirmation" claim, cross-checked against the live `stockCounts` read at grant time.
- No Authorization document ever references, or can be interpreted against, a different `businessId`'s confirmation — enforced by construction (the document's own path *is* the scope), not by a field-level check that could be spoofed.

## 4. 48-Hour `authorizedAt`/Expiry Enforcement (item 3)

- `authorizedAt` is set exactly once, at grant time, by the privileged server using the Admin SDK's server timestamp — never client-supplied (Finding I, mirroring the existing `confirmedAt == request.time` pattern already proven in the redo-confirmation rule).
- `expiresAt = authorizedAt + 48h` is computed at the same moment and stored, so a Security Rules check at consumption time is a simple `request.time < expiresAt` comparison — no duration arithmetic needed inside `firestore.rules` itself, avoiding the kind of expression-parsing fragility already flagged elsewhere in this file (the `$(...)`-wrapped path-segment comment near the existing redo-confirmation rule).
- This window is completely separate from, and never conflated with, the ordinary 12-hour `confirmedAt`-based window `initialStockConfirmationVoidable` already enforces (Rule R, explicit Product Architect instruction).
- No extension, renewal, or restart mechanism exists anywhere in this design — consistent with "No extension or automatic renewal," verbatim.

## 5. Single-Active-Authorization Enforcement and Concurrency (item 4)

- The fixed-id-per-business document (§2) is what actually enforces this: a grant request is, at the Firestore layer, either a *create* (no document exists yet at `'current'`) or must first verify the existing document's `status` is `'consumed'` or `'expired'` before writing a new one.
- **Concurrency resolution (Finding F/J):** the privileged server performs this check-and-write inside a single Firestore transaction (Admin SDK `runTransaction`), reading the existing `'current'` document and only committing the new grant if it is absent or already consumed/expired — the identical transactional-precondition pattern `server/paymentConfirmation.ts` already uses for its own idempotent confirm/reject flow. Two simultaneous grant requests: only one transaction commits; the other's precondition read is stale and its commit is rejected by Firestore's own optimistic-concurrency control, requiring no additional locking primitive.

## 6. Current-Confirmation-Only Enforcement (item 5)

Per Rule 8 Finding E, enforced at **two** points, per the Finding's own "belt-and-suspenders" reasoning:

1. **At grant time (server-side, privileged server):** before writing the Authorization, the server reads `stockCounts/{targetStockCountId}` and confirms (a) it exists, `type == 'initial'`, and (b) no `voidRecords/{targetStockCountId}` document exists for it (a void-record's existence proves that slot has already been superseded). Fails the request otherwise.
2. **At consumption time (`firestore.rules`, Owner-tier):** a new helper function (parallel to `initialStockConfirmationVoidable`, name illustrative — `initialStockConfirmationAuthorized(businessId, stockCountId)`) re-checks the identical condition — target exists, `type == 'initial'`, no existing `voidRecords/{stockCountId}` — plus the Authorization-specific conditions (§7 below). This is deliberately redundant with the grant-time check: Finding E's own reasoning is that the consumption-time check is what actually protects the immutable data even if a bug ever let the grant-time check pass incorrectly.

## 7. Legacy Confirmation Handling (item 6)

- Per Rule 8 Finding D, a legacy confirmation already lives at the fixed slot id `'initial'` — the identical id a non-legacy original confirmation uses. **No new identifier scheme is introduced.**
- The new `initialStockConfirmationAuthorized(...)` helper's eligibility check for a legacy target does **not** check `confirmedAt` or `chainPosition` at all (unlike `initialStockConfirmationVoidable`, which requires both) — it checks only: target exists, `type == 'initial'`, no `voidRecords/{stockCountId}` yet exists, and a valid, unexpired, unconsumed Authorization names this exact `stockCountId`.
- Per Rule 8 Finding G, the resulting void-record and redo confirmation for a legacy original are written through the **existing, unmodified** `chainPosition == 2` branch (lines 549–559 as they exist today) — `redoesConfirmationId == 'initial'`, proof via `voidRecords/initial`. **No change to the redo-confirmation write path itself is required**, because that branch never inspects the predecessor's own `chainPosition` field — it only requires proof of a legitimate void, which the new authorization-gated `voidRecords` creation branch (§10) now supplies as an alternative to the ordinary window-based proof.
- This directly implements `POL-0009` Rule W (legacy confirmation's first authorized recovery = Confirmation #1, consuming recovery cycle 1) with **zero additional bookkeeping field** — the existing `chainPosition`/slot-id scheme already expresses it correctly once the legacy original successfully receives a void-record.

## 8. Expired-Normal-Window Handling (item 7)

- A non-legacy confirmation whose ordinary 12-hour window has elapsed fails `initialStockConfirmationVoidable`'s own `request.time < confirmedAt + 12h` clause, exactly as today — unchanged.
- The same new `initialStockConfirmationAuthorized(...)` helper (§6) applies identically to this case: it does not re-check the *original* 12-hour window at all (that window's expiry is precisely why this path exists) — it checks only Authorization validity plus current-confirmation-only eligibility.
- Per `POL-0009` Rule X, an expired-window (non-legacy) confirmation's real, pre-existing `chainPosition` is read and preserved exactly as-is — the redo-confirmation write path uses whatever the correct next `chainPosition`/slot id already is for that chain (2, 3, or 4, per the existing branches), never resetting to position 1. No special-casing beyond what the existing chain-position branches already provide.

## 9. SuperAdmin Grant Route and Authentication (item 8)

Per Rule 8 Finding B — **this is the one point where the Rule 8 Assessment corrected an initial framing**, and this Plan follows that corrected direction, not a rules-layer SuperAdmin branch:

- **New route:** `POST /api/superadmin/initial-stock-recovery/:businessId/authorize`, added alongside the existing SuperAdmin routes in `server/index.ts` (matching the naming convention of `/api/superadmin/payments/:businessId/:paymentId/confirm`).
- **Middleware chain:** `requirePlatformOperator` → `requireSuperAdmin` (both already implemented in `server/superadminAuth.ts`, re-verifying `platform_operators/{uid}`'s `platformRole` from Firestore on every request — never a cached or client-supplied claim), identical to every other privileged SuperAdmin write in this codebase.
- **Request body:** `{ targetStockCountId, justification }` — `justification` required and non-empty (Rule V), request rejected otherwise.
- **Write mechanism:** Admin SDK, inside the transaction described in §5 — never a client-side Firestore write, and never gated by a `firestore.rules` SuperAdmin-tier condition, because no such condition needs to exist: `platform_operators/{uid}` already has `allow write: if false` unconditionally for every client (§1, Rule 8 Assessment).

## 10. Owner-Only Consumption (item 9)

- Consumption happens entirely within the existing `voidRecords/{stockCountId}` `allow create` rule (`firestore.rules`, currently gated by `isOwnerOf(businessId) && initialStockConfirmationVoidable(...)`), extended to:

  ```
  allow create: if isOwnerOf(businessId) &&
    request.resource.data.get('voidedConfirmationId', null) == stockCountId &&
    (initialStockConfirmationVoidable(businessId, stockCountId) ||
     initialStockConfirmationAuthorized(businessId, stockCountId));
  ```

  (Illustrative; exact expression finalized in the implementation step, not this Plan.) This is Rule 8 Finding C/K's additive-not-forked direction: **the existing `isOwnerOf(businessId)` requirement is unchanged** — SuperAdmin's grant does not, and cannot, substitute for Owner-tier execution (Rule N, FR-23).
- Consuming an Authorization must atomically mark it `'consumed'` (§2) as part of the same client transaction/batch that creates the void-record, so a second consumption attempt against the same Authorization fails both the Authorization's own `status` precondition and (redundantly) the `voidRecords` create-once guarantee (§11).

## 11. Firestore Rules Enforcement (item 10)

Summarized inventory of the actual rule changes this Plan proposes (not written here — Implementation Authorization gates the actual diff):

1. New helper function `initialStockConfirmationAuthorized(businessId, stockCountId)`, parallel in shape to the existing `initialStockConfirmationVoidable(businessId, stockCountId)` (lines 224–233).
2. `voidRecords/{stockCountId}` `allow create` — add the `|| initialStockConfirmationAuthorized(...)` branch (§10). **The existing `initialStockConfirmationVoidable(...)` branch and its own conditions are byte-for-byte unchanged.**
3. **No change** to the `stockCounts` `allow create` redo-confirmation branches (lines 546–569) — Finding G established these already accommodate a legacy-original-to-Confirmation-#2 transition without modification.
4. **No change** to the `stockCounts` `allow update, delete` line (583) — original immutability (§12, below) is untouched by construction; nothing in this design writes to that path.
5. New collection rule for `businesses/{businessId}/initialStockRecoveryAuthorization/{docId}`: `allow read: if isMemberOf(businessId)` (parity with `voidRecords`' own read tier); `allow write: if false` for every client (Admin-SDK-only, matching `platform_operators`/`platform_audit_log`'s existing pattern — §9).

## 12. Existing VoidRecord Integration (item 11)

Per Finding K: this design introduces **no second void-record concept**. It is a second *eligibility path into* the one `voidRecords` create rule already governs. Once a void-record exists — via either the ordinary window-based path or this new authorization-gated path — every downstream mechanic (redo-confirmation creation, ceiling accounting, permanent original preservation) is the exact, already-implemented, already-tested Void & Redo mechanism, with zero forking.

## 13. Original StockCount Immutability (item 12)

- No line of this design touches `stockCounts` `allow update, delete` (line 583), which unconditionally refuses any write to a `type == 'initial'` document, Owner included. This Plan does not propose any exception to it, does not need one, and Rule 8 raised no finding suggesting one is needed.
- No field this Plan introduces (`authorizedAt`, `expiresAt`, `status`, etc.) is ever written onto a `stockCounts` document — all live exclusively on the new `initialStockRecoveryAuthorization` document (§2).

## 14. Confirmation #4 / No-Confirmation-#5 Protection (item 13)

- The existing `initialStockConfirmationVoidable` function's `chainPosition != 4` clause is unchanged and untouched.
- The new `initialStockConfirmationAuthorized(...)` helper must independently encode the identical ceiling protection: for a *legacy* target (no `chainPosition` field), eligibility is unconditional on this point (a legacy original is, by definition, not yet at position 4 — it has no position at all yet). For an *expired-window, non-legacy* target, the helper must check `chainPosition != 4` exactly as the ordinary path does — an expired-window Confirmation #4 remains absolutely non-voidable, authorized or not, per explicit Product Architect instruction.
- No branch anywhere in this design can produce a `chainPosition == 5` document — the redo-confirmation `allow create` rule's three fixed branches (2, 3, 4) remain the only three redo slots that can ever be written, unchanged.

## 15. Subscription Exemption Scope (item 14)

Per Rule 8 Finding L:

- The `voidRecords` create rule's new `initialStockConfirmationAuthorized(...)` branch is added **inside** the same `allow create` rule that is already, deliberately, not gated by `subscriptionAllowsNewRecords` (Option A) — inheriting the exemption automatically and narrowly, with no separate exemption logic written.
- The redo-confirmation branches this feeds into (§7) are, likewise, already the one place in this file not gated by that function — unchanged.
- The SuperAdmin grant route itself (§9) is a privileged-server, Admin-SDK write, never subject to `subscriptionAllowsNewRecords` in the first place (that function governs tenant client writes, not platform-operator server actions) — no exemption needs to be designed for it because no gate applies to it.
- No other write path in this design touches or references `subscriptionAllowsNewRecords` — the exemption remains scoped exactly as narrow as the existing one, per Rule Y and Option A item 3.

## 16. Audit Logging (item 15)

Per Rule 8 Finding H:

- Every grant, consumption, and unconsumed-expiry event is written to `platform_audit_log/{eventId}` (existing collection, existing schema — `09-superadmin-architecture.md` §9.6), via the Admin SDK, from the privileged server (grant) and from a scheduled/triggered process or read-time check (unconsumed-expiry — implementation detail, not decided here).
- Proposed `actionType` values, following the existing `support_session.issued`-style convention: `initial_stock_recovery.authorized`, `initial_stock_recovery.consumed`, `initial_stock_recovery.expired`.
- `justification` (Rule V) is carried into the audit entry's own `justification` field, matching the existing schema's Support Session precedent exactly.
- `targetBusinessId` is populated from the route path; a `targetStockCountId`-shaped field (new, additive) records which confirmation was named — schema-shape decision, not a business one.

## 17. Owner UI and SuperAdmin UI (item 16)

**Not designed by this Plan** — UI/interaction layout is explicitly reserved for the implementation step itself, per `BDR-0016` §8 and `POL-0009`'s Scope Exclusions. This Plan records only the functional requirements a future UI must satisfy:

- **SuperAdmin UI** must require justification entry before a grant request can be submitted (Rule V), and must surface, before granting, whether an active Authorization already exists for the business (so the operator understands why a second grant would be rejected, rather than discovering it only via an error).
- **Owner UI** must clearly present that an Authorization is available and its remaining validity (Rule K's visibility principle, extended by analogy from `POL-0008`), distinguishing it from the Owner's own ordinary 12-hour window messaging so the two are never confused.

## 18. Draft Reconstruction (item 17)

**No change from the existing Void & Redo mechanism.** Once a void-record exists (by either the ordinary or the authorization-gated path), draft reconstruction is exactly the same "exact pre-confirmation draft state" mechanism `POL-0008` Rule C and the existing implementation already provide — this Plan introduces no new draft-storage or reconstruction logic. For a legacy confirmation specifically, whatever the existing implementation currently does to reconstruct a pre-confirmation draft for an ordinary (non-legacy) Void & Redo applies identically; Rule 8 raised no finding suggesting legacy confirmations lack the data that mechanism already depends on, but this should be explicitly verified against the actual legacy data shape as the first implementation task, before any rule/code change — flagged here as a verification step, not a design gap.

## 19. Tests, Especially Rules Emulator and Concurrency Cases (item 18)

At minimum, extending the existing `tests/initial-stock-void-redo.test.ts` and `tests/initial-stock-confirmation.test.ts` suites (not modified by this Plan — enumerated as required future work):

- **Rules-emulator tests:**
  - SuperAdmin-tier credential cannot create a void-record or redo confirmation directly (Rule N, FR-23) — must fail even with a valid Authorization present.
  - Owner can consume a valid, unexpired Authorization for the exact named legacy confirmation.
  - Owner can consume a valid, unexpired Authorization for the exact named expired-window confirmation.
  - Consumption fails once `expiresAt` has passed (48h boundary, both sides).
  - Consumption fails for a confirmation not named by the Authorization (Rule O).
  - Consumption fails for a confirmation that is not the current one (a superseded confirmation with an existing `voidRecords` entry) (Rule U/Finding E).
  - Consumption fails against `chainPosition == 4` even with a valid Authorization (item 13/Finding E).
  - A second consumption attempt against an already-consumed Authorization fails (Rule Q, I-5).
- **Concurrency tests:**
  - Two simultaneous grant requests for the same business: exactly one succeeds (§5, Finding F).
  - Two simultaneous consumption attempts against the same Authorization: exactly one succeeds (Finding J, same `voidRecords` create-once guarantee).
  - A grant racing an independent, ordinary Owner-triggered Void & Redo on the same confirmation: the ceiling is never exceeded (Finding J).
- **Subscription-exemption scope test:** a business in a blocked-subscription state can still complete an authorized recovery, but cannot create an unrelated record of any other type while blocked (mirroring the existing Void & Redo subscription-exemption scope test).
- **Backward-compatibility test:** a legacy `initial` confirmation with no `chainPosition` field at all successfully receives a void-record and produces `chainPosition == 2` via this path.
- **Audit test:** grant/consume/expire each produce exactly one `platform_audit_log` entry with the required fields.
- **Full regression** of `initial-stock-void-redo.test.ts`, `initial-stock-confirmation.test.ts`, and `initial-stock-dual-valuation-basis*.test.ts`, proving zero behavior change to any existing, non-authorized path.

## 20. Failure / Rollback Behavior (item 19)

- **Grant fails partway** (e.g., transaction aborts after validating eligibility but before commit): no partial state — Firestore transactions are atomic; either the Authorization document is fully written or nothing is.
- **Consumption fails partway** (void-record write succeeds, redo-confirmation write does not yet exist): this is the **existing, already-solved** interrupted-recovery case the Void & Redo mechanism already resolves via its own "zero-active-confirmation fallback" (referenced in the existing Implementation Authorization's test requirements) — unchanged, no new rollback logic needed, because this path produces an identical intermediate state to the ordinary path.
- **Authorization expires mid-consumption** (Owner begins just before `expiresAt`): per FR (Specification §15/Edge Cases), the eligibility check and the first Void-&-Redo write must be evaluated against the same "still valid" condition at write time (Firestore's own `request.time` evaluation at the moment of the actual write) — no separate pre-check-then-write gap exists in a single `allow create` rule evaluation, so this is structurally safe by the nature of Security Rules evaluation, not by added application logic.

## 21. Tenant Isolation and Security (item 20)

- Every new document (Authorization) and every extended rule (`voidRecords`) remains scoped under `businesses/{businessId}/...`, with `businessId` bound from the URL path — never from request body/data — identical to every existing tenant-scoped collection in this file (§1, Rule 8 Assessment's own tenant-isolation note on `voidRecords`).
- The grant route additionally requires `requirePlatformOperator` + `requireSuperAdmin`, re-verified per request, never cached (§9) — a compromised or stale client session cannot forge SuperAdmin authority.
- No cross-tenant read/write path is introduced: an Authorization for business A can never be consumed against business B's confirmation, by construction (the document's own path scoping), not by a field comparison that could be manipulated.

## 22. Migration / Backfill Prohibition (item 21)

**Explicitly out of scope, and explicitly not needed.** No migration or backfill of existing legacy confirmations is required by this design — a legacy confirmation is handled entirely at read/eligibility-check time (§7), exactly as it exists today, with no field ever added, defaulted, or backfilled onto it. This directly implements `BDR-0016`/`POL-0009`'s "never fabricate or backfill `confirmedAt`" instruction: the legacy confirmation's absence of `confirmedAt` remains permanently and accurately represented, with this capability never touching that document at all.

## 23. Performance and Operational Considerations (item 22)

- The new `initialStockConfirmationAuthorized(...)` Security Rules helper adds at most two additional document reads (`initialStockRecoveryAuthorization/current`, and the existing `stockCounts`/`voidRecords` reads the ordinary path already performs) per void-record-create evaluation — negligible relative to the existing rule's own read cost.
- The single-fixed-id-per-business Authorization document means no unbounded collection growth per business — at most one live document, with history living in `platform_audit_log` (already an append-only, indexed-for-this-purpose collection, per its own existing design).
- No new Firestore composite index is anticipated (single-document reads by fixed id/path, no new query pattern introduced) — to be confirmed against `firestore.indexes.json` at actual implementation time, not asserted here as certain.
- No new background job/scheduled function is strictly required for "unconsumed expiry" — expiry is enforced at read/consumption time via the `expiresAt` comparison (§4); an optional operational report (SuperAdmin UI surfacing "this business's Authorization expired unused") could read the same field without any new write path, deferred as a nice-to-have, not a requirement.

## 24. Traceability Re-Verification

Every item above traces to a named Decision/Rule/FR/Finding, re-checked here explicitly per this session's instruction:

| Plan item | BDR-0016 | POL-0009 | Specification | Rule 8 |
|---|---|---|---|---|
| 1. Data model | §2 | Terminology, Scope Exclusions | §4, FR-1 | Finding A |
| 2. Scoping | §2 | Rule P | FR-1 | §1 tenant note |
| 3. 48h expiry | §9 Decision 1 | Rule R | FR-11, FR-12 | Finding I |
| 4. Single-active | §9 Decision 2 | Rule T | FR-3, I-4 | Finding F |
| 5. Current-only | §9 Decision 3 | Rule U | FR-2 | Finding E |
| 6. Legacy handling | §1, §2 | Rule W | FR-14 | Findings D, G |
| 7. Expired-window handling | §1, §2 | Rule X | FR-15 | §8 |
| 8. Grant route/auth | §2 | Rule N | FR-23 | Finding B |
| 9. Owner-only consumption | §2 | Rule Q, E | FR-7, FR-9 | Finding C |
| 10. Rules enforcement | §3 | Rules M, N | FR-6, FR-23 | Findings B, C |
| 11. VoidRecord integration | §2 | Rule M | §12 | Finding K |
| 12. Immutability | (unchanged) | (unchanged) | (unchanged) | §1 |
| 13. Ceiling protection | §2 | Rule W, X | FR-14–16 | §1, Finding G |
| 14. Subscription exemption | §6 | Rule Y | FR-26, FR-27 | Finding L |
| 15. Audit logging | §5 (Rule V precedent) | Rule V | FR-20–22 | Finding H |
| 16. UI | §5 | Scope Exclusions | §17 | (not decided) |
| 17. Draft reconstruction | (unchanged) | (unchanged) | §18 | (unchanged) |
| 18. Tests | — | Business Acceptance Criteria | §19 Acceptance Criteria | §5 exclusion |
| 19. Failure/rollback | — | Rule Z | §15 Edge Cases | Finding J |
| 20. Tenant isolation | §5 | Rule P | — | §1 |
| 21. Migration prohibition | §2 | Rule S | FR-18, FR-19 | — |
| 22. Performance | — | — | — | (new, implementation-level only) |

**No item in this Plan required a new Product Architect business decision.** Every design choice either directly implements an already-approved Decision/Rule, or is an implementation-detail choice (exact field names, route path, transaction shape) explicitly reserved for this stage by `BDR-0016` §8/`POL-0009`'s Scope Exclusions.

## 25. Governance Notes

- This is an Implementation Plan only. No `apps/`, `server/`, `firestore.rules`, `tests/`, or `firestore.indexes.json` file is touched by this document.
- This Plan does not modify `BDR-0016`, `POL-0009`, the Specification, or the Rule 8 Assessment.
- No Implementation Authorization is signed by this document.

## 26. Next Governance Step

The next step — **not performed here** — is a signed Implementation Authorization, per `19-governance-bdr-policy-framework.md` §3. No push or merge of this document is performed unless explicitly instructed.

**Lifecycle:** Drafted → **Implementation Plan (this step)**. Not yet an Implementation Authorization. Not Implemented.
