// Owner Investment / Capital Added — Implementation Authorization §46/§47
// — CHECKPOINT 8 (FR-82: Lifetime Owner Investment Total).
//
// SCOPE: proves `computeOwnerInvestmentLifetimeTotal` (calculations.ts) —
// SUM(OwnerInvestment.amount) across ALL immutable OwnerInvestment
// records belonging to the business, with NO date/createdAt/snapshot/
// establishment-method filtering of any kind. Pure function only, no
// Firestore/AppContext dependency — mirrors this repository's own
// established pattern, see tests/owner-investment-checkpoint-2-fr64.test.ts.
//
// Also proves, structurally: this function is signature-distinct from
// computeOwnerInvestmentsSinceSnapshot (FR-65), never reads any CAIXER
// field, never reads BusinessWorthSnapshot, and introduces no side
// effects — the exact safeguards Rule 8 Findings OI-9/OI-10/OI-11/OI-16
// require (business-worth-evolution-rule8-assessment.md).
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-8-lifetime-total.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  computeOwnerInvestmentLifetimeTotal,
  computeOwnerInvestmentsSinceSnapshot,
} from '../apps/tenant/src/utils/calculations';
import { OwnerInvestment } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
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

// ============================================================
// §1 Basic aggregation (items 1-4 of the accepted Testing Plan)
// ============================================================

describe('FR-82 — empty array returns 0', () => {
  it('an empty OwnerInvestment array sums to exactly 0', () => {
    assert.equal(computeOwnerInvestmentLifetimeTotal([]), 0);
  });
});

describe('FR-82 — single investment returns its exact amount', () => {
  it('one OwnerInvestment of 100,000 returns 100,000', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000 })];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 100000);
  });
});

describe('FR-82 — multiple investments return the exact sum', () => {
  it('100,000 + 50,000 + 25,000 = 175,000', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000 }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000 }),
      makeOwnerInvestment({ id: 'oi-c', amount: 25000 }),
    ];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 175000);
  });
});

describe('FR-82 — decimal amounts sum correctly', () => {
  it('100.25 + 50.10 + 0.01 = 150.36, respecting the existing two-decimal rounding convention', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100.25 }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50.1 }),
      makeOwnerInvestment({ id: 'oi-c', amount: 0.01 }),
    ];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 150.36);
  });
});

// ============================================================
// §2 No filtering of any kind — items 5-10 of the accepted Testing Plan
// (Rule 8 Finding OI-8, exhaustively tested against every named case)
// ============================================================

describe('FR-82 — a backdated `date` does not exclude a record', () => {
  it('a record with date far in the past (2020) is fully included', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, date: '2020-01-01' })];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 100000);
  });
});

describe('FR-82 — differing `createdAt` values are all included, regardless of spread', () => {
  it('records created a year apart both contribute in full', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-old', amount: 100000, createdAt: '2025-01-01T00:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-new', amount: 50000, createdAt: '2026-09-10T10:00:01.000Z' }),
    ];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 150000);
  });
});

describe('FR-82 — no snapshot-boundary filtering: investments both before and after any given snapshot moment are included identically', () => {
  it('a record with createdAt far before a hypothetical snapshot confirmedAt, and one far after, both count', () => {
    // This function takes NO snapshot parameter at all — there is no
    // "before"/"after" a snapshot to even express. Proven here by
    // supplying two records whose createdAt values straddle an
    // arbitrary reference instant that a snapshot might have used,
    // and confirming both are summed regardless.
    const referenceInstant = '2026-09-10T10:00:00.000Z';
    const before = makeOwnerInvestment({ id: 'oi-before', amount: 100000, createdAt: '2026-09-10T09:00:00.000Z' });
    const after = makeOwnerInvestment({ id: 'oi-after', amount: 50000, createdAt: '2026-09-10T11:00:00.000Z' });
    void referenceInstant; // documents intent only; the function itself has no such parameter to pass
    assert.equal(computeOwnerInvestmentLifetimeTotal([before, after]), 150000);
  });
});

describe('FR-82 — Owner-Declared vs. Contagem establishment method is irrelevant (the function has no establishment-method parameter at all)', () => {
  it('the sum is identical regardless of any establishment-method context — proven structurally, since no such field exists in OwnerInvestment or in this function\'s signature', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000 }), makeOwnerInvestment({ id: 'oi-2', amount: 50000 })];
    // OwnerInvestment itself carries no establishmentMethod field
    // (types.ts) — there is nothing to filter by, by construction.
    assert.ok(!('establishmentMethod' in ownerInvestments[0]));
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 150000);
  });
});

