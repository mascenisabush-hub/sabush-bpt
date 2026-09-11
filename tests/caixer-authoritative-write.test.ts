// CAIXER — Implementation Authorization §44, Checkpoint 3 (Plan §D/
// C.6–C.8: Non-Destructive Validation and Write-Boundary Enforcement).
// Specification §45, FR-73, FR-74, FR-76, FR-79; Rule 8 Findings CX-1,
// CX-2.
//
// SCOPE: this suite covers the two things this checkpoint actually adds
// that a pure/source-inspection test can exercise without a Firestore
// emulator: (1) computeCaixerTotalLiquidity — a plain, side-effect-free
// function, tested directly; (2) the AppContext.tsx/
// PeriodicStockCountView.tsx wiring that connects the accepted CAIXER
// draft values to recordStockCount's own confirmed-write payload —
// recordStockCount itself is tightly coupled to the live Firebase
// client SDK (see tests/initial-stock-confirmation.test.ts's own header
// for why), so, matching this repository's established technique for
// that exact class of function (tests/business-worth-correction-
// recovery-ui.test.ts, tests/business-worth-audit-trail-wiring.test.ts),
// this suite uses structural source-text inspection rather than
// invoking it.
//
// The authoritative server-side enforcement of CX-1 (aggregate
// consistency) and CX-2 (mandatory-field presence/type) — the actual
// write-boundary firestore.rules changes — is covered separately in
// tests/caixer-firestore-rules.test.ts, which requires a real Firestore
// emulator (see that file's own SANDBOX DISCLOSURE).
//
// HOW TO RUN:
//   npx tsx --test tests/caixer-authoritative-write.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeCaixerTotalLiquidity } from '../apps/tenant/src/utils/calculations';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

describe('computeCaixerTotalLiquidity — pure function (calculations.ts)', () => {
  it('sums all four components', () => {
    assert.equal(computeCaixerTotalLiquidity({ cash: 1000, emola: 250, mpesa: 500, banco: 4200 }), 5950);
  });

  it('an explicit 0 in any component is treated as a real value, not skipped — the sum simply reflects it', () => {
    assert.equal(computeCaixerTotalLiquidity({ cash: 0, emola: 0, mpesa: 0, banco: 0 }), 0);
    assert.equal(computeCaixerTotalLiquidity({ cash: 0, emola: 100, mpesa: 0, banco: 50 }), 150);
  });

  it('rounds to 2 decimal places, absorbing floating-point summation noise (mirrors computeMeasuredBusinessWorth\'s own .toFixed(2) discipline)', () => {
    assert.equal(computeCaixerTotalLiquidity({ cash: 0.1, emola: 0.2, mpesa: 0, banco: 0 }), 0.3);
  });

  it('handles negative-free ordinary Mozambican-Metical-scale figures without precision drift', () => {
    assert.equal(computeCaixerTotalLiquidity({ cash: 123456.78, emola: 9999.99, mpesa: 1.01, banco: 500000 }), 633457.78);
  });
});

describe('AppContext.tsx — RecordStockCountParams (Checkpoint 3 signature change)', () => {
  it('the old single ownerConfirmedCashPosition parameter no longer exists on RecordStockCountParams', () => {
    const start = appContextSrc.indexOf('interface RecordStockCountParams {');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf('\n}', start);
    const body = appContextSrc.slice(start, end);
    assert.doesNotMatch(body, /ownerConfirmedCashPosition\?:\s*number;/);
    assert.match(body, /caixerCash\?:\s*number;/);
    assert.match(body, /caixerEmola\?:\s*number;/);
    assert.match(body, /caixerMpesa\?:\s*number;/);
    assert.match(body, /caixerBanco\?:\s*number;/);
  });

  it('recordStockCount destructures the four new params and no longer destructures ownerConfirmedCashPosition', () => {
    const sigStart = appContextSrc.indexOf('const recordStockCount = async ({');
    assert.notEqual(sigStart, -1);
    const sigEnd = appContextSrc.indexOf('}: RecordStockCountParams) => {', sigStart);
    const signature = appContextSrc.slice(sigStart, sigEnd);
    assert.match(signature, /\bcaixerCash\b/);
    assert.match(signature, /\bcaixerEmola\b/);
    assert.match(signature, /\bcaixerMpesa\b/);
    assert.match(signature, /\bcaixerBanco\b/);
    assert.doesNotMatch(signature, /\bownerConfirmedCashPosition\b/);
  });
});

