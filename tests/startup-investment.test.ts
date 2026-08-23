// Startup Investment unit tests — Business Worth Evolution, Increment 5
// (Specification §13; Implementation Plan §3.5; Rule 8 Finding 6-A;
// Implementation Authorization §17).
//
// SCOPE: pure-function tests for resolveStartupInvestmentWindow and
// computeStartupInvestmentTotal (calculations.ts) — no Firestore/
// AppContext dependency, no emulator required. Firestore security rules
// (startupInvestmentEntries: owner-only, create-only, category-restricted)
// are covered by source inspection here (§6 below), since the sandboxed
// test environment cannot download/start the Firebase emulator — no
// emulator verification is claimed.
//
// HOW TO RUN:
//   npm run test:startup-investment

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveStartupInvestmentWindow,
  computeStartupInvestmentTotal,
} from '../apps/tenant/src/utils/calculations';
import type { StockBatch, Expense, StartupInvestmentEntry, StockCount } from '../apps/tenant/src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeInitialStockCount(overrides: Partial<StockCount> = {}): StockCount {
  return {
    id: 'initial',
    type: 'initial',
    date: '2024-01-01',
    items: [],
    totalValue: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as StockCount;
}

describe('resolveStartupInvestmentWindow — Rule 8 Finding 6-A', () => {
  it('1. returns null when no initial StockCount exists yet (no baseline at all)', () => {
    const result = resolveStartupInvestmentWindow({
      businessCreatedAt: '2024-01-01T00:00:00.000Z',
      initialStockCount: null,
    });
    assert.equal(result, null);
  });

  it('2. existing business (State 1a): window ends at initial StockCount.createdAt, never confirmedAt', () => {
    const initial = makeInitialStockCount({
      createdAt: '2023-05-10T12:00:00.000Z',
      // No producesBusinessWorthSnapshot marker — this is a historical,
      // pre-capability 'initial' confirmation (State 1a business).
      // confirmedAt deliberately absent, per Finding 6-A's own premise
      // that confirmedAt is frequently absent on legacy records.
    });
    const result = resolveStartupInvestmentWindow({
      businessCreatedAt: '2023-01-01T00:00:00.000Z',
      initialStockCount: initial,
    });
    assert.deepEqual(result, {
      startDate: '2023-01-01T00:00:00.000Z',
      endDate: '2023-05-10T12:00:00.000Z',
    });
  });

  it('3. existing business: even if confirmedAt IS present, the historical anchor still uses createdAt, not confirmedAt', () => {
    const initial = makeInitialStockCount({
      createdAt: '2023-05-10T12:00:00.000Z',
      confirmedAt: { seconds: new Date('2023-05-11T09:00:00.000Z').getTime() / 1000, toMillis: () => new Date('2023-05-11T09:00:00.000Z').getTime() } as any,
    });
    const result = resolveStartupInvestmentWindow({
      businessCreatedAt: '2023-01-01T00:00:00.000Z',
      initialStockCount: initial,
    });
    assert.equal(result?.endDate, '2023-05-10T12:00:00.000Z');
  });

  it('4. genuinely new business (initial confirmation itself IS first new-model Contagem): window ends at that confirmation event, via confirmedAt', () => {
    const confirmedMillis = new Date('2026-02-01T10:30:00.000Z').getTime();
    const initial = makeInitialStockCount({
      createdAt: '2026-02-01T10:30:00.000Z',
      producesBusinessWorthSnapshot: true,
      confirmedAt: { toMillis: () => confirmedMillis } as any,
    });
    const result = resolveStartupInvestmentWindow({
      businessCreatedAt: '2026-01-15T00:00:00.000Z',
      initialStockCount: initial,
    });
    assert.equal(result?.endDate, new Date(confirmedMillis).toISOString());
  });

  it('5. genuinely new business without confirmedAt falls back to createdAt (never a fabricated date)', () => {
    const initial = makeInitialStockCount({
      createdAt: '2026-02-01T10:30:00.000Z',
      producesBusinessWorthSnapshot: true,
    });
    const result = resolveStartupInvestmentWindow({
      businessCreatedAt: '2026-01-15T00:00:00.000Z',
      initialStockCount: initial,
    });
    assert.equal(result?.endDate, '2026-02-01T10:30:00.000Z');
  });
});

