// [Capital Inicial Retirement — Implementation Authorization, Increment
// 6] Source-inspection tests proving the Expected Current Stock Value
// explanatory copy in PeriodicStockCountView.tsx no longer names
// "Capital Inicial" for a business that no longer has, or never had,
// one — while remaining verbatim-accurate for a business that does.
//
// Governing chain:
// docs/engineering/capital-inicial-retirement-implementation-authorization.md
// (Signed, SABUSHIMIKE MASCENI, 31 August 2026), §5 Increment 6;
// Specification §44.1/FR-70.
//
// Same established technique as
// tests/periodic-stock-count-detail-and-correction-prefill.test.ts and
// tests/periodic-contagem-quantity-selling-unit-independence.test.ts:
// this repo has no React test renderer configured, so component copy
// is verified by inspecting the actual source text, not a rendered
// DOM.
//
// IMPORTANT: this increment is copy-only. The expectedCurrentStockValue
// arithmetic itself (AppContext.tsx, initialCapitalValue +
// totalInvestmentValueAllTime) must remain completely unchanged — that
// is covered by the required, unmodified regression run of
// tests/expected-stock-value.test.ts (AC-9), not by this file.
//
// HOW TO RUN:
//   npx tsx --test tests/expected-current-stock-value-terminology.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const periodicSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

function expectedStockValueExplanationBlock(): string {
  // Isolate the specific explanatory <p> — the one containing the
  // "Valor Esperado de Stock" label — not the separate, unrelated
  // "Ainda não definiu o Capital Inicial" amber nudge box above it
  // (out of this increment's scope; left untouched by design).
  const labelIndex = periodicSrc.indexOf('Valor Esperado de Stock');
  assert.ok(labelIndex >= 0, 'expected the Valor Esperado de Stock label to exist');
  const blockStart = periodicSrc.lastIndexOf('<p', labelIndex);
  const blockEnd = periodicSrc.indexOf('</p>', labelIndex);
  assert.ok(blockStart >= 0 && blockEnd > blockStart);
  return periodicSrc.slice(blockStart, blockEnd);
}

describe('PeriodicStockCountView.tsx — Expected Current Stock Value copy (Increment 6)', () => {
  it('is conditional on hasInitialStockCount, not a single hardcoded string anymore', () => {
    const block = expectedStockValueExplanationBlock();
    assert.match(block, /hasInitialStockCount\s*\?/, 'expected a hasInitialStockCount-conditional expression');
  });

  it('the TRUE branch (business HAS a historical record) preserves the exact prior wording verbatim, still naming Capital Inicial', () => {
    const block = expectedStockValueExplanationBlock();
    const trueBranchMatch = block.match(/hasInitialStockCount\s*\?\s*'([^']*)'/);
    assert.ok(trueBranchMatch, 'expected a quoted true-branch string');
    assert.equal(
      trueBranchMatch![1],
      'o Capital Inicial mais o valor (a custo) do stock em lote atualmente registado',
      'the true-branch wording must be byte-for-byte identical to the original pre-Increment-6 copy — no accuracy change for a business that DOES have a preserved historical record'
    );
  });

  it('the FALSE branch (business has NO historical record) does not contain the literal string "Capital Inicial"', () => {
    const block = expectedStockValueExplanationBlock();
    const falseBranchMatch = block.match(/:\s*'([^']*)'/);
    assert.ok(falseBranchMatch, 'expected a quoted false-branch string');
    assert.doesNotMatch(
      falseBranchMatch![1],
      /Capital Inicial/,
      'a business with no historical Capital Inicial record must never see the retired concept named in this explanatory copy'
    );
  });

  it('the false branch uses the Plan-named generic phrase ("valor de compras registadas"), not an invented substitute', () => {
    const block = expectedStockValueExplanationBlock();
    assert.match(block, /valor de compras registadas/);
  });

  it('the surrounding sentence structure (label, opening, and closing clauses) is shared by both branches — only the retired-concept-naming middle clause is conditional', () => {
    const block = expectedStockValueExplanationBlock();
    assert.match(block, /Valor Esperado de Stock/);
    assert.match(block, /para mostrar se o valor do seu inventário corresponde ao que o sistema esperava/);
  });
});

describe('PeriodicStockCountView.tsx — Increment 6 explicitly does not touch the arithmetic', () => {
  it('does not redefine expectedCurrentStockValue as its own local computation — the formula lives only in AppContext.tsx, untouched by this increment', () => {
    // This is a copy-only increment; the arithmetic itself is verified
    // unchanged by the required, separately-run regression suite
    // tests/expected-stock-value.test.ts (AC-9). This test only proves
    // PeriodicStockCountView.tsx itself defines no competing formula
    // as actual code — an assignment/declaration pattern, not merely a
    // documentation comment mentioning the formula's field names (this
    // file's own Increment 6 comment legitimately does that).
    assert.doesNotMatch(
      periodicSrc,
      /=\s*initialCapitalValue\s*\+\s*totalInvestmentValueAllTime/,
      'the formula must not be duplicated/redefined as code in this view — it is read from context, never recomputed here'
    );
  });
});
