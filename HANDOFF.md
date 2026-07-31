# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Module #20 (Notifications) moved from readiness analysis to
a full BDS draft this session: `docs/specs/20-notifications.md`.
**Designed, not yet Accepted.**

Readiness analysis surfaced a genuinely unresolved recipient-binding
question (Architecture §4.9/§7.4 left it as `uid` or `businessId`, and
— unlike Module #19's binding — no section claimed to resolve it).
Resolved via Product Architect decision, recorded as a "Decision
Record" section *inside* `20-notifications.md` itself (not a separate
file, per explicit instruction — different from Module #19's pattern,
which used a standalone resolution doc):

- **Decision Gate 1 (recipient binding):** hybrid model. Both
  Business-scoped (`businessId` — Closing/Inventory/Subscription
  alerts, visible to Admin + view-only Manager, never Staff by default)
  and User-scoped (`userId` — personal/account events, visible only to
  that user) are first-class. Neither "all `userId`" nor "all
  `businessId`" was accepted.
- **Decision Gate 2 (worker dependency):** Background Worker (§4.8) is
  a shared platform dependency — neither #19 nor #20 owns the
  scheduler; each owns only its own trigger logic.
- **Decision Gate 3 (channel scope):** V1 = in-app only, behind a
  Delivery Channel Interface so Email/WhatsApp are additive later, not
  a redesign.
- **Decision Gate 4 (notification types):** four V1 categories only —
  Business Closing, Inventory Risk, Subscription (Module #19
  dependency), Platform Announcements. Marketing, promotional, staff
  scoring, and AI-recommendation (Module #15 dependency) notifications
  explicitly excluded from V1.

**Not done this session, per explicit instruction:** no implementation,
no `firestore.rules` schema, no `Header.tsx` changes, no
`NotificationContext` created. `docs/specs/README.md`'s Phase 4 table
and note updated to reflect the new Designed status and cross-reference
the embedded decision record.

**Build order (confirmed last session, unchanged):**

```
#19 Subscriptions → #20 Notifications → #18 SuperAdmin
```

Module numbering is not dependency ordering. Module #19 remains
**✅ Accepted** (business spec & architectural decisions only — see
prior session); Module #20 is now **Designed**, awaiting the same
explicit Acceptance step before it can join #19 at that stage.

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
genuinely greenfield in code. **Still awaiting architectural approval;
gated behind #19 and #20 per the confirmed build order above** — #20 is
now Designed but not yet Accepted, so #18 remains blocked on both #19's
already-Accepted status and #20 reaching the same stage.

Module #15 (AI Intelligence) remains drafted but deliberately not
implemented — blocked on Background Worker, SuperAdmin Feature Flags,
Subscriptions, and Notifications, none of which exist in code yet.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Module #20's BDS awaits explicit Product
Architect Acceptance — not implemented, not scheduled. Do not begin #19
or #20 implementation in the meantime; that authorization has not been
given for either module.

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
