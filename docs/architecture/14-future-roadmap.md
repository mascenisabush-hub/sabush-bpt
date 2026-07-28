# Section 14 — Future Roadmap

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–13 — all approved.
**Purpose:** Show how Sabush BPT evolves over five years without losing focus (per the brief). This section does not introduce a new planning framework — it extends Section 13's phase structure (Phase 0 → 1 → 2 → 3, plus the standing Phase 4 scale-triggered policy) past its own horizon, using Section 11's scale tiers (100 / 1,000 / 10,000 / 100,000+) as the year-over-year backbone, since those tiers are already the Mission's own stated scale target, not a roadmap invention.

Every year below is checked against the same test every prior section has used: **does this increase the admin's understanding of business worth, capital, or financial health** (Principle 2.2). A year that would fail that test for the sake of "enterprise readiness" or "competitive parity" is flagged explicitly as out of scope in 14.7, not quietly included because it sounds reasonable in isolation.

---

## 14.1 How This Section Reads the Five-Year Mandate

The brief asks for five years of growth "without losing focus" and explicitly forbids the roadmap turning into a POS. Section 1.8 already made the argument for *why* that discipline matters; Section 14's job is narrower — show the roadmap doesn't require breaking it, at any point between today and 100,000+ businesses.

Two things the Mission names as scale targets deserve direct attention because they're the two most likely to *tempt* scope drift if handled carelessly:
- **Enterprise customers** — handled in 14.6, because "enterprise" is the single word most likely to be used to justify an ERP-style feature ("our enterprise customer needs invoicing"). 14.6 states explicitly what "enterprise-ready" means here and what it deliberately excludes.
- **Millions of products / 100,000+ businesses** — already the subject of Section 11 in full; this section only maps *when* each tier is expected to matter, not how to survive it (Section 11 already answered that).

---

## 14.2 Year 1 — Consolidation (Phases 0–3 Land)

**What happens:** This year is Section 13's Phase 0 through Phase 3, executed in full — foundation hardening, the Subscriptions/Notifications backbone, the SuperAdmin application, and the first wave of AI features (Business Worth Prediction, Dead Stock Detection, Inventory Health, then Capital Forecasting and Risk Detection as data matures). Nothing in Year 1 is new relative to Section 13; this entry exists only to anchor the five-year view at its actual starting point.

**Scale tier expected:** 100 → low end of 1,000 (Section 11.2–11.3). Reports/Timeline pagination (11.3's trigger) is plausible by the end of this year if Phase 1's rollout brings on enough early businesses, per 13.8's proactive exception.

**Worth-First check:** Trivially passes — every item in this year is already-approved work from Sections 1–13.

---

## 14.3 Year 2 — Deepening: Multi-Shop Growth and AI Maturity

**What happens:**
- **Business Growth (5.9) becomes a real, tested path**, not just a designed one — admins who started with one shop actively add a second, third, up to the existing 10-shop cap (3.2). This is the year the multi-shop UX (`ShopSwitcher`, 8.12) gets real usage pressure for the first time, not just design validation.
- **Manager tier (6.3) reaches normal usage** — businesses with enough staff to want a delegated Closing-performer are now common enough that this isn't a novelty feature anymore.
- **Recommendations (10.7) and the Business Intelligence summary layer (10.8) ship** — the last two AI features from Section 10's ordering (13.7), now with enough live history across 10.2–10.6 to synthesize from.
- **The Storage upload flow (product photos, 4.7/8.4) and any deferred Phase-0 items that slipped** are fully live and unremarkable by this point.

**Scale tier expected:** Solidly 1,000, approaching 10,000 (Section 11.3–11.4) for the platform's earliest and most active tenants. Purchase Batch numbering moving server-side (11.4's trigger) becomes a live, not hypothetical, concern for the platform's most active individual businesses.

**Worth-First check:** Multi-shop growth and Manager delegation both directly extend the Mission's own "multi-shop businesses" and "multiple staff" scale targets (Mission, opening brief) — neither adds a feature outside Worth tracking, both make Worth tracking usable at a larger organizational scale.

---

## 14.4 Year 3 — Scale Validation

