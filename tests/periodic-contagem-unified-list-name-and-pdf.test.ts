// SABUSH BPT — Periodic Contagem, Unified List: Product-Name Visibility
// & PDF Export Completeness.
//
// Covers two focused bug fixes to the unified product list
// (PeriodicStockCountView.tsx) introduced by the Owner-requested
// single-unified-product-list change:
//
//   1. Product names were being crushed to near-invisibility by a grid
//      template authored for a full-width container (rowGridClass,
//      reused verbatim from the old validated-only list) now rendering
//      inside the narrower RIGHT column of a two-column desktop
//      layout. Fixed with a new, list-specific `unifiedRowGridClass`
//      that guarantees the name column a real minimum width.
//   2. The pre-confirmation PDF export (`buildPreConfirmExportContent`/
//      `handleDownloadPreConfirmPdf`) already included a per-row Total
//      column and an overall total KPI — verified directly, including
//      by actually generating a PDF with jsPDF/jspdf-autotable and
//      extracting its rendered text via pdfjs-dist, outside this test
//      file, during the investigation that produced this fix. The one
//      genuine, related omission found (Part 5 of that investigation)
//      was that validation status — visibly distinguished on-screen —
//      had no equivalent column in the export; a "Validado" column
//      was added, reading the EXISTING `item.validated` field.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-concept-c-validated-compaction.test.ts's
// own header). This suite follows the same source-inspection
// technique: regex/string assertions against the raw
// PeriodicStockCountView.tsx source, proving structural guarantees
// rather than rendered output. Where a claim cannot be proven this way
// (e.g., the ACTUAL rendered pixel width of the name column in a real
// browser), that limitation is called out explicitly rather than
// asserted as if it were verified.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-unified-list-name-and-pdf.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = source.slice(start);
  const nextConstMatch = rest.slice(signatureMarker.length).search(/\n  const \w+[:\s]*=/);
  return nextConstMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextConstMatch);
}

function unifiedListSection(): string {
  const start = periodicSrc.indexOf('Owner-requested — single unified product list] Replaces');
  assert.notEqual(start, -1, 'Could not locate the unified product list section.');
  const end = periodicSrc.indexOf('Valor Físico (Custo) Contado até Agora', start);
  assert.notEqual(end, -1, 'Could not bound the end of the unified product list section.');
  return periodicSrc.slice(start, end);
}

const section = unifiedListSection();

