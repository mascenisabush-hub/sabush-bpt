// SABUSH BPT — Business Data Reset: the areas shown in "Repor dados" and the
// dependency rule applied on screen. MUST match server/businessDataReset.ts
// (expandResetScopes), which is the authority — a test compares both for
// every combination.
export type AreaScope = 'catalog' | 'stock' | 'cash' | 'worth';

export const RESET_AREAS: { scope: AreaScope; title: string; description: string }[] = [
  { scope: 'catalog', title: 'Catálogo', description: 'Todos os produtos e fornecedores.' },
  {
    scope: 'stock',
    title: 'Stock e contagens',
    description: 'Compras, lotes de stock, quebras e todas as contagens (incluindo a inicial e rascunhos).',
  },
  {
    scope: 'cash',
    title: 'Caixa e movimentos',
    description: 'Caixa, fechos, despesas, levantamentos, dívidas a fornecedores e de clientes.',
  },
  {
    scope: 'worth',
    title: 'Valor de negócio e painel',
    description: 'Todos os registos de valor de negócio, investimentos e o valor atual — o painel volta a zero.',
  },
];

// Same rule as the server (server/businessDataReset.ts expandResetScopes).
export function expandAreas(selected: AreaScope[], all: boolean): AreaScope[] {
  const set = new Set<AreaScope>(all ? RESET_AREAS.map((a) => a.scope) : selected);
  if (set.has('catalog')) set.add('stock');
  if (set.has('stock')) set.add('worth');
  return RESET_AREAS.map((a) => a.scope).filter((s) => set.has(s));
}

