TECHNICAL DESIGN — ANALYSIS ONLY — NO IMPLEMENTATION AUTHORIZED

# Periodic Contagem — Technical Design for Decisions 44–55

**Phase:** Technical Design (post-governance, pre-Implementation-Plan)
**Governing baseline:** Decisions 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
54, and 55 — all ✅ ACCEPTED, GOVERNANCE REQUIREMENTS ONLY. Decision 55
accepted and recorded in `origin/main` at commit `980e68c`.
**Rule 8 status:** READY AFTER DECISIONS (unchanged by this document).
**This document does NOT:** modify application code, `firestore.rules`,
schemas/types, UI, tests, indexes, or configuration; create an
Implementation Authorization; or begin implementation.

---

## §1 — Purpose

Decisions 44–55 settled **what** the Periodic Contagem shared-editing
system must guarantee. None of them selected **how**. This document
proposes the smallest technically sound architecture that makes every
one of those governance requirements enforceable, built directly
against the current repository (not a redesign), and flags every place
the current repository already falls short of, or already conflicts
with, what the accepted decisions now require.

---

## §2 — Governing Decisions 44–55 (Summary)

| Decision | Governs | Key requirement this design must satisfy |
|---|---|---|
| 44 | Shared live data, no-silent-loss | No legitimate observation may be silently discarded |
| 45 | (superseded/reinterpreted by 46) | — |
| 46 | Dual Active Editor Authority | Owner/Admin + at most one delegated Editor may edit simultaneously, including the same row |
| 47 | Shared Live State & Conflict Preservation | Live sync first; detect-and-preserve on genuine collision; no blind last-write-wins |
| 48 | Authority-model governance requirements | Explicit delegation, at-most-one delegate, no automatic transfer |
| 49 | Former-Editor reconnection | A revoked delegate's reconnection does not restore authority |
| 50 | Exactly-One Finalization | At most one finalization may succeed; stale attempts rejected |
| 51 | Shared-device/cache isolation | User×Business context isolation, even on one physical device |
| 52 | Viewer Authorization | Live read access, no write access, no new role |
| 53 | Finalizer Authorization | Owner/Admin is the only finalizer |
| 54 | Delegate Eligibility | Any currently business-authorized user is eligible; continuing check |
| 55 | Same-Row Conflict Semantics | No auto-winner; explicit `CONFLICT` state; dual-role resolution; unresolved conflict blocks finalization |

---

## §3 — Current-State Constraints (from direct repository inspection)

**Files inspected:** `apps/tenant/src/components/PeriodicStockCountView.tsx`,
`apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/types.ts`,
`apps/tenant/src/lib/firebase.ts`, `firestore.rules`, and the existing
Periodic Contagem test suite.

1. **Schema (`types.ts`).** `PeriodicStockDraftItem` has exactly:
   `productId?, productName, quantity, unit, costPrice, sellingPrice,
   removed?, validated?`. **No writer-identity field. No revision
   field. No conflict-state field.** `PeriodicStockDraft` (the meta
   document) has `items` (derived, not stored), `type, label?, date,
   submissionId?, newProductInfo?, updatedAt`.
2. **Storage shape.** One meta document
   (`businesses/{id}/stockCountDrafts/periodic`) plus one **items
   subcollection**, one document per row (`.../periodic/items/{rowKey}`)
   — already split so one row's write can never race another row's
   write or the meta document's own fields. This shape is reused
   as-is; it is exactly right for per-row revision fields.
3. **Writes today (`AppContext.tsx`).** `savePeriodicStockDraftItem`
   does a plain `setDoc(itemRef, item)` — an unconditional overwrite,
   confirmed via `getDocFromServer` for delivery, never for
   compare-and-write. `flushPeriodicStockDraftRows` does the same
   inside a `WriteBatch`, for every row at once. **Neither path reads
   the existing document before writing.** This is the literal
   mechanism behind the last-write-wins behavior Decision 47/55 now
   prohibit.
4. **Listeners today.** Two independent `onSnapshot` subscriptions —
   one on the meta document, one on the `items` subcollection — feeding
   `periodicStockDraftMeta`/`periodicStockDraftItemsByKey` state. A
   remote row change already propagates live to any other subscriber
   with read access; **the only reason it isn't already usable as
   Decision 47's "primary conflict-avoidance" live-adoption mechanism
   is that nobody but the Owner currently has read access at all**
   (next point).
5. **`firestore.rules` — `stockCountDrafts` (and its `items`
   subcollection).** `allow read: if isOwnerOf(businessId)`;
   `allow create, update: if isOwnerOf(businessId) &&
   subscriptionAllowsNewRecords(businessId)`; `allow delete: if
   isOwnerOf(businessId)`. **Confirmed: zero access of any kind exists
   today for a delegated Editor or a Viewer.** This is Rule 8 Finding
   A/B, confirmed by direct rule text, not inference.
6. **Finalization (`recordStockCount`, `AppContext.tsx`).** Periodic
   counts already use a **deterministic document id**,
   `'stockcount-periodic-' + submissionId`, written via `fsBatch.set()`
   into `businesses/{id}/stockCounts/{id}`. A retried finalization
   attempt with the same `submissionId` lands on the same document —
   Firestore classifies this as an `update`, not a `create`, and
   `firestore.rules` already permits an Owner to update a non-`initial`
   `stockCounts` document unconditionally, so a retry is a same-content
   no-op today. **This existing mechanism already gives Decision 50's
   idempotent-retry requirement "for free"** — it does not yet give
   Decision 55's new "no unresolved conflicts" precondition, which does
   not exist in any form today.
7. **`firestore.rules` — `stockCounts`, non-`initial` type.**
   `allow update, delete: if isOwnerOf(businessId) &&
   resource.data.get('type', null) != 'initial'`. **Confirmed: a
   finalized periodic `stockCounts` document can be arbitrarily
   rewritten or deleted by the Owner at any time after finalization,
   unconditionally.** This is a real, pre-existing gap against
   Decision 55 §5 item 7's/Finding G's post-finalization immutability
   requirement, not something this decision introduces. **One existing
   legitimate call site depends on the delete half of this**: the
   "Clear All Data" path (`AppContext.tsx`, ~line 7372) deletes every
   non-`initial` `stockCounts` document as part of a full business data
   reset. **No call site anywhere in `AppContext.tsx` uses the update
   half** — grep-confirmed zero `updateDoc(...'stockCounts'...)` calls
   for any type. This distinction matters for §14 below.
