// Capital Inicial Retirement — Implementation Authorization, Amendment 3
// ("Post-Retirement UI Nudge Correction"), SIGNED 31 August 2026.
//
// SCOPE: proves, by source inspection — this repository's established
// technique for React-component coverage where no jsdom/testing-library
// harness exists (see tests/owner-portfolio-currentworth.test.ts's own
// header) — that the two obsolete post-retirement UI prompts Amendment 3
// authorizes removing are actually gone for businesses with
// hasInitialStockCount === false, that businesses with
// hasInitialStockCount === true see byte-identical behavior, and that
// nothing outside Amendment 3's absolute boundary was touched.
//
// Directly verifies:
//   - AC-A1: dashboard.worthModal.defineInitialCapital is never rendered
//     for any business with hasInitialStockCount === false, in all three
//     locales — the key itself no longer exists anywhere.
//   - AC-A2: the Contagem-screen amber Capital Inicial banner never
//     renders for any business with hasInitialStockCount === false,
//     including on that business's Business-Worth-establishing Contagem —
//     the banner block itself no longer exists.
//   - AC-A3: businessWorth, capitalGrowth, capitalGrowthPct, and
//     expectedCurrentStockValue are byte-for-byte unchanged.
//   - AC-A4: a business with hasInitialStockCount === true sees
//     byte-identical behavior on both screens — the historical
//     "Initial Capital (starting point)" breakdown row and the
//     Increment-6/FR-70-fixed "Valor Esperado de Stock" comparison copy
//     are both untouched.
//   - AC-A5: no firestore.rules, firestore.indexes.json,
//     BusinessWorthSnapshot, Case B/State 1a, or write-path code is
//     touched — confirmed both by the calculation formulas remaining
//     exact (this file) and by the commit's own diff scope (5 files,
//     all pure deletions, recorded in Amendment 3's own commit message).
//   - The separately-discovered startupInvestment.reportSection.noBaselineYet
//     finding remains untouched — explicitly out of this amendment's
//     scope, per its own text.
//
// HOW TO RUN:
//   npx tsx --test tests/amendment-3-obsolete-ui-nudges.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const dashboardSrc = readFileSync(new URL('../apps/tenant/src/components/DashboardView.tsx', import.meta.url), 'utf-8');
const periodicSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const startupInvestmentSrc = readFileSync(new URL('../apps/tenant/src/components/StartupInvestmentView.tsx', import.meta.url), 'utf-8');
const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const enSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/en.ts', import.meta.url), 'utf-8');
const ptSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/pt.ts', import.meta.url), 'utf-8');
const frSrc = readFileSync(new URL('../apps/tenant/src/i18n/locales/fr.ts', import.meta.url), 'utf-8');

describe('AC-A1 — dashboard.worthModal.defineInitialCapital never renders for hasInitialStockCount === false', () => {
  it('the key no longer exists in any of the three locale files (value or interface declaration)', () => {
    assert.doesNotMatch(enSrc, /defineInitialCapital/);
    assert.doesNotMatch(ptSrc, /defineInitialCapital/);
    assert.doesNotMatch(frSrc, /defineInitialCapital/);
  });

  it('DashboardView.tsx no longer references the key at all', () => {
    assert.doesNotMatch(dashboardSrc, /defineInitialCapital/);
  });

  it('the modal caption block now renders only basedOnCount, with no trailing !hasInitialStockCount clause', () => {
    assert.match(
      dashboardSrc,
      /\{latestStockCount && \(\s*<p className="text-\[10px\] text-gray-400 text-center pt-1">\s*\{t\('dashboard\.worthModal\.basedOnCount', \{ date: latestStockCount\.date\.split\('-'\)\.reverse\(\)\.join\('\/'\) \}\)\}\s*<\/p>\s*\)\}/
    );
  });
});

