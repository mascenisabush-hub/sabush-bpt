/**
 * Sabush production server.
 *
 * Two jobs:
 *   1. Serve the built SPA (dist/) — this is what Railway actually runs.
 *   2. Expose the one privileged endpoint the client can never perform
 *      itself: permanently deleting a staff member's Firebase Auth account
 *      alongside their Firestore records.
 *
 * This deliberately does NOT use Firebase Cloud Functions — Cloud
 * Functions requires the Blaze billing plan, which isn't reachable from
 * every region/card. Everything here runs on firebase-admin against a
 * service account key, which is free on every Firebase plan (Spark
 * included). It runs on Railway (or any plain Node host) instead.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------
// Firebase Admin init — credentials come from a service account key,
// never from the client. Generate one at:
//   Firebase Console → Project Settings → Service Accounts → Generate new private key
// Base64-encode the downloaded JSON file and set it as the
// FIREBASE_SERVICE_ACCOUNT_BASE64 env var (this sidesteps newline-escaping
// issues you'd otherwise hit pasting a raw private key into an env var).
// ------------------------------------------------------------------
function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Generate a service account key in ' +
        'Firebase Console → Project Settings → Service Accounts, base64-encode the JSON ' +
        'file, and set it as this environment variable.'
    );
  }
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

const app = initializeApp({
  credential: cert(loadServiceAccount()),
});

const db = getFirestore(app);
const auth = getAuth(app);

const expressApp = express();
expressApp.use(express.json());

// Duplicated from src/context/AppContext.tsx's MAX_SHOPS_PER_OWNER —
// Module #19 Business Rule 3 keeps this a Module #17 platform rule,
// unmodified by Subscriptions. Re-checked here so the Business
// Provisioning Orchestrator's addShop mode never trusts the client's
// own count (the client-side check in AppContext.tsx remains a UX
// guard, not the enforcement point, exactly like the pre-Module-#19
// staff-management checks above). If AppContext.tsx's value ever
// changes, this must too — same duplication pattern as
// isDateInsideClosedPeriod() in firestore.rules.
const MAX_SHOPS_PER_OWNER = 10;

// Module #19 Phase 2 (Trial Engine). POL-19-002: fixed and flat across
// every plan, no per-plan override.
const TRIAL_DURATION_DAYS = 30;

// Module #19 Phase 2, Decision 3 (Product Architect, approved): a
// minimal Trial Lifecycle Worker only — a single setInterval inside this
// same process, not a general-purpose scheduled-job framework. Its only
// job is the elapsed-time trial_active -> trial_completed transition.
// Overridable via env var for local testing; defaults to hourly, matching
// Architecture §4.8's own cadence language.
const TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS = Number(process.env.TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS) || 60 * 60 * 1000;

// Same-origin in production (this server also serves the SPA), so CORS is
// mostly relevant for local dev where Vite runs on a different port. Lock
// it down via ALLOWED_ORIGIN in production if the API is ever split out.
expressApp.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
  })
);

// ------------------------------------------------------------------
// Auth middleware — verifies the caller's Firebase ID token. This is the
// only source of truth for "who is calling"; nothing from the request
// body is ever trusted for identity.
// ------------------------------------------------------------------
interface AuthedRequest extends Request {
  callerUid?: string;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'unauthenticated', message: 'Autenticação necessária.' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.callerUid = decoded.uid;
    next();
  } catch (err) {
    res.status(401).json({ error: 'unauthenticated', message: 'Sessão inválida ou expirada.' });
  }
}

// ------------------------------------------------------------------
// Shared permission check for staff-management actions (BDS #16 widens
// this from Admin-only to Admin-or-granted-Manager). The requester must
// actually hold the claimed standing (re-read from Firestore, never
// trusted from the client), and the target staff member must actually
// belong to that same business. A Manager — even one granted
// 'staffManagement' — can never act on another Manager or on the Admin;
// that check depends on the *target's* tier, so it lives here rather
// than in firestore.rules (a rule reading only the caller's profile can't
// safely evaluate it without an extra read per write). Returns an error
// to send back, or null if the check passed.
// ------------------------------------------------------------------
async function verifyStaffManagementAction(
  requesterUid: string,
  staffUid: string,
  businessId: string,
  options: { adminOnly?: boolean } = {}
): Promise<{ status: number; body: { error: string; message: string } } | null> {
  if (staffUid === requesterUid) {
    return { status: 400, body: { error: 'invalid-argument', message: 'Não pode realizar esta ação na sua própria conta.' } };
  }

  const requesterSnap = await db.collection('users').doc(requesterUid).get();
  const requesterProfile = requesterSnap.data();

  if (!requesterSnap.exists || !requesterProfile) {
    return { status: 403, body: { error: 'permission-denied', message: 'Perfil do utilizador não encontrado.' } };
  }

  // [Phase 0 Stage 2 Compatibility Correction] Must match firestore.rules'
  // isOwnerOf() and AppContext.tsx's isOwner — 'owner' and 'admin' are
  // equivalent (Stage 1). Previously 'owner'-only here, which meant every
  // account created after Stage 2 shipped got 403 permission-denied on
  // every privileged staff-management endpoint (delete, suspend,
  // reactivate, reset-pin, set-tier) — not just a UI gap.
  const isAdmin =
    (requesterProfile.role === 'owner' || requesterProfile.role === 'admin') &&
    requesterProfile.businessId === businessId;
  const isGrantedManager =
    !options.adminOnly &&
    requesterProfile.role === 'staff' &&
    requesterProfile.staffTier === 'manager' &&
    requesterProfile.businessId === businessId &&
    requesterProfile.managerPermissions?.staffManagement === true;

  if (!isAdmin && !isGrantedManager) {
    const message = options.adminOnly
      ? 'Apenas o dono pode realizar esta ação.'
      : 'Apenas o dono ou um gestor autorizado pode gerir funcionários.';
    return { status: 403, body: { error: 'permission-denied', message } };
  }

  const [staffProfileSnap, staffRosterSnap] = await Promise.all([
    db.collection('users').doc(staffUid).get(),
    db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
  ]);
  const staffProfile = staffProfileSnap.data();
  const staffRoster = staffRosterSnap.data();

  if (!staffProfileSnap.exists && !staffRosterSnap.exists) {
    return { status: 404, body: { error: 'not-found', message: 'Funcionário não encontrado.' } };
  }

  const belongsToBusiness =
    (staffProfile ? staffProfile.businessId === businessId : true) &&
    (staffRoster ? staffRoster.businessId === businessId : true);

  if (!belongsToBusiness) {
    return { status: 403, body: { error: 'permission-denied', message: 'Este funcionário não pertence ao seu negócio.' } };
  }

  // A Manager (not the Admin) may never act on another Manager or on the
  // Admin — this is the one guard that has to live here rather than in
  // firestore.rules, since it depends on the target's own tier.
  if (isGrantedManager && staffProfile?.staffTier === 'manager') {
    return { status: 403, body: { error: 'permission-denied', message: 'Um gestor não pode gerir outro gestor. Apenas o dono pode fazê-lo.' } };
  }

  return null;
}

// ------------------------------------------------------------------
// POST /api/staff/delete
// Body: { staffUid: string, businessId: string, reason?: string }
// ------------------------------------------------------------------
expressApp.post('/api/staff/delete', requireAuth, async (req: AuthedRequest, res: Response) => {
  const requesterUid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const staffUid = String(req.body?.staffUid || '').trim();
  const businessId = String(req.body?.businessId || '').trim();
  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : undefined;

  if (!staffUid || !businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'staffUid e businessId são obrigatórios.' });
    return;
  }

  // Stage A — authorization + the actual effective, irreversible action
  // (Firebase Auth account deletion). Nothing has changed yet if anything
  // in this stage throws (other than the account already being absent,
  // which is treated as already-done, not a failure), so a plain 500 (no
  // state change) remains accurate here.
  let requesterProfile: FirebaseFirestore.DocumentData;
  let staffName: string;
  let staffEmail: string;
  let authAccountDeleted = true;
  try {
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/delete] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    const staffProfile = staffProfileSnap.data();
    const staffRoster = staffRosterSnap.data();
    staffName = staffProfile?.name || staffRoster?.name || 'Funcionário';
    staffEmail = staffProfile?.email || staffRoster?.email || '';

    try {
      await auth.deleteUser(staffUid);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        authAccountDeleted = false;
        console.log('[staff/delete] auth account already absent, continuing', { requesterUid, staffUid, businessId });
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('[staff/delete] Auth stage failed — no state changed', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Não foi possível remover a conta de autenticação do funcionário.' });
    return;
  }

  // Stage B — Firestore cleanup. The Auth account is already deleted (or
  // already absent) at this point, so a failure here is a partial state
  // — the account access is already fully revoked — never a full failure.
  // NOTE for documentation: `partialFailure: true` here does NOT mean the
  // deletion failed. It means the primary action (Auth account removal,
  // which is what actually revokes access) already succeeded; only the
  // Firestore record cleanup/reconciliation did not complete.
  try {
    const batch = db.batch();
    batch.delete(db.collection('users').doc(staffUid));
    batch.delete(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid));
    await batch.commit();
  } catch (err) {
    console.error('[staff/delete] Firestore stage failed after Auth deletion succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, authAccountDeleted, partialFailure: true, firestoreSyncFailed: true });
    return;
  }

  // Stage C — timeline/audit entry. Auth + Firestore already succeeded, so
  // this is business history only, never a reason to report failure.
  try {
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(timelineId)
      .set({
        id: timelineId,
        type: 'staff-removed',
        date: startedAt.slice(0, 10),
        createdAt: startedAt,
        userName: requesterProfile.name || 'Dono',
        title: 'Funcionário Removido',
        description: `O acesso de "${staffName}" foi permanentemente removido.`,
        details: {
          staffName,
          staffEmail,
          deletedBy: requesterProfile.name || requesterUid,
          reason: reason || undefined,
        },
      });
  } catch (err) {
    console.error('[staff/delete] timeline stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, authAccountDeleted, auditLogged: false });
    return;
  }

  console.log('[staff/delete] success', { requesterUid, staffUid, businessId, authAccountDeleted, timestamp: startedAt });
  res.json({ success: true, staffUid, authAccountDeleted });
});

// ------------------------------------------------------------------
// POST /api/staff/suspend
// Body: { staffUid: string, businessId: string, reason?: string }
//
// Reversible, unlike delete: disables the Firebase Auth account (so no
// new login is possible at all — signInWithEmailAndPassword will fail
// with 'auth/user-disabled') and revokes any already-issued refresh
// tokens (so an already-open session on another device stops being able
// to silently renew its access token). Nothing in Firestore is deleted —
// all of the staff member's entered data (batches, expenses, etc.,
// which live under the business, not under their own uid) is untouched.
// ------------------------------------------------------------------
expressApp.post('/api/staff/suspend', requireAuth, async (req: AuthedRequest, res: Response) => {
  const requesterUid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const staffUid = String(req.body?.staffUid || '').trim();
  const businessId = String(req.body?.businessId || '').trim();
  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : undefined;

  if (!staffUid || !businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'staffUid e businessId são obrigatórios.' });
    return;
  }

  // Stage A — authorization + the actual effective action (Firebase Auth).
  // Nothing has changed yet if anything in this stage throws, so a plain
  // 500 (no state change) remains accurate here.
  let requesterProfile: FirebaseFirestore.DocumentData;
  let staffName: string;
  try {
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/suspend] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || 'Funcionário';

    await auth.updateUser(staffUid, { disabled: true });
    await auth.revokeRefreshTokens(staffUid);
  } catch (err) {
    console.error('[staff/suspend] Auth stage failed — no state changed', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao suspender o funcionário. Tente novamente.' });
    return;
  }

  // Stage B — Firestore sync. The Auth account is already disabled at this
  // point, so a failure here is a partial state, never a full failure.
  try {
    const batch = db.batch();
    batch.update(db.collection('users').doc(staffUid), { suspended: true });
    batch.update(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid), { suspended: true });
    await batch.commit();
  } catch (err) {
    console.error('[staff/suspend] Firestore stage failed after Auth suspension succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, partialFailure: true, firestoreSyncFailed: true });
    return;
  }

  // Stage C — timeline/audit entry. Auth + Firestore already succeeded, so
  // this is business history only, never a reason to report failure.
  try {
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(timelineId)
      .set({
        id: timelineId,
        type: 'staff-suspended',
        date: startedAt.slice(0, 10),
        createdAt: startedAt,
        userName: requesterProfile.name || 'Dono',
        title: 'Funcionário Suspenso',
        description: `O acesso de "${staffName}" foi suspenso.`,
        details: { staffName, suspendedBy: requesterProfile.name || requesterUid, reason: reason || undefined },
      });
  } catch (err) {
    console.error('[staff/suspend] timeline stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, auditLogged: false });
    return;
  }

  console.log('[staff/suspend] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
  res.json({ success: true, staffUid });
});

// ------------------------------------------------------------------
// POST /api/staff/reactivate
// Body: { staffUid: string, businessId: string }
// ------------------------------------------------------------------
expressApp.post('/api/staff/reactivate', requireAuth, async (req: AuthedRequest, res: Response) => {
  const requesterUid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const staffUid = String(req.body?.staffUid || '').trim();
  const businessId = String(req.body?.businessId || '').trim();

  if (!staffUid || !businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'staffUid e businessId são obrigatórios.' });
    return;
  }

  // Stage A — authorization + the actual effective action (Firebase Auth).
  // Nothing has changed yet if anything in this stage throws, so a plain
  // 500 (no state change) remains accurate here.
  let requesterProfile: FirebaseFirestore.DocumentData;
  let staffName: string;
  try {
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/reactivate] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || 'Funcionário';

    await auth.updateUser(staffUid, { disabled: false });
  } catch (err) {
    console.error('[staff/reactivate] Auth stage failed — no state changed', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao reativar o funcionário. Tente novamente.' });
    return;
  }

  // Stage B — Firestore sync. The Auth account is already re-enabled at
  // this point, so a failure here is a partial state, never a full failure.
  try {
    const batch = db.batch();
    batch.update(db.collection('users').doc(staffUid), { suspended: false });
    batch.update(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid), { suspended: false });
    await batch.commit();
  } catch (err) {
    console.error('[staff/reactivate] Firestore stage failed after Auth re-enable succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, partialFailure: true, firestoreSyncFailed: true });
    return;
  }

  // Stage C — timeline/audit entry. Auth + Firestore already succeeded, so
  // this is business history only, never a reason to report failure.
  try {
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(timelineId)
      .set({
        id: timelineId,
        type: 'staff-reactivated',
        date: startedAt.slice(0, 10),
        createdAt: startedAt,
        userName: requesterProfile.name || 'Dono',
        title: 'Funcionário Reativado',
        description: `O acesso de "${staffName}" foi reativado.`,
        details: { staffName, reactivatedBy: requesterProfile.name || requesterUid },
      });
  } catch (err) {
    console.error('[staff/reactivate] timeline stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, auditLogged: false });
    return;
  }

  console.log('[staff/reactivate] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
  res.json({ success: true, staffUid });
});

// ------------------------------------------------------------------
// POST /api/staff/reset-pin
// Body: { staffUid: string, businessId: string, newPin: string }
//
// Lets an owner (re)set a staff member's login PIN — needed both for
// staff created before the PIN-based quick-login existed (whose real
// password may not be 6 digits) and as a plain forgot-PIN recovery path.
// The PIN *is* the Firebase Auth password (quick-login just enters it via
// a numeric pad instead of a text field), so this reuses updateUser
// exactly like a password reset.
// ------------------------------------------------------------------
expressApp.post('/api/staff/reset-pin', requireAuth, async (req: AuthedRequest, res: Response) => {
  const requesterUid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const staffUid = String(req.body?.staffUid || '').trim();
  const businessId = String(req.body?.businessId || '').trim();
  const newPin = String(req.body?.newPin || '').trim();

  if (!staffUid || !businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'staffUid e businessId são obrigatórios.' });
    return;
  }
  if (!/^\d{6}$/.test(newPin)) {
    res.status(400).json({ error: 'invalid-argument', message: 'O PIN deve ter exatamente 6 dígitos numéricos.' });
    return;
  }

  try {
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId, { adminOnly: true });
    if (permissionError) {
      console.warn('[staff/reset-pin] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    const requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    const staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || 'Funcionário';

    await auth.updateUser(staffUid, { password: newPin });
    // Force any already-open session to require the new PIN on its next
    // token refresh, same reasoning as suspend.
    await auth.revokeRefreshTokens(staffUid);

    // Note: unlike suspend/reactivate, no timeline entry here — the PIN
    // itself is never logged anywhere, and "PIN was reset" isn't
    // meaningful business history the way suspension/removal are.

    console.log('[staff/reset-pin] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error('[staff/reset-pin] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao redefinir o PIN. Tente novamente.' });
  }
});

expressApp.get('/api/health', (_req, res) => res.json({ ok: true }));

// ------------------------------------------------------------------
// POST /api/staff/set-tier   (BDS #16 — Staff & Roles)
// Body: { staffUid: string, businessId: string, staffTier: 'staff' | 'manager',
//         managerPermissions?: { closings?: boolean, staffManagement?: boolean } }
//
// Admin-only, deliberately — promoting/demoting a Manager and granting
// or revoking either permission is never delegable to a Manager
// themselves (BDS #16 Business Rules: "Only the Admin can change
// staffTier or managerPermissions for any account"). Writes both the
// authoritative users/{uid} document and its staff/{id} display mirror
// in the same batch, same pattern as suspend/reactivate. Demoting to
// 'staff' always clears managerPermissions back to all-false — a
// permission left dangling on a demoted account, even if it later gets
// re-promoted, would be a stale-grant hole.
// ------------------------------------------------------------------
expressApp.post('/api/staff/set-tier', requireAuth, async (req: AuthedRequest, res: Response) => {
  const requesterUid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const staffUid = String(req.body?.staffUid || '').trim();
  const businessId = String(req.body?.businessId || '').trim();
  const requestedTier = req.body?.staffTier === 'manager' ? 'manager' : 'staff';
  const requestedPermissions = requestedTier === 'manager'
    ? {
        closings: req.body?.managerPermissions?.closings === true,
        staffManagement: req.body?.managerPermissions?.staffManagement === true,
      }
    : { closings: false, staffManagement: false };

  if (!staffUid || !businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'staffUid e businessId são obrigatórios.' });
    return;
  }

  // Stage A+B — permission check, lookups, and the Firestore batch commit,
  // which is the primary/effective action here (there is no separate
  // external Auth mutation for this endpoint, unlike suspend/reactivate/
  // delete). If anything in this stage throws, no state has changed — a
  // plain 500 remains correct and unchanged from before.
  let requesterProfile: FirebaseFirestore.DocumentData;
  let staffName: string;
  let previousTier: 'manager' | 'staff';
  try {
    // Admin-only — this is the one staff-management action a Manager can
    // never perform on anyone, including themselves.
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId, { adminOnly: true });
    if (permissionError) {
      console.warn('[staff/set-tier] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || 'Funcionário';
    previousTier = staffProfileSnap.data()?.staffTier === 'manager' ? 'manager' : 'staff';

    const batch = db.batch();
    batch.update(db.collection('users').doc(staffUid), {
      staffTier: requestedTier,
      managerPermissions: requestedPermissions,
    });
    batch.update(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid), {
      staffTier: requestedTier,
      managerPermissions: requestedPermissions,
    });
    await batch.commit();
  } catch (err) {
    console.error('[staff/set-tier] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao atualizar o nível do funcionário. Tente novamente.' });
    return;
  }

  // Stage C — timeline/audit entry. The batch commit above already
  // succeeded, so this is business history only — a failure here must
  // not be reported as if the tier/permission change itself failed.
  try {
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const eventType =
      previousTier === 'staff' && requestedTier === 'manager' ? 'manager-granted' :
      previousTier === 'manager' && requestedTier === 'staff' ? 'manager-revoked' :
      'manager-permissions-changed';
    const eventTitle =
      eventType === 'manager-granted' ? 'Funcionário Promovido a Gestor' :
      eventType === 'manager-revoked' ? 'Funcionário Despromovido de Gestor' :
      'Permissões de Gestor Alteradas';

    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(timelineId)
      .set({
        id: timelineId,
        type: eventType,
        date: startedAt.slice(0, 10),
        createdAt: startedAt,
        userName: requesterProfile.name || 'Dono',
        title: eventTitle,
        description: `${staffName}: ${requestedTier === 'manager' ? `Gestor (fecho: ${requestedPermissions.closings ? 'sim' : 'não'}, gestão de equipa: ${requestedPermissions.staffManagement ? 'sim' : 'não'})` : 'Funcionário (nível padrão)'}.`,
        details: { staffName, changedBy: requesterProfile.name || requesterUid, staffTier: requestedTier, managerPermissions: requestedPermissions },
      });
  } catch (err) {
    console.error('[staff/set-tier] timeline stage failed after batch commit succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.json({ success: true, staffUid, staffTier: requestedTier, managerPermissions: requestedPermissions, auditLogged: false });
    return;
  }

  console.log('[staff/set-tier] success', { requesterUid, staffUid, businessId, staffTier: requestedTier, timestamp: startedAt });
  res.json({ success: true, staffUid, staffTier: requestedTier, managerPermissions: requestedPermissions });
});

// ------------------------------------------------------------------
// POST /api/provisioning/business
//
// Business Provisioning Orchestrator (ADR-0001, docs/adr/ADR-0001-
// business-provisioning-orchestrator.md). Called by an already-
// authenticated client immediately after either:
//   - Firebase Auth account creation (mode: 'register') — Auth account
//     creation itself stays entirely client-side, unchanged (ADR-0001
//     Decision, Option B); only the Firestore-side provisioning that
//     used to be two separate client setDoc calls in AuthView.tsx
//     moves here, or
//   - an existing Owner/Admin creating an additional shop
//     (mode: 'addShop') — replaces AppContext.tsx's addShop direct
//     client writes, per the Registration & Subscription Creation
//     Architecture Decision's Future Work item on reusing the same
//     pattern for addShop's equivalent, smaller atomicity gap.
//
// Both modes create, in one Firestore transaction: the business doc,
// the owner's membership (users/{uid} create for register, update for
// addShop), and — Module #19 Business Rule 4, "no null subscription
// states, ever" — an initial 'trial_pending' subscriptions/{businessId}
// doc. If the transaction throws, nothing has changed (Firestore
// transactions are all-or-nothing) — a plain 500 is accurate.
//
// Rollback mechanics (Rule 8 Assessment, Module #19 Phase 1, Decision
// 1 — approved): this endpoint does not create or delete any Firebase
// Auth account. If this call fails after the client's own Auth account
// creation already succeeded (register mode only), the client attempts
// a best-effort self-cleanup (auth.currentUser.delete()) — see
// AuthView.tsx. That cleanup is a convenience, never a guarantee; the
// authoritative recovery path is the future Background Worker's
// reconciliation sweep (Architecture §4.8, not yet built — tracked as
// an accepted interim risk for Phase 1, not a blocker).
// ------------------------------------------------------------------
expressApp.post('/api/provisioning/business', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.callerUid!;
  const startedAt = new Date().toISOString();

  const mode = req.body?.mode === 'addShop' ? 'addShop' : req.body?.mode === 'register' ? 'register' : null;
  const businessName = String(req.body?.businessName || '').trim();
  const category = String(req.body?.category || '').trim();
  const currencySymbol = String(req.body?.currencySymbol || 'MT').trim() || 'MT';

  if (!mode) {
    res.status(400).json({ error: 'invalid-argument', message: 'mode deve ser "register" ou "addShop".' });
    return;
  }
  if (!businessName) {
    res.status(400).json({ error: 'invalid-argument', message: 'O nome do negócio é obrigatório.' });
    return;
  }

  const businessId = 'bus-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  // Module #19 v2.0 spec, Data Model + "Plan Definition (minimal, V1)".
  // Phase 1 produces Trial Pending only — no activation logic exists
  // yet (Phase 2). 'v1-default' is a placeholder plan id; the Plan
  // catalogue itself (names, tiers, pricing) remains explicitly out of
  // scope (spec's "Explicitly Left Open," items 1-2).
  const initialSubscription = {
    businessId,
    planId: 'v1-default',
    status: 'trial_pending' as const,
    trialActivatedAt: null,
    trialEndsAt: null,
    gracePeriodEndsAt: null,
    renewalDate: null,
    entitlements: {
      business_limit: MAX_SHOPS_PER_OWNER,
      feature_flags: {},
    },
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  try {
    if (mode === 'register') {
      const email = String(req.body?.email || '').trim();
      const name = String(req.body?.name || '').trim();
      if (!email || !name) {
        res.status(400).json({ error: 'invalid-argument', message: 'email e name são obrigatórios para o registo.' });
        return;
      }

      // register mode is for brand-new accounts only — a profile must
      // not already exist for this uid. This is the server-side
      // guarantee of the same invariant AuthView.tsx's Google Sign-In
      // path already checks client-side (getDoc existence check).
      const existingProfile = await db.collection('users').doc(uid).get();
      if (existingProfile.exists) {
        res.status(409).json({ error: 'already-exists', message: 'Este utilizador já possui um perfil.' });
        return;
      }

      const business = {
        id: businessId,
        name: businessName,
        ownerUid: uid,
        category,
        currencySymbol,
        createdAt: startedAt,
      };
      const userProfile = {
        uid,
        email,
        name,
        role: 'admin',
        businessId,
        businessIds: [businessId],
        activeBusinessId: businessId,
        createdAt: startedAt,
      };

      await db.runTransaction(async (tx) => {
        tx.set(db.collection('businesses').doc(businessId), business);
        tx.set(db.collection('users').doc(uid), userProfile);
        tx.set(db.collection('subscriptions').doc(businessId), initialSubscription);
      });

      console.log('[provisioning/business] register success', { uid, businessId, timestamp: startedAt });
      res.json({ success: true, businessId });
      return;
    }

    // mode === 'addShop' — requester must already be an Owner/Admin.
    // Re-read from Firestore, never trusted from the client, same
    // pattern as verifyStaffManagementAction above.
    const requesterSnap = await db.collection('users').doc(uid).get();
    const requesterProfile = requesterSnap.data();
    if (!requesterSnap.exists || !requesterProfile) {
      res.status(403).json({ error: 'permission-denied', message: 'Perfil do utilizador não encontrado.' });
      return;
    }
    const isAdmin = requesterProfile.role === 'owner' || requesterProfile.role === 'admin';
    if (!isAdmin) {
      res.status(403).json({ error: 'permission-denied', message: 'Apenas o dono pode criar uma nova loja.' });
      return;
    }

    // Re-derive the owner's current shop list server-side, with the
    // same legacy-singular-businessId fallback AppContext.tsx's own
    // ownedBusinessIds derivation uses — MAX_SHOPS_PER_OWNER is
    // re-verified here rather than trusted from the client, which
    // today's client-only check in AppContext.tsx's addShop does not
    // do (Rule 8 Assessment, Security Impact).
    const ownedBusinessIds: string[] =
      Array.isArray(requesterProfile.businessIds) && requesterProfile.businessIds.length > 0
        ? requesterProfile.businessIds
        : requesterProfile.businessId
          ? [requesterProfile.businessId]
          : [];

    if (ownedBusinessIds.length >= MAX_SHOPS_PER_OWNER) {
      res.status(403).json({ error: 'limit-reached', message: `Limite de ${MAX_SHOPS_PER_OWNER} lojas por conta atingido.` });
      return;
    }

    const business = {
      id: businessId,
      name: businessName,
      ownerUid: uid,
      category,
      currencySymbol,
      createdAt: startedAt,
    };

    await db.runTransaction(async (tx) => {
      tx.set(db.collection('businesses').doc(businessId), business);
      tx.update(db.collection('users').doc(uid), {
        businessIds: [...ownedBusinessIds, businessId],
        activeBusinessId: businessId,
      });
      tx.set(db.collection('subscriptions').doc(businessId), initialSubscription);
    });

    console.log('[provisioning/business] addShop success', { uid, businessId, timestamp: startedAt });
    res.json({ success: true, businessId });
  } catch (err) {
    console.error('[provisioning/business] failed — transaction did not commit, no state changed', {
      uid,
      mode,
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'internal', message: 'Não foi possível criar o negócio. Tente novamente.' });
  }
});

// ------------------------------------------------------------------
// Module #19 Phase 2 — Trial Engine
// (docs/engineering/19-phase2-trial-engine-rule8-assessment.md,
// docs/engineering/19-phase2-trial-engine-decisions.md)
// ------------------------------------------------------------------

// Decision 4 (audit scope, approved): every automatic lifecycle
// transition writes one platform_audit_log entry, in the same
// transaction as the state change itself — an automatic transition with
// no corresponding audit entry must be structurally impossible, the same
// guarantee Business Rule 8 already requires for SuperAdmin overrides.
// Auto-id doc (uniqueness isn't load-bearing here — the parent
// subscription's own status guard, checked inside the same transaction,
// is what makes both call sites below idempotent).
function newAuditEventRef() {
  return db.collection('platform_audit_log').doc();
}

// ------------------------------------------------------------------
// POST /api/subscriptions/activate-trial
// Body: { businessId: string }
//
// Decision 1 (activation trigger, approved): fires on "the first
// successful operational transaction that creates enduring business
// value" — a platform-level concept. AppContext.tsx calls this endpoint,
// fire-and-forget, immediately after each of the write paths it maps
// that concept onto today (addStockBatch, addMultipleStockBatches,
// addExpense, addQuebra, recordStockCount) succeeds. That mapping is
// this phase's own implementation detail, per Decision 1's explicit
// delegation — extending it to future operational modules later does
// not require reopening this decision.
//
// Idempotent by construction: only transitions trial_pending ->
// trial_active; any other current status (including a second call after
// the first already activated) is a silent no-op, not an error — this
// endpoint is a best-effort trigger, never a precondition the caller's
// own action depends on succeeding.
// ------------------------------------------------------------------
expressApp.post('/api/subscriptions/activate-trial', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.callerUid!;
  const businessId = String(req.body?.businessId || '').trim();

  if (!businessId) {
    res.status(400).json({ error: 'invalid-argument', message: 'businessId é obrigatório.' });
    return;
  }

  try {
    // Membership check — same derivation as addShop's server-side
    // re-verification above: never trust the client's claim, re-read the
    // caller's own profile.
    const requesterSnap = await db.collection('users').doc(uid).get();
    const requesterProfile = requesterSnap.data();
    if (!requesterSnap.exists || !requesterProfile) {
      res.status(403).json({ error: 'permission-denied', message: 'Perfil do utilizador não encontrado.' });
      return;
    }
    const ownedBusinessIds: string[] =
      Array.isArray(requesterProfile.businessIds) && requesterProfile.businessIds.length > 0
        ? requesterProfile.businessIds
        : requesterProfile.businessId
          ? [requesterProfile.businessId]
          : [];
    const isMember = requesterProfile.businessId === businessId || ownedBusinessIds.includes(businessId);
    if (!isMember) {
      res.status(403).json({ error: 'permission-denied', message: 'Este utilizador não pertence a este negócio.' });
      return;
    }

    const subscriptionRef = db.collection('subscriptions').doc(businessId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(subscriptionRef);
      if (!snap.exists) {
        // Pre-Phase-1 Business without a subscription document yet
        // (legacy migration, spec's "Explicitly Left Open" item 6, not
        // yet built). Not an error — this endpoint is best-effort.
        return { activated: false, status: null as string | null };
      }
      const current = snap.data()!;
      if (current.status !== 'trial_pending') {
        // Already activated (or past activation) — idempotent no-op.
        return { activated: false, status: current.status as string };
      }

      const now = new Date();
      const trialActivatedAt = now.toISOString();
      const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

      tx.update(subscriptionRef, {
        status: 'trial_active',
        trialActivatedAt,
        trialEndsAt,
        updatedAt: trialActivatedAt,
      });
      tx.set(newAuditEventRef(), {
        eventType: 'trial_activated',
        businessId,
        subscriptionId: businessId,
        previousStatus: 'trial_pending',
        newStatus: 'trial_active',
        occurredAt: trialActivatedAt,
      });

      return { activated: true, status: 'trial_active', trialActivatedAt, trialEndsAt };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[subscriptions/activate-trial] failed', {
      uid,
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'internal', message: 'Não foi possível processar a ativação do período experimental.' });
  }
});

// ------------------------------------------------------------------
// Trial Lifecycle Worker (Decision 3, approved) — the minimal worker:
// its only job is the elapsed-time trial_active -> trial_completed
// transition. Nothing else lives here yet; general-purpose scheduled
// processing (notifications, renewal evaluation, aggregation rollups —
// Architecture §4.8's fuller design, shared with Module #20) is
// deliberately deferred until a second real consumer needs it.
//
// Requires a composite index on subscriptions (status ASC, trialEndsAt
// ASC) — see firestore.indexes.json. Without it deployed, this query
// throws on every run; caught and logged below, never crashes the
// server, but the transition silently never happens until the index
// exists. Deploy with `firebase deploy --only firestore:indexes` before
// relying on this in production — same category of manual step as the
// emulator run this repo already tracks elsewhere.
// ------------------------------------------------------------------
async function runTrialLifecycleSweep(): Promise<void> {
  const nowIso = new Date().toISOString();
  let snap;
  try {
    snap = await db
      .collection('subscriptions')
      .where('status', '==', 'trial_active')
      .where('trialEndsAt', '<=', nowIso)
      .get();
  } catch (err) {
    console.error('[trial-lifecycle-worker] query failed (composite index missing?)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (snap.empty) return;

  for (const docSnap of snap.docs) {
    const businessId = docSnap.id;
    const subscriptionRef = db.collection('subscriptions').doc(businessId);
    try {
      await db.runTransaction(async (tx) => {
        const current = await tx.get(subscriptionRef);
        if (!current.exists) return;
        const data = current.data()!;
        // Re-check inside the transaction — guards against a second
        // sweep (or a race with a future manual/SuperAdmin override)
        // having already moved this subscription on since the query ran.
        if (data.status !== 'trial_active' || !(data.trialEndsAt <= nowIso)) return;

        tx.update(subscriptionRef, { status: 'trial_completed', updatedAt: nowIso });
        tx.set(newAuditEventRef(), {
          eventType: 'trial_completed',
          businessId,
          subscriptionId: businessId,
          previousStatus: 'trial_active',
          newStatus: 'trial_completed',
          occurredAt: nowIso,
        });
      });
      console.log('[trial-lifecycle-worker] trial_completed', { businessId, timestamp: nowIso });
    } catch (err) {
      // One bad doc must never stop the sweep from processing the rest.
      console.error('[trial-lifecycle-worker] transition failed for one business, continuing', {
        businessId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// Run once shortly after boot (don't wait a full interval for the first
// pass), then on the configured interval.
setTimeout(() => {
  runTrialLifecycleSweep().catch((err) =>
    console.error('[trial-lifecycle-worker] initial run failed', err instanceof Error ? err.message : String(err))
  );
}, 5000);
setInterval(() => {
  runTrialLifecycleSweep().catch((err) =>
    console.error('[trial-lifecycle-worker] scheduled run failed', err instanceof Error ? err.message : String(err))
  );
}, TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS);

// ------------------------------------------------------------------
// Serve the built SPA for everything else.
// ------------------------------------------------------------------
const distPath = path.resolve(__dirname, 'dist');
expressApp.use(express.static(distPath));
expressApp.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
expressApp.listen(PORT, () => {
  console.log(`Sabush server listening on port ${PORT}`);
});
