import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, ReportEmptyState } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { LineChartSimple } from './charts/MiniCharts';
import { TrendingUp, TrendingDown, Landmark, Gem, History } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const CapitalGrowthReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const {
    business, currencySymbol, closings,
    hasInitialStockCount, initialCapitalValue, initialStockCount,
    businessWorth, capitalGrowth, capitalGrowthPct,
    businessWorthSnapshots,
  } = useApp();

  // [Capital Inicial Retirement — Implementation Authorization Increment 7,
  // Amendment 2] Label-selection signal only — identical one-line derivation
  // DashboardView.tsx already uses (line 200). Does not affect
  // `businessWorth` or any other figure/calculation.
  const hasActiveBusinessWorthSnapshot = businessWorthSnapshots.some((s) => s.status === 'active');

  const timeline = useMemo(() => {
    const points: { date: string; label: string; value: number }[] = [];
    if (hasInitialStockCount && initialStockCount) {
      points.push({ date: initialStockCount.date, label: t('reports.capitalGrowth.timelineInitialCapitalLabel'), value: initialCapitalValue });
    }
    [...closings]
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .forEach(c => {
        points.push({ date: c.endDate, label: c.periodLabel, value: c.businessWorthAtClose });
      });
    points.push({ date: new Date().toISOString().slice(0, 10), label: t('reports.capitalGrowth.timelineTodayLabel'), value: businessWorth });
    return points;
  }, [hasInitialStockCount, initialStockCount, initialCapitalValue, closings, businessWorth, t]);

  const monthlyClosings = useMemo(
    () => [...closings].filter(c => c.periodType === 'monthly').sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [closings]
  );
  const yearlyClosings = useMemo(
    () => [...closings].filter(c => c.periodType === 'yearly').sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [closings]
  );

  const lastMonthlyGrowth = useMemo(() => {
    if (monthlyClosings.length < 1) return null;
    const last = monthlyClosings[monthlyClosings.length - 1];
    const prevValue = monthlyClosings.length >= 2 ? monthlyClosings[monthlyClosings.length - 2].businessWorthAtClose : initialCapitalValue;
    return { label: last.periodLabel, current: last.businessWorthAtClose, previous: prevValue };
  }, [monthlyClosings, initialCapitalValue]);

  const lastYearlyGrowth = useMemo(() => {
    if (yearlyClosings.length < 1) return null;
    const last = yearlyClosings[yearlyClosings.length - 1];
    const prevValue = yearlyClosings.length >= 2 ? yearlyClosings[yearlyClosings.length - 2].businessWorthAtClose : initialCapitalValue;
    return { label: last.periodLabel, current: last.businessWorthAtClose, previous: prevValue };
  }, [yearlyClosings, initialCapitalValue]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (!hasInitialStockCount) {
      lines.push(t('reports.capitalGrowth.insightNoInitialCount'));
      return lines;
    }
    lines.push(
      capitalGrowth >= 0
        ? t('reports.capitalGrowth.insightGrew', { amount: formatCurrency(capitalGrowth, currencySymbol), pct: capitalGrowthPct.toFixed(1) })
        : t('reports.capitalGrowth.insightShrank', { amount: formatCurrency(Math.abs(capitalGrowth), currencySymbol), pct: capitalGrowthPct.toFixed(1) })
    );
    if (closings.length === 0) {
      lines.push(t('reports.capitalGrowth.insightNoClosings'));
    } else if (lastMonthlyGrowth) {
      const change = lastMonthlyGrowth.previous ? ((lastMonthlyGrowth.current - lastMonthlyGrowth.previous) / Math.abs(lastMonthlyGrowth.previous)) * 100 : 0;
      lines.push(
        change >= 0
          ? t('reports.capitalGrowth.insightLastMonthlyChangeUp', { period: lastMonthlyGrowth.label, pct: Math.abs(change).toFixed(1) })
          : t('reports.capitalGrowth.insightLastMonthlyChangeDown', { period: lastMonthlyGrowth.label, pct: Math.abs(change).toFixed(1) })
      );
    }
    return lines;
  }, [hasInitialStockCount, capitalGrowth, capitalGrowthPct, currencySymbol, closings, lastMonthlyGrowth, t]);

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.capitalGrowth.title'),
      business?.name || 'Sabush',
      t('reports.capitalGrowth.evolutionSince'),
      [
        { label: t('reports.capitalGrowth.kpiInitialCapital'), value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : t('reports.common.notDefined') },
        { label: t(hasActiveBusinessWorthSnapshot ? 'reports.capitalGrowth.kpiCurrentCapitalFull' : 'reports.capitalGrowth.kpiCurrentCapitalFullEstimated'), value: formatCurrency(businessWorth, currencySymbol) },
        { label: t('reports.capitalGrowth.kpiIncrease'), value: formatCurrency(capitalGrowth, currencySymbol) },
        { label: t('reports.capitalGrowth.kpiGrowthPct'), value: `${capitalGrowthPct.toFixed(1)}%` },
      ],
      [
        {
          title: t('reports.capitalGrowth.timelineTitlePdf'),
          columns: [t('reports.capitalGrowth.colDate'), t('reports.capitalGrowth.colPeriod'), t('reports.capitalGrowth.colBusinessWorth')],
          rows: timeline.map(p => [formatDate(p.date), p.label, formatCurrency(p.value, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.capitalGrowth.title'),
      [
        { label: t('reports.capitalGrowth.kpiInitialCapital'), value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : t('reports.common.notDefined') },
        { label: t(hasActiveBusinessWorthSnapshot ? 'reports.capitalGrowth.kpiCurrentCapital' : 'reports.capitalGrowth.kpiCurrentCapitalEstimated'), value: formatCurrency(businessWorth, currencySymbol) },
        { label: t('reports.capitalGrowth.kpiIncrease'), value: formatCurrency(capitalGrowth, currencySymbol) },
        { label: t('reports.capitalGrowth.kpiGrowthPct'), value: `${capitalGrowthPct.toFixed(1)}%` },
      ],
      [
        {
          title: t('reports.capitalGrowth.timelineTitleExcel'),
          columns: [t('reports.capitalGrowth.colDate'), t('reports.capitalGrowth.colPeriod'), t('reports.capitalGrowth.colBusinessWorth')],
          rows: timeline.map(p => [p.date, p.label, p.value]),
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
        title={t('reports.capitalGrowth.title')}
        description={t('reports.capitalGrowth.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ReportKpiCard icon={Landmark} label={t('reports.capitalGrowth.kpiInitialCapital')} value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : '—'} />
        <ReportKpiCard icon={Gem} label={t(hasActiveBusinessWorthSnapshot ? 'reports.capitalGrowth.kpiCurrentCapital' : 'reports.capitalGrowth.kpiCurrentCapitalEstimated')} value={formatCurrency(businessWorth, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={capitalGrowth >= 0 ? TrendingUp : TrendingDown} label={t('reports.capitalGrowth.kpiIncrease')} value={formatCurrency(capitalGrowth, currencySymbol)} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={History} label={t('reports.capitalGrowth.kpiGrowthPct')} value={`${capitalGrowthPct >= 0 ? '+' : ''}${capitalGrowthPct.toFixed(1)}%`} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
      </div>

      {lastMonthlyGrowth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ReportKpiCard
            icon={TrendingUp}
            label={t('reports.capitalGrowth.monthlyGrowthLabel', { period: lastMonthlyGrowth.label })}
            value={formatCurrency(lastMonthlyGrowth.current - lastMonthlyGrowth.previous, currencySymbol)}
            tone={lastMonthlyGrowth.current - lastMonthlyGrowth.previous >= 0 ? 'positive' : 'negative'}
          />
          {lastYearlyGrowth && (
            <ReportKpiCard
              icon={TrendingUp}
              label={t('reports.capitalGrowth.yearlyGrowthLabel', { period: lastYearlyGrowth.label })}
              value={formatCurrency(lastYearlyGrowth.current - lastYearlyGrowth.previous, currencySymbol)}
              tone={lastYearlyGrowth.current - lastYearlyGrowth.previous >= 0 ? 'positive' : 'negative'}
            />
          )}
        </div>
      )}

      <ReportSection title={t('reports.capitalGrowth.businessWorthTimelineTitle')} icon={History}>
        {timeline.length < 2 ? (
          <ReportEmptyState message={t('reports.capitalGrowth.noTimelineData')} />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={timeline.map(p => ({ label: p.label, value: p.value }))} />
        )}
      </ReportSection>

      <ReportSection title={t('reports.capitalGrowth.closingsHistoryTitle')} icon={Landmark}>
        {closings.length === 0 ? (
          <ReportEmptyState message={t('reports.capitalGrowth.noClosings')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{t('reports.capitalGrowth.colPeriod')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.capitalGrowth.colClosingDate')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.capitalGrowth.colEmbeddedProfit')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.capitalGrowth.colExpenses')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.capitalGrowth.colWithdrawals')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.capitalGrowth.colBusinessWorth')}</th>
                </tr>
              </thead>
              <tbody>
                {[...closings].sort((a, b) => b.endDate.localeCompare(a.endDate)).map(c => (
                  <tr key={c.id}>
                    <td className="py-2 pr-2 font-bold text-gray-900">{c.periodLabel}</td>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(c.endDate)}</td>
                    <td className={`py-2 pr-2 text-right font-mono ${c.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(c.totalEmbeddedProfit, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-rose-600">{formatCurrency(c.totalExpenses, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-rose-600">{formatCurrency(c.totalWithdrawals, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right type-number text-gray-900">{formatCurrency(c.businessWorthAtClose, currencySymbol)}</td>
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