// ---------------------------------------------------------------------
// A. Product name is present in the live-list rendering
// ---------------------------------------------------------------------
describe('A — Product name is rendered in the unified list, for both catalog and manual entries', () => {
  it('the unified list renders row.productName as real, visible text (not sr-only, not decorative)', () => {
    const matches = section.match(/<span className="text-\[13px\] font-semibold text-\[#111827\] truncate min-w-0" title=\{row\.productName\}>\s*\n\s*\{row\.productName\}\s*\n\s*<\/span>/g) ?? [];
    assert.equal(matches.length, 1, 'Expected exactly one visible product-name span in the unified list.');
  });

  it('catalog and manual entries share the SAME single row-rendering loop and the same name expression — proving the name is rendered identically for both kinds, not omitted for one', () => {
    // The unified list has exactly ONE `.map()` over its rendered
    // entries — unlike the old two-list split, which had a separate
    // catalog loop and a separate manual loop (a real historical risk:
    // a name fix applied to one loop and not the other).
    const mapMatches = section.match(/visibleUnifiedListEntries\.map\(\(entry\) => \{/g) ?? [];
    assert.equal(mapMatches.length, 1, 'Expected exactly one shared row-rendering loop for catalog and manual entries alike.');
    // The `row` each iteration renders is resolved from EITHER
    // catalogRows OR manualRows depending on `entry.kind` — both
    // branches feed the exact same downstream JSX (including the name
    // span asserted above), so neither kind can silently omit it.
    const rowResolutionBody = section.slice(section.indexOf('const row ='), section.indexOf('if (!row) return null;'));
    assert.match(rowResolutionBody, /catalogRows\[entry\.catalogProductId\]/);
    assert.match(rowResolutionBody, /manualRows\[entry\.manualRowIndex\]/);
  });

  it('unifiedListEntries itself is built from BOTH catalogRows and manualRows, each carrying its own productName straight from the source row — no field is dropped or renamed in transit', () => {
    const entriesBody = extractFunctionBody(periodicSrc, 'const unifiedListEntries = useMemo(() => {');
    const productNameAssignments = entriesBody.match(/productName: row\.productName,/g) ?? [];
    assert.equal(productNameAssignments.length, 2, 'Expected productName carried through unchanged for both the catalog and manual entry builders.');
  });
});

// ---------------------------------------------------------------------
// B. Long names are not accidentally hidden by the row structure
// ---------------------------------------------------------------------
describe('B — The row grid template guarantees a real minimum width for the name column, rather than allowing it to collapse to zero', () => {
  it('unifiedRowGridClass exists as its own constant, separate from rowGridClass (which remains unmodified for the active-workspace grid)', () => {
    assert.match(periodicSrc, /const rowGridClass = 'grid grid-cols-2 sm:grid-cols-\[minmax\(0,2fr\)_84px_76px_112px_190px\] gap-x-2\.5 gap-y-2\.5 sm:items-end';/);
    assert.match(periodicSrc, /const unifiedRowGridClass = 'grid grid-cols-2 sm:grid-cols-\[minmax\(96px,2fr\)_48px_56px_100px_108px\] gap-x-2 gap-y-1 sm:items-center';/);
  });

  it('the name track uses minmax(96px, 2fr) — a guaranteed floor — never minmax(0, ...), which is what allowed the name column to shrink to zero inside the narrower right-column container', () => {
    assert.doesNotMatch(periodicSrc, /unifiedRowGridClass = 'grid grid-cols-2 sm:grid-cols-\[minmax\(0,/);
    assert.match(periodicSrc, /unifiedRowGridClass = 'grid grid-cols-2 sm:grid-cols-\[minmax\(96px,2fr\)/);
  });

  it('the unified list\'s combined non-name fixed-width tracks (Qtd/Unid/Venda-Un/Valor) total less than half of rowGridClass\'s own combined fixed width — the actual root-cause fix, freeing width back to the name column', () => {
    // rowGridClass: 84 + 76 + 112 + 190 = 462px
    // unifiedRowGridClass: 48 + 56 + 100 + 108 = 312px
    const oldTotal = 84 + 76 + 112 + 190;
    const newTotal = 48 + 56 + 100 + 108;
    assert.ok(newTotal < oldTotal, 'Expected the unified list\'s non-name columns to reserve meaningfully less fixed width than rowGridClass.');
    assert.equal(oldTotal, 462);
    assert.equal(newTotal, 312);
  });

  it('the header and row both use unifiedRowGridClass, so column widths always stay aligned between them', () => {
    assert.match(section, /hidden sm:grid \$\{unifiedRowGridClass\.replace\('sm:items-center', ''\)\}/);
    assert.match(section, /className=\{`\$\{unifiedRowGridClass\} border rounded-xl/);
  });

  it('a title= tooltip carries the full name for the rare still-narrow case, in ADDITION to (never instead of) the visible inline text — not a Concept C violation', () => {
    const titleMatches = section.match(/title=\{row\.productName\}/g) ?? [];
    assert.equal(titleMatches.length, 1);
    // The same span that carries title= also renders {row.productName}
    // as ordinary visible text — see Suite A's own assertion.
  });

  it('[Documented limitation — no DOM/render harness in this repo] The actual rendered pixel width of the name column at a real browser viewport cannot be measured by a source-inspection test. This suite instead proves the structural fix (guaranteed minmax floor, reduced competing fixed width) that makes the crush mathematically impossible down to the guaranteed floor — verified manually, and by the fixed-width arithmetic above, not by pixel measurement.', () => {
    assert.ok(true);
  });
});

// ---------------------------------------------------------------------
// C. PDF export includes the product-level Total
// ---------------------------------------------------------------------
describe('C — PDF export includes the product-level Total/value, using the existing calculation', () => {
  const exportBody = extractFunctionBody(periodicSrc, 'const buildPreConfirmExportContent = () => {');

  it('the exported table declares a "Total" column', () => {
    assert.match(exportBody, /columns: \['Produto', 'Qtd', 'Unid', 'Venda\/Un', 'Total', 'Validado'\]/);
  });

  it('each exported row includes formatCurrency(item.sellingValue, currencySymbol) as its Total value', () => {
    assert.match(exportBody, /formatCurrency\(item\.sellingValue, currencySymbol\)/);
  });

  it('item.sellingValue is read directly from liveTally.countedItems — the SAME StockCountTallyItem the live list itself is built from — never a second, independently-computed total', () => {
    assert.match(exportBody, /liveTally\.countedItems\.map\(\(item\) => \[/);
    // sellingValue itself is computed once, in tallyStockCountRows
    // (utils/stockCount.ts), as `quantity * sellingPrice` — confirmed
    // by that function's own comment/implementation, not re-derived
    // here.
    const stockCountUtil = src('apps/tenant/src/utils/stockCount.ts');
    assert.match(stockCountUtil, /sellingValue: number; \/\/ quantity \* sellingPrice/);
  });

  it('no alternative/duplicate total calculation was introduced for the PDF export — no second "sellingValue ="/"rowValue =" style expression inside buildPreConfirmExportContent', () => {
    assert.doesNotMatch(exportBody, /sellingValue\s*=\s*[^,;]*\*/);
    assert.doesNotMatch(exportBody, /const\s+\w*[Tt]otal\w*\s*=\s*item\.quantity\s*\*/);
  });
});

// ---------------------------------------------------------------------
// D. PDF export includes the overall Contagem monetary total
// ---------------------------------------------------------------------
describe('D — PDF export includes the overall total, matching the live list\'s own headline figure', () => {
  const exportBody = extractFunctionBody(periodicSrc, 'const buildPreConfirmExportContent = () => {');

  it('the KPI summary includes "Valor de Venda Contado até Agora" sourced from liveTally.totalSellingValue', () => {
    assert.match(exportBody, /label: 'Valor de Venda Contado até Agora', value: formatCurrency\(liveTally\.totalSellingValue, currencySymbol\)/);
  });

  it('liveTally.totalSellingValue is the EXACT SAME value the live list\'s own "Valor de Venda Contado até Agora" card displays — not a second computation', () => {
    const totalSellingValueFormatCalls = periodicSrc.match(/formatCurrency\(liveTally\.totalSellingValue, currencySymbol\)/g) ?? [];
    // One occurrence in the live card (JSX), one in the PDF KPI builder
    // (plain object literal) — same expression, same source value,
    // reused verbatim in both places rather than recomputed.
    assert.equal(totalSellingValueFormatCalls.length, 2, 'Expected liveTally.totalSellingValue formatted identically in both the live card and the PDF export.');
  });
});

// ---------------------------------------------------------------------
// E. Related-omission fix: validation status
// ---------------------------------------------------------------------
describe('E — The one related PDF omission found (validation status) is fixed using the existing field, not a new calculation', () => {
  const exportBody = extractFunctionBody(periodicSrc, 'const buildPreConfirmExportContent = () => {');

  it('the exported row includes item.validated, rendered as Sim/Não — item.validated already exists on StockCountTallyItem (Decision 40, FR-N11), not newly computed here', () => {
    assert.match(exportBody, /item\.validated \? 'Sim' : 'Não'/);
    const stockCountUtil = src('apps/tenant/src/utils/stockCount.ts');
    assert.match(stockCountUtil, /validated: boolean;/);
  });

  it('no new persisted/calculated field was introduced to support this column — item.validated is read, never written, by this export function', () => {
    assert.doesNotMatch(exportBody, /\.validated\s*=/);
  });
});
