// Regression: new product ids created in one recordStockCount loop could collide (same-millisecond
// timestamp + only 4 random base-36 chars), and a collision silently overwrote one product.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newProductId } from '../apps/tenant/src/lib/newProductId.ts';

describe('newProductId', () => {
  it('never repeats across a large same-millisecond burst', () => {
    const realNow = Date.now;
    Date.now = () => 1_800_000_000_000; // freeze the clock: worst case for the old scheme
    try {
      const ids = new Set<string>();
      for (let i = 0; i < 200_000; i++) ids.add(newProductId());
      assert.equal(ids.size, 200_000);
    } finally {
      Date.now = realNow;
    }
  });

  it('is unique even if Math.random is degenerate (counter alone guarantees it)', () => {
    const realRandom = Math.random;
    Math.random = () => 0.5;
    try {
      const ids = new Set(Array.from({ length: 5000 }, () => newProductId()));
      assert.equal(ids.size, 5000);
    } finally {
      Math.random = realRandom;
    }
  });

  it("keeps the 'prod-' prefix and a Firestore-safe shape", () => {
    assert.match(newProductId(), /^prod-\d+-[0-9a-z]+-[0-9a-z]{1,4}$/);
  });
});

describe('recordStockCount uses it for the loop-created products', () => {
  const src = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
  const fn = src.slice(src.indexOf('const recordStockCount = async'), src.indexOf('const voidInitialStockConfirmation'));
  it('no inline timestamp+random product id inside recordStockCount', () => {
    assert.doesNotMatch(fn, /'prod-' \+ Date\.now\(\)/);
    assert.match(fn, /productId = newProductId\(\);/);
  });
});
