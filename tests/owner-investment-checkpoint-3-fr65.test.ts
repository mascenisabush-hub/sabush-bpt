// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10 (Revision 3), Item 3 — CHECKPOINT 3 (FR-65: Snapshot
// Drill-Down).
//
// SCOPE: proves the `ownerInvestmentSinceLastSnapshot` BusinessWorthSnapshot
// drill-down field, backed by the shared, exported
// `computeOwnerInvestmentsSinceSnapshot` helper (calculations.ts) — the
// SAME function FR-64's own live `ownerInvestmentsSinceSnapshot` term
// (`computeCaseALiveBusinessWorth`) now also calls, guaranteeing the two
// can never diverge. The authoritative boundary is
// `OwnerInvestment.createdAt > activeBaseline.confirmedAt` — never
// `date`, never `>=` — per the Product Architect's recorded
// clarification (commit 1000bde).
//
// Pure-function proofs run directly (no Firestore/AppContext
// dependency, mirrors this repository's established pattern). The
// AppContext.tsx write-path wiring (recordStockCount, Contagem path)
// and firestore.rules (already anticipating this exact field name in
// the owner-declared branch) are covered by source-text/structural
// checks, matching tests/owner-investment-checkpoint-1.test.ts's own
// established technique for functions tightly coupled to the live
// Firebase client SDK.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-3-fr65.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeOwnerInvestmentsSinceSnapshot, getCurrentBusinessWorth } from '../apps/tenant/src/utils/calculations';
import { BusinessWorthSnapshot, OwnerInvestment, CashLedgerEntry } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const typesSrc = src('apps/tenant/src/types.ts');
const rulesSrc = src('firestore.rules');
const calculationsSrc = src('apps/tenant/src/utils/calculations.ts');

function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  return {
    id: 'bws-1',
    businessId: 'biz1',
    sourceStockCountId: 'stockcount-1',
    confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 500000,
    productValuationTotal: 500000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: '2026-09-10T13:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function makeOwnerInvestment(overrides: Partial<OwnerInvestment> = {}): OwnerInvestment {
  return {
    id: 'oi-1',
    businessId: 'biz1',
    amount: 100000,
    date: '2026-09-10',
    createdAt: '2026-09-10T10:00:01.000Z',
    createdBy: 'uid-owner',
    ...overrides,
  };
}

const BASELINE_MS = new Date('2026-09-10T10:00:00.000Z').getTime();
const AS_OF_MS = new Date('2026-09-11T00:00:00.000Z').getTime();

// ============================================================
// Required tests A-P
// ============================================================

describe('FR-65 — Case A: no Owner Investment since baseline', () => {
  it('zero OwnerInvestments → FR-65 value is 0', () => {
    assert.equal(computeOwnerInvestmentsSinceSnapshot([], BASELINE_MS, AS_OF_MS), 0);
  });
});

describe('FR-65 — Case B: one post-baseline OwnerInvestment', () => {
  it('a single post-baseline OwnerInvestment of 100,000 → FR-65 equals 100,000', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 100000);
  });
});

describe('FR-65 — Case C: multiple post-baseline OwnerInvestments', () => {
  it('100,000 + 50,000 → FR-65 equals 150,000', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000, createdAt: '2026-09-10T12:00:00.000Z' }),
    ];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 150000);
  });
});

describe('FR-65 — Case D: pre-baseline OwnerInvestment is excluded', () => {
  it('createdAt before confirmedAt → excluded (FR-65 value 0)', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T09:00:00.000Z' })];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 0);
  });
});

describe('FR-65 — Case E: exact boundary (createdAt == confirmedAt) is excluded', () => {
  it('operator is strictly ">", never ">="', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T10:00:00.000Z' })];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 0);
  });
});

describe('FR-65 — Case F: backdated business date does not exclude a genuinely post-baseline OwnerInvestment', () => {
  it('date before confirmedAt, createdAt after confirmedAt → included', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, date: '2026-09-05', createdAt: '2026-09-10T11:00:00.000Z' })];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 100000);
  });
});

describe('FR-65 — Case G: future business date does not include a genuinely pre-baseline OwnerInvestment', () => {
  it('date after confirmedAt, createdAt before/at confirmedAt → excluded', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, date: '2026-09-20', createdAt: '2026-09-10T09:00:00.000Z' })];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 0);
  });
});

