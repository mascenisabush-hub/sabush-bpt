# Module #18 (SuperAdmin) — Business Directory (Phase E) — Retrospective Governance Acceptance

**Type:** Governance bridge document — but not a standard Stage 8
Implementation Authorization, and explicitly not a Stage 10 Close-Out.
The Platform Engineering Governance Standard's eleven stages
(`platform-engineering-governance-standard.md` §2) describe a
prospective sequence — Assessed, then Authorized, then Implemented.
That sequence was not followed for this phase (see §1 below). This
document exists to fill the gap the standard itself does not name a
mechanism for: a Product Architect decision about whether an
already-built implementation may be accepted into the governed
baseline, made *after* the fact rather than before it. It borrows this
repository's established Authorization-document structure and
signature convention where that structure still applies, and departs
from it explicitly where it does not.
**Status:** ⚠️ Retrospectively Accepted, subject to outstanding
conditions (§6). **This is not a Close-Out.** Phase E remains open
pending the items listed in §6 — do not read this document's
existence as marking Phase E CLOSED.
**Basis:** [BDR-0010](../specs/BDR-0010-superadmin-business-directory.md)
(✅ Approved — business decision only, per its own Part 14),
[POL-18-001](../specs/18-pol-001-operational-activity-state-model.md)
(✅ Approved), [`18-superadmin-business-directory-slice.md`](../specs/18-superadmin-business-directory-slice.md)
(v1.2 — Drafted; its own §24 explicitly states that neither a Rule 8
re-affirmation nor implementation authorization had been granted as of
that version), [`platform-engineering-governance-standard.md`](./platform-engineering-governance-standard.md).
**Repository state at drafting:** `main` HEAD `0b073cf`, working tree
clean, confirmed via fresh `git fetch` immediately before this document
was written. `BDR-0010`, `POL-18-001`, and the specification's v1.2
content are all confirmed unchanged, byte-for-byte, since the
investigation this document is based on.

**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `HANDOFF.md`,
`docs/specs/README.md`, any ADR, BDR, POL, or specification to produce
this document.**

---

## 1. Historical Fact — What Actually Happened, in Order

This section is a record, not an argument. Every timestamp below is
taken directly from `git log`/`git show` against the commits named.

| Date/time (UTC) | Commit | Event |
|---|---|---|
| 2026-08-15 19:58 | `87638b9` | BDR-0010 Approved, POL-18-001 Approved, specification v1.1 drafted |
| 2026-08-15 20:04–20:27 | `660a3b9`, `ca11022`, `e1ab6a8` | An informal Rule 8 Assessment was performed (verdict: `ENVIRONMENT BLOCKED`), its one blocking item resolved by real-emulator evidence, and the specification updated to v1.2 recording that result |
| 2026-08-15 20:27 | `e1ab6a8` | Specification's own §24 and Governance Notes explicitly state, in writing: *"this specification alone does not constitute that re-affirmation"* and *"neither [re-affirmation nor authorization] is granted by this specification update alone"* |
| 2026-08-15 20:46 → 2026-08-16 08:58 | `542d53f` … `933ee85` | Nine implementation checkpoints — the full Phase E feature — committed, **19 minutes after** the specification explicitly recorded that authorization had not occurred |
| Present | — | No Rule 8 re-affirmation document, no Implementation Plan document, and no Implementation Authorization document have been created at any point since |

**Plainly stated:** Stage 9 (Incremental Implementation) began before Stage 7
(Rule 8 Assessment reaching a formally recorded "Ready") or Stage 8
(signed Implementation Authorization) completed. This violates the
Governance Standard's own Non-Negotiable Principle 7 and BDR-0010 Part
14's explicit instruction that *"Rule 8 is not skipped."*

**This fact is not altered, superseded, or diminished by anything else
in this document.**

---

## 2. Current Decision

> Accepted retrospectively into the governed baseline.
>
> The Product Architect acknowledges that Phase E implementation
> commenced before completion of the required Rule 8 and Implementation
> Authorization gates. This decision does not alter or erase that
> historical fact.
>
> Following retrospective review, the implementation has been found
> faithful to BDR-0010 and POL-18-001, with no identified scope
> deviation. The existing implementation is therefore accepted into the
> governed baseline going forward, subject to completion of the
> outstanding technical verification and formal closeout requirements.

---

## 3. What This Decision Does NOT Mean

- It does **not** claim that authorization existed before implementation
  began. §1's timeline stands as written.
- It does **not** rewrite, remove, or annotate any existing commit.
  `542d53f` through `933ee85` remain exactly as committed, including
  their own "checkpoint, not yet complete" language.
- It does **not** alter BDR-0010, POL-18-001, or the specification's
  v1.1/v1.2 text — including the specification's §24 and Governance
  Notes sections, which continue to state that authorization had not
  been granted as of that version. Nothing in this document edits that
  record; it sits downstream of it.
- It does **not**, by itself, close Phase E. See §6.
- It does **not** establish a general precedent that implementation may
  precede authorization — see §7.

---

## 4. Scope Finding

Reviewed and confirmed faithful to governed scope, with no deviation
identified, across every dimension checked:

- **Operational-activity thresholds** — POL-18-001's 14-day / 45-day
  boundaries match `server/businessDirectory.ts` (`ACTIVE_WINDOW_DAYS =
  14`, `DORMANT_THRESHOLD_DAYS = 45`) exactly.
