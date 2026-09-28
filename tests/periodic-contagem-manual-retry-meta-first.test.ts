// Regression: "Tentar novamente" retried keys in insertion order. A row whose first write failed because
// the draft's meta document did not exist yet (failed bootstrap meta save -> "Esta Contagem já não está
// ativa") was retried BEFORE the meta save and failed again, so the Owner had to tap twice.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const view = readFileSync('apps/tenant/src/components/PeriodicStockCountView.tsx', 'utf8');
const start = view.indexOf('const handleManualRetryDraftSave = () => {');
const body = view.slice(start, view.indexOf('\n  };\n', start));

const metaLine = body.match(/const isMetaDocumentKey = \(key: string\) => ([^\n]+);/);
const sortLine = body.match(/rowKeys\.sort\(([^\n]+)\);/);

describe('manual retry orders meta-document writes first', () => {
  it('declares the meta-key predicate and sorts before any attempt is issued', () => {
    assert.ok(metaLine && sortLine);
    assert.ok(body.indexOf('rowKeys.sort(') < body.indexOf('performRowSaveAttempt('));
  });

  it('uses exactly the meta-document key set performRowSaveAttempt routes to savePeriodicStockDraftMeta', () => {
    assert.match(view, /if \(rowKey === '__meta__' \|\| rowKey\.startsWith\('newProductInfo:'\) \|\| rowKey === 'caixerDraft'\) \{/);
    assert.equal(metaLine![1], "key === '__meta__' || key === 'caixerDraft' || key.startsWith('newProductInfo:')");
  });

  it('puts meta keys first and keeps the relative order of everything else (stable)', () => {
    // eslint-disable-next-line no-new-func
    const isMetaDocumentKey = new Function('key', `return ${metaLine![1]};`) as (k: string) => boolean;
    // eslint-disable-next-line no-new-func
    const cmp = new Function('isMetaDocumentKey', `return ${sortLine![1]};`)(isMetaDocumentKey);
    const keys = ['catalog:p1', 'manual:x', '__meta__', 'catalog:p2', 'newProductInfo:abc', 'caixerDraft'];
    keys.sort(cmp);
    assert.deepEqual(keys, ['__meta__', 'newProductInfo:abc', 'caixerDraft', 'catalog:p1', 'manual:x', 'catalog:p2']);
  });

  it('the attempt itself still reuses the existing path (no parallel retry mechanism)', () => {
    assert.match(body, /const generation = cancelRowRetry\(rowKey\);\s*\n\s*performRowSaveAttempt\(rowKey, protectionKey, generation, 1\);/);
  });
});

describe('the premise: row attempts wait for an in-flight meta write', () => {
  const attempt = view.slice(view.indexOf('const performRowSaveAttempt = async ('));
  it('checks draftInFlightSaveRef before writing, and registers its own promise there', () => {
    assert.ok(attempt.indexOf('if (draftInFlightSaveRef.current) {') < attempt.indexOf('draftInFlightSaveRef.current = savePromise;'));
  });
});