describe('FR-65 — Case H: mixed set — only createdAt decides, for every record independently', () => {
  it('pre-baseline + exact-boundary + post-baseline + backdated-post-baseline + future-dated-pre-baseline → only the genuinely post-baseline ones are summed', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'pre', amount: 10000, createdAt: '2026-09-10T09:00:00.000Z' }), // excluded
      makeOwnerInvestment({ id: 'exact', amount: 20000, createdAt: '2026-09-10T10:00:00.000Z' }), // excluded (==)
      makeOwnerInvestment({ id: 'post', amount: 30000, createdAt: '2026-09-10T11:00:00.000Z' }), // included
      makeOwnerInvestment({ id: 'backdated-post', amount: 40000, date: '2026-09-01', createdAt: '2026-09-10T12:00:00.000Z' }), // included
      makeOwnerInvestment({ id: 'future-dated-pre', amount: 50000, date: '2026-09-25', createdAt: '2026-09-10T09:30:00.000Z' }), // excluded
    ];
    // Only 'post' (30,000) + 'backdated-post' (40,000) = 70,000.
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 70000);
  });
});

describe('FR-65 — Case I: linked CashLedgerEntry does not cause double counting', () => {
  it('computeOwnerInvestmentsSinceSnapshot has no cashLedgerEntries parameter at all — structurally impossible for the linked ledger entry to be summed a second time', () => {
    const start = calculationsSrc.indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    assert.notEqual(start, -1);
    const end = calculationsSrc.indexOf('): number {', start);
    const signature = calculationsSrc.slice(start, end);
    assert.doesNotMatch(signature, /cashLedgerEntries/i, 'FR-65\'s own helper must have no coupling to CashLedgerEntry at all.');
  });

  it('behavioral proof: the linked 100,000 CashLedgerEntry (category=other-governed-movement) plays no role in the FR-65 sum, which reads only the 100,000 OwnerInvestment', () => {
    const ownerInvestments = [makeOwnerInvestment({ id: 'oi-1', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    // A linked CashLedgerEntry exists in the wider system (as
    // addOwnerInvestment, AppContext.tsx, always produces one) but is
    // never passed to this function — proving, behaviorally, that its
    // presence or absence cannot change the FR-65 result.
    const unusedCashLedgerEntries: CashLedgerEntry[] = [
      { id: 'cle-owner-investment-oi-1', businessId: 'biz1', direction: 'inflow', amount: 100000, category: 'other-governed-movement', sourceReference: { type: 'owner-investment', id: 'oi-1' }, occurredAt: '2026-09-10', createdAt: '2026-09-10T11:00:00.000Z', createdBy: 'uid-owner' },
    ];
    assert.equal(unusedCashLedgerEntries.length, 1); // sanity — the entry genuinely exists
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, AS_OF_MS), 100000, 'Must be exactly the OwnerInvestment amount — never doubled by the linked CashLedgerEntry.');
  });
});

describe('FR-65 — Case J: consistency with the FR-64 live term (single shared implementation)', () => {
  it('ownerInvestmentSinceLastSnapshot (via computeOwnerInvestmentsSinceSnapshot) equals exactly the ownerInvestmentsSinceSnapshot delta FR-64\'s own live formula includes for the same baseline/as-of context', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000, createdAt: '2026-09-09T00:00:00.000Z' }), // pre-baseline, excluded from both
    ];
    // FR-64's own live delta over the base snapshot (500,000):
    const liveWorth = getCurrentBusinessWorth({ snapshots, batches: [], quebras: [], expenses: [], withdrawals: [], ownerInvestments, asOfDate: '2026-09-11' });
    const fr64Delta = (liveWorth as number) - 500000;
    // FR-65's own drill-down figure for the identical baseline/as-of context:
    const fr65Value = computeOwnerInvestmentsSinceSnapshot(ownerInvestments, BASELINE_MS, new Date('2026-09-11T23:59:59.999Z').getTime());
    assert.equal(fr64Delta, 100000);
    assert.equal(fr65Value, 100000);
    assert.equal(fr64Delta, fr65Value, 'FR-64\'s live contribution and FR-65\'s frozen drill-down must be numerically identical for the same interval — they are, because both call the exact same shared function.');
  });

  it('structural proof: computeCaseALiveBusinessWorth itself calls computeOwnerInvestmentsSinceSnapshot — not a separately re-implemented copy of the boundary rule', () => {
    const start = calculationsSrc.indexOf('function computeCaseALiveBusinessWorth(');
    assert.notEqual(start, -1);
    const paramsEnd = calculationsSrc.indexOf('): number {', start);
    const end = calculationsSrc.indexOf('\n}\n', paramsEnd);
    const body = calculationsSrc.slice(start, end);
    assert.match(body, /computeOwnerInvestmentsSinceSnapshot\(ownerInvestments, snapshotMillis, asOfMillis\)/);
  });
});

