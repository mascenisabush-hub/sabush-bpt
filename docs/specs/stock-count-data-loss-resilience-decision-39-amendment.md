Specification Amendment — Proposed

# Decision 39 — Per-Row Autosave Scheduling and In-App Navigation Durability
## (Proposed amendment to `stock-count-data-loss-resilience-specification.md`)

**Status:** ✅ **ACCEPTED AND AUTHORIZED.**

This document has been rewritten from its own draft status — both
Decision 39a and Decision 39b are accepted as proposed, explicitly
including: per-row 800ms autosave scheduling while retaining the
existing single-document schema and global write serialization
(§2a); SPA/in-app navigation explicitly treated as an interruption
already covered by the existing durability requirement (§2b); no
redesign of the draft storage model (§4); no change to Validar/Guardar
(§3); no change to finalization or Retomar Contagem (§3). It does not
authorize implementation. It does not itself constitute a Rule 8
Assessment or an Implementation Authorization — both remain separate,
subsequent gates.

**Governing chain:** [`stock-count-data-loss-resilience-specification.md`](./stock-count-data-loss-resilience-specification.md)
(Frozen, Decision 38 already applied) → this proposed amendment
("Decision 39") → Rule 8 Assessment (not yet drafted; this document is
the prerequisite gate for it, per instruction) → Implementation Plan →
Implementation Authorization.

**Baseline:** `main = origin/main = e7dc197a049327c6144dfccfdbfce5911f2d577a`,
confirmed clean via `git fetch` immediately before drafting.

**Numbering:** the parent Specification's own `Decision N` sequence is
currently at Decision 38 (24 August 2026 amendment) — the highest used
in that document. This proposes **Decision 39** as the next
collision-free number in that same sequence, verified by direct
inspection; final confirmation is the Product Architect's to make on
acceptance.

**Source:** the two-part read-only investigation this session
("Per-Row Autosave & SPA Navigation Safety" and its predecessor,
"Guardar vs. Autosave"), both performed against this exact baseline.
This amendment formalizes only the findings that require an actual
governance decision before Rule 8 can proceed — it does not restate
the full investigation.

---

## 1. Problem Statement

Two real, evidence-based gaps were found in the currently-governed
Periodic Contagem autosave mechanism (Decision 38):

1. **Whole-draft debounce granularity.** One shared 800ms timer covers
   every row; any edit to any row resets it for all rows. Continuous
   editing across many rows can indefinitely postpone the first save,
   and a burst of edits followed by leaving can lose the entire burst
   together, not just the most recent field.
2. **In-app (SPA) navigation is not covered by the existing
   interruption-durability mechanism at all.** `visibilitychange` and
   `pagehide` — the two events Decision 38's mechanism relies on —
   provably do not fire when the Owner switches to another section of
   this app (confirmed: `App.tsx` uses no router; `PeriodicStockCountView`
   unmounts via a plain `activeTab`-gated conditional render, with the
   document staying visible and no page unload occurring). No unmount
   cleanup exists today that flushes the draft in this case.

## 2. What This Amendment Does — Two Separate Decisions

### 2a. Decision 39a — Per-Row Autosave Scheduling (resolves §13's open mechanism item)

**[PROPOSED DECISION — REQUIRES PRODUCT ARCHITECT ACCEPTANCE]**

The parent Specification's §13 already lists, as an open
Implementation-Task-level item: *"Exact mechanism(s) satisfying Section
6's interruption-durability requirement... Section 6 specifies the
required outcome; this specification does not select among these."*
This amendment resolves that open item as follows:

- Autosave scheduling becomes **per-row**: each catalog and manual row
  gets its own independent debounce timer. Editing one row never
  resets another row's timer. Rapid edits to the same row continue to
  debounce normally, exactly as today.
- **The underlying storage model is explicitly unchanged.**
  `PeriodicStockDraft.items` remains a single array inside one document
  at `businesses/{businessId}/stockCountDrafts/periodic`. No schema
  change, no new collection, no new document, no Firestore rules
  change, no index. This amendment authorizes scheduling granularity
  only, not storage granularity.
- **Every write, regardless of which row's timer triggered it, must be
  built from the live, current, all-rows state at the moment it fires
  — never from a snapshot captured at the moment that row's timer was
  scheduled.** This extends the existing `latestFlushArgs` pattern
  (already used by `flushPeriodicDraftNow`) to every autosave trigger,
  not just the interruption flush. This is a **required correctness
  property**, not an implementation detail Rule 8 may vary: the
  investigation traced precisely why a schedule-time-captured snapshot
  would allow one row's stale timer to revert another row's
  already-newer edit, and this requirement is what makes that
  structurally impossible regardless of write-completion order.
