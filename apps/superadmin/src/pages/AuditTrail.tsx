import { useEffect, useState } from 'react';
import { ScrollText, ShieldAlert } from 'lucide-react';
import { fetchAuditLog, KNOWN_ACTION_TYPES, type AuditLogEntryRow, type AuditLogFilters, SuperAdminApiError } from '../lib/superadminApi';

// SuperAdmin V1 Operational Control Plane — Phase D (ADR-0006). FR-D1/D2.
// Extends the original payment-only, unfiltered screen into a
// filterable view across every known action type (initially seven;
// widened to eleven by the SuperAdmin Audit Center Action-Type
// Allowlist Correction, 2026-09-06 — see
// SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_AUTHORIZATION.md).
// Read-only — no edit/delete control of any kind, matching every
// prior phase's treatment of the audit trail as an append-only record.

const ACTION_LABELS: Record<string, string> = {
  'payment.confirmed': 'Pagamento confirmado',
  'payment.rejected': 'Pagamento rejeitado',
  'operator.provisioned': 'Operador provisionado',
  'operator.revoked': 'Operador revogado',
  'business.viewed': 'Negócio consultado',
  'business.suspended': 'Negócio suspenso',
  'business.reactivated': 'Negócio reativado',
  'initial_stock_recovery.authorized': 'Recuperação de Capital Inicial autorizada',
  'initial_stock_recovery.consumed': 'Recuperação de Capital Inicial executada',
  'business_worth_recovery.authorized': 'Recuperação de Valor do Negócio autorizada',
  'business_worth_recovery.expired': 'Recuperação de Valor do Negócio expirada',
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
      <h2 className="type-title-lg font-display mb-5">Registo de Auditoria</h2>

      <div className="card-premium mb-5 flex flex-wrap items-end gap-3 p-4">
        <Field label="Negócio (ID)">
          <input
            value={filters.businessId}
            onChange={(e) => setFilters((f) => ({ ...f, businessId: e.target.value }))}
            placeholder="businessId"
            className="input-base type-body px-2.5 py-2"
          />
        </Field>
        <Field label="Operador (UID)">
          <input
            value={filters.actorUid}
            onChange={(e) => setFilters((f) => ({ ...f, actorUid: e.target.value }))}
            placeholder="actorUid"
            className="input-base type-body px-2.5 py-2"
          />
        </Field>
        <Field label="Ação">
          <select
            value={filters.actionType}
            onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
            className="input-base type-body px-2.5 py-2"
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
            className="input-base type-body px-2.5 py-2"
          />
        </Field>
        <Field label="Até">
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            className="input-base type-body px-2.5 py-2"
          />
        </Field>
        <button onClick={handleApply} disabled={busy} className="btn-primary lift px-4 py-2 text-sm">
          {busy ? 'A aplicar…' : 'Aplicar'}
        </button>
        <button onClick={handleClear} disabled={busy} className="btn-secondary lift px-4 py-2 text-sm">
          Limpar
        </button>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border p-3"
          style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
          <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}
      {!error && entries === null && (
        <div className="card-premium p-6 text-center">
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>A carregar…</p>
        </div>
      )}
      {entries !== null && entries.length === 0 && (
        <div className="card-premium flex flex-col items-center gap-2 p-10 text-center">
          <ScrollText className="h-7 w-7" style={{ color: 'var(--muted-foreground)' }} />
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>Nenhuma ação encontrada para os filtros indicados.</p>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <div className="card-premium overflow-x-auto">
          <table className="table-clean w-full text-left">
            <thead>
              <tr>
                <th className="type-label whitespace-nowrap px-5 py-3">Quando</th>
                <th className="type-label whitespace-nowrap px-5 py-3">Ação</th>
                <th className="type-label whitespace-nowrap px-5 py-3">Operador</th>
                <th className="type-label whitespace-nowrap px-5 py-3">Negócio</th>
                <th className="type-label whitespace-nowrap px-5 py-3">Alvo (UID)</th>
                <th className="type-label px-5 py-3">Justificação</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="type-body whitespace-nowrap px-5 py-3">{new Date(e.timestamp).toLocaleString('pt-PT')}</td>
                  <td className="type-body whitespace-nowrap px-5 py-3">{actionLabel(e.actionType)}</td>
                  <td className="type-body whitespace-nowrap px-5 py-3">
                    {e.actorUid} <span style={{ color: 'var(--muted-foreground)' }}>({e.actorRole})</span>
                  </td>
                  <td className="type-body whitespace-nowrap px-5 py-3">{e.targetBusinessId ?? '—'}</td>
                  <td className="type-body whitespace-nowrap px-5 py-3">{e.targetUid ?? '—'}</td>
                  <td className="type-body px-5 py-3">{e.justification ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries !== null && entries.length === 100 && (
        <p className="type-label mt-3 normal-case tracking-normal" style={{ color: 'var(--muted-foreground)' }}>
          A mostrar as 100 entradas mais recentes que correspondem aos filtros. Use os filtros para restringir os resultados.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="type-label" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      {children}
    </div>
  );
}
