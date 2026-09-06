import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, TriangleAlert, XCircle } from 'lucide-react';
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
      <button onClick={onBack} className="btn-ghost lift mb-4 px-2 py-1.5 text-[13px]">
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar à fila
      </button>

      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border p-3"
          style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
          <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {data && (
        <div className="card-premium max-w-xl p-6">
          <h2 className="type-title-lg font-display">{data.businessName ?? '(sem nome)'}</h2>
          <p className="type-label mb-4" style={{ color: 'var(--muted-foreground)' }}>{businessId}</p>

          <dl>
            <Row label="Valor" value={`${data.payment.amount} ${data.payment.currency}`} isNumber />
            <Row label="Método" value={data.payment.method} />
            <Row label="Referência" value={data.payment.reference} />
            <Row label="Submetido por" value={data.payment.submittedBy} />
            <Row label="Submetido em" value={new Date(data.payment.submittedAt).toLocaleString('pt-PT')} />
            <Row label="Estado do pagamento" value={data.payment.status} />
            <Row label="Estado da subscrição" value={data.subscriptionStatus ?? '—'} last />
          </dl>

          {result && (
            <div
              className="mt-4 rounded-lg border p-3.5"
              style={
                result.kind === 'confirmed'
                  ? { background: 'rgba(5,150,105,0.08)', borderColor: 'rgba(5,150,105,0.3)' }
                  : { background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }
              }
            >
              <div className="flex items-start gap-2">
                {result.kind === 'confirmed' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
                )}
                <div>
                  {result.kind === 'confirmed' ? (
                    <>
                      <p className="type-body text-[13px]">Pagamento confirmado. {result.transitionReason}</p>
                      <p className="type-label mt-1 normal-case tracking-normal" style={{ color: 'var(--success)' }}>
                        Estado atual da subscrição: {result.subscriptionStatus ?? '—'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="type-body text-[13px]">Pagamento rejeitado. A subscrição não foi alterada.</p>
                      <p className="type-label mt-1 normal-case tracking-normal" style={{ color: 'var(--error)' }}>
                        Estado atual da subscrição: {result.subscriptionStatus ?? '—'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {result.auditLogged === false && (
                <p className="type-body mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--warning)' }}>
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  Aviso: a ação foi aplicada, mas o registo de auditoria falhou ao gravar. Reporte isto à equipa técnica.
                </p>
              )}
            </div>
          )}

          {data.payment.status === 'pending' && !result && (
            <div className="mt-5">
              {pendingAction === null && (
                <div className="flex gap-2.5">
                  <button onClick={() => setPendingAction('confirm')} className="btn-primary lift px-4 py-2.5 text-sm">
                    Confirmar Pagamento
                  </button>
                  <button
                    onClick={() => setPendingAction('reject')}
                    className="lift rounded-[10px] bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.55)] hover:bg-rose-500"
                  >
                    Rejeitar Pagamento
                  </button>
                </div>
              )}

              {pendingAction === 'confirm' && (
                <div className="card-premium is-action p-4">
                  <p className="type-body">
                    Confirmar pagamento de{' '}
                    <strong className="font-bold">{data.payment.amount} {data.payment.currency}</strong>{' '}
                    ({data.payment.method}, ref. {data.payment.reference}) para{' '}
                    <strong className="font-bold">{data.businessName ?? businessId}</strong>?
                  </p>
                  <p className="type-body mt-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    Esta ação ativa a subscrição através do motor de subscrições existente e não pode ser desfeita nesta tela.
                  </p>
                  {actionError && <p className="type-body mt-2 text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
                  <div className="mt-3 flex gap-2.5">
                    <button onClick={handleConfirm} disabled={busy} className="btn-primary lift px-4 py-2 text-sm">
                      {busy ? 'A confirmar…' : 'Sim, confirmar'}
                    </button>
                    <button
                      onClick={() => { setPendingAction(null); setActionError(null); }}
                      className="btn-secondary lift px-4 py-2 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Destructive confirmation per DESIGN_SYSTEM.md → Dialogs &
                  modals: rose-tinted banner, rose confirm button. */}
              {pendingAction === 'reject' && (
                <div className="rounded-[10px] border border-rose-500/30 bg-rose-500/10 p-4">
                  <p className="type-body text-rose-700">Rejeitar este pagamento? É obrigatório indicar um motivo.</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motivo da rejeição…"
                    rows={3}
                    className="input-base type-body mt-2 w-full p-2.5"
                    style={{ borderColor: 'rgba(225,29,72,0.35)' }}
                  />
                  {actionError && <p className="type-body mt-2 text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
                  <div className="mt-3 flex gap-2.5">
                    <button
                      onClick={handleReject}
                      disabled={busy}
                      className="lift rounded-[10px] bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.55)] hover:bg-rose-500"
                    >
                      {busy ? 'A rejeitar…' : 'Sim, rejeitar'}
                    </button>
                    <button
                      onClick={() => { setPendingAction(null); setActionError(null); }}
                      className="btn-secondary lift px-4 py-2 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {data.payment.status !== 'pending' && !result && (
            <p className="type-body mt-4 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Este pagamento já está <strong className="font-bold">{data.payment.status}</strong> — nenhuma ação disponível.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, isNumber, last }: { label: string; value: string; isNumber?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? '' : 'border-b'}`} style={{ borderColor: 'var(--border)' }}>
      <dt className="type-label" style={{ color: 'var(--muted-foreground)' }}>{label}</dt>
      <dd className={`m-0 ${isNumber ? 'type-number' : 'type-body'} text-[13.5px]`}>{value}</dd>
    </div>
  );
}
