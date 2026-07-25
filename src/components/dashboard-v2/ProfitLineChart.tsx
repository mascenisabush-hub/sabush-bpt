import React from 'react';
import { PROFIT_TREND } from './dummyData';

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 32;

export const ProfitLineChart: React.FC = () => {
  const values = PROFIT_TREND.map(p => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const stepX = (WIDTH - PADDING * 2) / (PROFIT_TREND.length - 1);

  const points = PROFIT_TREND.map((p, i) => {
    const x = PADDING + i * stepX;
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
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
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
        <path d={linePath} fill="none" stroke="#0B1F3A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#D4AF37" stroke="#0B1F3A" strokeWidth={1.5} />
            <text x={p.x} y={HEIGHT - 6} textAnchor="middle" className="fill-gray-400" fontSize="11">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
