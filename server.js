// server/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Generate a service account key in Firebase Console \u2192 Project Settings \u2192 Service Accounts, base64-encode the JSON file, and set it as this environment variable."
    );
  }
  const json = Buffer.from(b64, "base64").toString("utf-8");
  return JSON.parse(json);
}
var app = initializeApp({
  credential: cert(loadServiceAccount())
});
var db = getFirestore(app);
var auth = getAuth(app);
var expressApp = express();
expressApp.use(express.json());
expressApp.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true
  })
);
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: "unauthenticated", message: "Autentica\xE7\xE3o necess\xE1ria." });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.callerUid = decoded.uid;
    next();
  } catch (err) {
    res.status(401).json({ error: "unauthenticated", message: "Sess\xE3o inv\xE1lida ou expirada." });
  }
}
async function verifyOwnerActionOnStaff(requesterUid, staffUid, businessId) {
  if (staffUid === requesterUid) {
    return { status: 400, body: { error: "invalid-argument", message: "N\xE3o pode realizar esta a\xE7\xE3o na sua pr\xF3pria conta." } };
  }
  const requesterSnap = await db.collection("users").doc(requesterUid).get();
  const requesterProfile = requesterSnap.data();
  if (!requesterSnap.exists || !requesterProfile) {
    return { status: 403, body: { error: "permission-denied", message: "Perfil do utilizador n\xE3o encontrado." } };
  }
  if (requesterProfile.role !== "owner" || requesterProfile.businessId !== businessId) {
    return { status: 403, body: { error: "permission-denied", message: "Apenas o dono do neg\xF3cio pode gerir funcion\xE1rios." } };
  }
  const [staffProfileSnap, staffRosterSnap] = await Promise.all([
    db.collection("users").doc(staffUid).get(),
    db.collection("businesses").doc(businessId).collection("staff").doc(staffUid).get()
  ]);
  const staffProfile = staffProfileSnap.data();
  const staffRoster = staffRosterSnap.data();
  if (!staffProfileSnap.exists && !staffRosterSnap.exists) {
    return { status: 404, body: { error: "not-found", message: "Funcion\xE1rio n\xE3o encontrado." } };
  }
  const belongsToBusiness = (staffProfile ? staffProfile.businessId === businessId : true) && (staffRoster ? staffRoster.businessId === businessId : true);
  if (!belongsToBusiness) {
    return { status: 403, body: { error: "permission-denied", message: "Este funcion\xE1rio n\xE3o pertence ao seu neg\xF3cio." } };
  }
  return null;
}
expressApp.post("/api/staff/delete", requireAuth, async (req, res) => {
  const requesterUid = req.callerUid;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const staffUid = String(req.body?.staffUid || "").trim();
  const businessId = String(req.body?.businessId || "").trim();
  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : void 0;
  if (!staffUid || !businessId) {
    res.status(400).json({ error: "invalid-argument", message: "staffUid e businessId s\xE3o obrigat\xF3rios." });
    return;
  }
  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn("[staff/delete] permission denied", { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }
    const requesterSnap = await db.collection("users").doc(requesterUid).get();
    const requesterProfile = requesterSnap.data();
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection("users").doc(staffUid).get(),
      db.collection("businesses").doc(businessId).collection("staff").doc(staffUid).get()
    ]);
    const staffProfile = staffProfileSnap.data();
    const staffRoster = staffRosterSnap.data();
    const staffName = staffProfile?.name || staffRoster?.name || "Funcion\xE1rio";
    const staffEmail = staffProfile?.email || staffRoster?.email || "";
    let authAccountDeleted = true;
    try {
      await auth.deleteUser(staffUid);
    } catch (err) {
      if (err?.code === "auth/user-not-found") {
        authAccountDeleted = false;
        console.log("[staff/delete] auth account already absent, continuing", { requesterUid, staffUid, businessId });
      } else {
        console.error("[staff/delete] failed to delete auth account", { requesterUid, staffUid, businessId, error: err?.message });
        res.status(500).json({ error: "internal", message: "N\xE3o foi poss\xEDvel remover a conta de autentica\xE7\xE3o do funcion\xE1rio." });
        return;
      }
    }
    const batch = db.batch();
    batch.delete(db.collection("users").doc(staffUid));
    batch.delete(db.collection("businesses").doc(businessId).collection("staff").doc(staffUid));
    await batch.commit();
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.collection("businesses").doc(businessId).collection("timelineEvents").doc(timelineId).set({
      id: timelineId,
      type: "staff-removed",
      date: startedAt.slice(0, 10),
      createdAt: startedAt,
      userName: requesterProfile.name || "Dono",
      title: "Funcion\xE1rio Removido",
      description: `O acesso de "${staffName}" foi permanentemente removido.`,
      details: {
        staffName,
        staffEmail,
        deletedBy: requesterProfile.name || requesterUid,
        reason: reason || void 0
      }
    });
    console.log("[staff/delete] success", { requesterUid, staffUid, businessId, authAccountDeleted, timestamp: startedAt });
    res.json({ success: true, staffUid, authAccountDeleted });
  } catch (err) {
    console.error("[staff/delete] unexpected failure", { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "internal", message: "Ocorreu um erro ao remover o funcion\xE1rio. Tente novamente." });
  }
});
expressApp.post("/api/staff/suspend", requireAuth, async (req, res) => {
  const requesterUid = req.callerUid;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const staffUid = String(req.body?.staffUid || "").trim();
  const businessId = String(req.body?.businessId || "").trim();
  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : void 0;
  if (!staffUid || !businessId) {
    res.status(400).json({ error: "invalid-argument", message: "staffUid e businessId s\xE3o obrigat\xF3rios." });
    return;
  }
  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn("[staff/suspend] permission denied", { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }
    const requesterSnap = await db.collection("users").doc(requesterUid).get();
    const requesterProfile = requesterSnap.data();
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection("users").doc(staffUid).get(),
      db.collection("businesses").doc(businessId).collection("staff").doc(staffUid).get()
    ]);
    const staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || "Funcion\xE1rio";
    await auth.updateUser(staffUid, { disabled: true });
    await auth.revokeRefreshTokens(staffUid);
    const batch = db.batch();
    batch.update(db.collection("users").doc(staffUid), { suspended: true });
    batch.update(db.collection("businesses").doc(businessId).collection("staff").doc(staffUid), { suspended: true });
    await batch.commit();
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.collection("businesses").doc(businessId).collection("timelineEvents").doc(timelineId).set({
      id: timelineId,
      type: "staff-suspended",
      date: startedAt.slice(0, 10),
      createdAt: startedAt,
      userName: requesterProfile.name || "Dono",
      title: "Funcion\xE1rio Suspenso",
      description: `O acesso de "${staffName}" foi suspenso.`,
      details: { staffName, suspendedBy: requesterProfile.name || requesterUid, reason: reason || void 0 }
    });
    console.log("[staff/suspend] success", { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error("[staff/suspend] unexpected failure", { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "internal", message: "Ocorreu um erro ao suspender o funcion\xE1rio. Tente novamente." });
  }
});
expressApp.post("/api/staff/reactivate", requireAuth, async (req, res) => {
  const requesterUid = req.callerUid;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const staffUid = String(req.body?.staffUid || "").trim();
  const businessId = String(req.body?.businessId || "").trim();
  if (!staffUid || !businessId) {
    res.status(400).json({ error: "invalid-argument", message: "staffUid e businessId s\xE3o obrigat\xF3rios." });
    return;
  }
  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn("[staff/reactivate] permission denied", { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }
    const requesterSnap = await db.collection("users").doc(requesterUid).get();
    const requesterProfile = requesterSnap.data();
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection("users").doc(staffUid).get(),
      db.collection("businesses").doc(businessId).collection("staff").doc(staffUid).get()
    ]);
    const staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || "Funcion\xE1rio";
    await auth.updateUser(staffUid, { disabled: false });
    const batch = db.batch();
    batch.update(db.collection("users").doc(staffUid), { suspended: false });
    batch.update(db.collection("businesses").doc(businessId).collection("staff").doc(staffUid), { suspended: false });
    await batch.commit();
    const timelineId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.collection("businesses").doc(businessId).collection("timelineEvents").doc(timelineId).set({
      id: timelineId,
      type: "staff-reactivated",
      date: startedAt.slice(0, 10),
      createdAt: startedAt,
      userName: requesterProfile.name || "Dono",
      title: "Funcion\xE1rio Reativado",
      description: `O acesso de "${staffName}" foi reativado.`,
      details: { staffName, reactivatedBy: requesterProfile.name || requesterUid }
    });
    console.log("[staff/reactivate] success", { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error("[staff/reactivate] unexpected failure", { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "internal", message: "Ocorreu um erro ao reativar o funcion\xE1rio. Tente novamente." });
  }
});
expressApp.post("/api/staff/reset-pin", requireAuth, async (req, res) => {
  const requesterUid = req.callerUid;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const staffUid = String(req.body?.staffUid || "").trim();
  const businessId = String(req.body?.businessId || "").trim();
  const newPin = String(req.body?.newPin || "").trim();
  if (!staffUid || !businessId) {
    res.status(400).json({ error: "invalid-argument", message: "staffUid e businessId s\xE3o obrigat\xF3rios." });
    return;
  }
  if (!/^\d{6}$/.test(newPin)) {
    res.status(400).json({ error: "invalid-argument", message: "O PIN deve ter exatamente 6 d\xEDgitos num\xE9ricos." });
    return;
  }
  try {
    const permissionError = await verifyOwnerActionOnStaff(requesterUid, staffUid, businessId);
    if (permissionError) {
      console.warn("[staff/reset-pin] permission denied", { requesterUid, staffUid, businessId });
      res.status(permissionError.status).json(permissionError.body);
      return;
    }
    const requesterSnap = await db.collection("users").doc(requesterUid).get();
    const requesterProfile = requesterSnap.data();
    const [staffProfileSnap, staffRosterSnap] = await Promise.all([
      db.collection("users").doc(staffUid).get(),
      db.collection("businesses").doc(businessId).collection("staff").doc(staffUid).get()
    ]);
    const staffName = staffProfileSnap.data()?.name || staffRosterSnap.data()?.name || "Funcion\xE1rio";
    await auth.updateUser(staffUid, { password: newPin });
    await auth.revokeRefreshTokens(staffUid);
    console.log("[staff/reset-pin] success", { requesterUid, staffUid, businessId, timestamp: startedAt });
    res.json({ success: true, staffUid });
  } catch (err) {
    console.error("[staff/reset-pin] unexpected failure", { requesterUid, staffUid, businessId, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "internal", message: "Ocorreu um erro ao redefinir o PIN. Tente novamente." });
  }
});
expressApp.get("/api/health", (_req, res) => res.json({ ok: true }));
var distPath = path.resolve(__dirname, "dist");
expressApp.use(express.static(distPath));
expressApp.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
var PORT = process.env.PORT || 8080;
expressApp.listen(PORT, () => {
  console.log(`Sabush server listening on port ${PORT}`);
});
