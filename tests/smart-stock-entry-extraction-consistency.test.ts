// [Bug fix — repeated scans of the SAME receipt returning DIFFERENT
// results] Owner-reported: scanning one multi-item receipt three
// separate times produced three different totals, none matching the
// receipt's own printed total.
//
// Two contributing gaps, both addressed here:
//
// 1. No `temperature` was set on the Gemini call at all, so the
//    provider's own non-zero default sampling temperature applied —
//    meaning genuine run-to-run randomness on the EXACT SAME image,
//    not merely "hard to read" variance. For a bookkeeping feature
//    whose entire premise is a reliable, literal reading of a document
//    (never an invented/estimated value, per the prompt's own explicit
//    rule), that randomness is actively harmful.
//
// 2. The prompt asked to extract "each" line item but never explicitly
//    stated that EVERY item on a multi-product receipt must be
//    returned, nor that one line's missing costPrice should not cause
//    that line (or the rest of the receipt) to be dropped — a plausible
//    contributor to only a single item surfacing from a receipt with
//    several products.
//
// SCOPE: callVisionExtractionProvider is this repository's own
// documented, deliberately-untestable-here I/O boundary (see the
// function's own comment in server/smartStockEntry.ts) — no real
// provider credential or real document is available in this test
// environment. Source-structure checks only, matching this file's
// established pattern for this exact function.
//
// HOW TO RUN:
//   npx tsx --test tests/smart-stock-entry-extraction-consistency.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const smartStockEntrySrc = src('server/smartStockEntry.ts');

describe('smartStockEntry.ts — the extraction call is deterministic and asks for every line item', () => {
  it('temperature: 0 is set on the generateContent config, alongside responseMimeType/responseSchema', () => {
    const configStart = smartStockEntrySrc.indexOf('config: {\n          responseMimeType:');
    assert.notEqual(configStart, -1);
    const configBlock = smartStockEntrySrc.slice(configStart, configStart + 2000);
    assert.match(configBlock, /temperature: 0,/);
  });

  it('the prompt explicitly instructs extracting EVERY line item, not just the first/clearest one', () => {
    assert.match(smartStockEntrySrc, /extract EVERY line item on it/);
    assert.match(smartStockEntrySrc, /a receipt with five products must produce five/);
  });

  it('the prompt clarifies a missing costPrice on one line must not drop that line or any other line item', () => {
    assert.match(smartStockEntrySrc, /still include the rest of that/);
    assert.match(smartStockEntrySrc, /still include every other line item/);
  });

  // [Bug fix — Owner-reported, urgent: costPrice consistently coming back
  // empty] The prompt's prior blanket "never invent, estimate, or infer"
  // wording, with no distinction between per-unit price and line total,
  // meant a model reading a receipt that prints only a line TOTAL
  // (quantity × unit price, no separate per-unit column — the common case
  // for informal/small-supplier receipts) would correctly-but-uselessly
  // omit costPrice every time, since deriving it required a calculation
  // the prompt's own wording discouraged. The fix narrows the "never
  // infer" discipline to apply to productName/quantity/unit/total (never
  // fabricate a NUMBER OR STRING that isn't grounded in the document) while
  // carving out one explicit, narrow exception: costPrice MAY be computed
  // as total ÷ quantity when BOTH inputs are themselves directly legible —
  // this is arithmetic on two already-extracted numbers, not a guess about
  // an illegible one. This test asserts the discipline still forbids
  // fabricating ungrounded values, and that the one exception is scoped
  // and explicit, not a general license to estimate.
  it('the "never invent/estimate" discipline still forbids fabricating ungrounded values, with one explicit, narrow, arithmetic-only exception for costPrice', () => {
    assert.match(smartStockEntrySrc, /invent or estimate a productName, quantity, unit, or total figure/);
    assert.match(smartStockEntrySrc, /that is not directly legible in the/);
    assert.match(smartStockEntrySrc, /DIVIDE the total by the/);
    assert.match(smartStockEntrySrc, /this is a direct arithmetic calculation/);
    assert.match(smartStockEntrySrc, /the one explicit exception/);
  });
});
