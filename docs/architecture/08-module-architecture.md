# Section 8 — Module Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–7 — all approved (Section 7 approved per go-ahead to begin Section 8)
**Purpose:** For every module — Purpose, Inputs, Outputs, Dependencies, Business Rules, Future Extensions — grounded in what's actually built (audit-confirmed, and re-confirmed directly against `src/` for this section) rather than a hypothetical redesign. Per the brief: **do not redesign modules already working well.** Section 8's job is to document the working modules precisely enough that Sections 9–13 can build against them without re-deriving their rules, and to resolve the two structural gaps Section 4 named but deferred here: the `AppContext` decomposition (4.3) and the Storage upload flow (4.7).

---

## 8.1 Module Map

Modules below map directly onto `src/` as it exists today, grouped by the domain they serve (Section 3):

| Module | Primary files | Domain (Section 3) |
|---|---|---|
| Calculation Engine | `utils/calculations.ts` | Cross-cutting (used by every module below) |
| Purchase Batches | `utils/purchaseBatchCalculations.ts`, `components/AddStockView.tsx` | Purchase Batches, Stock Batches |
| Products | `components/EditProductModal.tsx`, `ProductDetailModal.tsx` | Products |
| Stock Entry & Quebras | `components/AddStockView.tsx`, `AddQuebraView.tsx` | Stock, Breakages |
| Stock Counts | `components/InitialStockCountView.tsx`, `PeriodicStockCountView.tsx` | Stock Counts |
| Financial (Expenses/Withdrawals) | `components/AddExpenseView.tsx`, `AddWithdrawalView.tsx` | Expenses, Withdrawals |
| Closing | `components/ClosingView.tsx` | Closing |
| Reports | `components/reports/*`, `reportInsights.ts`, `reportExport.ts` | Reports |
| Timeline | `components/timeline/*` | Timeline |
| Staff & Auth | `components/AuthView.tsx`, `QuickLoginScreen.tsx`, `SettingsModal.tsx` | Staff, Auth (4.6) |
| Business Profile | `components/BusinessProfileSetupModal.tsx`, `ShopSwitcher.tsx` | Business |
| App State (`AppContext`) | `context/AppContext.tsx` | Cross-cutting — the current shared state layer for all of the above |
| Dashboard | `components/DashboardView.tsx` | Reports (summary view) |

Everything below documents these as they exist. Notifications, Subscriptions, SuperAdmin, AI, and Analytics have no module yet (Section 4 fixed only their system-level placement) — they are out of scope for Section 8 and become real modules only when Sections 9/10/13 schedule their build.

---

## 8.2 Calculation Engine (`utils/calculations.ts`)

**Purpose:** The single source of truth for every Investment Value, Market Value, and Embedded Profit figure anywhere in the app. Every other module either calls into this engine or has no business computing these figures itself.

**Inputs:** A `StockBatch` (or set of them) and the `Quebra[]` array relevant to it. `generateReportSummary` additionally takes a date range, `Product[]`, `Expense[]`, and `Withdrawal[]`.

**Outputs:** `BatchCalculation` (per-batch: remaining quantity, Investment/Market Value, Embedded Profit, `isEstimate`, `hasExceededWarning`), aggregate totals (`calculateInventoryTotals`), or a full `ReportSummary` for a date range.

**Dependencies:** None — this module depends on nothing else in `src/`, which is exactly why every other module is allowed to depend on it without a circular-dependency risk.

