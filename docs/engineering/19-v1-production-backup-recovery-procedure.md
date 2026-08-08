# SABUSH BPT — Minimum Production Backup & Recovery Procedure (V1)

**Type:** Operational runbook, not a governance document. Translates
Architecture §12.6's already-Approved design (Firestore point-in-time
recovery as the sole backup mechanism, no custom pipeline) into
concrete, checkable operational steps. Does not change the design —
only states how to verify it's actually in effect and what to do if
recovery is ever needed.
**Origin:** Item 7 of the Release Blocker Resolution pass, per the
Release Readiness Audit's own finding
(`19-v1-completion-review-and-release-readiness-audit.md`, §3): the
design was already correct and documented, but no operational
procedure existed translating "we have backups" into concrete,
performable steps.

---

## 1. What Protects Production Data Today

**Firestore's own point-in-time recovery (PITR)** — a Google
Cloud-managed feature, enabled at the project level. Per Architecture
§12.6:

- **RPO (Recovery Point Objective): under 1 hour.**
- **RTO (Recovery Time Objective): under 4 hours** for a full
  project-level restore — **stated as a target, not yet verified by
  an actual restore drill.** Treat this number as an assumption until
  §4 below has been performed at least once against a real (non-
  production) project.

No custom backup pipeline exists, and per Architecture §12.6's own
reasoning, none should be built — PITR already provides this
correctly, and a parallel custom mechanism would duplicate it.

## 2. Pre-Release Verification Checklist

Before the first real customer's data exists in production, confirm
each of these directly in the Google Cloud / Firebase Console for the
actual production project (none of this is verifiable from the
repository alone — this is the operational gap the Release Readiness
Audit named):

- [ ] **Point-in-time recovery is actually enabled** on the production
      Firestore database (Firebase Console → Firestore → Backups, or
      `gcloud firestore databases describe` — confirm
      `pointInTimeRecoveryEnablement` is `POINT_IN_TIME_RECOVERY_ENABLED`,
      not the default-off state).
- [ ] **The retention window is known and recorded here** once
      confirmed (Firestore's PITR window is a fixed duration set at
      enablement — write the actual number below once verified, do not
      assume the default without checking):
      `RETENTION WINDOW: _____ (fill in after verification)`.
- [ ] **Whoever holds production GCP/Firebase project access is
      identified and documented** — a restore can only be performed by
      someone with the right IAM role; confirm that person/role exists
      and is not a single point of failure (at least two people should
      be able to perform this).
- [ ] **This document's §4 restore drill has been run at least once**,
      against a non-production project or a disposable copy — see §4.

## 3. What a Restore Actually Recovers, and What It Doesn't

- **Recovers:** all Firestore document data (every collection in this
  repository — `businesses`, `products`, `batches`, `subscriptions`,
  `notifications`, everything) as of a chosen point in time within the
  retention window.
- **Does not recover, and doesn't need to:** the application code or
  server itself — per Architecture §12.6's own "stateless by design"
  control, a Railway-level outage or bad deploy requires only
  redeploying the existing container image, never a data-recovery
  process. The server and Background Worker hold no state Firestore
  doesn't already have.
- **Does not recover:** anything deleted permanently outside the
  retention window, or any secret/environment variable configuration
  (`FIREBASE_SERVICE_ACCOUNT_BASE64`, etc.) — those live in Railway's
  own configuration, not in Firestore, and are not covered by Firestore
  PITR at all. **Railway's own environment variable values should be
  recorded somewhere durable outside Railway itself** (a password
  manager or equivalent) — this repository intentionally never stores
  secret values, so losing them from Railway's dashboard with no
  external copy would be a real, separate risk PITR does nothing to
  address.

## 4. Restore Drill Procedure (Perform Before Relying on This)

**Do this against a disposable/non-production project first** — never
rehearse a restore procedure against production data for the first
time.

1. Note the current time.
2. Make a small, identifiable change to a test document (e.g., a known
   test business's `name` field) so the "before" and "after" state is
   visually obvious.
3. Wait a few minutes.
4. Follow Google Cloud's own documented point-in-time-restore procedure
   (via `gcloud firestore databases restore` or the Console) to restore
   to a timestamp **before** step 2's change.
5. Confirm the test document reverted to its pre-change value.
6. **Record the actual wall-clock time this took**, start to finish —
   this is the real data point that either confirms or corrects the
   "under 4 hours" RTO target in §1. Write the result here once run:
   `ACTUAL RESTORE TIME OBSERVED: _____ (fill in after first drill)`.

## 5. If a Real Recovery Is Ever Needed

1. **Stop new writes first**, if at all possible — pause the Railway
   deployment or otherwise halt traffic, so the restore target isn't a
   moving point while the restore is in progress.
2. Identify the correct restore timestamp — as recent as possible
   while still before whatever caused the need for recovery.
3. Perform the restore via Google Cloud's own procedure (same
   mechanism exercised in §4's drill).
4. Verify a sample of restored data against what's expected before
   resuming traffic.
5. Resume the Railway deployment / traffic.
6. **Record what happened** — what triggered the recovery, the
   timestamp restored to, and the actual time taken — as a durable
   record (this document's own revision history, or an incident log,
   whichever this team maintains going forward).

---

## Governance Notes

This document implements no new design — it operationalizes
Architecture §12.6, already Approved. It does not change any RPO/RTO
target; it states clearly that the RTO figure is unverified until §4
is actually performed, which is a fact-finding step, not a design
decision. No code, `firestore.rules`, or `firestore.indexes.json` file
was touched to produce this document.
