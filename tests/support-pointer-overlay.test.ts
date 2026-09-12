// SuperAdmin Agent Attended Support Session — Checkpoint 5: Pointer
// rendering / non-interactivity.
//
// No @testing-library/react or jsdom harness exists in this repo —
// every UI assertion here is a structural, source-text check, not a
// rendered-DOM check, matching this repository's own established
// technique (see tests/business-worth-correction-recovery-ui.test.ts's
// own header, tests/owner-portfolio-currentworth.test.ts).
//
// Governing chain: BDR-0018 -> Policy (Rule P) -> Specification
// (FR-27-FR-30, Section 20) -> Rule 8 (CLOSED / PASS, Finding 8-A/8-B)
// -> Implementation Authorization (Signed, Section 3 item 8) ->
// Checkpoint 5.
//
// SCOPE: apps/tenant/src/components/SupportPointerOverlay.tsx (new)
// and its mounting in apps/tenant/src/App.tsx. The pointer document's
// own firestore.rules read/write authorization is Checkpoint 1's,
// already covered by tests/superadmin-agent-attended-support-session-
// firestore-rules.test.ts (unchanged by this checkpoint — no rules
// file was touched).
//
// HOW TO RUN:
//   npx tsx --test tests/support-pointer-overlay.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const overlaySrc = src('apps/tenant/src/components/SupportPointerOverlay.tsx');
const appSrc = src('apps/tenant/src/App.tsx');

// ------------------------------------------------------------------
// 1 & 9. Session detection — a live query against this business's own
// supportSessions, never another business's; no pointer rendered when
// no relevant session exists.
// ------------------------------------------------------------------

describe('Checkpoint 5 — session detection (item 1, item 9, item 10)', () => {
  it('queries this business\'s own supportSessions collection, filtered to status in [active, reconnecting]', () => {
    assert.match(overlaySrc, /collection\(db, 'businesses', businessId, 'supportSessions'\)/);
    assert.match(overlaySrc, /where\('status', 'in', \['active', 'reconnecting'\]\)/);
  });

  it('the collection path itself is scoped to the current, already-authenticated business\'s own id — never a hardcoded or cross-business value', () => {
    assert.match(overlaySrc, /const businessId = business\?\.id \?\? null;/);
    // No literal business-id-looking string anywhere near the query
    // construction — the only identifier used is the derived
    // `businessId` variable.
    assert.doesNotMatch(overlaySrc, /collection\(db, 'businesses', '[^']+', 'supportSessions'\)/);
  });

  it('renders nothing (sessionId stays null) when there is no business context at all', () => {
    const effectStart = overlaySrc.indexOf('useEffect(() => {\n    if (!businessId) {');
    assert.notEqual(effectStart, -1);
    const block = overlaySrc.slice(effectStart, effectStart + 200);
    assert.match(block, /setSessionId\(null\);/);
    assert.match(block, /return;/);
  });

  it('a query read failure (e.g. no longer a member) fails closed — sets sessionId to null rather than throwing or rendering stale data', () => {
    assert.match(overlaySrc, /\(\) => \{\s*\/\/ Read denied[\s\S]*?setSessionId\(null\);/);
  });

  it('at most one Session is consumed even if the query somehow matched more than one (I-5\'s own "at most one active Session per business" invariant is trusted, not re-derived)', () => {
    assert.match(overlaySrc, /setSessionId\(snapshot\.empty \? null : snapshot\.docs\[0\]\.id\);/);
  });
});

// ------------------------------------------------------------------
// 7 & 8 & 10. Pointer subscription — scoped only to the identified
// session's own pointer document; clean unsubscribe on every relevant
// change.
// ------------------------------------------------------------------

describe('Checkpoint 5 — pointer subscription and listener cleanup (item 7, item 8)', () => {
  it('subscribes to exactly businesses/{businessId}/supportSessions/{sessionId}/pointer/current — the same fixed docId convention Checkpoint 1\'s own rules-emulator suite already establishes', () => {
    assert.match(
      overlaySrc,
      /doc\(db, 'businesses', businessId, 'supportSessions', sessionId, 'pointer', 'current'\)/
    );
  });

  it('both onSnapshot subscriptions (session detection, pointer) return their own unsubscribe function from useEffect — no listener is left dangling', () => {
    const matches = overlaySrc.match(/return \(\) => unsubscribe\(\);/g) ?? [];
    assert.equal(matches.length, 2, 'expected exactly two useEffect cleanup functions (session query + pointer subscription)');
  });

  it('the pointer subscription useEffect re-runs whenever businessId or sessionId changes — old listeners are torn down before a new one attaches, never left stacked', () => {
    const effectStart = overlaySrc.indexOf("const pointerRef = doc(db, 'businesses'");
    assert.notEqual(effectStart, -1);
    const block = overlaySrc.slice(Math.max(0, effectStart - 400), effectStart + 1400);
    assert.match(block, /\}, \[businessId, sessionId\]\);/);
  });

  it('a pointer-read failure, or the pointer document not existing, both clear the rendered pointer rather than rendering stale/undefined data', () => {
    assert.match(overlaySrc, /if \(!snap\.exists\(\)\) \{\s*setPointer\(null\);/);
    assert.match(overlaySrc, /\(\) => \{\s*setPointer\(null\);\s*\}\s*\);\s*\n\s*return \(\) => unsubscribe\(\);\s*\n\s*\}, \[businessId, sessionId\]\);/);
  });
});

// ------------------------------------------------------------------
// 2 & 3. Coordinate contract — normalized [0,1] fractions, rendered
// relative to the viewport, updates when the document changes.
// ------------------------------------------------------------------

