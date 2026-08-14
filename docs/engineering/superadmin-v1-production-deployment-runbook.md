# SuperAdmin Payment Operations V1 — Production Deployment & Verification Runbook

Status at time of writing: code complete and merged (`main` @ `abeb2fc`),
419/419 tests passing, all 3 builds clean, bundle isolation verified.
Everything below is operational — it happens in the Railway dashboard,
the Firebase console/CLI, and your DNS provider, not in this repository.

Architecture recap (already implemented, do not redesign):

```
Firebase Project: sabush-bpt (Auth + Firestore, shared)
        ^                              ^
        |                              |
  Railway Tenant Service        Railway SuperAdmin Service
  SERVICE_MODE=tenant (default)  SERVICE_MODE=superadmin
  STATIC_DIST_DIR=dist (default) STATIC_DIST_DIR=dist-superadmin
        |                              |
  bpt.sabushtech.com          adminbpt.sabushtech.com
```

Golden rule throughout: **SuperAdmin controls the operation; the existing
subscription engine controls the business state.** Every step below
either sets up infrastructure or verifies that boundary — none of them
touch `server/subscriptionEngine.ts` or `server/paymentConfirmation.ts`.

Do each step in order. Each has a "done when" check — don't move to the
next step until it's satisfied. If anything in a step doesn't match
what's described, stop and re-check before continuing.

---

## Step 1 — Confirm the Firebase project

Firebase Console → confirm the project you're about to use is
**`sabush-bpt`** (same project the tenant service already uses — the
whole point of this architecture is that both services share one
Firebase project, no new project is created).

**Done when:** you're looking at the `sabush-bpt` project dashboard.

---

## Step 2 — Verify production Firestore rules against `main` (hard gate)

This repo has a documented history of production rules drift, so this
runs **before** anything else touches production, not after.

1. Get the currently *deployed* rules:
   ```
   firebase firestore:rules:get --project sabush-bpt
   ```
   (or Firebase Console → Firestore Database → Rules tab)
2. Compare against this repo's `firestore.rules` at `HEAD` (`abeb2fc`).
   Pay specific attention to the collections this slice depends on,
   since these are the ones a stale production ruleset would most
   dangerously get wrong:
   - `platform_operators` — must be `allow read: if isSignedIn() && request.auth.uid == uid;` and `allow write: if false;` (self-read only, no client writes, ever)
   - `platform_audit_log` — append-only, platform-operator-role read access
   - `payments` — whatever this repo's current rules specify
   - `subscriptions`
   - `openBatchLocks` (a previously-drifted collection per repo history)
3. **If they match:** proceed to Step 3.
4. **If they differ:** do not proceed. Deploy the current rules first:
   ```
   firebase deploy --only firestore:rules --project sabush-bpt
   ```
   then re-run `firebase firestore:rules:get` and diff again until they
   match `HEAD` exactly.

**Done when:** deployed rules are byte-for-byte consistent with this
repo's `firestore.rules` at `HEAD`.

---

## Step 3 — Confirm the existing tenant Railway service configuration

Before creating a second service, note down the tenant service's
current settings (Railway dashboard → tenant service → Settings), since
the SuperAdmin service should mirror them except where noted:

