# SuperAdmin V1 Operational Control Plane — Architecture Gap Resolutions

**Governing chain:** [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(Approved — architecture decision, scope) → this document (recommended
resolutions, this session) → [BDS](../specs/18-superadmin-v1-operational-control-plane-slice.md)
(cites these resolutions as settled) → Rule 8 Assessment → Implementation
Plan.
**Type:** Architecture decision support — investigation and recommendation,
not implementation. **Requires Product Architect confirmation before the
BDS's dependent Functional Requirements are treated as final.**
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, or `firestore.indexes.json` to produce this document.**

Three gaps were surfaced during the SuperAdmin V1 Completeness Audit as
requiring an explicit decision rather than a silently-invented default.
Each is investigated against the actual current codebase below.

---

## Gap 1 — Business Suspension Data Model

**Question:** How is "this business is suspended" represented, and how is
it enforced immediately, given `firestore.rules`' architecture (most
tenant writes go directly client → Firestore, gated by Security Rules —
not proxied through the privileged server)?

**Confirmed by direct inspection:** `Business` (`apps/tenant/src/types.ts`)
has no `suspended` field today. The only existing suspension precedent in
this codebase is `users/{uid}.suspended` (per-staff, BDS #16) — checked by
`isSuspended()`, folded into `isMemberOf()`, and protected from
self-modification by `users/{userId}`'s own `allow update` rule
(`request.resource.data.get('suspended', false) == resource.data.get('suspended', false)`).
The staff-suspension **server** flow (`server/index.ts`, `/staff/:staffUid/suspend`)
is two-stage — Firebase Auth `disabled: true` (blocks login outright) +
Firestore field sync — because staff suspension's purpose includes
blocking login itself.

**Why server-side-only enforcement (without a Rules change) is
insufficient:** this platform's write path for ordinary tenant operations
(products, batches, expenses, withdrawals, etc.) is direct
client-SDK-to-Firestore, gated entirely by `firestore.rules` — not proxied
through `server/index.ts`. A suspension flag checked only in server route
handlers would do nothing to stop a suspended business's Owner/Staff from
continuing to write products, record sales, or add stock directly via the
client SDK. **Immediate, platform-wide enforcement is only achievable at
the Security Rules layer** — this is not a stylistic preference, it's a
structural fact about how this app is built, and it's exactly what
Architecture §9.3 already states ("Security-Rules-enforced flag... 4.6's
pattern... applied at the business level").

### Options evaluated

| | A1 — Field on `businesses/{id}`, folded into `isMemberOf()` | A2 — New top-level `platform_business_suspensions/{id}` collection |
|---|---|---|
| Blast radius | One new field + one new helper function (`isBusinessSuspended`), called from the *existing* `isMemberOf()` — every collection that already calls `isMemberOf()`/`isOwnerOf()` inherits the check automatically, with no per-collection rule edits | Same effective reach (still folded into `isMemberOf()`), but adds a second collection with its own read/write rules, doubling the surface to reason about for the same outcome |
| Immediate enforcement | Yes — live `get()` inside a Rules evaluation, no token refresh needed (same guarantee `isSuspended()` already provides) | Same |
| Tenant isolation | Unaffected — suspension is intrinsic to the business's own document, no cross-tenant read | Unaffected |
| Migration | None — additive optional field, `.get('suspended', false)` default, identical to every other optional field already in this rules file | None, but requires provisioning the new collection's rules from scratch |
| Backwards compatibility | Full — every existing business is implicitly `suspended: false` | Full |
| Testability | Extends the existing `businesses` and `isMemberOf`-consuming test groups in `tests/firestore-rules.test.ts`, following the file's own established per-collection pattern | Requires an entirely new test group for a collection with no other consumer |
| Consistency with existing codebase pattern | **Matches the proven `users/{uid}.suspended` precedent exactly** — same shape, same protection mechanism (field-immutability guard in the doc's own `allow update` rule) | Introduces a second pattern for the same concept (per-user suspension via field, per-business suspension via separate collection) with no stated reason for the divergence |

**Recommendation: A1.** Add `suspended?: boolean` to `Business`
(`apps/tenant/src/types.ts`), matching `UserProfile.suspended`'s existing
shape and comment style exactly. Add a new `isBusinessSuspended(businessId)`
helper to `firestore.rules`, structured identically to the existing
`isSuspended()`:

```
function isBusinessSuspended(businessId) {
  return get(/databases/$(database)/documents/businesses/$(businessId)).data.get('suspended', false) == true;
}
```

Fold it into `isMemberOf()` exactly where `isSuspended()` already sits —
`isMemberOf()` already does two `myProfile()`-driven checks; this adds a
third, symmetric one:

```
function isMemberOf(businessId) {
  return isSignedIn() && !isSuspended() && !isBusinessSuspended(businessId) && (
    myProfile().businessId == businessId ||
    businessId in ownedBusinessIds()
  );
}
```

Protect the field from tenant self-modification the same way `users/{userId}`
already protects `suspended`/`staffTier`/`managerPermissions` — add an
equality-preserving clause to `businesses/{businessId}`'s existing
`allow update: if isOwnerOf(businessId)` rule:

```
allow update: if isOwnerOf(businessId) &&
  request.resource.data.get('suspended', false) == resource.data.get('suspended', false);
```

**Write path:** exclusively the privileged server (Admin SDK), a new
`POST /api/superadmin/business/:businessId/suspend` and `/reactivate`
route (Phase C). Unlike staff suspension, this is **single-stage** — a
business is not itself a Firebase Auth account, so there is no `auth.updateUser`
step to disable; the Owner/Staff can still *log in* while suspended (so
they can see a "your account is suspended, contact support" state rather
than being locked out silently) — only *writes* are blocked, at the Rules
layer, immediately.

---

## Gap 2 — Business Visibility Read Model

**Question:** Architecture §9.3/§9.7 describe a full Support Session
mechanism (server-issued, time-boxed, single-business-scoped, read-only
*credential* the client then uses to read raw Firestore collections
directly). Should Phase B build that, or something narrower?

### Options evaluated

| | A — Full Support Session (Architecture §9.7 as drafted) | B — Narrow audited server-mediated read endpoint | C — Other |
|---|---|---|---|
| Security | Standing credential, live for up to 60 min once issued, even if unused after issuance | No standing credential at all — every read independently re-verified via the already-proven `requireAuth` + `requirePlatformOperator` + `requireSuperAdmin` chain | No viable third option found in this codebase — no analog for time-boxed credentials exists anywhere else in the repo |
| Auditability | Coarse — logs session issuance/expiry, not what was actually viewed within the session | Fine-grained — each individual business-view is its own audited action (`business.viewed`), with a required justification per call | — |
| Implementation complexity | New: credential issuance, expiry handling, and — critically — a way for the client's Firestore SDK to present that credential to read raw collections (native Firebase Auth custom claims require a token refresh, which Architecture §4.6 already rejected as unacceptable friction for suspension; a bespoke credential scheme would need to be invented from nothing) | Reuses the **exact existing route pattern** already proven correct by all 5 Payment Operations routes — no new credential concept, no new expiry state machine | — |
| Tenant isolation | Session, once issued, exposes raw collections directly to the client SDK — a wider surface than a curated response | Server returns a **curated, shaped** response (business profile + subscription status + shop/staff summary) — the client's Firestore SDK never gets a path to raw tenant collections at all; arguably *tighter* isolation than A | — |
| Future extensibility | Is the eventual full design for when Support/Developer tiers need read access (they're structurally recognized but currently denied by every route — ADR-0005) | Does not foreclose building A later for those tiers — B is a strict subset, supersedable, not a dead end | — |
| Exposure risk | A leaked/replayed session credential is a standing risk for its lifetime | No credential exists to leak; every access requires fresh, full re-authentication through middleware already audited and tested | — |

**Recommendation: B.** A single new route,
`GET /api/superadmin/business/:businessId`, following the identical
`requireAuth` → `requirePlatformOperator` → `requireSuperAdmin` → Admin-SDK
read → `writeAuditLogEntry` shape as every existing Payment Operations
route. This satisfies "operator can understand a customer's problem without
an unrestricted tenant-data backdoor" with materially less new surface area
than the full Support Session mechanism, and does not block building the
full mechanism later if/when Support/Developer tiers are actually unblocked
for read access — a decision explicitly deferred, not made here.

**Response shape (curated, not a raw passthrough) — explicitly bounded:**
- Business profile: `name`, `category`, `currencySymbol`, `createdAt`, `businessId` (no `businessCode` — confirmed, per the already-documented known gap, this field doesn't exist anywhere in the codebase)
- Owner identity: `name`, `email` (see Gap 3), `createdAt` — from `users/{ownerUid}`
- Shop/staff roster **summary only**: `name` + `suspended` flag per staff member — not full staff detail (permissions, tier, etc.)
- Subscription status: `subscriptions/{businessId}.status` — **already an existing, proven platform-scoped read** (`readSubscriptionStatus()` already exists in `server/index.ts`, used by the Payment Operations `PaymentDetail` route; Phase B reuses it verbatim, adds no new read pattern)
- Recent payment history: last N `payments` entries and their status — reusing the existing `payments` collection-group read pattern from Phase A of Payment Operations

**Explicitly excluded from this read, by design:** `products`, `batches`,
`expenses`, `withdrawals`, `stockCounts`, `timelineEvents`, or any other
operational/financial collection. None of these are needed to diagnose the
realistic support scenarios ("can't log in," "payment not reflected,"
"account looks wrong") — including them would reopen exactly the
raw-tenant-read boundary Architecture Principle 2.8 forbids, for a use case
that doesn't need it.

---

## Gap 3 — Owner Email Exposure

**Question:** May the SuperAdmin Business Visibility read expose the
business owner's email?

**Precedent check (confirmed by search):** No existing platform-operator-
facing surface exposes a tenant's email today. `PlatformAuditLogEntry` has
no email field; `PendingPaymentRow`/`PaymentDetail` expose only `submittedBy`
(a uid), never an email. This is a genuinely new exposure, not an extension
of an existing one — treated accordingly, not assumed.

**For exposing it:**
- Architecture §9.3 already explicitly names "Admin's registered email" as the *second* search-match field in the intended design — this is completing an already-approved architecture point, not inventing new scope.
- The privileged server already holds full Firebase Auth admin access structurally (`auth.updateUser`, `auth.revokeRefreshTokens` are already called for staff suspension) — email is not a new class of data the *server process* doesn't already touch; the open question is only whether a *human operator* sees it rendered.
- It directly serves the single most common realistic support scenario: a customer emails support from their own account email, and the operator needs to correlate that to a specific business.

**Against / caution:**
- Owner email is PII. This would be the first surface where a human operator (not just server-side code) sees a tenant's PII rendered in an admin UI.

**Recommendation: Yes, with a scope constraint.** Expose owner email **only**
within the single-business, audited diagnostic view (Gap 2's Option B) —
**never** in any list/search-results view. Rationale:
1. Architecture §9.3 already approved this as a legitimate design point; this resolves an open detail, it doesn't add new scope.
2. Every access is individually audited under Gap 2's model (actor, target business, timestamp, required justification) — the exposure is fully traceable to a specific operator and a specific, justified reason, satisfying the audit principle that makes this safe.
3. Search-results lists (matching by name/businessId prefix) return `name` + `businessId` **only** — email appears exclusively after drilling into one specific, justified, audited business detail read. No bulk-scannable directory of tenant emails is ever rendered.

---

## Summary of Resolutions (for the BDS/Rule 8 Assessment to cite as settled)

| Gap | Resolution |
|---|---|
| 1 — Business suspension model | `suspended?: boolean` field on `businesses/{businessId}`, folded into `isMemberOf()` via new `isBusinessSuspended()`, field-protected in the existing owner update rule. Single-stage server write (no Auth-disable step). |
| 2 — Business Visibility read model | Narrow, audited, server-mediated single-business diagnostic endpoint (curated response shape) — not the full Support Session credential mechanism. |
| 3 — Owner email | Exposed, but only in the single-business audited detail view, never in list/search results. |

**Status:** Recommended, this session. Requires explicit Product Architect
confirmation — recorded as a decision, not silently treated as final by
downstream documents until that confirmation is given.
