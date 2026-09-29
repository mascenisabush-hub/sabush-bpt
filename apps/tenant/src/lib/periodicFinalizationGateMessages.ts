// Single source of truth for the user-facing text shown when a periodic Contagem cannot be reviewed
// or confirmed. Used by BOTH handleRequestConfirmation (Review) and handleConfirmSave (Confirm):
// state can change between the two (a late recovery-evidence scan, a row save that fails after the
// Review screen opened), and before this module handleConfirmSave ended in bare `return`s, so the
// "Confirmar Contagem" button silently did nothing with no message.

export const identityCheckPendingMessage = (ambiguousCount: number, productNames?: string[]): string =>
  `Existem ${ambiguousCount} linha(s) desta Contagem com um estado de identidade não resolvido${namesSuffix(productNames)} e precisam de revisão antes de poder confirmar.`;

export const identityCheckNotRunMessage =
  'Ainda não foi possível verificar as linhas desta Contagem. Volte atrás e toque de novo em "Rever e Confirmar Contagem".';

// [Owner-requested] Name the products concerned, so the operator knows
// exactly which rows to look at instead of only a count. Shows up to
// MAX_NAMED names, then "e mais N". Blank names read "(sem nome)".
const MAX_NAMED = 5;
export const formatProductNames = (productNames: string[]): string => {
  const names = productNames.map((n) => n.trim() || '(sem nome)');
  const shown = names.slice(0, MAX_NAMED).map((n) => `"${n}"`).join(', ');
  const rest = names.length - MAX_NAMED;
  return rest > 0 ? `${shown} e mais ${rest}` : shown;
};
const namesSuffix = (productNames?: string[]): string =>
  productNames && productNames.length > 0 ? `: ${formatProductNames(productNames)}` : '';

export const unresolvedRecoveryEvidenceMessage = (rowCount: number, productNames?: string[]): string =>
  `Existem ${rowCount} linha(s) com alterações não confirmadas encontradas ao retomar esta Contagem${namesSuffix(productNames)} — reveja-as no quadro abaixo antes de confirmar.`;

export const unsafeRowsMessage = (rowCount: number, productNames?: string[]): string =>
  `Existem ${rowCount} linha(s) com um problema de gravação por resolver${namesSuffix(productNames)} — reveja-as antes de confirmar.`;
