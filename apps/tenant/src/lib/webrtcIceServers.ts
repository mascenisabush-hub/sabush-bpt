// SuperAdmin Agent Attended Support Session — Checkpoint 6 (Desktop
// WebRTC). ICE server configuration.
//
// [Rule 8 Finding 1-B / Decision 8, Rule 8 Closure §8.1/§8.3] TURN/
// relay is an explicit, disclosed PRE-PRODUCTION dependency for the
// desktop rendering path — "must be provisioned before desktop-path
// production use," with vendor/self-hosted selection left as an
// ordinary Implementation Plan / procurement item, deliberately not
// decided or invented here. NO TURN SERVICE IS CONFIGURED BY THIS
// FILE, and none may be hard-coded into it.
//
// This default is STUN-only — a public, free, zero-vendor-selection
// NAT-discovery service (not a TURN relay; it cannot itself relay
// media, only helps two peers discover their own public address) —
// suitable for development/testing where both peers can reach a
// direct peer-to-peer connection. It is NOT production-ready ICE
// infrastructure and must never be presented as such.
//
// Configurable via VITE_WEBRTC_ICE_SERVERS (a JSON-encoded
// RTCIceServer[] array), matching this codebase's own existing
// import.meta.env.VITE_* convention (apps/tenant/src/lib/firebase.ts).
// When a production TURN service is eventually provisioned (Decision
// 8's own requirement), it is added via this same environment
// variable — this file's own code does not need to change.
function resolveIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS as string | undefined;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    } catch {
      // Fall through to the development default below — an invalid
      // env value must never crash the app.
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

export const ICE_SERVERS: RTCIceServer[] = resolveIceServers();
