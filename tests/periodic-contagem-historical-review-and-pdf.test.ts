// SABUSH BPT — Periodic Contagem, Historical Contagem Review & PDF
// Export.
//
// Covers a presentation/export-only enhancement to the EXISTING
// "Histórico de Contagens" detail modal (`viewingCount`,
// PeriodicStockCountView.tsx) and a new, smallest-possible PDF
// adapter reusing the EXISTING `exportReportPdf` helper
// (reportExport.ts) — the same one the post-confirmation receipt and
// the pre-confirmation live-list export already use.
//
// GOVERNANCE (per this increment's own explicit scope):
//   - No StockCount/StockCountItem schema change — this suite asserts
//     the ABSENCE of any new field, not merely its presence in a few
//     places.
//   - No `validated` field added or inferred for historical items.
//   - No re-join against the live `products` collection, no re-
//     derivation from current Product Memory — historical values must
//     come from `viewingCount.items` alone.
//   - Multi-portion products remain independent rows — no
//     grouping/merging by product name in the underlying data.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-concept-c-validated-compaction.test.ts's
// own header). This suite follows the same source-inspection
// technique: regex/string assertions against the raw
// PeriodicStockCountView.tsx source.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-historical-review-and-pdf.test.ts

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

// The historical detail modal: from its own opening comment marker
// through to the modal's own closing `)}` immediately before the
// component's final return-statement close. Bounded by two stable
// textual anchors, matching this repo's own established bounding
// technique (see periodic-contagem-concept-c-validated-compaction.test.ts's
// validatedSection()).
function historicalModalSection(): string {
  const start = periodicSrc.indexOf('{viewingCount && (');
  assert.notEqual(start, -1, 'Could not locate the historical detail modal.');
  const end = periodicSrc.indexOf('\n    </div>\n  );\n};', start);
  assert.notEqual(end, -1, 'Could not bound the end of the historical detail modal.');
  return periodicSrc.slice(start, end);
}

const modal = historicalModalSection();

