Business Domain Specification

# Owner Portfolio

*(Formerly documented as "Multi-Shop." This module is the same
capability, renamed to reflect its actual shape: a secure
ownership-management and business-switching layer above independent
Businesses — not a new aggregation system. See "BDS Clarifications"
below.)*

Version 1.0
**Status:** Drafted, awaiting approval
**Module #17 of 20 — Phase 4: Platform**
**Architecture references:** [Section 2.8](../architecture/02-core-product-principles.md)
(Tenant Isolation Is Non-Negotiable — "a business's data is never
queryable, readable, or derivable by another business's owner or staff,
under any circumstance" — explicitly naming multi-shop as one of the
capabilities that creates "new temptations to weaken it just for
aggregate reporting"), [Section 3.2](../architecture/03-domain-architecture.md)
(Business domain — "one Admin (User) owns one or more Businesses
(multi-shop, currently capped at 10)"), [Section 3.11](../architecture/03-domain-architecture.md)
(Staff domain — "business scoping (currently one shop per staff
member)"), [Section 5.9](../architecture/05-business-lifecycle.md)
(Business Growth stage — adding a shop re-enters the lifecycle at
Business Setup 5.3 under the same admin identity; the future
Subscription-gated 11th-shop check), [Section 6.2](../architecture/06-user-architecture.md)
(Role: Admin — "full control of one or more Businesses... the only
tenant-side role that can add a shop"; the `businessIds`/`businessId`
fallback pattern), [Section 6.4](../architecture/06-user-architecture.md)
(Role: Staff — "staff never have multi-shop access, per the existing
`businessId`-only profile shape"), [Section 8.12](../architecture/08-module-architecture.md)
(`BusinessProfileSetupModal.tsx`, `ShopSwitcher.tsx` — business
creation/setup and multi-shop switching), [Section 8.13](../architecture/08-module-architecture.md)
(App State — `AppContext` keeps "current business, `businessIds`" as
core identity/session state)
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
and every operational module (#3–#13), all of which already assume a
single active `businessId` scope per Architecture 3.2 — Multi-Shop does
not change what any of them compute, only which tenant they compute it
for · [Staff & Roles (spec #16)](./16-staff-roles.md), whose
`isOwnerOf`/`isOwnerOrGrantedManager` Security Rule functions this spec
extends, never replaces
**Implementation:** This module is substantially already built and
running, not greenfield — confirmed by direct code read, not assumed.
`src/types.ts` (`Business` interface; `UserProfile.businessIds`),
`src/context/AppContext.tsx` (`MAX_SHOPS_PER_OWNER = 10`,
`ownedBusinessIds`/`activeBusinessId` derivation, `ownedBusinesses` live
listener, `addShop`, `switchShop`), `src/components/ShopSwitcher.tsx`
(owner-only shop menu, add-shop form, at-limit state),
`src/components/BusinessProfileSetupModal.tsx` (business
creation/editing UI, reused for both first-time setup and later
editing), `firestore.rules` (`isMemberOf`, `isOwnerOf`,
`isValidBusinessIdsChange`, `isValidActiveBusinessIdChange` —
server-enforced 10-shop cap and ownership check on every `businessIds`
write, as a backstop to the client-side check). What does **not** exist
yet, confirmed by search: any shop-removal/archival flow, any
Subscription-gated shop-limit check (today's cap is a hardcoded
constant, not a plan-tier read), and any cross-shop aggregate or
"combined" Business Worth view of any kind.

---

## Purpose

Document the business specification for Multi-Shop — the capability,
already designed in Architecture (2.8, 3.2, 5.9, 6.2) and already
substantially implemented in code, that lets a single Admin identity own
and operate more than one independent Business ("shop") under one
account. Unlike Module #15 (AI Intelligence), this spec follows the
pattern of modules #1–#13: it documents a real, working feature — the
`ShopSwitcher`, `addShop`/`switchShop`, and their `firestore.rules`
enforcement — so that its business rules are settled and citable rather
than re-derived from Architecture text or from reading `AppContext.tsx`
each time the module comes up again.

## Business Problem

Architecture's own opening brief names this directly (Section 1's
Secondary Persona and Problem Table, cited in spec #1): *"I run more
than one shop and can't see them as one business"* is a real problem for
the target Admin as their business grows past a single location. Sabush
BPT's answer, per Architecture, is deliberately **not** to make an
Admin's several shops look like one aggregated business — Principle 2.8
is explicit that doing so "just for aggregate reporting" is exactly the
temptation this platform must resist. Instead, the problem it actually
solves is: let one Admin identity hold, switch between, and operate
several fully-isolated shops without needing several separate logins —
each shop's Worth remains its own, provably-isolated figure, and the
Admin's convenience is in identity and navigation, never in blended
numbers.

## Users

- **Admin (Owner):** the only role that can own more than one shop, add
  a new one, or switch between them (Architecture 6.2). An Admin who
  owns exactly one shop today experiences no difference from a
  single-shop Admin — Multi-Shop is additive capability, not a mode
  change.
- **Manager/Staff:** explicitly and permanently single-shop, per
  Architecture 6.4 ("staff never have multi-shop access, per the
  existing `businessId`-only profile shape") — this spec does not
  change that, and does not invent a "Manager across shops" capability.
  Spec #16 already flagged multi-shop Manager scope as future,
  out-of-scope work; this spec does not resolve it, consistent with
  "never invented or assumed."
- **SuperAdmin/Developer:** not a user of this module's operational
  surface. A future SuperAdmin support tool reading a shop's
  `businessCode` (Architecture 8.14's forward note) is Module #18's
  concern, not this one's.

## User Stories

- As an Admin with one shop, I want to add a second shop under my same
  account, so I don't need a second login to run a new location.
- As an Admin with multiple shops, I want to switch which shop I'm
  currently viewing/operating on, so every screen (Dashboard, Products,
  Reports, Stock) reflects exactly the shop I mean, never a blend.
- As an Admin, I want to know how many of my shop slots I've used and
  when I've hit the limit, so I'm not surprised by a rejected "Add Shop"
  attempt.
- As an Admin, I want each shop's Business Worth, inventory, and
  financial history to stand completely on its own, so a problem or
  number in one shop never bleeds into or explains another.
- As a Staff member, I want my account to stay scoped to the one shop I
  work at, exactly as it always has, regardless of how many shops my
  Admin owns.

## Business Rules

**One Admin, up to ten independent Businesses — never merged into one**
- Architecture 3.2/5.9/6.2 fix the cap at 10 shops per Admin identity.
  Verified as implemented: `MAX_SHOPS_PER_OWNER = 10` in `AppContext.tsx`,
  checked client-side in `addShop` and re-checked server-side (as the
  authoritative enforcement) in `firestore.rules`'
  `isValidBusinessIdsChange` (`oldIds.size() < 10`).
- Each shop is its own `businesses/{businessId}` document and its own
  complete tenant boundary — Products, Stock Batches, Purchase Batches,
  Quebras, Expenses, Withdrawals, Stock Counts, Closings, Timeline, and
  every calculated Business Worth figure are scoped to exactly one
  `businessId`, never combined across an Admin's shops. This is not a
  missing feature to build later — per Principle 2.8, it is the
  boundary this module must never cross.

**Exactly one active shop at a time; every other module reads it, none
of them know Multi-Shop exists**
- `activeBusinessId` on the Admin's own `users/{uid}` profile determines
  which shop every other view/module currently operates against
  (Architecture 8.13: `AppContext` "keeps... current business,
  `businessIds`" as the shared identity state every existing module
  8.2–8.10 already reads from, unchanged).
- Switching shops (`switchShop`) only ever changes which shop is active
  for the calling Admin's own session — it is a pure identity/routing
  action, never a data-mutating one, and it can only target a shop
  already present in that Admin's own `businessIds` (`firestore.rules`:
  `isValidActiveBusinessIdChange` requires the new active id be a
  member of the (also-being-written) `businessIds` array).

**Staff and Manager are permanently single-shop**
- Architecture 6.4: a Staff account's scope is exactly one `businessId`,
  fixed at account creation, never multi-shop. Verified in
  `firestore.rules`: `isMemberOf` resolves a Staff account purely via
  `myProfile().businessId == businessId`, with no `businessIds` clause
  for that branch. Spec #16's Manager tier inherits this same
  single-shop scoping — a Manager is granted permissions within their
  one `businessId`, never across an Admin's other shops.

**Adding a shop re-enters the existing lifecycle — no parallel setup
flow**
- Architecture 5.9: "adding an additional shop... re-enters this
  lifecycle at Business Setup (5.3) for the new shop specifically — it
  gets its own Business Profile, its own option to record an Initial
  Stock Count, its own Products and Stock Entry." A new shop created via
  `addShop` starts with zero Products, zero Stock, and no history of its
  own — it is a brand-new tenant, not a clone or a branch of the shop it
  was created from.
- `addShop` writes a complete new `businesses/{businessId}` document
  (name, `ownerUid`, category, `currencySymbol`, `createdAt`) and
  atomically becomes the caller's new `activeBusinessId` — verified in
  `AppContext.tsx`.

**Ownership integrity is server-enforced, not merely client-trusted**
- `firestore.rules`' `isValidBusinessIdsChange` requires that any id
  appended to an Admin's own `businessIds` array point to a
  `businesses/{id}` document whose `ownerUid` is the calling Admin's own
  uid — per Principle 2.8, this is what prevents an Admin from ever
  granting themselves access to a shop they don't own by directly
  editing their own profile document. This rule is already correctly
  implemented and this spec changes nothing about it.

**The 10-shop cap is a fixed constant today, not a plan-tier limit**
- Architecture 5.9 names a *future* state explicitly: "the 11th-shop
  attempt is exactly the check Section 3.13 names... read live from the
  `subscriptions` collection before `addShop` is allowed to proceed" —
  but also fixes that "Section 9 will design the specific plan tiers and
  limits," which has not happened (Module #18/#19 are Not Started). This
  spec documents today's real behavior (a single hardcoded cap, applying
  identically to every Admin) and does not invent a tiered limit
  Architecture hasn't designed yet. Replacing the constant with a
  Subscription-gated check is explicitly out of scope for this module
  and belongs to whichever future spec implements Module #19.

## Functional Requirements

*Requirements 1–4 describe already-implemented, working behavior —
grounded in the code cited above, not forward-looking. Requirement 5 is
the one real, flagged gap.*

1. **Add Shop:** An Admin can create a new shop (name, category,
   currency) from `ShopSwitcher`, subject to the 10-shop cap. The new
   shop becomes active immediately. Disabled in the UI once the cap is
   reached, with the current count shown (`{n}/{max}`).
2. **Switch Shop:** An Admin who owns more than one shop can change
   which shop is currently active from `ShopSwitcher`. Every other
   module's data (Products, Stock, Reports, Dashboard, etc.) reflects
   the newly active shop on the very next read — no separate "reload"
   step, since all of it already reads `activeBusinessId` via
   `AppContext`.
3. **Business Profile setup/edit:** Name, category, contact, location,
   and email are editable per-shop via `BusinessProfileSetupModal`,
   reused for both first-time setup and later editing (Architecture
   8.12). `currencySymbol` is set once at shop creation and has no
   existing edit path in this modal today — a real constraint, not a
   gap this spec needs to resolve, since Architecture 7.1's currency-lock
   rule (referenced in 8.12's own forward note) only becomes relevant
   once an edit path for currency is proposed.
4. **Legacy single-shop accounts:** An Admin created before Multi-Shop
   existed (no `businessIds` array yet, only the legacy `businessId`
   field) is transparently treated as a one-shop owner — `AppContext`
   derives a one-item list from `businessId` — and is upgraded to a real
   `businessIds` array the first time they add a second shop. No
   migration script is required or should be run; this is an existing,
   correct lazy-upgrade pattern.
5. **Gap — no shop removal/archival:** Neither Architecture nor the
   current implementation defines any way to remove, close, or archive
   a shop once created. This is a genuine, unaddressed gap (Architecture
   7.9's `status: 'closed'` flag is named only as a *future extension*
   in 8.12, not a current design) — flagged here for a decision, not
   silently assumed either way, consistent with how spec #15 flagged its
   own localization gap.

## Non-functional Requirements

**Localization**
- Every string in `ShopSwitcher` and `BusinessProfileSetupModal` must be
  sourced via the existing i18n layer and render correctly in pt/en/fr,
  matching every prior module's Acceptance Criteria (e.g. spec #1's
  Dashboard). Verified gap: `ShopSwitcher.tsx`'s current strings
  ("Meu Negócio", "Adicionar Loja", "Limite de N lojas atingido", error
  messages) are hardcoded Portuguese, not routed through i18n — a real,
  currently-existing gap this spec's Acceptance Criteria must close, not
  a forward-looking requirement like spec #15's.

**Performance**
- Per Architecture 8.13, `ownedBusinesses` is a live Firestore listener
  per owned shop (up to 10 concurrent listeners for a maxed-out Admin) —
  already the correct pattern for a small, bounded `N ≤ 10`; no
  additional requirement introduced here.

**Security**
- Tenant isolation (Principle 2.8) is this module's central security
  requirement: no code path may let one shop's data be read, written, or
  derived through another shop's session, including the Admin's own
  other shops. `isMemberOf`/`isOwnerOf`'s per-`businessId` scoping is
  the existing mechanism and this spec introduces no new one.
- `isValidBusinessIdsChange`'s ownership check (Business Rules, above)
  is the specific control preventing self-granted access to a shop the
  caller doesn't own — must remain intact through any future change to
  this module.

**Accessibility / Mobile**
- `ShopSwitcher` and `BusinessProfileSetupModal` follow the existing
  Design System components already used elsewhere in Settings — no new
  interaction pattern introduced.

## KPIs

*Architecture does not define KPIs for this domain specifically —
listed here are the outcome-level signals the Business Problem section
implies:*
- An Admin can add a second shop and switch to it in under three
  interactions from `ShopSwitcher`, with zero visible cross-shop data
  bleed at any point during or after the switch.
- Zero regression: single-shop Admins (the overwhelming majority today)
  see no behavior change — `ShopSwitcher`'s chevron/menu affordance
  itself only ever appears once `ownedBusinesses.length > 1`.

## Future Enhancements

- **Subscription-gated shop limit** (Architecture 5.9's own named
  future state) — replacing today's hardcoded `MAX_SHOPS_PER_OWNER`
  constant with a live read from Module #19 (Subscriptions) once that
  module exists, per the plan tiers Architecture 9 will define. Not in
  scope for this spec or its implementation.
- **Shop removal/archival** — resolving the gap named in Functional
  Requirement 5, once Architecture makes an explicit decision (7.9's
  `status: 'closed'` flag or an equivalent) rather than this spec
  inventing one.
- **`businessCode` display** (Architecture 8.14's forward note) —
  belongs to Module #18 (SuperAdmin)'s support-search design, not this
  module.
- **Multi-shop Manager scope** — already flagged as future, out-of-scope
  work in spec #16; unchanged by this spec.

## Acceptance Criteria

- [ ] An Admin can own between 1 and 10 shops; the 11th attempt is
      rejected both client-side (`ShopSwitcher`'s disabled Add button)
      and server-side (`firestore.rules`), with the two limits kept in
      sync at the same value.
- [ ] Switching the active shop changes what every other module
      (Dashboard, Products, Reports, Stock, Timeline) displays, with no
      figure from the previously active shop persisting anywhere after
      the switch.
- [ ] A Staff or Manager account's access remains scoped to exactly one
      `businessId` regardless of how many shops their Admin owns —
      verified against `firestore.rules`' `isMemberOf` for the Staff
      branch specifically.
- [ ] An Admin cannot gain access to a shop they don't own by directly
      editing their own `businessIds` array — verified against
      `isValidBusinessIdsChange`'s ownership check in a rules-emulator
      test.
- [ ] No Dashboard, Report, or Business Worth figure ever combines data
      from more than one `businessId` in a single computed value —
      verified by reading `calculateInventoryTotals` and every Report
      query for a hardcoded or accidental multi-business read.
- [ ] `ShopSwitcher.tsx`'s hardcoded Portuguese strings are routed
      through the existing i18n layer and verified rendering correctly
      in pt/en/fr.
- [ ] A legacy Admin account (pre-Multi-Shop, `businessId` only) adds a
      second shop successfully and is correctly upgraded to a real
      `businessIds` array, with no disruption to their existing shop's
      data or access.

## BDS Clarifications

Added during the Owner Portfolio documentation alignment (rename from
"Multi-Shop"), settling four scope questions raised by the rename itself
so they don't get re-litigated each time this spec is read:

1. **`MAX_SHOPS_PER_OWNER = 10` is a Version 1 platform rule.** It is a
   flat constant today, applying identically to every Admin. Any future
   subscription-tiered limit is out of scope for this module and belongs
   to Module #19 (Subscriptions) — this spec does not anticipate or
   design that mechanism (see Business Rules and Future Enhancements,
   above, for the existing detail on this point).
2. **Future subscription-based Business limits belong to Module #19.**
   Restated here for clarity alongside point 1: replacing the hardcoded
   cap with a live plan-tier read is Module #19's concern, not this
   module's.
3. **Existing internal identifiers containing "Shop" are not part of
   this module's required refactor.** Code-level names such as
   `MAX_SHOPS_PER_OWNER`, `addShop`, `switchShop`, `ShopSwitcher`, and
   `ownedBusinesses`'s related identifiers are unaffected by this
   documentation rename. Renaming internal identifiers to match "Owner
   Portfolio"/"Business" terminology is not required or implied by this
   alignment.
4. **i18n terminology cleanup is separate UI-quality work, not ownership
   redesign.** The existing, already-flagged gap (Non-functional
   Requirements, above: `ShopSwitcher.tsx`'s hardcoded Portuguese
   strings not yet routed through i18n) is unchanged by this rename. It
   remains a UI-quality/localization task, tracked on its own terms —
   this alignment does not fold it into an "ownership redesign" scope it
   was never part of.

---

**Awaiting approval.** Per process, implementation does not begin until
this spec is explicitly approved.
