# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Module #19 (Subscriptions) is now **✅ Accepted** — business
specification and architectural decisions only, **not** implementation.
Both docs updated with a "Product Architect Acceptance" section (same
pattern as Module #17):

- `docs/specs/19-subscription-ownership-resolution.md` — Accepted.
  Resolves the Architecture §3.13/§6.2/§9.4/§13.5 subscription-binding
  contradiction as **Business-level (`businessId`) binding**; Owner/
  Portfolio-level subscription explicitly rejected; `MAX_SHOPS_PER_OWNER`
  (Module #17) confirmed unchanged. No `docs/architecture/*` file
  edited — this record remains the cross-reference, not a rewrite.
- `docs/specs/19-subscriptions.md` — Accepted. Business-level trial
  (Decision A); restricted-features expiry model, never login-blocking
  or full read-only, Business Worth/Closings/Timeline/historical data
  always accessible (Decision B); V1 scope = subscription state + trial
  lifecycle + entitlement/feature gating + future payment-integration
  boundary only, no invoices/receipts/ledger/billing history (Decision
  C); `MAX_SHOPS_PER_OWNER` relationship confirmed, no code change.

Lifecycle: **Designed → Accepted.** Not Implemented, Executed, or
Analyzed — **no engineering work is authorized.** Four items remain
explicitly open regardless of Acceptance (BDS's own "Explicitly Left
Open"): plan names/tier structure, pricing, payment processor vendor
selection, legacy-migration mechanics (shape fixed, script/timing not).

**Build order resolved.** The previously flagged discrepancy — an
earlier version of this file stated `#17 → #18 (SuperAdmin) → #19
(Subscriptions) → #20 (Notifications)`, contradicting Architecture
§13.2/§13.6 — is now settled by explicit Product Architect direction:

```
#19 Subscriptions → #20 Notifications → #18 SuperAdmin
```

Module numbering is not dependency ordering. This is the authoritative
sequence going forward; `docs/specs/README.md`'s Phase 4 section
records it alongside Module #19's status.

**Next up:** Module #20 (Notifications) readiness analysis — the
remaining prerequisite before any #18 (SuperAdmin) implementation
planning, since #18's Subscriptions & Billing (9.4) and platform
Notifications (9.9) screens both need real Phase-1 data. Readiness
analysis only — not a BDS draft, not implementation, per instruction.

`docs/specs/README.md` updated (Phase 4 table + two notes: Module #19
Acceptance, and the resolved build-order sequence). No implementation,
no schema, no `firestore.rules`, no `src/` changes this session — docs
only.

**Prior status (unchanged this session):** PR-001/PR-002 remain closed.
The Firestore tenant-isolation test suite (16 `describe` blocks, added
in `493c585`) has been **executed** against a real Firebase Rules
Emulator — not just typechecked: 47/47 tests passed, 0 failures, exit
code 0. Results in `docs/security/firestore-tenant-isolation-audit-findings.md`
(commits `cfd1af6`, `5f161a5`, `bd5229b`), reviewed and marked
**Analyzed** by the Product Architect. `Accepted` is a separate,
explicit decision the findings document itself does not self-grant —
check that file's own Section 5 lifecycle table rather than assuming
it here.

Module #17 (Owner Portfolio) remains **Accepted (docs & business
rules)** — unchanged this session, implementation not authorized. See
`docs/specs/17-owner-portfolio.md`'s own "Product Architect Acceptance"
section.

Module #18 (SuperAdmin) — BDS spec drafted (`docs/specs/18-superadmin.md`),
grounded in `docs/architecture/09-superadmin-architecture.md`. Genuinely
greenfield — zero SuperAdmin/platform-scoped code exists anywhere in
`src/`, `server/`, or `firestore.rules`. **Still awaiting architectural
approval; now also gated behind #19 and #20 per the resolved build
order above.**

Module #15 (AI Intelligence) remains drafted but deliberately not
implemented — blocked on Background Worker, SuperAdmin Feature Flags,
Subscriptions, and Notifications, none of which exist yet.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Module #19 is Accepted but not scheduled for
implementation — that authorization is a separate, explicit step not
yet given. Immediate next step is Module #20 readiness analysis, per
explicit instruction — do not begin #19 implementation in the meantime.

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
