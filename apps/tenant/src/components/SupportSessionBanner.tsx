import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Eye } from 'lucide-react';

// SuperAdmin Agent Attended Support Session — Checkpoint 7: customer
// transparency banner (FR-31-FR-33, Rule Q) and customer-initiated
// termination (FR-34, Rule R).
//
// Governing chain: BDR-0018 -> Policy (Rule Q, Rule R) -> Specification
// (FR-31-FR-34, Sections 14-15) -> Rule 8 (CLOSED / PASS, 312f64c) ->
// Implementation Authorization (Signed, 2026-09-11, Section 3 item 10)
// -> Checkpoint 7.
//
// MODELED DIRECTLY ON BusinessSuspendedBanner.tsx (the explicit
// precedent FR-31/Rule Q both cite by name): a simple, persistent,
// non-dismissible, AppContext-driven, app-wide banner — no close
// button, no ARIA infrastructure beyond ordinary semantic HTML, no
// focus trap, no keyboard shortcut (none of these is required by any
// governing artifact — see this checkpoint's own governance review,
// Section 10).
//
// SESSION DETECTION: identical live-query pattern already established
// by SupportPointerOverlay.tsx (Checkpoint 5) and
// SupportDesktopCapture.tsx (Checkpoint 6) — not a new mechanism. The
// banner shows whenever a relevant Session exists with status
// active/reconnecting, and disappears the instant no such Session
// exists — no distinct visual treatment for reconnecting is required
// by FR-31-33 (confirmed absent from every governing artifact), so
// none is added here.
//
// DISCONNECT IS SERVER-AUTHORITATIVE (FR-34, Rule R — critical): the
// button below never locally sets any "ended" state and never hides
// itself optimistically. It only calls the new
// /api/business/support-session/end route; the banner's own
// disappearance is driven exclusively by the live session-detection
// listener above observing the resulting status change once the
// server has actually written it (I-8) — exactly the flow this
// checkpoint's own governance review names explicitly: "customer
// clicks Disconnect -> termination request -> server writes
// status=ended -> live session listener observes ended/no relevant
// session -> banner disappears." NO CONFIRMATION DIALOG is shown
// before calling this route — FR-34/Rule R both explicitly state no
// confirmation delay is required.
//
// INDEPENDENCE FROM WEBRTC/POINTER/SUPPORT VIEW STATE: this component
// reads only supportSessions — never any WebRTC, pointer, or Support
// View State field or collection. It does not need to, and does not,
// interact with SupportDesktopCapture.tsx, SupportDesktopViewer.tsx,
// or SupportPointerOverlay.tsx in any way; all three already react
// independently and correctly to the same authoritative status change
// this component's own disconnect action ultimately causes.
export const SupportSessionBanner: React.FC = () => {
  const { business, currentUser } = useApp();
  const { t } = useLanguage();
  const businessId = business?.id ?? null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // [Session detection — identical pattern to SupportPointerOverlay.tsx
  // and SupportDesktopCapture.tsx]
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
        setSessionId(null);
      }
    );

    return () => unsubscribe();
  }, [businessId]);

  // [FR-34, Rule R] Direct action, no confirmation dialog. The server
  // remains authoritative — this function never locally sets sessionId
  // to null; the banner's own disappearance is entirely driven by the
  // live listener above observing the server's own eventual write.
  const handleDisconnect = async () => {
    if (!businessId || !sessionId || !currentUser || ending) return;
    setEnding(true);
    try {
      const idToken = await currentUser.getIdToken();
      await fetch('/api/business/support-session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ businessId, sessionId }),
      });
    } catch (err) {
      console.error('Error ending support session:', err);
    } finally {
      setEnding(false);
    }
  };

  if (!sessionId) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="w-4 h-4 shrink-0 text-blue-600" strokeWidth={2.25} />
          <span className="font-bold text-[13px] text-blue-800">{t('supportSession.banner.title')}</span>
          <span className="text-[13px] text-blue-700">· {t('supportSession.banner.message')}</span>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={ending}
          className="text-[12px] font-bold text-blue-800 underline hover:text-blue-900 disabled:opacity-50"
        >
          {t('supportSession.banner.disconnectButton')}
        </button>
      </div>
    </div>
  );
};
