# Section 15 — Architecture Validation

**Status:** ✅ Approved
**Depends on:** Sections 1–14 — all approved. This is the final section of the document series.
**Purpose:** For every major architectural decision across Sections 1–14, answer the brief's three questions directly: **Why is this needed? What problem does it solve? What happens if we don't implement it?** This section does not re-derive any decision — nearly every prior section already answered these questions inline for its own decisions (Section 2's principles are the clearest example, each one already carrying a "Why" and a "What happens if this principle is dropped"). Section 15's job is to assemble that reasoning into one final, checkable pass across the *whole* series, at the level of decisions consequential enough that getting them wrong would be expensive to undo — not every micro-detail already covered exhaustively in its own section.

**Method:** Organized by section, one table per section covering its 2–4 most consequential decisions. A decision is included here if reversing it after implementation would require a rewrite, a data migration, or a trust-damaging incident — not if it's merely inconvenient to change.

---

## 15.1 Section 1 — Product Vision

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Stay a Business Worth Platform, not an ERP (1.8) | Depth in one underserved category beats breadth competing with mature incumbents at everything | The target admin's real alternative is a notebook or nothing — the urgency is being the best answer to *that*, not out-featuring an existing ERP | Product becomes a mediocre partial ERP, loses the "nothing else does this well" moat, competes on incumbents' terms and loses |
| Target the smallest, least formally-served admins first (1.4) | Confirms every existing design choice (PT/FR/EN, PIN quick-login, no bookkeeping assumption) as intentional, not accidental | Prevents a future feature decision from silently re-targeting a more "enterprise" user at the expense of the actual current base | Design decisions drift toward a different (larger, more formal) user than the one actually using the product today, alienating the existing base |

---

## 15.2 Section 2 — Core Product Principles

The full why/consequence pair already exists per-principle in Sections 2.2–2.12; restated here only as a cross-check that the **ordering** (2.1) itself is sound, since an unordered principle list is not actionable when two principles conflict.

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Fixed conflict-resolution order, Worth-First and Security First ranked above Simplicity (2.1) | Every later section (3–14) makes trade-offs; an unordered principle set means every trade-off gets re-litigated from scratch | Prevents the same conflict (e.g., "should this AI feature use cross-tenant data for better accuracy") from being answered differently by different future contributors | Inconsistent decisions across features built by different people at different times — the exact "architectural drift" the brief asks this whole document series to prevent |

---

## 15.3 Section 3 — Domain Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Platform-level domains (Subscriptions, SuperAdmin, Notifications, AI, Analytics) never read *into* one business without an aggregation/audit boundary (3.1) | Every one of these domains has a legitimate reason to look "across" many businesses (billing operations, platform analytics, AI model quality) | Prevents "just this once, for a good reason" cross-tenant reads from becoming five different ungoverned exceptions instead of one governed boundary | A cross-tenant data leak becomes not just possible but *likely*, since five independent, uncoordinated code paths would each invent their own workaround |

*(Every individual domain's own Worth-First scope test is already answered domain-by-domain in 3.2–3.16 — not repeated here.)*

---

## 15.4 Section 4 — System Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| No Cloud Functions, one privileged server rather than a service mesh (4.1) | Blaze billing plan isn't reachable from every region/card the target market operates in (1.4) — a real, current constraint, not a technical limitation to override casually | Keeps the platform deployable for the actual target market instead of one that assumes a billing/regional profile the target admin doesn't have | The product becomes undeployable, or deployable only with a workaround, for a meaningful share of its own stated target market |
| Client SDK talks to Firestore directly for most reads/writes, not a conventional backend (4.1) | Firestore, correctly indexed and rule-scoped, is designed to serve 100,000+ tenants directly — the Mission's own stated ceiling | Avoids building and maintaining a backend layer the Mission's scale target doesn't actually require | Unnecessary operational complexity and cost at every scale tier, for a problem Firestore already solves correctly when used as designed |

---

## 15.5 Section 5 — Business Lifecycle

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Trial Subscription record created at Registration, not later (5.2) | Every future feature-gate check needs to read a Subscription state | Removes the need for every gate check anywhere in the product to handle a null-subscription special case | Feature-gating logic accumulates defensive null-checks scattered across the codebase instead of one clean invariant — a maintainability cost that compounds with every new gated feature |

---

## 15.6 Section 6 — User Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Manager as a `staffTier` field, not a third `UserRole` value (6.3) | A new enum value requires rewriting every `role === 'staff'` check and every Security Rule derived from it | Delivers the delegation capability (a trusted deputy who can perform Closings) without touching ~20 existing call sites that already work correctly | A needlessly high-risk migration is undertaken to deliver a feature that didn't require it — the exact kind of unforced rewrite Principle 2.6 exists to prevent |
| `platform_operators/{uid}` as a structurally separate identity space from `users/{uid}` (7.4, 6.5–6.8) | Internal, platform-operator accounts carry categorically higher blast radius (impersonation, billing override, tenant suspension) than any tenant account | Prevents an internal-account compromise or bug from being indistinguishable, at the data-model level, from a tenant-account compromise | A single identity space would mean every Security Rule protecting tenant data would *also* have to correctly special-case internal accounts everywhere, multiplying the surface area for a Tenant Isolation failure (Principle 2.8) |

---

## 15.7 Section 7 — Data Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Nesting under `businesses/{businessId}/...` as the tenant-isolation mechanism (7.1) | Structural (not merely policy-based) prevention of un-scoped cross-tenant reads is the only form of isolation that holds regardless of who writes the next query | A future contributor without full context on every Security Rule can still not accidentally query across tenants, because the data shape itself doesn't allow it | Tenant isolation would depend entirely on every future query being written correctly by every future contributor forever — a single mistake becomes a cross-tenant leak, not a caught bug |
| Immutability tiers — the Initial Stock Count, Closings, Timeline entries never edited in place (7.6, Principle 2.10) | The product's entire value proposition is a *trustworthy* Worth number over time | An owner, or an investor doing diligence, can trust that a historical figure reflects what was true at the time it was recorded | The Worth number degrades into "yet another rough estimate," at which point the product has no advantage over a spreadsheet — this is Principle 2.10's own stated consequence, confirmed here as still true at the whole-architecture level |

---

## 15.8 Section 8 — Module Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| `AppContext` decomposition rule — new domains get their own context slice, never appended (8.13) | `AppContext` was already the audit-flagged scale risk at 1,675 lines before any of the new domains (Notifications, Subscriptions, AI) existed | Stops the file from growing further exactly as three new domains are about to be added simultaneously | Every existing module (8.2–8.12) pays an unnecessary re-render cost every time an unrelated domain (e.g., a notification) updates, and the audit's already-identified risk gets worse, not better, at the exact moment new domains are added |
| Calculation Engine (8.2) as the single, exclusive source of every financial figure | Every module (Reports, Dashboard, Closing) must show the identical number for the identical data | A report disagreeing with the Dashboard for the same underlying data is a data-integrity failure, not a display bug | Financial figures drift out of sync across the app over time as different modules independently reimplement slightly different versions of the same calculation |

---

## 15.9 Section 9 — SuperAdmin Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| A physically separate application, never bundled into the tenant SPA (9.1, 4.13) | SuperAdmin-capable code must never ship to a tenant's browser, gated or not | Removes the entire class of risk where a client-side permission check is bypassed to reveal SuperAdmin functionality that was merely hidden, not absent | A determined or accidental tenant-side actor could discover and potentially exploit SuperAdmin code paths that exist in their own downloaded bundle, even if UI-gated |
| Every SuperAdmin read of cross-tenant data goes through `platform_aggregates`, never a live scan (9.2 and throughout) | Consistent enforcement of Tenant Isolation (Principle 2.8) specifically at the one layer (platform operations) most likely to be granted a "just this once" exception | Makes the aggregation boundary the *only* path, with no parallel shortcut for platform-operator convenience | The single collection of people with the most legitimate-seeming reason to bypass tenant isolation ("I just need to check on a business") becomes the most likely source of an actual violation |

---

## 15.10 Section 10 — AI Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| An AI output is a labeled prediction, never merged into a real figure (10.1, Principle 2.4) | The product's core differentiator is a real, trustworthy Worth number — a forecast that looked like a real figure would erase that distinction the moment a user couldn't tell which was which | Lets AI add forward-looking value without ever putting the product's core honesty guarantee at risk | An Admin loses the ability to tell what's a known fact versus a model's guess — precisely the trust failure Section 7.6 and Principle 2.10 were built to prevent, reintroduced through a different door |
| AI runs server-side only, never a client-side call to the AI provider (10.1, 4.11) | A client-side call would require shipping an API key to every browser session | Removes the entire class of risk where a leaked client-bundle API key allows unlimited, unattributed AI provider usage at Sabush's expense | The AI provider key becomes extractable from the SPA bundle by anyone, with direct cost and abuse implications at 100,000+-tenant scale |

---

## 15.11 Section 11 — Scalability Strategy

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Every fix tied to a measured trigger condition, never a calendar date (11.7) | The audit's central finding was that the current unbounded-listener pattern works today and silently stops working at an undocumented ceiling nobody decided on | Ensures every future scale-related decision states, at the time it's made, what order of magnitude it's built for (Principle 2.5) | The exact failure mode the audit already found — a decision that quietly stops working under load, discovered only when it breaks — repeats itself feature by feature, indefinitely |

---

## 15.12 Section 12 — Security Architecture

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Every cache must key strictly by `businessId`, with authorization re-verified before serving a cached value (12.3) | Section 11 introduced caching (11.4, 11.5) specifically as a performance optimization, which is exactly the kind of change most likely to accidentally weaken an isolation guarantee for the sake of speed | Closes the specific gap 11.7 flagged as Section 12's job before it could ever exist in a shipped cache implementation | A loosely-keyed cache could serve Business A's aggregate data to a request scoped to Business B — a Tenant Isolation violation introduced by a performance optimization, the worst possible way for one to happen |
| Hash-chain tamper-evidence on the platform Audit Log, beyond append-only (12.4) | Append-only prevents editing an entry but not a compromised privileged server writing a false one | Makes a deleted-and-reinserted entry detectable by a broken chain, rather than trusted purely because the collection is append-only | The one collection specifically meant to answer "what actually happened, even during an incident" becomes unreliable exactly during the scenario (a compromise) where it matters most |

---

## 15.13 Section 13 — Development Strategy

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| Phase 1 (Subscriptions + Notifications) must complete before Phase 2 (SuperAdmin) begins (13.2, rule 1) | Section 9's own billing (9.4) and notification (9.9) screens need real data, not a mock, to be genuinely useful when built | Avoids building UI against nothing, then rebuilding it once real data exists | SuperAdmin ships with screens that are functionally empty at launch, undermining confidence in the platform-operator tooling right when the team most needs to trust it |
| Scale-triggered work stays reactive by default, with one named proactive exception (13.8) | Building every Section 11 threshold's fix speculatively at low tenant counts would itself violate Principle 2.6 (Simplicity Over Completeness) | Balances 2.5 (Scalable by Default) against 2.6 without letting either dominate by default | Either the platform over-engineers everything early (slow delivery, wasted effort) or under-engineers everything (repeating the audit's central finding) — this policy is what keeps those two failure modes from alternating unpredictably |

---

## 15.14 Section 14 — Future Roadmap

| Decision | Why needed | Problem it solves | Consequence if not implemented |
|---|---|---|---|
| "Enterprise-ready" defined as read-only API/export, SSO, higher shop cap, dedicated support — explicitly never a sales/payroll/CRM module (14.5) | This is the single point in five years of roadmap where a real customer request is most likely to sound reasonable while violating Section 1.8 | Gives every future contributor a concrete, pre-decided answer to "our enterprise customer needs invoicing" before that request ever actually arrives | Without a pre-decided answer, a large, revenue-significant customer's request becomes very hard to say no to in the moment — exactly the pressure point where "just this once" scope creep actually happens in real companies |

---

## 15.15 What This Validation Confirms, Taken Together

Reading Sections 15.1–15.14 as one set rather than fourteen separate tables, a single pattern recurs: **the majority of "what happens if not implemented" answers are not feature gaps — they are trust failures** (a Worth number that can't be trusted, a tenant isolation boundary that can be crossed, an audit log that can be silently altered, a product that quietly becomes something its target admin didn't choose). This is consistent with Section 1's own framing: Sabush BPT's entire competitive position rests on being *honest* about a number competitors treat casually. Every validation above, read together, confirms that Sections 1–14 built the *trust-preserving* version of that promise, not merely a technically complete one.

---

## 15.16 Living Document Maintenance

Per the README's own stated status ("Living document, built and approved one section at a time"), this validation is not a one-time event. Any future amendment to Sections 1–14, or any new section added beyond 15, should be checked against the same three questions used throughout this section before being merged into the document — this is the concrete mechanism that keeps the document series a living reference rather than a historical artifact that quietly stops matching the real system.

---

## Document Series Status

| # | Section | Status |
|---|---|---|
| 1–15 | Product Vision → Architecture Validation | ✅ Approved |

**This is the final section of the Sabush BPT Product Architecture Document. Sections 1–15 together now form the permanent, living reference this entire series was commissioned to produce.**
