# Implementation Authorization — SuperAdmin-Assisted Initial Stock Recovery

**Status:** ✅ **Signed and Authorized.** See §10 for the recorded Product Architect signature. Implementation of this feature — strictly within §2's scope and §3's exclusions — is authorized as of this signature. **No code, `firestore.rules`, `firestore.indexes.json`, or test file has yet been created, modified, or committed** — signature is the governance gate that permits that next, separate execution step; it does not itself perform it.
**Governing chain:** [`BDR-0016`](../specs/BDR-0016-superadmin-assisted-initial-stock-recovery.md) (✅ Approved) → [`POL-0009`](../specs/POL-0009-superadmin-assisted-initial-stock-recovery-policy.md) (✅ Approved) → [Specification](../specs/superadmin-assisted-initial-stock-recovery-specification.md) (decisions resolved) → [Rule 8 Assessment](./superadmin-assisted-initial-stock-recovery-rule8-assessment.md) (✅ READY, Findings A–L) → [Implementation Plan](./superadmin-assisted-initial-stock-recovery-implementation-plan.md) (drafted, traceability re-verified) → **this Authorization (✅ Signed, §10)**.

---

## 1. Mandatory Implementation Preflight — Legacy Data Reconstruction

Performed by direct inspection of the actual, currently-committed codebase before this Authorization was drafted, per this session's explicit instruction. No legacy data was altered. No code, `firestore.rules`, or test file was modified to perform this inspection.

**1.1 — What `voidInitialStockConfirmation()` actually requires (`apps/tenant/src/context/AppContext.tsx`, lines 3043–3089).**

Direct inspection shows the existing, already-implemented Void & Redo draft-reconstruction function reads exactly:

- `initialStockCount.items[].productName`, `.quantity`, `.unit` (optional), `.costPrice`, `.sellingPrice` (optional) — mapped into `InitialStockDraftItem` shape, with a fresh client-generated `id` (a UI list-key, never business data).
- `initialStockCount.date`.
- `initialStockCount.initialCapitalBasis` (optional, spread conditionally only if present).

**It reads neither `confirmedAt` nor `chainPosition` at any point.** Those two fields are consumed exclusively by `firestore.rules`' `initialStockConfirmationVoidable(...)` eligibility gate (lines 224–233) — a separate concern from reconstruction itself, exactly as Rule 8 Finding D/G already established.

**1.2 — Whether a legacy `stockCounts/initial` document supplies every field reconstruction needs (`apps/tenant/src/types.ts`, lines 517–616).**

The base `StockCount`/`StockCountItem` interface fields reconstruction depends on — `items` (with `productName`, `quantity`, `unit`, `costPrice`), `date` — are required, non-optional fields on every `StockCount` document that has ever existed in this schema, legacy or not; they predate every Void & Redo-era addition. `sellingPrice` and `initialCapitalBasis` are optional fields the reconstruction function already handles via conditional spreads (`...(typeof item.sellingPrice === 'number' ? {...} : {})`), exactly the graceful-absence handling a legacy record (predating the Dual-Valuation-Basis feature) needs — **no invented default, no fabricated value, silently omitted if genuinely absent.**

**1.3 — Explicit confirmation, per the four prohibitions this preflight was required to check:**

- **Does not require inventing `confirmedAt`.** Reconstruction never reads this field (§1.1).
- **Does not require inventing `chainPosition`.** Reconstruction never reads this field (§1.1); the redo-confirmation write path this capability feeds into (Rule 8 Finding G, Implementation Plan §7) already writes the *new* redo document's `chainPosition` itself — it does not need to read one from the legacy original.
- **Does not require modifying the original document.** Reconstruction reads `initialStockCount` (client-side state) without writing to it; the actual void step writes only a new `voidRecords/{targetId}` document (line 3063) — the original `stockCounts` document is never touched by this function, consistent with the unconditional `firestore.rules` immutability line (583) this capability does not alter.
- **Does not require a migration or backfill.** Every field reconstruction needs is already present on a legacy document by virtue of being part of the base `StockCount` schema since before any Void & Redo-era field existed.

