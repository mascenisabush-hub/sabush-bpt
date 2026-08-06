# Sabush BPT — Business Domain Specifications (BDS)

**Status:** Living document series, built and approved one module at a time.
**Depends on:** [Product Architecture Document](../architecture/README.md)
(Sections 1–15, all approved), [Design System v2.0](../../DESIGN_SYSTEM.md),
[Component Library](../../COMPONENT_LIBRARY.md).

**Purpose:** This is the bridge between Product Architecture and
Engineering. Architecture answered *why the system is shaped this way*.
Standards (Design System, Component Library) answered *what it looks
like*. This series answers, module by module, *exactly what each module
must do* — precisely enough that six months from now, "improve Dashboard"
resolves against `01-dashboard.md` instead of a fresh, undocumented
conversation about what Dashboard even is.

**Method:** Every module gets Purpose → Business Problem → Users → User
Stories → Business Rules → Functional Requirements → Non-functional
Requirements → KPIs → Future Enhancements → Acceptance Criteria, per the
brief's own template. Every claim in every section is grounded in the
real, already-approved Architecture document (cited by section number)
and, where the module already exists in code, the real implementation —
never invented fresh for the spec.

**Order:** Product value, not code dependency — per the stated reasoning:
first define what makes Sabush unique (Business Worth, capital
intelligence), then build the platform capabilities around that.

---

## Phase 1 — Core Business Intelligence

| # | Module | Status |
|---|---|---|
| 1 | [Dashboard](./01-dashboard.md) | ✅ Approved |
| 2 | [Business Worth Engine](./02-business-worth-engine.md) | ✅ Approved |
| 3 | [Products](./03-products.md) | ✅ Approved |
| 4 | [Purchase Batches](./04-purchase-batches.md) | ✅ Approved |
| 5 | [Stock Batches](./05-stock-batches.md) | ✅ Approved |
| 6 | [Embedded Profit Engine](./06-embedded-profit-engine.md) | ✅ Approved |

## Phase 2 — Capital Protection

| # | Module | Status |
|---|---|---|
| 7 | [Breakages (Quebras)](./07-breakages.md) | ✅ Approved |
| 8 | [Expenses](./08-expenses.md) | ✅ Approved |
| 9 | [Withdrawals](./09-withdrawals.md) | ✅ Approved |
| 10 | [Stock Counts](./10-stock-counts.md) | ✅ Approved |
| 11 | [Monthly Closings](./11-monthly-closings.md) | ✅ Approved |

