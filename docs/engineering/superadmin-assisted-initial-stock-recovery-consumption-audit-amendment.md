# Implementation Plan Amendment — SuperAdmin-Assisted Initial Stock Recovery: Server-Mediated Owner Consumption

**Status:** DRAFT. Companion amendment to [`superadmin-assisted-initial-stock-recovery-implementation-plan.md`](./superadmin-assisted-initial-stock-recovery-implementation-plan.md) — does **not** rewrite that document; it amends §9 (Owner-Only Consumption) and §16 (Audit Logging) specifically, per the amendment notice now at that document's own top. Every other section of the original Plan is unaffected and incorporated by reference, not restated here. **This amendment does not authorize implementation.**
**Governing chain:** `BDR-0016` (Approved) → `POL-0009` (Approved) → Specification (FR-20 already required consumption to be audited — no Specification change) → [Rule 8 Assessment](./superadmin-assisted-initial-stock-recovery-rule8-assessment.md) (READY) → [Consumption-Audit Rule 8 Re-Assessment](./superadmin-assisted-initial-stock-recovery-consumption-audit-rule8-reassessment.md) (READY, this amendment's direct basis) → **this Amendment** → *(next: a supplementary, freshly-signed Implementation Authorization — not this document)*.
**Product Architect direction incorporated (recorded verbatim, per this repository's established practice):**
> "The consumption audit entry should use the Authorization's existing `justification` as the recovery reason/context. Do NOT introduce a new Owner-entered reason field. Do NOT add a new audit schema field [beyond what is minimally needed to identify the authorization and confirmation]. [...] The consumption event must not be interpreted as a second authorization decision. It records the Owner executing the recovery that the SuperAdmin already authorized."

---

## 1. What Changes From the Original Plan

The original Plan's §9/§10 described consumption as a purely client-side `firestore.rules` write (Owner-tier, batched with the void-record creation). That remains **structurally correct as far as it goes** — the Owner is still the sole actor, `isOwnerOf(businessId)` is still the governing check — but it cannot produce an audit entry, because `platform_audit_log` is Admin-SDK-only by design (§1 of the original Rule 8 Assessment; re-confirmed in the Consumption-Audit Re-Assessment). This amendment replaces the *mechanism* only: consumption now runs through a small, authenticated, server-mediated path. **The Owner is still the actor who decides and triggers consumption; the server is an authenticated proxy, not a second decision-maker** — identical in spirit to how the grant route is SuperAdmin's authenticated proxy for the grant decision.

## 2. New Route

**`POST /api/initial-stock-recovery/consume`** — a **tenant-facing** route (not under `/api/superadmin/...` — this is the Owner's own action), gated by `requireAuth` (real Firebase ID token verification) plus a server-side ownership check mirroring the existing `/api/staff/delete`/`verifyStaffManagementAction` pattern: the caller's `users/{uid}` profile must resolve to the Owner of the target `businessId` — never merely a member, never a platform operator.

**Request body:** `{ businessId, targetStockCountId }`. No justification/reason field is accepted from the Owner — per the Product Architect's explicit instruction, the audit context comes exclusively from the Authorization's own existing `justification` (SuperAdmin's grant-time reason), never a new Owner-entered value.

## 3. Transaction Behavior — Precisely, in Validation Order

All of the following happen inside **one Firestore Admin SDK transaction** (this module never calls a second, nested transaction — consistent with §4, below):

1. **Validate authenticated Owner.** `req.callerUid` must resolve, via `users/{uid}`, to a profile whose role is `owner` and whose `businessId` (or `businessIds`, for multi-shop owners) includes the target `businessId`. Fails closed (403) before any read of recovery-specific data.
2. **Validate business ownership** (folded into step 1 — restated separately here only because the Product Architect's own checklist names it distinctly): the resolved Owner must own *this exact* `businessId`, not merely *a* business.
3. **Validate current confirmation.** Read `stockCounts/{targetStockCountId}`: must exist, `type == 'initial'`. Read `voidRecords/{targetStockCountId}`: must **not** exist (a void-record already existing means this slot is already superseded — not current).
4. **Validate Authorization.** Read `initialStockRecoveryAuthorization/current`: must exist, `status == 'unconsumed'`, `targetStockCountId` field must equal the requested `targetStockCountId` (POL-0009 Rule O/U — one exact confirmation, current-confirmation-only, re-verified here exactly as the grant route re-verifies it, not merely trusted from an earlier check).
5. **Validate 48-hour expiry.** `now < authorization.expiresAt` (server clock, never client-supplied) — POL-0009 Rule R, unchanged figure.
6. **Validate one-time consumption.** Implied by step 4's `status == 'unconsumed'` precondition — a second consumption attempt against an already-`'consumed'` Authorization fails this check and is handled per §5 (idempotency), not as a fresh error.
7. **Validate Confirmation #4 exclusion.** Read the target's `chainPosition` field (default `1` if absent — legacy target, never excluded); reject if `=== 4`. Identical logic to `initialStockRecoveryAuthorizationActive()`'s own rules-layer check (§6 below names the resulting duplication explicitly).
8. **Create the VoidRecord and mark the Authorization consumed — together, atomically, in this same transaction:**
   - `voidRecords/{targetStockCountId}`: `{ id: targetStockCountId, voidedConfirmationId: targetStockCountId, voidedAt: <server timestamp> }` — byte-identical in shape to what the client's own `voidInitialStockConfirmation()` already writes for the ordinary path; only *which process* performs this specific write changes for the authorized case.
   - `initialStockRecoveryAuthorization/current`: partial update, `{ status: 'consumed', consumedAt: <server timestamp> }` — every other field (`targetStockCountId`, `authorizedAt`, `expiresAt`, `grantedByUid`, `justification`) is left untouched, identical in spirit to the field-locked `firestore.rules` update this supersedes.
   - **Never writes to `stockCounts/{targetStockCountId}` itself** — original immutability (§13 of the original Plan) is unaffected; this transaction's write surface is exactly `voidRecords` + the Authorization document, nothing else.

If any of steps 1–7 fails, the transaction is never entered/never commits — no partial state, exactly as Firestore transactions already guarantee.

## 4. Audit Write — Explicitly NOT Part of the Transaction

**Stated plainly, per explicit instruction not to claim atomicity that doesn't exist:** the `platform_audit_log` write happens **after** the transaction in step 8 above commits, as a separate step — **not** inside the same transaction, and not claimed to be. This repository's own `server/platformAuditLog.ts` already documents why: the Admin SDK does not support nested transactions, and an audit entry's actor information is unrelated to, and does not need to be read inside, the primary state-change transaction. This is the same two-step pattern already used for `payment.confirmed`, `business.suspended`, `business.reactivated`, and this capability's own `initial_stock_recovery.authorized` grant entry.

## 5. Failure / Retry Behavior — Audit Write Must Be Idempotent, Never Silently Skipped

- **If the transaction (step 8) fails:** nothing changed — no void-record, no consumed Authorization, no audit entry. The Owner sees a clean error and may retry the whole request safely (step 4's `status == 'unconsumed'` precondition makes a retry after a genuine failure indistinguishable from a first attempt).
- **If the transaction succeeds but the audit write fails** (network blip, transient error): the response reports `{ outcome: 'consumed', ..., auditLogged: false }` — identical shape to every other partial-failure response already in this codebase (`suspendBusiness`, `reactivateBusiness`, the grant route) — and the server logs the failure (`console.error`) for operational follow-up. **The recovery itself is never rolled back or treated as failed** just because the audit write didn't land — the void-record/Authorization-consumed state is the real, durable outcome; the audit entry is retried by re-invoking the route (safe — see next point), not by undoing a legitimate recovery.
- **Retry safety:** if the Owner (or a retry mechanism) calls the route again after a partial failure, step 4's precondition now reads `status == 'consumed'` (already written) — the route returns the **already-successful outcome** (not a fresh consumption, not a duplicate void-record — Firestore's own create-if-absent semantics on `voidRecords/{targetStockCountId}` refuse a second create regardless) and **attempts the audit write again**. A successful recovery can therefore be retried purely to close an audit gap, without any risk of a second void-record, a second consumption, or any double-effect — this is exactly what "cannot silently become permanently unaudited" requires: the gap is visible (`auditLogged: false`), narrow (network-failure-only), and closeable by a safe retry, never structurally permanent.

## 6. Audit Event Shapes — Exactly as Directed, No New Reason Field

**`initial_stock_recovery.authorized`** (grant — unchanged from the original Plan/already-implemented route):
- `actorUid` = the granting SuperAdmin's uid
- `actorRole` = `'superadmin'`
- `targetBusinessId`
- `targetStockCountId` (already-implemented additive field)
- `justification` = the SuperAdmin's own grant-time justification
- `timestamp` = server-set

**`initial_stock_recovery.consumed`** (new, this amendment):
- `actorUid` = the authenticated Owner's uid (**not** the granting SuperAdmin's — this is the load-bearing distinction making clear this is execution, not a second authorization decision)
- `actorRole` = `'owner'` — **a new value in this position.** `PlatformAuditLogEntry.actorRole` is currently typed `PlatformRole` (`'support' | 'developer' | 'superadmin'`, platform-operator roles only), because every existing audited action is a platform-operator action. This is the one place this amendment's schema shape must extend, minimally: `actorRole` needs to accept an Owner-tier value for this one action type. Proposed, additive-only resolution: widen the field's type to accept `PlatformRole | 'owner'` (or a small `AuditActorRole` union superset), rather than inventing a parallel schema — this is a type-level widening, not a new field, and does not change any existing entry's shape or any existing reader's behavior.
- `targetBusinessId`
- `targetStockCountId` = the confirmation being voided (already-implemented additive field, reused — this is what the Product Architect's checklist calls `confirmationId`)
- `authorizationId` = the consumed Authorization's own `authorizedAt` timestamp (ISO string). **New, additive field, minimally justified:** the Authorization document itself lives at a fixed id (`'current'`) that is reused/overwritten across grants, so the document id alone cannot identify *which specific grant* was consumed once a later grant overwrites it — `authorizedAt` is already a unique-per-grant value this capability already produces, reused here rather than inventing a new identifier scheme. This is a schema-shape decision within Rule 8/Plan authority (identical in kind to `targetStockCountId`'s own original addition), not a new business decision — flagged here explicitly rather than added silently.
- `justification` = **the same value already stored on the Authorization** (SuperAdmin's original grant-time text) — read from the Authorization document inside the transaction and carried through unchanged. **No Owner-entered text, no new field, no second reason.**
- `timestamp` = server-set

## 7. Explicit Statement: Consumption Is Not a Second Authorization Decision

The `.consumed` audit entry's `justification` field deliberately carries the *same* text as the `.authorized` entry's — this is intentional, not a bug or an oversight. It records that the Owner executed, under their own authenticated identity, the specific recovery SuperAdmin had already authorized for the reason SuperAdmin already stated. It is never presented, stored, or interpretable as the Owner independently re-justifying or re-authorizing anything.

## 8. New Rules-Layer Consequence: the Client-Side Consumption Path Is Removed for the Authorized Case

Per this amendment, the `firestore.rules` `initialStockRecoveryAuthorization/{docId}` collection's `allow update` rule (added under the original, now-superseded design) is **no longer needed** for the authorized-consumption case — consumption happens via the Admin SDK transaction (§3), which bypasses `firestore.rules` entirely, identical to every other privileged-server write in this codebase. **This narrows the rules-layer attack surface, it does not widen it**: removing a client-reachable `allow update` path (even a narrow, field-locked one) in favor of a server-mediated path is a strict reduction in what any client credential — Owner included — can directly manipulate. The `voidRecords` create rule's own additive `|| initialStockRecoveryAuthorizationActive(...)` branch (original Plan §11) likewise becomes unreachable from any client for the authorized path specifically (the server's transaction writes `voidRecords` via the Admin SDK) — **it remains defined, unchanged, and harmless to leave in place** (defense-in-depth: if a future change ever re-introduces a client path, the same eligibility gate still applies), but is no longer the live enforcement point for this specific flow.

## 9. Dual-Eligibility-Logic Maintenance Cost — Named, Not Absorbed Silently

Per the Consumption-Audit Re-Assessment's own §6: the eligibility logic (current-confirmation-only, ceiling, Authorization validity) now exists in two places — the `firestore.rules` helper (`initialStockRecoveryAuthorizationActive()`, still authoritative for the *ordinary*, non-authorized Void & Redo path, and retained as a defense-in-depth backstop per §8 above) and the new server-side transaction (§3, authoritative for the authorized-consumption path). **This is a real, ongoing cost**, not a one-time note: any future change to eligibility rules (e.g., a future ceiling adjustment) must update both places, or the two paths silently diverge. This amendment does not resolve that cost — it names it as a required line item for the Implementation Plan's own future test/maintenance requirements (§10, below).

## 10. Preservation of Existing Decisions — Explicit Checklist

- SuperAdmin grants; Owner consumes — **preserved** (§1, §7).
- Original StockCount remains immutable — **preserved** (§3 step 8's write surface never includes `stockCounts`).
- No migration/backfill — **preserved** (nothing in this amendment touches any pre-existing document).
- No fabricated `confirmedAt` — **preserved** (the transaction never writes `confirmedAt` anywhere).
- 48-hour authorization — **preserved**, figure unchanged (§3 step 5).
- Current-confirmation-only — **preserved**, re-verified server-side (§3 step 3–4).
- One active Authorization per business — **preserved**, unaffected by this amendment (still enforced at grant time, per the existing grant route).
- One-time consumption — **preserved**, re-verified server-side via the `status` precondition (§3 step 4/6; §5).
- Confirmation #4 remains non-voidable — **preserved**, re-verified server-side (§3 step 7).
- No Confirmation #5 — **preserved**; nothing in this amendment touches the redo-confirmation branches at all (§11 of the Re-Assessment: redo confirmation remains client-side, unchanged, out of this amendment's scope).
- Existing narrow subscription exemption unchanged in scope — **preserved**; the new route is a privileged-server action, never itself subject to `subscriptionAllowsNewRecords`, and does not touch or widen the existing rules-layer exemption in any way.

## 11. Updated Traceability

| Item | Governing citation |
|---|---|
| Server-mediated consumption | Product Architect direction (this session); Consumption-Audit Re-Assessment §3, §8 |
| Transaction validation order (§3, steps 1–7) | Re-Assessment §3, §6, §9; POL-0009 Rules O, Q, U, W/X; original Plan §6–§8 (reused, not redesigned) |
| Atomic VoidRecord + Authorization-consumed write | Re-Assessment §4/§6 — achievable and required |
| Non-atomic, idempotent audit write | Product Architect direction (explicit: do not claim atomicity); Re-Assessment §4 |
| `.authorized` / `.consumed` audit shapes | Product Architect direction (this session, verbatim in §6 above) |
| `authorizationId` field addition | This amendment §6 — schema-shape decision within Rule 8/Plan authority, not a new business decision |
| `actorRole` type widening (`'owner'`) | This amendment §6 — same category as above |
| Dual-eligibility-logic cost | Re-Assessment §6; this amendment §9 |
| No second authorization decision | Product Architect direction (this session, verbatim); this amendment §7 |

## 12. Updated Acceptance Criteria (Additive to the Original Plan's Own §24/Implementation Authorization §8)

1. Consumption requires a real, server-verified Firebase ID token resolving to the target business's actual Owner — never a platform operator, never an unverified claim.
2. The void-record creation and the Authorization `consumed` transition happen in one real Firestore transaction — both succeed or neither does.
3. The audit write for `.consumed` is never inside that transaction, is attempted immediately after it commits, and is retried (safely, idempotently) on failure rather than silently dropped.
4. A successful recovery is never rolled back, undone, or treated as failed solely because the audit write failed.
5. `initial_stock_recovery.consumed`'s `actorUid` is always the consuming Owner's own uid — never the granting SuperAdmin's.
6. `initial_stock_recovery.consumed`'s `justification` is always identical to the Authorization's own grant-time `justification` — no Owner-entered text is ever accepted or stored as a distinct reason.
7. A second consumption attempt against an already-consumed Authorization never creates a second void-record and never produces a second, distinct audit entry misrepresenting a new action.
8. The server-side eligibility re-check (§3) and the `firestore.rules` eligibility helper remain logically equivalent — a required, named test obligation (§9), not assumed to stay in sync automatically.

## 13. What This Amendment Does NOT Do

- Does not modify any application code, `firestore.rules`, or test file.
- Does not sign, or purport to sign, the Implementation Authorization.
- Does not move the redo-confirmation step (post-void-record, Owner's draft edit/basis selection/reconfirmation) server-side — that remains exactly as originally planned, client-side, unchanged.
- Does not reopen any `BDR-0016`/`POL-0009`/Specification decision.
- Does not claim database-level atomicity for the audit write, per explicit instruction.

## 14. Next Step

A supplementary Implementation Authorization, scoped to exactly this amendment's addition (the new consumption route, its transaction, its audit entries, the two schema-shape additions named in §6), requiring its own fresh Product Architect signature — not drafted here, and not authorized by this document. The original, already-signed Implementation Authorization remains valid only for its own originally-enumerated scope (the grant route), unaffected by this amendment.

**Lifecycle:** Drafted → **Product Architect review (this step)**. Not yet an amended Implementation Authorization. Not Implemented.