- Which repo/branch it deploys from (should be `main`)
- Build command (`npm run build:all` or however the tenant service is
  currently configured — check its actual Settings, don't assume)
- Start command (`node server.js`)
- Its current environment variables (you'll copy the Firebase-related
  ones, not the domain-specific ones)

**Done when:** you know exactly how the tenant service is configured,
so the new service can deliberately match or deliberately differ where
intended.

---

## Step 4 — Create the second Railway service

In the same Railway project as the tenant service:

1. **New Service** → deploy from the same GitHub repo (`sabush-bpt`), same `main` branch
2. Do **not** touch or reconfigure the existing tenant service in this step
3. Name it something identifiable, e.g. `sabush-bpt-superadmin`

**Done when:** a second, independent Railway service exists, pointed at
the same repo, not yet configured or deployed.

---

## Step 5 — Configure the SuperAdmin service's environment variables

Set these on the **new SuperAdmin service only** — the tenant service
needs zero changes (its defaults already match its current behavior):

| Variable | Value | Notes |
|---|---|---|
| `SERVICE_MODE` | `superadmin` | The one flag that switches everything — gates tenant-only routes and disables the background worker in this service |
| `STATIC_DIST_DIR` | `dist-superadmin` | Serves the SuperAdmin SPA instead of the tenant SPA |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | *(same value as tenant service)* | Same Firebase project, same service account — no new credential to generate |
| `VITE_FIREBASE_API_KEY` | *(same value as tenant service)* | |
| `VITE_FIREBASE_AUTH_DOMAIN` | *(same value as tenant service)* | |
| `VITE_FIREBASE_PROJECT_ID` | *(same value as tenant service)* | Should read `sabush-bpt` |
| `VITE_FIREBASE_STORAGE_BUCKET` | *(same value as tenant service)* | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | *(same value as tenant service)* | |
| `VITE_FIREBASE_APP_ID` | *(same value as tenant service)* | |
| `VITE_FIREBASE_MEASUREMENT_ID` | *(same value as tenant service, if set)* | |
| `ALLOWED_ORIGIN` | `https://adminbpt.sabushtech.com` | Optional but recommended — see note below |

**Do not set** `VITE_ENABLE_DEMO_TOOLS=true` on this service (should
stay unset/false, same as production tenant).

**Note on `ALLOWED_ORIGIN`:** the SuperAdmin frontend and its API are
same-origin by design (`fetch('/api/superadmin...')` is a relative
path — this is the architecture decision that avoided the CORS
complexity a Firebase Hosting split would have introduced), so this
isn't strictly required for the app to function. Setting it explicitly
to the SuperAdmin's own domain is just tighter CORS hygiene than
leaving it on the default (`origin: true`, i.e. permissive).

**Do not commit any of these values to git.** Set them directly in
Railway's environment variable UI.

**Done when:** all variables above are set on the SuperAdmin service.

---

## Step 6 — Deploy both services

1. Trigger a deploy of the **SuperAdmin service** (first deploy, or
   redeploy if it auto-deployed with missing env vars in Step 4)
2. Watch its build logs — it should run the same `npm run build:all`
   (or whatever the repo's build script is) and start with
   `node server.js`
3. Confirm in the **startup logs** that it logged something consistent
   with SuperAdmin mode (if nothing currently logs the resolved
   `SERVICE_MODE`, that's fine — the functional checks in Step 9 are
   the real verification)
4. Separately, confirm the **tenant service** is still healthy — check
   `https://bpt.sabushtech.com` loads normally. This deploy should not
   have touched it at all, but verify anyway.

**Done when:** the SuperAdmin service is deployed and running, and the
tenant service is confirmed unaffected.

---

## Step 7 — Configure the `adminbpt.sabushtech.com` domain

1. In Railway → SuperAdmin service → Settings → Domains → **add custom
   domain** → `adminbpt.sabushtech.com`
2. Railway will generate the exact DNS record required (typically a
   `CNAME` pointing at a Railway-provided target) — copy that value
   exactly as shown; don't reuse a value from another Railway service
3. In your DNS provider (wherever `sabushtech.com` is managed), add
   that record
4. Wait for DNS propagation and for Railway to confirm the domain as
   verified/active (usually a few minutes, can take longer)
5. Confirm HTTPS is issued automatically (Railway handles this, same as
   it does for `bpt.sabushtech.com`)

**Done when:** `https://adminbpt.sabushtech.com` loads over HTTPS and
shows the SuperAdmin sign-in screen (not a 404, not the tenant app).

---

## Step 8 — Provision the first platform operator

This is a one-time, Admin-SDK-only script — there's no UI for this yet
(deliberately out of scope for this slice).

1. Find the Firebase Auth UID of the person who will be the first
   SuperAdmin operator: Firebase Console → Authentication → find their
   account → copy the UID. (If they don't have a Firebase Auth account
   yet, they need one first — this script does not create one.)
2. From an environment with `FIREBASE_SERVICE_ACCOUNT_BASE64` set for
   `sabush-bpt` (your local machine, or wherever you're comfortable
   running this):
   ```
   npx tsx server/scripts/provisionPlatformOperator.ts <uid> superadmin
   ```
3. Confirm the script prints:
   ```
   Provisioned platform_operators/<uid> with platformRole: superadmin.
   This account can now sign in to apps/superadmin and use Payment Operations.
   ```
4. Verify directly in Firestore Console: `platform_operators/<uid>`
   exists, contains exactly `{ platformRole: "superadmin" }`, and
   nothing else.

**Do not** manually create this document in the Firestore Console
instead of using the script, and don't print or share the UID/service
account contents anywhere outside this controlled process.

**Done when:** `platform_operators/<uid>` exists with the correct role,
verified by reading it back.

---

## Step 9 — Authentication verification

Before touching any payment:

1. Open `https://adminbpt.sabushtech.com`
2. Sign in as the operator provisioned in Step 8 → should reach the
   Pending Payments screen
3. **Negative test:** sign in (or have someone sign in) with a Firebase
   Auth account that is *not* in `platform_operators` → should be
   denied access to any privileged screen/action. This proves the
   server re-verifies `platform_operators/{uid}` on every request
   rather than trusting anything client-side.

**Done when:** the provisioned operator can sign in and reach the app;
an unprovisioned user cannot access privileged operations.

---

## Step 10 — Controlled test payment: submission

Use a real but low-stakes/test tenant business — not a live paying
customer's actual first payment.

1. In `https://bpt.sabushtech.com`, as that test business, go through
   the existing Subscribe flow
2. Select a payment method, submit the payment, enter a transaction
   reference you'll recognize later (e.g. `TEST-RUNBOOK-001`)
3. Confirm the resulting `Payment` document has `status: pending`
4. Confirm the business's subscription state is unchanged (not
   activated) — this proves submission alone never activates anything

**Done when:** exactly one recognizable `pending` payment exists for
your test business.

---

## Step 11 — Controlled test payment: SuperAdmin review

1. In `https://adminbpt.sabushtech.com`, open Pending Payments
2. Confirm the test payment from Step 10 appears (business identity,
   amount, method, and your `TEST-RUNBOOK-001` reference all correct)
3. Open its detail view — confirm all fields display correctly

**Done when:** the exact payment you submitted is visible and correct
in the SuperAdmin queue.

---

## Step 12 — Confirm the payment, verify the engine boundary

1. Click Confirm on the test payment
2. Confirm the UI reflects success (not an optimistic "confirmed"
   state shown before the server actually responds — the app is built
   to wait for the real server response)
3. Verify server-side that this went through the existing chain and
   nothing else:
   - `Payment.status` → `confirmed`
   - the write path was `confirmPayment()` (server/paymentConfirmation.ts) → the existing subscription engine — there is no second/direct write to `subscriptions/*` from the SuperAdmin route (already verified in source during implementation; this step re-confirms it in the actual resulting data, not just the code)
   - `subscriptions/{businessId}` → now `Active`
4. Reload `https://bpt.sabushtech.com` as the test business → confirm
   it now shows active subscription capabilities

**Done when:** the full chain — pending → SuperAdmin confirm →
`confirmPayment()` → subscription engine → active subscription →
visible to the customer — is observed end to end.

---

## Step 13 — Audit trail verification

In the SuperAdmin app's Audit Log:

1. Confirm an entry exists for the Step 12 confirmation, containing:
   operator identity, action, the payment/business reference, and a
   timestamp
2. Confirm it's readable only as a platform operator (re-check: a
   non-operator Firebase user cannot read `platform_audit_log`)

