import { PurchaseBatchSummary, BatchTimelineEvent, PURCHASE_BATCH_STATUS_LABELS } from './purchaseBatchCalculations';
import { formatCurrency, formatDate } from './formatters';

const ORANGE: [number, number, number] = [234, 88, 12]; // #EA580C
const DARK: [number, number, number] = [17, 17, 17];
const GRAY: [number, number, number] = [107, 114, 128];

/**
 * Exports a single Purchase Batch to PDF: Header, Supplier, Products,
 * Financial Summary, Timeline, Inventory Status — as specified.
 *
 * jsPDF/autotable are loaded dynamically (only when someone actually
 * clicks "Exportar PDF") so this fairly heavy dependency never bloats
 * the app's main bundle or slows down initial load.
 */
export async function exportPurchaseBatchToPdf(
  summary: PurchaseBatchSummary,
  timeline: BatchTimelineEvent[],
  currencySymbol: string,
  businessName: string
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 48;

  // ---- Header ----
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(businessName || 'Sabush', marginX, y);
  y += 22;

  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Registo de Investimento — Lote de Compra', marginX, y);
  y += 20;

  doc.setFontSize(12);
  doc.setTextColor(...ORANGE);
  doc.text(summary.purchaseBatch.batchNumber, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(
    `Estado: ${PURCHASE_BATCH_STATUS_LABELS[summary.status]}`,
    pageWidth - marginX,
    y,
    { align: 'right' }
  );
  y += 24;

  // ---- Supplier / Batch info ----
  doc.setDrawColor(229, 231, 235);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const infoLines: [string, string][] = [
    ['Data da Compra', formatDate(summary.purchaseBatch.date)],
    ['Fornecedor', summary.purchaseBatch.supplier.name],
    ['Telefone', summary.purchaseBatch.supplier.phone || '—'],
    ['Criado Por', summary.purchaseBatch.createdByName || '—'],
    ['Notas', summary.purchaseBatch.notes || '—'],
  ];
  infoLines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(label + ':', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(String(value), marginX + 110, y);
    y += 16;
  });
  y += 8;

  // ---- Product table ----
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Produto', 'Qtd Original', 'Qtd Restante', 'Custo Un.', 'Venda Un.', 'Invest. Restante', 'Lucro Embutido Restante']],
    body: summary.lineItems.map((li) => [
      li.product?.name || 'Produto Removido',
      String(li.batch.quantity) + ' ' + (li.batch.unit || 'un'),
      String(li.remainingQuantity) + ' ' + (li.batch.unit || 'un'),
      formatCurrency(li.batch.costPrice, currencySymbol),
      formatCurrency(li.batch.sellingPrice, currencySymbol),
      formatCurrency(li.investmentValue, currencySymbol),
      formatCurrency(li.embeddedProfit, currencySymbol),
    ]),
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  // @ts-ignore - jspdf-autotable augments doc with lastAutoTable
  y = (doc as any).lastAutoTable.finalY + 24;

  // ---- Financial Summary ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text('Resumo Financeiro', marginX, y);
  y += 16;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [
      ['Investimento Total (original)', formatCurrency(summary.totalInvestmentValue, currencySymbol)],
      ['Valor de Mercado Total (original)', formatCurrency(summary.totalMarketValue, currencySymbol)],
      ['Lucro Embutido Total (original)', formatCurrency(summary.totalEmbeddedProfit, currencySymbol)],
      ['Investimento Restante (atual)', formatCurrency(summary.remainingInvestmentValue, currencySymbol)],
      ['Valor de Mercado Restante (atual)', formatCurrency(summary.remainingMarketValue, currencySymbol)],
      ['Lucro Embutido Restante (atual)', formatCurrency(summary.remainingEmbeddedProfit, currencySymbol)],
      ['Inventário Perdido (Quebras, a custo)', formatCurrency(summary.inventoryLostValue, currencySymbol)],
    ],
    theme: 'plain',
    bodyStyles: { fontSize: 9, textColor: DARK },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 24;

  // ---- Timeline ----
  if (y > 680) {
    doc.addPage();
    y = 48;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text('Linha do Tempo', marginX, y);
  y += 16;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Data', 'Ação', 'Descrição']],
    body: timeline.map((ev) => [
      new Date(ev.date).toLocaleDateString('pt-PT'),
      ev.label,
      ev.description,
    ]),
    headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  const fileName = `${summary.purchaseBatch.batchNumber}-${summary.purchaseBatch.date}.pdf`;
  doc.save(fileName);
}
