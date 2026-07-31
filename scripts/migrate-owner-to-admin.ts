/**
 * Phase 0 Stage 3 — Backfill migration: users/{uid} role: 'owner' -> 'admin'
 *
 * Built per docs/engineering/phase0-stage3-backfill-migration-execution-plan.md
 * (Product-Architect-reviewed at commit 092e89f / tag
 * phase0-owner-admin-stage3-planned-checkpoint). Do not change the
 * approach here without updating that plan first — this script is a
 * direct translation of an already-agreed design, not a place to make
 * new decisions.
 *
 * Standalone one-time script. Not wired into server/index.ts or any
 * HTTP path. Reuses the exact same Firebase Admin credential pattern
 * already used there (FIREBASE_SERVICE_ACCOUNT_BASE64), per plan §2.
 *
 * Usage:
 *   tsx scripts/migrate-owner-to-admin.ts --dry-run   (default-first path, §11: zero writes)
 *   tsx scripts/migrate-owner-to-admin.ts             (performs the real migration)
 *
 * Optional flags:
 *   --batch-size=N     Firestore batch write size (default 400; hard cap 500 per batch)
 *   --sample-limit=N   number of sample document ids to log in dry-run mode (default 20)
 *
 * Optional env vars (all operator-supplied audit fields, per plan §4):
 *   MIGRATION_SCRIPT_GIT_COMMIT   git rev-parse HEAD at invocation time
 *   MIGRATION_OPERATOR            name/email of whoever is running it
 *   MIGRATION_RERUN_COUNT         "1" for a first run, "2" for a second
 *                                 attempt after a prior failure, etc. Not
 *                                 script-tracked (no persistent state is
 *                                 introduced — that would be schema scope
 *                                 creep beyond this migration) — the
 *                                 operator supplies it, same as the other
 *                                 audit fields above.
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ------------------------------------------------------------------
// Credentials — identical pattern to server/index.ts. Do not invent a
// second credential-loading mechanism (plan §2).
// ------------------------------------------------------------------
function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Generate a service account key in ' +
        'Firebase Console → Project Settings → Service Accounts, base64-encode the JSON ' +
        'file, and set it as this environment variable.'
    );
  }
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

// ------------------------------------------------------------------
// CLI args
// ------------------------------------------------------------------
function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const batchSizeArg = argv.find((a) => a.startsWith('--batch-size='));
  const sampleLimitArg = argv.find((a) => a.startsWith('--sample-limit='));

  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 400;
  const sampleLimit = sampleLimitArg ? parseInt(sampleLimitArg.split('=')[1], 10) : 20;

  if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > 500) {
    throw new Error('--batch-size must be an integer between 1 and 500 (Firestore batch write limit).');
  }
  if (!Number.isInteger(sampleLimit) || sampleLimit <= 0) {
    throw new Error('--sample-limit must be a positive integer.');
  }

  return { dryRun, batchSize, sampleLimit };
}

// ------------------------------------------------------------------
// Operational log line helper — structured, single format, per plan §4.
// Fields required by the Product Architect's audit-log decision:
// timestamp, script git commit, operator, scanned/migrated/failed
// counts, rerun count (all present in the final summary line).
// ------------------------------------------------------------------
function logLine(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function main() {
  const { dryRun, batchSize, sampleLimit } = parseArgs(process.argv.slice(2));

  const scriptGitCommit = process.env.MIGRATION_SCRIPT_GIT_COMMIT || '(unset — pass MIGRATION_SCRIPT_GIT_COMMIT=$(git rev-parse HEAD) when invoking)';
  const operator = process.env.MIGRATION_OPERATOR || process.env.USER || '(unset — pass MIGRATION_OPERATOR=<name/email>)';
  const rerunCount = process.env.MIGRATION_RERUN_COUNT || '(unset — pass MIGRATION_RERUN_COUNT=1, 2, ... when invoking)';

  logLine(`Starting owner->admin backfill migration. mode=${dryRun ? 'DRY-RUN' : 'WRITE'} batchSize=${batchSize} scriptGitCommit=${scriptGitCommit} operator=${operator} rerunCount=${rerunCount}`);

  const app = initializeApp({
    credential: cert(loadServiceAccount()),
  });
  const db = getFirestore(app);

  // Query shape is the whole idempotency + correctness story (plan §3, §6):
  // only ever selects documents still holding the legacy value, so a
  // second run is a natural no-op and natively-created 'admin' documents
  // (Stage 2) are never touched.
  const snapshot = await db.collection('users').where('role', '==', 'owner').get();
  const totalScanned = snapshot.size;

  if (totalScanned === 0) {
    logLine(`Total migrated: 0. Remaining role=='owner' documents: 0. Nothing to do. scriptGitCommit=${scriptGitCommit} operator=${operator} rerunCount=${rerunCount}.`);
    return;
  }

  if (dryRun) {
    const sampleIds = snapshot.docs.slice(0, sampleLimit).map((d) => d.id);
    logLine(`DRY RUN — would update ${totalScanned} document(s). Zero writes performed.`);
    logLine(`Sample ids (first ${sampleIds.length} of ${totalScanned}): ${JSON.stringify(sampleIds)}`);
    logLine('Re-run without --dry-run to perform the actual migration.');
    return;
  }

  let migratedCount = 0;
  let failedCount = 0;
  const failedIds: string[] = [];

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = db.batch();

    for (const doc of chunk) {
      // Single-field update only — never a full-document overwrite.
      // This is what makes the non-corruption verification (plan §8.2)
      // structurally guaranteed rather than something to separately check.
      batch.update(doc.ref, { role: 'admin' });
    }

    try {
      await batch.commit();
      migratedCount += chunk.length;
      logLine(`Migrated batch ${batchNumber}: ${chunk.length} document(s), ids ${JSON.stringify(chunk.map((d) => d.id))}`);
    } catch (err) {
      failedCount += chunk.length;
      failedIds.push(...chunk.map((d) => d.id));
      logLine(`ERROR — batch ${batchNumber} failed (${chunk.length} document(s)): ${(err as Error).message}. ids ${JSON.stringify(chunk.map((d) => d.id))}`);
      logLine('Stopping after batch failure per plan §7 — inspect the error above, then re-run the script (idempotent; already-migrated documents are excluded automatically).');
      break;
    }
  }

  logLine(
    `Total migrated: ${migratedCount}. Total failed: ${failedCount}${failedIds.length ? ` (ids: ${JSON.stringify(failedIds)})` : ''}. ` +
      `Total scanned this run: ${totalScanned}. scriptGitCommit=${scriptGitCommit} operator=${operator} rerunCount=${rerunCount}.`
  );
  logLine('Run the completeness check (users where role == \'owner\' must return zero) before proceeding to Stage 4, per plan §8.1.');
}

main().catch((err) => {
  logLine(`FATAL — migration script aborted: ${(err as Error).message}`);
  process.exit(1);
});
