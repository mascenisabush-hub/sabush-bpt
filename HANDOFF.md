# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Rule 8 **CLOSED / PASS** for the SuperAdmin Agent Attended
Support Session. Governance sequence: `BDR-0018` (Approved) → Policy
(Approved) → Specification (**Accepted, including SPEC-1/SPEC-2/SPEC-3**)
→
`docs/engineering/superadmin-agent-attended-support-session-rule8-assessment.md`
(§8, Rule 8 Closure: **CLOSED / PASS**) → next step is an
**Implementation Plan** (not started).

**Product Architect Decisions 1–8 resolved this assessment's three
outstanding findings:**
- **Findings 5-A/5-B/2-B/3-B/10-A/10-B/12-A** (broad vs. narrow
  `isPlatformOperator()` grant — the critical isolation risk) —
  resolved by **Decision 4**: Support access is authorized only through
  the active support session, never by `platformRole` alone; the
  existing `platform_audit_log` broad grant is explicitly **not**
  precedent. Now binding Specification text: **Invariant I-12** and
  **FR-63** (SPEC-3 correction pass).
- **Finding 6-A** (heartbeat was customer-only) — resolved by
  **Decision 7**: both participants must heartbeat. Now binding
  Specification text: **FR-54 amended**, `lastOperatorHeartbeatAt`
  added to the Session data model (SPEC-3).
- **Finding 1-B/15-B** (no TURN/relay infrastructure) — resolved by
  **Decision 8** as a documented pre-production infrastructure
  dependency, gating the **desktop** rendering path's production launch
  specifically (not mobile, not this closure). Vendor selection and
  cost remain an ordinary Implementation Plan/procurement item — no
  vendor is named anywhere in governance.

**Full reasoning trail:**
`docs/specs/BDR-0018-superadmin-agent-attended-support-session.md`,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`,
`docs/specs/superadmin-agent-attended-support-session-specification.md`
(SPEC-1/SPEC-2/SPEC-3), the Rule 8 Assessment's §§1–7 (original
falsification record) and §8 (closure pass), and the four
`docs/engineering/SUPERADMIN_AGENT_*` investigation docs.

## Next session should

1. **Implementation Authorization is NOT issued.** Rule 8 Closure
   resolves governance findings; it does not authorize code. Do not
   begin implementation (`apps/`, `server/`, `firestore.rules`,
   `tests/`) for this capability without a separate, explicit
   Implementation Authorization following a drafted Implementation
   Plan.
2. The next governance step is an **Implementation Plan** for the
   SuperAdmin Agent Attended Support Session, informed in particular
   by: FR-63/I-12 (the exact narrow, session-matched `firestore.rules`
   text — the single highest-stakes correctness item, per Finding
   12-A, requiring dedicated security-rules test coverage before
   Authorization), the amended FR-54 (Support-operator heartbeat), and
   the desktop path's TURN/relay provisioning as a pre-production gate
   (§8.3 of the Rule 8 Closure).
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
