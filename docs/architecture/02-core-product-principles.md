# Section 2 — Core Product Principles

**Status:** Drafted, awaiting approval
**Depends on:** Section 1 (Product Vision) — approved
**Purpose:** Translate the vision and philosophy from Section 1 into concrete, checkable principles that every future architectural and product decision (Sections 3–15, and every feature built after this document series) can be tested against.

A principle in this section is only included if it is **testable** — if it's possible to look at a specific design decision and say clearly whether it passes or fails. Vague aspirations ("be great") are deliberately excluded.

---

## 2.1 How These Principles Are Ordered

They are listed in the order they should be applied when they conflict. When two principles point in different directions for a specific decision, the one listed first wins, unless a documented exception is recorded in the relevant section. This ordering is itself a decision the rest of the document series depends on, so it's stated explicitly rather than left implicit.

1. Worth-First Scope
2. Security First
3. Data Integrity Over Convenience
4. Scalable by Default
5. Simplicity Over Completeness
6. Performance as a Feature
7. Tenant Isolation Is Non-Negotiable
8. Every Privileged Action Is Server-Verified
9. Immutability Where Trust Matters
10. Design System Discipline
11. Build for the Next Order of Magnitude, Not the Next Feature

---

## 2.2 Principle: Worth-First Scope

**Statement:** Every feature must increase the owner's insight into business worth, capital, stock value, embedded profit, or financial health. If a proposed feature cannot be mapped to one of these, it does not belong in Sabush BPT.

**Why:** This is the direct architectural translation of Section 1.8. Without a hard test at the feature-proposal stage, scope creep happens one reasonable-sounding feature at a time — a "quick" sales-recording field here, a "simple" invoice export there — until the product has quietly become a partial ERP with none of the focus that makes it defensible.

**How it's applied:** Before any module is added (Section 8) or any SuperAdmin/AI capability is designed (Sections 9–10), it must be justified against this test in one sentence. If that sentence requires the words "sale," "invoice," "checkout," "payroll," or "customer transaction," the feature is out of scope for this architecture, per Section 1.8, unless explicitly overridden outside this document series.

**What happens if this principle is dropped:** The product drifts into ERP territory exactly as warned against in Section 1.8 — diluting the one thing it does better than any competitor, while poorly duplicating things competitors already do well.

---

## 2.3 Principle: Security First

**Statement:** No feature ships if it weakens tenant isolation, authentication integrity, or the confidentiality of a business's financial data — not even temporarily, and not even for a demo, a quick win, or an investor preview.

**Why:** The audit found the platform's existing Firestore Security Rules and privileged-server-operation pattern to be genuine strengths, precisely because they were never compromised for convenience. At 100,000+ tenants, a single security shortcut doesn't stay a small, contained risk — it becomes a systemic one, because the same code path runs for every tenant.

**How it's applied:** Every section from here on (Data Architecture, SuperAdmin, AI) is required to name explicitly how tenant data stays isolated under that section's design, not leave it implied. Section 12 (Security Architecture) sets the standard; every earlier section must already be consistent with it, not wait for Section 12 to retrofit it.

**What happens if this principle is dropped:** A cross-tenant data leak at 100,000 businesses is not a bug — it is an existential, possibly criminal-liability event for the company. This principle exists to make sure that outcome is architecturally impossible, not merely unlikely.

---

## 2.4 Principle: Data Integrity Over Convenience

**Statement:** The platform's accounting distinctions (Business Worth vs. revenue, Expense vs. Withdrawal, estimated vs. finalized Embedded Profit, the immutable Initial Stock Count) must never be blurred, merged, or approximated for the sake of a simpler UI, a faster feature build, or an AI shortcut.

**Why:** These distinctions are what make the "Worth" number trustworthy. The audit specifically praised the current model for maintaining them through in-code discipline. As the team grows past the current single-context codebase (Section 8), new contributors won't have that context by default — this principle exists so it survives team growth, not just the current author's memory.

**How it's applied:** Any new domain object, report, or AI output (Section 10) that touches money must state which of these categories it belongs to before being designed, and that categorization must be visible to the owner in the product, not just correct in the database.

**What happens if this principle is dropped:** The product's core differentiator — an honest Worth number — degrades into "yet another rough estimate," at which point it has no advantage over a spreadsheet.

---

## 2.5 Principle: Scalable by Default

**Statement:** No architectural decision may work only up to an arbitrary, undocumented ceiling. Every decision must state, at the time it's made, the order of magnitude it's designed for (100 / 1,000 / 10,000 / 100,000+ businesses — Section 11), and any ceiling must be an explicit, documented, intentional limit — not an accident discovered under load.

