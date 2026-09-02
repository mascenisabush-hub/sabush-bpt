// SABUSH BPT — Periodic Contagem, Concept C: Validated Product
// Compaction.
//
// Covers the "SABUSH BPT — CONTAGEM CONCEPT C IMPLEMENTATION
// AUTHORIZATION" increment: upgrading the "Produtos Validados"
// compact representation in PeriodicStockCountView.tsx so a validated
// row shows product name, quantity, unit, selling price, computed
// value, a validated-state indicator, and a labeled "Editar" action —
// all visibly, never behind a tooltip/hover/click — while reusing
// every existing calculation/warning/edit function unchanged.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/periodic-contagem-concept-b-compaction.test.ts's
// own header, tests/periodic-contagem-cost-price-removal.test.ts's own
// header). This suite follows the same source-inspection technique:
// regex/string assertions against the raw PeriodicStockCountView.tsx
// source, proving structural guarantees rather than rendered output.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-concept-c-validated-compaction.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

// The "Produtos Validados" section: from its own opening comment marker
// through to (but not including) the next major block's own comment
// marker ("Valor Físico (Custo) Contado até Agora", part of the live
// total card immediately below it). Bounding this way — rather than by
// JSX nesting — mirrors periodic-contagem-concept-b-compaction.test.ts's
// own componentBody() bounding technique: find two stable textual
// anchors already known to bracket the section, slice between them.
function validatedSection(): string {
  // [Owner-requested — single unified product list] The old
  // catalog-only + manual-only "Produtos Validados" split is replaced
  // by one unified list covering every product, validated or not.
  // This still bounds the same physical section of source — only the
  // anchor text changed, since the accordion heading itself was
  // replaced (see this file's own updated header comment, below, for
  // why every test in this suite now reads from the unified list
  // instead of a validated-only subset).
  const start = periodicSrc.indexOf('Owner-requested — single unified product list] Replaces');
  assert.notEqual(start, -1, 'Could not locate the unified product list section.');
  const end = periodicSrc.indexOf('Valor Físico (Custo) Contado até Agora', start);
  assert.notEqual(end, -1, 'Could not bound the end of the unified product list section.');
  return periodicSrc.slice(start, end);
}

const section = validatedSection();

// ---------------------------------------------------------------------
// A. Validated summary content
// ---------------------------------------------------------------------
describe('A — validated compact representation shows every required field', () => {
  it('shows the product name', () => {
    assert.match(section, /row\.productName/);
  });

  it('shows quantity', () => {
    assert.match(section, /row\.quantity\.trim\(\) === '' \? '—' : q/);
  });

  it('shows unit', () => {
    assert.match(section, /row\.unit \|\| 'un'/);
  });

  it('shows selling price (Venda\\/Un), formatted via the shared currency formatter', () => {
    assert.match(section, /Venda\/Un<\/span>/);
    assert.match(section, /formatCurrency\(sellingPriceNum, currencySymbol\)/);
  });

  it('shows a computed value distinct from the per-unit selling price', () => {
    assert.match(section, /const rowValue = q \* sellingPriceNum;/);
    assert.match(section, /formatCurrency\(rowValue, currencySymbol\)/);
  });

  it('shows a validated-state indicator (CheckCircle2 icon)', () => {
    assert.match(section, /<CheckCircle2 className="w-3\.5 h-3\.5 text-emerald-500 shrink-0" strokeWidth=\{2\.5\} aria-hidden="true" \/>/);
  });

  it('shows a clearly labeled "Editar"/"Abrir" action (a real, visible-text ternary, never icon-only)', () => {
    // [Single-Active-Product Rule, §9 — Existing-Product Edit/Confirm
    // Workflow; extended by the Owner-requested single unified product
    // list] Catalog and manual entries now share ONE loop/button, so
    // the label is a three-way ternary: 'Produto aberto' when a
    // DIFFERENT product is active (single-active-product guard),
    // 'Editar' for an already-validated entry, 'Abrir' for one that
    // isn't yet — all three keep the label as visible TEXT, never an
    // icon-only control, which is this test's own actual guarantee.
    const ternaryMatches = section.match(/\{disabled \? 'Produto aberto' : entry\.validated \? 'Editar' : 'Abrir'\}/g) ?? [];
    assert.equal(ternaryMatches.length, 1, 'Expected the shared Editar/Abrir/Produto-aberto ternary exactly once.');
  });

  it('the only title= attribute present is the supplementary full-name tooltip on the product-name span itself — never used to hide REQUIRED information exclusively behind hover', () => {
    // [Bug fix — product name visibility] A `title={row.productName}`
    // was added to the name span so the FULL name is available on
    // hover/focus on the rare narrow container where the guaranteed
    // 96px floor (unifiedRowGridClass) still isn't enough — but the
    // name itself remains fully rendered as ordinary visible text right
    // next to it (`{row.productName}` inside the same span), so no
    // information is exclusively behind the tooltip; this is a
    // supplementary affordance, not a Concept C violation.
    const titleMatches = section.match(/title=\{row\.productName\}/g) ?? [];
    assert.equal(titleMatches.length, 1, 'Expected exactly one title= attribute, on the name span.');
    const otherTitleMatches = (section.match(/title=/g) ?? []).length;
    assert.equal(otherTitleMatches, 1, 'No other title= attribute should exist in this section.');
  });
});

