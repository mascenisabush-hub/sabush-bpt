// SuperAdmin Agent Attended Support Session — Checkpoint 6: Desktop
// WebRTC.
//
// No @testing-library/react or jsdom harness exists in this repo, and
// no WebRTC/getDisplayMedia implementation is available in this Node
// test environment either — every assertion here is a structural,
// source-text check, not a rendered-DOM or live-browser check,
// matching this repository's own established technique (see
// tests/support-pointer-overlay.test.ts's own header, Checkpoint 5).
// This is a MOCKED/UNIT-LEVEL validation only — no real browser
// getDisplayMedia/RTCPeerConnection call has been exercised anywhere
// in this validation pass, and that limitation is disclosed here
// explicitly rather than implied.
//
// Governing chain: BDR-0018 -> Policy (Rule M, Rule N) -> Specification
// (FR-19-FR-22, Section 11) -> Rule 8 (CLOSED / PASS, Findings
// 1-A/1-B/3-A) -> Implementation Authorization (Signed, Section 3
// item 5) -> Checkpoint 6.
//
// SCOPE: apps/tenant/src/components/SupportDesktopCapture.tsx (new,
// customer/sending side), apps/superadmin/src/components/
// SupportDesktopViewer.tsx (new, operator/receiving side), the two
// apps' own webrtcIceServers.ts config modules, and App.tsx's mounting
// of the capture component. firestore.rules is unchanged — no new
// tests are needed there; the existing webrtcSignaling
// read/create grant (Checkpoint 1) already covers this checkpoint's
// entire write surface, confirmed by direct inspection before writing
// any code.
//
// HOW TO RUN:
//   npx tsx --test tests/support-desktop-webrtc.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const captureSrc = src('apps/tenant/src/components/SupportDesktopCapture.tsx');
const viewerSrc = src('apps/superadmin/src/components/SupportDesktopViewer.tsx');
const tenantIceSrc = src('apps/tenant/src/lib/webrtcIceServers.ts');
const superadminIceSrc = src('apps/superadmin/src/lib/webrtcIceServers.ts');
const appSrc = src('apps/tenant/src/App.tsx');
const firestoreRulesSrc = src('firestore.rules');

// ------------------------------------------------------------------
// 1, 2, 3, 4. Media direction — customer captures/sends only, operator
// receives only. No reverse flow.
// ------------------------------------------------------------------

