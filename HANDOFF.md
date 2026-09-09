# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Data-Entry Field Visibility — Option C (Product Architect
Implementation Authorization) — **implemented, typechecked, built,
tested, and pushed to `main`.** **Nothing mid-flight; working tree
clean.**

**What shipped:** the approved visual spec, applied exactly as
authorized, to Periodic Contagem's and Add Stock's editable
inputs/selects only:
- Normal: `#E4E8ED` background, `1.5px #9AA6B5` border, placeholder `#7C8695`.
- Focus: `#F6EFD9` background (existing `--gold-soft` token), `2px #D4AF37` border, `3px` gold ring at 30%.
- Add Stock's Quantidade/Preço Compra/Preço Venda: `text-xs` (12px) → `text-[13px] font-semibold`, matching the Design System's 13px financial-figure floor. Date/Unidade fields got the color treatment only, per the authorization's explicit scope (typography fix named only those three fields).

**Where applied:** Periodic Contagem's shared `fieldClass` constant
(propagates to its ~15 call sites) plus 6 sub-component-local inline
duplicates of the same string (not reachable from `fieldClass`, so
edited individually); Add Stock's 17 inline occurrences plus one
conditional-template field (Supplier Phone, disabled-state branch
left untouched — still visually distinct from active/editable, as it
should be).

**Deliberately left untouched, per the documented "semantic state
beats default styling" exception:** the amber-bordered product-identity
search field (Periodic Contagem) and the rose-bordered delete-reason
field (Add Stock) — both already carry a different, intentional
semantic color tied to their warning/error context, not the default
data-entry treatment.

**Testing:** ran every Add Stock test (12 files, all pass), every
Periodic Contagem/Stock test (29 files), Product Catalog/Memory/
Identity tests (8 files). Typecheck and build both clean.

**Pre-existing failures found while testing (NOT caused by this
change — confirmed via `git stash` against the commit before this
one):**
1. `periodic-stock-count-detail-and-correction-prefill.test.ts` (1 of
   14) and `periodic-stock-shop-switch-guard.test.ts` (1 of 6) — both
   fail identically with this session's changes stashed out, so predate
   Option C entirely. Not investigated further this session (out of
   this task's scope).
2. **`periodic-contagem-concept-b-compaction.test.ts` (2 of 49) — a
   real regression, already on `main`, introduced by the "collapse
   explanatory banners into InfoHint" work earlier in this
   conversation (commit `8bb980d`).** The test asserts the exact two
   sentences that commit moved into `InfoHint` must render as visible
   `<span>` text, never tooltip-only — the same product decision
   ("Information-Preserving Compaction — Alternative A") flagged to
   the Owner before that change was made. Confirmed via `git stash`
   that this fails on `main` independent of anything in this session's
   Option C diff. **Not fixed here — out of Option C's scope, and
   reverting/adjusting the InfoHint decision needs the Owner's call,
   not a unilateral fix bundled into an unrelated visual-styling
   commit.** Needs a follow-up decision: revert those two banners back
   to always-visible, or update the test to match the (now
   Owner-authorized) InfoHint decision.
3. Two files (`periodic-stock-finalization.test.ts`,
   `periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts`)
   fully cancelled — Firebase emulator/network dependent, not run in
   this sandboxed environment. Expected, not a failure.

**Visual verification:** none performed — no browser/dev-server
rendering tool available in this session. This is CSS-class-level
verification only (grep + diff review), consistent with what was
disclosed throughout the investigation/preview rounds.

**Next likely step:** resolve the InfoHint-vs-test conflict named
above (item 2) — that's the one open item actually blocking a clean
test suite, unrelated to this change.

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
