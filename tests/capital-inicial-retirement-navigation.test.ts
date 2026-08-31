// [Capital Inicial Retirement — Implementation Authorization, Increment
// 4] Source-inspection tests proving the three confirmed creation-entry
// points into Capital Inicial are removed from normal navigation.
//
// Governing chain:
// docs/engineering/capital-inicial-retirement-implementation-authorization.md
// (Signed, SABUSHIMIKE MASCENI, 31 August 2026), §5 Increment 4.
//
// Same established technique as
// tests/business-worth-estimated-and-dashboard.test.ts's own
// "DashboardView.tsx — Increment 2 wiring (source-inspection)" suite:
// this repo has no React test renderer configured, so component
// behavior is verified by regex/structural inspection of the actual
// source text, not a rendered DOM.
//
// HOW TO RUN:
//   npx tsx --test tests/capital-inicial-retirement-navigation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const dashboardSrc = readFileSync(new URL('../apps/tenant/src/components/DashboardView.tsx', import.meta.url), 'utf-8');
const appSrc = readFileSync(new URL('../apps/tenant/src/App.tsx', import.meta.url), 'utf-8');

describe('DashboardView.tsx — primary KPI card no longer routes to Capital Inicial creation (AC-8)', () => {
  function primaryKpiCardBlock(): string {
    // The primary Business Worth KPI card is the first <KpiCard in the
    // PRIMARY KPI GRID — isolate its own onClick prop, not any other
    // card's, by slicing from the grid comment to the next KpiCard.
    const gridStart = dashboardSrc.indexOf('PRIMARY KPI GRID');
    assert.ok(gridStart >= 0, 'expected the PRIMARY KPI GRID section to exist');
    const rest = dashboardSrc.slice(gridStart);
    const firstCardStart = rest.indexOf('<KpiCard');
    const afterFirstCard = rest.slice(firstCardStart);
    const secondCardOffset = afterFirstCard.slice(1).search(/<KpiCard\b/);
    return secondCardOffset === -1 ? afterFirstCard : afterFirstCard.slice(0, secondCardOffset + 1);
  }

  it('the null-state onClick no longer calls onNavigateToInitialStockCount directly', () => {
    const block = primaryKpiCardBlock();
    const onClickMatch = block.match(/onClick=\{[^}]*\}/);
    assert.ok(onClickMatch, 'expected an onClick prop on the primary KPI card');
    assert.doesNotMatch(
      onClickMatch![0],
      /displayedBusinessWorthValue === null \? onNavigateToInitialStockCount/,
      'the null-state click must no longer navigate straight into Capital Inicial creation'
    );
  });

  it('the null-state onClick opens the establishment chooser instead', () => {
    const block = primaryKpiCardBlock();
    const onClickMatch = block.match(/onClick=\{[^}]*\}/);
    assert.ok(onClickMatch);
    assert.match(onClickMatch![0], /displayedBusinessWorthValue === null \? \(\) => setShowEstablishWorthChooser\(true\)/);
  });
});

describe('DashboardView.tsx — establishment chooser (Increment 4)', () => {
  it('exists, gated on its own dedicated state', () => {
    assert.match(dashboardSrc, /showEstablishWorthChooser/);
    assert.match(dashboardSrc, /\{showEstablishWorthChooser && \(/);
  });

  it('offers exactly the two authorized destinations — stock-count and declare-worth — never initial-stock', () => {
    const chooserStart = dashboardSrc.indexOf('{showEstablishWorthChooser && (');
    assert.ok(chooserStart >= 0);
    const chooserEnd = dashboardSrc.indexOf('\n      )}', chooserStart);
    const chooserBlock = dashboardSrc.slice(chooserStart, chooserEnd === -1 ? undefined : chooserEnd);

    assert.match(chooserBlock, /onNavigateToInitialStockCount\('stock-count'\)/);
    assert.match(chooserBlock, /onNavigateToInitialStockCount\('declare-worth'\)/);
    assert.doesNotMatch(chooserBlock, /onNavigateToInitialStockCount\('initial-stock'\)/, 'the chooser must never offer a route back into Capital Inicial creation');
    assert.doesNotMatch(chooserBlock, /onNavigateToInitialStockCount\(\)\s*;/, 'every call inside the chooser must pass an explicit destination, never the create-Capital-Inicial default');
  });
});

describe('DashboardView.tsx — Business Worth Modal Capital Inicial row (Increment 4)', () => {
  it('the row is gated on hasInitialStockCount — it does not render for a business with no historical record', () => {
    const rowLabelIndex = dashboardSrc.indexOf("t('dashboard.worthModal.initialCapital')");
    assert.ok(rowLabelIndex >= 0, 'expected the Capital Inicial row label to still exist for businesses that DO have a historical record');
    const before = dashboardSrc.slice(Math.max(0, rowLabelIndex - 800), rowLabelIndex);
    assert.match(before, /\{hasInitialStockCount && \(/, 'expected the row to be wrapped in a hasInitialStockCount && ( ... ) guard');
  });

  it('no longer offers onNavigateToInitialStockCount as a fallback for a business with no historical record', () => {
    const rowLabelIndex = dashboardSrc.indexOf("t('dashboard.worthModal.initialCapital')");
    const before = dashboardSrc.slice(Math.max(0, rowLabelIndex - 800), rowLabelIndex);
    assert.doesNotMatch(before, /onNavigateToInitialStockCount\(\)/, 'the row\'s own onClick must no longer call onNavigateToInitialStockCount at all — it always opens the valuation modal now, since it only renders when a historical record exists');
  });
});

describe('App.tsx — handleNavigateToInitialStockCount (Increment 4)', () => {
  it('accepts a destination parameter instead of unconditionally navigating to initial-stock', () => {
    assert.match(appSrc, /const handleNavigateToInitialStockCount = \(destination: '[^']+' \| '[^']+' \| '[^']+' = 'initial-stock'\) => \{/);
  });

  it('still defaults to initial-stock — preserving the still-authorized historical-review entry point (InitialStockPriceChangeModal.tsx\'s "Rever ecrã de Capital Inicial")', () => {
    const start = appSrc.indexOf('const handleNavigateToInitialStockCount = (');
    assert.ok(start >= 0);
    const fnBody = appSrc.slice(start, appSrc.indexOf('};', start) + 2);
    assert.match(fnBody, /= 'initial-stock'\)/);
    assert.match(fnBody, /setActiveTab\(destination\)/);
  });
});