**Done when:** the confirmation action is correctly and completely
recorded.

---

## Step 14 — Idempotency test

1. Attempt to confirm the *same* already-confirmed payment again
   (whatever the UI allows — if the button is disabled, try hitting the
   route directly with the same payment ID)
2. Verify: no duplicate subscription activation, no corrupted
   subscription state, no duplicate audit entry implying a second real
   action occurred

**Done when:** repeating the confirmation is a safe no-op, not a second
activation.

---

## Step 15 — Rejection test

Using a **second** controlled test payment (repeat Step 10 with a new
reference, e.g. `TEST-RUNBOOK-002`):

1. In SuperAdmin, open it and click Reject instead of Confirm
2. Verify: `Payment.status` → `rejected`
3. Verify: the business's subscription is **not** activated
4. Verify: an audit entry records the rejection

**Done when:** rejection behaves correctly and has zero subscription
side effects.

---

## Step 16 — Authorization negative tests

Confirm, at the server boundary (not just by hiding UI buttons):

1. An ordinary tenant/staff Firebase user cannot call any
   `/api/superadmin/*` route successfully
2. An authenticated-but-unprovisioned user (valid Firebase Auth account,
   no `platform_operators` record) cannot either
3. Only the provisioned operator can

The simplest way to check this without writing new test tooling: try
hitting one of these routes directly (e.g. with `curl` and a non-operator
user's Firebase ID token) and confirm it's rejected:
- `GET /api/superadmin/payments/pending`
- `GET /api/superadmin/payments/:businessId/:paymentId`
- `POST /api/superadmin/payments/:businessId/:paymentId/confirm`
- `POST /api/superadmin/payments/:businessId/:paymentId/reject`
- `GET /api/superadmin/audit-log`

**Done when:** every one of the 5 routes above rejects non-operator
requests.

---

## Step 17 — Confirm the background worker runs exactly once

This is the one hard safety requirement from the implementation phase —
verify it's actually true in production, not just in code:

1. Check the **tenant service's** logs for the periodic
   `[background-worker] job run completed` entries (trial-lifecycle-sweep,
   trial-notification-sweep, closing-notification-sweep,
   breakage-notification-sweep, grace-period-expiry-sweep) — these
   should be running, same as before this change
2. Check the **SuperAdmin service's** logs — these job-run log lines
   should **never** appear there

**Done when:** exactly one service (tenant) is running the background
worker; the SuperAdmin service shows zero worker activity.

---

## Step 18 — Final production checklist

- [ ] `bpt.sabushtech.com` still works, unaffected throughout
- [ ] `adminbpt.sabushtech.com` resolves, HTTPS works
- [ ] Firebase Auth works on both origins
- [ ] Provisioned operator can sign in; unauthorized users cannot
- [ ] Pending payment appeared correctly in SuperAdmin
- [ ] Confirm → `confirmPayment()` → subscription engine → active subscription, observed end to end
- [ ] Audit log entry correct and access-restricted
- [ ] Repeated confirmation is safe (no duplicate activation)
- [ ] Reject → payment rejected, subscription NOT activated
- [ ] All 5 `/api/superadmin/*` routes reject non-operators
- [ ] Background worker runs in the tenant service only
- [ ] Tenant bundle contains no SuperAdmin code (already verified pre-deploy; spot-check via browser devtools on `bpt.sabushtech.com` if you want extra confidence)
- [ ] SuperAdmin bundle contains no tenant app code (same)
- [ ] Firestore rules match `HEAD` (Step 2, re-verify if any rules were touched since)
- [ ] No secrets ended up in git anywhere in this process

Once every box is checked: **SuperAdmin Payment Operations V1 is
launch-ready for controlled real use.** Not before — per the original
governance rule, readiness is earned by the controlled end-to-end test
actually succeeding, not by builds/deploys merely completing.

---

## If something doesn't check out

Stop at that exact step and don't improvise a fix on the spot,
especially anything touching `subscriptionEngine.ts`,
`paymentConfirmation.ts`, or Firestore rules for `platform_operators`/
`platform_audit_log` — those are the trust boundary this whole slice
depends on. Note exactly which step failed and what was observed, and
that's the next thing to bring back for a properly scoped fix.
