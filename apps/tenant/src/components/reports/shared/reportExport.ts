import { formatDate } from '../../../utils/formatters';

// [Readability Audit F-13] Was ORANGE = [234, 88, 12] (#EA580C) — an
// off-brand color used nowhere else in the product (DESIGN_SYSTEM.md's
// actual --orange token is #FF8C42, and the real brand accent is gold).
// It also failed contrast for its own white header-row text (~3.56:1,
// computed). Replaced with the app's real navy structural color
// (#0B1F3A), paired with white text exactly as every other navy surface
// in the product already does (~16.5:1, safe) — no new design decision,
// just bringing this one shared PDF builder into line with tokens
// already used everywhere else. DARK corrected from #111111 to the
// documented #111827 foreground token (functionally identical, now
// exact).
const NAVY: [number, number, number] = [11, 31, 58]; // #0B1F3A — was ORANGE
const DARK: [number, number, number] = [17, 24, 39]; // #111827 — was #111111
const GRAY: [number, number, number] = [107, 114, 128]; // #6B7280 — unchanged, already the documented --muted-foreground token

export interface ExportKpi {
  label: string;
  value: string;
}

export interface ExportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

/**
 * [Owner-requested — preview before download] Builds the exact same
 * jsPDF document exportReportPdf below builds — same header, same KPI
 * block, same per-table rendering — but returns the constructed
 * document and its intended filename WITHOUT saving it. Both
 * exportReportPdf (direct download, unchanged) and
 * generateReportPdfPreview (preview-first, below) call this one
 * shared builder, so a preview and its resulting download can never
 * drift apart — there is exactly one place this document's content is
 * ever assembled.
 */
async function buildReportPdfDocument(
  reportTitle: string,
  businessName: string,
  periodLabel: string,
  kpis: ExportKpi[],
  tables: ExportTable[]
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 48;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFontSize(10); // [F-13] was 9pt — print-readability floor
  doc.setTextColor(...GRAY);
  doc.text(businessName || 'Sabush', marginX, y);
  doc.text(new Date().toLocaleDateString('pt-PT'), pageWidth - marginX, y, { align: 'right' });
  y += 22;

  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, marginX, y);
  y += 18;

  if (periodLabel) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(periodLabel, marginX, y);
    y += 16;
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  // ---- KPI summary block ----
  if (kpis.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      body: kpis.map(k => [k.label, k.value]),
      theme: 'plain',
      bodyStyles: { fontSize: 10, textColor: DARK }, // [F-13] was 9pt
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ---- Tables ----
  tables.forEach(table => {
    if (!table.rows.length) return;
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(table.title, marginX, y);
    y += 12;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [table.columns],
      body: table.rows,
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 }, // [F-13] was ORANGE @ 8pt — off-brand, ~3.56:1 contrast; navy @ 9pt is ~16.5:1
      bodyStyles: { fontSize: 9, textColor: DARK }, // [F-13] was 8pt
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 24;
  });

  const fileSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fileName = `${fileSlug}-${formatDate(new Date().toISOString().slice(0, 10))}.pdf`.replace(/\s/g, '-');

  return { doc, fileName };
}

/**
 * Exports any report to PDF: Header, KPI summary, then one table per
 * section. jsPDF/autotable are loaded dynamically — same pattern as
 * utils/batchPdfExport.ts — so this stays out of the main bundle until
 * someone actually exports a report.
 */
export async function exportReportPdf(
  reportTitle: string,
  businessName: string,
  periodLabel: string,
  kpis: ExportKpi[],
  tables: ExportTable[]
) {
  const { doc, fileName } = await buildReportPdfDocument(reportTitle, businessName, periodLabel, kpis, tables);
  doc.save(fileName);
}

/**
 * [Owner-requested — preview before download] Builds the SAME PDF
 * exportReportPdf would, via the shared builder above, but returns a
 * blob URL to render inline (e.g. in an <iframe>) instead of
 * immediately downloading it. `download()` triggers the actual save,
 * on demand, using the identical already-built document — never a
 * second, independently-rebuilt PDF that could drift from what was
 * previewed. `revoke()` MUST be called once the preview is no longer
 * shown (e.g. on modal close) to release the blob URL — the caller
 * owns this lifecycle, since only it knows when the preview UI is
 * actually done with it.
 */
export interface ReportPdfPreview {
  blobUrl: string;
  fileName: string;
  download: () => void;
  revoke: () => void;
}

export async function generateReportPdfPreview(
  reportTitle: string,
  businessName: string,
  periodLabel: string,
  kpis: ExportKpi[],
  tables: ExportTable[]
): Promise<ReportPdfPreview> {
  const { doc, fileName } = await buildReportPdfDocument(reportTitle, businessName, periodLabel, kpis, tables);
  const blobUrl: string = doc.output('bloburl');
  return {
    blobUrl,
    fileName,
    download: () => doc.save(fileName),
    revoke: () => URL.revokeObjectURL(blobUrl),
  };
}

/**
 * Exports any report to a real .xlsx workbook: one "Resumo" sheet for the
 * KPIs, plus one sheet per table. SheetJS is loaded dynamically for the
 * same reason as jsPDF above.
 */
export interface ExportLabels {
  indicator: string;
  value: string;
  summary: string;
  tableFallback: string; // e.g. 'Table {{n}}' — {{n}} is replaced manually here
}

export async function exportReportExcel(reportTitle: string, kpis: ExportKpi[], tables: ExportTable[], labels: ExportLabels) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  if (kpis.length) {
    const summarySheet = XLSX.utils.aoa_to_sheet([
      [reportTitle],
      [],
      [labels.indicator, labels.value],
      ...kpis.map(k => [k.label, k.value]),
    ]);
    summarySheet['!cols'] = [{ wch: 36 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, labels.summary);
  }

  tables.forEach((table, idx) => {
    if (!table.rows.length) return;
    const sheet = XLSX.utils.aoa_to_sheet([table.columns, ...table.rows]);
    sheet['!cols'] = table.columns.map(() => ({ wch: 20 }));
    const fallbackName = labels.tableFallback.replace('{{n}}', String(idx + 1));
    const safeName = table.title.replace(/[\\/*?:[\]]/g, '').slice(0, 28) || fallbackName;
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  });

  const fileSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  XLSX.writeFile(wb, `${fileSlug}.xlsx`);
}

/** Print the current report using the browser's native print dialog. */
export function printCurrentReport() {
  window.print();
}
