import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  calculatePurchaseBatchSummary,
  PURCHASE_BATCH_STATUS_LABELS,
} from '../../utils/purchaseBatchCalculations';
import { PurchaseBatchStatus } from '../../types';

const STATUS_STYLES: Record<PurchaseBatchStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  partially_remaining: 'bg-[#F59E0B]/10 text-[#B45309]',
  fully_consumed: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-400',
};

// ============================================================
// REAL DATA ONLY — reuses the existing Purchase Batch (Investment
// Ledger) data model exactly as-is: calculatePurchaseBatchSummary and
// PURCHASE_BATCH_STATUS_LABELS are the same helpers Batch History uses.
// Shows the 5 most recent purchase batches, newest first.
// ============================================================
export const RecentBatchesTable: React.FC = () => {
  const { purchaseBatches, batches, quebras, products, currencySymbol } = useApp();

  const rows = [...purchaseBatches]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map(pb => {
      const lineItems = batches.filter(b => b.purchaseBatchId === pb.id);
      const summary = calculatePurchaseBatchSummary(pb, lineItems, quebras, products);
      return { pb, summary };
    });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full flex flex-col">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-[#111827]">Lotes de Compra Recentes</h3>
      </div>

      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-400 py-10 px-5">
          Nenhum lote de compra registado ainda.
        </div>
      ) : (
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
              {rows.map(({ pb, summary }) => (
                <tr key={pb.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B3966]">{pb.batchNumber}</td>
                  <td className="px-5 py-3 text-[#111827]">{pb.supplier.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(pb.date)}</td>
                  <td className="px-5 py-3 text-gray-500">{summary.productCount}</td>
                  <td className="px-5 py-3 font-semibold text-[#111827] whitespace-nowrap">
                    {formatCurrency(summary.totalInvestmentValue, currencySymbol)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${STATUS_STYLES[summary.status]}`}>
                      {PURCHASE_BATCH_STATUS_LABELS[summary.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
