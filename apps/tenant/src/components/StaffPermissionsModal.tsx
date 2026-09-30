import React, { useMemo, useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { StaffMember } from '../types';
import {
  ALL_PERMISSION_KEYS,
  MANAGER_PRESET_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  effectivePermissions,
  normalizePermissions,
  permissionKey,
  type PermissionArea,
  type PermissionMap,
} from '../../../../packages/shared-types/permissions';

interface Props {
  staff: StaffMember;
  onClose: () => void;
}

// Human labels for each permission area (Portuguese, like the rest of Settings).
const AREA_LABELS: Array<{ area: PermissionArea; label: string; hint: string; group: string }> = [
  { group: 'Stock', area: 'addStock', label: 'Adicionar Stock', hint: 'Registar entradas de stock' },
  { group: 'Stock', area: 'quebras', label: 'Quebras', hint: 'Registar perdas e quebras' },
  { group: 'Stock', area: 'stocks', label: 'Stocks e custos', hint: 'Ver lotes, custos e lucros; editar/arquivar' },
  { group: 'Stock', area: 'catalog', label: 'Catálogo de produtos', hint: 'Ver e editar produtos' },
  { group: 'Stock', area: 'stockCount', label: 'Contagem de stock', hint: 'Fazer e confirmar contagens' },
  { group: 'Negócio', area: 'dashboard', label: 'Painel', hint: 'Ver o painel geral do negócio' },
  { group: 'Negócio', area: 'declareWorth', label: 'Declarar Valor do Negócio', hint: 'Declarar o valor do negócio' },
  { group: 'Negócio', area: 'closings', label: 'Fecho de período', hint: 'Fechar e reabrir períodos' },
  { group: 'Negócio', area: 'reports', label: 'Relatórios', hint: 'Ver relatórios' },
  { group: 'Negócio', area: 'timeline', label: 'Histórico', hint: 'Ver o histórico do negócio' },
  { group: 'Dinheiro', area: 'cashFlow', label: 'Fluxo de caixa e dívidas', hint: 'Caixa, contas a receber e a pagar, crédito de fornecedor' },
  { group: 'Dinheiro', area: 'expenses', label: 'Despesas', hint: 'Ver e registar despesas' },
  { group: 'Dinheiro', area: 'withdrawals', label: 'Levantamentos', hint: 'Ver e registar levantamentos do dono' },
  { group: 'Dinheiro', area: 'investments', label: 'Investimentos', hint: 'Investimento inicial e do proprietário' },
  { group: 'Equipa', area: 'staffManagement', label: 'Gerir funcionários', hint: 'Adicionar, suspender e remover funcionários (só gestores)' },
];

export const StaffPermissionsModal: React.FC<Props> = ({ staff, onClose }) => {
  const { setStaffPermissions } = useApp();
  const isManager = staff.staffTier === 'manager';

  const [draft, setDraft] = useState<PermissionMap>(() =>
    normalizePermissions(effectivePermissions({ role: 'staff', ...staff }), { isManager })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const groups = useMemo(() => {
    const g: Record<string, typeof AREA_LABELS> = {};
    for (const a of AREA_LABELS) (g[a.group] ||= []).push(a);
    return Object.entries(g);
  }, []);

  const set = (key: ReturnType<typeof permissionKey>, value: boolean) => {
    setSaved(false);
    setDraft(prev => {
      const next = { ...prev, [key]: value };
      const [area, level] = key.split('_') as [PermissionArea, 'view' | 'act'];
      // act implies view; removing view removes act
      if (level === 'act' && value) next[permissionKey(area, 'view')] = true;
      if (level === 'view' && !value) next[permissionKey(area, 'act')] = false;
      return next;
    });
  };

  const applyPreset = (preset: PermissionMap) => {
    setSaved(false);
    setDraft(normalizePermissions(preset, { isManager }));
  };

  const activeCount = ALL_PERMISSION_KEYS.filter(k => draft[k]).length;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await setStaffPermissions(staff.uid, draft);
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar as permissões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay z-[60] bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="staff-perm-title">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden modal-card flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="staff-perm-title" className="text-sm font-bold text-gray-900 truncate">Permissões de {staff.name}</h3>
            <p className="text-[11px] text-gray-500">
              {isManager ? 'Gestor' : 'Funcionário'} · {activeCount} permissões ativas
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voltar + Guardar stay at the top, never under a phone's browser toolbar. */}
        <div className="shrink-0 px-4 sm:px-5 py-2.5 bg-gray-50 border-b border-gray-200 space-y-2">
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
              Voltar
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60 flex items-center justify-center gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'A guardar...' : saved ? 'Guardado ✓' : 'Guardar'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button type="button" onClick={() => applyPreset(STAFF_DEFAULT_PERMISSIONS)} className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-semibold text-gray-700">Padrão de funcionário</button>
            <button type="button" onClick={() => applyPreset(MANAGER_PRESET_PERMISSIONS)} className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-semibold text-gray-700">Tudo (como gestor)</button>
            <button type="button" onClick={() => applyPreset({})} className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-semibold text-gray-700">Nada</button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Escolha o que esta pessoa pode <strong>ver</strong> e o que pode <strong>fazer</strong>. As mudanças aplicam-se logo que guardar.
            Repor dados, alterar permissões, subscrição, lojas e credenciais são sempre só do dono.
          </p>

          {groups.map(([group, items]) => (
            <div key={group} className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{group}</h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                {items.map(({ area, label, hint }) => {
                  const actOnly = area === 'staffManagement';
                  const blocked = actOnly && !isManager;
                  const viewKey = permissionKey(area, 'view');
                  const actKey = permissionKey(area, 'act');
                  return (
                    <div key={area} className={`p-3 flex items-center justify-between gap-3 ${blocked ? 'opacity-50' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800">{label}</p>
                        <p className="text-[11px] text-gray-500 leading-snug">{blocked ? 'Disponível apenas para gestores.' : hint}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-gray-700">
                        {!actOnly && (
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={draft[viewKey] === true} onChange={e => set(viewKey, e.target.checked)} />
                            Ver
                          </label>
                        )}
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" disabled={blocked} checked={draft[actKey] === true} onChange={e => set(actKey, e.target.checked)} />
                          Fazer
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
