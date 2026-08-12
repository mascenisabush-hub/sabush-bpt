/**
 * Fix #8 — Production Observability.
 *
 * The single alerting primitive for the whole server. Deliberately not
 * an observability platform: no dashboards, no metrics pipeline, no
 * per-request instrumentation. It answers one question — "if something
 * important breaks for a pilot customer, does anyone find out?" — for
 * the failure paths that were previously silent:
 *
 *   - The four sweep-level Firestore query failures that were caught
 *     and swallowed with a bare `return` (trial/closing/breakage
 *     notification producers, subscriptionEngine's grace-period sweep)
 *     — the sweep silently produces nothing that cycle and nothing
 *     upstream ever learns why.
 *   - backgroundWorker.ts's single job-run-failed catch, which covers
 *     any registered job's execute() throwing.
 *   - Truly uncaught server errors (process-level handlers, the final
 *     Express error middleware) — see server/index.ts.
 *   - Client-side crash reports relayed via POST /api/client-error.
 *
 * `reportCriticalFailure` always logs in the exact structured shape
 * every other module in this codebase already uses
 * (`console.error('[tag] message', meta)`), so Railway's existing log
 * ingestion is completely unaffected — this is a superset, not a
 * replacement. It additionally attempts to deliver the same event to
 * an external channel (any Slack- or Discord-compatible incoming
 * webhook — both accept a simple `{ text: string }` POST body) IF
 * ALERT_WEBHOOK_URL is configured. If it isn't, delivery is a no-op:
 * this file degrades to "just the existing logging, centralized" with
 * zero behavior change and zero deploy risk.
 *
 * Delivery is fire-and-forget from the caller's point of view — it
 * never throws, never awaits network I/O long enough to block the
 * caller's own control flow in practice (5s timeout, not awaited by
 * callers), and a delivery failure itself only ever produces one more
 * console.error, never a retry queue or a second failure mode.
 */

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

// Avoids paging the same repeatedly-failing sweep every single tick
// (e.g. an hourly job stuck on a missing Firestore index would
// otherwise page 24x/day forever). Keyed by "tag message", so distinct
// failures still alert independently. Overridable for testing; default
// matches the existing hourly sweep cadence closely enough that a
// still-broken job re-alerts on roughly its next natural tick, not
// sooner.
const ALERT_COOLDOWN_MS = Number(process.env.ALERT_COOLDOWN_MS) || 15 * 60 * 1000;

const lastAlertSentAt = new Map<string, number>();

async function deliverExternalAlert(dedupeKey: string, text: string): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;

  const now = Date.now();
  const last = lastAlertSentAt.get(dedupeKey);
  if (last !== undefined && now - last < ALERT_COOLDOWN_MS) return;
  lastAlertSentAt.set(dedupeKey, now);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 3000) }),
      signal: controller.signal,
    });
  } catch (err) {
    // Delivery failing must never become its own silent black hole or
    // a reason to crash/retry — one more structured log line, nothing
    // else.
    console.error('[alerting] failed to deliver external alert', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Report a critical, previously-silent failure. `tag` matches this
 * codebase's existing bracketed-module convention, e.g.
 * '[trial-notification-producer]'. `meta` is the same kind of context
 * object already passed to console.error everywhere else.
 */
export function reportCriticalFailure(tag: string, message: string, meta: Record<string, unknown> = {}): void {
  console.error(`${tag} ${message}`, meta);

  const dedupeKey = `${tag} ${message}`;
  const text = `🚨 Sabush BPT — ${tag} ${message}\n${JSON.stringify(meta)}`;
  // Intentionally not awaited by callers — alerting must never make a
  // background sweep or a request handler slower or less reliable.
  void deliverExternalAlert(dedupeKey, text);
}
