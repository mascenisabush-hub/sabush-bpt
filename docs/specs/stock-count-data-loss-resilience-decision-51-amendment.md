# SABUSH BPT — SPECIFICATION AMENDMENT

## Decision 51 — Shared-Device / Cache Isolation Requirements

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 4 September 2026
**Resolves:** Decision 44-F — Shared-Device/Cache Isolation,
as identified in the original [Rule 8 Assessment](../engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
(Part I §P, Part III §III.12, Part IV §IV.K) and carried forward,
**UNVERIFIED — not PASS**, through every subsequent reassessment and
decision (Decisions 45, 46, 47, 48, 49, 50) as "orthogonal to how many
legitimate Editor roles exist" and requiring its own narrow technical
verification.
**Builds on:** [Decision 46](./stock-count-data-loss-resilience-decision-46-amendment.md)
(✅ Accepted, Dual Active Editor Authority), [Decision 48](./stock-count-data-loss-resilience-decision-48-amendment.md)
(✅ Accepted, authority-model governance requirements), [Decision 49](./stock-count-data-loss-resilience-decision-49-amendment.md)
(✅ Accepted, former-Editor reconnection governance requirements), and
[Decision 50](./stock-count-data-loss-resilience-decision-50-amendment.md)
(✅ Accepted, exactly-one finalization governance requirements) — this
decision assumes and does not restate any of their governance content;
it applies to the distinct, previously-unaddressed question of what the
system must guarantee across **business, user/session, and device
context boundaries**, not to ongoing-editing authority, reconnection,
or finalization, which those four decisions already govern.
**Does not reopen:** Decisions 44, 45, 46, 47, 48, 49, or 50's own
already-settled content.
**Affected Area:** Periodic Contagem (and, by the general nature of the
guarantee, any durable local persistence used elsewhere in the
platform, though this decision's scope is limited to Periodic Contagem
per §11 below)
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Purpose

The Rule 8 Assessment (Part I §P, Part III §III.12, Part IV §IV.K) has
repeatedly flagged, across every reassessment, that whether Firestore's
client SDK correctly re-evaluates `firestore.rules` against the
current `request.auth` on every read served from
`persistentLocalCache` — and, more generally, whether locally persisted
Periodic Contagem state can leak across a business, user, or session
boundary on a shared or reused device — remains **UNVERIFIED, not
PASS**. This gap is **independent of the Editor/authority model**
Decisions 46, 48, 49, and 50 govern: it concerns *whose context* a
piece of locally persisted data may correctly be shown or written
under, not *what role* a given authenticated user holds within a
single, already-correct context.

**This decision does not depend on, and does not restate, the
Owner/Admin + delegated Editor authority model, the reconnection
governance requirements, or the finalization-protection
requirements.** A device that is shared across businesses, shared
across users, or reused after logout presents a distinct risk: locally
persisted state surviving into a context it does not belong to. This
decision states the required guarantee against that risk, exhaustively
across the scenarios named below, so that no scenario is left to
inference at the technical design stage.

---

# 2. Business Isolation — Required Guarantee

1. **Locally persisted Periodic Contagem state belonging to Business A
   must never become visible, editable, recoverable, or authoritative
   under Business B's context**, regardless of how the device came to
   hold Business A's data (the same authenticated user having
   previously operated Business A, a different authenticated user
   having done so, or any other route).
2. **This guarantee holds independent of authentication state** — it
   is not sufficient that Business B's context is merely *displayed
   correctly* if Business A's data remains reachable, recoverable, or
   able to be silently applied underneath that display. "Recoverable"
   includes any path — including but not limited to browser storage
   inspection, offline replay, or an interrupted context switch — by
   which Business A's data could resurface as though it belonged to
   Business B.
3. **This decision does not decide how business isolation is
   technically achieved** (storage keying, cleanup, encryption, or any
   other mechanism) — only that cross-business leakage of any kind, in
   any direction, is prohibited as a product outcome.

---

# 3. User/Session Isolation — Required Guarantee

1. **Locally persisted Contagem state associated with one
   authenticated user/session must never become visible or writable
   under a different authenticated user/session on the same physical
   device.** This applies whether the two sessions belong to different
   real people or to the same person re-authenticating — the
   requirement is keyed to session/authentication context, not to
   whether a human observer would consider the two sessions
   "the same person."
2. **A second user authenticating on a device previously used by a
   first user must not be able to read, recover, or unknowingly inherit
   the first user's locally persisted Contagem state**, regardless of
   whether the first user explicitly logged out or the session simply
   ended (browser closed, device locked, token expired, or otherwise).
