import { useEffect, useState } from 'react';
import { fetchAuditLog, type AuditLogEntryRow, SuperAdminApiError } from '../lib/superadminApi';

// FR-7 — V1 scope: payment.confirmed / payment.rejected only, per
// docs/specs/18-19-payment-operations-slice.md §6. "Who confirmed/
// rejected this payment, when, and for which business?" must be
// answerable from this screen alone.
export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditLogEntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLog()
      .then(setEntries)
      .catch((err) => setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar o registo de auditoria.'));
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Registo de Auditoria — Pagamentos</h2>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!error && entries === null && <p style={{ color: '#94a3b8' }}>A carregar…</p>}
      {entries !== null && entries.length === 0 && <p style={{ color: '#94a3b8' }}>Ainda não há ações registadas.</p>}

      {entries !== null && entries.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={th}>Quando</th>
              <th style={th}>Ação</th>
              <th style={th}>Operador</th>
              <th style={th}>Negócio</th>
              <th style={th}>Justificação</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={td}>{new Date(e.timestamp).toLocaleString('pt-PT')}</td>
                <td style={td}>{e.actionType === 'payment.confirmed' ? 'Confirmado' : 'Rejeitado'}</td>
                <td style={td}>{e.actorUid} <span style={{ color: '#64748b' }}>({e.actorRole})</span></td>
                <td style={td}>{e.targetBusinessId ?? '—'}</td>
                <td style={td}>{e.justification ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px' };
const td: React.CSSProperties = { padding: '10px 12px' };
