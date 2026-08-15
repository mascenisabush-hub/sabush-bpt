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
import { backgroundWorker } from './backgroundWorker';
import { resolveServiceMode, isTenantMode, createTenantOnlyMiddleware } from './serviceMode';
import { createNotificationPlatform } from './notificationPlatform';
import { registerTrialNotificationPolicyAndTemplates, createTrialNotificationProducer } from './trialNotificationProducer';
import { registerClosingNotificationPolicyAndTemplates, createClosingNotificationProducer } from './closingNotificationProducer';
import { registerBreakageNotificationPolicyAndTemplates, createBreakageNotificationProducer } from './breakageNotificationProducer';
import { createSubscriptionEngine } from './subscriptionEngine';
import { confirmPayment, rejectPayment, type PaymentConfirmationDb } from './paymentConfirmation';
import { createRequirePlatformOperator, requireSuperAdmin, type PlatformOperatorRequest } from './superadminAuth';
import { writeAuditLogEntry } from './platformAuditLog';
import { provisionOperator, revokeOperator, listOperators } from './operatorManagement';
import { reportCriticalFailure } from './alerting';
import {
  validateExtractionUpload,
  parseProviderExtractionResponse,
  callVisionExtractionProvider,
  ProviderNotConfiguredError,
  ProviderCallFailedError,
} from './smartStockEntry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------
// Fix #8 — Production Observability. Process-level safety net for the
// one failure class no route-level try/catch can ever cover: an error
// that escapes every route handler and every awaited call entirely.
// Previously this either crashed the process with nothing but a raw
// stack trace in Railway's logs (uncaughtException) or, depending on
// the specific Promise involved, sometimes did nothing visible at all
// (unhandledRejection). Neither told anyone.
//
// uncaughtException: alert, then exit. The process is in a state Node
// itself considers unrecoverable — trying to keep serving requests
// after one is a well-known way to end up in worse, harder-to-diagnose
// trouble than just restarting cleanly (Railway's process supervisor
// restarts it immediately).
// ------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  reportCriticalFailure('[server]', 'uncaughtException — process will exit and restart', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});

