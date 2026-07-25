import React from 'react';
import { formatCurrency } from '../../../utils/formatters';

// ============================================================
// Dependency-free SVG chart primitives for the Reports BI center.
// No charting library is installed in this project, so these stay
// intentionally small and only render what's passed in — never
// derive or invent data themselves.
// ============================================================

const PALETTE = ['#EA580C', '#2563EB', '#059669', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#65A30D'];

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  currencySymbol: string;
  color?: string;
  height?: number;
}

export const BarChartHorizontal: React.FC<BarChartProps> = ({ data, currencySymbol, color = '#EA580C', height }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const rowH = height || 34;

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.max((Math.abs(d.value) / max) * 100, 2);
        const isNeg = d.value < 0;
        return (
          <div key={i} style={{ minHeight: rowH }}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-gray-700 truncate pr-2">{d.label}</span>
              <span className={`font-mono font-bold shrink-0 ${isNeg ? 'text-rose-600' : 'text-gray-800'}`}>
                {formatCurrency(d.value, currencySymbol)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: isNeg ? '#E11D48' : color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  currencySymbol: string;
  color?: string;
}

export const LineChartSimple: React.FC<LineChartProps> = ({ data, currencySymbol, color = '#EA580C' }) => {
  if (data.length < 2) {
    return (
      <div className="text-[11px] text-gray-400 text-center py-8">
        É necessário mais do que um ponto no tempo para desenhar uma tendência.
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const padX = 12;
  const padY = 20;
  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = H - padY - ((d.value - min) / range) * (H - padY * 2);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const zeroY = H - padY - ((0 - min) / range) * (H - padY * 2);
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} L${points[0].x.toFixed(1)},${zeroY.toFixed(1)} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" style={{ maxHeight: 220 }}>
        <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="#E5E7EB" strokeWidth={1} />
        <path d={areaD} fill={color} opacity={0.08} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {points.map((p, i) => (
          <div key={i} className="text-[9px] text-gray-500 text-center" style={{ width: `${100 / points.length}%` }}>
            <div className="truncate">{p.label}</div>
            <div className="font-mono font-bold text-gray-700">{formatCurrency(p.value, currencySymbol)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface DonutSlice {
  label: string;
  value: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  currencySymbol: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, currencySymbol }) => {
  const filtered = data.filter(d => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  if (!filtered.length || total <= 0) {
    return <div className="text-[11px] text-gray-400 text-center py-8">Sem dados suficientes para este gráfico.</div>;
  }

  const R = 60;
  const CX = 70;
  const CY = 70;
  const STROKE = 26;
  const circumference = 2 * Math.PI * R;
  let offsetAcc = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={140} height={140} viewBox="0 0 140 140" className="shrink-0">
        {filtered.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const gap = circumference - dash;
          const rotation = (offsetAcc / total) * 360 - 90;
          offsetAcc += d.value;
          return (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${CX} ${CY})`}
            />
          );
        })}
      </svg>
      <div className="flex-1 w-full space-y-1.5">
        {filtered.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="font-semibold text-gray-700 truncate">{d.label}</span>
            </span>
            <span className="font-mono font-bold text-gray-800 shrink-0">
              {formatCurrency(d.value, currencySymbol)} <span className="text-gray-400 font-normal">({((d.value / total) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
