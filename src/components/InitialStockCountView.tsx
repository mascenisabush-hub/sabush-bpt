import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { Wallet, Plus, Trash2, ArrowRight, Info, CheckCircle2, ShieldCheck } from 'lucide-react';

interface InitialStockCountViewProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface CountRowItem {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
}

export const InitialStockCountView: React.FC<InitialStockCountViewProps> = ({ onComplete, onSkip }) => {
  const { businessCategory, currencySymbol, recordStockCount, hasInitialStockCount } = useApp();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createEmptyRow = (): CountRowItem => ({
    id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    productName: '',
    quantity: '',
    unit: suggestedUnits[0] || 'un',
    costPrice: '',
  });

  const [date, setDate] = useState(getTodayDateString());
  const [rows, setRows] = useState<CountRowItem[]>([createEmptyRow(), createEmptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const updateRow = (id: string, fields: Partial<CountRowItem>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...fields } : row)));
  };

  const handleAddRow = () => setRows((prev) => [...prev, createEmptyRow()]);

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const totalCapital = rows.reduce((acc, row) => {
    const q = parseFloat(row.quantity) || 0;
    const c = parseFloat(row.costPrice) || 0;
    return acc + q * c;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hasInitialStockCount) {
      setError('O Capital Inicial já foi definido anteriormente e não pode ser alterado.');
      return;
    }

    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      if (!trimmedName) continue;

      const numQty = parseFloat(row.quantity) || 0;
      const numCost = parseFloat(row.costPrice) || 0;

      if (numQty <= 0) {
        setError(`Introduza uma quantidade maior que zero para "${trimmedName}".`);
        return;
      }
      if (numCost < 0) {
        setError(`Introduza um custo válido para "${trimmedName}".`);
        return;
      }

      itemsToSave.push({
        productName: trimmedName,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
      });
    }

    if (itemsToSave.length === 0) {
      setError('Adicione pelo menos um produto com quantidade e custo.');
      return;
    }

    setIsSaving(true);
    try {
      await recordStockCount({ type: 'initial', date, items: itemsToSave });
      setSavedMessage('Capital Inicial registado com sucesso!');
      setTimeout(() => onComplete(), 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar o Capital Inicial.');
    } finally {
      setIsSaving(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-3">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-900">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Capital Inicial: <span className="font-bold text-gray-800">{formatCurrency(totalCapital, currencySymbol)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">Contagem de Stock Inicial (Capital Inicial)</h2>
              <p className="text-[11px] text-gray-500">
                Registe tudo o que já possui no seu negócio — isto NÃO é uma compra.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-3 flex items-start space-x-2 text-xs text-gray-700">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Esta contagem estabelece o seu <strong>Capital Inicial do Negócio</strong> — o ponto de partida contra o
            qual todo o crescimento (ou perda) de capital será medido a partir de agora. Ao contrário de uma compra
            de stock (lote), esta contagem <strong>não cria um lote de compra</strong>. Só pode ser feita uma vez.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-w-xs">
            <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
              Data da Contagem
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs font-mono"
            />
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row.id} className="bg-slate-50 border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Produto #{idx + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Arroz"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 text-xs"
                    />
                  </div>

                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Qtd</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-800 text-xs font-mono"
                      />
                    </div>
                    <div className="w-16">
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Unid</label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-1 py-1 text-gray-800 text-xs text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
                      Custo/Un ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.costPrice}
                      onChange={(e) => updateRow(row.id, { costPrice: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Valor Total</label>
                    <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 text-xs font-mono font-bold">
                      {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.costPrice) || 0), currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-gray-200 hover:border-blue-500/60 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold text-xs transition flex items-center justify-center space-x-2 group"
          >
            <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>+ Adicionar outro produto</span>
          </button>

          <div className="bg-white border-2 border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="font-bold text-gray-800 text-sm">Capital Inicial Total</span>
            </div>
            <span className="font-black text-lg text-blue-700 font-mono">
              {formatCurrency(totalCapital, currencySymbol)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="sm:w-auto w-full py-3 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition"
              >
                Configurar mais tarde
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm transition shadow-lg shadow-blue-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
            >
              <span>{isSaving ? 'A guardar...' : 'Confirmar Capital Inicial'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
