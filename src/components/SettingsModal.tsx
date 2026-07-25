import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, DollarSign, Users, UserPlus, Trash2, X, Check, ShieldCheck, Sparkles, Key, AlertCircle, Edit3 } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS } from '../data/businessCategories';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { BusinessProfileSetupModal } from './BusinessProfileSetupModal';

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
    updateBusinessProfile,
    staffMembers,
    addStaffMember,
    deleteStaffMember,
    loadSampleData,
    clearAllData,
    products,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'general' | 'staff'>('general');
  const [showProfileEdit, setShowProfileEdit] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-600" /> Definições do Negócio
            </h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {business?.name || 'O meu Negócio'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {isOwner && (
          <div className="grid grid-cols-2 p-2 bg-white border-b border-gray-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('general')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeSection === 'general'
                  ? 'bg-gray-50 text-orange-600 border border-orange-500/30'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Store className="w-4 h-4" /> Geral & Moeda
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('staff')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeSection === 'staff'
                  ? 'bg-gray-50 text-orange-600 border border-orange-500/30'
                  : 'text-gray-500 hover:text-gray-800'
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
              {/* Business Profile Card */}
              <div className="p-4 bg-gray-100/60 border border-gray-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-orange-600" /> Perfil do Negócio
                  </h4>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowProfileEdit(true)}
                      className="text-[11px] text-orange-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                  <p><span className="text-gray-400">Nome:</span> <span className="font-semibold text-gray-800">{business?.name || 'N/D'}</span></p>
                  <p><span className="text-gray-400">Contacto:</span> <span className="font-semibold text-gray-800">{business?.contact || 'N/D'}</span></p>
                  <p><span className="text-gray-400">Localização:</span> <span className="font-semibold text-gray-800">{business?.location || 'N/D'}</span></p>
                  <p><span className="text-gray-400">Email:</span> <span className="font-semibold text-gray-800">{business?.email || 'N/D'}</span></p>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                            ? 'bg-orange-50 border-orange-500 text-orange-700'
                            : 'bg-gray-100/60 border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <span className="truncate font-semibold">{catName}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Currency selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                            ? 'bg-orange-50 border-orange-500 text-orange-700'
                            : 'bg-gray-100/60 border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <span>{opt.label} ({opt.symbol})</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demo actions */}
              {isOwner && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Ações de Dados</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Carregar dados de exemplo no seu negócio?')) {
                          await loadSampleData();
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-700 text-xs font-semibold transition flex items-center gap-1.5"
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
                        className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5"
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
              <div className="bg-gray-100/80 border border-gray-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Adicionar Novo Funcionário (Staff)
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Os funcionários usam estas credenciais para entrar na aplicação. Eles têm acesso <strong>apenas aos formulários de introdução</strong> (Stock, Quebra, Despesa) e <strong>não conseguem ver preços, custos, margens nem relatórios</strong>.
                </p>

                {staffError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                {staffSuccess && (
                  <div className="mb-3 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{staffSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddStaff} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Nome do Funcionário
                    </label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      placeholder="Ex: Carlos Mambo"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Email do Funcionário
                      </label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={e => setStaffEmail(e.target.value)}
                        placeholder="carlos@negocio.com"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Palavra-passe Temporária
                      </label>
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {staffLoading ? 'A registar...' : 'Criar Conta de Funcionário'}
                  </button>
                </form>
              </div>

              {/* Staff List */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-600" /> Lista de Funcionários Ativos ({staffMembers.length})
                </h3>

                {staffMembers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic bg-gray-100/40 p-3 rounded-xl border border-gray-200/60">
                    Ainda não registou nenhum funcionário.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-200/60 border border-gray-200 rounded-2xl overflow-hidden bg-gray-100/60">
                    {staffMembers.map(staff => (
                      <div key={staff.uid} className="p-3 flex items-center justify-between text-xs hover:bg-white/60 transition">
                        <div>
                          <span className="font-bold text-gray-800 block">{staff.name}</span>
                          <span className="text-[11px] text-gray-500 font-mono">{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/30">
                            Staff
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Remover acesso ao funcionário ${staff.name}?`)) {
                                await deleteStaffMember(staff.uid);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition"
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
        <div className="p-4 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {showProfileEdit && (
        <BusinessProfileSetupModal
          currentName={business?.name || ''}
          currentCategory={business?.category || ''}
          currentContact={business?.contact || ''}
          currentLocation={business?.location || ''}
          currentEmail={business?.email || ''}
          isFirstTimeSetup={false}
          onClose={() => setShowProfileEdit(false)}
          onSave={async profile => {
            await updateBusinessProfile(profile);
            setShowProfileEdit(false);
          }}
        />
      )}
    </div>
  );
};
