# Section 7 — Data Architecture

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–6 — all approved
**Purpose:** Turn Section 3's domain map and Section 4's system-level collection decisions into concrete entity/collection design — what exists, how it relates, who owns it, what's immutable, and how tenant isolation is structurally guaranteed rather than merely intended. Architecture only, no query/SQL-level detail (Principle 2.6 — that belongs to implementation, not this document).

---

## 7.1 Data Model Philosophy

Firestore is a document database, and the existing schema (audit-confirmed) already follows the one pattern that matters most at this Mission's scale: **every operational entity is a document, tenant-scoped by nesting under its owning Business, never by a shared table with a `businessId` foreign key a query might forget to filter by.** This is stricter than a relational foreign-key model — it makes an un-scoped cross-tenant read structurally awkward to even attempt, which is exactly what Principle 2.8 (Tenant Isolation Is Non-Negotiable) demands. Section 7 preserves this pattern for every existing entity and extends it, not around it, for every new one.

A second existing pattern worth naming explicitly because Section 8 and beyond will rely on it: **calculated figures are never trusted from a denormalized field where the source record still exists.** A Product's reference price is metadata, not a calculation input (Section 3.4); a Stock Batch's own `costPrice`/`sellingPrice` is the only source of truth for Investment Value, Market Value, and Embedded Profit. Section 7 states this as a general data-architecture rule, not a one-off Product quirk: **wherever a figure could be computed two ways (from a live source record, or from a cached/reference value), the live source record wins, always** — this is Principle 2.4 (Data Integrity Over Convenience) expressed as a data-modeling rule.

---

## 7.2 Entity Catalog — Existing (Business-Scoped)

Every entity below lives at `businesses/{businessId}/{collection}/{id}` — nested under the tenant root, exactly as the audit confirmed and Section 4.5 already fixed as the general shape.

| Entity | Collection | Key fields (architecture-relevant only) | Immutable? |
|---|---|---|---|
| Business | `businesses/{businessId}` | `ownerUid`, `currencySymbol`, `category` | Mutable (Admin-editable profile fields) |
| Product | `.../products/{id}` | reference `costPrice`/`sellingPrice` (never a calculation source, 3.4) | Mutable (catalog metadata only) |
| Purchase Batch | `.../purchaseBatches/{id}` | `batchNumber` (permanent, human-readable), `supplier`, `archived` | `batchNumber` immutable; `archived` reversible |
| Stock Batch | `.../batches/{id}` (collection name predates the "Stock Batch" terminology — kept as-is, no rename, per Principle 2.6: a cosmetic rename of a working collection has a real migration cost and zero Worth-related benefit) | `costPrice`, `sellingPrice` **at time of purchase**, `status: open/closed`, optional `purchaseBatchId` link | Price fields immutable once written; `status` transitions `open → closed` |
| Quebra (Breakage) | `.../quebras/{id}` | `batchId`, `quantityLost`, `reason` | Immutable once created (a correction is a new, separate record — see 7.6) |
| Expense | `.../expenses/{id}` | `amount`, `category` | Mutable until included in a Closing (7.6) |
| Withdrawal | `.../withdrawals/{id}` | `amount`, `reason` — deliberately never merged with Expense (Principle 2.4) | Mutable until included in a Closing |
| Stock Count | `.../stockCounts/{id}` | `type: initial \| weekly \| monthly \| quarterly \| yearly \| custom`, `items[]`, `totalValue` | **The `initial` record is permanently immutable** (Principle 2.10) — the one hard rule in this table with zero exceptions |
| Closing | `.../closings/{id}` | `periodType`, snapshot fields (`totalEmbeddedProfit`, `businessWorthAtClose`, etc.) | Immutable once recorded; deletion re-opens the period, it never edits the frozen figures |
| Staff | `.../staff/{id}` | `uid`, `businessId`, `suspended` — a denormalized, business-scoped mirror of identity fields whose source of truth is `users/{uid}` (7.3) | Mutable (roster management); deletion is server-only (4.4), never a direct client delete |
| Timeline Event | `.../timelineEvents/{id}` | `type`, `financialImpact[]`, denormalized `productName`/`supplierName`/`batchNumber` for filtering only | **Append-only** — `allow update: if false` already enforced; a correction is a new event, the log itself is never rewritten |

