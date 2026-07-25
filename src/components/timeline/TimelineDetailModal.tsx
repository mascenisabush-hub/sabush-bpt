import React from 'react';
import { TimelineEvent } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ACTIVITY_ICON, ACTIVITY_COLOR, ACTIVITY_LABEL, getEventTime } from './timelineHelpers';
import { X, User } from 'lucide-react';

interface TimelineDetailModalProps {
  event: TimelineEvent;
  currencySymbol: string;
  onClose: () => void;
}

const IMPACT_TONE_CLASSES: Record<string, string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-gray-700',
};

// Human-readable labels for the generic `details` keys each event type
// happens to populate. Unknown keys still render, just with their raw key.
const DETAIL_KEY_LABELS: Record<string, string> = {
  productName: 'Produto',
  quantity: 'Quantidade',
  unit: 'Unidade',
  costPrice: 'Preço de Custo',
  sellingPrice: 'Preço de Venda',
  investmentValue: 'Investimento',
  marketValue: 'Valor de Mercado',
  embeddedProfit: 'Lucro Embutido',
  batchNumber: 'Número do Lote',
  supplierName: 'Fornecedor',
  notes: 'Notas',
  products: 'Produtos',
  quantityLost: 'Quantidade Perdida',
  reason: 'Motivo',
  lossValue: 'Valor da Perda',
  description: 'Descrição',
  category: 'Categoria',
  amount: 'Valor',
  countType: 'Tipo de Contagem',
  label: 'Rótulo',
  productCount: 'Nº de Produtos',
  totalValue: 'Valor Total',
  periodLabel: 'Período',
  startDate: 'Data Inicial',
  endDate: 'Data Final',
  totalEmbeddedProfit: 'Lucro Embutido Total',
  totalExpenses: 'Despesas Totais',
  totalWithdrawals: 'Retiradas Totais',
  businessWorthAtClose: 'Valor do Negócio no Fecho',
  name: 'Nome',
  contact: 'Contacto',
  location: 'Localização',
  email: 'Email',
  reportTitle: 'Relatório',
};

const CURRENCY_DETAIL_KEYS = new Set([
  'costPrice', 'sellingPrice', 'investmentValue', 'marketValue', 'embeddedProfit',
  'lossValue', 'amount', 'totalValue', 'totalEmbeddedProfit', 'totalExpenses',
  'totalWithdrawals', 'businessWorthAtClose',
]);

const DATE_DETAIL_KEYS = new Set(['startDate', 'endDate']);

export const TimelineDetailModal: React.FC<TimelineDetailModalProps> = ({ event, currencySymbol, onClose }) => {
  const Icon = ACTIVITY_ICON[event.type];
  const colorClass = ACTIVITY_COLOR[event.type];

  const detailEntries = Object.entries(event.details || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-3xl max-w-md w-full shadow-2xl animate-fadeIn max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{ACTIVITY_LABEL[event.type]}</p>
                <h3 className="font-bold text-base text-gray-900 leading-tight mt-0.5">{event.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>{formatDate(event.date)}</span>
            <span>·</span>
            <span>{getEventTime(event.createdAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {event.userName}
            </span>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
            {event.description}
          </p>

          {event.financialImpact && event.financialImpact.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {event.financialImpact.map((fi, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{fi.label}</p>
                  <p className={`text-base font-mono font-bold mt-0.5 ${IMPACT_TONE_CLASSES[fi.tone]}`}>
                    {fi.amount < 0 ? '−' : ''}{formatCurrency(Math.abs(fi.amount), currencySymbol)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {detailEntries.length > 0 && (
            <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
              {detailEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between px-3.5 py-2.5 text-xs gap-3">
                  <span className="text-gray-500 font-medium shrink-0">{DETAIL_KEY_LABELS[key] || key}</span>
                  <span className="text-gray-900 font-semibold text-right break-words">
                    {CURRENCY_DETAIL_KEYS.has(key)
                      ? formatCurrency(Number(value), currencySymbol)
                      : DATE_DETAIL_KEYS.has(key)
                      ? formatDate(String(value))
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