describe('Checkpoint 6 — media direction is customer -> operator only (items 1-4)', () => {
  it('SupportDesktopCapture.tsx (customer side) calls getDisplayMedia and adds the resulting tracks to RTCPeerConnection', () => {
    assert.match(captureSrc, /navigator\.mediaDevices\.getDisplayMedia\(\{ video: true \}\)/);
    assert.match(captureSrc, /pc\.addTrack\(track, stream\)/);
  });

  it('SupportDesktopCapture.tsx never calls pc.ontrack (it never expects to receive a remote stream)', () => {
    assert.doesNotMatch(captureSrc, /pc\.ontrack/);
  });

  it('SupportDesktopCapture.tsx never calls getUserMedia or any other capture API besides getDisplayMedia', () => {
    assert.doesNotMatch(captureSrc, /getUserMedia/);
  });

  it('SupportDesktopViewer.tsx never actually invokes getDisplayMedia or getUserMedia (only its own explanatory comments may mention the name)', () => {
    assert.doesNotMatch(viewerSrc, /navigator\.mediaDevices\.getDisplayMedia\(/);
    assert.doesNotMatch(viewerSrc, /navigator\.mediaDevices\.getUserMedia\(/);
  });

  it('SupportDesktopViewer.tsx attaches the incoming stream via pc.ontrack to a <video> element — the only place media flows into this component', () => {
    assert.match(viewerSrc, /pc\.ontrack = \(event\) => \{/);
    assert.match(viewerSrc, /videoRef\.current\.srcObject = event\.streams\[0\];/);
  });

  it('SupportDesktopViewer.tsx never calls pc.addTrack (it never transmits media of its own)', () => {
    assert.doesNotMatch(viewerSrc, /pc\.addTrack/);
  });

  it('the customer side creates the SDP offer; the operator side creates the SDP answer — never the reverse', () => {
    assert.match(captureSrc, /const offer = await pc\.createOffer\(\);/);
    assert.doesNotMatch(captureSrc, /pc\.createAnswer/);
    assert.match(viewerSrc, /const answer = await pc\.createAnswer\(\);/);
    assert.doesNotMatch(viewerSrc, /pc\.createOffer/);
  });
});

// ------------------------------------------------------------------
// FR-22 / Rule N — native browser consent, never bypassed.
// ------------------------------------------------------------------

describe('Checkpoint 6 — native browser consent is never bypassed (FR-22, Rule N)', () => {
  it('getDisplayMedia is invoked directly from a click handler (startSharing, bound to a real <button onClick>) — never automatically on mount or from a snapshot callback', () => {
    assert.match(captureSrc, /const startSharing = async \(\) => \{/);
    assert.match(captureSrc, /onClick=\{startSharing\}/);
    // The useEffect blocks (session detection, teardown) never call
    // startSharing or getDisplayMedia themselves.
    const effectBlocks = captureSrc.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
    for (const block of effectBlocks) {
      assert.doesNotMatch(block, /getDisplayMedia|startSharing\(\)/);
    }
  });

  it('no code path pre-selects a screen/tab/window, or passes any selector/constraint beyond the standard { video: true } request', () => {
    assert.doesNotMatch(captureSrc, /preferCurrentTab|selfBrowserSurface|chromeMediaSource/);
  });

  it('a capture denial (getDisplayMedia rejecting) is caught and reflected as a "denied" state only — no alternative capture mechanism is attempted', () => {
    assert.match(captureSrc, /catch \{[\s\S]*?setCaptureState\('denied'\);/);
  });
});

// ------------------------------------------------------------------
// 5, 6, 7. WebRTC connection setup — SDP offer/answer, ICE candidate
// exchange, incoming stream handling.
// ------------------------------------------------------------------

describe('Checkpoint 6 — RTCPeerConnection setup, offer/answer, ICE exchange (items 5, 6, 7)', () => {
  it('both sides construct RTCPeerConnection with the shared, configurable ICE_SERVERS import — never a literal inline server list', () => {
    assert.match(captureSrc, /new RTCPeerConnection\(\{ iceServers: ICE_SERVERS \}\)/);
    assert.match(viewerSrc, /new RTCPeerConnection\(\{ iceServers: ICE_SERVERS \}\)/);
    assert.match(captureSrc, /import \{ ICE_SERVERS \} from '\.\.\/lib\/webrtcIceServers';/);
    assert.match(viewerSrc, /import \{ ICE_SERVERS \} from '\.\.\/lib\/webrtcIceServers';/);
  });

  it('both sides write their own ICE candidates via pc.onicecandidate, tagged with a "from" field distinguishing customer vs operator', () => {
    assert.match(captureSrc, /from: 'customer',/);
    assert.match(viewerSrc, /from: 'operator',/);
  });

  it('both sides read only the OTHER participant\'s own ICE candidates (never their own) via a where("from", ...) filter', () => {
    assert.match(captureSrc, /where\('from', '==', 'operator'\)/);
    assert.match(viewerSrc, /where\('from', '==', 'customer'\)/);
  });

  it('each candidate is applied via addIceCandidate exactly once, tracked by a seen-ids Set to avoid double-application on repeated snapshot fires', () => {
    assert.match(captureSrc, /const seenCandidateIds = new Set<string>\(\);/);
    assert.match(captureSrc, /pc\.addIceCandidate\(data\.candidate\)/);
    assert.match(viewerSrc, /const seenCandidateIds = new Set<string>\(\);/);
    assert.match(viewerSrc, /pc\.addIceCandidate\(data\.candidate\)/);
  });

  it('the customer writes the offer document exactly once (setDoc, not addDoc) at a fixed \'offer\' id — never overwritten by this component again', () => {
    assert.match(captureSrc, /setDoc\(doc\(signalingRef, 'offer'\), \{/);
    const setDocOfferCount = (captureSrc.match(/setDoc\(doc\(signalingRef, 'offer'\)/g) ?? []).length;
    assert.equal(setDocOfferCount, 1);
  });

  it('the operator writes the answer document exactly once, and only after reading a real offer, guarded so it never answers twice', () => {
    assert.match(viewerSrc, /if \(snap\.exists\(\) && !answeredRef\.current\) \{/);
    assert.match(viewerSrc, /answeredRef\.current = true;/);
    assert.match(viewerSrc, /setDoc\(doc\(signalingRef, 'answer'\), \{/);
  });
});

// ------------------------------------------------------------------
// Signaling schema and security — no field beyond SDP/ICE data.
// ------------------------------------------------------------------

describe('Checkpoint 6 — signaling documents carry only SDP/ICE data (item 8 of the review, instruction Section 8)', () => {
  it('every signaling document written by either component has type in {offer, answer, ice-candidate} and only sdp/candidate/from/createdAt fields alongside it — no credential-shaped key is ever written', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /password:|credential:|authToken:|secret:|token:/i);
    }
  });

  it('SupportDesktopCapture.tsx and SupportDesktopViewer.tsx never read or write anything under supportViewState or the pointer collection', () => {
    assert.doesNotMatch(captureSrc, /supportViewState|'pointer'/);
    assert.doesNotMatch(viewerSrc, /supportViewState|'pointer'/);
  });

  it('firestore.rules — the existing webrtcSignaling grant already covers this checkpoint\'s entire write surface (read, create; update/delete refused) — confirmed unchanged', () => {
    assert.match(
      firestoreRulesSrc,
      /match \/webrtcSignaling\/\{signalId\} \{\s*\n\s*allow read, create: if isMemberOf\(businessId\) \|\| isActiveSupportOperatorForSession\(businessId, sessionId\);\s*\n\s*allow update, delete: if false;\s*\n\s*\}/
    );
  });
});

// ------------------------------------------------------------------
// TURN / ICE — development STUN-only default, clearly not production
// infrastructure, no vendor selected.
// ------------------------------------------------------------------

describe('Checkpoint 6 — ICE server configuration (item 6 of the review)', () => {
  it('both apps default to a public STUN server (not a TURN relay) when no override is provided', () => {
    assert.match(tenantIceSrc, /\{ urls: 'stun:stun\.l\.google\.com:19302' \}/);
    assert.match(superadminIceSrc, /\{ urls: 'stun:stun\.l\.google\.com:19302' \}/);
  });

  it('both apps read a configurable override from VITE_WEBRTC_ICE_SERVERS — no hard-coded commercial TURN vendor exists anywhere', () => {
    assert.match(tenantIceSrc, /import\.meta\.env\.VITE_WEBRTC_ICE_SERVERS/);
    assert.match(superadminIceSrc, /import\.meta\.env\.VITE_WEBRTC_ICE_SERVERS/);
    for (const s of [tenantIceSrc, superadminIceSrc]) {
      assert.doesNotMatch(s, /twilio|xirsys|metered|turnserver\.co|coturn/i);
    }
  });

  it('both config files explicitly document that TURN is a disclosed pre-production dependency, not configured here', () => {
    for (const s of [tenantIceSrc, superadminIceSrc]) {
      assert.match(s, /PRE-PRODUCTION dependency/);
      assert.match(s, /NO TURN SERVICE IS CONFIGURED/);
    }
  });

  it('an invalid VITE_WEBRTC_ICE_SERVERS value falls back to the STUN default rather than crashing the app', () => {
    for (const s of [tenantIceSrc, superadminIceSrc]) {
      assert.match(s, /catch \{[\s\S]*?\/\/ Fall through to the development default/);
    }
  });
});

// ------------------------------------------------------------------
// 10, 11, 12, 13. Session lifecycle interaction — reactive teardown
// only, never a liveness authority.
// ------------------------------------------------------------------

describe('Checkpoint 6 — session lifecycle interaction (items 10-13, instruction Section 11)', () => {
  it('neither component ever calls updateDoc/setDoc/tx.update on the supportSessions/{sessionId} document itself — only on its own webrtcSignaling subcollection', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /(updateDoc|setDoc)\(doc\(db, 'businesses', businessId, 'supportSessions', sessionId\)[,)]/);
    }
  });

  it('both components watch Session status via onSnapshot (already-authorized read) and treat it as the sole authority for whether WebRTC resources should exist', () => {
    assert.match(captureSrc, /setSessionStatus\(status === 'active' \|\| status === 'reconnecting' \? status : null\);/);
    assert.match(viewerSrc, /setSessionStatus\(status === 'active' \|\| status === 'reconnecting' \? status : null\);/);
  });

  it('both components call their own cleanup() — closing RTCPeerConnection and unsubscribing listeners — the instant sessionStatus becomes falsy', () => {
    assert.match(captureSrc, /if \(!sessionId \|\| !sessionStatus\) \{\s*\n\s*cleanup\(\);/);
    assert.match(viewerSrc, /if \(!sessionStatus\) \{\s*\n\s*cleanup\(\);/);
  });

  it('cleanup() itself never writes anything — it only calls pc.close(), track.stop(), and unsubscribe functions', () => {
    for (const s of [captureSrc, viewerSrc]) {
      const start = s.indexOf('const cleanup = () => {');
      assert.notEqual(start, -1);
      const end = s.indexOf('\n  };', start);
      const block = s.slice(start, end);
      assert.doesNotMatch(block, /setDoc|updateDoc|addDoc/);
    }
  });

  it('the heartbeat/grace mechanism (Checkpoint 3) is never referenced, reimplemented, or duplicated by either component — no setTimeout/setInterval-based liveness logic exists', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /setTimeout|setInterval/);
      assert.doesNotMatch(s, /lastHeartbeatAt|lastOperatorHeartbeatAt|graceExpiresAt/);
    }
  });
});

// ------------------------------------------------------------------
// Termination — no reconnection/resurrection of an ended session.
// ------------------------------------------------------------------

describe('Checkpoint 6 — respects FR-34-FR-36 termination (instruction Section 12)', () => {
  it('once sessionStatus is null (session ended by any means), neither component attempts to re-create an RTCPeerConnection or re-publish signaling — the connection-setup effect is gated on sessionStatus being truthy', () => {
    assert.match(captureSrc, /if \(!sessionId \|\| !sessionStatus\) \{\s*\n\s*cleanup\(\);\s*\n\s*setCaptureState\('idle'\);/);
    assert.match(viewerSrc, /if \(!businessId \|\| !sessionId \|\| !sessionStatus\) return;/);
  });
});

// ------------------------------------------------------------------
// Operator viewer — zero-write structural guarantee (Rule M, FR-20).
// ------------------------------------------------------------------

describe('Checkpoint 6 — operator viewer structural zero-write guarantee (item 9, instruction Section 13)', () => {
  it('SupportDesktopViewer.tsx never imports any tenant-side context, auth module, or Firebase Auth credential of the customer\'s', () => {
    assert.doesNotMatch(viewerSrc, /useApp|AppContext|firebase\/auth/);
  });

  it('SupportDesktopViewer.tsx has no click/submit/form handler that could mutate tenant data — it renders only a <video> element and plain status text', () => {
    assert.doesNotMatch(viewerSrc, /onClick|onSubmit|<button|<input|<form/);
  });

  it('SupportDesktopViewer.tsx\'s <video> element is muted and read-only rendering only (no controls implying tenant interaction)', () => {
    assert.match(viewerSrc, /<video ref=\{videoRef\} autoPlay playsInline muted/);
  });
});

// ------------------------------------------------------------------
// Pointer independence — Checkpoint 5 untouched, separate channel.
// ------------------------------------------------------------------

describe('Checkpoint 6 — Pointer (Checkpoint 5) remains a fully separate, untouched channel', () => {
  it('neither new component functionally reads/writes the pointer Firestore collection or imports SupportPointerOverlay as a component (a documentation cross-reference to its session-detection pattern is fine)', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /'supportSessions', sessionId, 'pointer'/);
      assert.doesNotMatch(s, /import \{ SupportPointerOverlay \}/);
    }
  });

  it('no WebRTC data channel is created anywhere — Pointer data is never carried through WebRTC', () => {
    assert.doesNotMatch(captureSrc, /createDataChannel/);
    assert.doesNotMatch(viewerSrc, /createDataChannel/);
  });
});

// ------------------------------------------------------------------
// Mounting — App.tsx wiring (customer side only; operator side is
// intentionally prop-driven and not yet mounted anywhere).
// ------------------------------------------------------------------

describe('Checkpoint 6 — App.tsx mounts the customer-side capture component', () => {
  it('imports and mounts SupportDesktopCapture alongside SupportPointerOverlay', () => {
    assert.match(appSrc, /import \{ SupportDesktopCapture \} from '\.\/components\/SupportDesktopCapture';/);
    assert.match(appSrc, /<SupportPointerOverlay \/>\s*\n\s*<SupportDesktopCapture \/>/);
  });
});

// ------------------------------------------------------------------
// Out-of-scope confirmation — no Mobile rendering, no Checkpoint 7 UI,
// no TURN vendor, no new permission tier.
// ------------------------------------------------------------------

describe('Checkpoint 6 — scope boundary: no Mobile rendering, no Checkpoint 7 UI, no TURN vendor', () => {
  it('neither component implements Support View State publish/subscribe (no viewportWidth/viewportHeight/fieldStatus reference)', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /viewportWidth|viewportHeight|fieldStatus|workflowContext/);
    }
  });

  it('neither component renders a user-facing "disconnect"/"end session" button or control — the necessary internal "ended" state name (native Stop-sharing/session-end reaction) and explanatory comments about what is NOT built are not the same as a rendered control', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /<button[^>]*>\s*\{?['"`]?(Disconnect|End [Ss]ession)/);
      assert.doesNotMatch(s, /onClick=\{.*[Dd]isconnect/);
    }
  });

  it('once capture has started (state is "capturing" or "connected"), SupportDesktopCapture.tsx renders nothing — no ongoing status UI is introduced', () => {
    assert.match(captureSrc, /if \(captureState === 'capturing' \|\| captureState === 'connected'\) return null;/);
  });

  it('no second Support Session authorization mechanism, no platformRole-alone grant, and no new permission tier is introduced by either component (neither references platformRole or isPlatformOperator directly)', () => {
    for (const s of [captureSrc, viewerSrc]) {
      assert.doesNotMatch(s, /platformRole|isPlatformOperator/);
    }
  });
});