// unhandledRejection: alert only, no exit. Unlike an uncaught
// exception, a rejected promise nobody awaited doesn't leave shared
// process state in a known-bad way — it's almost always one specific
// operation (e.g. a missed .catch() on a Firestore call) that already
// failed on its own, isolated terms. Matches this codebase's existing
// isolation principle (one failure must never take down unrelated
// work) rather than restarting the whole server for it.
process.on('unhandledRejection', (reason) => {
  reportCriticalFailure('[server]', 'unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

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
// Module #20 Phase 3 Checkpoint 2 (Platform Infrastructure) — the
// Notification Platform pipeline (BusinessEvent evaluation, dedupe/
// watermark, template+localization) plus the Phase 1 notification
// write path it now owns (moved from this file — see
// server/notificationPlatform.ts's own header). `writeNotification`
// below is the same function all five Phase 2 staff endpoints already
// call; only its module location changed.
const notificationPlatform = createNotificationPlatform(db);
const { writeNotification } = notificationPlatform;
// Module #20 Phase 3 Checkpoint 3 — Trial Engine Producer (the first
// real producer wired against Checkpoint 2's platform). Registers this
// producer's communication policy + templates once, at startup, against
// the same shared Notification Platform instance every producer uses.
registerTrialNotificationPolicyAndTemplates(notificationPlatform);
const trialNotificationProducer = createTrialNotificationProducer(db, notificationPlatform);
// Module #20 Phase 3 Checkpoint 4 — Closing Integrity Producer, against
// the same shared Notification Platform instance every producer uses.
registerClosingNotificationPolicyAndTemplates(notificationPlatform);
const closingNotificationProducer = createClosingNotificationProducer(db, notificationPlatform);
// Module #20 Phase 3 Checkpoint 5 — Breakage Producer, against the
// same shared Notification Platform instance every producer uses.
registerBreakageNotificationPolicyAndTemplates(notificationPlatform);
const breakageNotificationProducer = createBreakageNotificationProducer(db, notificationPlatform);

const expressApp = express();

// ------------------------------------------------------------------
// Service mode — lets this exact server.js run as either the Railway
// tenant service (today's unchanged default) or a second, separate
// Railway SuperAdmin service, without duplicating any server code.
// Default is 'tenant' so the existing Railway tenant service needs no
// env var changes at all. SuperAdmin mode's Railway service must set
// SERVICE_MODE=superadmin (and STATIC_DIST_DIR=dist-superadmin, used
// below where the SPA is served). Not an architecture change — the
// tenant/SuperAdmin physical-separation boundary (ADR-0005 §9.1)
// still holds: this only decides which routes/jobs THIS process
// registers, it never lets one bundle serve the other's frontend.
// Decision logic lives in server/serviceMode.ts (see that file's
// header for why) — unit-tested in tests/service-mode.test.ts.
// ------------------------------------------------------------------
const SERVICE_MODE = resolveServiceMode(process.env);
const tenantMode = isTenantMode(SERVICE_MODE);
const tenantOnly = createTenantOnlyMiddleware(tenantMode);

// ------------------------------------------------------------------
// [Smart Stock Entry — Tier 1 — BUG FIX, post-deployment]
// POST /api/smart-stock-entry/extract
// Body: { businessId: string, imageBase64: string }
//
// GOVERNANCE: implements docs/specs/04-smart-stock-entry-amendment.md
// (Tier 1), docs/architecture/10-smart-stock-entry-adr.md (Decisions
// 2/2a/2b/3), and docs/specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md.
//
// This route NEVER writes to Firestore. It returns a transient proposal
// only — the client merges it into AddStockView's local `rows` state
// (never into the `purchaseDrafts` document directly, per ADR Decision
// 2a). No StockBatch, PurchaseBatch, or Product document is ever
// created or modified by this route.
//
// [BUG FIX] This route — and specifically its own larger-limit
// express.json() parser below — MUST be registered before the app-wide
// `expressApp.use(express.json())` a few lines down. Express runs
// middleware/routes in registration order; the app-wide parser
// (default ~100kb limit) would otherwise consume and size-limit every
// request body FIRST, including this route's, before this route's own
// 12mb parser ever got a chance to run — silently rejecting any real
// phone-camera photo (easily 500KB-2MB as base64) with a 413 at the
// global layer, before this route's own logic (or its graceful
// {success:false, reason} responses) ever executed. This is exactly
// why the original deploy showed "Couldn't reach the server" for
// every scan/upload attempt, camera and file-picker alike — confirmed
// by direct inspection of Express's middleware-ordering behavior, not
// guessed. Registering this route (and its own parser) BEFORE the
// app-wide `express.json()` below means Express matches this exact
// path+method first, runs its own larger parser, and — since the
// handler always ends by sending a response without calling next() —
// the app-wide parser below is never reached for this route at all.
// The app-wide parser's small default limit is therefore still exactly
// as small as before for every OTHER route, unchanged.
//
// No CORS-ordering concern: `/api/*` is proxied by Vite in dev
// (vite.config.ts) and same-origin in production, so this route never
// needs the `cors()` middleware (registered further below) to function
// correctly regardless of where it sits in the stack.
// ------------------------------------------------------------------
const smartStockEntryJsonParser = express.json({ limit: '12mb' });

expressApp.post(
  '/api/smart-stock-entry/extract',
  tenantOnly,
  smartStockEntryJsonParser,
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const uid = req.callerUid!;
    const businessId = String(req.body?.businessId || '').trim();
    const imageBase64 = req.body?.imageBase64;

    if (!businessId) {
      res.status(400).json({ error: 'invalid-argument', message: 'businessId é obrigatório.' });
      return;
    }

    try {
      // Membership check — same re-derivation pattern as
      // /api/subscriptions/activate-trial above: never trust the
      // client's claim, re-read the caller's own profile. Covers both
      // an Owner (possibly multi-shop, `businessIds[]`) and Staff
      // (single-shop, legacy `businessId` field only — spec #16).
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

      // Upload validation — server-side, never trusting the client's
      // declared file type alone (ADR Decision 3). A failure here is an
      // ordinary, expected outcome, not a server error.
      const validation = validateExtractionUpload({ imageBase64 });
      if (!validation.ok) {
        const reason =
          validation.error === 'too_large'
            ? 'too_large'
            : validation.error === 'unsupported_type'
              ? 'unsupported_type'
              : 'invalid_upload';
        res.json({ success: false, reason });
        return;
      }

      // Re-read this business's REAL Products via the Admin SDK — never
      // trust a client-supplied product list for matching (Principle
      // 2.9). This is the one Firestore read this route ever performs;
      // it writes nothing.
      const productsSnap = await db.collection('businesses').doc(businessId).collection('products').get();
      const existingProducts = productsSnap.docs.map((d) => ({
        id: d.id,
        name: String(d.data().name || ''),
      }));

      let rawProviderOutput: unknown;
      try {
        rawProviderOutput = await callVisionExtractionProvider(String(imageBase64), validation.mimeType!);
      } catch (err) {
        if (err instanceof ProviderNotConfiguredError) {
          res.json({ success: false, reason: 'provider_unavailable' });
          return;
        }
        if (err instanceof ProviderCallFailedError) {
          console.error('[smart-stock-entry] provider call failed', {
            uid,
            businessId,
            error: err.message,
          });
          res.json({ success: false, reason: 'provider_unavailable' });
          return;
        }
        throw err;
      }

      const proposal = parseProviderExtractionResponse(rawProviderOutput, existingProducts);
      if (!proposal) {
        // Covers both a malformed/unexpected shape (Failure Mode E) and a
        // genuinely empty extraction (Failure Mode: "Empty extraction") —
        // both are the same graceful outcome from the client's point of
        // view: fall back to manual entry.
        res.json({ success: false, reason: 'unreadable' });
        return;
      }

      res.json({ success: true, proposal });
    } catch (err) {
      console.error('[smart-stock-entry/extract] unexpected failure', {
        uid,
        businessId,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'internal', message: 'Não foi possível processar o documento. Tente novamente ou continue manualmente.' });
    }
  }
);

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
  //
  // [Fix #6 — multi-shop staff-management authorization] An Owner/Admin's
  // legacy singular `businessId` only ever points at their first shop
  // (addShop, server/index.ts, never updates it — only `businessIds[]`
  // grows). Checking `requesterProfile.businessId === businessId` alone
  // therefore 403'd a legitimate Owner managing staff on any second-or-
  // later shop. Re-derive the owner's full shop list the same way
  // /api/provisioning/business (addShop) and /api/subscriptions/
  // activate-trial already do — never trusted from the client, always
  // re-read from the requester's own Firestore profile — and check
  // membership against that list instead of the single legacy field.
  const ownedBusinessIds: string[] =
    Array.isArray(requesterProfile.businessIds) && requesterProfile.businessIds.length > 0
      ? requesterProfile.businessIds
      : requesterProfile.businessId
        ? [requesterProfile.businessId]
        : [];
  const isAdmin =
    (requesterProfile.role === 'owner' || requesterProfile.role === 'admin') &&
    ownedBusinessIds.includes(businessId);
  // Managers are always single-shop (BDS #16 — a Manager is a staff
  // account, never itself a multi-shop owner), so this stays scoped to
  // the requester's own legacy `businessId` exactly as before. Deliberately
  // NOT widened to `ownedBusinessIds` — a Manager must never gain reach
  // into a business merely because the *Owner's* `businessIds[]` shape
  // happens to be checked elsewhere in this function.
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
expressApp.post('/api/staff/delete', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
  // this is business history only, never a reason to report failure. No
  // longer early-returns on failure (Phase 2 Checkpoint 2) — Stage D below
  // is an independent best-effort side effect of the same already-succeeded
  // primary action, not conditional on this stage's own outcome.
  const eventId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let auditLogged = true;
  try {
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(eventId)
      .set({
        id: eventId,
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
    auditLogged = false;
  }

  // Stage D — User-scoped 'staff' notification (Module #20 Phase 2
  // Checkpoint 2, per the signed Phase 2 Implementation Authorization).
  // Best-effort, same as Stage C: a failure here must never roll back or
  // fail the already-succeeded staff removal.
  let notificationLogged = true;
  try {
    await writeNotification({
      scope: 'user',
      businessId: null,
      userId: staffUid,
      category: 'staff',
      type: 'staff_removed',
      payloadRef: { collection: 'users', documentId: staffUid },
      dedupeKey: `${staffUid}:staff_removed:${eventId}`,
      context: {
        whatHappened: 'O seu acesso a esta conta foi removido permanentemente.',
        whyItMatters: 'Já não pode iniciar sessão nesta conta nem aceder aos dados desta empresa.',
        recommendedAction: 'Se acredita que isto foi um erro, contacte o proprietário da empresa.',
      },
      priority: 'immediate',
    });
  } catch (err) {
    console.error('[staff/delete] notification stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    notificationLogged = false;
  }

  console.log('[staff/delete] success', { requesterUid, staffUid, businessId, authAccountDeleted, timestamp: startedAt });
  const response: Record<string, unknown> = { success: true, staffUid, authAccountDeleted };
  if (!auditLogged) response.auditLogged = false;
  if (!notificationLogged) response.notificationLogged = false;
  res.json(response);
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
expressApp.post('/api/staff/suspend', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
  // this is business history only, never a reason to report failure. No
  // longer early-returns on failure (Phase 2 Checkpoint 2) — Stage D below
  // is an independent best-effort side effect of the same already-succeeded
  // primary action, not conditional on this stage's own outcome.
  const eventId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let auditLogged = true;
  try {
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(eventId)
      .set({
        id: eventId,
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
    auditLogged = false;
  }

  // Stage D — User-scoped 'staff' notification (Module #20 Phase 2
  // Checkpoint 2, per the signed Phase 2 Implementation Authorization).
  // Best-effort, same as Stage C: a failure here must never roll back or
  // fail the already-succeeded suspension.
  let notificationLogged = true;
  try {
    await writeNotification({
      scope: 'user',
      businessId: null,
      userId: staffUid,
      category: 'staff',
      type: 'staff_suspended',
      payloadRef: { collection: 'users', documentId: staffUid },
      dedupeKey: `${staffUid}:staff_suspended:${eventId}`,
      context: {
        whatHappened: 'O seu acesso a esta empresa foi suspenso.',
        whyItMatters: 'Não pode iniciar sessão até que o acesso seja reativado.',
        recommendedAction: 'Contacte o proprietário ou gestor da empresa para mais informações.',
      },
      priority: 'immediate',
    });
  } catch (err) {
    console.error('[staff/suspend] notification stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    notificationLogged = false;
  }

  console.log('[staff/suspend] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
  const response: Record<string, unknown> = { success: true, staffUid };
  if (!auditLogged) response.auditLogged = false;
  if (!notificationLogged) response.notificationLogged = false;
  res.json(response);
});

// ------------------------------------------------------------------
// POST /api/staff/reactivate
// Body: { staffUid: string, businessId: string }
// ------------------------------------------------------------------
expressApp.post('/api/staff/reactivate', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
  // this is business history only, never a reason to report failure. No
  // longer early-returns on failure (Phase 2 Checkpoint 2) — Stage D below
  // is an independent best-effort side effect of the same already-succeeded
  // primary action, not conditional on this stage's own outcome.
  const eventId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let auditLogged = true;
  try {
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(eventId)
      .set({
        id: eventId,
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
    auditLogged = false;
  }

  // Stage D — User-scoped 'staff' notification (Module #20 Phase 2
  // Checkpoint 2, per the signed Phase 2 Implementation Authorization).
  // Best-effort, same as Stage C: a failure here must never roll back or
  // fail the already-succeeded reactivation. recommendedAction is null —
  // access is fully restored, genuinely no further action needed (Business
  // Rule 9: null only when no action is truly possible/needed).
  let notificationLogged = true;
  try {
    await writeNotification({
      scope: 'user',
      businessId: null,
      userId: staffUid,
      category: 'staff',
      type: 'staff_reactivated',
      payloadRef: { collection: 'users', documentId: staffUid },
      dedupeKey: `${staffUid}:staff_reactivated:${eventId}`,
      context: {
        whatHappened: 'O seu acesso a esta empresa foi reativado.',
        whyItMatters: 'Pode voltar a iniciar sessão normalmente.',
        recommendedAction: null,
      },
      priority: 'immediate',
    });
  } catch (err) {
    console.error('[staff/reactivate] notification stage failed after Auth+Firestore succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    notificationLogged = false;
  }

  console.log('[staff/reactivate] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
  const response: Record<string, unknown> = { success: true, staffUid };
  if (!auditLogged) response.auditLogged = false;
  if (!notificationLogged) response.notificationLogged = false;
  res.json(response);
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
expressApp.post('/api/staff/reset-pin', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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

    // Notification stage (Module #20 Phase 2 Checkpoint 2, per the signed
    // Phase 2 Implementation Authorization). Its own inner try/catch, not
    // part of the outer try above's failure path — a notification-write
    // failure here must never turn an already-succeeded PIN reset into a
    // reported failure (the outer catch below returns 500).
    let notificationLogged = true;
    const eventId = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      await writeNotification({
        scope: 'user',
        businessId: null,
        userId: staffUid,
        category: 'staff',
        type: 'staff_pin_reset',
        payloadRef: { collection: 'users', documentId: staffUid },
        dedupeKey: `${staffUid}:staff_pin_reset:${eventId}`,
        context: {
          whatHappened: 'O seu PIN de acesso foi redefinido.',
          whyItMatters: 'Precisa do novo PIN para iniciar sessão a partir de agora.',
          recommendedAction: 'Se não solicitou esta alteração, contacte o proprietário da empresa imediatamente.',
        },
        priority: 'immediate',
      });
    } catch (err) {
      console.error('[staff/reset-pin] notification stage failed after Auth update succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
      notificationLogged = false;
    }

    console.log('[staff/reset-pin] success', { requesterUid, staffUid, businessId, timestamp: startedAt });
    const response: Record<string, unknown> = { success: true, staffUid };
    if (!notificationLogged) response.notificationLogged = false;
    res.json(response);
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
expressApp.post('/api/staff/set-tier', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
  // not be reported as if the tier/permission change itself failed. No
  // longer early-returns on failure (Phase 2 Checkpoint 2) — Stage D below
  // is an independent best-effort side effect of the same already-succeeded
  // primary action, not conditional on this stage's own outcome.
  const eventId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const eventType =
    previousTier === 'staff' && requestedTier === 'manager' ? 'manager-granted' :
    previousTier === 'manager' && requestedTier === 'staff' ? 'manager-revoked' :
    'manager-permissions-changed';
  const eventTitle =
    eventType === 'manager-granted' ? 'Funcionário Promovido a Gestor' :
    eventType === 'manager-revoked' ? 'Funcionário Despromovido de Gestor' :
    'Permissões de Gestor Alteradas';
  let auditLogged = true;
  try {
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timelineEvents')
      .doc(eventId)
      .set({
        id: eventId,
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
    auditLogged = false;
  }

  // Stage D — User-scoped 'staff' notification (Module #20 Phase 2
  // Checkpoint 2, per the signed Phase 2 Implementation Authorization).
  // Best-effort, same as Stage C: a failure here must never roll back or
  // fail the already-succeeded tier/permission change. Content keyed off
  // the same eventType already computed above for the timeline entry.
  let notificationLogged = true;
  try {
    const whatHappened =
      eventType === 'manager-granted' ? 'Foi promovido a Gestor nesta empresa.' :
      eventType === 'manager-revoked' ? 'O seu nível de acesso foi alterado para Funcionário.' :
      'As suas permissões de Gestor foram alteradas.';
    await writeNotification({
      scope: 'user',
      businessId: null,
      userId: staffUid,
      category: 'staff',
      type: 'staff_tier_changed',
      payloadRef: { collection: 'users', documentId: staffUid },
      dedupeKey: `${staffUid}:staff_tier_changed:${eventId}`,
      context: {
        whatHappened,
        whyItMatters: 'Isto altera as permissões que tem nesta empresa.',
        recommendedAction: 'Reveja as suas novas permissões com o proprietário ou gestor da empresa.',
      },
      priority: 'immediate',
    });
  } catch (err) {
    console.error('[staff/set-tier] notification stage failed after batch commit succeeded', { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    notificationLogged = false;
  }

  console.log('[staff/set-tier] success', { requesterUid, staffUid, businessId, staffTier: requestedTier, timestamp: startedAt });
  const response: Record<string, unknown> = { success: true, staffUid, staffTier: requestedTier, managerPermissions: requestedPermissions };
  if (!auditLogged) response.auditLogged = false;
  if (!notificationLogged) response.notificationLogged = false;
  res.json(response);
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
expressApp.post('/api/provisioning/business', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
expressApp.post('/api/subscriptions/activate-trial', tenantOnly, requireAuth, async (req: AuthedRequest, res: Response) => {
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
// Trial Lifecycle Worker (Module #19 Phase 2, Decision 3) — its only
// job is the elapsed-time trial_active -> trial_completed transition.
//
// As of Module #20 Phase 3 Checkpoint 1 (ADR-0003), this job is
// registered against the shared Platform Background Worker
// (./backgroundWorker.ts) rather than driving its own setTimeout/
// setInterval directly — a pure scheduling-plumbing refactor, no
// change to this function's own business logic or transaction
// behavior. See the registerJob() call below.
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

// Registered as the Platform Background Worker's first job (ADR-0003).
// Scheduling (initial-run delay, interval, failure isolation, generic
// job-run logging) is now owned by backgroundWorker.ts; this job's own
// execute() — runTrialLifecycleSweep — is untouched.
//
// [Railway SuperAdmin split] Every registerJob() call below is gated
// behind isTenantMode. registerJob() schedules a setTimeout/setInterval
// immediately (backgroundWorker.ts), so this is the one place that
// actually prevents a second, duplicate production worker if the
// SuperAdmin Railway service (SERVICE_MODE=superadmin) ever runs this
// same server.js — see HANDOFF.md for why that's a hard safety
// requirement, not a nice-to-have. Nothing about job scheduling itself,
// or any job's own execute() logic, is touched.
const subscriptionEngine = createSubscriptionEngine(db);
if (tenantMode) {
  backgroundWorker.registerJob({
    jobType: 'trial-lifecycle-sweep',
    scheduleMs: TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS,
    execute: runTrialLifecycleSweep,
  });

  // Module #20 Phase 3 Checkpoint 3 — Trial Engine Producer
  // (server/trialNotificationProducer.ts). A second, independent
  // registered job — not folded into runTrialLifecycleSweep() above,
  // which keeps sole ownership of the trial_active -> trial_completed
  // transition (Module #19 Phase 2, Decision 3), unmodified by this
  // checkpoint. Reuses the same schedule interval; the two jobs are
  // isolated from each other by the Background Worker (ADR-0003) — a
  // failure in one never blocks the other's own tick.
  backgroundWorker.registerJob({
    jobType: 'trial-notification-sweep',
    scheduleMs: TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS,
    execute: trialNotificationProducer.runTrialNotificationSweep,
  });

  // Module #20 Phase 3 Checkpoint 4 — Closing Integrity Producer
  // (server/closingNotificationProducer.ts). A third, independent
  // registered job — reuses the same schedule interval as the two Trial
  // jobs above (BDR-0007's 3-day thresholds don't need finer-grained
  // polling than the existing hourly cadence). Isolated from every other
  // registered job by the Background Worker (ADR-0003) — a failure here
  // never blocks Trial or a future Breakage producer's own tick.
  backgroundWorker.registerJob({
    jobType: 'closing-notification-sweep',
    scheduleMs: TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS,
    execute: closingNotificationProducer.runClosingNotificationSweep,
  });

  // Module #20 Phase 3 Checkpoint 5 — Breakage Producer
  // (server/breakageNotificationProducer.ts). A fourth, independent
  // registered job — reuses the same schedule interval as the others.
  // This is the final producer named by the Phase 3 Implementation
  // Authorization §2 (closing.approaching/due/overdue,
  // trial.ending_soon/ending_tomorrow, inventory.risk.breakage — six
  // eventTypes, three producers, all now wired). Isolated from every
  // other registered job by the Background Worker (ADR-0003).
  backgroundWorker.registerJob({
    jobType: 'breakage-notification-sweep',
    scheduleMs: TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS,
    execute: breakageNotificationProducer.runBreakageNotificationSweep,
  });

  // Module #19 V1 Subscription Lifecycle Engine
  // (server/subscriptionEngine.ts) — the one governed transition with no
  // triggering event: grace_period -> expired once 7 days elapse with no
  // recovery (POL-19-004, POL-19-005). Reuses the same schedule interval;
  // isolated from every other registered job by the Background Worker
  // (ADR-0003). Per the signed Implementation Authorization
  // (docs/engineering/19-v1-subscription-lifecycle-engine-implementation-authorization.md),
  // this is the ONLY wiring this Authorization permits — applyLifecycleEvent()
  // (the event-triggered half of the Engine) is deliberately NOT called
  // from any HTTP route here. No /api/billing/webhook exists, and none
  // may be added until a verified PaySuite Payment Adapter is separately
  // authorized (Authorization §3).
  backgroundWorker.registerJob({
    jobType: 'grace-period-expiry-sweep',
    scheduleMs: TRIAL_LIFECYCLE_SWEEP_INTERVAL_MS,
    execute: subscriptionEngine.runGracePeriodExpirySweep,
  });
}

// ------------------------------------------------------------------
// SuperAdmin Payment Operations — V1 Launch Slice.
//
// Governing chain: docs/adr/ADR-0005-superadmin-payment-operations-boundary.md,
// docs/specs/18-19-payment-operations-slice.md,
// docs/engineering/18-19-payment-operations-rule8-assessment.md.
//
// IMPORTANT — this is NOT the "/api/billing/webhook" the comment above
// (grace-period-expiry-sweep) says is deliberately absent. That comment
// is about an *automated payment-processor* webhook calling
// applyLifecycleEvent() directly, still correctly unbuilt and still
// gated on a separately-authorized PaySuite Payment Adapter. The routes
// below are a *human SuperAdmin operator* reviewing one payment at a
// time, authorized by ADR-0005, and they never call
// applyLifecycleEvent() themselves — every route below calls only the
// existing, unmodified confirmPayment()/rejectPayment()
// (server/paymentConfirmation.ts), which is the only thing that calls
// applyLifecycleEvent(). Same rule as before, still true: the
// Subscription Lifecycle Engine remains the sole owner of
// subscription-state transitions (BDS BR-1).
//
// Every route below requires requireAuth (Firebase ID token) AND
// requirePlatformOperator (re-reads platform_operators/{uid}) AND
// requireSuperAdmin (V1: only the 'superadmin' platformRole may act —
// BDS §3/§11). No route here is reachable by a tenant users/{uid}
// account, however that account is authorized on the tenant side —
// this is a structurally separate identity space (Architecture §7.4),
// not an extra role check layered onto the tenant one.
const requirePlatformOperator = createRequirePlatformOperator(db);
const paymentConfirmationDb = db as unknown as PaymentConfirmationDb;

interface SuperAdminRequest extends AuthedRequest, PlatformOperatorRequest {}

async function readBusinessName(businessId: string): Promise<string | null> {
  const snap = await db.collection('businesses').doc(businessId).get();
  return snap.exists ? ((snap.data()?.name as string) ?? null) : null;
}

async function readSubscriptionStatus(businessId: string): Promise<string | null> {
  const snap = await db.collection('subscriptions').doc(businessId).get();
  return snap.exists ? ((snap.data()?.status as string) ?? null) : null;
}

// ------------------------------------------------------------------
// GET /api/superadmin/payments/pending
//
// FR-2 — every businesses/*/payments/* document with status ==
// 'pending', oldest submittedAt first, across all businesses. The one
// place this slice reads more than one business's data in a single
// call — a Firestore collection-group query, not a raw per-business
// scan, and it reads only the Payment record itself plus (below) each
// owning business's display name — never other tenant operational
// data. See firestore.indexes.json for the composite index this query
// requires.
//
// [Known gap, flagged not silently invented — see ADR-0005/BDS: this
// slice cannot display `businessCode` (named in Architecture §8.14 /
// docs/specs/17-owner-portfolio.md) because that field does not exist
// anywhere in this repository's actual Business type or Firestore
// documents — it is a documented forward-note that was never
// implemented. This route surfaces the Business's `name` and its
// Firestore `businessId` instead. Adding businessCode itself is out of
// this slice's scope (it is not one of the nine authorized items) and
// is not invented here.]
// ------------------------------------------------------------------
expressApp.get(
  '/api/superadmin/payments/pending',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    try {
      const snap = await db
        .collectionGroup('payments')
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'asc')
        .get();

      const businessIds = Array.from(new Set(snap.docs.map((d) => (d.data().businessId as string) ?? '')));
      const businessNames = new Map<string, string | null>(
        await Promise.all(businessIds.map(async (id) => [id, await readBusinessName(id)] as const))
      );

      const payments = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: data.businessId,
          businessName: businessNames.get(data.businessId) ?? null,
          amount: data.amount,
          currency: data.currency,
          method: data.method,
          reference: data.reference,
          submittedAt: data.submittedAt,
          submittedBy: data.submittedBy,
        };
      });

      res.json({ payments });
    } catch (err) {
      console.error('[superadmin/payments/pending] failed', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao carregar a fila de pagamentos pendentes.' });
    }
  }
);

// ------------------------------------------------------------------
// GET /api/superadmin/payments/:businessId/:paymentId
// FR-3 — Payment detail/review, plus current subscription status
// (FR-6, read-only).
// ------------------------------------------------------------------
expressApp.get(
  '/api/superadmin/payments/:businessId/:paymentId',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    const { businessId, paymentId } = req.params;
    try {
      const [paymentSnap, businessName, subscriptionStatus] = await Promise.all([
        db.collection('businesses').doc(businessId).collection('payments').doc(paymentId).get(),
        readBusinessName(businessId),
        readSubscriptionStatus(businessId),
      ]);

      if (!paymentSnap.exists) {
        res.status(404).json({ error: 'not-found', message: 'Pagamento não encontrado.' });
        return;
      }
      const data = paymentSnap.data()!;

      res.json({
        payment: {
          id: paymentSnap.id,
          businessId,
          amount: data.amount,
          currency: data.currency,
          method: data.method,
          reference: data.reference,
          submittedAt: data.submittedAt,
          submittedBy: data.submittedBy,
          status: data.status,
          confirmedAt: data.confirmedAt ?? null,
          confirmedBy: data.confirmedBy ?? null,
          rejectedAt: data.rejectedAt ?? null,
          rejectedBy: data.rejectedBy ?? null,
          rejectionReason: data.rejectionReason ?? null,
        },
        businessName,
        subscriptionStatus,
      });
    } catch (err) {
      console.error('[superadmin/payments/detail] failed', { businessId, paymentId, error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao carregar o pagamento.' });
    }
  }
);

// ------------------------------------------------------------------
// POST /api/superadmin/payments/:businessId/:paymentId/confirm
// FR-4. BR-1: calls confirmPayment() unmodified; never touches
// subscription state directly. BR-6: exactly one audit entry per
// successful (state-changing) confirmation — see
// server/platformAuditLog.ts's header for the documented atomicity
// limitation and why it's the correct trade-off here.
// ------------------------------------------------------------------
expressApp.post(
  '/api/superadmin/payments/:businessId/:paymentId/confirm',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    const { businessId, paymentId } = req.params;
    const operator = req.platformOperator!;

    let result;
    try {
      result = await confirmPayment(paymentConfirmationDb, subscriptionEngine, {
        businessId,
        paymentId,
        confirmedBy: operator.uid,
      });
    } catch (err) {
      console.error('[superadmin/payments/confirm] confirmPayment() failed', { businessId, paymentId, operatorUid: operator.uid, error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao confirmar o pagamento. Nenhuma alteração foi aplicada de forma inconsistente — tente novamente.' });
      return;
    }

    if (result.outcome === 'not-found') {
      res.status(404).json({ error: 'not-found', message: 'Pagamento não encontrado.' });
      return;
    }
    if (result.outcome === 'already-rejected') {
      res.status(409).json({ error: 'already-rejected', message: 'Este pagamento já foi rejeitado e não pode ser confirmado.' });
      return;
    }

    // outcome === 'confirmed' — either just transitioned, or an
    // idempotent replay of an already-confirmed payment. Only write a
    // new audit entry for a genuinely new state change: re-derive that
    // by checking the payment doc's own confirmedAt against "just now"
    // would be racy; instead this route treats every 'confirmed'
    // outcome as audit-worthy EXCEPT when the caller's own retry is
    // clearly a replay of an audit entry it already wrote. V1 keeps
    // this simple and honest rather than cleverly deduping: a rare
    // network-retry double-audit-entry for the SAME confirm action is
    // a much smaller risk than silently under-auditing, and is exactly
    // the trade-off server/platformAuditLog.ts's header documents.
    let auditLogged = true;
    try {
      await writeAuditLogEntry(db, {
        actorUid: operator.uid,
        actorRole: operator.platformRole,
        actionType: 'payment.confirmed',
        targetBusinessId: businessId,
      });
    } catch (err) {
      console.error('[superadmin/payments/confirm] audit log write failed after payment confirmed', { businessId, paymentId, operatorUid: operator.uid, error: err instanceof Error ? err.message : String(err) });
      auditLogged = false;
    }

    const subscriptionStatus = await readSubscriptionStatus(businessId).catch(() => null);

    res.json({
      outcome: 'confirmed',
      transitionReason: result.lifecycleTransition?.reason ?? 'Sem alteração no estado da subscrição.',
      subscriptionStatus,
      ...(auditLogged ? {} : { auditLogged: false }),
    });
  }
);

// ------------------------------------------------------------------
// POST /api/superadmin/payments/:businessId/:paymentId/reject
// Body: { reason: string } — required (FR-5, BDS §6). BR-1: calls
// rejectPayment() unmodified; subscription state is never touched by
// a rejection, by design.
// ------------------------------------------------------------------
expressApp.post(
  '/api/superadmin/payments/:businessId/:paymentId/reject',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    const { businessId, paymentId } = req.params;
    const operator = req.platformOperator!;
    const reason = String(req.body?.reason || '').trim().slice(0, 1000);

    if (!reason) {
      res.status(400).json({ error: 'invalid-argument', message: 'É obrigatório indicar um motivo para rejeitar o pagamento.' });
      return;
    }

    let result;
    try {
      result = await rejectPayment(paymentConfirmationDb, {
        businessId,
        paymentId,
        rejectedBy: operator.uid,
        rejectionReason: reason,
      });
    } catch (err) {
      console.error('[superadmin/payments/reject] rejectPayment() failed', { businessId, paymentId, operatorUid: operator.uid, error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao rejeitar o pagamento.' });
      return;
    }

    if (result.outcome === 'not-found') {
      res.status(404).json({ error: 'not-found', message: 'Pagamento não encontrado.' });
      return;
    }
    if (result.outcome === 'already-confirmed') {
      res.status(409).json({ error: 'already-confirmed', message: 'Este pagamento já foi confirmado e a subscrição já foi ativada — não pode ser rejeitado.' });
      return;
    }

    let auditLogged = true;
    try {
      await writeAuditLogEntry(db, {
        actorUid: operator.uid,
        actorRole: operator.platformRole,
        actionType: 'payment.rejected',
        targetBusinessId: businessId,
        justification: reason,
      });
    } catch (err) {
      console.error('[superadmin/payments/reject] audit log write failed after payment rejected', { businessId, paymentId, operatorUid: operator.uid, error: err instanceof Error ? err.message : String(err) });
      auditLogged = false;
    }

    const subscriptionStatus = await readSubscriptionStatus(businessId).catch(() => null);

    res.json({
      outcome: 'rejected',
      subscriptionStatus, // unchanged, by design (BR-2) — returned so the UI can show "no effect" explicitly rather than the operator having to infer it
      ...(auditLogged ? {} : { auditLogged: false }),
    });
  }
);

// ------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase A (ADR-0006).
// Internal Account Management. Every route below is a thin wrapper —
// all business/authorization logic lives in server/operatorManagement.ts
// (see that file's header for why), mirroring how the payments routes
// above delegate to server/paymentConfirmation.ts. BR-2 (no
// self-escalation) and BR-3 (last-SuperAdmin lockout, computed fresh at
// request time) are enforced entirely inside that module, not here.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// POST /api/superadmin/operators
// FR-A1. Body: { uid, platformRole }.
// ------------------------------------------------------------------
expressApp.post(
  '/api/superadmin/operators',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    const operator = req.platformOperator!;
    const targetUid = String(req.body?.uid || '');
    const platformRole = String(req.body?.platformRole || '');

    let result;
    try {
      result = await provisionOperator(db, { targetUid, platformRole, requesterUid: operator.uid });
    } catch (err) {
      console.error('[superadmin/operators/provision] failed', { requesterUid: operator.uid, targetUid, error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao provisionar o operador.' });
      return;
    }

    if (result.outcome === 'invalid-argument' || result.outcome === 'self-target') {
      res.status(400).json({ error: 'invalid-argument', message: result.message });
      return;
    }

    let auditLogged = true;
    try {
      await writeAuditLogEntry(db, {
        actorUid: operator.uid,
        actorRole: operator.platformRole,
        actionType: 'operator.provisioned',
        targetUid: result.uid,
      });
    } catch (err) {
      console.error('[superadmin/operators/provision] audit log write failed after provisioning', { requesterUid: operator.uid, targetUid: result.uid, error: err instanceof Error ? err.message : String(err) });
      auditLogged = false;
    }

    res.json({ outcome: 'provisioned', uid: result.uid, platformRole: result.platformRole, ...(auditLogged ? {} : { auditLogged: false }) });
  }
);

// ------------------------------------------------------------------
// POST /api/superadmin/operators/:uid/revoke
// FR-A2.
// ------------------------------------------------------------------
expressApp.post(
  '/api/superadmin/operators/:uid/revoke',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    const operator = req.platformOperator!;
    const targetUid = req.params.uid;

    let result;
    try {
      result = await revokeOperator(db, { targetUid, requesterUid: operator.uid });
    } catch (err) {
      console.error('[superadmin/operators/revoke] failed', { requesterUid: operator.uid, targetUid, error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao revogar o operador.' });
      return;
    }

    if (result.outcome === 'self-target') {
      res.status(400).json({ error: 'invalid-argument', message: result.message });
      return;
    }
    if (result.outcome === 'not-found') {
      res.status(404).json({ error: 'not-found', message: result.message });
      return;
    }
    if (result.outcome === 'last-superadmin') {
      res.status(409).json({ error: 'last-superadmin', message: result.message });
      return;
    }

    let auditLogged = true;
    try {
      await writeAuditLogEntry(db, {
        actorUid: operator.uid,
        actorRole: operator.platformRole,
        actionType: 'operator.revoked',
        targetUid: result.uid,
      });
    } catch (err) {
      console.error('[superadmin/operators/revoke] audit log write failed after revocation', { requesterUid: operator.uid, targetUid: result.uid, error: err instanceof Error ? err.message : String(err) });
      auditLogged = false;
    }

    res.json({ outcome: 'revoked', uid: result.uid, ...(auditLogged ? {} : { auditLogged: false }) });
  }
);

// ------------------------------------------------------------------
// GET /api/superadmin/operators
// FR-A3. Read-only — no audit entry (same tier as
// GET /api/superadmin/payments/pending, which also doesn't audit its
// own read).
// ------------------------------------------------------------------
expressApp.get(
  '/api/superadmin/operators',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (_req: SuperAdminRequest, res: Response) => {
    try {
      const operators = await listOperators(db);
      res.json({ operators });
    } catch (err) {
      console.error('[superadmin/operators] failed', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao carregar os operadores.' });
    }
  }
);

// ------------------------------------------------------------------
// GET /api/superadmin/audit-log
// FR-7 — V1 scope: payment.confirmed / payment.rejected only (this
// slice's own two action types). Requires the platform_audit_log read
// rule this slice adds (firestore.rules) — this route itself bypasses
// client rules via the Admin SDK either way, same as every read above.
// ------------------------------------------------------------------
expressApp.get(
  '/api/superadmin/audit-log',
  requireAuth,
  requirePlatformOperator,
  requireSuperAdmin,
  async (req: SuperAdminRequest, res: Response) => {
    try {
      const snap = await db
        .collection('platform_audit_log')
        .where('actionType', 'in', ['payment.confirmed', 'payment.rejected'])
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const entries = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actorUid: data.actorUid,
          actorRole: data.actorRole,
          actionType: data.actionType,
          targetBusinessId: data.targetBusinessId ?? null,
          justification: data.justification ?? null,
          timestamp: data.timestamp,
        };
      });

      res.json({ entries });
    } catch (err) {
      console.error('[superadmin/audit-log] failed', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'internal', message: 'Ocorreu um erro ao carregar o registo de auditoria.' });
    }
  }
);

// ------------------------------------------------------------------
// POST /api/client-error
// Body: { message?, stack?, componentStack?, source?, url?, userAgent?, userId?, businessId? }
//
// Fix #8 — Production Observability. Relay endpoint for the client's
// ErrorBoundary and window error/unhandledrejection listeners
// (src/main.tsx, src/components/ErrorBoundary.tsx,
// src/lib/reportClientError.ts). Deliberately unauthenticated — a
// crash can happen before the user ever has a valid session (e.g.
// during initial auth), and requiring a token here would silently
// drop exactly the reports that matter most. Every field is
// length-capped before it touches a log line or the alert channel;
// nothing here is persisted to Firestore, and reportClientError()
// already caps report volume per browser session so this can't be
// used to spam the server or the alert channel from one crashing tab.
// ------------------------------------------------------------------

expressApp.post('/api/client-error', (req: Request, res: Response) => {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const cap = (value: unknown, maxLength: number): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : undefined;

  const message = cap(body.message, 500) || '(no message)';
  const meta = {
    stack: cap(body.stack, 4000),
    componentStack: cap(body.componentStack, 4000),
    source: cap(body.source, 64) || 'unknown',
    url: cap(body.url, 500),
    userAgent: cap(body.userAgent, 300),
    userId: cap(body.userId, 128),
    businessId: cap(body.businessId, 128),
  };

  reportCriticalFailure('[client-error]', message, meta);
  // 204: the client already gave up on this request mattering to its
  // own control flow (sendBeacon has no response at all); no reason to
  // make it wait on or parse a body.
  res.status(204).end();
});

// ------------------------------------------------------------------
// Serve the built SPA for everything else.
// ------------------------------------------------------------------
const distPath = path.resolve(__dirname, process.env.STATIC_DIST_DIR || 'dist');
expressApp.use(express.static(distPath));
expressApp.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ------------------------------------------------------------------
// Fix #8 — Production Observability. Final Express error-handling
// middleware (4-arg signature is what makes Express treat this as an
// error handler, not a normal route). This is a backstop only — every
// route above already has its own try/catch and already reports its
// own failures in its own way; this exists solely to catch a route
// that throws synchronously, or a future route that forgets try/catch
// entirely, so a bug there degrades to a reported 500 instead of the
// request hanging or the process crashing with no report at all.
// ------------------------------------------------------------------
expressApp.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  reportCriticalFailure('[server]', 'unhandled request error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal', message: 'Ocorreu um erro interno. A equipa foi notificada.' });
  }
});

const PORT = process.env.PORT || 8080;
expressApp.listen(PORT, () => {
  console.log(`Sabush server listening on port ${PORT}`);
});