**On denormalization (Timeline Event, Staff):** both entities intentionally duplicate a small number of fields (a name, a business ID) that also live on their true source record. This is a deliberate, bounded exception to "the live source wins" (7.1) — these specific fields exist purely for display/filtering speed, are never used as a calculation input, and are refreshed whenever the source changes (Staff's mirrored fields, for instance, are kept current the same way `AppContext` already keeps `PairedDevice`'s cached staff list current). Any *future* denormalization must meet this same bar — display/filter convenience only, never a second source of financial truth — or it violates 7.1's rule.

---

## 7.3 Identity and Tenant-Isolation Boundary

`users/{uid}` is the **one** source of truth for identity, role, and business membership — not a business-scoped entity itself, since a user (particularly a multi-shop Admin) can outlive or span multiple Businesses. Every Security Rule that decides tenant access (`isMemberOf`, `isOwnerOf`, `isSuspended`) reads this document, never a client-asserted claim — this is Principle 2.9 applied at the data layer, and it's what makes every other collection's Security Rule short and auditable (each one delegates the real membership check to this single document rather than re-implementing it).

**Section 6's Manager tier lands here, structurally:** the proposed `staffTier` field (Section 6.3) belongs on `users/{uid}` — the same document Security Rules already treat as authoritative — not on the business-scoped `staff/{id}` mirror. This keeps the pattern in 7.2's Staff row consistent: `users/{uid}` is authoritative, `staff/{id}` is a display mirror, exactly as it already is for `suspended`. A Manager-granted capability (e.g., "can suspend other Staff," per Section 6.3) is therefore checked the same way `isOwnerOf` is checked today: read `users/{uid}`, never trust the client.

---

## 7.4 New Top-Level (Platform-Scoped) Entities

These live outside any single `businesses/{businessId}` tree, per Section 4.5's fix that platform-level domains are top-level collections, readable-by-default only through the privileged server or the shared aggregation layer (4.10) — never a direct client read/write except where explicitly noted.

| Entity | Collection | Purpose (Section 3 domain) | Write path |
|---|---|---|---|
| Subscription | `subscriptions/{id}` | 3.13 | Privileged server only (webhook handler, 4.12; SuperAdmin billing actions, 6.7) |
| Notification | `notifications/{id}` | 3.12 | Background Worker (4.8) and privileged server (4.4); client reads its own feed |
| Platform Aggregate | `platform_aggregates/{period}` | Shared aggregation layer (4.10), feeding 3.14/3.15/3.16 | Background Worker only; read-only for SuperAdmin app and AI's cross-tenant path |
| Platform Audit Log | `platform_audit_log/{id}` | 3.14 (distinct from per-business Timeline, 3.10) | Privileged server only, on every SuperAdmin/Support/Developer privileged action (6.5–6.7); append-only, same immutability discipline as Timeline (7.2) |

**Why Subscription is top-level rather than nested under a Business:** Section 3.13 left the exact owner-vs-business binding to Section 9, but structurally, a top-level collection keyed by whichever entity Section 9 chooses (owner `uid` or `businessId`) is the only shape that doesn't force a premature choice — nesting it under one Business today would make "one subscription covers all my shops" (a live, undecided question per 3.13) structurally awkward to support later. This is Principle 2.12 in practice: the top-level shape survives either Section 9 decision without rework.

---

## 7.5 Entity Relationship Diagram

```
users/{uid}  ─────────────┐  (source of truth: role, staffTier, businessId(s), suspended)
   │                       │
   │ ownerUid              │ businessId (staff mirror)
   ▼                       ▼
businesses/{businessId}  ◄── staff/{id} (mirror only)
   │
   ├── products/{id} ◄────────────┐
   │                                │ productId
   ├── purchaseBatches/{id}         │
   │      │ purchaseBatchId (opt.)  │
   │      ▼                        │
   ├── batches/{id} ────────────────┘
   │      │ batchId
   │      ▼
   ├── quebras/{id}
   │
   ├── expenses/{id}
   ├── withdrawals/{id}
   ├── stockCounts/{id}   (type='initial' → immutable baseline)
   ├── closings/{id}      (immutable snapshot, references the period)
   └── timelineEvents/{id} (append-only, written alongside every action above)

Platform level (no nesting under any single business):
subscriptions/{id} ──keyed by uid or businessId (Section 9 decision)
notifications/{id} ──recipientId (uid or businessId)
platform_aggregates/{period} ──derived from all businesses/*, via Background Worker only
platform_audit_log/{id} ──written by privileged server on every platform-operator action
```

