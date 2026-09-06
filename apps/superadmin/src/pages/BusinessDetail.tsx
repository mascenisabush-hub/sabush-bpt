import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import {
  fetchBusinessDetail,
  suspendBusiness,
  reactivateBusiness,
  authorizeInitialStockRecovery,
  authorizeBusinessWorthRecovery,
  type BusinessDetailResponse,
  SuperAdminApiError,
} from '../lib/superadminApi';

interface Props {
  businessId: string;
  onBack: () => void;
}

// SuperAdmin V1 Operational Control Plane — Phase B (ADR-0006). FR-B3.
// BR-4 (read-only, absolute): this screen has no edit control of any
// kind, anywhere — not disabled, simply never rendered. BR-7:
// justification is required before the detail loads at all — the
// input gates the fetch itself, not a passive field alongside it.
// SuperAdmin V1 Operational Control Plane — Phase C (ADR-0006, Gap 1
// CONFIRMED) adds the suspend/reactivate actions below. This page
// remains read-only otherwise — no other field is ever writable from
// here, no subscription/payment control, no deletion.
type PendingAction = null | 'suspend' | 'reactivate' | 'authorize-recovery' | 'authorize-business-worth-recovery';

export default function BusinessDetail({ businessId, onBack }: Props) {
  const [justification, setJustification] = useState('');
  const [data, setData] = useState<BusinessDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionJustification, setActionJustification] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  // [SuperAdmin-Assisted Initial Stock Recovery] The confirmation slot
  // to authorize — 'initial' covers the primary case (the original
  // confirmation, legacy or expired-window). A future iteration could
  // surface the full chain (initial/initial-2/initial-3) for the rarer
  // case of authorizing a later redo; kept as a plain editable field
  // for now rather than blocking this capability on that UI.
  const [recoveryTargetStockCountId, setRecoveryTargetStockCountId] = useState('initial');
  // [Product Architect direction — UX-quality pass, this session]
  // Defaults to the locked, displayed-not-typed primary case. The
  // actual current-confirmation-only check remains exclusively
  // server-side (server/initialStockRecoveryAuthorization.ts's own
  // grant-time validation) — this toggle only decides what this form
  // SHOWS the operator; it grants no authority the server doesn't
  // independently re-verify.
  const [useAdvancedTarget, setUseAdvancedTarget] = useState(false);
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §26, FR-40] A FULLY SEPARATE target field from
  // recoveryTargetStockCountId above — no common-case default exists
  // here (unlike Initial Stock's own single, fixed 'initial' slot, a
  // BusinessWorthSnapshot id is always business/Contagem-specific), so
  // this is always operator-entered, obtained from the business's own
  // Dashboard (Business Worth history) during the support interaction
  // — never fabricated or guessed here. The server independently
  // re-verifies eligibility (grantBusinessWorthRecoveryAuthorization())
  // regardless of what is typed.
  const [businessWorthTargetSnapshotId, setBusinessWorthTargetSnapshotId] = useState('');

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

  async function handleSuspend() {
    if (!actionJustification.trim()) {
      setActionError('É obrigatório indicar uma justificação.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await suspendBusiness(businessId, actionJustification.trim());
      setActionResult('Negócio suspenso com sucesso.');
      setPendingAction(null);
      setActionJustification('');
      await fetchBusinessDetail(businessId, justification.trim()).then(setData);
    } catch (err) {
      if (err instanceof SuperAdminApiError && err.status === 409) {
        setActionError('Este negócio já está suspenso.');
      } else {
        setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao suspender o negócio.');
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReactivate() {
    if (!actionJustification.trim()) {
      setActionError('É obrigatório indicar uma justificação.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await reactivateBusiness(businessId, actionJustification.trim());
      setActionResult('Negócio reativado com sucesso.');
      setPendingAction(null);
      setActionJustification('');
      await fetchBusinessDetail(businessId, justification.trim()).then(setData);
    } catch (err) {
      if (err instanceof SuperAdminApiError && err.status === 409) {
        setActionError('Este negócio já está ativo.');
      } else {
        setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao reativar o negócio.');
      }
    } finally {
      setActionBusy(false);
    }
  }

  // [SuperAdmin-Assisted Initial Stock Recovery — BDR-0016/POL-0009/
  // Rule 8 (READY)/Implementation Authorization, signed 2026-08-21]
  // Grants a 48-hour Authorization; does NOT perform any recovery
  // itself. Mirrors handleSuspend/handleReactivate's own shape exactly
  // — same justification-required, same error/result pattern.
  async function handleAuthorizeRecovery() {
    if (!actionJustification.trim()) {
      setActionError('É obrigatório indicar uma justificação.');
      return;
    }
    if (!recoveryTargetStockCountId.trim()) {
      setActionError('É obrigatório indicar a confirmação a autorizar.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const result = await authorizeInitialStockRecovery(businessId, recoveryTargetStockCountId.trim(), actionJustification.trim());
      const hoursRemaining = Math.max(0, Math.round((result.expiresAtMs - Date.now()) / (60 * 60 * 1000)));
      setActionResult(
        `Autorização de recuperação concedida. O dono tem ${hoursRemaining}h para executar a recuperação — a autorização expira automaticamente depois disso.` +
          (result.auditLogged === false ? ' Aviso: o registo de auditoria falhou ao gravar.' : '')
      );
      setPendingAction(null);
      setActionJustification('');
    } catch (err) {
      if (err instanceof SuperAdminApiError && err.status === 409) {
        setActionError(err.message || 'Já existe uma autorização ativa, ou esta confirmação não é elegível.');
      } else {
        setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao autorizar a recuperação.');
      }
    } finally {
      setActionBusy(false);
    }
  }

  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8; Specification §26, FR-40-FR-43; Plan §13] Grants a 72-hour
  // Authorization; does NOT perform any recovery itself — mirrors
  // handleAuthorizeRecovery's own shape exactly, for a FULLY SEPARATE
  // mechanism (a different target type, a different collection, a
  // different route — never sharing state with Initial-Stock recovery).
  async function handleAuthorizeBusinessWorthRecovery() {
    if (!actionJustification.trim()) {
      setActionError('É obrigatório indicar uma justificação.');
      return;
    }
    if (!businessWorthTargetSnapshotId.trim()) {
      setActionError('É obrigatório indicar o registo de valor do negócio a autorizar.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const result = await authorizeBusinessWorthRecovery(businessId, businessWorthTargetSnapshotId.trim(), actionJustification.trim());
      const hoursRemaining = Math.max(0, Math.round((result.expiresAtMs - Date.now()) / (60 * 60 * 1000)));
      setActionResult(
        `Autorização de recuperação de valor do negócio concedida. O dono tem ${hoursRemaining}h para executar a recuperação — a autorização expira automaticamente depois disso.` +
          (result.auditLogged === false ? ' Aviso: o registo de auditoria falhou ao gravar.' : '')
      );
      setPendingAction(null);
      setActionJustification('');
      setBusinessWorthTargetSnapshotId('');
    } catch (err) {
      if (err instanceof SuperAdminApiError && err.status === 409) {
        setActionError(err.message || 'Já existe uma autorização ativa, ou este registo não é o atual do negócio.');
      } else {
        setActionError(err instanceof SuperAdminApiError ? err.message : 'Ocorreu um erro ao autorizar a recuperação.');
      }
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost lift mb-2 px-2 py-1.5 text-[13px]">
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar à pesquisa
      </button>

      <p className="type-label mb-4" style={{ color: 'var(--muted-foreground)' }}>{businessId}</p>

      {!data && (
        <div className="card-premium max-w-lg p-6">
          <p className="type-body mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            É obrigatório indicar uma justificação para consultar os dados deste negócio. Esta ação fica registada no registo de auditoria.
          </p>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Motivo da consulta…"
            rows={3}
            className="input-base type-body mb-2 w-full p-2.5"
          />
          {error && <p className="type-body mb-2 text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          <button onClick={handleLoad} disabled={busy} className="btn-primary lift px-4 py-2.5 text-sm">
            {busy ? 'A carregar…' : 'Consultar negócio'}
          </button>
        </div>
      )}

      {data && (
        <div className="card-premium max-w-2xl p-6">
          <h2 className="type-title-lg font-display flex items-center gap-2.5">
            {data.name ?? '(sem nome)'}
            <span
              className="badge-soft"
              style={
                data.suspended
                  ? { background: 'rgba(220,38,38,0.12)', color: 'var(--error)' }
                  : { background: 'rgba(5,150,105,0.12)', color: 'var(--success)' }
              }
            >
              {data.suspended ? 'SUSPENSO' : 'ATIVO'}
            </span>
          </h2>

          {data.auditLogged === false && (
            <p className="type-body mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--warning)' }}>
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Aviso: os dados foram consultados, mas o registo de auditoria falhou ao gravar. Reporte isto à equipa técnica.
            </p>
          )}

          <dl className="mt-3">
            <Row label="Categoria" value={data.category ?? '—'} />
            <Row label="Moeda" value={data.currencySymbol ?? '—'} />
            <Row label="Criado em" value={data.createdAt ? new Date(data.createdAt).toLocaleString('pt-PT') : '—'} />
            <Row label="Estado da subscrição" value={data.subscriptionStatus ?? '—'} last />
          </dl>

          <h3 className="type-title mt-6 mb-2">Dono</h3>
          <dl>
            <Row label="Nome" value={data.owner?.name ?? '—'} />
            <Row label="Email" value={data.owner?.email ?? '—'} last />
          </dl>

          <h3 className="type-title mt-6 mb-2">Equipa ({data.staff.length})</h3>
          {data.staff.length === 0 && <p className="type-body text-[13px]" style={{ color: 'var(--muted-foreground)' }}>Sem funcionários.</p>}
          {data.staff.length > 0 && (
            <ul className="m-0 list-disc space-y-1 pl-[18px]">
              {data.staff.map((s, i) => (
                <li key={i} className="type-body text-[13px]" style={{ color: s.suspended ? 'var(--error)' : 'var(--foreground)' }}>
                  {s.name} {s.suspended && '(suspenso)'}
                </li>
              ))}
            </ul>
          )}

          <h3 className="type-title mt-6 mb-2">Pagamentos recentes ({data.recentPayments.length})</h3>
          {data.recentPayments.length === 0 && <p className="type-body text-[13px]" style={{ color: 'var(--muted-foreground)' }}>Sem pagamentos.</p>}
          {data.recentPayments.length > 0 && (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <table className="table-clean w-full text-left">
                <thead>
                  <tr>
                    <th className="type-label px-3.5 py-2.5">Valor</th>
                    <th className="type-label px-3.5 py-2.5">Estado</th>
                    <th className="type-label px-3.5 py-2.5">Submetido em</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p, i) => (
                    <tr key={i}>
                      <td className="type-number px-3.5 py-2.5 text-[13px]">{p.amount ?? '—'} {p.currency ?? ''}</td>
                      <td className="type-body px-3.5 py-2.5 text-[13px]">{p.status ?? '—'}</td>
                      <td className="type-body px-3.5 py-2.5 text-[13px]">{p.submittedAt ? new Date(p.submittedAt).toLocaleString('pt-PT') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="type-title mt-6 mb-2.5">Suspensão</h3>

          {actionResult && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border p-3" style={{ background: 'rgba(5,150,105,0.08)', borderColor: 'rgba(5,150,105,0.3)' }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
              <p className="type-body text-[13px]">{actionResult}</p>
            </div>
          )}

          {pendingAction === null && (
            data.suspended ? (
              <button
                onClick={() => { setPendingAction('reactivate'); setActionError(null); setActionResult(null); }}
                className="btn-primary lift px-4 py-2.5 text-sm"
              >
                Reativar negócio
              </button>
            ) : (
              <button
                onClick={() => { setPendingAction('suspend'); setActionError(null); setActionResult(null); }}
                className="lift rounded-[10px] bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.55)] hover:bg-rose-500"
              >
                Suspender negócio
              </button>
            )
          )}

          {/* Destructive confirmation per DESIGN_SYSTEM.md → Dialogs &
              modals: rose-tinted banner, rose confirm button. */}
          {pendingAction === 'suspend' && (
            <div className="rounded-[10px] border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="type-body text-rose-700">
                Suspender <strong className="font-bold">{data.name ?? businessId}</strong>? O dono e a equipa deixarão de conseguir ler ou escrever dados do negócio de imediato. É obrigatório indicar uma justificação.
              </p>
              <textarea
                value={actionJustification}
                onChange={(e) => setActionJustification(e.target.value)}
                placeholder="Motivo da suspensão…"
                rows={3}
                className="input-base type-body mt-2 w-full p-2.5"
                style={{ borderColor: 'rgba(225,29,72,0.35)' }}
              />
              {actionError && <p className="type-body mt-2 text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
              <div className="mt-3 flex gap-2.5">
                <button
                  onClick={handleSuspend}
                  disabled={actionBusy}
                  className="lift rounded-[10px] bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.55)] hover:bg-rose-500"
                >
                  {actionBusy ? 'A suspender…' : 'Sim, suspender'}
                </button>
                <button onClick={() => { setPendingAction(null); setActionError(null); setActionJustification(''); }} className="btn-secondary lift px-4 py-2 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {pendingAction === 'reactivate' && (
            <div className="card-premium is-action p-4">
              <p className="type-body">
                Reativar <strong className="font-bold">{data.name ?? businessId}</strong>? O acesso normal será restaurado de imediato. É obrigatório indicar uma justificação.
              </p>
              <textarea
                value={actionJustification}
                onChange={(e) => setActionJustification(e.target.value)}
                placeholder="Motivo da reativação…"
                rows={3}
                className="input-base type-body mt-2 w-full p-2.5"
              />
              {actionError && <p className="type-body mt-2 text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
              <div className="mt-3 flex gap-2.5">
                <button onClick={handleReactivate} disabled={actionBusy} className="btn-primary lift px-4 py-2 text-sm">
                  {actionBusy ? 'A reativar…' : 'Sim, reativar'}
                </button>
                <button onClick={() => { setPendingAction(null); setActionError(null); setActionJustification(''); }} className="btn-secondary lift px-4 py-2 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <h3 className="type-title mt-6 mb-2">Recuperação de Capital Inicial</h3>
          <p className="type-body mb-2.5 text-[12.5px]" style={{ color: 'var(--muted-foreground)' }}>
            Concede ao dono uma janela de 48 horas para recuperar uma confirmação de Capital Inicial acidental ou legada, através do fluxo normal de Anular &amp; Refazer. O SuperAdmin apenas autoriza — quem executa a recuperação é sempre o dono do negócio.
          </p>

          {pendingAction === null && (
            <button
              onClick={() => { setPendingAction('authorize-recovery'); setActionError(null); setActionResult(null); }}
              className="btn-primary lift px-4 py-2.5 text-sm"
            >
              Autorizar recuperação de Capital Inicial
            </button>
          )}

          {pendingAction === 'authorize-recovery' && (
            <div className="card-premium is-action p-4">
              <p className="type-body">
                Autorizar recuperação para <strong className="font-bold">{data.name ?? businessId}</strong>? Isto concede ao dono uma janela de <strong className="font-bold">48 horas</strong> para executar a recuperação — o SuperAdmin não realiza a recuperação em si. Só pode existir uma autorização ativa por negócio. É obrigatório indicar uma justificação.
              </p>

              {!useAdvancedTarget ? (
                <div className="mb-2 mt-2 rounded-lg border p-2.5" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                  <p className="type-label mb-1" style={{ color: 'var(--muted-foreground)' }}>A autorizar:</p>
                  <p className="type-body m-0 font-bold">
                    Confirmação original de Capital Inicial <span className="font-mono" style={{ color: 'var(--success)' }}>(&quot;initial&quot;)</span>
                  </p>
                  <p className="type-body mt-1 text-[11.5px]" style={{ color: 'var(--muted-foreground)' }}>
                    Cobre o caso mais comum — confirmações legadas (anteriores a esta funcionalidade) ou confirmações
                    cuja janela normal de 12 horas já expirou. O servidor confirma automaticamente que esta é a
                    confirmação atual do negócio antes de conceder qualquer autorização.
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseAdvancedTarget(true)}
                    className="mt-2 text-[11.5px] font-semibold underline"
                    style={{ color: 'var(--gold-hover)' }}
                  >
                    Avançado: autorizar outra confirmação (raro)
                  </button>
                </div>
              ) : (
                <div className="mb-2 mt-2">
                  <label className="type-body mb-1 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--warning)' }}>
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    Avançado — identificador exato da confirmação (ex: &quot;initial-2&quot;). Só use isto se souber
                    concretamente que não é a confirmação original — um valor incorreto será rejeitado pelo servidor,
                    nunca aceite às cegas.
                  </label>
                  <input
                    type="text"
                    value={recoveryTargetStockCountId}
                    onChange={(e) => setRecoveryTargetStockCountId(e.target.value)}
                    placeholder="initial-2"
                    className="input-base type-body mb-1 w-full p-2.5"
                    style={{ borderColor: 'var(--warning)' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setUseAdvancedTarget(false); setRecoveryTargetStockCountId('initial'); }}
                    className="text-[11.5px] font-semibold underline"
                    style={{ color: 'var(--gold-hover)' }}
                  >
                    Voltar ao caso comum (&quot;initial&quot;)
                  </button>
                </div>
              )}

              <textarea
                value={actionJustification}
                onChange={(e) => setActionJustification(e.target.value)}
                placeholder="Motivo da recuperação (ex: cliente confirmou Capital Inicial por engano)…"
                rows={3}
                className="input-base type-body mb-2 w-full p-2.5"
              />
              {actionError && <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
              <div className="flex gap-2.5">
                <button onClick={handleAuthorizeRecovery} disabled={actionBusy} className="btn-primary lift px-4 py-2 text-sm">
                  {actionBusy ? 'A autorizar…' : 'Sim, autorizar (48h)'}
                </button>
                <button
                  onClick={() => { setPendingAction(null); setActionError(null); setActionJustification(''); setUseAdvancedTarget(false); setRecoveryTargetStockCountId('initial'); }}
                  className="btn-secondary lift px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* [Business Worth Evolution — Implementation Authorization,
              Increment 8; Specification §26, FR-40-FR-43; Plan §13] A
              FULLY SEPARATE panel from Initial-Stock recovery above —
              never sharing state, a route, or a collection with it
              (FR-43). Same justification-required, same error/result
              pattern as every other SuperAdmin action on this page. */}
          <h3 className="type-title mt-6 mb-2">Recuperação de Valor do Negócio</h3>
          <p className="type-body mb-2.5 text-[12.5px]" style={{ color: 'var(--muted-foreground)' }}>
            Concede ao dono uma janela de 72 horas para corrigir/recuperar um registo de valor do negócio (Contagem) fora do prazo normal de 3 horas. O SuperAdmin apenas autoriza — quem executa a correção é sempre o dono do negócio, através do fluxo normal de Contagem.
          </p>

          {pendingAction === null && (
            <button
              onClick={() => { setPendingAction('authorize-business-worth-recovery'); setActionError(null); setActionResult(null); }}
              className="btn-primary lift px-4 py-2.5 text-sm"
            >
              Autorizar recuperação de Valor do Negócio
            </button>
          )}

          {pendingAction === 'authorize-business-worth-recovery' && (
            <div className="card-premium is-action p-4">
              <p className="type-body">
                Autorizar recuperação para <strong className="font-bold">{data.name ?? businessId}</strong>? Isto concede ao dono uma janela de <strong className="font-bold">72 horas</strong> para executar a correção — o SuperAdmin não realiza a correção em si. Só pode existir uma autorização ativa por negócio. É obrigatório indicar uma justificação.
              </p>

              <div className="mb-2 mt-2">
                <label className="type-body mb-1 block text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  Identificador exato do registo de valor do negócio (obtenha-o junto do dono — visível no histórico de Valor do Negócio no Painel do negócio). Um valor incorreto ou já não-atual será rejeitado pelo servidor, nunca aceite às cegas.
                </label>
                <input
                  type="text"
                  value={businessWorthTargetSnapshotId}
                  onChange={(e) => setBusinessWorthTargetSnapshotId(e.target.value)}
                  placeholder="bws-stockcount-periodic-..."
                  className="input-base type-body w-full p-2.5 font-mono"
                />
              </div>

              <textarea
                value={actionJustification}
                onChange={(e) => setActionJustification(e.target.value)}
                placeholder="Motivo da recuperação (ex: cliente contactou o suporte após o prazo de 3 horas)…"
                rows={3}
                className="input-base type-body mb-2 w-full p-2.5"
              />
              {actionError && <p className="type-body text-[13px]" style={{ color: 'var(--error)' }}>{actionError}</p>}
              <div className="flex gap-2.5">
                <button onClick={handleAuthorizeBusinessWorthRecovery} disabled={actionBusy} className="btn-primary lift px-4 py-2 text-sm">
                  {actionBusy ? 'A autorizar…' : 'Sim, autorizar (72h)'}
                </button>
                <button
                  onClick={() => { setPendingAction(null); setActionError(null); setActionJustification(''); setBusinessWorthTargetSnapshotId(''); }}
                  className="btn-secondary lift px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? '' : 'border-b'}`} style={{ borderColor: 'var(--border)' }}>
      <dt className="type-label" style={{ color: 'var(--muted-foreground)' }}>{label}</dt>
      <dd className="type-body m-0 text-[13.5px]">{value}</dd>
    </div>
  );
}
