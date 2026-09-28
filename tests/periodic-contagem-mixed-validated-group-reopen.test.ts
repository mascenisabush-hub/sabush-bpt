// SABUSH BPT — Periodic Contagem: a group with SOME portions validated
// must reopen every portion when activated ("Abrir").
//
// Bug (reported live, "Black Cat pek — 2 porções"): one portion
// validated, one not. "Abrir" went through
// handleSelectExistingProductForWorkspace, which leaves validated rows
// validated; the workspace's active-row loop hides validated rows, so
// the validated portion could not be seen, edited or deleted (no trash
// button), while still counting in "Porção 1/2" and in the total.
//
// Fix: handleGroupActivation routes any group with at least one
// validated member through reopenExistingProductForEditing (the same
// path "Editar" uses), which un-validates every portion and keeps
// Voltar's restore behavior.
//
// Source-text pin, per this repo's precedent (no DOM/React harness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'apps/tenant/src/components/PeriodicStockCountView.tsx'), 'utf8');

const start = src.indexOf('const handleGroupActivation = () => {');
const body = src.slice(start, src.indexOf('\n                    };', start));

test('handleGroupActivation exists', () => {
  assert.ok(start > 0);
});

test('a partially validated group reopens through reopenExistingProductForEditing', () => {
  const anyValidated = body.indexOf('group.members.some((m) => m.validated)');
  const reopen = body.indexOf('reopenExistingProductForEditing(representative.activationKey, explicitProductId)', anyValidated);
  const plainOpen = body.lastIndexOf('handleSelectExistingProductForWorkspace(representative.activationKey, explicitProductId)');
  assert.ok(anyValidated > 0, 'checks whether any member is validated');
  assert.ok(reopen > anyValidated, 'reopens all portions when some are validated');
  assert.ok(plainOpen > reopen, 'plain workspace open only runs when no portion is validated');
});

test('fully validated group still uses the Editar confirmation path first', () => {
  const allValidated = body.indexOf('if (group.allValidated)');
  const anyValidated = body.indexOf('group.members.some((m) => m.validated)');
  assert.ok(allValidated > 0 && allValidated < anyValidated);
});
