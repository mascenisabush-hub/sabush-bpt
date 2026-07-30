Business Domain Specification

# Products

Version 1.0
**Status:** ✅ Approved
**Module #3 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 3.4](../architecture/03-domain-architecture.md)
(Products domain), [Section 2.4 & 7.1](../architecture/02-core-product-principles.md)
(Data Integrity — live source wins), [Section 8.4](../architecture/08-module-architecture.md)
(Products module entry), [Section 4.7](../architecture/04-system-architecture.md)
(deferred Storage upload flow)
**Design references:** [Component Library](../../COMPONENT_LIBRARY.md) —
[Confirmation Dialog](../../COMPONENT_LIBRARY.md#7-confirmation-dialog)
(named gap, directly relevant to this module's delete flow)
**Implementation:** `src/components/EditProductModal.tsx`,
`src/components/ProductDetailModal.tsx`, `Product` type (`src/types.ts`)

---

## Purpose

**Why does this module exist?**

Products is the catalog — the stable identity every Stock Batch, Quebra,
and Report references, independent of any one purchase or stock event
(Architecture 3.4). It exists so "Rice" is the same thing every time it's
bought, sold, counted, or reported on, regardless of how many separate
Purchase Batches of rice have come and gone at different prices over
time.

## Business Problem

**What business problem does it solve?**

Without a catalog layer, every stock entry would be a disconnected event
— the Admin couldn't ask "how has this product performed over time"
without a stable identity to group batches under. Products solves this
by giving every item a permanent identity distinct from any single
purchase, while explicitly *not* becoming a place where financial figures
live — that's deliberately the Calculation Engine's (spec #2) job, sourced
from the batches, never from the catalog record.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — edit catalog metadata, view product detail/history, delete a product |
| **Manager** | Same access as Owner, per Architecture 6.3's delegation model |
| **Staff** | Can view products and typically create new catalog entries implicitly through Stock Entry (see Functional Requirements below); edit/delete access depends on assigned permissions (Architecture 6.2) |
| **SuperAdmin** | No direct access — catalog data is business-scoped and never read by SuperAdmin except in aggregate, anonymized form (Architecture 3.1, 9.2) |

## User Stories

- As a **Business Owner**, I want to see every batch and loss ever
  recorded for one product, so that I can understand how that specific
  item has performed over time.
- As a **Staff member entering stock**, I want to type a product name and
  have the system either find the existing product or offer to create it
  on the spot, so that I never have to leave the Stock Entry screen to
  set up a catalog entry first.
- As a **Business Owner**, I want a product's reference cost and selling
  price to pre-fill my next stock entry, so that I don't have to
  re-type the same numbers every time I restock something I've bought
  before.
- As a **Business Owner**, I want to delete a product I no longer carry,
  and be clearly warned that this also removes its batch and loss
  history, so that I don't do this by accident.
- As a **Business Owner**, I want to add a photo to a product (future),
  so that I can visually identify items in my catalog at a glance.

## Business Rules

**Catalog identity vs. financial truth — the module's central rule**
- A Product's `costPrice`/`sellingPrice` are reference metadata only —
  they exist to pre-fill the next Stock Batch entry, and are never
  themselves a source of truth for any calculation (Architecture 3.4's
  "explicit non-responsibility," 7.1's "live source wins" rule). The
  actual Investment Value, Market Value, and Embedded Profit for any unit
  always come from the specific Stock Batch it belongs to (spec #2's
  Business Worth Engine), never from the Product record — even though
  both may show the "same" price at a glance.
- This rule holds even as the catalog evolves — Architecture 3.4
  explicitly names future AI-driven repricing suggestions (Section 10) as
  a case this rule must still hold against: a suggested price is
  metadata guidance, never a silent input into an existing batch's
  already-recorded financial figures.

**Creation is implicit, not a separate flow**
- There is no standalone "Add Product" form. A Product record is created
  as a byproduct of Stock Entry (spec #4/#5): typing a product name that
  doesn't match an existing catalog entry offers a "create new" option
  inline, and the first Stock Batch entry becomes that product's
  originating record. This is a deliberate design, not a missing feature
  — see Functional Requirements below for why this matters for how the
  module is tested and extended.

**Deletion**
- Deleting a Product also removes its associated batches and Quebras —
  this is destructive and must be clearly communicated before it happens,
  not assumed obvious.
- **Currently implemented via the browser's native `window.confirm()`** —
  this is the exact gap the Component Library already names directly
  ([Confirmation Dialog](../../COMPONENT_LIBRARY.md#7-confirmation-dialog)):
  an off-brand system dialog at the single highest-stakes action this
  module has. This spec inherits that named gap rather than silently
  re-describing the current behavior as final.

**Uniqueness**
- Product matching during Stock Entry is by exact, case-insensitive name
  match (`p.name.toLowerCase() === productName.toLowerCase()`) — two
  products differing only by capitalization are treated as the same
  catalog entry, not two separate ones.

## Functional Requirements

*Exactly what the module must do.*

1. Store and edit catalog metadata: `name`, `category`, `supplier`,
   `sku`, `barcode`, reference `costPrice`, reference `sellingPrice` — via
   `EditProductModal`.
2. Provide a Product Detail view (`ProductDetailModal`) showing every
   Stock Batch and Quebra linked to that product, sorted most-recent
   first, with per-batch figures computed via the Calculation Engine
   (spec #2) — never recalculated independently in this module.
3. Support product lookup/autocomplete during Stock Entry: as the Admin
   types a product name, offer matching existing products first, and an
   explicit "create new: [name]" option only when no exact match exists.
4. On selecting an existing product during Stock Entry, pre-fill that
   product's reference `costPrice`/`sellingPrice` into the new batch
   entry as a starting point — editable, never locked to the reference
   value.
5. Support deleting a product, with a warning naming what will be
   removed (associated batches and losses) before the deletion proceeds.
6. Support navigating directly from a product's detail view into Add
   Stock (pre-filled with that product) or Add Quebra (pre-filled with
   that product's ID) — a product detail view is a hub, not a dead end.
7. `updatedAt` is set whenever catalog metadata is edited — tracked
   separately from `createdAt`, which never changes after the product's
   first Stock Batch creates it.

## Non-functional Requirements

**Performance**
- Product autocomplete during Stock Entry must filter the in-memory
  product list without a network round-trip per keystroke — the full
  product catalog is already loaded via `AppContext`, and this module
  must not introduce a new per-character query pattern that wouldn't
  scale as a business's catalog grows (Architecture Section 11's
  discipline applies here specifically, since this is a per-keystroke
  interaction, not a per-screen-load one).
- Product Detail's batch/Quebra list computation reuses the Calculation
  Engine's `O(batches + quebras)` cost (spec #2, corrected from an earlier
  "O(n)" statement — see spec #2's Performance section) — no additional
  nested iteration introduced at the module level.

**Security**
- Every Product read/write is scoped by the same tenant-isolation
  boundary as every other business-scoped entity (Architecture 7.1) —
  this module adds no additional access-control logic of its own and
  must never be relied on as a security boundary itself.
- The deferred photo-upload flow (Architecture 4.7, Future Enhancements
  below) must be scoped
  `businesses/{businessId}/products/{productId}/...` in Storage,
  secured by Storage Security Rules deriving from the same `users/{uid}`
  identity Firestore Rules already use — never a second, parallel
  permission system.

**Accessibility**
- Product Detail's per-batch figures use `.type-number` (tabular
  figures, Design System) for legibility.
- The "create new" affordance in autocomplete is clearly distinguished
  from an existing-product match — never relying on subtle styling alone
  to communicate "this doesn't exist yet."

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1) — this module requires a live
  connection today.

**Mobile**
- Product Detail modal follows the standard Dialog sizing rules
  ([DESIGN_SYSTEM.md → Dialogs](../../DESIGN_SYSTEM.md#dialogs--modals)):
  `p-3` outer padding, `max-h-[90vh]` internal scroll — a product with a
  long batch history must scroll within the modal, never grow the modal
  beyond the viewport.
- Every row-level action (edit, delete, navigate to Add Stock/Quebra)
  meets the 44×44px minimum touch target
  ([DESIGN_SYSTEM.md → Mobile Rules](../../DESIGN_SYSTEM.md#mobile-rules)).

## KPIs

**How do we know this module succeeds?**

- An Admin can find or create a product during Stock Entry without ever
  navigating to a separate "manage products" screen first — the implicit
  creation flow is the success case, not a workaround.
- Zero instances of a Product's reference price being read as if it were
  a calculation input anywhere else in the app (a code-review-verifiable
  KPI, same category as spec #2's own zero-tolerance rule).
- Time from "I want to delete this discontinued product" to completed,
  correctly-scoped deletion — the confirmation step should slow down an
  accidental deletion without meaningfully slowing down an intentional
  one.

## Future Enhancements

*Ideas — not implementation.*

- **Product photo upload** (Architecture 4.7) — the deferred Storage flow
  already scoped and ready to attach to this module; not yet built.
- **Replace `window.confirm()` with the governed Confirmation Dialog**
  ([Component Library #7](../../COMPONENT_LIBRARY.md#7-confirmation-dialog))
  — the concrete, scoped fix for this module's one named UI gap.
- **AI-driven repricing suggestions** (Architecture Section 10, referenced
  directly in 3.4) — explicitly scoped as *suggestions* surfaced as
  metadata guidance, never a silent write into `costPrice`/`sellingPrice`,
  and never an input into an already-recorded batch's figures.
- **Category-based catalog browsing/filtering** beyond the current flat
  list with search — not currently requested or scoped, noted here so a
  future ask isn't designed around silently.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A new product can be created only through the Stock Entry
      autocomplete flow, correctly, with no separate creation path
      required or expected.
- [ ] Editing a Product's reference price never alters any already-
      recorded Stock Batch's `costPrice`/`sellingPrice` or any
      previously-computed figure.
- [ ] Product Detail correctly lists every batch and Quebra for that
      product, sorted most-recent first, with figures matching the
      Calculation Engine's own output exactly.
- [ ] Deleting a product removes its batches and Quebras and clearly
      warns of this beforehand — currently via `window.confirm()`,
      flagged as pending replacement per the Component Library.
- [ ] Product autocomplete correctly treats names as case-insensitive
      matches and offers "create new" only when no match exists.
