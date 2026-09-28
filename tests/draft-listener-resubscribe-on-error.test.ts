// Regression: a Firestore onSnapshot listener is dead after its error callback fires. The draft
// listeners' error UI promised "esta página tentará novamente automaticamente" but nothing ever
// re-attached them, so one transient error left Contagem / Initial Stock on the error card until reload.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subscribeWithRetry, RESUBSCRIBE_DELAYS_MS } from '../apps/tenant/src/lib/resubscribeOnError';

function fakeScheduler() {
  const pending: { fn: () => void; ms: number; id: number }[] = [];
  let next = 1;
  return {
    pending,
    scheduler: {
      setTimeout: (fn: () => void, ms: number) => {
        const id = next++;
        pending.push({ fn, ms, id });
        return id;
      },
      clearTimeout: (id: unknown) => {
        const i = pending.findIndex((p) => p.id === id);
        if (i !== -1) pending.splice(i, 1);
      },
    },
    runNext() {
      const p = pending.shift();
      assert.ok(p, 'expected a scheduled re-attach');
      p.fn();
      return p.ms;
    },
  };
}

describe('subscribeWithRetry', () => {
  it('attaches once immediately', () => {
    let attaches = 0;
    const { scheduler } = fakeScheduler();
    subscribeWithRetry(() => { attaches++; return () => {}; }, RESUBSCRIBE_DELAYS_MS, scheduler);
    assert.equal(attaches, 1);
  });

  it('re-attaches after an error, with increasing, capped backoff', () => {
    const errorFns: (() => void)[] = [];
    const s = fakeScheduler();
    subscribeWithRetry((retry) => { errorFns.push(retry); return () => {}; }, [10, 20, 30], s.scheduler);
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      errorFns[errorFns.length - 1]();
      delays.push(s.runNext());
    }
    assert.deepEqual(delays, [10, 20, 30, 30, 30]);
    assert.equal(errorFns.length, 6);
  });

  it('a dead listener schedules at most one re-attach even if retry is called repeatedly', () => {
    let retryFn: () => void = () => {};
    const s = fakeScheduler();
    subscribeWithRetry((retry) => { retryFn = retry; return () => {}; }, [10], s.scheduler);
    retryFn();
    retryFn();
    assert.equal(s.pending.length, 1);
  });

  it('never calls unsubscribe on a listener the SDK already terminated', () => {
    let retryFn: () => void = () => {};
    let unsubCalls = 0;
    const s = fakeScheduler();
    const dispose = subscribeWithRetry((retry) => { retryFn = retry; return () => { unsubCalls++; }; }, [10], s.scheduler);
    retryFn();
    dispose();
    assert.equal(unsubCalls, 0);
  });

  it('dispose unsubscribes the live listener and cancels a pending re-attach (no leak after unmount/business switch)', () => {
    let attaches = 0;
    let unsubCalls = 0;
    let retryFn: () => void = () => {};
    const s = fakeScheduler();
    const dispose = subscribeWithRetry(
      (retry) => { attaches++; retryFn = retry; return () => { unsubCalls++; }; },
      [10],
      s.scheduler
    );
    retryFn();
    s.runNext(); // re-attached (attach #2), now live
    retryFn(); // dies again, re-attach pending
    dispose();
    assert.equal(s.pending.length, 0);
    assert.equal(attaches, 2);
    // live listener #2 died before dispose, so nothing live to unsubscribe
    assert.equal(unsubCalls, 0);

    let unsub2 = 0;
    const s2 = fakeScheduler();
    const dispose2 = subscribeWithRetry(() => () => { unsub2++; }, [10], s2.scheduler);
    dispose2();
    assert.equal(unsub2, 1);
  });

  it('handles an error callback that fires synchronously inside start()', () => {
    const s = fakeScheduler();
    let attaches = 0;
    subscribeWithRetry((retry) => { attaches++; if (attaches === 1) retry(); return () => {}; }, [10], s.scheduler);
    assert.equal(s.pending.length, 1);
    s.runNext();
    assert.equal(attaches, 2);
  });
});

describe('AppContext wiring', () => {
  const ctx = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');
  for (const [decl, stateCall] of [
    ['unsubInitialDraft', "setInitialStockDraftListenerState('load-error');"],
    ['unsubPeriodicDraftMeta', "setPeriodicStockDraftMetaListenerState('load-error');"],
    ['unsubPeriodicDraftItems', "setPeriodicStockDraftItemsListenerState('load-error');"],
  ] as const) {
    it(`${decl} is wrapped in subscribeWithRetry and retries only from the Owner load-error branch`, () => {
      const start = ctx.indexOf(`const ${decl} = subscribeWithRetry((retryAfterError) => onSnapshot(`);
      assert.notEqual(start, -1);
      const body = ctx.slice(start, ctx.indexOf('\n    ));', start));
      const ownerBranch = body.slice(body.indexOf('if (isOwner) {'), body.indexOf('} else {'));
      const staffBranch = body.slice(body.indexOf('} else {'));
      assert.ok(ownerBranch.includes(stateCall));
      assert.match(ownerBranch, /retryAfterError\(\);/);
      assert.doesNotMatch(staffBranch, /retryAfterError\(\)/, 'Staff denial is expected and final; never retried');
    });
    it(`${decl} is still torn down in the effect cleanup`, () => {
      assert.match(ctx, new RegExp(`\\n\\s*${decl}\\(\\);`));
    });
  }
});