8. **`firebase.ts` — Firestore cache.** A single, process-wide
   `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`
   is initialized once for the whole app — by the code's own comment,
   "there is no SDK-level way to scope this to Periodic Contagem
   alone." `persistentMultipleTabManager` deliberately keeps the cache
   shared **across tabs of the same browser**, which is also, as a
   structural side effect, shared across **different users who log in
   sequentially in that same browser**, since there is only one
   IndexedDB-backed cache instance per origin.
9. **`logout()` (`AppContext.tsx`).** Confirmed by direct read: `const
   logout = async () => { await signOut(auth); }` — **exactly one
   line**. No `clearIndexedDbPersistence()`, no listener teardown
   ordering, no cache invalidation of any kind.
10. **`switchShop()` (`AppContext.tsx`).** Awaits the pending Contagem
    flush, then does one `updateDoc` on the user's own profile
    (`activeBusinessId`). Listeners re-subscribe to the new
    `businessId` via the existing effect dependency — but **the shared
    IndexedDB cache is never cleared**, so documents from the
    previously active business remain physically present in local
    storage after the switch, unreferenced by any live listener but not
    purged.
11. **An existing, directly reusable precedent:** `isOwnerOrGrantedManager
    (businessId, permission)` already implements "Owner, OR a Staff
    account explicitly promoted to a named permission tier, scoped to
    exactly this business, writable only by a privileged path, never by
    the client being granted the permission." This is structurally
    the same shape Decision 46/48/54 need for the delegated Editor —
    reused, not reinvented, in §5 below.

**Conclusion:** every CRITICAL/HIGH finding in the Rule 8 Assessment
(§IV.P) is confirmed, by direct code/rules inspection this session, to
still be exactly as open as classified. Nothing here is new
information about *severity* — it is the concrete evidence this design
builds against.

---

## §4 — Target Architecture

```text
Owner/Admin  ──┐
               ├─► isActiveContagemEditor(business) ─► write own observation (rev-guarded)
Delegated Ed.──┘
                                    │
                                    ▼
                    stockCountDrafts/periodic  (meta, unchanged shape)
                    stockCountDrafts/periodic/items/{rowKey}  (+rev, +writer, +state)
                                    │
                         onSnapshot (live, both listeners already exist)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                                ▼
              row.state == 'ACCEPTED'          row.state == 'CONFLICT'
              (adopt as working value)         (preserve both observations;
                                                 no settled working value;
                                                 resolvable by Owner/Admin
                                                 or delegated Editor)
                    │                                │
                    └───────────────┬────────────────┘
                                    ▼
                    finalization precondition: meta.openConflictCount == 0
                                    │
                                    ▼
                    stockCounts/{'stockcount-periodic-'+submissionId}
                    (Owner/Admin only, deterministic id — unchanged,
                     now additionally rules-gated on the precondition above)
```

Additive only: no existing collection is renamed or restructured; the
meta/items split, the deterministic finalization id, and the two
existing listeners are all reused unchanged in shape.

---

## §5 — Authority Model

**Authoritative location:** one new, small document,
`businesses/{businessId}/contagemAuthority/current`, sibling to
`stockCountDrafts/periodic` (same pattern, new document — not a field
bolted onto the business document, so its own access rule can be
scoped independently of the general business-document read/write
surface).

```text
contagemAuthority/current = {
  delegatedEditorUid: string | null,   // null = no delegate currently assigned
  assignedByUid: string,               // the Owner/Admin who made the assignment
  assignedAt: Timestamp,               // server timestamp
}
```

- **Owner/Admin authority is inherent** — never stored, derived
  entirely from the existing `isOwnerOf(businessId)` check, unchanged.
- **Write access:** `allow create, update: if isOwnerOf(businessId) &&
  (request.resource.data.delegatedEditorUid == null ||
  isMemberOfUid(request.resource.data.delegatedEditorUid, businessId))`
  — a small new rules helper, `isMemberOfUid(uid, businessId)`, mirrors
  the existing `isMemberOf`/`isOwnerOf` shape but checks a *named* uid's
  profile rather than `request.auth`'s own, satisfying Decision 54's
  eligibility requirement (currently business-authorized) at the
  moment of assignment. **Read access:** `allow read: if
  isMemberOf(businessId)` — every role needs to know who currently
  holds delegate authority (a Viewer must be able to see this to render
  correctly; a Viewer is never granted write access regardless).
- **At most one delegate:** structural — the document holds exactly one
  `delegatedEditorUid` field; there is no way to represent two.
- **Explicit only, no automatic transfer:** the field only ever changes
  via an Owner/Admin write; nothing else in the system writes this
  document.
- **Reassignment invalidates the former delegate immediately:**
  because every subsequent authority check (`isCurrentDelegatedEditor`,
  below) re-reads this document live at write-evaluation time — it is
  never cached in a custom auth claim or read once and held client-side
  as authoritative — a reassignment takes effect the instant the new
  document is committed, for every future request, from any device,
  online or reconnecting.
- **Offline does not create or transfer authority:** authority is
  evaluated server-side, from server-held state, at the moment a write
  is finally accepted — a client cannot be "offline-authoritative."
- **Reconnecting does not restore revoked authority (Decision 49):**
  a former delegate's queued write, once it reaches the server, is
  checked against whatever `contagemAuthority/current` says *then* —
  not against what it said when the write was queued.
- **Continuing eligibility (Decision 54):** eligibility is not just
  "was authorized at assignment time" — `isCurrentDelegatedEditor`
  (below) additionally requires `isMemberOf(businessId)` on every
  check, so a delegate who loses business authorization loses editing
  authority on the very next write attempt, with no separate
  revocation action required.

**New rules helper functions:**

```text
function isCurrentDelegatedEditor(businessId) {
  return isMemberOf(businessId) &&
    exists(/databases/$(database)/documents/businesses/$(businessId)/contagemAuthority/current) &&
    get(/databases/$(database)/documents/businesses/$(businessId)/contagemAuthority/current)
      .data.get('delegatedEditorUid', null) == request.auth.uid;
}

function isActiveContagemEditor(businessId) {
  return isOwnerOf(businessId) || isCurrentDelegatedEditor(businessId);
}
```

Both follow the exact `exists()`-guarded-`get()` pattern this file
already uses for `isBusinessSuspended`/`isOwnerOrGrantedManager` — no
new pattern introduced.

**No new role.** Viewer remains implicit: `isMemberOf(businessId) &&
!isActiveContagemEditor(businessId)`, computed, never stored.

---

## §6 — Shared Live State

The existing two-listener shape (meta document + items subcollection)
is reused unchanged. What changes is what a remote update means once
it arrives:

