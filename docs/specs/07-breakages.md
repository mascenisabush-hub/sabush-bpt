Business Domain Specification

# Breakages (Quebras)

Version 1.0
**Status:** Drafted, awaiting approval
**Module #7 of 20 — Phase 2: Capital Protection**
**Architecture references:** [Section 3.7](../architecture/03-domain-architecture.md)
(Breakages/Quebras domain), [Section 6.8](../architecture/06-user-architecture.md)
(Permission Matrix — Stock Entry bucket), [Section 8.5](../architecture/08-module-architecture.md)
(Stock Entry & Quebras module — including its stated correction rule),
[Section 12](../architecture/12-security-architecture.md) (Firestore
Security Rules)
**Depends on:** [Stock Batches (spec #5)](./05-stock-batches.md) — every
Quebra is always tied to exactly one batch, and reduces that batch's
remaining quantity on the same basis Investment Value and Market Value
are computed from · [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
and [Embedded Profit Engine (spec #6)](./06-embedded-profit-engine.md) —
both consume `calculateBatch`'s quebra-adjusted figures, they don't
redefine them
**Implementation:** `src/components/AddQuebraView.tsx` (entry form),
`src/context/AppContext.tsx` (`addQuebra` lines 1022–1057, `deleteQuebra`
lines 1305–1308), `Quebra` type (`src/types.ts`, lines 60–68),
`calculateBatch`/`isQuebraExceedingWarning` (`src/utils/calculations.ts`),
display/deletion surfaces in `src/components/ProductDetailModal.tsx`
(lines 191–220) and `src/components/reports/InventoryLossReport.tsx`,
Dashboard KPI card (`DashboardView.tsx`, `quebraLoss` card and
`hasExceededWarning` banner), Firestore rules (`firestore.rules`, lines
166–171)

---

## Purpose

**Why does this module exist?**

Breakages exists to record inventory that is lost — broken, spoiled,
stolen, or miscounted — before it can ever be sold, and to make sure that
loss is reflected honestly in Business Worth. Per Architecture 3.7, a
Quebra always attaches to one exact Stock Batch and shrinks that batch's
Investment Value and Market Value on the identical basis
(`remainingQuantity`), so Embedded Profit never overstates what actually
remains on the shelf (spec #2, spec #6). This is Phase 2's first module:
Phase 1 established what a business owns and what it's worth; Phase 2
protects that capital by making sure loss is captured, not hidden inside
a stale quantity figure.

## Business Problem

**What business problem does it solve?**

Without a dedicated way to record loss, an Admin's stock figures quietly
drift from reality — a broken bottle, an expired batch, a shipment
damaged in transit all stay counted as sellable inventory until a
physical count eventually catches the gap (Stock Counts, spec #10, not
yet specified). Every day between the loss and that eventual count is a
day Business Worth and Embedded Profit are both overstated. Breakages
closes that gap immediately: the loss is recorded the moment it's
noticed, against the exact batch it came from, with a reason — so
Investment Value and Market Value shrink together, in real time, instead
of silently diverging from what's actually on the shelf.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — record a Quebra, view every Quebra (via Product Detail, spec #3, and Inventory Loss Report, spec #12 not yet specified), and the only role that can delete one (Firestore Rules, `firestore.rules` lines 166–171: `allow delete: if isOwnerOf(businessId)`) |
| **Manager** | Same as Owner, per Architecture 6.3's "tier under Admin" model — falls under the Permission Matrix's "Stock Entry" bucket (6.8), which the delete rule does not currently carry forward (see Business Rules, below) |
| **Staff** | Can record a Quebra (`navigationTabs.ts`: `add-quebra` tab, `ownerOnly: false`) — matches Architecture 6.4's "day-to-day operational recording." Cannot delete one, per the same Firestore rule, though the app's own UI does not currently reflect that restriction (see Business Rules) |
| **SuperAdmin** | No direct access to an individual business's Quebra records — only anonymized, aggregated patterns, consistent with every other tenant-financial domain (Architecture 3.1, 10.9) |

## User Stories

- As **Staff**, I want to record a breakage against the exact batch it
  came from, with a reason, so that the loss is captured the moment I
  notice it — not left for a future stock count to discover.
- As a **Business Owner**, I want a broken or spoiled unit to immediately
  reduce both the Investment Value and Market Value I see for that
  product, so that my Business Worth never overstates stock that no
  longer exists.
- As a **Business Owner**, I want to be warned if recorded losses on a
  batch exceed what was originally entered, so that I can catch a
  data-entry mistake or a miscount before it distorts my figures.
- As a **Business Owner**, I want to see all my recorded losses grouped
  by product, reason, or month, so that I can spot a pattern — one
  product breaking repeatedly, one reason recurring — worth acting on.

## Business Rules

**Attribution and effect**
- A Quebra is always tied to exactly one Stock Batch, one date, one
  quantity, and one reason (Architecture 3.7; `Quebra` type, `types.ts`
  lines 60–68) — never split across batches or left unattributed.
- A Quebra reduces `remainingQuantity` on that batch, which reduces
  Investment Value and Market Value identically (`calculateBatch`,
  spec #2) — never one adjusted without the other.
- A Quebra is always valued **at cost** (`quebraValue = quantityLost *
  batch.costPrice`), never at selling price — a loss is a loss of what
  was invested, not of the profit that was never realized on it.

**The over-loss warning — a signal, not a block**
- `isQuebraExceedingWarning` fires when cumulative losses on a batch
  would exceed that batch's original quantity, and the Dashboard's
  active-batch card surfaces the same `hasExceededWarning` flag
  (`DashboardView.tsx` line 731). Architecture 8.5 is explicit this is
  "a data-quality signal, not a hard rule" — the form still allows
  submission past the warning, since a real miscount shouldn't be
  structurally impossible to record. This spec confirms that as
  intentional, not an oversight.

**Immutability — documented intent vs. actual behavior, a real gap**
- Architecture 8.5 states plainly: *"A Quebra cannot be edited after
  creation; a correction is a new, separate Quebra record referencing
  what it corrects... this module enforces the write path, it does not
  merely document the intent."* The write path does correctly block
  edits — there is no `updateQuebra` function anywhere in `AppContext.tsx`,
  only `addQuebra` and `deleteQuebra`. But the *second half* of that
  sentence is not true today: a correction is not a new record
  referencing the original. It is an outright `deleteDoc` (lines
  1305–1308) with nothing left behind — no reference, no trail, no
  record that a correction ever happened. This is a genuine discrepancy
  between the Architecture document and the implementation, not a
  stylistic gap, and it's worth naming precisely rather than quietly
  reinterpreting "cannot be edited" to mean "can be deleted" — the
  Architecture text draws that distinction on purpose.

**A UI/rules mismatch that follows directly from the above**
- Firestore Security Rules restrict `delete` on a Quebra to
  `isOwnerOf(businessId)` only — Manager and Staff cannot delete one,
  regardless of Architecture 6.3 placing Manager at parity with Owner
  everywhere else. But the delete button itself
  (`ProductDetailModal.tsx` line 209–215, `InventoryLossReport.tsx`
  line 195) renders unconditionally for anyone who can open that screen,
  with no role check and no confirmation step before the click, and
  `deleteQuebra` (`AppContext.tsx`) has no try/catch around the
  Firestore call. The practical effect: a Manager or Staff member sees
  an active-looking delete control that will be silently rejected by
  the backend with no error surfaced in the UI — the person has no way
  to know their click did nothing. This is not a security problem (the
  rule correctly protects the data) — it's a real UX gap, and it's
  compounded by the missing-confirmation issue above: even for an
  Owner, there is currently no "are you sure?" step before a Quebra
  record disappears with no trail.

**Never implies a sale, never a source of Embedded Profit on its own**
- A Quebra only ever reduces figures — it never adds Embedded Profit,
  revenue, or any positive value anywhere (Architecture 1.8, 2.4).

## Functional Requirements

*Exactly what the module must do.*

1. Record a Quebra against a specific product and batch, with date
   (defaults to today), quantity lost, and a required reason — currently
   implemented (`AddQuebraView.tsx`).
2. Auto-select the product's currently open batch as the default target
   when recording a loss, falling back to its most recent batch if none
   is open — currently implemented (lines 46–59).
3. Offer quick-fill reason suggestions (expired, broken, packaging
   damaged, transport loss, spoiled/mold, customer sample) while still
   accepting free text — currently implemented, i18n-driven
   (`COMMON_REASON_KEYS`).
4. Show a live preview of current batch stock, stock after the loss, and
   the cost value of the loss, before submission — currently implemented
   (lines 234–255).
5. Warn — not block — when the entered loss would push cumulative
   quebras past the batch's original quantity — currently implemented
   (`isQuebraExceedingWarning`, warning banner lines 224–232).
6. Feed every Quebra into `calculateBatch` so Investment Value, Market
   Value, and Embedded Profit reflect it everywhere those figures are
   shown (Dashboard, Reports, Product Detail, Closings) — currently
   implemented, spec #2/#6's calculation layer.
7. Log a `TimelineEvent` (type `quebra-recorded`) alongside every Quebra
   creation, with the loss's financial impact shown as a negative
   figure — currently implemented (`addQuebra`, lines 1041–1054).
8. **Not currently implemented, and a real gap named above:** gate the
   delete control in the UI to Owner/Manager only, matching the
   Firestore rule, instead of rendering it unconditionally for any role
   that can view the screen.
9. **Not currently implemented:** a confirmation step before a Quebra
   delete completes, and a user-visible error if a delete is rejected by
   the backend (e.g., a Staff member's click failing silently today).
10. **Not currently implemented, and the one genuine Architecture/code
    mismatch this spec surfaces:** correcting a Quebra as a new, linked
    record rather than a silent delete — per Architecture 8.5's stated
    (but not yet built) intent.

## Non-functional Requirements

**Performance**
- Recording a Quebra is a single `setDoc` write plus one `TimelineEvent`
  write — O(1), no measurable performance concern at any scale named in
  the Mission (Architecture Section 11).

**Security**
- Tenant isolation via `isMemberOf(businessId)` for read/create/update,
  `isOwnerOf(businessId)` for delete (`firestore.rules` 166–171) — the
  rule itself is correctly scoped; the gap is the UI not reflecting it
  (Business Rules, above).

**Accessibility**
- Warning banner and loss-preview figures use `.type-number` (tabular
  figures) and are not conveyed by color alone — the warning banner
  pairs its rose coloring with an icon and explicit text.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1) and Stock Batches (spec #5).

**Mobile**
- Form follows standard input sizing and spacing per
  [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) — full-width inputs,
  `min-h-[52px]` primary action button.

## KPIs

**How do we know this module succeeds?**

- Every recorded Quebra is reflected in that batch's Investment Value
  and Market Value within the same render — no stale figures anywhere
  it's consumed (Dashboard, Reports, Product Detail).
- Time-to-record: an Admin or Staff member can log a loss in under 15
  seconds from opening the form (product and batch pre-selected in the
  common case, reason available as a one-tap chip).
- Zero silent-failure deletes once the UI/rules gap (Business Rules,
  above) is closed — every delete attempt either succeeds visibly or
  fails with a visible reason, for every role.

## Future Enhancements

*Ideas — not implementation.*

- **Close the UI/rules gap** — gate the delete control by role, add a
  confirmation step, and surface delete errors, per Functional
  Requirements #8–9.
- **Correction-as-new-record** — implement Architecture 8.5's stated
  intent: a Quebra correction creates a new record referencing what it
  corrects, rather than deleting the original, preserving a full audit
  trail (Functional Requirement #10).
- **AI dead-stock/risk detection** (Architecture 3.7, 10.x) — once the
  AI Intelligence domain (module #15, not yet specified) exists, recurring
  breakage patterns on a product could feed a risk signal there.
- **Photo attachment** for a Quebra (e.g., a photo of damaged goods) —
  not currently supported, would strengthen the audit trail once
  correction-as-new-record (above) is in place.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A Quebra can be recorded against any batch, reducing that batch's
      Investment Value and Market Value on the same basis, visible
      immediately everywhere those figures appear.
- [ ] The over-loss warning fires correctly and does not block
      submission.
- [ ] The delete control is visible only to roles the Firestore rule
      actually permits (Owner/Manager), with a confirmation step and a
      visible error on failure.
- [ ] A decision has been made — and, if adopted, implemented — on
      correction-as-new-record vs. the current delete-only behavior,
      resolving the Architecture 8.5 discrepancy named in this spec
      rather than leaving it open indefinitely.
