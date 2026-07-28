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
import { Receipt, TrendingDown, Tag, CalendarDays } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GroupBy = 'category' | 'month' | 'year';

export const ExpenseReport: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { business, currencySymbol, expenses, deleteExpense } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
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

  const generalCategory = t('reports.common.generalCategory');

  const filtered = useMemo(() => expenses.filter(e => isDateInRange(e.date, range.startDate, range.endDate)), [expenses, range]);

  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const monthsSpanned = useMemo(() => {
    const set = new Set(filtered.map(e => e.date.slice(0, 7)));
    return set.size || 1;
  }, [filtered]);
  const avgMonthly = total / monthsSpanned;

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = groupBy === 'category' ? (e.category || generalCategory) : groupBy === 'month' ? e.date.slice(0, 7) : e.date.slice(0, 4);
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        label: groupBy === 'month' ? monthLabel(key + '-01') : key,
        value,
      }))
      .sort((a, b) => (groupBy === 'category' ? b.value - a.value : a.key.localeCompare(b.key)));
  }, [filtered, groupBy, generalCategory]);

  const largestCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = e.category || generalCategory;
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return arr.length ? { label: arr[0][0], value: arr[0][1] } : null;
  }, [filtered, generalCategory]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = e.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ label: monthLabel(key + '-01'), value }));
  }, [filtered]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (largestCategory && total > 0) {
      lines.push(t('reports.expenses.insightTopCategory', { label: largestCategory.label, pct: ((largestCategory.value / total) * 100).toFixed(0) }));
    }
    if (monthlyTrend.length >= 2) {
      const last = monthlyTrend[monthlyTrend.length - 1];
      const prev = monthlyTrend[monthlyTrend.length - 2];
      const change = prev.value ? ((last.value - prev.value) / prev.value) * 100 : null;
      if (change !== null) {
        lines.push(
          change >= 0
            ? t('reports.expenses.insightMonthlyChangeUp', { month: last.label, pct: Math.abs(change).toFixed(1), prevMonth: prev.label })
            : t('reports.expenses.insightMonthlyChangeDown', { month: last.label, pct: Math.abs(change).toFixed(1), prevMonth: prev.label })
        );
      }
    }
    const c = concentrationInsight(t, t('reports.expenses.groupCategory').toLowerCase(), grouped.map(g => ({ label: g.label, value: g.value })), total);
    if (groupBy === 'category' && c) lines.push(c);
    return lines;
  }, [largestCategory, total, monthlyTrend, grouped, groupBy, t]);

  const groupLabel = groupBy === 'category' ? t('reports.expenses.groupCategory') : groupBy === 'month' ? t('reports.expenses.groupMonth') : t('reports.expenses.groupYear');

  const handleExportPdf = () => {
    exportReportPdf(
      t('reports.expenses.title'),
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: t('reports.expenses.kpiTotalFull'), value: formatCurrency(total, currencySymbol) },
        { label: t('reports.expenses.kpiAvgMonthly'), value: formatCurrency(avgMonthly, currencySymbol) },
        { label: t('reports.expenses.kpiLargestCategory'), value: largestCategory ? `${largestCategory.label} (${formatCurrency(largestCategory.value, currencySymbol)})` : '—' },
        { label: t('reports.expenses.kpiCountFull'), value: String(filtered.length) },
      ],
      [
        {
          title: t('reports.expenses.sectionByGroupTitle', { group: groupLabel }),
          columns: [groupLabel, t('reports.common.value')],
          rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]),
        },
        {
          title: t('reports.expenses.allExpensesTitle'),
          columns: [t('reports.common.dateCol'), t('reports.common.descriptionCol'), t('reports.common.categoryCol'), t('reports.common.value')],
          rows: filtered.map(e => [formatDate(e.date), e.description, e.category || generalCategory, formatCurrency(e.amount, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('reports.expenses.title'),
      [
        { label: t('reports.expenses.kpiTotalFull'), value: formatCurrency(total, currencySymbol) },
        { label: t('reports.expenses.kpiAvgMonthly'), value: formatCurrency(avgMonthly, currencySymbol) },
      ],
      [
        { title: t('reports.expenses.sectionByGroupTitle', { group: groupLabel }), columns: [groupLabel, t('reports.common.value')], rows: grouped.map(g => [g.label, g.value]) },
        { title: t('reports.expenses.allExpensesTitle'), columns: [t('reports.common.dateCol'), t('reports.common.descriptionCol'), t('reports.common.categoryCol'), t('reports.common.value')], rows: filtered.map(e => [e.date, e.description, e.category || generalCategory, e.amount]) },
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
        title={t('reports.expenses.title')}
        description={t('reports.expenses.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ReportKpiCard icon={Receipt} label={t('reports.expenses.kpiTotal')} value={formatCurrency(total, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={CalendarDays} label={t('reports.expenses.kpiAvgMonthly')} value={formatCurrency(avgMonthly, currencySymbol)} />
        <ReportKpiCard icon={Tag} label={t('reports.expenses.kpiLargestCategory')} value={largestCategory ? formatCurrency(largestCategory.value, currencySymbol) : '—'} sub={largestCategory?.label} />
        <ReportKpiCard icon={TrendingDown} label={t('reports.expenses.kpiCount')} value={String(filtered.length)} />
      </div>

      <ReportSection
        title={t('reports.expenses.sectionByGroupTitle', { group: groupLabel })}
        icon={Tag}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'category', label: t('reports.expenses.groupCategory') },
              { value: 'month', label: t('reports.expenses.groupMonth') },
              { value: 'year', label: t('reports.expenses.groupYear') },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message={t('reports.expenses.emptyMessage')} />
        ) : groupBy === 'category' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        )}
      </ReportSection>

      <ReportSection title={t('reports.expenses.allExpensesCount', { count: filtered.length })} icon={Receipt}>
        {filtered.length === 0 ? (
          <ReportEmptyState message={t('reports.expenses.emptyMessage')} />
        ) : (
          <div className="space-y-2">
            {filtered.map(exp => (
              <div key={exp.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{exp.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0B1F3A]/[0.06] text-[#0B1F3A] border border-[#0B1F3A]/20 text-[10px] font-semibold">
                      {exp.category || generalCategory}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block">{formatDate(exp.date)}</span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="type-number text-rose-600 text-sm">{formatCurrency(exp.amount, currencySymbol)}</span>
                  <button onClick={() => deleteExpense(exp.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    {t('reports.common.delete')}
                  </button>
                </div>
                <span className="type-number text-rose-600 text-sm hidden report-print-only">{formatCurrency(exp.amount, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
