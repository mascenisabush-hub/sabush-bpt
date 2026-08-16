// SuperAdmin V1 Operational Control Plane — Phase E: one-time backfill
// CLI entry point for lastActivityAt / subscriptionStatusCache on
// existing businesses.
//
// This is a thin wrapper — all decision/orchestration logic lives in
// server/backfillPhaseE.ts (see that file for the full scope
// explanation: existing businesses only, idempotent, read-only against
// subscriptions/, no background/recurring process).
//
// USAGE:
//   npx tsx server/scripts/backfillPhaseE.ts --dry-run
//   npx tsx server/scripts/backfillPhaseE.ts --apply
//
// --dry-run (recommended first) computes and prints exactly what would
// change without writing anything. --apply performs the real writes.
// Neither flag has been run against production as part of this
// implementation session — this script exists, is verified against a
// fake db in this repository's own test suite, and is ready to run,
// but actually running it against real Firestore is a separate,
// explicit, not-yet-authorized action, per this project's established
// deployment-boundary discipline.
//
// Requires FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment, exactly
// like server/index.ts and every other script in this directory.

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runBackfill, type BackfillDb } from '../backfillPhaseE';

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Same requirement as server/index.ts — ' +
        "see that file's own loadServiceAccount() for how to obtain it."
    );
  }
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
}

async function main() {
  const flag = process.argv[2];

  if (flag !== '--dry-run' && flag !== '--apply') {
    console.error('Usage:\n  npx tsx server/scripts/backfillPhaseE.ts --dry-run\n  npx tsx server/scripts/backfillPhaseE.ts --apply');
    process.exit(1);
  }

  const app = initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore(app) as unknown as BackfillDb;

  console.log(flag === '--dry-run' ? 'Running in DRY-RUN mode — no writes will be made.' : 'Running in APPLY mode — writes WILL be made.');

  const summary = await runBackfill(db, { dryRun: flag === '--dry-run' });

  console.log('');
  console.log('Phase E backfill summary:');
  console.log(`  Total businesses scanned:            ${summary.totalBusinesses}`);
  console.log(`  lastActivityAt backfilled:           ${summary.lastActivityAtBackfilled}`);
  console.log(`  subscriptionStatusCache backfilled:  ${summary.subscriptionStatusCacheBackfilled}`);
  console.log(`  Already complete (no change needed): ${summary.alreadyComplete}`);
  if (summary.missingSubscriptionDoc > 0) {
    console.log(`  WARNING — businesses with no subscriptions/{businessId} doc found: ${summary.missingSubscriptionDoc} (subscriptionStatusCache left unset for these; investigate separately, this script does not invent a value)`);
  }
  if (flag === '--dry-run' && summary.decisions.length > 0) {
    console.log('');
    console.log('Dry run — no writes were made. Re-run with --apply to perform them.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('backfillPhaseE.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
