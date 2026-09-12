// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10, Item 3 — CHECKPOINT 1 (Data Model + Persistence
// Boundary + Security).
//
// SCOPE: this suite covers what can be verified without a Firestore
// emulator — the write function's structure in AppContext.tsx
// (tightly coupled to the live Firebase client SDK, so covered here by
// structural source-text inspection, matching this repository's own
// established technique for that exact class of function — see
// tests/business-worth-correction-recovery-ui.test.ts's own header),
// and a direct, executed check that the live Business Worth formula
// does not yet include Owner Investment in any form (the Checkpoint 1
// economic boundary — see OwnerInvestment's own type comment,
// apps/tenant/src/types.ts).
//
// [Checkpoint 2 note] The Economic boundary suite below was updated
// when Checkpoint 2/FR-64 was implemented (Implementation Authorization
// §23 item 3; Product Architect's recorded `createdAt` clarification,
// commit 1000bde) — Checkpoint 1's "no Owner Investment term yet"
// assertion is superseded by design, not weakened; the full FR-64
// live-formula proof (boundary cases, double-counting, separation from
// Startup Investment/Levantamento/CAIXER) lives in the dedicated
// tests/owner-investment-checkpoint-2-fr64.test.ts.
//
// The Firestore rules/security boundary (Rule 8 Finding OI-1) and the
// atomic-pairing behavior (Rule 8 Finding OI-2) are covered separately
// in tests/owner-investment-firestore-rules.test.ts, which requires a
// real Firestore emulator (see that file's own SANDBOX DISCLOSURE).
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-1.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const typesSrc = src('apps/tenant/src/types.ts');
const rulesSrc = src('firestore.rules');
const calculationsSrc = src('apps/tenant/src/utils/calculations.ts');

describe('types.ts — OwnerInvestment data model (Specification §43)', () => {
  it('OwnerInvestment interface exists with exactly the authorized fields', () => {
    const start = typesSrc.indexOf('export interface OwnerInvestment {');
    assert.notEqual(start, -1);
    const end = typesSrc.indexOf('\n}', start);
    const body = typesSrc.slice(start, end);
    assert.match(body, /id: string;/);
    assert.match(body, /businessId: string;/);
    assert.match(body, /amount: number;/);
    assert.match(body, /date: string;/);
    assert.match(body, /description\?: string;/);
    assert.match(body, /createdAt: string;/);
    assert.match(body, /createdBy: string;/);
  });

  it('CashLedgerEntry.sourceReference gains an owner-investment type, additively — every prior type value is preserved', () => {
    const start = typesSrc.indexOf('export interface CashLedgerEntry {');
    assert.notEqual(start, -1);
    const end = typesSrc.indexOf('\n}', start);
    const body = typesSrc.slice(start, end);
    assert.match(body, /'receivable' \| 'payable' \| 'expense' \| 'withdrawal' \| 'contagem-reconciliation' \| 'owner-investment' \| 'other'/);
  });

  it('TimelineActivityType gains owner-investment-recorded, additively', () => {
    assert.match(typesSrc, /\|\s*'owner-investment-recorded'/);
  });
});

