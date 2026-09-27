// [Periodic Contagem — Implementation Authorization §1f, signed
// 27 September 2026, commit 6310429] Stage 6 of 6: visible labels for
// the three user-action-required PA-08 states. Source-text based,
// following this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

const region = source.slice(
  source.indexOf("group.persistenceState === 'save-blocked' ? (\n                            <ShieldAlert"),
  source.indexOf('title surfaces the FULL name')
);

describe('Visible badge for save-blocked/occupied-target-rejected/save-unknown (§1f, C.1)', () => {
  it('a visible (non-sr-only) span exists, styled in the same compact badge pattern as the porções count', () => {
    assert.match(region, /<span\s*\n\s*className=\{`text-\[11px\] font-semibold rounded-full px-1\.5 py-0\.5 shrink-0/);
  });

  it('contains all three exact original message strings, verbatim -- "in place", not reworded or shortened', () => {
    assert.match(region, /'Bloqueado — requer revisão'/);
    assert.match(region, /'Rejeitado — posição já ocupada'/);
    assert.match(region, /'Falha ao guardar — estado desconhecido'/);
  });

  it('the badge condition matches the icon\'s own existing priority order exactly -- save-blocked first, then only occupied-target-rejected/save-unknown when NOT also anyConflicted', () => {
    const badgeCondition = region.match(/\{group\.persistenceState === 'save-blocked' \|\|\s*\n\s*\(!group\.anyConflicted &&\s*\n\s*\(group\.persistenceState === 'occupied-target-rejected' \|\|\s*\n\s*group\.persistenceState === 'save-unknown'\)\) \? \(/);
    assert.ok(badgeCondition, 'expected the badge visibility condition to exclude the anyConflicted case, matching the icon block above it');
  });
});

describe('saving and conflict receive no new visible treatment (§48 C.1 classification, unchanged)', () => {
  it('the icon block itself (colors, order, which states get which icon) is completely unmodified', () => {
    assert.match(region, /<ShieldAlert\s*\n\s*className="w-3\.5 h-3\.5 text-amber-700 shrink-0"/);
    assert.match(region, /<AlertTriangle\s*\n\s*className="w-3\.5 h-3\.5 text-amber-600 shrink-0"/);
    assert.match(region, /<RotateCw className="w-3\.5 h-3\.5 text-gray-400 shrink-0 animate-spin"/);
    assert.match(region, /<CheckCircle2 className="w-3\.5 h-3\.5 text-emerald-500 shrink-0"/);
  });

  it('no new visible span was added for saving or conflict -- only the sr-only span (unchanged in kind, only in its own internal branching) still covers them', () => {
    const visibleSpanCount = (region.match(/<span\s*\n\s*className=\{`text-\[11px\]/g) || []).length;
    assert.equal(visibleSpanCount, 1, 'expected exactly one new visible badge span, covering all three target states together, not a separate one per state or an extra one for saving/conflict');
  });
});

describe('No duplicate screen-reader announcement -- the accessibility correctness this stage specifically had to get right', () => {
  it('the sr-only span\'s own condition mirrors the visible badge\'s condition exactly, returning empty string for the three now-visible states rather than repeating their text', () => {
    assert.match(region, /<span className="sr-only">\s*\n\s*\{group\.persistenceState === 'save-blocked' \|\|\s*\n\s*\(!group\.anyConflicted &&/);
    const srOnlyBlock = region.slice(region.indexOf('<span className="sr-only">'));
    assert.match(srOnlyBlock, /\? \/\/ \[Implementation Authorization §1f\] These/);
  });

  it('the sr-only span still correctly covers conflict, saving, validated, and not-validated -- nothing removed from its own remaining branches', () => {
    const srOnlyBlock = region.slice(region.indexOf('<span className="sr-only">'));
    assert.match(srOnlyBlock, /'Conflito por resolver'/);
    assert.match(srOnlyBlock, /'A guardar'/);
    assert.match(srOnlyBlock, /'Validado'/);
    assert.match(srOnlyBlock, /'Não validado'/);
  });
});

// Direct execution of the priority/visibility decision itself.
type PersistenceState = 'saved' | 'saving' | 'conflict' | 'save-blocked' | 'occupied-target-rejected' | 'save-unknown';

function isBadgeVisible(persistenceState: PersistenceState, anyConflicted: boolean): boolean {
  return (
    persistenceState === 'save-blocked' ||
    (!anyConflicted && (persistenceState === 'occupied-target-rejected' || persistenceState === 'save-unknown'))
  );
}

describe('Direct execution -- badge visibility for every combination', () => {
  it('save-blocked -> visible, regardless of anyConflicted (matches icon priority: save-blocked wins over conflict)', () => {
    assert.equal(isBadgeVisible('save-blocked', false), true);
    assert.equal(isBadgeVisible('save-blocked', true), true);
  });
  it('occupied-target-rejected, no conflict -> visible', () => assert.equal(isBadgeVisible('occupied-target-rejected', false), true));
  it('occupied-target-rejected, WITH conflict -> NOT visible (icon shows conflict instead, badge must not contradict it)', () => assert.equal(isBadgeVisible('occupied-target-rejected', true), false));
  it('save-unknown, no conflict -> visible', () => assert.equal(isBadgeVisible('save-unknown', false), true));
  it('save-unknown, WITH conflict -> NOT visible', () => assert.equal(isBadgeVisible('save-unknown', true), false));
  it('saving -> never visible', () => assert.equal(isBadgeVisible('saving', false), false));
  it('saved -> never visible', () => assert.equal(isBadgeVisible('saved', false), false));
});