// ---------------------------------------------------------------------
// A. Historical detail modal — required fields
// ---------------------------------------------------------------------
describe('A — The historical detail modal shows every required field, read directly from viewingCount.items', () => {
  it('iterates viewingCount.items.map(...) directly — the existing, already-persisted, already-frozen array — never a re-fetched or re-joined source', () => {
    assert.match(modal, /viewingCount\.items\.map\(\(item, idx\) => \(/);
  });

  it('shows the product name (Produto)', () => {
    assert.match(modal, /\{item\.productName\}/);
  });

  it('shows quantity and unit (Quantidade / Unidade)', () => {
    assert.match(modal, /\{item\.quantity\} \{item\.unit \|\| 'un'\}/);
  });

  it('shows the per-unit selling price (Preço de Venda / Unidade), using item.sellingPrice and the SAME sellingPriceBasisUnit-falls-back-to-unit convention this file already uses elsewhere for the live active-row caption', () => {
    assert.match(modal, /formatCurrency\(item\.sellingPrice, currencySymbol\)\} \/\{\(item\.sellingPriceBasisUnit \?\? item\.unit \?\? 'un'\)\.trim\(\) \|\| 'un'\}/);
    // Confirms this is the SAME established fallback pattern, not a
    // newly-invented one — the active-row caption already uses
    // `(row.sellingPriceBasisUnit ?? row.unit).trim() || 'un'` twice
    // elsewhere in this file.
    const establishedPatternMatches = periodicSrc.match(/\(row\.sellingPriceBasisUnit \?\? row\.unit\)\.trim\(\) \|\| 'un'/g) ?? [];
    assert.ok(establishedPatternMatches.length >= 2, 'Expected the pre-existing active-row fallback convention to still exist, confirming this reuses it rather than inventing a new one.');
  });

  it('shows the line total (Valor Total da linha), as quantity * sellingPrice — the same pre-existing expression the modal already used before this enhancement, not a new formula', () => {
    assert.match(modal, /formatCurrency\(item\.quantity \* item\.sellingPrice, currencySymbol\)/);
  });

  it('shows the overall historical Contagem total (Valor de Venda Total), from the persisted viewingCount.totalSellingValue — never recomputed by summing items client-side', () => {
    assert.match(modal, /Valor de Venda Total/);
    assert.match(modal, /typeof viewingCount\.totalSellingValue === 'number'/);
    assert.match(modal, /\{formatCurrency\(viewingCount\.totalSellingValue, currencySymbol\)\}/);
  });

  it('a legacy count with no totalSellingValue still shows an honest "not available" message rather than a fabricated total — this pre-existing guard is untouched', () => {
    assert.match(modal, /Não disponível para esta contagem \(registada antes desta funcionalidade existir\)/);
  });
});

// ---------------------------------------------------------------------
// B. No schema change, no Product Memory re-join, no validated field
// ---------------------------------------------------------------------
describe('B — No StockCount schema change; no live Product Memory consulted; no validated field', () => {
  it('StockCountItem gains no new field — types.ts is untouched by this increment', () => {
    const typesSrc = src('apps/tenant/src/types.ts');
    // Exactly the same field set this investigation already confirmed
    // exists — asserted here as a negative-space guard: no `validated`
    // field on StockCountItem.
    const itemStart = typesSrc.indexOf('export interface StockCountItem {');
    const itemEnd = typesSrc.indexOf('\n}', itemStart);
    const itemBody = typesSrc.slice(itemStart, itemEnd);
    assert.doesNotMatch(itemBody, /validated/);
  });

  it('the historical modal never reads `products` (the live catalog) or any Product Memory resolution helper', () => {
    assert.doesNotMatch(modal, /\bproducts\.find\(/);
    assert.doesNotMatch(modal, /findLatestRememberedProductMemory|resolveCanonicalProductSellingMemory|resolveUnitAwarePrice|getRememberedPriceForRow/);
  });

  it('the historical PDF adapter (buildHistoricalExportContent) takes the StockCount directly as a parameter and reads only its own .items — no products/catalogRows/manualRows lookup inside it', () => {
    const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');
    assert.match(body, /count\.items\.map\(/);
    assert.doesNotMatch(body, /catalogRows|manualRows|products\.find\(/);
  });

  it('no `validated`/`item.validated` reference exists anywhere in the historical modal or the historical PDF adapter', () => {
    assert.doesNotMatch(modal, /item\.validated|\.validated\b/);
    const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');
    assert.doesNotMatch(body, /\.validated\b/);
  });
});

// ---------------------------------------------------------------------
// C. Multi-portion products remain independent rows
// ---------------------------------------------------------------------
describe('C — Multi-portion products remain independent rows, never merged/grouped by name', () => {
  it('the modal renders one row per array element (map over the raw items array, keyed by index) — no groupRowsByProductName/reduce-by-name step before rendering', () => {
    assert.match(modal, /viewingCount\.items\.map\(\(item, idx\) => \(/);
    assert.doesNotMatch(modal, /groupRowsByProductName\(viewingCount/);
  });

  it('the historical PDF adapter maps the raw count.items array directly, one table row per persisted item — no grouping/reduction by productName', () => {
    const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');
    assert.match(body, /rows: count\.items\.map\(\(item\) => \[/);
    assert.doesNotMatch(body, /groupRowsByProductName|reduce\(/);
  });
});

// ---------------------------------------------------------------------
// D. Historical PDF export
// ---------------------------------------------------------------------
describe('D — Historical PDF export reuses the existing exportReportPdf helper, with the required columns and overall total', () => {
  const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');

  it('declares exactly the required columns: Produto | Qtd | Unid | Venda/Un | Total', () => {
    assert.match(body, /columns: \['Produto', 'Qtd', 'Unid', 'Venda\/Un', 'Total'\]/);
  });

  it('each row includes productName, quantity, unit, per-unit price, and line total — from the persisted item fields, not re-derived', () => {
    assert.match(body, /item\.productName,/);
    assert.match(body, /item\.quantity,/);
    assert.match(body, /item\.unit \|\| 'un',/);
    assert.match(body, /formatCurrency\(item\.sellingPrice, currencySymbol\) : '—'/);
    assert.match(body, /formatCurrency\(item\.quantity \* item\.sellingPrice, currencySymbol\) : '—'/);
  });

  it('includes the overall Contagem total as a KPI, sourced from count.totalSellingValue — the same persisted, frozen field the modal itself displays', () => {
    assert.match(body, /label: 'Valor de Venda Total', value: formatCurrency\(count\.totalSellingValue, currencySymbol\)/);
  });

  it('handleDownloadHistoricalPdf calls the EXISTING generateReportPdfPreview — the same function the receipt and pre-confirmation exports now call — never a new PDF library or export architecture', () => {
    // [Owner-requested — preview before download] Updated from
    // exportReportPdf (direct download) to generateReportPdfPreview
    // (opens PdfPreviewModal first) — both are exported by the SAME
    // reportExport.ts module and share the identical
    // buildReportPdfDocument builder internally, so this remains "one
    // shared export architecture," not a new one.
    const handlerBody = extractFunctionBody(periodicSrc, 'const handleDownloadHistoricalPdf = () => {');
    assert.match(handlerBody, /generateReportPdfPreview\(content\.reportTitle, business\?\.name \|\| 'Meu Negócio', content\.periodLabel, content\.kpis, content\.tables\)/);
    // Confirms this is the SAME call signature already used by the two
    // sibling adapters, not a new/different one.
    const allGeneratePreviewCalls = periodicSrc.match(/generateReportPdfPreview\(content\.reportTitle, business\?\.name \|\| 'Meu Negócio', content\.periodLabel, content\.kpis, content\.tables\)/g) ?? [];
    assert.ok(allGeneratePreviewCalls.length >= 2, 'Expected the historical adapter to reuse the exact same call shape as the pre-existing receipt/pre-confirmation adapters.');
  });

  it('handleDownloadHistoricalPdf is a no-op when no count is being viewed (defensive guard, matching this file\'s own established "return if !X" convention)', () => {
    const handlerBody = extractFunctionBody(periodicSrc, 'const handleDownloadHistoricalPdf = () => {');
    assert.match(handlerBody, /if \(!viewingCount\) return;/);
  });

  it('the export button in the modal calls handleDownloadHistoricalPdf', () => {
    assert.match(modal, /onClick=\{handleDownloadHistoricalPdf\}/);
  });

  it('no new PDF library was imported for this feature — jspdf/jspdf-autotable usage is confined to the existing reportExport.ts module, unchanged', () => {
    assert.doesNotMatch(periodicSrc, /from 'jspdf'|from 'jspdf-autotable'/);
    assert.match(periodicSrc, /import \{ exportReportExcel, generateReportPdfPreview, type ReportPdfPreview \} from '\.\/reports\/shared\/reportExport';/);
  });
});

describe('D2 — Bug fix: silent PDF download failure now surfaces a visible error, for every export call site', () => {
  // [Bug fix — silent PDF download failure] exportReportPdf is async
  // (dynamically imports jspdf/jspdf-autotable before building the
  // document) — every call site previously fired it with no await and
  // no .catch(), so any failure (a failed dynamic import, a transient
  // network issue, any error while building the document) rejected
  // into the void: the button appeared to simply do nothing. All four
  // call sites now catch and surface a real message.
  it('handleDownloadPreConfirmPdf catches a rejection and surfaces it via setError', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleDownloadPreConfirmPdf = () => {');
    assert.match(body, /\.catch\(\s*\n?\s*\(err: any\) => setError\(/);
  });

  it('handleDownloadReceiptPdf catches a rejection and surfaces it via setError', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleDownloadReceiptPdf = () => {');
    assert.match(body, /\.catch\(\s*\n?\s*\(err: any\) => setError\(/);
  });

  it('handleDownloadHistoricalPdf catches a rejection and surfaces it via a MODAL-SCOPED error state (historicalPdfError), never the shared `error` state — the historical modal is a z-50 overlay rendered above both places `error` displays, so setting the shared state there would be invisible until the modal was closed', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleDownloadHistoricalPdf = () => {');
    assert.match(body, /\.catch\(\s*\n?\s*\(err: any\) => setHistoricalPdfError\(/);
    assert.doesNotMatch(body, /setError\(/, 'must not use the shared error state, which is not visible while this modal is open');
  });

  it('historicalPdfError is declared as local state, cleared both when a new count is opened and at the start of every export attempt', () => {
    assert.match(periodicSrc, /const \[historicalPdfError, setHistoricalPdfError\] = useState<string \| null>\(null\);/);
    // Cleared on open, so a stale error from a PREVIOUS count never
    // bleeds into a newly-opened one.
    assert.match(periodicSrc, /setHistoricalPdfError\(null\);\s*\n\s*setViewingCount\(count\);/);
    // Cleared at the start of a fresh attempt, so a successful retry
    // after a failure doesn't leave the old message lingering.
    const handlerBody = extractFunctionBody(periodicSrc, 'const handleDownloadHistoricalPdf = () => {');
    assert.match(handlerBody, /setHistoricalPdfError\(null\);/);
  });

  it('the historical modal renders historicalPdfError as a visible inline banner, inside the modal itself', () => {
    assert.match(modal, /\{historicalPdfError && \(/);
  });

  it('the subscription-blocked export (handleExportBlockedDraftPdf) catches a rejection and passes it to ReadOnlyDraftRecovery via its new exportPdfError prop — that component is purely presentational and has no error-detection of its own', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleExportBlockedDraftPdf = () => {');
    assert.match(body, /\.catch\(\s*\n?\s*\(err: any\) => setBlockedDraftPdfError\(/);
    assert.match(periodicSrc, /exportPdfError=\{blockedDraftPdfError\}/);
  });

  it('ReadOnlyDraftRecovery.tsx accepts an optional exportPdfError prop and renders it as an inline banner near the export button, without performing any export or error-detection logic of its own', () => {
    const readOnlySrcLocal = readFileSync(
      new URL('../apps/tenant/src/components/ReadOnlyDraftRecovery.tsx', import.meta.url),
      'utf-8'
    );
    assert.match(readOnlySrcLocal, /exportPdfError\?: string \| null;/);
    assert.match(readOnlySrcLocal, /\{exportPdfError && \(/);
    // Still purely presentational — this fix must not have introduced
    // any Firestore access or export logic into this component. Checks
    // for actual usage (an import or a call), not mere mentions in
    // explanatory comments — the file's own pre-existing header comment
    // already references exportReportPdf by name to explain why it
    // deliberately has none.
    assert.doesNotMatch(readOnlySrcLocal, /collection\(|doc\(|onSnapshot\(|getDoc\(/);
    assert.doesNotMatch(readOnlySrcLocal, /import .*exportReportPdf|exportReportPdf\(/);
  });

  it('none of the four fixes touch any persistence/autosave function — every catch handler only calls a setState, never a draft/Firestore function', () => {
    for (const marker of [
      'const handleDownloadPreConfirmPdf = () => {',
      'const handleDownloadReceiptPdf = () => {',
      'const handleDownloadHistoricalPdf = () => {',
      'const handleExportBlockedDraftPdf = () => {',
    ]) {
      const body = extractFunctionBody(periodicSrc, marker);
      const catchBlockMatch = body.match(/\.catch\(\s*\n?\s*\(err: any\) => set\w+\([^)]*\)\s*\n?\s*\);/);
      assert.notEqual(catchBlockMatch, null, `expected a .catch(...) block in ${marker}`);
      assert.doesNotMatch(
        catchBlockMatch![0],
        /updateCatalogRow|updateManualRow|clearPeriodicStockDraft|flushPeriodicDraftNow|recordStockCount/,
        'a PDF-export failure handler must never touch persistence — only report the error'
      );
    }
  });
});

describe('D3 — Owner-requested: preview before download, for all four PDF export points', () => {
  const previewSrc = readFileSync(
    new URL('../apps/tenant/src/components/reports/shared/reportExport.ts', import.meta.url),
    'utf-8'
  );
  const modalSrc = readFileSync(
    new URL('../apps/tenant/src/components/reports/shared/PdfPreviewModal.tsx', import.meta.url),
    'utf-8'
  );

  it('exportReportPdf (still used by every OTHER report app-wide) and generateReportPdfPreview both call the SAME internal buildReportPdfDocument — a preview and its resulting download can never render different content', () => {
    assert.match(previewSrc, /async function buildReportPdfDocument\(/);
    const exportBody = previewSrc.slice(
      previewSrc.indexOf('export async function exportReportPdf('),
      previewSrc.indexOf('export async function exportReportPdf(') + 400
    );
    assert.match(exportBody, /buildReportPdfDocument\(reportTitle, businessName, periodLabel, kpis, tables\)/);
    const previewBody = previewSrc.slice(
      previewSrc.indexOf('export async function generateReportPdfPreview('),
      previewSrc.indexOf('export async function generateReportPdfPreview(') + 500
    );
    assert.match(previewBody, /buildReportPdfDocument\(reportTitle, businessName, periodLabel, kpis, tables\)/);
  });

  it('generateReportPdfPreview never calls doc.save() itself — only the returned download() does, on demand, so nothing downloads merely by opening the preview', () => {
    const previewBody = previewSrc.slice(
      previewSrc.indexOf('export async function generateReportPdfPreview('),
      previewSrc.indexOf('export async function generateReportPdfPreview(') + 600
    );
    assert.doesNotMatch(previewBody.split('download: () =>')[0], /doc\.save\(/, 'must not save before returning — only the download() callback may');
    assert.match(previewBody, /download: \(\) => doc\.save\(fileName\)/);
  });

  it('generateReportPdfPreview returns a real revoke() that calls URL.revokeObjectURL on the exact blob URL it produced', () => {
    assert.match(previewSrc, /const blobUrl: string = doc\.output\('bloburl'\);/);
    assert.match(previewSrc, /revoke: \(\) => URL\.revokeObjectURL\(blobUrl\)/);
  });

  it('every one of the four Stock Count PDF handlers now calls generateReportPdfPreview, never exportReportPdf directly — exportReportPdf is no longer imported into this file at all, since every call site here goes through the preview first', () => {
    assert.doesNotMatch(periodicSrc, /import \{ exportReportPdf[,\s]/, 'exportReportPdf must no longer be imported — every Stock Count export now previews first');
    for (const marker of [
      'const handleDownloadPreConfirmPdf = () => {',
      'const handleDownloadReceiptPdf = () => {',
      'const handleDownloadHistoricalPdf = () => {',
    ]) {
      const body = extractFunctionBody(periodicSrc, marker);
      assert.match(body, /generateReportPdfPreview\(/, `${marker} must call generateReportPdfPreview`);
      assert.doesNotMatch(body, /exportReportPdf\(/, `${marker} must not call exportReportPdf directly`);
    }
    const blockedBody = extractFunctionBody(periodicSrc, 'const handleExportBlockedDraftPdf = () => {');
    assert.match(blockedBody, /generateReportPdfPreview\(/);
  });

  it('a successful preview sets pdfPreview state carrying blobUrl/fileName/download/revoke plus a title, for all four call sites', () => {
    const occurrences = periodicSrc.match(/setPdfPreview\(\{ \.\.\.preview, title: \w+(\.\w+)? \}\)/g) ?? [];
    assert.ok(occurrences.length >= 4, `expected all four handlers to set pdfPreview on success, found ${occurrences.length}`);
  });

  it('closing the preview (handleClosePdfPreview) always revokes the blob URL before clearing state — never leaves it dangling', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleClosePdfPreview = () => {');
    const revokeIdx = body.indexOf('pdfPreview?.revoke();');
    const clearIdx = body.indexOf('setPdfPreview(null);');
    assert.notEqual(revokeIdx, -1);
    assert.notEqual(clearIdx, -1);
    assert.ok(revokeIdx < clearIdx, 'must revoke before clearing the state that renders the modal');
  });

  it('an unmount-safety effect also revokes the blob URL if the operator navigates away without closing the preview — registered once (empty deps), reading the current value via a ref, never a stale closure', () => {
    const marker = 'const pdfPreviewRef = useRef<typeof pdfPreview>(null);';
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the unmount-safety ref');
    const body = periodicSrc.slice(idx, idx + 400);
    assert.match(body, /pdfPreviewRef\.current = pdfPreview;/);
    assert.match(body, /return \(\) => \{\s*\n\s*pdfPreviewRef\.current\?\.revoke\(\);\s*\n\s*\};\s*\n\s*\}, \[\]\);/);
  });

  it('PdfPreviewModal is a purely presentational component — no PDF-generation, no Firestore access, no useApp() call of its own', () => {
    // Structural guarantee, not a text search: if useApp is never
    // imported, it cannot be called, regardless of what any comment
    // says (this file's own header comment mentions "useApp()" by name
    // while documenting its absence, which a bare text search for that
    // token would misread as a violation).
    assert.doesNotMatch(modalSrc, /import\s*\{[^}]*useApp[^}]*\}\s*from/);
    assert.doesNotMatch(modalSrc, /from 'firebase\/firestore'|collection\(|doc\(|onSnapshot\(|import\('jspdf'\)|buildReportPdfDocument\(/);
    assert.match(modalSrc, /export interface PdfPreviewModalProps \{/);
    assert.match(modalSrc, /blobUrl: string;/);
  });

  it('PdfPreviewModal renders the blob URL directly in an <iframe> — the preview IS the already-built document, never a second independently-rendered representation of it', () => {
    assert.match(modalSrc, /<iframe src=\{blobUrl\} title=\{title\} className="w-full h-full border-0" \/>/);
  });

  it('PdfPreviewModal\'s "Descarregar" button calls onDownload and does NOT itself close the modal — closing is a separate, explicit action', () => {
    const buttonBlock = modalSrc.slice(modalSrc.indexOf('onClick={onDownload}'), modalSrc.indexOf('onClick={onDownload}') + 200);
    assert.doesNotMatch(buttonBlock, /onClose/, 'the download button must not also close the modal');
  });

  it('the preview modal is rendered AFTER (later in the JSX than) the historical modal, so it stacks visually on top if both happen to be open at once — both share the same z-50 overlay pattern', () => {
    const historicalModalIdx = periodicSrc.indexOf('{viewingCount && (');
    const previewModalIdx = periodicSrc.indexOf('{pdfPreview && (');
    assert.notEqual(historicalModalIdx, -1);
    assert.notEqual(previewModalIdx, -1);
    assert.ok(historicalModalIdx < previewModalIdx, 'the preview modal must appear later in the JSX to stack on top');
  });
});

// ---------------------------------------------------------------------
// E. Currency/formatting consistency
// ---------------------------------------------------------------------
describe('E — Currency formatting reuses the existing formatCurrency convention, nothing new', () => {
  it('every monetary value in the historical modal and PDF adapter goes through the shared formatCurrency(value, currencySymbol) helper', () => {
    const modalCurrencyCalls = modal.match(/formatCurrency\(/g) ?? [];
    assert.ok(modalCurrencyCalls.length >= 3, 'Expected at least three formatCurrency calls in the historical modal (per-unit price, line total, overall total).');
    const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');
    const pdfCurrencyCalls = body.match(/formatCurrency\(/g) ?? [];
    assert.ok(pdfCurrencyCalls.length >= 3, 'Expected at least three formatCurrency calls in the historical PDF adapter.');
  });

  it('no alternative currency-formatting function/inline Intl.NumberFormat was introduced for this feature', () => {
    assert.doesNotMatch(modal, /Intl\.NumberFormat|toLocaleString\(/);
    const body = extractFunctionBody(periodicSrc, 'const buildHistoricalExportContent = (count: StockCount) => {');
    assert.doesNotMatch(body, /Intl\.NumberFormat|toLocaleString\(/);
  });
});
