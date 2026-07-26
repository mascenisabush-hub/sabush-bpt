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
  if (staffUid === requesterUid) {
    res.status(400).json({ error: 'invalid-argument', message: 'Não pode remover a sua própria conta por esta via.' });
    return;
  }

  try {
    // 1) Requester must be the OWNER of the business they claim — re-read
    //    from Firestore, never trust the client's claimed role.
    const requesterSnap = await db.collection('users').doc(requesterUid).get();
    const requesterProfile = requesterSnap.data();

    if (!requesterSnap.exists || !requesterProfile) {
      res.status(403).json({ error: 'permission-denied', message: 'Perfil do utilizador não encontrado.' });
      return;
    }
    if (requesterProfile.role !== 'owner' || requesterProfile.businessId !== businessId) {
      console.warn('[staff/delete] permission denied', { requesterUid, staffUid, businessId });
      res.status(403).json({ error: 'permission-denied', message: 'Apenas o dono do negócio pode remover funcionários.' });
      return;
    }

    // 2) Target staff must belong to the SAME business.
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection('users').doc(staffUid).get(),
      db.collection('businesses').doc(businessId).collection('staff').doc(staffUid).get(),
    ]);
    const staffProfile = staffProfileSnap.data();
    const staffRoster = staffRosterSnap.data();

    if (!staffProfileSnap.exists && !staffRosterSnap.exists) {
      res.status(404).json({ error: 'not-found', message: 'Funcionário não encontrado.' });
      return;
    }

    const belongsToBusiness =
      (staffProfile ? staffProfile.businessId === businessId : true) &&
      (staffRoster ? staffRoster.businessId === businessId : true);

    if (!belongsToBusiness) {
      console.warn('[staff/delete] cross-business deletion attempt blocked', { requesterUid, staffUid, businessId });
      res.status(403).json({ error: 'permission-denied', message: 'Este funcionário não pertence ao seu negócio.' });
      return;
    }

    const staffName = staffProfile?.name || staffRoster?.name || 'Funcionário';
    const staffEmail = staffProfile?.email || staffRoster?.email || '';

    // 3) Delete the Firebase Authentication account — the whole reason
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

    // 4) Delete Firestore records belonging to this staff member only.
    const batch = db.batch();
    batch.delete(db.collection('users').doc(staffUid));
    batch.delete(db.collection('businesses').doc(businessId).collection('staff').doc(staffUid));
    await batch.commit();

    // 5) Permanent audit / timeline entry.
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