describe('AppContext.tsx — recordStockCount (Checkpoint 3 aggregate derivation, CX-1 client mechanism)', () => {
  it('hasCaixer requires all four components to be present, finite numbers — a single missing one disqualifies the whole group', () => {
    const start = appContextSrc.indexOf('const hasCaixer =');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf('const ownerConfirmedCashPosition = hasCaixer', start);
    const body = appContextSrc.slice(start, end);
    for (const field of ['caixerCash', 'caixerEmola', 'caixerMpesa', 'caixerBanco']) {
      assert.match(body, new RegExp(`typeof ${field} === 'number' && Number\\.isFinite\\(${field}\\)`));
    }
  });

  it('ownerConfirmedCashPosition (the aggregate) is derived ONLY via computeCaixerTotalLiquidity — never accepted as a caller-supplied value, and never fabricated when hasCaixer is false', () => {
    const start = appContextSrc.indexOf('const ownerConfirmedCashPosition = hasCaixer');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf(';', start) + 1;
    const body = appContextSrc.slice(start, end);
    assert.match(body, /computeCaixerTotalLiquidity\(\{ cash: caixerCash!, emola: caixerEmola!, mpesa: caixerMpesa!, banco: caixerBanco! \}\)/);
    assert.match(body, /:\s*undefined;\s*$/);
  });

  it('computeCaixerTotalLiquidity is imported from the shared calculations.ts module — never re-implemented inline', () => {
    assert.match(
      appContextSrc,
      /computeCaixerTotalLiquidity/
    );
    const importLine = appContextSrc.split('\n').find((l) => l.includes("from '../utils/calculations'"));
    assert.ok(importLine, 'Expected a calculations.ts import line.');
    assert.match(importLine!, /computeCaixerTotalLiquidity/);
  });
});

describe('AppContext.tsx — BusinessWorthSnapshot write payload (Checkpoint 3, FR-74)', () => {
  it('the four raw CAIXER components are written onto the snapshot literal, gated on the SAME hasCaixer check as the aggregate — never independently present/absent', () => {
    const start = appContextSrc.indexOf('const businessWorthSnapshot: Omit<BusinessWorthSnapshot');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf('\n      };', start);
    const body = appContextSrc.slice(start, end);
    assert.match(body, /\.\.\.\(hasCaixer\s*\?\s*\{\s*cashPositionCash: caixerCash!,\s*cashPositionEmola: caixerEmola!,\s*cashPositionMpesa: caixerMpesa!,\s*cashPositionBanco: caixerBanco!,?\s*\}\s*:\s*\{\}\),/);
    // The derived aggregate itself is also present, sourced from the
    // SAME hasCashPosition flag (== hasCaixer) — the two can never
    // diverge in presence.
    assert.match(body, /\.\.\.\(hasCashPosition \? \{ cashPosition: ownerConfirmedCashPosition as number \} : \{\}\),/);
  });
});

