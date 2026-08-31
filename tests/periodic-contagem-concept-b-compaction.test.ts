// SABUSH BPT — Periodic Contagem UI Compaction.
//
// This file covers TWO increments:
//   1. Concept B (Balanced Compact) — the original compaction pass.
//   2. Information-Preserving Compaction Correction — authorized by the
//      "SABUSH BPT — CONTAGEM INFORMATION-PRESERVING COMPACTION
//      IMPLEMENTATION INCREMENT" instruction, which found that Concept
//      B's collapse/hide and tooltip-only-explanation approach
//      conflicted with the product requirement that ALL existing
//      information and controls remain continuously visible. That
//      correction REMOVED the collapse mechanism from
//      ModeAValuationControl and NewProductInfoPanel and restored full
//      explanatory text as always-visible content (never tooltip-only).
//      Neither increment has a separate governance document — both are
//      UI-only/UI-state changes, explicitly out of scope for Firestore,
//      business-logic, or data-model changes.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/periodic-contagem-cost-price-removal.test.ts's
// own header, tests/periodic-stock-new-product-panel.test.ts's own
// header). This suite follows the same source-inspection technique:
// regex/string assertions against the raw PeriodicStockCountView.tsx
// source, proving structural guarantees rather than rendered output.
//
// Suites A-D, I-L below date from the original Concept B increment and
// remain valid — the correction did not touch shared headers, sm:hidden
// labels, Custo/Un absence, ExistingProductSummary's compact form,
// multi-portion semantics, field bindings, Validar/Editar, or any
// calculation. Suites E-H were REWRITTEN by the correction increment:
// they used to prove collapse behavior existed; they now prove the
// opposite — that no collapse mechanism remains and every required
// piece of information (reference unit, reference price, both
// explanatory paragraphs, all New Product fields) is unconditionally
// visible.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-concept-b-compaction.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function componentBody(name: string): string {
  const start = periodicSrc.indexOf(`const ${name}: React.FC<{`);
  assert.notEqual(start, -1, `Could not locate ${name}'s own definition.`);
  // Bounded by whichever of the other two sibling component
  // definitions, or renderReconciliationCauseLabel, or the exported
  // main component, comes next after `start` — whichever is smallest.
  const anchors = ['ModeAValuationControl', 'NewProductInfoPanel', 'ExistingProductSummary']
    .filter((n) => n !== name)
    .map((n) => periodicSrc.indexOf(`const ${n}: React.FC<{`, start + 20))
    .concat([
      periodicSrc.indexOf('\nfunction renderReconciliationCauseLabel', start),
      periodicSrc.indexOf('\nexport const PeriodicStockCountView', start),
    ])
    .filter((i) => i !== -1 && i > start);
  assert.ok(anchors.length > 0, `Could not bound ${name}'s own body.`);
  return periodicSrc.slice(start, Math.min(...anchors));
}

