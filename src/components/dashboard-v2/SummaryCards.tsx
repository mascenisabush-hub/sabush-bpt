import React from 'react';
import { TrendingUp, TrendingDown, Wallet, LineChart, Gem, Building2, Receipt, HandCoins } from 'lucide-react';
import { SUMMARY_CARDS, SummaryCardData } from './dummyData';

const ICONS: Record<SummaryCardData['icon'], React.ElementType> = {
  investment: Wallet,
  market: LineChart,
  profit: Gem,
  worth: Building2,
  expenses: Receipt,
  withdrawals: HandCoins,
};

function formatMT(value: number): string {
  return `${value.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;
}

export const SummaryCards: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {SUMMARY_CARDS.map(card => {
        const Icon = ICONS[card.icon];
        const isPositive = card.trend >= 0;
        return (
          <div
            key={card.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0B1F3A]/5 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-[#0B1F3A]" />
              </div>
              <div
                className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(card.trend)}%
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 leading-tight">{card.title}</p>
            <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMT(card.value)}</p>
          </div>
        );
      })}
    </div>
  );
};
