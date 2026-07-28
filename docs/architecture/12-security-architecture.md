# Section 12 — Security Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–11 — all approved
**Purpose:** Formalize every security control this document series has already named but deferred here — Authentication, Authorization, Permissions, Audit Logs, Business Isolation, Encryption, Backups, Disaster Recovery, Session Management. Section 12 does not invent new mechanisms where a prior section already fixed one; it states each as an explicit, checkable control and closes the specific gaps prior sections flagged as "Section 12's job."

---

## 12.1 Authentication

**What's already fixed (4.6, restated as a control):** Firebase Authentication is the identity provider for Admins; PIN-based quick-login is a convenience layer over the same underlying Auth session for Staff on a shared device — never a separate, weaker identity system. `platform_operators/{uid}` (7.4) is a structurally separate identity space for internal accounts, checked by the SuperAdmin app's own auth check, never conflated with `users/{uid}`.

**Control — PIN strength and scope:** the PIN flow (4.6) authenticates *which staff member* on an already-authenticated device, not a standalone credential — it must never be treated as sufficient to establish a new session on an untrusted device. Concretely: PIN login is only reachable when a valid Firebase Auth session already exists on that browser (an Admin has already signed in once to "pair" the device, consistent with `PairedDevice` already referenced in 7.2/8.2's denormalization note) — a PIN alone, on an unpaired device, authenticates nothing.

**Control — internal account authentication:** `platform_operators/{uid}` accounts authenticate via Firebase Auth exactly like tenant accounts (same provider, per 4.13's "shares infrastructure rather than duplicating it"), but **must** have multi-factor authentication enforced — a control this section adds, not carried from a prior one, since internal accounts carry categorically higher blast radius (impersonation, business suspension, billing override) than any single tenant account. This is checked at Auth-provider level (Firebase Auth's own MFA enforcement), not re-implemented in application code.

---

## 12.2 Authorization and Permissions

**What's already fixed (6, 7.3, restated as a control):** every authorization decision reads `users/{uid}` (tenant) or `platform_operators/{uid}` (internal) — never a client-asserted claim (Principle 2.9). Section 6.3's amendment already specified the concrete Security Rule shape (`isOwnerOrGrantedManager`); Section 7.3 fixed where `managerPermissions` lives.

**Control — the general rule every Security Rule function must satisfy:** stated explicitly here because it's the one property every collection's rule needs and no single prior section owned stating it as a standalone requirement: **a Security Rule may only grant access based on a server-controlled document the requesting user cannot themselves write** (`users/{uid}`'s `role`/`staffTier`/`managerPermissions`/`suspended` fields are themselves writable only by the privileged server, 4.4 — never by the user whose access they gate). A rule that read a field the same user could write would be a self-granted-permission hole, structurally, regardless of how reasonable the field looked in isolation.

**Control — permission changes take effect immediately:** already established for `suspended` (4.6) and generalized in 4.6 to "any account or business the platform needs to disable" — Section 12 extends this explicitly to `managerPermissions` and `staffTier` changes too: a Manager permission revoked by an Admin must deny the next write attempt at the Security Rules layer, not wait for the demoted Staff member's token to refresh.

---

## 12.3 Business (Tenant) Isolation

**What's already fixed (7.1, 4.5, restated as controls):** nesting under `businesses/{businessId}` structurally prevents un-scoped cross-tenant reads; platform-level collections (7.4) are read-only-by-default and writable only via the privileged server; the aggregation layer (4.10) is the sole path for any cross-tenant figure, and per-business AI (10.2–10.7) must never merge with it (10.9).

**Control — caching must not become the isolation gap (the item 11.7 explicitly flagged as Section 12's job):** every cache introduced in Section 11 (11.4's in-memory cache, 11.5's shared Redis cache) must key strictly by the scope of the data it holds — a `platform_aggregates` cache entry is safe to key platform-wide (it's already anonymized, 4.10), but **no cache may ever hold a single business's raw data keyed loosely enough that a request for Business A could be served Business B's cached entry.** Concretely: any cache key touching business-scoped data must include the full `businessId` as part of the key, and any cache serving a request must re-verify the requester's authorization for that exact `businessId` before serving the cached value — the cache is an optimization on top of the authorization check, never a bypass of it. This is the specific, checkable form of the gap 11.7 named.

**Control — Support Session and impersonation are the only sanctioned single-tenant reads by a platform operator (6.5, 9.7, 9.10, restated as a boundary):** both are time-boxed, audited, and — this section adds the explicit negative — **neither credential type is valid for any collection or field the specific session/impersonation grant doesn't name.** A Support Session against Business A is not usable against Business B even if requested again within the same 60-minute window; each grant is single-business by construction, not merely by convention.

---

## 12.4 Audit Logs

**What's already fixed (7.4, 9.6, 8.10, restated as a control):** append-only (`allow update: if false`), platform Audit Log (9.6's schema) distinct from the per-tenant Timeline (8.10) — both proven correct patterns, applied consistently.

**Control — audit log integrity beyond append-only:** append-only prevents *editing* an entry, but not a privileged server compromise writing a *false* entry. Section 12 adds: every Audit Log write includes the server-computed `timestamp` (7.4's existing field) plus a hash of the previous entry in the same collection (a simple hash-chain, not a blockchain — no new infrastructure, just a field), making a deleted-and-reinserted entry detectable by a broken chain rather than assumed trustworthy purely because the collection is append-only. This is a low-cost integrity check appropriate to this Mission's scale, not over-engineered (Principle 2.6) — a full tamper-proof audit system (external write-once storage, third-party attestation) is not justified until a concrete compliance requirement names it.

**Control — retention:** platform Audit Log entries are retained indefinitely by default, consistent with 7.6's "truly immutable, no exceptions" tier — this is the one collection where even the legal-deletion purge (7.9) does not apply, since a record of *why* a purge happened is exactly what must survive the purge itself.

---

## 12.5 Encryption

**In transit:** HTTPS everywhere — the SPA-to-Firestore path (client SDK, TLS by default), the SPA-to-privileged-server path (Railway's own TLS termination), and the privileged-server-to-payment-processor webhook path (4.12) all already run over TLS by virtue of the platforms involved; no additional design decision is required here beyond confirming no component in the system map (4.2) is ever configured to accept a plaintext connection.

**At rest:** Firestore encrypts all data at rest by default (a Google Cloud platform guarantee, not an application-level decision this document needs to design). The one place this section adds a control: **payment/subscription data (4.12) is never stored by Sabush itself** — already fixed in 4.12 as a PCI-boundary decision, restated here as the encryption-relevant consequence: there is no card/mobile-money credential in Sabush's own Firestore for at-rest encryption to even need to protect, which is a stronger property than encrypting sensitive data would be.

**Control — no secrets in client-reachable code:** the AI provider key (10.1, 4.11), the payment processor's webhook-verification secret (4.12), and any future third-party API key are held only in the privileged server's environment configuration, never in the SPA's built bundle — a build-time check (a simple bundle-content scan for known secret patterns, run in CI once Section 13 sets up a pipeline) is the concrete control that makes this checkable rather than a policy someone could forget.

---

## 12.6 Backups and Disaster Recovery

**Firestore's own point-in-time recovery** (a Google Cloud-managed feature, enabled at the project level) is the primary backup mechanism — this section's job is to state the recovery objectives it must meet, not to build a custom backup pipeline that would duplicate what the platform already provides correctly (Principle 2.6).

**Recovery objectives (stated concretely, since "we have backups" without a number isn't a plan):**
- **RPO (Recovery Point Objective): under 1 hour** — achievable directly from Firestore's point-in-time recovery window, requiring no custom export job.
- **RTO (Recovery Time Objective): under 4 hours for a full project-level restore** — a number Section 13 should validate with an actual restore drill before this document is treated as final on this point, since an untested RTO is an assumption, not a guarantee.

**Control — the privileged server and Background Worker are stateless by design (4.4, 4.8, restated as a DR property):** neither holds data Firestore doesn't already have — a Railway-level outage requires only redeploying the existing container images, not a data-recovery process of its own. This is a direct benefit of 4.1's "one privileged server, not a service mesh" decision, not a new design choice.

**Control — the legal-deletion purge (7.9) and backup retention must not silently contradict each other:** a purge deletes live documents, but Firestore's point-in-time recovery window means a "deleted" business's data is technically recoverable for that window regardless. Section 12 states this explicitly rather than letting it be an unstated gap: any legal deletion process (7.9) must account for the backup retention window as part of what "deleted" actually means, and the privacy/legal documentation Section 13 produces around this feature must not overstate immediacy the backup system doesn't actually provide.

---

## 12.7 Session Management

**What's already fixed (4.6, 9.7, 9.10, restated as controls):** Firebase Auth session tokens for normal use; Support Sessions (6.5, 9.7) time-boxed at 60 minutes, non-renewable without a fresh request; impersonation (4.6, 9.10) time-boxed at 30 minutes, requires an Admin-initiated help request, always shows a visible banner to the impersonated Admin.

**Control — standard session timeout:** a normal Firebase Auth session (Admin or Staff) is not designed to expire on a fixed short window (a shared-device, low-formality target market, 1.4, would be actively harmed by aggressive timeouts) — but **a session must be invalidated immediately, not just left to expire naturally, whenever `suspended` flips true** (already 4.6's rule) or whenever a password/credential reset occurs, via Firebase Auth's own session-revocation API, called from the privileged server as part of the existing suspend/reset action (4.4) — closing the gap between "the flag changed" and "the already-issued token still works until its natural expiry" that a Security-Rules-only enforcement (4.6) doesn't fully close on its own for actions taken through Firebase Auth directly rather than through Firestore.

**Control — internal (`platform_operators`) sessions are shorter-lived than tenant sessions by default:** given 12.1's higher-blast-radius reasoning, a platform-operator's own base session (before any Support Session/impersonation grant layered on top) should re-authenticate more frequently than a tenant Admin's — a concrete, lower session lifetime configured at the Firebase Auth project level for the `platform_operators` population specifically, distinguishable because 7.4 already keeps that identity space structurally separate.

---

## 12.8 Summary — Control Ownership Table

| Control area | Primary mechanism | Section that designed it | What 12 added |
|---|---|---|---|
| Tenant/Staff auth | Firebase Auth + PIN | 4.6 | PIN-requires-paired-device rule |
| Internal auth | Firebase Auth, separate identity space | 7.4, 4.13 | MFA enforcement |
| Authorization | Security Rules reading server-controlled docs | 4.5, 6, 7.3 | The general "never a self-writable field" rule |
| Tenant isolation | Nesting + aggregation boundary | 7.1, 4.10 | Cache-key scoping rule |
| Single-tenant platform-operator reads | Support Session, impersonation | 6.5, 4.6, 9.7, 9.10 | Grant is scoped to exactly the named business, no exceptions |
| Audit integrity | Append-only collections | 7.2, 7.4, 8.10, 9.6 | Hash-chain tamper-evidence |
| Encryption in transit/at rest | Platform defaults (TLS, Firestore) | — | No-secrets-in-bundle CI check |
| Backups/DR | Firestore point-in-time recovery | — | Concrete RPO/RTO, purge-vs-backup-window statement |
| Session management | Firebase Auth sessions | 4.6 | Immediate revocation on suspend/reset; shorter internal session lifetime |

---

## What Sections 13–15 Will Build On This

- **Section 13 (Development Strategy)** sequences implementing every control above — MFA enforcement, the CI secret-scan, the RTO validation drill — relative to feature work, and is where the audit-drill referenced in 12.6 actually gets scheduled.
- **Section 14 (Future Roadmap)** can reference this section's control set when describing how Sabush earns and keeps enterprise customers' trust (Mission's own "enterprise customers" scale target) without a security rework.
- **Section 15 (Architecture Validation)** will apply its "why is this needed / what happens if we don't" test to every control introduced here, same as every other section.

**This section requires your explicit approval before Section 13 (Development Strategy) begins.**