- **Activity-source mechanism** — `server/activityTouch.ts` implements
  BDR-0010 Part 5's approved mechanism: server-authoritative,
  Admin-SDK-backed, server-generated timestamp, no client write path,
  no `firestore.rules` change.
- **Permissions** — the SuperAdmin directory route
  (`server/index.ts`, `GET /api/superadmin/businesses/directory`) uses
  the identical `requireAuth, requirePlatformOperator,
  requireSuperAdmin` chain as every prior SuperAdmin phase. The
  tenant-facing touch-activity route re-verifies caller membership
  server-side before writing, reusing the pattern already proven by
  `/api/subscriptions/activate-trial`.
- **Exclusions (BDR-0010 §8)** — no bulk actions, no mass
  suspend/reactivate, no deletion, no subscription/plan mutation, and
  no new mutation capability of any kind were found anywhere in the
  directory feature. It is read-only navigation, as scoped.

---

## 5. Test Evidence at Time of This Decision

- **81 non-emulator tests** re-run and confirmed passing across five
  files (`superadmin-activity-touch`, `superadmin-backfill-phase-e`,
  `superadmin-business-directory`, `superadmin-business-directory-api`,
  `superadmin-business-directory-ui`).
- **18 emulator-dependent tests** exist in
  `tests/superadmin-business-directory-firestore.test.ts` — **not yet
  run.** Their result is unknown at the time of this decision.
- **Live deployment status** — **not yet verified.** No record exists
  anywhere in this repository confirming whether the code implemented
  in checkpoints 1–9 is running in the live SuperAdmin/Railway
  environment.

---

## 6. Outstanding Conditions — Phase E Is NOT Closed

**This document is not the Phase E Close-Out.** The following remain
pending, and Phase E may not be marked CLOSED until all are satisfied
and recorded in a subsequent, separate Stage-10-style closeout
document, modeled on `20-phase3-closeout.md`'s precedent:

1. The 18 emulator-dependent tests in
   `tests/superadmin-business-directory-firestore.test.ts` have not yet
   been run. Their result must be obtained and recorded.
2. Live deployment status has not yet been verified. Whether the
   checkpoint-1–9 code is actually running in production must be
   established and recorded, one way or the other.
3. A formal Phase E Close-Out document has not yet been produced.

Until all three are satisfied, Phase E's status remains: **implemented,
retrospectively accepted, verification pending.**

---

## 7. Historical Integrity Statement

These are two distinct facts, and this document keeps them distinct:

1. **Implementation occurred before formal authorization.** This is
   established in §1 by direct commit-timestamp evidence and is not
   altered by anything below this line.
2. **The existing implementation is now accepted into the governed
   baseline**, as a forward-looking decision made on the date below,
   based on a retrospective review finding it scope-faithful.

Fact 1 is history. Fact 2 is a decision made today about what to do
given that history. Neither is a restatement of the other, and this
document does not permit fact 2 to be read backward into fact 1.

---

## 8. Signature

**Status:** ⚠️ Retrospectively Accepted (conditions outstanding — §6).

> Having reviewed: BDR-0010; POL-18-001; the Business Directory (Phase
> E) specification, v1.2, including its own §24 and Governance Notes
> recording that authorization had not been granted; the nine
> implementation checkpoint commits (`542d53f` through `933ee85`); the
> current implementation of `server/activityTouch.ts`,
> `server/businessDirectory.ts`, the SuperAdmin API route, and the
> SuperAdmin Business Directory UI; and this retrospective acceptance
> record —
>
> I acknowledge that Phase E implementation began before the required
> Rule 8 re-affirmation and Implementation Authorization gates were
> completed, and that no historical document authorizing that
> implementation exists in this repository.
>
> Having reviewed the implementation against BDR-0010 and POL-18-001
> and found it faithful to governed scope, with no identified
> deviation, I accept the existing implementation into the governed
> baseline going forward.
>
> This acceptance is explicitly conditional. Phase E is not closed.
> Formal closure requires the three outstanding conditions in §6 to be
> satisfied and recorded in a separate Close-Out document.

**Product Architect:** [TO BE COMPLETED — name not supplied for this
record; not inferred from any other document's signature]
**Date:** [TO BE COMPLETED — date not supplied for this record]

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `docs/specs/*`, `docs/architecture/*`, or
  `docs/adr/*` file. None were touched to produce it.
- This record does not modify BDR-0010, POL-18-001, or the
  specification — it sits downstream of their existing, unedited
  content.
- This record does not modify `HANDOFF.md` or `docs/specs/README.md` —
  both remain stale on Phase E's status until a separate, explicit
  update, per the Governance Standard's Principle 5 (documentation
  drift is corrected as its own step, never folded into unrelated
  work).
- This record does not establish that future implementation may
  precede authorization. It resolves one specific, already-occurred
  situation on its own facts. Every future phase of every module
  remains subject to the Governance Standard's stages in their
  prescribed order, unchanged by this document.
- The Platform Engineering Governance Standard, as written, contains no
  explicit mechanism for retrospective acceptance of out-of-sequence
  implementation. This document was produced because that gap exists,
  not because the Standard names this document type. A future revision
  of the Standard may wish to address this gap explicitly — that is a
  separate, later decision, not made by this document.

**Lifecycle:** Implemented (out of sequence, §1) → **Retrospectively
Accepted** (this document, date pending signature) → *(pending)*
Verified (§6 conditions) → *(pending)* Closed.
