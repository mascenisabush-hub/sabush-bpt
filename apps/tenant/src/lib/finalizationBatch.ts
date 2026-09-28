// A Firestore WriteBatch holds at most 500 operations. recordStockCount put EVERYTHING into one batch:
// every new Product, every product update, the count, the Business Worth snapshot, and one delete per
// draft item + tombstone + the draft meta. On a first contagem every counted product is both a new
// Product write and >=1 draft-item delete, so ~245 products already overflowed it, and the commit was
// rejected as a whole: the Owner could never confirm, with only a generic error.
//
// Normal case (<= 500 ops): exactly one atomic batch, unchanged behavior.
// Overflow case, in this order:
//   1. "head" writes (new products / selling-memory updates) are committed in chunks first. If any
//      fails we throw; nothing user-visible exists yet and a retry re-matches the created products by
//      name.
//   2. the "tail" (the count, snapshot, snapshot corrections) is ONE atomic batch, topped up with as
//      many draft-cleanup deletes as still fit. Count + snapshot can therefore never be split apart.
//   3. the remaining draft-cleanup deletes are committed in chunks, meta last. These are best-effort:
//      once the count is saved a failure here must not turn a saved count into an error, so it is
//      reported via `cleanupIncomplete` and the caller logs it. (A leftover draft is discardable via
//      the normal "Descartar/Começar Nova Contagem" flow; a lost count is not recoverable.)

export const FIRESTORE_BATCH_LIMIT = 500;

type Op = { kind: 'set' | 'update' | 'delete'; ref: any; data?: any };

export interface BatchLike {
  set(ref: any, data: any): unknown;
  update(ref: any, data: any): unknown;
  delete(ref: any): unknown;
  commit(): Promise<void>;
}

export interface FinalizationBatchResult {
  batchesCommitted: number;
  cleanupIncomplete: boolean;
}

export const createFinalizationBatch = (makeBatch: () => BatchLike, limit: number = FIRESTORE_BATCH_LIMIT) => {
  const head: Op[] = [];
  const tail: Op[] = [];
  const cleanup: Op[] = [];
  let inTail = false;

  const apply = (batch: BatchLike, op: Op) => {
    if (op.kind === 'set') batch.set(op.ref, op.data);
    else if (op.kind === 'update') batch.update(op.ref, op.data);
    else batch.delete(op.ref);
  };
  const push = (op: Op) => (inTail ? tail : head).push(op);

  return {
    set: (ref: any, data: any) => void push({ kind: 'set', ref, data }),
    update: (ref: any, data: any) => void push({ kind: 'update', ref, data }),
    delete: (ref: any) => void push({ kind: 'delete', ref }),
    // Every op recorded after this call belongs to the atomic tail (count + snapshot + corrections).
    beginTail: () => {
      inTail = true;
    },
    // Draft cleanup: deleted after the count is safe, best-effort if the batch must be split.
    deleteCleanup: (ref: any) => void cleanup.push({ kind: 'delete', ref }),
    get operationCount() {
      return head.length + tail.length + cleanup.length;
    },
    async commit(): Promise<FinalizationBatchResult> {
      if (head.length + tail.length + cleanup.length <= limit) {
        const batch = makeBatch();
        [...head, ...tail, ...cleanup].forEach((op) => apply(batch, op));
        await batch.commit();
        return { batchesCommitted: 1, cleanupIncomplete: false };
      }
      if (tail.length > limit) {
        throw new Error('Esta Contagem é demasiado grande para ser confirmada de uma só vez.');
      }
      let committed = 0;
      for (let i = 0; i < head.length; i += limit) {
        const batch = makeBatch();
        head.slice(i, i + limit).forEach((op) => apply(batch, op));
        await batch.commit();
        committed += 1;
      }
      const room = limit - tail.length;
      const tailBatch = makeBatch();
      tail.forEach((op) => apply(tailBatch, op));
      cleanup.slice(0, room).forEach((op) => apply(tailBatch, op));
      await tailBatch.commit();
      committed += 1;

      let cleanupIncomplete = false;
      const rest = cleanup.slice(room);
      for (let i = 0; i < rest.length; i += limit) {
        try {
          const batch = makeBatch();
          rest.slice(i, i + limit).forEach((op) => apply(batch, op));
          await batch.commit();
          committed += 1;
        } catch (err) {
          cleanupIncomplete = true;
          console.error('[periodic-contagem] finalization: draft cleanup chunk failed (count already saved):', err);
          break;
        }
      }
      return { batchesCommitted: committed, cleanupIncomplete };
    },
  };
};
