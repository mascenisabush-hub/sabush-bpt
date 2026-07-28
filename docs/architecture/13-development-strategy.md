# Section 13 — Development Strategy

**Status:** ✅ Approved
**Depends on:** Sections 1–12 — all approved.
**Purpose:** Every prior section named something and explicitly handed it to Section 13 rather than deciding it itself — an implementation rename (6.1), a context split (8.13), a data-maturity gate (10.10), a trigger condition instead of a date (11.7), a control rollout order (12.8). Section 13's job is not to invent new work — it is to take every one of those named-but-deferred items and put them in the one order that lets each phase supply what the next phase needs, per the brief's instruction that **each phase must prepare the next**.

This section does not repeat the separately-delivered audit. It uses the audit's findings only as they've already been absorbed into Sections 1–12 — the unbounded-listener risk (11.3), the `AppContext` size risk (8.13), the correct-but-undocumented privileged-server pattern (2.9), the design-system discipline (2.11) — and sequences the work those findings already produced.

---

## 13.1 The Complete List of What This Section Must Resolve

Stated up front, so nothing is silently dropped. Every item below was explicitly named as "Section 13's job" somewhere in Sections 5–12:

| # | Item | Named in |
|---|---|---|
| 1 | Rename `'owner'` → `'admin'` in code (`UserRole`, `isOwnerOf`, `ownedBusinessIds`) | 6.1 |
| 2 | Manager-tier (`staffTier`) migration, UI surfacing | 6.3, 8.11, 6's forward note |
| 3 | `AppContext` decomposition — when `NotificationContext`/`SubscriptionContext` actually get created | 8.13 |
| 4 | Storage upload flow (product photos) | 4.7, 8.4 |
| 5 | `status: 'closed'` flag + UI for closing a Business | 7.9, 8.12 |
| 6 | Legal-deletion basis / data-export format decision | 7.9 (explicitly: "product/legal decision, not a data-architecture one") |
| 7 | Subscription-trial record creation at Registration | 5.2 |
| 8 | Business Growth gating (5.9) going live | 5.9 |
| 9 | Full SuperAdmin application build | Section 9, all of it |
| 10 | Which AI features (10.2–10.7) ship first | 10.10, 10's forward note |
| 11 | Scale-tier fixes (11.6's table) — sequenced by trigger, not calendar | 11.7 |
| 12 | Security controls: MFA enforcement, CI secret-scan, RTO restore drill | 12.8 |
| 13 | Purchase Batch numbering moving server-side | 8.3, 11.4 |

Every phase below is built by grouping these thirteen items according to actual dependency, not by the order they happen to appear across Sections 5–12.

---

## 13.2 Sequencing Principles

Three rules govern every ordering decision in this section, so the phase order below is a consequence of stated logic, not a preference:

1. **A phase only starts once every domain it reads from has real data, not a mock.** This is the single reason SuperAdmin (Phase 2) cannot come before Subscriptions/Notifications (Phase 1) — Section 9 says so directly (9's forward note: "Notifications, Subscriptions must exist before 9.4/9.9 have real data to show"), and building a billing screen against nothing to bill would mean rebuilding it once real subscriptions exist.
2. **Cheap, non-blocking, low-risk items move to the front regardless of theme**, because delaying them only accumulates cost with no offsetting benefit (Principle 2.6 in reverse — the same discipline that says don't over-build in advance also says don't defer a cheap fix that gets more expensive to retrofit the longer other code is written against the old shape). The `'owner'`→`'admin'` rename (item 1) and the `AppContext` boundary rule (item 3, the *rule*, not the contexts themselves) are the clearest cases: every day of new code written against `isOwnerOf` or a monolithic `AppContext` is a day of extra rework later.
3. **Trigger-based work (item 11) is never phase-scheduled by date.** Section 11.7 fixed this explicitly: these are measured thresholds (query latency, worker-run duration, tenant count), and scheduling them on a calendar would violate the same principle that says not to under-build. Section 13.8 below states the *policy* for handling them, not a date.

---

## 13.3 Phase Sequence Overview

```
PHASE 0                PHASE 1                 PHASE 2              PHASE 3
Foundation      ──►     Platform Backbone ──►   SuperAdmin    ──►    AI Features
Hardening               (Subscriptions +        Application         (staged via
(cheap, parallel,       Notifications +                             Feature Flags
non-blocking)           Background Worker)                          from Phase 2)

                                                                            ▲
        PHASE 4 — Scale-Triggered Work (runs in parallel with all of the above,
                   activated by measured thresholds, not calendar dates — 13.8)
```

Phase 4 is drawn separately because it is not a stage — it is a standing policy that runs alongside every other phase, per 13.2's third rule.

---

## 13.4 Phase 0 — Foundation Hardening

**Why first:** every item here is either a prerequisite that makes a later phase cheaper (the rename, the `AppContext` rule) or a control that protects the platform *now*, before tenant count or code surface grows further — deferring either kind only makes it more expensive later, without buying anything by waiting (13.2, rule 2). Nothing in this phase depends on a domain that doesn't already exist.

**Contents:**

- **`'owner'` → `'admin'` rename (item 1).** A mechanical rename across `UserRole`, `firestore.rules` (`isOwnerOf`), and `AppContext` (`ownedBusinessIds`) — zero behavior change, but every one of Phases 1–3 will add new code that would otherwise need to keep choosing between the old and new vocabulary. Doing it now means every phase after this one is written against the final names once.
- **`AppContext` decomposition rule enforced from this point forward (item 3, the rule only).** Section 8.13 already fixed that `NotificationContext` and `SubscriptionContext` must be separate slices, never appended to `AppContext` — that rule takes effect now, even though the contexts themselves aren't created until Phase 1 needs them. This prevents Phase 1 from being tempted to take the "just append it" shortcut under its own delivery pressure.
- **Manager-tier (`staffTier`) migration (item 2).** Additive, defaults every existing account to `'staff'`, touches no Security Rule that isn't already correct in shape (6.3). Ships whenever convenient inside this phase — it unlocks staff delegation (Closings performed by a trusted Manager) independent of every other phase, so there's no reason to wait for it.
- **Storage upload flow — product photos (item 4).** Independent of every other domain; the scoping rule (`businesses/{businessId}/products/{productId}/...`, secured off the same `users/{uid}` identity Firestore rules already use) was fixed in 4.7/8.4. No dependency on Phase 1–3, so it's scheduled here purely because it's ready and low-risk, not because it's urgent.
- **CI secret-scan pipeline (item 12, part 1).** Protects the AI provider key and payment-processor webhook secret from ever reaching the SPA bundle (12.5) — this control is valuable *before* those keys are even in heavy use, since the failure mode it prevents (a leaked key) gets more dangerous the more integrations depend on that key over time.
- **RTO restore drill (item 12, part 2).** Validates the stated `<4 hour` Recovery Time Objective (12.6) against an actual restore, while tenant count is still small enough that a drill carries low operational risk. Running this drill *after* thousands of businesses depend on the platform is strictly worse — same drill, higher stakes, no added information.
- **Legal-deletion basis decision (item 6) — a decision-gate, not a build item.** Section 7.9 was explicit that this is a product/legal call, not an architecture one. It's placed here as a **flag to resolve**, not a task to build: Saba (or legal counsel, if engaged) needs to decide the legal basis and export format before item 5 (the `closed` status flag and its UI) can be built, since that UI's behavior depends on the decision. If unresolved by the time Phase 1 work begins, item 5 simply waits — it blocks nothing else.

**What this phase prepares for Phase 1:** a codebase using final naming (no rework mid-Phase-1), a context-splitting discipline already in force (so `NotificationContext`/`SubscriptionContext` are created cleanly rather than retrofitted), and baseline security hygiene in place before Phase 1 introduces the platform's first real money-handling domain (Subscriptions).

---

## 13.5 Phase 1 — Platform Backbone: Subscriptions + Notifications + Background Worker

**Why this phase, and why before SuperAdmin:** Section 9 states directly that its billing screen (9.4) and its platform-notification screen (9.9) need Subscriptions and Notifications to already exist and hold real data — building SuperAdmin first would mean building UI against nothing, then rebuilding it once Phase 1 ships. Section 5.2 independently establishes *why* Subscriptions specifically can't wait past this point: a trial subscription record should be created at Business Registration, the very first lifecycle stage, so no future feature-gate check anywhere in the product ever has to handle a null subscription state as a special case.

**Build order within the phase:**

1. **Subscriptions domain (3.13) and its data model (7.4).** Plan tiers, trial/active/past-due/canceled states, the binding decision (per-Business or per-Admin — 3.13 flagged this as open; resolve it here, since every later feature-gate check depends on knowing which). Registration (5.2) is updated to create a trial record at signup.
2. **Payment processor integration (4.12).** Given the target market and regulatory context already fixed in Section 1.4 (Mozambican small/micro businesses), the practical payment rails are mobile-money-first — M-Pesa and e-Mola are the primary infrastructure this integration needs to support, not a card-first processor as the default path. This is a real scheduling risk worth naming now rather than discovering mid-phase: mobile-money API integration and any regulatory sandbox requirements (e.g., Banco de Moçambique's fintech sandbox) typically carry longer lead times than a conventional card processor, so this sub-item should be scoped and started early within Phase 1, not left to the end of it.
3. **Notifications domain (3.12) and the delivery abstraction.** In-app first (cheapest, no external dependency), with channel abstraction built to support WhatsApp delivery next — again per Section 1.4's own market fit reasoning (PT/FR localization, the target region), WhatsApp is a materially more useful channel for this admin than email.
4. **Background Worker generalized (4.8).** The existing single-process worker on Railway is extended to run Subscription renewal checks and Notification triggers on a schedule — still no Cloud Functions, still no Blaze plan, consistent with 4.1's constraint. This is the same worker infrastructure Phase 3 (AI) will later reuse for periodic per-business computation (11's own forward note confirms the worker is expected to "absorb per-business AI computation as a periodic job").
5. **`SubscriptionContext` / `NotificationContext` created (item 3, completed).** Now that both domains exist, they get their own context slices, per the rule Phase 0 already put in force — never appended to `AppContext`.

**What this phase prepares for Phase 2:** a Subscriptions domain with real trial/active/billing data for 9.4 to manage, a Notifications domain with real trigger events for 9.9 to display and for System Health (9.11) to alert through, and a generalized Background Worker that Phase 2's own scheduled platform-analytics rollups (9.8, 4.10) can run on without building a second scheduling mechanism.

---

## 13.6 Phase 2 — SuperAdmin Application

**Why here, not earlier or later:** it depends on Phase 1 for real data (13.2, rule 1) and it is itself a dependency for Phase 3 — Section 10 states plainly that every AI feature rolls out through Feature Flags (9.5), so Phase 3 cannot stage anything until Phase 2 has built that mechanism.

**Build order within the phase** (Section 9's own screen list, sequenced by what unlocks what):

1. **Application shell + internal identity (9.1, 7.4).** `platform_operators/{uid}` as a structurally separate identity space, with the MFA enforcement Section 12.1 requires for this population specifically (item 12, part 3) and the shorter session lifetime 12.7 specifies — both built in from the start of this phase rather than retrofitted, since retrofitting MFA onto existing internal accounts is a harder migration than requiring it from account creation.
2. **Platform Dashboard (9.2) and Businesses/Tenant Management (9.3).** The first genuinely useful screens once Phase 1's data exists — visibility before action, consistent with giving Support/Developer roles read access before any write-capable screen ships.
3. **Subscriptions & Billing (9.4).** Now has real Phase-1 data to operate on.
4. **Feature Flags (9.5).** Built next specifically because Phase 3 depends on it — this is the one screen in Section 9 whose completion date directly gates Phase 3's start, not just a convenience ordering.
5. **Audit Logs (9.6), with hash-chain integrity (item 12, part 4, per 12.4).** Built once there are real platform-operator actions (from steps 1–4 above) worth logging.
6. **Support (9.7), Platform Analytics (9.8), platform Notifications (9.9), Impersonation (9.10), System Health (9.11), internal account management (9.12).** The remaining screens, no strict interdependency among them — sequenced by operational priority the team sets at the time, since nothing later in this document series depends on their relative order the way it depends on Feature Flags landing before Phase 3.

**What this phase prepares for Phase 3:** Feature Flags (9.5) as the staged-rollout mechanism every AI feature needs, Audit Logs (9.6) and System Health (9.11) to observe the Background Worker once it starts carrying AI computation load, and `platform_aggregates` (9.2, 9.8) as the one legitimate cross-tenant data source AI's cold-start default (10.9) is allowed to read from.

---

## 13.7 Phase 3 — AI Features

**Why last among the four build phases:** every AI feature (Section 10) reads from domains that must already exist (Calculation Engine, Closings, Notifications) and rolls out through a mechanism (Feature Flags) that must already exist — it has no independent reason to start earlier, and starting earlier would mean shipping AI output with no way to stage it to a subset of businesses first, which 9.5's own design exists specifically to avoid.

**Feature order, by data-maturity, not by section number** (10.10's own reasoning, made concrete):

1. **Business Worth Prediction (10.3) and Dead Stock Detection (10.5) — ship together, first.** Both require zero new data collection: 10.3 reads only current open batches and unlocked Expenses/Withdrawals that already exist the moment a business has any activity at all; 10.5 reads Stock Batch open/close history that's already being recorded today. Both can be staged to a small Feature-Flagged pilot group immediately.
2. **Inventory Health (10.4).** Reuses the same Quebra/Purchase Batch data 10.5 already reads — a natural, low-marginal-cost follow-on once 10.5's pipeline exists.
3. **Capital Forecasting (10.2).** Deliberately after 10.3/10.5, not before: its inputs include Closing *history* (plural, a trend), which is meaningfully thin for any business in its first few months on the platform. Scheduled once the pilot group from step 1 has accumulated enough Closings for the forecast to be worth showing — a data-maturity gate, consistent with 11.7's "trigger condition, not a date" principle applied here to a feature rather than a scale threshold.
4. **Risk Detection (10.6).** Section 10 itself states this explicitly: it "benefits from more historical data to tune against" — scheduled after 10.2/10.3/10.5 have been live long enough across the pilot group to establish what "normal" looks like per business, since an anomaly detector tuned on too little history produces false positives that would actively undermine trust in every other AI feature shipped alongside it.
5. **Recommendations (10.7).** Structurally must come after 10.4–10.6, since it's explicitly a synthesis feature with no independent data source of its own (10.7's own text) — it has literally nothing to synthesize until they exist.
6. **Business Intelligence summary layer (10.8).** Ships last — it's a presentation layer unifying the above, and unifying fewer than two or three live features into "one consistent surface" isn't yet solving the coherence problem 10.8 exists to solve.

**Rollout mechanism throughout:** every feature above ships behind a Feature Flag (9.5) to a small subset of businesses first, consistent with 9.5's existing design and 10's own forward note — this phase does not introduce a second rollout mechanism.

**What this phase closes out:** this is the last of the four build phases named by the brief's Sections 1–12; nothing downstream in this document series (14, 15) depends on a specific AI feature's completion, only on the process (Feature Flags, staged rollout) being in place.

---

## 13.8 Phase 4 — Scale-Triggered Work (Ongoing, Parallel to All of the Above)

**Policy, not a schedule:** Section 11.7 fixed that every item in the 11.6 summary table is a measured trigger, not a calendar date, and named deciding *when to build ahead of a threshold versus reactively* as specifically Section 13's job. The policy:

- **Default to reactive** — build the fix when the trigger condition is measured, not before, per Principle 2.6. This is the default for every row in 11.6's table.
- **Exception: build proactively only when a phase above will plausibly cross the trigger during its own rollout window regardless.** Concretely, one case in this document series already meets that bar: if Phase 1–2's rollout (Subscriptions, Notifications, SuperAdmin) brings on enough pilot/early businesses that any single long-lived business's `batches`/`timelineEvents` collection is likely to cross the pagination trigger (11.3) within that same rollout window, Reports/Timeline pagination should be built as part of Phase 1 rather than waited on reactively — building it twice (once naively, once paginated) costs more than building it once, correctly, slightly early.
- **Every other row in 11.6** — Purchase Batch numbering going server-side (item 13, 11.4's trigger), Background Worker job-type splitting (11.4/11.5's trigger), aggregate-read caching (11.4/11.5's trigger), platform-collection composite indexing (11.4's trigger), full observability (11.5's trigger) — stays reactive, monitored via System Health (9.11, built in Phase 2) and Audit Log volume (9.6), and actioned only once its specific measured trigger fires.

**Ownership:** System Health (9.11) is the concrete mechanism that makes "reactive" actually mean "monitored," not "forgotten" — this is precisely why Phase 2 (which builds 9.11) had to exist before Phase 4's reactive policy could be trusted to work in practice.

---

## 13.9 Cross-Cutting Threads That Run Through Every Phase

Two items don't belong to any single phase because they're properties every phase must maintain, not tasks any one phase completes:

- **Design System Discipline (Principle 2.11).** Every new surface in Phases 1–3 — SuperAdmin's screens, Subscription/billing UI, AI Insight cards — must use existing design tokens or propose an explicit, documented extension to `DESIGN_SYSTEM.md` before shipping. This isn't a Phase 0 task with a completion date; it's a gate every phase's own screens pass through.
- **Security control rollout beyond Phase 0/2 (item 12, remainder).** MFA and CI secret-scanning are placed structurally in Phases 0 and 2 above because they have a natural home there, but the broader posture Section 12 describes — server-verified privileged actions (2.9), tenant isolation via nesting (7.1), cache-key scoping (12.3) — is a standing constraint every phase's own Security Rules changes must satisfy, checked at the time each phase's rules are written, not audited once at the end.

---

## 13.10 Master Sequencing Table

| Phase | Contents | Blocks / Enables |
|---|---|---|
| 0 — Foundation Hardening | Rename, `AppContext` rule, Manager tier, Storage uploads, CI secret-scan, RTO drill, legal-deletion decision-gate | Nothing downstream depends on Phase 0 *content* completing, but every later phase is cheaper for having it done first |
| 1 — Platform Backbone | Subscriptions + trial-at-Registration, payment processor (M-Pesa/e-Mola priority), Notifications, generalized Background Worker, new Contexts | **Blocks Phase 2** — 9.4/9.9 need this data to be real |
| 2 — SuperAdmin | Shell/MFA, Dashboard, Tenant Mgmt, Billing, **Feature Flags**, Audit Log, Support, Analytics, Notifications (platform), Impersonation, System Health | **Blocks Phase 3** — Feature Flags is the AI rollout mechanism; System Health is what makes Phase 4's reactive policy trustworthy |
| 3 — AI Features | 10.3+10.5 → 10.4 → 10.2 → 10.6 → 10.7 → 10.8, each staged via Feature Flags | Closes out the four build phases named by Sections 1–12 |
| 4 — Scale-Triggered | 11.6's table, reactive-by-default per 13.8's policy | Runs continuously alongside 0–3, not sequenced after them |

---

## 13.11 What Could Reorder This

Stated explicitly so a future deviation from this order is a documented decision, not silent drift:

- **If the legal-deletion basis (item 6) is resolved unusually early**, item 5 (`closed` status + UI) can move into Phase 0 rather than waiting — it was placed after the decision-gate, not after any other phase's work.
- **If the payment processor integration (13.5, step 2) proves to have a materially longer regulatory lead time than the rest of Phase 1** (a real risk named explicitly in 13.5, given Mozambique's fintech sandbox process), Notifications (13.5, step 3) can proceed in parallel rather than waiting on it — the two have no dependency on each other within Phase 1, only Subscriptions gates SuperAdmin's billing screen specifically.
- **If a Phase 4 trigger fires early** (e.g., a single very active pilot business crosses the pagination threshold during Phase 1, faster than anticipated), 13.8's proactive-exception clause applies immediately rather than waiting for Phase 1 to formally conclude.

---

## What Sections 14–15 Will Build On This

- **Section 14 (Future Roadmap)** will describe how Sabush BPT evolves over five years without losing focus (per the brief) — it can build directly on this section's phase structure to describe *not just what* comes next but *in what order and why*, extending the same reasoning past Phase 4 rather than starting a new framework.
- **Section 15 (Architecture Validation)** will apply its "why is this needed / what happens if we don't" test to every phase-ordering decision made here, the same way it will for every other section's decisions.

**This section requires your explicit approval before Section 14 (Future Roadmap) begins.**