describe('AppContext.tsx — addOwnerInvestment (Checkpoint 1 write path)', () => {
  const fnStart = appContextSrc.indexOf('const addOwnerInvestment = async ({');
  const fnEnd = appContextSrc.indexOf('\n  };', fnStart) + 5;
  const fnBody = appContextSrc.slice(fnStart, fnEnd);

  it('the function exists and is exposed on the context', () => {
    assert.notEqual(fnStart, -1);
    assert.match(appContextSrc, /addOwnerInvestment: \(params: AddOwnerInvestmentParams\) => Promise<OwnerInvestment>;/);
    assert.match(appContextSrc, /\n\s*addOwnerInvestment,\n/);
  });

  it('rejects when no active business is set', () => {
    assert.match(fnBody, /if \(!activeBusinessId\) throw new Error/);
  });

  it('is Owner-only, client-side (rules are the authoritative backstop)', () => {
    assert.match(fnBody, /if \(!isOwner\) throw new Error/);
  });

  it('rejects amount <= 0 — zero is never valid for Owner Investment, unlike CAIXER', () => {
    assert.match(fnBody, /if \(!\(Number\(amount\) > 0\)\) throw new Error/);
  });

  it('derives a deterministic document id from submissionId, falling back to a random id only when absent — mirroring addWithdrawal exactly', () => {
    assert.match(fnBody, /const investmentId = submissionId \|\| 'oi-' \+ Date\.now\(\) \+ '-' \+ Math\.random\(\)\.toString\(36\)\.substr\(2, 4\);/);
  });

  it('pre-checks for an existing document and returns it unmodified on retry — no duplicate write attempted', () => {
    assert.match(fnBody, /const existingSnap = await getDoc\(investmentRef\);/);
    assert.match(fnBody, /if \(existingSnap\.exists\(\)\) \{\s*return existingSnap\.data\(\) as OwnerInvestment;\s*\}/);
  });

  it('creates exactly one OwnerInvestment and one linked CashLedgerEntry in the SAME atomic batch', () => {
    const batchStart = fnBody.indexOf('const fsBatch = createFirestoreBatch(db);');
    assert.notEqual(batchStart, -1);
    const commitIdx = fnBody.indexOf('await fsBatch.commit();', batchStart);
    assert.notEqual(commitIdx, -1);
    const batchBlock = fnBody.slice(batchStart, commitIdx);
    const setCalls = batchBlock.match(/fsBatch\.set\(/g) ?? [];
    assert.equal(setCalls.length, 2, 'Expected exactly two fsBatch.set() calls — one OwnerInvestment, one CashLedgerEntry.');
    assert.match(batchBlock, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'ownerInvestments', newInvestment\.id\), newInvestment\);/);
    assert.match(batchBlock, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId\), cashLedgerEntry\);/);
  });

  it('the linked CashLedgerEntry is direction=inflow, category=other-governed-movement, with a dedicated owner-investment sourceReference', () => {
    const entryStart = fnBody.indexOf('const cashLedgerEntry: CashLedgerEntry = {');
    assert.notEqual(entryStart, -1);
    const entryEnd = fnBody.indexOf('};', entryStart);
    const entryBody = fnBody.slice(entryStart, entryEnd);
    assert.match(entryBody, /direction: 'inflow',/);
    assert.match(entryBody, /category: 'other-governed-movement',/);
    assert.match(entryBody, /sourceReference: \{ type: 'owner-investment', id: newInvestment\.id \},/);
  });

  it('the Timeline event is logged strictly AFTER the batch commit — never before, never unconditionally', () => {
    const commitIdx = fnBody.indexOf('await fsBatch.commit();');
    const timelineIdx = fnBody.indexOf('await logTimelineEvent({');
    assert.notEqual(commitIdx, -1);
    assert.notEqual(timelineIdx, -1);
    assert.ok(timelineIdx > commitIdx, 'logTimelineEvent must be called after fsBatch.commit() in source order.');
    // No try/catch wraps the commit call locally in this function —
    // meaning a thrown commit failure propagates out of
    // addOwnerInvestment before the Timeline call is ever reached
    // (confirmed by there being no intervening catch block between the
    // two calls).
    const between = fnBody.slice(commitIdx, timelineIdx);
    assert.doesNotMatch(between, /catch/);
  });

  it('uses type owner-investment-recorded for the Timeline event', () => {
    assert.match(fnBody, /type: 'owner-investment-recorded',/);
  });
});

