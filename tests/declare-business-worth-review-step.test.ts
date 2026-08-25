// [Manual data-entry error investigation, Finding 1 — Owner-requested]
// DeclareBusinessWorthView.tsx was, before this fix, a single-click
// form with no review step and no comparison to the business's own
// current Business Worth ever shown — the single most exposed,
// highest-leverage manual entry point in the whole system, since one
// typed number directly and permanently becomes the new authoritative
// Business Worth. This suite covers the new two-step review flow and
// its deviation-warning logic.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/periodic-stock-existing-product-summary.test.ts's
// own header). This suite follows the same two established techniques:
// (1) a small local reimplementation of the component's own deviation-
// percentage/warning-threshold logic, exercised against fixture inputs,
// and (2) structural source-text assertions confirming the review step,
// the current-value display, and the deviation warning are actually
// wired into the real component.
//
// HOW TO RUN:
//   npx tsx --test tests/declare-business-worth-review-step.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const declareSrc = src('apps/tenant/src/components/DeclareBusinessWorthView.tsx');

const DEVIATION_WARNING_THRESHOLD = 0.3;

/** Mirrors the component's own deviationPercent/showDeviationWarning
 * derivation exactly — duplicated here only as a small test fixture,
 * matching this repo's own established pattern for this exact class of
 * problem (no DOM harness available). */
function deviationCheck(reviewingAmount: number, currentValue: number | null) {
  const deviationPercent =
    currentValue !== null && currentValue > 0
      ? Math.abs(reviewingAmount - currentValue) / currentValue
      : null;
  const showDeviationWarning = deviationPercent !== null && deviationPercent >= DEVIATION_WARNING_THRESHOLD;
  const isAboveCurrentValue = currentValue !== null && reviewingAmount > currentValue;
  return { deviationPercent, showDeviationWarning, isAboveCurrentValue };
}

describe('Deviation-warning logic — the classic "extra/missing zero" typo this finding addresses', () => {
  it('a 10x typo (extra zero) triggers the warning, well above the 30% threshold', () => {
    const result = deviationCheck(5_000_000, 500_000);
    assert.equal(result.showDeviationWarning, true);
    assert.equal(result.isAboveCurrentValue, true);
    assert.ok(result.deviationPercent! >= 9); // 900% deviation
  });

  it('a 10x typo the OTHER direction (missing zero) also triggers the warning', () => {
    const result = deviationCheck(50_000, 500_000);
    assert.equal(result.showDeviationWarning, true);
    assert.equal(result.isAboveCurrentValue, false);
  });

  it('an ordinary, modest change (10%) does NOT trigger the warning — this is "warn," not "nag on every use"', () => {
    const result = deviationCheck(550_000, 500_000);
    assert.equal(result.showDeviationWarning, false);
  });

  it('exactly at the 30% threshold triggers the warning (>=, not >)', () => {
    const result = deviationCheck(650_000, 500_000);
    assert.equal(result.deviationPercent, 0.3);
    assert.equal(result.showDeviationWarning, true);
  });

  it('just under the 30% threshold does not trigger it', () => {
    const result = deviationCheck(649_999, 500_000);
    assert.ok(result.deviationPercent! < 0.3);
    assert.equal(result.showDeviationWarning, false);
  });

  it('an identical value shows no warning and no direction', () => {
    const result = deviationCheck(500_000, 500_000);
    assert.equal(result.deviationPercent, 0);
    assert.equal(result.showDeviationWarning, false);
    assert.equal(result.isAboveCurrentValue, false);
  });

  it('a genuinely unknown current value (null — first-ever declaration) never triggers a warning, and never divides by zero', () => {
    const result = deviationCheck(500_000, null);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showDeviationWarning, false);
  });

  it('a current value of exactly 0 never triggers a warning (would be a divide-by-zero) — same "no comparison possible" treatment as null', () => {
    const result = deviationCheck(500_000, 0);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showDeviationWarning, false);
  });
});

