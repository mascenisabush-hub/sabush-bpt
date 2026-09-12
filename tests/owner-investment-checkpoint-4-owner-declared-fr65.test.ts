// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10 (Revision 3), Item 3 — CHECKPOINT 4 (Owner-Declared FR-65
// implementation, per Product Architect Decisions OI-PA-9 through
// OI-PA-13, Specification §42.10/§42.11).
//
// SCOPE: proves `recordOwnerDeclaredBusinessWorth` (AppContext.tsx) now
// computes and writes `ownerInvestmentSinceLastSnapshot` using the SAME
// shared `computeOwnerInvestmentsSinceSnapshot` helper the Contagem path
// (`recordStockCount`) and FR-64's own live term already use — and that
// `firestore.rules`' Owner-Declared branch no longer rejects this field,
// while still rejecting every OTHER FR-69-omitted field (regression).
//
// Function bodies tightly coupled to the live Firebase client SDK are
// covered here by structural source-text inspection, matching this
// repository's own established technique for that exact class of
// function (see tests/owner-investment-checkpoint-1.test.ts's own
// header). The Firestore rules/security boundary itself is covered
// separately in tests/business-worth-owner-declared.test.ts, which
// requires a real Firestore emulator (see that file's own SANDBOX
// DISCLOSURE) — not executed in this environment; reported as
// PRESENT — NOT EXECUTED.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-4-owner-declared-fr65.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeOwnerInvestmentsSinceSnapshot } from '../apps/tenant/src/utils/calculations';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const rulesSrc = src('firestore.rules');
const specSrc = src('docs/specs/business-worth-evolution-specification.md');
const rule8Src = src('docs/engineering/business-worth-evolution-rule8-assessment.md');
const planSrc = src('docs/engineering/business-worth-evolution-implementation-plan.md');

