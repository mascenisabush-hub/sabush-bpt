# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Explanatory-banner compaction (collapsed-by-default InfoHint)
— **implemented, typechecked, built, and pushed to `main`.** **Nothing
mid-flight; working tree clean.**

**What this was:** the Owner flagged that several always-visible
"how this works" explanatory paragraphs (e.g. Contagem's "Esta
contagem regista o que existe fisicamente em stock agora...") were
permanently occupying layout space. Investigated first — found this is
a deliberate, recurring pattern across the app (`Info` icon +
paragraph), and that one specific instance in
`PeriodicStockCountView.tsx` had an explicit prior decision
("Information-Preserving Compaction — Alternative A") that REVERSED an
earlier attempt to hide/collapse it, plus another with a "Deliberately
NOT made dismissible/collapsible" note. Both were shown to the Owner
before doing anything; the Owner explicitly chose "collapse into a
tooltip/expandable '?' (info kept, hidden by default)" — not deletion
— which preserves every prior decision's actual concern (the
information itself must never be lost) while addressing the layout
complaint. Comments at each converted site name this as an explicit,
dated product decision, not a silent reversal.

**New component:** `InfoHint.tsx` — small "?" button, click/tap to
open a popover with the original text verbatim, closes on outside
click or Escape. No layout footprint when collapsed (this is what
actually reclaims the space — nothing needed to be manually "lifted
up", removing the fixed-height banner element does that automatically
in normal document flow).

**Converted (7 files, ~8 sites):** `PeriodicStockCountView.tsx` (both
banners from the Owner's screenshot — the Contagem "how this works"
paragraph, now on the page heading, and the per-portion pricing note),
`InitialStockCountView.tsx` (Capital Inicial explainer, now on the
subtitle), `AddStockView.tsx` (batch auto-close notice, now next to
Submit), `InitialStockPriceChangeModal.tsx` (valuation-change
clarification), `EditProductModal.tsx` (Cost vs Selling Price
explainer), `DeclareBusinessWorthView.tsx` and `AddWithdrawalView.tsx`
(both moved onto their form's heading).

**Deliberately NOT converted (left always-visible, on purpose):**
every conditional/state-dependent notice — active recovery-window
countdowns, listener load-errors, "did you mean this product"/
inactive-product-reactivation prompts (explicitly marked "Deliberately
ALWAYS VISIBLE" in the code — hiding these risks silently creating a
duplicate product), the irreversible-action confirm modal in Initial
Stock, empty-states, and the "permanent, cannot be edited" warning in
`InitialStockPriceChangeModal.tsx`. These are short-lived and
actionable, not permanent screen-space consumers — collapsing them
would hide safety-relevant information at the exact moment it matters,
which is a different problem than the one raised.

**Verification performed:** `npx tsc --noEmit -p .` — zero new errors
(same 15 pre-existing `tests/*.test.ts` errors as every prior session,
confirmed unrelated). `npm run build` — succeeds. Not visually
smoke-tested in a running browser this session — worth a quick visual
pass next time to confirm the "?" popovers don't clip off-screen on
narrow/mobile viewports (InfoHint has an `align="right"` prop for
exactly that, used once so far in `AddStockView.tsx`'s Submit row —
worth checking the others too).

**Next likely step:** if more of these banners turn up elsewhere in
the app later, reuse `InfoHint` the same way — attach it next to the
nearest heading/label rather than leaving a floating block, and check
the code around each one first for an existing "must stay visible"
rationale before collapsing it.

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