- **Adoption rule:** a remote snapshot for a row the local operator is
  **not currently actively typing into** is adopted directly into
  working state the moment it arrives — this is the "genuine row-level
  live-adoption" Decision 47 calls for, replacing today's passive
  whole-draft notice for the row-level case specifically (the
  whole-draft notice can remain for meta-level changes, e.g. type/date,
  which are Owner-only and rare).
- **Protecting an actively-edited row:** each row keeps one local
  boolean, `rowHasUnsavedLocalEdit`, set the instant a keystroke
  changes that row's own quantity/unit/price field and cleared the
  instant that row's own save resolves. While set, an incoming remote
  snapshot for that exact row is **not** blindly overwritten into the
  visible input — it is held as `remoteCandidateForRow[rowKey]` and
  only reconciled at the moment *this* operator's own next save for
  that row runs (§7), which is precisely where a genuine collision must
  be detected anyway. This avoids the two failure modes the task
  explicitly warns against: it never silently discards the operator's
  own in-progress keystrokes, and it never requires a manual whole-page
  reload merely because *some other* row changed.
- **Rows other than the one being typed into** adopt immediately and
  unconditionally — this is what makes "counting together" actually
  feel live, and is safe precisely because no local edit is at risk for
  a row nobody is currently touching.

---

## §7 — Concurrency Model

**Selected: Option E — rules-enforced monotonic revision precondition,
with client-side transactional read-compare-write for conflict
detection.** Rejected alternatives and why:

- **Option A alone (revision + precondition, no transaction):** cannot,
  by itself, distinguish "stale write" from "genuine collision" — both
  look identical (revision mismatch) without also comparing the
  competing *values*, which requires reading current state first.
- **Option C alone (rules-only):** rules can enforce the monotonic
  counter, but cannot themselves branch into "write a conflict record
  instead" — Firestore security rules validate a single proposed write
  against current state; they cannot substitute a different document
  shape as a side effect. Rules alone can reject a stale write; they
  cannot resolve one into a conflict record.
- **Option D (server-mediated write):** would work, but introduces a
  new server endpoint / Cloud Function dependency this feature has
  never needed before (every existing Periodic Contagem write is a
  direct client→Firestore call) — not the smallest mechanism, and a
  strictly larger infrastructure footprint for no additional guarantee
  Option E doesn't already provide.
- **Option E** combines A+C's cheap, rules-enforced backstop (a
  malicious or buggy client cannot bypass the revision check merely by
  skipping the transaction) with a client-side `runTransaction` that
  does the one thing rules cannot: read-then-branch.

**Row document additions:** `rev: number` (starts at `1` on first
write), `lastWriterUid: string`, `lastWriterRole: 'owner' | 'delegate'`,
`lastWriteAt: Timestamp` (server timestamp).

**Write mechanism (client, inside `runTransaction`):**

1. Read the row document's current `rev` and `quantity` (and whichever
   other fields constitute "the observation" — see §8's scoping note).
2. If `current.rev == myBaseRev` (nothing has changed since this editor
   last observed the row): write normally — set the new value,
   `rev: myBaseRev + 1`, `lastWriterUid/Role`, `state: 'ACCEPTED'`.
3. If `current.rev != myBaseRev`:
   - If `current.quantity == myNewValue` (someone else already wrote
     the same figure — not a real disagreement): adopt silently, no
     conflict, `rev` left as the server's current value, working state
     updated to match.
   - If `current.quantity != myNewValue`: **genuine collision.** Write
     `state: 'CONFLICT'` and populate the `conflict` object (§8) with
     both observations; do **not** overwrite `quantity` with either
     value; increment `meta.openConflictCount` by 1 in the **same**
     transaction (see §11).

**Rules-enforced backstop** (defense in depth, not merely client
discipline): an ordinary (non-conflict, non-resolution) row `update`
must satisfy `request.resource.data.rev ==
resource.data.get('rev', 0) + 1` **and**
`request.resource.data.lastWriterUid == request.auth.uid` **and**
`isActiveContagemEditor(businessId)`. A transition into `CONFLICT` or a
resolution out of it (§9) is validated by a separate, narrower rule
branch, since those writes do not follow the plain `rev+1` shape.

**Why each requirement is met:**
- *Detects stale writes:* the monotonic `rev` check, enforced by rules
  independent of client cooperation.
- *Detects genuine collision:* the transaction's read-then-compare
  step, which is exactly what distinguishes "value unchanged, just
  behind" from "value genuinely disputed."
- *Writer identity preserved:* `lastWriterUid/Role` on every accepted
  write; both original writer identities inside `conflict` (§8).
- *Both observations survive:* the transaction never overwrites
  `quantity` on a detected collision — it branches into the conflict
  shape instead.
- *Conflict becomes authoritative state:* `state: 'CONFLICT'` is itself
  the row's own authoritative field, read by the same listeners
  everyone already has.
- *Stale writes rejected:* by the rules-enforced `rev` precondition,
  independent of whether the client's own transaction logic is trusted.

---

## §8 — Conflict Model

Conflict fields live **on the row document itself** — no separate
subcollection or event log. This satisfies "only include fields
genuinely necessary" and "do not create an unnecessary full
event-sourcing/CRDT architecture": a conflict is a property of a row's
current state, not a stream of events.

```text
PeriodicStockDraftItem (additive fields only; all existing fields unchanged):
  rev?: number                    // absent on legacy rows = treated as 0
  state?: 'ACCEPTED' | 'CONFLICT' // absent = 'ACCEPTED' (backward compatible)
  lastWriterUid?: string
  lastWriterRole?: 'owner' | 'delegate'
  lastWriteAt?: Timestamp
  conflict?: {
    observationA: { value: string; writerUid: string; writerRole: 'owner'|'delegate'; at: Timestamp; baseRev: number };
    observationB: { value: string; writerUid: string; writerRole: 'owner'|'delegate'; at: Timestamp; baseRev: number };
    resolvedValue?: string;
    resolverUid?: string;
    resolverRole?: 'owner' | 'delegate';
    resolvedAt?: Timestamp;
  }
```

**Scoping note (explicit, not assumed):** the same-row collision
scenario Decision 55 describes is specifically about the **counted
quantity**. `unit`/`costPrice`/`sellingPrice` are edited far less
concurrently in practice and are not the field the governance chain's
own scenario or requirements discuss. This design scopes conflict
detection to `quantity` only — a divergent `unit`/price edit on the
same row from two editors is treated as an ordinary sequential edit
under the same `rev` mechanism (§7), not as a Decision-55-class
conflict. **This scoping choice is a Technical Design choice, not a
reinterpretation of Decision 55** — flagged explicitly in §22 for
Product Architect awareness, since broadening it later (e.g. to also
treat divergent `unit` as a conflict) would be additive, not breaking.

