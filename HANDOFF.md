# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Policy layer drafted for `BDR-0018` — **committed**
(`556e842`), unnumbered, awaiting Product Architect review. This
session's governance sequence is now: `BDR-0018` (Approved,
`78833ba`) → `POL-pending-superadmin-agent-attended-support-session-policy.md`
(Drafted, this commit) → **STOP, per explicit governance gate** — no
Specification, Rule 8, or implementation may begin until this Policy
is reviewed and accepted.

**What the Policy resolved:** 26 lettered Operational Rules (A–Z)
covering operator-tier eligibility (widened to support/developer/
superadmin, a deliberate departure from every *existing* route's
superadmin-only reach), the one-time code's full lifecycle (hashing,
format, single-active-per-business, atomic consumption), session
duration/non-renewability, mandatory `businessId`-scoped lookup (a
security requirement, not a UX choice), structural write-incapability
for both rendering paths, native screen-share consent as a mandatory
second layer, and disconnect/audit/coexistence rules. Full
Traceability table maps every task item to its resolving rule.

**What's still explicitly open, not decided or invented:**
- The exact code-validity-window duration and lockout threshold/
  duration figures — flagged for direct Product Architect input (no
  existing precedent transfers cleanly, unlike session duration which
  reuses Architecture §9.7's own 60-minute figure).
- Three items marked `DEFER TO SPECIFICATION` per `BDR-0018`'s own
  deferral: the Support View State schema, sensitive-field masking,
  exact audit `actionType` string values.
- **A real numbering queue**: this Policy is the *third* unnumbered
  `POL-pending-*.md` document in the repository currently observing
  `POL-0015` as the next collision-free slot (the other two:
  `POL-pending-business-worth-evolution-policy.md`'s sibling
  `POL-pending-existing-product-stock-entry-purchase-authority.md`
  and `POL-pending-selling-price-unit-invariant-amendment.md`). None
  claims the number; this document does not resolve the ordering
  either — flagged plainly for whoever numbers them.

**Note on this session's numbering discipline, still holding:** a
prior "correction" this session claimed `BDR-0018` was already taken;
verification against the repository showed that claim was false
(`BDR-0004` is Customer Communication Architecture). The same
verify-before-acting discipline was applied again here — this Policy's
own numbering section reports the observed state plainly rather than
guessing at the three-way queue.

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
   Specification that follows this Policy.** The governing task's own
   explicit instruction: "STOP after producing the Policy draft/
   investigation... WAIT for Product Architect review and acceptance.
   No implementation or downstream governance stage may begin until
   explicitly authorized."
2. When that direction arrives, it will likely need to also resolve:
   the code-validity-window and lockout figures (Policy's own "Genuine
   Open Questions"), and the three-way `POL-0015` numbering queue.
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
