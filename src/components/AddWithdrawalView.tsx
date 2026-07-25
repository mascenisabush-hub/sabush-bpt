import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { HandCoins, CheckCircle2, ArrowRight, Info } from 'lucide-react';

interface AddWithdrawalViewProps {
  onComplete: () => void;
}

const COMMON_REASONS = [
  'Uso Pessoal',
  'Salário',
  'Família',
  'Emergência',
  'Casa',
  'Veículo',
  'Outro',
];

export const AddWithdrawalView: React.FC<AddWithdrawalViewProps> = ({ onComplete }) => {
  const { addWithdrawal, currencySymbol } = useApp();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Por favor introduza um valor válido superior a 0.');
      return;
    }

    addWithdrawal({
      date,
      amount: numAmount,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSubmittedMessage(`Levantamento de ${formatCurrency(numAmount, currencySymbol)} registado.`);

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        {/* Title */}
        <div className="flex items-center space-x-3 pb-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900">Registar Levantamento do Dono</h2>
            <p className="text-xs text-gray-500">
              Dinheiro retirado do negócio para uso pessoal, salário, família, ou outra necessidade.
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Levantamento Registado!</h3>
            <p className="text-sm text-orange-700 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 my-5">
            <div className="bg-orange-50 border border-orange-500/20 rounded-xl p-3 flex items-start space-x-2 text-xs text-gray-700">
              <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p>
                Um levantamento <strong>não é uma despesa</strong> do negócio — é capital que sai do negócio para o
                dono. Reduz o Capital Disponível, mas não afeta o cálculo de lucro operacional.
              </p>
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Data do Levantamento
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-orange-500"
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
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            {/* Reason Free Text & Suggestion Chips */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Motivo (opcional)
              </label>
              <input
                type="text"
                placeholder="ex.: Uso Pessoal, Salário, Família..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-500 mb-2"
              />

              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[11px] text-gray-500 self-center mr-1">Sugestões Rápidas:</span>
                {COMMON_REASONS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setReason(chip)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-medium transition border border-gray-300/60 active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Notas (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes adicionais sobre este levantamento..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[56px] py-3.5 px-5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base transition shadow-lg shadow-orange-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <span>Registar Levantamento</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
