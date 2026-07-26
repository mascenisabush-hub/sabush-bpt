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
//
// HIERARCHY: Business Worth is the one figure an owner checks first —
// it's the net result of everything else on this page — so it gets a
// dedicated hero row instead of competing as a 7th equal-weight tile.
// The remaining five stay in a supporting grid underneath. Same data,
// same source, just weighted to match how the numbers actually relate.
// Colors now read from the brand tokens in index.css (--navy, --gold)
// instead of the older #0B1F3A/#D4AF37 hex that had drifted from them.
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

  const supportingCards = [
    { id: 'investment', title: 'Custo do Stock Atual', value: totalInvestmentValueAllTime, icon: Wallet },
    { id: 'market', title: 'Valor de Mercado do Stock', value: totalMarketValueAllTime, icon: LineChart },
    { id: 'profit', title: 'Lucro Embutido', value: totalEmbeddedProfitAllTime, icon: Gem, accent: true },
    { id: 'expenses', title: 'Despesas Gerais', value: totalExpensesAllTime, icon: Receipt },
    { id: 'withdrawals', title: 'Levantamentos do Dono', value: totalWithdrawalsAllTime, icon: HandCoins },
  ];

  const hasWorthTrend = hasInitialStockCount && capitalGrowth !== 0;
  const isWorthPositive = capitalGrowthPct >= 0;

  return (
    <div className="space-y-4">
      {/* Hero: Valor do Negócio — the single figure everything else feeds into */}
      <div className="bg-[var(--navy)] rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[var(--gold)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/60 mb-1">Valor do Negócio</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(businessWorth, currencySymbol)}
            </p>
          </div>
        </div>
        {hasWorthTrend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md ${
              isWorthPositive ? 'text-emerald-300 bg-emerald-400/10' : 'text-red-300 bg-red-400/10'
            }`}
          >
            {isWorthPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isWorthPositive ? '+' : ''}
            {capitalGrowthPct.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Supporting figures */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {supportingCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border ${
                card.accent ? 'border-[var(--gold)]/30' : 'border-gray-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--navy)]/5 flex items-center justify-center mb-3">
                <Icon className={`w-4.5 h-4.5 ${card.accent ? 'text-[var(--gold)]' : 'text-[var(--navy)]'}`} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1 leading-tight">{card.title}</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  card.accent ? 'text-[var(--gold-hover)]' : 'text-[#111827]'
                }`}
              >
                {formatCurrency(card.value, currencySymbol)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
