// Periodic Contagem — row identity, pending-row selection and duplicate rules.
//
// Pure, dependency-free helpers so the rules that protect the owner's typed data can be tested directly
// (not only by reading source text). Governing rules, stated by the Product Owner (28 Sept 2026):
//   1. Nothing the owner did not type may be written or deleted by an automatic action (refresh, resume,
//      page hide, Review entry, business switch, migration).
//   2. Two portions of the same product with the same quantity, Unit and Selling Price (hence the same
//      total) are duplicates. That must never exist.

export interface KeyedRowLike {
  sourceRowKey?: string;
}

export interface PortionLike {
  productName: string;
  quantity: string;
  unit: string;
  sellingPrice: string;
  removed?: boolean;
}

/** A pure-integer suffix marks the OLD position-based key (`manual:3`). Stable keys are `manual:<uuid>`. */
export const LEGACY_POSITIONAL_KEY = /^manual:\d+$/;
export const isLegacyPositionalKey = (key: string): boolean => LEGACY_POSITIONAL_KEY.test(key);

/** The Firestore document key of a manual row: its stable key if it has one, else its positional key. */
export function manualRowKey(row: KeyedRowLike, index: number): string {
  return row.sourceRowKey ?? `manual:${index}`;
}

/**
 * Locates a manual row by its EXACT document key. Never derives an index from the text after `manual:`:
 * a UUID such as `manual:9f3c…` would be read as index 9, and `manual:a1b2…` as NaN, which made saves
 * skip the row or write another row's content under the wrong key.
 */
export function findManualRowIndexByKey(rows: readonly KeyedRowLike[], rowKey: string): number {
  return rows.findIndex((row, index) => manualRowKey(row, index) === rowKey);
}

/** Keys of rows that have an edit not yet confirmed saved (debounce pending, retry pending, or dirty). */
export function collectPendingRowKeys(sources: {
  timerKeys: Iterable<string>;
  retryKeys: Iterable<string>;
  dirtySaveTargets: Iterable<string | undefined | null>;
}): Set<string> {
  const keys = new Set<string>();
  const add = (key: string | undefined | null) => {
    if (key && (key.startsWith('catalog:') || key.startsWith('manual:'))) keys.add(key);
  };
  for (const key of sources.timerKeys) add(key);
  for (const key of sources.retryKeys) add(key);
  for (const key of sources.dirtySaveTargets) add(key);
  return keys;
}

/** Builds the rows to persist for an interruption/Review flush: ONLY the pending ones, under their real keys. */
export function buildPendingRowsByKey<TRow extends KeyedRowLike, TItem>(
  pendingKeys: ReadonlySet<string>,
  catalogRows: Readonly<Record<string, TRow>>,
  manualRows: readonly TRow[],
  toItem: (row: TRow) => TItem
): Record<string, TItem> {
  const out: Record<string, TItem> = {};
  for (const key of pendingKeys) {
    if (key.startsWith('catalog:')) {
      const row = catalogRows[key.slice('catalog:'.length)];
      if (row) out[key] = toItem(row);
    } else if (key.startsWith('manual:')) {
      const index = findManualRowIndexByKey(manualRows, key);
      if (index >= 0) out[key] = toItem(manualRows[index]);
    }
  }
  return out;
}

/** Same product + Unit + quantity + Selling Price. Null when the row is not complete enough to compare. */
export function portionSignature(row: PortionLike): string | null {
  if (row.removed) return null;
  const name = row.productName.trim().toLowerCase();
  const unit = row.unit.trim().toLowerCase();
  const quantity = parseFloat(row.quantity);
  const price = parseFloat(row.sellingPrice);
  if (!name || !unit || !Number.isFinite(quantity) || !Number.isFinite(price)) return null;
  if (quantity <= 0) return null; // a zero-quantity portion carries no value; it is never a "duplicate"
  return `${name}|${unit}|${quantity}|${price}`;
}

export function isDuplicatePortion(row: PortionLike, others: readonly PortionLike[]): boolean {
  const signature = portionSignature(row);
  if (signature === null) return false;
  return others.some((other) => portionSignature(other) === signature);
}

