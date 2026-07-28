# Section 10 — AI Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–9 — all approved
**Purpose:** Design where AI belongs — inputs, outputs, data sources, business value, per feature — never how to build the model itself. Per the brief: **do not build AI.** This section turns Section 3.15's domain scope and Section 4.11's system-level placement into concrete features Section 13 can schedule and Section 9's Feature Flags (9.5) can stage.

Every feature below is checked against the **Worth-First scope test** (Section 1) explicitly, not assumed — an AI feature that doesn't strengthen Business Worth understanding doesn't belong here regardless of how technically feasible it is.

---

## 10.1 The One Rule Every Feature Below Must Follow

Section 3.15 already fixed it; Section 10 restates it as the governing constraint because every feature design below depends on it: **an AI output is a labeled prediction, never a fact.** It is written as a new, distinctly-typed Report entry (8.9) or Notification (4.9) — never merged into or silently influencing an actual historical figure (Embedded Profit, Business Worth, a Closing snapshot). A forecast that *looked like* a real figure would violate Principle 2.4 the moment a user couldn't tell which was which, so every screen surfacing an AI output carries a visible "Prediction" / "AI Insight" label as a structural requirement, not a styling choice.

**Where it runs (per Section 4.11, restated only as the anchor for this section):** server-side only — the privileged server or the Background Worker — never a client-side call to the AI provider, since that would require shipping an API key to every browser session.

---

## 10.2 Feature: Capital Forecasting

**Purpose:** Project an Admin's likely Capital Invested / Business Worth trajectory over an upcoming period, based on their own historical pattern.

**Inputs:** That business's own Closing history (7.2, immutable snapshots — the cleanest input, since each one is already a locked, trustworthy figure), Stock Batch entry cadence, Expense/Withdrawal trend.

**Outputs:** A projected range (not a single point figure — a range communicates uncertainty honestly, which a single number does not), written as a new Report entry type (8.9) with an explicit confidence indicator and the date range it covers.

**Data sources:** Exclusively that one business's own data (a normal, tenant-scoped read, per 4.11's boundary) — never blended with cross-tenant data for the forecast itself. Cross-tenant aggregate patterns (10.9) may improve the *model*, but never enter one business's specific forecast number as a direct input, per Section 3.15's "never raw tenant data directly" and 4.10's "the two data paths must never merge."

**Business value:** Turns Sabush's core promise (understanding Business Worth) into something forward-looking, not just historical — directly serving the Mission without becoming forecasting-as-accounting (still not an ERP; this predicts, it never books a transaction).

**Worth-First scope test:** Passes directly — this is one of the Mission's own named examples.

---

## 10.3 Feature: Business Worth Prediction

**Purpose:** A near-term (e.g., next-Closing) prediction of what Business Worth will be, distinct from Capital Forecasting's longer-horizon trajectory — closer to "what will my next Closing say" than "where am I headed over months."

**Inputs:** Open (unclosed) Stock Batches' current Embedded Profit (8.2's `isEstimate: true` figures — already the app's own honest signal that these aren't final), current-period Expenses/Withdrawals not yet locked into a Closing.

**Outputs:** A single projected Business Worth figure for "if you closed today," explicitly distinguished in its own UI from an actual Closing snapshot (8.8) — same visual family as a Report, never styled to resemble the Dashboard's live figures (8.14).

**Data sources:** That business's own current, not-yet-closed data exclusively — this feature by definition cannot use cross-tenant patterns, since it's answering a question about *this business's own open state*, not a trend.

**Business value:** Answers the single most common question an Admin already asks manually ("what would my Closing look like right now") without them needing to perform a real Closing to find out — real value with essentially zero new data requirement, since every input already exists.

**Worth-First scope test:** Passes directly — this is the Mission's own named example, made concrete.

---

## 10.4 Feature: Inventory Health

