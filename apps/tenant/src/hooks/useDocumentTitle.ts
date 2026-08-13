import { useEffect } from 'react';
import { NAV_TABS, TabType } from '../data/navigationTabs';

/**
 * Sets the browser tab's document title. The Sabush favicon already carries
 * the brand (see index.html), so the title itself should stay short and
 * contextual — the current screen name only, no "Sabush BPT |" prefix.
 *
 * Pass an empty string to skip the update for this render (used while a
 * screen that owns its own title, like AuthView, hasn't decided its title
 * yet) rather than clobbering whatever title is already showing.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);
}

/**
 * Resolves the i18n key for a given tab's document title, reusing
 * NAV_TABS — the existing source of truth for tab labels — wherever the
 * tab has a bar entry there.
 *
 * A couple of TabType values (e.g. 'initial-stock') are reachable without
 * ever appearing in the NAV_TABS bar, so they're mapped separately here
 * rather than being force-fitted into NAV_TABS.
 */
const EXTRA_TAB_TITLE_KEYS: Partial<Record<TabType, string>> = {
  'initial-stock': 'nav.initialStockTitle',
};

export function tabTitleKey(tab: TabType): string {
  const navTab = NAV_TABS.find(t => t.id === tab);
  if (navTab) return navTab.labelKey;
  return EXTRA_TAB_TITLE_KEYS[tab] ?? '';
}
