import { useState } from 'react';
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
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Negócios</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: 420 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Nome ou ID do negócio…"
          style={inputStyle}
        />
        <button onClick={handleSearch} disabled={busy} style={confirmBtn}>{busy ? 'A pesquisar…' : 'Pesquisar'}</button>
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {results !== null && results.length === 0 && !error && <p style={{ color: '#94a3b8' }}>Nenhum negócio encontrado.</p>}

      {results !== null && results.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={th}>Nome</th>
              <th style={th}>ID</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.businessId} onClick={() => onOpenBusiness(r.businessId)} style={{ cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>
                <td style={td}>{r.name || <span style={{ color: '#64748b' }}>(sem nome)</span>}</td>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>{r.businessId}</td>
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
const inputStyle: React.CSSProperties = { flex: 1, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', padding: 8, fontSize: 14 };
const confirmBtn: React.CSSProperties = { background: '#16a34a', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