/** Product names that appear more than once with an identical portion (for the Review gate message). */
export function findDuplicateProductNames(rows: readonly PortionLike[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    const signature = portionSignature(row);
    if (signature === null) continue;
    if (seen.has(signature)) {
      const display = row.productName.trim();
      if (!names.includes(display)) names.push(display);
    } else {
      seen.add(signature);
    }
  }
  return names;
}

export const DUPLICATE_PORTION_MESSAGE =
  'Já existe uma porção igual deste produto (mesma quantidade, unidade e preço). Some as quantidades numa única porção em vez de a repetir.';

/**
 * Decides which stored manual documents become rows when a draft is resumed. Reads EVERY `manual:` document
 * (the old code parsed the text after the colon and silently dropped UUID keys that parse to NaN), orders them
 * by their real position, and never loads an identical portion twice. Nothing is deleted or written: a
 * suppressed duplicate stays untouched in storage and is cleaned only by the normal end-of-count cleanup.
 */
export function planManualRowsFromDraft<TItem extends PortionLike & { orderIndex?: number }>(
  entries: readonly { rowKey: string; item: TItem }[]
): { keep: { rowKey: string; item: TItem }[]; suppressedDuplicateKeys: string[] } {
  const position = (rowKey: string, item: TItem): number =>
    isLegacyPositionalKey(rowKey)
      ? parseInt(rowKey.slice('manual:'.length), 10)
      : typeof item.orderIndex === 'number'
      ? item.orderIndex
      : Number.MAX_SAFE_INTEGER;
  const candidates = entries.filter((entry) => entry.rowKey.startsWith('manual:'));
  // Stable-keyed documents claim a portion before legacy positional copies do.
  const claimOrder = [...candidates].sort((a, b) => {
    const legacyA = isLegacyPositionalKey(a.rowKey) ? 1 : 0;
    const legacyB = isLegacyPositionalKey(b.rowKey) ? 1 : 0;
    if (legacyA !== legacyB) return legacyA - legacyB;
    const delta = position(a.rowKey, a.item) - position(b.rowKey, b.item);
    return delta !== 0 ? delta : a.rowKey.localeCompare(b.rowKey);
  });
  const claimed = new Set<string>();
  const kept = new Set<string>();
  const suppressedDuplicateKeys: string[] = [];
  for (const entry of claimOrder) {
    const signature = portionSignature(entry.item);
    if (signature !== null && claimed.has(signature)) {
      suppressedDuplicateKeys.push(entry.rowKey);
      continue;
    }
    if (signature !== null) claimed.add(signature);
    kept.add(entry.rowKey);
  }
  const keep = candidates
    .filter((entry) => kept.has(entry.rowKey))
    .sort((a, b) => {
      const delta = position(a.rowKey, a.item) - position(b.rowKey, b.item);
      return delta !== 0 ? delta : a.rowKey.localeCompare(b.rowKey);
    });
  return { keep, suppressedDuplicateKeys };
}

/**
 * Which legacy position-named documents the automatic migration may touch. A legacy document whose portion is
 * identical to another document's is a copy, not something the owner typed: it is left exactly as it is
 * (not moved, not deleted).
 */
export function selectLegacyKeysToMigrate(docs: readonly { id: string; data: PortionLike }[]): {
  migrate: string[];
  skippedDuplicates: string[];
} {
  const stableSignatures = new Set<string>();
  for (const doc of docs) {
    if (doc.id.startsWith('manual:') && !isLegacyPositionalKey(doc.id)) {
      const signature = portionSignature(doc.data);
      if (signature !== null) stableSignatures.add(signature);
    }
  }
  const legacy = docs
    .filter((doc) => isLegacyPositionalKey(doc.id))
    .sort((a, b) => parseInt(a.id.slice('manual:'.length), 10) - parseInt(b.id.slice('manual:'.length), 10));
  const seenLegacy = new Set<string>();
  const migrate: string[] = [];
  const skippedDuplicates: string[] = [];
  for (const doc of legacy) {
    const signature = portionSignature(doc.data);
    if (signature !== null && (stableSignatures.has(signature) || seenLegacy.has(signature))) {
      skippedDuplicates.push(doc.id);
      continue;
    }
    if (signature !== null) seenLegacy.add(signature);
    migrate.push(doc.id);
  }
  return { migrate, skippedDuplicates };
}
