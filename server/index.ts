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
// Shared permission check for every staff-management action below:
// the requester must actually be the owner of the business they claim
// (re-read from Firestore, never trusted from the client), and the
// target staff member must actually belong to that same business.
// Returns an error to send back, or null if the check passed.
// ------------------------------------------------------------------
async function verifyOwnerActionOnStaff(
  requesterUid: string,
  staffUid: string,
  businessId: string
): Promise<{ status: number; body: { error: string; message: string } } | null> {
  if (staffUid === requesterUid) {
    return { status: 400, body: { error: 'invalid-argument', message: 'Não pode realizar esta ação na sua própria conta.' } };
  }

  const requesterSnap = await db.collection('users').doc(requesterUid).get();
  const requesterProfile = requesterSnap.data();

  if (!requesterSnap.exists || !requesterProfile) {
    return { status: 403, body: { error: 'permission-denied', message: 'Perfil do utilizador não encontrado.' } };
  }
  if (requesterProfile.role !== 'owner' || requesterProfile.businessId !== businessId) {
    return { status: 403, body: { error: 'permission-denied', message: 'Apenas o dono do negócio pode gerir funcionários.' } };
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
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
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

  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/suspend] permission denied', { requesterUid, staffUid, businessId });
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

    await auth.updateUser(staffUid, { disabled: true });
    await auth.revokeRefreshTokens(staffUid);

    const batch = db.batch();
    batch.update(db.collection('users').doc(staffUid), { suspended: true });
    batch.update(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid), { suspended: true });
    await batch.commit();

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

    console.log('[staff/suspend] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error('[staff/suspend] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao suspender o funcionário. Tente novamente.' });
  }
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

  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn('[staff/reactivate] permission denied', { requesterUid, staffUid, businessId });
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

    await auth.updateUser(staffUid, { disabled: false });

    const batch = db.batch();
    batch.update(db.collection('users').doc(staffUid), { suspended: false });
    batch.update(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid), { suspended: false });
    await batch.commit();

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

    console.log('[staff/reactivate] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error('[staff/reactivate] unexpected failure', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao reativar o funcionário. Tente novamente.' });
  }
});

expressApp.get('/api/health', (_req, res) => res.json({ ok: true }));

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
