# Section 3 — Domain Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Section 1 (Product Vision) — approved · Section 2 (Core Product Principles) — approved
**Purpose:** Enumerate every domain in Sabush BPT — existing and future — and describe each one's purpose, responsibilities, relationships, and dependencies, so Sections 4 onward (System Architecture, Data Architecture, Module Architecture) have a single, agreed map to build against.

Every domain below is scoped against **Principle 2.2 (Worth-First Scope)**. Domains are marked **Existing** (already implemented, per the audit) or **New — proposed** (required by the Mission's scale/AI/subscription targets, not yet built).

---

## 3.1 Domain Map (Overview)

```
                         ┌────────────────┐
                         │    BUSINESS    │  (tenant root)
                         └───────┬────────┘
                                 │
        ┌───────────┬───────────┼───────────┬─────────────┬───────────┐
        │           │           │           │             │           │
   ┌────▼────┐ ┌────▼────┐ ┌────▼─────┐ ┌───▼──────┐ ┌────▼────┐ ┌────▼────┐
   │INVENTORY│ │ STAFF   │ │ FINANCIAL│ │ TIMELINE │ │ REPORTS │ │ (others)│
   │ (group) │ │         │ │  (group) │ │          │ │         │ │         │
   └────┬────┘ └─────────┘ └────┬─────┘ └──────────┘ └─────────┘ └─────────┘
        │                       │
  ┌─────┼─────┬─────────┐  ┌────┼─────┬──────────┐
  │     │     │         │  │    │     │          │
Products│ Stock│Purchase│  Expenses│Withdrawals│Breakages
        │Batches│Batches │  │     │           │
        │      │        │  │     │           │
        (Quebras live here, cross-referenced from Inventory)

Platform-level domains (not under any single Business):
  SUBSCRIPTIONS · SUPERADMIN · NOTIFICATIONS · AI · ANALYTICS
```

The **Business** domain is the tenant root every operational domain hangs beneath (consistent with the existing `businesses/{businessId}/...` structure the audit confirmed as sound). **Subscriptions, SuperAdmin, Notifications, AI, and Analytics** are platform-level domains that read *about* many businesses but never read *into* one without going through the aggregation/audit boundary set by Principles 2.8 and 2.9 — this is elaborated per-domain below and formalized in Sections 7 and 9.

---

## 3.2 BUSINESS *(Existing)*

**Purpose:** The tenant root. Represents one real-world business (a "shop") and is the anchor every other operational domain belongs to.

**Responsibilities:**
- Owns identity (name, category, currency, contact info).
- Establishes the tenant boundary every Security Rule and query is scoped against.
- Is the unit a subscription (Section 9) is ultimately billed against.

**Relationships:**
- One **Owner** (User) owns one or more Businesses (multi-shop, currently capped at 10 — see 3.12 User/Staff below).
- Every operational domain (Inventory, Financial, Timeline, Reports, Staff) belongs to exactly one Business.
- **Subscriptions** attach to a Business (or to the owning User across all their Businesses — a decision Section 9 must make explicitly).

**Dependencies:** None — this is the root. Everything else depends on it, it depends on nothing else.

---

## 3.3 INVENTORY *(Existing — grouping domain)*

**Purpose:** The umbrella for everything that establishes what a business owns and what that ownership is worth. This is not a separate data domain on its own — it's the conceptual grouping of Products, Stock Batches, Purchase Batches, and Breakages below, called out because "Inventory" is how the *owner* thinks about this group, even though the system implements it as four related domains.

**Responsibilities:** Frames the four sub-domains below as one coherent story for UI and reporting purposes (e.g., the Dashboard's KPI grid draws from all four as a single "inventory" narrative).

**Relationships:** Parent grouping for 3.4–3.7.

**Dependencies:** Business (3.2).

---

## 3.4 PRODUCTS *(Existing)*

**Purpose:** The catalog — what things a business sells or holds, independent of any specific purchase or stock event.

**Responsibilities:**
- Stores catalog metadata: name, category, supplier reference, SKU, barcode, reference cost/selling price.
- Provides the lookup target every Stock Batch, Quebra, and Report references by product identity.

**Relationships:**
- Referenced by **Stock Batches** (every batch is "of" a product).
- Referenced by **Breakages/Quebras** (every loss is "of" a product, via its batch).
- Referenced by **Reports** for per-product rollups.

**Dependencies:** Business (3.2).

**Explicit non-responsibility (per Principle 2.4):** Reference cost/selling price on a Product is *never* a source of truth for a calculation — only the actual Stock Batch a unit belongs to is. This is already correctly implemented and must remain true as Products domain evolves (e.g., under AI-driven repricing suggestions in Section 10).

---

## 3.5 PURCHASE BATCHES *(Existing)*

**Purpose:** Represents one real-world purchase/investment event — money spent, from a supplier, on a given date, possibly covering several products at once.

**Responsibilities:**
- Groups one or more Stock Batch line items bought together.
- Carries supplier and purchase-event metadata (date, notes, who recorded it).
- Is the anchor for the Investment Ledger view.

**Relationships:**
- Contains one or more **Stock Batches** (3.6).
- Feeds the **Timeline** (a purchase event is always narrated there).
- Feeds **Reports** (Batch Performance, Capital Growth).

**Dependencies:** Business (3.2), Products (3.4, indirectly via its Stock Batch line items).

---

## 3.6 STOCK BATCHES *(Existing)*

**Purpose:** The atomic unit of "what a business owns and what it's worth" — one product, one purchase date, one cost price, one selling price, tracked independently so historical worth is never distorted by later price changes.

**Responsibilities:**
- Holds cost price and selling price *at the time of purchase* — this is the actual source of every Embedded Profit, Business Worth, and Market Value calculation (per Principle 2.4).
- Tracks remaining quantity as Quebras (3.7) reduce it.
- Carries `open`/`closed` status.

**Relationships:**
- Belongs to one **Purchase Batch** (3.5) where applicable (older batches may predate this link, per the audit's findings — see 3.7 note on backward compatibility).
- Referenced by **Breakages/Quebras** (3.7).
- Feeds nearly every **Report** (3.9) and the **Dashboard**.

**Dependencies:** Products (3.4), Purchase Batches (3.5, optional/legacy-tolerant link).

---

## 3.7 BREAKAGES / QUEBRAS *(Existing)*

**Purpose:** Records inventory loss (breakage, spoilage, theft, error) against a specific Stock Batch, so both Investment Value and Market Value shrink consistently and Embedded Profit never overstates what remains.

**Responsibilities:**
- Attributes a loss to an exact batch, date, quantity, and reason.
- Reduces a batch's remaining quantity, feeding recalculation of that batch's investment/market value.

**Relationships:**
- Always tied to exactly one **Stock Batch** (3.6).
- Feeds **Reports** (Inventory Loss) and the **Timeline**.
- Will feed **AI** (3.16) dead-stock/risk detection once that domain exists.

**Dependencies:** Stock Batches (3.6).

---

## 3.8 FINANCIAL *(Existing — grouping domain: Expenses, Withdrawals, Stock Counts, Closings)*

**Purpose:** Everything that establishes or adjusts the business's financial baseline outside of inventory purchases themselves.

### 3.8.1 Expenses
**Purpose:** Operating costs of running the business, distinct from inventory investment.
**Responsibilities:** Date, description, amount, category.
**Relationships:** Feeds Reports (Expense Report), Timeline, Dashboard KPIs.
**Dependencies:** Business (3.2).

### 3.8.2 Withdrawals
**Purpose:** Capital taken out by the owner for personal use — deliberately never merged with Expenses (Principle 2.4).
**Responsibilities:** Date, amount, reason taxonomy, notes.
**Relationships:** Feeds Reports (Withdrawal Report), Timeline, Dashboard KPIs; reduces Business Worth without being an operating cost.
**Dependencies:** Business (3.2). Owner-only, per existing Security Rules.

### 3.8.3 Stock Counts
**Purpose:** Establishes and periodically verifies the capital baseline via physical counting; the very first count (`initial`) is the permanent, immutable capital baseline (Principle 2.10).
**Responsibilities:** Date, type (initial/weekly/monthly/quarterly/yearly/custom), line items with counted quantity and cost.
**Relationships:** Anchors Reports (Capital Growth, Stock Verification); referenced by Closings.
**Dependencies:** Products (3.4), Business (3.2).

### 3.8.4 Closings
**Purpose:** Permanently locks a month or year's figures and snapshots Business Worth at that moment — immutable once recorded (Principle 2.10).
**Responsibilities:** Period boundaries, totals (Embedded Profit, Expenses, Withdrawals), Business Worth snapshot.
**Relationships:** Reads from Expenses, Withdrawals, Stock Batches, Quebras at time of closing; feeds Reports and Timeline.
**Dependencies:** Expenses (3.8.1), Withdrawals (3.8.2), Stock Batches (3.6), Breakages (3.7).

---

## 3.9 REPORTS *(Existing)*

**Purpose:** Derived, read-only views over the domains above — Batch Performance, Business Worth, Capital Growth, Expense, Inventory Loss, Inventory Valuation, Stock Verification, Withdrawal.

**Responsibilities:**
- Aggregation and presentation only — never a source of truth, never mutates underlying domains.
- Export to PDF/XLSX.

**Relationships:** Reads from every domain in 3.4–3.8; will read from AI (3.16) once forecasting/insight reports exist.

**Dependencies:** All Inventory and Financial domains. No domain depends on Reports — this is intentionally a leaf/terminal domain, which keeps it safe to extend without risk to core calculations.

---

## 3.10 TIMELINE *(Existing)*

**Purpose:** An append-only, chronological narrative of every material event in the business — already functions as a de facto audit log (identified as a strength in the audit) even though it isn't yet formally positioned as one.

**Responsibilities:**
- Records what happened, when, by whom, with what financial impact, in human-readable form.
- Never edited once written (Principle 2.10); corrections are new entries.

**Relationships:** Written to by nearly every other domain (Inventory, Financial, Staff) as a side effect of their own actions.

**Dependencies:** Business (3.2). Conceptually depends on every domain that writes to it, but has no dependency back onto them (write-only relationship, no reads required by other domains).

**Forward note:** Section 9 will define a separate, platform-level **Audit Log** for SuperAdmin actions — distinct from this business-facing Timeline, per the reasoning in the audit (a platform action shouldn't silently appear as if the owner did it).

---

## 3.11 STAFF *(Existing)*

**Purpose:** Represents the people (beyond the owner) who act within a business.

**Responsibilities:**
- Identity, business scoping (currently one shop per staff member), suspension state.
- Currently a single flat role ("staff") with reduced tab access — Section 6 (User Architecture) will expand this into the full role matrix from the audit.

**Relationships:** Belongs to one Business; actions taken by staff are attributed in the Timeline (3.10); staff accounts are provisioned/removed via the server-verified privileged action pattern (Principle 2.9).

**Dependencies:** Business (3.2), User identity (Firebase Auth).

---

## 3.12 NOTIFICATIONS *(New — proposed)*

**Purpose:** Deliver time-sensitive or important information to an owner or staff member outside of the app being open — overdue closings, low-stock/high-quebra alerts (Dashboard's "needs attention" concept), subscription/billing events, platform announcements.

**Responsibilities:**
- Channel-agnostic delivery abstraction (in-app, email, and — per Section 1.4's target market and the audit's own recommendation — WhatsApp, given the platform's PT/FR localization and target region).
- Respects user/business notification preferences.
- Never a source of truth for any financial fact — purely a delivery mechanism for facts computed elsewhere.

**Relationships:**
- Triggered by events from Financial (3.8), Inventory (3.3–3.7), Subscriptions (3.13), and SuperAdmin (3.14).
- Consumed by Staff/Owner (3.11) and, separately, by SuperAdmin's own alerting (3.14).

**Dependencies:** Business (3.2) for business-scoped notifications; platform-level event sources (3.13, 3.14) for platform notifications.

**Worth-First scope test:** Passes — this domain exists to surface Worth-relevant events (financial health alerts, closing reminders) faster, not to add a general messaging/communication feature.

---

## 3.13 SUBSCRIPTIONS *(New — proposed)*

**Purpose:** Represents the commercial relationship between a Business (or owner) and the Sabush BPT platform — plan, billing state, trial status, feature entitlements.

**Responsibilities:**
- Plan tier, status (trial/active/past-due/canceled), renewal date, payment history reference.
- Source of truth for **feature gating** (which plan tier unlocks which capability — e.g., number of shops beyond a free tier's limit, access to AI features in Section 10).

**Relationships:**
- Attaches to a Business or owning User (exact binding is a Section 9 design decision, since multi-shop owners need a clear answer to "is this one subscription for all my shops, or one per shop").
- Read by **SuperAdmin** (3.14) for billing operations.
- Read by **Notifications** (3.12) for billing/renewal alerts.
- Read by every operational domain that needs to check a feature-gate (e.g., Business domain checking "can this owner add an 11th shop").

**Dependencies:** Business (3.2), a payment processor integration (external, Section 4).

**Worth-First scope test:** Passes — this domain doesn't touch how worth is calculated; it governs commercial access to the platform that calculates it. Kept strictly separate from the financial domains in 3.8 so subscription billing is never confused with the business's own financial data (an important trust boundary — an owner's Sabush subscription invoice is not part of their business's Expenses).

---

## 3.14 SUPERADMIN *(New — proposed)*

**Purpose:** The platform-operator layer — everything Sabush (the company) needs to run the platform responsibly across thousands of tenants without direct database console access.

**Responsibilities:**
- Tenant visibility and management (suspend/reactivate, support context).
- Subscription/billing operations.
- Feature flags.
- Platform-level audit logging (distinct from the per-business Timeline, 3.10).
- Platform analytics (aggregate, anonymized — never raw cross-tenant reads, per Principle 2.8).
- Impersonation, always time-boxed and logged (Principle 2.9).

**Relationships:** Reads *about* every Business (3.2), Subscription (3.13), and Staff (3.11) domain through an aggregation/audit boundary — never a direct unaudited cross-tenant query. Writes to its own platform Audit Log, separate from Timeline (3.10).

**Dependencies:** Business, Subscriptions, Staff — all read-only except for the explicit, audited privileged actions defined in Section 9.

**Worth-First scope test:** Passes — SuperAdmin doesn't add a customer-facing feature; it's the operational layer required to responsibly run a Worth-focused platform at the Mission's stated scale. Full design in Section 9.

---

## 3.15 AI *(New — proposed)*

**Purpose:** Enhances the platform's core promise — understanding business worth — with predictive and diagnostic intelligence: capital forecasting, business worth prediction, dead-stock detection, risk detection, recommendations.

**Responsibilities:**
- Consumes historical data from Inventory (3.3–3.7) and Financial (3.8) domains for a single business (never cross-tenant raw data, per Principle 2.8) to produce per-business insights.
- May consume aggregated, anonymized platform-wide patterns (via the same boundary SuperAdmin's analytics use) to improve model quality — never raw tenant data directly.
- Produces recommendations/predictions as a distinct, clearly-labeled category — never silently merged into actual historical figures (Principle 2.4: an AI forecast is not a fact).

**Relationships:** Reads from Inventory, Financial, Timeline (for pattern context); writes to Reports (as a new report category) and Notifications (for risk alerts); never writes to or alters any core financial record.

**Dependencies:** Inventory and Financial domains (read-only), an aggregation layer for any cross-tenant model training.

**Worth-First scope test:** Passes explicitly and directly — this is the domain most clearly aligned with the Mission's "capital forecasting, business worth prediction, dead stock detection" examples. Full design in Section 10.

---

## 3.16 ANALYTICS *(New — proposed)*

**Purpose:** Platform-wide, aggregate measurement — adoption, growth, churn signals, feature usage — for Sabush's own product and business decisions. Distinct from AI (3.15), which serves the *tenant's* insight needs, and distinct from Reports (3.9), which serves a *single business's* insight needs.

**Responsibilities:**
- Aggregate metrics across tenants, always anonymized/aggregated before crossing the tenant-isolation boundary (Principle 2.8).
- Feeds the SuperAdmin Dashboard (3.14) and product-development prioritization.

**Relationships:** Consumes aggregated data via the same boundary as AI (3.15) and SuperAdmin (3.14) — the three platform-level domains share one aggregation/anonymization layer rather than each building their own (a Section 4 architectural decision, stated here so it isn't re-derived independently three times).

**Dependencies:** The shared aggregation layer (Section 4/7); indirectly, every Business's data, always through that layer.

**Worth-First scope test:** Passes as an operational-support domain — it doesn't change what the product does for tenants, it's what lets Sabush run the product responsibly at scale, same justification as SuperAdmin (3.14).

---

## 3.17 Dependency Summary Table

| Domain | Depends On | Depended On By |
|---|---|---|
| Business | — (root) | All domains |
| Products | Business | Stock Batches, Reports |
| Purchase Batches | Business, Products | Stock Batches, Timeline, Reports |
| Stock Batches | Products, Purchase Batches | Breakages, Reports, Dashboard |
| Breakages/Quebras | Stock Batches | Reports, Timeline, AI |
| Expenses | Business | Reports, Timeline, Closings |
| Withdrawals | Business | Reports, Timeline, Closings |
| Stock Counts | Products, Business | Reports, Closings |
| Closings | Expenses, Withdrawals, Stock Batches, Breakages | Reports, Timeline |
| Reports | All Inventory + Financial domains | (leaf — nothing depends on it) |
| Timeline | Business (written by all) | (leaf for reads — nothing depends on it structurally) |
| Staff | Business, Auth | Timeline |
| Notifications | Business, Financial, Subscriptions, SuperAdmin | Staff/Owner |
| Subscriptions | Business | SuperAdmin, Notifications, feature-gating checks platform-wide |
| SuperAdmin | Business, Subscriptions, Staff (read via aggregation) | Analytics feeds Dashboard |
| AI | Inventory, Financial, Timeline (read-only, per-tenant) | Reports, Notifications |
| Analytics | Shared aggregation layer over all Business data | SuperAdmin Dashboard |

This table is the reference Section 4 (System Architecture) will use to decide *where* each domain physically lives (client SDK, Cloud Function, scheduled job) and Section 7 (Data Architecture) will use to decide collection structure and access boundaries.

---

## What Sections 4–15 Will Build On This

- **Section 4 (System Architecture)** will map each domain above to a physical component (SPA, Firestore collection, Cloud Function, external service) and show integration between them, including the shared aggregation layer introduced in 3.16.
- **Section 6 (User Architecture)** will expand Staff (3.11) into the full role matrix.
- **Section 7 (Data Architecture)** will turn this dependency map into concrete entity/collection design.
- **Section 9 (SuperAdmin Architecture)** and **Section 10 (AI Architecture)** will fully design the two most complex new domains introduced here (3.14, 3.15).

**This section requires your explicit approval before Section 4 (System Architecture) begins.**
