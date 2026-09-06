import { useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setError(null);
    setRefreshing(true);
    try {
      const rows = await fetchPendingPayments();
      setPayments(rows);
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar os pagamentos.');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="type-title-lg font-display">Pagamentos Pendentes</h2>
        <button onClick={load} className="btn-secondary lift px-3 py-2 text-[13px]">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
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

      {!error && payments === null && (
        <div className="card-premium flex items-center gap-2 p-6" style={{ color: 'var(--muted-foreground)' }}>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="type-body text-[13px]">A carregar…</span>
        </div>
      )}

      {payments !== null && payments.length === 0 && (
        <div className="card-premium flex flex-col items-center gap-2 p-10 text-center">
          <Wallet className="h-7 w-7" style={{ color: 'var(--muted-foreground)' }} />
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>Não há pagamentos pendentes.</p>
        </div>
      )}

      {payments !== null && payments.length > 0 && (
        <div className="card-premium overflow-hidden">
          <table className="table-clean w-full text-left">
            <thead>
              <tr>
                <th className="type-label px-5 py-3">Negócio</th>
                <th className="type-label px-5 py-3 text-right">Valor</th>
                <th className="type-label px-5 py-3">Método</th>
                <th className="type-label px-5 py-3">Referência</th>
                <th className="type-label px-5 py-3">Submetido em</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} onClick={() => onOpenPayment(p.businessId, p.id)} className="cursor-pointer">
                  <td className="type-body px-5 py-3.5">
                    {p.businessName ?? <span style={{ color: 'var(--muted-foreground)' }}>(sem nome)</span>}
                    <div className="type-label mt-0.5 normal-case tracking-normal" style={{ color: 'var(--muted-foreground)' }}>
                      {p.businessId}
                    </div>
                  </td>
                  <td className="type-number px-5 py-3.5 text-right">{p.amount} {p.currency}</td>
                  <td className="type-body px-5 py-3.5">{p.method}</td>
                  <td className="type-body px-5 py-3.5">{p.reference}</td>
                  <td className="type-body px-5 py-3.5">{new Date(p.submittedAt).toLocaleString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
