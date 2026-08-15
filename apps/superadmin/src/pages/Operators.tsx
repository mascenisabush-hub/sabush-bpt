import { useEffect, useState } from 'react';
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
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Operadores</h2>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!error && operators === null && <p style={{ color: '#94a3b8' }}>A carregar…</p>}

      {operators !== null && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 24 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={th}>uid</th>
              <th style={th}>Função</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.uid} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={td}>{op.uid} {selfUid === op.uid && <span style={{ color: '#64748b' }}>(você)</span>}</td>
                <td style={td}>{op.platformRole}</td>
                <td style={td}>
                  {selfUid !== op.uid && (
                    pendingRevokeUid === op.uid ? (
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>Revogar?</span>
                        <button onClick={() => handleRevoke(op.uid)} disabled={busy} style={rejectBtn}>{busy ? 'A revogar…' : 'Sim'}</button>
                        <button onClick={() => setPendingRevokeUid(null)} style={cancelBtn}>Cancelar</button>
                      </span>
                    ) : (
                      <button onClick={() => setPendingRevokeUid(op.uid)} style={cancelBtn}>Revogar</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {revokeError && <p style={{ color: '#f87171' }}>{revokeError}</p>}

      <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, maxWidth: 420 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Provisionar novo operador</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="uid (Firebase Auth)"
            style={inputStyle}
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as PlatformRole)} style={inputStyle}>
            <option value="support">support</option>
            <option value="developer">developer</option>
            <option value="superadmin">superadmin</option>
          </select>
          {formError && <p style={{ color: '#f87171', margin: 0 }}>{formError}</p>}
          <button onClick={handleProvision} disabled={busy} style={confirmBtn}>{busy ? 'A provisionar…' : 'Provisionar'}</button>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px' };
const td: React.CSSProperties = { padding: '10px 12px' };
const inputStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', padding: 8, fontSize: 14 };
const confirmBtn: React.CSSProperties = { background: '#16a34a', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
const rejectBtn: React.CSSProperties = { background: '#dc2626', border: 'none', color: 'white', padding: '6px 10px', borderRadius: 4, fontWeight: 600, fontSize: 13 };
const cancelBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '6px 10px', borderRadius: 4, fontSize: 13 };
