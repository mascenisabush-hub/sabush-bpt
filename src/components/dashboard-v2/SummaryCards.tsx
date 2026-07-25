import React from 'react';
import { TrendingUp, TrendingDown, Wallet, LineChart, Gem, Building2, Receipt, HandCoins } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

// ============================================================
// REAL DATA ONLY — every figure here comes straight from AppContext,
// the exact same source DashboardView.tsx uses for its KPI cards.
// Nothing is recalculated and no new data model is introduced.
//
// Trend badges: the existing system only tracks a real trend for
// Business Worth (capitalGrowth / capitalGrowthPct, see DashboardView's
// "Valor do Negócio" card). There is no equivalent period-over-period
// trend for the other five figures, so we don't fabricate one — the
// badge is simply omitted for those cards.
// ============================================================
export const SummaryCards: React.FC = () => {
  const {
    totalInvestmentValueAllTime,
    totalMarketValueAllTime,
    totalEmbeddedProfitAllTime,
    businessWorth,
    totalExpensesAllTime,
    totalWithdrawalsAllTime,
    currencySymbol,
    hasInitialStockCount,
    capitalGrowth,
    capitalGrowthPct,
  } = useApp();

  const cards = [
    { id: 'investment', title: 'Custo do Stock Atual', value: totalInvestmentValueAllTime, icon: Wallet },
    { id: 'market', title: 'Valor de Mercado do Stock', value: totalMarketValueAllTime, icon: LineChart },
    { id: 'profit', title: 'Lucro Embutido', value: totalEmbeddedProfitAllTime, icon: Gem },
    {
      id: 'worth',
      title: 'Valor do Negócio',
      value: businessWorth,
      icon: Building2,
      trend: hasInitialStockCount && capitalGrowth !== 0 ? capitalGrowthPct : undefined,
    },
    { id: 'expenses', title: 'Despesas Gerais', value: totalExpensesAllTime, icon: Receipt },
    { id: 'withdrawals', title: 'Levantamentos do Dono', value: totalWithdrawalsAllTime, icon: HandCoins },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        const hasTrend = card.trend !== undefined;
        const isPositive = (card.trend || 0) >= 0;
        return (
          <div
            key={card.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0B1F3A]/5 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-[#0B1F3A]" />
              </div>
              {hasTrend && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                    isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}
                  {(card.trend as number).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 leading-tight">{card.title}</p>
            <p className="text-lg font-bold text-[#111827] tabular-nums">
              {formatCurrency(card.value, currencySymbol)}
            </p>
          </div>
        );
      })}
    </div>
  );
};
