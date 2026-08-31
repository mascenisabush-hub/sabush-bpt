// Capital Inicial Retirement — Implementation Authorization, Increment 7
// ("Reports Terminology Correction"), as corrected by Amendment 2
// ("Increment 7 Establishment-State Signal").
//
// SCOPE: proves, by source inspection — this repository's established
// technique for React-component coverage where no jsdom/testing-library
// harness exists (see tests/owner-portfolio-currentworth.test.ts's own
// header) — that all three authorized surfaces (DashboardView.tsx's
// Business Worth modal, CapitalGrowthReport.tsx, BusinessWorthReport.tsx)
// select the Estimated/Current Business Worth label using
// `hasActiveBusinessWorthSnapshot` (derived from `businessWorthSnapshots`,
// the exact one-line formula DashboardView.tsx already used before this
// increment), never `hasInitialStockCount`.
//
// Directly verifies:
//   - AC-R3-7-amend-1: a business with no historical Capital Inicial
//     (hasInitialStockCount === false) but an active BusinessWorthSnapshot
//     (hasActiveBusinessWorthSnapshot === true) gets the Current label,
//     never Estimated, on all three surfaces.
//   - AC-R3-7-amend-2: the businessWorth figure itself is untouched by
//     this increment — every label-selection site still renders the same,
//     unmodified `businessWorth` value.
//   - Amendment 2's absolute boundary: no file reads
//     currentBusinessWorth/estimatedBusinessWorth to choose the displayed
//     *value*, and no financial calculation is touched.
//
// HOW TO RUN:
//   npx tsx --test tests/increment-7-report-terminology.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const dashboardSrc = readFileSync(new URL('../apps/tenant/src/components/DashboardView.tsx', import.meta.url), 'utf-8');
const capitalGrowthSrc = readFileSync(new URL('../apps/tenant/src/components/reports/CapitalGrowthReport.tsx', import.meta.url), 'utf-8');
const businessWorthReportSrc = readFileSync(new URL('../apps/tenant/src/components/reports/BusinessWorthReport.tsx', import.meta.url), 'utf-8');
const enSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/en.ts', import.meta.url), 'utf-8');
const ptSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/pt.ts', import.meta.url), 'utf-8');
const frSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/fr.ts', import.meta.url), 'utf-8');

const HAS_ACTIVE_SNAPSHOT_DERIVATION = `businessWorthSnapshots.some((s) => s.status === 'active')`;

describe('DashboardView.tsx — Business Worth summary modal (Increment 7 item 1, unchanged by Amendment 2)', () => {
  it('already derives hasActiveBusinessWorthSnapshot from businessWorthSnapshots (the signal Amendment 2 names as the reference derivation)', () => {
    assert.ok(
      dashboardSrc.includes(`hasActiveBusinessWorthSnapshot = ${HAS_ACTIVE_SNAPSHOT_DERIVATION}`),
      'DashboardView.tsx must retain the exact hasActiveBusinessWorthSnapshot derivation Amendment 2 treats as the established reference.'
    );
  });

  it('selects the modal total label using displayedBusinessWorthIsEstimated, not hasInitialStockCount', () => {
    assert.match(
      dashboardSrc,
      /t\(displayedBusinessWorthIsEstimated \? 'dashboard\.worthModal\.totalLabelEstimated' : 'dashboard\.worthModal\.totalLabel'\)/
    );
  });

  it('derives displayedBusinessWorthIsEstimated from hasActiveBusinessWorthSnapshot, not hasInitialStockCount', () => {
    assert.match(
      dashboardSrc,
      /const displayedBusinessWorthIsEstimated = !hasActiveBusinessWorthSnapshot && displayedBusinessWorth !== 'UNKNOWN';/
    );
  });
});

describe('CapitalGrowthReport.tsx — label selection (Increment 7 item 2, mechanism per Amendment 2)', () => {
  it('destructures businessWorthSnapshots from useApp() (already-exported context data, no new query)', () => {
    assert.match(capitalGrowthSrc, /businessWorthSnapshots,?\s*\n\s*\} = useApp\(\);/);
  });

  it('derives hasActiveBusinessWorthSnapshot using the exact authorized one-line formula', () => {
    assert.ok(
      capitalGrowthSrc.includes(`const hasActiveBusinessWorthSnapshot = ${HAS_ACTIVE_SNAPSHOT_DERIVATION}`),
      'Must use the identical one-line derivation Amendment 2 authorizes — not a variant.'
    );
  });

  it('AC-R3-7-amend-1: on-screen KPI card label reads hasActiveBusinessWorthSnapshot, never hasInitialStockCount', () => {
    assert.match(
      capitalGrowthSrc,
      /label=\{t\(hasActiveBusinessWorthSnapshot \? 'reports\.capitalGrowth\.kpiCurrentCapital' : 'reports\.capitalGrowth\.kpiCurrentCapitalEstimated'\)\}/
    );
  });

  it('AC-R3-7-amend-1: PDF export label reads hasActiveBusinessWorthSnapshot, never hasInitialStockCount', () => {
    assert.match(
      capitalGrowthSrc,
      /label: t\(hasActiveBusinessWorthSnapshot \? 'reports\.capitalGrowth\.kpiCurrentCapitalFull' : 'reports\.capitalGrowth\.kpiCurrentCapitalFullEstimated'\)/
    );
  });

  it('AC-R3-7-amend-1: Excel export label reads hasActiveBusinessWorthSnapshot, never hasInitialStockCount', () => {
    assert.match(
      capitalGrowthSrc,
      /label: t\(hasActiveBusinessWorthSnapshot \? 'reports\.capitalGrowth\.kpiCurrentCapital' : 'reports\.capitalGrowth\.kpiCurrentCapitalEstimated'\)/
    );
  });

  it('AC-R3-7-amend-2: all three label sites still render the unmodified businessWorth value', () => {
    const valueOccurrences = capitalGrowthSrc.match(/value: formatCurrency\(businessWorth, currencySymbol\)/g) || [];
    const kpiCardValueOccurrences = capitalGrowthSrc.match(/value=\{formatCurrency\(businessWorth, currencySymbol\)\}/g) || [];
    assert.equal(valueOccurrences.length, 2, 'Expected the PDF and Excel export rows to both still use businessWorth, unmodified.');
    assert.equal(kpiCardValueOccurrences.length, 1, 'Expected the on-screen KPI card to still use businessWorth, unmodified.');
  });

  it('never reads currentBusinessWorth or estimatedBusinessWorth to select the displayed value (Amendment 2 absolute boundary)', () => {
    assert.doesNotMatch(capitalGrowthSrc, /currentBusinessWorth/);
    assert.doesNotMatch(capitalGrowthSrc, /estimatedBusinessWorth/);
  });

  it('does not introduce any new Firestore query or read', () => {
    assert.doesNotMatch(capitalGrowthSrc, /getDocs|onSnapshot|collection\(db,/);
  });
});

