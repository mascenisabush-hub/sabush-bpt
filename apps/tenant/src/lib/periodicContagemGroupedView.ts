// [Periodic Contagem Expanded Phase 2 — Integration Point 3, Step 2]
// Pure, presentation-layer group semantics — the "one logical product
// = one displayed row" contract, computed as a view-model layer on
// top of the existing, unmodified flat entry list. This module never
// touches Firestore, never mutates any row's own content, and never
// feeds tallyStockCountRows or the Business Worth Engine — grouping
// here is exclusively a display/state projection.
//
// Deliberately NOT wired into unifiedListEntries/visibleUnifiedListEntries
// or any JSX in this pass — those remain completely unmodified. This
// module exists to be consumed by a later, separate rendering step.

import { groupRowsByProductIdentity, type IdentifiableGroupableRow, type RowGroup } from './stockCountPortionGrouping';
import { deriveGroupPersistenceState, type PeriodicRowPersistenceState } from './periodicContagemPersistenceState';

export interface GroupableUnifiedEntry extends IdentifiableGroupableRow {
  rowKey: string;
  kind: 'catalog' | 'manual';
  catalogProductId: string | null;
  manualRowIndex: number | null;
  sourceRowKey?: string;
  quantity: string;
  unit: string;
  sellingPrice: string;
  validated: boolean;
  activationKey: string;
  isConflicted: boolean;
  persistenceState: PeriodicRowPersistenceState;
  entrySequence?: number;
  firstWriteAt?: string;
  originalOrderIndex?: number;
}

export interface ProductDisplayGroup {
  /** From groupRowsByProductIdentity — `id:{productId}` or `name:{trimmedLowerName}` or `''` for a blank-name singleton. Never array-index-derived. */
  key: string;
  displayName: string;
  members: GroupableUnifiedEntry[];
  /** True only if EVERY member is validated — matches the existing per-entry semantics, extended to "any member requires validation" being the unresolved case. */
  allValidated: boolean;
  /** True if ANY member has an unresolved conflict. The underlying conflict record itself is never merged or altered — this is an aggregate indicator only, still traceable to its own member via `members`. */
  anyConflicted: boolean;
  /** Worst-member-wins, via the already-approved deriveGroupPersistenceState — no new persistence-state policy introduced here. */
  persistenceState: PeriodicRowPersistenceState;
  /** Sort-representative values: the minimum among members with a defined value for each criterion — never array index. A group with no member having a value for a given criterion carries `undefined` for that criterion, matching sortByValidatedMode's own existing "missing value sorts last" handling. */
  sortRepresentative: {
    entrySequence?: number;
    firstWriteAt?: string;
    originalOrderIndex?: number;
  };
  /** PRESENTATION-ONLY aggregate — the sum of quantity x sellingPrice
   * across members, for display purposes exactly like a single row's
   * own value already is. Never read by tallyStockCountRows or any
   * Business Worth Engine calculation, both of which continue to sum
   * each underlying Firestore portion independently, exactly as
   * before this module exists. */
  displayAggregateValue: number;
  memberCount: number;
}

const numericQuantity = (entry: GroupableUnifiedEntry): number =>
  entry.quantity.trim() === '' ? 0 : Number(entry.quantity) || 0;

/**
 * Builds one ProductDisplayGroup per logical product from the complete,
 * UNFILTERED flat entry list — grouping must happen before any search
 * filtering, so a group correctly retains every member even when only
 * one of them matches a search term (see filterGroupsBySearch, below).
 */
export function buildProductDisplayGroups(entries: GroupableUnifiedEntry[]): ProductDisplayGroup[] {
  const rowGroups: RowGroup<GroupableUnifiedEntry>[] = groupRowsByProductIdentity(entries);

  return rowGroups.map((group) => {
    const allValidated = group.rows.every((row) => row.validated);
    const anyConflicted = group.rows.some((row) => row.isConflicted);
    const persistenceState = deriveGroupPersistenceState(group.rows.map((row) => row.persistenceState));

    const definedMin = <T,>(values: (T | undefined)[]): T | undefined => {
      const defined = values.filter((v): v is T => v !== undefined);
      if (defined.length === 0) return undefined;
      return defined.reduce((min, v) => (v < min ? v : min));
    };

    const displayAggregateValue = group.rows.reduce(
      (sum, row) => sum + numericQuantity(row) * (Number(row.sellingPrice) || 0),
      0
    );

    return {
      key: group.key,
      displayName: group.displayName,
      members: group.rows,
      allValidated,
      anyConflicted,
      persistenceState,
      sortRepresentative: {
        entrySequence: definedMin(group.rows.map((r) => r.entrySequence)),
        firstWriteAt: definedMin(group.rows.map((r) => r.firstWriteAt)),
        originalOrderIndex: definedMin(group.rows.map((r) => r.originalOrderIndex)),
      },
      displayAggregateValue,
      memberCount: group.rows.length,
    };
  });
}

/**
 * A group is visible under a search term if ANY member's product name
 * matches — and, when it is, EVERY member remains part of the visible
 * group (never partially hidden), exactly matching the requirement
 * that a matching group is never split by which specific portion
 * happened to match.
 */
export function filterGroupsBySearch(groups: ProductDisplayGroup[], searchTerm: string): ProductDisplayGroup[] {
  const search = searchTerm.trim().toLowerCase();
  if (!search) return groups;
  return groups.filter((group) => group.members.some((member) => member.productName.toLowerCase().includes(search)));
}

/**
 * Group-level active-workspace state, using the Step 1-corrected
 * identity contract exactly: an explicitly-identified group (key
 * starts with `id:`) is active only if the active workspace's own
 * explicit productId matches — name is never consulted for this case.
 * A product-less fallback group (key starts with `name:`) is active
 * only when the workspace itself has no explicit productId and its
 * name key matches.
 */
export function isGroupActiveInWorkspace(
  group: ProductDisplayGroup,
  activeWorkspace: { explicitProductId?: string; nameKey: string } | null
): boolean {
  if (!activeWorkspace) return false;
  if (activeWorkspace.explicitProductId) {
    return group.key === `id:${activeWorkspace.explicitProductId}`;
  }
  return group.key === `name:${activeWorkspace.nameKey}`;
}
