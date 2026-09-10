# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** SuperAdmin Agent investigation complete — audit-only,
**committed and pushed** (`4ff863a`). No code, schema, or governance
artifact was created or modified by this work. Nothing mid-flight.

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

1. Await Product Architect direction on the SuperAdmin Agent
   investigation above — do not begin drafting a BDR/Policy/Spec for
   it unprompted.
2. Otherwise, the still-open items from the prior SuperAdmin panel
   investigation remain open (see
   `docs/engineering/SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md`
   §22): the stale audit-log action-type allowlist, the two pre-
   existing `superadmin-assisted-initial-stock-recovery.test.ts`
   failures, and the still-pending emulator-backed test run for the
   Clear-Data password rules (see prior HANDOFF revision / commit
   `03ccc83`) — none of these block or depend on this session's work.
3. Check `docs/specs/README.md` for the next item in the Module Order
   table in `CLAUDE.md` if no SuperAdmin-related direction is given.
