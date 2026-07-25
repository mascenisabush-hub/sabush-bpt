import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateBatch } from '../../utils/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner } from './shared/ReportUI';
import { ReportFilterBar, useDateRange } from './shared/ReportFilterBar';
import { isDateInRange } from '../../utils/calculations';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { DonutChart } from './charts/MiniCharts';
import { Gem, Wallet, Boxes, TrendingUp, TrendingDown, AlertTriangle, Receipt, HandCoins, Landmark } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const BusinessWorthReport: React.FC<Props> = ({ onBack }) => {
  const {
    business, currencySymbol,
    batches, quebras, expenses, withdrawals,
    hasInitialStockCount, initialCapitalValue,
    totalInvestmentValueAllTime, totalMarketValueAllTime, totalEmbeddedProfitAllTime,
    totalExpensesAllTime, totalWithdrawalsAllTime,
    businessWorth, capitalGrowth, capitalGrowthPct,
  } = useApp();

  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();

  const totalInventoryLossValue = useMemo(
    () => batches.reduce((sum, b) => sum + calculateBatch(b, quebras).quebraValue, 0),
    [batches, quebras]
  );

  const periodExpenses = useMemo(
    () => expenses.filter(e => isDateInRange(e.date, range.startDate, range.endDate)),
    [expenses, range]
  );
  const periodWithdrawals = useMemo(
    () => withdrawals.filter(w => isDateInRange(w.date, range.startDate, range.endDate)),
    [withdrawals, range]
  );
  const periodExpenseTotal = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const periodWithdrawalTotal = periodWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (hasInitialStockCount) {
      lines.push(
        capitalGrowth >= 0
          ? `O negócio cresceu ${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%) desde o capital inicial.`
          : `O negócio reduziu ${formatCurrency(Math.abs(capitalGrowth), currencySymbol)} (${capitalGrowthPct.toFixed(1)}%) desde o capital inicial.`
      );
    } else {
      lines.push('Ainda não foi registada uma Contagem Inicial de Stock, por isso o crescimento de capital não pode ser medido.');
    }
    if (totalMarketValueAllTime > 0) {
      const profitShare = (totalEmbeddedProfitAllTime / totalMarketValueAllTime) * 100;
      lines.push(`${profitShare.toFixed(0)}% do valor de mercado do inventário atual é lucro embutido ainda não realizado.`);
    }
    if (totalInventoryLossValue > 0 && totalInvestmentValueAllTime + totalInventoryLossValue > 0) {
      const lossShare = (totalInventoryLossValue / (totalInvestmentValueAllTime + totalInventoryLossValue)) * 100;
      lines.push(`As quebras já custaram ${formatCurrency(totalInventoryLossValue, currencySymbol)}, cerca de ${lossShare.toFixed(1)}% do valor investido em stock.`);
    }
    return lines;
  }, [hasInitialStockCount, capitalGrowth, capitalGrowthPct, currencySymbol, totalMarketValueAllTime, totalEmbeddedProfitAllTime, totalInventoryLossValue, totalInvestmentValueAllTime]);

  const handleExportPdf = () => {
    exportReportPdf(
      'Valor do Negócio',
      business?.name || 'Sabush',
      `Instantâneo a ${formatDate(new Date().toISOString().slice(0, 10))}`,
      [
        { label: 'Capital Inicial do Negócio', value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : 'Não definido' },
        { label: 'Custo do Inventário Atual', value: formatCurrency(totalInvestmentValueAllTime, currencySymbol) },
        { label: 'Valor de Mercado do Inventário Atual', value: formatCurrency(totalMarketValueAllTime, currencySymbol) },
        { label: 'Lucro Embutido', value: formatCurrency(totalEmbeddedProfitAllTime, currencySymbol) },
        { label: 'Perdas de Inventário (Quebras, a custo)', value: formatCurrency(totalInventoryLossValue, currencySymbol) },
        { label: 'Despesas Totais', value: formatCurrency(totalExpensesAllTime, currencySymbol) },
        { label: 'Retiradas Totais do Proprietário', value: formatCurrency(totalWithdrawalsAllTime, currencySymbol) },
        { label: 'Valor do Negócio', value: formatCurrency(businessWorth, currencySymbol) },
        { label: 'Crescimento de Capital', value: `${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%)` },
      ],
      [
        {
          title: `Despesas no Período (${formatDate(range.startDate)} — ${formatDate(range.endDate)})`,
          columns: ['Data', 'Descrição', 'Categoria', 'Valor'],
          rows: periodExpenses.map(e => [formatDate(e.date), e.description, e.category || 'Geral', formatCurrency(e.amount, currencySymbol)]),
        },
        {
          title: `Retiradas no Período (${formatDate(range.startDate)} — ${formatDate(range.endDate)})`,
          columns: ['Data', 'Motivo', 'Valor'],
          rows: periodWithdrawals.map(w => [formatDate(w.date), w.reason || 'Não especificado', formatCurrency(w.amount, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Valor do Negócio',
      [
        { label: 'Capital Inicial do Negócio', value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : 'Não definido' },
        { label: 'Custo do Inventário Atual', value: formatCurrency(totalInvestmentValueAllTime, currencySymbol) },
        { label: 'Valor de Mercado do Inventário Atual', value: formatCurrency(totalMarketValueAllTime, currencySymbol) },
        { label: 'Lucro Embutido', value: formatCurrency(totalEmbeddedProfitAllTime, currencySymbol) },
        { label: 'Perdas de Inventário (a custo)', value: formatCurrency(totalInventoryLossValue, currencySymbol) },
        { label: 'Despesas Totais', value: formatCurrency(totalExpensesAllTime, currencySymbol) },
        { label: 'Retiradas Totais', value: formatCurrency(totalWithdrawalsAllTime, currencySymbol) },
        { label: 'Valor do Negócio', value: formatCurrency(businessWorth, currencySymbol) },
        { label: 'Crescimento de Capital', value: `${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%)` },
      ],
      [
        {
          title: 'Despesas no Período',
          columns: ['Data', 'Descrição', 'Categoria', 'Valor'],
          rows: periodExpenses.map(e => [formatDate(e.date), e.description, e.category || 'Geral', e.amount]),
        },
        {
          title: 'Retiradas no Período',
          columns: ['Data', 'Motivo', 'Valor'],
          rows: periodWithdrawals.map(w => [formatDate(w.date), w.reason || 'Não especificado', w.amount]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Valor do Negócio"
        description="Uma fotografia honesta do que o negócio vale hoje."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      {/* Hero Business Worth card */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-md ${
        businessWorth >= 0 ? 'bg-gradient-to-br from-orange-50 to-white border-orange-300' : 'bg-gradient-to-br from-rose-50 to-white border-rose-300'
      }`}>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Valor do Negócio Hoje</span>
        <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-1">
          {formatCurrency(businessWorth, currencySymbol)}
        </div>
        {hasInitialStockCount ? (
          <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${capitalGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {capitalGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {capitalGrowth >= 0 ? '+' : ''}{formatCurrency(capitalGrowth, currencySymbol)} ({capitalGrowthPct >= 0 ? '+' : ''}{capitalGrowthPct.toFixed(1)}%) desde o capital inicial
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-2">Registe uma Contagem Inicial de Stock para medir o crescimento.</p>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Landmark} label="Capital Inicial" value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : '—'} />
        <ReportKpiCard icon={Boxes} label="Custo do Inventário" value={formatCurrency(totalInvestmentValueAllTime, currencySymbol)} />
        <ReportKpiCard icon={Gem} label="Valor de Mercado" value={formatCurrency(totalMarketValueAllTime, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={TrendingUp} label="Lucro Embutido" value={formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)} tone={totalEmbeddedProfitAllTime >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={AlertTriangle} label="Perdas de Inventário" value={formatCurrency(totalInventoryLossValue, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Receipt} label="Despesas Totais" value={formatCurrency(totalExpensesAllTime, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={HandCoins} label="Retiradas Totais" value={formatCurrency(totalWithdrawalsAllTime, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Wallet} label="Crescimento de Capital" value={`${capitalGrowthPct >= 0 ? '+' : ''}${capitalGrowthPct.toFixed(1)}%`} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* Composition of Business Worth */}
      <ReportSection title="Como o Valor do Negócio é Composto" icon={Gem}>
        <DonutChart
          currencySymbol={currencySymbol}
          data={[
            { label: 'Custo do Inventário', value: totalInvestmentValueAllTime },
            { label: 'Lucro Embutido', value: Math.max(totalEmbeddedProfitAllTime, 0) },
          ]}
        />
        <p className="text-[11px] text-gray-400">
          Valor de Mercado do Inventário = Custo + Lucro Embutido. Despesas e retiradas já reduzem o Valor do Negócio, mas não fazem parte do inventário em si.
        </p>
      </ReportSection>

      {/* Period activity filter + tables */}
      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <ReportSection title={`Despesas no Período (${periodExpenses.length})`} icon={Receipt}>
        {periodExpenses.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma despesa registada neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">Data</th>
                  <th className="py-2 pr-2 font-semibold">Descrição</th>
                  <th className="py-2 pr-2 font-semibold">Categoria</th>
                  <th className="py-2 pr-2 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {periodExpenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-gray-600">{formatDate(e.date)}</td>
                    <td className="py-2 pr-2 font-semibold text-gray-800">{e.description}</td>
                    <td className="py-2 pr-2 text-gray-500">{e.category || 'Geral'}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-rose-600">{formatCurrency(e.amount, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-2 font-bold text-gray-700">Total</td>
                  <td className="pt-2 text-right font-mono font-black text-rose-600">{formatCurrency(periodExpenseTotal, currencySymbol)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title={`Retiradas no Período (${periodWithdrawals.length})`} icon={HandCoins}>
        {periodWithdrawals.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma retirada registada neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">Data</th>
                  <th className="py-2 pr-2 font-semibold">Motivo</th>
                  <th className="py-2 pr-2 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {periodWithdrawals.map(w => (
                  <tr key={w.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-gray-600">{formatDate(w.date)}</td>
                    <td className="py-2 pr-2 font-semibold text-gray-800">{w.reason || 'Não especificado'}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-rose-600">{formatCurrency(w.amount, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-2 font-bold text-gray-700">Total</td>
                  <td className="pt-2 text-right font-mono font-black text-rose-600">{formatCurrency(periodWithdrawalTotal, currencySymbol)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ReportSection>
    </div>
  );
};
