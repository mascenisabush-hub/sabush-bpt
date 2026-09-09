# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** User Profile-Photo Upload (Header avatar, next to
Notifications) + crop/compress step — **implemented, typechecked,
built, and pushed to `main`.** **Nothing mid-flight; working tree
clean.**

**This session's addition (crop + compress, on top of the prior
session's upload):** `AvatarCropModal.tsx` (new) — a self-contained
canvas-based square crop (drag to pan, slider to zoom) with no new npm
dependency. Confirming it rasterizes the visible crop onto a fixed
512x512 canvas and exports JPEG at quality 0.85 — that's both the crop
and the compression, done together, before `uploadUserPhoto` is ever
called. `AppContext.uploadUserPhoto` now takes a `Blob` (the modal's
output) instead of a raw `File` — it validates and uploads, it doesn't
crop/compress itself. `Header.tsx`'s file input now opens
`AvatarCropModal` first; upload only fires after "Guardar Foto".

**Process note:** this shipped without the full investigation → plan →
governance-review → authorization → review chain the SuperAdmin Audit
Center fix (previous session) went through, because there is no
existing spec module this belongs to and no standing Product Architect
review process available in this session. It was investigated (grep
across `apps/`, `server/`, `docs/architecture/`, `docs/specs/`) and
confirmed as a genuine gap — Architecture §4.7/§8 anticipated Storage
uploads and fixed the tenant/identity-scoping constraint, but only
named **product photos** as the expected first use case; no spec
covers profile photos at all. Scope (whose photo, upload button
location) was confirmed directly with the user in this session rather
than assumed. **Flag this for a real spec entry in `docs/specs/` next
time someone reviews module status.**

**What shipped:**
- `UserProfile.photoURL?: string` (`apps/tenant/src/types.ts`) — optional,
  absent = no photo (existing "missing = default" convention).
- Firebase Storage initialized (`apps/tenant/src/lib/firebase.ts`) —
  bucket was configured but completely unused until now.
- `storage.rules` (new file, root) + wired into `firebase.json`.
  Scoped `users/{uid}/avatar/{fileName}` — write restricted to
  `request.auth.uid == uid`, 5 MB cap, `image/*` content-type only,
  enforced server-side (not just client-side, per CLAUDE.md hard rule
  7). Read allowed to any signed-in user (avatars are shown to other
  shop members, same posture as names on shared resources). No
  catch-all `allow` — everything else stays closed.
- `AppContext.uploadUserPhoto(file)` — uploads to Storage, writes the
  download URL to `users/{uid}.photoURL` (already writable under the
  existing `firestore.rules` self-update rule — no rules change needed
  there), optimistic local `setUserProfile` update.
- `Header.tsx` — the profile-button avatar circle (top right, next to
  Notifications, showing the signed-in user's name/role) now renders
  `userProfile.photoURL` when present, falls back to the generic
  `<User>` icon otherwise. A "Change Photo" / "Uploading..." item was
  added to the profile dropdown, opening a hidden `<input type=file>`;
  errors surface inline in the dropdown.
- i18n: `header.changePhoto` / `avatarUploading` / `avatarUploadError`
  added to `pt.ts` (canonical), `en.ts`, `fr.ts`.

**Deliberately out of scope this round (flagged, not decided silently):**
- No owner/admin-uploads-for-staff path — self-upload only for now.
- No image cropping/compression before upload — raw file, capped at 5 MB.
- Business Profile (logo) upload was NOT touched — user confirmed this
  request was specifically the individual user's own avatar next to
  Notifications, not the Business Profile card in Settings.

**Verification performed:** `npx tsc --noEmit -p .` — zero new errors
(15 pre-existing errors in `tests/*.test.ts`, confirmed present on
`main` before this change too, unrelated to this feature). `npm run
build` — succeeds, both `vite build` and `build:server`. Not tested
against a live Firebase project/emulator in this session (no
Storage emulator run) — worth an emulator smoke test before this is
considered fully verified in a future session.

**Next likely step:** either (a) get this properly folded into
`docs/specs/` as a real module entry (retroactively, since it shipped
ahead of a spec), or (b) if the Owner/Admin-manages-staff-photo case
turns out to be wanted, extend `storage.rules` + `uploadUserPhoto`
rather than duplicating a second upload path.
