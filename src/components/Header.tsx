import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { TrendingUp, DollarSign, HelpCircle, X, Check, Store, LogOut, Settings, User, ChevronDown, Bell, Search } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { ShopSwitcher } from './ShopSwitcher';
import { NAV_TABS, TabType } from '../data/navigationTabs';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    business,
    userProfile,
    isOwner,
    isStaff,
    currencySymbol,
    setCurrencySymbol,
    businessCategory,
    isBusinessProfileComplete,
    logout,
  } = useApp();

  const visibleTabs = isStaff ? NAV_TABS.filter(t => !t.ownerOnly) : NAV_TABS;

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsAutoOpenProfileEdit, setSettingsAutoOpenProfileEdit] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close the profile menu on outside click — same behaviour users already
  // expect from any dropdown, just applied to the new consolidated menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-3">
          {/* Single unified row: business info (left) · action icons (center) ·
              profile (right). If the icon row doesn't fit next to the other
              two on narrower desktop widths, it simply wraps onto its own
              line below — everything still reads as one header block, no
              separate grey bar. */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            {/* Business name — falls back to a quiet placeholder, never a blank/generic app name */}
            {business?.name ? (
              <div className="min-w-0 shrink-0">
                {isOwner ? (
                  <ShopSwitcher />
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-0.5">
                    Meu Negócio
                  </p>
                )}
                <h1 className="font-extrabold text-xl sm:text-2xl leading-tight tracking-tight text-[#0B1F3A] truncate">
                  {business.name}
                </h1>
                <p
                  className="text-[11px] text-gray-500 flex items-center gap-1.5 truncate max-w-[240px] sm:max-w-[360px] mt-1"
                  title={business?.contact ? `Contacto: ${business.contact}` : undefined}
                >
                  <span className="truncate text-gray-600 font-bold">
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
            ) : (
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#F7F8FA] text-gray-400 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-bold text-gray-400">Perfil não definido</span>
              </div>
            )}

            {/* Global search — visual home for a "Ctrl+K"-style search,
                matching the new premium shell. Product-level search/filtering
                still lives in the Dashboard's own toolbar; this is
                presentational until a real system-wide search is wired up. */}
            <div className="hidden md:flex flex-1 max-w-md mx-auto order-last lg:order-none">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  placeholder="Pesquisar no sistema..."
                  className="w-full bg-[#F5F7FA] border border-transparent rounded-xl pl-10 pr-16 py-2.5 text-sm text-gray-500 placeholder-gray-400 cursor-default"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded-md px-1.5 py-0.5">
                  Ctrl+K
                </span>
              </div>
            </div>

            {/* Notifications */}
            <div className="relative shrink-0" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                title="Notificações"
                className="w-9 h-9 rounded-full bg-[#F5F7FA] hover:bg-[#D4AF37]/10 flex items-center justify-center text-gray-500 hover:text-[#0B1F3A] transition"
              >
                <Bell className="w-4 h-4" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl elevation-2 p-4 z-40 text-center">
                  <p className="text-xs text-gray-500">Sem notificações novas.</p>
                </div>
              )}
            </div>

            {/* Single profile control — every prior action still lives here, just consolidated */}
            <div className="relative shrink-0" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 rounded-full bg-[#F7F8FA] hover:bg-[#D4AF37]/10 transition"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#0B1F3A] leading-tight">
                    {userProfile?.name || 'Utilizador'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[#D4AF37] font-bold">
                    {isOwner ? 'Dono' : 'Staff'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl elevation-2 py-2 z-40">
                  {isOwner && (
                    <button
                      onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Definições
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowCurrencyModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      Moeda <span className="ml-auto text-gray-400">{currencySymbol}</span>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowHelpModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      Ajuda e Conceito
                    </button>
                  )}
                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action nav row — same 11 tabs/handlers as before, now back on
              the top bar as a horizontal pill row instead of a sidebar. */}
          <nav className="hidden md:flex items-center flex-wrap gap-2 pt-4">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-2xl text-[12.5px] font-bold transition active:scale-[0.97] ${
                    isActive
                      ? 'bg-[#D4AF37] text-white shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]'
                      : 'bg-[#F5F7FA] text-gray-600 hover:bg-[#0B1F3A]/5 hover:text-[#0B1F3A]'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-xl shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-[#0B1F3A]'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </span>
                  {tab.shortLabel}
                </button>
              );
            })}
          </nav>

          {/* Small inline reminder — replaces the old full-width banner. Same action
              (jumps into Settings → profile edit), just quiet instead of dominant. */}
          {isOwner && !isBusinessProfileComplete && !reminderDismissed && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('open-settings', { detail: { openProfileEdit: true } })
                )
              }
              className="group flex items-center gap-1.5 pt-2.5 text-[11.5px] text-[#D4AF37] hover:text-[#B8962E] transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="font-bold">Complete o perfil do seu negócio</span>
              <X
                className="w-3 h-3 ml-1 text-gray-300 group-hover:text-gray-500"
                onClick={(e) => { e.stopPropagation(); setReminderDismissed(true); }}
              />
            </button>
          )}
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
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 text-gray-900 elevation-3">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" /> Seleccionar Moeda
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
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-gray-100/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCurrencyModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 text-gray-900 elevation-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
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
                <span className="font-bold text-blue-700 block mb-1">1. Sem Necessidade de Registar Vendas Diárias</span>
                <p>
                  Não precisa de registar cada venda individual. Em vez disso, ao registar um <strong>novo lote de stock</strong> de um produto, o sistema infere automaticamente que o <strong>lote anterior foi totalmente vendido</strong> (descontando as quebras registadas).
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-bold text-blue-700 block mb-1">2. Lotes Fechados = Lucro Finalizado</span>
                <p>
                  Quando um lote é substituído por um novo, o seu lucro é finalizado:
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded text-blue-600 inline-block my-1 font-mono">
                    Unidades Vendidas = Stock Inicial do Lote − Quebras
                  </code>
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-bold text-blue-700 block mb-1">3. Lote Ativo = Estimativa em Curso</span>
                <p>
                  Para o stock ativo atual, a aplicação mostra uma <strong>estimativa em curso</strong> do lucro projetado caso as unidades restantes sejam vendidas ao preço definido.
                </p>
              </div>

              <div className="bg-gray-100/60 p-3.5 rounded-xl border border-gray-300/60">
                <span className="font-bold text-blue-700 block mb-1">4. Quebras e Despesas Gerais</span>
                <p>
                  Registe produtos estragados ou fora de validade em <strong>Quebras</strong>. Custos fixos como renda e eletricidade são registados em <strong>Despesas</strong> para determinar o <strong>Rendimento Líquido</strong> real.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-md"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
