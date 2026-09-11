# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Also landed this session (unrelated to the above)

**Bug fix, `apps/tenant/src/components/AddStockView.tsx`:** Owner-reported —
OCR-scanned cost price from a receipt was getting silently wiped to blank
whenever a stock-entry row wasn't auto-recognized and had to be resolved
to an existing product via a "similar product" suggestion, a retyped
exact name, or a silent supplier-wording reuse match. Cause: shared helper
`buildProductMemoryAutofill` always returned `costPrice: undefined` (dead
`newCost` local, never reassigned) which clobbered the row's real cost via
the `{...row, ...fields}` merge in `updateRow`, leaving sellingPrice
autofilled from memory — profit calc silently became 100% until the
operator retyped cost by hand. Fix: the helper no longer returns
`costPrice`/`costPriceAutoFilled`/`costPriceBasisUnit` at all, matching
the pattern already correct in `handleConfirmSupplierWordingCandidate`.
Full repo typecheck and `npm run build` both clean. No schema/Firestore/
rules impact — client-only. **Not yet covered by a dedicated regression
test** (existing tests in this area don't exercise the row-merge path);
worth adding one if this area is touched again.

---

## Right now (SuperAdmin Agent Attended Support Session thread)

**Status:** Implementation Authorization for the SuperAdmin Agent
Attended Support Session is **✅ SIGNED** (Product Architect
SABUSHIMIKE MASCENI, September 11, 2026). Governance sequence:
`BDR-0018` (Approved) → Policy (Approved) → Specification (Accepted,
SPEC-1/SPEC-2/SPEC-3) → Rule 8 (**CLOSED / PASS**, `312f64c`) →
[Implementation Authorization](docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md)
(**✅ Signed, §14**) → **Checkpoint 1** (session-scoped Firestore
authorization, implemented) → **Checkpoint 2** (Invitation/code
lifecycle + Session-establishment server foundation, implemented this
session — see
[Checkpoint 2 doc](docs/engineering/superadmin-agent-attended-support-session-checkpoint-2-server-foundation.md)).

**Checkpoint 2 summary:** `server/supportSessionInvitation.ts` (code
generation) and `server/supportSessionConsumption.ts` (verification,
atomic consumption, lockout, Session establishment) are implemented and
wired into two new routes
(`POST /api/business/support-session/generate-code`,
`POST /api/superadmin/support-session/consume-code`), with a new
`requireSupportEligibleOperator` gate, `firestore.rules` addition for
`supportSessionInvitation/current`, and audit-log wiring. 21/21 new
plain unit tests passing; the rules-emulator addition is typechecked
but NOT EXECUTED (same disclosed sandbox network-egress limitation as
Checkpoint 1). Full repo typecheck (`npx tsc --noEmit -p .`) is clean
for every file this checkpoint touched.

**Strict implementation boundary (do not exceed):**
- **VIEW + POINT + GUIDE only** — no Support writes, no control mode,
  no second permission tier, no broad platform-operator tenant access
  (Authorization §4).
- **Session-scoped Firestore authorization is the single highest-stakes
  item** — every grant on Support View State, pointer, or
  `webrtcSignaling` must use the narrow, session-matched check
  (Invariant I-12 / FR-63: `status ∈ {active, reconnecting}` **and**
  `operatorUid == request.auth.uid`), never `platformRole`/
  `isPlatformOperator()` alone, and never the `platform_audit_log`
  precedent. Dedicated security-rules/isolation tests are required
  before this is considered complete (Finding 12-A).
- **TURN/relay must be provisioned before the desktop rendering path
  reaches production.** No vendor is selected anywhere in governance —
  that remains an Implementation Plan/procurement item. The mobile path
  has no TURN dependency.
- Session security parameters are fixed and must not change: 5-minute
  code, 5-attempt lockout, 15-minute cooldown (permanent lock, not a
  reactivation), 60-minute session cap.
- Bidirectional heartbeat (customer **and** Support operator, FR-54 as
  amended) governs connectivity status; reconnection never creates,
  extends, or revives authorization.

**Full authorized scope, exclusions, architecture, and required test
surface:**
`docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md`
§§3–13. Full reasoning trail: `docs/specs/BDR-0018-superadmin-agent-attended-support-session.md`,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`,
`docs/specs/superadmin-agent-attended-support-session-specification.md`
(SPEC-1/SPEC-2/SPEC-3), the Rule 8 Assessment (§§1–8), and the four
`docs/engineering/SUPERADMIN_AGENT_*` investigation docs.

## Next session should

1. **Begin Checkpoint 3 — bidirectional heartbeat and reconnection**:
   `lastHeartbeatAt`/`lastOperatorHeartbeatAt` transition logic, the
   `active`→`reconnecting`→`ended` state machine, the 2-minute grace
   period capped at the Session's own 60-minute `expiresAt` (FR-54 as
   amended, FR-55–FR-61, I-10, I-11). See Checkpoint 2 doc's own "Next
   checkpoint" note.
2. Run `npm run test:support-session-rules:emulator` (Checkpoint 1) and
   the same command now also covers Checkpoint 2's
   `supportSessionInvitation` rules cases — an actual emulator run is
   still the real acceptance gate for the rules-layer portion of both
   checkpoints, not yet performed in any sandbox so far.
3. Do not implement anything not traceable to a specific FR/Invariant
   in the Specification or an item in the Authorization's §3. If a gap
   is discovered mid-implementation, stop and surface it rather than
   inventing a resolution (Authorization §13).
4. TURN/relay vendor selection (managed vs. self-hosted) and its exact
   cost remain open Implementation Plan/procurement items — needed
   before the desktop path can go to production, not before
   implementation can begin.
5. Otherwise, the still-open items from the prior SuperAdmin panel
   investigation remain open (see
   `docs/engineering/SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md`
   §22): the stale audit-log action-type allowlist, the two pre-
   existing `superadmin-assisted-initial-stock-recovery.test.ts`
   failures, and the still-pending emulator-backed test run for the
   Clear-Data password rules (see prior HANDOFF revision / commit
   `03ccc83`) — none of these block or depend on this session's work.