3. **This guarantee is evaluated at the point of read/display/write,
   not merely at the point of storage** — even if data was legitimately
   persisted under the first user's session, it must not be servable
   to, or actionable by, the second user's session.

---

# 4. Logout — Required Guarantee

1. **When a user logs out, locally persisted Contagem state associated
   with that session/context must no longer be visible, editable, or
   recoverable to whatever comes next on that device** — the next
   authenticated user (§3), a different business context for the same
   user (§5), or an unauthenticated state.
2. **The next authenticated user must not be able to see the logged-out
   user's locally persisted Contagem state.**
3. **The logged-out user's locally persisted state must not be
   accidentally written, applied, or attributed under the next user's
   authority.** A write that originated under the logged-out user's
   session must never land as though the next user made it.
4. **Pending/offline writes that had not yet become durable/
   authoritative at the moment of logout must not silently become
   authoritative after logout, under the logged-out user's own later
   re-authentication or under any other user's session.** This is the
   logout-specific application of the same non-silent-landing principle
   Decision 49 §3.6/§4 and Decision 50 §5 already establish for
   reconnection and finalization respectively, applied here to the
   session-boundary moment.
5. **This decision does not decide the technical mechanism** by which
   logout achieves this (cache clearing, storage partitioning, or any
   other approach) — only the required outcome.

---

# 5. Business Switching — Required Guarantee

1. **If the same authenticated user can access more than one business,
   Contagem state for Business A must remain completely isolated while
   the user is operating in Business B**, and vice versa — the
   guarantee in §2 applies identically whether the two contexts belong
   to two different authenticated users or to the same authenticated
   user operating under two different business contexts.
2. **Switching business context must not carry forward, expose, or
   silently apply Business A's locally persisted or pending state while
   the user is operating in Business B.** The user's own single
   identity does not create an exception to business isolation.
3. **This decision does not decide the technical mechanism** for
   representing or enforcing business-scoped storage — only that the
   isolation guarantee in §2 applies without exception across
   same-user business switches.

---

# 6. Offline State Across Context Changes — Required Guarantee

Consider a device that is offline and holds locally persisted Contagem
state, after which any of the following occurs: the user logs out,
another user logs in, the business context changes, or authority
changes (per Decisions 46/48/49) — all while the device remains
offline, discovered only upon reconnection.

1. **Nothing that was true only under the prior context may become
   visible or authoritative after reconnection, merely because the
   device was offline while the context changed.** Offline status does
   not pause, exempt, or grandfather a device out of the isolation
   guarantees in §2–§5 — restating the same offline-neutrality
   principle Decision 46 §5/§7, Decision 48 §7, and Decision 49 §2
   already establish for ongoing editing authority, extended here to
   context/session/business boundaries specifically.
2. **Upon reconnection, the device's locally persisted state must be
   evaluated against the current authoritative context** (current
   authenticated user, current business, current authority), not
   against whatever context was active when the device went offline.
   Any locally persisted state that does not belong to the current
   authoritative context is governed by §2–§5, not treated as current.
3. **This decision does not decide how or when the device detects that
   its offline context has become stale relative to a context change**
   — the detection mechanism and its timing are technical design
   questions, per §12 below. The governing requirement is only the
   outcome.

---

# 7. Pending Writes Across Context Changes — Required Guarantee

If locally persisted/pending writes exist at the moment session, user,
business, or authority context changes:

1. **A pending write must not later land under a different user's
   session than the one under which it originated**, regardless of
   whether that different user is a genuinely different person or the
   same person re-authenticated after logout.
2. **A pending write must not later land under a different business
   than the one it was made in**, including when the same authenticated
   user switches to operating a different business.
3. **A pending write must not become authoritative after the context
   under which it originated is no longer valid** — restating, at the
   context-boundary level, the same principle Decision 49 §3.6/§4 and
   Decision 50 §5 already establish at the authority-boundary and
   finalization-boundary levels respectively: authority (here, context
   validity) is evaluated at the moment a write is accepted as
   authoritative, not at the moment it was originally entered.
4. **This decision does not decide the technical mechanism** for
   determining which context a pending write belongs to, or how a
   context-mismatched write is technically rejected or discarded — only
   that it must never be silently accepted under the wrong context.

---

# 8. Historical Observations — Required Separation

Context-isolation protection exists to prevent cross-boundary leakage
and misattribution — **it must never be used as a justification for
silently destroying legitimate historical observation data.**

1. **Historical observations already durably accepted** under a given
   business/user/session context, before any subsequent context change,
   remain part of the legitimate record of that Contagem and are
   unaffected by a later logout, business switch, or authority change —
   restating the same principle Decision 48 §5.5 and Decision 49
   §3.5/§4 already establish for authority changes, applied here to
   context changes generally.
