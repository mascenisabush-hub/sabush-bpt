# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Specification drafted for `BDR-0018` + its accepted
Policy — **committed** (`0471076`). Governance sequence: `BDR-0018`
(Approved, `78833ba`) → Policy (Approved, `db8306c`) →
`docs/specs/superadmin-agent-attended-support-session-specification.md`
(Drafted, **not yet Accepted** — no Product Architect signature given
or fabricated) → **STOP, per explicit instruction** — no Rule 8 or
implementation until this Specification is reviewed.

**What the Specification converted:** 48 numbered FRs across 13
groupings (code generation → entry/consumption → expiry/lockout →
session duration → desktop rendering → mobile rendering → pointer →
customer indicator → disconnect → tenant isolation → structural
write-incapability → audit → session coexistence), 9 Invariants, a
Proposed (explicitly non-binding) Data Model following the
`initialStockRecoveryAuthorization` "current"-document precedent, 8
new `platform_audit_log` `actionType` values, and a full Traceability
Matrix — every one of the 26 accepted Policy Rules mapped to at least
one FR, every one of the 48 FRs traced from at least one Rule (verified
programmatically, one real gap found and fixed before commit).

**What's still explicitly open, flagged not invented:**
- 5 Rule-8 technical questions (§22 of the Spec): the abandoned-session
  detection mechanism, the Support View State's exact field schema,
  rendering-path detection logic, signaling-document lifecycle, the
  exact FR-11 atomicity transaction design.
- Sensitive-field masking (§24): resolved at the *principle* level
  (minimum-necessary, same discipline Business Visibility already
  applies) but the specific field list is deferred to Rule 8 — no
  masking convention exists anywhere in this codebase to ground
  specific choices in, and the desktop screen-share path makes
  field-level masking structurally harder than mobile, a real
  asymmetry flagged for whoever resolves this next.
- The `POL-0015` three-way numbering queue (still unresolved, carried
  over from the Policy stage).

**A naming choice worth knowing:** the Specification deliberately does
**not** reuse `platformAuditLog.ts`'s own anticipated
`support_session.issued` name (that file's header comment named it
years before this capability existed, for the original, never-built,
non-consent-gated §9.7 concept) — uses `support_session.established`
instead, flagged explicitly rather than silently repurposing an old
name for a materially different capability.

**What this session did:** produced
`docs/engineering/SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md`,
answering the product-direction question "how should SuperAdmin become
an operational Agent that assists SABUSH customers" — grounded entirely
in existing repository evidence, not invented scope. Key findings, for
whoever picks this up next:

- **"Agent" is best evidenced as a human Support-tier operator**, not
  an AI system — zero AI-agent/chatbot/LLM/automated-support
  architecture exists anywhere in this repository in connection with
  SuperAdmin (searched exhaustively; every "AI" reference belongs to
  the separate, tenant-facing Section 10 / Module #15 domain).
- The mechanism that would give that operator real assistance
  authority — **Support Session** — is already fully specified
  (Architecture §9.7/§6.5) but was **explicitly evaluated and deferred
  once already**, in favor of the narrower, already-built Business
  Visibility curated read
  (`docs/engineering/18-superadmin-v1-architecture-gap-resolutions.md`,
  Gap 2). Any Agent work needs to either revisit that specific decision
  or build on top of what Gap 2 chose instead — not silently bypass it.
- Highest-value, lowest-risk next item identified: surfacing a
  business-suspension's `justification` text in the already-built,
  already-audited Business Visibility read (§16 item 1 of the
  investigation doc) — a small extension of an already-authorized
  capability, not new scope.
- A real, evidenced gap with **zero existing mechanism for anyone**:
  there is no tenant Admin password-reset path anywhere in this
  repository, agent-assisted or self-service (`/api/staff/reset-pin`
  is a different, owner-acting-on-staff action, not reachable by
  SuperAdmin or by the Owner for themselves).
- No agent-to-customer communication channel exists at all — Module
  #20's in-app Notifications are system-triggered/templated by design,
  not operator-composable; email/WhatsApp/SMS are explicitly deferred.

**Next governance step (per the investigation's own §17):** Product
Architect review of the investigation — specifically its §4
interpretation finding and §16 prioritized list — before any BDR,
Policy, Specification, Rule 8 Assessment, or Implementation
Authorization work begins. Per this document's own operating
instructions, no such artifact should be started until that review
happens.

## Next session should

1. **Wait for explicit Product Architect direction before starting
   Rule 8.** The Specification's own §28 states this plainly: "stop
   here... Rule 8 Assessment... is not drafted, started, or implied by
   this document."
2. When that direction arrives, it will likely need to resolve the
   Specification's own §22 (5 Rule-8 technical questions) and §24
   (specific field-masking list) as part of, or immediately before,
   Rule 8.
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