- **`resolvedValue` is preserved even after resolution** (never
  deleted), satisfying §6 item 1's "referenceable after resolution."
- **Backward compatibility:** every field here is optional; a row
  written before this design ships has none of them, and every rule/
  UI check treats their absence as `state == 'ACCEPTED'`, `rev == 0`
  — the exact "omit entirely, default on read" discipline this schema
  already uses for `removed`/`validated`.

---

## §9 — Conflict Resolution

```text
CONFLICT (state == 'CONFLICT')
   ↓
Owner/Admin OR current delegated Editor writes:
   { quantity: conflict.observationA.value  OR  conflict.observationB.value,
     state: 'ACCEPTED',
     conflict.resolvedValue, conflict.resolverUid, conflict.resolverRole, conflict.resolvedAt,
     rev: rev + 1 }
   ↓
meta.openConflictCount decremented by 1, in the SAME transaction
   ↓
Row becomes an ordinary settled row again; conflict object retained, not deleted
```

**Rules for a resolution write** (a distinct branch from the ordinary
`rev+1` update rule in §7): `isActiveContagemEditor(businessId)` **and**
`resource.data.get('state', 'ACCEPTED') == 'CONFLICT'` **and**
`request.resource.data.state == 'ACCEPTED'` **and**
`request.resource.data.quantity in
[resource.data.conflict.observationA.value,
resource.data.conflict.observationB.value]` — the resolver may only
select one of the two preserved figures; typing an entirely new third
number is a fresh physical recount, which Decision 55 §6 item 6
explicitly leaves unaddressed and this design therefore does not
silently fold into "resolution" (a recount would instead go through
the ordinary §7 write path as a brand-new observation once the row is
back to `ACCEPTED` — but starting from `ACCEPTED`, not from mid-conflict,
so it is never ambiguous which flow is in effect).

- **Not itself a new physical observation:** enforced structurally —
  resolution can only select an already-preserved value, never
  introduce one.
- **Viewer cannot resolve:** `isActiveContagemEditor` excludes Viewer
  by construction.
