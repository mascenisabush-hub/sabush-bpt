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

// ------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase A (ADR-0006).
// Internal Account Management. Thin wrappers, same shape as every
// function above — no new fetch pattern introduced.
// ------------------------------------------------------------------

export type PlatformRole = 'support' | 'developer' | 'superadmin';

export interface OperatorRow {
  uid: string;
  platformRole: PlatformRole;
}

export async function fetchOperators(): Promise<OperatorRow[]> {
  const body = (await authedFetch('/operators')) as { operators: OperatorRow[] };
  return body.operators;
}

export interface ProvisionOperatorResult {
  outcome: 'provisioned';
  uid: string;
  platformRole: PlatformRole;
  auditLogged?: false;
}

export async function provisionOperator(uid: string, platformRole: PlatformRole): Promise<ProvisionOperatorResult> {
  return (await authedFetch('/operators', {
    method: 'POST',
    body: JSON.stringify({ uid, platformRole }),
  })) as ProvisionOperatorResult;
}

export interface RevokeOperatorResult {
  outcome: 'revoked';
  uid: string;
  auditLogged?: false;
}

export async function revokeOperator(uid: string): Promise<RevokeOperatorResult> {
  return (await authedFetch(`/operators/${encodeURIComponent(uid)}/revoke`, {
    method: 'POST',
  })) as RevokeOperatorResult;
}

// ------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase B (ADR-0006).
// Business Visibility. Thin wrappers, same shape as every function
// above — no new fetch pattern introduced.
// ------------------------------------------------------------------

export interface BusinessSearchRow {
  businessId: string;
  name: string;
}

export async function searchBusinesses(q: string): Promise<BusinessSearchRow[]> {
  const body = (await authedFetch(`/businesses?q=${encodeURIComponent(q)}`)) as { businesses: BusinessSearchRow[] };
  return body.businesses;
}

// ------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase E (BDR-0010,
// POL-18-001). Business Directory. Same thin-wrapper shape as every
// function above — request/response are business-level concepts
// (an activity-state name, a subscription-state name, a suspended
// boolean, a named sort field, an opaque pagination cursor), never
// raw Firestore query mechanics.
// ------------------------------------------------------------------

export type DirectoryOperationalActivity = 'New' | 'Active' | 'Inactive' | 'Dormant';
export type DirectoryOperationalActivityFilter = 'new' | 'active' | 'inactive' | 'dormant';
export type DirectorySortField = 'lastActivityAt' | 'createdAt' | 'name';

// Reuses the exact six POL-19-005-approved values (server/businessDirectory.ts
// validates against this same closed set) — not redefined here.
export const DIRECTORY_SUBSCRIPTION_STATES = [
  'trial_pending',
  'trial_active',
  'trial_completed',
  'active',
  'grace_period',
  'expired',
] as const;

export interface DirectoryFilters {
  search?: string;
  operationalActivity?: DirectoryOperationalActivityFilter;
  subscriptionState?: string;
  suspended?: boolean;
  sortBy?: DirectorySortField;
  cursor?: string;
}

export interface DirectoryRow {
  businessId: string;
  name: string | null;
  operationalActivity: DirectoryOperationalActivity;
  daysSinceActivity: number | null;
  lastActivityAt: string | null;
  subscriptionState: string | null;
  suspended: boolean;
  createdAt: string | null;
  ownerUid: string | null;
}

export interface DirectoryPage {
  rows: DirectoryRow[];
  nextCursor: string | null;
}

export async function fetchBusinessDirectory(filters: DirectoryFilters = {}): Promise<DirectoryPage> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.operationalActivity) params.set('operationalActivity', filters.operationalActivity);
  if (filters.subscriptionState) params.set('subscriptionState', filters.subscriptionState);
  if (filters.suspended !== undefined) params.set('suspended', String(filters.suspended));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  const body = (await authedFetch(`/businesses/directory${qs ? `?${qs}` : ''}`)) as DirectoryPage;
  return body;
}

export interface BusinessDetailStaffRow {
  name: string;
  suspended: boolean;
}

export interface BusinessDetailPaymentRow {
  amount: number | null;
  currency: string | null;
  method: string | null;
  reference: string | null;
  submittedAt: string | null;
  status: string | null;
}

export interface BusinessDetailResponse {
  businessId: string;
  name: string | null;
  category: string | null;
  currencySymbol: string | null;
  createdAt: string | null;
  owner: { name: string | null; email: string | null; createdAt: string | null } | null;
  staff: BusinessDetailStaffRow[];
  subscriptionStatus: string | null;
  recentPayments: BusinessDetailPaymentRow[];
  suspended: boolean;
  auditLogged?: false;
}

export async function fetchBusinessDetail(businessId: string, justification: string): Promise<BusinessDetailResponse> {
  return (await authedFetch(
    `/business/${encodeURIComponent(businessId)}?justification=${encodeURIComponent(justification)}`
  )) as BusinessDetailResponse;
}

// ------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase C (ADR-0006, Gap 1
// CONFIRMED). Business Suspend/Reactivate. Thin wrappers, same shape
// as every function above — no new fetch pattern introduced.
// ------------------------------------------------------------------

