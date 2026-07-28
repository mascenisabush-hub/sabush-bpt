# Section 4 — System Architecture

**Status:** ✅ Approved (amended — see 4.8 Idempotency and Failure Recovery)
**Depends on:** Section 1 (Product Vision) — approved · Section 2 (Core Product Principles) — approved · Section 3 (Domain Architecture) — approved
**Purpose:** Map every domain from Section 3 onto physical components — frontend, backend, database, authentication, storage, background processing, notifications, analytics, AI, payments, SuperAdmin — and show exactly how they integrate, so Sections 5–15 can each go deeper on one slice of this map without re-deciding the map itself.

This section is grounded in what the audit confirmed is actually running today, not a hypothetical clean-slate design. Where the current implementation already satisfies the Section 2 principles, it is kept and extended. Where scale (Mission: 100,000+ businesses) or a new domain (Section 3: SuperAdmin, Subscriptions, Notifications, AI, Analytics) requires something that doesn't exist yet, that gap is named explicitly and a decision is made — never left implicit for a future section to discover.

---

## 4.1 Architectural Style and the Constraints It Must Respect

Sabush BPT today is a **single-page application talking directly to Firestore**, with **one narrow, privileged backend** for the handful of actions a client must never be trusted to perform itself. This is not an accident of an early-stage build — it's a deliberate, currently-correct choice, and Section 4 preserves its shape rather than replacing it with a conventional multi-service backend the product doesn't yet need (Principle 2.6, Simplicity Over Completeness).

Two constraints carried forward from the existing system, stated explicitly so later sections don't silently assume otherwise:

1. **No Firebase Cloud Functions today.** The existing `server/index.ts` deliberately avoids Cloud Functions because they require the Blaze billing plan, which isn't reachable from every region/card the business operates in. This is a real, current operating constraint of the target market (Section 1.4), not a technical limitation to casually override. Section 4.8 designs background/scheduled processing (new domains need it) **without assuming Blaze is available**, and separately names the point at which that constraint should be revisited.
2. **One privileged server, not a service mesh.** The existing Express server on Railway does exactly two jobs: serve the built SPA, and expose privileged, server-verified actions the Firestore Security Rules layer cannot safely allow a client to perform unilaterally. Section 4 extends this same server (or a small number of siblings, 4.8) rather than introducing a distributed backend, because nothing in the Mission's scale target requires one — Firestore itself, correctly indexed and rule-scoped, is designed to serve 100,000+ tenants directly from the client SDK.

Every new component this section introduces (background jobs, notification delivery, the aggregation layer, payment webhook handling) is evaluated against **Principle 2.12 (Build for the Next Order of Magnitude, Not the Next Feature)**: it must comfortably survive a 10x jump in tenant count without a rewrite, but it is not over-built for 100,000 tenants on day one.

---

## 4.2 High-Level System Map

```
                              ┌─────────────────────────────┐
                              │        OWNER / STAFF        │
                              │   (browser, shared device)   │
                              └──────────────┬───────────────┘
                                             │ HTTPS
                              ┌──────────────▼───────────────┐
                              │      SABUSH BPT SPA           │
                              │  React 19 + Vite + Tailwind    │
                              │  (served as static build)      │
                              └───┬──────────────────────┬────┘
                    Firebase SDK  │                      │  fetch (privileged only)
                    (reads/writes │                      │
                     most data    │                      │
                     directly)    ▼                      ▼
                          ┌───────────────┐      ┌──────────────────────┐
                          │  FIRESTORE     │      │  PRIVILEGED SERVER    │
                          │  (per-tenant   │◄─────┤  Express on Railway   │
                          │   documents,   │ admin│  (firebase-admin SDK) │
                          │   Security     │  SDK │  server-verified only │
                          │   Rules layer) │      └──────────┬────────────┘
                          └───────┬────────┘                 │
                                  │                           │ webhooks / triggers
                    ┌─────────────┼───────────────┐           │
                    │             │               │           ▼
              ┌─────▼────┐  ┌─────▼─────┐   ┌─────▼─────┐  ┌──────────────────┐
              │ FIREBASE │  │  BACKGROUND│   │  SHARED    │  │  PAYMENT          │
              │  AUTH    │  │  PROCESSING│   │AGGREGATION │  │  PROCESSOR(S)     │
              │(sessions,│  │  (4.8, new)│   │  LAYER      │  │  (external, 4.12) │
              │ PIN quick│  └─────┬──────┘   │  (4.10, new)│  └────────┬──────────┘
              │  login)  │        │           └──┬───┬───┬──┘           │
              └──────────┘        │              │   │   │              │
                                  │        ┌─────▼┐ ┌▼──┐ ┌▼────────┐    │
                                  │        │ AI    │ │SUPER│ANALYTICS│    │
                                  │        │(4.11) │ │ADMIN│ (4.10)  │    │
                                  │        └───────┘ │(4.13)│         │    │
                                  │                  └──────┘         │    │
                                  ▼                                         │
                        ┌───────────────────┐                              │
                        │  NOTIFICATIONS     │◄─────────────────────────────┘
                        │  (4.9 — in-app,    │
                        │   email, WhatsApp) │
                        └────────────────────┘
```

