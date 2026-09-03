// Initial Stock Accidental Confirmation Recovery ("Void & Redo") — Step
// 5/5 of the signed Implementation Authorization. This suite covers
// exactly the scope named by that document's §6 Testing Boundary and the
// Implementation Plan's §6, for everything reachable WITHOUT a live
// Firestore instance:
//
//   1. computeInitialStockVoidEligibility (calculations.ts) — pure,
//      directly unit-tested (no source-inspection needed; it's a real,
//      importable, side-effect-free function).
//   2. Draft reconstruction (voidInitialStockConfirmation, AppContext.tsx)
//      — source-level regression guards, following this repository's own
//      established precedent (see initial-stock-confirmation.test.ts's
//      own header comment) for code that's tightly coupled to the live
//      Firebase client SDK and has no jsdom/component-test harness here.
//   3. Chain-slot resolution (recordStockCount's redo branch,
//      AppContext.tsx) — source-level regression guards.
//   4. The read-path exclusion (Rule 8 Finding F1) — source-level
//      regression guard.
//   5. UI wiring (InitialStockCountView.tsx) — source-level regression
//      guards, following initial-stock-dual-valuation-basis-wiring.test.ts's
//      own established precedent for this exact technique.
//
// Firestore-rules-emulator-level coverage (Owner-only enforcement, the
// 12-hour boundary [Recovery Window Amendment, amending the original
// 30-minute value], the chainPosition-4 ceiling, tenant isolation,
// the subscription exemption's scope, concurrency) already exists in
// tests/firestore-rules.test.ts's own "Void & Redo" describe block
// (Step 2/5) — this suite adds the individual-chain-slot and
// race-adjacent cases that block wasn't asked to cover, rather than
// duplicating what's already there.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-void-redo.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { Timestamp } from 'firebase/firestore';
import { computeInitialStockVoidEligibility } from '../apps/tenant/src/utils/calculations';
import type { StockCount } from '../apps/tenant/src/types';

// ------------------------------------------------------------------
// 1. computeInitialStockVoidEligibility — pure unit tests
// ------------------------------------------------------------------

function makeConfirmation(overrides: Partial<StockCount> = {}): StockCount {
  return {
    id: 'initial',
    type: 'initial',
    date: '2026-08-20',
    items: [],
    totalValue: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('computeInitialStockVoidEligibility — no confirmedAt (legacy record, pre-feature)', () => {
  it('is never eligible for a confirmation with no confirmedAt at all', () => {
    const result = computeInitialStockVoidEligibility(makeConfirmation({ confirmedAt: undefined }));
    assert.equal(result.eligible, false);
    assert.equal(result.windowExpiresAt, null);
    assert.equal(result.msRemaining, 0);
  });

  it('is never eligible for a null/undefined StockCount (no active confirmation at all)', () => {
    assert.equal(computeInitialStockVoidEligibility(null).eligible, false);
    assert.equal(computeInitialStockVoidEligibility(undefined).eligible, false);
  });

  it('does NOT infer or substitute any timestamp — a confirmation with chainPosition set but no confirmedAt is still ineligible', () => {
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt: undefined }));
    assert.equal(result.eligible, false);
  });
});

describe('computeInitialStockVoidEligibility — 12-hour window [Recovery Window Amendment, amending the original 30-minute value]', () => {
  it('is eligible well within the window (2 hours elapsed, chainPosition 1)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 2 * 60 * 60 * 1000);
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, true);
    // 10 of the 12 hours remain.
    assert.equal(result.msRemaining, 10 * 60 * 60 * 1000);
    assert.equal(result.windowExpiresAt!.getTime(), confirmedAt.toMillis() + 12 * 60 * 60 * 1000);
  });

  it('is eligible several hours later — the real "Owner discovers the mistake hours after confirming" path this amendment exists for (11 hours elapsed)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 11 * 60 * 60 * 1000);
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 1 * 60 * 60 * 1000);
  });

  it('is ineligible just past the 12-hour boundary (12 hours + 1 second elapsed)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - (12 * 60 * 60 * 1000 + 1000));
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, false);
    assert.equal(result.msRemaining, 0);
  });

  it('is eligible one second before the boundary (11:59:59 elapsed)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - (12 * 60 * 60 * 1000 - 1000));
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 1000);
  });

  it('is ineligible exactly at the boundary (now === windowExpiresAt, the "<" comparison excludes it)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 12 * 60 * 60 * 1000);
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, false);
  });

  it('msRemaining never goes negative, however far past expiry', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 1, confirmedAt }), now);
    assert.equal(result.eligible, false);
    assert.equal(result.msRemaining, 0);
  });
});