**Purpose:** A composite signal — beyond a single dead-stock flag (10.5) — summarizing how "healthy" a business's current inventory position is: turnover pace, concentration risk (too much capital in too few products), breakage rate trend.

**Inputs:** Stock Batch entry/close cadence per product, Quebra frequency and value (8.5), Purchase Batch history (8.3).

**Outputs:** A composite score or short set of flags (not a single opaque number an Admin can't act on) — e.g., "3 products account for 60% of your Investment Value," "breakage rate up 15% this period" — each flag traceable back to the specific Report (8.9) that explains it, never a black-box score with no drill-down.

**Data sources:** That business's own data exclusively.

**Business value:** Surfaces a pattern an Admin would otherwise only notice by manually cross-referencing several Reports — this is squarely business-intelligence-over-inventory, not a new inventory *feature* (no new write path, no new entity — purely a derived read, consistent with 8.9's "no calculation logic of its own" rule extended to AI).

**Worth-First scope test:** Passes — inventory health is a direct input to Business Worth confidence, not an operational/POS-adjacent concern.

---

## 10.5 Feature: Dead Stock Detection

**Purpose:** Flag specific Stock Batches that have sat open far longer than that product's (or that business's) typical pattern — capital that's likely not going to convert to profit soon.

**Inputs:** Stock Batch `dateEntered`, `status` (open/closed) history per product, that business's own typical time-to-close per product category.

**Outputs:** A flagged list of specific batches (linking directly to the batch, 8.3 — never a vague "some of your stock is old" statement), each with how many days past the typical pattern it is.

**Data sources:** Primarily that business's own historical pattern (a product that always takes 90 days to close isn't "dead" at day 60); cross-tenant aggregate patterns (10.9) may inform a reasonable default threshold for a brand-new business with no history of its own yet — the one case in this section where an aggregate figure legitimately feeds a per-business output, and only as a cold-start default, never as an override of a business's own established pattern once it has one.

