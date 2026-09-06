import { useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { searchBusinesses, type BusinessSearchRow, SuperAdminApiError } from '../lib/superadminApi';

interface Props {
  onOpenBusiness: (businessId: string) => void;
}

// SuperAdmin V1 Operational Control Plane — Phase B (ADR-0006). FR-B3.
// BR-6: this screen renders businessId + name only — the server route
// itself never returns anything else for a search, but this component
// also never asks for more, by construction (no email field anywhere
// in this file).
export default function BusinessSearch({ onOpenBusiness }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<BusinessSearchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSearch() {
    setError(null);
    setBusy(true);
    try {
      setResults(await searchBusinesses(q));
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao pesquisar negócios.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="type-title-lg font-display mb-5">Negócios</h2>

      <div className="mb-5 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nome ou ID do negócio…"
            className="input-base type-body w-full py-2.5 pl-9 pr-3"
          />
        </div>
        <button onClick={handleSearch} disabled={busy} className="btn-primary lift px-4 py-2.5 text-sm">
          {busy ? 'A pesquisar…' : 'Pesquisar'}
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
      {results !== null && results.length === 0 && !error && (
        <div className="card-premium flex flex-col items-center gap-2 p-10 text-center">
          <Search className="h-7 w-7" style={{ color: 'var(--muted-foreground)' }} />
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>Nenhum negócio encontrado.</p>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="card-premium overflow-hidden">
          <table className="table-clean w-full text-left">
            <thead>
              <tr>
                <th className="type-label px-5 py-3">Nome</th>
                <th className="type-label px-5 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.businessId} onClick={() => onOpenBusiness(r.businessId)} className="cursor-pointer">
                  <td className="type-body px-5 py-3.5">
                    {r.name || <span style={{ color: 'var(--muted-foreground)' }}>(sem nome)</span>}
                  </td>
                  <td className="type-label px-5 py-3.5 normal-case tracking-normal" style={{ color: 'var(--muted-foreground)' }}>
                    {r.businessId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
