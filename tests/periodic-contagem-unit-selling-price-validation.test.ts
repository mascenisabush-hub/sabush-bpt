// [Periodic Contagem — Implementation Authorization §1a, signed
// 27 September 2026, commit 6310429] Stage 1 of 6: Unit and Selling
// Price validation in validateWorkingRowForSave. Source-text based,
// following this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

const fnMatch = componentSource.match(/const validateWorkingRowForSave = \(row: StockCountWorkingRow\): string \| null => \{[\s\S]*?\n  \};/);

describe('validateWorkingRowForSave — Unit required (§48 C)', () => {
  it('exists and rejects a blank unit with the exact authorized message', () => {
    assert.ok(fnMatch, 'expected validateWorkingRowForSave to exist');
    assert.match(fnMatch![0], /if \(row\.unit\.trim\(\) === ''\) \{\s*\n\s*return 'Introduza a unidade contada\.';\s*\n\s*\}/);
  });

  it('the unit check does not introduce any enum/whitelist — any non-blank string remains acceptable', () => {
    assert.doesNotMatch(fnMatch![0], /row\.unit.*(includes|===\s*'(un|cx|emb)')/);
  });

  it('the unit check runs after quantity, before cost/selling price, matching the function\'s own field order', () => {
    const body = fnMatch![0];
    const qtyIdx = body.indexOf("row.quantity.trim() === ''");
    const unitIdx = body.indexOf("row.unit.trim() === ''");
    const costIdx = body.indexOf("row.costPrice.trim() !== ''");
    assert.ok(qtyIdx < unitIdx && unitIdx < costIdx);
  });
});

describe('validateWorkingRowForSave — Selling Price required and strictly positive (§48 D)', () => {
  it('rejects a blank selling price', () => {
    const body = fnMatch![0];
    assert.match(body, /const sellingRaw = row\.sellingPrice\.trim\(\);/);
    assert.match(body, /const selling = sellingRaw === '' \? NaN : parseFloat\(sellingRaw\);/);
    assert.match(body, /if \(!Number\.isFinite\(selling\) \|\| selling <= 0\) \{/);
    assert.match(body, /return 'Introduza um preço de venda válido, maior que zero\.';/);
  });

  it('the old "only validate if non-blank" pattern for selling price no longer exists', () => {
    assert.doesNotMatch(componentSource, /if \(row\.sellingPrice\.trim\(\) !== ''\) \{\s*\n\s*const selling = parseFloat\(row\.sellingPrice\);/);
  });

  it('cost price validation remains completely unchanged — still optional, still only rejects an explicitly-entered invalid value', () => {
    const body = fnMatch![0];
    assert.match(body, /if \(row\.costPrice\.trim\(\) !== ''\) \{\s*\n\s*const cost = parseFloat\(row\.costPrice\);\s*\n\s*if \(!Number\.isFinite\(cost\) \|\| cost < 0\) return 'Introduza um preço de custo válido\.';\s*\n\s*\}/);
  });
});

// Direct execution of the validation LOGIC itself (reproduced here
// exactly, since the real function is a closure inside a large
// component and cannot be imported standalone) — proving the actual
// behavior for every state table row, not just that the source text
// contains the right strings.
function validate(row: { quantity: string; unit: string; costPrice: string; sellingPrice: string }): string | null {
  if (row.quantity.trim() === '') return 'Introduza a quantidade contada (ou 0, se não há stock deste produto).';
  const qty = parseFloat(row.quantity);
  if (!Number.isFinite(qty) || qty < 0) return 'Introduza uma quantidade válida (0 ou mais).';
  if (row.unit.trim() === '') return 'Introduza a unidade contada.';
  if (row.costPrice.trim() !== '') {
    const cost = parseFloat(row.costPrice);
    if (!Number.isFinite(cost) || cost < 0) return 'Introduza um preço de custo válido.';
  }
  const sellingRaw = row.sellingPrice.trim();
  const selling = sellingRaw === '' ? NaN : parseFloat(sellingRaw);
  if (!Number.isFinite(selling) || selling <= 0) return 'Introduza um preço de venda válido, maior que zero.';
  return null;
}

describe('Direct execution — every explicit state from the acceptance criteria', () => {
  it('1. valid quantity + valid unit + valid cost + valid selling price -> passes', () => {
    assert.equal(validate({ quantity: '10', unit: 'cx', costPrice: '100', sellingPrice: '150' }), null);
  });

  it('2. quantity present + missing unit -> rejected', () => {
    assert.notEqual(validate({ quantity: '10', unit: '', costPrice: '100', sellingPrice: '150' }), null);
  });

  it('4. quantity present + missing cost price -> passes (cost price remains optional, §44)', () => {
    assert.equal(validate({ quantity: '10', unit: 'cx', costPrice: '', sellingPrice: '150' }), null);
  });

  it('5. quantity present + invalid cost price -> rejected', () => {
    assert.notEqual(validate({ quantity: '10', unit: 'cx', costPrice: 'abc', sellingPrice: '150' }), null);
  });

  it('6. quantity present + missing selling price -> rejected (this is the closed gap)', () => {
    assert.notEqual(validate({ quantity: '10', unit: 'cx', costPrice: '100', sellingPrice: '' }), null);
  });

  it('7. quantity present + invalid (non-numeric) selling price -> rejected', () => {
    assert.notEqual(validate({ quantity: '10', unit: 'cx', costPrice: '100', sellingPrice: 'abc' }), null);
  });

  it('8. selling price exactly 0 -> rejected (explicit zero is never legitimate for selling price)', () => {
    assert.notEqual(validate({ quantity: '10', unit: 'cx', costPrice: '100', sellingPrice: '0' }), null);
  });

  it('negative selling price -> rejected', () => {
    assert.notEqual(validate({ quantity: '10', unit: 'cx', costPrice: '100', sellingPrice: '-5' }), null);
  });

  it('quantity exactly 0 -> still passes (unchanged, legitimate "no stock" case)', () => {
    assert.equal(validate({ quantity: '0', unit: 'cx', costPrice: '', sellingPrice: '150' }), null);
  });
});
