import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculatePurchaseBatchSummary } from '../../utils/purchaseBatchCalculations';
import type { PurchaseBatchStatus } from '../../types';
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
  const { t } = useLanguage();
  const { business, currencySymbol, purchaseBatches, batches, quebras, products } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>('profit');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const statusLabel = (status: PurchaseBatchStatus) => {
    switch (status) {
      case 'active': return t('reports.common.statusActive');
      case 'partially_remaining': return t('reports.common.statusPartiallyRemaining');
      case 'fully_consumed': return t('reports.common.statusFullyConsumed');
      case 'archived': return t('reports.common.statusArchived');
      default: return status;
    }
  };

  const suppliers = useMemo(
    () => Array.from(new Set(purchaseBatches.map(pb => pb.supplier.name).filter(Boolean))).sort(),
    [purchaseBatches]
  );

  // Full, period-filtered summaries — drive the KPIs above. Independent of
  // the search box below, so "profit in the last 30 days" always reflects
  // the whole period, not just whatever the owner is currently looking up.
  const summaries = useMemo(() => {
    return purchaseBatches
      .filter(pb => isDateInRange(pb.date, range.startDate, range.endDate))
      .filter(pb => supplierFilter === 'all' || pb.supplier.name === supplierFilter)
      .map(pb => calculatePurchaseBatchSummary(pb, batches.filter(b => b.purchaseBatchId === pb.id), quebras, products));
  }, [purchaseBatches, batches, quebras, products, range, supplierFilter]);

  // Lets the owner look up any single stock entry at any time — by batch
  // number, supplier, or a product name inside that batch — regardless of
  // the date range or supplier filter above.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return purchaseBatches
      .map(pb => calculatePurchaseBatchSummary(pb, batches.filter(b => b.purchaseBatchId === pb.id), quebras, products))
      .filter(s =>
        s.purchaseBatch.batchNumber.toLowerCase().includes(q) ||
        s.purchaseBatch.supplier.name.toLowerCase().includes(q) ||
        s.lineItems.some(li => li.product?.name.toLowerCase().includes(q))
      )
      .sort((a, b) => b.purchaseBatch.date.localeCompare(a.purchaseBatch.date));
  }, [searchQuery, purchaseBatches, batches, quebras, products]);

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
    const c = concentrationInsight(t, t('reports.inventoryValuation.entityBatchesPlural'), summaries.map(s => ({ label: s.purchaseBatch.batchNumber, value: s.remainingEmbeddedProfit })), totalRemainingProfit);
    if (c) lines.push(c);
    if (sorted.length) {
      const top = sorted[0];
      lines.push(t('reports.batchPerformance.insightTopBatch', {
        batch: top.purchaseBatch.batchNumber,
        date: formatDate(top.purchaseBatch.date),
        supplier: top.purchaseBatch.supplier.name,
        value: formatCurrency(top.remainingEmbeddedProfit, currencySymbol),
      }));
    }
    lines.push(t('reports.batchPerformance.insightExcludesInitialCapital'));
    return lines;
  }, [summaries, totalRemainingProfit, sorted, currencySymbol, t]);

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.batchPerformance.title'),
      business?.name || 'Sabush',
      t('reports.batchPerformance.periodRange', { start: formatDate(range.startDate), end: formatDate(range.endDate) }),
      [
        { label: t('reports.batchPerformance.kpiBatchesInPeriod'), value: String(summaries.length) },
        { label: t('reports.batchPerformance.kpiTotalInvestment'), value: formatCurrency(totalInvestment, currencySymbol) },
        { label: t('reports.batchPerformance.kpiRemainingInventory'), value: formatCurrency(totalRemainingInventory, currencySymbol) },
        { label: t('reports.batchPerformance.kpiRemainingProfit'), value: formatCurrency(totalRemainingProfit, currencySymbol) },
      ],
      [
        {
          title: t('reports.batchPerformance.allBatches'),
          columns: [
            t('reports.batchPerformance.colBatch'), t('reports.batchPerformance.colDate'), t('reports.batchPerformance.colSupplier'),
            t('reports.batchPerformance.colInvestment'), t('reports.batchPerformance.colMarketValue'), t('reports.batchPerformance.colEmbeddedProfit'),
            t('reports.batchPerformance.colRemainingInventory'), t('reports.batchPerformance.colRemainingProfit'), t('reports.batchPerformance.colStatus'),
          ],
          rows: sorted.map(s => [
            s.purchaseBatch.batchNumber,
            formatDate(s.purchaseBatch.date),
            s.purchaseBatch.supplier.name,
            formatCurrency(s.totalInvestmentValue, currencySymbol),
            formatCurrency(s.totalMarketValue, currencySymbol),
            formatCurrency(s.totalEmbeddedProfit, currencySymbol),
            formatCurrency(s.remainingInvestmentValue, currencySymbol),
            formatCurrency(s.remainingEmbeddedProfit, currencySymbol),
            statusLabel(s.status),
          ]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.batchPerformance.title'),
      [
        { label: t('reports.batchPerformance.kpiBatchesInPeriod'), value: String(summaries.length) },
        { label: t('reports.batchPerformance.kpiTotalInvestment'), value: formatCurrency(totalInvestment, currencySymbol) },
        { label: t('reports.batchPerformance.kpiRemainingProfit'), value: formatCurrency(totalRemainingProfit, currencySymbol) },
      ],
      [
        {
          title: t('reports.batchPerformance.allBatches'),
          columns: [
            t('reports.batchPerformance.colBatch'), t('reports.batchPerformance.colDate'), t('reports.batchPerformance.colSupplier'),
            t('reports.batchPerformance.colInvestment'), t('reports.batchPerformance.colMarketValue'), t('reports.batchPerformance.colEmbeddedProfit'),
            t('reports.batchPerformance.colRemainingInventory'), t('reports.batchPerformance.colRemainingProfit'), t('reports.batchPerformance.colStatus'),
          ],
          rows: sorted.map(s => [
            s.purchaseBatch.batchNumber,
            s.purchaseBatch.date,
            s.purchaseBatch.supplier.name,
            s.totalInvestmentValue,
            s.totalMarketValue,
            s.totalEmbeddedProfit,
            s.remainingInvestmentValue,
            s.remainingEmbeddedProfit,
            statusLabel(s.status),
          ]),
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
        title={t('reports.batchPerformance.title')}
        description={t('reports.batchPerformance.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportSection title={t('reports.batchPerformance.searchTitle')} icon={Layers}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('reports.batchPerformance.searchPlaceholder')}
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#D4AF37]"
        />
        <p className="text-[10.5px] text-gray-500 mt-1.5">
          {t('reports.batchPerformance.searchHint')}
        </p>

        {searchResults !== null && (
          searchResults.length === 0 ? (
            <ReportEmptyState message={t('reports.batchPerformance.searchNoResults')} />
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="table-clean w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colBatch')}</th>
                    <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colDate')}</th>
                    <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colSupplier')}</th>
                    <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colProducts')}</th>
                    <th className="py-2 pr-2 font-semibold text-right">{t('reports.batchPerformance.colInvestment')}</th>
                    <th className="py-2 pr-2 font-semibold text-right">{t('reports.batchPerformance.colRemainingProfit')}</th>
                    <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map(s => (
                    <tr key={s.purchaseBatch.id}>
                      <td className="py-2 pr-2 font-bold text-gray-900">{s.purchaseBatch.batchNumber}</td>
                      <td className="py-2 pr-2 text-gray-600">{formatDate(s.purchaseBatch.date)}</td>
                      <td className="py-2 pr-2 text-gray-600">{s.purchaseBatch.supplier.name}</td>
                      <td className="py-2 pr-2 text-gray-600">{s.lineItems.map(li => li.product?.name).filter(Boolean).join(', ')}</td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(s.totalInvestmentValue, currencySymbol)}</td>
                      <td className={`py-2 pr-2 text-right type-number ${s.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(s.remainingEmbeddedProfit, currencySymbol)}</td>
                      <td className="py-2 pr-2">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">{statusLabel(s.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </ReportSection>

      <ReportFilterBar
        range={range}
        onStartDate={setStartDate}
        onEndDate={setEndDate}
        onPreset={applyPreset}
        extraFilters={
          suppliers.length > 0 ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('reports.batchPerformance.supplierLabel')}</label>
              <PillToggle
                value={supplierFilter}
                onChange={setSupplierFilter}
                options={[{ value: 'all', label: t('reports.batchPerformance.allSuppliers') }, ...suppliers.map(s => ({ value: s, label: s }))]}
              />
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ReportKpiCard icon={Layers} label={t('reports.batchPerformance.kpiBatchesInPeriod')} value={String(summaries.length)} />
        <ReportKpiCard icon={Boxes} label={t('reports.batchPerformance.kpiTotalInvestment')} value={formatCurrency(totalInvestment, currencySymbol)} />
        <ReportKpiCard icon={Gem} label={t('reports.batchPerformance.kpiRemainingInventory')} value={formatCurrency(totalRemainingInventory, currencySymbol)} />
        <ReportKpiCard icon={TrendingUp} label={t('reports.batchPerformance.kpiRemainingProfit')} value={formatCurrency(totalRemainingProfit, currencySymbol)} tone={totalRemainingProfit >= 0 ? 'positive' : 'negative'} />
      </div>

      <ReportSection
        title={t('reports.batchPerformance.remainingProfitByBatch')}
        icon={TrendingUp}
        right={
          <PillToggle
            value={sortMode}
            onChange={v => setSortMode(v as SortMode)}
            options={[
              { value: 'profit', label: t('reports.batchPerformance.sortHighestProfit') },
              { value: 'investment', label: t('reports.batchPerformance.sortHighestInvestment') },
              { value: 'newest', label: t('reports.batchPerformance.sortNewest') },
              { value: 'oldest', label: t('reports.batchPerformance.sortOldest') },
            ]}
          />
        }
      >
        {sorted.length === 0 ? (
          <ReportEmptyState message={t('reports.batchPerformance.noBatchesInPeriod')} />
        ) : (
          <BarChartHorizontal
            currencySymbol={currencySymbol}
            data={sorted.slice(0, 12).map(s => ({ label: `${s.purchaseBatch.batchNumber} · ${s.purchaseBatch.supplier.name}`, value: s.remainingEmbeddedProfit }))}
          />
        )}
      </ReportSection>

      <ReportSection title={t('reports.batchPerformance.allBatches')} icon={Layers}>
        {sorted.length === 0 ? (
          <ReportEmptyState message={t('reports.batchPerformance.noBatchesInPeriod')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colBatch')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colDate')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colSupplier')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.batchPerformance.colInvestment')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.batchPerformance.colRemainingInventory')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.batchPerformance.colRemainingProfit')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.batchPerformance.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.purchaseBatch.id}>
                    <td className="py-2 pr-2 font-bold text-gray-900">{s.purchaseBatch.batchNumber}</td>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(s.purchaseBatch.date)}</td>
                    <td className="py-2 pr-2 text-gray-600">{s.purchaseBatch.supplier.name}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(s.totalInvestmentValue, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(s.remainingInvestmentValue, currencySymbol)}</td>
                    <td className={`py-2 pr-2 text-right type-number ${s.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(s.remainingEmbeddedProfit, currencySymbol)}</td>
                    <td className="py-2 pr-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">{statusLabel(s.status)}</span>
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
