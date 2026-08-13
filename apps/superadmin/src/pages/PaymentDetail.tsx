import { useEffect, useState } from 'react';
import {
  fetchPaymentDetail,
  confirmPaymentAction,
  rejectPaymentAction,
  type PaymentDetailResponse,
  SuperAdminApiError,
} from '../lib/superadminApi';

interface Props {
  businessId: string;
  paymentId: string;
  onBack: () => void;
}

type PendingAction = null | 'confirm' | 'reject';
type ActionResult =
  | null
  | { kind: 'confirmed'; transitionReason: string; subscriptionStatus: string | null; auditLogged?: false }
  | { kind: 'rejected'; subscriptionStatus: string | null; auditLogged?: false };

// FR-3 (review), FR-4 (confirm), FR-5 (reject, reason required), FR-6
// (read-only subscription-state visibility after acting). BR-2: there
// is no subscription-mutation control anywhere on this screen — only
// Confirm/Reject, which call the existing payment confirmation service
// through the server; this screen never writes subscription state
// itself.
export default function PaymentDetail({ businessId, paymentId, onBack }: Props) {
  const [data, setData] = useState<PaymentDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null); // which confirmation dialog is open, if any
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await fetchPaymentDetail(businessId, paymentId));
    } catch (err) {
      setError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao carregar o pagamento.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, paymentId]);

  async function handleConfirm() {
    setBusy(true);
    setActionError(null);
    try {
      const r = await confirmPaymentAction(businessId, paymentId);
      setResult({ kind: 'confirmed', transitionReason: r.transitionReason, subscriptionStatus: r.subscriptionStatus, auditLogged: r.auditLogged });
      setPendingAction(null);
      await load(); // refresh payment status (FR-6: current state, not stale)
    } catch (err) {
      // Idempotency/outcome semantics (BR-4) surfaced verbatim, never
      // hidden or reinterpreted as a generic failure.
      setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao confirmar o pagamento.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setActionError('É obrigatório indicar um motivo.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const r = await rejectPaymentAction(businessId, paymentId, rejectReason.trim());
      setResult({ kind: 'rejected', subscriptionStatus: r.subscriptionStatus, auditLogged: r.auditLogged });
      setPendingAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao rejeitar o pagamento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: 16, cursor: 'pointer', padding: 0 }}>
        ← Voltar à fila
      </button>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      {data && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, maxWidth: 520 }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>{data.businessName ?? '(sem nome)'}</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: -8 }}>{businessId}</p>

          <dl style={{ fontSize: 14 }}>
            <Row label="Valor" value={`${data.payment.amount} ${data.payment.currency}`} />
            <Row label="Método" value={data.payment.method} />
            <Row label="Referência" value={data.payment.reference} />
            <Row label="Submetido por" value={data.payment.submittedBy} />
            <Row label="Submetido em" value={new Date(data.payment.submittedAt).toLocaleString('pt-PT')} />
            <Row label="Estado do pagamento" value={data.payment.status} />
            <Row label="Estado da subscrição" value={data.subscriptionStatus ?? '—'} />
          </dl>

          {result && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: result.kind === 'confirmed' ? '#14532d' : '#3f1d1d' }}>
              {result.kind === 'confirmed' ? (
                <>
                  <p style={{ margin: 0 }}>Pagamento confirmado. {result.transitionReason}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a7f3d0' }}>Estado atual da subscrição: {result.subscriptionStatus ?? '—'}</p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0 }}>Pagamento rejeitado. A subscrição não foi alterada.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#fca5a5' }}>Estado atual da subscrição: {result.subscriptionStatus ?? '—'}</p>
                </>
              )}
              {result.auditLogged === false && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#fbbf24' }}>
                  Aviso: a ação foi aplicada, mas o registo de auditoria falhou ao gravar. Reporte isto à equipa técnica.
                </p>
              )}
            </div>
          )}

          {data.payment.status === 'pending' && !result && (
            <div style={{ marginTop: 20 }}>
              {pendingAction === null && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPendingAction('confirm')} style={confirmBtn}>Confirmar Pagamento</button>
                  <button onClick={() => setPendingAction('reject')} style={rejectBtn}>Rejeitar Pagamento</button>
                </div>
              )}

              {pendingAction === 'confirm' && (
                <div style={dialogBox}>
                  <p style={{ marginTop: 0 }}>
                    Confirmar pagamento de <strong>{data.payment.amount} {data.payment.currency}</strong> ({data.payment.method}, ref. {data.payment.reference}) para <strong>{data.businessName ?? businessId}</strong>?
                  </p>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>Esta ação ativa a subscrição através do motor de subscrições existente e não pode ser desfeita nesta tela.</p>
                  {actionError && <p style={{ color: '#f87171' }}>{actionError}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={handleConfirm} disabled={busy} style={confirmBtn}>{busy ? 'A confirmar…' : 'Sim, confirmar'}</button>
                    <button onClick={() => { setPendingAction(null); setActionError(null); }} style={cancelBtn}>Cancelar</button>
                  </div>
                </div>
              )}

              {pendingAction === 'reject' && (
                <div style={dialogBox}>
                  <p style={{ marginTop: 0 }}>Rejeitar este pagamento? É obrigatório indicar um motivo.</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motivo da rejeição…"
                    rows={3}
                    style={{ width: '100%', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', padding: 8 }}
                  />
                  {actionError && <p style={{ color: '#f87171' }}>{actionError}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={handleReject} disabled={busy} style={rejectBtn}>{busy ? 'A rejeitar…' : 'Sim, rejeitar'}</button>
                    <button onClick={() => { setPendingAction(null); setActionError(null); }} style={cancelBtn}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {data.payment.status !== 'pending' && !result && (
            <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
              Este pagamento já está <strong>{data.payment.status}</strong> — nenhuma ação disponível.
            </p>
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

const confirmBtn: React.CSSProperties = { background: '#16a34a', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
const rejectBtn: React.CSSProperties = { background: '#dc2626', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 4, fontWeight: 600 };
const cancelBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 4 };
const dialogBox: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 16 };
