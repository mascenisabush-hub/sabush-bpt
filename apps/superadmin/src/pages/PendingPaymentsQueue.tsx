import { useEffect, useState } from 'react';
import { fetchPendingPayments, type PendingPaymentRow, SuperAdminApiError } from '../lib/superadminApi';

interface Props {
  onOpenPayment: (businessId: string, paymentId: string) => void;
}

// FR-2 — the primary operational question this whole slice exists to
// answer first: "What payments are waiting for me?" Oldest first
// (server already sorts by submittedAt ascending).
export default function PendingPaymentsQueue({ onOpenPayment }: Props) {
  const [payments, setPayments] = useState<PendingPaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const rows = await fetchPendingPayments();
      setPayments(rows);
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar os pagamentos.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Pagamentos Pendentes</h2>
        <button onClick={load} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 4, padding: '4px 10px', fontSize: 13 }}>
          Atualizar
        </button>
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!error && payments === null && <p style={{ color: '#94a3b8' }}>A carregar…</p>}
      {payments !== null && payments.length === 0 && <p style={{ color: '#94a3b8' }}>Não há pagamentos pendentes.</p>}

      {payments !== null && payments.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={th}>Negócio</th>
              <th style={th}>Valor</th>
              <th style={th}>Método</th>
              <th style={th}>Referência</th>
              <th style={th}>Submetido em</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpenPayment(p.businessId, p.id)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #1e293b' }}
              >
                <td style={td}>
                  {p.businessName ?? <span style={{ color: '#64748b' }}>(sem nome)</span>}
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.businessId}</div>
                </td>
                <td style={td}>{p.amount} {p.currency}</td>
                <td style={td}>{p.method}</td>
                <td style={td}>{p.reference}</td>
                <td style={td}>{new Date(p.submittedAt).toLocaleString('pt-PT')}</td>
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
