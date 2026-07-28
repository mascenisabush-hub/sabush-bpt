# Section 5 — Business Lifecycle

**Status:** Drafted, awaiting approval
**Depends on:** Section 1 (Product Vision) — approved · Section 2 (Core Product Principles) — approved · Section 3 (Domain Architecture) — approved · Section 4 (System Architecture) — approved
**Purpose:** Describe the complete lifecycle of a business inside Sabush BPT, stage by stage, in terms of the actual domains (Section 3) and system components (Section 4) involved at each stage — so Section 6 (User Architecture) can attach the right permissions to each stage, and Section 8 (Module Architecture) can design each stage's module against a lifecycle everyone has already agreed on.

Every stage below is described as it **actually happens today** where the audit confirms an implementation exists, with the **new system components from Section 4** (Notifications, the Background Worker, Subscriptions gating, SuperAdmin visibility) layered on top where the Mission's scale target requires them and Section 3 already scoped them in.

---

## 5.1 Lifecycle Overview

```
 Business Registration
        │
        ▼
 Business Setup  ──────────────────────────────┐
        │                                      │ (gates entry to next stage —
        ▼                                      │  5.7 Business Growth can also
 Initial Stock Count  (immutable once set)      │  loop back here for shop #2+)
        │                                      │
        ▼                                      │
 Products  ◄─────────────────────┐             │
        │                        │ (ongoing,   │
        ▼                        │  not a      │
 Stock Entry  ───────────────────┘  one-time   │
        │                            stage)    │
        ▼                                      │
 Monitoring  (continuous, every day)            │
        │                                      │
        ▼                                      │
 Periodic Closing  (monthly / yearly)           │
        │                                      │
        ▼                                      │
 Business Growth  ──────────────────────────────┘
        │
        ▼
 Historical Analysis  (continuous, from Closing #1 onward)
```

Only **Business Registration**, **Business Setup**, and **Initial Stock Count** are true one-time, ordered stages. From **Products** onward, most stages run concurrently and repeat indefinitely (a business adds Products and Stock continuously; Monitoring never stops; Closings repeat monthly/yearly) — the diagram above shows the *first-time* path a new business takes, not a strict state machine every subsequent action must follow. This distinction matters for Section 6 (User Architecture), which must not gate ongoing stages behind one-time-stage completion any more strictly than the product already correctly does.

---

## 5.2 Stage: Business Registration

**What happens:** A prospective owner creates a Firebase Auth account and, in the same flow, a `users/{uid}` profile document is created with `role: 'owner'`. This is the entry point into the system for every future Business (3.2) that owner will ever create.

**System components involved:** Firebase Auth (4.6) for identity; Firestore write of the profile document, governed by Security Rules (4.5) from the first write.

**Worth-First scope test:** Passes trivially — this stage exists purely to establish identity so every later Worth-related stage has an owner to belong to.

**What Section 4 adds here that didn't exist before:** Once Subscriptions (3.13, 4.12) exists, Registration is also the point a trial subscription state should be created — so an owner never has a business with *no* subscription record, which would otherwise force every later feature-gate check (4.12) to handle a null case. This is a Section 9 design detail; Section 5 fixes only that the trial record's lifecycle starts here, at Registration, not later.

---

## 5.3 Stage: Business Setup

**What happens:** The owner completes their Business Profile (name, category, currency, contact, location) via the profile setup flow. The existing `isBusinessProfileComplete` check gates whether a business is considered "set up" — this is a real, already-implemented completeness check, not a proposed one.

**System components involved:** Tenant SPA (4.3), Firestore write to the `businesses/{businessId}` document (4.5).

**Why this must complete before Initial Stock Count:** Currency and category are referenced by every Stock Batch and Report from this point forward; allowing Stock Entry before Setup would mean re-deriving those fields retroactively across every batch, which is exactly the kind of avoidable rework Principle 2.5 exists to prevent.

**Worth-First scope test:** Passes — an incomplete or ambiguous business identity would make every downstream Worth calculation (currency-dependent) untrustworthy.

---

## 5.4 Stage: Initial Stock Count

**What happens:** The owner records their starting inventory via the Initial Stock Count flow (`StockCountType: 'initial'`). This single record becomes `initialCapitalValue` — the baseline every future Capital Growth calculation (`capitalGrowth = businessWorth - initialCapitalValue`) is measured against.

