// Periodic Contagem — "Começar de Novo" Discard-Confirmation Safety Fix.
//
// [Governing chain: stock-count-data-loss-resilience-specification.md
// §6, §13 -> periodic-contagem-discard-confirmation-safety-rule8-assessment.md
// (READY) -> ...-implementation-plan.md ->
// ...-implementation-authorization.md (SIGNED — SABUSHIMIKE MASCENI,
// 28 August 2026)]
//
// Proves: (1) a single click on "Começar de Novo" can never itself
// discard the draft — clearPeriodicStockDraft is only reachable from
// the confirmation step's own "Começar Nova Contagem" action; (2)
// "Cancelar" never calls clearPeriodicStockDraft and returns to the
// original banner; (3) "Retomar Contagem" remains directly reachable,
// unmodified, from both banner states; (4) handleDiscardDraft awaits
// the delete before setDraftBannerDismissed(true) — closing the
// identified autosave/delete race (F4) by construction, not by
// convention.
//
// SCOPE: same documented constraint as
// tests/periodic-stock-interruption-durability.test.ts — no
// jsdom/testing-library harness in this repo for
// PeriodicStockCountView.tsx. Source-structure/ordering checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-discard-confirmation-safety.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('discardConfirmState — new local state, no schema/storage change', () => {
  it('declares a three-state local enum (idle/confirming/discarding), not a Firestore field', () => {
    assert.match(source, /const \[discardConfirmState, setDiscardConfirmState\] = useState<'idle' \| 'confirming' \| 'discarding'>\('idle'\)/);
  });

  it('is reset to \'idle\' on a business switch, alongside draftBannerDismissed', () => {
    const start = source.indexOf('setDraftBannerDismissed(false);');
    assert.notEqual(start, -1);
    const nearby = source.slice(start, start + 300);
    assert.match(nearby, /setDiscardConfirmState\('idle'\)/);
  });
});

describe('§1 — a single "Começar de Novo" click can never discard the draft', () => {
  it('the idle-state "Começar de Novo" button calls setDiscardConfirmState(\'confirming\'), never handleDiscardDraft', () => {
    const idleButtonMatch = source.match(
      /onClick=\{\(\) => setDiscardConfirmState\('confirming'\)\}[\s\S]{0,200}?Começar de Novo/
    );
    assert.ok(idleButtonMatch, 'Expected the idle-state "Começar de Novo" button to open the confirmation step, not discard directly.');
  });

  it('handleDiscardDraft is not wired to any onClick alongside the literal label "Começar de Novo"', () => {
    // The only remaining onClick={handleDiscardDraft} must be paired
    // with "Começar Nova Contagem" (the confirmation step's own
    // action), never the original "Começar de Novo" label.
    const handleDiscardOnClicks = (source.match(/onClick=\{handleDiscardDraft\}/g) || []).length;
    assert.equal(handleDiscardOnClicks, 1, 'handleDiscardDraft should have exactly one call site: the confirmation step.');
    const confirmButtonMatch = source.match(/onClick=\{handleDiscardDraft\}[\s\S]{0,500}?Começar Nova Contagem/);
    assert.ok(confirmButtonMatch, 'The single handleDiscardDraft call site must be the confirmation step\'s "Começar Nova Contagem" action.');
  });
});

describe('§2/§3 — "Cancelar" leaves the draft completely intact', () => {
  it('the confirmation step\'s "Cancelar" button calls setDiscardConfirmState(\'idle\'), never clearPeriodicStockDraft/handleDiscardDraft', () => {
    const cancelMatch = source.match(/onClick=\{\(\) => setDiscardConfirmState\('idle'\)\}[\s\S]{0,400}?Cancelar/);
    assert.ok(cancelMatch, 'Expected "Cancelar" to return to the idle banner state.');
  });

  it('clearPeriodicStockDraft is called from exactly one place in this component: inside handleDiscardDraft', () => {
    const callCount = (source.match(/await clearPeriodicStockDraft\(\);/g) || []).length;
    assert.equal(callCount, 1);
  });
});