export interface SuspendBusinessResult {
  outcome: 'suspended';
  businessId: string;
  auditLogged?: false;
}

export async function suspendBusiness(businessId: string, justification: string): Promise<SuspendBusinessResult> {
  return (await authedFetch(`/business/${encodeURIComponent(businessId)}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ justification }),
  })) as SuspendBusinessResult;
}

export interface ReactivateBusinessResult {
  outcome: 'reactivated';
  businessId: string;
  auditLogged?: false;
}

export async function reactivateBusiness(businessId: string, justification: string): Promise<ReactivateBusinessResult> {
  return (await authedFetch(`/business/${encodeURIComponent(businessId)}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({ justification }),
  })) as ReactivateBusinessResult;
}

// [SuperAdmin-Assisted Initial Stock Recovery — BDR-0016/POL-0009/
// Specification/Rule 8 (READY)/Implementation Authorization, signed
// 2026-08-21] SuperAdmin grants a scoped, 48-hour Authorization
// unlocking Void & Redo eligibility for one exact, otherwise-
// ineligible Initial Stock confirmation. SuperAdmin never performs the
// recovery itself — this call only grants; only the business's own
// Owner can subsequently consume it (server/initialStockRecoveryConsumption.ts,
// a tenant-facing route this SuperAdmin app never calls).
export interface AuthorizeInitialStockRecoveryResult {
  outcome: 'granted';
  businessId: string;
  targetStockCountId: string;
  expiresAtMs: number;
  auditLogged?: false;
}

export async function authorizeInitialStockRecovery(
  businessId: string,
  targetStockCountId: string,
  justification: string
): Promise<AuthorizeInitialStockRecoveryResult> {
  return (await authedFetch(`/initial-stock-recovery/${encodeURIComponent(businessId)}/authorize`, {
    method: 'POST',
    body: JSON.stringify({ targetStockCountId, justification }),
  })) as AuthorizeInitialStockRecoveryResult;
}

// [Business Worth Evolution — Implementation Authorization, Increment
// 8; Specification §26, FR-40-FR-43; Plan §13] A FULLY SEPARATE grant
// call from authorizeInitialStockRecovery immediately above — targets
// a BusinessWorthSnapshot, not a StockCount, and never touches the
// Initial-Stock-specific collection/route (FR-43). Same "grant only,
// never performs the recovery itself" discipline — only the business's
// own Owner can subsequently consume it, via the existing Contagem
// confirmation write path (client-side, not a route this SuperAdmin
// app ever calls).
export interface AuthorizeBusinessWorthRecoveryResult {
  outcome: 'granted';
  businessId: string;
  targetSnapshotId: string;
  targetStockCountId: string;
  expiresAtMs: number;
  auditLogged?: false;
}

export async function authorizeBusinessWorthRecovery(
  businessId: string,
  targetSnapshotId: string,
  justification: string
): Promise<AuthorizeBusinessWorthRecoveryResult> {
  return (await authedFetch(`/business-worth-recovery/${encodeURIComponent(businessId)}/authorize`, {
    method: 'POST',
    body: JSON.stringify({ targetSnapshotId, justification }),
  })) as AuthorizeBusinessWorthRecoveryResult;
}

// SuperAdmin V1 Operational Control Plane — Phase D (ADR-0006). Audit
// Center Filtering. targetUid added to the response shape (Decision C
// — operator-related events target a uid, not a business). Filters
// mirror server/auditLogQuery.ts's AuditLogFilters exactly.
export interface AuditLogEntryRow {
  id: string;
  actorUid: string;
  actorRole: string;
  actionType: string;
  targetBusinessId: string | null;
  targetUid: string | null;
  justification: string | null;
  timestamp: string;
}

// Single source of truth for the SuperAdmin UI's action-type filter —
// reuses the exact same closed list server/auditLogQuery.ts validates
// against, so the two can never drift.
export const KNOWN_ACTION_TYPES = [
  'payment.confirmed',
  'payment.rejected',
  'operator.provisioned',
  'operator.revoked',
  'business.viewed',
  'business.suspended',
  'business.reactivated',
  // [SuperAdmin Audit Center Action-Type Allowlist Correction —
  // Implementation Authorization, 2026-09-06] Kept in sync with
  // server/auditLogQuery.ts's own KNOWN_ACTION_TYPES by hand, per the
  // accepted Implementation Plan's explicit decision not to
  // consolidate these two lists for this correction.
  'initial_stock_recovery.authorized',
  'initial_stock_recovery.consumed',
  'business_worth_recovery.authorized',
  'business_worth_recovery.expired',
] as const;

export interface AuditLogFilters {
  businessId?: string;
  actorUid?: string;
  actionType?: string;
  from?: string;
  to?: string;
}

export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntryRow[]> {
  const params = new URLSearchParams();
  if (filters.businessId) params.set('businessId', filters.businessId);
  if (filters.actorUid) params.set('actorUid', filters.actorUid);
  if (filters.actionType) params.set('actionType', filters.actionType);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  const body = (await authedFetch(`/audit-log${qs ? `?${qs}` : ''}`)) as { entries: AuditLogEntryRow[] };
  return body.entries;
}
