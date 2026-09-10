# SuperAdmin Agent — Customer Problem → Assistance Level → Resolution Capability Investigation

**STATUS: DISCOVERY / PRODUCT-DEFINITION INVESTIGATION ONLY.**
No code was written or modified. No BDR, Policy, Specification, Rule 8
Assessment, or Implementation Authorization was created or altered. No
architecture was redesigned. Nothing was committed or pushed — this
document lives outside the repository entirely, as instructed. Every
conclusion is traced to a specific file or, where the repository is
silent, marked explicitly:

`UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE`

This document builds directly on, and does not repeat the groundwork
of, `docs/engineering/SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md`
(referred to below as "the Prior Investigation"). Its findings —
especially the Level-1-equivalent Business Visibility model, the
deferred Support Session (Gap 2), the absence of any AI-agent
architecture, and the absence of any customer-communication channel —
are treated here as settled evidence, not re-derived from scratch.

The Hybrid model this document evaluates is a **given input**, per the
Product Architect direction:

- **Level 1 — Guided Support:** read-only context, guide the customer.
- **Level 2 — Assisted Resolution:** specific, bounded, explicitly
  authorized operational actions.
- **Level 3 — Controlled Support Session:** deeper, boundaried access
  when Levels 1–2 are genuinely insufficient.

---

## 1. Evidence Base (Restated From the Prior Investigation, Re-Verified)

Re-checked directly against current file contents before use below:

- **Business Visibility** (`server/businessVisibility.ts`) — the only
  built, audited, curated single-business read. Returns: business
  profile (name/category/currencySymbol/createdAt/businessId), owner
  identity (name/email/createdAt), staff summary (name+suspended
  only), subscription status, last N payments. Requires a non-empty
  `justification`; writes exactly one `business.viewed` audit entry per
  call. Reachable today only by `platformRole === 'superadmin'` — no
  route branches on `'support'`/`'developer'` (confirmed, zero
  matches).
- **Business Suspend/Reactivate** (`server/businessSuspension.ts`) —
  idempotent, `justification`-required, two independent enforcement
  layers (Admin-SDK-only write + `firestore.rules` field lock).
  SuperAdmin-full only per Architecture §6.8's permission matrix.
- **Payment Operations** (`server/paymentConfirmation.ts`) — confirm/
  reject a `payments/{id}` document. SuperAdmin-full only today (no
  route branch on `'support'`/`'developer'`).
- **Initial Stock Recovery Authorization** / **Business Worth Recovery
  Authorization** (`server/initialStockRecoveryAuthorization.ts`,
  `server/businessWorthRecoveryAuthorization.ts`) — narrow,
  authorize-only mechanisms; the SuperAdmin authorizes, the tenant
  Owner executes via the tenant app's own Void & Redo flow. Governed by
  `BDR-0016`/`POL-0009` and a parallel pattern for Business Worth.
- **Audit Center** (`server/auditLogQuery.ts`) — filterable by
  businessId/actorUid/actionType/date range, 100-row cap, no
  pagination (deliberate V1 decision). Known, small technical defect:
  filter allowlist doesn't yet include the two recovery-authorization
  action types (stored correctly, just not filterable by type).
- **Support Session** (Architecture §9.7/§6.5) — fully specified,
  **not built**, explicitly evaluated and deferred once
  (`18-superadmin-v1-architecture-gap-resolutions.md`, Gap 2) in favor
  of Business Visibility's narrower model.
- **Impersonation** (Architecture §9.10) — fully specified, **not
  built**, same Gap 2 deferral.
- **`businessCode`** — named throughout Architecture §7.4/§9.3 as the
  intended fast customer-identification lookup. **Does not exist
  anywhere in the implementation** — confirmed, `server/index.ts` has
  a comment (~line 2273) acknowledging this as a known, named gap.
- **Password reset** — no mechanism exists anywhere for a tenant Admin
  to reset their own password (no `sendPasswordResetEmail` call in
  `AuthView.tsx`), and no SuperAdmin route can do it on their behalf.
  The only password-reset code in the repository,
  `/api/staff/reset-pin`, is an **Owner-acting-on-a-Staff-member**
  action, gated `tenantOnly` — structurally unreachable from
  SuperAdmin.
- **`Business.contact`** (`apps/tenant/src/types.ts`, line 85) — a
  free-text `contact?: string` field on the Business Profile, set via
  `BusinessProfileSetupModal.tsx`. Confirmed by direct reading: it has
  **no format validation, no channel-type tag (phone vs. email vs.
  something else), and no consent-for-contact-purpose semantics** —
  the placeholder text (`"ex.: contacto@negocio.co.mz"`) merely
  *suggests* an email-like format but enforces nothing. Per this
  task's own explicit instruction, this field is **not** treated below
  as a reliable WhatsApp/communication recipient merely because it
  exists.
