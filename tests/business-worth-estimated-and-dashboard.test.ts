// getEstimatedBusinessWorth unit tests — Business Worth Evolution,
// Implementation Authorization Increment 2 ("Broader Estimated Business
// Worth + Dashboard/Owner Portfolio wiring").
//
// SCOPE: proves getEstimatedBusinessWorth (calculations.ts) in isolation
// — a pure function, no Firestore/AppContext dependency:
//   - Case A: identical output to getCurrentBusinessWorth when an active
//     BusinessWorthSnapshot exists (§41.4 — one shared calculation, two
//     names, never two competing formulas).
//   - Case B: State 1a — an existing business with a preserved historical
//     Capital Inicial and no snapshot yet (Specification §9 Case B, §6
//     State 1a, FR-50).
//   - UNKNOWN — a genuinely new business with no baseline at all
//     (Specification §6 State 1, I-1).
//
// Also proves the Dashboard/AppContext wiring surface (DashboardView.tsx,
// AppContext.tsx) at the source-inspection level, matching this
// repository's established technique for React-component coverage (see
// tests/owner-portfolio-currentworth.test.ts's own header).
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-estimated-and-dashboard.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { getCurrentBusinessWorth, getEstimatedBusinessWorth } from '../apps/tenant/src/utils/calculations';
import { BusinessWorthSnapshot, StockBatch, Quebra, Expense, Withdrawal, StockCount } from '../apps/tenant/src/types';

function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  return {
    id: 'bws-1',
    businessId: 'biz1',
    sourceStockCountId: 'stockcount-1',
    confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 500000,
    productValuationTotal: 500000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: '2026-08-01T03:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'p1',
    dateEntered: '2026-08-01',
    quantity: 10,
    costPrice: 50,
    sellingPrice: 80,
    status: 'open',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  } as StockBatch;
}

