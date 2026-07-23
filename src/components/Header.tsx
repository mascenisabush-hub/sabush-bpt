import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { TrendingUp, DollarSign, HelpCircle, X, Check, Store, LogOut, Settings, User } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Header: React.FC = () => {
  const {
    business,
    userProfile,
    isOwner,
    isStaff,
    currencySymbol,
    setCurrencySymbol,
    businessCategory,
    logout,
  } = useApp();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      <header className="bg-slate-900 text-white sticky top-0 z-30 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Business Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-slate-100 flex items-center gap-2">
                {business?.name || 'Batch Profit Tracker'}
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="truncate max-w-[120px] sm:max-w-[200px] text-emerald-400 font-medium">
                  {businessCategory || 'Negócio Registado'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Tools & Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Owner Settings Button */}
            {isOwner && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                title="Definições do Negócio & Staff"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Definições</span>
              </button>
            )}

            {/* Currency Selector Button (Owner only or viewer) */}
            {isOwner && (
              <button
                onClick={() => setShowCurrencyModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                title="Moeda"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currencySymbol}</span>
              </button>
            )}

            {/* How it Works / Help Modal */}
            {isOwner && (
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                title="Ajuda e Conceito"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Badge & Logout */}
            <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-800 space-x-1.5">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200 leading-tight">
                  {userProfile?.name || 'Utilizador'}
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  {isOwner ? '👑 Dono' : '👤 Staff'}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition"
                title="Sair (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Seleccionar Moeda
              </h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 my-3">
              Todos os valores e relatórios serão apresentados com a moeda selecionada.
            </p>

            <div className="grid grid-cols-2 gap-2 my-4 max-h-60 overflow-y-auto pr-1">
              {CURRENCY_OPTIONS.map(opt => {
                const isSelected = currencySymbol === opt.symbol;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setCurrencySymbol(opt.symbol);
                      setShowCurrencyModal(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCurrencyModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Como Funciona o Lucro por Lote
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-sm text-slate-300 leading-relaxed">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <span className="font-semibold text-emerald-300 block mb-1">1. Sem Necessidade de Registar Vendas Diárias</span>
                <p>
                  Não precisa de registar cada venda individual. Em vez disso, ao registar um <strong>novo lote de stock</strong> de um produto, o sistema infere automaticamente que o <strong>lote anterior foi totalmente vendido</strong> (descontando as quebras registadas).
                </p>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <span className="font-semibold text-emerald-300 block mb-1">2. Lotes Fechados = Lucro Finalizado</span>
                <p>
                  Quando um lote é substituído por um novo, o seu lucro é finalizado:
                  <br />
                  <code className="text-xs bg-slate-950 px-2 py-1 rounded text-emerald-400 inline-block my-1 font-mono">
                    Unidades Vendidas = Stock Inicial do Lote − Quebras
                  </code>
                </p>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <span className="font-semibold text-emerald-300 block mb-1">3. Lote Ativo = Estimativa em Curso</span>
                <p>
                  Para o stock ativo atual, a aplicação mostra uma <strong>estimativa em curso</strong> do lucro projetado caso as unidades restantes sejam vendidas ao preço definido.
                </p>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <span className="font-semibold text-emerald-300 block mb-1">4. Quebras e Despesas Gerais</span>
                <p>
                  Registe produtos estragados ou fora de validade em <strong>Quebras</strong>. Custos fixos como renda e eletricidade são registados em <strong>Despesas</strong> para determinar o <strong>Rendimento Líquido</strong> real.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-md"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
