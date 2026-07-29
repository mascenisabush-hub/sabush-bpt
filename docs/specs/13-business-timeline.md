Business Domain Specification

# Business Timeline

Version 1.0
**Status:** ✅ Approved
**Module #13 of 20 — Phase 3: Insight & Decision Support**
**Architecture references:** [Section 3.10](../architecture/03-domain-architecture.md)
(Timeline domain — "append-only, chronological narrative of every
material event... written to by nearly every other domain... as a side
effect of their own actions"), [Section 7.2, 7.6](../architecture/07-data-architecture.md)
(Timeline Event in the "truly immutable, no exceptions" tier —
`allow update: if false` already enforced; Data Ownership Summary:
Timeline Events — Admin/Manager/Staff all `Create`), [Section 8.10](../architecture/08-module-architecture.md)
(Timeline module — "every mutating action in the app must produce
exactly one corresponding Timeline Event — this module's contract with
every other module is 'you write when you mutate,' not optional or
best-effort")
**Depends on:** [Reports (spec #12)](./12-reports.md) for the identical
category of Staff-access finding this spec confirms independently for
Timeline — here backed by the Firestore rule's own inline comment,
not just an external Architecture statement · [Monthly Closings (spec #11)](./11-monthly-closings.md),
whose own `deleteClosing` this spec finds produces no Timeline entry,
despite reopening the single most consequential immutable record in
the app
**Implementation:** `src/components/timeline/BusinessTimelineView.tsx`
(main view, filters, quick stats), `TimelineEventCard.tsx` (list item),
`TimelineDetailModal.tsx` (detail view), `timelineHelpers.ts`
(activity maps, grouping, filtering), `TimelineEvent`/
`TimelineActivityType` types (`src/types.ts`, lines 292–338),
`logTimelineEvent`/`logReportExport` (`src/context/AppContext.tsx`,
lines 737–783, plus 12 call sites across `addStockBatch`,
`addMultipleStockBatches`, `addQuebra`, `addExpense`, `addWithdrawal`,
`recordStockCount`, `recordClosing`, `updateBusinessProfile`,
`logReportExport`), `server/index.ts` (staff-suspend/reactivate/remove
logging, lines 208, 287, 351), nav gating (`navigationTabs.ts` line 30,
`ownerOnly: true`), `App.tsx` (`!isStaff` guard plus forced redirect,
lines 40, 49), Firestore rules (`firestore.rules` lines 211–221)

---

## Purpose

**Why does this module exist?**

Every other module in this series changes the business's numbers.
Timeline is the one module that changes nothing — it exists purely to
answer "what happened, when, and by whom," as a permanent, ordered
narrative running alongside every other domain. Architecture 3.10
already identifies it as a de facto audit log even before being
formally positioned as one: a single place an Admin (or, per this
spec's own findings, a Staff member) can scroll back through every
Stock Entry, Quebra, Expense, Withdrawal, Closing, and structural
change the business has ever recorded, without reconstructing it from
eight different collections themselves.

## Business Problem

**What business problem does it solve?**

Every domain in this app stores its own records in its own collection
— a Quebra doesn't know about the Expense recorded the same day, a
Closing doesn't know which Stock Entry triggered which Quebra. Without
Timeline, answering "what actually happened in my business this week"
means opening Stocks, Reports, Expenses, and Withdrawals separately and
mentally reassembling a story. Timeline solves this by writing one
human-readable, chronologically-ordered entry alongside each action at
the moment it happens, so the story is already assembled — and, per
Architecture 7.6, permanently so: once written, an entry is never
rewritten, only ever supplemented by a later correcting entry, which
means the narrative itself can be trusted the same way a Closing
snapshot can.

## Users

| Role | Access |
|---|---|
| **Owner** | Full read access — the only role gated in today at the UI layer (nav `ownerOnly: true`, `App.tsx` `!isStaff` guard) |
| **Manager** | Same "if granted" pattern named throughout this series (Architecture 6.3) — not implemented |
| **Staff** | **Blocked from the UI entirely, contradicting the Firestore rule's own stated intent.** `firestore.rules` (lines 211–221) reads `allow read: if isMemberOf(businessId)` and `allow create: if isMemberOf(businessId)`, with the rule's own inline comment stating plainly: "Any team member can read and create entries." Architecture 7.7's Data Ownership table independently confirms Staff has `Create` access to Timeline Events, the same as Admin and Manager. Yet `navigationTabs.ts` marks the `timeline` tab `ownerOnly: true`, and `App.tsx` actively force-redirects any Staff session that lands on `activeTab === 'timeline'` back to `'add-stock'` — identical in shape to the Reports gap (spec #12), but here the mismatch is stated in the implementation's own code comment, not only an external document |
| **SuperAdmin/Support/Developer** | Architecture 7.7 marks Timeline Events `❌` for all platform roles — no write access, consistent with the per-business Timeline being distinct from the future platform Audit Log (Architecture 3.14, Section 9, not yet built) |

## User Stories

- As a **Business Owner**, I want a single chronological feed of
  everything that's happened in my business, so that I don't have to
  reconstruct a story from separate screens.
- As a **Business Owner**, I want every entry to be permanent and
  untouchable once written, so that the history I'm looking at is
  always what actually happened, not something quietly edited later.
- As a **Business Owner**, I want to filter and search the timeline by
  activity type, product, supplier, or date range, so that I can answer
  a specific question quickly instead of scrolling everything.
- As a **Staff member who records day-to-day Stock Entries**, I want to
  see the history of my own actions and the business's activity, so
  that I have context for the work I'm doing — an ability the rule
  governing my own data access says I should have, but the app's
  navigation doesn't currently let me reach.

## Business Rules

**What gets logged, and how — confirmed correct where it exists**
- A `TimelineEvent` is a type, date, `createdAt` timestamp, `userName`,
  title, description, optional `financialImpact[]`, and a free-form
  `details` map (`types.ts` lines 320–338). `logTimelineEvent`
  (`AppContext.tsx` lines 737–770) is a single shared write function —
  every logging call site funnels through it, so the shape is
  consistent across all activity types, confirmed by direct inspection
  of all 12 client call sites plus the 3 server-side ones
  (`server/index.ts`).
- Logging failures are deliberately swallowed (`logTimelineEvent`'s own
  `try/catch`, only `console.error`) so that a Timeline write failure
  never rolls back or blocks the underlying business action that
  already succeeded — a correct, intentional design choice, not a gap.

**Immutability — the one module in this series where the strictest
tier is actually enforced correctly**
- Architecture 7.6 places Timeline Events in the same "truly immutable,
  no exceptions" tier as the `initial` Stock Count and every recorded
  Closing. Unlike those two (specs #10 and #11, both found to rely on
  UI omission alone), Timeline's Firestore rule genuinely enforces
  this: `allow update: if false` — unconditional, with no role
  exception, not even for the Owner. There is no `updateTimelineEvent`
  function in the client either, so both layers agree. This is worth
  stating plainly as the positive baseline the `initial` Stock Count
  and Closing gaps should be brought up to, not the reverse.
- Deletion is intentionally narrow: `allow delete: if isOwnerOf(businessId)`,
  and the only client code that calls it is `clearAllData`'s bulk loop
  (`AppContext.tsx` line 1584) — there is no per-event delete function
  or button anywhere in the UI. This matches the rule's own comment
  ("only the owner can remove one — used solely by clearAllData / data
  reset") and Architecture's correction-by-new-entry philosophy: a
  mistake is meant to be corrected by a new entry, not by deleting the
  old one, and the code doesn't offer a way to do the latter outside a
  full data reset.

**The gap this spec names: the "write when you mutate" contract is not
actually kept**
- Architecture 8.10 states the module's contract in absolute terms:
  "every mutating action in the app must produce exactly one
  corresponding Timeline Event... not optional or best-effort." Direct
  inspection of every mutating function in `AppContext.tsx` finds this
  is not true today. Functions that log correctly: `addStockBatch`,
  `addMultipleStockBatches`, `addQuebra`, `addExpense`, `addWithdrawal`,
  `recordStockCount`, `recordClosing`, `updateBusinessProfile`, and
  `logReportExport`. Functions that mutate business data and log
  **nothing**:
  - `deleteClosing` — the single most consequential omission, since
    deleting a Closing re-opens a period Architecture places in its
    strictest immutability tier, yet leaves no trace anywhere that it
    happened, by whom, or when.
  - `deleteQuebra`, `deleteExpense` — both financial-record deletions,
    with no corresponding entry despite their `add` counterparts being
    fully logged.
  - `updateProduct`, `deleteProduct` — catalog changes and removals,
    unlogged.
  - `addShop` — creating an entirely new business/shop (Architecture
    5.9's Business Growth) produces zero Timeline entry, despite being
    arguably the single largest structural event a business can
    generate.
  - `addStaffMember` — adding a new Staff account produces no entry,
    and unlike `staff-removed`/`staff-suspended`/`staff-reactivated`,
    there isn't even a `TimelineActivityType` value defined for "staff
    added" to log it as — the gap exists at the type level, not only
    the call-site level.

**A localization gap deeper than any found earlier in this series**
- Every one of the 12 client-side `logTimelineEvent` call sites writes
  a hardcoded Portuguese `title` and `description` directly into the
  persisted `TimelineEvent` document at the moment it's created (e.g.
  `'Fecho Mensal Concluído'`, `'Produto Criado'`, `'Retirada do
  Proprietário'`) — confirmed at every call site by direct inspection,
  no exception found. None of the four Timeline UI files
  (`BusinessTimelineView.tsx`, `TimelineEventCard.tsx`,
  `TimelineDetailModal.tsx`, `timelineHelpers.ts`) import
  `useLanguage`/`t` at all — every filter label, search placeholder,
  empty-state message, month name, and the `DETAIL_KEY_LABELS`/
  `ACTIVITY_LABEL` maps are hardcoded Portuguese too.
- This is a different, and structurally worse, category of gap than
  the one named for Stock Counts (spec #10) and Closings (spec #11).
  Those views' localization can still be fixed going forward with no
  loss — a French-language Owner who starts using a localized
  `ClosingView.tsx` tomorrow gets every future Closing screen in
  French. Timeline cannot be fixed the same way: because every entry
  is in Architecture's "truly immutable, no exceptions" tier and is
  correctly enforced as such at the Security Rules layer (`allow
  update: if false`, above), a `title`/`description` written in
  Portuguese today is Portuguese **permanently** — no future
  localization fix to the writing code can retroactively translate an
  already-written, structurally un-editable historical record. A
  French- or English-language Owner's entire business history, from
  the day this gap is eventually fixed forward, remains partially
  Portuguese-only forever unless a display-time translation layer
  (mapping stored type + structured `details` to a localized sentence
  at render time, rather than storing the sentence itself) is built
  instead of a write-time fix.

## Functional Requirements

*Exactly what the module must do.*

1. Log a `TimelineEvent` alongside Stock Entry, Quebra, Expense,
   Withdrawal, Stock Count, Closing, and Business Profile updates —
   currently implemented for these nine call sites (Business Rules,
   above).
2. Enforce that a recorded `TimelineEvent` can never be updated by any
   role, at the Security Rules layer — currently implemented and
   confirmed correct (`allow update: if false`).
3. Group events by month with a per-type activity breakdown, sorted
   newest-first — currently implemented (`groupByMonth`).
4. Support filtering by date range, activity type, user, product,
   supplier, batch, and expense category, plus free-text search across
   title/description/reason/notes — currently implemented
   (`filterTimelineEvents`, `ReportFilterBar`).
5. Show quick statistics (activity count today/this week/this month,
   most recent batch/expense/verification) computed from the full,
   unfiltered log — currently implemented.
6. Restrict Staff from writing or reading Timeline through the UI —
   currently implemented, but **contradicts** the Firestore rule's own
   stated intent and Architecture 7.7's Data Ownership table (Business
   Rules, above).
7. **Not currently implemented:** a Timeline entry for `deleteClosing`,
   `deleteQuebra`, `deleteExpense`, `updateProduct`, `deleteProduct`, or
   `addShop` — six confirmed mutating actions with no corresponding
   log entry, violating Architecture 8.10's stated contract.
8. **Not currently implemented:** a `TimelineActivityType` value (and
   corresponding log call) for adding a new Staff member — the type
   union has no "staff added" case at all, unlike its
   removed/suspended/reactivated counterparts.
9. **Not currently implemented:** Staff-level read/create access to
   Timeline through the actual UI, matching what the Firestore rule
   and Architecture 7.7 already grant at the data layer.
10. **Not currently implemented:** any mechanism for a `title`/
    `description` to be localized — neither retroactively for existing
    entries (structurally impossible without violating the immutability
    guarantee) nor prospectively for new ones (no `t()` call exists at
    any of the 12 write sites).

## Non-functional Requirements

**Performance**
- Grouping, filtering, and quick-statistics computation are all O(n)
  over the full `timelineEvents` array, recomputed via `useMemo` on
  every relevant dependency change — immaterial at current scale.
  Architecture 8's own Section 11 forward note already flags Timeline
  (alongside Reports) as a module that will need concrete
  pagination/indexing guidance once querying unbounded lists becomes
  material — correctly deferred, not a gap in this module today.

**Security**
- The immutability guarantee (`allow update: if false`) is the
  strongest, most correctly-enforced security property found anywhere
  in this series so far — see Business Rules. The Staff access gate,
  however, is stricter than both the Firestore rule and Architecture
  intend, the same category of finding as spec #12's Reports gap.

**Accessibility**
- Financial impact figures use `.type-number` consistently; activity
  type icons and colors are paired (never color alone) across
  `TimelineEventCard.tsx` and `TimelineDetailModal.tsx`.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named across every prior module in this series.

**Mobile**
- The timeline collapses from an alternating two-column desktop layout
  to a single offset column below the `sm` breakpoint
  (`BusinessTimelineView.tsx`'s `sm:hidden`/`hidden sm:grid` split) —
  a deliberate, correctly-implemented responsive pattern.

## KPIs

**How do we know this module succeeds?**

- Every mutating action in the app produces exactly one corresponding
  Timeline Event — currently unmet, per Functional Requirements #7–8
  (six confirmed unlogged actions, plus a missing activity type for
  Staff additions).
- Staff can read and create Timeline entries through the UI, matching
  the access the Firestore rule and Architecture 7.7 already grant them
  at the data layer — currently unmet, per Functional Requirement #9.
- No recorded Timeline Event can ever be altered by any role — already
  met today, verified directly against the Security Rules layer, not
  only the UI.
- A product decision exists on how (or whether) Timeline content will
  ever be localized, given the structural constraint that existing
  entries cannot be retroactively translated — currently unmet, per
  Functional Requirement #10.

## Future Enhancements

*Ideas — not implementation.*

- **Close the "write when you mutate" gap** for `deleteClosing`,
  `deleteQuebra`, `deleteExpense`, `updateProduct`, `deleteProduct`, and
  `addShop` — six fixes, all following the same existing
  `logTimelineEvent` pattern already used correctly elsewhere.
- **Add a `staff-added` activity type** and log call to `addStaffMember`,
  closing the asymmetry with `staff-removed`/`staff-suspended`/
  `staff-reactivated`.
- **Open Staff read/create access to Timeline** in the UI, matching the
  Firestore rule's own stated intent — likely the more clear-cut of the
  two Staff-access findings in this series (spec #12's Reports gap
  requires per-report judgment calls; this one is a single, uniform
  collection with no split-access complication).
- **Design a display-time translation layer for Timeline content** —
  storing `type` plus a structured `details` payload (already
  partially true today) richly enough that a localized sentence can be
  *rendered* per viewer language at read time, rather than a fixed
  sentence being *stored* per write — the only approach that could ever
  make existing, immutable history readable in a language other than
  Portuguese without violating Architecture 7.6.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] Every currently-unlogged mutating action (`deleteClosing`,
      `deleteQuebra`, `deleteExpense`, `updateProduct`, `deleteProduct`,
      `addShop`) produces a corresponding Timeline Event.
- [ ] A `staff-added` activity type exists and is logged when a new
      Staff member is created.
- [ ] Staff can read (and, per the existing rule, create) Timeline
      entries through the app's own UI, not only at the Firestore rules
      layer.
- [ ] A product decision has been made on whether/how Timeline content
      will be localized going forward, explicitly acknowledging that
      existing entries cannot be retroactively translated without
      violating the immutability guarantee.
