import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateBatch } from '../../utils/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, PillToggle, ReportEmptyState } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { concentrationInsight } from './shared/reportInsights';
import { BarChartHorizontal } from './charts/MiniCharts';
import { Boxes, Gem, TrendingUp, Package, Layers, Percent, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GroupBy = 'supplier' | 'batch' | 'product';

export const InventoryValuationReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { business, currencySymbol, products, batches, purchaseBatches, quebras, activeBatchCount } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('supplier');

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const purchaseBatchByLineId = useMemo(() => {
    const map = new Map<string, string>(); // stockBatch.id -> purchaseBatch id
    batches.forEach(b => {
      if (b.purchaseBatchId) map.set(b.id, b.purchaseBatchId);
    });
    return map;
  }, [batches]);
  const purchaseBatchMap = useMemo(() => new Map(purchaseBatches.map(pb => [pb.id, pb])), [purchaseBatches]);

  const perBatchCalcs = useMemo(
    () => batches.map(b => ({ batch: b, calc: calculateBatch(b, quebras) })),
    [batches, quebras]
  );

  const totalInvestmentValue = perBatchCalcs.reduce((s, x) => s + x.calc.investmentValue, 0);
  const totalMarketValue = perBatchCalcs.reduce((s, x) => s + x.calc.marketValue, 0);
  const totalEmbeddedProfit = totalMarketValue - totalInvestmentValue;
  const avgMargin = totalInvestmentValue > 0 ? (totalEmbeddedProfit / totalInvestmentValue) * 100 : 0;

  // Per-product aggregation (always computed — used for KPIs and Product grouping)
  const perProduct = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; investment: number; market: number; profit: number }>();
    perBatchCalcs.forEach(({ batch, calc }) => {
      const p = productMap.get(batch.productId);
      const name = p?.name || t('reports.inventoryValuation.removedProduct');
      const existing = map.get(batch.productId) || { productId: batch.productId, name, investment: 0, market: 0, profit: 0 };
      existing.investment += calc.investmentValue;
      existing.market += calc.marketValue;
      existing.profit += calc.embeddedProfit;
      map.set(batch.productId, existing);
    });
    return Array.from(map.values()).filter(p => p.market !== 0 || p.investment !== 0);
  }, [perBatchCalcs, productMap, t]);

  const highestValueProduct = perProduct.length ? [...perProduct].sort((a, b) => b.market - a.market)[0] : null;
  const lowestValueProduct = perProduct.length ? [...perProduct].sort((a, b) => a.market - b.market)[0] : null;

  // Grouping data (supplier / batch / product) built purely from calculateBatch results
  const grouped = useMemo(() => {
    if (groupBy === 'product') {
      return perProduct.map(p => ({ key: p.productId, label: p.name, investment: p.investment, market: p.market, profit: p.profit }));
    }
    if (groupBy === 'batch') {
      const map = new Map<string, { key: string; label: string; investment: number; market: number; profit: number }>();
      perBatchCalcs.forEach(({ batch, calc }) => {
        const pbId = purchaseBatchByLineId.get(batch.id);
        const pb = pbId ? purchaseBatchMap.get(pbId) : undefined;
        const key = pb?.id || `sem-lote-${batch.dateEntered}`;
        const label = pb ? `${pb.batchNumber} — ${formatDate(pb.date)}` : t('reports.inventoryValuation.noPurchaseBatch', { date: formatDate(batch.dateEntered) });
        const existing = map.get(key) || { key, label, investment: 0, market: 0, profit: 0 };
        existing.investment += calc.investmentValue;
        existing.market += calc.marketValue;
        existing.profit += calc.embeddedProfit;
        map.set(key, existing);
      });
      return Array.from(map.values());
    }
    // supplier
    const map = new Map<string, { key: string; label: string; investment: number; market: number; profit: number }>();
    perBatchCalcs.forEach(({ batch, calc }) => {
      const pbId = purchaseBatchByLineId.get(batch.id);
      const pb = pbId ? purchaseBatchMap.get(pbId) : undefined;
      const key = pb?.supplier.name || t('reports.inventoryValuation.unspecifiedSupplier');
      const existing = map.get(key) || { key, label: key, investment: 0, market: 0, profit: 0 };
      existing.investment += calc.investmentValue;
      existing.market += calc.marketValue;
      existing.profit += calc.embeddedProfit;
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [groupBy, perProduct, perBatchCalcs, purchaseBatchByLineId, purchaseBatchMap, t]);

  const groupedSorted = [...grouped].filter(g => g.market !== 0 || g.investment !== 0).sort((a, b) => b.market - a.market);

  const insights = useMemo(() => {
    const lines: string[] = [];
    const concEntity = groupBy === 'supplier'
      ? t('reports.inventoryValuation.entitySuppliersPlural')
      : groupBy === 'batch'
        ? t('reports.inventoryValuation.entityBatchesPlural')
        : t('reports.inventoryValuation.entityProductsPlural');
    const c = concentrationInsight(t, concEntity, groupedSorted.map(g => ({ label: g.label, value: g.market })), totalMarketValue);
    if (c) lines.push(c);
    if (highestValueProduct) {
      lines.push(t('reports.inventoryValuation.insightHighestValue', {
        name: highestValueProduct.name,
        value: formatCurrency(highestValueProduct.market, currencySymbol),
      }));
    }
    if (avgMargin !== 0) {
      lines.push(t('reports.inventoryValuation.insightAvgMargin', { pct: avgMargin.toFixed(1) }));
    }
    return lines;
  }, [groupBy, groupedSorted, totalMarketValue, highestValueProduct, currencySymbol, avgMargin, t]);

  const groupLabel = groupBy === 'supplier'
    ? t('reports.inventoryValuation.groupSupplier')
    : groupBy === 'batch'
      ? t('reports.inventoryValuation.groupBatchFull')
      : t('reports.inventoryValuation.groupProduct');

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.inventoryValuation.title'),
      business?.name || 'Sabush',
      t('reports.inventoryValuation.groupedBy', { group: groupLabel }),
      [
        { label: t('reports.inventoryValuation.kpiInventoryCostFull'), value: formatCurrency(totalInvestmentValue, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiMarketValueFull'), value: formatCurrency(totalMarketValue, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiEmbeddedProfit'), value: formatCurrency(totalEmbeddedProfit, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiNumProductsFull'), value: String(perProduct.length) },
        { label: t('reports.inventoryValuation.kpiActiveBatchesFull'), value: String(activeBatchCount) },
        { label: t('reports.inventoryValuation.kpiAvgMarginFull'), value: `${avgMargin.toFixed(1)}%` },
        { label: t('reports.inventoryValuation.kpiHighestValueProductFull'), value: highestValueProduct ? `${highestValueProduct.name} (${formatCurrency(highestValueProduct.market, currencySymbol)})` : '—' },
        { label: t('reports.inventoryValuation.kpiLowestValueProductFull'), value: lowestValueProduct ? `${lowestValueProduct.name} (${formatCurrency(lowestValueProduct.market, currencySymbol)})` : '—' },
      ],
      [
        {
          title: t('reports.inventoryValuation.inventoryByGroup', { group: groupLabel }),
          columns: [groupLabel, t('reports.inventoryValuation.colInvestment'), t('reports.inventoryValuation.colMarket'), t('reports.inventoryValuation.colEmbeddedProfit')],
          rows: groupedSorted.map(g => [g.label, formatCurrency(g.investment, currencySymbol), formatCurrency(g.market, currencySymbol), formatCurrency(g.profit, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.inventoryValuation.title'),
      [
        { label: t('reports.inventoryValuation.kpiInventoryCostFull'), value: formatCurrency(totalInvestmentValue, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiMarketValueFull'), value: formatCurrency(totalMarketValue, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiEmbeddedProfit'), value: formatCurrency(totalEmbeddedProfit, currencySymbol) },
        { label: t('reports.inventoryValuation.kpiNumProductsFull'), value: String(perProduct.length) },
        { label: t('reports.inventoryValuation.kpiActiveBatchesFull'), value: String(activeBatchCount) },
        { label: t('reports.inventoryValuation.kpiAvgMarginFull'), value: `${avgMargin.toFixed(1)}%` },
      ],
      [
        {
          title: t('reports.inventoryValuation.byGroup', { group: groupLabel }),
          columns: [groupLabel, t('reports.inventoryValuation.colInvestment'), t('reports.inventoryValuation.colMarket'), t('reports.inventoryValuation.colEmbeddedProfit')],
          rows: groupedSorted.map(g => [g.label, g.investment, g.market, g.profit]),
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
        title={t('reports.inventoryValuation.title')}
        description={t('reports.inventoryValuation.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Boxes} label={t('reports.inventoryValuation.kpiInventoryCost')} value={formatCurrency(totalInvestmentValue, currencySymbol)} />
        <ReportKpiCard icon={Gem} label={t('reports.inventoryValuation.kpiMarketValue')} value={formatCurrency(totalMarketValue, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={TrendingUp} label={t('reports.inventoryValuation.kpiEmbeddedProfit')} value={formatCurrency(totalEmbeddedProfit, currencySymbol)} tone={totalEmbeddedProfit >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={Percent} label={t('reports.inventoryValuation.kpiAvgMargin')} value={`${avgMargin.toFixed(1)}%`} />
        <ReportKpiCard icon={Package} label={t('reports.inventoryValuation.kpiNumProducts')} value={String(perProduct.length)} />
        <ReportKpiCard icon={Layers} label={t('reports.inventoryValuation.kpiActiveBatches')} value={String(activeBatchCount)} />
        <ReportKpiCard icon={ArrowUp} label={t('reports.inventoryValuation.kpiHighestValueProduct')} value={highestValueProduct ? formatCurrency(highestValueProduct.market, currencySymbol) : '—'} sub={highestValueProduct?.name} tone="positive" />
        <ReportKpiCard icon={ArrowDown} label={t('reports.inventoryValuation.kpiLowestValueProduct')} value={lowestValueProduct ? formatCurrency(lowestValueProduct.market, currencySymbol) : '—'} sub={lowestValueProduct?.name} />
      </div>

      <ReportSection
        title={t('reports.inventoryValuation.inventoryByGroup', { group: groupLabel })}
        icon={Layers}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'supplier', label: t('reports.inventoryValuation.groupSupplier') },
              { value: 'batch', label: t('reports.inventoryValuation.groupBatch') },
              { value: 'product', label: t('reports.inventoryValuation.groupProduct') },
            ]}
          />
        }
      >
        {groupedSorted.length === 0 ? (
          <ReportEmptyState message={t('reports.inventoryValuation.noInventory')} />
        ) : (
          <BarChartHorizontal currencySymbol={currencySymbol} data={groupedSorted.slice(0, 12).map(g => ({ label: g.label, value: g.market }))} />
        )}
      </ReportSection>

      <ReportSection title={t('reports.inventoryValuation.detail')} icon={Boxes}>
        {groupedSorted.length === 0 ? (
          <ReportEmptyState message={t('reports.inventoryValuation.noDataToShow')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{groupLabel}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.inventoryValuation.colInvestment')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.inventoryValuation.colMarket')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.inventoryValuation.colEmbeddedProfit')}</th>
                </tr>
              </thead>
              <tbody>
                {groupedSorted.map(g => (
                  <tr key={g.key} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-semibold text-gray-800">{g.label}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(g.investment, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-gray-900">{formatCurrency(g.market, currencySymbol)}</td>
                    <td className={`py-2 pr-2 text-right font-mono font-bold ${g.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(g.profit, currencySymbol)}</td>
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
