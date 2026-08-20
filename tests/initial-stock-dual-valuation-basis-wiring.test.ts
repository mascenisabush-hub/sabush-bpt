// Initial Stock Dual-Valuation-Basis — Implementation Authorization,
// §2 items 2-7. Source-level regression guards (this repository has no
// React/DOM test harness — see stock-count-simplification.test.ts's
// own established precedent for this exact technique) proving:
//   - the basis choice is presented once, for the whole snapshot
//   - it survives the draft autosave/resurrection lifecycle
//   - it is never writable after confirmation (immutability)
//   - the Timeline finding (§5 of the Authorization) is actually fixed
//   - businessWorth's own formula text is unchanged
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-dual-valuation-basis-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const viewSource = readFileSync(
  new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url),
  'utf-8'
);
const contextSource = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const rulesSource = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');

describe('InitialStockCountView.tsx — basis presented once, whole-snapshot (Invariant I-1)', () => {
  it('has exactly one initialCapitalBasis state declaration — not per-row', () => {
    const matches = viewSource.match(/useState<InitialCapitalBasis>/g) ?? [];
    assert.equal(matches.length, 1, 'expected exactly one whole-snapshot basis state declaration');
  });

  it('CountRowItem (the per-row type) does not carry any basis field', () => {
    const rowTypeMatch = viewSource.match(/interface CountRowItem \{[\s\S]*?\n\}/);
    assert.ok(rowTypeMatch, 'expected to find CountRowItem interface');
    assert.doesNotMatch(rowTypeMatch![0], /initialCapitalBasis/);
  });

  it('renders the choice as two mutually-exclusive buttons (cost/selling), not a per-row control', () => {
    assert.match(viewSource, /setInitialCapitalBasis\('cost'\)/);
    assert.match(viewSource, /setInitialCapitalBasis\('selling'\)/);
  });
});

describe('InitialStockCountView.tsx — draft autosave/resurrection survival', () => {
  it('the business-switch reset effect resets initialCapitalBasis alongside rows/date', () => {
    const resetMatch = viewSource.match(/setLoadedForBusinessId\(activeBusinessId \?\? null\);[\s\S]*?setDraftLoaded\(false\);/);
    assert.ok(resetMatch, 'expected to find the business-switch reset block');
    assert.match(resetMatch![0], /setInitialCapitalBasis\('cost'\)/);
  });

  it('the draft-load effect restores initialCapitalBasis from the persisted draft', () => {
    assert.match(viewSource, /setInitialCapitalBasis\(initialStockDraft\.initialCapitalBasis \|\| 'cost'\)/);
  });

  it('the autosave call passes initialCapitalBasis to saveInitialStockDraft', () => {
    assert.match(viewSource, /saveInitialStockDraft\(rows\.map\(rowToDraftItem\), date, initialCapitalBasis\)/);
  });

  it('initialCapitalBasis is in the autosave effect\'s own dependency array, so a change to it triggers a save', () => {
    const depsMatch = viewSource.match(/\}, \[rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount\]\);/);
    assert.ok(depsMatch, 'expected initialCapitalBasis in the autosave effect dependency array');
  });
});

describe('InitialStockCountView.tsx — passed through to confirmation', () => {
  it('recordStockCount is called with initialCapitalBasis at final submit', () => {
    // [Void & Redo — Implementation Authorization §2 items 5-6] Widened
    // from the original single-line call to the multi-line shape this
    // feature introduced (adds a conditional redoesConfirmationId
    // spread) — the tested intent (initialCapitalBasis is passed
    // through) is unchanged; only the exact source formatting is.
    const callBlockMatch = viewSource.match(/await recordStockCount\(\{[\s\S]*?\}\);/);
    assert.ok(callBlockMatch, 'expected to find the recordStockCount call in handleSubmit');
    const callBlock = callBlockMatch![0];
    assert.match(callBlock, /type: 'initial',/);
    assert.match(callBlock, /date,/);
    assert.match(callBlock, /items: itemsToSave,/);
    assert.match(callBlock, /initialCapitalBasis,/);
  });

  it('recordStockCount is called with a conditional redoesConfirmationId spread (Void & Redo)', () => {
    assert.match(viewSource, /\.\.\.\(redoingConfirmationId \? \{ redoesConfirmationId: redoingConfirmationId \} : \{\}\)/);
  });
});

