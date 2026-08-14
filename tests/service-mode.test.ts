// Service-mode split — unit tests for server/serviceMode.ts.
//
// Covers the Railway-split follow-up to ADR-0005 (SuperAdmin Payment
// Operations V1 Launch Slice): the same server.js runs as either the
// Railway tenant service (default) or a separate Railway SuperAdmin
// service (SERVICE_MODE=superadmin). server/index.ts itself can't be
// imported directly in tests (initializeApp() at module load requires
// real Firebase Admin credentials — see
// tests/superadmin-payment-operations.test.ts's header for the same,
// already-established reasoning), so the decision logic was extracted
// into server/serviceMode.ts specifically to be unit-testable here.
//
// HOW TO RUN:
//   npx tsx --test tests/service-mode.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveServiceMode, isTenantMode, createTenantOnlyMiddleware } from '../server/serviceMode';

describe('resolveServiceMode', () => {
  it('defaults to tenant when SERVICE_MODE is unset', () => {
    assert.equal(resolveServiceMode({}), 'tenant');
  });

  it('defaults to tenant for any value other than exactly "superadmin"', () => {
    assert.equal(resolveServiceMode({ SERVICE_MODE: '' }), 'tenant');
    assert.equal(resolveServiceMode({ SERVICE_MODE: 'SuperAdmin' }), 'tenant');
    assert.equal(resolveServiceMode({ SERVICE_MODE: 'admin' }), 'tenant');
    assert.equal(resolveServiceMode({ SERVICE_MODE: 'tenant' }), 'tenant');
  });

  it('resolves to superadmin only for the exact value "superadmin"', () => {
    assert.equal(resolveServiceMode({ SERVICE_MODE: 'superadmin' }), 'superadmin');
  });
});

describe('isTenantMode', () => {
  it('is true for tenant mode', () => {
    assert.equal(isTenantMode('tenant'), true);
  });

  it('is false for superadmin mode', () => {
    assert.equal(isTenantMode('superadmin'), false);
  });
});

describe('createTenantOnlyMiddleware', () => {
  function makeFakeReqResNext() {
    const req = {};
    let statusCode: number | undefined;
    let jsonBody: unknown;
    let nextCalled = false;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        jsonBody = body;
        return this;
      },
    };
    const next = () => {
      nextCalled = true;
    };
    return {
      req,
      res,
      next,
      getStatusCode: () => statusCode,
      getJsonBody: () => jsonBody,
      wasNextCalled: () => nextCalled,
    };
  }

  it('calls next() in tenant mode, without touching the response', () => {
    const middleware = createTenantOnlyMiddleware(true);
    const h = makeFakeReqResNext();
    middleware(h.req as never, h.res as never, h.next);
    assert.equal(h.wasNextCalled(), true);
    assert.equal(h.getStatusCode(), undefined);
  });

  it('returns 404 and does not call next() in superadmin mode', () => {
    const middleware = createTenantOnlyMiddleware(false);
    const h = makeFakeReqResNext();
    middleware(h.req as never, h.res as never, h.next);
    assert.equal(h.wasNextCalled(), false);
    assert.equal(h.getStatusCode(), 404);
    assert.deepEqual(h.getJsonBody(), { error: 'not-found' });
  });
});
