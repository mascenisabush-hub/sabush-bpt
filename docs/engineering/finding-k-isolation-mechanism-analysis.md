TECHNICAL ANALYSIS — DESIGN ONLY — NOT IMPLEMENTED — NO CODE, RULES, SCHEMA, OR UI CHANGED

# Finding K — Cache/Session Isolation Mechanism Analysis

**Phase:** Technical mechanism analysis, following the two Finding K
verification passes (empirical harness evidence + direct code
inspection). This document does not implement anything, does not
modify Rule 8, does not create a new Product Architect decision, and
does not authorize implementation.
**Governing baseline (unaltered, not reinterpreted):** Decisions 44,
46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56 — all ✅ ACCEPTED, GOVERNANCE
REQUIREMENTS ONLY.
**Evidence this analysis builds on:** the two prior Finding K
verification reports (this session) — specifically the confirmed facts
that (1) a freshly-attached `onSnapshot` listener serves a cached
document as its first emission (`fromCache: true`) before any server
round-trip, independent of the current session's identity or
authorization, and (2) several existing listeners (`unsubWithdrawals`
and most others) have no role gate on attachment and no state-reset on
a permission error, while the two Contagem draft listeners already
have a partial, post-hoc correction pattern.

---

## A. Problem Statement

Three categorically different things must be told apart, and the
current architecture does not tell them apart anywhere except
partially, in two listeners:

1. **Legitimately shared business state.** Periodic Contagem
   observations, once Decision 46/54's mechanism exists, are meant to
   be visible to *every currently authorized participant* — Owner/Admin
   and the currently delegated Editor. B seeing A's observation here is
   the product working correctly, not a leak.
2. **Unauthorized cached state.** Owner-only or role-restricted data
   (e.g. `withdrawals`) that ends up rendered to a session that is not,
   right now, authorized to see it — confirmed reachable via the
   cache-first `onSnapshot` emission, independent of `firestore.rules`,
   which never gets a chance to act before the local render happens.
3. **Stale/pending writes.** A write queued by one identity/context
   that has not yet reached the server when the identity, business, or
   authority context changes. Its **path** is fixed at creation time
   (cannot silently retarget to a different business), but its
   **transmitted identity** is resolved at send time, not queue time —
   a fact the client does not currently account for anywhere.

The failure mode this analysis must avoid is solving (2)/(3) by means
that also break (1) — e.g., wiping the whole local cache on every
context change would just as readily destroy a legitimately
still-syncing Contagem observation as it would remove a stale
withdrawal record, and would violate Decision 44's no-silent-loss
principle in the process.

---

## B. Current Architecture (as verified, not assumed)