> **Note on the Closing Integrity Amendment (amends #8, #9, #11):** a
> calculation audit found that closed-period integrity had a real
> requirement gap, not just an implementation gap — specs #8/#9
> required protecting *existing* Expense/Withdrawal records once
> locked, but nothing required blocking *new*, backdated records from
> being created inside an already-closed period. The
> [Closing Integrity Amendment](./08-09-11-closing-integrity-amendment.md)
> (v1.0, ✅ Approved) settles this: closed periods are now specified as
> fully immutable — new backdated entries blocked, future-dated entries
> unchanged, and the one sanctioned correction path is admin-only,
> logged period reopening. Specs #8, #9, and #11 have been updated
> in-place with `[Amendment v1.0]`-tagged Functional Requirements and
> Acceptance Criteria. Scope is Expense/Withdrawal only — Quebra and
> Stock Batch remain outside this amendment. **Implemented** (types,
> `AppContext.tsx`, `firestore.rules`, UI) — see the amendment doc's own
> "Implementation status" section for exact files touched, one gap found
> and fixed mid-implementation (a Manager could previously reopen a
> Closing — now Owner-only, matching the decision), and one
> product-facing behavior change flagged for a deliberate decision
> (`clearAllData` no longer removes Closings). `firestore.rules` changes
> are typecheck/build-verified but not yet run against the Firebase
> emulator — flagged as a manual step before production deploy.

## Phase 3 — Insight & Decision Support

| # | Module | Status |
|---|---|---|
| 12 | [Reports](./12-reports.md) | ✅ Approved |
| 13 | [Business Timeline](./13-business-timeline.md) | ✅ Approved |
| 14 | Analytics | ⚠️ Deferred — see note below |
| 15 | [AI Intelligence](./15-ai-intelligence.md) | Drafted — awaiting approval |

> **Note on module 14 (Analytics):** Architecture [Section 3.16](../architecture/03-domain-architecture.md)
> defines Analytics as a *platform-wide* domain ("aggregate measurement —
> adoption, growth, churn signals, feature usage — for Sabush's own
> product and business decisions"), explicitly distinct from AI (3.15,
> tenant insight) and Reports (3.9, single-business insight). [Section
> 8](../architecture/08-module-architecture.md) confirms Analytics "has
> no module yet" and is out of scope until Sections 9/10/13 schedule its
> build; [Section 9.8](../architecture/09-superadmin-architecture.md)
> designs it as "Platform Analytics" inside the SuperAdmin application,
> reading only from `platform_aggregates`; and
> [Section 13](../architecture/13-development-strategy.md)'s own phase
> table places it in **Phase 2 — SuperAdmin**, not Phase 3. There is no
> tenant-facing Analytics module for this series to spec — writing one
> would invent scope Architecture never described. Its BDS belongs
> alongside module #18 (SuperAdmin) when that application is built as a
> coherent unit. Deferred, not skipped silently.

## Phase 4 — Platform

| # | Module | Status |
|---|---|---|
| 16 | [Staff & Roles](./16-staff-roles.md) | ✅ Approved |
| 17 | [Owner Portfolio](./17-owner-portfolio.md) | ✅ Approved (docs & business rules; implementation not yet authorized) |
| 18 | [SuperAdmin](./18-superadmin.md) | ✅ Accepted (documentation & business rules; implementation not authorized) |
| 19 | [Subscriptions](./19-subscriptions.md) | ✅ Accepted; Phase 1 (Foundations) implemented & closed (`4d9d34b`); Phase 2 (Trial Engine) decisions recorded, implementation not yet authorized |
| 20 | [Notifications](./20-notifications.md) | ✅ Accepted; Phase 1 (Foundations), Phase 2 (Privileged-Server Creation Path), and Phase 3 (Background Worker Scheduled Triggers) all implemented & closed (`20-phase3-closeout.md`, commit `32bafbf`); Phase 4 (Tenant User Experience) not yet authorized |

> **Note on Module #20 (Notifications):** readiness analysis surfaced a
> genuinely unresolved recipient-binding question in Architecture §4.9/
> §7.4 (`uid` or `businessId` — unlike Module #19's binding, no section
> claimed to resolve this one). Resolved by Product Architect decision,
> embedded directly in the BDS's own "Decision Record" section (this
> module's decision record is a section within `20-notifications.md`,
> not a separate file, per explicit instruction): **hybrid model** —
> Business-scoped and User-scoped notifications are both first-class.
> A subsequent documentation review against Module #17's and Module
> #19's Accepted rules, Architecture's tenant isolation principle, and
> the SuperAdmin dependency chain found the BDS's original Background
> Worker wording too narrow — Architecture §4.9/§7.4 name three
> legitimate notification-creation paths (Background Worker for
> scheduled/derived events, the privileged server for immediate
> transactional events, the payment webhook handler for payment/
> subscription-provider events), not one. Corrected prior to
> Acceptance: the Background Worker is shared notification
> infrastructure for scheduled and derived events and does not
> exclusively own notification creation; all three paths enforce the
> same tenant isolation, recipient binding, auditability, and
> notification rules. Also confirmed: V1 channel scope is in-app only,
> behind a Delivery Channel Interface; V1 notification types are fixed
> to four categories (Closing, Inventory Risk, Subscription, Platform
> Announcements); an Owner with multiple Businesses (Module #17) does
> not receive a combined cross-Business notification stream, mirroring
> #17's own no-aggregation boundary. **✅ Accepted** — business
> specification and architectural decisions only, per the BDS's own
> "Product Architect Acceptance" section. Implementation is not
> authorized by this Acceptance. No `firestore.rules`, `Header.tsx`, or
> `NotificationContext` changes have been made — those remain out of
> scope until implementation is separately authorized.

> **Update — Implementation Status:** Module #20 Phase 1 (Foundations)
> was subsequently authorized separately
> (`docs/engineering/20-phase1-implementation-authorization.md`),
> implemented, verified, and formally closed
> (`docs/engineering/20-phase1-closeout.md`). `firestore.rules`,
> `NotificationContext`, `DeliveryChannel`, and Header bell-dropdown
> wiring now exist in `src/`, superseding the "no changes have been
> made" statement above as of that point in time. Phase 2
> (Privileged-Server Creation Path) remains unauthorized.

> **Update — Phase 2 and Phase 3 Implementation Status:** Phase 2
> (Privileged-Server Creation Path) was subsequently authorized,
> implemented, verified, and formally closed
> (`docs/engineering/20-phase2-closeout.md`), superseding the "remains
> unauthorized" statement immediately above as of that point in time.
> Phase 3 (Background Worker Scheduled Triggers) followed the same
> pattern: BDR-0007 (BusinessEvent Creation Policy) and its Closing
> Cadence Amendment were Accepted, the Phase 3 Rule 8 Assessment v2
> concluded Governance Readiness: Ready, the Phase 3 Implementation
> Authorization was signed, and all five checkpoints (job registration,
> platform infrastructure, and the three producers named by BDR-0007 —
> `trial-engine`, `closing-integrity`, `breakage-tracking`) were
> implemented, tested, and formally closed
> (`docs/engineering/20-phase3-closeout.md`, commit `32bafbf`). Phase 4
> (Tenant User Experience beyond the existing bell dropdown) remains
> unauthorized.

> **Update — Module #20 Specification Enhancement Amendment (v1.1):**
> `20-notifications.md` is now **Version 1.1**. The
> [Module #20 Specification Enhancement Amendment](./20-notifications-enhancement-amendment.md)
> records three approved owner-experience enhancements (Context-First
> Communication, Communication Priority, the Owner Confidence
> Principle) — Decision Gates 1–4 above are unchanged. **✅ Accepted**;
> implementation is not authorized by this amendment.

> **Note on Module #19 (Subscriptions):** drafting required resolving a
> genuine source-of-truth contradiction first — Architecture §3.13 left
> subscription binding open, §6.2 described it as Owner-level, §9.4
> resolved it as `businessId`-level, and §13.5 still described it as
> pending. The [Subscription Ownership Resolution](./19-subscription-ownership-resolution.md)
> record settles this: **Business-level (`businessId`) binding**, no
> Owner/Portfolio-level subscription, `MAX_SHOPS_PER_OWNER` (Module #17)
> unmodified. No `docs/architecture/*` file was edited to do this — the
> resolution record is the authoritative cross-reference, following the
> same pattern as the Closing Integrity Amendment (Phase 2, above). Both
> the resolution record and the BDS itself are now **✅ Accepted** —
> scoped to business specification and architectural decisions only, per
> each document's own "Product Architect Acceptance" section.
> Implementation is not authorized by this Acceptance. Four items remain
> explicitly open, unaffected by Acceptance, pending separate Product
> Architect decisions before implementation planning: plan names/tier
> structure, pricing, payment processor vendor selection, and
> legacy-migration mechanics (see the BDS's own "Explicitly Left Open"
> section).

> **Update — Module #19 Governance Stack and Specification Rewrite
> (v2.0):** since the note above was written, Module #19 gained a full
> governance layer sitting above the BDS itself: [BDR-0001](./19-subscription-philosophy.md)
> (Subscription Philosophy), [BDR-0002](./19-value-realization-framework.md)
> (Value Realization Framework), [BDR-0003](./19-trial-experience-framework.md)
> (Trial Experience Framework), [BDR-0004](./BDR-0004-customer-communication-architecture.md)
> (Customer Communication Architecture, platform-wide), the complete
> [POL-19-001](./19-pol-001-trial-activation-policy.md) through
> [POL-19-008](./19-pol-008-subscription-notification-policy.md) Planned
> Policy Series, and the [BDR/Policy Document Framework](./19-governance-bdr-policy-framework.md)
> establishing that hierarchy. The [Specification Alignment Amendment](./19-specification-alignment-amendment.md)
> then found two direct conflicts between that governance stack and the
> original BDS text (trial duration wording, trial-expiry model) and
> authorized a full rewrite. `19-subscriptions.md` is now **Version 2.0**,
> rewritten in full from the governance stack above — Version 1.0 is
> retired, retained only in git history. Scope, ownership binding
> (`businessId`), `MAX_SHOPS_PER_OWNER` non-modification, and the
> "Explicitly Left Open" items are unchanged by the rewrite. **Still ✅
> Accepted** — business specification and architectural decisions only;
> implementation is not authorized by the rewrite. A downstream
> [Implementation Plan](../engineering/19-subscriptions-implementation-plan.md)
> now also exists (`docs/engineering/`) — planning only, recommending
> Phase 1 (Foundations) as "ready after minor preparation" and Phases
> 2–6 as not ready; it does not itself authorize any implementation.

> **Update — Implementation Status:** Module #19 Phase 1 (Foundations)
> was subsequently authorized separately, implemented, verified, and
> formally closed (`docs/engineering/19-phase1-closeout.md`, commit
> `4d9d34b`, pushed). The `subscriptions/{businessId}` data model,
> `firestore.rules` match block, and Business Provisioning Orchestrator
> now exist in `src/` and `server/`. Phase 2 (Trial Engine) — decisions
> recorded in `19-phase2-trial-engine-decisions.md` — remains
> unauthorized for implementation.

> **Note on Module #18 (SuperAdmin):** a documentation-analysis
> readiness review checked `18-superadmin.md` against Module #17's and
> Module #19's Accepted rules, Module #20's Accepted rules, the
> SuperAdmin architecture sections, the tenant isolation principle,
> audit requirements, and the platform-aggregate boundary — no
> contradictions found. The BDS's `businessId`-keyed subscription
> integration (9.4) matches Module #19's Accepted binding; its
> aggregate-only notification consumption (9.9) matches Module #20's
> Accepted boundary; its access model (`platform_operators/{uid}`,
> distinct from `users/{uid}`) does not reuse Owner/Manager tenant
> access patterns. The BDS's obsolete "Sequencing note for the record"
> (an earlier flagged tension between a prior `HANDOFF.md` build order
> and Architecture §13.2/13.6) has been replaced with this module's own
> settled dependency statement: **#19 and #20 must be implemented and
> provide real data before #18 runtime implementation begins.** **✅
> Accepted** — business specification, domain rules, security
> boundaries, dependency definitions, and audit requirements only, per
> the BDS's own "Product Architect Acceptance" section. Implementation
> is not authorized by this Acceptance. No `src/`, `server/`,
> `firestore.rules`, collection, schema, or migration has been touched.

> **Note on build order (#18/#19/#20):** the discrepancy flagged
> previously — a prior HANDOFF.md version stating `#17 → #18 → #19 →
> #20` — is resolved by explicit Product Architect direction, consistent
> with Architecture §13.2 (rule 1) and §13.6 (SuperAdmin blocked on
> Phase 1 data): **`#19 (Subscriptions) → #20 (Notifications) → #18
> (SuperAdmin)`**. Module numbering is not dependency ordering. This
> supersedes any prior numeric-order assumption in this repo's history.
> As of this update, **Module #17, #19, #20, and #18 are all
> ✅ Accepted/Approved** at the documentation & business-rules stage —
> implementation is not authorized for any of them. Reaching this stage
> for #18 is not itself implementation authorization for #18, #19, or
> #20; each still requires its own separate, explicit go-ahead per
> Rule 8, and #18's implementation additionally waits on #19 and #20
> holding real data (Architecture §13.2/13.6) before its own runtime
> build work on 9.4/9.9 can meaningfully begin.

---

## The Discipline This Series Protects

**Architecture → Standards → Specifications → Implementation.** Each spec
in this series is written *after* the module's place in Architecture is
already settled and *before* any implementation work is proposed for it —
never the reverse. A module reaching Phase 0 implementation work
(Development Strategy, Section 13) without an approved spec here is a
process gap worth flagging when it's noticed, not a shortcut to take
quietly.
