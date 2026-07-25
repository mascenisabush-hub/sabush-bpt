import { formatDate } from '../../../utils/formatters';

const ORANGE: [number, number, number] = [234, 88, 12]; // #EA580C
const DARK: [number, number, number] = [17, 17, 17];
const GRAY: [number, number, number] = [107, 114, 128];

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
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 48;

  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFontSize(9);
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
      bodyStyles: { fontSize: 9, textColor: DARK },
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
      headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 24;
  });

  const fileSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  doc.save(`${fileSlug}-${formatDate(new Date().toISOString().slice(0, 10))}.pdf`.replace(/\s/g, '-'));
}

/**
 * Exports any report to a real .xlsx workbook: one "Resumo" sheet for the
 * KPIs, plus one sheet per table. SheetJS is loaded dynamically for the
 * same reason as jsPDF above.
 */
export async function exportReportExcel(reportTitle: string, kpis: ExportKpi[], tables: ExportTable[]) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  if (kpis.length) {
    const summarySheet = XLSX.utils.aoa_to_sheet([
      [reportTitle],
      [],
      ['Indicador', 'Valor'],
      ...kpis.map(k => [k.label, k.value]),
    ]);
    summarySheet['!cols'] = [{ wch: 36 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');
  }

  tables.forEach((table, idx) => {
    if (!table.rows.length) return;
    const sheet = XLSX.utils.aoa_to_sheet([table.columns, ...table.rows]);
    sheet['!cols'] = table.columns.map(() => ({ wch: 20 }));
    const safeName = table.title.replace(/[\\/*?:[\]]/g, '').slice(0, 28) || `Tabela ${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  });

  const fileSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  XLSX.writeFile(wb, `${fileSlug}.xlsx`);
}

/** Print the current report using the browser's native print dialog. */
export function printCurrentReport() {
  window.print();
}
