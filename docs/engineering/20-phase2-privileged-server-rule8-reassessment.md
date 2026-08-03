# Module #20 (Notifications) — Phase 2 (Privileged-Server Creation Path) Rule 8 Re-Assessment

**Type:** Rule 8 Re-Assessment — a targeted re-run of
[`20-phase2-privileged-server-rule8-assessment.md`](./20-phase2-privileged-server-rule8-assessment.md)
against [Specification Amendment v1.2](../specs/20-notifications-category-amendment.md),
per that assessment's own §11 recommendation and its Governance Notes.
Planning only. **Does not authorize implementation.**
**Lifecycle status:** Designed → Assessed → **Re-Assessed**. Not
Implemented, not Executed. Reaching this state is not itself
authorization to begin coding — that remains a separate, explicit
Product Architect decision (Phase 2 Implementation Authorization,
downstream of this document).
**Phase:** Module #20, Phase 2 — Privileged-Server Creation Path. This
document does not re-derive Phase 2's scope, current-state verification,
architecture alignment, dependency wiring, testing readiness, or Risks
2–4 from scratch — those are unchanged from the original assessment and
are incorporated by reference, not restated. This document's only job
is to answer one question: **does Amendment v1.2 close Risk 1, and does
that change the §11 Readiness Classification?**
**Basis:** [`20-phase2-privileged-server-rule8-assessment.md`](./20-phase2-privileged-server-rule8-assessment.md)
(original assessment, unchanged, all findings other than §11's
conclusion still stand); [`20-notifications-category-amendment.md`](../specs/20-notifications-category-amendment.md)
(v1.2, Accepted — adds `staff` to `NotificationCategory`);
[`20-notifications.md`](../specs/20-notifications.md) (v1.2, amended in
place per the amendment); current `src/`, `server/`, `firestore.rules`
state as of commit `58cf3e3` (verified fresh below, §1).

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 1. Fresh Repository Verification

Performed against a fresh `git fetch origin` / `git log -1` immediately
before writing this document — current `main` tip: `58cf3e3` (the v1.2
amendment commit itself; no commit exists after it).

Re-confirmed, unchanged since the original assessment:

- `writeNotification()` (`server/index.ts` ~line 1169) still has **zero
  callers** — verified by fresh grep. No `/api/staff/*` endpoint
  references `writeNotification`, `NotificationPayload`, or any
  notification-shaped write.
- No Phase 2 code, no Phase 3+ code, has been written. All Phase 1
  infrastructure (types, `NotificationContext`, `InAppChannel`,
  `firestore.rules` block, Header wiring) remains exactly as the
  original assessment's §1 table describes.
- The only change to the repository since the original assessment is
  documentation: the v1.2 Category Amendment itself, and its in-place
  amendment of `20-notifications.md`.

## 2. What Changed: Risk 1 Re-Examined

The original assessment's §10 Risk 1 stated: *the four V1
`NotificationCategory` values don't include a "staff"/account-event
category; staff-action notifications are User-scoped but need a `type`
value that doesn't map cleanly onto any of the four category buckets.*
This was the **sole** stated reason Phase 2 was classified "Ready after
minor preparation" rather than "Ready" outright (§11).

Amendment v1.2 resolves this directly, not by reinterpretation:
`NotificationCategory` is now

```
'closing' | 'inventory_risk' | 'subscription' | 'platform_announcement' | 'staff'
```

Checked against the original Risk 1 wording specifically:

- **"needs a `type` value that doesn't map cleanly onto any of the four
  category buckets"** — no longer true; a fifth bucket now exists,
  purpose-built for exactly this case (staff suspension, reactivation,
  deletion, tier-change, PIN-reset confirmations — the same five events
  the original assessment's §8/§9 already scoped against the five
  `/api/staff/*` endpoints).
- **"could produce inconsistent `category` values across the five
  endpoints if resolved ad hoc"** — no longer a live risk; all five
  endpoints now have one, single, spec-defined value (`staff`) to use,
  not five independently-guessed values.
