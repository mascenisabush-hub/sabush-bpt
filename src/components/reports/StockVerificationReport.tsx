import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, ReportEmptyState, ExpandChevron } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { ClipboardCheck, Boxes, TrendingUp, TrendingDown } from 'lucide-react';
import { StockCount, StockCountType } from '../../types';

interface Props {
  onBack: () => void;
}

interface ProductDiff {
  productId: string;
  productName: string;
  before: number;
  after: number;
  diffQty: number;
  diffValue: number;
}

function buildDiff(current: StockCount, previous: StockCount): ProductDiff[] {
  const map = new Map<string, ProductDiff>();
  previous.items.forEach(item => {
    map.set(item.productId, { productId: item.productId, productName: item.productName, before: item.quantity, after: 0, diffQty: 0, diffValue: 0 });
  });
  current.items.forEach(item => {
    const existing = map.get(item.productId) || { productId: item.productId, productName: item.productName, before: 0, after: 0, diffQty: 0, diffValue: 0 };
    existing.after = item.quantity;
    existing.productName = item.productName;
    map.set(item.productId, existing);
  });
  const prevValueByProduct = new Map(previous.items.map(i => [i.productId, i.totalValue]));
  const currValueByProduct = new Map(current.items.map(i => [i.productId, i.totalValue]));
  return Array.from(map.values())
    .map(d => ({
      ...d,
      diffQty: d.after - d.before,
      diffValue: (currValueByProduct.get(d.productId) || 0) - (prevValueByProduct.get(d.productId) || 0),
    }))
    .sort((a, b) => Math.abs(b.diffValue) - Math.abs(a.diffValue));
}