- **The single, global write-serialization queue (`draftInFlightSaveRef`'s
  existing role) remains global, not per-row.** There is still exactly
  one Firestore document; per-row-ness belongs to scheduling only. Any
  Rule 8/implementation design that splits write-serialization per-row
  would violate this amendment's own §2a and must not be authorized
  under it.

**FR-N1 [new, proposed].** Periodic Contagem's autosave scheduling is
per-row: editing one row's fields schedules or reschedules only that
row's own debounce timer, never another row's. The underlying draft
storage (`PeriodicStockDraft.items` as a single array, one document)
is unchanged.

**FR-N2 [new, proposed].** Every autosave write — regardless of which
row's timer triggered it — is built from a live read of the complete,
current state of all rows at the moment the write is issued, never
from a value captured at the moment that row's own timer was
originally scheduled.

**FR-N3 [new, proposed].** All autosave writes, regardless of trigger,
continue to be serialized through a single, global in-flight-write
tracking mechanism (extending, not replacing, the existing
`draftInFlightSaveRef` discipline) — never a per-row write queue.

### 2b. Decision 39b — In-App Navigation as an Interruption Class

**[PROPOSED DECISION — REQUIRES PRODUCT ARCHITECT ACCEPTANCE]**

Section 6 of the parent Specification requires draft recovery to
survive, at minimum: *"accidental navigation away, browser/tab/app
closure, refresh/reload, device shutdown, battery loss, power loss, and
connection interruption."* This amendment makes explicit what the
current implementation does not yet reach: **"accidental navigation
away" includes in-app (SPA) navigation to another section of this same
application — a genuine React component unmount with no browser-level
`visibilitychange` or `pagehide` event — not only navigation away from
the browser tab or application entirely.**

This is presented as a clarification of §6's already-stated intent
("navigation away" is not qualified there as "browser-level only"),
not as a new business principle — the underlying value (the Owner's
work must survive them leaving the screen) is unchanged; only the set
of leaving-mechanisms explicitly covered is being completed.

**FR-N4 [new, proposed].** The interruption-durability mechanism must
also flush the current draft state on Periodic Contagem's own component
unmount, not only on `visibilitychange`/`pagehide` — covering in-app
navigation to another section of the application, in addition to the
browser-level events Decision 38 already covers. The exact mechanism
(unmount-cleanup flush, or another technically equivalent approach) is
left to Rule 8/Implementation, per Decision 38's own established
precedent of stating outcome, not mechanism, at the Specification
level.

## 3. What This Amendment Does Not Change

- `PeriodicStockDraft`'s schema, `stockCountDrafts/periodic`'s document
  id, or any Firestore rule/index — explicitly unchanged (§2a).
- `Retomar Contagem`'s own logic — unaffected; it reads the same single
  document, unchanged in shape.
- Finalization (`handleConfirmSave`/`recordStockCount`) — unaffected;
  finalization never reads the draft, only live component state
  (already true today, confirmed by investigation, unchanged by this
  amendment).
- "Guardar"/"Validar"'s local-only, non-persistent semantics —
  unaffected; not referenced by either decision in this amendment.
- Initial Stock, Business Worth, Selling Price valuation, Unit
  Relationship, Product Memory — none referenced, none affected.
- The existing server-confirmed write discipline (`getDocFromServer`)
  and the existing stale/out-of-order single-session write protection
  — both extended (§2a), never weakened or replaced.
- The signed governance already on `main` for the discard-confirmation
  safety fix (`e7dc197`'s own predecessor work) — untouched, unrelated.

## 4. Explicit Non-Goals

Genuinely independent per-row Firestore *documents* (array → keyed map
or subcollection) — investigated and found technically possible but
requiring a real schema change, explicitly **not** authorized by this
amendment. If wanted later, it requires its own, separate governance
decision, not silently bundled into this one.

## 5. Governance Classification (restated from the investigation)

Both decisions in this amendment resolve items the parent
Specification's own §13 either already lists as open (39a) or leaves
implicit in §6's existing wording (39b) — neither reverses a settled
Product Architect decision, and neither introduces a new business
principle. **No new BDR.** This is the appropriate, minimal
Specification-level amendment; Rule 8 is the next gate after
acceptance, not a substitute for this one.

## 6. Next Governance Step

Upon acceptance and signature: Rule 8 Assessment, then Implementation
Plan, then a signed Implementation Authorization — no code is written
before that full chain, per this project's standing discipline.

---

## 7. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND AUTHORIZED.**

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / AUTHORIZED
**Date:** 28 August 2026

This signature accepts Decision 39a and Decision 39b as drafted, in
full, including their explicit non-goals (§4) and what remains
unchanged (§3). Next governance gate: Rule 8 Assessment.
