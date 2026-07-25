import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculatePurchaseBatchSummary, PURCHASE_BATCH_STATUS_LABELS } from '../../utils/purchaseBatchCalculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, PillToggle, ReportEmptyState } from './shared/ReportUI';
import { ReportFilterBar, useDateRange } from './shared/ReportFilterBar';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { concentrationInsight } from './shared/reportInsights';
import { BarChartHorizontal } from './charts/MiniCharts';
import { Layers, TrendingUp, Boxes, Gem } from 'lucide-react';
import { isDateInRange } from '../../utils/calculations';

interface Props {
  onBack: () => void;
}

type SortMode = 'profit' | 'investment' | 'newest' | 'oldest';

export const BatchPerformanceReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, purchaseBatches, batches, quebras, products } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>('profit');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const suppliers = useMemo(
    () => Array.from(new Set(purchaseBatches.map(pb => pb.supplier.name).filter(Boolean))).sort(),
    [purchaseBatches]
  );

  const summaries = useMemo(() => {
    return purchaseBatches
      .filter(pb => isDateInRange(pb.date, range.startDate, range.endDate))
      .filter(pb => supplierFilter === 'all' || pb.supplier.name === supplierFilter)
      .map(pb => calculatePurchaseBatchSummary(pb, batches.filter(b => b.purchaseBatchId === pb.id), quebras, products));
  }, [purchaseBatches, batches, quebras, products, range, supplierFilter]);

  const sorted = useMemo(() => {
    const copy = [...summaries];
    if (sortMode === 'profit') copy.sort((a, b) => b.remainingEmbeddedProfit - a.remainingEmbeddedProfit);
    else if (sortMode === 'investment') copy.sort((a, b) => b.totalInvestmentValue - a.totalInvestmentValue);
    else if (sortMode === 'newest') copy.sort((a, b) => b.purchaseBatch.date.localeCompare(a.purchaseBatch.date));
    else copy.sort((a, b) => a.purchaseBatch.date.localeCompare(b.purchaseBatch.date));
    return copy;
  }, [summaries, sortMode]);

  const totalInvestment = summaries.reduce((s, x) => s + x.totalInvestmentValue, 0);
  const totalRemainingProfit = summaries.reduce((s, x) => s + x.remainingEmbeddedProfit, 0);
  const totalRemainingInventory = summaries.reduce((s, x) => s + x.remainingInvestmentValue, 0);

  const insights = useMemo(() => {
    const lines: string[] = [];
    const c = concentrationInsight('lotes', summaries.map(s => ({ label: s.purchaseBatch.batchNumber, value: s.remainingEmbeddedProfit })), totalRemainingProfit);
    if (c) lines.push(c);
    if (sorted.length) {
      const top = sorted[0];
      lines.push(`${top.purchaseBatch.batchNumber} (${formatDate(top.purchaseBatch.date)}, ${top.purchaseBatch.supplier.name}) tem o maior lucro embutido restante: ${formatCurrency(top.remainingEmbeddedProfit, currencySymbol)}.`);
    }
    return lines;
  }, [summaries, totalRemainingProfit, sorted, currencySymbol]);

  const handleExportPdf = () => {
    exportReportPdf(
      'Desempenho de Lotes',
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: 'Lotes no Período', value: String(summaries.length) },
        { label: 'Investimento Total', value: formatCurrency(totalInvestment, currencySymbol) },
        { label: 'Inventário Restante (a custo)', value: formatCurrency(totalRemainingInventory, currencySymbol) },
        { label: 'Lucro Embutido Restante', value: formatCurrency(totalRemainingProfit, currencySymbol) },
      ],
      [
        {
          title: 'Lotes',
          columns: ['Nº do Lote', 'Data', 'Fornecedor', 'Investimento', 'Valor de Mercado', 'Lucro Embutido', 'Inventário Restante', 'Lucro Restante', 'Estado'],
          rows: sorted.map(s => [
            s.purchaseBatch.batchNumber,
            formatDate(s.purchaseBatch.date),
            s.purchaseBatch.supplier.name,
            formatCurrency(s.totalInvestmentValue, currencySymbol),
            formatCurrency(s.totalMarketValue, currencySymbol),
            formatCurrency(s.totalEmbeddedProfit, currencySymbol),
            formatCurrency(s.remainingInvestmentValue, currencySymbol),
            formatCurrency(s.remainingEmbeddedProfit, currencySymbol),
            PURCHASE_BATCH_STATUS_LABELS[s.status],
          ]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Desempenho de Lotes',
      [
        { label: 'Lotes no Período', value: String(summaries.length) },
        { label: 'Investimento Total', value: formatCurrency(totalInvestment, currencySymbol) },
        { label: 'Lucro Embutido Restante', value: formatCurrency(totalRemainingProfit, currencySymbol) },
      ],
      [
        {
          title: 'Lotes',
          columns: ['Nº do Lote', 'Data', 'Fornecedor', 'Investimento', 'Mercado', 'Lucro Embutido', 'Inv. Restante', 'Lucro Restante', 'Estado'],
          rows: sorted.map(s => [
            s.purchaseBatch.batchNumber,
            s.purchaseBatch.date,
            s.purchaseBatch.supplier.name,
            s.totalInvestmentValue,
            s.totalMarketValue,
            s.totalEmbeddedProfit,
            s.remainingInvestmentValue,
            s.remainingEmbeddedProfit,
            PURCHASE_BATCH_STATUS_LABELS[s.status],
          ]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Desempenho de Lotes"
        description="Que lotes de compra geraram mais lucro embutido."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar
        range={range}
        onStartDate={setStartDate}
        onEndDate={setEndDate}
        onPreset={applyPreset}
        extraFilters={
          suppliers.length > 0 ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fornecedor</label>
              <PillToggle
                value={supplierFilter}
                onChange={setSupplierFilter}
                options={[{ value: 'all', label: 'Todos' }, ...suppliers.map(s => ({ value: s, label: s }))]}
              />
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Layers} label="Lotes no Período" value={String(summaries.length)} />
        <ReportKpiCard icon={Boxes} label="Investimento Total" value={formatCurrency(totalInvestment, currencySymbol)} />
        <ReportKpiCard icon={Gem} label="Inventário Restante" value={formatCurrency(totalRemainingInventory, currencySymbol)} />
        <ReportKpiCard icon={TrendingUp} label="Lucro Embutido Restante" value={formatCurrency(totalRemainingProfit, currencySymbol)} tone={totalRemainingProfit >= 0 ? 'positive' : 'negative'} />
      </div>

      <ReportSection
        title="Lucro Embutido Restante por Lote"
        icon={TrendingUp}
        right={
          <PillToggle
            value={sortMode}
            onChange={v => setSortMode(v as SortMode)}
            options={[
              { value: 'profit', label: 'Maior Lucro' },
              { value: 'investment', label: 'Maior Investimento' },
              { value: 'newest', label: 'Mais Recente' },
              { value: 'oldest', label: 'Mais Antigo' },
            ]}
          />
        }
      >
        {sorted.length === 0 ? (
          <ReportEmptyState message="Nenhum lote de compra neste período." />
        ) : (
          <BarChartHorizontal
            currencySymbol={currencySymbol}
            data={sorted.slice(0, 12).map(s => ({ label: `${s.purchaseBatch.batchNumber} · ${s.purchaseBatch.supplier.name}`, value: s.remainingEmbeddedProfit }))}
          />
        )}
      </ReportSection>

      <ReportSection title="Todos os Lotes" icon={Layers}>
        {sorted.length === 0 ? (
          <ReportEmptyState message="Nenhum lote de compra neste período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">Lote</th>
                  <th className="py-2 pr-2 font-semibold">Data</th>
                  <th className="py-2 pr-2 font-semibold">Fornecedor</th>
                  <th className="py-2 pr-2 font-semibold text-right">Investimento</th>
                  <th className="py-2 pr-2 font-semibold text-right">Restante</th>
                  <th className="py-2 pr-2 font-semibold text-right">Lucro Restante</th>
                  <th className="py-2 pr-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.purchaseBatch.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-bold text-gray-900">{s.purchaseBatch.batchNumber}</td>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(s.purchaseBatch.date)}</td>
                    <td className="py-2 pr-2 text-gray-600">{s.purchaseBatch.supplier.name}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(s.totalInvestmentValue, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(s.remainingInvestmentValue, currencySymbol)}</td>
                    <td className={`py-2 pr-2 text-right font-mono font-bold ${s.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(s.remainingEmbeddedProfit, currencySymbol)}</td>
                    <td className="py-2 pr-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">{PURCHASE_BATCH_STATUS_LABELS[s.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </div>
  );
};
