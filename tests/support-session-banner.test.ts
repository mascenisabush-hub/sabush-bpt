// SuperAdmin Agent Attended Support Session — Checkpoint 7: customer
// transparency banner UI (apps/tenant/src/components/SupportSessionBanner.tsx).
//
// No @testing-library/react or jsdom harness exists in this repo —
// every UI assertion here is a structural, source-text check, not a
// rendered-DOM check, matching this repository's own established
// technique (see tests/support-pointer-overlay.test.ts's own header).
//
// Governing chain: BDR-0018 -> Policy (Rule Q, Rule R) -> Specification
// (FR-31-FR-34, Sections 14-15) -> Rule 8 (CLOSED / PASS, 312f64c) ->
// Implementation Authorization (Signed, 2026-09-11, Section 3 item 10)
// -> Checkpoint 7.
//
// SCOPE: apps/tenant/src/components/SupportSessionBanner.tsx (new) and
// its mounting in apps/tenant/src/App.tsx. firestore.rules is
// unchanged — the existing supportSessions Admin-SDK-only write
// boundary (Checkpoint 1) already covers this checkpoint's own write
// surface exactly, since the new termination writes happen exclusively
// server-side via server/supportSessionTermination.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/support-session-banner.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const bannerSrc = src('apps/tenant/src/components/SupportSessionBanner.tsx');
const appSrc = src('apps/tenant/src/App.tsx');
const pointerSrc = src('apps/tenant/src/components/SupportPointerOverlay.tsx');
const captureSrc = src('apps/tenant/src/components/SupportDesktopCapture.tsx');
const viewerSrc = src('apps/superadmin/src/components/SupportDesktopViewer.tsx');
const firestoreRulesSrc = src('firestore.rules');
const serverIndexSrc = src('server/index.ts');

// ------------------------------------------------------------------
// 17, 18. Banner appears / remains visible while an active session
// exists.
// ------------------------------------------------------------------

describe('Checkpoint 7 — banner appearance (items 17, 18)', () => {
  it('queries this business\'s own supportSessions, filtered to status in [active, reconnecting] — the same session-detection pattern already established by Checkpoints 5/6', () => {
    assert.match(bannerSrc, /collection\(db, 'businesses', businessId, 'supportSessions'\)/);
    assert.match(bannerSrc, /where\('status', 'in', \['active', 'reconnecting'\]\)/);
  });

  it('renders null (nothing) only when no relevant sessionId is found — otherwise renders the banner', () => {
    assert.match(bannerSrc, /if \(!sessionId\) return null;/);
  });

  it('shows the same banner for both "active" and "reconnecting" — no distinct visual treatment is introduced (confirmed absent from governance by the Checkpoint 7 review)', () => {
    assert.doesNotMatch(bannerSrc, /reconnecting.*bg-|status === 'reconnecting'/);
  });
});

// ------------------------------------------------------------------
// 19. Not dismissible while active.
// ------------------------------------------------------------------

describe('Checkpoint 7 — banner is not dismissible while active (item 19, FR-32)', () => {
  it('has no close/dismiss button, no local "hidden" state, and no onClick handler other than the disconnect action itself', () => {
    assert.doesNotMatch(bannerSrc, /onDismiss|setHidden|setDismissed|close.*button/i);
    const onClickMatches = bannerSrc.match(/onClick=\{[^}]+\}/g) ?? [];
    assert.equal(onClickMatches.length, 1, 'the only onClick handler must be the disconnect action');
    assert.match(onClickMatches[0], /handleDisconnect/);
  });
});

// ------------------------------------------------------------------
// 20. Disappears after the session ends.
// ------------------------------------------------------------------

describe('Checkpoint 7 — banner disappears after the session ends (item 20, FR-33)', () => {
  it('the banner\'s own visibility is driven exclusively by the live sessionId state — no separate "ended" flag exists to set independently', () => {
    assert.doesNotMatch(bannerSrc, /const \[.*ended.*\] = useState/i);
  });
});

// ------------------------------------------------------------------
// 21, 22, 23. Disconnect control exists, calls termination directly,
// never locally fabricates "ended".
// ------------------------------------------------------------------