2. **Isolation requirements govern what a *different* or *later*
   context may see, write, or recover — never what happened,
   legitimately, within the original context.** An isolation mechanism
   that deletes or hides a business's own durably-accepted historical
   data as a side effect of achieving isolation from *other* contexts
   would violate this decision's intent, even though this decision does
   not prescribe how isolation is technically achieved.
3. **The following remain distinct at every layer of eventual design**,
   restating and applying the separation already established across
   Decisions 48, 49, and 50 to the context-isolation problem
   specifically:
   - **historical observations already durably accepted** — governed
     by item 1 above, never discarded by an isolation mechanism;
   - **current active Contagem state** — the live, in-progress record
     for the business/context currently being worked;
   - **locally persisted state** — whatever a given device currently
     holds in durable local storage, which may or may not still belong
     to the current authoritative context;
   - **pending writes** — locally queued, not-yet-durable operations,
     governed by §7;
   - **stale local state** — locally persisted or in-memory state that
     no longer reflects the current authoritative context, which has no
     authority to be shown, edited, or recovered as current (§2–§6);
   - **an authenticated user's current authority/context** — the
     presently valid business, session, and role, against which every
     other concept above must be evaluated.

---

# 9. Authority Changes — No New Model Introduced

1. **This decision does not introduce, modify, or reinterpret the
   authority model established by Decision 46 and governed by Decisions
   48, 49, and 50.** Owner/Admin authority remains inherent; delegated
   authority remains explicit and current; revocation/reassignment
   remains authoritative; offline status does not automatically
   transfer authority; stale local state does not regain authority —
   all exactly as those decisions already establish.
2. **This decision applies those same principles to the
   context-isolation problem without restating or altering them**: a
   device's stale local belief about its own authority (governed by
   Decision 49 §5) and a device's stale local *context* (business,
   user/session — governed by this decision's §2–§6) are two distinct
   kinds of staleness that must each be independently rejected as a
   basis for current action, neither one excusing or standing in for
   the other.

---

# 10. Recovery — Required Guarantee

"Safe recovery" after logout/login, switching business context,
reconnecting after offline operation, a browser/device restart, or an
interrupted session means, at minimum:

1. **Recovery must never cross a tenant (business), user/session, or
   authority boundary.** Whatever is recovered must belong to the
   current authoritative context, evaluated at the moment of recovery —
   never to whatever context was active when the interruption began, if
   that context is no longer the current one.
2. **An interrupted session or restart is not itself a re-acquisition
   event for a different context's data** — restating, at the
   context-boundary level, the same principle Decision 49 §3.7 already
   establishes for authority: recovery is an event about restoring
   continuity within the *current* authoritative context, never about
   acquiring access to a *different* one.
3. **This decision does not decide the technical mechanism** for
   determining what is safe to recover or how recovery is technically
   scoped to the current context — only that the boundary in item 1 is
   never crossed.

---

# 11. No Cross-Context Leakage — Explicit Prohibition

The following are explicitly prohibited as product outcomes, regardless
of how they might arise technically:

1. Displaying another business's Contagem state under the current
   business's context.
2. Displaying another user's session state under the current user's
   session.
3. Writing another business's state as though it belonged to the
   current business.
4. Applying a pending write to the wrong context (wrong business, wrong
   user/session, or a context that is no longer current).
5. Silently merging state across contexts of any kind named in this
   decision.
6. Treating stale state from a previous context as current
   authoritative state, in any of the scenarios named in §2–§7.

**These six prohibitions apply cumulatively and without exception**
across every scenario this decision names. A technical design that
satisfies §2–§10 but permits any one of these six outcomes does not
satisfy this decision.

---

# 12. What This Decision Does NOT Decide

Per this decision's own product-level boundary, the following remain
entirely open, technical-design-stage questions:

- Any IndexedDB schema, Firebase/Firestore persistence API usage,
  cache naming, or storage-key design.
- Any authentication-listener implementation, logout implementation, or
  service-worker design.
- Any Firestore query, security-rule implementation, or
  `request.auth`-re-evaluation-on-cached-read mechanism (the specific
  technical verification the Rule 8 Assessment already names in §IV.K
  remains a separate, not-yet-performed step).
- Any encryption approach for locally persisted data.
- Any database/cache cleanup algorithm or its timing.
- Any browser-specific or platform-specific mechanism.
- Any UI/UX implementation of how a context change, a rejected stale
  read, or a rejected stale write is communicated to the user.
- **This decision is scoped to Periodic Contagem only, per its own
  Affected Area.** Whether the same guarantees should be formally
  extended to other areas of the platform that also use durable local
  persistence is not decided here and is not a general security
  architecture proposal.

