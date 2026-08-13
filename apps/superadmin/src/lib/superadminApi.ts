import { auth } from './firebase';
import type { PaymentMethod, PaymentStatus } from '@sabush/shared-types';

export class SuperAdminApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const user = auth.currentUser;
  if (!user) {
    throw new SuperAdminApiError(401, 'unauthenticated', 'Sessão não iniciada.');
  }
  const idToken = await user.getIdToken();
  const res = await fetch(`/api/superadmin${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${idToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SuperAdminApiError(
      res.status,
      (body as { error?: string }).error ?? 'unknown',
      (body as { message?: string }).message ?? 'Ocorreu um erro inesperado.'
    );
  }
  return body;
}

export interface PendingPaymentRow {
  id: string;
  businessId: string;
  businessName: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string;
  submittedAt: string;
  submittedBy: string;
}

export async function fetchPendingPayments(): Promise<PendingPaymentRow[]> {
  const body = (await authedFetch('/payments/pending')) as { payments: PendingPaymentRow[] };
  return body.payments;
}

export interface PaymentDetail {
  id: string;
  businessId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string;
  submittedAt: string;
  submittedBy: string;
  status: PaymentStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

export interface PaymentDetailResponse {
  payment: PaymentDetail;
  businessName: string | null;
  subscriptionStatus: string | null;
}

export async function fetchPaymentDetail(businessId: string, paymentId: string): Promise<PaymentDetailResponse> {
  return (await authedFetch(`/payments/${encodeURIComponent(businessId)}/${encodeURIComponent(paymentId)}`)) as PaymentDetailResponse;
}

export interface ConfirmPaymentResult {
  outcome: 'confirmed';
  transitionReason: string;
  subscriptionStatus: string | null;
  auditLogged?: false;
}

export async function confirmPaymentAction(businessId: string, paymentId: string): Promise<ConfirmPaymentResult> {
  return (await authedFetch(`/payments/${encodeURIComponent(businessId)}/${encodeURIComponent(paymentId)}/confirm`, {
    method: 'POST',
  })) as ConfirmPaymentResult;
}

export interface RejectPaymentResult {
  outcome: 'rejected';
  subscriptionStatus: string | null;
  auditLogged?: false;
}

export async function rejectPaymentAction(businessId: string, paymentId: string, reason: string): Promise<RejectPaymentResult> {
  return (await authedFetch(`/payments/${encodeURIComponent(businessId)}/${encodeURIComponent(paymentId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })) as RejectPaymentResult;
}

export interface AuditLogEntryRow {
  id: string;
  actorUid: string;
  actorRole: string;
  actionType: string;
  targetBusinessId: string | null;
  justification: string | null;
  timestamp: string;
}

export async function fetchAuditLog(): Promise<AuditLogEntryRow[]> {
  const body = (await authedFetch('/audit-log')) as { entries: AuditLogEntryRow[] };
  return body.entries;
}
