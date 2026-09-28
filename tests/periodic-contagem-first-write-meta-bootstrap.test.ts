// Regression: the first row write of a brand-new (first) contagem must not be
// refused for lack of a draft meta document, while a draft finalized/discarded
// on ANOTHER device must still never be resurrected by a stale write.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldBootstrapPeriodicDraftMeta } from '../apps/tenant/src/lib/periodicDraftMetaBootstrap';

const fresh = {
  rowKey: 'catalog:abc',
  listenerState: 'confirmed-no-draft' as const,
  draftExists: false,
  metaSeenThisLifecycle: false,
  bootstrapAlreadyRequested: false,
  metaSaveAlreadyPending: false,
};

describe('shouldBootstrapPeriodicDraftMeta', () => {
  it('THE BUG: first catalog edit of a brand-new count bootstraps the meta document', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta(fresh), true);
  });

  it('first manual-row edit of a brand-new count bootstraps too', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, rowKey: 'manual:9f3c-uuid' }), true);
  });

  it('never for meta / newProductInfo / caixer keys (they write meta themselves)', () => {
    for (const rowKey of ['__meta__', 'newProductInfo:x', 'caixerDraft']) {
      assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, rowKey }), false, rowKey);
    }
  });

  it('never while the listener is still loading (a real draft could be overwritten)', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, listenerState: 'loading' }), false);
  });

  it('never on a load error (draft state unknown)', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, listenerState: 'load-error' }), false);
  });

  it('never when the draft already exists', () => {
    assert.equal(
      shouldBootstrapPeriodicDraftMeta({ ...fresh, listenerState: 'draft-exists', draftExists: true }),
      false
    );
  });

  it('never resurrects a draft this device saw exist and that is now gone (finalized/discarded elsewhere)', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, metaSeenThisLifecycle: true }), false);
  });

  it('does not pile up duplicate bootstrap saves', () => {
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, bootstrapAlreadyRequested: true }), false);
    assert.equal(shouldBootstrapPeriodicDraftMeta({ ...fresh, metaSaveAlreadyPending: true }), false);
  });
});

describe('PeriodicStockCountView wiring', () => {
  const src = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf8');
  const sched = src.match(/const scheduleRowDraftSave = \(rowKey: string[\s\S]*?\n  \};\n/)![0];

  it('scheduleRowDraftSave requests the meta save before it schedules the row\'s own timer', () => {
    const bootstrap = sched.indexOf("scheduleRowDraftSave('__meta__')");
    const ownTimer = sched.indexOf('const timer = setTimeout(');
    assert.ok(bootstrap > 0, 'bootstrap call present');
    assert.ok(bootstrap < ownTimer, 'meta timer must be scheduled first so it fires first');
    assert.match(sched, /shouldBootstrapPeriodicDraftMeta\(\{/);
  });

  it('the "seen" flag is set from the live draft and reset only by this device\'s own lifecycle ends', () => {
    assert.match(src, /if \(periodicStockDraft\) \{\s*draftMetaSeenThisLifecycleRef\.current = true;/);
    const resets = (src.match(/draftMetaSeenThisLifecycleRef\.current = false;/g) ?? []).length;
    assert.equal(resets, 3, 'business switch + discard + finalize');
  });

  it('the item-save guard against resurrecting a finalized draft is untouched', () => {
    const ctx = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf8');
    assert.match(ctx, /if \(!metaSnap\.exists\(\)\) \{\s*throw new Error\(\s*'Esta Contagem já não está ativa/);
  });
});
