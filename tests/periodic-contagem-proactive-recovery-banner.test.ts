// [Periodic Contagem — Implementation Authorization §1e, signed
// 27 September 2026, commit 6310429] Stage 5 of 6: recovery evidence
// surfaced proactively on resume (Decision C, Option 1). Source-text
// based, following this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unresolvedRecoveryEvidenceMessage } from '../apps/tenant/src/lib/periodicFinalizationGateMessages.ts';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('handleResumeDraft — proactive recovery banner (§1e, Decision C Option 1)', () => {
  it('setError is called immediately after setUnresolvedRecoveryEvidence, when nextUnresolved is non-empty', () => {
    const idx = source.indexOf('setUnresolvedRecoveryEvidence(nextUnresolved);');
    assert.ok(idx > -1);
    const region = source.slice(idx, idx + 700);
    assert.match(region, /if \(Object\.keys\(nextUnresolved\)\.length > 0\) \{\s*\n\s*setError\(/);
  });

  it('reuses the EXACT SAME message text already used at the finalization gate -- one shared helper, not reworded', () => {
    assert.match(source, /setError\(\s*\n?\s*unresolvedRecoveryEvidenceMessage\(Object\.keys\(nextUnresolved\)\.length, recoveryEvidenceProductNames\(nextUnresolved\)\)/, 'expected the proactive resume message to use the shared helper');
    assert.match(source, /unresolvedRecoveryEvidenceMessage\(Object\.keys\(unresolvedRecoveryEvidence\)\.length, recoveryEvidenceProductNames\(unresolvedRecoveryEvidence\)\)/, 'expected the finalization-gate message to use the shared helper');
    assert.equal(
      unresolvedRecoveryEvidenceMessage(2),
      'Existem 2 linha(s) com alterações não confirmadas encontradas ao retomar esta Contagem — reveja-as no quadro abaixo antes de confirmar.'
    );
  });

  it('a silently-resolved case (already-synced) never reaches nextUnresolved, so the banner never fires for it -- system-handled-silently is preserved, unchanged', () => {
    const idx = source.indexOf("if (outcome.outcome === 'already-synced')");
    assert.ok(idx > -1);
    const region = source.slice(idx, idx + 200);
    assert.match(region, /clearPeriodicRecoverySnapshot\(activeBusinessId, rowKey\);\s*\n\s*continue;/);
  });

  it('setUnresolvedRecoveryEvidence itself, and the reconciliation logic feeding it, remain completely unmodified -- only the new banner call was added', () => {
    assert.match(source, /const outcome = reconcilePeriodicRecoverySnapshot\(snapshot, \{/);
    assert.match(source, /nextUnresolved\[rowKey\] = outcome;/);
  });
});

describe('The pre-existing finalization-gate message and behavior are completely unaffected', () => {
  it('handleRequestConfirmation\'s own recovery gate is unchanged -- same condition, same message, same position relative to the other two gates', () => {
    const fnStart = source.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const region = source.slice(fnStart, fnStart + 7500); // widened from 3000: the identity-check retry and the duplicate gate now sit before this gate
    assert.match(region, /if \(Object\.keys\(unresolvedRecoveryEvidence\)\.length > 0\) \{/);
  });
});
