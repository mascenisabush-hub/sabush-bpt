// Periodic Contagem — when must the count's own meta document be created
// BEFORE a row's first write?
//
// A row's first write (savePeriodicStockDraftItem) deliberately refuses to run
// when the draft's meta document does not exist ("Esta Contagem já não está
// ativa"): that guard stops a stale retry from resurrecting a draft another
// device already finalized (Decision 58). But on a brand-new count nothing had
// created the meta document yet — an edit to a catalog product only scheduled
// its own row save, and only structural actions (add manual row, change
// type/label/date, ...) scheduled the meta save. The very first row write of a
// first contagem could therefore throw, land in `save-unknown`, and manual
// retry would repeat the same failure forever.
//
// The two situations differ in one observable way: on a never-created draft
// this device has NEVER seen a draft document in the current count lifecycle;
// on a draft finalized/discarded elsewhere it HAS. So the meta document is
// bootstrapped only in the first case, and only once the listener has actually
// confirmed there is no draft (never while still loading, which could
// overwrite a real draft's meta with a full replace).

export interface MetaBootstrapInputs {
  /** Only catalog/manual row keys ever need a bootstrap. */
  rowKey: string;
  /** Aggregated draft listener state from AppContext. */
  listenerState: 'loading' | 'confirmed-no-draft' | 'draft-exists' | 'load-error';
  /** A draft (meta) document is currently present per the live listener. */
  draftExists: boolean;
  /** This device has seen a draft document in the current count lifecycle. */
  metaSeenThisLifecycle: boolean;
  /** A bootstrap meta save was already requested and has not yet been echoed back. */
  bootstrapAlreadyRequested: boolean;
  /** A meta save is already scheduled (debounce pending). */
  metaSaveAlreadyPending: boolean;
}

export function shouldBootstrapPeriodicDraftMeta(input: MetaBootstrapInputs): boolean {
  if (!input.rowKey.startsWith('catalog:') && !input.rowKey.startsWith('manual:')) return false;
  if (input.listenerState !== 'confirmed-no-draft') return false;
  if (input.draftExists) return false;
  if (input.metaSeenThisLifecycle) return false;
  if (input.bootstrapAlreadyRequested) return false;
  if (input.metaSaveAlreadyPending) return false;
  return true;
}