// ---------------------------------------------------------------------
// A. Shared Periodic desktop header exists
// ---------------------------------------------------------------------
describe('A — shared Periodic desktop header', () => {
  it('a hidden-on-mobile, grid-based header exists above the catalog product list, reusing rowGridClass', () => {
    assert.match(
      periodicSrc,
      /<div className=\{`hidden sm:grid \$\{rowGridClass\.replace\('sm:items-end', ''\)\} pb-2 mb-1 border-b border-\[#E5E7EB\]`\}>/
    );
  });

  it('the header declares exactly the five Periodic columns (Nome/Qtd/Unid/Venda-Un/Valor), matching rowGridClass\'s five tracks — no Custo/Un', () => {
    const headerStart = periodicSrc.indexOf("<div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 border-b border-[#E5E7EB]`}>");
    assert.notEqual(headerStart, -1);
    const headerEnd = periodicSrc.indexOf('</div>', headerStart);
    const headerBlock = periodicSrc.slice(headerStart, headerEnd);
    const labels = [...headerBlock.matchAll(/<span className="text-\[10px\] font-bold uppercase tracking-wide text-gray-500">([^<]+)<\/span>/g)].map(
      (m) => m[1]
    );
    assert.deepEqual(labels, ['Nome', 'Qtd', 'Unid', 'Venda/Un', 'Valor']);
  });

  it('the same header pattern is reused for the manual-products section, gated on visibleManualRowGroups.length > 0', () => {
    assert.match(
      periodicSrc,
      /\{visibleManualRowGroups\.length > 0 && \(\s*<div className=\{`hidden sm:grid \$\{rowGridClass\.replace\('sm:items-end', ''\)\} pb-2 mb-1 border-b border-\[#E5E7EB\]`\}>/
    );
  });

  it('exactly two occurrences of the shared header markup exist (catalog section + manual section) — not duplicated further, not missing from either', () => {
    const occurrences = periodicSrc.match(/hidden sm:grid \$\{rowGridClass\.replace\('sm:items-end', ''\)\} pb-2 mb-1 border-b border-\[#E5E7EB\]/g) ?? [];
    assert.equal(occurrences.length, 2);
  });
});

// ---------------------------------------------------------------------
// B. Repeated field labels use sm:hidden
// ---------------------------------------------------------------------
describe('B — repeated per-row field labels are sm:hidden on desktop', () => {
  it('every catalog-row and manual-row field label (Nome/Qtd/Unid/Venda-Un/Valor) carries sm:hidden — exactly 9 occurrences (4 catalog + 5 manual)', () => {
    const occurrences = periodicSrc.match(/<label className=\{`\$\{fieldLabelClass\} sm:hidden`\}>/g) ?? [];
    assert.equal(occurrences.length, 9, `Expected 9 sm:hidden field labels, found ${occurrences.length}.`);
  });

  it('no per-row field label still uses the bare, always-visible fieldLabelClass form', () => {
    // The three legitimate remaining bare uses are once-per-screen
    // fields (Tipo de Contagem, Data da Contagem, Nome da Contagem) —
    // never repeated per product row, so they correctly stay
    // always-visible. Confirm the count is exactly 3, not 0 (which
    // would mean those got wrongly hidden too) and not more (which
    // would mean a per-row label was missed).
    const bareOccurrences = periodicSrc.match(/<label className=\{fieldLabelClass\}>/g) ?? [];
    assert.equal(bareOccurrences.length, 3, `Expected exactly 3 bare (always-visible) field labels, found ${bareOccurrences.length}.`);
  });

  it('the three remaining always-visible labels are the once-per-screen fields, not per-row fields', () => {
    assert.match(periodicSrc, /<label className=\{fieldLabelClass\}>Tipo de Contagem<\/label>/);
    assert.match(periodicSrc, /<label className=\{fieldLabelClass\}>Data da Contagem<\/label>/);
    assert.match(periodicSrc, /<label className=\{fieldLabelClass\}>Nome da Contagem<\/label>/);
  });

  it('mobile is not left unlabeled — sm:hidden only hides on sm+ breakpoints, never removes the label element itself', () => {
    // sm:hidden is a responsive Tailwind utility (mobile-first): it is
    // absent below the sm breakpoint, meaning the label still renders
    // (and is readable) on mobile. This assertion documents that
    // property by construction — sm:hidden never appears combined with
    // a base `hidden` utility that would hide it everywhere.
    assert.doesNotMatch(periodicSrc, /<label className=\{`\$\{fieldLabelClass\} hidden sm:hidden`\}>/);
  });
});

// ---------------------------------------------------------------------
// C. No Custo/Un reintroduction
// ---------------------------------------------------------------------
describe('C — Periodic does not reintroduce Custo/Un', () => {
  it('the shared headers never declare a Custo/Un column as a rendered label (comments mentioning its historical removal are expected and fine — only rendered JSX text matters here)', () => {
    assert.doesNotMatch(periodicSrc, /<span className="text-\[10px\] font-bold uppercase tracking-wide text-gray-500">Custo\/Un<\/span>/);
  });

  it('no input remains bound to row.costPrice (pre-existing §44 guarantee, re-confirmed unaffected by Concept B)', () => {
    assert.doesNotMatch(periodicSrc, /value=\{row\.costPrice\}/);
  });
});

// ---------------------------------------------------------------------
// D. ExistingProductSummary is compact
// ---------------------------------------------------------------------
describe('D — ExistingProductSummary is compact, not the old bordered panel', () => {
  const body = componentBody('ExistingProductSummary');

  it('no longer uses the bordered/padded panel chrome (bg-[var(--muted)] border rounded-xl px-3 py-2.5) that the pre-Concept-B version used', () => {
    assert.doesNotMatch(body, /bg-\[var\(--muted\)\] border border-\[#E5E7EB\] rounded-xl px-3 py-2\.5/);
  });

  it('renders as a single flex-wrap line rather than a stacked space-y block', () => {
    assert.match(body, /flex flex-wrap items-center gap-x-1\.5 gap-y-0\.5/);
  });

  it('still preserves both governed figures — cost basis and relationship — the only things removed are chrome/redundant wording, never business data', () => {
    assert.match(body, /formatCurrency\(costBasis!\.purchaseCost, currencySymbol\)/);
    assert.match(body, /costBasis!\.purchaseUnit/);
    assert.match(body, /getConversionFactor\(relationship!, relationship!\.units\[0\]\.unit, u\.unit\)/);
  });

  it('remains a pure read-only component — no useState/onClick introduced (this file\'s own established invariant, re-confirmed here for Concept B specifically)', () => {
    assert.doesNotMatch(body, /useState/);
    assert.doesNotMatch(body, /onClick=/);
  });
});

// ---------------------------------------------------------------------
// N. No collapse mechanism remains on the two authorized panels
// ---------------------------------------------------------------------
describe('N — no collapse mechanism remains on ModeAValuationControl / NewProductInfoPanel', () => {
  it('ModeAValuationControl has no expanded/setExpanded state (Concept B\'s collapse mechanism was removed by this correction)', () => {
    const body = componentBody('ModeAValuationControl');
    assert.doesNotMatch(body, /useState\(/);
    assert.doesNotMatch(body, /useEffect\(/);
    assert.doesNotMatch(body, /setExpanded/);
  });

  it('NewProductInfoPanel has no expanded/setExpanded state (Concept B\'s collapse mechanism was removed by this correction)', () => {
    const body = componentBody('NewProductInfoPanel');
    assert.doesNotMatch(body, /useState\(/);
    assert.doesNotMatch(body, /setExpanded/);
  });

  it('neither component renders a collapse-toggle <button> — everything they own is unconditional JSX, not gated behind a click', () => {
    const modeABody = componentBody('ModeAValuationControl');
    const newProductBody = componentBody('NewProductInfoPanel');
    assert.doesNotMatch(modeABody, /<button/);
    assert.doesNotMatch(newProductBody, /<button/);
  });

  it('the only remaining expanded/setExpanded state in the whole file belongs to the pre-existing, out-of-scope UnitRelationshipChainEditor (Decision 37 B.2, unrelated to this correction and not touched by it)', () => {
    const occurrences = periodicSrc.match(/const \[expanded, setExpanded\] = useState/g) ?? [];
    assert.equal(occurrences.length, 1, `Expected exactly 1 (UnitRelationshipChainEditor's own, pre-existing), found ${occurrences.length}.`);
    const start = periodicSrc.indexOf('const UnitRelationshipChainEditor: React.FC<{');
    const end = periodicSrc.indexOf('const ModeAValuationControl: React.FC<{');
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const chainEditorBody = periodicSrc.slice(start, end);
    assert.match(chainEditorBody, /const \[expanded, setExpanded\] = useState/);
  });
});

// ---------------------------------------------------------------------
// A/B/C — Mode A, Reference Unit, and Reference Price remain
// unconditionally visible
// ---------------------------------------------------------------------
describe('A/B/C — Mode A / Reference Unit / Reference Price always visible', () => {
  const body = componentBody('ModeAValuationControl');

  it('the reference-unit <select> is unconditional JSX — not inside any {expanded && (...)} or similar gate', () => {
    assert.match(body, /<select\s*\n\s*value=\{referenceUnit\}/);
    // No conditional wrapper of the collapse-era shape remains.
    assert.doesNotMatch(body, /\{expanded && \(/);
  });

  it('the reference-price <input> is unconditional JSX, in the same always-rendered block as the select', () => {
    assert.match(body, /value=\{referencePrice\}/);
  });

  it('the price field\'s label states its meaning ("per {referenceUnit}") directly, always, not only in a collapsed-state preview', () => {
    assert.match(body, /Preço\/\{referenceUnit \|\| 'unidade'\} \(\{currencySymbol\}\):/);
  });
});

// ---------------------------------------------------------------------
// D/E — Automatic-pricing explanation and non-convertible warning
// remain visible, in full, not tooltip-only
// ---------------------------------------------------------------------
describe('D/E — Mode A explanatory text and warning are fully visible, not tooltip-only', () => {
  const body = componentBody('ModeAValuationControl');

  it('the full original automatic-pricing sentence is rendered as visible text (not merely present in a title attribute)', () => {
    // The sentence must appear OUTSIDE of any title="..." attribute —
    // i.e. as real element content.
    assert.match(
      body,
      /<span>\s*O preço de cada porção é calculado automaticamente a partir deste preço único — as quantidades e unidades físicas contadas não são alteradas\. Para vender uma porção a um preço diferente, edite o preço dessa porção diretamente\.\s*<\/span>/
    );
  });

  it('the Concept B shortened replacement text no longer exists anywhere in this component', () => {
    assert.doesNotMatch(body, /Aplicado a todas as porções — edite uma individualmente para um preço diferente\./);
  });

  it('no title attribute is used as the sole carrier of this explanation (no tooltip-only pattern)', () => {
    assert.doesNotMatch(body, /title="O preço de cada porção/);
  });

  it('the full original non-convertible-portion warning sentence is rendered as visible text when the warning is active', () => {
    assert.match(
      body,
      /<span>\s*Uma ou mais porções têm uma unidade que não faz parte da relação de unidades confirmada deste produto — o preço dessas porções não foi alterado; introduza-o manualmente\.\s*<\/span>/
    );
  });

  it('the Concept B shortened warning replacement text no longer exists', () => {
    assert.doesNotMatch(body, /Uma ou mais porções não convertem automaticamente — preço manual necessário\./);
  });

  it('the warning is still gated on !allPortionsConvertible (same condition, unchanged) — only its presentation, not its logic, changed', () => {
    const occurrences = body.match(/\{!allPortionsConvertible && \(/g) ?? [];
    assert.equal(occurrences.length, 1);
  });
});

// ---------------------------------------------------------------------
// F/G — New Product fields and selling-unit explanation remain
// unconditionally visible
// ---------------------------------------------------------------------
describe('F/G — New Product fields and selling-unit explanation always visible', () => {
  const body = componentBody('NewProductInfoPanel');

  it('purchase unit, the relationship chain editor, and the selling-unit selector are all unconditional JSX — no {expanded && (...)} gate remains', () => {
    assert.doesNotMatch(body, /\{expanded && \(/);
    assert.match(body, /value=\{purchaseUnit\}/);
    assert.match(body, /<UnitRelationshipChainEditor/);
  });

  it('the selling-unit selector still renders only once the chain has a complete step (pre-existing, unrelated gate — unchanged, not a collapse mechanism)', () => {
    assert.match(body, /\{sellingUnitOptions\.length > 0 && \(/);
  });

  it('the full original selling-unit explanatory sentence is rendered as visible text (not tooltip-only)', () => {
    assert.match(
      body,
      /<span className="text-\[11px\] text-gray-500 basis-full">\s*A unidade em que o preço de venda deste produto será registado — pode ser diferente da unidade de compra\.\s*<\/span>/
    );
  });

  it('the Concept B shortened selling-unit replacement text no longer exists', () => {
    assert.doesNotMatch(body, /Pode diferir da unidade de compra/);
  });

  it('no title attribute is used as the sole carrier of the selling-unit explanation', () => {
    assert.doesNotMatch(body, /title="A unidade em que o preço de venda/);
  });
});

// ---------------------------------------------------------------------
// M. No tooltip-only replacement remains anywhere in the two panels
// ---------------------------------------------------------------------
describe('M — no tooltip-only explanatory text remains', () => {
  it('ModeAValuationControl contains no title= attribute at all (every explanation is now real, visible content)', () => {
    const body = componentBody('ModeAValuationControl');
    assert.doesNotMatch(body, /title=/);
  });

  it('NewProductInfoPanel contains no title= attribute at all', () => {
    const body = componentBody('NewProductInfoPanel');
    assert.doesNotMatch(body, /title=/);
  });
});

// ---------------------------------------------------------------------
// H. Per-row warnings/errors remain unconditionally visible (these were
// never inside any collapsible panel, in either increment)
// ---------------------------------------------------------------------
describe('H — per-row Selling Price deviation warning and save errors unaffected', () => {
  it('the Selling Price deviation warning is unaffected — still present exactly twice (catalog + manual)', () => {
    const occurrences = periodicSrc.match(/checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/g) ?? [];
    assert.equal(occurrences.length, 2);
  });

  it('per-row save errors remain rendered unconditionally in both loops', () => {
    const occurrences = periodicSrc.match(/\{saveError && \(/g) ?? [];
    assert.equal(occurrences.length, 2);
  });
});

// ---------------------------------------------------------------------
// I. Multi-portion semantics remain present
// ---------------------------------------------------------------------
describe('I — multi-portion semantics unchanged', () => {
  it('isFirstPortionOfMultiPortionGroup / cardIsFirstPortionOfMultiPortionGroup gating is untouched in both loops', () => {
    assert.match(periodicSrc, /const isFirstPortionOfMultiPortionGroup = portionLabel\.portionIndex === 1;/);
    assert.match(periodicSrc, /const cardIsFirstPortionOfMultiPortionGroup = firstRowLabel\.portionIndex === 1;/);
  });

  it('the multi-portion note still renders in both loops, still reading portionLabel.portionIndex/portionCount — only its visible wording was shortened, with the original sentence preserved verbatim in a title attribute', () => {
    const occurrences = periodicSrc.match(/Porção \{portionLabel\.portionIndex\}\/\{portionLabel\.portionCount\} — mesmo produto, somado no total/g) ?? [];
    assert.equal(occurrences.length, 2);
    const titleOccurrences =
      periodicSrc.match(/title=\{`Porção \$\{portionLabel\.portionIndex\} de \$\{portionLabel\.portionCount\} — mesmo produto, será somado no total`\}/g) ?? [];
    assert.equal(titleOccurrences.length, 2);
  });

  it('portionLabels/computePortionLabels wiring is untouched', () => {
    assert.match(periodicSrc, /computePortionLabels/);
  });
});

// ---------------------------------------------------------------------
// J. Both catalog and manual product paths retain the necessary fields
// ---------------------------------------------------------------------
describe('J — catalog and manual paths both retain Qtd/Unid/Venda-Un/Valor', () => {
  it('the catalog loop still binds Qtd/Unid/Venda-Un/Valor to the same update handlers as before', () => {
    assert.match(periodicSrc, /onChange=\{\(e\) => updateCatalogRow\(productId, \{ quantity: e\.target\.value \}\)\}/);
    assert.match(periodicSrc, /onChange=\{\(e\) => updateCatalogRow\(productId, \{ unit: e\.target\.value \}\)\}/);
    assert.match(periodicSrc, /onChange=\{\(e\) => updateCatalogRow\(productId, \{ sellingPrice: e\.target\.value \}\)\}/);
  });

  it('the manual loop still binds Qtd/Unid/Venda-Un/Valor to the same update handlers as before', () => {
    assert.match(periodicSrc, /onChange=\{\(e\) => updateManualRow\(idx, \{ quantity: e\.target\.value \}\)\}/);
    assert.match(periodicSrc, /onChange=\{\(e\) => updateManualRow\(idx, \{ unit: e\.target\.value \}\)\}/);
    assert.match(periodicSrc, /onChange=\{\(e\) => updateManualRow\(idx, \{ sellingPrice: e\.target\.value \}\)\}/);
  });

  it('the Selling Value calculation is unchanged in both loops', () => {
    assert.match(periodicSrc, /\{isBlank \? 'Não contado' : formatCurrency\(rowSellingValue, currencySymbol\)\}/);
    assert.match(
      periodicSrc,
      /formatCurrency\(\s*\(Number\(row\.quantity\) \|\| 0\) \* \(Number\(row\.sellingPrice\) \|\| 0\),\s*currencySymbol\s*\)/
    );
  });
});

// ---------------------------------------------------------------------
// K. Validar/Editar workflow remains intact
// ---------------------------------------------------------------------
describe('K — Validar/Editar workflow unchanged', () => {
  it('isConfirmed is still derived from row.validated === true in both loops, unchanged', () => {
    const occurrences = periodicSrc.match(/const isConfirmed = row\.validated === true;/g) ?? [];
    assert.equal(occurrences.length, 2);
  });

  it('Validar/Editar buttons still call the same handlers in both loops', () => {
    assert.match(periodicSrc, /onClick=\{\(\) => handleSaveCatalogRow\(productId\)\}/);
    assert.match(periodicSrc, /onClick=\{\(\) => handleEditCatalogRow\(productId\)\}/);
    assert.match(periodicSrc, /onClick=\{\(\) => handleSaveManualRow\(idx\)\}/);
    assert.match(periodicSrc, /onClick=\{\(\) => handleEditManualRow\(idx\)\}/);
  });

  it('disabled={isConfirmed} still gates the Qtd/Unid/Venda-Un inputs, unchanged', () => {
    const occurrences = periodicSrc.match(/disabled=\{isConfirmed\}/g) ?? [];
    assert.equal(occurrences.length, 6, `Expected 6 disabled={isConfirmed} bindings (3 fields x 2 loops), found ${occurrences.length}.`);
  });
});

// ---------------------------------------------------------------------
// L. No calculation/business-logic code was altered
// ---------------------------------------------------------------------
describe('L — no calculation/business-logic code altered', () => {
  it('rowSellingValue\'s own derivation is byte-identical to before', () => {
    assert.match(periodicSrc, /const rowSellingValue = q \* \(Number\(row\.sellingPrice\) \|\| 0\);/);
  });

  it('applyModeAToGroup / handleReferenceConfigChange / deriveModeAPortionValuations are untouched (Mode A calculation engine)', () => {
    assert.match(periodicSrc, /const applyModeAToGroup = \(productKey: string, referenceUnit: string, referencePriceRaw: string\) => \{/);
    assert.match(periodicSrc, /const handleReferenceConfigChange = \(productKey: string, fields: Partial<\{ referenceUnit: string; referencePrice: string \}>\) => \{/);
    assert.match(periodicSrc, /deriveModeAPortionValuations\(portions, referenceUnit, referencePrice, relationship\)/);
  });

  it('buildProductCostBasisMap / costBasisByProductName (FR-67) are untouched — same single call site as before', () => {
    const callCount = (periodicSrc.match(/buildProductCostBasisMap\(/g) || []).length;
    assert.equal(callCount, 1);
  });

  it('no changes to Validar/submission logic — handleConfirmSave / recordStockCount call sites still present', () => {
    assert.match(periodicSrc, /handleConfirmSave/);
  });
});
