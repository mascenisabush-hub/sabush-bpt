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
  const start = periodicSrc.indexOf('Produtos Validados');
  assert.notEqual(start, -1, 'Could not locate the "Produtos Validados" section.');
  const end = periodicSrc.indexOf('Valor Físico (Custo) Contado até Agora', start);
  assert.notEqual(end, -1, 'Could not bound the end of the "Produtos Validados" section.');
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
    assert.match(section, /\{q\}/);
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

  it('shows a clearly labeled "Editar" action (as literal text — either the static label itself, or a ternary that renders it whenever the row is actually editable, never icon-only)', () => {
    // [Single-Active-Product Rule, §9 — Existing-Product Edit/Confirm
    // Workflow] The label is now conditional — 'Editar' when opening
    // this product is currently safe, a distinct visible label
    // ('Produto aberto') on the rare occasion a DIFFERENT product is
    // already active, per the single-active-product guard — so a
    // literal `>Editar<` no longer appears in the static source for
    // every occurrence. Both forms below still keep the label as
    // visible TEXT, never an icon-only control, which is this test's
    // own actual guarantee.
    const staticMatches = section.match(/>\s*Editar\s*</g) ?? [];
    const ternaryMatches = section.match(/\{editDisabled \? 'Produto aberto' : 'Editar'\}/g) ?? [];
    assert.ok(
      staticMatches.length + ternaryMatches.length >= 2,
      'Expected an "Editar" label (static or conditional) for both the catalog and manual validated rows.'
    );
  });

  it('none of the required fields are hidden behind title/hover-only attributes', () => {
    // The validated-state icon itself is aria-hidden (decorative — see
    // Suite G for its accessible-text sibling), but no `title=` attribute
    // is used anywhere in this section to carry required information.
    assert.doesNotMatch(section, /title=/);
  });
});

// ---------------------------------------------------------------------
// B. Warnings
// ---------------------------------------------------------------------
describe('B — warnings are visibly represented when active', () => {
  it('reuses checkPriceDeviation (the exact same function/inputs the active row already calls) — never a second, invented check', () => {
    const matches = section.match(/checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/g) ?? [];
    assert.equal(matches.length, 2, 'Expected checkPriceDeviation called once for the catalog loop and once for the manual loop.');
  });

  it('renders the price-deviation warning as visible text, not tooltip-only, when showWarning is true', () => {
    assert.match(section, /\{hasPriceWarning && \(/);
    assert.match(section, /Este preço é \{Math\.round\(priceCheck\.deviationPercent! \* 100\)\}%\{' '\}/);
  });

  it('reuses the same Mode A non-convertible condition ModeAValuationControl itself evaluates (via getModeANonConvertibleWarning), never a simplified rule', () => {
    const matches = section.match(/getModeANonConvertibleWarning\(row\.productName\)/g) ?? [];
    assert.equal(matches.length, 2, 'Expected getModeANonConvertibleWarning called once for the catalog loop and once for the manual loop.');
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
    // Once inside ModeAValuationControl itself, twice inside the
    // validated section (catalog + manual loops) = 3 total in the file.
    assert.equal(modeAControlWarning.length, 3, 'Expected the exact same Mode A warning sentence in ModeAValuationControl and both validated loops.');
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
  it('the catalog validated row\'s Editar calls the existing handleEditCatalogRow(productId)', () => {
    assert.match(section, /onClick=\{\(\) => handleEditCatalogRow\(productId\)\}/);
  });

  it('the manual validated row\'s Editar calls the existing handleEditManualRow(idx)', () => {
    assert.match(section, /onClick=\{\(\) => handleEditManualRow\(idx\)\}/);
  });

  it('no second/alternative edit handler is defined for the validated area (e.g. a Concept-C-only handler)', () => {
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
  it('visibleCatalogEntries / active manual rows are still rendered by their own pre-existing full-field grid, outside the validated section', () => {
    const activeAreaStart = periodicSrc.indexOf('visibleCatalogEntries.length > 0 && (');
    assert.notEqual(activeAreaStart, -1);
    const validatedStart = periodicSrc.indexOf('Produtos Validados');
    assert.ok(activeAreaStart < validatedStart, 'Active catalog rendering should precede the validated section, structurally separate from it.');
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

  it('the validated section computes rowValue as quantity * sellingPrice — the same shape as the active row\'s own rowSellingValue — never a second valuation formula', () => {
    const matches = section.match(/const rowValue = q \* sellingPriceNum;/g) ?? [];
    assert.equal(matches.length, 2);
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
    const matches = section.match(/<span className="sr-only">Validado<\/span>/g) ?? [];
    assert.equal(matches.length, 2, 'Expected an sr-only "Validado" label for both the catalog and manual validated rows.');
  });

  it('mobile-safe structure: per-field sm:hidden labels exist for Qtd/Unid/Venda-Un, matching the file\'s own established responsive convention', () => {
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Qtd</);
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Unid</);
    assert.match(section, /\{fieldLabelClass\} sm:hidden`\}>Venda\/Un</);
  });

  it('a shared desktop column header exists above the validated list, aligned to the same five-track rowGridClass template used by the active workspace header', () => {
    assert.match(section, /hidden sm:grid \$\{rowGridClass\.replace\('sm:items-end', ''\)\}/);
  });

  it('the desktop header declares exactly the five Periodic columns (Nome/Qtd/Unid/Venda-Un/Valor)', () => {
    const headerStart = section.indexOf("hidden sm:grid ${rowGridClass.replace('sm:items-end', '')}");
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
