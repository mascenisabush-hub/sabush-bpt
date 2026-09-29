// SABUSH BPT — Periodic Contagem: Firestore usage reduction with the
// no-data-loss principle intact (Owner-requested, after the free-plan
// daily quota ran out).
// Source-text pins, per this repo's precedent (no DOM/React harness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf-8');
const view = read('apps/tenant/src/components/PeriodicStockCountView.tsx');
const ctx = read('apps/tenant/src/context/AppContext.tsx');
const fnBody = (src: string, marker: string) => {
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  return src.slice(start, src.indexOf('\n  };', start));
};

test('typing waits for 5 s of inactivity; the delay is configurable per call', () => {
  assert.match(view, /const ROW_SAVE_IDLE_DELAY_MS = 5000;/);
  assert.match(view, /const ROW_SAVE_IMMEDIATE_DELAY_MS = 0;/);
  const body = fnBody(view, 'const scheduleRowDraftSave = (rowKey');
  assert.match(body, /\}, options\?\.delayMs \?\? ROW_SAVE_IDLE_DELAY_MS\);/);
  assert.doesNotMatch(body, /\}, 800\);/);
});

test('NO-DATA-LOSS: the local recovery snapshot is still written synchronously, before the delayed save', () => {
  const body = fnBody(view, 'const scheduleRowDraftSave = (rowKey');
  const snap = body.indexOf('writePeriodicRecoverySnapshot(activeBusinessId, rowKey, {');
  const timer = body.indexOf('const timer = setTimeout(');
  assert.ok(snap > 0 && timer > snap, 'snapshot must be written before the save timer is armed');
});

test('NO-DATA-LOSS: catalog rows back up the row just built, not the previous render state', () => {
  const body = fnBody(view, 'const updateCatalogRow = (');
  assert.match(body, /content: nextCatalogRows\[productId\],/);
  assert.match(fnBody(view, 'const scheduleRowDraftSave = (rowKey'), /const currentContent = options\?\.content \?\? \(/);
});

test('NO-DATA-LOSS: validating (or removing) a row saves immediately', () => {
  assert.match(fnBody(view, 'const updateCatalogRow = ('), /delayMs: 'validated' in fields \|\| 'removed' in fields \? ROW_SAVE_IMMEDIATE_DELAY_MS : undefined,/);
  assert.match(fnBody(view, 'const updateManualRow = ('), /\{ delayMs: 'validated' in fields \? ROW_SAVE_IMMEDIATE_DELAY_MS : undefined \}/);
});

test('NO-DATA-LOSS: pending rows still flush when the page is hidden/closed, and before finalization', () => {
  assert.match(view, /if \(document\.visibilityState === 'hidden'\) flushPeriodicDraftNow\(\);/);
  assert.match(view, /window\.addEventListener\('pagehide', flushPeriodicDraftNow\);/);
  for (const marker of ['const handleRequestConfirmation = async', 'const handleConfirmSave = async () => {']) {
    const body = fnBody(view, marker);
    const flush = body.indexOf('if (rowDebounceTimersRef.current.size > 0) flushPeriodicDraftNow();');
    const gate = body.indexOf('!isRowSafeToProgress(conflictKey)');
    assert.ok(flush > 0 && gate > flush, `${marker}: flush before the unchanged safety gate`);
  }
});

test('row save reads the draft meta only where it is used (create + conflict), never on plain updates', () => {
  const body = fnBody(ctx, 'const savePeriodicStockDraftItem = async');
  assert.doesNotMatch(body, /Promise\.all\(\[tx\.get\(itemRef\), tx\.get\(metaRef\)\]\)/);
  assert.equal((body.match(/const metaSnap = await tx\.get\(metaRef\);/g) ?? []).length, 2);
  // create branch: meta read before its existence check and write
  const create = body.indexOf('if (!current) {');
  const createRead = body.indexOf('const metaSnap = await tx.get(metaRef);', create);
  assert.ok(createRead > create && createRead < body.indexOf('if (!metaSnap.exists())', create));
  // conflict branch: meta read before the branch's first write (transaction rule)
  const conflictWrite = body.indexOf("state: 'CONFLICT',");
  const conflictRead = body.lastIndexOf('const metaSnap = await tx.get(metaRef);', conflictWrite);
  assert.ok(conflictRead > createRead);
  assert.ok(body.slice(conflictRead, conflictWrite).includes('tx.set(itemRef, {'), 'read immediately precedes the conflict write');
  assert.equal(body.slice(conflictRead + 40, conflictWrite).split('tx.set(').length - 1, 1);
});
