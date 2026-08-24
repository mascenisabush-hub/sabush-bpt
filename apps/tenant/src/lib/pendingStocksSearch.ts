// [Fix — global search box was decorative, non-functional] Header.tsx's
// real product search jumps the Owner to StocksView with a search term
// already applied there. A plain CustomEvent ('navigate-to-stocks-search')
// works fine when StocksView is ALREADY mounted (the Owner is already on
// the Stocks tab) — but when the search also has to switch tabs first,
// dispatching the event immediately races against React actually mounting
// StocksView: the event can fire before StocksView's own listener exists
// to catch it, and CustomEvents are not replayed for listeners added
// afterward.
//
// This tiny, module-level (not React state, not persisted anywhere) value
// closes that gap: Header sets it right before switching tabs, and
// StocksView reads-and-clears it once on mount, independent of event
// timing. The CustomEvent is kept too (see Header.tsx/StocksView.tsx) for
// the "already on Stocks" case, where a mount effect would never re-fire.
let pendingQuery: string | null = null;

export function setPendingStocksSearch(query: string): void {
  pendingQuery = query;
}

export function consumePendingStocksSearch(): string | null {
  const query = pendingQuery;
  pendingQuery = null;
  return query;
}
