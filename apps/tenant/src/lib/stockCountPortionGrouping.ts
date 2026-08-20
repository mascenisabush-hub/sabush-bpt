// Stock Count Multi-Portion Grouping — Increment B, Checkpoint B5 (§16),
// extended by the Grouped Initial Stock UX checkpoint (feasibility
// report accepted; implementation scoped to InitialStockCountView.tsx
// only — see that file's own header comment).
//
// GOVERNANCE: implements the presentation-layer requirement Rule 8
// Finding 4 identifies as the ONLY genuinely new work §16 requires —
// "the owner-facing UI must make clear that two rows sharing a product
// name are being treated as portions of one physical count for that
// product, not flagged as an accidental duplicate entry." No schema
// change; no new valuation logic. This file computes ONLY a display
// label, never anything that feeds a totalValue/costPrice calculation
// — normalizeStockCountItems (utils/stockCount.ts) already sums
// separate same-product rows correctly today, with zero code change
// (Rule 8 Finding 4), and remains completely untouched by this file.
// Applies identically to Initial Stock (Checkpoint B5) and Periodic
// Contagem (Checkpoint B6) — both surfaces share the identical flat,
// unmerged per-row data model this file's own grouping logic assumes.
//
// Deliberately NOT product-duplicate detection (POL-0003): that
// mechanism operates across DIFFERENT Product documents/catalog
// entries via supplier-wording candidate detection, which has no
// presence in Initial Stock or Periodic Contagem at all (Consolidated
// Specification §6 — "Trigger surfaces: Add Stock and Smart Stock
// Entry only"). This file's grouping is purely about MULTIPLE ROWS FOR
// THE SAME ALREADY-TYPED PRODUCT NAME within one count draft — a
// completely different situation. This module has no ability to flag,
// warn about, or block anything; it only computes a display label.

export interface PortionGroupableRow {
  id: string;
  productName: string;
}

export interface PortionLabel {
  /** True when 2+ rows in the input share this row's (trimmed,
   * case-insensitive) product name — i.e. this row is one portion of a
   * multi-portion count for that product, not a standalone entry. */
  isMultiPortion: boolean;
  /** 1-based position of this row among same-named rows, in their
   * original relative order — e.g. "Portion 1 of 2". Always 1 for a
   * row with no same-named siblings. */
  portionIndex: number;
  /** Total number of rows (including this one) sharing this row's
   * product name. Always 1 for a row with no same-named siblings. */
  portionCount: number;
}

/**
 * Computes, for every row in `rows`, whether it shares its (trimmed,
 * case-insensitive) product name with one or more OTHER rows in the
 * same list, and its 1-based position among them.
 *
 * Blank-name rows are never grouped with each other or with anything
 * else (each gets its own singleton `{isMultiPortion: false, portionIndex: 1, portionCount: 1}`)
 * — an empty product name isn't "the same product" as another empty
 * product name; it simply hasn't been identified yet.
 *
 * Pure, stateless, no dependency on Product/catalog data — this is a
 * WITHIN-THIS-DRAFT grouping only, entirely separate from whether any
 * of these names match an existing catalog Product
 * (isGenuinelyNewProductName, InitialStockCountView.tsx/
 * PeriodicStockCountView.tsx) or would trigger supplier-wording
 * candidate detection (which never runs on either surface at all, §6).
 */
export function computePortionLabels<T extends PortionGroupableRow>(rows: T[]): Map<string, PortionLabel> {
  const labels = new Map<string, PortionLabel>();
  const countsByName = new Map<string, number>();
  const seenIndexByName = new Map<string, number>();

  for (const row of rows) {
    const key = row.productName.trim().toLowerCase();
    if (!key) continue; // blank names are never grouped with anything
    countsByName.set(key, (countsByName.get(key) ?? 0) + 1);
  }

  for (const row of rows) {
    const key = row.productName.trim().toLowerCase();
    if (!key) {
      labels.set(row.id, { isMultiPortion: false, portionIndex: 1, portionCount: 1 });
      continue;
    }
    const portionCount = countsByName.get(key) ?? 1;
    const nextIndex = (seenIndexByName.get(key) ?? 0) + 1;
    seenIndexByName.set(key, nextIndex);
    labels.set(row.id, {
      isMultiPortion: portionCount > 1,
      portionIndex: nextIndex,
      portionCount,
    });
  }

  return labels;
}

// ------------------------------------------------------------------
// Grouped Initial Stock UX — implementation of the feasibility
// report's Option B/C recommendation ("one product shown once, its
// portions listed underneath"). Reuses the IDENTICAL grouping key
// (`productName.trim().toLowerCase()`) computePortionLabels already
// uses, so the two never drift apart on what counts as "the same
// product." This function is new; computePortionLabels above is
// UNCHANGED — B6/Periodic Contagem's existing use of it (a per-row
// "Porção X de Y" caption) continues to work exactly as before. This
// function only reshapes rows into GROUPS for a renderer that wants to
// show the product name once instead of once per row; it introduces no
// new grouping RULE, only a new output SHAPE for the same rule.
// ------------------------------------------------------------------

export interface RowGroup<T extends PortionGroupableRow> {
  /** '' for a row with no product name yet (never grouped with
   * anything, per the same rule computePortionLabels uses); otherwise
   * the trimmed, lowercased product name shared by every row in
   * `rows`. */
  key: string;
  /** The exact-cased name to show in the group's single, shared name
   * field — taken from the first row's own typed casing. Every row in
   * a non-blank group shares this SAME key (case-insensitively) by
   * construction, but may differ in casing until the group's header
   * field is edited (which then normalizes every row in the group to
   * the newly typed casing — see the caller's rename handler). */
  displayName: string;
  /** The actual row objects belonging to this group, in their original
   * relative order. Never copied/cloned — same object references as
   * in the input array, so a caller mutating via the row's own `id`
   * (e.g. an existing updateRow(id, fields) function) needs no
   * adaptation. */
  rows: T[];
}

/**
 * Groups `rows` by product name, preserving each group's first-
 * appearance order and each row's original relative order within its
 * group. A row with a blank/whitespace-only name is NEVER grouped with
 * another blank-name row — each becomes its own singleton group
 * (`key: ''`) — matching computePortionLabels' identical treatment of
 * blank names, and correctly modeling "not yet identified" as
 * different from "the same (empty) product."
 *
 * This is a pure reshaping of the SAME flat array a caller already
 * has — it copies no row data, mutates nothing, and introduces no new
 * concept of product identity beyond the name-matching rule
 * computePortionLabels already established. A caller is expected to
 * keep its own state as the flat `rows` array (unchanged) and call
 * this function fresh on every render, exactly as InitialStockCountView.tsx
 * already does with computePortionLabels today.
 */
export function groupRowsByProductName<T extends PortionGroupableRow>(rows: T[]): RowGroup<T>[] {
  const groups: RowGroup<T>[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const row of rows) {
    const trimmed = row.productName.trim();
    const key = trimmed.toLowerCase();

    if (!key) {
      // Never grouped with another blank-name row — its own singleton.
      groups.push({ key: '', displayName: '', rows: [row] });
      continue;
    }

    const existingIndex = groupIndexByKey.get(key);
    if (existingIndex === undefined) {
      groupIndexByKey.set(key, groups.length);
      groups.push({ key, displayName: trimmed, rows: [row] });
    } else {
      groups[existingIndex].rows.push(row);
    }
  }

  return groups;
}
