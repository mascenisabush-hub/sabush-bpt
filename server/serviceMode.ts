// Service mode — lets the one server.js run as either the Railway
// tenant service (default, unchanged behavior) or a second, separate
// Railway SuperAdmin service (SERVICE_MODE=superadmin), per the
// Railway-split follow-up to ADR-0005 (SuperAdmin Payment Operations
// V1 Launch Slice). Kept in its own module — not inline in
// server/index.ts — specifically so it's unit-testable: server/index.ts
// calls initializeApp({credential: cert(...)}) at module load time
// (requires real Firebase Admin credentials), so nothing defined there
// can be imported directly in tests. See
// tests/superadmin-payment-operations.test.ts's header for the same,
// already-established reasoning.
//
// This module makes exactly one decision (tenant vs superadmin) and
// exposes it two ways: a boolean tenant-mode routes/jobs can check,
// and a middleware factory tenant-only Express routes can use. It does
// not know about specific routes, jobs, or any business logic.

import type { NextFunction, Request, Response } from 'express';

export type ServiceMode = 'tenant' | 'superadmin';

/**
 * Reads SERVICE_MODE from the given env-like object. Anything other
 * than exactly 'superadmin' — including unset — resolves to 'tenant',
 * so the existing Railway tenant service needs no env var changes.
 */
export function resolveServiceMode(env: Record<string, string | undefined>): ServiceMode {
  return env.SERVICE_MODE === 'superadmin' ? 'superadmin' : 'tenant';
}

export function isTenantMode(mode: ServiceMode): boolean {
  return mode !== 'superadmin';
}

/**
 * Middleware factory. Applied as an EXTRA middleware on tenant-only
 * route registrations (never wraps or replaces the route's own
 * handler/body) — in SuperAdmin mode, the route 404s instead of
 * running its real logic. /api/superadmin/* routes never get this
 * middleware and remain reachable in both modes.
 */
export function createTenantOnlyMiddleware(tenantMode: boolean) {
  return function tenantOnly(_req: Request, res: Response, next: NextFunction): void {
    if (!tenantMode) {
      res.status(404).json({ error: 'not-found' });
      return;
    }
    next();
  };
}
