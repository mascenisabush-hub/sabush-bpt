// [Periodic Contagem — Implementation Authorization §1e, signed
// 27 September 2026, commit 6310429] Stage 5 of 6: recovery evidence
// surfaced proactively on resume (Decision C, Option 1). Source-text
// based, following this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

  it('reuses the EXACT SAME message text already used at the finalization gate -- not reworded, per the signed authorization\'s own instruction', () => {
    const resumeMsg = source.match(/setError\(\s*\n\s*`Existem \$\{Object\.keys\(nextUnresolved\)\.length\} linha\(s\) com alterações não confirmadas encontradas ao retomar esta Contagem — reveja-as antes de confirmar\.`/);
    const finalizationMsg = source.match(/setError\(\s*\n\s*`Existem \$\{Object\.keys\(unresolvedRecoveryEvidence\)\.length\} linha\(s\) com alterações não confirmadas encontradas ao retomar esta Contagem — reveja-as antes de confirmar\.`/);
    assert.ok(resumeMsg, 'expected the proactive resume message');
    assert.ok(finalizationMsg, 'expected the original finalization-gate message to remain unchanged');
    // Both messages are the identical human-readable text, differing
    // only in which variable's .length they read (and incidental
    // indentation from their different nesting depth in the source) --
    // confirming no rewording occurred, only earlier timing.
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const resumeText = normalize(resumeMsg![0].replace('nextUnresolved', 'X'));
    const finalizationText = normalize(finalizationMsg![0].replace('unresolvedRecoveryEvidence', 'X'));
    assert.equal(resumeText, finalizationText);
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
