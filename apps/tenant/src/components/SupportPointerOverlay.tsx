import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';

// SuperAdmin Agent Attended Support Session — Checkpoint 5: Pointer
// rendering / non-interactivity.
//
// Governing chain: BDR-0018 -> Policy (Rule P) -> Specification
// (FR-27-FR-30, Section 20) -> Rule 8 (CLOSED / PASS, Finding 8-A/8-B)
// -> Implementation Authorization (Signed, Section 3 item 8) ->
// Checkpoint 5.
//
// SCOPE (per Checkpoint 1's own definition of this checkpoint, its
// "What this checkpoint deliberately does NOT cover" section): the
// pointer document's read/write firestore.rules authorization is
// ALREADY fully in place since Checkpoint 1 — this component is
// exclusively the tenant-SPA CONSUMPTION + RENDERING side. It never
// writes anything. The Support operator's own publish mechanism
// (mouse tracking, writing {x, y, timestamp}) is NOT part of this
// checkpoint and is not implemented here — this component is
// self-contained and testable by seeding a pointer document directly,
// exactly as every prior checkpoint's own rules-emulator suite already
// does for the documents it doesn't yet write in production.
//
// COORDINATE CONTRACT (explicit implementation choice, since FR-28
// itself only requires "{x, y, timestamp} or an equivalent normalized
// representation" and Rule 8 Finding 8-B explicitly leaves the exact
// representation open as "a real, implementation-level question"):
// x and y are percentage-of-viewport fractions in [0, 1] — x=0 is the
// customer's own left viewport edge, x=1 the right edge; y=0 top,
// y=1 bottom. Rendered against THIS component's own
// window.innerWidth/innerHeight — never a raw absolute pixel pair,
// and never dependent on Support View State's own viewport fields
// (which have no publish mechanism built yet) — the customer's own
// SPA already knows its own viewport without needing to be told by
// anything else. No field beyond x/y/timestamp is read or written
// (FR-30/Rule Z).
//
// SESSION DETECTION: a live query against this business's own
// supportSessions collection, filtered to status in
// ['active','reconnecting'] — already permitted by Checkpoint 1's own
// `allow read: if isMemberOf(businessId) || ...` rule. Never queries
// another business — the collection path itself
// (businesses/{businessId}/supportSessions) is scoped to the current,
// already-authenticated business only.
//
// STALENESS: the accepted Specification defines no pointer-staleness
// timeout of any kind (confirmed — no such rule exists anywhere in
// BDR-0018, the Policy, the Specification, or Rule 8). None is
// invented here. The pointer disappears when: (a) its own document no
// longer exists, or (b) no active/reconnecting Session exists for this
// business (Session-status change is itself the only governed
// disappearance mechanism — FR-52's own "unreadable the instant the
// Session ends" discipline, applied here to this component's own
// decision to stop rendering, not to a new Firestore rule).
export const SupportPointerOverlay: React.FC = () => {
  const { business } = useApp();
  const businessId = business?.id ?? null;

  // [Session detection] The one active/reconnecting Session for this
  // business, if any. I-5 guarantees at most one legitimately exists;
  // this component only consumes that invariant, never enforces it.
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setSessionId(null);
      return;
    }

    const sessionsRef = collection(db, 'businesses', businessId, 'supportSessions');
    const activeSessionsQuery = query(sessionsRef, where('status', 'in', ['active', 'reconnecting']));

    const unsubscribe = onSnapshot(
      activeSessionsQuery,
      (snapshot) => {
        setSessionId(snapshot.empty ? null : snapshot.docs[0].id);
      },
      () => {
        // Read denied (e.g. no longer a member of this business) or
        // another transient error — fail closed, render nothing rather
        // than throw.
        setSessionId(null);
      }
    );

    return () => unsubscribe();
  }, [businessId]);

  // [Pointer subscription] Subscribes only to the currently-identified
  // Session's own pointer document — never an arbitrary one. Cleanly
  // unsubscribes whenever sessionId changes (including to null) or the
  // component unmounts, so no stale listener from a prior Session is
  // ever left attached.
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!businessId || !sessionId) {
      setPointer(null);
      return;
    }

    const pointerRef = doc(db, 'businesses', businessId, 'supportSessions', sessionId, 'pointer', 'current');

    const unsubscribe = onSnapshot(
      pointerRef,
      (snap) => {
        if (!snap.exists()) {
          setPointer(null);
          return;
        }
        const data = snap.data();
        const rawX = data.x;
        const rawY = data.y;
        if (typeof rawX !== 'number' || typeof rawY !== 'number') {
          setPointer(null);
          return;
        }
        // Defensive clamp — the pointer authorization boundary
        // (Checkpoint 1) does not itself constrain x/y to [0, 1]; this
        // component's own rendering contract does.
        setPointer({
          x: Math.min(1, Math.max(0, rawX)),
          y: Math.min(1, Math.max(0, rawY)),
        });
      },
      () => {
        setPointer(null);
      }
    );

    return () => unsubscribe();
  }, [businessId, sessionId]);

  if (!pointer) return null;

  return (
    <div
      aria-hidden="true"
      // [FR-29 / Policy Rule P — non-interactive by construction] Both
      // the inline `pointerEvents: 'none'` style (a direct DOM
      // property, immune to any class-purge or specificity issue) and
      // the Tailwind `pointer-events-none` class enforce the same
      // browser-level guarantee redundantly. There is no click
      // handler, no keyboard handler, no form, no navigation, and
      // nothing in this component ever calls any AppContext write
      // function — it is a pure, read-only, presentational render of
      // already-received data.
      style={{
        position: 'fixed',
        left: `${pointer.x * 100}%`,
        top: `${pointer.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 2147483647,
      }}
      className="pointer-events-none"
    >
      <div className="w-4 h-4 rounded-full bg-[#0B1F3A] border-2 border-white shadow-[0_1px_4px_rgba(11,31,58,0.4)]" />
    </div>
  );
};
