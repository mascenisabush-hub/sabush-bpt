/**
 * Platform Background Worker — Job Registration Interface.
 *
 * Implements ADR-0003 (Background Worker Job Registration Model),
 * under Module #20 Phase 3 Implementation Authorization, Checkpoint 1
 * only.
 *
 * Checkpoint 1 scope (per the signed authorization + explicit
 * instruction): introduce `registerJob()` and migrate the existing
 * `runTrialLifecycleSweep()` onto it, as a pure architectural refactor
 * with zero business behavior change. This file intentionally does
 * NOT include: `BusinessEvent`, the dedupe/watermark mechanism
 * (Architecture §4.8.1), producers, or the Notification Platform
 * evaluation layer — those are later Phase 3 checkpoints.
 *
 * What the worker owns (ADR-0003 "Decision"): schedule, execution,
 * retry, watermark (future), isolation, and generic job-agnostic
 * logging. What it does NOT own: any business logic — that lives
 * entirely inside each job's own `execute`.
 *
 * Fix #8 — Production Observability. This is the one place every
 * registered job's execute() failure funnels through regardless of
 * which module registered it, so it's also the single generic point
 * where a job failure gets escalated beyond a console.error nobody is
 * watching. See server/alerting.ts for what "escalated" means and why
 * it's safe to call unconditionally.
 */
import { reportCriticalFailure } from './alerting';

// Same pattern the original Trial Lifecycle Worker used: run once
// shortly after boot rather than waiting a full interval for the
// first pass. Not currently configurable per-job — no second job
// exists yet to require that; revisit if/when a future job type
// needs a different initial-run delay.
const JOB_INITIAL_RUN_DELAY_MS = 5000;

/**
 * Retry policy is part of ADR-0003's conceptual registration shape,
 * but ADR-0003 itself defers "specific retry counts, backoff
 * intervals" to engineering-planning detail, and this checkpoint's
 * scope excludes building retry mechanics. The field exists so the
 * interface won't need a breaking change when retry is actually
 * implemented; it is currently accepted but not acted on — a failed
 * execution is not retried before its next scheduled tick, exactly
 * matching the pre-migration behavior.
 */
export interface JobRetryPolicy {
  maxAttempts?: number;
}

export interface RegisteredJobConfig {
  /** Stable string identity for this job, e.g. "trial-lifecycle-sweep". */
  jobType: string;
  /** Interval, in milliseconds, between scheduled runs. */
  scheduleMs: number;
  /** The registering module's own business logic. Owned entirely by
   *  that module — the worker never inspects or interprets it. */
  execute: () => Promise<void>;
  /** Accepted, not yet implemented. See `JobRetryPolicy`. */
  retryPolicy?: JobRetryPolicy;
}

class PlatformBackgroundWorker {
  private registeredJobTypes = new Set<string>();

  /**
   * Registers a job against the worker. The worker schedules and
   * executes it, and isolates its failures from every other
   * registered job (ADR-0003 "Failure Isolation") — a thrown error
   * or rejected promise from one job's `execute` is caught, logged,
   * and never propagates to stop the worker process or block a
   * sibling job's own scheduled run.
   */
  registerJob(config: RegisteredJobConfig): void {
    if (this.registeredJobTypes.has(config.jobType)) {
      throw new Error(
        `[background-worker] jobType "${config.jobType}" is already registered — each jobType must be unique.`
      );
    }
    this.registeredJobTypes.add(config.jobType);

    const runOnce = async (): Promise<void> => {
      const startedAt = Date.now();
      try {
        await config.execute();
        console.log('[background-worker] job run completed', {
          jobType: config.jobType,
          durationMs: Date.now() - startedAt,
        });
      } catch (err) {
        // Isolation boundary: caught here, logged, deliberately never
        // rethrown. A failure inside one job's business logic is that
        // job's/module's concern, not a platform-wide outage, and must
        // not prevent other registered jobs' scheduled ticks from
        // running (ADR-0003).
        reportCriticalFailure('[background-worker]', 'job run failed', {
          jobType: config.jobType,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    setTimeout(() => {
      runOnce();
    }, JOB_INITIAL_RUN_DELAY_MS);

    setInterval(() => {
      runOnce();
    }, config.scheduleMs);
  }
}

/**
 * Single shared worker instance (ADR-0002: one Platform Background
 * Worker, not one per module). Modules register jobs against this
 * instance; the worker itself stays domain-ignorant.
 */
export const backgroundWorker = new PlatformBackgroundWorker();
