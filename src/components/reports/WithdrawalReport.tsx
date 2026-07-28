import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { isDateInRange } from '../../utils/calculations';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, PillToggle, ReportEmptyState } from './shared/ReportUI';
import { ReportFilterBar, useDateRange } from './shared/ReportFilterBar';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { concentrationInsight } from './shared/reportInsights';
import { DonutChart, LineChartSimple } from './charts/MiniCharts';
import { HandCoins, CalendarDays, Tag } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GroupBy = 'month' | 'reason';

export const WithdrawalReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { business, currencySymbol, withdrawals, deleteWithdrawal } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
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

  const unspecified = t('reports.common.unspecified');

  const filtered = useMemo(() => withdrawals.filter(w => isDateInRange(w.date, range.startDate, range.endDate)), [withdrawals, range]);
  const total = filtered.reduce((s, w) => s + Number(w.amount || 0), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(w => {
      const key = groupBy === 'reason' ? (w.reason || unspecified) : w.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + Number(w.amount || 0));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: groupBy === 'month' ? monthLabel(key + '-01') : key, value }))
      .sort((a, b) => (groupBy === 'reason' ? b.value - a.value : a.key.localeCompare(b.key)));
  }, [filtered, groupBy, unspecified]);

  const topReason = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(w => {
      const key = w.reason || unspecified;
      map.set(key, (map.get(key) || 0) + Number(w.amount || 0));
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return arr.length ? { label: arr[0][0], value: arr[0][1] } : null;
  }, [filtered, unspecified]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (topReason && total > 0) {
      lines.push(t('reports.withdrawals.insightTopReason', { label: topReason.label, pct: ((topReason.value / total) * 100).toFixed(0) }));
    }
    const c = concentrationInsight(t, t('reports.withdrawals.groupReason').toLowerCase(), grouped.map(g => ({ label: g.label, value: g.value })), total);
    if (groupBy === 'reason' && c) lines.push(c);
    return lines;
  }, [topReason, total, grouped, groupBy, t]);

  const groupLabel = groupBy === 'month' ? t('reports.withdrawals.groupMonth') : t('reports.withdrawals.groupReason');

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.withdrawals.title'),
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: t('reports.withdrawals.kpiTotalFull'), value: formatCurrency(total, currencySymbol) },
        { label: t('reports.withdrawals.kpiTopReason'), value: topReason ? `${topReason.label} (${formatCurrency(topReason.value, currencySymbol)})` : '—' },
        { label: t('reports.withdrawals.kpiCountFull'), value: String(filtered.length) },
      ],
      [
        { title: t('reports.withdrawals.sectionByGroupTitle', { group: groupLabel }), columns: [groupLabel, t('reports.common.value')], rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]) },
        { title: t('reports.withdrawals.allWithdrawalsTitle'), columns: [t('reports.common.dateCol'), t('reports.common.reasonCol'), t('reports.common.value')], rows: filtered.map(w => [formatDate(w.date), w.reason || unspecified, formatCurrency(w.amount, currencySymbol)]) },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.withdrawals.title'),
      [{ label: t('reports.withdrawals.kpiTotalFull'), value: formatCurrency(total, currencySymbol) }],
      [
        { title: t('reports.withdrawals.sectionByGroupTitle', { group: groupLabel }), columns: [groupLabel, t('reports.common.value')], rows: grouped.map(g => [g.label, g.value]) },
        { title: t('reports.withdrawals.allWithdrawalsTitle'), columns: [t('reports.common.dateCol'), t('reports.common.reasonCol'), t('reports.common.value')], rows: filtered.map(w => [w.date, w.reason || unspecified, w.amount]) },
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
        title={t('reports.withdrawals.title')}
        description={t('reports.withdrawals.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <ReportKpiCard icon={HandCoins} label={t('reports.withdrawals.kpiTotal')} value={formatCurrency(total, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Tag} label={t('reports.withdrawals.kpiTopReason')} value={topReason ? formatCurrency(topReason.value, currencySymbol) : '—'} sub={topReason?.label} />
        <ReportKpiCard icon={CalendarDays} label={t('reports.withdrawals.kpiCount')} value={String(filtered.length)} />
      </div>

      <ReportSection
        title={t('reports.withdrawals.sectionByGroupTitle', { group: groupLabel })}
        icon={Tag}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'month', label: t('reports.withdrawals.groupMonth') },
              { value: 'reason', label: t('reports.withdrawals.groupReason') },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message={t('reports.withdrawals.emptyMessage')} />
        ) : groupBy === 'reason' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#D97706" />
        )}
      </ReportSection>

      <ReportSection title={t('reports.withdrawals.timelineTitle', { count: filtered.length })} icon={CalendarDays}>
        {filtered.length === 0 ? (
          <ReportEmptyState message={t('reports.withdrawals.emptyMessage')} />
        ) : (
          <div className="space-y-2">
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(w => (
              <div key={w.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">{w.reason || unspecified}</span>
                  <span className="text-[11px] text-gray-500">{formatDate(w.date)}{w.notes ? ` · ${w.notes}` : ''}</span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="type-number text-rose-600 text-sm">{formatCurrency(w.amount, currencySymbol)}</span>
                  <button onClick={() => deleteWithdrawal(w.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    {t('reports.common.delete')}
                  </button>
                </div>
                <span className="type-number text-rose-600 text-sm hidden report-print-only">{formatCurrency(w.amount, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
