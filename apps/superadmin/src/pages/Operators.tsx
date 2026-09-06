import { useEffect, useState } from 'react';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  fetchOperators,
  provisionOperator,
  revokeOperator,
  type OperatorRow,
  type PlatformRole,
  SuperAdminApiError,
} from '../lib/superadminApi';

// SuperAdmin V1 Operational Control Plane — Phase A (ADR-0006).
// FR-A4. BR-2 (no self-escalation): the caller's own row renders no
// revoke button and the provision form cannot target the caller's own
// uid — a client-side courtesy only; the real enforcement is
// server-side in server/operatorManagement.ts (BR-2/BR-3), never
// trusted from this UI state alone.
export default function Operators() {
  const [operators, setOperators] = useState<OperatorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState<PlatformRole>('support');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [pendingRevokeUid, setPendingRevokeUid] = useState<string | null>(null);

  const selfUid = auth.currentUser?.uid ?? null;

  async function load() {
    setError(null);
    try {
      setOperators(await fetchOperators());
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar os operadores.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleProvision() {
    setFormError(null);
    const uid = newUid.trim();
    if (!uid) {
      setFormError('uid é obrigatório.');
      return;
    }
    if (selfUid && uid === selfUid) {
      setFormError('Não pode conceder acesso de operador a si mesmo.');
      return;
    }
    setBusy(true);
    try {
      await provisionOperator(uid, newRole);
      setNewUid('');
      setNewRole('support');
      await load();
    } catch (err) {
      setFormError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao provisionar o operador.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(uid: string) {
    setRevokeError(null);
    setBusy(true);
    try {
      await revokeOperator(uid);
      setPendingRevokeUid(null);
      await load();
    } catch (err) {
      setRevokeError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao revogar o operador.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="type-title-lg font-display mb-5">Operadores</h2>

      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border p-3"
          style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
          <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}
      {!error && operators === null && (
        <div className="card-premium mb-6 p-6 text-center">
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>A carregar…</p>
        </div>
      )}

      {operators !== null && (
        <div className="card-premium mb-6 overflow-hidden">
          <table className="table-clean w-full text-left">
            <thead>
              <tr>
                <th className="type-label px-5 py-3">uid</th>
                <th className="type-label px-5 py-3">Função</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.uid}>
                  <td className="type-body px-5 py-3.5">
                    {op.uid} {selfUid === op.uid && <span style={{ color: 'var(--muted-foreground)' }}>(você)</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge-soft" style={{ background: 'var(--gold-soft)', color: 'var(--gold-hover)' }}>
                      {op.platformRole}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {selfUid !== op.uid && (
                      pendingRevokeUid === op.uid ? (
                        <span className="flex items-center gap-2">
                          <span className="type-body text-[13px]" style={{ color: 'var(--muted-foreground)' }}>Revogar?</span>
                          <button
                            onClick={() => handleRevoke(op.uid)}
                            disabled={busy}
                            className="lift rounded-lg bg-rose-600 px-2.5 py-1.5 text-[13px] font-bold text-white hover:bg-rose-500"
                          >
                            {busy ? 'A revogar…' : 'Sim'}
                          </button>
                          <button onClick={() => setPendingRevokeUid(null)} className="btn-secondary lift px-2.5 py-1.5 text-[13px]">
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setPendingRevokeUid(op.uid)} className="btn-secondary lift px-2.5 py-1.5 text-[13px]">
                          Revogar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeError && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border p-3"
          style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
          <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{revokeError}</p>
        </div>
      )}

      <div className="card-premium max-w-md p-6">
        <h3 className="type-title mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" style={{ color: 'var(--gold-hover)' }} />
          Provisionar novo operador
        </h3>
        <div className="flex flex-col gap-3">
          <input
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="uid (Firebase Auth)"
            className="input-base type-body px-3 py-2.5"
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as PlatformRole)} className="input-base type-body px-3 py-2.5">
            <option value="support">support</option>
            <option value="developer">developer</option>
            <option value="superadmin">superadmin</option>
          </select>
          {formError && <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{formError}</p>}
          <button onClick={handleProvision} disabled={busy} className="btn-primary lift py-2.5 text-sm">
            {busy ? 'A provisionar…' : 'Provisionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