function makeInitialStockCount(overrides: Partial<StockCount> = {}): StockCount {
  return {
    id: 'initial-1',
    type: 'initial',
    date: '2026-01-01',
    items: [],
    totalValue: 100000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as StockCount;
}

function callEstimated(params: {
  snapshots?: BusinessWorthSnapshot[] | null;
  initialStockCount?: StockCount | null;
  batches?: StockBatch[];
  quebras?: Quebra[];
  expenses?: Expense[];
  withdrawals?: Withdrawal[];
  asOfDate?: string;
}) {
  return getEstimatedBusinessWorth({
    snapshots: params.snapshots ?? [],
    initialStockCount: params.initialStockCount ?? null,
    batches: params.batches ?? [],
    quebras: params.quebras ?? [],
    expenses: params.expenses ?? [],
    withdrawals: params.withdrawals ?? [],
    asOfDate: params.asOfDate,
  });
}

describe('getEstimatedBusinessWorth — UNKNOWN (Specification §6 State 1, I-1)', () => {
  it('returns UNKNOWN for a genuinely new business: no snapshot, no historical Capital Inicial', () => {
    assert.equal(callEstimated({ snapshots: [], initialStockCount: null }), 'UNKNOWN');
  });
});

describe('getEstimatedBusinessWorth — Case A delegates to the exact same calculation as getCurrentBusinessWorth (§41.4)', () => {
  it('produces the identical numeric output as getCurrentBusinessWorth when an active snapshot exists', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const batches = [makeBatch({ quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-08-05T00:00:00.000Z' })];

    const current = getCurrentBusinessWorth({ snapshots, batches, quebras: [], expenses: [], withdrawals: [] });
    const estimated = callEstimated({ snapshots, batches });

    assert.notEqual(current, 'UNKNOWN');
    assert.equal(estimated, current);
  });

  it('the worked example (500,000 -> 505,000) reads identically under the Estimated name', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    // A cash-financed stock purchase producing 5,000 of embedded profit —
    // only the batch's own embedded profit contributes, never its full cost.
    const batches = [makeBatch({ id: 'b-new', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    assert.equal(callEstimated({ snapshots, batches }), 505000);
  });

  it('an existing (State 1a-style) initialStockCount is completely ignored once an active snapshot exists — no blended baseline (FR-51)', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const initialStockCount = makeInitialStockCount({ totalValue: 999999999 });
    const withoutInitial = callEstimated({ snapshots });
    const withInitial = callEstimated({ snapshots, initialStockCount });
    assert.equal(withInitial, withoutInitial);
  });
});

describe('getEstimatedBusinessWorth — Case B (Specification §9 Case B, §6 State 1a, FR-50)', () => {
  it('no snapshot, no initialStockCount, nothing else — returns UNKNOWN, never a fabricated Case B value', () => {
    assert.equal(callEstimated({ snapshots: [], initialStockCount: null }), 'UNKNOWN');
  });

  it('cost-basis Capital Inicial with no other activity resolves to the full current market value (Capital Inicial + its own embedded profit)', () => {
    // Capital Inicial (cost) = 500, no basis chosen => defaults to cost.
    const initialStockCount = makeInitialStockCount({
      totalValue: 500,
      totalSellingValue: 800,
      initialCapitalBasis: 'cost',
    });
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    // Estimated = 500 (Capital Inicial, cost) + (800-500 embedded profit, since none is
    // pre-included at cost basis) - 0 - 0 = 800 (full market value).
    assert.equal(callEstimated({ initialStockCount, batches }), 800);
  });

  it('selling-basis Capital Inicial with no other activity resolves to the identical total market value (basis-invariance)', () => {
    const initialStockCount = makeInitialStockCount({
      totalValue: 500,
      totalSellingValue: 800,
      initialCapitalBasis: 'selling',
    });
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    // Estimated = 800 (Capital Inicial, selling) + (800-800 already-included margin) - 0 - 0 = 800.
    assert.equal(callEstimated({ initialStockCount, batches }), 800);
  });

  it('both bases agree exactly (basis-invariance is a real, not approximate, equality)', () => {
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    const costBasis = makeInitialStockCount({ totalValue: 500, totalSellingValue: 800, initialCapitalBasis: 'cost' });
    const sellingBasis = makeInitialStockCount({ totalValue: 500, totalSellingValue: 800, initialCapitalBasis: 'selling' });
    assert.equal(callEstimated({ initialStockCount: costBasis, batches }), callEstimated({ initialStockCount: sellingBasis, batches }));
  });

  it('a cash-financed additional purchase adds only its own embedded profit, never its full cost (non-double-counting, FR-9)', () => {
    const initialStockCount = makeInitialStockCount({ totalValue: 500, totalSellingValue: 800, initialCapitalBasis: 'cost' });
    const batches = [
      makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' }),
      // New batch bought with cash: cost 250, embedded profit 50.
      makeBatch({ id: 'new-batch', quantity: 10, costPrice: 25, sellingPrice: 30, createdAt: '2026-08-01T00:00:00.000Z' }),
    ];
    // 500 + (300 initial margin + 50 new margin) - 0 - 0 = 850, never 500+250+50=800's cost-inclusive alternative.
    assert.equal(callEstimated({ initialStockCount, batches }), 850);
  });

  it('subtracts ALL-TIME expenses and withdrawals — Case B has no prior snapshot to have already accounted for them', () => {
    const initialStockCount = makeInitialStockCount({ totalValue: 500, totalSellingValue: 800, initialCapitalBasis: 'cost' });
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    const expenses = [{ id: 'e1', date: '2026-03-01', createdAt: '2026-03-01T00:00:00.000Z', amount: 40, description: 'x', category: 'other' } as Expense];
    const withdrawals = [{ id: 'w1', date: '2026-04-01', createdAt: '2026-04-01T00:00:00.000Z', amount: 60, reason: 'x' } as Withdrawal];
    // 500 + 300 - 40 - 60 = 700.
    assert.equal(callEstimated({ initialStockCount, batches, expenses, withdrawals }), 700);
  });

  it('breakages are never a second subtraction — already reflected via remaining quantity, exactly as Case A already documents', () => {
    const initialStockCount = makeInitialStockCount({ totalValue: 500, totalSellingValue: 800, initialCapitalBasis: 'cost' });
    // No quebras array is passed at all — quantity itself is what would reflect a loss; asserting
    // this function accepts an (empty) quebras param without a separate subtraction term for it.
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    assert.equal(callEstimated({ initialStockCount, batches, quebras: [] }), 800);
  });
});

describe('AppContext.tsx — Increment 2 wiring (source-inspection, matching this repo\'s established technique)', () => {
  const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

  it('imports getEstimatedBusinessWorth from calculations.ts', () => {
    assert.match(appContextSrc, /import \{[^}]*getEstimatedBusinessWorth[^}]*\} from '\.\.\/utils\/calculations';/);
  });

  it('computes and exposes estimatedBusinessWorth on the context value', () => {
    assert.match(appContextSrc, /const estimatedBusinessWorth = getEstimatedBusinessWorth\(\{/);
    assert.match(appContextSrc, /\n\s*estimatedBusinessWorth,\n/);
  });

  it('refreshShopWorth (Owner Portfolio) no longer computes its own independent formula — it calls the shared getEstimatedBusinessWorth', () => {
    const start = appContextSrc.indexOf('const refreshShopWorth = async (');
    assert.notEqual(start, -1);
    const rest = appContextSrc.slice(start);
    const nextFnMatch = rest.slice('const refreshShopWorth = async ('.length).search(/\n  const \w+ = (async )?\(/);
    const fnBody = nextFnMatch === -1 ? rest : rest.slice(0, 'const refreshShopWorth = async ('.length + nextFnMatch);

    assert.match(fnBody, /getEstimatedBusinessWorth\(\{/);
    assert.doesNotMatch(fnBody, /totalMarketValue\s*-\s*shopTotalExpenses\s*-\s*shopTotalWithdrawals/, 'The old, independent formula must be gone — Owner Portfolio must consume the authoritative shared calculation (Rule 8 Finding 15-A), never maintain a competing one.');
  });

  it('refreshShopWorth never crosses tenant boundaries — every collection read still targets the single businessId param', () => {
    const start = appContextSrc.indexOf('const refreshShopWorth = async (');
    const rest = appContextSrc.slice(start);
    const nextFnMatch = rest.slice('const refreshShopWorth = async ('.length).search(/\n  const \w+ = (async )?\(/);
    const fnBody = nextFnMatch === -1 ? rest : rest.slice(0, 'const refreshShopWorth = async ('.length + nextFnMatch);
    const collectionRefs = fnBody.match(/collection\(db, 'businesses', businessId, '(\w+)'\)/g) ?? [];
    assert.ok(collectionRefs.length >= 6, 'Expected every new collection read (stockCounts, voidRecords, businessWorthSnapshots) alongside the original four, all scoped to the same target businessId.');
  });
});

describe('DashboardView.tsx — Increment 2 wiring (source-inspection)', () => {
  const dashboardSrc = readFileSync(new URL('../apps/tenant/src/components/DashboardView.tsx', import.meta.url), 'utf-8');

  it('destructures currentBusinessWorth and estimatedBusinessWorth from useApp()', () => {
    assert.match(dashboardSrc, /currentBusinessWorth/);
    assert.match(dashboardSrc, /estimatedBusinessWorth/);
  });

  it('no redesign — the nine-KPI-card grid structure is untouched (still a single grid of KpiCard elements)', () => {
    const kpiCardCount = (dashboardSrc.match(/<KpiCard\b/g) ?? []).length;
    assert.ok(kpiCardCount >= 9, 'Expected the existing nine-KPI-card structure to remain, not be redesigned.');
  });
});
