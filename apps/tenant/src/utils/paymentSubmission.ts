import type { Payment, PaymentMethod } from '../types';

// [Bug fix — subscription payment submission failed for every client who
// left the optional "notes" box empty]
//
// Module #19 V1 Manual Payment Bridge. AppContext.submitPayment() used to
// build the Payment inline with `notes: notes ? notes.trim() : undefined`.
// This repository's Firestore client uses default settings
// (ignoreUndefinedProperties is NOT enabled, src/lib/firebase.ts), and
// setDoc() rejects any field whose value is the literal `undefined` —
// synchronously, before any network I/O — with:
//
//   Function setDoc() called with invalid data. Unsupported field value:
//   undefined (found in field notes in document businesses/.../payments/...)
//
// SubscriptionContactModal passes `notes: notes || undefined`, so every
// submission with an empty notes box (i.e. nearly every client) hit that
// throw, and the raw SDK message was shown as the error. A client who
// happened to type something in notes succeeded, which is why the failure
// looked intermittent. firestore.rules was never involved — payments/create
// does not require `notes`.
//
// The fix mirrors the pattern already documented for the supplier-record
// write in AppContext (conditional spread; never assign `undefined`): the
// `notes` key is simply absent when there is nothing to record, which also
// matches Payment's own `notes?: string` contract.
//
// Kept pure (no Firebase imports, no clock, no randomness) so it can be
// unit-tested directly — AppContext.tsx cannot be imported in tests.

export interface BuildPendingPaymentParams {
  id: string;
  businessId: string;
  submittedBy: string;
  submittedAt: string; // ISO
  amount: number;
  currency: 'MZN';
  method: PaymentMethod;
  reference: string;
  notes?: string;
}

export function buildPendingPayment(params: BuildPendingPaymentParams): Payment {
  const trimmedNotes = params.notes?.trim();
  return {
    id: params.id,
    businessId: params.businessId,
    amount: params.amount,
    currency: params.currency,
    method: params.method,
    reference: params.reference.trim(),
    submittedAt: params.submittedAt,
    submittedBy: params.submittedBy,
    status: 'pending',
    // Key omitted entirely (never `undefined`, never '') when empty or
    // whitespace-only.
    ...(trimmedNotes ? { notes: trimmedNotes } : {}),
  };
}
