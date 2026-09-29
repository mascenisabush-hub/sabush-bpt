// SABUSH BPT — Periodic Contagem: warnings name the products concerned, and
// the "alterações não confirmadas" warning never outlives its evidence
// (Owner-reported: "Existem 1 linha(s)…" with no product and nothing to review).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatProductNames,
  unresolvedRecoveryEvidenceMessage,
  unsafeRowsMessage,
  identityCheckPendingMessage,
} from '../apps/tenant/src/lib/periodicFinalizationGateMessages.ts';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

test('messages include the product names when given', () => {
  assert.equal(
    unresolvedRecoveryEvidenceMessage(1, ['Black cat grde']),
    'Existem 1 linha(s) com alterações não confirmadas encontradas ao retomar esta Contagem: "Black cat grde" — reveja-as no quadro abaixo antes de confirmar.'
  );
  assert.match(unsafeRowsMessage(2, ['Agua 500ml', 'Benas']), /por resolver: "Agua 500ml", "Benas" — reveja-as/);
  assert.match(identityCheckPendingMessage(1, ['Arima Verde 25kg']), /não resolvido: "Arima Verde 25kg" e precisam/);
});

test('without names the messages read as before (count only)', () => {
  assert.match(unresolvedRecoveryEvidenceMessage(2), /^Existem 2 linha\(s\) com alterações não confirmadas encontradas ao retomar esta Contagem — /);
  assert.doesNotMatch(unsafeRowsMessage(1), /:/);
});

test('long lists are capped at 5 names, blank names are labelled', () => {
  assert.equal(formatProductNames(['A', 'B', 'C', 'D', 'E', 'F', 'G']), '"A", "B", "C", "D", "E" e mais 2');
  assert.equal(formatProductNames(['  ']), '"(sem nome)"');
});

test('every place that shows these warnings passes the product names', () => {
  const calls = [...view.matchAll(/unresolvedRecoveryEvidenceMessage\(([^\n]*)/g)].map((m) => m[1]).filter((a) => !a.startsWith('\n'));
  assert.equal(calls.length, 4, 'resume, Rever e Confirmar, confirm, and the sync helper');
  for (const args of calls) assert.match(args, /recoveryEvidenceProductNames\(/, `call without names: ${args}`);
  assert.equal((view.match(/unsafeRowsMessage\(/g) ?? []).length, 2);
  assert.match(view, /unsafeRowsMessage\(unsafeRowEntries\.length, unsafeRowEntries\.map\(productNameForRowKey\)\)/);
  assert.equal((view.match(/identityCheckPendingMessage\([a-zA-Z]+\.length, [a-zA-Z]+\.map\(productNameForRowKey\)\)/g) ?? []).length, 3);
});

test('the warning is re-stated or cleared when its entries resolve on their own or are discarded', () => {
  const effStart = view.indexOf('if (stillPresent.length !== keys.length) {');
  const eff = view.slice(effStart, effStart + 700);
  assert.match(eff, /setUnresolvedRecoveryEvidence\(remaining\);[\s\S]*?syncRecoveryEvidenceError\(remaining\);/);
  const dStart = view.indexOf('const handleDiscardRecoveryEvidence = (rowKeys: string[]) => {');
  const discard = view.slice(dStart, view.indexOf('\n  };', dStart));
  assert.match(discard, /syncRecoveryEvidenceError\(remaining\);/);
  const sStart = view.indexOf('const syncRecoveryEvidenceError = (');
  const sync = view.slice(sStart, view.indexOf('\n  };', sStart));
  assert.match(sync, /prev && prev\.includes\('alterações não confirmadas'\)/, 'only ever touches this specific warning');
  assert.match(sync, /count > 0\s*\?\s*unresolvedRecoveryEvidenceMessage\(count, recoveryEvidenceProductNames\(remaining\)\)\s*:\s*null/);
});