**1.4 — Additional grounding: the existing "current confirmation" resolution already matches Rule 8 Finding E's proposed check.** `AppContext.tsx` line 846–847 already computes the client's own `initialStockCount` as `stockCounts.find(s => s.type === 'initial' && !voidedConfirmationIds.has(s.id))` — i.e., "the `initial`-type document with no existing void-record for its id" — the exact condition Rule 8 Finding E and Implementation Plan §6 propose for the new `initialStockConfirmationAuthorized(...)` current-confirmation-only check. This is not a new pattern invented for this capability; it is the same pattern the existing, shipped application already relies on.

**Preflight verdict: ✅ PROVEN, by direct repository inspection — not a runtime/production-data assumption.** Every field the draft-reconstruction path needs is demonstrably present on any legacy `stockCounts/initial` document by virtue of the base schema, independent of whether that document has ever been touched by Void & Redo-era code. No part of this conclusion rests on an assumption about what production data currently contains; it rests on what the schema and the reconstruction function's own code require, both directly inspected. **No further production-data verification is flagged as a precondition to implementation** — though, as the Implementation Plan §18 already noted, actually exercising this path against a handful of real legacy businesses' data in a staging/emulator environment remains good practice before shipping, as ordinary engineering diligence, not as an unresolved governance gap.

## 2. What This Authorization Would Cover (Once Signed)

Exactly, and only, the scope `BDR-0016` → `POL-0009` → Specification → Rule 8 → Implementation Plan already define:

1. A new `businesses/{businessId}/initialStockRecoveryAuthorization/{docId}` collection (fixed id per business), Admin-SDK-write-only.
2. A new privileged-server route, `POST /api/superadmin/initial-stock-recovery/:businessId/authorize`, gated by the existing `requirePlatformOperator` + `requireSuperAdmin` middleware chain, unchanged.
3. A new `firestore.rules` helper function, `initialStockConfirmationAuthorized(businessId, stockCountId)`, parallel in shape to the existing `initialStockConfirmationVoidable(...)`.
4. One additive `||` branch on the existing `voidRecords/{stockCountId}` `allow create` rule — the existing `initialStockConfirmationVoidable(...)` branch and every other condition on that rule remain byte-for-byte unchanged.
5. New `platform_audit_log` entries for grant/consume/expire events, using the existing schema.
6. New tests per Implementation Plan §19, extending the existing Void & Redo test suites.
7. **No change whatsoever** to the `stockCounts` `allow create` redo-confirmation branches, the `stockCounts` `allow update, delete` immutability line, or any other existing Void & Redo mechanic (Rule 8 Finding G, K).

## 3. What This Authorization Would Not Cover

- Any change to `BDR-0015`, `POL-0008`, the existing Void & Redo Specification, its Rule 8 Assessment, or its signed Implementation Authorization.
- Any change to `BDR-0014` or the dual-valuation-basis mechanism.
- Any broadening of SuperAdmin's authority beyond issuing/expiring this one Authorization type — no `BDR-0011` subscription/platform-access capability, no general database-editing capability.
- Any general `subscriptionAllowsNewRecords` bypass beyond the two write paths (`voidRecords` create, the redo-confirmation branches they feed into) already exempt today.
- Any UI design decision beyond the functional requirements Implementation Plan §17 states.
- Any migration or backfill of legacy data (§1, above — none is needed, and none is authorized).

## 4. Rule 8 → Implementation Plan Traceability (Re-Verified)

Every implementation item this Authorization would cover traces to a specific Rule 8 Finding and Implementation Plan section, per the Plan's own §24 table — re-confirmed here rather than re-derived:

- Findings A–L (Rule 8) each map to one or more Implementation Plan sections (§2–§23), each of which maps to a specific `BDR-0016`/`POL-0009`/Specification Decision, Rule, or FR.
- No Implementation Plan item lacked a governing citation.
- No new business decision was required to produce the Implementation Plan, and none is required to produce this Authorization — including after the mandatory preflight (§1), which resolved by direct code inspection rather than surfacing anything requiring Product Architect judgment.

## 5. Risk Acknowledgment

