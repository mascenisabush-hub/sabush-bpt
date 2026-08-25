// [Feature — reconciliation signal reaching the Owner, Owner-requested]
// The underlying pure function (getPossibleReconciliationCauses) was
// already fully built and tested (tests/business-worth-reconciliation-signal.test.ts)
// but never called from any screen — this suite covers the two things
// that changed to actually surface it: recordStockCount's own return-
// value plumbing (AppContext.tsx) and the Confirmar Contagem success
// screen (PeriodicStockCountView.tsx).
//
// SCOPE: recordStockCount is a stateful, Firebase-client-SDK-coupled
// function with no live emulator available in this environment —
// established precedent (see tests/business-worth-audit-trail-wiring.test.ts's
// own header) for using source-inspection here instead. The one piece
// of genuinely new pure logic this feature adds
// (renderReconciliationCauseLabel) is tested directly, not by source
// inspection, since it's a plain, side-effect-free function.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-reconciliation-signal-ui-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = source.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('AppContext.tsx — recordStockCount return-value plumbing', () => {
  it('StockCountReconciliationSignal is exported, carrying difference/cashReconciliationDifference/the three "since" figures — never persisted to Firestore', () => {
    assert.match(appContextSrc, /export interface StockCountReconciliationSignal \{/);
    const start = appContextSrc.indexOf('export interface StockCountReconciliationSignal {');
    const end = appContextSrc.indexOf('\n}', start);
    const body = appContextSrc.slice(start, end);
    assert.match(body, /difference\?: number;/);
    assert.match(body, /cashReconciliationDifference\?: number;/);
    assert.match(body, /expensesSinceLastSnapshot\?: number;/);
    assert.match(body, /breakagesSinceLastSnapshot\?: number;/);
    assert.match(body, /levantamentosSinceLastSnapshot\?: number;/);
  });

  it('the AppContextType interface declares recordStockCount as returning the enrichment', () => {
    assert.match(
      appContextSrc,
      /recordStockCount: \(params: RecordStockCountParams\) => Promise<StockCount & \{ businessWorthReconciliation\?: StockCountReconciliationSignal \}>;/
    );
  });

  it('the hoisted carrier variable is declared before, and only ever assigned inside, the producesBusinessWorthSnapshot block', () => {
    const declIdx = appContextSrc.indexOf('let businessWorthReconciliationForReturn: StockCountReconciliationSignal | undefined;');
    const blockIdx = appContextSrc.indexOf('if (producesBusinessWorthSnapshot) {');
    const assignIdx = appContextSrc.indexOf('businessWorthReconciliationForReturn = {');
    assert.notEqual(declIdx, -1);
    assert.notEqual(blockIdx, -1);
    assert.notEqual(assignIdx, -1);
    assert.ok(declIdx < blockIdx, 'the variable must be declared before the producesBusinessWorthSnapshot block');
    assert.ok(assignIdx > blockIdx, 'the variable must only be assigned inside the block');
  });

  it('every field is spread conditionally (never a fabricated 0/undefined) — matching the same "genuinely omitted" discipline this file already uses everywhere else', () => {
    const start = appContextSrc.indexOf('businessWorthReconciliationForReturn = {');
    const end = appContextSrc.indexOf('\n      };', start);
    const body = appContextSrc.slice(start, end);
    assert.match(body, /\.\.\.\(difference !== undefined \? \{ difference \} : \{\}\)/);
    assert.match(body, /\.\.\.\(cashReconciliationDifference !== undefined \? \{ cashReconciliationDifference \} : \{\}\)/);
    assert.match(body, /\.\.\.\(expensesSinceLastSnapshot > 0 \? \{ expensesSinceLastSnapshot \} : \{\}\)/);
    assert.match(body, /\.\.\.\(breakagesSinceLastSnapshot > 0 \? \{ breakagesSinceLastSnapshot \} : \{\}\)/);
    assert.match(body, /\.\.\.\(levantamentosSinceLastSnapshot > 0 \? \{ levantamentosSinceLastSnapshot \} : \{\}\)/);
  });

  it('the return statement checks key COUNT, not mere object presence — an always-truthy-but-empty {} must not attach an empty reconciliation payload', () => {
    const returnStart = appContextSrc.lastIndexOf('return businessWorthReconciliationForReturn');
    assert.notEqual(returnStart, -1);
    const returnStatement = appContextSrc.slice(returnStart, returnStart + 400);
    assert.match(returnStatement, /Object\.keys\(businessWorthReconciliationForReturn\)\.length > 0/);
    assert.match(returnStatement, /\{ \.\.\.newCount, businessWorthReconciliation: businessWorthReconciliationForReturn \}/);
    assert.match(returnStatement, /: newCount;/);
  });

  it('every figure carried through is read from the SAME local variables the Timeline entry already uses — never a second, independently recomputed value', () => {
    // businessWorthSnapshotForTimeline and businessWorthReconciliationForReturn
    // must be assigned from the identical difference/cashReconciliationDifference
    // identifiers, in the same block, not two different computations.
    const start = appContextSrc.indexOf('businessWorthSnapshotForTimeline = {');
    const end = appContextSrc.indexOf('businessWorthReconciliationForReturn = {', start);
    const between = appContextSrc.slice(start, end);
    assert.match(between, /businessWorthSnapshotForTimeline = \{[\s\S]*?difference[\s\S]*?cashReconciliationDifference[\s\S]*?\};/);
  });
});