export const StockVerificationReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { business, currencySymbol, stockCounts } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const TYPE_LABELS: Record<StockCountType, string> = {
    initial: t('reports.stockVerification.typeInitial'),
    weekly: t('reports.stockVerification.typeWeekly'),
    monthly: t('reports.stockVerification.typeMonthly'),
    quarterly: t('reports.stockVerification.typeQuarterly'),
    yearly: t('reports.stockVerification.typeYearly'),
    custom: t('reports.stockVerification.typeCustom'),
  };

  const sortedCounts = useMemo(() => [...stockCounts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)), [stockCounts]);

  const verifications = useMemo(() => {
    return sortedCounts.slice(1).map((count, idx) => {
      const previous = sortedCounts[idx]; // idx corresponds to i-1 since we sliced from 1
      const diffs = buildDiff(count, previous);
      const productsAdjusted = diffs.filter(d => d.diffQty !== 0).length;
      const financialImpact = count.totalValue - previous.totalValue;
      return { count, previous, diffs, productsAdjusted, financialImpact };
    }).reverse(); // most recent first
  }, [sortedCounts]);

  const latest = verifications[0] || null;

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (stockCounts.length === 0) {
      lines.push(t('reports.stockVerification.insightNoCounts'));
      return lines;
    }
    if (stockCounts.length === 1) {
      lines.push(t('reports.stockVerification.insightOnlyInitial'));
      return lines;
    }
    if (latest) {
      lines.push(
        t('reports.stockVerification.insightLatestAdjusted', {
          date: formatDate(latest.count.date),
          adjusted: latest.productsAdjusted,
          total: latest.count.items.length,
        })
      );
      lines.push(
        latest.financialImpact >= 0
          ? t('reports.stockVerification.insightValueUp', { amount: formatCurrency(latest.financialImpact, currencySymbol) })
          : t('reports.stockVerification.insightValueDown', { amount: formatCurrency(Math.abs(latest.financialImpact), currencySymbol) })
      );
    }
    return lines;
  }, [stockCounts, latest, currencySymbol, t]);

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.stockVerification.title'),
      business?.name || 'Sabush',
      latest ? `${t('reports.stockVerification.colDate')}: ${formatDate(latest.count.date)}` : '',
      latest
        ? [
            { label: t('reports.stockVerification.colDate'), value: formatDate(latest.count.date) },
            { label: t('reports.stockVerification.colProductsCounted'), value: String(latest.count.items.length) },
            { label: t('reports.stockVerification.colProductsAdjusted'), value: String(latest.productsAdjusted) },
            { label: t('reports.stockVerification.kpiBefore'), value: formatCurrency(latest.previous.totalValue, currencySymbol) },
            { label: t('reports.stockVerification.kpiAfter'), value: formatCurrency(latest.count.totalValue, currencySymbol) },
            { label: t('reports.stockVerification.kpiFinancialImpact'), value: formatCurrency(latest.financialImpact, currencySymbol) },
          ]
        : [],
      [
        {
          title: t('reports.stockVerification.historyTitle', { count: verifications.length }),
          columns: [
            t('reports.stockVerification.colDate'), t('reports.stockVerification.colType'),
            t('reports.stockVerification.colProductsCounted'), t('reports.stockVerification.colProductsAdjusted'),
            t('reports.stockVerification.colBefore'), t('reports.stockVerification.colAfter'), t('reports.stockVerification.colImpact'),
          ],
          rows: verifications.map(v => [
            formatDate(v.count.date),
            TYPE_LABELS[v.count.type],
            v.count.items.length,
            v.productsAdjusted,
            formatCurrency(v.previous.totalValue, currencySymbol),
            formatCurrency(v.count.totalValue, currencySymbol),
            formatCurrency(v.financialImpact, currencySymbol),
          ]),
        },
        ...(latest
          ? [
              {
                title: t('reports.stockVerification.diffTableTitle', { date: formatDate(latest.count.date) }),
                columns: [
                  t('reports.stockVerification.colProduct'), t('reports.stockVerification.colBefore'),
                  t('reports.stockVerification.colAfter'), t('reports.stockVerification.colDiffQty'), t('reports.stockVerification.colDiffValue'),
                ],
                rows: latest.diffs.map(d => [d.productName, d.before, d.after, d.diffQty, formatCurrency(d.diffValue, currencySymbol)]),
              },
            ]
          : []),
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.stockVerification.title'),
      latest
        ? [
            { label: t('reports.stockVerification.colProductsAdjusted'), value: String(latest.productsAdjusted) },
            { label: t('reports.stockVerification.kpiFinancialImpact'), value: formatCurrency(latest.financialImpact, currencySymbol) },
          ]
        : [],
      [
        {
          title: t('reports.stockVerification.historyTitle', { count: verifications.length }),
          columns: [
            t('reports.stockVerification.colDate'), t('reports.stockVerification.colType'),
            t('reports.stockVerification.colProductsCounted'), t('reports.stockVerification.colProductsAdjusted'),
            t('reports.stockVerification.colBefore'), t('reports.stockVerification.colAfter'), t('reports.stockVerification.colImpact'),
          ],
          rows: verifications.map(v => [formatDate(v.count.date), TYPE_LABELS[v.count.type], v.count.items.length, v.productsAdjusted, v.previous.totalValue, v.count.totalValue, v.financialImpact]),
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
        title={t('reports.stockVerification.title')}
        description={t('reports.stockVerification.description')}
        onBack={onBack}
        onExportPdf={verifications.length ? handleExportPdf : undefined}
        onExportExcel={verifications.length ? handleExportExcel : undefined}
        onPrint={verifications.length ? printCurrentReport : undefined}
      />

      <InsightBanner insights={insights} />

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <ReportKpiCard icon={Boxes} label={t('reports.stockVerification.kpiBefore')} value={formatCurrency(latest.previous.totalValue, currencySymbol)} />
          <ReportKpiCard icon={Boxes} label={t('reports.stockVerification.kpiAfter')} value={formatCurrency(latest.count.totalValue, currencySymbol)} tone="accent" />
          <ReportKpiCard
            icon={latest.financialImpact >= 0 ? TrendingUp : TrendingDown}
            label={t('reports.stockVerification.kpiFinancialImpact')}
            value={formatCurrency(latest.financialImpact, currencySymbol)}
            tone={latest.financialImpact >= 0 ? 'positive' : 'negative'}
          />
          <ReportKpiCard icon={ClipboardCheck} label={t('reports.stockVerification.kpiProductsAdjusted')} value={`${latest.productsAdjusted} / ${latest.count.items.length}`} />
        </div>
      )}

      <ReportSection title={t('reports.stockVerification.historyTitle', { count: verifications.length })} icon={ClipboardCheck}>
        {verifications.length === 0 ? (
          <ReportEmptyState message={stockCounts.length === 0 ? t('reports.stockVerification.noStockCountsMessage') : t('reports.stockVerification.noComparisonMessage')} />
        ) : (
          <div className="space-y-3">
            {verifications.map(v => {
              const isExpanded = expandedId === v.count.id;
              return (
                <div key={v.count.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : v.count.id)} className="w-full flex items-center justify-between text-left">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">
                        {v.count.label || TYPE_LABELS[v.count.type]} — {formatDate(v.count.date)}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {t('reports.stockVerification.itemsCountedLabel', { items: v.count.items.length, adjusted: v.productsAdjusted })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono font-bold text-sm ${v.financialImpact >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(v.financialImpact, currencySymbol)}
                      </span>
                      <ExpandChevron expanded={isExpanded} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto pt-2 border-t border-gray-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="py-2 pr-2 font-semibold">{t('reports.stockVerification.colProduct')}</th>
                            <th className="py-2 pr-2 font-semibold text-right">{t('reports.stockVerification.colBefore')}</th>
                            <th className="py-2 pr-2 font-semibold text-right">{t('reports.stockVerification.colAfter')}</th>
                            <th className="py-2 pr-2 font-semibold text-right">{t('reports.stockVerification.colDiffQty')}</th>
                            <th className="py-2 pr-2 font-semibold text-right">{t('reports.stockVerification.colDiffValue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.diffs.map(d => (
                            <tr key={d.productId} className="border-b border-gray-100">
                              <td className="py-2 pr-2 font-semibold text-gray-800">{d.productName}</td>
                              <td className="py-2 pr-2 text-right font-mono text-gray-600">{d.before}</td>
                              <td className="py-2 pr-2 text-right font-mono text-gray-600">{d.after}</td>
                              <td className={`py-2 pr-2 text-right font-mono font-bold ${d.diffQty === 0 ? 'text-gray-400' : d.diffQty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {d.diffQty > 0 ? '+' : ''}{d.diffQty}
                              </td>
                              <td className={`py-2 pr-2 text-right font-mono font-bold ${d.diffValue === 0 ? 'text-gray-400' : d.diffValue > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(d.diffValue, currencySymbol)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
