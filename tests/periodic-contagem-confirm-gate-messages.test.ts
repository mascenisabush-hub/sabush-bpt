// Regression: handleConfirmSave ended in bare `return`s for a blocked identity check, unresolved
// recovery evidence and unsafe rows. If any became true between Review and Confirm the button did
// nothing and displayed nothing. Each gate must now set a visible error, with the same text as Review.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  identityCheckNotRunMessage,
  identityCheckPendingMessage,
  unresolvedRecoveryEvidenceMessage,
  unsafeRowsMessage,
} from '../apps/tenant/src/lib/periodicFinalizationGateMessages.ts';

const view = readFileSync('apps/tenant/src/components/PeriodicStockCountView.tsx', 'utf8');
const confirmSave = (() => {
  const start = view.indexOf('const handleConfirmSave = async () => {');
  assert.ok(start > 0);
  return view.slice(start, view.indexOf('setIsSaving(true);', start));
})();
const requestConfirmation = (() => {
  const start = view.indexOf('const handleRequestConfirmation = async');
  assert.ok(start > 0);
  return view.slice(start, view.indexOf('const handleConfirmSave = async', start));
})();

describe('gate messages', () => {
  it('interpolate the counts', () => {
    assert.match(identityCheckPendingMessage(3), /3 linha\(s\)/);
    assert.match(unresolvedRecoveryEvidenceMessage(2), /2 linha\(s\)/);
    assert.match(unsafeRowsMessage(1), /1 linha\(s\)/);
    assert.ok(identityCheckNotRunMessage.length > 0);
  });
});

describe('handleConfirmSave never fails silently on a Review-time gate', () => {
  it('has no bare return for migration, recovery evidence or unsafe rows', () => {
    assert.doesNotMatch(confirmSave, /migrationStatus === 'blocked'\) return;/);
    assert.doesNotMatch(confirmSave, /unresolvedRecoveryEvidence\)\.length > 0\) return;/);
    assert.doesNotMatch(confirmSave, /if \(hasUnsafeRow\) return;/);
  });

  it('reports each gate through setError with the shared message', () => {
    assert.match(confirmSave, /setError\(\s*ambiguousMigrationKeys\.length > 0[\s\S]*?identityCheckPendingMessage[\s\S]*?identityCheckNotRunMessage/);
    assert.match(confirmSave, /setError\(unresolvedRecoveryEvidenceMessage\(/);
    assert.match(confirmSave, /setError\(unsafeRowsMessage\(/);
  });

  it('Review and Confirm use the same message source (no drifting copies)', () => {
    for (const fn of ['identityCheckPendingMessage', 'unresolvedRecoveryEvidenceMessage', 'unsafeRowsMessage']) {
      assert.ok(requestConfirmation.includes(fn), `Review should use ${fn}`);
    }
    assert.doesNotMatch(view, /Existem \$\{[^}]*\} linha\(s\)/, 'no inline copy of these messages should remain in the view');
  });
});