describe('DeclareBusinessWorthView.tsx — the review step is actually wired in (source-structure checks)', () => {
  it('the current Business Worth is derived using the SAME hasActiveBusinessWorthSnapshot/displayedBusinessWorth logic DashboardView.tsx already uses — never a second, independently-invented notion of "current"', () => {
    assert.match(declareSrc, /const hasActiveBusinessWorthSnapshot = businessWorthSnapshots\.some\(\(s\) => s\.status === 'active'\);/);
    assert.match(declareSrc, /const displayedBusinessWorth = hasActiveBusinessWorthSnapshot \? currentBusinessWorth : estimatedBusinessWorth;/);
  });

  it('the current value is shown on the FORM itself (before review), not only at review time', () => {
    const start = declareSrc.indexOf("form onSubmit={handleRequestReview}");
    const end = declareSrc.indexOf('</form>', start);
    const formBody = declareSrc.slice(start, end);
    assert.match(formBody, /t\('declareWorth\.currentValueLabel'\)/);
    assert.match(formBody, /currentValue !== null &&/);
  });

  it('handleRequestReview validates and sets reviewingAmount — it never calls recordOwnerDeclaredBusinessWorth directly (no write happens on step 1\'s own submit)', () => {
    const start = declareSrc.indexOf('const handleRequestReview = (e: React.FormEvent) => {');
    const end = declareSrc.indexOf('\n  };', start);
    const body = declareSrc.slice(start, end);
    assert.match(body, /setReviewingAmount\(numAmount\);/);
    assert.doesNotMatch(body, /recordOwnerDeclaredBusinessWorth/);
  });

  it('handleConfirm — the review step\'s own second, explicit action — is the only place recordOwnerDeclaredBusinessWorth is actually called', () => {
    const callCount = (declareSrc.match(/recordOwnerDeclaredBusinessWorth\(\{/g) || []).length;
    assert.equal(callCount, 1);
    const start = declareSrc.indexOf('const handleConfirm = async () => {');
    const end = declareSrc.indexOf('\n  };', start);
    const body = declareSrc.slice(start, end);
    assert.match(body, /recordOwnerDeclaredBusinessWorth\(\{/);
    assert.match(body, /declaredAmount: reviewingAmount,/);
  });

  it('the review step renders the entered amount, the current value, and the difference — all three, not merely the amount', () => {
    assert.match(declareSrc, /t\('declareWorth\.reviewAmountLabel'\)/);
    assert.match(declareSrc, /t\('declareWorth\.reviewCurrentLabel'\)/);
    assert.match(declareSrc, /t\('declareWorth\.reviewDifferenceLabel'\)/);
  });

  it('"Voltar e Corrigir" resets reviewingAmount to null — re-editing always requires a fresh review, never confirms a stale figure', () => {
    assert.match(declareSrc, /onClick=\{\(\) => setReviewingAmount\(null\)\}/);
  });

  it('the deviation warning uses "warn, never block" — it renders as an informational note, not a disabled/gated confirm button', () => {
    const start = declareSrc.indexOf('{showDeviationWarning &&');
    const end = declareSrc.indexOf('\n            )}', start);
    const warningBlock = declareSrc.slice(start, end);
    assert.doesNotMatch(warningBlock, /disabled=/);
    const confirmButtonStart = declareSrc.indexOf('onClick={handleConfirm}');
    const confirmButtonBlock = declareSrc.slice(confirmButtonStart, confirmButtonStart + 200);
    assert.match(confirmButtonBlock, /disabled=\{isSaving\}/);
    assert.doesNotMatch(confirmButtonBlock, /disabled=\{isSaving \|\| showDeviationWarning/);
  });

  it('DEVIATION_WARNING_THRESHOLD is defined once, at 0.3, matching this test file\'s own fixture value', () => {
    assert.match(declareSrc, /const DEVIATION_WARNING_THRESHOLD = 0\.3;/);
  });
});
