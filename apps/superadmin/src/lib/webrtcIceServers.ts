// SuperAdmin Agent Attended Support Session — Checkpoint 6 (Desktop
// WebRTC). ICE server configuration — operator side. Identical
// reasoning and contract to apps/tenant/src/lib/webrtcIceServers.ts;
// duplicated (not shared-package'd) to keep each app self-contained,
// matching this monorepo's existing convention of app-local `lib/`
// modules (firebase.ts, superadminApi.ts) rather than introducing new
// cross-app shared-package plumbing for a single small constant.
//
// [Rule 8 Finding 1-B / Decision 8, Rule 8 Closure §8.1/§8.3] TURN/
// relay is an explicit, disclosed PRE-PRODUCTION dependency — "must be
// provisioned before desktop-path production use," vendor/self-hosted
// selection deliberately left open. NO TURN SERVICE IS CONFIGURED BY
// THIS FILE.
//
// STUN-only development default (not a TURN relay). Configurable via
// VITE_WEBRTC_ICE_SERVERS (JSON-encoded RTCIceServer[]).
function resolveIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS as string | undefined;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    } catch {
      // Fall through to the development default below.
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

export const ICE_SERVERS: RTCIceServer[] = resolveIceServers();
