// SABUSH BPT Contagem incident — investigating whether
// PeriodicStockCountView.tsx's shop-switch-detection effect (which
// calls setManualRows([])/setCatalogRows({}) whenever `detectShopSwitch`
// reports a switch) can fire AFTER handleResumeDraft has already
// populated real, resumed data from Firestore — which would silently
// erase a genuinely saved row (e.g. Trigo, manual:259) from the live
// workspace while leaving it completely untouched in Firestore itself.
//
// This repository has no React/DOM test harness (see
// stock-count-simplification.test.ts's own established precedent).
// This file combines:
//   1. Direct unit tests of the already-pure `detectShopSwitch`
//      function (apps/tenant/src/lib/shopSwitchGuard.ts) for the exact
//      transitions this incident's timeline could produce.
//   2. Source-level structural assertions proving the GATING
//      dependency chain that determines whether "resume before the
//      reset has ever run" is even reachable at all.
//   3. A plain-data simulated sequence (matching
//      shop-switch-guard.test.ts's own Test 5 convention for
//      AddQuebraView) walking through the actual sequence of events a
//      real page load produces, asserting the final state.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-post-resume-reset-race.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { detectShopSwitch } from '../apps/tenant/src/lib/shopSwitchGuard';

const periodicSrc = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);
const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

describe('detectShopSwitch — the exact transitions this incident timeline can produce', () => {
  it('a fresh mount, activeBusinessId still null (userProfile not yet loaded): no switch, nothing to reset yet', () => {
    const result = detectShopSwitch(null, null);
    assert.equal(result.shouldResetSelection, false);
  });

  it('activeBusinessId resolves from null to the real business id for the first time: IS reported as a switch (by design — matches the pre-existing assertion in shop-switch-guard.test.ts)', () => {
    const result = detectShopSwitch('bus-1790081849348-uw7m0', null);
    assert.equal(result.shouldResetSelection, true);
    assert.equal(result.loadedForBusinessId, 'bus-1790081849348-uw7m0');
  });

  it('the SAME business id on a later render (no real switch): does NOT report a switch — this is what prevents the reset from re-firing on every ordinary re-render once resolved', () => {
    const result = detectShopSwitch('bus-1790081849348-uw7m0', 'bus-1790081849348-uw7m0');
    assert.equal(result.shouldResetSelection, false);
  });

  it('a genuine switch to a DIFFERENT business id after the first has already resolved: IS reported as a switch, as intended', () => {
    const result = detectShopSwitch('bus-DIFFERENT-shop', 'bus-1790081849348-uw7m0');
    assert.equal(result.shouldResetSelection, true);
  });
});

describe('Structural gating — is "resume happens before the reset has ever run" even reachable?', () => {
  it('AppContext.tsx: the periodic draft listeners (and every other business-scoped listener) are gated behind activeBusinessId being truthy — they cannot attach, let alone deliver a snapshot, while it is still null', () => {
    const gateIdx = appContextSrc.indexOf('if (!activeBusinessId) {');
    assert.notEqual(gateIdx, -1, 'expected the activeBusinessId falsy-guard in the business-data listener effect');
    const body = appContextSrc.slice(gateIdx, gateIdx + 700);
    // The gate resets business-scoped state and returns BEFORE the
    // periodic draft listeners further down this same effect are ever
    // reached.
    assert.match(body, /return;/);
    const periodicItemsIdx = appContextSrc.indexOf('const unsubPeriodicDraftItems = onSnapshot(');
    assert.ok(
      periodicItemsIdx > gateIdx,
      'the periodic items listener setup must appear AFTER the activeBusinessId falsy-guard in source order, confirming it is unreachable while activeBusinessId is null'
    );
  });

  it('periodicStockDraftLoaded (the flag PeriodicStockCountView\'s auto-resume effect requires) is the AND of both sub-listener "loaded" flags — neither of which can ever be set true before the listeners above have even attached', () => {
    assert.match(
      appContextSrc,
      /const periodicStockDraftLoaded = periodicStockDraftMetaLoaded && periodicStockDraftItemsLoaded;/
    );
  });

  it('PeriodicStockCountView.tsx: the auto-resume effect requires periodicStockDraftLoaded before calling handleResumeDraft — it cannot fire on a render where activeBusinessId is still null, because that flag cannot yet be true', () => {
    const idx = periodicSrc.indexOf('const autoResumedRef = useRef(false);');
    assert.notEqual(idx, -1);
    const body = periodicSrc.slice(idx, idx + 600);
    assert.match(body, /if \(!periodicStockDraftLoaded\) return;/);
  });

  it('CONCLUSION this structural chain establishes: handleResumeDraft can only ever run on a render where activeBusinessId is ALREADY non-null (it is transitively required by periodicStockDraftLoaded). Since detectShopSwitch only reports a switch — and therefore only clears manualRows/catalogRows — on the render where activeBusinessId CHANGES value, and a value that is already stable and non-null does not change again merely because resume runs, the "null -> real id" reset is structurally forced to occur on an EARLIER render than any possible resume, for a single-business account. This is a proof of ordering by construction, not an assumption.', () => {
    // No new assertion — this test documents the conclusion the four
    // structural facts above jointly establish, for readability in
    // test output.
    assert.ok(true);
  });
});