describe('§4 — "Retomar Contagem" is unaffected and reachable from both banner states', () => {
  it('handleResumeDraft itself is untouched — still exists, still keyed off periodicStockDraft', () => {
    assert.match(source, /const handleResumeDraft = \(\) => \{/);
    assert.match(source, /if \(!periodicStockDraft\) return;/);
  });

  it('"Retomar Contagem" is wired to handleResumeDraft in both the idle banner and the confirmation step', () => {
    const retomarWiringCount = (source.match(/onClick=\{handleResumeDraft\}/g) || []).length;
    assert.equal(retomarWiringCount, 2, 'Expected "Retomar Contagem" to be directly reachable from both the idle and confirming states.');
  });
});

describe('§5 — the confirmed discard path matches today\'s existing outcome', () => {
  it('"Começar Nova Contagem" is the only path into handleDiscardDraft (already proven above); its label reflects the discarding state while in flight', () => {
    assert.match(source, /\{discardConfirmState === 'discarding' \? 'A descartar\.\.\.' : 'Começar Nova Contagem'\}/);
  });
});

describe('§6 — handleDiscardDraft awaits the delete before revealing the blank form (F4 closed by construction)', () => {
  it('setDraftBannerDismissed(true) is inside the finally block, after the await, not before it', () => {
    const fnMatch = source.match(/const handleDiscardDraft = async \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'Could not locate handleDiscardDraft.');
    const body = fnMatch[0];
    const setDiscardingIdx = body.indexOf("setDiscardConfirmState('discarding')");
    const awaitIdx = body.indexOf('await clearPeriodicStockDraft()');
    const finallyIdx = body.indexOf('finally {');
    const setDismissedIdx = body.indexOf('setDraftBannerDismissed(true)');
    assert.ok(setDiscardingIdx !== -1 && awaitIdx !== -1 && finallyIdx !== -1 && setDismissedIdx !== -1);
    // Correct order: enter 'discarding' state -> await the delete ->
    // only then, inside finally (so it runs on success AND failure),
    // reveal the blank form. This is the exact reordering that closes
    // F4 — the blank form (and every input capable of scheduling a new
    // autosave) is unreachable until the delete has fully settled.
    assert.ok(setDiscardingIdx < awaitIdx, "'discarding' state must be entered before the delete is awaited.");
    assert.ok(awaitIdx < finallyIdx, 'The delete must be awaited before the finally block.');
    assert.ok(finallyIdx < setDismissedIdx, 'setDraftBannerDismissed(true) must be inside the finally block, after the await.');
  });

  it('the confirming/discarding action buttons are disabled while discardConfirmState is \'discarding\', preventing a second concurrent delete call', () => {
    const discardingDisableCount = (source.match(/disabled=\{discardConfirmState === 'discarding'\}/g) || []).length;
    assert.equal(discardingDisableCount, 3, 'Expected all three confirmation-step buttons (Cancelar, Retomar Contagem, Começar Nova Contagem) to disable during discarding.');
  });
});

describe('§7 — no multi-draft, new collection, schema, or retention mechanism introduced', () => {
  it('savePeriodicStockDraft is not called from anywhere touched by this fix (no new draft is stashed anywhere)', () => {
    // savePeriodicStockDraft is legitimately called elsewhere (ordinary
    // autosave, scheduleDraftSave) — this fix must not add any NEW call
    // site tied to discardConfirmState/handleDiscardDraft.
    const fnMatch = source.match(/const handleDiscardDraft = async \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.doesNotMatch(fnMatch[0], /savePeriodicStockDraft/);
  });

  it('no reference to a second stockCountDrafts document id, a new collection, or a retention/expiry concept exists in this component', () => {
    assert.doesNotMatch(source, /stockCountDrafts['"], ['"](?!periodic['"])(?!initial['"])/);
  });
});
