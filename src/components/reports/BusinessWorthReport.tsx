import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
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
  const { t } = useLanguage();
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
          ? t('businessWorth.insightGrew', { amount: formatCurrency(capitalGrowth, currencySymbol), pct: capitalGrowthPct.toFixed(1) })
          : t('businessWorth.insightShrank', { amount: formatCurrency(Math.abs(capitalGrowth), currencySymbol), pct: capitalGrowthPct.toFixed(1) })
      );
    } else {
      lines.push(t('businessWorth.insightNoInitialCount'));
    }
    if (totalMarketValueAllTime > 0) {
      const profitShare = (totalEmbeddedProfitAllTime / totalMarketValueAllTime) * 100;
      lines.push(t('businessWorth.insightEmbeddedProfitShare', { pct: profitShare.toFixed(0) }));
    }
    if (totalInventoryLossValue > 0 && totalInvestmentValueAllTime + totalInventoryLossValue > 0) {
      const lossShare = (totalInventoryLossValue / (totalInvestmentValueAllTime + totalInventoryLossValue)) * 100;
      lines.push(t('businessWorth.insightLossesCost', { amount: formatCurrency(totalInventoryLossValue, currencySymbol), pct: lossShare.toFixed(1) }));
    }
    return lines;
  }, [t, hasInitialStockCount, capitalGrowth, capitalGrowthPct, currencySymbol, totalMarketValueAllTime, totalEmbeddedProfitAllTime, totalInventoryLossValue, totalInvestmentValueAllTime]);

  const handleExportPdf = () => {
    exportReportPdf(
      t('businessWorth.title'),
      business?.name || 'Sabush',
      t('businessWorth.snapshotAt', { date: formatDate(new Date().toISOString().slice(0, 10)) }),
      [
        { label: t('businessWorth.kpiInitialCapitalFull'), value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : t('reports.common.notDefined') },
        { label: t('businessWorth.kpiInventoryCostFull'), value: formatCurrency(totalInvestmentValueAllTime, currencySymbol) },
        { label: t('businessWorth.kpiMarketValueFull'), value: formatCurrency(totalMarketValueAllTime, currencySymbol) },
        { label: t('businessWorth.kpiEmbeddedProfit'), value: formatCurrency(totalEmbeddedProfitAllTime, currencySymbol) },
        { label: t('businessWorth.kpiInventoryLossesFull'), value: formatCurrency(totalInventoryLossValue, currencySymbol) },
        { label: t('businessWorth.kpiTotalExpenses'), value: formatCurrency(totalExpensesAllTime, currencySymbol) },
        { label: t('businessWorth.kpiTotalWithdrawalsFull'), value: formatCurrency(totalWithdrawalsAllTime, currencySymbol) },
        { label: t('businessWorth.kpiBusinessWorth'), value: formatCurrency(businessWorth, currencySymbol) },
        { label: t('businessWorth.kpiCapitalGrowth'), value: `${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%)` },
      ],
      [
        {
          title: t('businessWorth.expensesInPeriodRange', { start: formatDate(range.startDate), end: formatDate(range.endDate) }),
          columns: [t('reports.common.dateCol'), t('reports.common.descriptionCol'), t('reports.common.categoryCol'), t('reports.common.value')],
          rows: periodExpenses.map(e => [formatDate(e.date), e.description, e.category || t('reports.common.generalCategory'), formatCurrency(e.amount, currencySymbol)]),
        },
        {
          title: t('businessWorth.withdrawalsInPeriodRange', { start: formatDate(range.startDate), end: formatDate(range.endDate) }),
          columns: [t('reports.common.dateCol'), t('reports.common.reasonCol'), t('reports.common.value')],
          rows: periodWithdrawals.map(w => [formatDate(w.date), w.reason || t('reports.common.unspecified'), formatCurrency(w.amount, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      t('businessWorth.title'),
      [
        { label: t('businessWorth.kpiInitialCapitalFull'), value: hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : t('reports.common.notDefined') },
        { label: t('businessWorth.kpiInventoryCostFull'), value: formatCurrency(totalInvestmentValueAllTime, currencySymbol) },
        { label: t('businessWorth.kpiMarketValueFull'), value: formatCurrency(totalMarketValueAllTime, currencySymbol) },
        { label: t('businessWorth.kpiEmbeddedProfit'), value: formatCurrency(totalEmbeddedProfitAllTime, currencySymbol) },
        { label: t('businessWorth.kpiInventoryLossesExcel'), value: formatCurrency(totalInventoryLossValue, currencySymbol) },
        { label: t('businessWorth.kpiTotalExpenses'), value: formatCurrency(totalExpensesAllTime, currencySymbol) },
        { label: t('businessWorth.kpiTotalWithdrawals'), value: formatCurrency(totalWithdrawalsAllTime, currencySymbol) },
        { label: t('businessWorth.kpiBusinessWorth'), value: formatCurrency(businessWorth, currencySymbol) },
        { label: t('businessWorth.kpiCapitalGrowth'), value: `${formatCurrency(capitalGrowth, currencySymbol)} (${capitalGrowthPct.toFixed(1)}%)` },
      ],
      [
        {
          title: t('businessWorth.expensesInPeriod'),
          columns: [t('reports.common.dateCol'), t('reports.common.descriptionCol'), t('reports.common.categoryCol'), t('reports.common.value')],
          rows: periodExpenses.map(e => [formatDate(e.date), e.description, e.category || t('reports.common.generalCategory'), e.amount]),
        },
        {
          title: t('businessWorth.withdrawalsInPeriod'),
          columns: [t('reports.common.dateCol'), t('reports.common.reasonCol'), t('reports.common.value')],
          rows: periodWithdrawals.map(w => [formatDate(w.date), w.reason || t('reports.common.unspecified'), w.amount]),
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
        title={t('businessWorth.title')}
        description={t('businessWorth.description')}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      {/* Hero Business Worth card */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-md ${
        businessWorth >= 0 ? 'bg-gradient-to-br from-[#F6EFD9] to-white border-[#D4AF37]/40' : 'bg-gradient-to-br from-rose-50 to-white border-rose-300'
      }`}>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('businessWorth.heroLabel')}</span>
        <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-1">
          {formatCurrency(businessWorth, currencySymbol)}
        </div>
        {hasInitialStockCount ? (
          <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${capitalGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {capitalGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {capitalGrowth >= 0 ? '+' : ''}{formatCurrency(capitalGrowth, currencySymbol)} ({capitalGrowthPct >= 0 ? '+' : ''}{capitalGrowthPct.toFixed(1)}%) {t('businessWorth.heroSinceInitial')}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-2">{t('businessWorth.heroNoInitialCount')}</p>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ReportKpiCard icon={Landmark} label={t('businessWorth.kpiInitialCapital')} value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : '—'} />
        <ReportKpiCard icon={Boxes} label={t('businessWorth.kpiInventoryCost')} value={formatCurrency(totalInvestmentValueAllTime, currencySymbol)} />
        <ReportKpiCard icon={Gem} label={t('businessWorth.kpiMarketValue')} value={formatCurrency(totalMarketValueAllTime, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={TrendingUp} label={t('businessWorth.kpiEmbeddedProfit')} value={formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)} tone={totalEmbeddedProfitAllTime >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={AlertTriangle} label={t('businessWorth.kpiInventoryLosses')} value={formatCurrency(totalInventoryLossValue, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Receipt} label={t('businessWorth.kpiTotalExpenses')} value={formatCurrency(totalExpensesAllTime, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={HandCoins} label={t('businessWorth.kpiTotalWithdrawals')} value={formatCurrency(totalWithdrawalsAllTime, currencySymbol)} tone="negative" />
        <ReportKpiCard icon={Wallet} label={t('businessWorth.kpiCapitalGrowth')} value={`${capitalGrowthPct >= 0 ? '+' : ''}${capitalGrowthPct.toFixed(1)}%`} tone={capitalGrowth >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* Composition of Business Worth */}
      <ReportSection title={t('businessWorth.compositionTitle')} icon={Gem}>
        <DonutChart
          currencySymbol={currencySymbol}
          data={[
            { label: t('businessWorth.kpiInventoryCost'), value: totalInvestmentValueAllTime },
            { label: t('businessWorth.kpiEmbeddedProfit'), value: Math.max(totalEmbeddedProfitAllTime, 0) },
          ]}
        />
        <p className="text-[11px] text-gray-400">
          {t('businessWorth.compositionNote')}
        </p>
      </ReportSection>

      {/* Period activity filter + tables */}
      <ReportFilterBar range={range} onStartDate={setStartDate} onEndDate={setEndDate} onPreset={applyPreset} />

      <ReportSection title={`${t('businessWorth.expensesInPeriod')} (${periodExpenses.length})`} icon={Receipt}>
        {periodExpenses.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('businessWorth.noExpensesInPeriod')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{t('reports.common.dateCol')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.common.descriptionCol')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.common.categoryCol')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.common.value')}</th>
                </tr>
              </thead>
              <tbody>
                {periodExpenses.map(e => (
                  <tr key={e.id}>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(e.date)}</td>
                    <td className="py-2 pr-2 font-semibold text-gray-800">{e.description}</td>
                    <td className="py-2 pr-2 text-gray-500">{e.category || t('reports.common.generalCategory')}</td>
                    <td className="py-2 pr-2 text-right type-number text-rose-600">{formatCurrency(e.amount, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-2 font-bold text-gray-700">{t('reports.common.totalCol')}</td>
                  <td className="pt-2 text-right font-mono font-black text-rose-600">{formatCurrency(periodExpenseTotal, currencySymbol)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title={`${t('businessWorth.withdrawalsInPeriod')} (${periodWithdrawals.length})`} icon={HandCoins}>
        {periodWithdrawals.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('businessWorth.noWithdrawalsInPeriod')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{t('reports.common.dateCol')}</th>
                  <th className="py-2 pr-2 font-semibold">{t('reports.common.reasonCol')}</th>
                  <th className="py-2 pr-2 font-semibold text-right">{t('reports.common.value')}</th>
                </tr>
              </thead>
              <tbody>
                {periodWithdrawals.map(w => (
                  <tr key={w.id}>
                    <td className="py-2 pr-2 text-gray-600">{formatDate(w.date)}</td>
                    <td className="py-2 pr-2 font-semibold text-gray-800">{w.reason || t('reports.common.unspecified')}</td>
                    <td className="py-2 pr-2 text-right type-number text-rose-600">{formatCurrency(w.amount, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-2 font-bold text-gray-700">{t('reports.common.totalCol')}</td>
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
