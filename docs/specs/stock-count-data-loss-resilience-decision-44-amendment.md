# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 44 — Contagem Shared Live Data & No-Silent-Loss Architecture

**Status:** ✅ ACCEPTED AS GOVERNANCE DECISION — REQUIREMENTS ONLY. Technical
mechanism NOT selected. Rule 8 Reassessment REQUIRED before any further
gate. NOT an Implementation Authorization.
**Governing Specification:** `stock-count-data-loss-resilience-specification.md`
**Affected Area:** Periodic Contagem
**Decision Number:** 44
**Decision Authority:** Product Architect
**Accepted by:** SABUSHIMIKE MASCENI, 3 September 2026
**Implementation Status:** NOT AUTHORIZED

---

## Acceptance Note (recorded 3 September 2026)

The Product Architect has accepted Decision 44 **as a set of requirements**,
not as an approved technical solution. Specifically, this acceptance
means the following are now governing product requirements for Periodic
Contagem:

* one business-owned Periodic Contagem state, not isolated per-device or
  per-session copies (§4);
* the same underlying data is presented across a given authorized
  actor's devices (§5);
* sharing among whatever authorized-user tier is subsequently decided
  under §16/Decision 44-A — not all Staff by default, and not inferred
  from this acceptance (§6);
* live synchronization as a requirement, to the extent the existing
  Firestore listener architecture supports it (§7);
* the existing single-device durability mechanisms remain mandatory,
  unweakened (§8);
* no silent data loss for anything that reached durable local or server
  persistence (§9);
* conflicting physical observations are preserved/accounted for, never
  silently discarded (§10);
* stale-write protection against an offline/stale client overwriting
  newer authoritative state (§11);
* no reliance on blind Firestore last-write-wins where it could silently
  destroy a valid observation (§12);
* cross-device finalization protection — no duplicate finalization, no
  draft resurrection, no active-edit loss, no post-finalization mutation
  (§13);
* conflict-safe offline/reconnect behavior (§14);
* tenant isolation and shared-device/logout isolation are preserved, not
  weakened, by any of the above (§15, §17);
* recovery after realistic interruption remains guaranteed (§20);
* a Rule 8 Reassessment is required before any Implementation Plan or
  Implementation Authorization (§23, §26).

This acceptance explicitly does **not** select, approve, or pre-commit
to: a specific conflict-resolution mechanism (optimistic versioning,
transactions, conflict records, or otherwise — Decision 44-B); a Staff
authorization tier (Decision 44-A); a conflict UI (Decision 44-C); a
cross-device finalization guard mechanism (Decision 44-D); the exact
live-adoption behavior (Decision 44-E); a shared-device cache-isolation
mechanism (Decision 44-F); or whether Initial Stock Count receives an
equivalent treatment (Decision 44-G). All seven remain open Product
Architect decisions, to be resolved via Rule 8 findings, per §27.

No code, `firestore.rules`, or other implementation artifact is
authorized by this acceptance.

---

# 1. Purpose

This Specification Amendment establishes the Product Architect's intended behavior for **Periodic Contagem when the same business is accessed from multiple authorized users, devices, or browser sessions**.

The existing Contagem Data-Loss Resilience specification established strong protection against single-device interruption, including durable Firestore drafts, offline persistence, interruption flushing, draft recovery, and finalization idempotency.

A subsequent investigation established that the current architecture already provides:

* business-scoped draft storage;
* Firestore live listeners;
* durable local persistence;
* offline synchronization;
* interruption protection;
* non-destructive remote-update notification.

However, the investigation also identified that the existing specification explicitly excluded concurrent multi-user editing and that the current per-row draft write path can silently apply a stale or concurrent value using normal Firestore last-write-wins semantics.

Decision 44 therefore establishes the required direction for **shared, live, conflict-safe Periodic Contagem**.

---

# 2. Scope

This amendment applies to:

> **Periodic Contagem**

It governs the unfinished/draft Contagem state before final confirmation and its transition into the finalized `stockCounts` record.

This amendment does **not automatically amend Initial Stock Count / Capital Inicial**.