describe('AppContext.tsx — immutability enforced by the pre-existing, unconditional firestore.rules block (no rules change needed)', () => {
  it('recordStockCount only ever writes initialCapitalBasis for type === \'initial\', never for a periodic count', () => {
    assert.match(contextSource, /\.\.\.\(type === 'initial' && initialCapitalBasis \? \{ initialCapitalBasis \} : \{\}\)/);
  });

  it('firestore.rules still refuses update/delete for type == \'initial\' unconditionally — confirms new fields inherit this immutability for free', () => {
    assert.match(rulesSource, /allow update, delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });

  it('this feature introduced zero changes to firestore.rules (source-level proof, not just a claim)', () => {
    assert.doesNotMatch(rulesSource, /initialCapitalBasis/);
  });
});

describe('AppContext.tsx — the Timeline finding (Authorization §5) is actually fixed', () => {
  it('the Initial Stock confirmation Timeline event uses the RESOLVED value, not newCount.totalValue directly', () => {
    const timelineBlockMatch = contextSource.match(/if \(type === 'initial'\) \{[\s\S]*?await logTimelineEvent\(\{[\s\S]*?\}\);\n    \} else \{/);
    assert.ok(timelineBlockMatch, 'expected to find the initial-count Timeline logging block');
    const block = timelineBlockMatch![0];
    assert.match(block, /const resolvedInitialCapital = resolveInitialCapitalValue\(newCount\);/);
    assert.match(block, /amount: resolvedInitialCapital/);
    assert.doesNotMatch(block, /amount: newCount\.totalValue/);
  });

  it('details.totalValue deliberately still mirrors the raw StockCount.totalValue field verbatim (an honest audit trail, not the bug)', () => {
    assert.match(contextSource, /totalValue: newCount\.totalValue,\n\s*\},\n\s*\}\);\n\s*\} else \{/);
  });
});

describe('AppContext.tsx — businessWorth formula text is unchanged (Invariant I-6)', () => {
  it('businessWorth still reads exactly totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime, no initialCapitalValue term', () => {
    const formulaMatch = contextSource.match(/const businessWorth = ([^;]+);/);
    assert.ok(formulaMatch, 'expected to find the businessWorth formula');
    assert.equal(formulaMatch![1].trim(), 'totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime');
  });

  it('capitalGrowth = businessWorth - initialCapitalValue, formula shape unchanged', () => {
    const formulaMatch = contextSource.match(/const capitalGrowth = ([^;]+);/);
    assert.ok(formulaMatch, 'expected to find the capitalGrowth formula');
    assert.equal(formulaMatch![1].trim(), 'businessWorth - initialCapitalValue');
  });

  it('initialCapitalValue now resolves via resolveInitialCapitalValue, not a bare inline expression', () => {
    assert.match(contextSource, /const initialCapitalValue = resolveInitialCapitalValue\(initialStockCount\);/);
  });
});

describe('AppContext.tsx — no unauthorized leakage into Periodic Contagem UI or Business Worth internals', () => {
  it('PeriodicStockCountView.tsx never references initialCapitalBasis or resolveInitialCapitalValue', () => {
    const periodicSource = readFileSync(
      new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
      'utf-8'
    );
    assert.doesNotMatch(periodicSource, /initialCapitalBasis/);
    assert.doesNotMatch(periodicSource, /resolveInitialCapitalValue/);
  });

  it('calculateInventoryTotals (Business Worth\'s own aggregation) is untouched by this feature — no reference to initialCapitalBasis anywhere in its own function body', () => {
    const fnMatch = contextSource.match(/const \{[\s\S]*?\} = calculateInventoryTotals\(batches, quebras\);/);
    assert.ok(fnMatch);
    assert.doesNotMatch(fnMatch![0], /initialCapitalBasis/);
  });
});
