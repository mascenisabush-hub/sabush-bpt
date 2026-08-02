# Module #19 (Subscriptions) — Phase 1 (Foundations) Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any BDR,
POL, spec, ADR, or plan; it records that Phase 1's already-approved
scope has been implemented and verified.
**Phase:** #19 Phase 1 — Foundations (per
[`19-subscriptions-implementation-plan.md`](./19-subscriptions-implementation-plan.md)
§13, authorized by the Product Architect following that plan's §15
Recommendation).

---

## 1. Phase Completed

**Module #19, Phase 1 — Foundations.** Scope: `subscriptions/{businessId}`
data model, `firestore.rules` match block, the Business Provisioning
Orchestrator server endpoint (per ADR-0001, Option B), a placeholder V1
plan id. No feature gating, no Trial Engine, no activation logic — that
scope boundary held; nothing outside it was touched.

## 2. Commit Hash

```
4d9d34baadcfbb9510447795565814c58e2e1e97
feat(module-19): Phase 1 (Foundations) — Business Provisioning Orchestrator
```

Confirmed pushed: local `main` and `origin/main` both resolve to this
hash; working tree clean; nothing ahead, nothing behind.

**Files changed (6):** `firestore.rules`, `server/index.ts`,
`src/components/AuthView.tsx`, `src/context/AppContext.tsx`,
`src/types.ts`, `tests/firestore-rules.test.ts`.

## 3. Acceptance Evidence

Verified this session, against the actual repository state (not
assumed from the commit message):

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✅ Clean, zero errors |
| `npm run build` (`vite build` + `build:server`) | ✅ Succeeded. Only pre-existing, unrelated warnings (chunk size, dynamic-import overlap) |
| Diff review — `firestore.rules` | ✅ New `subscriptions/{subscriptionId}` match block confirmed: read scoped to `isOwnerOf` OR (`isMemberOf` AND `staffTier == 'manager'`) — matches spec's "Admin/Manager (view)" wording, narrower than plain `isMemberOf`; `allow write: if false` unconditionally — all writes go through the Admin SDK |
| Diff review — `src/types.ts` | ✅ `SubscriptionStatus` six-value enum matches POL-19-005 exactly; `Subscription` interface matches the spec's Data Model field list; no payment-instrument field present (Business Rule 7) |
| Diff review — `server/index.ts` | ✅ New `POST /api/provisioning/business` endpoint, single Firestore transaction (business doc + owner membership + `trial_pending` subscription doc), server-side `MAX_SHOPS_PER_OWNER` re-check for `addShop` mode, `requireAuth` pattern reused (no new auth mechanism) |
| Diff review — `AuthView.tsx` / `AppContext.tsx` | ✅ Both registration entry points and `addShop` call the Orchestrator instead of direct client writes; best-effort Auth self-cleanup on failure, documented as convenience-only |
| **Emulator rules test** (`npm run test:rules:emulator`) | ❌ **Execution-blocked-by-environment** — emulator binary download fails: `Host not in allowlist: storage.googleapis.com`. Same sandbox network-egress limitation already documented for prior sessions' emulator work (Closing Integrity Amendment, Stage 2/3 migration). Not a new failure, not a code defect. |
| Direct rules test (`npm run test:rules`, no emulator) | Confirms the blocker's shape: 57 tests / 18 suites all `cancelled` (fetch failed — no local emulator listening on :8080). Suite count (18) is consistent with the prior 16 plus the new `subscriptions` `describe` block. |
| `git status` / `git log origin/main..HEAD` | ✅ Clean tree, nothing unpushed |

**Net acceptance status:** Everything executable in this sandbox
(typecheck, build, static diff review against spec/ADR/plan) passes.
The one gate this environment cannot clear — the Firestore emulator run
— remains, as previously flagged repo-wide, a **manual verification
step for you to run locally** before this is treated as fully
production-verified. This is an environment constraint, not a Phase 1
defect, and is consistent with every prior emulator-dependent change in
this repo's history.

## 4. Remaining Out-of-Scope Items (explicitly not done, by design)

- No Trial Engine, activation trigger, or trial state transitions
  (Phase 2).
- No Grace Period, Conversion, or Recovery transitions (Phase 3).
- No SuperAdmin override endpoint (Phase 4).
- No payment/webhook/billing integration (Phase 5, blocked on vendor
  selection).
- No Notification wiring (Phase 6, depends on Module #20).
- No Background Worker (0% built platform-wide; cross-cutting risk
  already tracked, not Phase 1's to resolve).
- Legacy migration mechanics for existing Businesses without a
  subscription doc (spec's "Explicitly Left Open," item 6) — untouched.
- Local emulator run of `tests/firestore-rules.test.ts`'s new
  `subscriptions` block (see §3, above) — outstanding manual step.

## 5. Confirmation: Phase 2 Has Not Begun

No file under `src/`, `server/`, `firestore.rules`, `docs/specs/`, or
`docs/architecture/` was modified this session beyond creating this
close-out record itself. No Trial Engine code, activation-trigger
decision, or state-transition logic exists anywhere in the repository
as of commit `4d9d34b`. Phase 2 Rule 8 Assessment has not yet been
drafted.

---

## Governance Notes

- This record does not modify `docs/specs/19-subscriptions.md`, any
  BDR, any POL, ADR-0001, or the Implementation Plan.
- This record supersedes `HANDOFF.md`'s prior "Right now" section
  (which predated `4d9d34b` and incorrectly stated implementation was
  not authorized) — `HANDOFF.md` is updated separately, alongside this
  file, to reflect current repository truth.
- **Lifecycle:** Implemented → Verified → **Closed** (Phase 1 only).
  Phase 2 begins as its own, separate engineering milestone, gated on
  its own Rule 8 Assessment and its own explicit Product Architect
  authorization.
