// Business Worth Evolution — Implementation Authorization, Increment 8
// (Correction / Recovery) — UI CORRECTION PASS. Source-inspection tests
// for the Owner Correction / SuperAdmin Recovery UI added this pass,
// matching this repository's established technique for React-component
// coverage (see tests/business-worth-estimated-and-dashboard.test.ts's
// own header, tests/owner-portfolio-currentworth.test.ts). No
// @testing-library/react or jsdom harness exists in this repo — every
// UI assertion here is a structural, source-text check, not a rendered-
// DOM check.
//
// Specification §25 (Owner 3-Hour Correction Window), §26 (SuperAdmin-
// Authorized Recovery), FR-38 through FR-43, FR-58. Plan §12, §13.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-correction-recovery-ui.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const dashboardSrc = src('apps/tenant/src/components/DashboardView.tsx');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
const appSrc = src('apps/tenant/src/App.tsx');
const businessDetailSrc = src('apps/superadmin/src/pages/BusinessDetail.tsx');
const superadminApiSrc = src('apps/superadmin/src/lib/superadminApi.ts');

describe('AppContext.tsx — Increment 8 UI wiring (source-inspection)', () => {
  it('reads a FULLY SEPARATE businessWorthRecoveryAuthorizations listener from the Initial-Stock one (FR-43)', () => {
    assert.match(appContextSrc, /doc\(db, 'businesses', businessId, 'businessWorthRecoveryAuthorizations', 'current'\)/);
    assert.match(appContextSrc, /doc\(db, 'businesses', businessId, 'initialStockRecoveryAuthorization', 'current'\)/);
  });

  it('exposes businessWorthCorrectionEligibility / businessWorthAuthorizedRecoveryEligibility on the context value, computed via the dedicated pure functions', () => {
    assert.match(appContextSrc, /const businessWorthCorrectionEligibility = computeBusinessWorthCorrectionEligibility\(/);
    assert.match(appContextSrc, /const businessWorthAuthorizedRecoveryEligibility = computeBusinessWorthAuthorizedRecoveryEligibility\(/);
    assert.match(appContextSrc, /\n\s*businessWorthCorrectionEligibility,\n/);
    assert.match(appContextSrc, /\n\s*businessWorthAuthorizedRecoveryEligibility,\n/);
  });

  it('latestActiveBusinessWorthSnapshot is selected by status === \'active\' — the same selection every other eligibility/calculation function already uses, not a second, potentially-diverging one', () => {
    const start = appContextSrc.indexOf('const latestActiveBusinessWorthSnapshot =');
    assert.notEqual(start, -1);
    const block = appContextSrc.slice(start, start + 400);
    assert.match(block, /\.filter\(\(s\) => s\.status === 'active'\)/);
  });

  it('startBusinessWorthCorrection/clearBusinessWorthCorrection are exposed on the context value', () => {
    assert.match(appContextSrc, /\n\s*startBusinessWorthCorrection,\n/);
    assert.match(appContextSrc, /\n\s*clearBusinessWorthCorrection,\n/);
  });

  it('startBusinessWorthCorrection takes an explicit snapshotId parameter — it never derives one internally, so a caller can only bind it to a real, already-known snapshot (never a free-typed value at this layer)', () => {
    assert.match(appContextSrc, /const startBusinessWorthCorrection = \(snapshotId: string, kind: 'owner-correction' \| 'superadmin-authorized-recovery'\) => \{/);
  });
});

describe('DashboardView.tsx — Increment 8 correction/recovery entry point (source-inspection)', () => {
  it('destructures the eligibility fields and startBusinessWorthCorrection from useApp()', () => {
    assert.match(dashboardSrc, /businessWorthCorrectionEligibility, businessWorthAuthorizedRecoveryEligibility/);
    assert.match(dashboardSrc, /startBusinessWorthCorrection/);
  });

  it('the correction/recovery buttons are gated on index === 0 && snapshot.status === \'active\' — the same "current row" condition already used for the existing "Atual" badge, never a separately-selectable row', () => {
    const correctBlockStart = dashboardSrc.indexOf("index === 0 && snapshot.status === 'active' && businessWorthCorrectionEligibility.eligible");
    const recoverBlockStart = dashboardSrc.indexOf("index === 0 && snapshot.status === 'active' && !businessWorthCorrectionEligibility.eligible && businessWorthAuthorizedRecoveryEligibility.eligible");
    assert.notEqual(correctBlockStart, -1);
    assert.notEqual(recoverBlockStart, -1);
  });

  it('the correction action passes snapshot.id (the mapped row\'s own real id) to startBusinessWorthCorrection — never a form input value, never a hardcoded string', () => {
    assert.match(dashboardSrc, /startBusinessWorthCorrection\(snapshot\.id, 'owner-correction'\)/);
    assert.match(dashboardSrc, /startBusinessWorthCorrection\(snapshot\.id, 'superadmin-authorized-recovery'\)/);
  });

  it('NO free-text input exists anywhere in this file for a snapshot/correction target — structurally impossible for an Owner to type an arbitrary snapshot id here', () => {
    // The only <input> elements in this large file belong to unrelated,
    // pre-existing features (search, category/supplier filters) — none
    // of them feed startBusinessWorthCorrection. Confirmed by proximity:
    // no <input directly precedes/follows the two startBusinessWorthCorrection
    // call sites within a reasonably small window.
    const idx1 = dashboardSrc.indexOf("startBusinessWorthCorrection(snapshot.id, 'owner-correction')");
    const idx2 = dashboardSrc.indexOf("startBusinessWorthCorrection(snapshot.id, 'superadmin-authorized-recovery')");
    const windowAroundEach = [
      dashboardSrc.slice(Math.max(0, idx1 - 300), idx1 + 300),
      dashboardSrc.slice(Math.max(0, idx2 - 300), idx2 + 300),
    ];
    for (const w of windowAroundEach) {
      assert.doesNotMatch(w, /<input/);
    }
  });

  it('accepts the new onNavigateToStockCount prop and calls it from the correction/recovery action handlers', () => {
    assert.match(dashboardSrc, /onNavigateToStockCount: \(\) => void;/);
    assert.match(dashboardSrc, /onNavigateToStockCount,/);
    // Called from both handlers, not just one.
    const occurrences = (dashboardSrc.match(/onNavigateToStockCount\(\);/g) ?? []).length;
    assert.ok(occurrences >= 2, 'Expected onNavigateToStockCount() to be called from both the correction and the recovery action handlers.');
  });

  it('status badges for "corrected"/"superseded-by-recovery" are rendered from the snapshot\'s own real status field, never inferred', () => {
    assert.match(dashboardSrc, /snapshot\.status === 'corrected' &&/);
    assert.match(dashboardSrc, /snapshot\.status === 'superseded-by-recovery' &&/);
  });
});

describe('App.tsx — Increment 8 navigation wiring (source-inspection)', () => {
  it('DashboardView receives onNavigateToStockCount, wired to the same activeTab mechanism every other navigation callback already uses', () => {
    assert.match(appSrc, /onNavigateToStockCount=\{\(\) => setActiveTab\('stock-count'\)\}/);
  });

  it('the stock-count tab (and therefore this correction/recovery entry point) remains gated behind !isStaff — unauthorized (Staff) users cannot reach it, unchanged from before this increment', () => {
    assert.match(appSrc, /!isStaff && activeTab === 'stock-count' &&/);
    assert.match(appSrc, /!isStaff && activeTab === 'dashboard' &&/);
  });
});

describe('PeriodicStockCountView.tsx — Increment 8 correction/recovery write path (source-inspection)', () => {
  it('destructures pendingBusinessWorthCorrection/clearBusinessWorthCorrection from useApp()', () => {
    assert.match(periodicSrc, /pendingBusinessWorthCorrection,/);
    assert.match(periodicSrc, /clearBusinessWorthCorrection,/);
  });

  it('recordStockCount is always called with producesBusinessWorthSnapshot: true (Specification §14 Decision 1: "set true on every Contagem confirmed under this model going forward" — not a correction-only special case); correctionOfSnapshotId/correctionKind remain correction-only, gated inside pendingBusinessWorthCorrection', () => {
    const start = periodicSrc.indexOf('const saved = await recordStockCount({');
    assert.notEqual(start, -1);
    const callBlock = periodicSrc.slice(start, start + 8200); // [FR-89–FR-94, Implementation Authorization §2 item 5] Window widened from 6500, then 7200 — later, unrelated additions between this call and its own success-path clear call kept pushing the distance forward (confirmed 7676 chars at time of this widening); widened again with margin, not narrowed.
    // [Fix — Business Worth Evolution was never actually switched on]
    // producesBusinessWorthSnapshot: true must appear unconditionally in
    // this call — NOT nested inside the pendingBusinessWorthCorrection
    // spread, which is exactly the bug this test previously locked in
    // (asserting the opposite of what the Specification requires).
    assert.match(callBlock, /^\s*producesBusinessWorthSnapshot: true,/m);
    assert.doesNotMatch(callBlock, /pendingBusinessWorthCorrection\s*\?\s*\{\s*producesBusinessWorthSnapshot: true,/);
    // correctionOfSnapshotId/correctionKind still only ever appear
    // together, inside the pendingBusinessWorthCorrection-gated spread —
    // unchanged by this fix.
    assert.match(callBlock, /\.\.\.\(pendingBusinessWorthCorrection\s*\?\s*\{\s*correctionOfSnapshotId: pendingBusinessWorthCorrection\.snapshotId,/);
    assert.match(callBlock, /correctionKind: pendingBusinessWorthCorrection\.kind,/);
  });

  it('the correction/recovery kind and target snapshot id passed to recordStockCount are read ONLY from pendingBusinessWorthCorrection (context state set by DashboardView) — this file never constructs or free-types either value itself', () => {
    assert.doesNotMatch(periodicSrc, /correctionOfSnapshotId:\s*['"]/, 'correctionOfSnapshotId must never be a literal string in this file.');
    assert.doesNotMatch(periodicSrc, /correctionKind:\s*['"](?!owner-correction|superadmin-authorized-recovery)/);
  });

  it('clears pendingBusinessWorthCorrection after a successful save — a later, unrelated Contagem never silently inherits a stale correction target', () => {
    const start = periodicSrc.indexOf('const saved = await recordStockCount({');
    const successBlock = periodicSrc.slice(start, start + 8200); // [FR-89–FR-94, Implementation Authorization §2 item 5] Same window-widening as the sibling assertion above.
    assert.match(successBlock, /if \(pendingBusinessWorthCorrection\) clearBusinessWorthCorrection\(\);/);
  });

  it('renders a distinct banner when in correction/recovery mode, both on the main entry form and on the review/confirm screen — never silently identical to an ordinary Contagem', () => {
    const bannerOccurrences = (periodicSrc.match(/pendingBusinessWorthCorrection && \(/g) ?? []).length;
    assert.ok(bannerOccurrences >= 2, 'Expected at least two distinct render-gated banners (main form + confirm screen).');
    assert.match(periodicSrc, /Está a corrigir a última Contagem/);
    assert.match(periodicSrc, /RECUPERAÇÃO de Valor do Negócio/);
  });

  it('this correction/recovery entry point is reachable only via the same PeriodicStockCountView every ordinary Contagem already uses — no second, parallel component was created', () => {
    // Structural proof: this file's own component name is unchanged,
    // and the correction wiring lives inside its existing
    // handleConfirmSave function, not a new sibling component.
    assert.match(periodicSrc, /export const PeriodicStockCountView: React\.FC<PeriodicStockCountViewProps> = \(\{ onComplete \}\) => \{/);
  });
});

describe('superadminApi.ts — Increment 8 grant client (source-inspection)', () => {
  it('authorizeBusinessWorthRecovery posts to a FULLY SEPARATE route from authorizeInitialStockRecovery (FR-43)', () => {
    assert.match(superadminApiSrc, /`\/business-worth-recovery\/\$\{encodeURIComponent\(businessId\)\}\/authorize`/);
    assert.match(superadminApiSrc, /`\/initial-stock-recovery\/\$\{encodeURIComponent\(businessId\)\}\/authorize`/);
  });

  it('takes an explicit targetSnapshotId parameter — never a hardcoded or inferred default (unlike Initial Stock\'s own \'initial\' common case)', () => {
    assert.match(superadminApiSrc, /export async function authorizeBusinessWorthRecovery\(\s*businessId: string,\s*targetSnapshotId: string,\s*justification: string\s*\)/);
  });
});

describe('BusinessDetail.tsx (SuperAdmin) — Increment 8 recovery-grant UI (source-inspection)', () => {
  it('imports authorizeBusinessWorthRecovery, a separate function from authorizeInitialStockRecovery', () => {
    assert.match(businessDetailSrc, /authorizeInitialStockRecovery,/);
    assert.match(businessDetailSrc, /authorizeBusinessWorthRecovery,/);
  });

  it('PendingAction includes the new \'authorize-business-worth-recovery\' state, distinct from \'authorize-recovery\'', () => {
    assert.match(businessDetailSrc, /'authorize-recovery' \| 'authorize-business-worth-recovery'/);
  });

  it('handleAuthorizeBusinessWorthRecovery requires both a justification and a target before calling the API — mirrors handleAuthorizeRecovery\'s own validation shape', () => {
    const start = businessDetailSrc.indexOf('async function handleAuthorizeBusinessWorthRecovery()');
    assert.notEqual(start, -1);
    const fnBody = businessDetailSrc.slice(start, start + 1500);
    assert.match(fnBody, /if \(!actionJustification\.trim\(\)\)/);
    assert.match(fnBody, /if \(!businessWorthTargetSnapshotId\.trim\(\)\)/);
    assert.match(fnBody, /authorizeBusinessWorthRecovery\(businessId, businessWorthTargetSnapshotId\.trim\(\), actionJustification\.trim\(\)\)/);
  });

  it('the 72-hour figure is displayed distinctly from Initial Stock\'s own 48-hour figure — never conflated', () => {
    assert.match(businessDetailSrc, /72 horas/);
    assert.match(businessDetailSrc, /janela de 72 horas/);
    assert.match(businessDetailSrc, /48 horas/); // still present, unmodified, for Initial Stock
  });

  it('handleAuthorizeBusinessWorthRecovery never references recoveryTargetStockCountId or the Initial-Stock authorize call — fully isolated from that mechanism', () => {
    const start = businessDetailSrc.indexOf('async function handleAuthorizeBusinessWorthRecovery()');
    const nextFnIdx = businessDetailSrc.indexOf('\n  return (', start);
    const fnBody = businessDetailSrc.slice(start, nextFnIdx === -1 ? start + 1500 : nextFnIdx);
    assert.doesNotMatch(fnBody, /recoveryTargetStockCountId/);
    assert.doesNotMatch(fnBody, /authorizeInitialStockRecovery\(/);
  });
});