describe('computeInitialStockVoidEligibility — chainPosition ceiling (Confirmation #4, Finding E1 / Specification §21)', () => {
  it('Confirmation #4, even with a brand-new window (0 minutes elapsed), is never eligible', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime());
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 4, confirmedAt }), now);
    assert.equal(result.eligible, false);
  });

  it('Confirmation #4 still reports a REAL windowExpiresAt/msRemaining — the window is visible/measurable, only the void step itself is blocked (§21 clarification)', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours elapsed
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: 4, confirmedAt }), now);
    assert.equal(result.eligible, false);
    // NOT the "no confirmedAt" case's flattened 0/null — this is a real,
    // still-computed window, deliberately distinguished from ineligibility
    // due to a missing timestamp.
    assert.equal(result.msRemaining, 10 * 60 * 60 * 1000);
    assert.ok(result.windowExpiresAt !== null);
    assert.equal(result.windowExpiresAt!.getTime(), confirmedAt.toMillis() + 12 * 60 * 60 * 1000);
  });

  it('chainPosition 1, 2, and 3 are each independently eligible within their own fresh window — only 4 is special-cased', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    for (const chainPosition of [1, 2, 3] as const) {
      const confirmedAt = Timestamp.fromMillis(now.getTime() - 1000);
      const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition, confirmedAt }), now);
      assert.equal(result.eligible, true, `chainPosition ${chainPosition} should be eligible within a fresh window`);
    }
  });

  it('a confirmation with chainPosition absent defaults to treating it as position 1 (pre-existing single-original-confirmation shape), not as the position-4 ceiling', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const confirmedAt = Timestamp.fromMillis(now.getTime() - 1000);
    const result = computeInitialStockVoidEligibility(makeConfirmation({ chainPosition: undefined, confirmedAt }), now);
    assert.equal(result.eligible, true);
  });
});

// ------------------------------------------------------------------
// 2. Draft reconstruction — voidInitialStockConfirmation
//    (AppContext.tsx) — source-level regression guards
// ------------------------------------------------------------------