---

# 13. Explicit Non-Goals

Decision 51 does not authorize:

- Any technical mechanism for anything stated above.
- Any change to `firestore.rules`, application code, schema, UI, or
  tests.
- Reopening Decisions 44, 45, 46, 47, 48, 49, or 50's own
  already-settled content.
- Resolution of 44-S-A (Viewer authorization), 44-S-C (finalizer
  authorization), or the eligible-delegate-pool question — all remain
  exactly as open as the Rule 8 Assessment left them.
- A general security architecture review beyond Periodic Contagem's
  own durable local persistence.
- Any Implementation Plan or Implementation Authorization.

---

# 14. Effect on Rule 8

Per the Rule 8 Assessment (Part IV §IV.K, §IV.P item 10, §IV.Q, §IV.R),
44-F (shared-device/cache isolation) was identified as **UNVERIFIED —
not PASS**, HIGH priority, explicitly requiring its own narrow
technical verification (whether Firestore's client SDK re-evaluates
`firestore.rules` against the current `request.auth` on every read
served from `persistentLocalCache`) before a sound technical decision
can even be made — and explicitly unaffected in status by Decisions 46,
47, 48, 49, or 50. This document establishes the
**governance-requirement layer** 44-F's eventual technical
verification and design must satisfy — it does **not** perform the
named technical verification, and does **not** move the corresponding
Part IV finding (§IV.K) to PASS or RESOLVED. Specifically, now that
this decision is accepted:

- **44-F is RESOLVED at the Product Architect governance-requirement
  level.** Finding K (§IV.K) and the related item in §IV.P (item 10)
  now have a settled governance brief to be verified and designed
  against — but they remain **UNVERIFIED — technical verification and
  design required**, exactly as Part IV classified it. No technical
  verification is performed and no mechanism is chosen by this
  document.
- **44-S-A, 44-S-C, and the eligible-delegate-pool question** are
  entirely unaffected.
- The Rule 8 verdict **remains READY AFTER DECISIONS**, not READY.
- **This acceptance does not constitute Implementation Authorization**
  and does not amend the Implementation Plan — it settles only what the
  system must guarantee, not how, and not that building it may now
  begin.

**This document itself does not modify the Rule 8 assessment artifact.**
Per this task's instruction, only a pointer/status note identifying
Decision 51 as accepted for 44-F's governance-requirement layer is
added there, not a reclassification of Finding K or any other finding.

---

# 15. Status

**SPECIFICATION AMENDMENT:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY
**PRODUCT ARCHITECT ACCEPTANCE:** ✅ GRANTED — 4 September 2026
**RULE 8:** 44-F now RESOLVED at the Product Architect
governance-requirement level; the technical mechanism/verification/
design remains OPEN. Verdict remains READY AFTER DECISIONS — see the
Rule 8 artifact's own updated record of this decision.
**IMPLEMENTATION PLAN:** NOT YET AMENDED
**IMPLEMENTATION AUTHORIZATION:** NOT GRANTED — this acceptance does
not constitute Implementation Authorization
**CODE CHANGES:** NONE AUTHORIZED BY THIS DOCUMENT

---

## Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the context-isolation governance
requirements in §2–§11 above (business isolation; user/session
isolation; logout; business switching; offline state across context
changes; pending writes across context changes; the required
separation between context-isolation protection and legitimate
historical observations; no new authority model introduced; recovery
never crosses a tenant/user/session boundary; the explicit six-point
prohibition against cross-context leakage) are adopted as the governing
requirements 44-F's eventual technical verification and design must
satisfy. The technical mechanism itself — including the specific
Firestore SDK cache/auth-transition verification named in Part IV
§IV.K — is explicitly NOT decided or performed by this acceptance and
remains open, per §12/§13 above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-04

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level governance
decision only, exactly as Decisions 44, 45, 46, 47, 48, 49, and 50 were
each accepted. This acceptance does not authorize implementation,
`firestore.rules` changes, schema changes, UI changes, code changes,
tests, a technical mechanism for context-isolation
representation/enforcement, the named Firestore SDK technical
verification itself, an Implementation Plan amendment, or an
Implementation Authorization. The Rule 8 verdict remains READY AFTER
DECISIONS — the UNVERIFIED, HIGH-priority finding concerning
shared-device/cache isolation (§IV.K) remains unresolved until the
named technical verification and subsequent technical design are
completed. 44-S-A (Viewer authorization), 44-S-C (finalizer
authorization), and the eligible-delegate-pool question are unaffected
by this decision and remain exactly as open as before.