Any equivalent change to Initial Stock Count must be separately evaluated and formally decided unless an existing governing artifact already establishes that it must follow the same mechanism.

---

# 3. Superseded Assumption

The existing specification contains an assumption that:

> Periodic Contagem does not need to support concurrent multi-user editing of the same periodic count.

Decision 44 supersedes that assumption.

The new requirement is:

> **A Periodic Contagem is business-owned shared work and may be accessed by multiple authorized users and devices belonging to the same business.**

This does not mean that unlimited unrestricted collaborative editing is automatically authorized.

It means the underlying Contagem state must no longer be architecturally treated as belonging exclusively to one device, browser session, or individual operator.

---

# 4. Business-Owned Contagem

The authoritative unfinished Periodic Contagem state shall be associated with the **business**, not with:

* a device;
* a browser;
* a browser tab;
* a session;
* an individual operator.

The existing business-scoped Firestore draft topology should be preserved where technically compatible.

The system must maintain the conceptual invariant:

> **One active Periodic Contagem state for the business, rather than independent copies of the same Contagem per device or operator.**

---

# 5. Same User — Multiple Devices

An authorized user accessing the same business from multiple devices shall work against the same Contagem state.

Example:

Device A:

`Produto X = 20`

Device B, when synchronized, must receive the authoritative state containing that change.

Likewise:

Device B:

`Produto X = 25`

Device A must receive the newer authoritative state.

The system must not intentionally maintain separate device-specific versions of the business's active Contagem.

---

# 6. Multiple Authorized Users — Same Business

Authorized users permitted by the business's Contagem access policy shall operate against the same business-owned Contagem.

Example:

Operator A enters:

`Produto X = 20`

Operator B must be able to observe and continue from the same authoritative Contagem state.

Operator B entering another product must not create an isolated Contagem.

The authorization tier for Staff access is **not determined by this amendment alone** and remains a Product Architect decision addressed in §16.

No implementation may expand access merely by inference from this amendment.

---

# 7. Live Synchronization

The system shall provide live synchronization of authoritative Contagem changes across active authorized sessions to the extent technically supported by the existing Firestore architecture.

The intended behavior is:

```text
Device A
   ↓
Authoritative Contagem
   ↓
Device B
Device C
```

Polling should not be introduced where the existing Firestore listener architecture already provides appropriate live delivery.

The system must not silently replace an operator's currently edited local working state with a remote update merely because a snapshot arrived.

The implementation must preserve operator-entered data while providing a safe mechanism for incorporating authoritative remote changes.

The exact user-facing live-update/merge behavior remains subject to the conflict-resolution decision in §10 and Rule 8 assessment.

---

# 8. Durable Local Persistence Remains Mandatory

Decision 44 does not replace or weaken the existing Contagem durability mechanisms.

The following remain required:

* durable local Firestore persistence where supported;
* incremental draft persistence;
* bounded autosave;
* interruption-triggered flush;
* offline queueing;
* draft recovery;
* classified retry behavior;
* finalization idempotency;
* protection against stale local timers resurrecting finalized drafts.

The objective is to **extend** resilience from single-device interruption into multi-device synchronization, not to replace the existing resilience architecture.

---

# 9. No Silent Data Loss

The governing invariant is:

> **No valid operator-entered Contagem value that has reached durable local or server persistence may be silently discarded, rendered unrecoverable, or silently destroyed by a later synchronization event, stale client, concurrent operator, device failure, browser failure, network interruption, or finalization race.**

This does not require mathematically preserving every transient keystroke that has never reached any durable persistence mechanism.

The system must nevertheless minimize the volatile window using the existing durability architecture.

---

# 10. Concurrent Conflicting Observations

A Contagem quantity represents a **physical stock observation**.

Therefore, if two authorized operators independently produce different observations for the same product, those values must not be mathematically merged as though they were additive quantities.

Example:

Operator A:

`Produto X = 20`

Operator B:

`Produto X = 25`

The system must not silently discard one observation.

The final working quantity may ultimately need to be one value, but:

> **The superseded/conflicting observation must remain recoverable or otherwise be explicitly accounted for.**

A simple silent last-write-wins implementation is therefore **not sufficient by itself** to satisfy this amendment.

