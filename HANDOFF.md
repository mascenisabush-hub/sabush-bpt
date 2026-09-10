# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** `BDR-0018` — SuperAdmin Agent Attended Support Session —
**Approved and committed** (`78833ba`), alongside its three supporting
investigation documents. This is a real governance artifact, not an
audit-only document like the session's earlier work.

**What's decided (BDR-0018, do not re-litigate):** a customer-
initiated, single-use-code-gated, time-boxed Attended Support Session
giving a Support-tier operator exactly VIEW + POINT + GUIDE — zero
write authority, ever, by any mechanism. Rendering is hybrid: desktop
uses native browser screen-share (`getDisplayMedia` + `RTCPeerConnection`,
no new npm dependency); mobile — which has no `getDisplayMedia`
support on any major mobile browser, verified against current data —
uses a purpose-built, read-only Support View State delivered via
Firestore's existing `onSnapshot`. This directly, explicitly revisits
`18-superadmin-v1-architecture-gap-resolutions.md`'s Gap 2 deferral,
on new evidence Gap 2 didn't have. Full reasoning trail:
`docs/specs/BDR-0018-superadmin-agent-attended-support-session.md`
and the four `docs/engineering/SUPERADMIN_AGENT_*` investigation docs
it cites.

**What BDR-0018 explicitly leaves open, for the next governance
stage(s):** which platform-operator tier(s) get this capability; the
one-time code's exact length/format/lockout thresholds; exact session
duration; the Support View State's field-by-field schema; whether any
fields should be masked even in a view-only session; exact audit
`actionType` string values; how the conversation itself is carried
(no agent-to-customer communication channel exists anywhere in this
codebase today).

**Note on this session's governance process:** a "correction" request
arrived claiming `BDR-0018` was already taken by Customer
Communication Architecture. Verified directly against the repository
before acting — that claim was false (Customer Communication
Architecture is `BDR-0004`; `BDR-0018` was genuinely free). Reported
the discrepancy rather than silently complying with it, then proceeded
with `BDR-0018` once verification supported it. Worth knowing if a
similar claim resurfaces.

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

1. **Wait for explicit Product Architect direction before drafting the
   Policy or Specification that follows BDR-0018.** The last governance
   message in this thread was an explicit STOP: "The corrected BDR
   must be returned for Product Architect acceptance before the next
   governance stage." BDR-0018's own §7 (Governance Sequence From
   Here) names Policy → Specification → Rule 8 → Implementation
   Authorization as the remaining path, but none of it should start
   unprompted.
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
