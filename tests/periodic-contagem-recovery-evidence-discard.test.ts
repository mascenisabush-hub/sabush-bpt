// The "Descartar" review panel for unconfirmed-change recovery evidence.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
// The component relies on the automatic JSX runtime of the app's bundler; tsx compiles it with the classic one.
(globalThis as any).React = React;
// Path kept in a variable so the repo-wide `tsc` (which has no --jsx for tests) does not try to compile the .tsx.
const componentPath = '../apps/tenant/src/components/RecoveryEvidenceReview.tsx';
const { default: RecoveryEvidenceReview } = (await import(componentPath)) as { default: React.ComponentType<any> };

const entry = (rowKey: string, outcome: 'unacknowledged' | 'diverged' | 'fail-closed', withServer = true) => ({
  rowKey,
  outcome,
  local: { productName: 'Patas', quantity: '2', unit: 'Cx', sellingPrice: '2560' },
  server: withServer ? { productName: 'Patas', quantity: '5', unit: 'Cx', sellingPrice: '2560' } : undefined,
});
const render = (entries: ReturnType<typeof entry>[]) =>
  renderToStaticMarkup(React.createElement(RecoveryEvidenceReview, { entries, onDiscard: () => {} }));

describe('RecoveryEvidenceReview', () => {
  it('renders nothing when there is no evidence', () => {
    assert.equal(render([]), '');
  });

  it('shows what this phone kept and what the Contagem has, with a Descartar action per entry', () => {
    const html = render([entry('manual:a', 'diverged')]);
    assert.match(html, /1 alteração não confirmada/);
    assert.match(html, /Neste telemóvel:<\/span> Patas — 2 Cx · preço 2560/);
    assert.match(html, /Na Contagem:<\/span> Patas — 5 Cx · preço 2560/);
    assert.match(html, />Descartar</);
    assert.doesNotMatch(html, /Descartar todas/);
  });

  it('offers "Descartar todas" only when there is more than one entry, and explains each reason', () => {
    const html = render([entry('manual:a', 'fail-closed', false), entry('manual:b', 'unacknowledged'), entry('manual:c', 'diverged')]);
    assert.match(html, /3 alterações não confirmadas/);
    assert.match(html, /Descartar todas/);
    assert.match(html, /já não existe na Contagem/);
    assert.match(html, /pode não ter chegado ao servidor/);
    assert.match(html, /servidor tem um valor diferente/);
  });

  it('tells the operator discarding only affects this phone', () => {
    assert.match(render([entry('manual:a', 'diverged')]), /só é apagada a cópia deste telemóvel/);
  });
});

describe('Descartar wiring in PeriodicStockCountView', () => {
  const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../apps/tenant/src/components/RecoveryEvidenceReview.tsx', import.meta.url), 'utf8');
  const handler = view.match(/const handleDiscardRecoveryEvidence = \(rowKeys: string\[\]\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';

  it('the panel is mounted directly under the error banner, before the form', () => {
    assert.match(view, /<RecoveryEvidenceReview entries=\{recoveryEvidenceEntries\} onDiscard=\{handleDiscardRecoveryEvidence\} \/>\s*<form onSubmit=\{handleRequestConfirmation\}/);
  });
  it('discarding clears ONLY the local snapshot and the evidence entry — no Firestore call', () => {
    assert.ok(handler.length > 0, 'expected handleDiscardRecoveryEvidence');
    assert.match(handler, /clearPeriodicRecoverySnapshot\(activeBusinessId, rowKey\)/);
    assert.match(handler, /setUnresolvedRecoveryEvidence\(/);
    assert.doesNotMatch(handler, /savePeriodic|deletePeriodic|removePeriodic|clearPeriodicStockDraft|migrate|await|setDoc|deleteDoc|updateDoc/);
  });
  it('never runs automatically: only invoked from the panel, and each click asks for confirmation', () => {
    assert.equal((view.match(/handleDiscardRecoveryEvidence\(/g) ?? []).length, 0); // never called directly, only passed to the panel
    assert.match(panel, /window\.confirm\(/);
    assert.equal((panel.match(/window\.confirm\(/g) ?? []).length, 2);
  });
  it('the finalization gate and its message are unchanged (message text now from the shared helper)', () => {
    assert.match(view, /if \(Object\.keys\(unresolvedRecoveryEvidence\)\.length > 0\) \{\s*setError\(\s*unresolvedRecoveryEvidenceMessage\(Object\.keys\(unresolvedRecoveryEvidence\)\.length\)/);
  });
});
