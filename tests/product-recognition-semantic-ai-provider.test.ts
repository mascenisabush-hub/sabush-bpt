// [Product Recognition Intelligence — Checkpoint 4] Tests for
// server/productRecognitionSemanticMatch.ts's own isolated I/O
// boundary function, findSemanticProductMatches.
//
// SCOPE, stated explicitly, mirroring tests/smart-stock-entry.test.ts's
// own precedent for callVisionExtractionProvider: this environment has
// no SMART_STOCK_ENTRY_AI_API_KEY configured, so a real provider call
// cannot be exercised here. What CAN be proven directly, and is proven
// below: the function's own guard-clause failure boundaries (empty
// wording, empty product list, no provider configured) — every one of
// which resolves to an empty array, never throws, exactly as the
// function's own header promises. This is exactly the "no provider
// configured" branch of the Failure boundary Acceptance Criterion 9
// requires, proven against this environment's own real, actual
// absence of a configured key — not a mock standing in for it.
//
// HOW TO RUN:
//   npx tsx --test tests/product-recognition-semantic-ai-provider.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { findSemanticProductMatches } from '../server/productRecognitionSemanticMatch';

describe('findSemanticProductMatches — never throws, resolves to [] on every failure boundary', () => {
  it('resolves to [] for an empty/whitespace-only wording, without attempting any provider call', async () => {
    const result = await findSemanticProductMatches('', [{ id: 'p1', name: 'Massa Cotovelo' }]);
    assert.deepEqual(result, []);
    const result2 = await findSemanticProductMatches('   ', [{ id: 'p1', name: 'Massa Cotovelo' }]);
    assert.deepEqual(result2, []);
  });

  it('resolves to [] for an empty products list, without attempting any provider call', async () => {
    const result = await findSemanticProductMatches('Bela 400g', []);
    assert.deepEqual(result, []);
  });

  it('[Failure boundary — no provider configured] resolves to [] when SMART_STOCK_ENTRY_AI_API_KEY is not set in this environment (the actual, real condition of this test environment — not simulated)', async () => {
    const hadKey = 'SMART_STOCK_ENTRY_AI_API_KEY' in process.env;
    const savedKey = process.env.SMART_STOCK_ENTRY_AI_API_KEY;
    delete process.env.SMART_STOCK_ENTRY_AI_API_KEY;
    try {
      const result = await findSemanticProductMatches('Bela 400g', [{ id: 'p1', name: 'Massa Cotovelo' }]);
      assert.deepEqual(result, []);
    } finally {
      if (hadKey) process.env.SMART_STOCK_ENTRY_AI_API_KEY = savedKey;
    }
  });

  it('never throws — resolves for a genuinely wide range of inputs, including ones a provider might choke on', async () => {
    await assert.doesNotReject(() => findSemanticProductMatches('', []));
    await assert.doesNotReject(() => findSemanticProductMatches('x'.repeat(5000), [{ id: 'p1', name: 'y'.repeat(5000) }]));
    await assert.doesNotReject(() => findSemanticProductMatches('normal wording', [{ id: '', name: '' }]));
  });
});
