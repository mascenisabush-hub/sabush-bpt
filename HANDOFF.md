# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Module #20 (Notifications) went through a full
documentation review this session — checked against Module #17's and
Module #19's Accepted rules, Architecture's tenant isolation principle,
and the SuperAdmin dependency chain — then received Product Architect
**Acceptance**. `docs/specs/20-notifications.md` is now
**✅ Accepted** (business spec & architectural decisions only;
implementation not yet authorized), matching Module #17 and Module #19.

The review surfaced one required correction before Acceptance: the
BDS's original Business Rule 4 / Decision Gate 2 / FR 20.5 implied the
Background Worker was the *only* notification-creation path.
Architecture §4.9/§7.4 actually name three legitimate paths — the
Background Worker (§4.8, scheduled/derived events: overdue Closings,
subscription expiry checks, inventory risk scans), the privileged
server (§4.4, immediate transactional events: staff suspension
confirmation, security/account actions), and the payment webhook
handler (§4.12, payment/subscription-provider events: payment result,
subscription state change). Corrected in Business Rule 4, Decision
Gate 2, and FR 20.5 (now "Notification Creation Path Contract"): the
Background Worker is shared notification infrastructure for scheduled
and derived events, not the exclusive creation owner; all three paths
enforce the same tenant isolation, recipient binding, auditability, and
notification rules. A second, minor completeness addition was also
made to Business Rule 2: an Owner with multiple Businesses (Module #17)
does not receive a combined cross-Business notification stream —
notifications stay isolated per originating Business, mirroring #17's
own no-aggregation boundary for financial data.

Decision Gates 1, 3, and 4 (hybrid recipient binding; V1 = in-app only
behind a Delivery Channel Interface; V1 = four fixed categories) were
reviewed and found to already align with Architecture and were carried
through to Acceptance unchanged.

**Not done this session, per explicit instruction:** no implementation,
no `firestore.rules` schema, no `Header.tsx` changes, no
`NotificationContext` created. `docs/specs/README.md`'s Phase 4 table
and notes updated to reflect Module #20's Accepted status and the
Decision Gate 2 correction.

**Build order (confirmed, unchanged):**

```
#19 Subscriptions → #20 Notifications → #18 SuperAdmin
```

Module numbering is not dependency ordering. Module #19 and Module #20
are now both **✅ Accepted** (business spec & architectural decisions
only — implementation not authorized for either). Module #18
(SuperAdmin) is therefore **ready for review / implementation
planning** — its two Phase-1 doc-stage dependencies are both cleared —
but reaching that stage is not itself an authorization to begin #18's
implementation planning, or #19's or #20's implementation, on anyone's
own initiative; each remains a separate, explicit Product Architect
go-ahead per Rule 8.

**Prior status (unchanged this session):** PR-001/PR-002 remain closed.
The Firestore tenant-isolation test suite (16 `describe` blocks, added
in `493c585`) has been **executed** against a real Firebase Rules
Emulator: 47/47 tests passed, 0 failures, exit code 0. Results in
`docs/security/firestore-tenant-isolation-audit-findings.md` (commits
`cfd1af6`, `5f161a5`, `bd5229b`), reviewed and marked **Analyzed** by
the Product Architect — `Accepted` is a separate, explicit decision not
granted by this note; check that file's own Section 5 lifecycle table.

Module #17 (Owner Portfolio) remains **Accepted (docs & business
rules)** — unchanged, implementation not authorized.

Module #18 (SuperAdmin) — BDS spec drafted (`docs/specs/18-superadmin.md`),
genuinely greenfield in code. **Its two Phase-1 doc-stage dependencies
are now both cleared** — #19 Accepted (prior session), #20 Accepted
(this session) — per the confirmed build order above. #18 is therefore
**ready for review / implementation planning**, but has not itself
received any Product Architect review, Acceptance, or implementation
go-ahead this session. Its own Rule 8 review (affected files, plan,
risks) has not been done.

Module #15 (AI Intelligence) remains drafted but deliberately not
implemented — blocked on Background Worker, SuperAdmin Feature Flags,
Subscriptions, and Notifications, none of which exist in code yet.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Modules #19 and #20 are both Accepted
(docs & business rules) — neither has implementation authorization. Do
not begin #19, #20, or #18 implementation, schema, or `firestore.rules`
work in the meantime; that authorization has not been given for any of
the three.

**Known gaps flagged but not yet scheduled:**
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `clearAllData` no longer removes Closings (they can no longer be
  deleted at all) — flagged for a product decision on whether its copy
  should change, not yet decided.
- The tenant-isolation audit findings document notes its own evidence
  is based on operator-reported terminal output/screenshot, not a
  full attached raw log file — a nice-to-have follow-up, not a
  blocker, per that document's own Section 6/Appendix A.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