- **Notifications (Module #20)** — in-app only, system-triggered/
  templated by design (every existing producer — trial expiry, closing
  reminder, breakage alert — fires from a system condition, never from
  an operator composing a message). Email/WhatsApp/SMS explicitly
  deferred (`20-notifications.md`, Decision Gate 3). Tenant User
  Experience (Phase 4) itself is "not yet authorized" per
  `docs/specs/README.md`.
- **Contagem Integrity Diagnostics** (`contagem-integrity-diagnostics-specification.md`)
  — a **tenant-side, self-service** specification (accepted, not yet
  implementation-authorized) intended to give the Owner their own
  signals when stock/Contagem data looks internally inconsistent. This
  is directly relevant to §2's "customer believes stock information is
  wrong" category below: some of that problem space already has a
  dedicated, tenant-facing answer being planned — a SuperAdmin Agent
  is not the only, or even the first, tool aimed at it.
- **AI-agent/chatbot/LLM architecture connected to SuperAdmin** — none
  found, confirmed again by the Prior Investigation's exhaustive
  search (§13 there).

---

## 2. The Customer-Assistance Problem Space

Organized per the task's own categories, each scenario checked against
what actually exists in the repository — not invented.

**Account / Access**
- Cannot log in (forgotten password) — real, evidenced, zero mechanism
  for anyone (§1 above).
- Cannot log in (account disabled/suspended, e.g. via
  `/api/staff/suspend`'s `auth.updateUser(uid, {disabled:true})`) —
  mechanism to *cause* this exists tenant-side (Owner suspending a
  Staff member); no SuperAdmin visibility into *why* a specific login
  is failing beyond what Business Visibility's curated read exposes.
- Business cannot be accessed at all — maps directly to the existing,
  built Suspend/Reactivate + `BusinessSuspendedBanner.tsx` closed loop
  (Prior Investigation §9 in the Panel Investigation it built on).
- User/business relationship confusion (e.g. a Staff member unsure
  which business they belong to, or an Owner with multiple shops via
  `businessIds[]` confused about which is "active") — no dedicated
  diagnostic surface found; Business Visibility's detail read is
  single-`businessId`, not relationship-aware across an Owner's full
  portfolio (Owner Portfolio, Module #17, is a *tenant-side* feature,
  `17-owner-portfolio.md`, not a SuperAdmin one).

**Payment / Subscription**
- Payment made, not reflected — the one scenario with a **complete**
  existing capability (Payment Operations Queue/Detail/confirm/reject).
- Payment confirmation problem generally — same.
- Trial/subscription question ("why did my trial end," "why can't I
  add an 11th shop") — Business Visibility's curated read already
  includes `subscriptions/{businessId}.status`, sufficient for
  *explaining* state.
- Subscription state appears incorrect — this is precisely the
  scenario `BDR-0011` investigated and answered **"Monitor first" —
  not implemented, not authorized**. Any Level 2 action here is
  directly blocked by a standing, dated decision, not merely unbuilt.
- Business suspended because of subscription/payment state — this is
  a *consequence* pathway (per `docs/specs/19-subscriptions.md`'s own
  trial-expiry/grace-period rules, unread in full detail here since
  it's out of this task's scope, but structurally: subscription state
  feeding into access restriction is a Module #19 concern, while the
  actual `suspended` flag on `businesses/{businessId}` used by
  SuperAdmin's Suspend/Reactivate is a **separate** boolean field —
  confirmed by reading `businessSuspension.ts` and `firestore.rules`'
  `isBusinessSuspended()`, which reads only that one field, not
  subscription state directly). This distinction matters: a business
  whose *subscription* has lapsed is gated by Module #19's own
  trial/feature-gating logic (`subscriptionAllowsNewRecords`, seen
  referenced in `firestore.rules`' batch-creation rule), which is a
  **different mechanism** from SuperAdmin's `suspended` flag — an
  Agent needs to know which one is actually blocking the customer
  before attempting to explain or resolve anything.

**Business Status**
- Business suspended, customer doesn't understand why — this is the
  Prior Investigation's own top-ranked gap: the `justification` text
  is written to the audit log at suspend time but not confirmed
  present in Business Visibility's curated read shape.
- Customer needs authorized reactivation — maps directly to the
  existing, built `reactivateBusiness()`.
- Customer believes business status is incorrect — same read (status)
  + reactivation (action) pairing as above; no new capability implied.

**Stock / Contagem**
- Cannot complete Contagem — this is deep tenant-operational state
  (`stockCounts`, drafts, etc.) — explicitly one of the collections Gap
  2 named as excluded from even the curated Business Visibility read
  ("None of these are needed to diagnose the realistic support
  scenarios... including them would reopen exactly the raw-tenant-read
  boundary Principle 2.8 forbids"). A genuine Contagem-completion
  problem is, per the existing architecture's own reasoning, **not**
  something SuperAdmin is designed to see into at all — it is squarely
  tenant self-service territory (the product's own extensive
  in-app correction/draft-recovery tooling, per `docs/specs/README.md`'s
  Modules #1–#17 status).
- Incorrect stock information entered — same: tenant-owned correction
  territory, not a SuperAdmin read/write target under current
  architecture.
- Product identity/matching problem — governed entirely by tenant-side
  specs (`product-identity-alternative-name-specification.md`,
  accepted; `BDR-0012`/`BDR-0013` unit-of-measure/product-memory
  decisions) — these are Owner-confirmation-driven flows by design
  (AI may suggest, Owner must confirm, per `BDR-0012` Decision 12),
  with no SuperAdmin role named anywhere in their governance.
- Stuck in a recovery scenario (expired Initial Stock recovery window,
  Business Worth recovery) — this is **exactly** what the two existing
  Recovery Authorization mechanisms exist for; a complete, already-
  built capability.
- Needs help understanding stock/Business Worth information generally
  — an explanation-only need; Business Visibility's curated read does
  not include stock/worth figures (deliberately excluded, per Gap 2),
  so today an Agent genuinely **cannot** see this to explain it,
  beyond what the customer describes to them verbally.

**Business Worth**
- "Business Worth is wrong" — same boundary as above: raw valuation
  data (`stockCounts`, `businessWorthSnapshots`) is explicitly outside
  Business Visibility's curated shape. `contagem-integrity-diagnostics-specification.md`
  (accepted, not implementation-authorized) is aimed at giving the
  *customer themselves* diagnostic signals for exactly this class of
  concern — meaning the product's own planned answer to this problem
  is tenant-side self-diagnosis, not SuperAdmin intervention.
- Doesn't understand the calculation — explanation-only; no data
  access implied, could plausibly be answered from product knowledge
  alone (General Product Assistance territory, below) rather than
  requiring any SuperAdmin read at all.
- Previous value missing/wrong — if this means a *historical,
  immutable* figure (Closings, the retired Initial Stock Count,
  `BusinessWorthSnapshot`s), Architecture Principle 2.10 (immutability)
  governs this territory hard — none of these records are ever
  corrected in place anywhere in the repository; the existing Recovery
  Authorization mechanisms are the *only* sanctioned "something is
  structurally wrong with an immutable record" escape hatches found,
  and they're narrowly scoped (accidental Initial Stock confirmation,
  specifically) — not a general "fix any wrong historical figure" tool.
- Recovery situation — same as Stock/Contagem's recovery item above.

**Product / Data**
- Duplicate product concern — governed by `product-identity-alternative-name-specification.md`'s
  existing/new resolution flow, Owner-confirmation-driven, no
  SuperAdmin role named.
- Existing/New product resolution problem — same.
- Unit relationship confusion — governed by `BDR-0012`/unit-of-measure
  specs, same pattern.
- Believes data was entered incorrectly — tenant self-correction
  territory (extensive existing in-app tooling).
- Unexpected system behavior — could be a genuine bug report; no
  SuperAdmin data-access implication either way, this is a support-
  ticket/engineering-escalation scenario, not a data scenario.

**Notifications / Communication**
- Did not receive an expected notification — Business Visibility's
  curated read does **not** include notification delivery data;
  §9.9 (Platform-side Notifications) has zero implementation (Prior
  Investigation, confirmed again here). An Agent cannot currently see
  *why* a notification didn't arrive for a specific customer at all.
- Wants to understand a notification — explanation-only, answerable
  from product knowledge if the Agent already knows what the
  notification says (no special access needed) — but if the customer
  is asking "what does this app-notification I received mean," the
  Agent has no way to *see* which notification the customer is
  referring to unless the customer describes/shows it.
- Needs assistance with communication/contact — this is precisely
  where §1's `Business.contact` and Module #20 findings apply: **no
  reliable, agent-usable channel exists** to reach this customer
  through the product itself.

**General Product Assistance**
- "I don't know how to use this" / "why is SABUSH showing this" —
  pure product-knowledge questions; answerable at Level 1 (or below —
  arguably doesn't require touching customer data at all, only
  general SABUSH knowledge) provided the Agent can correctly identify
  which business/context the question is about when specifics matter.
- "Something isn't working" — ambiguous by nature; correctly triaged
  only after the Agent gathers more detail — not a distinct
  data-access category on its own.
- "I need someone to help me" — this is the trigger for the whole
  model, not a distinct problem category.

---

## 3. Customer Problem Matrix

| # | Customer problem | What customer is actually asking for | Agent diagnosis needed | Level 1 Guided Support | Level 2 Assisted Resolution | Level 3 Support Session | Existing capability | Missing capability |
|---|---|---|---|---|---|---|---|---|
| 1 | Payment made, not reflected | Confirmation the payment was received and applied | Which `payments/{id}`, its current status | Explain current status | **Confirm/reject the payment** | Not needed | ✅ Complete (Payment Operations) | None |
| 2 | Trial/subscription confusion | Understand why access changed | `subscriptions/{businessId}.status`, trial dates | Explain state from Business Visibility's existing curated field | Not applicable — see Problem 3 | Not needed | ✅ Read via Business Visibility | None |
| 3 | Subscription state appears wrong | A correction | Same as above, plus evidence the state is genuinely wrong | Explain the state as observed | **Blocked by `BDR-0011`** — not authorized, "Monitor first" | Not authorized to bypass `BDR-0011` via a session either | ✅ Read only | Correction mechanism — explicitly not yet authorized, a standing decision, not a gap |
| 4 | Business suspended, doesn't understand why | An explanation | `suspended` flag + the `justification` text from suspend-time | Explain, **if `justification` is surfaced** (currently a gap, per Prior Investigation §16) | Not needed for explanation alone | Not needed | ✅ `suspended` flag read; ⚠️ `justification` not confirmed in curated shape | Surfacing `justification` in the curated read (small extension, per Prior Investigation) |
| 5 | Needs authorized reactivation | Business unlocked | Confirm the suspension reason is resolved | Explain current state | **Reactivate** (existing `reactivateBusiness()`) | Not needed | ✅ Complete | None |
| 6 | Believes business status is wrong | Verification | Same as #4/#5 | Explain actual state | Reactivate, if warranted | Not needed | ✅ Complete | None |
| 7 | Cannot complete Contagem | Help finishing a stock count | Deep tenant operational state (`stockCounts`, drafts) | **Cannot see this at all** — explicitly excluded from Business Visibility (Gap 2) | Not applicable — no bounded action exists for this | Would require raw collection access, which Gap 2 explicitly rejected as unneeded for "realistic support scenarios" | ❌ None | UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE whether this even should become an Agent capability, given Gap 2's own reasoning explicitly excluded it |
| 8 | Entered incorrect stock information | A correction | Same as #7 | Guide toward existing tenant-side correction tooling (Void & Redo, etc.) | Not applicable | Same caveat as #7 | ✅ Tenant self-service tooling already extensive | None identified as a SuperAdmin gap — this is arguably not a SuperAdmin problem at all |
| 9 | Product identity/matching confusion | Resolve a duplicate/mismatch | Tenant's own product-identity confirmation state | Guide toward the existing Owner-confirmation flow | Not applicable — governed by Owner-confirmation-only design (`BDR-0012` Decision 12) | Not applicable | ✅ Tenant-side flow exists (accepted specs) | None — this space is explicitly Owner-authority-only by design, not a SuperAdmin gap |
| 10 | Stuck in a recovery scenario (Initial Stock / Business Worth) | Their recovery window back | Which recovery mechanism applies, business state | Explain the situation | **Authorize the recovery** (existing mechanisms) | Not needed | ✅ Complete | None |
| 11 | "Business Worth is wrong" | Verification or correction | Raw stock/worth data — **not in curated read** | Cannot verify directly; can guide toward `contagem-integrity-diagnostics` (once implementation-authorized) or ask the customer to describe what they see | Not applicable — no bounded correction action exists for a "wrong" (not accidental-confirmation) worth figure | Raw access would be needed to actually verify — but this exact class of raw access was the thing Gap 2 evaluated and excluded | ❌ None beyond the narrow recovery mechanisms (#10) | UNRESOLVED — whether general Business Worth verification should ever become an Agent capability at all, versus remaining purely tenant self-diagnostic (per `contagem-integrity-diagnostics-specification.md`'s own stated purpose) |
| 12 | Doesn't understand the Business Worth calculation | An explanation | None — product knowledge only | Explain the calculation methodology | Not applicable | Not needed | ✅ (product knowledge, not a data-access capability at all) | None |
| 13 | Duplicate product concern | Merge/resolve | Tenant's own confirmation state | Guide toward existing Owner-confirmation flow | Not applicable (Owner-authority-only, `BDR-0012` Decision 12) | Not applicable | ✅ Tenant-side | None |
| 14 | Cannot log in — forgot password | Regain access | Which account, is it disabled | Explain, if diagnosable (e.g. account is disabled vs. a genuine forgotten password) | **Reset password** — does not exist for anyone today | Not applicable — a session wouldn't help; this needs a new *action*, not deeper *read* access | ❌ None | New capability — see Prior Investigation §14 "new capability" tier |
| 15 | Cannot log in — account disabled | Regain access | Is the account a suspended Staff member, or a suspended Business | Explain, using Business Visibility's staff-summary (name+suspended) or `suspended` flag | Reactivate the business (#5) or — **not currently possible** — un-suspend a specific staff member from SuperAdmin (that's an Owner-only action today, `/api/staff/reactivate`, `tenantOnly`) | Not needed | ✅ Partial — can diagnose, cannot always act | Reactivating a staff member is Owner-only by design; whether SuperAdmin should ever be able to do this on the Owner's behalf is UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE |
| 16 | Did not receive an expected notification | Confirmation it was sent, or why it wasn't | Delivery data — **§9.9 has zero implementation** | Cannot diagnose delivery at all today | Not applicable | Raw `notifications` read is explicitly excluded from what any curated view returns, and no per-notification-content read exists anywhere for a platform operator (`server/notificationPlatform.ts`'s own comments: a platform operator has no operational reason to read individual content) | ❌ None | §9.9 (Platform-side Notifications) — entirely unbuilt, a real gap for this specific scenario |
| 17 | Wants to understand a notification's meaning | An explanation | The notification's content, **as the customer describes it** — Agent has no independent way to look it up per-customer | Explain, based on what the customer relays | Not applicable | Not applicable | ✅ (product knowledge) | A way to look up a *specific* customer's *specific* notification would be new capability, not currently possible |
| 18 | Needs help contacting SABUSH / being contacted back | A reachable channel | N/A | Cannot do this today at all | Not applicable | Not applicable | ❌ None | Entire channel is missing — see §15 below |
| 19 | "I don't know how to use this" | Guidance | None, or minimal business context if the question is business-specific | Explain, using general product knowledge | Not applicable | Not needed | ✅ (product knowledge) | None |
| 20 | "Something isn't working" (vague) | Triage | Depends entirely on follow-up detail gathered | Ask clarifying questions, then route to the correct row above | Depends on what's found | Depends on what's found | N/A — a triage step, not its own capability | None — this is a process step, not a gap |

**Reading this matrix per the task's own instruction — minimum
necessary level, not defaulting to "Support Session":** of the 20
rows, **13 are fully resolvable at Level 1 or Level 2** with capability
that already exists (rows 1, 2, 4\*, 5, 6, 8, 9, 10, 12, 13, 15\*, 17,
19 — \* marks a small existing-capability extension, not new scope).
**Zero rows require Level 3** as currently evidenced — not one
identified scenario needs raw collection access or a session-based
credential; the scenarios that Business Visibility's curated shape
cannot answer (rows 7, 11, 16) are either explicitly excluded by Gap
2's own reasoning (stock/worth raw data) or blocked by an entirely
separate, unbuilt capability (notification delivery visibility, §9.9)
— neither is solved by a *session*, since a session would still be
subject to the same "should SuperAdmin see raw operational data"
question Gap 2 already answered once. **Two rows (14, 18) require
genuinely new capability that doesn't exist for anyone, agent or not**
— these are the real gaps, not authority questions.

---

## 4. Level 1 — Guided Support, In Detail

| Problem | Information Agent needs | Existing source | Already accessible? | Additional read capability needed? |
|---|---|---|---|---|
| Business/owner identification | name, category, owner email | Business Visibility detail read | ✅ Yes | Faster lookup would benefit from `businessCode` (not built) |
| Suspension status + reason | `suspended` boolean, `justification` text | `suspended` field: ✅; `justification`: ⚠️ written to audit log, not confirmed in the curated read shape | Partial | Add `justification` to the curated response, or a linked single-entry audit read |
| Subscription/trial status | `subscriptions/{businessId}.status`, trial dates | Business Visibility detail read | ✅ Yes | None |
| Recent payment history | Last N `payments` entries | Business Visibility detail read | ✅ Yes | None |
| Staff roster (name + suspended only) | Summary only | Business Visibility detail read | ✅ Yes | None (full staff detail deliberately excluded, Gap 2) |
| Recovery eligibility state | Whether an Initial Stock / Business Worth recovery window is open/expired | The two Recovery Authorization modules' own read paths (used internally by their `authorize` routes) | Partial — exists as internal logic, not confirmed exposed as a stand-alone read for Guided Support purposes | Possibly a small read-only surface, if Guided Support should be able to *tell* a customer "yes, you're eligible" before an authorization action is taken |
| Raw stock/business-worth figures | `stockCounts`, `businessWorthSnapshots` | Not in any curated read | ❌ No | Explicitly excluded by Gap 2's own reasoning — **not recommended** to add without revisiting that reasoning directly, not merely as a Level-1 convenience |
| Notification delivery status | Per-customer delivery data | Not in any curated read; §9.9 unbuilt | ❌ No | New capability (§9.9), unrelated to Level 1's existing shape |
| Relevant audit events for this business | `platform_audit_log` filtered by `businessId` | Audit Center (separate screen from Business Detail) | ✅ Yes, but as a **separate view**, not integrated into the Business Visibility read itself | Possibly worth linking, not a new read capability |

**What the Agent can tell the customer, bounded to the minimum
necessary:** business identity, current suspension state and (once the
gap above is closed) why; subscription/trial status; whether a
specific payment was received and its status; whether a recovery
window is open. **What the Agent should not be able to tell the
customer, because the data doesn't reach the Agent at all today:**
anything about specific stock quantities, specific Business Worth
figures, specific product records, or specific notification content —
all of this remains something only the customer (via their own app) or
a tenant-side self-diagnostic tool (`contagem-integrity-diagnostics`,
once authorized) can surface.

---

## 5. Level 2 — Assisted Resolution, In Detail

| Customer problem | Required action | Existing action? | Current authorized actor | Could Agent perform it? | Why/why not? | Audit requirement |
|---|---|---|---|---|---|---|
| Payment not reflected | Confirm/reject the payment | ✅ Yes | SuperAdmin (full) | **Yes** | The action is already exactly this bounded — one `payments/{id}` document, one of two outcomes, already audited | Already audited (`payment.confirmed`/`payment.rejected`) |
| Business wrongly suspended / resolved issue | Reactivate | ✅ Yes | SuperAdmin (full) | **Yes** | Already bounded — one boolean field, idempotent, already audited | Already audited (`business.reactivated`) |
| Business needs suspending (trust/safety) | Suspend | ✅ Yes | SuperAdmin (full) | UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE whether a Level-2 Agent action should ever *cause* account lockout, versus only *reverse* it | Suspension is a punitive/protective action, not a customer-requested fix in the ordinary support sense — Architecture §6.8 keeps it SuperAdmin-only with no stated exception | Already audited if performed |
| Stuck recovery window | Authorize recovery | ✅ Yes (two mechanisms) | SuperAdmin (full) | **Yes** | Already the exact bounded, authorize-only shape the task's own principle asks for ("minimum authority necessary") — the Agent authorizes, the Owner still executes | Already audited |
| Forgotten password | Reset password | ❌ Does not exist | Nobody | **New capability — not an authority question** | Cannot apply "could Agent perform it" to an action that doesn't exist for anyone; this is squarely `docs/engineering/SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md` §14's "new capability" tier | Would need a new, as-yet-undefined audit event type |
| Suspended staff member needs reactivating (customer is the Owner, locked out of their own staff tooling somehow) | Reactivate a specific staff member | ✅ Yes, but only as an **Owner-on-Staff** action (`/api/staff/reactivate`, `tenantOnly`) | The Business Owner, never SuperAdmin | UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE whether SuperAdmin should ever be able to perform an action currently modeled as exclusively Owner-to-Staff | This blurs a boundary Architecture keeps clean today (platform-operator actions vs. tenant-internal staff-management actions are structurally different route families, `tenantOnly` vs. `requireSuperAdmin`) | N/A — doesn't exist for SuperAdmin |
| Subscription state correction | Override plan/status | ❌ Not implemented | Nobody | **No — already decided against** | `BDR-0011` §14: "Monitor first," explicit, dated, evidence-conditioned. Extending this to Agent authority would directly contradict a standing decision, not fill a gap | N/A |

**Applying the task's stated principle — "the Agent receives only the
minimum authority necessary to resolve the specific customer
problem"** — every row marked "Yes" above is *already* exactly that
shape: one document, one field, one already-audited, already-bounded
action. **No row in this table proposes a generic power** (arbitrary
Firestore edit, arbitrary record modification, business-rule bypass,
authorization bypass, direct tenant-data manipulation, silent
impersonation) — none were found to be necessary for any evidenced
Level 2 scenario, and the two clear gaps (password reset, staff
reactivation-by-SuperAdmin) are each narrow, single-purpose actions,
not general capability.

---

## 6. Level 3 — Controlled Support Session: When Is It Actually Necessary?

Testing every scenario in §3 against the task's own three conditions
("Business Visibility is insufficient; a bounded operation is
insufficient; deeper customer-context access is genuinely necessary"):

| Problem | Why Level 1 insufficient | Why Level 2 insufficient | What deeper access is needed | Customer authorization? | Agent authority | Audit requirement |
|---|---|---|---|---|---|---|
| Cannot complete Contagem (#7) | Curated read excludes `stockCounts`/drafts entirely | No bounded action exists that would help without seeing the underlying state first | Raw, single-business read of `stockCounts`/draft collections | UNRESOLVED — not addressed by Architecture §9.7 as drafted (Support Session does not require customer consent, only Impersonation does, per the Prior Investigation §7 finding) | Read-only, per §9.7's own design | Session issuance/expiry (§9.7's own spec) |
| "Business Worth is wrong," genuine verification needed (#11) | Curated read excludes valuation data entirely | No bounded correction action exists (nor should one, for a "wrong," not "accidental," figure — Principle 2.10 immutability) | Raw, single-business read of `stockCounts`/`businessWorthSnapshots` | Same as above | Read-only | Same as above |

**These are the only two rows in the entire matrix where Level 1/2 are
genuinely insufficient by the task's own test** — and in both cases,
what's missing is specifically **read** access to collections Gap 2
already evaluated and explicitly excluded from the curated model, for
a stated reason ("None of these are needed to diagnose the realistic
support scenarios... [Gap 2's] investigation imagines"). This means
Level 3, if ever built for these two scenarios, would need to either:

(a) **directly revisit Gap 2's own reasoning** — arguing that these two
specific scenarios *are* realistic enough to justify the raw-read
exception Gap 2 declined to build, or

(b) remain unresolved in favor of the tenant-side answer already
planned for at least one of them (`contagem-integrity-diagnostics-specification.md`,
accepted but not implementation-authorized, aimed exactly at "customer
believes stock/worth information is wrong").

**No other scenario in the entire problem space (§2/§3) was found to
require Level 3** — not payment, not subscription, not suspension, not
recovery, not product identity, not general assistance. This is a
materially narrower Level 3 trigger set than "Support Session
whenever something is difficult," which the task explicitly warned
against defaulting to.

---

## 7. Support Session ≠ Impersonation

Re-applying the Prior Investigation's §7/§8 findings directly to the
two Level-3 candidates identified in §6:

Both of Contagem-completion-assistance and Business-Worth-verification
are, by their nature, **read-only diagnosis** — the customer needs the
Agent to *see* something and explain or confirm it, not to *act as*
them. Testing against the three sub-categories:

- **A. Read-only customer-context access** — this is exactly what both
  §6 scenarios need, and exactly what Architecture §9.7's Support
  Session (as originally specified) would provide, distinct from
  Impersonation by design ("grants no write access at all").
- **B. Action-on-behalf-of-customer** — not evidenced as needed for
  either §6 scenario. Neither requires the Agent to *do* anything to
  the business's data, only to see it and explain it (Contagem
  completion assistance might eventually imply guiding the *customer*
  through completing it themselves, live, rather than the Agent
  completing it for them — which is Level 1/coaching, not a data
  action at all).
- **C. Actual impersonation** — **not evidenced as necessary for any
  scenario found in this entire investigation.** Confirms the Prior
  Investigation's §8 conclusion directly: the default principle ("if
  the customer can be assisted without impersonation, impersonation
  should not be required") holds across the full problem space
  mapped here, not just the narrower set the Prior Investigation
  covered.

**Direct answer:** existing architecture (Support Session, §9.7)
already supports A without C, precisely because it was designed as a
structurally separate, write-incapable mechanism from Impersonation.
Nothing in this investigation's problem space requires B or C.

---

## 8. Agent Authority Model

### Agent CAN
*(Level 1, already built, no new authorization needed)*
- View a business's curated profile, owner identity, staff summary,
  subscription status, and recent payment history via the existing
  Business Visibility read — contingent on being granted reach to that
  route at all (currently `'superadmin'`-only; extending to `'support'`
  is itself a decision item, §17 below, not assumed here).
- Confirm or reject a specific pending payment (Level 2, already built).
- Reactivate a suspended business once the issue is resolved (Level 2,
  already built).
- Authorize an Initial Stock or Business Worth recovery for an
  eligible business (Level 2, already built).

### Agent CAN WITH EXPLICIT AUTHORIZATION
*(genuinely new capability, or a direct revisit of a prior deferral —
requires its own governance gate before anything is built)*
- Suspend a business (currently SuperAdmin-full-only; whether a
  support-tier Agent should ever *cause* suspension, versus only
  *reverse* it, is unresolved and should default to "no" absent a
  specific justification).
- Reset a tenant Admin's password — entirely new capability, needs its
  own identity-verification standard defined before any implementation
  (nothing in the repository establishes one today).
- Open a read-only Controlled Support Session for the two narrow
  scenarios identified in §6 (Contagem-completion diagnosis,
  Business-Worth verification) — this requires directly revisiting Gap
  2's prior reasoning, not silently reopening it.
- Reactivate a specific suspended staff member on an Owner's behalf —
  currently modeled as Owner-only; extending this to SuperAdmin blurs
  an existing clean route-family boundary and needs explicit
  justification.

### Agent CANNOT
*(explicitly out of scope, per this investigation's own findings)*
- Edit any raw operational tenant collection (`products`, `batches`,
  `expenses`, `withdrawals`, `stockCounts`, `timelineEvents`) directly
  — Gap 2's own excluded list, reaffirmed here as still correct for
  every scenario found.
- Correct a "wrong" Business Worth or Contagem figure directly —
  immutability (Principle 2.10) and the narrow, purpose-built Recovery
  Authorization mechanisms are the only sanctioned exceptions found;
  no general correction capability is evidenced as needed anywhere in
  §2/§3.
- Override subscription/billing state — directly blocked by `BDR-0011`.
- Impersonate a customer as a default or fallback tool — not evidenced
  as necessary for any scenario found (§7).
- Bypass any existing business rule or authorization check — no
  scenario in §2/§3 was found to require this; every resolvable
  scenario resolves through an already-existing, already-bounded
  mechanism.

### SUPERADMIN-ONLY
*(should remain with the highest privilege tier even under the Hybrid
model, per Architecture §6.8's existing, unchanged permission matrix)*
- Suspend a business (as opposed to reactivating one).
- Grant/revoke platform operator access (Internal Account Management).
- Subscription/billing overrides (currently unauthorized entirely, per
  `BDR-0011`).
- Feature flag changes (unrelated to customer assistance; §9.5,
  unbuilt).
- Any eventual Impersonation capability, if ever built at all — no
  evidenced need found here, but if a future scenario justified it,
  Architecture §9.10 itself already names it as available to
  Support/Developer/SuperAdmin alike, not SuperAdmin-exclusive; this
  investigation does not find grounds to narrow that further, only
  grounds to not build it at all yet.

---

## 9. Support Escalation Model

Testing the proposed four-stage ladder against existing architecture:

- **Stage 1 (Guide) → Stage 2 (Bounded action) → Stage 3 (Support
  Session) → Stage 4 (Escalate to higher privilege)** — Stages 1–3 map
  directly onto the Hybrid model's own three levels, already evaluated
  above. **Stage 4 is where the repository is silent.**

`UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE`: there is no
concept anywhere in Architecture, the Specs, or the code of an
"escalate beyond SuperAdmin-full" pathway. SuperAdmin (Full) is
explicitly "the top of the platform-operator hierarchy" (Architecture
§6.7) — the architecture has no fourth platform-operator tier, and
nothing resembling a "Product Architect" or "technical team" role
exists in `platformRole`'s three-value domain (`support`, `developer`,
`superadmin`). If Stage 4 is needed, it is **organizational
(a human process — "SuperAdmin escalates to an engineer via whatever
channel Sabush uses internally today"), not an architectural role or
capability** — nothing in this codebase should be read as already
providing it. Per the task's own instruction, **no new role is created
here** to fill this gap; it is named as unresolved, not invented.

**Where existing architecture does support this ladder:** the
Support/Developer/SuperAdmin hierarchy itself (§6.8: "Support ⊂
Developer ⊂ SuperAdmin, in permission terms") already gives a natural,
pre-existing shape for "if Support can't solve it, a Developer or
SuperAdmin — who structurally has everything Support has, plus more —
picks it up." This is an *escalation-shaped* hierarchy already, even
though `'support'`/`'developer'` are currently functionally inert
everywhere (Prior Investigation §12) — the *shape* to escalate through
already exists; the *functional capability* at each tier to receive an
escalation does not yet.

---

## 10. Ten Example Support Conversations

Each example is checked against the matrix in §3 for consistency — no
example proposes a resolution path not already justified above.

### Example 1 — Payment

**Customer:**
> "I paid for my subscription three days ago but the app still says I'm on a trial. What's going on?"

**Agent investigates:**
- Opens Payment Operations Queue, searches for this business's pending
  payments (or, if `businessCode` existed, looks the business up
  directly first — today, by name/businessId).

**Level 1:**
- Finds the specific `payments/{id}`, sees status `pending`, submitted
  3 days ago, method and reference number visible.

**Can Level 1 solve it?**
- No — explaining status alone doesn't resolve a genuinely-received
  payment still sitting unconfirmed.

**If No — Level 2:**
- Verifies the payment reference against whatever the actual bank/
  mobile-money confirmation shows (outside this repository's scope —
  a human verification step), then calls `confirmPayment()`.

**Can Level 2 solve it?**
- Yes.

**Final resolution:**
- Subscription activates; customer's app reflects the change on its
  own realtime listener (per `SubscriptionContactModal.tsx`'s own
  documented auto-close-on-transition behavior).

**Audit required:**
- Already automatic — `payment.confirmed`, actor/timestamp
  server-derived.

---

### Example 2 — Subscription

**Customer:**
> "My trial ended and now I can't add a new shop. Is that right?"

**Agent investigates:**
- Opens Business Visibility, reads `subscriptions/{businessId}.status`.

**Level 1:**
- Confirms trial has indeed ended, explains that shop creation is
  gated by subscription state per the product's own trial/feature-
  gating design.

**Can Level 1 solve it?**
- Yes — this is a correct-behavior explanation, not a bug.

**Final resolution:**
- Customer understands the state is expected; if they want to
  subscribe, that's Example 1's flow.

**Audit required:**
- The Business Visibility read itself is already audited
  (`business.viewed`, with justification).

---

### Example 3 — Suspension

**Customer:**
> "I can't log in — it says my business is suspended. I don't know why."

**Agent investigates:**
- Opens Business Visibility, confirms `suspended === true`.

**Level 1:**
- **Gap, per §4/§5:** the Agent can confirm suspension is real, but
  cannot currently see the `justification` text in the curated read —
  they'd need to separately check the Audit Trail, filtered by this
  `businessId`, to find the `business.suspended` entry and its reason.

**Can Level 1 solve it?**
- Partially — can confirm the fact, may need an extra step (Audit
  Trail cross-reference) to explain the *why*, which is the exact gap
  §16 of the Prior Investigation ranked as the highest-value, lowest-
  risk fix.

**If explanation reveals the reason no longer applies — Level 2:**
- Reactivate.

**Can Level 2 solve it?**
- Yes, once the Agent has established the reason and confirmed it's
  resolved.

**Final resolution:**
- Business reactivated; customer regains access immediately (per
  `isBusinessSuspended()`'s Security-Rules-layer enforcement — no
  token refresh wait).

**Audit required:**
- Already automatic (`business.reactivated`).

---

### Example 4 — Stock/Contagem

**Customer:**
> "I've been trying to finish my monthly stock count for two days and it keeps getting stuck. Can you just finish it for me?"

**Agent investigates:**
- Recognizes this as a raw-tenant-data scenario — Business Visibility
  cannot see `stockCounts` or drafts at all (Gap 2's explicit
  exclusion).

**Level 1:**
- Cannot diagnose the specific stuck state directly. Can only ask the
  customer to describe what they're seeing, and offer general guidance
  from product knowledge (e.g. known draft-recovery behavior, if the
  customer's description matches a known pattern documented in the
  tenant app's own extensive Contagem specs).

**Can Level 1 solve it?**
- Maybe, if it's a known, describable UX issue the Agent recognizes
  from product knowledge; not if it requires actually seeing the
  customer's specific draft state.

**If No — Level 2:**
- **No bounded action exists.** "Finish it for me" is explicitly the
  kind of action Architecture keeps Owner-exclusive (Contagem
  completion is not a platform-operator action anywhere in this
  repository).

**If No — Level 3:**
- This is exactly one of the two scenarios §6 identifies as
  potentially needing Level 3 — a read-only Support Session into
  `stockCounts`/drafts, *if* that gap is ever authorized. **As things
  stand today, Level 3 is not built, so the honest answer is: this
  specific request cannot currently be fulfilled by any Agent
  capability.**

**Final resolution (as things stand today):**
- Guide the customer through the existing tenant-side flow as best as
  possible; if genuinely stuck, this becomes an engineering escalation
  (Stage 4, §9) rather than an Agent-resolvable ticket.

**Audit required:**
- If a future Level 3 session is ever used here: session issuance/
  expiry, per §9.7's own specified shape (not yet built).

---

### Example 5 — Product/Data

**Customer:**
> "I think I created the same product twice by accident. Can you merge them?"

**Agent investigates:**
- Recognizes this maps to the existing Product Identity / duplicate-
  resolution governance (`product-identity-alternative-name-specification.md`).

**Level 1:**
- Explains that product merging/identity resolution is an Owner-
  confirmation-driven flow inside their own app, not something
  SuperAdmin does on their behalf (per `BDR-0012` Decision 12: never
  established without explicit owner confirmation).

**Can Level 1 solve it?**
- Yes, as guidance — the actual merge/resolution still happens in the
  customer's own app, by the customer.

**Final resolution:**
- Customer is guided to the existing in-app flow; no SuperAdmin action
  taken at all.

**Audit required:**
- None — no SuperAdmin action occurred.

---

### Example 6 — Business Worth

**Customer:**
> "My Business Worth dropped by a huge amount overnight and I don't understand why. Can you check my numbers?"

**Agent investigates:**
- Recognizes raw valuation data is outside the curated read.

**Level 1:**
- Can explain the *calculation methodology* generally (product
  knowledge), but cannot see this customer's specific figures to
  verify anything.

**Can Level 1 solve it?**
- Only if the explanation alone satisfies the customer (e.g. "a large
  Quebra/breakage or Withdrawal recorded recently would explain a
  drop like that — did you record one?").

**If No — Level 2:**
- No bounded correction action exists for a "seems wrong" figure (as
  opposed to the narrow, accidental-confirmation Recovery Authorization
  mechanisms, which don't fit this description).

**If No — Level 3:**
- The second of §6's two identified Level-3 candidates — genuinely
  unresolved today, same caveat as Example 4.

**Final resolution (as things stand today):**
- Guide toward self-diagnosis (once `contagem-integrity-diagnostics`
  is implementation-authorized, that becomes the tenant's own answer
  to exactly this); otherwise, engineering escalation if the customer
  insists something is structurally broken.

**Audit required:**
- Same caveat as Example 4 if a future session is used.

---

### Example 7 — Recovery

**Customer:**
> "I confirmed my Initial Stock Count by accident before I'd actually finished entering everything. Can you undo it?"

**Agent investigates:**
- Opens Business Visibility to confirm the business and its state;
  checks recovery eligibility (internally, via the existing recovery
  module's own logic).

**Level 1:**
- Confirms the business and explains the recovery window concept.

**Can Level 1 solve it?**
- No — explanation alone doesn't restore the window.

**If No — Level 2:**
- Authorizes the recovery via the existing, purpose-built mechanism.

**Can Level 2 solve it?**
- Yes.

**Final resolution:**
- Recovery authorized; customer completes the actual correction
  themselves via the tenant app's Void & Redo flow (the SuperAdmin
  only authorizes, per the mechanism's own designed split).

**Audit required:**
- Already automatic (the recovery-authorization action type).

---

### Example 8 — General Troubleshooting

**Customer:**
> "The app just shows a blank screen when I try to open Reports. Is SABUSH down?"

**Agent investigates:**
- No business-specific data access needed yet — this is a
  possible-bug triage.

**Level 1:**
- Asks clarifying questions (device, browser, when it started); checks
  whether this is a known, wider issue if any System Health visibility
  existed (§9.11 — **does not exist today**, so the Agent has no
  platform-wide "is something down" signal to check either).

**Can Level 1 solve it?**
- Only if it turns out to be a known, explainable issue from product
  knowledge alone; otherwise this is exactly the triage-then-escalate
  pattern named in §2's "General Product Assistance" category.

**Final resolution:**
- Likely Stage 4 escalation (§9) to engineering, since no System
  Health visibility exists to confirm or rule out a platform-wide
  issue.

**Audit required:**
- None inherent to this conversation; would depend on whatever
  engineering's own incident process is (outside this repository's
  scope).

---

### Example 9 — Account/Access

**Customer:**
> "I forgot my password and there's no 'forgot password' link anywhere. How do I get back in?"

**Agent investigates:**
- Confirms this is a real, current product gap (§1) — not something to
  misdiagnose as user error.

**Level 1:**
- Can confirm the account exists (via Business Visibility's owner-
  identity field, if the Agent can find the right business) but cannot
  reset anything.

**Can Level 1 solve it?**
- No.

**If No — Level 2:**
- **No action exists.** This is the clearest example in this entire
  document of a genuinely new capability, not an authority extension.

**Final resolution (as things stand today):**
- Cannot be resolved by any Agent capability that exists. Would need
  to be escalated (Stage 4) for a manual, out-of-band intervention
  (e.g. the same kind of Firebase-Console/Admin-SDK path this session
  itself used to bootstrap the first SuperAdmin account) until a real
  password-reset capability is built and governed.

**Audit required:**
- If a manual out-of-band intervention is used today, it would fall
  outside `platform_audit_log` entirely (any such action bypasses the
  privileged server's routes) — worth naming as a real, current audit
  gap for this specific scenario, not something this document invents
  a fix for.

---

### Example 10 — Communication/Notification

**Customer (via some external channel — phone, in person, etc., since
no in-product channel reaches them):**
> "I never got the reminder about my closing period being due. Can someone check why?"

**Agent investigates:**
- Recognizes §9.9 (Platform-side Notifications) has zero
  implementation.

**Level 1:**
- Cannot see this customer's specific notification/delivery history at
  all.

**Can Level 1 solve it?**
- No.

**If No — Level 2:**
- No action exists to "resend" or diagnose a specific delivery.

**If No — Level 3:**
- Not evidenced as a Level 3 (session-based read) scenario in §6 — the
  gap here is a missing *feature* (§9.9), not missing *authority*
  within an existing capability.

**Final resolution (as things stand today):**
- The Agent can only explain, generally, that closing reminders exist
  as a feature, and perhaps confirm (via Business Visibility, if
  relevant fields existed there, which they don't today) whatever
  general subscription/account state might explain a delivery gap.
  Otherwise: engineering escalation.

**Audit required:**
- None exists for this today, since no capability exists to act.

---

## 11. Customer Experience

Described conceptually, without inventing UI, per the task's own
instruction. The customer's experience, mapped onto what actually
resolves in this investigation's findings:

> "I have a problem → I contact SABUSH [via some means outside this
> repository's current scope, §15 — none exists in-product today] → an
> agent identifies my business [today: by name or the raw
> `businessId`; ideally, per the Prior Investigation, by `businessCode`
> once built] → understands the problem [via what the Agent can
> actually see, per §4's boundary — often enough, per §3's matrix, but
> not always] → either resolves it [if it's one of the majority of
> scenarios §3 shows are already fully served] or has to say 'I can't
> see enough to fix this myself, let me get someone who can'
> [genuinely, for the small number of scenarios §6/§9 identify]."

**What information the customer should receive, per what's already
evidenced as correct in this architecture:** for anything that results
in an actual state change (payment confirmed, business reactivated,
recovery authorized), the existing tenant-side realtime listeners
already close the loop automatically (confirmed for subscription state
via `SubscriptionContactModal.tsx`'s own documented behavior; for
suspension via `BusinessSuspendedBanner.tsx`). For anything that
results only in an explanation (no state change), there is currently
**no product-side record of "an agent explained X to this customer on
date Y"** — that would live only in whatever the Agent's own audited
`business.viewed` read establishes (the *fact* they looked, not the
*content* of what they said), unless a future communication mechanism
(§15) is built to actually log outbound explanations.

---

## 12. Agent Experience — Workflow Steps Checked Against What Exists

| Step | Already supported? | Evidence |
|---|---|---|
| 1. Receive customer request | ❌ No in-product channel (§15) — happens entirely outside this repository today | Confirmed, no support-intake mechanism found anywhere |
| 2. Identify customer/business | ⚠️ Partial — Business Search exists (name/businessId), but the intended fast path (`businessCode`) doesn't exist | Prior Investigation §3, this document §1 |
| 3. Verify correct business context | ✅ Yes — Business Visibility's `justification`-required, single-`businessId`-scoped read structurally forces this per call | Gap 2's own design |
| 4. Diagnose | ⚠️ Partial — sufficient for the majority of §3's matrix, insufficient for the raw-data scenarios (#7, #11) | §3, §6 |
| 5. Determine minimum assistance level | This document's entire §3/§6 exercise — a decision aid, not a built system feature | N/A — a human judgment step, informed by (not automated by) this investigation |
| 6. Guide OR perform bounded action OR initiate Support Session | ✅ Guide/bounded action: yes, per §4/§5. Support Session: ❌ not built | §6 |
| 7. Resolve/escalate | ✅ for the majority; Stage 4 escalation itself is organizational, not architectural (§9) | §9 |
| 8. Record/audit relevant actions | ✅ automatic for every existing action (§10 examples); ❌ no mechanism for recording an explanation-only interaction's content | §14, §11 |
| 9. Close assistance | No explicit "close the ticket" concept found anywhere in this repository — support-ticket lifecycle itself appears to live entirely outside this codebase | `UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE` |

---

## 13. Security / Tenant Isolation, Per Level

**Level 1 — what prevents the Agent from viewing the wrong business?**
Every Business Visibility call is scoped by an explicit `businessId`
route parameter, re-verified server-side per call, with no session
state to carry a "currently selected business" across calls
incorrectly — this is, per §6's own analysis, actually a *safer* shape
against this specific risk than a session-based credential would be,
since there's no standing state that could be misapplied.

**Level 2 — what prevents the Agent from performing an action on the
wrong business?** Identical mechanism — `confirmPayment`,
`reactivateBusiness`, and both recovery-authorization routes all take
`businessId` as an explicit parameter, re-verified against real
Firestore state before acting (e.g., `reactivateBusiness` checks the
business actually exists and is actually suspended before writing).

**Level 3 — what prevents a Support Session from exposing another
tenant?** Per Architecture §9.7's own design (never built): "a
short-lived, read-only, **single-`businessId`-scoped** credential" —
the scoping is built into the credential's own shape, not left to
client-side discipline. This is architecturally sound *as specified*;
the actual risk named in the Prior Investigation (§11 there) is not
about cross-tenant leakage from the credential's own scope, but about
whether client code correctly re-requests a fresh, correctly-scoped
credential when the Agent moves to a different business, rather than
reusing a stale one — a risk that exists only if Support Session is
ever actually built, and would need explicit attention in its
Rule 8 Assessment.

**All levels — what prevents privilege escalation?** The same
`requireAuth → requirePlatformOperator → [role check]` chain, already
proven correct across all 15 existing routes (Prior Investigation §2,
§12) — re-verified here as unchanged by anything this investigation
proposes. No scenario in §3/§6 was found to require a new
authorization *shape* — every existing or proposed action fits the
same pattern.

---

## 14. Audit Model, Per Level

**Level 1 — access audit.** Already built and correct: one
`business.viewed` entry per curated read, with the caller's
`justification`, `actorUid`, `actorRole`, and server timestamp. If
Level 1 access is ever widened to `'support'`/`'developer'` tiers,
this exact same event shape already accommodates that — no new event
definition needed, per the task's own instruction not to invent one
here.

**Level 2 — action audit.** Already built and correct for every
existing action (`payment.confirmed`/`rejected`,
`business.suspended`/`reactivated`, the two recovery-authorization
event types). **Existing governance gap, not new to this document:**
the recovery-authorization action types aren't yet in
`auditLogQuery.ts`'s own filter allowlist (Prior Investigation §18/§21
— a known, small technical defect, unrelated to the Agent question
specifically, but relevant if any *new* Level 2 action (e.g. password
reset) is ever added — it should be added to that allowlist from day
one, not repeat the same staleness).

**Level 3 — session audit.** Fully specified (§9.7: issuance and
expiry both logged, "expiry is logged even though nothing 'happens'")
but **not built**, since Support Session itself is not built. If it
is ever built, the specified shape already anticipates this correctly
— no new definition needed here either.

**Separating the three requested categories:**
- **Session audit** — specified (§9.7), not implemented.
- **Action audit** — implemented, correct, one small known staleness
  issue (filter allowlist) unrelated to this document's scope.
- **Communication audit** — **does not exist**, because no
  communication mechanism exists (§15) — this is the one category
  with a genuine governance gap: no existing convention to reuse, since
  there is nothing to audit yet.

---

## 15. Communication With the Customer

Directly re-checked against Module #20 and `BDR-0004`, per this task's
explicit instruction not to treat `Business.contact` as a usable
recipient merely because the field exists.

| Channel | Existing capability | Agent communication possible? | Identity source | Missing governance/capability |
|---|---|---|---|---|
| In-App (Module #20 Notifications) | ✅ Implemented, Phases 1–3 | **No** — every existing producer is system-triggered/templated (trial expiry, closing reminder, breakage alert); there is no operator-composed message *kind* defined anywhere in the notification producer pattern (`server/notificationPlatform.ts`) | `userId` on `users/{uid}` | Whether an ad hoc, Agent-composed in-app message is even a supported notification *category* is undecided — Module #20 Phase 4 ("Tenant User Experience") is itself "not yet authorized" per `docs/specs/README.md` |
| Email | ❌ Not implemented | No | N/A | Explicitly deferred (`20-notifications.md` Decision Gate 3) |
| WhatsApp | ❌ Not implemented (interface-only placeholder) | No | N/A — and explicitly, per this task's instruction, `Business.contact`'s free-text field is **not** a valid identity source for this even if WhatsApp delivery existed, since it has no format guarantee, no channel-type tag, and no established consent-for-contact-purpose | N/A | Deferred, same Decision Gate |
| Lifecycle communication (trial/subscription reminders) | ✅ Implemented as system-triggered notifications | Not an Agent capability at all — this is an automated producer, unrelated to live Agent-to-customer contact | System-derived | N/A — out of scope for "Agent communication" specifically |
| Marketing communication | Not found anywhere in this repository as a distinct concept | N/A | N/A | Out of scope entirely — no evidence this exists as a capability at all |
| A dedicated support/contact channel of any kind | ❌ Not implemented — `BDR-0004`'s own Scope Exclusions explicitly name "Help Centre implementation," "Documentation system," and "Customer portal" as **not decided by that record** | No | N/A | Genuinely new governance needed — no existing artifact to extend |

**Direct answer:** an Agent cannot currently communicate with a
customer through any in-product mechanism, for any of the three
levels. This is not specific to Level 3 or to any one scenario — it is
a platform-wide gap that affects the *outcome delivery* half of every
single Level 1 (explanation) interaction in §3's matrix, even where
the *diagnosis* half works perfectly.

---

## 16. Minimum Viable SuperAdmin Agent

Derived directly from §3's matrix — not a new feature list, the
smallest set that would make real difference against the evidenced
problem space.

### Must Have
- Reach to the existing Business Visibility curated read, for whichever
  operator tier the Product Architect decides should have it (today:
  `'superadmin'` only; the architecture's own original intent was
  `'support'`/`'developer'` too — a decision item, not assumed here).
- The already-built Payment confirm/reject, Business reactivate, and
  the two Recovery Authorization actions, available to that same tier
  — these four actions alone resolve the clear majority of §3's
  matrix (rows 1, 5, 6, 10, and by extension 2/4/12/13/17/19 via
  explanation-only Level 1).
- Surfacing the suspension `justification` text in that same curated
  read (§4's identified gap) — without this, the single most common
  "why is my account locked" scenario (#4) stays only partially
  answerable.

### Should Have
- A `businessCode` field, per Architecture's own original intent
  (§9.3/§7.4) — meaningfully speeds up scenario #2 in this document's
  own workflow (§12), not required for correctness, but named
  throughout Architecture as the intended fast path.
- A defined identity-verification standard for a future password-reset
  capability (§8's "CAN WITH EXPLICIT AUTHORIZATION" item) — even
  before building the capability itself, having this standard defined
  removes a real blocker for later work.

### Later
- A genuinely new password-reset capability itself (#9/#14's clearest
  gap) — high customer value, but the newest, least-precedented item
  found, appropriately sequenced after the lower-risk items above (this
  mirrors the Prior Investigation's own §16 ranking exactly).
- Any Level 3 (Support Session) capability at all — evidenced as
  needed for only two narrow scenarios (#7, #11), both of which also
  have a lower-risk, already-planned tenant-side alternative
  (`contagem-integrity-diagnostics`) that may resolve at least one of
  them without ever needing SuperAdmin-side raw access.
- A System Health (§9.11) view — would help Example 8's triage
  scenario, but no evidence found that this is urgent relative to the
  Must Have items.

### Explicitly Out of Scope
*(for this first Agent capability specifically — not a permanent
prohibition, simply not evidenced as needed now)*
- Any customer-communication channel build-out (§15) — real gap, but
  larger scope than "Agent capability" alone; affects the whole
  platform's customer-contact story, not just Agent assistance.
- Business suspension as a Level 2 Agent action (as opposed to
  reactivation) — no evidenced customer-assistance need for an Agent
  to *cause* suspension.
- Subscription/billing override — directly blocked by `BDR-0011`.
- Impersonation — no evidenced need anywhere in this investigation
  (§7).
- Support/Developer reactivating a staff member on an Owner's behalf —
  blurs an existing clean boundary, no urgent evidenced need in §3's
  matrix beyond one edge-case row (#15).

---

## 17. Governance Classification

| Capability | Classification | Existing artifact | Governance needed |
|---|---|---|---|
| Business Visibility read, widened to `'support'`/`'developer'` | **B** — existing architecture, not authorized for those tiers | `18-superadmin-v1-architecture-gap-resolutions.md` Gap 2, Architecture §6.5/§6.8 | Product Architect decision, then Rule 8/Authorization for the route-level tier-widening |
| Business Visibility read, `'superadmin'`-only, used by an Agent under that tier | **A** — existing authorized capability | `18-superadmin-v1-operational-control-plane-slice.md`, ADR-0006 | None — reusable as-is |
| Payment confirm/reject, Business reactivate, Recovery Authorizations, used by an Agent under `'superadmin'` | **A** | `18-19-payment-operations-slice.md`, ADR-0005; ADR-0006; `BDR-0016`/`POL-0009` | None — reusable as-is |
| Surfacing `justification` in the curated Business Visibility read | **C** — extension of an existing, already-authorized read shape (adding one field to an existing response) | `18-superadmin-v1-architecture-gap-resolutions.md` Gap 2's own response-shape definition | Small — likely does not need a full new BDR; a Rule 8-adjacent scoped decision, per the Prior Investigation's own §14 classification of this exact item |
| `businessCode` implementation | **D** — new capability (the *decision* to have it exists at the architecture level, §7.4/§9.3, but no implementation or Rule 8 exists) | Architecture §7.4/§9.3 (decision only) | Full new implementation governance, even though the concept is pre-approved |
| Support Session (§9.7), for either of the two Level-3 scenarios identified (§6) | **E** — Product Architect decision required before anything else, since it directly revisits Gap 2's own prior explicit decision | Architecture §9.7/§6.5 (full spec); Gap 2 (the prior deferral) | Must not proceed to BDR/Spec/Rule 8 until the Gap 2 revisit itself is explicitly decided |
| Password-reset capability | **D** — entirely new capability, no existing artifact | None found | Full new BDR/Policy/Specification/Rule 8/Authorization chain, including a new identity-verification standard this repository does not currently define anywhere |
| Any customer-communication mechanism (in-app agent-composed message, email, WhatsApp) | **D**, and arguably larger than "Agent" scope alone | `20-notifications.md` (defers these channels), `BDR-0004` (explicitly excludes Help Centre/portal from its own scope) | Full new governance, likely at the Module #20 or platform-wide level, not scoped to SuperAdmin Agent alone |
| Business suspension as an Agent-available action | **E** — Product Architect decision required (no evidenced need found, but also not architecturally forbidden the way `BDR-0011`'s subscription-override is) | Architecture §6.8 permission matrix (currently SuperAdmin-full-only, no stated Agent exception) | Decision first, before any spec work |
| Subscription/billing override for Agent use | **E**, effectively **already answered "no"** | `BDR-0011` | None — do not reopen absent `BDR-0011` §14's own stated revisit triggers |
| Impersonation for Agent use | **B**, but with a strong prior deferral (Gap 2) working against it | Architecture §9.10; Gap 2 | Product Architect decision required to even reopen, and no evidenced need found to justify reopening it |
| Reactivating a specific staff member from SuperAdmin | **E** — genuinely undecided, blurs an existing route-family boundary | `/api/staff/reactivate` (Owner-only today) | Decision first — this is a narrower version of Option B/C in §14, not urgent per §3's matrix (one edge-case row) |

---

# SUPERADMIN AGENT — PRODUCT ARCHITECT DECISION INPUT

**1. What exactly is a SuperAdmin Agent?**
On the evidence gathered across both this and the Prior Investigation,
a **human Support-tier (or, today in practice, SuperAdmin-tier, since
`'support'` is currently functionally inert) platform operator**
assisting a customer through a small, already-mostly-built set of
bounded, audited SuperAdmin capabilities — operating under the
three-level Hybrid model, with Level 3 needed for only two narrow,
currently-unbuilt scenarios out of the twenty mapped in §3.

**2. Is it a human Support-tier operator using SuperAdmin?**
Yes, on current evidence — no AI-agent architecture exists anywhere in
this repository to support any other interpretation (re-confirmed,
Prior Investigation §13).

**3. What are the three assistance levels?**
As given by Product Architect direction: Level 1 Guided Support
(read-only, existing Business Visibility model), Level 2 Assisted
Resolution (bounded, already-audited actions), Level 3 Controlled
Support Session (deeper, currently-unbuilt access for the narrow
remainder).

**4. What problems can Level 1 solve?**
The majority of §3's matrix by count — every purely explanatory
scenario (subscription/trial status, business status, general product
questions) where the answer is contained in the existing curated read
or in product knowledge alone.

**5. What problems require Level 2?**
Payment confirmation, business reactivation, and the two recovery
authorizations — all four already exist, already bounded, already
audited.

**6. What problems genuinely require Level 3?**
Exactly two, evidenced in §6: assisting a customer stuck completing
Contagem, and verifying a specifically-disputed Business Worth figure
— both because they require raw operational data Gap 2 already
evaluated and excluded from the curated model, not because any other
scenario in the twenty-row matrix needed it.

**7. What existing capabilities can be reused?**
Business Visibility's curated read; Payment confirm/reject; Business
reactivate; both Recovery Authorization mechanisms; the existing
`requireAuth → requirePlatformOperator → [role]` authorization chain;
the existing `platform_audit_log` event shape.

**8. What new capabilities are required?**
A tenant Admin password-reset mechanism (the clearest, most concrete
gap found across both investigations); any form of customer
communication channel; `businessCode`, if the original architecture's
intent is to be completed; and, only if the Gap 2 revisit (item 16,
below) is decided in favor of building it, Support Session itself.

**9. What should remain SuperAdmin-only?**
Business suspension (as opposed to reactivation); operator
provisioning/revocation; subscription/billing overrides (already
decided against, `BDR-0011`); and, absent a specific evidenced need,
Impersonation, even though Architecture §9.10 itself names it as
available to all three tiers.

**10. Is Support Session actually necessary for the identified
problems?**
For 18 of the 20 mapped scenarios, no. For the remaining two, yes —
but both also have a lower-risk alternative already in motion
(tenant-side self-diagnostic tooling for at least the Business Worth
case) that may reduce or eliminate the need before Support Session is
ever built.

**11. Is impersonation necessary for any identified problem?**
No — zero scenarios across the full problem space evidenced a genuine
need for write-capable, act-as-the-customer access.

**12. What minimum Agent capability should be built first?**
Per §16: reach to the existing Business Visibility + four existing
Level 2 actions, for whichever operator tier is decided (item 17,
below), plus the small `justification`-surfacing fix — this alone
resolves the clear majority of the evidenced problem space with the
least new governance weight.

**13. What customer authorization is required?**
For Level 1/Level 2, as currently built: none beyond the Agent's own
`justification` requirement (the *Agent's* stated reason, not the
customer's consent) — consistent with Gap 2's own explicit design,
which deliberately does not require customer consent for a read-only
diagnostic action the way Impersonation would. For any future Level 3,
Architecture §9.7 as originally specified likewise does not require
customer consent (only Impersonation, §9.10, does) — `UNRESOLVED —
NOT DEFINED BY CURRENT ARCHITECTURE` whether that should change if
Level 3 is ever actually built, since it was never actually
implemented to test.

**14. What must always be audited?**
Every read (already true, `business.viewed`); every action (already
true for all four existing Level 2 actions); any future
communication sent to a customer (no existing event type — would need
one defined at build time, following the same server-generated-only
convention already proven).

**15. What tenant-isolation requirements apply?**
The same per-call, `businessId`-scoped, server-re-verified pattern
already proven across all 15 existing routes — no new isolation
mechanism is implied by this investigation's findings; if Support
Session is ever built, its own credential-scoping design (§9.7,
already specified) needs explicit attention to the "stale credential
reused against the wrong business" risk named in §13 of this document.

**16. What decisions still require Product Architect approval?**
Whether to widen Business Visibility's reach to `'support'`/
`'developer'` tiers; whether to revisit Gap 2's deferral of Support
Session for the two narrow scenarios in §6; whether to build a
password-reset capability and under what identity-verification
standard; whether to build any customer-communication mechanism, and
at what scope (SuperAdmin-Agent-specific vs. platform-wide); whether
SuperAdmin should ever reactivate a staff member on an Owner's behalf.

**17. What is the recommended NEXT GOVERNANCE STEP?**
Product Architect review of this document's §16 (Minimum Viable
SuperAdmin Agent) and §17 (Governance Classification) tables —
specifically to confirm or redirect the "Must Have" set before any
BDR, Policy, or Specification drafting begins for it. The two Level-3
scenarios (§6) and the password-reset/communication gaps should
remain explicitly separate, later-stage decisions, not bundled into
the same first governance pass — bundling them would force a decision
on the hardest, least-evidenced items (Support Session's revisit,
brand-new capability design) before the easiest, best-evidenced ones
(reusing what's already built) can move forward on their own.

---

**NO IMPLEMENTATION PERFORMED. NO CODE WRITTEN. NO BDR, POLICY,
SPECIFICATION, RULE 8 ASSESSMENT, OR IMPLEMENTATION AUTHORIZATION
CREATED OR ALTERED. NO ARCHITECTURE REDESIGNED. NO PREVIOUS DECISION
SILENTLY REOPENED — GAP 2 AND `BDR-0011` ARE BOTH TREATED AS STANDING
DECISIONS THROUGHOUT, NOT BYPASSED. NOTHING COMMITTED. NOTHING PUSHED.
THIS DOCUMENT IS NOT PART OF THE REPOSITORY.**
