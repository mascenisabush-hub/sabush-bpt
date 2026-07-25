import React from 'react';
import { useApp } from '../../context/AppContext';
import { calculateBatch } from '../../utils/calculations';

const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Same palette used elsewhere in the app for this design (navy/gold/orange),
// cycled for however many distinct categories exist in the real catalog.
const PALETTE = ['#0B1F3A', '#D4AF37', '#F59E0B', '#94A3B8', '#0EA5E9', '#7C3AED'];

// ============================================================
// REAL DATA ONLY — composition is derived from the existing Product
// `category` field and the existing calculateBatch() engine (the same
// one DashboardView/Reports use). Each slice is that category's share
// of remaining Investment Value (cost basis) across all batches. No
// new data model, no fabricated categories.
// ============================================================
export const InventoryDonut: React.FC = () => {
  const { products, batches, quebras } = useApp();

  const productMap = new Map(products.map(p => [p.id, p]));
  const totalsByCategory = new Map<string, number>();
  let total = 0;

  batches.forEach(batch => {
    const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
    if (calc.investmentValue <= 0) return;
    const category = productMap.get(batch.productId)?.category || 'Sem Categoria';
    totalsByCategory.set(category, (totalsByCategory.get(category) || 0) + calc.investmentValue);
    total += calc.investmentValue;
  });

  const slices = Array.from(totalsByCategory.entries())
    .map(([label, value], i) => ({
      label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: PALETTE[i % PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value);

  let cumulative = 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Composição do Inventário</h3>

      {slices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-400 py-8">
          Sem stock ativo para mostrar composição.
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              {slices.map(slice => {
                const dash = (slice.pct / 100) * CIRCUMFERENCE;
                const offset = -((cumulative / 100) * CIRCUMFERENCE);
                cumulative += slice.pct;
                return (
                  <circle
                    key={slice.label}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </g>
            <text
              x={SIZE / 2}
              y={SIZE / 2 - 4}
              textAnchor="middle"
              className="fill-[#111827] font-bold"
              fontSize="18"
            >
              100%
            </text>
            <text x={SIZE / 2} y={SIZE / 2 + 14} textAnchor="middle" className="fill-gray-400" fontSize="10">
              Stock total
            </text>
          </svg>

          <div className="w-full space-y-2">
            {slices.map(slice => (
              <div key={slice.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="text-gray-600 truncate">{slice.label}</span>
                </div>
                <span className="font-semibold text-[#111827] shrink-0">{slice.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
