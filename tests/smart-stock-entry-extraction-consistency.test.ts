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
    assert.match(smartStockEntrySrc, /costPrice for that one line only; still include the rest of that/);
    assert.match(smartStockEntrySrc, /still include every other line item/);
  });

  it('the "never invent/estimate/infer" discipline is unchanged — determinism must never be achieved by fabricating values instead of extracting them', () => {
    assert.match(
      smartStockEntrySrc,
      /invent, estimate, or infer a value that is not directly legible in the/
    );
  });
});
