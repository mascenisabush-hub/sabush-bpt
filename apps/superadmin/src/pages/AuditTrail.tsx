import { useEffect, useState } from 'react';
import { fetchAuditLog, KNOWN_ACTION_TYPES, type AuditLogEntryRow, type AuditLogFilters, SuperAdminApiError } from '../lib/superadminApi';

// SuperAdmin V1 Operational Control Plane — Phase D (ADR-0006). FR-D1/D2.
// Extends the original payment-only, unfiltered screen into a
// filterable view across all seven known action types. Read-only —
// no edit/delete control of any kind, matching every prior phase's
// treatment of the audit trail as an append-only record.

const ACTION_LABELS: Record<string, string> = {
  'payment.confirmed': 'Pagamento confirmado',
  'payment.rejected': 'Pagamento rejeitado',
  'operator.provisioned': 'Operador provisionado',
  'operator.revoked': 'Operador revogado',
  'business.viewed': 'Negócio consultado',
  'business.suspended': 'Negócio suspenso',
  'business.reactivated': 'Negócio reativado',
};

// A safe fallback for any action type not in the known list above —
// never mislabels an unrecognized value as something specific, and
// never crashes. Replaces the prior binary
// `payment.confirmed ? 'Confirmado' : 'Rejeitado'` ternary, which
// would have mislabeled every non-payment action as "Rejeitado".
function actionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType;
}

const emptyFilters: AuditLogFilters = { businessId: '', actorUid: '', actionType: '', from: '', to: '' };

export default function AuditTrail() {
  const [filters, setFilters] = useState<AuditLogFilters>(emptyFilters);
  const [entries, setEntries] = useState<AuditLogEntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(activeFilters: AuditLogFilters) {
    setError(null);
    setBusy(true);
    try {
      setEntries(await fetchAuditLog(activeFilters));
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar o registo de auditoria.');
    } finally {
      setBusy(false);
    }
  }

  // Initial, unfiltered load on mount — mirrors the page's prior
  // behavior of showing recent activity immediately, now across every
  // action type rather than only payments.
  useEffect(() => {
    load(emptyFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply() {
    load(filters);
  }

  function handleClear() {
    setFilters(emptyFilters);
    load(emptyFilters);
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Registo de Auditoria</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
        <Field label="Negócio (ID)">
          <input
            value={filters.businessId}
            onChange={(e) => setFilters((f) => ({ ...f, businessId: e.target.value }))}
            placeholder="businessId"
            style={inputStyle}
          />
        </Field>
        <Field label="Operador (UID)">
          <input
            value={filters.actorUid}
            onChange={(e) => setFilters((f) => ({ ...f, actorUid: e.target.value }))}
            placeholder="actorUid"
            style={inputStyle}
          />
        </Field>
        <Field label="Ação">
          <select
            value={filters.actionType}
            onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
            style={inputStyle}
          >
            <option value="">Todas</option>
            {KNOWN_ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{actionLabel(a)}</option>
            ))}
          </select>
        </Field>
        <Field label="De">
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            style={inputStyle}
          />
        </Field>
        <Field label="Até">
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            style={inputStyle}
          />
        </Field>
        <button onClick={handleApply} disabled={busy} style={confirmBtn}>{busy ? 'A aplicar…' : 'Aplicar'}</button>
        <button onClick={handleClear} disabled={busy} style={cancelBtn}>Limpar</button>
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!error && entries === null && <p style={{ color: '#94a3b8' }}>A carregar…</p>}
      {entries !== null && entries.length === 0 && <p style={{ color: '#94a3b8' }}>Nenhuma ação encontrada para os filtros indicados.</p>}

      {entries !== null && entries.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={th}>Quando</th>
              <th style={th}>Ação</th>
              <th style={th}>Operador</th>
              <th style={th}>Negócio</th>
              <th style={th}>Alvo (UID)</th>
              <th style={th}>Justificação</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={td}>{new Date(e.timestamp).toLocaleString('pt-PT')}</td>
                <td style={td}>{actionLabel(e.actionType)}</td>
                <td style={td}>{e.actorUid} <span style={{ color: '#94a3b8' }}>({e.actorRole})</span></td>
                <td style={td}>{e.targetBusinessId ?? '—'}</td>
                <td style={td}>{e.targetUid ?? '—'}</td>
                <td style={td}>{e.justification ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {entries !== null && entries.length === 100 && (
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          A mostrar as 100 entradas mais recentes que correspondem aos filtros. Use os filtros para restringir os resultados.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, color: '#94a3b8' }}>{label}</label>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px' };
const td: React.CSSProperties = { padding: '10px 12px' };
const inputStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', padding: 8, fontSize: 13 };
const confirmBtn: React.CSSProperties = { background: '#16a34a', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
const cancelBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 4 };