describe('Economic boundary (Checkpoint 1 boundary superseded by Checkpoint 2/FR-64 — see owner-investment-checkpoint-2-fr64.test.ts for the full live-formula proof)', () => {
  it('computeCaseALiveBusinessWorth now HAS an ownerInvestment-related term — Checkpoint 2/FR-64 authorizes exactly this, per the Product Architect\'s recorded createdAt clarification (commit 1000bde)', () => {
    const start = calculationsSrc.indexOf('function computeCaseALiveBusinessWorth(');
    assert.notEqual(start, -1);
    // The naive `indexOf('\n}', start)` this suite's Checkpoint 1 version
    // used matches the PARAMS object's own closing brace
    // ("}): number {"), truncating the body before the function's real
    // closing brace — harmless for a `doesNotMatch` assertion (Checkpoint
    // 1), but wrong for this `match` assertion (Checkpoint 2), so this
    // version finds the true end: the next line consisting of a single
    // top-level `}` after the params object's own `): number {` line.
    const paramsEnd = calculationsSrc.indexOf('): number {', start);
    assert.notEqual(paramsEnd, -1);
    const end = calculationsSrc.indexOf('\n}\n', paramsEnd);
    assert.notEqual(end, -1);
    const body = calculationsSrc.slice(start, end);
    assert.match(body, /ownerInvestmentsSinceSnapshot/, 'Checkpoint 2/FR-64 must add the ownerInvestmentsSinceSnapshot term to the live formula.');
  });

  it('the live formula\'s CashLedgerEntry filter does not include other-governed-movement — the linked ledger entry cannot be double-counted even transiently', () => {
    const start = calculationsSrc.indexOf('const cashLedgerNetSinceSnapshot = Number(');
    assert.notEqual(start, -1);
    const end = calculationsSrc.indexOf(');', calculationsSrc.indexOf('.toFixed(2)', start)) + 2;
    const body = calculationsSrc.slice(start, end);
    assert.match(body, /category === 'customer-payment' \|\| e\.category === 'supplier-payment'/);
    assert.doesNotMatch(body, /other-governed-movement/);
  });

  it('BusinessWorthSnapshot does not yet expose ownerInvestmentSinceLastSnapshot — the drill-down field remains a later checkpoint', () => {
    const start = typesSrc.indexOf('export interface BusinessWorthSnapshot {');
    assert.notEqual(start, -1);
    const end = typesSrc.indexOf('\nexport interface', start + 10);
    const body = typesSrc.slice(start, end);
    assert.doesNotMatch(body, /ownerInvestmentSinceLastSnapshot\?:/);
  });
});

describe('firestore.rules — ownerInvestments (Rule 8 Finding OI-1, source-text confirmation)', () => {
  it('the match block exists, structurally mirroring startupInvestmentEntries', () => {
    const start = rulesSrc.indexOf('match /ownerInvestments/{investmentId} {');
    assert.notEqual(start, -1);
    const end = rulesSrc.indexOf('\n      }', start);
    const body = rulesSrc.slice(start, end);
    assert.match(body, /allow read: if isOwnerOf\(businessId\);/);
    assert.match(body, /allow create: if isOwnerOf\(businessId\) &&/);
    assert.match(body, /request\.resource\.data\.get\('amount', 0\) > 0 &&/);
    assert.match(body, /request\.resource\.data\.get\('createdBy', null\) == request\.auth\.uid;/);
    assert.match(body, /allow update, delete: if false;/);
  });

  it('does not reuse or widen the startupInvestmentEntries or cashLedgerEntries rule blocks themselves', () => {
    const ownerInvestmentsStart = rulesSrc.indexOf('match /ownerInvestments/{investmentId} {');
    const ownerInvestmentsEnd = rulesSrc.indexOf('\n      }', ownerInvestmentsStart);
    const body = rulesSrc.slice(ownerInvestmentsStart, ownerInvestmentsEnd);
    assert.doesNotMatch(body, /startupInvestmentEntries/);
    assert.doesNotMatch(body, /cashLedgerEntries/);
  });

  it('isOwnerOf/isMemberOf definitions are unchanged by this checkpoint (no new authorization primitive)', () => {
    assert.match(rulesSrc, /function isMemberOf\(businessId\) \{/);
    assert.match(rulesSrc, /function isOwnerOf\(businessId\) \{/);
  });
});