This diagram is the reference every subsection below expands on. Nothing in it is decorative — every box is either an existing component (kept as-is or extended) or a new component this section is responsible for designing.

---

## 4.3 Frontend Architecture

**What exists (audit-confirmed):** A React 19 + Vite single-page application, styled with Tailwind v4 against `DESIGN_SYSTEM.md` (Principle 2.11), with PT/FR/EN localization (`src/i18n`) consistent with the target market (Section 1.4). Client-side view routing is component-driven rather than a URL-based router; state is centralized in a single `AppContext`.

**Kept as-is:**
- The SPA-talks-directly-to-Firestore model for all non-privileged reads/writes, secured entirely by Security Rules (4.5) rather than by an API layer re-implementing those checks. This is correct at any scale Firestore itself supports, and re-implementing it as REST endpoints would only add a maintenance surface without a security benefit (Principle 2.6).
- The design-system-first discipline (Principle 2.11) — every new surface this document series introduces (SuperAdmin dashboard in 4.13, Notification preferences in 4.9, AI insight cards in 4.11) must extend `DESIGN_SYSTEM.md` rather than depart from it.

**Named gap, not deferred silently:** The audit identified the single `AppContext` as an oversized central state file and a scale risk. Section 4 does not redesign this here (module-level detail belongs in Section 8, Module Architecture), but it **must be named as a constraint on this System Architecture**: any new domain this section adds (Notifications, Subscriptions, AI insights) should be planned as its **own** context/state slice from day one, not appended to the existing monolith context — extending the current risk while designing the fix around it would violate Principle 2.5 twice over. Section 8 will specify the concrete decomposition.

**New for this section:** As Subscriptions (3.13) and Notifications (3.12) come online, the frontend gains two new read-mostly data sources (subscription/entitlement state, notification feed) that must be available app-wide without being folded into the existing `AppContext`. These are designed in 4.9 and 4.12 as independent, narrowly-scoped contexts.

---

## 4.4 Backend Architecture — The Privileged Server

**What exists (audit-confirmed, and correctly built per Principle 2.9):** A single Express server, deployed on Railway, serving two roles:
1. Serves the built SPA as static files (`dist/`) — this is what actually runs in production.
2. Exposes a small set of privileged endpoints (`/api/staff/delete`, `/api/staff/suspend`, `/api/staff/reactivate`, `/api/staff/reset-pin`) that a client must never be able to perform unilaterally, because they touch another person's Firebase Auth account or override normal write rules.

Every privileged endpoint follows one pattern, already correct and to be replicated for every future privileged action (Subscriptions billing changes, SuperAdmin actions, Section 9):
- Verify the caller's Firebase ID token server-side (`requireAuth`).
- **Re-read the caller's actual profile from Firestore** to confirm their real role and business membership — never trust a client-claimed role (Principle 2.9).
- Re-verify the target record actually belongs to the caller's business before acting (tenant isolation, Principle 2.8).

