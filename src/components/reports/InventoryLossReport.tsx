import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { isDateInRange } from '../../utils/calculations';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, PillToggle, ReportEmptyState } from './shared/ReportUI';
import { ReportFilterBar, useDateRange } from './shared/ReportFilterBar';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { concentrationInsight } from './shared/reportInsights';
import { DonutChart, LineChartSimple, BarChartHorizontal } from './charts/MiniCharts';
import { AlertTriangle, Package, CalendarDays, TrendingDown } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GroupBy = 'product' | 'reason' | 'month';

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

export const InventoryLossReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, quebras, batches, products, deleteQuebra } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('product');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const batchMap = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches]);

  const enriched = useMemo(() => {
    return quebras
      .filter(q => isDateInRange(q.date, range.startDate, range.endDate))
      .map(q => {
        const batch = batchMap.get(q.batchId);
        const product = batch ? productMap.get(batch.productId) : undefined;
        const value = q.quantityLost * (batch?.costPrice || 0);
        return { quebra: q, product, value };
      });
  }, [quebras, batchMap, productMap, range]);

  const totalValueLost = enriched.reduce((s, e) => s + e.value, 0);
  const totalUnitsLost = enriched.reduce((s, e) => s + Number(e.quebra.quantityLost || 0), 0);
  const productsLostCount = new Set(enriched.map(e => e.product?.id).filter(Boolean)).size;

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    enriched.forEach(e => {
      const key = groupBy === 'product' ? (e.product?.name || 'Produto Removido') : groupBy === 'reason' ? (e.quebra.reason || 'Não Especificado') : e.quebra.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + e.value);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: groupBy === 'month' ? monthLabel(key + '-01') : key, value }))
      .sort((a, b) => (groupBy === 'month' ? a.key.localeCompare(b.key) : b.value - a.value));
  }, [enriched, groupBy]);

  const largestLoss = useMemo(() => [...enriched].sort((a, b) => b.value - a.value)[0] || null, [enriched]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (largestLoss) {
      lines.push(`A maior perda individual foi ${formatCurrency(largestLoss.value, currencySymbol)} em ${largestLoss.product?.name || 'produto removido'} (${formatDate(largestLoss.quebra.date)}).`);
    }
    const c = concentrationInsight(groupBy === 'product' ? 'produtos' : groupBy === 'reason' ? 'motivos' : 'meses', grouped.map(g => ({ label: g.label, value: g.value })), totalValueLost);
    if (c) lines.push(c);
    return lines;
  }, [largestLoss, currencySymbol, grouped, totalValueLost, groupBy]);

  const groupLabel = groupBy === 'product' ? 'Produto' : groupBy === 'reason' ? 'Motivo' : 'Mês';

  const handleExportPdf = () => {
    exportReportPdf(
      'Perdas de Inventário',
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: 'Valor Total Perdido', value: formatCurrency(totalValueLost, currencySymbol) },
        { label: 'Unidades Perdidas', value: String(totalUnitsLost) },
        { label: 'Produtos Afetados', value: String(productsLostCount) },
        { label: 'Maior Perda Individual', value: largestLoss ? formatCurrency(largestLoss.value, currencySymbol) : '—' },
      ],
      [
        { title: `Por ${groupLabel}`, columns: [groupLabel, 'Valor Perdido'], rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]) },
        {
          title: 'Todas as Perdas',
          columns: ['Data', 'Produto', 'Quantidade', 'Motivo', 'Valor'],
          rows: enriched.map(e => [formatDate(e.quebra.date), e.product?.name || 'Produto Removido', e.quebra.quantityLost, e.quebra.reason, formatCurrency(e.value, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Perdas de Inventário',
      [
        { label: 'Valor Total Perdido', value: formatCurrency(totalValueLost, currencySymbol) },
        { label: 'Unidades Perdidas', value: String(totalUnitsLost) },
      ],
      [
        { title: `Por ${groupLabel}`, columns: [groupLabel, 'Valor'], rows: grouped.map(g => [g.label, g.value]) },
        {
          title: 'Todas as Perdas',
          columns: ['Data', 'Produto', 'Quantidade', 'Motivo', 'Valor'],
          rows: enriched.map(e => [e.quebra.date, e.product?.name || 'Produto Removido', e.quebra.quantityLost, e.quebra.reason, e.value]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Perdas de Inventário"
        description="Onde o negócio está a perder dinheiro em stock."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={AlertTriangle} label="Valor Total Perdido" value={formatCurrency(totalValueLost, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={TrendingDown} label="Unidades Perdidas" value={String(totalUnitsLost)} tone="negative" />
        <ReportKpiCard icon={Package} label="Produtos Afetados" value={String(productsLostCount)} />
        <ReportKpiCard icon={CalendarDays} label="Maior Perda Individual" value={largestLoss ? formatCurrency(largestLoss.value, currencySymbol) : '—'} sub={largestLoss?.product?.name} tone="negative" />
      </div>

      <ReportSection
        title={`Perdas por ${groupLabel}`}
        icon={AlertTriangle}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'product', label: 'Produto' },
              { value: 'reason', label: 'Motivo' },
              { value: 'month', label: 'Mês' },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message="Nenhuma perda registada neste período." />
        ) : groupBy === 'month' ? (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        ) : groupBy === 'reason' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <BarChartHorizontal currencySymbol={currencySymbol} data={grouped.slice(0, 12).map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        )}
      </ReportSection>

      <ReportSection title={`Todas as Perdas (${enriched.length})`} icon={Package}>
        {enriched.length === 0 ? (
          <ReportEmptyState message="Nenhuma perda registada neste período." />
        ) : (
          <div className="space-y-2">
            {[...enriched].sort((a, b) => b.value - a.value).map(({ quebra, product, value }) => (
              <div key={quebra.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">{product?.name || 'Produto Removido'}</span>
                  <span className="text-[11px] text-gray-500">
                    {formatDate(quebra.date)} · {quebra.quantityLost} unidades · {quebra.reason}
                  </span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="font-mono font-bold text-rose-600 text-sm">{formatCurrency(value, currencySymbol)}</span>
                  <button onClick={() => deleteQuebra(quebra.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    Eliminar
                  </button>
                </div>
                <span className="font-mono font-bold text-rose-600 text-sm hidden report-print-only">{formatCurrency(value, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
