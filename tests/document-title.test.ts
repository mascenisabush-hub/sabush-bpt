// Browser Tab Branding — tabTitleKey() unit tests.
//
// SCOPE: this suite covers the pure mapping function that decides which
// i18n key backs the document.title for a given active tab. It does NOT
// exercise the actual document.title side effect (useDocumentTitle) or the
// auth-state title transitions in App.tsx/AuthView.tsx/QuickLoginScreen.tsx
// — those require a DOM/React render harness (jsdom + @testing-library/react)
// that this repo doesn't currently have, and adding one was out of scope
// for this task (see HANDOFF: no new dependency). See the implementation
// report for how those paths were verified instead.
//
// HOW TO RUN:
//   npm run test:document-title
// Pure function, no Firestore/emulator/DOM dependency — runs directly under
// Node's built-in test runner.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { tabTitleKey } from '../apps/tenant/src/hooks/useDocumentTitle';
import { NAV_TABS, TabType } from '../apps/tenant/src/data/navigationTabs';

const ALL_TAB_TYPES: TabType[] = [
  'dashboard', 'stocks', 'add-stock', 'add-quebra', 'add-expense',
  'add-withdrawal', 'reports', 'initial-stock', 'stock-count', 'closing',
  'timeline',
];

describe('tabTitleKey', () => {
  it('resolves every NAV_TABS entry to its own labelKey', () => {
    for (const tab of NAV_TABS) {
      assert.equal(tabTitleKey(tab.id), tab.labelKey);
    }
  });

  it('resolves initial-stock (not a NAV_TABS bar entry) to its own dedicated key', () => {
    assert.equal(tabTitleKey('initial-stock'), 'nav.initialStockTitle');
  });

  it('never returns an empty string for any known TabType', () => {
    for (const tab of ALL_TAB_TYPES) {
      assert.notEqual(tabTitleKey(tab), '');
    }
  });

  it('every ALL_TAB_TYPES value is covered by either NAV_TABS or the extra map', () => {
    const navIds = new Set(NAV_TABS.map(t => t.id));
    for (const tab of ALL_TAB_TYPES) {
      assert.ok(navIds.has(tab) || tab === 'initial-stock', `unmapped TabType: ${tab}`);
    }
  });
});
