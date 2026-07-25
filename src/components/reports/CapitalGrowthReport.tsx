import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, ReportEmptyState } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { LineChartSimple } from './charts/MiniCharts';
import { TrendingUp, TrendingDown, Landmark, Gem, History } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const CapitalGrowthReport: React.FC<Props> = ({ onBack }) => {
  const {
    business, currencySymbol, closings,
    hasInitialStockCount, initialCapitalValue, initialStockCount,
    businessWorth, capitalGrowth, capitalGrowthPct,
  } = useApp();

  const timeline = useMemo(() => {
    const points: { date: string; label: string; value: number }[] = [];
    if (hasInitialStockCount && initialStockCount) {
      points.push({ date: initialStockCount.date, label: 'Capital Inicial', value: initialCapitalValue });
    }
    [...closings]
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .forEach(c => {
        points.push({ date: c.endDate, label: c.periodLabel, value: c.businessWorthAtClose });
      });
    points.push({ date: new Date().toISOString().slice(0, 10), label: 'Hoje', value: businessWorth });
    return points;
  }, [hasInitialStockCount, initialStockCount, initialCapitalValue, closings, businessWorth]);

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
      lines.push('Registe uma Contagem Inicial de Stock para começar a medir o crescimento de capital.');
      return lines;
    }
    lines.push(
      capitalGrowth >= 0
        ? `O negócio cresceu de forma constante: ${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%) desde o início.`
        : `O valor do negócio está ${formatCurrency(Math.abs(capitalGrowth), currencySymbol)} (${capitalGrowthPct.toFixed(1)}%) abaixo do capital inicial.`
    );
    if (closings.length === 0) {
      lines.push('Ainda não foram registados fechos mensais ou anuais — feche um período para acompanhar a evolução ao longo do tempo.');
    } else if (lastMonthlyGrowth) {
      const change = lastMonthlyGrowth.previous ? ((lastMonthlyGrowth.current - lastMonthlyGrowth.previous) / Math.abs(lastMonthlyGrowth.previous)) * 100 : 0;
      lines.push(`No fecho mais recente (${lastMonthlyGrowth.label}), o Valor do Negócio ${change >= 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(change).toFixed(1)}%.`);
    }
    return lines;
  }, [hasInitialStockCount, capitalGrowth, capitalGrowthPct, currencySymbol, closings, lastMonthlyGrowth]);

  const handleExportPdf = () => {
    exportReportPdf(
      'Crescimento de Capital',
      business?.name || 'Sabush',
      'Evolução desde o capital inicial',
      [
        { label: 'Capital Inicial', value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : 'Não definido' },
        { label: 'Capital Atual (Valor do Negócio)', value: formatCurrency(businessWorth, currencySymbol) },
        { label: 'Aumento', value: formatCurrency(capitalGrowth, currencySymbol) },
        { label: 'Crescimento (%)', value: `${capitalGrowthPct.toFixed(1)}%` },
      ],
      [
        {
          title: 'Linha do Tempo (Fechos de Período)',
          columns: ['Data', 'Período', 'Valor do Negócio'],
          rows: timeline.map(p => [formatDate(p.date), p.label, formatCurrency(p.value, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Crescimento de Capital',
      [
        { label: 'Capital Inicial', value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : 'Não definido' },
        { label: 'Capital Atual', value: formatCurrency(businessWorth, currencySymbol) },
        { label: 'Aumento', value: formatCurrency(capitalGrowth, currencySymbol) },
        { label: 'Crescimento (%)', value: `${capitalGrowthPct.toFixed(1)}%` },
      ],
      [
        {
          title: 'Linha do Tempo',
          columns: ['Data', 'Período', 'Valor do Negócio'],
          rows: timeline.map(p => [p.date, p.label, p.value]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Crescimento de Capital"
        description="Como o negócio evoluiu desde o capital inicial."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Landmark} label="Capital Inicial" value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : '—'} />
        <ReportKpiCard icon={Gem} label="Capital Atual" value={formatCurrency(businessWorth, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={capitalGrowth >= 0 ? TrendingUp : TrendingDown} label="Aumento" value={formatCurrency(capitalGrowth, currencySymbol)} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={History} label="Crescimento %" value={`${capitalGrowthPct >= 0 ? '+' : ''}${capitalGrowthPct.toFixed(1)}%`} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
      </div>

      {lastMonthlyGrowth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReportKpiCard
            icon={TrendingUp}
            label={`Crescimento Mensal (${lastMonthlyGrowth.label})`}
            value={formatCurrency(lastMonthlyGrowth.current - lastMonthlyGrowth.previous, currencySymbol)}
            tone={lastMonthlyGrowth.current - lastMonthlyGrowth.previous >= 0 ? 'positive' : 'negative'}
          />
          {lastYearlyGrowth && (
            <ReportKpiCard
              icon={TrendingUp}
              label={`Crescimento Anual (${lastYearlyGrowth.label})`}
              value={formatCurrency(lastYearlyGrowth.current - lastYearlyGrowth.previous, currencySymbol)}
              tone={lastYearlyGrowth.current - lastYearlyGrowth.previous >= 0 ? 'positive' : 'negative'}
            />
          )}
        </div>
      )}

      <ReportSection title="Linha do Tempo do Valor do Negócio" icon={History}>
        {timeline.length < 2 ? (
          <ReportEmptyState message="Registe a Contagem Inicial de Stock e feche pelo menos um período para ver a linha do tempo." />
        ) : (
          <LineChartSimple currencySymbol={currencySymbol} data={timeline.map(p => ({ label: p.label, value: p.value }))} />
        )}
      </ReportSection>

      <ReportSection title="Histórico de Fechos" icon={Landmark}>
        {closings.length === 0 ? (
          <ReportEmptyState message="Nenhum período fechado ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">Período</th>
                  <th className="py-2 pr-2 font-semibold">Data de Fecho</th>
                  <th className="py-2 pr-2 font-semibold text-right">Lucro Embutido</th>
                  <th className="py-2 pr-2 font-semibold text-right">Despesas</th>
                  <th className="py-2 pr-2 font-semibold text-right">Retiradas</th>
                  <th className="py-2 pr-2 font-semibold text-right">Valor do Negócio</th>
                </tr>
              </thead>
              <tbody>
                {[...closings].sort((a, b) => b.endDate.localeCompare(a.endDate)).map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-bold text-gray-900">{c.periodLabel}</td>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(c.endDate)}</td>
                    <td className={`py-2 pr-2 text-right font-mono ${c.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(c.totalEmbeddedProfit, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-rose-600">{formatCurrency(c.totalExpenses, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-rose-600">{formatCurrency(c.totalWithdrawals, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-gray-900">{formatCurrency(c.businessWorthAtClose, currencySymbol)}</td>
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
