import { useEffect, useState } from 'react';
import { Building2, ShieldAlert } from 'lucide-react';
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

// Mapped onto the shared design-system semantic tokens (--info/--success/
// --warning/--muted) rather than the old ad-hoc slate/amber hexes, so
// this badge reads consistently with every other status badge in the
// product instead of inventing a fifth color family.
const ACTIVITY_COLORS: Record<DirectoryRow['operationalActivity'], { bg: string; fg: string }> = {
  New: { bg: 'rgba(11,31,58,0.08)', fg: 'var(--info)' },
  Active: { bg: 'rgba(5,150,105,0.12)', fg: 'var(--success)' },
  Inactive: { bg: 'rgba(217,119,6,0.12)', fg: 'var(--warning)' },
  Dormant: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
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
      <h2 className="type-title-lg font-display mb-5">Directório de Negócios</h2>

      <div className="card-premium mb-5 flex flex-wrap items-end gap-3 p-4">
        <Field label="Pesquisar">
          <input
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Nome ou ID do negócio…"
            className="input-base type-body px-2.5 py-2"
          />
        </Field>
        <Field label="Atividade Operacional">
          <select
            value={filters.operationalActivity ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, operationalActivity: (e.target.value || undefined) as DirectoryOperationalActivityFilter | undefined }))}
            className="input-base type-body px-2.5 py-2"
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
            className="input-base type-body px-2.5 py-2"
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
            className="input-base type-body px-2.5 py-2"
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
            className="input-base type-body px-2.5 py-2"
          >
            <option value="lastActivityAt">Última Atividade</option>
            <option value="createdAt">Data de Criação</option>
            <option value="name">Nome</option>
          </select>
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
      {!error && rows === null && (
        <div className="card-premium p-6 text-center">
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>A carregar…</p>
        </div>
      )}
      {rows !== null && rows.length === 0 && (
        <div className="card-premium flex flex-col items-center gap-2 p-10 text-center">
          <Building2 className="h-7 w-7" style={{ color: 'var(--muted-foreground)' }} />
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>Nenhum negócio encontrado para os filtros indicados.</p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <>
          <div className="card-premium overflow-x-auto">
            <table className="table-clean w-full text-left">
              <thead>
                <tr>
                  <th className="type-label whitespace-nowrap px-5 py-3">Nome</th>
                  <th className="type-label whitespace-nowrap px-5 py-3">Atividade</th>
                  <th className="type-label whitespace-nowrap px-5 py-3">Última Atividade</th>
                  <th className="type-label whitespace-nowrap px-5 py-3">Subscrição</th>
                  <th className="type-label whitespace-nowrap px-5 py-3">Suspensão</th>
                  <th className="type-label whitespace-nowrap px-5 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.businessId} onClick={() => onOpenBusiness(r.businessId)} className="cursor-pointer">
                    <td className="type-body px-5 py-3.5">
                      {r.name || <span style={{ color: 'var(--muted-foreground)' }}>(sem nome)</span>}
                      <div className="type-label mt-0.5 normal-case tracking-normal" style={{ color: 'var(--muted-foreground)' }}>
                        {r.businessId}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><ActivityBadge activity={r.operationalActivity} /></td>
                    <td className="type-body whitespace-nowrap px-5 py-3.5">
                      {r.daysSinceActivity === null
                        ? <span style={{ color: 'var(--muted-foreground)' }}>—</span>
                        : `${r.daysSinceActivity} dia${r.daysSinceActivity === 1 ? '' : 's'} atrás`}
                    </td>
                    <td className="type-body whitespace-nowrap px-5 py-3.5">
                      {r.subscriptionState
                        ? SUBSCRIPTION_LABELS[r.subscriptionState] ?? r.subscriptionState
                        : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {r.suspended
                        ? <span className="type-body font-bold" style={{ color: 'var(--error)' }}>Suspenso</span>
                        : <span className="type-body" style={{ color: 'var(--muted-foreground)' }}>Ativo</span>}
                    </td>
                    <td className="type-label whitespace-nowrap px-5 py-3.5 normal-case tracking-normal" style={{ color: 'var(--muted-foreground)' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-PT') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="mt-4 text-center">
              <button onClick={loadMore} disabled={loadingMore} className="btn-secondary lift px-4 py-2 text-sm">
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
    <span className="badge-soft" style={{ background: colors.bg, color: colors.fg }}>
      {ACTIVITY_LABELS[activity]}
    </span>
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
