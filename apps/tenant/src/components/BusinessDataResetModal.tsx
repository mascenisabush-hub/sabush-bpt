// SABUSH BPT — "Repor dados" (factory data reset), Owner-requested 2026-09-29.
//
// Owner/Admin only (SettingsModal renders this only for isOwner; the server
// enforces it again). Steps:
//   1. If the business has no reset password yet, create one — creating it
//      NEVER deletes anything.
//   2. Choose what to reset: everything, or one or more areas. Dependencies
//      are applied and shown (catalog ⇒ stock ⇒ business worth), mirroring
//      server/businessDataReset.ts, which is the authority.
//   3. Enter the reset password and type APAGAR, then confirm.
// The deletion itself runs on the server (resetBusinessData); afterwards the
// app reloads so every screen starts from the fresh state.
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Lock, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

import { RESET_AREAS, expandAreas, type AreaScope } from '../lib/businessDataResetScopes';
type ResetScope = 'all' | AreaScope;

export const CONFIRM_WORD = 'APAGAR';

export const BusinessDataResetModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { getClearDataPasswordStatus, setClearDataPassword, resetBusinessData } = useApp();
  const [step, setStep] = useState<'loading' | 'set-password' | 'choose' | 'confirm' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState<AreaScope[]>([]);
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [deletedTotal, setDeletedTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getClearDataPasswordStatus()
      .then(({ configured }) => {
        if (!cancelled) setStep(configured ? 'choose' : 'set-password');
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || 'Não foi possível verificar a password de reposição.');
          setStep('choose');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effective = expandAreas(selected, all);
  const autoAdded = effective.filter((s) => !all && !selected.includes(s));

  const toggle = (scope: AreaScope) =>
    setSelected((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  const handleSetPassword = async () => {
    setError(null);
    if (newPassword.length < 6) return setError('A password deve ter pelo menos 6 caracteres.');
    if (newPassword !== newPasswordConfirm) return setError('As passwords não coincidem.');
    setBusy(true);
    try {
      await setClearDataPassword(newPassword);
      setNewPassword('');
      setNewPasswordConfirm('');
      setStep('choose');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível definir a password.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    if (!password) return setError('Introduza a password de reposição.');
    if (confirmWord.trim().toUpperCase() !== CONFIRM_WORD) return setError(`Escreva ${CONFIRM_WORD} para confirmar.`);
    setBusy(true);
    try {
      const scopes: ResetScope[] = all ? ['all'] : effective;
      const result = await resetBusinessData(password, scopes);
      setDeletedTotal(Object.values(result.deletedCounts).reduce((sum, n) => sum + n, 0));
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Erro ao repor os dados.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const titleFor = (scope: AreaScope) => RESET_AREAS.find((a) => a.scope === scope)?.title ?? scope;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="data-reset-title">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-rose-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="data-reset-title" className="text-sm font-bold text-gray-900">Repor dados do negócio</h3>
            <p className="text-[11px] text-gray-500">Apaga dados de forma permanente — não é possível desfazer.</p>
          </div>
          {step !== 'done' && (
            <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {step === 'loading' && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> A verificar…
            </p>
          )}

          {step === 'set-password' && (
            <>
              <p className="text-[13px] text-gray-700 leading-relaxed">
                Crie primeiro uma <strong>password de reposição</strong>. Ela será pedida sempre que alguém tentar apagar
                dados deste negócio. Criar a password <strong>não apaga nada</strong>.
              </p>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova password (mínimo 6 caracteres)" className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm" autoFocus />
              <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="Repita a password" className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm" />
              <button type="button" onClick={handleSetPassword} disabled={busy} className="w-full py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Criar password
              </button>
            </>
          )}

          {step === 'choose' && (
            <>
              <p className="text-[13px] text-gray-700">O que pretende repor?</p>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${all ? 'border-rose-400 bg-rose-50' : 'border-gray-200'}`}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-rose-700">Tudo — reposição de fábrica</span>
                  <span className="block text-[12px] text-gray-600">
                    Todas as áreas abaixo, mais o histórico de atividade. O negócio recomeça do zero: catálogo, stock,
                    caixa e valor de negócio a zero.
                  </span>
                </span>
              </label>
              {!all &&
                RESET_AREAS.map((area) => {
                  const isAuto = autoAdded.includes(area.scope);
                  const checked = selected.includes(area.scope) || isAuto;
                  return (
                    <label key={area.scope} className={`flex items-start gap-3 p-3 rounded-xl border ${checked ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200'} ${isAuto ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={checked} disabled={isAuto} onChange={() => toggle(area.scope)} className="mt-1" />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{area.title}</span>
                        <span className="block text-[12px] text-gray-600">{area.description}</span>
                        {isAuto && (
                          <span className="block text-[11px] font-semibold text-rose-700 mt-0.5">
                            Incluído automaticamente — depende do que escolheu acima.
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-[12px] text-gray-600">
                <strong>Nunca é apagado:</strong> o perfil do negócio, os funcionários e as suas contas, a subscrição e os
                pagamentos, e a própria password de reposição.
              </div>
              <button type="button" disabled={effective.length === 0} onClick={() => { setError(null); setStep('confirm'); }} className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-40">
                Continuar
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[13px] text-rose-900">
                  <p className="font-semibold">Vai apagar permanentemente:</p>
                  <p>{all ? 'Tudo (reposição de fábrica).' : effective.map(titleFor).join(', ') + '.'}</p>
                  <p className="mt-1 text-[12px]">Não é possível desfazer. Os outros dispositivos deste negócio também deixam de ver estes dados.</p>
                </div>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password de reposição" className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm" autoFocus />
              <input type="text" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} placeholder={`Escreva ${CONFIRM_WORD} para confirmar`} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm" autoCapitalize="characters" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('choose')} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">
                  Voltar
                </button>
                <button type="button" onClick={handleReset} disabled={busy || confirmWord.trim().toUpperCase() !== CONFIRM_WORD || !password} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Apagar permanentemente
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-[13px] text-gray-800">
                  <p className="font-semibold">Dados repostos.</p>
                  <p>{deletedTotal} registo(s) apagado(s). A aplicação vai recarregar para começar do novo estado.</p>
                </div>
              </div>
              <button type="button" onClick={() => window.location.reload()} className="w-full py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold">
                Recarregar agora
              </button>
            </>
          )}

          {error && (
            <p className="text-[12px] text-rose-600 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
