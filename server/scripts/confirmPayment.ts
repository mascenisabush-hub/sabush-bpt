// Module #19 V1 Manual Payment Bridge — CLI entry point.
//
// Run directly by whoever already holds legitimate Firebase Admin SDK
// credentials (FIREBASE_SERVICE_ACCOUNT_BASE64) — not reachable via any
// HTTP route, not tied to any tenant's Firebase Auth account. This is
// the entire "privileged server-side/Admin SDK boundary" the
// Implementation Authorization's §5 describes — no new authentication
// mechanism, no new secret, no new attack surface: the same trust
// already required to deploy or operate this server at all.
//
// USAGE:
//   npx tsx server/scripts/confirmPayment.ts confirm <businessId> <paymentId> "<your name>"
//   npx tsx server/scripts/confirmPayment.ts reject <businessId> <paymentId> "<your name>" "<reason>"
//
// Requires FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment, exactly
// like server/index.ts itself.

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createSubscriptionEngine, type SubscriptionEngineDb } from '../subscriptionEngine';
import { confirmPayment, rejectPayment, type PaymentConfirmationDb } from '../paymentConfirmation';

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Same requirement as server/index.ts — ' +
        'see that file\'s own loadServiceAccount() for how to obtain it.'
    );
  }
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

async function main() {
  const [action, businessId, paymentId, actor, reason] = process.argv.slice(2);

  if (!action || !businessId || !paymentId || !actor) {
    console.error(
      'Usage:\n' +
        '  confirm: npx tsx server/scripts/confirmPayment.ts confirm <businessId> <paymentId> "<your name>"\n' +
        '  reject:  npx tsx server/scripts/confirmPayment.ts reject <businessId> <paymentId> "<your name>" "<reason>"'
    );
    process.exit(1);
  }

  if (action !== 'confirm' && action !== 'reject') {
    console.error(`Unknown action "${action}" — must be "confirm" or "reject".`);
    process.exit(1);
  }

  if (action === 'reject' && !reason) {
    console.error('A rejection reason is required: confirmPayment.ts reject <businessId> <paymentId> "<your name>" "<reason>"');
    process.exit(1);
  }

  const app = initializeApp({ credential: cert(loadServiceAccount()) });
  const db: Firestore = getFirestore(app);
  // The real Firestore db instance satisfies both interfaces
  // structurally (its collection() accepts any string) — cast per
  // call-site since PaymentConfirmationDb and SubscriptionEngineDb are
  // deliberately independent types, not related by inheritance (see
  // paymentConfirmation.ts's own header for why).
  const engine = createSubscriptionEngine(db as unknown as SubscriptionEngineDb);
  const paymentDb = db as unknown as PaymentConfirmationDb;

  if (action === 'confirm') {
    const result = await confirmPayment(paymentDb, engine, { businessId, paymentId, confirmedBy: actor });
    console.log(JSON.stringify(result, null, 2));
    if (result.outcome === 'not-found') {
      console.error(`No payment found at businesses/${businessId}/payments/${paymentId}.`);
      process.exit(1);
    }
    if (result.outcome === 'already-rejected') {
      console.error('This payment was already rejected — cannot confirm a rejected payment. Reject-then-confirm is not supported; if this is a mistake, the payment record must be corrected manually with a clear audit note.');
      process.exit(1);
    }
    console.log(`Confirmed. Lifecycle transition: ${result.lifecycleTransition ? result.lifecycleTransition.reason : '(no change — see subscriptionEngine.ts for why this can be a correct, expected outcome)'}`);
  } else {
    const result = await rejectPayment(paymentDb, { businessId, paymentId, rejectedBy: actor, rejectionReason: reason! });
    console.log(JSON.stringify(result, null, 2));
    if (result.outcome === 'not-found') {
      console.error(`No payment found at businesses/${businessId}/payments/${paymentId}.`);
      process.exit(1);
    }
    if (result.outcome === 'already-confirmed') {
      console.error('This payment was already confirmed — cannot reject a confirmed payment. The subscription has already been activated.');
      process.exit(1);
    }
    console.log('Rejected. Subscription unchanged (rejection has no lifecycle effect, by design).');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('confirmPayment.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