**Extension required by Section 3's new domains:** SuperAdmin (3.14) and Subscriptions (3.13) both require privileged, server-verified actions of the same shape (suspend a *business* rather than a staff member; change a subscription's plan/status; issue a time-boxed impersonation token). These belong on the **same server**, as additional route groups (`/api/superadmin/*`, `/api/billing/*`), not a separate service — there is no scale or security reason to split them out, and doing so would multiply operational surface for no benefit (Principle 2.6). Section 9 designs the specific SuperAdmin endpoints; this section's job is to confirm they live in the same privileged-server pattern already proven correct.

**What does *not* belong here:** Any read that a correctly-scoped Firestore Security Rule can already serve directly to the client. The privileged server exists only for the narrow set of actions Security Rules structurally cannot express (cross-record side effects like deleting an Auth account, or actions that must be logged to an append-only audit trail before they take effect). Routing ordinary reads through this server "for consistency" would reintroduce a bottleneck Firestore's direct-access model is specifically designed to avoid at scale.

---

## 4.5 Database Architecture (System-Level — Section 7 Owns the Full Design)

Section 7 (Data Architecture) owns entity/collection design in full. This section fixes only the **system-level shape** everything else depends on:

- **Firestore** remains the single database, with the existing tenant-root structure (`businesses/{businessId}/...`) as the anchor every operational domain (3.3–3.10) hangs beneath, exactly as Section 3.2 describes.
- **Security Rules are the primary access-control layer for client reads/writes** — this is the mechanism that makes the "SPA talks directly to the database" model in 4.3 safe. The existing rules' pattern of deriving membership and role from a server-controlled `users/{uid}` profile document (never from a client-asserted claim) is the pattern every new collection (Subscriptions, Notifications, platform Audit Log) must also follow.
- **Platform-level domains (Subscriptions, SuperAdmin, Notifications, Analytics) live in top-level collections, not nested under any single business** — consistent with Section 3.1's domain map — because they either span many businesses (SuperAdmin, Analytics) or are billed/addressed independently of a single business's operational data (Subscriptions). Security Rules for these collections are read-only-by-default for normal users and writable only via the privileged server (4.4), never directly by a client, since these collections are exactly the ones Principle 2.9 requires to be server-verified.

---

## 4.6 Authentication and Session Architecture

**What exists (audit-confirmed):** Firebase Authentication is the identity provider for owners; a PIN-based quick-login flow layered on top serves staff on a shared device — consistent with the target market's low-formality, shared-device reality (Section 1.4). A user's role and business membership live on their `users/{uid}` Firestore profile document, which the Security Rules layer (4.5) and the privileged server (4.4) both treat as the single source of truth — never a client-supplied claim.

**Kept as-is, and generalized:** The existing `isSuspended()` check — which denies a suspended staff member at the *data layer*, the instant a server-controlled flag flips, rather than waiting for their session token to expire — is exactly the pattern SuperAdmin's business-level suspension (3.14) needs too. Section 4 confirms this as a general system pattern: **any account or business the platform needs to disable takes effect at the Security Rules layer immediately, not only at the next token refresh.**

**New requirement from Section 3.14 (SuperAdmin):** Impersonation must be a distinct, time-boxed, audit-logged session type — not a SuperAdmin silently reusing an owner's existing session. This is a privileged-server-issued, short-lived credential (4.4), logged to the platform Audit Log (4.13) at issuance and expiry, never a raw swap of Firebase Auth identity. Full mechanics are Section 9's responsibility; this section fixes that it is a **server-issued, time-boxed, logged** credential, consistent with Principle 2.9.

---

## 4.7 Storage Architecture

