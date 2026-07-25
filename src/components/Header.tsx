import React, { useState, useEffect } from 'react';
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
  const [settingsAutoOpenProfileEdit, setSettingsAutoOpenProfileEdit] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Allows other views (e.g. the "complete your profile" dashboard nudge) to
  // open Settings directly, without needing this state lifted into App.tsx.
  // detail.openProfileEdit jumps straight into the profile edit form.
  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const detail = (e as CustomEvent<{ openProfileEdit?: boolean }>).detail;
      setSettingsAutoOpenProfileEdit(!!detail?.openProfileEdit);
      setShowSettingsModal(true);
    };
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  return (
    <>
      <header className="bg-white sticky top-0 z-30 border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Business Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 shadow-inner shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-gray-900 flex items-center gap-2">
                {business?.name || 'Batch Profit Tracker'}
              </h1>
              <p
                className="text-[11px] text-gray-500 flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-[280px]"
                title={business?.contact ? `Contacto: ${business.contact}` : undefined}
              >
                <span className="truncate text-orange-600 font-medium">
                  {businessCategory || 'Negócio Registado'}
                </span>
                {business?.location && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="truncate text-gray-500">{business.location}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Tools & Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Owner Settings Button */}
            {isOwner && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-semibold transition"
                title="Definições do Negócio & Staff"
              >
                <Settings className="w-4 h-4 text-orange-600" />
                <span className="hidden md:inline">Definições</span>
              </button>
            )}

            {/* Currency Selector Button (Owner only or viewer) */}
            {isOwner && (
              <button
                onClick={() => setShowCurrencyModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-semibold transition"
                title="Moeda"
              >
                <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                <span>{currencySymbol}</span>
              </button>
            )}

            {/* How it Works / Help Modal */}
            {isOwner && (
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 transition"
                title="Ajuda e Conceito"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Badge & Logout */}
            <div className="flex items-center pl-1 sm:pl-2 border-l border-gray-200 space-x-1.5">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-800 leading-tight">
                  {userProfile?.name || 'Utilizador'}
                </span>
                <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">
                  {isOwner ? '👑 Dono' : '👤 Staff'}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 transition"
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
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          autoOpenProfileEdit={settingsAutoOpenProfileEdit}
        />
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" /> Seleccionar Moeda
              </h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 my-3">
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
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-gray-100/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCurrencyModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 text-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-orange-600 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Como Funciona o Lucro por Lote
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-sm text-gray-700 leading-relaxed">
              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-semibold text-orange-700 block mb-1">1. Sem Necessidade de Registar Vendas Diárias</span>
                <p>
                  Não precisa de registar cada venda individual. Em vez disso, ao registar um <strong>novo lote de stock</strong> de um produto, o sistema infere automaticamente que o <strong>lote anterior foi totalmente vendido</strong> (descontando as quebras registadas).
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-semibold text-orange-700 block mb-1">2. Lotes Fechados = Lucro Finalizado</span>
                <p>
                  Quando um lote é substituído por um novo, o seu lucro é finalizado:
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded text-orange-600 inline-block my-1 font-mono">
                    Unidades Vendidas = Stock Inicial do Lote − Quebras
                  </code>
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-semibold text-orange-700 block mb-1">3. Lote Ativo = Estimativa em Curso</span>
                <p>
                  Para o stock ativo atual, a aplicação mostra uma <strong>estimativa em curso</strong> do lucro projetado caso as unidades restantes sejam vendidas ao preço definido.
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-semibold text-orange-700 block mb-1">4. Quebras e Despesas Gerais</span>
                <p>
                  Registe produtos estragados ou fora de validade em <strong>Quebras</strong>. Custos fixos como renda e eletricidade são registados em <strong>Despesas</strong> para determinar o <strong>Rendimento Líquido</strong> real.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition shadow-md"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