// ============================================================
// §3 FR-65 separation — item 9/11 of the accepted Testing Plan
// (Rule 8 Finding OI-9's required safeguard)
// ============================================================

describe('FR-82 — FR-65 (computeOwnerInvestmentsSinceSnapshot) is a structurally distinct function, never reused for the lifetime total', () => {
  it('computeOwnerInvestmentLifetimeTotal accepts exactly one parameter (no snapshot/time bound), unlike computeOwnerInvestmentsSinceSnapshot which requires three', () => {
    assert.equal(computeOwnerInvestmentLifetimeTotal.length, 1);
    assert.equal(computeOwnerInvestmentsSinceSnapshot.length, 3);
  });

  it('the two functions produce different results for the same data when a snapshot boundary would exclude an older record — proving they are not interchangeable', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-old', amount: 100000, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-new', amount: 50000, createdAt: '2026-09-10T11:00:00.000Z' }),
    ];
    const baselineConfirmedAtMillis = new Date('2026-09-10T10:00:00.000Z').getTime();
    const asOfMillis = new Date('2026-09-10T12:00:00.000Z').getTime();

    const lifetimeTotal = computeOwnerInvestmentLifetimeTotal(ownerInvestments);
    const sinceSnapshot = computeOwnerInvestmentsSinceSnapshot(ownerInvestments, baselineConfirmedAtMillis, asOfMillis);

    assert.equal(lifetimeTotal, 150000, 'lifetime total includes both records');
    assert.equal(sinceSnapshot, 50000, 'FR-65 interval attribution excludes the pre-baseline record');
    assert.notEqual(lifetimeTotal, sinceSnapshot);
  });
});

// ============================================================
// §4 CAIXER separation — item 12 of the accepted Testing Plan
// (Rule 8 Finding OI-10)
// ============================================================

describe('FR-82 — CAIXER separation: the function has no CAIXER-related parameter of any kind', () => {
  it('computeOwnerInvestmentLifetimeTotal\'s only parameter is the OwnerInvestment array — structurally impossible for cashPosition or any of its four components to participate', () => {
    // Calling the function with a differently-shaped/extra-property
    // array element (simulating a caller mistake) still only reads
    // `amount` from each element — proving no other field, CAIXER or
    // otherwise, is consulted.
    const ownerInvestments = [
      { ...makeOwnerInvestment({ amount: 100000 }), cashPosition: 999999, cashPositionCash: 999999 } as OwnerInvestment,
    ];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 100000);
  });
});

// ============================================================
// §5 Business Worth History separation — item 13 of the accepted
// Testing Plan (Rule 8 Finding OI-11)
// ============================================================

describe('FR-82 — Business Worth History separation: no BusinessWorthSnapshot field is read', () => {
  it('the function signature has no snapshot parameter, so measuredBusinessWorth and every other snapshot field are structurally unreachable', () => {
    // computeOwnerInvestmentLifetimeTotal(ownerInvestments) — arity 1,
    // already proven above (§3). Re-asserted here in the context of
    // Business Worth History specifically: there is no BusinessWorthSnapshot
    // argument for measuredBusinessWorth (or any other snapshot field)
    // to leak through.
    assert.equal(computeOwnerInvestmentLifetimeTotal.length, 1);
  });
});

// ============================================================
// §6 Startup Investment / Levantamento separation — items 14-15 of the
// accepted Testing Plan
// ============================================================

describe('FR-82 — Startup Investment separation: no startupInvestmentEntries parameter exists', () => {
  it('the function reads only the supplied OwnerInvestment array — nothing from computeStartupInvestmentTotal\'s own inputs can leak in', () => {
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000 })];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 100000);
  });
});

describe('FR-82 — Levantamento separation: no withdrawals parameter exists', () => {
  it('the function has no Withdrawal-related input of any kind — structurally proven by its single-array signature', () => {
    assert.equal(computeOwnerInvestmentLifetimeTotal.length, 1);
  });
});

// ============================================================
// §7 Duplicate / idempotency — item 16 of the accepted Testing Plan
// ============================================================

