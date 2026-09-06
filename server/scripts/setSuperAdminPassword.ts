// One-off operational script — links (or resets) a password credential on
// an EXISTING Firebase Auth account, without touching any other sign-in
// providers already linked to it (e.g. google.com).
//
// Why this is needed: an account created via Google Sign-In has NO
// password credential at all. Calling signInWithEmailAndPassword against
// it fails with `auth/invalid-credential` — not because the password is
// wrong, but because there is no password provider on the account to
// check against. admin.auth().updateUser({ password }) adds the
// email/password provider to the account additively; it does not revoke
// or replace the google.com provider, so Google Sign-In on apps/tenant
// keeps working exactly as before.
//
// Requires FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment — same
// requirement as server/scripts/provisionPlatformOperator.ts.
//
// USAGE:
//   npx tsx setSuperAdminPassword.ts <email> <newPassword>

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set.');
  }
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
}

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Usage: npx tsx setSuperAdminPassword.ts <email> <newPassword>');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error('Firebase requires passwords to be at least 6 characters.');
    process.exit(1);
  }

  const app = initializeApp({ credential: cert(loadServiceAccount()) });
  const auth = getAuth(app);

  const user = await auth.getUserByEmail(email);
  console.log(`Found existing user: uid=${user.uid}`);
  console.log(`Current providers: ${user.providerData.map((p) => p.providerId).join(', ') || '(none)'}`);

  await auth.updateUser(user.uid, { password: newPassword });

  console.log(`\nDone. ${email} can now sign in with email/password using the password you just set.`);
  console.log(`Its uid is: ${user.uid}`);
  console.log(`Remember: this uid also needs a platform_operators/${user.uid} doc with`);
  console.log(`platformRole: "superadmin" for the SuperAdmin panel to actually let it in`);
  console.log(`(see server/scripts/provisionPlatformOperator.ts).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('setSuperAdminPassword.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
