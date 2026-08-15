import { useState } from 'react';
import { fetchBusinessDetail, type BusinessDetailResponse, SuperAdminApiError } from '../lib/superadminApi';

interface Props {
  businessId: string;
  onBack: () => void;
}

// SuperAdmin V1 Operational Control Plane — Phase B (ADR-0006). FR-B3.
// BR-4 (read-only, absolute): this screen has no edit control of any
// kind, anywhere — not disabled, simply never rendered. BR-7:
// justification is required before the detail loads at all — the
// input gates the fetch itself, not a passive field alongside it.
export default function BusinessDetail({ businessId, onBack }: Props) {
  const [justification, setJustification] = useState('');
  const [data, setData] = useState<BusinessDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLoad() {
    if (!justification.trim()) {
      setError('É obrigatório indicar uma justificação.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setData(await fetchBusinessDetail(businessId, justification.trim()));
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar o negócio.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: 16, cursor: 'pointer', padding: 0 }}>
        ← Voltar à pesquisa
      </button>

      <p style={{ fontSize: 12, color: '#64748b', marginTop: -8 }}>{businessId}</p>

      {!data && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, maxWidth: 480 }}>
          <p style={{ marginTop: 0, fontSize: 13, color: '#94a3b8' }}>
            É obrigatório indicar uma justificação para consultar os dados deste negócio. Esta ação fica registada no registo de auditoria.
          </p>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Motivo da consulta…"
            rows={3}
            style={{ width: '100%', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', padding: 8, marginBottom: 8 }}
          />
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <button onClick={handleLoad} disabled={busy} style={confirmBtn}>{busy ? 'A carregar…' : 'Consultar negócio'}</button>
        </div>
      )}

      {data && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, maxWidth: 560 }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>{data.name ?? '(sem nome)'}</h2>

          {data.auditLogged === false && (
            <p style={{ fontSize: 12, color: '#fbbf24' }}>
              Aviso: os dados foram consultados, mas o registo de auditoria falhou ao gravar. Reporte isto à equipa técnica.
            </p>
          )}

          <dl style={{ fontSize: 14 }}>
            <Row label="Categoria" value={data.category ?? '—'} />
            <Row label="Moeda" value={data.currencySymbol ?? '—'} />
            <Row label="Criado em" value={data.createdAt ? new Date(data.createdAt).toLocaleString('pt-PT') : '—'} />
            <Row label="Estado da subscrição" value={data.subscriptionStatus ?? '—'} />
          </dl>

          <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 4 }}>Dono</h3>
          <dl style={{ fontSize: 14 }}>
            <Row label="Nome" value={data.owner?.name ?? '—'} />
            <Row label="Email" value={data.owner?.email ?? '—'} />
          </dl>

          <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 4 }}>Equipa ({data.staff.length})</h3>
          {data.staff.length === 0 && <p style={{ fontSize: 13, color: '#64748b' }}>Sem funcionários.</p>}
          {data.staff.length > 0 && (
            <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
              {data.staff.map((s, i) => (
                <li key={i} style={{ color: s.suspended ? '#f87171' : '#e2e8f0' }}>
                  {s.name} {s.suspended && '(suspenso)'}
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 4 }}>Pagamentos recentes ({data.recentPayments.length})</h3>
          {data.recentPayments.length === 0 && <p style={{ fontSize: 13, color: '#64748b' }}>Sem pagamentos.</p>}
          {data.recentPayments.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={th}>Valor</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Submetido em</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={td}>{p.amount ?? '—'} {p.currency ?? ''}</td>
                    <td style={td}>{p.status ?? '—'}</td>
                    <td style={td}>{p.submittedAt ? new Date(p.submittedAt).toLocaleString('pt-PT') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f172a' }}>
      <dt style={{ color: '#94a3b8' }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 8px' };
const td: React.CSSProperties = { padding: '6px 8px' };
const confirmBtn: React.CSSProperties = { background: '#16a34a', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