describe('FR-82 — duplicate/idempotency: a retried submission (same resulting single document, per Checkpoint 1\'s idempotent submissionId-derived id) contributes exactly once', () => {
  it('a single OwnerInvestment document is summed exactly once — never doubled', () => {
    const ownerInvestments = [makeOwnerInvestment({ id: 'oi-retry-1', amount: 100000 })];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 100000);
  });

  it('this function performs no deduplication of its own — it is a pure sum, relying entirely on the write-side idempotency guarantee for a duplicate-free input array', () => {
    // Two genuinely distinct documents (different ids) both count, even
    // if their amounts happen to match — proving this function does not
    // (and must not) attempt to detect "duplicate-looking" entries.
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-1', amount: 100000 }),
      makeOwnerInvestment({ id: 'oi-2', amount: 100000 }),
    ];
    assert.equal(computeOwnerInvestmentLifetimeTotal(ownerInvestments), 200000);
  });
});

// ============================================================
// §8 Tenant / business scoping — item 18 of the accepted Testing Plan
// (Rule 8 Finding OI-13)
// ============================================================

describe('FR-82 — tenant scoping: the function sums exactly the array it is given, never inferring or expanding scope', () => {
  it('passing only Business A\'s records never includes Business B\'s amounts, since the function has no businessId parameter to cross — the caller\'s own scoping is authoritative', () => {
    const businessAInvestments = [makeOwnerInvestment({ id: 'oi-a1', businessId: 'biz-A', amount: 100000 })];
    const businessBInvestments = [makeOwnerInvestment({ id: 'oi-b1', businessId: 'biz-B', amount: 999999 })];

    assert.equal(computeOwnerInvestmentLifetimeTotal(businessAInvestments), 100000);
    // Confirms Business B's array, if accidentally supplied, would
    // change the result — proving the function trusts its input
    // completely and performs no independent business-scoping of its
    // own; correctness therefore depends entirely on the caller
    // supplying an already business-scoped array, exactly as
    // AppContext's own `ownerInvestments` already is (Rule 8 Finding
    // OI-13).
    assert.equal(computeOwnerInvestmentLifetimeTotal(businessBInvestments), 999999);
  });
});

// ============================================================
// §9 No side effects / no persisted accumulator — item 20 of the
// accepted Testing Plan
// ============================================================

describe('FR-82 — pure function, no side effects, no persisted accumulator', () => {
  it('calling the function twice with the same input array returns the same result both times, and does not mutate the input array', () => {
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000 }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000 }),
    ];
    const snapshotBefore = JSON.stringify(ownerInvestments);

    const first = computeOwnerInvestmentLifetimeTotal(ownerInvestments);
    const second = computeOwnerInvestmentLifetimeTotal(ownerInvestments);

    assert.equal(first, 150000);
    assert.equal(second, 150000);
    assert.equal(JSON.stringify(ownerInvestments), snapshotBefore, 'input array must not be mutated');
  });
});

// ============================================================
// §10 Cash Flow UI — items 7, 8, 9, 17, 19 of the accepted Testing Plan
// (AC-OI-LT-7, AC-OI-LT-8, AC-OI-LT-9). Source-level structural checks,
// mirroring Checkpoint 7's own established convention
// (owner-investment-checkpoint-7-ui-entry-point.test.ts) — no React
// rendering harness is introduced, consistent with this repository's
// existing pattern for verifying UI wiring without a new testing
// framework.
// ============================================================

const cashFlowViewSrc = src('apps/tenant/src/components/CashFlowView.tsx');

describe('FR-82 — CashFlowView.tsx displays the Lifetime Owner Investment Total inside the existing Owner Investment card (AC-OI-LT-7)', () => {
  it('imports computeOwnerInvestmentLifetimeTotal from the existing calculation utilities', () => {
    assert.match(cashFlowViewSrc, /import\s*\{\s*computeOwnerInvestmentLifetimeTotal\s*\}\s*from\s*'\.\.\/utils\/calculations'/);
  });

  it('computes ownerInvestmentLifetimeTotal from the context-provided ownerInvestments array', () => {
    assert.match(cashFlowViewSrc, /const ownerInvestmentLifetimeTotal = computeOwnerInvestmentLifetimeTotal\(ownerInvestments\);/);
  });

  it('renders the computed total using formatCurrency inside the Owner Investment card', () => {
    assert.match(cashFlowViewSrc, /\{formatCurrency\(ownerInvestmentLifetimeTotal, currencySymbol\)\}/);
  });

  it('does not introduce a new top-level module — no new route/nav string is added for Owner Investment', () => {
    assert.doesNotMatch(cashFlowViewSrc, /ownerInvestment.*(Route|NavItem|TopLevel)/i);
  });
});

