// Regression guard: Settings → Funcionários secondary dialogs must keep their
// action buttons reachable on small screens (scrollable body, pinned footer),
// and promotion must flow into the Permissões panel.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../apps/tenant/src/components/SettingsModal.tsx', import.meta.url), 'utf8');

describe('Settings staff dialogs', () => {
  it('no secondary dialog uses the old unbounded fixed inset-0 wrapper', () => {
    assert.doesNotMatch(src, /fixed inset-0 z-\[60\][^"]*items-center justify-center p-4/);
  });
  it('each of the four dialogs uses modal-overlay + modal-card with a scrolling body and pinned footer', () => {
    const overlays = src.match(/modal-overlay z-\[60\]/g) || [];
    assert.equal(overlays.length, 4 + 1 - 1 + 0 === 4 ? 4 : 4);
    assert.equal((src.match(/overflow-hidden flex flex-col modal-card/g) || []).length >= 5, true);
    assert.equal((src.match(/space-y-4 overflow-y-auto flex-1 min-h-0/g) || []).length, 4);
    assert.equal((src.match(/justify-end shrink-0/g) || []).length >= 4, true);
  });
  it('promotion continues into the permission panel pre-filled with the manager preset', () => {
    assert.match(src, /setPermissionsStartFrom\('manager'\)/);
    assert.match(src, /startFromManagerPreset=\{permissionsStartFrom === 'manager'\}/);
  });
  it('destructive actions are hidden on Manager rows for non-owners (mirrors the server rule)', () => {
    assert.match(src, /\(isOwner \|\| staff\.staffTier !== 'manager'\) && \(/);
  });
});
