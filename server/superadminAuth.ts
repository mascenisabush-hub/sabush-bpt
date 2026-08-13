// SuperAdmin Payment Operations V1 Launch Slice — server-side platform-
// operator authorization.
//
// Governing chain: docs/adr/ADR-0005-superadmin-payment-operations-boundary.md
// (architecture) -> docs/specs/18-19-payment-operations-slice.md (BDS,
// BR-3 "real identity only") -> docs/engineering/18-19-payment-operations-rule8-assessment.md
// (this file is that assessment's server/superadminAuth.ts).
//
// Mirrors this codebase's existing verifyStaffManagementAction pattern
// (server/index.ts) applied to a structurally separate identity space
// (Architecture §7.4): platform_operators/{uid} is never the same
// document as users/{uid}, and this function never reads users/{uid}
// at all. The caller's platformRole is re-read from Firestore on every
// privileged request — never trusted from a client-supplied header,
// body field, or cached value, per Architecture Principle 2.9 and this
// codebase's own existing convention.
//
// V1 scope (BDS §3): only platformRole === 'superadmin' is granted
// access to Payment Operations. 'support' and 'developer' are real,
// architecturally-defined values (Architecture §7.4) this function
// still recognizes structurally, but this slice's requirePlatformOperator
// denies them — see the BDS's own "not authorized" list. A future slice
// that widens who can review payments changes the allowlist here, not
// this function's shape.

import type { Request, Response, NextFunction } from 'express';
import type { PlatformRole } from '../packages/shared-types';

// Narrow request shape this module needs — kept independent of
// server/index.ts's own AuthedRequest type so this file has no import
// cycle back into it; server/index.ts's AuthedRequest already
// structurally satisfies this (callerUid: string | undefined). Extends
// Express's own Request (not a bare standalone interface) so every
// handler typed against PlatformOperatorRequest remains a valid
// Express RequestHandler.
interface RequestWithCallerUid extends Request {
  callerUid?: string;
}

interface PlatformOperatorDoc {
  exists: boolean;
  data(): { platformRole?: string } | undefined;
}

interface PlatformOperatorsCollection {
  collection(name: 'platform_operators'): {
    doc(uid: string): { get(): Promise<PlatformOperatorDoc> };
  };
}

export interface PlatformOperatorContext {
  uid: string;
  platformRole: PlatformRole;
}

// Augmented by the middleware below; consumed by every /api/superadmin/*
// route handler exactly like req.callerUid is already consumed today.
export interface PlatformOperatorRequest extends RequestWithCallerUid {
  platformOperator?: PlatformOperatorContext;
}

const VALID_PLATFORM_ROLES: readonly PlatformRole[] = ['support', 'developer', 'superadmin'];

/**
 * Re-reads platform_operators/{uid} for the already-authenticated caller
 * (req.callerUid, set by requireAuth — this function does not itself
 * verify the Firebase ID token; it must always run after requireAuth in
 * the middleware chain) and, if a valid record exists, attaches it as
 * req.platformOperator. Does NOT itself enforce which platformRole is
 * allowed for a given route — that is requireSuperAdmin's job (below),
 * kept separate so a future route needing a different role (e.g.
 * Developer, read-only) can reuse this lookup without duplicating it.
 */
export function createRequirePlatformOperator(db: PlatformOperatorsCollection) {
  return async function requirePlatformOperator(
    req: PlatformOperatorRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const uid = req.callerUid;
    if (!uid) {
      // requireAuth should always run first and already reject this —
      // this is a defensive backstop, not the primary check.
      res.status(401).json({ error: 'unauthenticated', message: 'Autenticação necessária.' });
      return;
    }

    try {
      const snap = await db.collection('platform_operators').doc(uid).get();
      const platformRole = snap.exists ? snap.data()?.platformRole : undefined;

      if (!snap.exists || !platformRole || !VALID_PLATFORM_ROLES.includes(platformRole as PlatformRole)) {
        console.warn('[superadmin-auth] not a platform operator', { uid });
        res.status(403).json({
          error: 'not-platform-operator',
          message: 'Esta conta não é uma conta de operador de plataforma.',
        });
        return;
      }

      req.platformOperator = { uid, platformRole: platformRole as PlatformRole };
      next();
    } catch (err) {
      console.error('[superadmin-auth] platform_operators lookup failed', {
        uid,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao verificar autorização.' });
    }
  };
}

/**
 * V1 Payment Operations gate (BDS §3, §11): only 'superadmin' may
 * confirm/reject payments or read the payment audit trail. Must run
 * after createRequirePlatformOperator(...)'s middleware in the chain —
 * relies on req.platformOperator already being set.
 */
export function requireSuperAdmin(req: PlatformOperatorRequest, res: Response, next: NextFunction): void {
  if (!req.platformOperator) {
    // Misconfigured route (requirePlatformOperator not wired ahead of
    // this) — fail closed, not open.
    res.status(403).json({ error: 'permission-denied', message: 'Autorização de operador de plataforma em falta.' });
    return;
  }
  if (req.platformOperator.platformRole !== 'superadmin') {
    console.warn('[superadmin-auth] platform operator lacks superadmin role', {
      uid: req.platformOperator.uid,
      platformRole: req.platformOperator.platformRole,
    });
    res.status(403).json({
      error: 'permission-denied',
      message: 'Esta ação de pagamento está limitada a contas SuperAdmin.',
    });
    return;
  }
  next();
}
