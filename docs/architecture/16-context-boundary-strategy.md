# Section 16 — Context Boundary Strategy (ADR)

**Status:** Proposed — awaiting approval
**Depends on:** [Section 13](./13-development-strategy.md) §13.4 (AppContext decomposition rule), [Section 3](./03-domain-architecture.md) (Domain Architecture)
**Type:** Architecture Decision Record — unlike Sections 1–15, this is not a new
area of product scope; it documents and formalizes a specific decision about
how client-side state is organized as the codebase grows, so future
contributors have a citable rationale instead of relying on file size or
convention alone.

---

## Context

`AppContext.tsx` currently holds every piece of client-side state: identity/
session, the active business and owned-businesses list, and the full Business
Worth ledger (products, batches, purchase batches, quebras, expenses,
withdrawals, stock counts, closings, closed periods, staff, timeline). At
~2000 lines, its size alone is not a defect — Section 13 §13.8 is explicit
that decomposition should be triggered by a measured problem, not a line
count. Module #17 (Multi-Shop) is about to add real weight to one specific
slice of this state (shop settings, metadata, lifecycle, owner-portfolio
management), which is a legitimate trigger under §13.2's own reasoning ("a
prerequisite that makes a later phase cheaper").

## Decision

1. **`AppContext` remains the core Business Worth domain context.** Products,
   batches, purchase batches, quebras, expenses, withdrawals, stock counts,
   closings, closed periods, staff, and timeline stay unified. These domains
   interact constantly (e.g., a Closing reads across Expenses, Withdrawals,
   and Stock Counts); splitting them would increase coupling, not reduce it.
2. **`BusinessContext` is extracted from `AppContext`** as the first
   sub-step of implementing Module #17 — not before, and not as a separate
   cleanup pass. It owns the active business entity and business ownership:
   `business`, `ownedBusinesses`, `activeBusinessId`, `addShop`,
   `switchShop`, with room to grow into business profile/branding/
   preferences/currency/timezone/locale/category as those needs
   materialize. Named for the domain (the business entity and its
   ownership), not the one UI action (`ShopSwitcher.tsx`) it currently
   supports, so it doesn't need renaming as its responsibilities grow. The
   extraction step itself is mechanical (move state and functions, update
   the consuming components, verify zero behavioral diff) and reviewed
   separately from Module #17's new functional code, even if done in the
   same development session.
3. **Identity/session state stays inside `AppContext`.** `currentUser`,
   `userProfile`, `suspensionNotice`, `isAuthLoading`, `pairedDevice` — none
   of these are under near-term growth pressure from anything currently on
   the roadmap; extracting them now would be speculative.
4. **Future platform domains are created independently, never carved out
   retroactively.** `SubscriptionContext`, `NotificationContext`, and any
   later `FeatureFlagContext` are created new when their owning phase
   begins ([Section 13](./13-development-strategy.md) §13.5 onward), since
   their data doesn't live in `AppContext` today. This restates and
   formalizes §13.4's existing rule with a named decision record — it does
   not change that rule.
5. **Further decomposition of the ledger domain is explicitly deferred.**
   A future split (e.g., `ProductsContext`/`LedgerContext`) requires a
   measured performance or maintainability trigger (per §13.8's reactive
   policy) before it's reconsidered — not convention, not line count.

## Consequences

- `ShopSwitcher.tsx` and `Header.tsx` become the first consumers of
  `BusinessContext` instead of `AppContext`; no other component should need
  to change as a result of this extraction alone.
- Module #17's spec and implementation build directly on `BusinessContext`,
  giving it a stable home from day one rather than retrofitting it after the
  feature ships.
- Any future contributor asking "why isn't the ledger split up" or "why is
  Subscriptions its own context but Business wasn't originally" has a
  documented rationale to point to instead of re-litigating it.
