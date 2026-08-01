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

  try {
    const permissionError = await verifyStaffManagementAction(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/delete] permission denied', { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }

    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    const requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    const staffProfile = staffProfileSnap.data();
    const staffRoster = staffRosterSnap.data();

    const staffName = staffProfile?.name || staffRoster?.name || 'Funcionário';
    const staffEmail = staffProfile?.email || staffRoster?.email || '';

    // 1) Delete the Firebase Authentication account — the whole reason
    //    this can't run on the client.
    let authAccountDeleted = true;
    try {
      await auth.deleteUser(staffUid);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        authAccountDeleted = false;
        console.log('[staff/delete] auth account already absent, continuing', { requesterUid, staffUid, businessId });
      } else {
        console.error('[staff/delete] failed to delete auth account', { requesterUid, staffUid, businessId, error: err?.message });
        res.status(500).json({ error: 'internal', message: 'Não foi possível remover a conta de autenticação do funcionário.' });
        return;
      }
    }

    // 2) Delete Firestore records belonging to this staff member only.
    const batch = db.batch();
    batch.delete(db.collection('users').doc(staffUid));
    batch.delete(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid));
    await batch.commit();

    // 3) Permanent audit / timeline entry.
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

    console.log('[staff/delete] success', { requesterUid, staffUid, businessId, authAccountDeleted, timestamp: startedAt });
    res.json({ success: true, staffUid, authAccountDeleted });
  } catch (err) {
    console.error('[staff/delete] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao remover o funcionário. Tente novamente.' });
  }
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
    const requesterProfile = requesterSnap.data()!;
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    const staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || 'Funcionário';
    const previousTier = staffProfileSnap.data()?.staffTier === 'manager' ? 'manager' : 'staff';

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

    console.log('[staff/set-tier] success', { requesterUid, staffUid, businessId, staffTier: requestedTier, timestamp: startedAt });
    res.json({ success: true, staffUid, staffTier: requestedTier, managerPermissions: requestedPermissions });
  } catch (err) {
    console.error('[staff/set-tier] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao atualizar o nível do funcionário. Tente novamente.' });
  }
});

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