// ---------------------------------------------------------------------
// B. Warnings
// ---------------------------------------------------------------------
describe('B — warnings are visibly represented when active', () => {
  it('reuses checkPriceDeviation (the exact same function/inputs the active row already calls) — never a second, invented check', () => {
    const matches = section.match(/checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/g) ?? [];
    assert.equal(matches.length, 1, 'Expected checkPriceDeviation called once, in the one shared unified-list loop.');
  });

  it('renders the price-deviation warning as visible text, not tooltip-only, when showWarning is true', () => {
    assert.match(section, /\{hasPriceWarning && \(/);
    assert.match(section, /Este preço é \{Math\.round\(priceCheck\.deviationPercent! \* 100\)\}%\{' '\}/);
  });

  it('reuses the same Mode A non-convertible condition ModeAValuationControl itself evaluates (via getModeANonConvertibleWarning), never a simplified rule', () => {
    const matches = section.match(/getModeANonConvertibleWarning\(row\.productName\)/g) ?? [];
    assert.equal(matches.length, 1, 'Expected getModeANonConvertibleWarning called once, in the one shared unified-list loop.');
  });

  it('the helper itself defers entirely to canApplyModeA/getEffectiveUnitRelationshipForProductName/isValidUnitRelationship — no invented logic', () => {
    const helperStart = periodicSrc.indexOf('const getModeANonConvertibleWarning');
    assert.notEqual(helperStart, -1);
    const helperEnd = periodicSrc.indexOf('\n  };', helperStart) + 6;
    const helperBody = periodicSrc.slice(helperStart, helperEnd);
    assert.match(helperBody, /getEffectiveUnitRelationshipForProductName\(productName\)/);
    assert.match(helperBody, /isValidUnitRelationship\(relationship\)/);
    assert.match(helperBody, /canApplyModeA\(collectGroupPortions\(key\), config\.referenceUnit, relationship\)/);
  });

  it('renders the Mode A warning with the exact wording ModeAValuationControl itself already uses, when active', () => {
    const modeAControlWarning = periodicSrc.match(
      /Uma ou mais porções têm uma unidade que não faz parte da relação de unidades confirmada deste produto — o preço dessas porções não foi alterado; introduza-o manualmente\./g
    ) ?? [];
    // Once inside ModeAValuationControl itself, once inside the
    // unified list's one shared loop = 2 total in the file.
    assert.equal(modeAControlWarning.length, 2, 'Expected the exact same Mode A warning sentence in ModeAValuationControl and the unified list.');
    assert.match(section, /\{hasModeAWarning && \(/);
  });

  it('does not modify checkPriceDeviation, canApplyModeA, or the unit-relationship helpers themselves', () => {
    assert.doesNotMatch(section, /function checkPriceDeviation/);
    assert.doesNotMatch(section, /function canApplyModeA/);
    assert.doesNotMatch(section, /function isValidUnitRelationship/);
  });
});

// ---------------------------------------------------------------------
// C. Editar behavior
// ---------------------------------------------------------------------
describe('C — Editar reuses the existing edit handlers, no alternative mechanism', () => {
  it('the unified list\'s click routes through handleUnifiedEntryClick, both card and button alike', () => {
    const cardMatches = section.match(/onClick=\{\(\) => !disabled && handleUnifiedEntryClick\(entry\)\}/g) ?? [];
    const buttonMatches = section.match(/if \(!disabled\) handleUnifiedEntryClick\(entry\);/g) ?? [];
    assert.equal(cardMatches.length, 1, 'Expected the card-level click handler exactly once.');
    assert.equal(buttonMatches.length, 1, 'Expected the button-level click handler exactly once.');
  });

  it('handleUnifiedEntryClick itself calls the existing handleEditCatalogRow(entry.catalogProductId) for a validated catalog entry', () => {
    const start = periodicSrc.indexOf('const handleUnifiedEntryClick = ');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\n  };', start) + 6;
    const body = periodicSrc.slice(start, end);
    assert.match(body, /handleEditCatalogRow\(entry\.catalogProductId\)/);
  });

  it('handleUnifiedEntryClick itself calls the existing handleEditManualRow(entry.manualRowIndex) for a validated manual entry', () => {
    const start = periodicSrc.indexOf('const handleUnifiedEntryClick = ');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\n  };', start) + 6;
    const body = periodicSrc.slice(start, end);
    assert.match(body, /handleEditManualRow\(entry\.manualRowIndex\)/);
  });

  it('handleUnifiedEntryClick calls handleSelectExistingProductForWorkspace directly for an UNVALIDATED entry — no confirmation gate for those', () => {
    const start = periodicSrc.indexOf('const handleUnifiedEntryClick = ');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\n  };', start) + 6;
    const body = periodicSrc.slice(start, end);
    assert.match(body, /handleSelectExistingProductForWorkspace\(entry\.activationKey\)/);
  });

  it('no second/alternative edit handler is defined for the unified list (e.g. a Concept-C-only handler)', () => {
    assert.doesNotMatch(section, /handleEditValidated|handleConceptCEdit|handleCompactEdit/);
  });

  it('handleEditCatalogRow and handleEditManualRow are themselves untouched (still exactly two definitions in the whole file)', () => {
    assert.equal((periodicSrc.match(/const handleEditCatalogRow = /g) ?? []).length, 1);
    assert.equal((periodicSrc.match(/const handleEditManualRow = /g) ?? []).length, 1);
  });
});

// ---------------------------------------------------------------------
// D. Unvalidated state — untouched
// ---------------------------------------------------------------------
describe('D — unvalidated products remain in the full editing representation', () => {
  it('visibleCatalogEntries / active manual rows are still rendered by their own pre-existing full-field grid, outside the unified list', () => {
    const activeAreaStart = periodicSrc.indexOf('visibleCatalogEntries.length > 0 && (');
    assert.notEqual(activeAreaStart, -1);
    const unifiedStart = periodicSrc.indexOf('Owner-requested — single unified product list] Replaces');
    assert.ok(activeAreaStart < unifiedStart, 'Active catalog rendering should precede the unified list, structurally separate from it.');
  });

  it('the active-row Validar/Editar/Remover control block is unchanged by this increment', () => {
    assert.match(periodicSrc, /onClick=\{\(\) => handleSaveCatalogRow\(productId\)\}/);
    assert.match(periodicSrc, /onClick=\{\(\) => handleRemoveCatalogRow\(productId\)\}/);
  });
});

// ---------------------------------------------------------------------
// E. Remover — not exposed in the compact validated representation
// ---------------------------------------------------------------------
describe('E — compact validated representation exposes no Remover action', () => {
  it('contains no Remover/Trash2/handleRemove call within the validated section', () => {
    assert.doesNotMatch(section, /Remover/);
    assert.doesNotMatch(section, /Trash2/);
    assert.doesNotMatch(section, /handleRemoveCatalogRow|handleRemoveManualRow/);
  });
});

// ---------------------------------------------------------------------
// F. Functional integrity — calculations/persistence/business logic untouched
// ---------------------------------------------------------------------
describe('F — validation path, persistence, Mode A, and valuation are untouched', () => {
  it('validated: true is still written exclusively by the existing Validar action, not by anything new in the validated section', () => {
    assert.doesNotMatch(section, /validated: true/);
  });

  it('validated: false is still written exclusively by the existing edit handlers (via handleEditCatalogRow/handleEditManualRow), not inline in the validated section', () => {
    assert.doesNotMatch(section, /validated: false/);
  });

  it('the validated section performs no Firestore/persistence calls', () => {
    assert.doesNotMatch(section, /Firestore|firestore|updateDoc|setDoc|addDoc/);
  });

  it('the unified list computes rowValue as quantity * sellingPrice — the same shape as the active row\'s own rowSellingValue — never a second valuation formula', () => {
    const matches = section.match(/const rowValue = q \* sellingPriceNum;/g) ?? [];
    assert.equal(matches.length, 1);
  });

  it('deriveModeAPortionValuations and applyModeAToGroup (Mode A\'s write-back path) are not referenced in the validated section', () => {
    assert.doesNotMatch(section, /deriveModeAPortionValuations|applyModeAToGroup/);
  });
});

// ---------------------------------------------------------------------
// G. Responsive / accessibility structure
// ---------------------------------------------------------------------
describe('G — responsive and accessibility structure', () => {
  it('has a labeled Editar control (real <button>, not icon-only)', () => {
    // [Existing-Product Edit/Confirm Workflow] The label itself is now
    // a ternary ('Editar' vs 'Produto aberto', per the single-active-
    // product guard, tested separately above) rather than always-
    // static text, so the closing tag no longer follows the word
    // "Editar" immediately — this still proves the same guarantee: a
    // real <button> element whose own content includes the literal
    // word "Editar" as text, never an icon-only control.
    assert.match(section, /<button[\s\S]*?Editar[\s\S]*?<\/button>/);
  });

  it('has an accessible text representation of validated state, not conveyed by icon alone', () => {
    // [Owner-requested — single unified product list] One shared span
    // now covers both states via a ternary — 'Validado' when
    // entry.validated, a distinct 'Não validado' otherwise — rather
    // than a static 'Validado' string repeated per loop.
    const matches = section.match(/<span className="sr-only">\{entry\.validated \? 'Validado' : 'Não validado'\}<\/span>/g) ?? [];
    assert.equal(matches.length, 1, 'Expected the shared sr-only validated-state label exactly once.');
  });

  it('mobile-safe structure: per-field sm:hidden labels exist for Qtd/Unid/Venda-Un, matching the file\'s own established responsive convention', () => {
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Qtd</);
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Unid</);
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Venda\/Un</);
  });

  it('a shared desktop column header exists above the unified list, using its own unifiedRowGridClass template (adjusted from rowGridClass for the narrower right-column container)', () => {
    assert.match(section, /hidden sm:grid \$\{unifiedRowGridClass\.replace\('sm:items-center', ''\)\}/);
  });

  it('the desktop header declares exactly the five Periodic columns (Nome/Qtd/Unid/Venda-Un/Valor)', () => {
    const headerStart = section.indexOf("hidden sm:grid ${unifiedRowGridClass.replace('sm:items-center', '')}");
    assert.notEqual(headerStart, -1);
    const headerBlock = section.slice(headerStart, headerStart + 700);
    const labels = ['Nome', 'Qtd', 'Unid', 'Venda/Un', 'Valor'];
    let cursor = 0;
    for (const label of labels) {
      const idx = headerBlock.indexOf(`>${label}<`, cursor);
      assert.ok(idx !== -1, `Expected header label "${label}" in order.`);
      cursor = idx + label.length;
    }
  });
});