describe('computeStartupInvestmentTotal — FR-16 (no duplicate ledger), FR-17, FR-52', () => {
  const windowRange = { startDate: '2023-01-01T00:00:00.000Z', endDate: '2023-06-01T00:00:00.000Z' };

  it('6. no window and no entries: total is 0, nothing fabricated', () => {
    const result = computeStartupInvestmentTotal({ window: null, batches: [], expenses: [], entries: [] });
    assert.deepEqual(result, { referencedPurchasesTotal: 0, referencedExpensesTotal: 0, entriesTotal: 0, total: 0 });
  });

  it('7. referenced PurchaseBatch-linked StockBatch spending inside the window is aggregated, never re-recorded', () => {
    const batches: StockBatch[] = [
      { id: 'b1', productId: 'p1', dateEntered: '2023-02-01', quantity: 10, costPrice: 50, sellingPrice: 80, status: 'active', createdAt: '2023-02-01T00:00:00.000Z', purchaseBatchId: 'pb1' },
      // Outside window — must not be counted.
      { id: 'b2', productId: 'p1', dateEntered: '2023-07-01', quantity: 5, costPrice: 50, sellingPrice: 80, status: 'active', createdAt: '2023-07-01T00:00:00.000Z', purchaseBatchId: 'pb2' },
      // No purchaseBatchId — not an investment/purchase event, must not be counted (only +Stock purchase spending qualifies).
      { id: 'b3', productId: 'p1', dateEntered: '2023-03-01', quantity: 3, costPrice: 50, sellingPrice: 80, status: 'active', createdAt: '2023-03-01T00:00:00.000Z' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches, expenses: [], entries: [] });
    assert.equal(result.referencedPurchasesTotal, 500); // 10 * 50, only b1
    assert.equal(result.total, 500);
  });

  it('8. referenced Expense spending inside the window is aggregated, never re-recorded', () => {
    const expenses: Expense[] = [
      { id: 'e1', date: '2023-03-15', description: 'Renda', amount: 200, createdAt: '2023-03-15T00:00:00.000Z' },
      // Outside window.
      { id: 'e2', date: '2023-08-01', description: 'Renda', amount: 300, createdAt: '2023-08-01T00:00:00.000Z' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches: [], expenses, entries: [] });
    assert.equal(result.referencedExpensesTotal, 200);
    assert.equal(result.total, 200);
  });

  it('9. StartupInvestmentEntry amounts (FR-17\'s residual category) sum independently of the window', () => {
    const entries: StartupInvestmentEntry[] = [
      { id: 's1', businessId: 'biz1', category: 'labor', amount: 1000, recordedAt: '2022-12-01T00:00:00.000Z', createdAt: '2022-12-01T00:00:00.000Z', createdBy: 'u1' },
      { id: 's2', businessId: 'biz1', category: 'license', amount: 250, recordedAt: '2023-09-01T00:00:00.000Z', createdAt: '2023-09-01T00:00:00.000Z', createdBy: 'u1' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches: [], expenses: [], entries });
    assert.equal(result.entriesTotal, 1250);
    assert.equal(result.total, 1250);
  });

  it('10. multiple sources combine additively — no double counting', () => {
    const batches: StockBatch[] = [
      { id: 'b1', productId: 'p1', dateEntered: '2023-02-01', quantity: 10, costPrice: 50, sellingPrice: 80, status: 'active', createdAt: '2023-02-01T00:00:00.000Z', purchaseBatchId: 'pb1' },
    ];
    const expenses: Expense[] = [
      { id: 'e1', date: '2023-03-15', description: 'Renda', amount: 200, createdAt: '2023-03-15T00:00:00.000Z' },
    ];
    const entries: StartupInvestmentEntry[] = [
      { id: 's1', businessId: 'biz1', category: 'labor', amount: 1000, recordedAt: '2023-01-10T00:00:00.000Z', createdAt: '2023-01-10T00:00:00.000Z', createdBy: 'u1' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches, expenses, entries });
    assert.equal(result.referencedPurchasesTotal, 500);
    assert.equal(result.referencedExpensesTotal, 200);
    assert.equal(result.entriesTotal, 1000);
    assert.equal(result.total, 1700); // 500 + 200 + 1000, each counted exactly once
  });

  it('11. boundary: a batch dated exactly at the window end is EXCLUDED (half-open window, [start, end))', () => {
    const batches: StockBatch[] = [
      { id: 'b1', productId: 'p1', dateEntered: '2023-06-01', quantity: 10, costPrice: 50, sellingPrice: 80, status: 'active', createdAt: '2023-06-01T00:00:00.000Z', purchaseBatchId: 'pb1' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches, expenses: [], entries: [] });
    assert.equal(result.referencedPurchasesTotal, 0);
  });

  it('12. boundary: a batch dated exactly at the window start IS included', () => {
    const batches: StockBatch[] = [
      { id: 'b1', productId: 'p1', dateEntered: '2023-01-01', quantity: 4, costPrice: 25, sellingPrice: 40, status: 'active', createdAt: '2023-01-01T00:00:00.000Z', purchaseBatchId: 'pb1' },
    ];
    const result = computeStartupInvestmentTotal({ window: windowRange, batches, expenses: [], entries: [] });
    assert.equal(result.referencedPurchasesTotal, 100);
  });

  it('13. FR-52 — the return shape never includes any shortfall/loss/performance field, and no Business Worth value is even a parameter', () => {
    const result = computeStartupInvestmentTotal({ window: windowRange, batches: [], expenses: [], entries: [] });
    const keys = Object.keys(result);
    assert.deepEqual(keys.sort(), ['entriesTotal', 'referencedExpensesTotal', 'referencedPurchasesTotal', 'total'].sort());
    for (const key of keys) {
      assert.doesNotMatch(key.toLowerCase(), /shortfall|loss|performance/);
    }
  });
});

