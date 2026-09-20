# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## EMERGENCY session 2026-09-20 (Product Architect-directed) — read first

**1. SuperAdmin Direct Subscription Activation — built under emergency
instruction, OUTSIDE the signed governance chain.** `POST
/api/superadmin/businesses/:businessId/activate-subscription`
(`requireSuperAdmin` only; body `{method, reference, justification}`), logic in
`server/superadminDirectActivation.ts`, UI in `apps/superadmin/src/pages/BusinessDetail.tsx`
("Subscrição" section). It records a Payment server-side (`submittedBy` = operator,
plan amount 699 MZN, no justification on the owner-readable doc) and drives the EXISTING
unmodified `confirmPayment()` -> Subscription Lifecycle Engine chain — it never writes
`subscriptions/*` itself. One audit entry `subscription.directly_activated` (justification
lives only there). **Eligible states = exactly what the engine governs: `trial_completed`,
`grace_period`, `expired`.** `trial_pending`/`trial_active`/`active`/no-subscription are refused
with nothing written, because governance has never decided whether a payment during a trial
converts to active (see `subscriptionEngine.ts` header) — enabling that needs a Product
Architect policy decision, not an engineering guess. **Needs a retroactive BDR/Policy/Spec/
Rule 8/Authorization record** — none exists yet. Not run against a real SuperAdmin token or
real Firestore (sandbox has neither); covered by `tests/superadmin-direct-activation.test.ts`
(17 tests, real confirmPayment + real engine over an in-memory Firestore).

**2. Bug fix `963f9e6` — subscription payment submission failed for every client who left the
optional notes box empty** (`notes: undefined` -> Firestore rejects; `ignoreUndefinedProperties`
is off). Fixed via `apps/tenant/src/utils/paymentSubmission.ts`; regression test
`tests/payment-submission.test.ts`. **Same bug class, NOT fixed (different module):**
`addWithdrawal` in `AppContext.tsx` writes `reason`/`notes` as `undefined` via `WriteBatch.set`
— confirmed with the real SDK that this throws. Verify in production before assuming it works.

**3. Screenshot/proof-of-payment upload — NOT built.** New capability: needs `storage.rules`
path, Payment schema field, SuperAdmin viewer, and business decisions (is a screenshot
alone enough without a reference? size/type limits? who can view?). Awaiting decisions.

**4. Admin panel (`adminbpt.sabushtech.com`) "not working" — not reproduced, cause unconfirmed.**
Public DNS resolves correctly (CNAME -> `sabush-bpt-superadmin-production-52c6.up.railway.app`,
Cloudflare DNS-only). Server boots and serves correctly in `SERVICE_MODE=superadmin`. Open
leads (all outside the repo): the CNAME target looks like the service's default domain, not a
Railway custom-domain target like the tenant's; missing `VITE_FIREBASE_*` at BUILD time gives a
blank page (`auth/invalid-api-key` at module load); Google Cloud API-key referrer restrictions
not including the admin domain; local ISP resolver cache. Diagnostics patch (startup SPA check,
`/healthz`, config-guard screen) is on branch `wip/admin-panel-diagnostics`, untested, NOT on main.

**Test baseline:** 68 `test:all` scripts run individually = 1260 pass, 1 pre-existing failure
(`staff-management-multishop-authorization`, fails identically on clean main). Note `test:all`
is chained with `&&`, so that failure hides every suite after it — run scripts individually.

---

## Also landed this session (unrelated to the above)