- **Amendment v1.2's own exclusions checked against Phase 2's scope:**
  the amendment explicitly does not touch Decision Gates 1–3, does not
  modify `[Amendment v1.1]`-tagged `context`/`priority` requirements,
  and does not authorize implementation. None of this narrows or
  reopens anything the original assessment relied on in §2–§9 — those
  sections are unaffected and still stand.

**Risk 1 is closed.** No new risk was introduced in closing it — the
amendment added one enum value and nothing else, per its own "What This
Amendment Does Not Do" section, independently re-checked here rather
than taken on faith.

## 3. Risks 2–4: Re-Confirmed Unchanged

The original assessment's remaining three risks are re-checked against
the current repository state and found unchanged, since nothing that
would affect them has been touched:

| # | Risk | Status now |
|---|---|---|
| 2 | Partial-failure handling for the new write | Unchanged — still an implementation-time discipline (follow the existing staged `partialFailure`/`auditLogged` pattern), not a readiness blocker. |
| 3 | `context`/`priority` content quality | Unchanged — still an implementation-time / pre-merge content-review item, not a readiness blocker. |
| 4 | `dedupeKey` construction correctness | Unchanged — still an implementation-time verification item, not a readiness blocker. |

None of these three was ever the reason Phase 2 fell short of "Ready"
— the original assessment named Risk 1 as the sole blocker (§11: "Why
not 'Ready' outright"). With Risk 1 closed, no remaining item in this
table meets that bar either.

## 4. Governance Contradiction Check

Checked explicitly, per instruction, for anything new since the
original assessment that could affect Module #20:

- No commit exists on `main` after `58cf3e3` (the v1.2 amendment).
- No other spec, BDR, POL, ADR, or architecture file has been touched
  since the original assessment (confirmed by `git log` against each
  path cited in that document's own "Basis" line).
- `docs/specs/README.md` does not yet index the v1.2 amendment — this
  is a known, previously-flagged, deliberate documentation-sync
  deferral (the amendment's own Governance Notes say as much), not a
  new contradiction, and does not affect this re-assessment's
  substance.
- **No contradiction found.**

## 5. Readiness Classification

**Ready.**

**Why the reclassification is warranted:** the original assessment's
§11 was explicit and narrow — Phase 2 was "Ready after minor
preparation" for exactly one reason (Risk 1), and would be "Ready"
outright once that one item was resolved. §2 above confirms Risk 1 is
resolved, on its own terms, without reopening anything else the
original assessment found sound. No other section of the original
assessment (current-state verification, scope boundary, architecture
alignment, dependency wiring, testing readiness) is disturbed by this
re-assessment or by Amendment v1.2.

**What "Ready" does not mean:** this document still does not authorize
implementation. Per Rule 8, actual coding requires its own separate,
explicit Product Architect go-ahead — the next legitimate governance
artifact is a **Phase 2 Implementation Authorization** document,
downstream of this one, not a start of coding directly from this
re-assessment.

---

## Deliverables

1. **File created:** `docs/engineering/20-phase2-privileged-server-rule8-reassessment.md`
   (this document). No other file created or modified.
2. **Filename convention:** matches the module-prefixed (`20-`),
   phase-numbered original assessment's naming, with a `-reassessment`
   suffix distinguishing it as a targeted re-run rather than a fresh
   assessment.
3. **Governance documents reviewed:** the original Phase 2 Rule 8
   Assessment, Specification Amendment v1.2, and `20-notifications.md`
   (v1.2).
4. **Risk 1 status: Closed**, by Amendment v1.2, re-verified
   independently in §2 above rather than assumed from the amendment's
   own claim.
5. **Risks 2–4: unchanged**, re-confirmed in §3, none blocking.
6. **Readiness classification: Ready** (§5) — upgraded from "Ready
   after minor preparation."
7. **No runtime files modified.** `src/`, `server/`, `firestore.rules`,
   `firestore.indexes.json`, and all test files remain exactly as
   verified in §1 — nothing in this repository's runtime surface was
   touched to produce this document.
8. **Implementation has not begun and is not authorized by this
   document.** Per Rule 8, the next legitimate step is a Phase 2
   Implementation Authorization — a separate, explicit Product
   Architect artifact — not a start of coding.
