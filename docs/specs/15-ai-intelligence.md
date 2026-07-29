Business Domain Specification

# AI Intelligence

Version 1.0
**Status:** Drafted, awaiting approval
**Module #15 of 20 — Phase 3: Insight & Decision Support**
**Architecture references:** [Section 3.15](../architecture/03-domain-architecture.md)
(AI domain — "predictive and diagnostic intelligence: capital
forecasting, business worth prediction, dead-stock detection, risk
detection, recommendations... an AI output is a labeled prediction,
never a fact"), [Section 10](../architecture/10-ai-architecture.md)
(full feature design — Capital Forecasting 10.2, Business Worth
Prediction 10.3, Inventory Health 10.4, Dead Stock Detection 10.5, Risk
Detection 10.6, Recommendations 10.7, Business Intelligence Summary
Layer 10.8, cross-tenant model-quality boundary 10.9), [Section 4.11](../architecture/04-system-architecture.md)
(server-side-only invocation — "never a client-side call to the AI
provider, since that would require shipping an API key to every
browser session"), [Section 8](../architecture/08-module-architecture.md)
line 29 ("Notifications, Subscriptions, SuperAdmin, AI, and Analytics
have no module yet... out of scope for Section 8"), and the same
section's own forward notes on Dashboard (line 231: "AI Insight
summary card... an additive card once Phase 3 AI features ship") and
Reports (line 165: "a new 'AI Insight' card type alongside the
existing report types, written by the privileged server/Background
Worker")
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the Calculation Engine every AI feature reads from read-only, per
10.1's "never merged into or silently influencing an actual historical
figure" · [Reports (spec #12)](./12-reports.md), whose own report-type
system is where every AI output (except Risk Detection) is designed to
surface · [Business Timeline (spec #13)](./13-business-timeline.md),
one of the three domains 3.15 names as an AI read source ("Inventory,
Financial, Timeline")
**Implementation:** None. `@google/genai` (`^2.4.0`) is listed in
`package.json`'s dependencies but has zero import sites anywhere in
`src/` or `server/` — confirmed by direct search, not assumed.
`server/index.ts` (149 lines, read in full) exposes exactly four
routes, all staff-account-management (`/api/staff/delete`,
`/suspend`, `/reactivate`, `/reset-pin`) plus a health check — no AI
endpoint exists, despite Section 4.11/10.1 requiring server-side-only
invocation. `firestore.rules` contains no collection, path, or rule
for AI insights of any kind. No component, type, or context function
anywhere in the codebase references an AI-related identifier. This is
consistent with Architecture: Section 13's own Development Strategy
places "AI Features" in Phase 3, gated behind Phase 1 (Subscriptions/
Notifications/Background Worker) and Phase 2 (SuperAdmin, specifically
Feature Flags 9.5 as "the AI rollout mechanism") — neither of which
exists in this codebase yet either.

---

## Purpose

Establish the business specification for AI Intelligence — the domain
Architecture Section 3.15 and Section 10 fully designed as the
platform's "predictive and diagnostic" layer on top of the historical
Business Worth data every other module already records — so that when
Phase 3 build work eventually begins, engineering has one settled
contract to build against instead of re-deriving scope from Section 10
directly. Unlike modules #1–13, which documented a real, already-built
module, this spec documents a **fully-architected, entirely unbuilt**
domain: every claim below traces to Architecture text or to a verified
absence in the current codebase, never to code that exists today.

## Business Problem

The target Admin (Architecture Section 1) already gets an accurate
picture of where their business stands *today* — Dashboard, Reports,
Timeline, Closings all answer that. None of them answer forward-
looking questions the Admin currently has no way to get except by
guessing: "where is my capital heading," "what would my next Closing
look like if I closed today," "is any of my stock quietly going dead,"
"did something just happen that looks wrong." AI Intelligence exists
to answer exactly those, without ever contaminating the historical
record those other modules protect — Principle 2.4 (cited throughout
Section 10) is explicit that "an AI forecast is not a fact," so this
domain's entire design is structured around producing clearly-labeled
predictions that sit alongside, and never merge into, real figures.

## Users

- **Admin (Owner):** the sole intended audience for every feature in
  this spec. Section 10 designs all seven features (10.2–10.8) as
  per-business insight for the business's own owner — no feature
  reads or exposes cross-tenant specifics to any Admin.
- **Manager/Staff:** not addressed anywhere in Section 10's feature
  designs. Section 6's Permission Matrix (cited in spec #12/#13 for
  Reports/Timeline) has no AI row today — this spec does not invent
  one, consistent with "never invented or assumed."
- **SuperAdmin/Developer:** not a user of this domain's *outputs* —
  Section 10.9 fixes their only relationship to it as the operator of
  the shared, anonymized `platform_aggregates` layer that may improve
  cold-start defaults, never as a consumer of any business's specific
  prediction.

## User Stories

- As an Admin, I want a projected range for where my capital is
  heading over the coming period, so I can plan without waiting for a
  Closing to find out in hindsight (10.2).
- As an Admin, I want to see what my Business Worth would be "if I
  closed today," so I can gauge my current position without performing
  an actual Closing (10.3).
- As an Admin, I want to be told when specific stock has sat unsold far
  longer than my own normal pattern for it, so I can act before that
  capital is fully lost (10.5).
- As an Admin, I want to be notified when something breaks sharply from
  my own historical pattern — an unusual Withdrawal spike, a Quebra
  spike — so I can investigate while it's still actionable (10.6).
- As an Admin, I want a concrete next action tied to a flagged insight
  (e.g., a pre-filled Stock Count for a dead-stock candidate), so I
  don't have to translate the insight into an action myself (10.7).
- As an Admin, I want every AI-generated figure or flag to be
  unmistakably labeled as a prediction, so I never confuse it with a
  real, recorded figure (10.1, Principle 2.4).

## Business Rules

**Every output is a labeled prediction, never a fact — this is the one
rule every feature must obey, not a style preference**
- Section 10.1 states this as the governing constraint for the entire
  section: an AI output is written as "a new, distinctly-typed Report
  entry (8.9) or Notification (4.9) — never merged into or silently
  influencing an actual historical figure." A visible "Prediction" /
  "AI Insight" label is "a structural requirement, not a styling
  choice."
- No implementation exists today to check this rule against — this is
  a forward requirement, not a verified-passing one, unlike the
  equivalent rules in specs #1–13.

**Server-side invocation only**
- Section 4.11/10.1: AI calls run "server-side only — the privileged
  server or the Background Worker — never a client-side call to the
  AI provider, since that would require shipping an API key to every
  browser session." Verified: `server/index.ts` today has no AI route
  of any kind, and no Background Worker exists in this codebase yet
  either (its own precondition, Development Strategy Phase 1, is
  unbuilt).

**Per-business isolation, with one narrow, explicit exception**
- Section 3.15/10.9: every feature reads "that business's own data
  exclusively." The single legitimate cross-tenant use is improving
  Dead Stock Detection's (10.5) cold-start default for a business with
  no history yet, and platform-wide recalibration of Risk Detection's
  (10.6) anomaly thresholds "applied identically to everyone, not a
  per-business override" — never one specific business's data
  informing another specific business's forecast, prediction, or flag.

**AI never writes to core modules directly**
- Section 10.7: a Recommendation is "linked to the concrete action it
  recommends... the Admin always takes the action through the existing
  module's normal flow, AI never writes the record itself." This
  extends the same boundary Section 8.9 already established for
  Reports ("no calculation logic of its own") to this domain.

## Functional Requirements

*None of the following exist in the current codebase. Each is stated
as Architecture already designed it (Section 10), for engineering to
build against — not a description of current behavior.*

1. **Capital Forecasting (10.2):** project a capital/Business Worth
   trajectory range (not a single point figure) over an upcoming
   period, from that business's own Closing history, Stock Batch
   cadence, and Expense/Withdrawal trend. Written as a new Report entry
   type (8.9) with a confidence indicator and covered date range.
2. **Business Worth Prediction (10.3):** a "closed today" Business
   Worth figure from currently-open Stock Batches' `isEstimate: true`
   Embedded Profit and not-yet-closed current-period Expenses/
   Withdrawals, visually distinguished from an actual Closing snapshot.
3. **Inventory Health (10.4):** a composite, drill-down-capable set of
   flags (turnover pace, concentration risk, breakage-rate trend) from
   Stock Batch cadence, Quebra frequency/value, Purchase Batch history
   — never a single opaque score with no traceable source Report.
4. **Dead Stock Detection (10.5):** flag specific Stock Batches open
   far longer than that product's/business's own typical pattern, each
   flag linking to the concrete batch and days-past-typical. May use an
   aggregate default threshold only for a brand-new business with no
   pattern of its own yet.
5. **Risk Detection (10.6):** flag anomalies against that business's
   own historical pattern (Withdrawal spike, Quebra spike, a Closing
   breaking sharply from trend) as a `type: 'ai_risk_signal'`
   Notification (4.9) — the one feature whose natural output is a
   notification, not a Report, since a risk signal is time-sensitive.
6. **Recommendations (10.7):** synthesize 10.4–10.6's outputs into a
   concrete, linked next action (a pre-filled Stock Count, a pre-filled
   Quebra entry) — never an action outside Worth-First scope, and
   never auto-executed.
7. **Business Intelligence Summary Layer (10.8):** one consistent "AI
   Insights" presentation surfacing in Reports (8.9) and as a Dashboard
   summary card (8.14) — no new data of its own, purely a presentation
   layer over 10.2–10.7.

## Non-functional Requirements

**Localization**
- Every prior module in this series (1–13) enforces pt/en/fr coverage
  via the existing i18n layer (Dashboard spec's own Acceptance
  Criteria: "Every string is sourced via the i18n layer and renders
  correctly in all three supported languages"). Section 10 does not
  discuss localization at all — a real gap in the Architecture, not
  something this spec can resolve by inventing a rule Section 10 never
  stated. Flagged here as a decision Section 10 (or an amendment to it)
  needs to make before build, not assumed silently either way.

**Performance**
- Section 10.9/13's own forward notes place AI computation on the
  Background Worker "as a periodic job rather than a per-request
  cost" — this is an architecture decision already made, not open for
  this spec to relitigate, but is worth restating since it directly
  shapes what "non-functional" means here: latency budgets are
  per-scheduled-run, not per-page-load.

**Security**
- Section 4.11/10.1's server-only boundary is the entire security model
  for this domain's provider calls — no API key of any kind may ever
  reach a client bundle. Section 10.9/4.10's aggregation-boundary rule
  ("the two data paths must never merge") is the security model for
  cross-tenant isolation specifically.

## KPIs

*Architecture does not define KPIs for this domain — Section 10.10
explicitly scopes out "evaluation methodology" as implementation
detail, not architecture. Listed here are the two outcome-level
signals Section 10's own feature purposes imply, not a Section 10
citation:*
- Whether Admins act on a Recommendation (10.7) through its linked
  concrete action, since 10.7's own stated value is "reducing the
  Admin's own decision-making effort" — a Recommendation nobody acts on
  isn't delivering that value regardless of model quality.
- Whether Dead Stock Detection (10.5) and Risk Detection (10.6) flags
  correlate with an Admin's own subsequent action (a Quebra write-off,
  a Stock Count) — the clearest available signal that a flag was
  actually useful versus noise.

## Future Enhancements

*Ideas — not implementation, and doubly speculative here since the
base domain itself is unbuilt.*

- Section 13's own sequencing note: "likely Dead Stock Detection
  (10.5) and Business Worth Prediction (10.3) [ship first]... since
  both require no new data collection, before Risk Detection (10.6),
  which benefits from more historical data to tune against" — a
  build-order suggestion, not a requirement, worth preserving here for
  whoever schedules the actual work.
- Resolving the localization gap named above (Non-functional
  Requirements) before any feature ships, given every other module in
  this series treats pt/en/fr coverage as a hard requirement.

## Acceptance Criteria

*Every item below is a precondition for future build, not a
currently-passing check — none of them can be checked against today's
codebase, since none of this domain exists yet.*

- [ ] Every AI-generated figure or flag carries a visible "Prediction"
      / "AI Insight" label, per the Design System's Notifications
      badge treatment, and is never styled to resemble a real,
      recorded figure (10.1).
- [ ] No AI computation is ever invoked from client-side code — every
      call to the model provider originates from `server/index.ts` (or
      its eventual Background Worker successor), never from `src/`.
- [ ] No feature's per-business output (a forecast, a flag, a
      Recommendation) is ever computed using another specific
      business's data — the only cross-tenant read is the shared,
      anonymized aggregation layer, and only for the two narrow cases
      10.9 names (cold-start default, platform-wide threshold
      recalibration).
- [ ] Every Recommendation (10.7) links to its concrete action through
      the existing module's own normal write path — AI itself never
      creates a Stock Count, Quebra, or any other record directly.
- [ ] Localization coverage (pt/en/fr) for every AI-facing string is
      resolved as an explicit decision before build, not left
      unaddressed the way Section 10 currently leaves it.