**Why:** The audit's single most concrete finding was that the current build's unbounded, unpaginated real-time listeners work fine at today's scale and will not work at target scale — not because anyone made a bad decision, but because no one decided a ceiling at all. This principle exists specifically to prevent that class of mistake from recurring in every future module.

**How it's applied:** Section 11 (Scalability Strategy) defines the concrete engineering patterns (pagination, indexing, caching) this principle requires. Every module in Section 8 must be checked against those patterns before being considered complete, not after a performance complaint.

**What happens if this principle is dropped:** The platform repeats the audit's central finding, feature by feature, until a rewrite is unavoidable — which is precisely the outcome this entire document series exists to prevent (see the Mission's "without requiring major redesign later").

---

## 2.6 Principle: Simplicity Over Completeness

**Statement:** Given a choice between a simpler design that covers 90% of real owner needs and a more complete one that covers 100% at significantly higher complexity, build the simpler one — and revisit only when real usage data, not speculation, shows the gap matters.

**Why:** This is the engineering expression of Section 1's "simplicity over completeness" philosophy, and it directly counters the instinct (common in ERP-adjacent products) to build for every edge case up front. The target owner (Section 1.4) has no tolerance for a complex tool; every unit of complexity added has to earn its place against that owner's reality, not against a theoretical enterprise user who isn't the target market.

**How it's applied:** Every module (Section 8) and every SuperAdmin capability (Section 9) is scoped to its minimum viable form first. Extensibility is designed in (so growth doesn't require a rewrite — see 2.5), but extra capability is not built speculatively.

**What happens if this principle is dropped:** Development velocity drops, onboarding for the target owner gets harder, and the product loses the "simpler than the alternative" advantage that is central to its competitive position (Section 1.6).

---

## 2.7 Principle: Performance as a Feature

**Statement:** Speed is not a quality-of-service afterthought — for a product whose entire value proposition is "know your business's worth as fast as checking WhatsApp" (Section 1.7), performance is part of the product's core promise, at parity with correctness.

**Why:** The Unique Value Proposition explicitly commits to near-instant answers. A dashboard that takes several seconds to load because it's fetching a tenant's entire multi-year history (as the audit found happens today) doesn't just feel slow — it directly breaks the product's stated promise.

**How it's applied:** Every data-fetching pattern designed in Section 7 (Data Architecture) and every module in Section 8 must be evaluated against target load times at the largest relevant scale from Section 11, not just at today's data volumes.

**What happens if this principle is dropped:** The product's defining promise becomes false for its most loyal (longest-tenured, most data-rich) customers first — the owners who have used it longest are punished with the worst performance, which is exactly backwards.

---

## 2.8 Principle: Tenant Isolation Is Non-Negotiable

**Statement:** A business's data is never queryable, readable, or derivable by another business's owner or staff, under any circumstance, through any code path — client, server, or platform-admin — except through an explicitly audited, logged SuperAdmin action (Section 9).

**Why:** This is a specific, non-overlapping corollary of Security First (2.3), called out on its own because the audit identified it as the platform's existing core strength and because every future capability — multi-shop, subscriptions, AI trained across tenants (Section 10), SuperAdmin analytics (Section 9) — creates new temptations to weaken it "just for aggregate reporting" or "just for the AI model." Naming it separately prevents it from being quietly traded off inside those other conversations.

**How it's applied:** Any feature that requires cross-tenant data (platform analytics, AI trained on aggregate patterns) must go through an explicit, documented aggregation/anonymization layer — never a direct cross-tenant read, even from trusted, platform-owned code.

**What happens if this principle is dropped:** Trust is the entire product for a tool that stores a business's financial worth — one violation, even accidental, ends the relationship with every affected tenant and likely many who weren't.

---

## 2.9 Principle: Every Privileged Action Is Server-Verified