const contextSource = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} in AppContext.tsx — has it been renamed?`);
  const rest = source.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

const voidFnBody = extractFunctionBody(contextSource, 'const voidInitialStockConfirmation = async (');

describe('voidInitialStockConfirmation — draft reconstruction (Rule 8 Finding A1, FR-3)', () => {
  it('maps every field FR-3 requires (productName, quantity, costPrice) from the voided confirmation\'s own items — not from any other source', () => {
    assert.match(voidFnBody, /productName: item\.productName,/);
    assert.match(voidFnBody, /quantity: item\.quantity,/);
    assert.match(voidFnBody, /costPrice: item\.costPrice,/);
  });

  it('generates a FRESH client-side row id per item — never reuses/derives from the confirmed StockCountItem (which has no id of its own)', () => {
    assert.match(voidFnBody, /id: 'draft-item-' \+ Date\.now\(\)/);
  });

  it('carries the voided confirmation\'s own date, unmodified', () => {
    assert.match(voidFnBody, /date: initialStockCount\.date,/);
  });

  it('carries initialCapitalBasis through to the reconstructed draft ONLY as a conditional spread (never unconditionally, since older confirmations may lack it)', () => {
    assert.match(voidFnBody, /\.\.\.\(initialStockCount\.initialCapitalBasis \? \{ initialCapitalBasis: initialStockCount\.initialCapitalBasis \} : \{\}\)/);
  });

  it('the VoidRecord write is queued and committed BEFORE the draft is reconstructed — void is not contingent on reconstruction succeeding', () => {
    const voidRecordSetIndex = voidFnBody.indexOf("fsBatch.set(doc(db, 'businesses', businessId, 'voidRecords'");
    const commitIndex = voidFnBody.indexOf('await fsBatch.commit();');
    const reconstructIndex = voidFnBody.indexOf('const reconstructedDraft');
    assert.notEqual(voidRecordSetIndex, -1, 'Expected the voidRecords fsBatch.set(...) call to exist.');
    assert.notEqual(commitIndex, -1, 'Expected exactly one fsBatch.commit() call.');
    assert.notEqual(reconstructIndex, -1, 'Expected the reconstructedDraft to be built in this function.');
    assert.ok(voidRecordSetIndex < commitIndex, 'VoidRecord must be queued before commit.');
    assert.ok(commitIndex < reconstructIndex, 'VoidRecord must be committed before the draft is reconstructed.');
  });

  it('the VoidRecord\'s voidedConfirmationId equals the target confirmation\'s own id — never a different/fabricated value', () => {
    assert.match(voidFnBody, /voidedConfirmationId: targetId,/);
    assert.match(voidFnBody, /const targetId = initialStockCount\.id;/);
  });

  it('voidedAt uses the genuine serverTimestamp() sentinel — never a client-computed Date', () => {
    assert.match(voidFnBody, /voidedAt: serverTimestamp\(\),/);
  });

  it('the reconstructed draft is set into React state directly (transient/in-memory) — this function never itself writes to the stockCountDrafts collection (Rule 8 Finding K1: draft persistence was never part of the authorized exemption)', () => {
    assert.doesNotMatch(voidFnBody, /stockCountDrafts/);
    assert.match(voidFnBody, /setInitialStockDraft\(reconstructedDraft\);/);
  });

  it('refuses to void when there is no active confirmation at all', () => {
    assert.match(voidFnBody, /if \(!initialStockCount\) \{/);
  });
});

// ------------------------------------------------------------------
// 3. Chain-slot resolution — recordStockCount's redo branch
//    (AppContext.tsx) — source-level regression guards
// ------------------------------------------------------------------

const recordFnBody = extractFunctionBody(contextSource, 'const recordStockCount = async (');

describe('recordStockCount — chain-slot resolution for a redo (Rule 8 Finding D1, E1)', () => {
  it('defines the exact fixed predecessor -> {chainPosition, docId} mapping: initial->2/initial-2, initial-2->3/initial-3, initial-3->4/initial-4', () => {
    assert.match(recordFnBody, /initial: \{ chainPosition: 2, docId: 'initial-2' \},/);
    assert.match(recordFnBody, /'initial-2': \{ chainPosition: 3, docId: 'initial-3' \},/);
    assert.match(recordFnBody, /'initial-3': \{ chainPosition: 4, docId: 'initial-4' \},/);
  });

  it('does NOT define a mapping entry for initial-4 as a predecessor — Confirmation #4 can never be a redo\'s starting point (no 5th confirmation, ever)', () => {
    const mapBlockMatch = recordFnBody.match(/const redoChainSlotByPredecessor:[\s\S]*?\};/);
    assert.ok(mapBlockMatch, 'expected to find the redoChainSlotByPredecessor map literal');
    assert.doesNotMatch(mapBlockMatch![0], /'initial-4':/);
  });

  it('rejects an unrecognized predecessor id client-side, as a defensive (non-authoritative) guard', () => {
    assert.match(recordFnBody, /if \(!slot\) \{/);
    assert.match(recordFnBody, /throw new Error\('Não é possível refazer esta confirmação/);
  });

  it('the guard against a second ORIGINAL confirmation is skipped for a legitimate redo (Finding F2) — only fires when redoesConfirmationId is absent', () => {
    assert.match(recordFnBody, /if \(type === 'initial' && !redoesConfirmationId && hasInitialStockCount\) \{/);
  });

  it('a redo confirmation\'s confirmedAt is written via the genuine serverTimestamp() sentinel, never a client-computed value', () => {
    // The WithFieldValue<StockCount> payload is what actually persists
    // confirmedAt — this asserts that payload uses the real sentinel.
    assert.match(recordFnBody, /confirmedAt: serverTimestamp\(\)/);
  });

  it('an original confirmation always resolves to chainPosition 1 / doc id \'initial\' — the redo machinery does not alter the ordinary (non-redo) path', () => {
    assert.match(recordFnBody, /let initialConfirmationId = 'initial';/);
    assert.match(recordFnBody, /let initialChainPosition: 1 \| 2 \| 3 \| 4 = 1;/);
  });
});

// ------------------------------------------------------------------
// 4. Read-path exclusion — Rule 8 Finding F1 — source-level
//    regression guard
// ------------------------------------------------------------------

describe('initialStockCount / hasInitialStockCount derivation — excludes voided confirmations (Rule 8 Finding F1)', () => {
  it('builds voidedConfirmationIds from voidRecords, and initialStockCount is the type==initial entry whose id is NOT in that set', () => {
    assert.match(contextSource, /const voidedConfirmationIds = new Set\(voidRecords\.map\(\(v\) => v\.voidedConfirmationId\)\);/);
    assert.match(
      contextSource,
      /const initialStockCount =\s*\n\s*stockCounts\.find\(\(s\) => s\.type === 'initial' && !voidedConfirmationIds\.has\(s\.id\)\) \|\| null;/
    );
  });

  it('initialStockConfirmationChain is derived from ALL type==initial entries (voided and active), sorted by chainPosition, for history display — never filtered like initialStockCount is', () => {
    assert.match(
      contextSource,
      /const initialStockConfirmationChain = stockCounts\s*\n\s*\.filter\(\(s\) => s\.type === 'initial'\)/
    );
    assert.match(contextSource, /\.sort\(\(a, b\) => \(a\.chainPosition \?\? 1\) - \(b\.chainPosition \?\? 1\)\);/);
  });

  it('initialCapitalValue (feeding Capital Growth) resolves from initialStockCount — the already-voided-excluding derivation — never from the raw stockCounts array or initialStockConfirmationChain directly', () => {
    assert.match(contextSource, /const initialCapitalValue = resolveInitialCapitalValue\(initialStockCount\);/);
    // Regression guard: no alternate resolution path reading
    // initialStockConfirmationChain into initialCapitalValue anywhere in
    // this file.
    assert.doesNotMatch(contextSource, /resolveInitialCapitalValue\(initialStockConfirmationChain/);
  });
});

// ------------------------------------------------------------------
// 5. UI wiring — InitialStockCountView.tsx — source-level regression
//    guards (this repository has no React/DOM test harness — see
//    initial-stock-dual-valuation-basis-wiring.test.ts's own precedent)
// ------------------------------------------------------------------

const viewSource = readFileSync(
  new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('InitialStockCountView.tsx — accidental-confirmation prevention (FR-18, FR-19, FR-20)', () => {
  it('handleSubmit reveals the secondary-confirmation panel on a first call, and only proceeds to the actual write when showConfirmStep is already true', () => {
    const handleSubmitMatch = viewSource.match(/const handleSubmit = async[\s\S]*?\n  \};/);
    assert.ok(handleSubmitMatch, 'expected to find handleSubmit');
    const body = handleSubmitMatch![0];
    assert.match(body, /if \(!showConfirmStep\) \{\s*\n\s*setShowConfirmStep\(true\);\s*\n\s*return;/);
  });

  it('the Confirm action is visually separated from ordinary editing controls by the Total card, not adjacent to product-row edit controls', () => {
    const totalCardIndex = viewSource.indexOf('Capital Inicial Total');
    // There are two "Capital Inicial Total" cards in this file (the
    // confirmed-summary screen and the pre-confirm form) — use the
    // second occurrence (the form's), matching where the Confirm button
    // actually sits.
    const secondTotalCardIndex = viewSource.indexOf('Capital Inicial Total', totalCardIndex + 1);
    // Anchor on the actual JSX button markup, not the FR-19 explanatory
    // comment above handleSubmit — that comment quotes the same button
    // label ("Confirmar Capital Inicial") in prose, much earlier in the
    // file, and would give a false pass/fail here if matched instead.
    // Matched as a whitespace-tolerant pattern (not an exact string)
    // because the [Draft-loss fix] flush-before-confirm change wraps
    // this same redoingConfirmationId ternary across multiple lines
    // alongside an isFlushingDraft branch — the underlying label logic
    // this test cares about is unchanged, only its formatting is.
    const confirmButtonJsxMatch = viewSource.match(
      /redoingConfirmationId\s*\?\s*'Confirmar Nova Contagem'\s*:\s*'Confirmar Capital Inicial'/
    );
    assert.ok(secondTotalCardIndex !== -1, 'Expected to find the form\'s Total card.');
    assert.ok(confirmButtonJsxMatch, 'Expected to find the actual Confirm button JSX.');
    assert.ok(
      secondTotalCardIndex < confirmButtonJsxMatch!.index!,
      'Expected the Total card to precede the Confirm action in source/render order.'
    );
  });

  it('the secondary-confirmation panel shows consequence messaging, distinct for an original vs. a redo confirmation', () => {
    assert.match(viewSource, /redoingConfirmationId \? \(/);
    assert.match(viewSource, /Esta nova contagem vai substituir a confirmação anulada/);
    assert.match(viewSource, /Tem 12 horas após confirmar para anular e refazer/);
  });
});

describe('InitialStockCountView.tsx — recovery-window visibility (FR-21)', () => {
  it('the recovery banner is gated exclusively on initialStockVoidEligibility.eligible', () => {
    assert.match(viewSource, /\{initialStockVoidEligibility\.eligible && \(/);
  });

  it('the countdown display reads msRemaining from initialStockVoidEligibility, not a separately-tracked local timer', () => {
    assert.match(viewSource, /formatMsRemaining\(initialStockVoidEligibility\.msRemaining\)/);
  });

  it('the void action itself also requires its own explicit secondary confirmation (handleVoidAndRedo mirrors handleSubmit\'s two-step pattern)', () => {
    const handleVoidMatch = viewSource.match(/const handleVoidAndRedo = async \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(handleVoidMatch, 'expected to find handleVoidAndRedo');
    assert.match(handleVoidMatch![0], /if \(!showVoidConfirmStep\) \{\s*\n\s*setShowVoidConfirmStep\(true\);\s*\n\s*return;/);
  });

  it('handleVoidAndRedo does not itself re-check the 12-hour window or chainPosition client-side — authorization/window/ceiling enforcement remains entirely firestore.rules\', never reimplemented here', () => {
    const handleVoidMatch = viewSource.match(/const handleVoidAndRedo = async \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(handleVoidMatch);
    assert.doesNotMatch(handleVoidMatch![0], /12 \* 60 \* 60 \* 1000/);
    assert.doesNotMatch(handleVoidMatch![0], /30 \* 60 \* 1000/);
    assert.doesNotMatch(handleVoidMatch![0], /chainPosition/);
  });
});

describe('InitialStockCountView.tsx — history distinguishes voided from active (FR-9, FR-10)', () => {
  it('every chain entry\'s voided/active status is derived by cross-referencing voidRecords, never inferred from timestamps or ordering', () => {
    assert.match(viewSource, /const isVoided = voidRecords\.some\(\(v\) => v\.voidedConfirmationId === count\.id\);/);
  });

  it('renders the ATIVA/ANULADA label directly from that cross-reference', () => {
    assert.match(viewSource, /\{isVoided \? 'ANULADA' : 'ATIVA'\}/);
  });

  it('iterates initialStockConfirmationChain (every confirmation ever, up to 4) — not just the currently-active one', () => {
    assert.match(viewSource, /\{initialStockConfirmationChain\.map\(\(count\) => \{/);
  });
});

describe('InitialStockCountView.tsx — redo gets a fresh basis selection, never inherited (FR-6, I-6)', () => {
  it('handleVoidAndRedo never sets initialCapitalBasis from the voided confirmation — no call to setInitialCapitalBasis anywhere in its body', () => {
    const handleVoidMatch = viewSource.match(/const handleVoidAndRedo = async \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(handleVoidMatch);
    assert.doesNotMatch(handleVoidMatch![0], /setInitialCapitalBasis/);
  });

  it('initialCapitalBasis remains defaulted to \'cost\' at component-state-declaration time — the same default an original confirmation gets, never a redo-specific pre-fill', () => {
    assert.match(viewSource, /const \[initialCapitalBasis, setInitialCapitalBasis\] = useState<InitialCapitalBasis>\('cost'\);/);
  });
});

describe('InitialStockCountView.tsx — blocked users can complete the recovery/reconfirmation path under Option A (Rule 8 Finding K1)', () => {
  it('the subscription-blocked notice is skipped exactly while mid-redo (redoingConfirmationId set) — never for any other case', () => {
    // [Decision 41E — Subscription-Blocked Draft Access / Read-Only
    // Recovery] The guard condition itself
    // (`subscriptionBlocksNewRecords && !redoingConfirmationId`) is
    // unchanged — the redo exemption this test proves is fully intact
    // — but the body is no longer an immediate, unconditional
    // `return <SubscriptionBlockedNotice />;`: 41E branches further on
    // the governed draft-listener state first, only falling back to
    // SubscriptionBlockedNotice for the "no existing draft" case (see
    // that branch's own comment for the full reasoning). The guard
    // CONDITION — the actual thing this test's title is about — is
    // still exactly the same expression.
    assert.match(viewSource, /if \(subscriptionBlocksNewRecords && !redoingConfirmationId\) \{/);
    // And SubscriptionBlockedNotice is still reachable from inside that
    // same guarded block (the confirmed-no-draft fallback), proving the
    // guard still leads there for that case rather than to some
    // entirely different, ungoverned path.
    const guardIdx = viewSource.indexOf('if (subscriptionBlocksNewRecords && !redoingConfirmationId) {');
    const nextTopLevelGuardIdx = viewSource.indexOf(
      "if (!draftLoaded && !redoingConfirmationId && initialStockDraftListenerState === 'load-error') {"
    );
    assert.notEqual(guardIdx, -1);
    assert.notEqual(nextTopLevelGuardIdx, -1);
    const guardedBlock = viewSource.slice(guardIdx, nextTopLevelGuardIdx);
    assert.match(guardedBlock, /return <SubscriptionBlockedNotice \/>;/);
  });

  it('the confirmed-summary screen (showing the recovery banner and Anular e Refazer action) itself renders regardless of subscriptionBlocksNewRecords — the guard above is the ONLY place that notice can short-circuit rendering', () => {
    const summaryScreenGuardIndex = viewSource.indexOf("if (hasInitialStockCount && !redoingConfirmationId) {");
    const blockedNoticeGuardIndex = viewSource.indexOf('if (subscriptionBlocksNewRecords && !redoingConfirmationId) {');
    assert.ok(summaryScreenGuardIndex !== -1 && blockedNoticeGuardIndex !== -1);
    // The confirmed-summary screen's own early return happens BEFORE the
    // subscription-blocked guard is ever reached — i.e. it is not gated
    // behind subscription status at all.
    assert.ok(summaryScreenGuardIndex < blockedNoticeGuardIndex);
  });
});

describe('InitialStockCountView.tsx — redoingConfirmationId reset on business switch (no cross-business leakage)', () => {
  it('the business-switch reset effect clears every Void & Redo local state field', () => {
    const resetEffectMatch = viewSource.match(/useEffect\(\(\) => \{\s*\n\s*if \(activeBusinessId === loadedForBusinessId\) return;[\s\S]*?\}, \[activeBusinessId\]\);/);
    assert.ok(resetEffectMatch, 'expected to find the business-switch reset effect');
    const body = resetEffectMatch![0];
    assert.match(body, /setRedoingConfirmationId\(null\);/);
    assert.match(body, /setIsVoiding\(false\);/);
    assert.match(body, /setVoidError\(null\);/);
    assert.match(body, /setShowConfirmStep\(false\);/);
    assert.match(body, /setShowVoidConfirmStep\(false\);/);
  });
});
