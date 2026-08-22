// Module #17 Owner Portfolio v0.2 addendum — currentWorth cache and
// explicit per-shop refresh mechanism.
//
// [Stage 8 Implementation Authorization, signed 2026-08-17, corrected
// 2026-08-17] SCOPE: OwnerPortfolioModal.tsx is a React component with
// no jsdom/testing-library harness in this repo — same documented
// constraint as every other component test in this repository (see
// tests/periodic-stock-draft-resurrection.test.ts's own header). This
// suite uses the same established source-inspection technique.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-portfolio-currentworth.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const modalSrc = readFileSync(new URL('../apps/tenant/src/components/OwnerPortfolioModal.tsx', import.meta.url), 'utf-8');
const headerSrc = readFileSync(new URL('../apps/tenant/src/components/Header.tsx', import.meta.url), 'utf-8');
const typesSrc = readFileSync(new URL('../apps/tenant/src/types.ts', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = src.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('Data model — currentWorth field (apps/tenant/src/types.ts)', () => {
  it('adds an optional currentWorth field to Business, not a required one', () => {
    assert.match(typesSrc, /currentWorth\?:\s*\{/, 'currentWorth must be optional (currentWorth?:), matching the "missing = not yet computed" convention.');
  });

  it('currentWorth has value, calculatedAt, and optional sourceRevision, matching the accepted addendum shape', () => {
    const fieldBlock = typesSrc.slice(typesSrc.indexOf('currentWorth?:'), typesSrc.indexOf('currentWorth?:') + 200);
    assert.match(fieldBlock, /value:\s*number/);
    assert.match(fieldBlock, /calculatedAt:\s*string/);
    assert.match(fieldBlock, /sourceRevision\?:\s*string/);
  });
});

describe('refreshShopWorth (apps/tenant/src/context/AppContext.tsx) — the explicit per-shop refresh mechanism', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const refreshShopWorth = async (');

  it('exists and is exposed on the context', () => {
    assert.match(appContextSrc, /refreshShopWorth,/, 'Expected refreshShopWorth to be exposed on the AppContext provider value.');
  });

  it('checks ownership before doing anything else — a non-owned businessId is rejected', () => {
    assert.match(fnBody, /if \(!ownedBusinessIds\.includes\(businessId\)\)/);
  });

  it('uses one-time getDocs reads, never a new onSnapshot listener, for every contributing collection', () => {
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'batches'\)\)/);
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'quebras'\)\)/);
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'expenses'\)\)/);
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'withdrawals'\)\)/);
    assert.doesNotMatch(fnBody, /onSnapshot/, 'refreshShopWorth must never establish a new live listener — one-time reads only.');
  });

  it('[Business Worth Evolution, Increment 2] also reads stockCounts, voidRecords, and businessWorthSnapshots — required to resolve the target shop\'s own initialStockCount/snapshot state for the shared calculation', () => {
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'stockCounts'\)\)/);
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'voidRecords'\)\)/);
    assert.match(fnBody, /getDocs\(collection\(db, 'businesses', businessId, 'businessWorthSnapshots'\)\)/);
  });

  it('every read/write targets the single, explicit target businessId — never a different or additional businessId in this function', () => {
    const businessIdRefs = fnBody.match(/'businesses', businessId[,)]/g) ?? [];
    assert.equal(businessIdRefs.length, 8, 'Expected exactly 8 references to the single target businessId (7 collection reads + 1 document write), all using the same variable, none hardcoded or reading a second business.');
  });

  it('[Business Worth Evolution, Increment 2] reuses the shared authoritative calculation (getEstimatedBusinessWorth) — never an independent, competing formula (Rule 8 Finding 15-A, FR-60)', () => {
    assert.match(fnBody, /getEstimatedBusinessWorth\(\{/);
    assert.doesNotMatch(
      fnBody,
      /totalMarketValue\s*-\s*shopTotalExpenses\s*-\s*shopTotalWithdrawals/,
      'The old, independent formula must be gone — this was exactly the competing calculation Finding 15-A identified.'
    );
  });

  it('[Business Worth Evolution, Increment 2] resolves the target shop\'s own initialStockCount using the identical voided-confirmation exclusion the active-shop context already applies', () => {
    assert.match(fnBody, /shopVoidedConfirmationIds/);
    assert.match(fnBody, /s\.type === 'initial' && !shopVoidedConfirmationIds\.has\(s\.id\)/);
  });

  it('[Business Worth Evolution, Increment 2] never writes a fabricated currentWorth when the shared calculation is genuinely UNKNOWN', () => {
    assert.match(fnBody, /if \(shopEstimatedOrCurrentWorth === 'UNKNOWN'\)/);
    const unknownBranchStart = fnBody.indexOf("if (shopEstimatedOrCurrentWorth === 'UNKNOWN')");
    const unknownBranch = fnBody.slice(unknownBranchStart, unknownBranchStart + 400);
    assert.match(unknownBranch, /return \{ success: false/);
    assert.doesNotMatch(unknownBranch, /updateDoc/);
  });

  it('calculatedAt uses a client-supplied new Date().toISOString(), per the Implementation Plan §5.6 Amendment resolution — not serverTimestamp()', () => {
    assert.match(fnBody, /calculatedAt:\s*new Date\(\)\.toISOString\(\)/);
    assert.doesNotMatch(fnBody, /serverTimestamp/);
  });

  it('never throws to its caller — every path returns a { success, error? } result instead', () => {
    assert.match(fnBody, /catch \(err: any\) \{/);
    const catchBlock = fnBody.slice(fnBody.indexOf('catch (err: any) {'));
    assert.doesNotMatch(catchBlock, /throw /, 'The catch block must not re-throw — a failed refresh must report failure via the return value, never propagate as an exception.');
    assert.match(catchBlock, /return \{ success: false/);
  });

  it('a failed refresh never issues the Firestore write — updateDoc only happens after all reads and the calculation succeed', () => {
    const updateDocIndex = fnBody.indexOf('await updateDoc(');
    const tryIndex = fnBody.indexOf('try {');
    assert.notEqual(updateDocIndex, -1);
    assert.ok(updateDocIndex > tryIndex, 'updateDoc must be inside the try block, after the reads/calculation, so a read failure never reaches it — the previous cached value is left untouched by construction, not by special-case handling.');
  });
});

describe('OwnerPortfolioModal.tsx — UI structure', () => {
  it('renders one row per entry in ownedBusinesses via .map, never a combined/aggregate row', () => {
    assert.match(modalSrc, /ownedBusinesses\.map\(/);
    assert.doesNotMatch(modalSrc, /\.reduce\(/, 'No reduce/sum/aggregate logic should exist in this presentation-only component — aggregation is explicitly out of scope.');
  });

  it('each row has an independent refresh action calling refreshShopWorth with that row\'s own businessId', () => {
    assert.match(modalSrc, /onClick=\{\(\) => handleRefresh\(b\.id\)\}/);
    assert.match(modalSrc, /refreshShopWorth\(businessId\)/);
  });

  it('per-row refreshing/failure state is tracked in a Set/Record keyed by businessId — independent per row, not a single shared boolean', () => {
    assert.match(modalSrc, /useState<Set<string>>/);
    assert.match(modalSrc, /useState<Record<string, string>>/);
  });

  it('renders a distinct "not yet calculated" state when currentWorth is absent, never a fabricated zero', () => {
    assert.match(modalSrc, /cached \? \(/);
    assert.match(modalSrc, /Ainda não calculado/);
  });

  it('never imports or references server-side modules, subscription state, or firestore.rules-adjacent write paths beyond the context hook', () => {
    assert.doesNotMatch(modalSrc, /from '\.\.\/\.\.\/server/);
    assert.doesNotMatch(modalSrc, /subscription/i);
  });
});

describe('OwnerPortfolioModal.tsx — AC #11 corrective fix: fresh vs. stale vs. missing', () => {
  it('defines a freshness threshold as a named, engineering-level constant — not a magic number inline, not sourced from a new spec field', () => {
    assert.match(modalSrc, /const FRESHNESS_THRESHOLD_MS = 24 \* 60 \* 60 \* 1000;/);
  });

  it('derives staleness from the existing calculatedAt field only — no new data-model field, no new write path', () => {
    const isStaleFnStart = modalSrc.indexOf('const isStale = (iso: string)');
    assert.notEqual(isStaleFnStart, -1);
    const isStaleFnBody = modalSrc.slice(isStaleFnStart, modalSrc.indexOf('\n  };', isStaleFnStart));
    assert.match(isStaleFnBody, /Date\.now\(\) - d\.getTime\(\) > FRESHNESS_THRESHOLD_MS/);
  });

  it('a malformed/unparseable calculatedAt is treated as stale, never as fresh', () => {
    const isStaleFnStart = modalSrc.indexOf('const isStale = (iso: string)');
    const isStaleFnBody = modalSrc.slice(isStaleFnStart, modalSrc.indexOf('\n  };', isStaleFnStart));
    assert.match(isStaleFnBody, /if \(Number\.isNaN\(d\.getTime\(\)\)\) return true;/);
  });

  it('a fresh value and a stale value render with different, non-overlapping visual treatment (color class)', () => {
    assert.match(modalSrc, /stale \? 'text-amber-700' : 'text-\[#0B1F3A\]'/);
  });

  it('the stale state carries an explicit textual label, never relying on color alone', () => {
    assert.match(modalSrc, /desatualizado/);
  });

  it('the missing state remains distinct from both fresh and stale ("Ainda não calculado")', () => {
    assert.match(modalSrc, /Ainda não calculado/);
  });

  it('does not introduce a bulk or automatic recalculation as a side effect of staleness — isStale only affects rendering, refreshShopWorth is still only called from handleRefresh', () => {
    const refreshCalls = modalSrc.match(/refreshShopWorth\(/g) ?? [];
    assert.equal(refreshCalls.length, 1, 'refreshShopWorth must still be invoked from exactly one place (handleRefresh) — the freshness fix must not add a second, automatic call site.');
  });
});

describe('Header.tsx — entry point gating', () => {
  it('the Owner Portfolio trigger is gated on ownedBusinesses.length > 1, the same condition ShopSwitcher\'s own chevron uses', () => {
    assert.match(headerSrc, /ownedBusinesses\.length > 1 && \(/);
  });

  it('the trigger only renders inside the isOwner branch — Staff and Manager never reach it', () => {
    const ownerBranchStart = headerSrc.indexOf('{isOwner ? (');
    const portfolioTriggerIndex = headerSrc.indexOf('setShowOwnerPortfolio(true)');
    const elseBranchIndex = headerSrc.indexOf(') : (', ownerBranchStart);
    assert.ok(ownerBranchStart !== -1 && portfolioTriggerIndex !== -1 && elseBranchIndex !== -1);
    assert.ok(
      portfolioTriggerIndex > ownerBranchStart && portfolioTriggerIndex < elseBranchIndex,
      'The Owner Portfolio trigger must be inside the isOwner ? (...) branch, before the else branch — never reachable by Staff/Manager.'
    );
  });

  it('imports OwnerPortfolioModal and renders it conditionally, matching the existing SettingsModal pattern', () => {
    assert.match(headerSrc, /import \{ OwnerPortfolioModal \} from '\.\/OwnerPortfolioModal';/);
    assert.match(headerSrc, /\{showOwnerPortfolio && \(/);
  });
});

describe('Scope discipline — no unauthorized changes', () => {
  it('[Business Worth Evolution, Increment 2] AppContext.tsx: refreshShopWorth reads exactly the seven collections this rewire requires — batches, expenses, quebras, withdrawals, stockCounts, voidRecords, businessWorthSnapshots — never a cross-business query, never a new unrelated collection', () => {
    const fnBody = extractFunctionBody(appContextSrc, 'const refreshShopWorth = async (');
    const collectionRefs = fnBody.match(/collection\(db, 'businesses', businessId, '(\w+)'\)/g) ?? [];
    const uniqueCollections = new Set(collectionRefs.map((c) => c.match(/'(\w+)'\)$/)?.[1]));
    assert.deepEqual(
      [...uniqueCollections].sort(),
      ['batches', 'businessWorthSnapshots', 'expenses', 'quebras', 'stockCounts', 'voidRecords', 'withdrawals']
    );
  });

  it('does not modify the existing businessWorth calculation used by the active-shop Dashboard path', () => {
    assert.match(appContextSrc, /const businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime;/, 'The original active-shop businessWorth line must remain exactly as it was — this feature reuses the same formula, it does not touch this line.');
  });

  it('OwnerPortfolioModal.tsx does not import ShopSwitcher or call switchShop — refreshing a shop must never change the active business', () => {
    // Strip line comments first — a comment referencing ShopSwitcher by
    // name (to explain the shared gating condition) is not the same as
    // actually importing or using it, and must not trip this check.
    const codeOnly = modalSrc
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('//');
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join('\n');
    assert.doesNotMatch(codeOnly, /switchShop/);
    assert.doesNotMatch(codeOnly, /ShopSwitcher/);
  });
});