**Why immutability matters here specifically (Principle 2.10):** Once set, this record must never be edited in place — it is the zero-point of the business's entire Worth history. The existing implementation already treats it this way; Section 5 confirms this is correct and must remain true as the product scales, since any future "just let them fix a typo" exception would silently rewrite every Capital Growth figure ever shown to that owner.

**An owner may skip this stage** (the existing flow supports `onSkip`) — a business with no Initial Stock Count simply has `hasInitialStockCount: false` and `initialCapitalValue` defaults to 0, meaning Capital Growth is measured from zero rather than blocked entirely. This is the correct behavior for an owner who wants to start using the product immediately and backfill later — consistent with Principle 2.6 (Simplicity Over Completeness): requiring a perfect starting count before any use would raise the product's adoption floor, which Section 1.6 identifies as the actual competitive moat.

**System components involved:** Tenant SPA, Firestore (`stockCounts` collection, scoped under the business).

---

## 5.5 Stage: Products (Ongoing, Not One-Time)

**What happens:** The owner builds and maintains their catalog (3.4) — adding products as their business carries new lines, editing catalog metadata (never a source of truth for financial calculations, per Section 3.4's explicit non-responsibility).

**Why this is drawn as a stage but treated as continuous:** A new business typically adds its first Products right after Setup, but Products is never "done" — a growing business adds new lines indefinitely. Section 6 must not design a permission model that assumes Products access is only relevant early in the lifecycle.

**System components involved:** Tenant SPA, Firestore (`products` collection).

---

## 5.6 Stage: Stock Entry (Ongoing)

**What happens:** The owner records Purchase Batches (3.5) and their constituent Stock Batches (3.6) — the actual real-world event of spending capital on inventory. This is the domain-level action Section 1.5 identifies as solving "I don't actually know what my business is worth" — every Stock Batch entered here is what makes the Worth number real rather than estimated.

**System components involved:** Tenant SPA, Firestore (`purchaseBatches`, `stockBatches`), Timeline (3.10) — every Stock Entry event is narrated there automatically, per Section 3.5's "feeds the Timeline" relationship.

**New from Section 4:** At sufficient stock-entry volume (a scale question Section 11 will quantify), this is also a natural place for an AI-driven insight (4.11) — e.g., flagging an unusually high cost price versus that product's history — computed server-side from that one business's own data, never blocking or altering the entry itself (Principle 2.4: an AI observation is not a correction).

---

## 5.7 Stage: Monitoring (Continuous)

**What happens:** The owner (and permitted staff) view the Dashboard, Reports (3.9), and Timeline (3.10) on an ongoing basis — this is not a discrete action but the day-to-day use the entire product exists to support, per the Mission's framing of Worth as "always-current," not a periodic report.

**System components involved:** Tenant SPA reading directly from Firestore (4.5) — no privileged server involvement, since Monitoring is read-only for the owner's own tenant data and Security Rules alone are sufficient to secure it.

**New from Section 4:** This stage is where Notifications (3.12, 4.9) surface proactively — a low-stock or high-Quebra alert the Dashboard's existing "needs attention" concept already gestures at, but which the Background Worker (4.8) can now also push to the owner even when they aren't looking at the Dashboard that day. This is additive to Monitoring, not a replacement for the existing in-app concept — it extends the same underlying signal to a channel that doesn't require an open browser tab.

---

## 5.8 Stage: Periodic Closing (Monthly / Yearly)

**What happens:** The owner performs a Closing (`ClosingPeriodType: 'monthly' | 'yearly'`) for a period, via the existing Closing flow. `isPeriodClosed` prevents a period from being closed twice — an already-correct guard against double-counting. Once recorded, a Closing is immutable (Principle 2.10), consistent with every other "record of fact the owner needs to trust later."

**Why Closing is architecturally significant, not just another report:** A Closing is the point where Expenses, Withdrawals, Stock Batches, and Breakages for a period are locked together into a single, permanent figure — per Section 3.17's dependency table, Closings depend on all four of those domains and feed both Reports and Timeline. This makes it the natural anchor for **Historical Analysis** (5.10) — every period-over-period comparison Section 1's Vision promises is a comparison between Closings, not a live recomputation over raw data each time.

**System components involved:** Tenant SPA, Firestore (`closings` collection), Timeline (a Closing is always narrated there).

**New from Section 4:** An approaching or missed Closing period is exactly the kind of scheduled, no-open-tab-required alert the Background Worker (4.8) and Notifications (4.9) were designed for — a monthly reminder a few days before period-end, and a distinct "overdue" alert if the period closes without a Closing recorded, both computed by the Worker scanning `isPeriodClosed` state across all businesses on its scheduled run, not by any user's browser being open.

---

## 5.9 Stage: Business Growth

**What happens:** An owner's business grows in one of two ways the current system already supports: adding more Stock/Products within one shop (organic growth, already covered by 5.5–5.6 continuing indefinitely), or **adding an additional shop** via the existing `addShop` flow (multi-shop, capped at 10 per Section 1.4/3.2).

**Adding a shop re-enters this lifecycle at Business Setup (5.3)** for the new shop specifically — it gets its own Business Profile, its own option to record an Initial Stock Count, its own Products and Stock Entry — while remaining under the same owner identity (`ownedBusinessIds`). This is why 5.1's diagram shows Business Growth looping back to Setup: growth is not a new lifecycle, it's the same lifecycle re-entered for a new tenant-scoped Business under an existing owner.

**New from Section 4:** This is the stage where Subscriptions' feature-gating (3.13, 4.12) becomes directly visible to the owner — the 11th-shop attempt is exactly the check Section 3.13 names explicitly ("can this owner add an 11th shop"), read live from the `subscriptions` collection before `addShop` is allowed to proceed. This is a real constraint this document series is introducing at Business Growth, not a hypothetical future one — Section 9 will design the specific plan tiers and limits; Section 5 fixes that the check happens at this exact point in the lifecycle.

---

## 5.10 Stage: Historical Analysis (Continuous, From First Closing Onward)

**What happens:** Once at least one Closing exists, the owner can compare periods — capital growth trend, loss trend, expense trend over time — via Reports (3.9). This is the stage where the Mission's promise of understanding whether worth is "growing or shrinking" (Section 1.1) is actually delivered, since a single point-in-time Worth number cannot answer that question — only a series of them, anchored by Closings, can.

**System components involved:** Tenant SPA, Reports reading across the `closings` collection and the domains it locked in at each period.

**New from Section 4:** This is also where **AI's per-business insight capability** (3.15, 4.11) has its clearest application — capital forecasting and business-worth prediction are, by definition, extrapolations from Historical Analysis data. The AI integration point fixed in 4.11 (server-invoked, reads that one business's own data, writes back as a clearly-labeled, never-merged-with-fact Report entry) applies directly here. Full design of what gets forecast and how is Section 10's job.