describe('FR-65 — Case K: snapshot immutability remains intact', () => {
  it('firestore.rules\' businessWorthSnapshots update rule still permits ONLY the status field to change — unchanged by FR-65', () => {
    const start = rulesSrc.indexOf('match /businessWorthSnapshots/{snapshotId} {');
    assert.notEqual(start, -1);
    const updateStart = rulesSrc.indexOf('allow update:', start);
    const updateEnd = rulesSrc.indexOf(');', updateStart) + 2;
    const updateBlock = rulesSrc.slice(updateStart, updateEnd);
    assert.match(updateBlock, /affectedKeys\(\)\.hasOnly\(\['status'\]\)/, 'The update rule must still allow ONLY the status field to change — FR-65 must not introduce any post-creation mutation path for its own field.');
  });

  it('allow delete: if false is preserved on businessWorthSnapshots', () => {
    const start = rulesSrc.indexOf('match /businessWorthSnapshots/{snapshotId} {');
    const end = rulesSrc.indexOf('\n      }', rulesSrc.indexOf('allow delete:', start));
    const body = rulesSrc.slice(start, end);
    assert.match(body, /allow delete: if false;/);
  });
});

describe('FR-65 — Case L: tenant/business isolation', () => {
  it('computeOwnerInvestmentsSinceSnapshot has no businessId parameter — it operates purely on an already-scoped array, so cross-business leakage is structurally impossible at this layer', () => {
    const start = calculationsSrc.indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    const end = calculationsSrc.indexOf('): number {', start);
    const signature = calculationsSrc.slice(start, end);
    assert.doesNotMatch(signature, /businessId/i);
  });

  it('AppContext.tsx reads ownerInvestments from the exact same per-business-scoped collection path as every other Owner-only collection', () => {
    assert.match(appContextSrc, /collection\(db, 'businesses', businessId, 'ownerInvestments'\)/);
  });

  it('recordStockCount computes ownerInvestmentSinceLastSnapshot from the context\'s own (already business-scoped) ownerInvestments array — never a second, independently-fetched source', () => {
    const start = appContextSrc.indexOf('const ownerInvestmentSinceLastSnapshot = computeOwnerInvestmentsSinceSnapshot(');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf(');', start) + 2;
    const body = appContextSrc.slice(start, end);
    assert.match(body, /computeOwnerInvestmentsSinceSnapshot\(\s*ownerInvestments,/);
  });
});

describe('FR-65 — Case M: historical snapshot compatibility', () => {
  it('a pre-FR-65 snapshot object (no ownerInvestmentSinceLastSnapshot field at all) remains a structurally valid BusinessWorthSnapshot', () => {
    const historicalSnapshot = makeSnapshot(); // no ownerInvestmentSinceLastSnapshot override
    assert.ok(!('ownerInvestmentSinceLastSnapshot' in historicalSnapshot), 'A historical snapshot must genuinely lack the field, never a fabricated 0.');
    // TypeScript itself proves this compiles (BusinessWorthSnapshot marks
    // the field optional) — this assertion just confirms the runtime
    // shape mirrors that at the object-literal level too.
  });

  it('types.ts declares the field optional (backward-compatible), not required', () => {
    const start = typesSrc.indexOf('export interface BusinessWorthSnapshot {');
    const end = typesSrc.indexOf('\nexport interface', start + 10);
    const body = typesSrc.slice(start, end);
    assert.match(body, /ownerInvestmentSinceLastSnapshot\?:\s*number;/);
  });

  it('no backfill/migration script or mutation of historical snapshots is introduced by this checkpoint\'s diff (structural absence check)', () => {
    assert.doesNotMatch(appContextSrc, /backfillOwnerInvestmentSinceLastSnapshot/i);
    assert.doesNotMatch(appContextSrc, /migrateOwnerInvestment/i);
  });
});

describe('FR-65 — Case N: CAIXER separation', () => {
  it('computeOwnerInvestmentsSinceSnapshot has no CAIXER-related parameter of any kind', () => {
    const start = calculationsSrc.indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    const end = calculationsSrc.indexOf('): number {', start);
    const signature = calculationsSrc.slice(start, end);
    assert.doesNotMatch(signature, /caixer/i);
    assert.doesNotMatch(signature, /cashPosition/i);
  });
});

describe('FR-65 — Case O: Startup Investment separation', () => {
  it('computeOwnerInvestmentsSinceSnapshot has no startupInvestmentEntries-related parameter of any kind', () => {
    const start = calculationsSrc.indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    const end = calculationsSrc.indexOf('): number {', start);
    const signature = calculationsSrc.slice(start, end);
    assert.doesNotMatch(signature, /startupInvestment/i);
  });
});

describe('FR-65 — Case P: Levantamento separation', () => {
  it('computeOwnerInvestmentsSinceSnapshot has no withdrawals-related parameter of any kind', () => {
    const start = calculationsSrc.indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    const end = calculationsSrc.indexOf('): number {', start);
    const signature = calculationsSrc.slice(start, end);
    assert.doesNotMatch(signature, /withdrawal/i);
  });
});

// ============================================================
// Empty/zero case discipline (item 6) — the "no active baseline yet"
// case (a business's very first-ever snapshot) is genuinely 0, never a
// fabricated "since business creation" fallback, matching FR-64's own
// Case A/Case B structural split.
// ============================================================

describe('FR-65 — no-baseline case (business\'s first-ever snapshot): governed zero, not a fabricated fallback', () => {
  it('baselineConfirmedAtMillis === null → 0, regardless of how many OwnerInvestments already exist', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000, createdAt: '2026-09-01T00:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000, createdAt: '2026-09-05T00:00:00.000Z' }),
    ];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, null, AS_OF_MS), 0);
  });
});

