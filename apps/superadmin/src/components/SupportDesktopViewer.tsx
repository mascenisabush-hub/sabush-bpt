import { useEffect, useRef, useState } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ICE_SERVERS } from '../lib/webrtcIceServers';

// SuperAdmin Agent Attended Support Session — Checkpoint 6: Desktop
// WebRTC, SUPPORT OPERATOR side (the receiving/viewing participant,
// FR-20).
//
// Governing chain: identical to apps/tenant/src/components/
// SupportDesktopCapture.tsx's own header — BDR-0018 -> Policy (Rule M,
// Rule N) -> Specification (FR-19-FR-22, Section 11) -> Rule 8
// (CLOSED / PASS, Findings 1-A/1-B/3-A) -> Implementation Authorization
// (Signed, Section 3 item 5) -> Checkpoint 6.
//
// MEDIA DIRECTION (fixed, not reversible here): this component only
// ever RECEIVES — it creates the SDP answer and attaches the incoming
// MediaStream to a <video> element. It never calls getDisplayMedia()
// and never transmits any media of its own (FR-20's own "its only
// input is the incoming media stream").
//
// STRUCTURAL ZERO-WRITE GUARANTEE (FR-20, Rule M, Rule 8 Finding
// 3-A — "the strongest guarantee in this entire capability"): this
// component holds no Firebase Auth credential belonging to the
// customer, no direct Firestore connection to the business's own
// tenant data, and no dependency on the tenant SPA's own code — its
// only inputs are this Session's own signaling documents (already
// authorized, read-only from this component's perspective except for
// the answer/ICE-candidate documents it itself creates, which never
// carry anything beyond SDP/ICE data) and the resulting MediaStream.
// It cannot click, type, submit, or mutate anything tenant-owned,
// because it has no code path capable of reaching tenant data at all.
//
// NOT YET WIRED INTO A NAVIGATION FLOW: this component is
// self-contained and prop-driven (businessId, sessionId), matching
// every prior checkpoint's own established pattern of building one
// clean, testable piece without inventing the surrounding screen that
// doesn't exist yet (no "operator enters a session" screen exists
// anywhere in apps/superadmin — building one is not part of "Desktop
// WebRTC" itself, and inventing it here would be unauthorized UI/UX
// expansion beyond this checkpoint's own scope). A future checkpoint
// or session-viewing screen can mount this component once it knows
// which businessId/sessionId the operator is actively viewing.
//
// SIGNALING SCHEMA: identical to SupportDesktopCapture.tsx's own
// documented schema — 'offer' (read here), 'answer' (written here),
// {autoId} ice-candidate documents (both read and written here).
export interface SupportDesktopViewerProps {
  businessId: string;
  sessionId: string;
}

export function SupportDesktopViewer({ businessId, sessionId }: SupportDesktopViewerProps) {
  const [sessionStatus, setSessionStatus] = useState<'active' | 'reconnecting' | null>(null);
  const [connectionState, setConnectionState] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>('waiting');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  const answeredRef = useRef(false);

  const cleanup = () => {
    cleanupFnsRef.current.forEach((fn) => fn());
    cleanupFnsRef.current = [];
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    answeredRef.current = false;
  };

  // [I-12/FR-63, already-authorized read] Watches this Session's own
  // status — the ONLY authority for whether this component's WebRTC
  // resources should exist. Never writes supportSessions.status;
  // never independently decides a Session has ended.
  useEffect(() => {
    if (!businessId || !sessionId) return;

    const sessionRef = doc(db, 'businesses', businessId, 'supportSessions', sessionId);
    const unsubscribe = onSnapshot(
      sessionRef,
      (snap) => {
        if (!snap.exists()) {
          setSessionStatus(null);
          return;
        }
        const status = snap.data().status;
        setSessionStatus(status === 'active' || status === 'reconnecting' ? status : null);
      },
      () => setSessionStatus(null)
    );

    return () => unsubscribe();
  }, [businessId, sessionId]);

  // Teardown the instant the Session leaves active/reconnecting
  // (FR-36/FR-37) — required cleanup only, never a liveness decision.
  useEffect(() => {
    if (!sessionStatus) {
      cleanup();
      setConnectionState('ended');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // Establish the peer connection and answer the customer's offer
  // once one is published.
  useEffect(() => {
    if (!businessId || !sessionId || !sessionStatus) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    setConnectionState('connecting');

    // FR-20: this component only ever receives — attach the incoming
    // stream to the <video> element, never captures or sends media of
    // its own.
    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
      setConnectionState('connected');
    };

    const signalingRef = collection(db, 'businesses', businessId, 'supportSessions', sessionId, 'webrtcSignaling');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(signalingRef, {
          type: 'ice-candidate',
          from: 'operator',
          candidate: event.candidate.toJSON(),
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    };

    // Listen for the customer's offer, then answer exactly once.
    const offerRef = doc(signalingRef, 'offer');
    const unsubOffer = onSnapshot(offerRef, async (snap) => {
      if (snap.exists() && !answeredRef.current) {
        const data = snap.data();
        if (typeof data.sdp === 'string') {
          answeredRef.current = true;
          await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setDoc(doc(signalingRef, 'answer'), {
            type: 'answer',
            sdp: answer.sdp,
            createdAt: serverTimestamp(),
          });
        }
      }
    });
    cleanupFnsRef.current.push(unsubOffer);

    // Listen for the customer's own ICE candidates only.
    const customerCandidatesQuery = query(
      signalingRef,
      where('type', '==', 'ice-candidate'),
      where('from', '==', 'customer')
    );
    const seenCandidateIds = new Set<string>();
    const unsubCandidates = onSnapshot(customerCandidatesQuery, (snap) => {
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

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, sessionId, sessionStatus]);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto bg-black" />
      {connectionState === 'waiting' && <p>Waiting for the customer to start sharing…</p>}
      {connectionState === 'ended' && <p>This session has ended.</p>}
    </div>
  );
}
