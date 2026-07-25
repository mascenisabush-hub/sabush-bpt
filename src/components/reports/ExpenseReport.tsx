import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
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

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

export const ExpenseReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, expenses, deleteExpense } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();

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
      const key = groupBy === 'category' ? (e.category || 'Geral') : groupBy === 'month' ? e.date.slice(0, 7) : e.date.slice(0, 4);
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        label: groupBy === 'month' ? monthLabel(key + '-01') : key,
        value,
      }))
      .sort((a, b) => (groupBy === 'category' ? b.value - a.value : a.key.localeCompare(b.key)));
  }, [filtered, groupBy]);

  const largestCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = e.category || 'Geral';
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return arr.length ? { label: arr[0][0], value: arr[0][1] } : null;
  }, [filtered]);

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
      lines.push(`"${largestCategory.label}" é a maior categoria de despesa, representando ${((largestCategory.value / total) * 100).toFixed(0)}% do total.`);
    }
    if (monthlyTrend.length >= 2) {
      const last = monthlyTrend[monthlyTrend.length - 1];
      const prev = monthlyTrend[monthlyTrend.length - 2];
      const change = prev.value ? ((last.value - prev.value) / prev.value) * 100 : null;
      if (change !== null) {
        lines.push(`As despesas em ${last.label} ${change >= 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(change).toFixed(1)}% em relação a ${prev.label}.`);
      }
    }
    const c = concentrationInsight('categorias', grouped.map(g => ({ label: g.label, value: g.value })), total);
    if (groupBy === 'category' && c) lines.push(c);
    return lines;
  }, [largestCategory, total, monthlyTrend, grouped, groupBy]);

  const groupLabel = groupBy === 'category' ? 'Categoria' : groupBy === 'month' ? 'Mês' : 'Ano';

  const handleExportPdf = () => {
    exportReportPdf(
      'Relatório de Despesas',
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: 'Despesas Totais', value: formatCurrency(total, currencySymbol) },
        { label: 'Média Mensal', value: formatCurrency(avgMonthly, currencySymbol) },
        { label: 'Maior Categoria', value: largestCategory ? `${largestCategory.label} (${formatCurrency(largestCategory.value, currencySymbol)})` : '—' },
        { label: 'Número de Despesas', value: String(filtered.length) },
      ],
      [
        {
          title: `Por ${groupLabel}`,
          columns: [groupLabel, 'Valor'],
          rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]),
        },
        {
          title: 'Todas as Despesas',
          columns: ['Data', 'Descrição', 'Categoria', 'Valor'],
          rows: filtered.map(e => [formatDate(e.date), e.description, e.category || 'Geral', formatCurrency(e.amount, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Relatório de Despesas',
      [
        { label: 'Despesas Totais', value: formatCurrency(total, currencySymbol) },
        { label: 'Média Mensal', value: formatCurrency(avgMonthly, currencySymbol) },
      ],
      [
        { title: `Por ${groupLabel}`, columns: [groupLabel, 'Valor'], rows: grouped.map(g => [g.label, g.value]) },
        { title: 'Todas as Despesas', columns: ['Data', 'Descrição', 'Categoria', 'Valor'], rows: filtered.map(e => [e.date, e.description, e.category || 'Geral', e.amount]) },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Relatório de Despesas"
        description="Para onde vai o dinheiro do negócio."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Receipt} label="Despesas Totais" value={formatCurrency(total, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={CalendarDays} label="Média Mensal" value={formatCurrency(avgMonthly, currencySymbol)} />
        <ReportKpiCard icon={Tag} label="Maior Categoria" value={largestCategory ? formatCurrency(largestCategory.value, currencySymbol) : '—'} sub={largestCategory?.label} />
        <ReportKpiCard icon={TrendingDown} label="Nº de Despesas" value={String(filtered.length)} />
      </div>

      <ReportSection
        title={`Despesas por ${groupLabel}`}
        icon={Tag}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'category', label: 'Categoria' },
              { value: 'month', label: 'Mês' },
              { value: 'year', label: 'Ano' },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message="Nenhuma despesa registada neste período." />
        ) : groupBy === 'category' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#E11D48" />
        )}
      </ReportSection>

      <ReportSection title={`Todas as Despesas (${filtered.length})`} icon={Receipt}>
        {filtered.length === 0 ? (
          <ReportEmptyState message="Nenhuma despesa registada neste período." />
        ) : (
          <div className="space-y-2">
            {filtered.map(exp => (
              <div key={exp.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{exp.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-500/30 text-[10px] font-semibold">
                      {exp.category || 'Geral'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block">{formatDate(exp.date)}</span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="font-mono font-bold text-rose-600 text-sm">{formatCurrency(exp.amount, currencySymbol)}</span>
                  <button onClick={() => deleteExpense(exp.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    Eliminar
                  </button>
                </div>
                <span className="font-mono font-bold text-rose-600 text-sm hidden report-print-only">{formatCurrency(exp.amount, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
