import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, DollarSign, Users, UserPlus, Trash2, X, Check, ShieldCheck, Sparkles, Key, AlertCircle, Edit3, UserMinus, UserX, UserCheck, Loader2, KeyRound, Smartphone, RefreshCw, Lock } from 'lucide-react';
import { StaffMember } from '../types';
import { BUSINESS_CATEGORY_GROUPS } from '../data/businessCategories';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { BusinessProfileSetupModal } from './BusinessProfileSetupModal';

interface SettingsModalProps {
  onClose: () => void;
  autoOpenProfileEdit?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, autoOpenProfileEdit = false }) => {
  // Pilot safety hardening — "Clear All Data" / "Load Sample Data" gate.
  //
  // import.meta.env.DEV is Vite's own built-in flag: automatically true
  // only for a genuine local `vite dev` server, automatically false for
  // ANY `vite build` output — including this app's own production/pilot
  // deployment. There is nothing to configure and nothing a developer
  // could forget to set for the default (local dev) case.
  //
  // VITE_ENABLE_DEMO_TOOLS is an explicit, opt-in escape hatch for a
  // future deliberate demo/staging build that IS built via `vite build`
  // but still wants these tools available — same VITE_*-prefixed,
  // build-time-baked, client-visible convention already used for Firebase
  // config (src/lib/firebase.ts). Client-visible is fine here: per the
  // task's own framing, this flag's purpose is to prevent *accidental*
  // production exposure, not to serve as an authorization boundary — the
  // real authorization boundary (who can call clearAllData at all) is
  // already `isOwner`, unchanged, and ultimately firestore.rules itself.
  //
  // Fail-safe by construction: if VITE_ENABLE_DEMO_TOOLS is missing,
  // misspelled, or set to anything other than the literal string 'true',
  // this condition is false — the tools are hidden. There is no code path
  // where an unset/ambiguous flag results in the tools being shown; a
  // real production build must both (a) not be a `vite dev` server, which
  // it never is, and (b) not have this variable explicitly set to 'true'
  // in its own build environment, which nobody would do for a real pilot
  // deployment.
  const demoToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

  const {
    business,
    isOwner,
    canManagerManageStaff,
    currencySymbol,
    setCurrencySymbol,
    businessCategory,
    setBusinessCategory,
    updateBusinessProfile,
    staffMembers,
    addStaffMember,
    deleteStaffMember,
    suspendStaffMember,
    reactivateStaffMember,
    resetStaffPin,
    setStaffTier,
    pairedDevice,
    pairDevice,
    unpairDevice,
    activeBusinessId,
    loadSampleData,
    clearAllData,
    closings,
    backfillClosingLocks,
    products,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'general' | 'staff'>('general');
  const [showProfileEdit, setShowProfileEdit] = useState(autoOpenProfileEdit);

  // Staff creation states
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  // Staff removal states — confirmation is a proper in-app modal, never
  // window.confirm()/alert(), and shows exactly who is about to lose access.
  const [staffPendingDeletion, setStaffPendingDeletion] = useState<StaffMember | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Suspend/reactivate states — suspend goes through the same in-app
  // confirmation pattern as delete (it's a real access lock, even though
  // it's reversible); reactivate is safe enough to run directly per-row.
  const [staffPendingSuspension, setStaffPendingSuspension] = useState<StaffMember | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [reactivatingUid, setReactivatingUid] = useState<string | null>(null);

  // PIN reset states — a small confirm modal since a new PIN isn't shown
  // to the staff member automatically; the owner has to relay it to them.
  const [staffPendingPinReset, setStaffPendingPinReset] = useState<StaffMember | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinResetError, setPinResetError] = useState<string | null>(null);

  // Device pairing states (PIN quick-login on a shared shop device).
  const [pairError, setPairError] = useState<string | null>(null);

  // [Closing Integrity Amendment v1.0] One-time, idempotent, Owner-only
  // migration for Closings recorded before this amendment shipped.
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const handleBackfillClosingLocks = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    setBackfillError(null);
    try {
      const { closingsIndexed, expensesLocked, withdrawalsLocked } = await backfillClosingLocks();
      setBackfillResult(
        closingsIndexed === 0 && expensesLocked === 0 && withdrawalsLocked === 0
          ? 'Já estava tudo em dia — nenhum fecho antigo precisava de bloqueio.'
          : `Aplicado: ${closingsIndexed} período(s) indexado(s), ${expensesLocked} despesa(s) e ${withdrawalsLocked} retirada(s) bloqueadas.`
      );
    } catch (err: any) {
      setBackfillError(err?.message || 'Erro ao aplicar o bloqueio aos fechos anteriores.');
    } finally {
      setBackfillLoading(false);
    }
  };

  // Manager tier/permission states (BDS #16). Admin-only — this modal is
  // never rendered for a Manager, same as the promote button that opens it.
  const [staffPendingTierChange, setStaffPendingTierChange] = useState<StaffMember | null>(null);
  const [tierDraftIsManager, setTierDraftIsManager] = useState(false);
  const [tierDraftClosings, setTierDraftClosings] = useState(false);
  const [tierDraftStaffManagement, setTierDraftStaffManagement] = useState(false);
  const [tierLoading, setTierLoading] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  const openTierModal = (staff: StaffMember) => {
    setTierError(null);
    setTierDraftIsManager(staff.staffTier === 'manager');
    setTierDraftClosings(staff.managerPermissions?.closings === true);
    setTierDraftStaffManagement(staff.managerPermissions?.staffManagement === true);
    setStaffPendingTierChange(staff);
  };

  const handleConfirmTierChange = async () => {
    if (!staffPendingTierChange) return;
    setTierLoading(true);
    setTierError(null);
    try {
      await setStaffTier(
        staffPendingTierChange.uid,
        tierDraftIsManager ? 'manager' : 'staff',
        tierDraftIsManager ? { closings: tierDraftClosings, staffManagement: tierDraftStaffManagement } : undefined
      );
      setStaffSuccess(
        tierDraftIsManager
          ? `${staffPendingTierChange.name} agora é Gestor.`
          : `${staffPendingTierChange.name} voltou ao nível Staff padrão.`
      );
      setStaffPendingTierChange(null);
    } catch (err: any) {
      setTierError(err?.message || 'Erro ao atualizar o nível do funcionário.');
    } finally {
      setTierLoading(false);
    }
  };

  const handleConfirmResetPin = async () => {
    if (!staffPendingPinReset) return;
    if (!/^\d{6}$/.test(newPinValue)) {
      setPinResetError('O PIN deve ter exatamente 6 dígitos numéricos.');
      return;
    }
    setPinResetLoading(true);
    setPinResetError(null);
    try {
      await resetStaffPin(staffPendingPinReset.uid, newPinValue);
      setStaffSuccess(`PIN de ${staffPendingPinReset.name} atualizado. Informe-o do novo PIN.`);
      setStaffPendingPinReset(null);
      setNewPinValue('');
    } catch (err: any) {
      setPinResetError(err?.message || 'Erro ao redefinir o PIN. Tente novamente.');
    } finally {
      setPinResetLoading(false);
    }
  };

  const handleConfirmSuspendStaff = async () => {
    if (!staffPendingSuspension) return;
    setSuspendLoading(true);
    setSuspendError(null);
    try {
      await suspendStaffMember(staffPendingSuspension.uid, suspendReason.trim() || undefined);
      setStaffPendingSuspension(null);
      setSuspendReason('');
      setStaffSuccess(`Acesso de ${staffPendingSuspension.name} suspenso. Pode reativá-lo a qualquer momento.`);
    } catch (err: any) {
      setSuspendError(err?.message || 'Erro ao suspender funcionário. Tente novamente.');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleReactivateStaff = async (staff: StaffMember) => {
    setReactivatingUid(staff.uid);
    setStaffError(null);
    try {
      await reactivateStaffMember(staff.uid);
      setStaffSuccess(`Acesso de ${staff.name} reativado.`);
    } catch (err: any) {
      setStaffError(err?.message || 'Erro ao reativar funcionário. Tente novamente.');
    } finally {
      setReactivatingUid(null);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffPendingDeletion) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteStaffMember(staffPendingDeletion.uid, deleteReason.trim() || undefined);
      setStaffPendingDeletion(null);
      setDeleteReason('');
      setStaffSuccess(`Acesso de ${staffPendingDeletion.name} removido permanentemente.`);
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao remover funcionário. Tente novamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
      setStaffError('Preencha todos os campos do funcionário.');
      return;
    }

    if (!/^\d{6}$/.test(staffPassword)) {
      setStaffError('O PIN deve ter exatamente 6 dígitos numéricos.');
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
              <Store className="w-5 h-5 text-blue-600" /> Definições do Negócio
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
        {(isOwner || canManagerManageStaff) && (
          <div className="grid grid-cols-2 p-2 bg-white border-b border-gray-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('general')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeSection === 'general'
                  ? 'bg-gray-50 text-blue-600 border border-blue-500/30'
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
                  ? 'bg-gray-50 text-blue-600 border border-blue-500/30'
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
              <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-600" /> Perfil do Negócio
                  </h4>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowProfileEdit(true)}
                      className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                  <p><span className="text-gray-500">Nome:</span> <span className="font-semibold text-gray-800">{business?.name || 'N/D'}</span></p>
                  <p><span className="text-gray-500">Contacto:</span> <span className="font-semibold text-gray-800">{business?.contact || 'N/D'}</span></p>
                  <p><span className="text-gray-500">Localização:</span> <span className="font-semibold text-gray-800">{business?.location || 'N/D'}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="font-semibold text-gray-800">{business?.email || 'N/D'}</span></p>
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
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-gray-100/60 border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <span className="truncate font-semibold">{catName}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
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
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-gray-100/60 border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <span>{opt.label} ({opt.symbol})</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data actions. "Ações de Dados" itself may legitimately have
                  something to show in production even with demo tooling
                  disabled — the Closing backfill button below is a real,
                  one-time production migration helper, not a demo/destructive
                  action, and must remain visible on its own existing
                  condition regardless of demoToolsEnabled. The section
                  header/wrapper is therefore gated on "is there anything at
                  all to show," not on demoToolsEnabled alone. */}
              {isOwner && (demoToolsEnabled || closings.length > 0) && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Ações de Dados</h4>
                  <div className="flex flex-wrap gap-2">
                    {/* [Pilot safety hardening] Demo-only — see demoToolsEnabled
                        above. Never shown in a real production/pilot build. */}
                    {demoToolsEnabled && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Carregar dados de exemplo no seu negócio?')) {
                            await loadSampleData();
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-700 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Carregar Dados de Exemplo
                      </button>
                    )}
                    {/* [Closing Integrity Amendment v1.0 — backfill decision]
                        Only relevant if there's at least one Closing that
                        might predate this amendment. Idempotent — safe to
                        click more than once. A real production feature, not
                        demo tooling — intentionally NOT gated by
                        demoToolsEnabled. */}
                    {closings.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBackfillClosingLocks}
                        disabled={backfillLoading}
                        className="px-3 py-2 rounded-xl bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-800 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {backfillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                        {backfillLoading ? 'A aplicar...' : 'Aplicar Bloqueio a Fechos Anteriores'}
                      </button>
                    )}
                    {/* [Pilot safety hardening] Demo-only, and destructive —
                        see demoToolsEnabled above. Never shown in a real
                        production/pilot build, regardless of how much real
                        business data exists. */}
                    {demoToolsEnabled && products.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Tem a certeza que deseja limpar TODOS os produtos e lotes? Esta ação não pode ser desfeita. (Fechos permanentes não são removidos por esta ação.)')) {
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
                  {backfillResult && (
                    <p className="text-[11px] text-emerald-700 mt-2">{backfillResult}</p>
                  )}
                  {backfillError && (
                    <p className="text-[11px] text-rose-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {backfillError}</p>
                  )}
                </div>
              )}
            </>
          )}

          {activeSection === 'staff' && (isOwner || canManagerManageStaff) && (
            <div className="space-y-6">
              {/* Device Pairing — PIN quick-login for a shared shop device */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Este Dispositivo
                </h3>

                {!pairedDevice ? (
                  <>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                      Se este é um telefone ou computador <strong>partilhado por vários funcionários desta loja</strong>, configure-o
                      para mostrar um ecrã de login rápido: cada funcionário escolhe o seu nome e introduz o seu PIN, sem precisar de
                      digitar o email. (Se cada funcionário usa o seu próprio telefone, não é necessário configurar nada.)
                    </p>
                    {pairError && (
                      <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {pairError}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          setPairError(null);
                          pairDevice();
                        } catch (err: any) {
                          setPairError(err?.message || 'Erro ao configurar este dispositivo.');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#152d51] py-2.5 rounded-xl transition"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Configurar Este Dispositivo para {business?.name || 'esta loja'}
                    </button>
                  </>
                ) : pairedDevice.businessId === activeBusinessId ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>
                        Configurado para <strong>{pairedDevice.businessName}</strong> — {pairedDevice.staff.length}{' '}
                        {pairedDevice.staff.length === 1 ? 'funcionário' : 'funcionários'} no login rápido.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => pairDevice()}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0B1F3A] bg-white border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Atualizar Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => unpairDevice()}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 py-2.5 rounded-xl transition"
                      >
                        <X className="w-3.5 h-3.5" /> Remover Configuração
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2 mb-3 text-xs text-orange-700 bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Este dispositivo está configurado para <strong>{pairedDevice.businessName}</strong>, não para a loja atual
                        ({business?.name}). Reconfigure para mudar o login rápido para esta loja.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => pairDevice()}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#152d51] py-2.5 rounded-xl transition"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Reconfigurar para {business?.name || 'esta loja'}
                    </button>
                  </>
                )}
              </div>

              {/* Form to Add Staff */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Adicionar Novo Funcionário (Staff)
                </h3>
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Loja: <span className="text-blue-700">{business?.name || '—'}</span>
                </p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Os funcionários usam estas credenciais para entrar na aplicação. Eles têm acesso <strong>apenas aos formulários de introdução</strong> (Stock, Quebra, Despesa) e <strong>não conseguem ver preços, custos, margens nem relatórios</strong>. Este funcionário terá acesso <strong>apenas a esta loja</strong> — para adicionar funcionários a outra loja, mude de loja primeiro em "Meu Negócio".
                </p>

                {staffError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                {staffSuccess && (
                  <div className="mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 text-xs flex items-center gap-2">
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
                      className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-xs text-gray-900 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-xs text-gray-900 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        PIN de Acesso (6 dígitos)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Ex: 483920"
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-xs text-gray-900 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tracking-widest"
                      />
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        O funcionário usa este PIN para entrar — tanto no login normal como no login rápido de um dispositivo partilhado.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="btn-primary w-full py-2.5 px-4 text-xs disabled:opacity-50"
                  >
                    {staffLoading ? 'A registar...' : 'Criar Conta de Funcionário'}
                  </button>
                </form>
              </div>

              {/* Staff List */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Lista de Funcionários Ativos ({staffMembers.length})
                </h3>

                {staffMembers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic bg-white p-3 rounded-xl border border-gray-200">
                    Ainda não registou nenhum funcionário.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-200/60 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                    {staffMembers.map(staff => (
                      <div key={staff.uid} className="p-3 flex items-center justify-between text-xs hover:bg-white/60 transition">
                        <div>
                          <span className="font-bold text-gray-800 block">{staff.name}</span>
                          <span className="text-[11px] text-gray-500 font-mono">{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {staff.suspended ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/30">
                              Suspenso
                            </span>
                          ) : staff.staffTier === 'manager' ? (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/30"
                              title={`Fecho: ${staff.managerPermissions?.closings ? 'sim' : 'não'} · Gestão de equipa: ${staff.managerPermissions?.staffManagement ? 'sim' : 'não'}`}
                            >
                              Gestor
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/30">
                              Staff
                            </span>
                          )}

                          {/* Promote/demote + permission toggles — Admin-only.
                              A Manager (even one granted staffManagement) never
                              sees this: only the Admin may change staffTier or
                              managerPermissions for any account (BDS #16). */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => openTierModal(staff)}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-500/10 rounded-lg transition"
                              title="Gerir Nível de Gestor"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPinResetError(null);
                              setNewPinValue('');
                              setStaffPendingPinReset(staff);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition"
                            title="Redefinir PIN"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {staff.suspended ? (
                            <button
                              type="button"
                              onClick={() => handleReactivateStaff(staff)}
                              disabled={reactivatingUid === staff.uid}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition disabled:opacity-50"
                              title="Reativar Funcionário"
                            >
                              {reactivatingUid === staff.uid ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspendError(null);
                                setSuspendReason('');
                                setStaffPendingSuspension(staff);
                              }}
                              className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-500/10 rounded-lg transition"
                              title="Suspender Funcionário"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteReason('');
                              setStaffPendingDeletion(staff);
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

      {staffPendingDeletion && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <UserMinus className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Remover Funcionário</h3>
                <p className="text-[11px] text-gray-500">Esta ação é permanente e imediata.</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-bold text-gray-900">{staffPendingDeletion.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-mono text-gray-900">{staffPendingDeletion.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Função</span>
                  <span className="font-bold text-gray-900">Staff</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Negócio</span>
                  <span className="font-bold text-gray-900">{business?.name || 'O meu Negócio'}</span>
                </div>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Esta ação remove permanentemente o login e o acesso de{' '}
                  <span className="font-bold">{staffPendingDeletion.name}</span> ao Sabush. Não pode ser desfeita.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Motivo (opcional)</label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Ex: Fim de contrato"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              {deleteError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {deleteError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setStaffPendingDeletion(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStaff}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleteLoading ? 'A remover...' : 'Remover Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffPendingSuspension && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Suspender Funcionário</h3>
                <p className="text-[11px] text-gray-500">Bloqueia o acesso imediatamente — pode reativar quando quiser.</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-bold text-gray-900">{staffPendingSuspension.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-mono text-gray-900">{staffPendingSuspension.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Negócio</span>
                  <span className="font-bold text-gray-900">{business?.name || 'O meu Negócio'}</span>
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-700 leading-relaxed">
                  <span className="font-bold">{staffPendingSuspension.name}</span> deixa de conseguir entrar na aplicação de imediato.
                  Nenhum dado que já registou é apagado — pode reativar o acesso a qualquer momento.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Motivo (opcional)</label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="Ex: Férias, investigação em curso"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              {suspendError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {suspendError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setStaffPendingSuspension(null);
                  setSuspendError(null);
                }}
                disabled={suspendLoading}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspendStaff}
                disabled={suspendLoading}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {suspendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                {suspendLoading ? 'A suspender...' : 'Suspender Acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffPendingPinReset && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Redefinir PIN</h3>
                <p className="text-[11px] text-gray-500">Para {staffPendingPinReset.name}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Novo PIN (6 dígitos)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={newPinValue}
                  onChange={e => setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 573920"
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tracking-widest"
                />
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                O PIN antigo deixa de funcionar de imediato. Informe {staffPendingPinReset.name} do novo PIN diretamente — não é enviado automaticamente.
              </p>

              {pinResetError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {pinResetError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setStaffPendingPinReset(null);
                  setPinResetError(null);
                }}
                disabled={pinResetLoading}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPin}
                disabled={pinResetLoading || newPinValue.length !== 6}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {pinResetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                {pinResetLoading ? 'A guardar...' : 'Redefinir PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffPendingTierChange && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Gerir Nível de Gestor</h3>
                <p className="text-[11px] text-gray-500">Para {staffPendingTierChange.name}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Promover a Gestor</span>
                  <span className="text-[11px] text-gray-500">
                    Continua a ser uma conta Staff — apenas ganha as permissões que escolher abaixo.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={tierDraftIsManager}
                  onChange={e => setTierDraftIsManager(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 shrink-0"
                />
              </label>

              {tierDraftIsManager && (
                <div className="space-y-2 pl-1">
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Permissões concedidas</p>

                  <label className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-2xl cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Fecho Periódico (Closings)</span>
                      <span className="text-[11px] text-gray-500">Pode realizar o Fecho Mensal/Anual em seu nome.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tierDraftClosings}
                      onChange={e => setTierDraftClosings(e.target.checked)}
                      className="w-5 h-5 accent-purple-600 shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-2xl cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Gestão de Equipa</span>
                      <span className="text-[11px] text-gray-500">
                        Pode adicionar, suspender, reativar e remover Staff — nunca outro Gestor nem a sua conta.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tierDraftStaffManagement}
                      onChange={e => setTierDraftStaffManagement(e.target.checked)}
                      className="w-5 h-5 accent-purple-600 shrink-0"
                    />
                  </label>
                </div>
              )}

              {tierError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {tierError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setStaffPendingTierChange(null);
                  setTierError(null);
                }}
                disabled={tierLoading}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTierChange}
                disabled={tierLoading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {tierLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {tierLoading ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
