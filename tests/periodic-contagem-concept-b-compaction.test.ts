// SABUSH BPT — Periodic Contagem UI Compaction, Concept B (Balanced
// Compact). Authorized by the "SABUSH BPT — PERIODIC CONTAGEM UI
// COMPACTION — CONCEPT B IMPLEMENTATION" instruction (this repository
// has no separate governance document recording this increment — it
// is a UI-only/UI-state change, explicitly out of scope for Firestore,
// business-logic, or data-model changes per that instruction's §8).
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/periodic-contagem-cost-price-removal.test.ts's
// own header, tests/periodic-stock-new-product-panel.test.ts's own
// header). This suite follows the same source-inspection technique:
// regex/string assertions against the raw PeriodicStockCountView.tsx
// source, proving structural guarantees rather than rendered output.
//
// This suite covers requirements A-L of the governing instruction's
// §10 "Testing Requirements" list. It intentionally does NOT re-prove
// facts tests/periodic-contagem-cost-price-removal.test.ts and
// tests/periodic-stock-existing-product-summary.test.ts already cover
// (e.g. the five-track rowGridClass, the four full-row col-span-5
// spans, ExistingProductSummary's read-only guard logic) — see those
// files for that coverage; this suite adds only what Concept B itself
// introduces.
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
// E. Collapse/expand mechanism exists for the three authorized panels
// ---------------------------------------------------------------------
describe('E — collapse/expand mechanism on the three authorized secondary panels', () => {
  it('ModeAValuationControl has its own expanded/setExpanded state', () => {
    const body = componentBody('ModeAValuationControl');
    assert.match(body, /const \[expanded, setExpanded\] = useState/);
    assert.match(body, /onClick=\{\(\) => setExpanded\(\(v\) => !v\)\}/);
  });

  it('NewProductInfoPanel has its own expanded/setExpanded state', () => {
    const body = componentBody('NewProductInfoPanel');
    assert.match(body, /const \[expanded, setExpanded\] = useState/);
    assert.match(body, /onClick=\{\(\) => setExpanded\(\(v\) => !v\)\}/);
  });

  it('ExistingProductSummary deliberately has NO collapse state of its own — it is pure read-only text with nothing further to reveal (see suite D); this is a documented design choice, not an oversight', () => {
    const body = componentBody('ExistingProductSummary');
    assert.doesNotMatch(body, /setExpanded/);
  });

  it('each collapsible component keeps its state local (its own useState), never a single shared/global collapse state controlling every product', () => {
    // Three independent `const [expanded, setExpanded] = useState`
    // sites: ModeAValuationControl, NewProductInfoPanel (both added by
    // Concept B), plus the pre-existing UnitRelationshipChainEditor
    // (nested inside NewProductInfoPanel, unrelated to this Increment
    // — its own collapse toggle already existed before Concept B and
    // is untouched here). Each is a separate component's own local
    // state, never one shared/module-level variable — confirmed
    // separately by suite E's first two tests, above.
    const occurrences = periodicSrc.match(/const \[expanded, setExpanded\] = useState/g) ?? [];
    assert.equal(occurrences.length, 3, `Expected 3 local expanded/setExpanded declarations, found ${occurrences.length}.`);
  });
});

// ---------------------------------------------------------------------
// F. Known/configured information defaults toward collapsed
// ---------------------------------------------------------------------
describe('F — known information (ModeAValuationControl) defaults collapsed', () => {
  it('ModeAValuationControl initializes expanded to false when the product is fully convertible (the ordinary, known-good case)', () => {
    const body = componentBody('ModeAValuationControl');
    assert.match(body, /useState\(!allPortionsConvertible\)/);
  });
});

// ---------------------------------------------------------------------
// G. Required/incomplete new-product configuration defaults toward expanded
// ---------------------------------------------------------------------
describe('G — required new-product configuration (NewProductInfoPanel) defaults expanded', () => {
  it('NewProductInfoPanel initializes expanded to true unconditionally — it only ever renders for a genuinely new product, so there is no "already configured" default to collapse toward', () => {
    const body = componentBody('NewProductInfoPanel');
    assert.match(body, /const \[expanded, setExpanded\] = useState\(true\);/);
  });

  it('NewProductInfoPanel never auto-collapses itself — no effect or logic sets expanded to false except the Owner\'s own toggle click', () => {
    const body = componentBody('NewProductInfoPanel');
    assert.doesNotMatch(body, /useEffect/);
    // The only place `setExpanded(false)` (or the toggling form) can
    // appear is inside the toggle button's own onClick.
    const setFalseOutsideToggle = body.replace(/onClick=\{\(\) => setExpanded\(\(v\) => !v\)\}/g, '');
    assert.doesNotMatch(setFalseOutsideToggle, /setExpanded\(false\)/);
  });
});

// ---------------------------------------------------------------------
// H. Warnings/errors cannot become invisible solely because a panel is collapsed
// ---------------------------------------------------------------------
describe('H — mandatory warning override (§4.2)', () => {
  it('ModeAValuationControl forces expanded=true via an effect whenever allPortionsConvertible becomes false, regardless of prior collapse state', () => {
    const body = componentBody('ModeAValuationControl');
    assert.match(body, /useEffect\(\(\) => \{\s*if \(!allPortionsConvertible\) setExpanded\(true\);\s*\}, \[allPortionsConvertible\]\);/);
  });

  it('the non-convertible-portion warning indicator is rendered outside the expanded-only content, so it stays visible even in the collapsed toggle row', () => {
    const body = componentBody('ModeAValuationControl');
    // The toggle <button>...</button> block (always rendered,
    // regardless of `expanded`) must itself contain the
    // AlertTriangle warning marker — not only the `{expanded && (...)}`
    // branch.
    const buttonStart = body.indexOf('<button');
    const buttonEnd = body.indexOf('</button>', buttonStart);
    assert.notEqual(buttonStart, -1);
    const buttonBlock = body.slice(buttonStart, buttonEnd);
    assert.match(buttonBlock, /!allPortionsConvertible && \(\s*<AlertTriangle/);
  });

  it('the Selling Price deviation warning (per-row, outside any collapsible panel) is unaffected — still present exactly twice (catalog + manual)', () => {
    const occurrences = periodicSrc.match(/checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/g) ?? [];
    assert.equal(occurrences.length, 2);
  });

  it('per-row save errors remain rendered unconditionally (not inside any collapsible panel) in both loops', () => {
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