describe('FR-82 — CashFlowView.tsx provides a collapsible history of individual OwnerInvestment records (AC-OI-LT-8)', () => {
  it('declares a showOwnerInvestmentHistory toggle state, mirroring the existing showCashHistory pattern', () => {
    assert.match(cashFlowViewSrc, /const \[showOwnerInvestmentHistory, setShowOwnerInvestmentHistory\] = useState\(false\);/);
  });

  it('renders one row per OwnerInvestment record via .map over the ownerInvestments array, with no separate/refiltered array', () => {
    assert.match(cashFlowViewSrc, /\{ownerInvestments\.map\(\(oi\) => \(/);
  });

  it('each history row displays the record\'s date and amount (existing meaningful fields only, no new accounting field)', () => {
    const mapBlockStart = cashFlowViewSrc.indexOf('{ownerInvestments.map((oi) => (');
    assert.notEqual(mapBlockStart, -1);
    const mapBlockEnd = cashFlowViewSrc.indexOf('))}', mapBlockStart);
    const mapBlock = cashFlowViewSrc.slice(mapBlockStart, mapBlockEnd);
    assert.match(mapBlock, /formatDate\(oi\.date\)/);
    assert.match(mapBlock, /formatCurrency\(oi\.amount, currencySymbol\)/);
    assert.match(mapBlock, /oi\.description/);
    // No edit/delete control of any kind in the history row.
    assert.doesNotMatch(mapBlock, /onClick=\{.*\b(edit|delete|remove)\b/i);
  });
});

describe('FR-82 — total and history share the same business-scoped OwnerInvestment source array (AC-OI-LT-9, Rule 8 Finding OI-17)', () => {
  it('the total is computed from the literal `ownerInvestments` identifier, and the history maps over that exact same identifier — never a differently-named or independently-filtered array', () => {
    assert.match(cashFlowViewSrc, /computeOwnerInvestmentLifetimeTotal\(ownerInvestments\)/);
    assert.match(cashFlowViewSrc, /ownerInvestments\.map\(\(oi\) =>/);
    assert.match(cashFlowViewSrc, /ownerInvestments\.length > 0/);
    // No second, independently-derived owner-investment array exists
    // anywhere in the file (e.g. a filtered/sliced copy used only for
    // history) — the only transformation applied is `.map()` for
    // presentation, never `.filter()`/`.slice()` on ownerInvestments.
    assert.doesNotMatch(cashFlowViewSrc, /ownerInvestments\.filter\(/);
    assert.doesNotMatch(cashFlowViewSrc, /ownerInvestments\.slice\(/);
  });

  it('ownerInvestments is sourced from the existing useApp() context, not a new/duplicate fetch', () => {
    assert.match(cashFlowViewSrc, /\bownerInvestments,/);
  });
});

describe('FR-82 — no new architecture introduced (AC-OI-LT-11)', () => {
  it('CashFlowView.tsx does not declare a new Firestore listener, collection reference, or query for this feature', () => {
    assert.doesNotMatch(cashFlowViewSrc, /collection\(db,.*ownerInvestment/i);
    assert.doesNotMatch(cashFlowViewSrc, /onSnapshot\(/);
  });

  it('calculations.ts does not persist the lifetime total anywhere (no setDoc/updateDoc/addDoc call inside or near the function)', () => {
    // Re-read calculations.ts directly to check the new function's own
    // neighborhood for any write call.
    const calculationsSrc = src('apps/tenant/src/utils/calculations.ts');
    const fnStart = calculationsSrc.indexOf('export function computeOwnerInvestmentLifetimeTotal');
    assert.notEqual(fnStart, -1);
    const fnEnd = calculationsSrc.indexOf('\n}', fnStart) + 2;
    const fnBody = calculationsSrc.slice(fnStart, fnEnd);
    assert.doesNotMatch(fnBody, /setDoc|updateDoc|addDoc|writeBatch/);
  });
});