// ============================================================
// FR-69 (Owner-Declared) omission discipline — confirmed by both the
// existing recordOwnerDeclaredBusinessWorth source text and the
// pre-existing firestore.rules absence check (which already
// anticipated this exact field name).
// ============================================================

describe('FR-65 — Owner-Declared establishment: ownerInvestmentSinceLastSnapshot remains genuinely OMITTED (FR-69), never a fabricated 0', () => {
  it('recordOwnerDeclaredBusinessWorth\'s own snapshot object has no ownerInvestmentSinceLastSnapshot field', () => {
    const start = appContextSrc.indexOf('const recordOwnerDeclaredBusinessWorth = async (');
    assert.notEqual(start, -1);
    const objStart = appContextSrc.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot', start);
    const objEnd = appContextSrc.indexOf('};', objStart);
    const objBody = appContextSrc.slice(objStart, objEnd);
    assert.doesNotMatch(objBody, /ownerInvestmentSinceLastSnapshot/);
  });

  it('firestore.rules\' owner-declared branch already requires ownerInvestmentSinceLastSnapshot to be genuinely absent (pre-existing, confirmed unchanged)', () => {
    const start = rulesSrc.indexOf("establishmentMethod', null) == 'owner-declared'");
    assert.notEqual(start, -1);
    const end = rulesSrc.indexOf('\n            (', start);
    const body = rulesSrc.slice(start, end);
    assert.match(body, /!\('ownerInvestmentSinceLastSnapshot' in request\.resource\.data\)/);
  });
});

// ============================================================
// Contagem write path: the field is written unconditionally
// (including a genuine 0), never conditionally omitted the way the
// UI-only reconciliation-return object treats its sibling fields.
// ============================================================

describe('FR-65 — Contagem establishment: the field is written unconditionally (0 is a real, governed value, not an omission)', () => {
  it('the snapshot write object includes ownerInvestmentSinceLastSnapshot as a bare key, never behind a conditional spread', () => {
    const start = appContextSrc.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot, \'confirmedAt\'> = {', appContextSrc.indexOf('const recordStockCount ='));
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf('\n      };', start);
    const body = appContextSrc.slice(start, end);
    assert.match(body, /\n\s*ownerInvestmentSinceLastSnapshot,\n/, 'Must be written as a bare key (always present), matching expensesSinceLastSnapshot/breakagesSinceLastSnapshot/levantamentosSinceLastSnapshot\'s own unconditional-write discipline on this Contagem path.');
  });
});
