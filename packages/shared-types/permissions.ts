// Owner-granted staff permissions (spec 16-staff-roles.md, amendment
// "Owner-Granted Permissions"). Single source of truth for BOTH the tenant
// app and server/index.ts. firestore.rules cannot import this, so the key
// names below are mirrored there as `hasPerm(businessId, '<area>_<level>')`.
//
// Storage: users/{uid}.permissions and businesses/{id}/staff/{uid}.permissions
// are flat maps of `${area}_${level}` -> true. Written ONLY by the server
// (/api/staff/set-permissions, owner-only), never by any client.
//
// Deliberately NOT here (owner-only, cannot be granted): business data reset,
// changing roles/permissions, managing other managers or the owner,
// subscription and payments, shop add/remove/switch and the owner portfolio,
// and the owner's own account credentials.

export type PermissionLevel = 'view' | 'act';

export const PERMISSION_AREAS = [
  'dashboard',
  'stocks',
  'catalog',
  'addStock',
  'quebras',
  'stockCount',
  'declareWorth',
  'closings',
  'reports',
  'timeline',
  'cashFlow',
  'expenses',
  'withdrawals',
  'investments',
  'staffManagement',
] as const;

export type PermissionArea = (typeof PERMISSION_AREAS)[number];

// staffManagement has a single level ("act") because listing staff is
// meaningless without being able to manage them; it can only ever be granted
// to a manager-tier account (enforced server-side).
const ACT_ONLY: ReadonlySet<PermissionArea> = new Set<PermissionArea>(['staffManagement']);

export type PermissionKey = `${PermissionArea}_${PermissionLevel}`;
export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

export function permissionKey(area: PermissionArea, level: PermissionLevel): PermissionKey {
  return `${area}_${level}` as PermissionKey;
}

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_AREAS.flatMap((area) =>
  ACT_ONLY.has(area)
    ? [permissionKey(area, 'act')]
    : [permissionKey(area, 'view'), permissionKey(area, 'act')]
);

const KEY_SET: ReadonlySet<string> = new Set(ALL_PERMISSION_KEYS);

/** What an ordinary staff account can do today — the starting point. */
export const STAFF_DEFAULT_PERMISSIONS: PermissionMap = {
  addStock_view: true,
  addStock_act: true,
  quebras_view: true,
  quebras_act: true,
};

/** Manager preset: everything grantable. Owner can switch items off per person. */
export const MANAGER_PRESET_PERMISSIONS: PermissionMap = Object.fromEntries(
  ALL_PERMISSION_KEYS.map((k) => [k, true])
) as PermissionMap;

/**
 * Clean untrusted input: known keys only, strict booleans, "act" implies
 * "view", and staffManagement is dropped unless the target is a manager.
 * Always returns a FULL explicit map (every key true/false) so that a saved
 * map is never confused with "never configured" (absent = defaults).
 */
export function normalizePermissions(input: unknown, opts: { isManager: boolean }): Record<PermissionKey, boolean> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = {} as Record<PermissionKey, boolean>;
  for (const key of ALL_PERMISSION_KEYS) out[key] = raw[key] === true && KEY_SET.has(key);
  for (const area of PERMISSION_AREAS) {
    if (ACT_ONLY.has(area)) continue;
    if (out[permissionKey(area, 'act')]) out[permissionKey(area, 'view')] = true;
  }
  if (!opts.isManager) out.staffManagement_act = false;
  return out;
}

interface ProfileLike {
  role?: string;
  staffTier?: string;
  permissions?: unknown;
  managerPermissions?: { closings?: boolean; staffManagement?: boolean };
}

/**
 * Effective permissions for a profile. Owners/admins get everything (callers
 * should short-circuit on role first). A staff profile with an explicit
 * `permissions` map uses it. One without falls back to today's behaviour:
 * staff defaults plus, for legacy managers, their two old grants.
 */
export function effectivePermissions(profile: ProfileLike | null | undefined): PermissionMap {
  if (!profile) return {};
  if (profile.role === 'owner' || profile.role === 'admin') return { ...MANAGER_PRESET_PERMISSIONS };
  if (profile.permissions && typeof profile.permissions === 'object') {
    return normalizePermissions(profile.permissions, { isManager: profile.staffTier === 'manager' });
  }
  const legacy: PermissionMap = { ...STAFF_DEFAULT_PERMISSIONS };
  if (profile.staffTier === 'manager') {
    if (profile.managerPermissions?.closings === true) {
      legacy.closings_view = true;
      legacy.closings_act = true;
    }
    if (profile.managerPermissions?.staffManagement === true) legacy.staffManagement_act = true;
  }
  return legacy;
}
