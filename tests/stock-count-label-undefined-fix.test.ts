// Production bug fix: recordStockCount's `label` field crashed every
// Initial Stock Count confirmation, and every non-'custom' Periodic
// Stock Count confirmation, with a Firestore "Function WriteBatch.set()
// called with invalid data. Unsupported field value: undefined" error.
//
// Root cause: `label: label?.trim() || undefined` assigned a literal
// `undefined` directly to a field, rather than conditionally omitting
// the key. InitialStockCountView.tsx never passes a label at all;
// PeriodicStockCountView.tsx explicitly passes `undefined` for every
// type except 'custom'. This was therefore the default, universal
// path for the large majority of stock count confirmations, not a
// rare edge case - confirmed by directly reading both calling
// components, not assumed.
//
// A second instance of the identical bug existed in the same
// function's logTimelineEvent call (details.label) - lower severity,
// since that write's own try/catch already swallowed the resulting
// error, silently dropping the timeline entry rather than blocking
// the user's confirmation. Fixed the same way, for the same reason.
//
// SCOPE: recordStockCount lives inside AppContext.tsx (a React
// context, not a standalone exported function) and depends on the
// live Firebase client SDK - the same constraint documented
// throughout this repository's test suite. This is a source-level
// regression guard, matching the established technique.
//
// HOW TO RUN:
//   npx tsx --test tests/stock-count-label-undefined-fix.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = source.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('recordStockCount — newCount.label no longer assigned literal undefined', () => {
  const fnBody = extractFunctionBody(src, 'const recordStockCount = async (');

  it('the broken direct assignment is gone', () => {
    assert.doesNotMatch(
      fnBody,
      /label: label\?\.trim\(\) \|\| undefined,/,
      'Found the exact broken pattern that crashed every non-custom stock count confirmation - this must not be reintroduced.'
    );
  });

  it('label is now conditionally spread, matching the established Firestore-safe-write pattern used elsewhere in this same object (expectedValueAtCount)', () => {
    assert.match(fnBody, /\.\.\.\(label\?\.trim\(\) \? \{ label: label\.trim\(\) \} : \{\}\)/);
  });

  it('the fix appears before the fsBatch.set() call that writes the stockCounts document, so it actually applies to that write', () => {
    const fixIndex = fnBody.indexOf('...(label?.trim() ? { label: label.trim() } : {})');
    // There is an earlier, unrelated fsBatch.set() call in this same
    // function (auto-creating a Product if none exists for a counted
    // item name) — target the stockCounts write specifically, not the
    // first fsBatch.set() occurrence in the function.
    const setCallIndex = fnBody.indexOf("fsBatch.set(doc(db, 'businesses', businessId, 'stockCounts'");
    assert.notEqual(fixIndex, -1);
    assert.notEqual(setCallIndex, -1);
    assert.ok(fixIndex < setCallIndex);
  });
});

describe('recordStockCount — logTimelineEvent details.label no longer assigned literal undefined', () => {
  const fnBody = extractFunctionBody(src, 'const recordStockCount = async (');

  it('the broken direct assignment inside details{} is gone', () => {
    assert.doesNotMatch(fnBody, /details: \{\s*countType: type,\s*label: label\?\.trim\(\),/);
  });

  it('details.label is now conditionally spread', () => {
    const detailsBlockStart = fnBody.indexOf('details: {\n          countType: type,');
    assert.notEqual(detailsBlockStart, -1, 'Could not locate the periodic logTimelineEvent details block.');
    // Widened from the original window: an explanatory comment block
    // was inserted between countType and the fix itself, which a
    // narrower window missed entirely — a test-authoring bug, caught
    // by actually running this test rather than assuming it was right.
    const detailsBlock = fnBody.slice(detailsBlockStart, detailsBlockStart + 900);
    assert.match(detailsBlock, /\.\.\.\(label\?\.trim\(\) \? \{ label: label\.trim\(\) \} : \{\}\)/);
  });
});

describe('Confirms the bug was universal, not an edge case — evidence from both calling components', () => {
  it('InitialStockCountView.tsx never passes a label to recordStockCount', () => {
    const initialViewSrc = readFileSync(new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url), 'utf-8');
    assert.match(initialViewSrc, /recordStockCount\(\{ type: 'initial', date, items: itemsToSave \}\)/);
  });

  it('PeriodicStockCountView.tsx explicitly passes undefined for every type except \'custom\'', () => {
    const periodicViewSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
    assert.match(periodicViewSrc, /label: type === 'custom' \? label\.trim\(\) : undefined,/);
  });
});