describe('Checkpoint 5 — normalized coordinate contract (item 2, item 3)', () => {
  it('reads only x and y as numbers from the pointer document — never any other field, and never treats them as raw pixels', () => {
    assert.match(overlaySrc, /const rawX = data\.x;/);
    assert.match(overlaySrc, /const rawY = data\.y;/);
    assert.match(overlaySrc, /typeof rawX !== 'number' \|\| typeof rawY !== 'number'/);
  });

  it('clamps x and y defensively to the [0, 1] contract this checkpoint itself defines (the pointer write-authorization rule does not constrain the range)', () => {
    assert.match(overlaySrc, /Math\.min\(1, Math\.max\(0, rawX\)\)/);
    assert.match(overlaySrc, /Math\.min\(1, Math\.max\(0, rawY\)\)/);
  });

  it('renders position as a percentage of the viewport (left/top in %), not a raw pixel offset — updates automatically whenever the pointer state changes, since it is derived directly from React state on every render', () => {
    assert.match(overlaySrc, /left: `\$\{pointer\.x \* 100\}%`/);
    assert.match(overlaySrc, /top: `\$\{pointer\.y \* 100\}%`/);
    assert.doesNotMatch(overlaySrc, /left: `\$\{pointer\.x\}px`/);
    assert.doesNotMatch(overlaySrc, /viewportWidth|viewportHeight/, 'must not depend on Support View State\'s own viewport fields');
  });

  it('never adds a field beyond x/y/timestamp to anything it reads or (never) writes — FR-30/Rule Z', () => {
    assert.doesNotMatch(overlaySrc, /setDoc|updateDoc|addDoc|writeBatch/, 'this component must never write to Firestore at all');
  });
});

// ------------------------------------------------------------------
// 4, 5, 6. Non-interactivity — the critical requirement.
// ------------------------------------------------------------------

describe('Checkpoint 5 — non-interactivity, FR-29 / Policy Rule P (item 4, item 5, item 6)', () => {
  it('sets pointerEvents: \'none\' as a direct inline style — not solely a CSS class, immune to any class-purge/specificity issue', () => {
    assert.match(overlaySrc, /pointerEvents: 'none',/);
  });

  it('also carries the Tailwind pointer-events-none class as a redundant, belt-and-suspenders layer', () => {
    assert.match(overlaySrc, /className="pointer-events-none"/);
  });

  it('has no click, pointer, keyboard, or form-submission handler of any kind', () => {
    assert.doesNotMatch(overlaySrc, /onClick|onPointerDown|onPointerUp|onMouseDown|onMouseUp|onKeyDown|onKeyUp|onSubmit|onChange|onInput/);
  });

  it('has no "click-through except..." exception path — no conditional that ever re-enables pointer-events on this element', () => {
    assert.doesNotMatch(overlaySrc, /pointerEvents: 'auto'|pointer-events-auto/);
  });

  it('is marked aria-hidden — purely decorative, not a focusable or interactive element', () => {
    assert.match(overlaySrc, /aria-hidden="true"/);
  });

  it('renders no button, input, a, form, or select element anywhere', () => {
    assert.doesNotMatch(overlaySrc, /<button|<input|<a\s|<form|<select/);
  });
});

// ------------------------------------------------------------------
// Staleness — must not be invented (no governed rule exists).
// ------------------------------------------------------------------

describe('Checkpoint 5 — no invented staleness rule', () => {
  it('does not use setTimeout/setInterval to age out or hide the pointer after a fixed duration — no such rule exists in any accepted governance artifact, and none is invented here', () => {
    assert.doesNotMatch(overlaySrc, /setTimeout|setInterval/);
  });
});

// ------------------------------------------------------------------
// Mounting — App.tsx wiring.
// ------------------------------------------------------------------

describe('Checkpoint 5 — mounted in App.tsx alongside the existing app-wide overlay convention', () => {
  it('imports SupportPointerOverlay from its own component file', () => {
    assert.match(appSrc, /import \{ SupportPointerOverlay \} from '\.\/components\/SupportPointerOverlay';/);
  });

  it('renders it unconditionally alongside BusinessSuspendedBanner, matching that component\'s own self-gating pattern (renders null internally when not applicable, rather than being wrapped in a conditional here)', () => {
    assert.match(appSrc, /<BusinessSuspendedBanner \/>\s*\n\s*<SupportPointerOverlay \/>/);
  });
});

// ------------------------------------------------------------------
// Out-of-scope confirmation — this checkpoint must not implement the
// operator-side publish mechanism, Support View State publish/
// subscribe, or any later checkpoint's own surface.
// ------------------------------------------------------------------

describe('Checkpoint 5 — scope boundary: no operator-side publish, no later-checkpoint work', () => {
  it('SupportPointerOverlay.tsx contains no getDisplayMedia, RTCPeerConnection, or WebRTC signaling reference', () => {
    assert.doesNotMatch(overlaySrc, /getDisplayMedia|RTCPeerConnection|webrtcSignaling/);
  });

  it('SupportPointerOverlay.tsx contains no mouse-tracking / pointer-publishing code (no mousemove listener, no write of x/y anywhere)', () => {
    assert.doesNotMatch(overlaySrc, /mousemove|onMouseMove|addEventListener\('mousemove'/);
  });

  it('SupportPointerOverlay.tsx does not reference supportViewState at all — that publish/subscribe mechanism belongs to a different, still-unbuilt surface', () => {
    assert.doesNotMatch(overlaySrc, /supportViewState/);
  });
});
