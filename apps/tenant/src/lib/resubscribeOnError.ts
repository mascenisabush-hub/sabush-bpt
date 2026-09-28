// A Firestore onSnapshot listener is terminated by the SDK the moment its
// error callback fires: it never delivers again. The draft listeners'
// error UI tells the Owner "esta página tentará novamente
// automaticamente", but nothing re-attached them, so a single transient
// error (token refresh race, backend `unavailable`/`internal`) left the
// Contagem screens on the error card until a full page reload.
//
// `start` attaches one listener and returns its unsubscribe. It receives
// `retryAfterError`, which the listener's error callback calls (only in
// the branches that should retry) to schedule a fresh attach with
// backoff. The returned function disposes everything: the live listener
// and any pending re-attach timer, so an effect cleanup can never leak a
// listener that re-attaches after unmount or a business switch.

export const RESUBSCRIBE_DELAYS_MS = [2000, 5000, 10000, 20000, 30000];

type Scheduler = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const defaultScheduler: Scheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function subscribeWithRetry(
  start: (retryAfterError: () => void) => () => void,
  delays: number[] = RESUBSCRIBE_DELAYS_MS,
  scheduler: Scheduler = defaultScheduler
): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let timer: unknown = null;
  let failures = 0;

  const attach = () => {
    timer = null;
    if (disposed) return;
    let retryRequested = false;
    const retryAfterError = () => {
      // One re-attach per dead listener, however many times it is called.
      if (disposed || retryRequested) return;
      retryRequested = true;
      unsubscribe = null; // already terminated by the SDK
      const delay = delays[Math.min(failures, delays.length - 1)];
      failures += 1;
      timer = scheduler.setTimeout(attach, delay);
    };
    const unsub = start(retryAfterError);
    // The error callback may already have run synchronously inside start().
    if (!retryRequested) unsubscribe = unsub;
  };

  attach();

  return () => {
    disposed = true;
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  };
}
