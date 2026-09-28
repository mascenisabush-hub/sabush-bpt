// Review panel for "unconfirmed change" recovery evidence found when a Contagem is resumed.
//
// Until now the finalization gate blocked with "Existem N linha(s) com alterações não confirmadas … reveja-as"
// but the screen offered no way to review or dismiss them. This panel shows each entry (what this phone kept,
// what the server has) and lets the operator discard the local copy. Discarding only removes the copy kept on
// THIS device — nothing is written to or deleted from the shared Contagem.

import { AlertTriangle } from 'lucide-react';

export interface RecoveryEvidenceEntry {
  rowKey: string;
  /** Why this entry is flagged, from the (unchanged) four-case reconciliation. */
  outcome: 'unacknowledged' | 'diverged' | 'fail-closed';
  local: { productName: string; quantity: string; unit: string; sellingPrice: string };
  /** What the server currently holds for this row, when it still exists. */
  server?: { productName: string; quantity: string; unit: string; sellingPrice: string };
}

const REASON: Record<RecoveryEvidenceEntry['outcome'], string> = {
  unacknowledged: 'Esta alteração pode não ter chegado ao servidor.',
  diverged: 'O servidor tem um valor diferente do que este telemóvel guardou.',
  'fail-closed': 'Esta linha já não existe na Contagem.',
};

const describe = (v: { productName: string; quantity: string; unit: string; sellingPrice: string }) =>
  `${v.productName || 'Sem nome'} — ${v.quantity || '—'} ${v.unit}`.trim() + (v.sellingPrice ? ` · preço ${v.sellingPrice}` : '');

interface Props {
  entries: RecoveryEvidenceEntry[];
  onDiscard: (rowKeys: string[]) => void;
}

export default function RecoveryEvidenceReview({ entries, onDiscard }: Props) {
  if (entries.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 space-y-3" role="region" aria-label="Alterações não confirmadas">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.25} aria-hidden="true" />
        <div className="flex-1">
          <p className="text-[13px] font-bold text-amber-800">
            {entries.length === 1 ? '1 alteração não confirmada' : `${entries.length} alterações não confirmadas`}
          </p>
          <p className="text-[12px] text-amber-700 mt-0.5 leading-snug">
            Este telemóvel guardou cópias de linhas desta Contagem que não foi possível confirmar no servidor. Se o que vê na
            Contagem já está certo, descarte a cópia — só é apagada a cópia deste telemóvel, a Contagem não é alterada.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.rowKey} className="bg-white/70 border border-amber-100 rounded-xl px-3 py-2.5 space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-700">{REASON[entry.outcome]}</p>
            <p className="text-[12px] text-gray-700">
              <span className="font-semibold">Neste telemóvel:</span> {describe(entry.local)}
            </p>
            {entry.server && (
              <p className="text-[12px] text-gray-700">
                <span className="font-semibold">Na Contagem:</span> {describe(entry.server)}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Descartar a cópia guardada neste telemóvel? A Contagem não é alterada, mas esta cópia não poderá ser recuperada.'
                  )
                ) {
                  onDiscard([entry.rowKey]);
                }
              }}
              className="text-[12px] font-semibold text-amber-800 underline underline-offset-2"
            >
              Descartar
            </button>
          </li>
        ))}
      </ul>

      {entries.length > 1 && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Descartar as ${entries.length} cópias guardadas neste telemóvel? A Contagem não é alterada, mas estas cópias não poderão ser recuperadas.`
              )
            ) {
              onDiscard(entries.map((e) => e.rowKey));
            }
          }}
          className="w-full py-2 rounded-xl border border-amber-300 bg-white text-[12px] font-bold text-amber-800"
        >
          Descartar todas
        </button>
      )}
    </div>
  );
}