- **The subscription-gating exemption remains the one net-new rules-layer condition without a direct one-to-one precedent** (it extends, rather than duplicates, the existing Option A exemption) — flagged for the same dedicated scope-test requirement (Implementation Plan §19) the original Void & Redo Implementation Authorization already required of its own exemption.
- **Current-confirmation-only enforcement (Rule 8 Finding E) is new logic with no prior instance in this codebase to copy verbatim** — mitigated by the double-enforcement design (grant-time + consumption-time, Implementation Plan §6) and by the fact that its consumption-time form reuses the exact condition (§1.4) the existing client application already computes for an unrelated purpose.
- **Single-active-Authorization concurrency relies on a Firestore transaction pattern already proven correct elsewhere** (`server/paymentConfirmation.ts`) but applied to a new collection for the first time — the required concurrency tests (Implementation Plan §19) are the acceptance gate for this risk, not an assumption that the pattern transfers automatically.

## 6. Testing Boundary (Carried Into Implementation)

At minimum, per Implementation Plan §19: Rules-emulator tests for every enforcement point (SuperAdmin cannot write confirmation-affecting data; Owner-only consumption; 48-hour boundary both sides; current-confirmation-only; ceiling/Confirmation #4 refusal; one-time consumption); concurrency tests (simultaneous grants, simultaneous consumptions, grant racing an independent ordinary recovery); subscription-exemption scope test; legacy backward-compatibility test; audit-log test; full regression of the existing Void & Redo, Initial Stock confirmation, and dual-valuation-basis suites. None of these tests exist yet — none is written by this document.

## 7. Rollback / Reversibility

Per Implementation Plan §20: no partial-state risk at the Authorization-document level (Firestore transactions are atomic); an interrupted consumption resolves through the Void & Redo mechanism's own existing, already-tested interrupted-recovery fallback, unchanged; an Authorization expiring mid-consumption is structurally safe by Security Rules' own per-write evaluation semantics, requiring no new application-level rollback logic.

## 8. Acceptance Criteria (Would Govern Implementation Completion)

1. **SuperAdmin-only grant.** Only a caller passing `requirePlatformOperator` + `requireSuperAdmin` (re-verified from `platform_operators/{uid}` on every request) may create an Authorization; no client-side Firestore write path can create one (`allow write: if false` on the new collection).
2. **Owner-only execution.** Only `isOwnerOf(businessId)` may consume an Authorization to create a void-record; SuperAdmin's credential cannot perform this write under any condition, including with a valid Authorization present.
3. **Exact business scoping.** An Authorization lives at, and is only ever evaluated against, `businesses/{businessId}/...` — structurally scoped by path, not by a spoofable field.
4. **Exact current-confirmation scoping.** An Authorization may name, and be consumed against, only the confirmation that is the business's current one at the moment of both grant and consumption (no `voidRecords` entry exists for it) — enforced at both points (Implementation Plan §6), not merely described as a UI convention.
5. **One active Authorization per business.** At most one unconsumed, unexpired Authorization may exist per business at any instant, enforced via a fixed-id-per-business document plus a transactional grant precondition.
6. **48-hour expiry.** An unconsumed Authorization becomes permanently unusable exactly 48 hours after its own `authorizedAt`, with no extension or renewal under any condition.
7. **Server-set `authorizedAt`.** `authorizedAt` is written only by the privileged server via the Admin SDK's server timestamp — never client-supplied, never backdated.
8. **No fabricated `confirmedAt`.** No code path introduced by this capability writes, derives, infers, or backfills a `confirmedAt` value onto any `StockCount` document, for legacy confirmations or any other.
9. **No legacy-data backfill.** No migration, backfill script, or write of any kind touches a pre-existing legacy `stockCounts` document as part of this capability (§1, above).
10. **Original StockCount immutability.** The existing, unconditional `stockCounts` `allow update, delete` refusal for `type == 'initial'` documents (line 583) remains byte-for-byte unmodified; no field this capability introduces is ever written to a `stockCounts` document.
11. **Existing VoidRecord one-time consumption.** The `voidRecords/{stockCountId}` create-once guarantee (fixed id equal to the voided confirmation's own id) governs an authorization-gated void exactly as it already governs an ordinary one — no second void-record mechanism is introduced.
12. **Confirmation #4 remains absolutely non-voidable.** The new `initialStockConfirmationAuthorized(...)` helper independently enforces `chainPosition != 4` for any non-legacy target, with no authorized path able to bypass this.
13. **No Confirmation #5.** No branch of the redo-confirmation `allow create` rule beyond the existing three fixed slots (`chainPosition` 2, 3, 4) is created or altered by this capability.
14. **Existing 3-cycle/4-confirmation ceiling preserved.** A legacy confirmation's first authorized recovery is treated as Confirmation #1, consuming recovery cycle 1 of the unmodified existing ceiling; an expired-window confirmation's real chain-position history is read and preserved, never reset.
15. **Narrow Void & Redo subscription exemption only.** The Authorization-gated `voidRecords`/redo-confirmation write path inherits exactly the existing, narrowly-scoped Option A exemption — expressed via this-path-specific conditions, never a shared "skip subscription check" mechanism.
16. **No general subscription override authority from this Authorization.** The SuperAdmin grant action itself is not, and does not need to be, exempted from any subscription gate (it is a privileged-server action, not a tenant record write); no other write path anywhere in this capability references `subscriptionAllowsNewRecords`.
17. **Full audit logging.** Every grant, consumption, and unconsumed-expiry event is written to `platform_audit_log` with `actorUid`, `actorRole`, `actionType`, `targetBusinessId`, a target-confirmation reference, `justification`, and a server timestamp — no event of any kind occurs silently.
18. **Tenant isolation.** No Authorization, once granted, can be read, consumed, or validated against any business other than the one it was granted for; this is structural (path-scoped), not merely checked.
19. **Rules-layer enforcement.** Every eligibility, ownership, and ceiling condition is enforced at the Security Rules layer (or, for the grant itself, the privileged-server middleware layer) — never by UI omission alone.
20. **Concurrent/race safety.** Two simultaneous grant requests, two simultaneous consumption attempts, and a grant racing an independent ordinary recovery each resolve so that exactly one operation succeeds and no invariant (ceiling, single-active-Authorization, one-time consumption) is ever violated.
21. **Legacy draft reconstruction.** The existing, unmodified `voidInitialStockConfirmation()` draft-reconstruction function correctly reconstructs a legacy confirmation's pre-confirmation-equivalent draft state from fields already proven present on any legacy document (§1).
22. **Owner valuation-basis selection remains independent.** The redo confirmation produced via an authorized recovery undergoes the identical, unmodified `BDR-0014`/`POL-0008` Rule H dual-valuation-basis mechanism — its own fresh, independently-chosen basis, with no inheritance from the voided original and no involvement from SuperAdmin.
23. **No second recovery mechanism.** Every step after a successful void-record creation (draft restoration, Owner edits, basis selection, reconfirmation) is the exact, already-implemented, already-tested Void & Redo flow — this capability adds only an eligibility gate in front of it, never a parallel or alternate flow.

## 9. Explicit Gate Statement

**As of §10's signature below, implementation of this feature, strictly within §2's scope and §3's exclusions, is authorized.** Prior to this signature, no code, `firestore.rules`, `firestore.indexes.json`, or test file had been created, modified, or committed to produce this document or its companion Implementation Plan — that remains true as of the signature itself; implementation is the next, separate execution step this signature enables, not something this signature itself performs, and not something performed in this same governance step.

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** August 21, 2026

**Authorization decision (verbatim):**
> "I accept and authorize the Implementation Authorization for SuperAdmin-Assisted Initial Stock Recovery."

**Confirmed as part of this signature:**

- [x] This authorization's scope (§2) is approved as stated.
- [x] This authorization's exclusions (§3) are approved as stated.
- [x] The legacy-data preflight (§1) is reviewed and its verdict accepted.
- [x] The subscription-gating exemption (§2 item 7 equivalent; §5) is acknowledged as narrowly scoped to this one write path only.
- [x] The current-confirmation-only and single-active-Authorization risk items (§5) are explicitly acknowledged.
- [x] No additional scope change is required beyond what §1–§8 of this document describe.

---

**This document, as signed, authorizes implementation strictly per §2's scope and §3's exclusions.** No code has been written and no schema or `firestore.rules` change has been made as of the filing of this signed authorization — implementation is the next, separate execution step this signature enables, not performed in this same governance step.
