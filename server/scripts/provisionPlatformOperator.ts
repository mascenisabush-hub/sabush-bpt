// SuperAdmin Payment Operations V1 Launch Slice — platform operator
// provisioning.
//
// §9.12 (Internal Account Management, the full UI for this) is
// explicitly NOT part of this slice (docs/specs/18-19-payment-operations-slice.md
// §11, "Future Considerations" — a known, flagged gap, not silently
// assumed away). Until that screen exists, provisioning the first (and
// any subsequent) platform_operators/{uid} record is a manual,
// Admin-SDK-only step — the same trust boundary
// server/scripts/confirmPayment.ts already operates under, not a new
// one invented for this script.
//
// This script does exactly one thing: writes
// platform_operators/{uid} = { platformRole }. It does not create a
// Firebase Auth account — the uid must already correspond to a real
// Firebase Auth user (Architecture §7.4: "must correspond to a real
// Firebase Auth account — self-service signup is never possible for
// this collection"). Find the uid via Firebase Console > Authentication,
// or `firebase auth:export` for an existing account.
//
// USAGE:
//   npx tsx server/scripts/provisionPlatformOperator.ts <uid> <platformRole>
//   npx tsx server/scripts/provisionPlatformOperator.ts <uid> --revoke
//
// platformRole must be one of: support | developer | superadmin
// (Architecture §7.4). This slice's own routes only ever grant access
// to 'superadmin' (BDS §3/§11) — provisioning 'support'/'developer'
// here is still valid per the data model, it just won't unlock
// anything in this slice yet.
//
// Requires FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment, exactly
// like server/index.ts and server/scripts/confirmPayment.ts.

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { PlatformRole } from '../../packages/shared-types';

const VALID_ROLES: readonly PlatformRole[] = ['support', 'developer', 'superadmin'];

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
  const [uid, roleOrFlag] = process.argv.slice(2);

  if (!uid || !roleOrFlag) {
    console.error(
      'Usage:\n' +
        '  grant:  npx tsx server/scripts/provisionPlatformOperator.ts <uid> <support|developer|superadmin>\n' +
        '  revoke: npx tsx server/scripts/provisionPlatformOperator.ts <uid> --revoke'
    );
    process.exit(1);
  }

  const app = initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore(app);
  const ref = db.collection('platform_operators').doc(uid);

  if (roleOrFlag === '--revoke') {
    await ref.delete();
    console.log(`Revoked platform_operators/${uid}.`);
    process.exit(0);
  }

  if (!VALID_ROLES.includes(roleOrFlag as PlatformRole)) {
    console.error(`Invalid platformRole "${roleOrFlag}" — must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  await ref.set({ platformRole: roleOrFlag });
  console.log(`Provisioned platform_operators/${uid} with platformRole: ${roleOrFlag}.`);
  console.log(
    roleOrFlag === 'superadmin'
      ? 'This account can now sign in to apps/superadmin and use Payment Operations.'
      : 'This account is a real platform operator, but this V1 slice only grants Payment Operations access to platformRole "superadmin" — this account will see "not a platform operator" — style access limits, not a broken app.'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('provisionPlatformOperator.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
