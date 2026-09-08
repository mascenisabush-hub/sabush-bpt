// [Bug fix — Owner-reported: "digits typed are hidden" in Periodic
// Contagem's quantity field] See sanitizeDecimalInput's own header
// comment (lib/decimalInputSanitizer.ts) for the full root-cause
// explanation. Pure function, no DOM/React harness needed.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { sanitizeDecimalInput } from '../apps/tenant/src/lib/decimalInputSanitizer';

describe('sanitizeDecimalInput', () => {
  it('passes plain digits through unchanged', () => {
    assert.equal(sanitizeDecimalInput('12'), '12');
    assert.equal(sanitizeDecimalInput('0'), '0');
  });

  it('normalizes a comma decimal separator to a period', () => {
    assert.equal(sanitizeDecimalInput('1,5'), '1.5');
    assert.equal(sanitizeDecimalInput('0,25'), '0.25');
  });

  it('leaves an already-period decimal separator unchanged', () => {
    assert.equal(sanitizeDecimalInput('1.5'), '1.5');
  });

  it('strips anything that is not a digit, comma, or period', () => {
    assert.equal(sanitizeDecimalInput('1a2b3'), '123');
    assert.equal(sanitizeDecimalInput('  12  '), '12');
    assert.equal(sanitizeDecimalInput('12kg'), '12');
  });

  it('keeps only the FIRST decimal separator when multiple are typed', () => {
    assert.equal(sanitizeDecimalInput('1.2.3'), '1.23');
    assert.equal(sanitizeDecimalInput('1,2,3'), '1.23');
    assert.equal(sanitizeDecimalInput('1,2.3'), '1.23');
  });

  it('returns an empty string for input with nothing numeric in it', () => {
    assert.equal(sanitizeDecimalInput(''), '');
    assert.equal(sanitizeDecimalInput('abc'), '');
  });

  it('supports a bare trailing decimal separator (mid-typing state, e.g. "1,")', () => {
    assert.equal(sanitizeDecimalInput('1,'), '1.');
  });

  it('the result always parses cleanly via parseFloat, matching every existing call site\'s own expectation', () => {
    for (const raw of ['1,5', '0,25', '12', '1.2.3', '1,2,3']) {
      const sanitized = sanitizeDecimalInput(raw);
      assert.ok(Number.isFinite(parseFloat(sanitized)), `parseFloat(${JSON.stringify(sanitized)}) must be finite`);
    }
  });
});
