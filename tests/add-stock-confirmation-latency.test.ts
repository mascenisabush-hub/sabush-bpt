// Bug fix — Owner-reported, urgent, live with a client: "after data
// filling in stock entry, confirming add stocks delays (it takes time
// to confirm)."
//
// ROOT CAUSE: addMultipleStockBatches (AppContext.tsx) used to `await`
// every item in two loops -- supplier-wording confirmations, then a
// Timeline log per newly-created product, then one more Timeline log
// for the purchase batch itself -- sequentially, one Firestore round
// trip at a time, BEFORE returning to the caller (AddStockView.tsx's
// handleSubmit). All of this ran AFTER the actual stock data (the
// atomic fsBatch.commit()) had already durably saved -- so a purchase
// with several new products, or several supplier-wording
// confirmations, kept the Owner staring at a spinner for one round
// trip per item that had nothing left to do with whether their stock
// was actually saved. The code's own comments already documented the
// correct intent ("Deliberately best-effort past this point: the
// stock itself is already durably recorded... not a reason to make
// the caller believe their stock entry itself failed") but never
// actually acted on it -- the caller still waited for all of it
// regardless.
//
// FIX: this tail work is now a detached, fire-and-forget async block
// -- mirroring triggerTrialActivation's own already-established
// identical pattern a few lines below it -- so the function returns
// the moment the critical fsBatch.commit() above has succeeded, with
// the best-effort supplier-wording/Timeline work continuing
// independently afterward. Internal ordering is completely unchanged
// (the supplier-wording confirmations still run strictly one at a
// time, in order, per their own "sequential, not parallel" comment) --
// only WHEN the caller stops waiting for them changed.
//
// SCOPE: this repository has no DOM/React render harness, and
// addMultipleStockBatches is tightly coupled to the live Firebase
// client SDK (see this repository's own established precedent for why
// that class of function is covered by structural source-text
// inspection — e.g. tests/business-worth-correction-recovery-ui.test.ts's
// own header).
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-confirmation-latency.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

function addMultipleStockBatchesBody(): string {
  const start = appContextSrc.indexOf('const addMultipleStockBatches = async (');
  const end = appContextSrc.indexOf('\n  };', start);
  return appContextSrc.slice(start, end);
}

describe('addMultipleStockBatches — the critical write returns to the caller immediately, not after the best-effort tail work', () => {
  const body = addMultipleStockBatchesBody();

  it('the function is found in the source, well-formed', () => {
    assert.notEqual(body.indexOf('const addMultipleStockBatches'), -1);
    assert.match(body, /await fsBatch\.commit\(\);/);
  });

  it('the critical fsBatch.commit() is immediately followed by a detached, non-awaited async block — not by an awaited loop', () => {
    const commitIdx = body.indexOf('await fsBatch.commit();');
    assert.notEqual(commitIdx, -1);
    const after = body.slice(commitIdx, commitIdx + 2200);
    assert.match(after, /\(async \(\) => \{/);
    // The old, blocking shape directly after commit() must be gone —
    // the supplier-wording loop no longer appears un-detached right
    // after the commit.
    assert.doesNotMatch(body.slice(commitIdx, commitIdx + 60), /if \(resolvedSupplierId\)/);
  });

  it('the detached block is invoked but never awaited, with a defensive .catch so a background failure can never surface as an unhandled rejection', () => {
    const iifeStart = body.indexOf('(async () => {');
    assert.notEqual(iifeStart, -1);
    const nearby = body.slice(iifeStart, iifeStart + 6000);
    assert.match(nearby, /\}\)\(\)\.catch\(\(err\) => \{/);
    // Never `await (async () => { ... })()` — that would defeat the
    // entire fix by re-introducing the blocking wait.
    assert.doesNotMatch(body, /await \(async \(\) => \{/);
  });

  it('supplier-wording confirmations remain strictly sequential inside the detached block — internal ordering is unchanged, only detachment from the caller changed', () => {
    const iifeStart = body.indexOf('(async () => {');
    const nearby = body.slice(iifeStart, iifeStart + 6000);
    assert.match(nearby, /for \(const pending of pendingSupplierWordingConfirmations\) \{/);
    assert.match(nearby, /await confirmSupplierWordingRelationship\(/);
  });

  it('the per-new-product Timeline logging loop remains inside the same detached block', () => {
    const iifeStart = body.indexOf('(async () => {');
    const nearby = body.slice(iifeStart, iifeStart + 6000);
    assert.match(nearby, /for \(const newProduct of newlyCreatedProductNames\) \{/);
    assert.match(nearby, /type: 'product-created',/);
  });

  it('the final stock-batch-created Timeline log remains inside the same detached block, before the block closes', () => {
    const iifeStart = body.indexOf('(async () => {');
    const closeIdx = body.indexOf("})().catch((err) => {", iifeStart);
    assert.notEqual(closeIdx, -1);
    const block = body.slice(iifeStart, closeIdx);
    assert.match(block, /type: 'stock-batch-created',/);
  });

  it('triggerTrialActivation and the return statement come AFTER the detached block is kicked off, not inside it — the function genuinely returns without waiting', () => {
    const closeIdx = body.indexOf('})().catch((err) => {');
    assert.notEqual(closeIdx, -1);
    const after = body.slice(closeIdx, closeIdx + 400);
    assert.match(after, /triggerTrialActivation\(businessId\);/);
    assert.match(after, /return \{ purchaseBatchId: newPurchaseBatchId \};/);
  });

  it('logTimelineEvent itself already swallows its own errors internally (never rejects) — confirming the outer .catch is a pure defensive backstop, not load-bearing for the common case', () => {
    const start = appContextSrc.indexOf('const logTimelineEvent = async (input: {');
    const end = appContextSrc.indexOf('\n  };', start);
    const fnBody = appContextSrc.slice(start, end);
    assert.match(fnBody, /try \{\s*await setDoc\(doc\(db, 'businesses', activeBusinessId, 'timelineEvents', newEvent\.id\), newEvent\);\s*\} catch \(err\) \{/);
  });
});