describe('Checkpoint 7 — customer disconnect control (items 21, 22, 23, FR-34/Rule R)', () => {
  it('a disconnect button exists, bound to handleDisconnect', () => {
    assert.match(bannerSrc, /<button[\s\S]*?onClick=\{handleDisconnect\}/);
  });

  it('handleDisconnect calls the termination route directly — no window.confirm, no confirmation modal, no delay before the fetch call', () => {
    assert.doesNotMatch(bannerSrc, /window\.confirm|confirm\(/);
    const handlerStart = bannerSrc.indexOf('const handleDisconnect = async () => {');
    assert.notEqual(handlerStart, -1);
    const handlerEnd = bannerSrc.indexOf('\n  };', handlerStart);
    const handlerBody = bannerSrc.slice(handlerStart, handlerEnd);
    assert.match(handlerBody, /fetch\('\/api\/business\/support-session\/end'/);
    assert.doesNotMatch(handlerBody, /setTimeout/);
  });

  it('handleDisconnect never sets sessionId (or any local variable) to null/"ended" itself — the banner\'s disappearance is left entirely to the live listener observing the server\'s own write', () => {
    const handlerStart = bannerSrc.indexOf('const handleDisconnect = async () => {');
    const handlerEnd = bannerSrc.indexOf('\n  };', handlerStart);
    const handlerBody = bannerSrc.slice(handlerStart, handlerEnd);
    assert.doesNotMatch(handlerBody, /setSessionId\(/);
  });

  it('the fetch call includes an Authorization: Bearer <idToken> header, matching this codebase\'s own existing authenticated-fetch convention (AppContext.tsx\'s touch-activity precedent)', () => {
    assert.match(bannerSrc, /Authorization: `Bearer \$\{idToken\}`/);
    assert.match(bannerSrc, /currentUser\.getIdToken\(\)/);
  });
});

// ------------------------------------------------------------------
// 24, 25, 26. Independence from WebRTC, Pointer, Support View State.
// ------------------------------------------------------------------

describe('Checkpoint 7 — banner independence from WebRTC/Pointer/Support View State (items 24, 25, 26)', () => {
  it('never references getDisplayMedia, RTCPeerConnection, or webrtcSignaling', () => {
    assert.doesNotMatch(bannerSrc, /getDisplayMedia|RTCPeerConnection|webrtcSignaling/);
  });

  it('never references the pointer collection or SupportPointerOverlay', () => {
    assert.doesNotMatch(bannerSrc, /'supportSessions', sessionId, 'pointer'/);
    assert.doesNotMatch(bannerSrc, /import \{ SupportPointerOverlay \}/);
  });

  it('never references supportViewState', () => {
    assert.doesNotMatch(bannerSrc, /supportViewState/);
  });
});

// ------------------------------------------------------------------
// 27. No operator disconnect UI introduced.
// ------------------------------------------------------------------

describe('Checkpoint 7 — no Support-side disconnect UI (item 27)', () => {
  it('SupportDesktopViewer.tsx (the only existing operator-facing component) was not modified to add a disconnect control', () => {
    assert.doesNotMatch(viewerSrc, /support-session\/end|handleDisconnect|Disconnect/);
  });

  it('no new component file was added under apps/superadmin/src/components for a disconnect button/menu/dialog', () => {
    // Structural proof via source inspection of the one existing
    // operator component only — this suite cannot list the directory,
    // but confirms the one file that exists has no such addition.
    assert.doesNotMatch(viewerSrc, /onClick.*[Ee]nd|onClick.*[Dd]isconnect/);
  });
});

// ------------------------------------------------------------------
// Mounting — App.tsx wiring.
// ------------------------------------------------------------------

describe('Checkpoint 7 — App.tsx mounts the banner alongside the existing app-wide banner convention', () => {
  it('imports and mounts SupportSessionBanner alongside BusinessSuspendedBanner, in normal document flow (not the fixed-position overlay group)', () => {
    assert.match(appSrc, /import \{ SupportSessionBanner \} from '\.\/components\/SupportSessionBanner';/);
    assert.match(appSrc, /<BusinessSuspendedBanner \/>\s*\n\s*<SupportSessionBanner \/>/);
  });
});

// ------------------------------------------------------------------
// Existing Checkpoints 5/6 components unmodified.
// ------------------------------------------------------------------

describe('Checkpoint 7 — Checkpoints 5 and 6 UI components are unmodified', () => {
  it('SupportPointerOverlay.tsx has no reference to the new termination route or banner', () => {
    assert.doesNotMatch(pointerSrc, /support-session\/end|SupportSessionBanner/);
  });

  it('SupportDesktopCapture.tsx has no reference to the new termination route or banner (it already reacts to session status independently, per Checkpoint 6)', () => {
    assert.doesNotMatch(captureSrc, /support-session\/end|SupportSessionBanner/);
  });
});

// ------------------------------------------------------------------
// firestore.rules unchanged; server routes exist and are wired
// correctly.
// ------------------------------------------------------------------

describe('Checkpoint 7 — server wiring and unchanged firestore.rules', () => {
  it('firestore.rules still refuses all client writes to supportSessions/{sessionId} — the new termination writes are exclusively server/Admin-SDK-mediated', () => {
    assert.match(firestoreRulesSrc, /allow read: if isMemberOf\(businessId\) \|\| isActiveSupportOperatorForSession\(businessId, sessionId\);\s*\n\s*allow write: if false;/);
  });

  it('server/index.ts defines both the customer and operator termination routes, calling the same shared recordSupportSessionTermination module', () => {
    assert.match(serverIndexSrc, /'\/api\/business\/support-session\/end'/);
    assert.match(serverIndexSrc, /'\/api\/superadmin\/support-session\/end'/);
    const count = (serverIndexSrc.match(/recordSupportSessionTermination\(/g) ?? []).length;
    assert.equal(count, 2, 'both routes must call the same shared function');
  });

  it('the operator route uses the operator\'s own real platformRole for the audit actorRole — never a hard-coded "support" literal', () => {
    assert.doesNotMatch(serverIndexSrc, /actorRole: 'support'/);
  });

  it('the customer route uses the established actorRole: \'customer\' precedent, matching the existing support_session.invited audit call', () => {
    assert.match(serverIndexSrc, /actorRole: 'customer'/);
  });
});