---

# 11. Stale Client Protection

A client that has been offline or otherwise stale must not silently overwrite a newer authoritative server value merely because its queued write arrives later.

Example:

```text
Server:
Produto X = 25

Stale Device:
previously observed Produto X = 20

Stale Device reconnects
```

The stale device must not blindly replace `25` with `20`.

The implementation must use an appropriate concurrency/version/conflict mechanism capable of detecting this condition.

The exact mechanism is intentionally not prescribed here.

Candidates may include:

* optimistic version checking;
* compare-and-set;
* transactions;
* per-row revision;
* explicit conflict records;
* append-only change history;
* another architecture demonstrated to satisfy the invariant.

Rule 8 shall evaluate the selected mechanism.

---

# 12. No Blind Last-Write-Wins

Normal Firestore last-write-wins behavior must not be relied upon as the sole conflict-resolution mechanism where it can silently destroy a valid operator observation.

The implementation must explicitly address:

* simultaneous edits;
* stale offline edits;
* delayed writes;
* reconnect ordering;
* multi-tab writes;
* multi-device writes.

The system must either:

1. prevent the conflicting overwrite; or
2. detect and preserve the conflict before selecting the authoritative working value.

---

# 13. Finalization Integrity

Finalization is a critical boundary.

The system must prevent:

### A. Duplicate finalization

Two independent devices must not be able to successfully finalize the same logical Periodic Contagem as two separate `stockCounts` merely because they generated different `submissionId` values.

### B. Draft resurrection

A pending write from Device A must not recreate a draft that Device B has already finalized and deleted.

### C. Active-edit loss

Finalization by one device must not silently destroy valid durable work from another active device.

### D. Post-finalization mutation

A stale device must not modify an already-finalized Contagem through a late draft write.

The existing same-session `submissionId` idempotency mechanism remains valuable but is not, by itself, sufficient to establish cross-device finalization uniqueness.

A cross-device finalization guard or equivalent mechanism must therefore be evaluated.

---

# 14. Offline and Reconnection

Offline operation remains supported.

The intended model is:

```text
Operator input
      ↓
Durable local state
      ↓
Offline queue
      ↓
Reconnect
      ↓
Conflict detection
      ↓
Authoritative business state
      ↓
All authorized active sessions
```

When multiple devices independently edit while offline, the system must not silently destroy one device's valid observation merely because another device reconnects first or last.

Every such conflict must follow the adopted conflict-resolution mechanism.

---

# 15. Shared Device / Logout Isolation

Supporting business-shared Contagem does not weaken user isolation.

The system must ensure that persistent browser/device cache cannot cause one authenticated user to gain unauthorized access to another user's data.

In particular, the following scenario must be investigated:

```text
Operator A
→ logs in
→ works on Contagem
→ logs out

Operator B
→ logs into same browser/device
```

The system must not expose Operator A's protected information to B merely because Firestore persistent local caching survives logout.

The implementation must determine the correct interaction between:

* Firestore local persistence;
* authentication state;
* listener attachment;
* server authorization;
* business switching;
* logout;
* login as another user.

No cache-clearing behavior is authorized by this amendment until its effect on offline recovery and multi-device durability is understood.

---

# 16. Staff Authorization Decision

The current implementation restricts `stockCountDrafts` access to the Owner.

Decision 44 establishes the requirement for shared authorized-user Contagem, but does **not** unilaterally select the Staff authorization tier.

The Product Architect must explicitly decide whether Periodic Contagem draft access is granted to:

### Option A

All authorized Staff.

### Option B

Only Staff with a defined elevated tier such as `manager`.

### Option C

Another existing authorization category.

The selected tier must preserve tenant isolation and existing business authorization principles.

No implementation may infer Staff access from the shared-data requirement alone.

---

# 17. Authoritative State

Before finalization:

> The business-owned Periodic Contagem draft represents the current unfinished Contagem state.

After finalization:

> The finalized `stockCounts` record represents the committed business-visible Contagem result.

The system must establish a deterministic method for determining the authoritative current value when:

* local cache differs from server;
* two devices edit concurrently;
* an offline client reconnects;
* a stale client attempts to write;
* finalization occurs concurrently.

