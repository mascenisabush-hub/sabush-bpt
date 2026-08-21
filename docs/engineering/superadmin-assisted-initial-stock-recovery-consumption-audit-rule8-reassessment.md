# SuperAdmin-Assisted Initial Stock Recovery — Consumption-Audit Mechanism Rule 8 Re-Assessment

**Type:** Rule 8 Re-Assessment — a targeted re-run of [`superadmin-assisted-initial-stock-recovery-rule8-assessment.md`](./superadmin-assisted-initial-stock-recovery-rule8-assessment.md)'s Finding C, against a gap surfaced during this session's own verification/debug pass (not a Specification gap — the Specification's FR-20 already required consumption to be audited; what was missing was a *mechanism* capable of satisfying it). Planning only. **Does not authorize implementation.**
**Lifecycle status:** Assessed (original Rule 8) → **Re-Assessed (this document)**. Not yet an amended Implementation Authorization, not Implemented. Reaching this state is not itself authorization to begin coding.
**Does not re-derive:** the original Rule 8 Assessment's Findings A, B, D–L, its Risk Summary, or its overall READY verdict — those are unchanged and incorporated by reference. This document's only job is to answer: **can consumption actually be audited given this repository's real architecture, and if the mechanism changes, does that change any Finding, any BDR-0016/POL-0009/Specification decision, or the READY verdict?**
**Basis:** the signed Implementation Authorization (2026-08-21, scope §2); the Implementation Plan; this session's own direct code inspection (`server/platformAuditLog.ts`, `server/index.ts`'s `/api/staff/delete` route, `firebase.json`) confirming (a) `platform_audit_log` is Admin-SDK-only — no client, tenant or platform-operator, may write it directly, and (b) this repository has **no Cloud Functions infrastructure** (`firebase.json` defines only `firestore`; no `functions` config exists) — so a Firestore-triggered audit write is not available without introducing new deployment infrastructure, which this re-assessment does not propose.

**Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or any `docs/specs/*` file to produce this document.** (The uncommitted code from the *original*, already-tested grant-route scope remains exactly as it was — untouched by this document.)

---

## 1. The Gap, Precisely

The original Rule 8 Assessment's **Finding C** concluded consumption "stays at the Security Rules layer" — a client-side Owner write, batched with the void-record creation. That conclusion satisfied every Owner-only-execution requirement (`POL-0009` Rule Q/N) but **did not satisfy Specification FR-20** ("Every grant, consumption, and unconsumed-expiry event must be recorded as a permanent, append-only audit fact") for the consumption event specifically, because `platform_audit_log` is structurally client-write-`false` — a tenant Owner's browser cannot write to it under any circumstance, by the same design that makes it trustworthy in the first place. Finding C's own text did not surface this consequence explicitly. That is the gap: not a missing business decision, but an incomplete technical finding.

## 2. Product Architect Direction (Recorded Verbatim)

> "We WILL audit the actual consumption event. Do not accept an unaudited VoidRecord consumption. Use a small authenticated server-side consumption path so that the Owner remains the actor, while the server atomically records both: 1. the VoidRecord consumption; and 2. the corresponding platform audit entry. [...] Owner actor UID; business; exact confirmation being voided; authorization being consumed; timestamp; relevant recovery reason/context. [...] `initial_stock_recovery.authorized` [grant, unchanged] [...] `initial_stock_recovery.consumed` [new]."

## 3. Re-Examined: Owner Authentication for a Server-Mediated Consumption Path