**Business rules (already correctly encoded, kept as-is per the brief):**
- A Quebra reduces `remainingQuantity`, and both Investment Value and Market Value are derived from that *same* reduced quantity — never one adjusted and the other not (7.1's "live source wins" rule, expressed at the calculation layer).
- `isEstimate` is true whenever `batch.status === 'open'` — an open batch's Embedded Profit is potential, not finalized, and every consumer of `BatchCalculation` must preserve that distinction in its own UI rather than presenting an estimate as a closed figure.
- Nothing in this module ever computes or implies a "sale" or "revenue" — Embedded Profit is unsold inventory value, consistent with Section 1's Worth-First scope test.

**Future extensions:** This is the one module every AI feature (Section 10) will read from for its financial inputs — capital forecasting and dead-stock detection both need `BatchCalculation`-shaped data, not a reimplementation of it. No change is anticipated to this module itself; its role in Section 10 is purely as a stable input source.

---

## 8.3 Purchase Batches (`utils/purchaseBatchCalculations.ts` + `AddStockView.tsx`)

**Purpose:** Groups one or more Stock Batch line items entered together into a single Purchase Batch — the "Investment Ledger" entry an Admin actually thinks in terms of (one supplier delivery, several products).

**Inputs:** A `PurchaseBatch` record, its associated `StockBatch[]` line items, `Quebra[]`, `Product[]`.

**Outputs:** `PurchaseBatchSummary` — per-line-item calculations (via 8.2, never reimplemented) plus originals-at-purchase and current-quebra-adjusted totals side by side, and a permanent `batchNumber` (e.g. `BAT-000001`, `generateBatchNumber`) that is never re-issued and never exposes the underlying Firestore document ID to the user.

**Dependencies:** Calculation Engine (8.2) for every per-line figure — this module only aggregates and formats, it does not recompute.

**Business rules:**
- `batchNumber` sequencing (`getNextBatchSeq`) is client-derived from the highest `batchSeq` seen — correct at this business's current scale (Principle 2.6); Section 11 is where a concrete threshold for moving this server-side, if ever needed, gets decided.
- Original-at-purchase figures and current (quebra-adjusted) figures are always shown side by side, never collapsed into one number — this is what lets an Admin see "what I invested" versus "what's left" without losing either fact (7.1).

**Future extensions:** None needed for this module itself. It is a pure aggregation layer over 8.2 and 7.2's `purchaseBatches`/`batches` entities; new domains (Subscriptions, AI) have no reason to touch it.

---

## 8.4 Products (`EditProductModal.tsx`, `ProductDetailModal.tsx`)

**Purpose:** Manages the Product catalog — the reference metadata a Stock Batch is entered against, never itself a source of financial truth.

**Inputs:** Product name, category, reference `costPrice`/`sellingPrice` (metadata only), and — for the detail view — every `StockBatch`/`Quebra` linked to that product, via 8.2.

**Outputs:** A `Product` record (7.2); a computed per-product summary in `ProductDetailModal` built the same way `generateReportSummary` builds a per-product detail (8.2), never independently.

**Dependencies:** Calculation Engine (8.2) for any per-product financial figure it displays.

**Business rules:** A Product's reference price is metadata for pre-filling the next Stock Batch entry — it is never itself a calculation input (7.1's rule, restated at the module level, since this is the exact place a well-intentioned shortcut could quietly violate it).

**Future extensions:** Section 4.7's deferred Storage upload flow (product photos) belongs here — this is the module that gains it. Per 4.7's fixed constraint, any photo path must be scoped `businesses/{businessId}/products/{productId}/...` in Storage, secured by Storage Security Rules deriving access from the same `users/{uid}` identity Firestore rules already use — not a second, parallel permission system.

---

## 8.5 Stock Entry & Quebras (`AddStockView.tsx`, `AddQuebraView.tsx`)

**Purpose:** Records new Stock Batches (inventory entering the business) and Quebras (inventory lost to breakage/spoilage/theft) against them.

**Inputs:** Product selection, quantity, `costPrice`/`sellingPrice` at time of purchase, optional `purchaseBatchId` link (8.3); for Quebras — `batchId`, quantity lost, reason.

**Outputs:** A new `StockBatch` document (7.2, price fields immutable once written) or `Quebra` document (7.2, immutable once created); a corresponding `TimelineEvent` (8.8) written alongside, per the existing pattern.

**Dependencies:** Calculation Engine (8.2, via `isQuebraExceedingWarning` for the over-loss guard); Timeline (8.8) as a write-side effect.

