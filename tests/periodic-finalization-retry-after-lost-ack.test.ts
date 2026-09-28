// Regression: a retry of a periodic finalization whose FIRST attempt actually committed (lost ack /
// timeout) re-issued batch.set() on the existing stockcount-periodic-<submissionId> document. Firestore
// treats that as an update, and firestore.rules deny every stockCounts update (Decision 57), so the Owner
// got a permission error although the count was saved. recordStockCount must detect it and succeed.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
const rules = readFileSync('firestore.rules', 'utf8');
const fn = src.slice(src.indexOf('const recordStockCount = async'), src.indexOf('const voidInitialStockConfirmation'));

describe('premise: stockCounts are immutable server-side', () => {
  it('firestore.rules deny update (and delete) on /stockCounts/{id}', () => {
    const block = rules.slice(rules.indexOf('match /stockCounts/{stockCountId} {'));
    const end = block.indexOf('\n      }\n');
    const body = block.slice(0, end);
    assert.match(body, /allow update: if false;/);
    assert.match(body, /allow delete: if false;/);
  });
});

describe('recordStockCount recognizes an already-finalized submission', () => {
  it('asks the SERVER (not the cache) for the deterministic count id', () => {
    const helper = src.slice(src.indexOf('const findAlreadyFinalizedPeriodicCount'), src.indexOf('const cleanupPeriodicDraftBestEffort'));
    assert.match(helper, /getDocFromServer\(doc\(db, 'businesses', businessId, 'stockCounts', 'stockcount-periodic-' \+ submissionId\)\)/);
  });

  it('an unreachable server is NOT treated as "already finalized" (falls through to the normal path)', () => {
    const helper = src.slice(src.indexOf('const findAlreadyFinalizedPeriodicCount'), src.indexOf('const cleanupPeriodicDraftBestEffort'));
    assert.match(helper, /catch \(err\) \{[\s\S]*?return null;/);
  });

  it('runs for periodic types only, before any batch is built, and returns the stored count', () => {
    const at = fn.indexOf('findAlreadyFinalizedPeriodicCount(businessId, submissionId)');
    assert.ok(at > 0);
    assert.ok(at < fn.indexOf('createFinalizationBatch('), 'must run before the batch is built');
    assert.match(fn, /if \(type !== 'initial' && submissionId\) \{\s*\n\s*const alreadyFinalized = await findAlreadyFinalizedPeriodicCount/);
    assert.match(fn, /return alreadyFinalized;/);
  });

  it('cleans up the leftover draft best-effort and never throws from it', () => {
    const helper = src.slice(src.indexOf('const cleanupPeriodicDraftBestEffort'), src.indexOf('const recordStockCount = async'));
    assert.match(helper, /try \{[\s\S]*?\} catch \(err\) \{\s*\n\s*console\.warn/);
  });
});
