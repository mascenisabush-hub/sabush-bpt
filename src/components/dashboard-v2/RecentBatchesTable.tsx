import React from 'react';
import { RECENT_BATCHES, PurchaseBatchRow } from './dummyData';

const STATUS_STYLES: Record<PurchaseBatchRow['status'], string> = {
  Ativo: 'bg-emerald-50 text-emerald-700',
  Parcial: 'bg-[#F59E0B]/10 text-[#B45309]',
  Consumido: 'bg-gray-100 text-gray-600',
  Arquivado: 'bg-gray-100 text-gray-400',
};

function formatMT(value: number): string {
  return `${value.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;
}

export const RecentBatchesTable: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full flex flex-col">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-[#111827]">Lotes de Compra Recentes</h3>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="px-5 py-2 font-semibold">Lote</th>
              <th className="px-5 py-2 font-semibold">Fornecedor</th>
              <th className="px-5 py-2 font-semibold">Data</th>
              <th className="px-5 py-2 font-semibold">Produtos</th>
              <th className="px-5 py-2 font-semibold">Investimento</th>
              <th className="px-5 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_BATCHES.map(row => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-[#0B1F3A]">{row.batchNumber}</td>
                <td className="px-5 py-3 text-[#111827]">{row.supplier}</td>
                <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                <td className="px-5 py-3 text-gray-500">{row.products}</td>
                <td className="px-5 py-3 font-semibold text-[#111827] whitespace-nowrap">{formatMT(row.investment)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