- **Stale/unauthorized resolution rejected:** the `state == 'CONFLICT'`
  precondition means a resolution attempt on an already-resolved row
  (e.g. a second resolver's stale UI, or a retry) is rejected outright
  by rules, not merely by client discipline — matching this codebase's
  existing precondition-checked-write discipline (e.g. the `initial`
  Void & Redo chain's own slot preconditions).

---

## §10 — Offline / Reconnect

| Check | Where enforced | Behavior |
|---|---|---|
| Current user | Firebase Auth (`request.auth.uid`) | SDK-level; unforgeable |
| Current business | `isMemberOf(businessId)` | Re-evaluated live, server-side, at write-acceptance time — never cached |
| Current authority | `isActiveContagemEditor(businessId)` (§5) | Re-reads `contagemAuthority/current` live — a revoked delegate's queued write is checked against *current*, not queued-time, authority |
| Current revision | `rev == resource.rev + 1` (§7) | A stale offline write's `baseRev` will generally no longer match if anything changed while offline |
| Accept / Conflict / Reject | Client transaction (§7) branching on the above | Genuinely-still-current write → ACCEPT; same value, different rev → silent adopt; different value → CONFLICT; failed auth/business/revision rule → REJECT (client re-fetches and informs the operator, discarding only the locally-stale copy, never a durable server-side observation) |

This directly satisfies: offline cannot create authority (authority is
never locally decided); a revoked user's reconnecting write cannot
succeed (fails `isActiveContagemEditor` at acceptance time, not queue
time); a stale revision cannot silently overwrite newer state (rules
reject it outright); legitimate durable history is never discarded
(every branch either accepts, silently reconciles an identical value,
or preserves both sides as a conflict — no branch deletes a durable
server-held value); reconnect cannot restore revoked authority (same
live-read mechanism as reassignment in §5).

---

## §11 — Finalization

**Reused unchanged:** deterministic id `'stockcount-periodic-' +
submissionId`; Owner/Admin-only create (already enforced); retry lands
on the same document id, classified as an `update` by Firestore,
already permitted for an Owner on a non-`initial` document — this is
Decision 50's exactly-once-with-idempotent-retry guarantee, and it
already exists in the repository today, unmodified by this design.

**New precondition (Decision 55 §5 items 7–10):** a denormalized
counter, `openConflictCount: number`, lives on the **meta** document
(`stockCountDrafts/periodic`), maintained transactionally in the exact
same transaction that flips a row into (§7) or out of (§9) `CONFLICT`
— so it can never drift out of sync with the true per-row count,
without ever needing a rules-level collection scan (Firestore rules
cannot cheaply aggregate across an arbitrary number of subcollection
documents in a single write's rule evaluation; a maintained counter is
the standard, smallest way around that limitation).

**Rule addition to the existing `stockCounts` `create` rule**, for the
non-`initial` branch only:

```text
(request.resource.data.get('type', null) != 'initial' &&
  subscriptionAllowsNewRecords(businessId) &&
  get(/databases/$(database)/documents/businesses/$(businessId)/stockCountDrafts/periodic)
    .data.get('openConflictCount', 0) == 0)
```

- **Rejects, never resolves:** this is purely an `allow create`
  precondition — it can only refuse the write outright. It structurally
  cannot "pick a value on the resolver's behalf," satisfying §5 item 9.
- **No partial finalization:** the precondition is evaluated once, for
  the whole Contagem (via the single meta-level counter), not per row
  — there is no path that finalizes some rows while skipping others.
- **A rejected attempt discards nothing:** a rejected `create` never
  touches any row document; both preserved observations on every still-
  open conflict remain exactly as they were.
- **Composes with, does not replace,** the existing exactly-once
  mechanism and Decision 53's finalizer-only rule (`isOwnerOf`, already
  the sole gate on this same `create` rule) — this is one more `&&`
  clause, not a rewritten rule.

---

## §12 — Cache / Session Isolation

**Confirmed findings (§3 items 8–10), restated as the design baseline:**
a single shared `persistentLocalCache` per browser origin;
`persistentMultipleTabManager` deliberately shares it across tabs of
the *same* browser, which structurally means across different users
who log into that same browser in sequence; `logout()` is exactly
`signOut(auth)`, nothing else; `switchShop()` never clears the cache.

**Factual SDK question that must be verified before implementation**
(named explicitly, per the task's own instruction, not assumed either
way): does a freshly-created `onSnapshot`/`getDoc` call, made
immediately after a new `request.auth` context is established (new
login, or a business switch), ever serve a previously-cached document
from the *prior* context before the SDK has re-validated against the
new context's server-side permissions — or does every fresh
listener/read always force a server round-trip that Firestore's own
rules evaluation gates on the *current* `request.auth`, with the local
cache only ever serving as a fallback for genuinely offline reads of
documents the *current* context has itself already legitimately
fetched? This is precisely Finding K's own named verification and is
**not answered by this design** — it determines which of the two
options below is strictly required versus merely an extra safety
margin.

**Recommended minimum design, regardless of that verification's
outcome:**

1. **On `logout()`:** unsubscribe every active `onSnapshot` listener
   first (Firestore requires no active listeners for
   `clearIndexedDbPersistence()` to succeed), then call
   `clearIndexedDbPersistence()` (or `terminate()` followed by a fresh
   `initializeFirestore()` on next login, if `clearIndexedDbPersistence`
   proves impractical given `persistentMultipleTabManager`'s
   multi-tab coordination — this exact trade-off is itself part of the
   named factual verification above), then `signOut(auth)`. This
   guarantees no document from the departing user's session persists
   into a subsequent different user's session on the same browser,
   independent of whatever the verification above concludes.
2. **On `switchShop()`:** at minimum, rely on the fact that every read
   remains gated by `isMemberOf(newBusinessId)` for any read that
   genuinely reaches the server — the named risk is specifically a
   cache-only read that never reaches the server. If the verification
   in this section concludes that risk is real, the same clear-and-
   reinitialize treatment as logout should be applied to business
   switching as well; if the verification concludes fresh listeners
   already force a server-validated round-trip, listener
   re-subscription (which `switchShop` already does via the existing
   `activeBusinessId` effect dependency) is sufficient on its own. This
   design does not claim to already know which is true — it names the
   exact experiment required and the two safe outcomes.
3. **General principle, precedented by this codebase's own
   `ReadbackUnconfirmedError` pattern:** never treat a cache-only read
   as authoritative for anything security- or authority-sensitive
   without a `getDocFromServer` confirmation at the exact moment a
   context boundary (login, business switch, authority reassignment)
   is crossed.

**No unsupported claim is made here about which SDK behavior is
already true** — per the task's own instruction, this is named as an
open factual verification, not asserted either way.

---

## §13 — Viewer Design

- **Read:** `stockCountDrafts/periodic` (meta) and its `items`
  subcollection widen from today's `isOwnerOf`-only to
  `isMemberOf(businessId)` — a Viewer gains the exact same live
  listeners the Owner/delegate already use; no new read surface is
  built.
- **Sees:** active Contagem, live row updates, quantities, progress,
  `CONFLICT` state and both preserved observations (all live on the row
  document a Viewer can now read), and finalization state (via the
  already-`isMemberOf`-gated `stockCounts` collection, unchanged).
- **Cannot:** the ordinary row-write rule, the conflict-transition
  rule, and the resolution rule (§7, §9) all require
  `isActiveContagemEditor(businessId)` — a Viewer fails every one of
  them by construction. Assigning/reassigning the delegate requires
  `isOwnerOf` (§5) — a Viewer fails this too. Finalization requires
  `isOwnerOf` (unchanged, Decision 53) — same result.
- **Enforced server-side, not UI-only:** every restriction above is a
  `firestore.rules` condition; the UI simply chooses not to render
  write affordances for a Viewer as a courtesy, never as the actual
  boundary.
- **No new role introduced:** Viewer remains the implicit "authorized
  member who is neither Owner/Admin nor the current delegate,"
  computed, never stored — exactly as Decision 52 already requires.

---

## §14 — Finalized Immutability

**Confirmed gap (§3 item 7):** the existing rule
`allow update, delete: if isOwnerOf(businessId) &&
resource.data.get('type', null) != 'initial'` permits an Owner to
rewrite or delete a finalized periodic `stockCounts` document at any
time, unconditionally. Decision 55 §5 item 7/Finding G's own
post-finalization immutability requirement makes this newly
load-bearing — it is a pre-existing condition, not a new requirement
this decision invented, and it must be closed for the finalized result
to actually mean what Decision 50/55 say it means.

**Split recommendation, based directly on the two confirmed call
sites in §3 item 7:**

- **`update`:** narrow to `allow update: if false` for any non-`initial`
  `stockCounts` document. **Zero existing call sites depend on the
  update path** (grep-confirmed) — this closes the gap with no known
  functional regression. A finalized periodic count becomes exactly as
  immutable to ordinary update as an `initial` count already is.
- **`delete`:** **cannot** be narrowed to `if false` without breaking
  the existing, legitimate "Clear All Data" wholesale-reset call site.
  This is a genuine tension the technical design surfaces rather than
  resolves unilaterally: "Clear All Data" operates on a categorically
  different threat model (an explicit, whole-business reset action,
  not a quiet rewrite of one finalized result) than the silent-mutation
  risk Decision 55/Finding G are actually about. **This is flagged in
  §22 as a question requiring explicit reconciliation** — either (a) a
  Product Architect confirmation that "Clear All Data" is
  out-of-scope for Decision 55's immutability requirement and may keep
  its existing delete capability unchanged, or (b) a narrower delete
  rule that distinguishes "part of an authorized, audited full-business
  reset" from "an isolated delete of one otherwise-untouched finalized
  count," which would need its own mechanism design. This design does
  not pick one unilaterally, since (a) is a governance question, not a
  technical one.
- **No second finalized result:** already guaranteed by the
  deterministic-id create-if-absent-in-effect mechanism (§11), unaltered.
- **No draft resurrection affecting the finalized result:** finalization
  already deletes the draft (meta + every row) in the same atomic
  batch as the `stockCounts` write (existing behavior, confirmed
  unchanged) — a pending offline write arriving afterward targets a
  draft path that no longer exists; see §10's REJECT branch and §21's
  migration note for the exact edge case.

---

## §15 — Data Model

**Existing documents that remain, unchanged in shape:**

- `businesses/{id}/stockCountDrafts/periodic` (meta)
- `businesses/{id}/stockCountDrafts/periodic/items/{rowKey}`
- `businesses/{id}/stockCounts/{id}`

**New fields/documents required:**

| Field/Document | Purpose | Writer | Reader | Authoritative/Derived | Lifecycle | Backward-compatible |
|---|---|---|---|---|---|---|
| `contagemAuthority/current` (new doc) | Current delegated Editor identity | Owner/Admin only | Any business member | Authoritative | Created on first delegation; overwritten on reassignment; never deleted (absence = no delegate) | Yes — `exists()`-guarded reads default to "no delegate" |
| `items/{rowKey}.rev` | Optimistic-concurrency counter | The writing editor (rules-enforced monotonic) | All | Authoritative | Starts at 1 on first write; increments on every accepted write or resolution | Yes — absent = 0 |
| `items/{rowKey}.state` | `'ACCEPTED'` \| `'CONFLICT'` | Same as `rev` | All | Authoritative | Flips to `CONFLICT` on detected collision; back to `ACCEPTED` on resolution | Yes — absent = `'ACCEPTED'` |
| `items/{rowKey}.lastWriterUid/Role/At` | Audit of last accepted write | Same as `rev` | All | Authoritative | Overwritten each accepted write | Yes — absent = unknown/legacy |
| `items/{rowKey}.conflict` | Preserved dual observations + resolution record | Writer on collision; resolver on resolution | All | Authoritative | Created on collision; `resolved*` fields added on resolution; never deleted | Yes — absent = never conflicted |
| `stockCountDrafts/periodic.openConflictCount` | Finalization precondition counter | Same transaction as any `state` transition | All | Derived (from row states) but authoritative for the precondition check itself | Incremented/decremented transactionally; must reach 0 for finalization | Yes — absent = 0 |

No existing field's meaning, type, or writer changes. No duplication of
data already stored elsewhere is introduced beyond the one
denormalized counter, which exists specifically because Firestore
rules cannot cheaply aggregate.

---

## §16 — Firestore Security Design

| Operation | Owner/Admin | Delegated Editor | Viewer | Former Delegate | Unauthorized |
|---|---|---|---|---|---|
| Read active draft (meta) | ✅ | ✅ | ✅ | ❌ (fails `isMemberOf` if also no longer a member; otherwise reads as Viewer) | ❌ |
| Read rows | ✅ | ✅ | ✅ | same as above | ❌ |
| Write own observation (ordinary row write) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Resolve conflict | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign delegate (`contagemAuthority/current`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finalize | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modify finalized result | ❌ (narrowed, §14) | ❌ | ❌ | ❌ | ❌ |

**Enforcement mechanism per column:**

- **Owner/Admin:** `isOwnerOf(businessId)`, unchanged, existing.
- **Delegated Editor:** `isCurrentDelegatedEditor(businessId)` (§5) —
  a **live** read of `contagemAuthority/current` on every single
  request; never a cached claim, never trusted from a prior request.
- **Viewer:** the absence of `isActiveContagemEditor(businessId)`
  combined with the presence of `isMemberOf(businessId)` — read-only by
  construction, not by a separate "Viewer" flag anywhere.
- **Former Delegate:** identical rule evaluation to any other
  non-delegate — the moment `contagemAuthority/current` no longer names
  them, they are indistinguishable from a Viewer (or from
  "Unauthorized," if their underlying business membership was also
  revoked) at the very next request.
- **Unauthorized:** fails `isMemberOf(businessId)` outright, the same
  base gate every other collection in this file already uses.

**Special attention points, addressed above:** current authority is
never cached (§5); business membership is re-checked live on every
request via the existing `isMemberOf` (unchanged); offline-queued
writes are evaluated against current, not queued-time, state (§10);
finalizer restriction is Decision 53's existing, unmodified
`isOwnerOf` gate on `stockCounts` create, now composed with the new
`openConflictCount == 0` clause (§11).

---

## §17 — Performance

- Every new rule check (`isCurrentDelegatedEditor`,
  `openConflictCount` lookup) is a single additional `get()` on a
  small, fixed-id document — O(1), not a query, not a scan, matching
  this file's own existing `isBusinessSuspended`/`hasSubscription`
  cost profile.
- No new cross-business or cross-Contagem read is introduced anywhere
  in this design — every check resolves within the active business and
  the active Contagem's own meta/items documents.
- The conflict mechanism adds at most one extra document read (inside
  the client's own `runTransaction`) per row write — the same
  transaction already needed to detect a genuine collision at all; no
  redundant round trip is introduced beyond what correctness requires.
- No event-sourcing, no CRDT, no historical-dataset read — rejected
  explicitly in §7/§8 for exactly this reason.

---

## §18 — Failure-Injection Design

For each test: **Setup / Action / Expected result / Security
expectation / Data-integrity expectation.**

1. **Two devices edit different rows.** Setup: Owner on row A, delegate
   on row B, both `rev: 0`. Action: both save concurrently. Expected:
   both writes succeed independently (`rev: 1` each), no interaction.
   Security: each write validated only against its own row's `rev`.
   Data integrity: both observations durable, no conflict.
2. **Two devices edit same row simultaneously.** Setup: both read
   `rev: 1`, `quantity: 12`. Action: Owner writes `15`, delegate writes
   `20`, near-simultaneously. Expected: whichever transaction commits
   first sets `rev: 2, quantity: 15`; the second's transaction re-reads,
   sees `rev` mismatch and a differing value, writes `CONFLICT` instead
   of overwriting. Security: rules accept the first write (`rev+1`),
   and separately accept the conflict-branch write (distinct rule
   branch) for the second. Data integrity: both `12`'s successor values
   (`15` and `20`) preserved in `conflict`; no value silently lost.
3. **Owner/Admin + delegate edit simultaneously (general case).**
   Covered by tests 1–2 for same-row and different-row respectively.
4. **Offline edit + reconnect, no interceding change.** Setup: edit
   made offline, `baseRev` unchanged remotely. Action: reconnect.
   Expected: write applies normally, `rev+1`. Security: passes rules
   unchanged. Data integrity: observation durable exactly as entered.
5. **Delegate revoked while offline.** Setup: delegate edits offline;
   Owner reassigns/clears the delegate slot while the delegate is
   offline. Action: delegate reconnects, queued write flushes. Expected:
   write **rejected** — `isCurrentDelegatedEditor` now fails. Security:
   enforced live, at flush time, per §5/§10. Data integrity: the
   rejected write is never persisted; the operator is informed
   locally; no durable server state is touched.
6. **Delegate reassigned (A→B) while A offline.** Same mechanism as
   test 5 — A's queued write fails the live authority check the moment
   it reaches the server, regardless of when it was queued.
7. **A→B→C while A offline.** Same as above; only the *current*
   `contagemAuthority/current` value matters at write-acceptance time,
   never any intermediate history.
8. **Two finalization attempts (same submissionId, retried).** Setup:
   network drop after a successful commit, client retries with the
   same `submissionId`. Expected: second attempt lands on the same
   deterministic id, classified as an idempotent `update`, succeeds
   as a no-op in effect. Security: unchanged existing mechanism (§11).
   Data integrity: exactly one logical finalized result.
9. **Pending write races finalization.** Setup: Device A has a queued
   offline row write; Device B finalizes first. Action: A reconnects.
   Expected: A's write targets a draft path that no longer exists
   (deleted atomically with finalization) — write fails/no-ops against
   an absent document; A's UI must treat this as "already finalized,"
   never resurrect the draft. Security: draft `items` rules require
   the draft to exist in a state consistent with an active,
   non-finalized Contagem (an implementation-level check named for
   Technical Design, not newly invented here — same family as the
   existing "already-finalized" guards this codebase uses elsewhere,
   e.g. Void & Redo's own predecessor-existence checks). Data
   integrity: the finalized result is untouched; A's pending edit is
   never silently applied post-finalization.
10. **Browser refresh.** Setup: unsaved local keystroke on one row.
    Expected: existing per-row 800ms autosave/pagehide-flush behavior
    (Decision 38–41, unmodified) still applies — this design adds
    fields to the same documents that mechanism already writes,
    changing nothing about *when* a write happens, only what a write
    means once it lands.
11. **Browser crash.** Same as refresh — durability already comes from
    Firestore's own persistent local cache plus the existing flush
    discipline, unaffected by this design.
12. **Device shutdown.** Same as crash.
13. **Logout with pending writes.** Expected: existing pre-logout flush
    discipline (if any) completes first; §12's cache-clear happens
    only after listeners are torn down, never mid-write.
14. **User A logout → User B login, same browser.** Expected, per §12:
    no document from A's session is readable by B afterward — verified
    against whichever of §12's two safe designs the named SDK
    verification selects.
15. **Business A → Business B, same user.** Expected, per §12: no
    document from Business A's Contagem is readable once switched to
    Business B, at minimum for any read that reaches the server; cache-
    only leakage is exactly the item §12 names as needing verification.
16. **Viewer attempts direct write.** Expected: rejected — fails
    `isActiveContagemEditor`. Security: enforced by rules, not UI.
    Data integrity: no partial state change.
17. **Delegate attempts finalization.** Expected: rejected — `isOwnerOf`
    required on `stockCounts` create, unchanged from Decision 53.
18. **Former delegate attempts write.** Same mechanism as test 5.
19. **Already-finalized Contagem mutation attempt.** Expected: rejected
    by §14's narrowed `update: if false`; a delete attempt outside the
    legitimate "Clear All Data" path is likewise rejected once §14's
    open question is resolved one way or the other.
20. **Reconnect with stale local state (row changed by someone else
    while offline, no actual value disagreement).** Expected: silent
    adopt per §7's "same value, different rev" branch — no conflict
    surfaced for a non-disagreement.
21. **Conflict resolution by Owner/Admin.** Expected: succeeds per §9;
    `state` returns to `ACCEPTED`; `openConflictCount` decrements.
22. **Conflict resolution by delegated Editor.** Same as 21 — symmetric
    authority, per Decision 55 §5 item 4/§6 item 4.
23. **Viewer attempts conflict resolution.** Expected: rejected — same
    `isActiveContagemEditor` gate as test 16.
24. **Finalization attempted with unresolved conflict.** Expected:
    `create` rejected outright by the `openConflictCount == 0` clause
    (§11); neither preserved observation is touched by the rejected
    attempt.

---

## §19 — Technical Risks / Trade-offs

- **Denormalized counter drift risk:** `openConflictCount` is only as
  correct as every code path that touches `state` remembering to update
  it in the same transaction. Mitigated by keeping the counter's only
  writers to exactly two call sites (§7's collision branch, §9's
  resolution branch), both already inside a `runTransaction` for other
  reasons — but this is a genuine discipline requirement, not a
  structurally impossible-to-violate guarantee, and should be covered
  by a dedicated consistency test (e.g. "sum of `state=='CONFLICT'` rows
  always equals `openConflictCount`") in the eventual test suite.
- **Firestore transaction limitations:** `runTransaction` re-runs its
  callback on contention; a row with genuinely frequent simultaneous
  writes could retry more than once. Acceptable for this feature's
  actual concurrency level (at most two simultaneous writers per
  business, per Decision 46).
- **Rules cannot themselves branch into "write a conflict instead"** —
  this is why the transaction, not the rule, decides collision vs.
  stale-retry; the rule only ever validates whichever shape the client
  already decided to attempt. A client that skips the transaction
  entirely and attempts a raw `rev+1` write when it shouldn't would
  still be caught by the plain monotonic-rev rule (it would simply be
  rejected as a stale write, never silently accepted), so the
  worst case of an uncooperative client is "write rejected," never
  "silent data loss."
- **Offline limitations:** a device offline long enough to miss
  multiple intervening writes only ever sees the *current* server
  state at reconnect time, never the intermediate history — this is
  correct per Decision 47/55 (only the latest durable state and any
  still-open conflict matter), but means a very old queued write could
  appear to "lose" against a value that itself was later superseded
  again; this is inherent to any revision-based scheme, not specific
  to this design, and does not violate any accepted requirement (no
  durable observation is discarded — it is preserved as one side of a
  conflict if it genuinely disagrees with current state).
- **Cache limitations:** §12's open factual question is the single
  largest unresolved technical risk in this document — Decision 51's
  guarantee cannot be fully closed out until it is answered
  experimentally.
- **Rules limitations:** the finalization precondition's `get()` on the
  meta document adds one read to every finalization attempt — trivial
  in cost, but worth naming as a rules-execution-count increase for
  completeness.
- **Migration/backward compatibility:** covered in §21.

---

## §20 — Implementation Sequence

1. **Authority foundation** — `contagemAuthority/current` document +
   `isCurrentDelegatedEditor`/`isActiveContagemEditor` rules helpers.
   First, because every other rule change in this design depends on
   these helpers existing.
2. **Data model** — additive fields on `PeriodicStockDraftItem`
   (`rev`, `state`, `lastWriterUid/Role/At`, `conflict`) and on the meta
   document (`openConflictCount`). Second, because the rules in step 3
   reference these field names.
3. **Security rules** — widen `stockCountDrafts` read to `isMemberOf`;
   change write rules to `isActiveContagemEditor` with the `rev+1`
   precondition; add the conflict-transition and resolution rule
   branches; add the `openConflictCount == 0` finalization precondition;
   narrow `stockCounts` non-`initial` `update` per §14. Third, because
   this is the authoritative enforcement layer every client behavior
   below must be checked against, not the other way around.
4. **Concurrency (client transaction logic)** — the `runTransaction`
   write path replacing today's plain `setDoc`. Fourth, so it is built
   directly against already-final rules rather than against rules that
   might still change underneath it.
5. **Conflict state (client rendering)** — surfacing `state ==
   'CONFLICT'` and both observations in `PeriodicStockCountView.tsx`.
6. **Live synchronization** — the per-row adoption/protection logic
   (§6), built once conflict state exists to reconcile into.
7. **Offline/reconnect** — verifying the existing autosave/flush
   mechanism composes correctly with the new transaction-based writes
   (largely a testing/verification step, not new mechanism, since the
   durability layer itself is unchanged).
8. **Finalization** — wiring the UI's finalization action to surface a
   clear rejection message when `openConflictCount > 0`, and resolving
   §14's open delete-path question before shipping the narrowed
   `update` rule.
9. **Cache isolation** — `logout()`/`switchShop()` changes, gated on
   the §12 factual verification being completed first (this step
   cannot be finalized before that verification, by construction).
10. **Tests** — the full §18 failure-injection suite, run last against
    the fully wired system, though individual unit tests for the
    transaction logic and rules should accompany steps 3–4 as they are
    built, not deferred entirely to the end.

Reordering note: step 9 (cache isolation) is placed late deliberately
— it is the one step whose design depends on external verification
this document cannot itself perform, so it should not block steps 1–8,
all of which are fully specified and independent of that outcome.

---

## §21 — Backward Compatibility / Migration

- **Existing periodic drafts** (rows without `rev`/`state`/`conflict`):
  read as `rev: 0, state: 'ACCEPTED'` by default-on-read, per §8/§15 —
  no migration write is required; the very next save on any such row
  naturally brings it up to the new shape (`rev: 1`) as a side effect
  of ordinary use.
- **Existing finalized periodic `stockCounts` documents:** entirely
  unaffected — no field on `StockCount` changes; §14's rule narrowing
  applies to future write *attempts*, not to any stored data.
- **No default `contagemAuthority/current` document is required** for
  a business that has never used delegation — `exists()`-guarded reads
  throughout this design already treat its absence as "no delegate,"
  matching this file's own established absent-document-means-default
  convention (e.g. `isBusinessSuspended`).
- **No cleanup of old data is required or proposed** — this design
  adds fields and one new small document; it removes nothing existing
  ever stored.
- **The one genuine migration-adjacent question** is §14's delete-path
  reconciliation (Clear All Data vs. finalized-result immutability) —
  this is a decision to make before shipping the rule change, not a
  data migration in the traditional sense.

---

## §22 — Remaining Questions

### Product Architect decision required

- **§14 — Clear All Data vs. finalized-result immutability.** Does
  Decision 55/Finding G's post-finalization immutability requirement
  extend to the existing wholesale "Clear All Data" reset capability,
  or is that capability governed by a separate, already-accepted
  authorization this decision does not touch? The accepted decisions
  do not currently answer this — it is a genuine gap between an
  already-shipped capability and a newly-load-bearing requirement, not
  something this design can responsibly decide unilaterally.

### Technical design choices (resolved above, restated for visibility)

- Conflict detection scoped to `quantity` only, not `unit`/prices
  (§8) — an engineering scoping choice within Decision 55's own
  scenario, not a narrowing of its requirements; extendable later
  without a governance change.
- Conflict fields embedded on the row document rather than a separate
  subcollection (§8) — chosen for the smallest mechanism satisfying
  "only fields genuinely necessary."
- Resolution restricted to selecting one of the two preserved values,
  never a third typed value (§9) — a reading of Decision 55 §6 item 6's
  own explicit non-assumption about recounts, not a resolution of that
  open question, which remains genuinely open per that same item.

### Factual verification required

- **§12 — Firestore persistent-cache behavior across auth/business
  context changes**, specifically: does a freshly-created listener/read
  ever serve a document cached under a prior `request.auth` context
  before a server round-trip re-validates it, or does every fresh
  subscription force that validation first? This determines whether
  `switchShop()` needs the same clear-and-reinitialize treatment as
  `logout()`, or whether listener re-subscription alone already
  suffices for the business-switch case. Must be verified against the
  actual Firestore JS SDK documentation/behavior before implementation,
  not assumed in either direction.

---

## §23 — Acceptance Criteria (Self-Check Against §24 of the Task)

- **Data integrity:** no legitimate observation is silently lost (§7,
  §8 — collisions preserve both sides); no blind last-write-wins (§7's
  rules-enforced `rev` precondition replaces today's plain `setDoc`);
  conflicts are preserved (§8, retained even after resolution); stale
  writes cannot overwrite newer state (§7/§10's rules-enforced
  precondition).
- **Authority:** Owner/Admin retains authority (§5, inherent, unstored);
  exactly one delegated Editor (§5, structural — one field); delegation
  is explicit (§5, Owner-only write); revocation works (§5/§10, live
  re-read on every request); reconnect cannot restore revoked authority
  (§10, tests 5–7).
- **Viewer:** live read access (§13, widened to `isMemberOf`); no
  authoritative write access (§13, `isActiveContagemEditor` gate).
- **Finalization:** Owner/Admin only (§11, unchanged `isOwnerOf`);
  unresolved conflicts block finalization (§11,
  `openConflictCount == 0`); exactly one finalization (§11, existing
  deterministic-id mechanism, unmodified); no draft resurrection (§11,
  §10 test 9); finalized result immutable (§14, with one open
  reconciliation question flagged, not hidden).
- **Security:** business isolation (`isMemberOf`, unchanged); user/
  session isolation (§12, pending factual verification); cache
  isolation (§12, same); stale context cannot become authoritative
  (§5/§10, live-read discipline throughout).
- **Recovery:** durable local observations survive interruptions (§18
  tests 10–13, existing Decision 38–41 mechanism unmodified); recovery
  never bypasses authority or revision checks (§10).
- **Performance:** bounded, O(1) additional checks, no cross-business
  or historical-dataset reads (§17).

---

**TECHNICAL DESIGN COMPLETE — IMPLEMENTATION NOT AUTHORIZED.**

**The next governance gate is review/acceptance of this technical
design, followed by the appropriate Rule 8 reassessment and
Implementation Plan.**
