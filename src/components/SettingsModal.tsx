import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, DollarSign, Users, UserPlus, Trash2, X, Check, ShieldCheck, Sparkles, Key, AlertCircle } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS } from '../data/businessCategories';
import { CURRENCY_OPTIONS } from '../utils/formatters';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    business,
    isOwner,
    currencySymbol,
    setCurrencySymbol,
    businessCategory,
    setBusinessCategory,
    staffMembers,
    addStaffMember,
    deleteStaffMember,
    loadSampleData,
    clearAllData,
    products,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'general' | 'staff'>('general');

  // Staff creation states
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
      setStaffError('Preencha todos os campos do funcionário.');
      return;
    }

    if (staffPassword.length < 6) {
      setStaffError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setStaffLoading(true);

    try {
      await addStaffMember(staffName, staffEmail, staffPassword);
      setStaffSuccess(`Funcionário ${staffName} registado com sucesso!`);
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
    } catch (err: any) {
      console.error('Error adding staff:', err);
      if (err.code === 'auth/email-already-in-use') {
        setStaffError('Este email já está registado na plataforma.');
      } else {
        setStaffError(err.message || 'Erro ao criar conta do funcionário.');
      }
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" /> Definições do Negócio
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {business?.name || 'O meu Negócio'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {isOwner && (
          <div className="grid grid-cols-2 p-2 bg-slate-950 border-b border-slate-800 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('general')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeSection === 'general'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-4 h-4" /> Geral & Moeda
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('staff')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeSection === 'staff'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" /> Funcionários ({staffMembers.length})
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {activeSection === 'general' && (
            <>
              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ramo de Negócio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {BUSINESS_CATEGORY_GROUPS.flatMap(g => g.categories).map(catName => {
                    const isSel = businessCategory === catName;
                    return (
                      <button
                        key={catName}
                        onClick={() => setBusinessCategory(catName)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                          isSel
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="truncate font-semibold">{catName}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Currency selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Moeda Principal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CURRENCY_OPTIONS.map(opt => {
                    const isSel = currencySymbol === opt.symbol;
                    return (
                      <button
                        key={opt.code}
                        onClick={() => setCurrencySymbol(opt.symbol)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                          isSel
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{opt.label} ({opt.symbol})</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demo actions */}
              {isOwner && (
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Ações de Dados</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Carregar dados de exemplo no seu negócio?')) {
                          await loadSampleData();
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Carregar Dados de Exemplo
                    </button>
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Tem a certeza que deseja limpar TODOS os produtos e lotes? Esta ação não pode ser desfeita.')) {
                            await clearAllData();
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar Todos os Dados
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'staff' && isOwner && (
            <div className="space-y-6">
              {/* Form to Add Staff */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Adicionar Novo Funcionário (Staff)
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Os funcionários usam estas credenciais para entrar na aplicação. Eles têm acesso <strong>apenas aos formulários de introdução</strong> (Stock, Quebra, Despesa) e <strong>não conseguem ver preços, custos, margens nem relatórios</strong>.
                </p>

                {staffError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                {staffSuccess && (
                  <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{staffSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddStaff} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nome do Funcionário
                    </label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      placeholder="Ex: Carlos Mambo"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Email do Funcionário
                      </label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={e => setStaffEmail(e.target.value)}
                        placeholder="carlos@negocio.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Palavra-passe Temporária
                      </label>
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {staffLoading ? 'A registar...' : 'Criar Conta de Funcionário'}
                  </button>
                </form>
              </div>

              {/* Staff List */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Lista de Funcionários Ativos ({staffMembers.length})
                </h3>

                {staffMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    Ainda não registou nenhum funcionário.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                    {staffMembers.map(staff => (
                      <div key={staff.uid} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60 transition">
                        <div>
                          <span className="font-bold text-slate-200 block">{staff.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Staff
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Remover acesso ao funcionário ${staff.name}?`)) {
                                await deleteStaffMember(staff.uid);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Remover Funcionário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
