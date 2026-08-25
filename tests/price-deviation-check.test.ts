// [Manual data-entry error investigation, Finding 3] Pure-function
// tests for checkPriceDeviation — no I/O, no DOM. See that file's own
// header for why this is a shared utility rather than duplicated per
// screen.
//
// HOW TO RUN:
//   npx tsx --test tests/price-deviation-check.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { checkPriceDeviation, PRICE_DEVIATION_WARNING_THRESHOLD } from '../apps/tenant/src/lib/priceDeviationCheck';

describe('checkPriceDeviation — the classic "extra/missing zero" typo this finding addresses', () => {
  it('a 10x typo (extra zero) triggers the warning, well above threshold', () => {
    const result = checkPriceDeviation(15000, 1500);
    assert.equal(result.showWarning, true);
    assert.equal(result.isAboveRemembered, true);
    assert.ok(result.deviationPercent! >= 9);
  });

  it('a 10x typo the other direction (missing zero) also triggers the warning', () => {
    const result = checkPriceDeviation(150, 1500);
    assert.equal(result.showWarning, true);
    assert.equal(result.isAboveRemembered, false);
  });

  it('an ordinary, modest price change (10%) does not trigger the warning', () => {
    const result = checkPriceDeviation(1650, 1500);
    assert.equal(result.showWarning, false);
  });

  it('exactly at the threshold triggers the warning (>=, not >)', () => {
    const result = checkPriceDeviation(1950, 1500);
    assert.equal(result.deviationPercent, PRICE_DEVIATION_WARNING_THRESHOLD);
    assert.equal(result.showWarning, true);
  });

  it('just under the threshold does not trigger it', () => {
    const result = checkPriceDeviation(1949, 1500);
    assert.ok(result.deviationPercent! < PRICE_DEVIATION_WARNING_THRESHOLD);
    assert.equal(result.showWarning, false);
  });

  it('an identical price shows no warning and no direction', () => {
    const result = checkPriceDeviation(1500, 1500);
    assert.equal(result.deviationPercent, 0);
    assert.equal(result.showWarning, false);
    assert.equal(result.isAboveRemembered, false);
  });
});

describe('checkPriceDeviation — never fabricates a comparison', () => {
  it('a null remembered price yields no warning, never a false 0%/Infinity%', () => {
    const result = checkPriceDeviation(1500, null);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });

  it('an undefined remembered price (no memory found at all) behaves identically to null', () => {
    const result = checkPriceDeviation(1500, undefined);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });

  it('a remembered price of exactly 0 never triggers a warning — would be a divide-by-zero', () => {
    const result = checkPriceDeviation(1500, 0);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });

  it('a negative remembered price (a genuinely corrupt/impossible state) is treated as no honest comparison, never a fabricated negative-magnitude deviation', () => {
    const result = checkPriceDeviation(1500, -100);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });

  it('a non-finite typed price (NaN — a blank/mid-edit field parsed unsafely) yields no warning rather than a nonsensical comparison', () => {
    const result = checkPriceDeviation(NaN, 1500);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });

  it('a non-finite remembered price (Infinity) yields no warning', () => {
    const result = checkPriceDeviation(1500, Infinity);
    assert.equal(result.deviationPercent, null);
    assert.equal(result.showWarning, false);
  });
});

describe('checkPriceDeviation — matches DeclareBusinessWorthView.tsx\'s own independently-declared threshold exactly (same value, intentionally not shared code)', () => {
  it('PRICE_DEVIATION_WARNING_THRESHOLD is 0.3', () => {
    assert.equal(PRICE_DEVIATION_WARNING_THRESHOLD, 0.3);
  });
});