**Current state (confirmed by inspection, not assumed):** A Firebase Storage bucket is configured (present in the client's Firebase config) but **not yet used anywhere in the codebase** — there is no product-photo, receipt-image, or business-logo upload implemented today.

**Decision required now, because Section 8 (Module Architecture) and Section 10 (AI Architecture) will both eventually want it:** When file storage is introduced (product photos being the most likely first case), it must follow the same tenant-isolation discipline as Firestore — objects scoped under a path keyed by `businessId`, with Storage Security Rules (the Storage-equivalent of `firestore.rules`) deriving access from the same `users/{uid}` profile document, never a separately-maintained permission system. This section does not design the specific upload flow (that's a Section 8 module concern) — it fixes the constraint so Section 8 doesn't have to re-derive it: **one identity and tenancy model, enforced consistently across Firestore and Storage, not two parallel security systems.**

---

## 4.8 Background Processing and Scheduled Work — New

**The gap:** Nothing in the current system runs code on a schedule or in response to a Firestore event without a user's browser tab being open to trigger it. That was sufficient when every domain was something an owner directly read or wrote. It is not sufficient for domains Section 3 introduces that must act **independently of anyone having the app open**: Notification triggers (3.12 — an overdue-closing reminder must fire whether or not the owner opens the app that day), Subscription lifecycle events (3.13 — a trial expiring, a renewal failing), and the Analytics/AI aggregation layer (3.15, 3.16 — periodic rollups, not computed live on every read).

**The constraint this must respect (4.1):** Cloud Functions — the default Firebase answer to "run code on a schedule or on a database trigger" — require the Blaze plan, which the existing system was deliberately built to not depend on. Section 4 does not silently assume Blaze is now acceptable; it makes the decision explicitly:

**Decision:** Background/scheduled work runs as a **second lightweight process on the same Railway project as the privileged server** — a scheduled worker (using a simple in-process scheduler or Railway's own cron trigger) that runs on a fixed interval (e.g., hourly), reads what it needs directly via `firebase-admin` (the same SDK the privileged server already uses), and performs three job types:
1. **Notification triggers** — scan for events that should produce a notification (overdue closing, low-stock threshold, subscription renewal window) and hand off to the Notification delivery abstraction (4.9).
2. **Subscription lifecycle checks** — trial-expiry, renewal-due, payment-retry-window logic that shouldn't depend on a payment-processor webhook alone (4.12) as the only trigger.
3. **Aggregation rollups** — periodic (not real-time) computation feeding the shared Analytics/SuperAdmin/AI aggregation layer (4.10), so that layer never has to run expensive cross-tenant aggregation live on a dashboard request.

**4.8.1 Idempotency and Failure Recovery — Amendment:** A scheduled worker that crashes mid-run and simply restarts on the next interval will, without a guard, re-fire the same overdue-closing reminder or double-count the same period in an aggregation rollup. This is addressed with two mechanisms, both cheap to build and consistent with 4.8's "no new billing plan" constraint:
1. **Per-job dedupe key.** Every unit of work the worker considers (one notification trigger, one subscription check, one business's slice of an aggregation rollup) is identified by a deterministic key (e.g., `{businessId}:{eventType}:{period}`). Before writing a new `notifications/{id}` document (4.9) or advancing an aggregation period, the worker checks a small `platform_worker_state/{jobType}` document (or the dedupe key's own existence, e.g. as the Notification document's ID rather than an auto-ID) — if that unit of work is already recorded as done, it is skipped. This turns "did I already do this" into a single indexed read, not a distributed-lock problem.
2. **Run-level watermark, not a global lock.** Each job type tracks its own last-completed watermark (e.g., `platform_worker_state/{jobType}.lastRunCompletedAt`) on the same document. A crash mid-run simply means the next scheduled run re-scans the same bounded window it would have anyway (the interval is short, per 4.8's hourly cadence) — the dedupe key from (1) is what actually prevents a duplicate side effect, the watermark is only an optimization to narrow the scan, never the correctness mechanism by itself.

This deliberately does not introduce a job queue, distributed lock, or exactly-once delivery system — at the tenant counts this Mission targets, an idempotent write keyed by a deterministic ID is sufficient and is the simplest mechanism that closes the gap (Principle 2.6). Section 11 can raise this to a queue-based model if a concrete measured threshold ever requires it, per 4.8's existing escalation path.

**Why this satisfies Principle 2.12 without over-building:** This is the simplest mechanism that (a) requires no new billing plan, (b) reuses infrastructure and SDK access patterns already proven in production, and (c) comfortably scales to the next order of magnitude — an hourly scan over 10,000 or even 100,000 businesses is a bounded, indexable Firestore query workload, not an unbounded listener (the exact anti-pattern the audit flagged elsewhere). **The explicit ceiling:** if tenant count or job complexity ever makes a single scheduled worker process insufficient (a concrete, measurable threshold — not a vague "someday"), the documented escalation path is to move this worker onto Cloud Functions' scheduled-trigger model once/if Blaze becomes acceptable, or to split job types across multiple worker processes — both are additive changes to this design, not a rewrite of it, which is exactly what Principle 2.5 requires.

---

## 4.9 Notifications Architecture — New

**Purpose (per Section 3.12):** A channel-agnostic delivery mechanism for facts computed elsewhere — never a source of truth itself.

**System design:**
- A `notifications` collection (top-level, per 4.5) holds one document per notification: recipient (`userId` or `businessId`-scoped), type, payload references (never duplicated financial data — a pointer to the record that triggered it, per Principle 2.4's "categorization must be visible... not just correct in the database"), channel(s), and delivery status.
- **Trigger sources**, all funneling into the same collection rather than each domain inventing its own delivery path: the Background Worker (4.8, for scheduled/threshold-based alerts), the privileged server (4.4, for immediate transactional notifications like a staff-suspension confirmation), and the payment processor webhook handler (4.12, for billing events).
- **Delivery fan-out** happens from that single collection to whichever channels are enabled for that user/business: in-app (a live Firestore listener the SPA already knows how to do), email (a transactional email provider, invoked by the Background Worker), and WhatsApp (per Section 1.4's target market and the audit's own recommendation — invoked the same way, via the provider's API from the Background Worker, never from the client).
- **Explicit non-responsibility, restated from Section 3.12:** this system never computes or stores a financial fact — it only references one. This keeps Notifications simple to scale (it's the delivery layer, not a second copy of the truth) and keeps it outside the Worth-First scope test's stricter scrutiny, since it doesn't touch how worth is calculated.

---

## 4.10 The Shared Aggregation Layer — New (Serves Analytics, SuperAdmin, and AI)

Section 3.16 already named the requirement: Analytics, SuperAdmin's platform metrics, and AI's cross-tenant model-quality improvements all need aggregate, anonymized visibility across many businesses, and **Principle 2.8 (Tenant Isolation Is Non-Negotiable)** forbids any of them from doing a direct, raw, cross-tenant Firestore read to get it. Section 4 is where that shared layer is actually designed, rather than left as three separate future problems.

**Design:**
- The Background Worker (4.8), during its periodic aggregation rollup job, reads per-business data **the same way any other server-side, admin-SDK process would** (nothing new here — it already has that access for its other jobs), computes aggregate figures (counts, sums, distributions — never raw per-transaction records), and writes the result into a **separate, dedicated collection** (e.g., `platform_aggregates/{period}`) that contains **only already-anonymized/aggregated numbers** — no field in this collection is ever a direct copy of one business's raw record.
- **Analytics** (3.16) and **SuperAdmin's platform dashboard** (3.14) both read *only* from `platform_aggregates`, never from individual businesses' collections directly — this is what makes the boundary real rather than aspirational: it's enforced by which collection a Security Rule allows these roles to read, not by a convention someone could forget.
- **AI's cross-tenant model-quality use case** (3.15) reads from the same `platform_aggregates` collection for pattern-level signal; a given business's own per-business AI insights (Section 10) are computed separately, directly from that one business's own data (a normal, tenant-scoped read, not a cross-tenant one) — the two data paths must never merge, since a per-tenant insight silently influenced by unaudited cross-tenant raw data would itself be a Principle 2.8 violation, not just an accuracy question.

**Why one shared layer instead of three:** building this aggregation/anonymization boundary once and having three consumers read from it is a direct application of Principle 2.6 (Simplicity Over Completeness) — three independent aggregation pipelines would triple the surface area where a tenant-isolation mistake could be introduced, for no benefit over one correctly-built shared layer.

---

## 4.11 AI Integration Architecture — New (System-Level Only; Section 10 Owns the Full Design)

**Current state (confirmed by inspection):** `@google/genai` is already present as a dependency but is **not yet integrated anywhere in the codebase** — no AI feature is live today. This section fixes only where AI plugs into the system map; Section 10 owns inputs, outputs, and business value per feature.

**System-level placement:**
- **Per-business AI insights** (capital forecasting, dead-stock detection, etc.) are computed **server-side**, invoked from the privileged server (4.4) or the Background Worker (4.8) — never directly from the client to the AI provider, because a client-side call would require exposing an API key to every browser session, an unacceptable security posture (Principle 2.3) at any scale. The server reads that one business's own data (a normal tenant-scoped read), calls the AI provider, and writes the result back as a clearly-labeled Report entry (3.9) or Notification (3.12) — never silently merged into an actual historical figure (Principle 2.4).
- **Cross-tenant model-quality improvement** (the aggregate pattern use case) reads exclusively from the shared aggregation layer (4.10), per the boundary already fixed there.
- This keeps AI's integration point identical in shape to every other privileged, server-verified capability this document has already established — no new integration pattern is invented just because the word "AI" is involved.

---

## 4.12 Payments and Subscriptions Integration — New (System-Level Only; Section 9 Owns Billing Design)

**Purpose (per Section 3.13):** Subscriptions is the commercial-relationship domain; Payments is the external system that makes billing state changes actually happen.

**System-level integration:**
- An external payment processor (specific vendor selection is a Section 9 decision, not a Section 4 one — the target market's reality, including mobile-money-style payment methods common in the region per Section 1.4, should weigh into that choice) is integrated via **webhook**, received by a dedicated route on the same privileged server (4.4): `/api/billing/webhook`.
- That webhook handler **verifies the request's authenticity** (signature verification against the processor's secret — the payments-specific instance of Principle 2.9's "never trust a client-supplied value," here applied to an external caller instead of an internal client), then updates the relevant `subscriptions/{id}` document (a platform-level collection, per 4.5) — plan, status, renewal date.
- That write, in turn, is exactly the kind of event the Background Worker's Notification-trigger job (4.8, 4.9) picks up to alert the owner (payment failed, renewal upcoming) and exactly the kind of change every operational domain's feature-gating check (3.13) reads live from Firestore before allowing an action (e.g., "can this owner add an 11th shop").
- **No payment data (card numbers, mobile-money credentials) is ever stored by Sabush BPT itself** — the processor is the system of record for payment instruments; Sabush stores only the subscription *state* that results from a payment event. This keeps PCI/compliance exposure at the processor, not the platform, which is the correct boundary regardless of which processor Section 9 ultimately selects.

---

## 4.13 SuperAdmin Integration Point — New (System-Level Only; Section 9 Owns the Full Design)

**The one architectural decision Section 4 must make so Section 9 isn't left to guess:** should SuperAdmin be a role-gated view inside the same tenant-facing SPA, or a physically separate application?

**Decision: a separate application (separate build, separate deployment), sharing the same Firebase project and the same privileged server's API, but never bundled into the tenant-facing SPA.** Reasoning:
- **Security (Principle 2.3, 2.8):** A role-gated route inside the tenant SPA means SuperAdmin-capable code — however carefully gated — ships to every owner and staff member's browser on every load. A platform-operator surface handling impersonation, cross-tenant visibility, and billing controls should not exist in that bundle at all, gated or not. A separate application means SuperAdmin code is simply never present in a tenant's browser.
- **Design system discipline still applies (Principle 2.11):** "separate application" does not mean "separate design language" — it consumes the same `DESIGN_SYSTEM.md` tokens, per Section 4.3's rule that any new surface must extend, not depart from, the existing system.
- **It talks to the same privileged server** (4.4, as `/api/superadmin/*` routes) and the same shared aggregation layer (4.10) — no new backend is introduced for it, consistent with 4.1's "one privileged server, not a service mesh."
- **Full detail (specific screens, permission matrix, audit log schema) is Section 9's job.** This section fixes only that it is architecturally separate from the tenant SPA, and shares infrastructure rather than duplicating it.

---

## 4.14 Full Integration Summary Table

| Domain (Section 3) | Frontend surface | Data location | Server involvement | Background/async involvement |
|---|---|---|---|---|
| Business, Inventory group, Staff, Timeline | Tenant SPA (4.3) | `businesses/{id}/...` (Firestore, 4.5) | Privileged server for staff account actions (4.4) | None required |
| Reports | Tenant SPA | Derived from Inventory + Financial reads | None (client-computed from direct reads) | None required |
| Notifications | Tenant SPA (feed) + email/WhatsApp | `notifications` (top-level, 4.5) | Privileged server for transactional triggers | Background Worker for scheduled/threshold triggers (4.8, 4.9) |
| Subscriptions | Tenant SPA (entitlement checks) + SuperAdmin app | `subscriptions` (top-level, 4.5) | Privileged server webhook handler (4.12) | Background Worker for lifecycle checks (4.8) |
| SuperAdmin | **Separate SuperAdmin app** (4.13) | Platform Audit Log + reads via aggregation layer | Privileged server `/api/superadmin/*` (4.4) | None beyond shared aggregation rollups |
| AI | Tenant SPA (insight display) | Reports (per-business) + `platform_aggregates` (cross-tenant) | Privileged server or Background Worker invokes AI provider (4.11) | Background Worker for aggregate-pattern jobs |
| Analytics | SuperAdmin app only | `platform_aggregates` (4.10) | None directly (read-only consumer) | Background Worker computes it (4.8, 4.10) |

---

## 4.15 Deployment Topology

- **Firebase project:** Firestore (database + Security Rules), Firebase Auth — unchanged in shape from today, scaled by tenant count, not by adding new Firebase products this document series doesn't require.
- **Railway project:** two processes —
  1. The existing privileged server (serves the SPA + all `/api/*` privileged routes, extended per 4.4, 4.9, 4.12, 4.13).
  2. The new Background Worker (4.8) — a separate process so a long-running aggregation job never risks delaying a live user-facing API request.
- **SuperAdmin app (4.13):** its own static build, deployed separately (Railway or any static host), talking to the same Firebase project and the same privileged server's `/api/superadmin/*` routes.
- **External integrations:** a payment processor (webhook only, 4.12), an email provider and WhatsApp Business API integration (outbound only, invoked from the Background Worker, 4.9), and the AI provider (server-invoked only, 4.11).

This topology adds exactly two new deployable units (the Background Worker, the SuperAdmin app) to the one that exists today — not a sprawl of microservices — consistent with Principle 2.6 applied at the infrastructure level.

---

## What Sections 5–15 Will Build On This

- **Section 5 (Business Lifecycle)** will narrate the owner-facing journey through the components mapped here, especially where Notifications (4.9) and Subscriptions (4.12) now touch stages of that lifecycle that didn't have a system behind them before.
- **Section 6 (User Architecture)** will use the Auth/session model in 4.6 (including the new impersonation session type) to define the full role matrix.
- **Section 7 (Data Architecture)** will turn 4.5's system-level shape into full entity/collection design, including the new top-level collections named here (`notifications`, `subscriptions`, `platform_aggregates`, the platform Audit Log).
- **Section 8 (Module Architecture)** will resolve the `AppContext` decomposition flagged in 4.3 and design the Storage upload flow deferred in 4.7.
- **Section 9 (SuperAdmin Architecture)** and **Section 10 (AI Architecture)** will fully design the two components this section deliberately scoped at system-level only (4.13, 4.11).
- **Section 11 (Scalability Strategy)** will give concrete thresholds for when the Background Worker (4.8) needs to split or migrate, and for Firestore indexing/pagination across every collection introduced here.
- **Section 12 (Security Architecture)** will formalize the webhook-verification (4.12), impersonation session (4.6), and Storage tenant-isolation (4.7) patterns into explicit controls.

**This section requires your explicit approval before Section 5 (Business Lifecycle) begins.**
