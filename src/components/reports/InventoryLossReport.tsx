import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
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

export const InventoryLossReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { business, currencySymbol, quebras, batches, products, deleteQuebra } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('product');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();

  const monthLabel = (dateStr: string): string => {
    const [y, m] = dateStr.split('-');
    const names = [
      t('common.months.jan'), t('common.months.feb'), t('common.months.mar'), t('common.months.apr'),
      t('common.months.may'), t('common.months.jun'), t('common.months.jul'), t('common.months.aug'),
      t('common.months.sep'), t('common.months.oct'), t('common.months.nov'), t('common.months.dec'),
    ];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
  };

  const productRemoved = t('reports.inventoryLosses.productRemoved');
  const unspecified = t('reports.common.unspecified');

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
      const key = groupBy === 'product' ? (e.product?.name || productRemoved) : groupBy === 'reason' ? (e.quebra.reason || unspecified) : e.quebra.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + e.value);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: groupBy === 'month' ? monthLabel(key + '-01') : key, value }))
      .sort((a, b) => (groupBy === 'month' ? a.key.localeCompare(b.key) : b.value - a.value));
  }, [enriched, groupBy, productRemoved, unspecified]);

  const largestLoss = useMemo(() => [...enriched].sort((a, b) => b.value - a.value)[0] || null, [enriched]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (largestLoss) {
      lines.push(t('reports.inventoryLosses.insightLargestLoss', {
        amount: formatCurrency(largestLoss.value, currencySymbol),
        product: largestLoss.product?.name || productRemoved,
        date: formatDate(largestLoss.quebra.date),
      }));
    }
    const entityLabel = groupBy === 'product' ? t('reports.inventoryLosses.groupProduct') : groupBy === 'reason' ? t('reports.inventoryLosses.groupReason') : t('reports.inventoryLosses.groupMonth');
    const c = concentrationInsight(t, entityLabel.toLowerCase(), grouped.map(g => ({ label: g.label, value: g.value })), totalValueLost);
    if (c) lines.push(c);
    return lines;
  }, [largestLoss, currencySymbol, grouped, totalValueLost, groupBy, t, productRemoved]);

  const groupLabel = groupBy === 'product' ? t('reports.inventoryLosses.groupProduct') : groupBy === 'reason' ? t('reports.inventoryLosses.groupReason') : t('reports.inventoryLosses.groupMonth');

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.inventoryLosses.title'),
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: t('reports.inventoryLosses.kpiTotalLost'), value: formatCurrency(totalValueLost, currencySymbol) },
        { label: t('reports.inventoryLosses.kpiUnitsLost'), value: String(totalUnitsLost) },
        { label: t('reports.inventoryLosses.kpiProductsAffected'), value: String(productsLostCount) },
        { label: t('reports.inventoryLosses.kpiLargestLoss'), value: largestLoss ? formatCurrency(largestLoss.value, currencySymbol) : '—' },
      ],
      [
        { title: t('reports.inventoryLosses.sectionByGroupTitle', { group: groupLabel }), columns: [groupLabel, t('reports.inventoryLosses.colValueLost')], rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]) },
        {
          title: t('reports.inventoryLosses.allLossesTitle'),
          columns: [t('reports.common.dateCol'), t('reports.inventoryLosses.groupProduct'), t('reports.inventoryLosses.colQuantity'), t('reports.common.reasonCol'), t('reports.common.value')],
          rows: enriched.map(e => [formatDate(e.quebra.date), e.product?.name || productRemoved, e.quebra.quantityLost, e.quebra.reason, formatCurrency(e.value, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.inventoryLosses.title'),
      [
        { label: t('reports.inventoryLosses.kpiTotalLost'), value: formatCurrency(totalValueLost, currencySymbol) },
        { label: t('reports.inventoryLosses.kpiUnitsLost'), value: String(totalUnitsLost) },
      ],
      [
        { title: t('reports.inventoryLosses.sectionByGroupTitle', { group: groupLabel }), columns: [groupLabel, t('reports.common.value')], rows: grouped.map(g => [g.label, g.value]) },
        {
          title: t('reports.inventoryLosses.allLossesTitle'),
          columns: [t('reports.common.dateCol'), t('reports.inventoryLosses.groupProduct'), t('reports.inventoryLosses.colQuantity'), t('reports.common.reasonCol'), t('reports.common.value')],
          rows: enriched.map(e => [e.quebra.date, e.product?.name || productRemoved, e.quebra.quantityLost, e.quebra.reason, e.value]),
        },
      ],
      {
        indicator: t('reports.common.indicator'),
        value: t('reports.common.value'),
        summary: t('reports.common.summary'),
        tableFallback: t('reports.common.tableFallback'),
      }
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title={t('reports.inventoryLosses.title')}
        description={t('reports.inventoryLosses.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ReportKpiCard icon={AlertTriangle} label={t('reports.inventoryLosses.kpiTotalLost')} value={formatCurrency(totalValueLost, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={TrendingDown} label={t('reports.inventoryLosses.kpiUnitsLost')} value={String(totalUnitsLost)} tone="negative" />
        <ReportKpiCard icon={Package} label={t('reports.inventoryLosses.kpiProductsAffected')} value={String(productsLostCount)} />
        <ReportKpiCard icon={CalendarDays} label={t('reports.inventoryLosses.kpiLargestLoss')} value={largestLoss ? formatCurrency(largestLoss.value, currencySymbol) : '—'} sub={largestLoss?.product?.name} tone="negative" />
      </div>

      <ReportSection
        title={t('reports.inventoryLosses.sectionByGroupTitle', { group: groupLabel })}
        icon={AlertTriangle}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'product', label: t('reports.inventoryLosses.groupProduct') },
              { value: 'reason', label: t('reports.inventoryLosses.groupReason') },
              { value: 'month', label: t('reports.inventoryLosses.groupMonth') },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message={t('reports.inventoryLosses.emptyMessage')} />
        ) : groupBy === 'month' ? (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        ) : groupBy === 'reason' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <BarChartHorizontal currencySymbol={currencySymbol} data={grouped.slice(0, 12).map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        )}
      </ReportSection>

      <ReportSection title={t('reports.inventoryLosses.allLossesCount', { count: enriched.length })} icon={Package}>
        {enriched.length === 0 ? (
          <ReportEmptyState message={t('reports.inventoryLosses.emptyMessage')} />
        ) : (
          <div className="space-y-2">
            {[...enriched].sort((a, b) => b.value - a.value).map(({ quebra, product, value }) => (
              <div key={quebra.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">{product?.name || productRemoved}</span>
                  <span className="text-[11px] text-gray-500">
                    {formatDate(quebra.date)} · {quebra.quantityLost} {t('reports.inventoryLosses.unitsSuffix')} · {quebra.reason}
                  </span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="type-number text-rose-600 text-sm">{formatCurrency(value, currencySymbol)}</span>
                  <button onClick={() => deleteQuebra(quebra.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    {t('reports.common.delete')}
                  </button>
                </div>
                <span className="type-number text-rose-600 text-sm hidden report-print-only">{formatCurrency(value, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