describe('BusinessWorthReport.tsx — label selection (Increment 7 item 3, mechanism per Amendment 2)', () => {
  it('destructures businessWorthSnapshots from useApp() (already-exported context data, no new query)', () => {
    assert.match(businessWorthReportSrc, /businessWorthSnapshots,?\s*\n\s*\} = useApp\(\);/);
  });

  it('derives hasActiveBusinessWorthSnapshot using the exact authorized one-line formula', () => {
    assert.ok(
      businessWorthReportSrc.includes(`const hasActiveBusinessWorthSnapshot = ${HAS_ACTIVE_SNAPSHOT_DERIVATION}`),
      'Must use the identical one-line derivation Amendment 2 authorizes — not a variant.'
    );
  });

  it('AC-R3-7-amend-1: hero label reads hasActiveBusinessWorthSnapshot, never hasInitialStockCount', () => {
    assert.match(
      businessWorthReportSrc,
      /\{t\(hasActiveBusinessWorthSnapshot \? 'businessWorth\.heroLabel' : 'businessWorth\.heroLabelEstimated'\)\}/
    );
  });

  it('AC-R3-7-amend-1: both PDF and Excel export labels read hasActiveBusinessWorthSnapshot, never hasInitialStockCount', () => {
    const occurrences = businessWorthReportSrc.match(
      /label: t\(hasActiveBusinessWorthSnapshot \? 'businessWorth\.kpiBusinessWorth' : 'businessWorth\.kpiBusinessWorthEstimated'\)/g
    ) || [];
    assert.equal(occurrences.length, 2, 'Expected both the PDF and Excel export rows to use the establishment-state signal.');
  });

  it('AC-R3-7-amend-2: hero figure and both export rows still render the unmodified businessWorth value', () => {
    assert.match(businessWorthReportSrc, /\{formatCurrency\(businessWorth, currencySymbol\)\}/, 'Hero figure must remain formatCurrency(businessWorth, ...).');
    const exportValueOccurrences = businessWorthReportSrc.match(/value: formatCurrency\(businessWorth, currencySymbol\)/g) || [];
    assert.equal(exportValueOccurrences.length, 2, 'Both PDF and Excel export rows must still use businessWorth, unmodified.');
  });

  it('never reads currentBusinessWorth or estimatedBusinessWorth to select the displayed value (Amendment 2 absolute boundary)', () => {
    assert.doesNotMatch(businessWorthReportSrc, /currentBusinessWorth/);
    assert.doesNotMatch(businessWorthReportSrc, /estimatedBusinessWorth/);
  });

  it('does not introduce any new Firestore query or read', () => {
    assert.doesNotMatch(businessWorthReportSrc, /getDocs|onSnapshot|collection\(db,/);
  });

  it('does not touch Case A/B arithmetic (capitalGrowth/capitalGrowthPct computation lives elsewhere, unreferenced by name here)', () => {
    assert.doesNotMatch(businessWorthReportSrc, /function (getCurrentBusinessWorth|getEstimatedBusinessWorth|computeMeasuredBusinessWorth)/);
  });
});

describe('Locale coverage — new Estimated-variant keys exist with the AC-R3-7-approved wording, in all three languages', () => {
  const cases: Array<{ name: string; src: string }> = [
    { name: 'en', src: enSrc },
    { name: 'pt', src: ptSrc },
    { name: 'fr', src: frSrc },
  ];

  for (const { name, src } of cases) {
    it(`${name}.ts defines businessWorth.kpiBusinessWorthEstimated and businessWorth.heroLabelEstimated`, () => {
      assert.match(src, /kpiBusinessWorthEstimated:\s*['"]/);
      assert.match(src, /heroLabelEstimated:\s*['"]/);
    });

    it(`${name}.ts defines reports.capitalGrowth.kpiCurrentCapitalEstimated and kpiCurrentCapitalFullEstimated`, () => {
      assert.match(src, /kpiCurrentCapitalEstimated:\s*['"]/);
      assert.match(src, /kpiCurrentCapitalFullEstimated:\s*['"]/);
    });
  }

  it('pt.ts and fr.ts each declare the new keys in the TranslationDict interface (type-level parity)', () => {
    assert.match(ptSrc, /kpiBusinessWorthEstimated:\s*string;/);
    assert.match(ptSrc, /heroLabelEstimated:\s*string;/);
    assert.match(ptSrc, /kpiCurrentCapitalEstimated:\s*string;/);
    assert.match(ptSrc, /kpiCurrentCapitalFullEstimated:\s*string;/);
  });
});
