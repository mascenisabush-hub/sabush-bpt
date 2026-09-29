// SABUSH BPT — Business Data Reset ("Repor dados"), Owner-requested 2026-09-29.
// Runs the real server module against a fake Firestore, checks the route's
// safety order in source, and proves the on-screen dependency rule equals
// the server's for every combination.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  expandResetScopes,
  collectionsForScopes,
  executeBusinessDataReset,
  parseResetScopes,
  NEVER_DELETED_COLLECTIONS,
  RESET_SCOPE_COLLECTIONS,
  ALL_ONLY_COLLECTIONS,
  type ResetDbLike,
  type AreaScope,
} from '../server/businessDataReset';
import { expandAreas, RESET_AREAS } from '../apps/tenant/src/lib/businessDataResetScopes';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');
const server = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');

test('dependencies: catalog ⇒ stock ⇒ worth; cash stands alone; all = every area', () => {
  assert.deepEqual(expandResetScopes(['catalog']), ['catalog', 'stock', 'worth']);
  assert.deepEqual(expandResetScopes(['stock']), ['stock', 'worth']);
  assert.deepEqual(expandResetScopes(['worth']), ['worth']);
  assert.deepEqual(expandResetScopes(['cash']), ['cash']);
  assert.deepEqual(expandResetScopes(['all']), ['catalog', 'stock', 'cash', 'worth']);
});

test('every business subcollection in firestore.rules is either resettable or explicitly never deleted', () => {
  const block = rules.slice(rules.indexOf('match /businesses/{businessId} {'));
  const top = [...block.matchAll(/^ {6}match \/([a-zA-Z]+)/gm)].map((m) => m[1]);
  const covered = new Set([...Object.values(RESET_SCOPE_COLLECTIONS).flat(), ...ALL_ONLY_COLLECTIONS, ...NEVER_DELETED_COLLECTIONS]);
  const missing = [...new Set(top)].filter((c) => !covered.has(c));
  assert.deepEqual(missing, [], `new collections must be classified for reset: ${missing.join(', ')}`);
});

test('never deleted: staff, subscription payments, support sessions, the reset password — whatever is chosen', () => {
  const everything = collectionsForScopes(['all']);
  for (const kept of NEVER_DELETED_COLLECTIONS) assert.ok(!everything.includes(kept), kept);
  assert.ok(everything.includes('timelineEvents'), 'activity history only with "all"');
  assert.ok(!collectionsForScopes(['catalog', 'cash']).includes('timelineEvents'));
});

test('parseResetScopes rejects anything unknown or empty', () => {
  assert.deepEqual(parseResetScopes(['stock', 'stock']), ['stock']);
  assert.equal(parseResetScopes([]), null);
  assert.equal(parseResetScopes(['staff']), null);
  assert.equal(parseResetScopes('all'), null);
});

test('executeBusinessDataReset deletes exactly the chosen collections (recursively), counts them, clears cached worth', async () => {
  const deleted: string[] = [];
  const merges: Record<string, unknown>[] = [];
  const fake: ResetDbLike = {
    collection: () => ({
      doc: () => ({
        collection: (name: string) => ({ __name: name, count: () => ({ get: async () => ({ data: () => ({ count: name.length }) }) }) }) as never,
        set: async (data) => {
          merges.push(data);
        },
      }),
    }),
    recursiveDelete: async (ref) => {
      deleted.push((ref as unknown as { __name: string }).__name);
    },
  };
  const DEL = Symbol('delete');
  const r = await executeBusinessDataReset(fake, 'bus-1', ['stock'], () => DEL);
  assert.deepEqual(r.scopes, ['stock', 'worth']);
  assert.deepEqual(deleted, [...RESET_SCOPE_COLLECTIONS.stock, ...RESET_SCOPE_COLLECTIONS.worth]);
  assert.equal(r.deletedCounts.stockCounts, 'stockCounts'.length);
  assert.deepEqual(merges, [{ currentWorth: DEL }]);

  deleted.length = 0;
  merges.length = 0;
  const cashOnly = await executeBusinessDataReset(fake, 'bus-1', ['cash'], () => DEL);
  assert.deepEqual(deleted, RESET_SCOPE_COLLECTIONS.cash);
  assert.equal(cashOnly.clearedCurrentWorth, false);
  assert.deepEqual(merges, []);
});

test('the screen applies exactly the server\'s dependency rule, for every combination', () => {
  const areas: AreaScope[] = ['catalog', 'stock', 'cash', 'worth'];
  for (let mask = 0; mask < 16; mask++) {
    const chosen = areas.filter((_, i) => mask & (1 << i));
    assert.deepEqual(expandAreas(chosen, false), expandResetScopes(chosen), `combination ${chosen.join('+') || '(none)'}`);
  }
  assert.deepEqual(expandAreas([], true), expandResetScopes(['all']));
  assert.deepEqual(RESET_AREAS.map((a) => a.scope), areas);
});

test('route safety order: owner check → password (with lockout) → delete → audit', () => {
  const a = server.indexOf("expressApp.post('/api/business/data-reset'");
  const body = server.slice(a, server.indexOf("expressApp.post('/api/staff/delete'", a));
  const owner = body.indexOf('await verifyOwnerOnlyAction(requesterUid, businessId)');
  const pw = body.indexOf('check = await checkClearDataPassword(businessId, password)');
  const del = body.indexOf('await executeBusinessDataReset(');
  const audit = body.indexOf("actionType: 'business.data_reset'");
  assert.ok(owner > 0 && pw > owner && del > pw && audit > del, 'owner → password → delete → audit');
  assert.match(body, /if \(check\.outcome === 'invalid'\) \{\s*res\.status\(403\)/);
  // the verify route and the reset share ONE password check (same lockout)
  assert.equal((server.match(/verifyClearDataPasswordHash\(password, authData\.passwordHash, authData\.salt\)/g) ?? []).length, 1);
  assert.match(server, /const check = await checkClearDataPassword\(businessId, password\);/);
});

test('the audit event type is registered for SuperAdmin filtering (server and client lists)', () => {
  assert.match(readFileSync(new URL('../server/auditLogQuery.ts', import.meta.url), 'utf-8'), /'business\.data_reset',/);
  assert.match(readFileSync(new URL('../apps/superadmin/src/lib/superadminApi.ts', import.meta.url), 'utf-8'), /'business\.data_reset',/);
});

test('Settings: always visible to the owner, no client-side deletion path left', () => {
  const settings = readFileSync(new URL('../apps/tenant/src/components/SettingsModal.tsx', import.meta.url), 'utf-8');
  const ctx = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
  assert.match(settings, /\{isOwner && \(\s*<div className="pt-4 border-t border-gray-200">\s*<h4 className="text-xs font-bold text-gray-700 mb-1">Repor dados<\/h4>/);
  assert.doesNotMatch(ctx, /const clearAllData = async/);
  assert.match(ctx, /fetch\('\/api\/business\/data-reset'/);
  const modal = readFileSync(new URL('../apps/tenant/src/components/BusinessDataResetModal.tsx', import.meta.url), 'utf-8');
  assert.match(modal, /export const CONFIRM_WORD = 'APAGAR';/);
  assert.match(modal, /Criar a password <strong>não apaga nada<\/strong>/);
});
