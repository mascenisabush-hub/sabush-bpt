import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { ICE_SERVERS } from '../lib/webrtcIceServers';

// SuperAdmin Agent Attended Support Session — Checkpoint 6: Desktop
// WebRTC, CUSTOMER side (the capturing/sending participant, FR-19).
//
// Governing chain: BDR-0018 -> Policy (Rule M, Rule N) -> Specification
// (FR-19-FR-22, Section 11) -> Rule 8 (CLOSED / PASS, Findings 1-A/
// 1-B/3-A) -> Implementation Authorization (Signed, Section 3 item 5)
// -> Checkpoint 6.
//
// MEDIA DIRECTION (FR-19/FR-20, fixed, not reversible here): this
// component only ever SENDS — it calls getDisplayMedia(), adds the
// resulting tracks to an RTCPeerConnection, and creates the SDP offer.
// It never receives a remote media stream.
//
// SESSION DETECTION: reuses the exact same live-query pattern
// SupportPointerOverlay.tsx (Checkpoint 5) already established —
// businesses/{businessId}/supportSessions filtered to status in
// ['active','reconnecting'] — not a new mechanism.
//
// WHY A BUTTON EXISTS AT ALL (not "Checkpoint 7 transparency UI"):
// browsers require getDisplayMedia() to be called from within a
// direct user-gesture handler (a click) — it cannot be invoked
// automatically from a Firestore snapshot callback or on mount; doing
// so simply fails in every modern browser. This is the mandatory,
// purely technical trigger FR-19's own "the customer's browser
// captures... via the browser's own native picker" requires to exist
// at all — never a persistent status indicator, never a disconnect
// control, and it disappears the instant sharing starts. Checkpoint
// 7's own "Support connected" banner (Rule Q) and disconnect button
// (Rule R) remain entirely unbuilt here.
//
// SIGNALING SCHEMA (this checkpoint's own smallest implementation-
// level choice for FR-21's required properties — §24 item 1 of the
// Specification explicitly leaves the exact shape open):
// businesses/{businessId}/supportSessions/{sessionId}/webrtcSignaling/
//   'offer'  — { type: 'offer', sdp, createdAt } — written once, here.
//   'answer' — { type: 'answer', sdp, createdAt } — written once, by
//              the operator (apps/superadmin's own SupportDesktopViewer).
//   {autoId} — { type: 'ice-candidate', from: 'customer'|'operator',
//              candidate, createdAt } — one document per candidate,
//              from either side, matching the existing rule's
//              write-once/create-only design.
// No field beyond what FR-21 requires (SDP/ICE data) is ever written —
// no credential, no secret, no arbitrary tenant data (instruction §8).
//
// SESSION LIFECYCLE (FR-36/FR-37/FR-59 — critical): this component
// never writes supportSessions.status and never independently decides
// a session has ended. It only reacts to the already-authoritative
// status this same session-detection query already reads — the
// instant status leaves active/reconnecting, every local resource
// (RTCPeerConnection, MediaStream tracks, signaling listeners) is torn
// down. A native "Stop sharing" click (the browser's own UI, not this
// app's) triggers the identical required cleanup via each track's own
// `ended` event — never a new visible sharing-state UI.
export const SupportDesktopCapture: React.FC = () => {
  const { business } = useApp();
  const { t } = useLanguage();
  const businessId = business?.id ?? null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'reconnecting' | null>(null);

  // [Session detection — identical pattern to SupportPointerOverlay.tsx]
  useEffect(() => {
    if (!businessId) {
      setSessionId(null);
      setSessionStatus(null);
      return;
    }

    const sessionsRef = collection(db, 'businesses', businessId, 'supportSessions');
    const activeSessionsQuery = query(sessionsRef, where('status', 'in', ['active', 'reconnecting']));

    const unsubscribe = onSnapshot(
      activeSessionsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setSessionId(null);
          setSessionStatus(null);
        } else {
          setSessionId(snapshot.docs[0].id);
          const status = snapshot.docs[0].data().status;
          setSessionStatus(status === 'active' || status === 'reconnecting' ? status : null);
        }
      },
      () => {
        setSessionId(null);
        setSessionStatus(null);
      }
    );

    return () => unsubscribe();
  }, [businessId]);

  type CaptureState = 'idle' | 'capturing' | 'connected' | 'ended' | 'denied';
  const [captureState, setCaptureState] = useState<CaptureState>('idle');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  const supportsDesktopCapture =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  // [FR-36/FR-37 — required WebRTC cleanup, never a session-liveness
  // decision] Tears down every local resource this component created.
  // Never writes to supportSessions; never re-derives session status
  // on its own.
  const cleanup = () => {
    cleanupFnsRef.current.forEach((fn) => fn());
    cleanupFnsRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // React to the Session leaving active/reconnecting — the ONLY
  // authority for this. Never independently ends anything.
  useEffect(() => {
    if (!sessionId || !sessionStatus) {
      cleanup();
      setCaptureState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionStatus]);

  // Unmount cleanup.
  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSharing = async () => {
    if (!businessId || !sessionId) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      setCaptureState('capturing');

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        // Native "Stop sharing" (the browser's own control, never this
        // app's) — required cleanup only, no new visible UI.
        track.addEventListener('ended', () => {
          cleanup();
          setCaptureState('ended');
        });
      });

      const signalingRef = collection(db, 'businesses', businessId, 'supportSessions', sessionId, 'webrtcSignaling');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(signalingRef, {
            type: 'ice-candidate',
            from: 'customer',
            candidate: event.candidate.toJSON(),
            createdAt: serverTimestamp(),
          }).catch(() => {});
        }
      };

      // Listen for the operator's own answer.
      const answerRef = doc(signalingRef, 'answer');
      const unsubAnswer = onSnapshot(answerRef, async (snap) => {
        if (snap.exists() && pc.currentRemoteDescription === null) {
          const data = snap.data();
          if (typeof data.sdp === 'string') {
            await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
            setCaptureState('connected');
          }
        }
      });
      cleanupFnsRef.current.push(unsubAnswer);

      // Listen for the operator's own ICE candidates only.
      const operatorCandidatesQuery = query(
        signalingRef,
        where('type', '==', 'ice-candidate'),
        where('from', '==', 'operator')
      );
      const seenCandidateIds = new Set<string>();
      const unsubCandidates = onSnapshot(operatorCandidatesQuery, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' && !seenCandidateIds.has(change.doc.id)) {
            seenCandidateIds.add(change.doc.id);
            const data = change.doc.data();
            if (data.candidate) {
              pc.addIceCandidate(data.candidate).catch(() => {});
            }
          }
        });
      });
      cleanupFnsRef.current.push(unsubCandidates);

      // Create and publish the offer — the customer's browser
      // initiates, since it is the side adding tracks (FR-19).
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(doc(signalingRef, 'offer'), {
        type: 'offer',
        sdp: offer.sdp,
        createdAt: serverTimestamp(),
      });
    } catch {
      // getDisplayMedia denied, or any other capture failure — fail
      // without granting access or inventing an alternative capture
      // mechanism.
      setCaptureState('denied');
    }
  };

  if (!sessionId || !sessionStatus || !supportsDesktopCapture) return null;
  if (captureState === 'capturing' || captureState === 'connected') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[2147483646] bg-white border border-[#EEF0F3] rounded-lg shadow-lg px-4 py-3 max-w-xs">
      <p className="text-[13px] text-gray-700 mb-2">{t('supportSession.desktopCapture.prompt')}</p>
      <button
        type="button"
        onClick={startSharing}
        className="w-full text-[13px] font-bold text-white bg-[#0B1F3A] rounded-md px-3 py-2 hover:bg-[#0B1F3A]/90"
      >
        {t('supportSession.desktopCapture.button')}
      </button>
      {captureState === 'denied' && (
        <p className="text-[11px] text-rose-600 mt-2">{t('supportSession.desktopCapture.denied')}</p>
      )}
    </div>
  );
};