---

## 7.6 Historical Data and Immutability — The General Rule

Section 2.10 already stated the principle; Section 7's job is to make it a concrete, checkable rule per entity rather than a general aspiration:

- **Truly immutable, no exceptions:** the `initial` Stock Count (7.2), every recorded Closing (7.2), every Timeline Event (7.2), every future platform Audit Log entry (7.4). These are records another number (Capital Growth, a period's frozen profit figure, a compliance trail) is permanently measured against — editing them in place would silently invalidate every figure derived from them since.
- **Mutable until locked, then frozen:** Expenses and Withdrawals can be edited or removed *until* a Closing includes them in its frozen period snapshot — at that point, they become historical inputs to an immutable record, and any correction after the fact must be a new entry in the *next* open period, never a retroactive edit to a closed one. This is the concrete data-architecture consequence of Section 5.8's "Closing locks Expenses/Withdrawals/Stock/Breakages together into a single permanent figure."
- **The correction pattern, generalized:** wherever a mistake needs fixing in an immutable record, the fix is a new record that references what it corrects (Principle 2.10's own wording) — never a rewritten field. Quebras already model this implicitly (a wrong Quebra isn't edited, a business would record an adjusting entry); this section makes it the explicit, general pattern every future immutable entity (billing history, 3.13; audit log entries, 3.14) must follow.

---

## 7.7 Data Ownership Summary (Who Can Write What)

This table restates Section 6's permission matrix from the data layer's point of view — confirming every write-permission decision in Section 6 has a concrete Security Rule counterpart, not just a described intention.

| Entity | Admin | Manager | Staff | Platform roles (Support/Dev/SuperAdmin) |
|---|---|---|---|---|
| Products, Stock Batches, Purchase Batches, Quebras, Expenses | Full | Full | Full (existing `isMemberOf` scope) | Read-only, audited (via aggregation layer, never direct) |
| Withdrawals, Stock Counts, Closings, Staff roster | Full | Full if granted (6.3) | ❌ | ❌ (business-scoped, not a platform action) |
| Timeline Events | Create (append-only) | Create | Create | ❌ |
| Subscription | Read + initiate change | Read only | ❌ | SuperAdmin: full (support/dispute path, 6.7) |
| Notifications (own feed) | Read + preferences | Read + preferences | Read + preferences | N/A — platform roles don't have a tenant notification feed |
| Platform Audit Log | ❌ | ❌ | ❌ | Support: partial (own actions) · Developer/SuperAdmin: full |

---

## 7.8 Scalability Shape (Detail Deferred to Section 11)

Section 7 fixes only the *shape* that makes Section 11's later, concrete thresholds achievable — not the thresholds themselves:

- **Subcollection nesting keeps every business's data physically separate at the storage layer**, which is what allows Firestore to serve 100,000+ tenants' worth of `batches`/`timelineEvents`/etc. without any tenant's growing dataset affecting another's query performance — a direct structural benefit of 7.1's pattern, not an added feature.
- **`platform_aggregates` is deliberately the only place cross-tenant computation happens**, and it happens on a schedule (4.8), never live on a dashboard request — this is what keeps SuperAdmin/Analytics dashboards fast regardless of tenant count, since they never scan raw per-business collections directly.
- **Every collection introduced in this section must be queried with pagination and a documented index**, per Principle 2.5 — the audit's central finding (unbounded listeners) is a query-pattern problem Section 11 will fully specify, but the collection *shapes* fixed here don't themselves foreclose fixing it, which is the property Principle 2.12 actually requires at this stage.

---

## What Sections 8–15 Will Build On This

- **Section 8 (Module Architecture)** will design each entity's specific input/output/business-rule behavior against this schema, including the deferred `AppContext` decomposition (Section 4.3) and Storage upload flow (Section 4.7).
- **Section 9 (SuperAdmin Architecture)** will resolve Subscription's exact keying (owner `uid` vs. `businessId`, left open in 7.4) and fully specify `platform_audit_log`'s schema.
- **Section 11 (Scalability Strategy)** will give concrete pagination/index/caching thresholds for every collection named in 7.2 and 7.4.
- **Section 12 (Security Architecture)** will formalize the Security Rules implied throughout this section (7.3's `users/{uid}` authority, 7.4's server-only write paths) into explicit, auditable controls.

**This section requires your explicit approval before Section 8 (Module Architecture) begins.**
