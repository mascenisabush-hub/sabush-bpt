import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Receipt, CheckCircle2, ArrowRight } from 'lucide-react';

interface AddExpenseViewProps {
  onComplete: () => void;
}

const COMMON_CATEGORIES = [
  'Renda',
  'Água / Luz',
  'Transporte',
  'Salários',
  'Manutenção',
  'Outro',
];

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({ onComplete }) => {
  const { addExpense, currencySymbol } = useApp();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Por favor descreva a despesa (ex.: Renda da loja, Conta de luz...).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Por favor introduza um valor válido superior a 0.');
      return;
    }

    addExpense({
      date,
      description: description.trim(),
      amount: numAmount,
      category: category.trim() || undefined,
    });

    setSubmittedMessage(`Registada despesa de ${formatCurrency(numAmount, currencySymbol)}.`);

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        {/* Title */}
        <div className="flex items-center space-x-3 pb-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900">Registar Despesa</h2>
            <p className="text-xs text-gray-500">
              Registe custos do negócio como renda, água/luz, transporte ou outras despesas operacionais.
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Despesa Registada!</h3>
            <p className="text-sm text-blue-700 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 my-5">
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Descrição da Despesa
              </label>
              <input
                type="text"
                required
                placeholder="ex.: Renda da loja, Conta de luz, Combustível..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Data da Despesa
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Valor ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Category Free Text & Suggestion Chips */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Categoria (opcional)
              </label>
              <input
                type="text"
                placeholder="ex.: Renda, Água/Luz, Transporte..."
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-2"
              />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[11px] text-gray-500 self-center mr-1">Sugestões Rápidas:</span>
                {COMMON_CATEGORIES.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCategory(chip)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-medium transition border border-gray-300/60 active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[56px] py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition shadow-lg shadow-blue-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <span>Registar Despesa</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
