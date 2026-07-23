import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Receipt, CheckCircle2, DollarSign, ArrowRight } from 'lucide-react';

interface AddExpenseViewProps {
  onComplete: () => void;
}

const EXPENSE_CATEGORIES = [
  'Serviços Públicos (Água/Luz)',
  'Renda / Aluguer',
  'Embalagens',
  'Transporte / Frete',
  'Marketing',
  'Manutenção',
  'Limpeza / Higiene',
  'Software / POS',
];

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({ onComplete }) => {
  const { addExpense, currencySymbol } = useApp();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Serviços Públicos (Água/Luz)');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!description.trim()) {
      alert('Por favor introduza uma descrição para a despesa.');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      alert('Por favor introduza um valor positivo válido para a despesa.');
      return;
    }

    addExpense({
      date,
      description,
      amount: numAmount,
      category,
    });

    setSubmittedMessage(`Despesa "${description}" de ${formatCurrency(numAmount, currencySymbol)} registada com sucesso.`);

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {/* Title */}
        <div className="flex items-center space-x-3 pb-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Adicionar Despesa do Negócio</h2>
            <p className="text-xs text-slate-400">
              Registe despesas gerais do negócio (renda, eletricidade, transporte) para calcular o Rendimento Líquido.
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Despesa Adicionada!</h3>
            <p className="text-sm text-purple-300 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 my-5">
            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Data da Despesa
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Valor ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Descrição da Despesa
              </label>
              <input
                type="text"
                required
                placeholder="ex.: Fatura de Eletricidade Mensal, Renda da Loja, Sacos de Papel..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Category Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map(cat => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                        isSelected
                          ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[56px] py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base transition shadow-lg shadow-purple-950/50 flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <span>Guardar Despesa</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
