// Owner-Granted Permissions — pure model tests (no emulator needed).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PERMISSION_KEYS,
  MANAGER_PRESET_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  effectivePermissions,
  normalizePermissions,
} from '../packages/shared-types/permissions';

describe('normalizePermissions', () => {
  it('returns a full explicit map of booleans', () => {
    const out = normalizePermissions({ reports_view: true }, { isManager: false });
    assert.equal(Object.keys(out).length, ALL_PERMISSION_KEYS.length);
    assert.equal(out.reports_view, true);
    assert.equal(out.reports_act, false);
  });
  it('drops unknown keys and non-true values (no owner-only capability can be granted)', () => {
    const out = normalizePermissions(
      { dataReset_act: true, subscription_act: 'yes', reports_view: 1, stocks_view: true },
      { isManager: true }
    ) as Record<string, boolean>;
    assert.equal('dataReset_act' in out, false);
    assert.equal('subscription_act' in out, false);
    assert.equal(out.reports_view, false);
    assert.equal(out.stocks_view, true);
  });
  it('act implies view', () => {
    const out = normalizePermissions({ withdrawals_act: true }, { isManager: false });
    assert.equal(out.withdrawals_view, true);
  });
  it('staffManagement only survives for managers', () => {
    assert.equal(normalizePermissions({ staffManagement_act: true }, { isManager: false }).staffManagement_act, false);
    assert.equal(normalizePermissions({ staffManagement_act: true }, { isManager: true }).staffManagement_act, true);
  });
  it('tolerates garbage input', () => {
    for (const bad of [null, undefined, 'x', 5, []]) {
      const out = normalizePermissions(bad, { isManager: true });
      assert.ok(Object.values(out).every((v) => v === false));
    }
  });
});

describe('effectivePermissions', () => {
  it('owner/admin get everything', () => {
    assert.deepEqual(effectivePermissions({ role: 'admin' }), MANAGER_PRESET_PERMISSIONS);
    assert.deepEqual(effectivePermissions({ role: 'owner' }), MANAGER_PRESET_PERMISSIONS);
  });
  it('unconfigured staff keeps today\'s access only', () => {
    assert.deepEqual(effectivePermissions({ role: 'staff' }), STAFF_DEFAULT_PERMISSIONS);
  });
  it('legacy manager keeps its two old grants on top of staff defaults', () => {
    const p = effectivePermissions({ role: 'staff', staffTier: 'manager', managerPermissions: { closings: true, staffManagement: false } });
    assert.equal(p.closings_act, true);
    assert.equal(p.closings_view, true);
    assert.equal(p.staffManagement_act, undefined);
    assert.equal(p.addStock_act, true);
    assert.equal(p.reports_view, undefined);
  });
  it('an explicit map wins over defaults (owner can switch add-stock off)', () => {
    const p = effectivePermissions({ role: 'staff', permissions: { reports_view: true } });
    assert.equal(p.reports_view, true);
    assert.equal(p.addStock_act, false);
  });
});
