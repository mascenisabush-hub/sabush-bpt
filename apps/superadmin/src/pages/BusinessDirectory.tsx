import { useEffect, useState } from 'react';
import {
  fetchBusinessDirectory,
  DIRECTORY_SUBSCRIPTION_STATES,
  type DirectoryFilters,
  type DirectoryRow,
  type DirectoryOperationalActivityFilter,
  type DirectorySortField,
  SuperAdminApiError,
} from '../lib/superadminApi';

interface Props {
  onOpenBusiness: (businessId: string) => void;
}

// SuperAdmin V1 Operational Control Plane — Phase E (BDR-0010,
// POL-18-001, docs/specs/18-superadmin-business-directory-slice.md
// v1.2, Rule 8: READY). Discover -> search -> filter -> inspect. This
// screen consumes GET /api/superadmin/businesses/directory only — it
// never computes Operational Activity, never derives lastActivityAt,
// never touches Firestore, and never re-implements the pagination
// cursor logic already proven server-side. Selecting a row navigates
// to the existing Business Detail screen (Phase B/C, unchanged) — no
// duplicate detail surface, no inline management action of any kind.

const ACTIVITY_LABELS: Record<DirectoryRow['operationalActivity'], string> = {
  New: 'Novo',
  Active: 'Ativo',
  Inactive: 'Inativo',
  Dormant: 'Dormente',
};

const ACTIVITY_COLORS: Record<DirectoryRow['operationalActivity'], { bg: string; fg: string }> = {
  New: { bg: '#1e3a5f', fg: '#7dd3fc' },
  Active: { bg: '#14532d', fg: '#86efac' },
  Inactive: { bg: '#78350f', fg: '#fcd34d' },
  Dormant: { bg: '#374151', fg: '#9ca3af' },
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial_pending: 'Trial Pendente',
  trial_active: 'Trial Ativo',
  trial_completed: 'Trial Concluído',
  active: 'Subscrição Ativa',
  grace_period: 'Período de Carência',
  expired: 'Expirado',
};

const emptyFilters: DirectoryFilters = {};

export default function BusinessDirectory({ onOpenBusiness }: Props) {
  const [filters, setFilters] = useState<DirectoryFilters>(emptyFilters);
  const [rows, setRows] = useState<DirectoryRow[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(activeFilters: DirectoryFilters) {
    setError(null);
    setBusy(true);
    try {
      const page = await fetchBusinessDirectory(activeFilters);
      setRows(page.rows);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar o directório de negócios.');
      setRows(null);
      setNextCursor(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchBusinessDirectory({ ...filters, cursor: nextCursor });
      setRows((prev) => [...(prev ?? []), ...page.rows]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar mais negócios.');
    } finally {
      setLoadingMore(false);
    }
  }

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
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Directório de Negócios</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
        <Field label="Pesquisar">
          <input
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Nome ou ID do negócio…"
            style={inputStyle}
          />
        </Field>
        <Field label="Atividade Operacional">
          <select
            value={filters.operationalActivity ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, operationalActivity: (e.target.value || undefined) as DirectoryOperationalActivityFilter | undefined }))}
            style={inputStyle}
          >
            <option value="">Todas</option>
            <option value="new">Novo</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="dormant">Dormente</option>
          </select>
        </Field>
        <Field label="Estado da Subscrição">
          <select
            value={filters.subscriptionState ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, subscriptionState: e.target.value || undefined }))}
            style={inputStyle}
          >
            <option value="">Todos</option>
            {DIRECTORY_SUBSCRIPTION_STATES.map((s) => (
              <option key={s} value={s}>{SUBSCRIPTION_LABELS[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Suspensão">
          <select
            value={filters.suspended === undefined ? '' : String(filters.suspended)}
            onChange={(e) => setFilters((f) => ({ ...f, suspended: e.target.value === '' ? undefined : e.target.value === 'true' }))}
            style={inputStyle}
          >
            <option value="">Todos</option>
            <option value="false">Ativo</option>
            <option value="true">Suspenso</option>
          </select>
        </Field>
        <Field label="Ordenar por">
          <select
            value={filters.sortBy ?? 'lastActivityAt'}
            onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as DirectorySortField }))}
            style={inputStyle}
          >
            <option value="lastActivityAt">Última Atividade</option>
            <option value="createdAt">Data de Criação</option>
            <option value="name">Nome</option>
          </select>
        </Field>
        <button onClick={handleApply} disabled={busy} style={confirmBtn}>{busy ? 'A aplicar…' : 'Aplicar'}</button>
        <button onClick={handleClear} disabled={busy} style={cancelBtn}>Limpar</button>
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!error && rows === null && <p style={{ color: '#94a3b8' }}>A carregar…</p>}
      {rows !== null && rows.length === 0 && <p style={{ color: '#94a3b8' }}>Nenhum negócio encontrado para os filtros indicados.</p>}

      {rows !== null && rows.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={th}>Nome</th>
                <th style={th}>Atividade</th>
                <th style={th}>Última Atividade</th>
                <th style={th}>Subscrição</th>
                <th style={th}>Suspensão</th>
                <th style={th}>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.businessId} onClick={() => onOpenBusiness(r.businessId)} style={{ cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>
                  <td style={td}>
                    {r.name || <span style={{ color: '#64748b' }}>(sem nome)</span>}
                    <div style={{ color: '#64748b', fontSize: 12 }}>{r.businessId}</div>
                  </td>
                  <td style={td}><ActivityBadge activity={r.operationalActivity} /></td>
                  <td style={td}>
                    {r.daysSinceActivity === null ? <span style={{ color: '#64748b' }}>—</span> : `${r.daysSinceActivity} dia${r.daysSinceActivity === 1 ? '' : 's'} atrás`}
                  </td>
                  <td style={td}>{r.subscriptionState ? SUBSCRIPTION_LABELS[r.subscriptionState] ?? r.subscriptionState : <span style={{ color: '#64748b' }}>—</span>}</td>
                  <td style={td}>
                    {r.suspended
                      ? <span style={{ color: '#f87171', fontWeight: 600 }}>Suspenso</span>
                      : <span style={{ color: '#64748b' }}>Ativo</span>}
                  </td>
                  <td style={{ ...td, color: '#64748b', fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-PT') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {nextCursor && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={loadMore} disabled={loadingMore} style={cancelBtn}>
                {loadingMore ? 'A carregar…' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActivityBadge({ activity }: { activity: DirectoryRow['operationalActivity'] }) {
  const colors = ACTIVITY_COLORS[activity];
  return (
    <span style={{ background: colors.bg, color: colors.fg, borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
      {ACTIVITY_LABELS[activity]}
    </span>
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