- **Single shared Firestore instance.** `firebase.ts` calls
  `initializeFirestore` exactly once per app load, with
  `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
  There is one IndexedDB-backed store per browser origin, addressed
  purely by (Firestore project, document path) — never by uid, never
  by "current business."
- **`onSnapshot` semantics (confirmed empirically this session).** A
  freshly-attached listener emits whatever is already cached for that
  exact path/query as its first callback invocation
  (`snapshot.metadata.fromCache === true`), synchronously with respect
  to the listener's own attachment — this happens whether or not the
  attaching code has any reason to believe the *current* session is
  authorized to read that path. A second, server-confirmed emission
  follows once/if the network round-trip completes.
- **Authentication reset (`onAuthStateChanged`, confirmed correct).**
  Signing out (`!user`) resets essentially all React state to empty/
  null, including `withdrawals`, `periodicStockDraftMeta`, `business`,
  `products`, etc. This is a real, working boundary — but it is a
  **React-state** boundary, not a **Firestore-cache** boundary; the
  underlying IndexedDB documents are untouched by it.
- **Listener patterns, two tiers observed:**
  - **Tier 1 (most collections, e.g. `withdrawals`, `closings`,
    `payments`, `timelineEvents`):** listener attached unconditionally
    for any signed-in business member, regardless of role; error
    callback is `console.error(...)` only — no state reset on a
    permission-denied response.
  - **Tier 2 (the two Contagem drafts):** listener attached
    unconditionally too, but the error callback branches on `isOwner`
    and resets to a safe value (`null`/`'confirmed-no-draft'`) for a
    non-owner. This is strictly better than Tier 1, but still only
    corrects *after* the cache-first emission has already rendered
    whatever was cached — it does not prevent the exposure window, it
    shortens the time the stale value survives.
- **Business switching (`switchShop`).** Flushes any pending Contagem
  write (awaited, confirmed durable) *before* changing
  `activeBusinessId` — an existing, working "flush before context
  change" discipline this analysis can reuse, not invent. It never
  touches Firestore's cache/persistence layer itself.
- **`firestore.rules`.** Correctly encodes every authorization boundary
  this analysis cares about (`isOwnerOf`, `isMemberOf`) — but rules
  only ever evaluate a request that actually reaches the server. They
  provide zero protection against a local cache-only render, which is
  exactly the gap demonstrated.

**Per-category summary:**

| Category | Currently cached? | Currently read via | Cache-first emission possible? | Authorization known before render? | Cache itself identity/business-scoped? |
|---|---|---|---|---|---|
| 1. Shared Contagem state | Yes (once built) | `onSnapshot` on draft meta/items | Yes | Not today (no gate at all) | No |
| 2. Owner-only state (e.g. `withdrawals`) | Yes | `onSnapshot`, unconditional attach | **Yes — confirmed exploited** | No (Tier 1: never checked before render) | No |
| 3. Role-restricted state generally | Yes | Same pattern as above | Yes | Partial (Tier 2 only, post-hoc) | No |
| 4. Business-specific state | Yes | Path-scoped under `businesses/{id}/...` | Yes, for any previously-cached business path | No | No — but the **path itself** is business-scoped, so cross-business writes cannot silently retarget |
| 5. User/session-specific state (React state, e.g. active page) | No (not Firestore-backed) | React state only | N/A | N/A | Yes — cleared correctly on sign-out |
| 6. Pending offline mutations | Yes (mutation queue, part of the same IndexedDB store) | Firestore's internal sync engine | N/A (not a read) | Identity resolved at **send time**, not queue time | No |

---

## C. Candidate Mechanisms

### Candidate A — Cache lifecycle isolation (`terminate()` + `clearIndexedDbPersistence()`)

- **Mechanism:** unsubscribe all listeners → `terminate(db)` →
  `clearIndexedDbPersistence(db)` → re-`initializeFirestore()`. Verified
  this session: `clearIndexedDbPersistence()` fails with
  `failed-precondition` unless `terminate()` has already been called;
  `terminate()` itself does **not** cancel pending writes — the SDK's
  own documentation states they resume on the next instance start.
- **Strengths:** the only mechanism that produces a genuinely empty
  local store — closes every leak vector in this document at once,
  unconditionally.
- **Weaknesses:** **all-or-nothing.** There is no supported API to
  clear only specific collections/paths — clearing to solve (2)/(3)
  necessarily destroys (1) as well, including any not-yet-synced
  Contagem observation. Requires connectivity (or an accepted
  loss window) to first flush pending writes safely, since
  `clearIndexedDbPersistence()` deletes the mutation queue along with
  cached documents. Cannot run while any listener is still attached,
  so it forces a coordinated teardown/rebuild of the entire listener
  graph — a bigger blast radius than a targeted fix needs.
- **Effect on shared Contagem:** **destructive if run unconditionally**
  — would wipe a legitimately still-offline draft along with everything
  else. Safe only if run *after* a confirmed flush.
- **Effect on offline operation:** actively hostile to it unless
  carefully sequenced — this is the mechanism most likely to violate
  Decision 44's no-silent-loss principle if used naively.
- **Effect on privileged data:** fully effective, but only once it
  actually runs to completion.
- **Effect on business isolation:** fully effective, same caveat.
- **Effect on pending writes:** **destroys them** unless flushed first.
- **Implementation complexity:** moderate (sequencing), but the
  *behavioral* risk is the real cost, not the code size.
- **Risk:** highest of any candidate — a coordination bug here
  (running it before a flush completes, or while offline with no way
  to flush) directly causes silent data loss, which is exactly what
  Decision 44 exists to prevent.

### Candidate B — Authorization-aware listener/rendering

- **Mechanism:** two complementary, non-destructive changes: (i) never
  *attach* a listener for a collection the current session's
  already-known client-side role state (`isOwner`, business
  membership) says it shouldn't be reading in the first place — the
  client already computes `isOwner` before any of these listeners are
  set up, so this is a gate on existing information, not new
  information; (ii) for a **freshly mounted** subscription (new
  listener, not a continuing one), treat its **first, cache-only**
  emission as provisional — do not commit it to rendered state until
  either a server-confirmed emission arrives, or the current session
  is already known (from (i)'s same already-known role/business state)
  to be legitimately entitled to whatever was cached.
- **Strengths:** does not touch the cache's existence at all — nothing
  is deleted, nothing is destroyed, no pending write is at risk.
  Directly targets the exact mechanism demonstrated (a role-blind
  listener attachment plus an unconditional render of a cache-first
  emission). Works identically online or offline, since it never
  depends on reaching a server to provide its guarantee for the
  *unauthorized* case — an unauthorized session's own client-side role
  check already says "don't even ask," independent of connectivity.
- **Weaknesses:** does not, by itself, remove already-cached documents
  from IndexedDB — a sufficiently determined inspection of the raw
  IndexedDB store (outside the app's own UI) could still find them.
  This is a genuine, honestly-acknowledged limitation: it closes the
  *application's own* exposure surface, not the physical storage medium
  itself (only Candidate A does that). Also depends on the client's
  own role/business knowledge being correct and current — if that
  knowledge is itself stale (e.g. a just-revoked Owner who hasn't yet
  received their own profile update), a brief window could remain;
  this composes with, rather than replaces, `firestore.rules` as the
  authoritative backstop.
- **Effect on shared Contagem:** **preserves it fully.** An
  authorized co-editor's subscription is never gated by this mechanism
  — the check is "is this role/business combination entitled to this
  collection at all," which is true for both Owner/Admin and the
  currently delegated Editor on the *same* business's Contagem. Their
  own already-continuing subscriptions are never touched by the
  "freshly mounted" provisional-treatment rule either, since that rule
  only applies at the moment of a new attach (login, business switch,
  role change) — not to an already-live, already-rendering listener.
- **Effect on offline operation:** neutral-to-positive — an
  *authorized* user's own legitimately cached Contagem data is still
  immediately usable offline (their own role check passes
  synchronously, so their own cache-first emission is trusted
  immediately, exactly as today).
- **Effect on privileged data:** **directly closes the demonstrated
  vulnerability** for the ordinary application-UI code path — B's
  session never attaches to `withdrawals` at all if B is not
  Owner/Admin, and even if some other path attaches for a role that
  should have access, a fresh mount from stale cache doesn't render
  until confirmed or self-known-authorized.
- **Effect on business isolation:** same reasoning — the gate is role
  **and** business-membership aware.
- **Effect on pending writes:** does not address them (a different
  problem — see Candidate F).
- **Implementation complexity:** low-to-moderate — extends an existing
  pattern (Tier 2's owner-vs-staff branching) rather than inventing a
  new one; mostly a matter of applying it consistently and moving the
  check earlier (before render) rather than only after an error.
- **Risk:** low — purely additive/defensive; cannot cause data loss,
  since nothing is deleted.

### Candidate C — Separate Firestore instances / persistence namespaces

- **Investigated against `firebase@12.16.0` specifically (the version
  this repository pins).** The web SDK's `persistentLocalCache` is
  configured per **Firestore instance**, which is itself tied to a
  **Firebase App instance** (`initializeApp`) — in principle, a
  *second*, distinctly-named Firebase App with its own
  `initializeFirestore` call would get its own separate IndexedDB
  database (Firestore's persistence layer keys its database name off
  the app's own identity). This is a real SDK capability, not
  something I am assuming.
- **Why this does not fit here:** it would require creating and
  tearing down a distinct Firebase App (and therefore a distinct
  Firestore instance, with its own listener graph) **per user session
  or per business context** — a far larger architectural change than
  "the smallest reliable mechanism" this task asks for, and it does
  nothing by itself to solve the *shared-Contagem-must-still-work*
  requirement, since Owner/Admin and the delegated Editor are
  different *people on different devices* in the normal case, not
  different app instances on the same device needing separate
  namespaces from each other. It would only matter for the
  *same-device, sequential-users* case (K1/K3), and for that case it is
  strictly more complex than Candidate A (which already fully isolates
  the same case by clearing) without adding any capability Candidate A
  lacks.
- **Verdict:** technically real, but not the right tool for this
  problem — rejected as unnecessarily heavy, not because the SDK can't
  do it.

### Candidate D — Explicit application-level cache/context boundaries

- **Mechanism:** maintain an explicit "current authorized context"
  (uid, businessId, role) in application state and consult it before
  trusting any read. This is, in substance, the same idea as Candidate
  B, generalized — Candidate B is this candidate applied specifically
  at the listener-attachment/first-emission boundary, which is the
  exact point the vulnerability was demonstrated.
- **Limits, stated explicitly per the task's own instruction:**
  **Firestore's cache itself is not identity-scoped, and no
  application-level bookkeeping changes that fact.** An
  application-level context boundary can decide *whether to render or
  act on* a piece of cached data — it can never make the underlying
  IndexedDB store itself partitioned. This is exactly why Candidate D
  (and B) are necessary-but-not-sufficient for a determined attacker
  with direct IndexedDB access, and why Candidate A remains the only
  mechanism that achieves physical isolation, at the cost of being
  destructive to (1)/(3) unless carefully sequenced.
- **Effect on shared Contagem / offline / privileged / business /
  pending writes:** identical reasoning to Candidate B, since B is this
  candidate's concrete application in this codebase.

### Candidate E — Data/path architecture

- **Investigated:** does the existing `businesses/{businessId}/...`
  path structure already provide sufficient isolation *scaffolding*
  for the other candidates to use? **Yes.** Every collection this
  analysis is concerned with is already nested under a specific
  `businessId` — there is no collection where Business A's and
  Business B's documents share a path or could be confused for each
  other by path alone. This is why K4 (business isolation) is only a
  **read-side cache** problem, never a **write-target** problem: a
  write's destination path is fixed by construction, and no existing
  path ever lets Business A data be written under Business B's path by
  accident.
- **What is missing, and would need to be added (not decided here,
  since this is architecture, not governance):** no current field
  anywhere records **which identity/session actually populated a given
  cached read** or **which identity a queued write will be transmitted
  under when it finally sends** — this is the gap Candidate F's
  send-time identity handling below depends on being aware of, not a
  gap this analysis proposes to close by adding new persisted fields
  (that would be a schema change, out of scope here).
- **Verdict:** the existing path architecture is **sufficient** as a
  foundation; no path/schema redesign is needed for Candidates A/B/D
  to work. This is a genuine, checked answer, not an assumption.

### Candidate F — Hybrid (recommended; developed in detail in §D)

Combines Candidate B (primary, non-destructive, connectivity-
independent) with a narrow, opportunistic use of Candidate A (best-
effort deep clean, run only when it is safe to do so) and reuses the
existing flush discipline from `switchShop()` for the pending-write
half of the problem. Detailed in §D.

---

## D. Recommended Mechanism

**Primary guarantee — Candidate B, applied consistently:**

1. **Gate listener attachment on already-known role/business
   authorization**, not just Tier 2's post-hoc error handling. The
   client already computes `isOwner` and business membership before
   any of these listeners are created — extend that same check to
   *whether to subscribe at all*, for every role-restricted collection
   (`withdrawals` first, since it is the confirmed, demonstrated case,
   then the same pattern applied to every other Tier-1-style listener
   this session identified).
2. **Treat a freshly-mounted listener's first, cache-only
   (`fromCache: true`) emission as provisional**, not immediately
   authoritative for rendering, unless the current session's own
   already-known role/business state independently confirms it should
   be entitled to that data. This closes the exposure window Tier 2's
   existing pattern still has (correct-after-the-fact is not the same
   as never-exposed).
3. **Extend Tier 2's existing "reset to safe value on permission
   error" pattern to every remaining Tier-1 listener** — a real,
   already-precedented fix, not a new pattern being invented.

**Secondary, defense-in-depth guarantee — a narrow, opportunistic
Candidate A:**

4. **On `logout()`, first attempt the existing `switchShop()`-style
   flush** (await pending Contagem writes' durable confirmation via the
   same readback-confirmed pattern already used elsewhere in this
   codebase). **Only if that flush succeeds**, follow it with
   `terminate()` → `clearIndexedDbPersistence()` → re-initialize, as a
   best-effort deep clean. **If the flush cannot complete (genuinely
   offline at logout time), do not clear** — accept that the
   Candidate-B guarantees above are still in force (an unauthorized
   next user still cannot get privileged data *rendered*, even though
   it may still physically exist in IndexedDB until the next
   successful online logout). This sequencing is the direct answer to
   Candidate A's central weakness: it never risks a pending Contagem
   observation to get a cache wipe.

**Why this combination, and not one alone:** Candidate B alone leaves
the raw IndexedDB store non-empty indefinitely (an honest, acknowledged
residual risk against a sufficiently determined local inspection, not
against the application's own UI). Candidate A alone is unsafe to run
unconditionally (destroys legitimate pending state per Decision 44).
Together, B provides the **immediate, connectivity-independent,
non-destructive guarantee** that actually closes the demonstrated
vulnerability for every normal use of the application, while A runs
**only** when it is safe, as a deeper cleanup — neither one is asked to
do the other's job.

---

## E. Failure Scenarios Under the Recommended Mechanism

1. **A → logout → B.** A's `logout()` attempts a flush; if it
   succeeds, cache is fully cleared (Candidate A branch) — B starts
   from nothing. If the flush cannot complete (offline), the cache is
   left as-is, but Candidate B's gates mean B's own listeners never
   render anything B's role doesn't already independently qualify for
   — B does not receive A's privileged data either way.
2. **A: Business A → Business B.** Same reasoning as (1), scoped to
   business membership instead of role — B's (or A's own, in the
   second business) listeners are gated on membership in the currently
   active business, not merely "was this ever cached."
3. **A's privileged data → B.** Directly the demonstrated case:
   `withdrawals`-style listener is never attached for a non-Owner
   session at all (item 1 of §D) — closes the exact vulnerability the
   second verification pass demonstrated, independent of whether the
   opportunistic cache clear in item 4 ever got to run.
4. **A offline → B.** Candidate B's guarantee is connectivity-
   independent by construction (it is a client-side role check, not a
   server round-trip) — this scenario is covered identically to (1)'s
   offline branch.
5. **A offline pending write → reconnect.** The write's path remains
   fixed (Candidate E's finding); its transmitted identity resolves at
   send time. This mechanism does not yet add anything that changes
   *that* SDK behavior — it is a `firestore.rules`/schema-level
   concern (writer-identity/revision fields, exactly what the Technical
   Design for Decisions 44–55 already proposed), not a cache-isolation
   mechanism question. Flagged, not solved, here — see §F.
6. **A, delegated Editor → revoked → reconnect.** **Not yet testable**
   — no delegated-Editor mechanism exists to revoke. This analysis's
   authorization-aware gating (§D item 1) is written to key off
   "currently known role/business/delegation state," so once Decision
   46/54's mechanism exists, the same pattern extends to it without
   redesign — but this is a forward-compatibility observation, not a
   claim that K6/K7 is verified now.
7. **A and B simultaneously editing shared Contagem.** **Fully
   preserved.** Both are legitimately entitled to the same Contagem
   path by role+business — Candidate B's gate passes for both, their
   listeners are never treated as "freshly mounted and unproven" once
   already live, and nothing in this mechanism introduces any delay,
   gating, or interruption to the live collaborative editing Decision
   46 already establishes. This is the single most important check in
   this whole analysis, and it holds.

---

## F. Verification Plan (what must be experimentally confirmed before Rule 8 can move)

1. **Shared Contagem visibility, once Decision 46/54's mechanism
   exists:** confirm two genuinely distinct authorized sessions (real
   Auth users, real rules) both see each other's live observations with
   the role-gating from §D in place — i.e. confirm the gate never
   introduces a false negative for a legitimately authorized
   co-editor.
2. **Privileged-cache isolation:** repeat this session's `withdrawals`
   experiment against a **real** (or emulated) backend, with the §D
   gating actually implemented, and confirm B's UI never renders A's
   record, not merely that the *listener* wasn't attached.
3. **Business isolation:** same experiment, varied by business
   membership instead of role.
4. **User isolation:** same device, two real distinct Auth identities,
   not simulated labels.
5. **Logout flush-then-clear sequencing:** confirm the opportunistic
   Candidate-A branch never fires while a genuine pending write exists
   unconfirmed, under real network-flakiness conditions, not just the
   clean-success/clean-offline binary this analysis reasoned about.
6. **Business switching:** confirm §D's gating behaves identically to
   the logout case for a same-user business switch.
7. **Offline writes / reconnect:** confirm, against a real backend,
   what `firestore.rules` actually does with a stale-identity write at
   send time (K5's still-open server-side half).
8. **Revoked Editor / reconnect:** deferred until Decision 46/54's own
   mechanism exists — cannot be verified before then.
9. **Finalization interactions:** confirm none of the above gating
   ever interferes with the finalization-time reads Decision 50/55/56
   already require (e.g. the `openConflictCount` precondition read
   proposed in the Technical Design for Decisions 44–55) — this
   mechanism should be role/business-scoped in a way that never blocks
   Owner/Admin's own authorized finalization path.

---

## Required Conclusion

**Question 1 — smallest technically reliable mechanism:**
Authorization-aware listener attachment and provisional-first-emission
rendering (Candidate B), applied consistently across every
role-restricted collection, using information the client already has
before any listener is created — combined with a narrow, opportunistic,
flush-gated use of `terminate()`/`clearIndexedDbPersistence()` on
logout as defense-in-depth, never run unconditionally. This is smaller
and safer than an unconditional cache wipe, and unlike a wipe, it can
never cause data loss.

**Question 2 — how shared Contagem is preserved:**
The gate is a role/business-membership check, not an identity-of-
previous-user check — both Owner/Admin and the currently delegated
Editor pass it for their own shared business's Contagem, exactly as
today, with no added latency or interruption to an already-live
subscription. The mechanism only ever intervenes at the moment of a
*new* listener attachment for a role that should not have access, or
treats a first cache hit as provisional pending confirmation — it never
gates an already-authorized, already-collaborating session.

**Question 3 — what remains to be experimentally verified before Rule
8 can be reassessed:**
Everything in §F above — in particular, real-backend confirmation that
(a) the gating introduces no false negative for legitimate co-editors,
(b) B's UI genuinely never renders A's privileged data once the gate is
implemented, and (c) the logout flush-then-clear sequencing is safe
under real network conditions, not just the two clean cases reasoned
about here. K6/K7 remain not-yet-testable until Decision 46/54's own
delegated-Editor mechanism is built.

---

**THIS IS A TECHNICAL MECHANISM ANALYSIS ONLY — NOT AN IMPLEMENTATION,
NOT A RULE 8 UPDATE, NOT A NEW PRODUCT ARCHITECT DECISION, AND NOT AN
IMPLEMENTATION AUTHORIZATION.**