function extractFunctionBody(sourceText: string, signatureMarker: string): string {
  const start = sourceText.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = sourceText.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

const ownerDeclaredFnBody = extractFunctionBody(appContextSrc, 'const recordOwnerDeclaredBusinessWorth = async (');

describe('recordOwnerDeclaredBusinessWorth — now computes and writes ownerInvestmentSinceLastSnapshot', () => {
  it('the snapshot write object includes ownerInvestmentSinceLastSnapshot as a bare, unconditional key (matching the Contagem path\'s own unconditional-write discipline — 0 is a real value, not an omission)', () => {
    const objStart = ownerDeclaredFnBody.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot');
    assert.notEqual(objStart, -1);
    const objEnd = ownerDeclaredFnBody.indexOf('};', objStart);
    const objBody = ownerDeclaredFnBody.slice(objStart, objEnd);
    assert.match(objBody, /\n\s*ownerInvestmentSinceLastSnapshot,\n/, 'Must be a bare key — always present, never behind a conditional spread.');
  });

  it('computes the value via the SAME shared, exported computeOwnerInvestmentsSinceSnapshot helper FR-64\'s own live term and the Contagem write path already use', () => {
    assert.match(ownerDeclaredFnBody, /const ownerInvestmentSinceLastSnapshot = computeOwnerInvestmentsSinceSnapshot\(\s*ownerInvestments,\s*activeBaselineConfirmedAtMillis,\s*Date\.now\(\)\s*\);/);
  });

  it('resolves the baseline from the previous ACTIVE snapshot\'s own confirmedAt — the identical "previous active snapshot, else null" resolution the Contagem path uses, not an independently re-derived one', () => {
    assert.match(ownerDeclaredFnBody, /businessWorthSnapshots\.filter\(\(s\) => s\.status === 'active'\)/);
    assert.match(ownerDeclaredFnBody, /const activeBaselineConfirmedAtMillis = previousActiveSnapshot\s*\?\s*\(previousActiveSnapshot\.confirmedAt as unknown as \{ toMillis\?: \(\) => number \}\)\?\.toMillis\?\.\(\) \?\? null\s*:\s*null;/);
  });

  it('every OTHER FR-69-omitted field remains genuinely absent from the write object (regression) — this object is still built via a precise field list, never a spread of a larger object', () => {
    const objStart = ownerDeclaredFnBody.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot');
    const objEnd = ownerDeclaredFnBody.indexOf('};', objStart);
    const objBody = ownerDeclaredFnBody.slice(objStart, objEnd);
    for (const field of [
      'sourceStockCountId',
      'productValuationTotal',
      'productValuationDetail',
      'embeddedProfitTotal',
      'embeddedProfitDetail',
      'cashPosition',
      'receivablesPosition',
      'payablesPosition',
      'expensesSinceLastSnapshot',
      'breakagesSinceLastSnapshot',
      'levantamentosSinceLastSnapshot',
    ]) {
      assert.doesNotMatch(objBody, new RegExp(`\\b${field}\\b`), `${field} must remain genuinely absent from the Owner-Declared write object — FR-69 still applies to it.`);
    }
  });

  it('still establishmentMethod: owner-declared, still no sourceStockCountId, still status: active — nothing else about this write path changed', () => {
    const objStart = ownerDeclaredFnBody.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot');
    const objEnd = ownerDeclaredFnBody.indexOf('};', objStart);
    const objBody = ownerDeclaredFnBody.slice(objStart, objEnd);
    assert.match(objBody, /establishmentMethod: 'owner-declared',/);
    assert.match(objBody, /status: 'active',/);
  });
});

describe('firestore.rules — Owner-Declared branch no longer rejects ownerInvestmentSinceLastSnapshot, but still rejects every other FR-69-omitted field (regression)', () => {
  const ownerDeclaredBranchStart = rulesSrc.indexOf("establishmentMethod', null) == 'owner-declared'");
  const ownerDeclaredBranchEnd = rulesSrc.indexOf('\n            (', ownerDeclaredBranchStart);
  const ownerDeclaredBranchBody = rulesSrc.slice(ownerDeclaredBranchStart, ownerDeclaredBranchEnd);

  it('does not reject a write containing ownerInvestmentSinceLastSnapshot', () => {
    assert.doesNotMatch(ownerDeclaredBranchBody, /ownerInvestmentSinceLastSnapshot/, 'The Owner-Declared branch must no longer name this field in its absence checks.');
  });

  it('still rejects every other FR-69-omitted field — regression, only the one line was removed', () => {
    for (const field of [
      'sourceStockCountId',
      'productValuationTotal',
      'productValuationDetail',
      'embeddedProfitTotal',
      'embeddedProfitDetail',
      'cashPosition',
      'receivablesPosition',
      'payablesPosition',
      'expensesSinceLastSnapshot',
      'breakagesSinceLastSnapshot',
      'levantamentosSinceLastSnapshot',
    ]) {
      assert.match(ownerDeclaredBranchBody, new RegExp(`!\\('${field}' in request\\.resource\\.data\\)`), `The Owner-Declared branch must still require ${field} to be absent.`);
    }
  });

  it('the Contagem branch (first disjunct) remains unconstrained on ownerInvestmentSinceLastSnapshot — unchanged, matching Checkpoint 3\'s own established finding', () => {
    const contagemBranchStart = rulesSrc.indexOf('match /businessWorthSnapshots/{snapshotId} {');
    const contagemBranchEnd = rulesSrc.indexOf("establishmentMethod', null) == 'owner-declared'", contagemBranchStart);
    const contagemBranchBody = rulesSrc.slice(contagemBranchStart, contagemBranchEnd);
    assert.doesNotMatch(contagemBranchBody, /ownerInvestmentSinceLastSnapshot/, 'The Contagem branch must remain unconstrained on this field, exactly as Checkpoint 3 found it.');
  });

  it('the businessWorthSnapshots update rule (immutability) is completely unchanged — still status-only', () => {
    const updateStart = rulesSrc.indexOf('allow update:', rulesSrc.indexOf('match /businessWorthSnapshots/{snapshotId} {'));
    const updateEnd = rulesSrc.indexOf(');', updateStart) + 2;
    const updateBlock = rulesSrc.slice(updateStart, updateEnd);
    assert.match(updateBlock, /affectedKeys\(\)\.hasOnly\(\['status'\]\)/);
  });
});

describe('computeOwnerInvestmentsSinceSnapshot — reused, unmodified, exercised once more with an Owner-Declared-shaped scenario', () => {
  it('a post-baseline Owner Investment is included identically regardless of which establishment method produced the baseline snapshot (the function itself has no establishmentMethod parameter at all — it cannot distinguish, by design)', () => {
    const start = readFileSync(new URL('../apps/tenant/src/utils/calculations.ts', import.meta.url), 'utf-8').indexOf('export function computeOwnerInvestmentsSinceSnapshot(');
    const end = readFileSync(new URL('../apps/tenant/src/utils/calculations.ts', import.meta.url), 'utf-8').indexOf('): number {', start);
    const signature = readFileSync(new URL('../apps/tenant/src/utils/calculations.ts', import.meta.url), 'utf-8').slice(start, end);
    assert.doesNotMatch(signature, /establishmentMethod/i, 'The shared helper must have no establishmentMethod parameter — it is structurally incapable of treating the two establishment methods differently.');
  });

  it('behavioral sanity: 100,000 post-baseline OwnerInvestment against an arbitrary confirmedAt baseline (standing in for either an Owner-Declared or Contagem-established snapshot) yields 100,000', () => {
    const baselineMs = new Date('2026-09-10T10:00:00.000Z').getTime();
    const asOfMs = new Date('2026-09-11T00:00:00.000Z').getTime();
    const ownerInvestments = [
      { id: 'oi-1', businessId: 'biz1', amount: 100000, date: '2026-09-10', createdAt: '2026-09-10T11:00:00.000Z', createdBy: 'uid-owner' },
    ];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, baselineMs, asOfMs), 100000);
  });

  it('no-baseline case (a business\'s first-ever snapshot, of either establishment method) still yields a governed 0, never a fabricated fallback', () => {
    const ownerInvestments = [
      { id: 'oi-1', businessId: 'biz1', amount: 100000, date: '2026-09-01', createdAt: '2026-09-01T00:00:00.000Z', createdBy: 'uid-owner' },
    ];
    assert.equal(computeOwnerInvestmentsSinceSnapshot(ownerInvestments, null, Date.now()), 0);
  });
});

