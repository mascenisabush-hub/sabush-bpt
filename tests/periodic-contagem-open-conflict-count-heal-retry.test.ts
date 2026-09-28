// Regression: openConflictCount self-heal ran once and, on a transient failure, was never retried
// (its effect only re-fires when its deps change). A counter stuck above the real conflict count keeps
// "Confirmar Contagem" disabled and makes firestore.rules refuse finalization until reload.
// The retry must also be safe: a retry may never apply a stale true-count.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ctx = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
const view = readFileSync('apps/tenant/src/components/PeriodicStockCountView.tsx', 'utf8');
const fnStart = ctx.indexOf('const correctOpenConflictCountIfDrifted = async');
const fn = ctx.slice(fnStart, ctx.indexOf('// [Decision 40-equivalent identity churn]', fnStart));

describe('self-heal retries transient failures', () => {
  it('retries with backoff, and stops after a bounded number of attempts', () => {
    assert.match(ctx, /DRIFT_HEAL_RETRY_DELAYS_MS = \[2000, 5000, 10000, 20000\]/);
    assert.match(fn, /for \(let attempt = 0; attempt <= DRIFT_HEAL_RETRY_DELAYS_MS\.length; attempt\+\+\)/);
    assert.match(fn, /if \(attempt === DRIFT_HEAL_RETRY_DELAYS_MS\.length\) return;/);
  });

  it('a retry can never apply a stale true-count: only the latest call may retry or write', () => {
    assert.match(fn, /const generation = \+\+driftHealGenerationRef\.current;/);
    assert.match(fn, /if \(generation !== driftHealGenerationRef\.current\) return;/);
    assert.ok(
      fn.indexOf('generation !== driftHealGenerationRef.current') < fn.indexOf('await runTransaction'),
      'the staleness check must come before every transaction attempt'
    );
  });

  it('still never throws to its caller, and still writes only when the server value disagrees', () => {
    assert.match(fn, /try \{[\s\S]*\} catch \{/);
    assert.match(fn, /if \(storedOpenConflictCount === trueOpenConflictCount\) return;/);
    assert.match(fn, /tx\.set\(metaRef, \{ openConflictCount: trueOpenConflictCount \}, \{ merge: true \}\);/);
  });

  it('a successful transaction ends the loop (no repeated writes)', () => {
    assert.match(fn, /\}\);\s*\n\s*return;\s*\n\s*\} catch \{/);
  });
});

describe('banner does not claim "0 linhas em conflito" while the counter is merely stale', () => {
  it('has a dedicated message when no row is actually in CONFLICT', () => {
    assert.match(view, /unresolvedConflictRows\.length === 0 \? \(/);
    assert.match(view, /O estado de conflitos desta Contagem está a ser atualizado/);
  });
});
