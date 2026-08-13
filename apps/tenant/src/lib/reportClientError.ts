/**
 * Fix #8 — Production Observability.
 *
 * Best-effort, fire-and-forget reporter for client-side crashes. Sends
 * to POST /api/client-error (server/index.ts), which logs it in this
 * codebase's existing structured format and relays it through
 * server/alerting.ts — the same channel every server-side critical
 * failure now goes through.
 *
 * Two hard constraints, because this runs inside error-handling paths
 * where nothing can be allowed to make things worse:
 *   - Never throws. A reporting failure must never become a second,
 *     compounding crash on top of the one being reported.
 *   - Capped per browser session (MAX_REPORTS_PER_SESSION). A crash
 *     inside a render loop, or an error that fires on every frame,
 *     must not turn into an unbounded flood against the server or the
 *     external alert channel.
 */

const MAX_REPORTS_PER_SESSION = 5;
let reportsThisSession = 0;

export function reportClientError(error: unknown, source: string, extra: Record<string, unknown> = {}): void {
  try {
    if (reportsThisSession >= MAX_REPORTS_PER_SESSION) return;
    reportsThisSession += 1;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const payload = JSON.stringify({
      message,
      stack,
      source,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...extra,
    });

    // sendBeacon is preferred: it's designed for exactly this
    // situation (fire during page unload/navigation/crash recovery,
    // no response ever read) and works even if the page is about to
    // be torn down. `keepalive: true` on fetch is the closest
    // equivalent where sendBeacon isn't available.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/client-error', blob);
    } else {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Deliberately swallowed — see the "never throws" constraint above.
      });
    }
  } catch {
    // Reporting itself is the last resort; if even this throws, there
    // is nothing further to fall back to.
  }
}