describe('PeriodicStockCountView.tsx — confirmation call site (Checkpoint 3 wiring, closes Rule 8 Finding CX-8)', () => {
  it('the recordStockCount call sends the four CAIXER values from caixerDraft, gated on caixerAllFieldsValid — never the old cashPositionDeclarations[0].amount reuse', () => {
    const start = periodicSrc.indexOf('const saved = await recordStockCount({');
    assert.notEqual(start, -1);
    // [CAIXER — Checkpoint 3] Fixed-length window covering the whole
    // recordStockCount({ ... }) call — measured by brace-balance from
    // this call's own opening `{` to its matching closing `}`, mirroring
    // this file's own established window-sizing technique for the
    // sibling call-site tests in business-worth-correction-recovery-ui.test.ts.
    const body = periodicSrc.slice(start, start + 8300);
    assert.match(body, /caixerAllFieldsValid/);
    assert.match(body, /caixerCash: caixerCashValue as number,/);
    assert.match(body, /caixerEmola: caixerEmolaValue as number,/);
    assert.match(body, /caixerMpesa: caixerMpesaValue as number,/);
    assert.match(body, /caixerBanco: caixerBancoValue as number,/);
    assert.doesNotMatch(body, /ownerConfirmedCashPosition:/, 'The old single-scalar field must never be assigned in this call.');
    assert.doesNotMatch(body, /\n\s*\.\.\.\(cashPositionDeclarations\.length > 0/, 'The old cashPositionDeclarations-length-gated spread must no longer exist as an active code path.');
  });

  it('the four CAIXER values are sent together or not at all — a single spread gated on one completeness flag, never four independent conditionals', () => {
    const start = periodicSrc.indexOf('const saved = await recordStockCount({');
    const body = periodicSrc.slice(start, start + 8300);
    const spreadStart = body.indexOf('...(caixerAllFieldsValid');
    assert.notEqual(spreadStart, -1);
    const spreadEnd = body.indexOf('}\n          : {}),', spreadStart);
    assert.notEqual(spreadEnd, -1, 'Expected a single ternary spread covering all four fields.');
  });

  it('mostRecentDeclaration (the standalone Cash Position Declaration) remains display-only reference text on the CAIXER entry screen — it is never part of the confirmation payload', () => {
    const start = periodicSrc.indexOf('const saved = await recordStockCount({');
    const confirmBody = periodicSrc.slice(start, start + 8300);
    assert.doesNotMatch(confirmBody, /mostRecentDeclaration/);
    // The hint itself still exists, elsewhere, purely for display.
    assert.match(periodicSrc, /Última posição de caixa declarada:/);
  });
});

describe('Non-destructive validation — the critical failure/retry sequence (Checkpoint 3, §43.3, binding on this checkpoint)', () => {
  it('a rejected confirmation clears ONLY pendingTally/caixerStage (returning to the editing screen) — it never clears caixerDraft, catalogRows, or manualRows, so a corrected resubmission can proceed with all prior work intact', () => {
    const tryStart = periodicSrc.indexOf('const saved = await recordStockCount({');
    const catchStart = periodicSrc.indexOf('} catch (err: any) {', tryStart);
    assert.notEqual(catchStart, -1);
    const finallyStart = periodicSrc.indexOf('} finally {', catchStart);
    assert.notEqual(finallyStart, -1);
    const catchBody = periodicSrc.slice(catchStart, finallyStart);

    // Preserves the working state — never resets the Contagem workflow.
    assert.doesNotMatch(catchBody, /setCaixerDraft\(/, 'caixerDraft must never be cleared on a rejected submission.');
    assert.doesNotMatch(catchBody, /setCatalogRows\(/, 'Stock Count quantities (catalogRows) must never be cleared on a rejected submission.');
    assert.doesNotMatch(catchBody, /setManualRows\(/, 'Stock Count quantities (manualRows) must never be cleared on a rejected submission.');
    assert.doesNotMatch(catchBody, /submissionIdRef\.current\s*=\s*null/, 'The submission identity must remain retryable under the same id after a failure.');

    // Returns the operator to the editing screen — clears only the
    // review-stage state, allowing handleRequestConfirmation to recompute
    // pendingTally and re-enter the CAIXER stage on the next attempt,
    // pre-filled from the still-intact caixerDraft.
    assert.match(catchBody, /setPendingTally\(null\);/);
    assert.match(catchBody, /setCaixerStage\(null\);/);

    // A clear, correctable error is surfaced to the operator rather than
    // a silent failure.
    assert.match(catchBody, /setError\(/);
  });

  it('caixerDraft is populated from the durable PeriodicStockDraft on mount/business-switch, and updated only by explicit field edits — never reset as a side effect of a failed confirmation (confirms the catch block\'s silence on caixerDraft is not accidental)', () => {
    assert.match(periodicSrc, /setCaixerDraft\(periodicStockDraft\.caixerDraft \?\? \{\}\);/);
    const handlerStart = periodicSrc.indexOf("const handleCaixerFieldChange = (field:");
    assert.notEqual(handlerStart, -1);
    const handlerEnd = periodicSrc.indexOf('};', handlerStart) + 2;
    const handlerBody = periodicSrc.slice(handlerStart, handlerEnd);
    assert.match(handlerBody, /setCaixerDraft\(\(prev\) => \(\{ \.\.\.prev, \[field\]: value \}\)\);/);
  });
});