describe('Increment 5 isolation — Business Worth functions are structurally untouched', () => {
  const calculationsSrc = fs.readFileSync(
    path.join(__dirname, '../apps/tenant/src/utils/calculations.ts'),
    'utf-8'
  );

  it('14. getCurrentBusinessWorth, getEstimatedBusinessWorth, and computeMeasuredBusinessWorth never reference StartupInvestmentEntry', () => {
    const fnNames = ['getCurrentBusinessWorth', 'getEstimatedBusinessWorth', 'computeMeasuredBusinessWorth'];
    for (const fnName of fnNames) {
      const start = calculationsSrc.indexOf(`export function ${fnName}`);
      assert.ok(start >= 0, `${fnName} must exist`);
      // Grab this function's own body up to the next top-level export,
      // a lightweight but sufficient way to prove StartupInvestmentEntry
      // (or any startup-investment aggregate) is never read inside it.
      const nextExport = calculationsSrc.indexOf('\nexport function', start + 10);
      const body = calculationsSrc.slice(start, nextExport === -1 ? undefined : nextExport);
      assert.doesNotMatch(body, /StartupInvestmentEntry/);
      assert.doesNotMatch(body, /computeStartupInvestmentTotal/);
    }
  });

  it('15. Finding 3 / Option A remains intact: BusinessWorthSnapshotProductValuationLine.totalValue is unaffected by this increment', () => {
    assert.match(
      calculationsSrc,
      /totalValue: Number\(\(item\.quantity \* sellingPrice\)\.toFixed\(2\)\)/
    );
  });
});

describe('Increment 6-9 boundary check — no later-increment scope introduced', () => {
  const repoRoot = path.join(__dirname, '..');

  it('16. no Fecho/Reconciliation/Recovery/Auditability infrastructure was introduced by this increment', () => {
    const calculationsSrc = fs.readFileSync(path.join(repoRoot, 'apps/tenant/src/utils/calculations.ts'), 'utf-8');
    const startupSectionStart = calculationsSrc.indexOf('BUSINESS WORTH EVOLUTION — INCREMENT 5');
    assert.ok(startupSectionStart >= 0);
    const startupSection = calculationsSrc.slice(startupSectionStart);
    assert.doesNotMatch(startupSection, /reconciliationSignal|possibleCause|correctionWindow|superAdminRecovery|auditActionType/i);
  });
});

describe('Firestore rules — source-inspection verification (no emulator available in this environment)', () => {
  const rulesSrc = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf-8');
  const ruleBlockMatch = rulesSrc.match(/match \/startupInvestmentEntries\/\{entryId\} \{([\s\S]*?)\n {6}\}/);

  it('17. startupInvestmentEntries rule block exists', () => {
    assert.ok(ruleBlockMatch, 'startupInvestmentEntries rule block must exist in firestore.rules');
  });

  it('18. read/create are owner-gated (isOwnerOf(businessId))', () => {
    const block = ruleBlockMatch![1];
    assert.match(block, /allow read: if isOwnerOf\(businessId\)/);
    assert.match(block, /allow create: if isOwnerOf\(businessId\)/);
  });

  it('19. update and delete are unconditionally denied (append-only, I-4)', () => {
    const block = ruleBlockMatch![1];
    assert.match(block, /allow update, delete: if false/);
  });

  it('20. category is restricted to the exact six approved values', () => {
    const block = ruleBlockMatch![1];
    assert.match(block, /\['labor', 'wages', 'transport', 'preparation', 'license', 'other'\]/);
  });

  it('21. amount must be a positive number', () => {
    const block = ruleBlockMatch![1];
    assert.match(block, /request\.resource\.data\.get\('amount', null\) is number/);
    assert.match(block, /request\.resource\.data\.get\('amount', 0\) > 0/);
  });

  it('22. businessId/id/createdBy tenant-isolation fields are enforced on create (no cross-business writes)', () => {
    const block = ruleBlockMatch![1];
    assert.match(block, /request\.resource\.data\.get\('businessId', null\) == businessId/);
    assert.match(block, /request\.resource\.data\.get\('id', null\) == entryId/);
    assert.match(block, /request\.resource\.data\.get\('createdBy', null\) == request\.auth\.uid/);
  });

  it('23. no existing Increment 1-4 rule block (cashLedgerEntries/receivables/payables/businessWorthSnapshots) was weakened by this addition', () => {
    assert.match(rulesSrc, /match \/cashLedgerEntries\/\{entryId\} \{[\s\S]*?allow update, delete: if false;/);
    assert.match(rulesSrc, /match \/receivables\/\{receivableId\} \{[\s\S]*?allow delete: if false;/);
    assert.match(rulesSrc, /match \/payables\/\{payableId\} \{[\s\S]*?allow delete: if false;/);
  });
});
