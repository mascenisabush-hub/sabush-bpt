# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Clear-Data Password gate on "Limpar Todos os Dados" —
implemented, typecheck + build verified, **committed and pushed**
(`43f720f`, on top of `9195507`). Nothing mid-flight.

**Note on process:** this shipped directly from a product-owner
request in-session (owner: only-owner/admin can see the button, in
Settings, production-visible, dedicated password) rather than through
the usual Policy → Rule 8 Assessment → Implementation Plan →
Implementation Authorization chain the rest of this repo's recent
history (Track A/B, etc.) follows. Flagging this per CLAUDE.md Rule 2
("never invent new business rules... flag it, don't quietly route
around it") — there is no `docs/specs/POL-*` or `docs/engineering/*-
implementation-authorization.md` backing this change. If this repo's
process is meant to be followed strictly going forward, this change
should get a retroactive spec entry; flagging as an open item rather
than assuming.

**What changed:**
- `apps/tenant/src/components/SettingsModal.tsx` — "Limpar Todos os
  Dados" no longer gated behind `demoToolsEnabled` (dev/demo builds
  only); now visible in production to `isOwner` (role `owner`/`admin`)
  only, same tier as every other owner-only action in this modal.
  `window.confirm()` replaced with two in-app modals (set-password
  flow, confirm-password flow), matching the codebase's own stated
  convention against `confirm()`/`alert()` for destructive actions.
- `apps/tenant/src/context/AppContext.tsx` — added
  `getClearDataPasswordStatus`, `setClearDataPassword`,
  `verifyClearDataPassword`, following the exact fetch/idToken pattern
  `deleteStaffMember` already uses. `clearAllData()` itself is
  byte-for-byte unchanged.
- `server/index.ts` — three new owner/admin-only endpoints under
  `/api/business/clear-data-password/` (`status`, `set`, `verify`).
  Password hashed with Node's built-in `crypto.scrypt` + random salt,
  constant-time compare (`crypto.timingSafeEqual`), 5-failed-attempt
  lockout for 15 minutes. Authorization re-derived server-side from
  `users/{uid}` (owner/admin only, no Manager path, regardless of
  `managerPermissions`) — never trusted from the client.
- `firestore.rules` — new `businesses/{businessId}/private/{docId}`
  path (holds the password hash + lockout state), `allow read, write:
  if false` unconditionally — server (Admin SDK) only, unreachable
  from any client including the owner's own session.

**What this does NOT change:** `clearAllData()`'s own scope is
untouched — it still cannot delete `stockCounts`, `Closings`, or
`ClosedPeriods` (those `firestore.rules` denials are unconditional and
predate this change, per Decision 57 / Closing Integrity Amendment).
The new password is a UX confirmation step in front of an action the
owner already has full Firestore-level authorization to perform
(`isOwnerOf`), not a new access-control boundary.

**Verification done:** `npx tsc --noEmit -p .` and `npm run build` both
clean on the 4 changed files (remaining tsc errors are pre-existing,
confirmed identical via `git stash` before/after in unrelated test
files: `add-stock-product-correction.test.ts`,
`add-stock-typing-and-autofill-bugfix.test.ts`,
`fecho-baseline-anchored-closing.test.ts`,
`startup-investment.test.ts`). No Firestore emulator was available in
this environment, so `tests/firestore-rules.test.ts` was **not** run
against the new `private/{docId}` rule — worth running that
specifically before this reaches real users, since it's the actual
security boundary for the password hash.

## Next session should

1. Decide whether this change needs a retroactive spec/decision doc to
   stay consistent with this repo's own governance process (see "Note
   on process" above) — flagged, not decided.
2. Run `npm run test:rules` (or the full Firestore emulator suite) to
   confirm the new `private/{docId}` rule behaves as written — this
   was verified only by reading, not by emulator test, in this session.
3. Otherwise: no other module is mid-flight. Check
   `docs/specs/README.md` for the next item in the Module Order table
   in `CLAUDE.md` (Multi-Shop #17, SuperAdmin #18 remainder,
   Subscriptions #19, Notifications #20).