**Bug fix, `apps/tenant/src/components/AddStockView.tsx`:** Owner-reported —
OCR-scanned cost price from a receipt was getting silently wiped to blank
whenever a stock-entry row wasn't auto-recognized and had to be resolved
to an existing product via a "similar product" suggestion, a retyped
exact name, or a silent supplier-wording reuse match. Cause: shared helper
`buildProductMemoryAutofill` always returned `costPrice: undefined` (dead
`newCost` local, never reassigned) which clobbered the row's real cost via
the `{...row, ...fields}` merge in `updateRow`, leaving sellingPrice
autofilled from memory — profit calc silently became 100% until the
operator retyped cost by hand. Fix: the helper no longer returns
`costPrice`/`costPriceAutoFilled`/`costPriceBasisUnit` at all, matching
the pattern already correct in `handleConfirmSupplierWordingCandidate`.
Full repo typecheck and `npm run build` both clean. No schema/Firestore/
rules impact — client-only. **Not yet covered by a dedicated regression
test** (existing tests in this area don't exercise the row-merge path);
worth adding one if this area is touched again.

---

## Right now (SuperAdmin Agent Attended Support Session thread)

**Status:** Implementation Authorization for the SuperAdmin Agent
Attended Support Session is **✅ SIGNED** (Product Architect
SABUSHIMIKE MASCENI, September 11, 2026). Governance sequence:
`BDR-0018` (Approved) → Policy (Approved) → Specification (Accepted,
SPEC-1/SPEC-2/SPEC-3) → Rule 8 (**CLOSED / PASS**, `312f64c`) →
[Implementation Authorization](docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md)
(**✅ Signed, §14**) → **Checkpoints 1–7 implemented** → **Checkpoint 8
(full validation) executed this session.**

**Checkpoint summary (1–7, all implemented and committed):**

1. **Session-scoped Firestore authorization** — `isActiveSupportOperatorForSession()`, narrow session-matched grants on `supportSessions`/`supportViewState`/`pointer`/`webrtcSignaling` (I-12, FR-63).
2. **Invitation/code lifecycle + Session establishment** — `server/supportSessionInvitation.ts`, `server/supportSessionConsumption.ts`.
3. **Bidirectional heartbeat and reconnection** — `server/supportSessionHeartbeat.ts`; `active`↔`reconnecting`↔`ended` state machine (FR-54 as amended–FR-61).
4. **Support View State field-content allowlisting** — `firestore.rules` content-shape enforcement for FR-49/FR-50's four fixed categories.
5. **Pointer rendering / non-interactivity** — `apps/tenant/src/components/SupportPointerOverlay.tsx` (customer-side consumption/render only; operator-side publish mechanism intentionally not built — see "Explicitly deferred," below).
6. **Desktop WebRTC** — `apps/tenant/src/components/SupportDesktopCapture.tsx` (customer/sending) + `apps/superadmin/src/components/SupportDesktopViewer.tsx` (operator/receiving, prop-driven, not yet mounted to any navigation screen); `apps/tenant/src/lib/webrtcIceServers.ts` + `apps/superadmin/src/lib/webrtcIceServers.ts` (STUN-only development default, TURN explicitly deferred to pre-production per Decision 8).
7. **Customer transparency + termination** — `apps/tenant/src/components/SupportSessionBanner.tsx`; `server/supportSessionTermination.ts` (both customer FR-34 and Support-operator FR-35 termination mechanisms; **no** operator-facing disconnect UI built — see "Explicitly deferred," below).

**Checkpoint 8 — Full Validation (this session, read-only + test-execution only, no new functionality):**

- **Plain-unit regression:** all 7 Customer Support test files, **137/137 passing, 0 failed, 0 skipped** (`support-session-invitation` 7, `support-session-consumption` 14, `support-session-heartbeat` 14, `support-session-termination` 17, `support-session-banner` 21, `support-desktop-webrtc` 39, `support-pointer-overlay` 25).
- **Firestore rules emulator (`npm run test:support-session-rules:emulator`):** **attempted, did NOT execute** — `firebase emulators:exec` fails before the emulator even starts: `Error: download failed, status 403: Host not in allowlist: storage.googleapis.com`. This is a sandbox network-egress/tooling failure, not a rules failure — the rules file itself was never loaded or evaluated. Running the test file directly without the emulator wrapper (`npm run test:support-session-rules`) confirms the suite still discovers **41 test cases**, all reported `cancelled` (not passed, not failed) for the identical reason every prior checkpoint has already disclosed.
- **Authorization §10 traceability:** all 10 numbered validation obligations map to existing, currently-passing test evidence, except item 1 (Firestore security-rules tests) and the rules-layer portions of items 2/3/6(race)/7/8, which remain **test-exists, execution-blocked-by-environment** — never falsely reported as passed.
- **Adjacent regression sample** (Authorization §10 item 10): `superadmin-audit-log-query` (33/33), `payment-confirmation` (11/11), `superadmin-activity-touch` (12/12) — all green, confirming no unintended touch of unrelated mechanics.
- **Typecheck/build:** tenant (3 pre-existing, unrelated errors — `InitialStockCountView.tsx`'s `InfoHint`, `reportExport.ts`'s `URL`/`string`), superadmin (0 errors), root/server (15 pre-existing, unrelated errors) — all unchanged from baseline. All three builds (`build`, `build:server`, `build:superadmin`) succeed cleanly.

**Explicitly deferred — never assigned to any of Checkpoints 1–8, not implementation gaps:**
- Support View State publish/subscribe mechanism (the actual client code that reads real tenant UI state and writes/reads it) — only the rules-layer content allowlist (Checkpoint 4) exists.
- Operator-side Pointer publishing (mouse-tracking, writing `{x,y,timestamp}`) — only the customer-side consumption/render (Checkpoint 5) exists.
- Any operator-facing navigation/session-viewing screen in `apps/superadmin` — `SupportDesktopViewer.tsx` remains prop-driven and unmounted for exactly this reason.
- Support-side (operator-facing) disconnect UI/button — the termination *mechanism* (FR-35) is fully built and tested; no visible control calls it yet.
- TURN/relay vendor selection or provisioning — Decision 8 fixes this as a pre-production gate, not a pre-validation one; no vendor is named anywhere in this codebase.

**Four independent readiness states — do not collapse into one "done":**
- **A. Feature implementation complete:** Yes, for everything Checkpoints 1–7 were ever assigned. Not complete for the five deferred items above (which were never assigned to begin with).
- **B. Validation complete:** Yes at the plain-unit/source level (137/137). Partial/blocked at the Firestore-emulator and real-browser level — structurally unreachable in this sandbox, not a code defect.
- **C. Production infrastructure ready:** **No** — TURN/relay remains unprovisioned (Decision 8).
- **D. Production launch authorized:** **No** — no governance artifact in this chain authorizes launch; that remains a separate, future decision.

**Strict implementation boundary (still in force for any future work on this capability):**
- **VIEW + POINT + GUIDE only** — no Support writes, no control mode, no second permission tier, no broad platform-operator tenant access (Authorization §4).
- Session security parameters are fixed and must not change: 5-minute code, 5-attempt lockout, 15-minute cooldown (permanent lock), 60-minute session cap.
- No new lifecycle state machine, heartbeat, or grace-period mechanism may be introduced anywhere this capability's own already-built one already governs.

**Full authorized scope, exclusions, architecture, and required test
surface:**
`docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md`
§§3–13 (§10 specifically for the validation obligations Checkpoint 8 just executed against). Full reasoning trail: `docs/specs/BDR-0018-superadmin-agent-attended-support-session.md`,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`,
`docs/specs/superadmin-agent-attended-support-session-specification.md`
(SPEC-1/SPEC-2/SPEC-3), the Rule 8 Assessment (§§1–8), and the four
`docs/engineering/SUPERADMIN_AGENT_*` investigation docs.

## Next session should

1. **This checkpoint chain (1–8) is now closed.** Any further work on this capability is a new, explicit decision, not an automatic continuation — in particular, none of the five "explicitly deferred" items above is authorized to begin without its own separate instruction naming it specifically.
2. If real emulator/browser validation is ever needed, it requires an environment with network access to `storage.googleapis.com` (Firestore emulator binary) and a real browser runtime (WebRTC) — neither is available in this sandbox; both remain open infrastructure items, not code defects.
3. TURN/relay vendor selection (managed vs. self-hosted) and its exact cost remain an open Implementation Plan/procurement item — required before the desktop path can go to production, not before further development.
4. Otherwise, the still-open items from the prior SuperAdmin panel
   investigation remain open (see
   `docs/engineering/SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md`
   §22): the stale audit-log action-type allowlist, the two pre-
   existing `superadmin-assisted-initial-stock-recovery.test.ts`
   failures, and the still-pending emulator-backed test run for the
   Clear-Data password rules (see prior HANDOFF revision / commit
   `03ccc83`) — none of these block or depend on this session's work.
