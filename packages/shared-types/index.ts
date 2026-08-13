// packages/shared-types — the ONLY place Payment and Subscription shapes
// are defined. Extracted from apps/tenant/src/types.ts (ADR-0005 /
// docs/engineering/18-19-payment-operations-rule8-assessment.md, migration
// step 2) so apps/superadmin never imports apps/tenant/src/types.ts
// directly (that import path would be a bundling risk — see the Rule 8
// Assessment's Risk 3). apps/tenant/src/types.ts re-exports these same
// types rather than redefining them, so no consumer inside apps/tenant
// needed to change its own imports.
//
// This file is plain TypeScript with no build step of its own — both
// apps resolve it via a `@sabush/shared-types` path alias (see each
// app's vite.config.ts / tsconfig.json). Deliberately not a real npm
// workspace package: this repo has a single root package.json/
// node_modules today (no dependency divergence between the two apps yet
// to justify the added tooling) — see the Rule 8 Assessment §5 for the
// reasoning; promote to real workspaces if/when that changes.
//
// Scope discipline: only the types this slice's server routes and UI
// actually need cross the boundary. Do not add tenant-only types here
// just because they're convenient to reach from apps/superadmin later —
// that recreates the "giant shared package" the BDS explicitly warns
// against.

// ------------------------------------------------------------------
// PAYMENTS (Module #19 V1 Manual Payment Bridge)
// ------------------------------------------------------------------
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';
export type PaymentMethod = 'mpesa' | 'emola' | 'bim';

export interface Payment {
  id: string;
  businessId: string;
  amount: number; // MZN — 699 for V1's single plan (POL-19-011)
  currency: 'MZN';
  method: PaymentMethod;
  // Customer-provided evidence of the external payment — an M-Pesa/
  // e-Mola transaction ID, or a bank transfer reference. Free text;
  // never validated against a real processor (there is none, by
  // design, in this bridge).
  reference: string;
  submittedAt: string; // ISO
  submittedBy: string; // uid of the Owner who submitted it
  status: PaymentStatus;
  // Set only by the server-side confirmation mechanism — never
  // client-writable (firestore.rules: allow update: if false on this
  // collection, matching /subscriptions' own pattern). For an action
  // taken through the SuperAdmin Payment Operations slice, this is a
  // real platform_operators/{uid}, not free text (BR-3).
  confirmedAt?: string; // ISO
  confirmedBy?: string;
  rejectedAt?: string; // ISO
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

// ------------------------------------------------------------------
// SUBSCRIPTIONS (Module #19)
// ------------------------------------------------------------------
// Technical encoding per docs/specs/19-subscriptions.md "Technical
// Status Model" / POL-19-005. These six values, and no others, are
// approved.
export type SubscriptionStatus =
  | 'trial_pending'
  | 'trial_active'
  | 'trial_completed'
  | 'active'
  | 'grace_period'
  | 'expired';

// One document per Business (subscriptions/{businessId}). Created
// exclusively by the server's Business Provisioning Orchestrator —
// never client-writable. SuperAdmin's Payment Operations slice reads
// this READ-ONLY (FR-6, BR-2) — it never writes any field here itself;
// only server/subscriptionEngine.ts's applyLifecycleEvent() does, via
// the unmodified confirmPayment()/rejectPayment().
export interface Subscription {
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  trialActivatedAt: string | null;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  renewalDate: string | null;
  entitlements: {
    business_limit: number;
    feature_flags: { [featureKey: string]: boolean };
  };
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------
// PLATFORM OPERATORS (Architecture §7.4 / §9.1)
// ------------------------------------------------------------------
// First real population of this collection — see ADR-0005 §4 and the
// BDS's Data Model (§8). V1's Payment Operations slice only ever
// grants 'superadmin' (BR: no support/developer payment-review
// capability in this slice); the full three-value union is kept here
// unchanged from Architecture §7.4 so this type doesn't need to change
// again when a later slice provisions the other roles.
export type PlatformRole = 'support' | 'developer' | 'superadmin';

export interface PlatformOperator {
  uid: string;
  platformRole: PlatformRole;
}

// ------------------------------------------------------------------
// PLATFORM AUDIT LOG (Architecture §7.4, schema fixed by §9.6)
// ------------------------------------------------------------------
// V1 Payment Operations slice writes exactly two actionType values.
// The union is deliberately open (string) rather than a closed literal
// union of only those two — §9.6 already names five action types
// across the full Module #18 design (support_session.issued,
// business.suspended, subscription.overridden, flag.changed, plus this
// slice's two) and this type is meant to describe the collection's
// schema in general, not just this slice's write set.
export interface PlatformAuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: PlatformRole;
  actionType: string;
  targetBusinessId?: string;
  targetUid?: string;
  justification?: string;
  timestamp: string; // ISO — server-set, never client-supplied
}