**Statement:** Any action that changes something a client should not be able to change unilaterally (deleting a staff member's login, changing a subscription plan, suspending a tenant, impersonating an owner) must be re-verified server-side against the actual current state of the data — never trusted from a client-supplied value, even the client's own claimed identity or role.

**Why:** The audit specifically praised the existing `server/index.ts` pattern (re-reading the caller's real profile from Firestore before acting, rather than trusting a client-asserted role) as correct architecture, not a shortcut. This principle generalizes that pattern so it's applied automatically to every future privileged action (SuperAdmin, billing, RBAC) rather than being reinvented — or forgotten — each time.

**How it's applied:** Section 9 (SuperAdmin Architecture) and any future billing/RBAC design must specify, for every privileged action, exactly what is re-verified server-side and against which record.

**What happens if this principle is dropped:** Privilege escalation becomes possible via a client bug or a malicious client — the exact failure mode this pattern was already built to prevent in the one place it currently exists.

---

## 2.10 Principle: Immutability Where Trust Matters

**Statement:** Once a record represents a financial fact the owner needs to trust later (a Closing, a finalized batch, the Initial Stock Count, a completed audit-log entry), it is never edited in place. Corrections are new records that reference what they correct, and the original is preserved.

**Why:** This is already the pattern for Closings and the Initial Stock Count today, and the audit noted it as a deliberate, correct choice. Stating it as a principle (rather than leaving it as an implicit pattern in two features) ensures it's applied consistently as new financially-sensitive records are introduced — audit logs (Section 9), subscription/billing history (Section 9), and AI-driven insights (Section 10) all need the same treatment.

**How it's applied:** Any new "record of fact" introduced in Sections 7–10 must state explicitly whether it is mutable or immutable, and if mutable, how corrections are handled without silently rewriting history.

**What happens if this principle is dropped:** An owner (or a SuperAdmin, or an investor doing diligence) loses the ability to trust that a historical number reflects what was true at the time — undermining the entire premise of a *Business Worth* platform, which is fundamentally about trustworthy numbers over time.

---

## 2.11 Principle: Design System Discipline

**Statement:** No screen ships outside the established design system (color, spacing, typography, card structure — `DESIGN_SYSTEM.md`) without that system being updated first. A one-off exception is not permitted merely because a feature is "different."

**Why:** The audit identified consistent design-system enforcement as one of the platform's genuine, above-average strengths — including evidence in the commit history of deliberate reconciliation passes, not just aspirational documentation. This principle exists to make sure that discipline survives the transition from a small, single-context codebase to a larger team building SuperAdmin, AI, and subscription surfaces (Sections 9–10) that didn't exist when the design system was written.

**How it's applied:** Any new surface (SuperAdmin dashboard, subscription management UI, AI insight cards) must either use existing design tokens or propose an explicit, documented extension to `DESIGN_SYSTEM.md` — never an ad hoc departure.

**What happens if this principle is dropped:** The product's above-average UI consistency — a real, measured advantage — erodes exactly as the surface area grows fastest, which is the worst possible time for it to erode.

---

## 2.12 Principle: Build for the Next Order of Magnitude, Not the Next Feature

**Statement:** When a design decision has two reasonable implementations — one that solves today's immediate need, one that also comfortably solves the same need at 10x the scale — choose the one that solves it at 10x, provided it does not meaningfully violate Simplicity Over Completeness (2.6).

**Why:** This is the practical resolution of the tension between 2.5 (Scalable by Default) and 2.6 (Simplicity Over Completeness): it doesn't ask every decision to be built for 100,000 businesses immediately (that would violate simplicity and slow delivery to a crawl), but it does ask every decision to not foreclose the next order of magnitude. This is a specific, disciplined middle path, not an excuse for either premature complexity or short-term thinking.

**How it's applied:** Section 11 (Scalability Strategy) gives the concrete thresholds (100 / 1,000 / 10,000 / 100,000). A decision made "for 100 businesses" should still function, perhaps with known and accepted friction, at 1,000 — the next order of magnitude up, not the final one.

**What happens if this principle is dropped:** The platform either over-engineers everything up front (violating 2.6 and slowing delivery) or under-engineers everything (violating 2.5 and repeating the audit's central finding) — this principle is what keeps those two failure modes from alternating unpredictably feature by feature.

---

## 2.13 How Conflicts Are Resolved in Practice

Worked example, to make the ordering in 2.1 concrete rather than abstract: if a proposed AI feature (Section 10) would improve accuracy by training across all tenants' raw data, but doing so would require a shared, unaudited cross-tenant read —

- **Tenant Isolation (2.8)** and **Security First (2.3)** rank above any accuracy or completeness gain.
- The correct resolution is not "reject AI features" — it's "require an aggregation/anonymization layer" (as 2.8 already specifies), which satisfies both the AI ambition and the non-negotiable isolation principle. This is exactly the kind of resolution Section 10 will be required to specify explicitly, not leave implicit.

---

## What Sections 3–15 Will Build On This

- **Section 3 (Domain Architecture)** will scope every domain's responsibilities against 2.2 (Worth-First Scope) explicitly.
- **Section 7 (Data Architecture)** will be designed to satisfy 2.5, 2.7, 2.8, and 2.10 by construction, not as an afterthought.
- **Section 9 (SuperAdmin Architecture)** will apply 2.9 (server-verified privileged actions) to every capability it defines.
- **Section 11 (Scalability Strategy)** will give the concrete numbers and patterns that 2.5 and 2.12 currently state only as principles.
- **Section 12 (Security Architecture)** will formalize 2.3 and 2.8 into concrete controls.

**This section requires your explicit approval before Section 3 (Domain Architecture) begins.**
