// Subscription payment submission — regression test for the bug where
// every client who left the optional "notes" box empty saw the payment
// submission fail (Firestore rejects `undefined` field values because
// ignoreUndefinedProperties is not enabled in apps/tenant/src/lib/firebase.ts).
//
// WHAT THIS PROVES:
//   1. buildPendingPayment never emits a field whose value is `undefined`
//      (checked recursively), for every notes shape a real client can
//      produce: undefined, '', whitespace-only, and real text.
//   2. `notes` is present (trimmed) only when there is something to record.
//   3. The payload shape firestore.rules' payments/create requires is
//      intact: status 'pending', currency 'MZN', businessId/submittedBy
//      carried through, and none of the server-only confirmation fields.
//   4. AppContext.submitPayment actually uses the helper and no longer
//      contains the inline `notes: notes ? notes.trim() : undefined`
//      pattern (source-inspection — AppContext.tsx cannot be imported in
//      tests, same documented constraint as the sibling
//      subscription-contact-modal-autoclose.test.ts).
//
// HOW TO RUN:
//   npx tsx --test tests/payment-submission.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildPendingPayment } from '../apps/tenant/src/utils/paymentSubmission';

const base = {
  id: 'pmt-1-abcd',
  businessId: 'biz-1',
  submittedBy: 'uid-1',
  submittedAt: '2026-09-20T10:00:00.000Z',
  amount: 699,
  currency: 'MZN' as const,
  method: 'mpesa' as const,
  reference: '  QGH7X2K9P1  ',
};

function findUndefinedPaths(value: unknown, path = ''): string[] {
  if (value === undefined) return [path || '(root)'];
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    findUndefinedPaths(v, path ? `${path}.${k}` : k)
  );
}

describe('buildPendingPayment — never emits undefined (Firestore rejects it)', () => {
  const notesCases: Array<[string, string | undefined]> = [
    ['notes undefined (box left empty, modal passes `notes || undefined`)', undefined],
    ["notes '' (empty string)", ''],
    ['notes whitespace-only', '   \n\t '],
    ['notes with real text', 'Paguei pelo M-Pesa às 10h'],
  ];

  for (const [label, notes] of notesCases) {
    it(`has no undefined field anywhere — ${label}`, () => {
      const payment = buildPendingPayment({ ...base, notes });
      assert.deepEqual(findUndefinedPaths(payment), []);
    });
  }

  it('omits the notes key entirely when notes is empty/undefined/whitespace', () => {
    for (const notes of [undefined, '', '   \n\t ']) {
      const payment = buildPendingPayment({ ...base, notes });
      assert.equal('notes' in payment, false, `notes key must be absent for ${JSON.stringify(notes)}`);
    }
  });

  it('keeps notes, trimmed, when there is real text', () => {
    const payment = buildPendingPayment({ ...base, notes: '  Paguei pelo M-Pesa  ' });
    assert.equal(payment.notes, 'Paguei pelo M-Pesa');
  });

  it('trims the reference', () => {
    assert.equal(buildPendingPayment({ ...base }).reference, 'QGH7X2K9P1');
  });
});

describe('buildPendingPayment — payload still satisfies firestore.rules payments/create', () => {
  it('is pending, MZN, carries businessId/submittedBy, and has no server-only confirmation fields', () => {
    const payment = buildPendingPayment({ ...base, notes: undefined });
    assert.equal(payment.status, 'pending');
    assert.equal(payment.currency, 'MZN');
    assert.equal(payment.businessId, 'biz-1');
    assert.equal(payment.submittedBy, 'uid-1');
    for (const forbidden of ['confirmedAt', 'confirmedBy', 'rejectedAt', 'rejectedBy', 'rejectionReason']) {
      assert.equal(forbidden in payment, false, `${forbidden} must never be client-supplied`);
    }
  });
});

describe('AppContext.submitPayment wiring (source inspection)', () => {
  const source = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

  // Scoped to submitPayment's own body only — other functions in this large
  // file (e.g. addWithdrawal) are separate modules and out of this test's scope.
  const start = source.indexOf('const submitPayment = async');
  const end = source.indexOf('const checkLatestPaymentAuthoritative');
  assert.ok(start > -1 && end > start, 'Could not locate submitPayment body in AppContext.tsx');
  const submitPaymentBody = source.slice(start, end);

  it('builds the payment through buildPendingPayment', () => {
    assert.match(source, /import \{ buildPendingPayment \} from '\.\.\/utils\/paymentSubmission';/);
    assert.match(submitPaymentBody, /const newPayment: Payment = buildPendingPayment\(/);
  });

  it('no longer assigns `notes: ... : undefined` inline inside submitPayment (the original bug)', () => {
    assert.equal(
      /notes:\s*notes\s*\?\s*notes\.trim\(\)\s*:\s*undefined/.test(submitPaymentBody),
      false,
      'The inline undefined-notes pattern must not come back — Firestore rejects undefined field values.'
    );
  });
});
