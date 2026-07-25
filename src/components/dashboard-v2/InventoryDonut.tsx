import React from 'react';
import { INVENTORY_COMPOSITION } from './dummyData';

const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const InventoryDonut: React.FC = () => {
  let cumulative = 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Composição do Inventário</h3>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {INVENTORY_COMPOSITION.map(slice => {
              const dash = (slice.value / 100) * CIRCUMFERENCE;
              const offset = -((cumulative / 100) * CIRCUMFERENCE);
              cumulative += slice.value;
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
          {INVENTORY_COMPOSITION.map(slice => (
            <div key={slice.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="text-gray-600">{slice.label}</span>
              </div>
              <span className="font-semibold text-[#111827]">{slice.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
