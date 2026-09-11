# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Rule 8 Assessment complete for the SuperAdmin Agent
Attended Support Session — **committed** (`71257c5`). Governance
sequence: `BDR-0018` (Approved) → Policy (Approved) → Specification
(**Accepted**) →
`docs/engineering/superadmin-agent-attended-support-session-rule8-assessment.md`
(Drafted, verdict: **READY AFTER DECISIONS**) → awaiting Product
Architect resolution before an Implementation Plan can start.

**The two most important findings, both previously unflagged
anywhere in this governance chain:**
- **Finding 5-A (Critical):** `firestore.rules`' `isPlatformOperator()`
  helper is used in exactly **one** place in the entire file — a
  *broad* grant on `platform_audit_log` (not tenant-scoped). Zero
  precedent anywhere in this codebase for a platform operator reading
  tenant-scoped data, or writing anything client-side at all (every
  existing platform-operator write is server-mediated only). Copying
  that one precedent verbatim for the mobile Support View State read
  or the pointer write would let **any** platform operator read
  **any** business's live session data, with no code ever consumed —
  a catastrophic isolation failure if implemented naively. Resolution
  direction is fixed (Finding 5-B): reuse the exact cross-document
  `get()`-lookup shape `initialStockRecoveryAuthorizationActive()`
  already proves, matched against the Session's own `operatorUid` and
  `status` — narrow, session-scoped, not broad.
- **Finding 6-A:** the heartbeat mechanism (FR-54) is currently
  one-directional (customer's browser only) — the Support operator's
  own disconnection isn't detected as worded, even though Policy Rule
  U names "either party." A real Specification-text gap, correctable
  within Rule 8's own authority, not a reopened decision.
- **Finding 1-B:** no TURN/relay infrastructure exists anywhere in
  this repo — a genuine, currently-unresolved Product Architect
  decision (cost/vendor) the assessment surfaces but cannot make.

**Verdict:** READY AFTER DECISIONS, not READY FOR IMPLEMENTATION
outright and not NOT READY. Every other one of the 16 falsification
dimensions the Product Architect asked for found either no structural
risk or an ordinary, low-risk Implementation Plan item. Full reasoning
trail: `docs/specs/BDR-0018-superadmin-agent-attended-support-session.md`,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`,
`docs/specs/superadmin-agent-attended-support-session-specification.md`,
and the four `docs/engineering/SUPERADMIN_AGENT_*` investigation docs.

## Next session should

1. **Wait for explicit Product Architect direction before starting an
   Implementation Plan.** The Rule 8 Assessment's own verdict is
   READY AFTER DECISIONS, not READY FOR IMPLEMENTATION — do not treat
   this as a green light to plan or implement.
2. When that direction arrives, it needs to resolve, at minimum:
   Finding 1-B (TURN/relay: acquire a managed service, or explicitly
   accept the risk on restrictive networks) — a genuine cost/vendor
   decision this assessment could not make. Findings 5-A/5-B and 6-A
   are correctable within Rule 8/Implementation Plan authority (no
   Policy/BDR reopened) but should be explicitly confirmed as binding
   requirements for the Implementation Plan, not left implicit.
3. Otherwise, the still-open items from the prior SuperAdmin panel
   investigation remain open (see
   `docs/engineering/SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md`
   §22): the stale audit-log action-type allowlist, the two pre-
   existing `superadmin-assisted-initial-stock-recovery.test.ts`
   failures, and the still-pending emulator-backed test run for the
   Clear-Data password rules (see prior HANDOFF revision / commit
   `03ccc83`) — none of these block or depend on this session's work.
4. Check `docs/specs/README.md` for the next item in the Module Order
   table in `CLAUDE.md` if no SuperAdmin-related direction is given.
