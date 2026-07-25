import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
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

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

export const WithdrawalReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, withdrawals, deleteWithdrawal } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();

  const filtered = useMemo(() => withdrawals.filter(w => isDateInRange(w.date, range.startDate, range.endDate)), [withdrawals, range]);
  const total = filtered.reduce((s, w) => s + Number(w.amount || 0), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(w => {
      const key = groupBy === 'reason' ? (w.reason || 'Não Especificado') : w.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + Number(w.amount || 0));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: groupBy === 'month' ? monthLabel(key + '-01') : key, value }))
      .sort((a, b) => (groupBy === 'reason' ? b.value - a.value : a.key.localeCompare(b.key)));
  }, [filtered, groupBy]);

  const topReason = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(w => {
      const key = w.reason || 'Não Especificado';
      map.set(key, (map.get(key) || 0) + Number(w.amount || 0));
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return arr.length ? { label: arr[0][0], value: arr[0][1] } : null;
  }, [filtered]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (topReason && total > 0) {
      lines.push(`"${topReason.label}" é o motivo mais comum de retirada, representando ${((topReason.value / total) * 100).toFixed(0)}% do total retirado.`);
    }
    const c = concentrationInsight('motivos', grouped.map(g => ({ label: g.label, value: g.value })), total);
    if (groupBy === 'reason' && c) lines.push(c);
    return lines;
  }, [topReason, total, grouped, groupBy]);

  const groupLabel = groupBy === 'month' ? 'Mês' : 'Motivo';

  const handleExportPdf = () => {
    exportReportPdf(
      'Retiradas do Proprietário',
      business?.name || 'Sabush',
      `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`,
      [
        { label: 'Retiradas Totais', value: formatCurrency(total, currencySymbol) },
        { label: 'Motivo Mais Comum', value: topReason ? `${topReason.label} (${formatCurrency(topReason.value, currencySymbol)})` : '—' },
        { label: 'Número de Retiradas', value: String(filtered.length) },
      ],
      [
        { title: `Por ${groupLabel}`, columns: [groupLabel, 'Valor'], rows: grouped.map(g => [g.label, formatCurrency(g.value, currencySymbol)]) },
        { title: 'Todas as Retiradas', columns: ['Data', 'Motivo', 'Valor'], rows: filtered.map(w => [formatDate(w.date), w.reason || 'Não Especificado', formatCurrency(w.amount, currencySymbol)]) },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Retiradas do Proprietário',
      [{ label: 'Retiradas Totais', value: formatCurrency(total, currencySymbol) }],
      [
        { title: `Por ${groupLabel}`, columns: [groupLabel, 'Valor'], rows: grouped.map(g => [g.label, g.value]) },
        { title: 'Todas as Retiradas', columns: ['Data', 'Motivo', 'Valor'], rows: filtered.map(w => [w.date, w.reason || 'Não Especificado', w.amount]) },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Retiradas do Proprietário"
        description="Quanto o proprietário retirou do negócio e para quê."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ReportKpiCard icon={HandCoins} label="Retiradas Totais" value={formatCurrency(total, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Tag} label="Motivo Mais Comum" value={topReason ? formatCurrency(topReason.value, currencySymbol) : '—'} sub={topReason?.label} />
        <ReportKpiCard icon={CalendarDays} label="Nº de Retiradas" value={String(filtered.length)} />
      </div>

      <ReportSection
        title={`Retiradas por ${groupLabel}`}
        icon={Tag}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'month', label: 'Mês' },
              { value: 'reason', label: 'Motivo' },
            ]}
          />
        }
      >
        {grouped.length === 0 ? (
          <ReportEmptyState message="Nenhuma retirada registada neste período." />
        ) : groupBy === 'reason' ? (
          <DonutChart currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={grouped.map(g => ({ label: g.label, value: g.value }))} color="#D97706" />
        )}
      </ReportSection>

      <ReportSection title={`Linha do Tempo (${filtered.length})`} icon={CalendarDays}>
        {filtered.length === 0 ? (
          <ReportEmptyState message="Nenhuma retirada registada neste período." />
        ) : (
          <div className="space-y-2">
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(w => (
              <div key={w.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">{w.reason || 'Não Especificado'}</span>
                  <span className="text-[11px] text-gray-500">{formatDate(w.date)}{w.notes ? ` · ${w.notes}` : ''}</span>
                </div>
                <div className="flex items-center gap-3 report-no-print">
                  <span className="font-mono font-bold text-rose-600 text-sm">{formatCurrency(w.amount, currencySymbol)}</span>
                  <button onClick={() => deleteWithdrawal(w.id)} className="text-[10px] text-gray-400 hover:text-rose-600 transition">
                    Eliminar
                  </button>
                </div>
                <span className="font-mono font-bold text-rose-600 text-sm hidden report-print-only">{formatCurrency(w.amount, currencySymbol)}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
