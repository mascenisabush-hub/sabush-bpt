import React from 'react';
import { useApp } from '../../context/AppContext';

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 32;

// ============================================================
// REAL DATA ONLY — the app's only real historical record of Embedded
// Profit over time is the Monthly Closing log (Closing.totalEmbeddedProfit,
// recorded whenever the owner locks a month via the existing Fecho
// Mensal/Anual feature). We plot those points chronologically and always
// append the current live figure (totalEmbeddedProfitAllTime) as the
// final "Atual" point, since the current month usually isn't closed yet.
// No time series is fabricated — if no closings exist yet, the chart
// simply shows the single current point.
// ============================================================
export const ProfitLineChart: React.FC = () => {
  const { closings, totalEmbeddedProfitAllTime } = useApp();

  const monthlyClosings = [...closings]
    .filter(c => c.periodType === 'monthly')
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const series: { label: string; value: number }[] = [
    ...monthlyClosings.map(c => ({ label: c.periodLabel, value: c.totalEmbeddedProfit })),
    { label: 'Atual', value: totalEmbeddedProfitAllTime },
  ];

  const values = series.map(p => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const stepX = series.length > 1 ? (WIDTH - PADDING * 2) / (series.length - 1) : 0;

  const points = series.map((p, i) => {
    const x = series.length > 1 ? PADDING + i * stepX : WIDTH / 2;
    const y = HEIGHT - PADDING - ((p.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, ...p };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING} L ${points[0].x} ${HEIGHT - PADDING} Z`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Evolução do Lucro Embutido</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-56" preserveAspectRatio="none">
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8791A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B8791A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 1, 2, 3].map(i => (
          <line
            key={i}
            x1={PADDING}
            x2={WIDTH - PADDING}
            y1={PADDING + (i * (HEIGHT - PADDING * 2)) / 3}
            y2={PADDING + (i * (HEIGHT - PADDING * 2)) / 3}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill="url(#profitFill)" />
        <path d={linePath} fill="none" stroke="#1B3966" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#B8791A" stroke="#1B3966" strokeWidth={1.5} />
            <text x={p.x} y={HEIGHT - 6} textAnchor="middle" className="fill-gray-400" fontSize="11">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