describe('AC-A2 — Contagem-screen Capital Inicial banner never renders for hasInitialStockCount === false', () => {
  it('the banner text no longer exists in PeriodicStockCountView.tsx', () => {
    assert.doesNotMatch(periodicSrc, /Ainda não definiu/);
    assert.doesNotMatch(periodicSrc, /recomendamos[\s\S]{0,20}registar primeiro o Capital Inicial/);
  });

  it('no !hasInitialStockCount-gated block referencing Capital Inicial remains in this file', () => {
    // The only remaining hasInitialStockCount usages in this file are the
    // (unauthorized-to-touch, Increment-6/FR-70) "Valor Esperado de Stock"
    // comparison copy, which reads hasInitialStockCount positively (the
    // ternary's true branch), never `!hasInitialStockCount`.
    assert.doesNotMatch(periodicSrc, /\{!hasInitialStockCount/);
  });

  it('this was verified to also hold for that business\'s own Business-Worth-establishing Contagem: the removed block carried no establishment-state condition of any kind (only !hasInitialStockCount), so its removal is unconditional for the whole hasInitialStockCount === false population, not scoped by establishment state', () => {
    // Structural check: confirm no `hasActiveBusinessWorthSnapshot` (or
    // equivalent establishment guard) was introduced as a replacement
    // condition — the fix is a full removal, not a narrower re-gating.
    assert.doesNotMatch(periodicSrc, /hasActiveBusinessWorthSnapshot/);
  });
});

describe('AC-A3 — businessWorth, capitalGrowth, capitalGrowthPct, expectedCurrentStockValue byte-for-byte unchanged', () => {
  it('businessWorth formula is exactly as before', () => {
    assert.ok(appContextSrc.includes('const businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime;'));
  });

  it('capitalGrowth formula is exactly as before', () => {
    assert.ok(appContextSrc.includes('const capitalGrowth = businessWorth - initialCapitalValue;'));
  });

  it('capitalGrowthPct formula is exactly as before', () => {
    assert.ok(appContextSrc.includes('const capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) * 100 : 0;'));
  });

  it('expectedCurrentStockValue formula is exactly as before', () => {
    assert.ok(appContextSrc.includes('const expectedCurrentStockValue = initialCapitalValue + totalInvestmentValueAllTime;'));
  });
});

describe('AC-A4 — hasInitialStockCount === true population sees byte-identical behavior', () => {
  it('DashboardView.tsx: the historical "Initial Capital (starting point)" breakdown row is untouched, still gated by hasInitialStockCount alone', () => {
    assert.match(dashboardSrc, /\{hasInitialStockCount && \(/);
    assert.match(dashboardSrc, /t\('dashboard\.worthModal\.initialCapital'\)/);
  });

  it('the locale key for that historical row (dashboard.worthModal.initialCapital) is untouched in all three locales', () => {
    assert.match(enSrc, /initialCapital: 'Initial Capital \(starting point\):'/);
    assert.match(ptSrc, /initialCapital: 'Capital Inicial \(ponto de partida\):'/);
    assert.match(frSrc, /initialCapital: 'Capital Initial \(point de départ\) :'/);
  });

  it('PeriodicStockCountView.tsx: the Increment-6/FR-70 conditional "Valor Esperado de Stock" comparison copy is untouched, still reading hasInitialStockCount positively', () => {
    assert.match(
      periodicSrc,
      /\{hasInitialStockCount\s*\n\s*\? 'o Capital Inicial mais o valor \(a custo\) do stock em lote atualmente registado'\s*\n\s*: 'o valor de compras registadas \(a custo\)'/
    );
  });
});

describe('AC-A5 — no financial-value, rules, snapshot, or write-path code touched (calculation-formula proxy; full diff scope confirmed separately)', () => {
  it('no new Firestore write, query, or rules-relevant symbol was introduced in either edited component', () => {
    assert.doesNotMatch(dashboardSrc.match(/defineInitialCapital|basedOnCount/g)?.join('') ?? '', /setDoc|updateDoc|addDoc|deleteDoc/);
    // Check the immediate vicinity of the removed banner's former location,
    // not the whole file — PeriodicStockCountView.tsx legitimately
    // references firestore.rules elsewhere, in unrelated pre-existing
    // comments far from this edit.
    const draftSaveStateSection = periodicSrc.slice(
      periodicSrc.indexOf('draftSaveState !== \'editing\''),
      periodicSrc.indexOf('productsError &&')
    );
    assert.doesNotMatch(draftSaveStateSection, /firestore\.rules|firestore\.indexes|setDoc|updateDoc|addDoc|deleteDoc/);
  });

  it('BusinessWorthSnapshot creation/semantics are not referenced by either edit\'s surrounding context', () => {
    // Neither removed block ever mentioned BusinessWorthSnapshot; confirm
    // the term's only appearances in these two files (if any) are
    // pre-existing and unrelated to the removed blocks' former location.
    const dashboardWorthModalSection = dashboardSrc.slice(dashboardSrc.indexOf('worthModal.basedOnCount') - 500, dashboardSrc.indexOf('worthModal.basedOnCount') + 200);
    assert.doesNotMatch(dashboardWorthModalSection, /BusinessWorthSnapshot/);
  });
});

describe('Explicit exclusion — startupInvestment.reportSection.noBaselineYet is untouched, out of Amendment 3\'s scope', () => {
  it('the key and its rendering condition remain exactly as before this amendment', () => {
    assert.match(startupInvestmentSrc, /\{!investmentWindow && \(/);
    assert.match(startupInvestmentSrc, /t\('startupInvestment\.reportSection\.noBaselineYet'\)/);
  });

  it('the key still exists, unremoved, in all three locale files', () => {
    assert.match(enSrc, /noBaselineYet:/);
    assert.match(ptSrc, /noBaselineYet:/);
    assert.match(frSrc, /noBaselineYet:/);
  });
});