**What happens:** This is the year the platform is expected to genuinely cross the 10,000-business tier (Section 11.4), not just approach it. Per Section 13.8's reactive-by-default policy, the concrete engineering response is triggered by measurement, not by this document — but this year is when those triggers are *likely* to fire, based on the growth trajectory Years 1–2 establish:
- Background Worker job-type splitting (11.4's 50%-of-interval trigger) — plausible this year if notification-trigger, subscription-check, and aggregation-rollup logic is still running as one process.
- Short-lived in-memory caching for `platform_aggregates` reads (11.4) — feeding SuperAdmin's Dashboard (9.2) and Platform Analytics (9.8), both under real load for the first time.
- Composite indexes on platform-level collections (`platform_audit_log`, 11.4) — the Audit Log (9.6) has enough real platform-operator activity by now that its own filter UI needs them.

**AI's cross-tenant model-quality use (10.9) becomes genuinely useful for the first time** — enough businesses now exist that Dead Stock Detection's cold-start default (10.5) and Risk Detection's platform-wide threshold recalibration (10.6) have a meaningful aggregate pattern to draw from, still exclusively through the `platform_aggregates` boundary (4.10), never a direct cross-tenant read.

**Scale tier expected:** 10,000, confirmed under real load (11.4), not just theoretically designed for it.

**Worth-First check:** Nothing in this year is a new feature — it is Section 11's already-approved engineering response to real growth, exactly as 13.8 described it would be triggered.

---

## 14.5 Year 4 — Enterprise Readiness, Precisely Scoped

**This is the year most likely to be misread as "add ERP features," so it is stated with maximum precision.** The Mission names "enterprise customers" as a scale target in the same breath as "100,000+ businesses" and "AI features" — this section treats it as a **scale and trust** target, not a feature-breadth target, consistent with Section 1.6's positioning (Sabush BPT sits *alongside* a POS or accounting system a larger business already runs, never replacing it).

**What "enterprise-ready" means here — the concrete, in-scope work:**
- **Higher shop-count ceiling than the current 10-shop cap (3.2/5.9)**, if real demand from multi-location businesses justifies it — a configuration change to an existing, already-designed cap, not new architecture.
- **Read-only API / data export for the enterprise's own systems** — a business already running its own ERP or accounting stack can pull Business Worth, Capital, and Embedded Profit figures out of Sabush BPT programmatically, positioning Sabush as the complementary Worth-tracking layer Section 1.6 already describes, rather than asking the enterprise to abandon their existing ERP. This is the single most important enterprise feature on this roadmap, precisely because it reinforces "not an ERP" instead of eroding it.
- **Dedicated support tier, surfaced through the existing Support Session mechanism (6.5, 9.7)** — an enterprise account gets faster, more senior support attention, not a different product.
- **SSO for Admin identity**, layered on top of Firebase Auth (4.6) the same way PIN-based quick-login already is — an additional authentication *method* into the same identity model, not a parallel one.
- **Stronger contractual SLAs on the RPO/RTO figures Section 12.6 already defines** (`<1hr` / `<4hr`) — a commercial commitment on numbers the architecture already delivers, not a new capability.

**What "enterprise-ready" explicitly does NOT mean here — named directly because this is exactly where scope creep enters through a reasonable-sounding request:**
- **No sales/checkout/invoicing module**, even if a specific enterprise prospect asks for one, per Section 1.8 and Principle 2.2. The correct response to that request is the read-only API above — let their existing systems handle the transaction, let Sabush BPT handle the Worth answer neither of those systems is built to give well.
- **No payroll or HR module**, regardless of how standard it is in an enterprise-tier competitor.
- **No general-purpose CRM.**
- **No custom, per-enterprise feature branch of the product.** Every enterprise capability above is a configuration, an integration surface, or a support-tier commitment — never a forked codepath that only one customer runs, since that would violate Principle 2.5 (Scalable by Default) as directly as an ERP feature would violate Principle 2.2.

**Scale tier expected:** Approaching 100,000 (Section 11.5) for the platform overall, with a small number of individually large multi-shop enterprise tenants — the read-only API is specifically designed so a single enterprise tenant's heavier read pattern doesn't require its own bespoke scaling path, per Principle 2.12.

---

## 14.6 Year 5 — Platform Maturity at Target Scale

**What happens:** The platform is expected to be operating at or near the Mission's full 100,000+-business target (Section 11.5) by this point:
- **Shared caching (Redis) for `platform_aggregates`** goes live if Year 3–4 growth has pushed the platform past the point where per-instance in-memory caching (11.4) is sufficient — the one genuinely new infrastructure component Section 11 names, introduced only when its own trigger fires, per 11.5.
- **Full observability** (structured logging, error tracking, latency percentiles on privileged-server endpoints, 11.5) replaces the "check System Health manually" approach that has sufficed through Year 4 — necessary at this tier because manual checking no longer reliably catches a regression before it affects thousands of businesses.
- **The Cloud Functions migration question (4.1, 11.5) is revisited, not pre-decided.** Section 4.1 deliberately avoided Cloud Functions from the start because the Blaze billing plan isn't reachable from every region/card the target market operates in (Section 1.4) — Section 11.5 already named this as a live business decision to make *at* this tier, not before, and dependent on whether the target market's payment/regional constraints have themselves changed by then. This roadmap does not pre-commit either way; it names the decision point.
- **AI's cross-tenant model quality (10.9) is mature** — five years of aggregate, anonymized pattern data materially improves cold-start defaults and anomaly-threshold calibration for every new business joining the platform, without ever touching the "never a direct cross-tenant read into one business's forecast" boundary (4.10) that has held since Section 3.

**Worth-First check, applied to the whole year:** every item above is infrastructure scaling or model-quality improvement to features that already passed the Worth-First test years earlier (Sections 10, 11) — nothing here is a new customer-facing capability that needs its own scope test, which is itself evidence the platform reached its target scale without the scope drift this document series exists to prevent.

---

## 14.7 The One Thing That Does Not Change, Year 1 Through Year 5

Restated here because it is the single fact every year above depends on, and the fact this whole document series was written to protect (Section 1.8): **Sabush BPT never records a sale, never processes a transaction, and never becomes a POS, accounting ledger, or ERP — at any scale, for any customer tier, including enterprise.** Every capability in Years 1–5 either deepens the Worth answer (multi-shop, AI maturity, scale) or protects trust in that answer at larger scale (security, observability, SLAs). None of them are the exception.

**The concrete test for any future request that doesn't fit cleanly into a year above:** does it pass Principle 2.2 (Worth-First Scope)? If the one-sentence justification requires "sale," "invoice," "checkout," "payroll," or "customer transaction," it is out of scope for this roadmap, regardless of which year it's proposed in or which customer tier requests it — exactly as Section 2.2 already fixed, restated here because a five-year roadmap is precisely long enough for that discipline to quietly erode if it isn't restated at the point growth pressure is highest (Years 4–5).

---

## 14.8 Five-Year Summary Table

| Year | Primary theme | Scale tier (Section 11) | New customer-facing capability? |
|---|---|---|---|
| 1 | Consolidation — Section 13 Phases 0–3 land | 100 → 1,000 | Subscriptions, Notifications, SuperAdmin, first AI features |
| 2 | Multi-shop growth, AI maturity | 1,000 → 10,000 | Recommendations, Business Intelligence layer; Manager tier at real usage |
| 3 | Scale validation | 10,000, confirmed | None — engineering response to Section 11's measured triggers |
| 4 | Enterprise readiness, precisely scoped | Approaching 100,000 | Read-only API/export, SSO, higher shop cap, dedicated support tier — never a sales/payroll/CRM module |
| 5 | Platform maturity at target scale | 100,000+ | None new — caching, observability, and AI model-quality maturity for existing capabilities |

---

## What Section 15 Will Build On This

- **Section 15 (Architecture Validation)** applies its "why is this needed / what problem does it solve / what happens if we don't implement it" test to every year's decisions above — most directly to Year 4's enterprise scoping (14.5), since that is the year this document series is most exposed to a well-intentioned but scope-violating request, and Section 15 is where that exposure gets a final, explicit check.

**This section requires your explicit approval before Section 15 (Architecture Validation) begins — the final section of this document series.**