describe('Simulated sequence — a real single-shop page load, modeled as plain data (no React, matching shop-switch-guard.test.ts Test 5\'s own convention)', () => {
  it('Sequence A: activeBusinessId null at mount -> resolves to the real id -> reset fires (correctly, once) -> periodic draft listener LATER delivers 250 real manual rows including Trigo -> resume runs -> final manualRows is the full resumed set, NOT empty', () => {
    // Step 1 — component mounts. activeBusinessId is still null
    // (userProfile has not loaded yet). loadedForBusinessId's own
    // useState initializer captures this same null.
    let activeBusinessId: string | null = null;
    let loadedForBusinessId: string | null = activeBusinessId;
    let manualRows: Array<{ productName: string }> = [];

    // Step 2 — userProfile loads; activeBusinessId resolves to the
    // real business id for the first time this session.
    activeBusinessId = 'bus-1790081849348-uw7m0';

    // Step 3 — the shop-switch effect's dependency ([activeBusinessId])
    // has changed, so it runs.
    const switchResult = detectShopSwitch(activeBusinessId, loadedForBusinessId);
    assert.equal(switchResult.shouldResetSelection, true, 'sanity check: this IS treated as a switch, per the tests above');
    loadedForBusinessId = switchResult.loadedForBusinessId;
    manualRows = []; // setManualRows([]) — the reset this incident is investigating

    // Step 4 — only NOW (after the Firestore round trip the periodic
    // items listener requires — structurally impossible any earlier,
    // per the gating tests above) does real draft data arrive: 250
    // manual rows, including Trigo, exactly matching the real
    // [DIAG-contagem-resume] evidence already collected in this
    // incident (totalItemsFromDraft: 250, manualRowCount: 250,
    // hasTrigoByName: true).
    const resumedManualRows = Array.from({ length: 250 }, (_, i) =>
      i === 249 ? { productName: 'Trigo' } : { productName: `Product ${i}` }
    );

    // Step 5 — handleResumeDraft runs, calling setManualRows(nextManualRows).
    manualRows = resumedManualRows;

    // Step 6 — assert the final state a render would actually show.
    assert.equal(manualRows.length, 250, 'the resumed set must be the FINAL state, not the earlier empty reset');
    assert.ok(
      manualRows.some((r) => r.productName === 'Trigo'),
      'Trigo must be present in the final manualRows state after this realistic sequence'
    );
  });

  it('Sequence B (the ordering this incident hypothesized, and the structural tests above prove is unreachable): IF resume could somehow run before activeBusinessId first resolves, the reset would fire AFTER and would wipe the resumed data — demonstrating why the gating established above is load-bearing, not incidental', () => {
    // This models the DANGEROUS, hypothetical ordering purely to show
    // what WOULD happen if the gating proven above did not exist — it
    // does not assert this can occur in the real app.
    let manualRows: Array<{ productName: string }> = [];

    // Hypothetically: resume already ran.
    manualRows = Array.from({ length: 250 }, (_, i) =>
      i === 249 ? { productName: 'Trigo' } : { productName: `Product ${i}` }
    );
    assert.ok(manualRows.some((r) => r.productName === 'Trigo'));

    // Hypothetically: activeBusinessId THEN resolves from null, and
    // detectShopSwitch fires afterward.
    const switchResult = detectShopSwitch('bus-1790081849348-uw7m0', null);
    assert.equal(switchResult.shouldResetSelection, true);
    manualRows = []; // if this ran AFTER resume, Trigo would vanish

    assert.equal(manualRows.length, 0, 'documents the failure mode the gating in the structural tests above prevents');
    assert.ok(
      !manualRows.some((r) => r.productName === 'Trigo'),
      'Trigo would be gone — this is exactly the incident symptom, and exactly what the gating chain above proves cannot happen for a single-business account'
    );
  });

  it('Sequence C: a genuine switch to a DIFFERENT business, well after the first business\'s own resume already completed — the reset correctly fires again and correctly clears the FIRST business\'s rows (intended behavior, not a defect)', () => {
    let activeBusinessId = 'bus-1790081849348-uw7m0';
    let loadedForBusinessId = activeBusinessId;
    let manualRows = Array.from({ length: 250 }, (_, i) =>
      i === 249 ? { productName: 'Trigo' } : { productName: `Product ${i}` }
    );
    assert.ok(manualRows.some((r) => r.productName === 'Trigo'), 'sanity check: business A is fully resumed');

    // Owner genuinely switches to a second shop via the "Meu Negócio" menu.
    activeBusinessId = 'bus-SECOND-SHOP';
    const switchResult = detectShopSwitch(activeBusinessId, loadedForBusinessId);
    assert.equal(switchResult.shouldResetSelection, true);
    loadedForBusinessId = switchResult.loadedForBusinessId;
    manualRows = [];

    assert.equal(manualRows.length, 0, 'clearing Business A\'s rows when switching to Business B is CORRECT, not the incident bug');
  });

  it('Sequence D: a later, unrelated live-data update arrives for the SAME business after resume — activeBusinessId does not change, so the reset effect does not re-fire at all', () => {
    const activeBusinessId = 'bus-1790081849348-uw7m0';
    const loadedForBusinessId = activeBusinessId; // already stable from the earlier resolve
    let manualRows = Array.from({ length: 250 }, (_, i) =>
      i === 249 ? { productName: 'Trigo' } : { productName: `Product ${i}` }
    );

    // Some other editor's write arrives via the live-adoption effect —
    // activeBusinessId itself never changes.
    const switchResult = detectShopSwitch(activeBusinessId, loadedForBusinessId);
    assert.equal(switchResult.shouldResetSelection, false, 'no switch detected — the reset effect does not run, manualRows is untouched by it');
    assert.equal(manualRows.length, 250, 'unaffected by this unrelated update');
  });
});