describe('Governance consistency — Specification, Rule 8, and Plan all agree, per the prior governance-recording task', () => {
  it('Specification §42.3\'s omission list no longer names ownerInvestmentSinceLastSnapshot', () => {
    const listStart = specSrc.indexOf('are all **omitted entirely**');
    assert.notEqual(listStart, -1);
    const listLineStart = specSrc.lastIndexOf('\n- `productValuationTotal`', listStart);
    const listLine = specSrc.slice(listLineStart, listStart + 40);
    assert.doesNotMatch(listLine, /ownerInvestmentSinceLastSnapshot/);
  });

  it('Specification has a §42.10 correction record and a §42.11 acceptance', () => {
    assert.match(specSrc, /### 42\.10 Owner Investment Drill-Down Field/);
    assert.match(specSrc, /### 42\.11 Product Architect Acceptance — §42\.10 Correction/);
  });

  it('Rule 8 Finding OI-6 has its correction addendum, substantive verdict unchanged', () => {
    assert.match(rule8Src, /Correction addendum \(12 September 2026, per Specification §42\.10\)/);
  });

  it('Implementation Plan records OI-PA-12/OI-PA-13 as the authorization for exactly this implementation checkpoint', () => {
    assert.match(planSrc, /### OI-PA-12 — FR-65 Implementation Requirement \(Owner-Declared Path\)/);
    assert.match(planSrc, /### OI-PA-13 — Firestore Rules Must Eventually Align/);
  });
});
