// SABUSH BPT — Periodic Contagem, Owner decision 2026-09-29: "Validar" is
// the moment a product enters the live total AND the signal to save it.
// Unvalidated products never count, are always listed with what to fix,
// and block "Rever e Confirmar". No-data-loss: every keystroke still goes
// to the local recovery snapshot; a failed Validar still sends an
// unvalidated safety copy; leaving/hiding the page still flushes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tallyStockCountRows, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const body = (marker: string) => {
  const a = view.indexOf(marker);
  assert.notEqual(a, -1, `missing ${marker}`);
  return view.slice(a, view.indexOf('\n  };', a));
};

test('1. the live total counts VALIDATED products only', () => {
  assert.match(view, /const onlyValidatedCounts = \(rows: StockCountWorkingRow\[\]\): StockCountWorkingRow\[\] =>\s*rows\.map\(\(row\) => \(row\.validated \? row : \{ \.\.\.row, quantity: '' \}\)\);/);
  assert.match(view, /tallyStockCountRows\(onlyValidatedCounts\(allWorkingRows\), effectiveCostBasisByProductName, getEffectiveUnitRelationshipForProductName\)/);
  // behaviour: same rule on real data
  const rows = [
    { productName: 'A', quantity: '2', unit: 'Un', costPrice: '', sellingPrice: '100', validated: true },
    { productName: 'B', quantity: '3', unit: 'Un', costPrice: '', sellingPrice: '100', validated: false },
  ] as StockCountWorkingRow[];
  const t = tallyStockCountRows(rows.map((r) => (r.validated ? r : { ...r, quantity: '' })));
  assert.equal(t.totalSellingValue, 200);
  assert.deepEqual(t.notCountedProductNames, ['B']);
});

test('2. typing arms no server save for rows; Validar saves immediately', () => {
  const s = body('const scheduleRowDraftSave = (rowKey');
  const snap = s.indexOf('writePeriodicRecoverySnapshot(activeBusinessId, rowKey, {');
  const skip = s.indexOf("if (isRowKey && options?.delayMs === undefined) {");
  assert.ok(snap > 0 && skip > snap, 'local snapshot is written BEFORE the no-timer return (no-data-loss)');
  assert.match(s.slice(skip, skip + 300), /rowDebounceTimersRef\.current\.delete\(rowKey\);\s*return;/);
  assert.match(body('const updateCatalogRow = ('), /'validated' in fields \|\| 'removed' in fields \? ROW_SAVE_IMMEDIATE_DELAY_MS/);
  assert.match(body('const updateManualRow = ('), /'validated' in fields \? ROW_SAVE_IMMEDIATE_DELAY_MS/);
});

test('2b. a FAILED Validar still sends an unvalidated safety copy (never a loss)', () => {
  assert.match(body('const saveUnvalidatedSafetyCopy = (rowKey: string) => {'), /scheduleRowDraftSave\(rowKey, rowKey, \{ delayMs: ROW_SAVE_IMMEDIATE_DELAY_MS \}\)/);
  assert.equal((body('const handleSaveCatalogRow = (productId: string) => {').match(/saveUnvalidatedSafetyCopy\(/g) ?? []).length, 3);
  assert.equal((body('const handleSaveManualRow = (index: number) => {').match(/saveUnvalidatedSafetyCopy\(safetyKey\)/g) ?? []).length, 3);
  assert.equal((body('const handleValidateWorkspaceProduct = () => {').match(/pending\.forEach\(safetyCopyOf\)/g) ?? []).length, 2);
});

test('2c. leaving/hiding the page still flushes unsaved rows (safety net unchanged)', () => {
  assert.match(view, /if \(document\.visibilityState === 'hidden'\) flushPeriodicDraftNow\(\);/);
  assert.match(view, /window\.addEventListener\('pagehide', flushPeriodicDraftNow\);/);
});

test('3. unvalidated products are always listed with what to change', () => {
  assert.match(view, /reason: validateWorkingRowForSave\(row\) \?\? duplicatePortionMessageFor\(row, `catalog:\$\{productId\}`\),/);
  // [Owner-requested layout] shown inside the right-hand list, on each
  // unvalidated product, instead of a separate panel.
  assert.match(view, /id="contagem-pending-validation"/);
  assert.match(view, /Por validar — não incluído no total\./);
  assert.match(view, /\{firstProblem \?\? 'Pronto — falta apenas clicar em Validar\.'\}/);
  assert.match(view, /produtos por validar — não incluídos no total/);
});

test('3b. "Rever e Confirmar" is blocked while products are unvalidated, naming them', () => {
  const s = body('const handleRequestConfirmation = async');
  const gate = s.indexOf('if (pendingValidationEntries.length > 0) {');
  const tally = s.indexOf('const tally = tallyStockCountRows(');
  assert.ok(gate > 0 && tally > gate);
  assert.match(s.slice(gate, tally), /formatProductNames\(pendingValidationProductNames\(\)\)[\s\S]*?return;/);
  assert.match(s, /const rowsForTally: StockCountWorkingRow\[\] = onlyValidatedCounts\(\[/);
});

test('unvalidated rows never show a "saving" spinner', () => {
  assert.match(view, /group\.persistenceState === 'saving' && group\.allValidated \?/);
  assert.match(view, /lastEnteredEntry\.persistenceState === 'saving' && lastEnteredEntry\.validated \?/);
});