**Business rules:**
- `costPrice`/`sellingPrice` are captured **at time of purchase** and frozen — a later reference-price change on the Product (8.4) never retroactively changes an already-written Stock Batch (7.1, 7.2).
- A Quebra cannot be edited after creation; a correction is a new, separate Quebra record referencing what it corrects (7.6's general correction pattern) — this module enforces the write path, it does not merely document the intent.
- `isQuebraExceedingWarning` warns (does not block) when cumulative losses would exceed the batch's original quantity — a data-quality signal, not a hard rule, since a real-world miscount shouldn't be structurally impossible to record.

**Future extensions:** None required by any Section 3 domain currently designed. If AI's dead-stock detection (Section 10) ever needs a "why was this lost" signal beyond the free-text `reason` field, that is a Section 10 decision to make against this module's existing shape, not a reason to change it now.

---

## 8.6 Stock Counts (`InitialStockCountView.tsx`, `PeriodicStockCountView.tsx`)

**Purpose:** Physical inventory verification — an as-counted snapshot compared against as-recorded figures, used to catch discrepancies the Stock Entry/Quebra flow alone wouldn't surface.

**Inputs:** A count type (`initial | weekly | monthly | quarterly | yearly | custom`), counted quantities per product/batch.

**Outputs:** A `StockCount` document (7.2). The `initial` type is the one permanently immutable record in the entire schema (7.2, 7.6, Principle 2.10) — every later Capital Growth figure is measured against it.

**Dependencies:** Calculation Engine (8.2) to compute the as-recorded figure the count is compared against.

**Business rules:** The `initial` Stock Count, once written, can never be edited or deleted by any role, including Admin — this is enforced at the Security Rules layer (7.6), not merely by UI omission, since a UI-only restriction would not actually satisfy Principle 2.10.

**Future extensions:** None identified. This module's shape (compare counted-vs-recorded, snapshot the result) is stable regardless of scale.

---

## 8.7 Financial: Expenses & Withdrawals (`AddExpenseView.tsx`, `AddWithdrawalView.tsx`)

**Purpose:** Two deliberately separate record types for money leaving the business — Expenses (a real business cost) and Withdrawals (an owner taking capital out) — kept apart because collapsing them would misstate both Business Worth and personal draw (Principle 2.4).

**Inputs:** Amount, category (Expense) or reason (Withdrawal), date.

**Outputs:** An `Expense` or `Withdrawal` document (7.2) — mutable until a Closing (8.8) locks it into a frozen period.

**Dependencies:** None beyond Firestore writes directly; Closing (8.8) is a downstream dependent, not the other way around.

**Business rules:** Once a Closing has included an Expense/Withdrawal in its frozen snapshot, that record becomes historical input to an immutable record (7.6) — this module's edit/delete UI must check `closingId`/period-locked status before allowing a change, consistent with 7.6's "mutable until locked, then frozen" rule.

**Future extensions:** None required. A future Subscriptions-driven billing charge (3.13) is explicitly **not** an Expense in this sense — it is platform-level (7.4), never conflated with a tenant's own recorded Expenses.

---

## 8.8 Closing (`ClosingView.tsx`)

**Purpose:** Locks a period's Expenses, Withdrawals, Stock, and Breakages together into one permanent figure — the mechanism that turns "current state" into "historical record," per Section 5.8's lifecycle stage.

**Inputs:** Period type, every Expense/Withdrawal/StockBatch/Quebra dated within the period.

**Outputs:** A `Closing` document (7.2) — `periodType` plus frozen snapshot fields (`totalEmbeddedProfit`, `businessWorthAtClose`, etc.), immutable once recorded (7.6). Deleting a Closing re-opens the period; it never edits the frozen figures in place.

**Dependencies:** Calculation Engine (8.2) for every snapshot figure; Financial module (8.7) for the Expense/Withdrawal totals it locks.

**Business rules:** A Closing is the one write in the entire app that simultaneously locks records across four other modules — this module owns that cross-cutting transaction, and no other module should independently decide when a period is "closed."

**Future extensions:** This is the natural hook for the Manager tier's `closings` permission (6.3/7.3) — the Security Rules change (`isOwnerOrGrantedManager`, 6.3) is a rules-layer concern, but this module's UI gating (who sees the "Perform Closing" action) is where that permission actually surfaces to a user. Also the natural trigger source for a future "Closing completed" Notification (3.12, 4.9) once that domain is built.

---

## 8.9 Reports (`components/reports/*`)

**Purpose:** Read-only, derived views over the Calculation Engine's output — Business Worth, Capital Growth, Inventory Valuation, Inventory Loss, Batch Performance, Expense, Withdrawal, and Stock Verification reports.

**Inputs:** Date range, plus whatever entity set (7.2) the specific report concerns; every report is computed from live source records via 8.2, never from a cached/denormalized figure (7.1).

**Outputs:** A rendered report view; `reportExport.ts` additionally produces a PDF (via `batchPdfExport.ts` for batch-specific exports).

**Dependencies:** Calculation Engine (8.2) exclusively for figures — this module has no calculation logic of its own, only presentation and filtering (`reportInsights.ts`, `ReportFilterBar.tsx`).

**Business rules:** No report may compute a figure independently of 8.2 — a report showing a different Embedded Profit number than the Dashboard for the same data would itself be a data-integrity failure, not a display bug, per 7.1.

**Future extensions:** AI's per-business insights (Section 10) are additive here — a new "AI Insight" card type alongside the existing report types, written by the privileged server/Background Worker (4.11) and displayed the same way an existing report already displays a computed figure, never merged into the figure itself.

---

## 8.10 Timeline (`components/timeline/*`)

**Purpose:** An append-only, human-readable activity log — every action across every other module writes one `TimelineEvent`, giving an Admin a single chronological view of what happened.

**Inputs:** Event type, `financialImpact[]`, denormalized display fields (`productName`, `supplierName`, `batchNumber` — 7.2's bounded, documented denormalization exception).

**Outputs:** A `TimelineEvent` document — `allow update: if false` already enforced (7.2, 7.6); a correction is a new event, never a rewrite.

**Dependencies:** Written as a side effect by every other module (8.3–8.8) that performs a mutating action; has no dependency of its own.

**Business rules:** Every mutating action in the app must produce exactly one corresponding Timeline Event — this module's contract with every other module is "you write when you mutate," not optional or best-effort.

**Future extensions:** The platform Audit Log (7.4, distinct from this per-business Timeline) follows the identical append-only pattern one level up, for platform-operator actions (6.5–6.7) rather than tenant actions — Section 9 will specify its schema, but the pattern this module already proves correct is the template.

---

## 8.11 Staff & Auth (`AuthView.tsx`, `QuickLoginScreen.tsx`, `SettingsModal.tsx`)

**Purpose:** Firebase Auth login for Admins, PIN-based quick-login for Staff on a shared device, and Staff roster management.

**Inputs:** Credentials (Auth) or PIN (quick-login); Staff add/suspend/reset-PIN actions from `SettingsModal`.

**Outputs:** A Firebase Auth session; a `users/{uid}` profile document (7.3, source of truth for role/`staffTier`/`managerPermissions`); a `staff/{id}` display mirror (7.2).

**Dependencies:** Privileged server (4.4) for suspend/delete/reset-PIN actions, per the existing pattern of never trusting a client to perform those unilaterally.

**Business rules:** `suspended` takes effect at the Security Rules layer immediately, not at next token refresh (4.6) — this module's UI reflects that state, it does not itself enforce it (enforcement lives in `firestore.rules`, not here).

**Future extensions:** This is where the Manager tier (6.3) surfaces to an Admin — a `staffTier`/`managerPermissions` toggle added to the existing Staff-management UI in `SettingsModal`, using the same add/suspend pattern already correct for Staff. No new component is required; this is an extension of an existing, working UI, consistent with the brief's "do not redesign modules already working well."

---

## 8.12 Business Profile (`BusinessProfileSetupModal.tsx`, `ShopSwitcher.tsx`)

**Purpose:** Business creation/setup, and multi-shop switching for Admins who own more than one Business.

**Inputs:** Business name, category, `currencySymbol`, and — for `ShopSwitcher` — the Admin's `businessIds` list (7.2's Admin relationship model).

**Outputs:** A `businesses/{businessId}` document.

**Dependencies:** None beyond direct Firestore writes.

**Business rules — amendment carried from Section 7.1:** `currencySymbol` must become read-only in this module's edit UI once the business has any financial record (its first Stock Batch, Expense, Withdrawal, or Stock Count) — the module-level enforcement point for 7.1's currency-lock rule. Before that point, it remains freely editable during setup, exactly as today.

**Future extensions:** Business Growth (adding an 11th... no, up to the 10-shop cap, 5.9/6.2) and the future `status: 'closed'` flag (7.9) both surface here — closing a business is a state this module's UI will need a new action for, once Section 13 schedules that build.

---

## 8.13 App State (`context/AppContext.tsx`) — The Decomposition Section 4.3 Deferred

**Purpose today:** A single, centralized React context holding effectively all cross-module state — current business, products, batches, quebras, expenses, withdrawals, staff, paired devices, and the derived calculations most views read from.

**The named gap (Section 4.3, resolved here):** At 1,675 lines, `AppContext` is already the audit-flagged scale risk. Section 4.3 fixed the *rule* — new domains get their own context slice, never appended to this file — but deferred the concrete decomposition to Section 8. The decomposition:

- **`AppContext` keeps:** identity/session state (current user, current business, `businessIds`), and the core operational entities every existing module (8.3–8.10) already reads — Products, Stock Batches, Quebras, Expenses, Withdrawals, Staff. This is not a rewrite; it is today's file, minus what moves out below.
- **`NotificationContext` (new, Section 4.9's frontend counterpart):** the notification feed and preferences — a live Firestore listener scoped to the current user, independent of every operational entity above. Nothing in 8.2–8.12 needs to re-render when a notification arrives; folding it into `AppContext` would make every existing module pay that re-render cost for no reason.
- **`SubscriptionContext` (new, Section 4.9/4.12's frontend counterpart):** the current business's entitlement/plan state, read wherever a feature-gating check (3.13) needs it (e.g., "can this Admin add an 11th shop"). Read-mostly, refreshed on webhook-driven change, not on every keystroke elsewhere in the app.
- **AI insight state (Section 10, when built):** its own slice for the same reason — a per-business AI insight is read by Reports (8.9) and Dashboard, but its refresh cadence (periodic, server-computed) is nothing like the live-write cadence of Stock Entry (8.5), and coupling them in one context would be exactly the anti-pattern the audit already flagged once.

**Business rule this decomposition must not violate:** every module in 8.2–8.12 continues to read from `AppContext` exactly as it does today — this section changes nothing about what those modules import from, it only stops the file from growing further by giving new domains their own home from day one, per Principle 2.5 (Scalable by Default).

**Future extensions:** Section 13 (Development Strategy) sequences when `NotificationContext`/`SubscriptionContext` actually get created — Section 8 only fixes that they must be separate from the start, not a "for now" shortcut that becomes technical debt the moment Notifications ships.

---

## 8.14 Dashboard (`DashboardView.tsx`)

**Purpose:** The at-a-glance summary view — the first thing an Admin sees, aggregating the same figures Reports (8.9) computes in detail.

**Inputs:** The same entity set every Report reads, via `AppContext` (8.13).

**Outputs:** Summary cards (Business Worth, Capital Invested, Embedded Profit, Stock Value) — computed via `calculateInventoryTotals` (8.2), never a separate implementation of the same math.

**Dependencies:** Calculation Engine (8.2), `AppContext` (8.13).

**Business rules:** Must never show a figure that could disagree with the same figure on a Report (8.9) or a Closing snapshot (8.8) for the same data — all three read the identical calculation functions by design, not by convention alone.

**Future extensions:** The natural home for a future AI insight summary (Section 10) or a Subscription-status banner (3.13) once those domains ship — both additive cards, not a restructure of this view.

---

## What Sections 9–15 Will Build On This

- **Section 9 (SuperAdmin Architecture)** builds the SuperAdmin app as a genuinely separate module set (4.13) — it will reuse the Timeline pattern (8.10) for the platform Audit Log, but shares no component code with the modules above.
- **Section 10 (AI Architecture)** designs its features as read-only consumers of the Calculation Engine (8.2) and additive cards in Reports (8.9) and Dashboard (8.14) — never a parallel calculation path.
- **Section 11 (Scalability Strategy)** will give concrete pagination/indexing guidance for the modules that currently query unbounded lists (Reports, Timeline) and a concrete threshold for moving Purchase Batch numbering (8.3) server-side if ever needed.
- **Section 12 (Security Architecture)** will formalize the Storage Security Rules this section fixed the shape of (8.4) and the `currencySymbol` lock (8.12) into explicit, auditable controls.
- **Section 13 (Development Strategy)** sequences the `AppContext` decomposition (8.13), the Manager-tier UI surfacing (8.11), and the Storage upload flow (8.4) relative to every other implementation priority.

**This section requires your explicit approval before Section 9 (SuperAdmin Architecture) begins.**