**Business value:** This is the Mission's own named example, and one of the clearest cases where an AI feature does something a manual Report genuinely can't (a static Report shows current state; this requires comparing against a pattern the Admin isn't tracking themselves).

**Worth-First scope test:** Passes directly.

---

## 10.6 Feature: Risk Detection

**Purpose:** Flag anomalies that suggest a real problem — an unusual spike in Withdrawals relative to history, a Quebra rate spike, a Closing figure that breaks sharply from trend.

**Inputs:** That business's own historical Withdrawal/Expense/Quebra/Closing patterns; the current period's actuals.

**Outputs:** A Notification (4.9) — this is the one AI feature type whose natural output is a notification rather than a Report, since a risk signal is time-sensitive by nature ("this needs attention now," not "here's a report to read later"). Delivered through the existing Notification delivery abstraction (4.9), typed distinctly (`type: 'ai_risk_signal'`) so an Admin can distinguish it from an operational notification (an overdue Closing reminder) at a glance.

**Data sources:** That business's own data exclusively — a risk signal about *this* business must never be influenced by another business's pattern, since that would mean flagging normal behavior as risky purely because it looks unusual relative to other tenants, which has no grounding in whether it's actually a problem for *this* business.

**Business value:** Catches the kind of thing an Admin only notices in hindsight during a Closing review — moved earlier, when it's still actionable.

**Worth-First scope test:** Passes — directly protective of Business Worth integrity, the same concern Principle 2.4 exists for, expressed as a proactive signal instead of a passive rule.

---

## 10.7 Feature: Recommendations

**Purpose:** Concrete, actionable suggestions grounded in the other features above — e.g., "consider a Stock Count on Product X, it hasn't been verified in 90 days," "this dead-stock batch is a candidate for a Quebra write-off if it's actually unsellable."

**Inputs:** Outputs of 10.4–10.6 as the input layer — Recommendations is explicitly a synthesis feature, not an independent data-reading one.

**Outputs:** A short, specific suggestion linked to the concrete action it recommends (a pre-filled Stock Count, 8.6; a pre-filled Quebra entry, 8.5) — the Admin always takes the action through the existing module's normal flow, AI never writes the record itself. This is the same boundary 10.1 already fixed, applied to its most tempting violation: a "helpful" recommendation must never auto-execute.

**Data sources:** Derived entirely from this section's other features — no new raw data source of its own.

**Business value:** Converts insight into action without adding a new write path AI itself controls — the value is in reducing the Admin's own decision-making effort, not in automating the business.

**Worth-First scope test:** Passes, conditionally — a Recommendation that ever suggested an action outside Worth-First scope (e.g., "list this product for sale on X") would fail the test immediately; this section fixes the boundary precisely so that never becomes a live option without a deliberate, separate design decision.

---

## 10.8 Feature: Business Intelligence (Summary Layer)

**Purpose:** Not a new feature so much as the presentation layer tying 10.2–10.7 together — a single "AI Insights" view (surfacing in Reports, 8.9, and as a Dashboard summary card, 8.14, per Section 8's own "Future extensions" notes for both) rather than seven scattered, disconnected outputs.

**Inputs/Outputs:** Aggregates the outputs of every feature above; produces no new data itself.

**Business value:** Coherence — an Admin encountering seven independent AI widgets scattered across the app would trust none of them; one consistent "AI Insights" surface, consistently labeled per 10.1, is what actually makes any of the above usable in practice.

**Worth-First scope test:** Inherits the pass/fail of whichever underlying feature it's presenting — this layer adds no new scope of its own.

---

## 10.9 Cross-Tenant Model Quality — The One Legitimate Aggregate Use

Section 4.10 already fixed the boundary: AI's cross-tenant use case reads exclusively from `platform_aggregates` (7.4), and that path must never merge with a business's own per-tenant insight computation. Section 10 states precisely what this is *for*, since "model quality" alone is vague enough to invite scope creep:

- **Legitimate:** improving Dead Stock Detection's (10.5) cold-start default for a business with no history yet; validating that Risk Detection's (10.6) anomaly thresholds aren't systematically mis-tuned across the whole platform (a platform-wide recalibration, applied identically to everyone, not a per-business override).
- **Not legitimate, and structurally prevented:** using another specific business's data to inform *this* business's specific forecast number, prediction, or flag — Section 4.10's rule that the two data paths must never merge is the enforcement mechanism, not a policy Section 10 merely repeats.

---

## 10.10 What Section 10 Deliberately Does Not Design

Consistent with "do not build AI": the specific model/provider mechanics (`@google/genai` per 4.11's audit note, prompt design, fine-tuning vs. prompting, evaluation methodology) are implementation detail, not architecture — Section 13 schedules the build, and the engineering team building it makes those calls against the input/output contracts this section fixes. What Section 10 *does* fix, and what nothing downstream should have to re-derive: which features exist, what each one is allowed to read, what shape its output takes, and the one rule (10.1) none of them may violate.

---

## What Sections 11–15 Will Build On This

- **Section 11 (Scalability Strategy)** will give concrete cost/latency/rate-limit guidance for server-invoked AI calls at scale, and confirm the Background Worker (4.8) can absorb per-business AI computation as a periodic job rather than a per-request cost.
- **Section 12 (Security Architecture)** will formalize the "server-invoked only, never client-side" boundary (10.1, 4.11) into an explicit control, alongside the cross-tenant aggregate boundary (10.9).
- **Section 13 (Development Strategy)** sequences which of 10.2–10.7 ships first — likely Dead Stock Detection (10.5) and Business Worth Prediction (10.3), since both require no new data collection, before Risk Detection (10.6), which benefits from more historical data to tune against.
- **Section 9's Feature Flags (9.5)** is the mechanism every feature in this section rolls out through — staged to a subset of businesses before a full release, per 9.5's existing design.

**This section requires your explicit approval before Section 11 (Scalability Strategy) begins.**