**Direct precedent exists and is reusable.** `server/index.ts`'s existing tenant-facing routes (e.g. `/api/staff/delete`) already establish the exact pattern needed: `requireAuth` (real Firebase ID token verification, `req.callerUid`) followed by a server-side ownership check against the caller's `users/{uid}` profile and the target `businessId` — structurally distinct from, and never confused with, `requirePlatformOperator`/`requireSuperAdmin` (a different identity space entirely). A new `initialStockRecoveryAuthorization/consume` route would reuse this exact, already-proven pattern (verify `req.callerUid` resolves to the business's Owner, not merely "a member") — no new authentication mechanism needs inventing. **Resolvable within Rule 8 authority.**

## 4. Re-Examined: "Atomic" VoidRecord + Audit Write — A Real Constraint, Not Silently Resolved

**This repository's own established architecture does not support what "atomic" would mean literally.** `server/platformAuditLog.ts`'s own header explicitly documents, for the closest existing precedent (`paymentConfirmation.ts`), that an audit write is **deliberately never folded into the same transaction** as the primary state change, for two stated reasons that apply identically here: (1) the Firestore Admin SDK does not support nested transactions, and the primary state change (here: void-record creation + Authorization consumption) already needs its own transaction; (2) the audit entry's own `actorUid`/`actorRole` reflects information unrelated to, and not needing to be read inside, that primary transaction.

**What *is* achievable, and is this repository's own established, accepted pattern everywhere else it audits a privileged action** (`business.suspended`, `business.reactivated`, `payment.confirmed`, and now `initial_stock_recovery.authorized`): the primary state change (void-record + Authorization-consumed, together — these two writes share no such constraint and **can** be one real Firestore transaction, since neither is itself a nested transaction) commits **first**; the audit write follows as an immediate second step; on audit-write failure, the response reports `auditLogged: false` and the server logs the failure for follow-up, rather than either (a) blocking the Owner's legitimate recovery on an audit-log outage, or (b) silently losing the failure. Re-running the whole request is always safe (idempotent — see §6).

**This does not satisfy "atomic" in the strict database sense the Product Architect's wording used.** It satisfies the underlying intent — no unaudited consumption is ever silently accepted as a *successful, unremarked* outcome — using the same tolerance for a narrow, visible, retried-on-failure window this codebase has already accepted for every other audited SuperAdmin action. **This is a technical constraint of the existing architecture, not a policy choice this re-assessment is empowered to override**, and it is flagged here rather than quietly substituted for what was asked. If genuine single-transaction atomicity across Firestore + the audit collection is required as a hard business requirement (not just "no silent gaps"), that would require new infrastructure (e.g., a Cloud Functions trigger) this repository does not currently have — a materially larger scope than "a small authenticated server-side consumption path," and outside what this re-assessment proposes.

## 5. Re-Examined: Idempotency

Resolvable using the identical pattern `confirmPayment()`/`suspendBusiness()` already establish: the consumption route's primary transaction re-checks the Authorization's own `status` before writing (`'unconsumed'` → precondition for consuming; already `'consumed'` → return the prior, already-successful outcome, no error, no duplicate write) — safe to call more than once for the same Authorization, exactly as the existing precedent already requires of every privileged write in this codebase.

## 6. Re-Examined: Race / Concurrency Behavior

**Materially improves on the original design**, not merely preserves it: moving consumption server-side means the void-record creation and the Authorization `status: 'consumed'` write can now be two documents inside **one real Firestore transaction** (previously, the client-side design used a batch, which commits atomically but without the transaction's own read-then-write optimistic-concurrency guarantee against a *concurrent* consumption attempt). Two simultaneous consumption requests: the transaction's own read-precondition on the Authorization's `status` field means only one commits as `'consumed'`; the other's transaction is rejected by Firestore's own concurrency control and, per §5, returns the already-successful outcome rather than an error.

**One new risk this introduces, flagged rather than ignored:** the eligibility logic (current-confirmation-only, ceiling, window) now exists in **two places** — the `firestore.rules` layer (still authoritative for the ordinary, non-authorized Void & Redo path, unchanged) and this new server-side transaction (authoritative for the authorized-consumption path specifically). Keeping these in sync becomes an explicit, ongoing maintenance concern that did not exist under the original all-rules-layer design. This is not a blocking risk — the two checks serve different write paths and neither can be bypassed by the other — but it is a real, named cost of this direction that the Implementation Plan Amendment must acknowledge, not silently absorb.

## 7. Re-Examined: Tenant Isolation

Unaffected — the new route remains `businessId`-scoped by construction (from the URL path/request, verified against the caller's own profile), identical in shape to every existing tenant-facing route and to the grant route's own already-implemented isolation.

## 8. Re-Examined: Preservation of Owner-Only Execution

**Preserved, arguably strengthened.** "Owner performs consumption" was always about *whose decision and authority* triggers the write, not about *which process* executes it. The Product Architect's own framing — "a small authenticated server-side consumption path so that the Owner remains the actor" — is exactly this: the server acts only as the Owner's authenticated proxy, never substituting its own judgment, identical in spirit to how the grant route already acts as SuperAdmin's authenticated proxy for the grant action. `POL-0009` Rule N/Q are unaffected in substance.

## 9. Re-Examined: Preservation of the Confirmation #4 Ceiling and No-Confirmation-#5

Unaffected. The server-side eligibility re-check (§6) enforces `chainPosition != 4` identically to the existing `firestore.rules` helper; no new branch or path is introduced that could reach a 5th confirmation. Server-side redo-confirmation creation (if the server itself later performs that write, versus the client still doing so post-consumption) is **explicitly out of scope of this re-assessment** — see §11.

## 10. Re-Examined: Preservation of the Existing Subscription Exemption

Unaffected. The consumption route is a privileged-server action; like the grant route, it is not itself subject to `subscriptionAllowsNewRecords` (that function governs tenant client writes). Its transaction writes to `voidRecords` and the Authorization document via the Admin SDK, which bypasses `firestore.rules`/that gate entirely — no new exemption needs designing, and none is introduced beyond what already exists for the grant route.

## 11. Explicit Scope Boundary — What This Re-Assessment Does NOT Resolve

- Whether the **redo confirmation** (the Owner's subsequent reconstruction/reconfirmation, after void-record creation) also moves server-side, or remains the existing client-side write against `firestore.rules`' unmodified redo-confirmation branches. **This re-assessment assumes it remains client-side, unchanged** — only void-record creation (the one step that both consumes the Authorization and is the one FR-20 requires an audit entry for) moves server-side. If the Product Architect intends the entire Void & Redo flow to move server-side, that is a materially larger scope change requiring its own, separate governance pass.
- The exact route path, request/response shape, and TypeScript module boundaries — reserved for the Implementation Plan Amendment (§13, below), not decided here.
- Whether "recovery reason/context" (Product Architect direction, §2) is a field the Owner supplies at consumption time (new, not previously modeled) or is derived entirely from the Authorization's own existing `justification` (SuperAdmin's stated reason at grant time). **Flagged as needing explicit Product Architect confirmation** — this re-assessment does not assume either answer (see §14).

## 12. Does This Reopen Any BDR-0016/POL-0009/Specification Decision?

**No.** Every business-level decision this capability rests on is unchanged:

- SuperAdmin grants; Owner consumes (§8, above — preserved).
- Original StockCount immutability (untouched by this mechanism change — the server's new transaction writes only `voidRecords` and the Authorization document, never `stockCounts`).
- No `confirmedAt` backfill (unaffected — the server-side transaction does not touch `stockCounts` at all).
- No migration (unaffected).
- One-time Authorization; 48-hour expiry; current-confirmation-only; Confirmation #4 ceiling; no Confirmation #5 (all re-verified above, all preserved).
- No general SuperAdmin database-editing capability (unaffected — SuperAdmin's own write surface is completely unchanged by this document; only the Owner's consumption *path* changes, from a direct client write to an authenticated server proxy).

**This is a technical implementation-mechanism change, not a business decision.** It is resolvable within Rule 8's own authority.

## 13. Required Next Governance Artifact

Per this repository's own governance standard (`platform-engineering-governance-standard.md`, Stage 8: an Implementation Authorization is "the explicit, signed go-ahead for exactly the scope the Rule 8 Assessment defined — nothing broader") — **the signed Implementation Authorization's §2 enumerated scope did not include a second server route or a change to how consumption is written.** A consumption-audit mechanism change that adds a new privileged-server route and removes the client's direct `voidRecords`-create write path for the authorized case is broader than what was signed. This requires, before any code is touched:

1. **An Implementation Plan Amendment** (companion document, not a rewrite) — describing the new consumption route precisely (§9–§10 of the existing Plan's own numbering, superseded for the authorized-consumption case specifically; §16's audit-logging section extended to cover the `.consumed` action type), the new maintenance cost named in §6 above, and updated test requirements (idempotency, transaction-level concurrency, the two-eligibility-check duplication).
2. **An amended or supplementary Implementation Authorization**, explicitly scoped to only this addition, requiring its **own fresh Product Architect signature** — the original signature remains valid for, and only for, the scope it actually enumerated (the grant route, already implemented and tested); it does not retroactively cover this addition.

## 14. Genuine Open Question Surfaced, Not Resolved Here

Whether "relevant recovery reason/context" in the audit entry means: (a) the Authorization's own `justification` (already captured at grant time, already flows through unchanged), (b) a new, separate field the Owner supplies at the moment of consumption, or (c) both. This is a small but genuine content-shape decision this re-assessment does not invent an answer for — it belongs in the Implementation Plan Amendment, confirmed by the Product Architect, not assumed.

## 15. Readiness Classification

**✅ READY, for the narrow mechanism change only, pending the governance artifacts named in §13.** No BDR-0016/POL-0009/Specification decision is reopened. One genuine open question remains (§14). One real, named cost is introduced and must be carried forward, not absorbed silently (§6's dual-eligibility-logic maintenance concern). One explicit constraint is surfaced rather than glossed over (§4 — "atomic" in the literal sense is not achievable without new infrastructure; the proposed direction is this codebase's own established two-step, idempotent, failure-visible pattern instead).

**This document does not authorize implementation.** Coding may not begin until the Implementation Plan Amendment and an amended, freshly-signed Implementation Authorization both exist, per §13.