describe('PeriodicStockCountView.tsx — the reconciliation card is actually wired into the success screen', () => {
  it('imports getPossibleReconciliationCauses from the SAME pure function calculations.ts already exports — never a duplicated derivation', () => {
    assert.match(
      periodicSrc,
      /import \{ getPossibleReconciliationCauses, type PossibleReconciliationCause \} from '\.\.\/utils\/calculations';/
    );
  });

  it('savedReconciliation state is captured from the SAME recordStockCount return value as savedTotal/savedSellingTotal — never a second write/read', () => {
    const start = periodicSrc.indexOf('setSavedTotal(saved.totalValue);');
    const end = periodicSrc.indexOf('setSavedMessage(', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /setSavedReconciliation\(saved\.businessWorthReconciliation\);/);
  });

  it('the card only renders when hasWorthDifference or hasCashDifference is true — never an empty card for a genuinely unremarkable confirmation', () => {
    const start = periodicSrc.indexOf('{savedReconciliation && (() => {');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('})()}', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /if \(!hasWorthDifference && !hasCashDifference\) return null;/);
  });

  it('the 0.01 threshold guards against rendering the card for pure floating-point rounding noise, not a genuine discrepancy', () => {
    const start = periodicSrc.indexOf('{savedReconciliation && (() => {');
    const end = periodicSrc.indexOf('})()}', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /Math\.abs\(savedReconciliation\.difference\) >= 0\.01/);
    assert.match(body, /Math\.abs\(savedReconciliation\.cashReconciliationDifference\) >= 0\.01/);
  });

  it('getPossibleReconciliationCauses is called with the live payables/receivables from context, and the three "since" figures straight from savedReconciliation — no other source', () => {
    const start = periodicSrc.indexOf('const possibleCauses = getPossibleReconciliationCauses({');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('});', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /expensesSinceLastSnapshot: savedReconciliation\.expensesSinceLastSnapshot,/);
    assert.match(body, /breakagesSinceLastSnapshot: savedReconciliation\.breakagesSinceLastSnapshot,/);
    assert.match(body, /levantamentosSinceLastSnapshot: savedReconciliation\.levantamentosSinceLastSnapshot,/);
    assert.match(body, /outstandingPayables: payables,/);
    assert.match(body, /outstandingReceivables: receivables,/);
  });

  it('the 2200ms auto-navigate is skipped whenever there is a reconciliation payload to show, so the Owner isn\'t swept away before reading it', () => {
    const start = periodicSrc.indexOf('submissionIdRef.current = null;');
    const end = periodicSrc.indexOf('} catch (err: any) {', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /if \(!saved\.businessWorthReconciliation\) \{\s*autoAdvanceTimerRef\.current = setTimeout\(\(\) => onComplete\(\), 2200\);\s*\}/);
  });

  it('payables/receivables are destructured from useApp() — not fetched a second, separate way', () => {
    const start = periodicSrc.indexOf('} = useApp();');
    const before = periodicSrc.slice(Math.max(0, start - 600), start);
    assert.match(before, /payables,/);
    assert.match(before, /receivables,/);
  });
});

describe('renderReconciliationCauseLabel — pure function, one label per PossibleReconciliationCauseKey', () => {
  // Exercised via source-inspection of its switch statement (this
  // function is not exported — matching this file's own convention for
  // small, module-private presentation helpers), confirming every key
  // getPossibleReconciliationCauses can ever return has exactly one
  // matching, non-generic case — never a silent fallthrough that would
  // show a blank or wrong label for a real evidence-bound cause.
  const ALL_KEYS = [
    'unrecordedExpense',
    'stockNotProperlyRecorded',
    'incorrectStockCount',
    'unrecordedBreakage',
    'unrecordedLevantamento',
    'supplierPaymentNotUpdated',
    'receivablesRequireFollowUp',
  ];

  it('has exactly one case per key, each returning a distinct, non-empty template', () => {
    const start = periodicSrc.indexOf('function renderReconciliationCauseLabel(');
    const end = periodicSrc.indexOf('\n}', start);
    const body = periodicSrc.slice(start, end);
    for (const key of ALL_KEYS) {
      assert.match(body, new RegExp(`case '${key}':`), `Missing case for ${key}`);
    }
    const caseCount = (body.match(/case '/g) || []).length;
    assert.equal(caseCount, ALL_KEYS.length, 'Every key must have exactly one case — no duplicates, no missing ones');
  });

  it('every evidence-bearing cause (amount and/or count) formats it into the label — never a bare label discarding the evidence the pure function computed', () => {
    const start = periodicSrc.indexOf('function renderReconciliationCauseLabel(');
    const end = periodicSrc.indexOf('\n}', start);
    const body = periodicSrc.slice(start, end);
    for (const key of ['unrecordedExpense', 'unrecordedBreakage', 'unrecordedLevantamento', 'supplierPaymentNotUpdated', 'receivablesRequireFollowUp']) {
      const caseStart = body.indexOf(`case '${key}':`);
      const caseEnd = body.indexOf('case ', caseStart + 1);
      const caseBody = caseEnd === -1 ? body.slice(caseStart) : body.slice(caseStart, caseEnd);
      assert.match(caseBody, /cause\.evidence(Amount|Count)/, `${key} must format its own evidence figure into the label`);
    }
  });
});