"Whichever Firestore write arrived last" is not an acceptable architectural definition where it silently destroys a valid competing observation.

---

# 18. Conflict Visibility

When a conflict occurs, the system must not silently hide the fact that two valid observations disagreed.

The implementation should provide sufficient information for the affected operator and/or authorized business user to understand that:

* another device/operator changed the same product;
* their local value differed;
* a conflict occurred;
* which value is currently authoritative;
* what happened to their conflicting value.

The exact UI presentation is subject to implementation and Rule 8 assessment.

A full collaborative editing UI is not automatically required.

---

# 19. Multi-Tab Behavior

Firestore's `persistentMultipleTabManager` shall continue to provide local-cache coordination.

It must not be treated as proof of application-level collaborative editing.

The implementation must explicitly account for:

* two tabs editing the same row;
* two tabs editing different rows;
* one tab finalizing while another edits;
* stale tab state;
* independent finalization attempts.

---

# 20. Recovery

A recoverable unfinished Contagem must remain recoverable after:

* browser refresh;
* navigation;
* browser close;
* browser crash;
* device shutdown;
* battery death;
* network interruption;
* prolonged offline operation;
* authentication/session interruption where authorized recovery remains valid.

Recovery must prefer authoritative current state and must not silently replace a newer state with stale local state.

---

# 21. Auditability of Conflicts

The selected implementation must preserve enough information to demonstrate that a conflict occurred whenever a valid operator observation is rejected, superseded, or otherwise not selected as the current value.

The minimum mechanism may be:

* an explicit conflict record;
* a versioned previous value;
* an edit history;
* another durable mechanism.

A full audit/event-sourcing architecture is **not mandated** unless Rule 8 demonstrates that it is necessary.

---

# 22. Performance and Cost

The solution must remain appropriate for real SABUSH BPT Contagem workloads, including:

* 100 products;
* 300+ products;
* 500+ products.

The architecture should minimize:

* unnecessary Firestore reads;
* unnecessary Firestore writes;
* battery consumption;
* network traffic;
* excessive listener load;
* UI latency.

However:

> **Cost or performance optimization must not be achieved by silently sacrificing the no-silent-data-loss invariant.**

---

# 23. Required Rule 8 Assessment

Decision 44 requires a new Rule 8 assessment before implementation.

The Rule 8 assessment must evaluate at minimum:

1. Tenant isolation.
2. Staff authorization.
3. Multi-device synchronization.
4. Multi-user synchronization.
5. Offline/reconnect behavior.
6. Stale-client protection.
7. Concurrent same-row edits.
8. Conflict preservation.
9. Cross-device finalization.
10. Duplicate finalization.
11. Draft resurrection.
12. Post-finalization writes.
13. Logout/shared-device isolation.
14. Firestore security rules.
15. Performance and Firestore cost.
16. 300+ product scale.
17. Recovery behavior.
18. Regression risk to existing Contagem durability.
19. Initial Stock Count separation.
20. Real-device verification requirements.

---

# 24. Required Acceptance Invariants

Before implementation authorization, the Rule 8 artifact must be able to demonstrate that the proposed implementation satisfies:

### INV-44-01 — Business Ownership

There is one business-owned Periodic Contagem state rather than isolated device/session copies.

### INV-44-02 — Authorized Sharing

Every user permitted by the decided authorization tier accesses the same business Contagem.

### INV-44-03 — Live Synchronization

Authoritative changes propagate to active authorized sessions without requiring manual page reload as the only synchronization mechanism.

### INV-44-04 — Durable Local Protection

Existing durable local persistence remains intact.

### INV-44-05 — Offline Protection

Offline operation does not make previously durable local data unrecoverable.

### INV-44-06 — Stale Write Protection

A stale client cannot silently overwrite newer authoritative state.

### INV-44-07 — Conflict Preservation

A conflicting valid observation cannot disappear silently.

### INV-44-08 — Finalization Uniqueness

One logical Periodic Contagem cannot produce multiple finalized `stockCounts` through independent device finalizations.

### INV-44-09 — No Draft Resurrection