---

## 5.11 Lifecycle Summary Table

| Stage | One-time or ongoing | Primary domains (Section 3) | New Section-4 components involved |
|---|---|---|---|
| Business Registration | One-time | Business, Staff/Auth | Subscriptions (trial record created) |
| Business Setup | One-time (per shop) | Business | — |
| Initial Stock Count | One-time (per shop), immutable, skippable | Inventory (Stock Counts) | — |
| Products | Ongoing | Products | AI (future repricing signal, Section 10) |
| Stock Entry | Ongoing | Purchase Batches, Stock Batches, Timeline | AI (anomaly signal), Notifications |
| Monitoring | Continuous | Reports, Timeline, Dashboard | Notifications, Background Worker |
| Periodic Closing | Recurring (monthly/yearly) | Closings, Expenses, Withdrawals, Breakages | Notifications, Background Worker |
| Business Growth | Recurring, loops to Setup | Business (new shop) | Subscriptions (feature gating) |
| Historical Analysis | Continuous, from Closing #1 | Reports, Closings | AI (forecasting) |

---

## What Sections 6–15 Will Build On This

- **Section 6 (User Architecture)** will assign which roles (Owner, Manager, Staff, Support, Developer, SuperAdmin) can act at each stage above — particularly Business Growth's subscription-gated shop creation and SuperAdmin's visibility into lifecycle stage as a support/health signal.
- **Section 8 (Module Architecture)** will design each stage's module in full (inputs/outputs/business rules), using this lifecycle as the agreed sequencing.
- **Section 9 (SuperAdmin Architecture)** will use Registration and Business Growth (5.2, 5.9) as the points where Subscription state is created and gated.
- **Section 10 (AI Architecture)** will fully design the two AI touchpoints named here (Stock Entry anomaly signal, Historical Analysis forecasting).
- **Section 13 (Development Strategy)** will use this lifecycle to help sequence implementation — the audit's findings apply most urgently to the stages already live in production (5.3–5.8), while 5.2's subscription-trial creation and 5.9's gating are net-new work this document series has now specified.

**This section requires your explicit approval before Section 6 (User Architecture) begins.**
