// SuperAdmin V1 Operational Control Plane — Phase E API layer tests
// (BDR-0010, POL-18-001, docs/specs/18-superadmin-business-directory-slice.md
// v1.2).
//
// Scope: GET /api/superadmin/businesses/directory in server/index.ts.
// WHY STATIC/STRUCTURAL: same documented constraint as every prior
// route-level test in this repository (server/index.ts performs
// Firebase Admin initialization at import time, no DI seam exists) —
// this suite reads the actual committed source and asserts the exact
// properties the checkpoint's own architectural boundaries require:
// server-enforced authorization, no duplicated Firestore query
// mechanics in the route, business-level (not Firestore-level)
// request/response shape, and no new audit event. The underlying
// query logic itself is already fully verified — in-memory
// (tests/superadmin-business-directory.test.ts) and against a real
// Firestore engine (tests/superadmin-business-directory-firestore.test.ts)
// — this suite verifies the route is a genuinely thin wrapper around
// that already-proven logic, not a reimplementation of it.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-business-directory-api.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

const SERVER_SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const CLIENT_SOURCE = readFileSync(new URL('../apps/superadmin/src/lib/superadminApi.ts', import.meta.url), 'utf8');

function extractRoute(source: string, path: string): string {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`expressApp\\.get\\(\\s*\\n?\\s*'${escaped}'[\\s\\S]*?\\n\\);`));
  assert.ok(match, `Expected to find the ${path} route in server/index.ts`);
  return match![0];
}

describe('GET /api/superadmin/businesses/directory — server-enforced authorization', () => {
  it('uses the exact same three-part auth chain as every other SuperAdmin route (requireAuth, requirePlatformOperator, requireSuperAdmin)', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    assert.match(route, /requireAuth,/);
    assert.match(route, /requirePlatformOperator,/);
    assert.match(route, /requireSuperAdmin,/);
  });

  it('appears exactly once — no duplicate/parallel route for the same capability', () => {
    const occurrences = SERVER_SOURCE.match(/'\/api\/superadmin\/businesses\/directory'/g) || [];
    assert.equal(occurrences.length, 1);
  });
});

describe('GET /api/superadmin/businesses/directory — no duplicated business logic', () => {
  it('delegates to the real queryBusinessDirectory() — the route itself contains no .where()/.orderBy()/Firestore query construction', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    assert.match(route, /queryBusinessDirectory\(businessDirectoryDb,/);
    assert.ok(!/\.where\(|\.orderBy\(|\.startAfter\(/.test(route), 'The route must not construct its own Firestore query — that logic belongs exclusively in server/businessDirectory.ts, already proven correct by its own dedicated test suites.');
  });

  it('imports queryBusinessDirectory from server/businessDirectory.ts, not a reimplementation', () => {
    assert.match(SERVER_SOURCE, /import \{ queryBusinessDirectory, type BusinessDirectoryDb \} from '\.\/businessDirectory';/);
  });
});

describe('GET /api/superadmin/businesses/directory — business-level request shape, not Firestore mechanics', () => {
  it('accepts business-level query parameters (search, operationalActivity, subscriptionState, suspended, sortBy, cursor) — never a raw field/operator pair', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    for (const param of ['search', 'operationalActivity', 'subscriptionState', 'suspended', 'sortBy', 'cursor']) {
      assert.ok(route.includes(`req.query.${param}`), `Expected the route to read req.query.${param}`);
    }
    // Explicitly confirms no raw Firestore operator/field-name query
    // parameters (e.g. a generic req.query.field + req.query.op pair)
    // exist in this route — the six business-level parameter names
    // checked above are the complete, intentional surface.
    assert.ok(!/req\.query\.field\b/.test(route) && !/req\.query\.op\b/.test(route));
  });
});

describe('GET /api/superadmin/businesses/directory — outcome mapping', () => {
  it('maps an invalid-filter outcome to HTTP 400, matching every other SuperAdmin validation pattern (auditLogQuery.ts\'s own route is the direct precedent)', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    assert.match(route, /result\.outcome === 'invalid'/);
    assert.match(route, /res\.status\(400\)/);
  });

  it('maps a successful outcome to exactly { rows, nextCursor } — the curated DirectoryRow shape, not a raw Firestore document', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    assert.match(route, /res\.json\(\{ rows: result\.rows, nextCursor: result\.nextCursor \}\)/);
  });
});

describe('GET /api/superadmin/businesses/directory — no new audit event', () => {
  it('does not call writeAuditLogEntry — matches the existing, unmodified Phase B precedent that list/search reads are unaudited', () => {
    const route = extractRoute(SERVER_SOURCE, '/api/superadmin/businesses/directory');
    assert.ok(!route.includes('writeAuditLogEntry'), 'The directory list route must remain unaudited, matching GET /api/superadmin/businesses and GET /api/superadmin/operators.');
  });
});

describe('superadminApi.ts — client wrapper, business-level shape', () => {
  it('fetchBusinessDirectory() exists and calls the /businesses/directory endpoint, not a direct Firestore SDK call', () => {
    assert.match(CLIENT_SOURCE, /export async function fetchBusinessDirectory/);
    assert.match(CLIENT_SOURCE, /authedFetch\(`\/businesses\/directory/);
    assert.ok(!CLIENT_SOURCE.includes('firebase/firestore'), 'apps/superadmin must never import the Firestore client SDK directly for directory data — all reads go through the server, matching every prior SuperAdmin phase.');
  });

  it('DIRECTORY_SUBSCRIPTION_STATES reuses the exact six POL-19-005-approved values, not a redefined or extended set', () => {
    const match = CLIENT_SOURCE.match(/DIRECTORY_SUBSCRIPTION_STATES = \[([\s\S]*?)\] as const/);
    assert.ok(match);
    const values = match![1].match(/'[a-z_]+'/g)?.map((s) => s.replace(/'/g, ''));
    assert.deepEqual(values, ['trial_pending', 'trial_active', 'trial_completed', 'active', 'grace_period', 'expired']);
  });
});