Finalization cannot be undone by a late autosave from another device.

### INV-44-10 — Post-Finalization Integrity

A stale client cannot mutate finalized Contagem through a late draft write.

### INV-44-11 — Tenant Isolation

No user can read or modify another business's Contagem.

### INV-44-12 — Logout Isolation

Persistent local cache cannot expose protected Contagem data to a subsequently authenticated unauthorized user.

### INV-44-13 — Recovery

Recoverable unfinished work remains recoverable after realistic interruption.

### INV-44-14 — Scale

The mechanism remains viable for large Contagens without requiring one oversized Firestore document.

---

# 25. Explicit Non-Goals

Decision 44 does not authorize:

* redesigning unrelated SABUSH BPT modules;
* replacing Firestore persistence unnecessarily;
* introducing a second local-storage architecture without justification;
* full real-time collaborative document editing;
* arbitrary multi-user permissions;
* additive merging of physical stock observations;
* event sourcing of the entire Contagem system;
* changes to Initial Stock Count without separate authorization;
* weakening tenant isolation;
* implementation before Rule 8;
* implementation before Implementation Authorization.

---

# 26. Governance Sequence

Decision 44 follows the established SABUSH BPT governance model:

```text
Decision 44 Specification Amendment
              ↓
Product Architect Acceptance
              ↓
Rule 8 Reassessment
              ↓
Product Architect Decisions on Rule 8 findings
              ↓
Implementation Plan
              ↓
Implementation Authorization
              ↓
Implementation
              ↓
Verification
```

This document itself does **not** authorize implementation.

---

# 27. Open Product Architect Decisions

The following remain explicitly unresolved until accepted:

### DECISION 44-A — Staff Access

Which existing authorization tier may read/write unfinished Periodic Contagem?

### DECISION 44-B — Conflict Resolution

Which mechanism should protect competing observations?

Candidates include:

* optimistic version checking;
* transactional compare-and-set;
* explicit conflict records;
* versioned history;
* another mechanism justified by Rule 8.

### DECISION 44-C — Conflict UI

How should the operator be informed when their value conflicts with another operator/device?

### DECISION 44-D — Finalization Guard

Which mechanism establishes one logical finalization across independent devices?

### DECISION 44-E — Live Adoption

Should remote authoritative changes:

* automatically update untouched rows;
* require explicit operator adoption;
* show conflicts only;
* or use another controlled behavior?

### DECISION 44-F — Shared-Device Cache Isolation

What mechanism is required to prevent persistent browser cache from exposing one authenticated user's protected Contagem data to another user?

### DECISION 44-G — Initial Stock Count

Should Initial Stock Count remain outside Decision 44, or should an equivalent multi-device/multi-operator model be evaluated separately?

---

# 28. Product Architect Acceptance Boundary

Acceptance of this amendment means:

> **The Product Architect accepts the requirement that Periodic Contagem become a business-owned, multi-device, multi-authorized-user workflow with live synchronization and a strict no-silent-data-loss invariant, subject to the subsequent Rule 8 assessment and resolution of the open decisions above.**

Acceptance does **not** mean:

* the implementation architecture is already approved;
* a specific conflict algorithm is approved;
* Staff access tier is approved;
* code may be changed;
* Firestore rules may be changed;
* implementation is authorized.

Those decisions remain governed gates.

---

# 29. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED (requirements only — see Acceptance Note above)
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 3 September 2026
**RULE 8:** NOT YET PERFORMED — required next gate, per §23/§26
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the requirements in §1–§25 are adopted as
governing product requirements for Periodic Contagem. The technical
mechanism satisfying them (conflict resolution, Staff authorization
tier, finalization guard, conflict UI, live-adoption behavior,
shared-device cache isolation, and Initial Stock Count's own treatment)
is explicitly NOT decided by this acceptance and remains open per §27
(Decisions 44-A through 44-G), to be resolved following the Rule 8
Reassessment.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 3 September 2026

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level product decision
only. Rule 8 Reassessment is the required next governance gate before
any Implementation Plan is drafted or any Implementation Authorization
is considered. This acceptance does not authorize any code, schema, or
Firestore security-rule change.
